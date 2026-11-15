using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Tests;

public sealed class SimulatorTests
{
    private static readonly MissionCatalog Catalog = new();
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly SpaceWeather NoStorms = SpaceWeather.None(new DateOnly(2015, 1, 1));

    private static Design Preset(string mission, int index) => Catalog.Find(mission)!.Presets[index].Design;

    private static SimulationResult Run(Design d, long seed, SpaceWeather? weather = null) =>
        Simulator.Simulate(d, Catalog.Find(d.MissionId)!, seed, weather ?? NoStorms);

    [Theory]
    [InlineData("sat-orbit", 0)]
    [InlineData("sat-orbit", 1)]
    [InlineData("cubesat-learn", 0)]
    [InlineData("iss-cargo", 0)]
    public void SameSeed_GivesSameResult(string mission, int preset)
    {
        var a = JsonSerializer.Serialize(Run(Preset(mission, preset), 12345), Json);
        var b = JsonSerializer.Serialize(Run(Preset(mission, preset), 12345), Json);
        Assert.Equal(a, b);
    }

    [Theory]
    [InlineData("sat-orbit", 0)]
    [InlineData("sat-orbit", 1)]
    [InlineData("cubesat-learn", 0)]
    [InlineData("iss-cargo", 0)]
    public void Report_HasFourSegmentsAndEveryFailedOneHasNumericChain(string mission, int preset)
    {
        var result = Run(Preset(mission, preset), 7);
        var report = result.Report;

        Assert.Equal(["launch", "space", "ground", "user"], report.Segments.Select(s => s.Segment));
        foreach (var segment in report.Segments.Where(s => s.Status != "ok"))
        {
            Assert.NotEmpty(segment.Chain);
            Assert.Contains(segment.Chain, link => link.Params.Values.Any(v => v is double or int));
        }

        Assert.Equal(report.Segments.All(s => s.Status != "fail") && report.Limits.All(l => l.Status != "fail"), report.Success);
        foreach (var score in new[] { report.Scores.MissionSuccess, report.Scores.ScienceValue, report.Scores.ResourceEfficiency, report.Scores.DecisionQuality })
        {
            Assert.InRange(score.Value, 0, 100);
            Assert.False(string.IsNullOrEmpty(score.Formula));
        }
    }

    [Fact]
    public void Timeline_SeriesHaveEqualLength_AndDataGrows()
    {
        var t = Run(Preset("sat-orbit", 1), 1).Timeline;
        var n = t.Days.Count;
        Assert.True(n > 300);
        Assert.Equal(n, t.BatteryMinPct.Count);
        Assert.Equal(n, t.DataStoredGb.Count);
        Assert.Equal(n, t.DataDeliveredGb.Count);
        Assert.Equal(n, t.AltitudeKm.Count);
        Assert.Equal(n, t.PropellantKg.Count);
        Assert.True(t.DataDeliveredGb[^1] > t.DataDeliveredGb[10]);
    }

    [Fact]
    public void CameraWithXRadio_DeliversGoal_AndUhfDoesNot()
    {
        var camera = Preset("sat-orbit", 1);
        var uhf = camera with { Parts = camera.Parts with { Radio = "radio-uhf", Adcs = "adcs-fine" } };

        Assert.True(Run(camera, 3).Timeline.DataDeliveredGb[^1] >= 500);
        Assert.True(Run(uhf, 3).Timeline.DataDeliveredGb[^1] < 500);
        Assert.Equal("fail", Run(uhf, 3).Report.Segments.Single(s => s.Segment == "user").Status);
    }

    [Fact]
    public void CubesatAt415KmWithoutEngine_DecaysButSurvivesSixMonths()
    {
        var t = Run(Preset("cubesat-learn", 0), 11).Timeline;
        Assert.True(t.AltitudeKm[^1] < t.AltitudeKm[0]);
        Assert.True(t.AltitudeKm[^1] > 180);
    }

    [Fact]
    public void StrongStorm_IsReportedWithDonkiSource()
    {
        var weather = new SpaceWeather([new Storm(30, 8, "2015-03-17T00:00:00-GST-001", new DateTime(2015, 3, 17, 15, 0, 0, DateTimeKind.Utc))],
            true, new DateOnly(2014, 10, 26), new DateOnly(2015, 10, 25));

        var result = Run(Preset("sat-orbit", 1), 5, weather);
        var storm = result.Events.First(e => e.Type == "solarStorm");

        Assert.Equal(30, storm.Day);
        var source = Assert.IsType<DonkiEventSource>(storm.Source);
        Assert.Equal("2015-03-17T00:00:00-GST-001", source.EventId);
        Assert.Equal("2014-10-26", source.PeriodStart);
    }

    [Fact]
    public void UnavailableSpaceWeather_AddsEvent()
    {
        var weather = new SpaceWeather([], false, new DateOnly(2014, 10, 26), new DateOnly(2015, 10, 25));
        var result = Run(Preset("sat-orbit", 1), 5, weather);
        Assert.Equal("spaceWeatherUnavailable", result.Events[0].Type);
    }

    [Fact]
    public void Iss_ShipDocksWithinDeadline_FromCape()
    {
        var result = Run(Preset("iss-cargo", 0), 99);

        Assert.NotNull(result.Rendezvous);
        Assert.NotNull(result.Rendezvous!.DockedAtHours);
        Assert.True(result.Rendezvous.DockedAtHours <= 5 * 24, $"{result.Rendezvous.DockedAtHours} h");
        Assert.Equal(result.Rendezvous.Hours.Count, result.Rendezvous.PhaseAngleDeg.Count);
        Assert.Contains(result.Contacts, c => c.StationId == "tdrs" && c.VisibilityRadiusDeg is null);
    }

    [Fact]
    public void GroundTrack_ThreeOrbitsOfPoints()
    {
        var track = Run(Preset("sat-orbit", 1), 2).GroundTrack;
        Assert.Equal(3, track.OrbitCount);
        Assert.InRange(track.Points.Count, 280, 300);
        Assert.Contains(track.Points, p => !p.Sunlit);
        Assert.All(track.Points, p => Assert.InRange(p.LatDeg, -90, 90));
    }
}

public sealed class SimulateEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Simulate_ReturnsSeedAndContractShape()
    {
        using var client = factory.CreateClient();
        var design = new MissionCatalog().Find("sat-orbit")!.Presets[1].Design;

        var response = await client.PostAsJsonAsync("/api/simulate", new { design, seed = 42 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var r = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(42, r.GetProperty("seed").GetInt64());
        foreach (var key in new[] { "evaluation", "timeline", "groundTrack", "contacts", "rendezvous", "events", "report" })
            Assert.True(r.TryGetProperty(key, out _), key);
        var report = r.GetProperty("report");
        Assert.Equal(4, report.GetProperty("segments").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, report.GetProperty("comparison").ValueKind);
    }

    [Fact]
    public async Task Simulate_WithoutSeed_ChoosesOne()
    {
        using var client = factory.CreateClient();
        var design = new MissionCatalog().Find("cubesat-learn")!.Presets[0].Design;

        var r = await (await client.PostAsJsonAsync("/api/simulate", new { design })).Content.ReadFromJsonAsync<JsonElement>();

        Assert.True(r.GetProperty("seed").GetInt64() > 0);
    }
}
