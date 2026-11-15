namespace SpaceGame.Api.Catalogs;

/// <summary>
/// Каталоги трьох місій (D78). Місія 1 — числа з docs/catalogs.md (D56). Панелі, батареї,
/// радіо, комп'ютери, орієнтацію й двигуни звірено з NASA SmallSat SOA 2026 (задачі 016, 029:
/// таблиця й сторінка — у source); пам'ять комп'ютера, площа перерізу, клас корпусу й ціни —
/// ігрові оцінки; місія на МКС — docs/catalogs-iss.md (017, 034); CubeSat — docs/catalogs-cubesat.md (018, 034).
/// Кожне число має source (D51).
/// </summary>
public static class MissionData
{
    private const string SmallSatSoa = "https://www.nasa.gov/smallsat-institute/sst-soa/";
    private const string GoldRules = "https://standards.nasa.gov/standard/GSFC/GSFC-STD-1000";
    private const string Orb2PressKit = "https://www.nasa.gov/wp-content/uploads/2015/06/orb2_press_kit.pdf";
    private const string IssOem = "https://nasa-public-data.s3.amazonaws.com/iss-coords/current/ISS_OEM/ISS.OEM_J2K_EPH.txt";
    private const string Crs22Overview = "https://www.nasa.gov/wp-content/uploads/2021/05/spacex_crs-22_mision_overview_high_res.pdf";
    private const string CubeSat101 = "https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf";

    /// <summary>GSFC-STD-1000 Rev I, табл. 1.06-1: запас маси &gt; 15 % у Pre-Phase A (задача 026).</summary>
    public const double MassReserveRecommendedPct = 15;

    /// <summary>Усі місії; ліниво, щоб спільні статичні поля нижче вже були ініціалізовані.</summary>
    public static IReadOnlyList<Mission> All => LazyAll.Value;

    private static readonly Lazy<IReadOnlyList<Mission>> LazyAll = new(() => [CubesatLearn(), SatOrbit(), IssCargo()]);

    // ───────────────────────────── Спільні позиції ─────────────────────────────

    private static readonly Source StationSource = Source.Estimate(
        "Майданчик названо на сторінках NASA Near Space Network; координати — загальні географічні дані; діапазони й ціна — оцінка");

    private static GroundStation Fairbanks() =>
        new("fairbanks", "station.fairbanks", 64.86, -147.85, ["uhf", "s", "x"], 30, StationSource);

    private static GroundStation WhiteSands() =>
        new("white-sands", "station.whiteSands", 32.5, -106.61, ["s", "x"], 20, StationSource);

    private static GroundStation Guam() =>
        new("guam", "station.guam", 13.59, 144.84, ["s", "x"], 20, StationSource);

    private static Part Solar(string id, string tier, string nameCode, double powerW, double massKg, double priceK, string note) =>
        new(id, PartCategories.Solar, tier, nameCode, massKg, priceK, 0,
            new PartSpecs { PowerW = powerW }, [], Source.Nasa(note + "; маса — розрахунок за питомою потужністю", SmallSatSoa));

    private static Part Battery(string id, string tier, string nameCode, double capacityWh, double massKg, double priceK, string note) =>
        new(id, PartCategories.Battery, tier, nameCode, massKg, priceK, 0,
            new PartSpecs { CapacityWh = capacityWh },
            [], Source.Nasa(note + "; ємність — оцінка; маса — розрахунок", SmallSatSoa));

    private static Part Radio(string id, string tier, string nameCode, double rateKbps, string band, double massKg, double consumptionW, double priceK, IReadOnlyList<Requirement> requires, string product) =>
        new(id, PartCategories.Radio, tier, nameCode, massKg, priceK, consumptionW,
            new PartSpecs { RateKbps = rateKbps, Band = band }, requires,
            Source.Nasa($"Швидкість і маса — SmallSat SOA 2026, табл. 9-3, {product}; споживання — оцінка", SmallSatSoa));

    private static Part CpuBasic() =>
        new("cpu-basic", PartCategories.Computer, "basic", "part.cpuBasic", 0.1, 2, 0.4,
            new PartSpecs { StorageGb = 32 }, [],
            Source.Nasa("Споживання 0,4 Вт — SmallSat SOA 2026, табл. 8-4, с. 229: AAC Clyde Space Kryten-M3; маса й пам'ять 32 ГБ — оцінка", SmallSatSoa));

