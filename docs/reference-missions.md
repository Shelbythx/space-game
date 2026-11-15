# Бібліотека схожих місій

Оновлено 15.11.2026. Задача [019](../tasks/019-docs-reference-missions.md), рішення D85.

Звіт після польоту показує «схожу місію» — найближчу за орбітою, масою й корисним
навантаженням (`report.comparison`, `docs/api.md`). Бібліотека має два види записів:

- **`real`** — справжні місії NASA з числами зі сторінок NASA (D51: кожне число має джерело);
- **`modeled`** — еталонні проєкти гри у форматі `Design`; їхні числа рахує наша ж
  симуляція (задача 023), тож у бібліотеці записано лише сам проєкт.

Бекенд (023) засіває таблицю `reference_missions` із двох блоків JSON нижче. Решта тексту —
для людей.

## Як читати числа

- Порожнє поле (`null`) означає, що на перевірених сторінках NASA числа немає. Ми його не
  вигадуємо.
- `dataGbPerDay` — добовий обсяг даних. Для `deltas.dataGb` бекенд множить його на
  тривалість місії гри (`goal.operationMonths`).
- `scienceCargoPct` — частка вантажу з цінністю `high`/`highest`. Для місій NASA це категорія
  «Science investigations» з маніфесту.
- `gameMissionId` — з якою місією гри порівнювати запис.

## Справжні місії NASA

