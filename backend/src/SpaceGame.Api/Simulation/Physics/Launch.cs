using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>Запуск із широти (план 2.9, задача 022).</summary>
public static class LaunchGeometry
{
    /// <summary>
    /// Найменший нахил зі стартового майданчика на широті φ: i ≥ |φ| — ⇒ з i = cos⁻¹(h_z/h)
    /// (N4, 4.2.20 (4.125), с. 46): у точці старту |h_z| ≤ h·cos φ.
    /// </summary>
    public static double MinimumInclinationDeg(double latitudeDeg) => Math.Abs(latitudeDeg);

    /// <summary>
    /// На скільки градусів треба повернути площину, щоб вийти на нахил цілі: Δi = max(0, |φ| − i).
    /// Якщо i ≥ |φ| — старт одразу в площину цілі, зміна площини не потрібна.
    /// </summary>
    public static double PlaneChangeNeededDeg(double latitudeDeg, double targetInclinationDeg) =>
        Math.Max(0, MinimumInclinationDeg(latitudeDeg) - targetInclinationDeg);

    /// <summary>
    /// Δv зміни площини на круговій орбіті виведення, м/с: 2v·sin(Δi/2) (N10, слайд 157).
    /// </summary>
    public static double PlaneChangeDeltaVms(double latitudeDeg, double targetInclinationDeg, double insertionAltitudeKm) =>
        OrbitMath.PlaneChangeKmS(
            OrbitMath.CircularSpeedKmS(OrbitMath.RadiusKm(insertionAltitudeKm)),
            PlaneChangeNeededDeg(latitudeDeg, targetInclinationDeg)) * 1000;

    /// <summary>
    /// Швидкість обертання поверхні Землі на широті φ, м/с: ω·R·cos φ = 2πR/T_зор·cos φ
    /// (⇒ з констант N1; на екваторі ≈ 465 м/с; N9, розд. 14 — якісно).
    /// </summary>
    public static double EarthRotationSpeedMs(double latitudeDeg) =>
        EarthRotationRadS * EarthRadiusKm * 1000 * Math.Cos(Rad(latitudeDeg));

    /// <summary>
    /// Скільки з обертання Землі йде вздовж орбіти з нахилом i, м/с: ω·R·cos φ·sin Az, де
    /// sin Az = cos i / cos φ → ω·R·cos i. ⇒ Не залежить від широти, якщо i ≥ |φ|: тому з
    /// екватора на МКС (51,6°) не дешевше, ніж із мису Канаверал (план 2.9).
    /// </summary>
    public static double RotationBonusAlongOrbitMs(double latitudeDeg, double inclinationDeg)
    {
        // φ > i: старт на схід (Az = 90°) у нахил |φ|, далі зміна площини — увесь бонус ω·R·cos φ.
        if (MinimumInclinationDeg(latitudeDeg) > inclinationDeg)
            return EarthRotationSpeedMs(latitudeDeg);
        return EarthRotationRadS * EarthRadiusKm * 1000 * Math.Cos(Rad(inclinationDeg));
    }
}
