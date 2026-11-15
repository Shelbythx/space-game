using SpaceGame.Api.Catalogs;

namespace SpaceGame.Api.Simulation;

/// <summary>
/// Перевірка запиту <c>Design</c> (docs/api.md, «Помилки перевірки запиту — design.*»).
/// Повертає словник «шлях поля → коди»; порожній — проєкт можна рахувати.
/// </summary>
public static class DesignValidator
{
    public const double MinAltitudeKm = 200;
    public const double MaxAltitudeKm = 36_000;
    public const double MinInsertionAltitudeKm = 180;

    public static Dictionary<string, List<string>> Validate(Design? design, IMissionCatalog catalog, out Mission? mission)
    {
        var errors = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        void Add(string path, string code)
        {
            if (!errors.TryGetValue(path, out var list))
                errors[path] = list = [];
            if (!list.Contains(code))
                list.Add(code);
        }

        mission = null;
        if (design is null)
        {
            Add("design", "design.unknownMission");
            return errors;
        }

        mission = catalog.Find(design.MissionId ?? "");
        if (mission is null)
        {
            Add("missionId", "design.unknownMission");
            return errors;
        }

        var c = mission.Catalogs;
        var isIss = mission.Kind == MissionKinds.Iss;

        // Деталі: сім категорій, кожна — з каталогу місії й своєї категорії.
        if (design.Parts is null)
        {
            Add("parts", "design.missingPart");
        }
        else
        {
            foreach (var (category, partId) in design.Parts.All())
            {
                if (string.IsNullOrWhiteSpace(partId))
                    Add($"parts.{category}", "design.missingPart");
                else if (!c.Parts.Any(p => p.Id == partId && p.Category == category))
                    Add($"parts.{category}", "design.unknownPart");
            }
        }

        if (c.Launches.All(l => l.Id != design.LaunchId))
            Add("launchId", "design.unknownLaunch");

        foreach (var (id, k) in (design.InstrumentIds ?? []).Select((id, k) => (id, k)))
            if (c.Instruments.All(i => i.Id != id))
                Add($"instrumentIds[{k}]", "design.unknownInstrument");

        foreach (var (id, k) in (design.GroundStationIds ?? []).Select((id, k) => (id, k)))
            if (c.GroundStations.All(s => s.Id != id))
                Add($"groundStationIds[{k}]", "design.unknownStation");

        if (isIss)
        {
            if (design.LaunchSiteId is null) Add("launchSiteId", "design.issFieldRequired");
            else if (c.LaunchSites.All(s => s.Id != design.LaunchSiteId)) Add("launchSiteId", "design.unknownLaunchSite");

            var issAltitude = c.Orbits.FirstOrDefault()?.AltitudeKm ?? 418;
            if (design.InsertionAltitudeKm is null) Add("insertionAltitudeKm", "design.issFieldRequired");
            else if (design.InsertionAltitudeKm < MinInsertionAltitudeKm || design.InsertionAltitudeKm >= issAltitude)
                Add("insertionAltitudeKm", "design.insertionAltitudeOutOfRange");

            if (design.Cargo is null) Add("cargo", "design.issFieldRequired");
            else
            {
                var seen = new HashSet<string>(StringComparer.Ordinal);
                foreach (var (item, k) in design.Cargo.Select((item, k) => (item, k)))
                {
                    if (c.CargoCategories.All(cc => cc.Id != item.CategoryId))
                        Add($"cargo[{k}].categoryId", "design.unknownCargoCategory");
                    else if (!seen.Add(item.CategoryId))
                        Add($"cargo[{k}].categoryId", "design.duplicateCargoCategory");
                    if (item.MassKg < 0)
                        Add($"cargo[{k}].massKg", "design.unknownCargoCategory");
                }
            }

            if (design.Relay is null) Add("relay", "design.issFieldRequired");
        }
        else
        {
            if (design.LaunchSiteId is not null) Add("launchSiteId", "design.issFieldNotAllowed");
            if (design.InsertionAltitudeKm is not null) Add("insertionAltitudeKm", "design.issFieldNotAllowed");
            if (design.Cargo is not null) Add("cargo", "design.issFieldNotAllowed");
            if (design.Relay is not null) Add("relay", "design.issFieldNotAllowed");

            var launch = c.Launches.FirstOrDefault(l => l.Id == design.LaunchId);
            if (design.Orbit is null)
            {
                if (launch?.FixedOrbitId is null)
                    Add("orbit", "design.unknownOrbit");
            }
            else if (design.Orbit.PresetId is { } presetId)
            {
                if (c.Orbits.All(o => o.Id != presetId))
                    Add("orbit.presetId", "design.unknownOrbit");
            }
            else if (design.Orbit.AltitudeKm is not { } alt || design.Orbit.InclinationDeg is not { } inc
                     || alt < MinAltitudeKm || alt > MaxAltitudeKm || inc < 0 || inc > 180)
            {
                Add("orbit", "design.orbitOutOfRange");
            }
        }

        var advanced = design.Version == "advanced";
        if (!advanced && design.Version != "simple")
            Add("version", "design.advancedFieldNotAllowed");

        if (!advanced && (design.Layout is not null || design.MassReservePct is not null))
        {
            if (design.Layout is not null) Add("layout", "design.advancedFieldNotAllowed");
            if (design.MassReservePct is not null) Add("massReservePct", "design.advancedFieldNotAllowed");
        }

        if (advanced && design.MassReservePct is { } pct && (pct < 0 || pct > 50))
            Add("massReservePct", "design.massReserveOutOfRange");

        if (advanced && design.Layout is not null)
        {
            var allowed = new HashSet<string>(PartCategories.All.Where(x => x != PartCategories.Bus), StringComparer.Ordinal);
            foreach (var id in design.InstrumentIds ?? []) allowed.Add(id);
            foreach (var (key, side) in design.Layout)
            {
                if (!allowed.Contains(key) || !Layout.Sides.Contains(side))
                    Add($"layout.{key}", "design.unknownLayoutKey");
            }
        }

        return errors;
    }
}
