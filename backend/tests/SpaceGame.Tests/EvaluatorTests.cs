using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Model;

namespace SpaceGame.Tests;

public sealed class EvaluatorTests
{
    private static readonly MissionCatalog Catalog = new();
    private static Mission SatOrbit => Catalog.Find("sat-orbit")!;

    private static Design Sat(string radio, string adcs = "adcs-fine", string computer = "cpu-power", string instrument = "camera",
        string launch = "small", string orbit = "sso", string prop = "prop-chem", string[]? stations = null) => new()
    {
        MissionId = "sat-orbit",
        Orbit = OrbitChoice.Preset(orbit),
        LaunchId = launch,
        Parts = new("bus-m", "solar-deploy", "bat-m", radio, computer, adcs, prop),
        InstrumentIds = [instrument],
        GroundStationIds = stations ?? ["fairbanks"],
    };

    private static Evaluation Eval(Design d) => Evaluator.Evaluate(d, Catalog.Find(d.MissionId)!).Evaluation;

    private static Check? CheckByCode(Evaluation e, string code) => e.Checks.FirstOrDefault(c => c.Code == code);

    [Fact]
    public void D55_UhfRadioMissesGoal_XRadioWithAlaskaReachesIt()
    {
        var uhf = Eval(Sat("radio-uhf"));
        var x = Eval(Sat("radio-x"));

        Assert.True(uhf.Resources.Data!.ExpectedTotalGb < 500, $"UHF: {uhf.Resources.Data.ExpectedTotalGb} GB");
        Assert.NotNull(CheckByCode(uhf, "check.user.goalMissed"));
        Assert.True(x.Resources.Data!.ExpectedTotalGb >= 500, $"X: {x.Resources.Data.ExpectedTotalGb} GB");
        Assert.NotNull(CheckByCode(x, "check.user.goalReached"));
    }

    [Fact]
    public void Sso705_OrbitNumbers()
    {
        var e = Eval(Sat("radio-x"));

        Assert.Equal(705, e.Orbit.AltitudeKm);
        Assert.Equal(98.2, e.Orbit.InclinationDeg);
        Assert.Equal(98.9, e.Orbit.PeriodMin);
        Assert.InRange(e.Orbit.EclipseFraction, 0.33, 0.37);
        Assert.InRange(e.Resources.Comms.ContactsPerDay, 8, 12);
    }

    [Fact]
    public void Evaluate_IsFasterThan300Ms()
    {
        Eval(Sat("radio-x")); // прогрів
        var sw = Stopwatch.StartNew();
        foreach (var mission in Catalog.All)
            foreach (var preset in mission.Presets)
                Eval(preset.Design);
        var perCall = sw.Elapsed.TotalMilliseconds / Catalog.All.Sum(m => m.Presets.Count);

        Assert.True(perCall < 300, $"{perCall:F1} ms");
    }

    [Fact]
    public void AllPresetsEvaluate_WithAllResourceSheets()
    {
        foreach (var mission in Catalog.All)
            foreach (var preset in mission.Presets)
            {
                var e = Eval(preset.Design);
                Assert.NotEmpty(e.Checks);
                Assert.All(e.Calc, sheet => Assert.False(string.IsNullOrEmpty(sheet.Source.Note)));
                foreach (var resource in new[] { "mass", "power", "budget", "comms", "time", "orbit", "propellant" })
                    Assert.Contains(e.Calc, s => s.Resource == resource);
                Assert.Equal(mission.Kind == MissionKinds.Iss, e.Rendezvous is not null);
                Assert.Equal(mission.Kind == MissionKinds.Iss, e.Resources.Cargo is not null);
                Assert.Equal(mission.Kind != MissionKinds.Iss, e.Resources.Data is not null);
            }
    }

    [Fact]
    public void Budget_IsSumOfPrices()
    {
        var e = Eval(Sat("radio-x"));
        // bus-m 40 + solar-deploy 15 + bat-m 6 + radio-x 25 + cpu-power 20 + adcs-fine 45 + prop-chem 40
        // + camera 80 + fairbanks 30 + small 250 = 551
        Assert.Equal(551, e.Resources.Budget.UsedK);
        Assert.Equal("fail", CheckByCode(e, "check.mission.overBudget")!.Status);
        Assert.Contains(e.Comments, c => c.Role == "planner" && c.Message.Code == "comment.planner.overBudget");
    }

    [Fact]
    public void Time_BestPartsReadyAtMonth12_SmallLaunchAt15()
    {
        var e = Eval(Sat("radio-x"));
        Assert.Equal(12, e.Resources.Time.ReadyMonth);
        Assert.Equal(15, e.Resources.Time.LaunchMonth);
    }

