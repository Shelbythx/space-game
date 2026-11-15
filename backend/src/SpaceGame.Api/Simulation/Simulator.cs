using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;
using SpaceGame.Api.Simulation.Physics;
using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation;

/// <summary>
/// Симуляція місії в часі (POST /api/simulate, задача 005): крок — доба; β-кут за датою,
/// тінь, енергія й батарея, висота з гальмуванням, паливо, пам'ять, сеанси й події.
/// Детермінована (D65): той самий проєкт, seed і бурі → той самий результат.
/// Чистий код без бази й HTTP: бурі приходять ззовні (модуль SpaceWeather, задача 021).
/// </summary>
public static class Simulator
{
    // ── Ігрові оцінки подій (🎲, D51) ──

    /// <summary>Маневрів ухилення від сміття на рік у «тісних» висотах 400–1000 км і поза ними
    /// (оцінка за Orbital Debris Quarterly News; межа ризику — NASA-STD-8719.14C, 4.5.2.2).</summary>
    public static double DebrisEncountersPerYear(double altitudeKm) => altitudeKm is >= 400 and <= 1000 ? 1.0 : 0.2;

    public const double DebrisAvoidanceDeltaVms = 0.5;
    public const double DebrisLossChanceWithoutEngine = 0.05;

    /// <summary>Імовірність відмови деталі на рік за рівнем.</summary>
    public static double FailurePerYear(string tier) => tier switch { "basic" => 0.04, "medium" => 0.02, _ => 0.01 };

    /// <summary>Частка втрачених сеансів у бурю з Kp ≥ 7 за діапазоном (UHF і S — більше, ніж X, план 2.11).</summary>
    public static double StormContactLoss(string band, double kp)
    {
        var strong = band switch { "uhf" => 0.8, "s" => 0.6, _ => 0.3 };
        return kp >= 7 ? strong : kp >= 5 ? strong / 2 : 0;
    }

    /// <summary>Множник густини на добу бурі з Kp ≥ 7 (план 2.8).</summary>
    public const double StormDensityFactor = 3;

    /// <summary>Імовірність збою простого комп'ютера в сильну бурю.</summary>
    public const double ComputerResetChance = 0.3;

    /// <summary>Скільки діб корабель місії на МКС перебуває біля станції після стикування.</summary>
    public const int IssStayDays = 30;

