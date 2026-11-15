namespace SpaceGame.Api.Catalogs;

/// <summary>Публічний інтерфейс модуля Catalogs (D58): решта модулів бере місії лише звідси.</summary>
public interface IMissionCatalog
{
    IReadOnlyList<Mission> All { get; }

    Mission? Find(string id);
}

/// <summary>
/// Каталоги — незмінні довідкові дані, що живуть у коді разом із формулами, які їх
/// використовують (детермінізм D65, тести без бази). Див. нотатки задачі 003.
/// </summary>
public sealed class MissionCatalog : IMissionCatalog
{
    private readonly Dictionary<string, Mission> _byId;

    public MissionCatalog() : this(MissionData.All) { }

    public MissionCatalog(IReadOnlyList<Mission> missions)
    {
        All = missions;
        _byId = missions.ToDictionary(m => m.Id, StringComparer.Ordinal);
    }

    public IReadOnlyList<Mission> All { get; }

    public Mission? Find(string id) => _byId.GetValueOrDefault(id);
}
