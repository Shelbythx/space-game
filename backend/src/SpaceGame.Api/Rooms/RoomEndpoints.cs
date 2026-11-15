using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;

namespace SpaceGame.Api.Rooms;

/// <summary><c>/api/rooms…</c> — кооператив за посиланням (docs/api.md 2.2, D109).</summary>
public static class RoomEndpoints
{
    public const int MaxNameLength = 24;

    public static IServiceCollection AddRooms(this IServiceCollection services) =>
        services.AddSingleton<RoomStore>();

    public static IEndpointRouteBuilder MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/rooms").WithTags("Rooms");

        group.MapPost("/", (CreateRoomRequest request, RoomStore store, IMissionCatalog catalog) => Handle(() =>
            {
                RequirePlayer(request.PlayerId);
                var name = CleanName(request.Name);
                var (design, mission, evaluation) = Validate(request.Design, catalog);
                var now = store.Now;
                var room = store.Add(code => new Room { Code = code, Mission = mission, Design = design, Evaluation = evaluation, LastActivity = now });
                room.Seats.Add(new RoomSeat { PlayerId = request.PlayerId, Slot = 1, Name = name, LastSeen = now });
                foreach (var role in GameRoles.All)
                    room.Roles[role] = 1;
                room.RefreshPresence(now);
                room.Changed(1, RoomChangeKinds.Create);
                return Task.FromResult(Results.Created($"/api/rooms/{room.Code}", room.Snapshot(request.PlayerId, now)));
            }))
            .WithName("CreateRoom")
            .Produces<RoomState>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapGet("/{code}", (string code, Guid? playerId, long? since, RoomStore store) => Handle(() =>
                InRoom(store, code, async room =>
                {
                    var now = store.Now;
                    if (playerId is { } id && room.Seat(id) is { } seat)
                        seat.LastSeen = now;
                    room.RefreshPresence(now);
                    return since == room.Revision ? Results.NoContent() : Results.Ok(room.Snapshot(playerId, now));
                })))
            .WithName("GetRoom")
            .Produces<RoomState>()
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{code}/join", (string code, RoomPlayerRequest request, RoomStore store) => Handle(() =>
            {
                RequirePlayer(request.PlayerId);
                var name = CleanName(request.Name);
                return InRoom(store, code, async room =>
                {
                    var now = store.Now;
                    if (room.Seat(request.PlayerId) is { } seat)
                    {
                        seat.LastSeen = now;
                        if (seat.Name != name)
                        {
                            seat.Name = name;
                            room.Changed(seat.Slot, RoomChangeKinds.Join);
                        }
                    }
                    else
                    {
                        if (room.Seats.Count >= Room.MaxPlayers)
                            throw RoomException.Conflict("room.full");
                        var slot = Enumerable.Range(1, Room.MaxPlayers).First(s => room.Seats.All(x => x.Slot != s));
                        room.Seats.Add(new RoomSeat { PlayerId = request.PlayerId, Slot = slot, Name = name, LastSeen = now });
                        room.Changed(slot, RoomChangeKinds.Join);
                    }
                    room.RefreshPresence(now);
                    return Results.Ok(room.Snapshot(request.PlayerId, now));
                });
            }))
            .WithName("JoinRoom")
            .Produces<RoomState>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{code}/leave", (string code, RoomPlayerRequest request, RoomStore store) => Handle(() =>
                Act(store, code, request.PlayerId, async (room, seat, now) =>
                {
                    room.Seats.Remove(seat);
                    foreach (var role in room.RolesOf(seat.Slot))
                        room.Roles[role] = null;
                    room.Changed(seat.Slot, RoomChangeKinds.Leave);
                    room.RefreshPresence(now);
                })))
            .WithName("LeaveRoom")
            .Produces<RoomState>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{code}/roles/{role}", (string code, string role, AssignRoleRequest request, RoomStore store) => Handle(() =>
            {
                if (!GameRoles.All.Contains(role))
                    throw RoomException.Invalid("role", "room.unknownRole");
                return Act(store, code, request.PlayerId, async (room, seat, now) =>
                {
                    if (request.Slot is { } target && room.Seats.All(s => s.Slot != target))
                        throw RoomException.Invalid("slot", "room.unknownSlot");
                    var owner = room.Roles[role];
                    if (owner == request.Slot)
                        return;
                    if (owner != seat.Slot)
                    {
                        // Чужу чи вільну роль можна лише забрати собі — і лише якщо власник не на зв'язку.
                        var ownerSeat = owner is { } o ? room.Seats.FirstOrDefault(s => s.Slot == o) : null;
                        if (request.Slot != seat.Slot || (ownerSeat is not null && room.IsOnline(ownerSeat, now)))
                            throw RoomException.Conflict("room.roleTaken");
                    }
                    room.Roles[role] = request.Slot;
                    room.Changed(seat.Slot, RoomChangeKinds.Roles, [role]);
                });
            }))
            .WithName("AssignRole")
            .Produces<RoomState>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{code}/design", (string code, RoomDesignRequest request, RoomStore store, IMissionCatalog catalog) => Handle(() =>
                Act(store, code, request.PlayerId, async (room, seat, now) =>
                {
                    if (room.Phase == RoomPhases.Launched)
                        throw RoomException.Conflict("room.launched");
                    var roles = room.RolesOf(seat.Slot);
                    if (roles.Count == 0)
                        throw RoomException.Conflict("room.noRole");
                    var merged = DesignOwnership.Merge(room.Design, request.Design, roles);
                    var changed = DesignOwnership.Changed(room.Design, merged);
                    if (changed.Count == 0)
                        return;
                    var (design, _, evaluation) = Validate(merged, catalog);
                    room.Design = design;
                    room.Evaluation = evaluation;
                    room.Changed(seat.Slot, RoomChangeKinds.Design, changed);
                })))
            .WithName("UpdateRoomDesign")
            .Produces<RoomState>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{code}/launch", (string code, RoomActionRequest request, RoomStore store, ISpaceWeatherSource weather, CancellationToken ct) => Handle(() =>
                Act(store, code, request.PlayerId, async (room, seat, now) =>
                {
                    if (room.Phase == RoomPhases.Launched)
                        throw RoomException.Conflict("room.launched");
                    if (room.Roles.Values.Any(v => v is null))
                        throw RoomException.Conflict("room.rolesFree");
                    var result = await SimulateEndpoints.RunAsync(room.Design, room.Mission, request.Seed, weather, ct);
                    room.Phase = RoomPhases.Launched;
                    room.Launch = new RoomLaunch(seat.Slot, result.Seed, result);
                    room.Changed(seat.Slot, RoomChangeKinds.Launch);
                })))
            .WithName("LaunchRoom")
            .Produces<RoomState>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{code}/reset", (string code, RoomActionRequest request, RoomStore store) => Handle(() =>
                Act(store, code, request.PlayerId, async (room, seat, now) =>
                {
                    if (room.Phase != RoomPhases.Launched)
                        throw RoomException.Conflict("room.notLaunched");
                    room.Phase = RoomPhases.Design;
                    room.Launch = null;
                    room.Changed(seat.Slot, RoomChangeKinds.Reset);
                })))
            .WithName("ResetRoom")
            .Produces<RoomState>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }

    /// <summary>Дія гравця кімнати: перевіряє <c>playerId</c> і членство, позначає «на зв'язку», повертає стан.</summary>
    private static Task<IResult> Act(RoomStore store, string code, Guid playerId, Func<Room, RoomSeat, DateTimeOffset, Task> action)
    {
        RequirePlayer(playerId);
        return InRoom(store, code, async room =>
        {
            var seat = room.Seat(playerId) ?? throw RoomException.Conflict("room.notMember");
            var now = store.Now;
            seat.LastSeen = now;
            await action(room, seat, now);
            room.RefreshPresence(now);
            return Results.Ok(room.Snapshot(playerId, now));
        });
    }

    private static async Task<IResult> InRoom(RoomStore store, string code, Func<Room, Task<IResult>> action)
    {
        var room = store.Get(code);
        await room.Gate.WaitAsync();
        try
        {
            room.LastActivity = store.Now;
            return await action(room);
        }
        finally
        {
            room.Gate.Release();
        }
    }

    private static async Task<IResult> Handle(Func<Task<IResult>> action)
    {
        try
        {
            return await action();
        }
        catch (RoomDesignException e)
        {
            return Results.ValidationProblem(e.Errors);
        }
        catch (RoomException e) when (e.Field is not null)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]> { [e.Field] = [e.Code] });
        }
        catch (RoomException e)
        {
            return Results.Problem(statusCode: e.Status, title: e.Code);
        }
    }

    private static void RequirePlayer(Guid playerId)
    {
        if (playerId == Guid.Empty)
            throw RoomException.Invalid("playerId", "room.playerIdRequired");
    }

    private static string? CleanName(string? name)
    {
        var trimmed = name?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return null;
        if (trimmed.Length > MaxNameLength)
            throw RoomException.Invalid("name", "room.nameTooLong");
        return trimmed;
    }

    private static (Design Design, Mission Mission, Simulation.Model.Evaluation Evaluation) Validate(Design design, IMissionCatalog catalog)
    {
        var errors = DesignValidator.Validate(design, catalog, out var mission);
        if (errors.Count > 0 || mission is null)
            throw new RoomDesignException(errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
        return (design, mission, Evaluator.Evaluate(design, mission).Evaluation);
    }
}
