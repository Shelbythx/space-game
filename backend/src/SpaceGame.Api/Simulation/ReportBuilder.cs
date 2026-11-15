using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;
using SpaceGame.Api.Simulation.Physics;

namespace SpaceGame.Api.Simulation;

/// <summary>
/// Звіт за чотирма сегментами NASA (D25): ланцюжки «рішення → фізика → наслідок» (D49),
/// вузьке місце, чотири бали (D82, план розділ 3).
/// </summary>
public static class ReportBuilder
{
    public static readonly string[] SegmentOrder = ["launch", "space", "ground", "user"];

    // Формули балів — рядки для показу поруч із балом (docs/api.md, Report.scores).
    public const string MissionSuccessFormula = "100 × Σ(wᵢ × sᵢ) / Σwᵢ";
    public const string ScienceDataFormula = "100 × min(1, Σ(dataᵢ × valueᵢ) / goal)";
    public const string ScienceCargoFormula = "100 × min(1, Σ(cargoᵢ × valueᵢ) / goal)";
    public const string EfficiencyFormula = "mean over 6 resources of score(1 − used / limit)";
    public const string DecisionFormula = "100 − 15 × unresolved warnings − 30 × failed checks";

    /// <summary>Ваги цінності (план розділ 3) — 🎲 ігрова оцінка (D51).</summary>
    public static double ValueWeight(string value) => value switch
    {
        "low" => 0.25,
        "medium" => 0.5,
        "high" => 1,
        "highest" => 1.2,
        _ => 0,
    };

    /// <summary>
    /// Мінімальний запас M за ресурсом: маса 15 %, енергія 25 % — GSFC-STD-1000 Rev I,
    /// табл. 1.06-1, с. 10 (Pre-Phase A); решта 5 % — 🎲.
    /// </summary>
    public static double MinimumMargin(string resource) => resource switch
    {
        "mass" => 0.15,
        "power" => 0.25,
        _ => 0.05,
    };

    /// <summary>Оцінка запасу m (план розділ 3): ширина смуги «добре» 25 п. п. — 🎲.</summary>
    public static double MarginScore(double m, double minimum)
    {
        if (m < 0) return 0;
        if (m < minimum) return 60;
        if (m <= minimum + 0.25) return 100;
        var top = Math.Min(1, m);
        return 100 - 60 * (top - (minimum + 0.25)) / (1 - (minimum + 0.25));
    }

    public static Report Build(EvaluationState s, Evaluation e, Simulator.Outcome o, IReadOnlyList<Instrument> instruments)
    {
        var m = s.Mission;
        var isIss = m.Kind == MissionKinds.Iss;
        var segments = new List<SegmentReport>();

        foreach (var seg in SegmentOrder)
        {
            var status = Worst(e.Checks.Where(c => c.Segment == seg && !(seg == "user")).Select(c => c.Status));
            if (seg == "space" && (o.DebrisLoss || (o.ReentryDay is { } rd && rd < s.OperationDays - 1)))
                status = "fail";
            if (seg == "ground" && o.LostGb > 0)
                status = Worst([status, "warn"]);
            if (seg == "user")
                status = UserStatus(s, e, o);
            segments.Add(new SegmentReport(seg, status, Chain(seg, s, e, o, instruments)));
        }

        var limits = e.Checks.Where(c => c.Segment == "mission").Select(c => new LimitResult(c.Status, c.Code, c.Params)).ToList();
        var success = segments.All(x => x.Status != "fail") && limits.All(x => x.Status != "fail");

        // ── Бали (D82) ──
        double S(string status) => status switch { "ok" => 1, "warn" => 0.5, _ => 0 };
        var weighted = segments.Sum(x => 20 * S(x.Status)) + limits.Sum(x => 10 * S(x.Status));
        var missionSuccess = (int)Math.Round(100 * weighted / (20 * segments.Count + 10 * limits.Count));

        double science;
        if (isIss)
        {
            var goal = m.Goal.CargoKg ?? 1;
            var value = o.Docked
                ? s.Design.Cargo!.Sum(x => x.MassKg * ValueWeight(m.Catalogs.CargoCategories.Single(k => k.Id == x.CategoryId).Value))
                : 0;
            science = 100 * Math.Min(1, value / goal);
        }
        else
        {
            var goal = m.Goal.DataGb ?? 1;
            var value = instruments.Sum(i => o.DeliveredByInstrument.GetValueOrDefault(i.Id) * ValueWeight(i.Value));
            science = 100 * Math.Min(1, value / goal);
        }

        var margins = Margins(s, e, o);
        var efficiency = margins.Average(x => MarginScore(x.Margin, MinimumMargin(x.Resource)));
        var warnComments = e.Comments.Count(c => c.Severity == "warn");
        var failChecks = e.Checks.Count(c => c.Status == "fail");
        var decision = Math.Max(0, 100 - 15 * warnComments - 30 * failChecks);

        var bottleneck = margins.OrderBy(x => x.Margin).First();

        return new Report(
            success,
            new Scores(
                new Score(missionSuccess, MissionSuccessFormula),
                new Score((int)Math.Round(science), isIss ? ScienceCargoFormula : ScienceDataFormula),
                new Score((int)Math.Round(efficiency), EfficiencyFormula),
                new Score(decision, DecisionFormula)),
            limits,
            segments,
            new Bottleneck(bottleneck.Resource, "bottleneck." + bottleneck.Resource, bottleneck.Params),
            Comparison: null);
    }

