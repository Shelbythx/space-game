using System.Collections.Concurrent;
using System.Security.Cryptography;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Api.Rooms;

/// <summary>Гравець кімнати. <c>PlayerId</c> іншим не показується — лише <c>Slot</c>.</summary>
public sealed class RoomSeat
{
    public required Guid PlayerId { get; init; }
    public required int Slot { get; init; }
    public string? Name { get; set; }
    public DateTimeOffset LastSeen { get; set; }
}

/// <summary>Одна кімната. Усі зміни — під <see cref="Gate"/>; стан читається лише через <see cref="Snapshot"/>.</summary>
public sealed class Room
{
    public const int MaxPlayers = 4;

    public required string Code { get; init; }
    public required Mission Mission { get; init; }
    public required Design Design { get; set; }
    public required Evaluation Evaluation { get; set; }
    public long Revision { get; private set; } = 1;
    public string Phase { get; set; } = RoomPhases.Design;
    public List<RoomSeat> Seats { get; } = [];
    public Dictionary<string, int?> Roles { get; } = GameRoles.All.ToDictionary(r => r, _ => (int?)null);
    public RoomChange? LastChange { get; private set; }
    public RoomLaunch? Launch { get; set; }
    public DateTimeOffset LastActivity { get; set; }

    /// <summary>Хто був «на зв'язку» в останньому опублікованому стані — щоб зміна присутності теж давала нову ревізію.</summary>
    private HashSet<int> _publishedOnline = [];

    public SemaphoreSlim Gate { get; } = new(1, 1);

    public RoomSeat? Seat(Guid playerId) => Seats.FirstOrDefault(s => s.PlayerId == playerId);

    public bool IsOnline(RoomSeat seat, DateTimeOffset now) => now - seat.LastSeen <= RoomStore.OnlineWindow;

    public IReadOnlySet<string> RolesOf(int slot) =>
        Roles.Where(r => r.Value == slot).Select(r => r.Key).ToHashSet();

    public void Changed(int? slot, string kind, IReadOnlyList<string>? fields = null)
    {
        Revision++;
        LastChange = new RoomChange(slot, kind, fields ?? []);
    }

    /// <summary>Якщо хтось з'явився чи зник зі зв'язку — нова ревізія, щоб опитування це побачили.</summary>
    public void RefreshPresence(DateTimeOffset now)
    {
        var online = Seats.Where(s => IsOnline(s, now)).Select(s => s.Slot).ToHashSet();
        if (online.SetEquals(_publishedOnline))
            return;
        _publishedOnline = online;
        Revision++;
    }

    public RoomState Snapshot(Guid? playerId, DateTimeOffset now)
    {
        var you = playerId is { } id && Seat(id) is { } seat ? new RoomYou(seat.Slot) : null;
        return new RoomState(
            Code, Revision, Phase, Mission.Id, Design.Version, you,
            Seats.OrderBy(s => s.Slot).Select(s => new RoomPlayer(s.Slot, s.Name, IsOnline(s, now))).ToList(),
            new RoomRoles(Roles[GameRoles.Engineer], Roles[GameRoles.Designer], Roles[GameRoles.Planner], Roles[GameRoles.Scientist]),
            Design, Evaluation, LastChange, Launch);
    }
}

/// <summary>Кімнати в пам'яті бекенду (D109): без БД, зникають через <see cref="Lifetime"/> без дій або при перезапуску.</summary>
public sealed class RoomStore(TimeProvider clock)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(6);
    public static readonly TimeSpan OnlineWindow = TimeSpan.FromSeconds(30);
    public const int MaxRooms = 500;
    public const int CodeLength = 5;

    // Без 0/O та 1/I — код читають уголос і переписують з екрана.
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private readonly ConcurrentDictionary<string, Room> _rooms = new();

    public DateTimeOffset Now => clock.GetUtcNow();

    public Room Add(Func<string, Room> create)
    {
        Sweep();
        if (_rooms.Count >= MaxRooms)
            throw RoomException.Conflict("room.tooMany");
        while (true)
        {
            var code = string.Create(CodeLength, 0, (span, _) =>
            {
                for (var i = 0; i < span.Length; i++)
                    span[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
            });
            var room = create(code);
            if (_rooms.TryAdd(code, room))
                return room;
        }
    }

    public Room Get(string code)
    {
        var key = code.Trim().ToUpperInvariant();
        if (!_rooms.TryGetValue(key, out var room))
            throw RoomException.NotFound();
        if (Now - room.LastActivity > Lifetime)
        {
            _rooms.TryRemove(key, out _);
            throw RoomException.NotFound();
        }
        return room;
    }

    private void Sweep()
    {
        var now = Now;
        foreach (var (code, room) in _rooms)
            if (now - room.LastActivity > Lifetime)
                _rooms.TryRemove(code, out _);
    }
}
