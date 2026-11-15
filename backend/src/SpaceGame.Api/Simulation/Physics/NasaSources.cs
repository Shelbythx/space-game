using SpaceGame.Api.Catalogs;

namespace SpaceGame.Api.Simulation.Physics;

/// <summary>
/// Джерела формул для розрахункових листів (D89, D94). Позначення N1–N14 — як у
/// docs/physics-sources.md; там же сторінки й статуси (✅ підтверджено, ⇒ виведено, 🎲 оцінка).
/// </summary>
public static class NasaSources
{
    public const string N1 = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html";
    public const string N2 = "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/";
    public const string N3 = "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/";
    public const string N4 = "https://ntrs.nasa.gov/api/citations/20080031744/downloads/20080031744.pdf";
    public const string N5 = "https://ntrs.nasa.gov/api/citations/19770009539/downloads/19770009539.pdf";
    public const string N6 = "https://standards.nasa.gov/sites/default/files/standards/NASA/C/0/nasa-std-871914c.pdf";
    public const string N7 = "https://www.nasa.gov/wp-content/uploads/2026/05/soa-2026.pdf";
    public const string N10 = "https://ntrs.nasa.gov/citations/20205003902";
    public const string N11 = "https://standards.nasa.gov/standard/GSFC/GSFC-STD-1000";
    public const string N12 = "https://ntrs.nasa.gov/api/citations/20090023862/downloads/20090023862.pdf";
    public const string N13 = "https://ntrs.nasa.gov/citations/20205005784";
    public const string N14 = "https://ssd.jpl.nasa.gov/planets/approx_pos.html";

    public static readonly Source Period = Source.Nasa("GMAT Mathematical Specifications, 4.2.27 (4.140), с. 48; кругова швидкість — Rickman, слайд 154", N4);
    public static readonly Source Eclipse = Source.Nasa("Rickman, «Introduction to Orbital Mechanics…», слайди 135–138 (лише умбра, β = 0)", N10);
    public static readonly Source Lifetime = Source.Calculated("⇒ з GMAT 5.2.3 (5.69), с. 62 і енергії 4.116, с. 45; густина — U.S. Standard Atmosphere 1976, Table I, с. 50–73");
    public static readonly Source Disposal = Source.Nasa("NASA-STD-8719.14C, Requirement 4.6-1a, 4.6.2.2, с. 42: не більше 25 років", N6);
    public static readonly Source Rocket = Source.Nasa("NASA Glenn, Ideal Rocket Equation: Δu = Veq·ln(mf/me), Veq = Isp·g0", N3);
    public static readonly Source MassMargin = Source.Nasa("GSFC-STD-1000 Rev I, Rule 1.06, табл. 1.06-1, с. 10: запас маси > 15 % (Pre-Phase A), лише суха маса", N11);
    public static readonly Source PowerMargin = Source.Nasa("GSFC-STD-1000 Rev I, табл. 1.06-1, с. 10: запас енергії від EOL > 25 % (Pre-Phase A); деградація панелей 2,75 %/рік — ігрова оцінка", N11);
    public static readonly Source EclipseBattery = Source.Nasa("DoD = E(removed)/E(rated)·100 — NASA/TM-2009-215751, Appendix A; допустима DoD 30 % / 70 % — ігрова оцінка", N12);
    public static readonly Source Budget = Source.Estimate("Сума цін з каталогу; ціни — ігрові оцінки (D51)");
    public static readonly Source DataGenerated = Source.Estimate("Потік інструмента × час на світлі (план 2.7); потоки інструментів — ігрові оцінки");
    public static readonly Source Downlink = Source.Calculated("⇒ rate ∝ 1/d²: SmallSat SOA 2026, 11.3.1, с. 308 (free space loss) і 3.2.1, с. 30 (обернені квадрати)");
    public static readonly Source Contacts = Source.Calculated("⇒ кут місця з вектора станція → апарат (як δ = sin⁻¹(z/r), GMAT 4.104, с. 45); маска 10° — NEN Users' Guide, розд. 3");
    public static readonly Source Timing = Source.Estimate("Строки виготовлення й запуску — ігрові оцінки (D66)");
    public static readonly Source Hohmann = Source.Nasa("Rickman, «Introduction to Orbital Mechanics…», слайди 151–155 (Δv₁); Δv₂ — ⇒ той самий прийом у r₂", N10);
    public static readonly Source PlaneChange = Source.Nasa("Rickman, «Introduction to Orbital Mechanics…», слайд 157: Δv = 2v·sin(θ/2)", N10);
    public static readonly Source Phasing = Source.Calculated("⇒ з середнього руху n = √(μ/a³), GMAT 4.2.26 (4.137), с. 48");
}
