using SpaceGame.Api.Simulation.Physics;

namespace SpaceGame.Tests;

/// <summary>Формули на числах, перевірених вручну (критерій задачі 004).</summary>
public sealed class PhysicsTests
{
    [Fact]
    public void Sso705Km_Inclination98_2()
    {
        // N10, слайд 108: i = 98,2°, a = 7083 км (705 км).
        Assert.Equal(98.2, OrbitMath.SunSynchronousInclinationDeg(705), 1);
    }

    [Fact]
    public void Leo500Km_Beta0_Eclipse35_7Min()
    {
        // docs/catalogs.md: найдовша тінь на 500 км — 35,7 хв за виток.
        var period = OrbitMath.PeriodS(OrbitMath.RadiusKm(500)) / 60;
        var eclipseMin = Eclipse.Fraction(500, 0) * period;

        Assert.Equal(94.6, period, 1);
        Assert.Equal(35.75, eclipseMin, 0.05);
    }

    [Fact]
    public void Eclipse_IsZeroWhenBetaAboveLimit_AndIss408KmMatchesNasaChart()
    {
        // N10, слайд 139: 408 км — тінь ≈ 0,39 витка при β = 0 і зникає біля β ≈ 70°.
        Assert.Equal(0.39, Eclipse.Fraction(408, 0), 2);
        Assert.Equal(0, Eclipse.Fraction(408, 71));
        Assert.True(Eclipse.Fraction(408, 69) > 0);
    }

    [Fact]
    public void Sso705Km_PeriodAndSpeed()
    {
        var r = OrbitMath.RadiusKm(705);
        Assert.Equal(98.88, OrbitMath.PeriodS(r) / 60, 0.01); // docs/catalogs.md: ~99 хв
        Assert.Equal(7.50, OrbitMath.CircularSpeedKmS(r), 2);
        Assert.Equal(OrbitMath.CircularSpeedKmS(r), OrbitMath.VisVivaKmS(r, r), 10);
    }

    [Fact]
    public void Hohmann200To418Km_About63Plus63()
    {
        // План 2.10: 200 → 418 км — 63 + 63 м/с.
        var (dv1, dv2) = OrbitMath.Hohmann(OrbitMath.RadiusKm(200), OrbitMath.RadiusKm(418));
        Assert.Equal(63, dv1 * 1000, 0);
        Assert.Equal(63, dv2 * 1000, 0);
    }

    [Fact]
    public void PlaneChange_TenDegreesAt7_7KmS()
    {
        // 2·7,7·sin(5°) = 1,342 км/с.
        Assert.Equal(1.342, OrbitMath.PlaneChangeKmS(7.7, 10), 3);
        Assert.Equal(0, OrbitMath.PlaneChangeKmS(7.7, 0), 10);
    }

    [Fact]
    public void EarthRotation_465AtEquator_408AtCanaveral()
    {
        Assert.Equal(465.1, LaunchGeometry.EarthRotationSpeedMs(0), 1);
        Assert.Equal(408.7, LaunchGeometry.EarthRotationSpeedMs(28.5), 1);
        Assert.Equal(37.8, LaunchGeometry.MinimumInclinationDeg(37.8));
    }

    [Fact]
    public void Phasing200Vs418Km_About17DegPerOrbit()
    {
        // План 2.10: ~17°/виток.
        var deg = Rendezvous.PhasingDegPerOrbit(OrbitMath.RadiusKm(200), OrbitMath.RadiusKm(418));
        Assert.InRange(deg, 16, 18);
    }

    [Fact]
    public void NodalPrecession_SsoIsAbout0_986DegPerDay()
    {
        var rate = OrbitMath.NodalPrecessionRadS(OrbitMath.RadiusKm(705), 98.2);
        Assert.Equal(0.986, rate * 180 / Math.PI * 86_400, 0.005); // i округлено до 98,2°
    }

    [Fact]
    public void BetaAngle_EquatorialOrbitAtSolstice_EqualsObliquity()
    {
        // i = 0, Γ = 90°: β = sin⁻¹(sin ε) = 23,45°.
        Assert.Equal(23.45, Eclipse.BetaDeg(90, 0, 0), 6);
        Assert.Equal(0, Eclipse.BetaDeg(0, 0, 0), 6);
    }

    [Fact]
    public void SunLongitude_NearZeroAtMarchEquinox()
    {
        var gamma = Eclipse.SunLongitudeDeg(new DateTime(2026, 3, 20, 14, 46, 0, DateTimeKind.Utc));
        var diff = Math.Min(gamma, 360 - gamma);
        Assert.True(diff < 2.5, $"Γ = {gamma}");
    }

    [Theory]
    [InlineData(150, 2.076e-9)]
    [InlineData(400, 2.803e-12)]
    [InlineData(700, 3.070e-14)]
    [InlineData(1000, 3.561e-15)]
    public void Atmosphere_NodesMatchStandardAtmosphereTableI(double altitudeKm, double density)
    {
        Assert.Equal(density, Atmosphere.DensityKgM3(altitudeKm), density * 1e-9);
    }

    [Fact]
    public void Atmosphere_InterpolatesMonotonically()
    {
        var a = Atmosphere.DensityKgM3(420);
        Assert.True(a < 2.803e-12 && a > 1.184e-12);
        Assert.Equal(0, Atmosphere.DensityKgM3(1500));
    }

    [Fact]
    public void Rocket_EquationRoundTrips()
    {
        // 100 кг, Δv = 220·9,80665·ln 2 → рівно половина маси.
        var dv = 220 * 9.80665 * Math.Log(2);
        Assert.Equal(50, Rocket.PropellantKg(100, dv, 220), 9);
        Assert.Equal(dv, Rocket.DeltaVms(100, 50, 220), 9);
    }

    [Fact]
    public void Link_RateFallsWithSquareOfDistance()
    {
        Assert.Equal(50_000, Contacts.RateKbps(50_000, 700));
        Assert.Equal(12_500, Contacts.RateKbps(50_000, 2000), 6);
    }

    [Fact]
    public void Drag_DecayIsFasterLowerAndLifetimeIsFinite()
    {
        var b = Drag.BallisticFactor(0.5, 50);
        Assert.True(Drag.DecayKmPerYear(400, b) > Drag.DecayKmPerYear(700, b));
        var low = Drag.LifetimeYears(400, b);
        var high = Drag.LifetimeYears(705, b);
        Assert.InRange(low, 0.3, 5);
        Assert.InRange(high, 25, 400);
        Assert.Equal(Drag.MaxLifetimeYears, Drag.LifetimeYears(20_200, b));
    }

    [Fact]
    public void Contacts_FairbanksSeesSsoAboutTenTimesADay()
    {
        // docs/catalogs.md (D55): «близько 10 сеансів на добу по 8 хвилин» для Аляски на SSO.
        var day = Contacts.SimulateDay(705, 98.2, [new StationSite("fairbanks", 64.86, -147.85)], 50_000);
        var s = day.Stations.Single();
        Assert.InRange(s.ContactsPerDay, 8, 12);
        Assert.InRange(s.MinutesPerDay / s.ContactsPerDay, 5, 11);
    }

    [Fact]
    public void Contacts_GeoAboveStationIsContinuous()
    {
        var day = Contacts.SimulateDay(35_786, 0, [new StationSite("guam", 13.59, 144.84)], 3000);
        Assert.True(day.UnionMinutes > 1430);
    }
}
