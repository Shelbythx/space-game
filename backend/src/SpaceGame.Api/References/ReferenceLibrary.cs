using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;
using SpaceGame.Api.Simulation.Physics;

namespace SpaceGame.Api.References;

// Модуль References (задача 023, D85): бібліотека схожих місій і поле report.comparison.
// Записи — два блоки JSON з docs/reference-missions.md (задача 019), вбудовані в збірку
// поруч із кодом, як і каталоги (D102). Числа еталонних проєктів (`modeled`) рахує наша ж
// симуляція при першому запиті до місії.

/// <summary>Запис бібліотеки у форматі docs/reference-missions.md.</summary>
public sealed record ReferenceRecord
{
    public required string Id { get; init; }
    public required string Kind { get; init; }
    public required string NameCode { get; init; }
    public string? GameMissionId { get; init; }
    public double? AltitudeKm { get; init; }
    public double? InclinationDeg { get; init; }
    public double? MassKg { get; init; }
    public double? DataGbPerDay { get; init; }
    public double? CargoKg { get; init; }
    public double? ScienceCargoPct { get; init; }
    public IReadOnlyList<string>? Instruments { get; init; }
    public Source? Source { get; init; }
    public Design? Design { get; init; }
}

/// <summary>Числа місії для порівняння; <c>null</c> — числа немає.</summary>
public sealed record ReferenceMetrics(
    double? AltitudeKm,
    double? InclinationDeg,
    double? MassKg,
    double? DataGb,
    double? CargoKg,
    double? SciencePct,
    double? BudgetK,
    IReadOnlyList<string>? Instruments);

/// <summary>Схожа місія у звіті (docs/api.md, <c>Report.comparison</c>).</summary>
public sealed record Comparison(
    string Kind,
    string MissionId,
    string NameCode,
    IReadOnlyDictionary<string, double> Deltas,
    Source? Source);

/// <summary>Кандидат бібліотеки з порахованими числами.</summary>
public sealed record ReferenceCandidate(ReferenceRecord Record, ReferenceMetrics Metrics);

public static class ReferenceLibrary
{
    /// <summary>Seed, з яким прораховано еталонні проєкти: числа однакові для всіх гравців (D65).</summary>
    public const long ModeledSeed = 1;

    /// <summary>
    /// Штраф за ознаку, якої немає в одній із місій (🎲 ігрова оцінка, D103): більший за
    /// типову різницю, щоб запис із самою орбітою не вигравав у повного.
    /// </summary>
    public const double MissingPenalty = 1.0;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static readonly Lazy<IReadOnlyList<ReferenceRecord>> Records = new(Load);

    private static readonly ConcurrentDictionary<string, Lazy<IReadOnlyList<ReferenceCandidate>>> Candidates = new(StringComparer.Ordinal);

    public static IReadOnlyList<ReferenceRecord> All => Records.Value;

    /// <summary>Кандидати для місії гри: справжні й еталонні, з числами.</summary>
    public static IReadOnlyList<ReferenceCandidate> For(Mission mission) =>
        Candidates.GetOrAdd(mission.Id, _ => new Lazy<IReadOnlyList<ReferenceCandidate>>(() => Build(mission))).Value;

    /// <summary>Найближча схожа місія для проєкту гравця або <c>null</c>, якщо кандидатів немає.</summary>
    public static Comparison? Closest(Mission mission, ReferenceMetrics player)
    {
        var best = For(mission)
            .Select(c => (Candidate: c, Distance: Distance(mission, player, c.Metrics)))
            .OrderBy(x => x.Distance)
            .ThenBy(x => x.Candidate.Record.Kind == "real" ? 0 : 1)
            .Select(x => x.Candidate)
            .FirstOrDefault();
        if (best is null)
            return null;

        var r = best.Record;
        return new Comparison(r.Kind, r.Id, r.NameCode, Deltas(mission, player, best.Metrics, r.Kind),
            r.Kind == "real" ? r.Source : null);
    }

    /// <summary>Числа проєкту після симуляції.</summary>
    public static ReferenceMetrics Metrics(Design design, Mission mission, Evaluation e, double deliveredGb) =>
        mission.Kind == MissionKinds.Iss
            ? new ReferenceMetrics(null, e.Orbit.InclinationDeg, e.Resources.Mass.UsedKg, null,
                e.Resources.Cargo?.LoadedKg, e.Resources.Cargo?.SciencePct, e.Resources.Budget.UsedK, design.InstrumentIds)
            : new ReferenceMetrics(e.Orbit.AltitudeKm, e.Orbit.InclinationDeg, e.Resources.Mass.UsedKg, deliveredGb,
                null, null, e.Resources.Budget.UsedK, design.InstrumentIds);

