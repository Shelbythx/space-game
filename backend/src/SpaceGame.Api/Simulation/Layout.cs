using SpaceGame.Api.Catalogs;

namespace SpaceGame.Api.Simulation;

/// <summary>
/// Сторони корпусу (D93, план 2.12): earth · space · sun · inside. Правильні сторони й
/// наслідки не тієї сторони — 🎲 ігрові оцінки, крім косинуса для панелі (SmallSat SOA 2026,
/// 3.2.1, с. 30).
/// </summary>
public static class Layout
{
    public const string Earth = "earth";
    public const string Space = "space";
    public const string Sun = "sun";
    public const string Inside = "inside";

    public static readonly IReadOnlySet<string> Sides = new HashSet<string>([Earth, Space, Sun, Inside], StringComparer.Ordinal);

    /// <summary>Частка сеансу, яку зберігає антена не на тій стороні — 🎲 ігрова оцінка.</summary>
    public const double WrongSideRadioFactor = 0.5;

    public static string ExpectedSide(string categoryOrInstrumentId) => categoryOrInstrumentId switch
    {
        PartCategories.Solar => Sun,
        PartCategories.Battery => Inside,
        PartCategories.Radio => Earth,
        PartCategories.Computer => Inside,
        PartCategories.Adcs => Space,
        PartCategories.Propulsion => Space,
        "magnetometer" => Space,
        _ => Earth, // камера, радар, радіометр дивляться на Землю
    };

    /// <summary>
    /// Частка потужності панелі на корпусі за стороною: закон косинуса кута до Сонця
    /// (SmallSat SOA 2026, 3.2.1, с. 30). sun — cos 0° = 1; space — в середньому cos 60° = 0,5
    /// (🎲); earth і inside — 0.
    /// </summary>
    public static double BodyPanelFactor(string side) => side switch
    {
        Sun => 1,
        Space => Math.Cos(Math.PI / 3),
        _ => 0,
    };

    /// <summary>Фактичні сторони: у simple — автоматично правильні; в advanced — як задав гравець.</summary>
    public static Dictionary<string, string> Resolve(Design design)
    {
        var keys = PartCategories.All.Where(c => c != PartCategories.Bus).Concat(design.InstrumentIds);
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var key in keys)
        {
            var side = design.Version == "advanced" && design.Layout is not null && design.Layout.TryGetValue(key, out var chosen)
                ? chosen
                : ExpectedSide(key);
            result[key] = side;
        }

        return result;
    }
}
