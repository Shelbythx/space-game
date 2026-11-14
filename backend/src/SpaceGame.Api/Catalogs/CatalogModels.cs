using System.Text.Json.Serialization;

namespace SpaceGame.Api.Catalogs;

// Типи каталогів за контрактом v2 (docs/api.md, «GET /api/missions/{id}»).
// Рядкові переліки — у нижньому регістрі, як у контракті.

/// <summary>Джерело числа (D51): nasa · nasaRetold · estimate · calculated.</summary>
public sealed record Source(string Kind, string? Note = null, string? Url = null)
{
    public static Source Nasa(string note, string? url = null) => new("nasa", note, url);
    public static Source NasaRetold(string note, string? url = null) => new("nasaRetold", note, url);
    public static Source Estimate(string note) => new("estimate", note);
    public static Source Calculated(string note) => new("calculated", note);
}

public sealed record MissionSummary(string Id, string Kind, string TitleCode, bool Available);

public sealed record Mission(
    string Id,
    string Kind,
    string TitleCode,
    string BriefingCode,
    MissionGoal Goal,
    MissionLimits Limits,
    MissionTiming Timing,
    MissionCatalogs Catalogs,
    IReadOnlyList<Preset> Presets)
{
    public MissionSummary ToSummary() => new(Id, Kind, TitleCode, Available: true);
}

/// <summary>Ціль: DataGoal (tutorial, orbit) або CargoGoal (iss); відсутні поля не пишуться.</summary>
public sealed record MissionGoal
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? DataGb { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public int? OperationMonths { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? CargoKg { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? ScienceCargoMinPct { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? DockingDeadlineDays { get; init; }

    public static MissionGoal Data(double dataGb, int operationMonths) =>
        new() { DataGb = dataGb, OperationMonths = operationMonths };

    public static MissionGoal Cargo(double cargoKg, double scienceCargoMinPct, double dockingDeadlineDays) =>
        new() { CargoKg = cargoKg, ScienceCargoMinPct = scienceCargoMinPct, DockingDeadlineDays = dockingDeadlineDays };
}

public sealed record MissionLimits(double BudgetK, int LaunchDeadlineMonth, double MassReserveRecommendedPct);

public sealed record BuildMonths(int Basic, int Medium, int Best);

public sealed record MissionTiming(
    BuildMonths BuildMonths,
    int IntegrationMonths,
    IReadOnlyList<int> RideshareMonths,
    IReadOnlyDictionary<string, int> LaunchLeadMonths);

public sealed record MissionCatalogs(
    IReadOnlyList<Orbit> Orbits,
    IReadOnlyList<Launch> Launches,
    IReadOnlyList<Part> Parts,
    IReadOnlyList<Instrument> Instruments,
    IReadOnlyList<GroundStation> GroundStations,
    IReadOnlyList<LaunchSite> LaunchSites,
    IReadOnlyList<CargoCategory> CargoCategories);

public sealed record Orbit(string Id, string NameCode, double AltitudeKm, double InclinationDeg, string? EpochDate, Source Source);

public sealed record Launch(
    string Id,
    string NameCode,
    double PriceK,
    IReadOnlyDictionary<string, double> CapacityKg,
    string? FixedOrbitId,
    string MaxBusSize,
    Source Source);

public sealed record Requirement(string Category, string PartId);

/// <summary>Характеристики деталі; є лише поля її категорії (docs/api.md, таблиця категорій).</summary>
public sealed record PartSpecs
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? MaxMassKg { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public int? Slots { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? DragAreaM2 { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? BusSize { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? PowerW { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? CapacityWh { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? RateKbps { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? Band { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? StorageGb { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? AccuracyDeg { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? IspS { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? ThrustN { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? PropellantKg { get; init; }
}

public sealed record Part(
    string Id,
    string Category,
    string Tier,
    string NameCode,
    double MassKg,
    double PriceK,
    double ConsumptionW,
    PartSpecs Specs,
    IReadOnlyList<Requirement> Requires,
    Source Source);

public sealed record Instrument(
    string Id,
    string NameCode,
    string Tier,
    double MassKg,
    double PriceK,
    double ConsumptionW,
    double DataRateKbps,
    string Value,
    IReadOnlyList<Requirement> Requires,
    Source Source);

public sealed record GroundStation(
    string Id,
    string NameCode,
    double LatitudeDeg,
    double LongitudeDeg,
    IReadOnlyList<string> Bands,
    double PriceK,
    Source Source);

public sealed record LaunchSite(string Id, string NameCode, double LatitudeDeg, double LongitudeDeg, Source Source);

public sealed record CargoCategory(string Id, string NameCode, string Value, double TypicalMassKg, Source Source);

public sealed record Preset(string Id, string NameCode, Design Design);

public static class PartCategories
{
    public const string Bus = "bus";
    public const string Solar = "solar";
    public const string Battery = "battery";
    public const string Radio = "radio";
    public const string Computer = "computer";
    public const string Adcs = "adcs";
    public const string Propulsion = "propulsion";

    public static readonly IReadOnlyList<string> All = [Bus, Solar, Battery, Radio, Computer, Adcs, Propulsion];
}

public static class MissionKinds
{
    public const string Tutorial = "tutorial";
    public const string Orbit = "orbit";
    public const string Iss = "iss";
}
