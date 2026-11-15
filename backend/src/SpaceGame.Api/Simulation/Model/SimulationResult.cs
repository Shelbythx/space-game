using SpaceGame.Api.Catalogs;

namespace SpaceGame.Api.Simulation.Model;

// Відповідь POST /api/simulate (docs/api.md, docs/openapi.yaml «SimulationResult»).

public sealed record SimulationRequest(Design Design, long? Seed);

public sealed record Timeline(
    int StepDays,
    IReadOnlyList<int> Days,
    IReadOnlyList<double> BatteryMinPct,
    IReadOnlyList<double> DataStoredGb,
    IReadOnlyList<double> DataDeliveredGb,
    IReadOnlyList<double> AltitudeKm,
    IReadOnlyList<double> PropellantKg);

public sealed record TrackPoint(double LatDeg, double LonDeg, bool Sunlit);

public sealed record GroundTrack(int StepSeconds, int OrbitCount, IReadOnlyList<TrackPoint> Points);

public sealed record ContactSummary(string StationId, double ContactsPerDay, double MinutesPerDay, double? VisibilityRadiusDeg);

public sealed record RendezvousProfile(
    double InitialPhaseAngleDeg,
    double StepHours,
    IReadOnlyList<double> Hours,
    IReadOnlyList<double> PhaseAngleDeg,
    IReadOnlyList<double> AltitudeKm,
    IReadOnlyList<double> PropellantKg,
    double? DockedAtHours);

/// <summary>Подія місії; <c>Source</c> — SeededSource або DonkiSource.</summary>
public sealed record MissionEvent(int Day, string Type, string Segment, Message Message, object Source);

public sealed record DonkiEventSource(
    string Kind,
    string? EventId,
    DateTime? ObservedAt,
    double? Kp,
    string PeriodStart,
    string PeriodEnd);

public sealed record SeededEventSource(string Kind)
{
    public static readonly SeededEventSource Instance = new("seeded");
}

public sealed record Score(int Value, string Formula);

public sealed record Scores(Score MissionSuccess, Score ScienceValue, Score ResourceEfficiency, Score DecisionQuality);

public sealed record LimitResult(string Status, string Code, Params Params);

public sealed record ChainLink(
    string Kind,
    string Code,
    Params Params,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    string? Formula = null);

public sealed record SegmentReport(string Segment, string Status, IReadOnlyList<ChainLink> Chain);

public sealed record Bottleneck(string Resource, string Code, Params Params);

public sealed record Report(
    bool Success,
    Scores Scores,
    IReadOnlyList<LimitResult> Limits,
    IReadOnlyList<SegmentReport> Segments,
    Bottleneck Bottleneck,
    References.Comparison? Comparison);

public sealed record SimulationResult(
    long Seed,
    Evaluation Evaluation,
    Timeline Timeline,
    GroundTrack GroundTrack,
    IReadOnlyList<ContactSummary> Contacts,
    RendezvousProfile? Rendezvous,
    IReadOnlyList<MissionEvent> Events,
    Report Report);

/// <summary>Магнітна буря для симуляції (D83): день місії, Kp і дані DONKI.</summary>
public sealed record Storm(int Day, double Kp, string EventId, DateTime ObservedAt);

/// <summary>
/// Космічна погода для симуляції: бурі з DONKI за історичний період, обраний seed (задача 021).
/// <c>Available = false</c> — DONKI недоступний і кешу немає (подія spaceWeatherUnavailable).
/// </summary>
public sealed record SpaceWeatherData(IReadOnlyList<Storm> Storms, bool Available, DateOnly PeriodStart, DateOnly PeriodEnd)
{
    public static SpaceWeatherData None(DateOnly start) => new([], true, start, start.AddYears(1).AddDays(-1));
}
