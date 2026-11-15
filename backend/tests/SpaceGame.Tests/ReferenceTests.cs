using System.Net.Http.Json;
using System.Text.Json;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.References;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Tests;

// Задача 023: бібліотека схожих місій (docs/reference-missions.md) і report.comparison.
public sealed class ReferenceTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly MissionCatalog Catalog = new();
    private static readonly SpaceWeatherData NoStorms = SpaceWeatherData.None(new DateOnly(2015, 1, 1));

    public static TheoryData<string> MissionIds => new() { "cubesat-learn", "sat-orbit", "iss-cargo" };

    public static TheoryData<string> ModeledIds()
    {
        var data = new TheoryData<string>();
        foreach (var r in ReferenceLibrary.All.Where(r => r.Kind == "modeled"))
            data.Add(r.Id);
        return data;
    }

    [Fact]
    public void Library_LoadsBothBlocksWithUniqueIds()
    {
        var all = ReferenceLibrary.All;
        Assert.Equal(11, all.Count(r => r.Kind == "real"));
        Assert.Equal(13, all.Count(r => r.Kind == "modeled"));
        Assert.Equal(all.Count, all.Select(r => r.Id).Distinct().Count());
        Assert.All(all.Where(r => r.Kind == "real"), r => Assert.Equal("nasa", r.Source?.Kind));
        Assert.All(all.Where(r => r.Kind == "modeled"), r => Assert.NotNull(r.Design));
    }

    [Theory]
    [MemberData(nameof(ModeledIds))]
    public void ModeledDesign_IsValidForCurrentCatalog(string id)
    {
        var design = ReferenceLibrary.All.Single(r => r.Id == id).Design!;
        var errors = DesignValidator.Validate(design, Catalog, out var mission);
        Assert.Empty(errors);

        // docs/reference-missions.md, «Як перевірити знову»: без fail у mission, launch і space
        // (після 019 жоден еталон не падає за орбітою), крім iss-cheapest, що навмисно недовозить
        // вантаж. iss-best (6992 кг) не вміщується в medium на 6100 кг (034); еталон зменшує 019.
        var e = Evaluator.Evaluate(design, mission!).Evaluation;
        var fails = e.Checks.Where(c => c.Status == "fail" && c.Segment is "mission" or "launch" or "space").Select(c => c.Code).ToList();
        if (id == "iss-cheapest")
            Assert.All(fails, code => Assert.Contains("cargo", code, StringComparison.OrdinalIgnoreCase));
        else if (id == "iss-best")
            Assert.All(fails, code => Assert.Equal("check.launch.overCapacity", code));
        else
            Assert.Empty(fails);
    }

    [Theory]
    [MemberData(nameof(MissionIds))]
    public void EveryMission_HasRealAndModeledCandidates(string missionId)
    {
        var candidates = ReferenceLibrary.For(Catalog.Find(missionId)!);
        Assert.Contains(candidates, c => c.Record.Kind == "real");
        Assert.Contains(candidates, c => c.Record.Kind == "modeled");
    }

    [Theory]
    [MemberData(nameof(MissionIds))]
    public void EveryPreset_GetsComparisonForItsMission(string missionId)
    {
        var mission = Catalog.Find(missionId)!;
        foreach (var preset in mission.Presets)
        {
            var c = Simulator.Simulate(preset.Design, mission, 7, NoStorms).Report.Comparison;
            Assert.NotNull(c);
            var record = ReferenceLibrary.All.Single(r => r.Id == c.MissionId);
            Assert.True(record.GameMissionId == missionId || record.Design?.MissionId == missionId);
            Assert.Equal(record.NameCode, c.NameCode);
            Assert.Equal(c.Kind == "real" ? record.Source : null, c.Source);
            Assert.NotEmpty(c.Deltas);
        }
    }

    [Theory]
    [MemberData(nameof(ModeledIds))]
    public void ModeledDesign_IsClosestToItself(string id)
    {
        var record = ReferenceLibrary.All.Single(r => r.Id == id);
        var mission = Catalog.Find(record.Design!.MissionId)!;

        var c = Simulator.Simulate(record.Design, mission, ReferenceLibrary.ModeledSeed, NoStorms).Report.Comparison!;

        // Справжня місія з тими самими числами могла б зрівнятися, але не виграти: при рівній
        // відстані перевага справжній, тому допускаємо й її з нульовою відстанню.
        if (c.MissionId != id)
            Assert.Equal("real", c.Kind);
        else
            Assert.All(c.Deltas.Values, v => Assert.Equal(0, v));
    }

    [Fact]
    public void IssDeltas_HaveCargoAndBudget_NotOrbit()
    {
        var mission = Catalog.Find("iss-cargo")!;
        var design = ReferenceLibrary.All.Single(r => r.Id == "iss-best").Design! with
        {
            Cargo = [new CargoItem("science", 1000), new CargoItem("crew-supplies", 1000)],
        };
        var c = Simulator.Simulate(design, mission, 3, NoStorms).Report.Comparison!;

        Assert.Contains("cargoKg", c.Deltas.Keys);
        Assert.DoesNotContain("altitudeKm", c.Deltas.Keys);
        Assert.Equal(c.Kind == "modeled", c.Deltas.ContainsKey("budgetK"));
    }

    [Fact]
    public void RealMission_DataUsesGameMissionDuration()
    {
        // ICESat-2: 72,5 ГБ на добу × тривалість місії гри (docs/reference-missions.md).
        var mission = Catalog.Find("sat-orbit")!;
        var icesat = ReferenceLibrary.For(mission).Single(c => c.Record.Id == "icesat-2");
        var days = mission.Goal.OperationMonths!.Value * SpaceGame.Api.Simulation.Physics.Constants.DaysPerMonth;
        Assert.Equal(72.5 * days, icesat.Metrics.DataGb!.Value, 6);
    }

    [Fact]
    public async Task SimulateEndpoint_ReturnsComparisonInContractShape()
    {
        var design = Catalog.Find("sat-orbit")!.Presets[0].Design;
        var response = await factory.CreateClient().PostAsJsonAsync("/api/simulate", new { design, seed = 5 });
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var c = doc.RootElement.GetProperty("report").GetProperty("comparison");
        Assert.Equal(JsonValueKind.Object, c.ValueKind);
        foreach (var key in new[] { "kind", "missionId", "nameCode", "deltas", "source" })
            Assert.True(c.TryGetProperty(key, out _), key);
        var allowed = new[] { "altitudeKm", "inclinationDeg", "massKg", "dataGb", "cargoKg", "budgetK" };
        Assert.All(c.GetProperty("deltas").EnumerateObject(), p => Assert.Contains(p.Name, allowed));
    }
}
