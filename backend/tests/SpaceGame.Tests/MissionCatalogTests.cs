using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SpaceGame.Api.Catalogs;

namespace SpaceGame.Tests;

public sealed class MissionEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Missions_ListsThreeMissionsWithKinds()
    {
        using var client = factory.CreateClient();

        var list = await client.GetFromJsonAsync<JsonElement>("/api/missions");

        var pairs = list.EnumerateArray()
            .Select(m => (m.GetProperty("id").GetString(), m.GetProperty("kind").GetString(), m.GetProperty("available").GetBoolean()))
            .ToList();
        Assert.Equal(
            [("cubesat-learn", "tutorial", true), ("sat-orbit", "orbit", true), ("iss-cargo", "iss", true)],
            pairs);
    }

    [Theory]
    [InlineData("cubesat-learn")]
    [InlineData("sat-orbit")]
    [InlineData("iss-cargo")]
    public async Task Mission_MatchesContractShape(string id)
    {
        using var client = factory.CreateClient();

        var m = await client.GetFromJsonAsync<JsonElement>($"/api/missions/{id}");

        foreach (var key in new[] { "id", "kind", "titleCode", "briefingCode", "goal", "limits", "timing", "catalogs", "presets" })
            Assert.True(m.TryGetProperty(key, out _), $"mission.{key}");

        var catalogs = m.GetProperty("catalogs");
        var required = new Dictionary<string, string[]>
        {
            ["orbits"] = ["id", "nameCode", "altitudeKm", "inclinationDeg", "epochDate", "source"],
            ["launches"] = ["id", "nameCode", "priceK", "capacityKg", "fixedOrbitId", "maxBusSize", "source"],
            ["parts"] = ["id", "category", "tier", "nameCode", "massKg", "priceK", "consumptionW", "specs", "requires", "source"],
            ["instruments"] = ["id", "nameCode", "tier", "massKg", "priceK", "consumptionW", "dataRateKbps", "value", "requires", "source"],
            ["groundStations"] = ["id", "nameCode", "latitudeDeg", "longitudeDeg", "bands", "priceK", "source"],
            ["launchSites"] = ["id", "nameCode", "latitudeDeg", "longitudeDeg", "source"],
            ["cargoCategories"] = ["id", "nameCode", "value", "typicalMassKg", "source"],
        };
        foreach (var (array, fields) in required)
        {
            Assert.True(catalogs.TryGetProperty(array, out var items), $"catalogs.{array}");
            foreach (var item in items.EnumerateArray())
            {
                foreach (var field in fields)
                    Assert.True(item.TryGetProperty(field, out _), $"{array}[{item.GetProperty("id")}].{field}");
                var kind = item.GetProperty("source").GetProperty("kind").GetString();
                Assert.Contains(kind, new[] { "nasa", "nasaRetold", "estimate", "calculated" });
            }
        }

        Assert.Equal(15, m.GetProperty("limits").GetProperty("massReserveRecommendedPct").GetDouble());

        var goal = m.GetProperty("goal");
        if (m.GetProperty("kind").GetString() == "iss")
        {
            Assert.True(goal.TryGetProperty("cargoKg", out _));
            Assert.False(goal.TryGetProperty("dataGb", out _));
        }
        else
        {
            Assert.True(goal.TryGetProperty("dataGb", out _));
            Assert.False(goal.TryGetProperty("cargoKg", out _));
        }
    }

    [Fact]
    public async Task Mission_PartSpecsContainOnlyCategoryFields()
    {
        using var client = factory.CreateClient();

        var m = await client.GetFromJsonAsync<JsonElement>("/api/missions/sat-orbit");
        var radioX = m.GetProperty("catalogs").GetProperty("parts").EnumerateArray()
            .Single(p => p.GetProperty("id").GetString() == "radio-x");

        var specKeys = radioX.GetProperty("specs").EnumerateObject().Select(p => p.Name).OrderBy(n => n).ToArray();
        Assert.Equal(["band", "rateKbps"], specKeys);
        Assert.Equal("adcs-fine", radioX.GetProperty("requires")[0].GetProperty("partId").GetString());
    }

    [Fact]
    public async Task Mission_PresetDesignOmitsIssOnlyFieldsForOrbitMission()
    {
        using var client = factory.CreateClient();

        var m = await client.GetFromJsonAsync<JsonElement>("/api/missions/sat-orbit");
        var design = m.GetProperty("presets")[0].GetProperty("design");

        Assert.False(design.TryGetProperty("launchSiteId", out _));
        Assert.False(design.TryGetProperty("relay", out _));
        Assert.Equal("sso", design.GetProperty("orbit").GetProperty("presetId").GetString());
    }

    [Fact]
    public async Task UnknownMission_Returns404Problem()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/missions/mars");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}

