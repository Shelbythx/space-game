namespace SpaceGame.Api.Simulation.Physics;

/// <summary>
/// Густина атмосфери за висотою (план 2.8). Вузли — U.S. Standard Atmosphere, 1976
/// (NASA-TM-X-74335), Part 4, Table I «Geometric Altitude, Metric Units», стовпець ρ:
/// с. 69 (150, 180, 200 км), с. 70 (250, 300), с. 71 (350–450), с. 72 (500–800), с. 73 (850–1000).
/// Між вузлами — ⇒ експоненційна інтерполяція ρ = ρᵢ·exp(−(h − hᵢ)/Hᵢ), Hᵢ — з двох сусідніх вузлів.
/// </summary>
public static class Atmosphere
{
    private static readonly (double AltitudeKm, double DensityKgM3)[] Table =
    [
        (150, 2.076e-9),
        (180, 5.194e-10),
        (200, 2.541e-10),
        (250, 6.073e-11),
        (300, 1.916e-11),
        (350, 7.014e-12),
        (400, 2.803e-12),
        (450, 1.184e-12),
        (500, 5.215e-13),
        (550, 2.384e-13),
        (600, 1.137e-13),
        (650, 5.712e-14),
        (700, 3.070e-14),
        (750, 1.788e-14),
        (800, 1.136e-14),
        (850, 7.824e-15),
        (900, 5.759e-15),
        (950, 4.453e-15),
        (1000, 3.561e-15),
    ];

    /// <summary>Вище останнього вузла таблиці (1000 км) гальмуванням нехтуємо.</summary>
    public const double TopAltitudeKm = 1000;

    public static double DensityKgM3(double altitudeKm)
    {
        if (altitudeKm > TopAltitudeKm)
            return 0;
        if (altitudeKm <= Table[0].AltitudeKm)
            return Table[0].DensityKgM3;

        for (var k = 1; k < Table.Length; k++)
        {
            var (h1, rho1) = Table[k];
            if (altitudeKm > h1)
                continue;
            var (h0, rho0) = Table[k - 1];
            var scaleHeight = (h1 - h0) / Math.Log(rho0 / rho1);
            return rho0 * Math.Exp(-(altitudeKm - h0) / scaleHeight);
        }

        return Table[^1].DensityKgM3;
    }
}