    private static Part CpuPower() =>
        new("cpu-power", PartCategories.Computer, "best", "part.cpuPower", 0.8, 20, 30,
            new PartSpecs { StorageGb = 512 }, [],
            Source.Nasa("Споживання 25–40 Вт — SmallSat SOA 2026, табл. 8-4, с. 235: Unibap iX10-100A; маса й пам'ять 512 ГБ — оцінка", SmallSatSoa));

    private static Part AdcsBasic() =>
        new("adcs-basic", PartCategories.Adcs, "basic", "part.adcsBasic", 0.47, 10, 3,
            new PartSpecs { AccuracyDeg = 1 }, [],
            Source.Nasa("Точність < 1° і маса 0,470 кг — SmallSat SOA 2026, табл. 5-2, с. 142: AAC Clyde Space iADCS-200; споживання — оцінка", SmallSatSoa));

    private static Part AdcsFine() =>
        new("adcs-fine", PartCategories.Adcs, "best", "part.adcsFine", 1.813, 45, 8,
            new PartSpecs { AccuracyDeg = 0.003 }, [],
            Source.Nasa("Точність 0,003° і маса 1,813 кг — SmallSat SOA 2026, табл. 5-2, с. 142: Blue Canyon XACT-100; споживання — оцінка", SmallSatSoa));

    private static Part PropNone() =>
        new("prop-none", PartCategories.Propulsion, "basic", "part.propNone", 0, 0, 0,
            new PartSpecs { IspS = 0, ThrustN = 0, PropellantKg = 0, PowerW = 0 }, [],
            Source.Estimate("Без двигуна (D81)"));

    private static Part PropCold() =>
        new("prop-cold", PartCategories.Propulsion, "basic", "part.propCold", 0.78, 15, 0,
            new PartSpecs { IspS = 40, ThrustN = 0.08, PropellantKg = 0.47, PowerW = 0 }, [],
            Source.Nasa("SmallSat SOA 2026, табл. 4-5, с. 109: VACCO C-POD (R236fa, 8 × 10 мН, Isp 40 с, 186 Н·с, повна маса 1,25 кг); суха маса й паливо — розрахунок; ціна — оцінка", SmallSatSoa));

    private static Part PropChem() =>
        new("prop-chem", PartCategories.Propulsion, "medium", "part.propChem", 8.6, 40, 0,
            new PartSpecs { IspS = 200, ThrustN = 4, PropellantKg = 6.1, PowerW = 0 }, [],
            Source.Nasa("SmallSat SOA 2026, табл. 4-3, с. 107: VACCO Integrated Propulsion System (LMP-103S, 4 × 1 Н, Isp 200 с, 12 кН·с, повна маса 14,7 кг); суха маса й паливо — розрахунок; ціна — оцінка", SmallSatSoa));

    private static Part PropElec() =>
        new("prop-elec", PartCategories.Propulsion, "best", "part.propElec", 1.25, 70, 0,
            new PartSpecs { IspS = 1960, ThrustN = 0.001, PropellantKg = 1.65, PowerW = 70 }, [],
            Source.Nasa("SmallSat SOA 2026, табл. 4-9, с. 113: Busek BIT-3 (йод, 1,0 мН, Isp 1960 с, 31,7 кН·с, повна маса 2,9 кг, 70 Вт); суха маса й паливо — розрахунок; ціна — оцінка", SmallSatSoa));

    private static readonly IReadOnlyList<Requirement> NeedsFinePointing = [new(PartCategories.Adcs, "adcs-fine")];

    private static readonly IReadOnlyList<Requirement> NeedsPowerCpuAndFinePointing =
        [new(PartCategories.Computer, "cpu-power"), new(PartCategories.Adcs, "adcs-fine")];

    private static readonly Source InstrumentSource = Source.Estimate(
        "Маса, споживання й потік даних — оцінка (на відкритих сторінках NASA чисел немає)");

    private static Instrument Magnetometer() =>
        new("magnetometer", "instrument.magnetometer", "basic", 0.2, 5, 1, 1, "low", [], InstrumentSource);

    private static Instrument Radiometer() =>
        new("radiometer", "instrument.radiometer", "medium", 1, 30, 3, 20, "medium", [], InstrumentSource);

