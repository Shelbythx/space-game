using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;
using SpaceGame.Api.Simulation.Physics;
using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation;

/// <summary>
/// Сирі (неокруглені) величини оцінки — вхід для симуляції (задача 005).
/// </summary>
public sealed record EvaluationState(
    Mission Mission,
    Design Design,
    double AltitudeKm,
    double InclinationDeg,
    double PeriodS,
    double EclipseFraction,
    double BallisticFactor,
    double WetMassKg,
    double DryMassKg,
    double PropellantCapacityKg,
    double PropellantNeededKg,
    double IspS,
    double MaintenanceDeltaVmsPerYear,
    double GenerationW,
    double ConstantConsumptionW,
    double InstrumentConsumptionW,
    double RadioConsumptionW,
    double BatteryWh,
    double BatteryUsableWh,
    double GeneratedGbPerDay,
    double DownlinkGbPerDay,
    double StorageGb,
    double ContactsPerDay,
    double ContactMinutesPerDay,
    double OperationDays,
    double LifetimeYears,
    int LaunchMonth,
    IReadOnlyList<StationSite> LinkStations,
    double RadioRateKbps,
    double RadioFactor,
    double RendezvousDegPerOrbit,
    double InsertionPeriodS);

/// <summary>
/// Миттєва оцінка проєкту (POST /api/evaluate, D39): шість ресурсів, перевірки сегментів,
/// коментарі ролей, розрахункові листи (D94) і смужка витка. Чистий код без бази й HTTP (D59).
/// Формули — Physics/* з джерелами з docs/physics-sources.md (D89).
/// </summary>
public static class Evaluator
{
    /// <summary>Мінімальний запас енергії Pre-Phase A — GSFC-STD-1000 Rev I, табл. 1.06-1, с. 10.</summary>
    public const double PowerMarginRecommendedPct = 25;

    /// <summary>Деградація панелей, частка за рік — 🎲 ігрова оцінка (план 2.4).</summary>
    public const double SolarDegradationPerYear = 0.0275;

    /// <summary>Допустима глибина розряду: LEO 30 %, вище — 70 % (🎲, план 2.4).</summary>
    public static double MaxDepthOfDischarge(double altitudeKm) => altitudeKm < 2000 ? 0.30 : 0.70;

    /// <summary>Запас палива, нижче якого — попередження (🎲).</summary>
    public const double PropellantWarnFraction = 0.9;

    /// <summary>Правило 25 років — NASA-STD-8719.14C, 4.6.2.2, с. 42.</summary>
    public const double DisposalLimitYears = 25;

    /// <summary>Вище цієї висоти правило 25 років через гальмування не застосовується (N6 — інші способи відведення).</summary>
    public const double DisposalRuleMaxAltitudeKm = 2000;

    /// <summary>Ціна ретранслятора TDRS для місії на МКС, к — 🎲.</summary>
    public const double RelayPriceK = 100;

    /// <summary>Δv на підхід і стикування та на відведення корабля, м/с; резерв 10 % — 🎲 (план 2.10).</summary>
    public const double ApproachDeltaVms = 20;
    public const double ShipDeorbitDeltaVms = 100;
    public const double ShipDeltaVReserve = 0.10;

    /// <summary>Підхід і стикування після фазування, діб — 🎲.</summary>
    public const double ApproachDays = 0.25;

    public static readonly IReadOnlySet<string> ScienceValues = new HashSet<string>(["high", "highest"], StringComparer.Ordinal);