/// <summary>Цілісність даних каталогів: усі посилання між позиціями ведуть на наявні id.</summary>
public sealed class MissionDataIntegrityTests
{
    public static TheoryData<string> MissionIds => new(MissionData.All.Select(m => m.Id));

    [Theory]
    [MemberData(nameof(MissionIds))]
    public void EveryCategoryHasAtLeastOnePart(string missionId)
    {
        var mission = new MissionCatalog().Find(missionId)!;

        foreach (var category in PartCategories.All)
            Assert.Contains(mission.Catalogs.Parts, p => p.Category == category);
    }

    [Theory]
    [MemberData(nameof(MissionIds))]
    public void IdsAreUniqueAndReferencesResolve(string missionId)
    {
        var mission = new MissionCatalog().Find(missionId)!;
        var c = mission.Catalogs;

        Assert.Equal(c.Parts.Count, c.Parts.Select(p => p.Id).Distinct().Count());
        var partIds = c.Parts.Select(p => p.Id).ToHashSet();
        var orbitIds = c.Orbits.Select(o => o.Id).ToHashSet();

        foreach (var req in c.Parts.SelectMany(p => p.Requires).Concat(c.Instruments.SelectMany(i => i.Requires)))
            Assert.Contains(req.PartId, partIds);

        foreach (var launch in c.Launches)
        {
            Assert.NotEmpty(launch.CapacityKg);
            foreach (var orbitKey in launch.CapacityKg.Keys)
                Assert.Contains(orbitKey, orbitIds);
            if (launch.FixedOrbitId is { } fixedOrbit)
                Assert.Contains(fixedOrbit, orbitIds);
        }

        foreach (var key in mission.Timing.LaunchLeadMonths.Keys)
            Assert.Contains(c.Launches, l => l.Id == key);
    }

    [Theory]
    [MemberData(nameof(MissionIds))]
    public void PresetsUseCatalogItemsOnly(string missionId)
    {
        var mission = new MissionCatalog().Find(missionId)!;
        var c = mission.Catalogs;
        Assert.NotEmpty(mission.Presets);

        foreach (var design in mission.Presets.Select(p => p.Design))
        {
            Assert.Equal(missionId, design.MissionId);
            Assert.Contains(c.Launches, l => l.Id == design.LaunchId);
            foreach (var (category, partId) in design.Parts.All())
                Assert.Contains(c.Parts, p => p.Id == partId && p.Category == category);
            foreach (var id in design.InstrumentIds)
                Assert.Contains(c.Instruments, i => i.Id == id);
            foreach (var id in design.GroundStationIds)
                Assert.Contains(c.GroundStations, s => s.Id == id);

            if (mission.Kind == MissionKinds.Iss)
            {
                Assert.Null(design.Orbit);
                Assert.Contains(c.LaunchSites, s => s.Id == design.LaunchSiteId);
                Assert.NotNull(design.InsertionAltitudeKm);
                Assert.NotNull(design.Relay);
                Assert.All(design.Cargo!, item => Assert.Contains(c.CargoCategories, k => k.Id == item.CategoryId));
            }
            else
            {
                Assert.Contains(c.Orbits, o => o.Id == design.Orbit!.PresetId);
                Assert.Null(design.LaunchSiteId);
            }
        }
    }
}
