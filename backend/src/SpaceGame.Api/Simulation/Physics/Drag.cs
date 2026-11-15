using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>Гальмування в атмосфері (план 2.8, D81).</summary>
public static class Drag
{
    private const double MuM3S2 = MuKm3S2 * 1e9;

    /// <summary>Балістичний параметр C_d·A/m, м²/кг.</summary>
    public static double BallisticFactor(double areaM2, double massKg) =>
        massKg <= 0 ? 0 : DragCoefficient * areaM2 / massKg;

    /// <summary>
    /// Прискорення від опору |a_d| = ½·ρ·v²·(C_d·A/m), м/с². N4, 5.2.3 (5.69), с. 62; сила —
    /// N2 (D = Cd·ρV²/2·A).
    /// </summary>
    public static double AccelerationMs2(double altitudeKm, double ballisticFactor)
    {
        var v = OrbitMath.CircularSpeedKmS(OrbitMath.RadiusKm(altitudeKm)) * 1000;
        return 0.5 * Atmosphere.DensityKgM3(altitudeKm) * v * v * ballisticFactor;
    }

    /// <summary>
    /// Швидкість падіння висоти кругової орбіти, км/рік:
    /// da/dt = −ρ·(C_d·A/m)·√(μ·a) — ⇒ з ξ = −μ/(2a) (N4, 4.116) і dξ/dt = v·a_d (N4, 5.69).
    /// </summary>
    public static double DecayKmPerYear(double altitudeKm, double ballisticFactor)
    {
        var aM = OrbitMath.RadiusKm(altitudeKm) * 1000;
        var dadt = Atmosphere.DensityKgM3(altitudeKm) * ballisticFactor * Math.Sqrt(MuM3S2 * aM);
        return dadt * SecondsPerYear / 1000;
    }

    /// <summary>Межа розрахунку часу життя, років: довше — «практично вічно».</summary>
    public const double MaxLifetimeYears = 1000;

    /// <summary>
    /// Скільки років орбіта протримається без маневрів, доки висота не впаде нижче 180 км.
    /// Покрокове інтегрування da/dt з кроком, за який висота падає не більше ніж на 1 км.
    /// </summary>
    public static double LifetimeYears(double altitudeKm, double ballisticFactor, double solarActivityFactor = 1)
    {
        if (altitudeKm <= ReentryAltitudeKm)
            return 0;
        if (ballisticFactor <= 0 || altitudeKm > Atmosphere.TopAltitudeKm)
            return MaxLifetimeYears;

        double h = altitudeKm, years = 0;
        while (h > ReentryAltitudeKm && years < MaxLifetimeYears)
        {
            var rate = DecayKmPerYear(h, ballisticFactor) * solarActivityFactor;
            if (rate <= 0)
                return MaxLifetimeYears;
            var dt = Math.Min(1.0 / rate, 1.0);
            h -= rate * dt;
            years += dt;
        }

        return Math.Min(years, MaxLifetimeYears);
    }

    /// <summary>
    /// Найвища кругова висота, з якої апарат зійде не довше ніж за <paramref name="years"/> років.
    /// </summary>
    public static double AltitudeForLifetimeKm(double years, double ballisticFactor, double upperKm)
    {
        double lo = ReentryAltitudeKm, hi = Math.Min(upperKm, Atmosphere.TopAltitudeKm);
        if (LifetimeYears(hi, ballisticFactor) <= years)
            return hi;
        for (var k = 0; k < 40; k++)
        {
            var mid = (lo + hi) / 2;
            if (LifetimeYears(mid, ballisticFactor) <= years) lo = mid; else hi = mid;
        }

        return lo;
    }

    /// <summary>
    /// Δv на компенсацію опору за час t, м/с: Δv = ½·ρ·v²·(C_d·A/m)·t — ⇒ інтеграл |a_d| (N4, 5.69).
    /// </summary>
    public static double MaintenanceDeltaVms(double altitudeKm, double ballisticFactor, double years) =>
        AccelerationMs2(altitudeKm, ballisticFactor) * years * SecondsPerYear;
}