    private static Instrument Camera() =>
        new("camera", "instrument.camera", "best", 12, 80, 25, 40_000, "high", NeedsPowerCpuAndFinePointing,
            Source.Estimate("Маса, споживання й потік — оцінка; роздільність 30 м і смуга 185 км — NASA (OLI, Landsat)"));

    private static Instrument Radar() =>
        new("radar", "instrument.radar", "best", 60, 200, 300, 200_000, "highest", NeedsPowerCpuAndFinePointing, InstrumentSource);

    private static readonly BuildMonths StandardBuild = new(3, 5, 8);

    // ───────────────────────────── Місія 1: «Супутник на орбіту» ─────────────────────────────

    private static Mission SatOrbit()
    {
        IReadOnlyList<Orbit> orbits =
        [
            new("leo", "orbit.leo", 500, 45, null, Source.Estimate("Висота 500 км — оцінка; нахил на вибір")),
            new("sso", "orbit.sso", 705, 98.2, null, Source.Nasa("Сонячно-синхронна 705 км, ~98° — NASA Catalog of Earth Satellite Orbits",
                "https://earthobservatory.nasa.gov/features/OrbitsCatalog")),
            new("meo", "orbit.meo", 20_200, 55, null, Source.Nasa("Середня орбіта 20 200 км, період 12 год — NASA Catalog of Earth Satellite Orbits",
                "https://earthobservatory.nasa.gov/features/OrbitsCatalog")),
            new("geo", "orbit.geo", 35_786, 0, null, Source.Nasa("Геостаціонарна 35 786 км — NASA Catalog of Earth Satellite Orbits",
                "https://earthobservatory.nasa.gov/features/OrbitsCatalog")),
        ];

        IReadOnlyList<Launch> launches =
        [
            new("rideshare", "launch.rideshare", 60, new Dictionary<string, double> { ["sso"] = 200 }, "sso", "medium",
                Source.Estimate("Попутний запуск (D52): орбіта фіксована, рейси на 9-му, 15-му й 21-му місяці (D66, D107); маса й ціна — оцінка")),
            new("small", "launch.small", 250, new Dictionary<string, double> { ["leo"] = 450, ["sso"] = 300 }, null, "large",
                Source.Nasa("Низька орбіта — Pegasus XL, до 453,59 кг (NASA LSP); SSO і ціна — оцінка")),
            new("medium", "launch.medium", 800,
                new Dictionary<string, double> { ["leo"] = 8000, ["sso"] = 6000, ["meo"] = 2500, ["geo"] = 1500 }, null, "large",
                Source.Estimate("Вантажопідйомність і ціна — оцінка")),
        ];

        return new Mission(
            "sat-orbit", MissionKinds.Orbit, "mission.satOrbit.title", "mission.satOrbit.briefing",
            MissionGoal.Data(500, 12),
            new MissionLimits(450, 18, MassReserveRecommendedPct),
            new MissionTiming(StandardBuild, 4, [9, 15, 21], new Dictionary<string, int> { ["small"] = 3, ["medium"] = 5 }),
            new MissionCatalogs(orbits, launches, SatelliteParts(), [Magnetometer(), Radiometer(), Camera(), Radar()],
                [Fairbanks(), WhiteSands(), Guam()], [], []),
            [
                new("radiometer-rideshare", "preset.satOrbit.radiometerRideshare", new Design
                {
                    MissionId = "sat-orbit", Orbit = OrbitChoice.Preset("sso"), LaunchId = "rideshare",
                    Parts = new("bus-s", "solar-deploy", "bat-s", "radio-s", "cpu-basic", "adcs-basic", "prop-cold"),
                    InstrumentIds = ["radiometer"], GroundStationIds = ["fairbanks"],
                }),
                new("camera-small", "preset.satOrbit.cameraSmall", new Design
                {
                    MissionId = "sat-orbit", Orbit = OrbitChoice.Preset("sso"), LaunchId = "rideshare",
                    Parts = new("bus-m", "solar-deploy", "bat-m", "radio-x", "cpu-power", "adcs-fine", "prop-chem"),
                    InstrumentIds = ["camera"], GroundStationIds = ["fairbanks"],
                }),
            ]);
    }