    [Fact]
    public void Rideshare_WaitsForNextFlight()
    {
        // Найкращі деталі готові на 12-му — рейс 9-го пропущено, летимо 15-м (D107).
        var best = Eval(Sat("radio-x", launch: "rideshare"));
        Assert.Equal(15, best.Resources.Time.LaunchMonth);
        Assert.Null(CheckByCode(best, "check.mission.launchLate"));

        // Скромні деталі встигають на рейс 9-го.
        var basic = Eval(SatOrbit.Presets.Single(p => p.Id == "radiometer-rideshare").Design);
        Assert.Equal(9, basic.Resources.Time.LaunchMonth);
    }

    [Fact]
    public void Mission1_GoalReachableWithinBudgetAndDeadline()
    {
        // Задача 031: перевірка еталонів (019) не знайшла жодного валідного проєкту на 500 ГБ.
        var e = Eval(SatOrbit.Presets.Single(p => p.Id == "camera-small").Design);
        Assert.True(e.Resources.Data!.ExpectedTotalGb >= 500, $"{e.Resources.Data.ExpectedTotalGb} GB");
        Assert.True(e.Resources.Budget.UsedK <= SatOrbit.Limits.BudgetK, $"{e.Resources.Budget.UsedK} k");
        Assert.True(e.Resources.Time.LaunchMonth <= SatOrbit.Limits.LaunchDeadlineMonth, $"month {e.Resources.Time.LaunchMonth}");
        Assert.NotNull(CheckByCode(e, "check.user.goalReached"));
    }

    [Fact]
    public void AllPresets_AreValidAndPassMissionLaunchSpace()
    {
        foreach (var mission in Catalog.All)
            foreach (var preset in mission.Presets)
            {
                Assert.Empty(DesignValidator.Validate(preset.Design, Catalog, out _));
                var fails = Eval(preset.Design).Checks
                    .Where(c => c.Status == "fail" && c.Segment is "mission" or "launch" or "space")
                    .Select(c => c.Code);
                Assert.True(!fails.Any(), $"{preset.Id}: {string.Join(", ", fails)}");
            }
    }

    [Fact]
    public void CubeSat_ColdGasFitsWithInstrument()
    {
        var first = Catalog.Find("cubesat-learn")!.Presets.Single(p => p.Id == "first-cubesat").Design;
        var e = Eval(first with { Parts = first.Parts with { Propulsion = "prop-cold" } });
        Assert.DoesNotContain(e.Checks, c => c.Status == "fail" && c.Segment is "mission" or "launch" or "space");
        Assert.True(e.Resources.Mass.SlotsUsed <= e.Resources.Mass.Slots, $"{e.Resources.Mass.SlotsUsed}/{e.Resources.Mass.Slots}");
    }

    [Fact]
    public void MissingRequirement_InstrumentProducesNoData()
    {
        var e = Eval(Sat("radio-x", computer: "cpu-basic"));
        Assert.Contains(e.Checks, c => c.Code == "check.space.missingRequirement" && (string)c.Params["partId"] == "camera");
        Assert.Equal(0, e.Resources.Data!.GeneratedGbPerDay);
    }

    [Fact]
    public void NoPropulsionAt705Km_DisposalTooLong()
    {
        var e = Eval(Sat("radio-x", prop: "prop-none"));
        Assert.True(e.Orbit.DisposalYears > 25, $"{e.Orbit.DisposalYears}");
        Assert.Equal("fail", CheckByCode(e, "check.space.disposalTooLong")!.Status);
    }

    [Fact]
    public void ChemicalPropulsionAt705Km_MeetsTwentyFiveYearRule()
    {
        var e = Eval(Sat("radio-x"));
        Assert.True(e.Orbit.DisposalYears <= 25, $"{e.Orbit.DisposalYears}");
        Assert.True(e.Resources.Propellant.DeltaVms > 10, $"{e.Resources.Propellant.DeltaVms}");
    }

    [Fact]
    public void GeoOrbit_NoDisposalRuleAndLongLifetime()
    {
        var e = Eval(Sat("radio-x", launch: "medium", orbit: "geo", stations: ["guam"]));
        Assert.Null(e.Orbit.DisposalYears);
        Assert.True(e.Orbit.EclipseFraction < 0.06);
        Assert.True(e.Resources.Comms.ContactMinutesPerDay > 1400);
    }

