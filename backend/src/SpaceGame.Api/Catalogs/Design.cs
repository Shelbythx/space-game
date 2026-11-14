using System.Text.Json.Serialization;

namespace SpaceGame.Api.Catalogs;

// Проєкт місії — `Design` (docs/api.md). Один і той самий об'єкт у presets, evaluate,
// simulate й attempts. Поля лише для iss і лише для advanced не пишуться, якщо їх немає.

public sealed record OrbitChoice
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? PresetId { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? AltitudeKm { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? InclinationDeg { get; init; }

    public static OrbitChoice Preset(string id) => new() { PresetId = id };
}

public sealed record DesignParts(
    string Bus,
    string Solar,
    string Battery,
    string Radio,
    string Computer,
    string Adcs,
    string Propulsion)
{
    /// <summary>Пари «категорія → id деталі» у порядку PartCategories.All.</summary>
    public IEnumerable<(string Category, string PartId)> All()
    {
        yield return (PartCategories.Bus, Bus);
        yield return (PartCategories.Solar, Solar);
        yield return (PartCategories.Battery, Battery);
        yield return (PartCategories.Radio, Radio);
        yield return (PartCategories.Computer, Computer);
        yield return (PartCategories.Adcs, Adcs);
        yield return (PartCategories.Propulsion, Propulsion);
    }
}

public sealed record CargoItem(string CategoryId, double MassKg);

public sealed record Design
{
    public required string MissionId { get; init; }
    public string Version { get; init; } = "simple";
    public OrbitChoice? Orbit { get; init; }
    public required string LaunchId { get; init; }
    public required DesignParts Parts { get; init; }
    public IReadOnlyList<string> InstrumentIds { get; init; } = [];
    public IReadOnlyList<string> GroundStationIds { get; init; } = [];

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public string? LaunchSiteId { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? InsertionAltitudeKm { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public IReadOnlyList<CargoItem>? Cargo { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public bool? Relay { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public IReadOnlyDictionary<string, string>? Layout { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public double? MassReservePct { get; init; }
}