    /// <summary>
    /// Відстань між проєктом і місією: середнє за ознаками місії (D85 — орбіта, маса, корисне
    /// навантаження). Висота, маса, вантаж і дані — у логарифмічній шкалі, бо місії різняться
    /// на порядки (5 кг CubeSat і 3 т Aqua); нахил — частка від 90°; прилади — відстань
    /// Жаккара. Ваги однакові — 🎲 ігрова оцінка (D103).
    /// </summary>
    public static double Distance(Mission mission, ReferenceMetrics a, ReferenceMetrics b)
    {
        var terms = new List<double>();
        if (mission.Kind == MissionKinds.Iss)
        {
            terms.Add(LogDiff(a.CargoKg, b.CargoKg));
            terms.Add(a.SciencePct is { } x && b.SciencePct is { } y ? Math.Abs(x - y) / 100 : MissingPenalty);
            // Бюджет є лише в еталонних проєктах; справжню місію за ним не порівнюємо.
            if (b.BudgetK is not null)
                terms.Add(LogDiff(a.BudgetK, b.BudgetK));
        }
        else
        {
            terms.Add(LogDiff(a.AltitudeKm, b.AltitudeKm));
            terms.Add(a.InclinationDeg is { } x && b.InclinationDeg is { } y ? Math.Abs(x - y) / 90 : MissingPenalty);
            terms.Add(LogDiff(a.MassKg, b.MassKg));
            terms.Add(a.Instruments is { } ia && b.Instruments is { } ib ? Jaccard(ia, ib) : MissingPenalty);
        }

        return terms.Average();
    }

    private static double LogDiff(double? a, double? b) =>
        a is > 0 && b is > 0 ? Math.Abs(Math.Log(a.Value / b.Value)) : MissingPenalty;

    private static double Jaccard(IReadOnlyList<string> a, IReadOnlyList<string> b)
    {
        var union = a.Union(b).Count();
        return union == 0 ? 0 : 1 - (double)a.Intersect(b).Count() / union;
    }

    private static IReadOnlyDictionary<string, double> Deltas(Mission mission, ReferenceMetrics p, ReferenceMetrics r, string kind)
    {
        var d = new Dictionary<string, double>(StringComparer.Ordinal);

        void Add(string key, double? a, double? b)
        {
            if (a is { } x && b is { } y)
                d[key] = Math.Round(x - y, 1);
        }

        if (mission.Kind == MissionKinds.Iss)
        {
            Add("cargoKg", p.CargoKg, r.CargoKg);
        }
        else
        {
            Add("altitudeKm", p.AltitudeKm, r.AltitudeKm);
            Add("inclinationDeg", p.InclinationDeg, r.InclinationDeg);
            Add("massKg", p.MassKg, r.MassKg);
            Add("dataGb", p.DataGb, r.DataGb);
        }

        if (kind == "modeled")
            Add("budgetK", p.BudgetK, r.BudgetK);
        return d;
    }

    private static IReadOnlyList<ReferenceCandidate> Build(Mission mission)
    {
        var days = (mission.Goal.OperationMonths ?? 0) * Constants.DaysPerMonth;
        var result = new List<ReferenceCandidate>();
        foreach (var r in All)
        {
            if (r.Kind == "real" && r.GameMissionId == mission.Id)
            {
                result.Add(new ReferenceCandidate(r, new ReferenceMetrics(
                    r.AltitudeKm, r.InclinationDeg, r.MassKg,
                    r.DataGbPerDay is { } perDay && days > 0 ? perDay * days : null,
                    r.CargoKg, r.ScienceCargoPct, null, r.Instruments)));
            }
            else if (r.Kind == "modeled" && r.Design?.MissionId == mission.Id)
            {
                var sim = Simulator.Simulate(r.Design, mission, ModeledSeed,
                    SpaceWeatherData.None(DateOnly.FromDateTime(Simulator.BaseEpoch)), withComparison: false);
                var delivered = sim.Timeline.DataDeliveredGb.Count > 0 ? sim.Timeline.DataDeliveredGb[^1] : 0;
                result.Add(new ReferenceCandidate(r, Metrics(r.Design, mission, sim.Evaluation, delivered)));
            }
        }

        return result;
    }

    private static IReadOnlyList<ReferenceRecord> Load()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var list = new List<ReferenceRecord>();
        foreach (var name in new[] { "reference-missions-real.json", "reference-missions-modeled.json" })
        {
            var resource = assembly.GetManifestResourceNames().Single(n => n.EndsWith(name, StringComparison.Ordinal));
            using var stream = assembly.GetManifestResourceStream(resource)!;
            list.AddRange(JsonSerializer.Deserialize<List<ReferenceRecord>>(stream, Json)!);
        }

        return list;
    }
}