    private static IReadOnlyList<Part> SatelliteParts() =>
    [
        new("bus-s", PartCategories.Bus, "basic", "part.busS", 3, 5, 0,
            new PartSpecs { MaxMassKg = 12, Slots = 7, DragAreaM2 = 0.06, BusSize = "small" }, [],
            Source.Estimate("Маса, межа маси, місця й ціна — docs/catalogs.md (оцінка); площа перерізу й клас — оцінка до 016")),
        new("bus-m", PartCategories.Bus, "medium", "part.busM", 25, 40, 0,
            new PartSpecs { MaxMassKg = 150, Slots = 12, DragAreaM2 = 0.5, BusSize = "medium" }, [],
            Source.Estimate("Маса, межа маси, місця й ціна — docs/catalogs.md (оцінка); площа перерізу й клас — оцінка до 016")),
        new("bus-l", PartCategories.Bus, "best", "part.busL", 120, 150, 0,
            new PartSpecs { MaxMassKg = 500, Slots = 20, DragAreaM2 = 2, BusSize = "large" }, [],
            Source.Estimate("Маса, межа маси, місця й ціна — docs/catalogs.md (оцінка); площа перерізу й клас — оцінка до 016")),
        Solar("solar-body", "basic", "part.solarBody", 19.2, 0.26, 2, "19,2 Вт, 74 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: NPC Spacemind SP6X"),
        Solar("solar-deploy", "medium", "part.solarDeploy", 135, 4.4, 15, "135 Вт, 31 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: Pumpkin Dual Articulated Deployable Solar Array"),
        Solar("solar-roll", "best", "part.solarRoll", 1000, 10, 60, "1000 Вт, 100 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: Redwire ROSA"),
        Battery("bat-s", "basic", "part.batS", 40, 0.24, 1, "168,8 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: GomSpace NanoPower BP4"),
        Battery("bat-m", "medium", "part.batM", 150, 1.04, 6, "144 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: Astro Digital Direct Energy Pack"),
        Battery("bat-l", "best", "part.batL", 1000, 5.6, 30, "178,1 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: EnduroSat EPS IV"),
        Radio("radio-uhf", "basic", "part.radioUhf", 38.4, "uhf", 0.025, 4, 1, [], "с. 260: GomSpace NanoCom AX100"),
        Radio("radio-s", "medium", "part.radioS", 3000, "s", 0.34, 12, 8, [], "с. 263: EnduroSat S-Band Transceiver III"),
        Radio("radio-x", "best", "part.radioX", 50_000, "x", 0.13, 20, 25, NeedsFinePointing, "с. 265: AAC Clyde Space PULSAR-DATA XTX"),
        CpuBasic(),
        CpuPower(),
        AdcsBasic(),
        AdcsFine(),
        PropNone(),
        PropCold(),
        PropChem(),
        PropElec(),
    ];

    // ───────────────────────────── Рівень CubeSat (docs/catalogs-cubesat.md, задачі 018 і 034) ─────────────────────────────

    private static Mission CubesatLearn()
    {
        IReadOnlyList<Orbit> orbits =
        [
            new("iss-deploy", "orbit.issDeploy", 415, 51.64, null,
                Source.Calculated("Висота й нахил — орбіта МКС (docs/catalogs-iss.md, файл траєкторії NASA OEM); CubeSat випускають з МКС — CubeSat 101", CubeSat101)),
        ];

        IReadOnlyList<Launch> launches =
        [
            new("iss-deploy", "launch.issDeploy", 40, new Dictionary<string, double> { ["iss-deploy"] = 12 }, "iss-deploy", "small",
                Source.Estimate("Доставка на МКС і випуск астронавтами — як у NASA CubeSat 101; маса й ціна — оцінка")),
        ];

        IReadOnlyList<Part> parts =
        [
            new("bus-s", PartCategories.Bus, "basic", "part.busS", 3, 5, 0,
                new PartSpecs { MaxMassKg = 12, Slots = 7, DragAreaM2 = 0.06, BusSize = "small" }, [],
                Source.Estimate("Як у місії 1 (docs/catalogs.md); площа перерізу й клас — оцінка")),
            Solar("solar-body", "basic", "part.solarBody", 19.2, 0.26, 2, "19,2 Вт, 74 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: NPC Spacemind SP6X"),
            Solar("solar-deploy", "best", "part.solarDeploy", 135, 4.4, 15, "135 Вт, 31 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: Pumpkin Dual Articulated Deployable Solar Array"),
            Battery("bat-s", "basic", "part.batS", 40, 0.24, 1, "168,8 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: GomSpace NanoPower BP4"),
            Battery("bat-m", "best", "part.batM", 150, 1.04, 6, "144 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: Astro Digital Direct Energy Pack"),
            Radio("radio-uhf", "basic", "part.radioUhf", 38.4, "uhf", 0.025, 4, 1, [], "с. 260: GomSpace NanoCom AX100"),
            Radio("radio-s", "best", "part.radioS", 3000, "s", 0.34, 12, 8, [], "с. 263: EnduroSat S-Band Transceiver III"),
            CpuBasic(),
            AdcsBasic(),
            PropNone(),
            PropCold(),
        ];

        return new Mission(
            "cubesat-learn", MissionKinds.Tutorial, "mission.cubesatLearn.title", "mission.cubesatLearn.briefing",
            MissionGoal.Data(1, 6),
            new MissionLimits(150, 12, MassReserveRecommendedPct),
            new MissionTiming(StandardBuild, 2, [6, 12], new Dictionary<string, int>()),
            new MissionCatalogs(orbits, launches, parts, [Magnetometer(), Radiometer()], [Fairbanks(), WhiteSands()], [], []),
            [
                new("first-cubesat", "preset.cubesatLearn.first", new Design
                {
                    MissionId = "cubesat-learn", Orbit = OrbitChoice.Preset("iss-deploy"), LaunchId = "iss-deploy",
                    Parts = new("bus-s", "solar-body", "bat-s", "radio-s", "cpu-basic", "adcs-basic", "prop-none"),
                    InstrumentIds = ["magnetometer"], GroundStationIds = ["white-sands"],
                }),
            ]);
    }

