using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Rooms;

// Кооператив — кімнати (docs/api.md 2.2, D109). Запити й RoomState — як у контракті.

public sealed record CreateRoomRequest(Guid PlayerId, string? Name, Design Design);

public sealed record RoomPlayerRequest(Guid PlayerId, string? Name);

public sealed record AssignRoleRequest(Guid PlayerId, int? Slot);

public sealed record RoomDesignRequest(Guid PlayerId, Design Design);

public sealed record RoomActionRequest(Guid PlayerId, long? Seed);

public sealed record RoomYou(int Slot);

public sealed record RoomPlayer(int Slot, string? Name, bool Online);

public sealed record RoomRoles(int? Engineer, int? Designer, int? Planner, int? Scientist);

/// <summary>Остання зміна кімнати — щоб фронтенд показав «хто що змінив».</summary>
public sealed record RoomChange(int? Slot, string Kind, IReadOnlyList<string> Fields);

public sealed record RoomLaunch(int Slot, long Seed, SimulationResult Result);

public sealed record RoomState(
    string Code,
    long Revision,
    string Phase,
    string MissionId,
    string Version,
    RoomYou? You,
    IReadOnlyList<RoomPlayer> Players,
    RoomRoles Roles,
    Design Design,
    Evaluation Evaluation,
    RoomChange? LastChange,
    RoomLaunch? Launch);

public static class RoomPhases
{
    public const string Design = "design";
    public const string Launched = "launched";
}

public static class RoomChangeKinds
{
    public const string Create = "create";
    public const string Join = "join";
    public const string Leave = "leave";
    public const string Roles = "roles";
    public const string Design = "design";
    public const string Launch = "launch";
    public const string Reset = "reset";
}

/// <summary>Чотири ролі (D13, D92).</summary>
public static class GameRoles
{
    public const string Engineer = "engineer";
    public const string Designer = "designer";
    public const string Planner = "planner";
    public const string Scientist = "scientist";

    public static readonly IReadOnlyList<string> All = [Engineer, Designer, Planner, Scientist];
}

/// <summary>Помилка кімнати: <c>Field</c> задано — 400 з <c>errors</c>, інакше 404/409 з кодом у <c>title</c>.</summary>
public sealed class RoomException(int status, string code, string? field = null) : Exception(code)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public string? Field { get; } = field;

    public static RoomException NotFound() => new(StatusCodes.Status404NotFound, "room.notFound");
    public static RoomException Conflict(string code) => new(StatusCodes.Status409Conflict, code);
    public static RoomException Invalid(string field, string code) => new(StatusCodes.Status400BadRequest, code, field);
}

/// <summary>Помилки перевірки проєкту — 400 з тими самими ключами, що й у <c>evaluate</c>.</summary>
public sealed class RoomDesignException(Dictionary<string, string[]> errors) : Exception("design")
{
    public Dictionary<string, string[]> Errors { get; } = errors;
}