    private static string UserStatus(EvaluationState s, Evaluation e, Simulator.Outcome o)
    {
        var m = s.Mission;
        if (m.Kind == MissionKinds.Iss)
        {
            var deadlineH = (m.Goal.DockingDeadlineDays ?? 5) * 24;
            var cargoOk = e.Resources.Cargo!.LoadedKg >= (m.Goal.CargoKg ?? 0);
            if (!o.Docked || o.DockedAtHours > deadlineH || !cargoOk)
                return "fail";
            return e.Resources.Cargo.SciencePct < (m.Goal.ScienceCargoMinPct ?? 0) ? "warn" : "ok";
        }

        return o.DeliveredGb >= (m.Goal.DataGb ?? 0) ? "ok" : "fail";
    }

    private sealed record ResourceMargin(string Resource, double Margin, Params Params);

    /// <summary>Запас m = 1 − використано/ліміт для шести ресурсів (план розділ 3).</summary>
    private static List<ResourceMargin> Margins(EvaluationState s, Evaluation e, Simulator.Outcome o)
    {
        var r = e.Resources;
        var m = s.Mission;
        var isIss = m.Kind == MissionKinds.Iss;
        double Ratio(double used, double limit) => limit <= 0 ? -1 : 1 - used / limit;

        var list = new List<ResourceMargin>
        {
            new("mass", Ratio(r.Mass.WithReserveKg, r.Mass.LaunchCapacityKg),
                new Params { ["usedKg"] = r.Mass.WithReserveKg, ["limitKg"] = r.Mass.LaunchCapacityKg }),
            new("power", Ratio(r.Power.AverageConsumptionW, r.Power.AverageGenerationW),
                new Params { ["usedW"] = r.Power.AverageConsumptionW, ["limitW"] = r.Power.AverageGenerationW }),
            new("budget", Ratio(r.Budget.UsedK, r.Budget.LimitK),
                new Params { ["usedK"] = r.Budget.UsedK, ["limitK"] = r.Budget.LimitK }),
            new("time", Ratio(r.Time.LaunchMonth, r.Time.DeadlineMonth),
                new Params { ["usedMonths"] = r.Time.LaunchMonth, ["limitMonths"] = r.Time.DeadlineMonth }),
        };

        if (isIss)
        {
            var goal = m.Goal.CargoKg ?? 0;
            list.Add(new("data", Ratio(goal, r.Cargo!.LoadedKg), new Params { ["usedKg"] = goal, ["limitKg"] = r.Cargo.LoadedKg }));
            var deadlineH = (m.Goal.DockingDeadlineDays ?? 5) * 24;
            var docked = o.DockedAtHours ?? double.PositiveInfinity;
            list.Add(new("comms", Ratio(docked, deadlineH),
                new Params { ["usedHours"] = Evaluator.R(docked, 1), ["limitHours"] = deadlineH }));
        }
        else
        {
            var goal = m.Goal.DataGb ?? 0;
            list.Add(new("data", Ratio(goal, o.DeliveredGb),
                new Params { ["usedGb"] = goal, ["limitGb"] = Evaluator.R(o.DeliveredGb, 1) }));
            var neededPerDay = s.OperationDays > 0 ? goal / s.OperationDays : 0;
            list.Add(new("comms", Ratio(neededPerDay, r.Data!.DownlinkGbPerDay),
                new Params { ["usedGbPerDay"] = Evaluator.R(neededPerDay, 3), ["limitGbPerDay"] = r.Data.DownlinkGbPerDay }));
        }

        return list;
    }

