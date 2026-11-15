using System.Text.Json;
using SpaceGame.Api.Catalogs;

namespace SpaceGame.Api.Rooms;

/// <summary>
/// Таблиця «Хто власник рішення» з docs/api.md (D92): гравець надсилає повний <see cref="Design"/>,
/// а в кімнату потрапляють лише поля його ролей. Тож застарілі чужі поля у фронтенді нічого не
/// перезаписують, а два гравці не можуть змінити одне поле.
/// </summary>
public static class DesignOwnership
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>Шляхи полів і їхні власники — у порядку таблиці контракту.</summary>
    public static readonly IReadOnlyList<(string Path, string Role, Func<Design, object?> Get)> Fields =
    [
        ("orbit", GameRoles.Planner, d => d.Orbit),
        ("launchId", GameRoles.Planner, d => d.LaunchId),
        ("groundStationIds", GameRoles.Planner, d => d.GroundStationIds),
        ("launchSiteId", GameRoles.Planner, d => d.LaunchSiteId),
        ("insertionAltitudeKm", GameRoles.Planner, d => d.InsertionAltitudeKm),
        ("relay", GameRoles.Planner, d => d.Relay),
        ("instrumentIds", GameRoles.Scientist, d => d.InstrumentIds),
        ("cargo", GameRoles.Scientist, d => d.Cargo),
        ("parts.solar", GameRoles.Engineer, d => d.Parts.Solar),
        ("parts.battery", GameRoles.Engineer, d => d.Parts.Battery),
        ("parts.radio", GameRoles.Engineer, d => d.Parts.Radio),
        ("parts.computer", GameRoles.Engineer, d => d.Parts.Computer),
        ("parts.adcs", GameRoles.Engineer, d => d.Parts.Adcs),
        ("parts.propulsion", GameRoles.Engineer, d => d.Parts.Propulsion),
        ("parts.bus", GameRoles.Designer, d => d.Parts.Bus),
        ("layout", GameRoles.Designer, d => d.Layout),
        ("massReservePct", GameRoles.Designer, d => d.MassReservePct),
    ];

    /// <summary>Поточний проєкт, у якому поля ролей <paramref name="roles"/> взято з <paramref name="incoming"/>.</summary>
    public static Design Merge(Design current, Design incoming, IReadOnlySet<string> roles)
    {
        var d = current;
        var inParts = incoming.Parts ?? current.Parts;
        if (roles.Contains(GameRoles.Planner))
            d = d with
            {
                Orbit = incoming.Orbit,
                LaunchId = incoming.LaunchId,
                GroundStationIds = incoming.GroundStationIds ?? [],
                LaunchSiteId = incoming.LaunchSiteId,
                InsertionAltitudeKm = incoming.InsertionAltitudeKm,
                Relay = incoming.Relay,
            };
        if (roles.Contains(GameRoles.Scientist))
            d = d with { InstrumentIds = incoming.InstrumentIds ?? [], Cargo = incoming.Cargo };

        var parts = d.Parts;
        if (roles.Contains(GameRoles.Engineer))
            parts = parts with
            {
                Solar = inParts.Solar,
                Battery = inParts.Battery,
                Radio = inParts.Radio,
                Computer = inParts.Computer,
                Adcs = inParts.Adcs,
                Propulsion = inParts.Propulsion,
            };
        if (roles.Contains(GameRoles.Designer))
        {
            parts = parts with { Bus = inParts.Bus };
            d = d with { Layout = incoming.Layout, MassReservePct = incoming.MassReservePct };
        }

        // Місія й версія кімнати не змінюються (docs/api.md 2.2).
        return d with { Parts = parts, MissionId = current.MissionId, Version = current.Version };
    }

    /// <summary>Шляхи полів, що відрізняються, — для <c>lastChange.fields</c>.</summary>
    public static List<string> Changed(Design before, Design after) =>
        Fields.Where(f => JsonSerializer.Serialize(f.Get(before), Json) != JsonSerializer.Serialize(f.Get(after), Json))
            .Select(f => f.Path)
            .ToList();
}