    [Fact]
    public void SimpleVersionHasAdvice_AdvancedHasNone()
    {
        var simple = Eval(Sat("radio-x"));
        var advanced = Eval(Sat("radio-x") with { Version = "advanced", MassReservePct = 15 });

        Assert.All(simple.Comments, c => Assert.NotNull(c.Advice));
        Assert.All(advanced.Comments, c => Assert.Null(c.Advice));
    }

    [Fact]
    public void Advanced_WrongSideAndLowReserve()
    {
        var d = Sat("radio-x") with
        {
            Version = "advanced",
            Layout = new Dictionary<string, string> { ["camera"] = "space" },
            MassReservePct = 5,
        };
        var e = Eval(d);

        Assert.Equal("space", e.Layout["camera"]);
        Assert.Contains(e.Checks, c => c.Code == "check.space.wrongSide" && (string)c.Params["partId"] == "camera");
        Assert.Equal(0, e.Resources.Data!.GeneratedGbPerDay);
        Assert.NotNull(CheckByCode(e, "check.space.massReserveLow"));
        Assert.Equal(5, e.Resources.Mass.ReservePct);
    }

    [Fact]
    public void MassReserve_DefaultIsGoldRules15PctOfDryMass()
    {
        var e = Eval(Sat("radio-x"));
        var m = e.Resources.Mass;
        Assert.Equal(15, m.ReservePct);
        Assert.Equal(m.UsedKg + m.ReserveKg, m.WithReserveKg, 1);
        Assert.Equal(300, m.LaunchCapacityKg);
    }

    [Fact]
    public void Iss_CapeCanaveralNoPlaneChange_KodiakNeedsOne()
    {
        var mission = Catalog.Find("iss-cargo")!;
        var design = mission.Presets[0].Design;

        var cape = Eval(design);
        var kodiak = Eval(design with { LaunchSiteId = "kodiak" });

        Assert.Equal(0, cape.Rendezvous!.PlaneChangeDeltaVms);
        Assert.InRange(cape.Rendezvous.HohmannDeltaVms, 120, 130);
        Assert.True(kodiak.Rendezvous!.PlaneChangeDeltaVms > 500);
        Assert.Equal("warn", CheckByCode(kodiak, "check.launch.siteInclination")!.Status);
        Assert.Equal(2500, cape.Resources.Cargo!.LoadedKg);
        Assert.Equal(40, cape.Resources.Cargo.SciencePct);
        Assert.Equal("tdrs", cape.OrbitStrip.Contacts.Single().StationId);
    }

    [Fact]
    public void Validator_ReportsContractCodes()
    {
        var bad = Sat("radio-q") with { Relay = true, Layout = new Dictionary<string, string>() };
        var errors = DesignValidator.Validate(bad, Catalog, out _);

        Assert.Contains("design.unknownPart", errors["parts.radio"]);
        Assert.Contains("design.issFieldNotAllowed", errors["relay"]);
        Assert.Contains("design.advancedFieldNotAllowed", errors["layout"]);

        var unknown = DesignValidator.Validate(Sat("radio-x") with { MissionId = "mars" }, Catalog, out _);
        Assert.Contains("design.unknownMission", unknown["missionId"]);
    }
}

public sealed class EvaluateEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Evaluate_ReturnsContractShape()
    {
        using var client = factory.CreateClient();
        var design = new MissionCatalog().Find("sat-orbit")!.Presets[1].Design;

        var response = await client.PostAsJsonAsync("/api/evaluate", design);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var e = await response.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var key in new[] { "orbit", "resources", "rendezvous", "layout", "orbitStrip", "calc", "checks", "comments" })
            Assert.True(e.TryGetProperty(key, out _), key);
        Assert.Equal(JsonValueKind.Null, e.GetProperty("rendezvous").ValueKind);
        Assert.Equal(JsonValueKind.Null, e.GetProperty("resources").GetProperty("cargo").ValueKind);
        Assert.True(e.GetProperty("orbit").TryGetProperty("lifetimeYears", out _));
        var comment = e.GetProperty("comments")[0];
        Assert.True(comment.TryGetProperty("advice", out _));
    }

    [Fact]
    public async Task Evaluate_InvalidDesign_Returns400WithErrorCodes()
    {
        using var client = factory.CreateClient();
        var design = new MissionCatalog().Find("sat-orbit")!.Presets[1].Design with { LaunchId = "falcon" };

        var response = await client.PostAsJsonAsync("/api/evaluate", design);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("design.unknownLaunch", problem.GetProperty("errors").GetProperty("launchId")[0].GetString());
    }
}