    public static (Evaluation Evaluation, EvaluationState State) Evaluate(Design d, Mission m)
    {
        var c = m.Catalogs;
        var isIss = m.Kind == MissionKinds.Iss;
        var advanced = d.Version == "advanced";
        var simple = !advanced;

        Part P(string id, string category) => c.Parts.Single(p => p.Id == id && p.Category == category);
        var bus = P(d.Parts.Bus, PartCategories.Bus);
        var solar = P(d.Parts.Solar, PartCategories.Solar);
        var battery = P(d.Parts.Battery, PartCategories.Battery);
        var radio = P(d.Parts.Radio, PartCategories.Radio);
        var computer = P(d.Parts.Computer, PartCategories.Computer);
        var adcs = P(d.Parts.Adcs, PartCategories.Adcs);
        var prop = P(d.Parts.Propulsion, PartCategories.Propulsion);
        Part[] parts = [bus, solar, battery, radio, computer, adcs, prop];
        var instruments = d.InstrumentIds.Select(id => c.Instruments.Single(i => i.Id == id)).ToList();
        var stations = d.GroundStationIds.Select(id => c.GroundStations.Single(s => s.Id == id)).ToList();
        var launch = c.Launches.Single(l => l.Id == d.LaunchId);

        var checks = new List<Check>();
        var comments = new List<RoleComment>();
        var calc = new List<CalcSheet>();

        void AddCheck(string segment, string status, string code, Params p) => checks.Add(new Check(segment, status, code, p));
        void AddComment(string role, string code, string adviceCode, Params p, string severity = "warn") =>
            comments.Add(new RoleComment(role, severity, Message.Of(code, p), simple ? Message.Of(adviceCode) : null));

        // ───── Орбіта ─────
        string? orbitId;
        double altitudeKm, inclinationDeg;
        if (isIss)
        {
            var iss = c.Orbits[0];
            (orbitId, altitudeKm, inclinationDeg) = (iss.Id, iss.AltitudeKm, iss.InclinationDeg);
        }
        else
        {
            var presetId = launch.FixedOrbitId ?? d.Orbit?.PresetId;
            if (presetId is not null)
            {
                var o = c.Orbits.Single(x => x.Id == presetId);
                (orbitId, altitudeKm, inclinationDeg) = (o.Id, o.AltitudeKm, o.InclinationDeg);
            }
            else
            {
                (orbitId, altitudeKm, inclinationDeg) = (null, d.Orbit!.AltitudeKm!.Value, d.Orbit.InclinationDeg!.Value);
            }
        }

        var radiusKm = OrbitMath.RadiusKm(altitudeKm);
        var periodS = OrbitMath.PeriodS(radiusKm);
        var periodMin = periodS / 60;
        var speedKmS = OrbitMath.CircularSpeedKmS(radiusKm);
        var eclipse = Eclipse.Fraction(altitudeKm, 0); // evaluate — найгірший випадок β = 0
        var sunlit = 1 - eclipse;

        // ───── Розміщення й вимоги (D93) ─────
        var layout = Layout.Resolve(d);
        var wrongSide = layout.Where(kv => kv.Value != Layout.ExpectedSide(kv.Key)).ToList();
        bool OnRightSide(string key) => !layout.TryGetValue(key, out var side) || side == Layout.ExpectedSide(key);

        var selected = d.Parts.All().ToDictionary(x => x.Category, x => x.PartId, StringComparer.Ordinal);
        bool Met(IReadOnlyList<Requirement> reqs) => reqs.All(r => selected.GetValueOrDefault(r.Category) == r.PartId);
        var unmet = parts.Where(p => !Met(p.Requires)).Select(p => (p.Id, p.Requires))
            .Concat(instruments.Where(i => !Met(i.Requires)).Select(i => (i.Id, i.Requires)))
            .ToList();

        var workingInstruments = instruments.Where(i => Met(i.Requires) && OnRightSide(i.Id)).ToList();
        var radioWorks = Met(radio.Requires);
        var radioFactor = radioWorks ? (OnRightSide(PartCategories.Radio) ? 1 : Layout.WrongSideRadioFactor) : 0;

        // ───── Маса (план 2.12, GSFC-STD-1000) ─────
        var dryKg = parts.Sum(p => p.MassKg) + instruments.Sum(i => i.MassKg);
        var tankKg = prop.Specs.PropellantKg ?? 0;
        var cargoKg = d.Cargo?.Sum(x => x.MassKg) ?? 0;
        var usedKg = dryKg + tankKg + cargoKg;
        var recommendedReservePct = m.Limits.MassReserveRecommendedPct;
        var reservePct = advanced && d.MassReservePct is { } chosenPct ? chosenPct : recommendedReservePct;
        var reserveKg = dryKg * reservePct / 100; // запас — лише на суху масу (N11, примітка до табл. 1.06-1)
        var withReserveKg = usedKg + reserveKg;
        var busMaxKg = bus.Specs.MaxMassKg ?? double.MaxValue;
        var slots = bus.Specs.Slots ?? 0;
        var slotsUsed = parts.Count(p => p.Category != PartCategories.Bus && p.MassKg > 0)
                        + instruments.Sum(i => 1 + (int)Math.Floor(i.MassKg / 10)); // 🎲 місця інструмента
        var capacityKg = LaunchCapacity(launch, orbitId, altitudeKm, c.Orbits, isIss);

        // ───── Бюджет і час ─────
        var relayPrice = isIss && d.Relay == true ? RelayPriceK : 0;
        var usedK = parts.Sum(p => p.PriceK) + instruments.Sum(i => i.PriceK) + stations.Sum(s => s.PriceK) + launch.PriceK + relayPrice;
        var limitK = m.Limits.BudgetK;

        int TierMonths(string tier) => tier switch { "best" => m.Timing.BuildMonths.Best, "medium" => m.Timing.BuildMonths.Medium, _ => m.Timing.BuildMonths.Basic };
        var buildMonths = parts.Select(p => p.Tier).Concat(instruments.Select(i => i.Tier)).Max(TierMonths);
        var readyMonth = buildMonths + m.Timing.IntegrationMonths;
        int launchMonth;
        if (launch.FixedOrbitId is not null && m.Timing.RideshareMonths.Count > 0)
        {
            var flights = m.Timing.RideshareMonths;
            launchMonth = flights.Where(x => x >= readyMonth).DefaultIfEmpty(flights[^1] + 12 * (1 + (readyMonth - flights[^1]) / 12)).First();
        }
        else
        {
            launchMonth = readyMonth + m.Timing.LaunchLeadMonths.GetValueOrDefault(launch.Id);
        }

        var deadlineMonth = m.Limits.LaunchDeadlineMonth;

        // ───── Тривалість роботи ─────
        var operationMonths = m.Goal.OperationMonths ?? 0;
        var operationYears = isIss ? (m.Goal.DockingDeadlineDays ?? 5) / DaysPerYear : operationMonths / 12.0;
        var operationDays = operationYears * DaysPerYear;

        // ───── Гальмування, паливо, відведення (план 2.8) ─────
        var panelAreaM2 = solar.Id is "solar-deploy" or "solar-roll"
            ? (solar.Specs.PowerW ?? 0) / (SolarConstantWm2 * SolarCellEfficiency)
            : 0;
        var dragAreaM2 = (bus.Specs.DragAreaM2 ?? 0) + panelAreaM2;
        var wetKg = dryKg + tankKg + cargoKg;
        var ballistic = Drag.BallisticFactor(dragAreaM2, wetKg);
        var ispS = prop.Specs.IspS ?? 0;
        var hasEngine = ispS > 0 && tankKg > 0;

        double? lifetimeYears = null, disposalYears = null;
        double deltaVms = 0, maintenancePerYear = 0, neededKg = 0;
        double hohmannMs = 0, planeChangeMs = 0, phasingDays = 0, degPerOrbit = 0, insertionPeriodS = 0;
        double rawLifetime = Drag.MaxLifetimeYears;
        double disposalDeltaVms = 0, maintenanceDeltaVms = 0, disposalTargetKm = altitudeKm;
        double insertionKm = 0, siteLatitude = 0, deltaInclination = 0, dockingDays = 0;

        if (!isIss)
        {
            rawLifetime = Drag.LifetimeYears(altitudeKm, ballistic);
            lifetimeYears = rawLifetime;
            maintenancePerYear = Drag.MaintenanceDeltaVms(altitudeKm, ballistic, 1);

            if (hasEngine)
            {
                maintenanceDeltaVms = maintenancePerYear * operationYears;
                if (altitudeKm <= DisposalRuleMaxAltitudeKm && rawLifetime > DisposalLimitYears)
                {
                    disposalTargetKm = Drag.AltitudeForLifetimeKm(DisposalLimitYears, ballistic, altitudeKm);
                    var (a1, a2) = OrbitMath.Hohmann(radiusKm, OrbitMath.RadiusKm(disposalTargetKm));
                    disposalDeltaVms = (a1 + a2) * 1000;
                }

                deltaVms = maintenanceDeltaVms + disposalDeltaVms;
                neededKg = Rocket.PropellantKg(dryKg + tankKg, deltaVms, ispS);

                // Палива бракує: спершу підтримання, рештою — пониження наскільки вистачить.
                var finalAltitude = disposalTargetKm;
                if (neededKg > tankKg)
                {
                    var availableDv = Rocket.DeltaVms(dryKg + tankKg, tankKg, ispS);
                    var leftForDisposal = Math.Max(0, availableDv - maintenanceDeltaVms);
                    finalAltitude = LowestReachableAltitude(altitudeKm, disposalTargetKm, leftForDisposal);
                }

                if (altitudeKm <= DisposalRuleMaxAltitudeKm)
                    disposalYears = Drag.LifetimeYears(finalAltitude, ballistic);
            }
            else if (altitudeKm <= DisposalRuleMaxAltitudeKm)
            {
                disposalYears = Math.Max(0, rawLifetime - operationYears);
            }
        }
        else
        {
            // ───── Місія на МКС: виведення → Гоман → фазування (план 2.9, 2.10) ─────
            var site = c.LaunchSites.Single(s => s.Id == d.LaunchSiteId);
            siteLatitude = site.LatitudeDeg;
            insertionKm = d.InsertionAltitudeKm!.Value;
            var r1 = OrbitMath.RadiusKm(insertionKm);
            var (h1, h2) = OrbitMath.Hohmann(r1, radiusKm);
            hohmannMs = (h1 + h2) * 1000;
            deltaInclination = LaunchGeometry.PlaneChangeNeededDeg(siteLatitude, inclinationDeg);
            planeChangeMs = LaunchGeometry.PlaneChangeDeltaVms(siteLatitude, inclinationDeg, insertionKm);
            degPerOrbit = Rendezvous.PhasingDegPerOrbit(r1, radiusKm);
            insertionPeriodS = OrbitMath.PeriodS(r1);
            phasingDays = Rendezvous.WorstCasePhasingDays(r1, radiusKm);
            deltaVms = (hohmannMs + planeChangeMs + ApproachDeltaVms + ShipDeorbitDeltaVms) * (1 + ShipDeltaVReserve);
            neededKg = Rocket.PropellantKg(wetKg, deltaVms, ispS);
        }

        // ───── Сеанси й радіолінія (план 2.5, 2.6) ─────
        var band = radio.Specs.Band ?? "";
        var matched = stations.Where(s => s.Bands.Contains(band)).ToList();
        var linkSites = matched.Select(s => new StationSite(s.Id, s.LatitudeDeg, s.LongitudeDeg)).ToList();
        var rateKbps = radio.Specs.RateKbps ?? 0;
        var relay = isIss && d.Relay == true;
        var day = Contacts.SimulateDay(altitudeKm, inclinationDeg, linkSites, rateKbps);
        var contactsPerDay = relay ? 1 : day.Stations.Sum(s => s.ContactsPerDay);
        var contactMinutes = relay ? 1440 : day.UnionMinutes;
        var downlinkGbPerDay = day.DownlinkBits / 8e9 * radioFactor;
        var contactFraction = contactMinutes / 1440;

        // ───── Енергія (план 2.4) ─────
        var bodyFactor = solar.Id == "solar-body" ? Layout.BodyPanelFactor(layout[PartCategories.Solar]) : 1;
        var degradation = Math.Max(0, 1 - SolarDegradationPerYear * operationYears);
        var generationW = (solar.Specs.PowerW ?? 0) * bodyFactor * degradation;
        var averageGenerationW = generationW * sunlit;
        var constantW = computer.ConsumptionW + adcs.ConsumptionW + bus.ConsumptionW + battery.ConsumptionW;
        var instrumentW = workingInstruments.Sum(i => i.ConsumptionW);
        var radioW = radio.ConsumptionW;
        var electricW = 0.0;
        if ((prop.Specs.PowerW ?? 0) > 0 && (prop.Specs.ThrustN ?? 0) > 0 && !isIss)
        {
            var burnSecondsPerYear = wetKg * maintenancePerYear / prop.Specs.ThrustN!.Value;
            electricW = prop.Specs.PowerW!.Value * Math.Min(1, burnSecondsPerYear / SecondsPerYear);
        }

        var averageConsumptionW = constantW + instrumentW * sunlit + radioW * contactFraction + electricW;
        var marginPct = averageGenerationW > 0 ? (averageGenerationW - averageConsumptionW) / averageGenerationW * 100 : -100;
        var eclipsePowerW = constantW + radioW * contactFraction;
        var eclipseNeedWh = eclipsePowerW * periodS / 3600 * eclipse;
        var batteryWh = battery.Specs.CapacityWh ?? 0;
        var usableWh = batteryWh * MaxDepthOfDischarge(altitudeKm);

        // ───── Дані (план 2.7) ─────
        var generatedGbPerDay = workingInstruments.Sum(i => i.DataRateKbps) * 1000 * SecondsPerDay * sunlit / 8e9;
        var storageGb = computer.Specs.StorageGb ?? 0;
        var maintained = hasEngine && neededKg <= tankKg;
        var activeDays = maintained ? operationDays : Math.Min(operationDays, rawLifetime * DaysPerYear);
        var expectedTotalGb = Math.Min(generatedGbPerDay, downlinkGbPerDay) * activeDays;
        var goalGb = m.Goal.DataGb ?? 0;
        var backlogGbPerDay = Math.Max(0, generatedGbPerDay - downlinkGbPerDay);

        // ───── Вантаж (лише iss) ─────
        CargoResource? cargo = null;
        if (isIss)
        {
            var loaded = d.Cargo!.Sum(x => x.MassKg);
            var science = d.Cargo!.Where(x => ScienceValues.Contains(c.CargoCategories.Single(k => k.Id == x.CategoryId).Value)).Sum(x => x.MassKg);
            cargo = new CargoResource(R(loaded, 1), R(science, 1), R(loaded > 0 ? science / loaded * 100 : 0, 1),
                m.Goal.CargoKg ?? 0, m.Goal.ScienceCargoMinPct ?? 0);

            var waitHours = relay ? 0 : contactsPerDay > 0 ? 24.0 / contactsPerDay / 2 : 24;
            dockingDays = OrbitMath.HohmannTransferTimeS(OrbitMath.RadiusKm(insertionKm), radiusKm) / SecondsPerDay
                          + phasingDays + ApproachDays + waitHours / 24;
        }

        // ═════ Перевірки й коментарі (порядок — як у панелі) ═════
        // mission
        if (usedK > limitK)
        {
            AddCheck("mission", "fail", "check.mission.overBudget", new Params { ["usedK"] = R(usedK, 1), ["limitK"] = limitK });
            AddComment("planner", "comment.planner.overBudget", "advice.planner.cheaperLaunchOrParts", new Params { ["overK"] = R(usedK - limitK, 1) });
        }
        else AddCheck("mission", "ok", "check.mission.withinBudget", new Params { ["usedK"] = R(usedK, 1), ["limitK"] = limitK });

        if (launchMonth > deadlineMonth)
        {
            AddCheck("mission", "fail", "check.mission.launchLate", new Params { ["launchMonth"] = launchMonth, ["deadlineMonth"] = deadlineMonth });
            AddComment("planner", "comment.planner.launchLate", "advice.planner.simplerParts", new Params { ["lateMonths"] = launchMonth - deadlineMonth });
        }
        else AddCheck("mission", "ok", "check.mission.launchOnTime", new Params { ["launchMonth"] = launchMonth, ["deadlineMonth"] = deadlineMonth });

        // launch
        if (capacityKg <= 0)
        {
            AddCheck("launch", "fail", "check.launch.orbitUnreachable", new Params { ["launchId"] = launch.Id, ["orbitId"] = orbitId ?? "custom" });
        }
        else if (withReserveKg > capacityKg)
        {
            AddCheck("launch", "fail", "check.launch.overCapacity", new Params { ["massKg"] = R(withReserveKg, 1), ["capacityKg"] = capacityKg });
            AddComment("designer", "comment.designer.overMass", "advice.designer.lighterParts", new Params { ["massKg"] = R(withReserveKg, 1), ["limitKg"] = capacityKg });
            if (isIss)
                AddComment("designer", "comment.designer.propellantMass", "advice.designer.lowerInsertion", new Params { ["propellantKg"] = R(neededKg, 1), ["capacityKg"] = R(tankKg, 1) });
        }
        else AddCheck("launch", "ok", "check.launch.capacity", new Params { ["massKg"] = R(withReserveKg, 1), ["capacityKg"] = capacityKg });

        if (BusRank(bus.Specs.BusSize) > BusRank(launch.MaxBusSize))
        {
            var p = new Params { ["busSize"] = bus.Specs.BusSize ?? "", ["maxBusSize"] = launch.MaxBusSize };
            AddCheck("launch", "fail", "check.launch.busTooLarge", p);
            AddComment("designer", "comment.designer.busTooLarge", "advice.designer.smallerBusOrLaunch", p);
        }

        if (isIss)
        {
            var p = new Params { ["latitudeDeg"] = siteLatitude, ["targetInclinationDeg"] = inclinationDeg, ["planeChangeDeltaVms"] = R(planeChangeMs, 0) };
            AddCheck("launch", planeChangeMs > 0 ? "warn" : "ok", "check.launch.siteInclination", p);
            if (planeChangeMs > 0)
                AddComment("planner", "comment.planner.launchSiteLatitude", "advice.planner.lowerLatitudeSite",
                    new Params { ["latitudeDeg"] = siteLatitude, ["planeChangeDeltaVms"] = R(planeChangeMs, 0) });
        }

        // space
        if (usedKg > busMaxKg)
        {
            AddCheck("space", "fail", "check.space.busOverMass", new Params { ["massKg"] = R(usedKg, 1), ["busMaxKg"] = busMaxKg });
            AddComment("designer", "comment.designer.overMass", "advice.designer.lighterParts", new Params { ["massKg"] = R(usedKg, 1), ["limitKg"] = busMaxKg });
        }

        if (slotsUsed > slots)
        {
            var p = new Params { ["slotsUsed"] = slotsUsed, ["slots"] = slots };
            AddCheck("space", "fail", "check.space.slots", p);
            AddComment("designer", "comment.designer.noSlots", "advice.designer.biggerBus", p);
        }

        foreach (var (id, reqs) in unmet)
            foreach (var r in reqs.Where(r => selected.GetValueOrDefault(r.Category) != r.PartId))
                AddCheck("space", "fail", "check.space.missingRequirement", new Params { ["partId"] = id, ["requiredPartId"] = r.PartId });

        if (marginPct < 0)
        {
            AddCheck("space", "fail", "check.space.powerDeficit", new Params { ["marginPct"] = R(marginPct, 0) });
            AddComment("engineer", "comment.engineer.powerMarginLow", "advice.engineer.biggerPanels", new Params { ["marginPct"] = R(marginPct, 0) });
        }
        else if (marginPct < PowerMarginRecommendedPct)
        {
            AddCheck("space", "warn", "check.space.powerMargin", new Params { ["marginPct"] = R(marginPct, 0) });
            AddComment("engineer", "comment.engineer.powerMarginLow", "advice.engineer.biggerPanels", new Params { ["marginPct"] = R(marginPct, 0) });
        }
        else AddCheck("space", "ok", "check.space.powerMargin", new Params { ["marginPct"] = R(marginPct, 0) });

        if (eclipseNeedWh > usableWh)
        {
            var p = new Params { ["neededWh"] = R(eclipseNeedWh, 1), ["capacityWh"] = batteryWh };
            AddCheck("space", eclipseNeedWh > batteryWh ? "fail" : "warn", "check.space.batteryShort", p);
            AddComment("engineer", "comment.engineer.batteryShortInEclipse", "advice.engineer.biggerBattery", p);
        }

        if (electricW > 0 && prop.Specs.PowerW > averageGenerationW - (averageConsumptionW - electricW))
            AddComment("engineer", "comment.engineer.electricPropulsionPower", "advice.engineer.biggerPanels", new Params { ["powerW"] = prop.Specs.PowerW ?? 0 });

        foreach (var (key, side) in wrongSide)
        {
            var p = new Params { ["partId"] = key, ["side"] = side, ["expectedSide"] = Layout.ExpectedSide(key) };
            AddCheck("space", "warn", "check.space.wrongSide", p);
            AddComment("designer", "comment.designer.wrongSide", "advice.designer.turnPart", p);
        }

        if (reservePct < recommendedReservePct)
        {
            var p = new Params { ["reservePct"] = reservePct, ["recommendedPct"] = recommendedReservePct };
            AddCheck("space", "warn", "check.space.massReserveLow", p);
            AddComment("designer", "comment.designer.massReserveLow", "advice.designer.raiseReserve", p);
        }

        if (deltaVms > 0 || tankKg > 0)
        {
            var p = new Params { ["neededKg"] = R(neededKg, 2), ["capacityKg"] = tankKg };
            if (neededKg > tankKg)
            {
                AddCheck("space", "fail", "check.space.propellantShort", p);
                AddComment("engineer", "comment.engineer.propellantShort", "advice.engineer.biggerTankOrHigherIsp", p);
            }
            else AddCheck("space", neededKg > PropellantWarnFraction * tankKg ? "warn" : "ok", "check.space.propellantMargin", p);
        }

        if (!isIss)
        {
            if (!maintained && rawLifetime < operationYears)
            {
                var p = new Params { ["lifetimeYears"] = R(rawLifetime, 2), ["operationYears"] = R(operationYears, 2) };
                AddCheck("space", "fail", "check.space.orbitDecay", p);
                AddComment("engineer", "comment.engineer.noPropulsionDecay", "advice.engineer.addPropulsion", p);
            }

            if (disposalYears is { } dy)
            {
                var p = new Params { ["disposalYears"] = R(dy, 1), ["limitYears"] = DisposalLimitYears };
                if (dy > DisposalLimitYears)
                {
                    AddCheck("space", "fail", "check.space.disposalTooLong", p);
                    AddComment("engineer", "comment.engineer.disposalTooLong", "advice.engineer.addPropulsion", new Params { ["disposalYears"] = R(dy, 1) });
                }
                else AddCheck("space", "ok", "check.space.disposal", p);
            }
        }

        // ground
        if (relay)
        {
            AddCheck("ground", "ok", "check.ground.relay", new Params { ["priceK"] = RelayPriceK });
            AddComment("planner", "comment.planner.relayCost", "advice.planner.groundOnly", new Params { ["priceK"] = RelayPriceK }, "info");
        }
        else
        {
            if (stations.Count == 0)
                AddCheck("ground", "fail", "check.ground.noStation", new Params());

            foreach (var s in stations.Where(s => !s.Bands.Contains(band)))
                AddCheck("ground", matched.Count == 0 ? "fail" : "warn", "check.ground.bandMismatch", new Params { ["band"] = band, ["stationId"] = s.Id });
            if (stations.Count > 0 && matched.Count == 0)
                AddComment("scientist", "comment.scientist.bandMismatch", "advice.scientist.matchStationBand", new Params { ["band"] = band });

            if (isIss)
            {
                var waitHours = contactsPerDay > 0 ? 24.0 / contactsPerDay / 2 : 24;
                AddCheck("ground", "warn", "check.ground.dockingWaitsForContact", new Params { ["waitHours"] = R(waitHours, 1) });
            }
        }

        if (!isIss)
        {
            if (generatedGbPerDay > downlinkGbPerDay)
            {
                var p = new Params { ["generatedGbPerDay"] = R(generatedGbPerDay, 2), ["downlinkGbPerDay"] = R(downlinkGbPerDay, 2) };
                AddCheck("ground", "warn", "check.ground.dataBacklog", p);
                AddComment("scientist", "comment.scientist.dataBacklog", "advice.scientist.fasterRadioOrStations", p);

                if (backlogGbPerDay > 0 && storageGb / backlogGbPerDay < operationDays)
                {
                    var ps = new Params { ["storageGb"] = storageGb, ["backlogGbPerDay"] = R(backlogGbPerDay, 2) };
                    AddCheck("ground", "warn", "check.ground.storageOverflow", ps);
                    AddComment("engineer", "comment.engineer.storageSmall", "advice.engineer.biggerStorage", ps);
                }
            }

            // user
            var pg = new Params { ["expectedGb"] = R(expectedTotalGb, 1), ["goalGb"] = goalGb };
            if (expectedTotalGb >= goalGb) AddCheck("user", "ok", "check.user.goalReached", pg);
            else
            {
                AddCheck("user", "fail", "check.user.goalMissed", pg);
                AddComment("scientist", "comment.scientist.goalMissed", "advice.scientist.betterInstrument", pg);
            }
        }
        else
        {
            var goal = m.Goal.CargoKg ?? 0;
            var pc = new Params { ["cargoKg"] = cargo!.LoadedKg, ["goalKg"] = goal };
            AddCheck("user", cargo.LoadedKg >= goal ? "ok" : "fail", cargo.LoadedKg >= goal ? "check.user.cargoDelivered" : "check.user.cargoShort", pc);

            var minPct = m.Goal.ScienceCargoMinPct ?? 0;
            if (cargo.SciencePct < minPct)
            {
                var p = new Params { ["sciencePct"] = cargo.SciencePct, ["scienceMinPct"] = minPct };
                AddCheck("user", "warn", "check.user.scienceShareLow", p);
                AddComment("scientist", "comment.scientist.scienceCargoLow", "advice.scientist.moreScienceCargo", p);
            }

            var deadlineDays = m.Goal.DockingDeadlineDays ?? 0;
            if (dockingDays > deadlineDays)
                AddCheck("user", "fail", "check.user.dockingLate", new Params { ["dockingDays"] = R(dockingDays, 1), ["deadlineDays"] = deadlineDays });
        }

        // ═════ Розрахункові листи (D94), порядок — за ресурсами ═════
        calc.Add(Sheet("calc.mass.total", "mass", "m_res = m_dry·(1 + reserve) + m_prop + m_cargo",
            [V("m_dry", dryKg, "kg"), V("reserve", reservePct, "%"), V("m_prop", tankKg, "kg"), V("m_cargo", cargoKg, "kg")],
            V("m_res", withReserveKg, "kg"),
            new Params { ["usedKg"] = R(usedKg, 1), ["reservePct"] = reservePct, ["withReserveKg"] = R(withReserveKg, 1), ["capacityKg"] = capacityKg },
            NasaSources.MassMargin));
        calc.Add(Sheet("calc.power.balance", "power", "margin = (P_gen·(1 − f) − P_use) / (P_gen·(1 − f))",
            [V("P_gen", generationW, "W"), V("f", eclipse, ""), V("P_use", averageConsumptionW, "W")],
            V("margin", marginPct, "%"),
            new Params { ["averageGenerationW"] = R(averageGenerationW, 1), ["averageConsumptionW"] = R(averageConsumptionW, 1), ["marginPct"] = R(marginPct, 0) },
            NasaSources.PowerMargin));
        calc.Add(Sheet("calc.power.eclipseBattery", "power", "E_ecl = P_ecl · T · f",
            [V("P_ecl", eclipsePowerW, "W"), V("T", periodMin, "min"), V("f", eclipse, "")],
            V("E_ecl", eclipseNeedWh, "Wh"),
            new Params { ["eclipsePct"] = R(eclipse * 100, 0), ["neededWh"] = R(eclipseNeedWh, 1) },
            NasaSources.EclipseBattery));
        calc.Add(Sheet("calc.budget.total", "budget", "B = Σ price",
            [V("parts", parts.Sum(p => p.PriceK), "k"), V("instruments", instruments.Sum(i => i.PriceK), "k"), V("stations", stations.Sum(s => s.PriceK), "k"),
             V("launch", launch.PriceK, "k"), V("relay", relayPrice, "k")],
            V("B", usedK, "k"),
            new Params { ["usedK"] = R(usedK, 1), ["limitK"] = limitK },
            NasaSources.Budget));
        if (!isIss)
        {
            calc.Add(Sheet("calc.data.generated", "data", "D_gen = Σ rate · 86400 s · (1 − f)",
                [V("rate", workingInstruments.Sum(i => i.DataRateKbps), "kbit/s"), V("f", eclipse, "")],
                V("D_gen", generatedGbPerDay, "GB/day"),
                new Params { ["generatedGbPerDay"] = R(generatedGbPerDay, 2) },
                NasaSources.DataGenerated));
            calc.Add(Sheet("calc.data.downlink", "data", "D_down = Σ R·min(1, (1000 km / d)²)·Δt",
                [V("R", rateKbps, "kbit/s"), V("d", day.MeanContactDistanceKm, "km"), V("t", contactMinutes, "min")],
                V("D_down", downlinkGbPerDay, "GB/day"),
                new Params { ["rateKbps"] = rateKbps, ["distanceKm"] = R(day.MeanContactDistanceKm, 0), ["downlinkGbPerDay"] = R(downlinkGbPerDay, 2) },
                NasaSources.Downlink));
        }

        calc.Add(Sheet("calc.comms.contacts", "comms", "contact: elevation > 10°",
            [V("stations", relay ? 1 : linkSites.Count, ""), V("h", altitudeKm, "km"), V("i", inclinationDeg, "deg")],
            V("t", contactMinutes, "min/day"),
            new Params { ["contactsPerDay"] = contactsPerDay, ["contactMinutesPerDay"] = R(contactMinutes, 0) },
            NasaSources.Contacts));
        calc.Add(Sheet("calc.time.ready", "time", "ready = max(build) + integration",
            [V("build", buildMonths, "month"), V("integration", m.Timing.IntegrationMonths, "month")],
            V("ready", readyMonth, "month"),
            new Params { ["buildMonths"] = buildMonths, ["integrationMonths"] = m.Timing.IntegrationMonths, ["readyMonth"] = readyMonth, ["launchMonth"] = launchMonth },
            NasaSources.Timing));
        calc.Add(Sheet("calc.orbit.period", "orbit", "T = 2π√(r³/μ), v = √(μ/r)",
            [V("r", radiusKm, "km"), V("μ", MuKm3S2, "km³/s²")],
            V("T", periodMin, "min"),
            new Params { ["altitudeKm"] = altitudeKm, ["periodMin"] = R(periodMin, 1), ["speedKmS"] = R(speedKmS, 2) },
            NasaSources.Period));
        calc.Add(Sheet("calc.orbit.eclipse", "orbit", "f = (1/π)·arccos(√(h² + 2Rh) / ((R + h)·cos β))",
            [V("h", altitudeKm, "km"), V("R", EarthRadiusKm, "km"), V("β", 0, "deg")],
            V("f", eclipse, ""),
            new Params { ["altitudeKm"] = altitudeKm, ["eclipsePct"] = R(eclipse * 100, 0) },
            NasaSources.Eclipse));
        if (!isIss)
        {
            calc.Add(Sheet("calc.orbit.lifetime", "orbit", "da/dt = −ρ(h)·(C_d·A/m)·√(μ·a)",
                [V("h", altitudeKm, "km"), V("ρ", Atmosphere.DensityKgM3(altitudeKm), "kg/m³"), V("C_d", DragCoefficient, ""), V("A", dragAreaM2, "m²"), V("m", wetKg, "kg")],
                V("t_life", rawLifetime, "yr"),
                new Params { ["altitudeKm"] = altitudeKm, ["lifetimeYears"] = R(rawLifetime, 1) },
                NasaSources.Lifetime));
            if (disposalYears is { } dy2)
                calc.Add(Sheet("calc.orbit.disposal", "orbit", "t_disposal ≤ 25 yr",
                    [V("Δv_disposal", disposalDeltaVms, "m/s"), V("h_end", disposalTargetKm, "km")],
                    V("t_disposal", dy2, "yr"),
                    new Params { ["disposalYears"] = R(dy2, 1), ["limitYears"] = DisposalLimitYears },
                    NasaSources.Disposal));
        }

        calc.Add(Sheet("calc.propellant.rocketEquation", "propellant", "m_prop = m₀·(1 − e^(−Δv/(Isp·g₀)))",
            [V("m₀", isIss ? wetKg : dryKg + tankKg, "kg"), V("Δv", deltaVms, "m/s"), V("Isp", ispS, "s"), V("g₀", G0, "m/s²")],
            V("m_prop", neededKg, "kg"),
            new Params { ["deltaVms"] = R(deltaVms, 1), ["ispS"] = ispS, ["neededKg"] = R(neededKg, 2) },
            NasaSources.Rocket));
        if (isIss)
        {
            calc.Add(Sheet("calc.rendezvous.hohmann", "rendezvous", "Δv₁ + Δv₂ = √(μ/r₁)·(√(2r₂/(r₁+r₂)) − 1) + √(μ/r₂)·(1 − √(2r₁/(r₁+r₂)))",
                [V("r₁", OrbitMath.RadiusKm(insertionKm), "km"), V("r₂", radiusKm, "km")],
                V("Δv", hohmannMs, "m/s"),
                new Params { ["fromKm"] = insertionKm, ["toKm"] = altitudeKm, ["deltaVms"] = R(hohmannMs, 1) },
                NasaSources.Hohmann));
            calc.Add(Sheet("calc.rendezvous.phasing", "rendezvous", "Δθ = (n₁ − n₂)·T₁",
                [V("T₁", insertionPeriodS / 60, "min")],
                V("Δθ", degPerOrbit, "deg"),
                new Params { ["degPerOrbit"] = R(degPerOrbit, 1), ["phasingDays"] = R(phasingDays, 2) },
                NasaSources.Phasing));
            calc.Add(Sheet("calc.rendezvous.planeChange", "rendezvous", "Δv = 2v·sin(Δi/2)",
                [V("v", OrbitMath.CircularSpeedKmS(OrbitMath.RadiusKm(insertionKm)) * 1000, "m/s"), V("Δi", deltaInclination, "deg")],
                V("Δv", planeChangeMs, "m/s"),
                new Params { ["deltaInclinationDeg"] = R(deltaInclination, 2), ["deltaVms"] = R(planeChangeMs, 1) },
                NasaSources.PlaneChange));
        }

        // ═════ Смужка витка (D94): β = 0, тінь навпроти Сонця ═════
        StripInterval? stripEclipse = eclipse > 0
            ? new StripInterval(R(periodMin / 2 * (1 - eclipse), 1), R(periodMin / 2 * (1 + eclipse), 1))
            : null;
        var stripContacts = relay
            ? [new StripContact("tdrs", 0, R(periodMin, 1))]
            : BestOrbitContacts(day.Windows, periodS);

        var evaluation = new Evaluation(
            new OrbitResult(altitudeKm, R(inclinationDeg, 2), R(periodMin, 1), R(speedKmS, 2), R(eclipse, 3),
                lifetimeYears is { } lt ? R(lt, 1) : null, disposalYears is { } dsp ? R(dsp, 1) : null),
            new Resources(
                new MassResource(R(usedKg, 2), busMaxKg, capacityKg, slotsUsed, slots, reservePct, R(reserveKg, 2), R(withReserveKg, 2), recommendedReservePct),
                new PowerResource(R(generationW, 1), R(averageGenerationW, 1), R(averageConsumptionW, 1), R(eclipseNeedWh, 1), batteryWh),
                new BudgetResource(R(usedK, 1), limitK),
                isIss ? null : new DataResource(R(generatedGbPerDay, 3), R(downlinkGbPerDay, 3), storageGb, R(expectedTotalGb, 1), goalGb),
                new CommsResource(contactsPerDay, R(contactMinutes, 1)),
                new TimeResource(readyMonth, launchMonth, deadlineMonth),
                new PropellantResource(R(neededKg, 2), tankKg, R(deltaVms, 1)),
                cargo),
            isIss ? new RendezvousEstimate(R(hohmannMs, 1), R(phasingDays, 2), R(planeChangeMs, 1)) : null,
            layout,
            new OrbitStrip(R(periodMin, 1), stripEclipse, stripContacts),
            calc,
            checks,
            comments);

        var state = new EvaluationState(
            m, d, altitudeKm, inclinationDeg, periodS, eclipse, ballistic, wetKg, dryKg, tankKg, neededKg, ispS,
            maintenancePerYear, generationW, constantW, instrumentW, radioW, batteryWh, usableWh,
            generatedGbPerDay, downlinkGbPerDay, storageGb, contactsPerDay, contactMinutes, operationDays, rawLifetime,
            launchMonth, linkSites, rateKbps, radioFactor, degPerOrbit, insertionPeriodS);

        return (evaluation, state);
    }

