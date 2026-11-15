using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SpaceGame.Api.Catalogs;

namespace SpaceGame.Tests;

public sealed class AttemptEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly Design Camera = new MissionCatalog().Find("sat-orbit")!.Presets[1].Design;

    [Fact]
    public async Task Attempt_IsSavedAndReturnedByContract()
    {
        using var client = factory.CreateClient();
        var player = Guid.NewGuid();

        var created = await client.PostAsJsonAsync("/api/attempts", new { playerId = player, design = Camera, seed = 12345 });

        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var summary = await created.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var key in new[] { "id", "createdAt", "seed", "success", "scores", "bottleneck" })
            Assert.True(summary.TryGetProperty(key, out _), key);
        Assert.Equal(12345, summary.GetProperty("seed").GetInt64());
        Assert.True(summary.GetProperty("scores").TryGetProperty("missionSuccess", out _));

        var id = summary.GetProperty("id").GetString();
        var full = await client.GetFromJsonAsync<JsonElement>($"/api/attempts/{id}");
        Assert.Equal(player.ToString(), full.GetProperty("playerId").GetString());
        Assert.Equal("sat-orbit", full.GetProperty("design").GetProperty("missionId").GetString());
        Assert.Equal(12345, full.GetProperty("result").GetProperty("seed").GetInt64());
        Assert.Equal(4, full.GetProperty("result").GetProperty("report").GetProperty("segments").GetArrayLength());

        // Той самий seed — той самий результат, що й /api/simulate (D65).
        var simulated = await (await client.PostAsJsonAsync("/api/simulate", new { design = Camera, seed = 12345 }))
            .Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(simulated.GetProperty("report").GetRawText(), full.GetProperty("result").GetProperty("report").GetRawText());
    }

    [Fact]
    public async Task List_ShowsOnlyOwnAttempts_NewestFirst()
    {
        using var client = factory.CreateClient();
        var alice = Guid.NewGuid();
        var bob = Guid.NewGuid();

        await client.PostAsJsonAsync("/api/attempts", new { playerId = alice, design = Camera, seed = 1 });
        await client.PostAsJsonAsync("/api/attempts", new { playerId = alice, design = Camera, seed = 2 });
        await client.PostAsJsonAsync("/api/attempts", new { playerId = bob, design = Camera, seed = 3 });

        var aliceList = await client.GetFromJsonAsync<JsonElement>($"/api/attempts?playerId={alice}");
        var bobList = await client.GetFromJsonAsync<JsonElement>($"/api/attempts?playerId={bob}");

        Assert.Equal([2L, 1L], aliceList.EnumerateArray().Select(a => a.GetProperty("seed").GetInt64()));
        Assert.Equal([3L], bobList.EnumerateArray().Select(a => a.GetProperty("seed").GetInt64()));
    }

    [Fact]
    public async Task UnknownAttempt_Returns404_AndMissingPlayer400()
    {
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/attempts/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/attempts")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync("/api/attempts", new { playerId = Guid.Empty, design = Camera, seed = 1 })).StatusCode);
    }
}
