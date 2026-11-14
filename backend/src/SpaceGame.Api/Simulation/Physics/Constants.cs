namespace SpaceGame.Api.Simulation.Physics;

/// <summary>Константи (план 2.1). Джерела — docs/physics-sources.md, розділ «Константи».</summary>
public static class Constants
{
    /// <summary>μ Землі, км³/с². N1 (NASA Earth Fact Sheet): 0,39860·10⁶ км³/с².</summary>
    public const double MuKm3S2 = 398_600.4418;

    /// <summary>Екваторіальний радіус, км. N1.</summary>
    public const double EarthRadiusKm = 6378.137;

    /// <summary>J2. N1: 1082,63·10⁻⁶.</summary>
    public const double J2 = 1.08263e-3;

    /// <summary>Зоряний період обертання Землі, с. N1: 23,9345 год.</summary>
    public const double SiderealDayS = 23.9345 * 3600;

    /// <summary>Кутова швидкість обертання Землі, рад/с (= 2π / зоряна доба, N1).</summary>
    public const double EarthRotationRadS = 2 * Math.PI / SiderealDayS;

    /// <summary>Сонячна стала, Вт/м². N1: solar irradiance 1361,0 Вт/м².</summary>
    public const double SolarConstantWm2 = 1361.0;

    /// <summary>Нахил екліптики, градуси. N10, слайд 117: ε = 23,45°.</summary>
    public const double ObliquityDeg = 23.45;

    /// <summary>g₀, м/с². N3 (Veq = Isp·g0); значення — стандартне (🟡).</summary>
    public const double G0 = 9.80665;

    /// <summary>Швидкість вузла сонячно-синхронної орбіти: 0,986°/добу (N10, слайд 107) = 1,99106·10⁻⁷ рад/с.</summary>
    public const double SunSynchronousNodeRateRadS = 1.99106e-7;

    /// <summary>Сходження з орбіти — висота нижче 180 км (план 2.8).</summary>
    public const double ReentryAltitudeKm = 180;

    /// <summary>Маска кута місця станції, градуси (план 2.5; NEN Users' Guide задає станції при 5°/10°).</summary>
    public const double ElevationMaskDeg = 10;

    /// <summary>Опорна дальність паспортної швидкості радіо, км (D80).</summary>
    public const double LinkReferenceKm = 1000;

    /// <summary>Коефіцієнт опору C_d (план 2.8) — ігрова оцінка.</summary>
    public const double DragCoefficient = 2.2;

    /// <summary>ККД сонячних панелей для площі розкладених панелей — ігрова оцінка.</summary>
    public const double SolarCellEfficiency = 0.28;

    public const double SecondsPerDay = 86_400;
    public const double DaysPerYear = 365.25;
    public const double SecondsPerYear = SecondsPerDay * DaysPerYear;
    public const double DaysPerMonth = DaysPerYear / 12;

    public static double Deg(double rad) => rad * 180 / Math.PI;
    public static double Rad(double deg) => deg * Math.PI / 180;
}
