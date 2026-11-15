using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>Перехід і фазування до МКС (план 2.10, задача 022).</summary>
public static class Rendezvous
{
    /// <summary>
    /// Сума імпульсів Гомана між круговими орбітами, м/с: Δv₁ (N10, слайди 154–155) + Δv₂ (⇒).
    /// </summary>
    public static (double DeltaV1Ms, double DeltaV2Ms) HohmannMs(double fromAltitudeKm, double toAltitudeKm)
    {
        var (dv1, dv2) = OrbitMath.Hohmann(OrbitMath.RadiusKm(fromAltitudeKm), OrbitMath.RadiusKm(toAltitudeKm));
        return (dv1 * 1000, dv2 * 1000);
    }

    /// <summary>
    /// Скільки градусів наздоганяє нижчий апарат за свій виток: Δθ = (n₁ − n₂)·T₁ — ⇒ з
    /// n = √(μ/a³) (N4, 4.137, с. 48).
    /// </summary>
    public static double PhasingDegPerOrbit(double chaserRadiusKm, double targetRadiusKm) =>
        Deg((OrbitMath.MeanMotionRadS(chaserRadiusKm) - OrbitMath.MeanMotionRadS(targetRadiusKm)) * OrbitMath.PeriodS(chaserRadiusKm));

    /// <summary>Діб фазування для найгіршого початкового кута (360°).</summary>
    public static double WorstCasePhasingDays(double chaserRadiusKm, double targetRadiusKm)
    {
        var deg = PhasingDegPerOrbit(chaserRadiusKm, targetRadiusKm);
        return deg > 0 ? 360 / deg * OrbitMath.PeriodS(chaserRadiusKm) / SecondsPerDay : double.PositiveInfinity;
    }

    /// <summary>
    /// На скільки градусів ціль має бути попереду в мить першого імпульсу Гомана:
    /// 180° − n₂·T_t (T_t — N10, слайд 155).
    /// </summary>
    public static double TransferLeadAngleDeg(double chaserRadiusKm, double targetRadiusKm)
    {
        var lead = 180 - Deg(OrbitMath.MeanMotionRadS(targetRadiusKm) * OrbitMath.HohmannTransferTimeS(chaserRadiusKm, targetRadiusKm));
        return ((lead % 360) + 360) % 360;
    }
}