    /// <summary>
    /// Вантажопідйомність на орбіту: з каталогу носія; для довільної орбіти — лінійна
    /// інтерполяція за висотою між орбітами каталогу (план 2.9). 0 — носій туди не виводить.
    /// </summary>
    public static double LaunchCapacity(Launch launch, string? orbitId, double altitudeKm, IReadOnlyList<Orbit> orbits, bool isIss)
    {
        if (isIss)
            return launch.CapacityKg.GetValueOrDefault("iss");
        if (orbitId is not null)
            return launch.CapacityKg.GetValueOrDefault(orbitId);

        var points = launch.CapacityKg
            .Select(kv => (Altitude: orbits.FirstOrDefault(o => o.Id == kv.Key)?.AltitudeKm, Capacity: kv.Value))
            .Where(p => p.Altitude is not null)
            .Select(p => (Altitude: p.Altitude!.Value, p.Capacity))
            .OrderBy(p => p.Altitude)
            .ToList();
        if (points.Count == 0 || altitudeKm > points[^1].Altitude)
            return 0;
        if (altitudeKm <= points[0].Altitude)
            return points[0].Capacity;
        for (var k = 1; k < points.Count; k++)
        {
            if (altitudeKm > points[k].Altitude)
                continue;
            var (a0, c0) = points[k - 1];
            var (a1, c1) = points[k];
            return Math.Round(c0 + (c1 - c0) * (altitudeKm - a0) / (a1 - a0), 1);
        }

        return 0;
    }