    // ───────────────────────────── Місія 2: «Вантаж на МКС» (docs/catalogs-iss.md, задачі 017 і 034) ─────────────────────────────

    private static Mission IssCargo()
    {
        IReadOnlyList<Orbit> orbits =
        [
            new("iss", "orbit.iss", 418, 51.64, null,
                Source.Calculated("Висота 418 км — розрахунок із файлу траєкторії NASA (OEM, 13.11.2026): середня велика піввісь мінус екваторіальний радіус; нахил 51,64° — NASA (51,6°)", IssOem)),
        ];

        IReadOnlyList<Launch> launches =
        [
            new("medium", "launch.medium", 800, new Dictionary<string, double> { ["iss"] = 6100 }, null, "large",
                Source.Nasa("Antares: до 6123 кг на орбіти середнього нахилу з Воллопса — NASA Orb-2 Press Kit; ціна — оцінка", Orb2PressKit)),
            new("heavy", "launch.heavy", 1400, new Dictionary<string, double> { ["iss"] = 15_000 }, null, "large",
                Source.Estimate("Falcon 9: NASA на сторінках місій вантажопідйомність не дає — маса й ціна оцінка (docs/catalogs-iss.md)")),
        ];

        IReadOnlyList<Part> parts =
        [
            new("ship-small", PartCategories.Bus, "medium", "part.shipSmall", 1200, 180, 0,
                new PartSpecs { MaxMassKg = 4700, Slots = 14, DragAreaM2 = 6, BusSize = "medium" }, [],
                Source.NasaRetold("Cygnus: посилений модуль везе до 2700 кг вантажу — NASA Orb-2 Press Kit; макс. маса 4700 кг — розрахунок (1200 + 150 + 600 + 2700); маса порожнього, місця, площа й ціна — оцінка", Orb2PressKit)),
            new("ship-pressurized", PartCategories.Bus, "best", "part.shipPressurized", 2200, 300, 0,
                new PartSpecs { MaxMassKg = 8000, Slots = 20, DragAreaM2 = 10, BusSize = "large" }, [],
                Source.NasaRetold("Dragon: до 6000 кг вантажу на старт — NASA CRS-22 Mission Overview; маса порожнього, макс. маса, місця, площа й ціна — оцінка", Crs22Overview)),
            Solar("solar-deploy", "medium", "part.solarDeploy", 135, 4.4, 15, "135 Вт, 31 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: Pumpkin Dual Articulated Deployable Solar Array"),
            Solar("solar-roll", "best", "part.solarRoll", 1000, 10, 60, "1000 Вт, 100 Вт/кг — SmallSat SOA 2026, табл. 3-2, с. 35: Redwire ROSA"),
            Battery("bat-m", "medium", "part.batM", 150, 1.04, 6, "144 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: Astro Digital Direct Energy Pack"),
            Battery("bat-l", "best", "part.batL", 1000, 5.6, 30, "178,1 Вт·год/кг — SmallSat SOA 2026, табл. 3-5, с. 44: EnduroSat EPS IV"),
            Radio("radio-s", "medium", "part.radioS", 3000, "s", 0.34, 12, 8, [], "с. 263: EnduroSat S-Band Transceiver III"),
            Radio("radio-x", "best", "part.radioX", 50_000, "x", 0.13, 20, 25, NeedsFinePointing, "с. 265: AAC Clyde Space PULSAR-DATA XTX"),
            CpuBasic(),
            CpuPower(),
            AdcsBasic(),
            AdcsFine(),
            new("prop-biprop", PartCategories.Propulsion, "medium", "part.propBiprop", 150, 60, 0,
                new PartSpecs { IspS = 300, ThrustN = 400, PropellantKg = 600, PowerW = 0 }, [],
                Source.NasaRetold("Головний двигун Cygnus — 100 фунт-сил (~445 Н), гідразин / MON-3 — NASA Orb-2 Press Kit; у грі 400 Н; Isp, паливо, маса й ціна — оцінка", Orb2PressKit)),
            new("prop-biprop-xl", PartCategories.Propulsion, "best", "part.propBipropXl", 220, 90, 0,
                new PartSpecs { IspS = 300, ThrustN = 400, PropellantKg = 1200, PowerW = 0 }, [],
                Source.Estimate("Двокомпонентний двигун корабля зі збільшеним баком — оцінка (docs/catalogs-iss.md)")),
        ];

        IReadOnlyList<LaunchSite> sites =
        [
            new("cape-canaveral", "site.capeCanaveral", 28.5, -80.6,
                Source.Estimate("Широта й довгота — загальні географічні дані; майданчики LC-39A і SLC-40 названо в оглядах NASA CRS-29 і CRS-22")),
            new("wallops", "site.wallops", 37.83, -75.49,
                Source.Nasa("Майданчик 0A: 37,83° пн. ш., 75,49° зх. д. — NASA Orb-2 Press Kit", Orb2PressKit)),
            new("kodiak", "site.kodiak", 57.4, -152.3,
                Source.Estimate("Майданчик не NASA; широта — загальні географічні дані; потрібен як урок про зміну площини")),
        ];

        Source cargoSource = Source.Calculated(
            "Категорії — з маніфестів NASA; типова маса — середнє Orb-2, CRS-22 і CRS-29, округлено (docs/catalogs-iss.md); цінність — оцінка");
        IReadOnlyList<CargoCategory> cargo =
        [
            new("crew-supplies", "cargo.crewSupplies", "medium", 600, cargoSource),
            new("science", "cargo.science", "highest", 750, cargoSource),
            new("vehicle-hardware", "cargo.vehicleHardware", "low", 400, cargoSource),
            new("spacewalk", "cargo.spacewalk", "medium", 50, cargoSource),
            new("computer", "cargo.computer", "low", 40, cargoSource),
        ];

        return new Mission(
            "iss-cargo", MissionKinds.Iss, "mission.issCargo.title", "mission.issCargo.briefing",
            MissionGoal.Cargo(2500, 30, 5),
            new MissionLimits(1500, 18, MassReserveRecommendedPct),
            new MissionTiming(StandardBuild, 4, [], new Dictionary<string, int> { ["medium"] = 5, ["heavy"] = 7 }),
            new MissionCatalogs(orbits, launches, parts, [], [WhiteSands(), Fairbanks(), Guam()], sites, cargo),
            [
                new("cape-medium", "preset.issCargo.capeMedium", new Design
                {
                    MissionId = "iss-cargo", Orbit = null, LaunchId = "medium",
                    Parts = new("ship-pressurized", "solar-deploy", "bat-m", "radio-s", "cpu-basic", "adcs-fine", "prop-biprop"),
                    InstrumentIds = [], GroundStationIds = ["white-sands"],
                    LaunchSiteId = "cape-canaveral", InsertionAltitudeKm = 200,
                    Cargo = [new("crew-supplies", 1500), new("science", 1000)], Relay = true,
                }),
            ]);
    }

    /// <summary>Посилання на джерело запасу маси — для розрахункових листів (004).</summary>
    public static Source MassReserveSource =>
        Source.Nasa("GSFC-STD-1000 Rev I, Rule 1.06, табл. 1.06-1, с. 10: маса > 15 % у Pre-Phase A", GoldRules);
}