| Місія | Місія гри | Орбіта | Маса | Що несе | Джерело |
| --- | --- | --- | --- | --- | --- |
| Landsat 9 (2021) | `sat-orbit` | SSO 705 км, 98,2° | — | OLI-2 (камера), TIRS-2; > 700 знімків на добу | [NASA Science](https://science.nasa.gov/mission/landsat-9) |
| Aqua (2002) | `sat-orbit` | SSO 705 км, 98,2° | 2934 кг | 6 приладів, серед них радіометр AMSR-E і MODIS; 4860 Вт наприкінці роботи | [NASA Science](https://science.nasa.gov/mission/aqua/about-aqua-spacecraft-and-instruments) |
| PACE (2024) | `sat-orbit` | SSO 676 км (~420 миль), полярна | ~1700 кг (3748 фунтів із паливом) | Ocean Color Instrument, поляриметри SPEXone і HARP2 | [NASA Science, блог PACE](https://science.nasa.gov/blogs/pace/2024/02/08/meet-nasas-pace-spacecraft-science-instruments/) |
| ICESat-2 (2018) | `sat-orbit` | ~500 км (310 миль), 92° | 1580 кг | Лазерний висотомір ATLAS; ≥ 580 Гбіт на добу, X-діапазон 220 Мбіт/с | [ICESat-2: How it works](https://icesat-2.gsfc.nasa.gov/how-it-works), [Fast facts](https://icesat-2.gsfc.nasa.gov/fast-facts), [NSSDCA](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2018-070A) |
| GOES-16 / GOES-R (2016) | `sat-orbit` | GEO 35 786 км | 2800 кг | Advanced Baseline Imager | [NASA: GOES-R ready for launch](https://www.nasa.gov/image-article/goes-r-weather-satellite-ready-launch/), маса — [NOAA NESDIS](https://www.nesdis.noaa.gov/our-satellites/currently-flying/geostationary-satellites/goes-r-launch-vehicle) (програма GOES-R NOAA і NASA) |
| TDRS-M (2017) | `iss-cargo` (ретранслятор) | GEO | — | Ретрансляція S-, Ku-, Ka-діапазону для апаратів на низькій орбіті | [NASA: TDRS](https://www.nasa.gov/missions/tdrs/tdrs-an-era-of-continuous-space-communications/), [NTRS](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20170010176.pdf) |
| TROPICS (2023) | `sat-orbit` | ~550 км, ~30° | ~5,4 кг (12 фунтів) | Мікрохвильовий радіометр; 3U CubeSat, запуск Rocket Lab | [NASA: Mission facts](https://www.nasa.gov/blogs/smallsatellites/2023/05/07/mission-facts-about-nasas-tropics-2/) |
| IceCube (2017) | `cubesat-learn` | Виведення з МКС, ~410 км, 51,6° | ~4,5 кг (10 фунтів) | Радіометр 883 ГГц; 3U | [NASA Technology](https://www.nasa.gov/technology/goddards-icecube-smallsat-ready-for-launch-space-station-deployment/), [NTRS](https://ntrs.nasa.gov/citations/20210012947) |
| Dellingr (2017) | `cubesat-learn` | Виведення з МКС, ~400 км (250 миль), 51,6° | — | Два магнітометри, мас-спектрометр INMS; 6U | [NASA: Dellingr](https://www.nasa.gov/solar-system/dellingr-the-little-cubesat-that-could/) |
| SpaceX CRS-29 (2023) | `iss-cargo` | МКС | 2950 кг вантажу | Наука 1012 кг, екіпаж 681, обладнання станції 491, вихід у космос 48, комп'ютери 46, негерметичний вантаж 569 | [NASA: CRS-29](https://www.nasa.gov/international-space-station/commercial-resupply/spacex-crs-29-mission-overview/) |
| Northrop Grumman NG-20 (2024) | `iss-cargo` | МКС | 3720 кг вантажу | Наука, припаси, обладнання (без розбивки на сторінці) | [NASA: NG-20](https://www.nasa.gov/missions/station/overview-for-nasas-northrop-grumman-20th-commercial-resupply-mission/) |

Примітки до чисел:

- **Aqua:** NSSDCA дає 3117 кг, сторінка місії — 2934 кг на старті. Беремо сторінку місії.
- **PACE:** маса в кілограмах — перерахунок із 3748 фунтів (× 0,4536).
- **TROPICS:** NASA пише «близько 30°»; таблиця орбіт у звіті NTRS дає 32,74°.
- **IceCube, Dellingr:** нахил — це нахил орбіти МКС, бо обидва виведено зі станції.
- **TDRS-M:** маси на знайдених сторінках NASA немає. Запис потрібен як приклад ретранслятора
  (поле `relay` у місії на МКС), а не для порівняння маси.
- **ICESat-2:** 580 Гбіт ≈ 72,5 ГБ на добу — це обсяг бортового запису, а не готових
  продуктів (близько 1 ТБ на добу).

```json reference-missions-real
[
  { "id": "landsat-9", "kind": "real", "nameCode": "reference.landsat9", "gameMissionId": "sat-orbit",
    "launchYear": 2021, "altitudeKm": 705, "inclinationDeg": 98.2, "massKg": null, "dataGbPerDay": null,
    "instruments": ["camera"], "notes": "OLI-2, TIRS-2; > 700 scenes per day",
    "source": { "kind": "nasa", "note": "NASA Science, Landsat 9: orbit 705 km, 98.2°, OLI-2 and TIRS-2", "url": "https://science.nasa.gov/mission/landsat-9" } },
  { "id": "aqua", "kind": "real", "nameCode": "reference.aqua", "gameMissionId": "sat-orbit",
    "launchYear": 2002, "altitudeKm": 705, "inclinationDeg": 98.2, "massKg": 2934, "dataGbPerDay": null,
    "instruments": ["radiometer", "camera"], "notes": "AIRS, AMSU-A, HSB, AMSR-E, MODIS, CERES; 4860 W end of life",
    "source": { "kind": "nasa", "note": "NASA Science, Aqua spacecraft and instruments: 2934 kg at launch, 705 km, 98.2°", "url": "https://science.nasa.gov/mission/aqua/about-aqua-spacecraft-and-instruments" } },
  { "id": "pace", "kind": "real", "nameCode": "reference.pace", "gameMissionId": "sat-orbit",
    "launchYear": 2024, "altitudeKm": 676, "inclinationDeg": 98, "massKg": 1700, "dataGbPerDay": null,
    "instruments": ["radiometer"], "notes": "Ocean Color Instrument, SPEXone, HARP2; mass converted from 3748 lb fueled",
    "source": { "kind": "nasa", "note": "NASA Science, PACE blog: 3748 lb fueled, sun-synchronous polar orbit about 420 miles", "url": "https://science.nasa.gov/blogs/pace/2024/02/08/meet-nasas-pace-spacecraft-science-instruments/" } },
  { "id": "icesat-2", "kind": "real", "nameCode": "reference.icesat2", "gameMissionId": "sat-orbit",
    "launchYear": 2018, "altitudeKm": 500, "inclinationDeg": 92, "massKg": 1580, "dataGbPerDay": 72.5,
    "instruments": [], "notes": "ATLAS laser altimeter; >= 580 Gbit recorded per day; X-band 220 Mbit/s",
    "source": { "kind": "nasa", "note": "ICESat-2 How it works (310 miles, 92°), Fast facts (580 Gbit/day), NSSDCA 2018-070A (1580 kg)", "url": "https://icesat-2.gsfc.nasa.gov/how-it-works" } },
  { "id": "goes-16", "kind": "real", "nameCode": "reference.goes16", "gameMissionId": "sat-orbit",
    "launchYear": 2016, "altitudeKm": 35786, "inclinationDeg": 0, "massKg": 2800, "dataGbPerDay": null,
    "instruments": ["camera"], "notes": "Advanced Baseline Imager; geostationary",
    "source": { "kind": "nasa", "note": "NASA: GOES-R ready for launch (Atlas V 541, over 6000 lb); NOAA NESDIS GOES-R launch vehicle page: 2800 kg at launch", "url": "https://www.nasa.gov/image-article/goes-r-weather-satellite-ready-launch/" } },
  { "id": "tdrs-m", "kind": "real", "nameCode": "reference.tdrsM", "gameMissionId": "iss-cargo",
    "launchYear": 2017, "altitudeKm": 35786, "inclinationDeg": 0, "massKg": null, "dataGbPerDay": null,
    "instruments": [], "notes": "Relay satellite: S-band multiple access, S/Ku/Ka single access; example for relay = true",
    "source": { "kind": "nasa", "note": "NTRS 20170010176, Payload performance of third generation TDRS", "url": "https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20170010176.pdf" } },
  { "id": "tropics", "kind": "real", "nameCode": "reference.tropics", "gameMissionId": "sat-orbit",
    "launchYear": 2023, "altitudeKm": 550, "inclinationDeg": 30, "massKg": 5.4, "dataGbPerDay": null,
    "instruments": ["radiometer"], "notes": "3U CubeSats with a spinning microwave radiometer; Rocket Lab launch",
    "source": { "kind": "nasa", "note": "NASA small satellites blog, Mission facts about TROPICS: about 12 lb, about 550 km, about 30°", "url": "https://www.nasa.gov/blogs/smallsatellites/2023/05/07/mission-facts-about-nasas-tropics-2/" } },
  { "id": "icecube", "kind": "real", "nameCode": "reference.icecube", "gameMissionId": "cubesat-learn",
    "launchYear": 2017, "altitudeKm": 410, "inclinationDeg": 51.6, "massKg": 4.5, "dataGbPerDay": null,
    "instruments": ["radiometer"], "notes": "3U CubeSat, 883 GHz radiometer, deployed from the ISS",
    "source": { "kind": "nasa", "note": "NASA Technology: 10-pound 3U cubesat, 883 GHz radiometer; NTRS 20210012947: deployed at about 410 km", "url": "https://www.nasa.gov/technology/goddards-icecube-smallsat-ready-for-launch-space-station-deployment/" } },
  { "id": "dellingr", "kind": "real", "nameCode": "reference.dellingr", "gameMissionId": "cubesat-learn",
    "launchYear": 2017, "altitudeKm": 400, "inclinationDeg": 51.6, "massKg": null, "dataGbPerDay": null,
    "instruments": ["magnetometer"], "notes": "6U CubeSat, two magnetometers and INMS, deployed from the ISS",
    "source": { "kind": "nasa", "note": "NASA: Dellingr, the little CubeSat that could: 6U, about 250 miles, released from the ISS on 20.11.2017", "url": "https://www.nasa.gov/solar-system/dellingr-the-little-cubesat-that-could/" } },
  { "id": "crs-29", "kind": "real", "nameCode": "reference.crs29", "gameMissionId": "iss-cargo",
    "launchYear": 2023, "altitudeKm": null, "inclinationDeg": 51.6, "massKg": null, "cargoKg": 2950, "scienceCargoPct": 34.3,
    "cargo": { "science": 1012, "crew-supplies": 681, "vehicle-hardware": 491, "spacewalk": 48, "computer": 46, "unpressurized": 569 },
    "notes": "Dragon on Falcon 9 from LC-39A",
    "source": { "kind": "nasa", "note": "NASA, SpaceX CRS-29 mission overview: cargo manifest", "url": "https://www.nasa.gov/international-space-station/commercial-resupply/spacex-crs-29-mission-overview/" } },
  { "id": "ng-20", "kind": "real", "nameCode": "reference.ng20", "gameMissionId": "iss-cargo",
    "launchYear": 2024, "altitudeKm": null, "inclinationDeg": 51.6, "massKg": null, "cargoKg": 3720, "scienceCargoPct": null,
    "notes": "Cygnus on Falcon 9 from SLC-40; no breakdown by category on the page",
    "source": { "kind": "nasa", "note": "NASA, Overview for NG-20: more than 8200 lb (3720 kg) of cargo", "url": "https://www.nasa.gov/missions/station/overview-for-nasas-northrop-grumman-20th-commercial-resupply-mission/" } }
]
```

## Еталонні проєкти гри

Для кожної місії — від найдешевшого до найкращого, що вміщується в обмеження, плюс аналоги
справжніх місій. Усі використовують лише деталі з каталогів `MissionData.cs`.

**Перевірено 15.11.2026 після задачі 031 (D107: третій попутний рейс на 15-му місяці, 7 місць у
`bus-s`)** — прогоном `POST /api/simulate` на розгорнутому бекенді (seed 42). Жоден еталон не має
`fail` у сегментах `mission`, `launch` і `space`; «Ціль» — чи досягнуто ціль місії (`success`).
Перша версія (до 031) перевірялась лише статичними правилами; після прогону шість еталонів
замінено: розкладні панелі в CubeSat згоряли за 2 місяці, UHF із Фербенксом не мав жодного
сеансу, `orbit-cheapest` без двигуна порушував правило 25 років, а `orbit-own-launch` замінено
камерним проєктом, що досягає цілі місії 1.

### `cubesat-learn` — рівень CubeSat

| id | Задум | Маса з запасом, кг | Бюджет, к | Старт, міс. | Передано за 6 міс. | Ціль |
| --- | --- | --- | --- | --- | --- | --- |
| `cubesat-cheapest` | Найдешевший: магнітометр, S-діапазон, Вайт-Сендс | 5,6 | 93 / 150 | 12 | 1,3 ГБ | так (ціль 1 ГБ, D108) |
| `cubesat-icecube-like` | Як IceCube: радіометр, S-діапазон | 6,5 | 118 / 150 | 12 | 26,1 ГБ | так |
| `cubesat-balanced` | Радіометр і більша батарея | 7,4 | 123 / 150 | 12 | 26,2 ГБ | так |
| `cubesat-best` | Радіометр, більша батарея й холодний газ — орбіта тримається | 9,3 | 138 / 150 | 12 | 26,4 ГБ | так |
| `cubesat-dellingr-like` | Як Dellingr: магнітометр, двигун | 8,4 | 113 / 150 | 12 | 1,3 ГБ | так (ціль 1 ГБ, D108) |

### `sat-orbit` — «Супутник на орбіту»

| id | Задум | Маса з запасом, кг | Бюджет, к | Старт, міс. | Передано за 12 міс. | Ціль |
| --- | --- | --- | --- | --- | --- | --- |
| `orbit-cheapest` | Попутний запуск, радіометр, холодний газ для зведення з орбіти | 8,4 | 153 / 450 | 9 | 51 ГБ | ні |
| `orbit-tropics-like` | Як TROPICS: свій малий носій на 500 км | 6,5 | 348 / 450 | 12 | 52 ГБ | ні |
| `orbit-balanced` | Середній корпус, двигун, два прилади, попутний запуск | 45,5 | 266 / 450 | 9 | 44 ГБ | ні |
| `orbit-camera-rideshare` | Як Landsat: камера, X-діапазон, рейс 15-го місяця | 60,0 | 381 / 450 | 15 | 6016 ГБ | так |

### `iss-cargo` — «Вантаж на МКС»

| id | Задум | Вантаж, кг (наука) | Бюджет, к | Старт, міс. | Ціль |
| --- | --- | --- | --- | --- | --- |
| `iss-cheapest` | Малий корабель; навмисно недовозить 500 кг до цілі | 2000 (40 %) | 1101 / 1500 | 14 | ні |
| `iss-crs29-like` | Як CRS-29: розбивка вантажу за маніфестом, ретранслятор | 2500 (40 %) | 1321 / 1500 | 17 | так |
| `iss-ng-wallops-like` | Старт з Воллопса (37,8° пн. ш.), без ретранслятора | 2600 (35 %) | 1251 / 1500 | 17 | так |
| `iss-best` | X-діапазон, точна орієнтація, ретранслятор; 2700 кг, половина — наука | 2700 (50 %) | 1391 / 1500 | 17 | так |

Після задачі 034 (D108) `medium` — 6100 кг (Antares, `catalogs-iss.md`). Колишній `iss-best` із
великим баком (3000 кг вантажу, 6992 кг із запасом) перестав вміщатися; тепер він зі звичайним
`prop-biprop` і везе 2700 кг (6012 кг із запасом). Перевірено прогоном `simulate` після D108.

```json reference-missions-modeled
[
  { "id": "cubesat-cheapest", "kind": "modeled", "nameCode": "reference.modeled.cubesatCheapest", "design": {
    "missionId": "cubesat-learn", "version": "simple", "orbit": {"presetId": "iss-deploy"}, "launchId": "iss-deploy", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-s", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-none"}, "instrumentIds": ["magnetometer"], "groundStationIds": ["white-sands"] } },
  { "id": "cubesat-icecube-like", "kind": "modeled", "nameCode": "reference.modeled.cubesatIcecubeLike", "design": {
    "missionId": "cubesat-learn", "version": "simple", "orbit": {"presetId": "iss-deploy"}, "launchId": "iss-deploy", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-s", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-none"}, "instrumentIds": ["radiometer"], "groundStationIds": ["white-sands"] } },
  { "id": "cubesat-balanced", "kind": "modeled", "nameCode": "reference.modeled.cubesatBalanced", "design": {
    "missionId": "cubesat-learn", "version": "simple", "orbit": {"presetId": "iss-deploy"}, "launchId": "iss-deploy", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-none"}, "instrumentIds": ["radiometer"], "groundStationIds": ["white-sands"] } },
  { "id": "cubesat-best", "kind": "modeled", "nameCode": "reference.modeled.cubesatBest", "design": {
    "missionId": "cubesat-learn", "version": "simple", "orbit": {"presetId": "iss-deploy"}, "launchId": "iss-deploy", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-cold"}, "instrumentIds": ["radiometer"], "groundStationIds": ["white-sands"] } },
  { "id": "cubesat-dellingr-like", "kind": "modeled", "nameCode": "reference.modeled.cubesatDellingrLike", "design": {
    "missionId": "cubesat-learn", "version": "simple", "orbit": {"presetId": "iss-deploy"}, "launchId": "iss-deploy", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-cold"}, "instrumentIds": ["magnetometer"], "groundStationIds": ["white-sands"] } },
  { "id": "orbit-cheapest", "kind": "modeled", "nameCode": "reference.modeled.orbitCheapest", "design": {
    "missionId": "sat-orbit", "version": "simple", "orbit": {"presetId": "sso"}, "launchId": "rideshare", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-s", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-cold"}, "instrumentIds": ["radiometer"], "groundStationIds": ["white-sands"] } },
  { "id": "orbit-tropics-like", "kind": "modeled", "nameCode": "reference.modeled.orbitTropicsLike", "design": {
    "missionId": "sat-orbit", "version": "simple", "orbit": {"presetId": "leo"}, "launchId": "small", "parts": {"bus": "bus-s", "solar": "solar-body", "battery": "bat-s", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-none"}, "instrumentIds": ["radiometer"], "groundStationIds": ["white-sands", "guam"] } },
  { "id": "orbit-balanced", "kind": "modeled", "nameCode": "reference.modeled.orbitBalanced", "design": {
    "missionId": "sat-orbit", "version": "simple", "orbit": {"presetId": "sso"}, "launchId": "rideshare", "parts": {"bus": "bus-m", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-chem"}, "instrumentIds": ["radiometer", "magnetometer"], "groundStationIds": ["fairbanks", "white-sands"] } },
  { "id": "orbit-camera-rideshare", "kind": "modeled", "nameCode": "reference.modeled.orbitCameraRideshare", "design": {
    "missionId": "sat-orbit", "version": "simple", "orbit": {"presetId": "sso"}, "launchId": "rideshare", "parts": {"bus": "bus-m", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-x", "computer": "cpu-power", "adcs": "adcs-fine", "propulsion": "prop-chem"}, "instrumentIds": ["camera"], "groundStationIds": ["fairbanks", "white-sands"] } },
  { "id": "iss-cheapest", "kind": "modeled", "nameCode": "reference.modeled.issCheapest", "design": {
    "missionId": "iss-cargo", "version": "simple", "launchId": "medium", "parts": {"bus": "ship-small", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-biprop"}, "instrumentIds": [], "groundStationIds": ["white-sands"], "launchSiteId": "cape-canaveral", "insertionAltitudeKm": 200, "cargo": [{"categoryId": "crew-supplies", "massKg": 1200}, {"categoryId": "science", "massKg": 800}], "relay": false } },
  { "id": "iss-crs29-like", "kind": "modeled", "nameCode": "reference.modeled.issCrs29Like", "design": {
    "missionId": "iss-cargo", "version": "simple", "launchId": "medium", "parts": {"bus": "ship-pressurized", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-biprop"}, "instrumentIds": [], "groundStationIds": ["white-sands"], "launchSiteId": "cape-canaveral", "insertionAltitudeKm": 200, "cargo": [{"categoryId": "science", "massKg": 1000}, {"categoryId": "crew-supplies", "massKg": 700}, {"categoryId": "vehicle-hardware", "massKg": 700}, {"categoryId": "computer", "massKg": 50}, {"categoryId": "spacewalk", "massKg": 50}], "relay": true } },
  { "id": "iss-ng-wallops-like", "kind": "modeled", "nameCode": "reference.modeled.issNgWallopsLike", "design": {
    "missionId": "iss-cargo", "version": "simple", "launchId": "medium", "parts": {"bus": "ship-pressurized", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-basic", "propulsion": "prop-biprop"}, "instrumentIds": [], "groundStationIds": ["white-sands", "fairbanks"], "launchSiteId": "wallops", "insertionAltitudeKm": 220, "cargo": [{"categoryId": "crew-supplies", "massKg": 1300}, {"categoryId": "science", "massKg": 900}, {"categoryId": "vehicle-hardware", "massKg": 400}], "relay": false } },
  { "id": "iss-best", "kind": "modeled", "nameCode": "reference.modeled.issBest", "design": {
    "missionId": "iss-cargo", "version": "simple", "launchId": "medium", "parts": {"bus": "ship-pressurized", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-x", "computer": "cpu-power", "adcs": "adcs-fine", "propulsion": "prop-biprop"}, "instrumentIds": [], "groundStationIds": ["white-sands"], "launchSiteId": "cape-canaveral", "insertionAltitudeKm": 250, "cargo": [{"categoryId": "science", "massKg": 1350}, {"categoryId": "crew-supplies", "massKg": 1050}, {"categoryId": "vehicle-hardware", "massKg": 300}], "relay": true } }
]
```

## Що виявила перевірка каталогів

1. ~~Ціль місії 1 (500 ГБ) недосяжна; пресет `camera-small` перевищує бюджет.~~ **Виправлено в
   031 (D107):** третій попутний рейс на 15-му місяці; камерний проєкт тепер досягає цілі
   (`orbit-camera-rideshare`, 381 к).
2. ~~У CubeSat `prop-cold` не вміщується разом із приладом.~~ **Виправлено в 031:** `bus-s` має
   7 місць.
3. ~~Фербенкс не бачить орбіту МКС, пресет `first-cubesat` передає 0 ГБ.~~ **Виправлено в 034
   (D108):** пресет із S-діапазоном і Вайт-Сендс, ціль 1 ГБ.
4. **Старт МКС з Кодьяка (57,4°) потребує ~780 м/с на зміну площини**, і палива не вистачає
   навіть з `prop-biprop-xl`. Це очікуваний урок про широту космодрому, тому еталона з Кодьяка
   немає.

## Як перевірити знову

Якщо зміниться каталог, еталони треба перевірити ще раз. Повну перевірку робить
`POST /api/evaluate`: кожен `design` з блоку вище має повернутися без помилок `design.*`, а в
сегментах `mission`, `launch`, `space` не має бути статусу `fail` (крім `iss-cheapest`, де ціль
вантажу недовиконано навмисно).