    private static string Worst(IEnumerable<string> statuses)
    {
        var all = statuses.ToList();
        return all.Contains("fail") ? "fail" : all.Contains("warn") ? "warn" : "ok";
    }

    private static ChainLink Decision(string code, Params p) => new("decision", code, p);
    private static ChainLink Physics(string code, Params p, string formula) => new("physics", code, p, formula);
    private static ChainLink Consequence(string code, Params p) => new("consequence", code, p);

    /// <summary>Ланцюжок сегмента з числами (критерій 005: кожен невиконаний сегмент має ланцюжок).</summary>
    private static List<ChainLink> Chain(string segment, EvaluationState s, Evaluation e, Simulator.Outcome o, IReadOnlyList<Instrument> instruments)
    {
        var d = s.Design;
        var m = s.Mission;
        var r = e.Resources;
        var isIss = m.Kind == MissionKinds.Iss;
        var chain = new List<ChainLink>();

        switch (segment)
        {
            case "launch":
                if (isIss)
                {
                    var site = m.Catalogs.LaunchSites.Single(x => x.Id == d.LaunchSiteId);
                    chain.Add(Decision("chain.decision.launchSite", new Params { ["latitudeDeg"] = site.LatitudeDeg }));
                    chain.Add(Physics("chain.physics.earthRotation",
                        new Params { ["bonusMs"] = Evaluator.R(OrbitMath.EarthRotationSpeedMs(site.LatitudeDeg), 0) }, "465·cos φ"));
                    chain.Add(Physics("chain.physics.planeChange",
                        new Params
                        {
                            ["deltaInclinationDeg"] = Evaluator.R(Math.Max(0, Math.Abs(site.LatitudeDeg) - s.InclinationDeg), 2),
                            ["deltaVms"] = e.Rendezvous!.PlaneChangeDeltaVms,
                        }, "Δv = 2v·sin(Δi/2)"));
                }
                else
                {
                    chain.Add(Decision("chain.decision.orbit", new Params { ["altitudeKm"] = e.Orbit.AltitudeKm, ["inclinationDeg"] = e.Orbit.InclinationDeg }));
                    chain.Add(Physics("chain.physics.orbit", new Params { ["periodMin"] = e.Orbit.PeriodMin, ["speedKmS"] = e.Orbit.SpeedKmS }, "T = 2π√(r³/μ)"));
                }

                break;

            case "space":
                var battery = m.Catalogs.Parts.Single(p => p.Id == d.Parts.Battery);
                chain.Add(Decision("chain.decision.battery", new Params { ["capacityWh"] = battery.Specs.CapacityWh ?? 0 }));
                chain.Add(Physics("chain.physics.eclipse", new Params { ["eclipseFraction"] = e.Orbit.EclipseFraction }, "f = (1/π)·arccos(√(h² + 2Rh) / ((R + h)·cos β))"));
                chain.Add(Physics("chain.physics.power",
                    new Params { ["generationW"] = r.Power.AverageGenerationW, ["consumptionW"] = r.Power.AverageConsumptionW }, "E_gen = P_gen·T·(1 − f)"));
                var prop = m.Catalogs.Parts.Single(p => p.Id == d.Parts.Propulsion);
                chain.Add(Decision("chain.decision.propulsion", new Params { ["ispS"] = prop.Specs.IspS ?? 0, ["propellantKg"] = prop.Specs.PropellantKg ?? 0 }));
                if (!isIss)
                {
                    chain.Add(Physics("chain.physics.drag",
                        new Params
                        {
                            ["densityKgM3"] = Atmosphere.DensityKgM3(s.AltitudeKm),
                            ["altitudeLossKmPerYear"] = Evaluator.R(Drag.DecayKmPerYear(s.AltitudeKm, s.BallisticFactor), 3),
                        }, "F = ½·ρ·v²·C_d·A"));
                }

                chain.Add(Physics("chain.physics.rocketEquation",
                    new Params { ["deltaVms"] = r.Propellant.DeltaVms, ["propellantKg"] = r.Propellant.NeededKg }, "Δv = Isp·g₀·ln(m₀/m₁)"));
                if (o.ReentryDay is { } day)
                    chain.Add(Consequence("chain.consequence.reentry", new Params { ["day"] = day }));
                else if (e.Orbit.DisposalYears is { } dy)
                    chain.Add(Consequence("chain.consequence.disposal", new Params { ["disposalYears"] = dy, ["limitYears"] = Evaluator.DisposalLimitYears }));
                break;

            case "ground":
                var radio = m.Catalogs.Parts.Single(p => p.Id == d.Parts.Radio);
                chain.Add(Decision("chain.decision.radio", new Params { ["rateKbps"] = radio.Specs.RateKbps ?? 0 }));
                if (isIss)
                {
                    chain.Add(Decision("chain.decision.relay", new Params { ["relay"] = d.Relay == true ? 1 : 0 }));
                    if (o.DockedAtHours is { } h)
                        chain.Add(Consequence("chain.consequence.docking", new Params { ["dockedAtHours"] = h }));
                }
                else
                {
                    var distance = e.Calc.FirstOrDefault(c => c.Code == "calc.data.downlink")?.Inputs.FirstOrDefault(i => i.Name == "d")?.Value ?? 0;
                    chain.Add(Physics("chain.physics.linkBudget",
                        new Params { ["distanceKm"] = Evaluator.R(distance, 0), ["rateKbps"] = Evaluator.R(Contacts.RateKbps(radio.Specs.RateKbps ?? 0, distance), 1) },
                        "rate = R·(1000 km / d)²"));
                    chain.Add(Physics("chain.physics.downlink",
                        new Params { ["minutesPerDay"] = r.Comms.ContactMinutesPerDay, ["gbPerDay"] = r.Data!.DownlinkGbPerDay }, "data = rate × contact time"));
                    chain.Add(Physics("chain.physics.storage", new Params { ["storageGb"] = r.Data.StorageGb, ["lostGb"] = Evaluator.R(o.LostGb, 1) }, "—"));
                    if (o.LostGb > 0)
                        chain.Add(Consequence("chain.consequence.dataLost", new Params { ["lostGb"] = Evaluator.R(o.LostGb, 1) }));
                }

                break;

            case "user":
                if (isIss)
                {
                    chain.Add(Decision("chain.decision.insertion", new Params { ["insertionAltitudeKm"] = d.InsertionAltitudeKm ?? 0 }));
                    var (h1, h2) = OrbitMath.Hohmann(OrbitMath.RadiusKm(d.InsertionAltitudeKm ?? 0), OrbitMath.RadiusKm(s.AltitudeKm));
                    chain.Add(Physics("chain.physics.hohmann",
                        new Params { ["deltaV1ms"] = Evaluator.R(h1 * 1000, 1), ["deltaV2ms"] = Evaluator.R(h2 * 1000, 1) }, "Δv₁ = √(μ/r₁)·(√(2r₂/(r₁+r₂)) − 1)"));
                    chain.Add(Physics("chain.physics.phasing",
                        new Params { ["degPerOrbit"] = Evaluator.R(s.RendezvousDegPerOrbit, 1), ["phasingDays"] = e.Rendezvous!.PhasingDays }, "Δθ = (n₁ − n₂)·T₁"));
                    if (o.DockedAtHours is { } h)
                        chain.Add(Consequence("chain.consequence.docking", new Params { ["dockedAtHours"] = h }));
                    chain.Add(Consequence("chain.consequence.cargoDelivered",
                        new Params { ["cargoKg"] = o.Docked ? e.Resources.Cargo!.LoadedKg : 0, ["goalKg"] = m.Goal.CargoKg ?? 0 }));
                }
                else
                {
                    chain.Add(Decision("chain.decision.instrument", new Params { ["dataRateKbps"] = instruments.Sum(i => i.DataRateKbps) }));
                    chain.Add(Physics("chain.physics.downlink",
                        new Params { ["minutesPerDay"] = r.Comms.ContactMinutesPerDay, ["gbPerDay"] = r.Data!.DownlinkGbPerDay }, "data = rate × contact time"));
                    chain.Add(Consequence("chain.consequence.goal",
                        new Params { ["deliveredGb"] = Evaluator.R(o.DeliveredGb, 1), ["goalGb"] = m.Goal.DataGb ?? 0 }));
                }

                break;
        }

        return chain;
    }
}
