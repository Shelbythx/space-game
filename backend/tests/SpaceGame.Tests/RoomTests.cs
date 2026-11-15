using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Api.Catalogs;

namespace SpaceGame.Tests;

/// <summary>Кооператив — кімнати (docs/api.md 2.2, D109, задача 044).</summary>
public sealed class RoomTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    // radiometer-rideshare: bus-s, radio-s, станція fairbanks.
    private static readonly Design Start = new MissionCatalog().Find("sat-orbit")!.Presets[0].Design;

    private readonly ManualClock _clock = new(new DateTimeOffset(2026, 11, 15, 12, 0, 0, TimeSpan.Zero));

    private HttpClient Client() =>
        factory.WithWebHostBuilder(b => b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<TimeProvider>(_clock))))
            .CreateClient();

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<(string Code, JsonElement State)> Create(HttpClient client, Guid host, string? name = "Host")
    {
        var response = await client.PostAsJsonAsync("/api/rooms", new { playerId = host, name, design = Start });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var state = await Json(response);
        return (state.GetProperty("code").GetString()!, state);
    }

    private static Task<HttpResponseMessage> Join(HttpClient client, string code, Guid player, string? name = null) =>
        client.PostAsJsonAsync($"/api/rooms/{code}/join", new { playerId = player, name });

    private static Task<HttpResponseMessage> Assign(HttpClient client, string code, Guid actor, string role, int? slot) =>
        client.PutAsJsonAsync($"/api/rooms/{code}/roles/{role}", new { playerId = actor, slot });

    private static Task<HttpResponseMessage> PutDesign(HttpClient client, string code, Guid actor, Design design) =>
        client.PutAsJsonAsync($"/api/rooms/{code}/design", new { playerId = actor, design });

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("title").GetString());
    }

    private static async Task AssertInvalid(HttpResponseMessage response, string field, string code)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal(code, errors.GetProperty(field)[0].GetString());
    }

    [Fact]
    public async Task Create_GivesHostAllRoles_ByContract()
    {
        using var client = Client();
        var host = Guid.NewGuid();
        var (code, state) = await Create(client, host);

        Assert.Matches("^[A-HJ-NP-Z2-9]{5}$", code);
        foreach (var key in new[] { "code", "revision", "phase", "missionId", "version", "you", "players", "roles", "design", "evaluation", "lastChange", "launch" })
            Assert.True(state.TryGetProperty(key, out _), key);
        Assert.Equal("design", state.GetProperty("phase").GetString());
        Assert.Equal("sat-orbit", state.GetProperty("missionId").GetString());
        Assert.Equal("simple", state.GetProperty("version").GetString());
        Assert.Equal(1, state.GetProperty("you").GetProperty("slot").GetInt32());
        Assert.Equal(JsonValueKind.Null, state.GetProperty("launch").ValueKind);
        Assert.Equal("create", state.GetProperty("lastChange").GetProperty("kind").GetString());
        foreach (var role in new[] { "engineer", "designer", "planner", "scientist" })
            Assert.Equal(1, state.GetProperty("roles").GetProperty(role).GetInt32());
        var player = Assert.Single(state.GetProperty("players").EnumerateArray());
        Assert.Equal("Host", player.GetProperty("name").GetString());
        Assert.True(player.GetProperty("online").GetBoolean());
        Assert.False(player.TryGetProperty("playerId", out _));
        Assert.True(state.GetProperty("evaluation").TryGetProperty("checks", out _));
    }

    [Fact]
    public async Task Get_Returns204WhenNothingChanged_AndCodeIsCaseInsensitive()
    {
        using var client = Client();
        var host = Guid.NewGuid();
        var (code, state) = await Create(client, host);
        var revision = state.GetProperty("revision").GetInt64();

        var same = await client.GetAsync($"/api/rooms/{code}?playerId={host}&since={revision}");
        Assert.Equal(HttpStatusCode.NoContent, same.StatusCode);

        var viewer = await client.GetAsync($"/api/rooms/{code.ToLowerInvariant()}");
        Assert.Equal(HttpStatusCode.OK, viewer.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Json(viewer)).GetProperty("you").ValueKind);

        await AssertProblem(await client.GetAsync("/api/rooms/ZZZZZ"), HttpStatusCode.NotFound, "room.notFound");
    }

    [Fact]
    public async Task Join_TakesNextSlotWithoutRoles_FifthIsRejected()
    {
        using var client = Client();
        var (code, _) = await Create(client, Guid.NewGuid());
        var guest = Guid.NewGuid();

        var joined = await Json(await Join(client, code, guest, "Ira"));
        Assert.Equal(2, joined.GetProperty("you").GetProperty("slot").GetInt32());
        Assert.Equal(2, joined.GetProperty("players").GetArrayLength());
        Assert.Equal(1, joined.GetProperty("roles").GetProperty("planner").GetInt32());

        var again = await Json(await Join(client, code, guest, "Ira K"));
        Assert.Equal(2, again.GetProperty("you").GetProperty("slot").GetInt32());
        Assert.Equal("Ira K", again.GetProperty("players")[1].GetProperty("name").GetString());

        await Join(client, code, Guid.NewGuid());
        await Join(client, code, Guid.NewGuid());
        await AssertProblem(await Join(client, code, Guid.NewGuid()), HttpStatusCode.Conflict, "room.full");
        await AssertInvalid(await Join(client, code, Guid.NewGuid(), new string('x', 25)), "name", "room.nameTooLong");
        await AssertInvalid(await Join(client, code, Guid.Empty), "playerId", "room.playerIdRequired");
    }

    [Fact]
    public async Task Design_AppliesOnlyFieldsOfPlayersRoles()
    {
        using var client = Client();
        var host = Guid.NewGuid();
        var guest = Guid.NewGuid();
        var (code, _) = await Create(client, host);
        await Join(client, code, guest);
        Assert.Equal(HttpStatusCode.OK, (await Assign(client, code, host, "planner", 2)).StatusCode);

        // Гість — планувальник: його станції приймаються, а радіо (інженер) — ні.
        var guestDesign = Start with
        {
            GroundStationIds = ["fairbanks", "white-sands"],
            Parts = Start.Parts with { Radio = "radio-x" },
        };
        var afterGuest = await Json(await PutDesign(client, code, guest, guestDesign));
        var design = afterGuest.GetProperty("design");
        Assert.Equal(2, design.GetProperty("groundStationIds").GetArrayLength());
        Assert.Equal("radio-s", design.GetProperty("parts").GetProperty("radio").GetString());
        var change = afterGuest.GetProperty("lastChange");
        Assert.Equal("design", change.GetProperty("kind").GetString());
        Assert.Equal(2, change.GetProperty("slot").GetInt32());
        Assert.Equal(["groundStationIds"], change.GetProperty("fields").EnumerateArray().Select(f => f.GetString()));

        // Господар зі старими станціями змінює радіо — станції гостя лишаються.
        var hostDesign = Start with { Parts = Start.Parts with { Radio = "radio-x" } };
        var afterHost = await Json(await PutDesign(client, code, host, hostDesign));
        design = afterHost.GetProperty("design");
        Assert.Equal(2, design.GetProperty("groundStationIds").GetArrayLength());
        Assert.Equal("radio-x", design.GetProperty("parts").GetProperty("radio").GetString());
        Assert.Equal(["parts.radio"], afterHost.GetProperty("lastChange").GetProperty("fields").EnumerateArray().Select(f => f.GetString()));

        // Нічого свого не змінено — ревізія та сама.
        var revision = afterHost.GetProperty("revision").GetInt64();
        var noop = await Json(await PutDesign(client, code, guest, guestDesign));
        Assert.Equal(revision, noop.GetProperty("revision").GetInt64());

        // Місію змінити не можна: missionId кімнати лишається.
        var otherMission = await Json(await PutDesign(client, code, host, hostDesign with { MissionId = "iss-cargo" }));
        Assert.Equal("sat-orbit", otherMission.GetProperty("design").GetProperty("missionId").GetString());
    }

    [Fact]
    public async Task Design_InvalidMerge_Is400AndRoomUnchanged_NonMembersAndRolelessRejected()
    {
        using var client = Client();
        var host = Guid.NewGuid();
        var guest = Guid.NewGuid();
        var (code, state) = await Create(client, host);

        var bad = await PutDesign(client, code, host, Start with { Parts = Start.Parts with { Radio = "radio-nope" } });
        await AssertInvalid(bad, "parts.radio", "design.unknownPart");
        var now = await Json(await client.GetAsync($"/api/rooms/{code}"));
        Assert.Equal("radio-s", now.GetProperty("design").GetProperty("parts").GetProperty("radio").GetString());

        await AssertProblem(await PutDesign(client, code, guest, Start), HttpStatusCode.Conflict, "room.notMember");
        await Join(client, code, guest);
        await AssertProblem(await PutDesign(client, code, guest, Start), HttpStatusCode.Conflict, "room.noRole");
    }

    [Fact]
    public async Task Roles_OwnCanBeGivenOrFreed_OthersOnlyTakenWhenFreeOrOffline()
    {
        using var client = Client();
        var host = Guid.NewGuid();
        var guest = Guid.NewGuid();
        var (code, _) = await Create(client, host);
        await Join(client, code, guest);

        // Чужу роль господаря, що на зв'язку, забрати не можна.
        await AssertProblem(await Assign(client, code, guest, "engineer", 2), HttpStatusCode.Conflict, "room.roleTaken");

        // Звільнена роль: віддати її іншому не можна, забрати собі — можна.
        var freed = await Json(await Assign(client, code, host, "scientist", null));
        Assert.Equal(JsonValueKind.Null, freed.GetProperty("roles").GetProperty("scientist").ValueKind);
        Assert.Equal(["scientist"], freed.GetProperty("lastChange").GetProperty("fields").EnumerateArray().Select(f => f.GetString()));
        await AssertProblem(await Assign(client, code, guest, "scientist", 1), HttpStatusCode.Conflict, "room.roleTaken");
        var taken = await Json(await Assign(client, code, guest, "scientist", 2));
        Assert.Equal(2, taken.GetProperty("roles").GetProperty("scientist").GetInt32());

        await AssertInvalid(await Assign(client, code, host, "pilot", 1), "role", "room.unknownRole");
        await AssertInvalid(await Assign(client, code, host, "engineer", 3), "slot", "room.unknownSlot");

        // Господар пропав понад 30 с — гість забирає інженера, а присутність дає нову ревізію.
        var before = taken.GetProperty("revision").GetInt64();
        _clock.Advance(TimeSpan.FromSeconds(31));
        var polled = await Json(await client.GetAsync($"/api/rooms/{code}?playerId={guest}&since={before}"));
        Assert.False(polled.GetProperty("players")[0].GetProperty("online").GetBoolean());
        var stolen = await Json(await Assign(client, code, guest, "engineer", 2));
        Assert.Equal(2, stolen.GetProperty("roles").GetProperty("engineer").GetInt32());

        // Вихід звільняє ролі гравця.
        var left = await Json(await client.PostAsJsonAsync($"/api/rooms/{code}/leave", new { playerId = guest }));
        Assert.Equal(JsonValueKind.Null, left.GetProperty("roles").GetProperty("engineer").ValueKind);
        Assert.Equal(JsonValueKind.Null, left.GetProperty("you").ValueKind);
        Assert.Single(left.GetProperty("players").EnumerateArray());
    }

    [Fact]
    public async Task Launch_NeedsAllRoles_LocksDesign_ResetReturnsToDesign()
    {
        using var client = Client();
        var host = Guid.NewGuid();
        var guest = Guid.NewGuid();
        var (code, _) = await Create(client, host);
        await Join(client, code, guest);
        await Assign(client, code, host, "planner", null);

        var launchUrl = $"/api/rooms/{code}/launch";
        await AssertProblem(await client.PostAsJsonAsync(launchUrl, new { playerId = guest }), HttpStatusCode.Conflict, "room.rolesFree");
        await Assign(client, code, guest, "planner", 2);

        var launched = await Json(await client.PostAsJsonAsync(launchUrl, new { playerId = guest, seed = 12345 }));
        Assert.Equal("launched", launched.GetProperty("phase").GetString());
        var launch = launched.GetProperty("launch");
        Assert.Equal(2, launch.GetProperty("slot").GetInt32());
        Assert.Equal(12345, launch.GetProperty("seed").GetInt64());
        Assert.True(launch.GetProperty("result").TryGetProperty("report", out _));

        // Той самий seed — той самий звіт, що й /api/simulate (D65).
        var simulated = await Json(await client.PostAsJsonAsync("/api/simulate", new { design = Start, seed = 12345 }));
        Assert.Equal(simulated.GetProperty("report").GetRawText(), launch.GetProperty("result").GetProperty("report").GetRawText());

        await AssertProblem(await PutDesign(client, code, host, Start), HttpStatusCode.Conflict, "room.launched");
        await AssertProblem(await client.PostAsJsonAsync(launchUrl, new { playerId = host }), HttpStatusCode.Conflict, "room.launched");

        var reset = await Json(await client.PostAsJsonAsync($"/api/rooms/{code}/reset", new { playerId = host }));
        Assert.Equal("design", reset.GetProperty("phase").GetString());
        Assert.Equal(JsonValueKind.Null, reset.GetProperty("launch").ValueKind);
        await AssertProblem(await client.PostAsJsonAsync($"/api/rooms/{code}/reset", new { playerId = host }), HttpStatusCode.Conflict, "room.notLaunched");
    }

    [Fact]
    public async Task Room_DisappearsAfterSixHoursWithoutActivity()
    {
        using var client = Client();
        var (code, _) = await Create(client, Guid.NewGuid());
        _clock.Advance(TimeSpan.FromHours(5));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/rooms/{code}")).StatusCode);
        _clock.Advance(TimeSpan.FromHours(6) + TimeSpan.FromMinutes(1));
        await AssertProblem(await client.GetAsync($"/api/rooms/{code}"), HttpStatusCode.NotFound, "room.notFound");
    }

    [Fact]
    public async Task Create_RejectsInvalidDesign()
    {
        using var client = Client();
        var response = await client.PostAsJsonAsync("/api/rooms", new { playerId = Guid.NewGuid(), design = Start with { LaunchId = "nope" } });
        await AssertInvalid(response, "launchId", "design.unknownLaunch");
    }

    private sealed class ManualClock(DateTimeOffset start) : TimeProvider
    {
        private DateTimeOffset _now = start;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan by) => _now += by;
    }
}
