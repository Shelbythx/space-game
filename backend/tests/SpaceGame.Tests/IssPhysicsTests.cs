using SpaceGame.Api.Catalogs;
using SpaceGame.Api.Simulation;
using SpaceGame.Api.Simulation.Physics;

namespace SpaceGame.Tests;

/// <summary>Критерії задачі 022 (фізика місії на МКС).</summary>
public sealed class IssPhysicsTests
{
    private const double IssInclination = 51.64;

    [Fact]
    public void Hohmann200To418Km_63Plus63()
    {
        var (dv1, dv2) = Rendezvous.HohmannMs(200, 418);
        Assert.InRange(dv1, 62, 64);
        Assert.InRange(dv2, 62, 64);
    }

    [Theory]
    [InlineData(37.8)] // Воллопс
    [InlineData(28.5)] // мис Канаверал
    [InlineData(0)]    // екватор: i = 51,6° ≥ φ, старт одразу в площину МКС
    public void SitesBelowIssInclination_NeedNoPlaneChange(double latitude)
    {
        Assert.Equal(0, LaunchGeometry.PlaneChangeNeededDeg(latitude, IssInclination));
        Assert.Equal(0, LaunchGeometry.PlaneChangeDeltaVms(latitude, IssInclination, 200));
    }

    [Fact]
    public void Kodiak57_4_NeedsPlaneChange()
    {
        Assert.Equal(5.76, LaunchGeometry.PlaneChangeNeededDeg(57.4, IssInclination), 2);
        Assert.InRange(LaunchGeometry.PlaneChangeDeltaVms(57.4, IssInclination, 200), 770, 800);
        Assert.Equal(LaunchGeometry.EarthRotationSpeedMs(57.4), LaunchGeometry.RotationBonusAlongOrbitMs(57.4, IssInclination), 6);
    }

    [Fact]
    public void EquatorIsNoCheaperForIss_RotationBonusAlongOrbitIsTheSame()
    {
        var equator = LaunchGeometry.RotationBonusAlongOrbitMs(0, IssInclination);
        var cape = LaunchGeometry.RotationBonusAlongOrbitMs(28.5, IssInclination);
        Assert.Equal(equator, cape, 6);
        Assert.Equal(465.1 * Math.Cos(IssInclination * Math.PI / 180), equator, 0);
    }

    [Fact]
    public void Phasing_And_LeadAngle()
    {
        var r1 = OrbitMath.RadiusKm(200);
        var r2 = OrbitMath.RadiusKm(418);
        Assert.InRange(Rendezvous.PhasingDegPerOrbit(r1, r2), 16, 18);
        Assert.InRange(Rendezvous.WorstCasePhasingDays(r1, r2), 1.2, 1.4);
        Assert.InRange(Rendezvous.TransferLeadAngleDeg(r1, r2), 0, 10);
    }

    [Fact]
    public void Evaluate_IssFromWallops_NoPlaneChangeCheckWarning()
    {
        var catalog = new MissionCatalog();
        var mission = catalog.Find("iss-cargo")!;
        var design = mission.Presets[0].Design with { LaunchSiteId = "wallops" };

        var e = Evaluator.Evaluate(design, mission).Evaluation;

        Assert.Equal(0, e.Rendezvous!.PlaneChangeDeltaVms);
        Assert.Equal("ok", e.Checks.Single(c => c.Code == "check.launch.siteInclination").Status);
    }
}
