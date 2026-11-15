using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Tests;

/// <summary>Критерії задачі 034: числа з docs/catalogs-iss.md і docs/catalogs-cubesat.md у коді.</summary>
public sealed class CatalogNumbersTests
{
    private static readonly MissionCatalog Catalog = new();
    private static readonly SpaceWeatherData NoStorms = SpaceWeatherData.None(new DateOnly(2015, 1, 1));

    [Theory]
    [InlineData(42)]
    [InlineData(7)]
    [InlineData(12345)]
    public void FirstCubesat_DeliversGoalAndSucceeds(long seed)
    {
        var mission = Catalog.Find("cubesat-learn")!;
        var design = mission.Presets.Single(p => p.Id == "first-cubesat").Design;

        var result = Simulator.Simulate(design, mission, seed, NoStorms);

        Assert.True(result.Timeline.DataDeliveredGb[^1] >= mission.Goal.DataGb!.Value,
            $"{result.Timeline.DataDeliveredGb[^1]} GB < {mission.Goal.DataGb} GB");
        Assert.True(result.Report.Success);
    }

    [Fact]
    public void CubesatGoal_IsOneGigabyteInSixMonths()
    {
        var goal = Catalog.Find("cubesat-learn")!.Goal;
        Assert.Equal(1, goal.DataGb);
        Assert.Equal(6, goal.OperationMonths);
    }

    [Fact]
    public void IssPreset_FitsNewMediumLauncher()
    {
        var mission = Catalog.Find("iss-cargo")!;
        var medium = mission.Catalogs.Launches.Single(l => l.Id == "medium");
        Assert.Equal(6100, medium.CapacityKg["iss"]);

        var design = mission.Presets.Single(p => p.Id == "cape-medium").Design;
        Assert.Equal("medium", design.LaunchId);
        var e = Evaluator.Evaluate(design, mission).Evaluation;
        Assert.DoesNotContain(e.Checks, c => c.Status == "fail" && c.Segment is "mission" or "launch" or "space");
    }

    [Fact]
    public void IssNumbers_FromNasaSources()
    {
        var c = Catalog.Find("iss-cargo")!.Catalogs;
        Assert.Equal(4700, c.Parts.Single(p => p.Id == "ship-small").Specs.MaxMassKg);
        Assert.Equal(37.83, c.LaunchSites.Single(s => s.Id == "wallops").LatitudeDeg);
        Assert.Equal(
            [600d, 750, 400, 50, 40],
            new[] { "crew-supplies", "science", "vehicle-hardware", "spacewalk", "computer" }
                .Select(id => c.CargoCategories.Single(k => k.Id == id).TypicalMassKg));
        Assert.All(new object[] { c.Launches.Single(l => l.Id == "medium").Source, c.LaunchSites.Single(s => s.Id == "wallops").Source },
            s => Assert.Equal("nasa", ((Source)s).Kind));
    }
}
