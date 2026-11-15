using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>Орбітальна механіка (план 2.2, 2.9, 2.10). Відстані — км, швидкості — км/с.</summary>
public static class OrbitMath
{
    public static double RadiusKm(double altitudeKm) => EarthRadiusKm + altitudeKm;

    /// <summary>Кругова швидкість v = √(μ/r). N10, слайд 154 (v₁ = √(μ/r₁)).</summary>
    public static double CircularSpeedKmS(double radiusKm) => Math.Sqrt(MuKm3S2 / radiusKm);

    /// <summary>Період T = 2π√(a³/μ). N4, 4.2.27 (4.140), с. 48.</summary>
    public static double PeriodS(double semiMajorAxisKm) =>
        2 * Math.PI * Math.Sqrt(Math.Pow(semiMajorAxisKm, 3) / MuKm3S2);

    /// <summary>Середній рух n = √(μ/a³), рад/с. N4, 4.2.26 (4.137), с. 48.</summary>
    public static double MeanMotionRadS(double semiMajorAxisKm) =>
        Math.Sqrt(MuKm3S2 / Math.Pow(semiMajorAxisKm, 3));

    /// <summary>
    /// Віс-віва v² = μ(2/r − 1/a): з енергії ξ = v²/2 − μ/r (N4, 4.116, с. 45) і E = −μ/(2a)
    /// (N10, слайд 154).
    /// </summary>
    public static double VisVivaKmS(double radiusKm, double semiMajorAxisKm) =>
        Math.Sqrt(MuKm3S2 * (2 / radiusKm - 1 / semiMajorAxisKm));

    /// <summary>
    /// Прецесія вузла від J2: Ω̇ = −3·J2·n·Rₑ²·cos i / (2a²(1−e²)²), рад/с. N10, слайд 105
    /// (тут e = 0).
    /// </summary>
    public static double NodalPrecessionRadS(double semiMajorAxisKm, double inclinationDeg) =>
        -3 * J2 * MeanMotionRadS(semiMajorAxisKm) * EarthRadiusKm * EarthRadiusKm * Math.Cos(Rad(inclinationDeg))
        / (2 * semiMajorAxisKm * semiMajorAxisKm);

    /// <summary>
    /// Нахил сонячно-синхронної орбіти: та сама рівність N10 (слайди 105–108), розв'язана
    /// відносно cos i при Ω̇ = 0,986°/добу.
    /// </summary>
    public static double SunSynchronousInclinationDeg(double altitudeKm)
    {
        var a = RadiusKm(altitudeKm);
        var cosI = -2 * SunSynchronousNodeRateRadS * Math.Pow(a, 3.5)
                   / (3 * J2 * EarthRadiusKm * EarthRadiusKm * Math.Sqrt(MuKm3S2));
        return Deg(Math.Acos(Math.Clamp(cosI, -1, 1)));
    }

    /// <summary>
    /// Гоманівський перехід між круговими орбітами r₁ → r₂, км/с.
    /// Δv₁ = √(μ/r₁)·(√(2r₂/(r₁+r₂)) − 1) — N10, слайди 154–155;
    /// Δv₂ = √(μ/r₂)·(1 − √(2r₁/(r₁+r₂))) — ⇒ той самий прийом у точці r₂.
    /// Для пониження (r₂ &lt; r₁) повертає модулі імпульсів.
    /// </summary>
    public static (double DeltaV1KmS, double DeltaV2KmS) Hohmann(double r1Km, double r2Km)
    {
        var dv1 = Math.Sqrt(MuKm3S2 / r1Km) * (Math.Sqrt(2 * r2Km / (r1Km + r2Km)) - 1);
        var dv2 = Math.Sqrt(MuKm3S2 / r2Km) * (1 - Math.Sqrt(2 * r1Km / (r1Km + r2Km)));
        return (Math.Abs(dv1), Math.Abs(dv2));
    }

    /// <summary>Час переходу T_t = π√((r₁+r₂)³/(8μ)), с. N10, слайд 155.</summary>
    public static double HohmannTransferTimeS(double r1Km, double r2Km) =>
        Math.PI * Math.Sqrt(Math.Pow(r1Km + r2Km, 3) / (8 * MuKm3S2));

    /// <summary>Зміна площини Δv = 2v·sin(Δi/2). N10, слайд 157.</summary>
    public static double PlaneChangeKmS(double speedKmS, double deltaInclinationDeg) =>
        2 * speedKmS * Math.Sin(Rad(Math.Abs(deltaInclinationDeg)) / 2);

    /// <summary>
    /// Найменший нахил зі стартового майданчика на широті φ: i ≥ |φ| — ⇒ з i = cos⁻¹(h_z/h)
    /// (N4, 4.2.20 (4.125), с. 46): у точці старту |h_z| ≤ h·cos φ.
    /// </summary>
    public static double MinimumInclinationDeg(double latitudeDeg) => Math.Abs(latitudeDeg);

    /// <summary>
    /// Швидкість обертання поверхні Землі на широті φ, м/с: ω·R·cos φ = 2πR/T_зор·cos φ
    /// (⇒ з констант N1; на екваторі ≈ 465 м/с).
    /// </summary>
    public static double EarthRotationSpeedMs(double latitudeDeg) =>
        EarthRotationRadS * EarthRadiusKm * 1000 * Math.Cos(Rad(latitudeDeg));

    /// <summary>
    /// Скільки градусів наздоганяє нижчий апарат за свій виток: Δθ = (n₁ − n₂)·T₁ — ⇒ з
    /// n = √(μ/a³) (N4, 4.137, с. 48).
    /// </summary>
    public static double PhasingDegPerOrbit(double chaserRadiusKm, double targetRadiusKm) =>
        Deg((MeanMotionRadS(chaserRadiusKm) - MeanMotionRadS(targetRadiusKm)) * PeriodS(chaserRadiusKm));
}
