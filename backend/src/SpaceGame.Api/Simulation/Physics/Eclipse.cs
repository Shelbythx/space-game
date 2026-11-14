using static SpaceGame.Api.Simulation.Physics.Constants;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>Тінь, β-кут і положення Сонця (план 2.3).</summary>
public static class Eclipse
{
    /// <summary>
    /// Частка витка в тіні (кругова орбіта, циліндрична тінь, лише умбра):
    /// f = (1/π)·arccos(√(h² + 2Rh) / ((R + h)·cos β)), якщо |β| &lt; arcsin(R/r), інакше 0.
    /// N10, слайди 135–138: sin θ = √((1/cos²β)·((rₑ/(rₑ+h))² − sin²β)), затінена дуга 2(π − θ);
    /// f = 2(π − θ)/2π після спрощення дає формулу вище.
    /// </summary>
    public static double Fraction(double altitudeKm, double betaDeg = 0)
    {
        var r = OrbitMath.RadiusKm(altitudeKm);
        var beta = Rad(betaDeg);
        if (Math.Abs(beta) >= Math.Asin(EarthRadiusKm / r))
            return 0;
        var h = altitudeKm;
        var arg = Math.Sqrt(h * h + 2 * EarthRadiusKm * h) / (r * Math.Cos(beta));
        return Math.Acos(Math.Clamp(arg, -1, 1)) / Math.PI;
    }

    /// <summary>
    /// β-кут: β = sin⁻¹(cos Γ·sin Ω·sin i − sin Γ·cos ε·cos Ω·sin i + sin Γ·sin ε·cos i).
    /// N10, слайд 125 (Γ — екліптична довгота Сонця, ε — нахил екліптики, Ω — вузол).
    /// </summary>
    public static double BetaDeg(double sunLongitudeDeg, double raanDeg, double inclinationDeg)
    {
        double g = Rad(sunLongitudeDeg), o = Rad(raanDeg), i = Rad(inclinationDeg), e = Rad(ObliquityDeg);
        var s = Math.Cos(g) * Math.Sin(o) * Math.Sin(i)
                - Math.Sin(g) * Math.Cos(e) * Math.Cos(o) * Math.Sin(i)
                + Math.Sin(g) * Math.Sin(e) * Math.Cos(i);
        return Deg(Math.Asin(Math.Clamp(s, -1, 1)));
    }

    /// <summary>
    /// Екліптична довгота Сонця Γ за датою: середня довгота барицентра Земля–Місяць + 180°,
    /// L = 100,46457166° + 35999,37244981°·T, T — юліанські століття від J2000.
    /// N14 (JPL SSD «Approximate Positions of the Planets», Table 1, «EM Bary»).
    /// </summary>
    public static double SunLongitudeDeg(DateTime utc)
    {
        var julianCenturies = (utc - new DateTime(2000, 1, 1, 12, 0, 0, DateTimeKind.Utc)).TotalDays / 36_525.0;
        var l = 100.46457166 + 35_999.37244981 * julianCenturies + 180;
        return ((l % 360) + 360) % 360;
    }
}