    /// <summary>Найнижча кругова висота, куди можна знизитися з h₀, маючи Δv (Гоман, N10).</summary>
    private static double LowestReachableAltitude(double fromKm, double targetKm, double availableDeltaVms)
    {
        if (availableDeltaVms <= 0)
            return fromKm;
        double lo = targetKm, hi = fromKm;
        for (var k = 0; k < 40; k++)
        {
            var mid = (lo + hi) / 2;
            var (a1, a2) = OrbitMath.Hohmann(OrbitMath.RadiusKm(fromKm), OrbitMath.RadiusKm(mid));
            if ((a1 + a2) * 1000 <= availableDeltaVms) hi = mid; else lo = mid;
        }

        return hi;
    }

    /// <summary>Сеанси на витку з найдовшим зв'язком за добу; час — від початку витка.</summary>
    private static IReadOnlyList<StripContact> BestOrbitContacts(IReadOnlyList<ContactWindow> windows, double periodS)
    {
        if (windows.Count == 0)
            return [];
        var byOrbit = windows
            .SelectMany(w => SplitByOrbit(w, periodS))
            .GroupBy(x => x.Orbit)
            .OrderByDescending(g => g.Sum(x => x.EndS - x.StartS))
            .First();
        return byOrbit
            .OrderBy(x => x.StartS)
            .Select(x => new StripContact(x.StationId, R((x.StartS - x.Orbit * periodS) / 60, 1), R((x.EndS - x.Orbit * periodS) / 60, 1)))
            .ToList();
    }

    private static IEnumerable<(int Orbit, string StationId, double StartS, double EndS)> SplitByOrbit(ContactWindow w, double periodS)
    {
        var start = w.StartS;
        while (start < w.EndS)
        {
            var orbit = (int)Math.Floor(start / periodS);
            var end = Math.Min(w.EndS, (orbit + 1) * periodS);
            yield return (orbit, w.StationId, start, end);
            start = end;
        }
    }

    private static int BusRank(string? size) => size switch { "small" => 0, "medium" => 1, "large" => 2, _ => 0 };

    private static CalcValue V(string name, double value, string unit) => new(name, R(value, 4), unit);

    private static CalcSheet Sheet(string code, string resource, string formula, IReadOnlyList<CalcValue> inputs, CalcValue result, Params summary, Source source) =>
        new(code, resource, formula, inputs, result, Message.Of(code + ".summary", summary), source);

    public static double R(double value, int digits)
    {
        if (double.IsInfinity(value) || double.IsNaN(value))
            return value > 0 ? 1e9 : 0;
        return Math.Round(value, digits, MidpointRounding.AwayFromZero);
    }
}
