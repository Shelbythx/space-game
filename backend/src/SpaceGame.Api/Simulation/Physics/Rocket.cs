using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>
/// Рівняння Ціолковського (план 2.8, 2.10): Δu = Veq·ln(mf/me), Veq = Isp·g0.
/// N3 (NASA Glenn, Ideal Rocket Equation).
/// </summary>
public static class Rocket
{
    /// <summary>Паливо на Δv: m_пал = m₀·(1 − e^(−Δv/(Isp·g₀))), кг.</summary>
    public static double PropellantKg(double initialMassKg, double deltaVms, double ispS) =>
        ispS <= 0 || deltaVms <= 0 ? (deltaVms > 0 ? double.PositiveInfinity : 0)
            : initialMassKg * (1 - Math.Exp(-deltaVms / (ispS * G0)));

    /// <summary>Δv з наявного палива: Δv = Isp·g₀·ln(m₀/(m₀ − m_пал)), м/с.</summary>
    public static double DeltaVms(double initialMassKg, double propellantKg, double ispS) =>
        ispS <= 0 || propellantKg <= 0 || initialMassKg <= propellantKg ? 0
            : ispS * G0 * Math.Log(initialMassKg / (initialMassKg - propellantKg));
}