    public static readonly DateTime BaseEpoch = new(2027, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public static SimulationResult Simulate(Design design, Mission mission, long seed, SpaceWeatherData weather)
    {
        var (evaluation, state) = Evaluator.Evaluate(design, mission);
        var rng = new Random(unchecked((int)(seed ^ (seed >> 32))));
        var isIss = mission.Kind == MissionKinds.Iss;
        var raan0 = rng.NextDouble() * 360;
        var startDate = BaseEpoch.AddDays(rng.Next(0, 365));

        var events = new List<MissionEvent>();
        if (!weather.Available)
            events.Add(new MissionEvent(0, "spaceWeatherUnavailable", "space", Message.Of("event.spaceWeatherUnavailable"),
                new DonkiEventSource("donki", null, null, null, weather.PeriodStart.ToString("yyyy-MM-dd"), weather.PeriodEnd.ToString("yyyy-MM-dd"))));

        var parts = design.Parts.All()
            .Select(x => mission.Catalogs.Parts.Single(p => p.Id == x.PartId && p.Category == x.Category))
            .ToList();
        var instruments = design.InstrumentIds.Select(id => mission.Catalogs.Instruments.Single(i => i.Id == id)).ToList();
        var radio = parts.Single(p => p.Category == PartCategories.Radio);
        var computer = parts.Single(p => p.Category == PartCategories.Computer);
        var band = radio.Specs.Band ?? "";

        RendezvousProfile? rendezvous = null;
        TimelineBuilder timeline;
        var outcome = new Outcome();

        if (isIss)
        {
            rendezvous = SimulateRendezvous(state, design, rng, outcome);
            timeline = IssTimeline(state, outcome);
        }
        else
        {
            timeline = OrbitTimeline(state, mission, parts, instruments, radio, computer, band, raan0, startDate, rng, weather, events, outcome);
        }

        var groundTrack = BuildGroundTrack(state, raan0, startDate);
        var contacts = BuildContacts(state, design, mission);
        var report = ReportBuilder.Build(state, evaluation, outcome, instruments);

        return new SimulationResult(seed, evaluation, timeline.Build(), groundTrack, contacts, rendezvous,
            events.OrderBy(e => e.Day).ToList(), report);
    }

    /// <summary>Підсумки польоту — для звіту.</summary>
    public sealed class Outcome
    {
        public double DeliveredGb { get; set; }
        public double LostGb { get; set; }
        public int? ReentryDay { get; set; }
        public bool DebrisLoss { get; set; }
        public int InstrumentOffDays { get; set; }
        public int LostContacts { get; set; }
        public double FinalAltitudeKm { get; set; }
        public double PropellantLeftKg { get; set; }
        public double? DockedAtHours { get; set; }
        public bool Docked => DockedAtHours is not null;
        public Dictionary<string, double> DeliveredByInstrument { get; } = new(StringComparer.Ordinal);
        public List<string> FailedParts { get; } = [];
    }

    private sealed class TimelineBuilder
    {
        public List<int> Days { get; } = [];
        public List<double> Battery { get; } = [];
        public List<double> Stored { get; } = [];
        public List<double> Delivered { get; } = [];
        public List<double> Altitude { get; } = [];
        public List<double> Propellant { get; } = [];

        public void Add(int day, double battery, double stored, double delivered, double altitude, double propellant)
        {
            Days.Add(day);
            Battery.Add(Evaluator.R(battery, 1));
            Stored.Add(Evaluator.R(stored, 2));
            Delivered.Add(Evaluator.R(delivered, 2));
            Altitude.Add(Evaluator.R(altitude, 2));
            Propellant.Add(Evaluator.R(propellant, 3));
        }

        public Timeline Build() => new(1, Days, Battery, Stored, Delivered, Altitude, Propellant);
    }

    // ───────────────────────────── Місії orbit і tutorial ─────────────────────────────

    private static TimelineBuilder OrbitTimeline(
        EvaluationState s, Mission mission, List<Part> parts, List<Instrument> instruments, Part radio, Part computer, string band,
        double raan0, DateTime startDate, Random rng, SpaceWeatherData weather, List<MissionEvent> events, Outcome outcome)
    {
        var tl = new TimelineBuilder();
        var days = (int)Math.Round(s.OperationDays);
        var storms = weather.Storms.ToLookup(x => x.Day);
        var nodeRate = OrbitMath.NodalPrecessionRadS(OrbitMath.RadiusKm(s.AltitudeKm), s.InclinationDeg);
        var failedInstruments = new HashSet<string>(StringComparer.Ordinal);
        var radioFailed = false;
        var solarFactor = 1.0;
        var batteryFactor = 1.0;

        double h = s.AltitudeKm, propellant = s.PropellantCapacityKg, mass = s.WetMassKg;
        double stored = 0, delivered = 0, soc = 100;
        var hasEngine = s.IspS > 0;
        var maxDod = Evaluator.MaxDepthOfDischarge(s.AltitudeKm);
        var instrumentRateKbps = instruments.Where(i => s.GeneratedGbPerDay > 0).ToDictionary(i => i.Id, i => i.DataRateKbps);
        var totalRate = instrumentRateKbps.Values.Sum();
        var degradation = Evaluator.SolarDegradationPerYear;

        for (var day = 0; day <= days; day++)
        {
            var date = startDate.AddDays(day);
            var t = day * SecondsPerDay;

            // β-кут і тінь за датою (N10 слайди 125, 135–138; N14).
            var raan = raan0 + Deg(nodeRate * t);
            var beta = Eclipse.BetaDeg(Eclipse.SunLongitudeDeg(date), raan, s.InclinationDeg);
            var f = Eclipse.Fraction(h, beta);
            var period = OrbitMath.PeriodS(OrbitMath.RadiusKm(h));

            // Бурі DONKI цієї доби.
            var stormToday = storms[day].OrderByDescending(x => x.Kp).FirstOrDefault();
            var kp = stormToday?.Kp ?? 0;
            var contactLoss = StormContactLoss(band, kp);
            if (stormToday is not null)
            {
                var lost = (int)Math.Round(s.ContactsPerDay * contactLoss);
                outcome.LostContacts += lost;
                events.Add(new MissionEvent(day, "solarStorm", "space",
                    Message.Of("event.solarStorm", new Params { ["kp"] = kp, ["lostContacts"] = lost }),
                    new DonkiEventSource("donki", stormToday.EventId, stormToday.ObservedAt, kp,
                        weather.PeriodStart.ToString("yyyy-MM-dd"), weather.PeriodEnd.ToString("yyyy-MM-dd"))));
                if (kp >= 7 && computer.Id == "cpu-basic" && rng.NextDouble() < ComputerResetChance)
                {
                    events.Add(new MissionEvent(day, "solarStorm", "space",
                        Message.Of("event.solarStormComputerReset", new Params { ["kp"] = kp, ["lostGb"] = Evaluator.R(stored, 2) }),
                        new DonkiEventSource("donki", stormToday.EventId, stormToday.ObservedAt, kp,
                            weather.PeriodStart.ToString("yyyy-MM-dd"), weather.PeriodEnd.ToString("yyyy-MM-dd"))));
                    outcome.LostGb += stored;
                    stored = 0;
                }
            }

            // Висота й паливо (план 2.8): двигун тримає висоту, без палива — гальмування.
            var densityFactor = kp >= 7 && h < Atmosphere.TopAltitudeKm ? StormDensityFactor : 1;
            var dragDvToday = Drag.AccelerationMs2(h, s.BallisticFactor) * densityFactor * SecondsPerDay;
            var burn = hasEngine ? Rocket.PropellantKg(mass, dragDvToday, s.IspS) : double.PositiveInfinity;
            if (hasEngine && burn <= propellant)
            {
                propellant -= burn;
                mass -= burn;
            }
            else
            {
                h -= Drag.DecayKmPerYear(h, s.BallisticFactor) * densityFactor / DaysPerYear;
            }

            // Сміття (🎲 за ODQN): ухилення витрачає паливо; без двигуна — шанс утратити апарат.
            if (rng.NextDouble() < DebrisEncountersPerYear(h) / DaysPerYear)
            {
                if (hasEngine && propellant > 0)
                {
                    var kg = Math.Min(propellant, Rocket.PropellantKg(mass, DebrisAvoidanceDeltaVms, s.IspS));
                    propellant -= kg;
                    mass -= kg;
                    events.Add(new MissionEvent(day, "debris", "space",
                        Message.Of("event.debrisAvoidance", new Params { ["deltaVms"] = DebrisAvoidanceDeltaVms, ["propellantKg"] = Evaluator.R(kg, 3) }),
                        SeededEventSource.Instance));
                }
                else if (rng.NextDouble() < DebrisLossChanceWithoutEngine)
                {
                    events.Add(new MissionEvent(day, "debris", "space", Message.Of("event.debrisLoss"), SeededEventSource.Instance));
                    outcome.DebrisLoss = true;
                }
            }

            // Відмови деталей (🎲 за рівнем).
            foreach (var part in parts.Where(p => p.Category is PartCategories.Radio or PartCategories.Solar or PartCategories.Battery && p.MassKg > 0))
            {
                if (rng.NextDouble() >= FailurePerYear(part.Tier) / DaysPerYear)
                    continue;
                if (outcome.FailedParts.Contains(part.Id))
                    continue;
                outcome.FailedParts.Add(part.Id);
                switch (part.Category)
                {
                    case PartCategories.Radio: radioFailed = true; break;
                    case PartCategories.Solar: solarFactor = 0.5; break;
                    case PartCategories.Battery: batteryFactor = 0.5; break;
                }

                events.Add(new MissionEvent(day, "failure", "space", Message.Of("event.failure", new Params { ["partId"] = part.Id }), SeededEventSource.Instance));
            }

            foreach (var instrument in instruments)
            {
                if (failedInstruments.Contains(instrument.Id) || rng.NextDouble() >= FailurePerYear(instrument.Tier) / DaysPerYear)
                    continue;
                failedInstruments.Add(instrument.Id);
                outcome.FailedParts.Add(instrument.Id);
                events.Add(new MissionEvent(day, "failure", "user", Message.Of("event.failure", new Params { ["partId"] = instrument.Id }), SeededEventSource.Instance));
            }

            // Енергія й батарея (план 2.4).
            var years = day / DaysPerYear;
            var generation = s.GenerationW / Math.Max(1e-9, 1 - degradation * s.OperationDays / DaysPerYear) * (1 - degradation * years) * solarFactor;
            var activeRate = instrumentRateKbps.Where(kv => !failedInstruments.Contains(kv.Key)).Sum(kv => kv.Value);
            var instrumentW = totalRate > 0 ? s.InstrumentConsumptionW * activeRate / totalRate : 0;
            var contactFraction = s.ContactMinutesPerDay / 1440;
            var consumption = s.ConstantConsumptionW + instrumentW * (1 - f) + s.RadioConsumptionW * contactFraction;
            var capacity = s.BatteryWh * batteryFactor;
            var eclipseNeed = (s.ConstantConsumptionW + s.RadioConsumptionW * contactFraction) * period / 3600 * f;
            var orbitBalanceWh = (generation * (1 - f) - consumption) * period / 3600;
            var orbitsPerDay = SecondsPerDay / period;
            if (orbitBalanceWh < 0)
                soc += orbitBalanceWh * orbitsPerDay / Math.Max(capacity, 1e-9) * 100;
            else
                soc = 100;
            soc = Math.Clamp(soc, 0, 100);
            var minSoc = Math.Max(0, soc - eclipseNeed / Math.Max(capacity, 1e-9) * 100);
            var instrumentsOn = minSoc >= (1 - maxDod) * 100 && soc > 0;
            if (!instrumentsOn)
            {
                outcome.InstrumentOffDays++;
                minSoc = Math.Max(0, soc - (s.ConstantConsumptionW * period / 3600 * f) / Math.Max(capacity, 1e-9) * 100);
            }

            // Дані й пам'ять (план 2.6–2.7).
            var alive = outcome.ReentryDay is null && !outcome.DebrisLoss;
            var generated = alive && instrumentsOn && totalRate > 0
                ? activeRate * 1000 * SecondsPerDay * (1 - f) / 8e9 * (s.GeneratedGbPerDay > 0 ? 1 : 0)
                : 0;
            var downlink = alive && !radioFailed ? s.DownlinkGbPerDay * (1 - contactLoss) : 0;
            stored += generated;
            var sent = Math.Min(stored, downlink);
            stored -= sent;
            delivered += sent;
            if (totalRate > 0 && sent > 0)
                foreach (var (id, rate) in instrumentRateKbps.Where(kv => !failedInstruments.Contains(kv.Key)))
                    outcome.DeliveredByInstrument[id] = outcome.DeliveredByInstrument.GetValueOrDefault(id) + sent * rate / Math.Max(activeRate, 1e-9);
            if (stored > s.StorageGb)
            {
                outcome.LostGb += stored - s.StorageGb;
                stored = s.StorageGb;
            }

            tl.Add(day, minSoc, stored, delivered, h, propellant);

            if (h < ReentryAltitudeKm && outcome.ReentryDay is null)
            {
                outcome.ReentryDay = day;
                events.Add(new MissionEvent(day, "reentry", "space",
                    Message.Of("event.reentry", new Params { ["altitudeKm"] = Evaluator.R(h, 1) }), SeededEventSource.Instance));
            }

            if (outcome.ReentryDay is not null || outcome.DebrisLoss)
                break;
        }

        outcome.DeliveredGb = delivered;
        outcome.FinalAltitudeKm = h;
        outcome.PropellantLeftKg = propellant;
        return tl;
    }

    // ───────────────────────────── Місія на МКС ─────────────────────────────

    /// <summary>
    /// Зближення з МКС погодинно: корабель на орбіті виведення наздоганяє станцію на
    /// (n₁ − n₂) за секунду (N4, 4.137), перехід Гомана (N10, слайди 154–155), коли кут
    /// попередження дорівнює куту, який МКС пройде за час переходу; далі підхід і стикування.
    /// </summary>
    private static RendezvousProfile SimulateRendezvous(EvaluationState s, Design d, Random rng, Outcome outcome)
    {
        var r1 = OrbitMath.RadiusKm(d.InsertionAltitudeKm!.Value);
        var r2 = OrbitMath.RadiusKm(s.AltitudeKm);
        var n1 = OrbitMath.MeanMotionRadS(r1);
        var n2 = OrbitMath.MeanMotionRadS(r2);
        var transferS = OrbitMath.HohmannTransferTimeS(r1, r2);
        var leadDeg = Deg(Math.PI - n2 * transferS); // МКС має бути попереду на цей кут у мить старту переходу
        leadDeg = ((leadDeg % 360) + 360) % 360;
        var initial = rng.NextDouble() * 360;
        var (h1, h2) = OrbitMath.Hohmann(r1, r2);
        var mass = s.WetMassKg;
        var propellant = s.PropellantCapacityKg;
        var waitHours = s.Design.Relay == true ? 0 : s.ContactsPerDay > 0 ? 24.0 / s.ContactsPerDay / 2 : 24;

        // Зміна площини одразу після виведення (якщо космодром вище нахилу МКС).
        var site = s.Mission.Catalogs.LaunchSites.Single(x => x.Id == d.LaunchSiteId);
        var deltaInclination = Math.Max(0, OrbitMath.MinimumInclinationDeg(site.LatitudeDeg) - s.InclinationDeg);
        Burn(OrbitMath.PlaneChangeKmS(OrbitMath.CircularSpeedKmS(r1), deltaInclination) * 1000);

        var hours = new List<double>();
        var phases = new List<double>();
        var altitudes = new List<double>();
        var fuel = new List<double>();
        var phase = initial;
        var altitude = d.InsertionAltitudeKm!.Value;
        double? transferStartH = null, dockedAt = null;
        var limitHours = (s.Mission.Goal.DockingDeadlineDays ?? 5) * 24 * 3;

        void Burn(double dvMs)
        {
            if (dvMs <= 0) return;
            var kg = Rocket.PropellantKg(mass, dvMs, s.IspS);
            if (kg > propellant) { propellant = -1; return; }
            propellant -= kg;
            mass -= kg;
        }

        for (var hour = 0.0; hour <= limitHours; hour += 1)
        {
            hours.Add(hour);
            phases.Add(Evaluator.R(phase, 2));
            altitudes.Add(Evaluator.R(altitude, 1));
            fuel.Add(Evaluator.R(Math.Max(propellant, 0), 1));
            if (dockedAt is not null || propellant < 0)
                break;

            if (transferStartH is null)
            {
                var next = phase - Deg((n1 - n2) * 3600);
                var crossed = Normalize(phase - leadDeg) <= Deg((n1 - n2) * 3600);
                phase = ((next % 360) + 360) % 360;
                if (crossed)
                {
                    transferStartH = hour + 1;
                    Burn(h1 * 1000);
                }
            }
            else
            {
                var elapsed = (hour + 1 - transferStartH.Value) * 3600;
                if (elapsed < transferS)
                {
                    altitude = d.InsertionAltitudeKm!.Value + (s.AltitudeKm - d.InsertionAltitudeKm!.Value) * elapsed / transferS;
                }
                else
                {
                    if (altitude < s.AltitudeKm)
                        Burn(h2 * 1000);
                    altitude = s.AltitudeKm;
                    phase = 0;
                    var arrival = transferStartH.Value + transferS / 3600;
                    if (hour + 1 >= arrival + Evaluator.ApproachDays * 24 + waitHours)
                    {
                        Burn(Evaluator.ApproachDeltaVms);
                        if (propellant >= 0)
                            dockedAt = hour + 1;
                    }
                }
            }
        }

        outcome.DockedAtHours = dockedAt;
        outcome.PropellantLeftKg = Math.Max(propellant, 0);
        outcome.FinalAltitudeKm = altitude;
        return new RendezvousProfile(Evaluator.R(initial, 1), 1, hours, phases, altitudes, fuel, dockedAt);

        static double Normalize(double deg) => ((deg % 360) + 360) % 360;
    }

    private static TimelineBuilder IssTimeline(EvaluationState s, Outcome outcome)
    {
        var tl = new TimelineBuilder();
        var dockDay = outcome.DockedAtHours is { } hrs ? (int)Math.Ceiling(hrs / 24) : (int)(s.Mission.Goal.DockingDeadlineDays ?? 5);
        var total = dockDay + IssStayDays;
        var eclipseNeed = s.ConstantConsumptionW * s.PeriodS / 3600 * s.EclipseFraction;
        var minSoc = 100 - (s.BatteryWh > 0 ? eclipseNeed / s.BatteryWh * 100 : 100);
        for (var day = 0; day <= total; day++)
        {
            var altitude = outcome.Docked && day >= dockDay ? s.AltitudeKm : s.Design.InsertionAltitudeKm ?? s.AltitudeKm;
            tl.Add(day, Math.Max(0, minSoc), 0, 0, altitude, outcome.PropellantLeftKg);
        }

        return tl;
    }

    // ───────────────────────────── Траса й сеанси ─────────────────────────────

    /// <summary>
    /// Траса трьох витків: кругова орбіта, поворот Землі; на світлі — поза циліндричною тінню
    /// (напрям на Сонце з Γ і ε, N10 слайди 117, 135; N14).
    /// </summary>
    private static GroundTrack BuildGroundTrack(EvaluationState s, double raan0, DateTime startDate)
    {
        const int step = 60;
        var r = OrbitMath.RadiusKm(s.AltitudeKm);
        var n = OrbitMath.MeanMotionRadS(r);
        var inc = Rad(s.InclinationDeg);
        var raan = Rad(raan0);
        var gamma = Rad(Eclipse.SunLongitudeDeg(startDate));
        var eps = Rad(ObliquityDeg);
        var (sx, sy, sz) = (Math.Cos(gamma), Math.Sin(gamma) * Math.Cos(eps), Math.Sin(gamma) * Math.Sin(eps));
        var points = new List<TrackPoint>();
        var duration = Math.Min(3 * s.PeriodS, SecondsPerDay);
        for (var t = 0.0; t <= duration; t += step)
        {
            var u = n * t;
            var (xo, yo, zo) = (Math.Cos(u), Math.Sin(u) * Math.Cos(inc), Math.Sin(u) * Math.Sin(inc));
            var x = xo * Math.Cos(raan) - yo * Math.Sin(raan);
            var y = xo * Math.Sin(raan) + yo * Math.Cos(raan);
            var z = zo;
            var lat = Deg(Math.Asin(z));                       // δ = sin⁻¹(z/r), N4 4.104
            var ra = Math.Atan2(y, x);                          // λ = tan₂⁻¹(y, x), N4 4.153
            var lon = Deg(ra - EarthRotationRadS * t);          // мінус поворот Землі
            lon = ((lon + 540) % 360) - 180;
            var along = x * sx + y * sy + z * sz;
            var perp = Math.Sqrt(Math.Max(0, 1 - along * along)) * r;
            var sunlit = along > 0 || perp > EarthRadiusKm;
            points.Add(new TrackPoint(Evaluator.R(lat, 2), Evaluator.R(lon, 2), sunlit));
        }

        return new GroundTrack(step, (int)Math.Round(duration / s.PeriodS), points);
    }

    private static IReadOnlyList<ContactSummary> BuildContacts(EvaluationState s, Design design, Mission mission)
    {
        var stations = design.GroundStationIds
            .Select(id => mission.Catalogs.GroundStations.Single(g => g.Id == id))
            .Select(g => new StationSite(g.Id, g.LatitudeDeg, g.LongitudeDeg))
            .ToList();
        var day = Contacts.SimulateDay(s.AltitudeKm, s.InclinationDeg, stations, s.RadioRateKbps);
        var radius = Evaluator.R(Contacts.VisibilityRadiusDeg(s.AltitudeKm), 1);
        var list = day.Stations
            .Select(x => new ContactSummary(x.StationId, x.ContactsPerDay, Evaluator.R(x.MinutesPerDay, 1), radius))
            .ToList();
        if (mission.Kind == MissionKinds.Iss && design.Relay == true)
            list.Add(new ContactSummary("tdrs", 1, 1440, null));
        return list;
    }
}
