# Контракт API

Статус: **чинний, версія 2.2** (задача 041: кооператив — кімнати, D109; версія 2.1 — задача 030: уточнення після бекенду; версія 2 — задача 015; перша версія — задача 001, D60). Змінюється лише
окремою задачею: спершу цей файл, потім бекенд і фронтенд.

Межа (D59): бекенд рахує все, фронтенд лише показує. Фронтенд не повторює формул.

Що нового у версії 2 (D78–D85, `docs/development-plan.md`, розділ 5): три місії й поле
`kind`; сьома категорія деталей `propulsion` і пам'ять комп'ютера; поля місії на МКС у
`Design`; паливо, час життя орбіти й зближення в `evaluate`; висота, паливо, траса й сеанси
в `simulate`; джерело подій (DONKI чи seed); формули балів і схожа місія у звіті. Ролі й blueprint (D92–D95): клас корпусу й
обтічника (`busSize`, `maxBusSize`), сторони деталей (`Design.layout`), запас маси
(`massReservePct`), розрахункові листи (`evaluate.calc`) і смужка витка
(`evaluate.orbitStrip`), таблиця власників рішень. Перелік кодів повідомлень — у кінці файлу.

## Загальні правила

- REST і JSON, UTF-8. Усі шляхи починаються з `/api`. Версії в шляху немає.
- Поля — `camelCase` англійською. Одиниця — в назві поля: `massKg`, `powerW`,
  `capacityWh`, `rateKbps`, `altitudeKm`, `latDeg`, `priceK` (тисячі ігрових кредитів),
  `days`, `month` (місяць від початку проєкту, з 0), `ispS` (питомий імпульс, с),
  `thrustN`, `deltaVms` (Δv, м/с), `storageGb`, `stepSeconds`. Безрозмірні величини — без
  суфікса: частка `eclipseFraction` (0–1), відсотки — `Pct`, індекс `kp` (0–9).
- Ідентифікатори — короткі рядки: `sso`, `radio-x`, `fairbanks`. Списки ідентифікаторів
  каталогів відкриті: нові місії й каталоги (задачі 016–019) додають ідентифікатори без
  зміни контракту. Закриті переліки (`kind`, `segment`, `status`, `category`…) змінюються
  лише окремою задачею.
- Бекенд публікує OpenAPI на `/openapi/v1.json`; фронтенд генерує з нього типи
  TypeScript. Якщо OpenAPI розходиться з цим файлом — помилка в коді, а не тут.
- CORS: дозволено `http://localhost:5173`. Адреса хостингу додається, коли його вирішать
  (D77).

### Коди повідомлень

Усі тексти для гравця (коментарі ролей, перевірки, пояснення, події) бекенд повертає
**кодом із параметрами**, а не готовим текстом:

```json
{ "code": "comment.engineer.batteryShortInEclipse", "params": { "neededWh": 62.4, "capacityWh": 40 } }
```

Код — це ключ i18n на фронтенді (`en` і `uk`). Числа в `params` — сирі, без одиниць;
фронтенд форматує їх за мовою. Новий код = рядок перекладу в обох мовах. Повний перелік —
розділ «Перелік кодів».

### Помилки

Формат RFC 7807 (`application/problem+json`). Помилка перевірки запиту — `400` з полем
`errors`: `{ "<шлях поля>": ["<код>"] }`, наприклад `{ "parts.radio": ["design.unknownPart"] }`.
Невідома місія чи спроба — `404`. Коди помилок перевірки — у розділі «Перелік кодів».

## Точки

| Метод і шлях | Що робить |
| --- | --- |
| `GET /api/health` | Перевірка й пробудження сервера |
| `GET /api/missions` | Список місій |
| `GET /api/missions/{id}` | Місія: брифінг, ціль, ліміти, час, каталоги |
| `POST /api/evaluate` | Миттєві наслідки проєкту: ресурси, перевірки, коментарі ролей |
| `POST /api/simulate` | Симуляція місії в часі та звіт |
| `POST /api/attempts` | Зберегти спробу |
| `GET /api/attempts?playerId=` | Спроби гравця, нові спершу |
| `GET /api/attempts/{id}` | Одна спроба зі звітом |
| `/api/rooms…` **v2.2** | Кооператив: кімнати, ролі, спільний проєкт, старт (розділ «Кооператив — кімнати») |

---

### `GET /api/health`

```json
{ "status": "ok", "version": "0.2.0" }
```

Фронтенд викликає її під час завантаження й показує «сервер прокидається», доки не прийде
відповідь (на випадок хостингу, що засинає, D77).

### `GET /api/missions`

```json
[
  { "id": "cubesat-learn", "kind": "tutorial", "titleCode": "mission.cubesatLearn.title", "available": true },
  { "id": "sat-orbit",     "kind": "orbit",    "titleCode": "mission.satOrbit.title",     "available": true },
  { "id": "iss-cargo",     "kind": "iss",      "titleCode": "mission.issCargo.title",     "available": true }
]
```

`kind` задає, які поля є в місії, проєкті й результатах:

| `kind` | Місія | Особливе |
| --- | --- | --- |
| `tutorial` | Навчання CubeSat (D78, CubeSat 101) | Як `orbit`, менший каталог; підказки — на фронтенді (задача 025) |
| `orbit` | «Супутник на орбіту» | Ціль — дані |
| `iss` | «Вантаж на МКС» | Ціль — вантаж; космодром, орбіта виведення, ретранслятор, зближення |

### `GET /api/missions/{id}`

```json
{
  "id": "sat-orbit",
  "kind": "orbit",
  "titleCode": "mission.satOrbit.title",
  "briefingCode": "mission.satOrbit.briefing",
  "goal": { "dataGb": 500, "operationMonths": 12 },
  "limits": { "budgetK": 450, "launchDeadlineMonth": 18, "massReserveRecommendedPct": 15 },
  "timing": {
    "buildMonths": { "basic": 3, "medium": 5, "best": 8 },
    "integrationMonths": 4,
    "rideshareMonths": [9, 21],
    "launchLeadMonths": { "small": 3, "medium": 5 }
  },
  "catalogs": {
    "orbits": [Orbit],
    "launches": [Launch],
    "parts": [Part],
    "instruments": [Instrument],
    "groundStations": [GroundStation],
    "launchSites": [LaunchSite],
    "cargoCategories": [CargoCategory]
  },
  "presets": [Preset]
}
```

Числа — з `docs/catalogs.md` (D55, D56, D66), для МКС — `docs/catalogs-iss.md` (017), для
CubeSat — `docs/catalogs-cubesat.md` (018). Усі сім масивів у `catalogs` присутні завжди;
непотрібні місії — порожні (`launchSites` і `cargoCategories` заповнені лише для `iss`).

`limits.massReserveRecommendedPct` (D93) — рекомендований запас маси для ранньої фази
проєкту за правилами NASA: 15 % — GSFC-STD-1000 Rev I, табл. 1.06-1, с. 10 (Pre-Phase A;
задача 026). Запас рахується від сухої маси (без палива й вантажу).

#### Ціль — `goal`

Форма залежить від `kind`:

| `kind` | `goal` |
| --- | --- |
| `tutorial`, `orbit` | `{ "dataGb": 500, "operationMonths": 12 }` |
| `iss` | `{ "cargoKg": 2500, "scienceCargoMinPct": 30, "dockingDeadlineDays": 5 }` |

- `cargoKg` — скільки вантажу треба доставити на МКС.
- `scienceCargoMinPct` — найменша частка наукових вантажів (категорії з `value`
  `high` і вище) у масі вантажу.
- `dockingDeadlineDays` — за скільки діб після старту корабель має пристикуватися.

Числа в прикладі для `iss` — заглушки до задачі 017.

#### Джерело числа (D51)

Кожен об'єкт каталогу має `source`:

```json
{ "kind": "nasa", "note": "Pegasus XL, до 453,59 кг", "url": null }
```

`kind`: `nasa` (число NASA), `nasaRetold` (з переказу сторінок, у каталогах — «NASA*»),
`estimate` (ігрова оцінка), `calculated` (виведено з інших чисел). Якщо в рядку каталогу
кілька джерел — `source` описує головне число, а `note` — решту.

#### `Orbit`

```json
{ "id": "sso", "nameCode": "orbit.sso", "altitudeKm": 705, "inclinationDeg": 98.2, "epochDate": null, "source": {…} }
```

Ідентифікатори: місія 1 — `leo`, `sso`, `meo`, `geo`; МКС — `iss` (орбіта станції, ціль
місії 2); CubeSat — `iss-deploy` (виведення з МКС) та інші з задачі 018.

`epochDate` (`"2026-11-10"` або `null`) — дата файлу траєкторії NASA, з якого взято орбіту
(для `iss` — Spot the Station / OEM, задача 017).

#### `Launch`

```json
{
  "id": "small", "nameCode": "launch.small", "priceK": 250,
  "capacityKg": { "leo": 450, "sso": 300 },
  "fixedOrbitId": null,
  "maxBusSize": "large",
  "source": {…}
}
```

Ідентифікатори місії 1: `rideshare`, `small`, `medium`. Орбіти, яких немає в `capacityKg`,
носій не виводить. У `rideshare` — `"fixedOrbitId": "sso"` і `capacityKg: { "sso": 200 }`.
Для місії `iss` ключ `capacityKg` — `iss`: маса на орбіту виведення в площині МКС; вплив
широти космодрому й висоти виведення рахує бекенд.

`maxBusSize` (D93) — найбільший клас корпусу, що вміщується в обтічник носія: `small` ·
`medium` · `large`. Попутний запуск (`rideshare`) бере лише `small` і `medium`; більший
корпус дає перевірку `check.launch.busTooLarge`. Класи носіїв — задачі 016, 017.

#### `Part`

```json
{
  "id": "radio-x", "category": "radio", "tier": "best", "nameCode": "part.radioX",
  "massKg": 0.13, "priceK": 25, "consumptionW": 20,
  "specs": { "rateKbps": 50000, "band": "x" },
  "requires": [],
  "source": {…}
}
```

`category` і можливі `specs`:

| Категорія | Ідентифікатори місії 1 | `specs` |
| --- | --- | --- |
| `bus` | `bus-s`, `bus-m`, `bus-l` | `maxMassKg`, `slots`, `dragAreaM2`, `busSize` |
| `solar` | `solar-body`, `solar-deploy`, `solar-roll` | `powerW` |
| `battery` | `bat-s`, `bat-m`, `bat-l` | `capacityWh` |
| `radio` | `radio-uhf`, `radio-s`, `radio-x` | `rateKbps`, `band` |
| `computer` | `cpu-basic`, `cpu-power` | `storageGb` |
| `adcs` | `adcs-basic`, `adcs-fine` | `accuracyDeg` |
| `propulsion` | `prop-none`, `prop-cold`, `prop-chem`, `prop-elec` | `ispS`, `thrustN`, `propellantKg`, `powerW` |

- `rateKbps` — паспортна швидкість на опорній відстані 1000 км (D80); `band` — `uhf` · `s`
  · `x`.
- `storageGb` — бортова пам'ять (розділ 2.7 плану; оцінка: простий 32, потужний 512).
- `dragAreaM2` — площа поперечного перерізу для гальмування (розділ 2.8 плану); розкладені
  панелі додають свою площу — це рахує бекенд (D93).
- `busSize` — клас корпусу для перевірки обтічника (D93): `small` · `medium` · `large`
  (`bus-s` · `bus-m` · `bus-l`).
- Двигун (D81): `ispS` — питомий імпульс; `thrustN` — тяга; `propellantKg` — паливо в
  баку, входить у масу на старті поверх `massKg` (суха маса); `powerW` — споживання під час
  роботи (лише `prop-elec`, в інших `0`). У `prop-none` усі чотири — `0`. Числа — задача 016.
- Деталі корабля для місії `iss` (герметичний обсяг, стикування) — задача 017; нові поля
  `specs` для них додаються окремою зміною контракту.

`tier` (`basic` · `medium` · `best`) задає час виготовлення (D66). `requires` — що ця
деталь вимагає, наприклад X-радіо: `[{ "category": "adcs", "partId": "adcs-fine" }]`.

#### `Instrument`

```json
{
  "id": "camera", "nameCode": "instrument.camera", "tier": "best",
  "massKg": 12, "priceK": 80, "consumptionW": 25,
  "dataRateKbps": 40000, "value": "high",
  "requires": [{ "category": "computer", "partId": "cpu-power" }, { "category": "adcs", "partId": "adcs-fine" }],
  "source": {…}
}
```

Ідентифікатори місії 1: `magnetometer`, `radiometer`, `camera`, `radar`. `value`: `low` ·
`medium` · `high` · `highest`. У місії `iss` інструментів немає (масив порожній).

#### `GroundStation`

```json
{ "id": "fairbanks", "nameCode": "station.fairbanks", "latitudeDeg": 65, "longitudeDeg": -147.5, "bands": ["uhf", "s", "x"], "priceK": 30, "source": {…} }
```

Ідентифікатори місії 1: `fairbanks`, `white-sands`, `guam`. `longitudeDeg` — схід додатний;
потрібна для сеансів (D79) і зон станцій на карті.

#### `LaunchSite` (лише `iss`)

```json
{ "id": "cape-canaveral", "nameCode": "site.capeCanaveral", "latitudeDeg": 28.5, "longitudeDeg": -80.6, "source": {…} }
```

Космодроми з задачі 017: `cape-canaveral` (28,5°), `wallops` (37,8°) і для контрасту
`kodiak` (57,4°) — вище нахилу МКС, тож потрібна зміна площини (D104). Широта задає найменший нахил `i ≥ φ` і бонус обертання Землі (розділ 2.9 плану).

#### `CargoCategory` (лише `iss`)

```json
{ "id": "science", "nameCode": "cargo.science", "value": "highest", "typicalMassKg": 800, "source": {…} }
```

Категорії й маси — з прес-кітів Commercial Resupply (задача 017). `value` — як в
`Instrument`; з нього рахується бал наукової цінності місії 2 і частка науки в цілі.

#### `Preset`

Готові набори для простішої версії SINGLE (D48): `{ "id", "nameCode", "design": Design }`.

---

### Проєкт місії — `Design`

Один і той самий об'єкт у `evaluate`, `simulate` і `attempts`.

Місія з `kind` `orbit` або `tutorial`:

```json
{
  "missionId": "sat-orbit",
  "version": "simple",
  "orbit": { "presetId": "sso" },
  "launchId": "small",
  "parts": {
    "bus": "bus-m", "solar": "solar-deploy", "battery": "bat-m",
    "radio": "radio-x", "computer": "cpu-power", "adcs": "adcs-fine",
    "propulsion": "prop-chem"
  },
  "instrumentIds": ["camera"],
  "groundStationIds": ["fairbanks"]
}
```

Місія з `kind` `iss`:

```json
{
  "missionId": "iss-cargo",
  "version": "simple",
  "orbit": null,
  "launchId": "medium",
  "launchSiteId": "cape-canaveral",
  "insertionAltitudeKm": 200,
  "parts": {
    "bus": "ship-pressurized", "solar": "solar-deploy", "battery": "bat-m",
    "radio": "radio-s", "computer": "cpu-basic", "adcs": "adcs-fine",
    "propulsion": "prop-chem"
  },
  "instrumentIds": [],
  "groundStationIds": ["white-sands"],
  "cargo": [
    { "categoryId": "crew-supplies", "massKg": 1500 },
    { "categoryId": "science", "massKg": 1000 }
  ],
  "relay": true
}
```

- `version`: `simple` або `advanced` (D46). Фізика однакова; різниться лише текст
  коментарів ролей.
- `orbit`: у простішій версії — `{ "presetId": "sso" }`; у складнішій можна задати числа:
  `{ "altitudeKm": 650, "inclinationDeg": 98 }`. Із `rideshare` орбіта завжди `sso`. Для
  `iss` — `null`: ціль — орбіта МКС із каталогу.
- У `parts` кожна з **семи** категорій обов'язкова й має одну деталь; без двигуна —
  `"propulsion": "prop-none"` (D81).
- Порожній `instrumentIds` чи `groundStationIds` — допустимо; перевірки покажуть наслідок.
- Лише для `iss` (обов'язкові там, відсутні в інших місіях):
  - `launchSiteId` — космодром із `catalogs.launchSites`;
  - `insertionAltitudeKm` — висота кругової орбіти виведення, з якої корабель робить
    Гоманівський перехід до МКС;
  - `cargo` — вантаж за категоріями з `catalogs.cargoCategories`, кожна категорія не
    більше одного разу;
  - `relay` — `true`: зв'язок через ретранслятори TDRS (Near Space Network) — безперервний,
    але платний; `false` — лише наземні станції з `groundStationIds`.

#### Складніша версія: `layout` і `massReservePct` (D93)

Лише у `version: "advanced"`; у `simple` обидва поля відсутні або `null` — розміщення й
запас автоматичні (бекенд ставить кожну деталь на правильну сторону й бере
`limits.massReserveRecommendedPct`).

```json
{
  "missionId": "sat-orbit",
  "version": "advanced",
  "orbit": { "altitudeKm": 650, "inclinationDeg": 98 },
  "launchId": "small",
  "parts": { "bus": "bus-m", "solar": "solar-deploy", "battery": "bat-m", "radio": "radio-x",
             "computer": "cpu-power", "adcs": "adcs-fine", "propulsion": "prop-chem" },
  "instrumentIds": ["camera"],
  "groundStationIds": ["fairbanks"],
  "layout": { "camera": "earth", "radio": "earth", "adcs": "space", "solar": "sun" },
  "massReservePct": 20
}
```

- `layout` — сторона корпусу для деталі: ключ — категорія деталі з `parts` (крім `bus`) або
  id інструмента з `instrumentIds`; значення — `earth` (до Землі) · `space` (у космос) ·
  `sun` (до Сонця) · `inside` (всередині). Не вказана деталь стає на правильну сторону
  автоматично. Не та сторона — наслідок у фізиці й перевірка `check.space.wrongSide`:
  інструмент не знімає, антена втрачає частину сеансу, панель дає менше енергії. Правильні
  сторони й частки втрат — задача 004 (документи NASA, D89, або позначені оцінки, D51).
- `massReservePct` — запас маси на непередбачене, 0–50 %; `null` — рекомендований із
  `limits`. Маса із запасом (`resources.mass.withReserveKg`) порівнюється з
  вантажопідйомністю носія; запас нижче рекомендованого — `check.space.massReserveLow`.

#### Хто власник рішення (D92)

Кожне поле `Design` має рівно одного власника-роль. Фронтенд показує його в консолі цієї
ролі, а коментар ролі (`comments[].role`) говорить про рішення свого власника або про
ресурс, за який вона відповідає.

| Поле `Design` | Роль-власник |
| --- | --- |
| `orbit`, `launchId`, `groundStationIds`, `launchSiteId`, `insertionAltitudeKm`, `relay` | `planner` |
| `instrumentIds`, `cargo` | `scientist` |
| `parts.solar`, `parts.battery`, `parts.radio`, `parts.computer`, `parts.adcs`, `parts.propulsion` | `engineer` |
| `parts.bus`, `layout`, `massReservePct` | `designer` |

| Ресурс | Відповідає |
| --- | --- |
| `mass` | `designer` |
| `power` | `engineer` |
| `budget`, `comms`, `time` | `planner` |
| `data` | `scientist` |

---

### `POST /api/evaluate`

Запит — `Design`. Відповідь миттєва (без покрокової симуляції); фронтенд викликає її після
кожної зміни з затримкою ~300 мс (D39).

Приклад — відповідь на перший `Design` вище (камера, X-радіо, точна орієнтація, хімічний
двигун, малий носій):

```json
{
  "orbit": {
    "altitudeKm": 705, "inclinationDeg": 98.2,
    "periodMin": 98.7, "speedKmS": 7.5, "eclipseFraction": 0.36,
    "lifetimeYears": 120, "disposalYears": 18
  },
  "resources": {
    "mass":   { "usedKg": 52.2, "busMaxKg": 150, "launchCapacityKg": 300, "slotsUsed": 8, "slots": 12,
                "reservePct": 15, "reserveKg": 7.3, "withReserveKg": 60, "recommendedReservePct": 15 },
    "power":  { "generationW": 135, "averageGenerationW": 86.4, "averageConsumptionW": 83, "eclipseNeedWh": 49.2, "batteryWh": 150 },
    "budget": { "usedK": 541, "limitK": 450 },
    "data":   { "generatedGbPerDay": 432, "downlinkGbPerDay": 30, "storageGb": 512, "expectedTotalGb": 10950, "goalGb": 500 },
    "comms":  { "contactsPerDay": 10, "contactMinutesPerDay": 80 },
    "time":   { "readyMonth": 12, "launchMonth": 15, "deadlineMonth": 18 },
    "propellant": { "neededKg": 3.6, "capacityKg": 4, "deltaVms": 160 },
    "cargo": null
  },
  "rendezvous": null,
  "layout": { "solar": "sun", "battery": "inside", "radio": "earth", "computer": "inside",
              "adcs": "space", "propulsion": "space", "camera": "earth" },
  "orbitStrip": {
    "periodMin": 98.7,
    "eclipse": { "startMin": 31.6, "endMin": 67.1 },
    "contacts": [ { "stationId": "fairbanks", "startMin": 70.2, "endMin": 79.6 } ]
  },
  "calc": [
    {
      "code": "calc.power.eclipseBattery", "resource": "power",
      "formula": "E_ecl = P_ecl · T · f",
      "inputs": [
        { "name": "P_ecl", "value": 29.9, "unit": "W" },
        { "name": "T", "value": 98.7, "unit": "min" },
        { "name": "f", "value": 0.36, "unit": "" }
      ],
      "result": { "name": "E_ecl", "value": 49.2, "unit": "Wh" },
      "summary": { "code": "calc.power.eclipseBattery.summary", "params": { "eclipsePct": 36, "neededWh": 49.2 } },
      "source": { "kind": "nasa", "note": "DoD = E(removed)/E(rated)·100 — NASA/TM-2009-215751, Appendix A; допустима DoD 30 % / 70 % — ігрова оцінка", "url": null }
    }
  ],
  "checks": [
    { "segment": "mission", "status": "fail", "code": "check.mission.overBudget",  "params": { "usedK": 541, "limitK": 450 } },
    { "segment": "launch",  "status": "ok",   "code": "check.launch.capacity",     "params": { "massKg": 52.2, "capacityKg": 300 } },
    { "segment": "space",   "status": "warn", "code": "check.space.powerMargin",   "params": { "marginPct": 4 } },
    { "segment": "space",   "status": "warn", "code": "check.space.propellantMargin", "params": { "neededKg": 3.6, "capacityKg": 4 } },
    { "segment": "space",   "status": "ok",   "code": "check.space.disposal",      "params": { "disposalYears": 18, "limitYears": 25 } },
    { "segment": "ground",  "status": "warn", "code": "check.ground.dataBacklog",  "params": { "generatedGbPerDay": 432, "downlinkGbPerDay": 30 } },
    { "segment": "user",    "status": "ok",   "code": "check.user.goalReached",    "params": { "expectedGb": 10950, "goalGb": 500 } }
  ],
  "comments": [
    {
      "role": "planner", "severity": "warn",
      "message": { "code": "comment.planner.overBudget", "params": { "overK": 91 } },
      "advice":  { "code": "advice.planner.cheaperLaunchOrParts", "params": {} }
    },
    {
      "role": "engineer", "severity": "warn",
      "message": { "code": "comment.engineer.powerMarginLow", "params": { "marginPct": 4 } },
      "advice":  { "code": "advice.engineer.biggerPanels", "params": {} }
    }
  ]
}
```

Звідки числа: орбіта 705 км — період 98,7 хв, тінь 36 % витка; камера 40 Мбіт/с дає 432 ГБ
на добу; X-радіо 50 Мбіт/с за 80 хв зв'язку передає 30 ГБ на добу; бюджет — сума цін
деталей, інструмента, станції й носія; найкращі деталі (8 міс.) + інтеграція (4 міс.) =
готовність на 12-му місяці, малий носій — старт на 15-му. Без двигуна орбіта 705 км
трималася б ~120 років — довше за 25 років правила NASA-STD-8719.14, тож двигун витрачає
~155 м/с на відведення наприкінці (плюс ~5 м/с на підтримання), і апарат сходить за 18 років.
Числа двигуна — ілюстрація до задач 016 і 004.

- `orbit.lifetimeYears` — скільки протримається орбіта без маневрів, доки висота не впаде
  нижче 180 км (розділ 2.8 плану). Вище 1000 км (кінець таблиці густини) — `1000`: межа
  розрахунку, «практично вічно».
- `orbit.disposalYears` — за скільки років апарат зійде з орбіти після кінця місії з
  урахуванням маневру відведення, на який вистачає палива; порівнюється з 25 роками.
  Для `iss` обидва — `null` (корабель відводить сама місія). Для орбіт вище 2000 км
  (`meo`, `geo`) `disposalYears` — `null` і перевірки відведення немає: правило 25 років
  стосується гальмування в атмосфері, для високих орбіт NASA-STD-8719.14 дає інші способи
  (орбіта захоронення).
- `resources.data.storageGb` — бортова пам'ять із комп'ютера; що не влізло — втрачено.
- `resources.propellant` — `deltaVms`: увесь потрібний Δv (підтримання орбіти, відведення,
  для `iss` — перехід, фазування, зміна площини, підхід, запас); `neededKg` — паливо за
  Ціолковським; `capacityKg` — бак двигуна.
- `resources.data` — лише для `orbit` і `tutorial`, для `iss` — `null`.
- `resources.cargo` — лише для `iss`, в інших — `null`:
  `{ "loadedKg": 2500, "scienceKg": 1000, "sciencePct": 40, "goalKg": 2500, "scienceMinPct": 30 }`.
- `rendezvous` — лише для `iss`, в інших — `null`. Розділ 2.10 плану; приклад для виведення
  на 200 км із мису Канаверал:

  ```json
  { "hohmannDeltaVms": 126, "phasingDays": 2.1, "planeChangeDeltaVms": 0 }
  ```

  `hohmannDeltaVms` — сума двох імпульсів переходу (200 → 418 км: 63 + 63 м/с);
  `phasingDays` — дні наздоганяння МКС для найгіршого початкового кута (у `simulate` —
  справжній кут із seed); `planeChangeDeltaVms` — `2v·sin(Δi/2)`, якщо площину виведення
  треба повертати.
- `segment` у `checks`: `launch` · `space` · `ground` · `user` (D23) і `mission` — для
  лімітів усієї місії (бюджет, строк).
- `status`: `ok` · `warn` · `fail`.
- `role`: `engineer` · `designer` · `planner` · `scientist` (D13, D27).
- `severity`: `info` · `warn`.
- `advice` є лише у версії `simple`; у `advanced` — `null` (D48).
- Числа в прикладі округлені; точні рахує бекенд.
- `resources.mass` (D93): `usedKg` — суха маса деталей, інструментів і палива;
  `reservePct` — запас із `Design.massReservePct` або рекомендований; `reserveKg` і
  `withReserveKg` — запас і маса з ним, яку перевіряють проти `launchCapacityKg`;
  `recommendedReservePct` — з `limits`.
- `layout` — фактичні сторони всіх деталей і інструментів після автоматичного розміщення
  (у `simple` — повністю автоматичні). Ключі й значення — як у `Design.layout`.
- `orbitStrip` — один виток для смужки «світло й тінь, сеанси» (D94, розділ 3 пропозиції):
  `eclipse` — тінь у хвилинах від початку витка (найгірший випадок β = 0, як у всьому
  `evaluate`), `null` — тіні немає; `contacts` — сеанси зі станціями на витку з найдовшим
  зв'язком за типову добу (для `iss` з `relay` — один сеанс на весь виток, `stationId`
  `tdrs`). Порожній — сеансів немає.
- `calc` — розрахункові листи (D94), по одному на кожну формулу, що дала число в
  `resources`, `orbit` чи `rendezvous`: `code` — з переліку `calc.*`; `resource` —
  `mass` · `power` · `budget` · `data` · `comms` · `time` · `orbit` · `propellant` ·
  `rendezvous`; `formula` — запис формули з позначеннями `inputs`; `inputs` і `result` —
  підставлені числа з одиницями (`unit` — текст позначення, порожній для безрозмірних);
  `summary` — один рядок пояснення для простішої версії; `source` — документ NASA з
  розділом або сторінкою (D89). Порядок — за ресурсами, як у панелі. Фронтенд показує лист
  повністю у складнішій версії й лише `summary` — у простішій.

### `POST /api/simulate`

```json
{ "design": Design, "seed": 12345 }
```

`seed` необов'язковий; якщо його немає, бекенд обирає сам і повертає. Той самий `design` і
`seed` дають той самий результат (D65), зокрема ті самі бурі DONKI (D83).

```json
{
  "seed": 12345,
  "evaluation": { …відповідь evaluate… },
  "timeline": {
    "stepDays": 1,
    "days":            [0, 1, 2],
    "batteryMinPct":   [100, 67, 67],
    "dataStoredGb":    [0, 402, 804],
    "dataDeliveredGb": [0, 30, 60],
    "altitudeKm":      [705, 705, 705],
    "propellantKg":    [4, 4, 4]
  },
  "groundTrack": {
    "stepSeconds": 60,
    "orbitCount": 3,
    "points": [
      { "latDeg": 0, "lonDeg": -75.2, "sunlit": true },
      { "latDeg": 3.8, "lonDeg": -76.0, "sunlit": true }
    ]
  },
  "contacts": [
    { "stationId": "fairbanks", "contactsPerDay": 10, "minutesPerDay": 80, "visibilityRadiusDeg": 21.6 }
  ],
  "rendezvous": null,
  "events": [
    {
      "day": 143, "type": "solarStorm", "segment": "space",
      "message": { "code": "event.solarStorm", "params": { "kp": 8, "lostContacts": 6 } },
      "source": {
        "kind": "donki", "eventId": "2015-03-17T00:00:00-GST-001",
        "observedAt": "2015-03-17T15:00:00Z", "kp": 8,
        "periodStart": "2014-10-26", "periodEnd": "2015-10-25"
      }
    },
    {
      "day": 201, "type": "debris", "segment": "space",
      "message": { "code": "event.debrisAvoidance", "params": { "deltaVms": 0.5, "propellantKg": 0.01 } },
      "source": { "kind": "seeded" }
    }
  ],
  "report": Report
}
```

- Ряди `timeline` однакової довжини, від старту до кінця строку роботи (для `iss` — до
  кінця перебування біля станції). `altitudeKm` — середня висота за добу (знижується
  гальмуванням, D81); `propellantKg` — паливо в баку на кінець доби.
- `groundTrack` — траса трьох перших витків для карти (задача 010): точки з кроком
  `stepSeconds`; `sunlit` — апарат на світлі (не в тіні Землі).
- `contacts` — для кожної вибраної станції: сеанси й хвилини зв'язку на добу (D79);
  `visibilityRadiusDeg` — кутовий радіус зони видимості станції на карті при масці 10°.
  Для `iss` з `relay: true` додається рядок `{ "stationId": "tdrs", …,
  "visibilityRadiusDeg": null }`.
- `rendezvous` — лише для `iss`, в інших — `null`. Покроковий профіль зближення для
  задачі 024:

  ```json
  {
    "initialPhaseAngleDeg": 35,
    "stepHours": 1,
    "hours":         [0, 1, 2],
    "phaseAngleDeg": [35, 24.4, 13.8],
    "altitudeKm":    [200, 200, 200],
    "propellantKg":  [900, 900, 900],
    "dockedAtHours": 51
  }
  ```

  `phaseAngleDeg` — на скільки градусів МКС попереду корабля; `dockedAtHours` — `null`,
  якщо корабель не пристикувався.
- `type` події: `solarStorm` · `debris` · `failure` · `reentry` (висота нижче 180 км —
  місія закінчується, D81) · `spaceWeatherUnavailable`.
- `source` події — звідки вона: `{ "kind": "seeded" }` — з генератора за seed (сміття,
  відмови, сходження з орбіти); `{ "kind": "donki", … }` — справжня буря NASA DONKI (D83):
  `eventId` — ідентифікатор `gstID` з DONKI, `observedAt` — справжня дата бурі, `kp` —
  найбільший індекс Kp, `periodStart` і `periodEnd` — історичний 12-місячний період, який
  обрав seed.
- Помилка DONKI не ламає симуляцію: якщо API недоступний і кешу немає, бур немає, а в
  `events` з'являється одна подія `{ "day": 0, "type": "spaceWeatherUnavailable",
  "segment": "space", "message": { "code": "event.spaceWeatherUnavailable", … } }` із
  `source` `donki`, де `eventId`, `observedAt` і `kp` — `null`.

#### `Report`

```json
{
  "success": false,
  "scores": {
    "missionSuccess":     { "value": 40, "formula": "100 × Σ(wᵢ × sᵢ) / Σwᵢ" },
    "scienceValue":       { "value": 90, "formula": "100 × min(1, Σ(dataᵢ × valueᵢ) / goal)" },
    "resourceEfficiency": { "value": 35, "formula": "mean over 6 resources of score(1 − used / limit)" },
    "decisionQuality":    { "value": 55, "formula": "100 − 15 × unresolved warnings − 30 × failed checks" }
  },
  "limits": [
    { "status": "fail", "code": "check.mission.overBudget", "params": { "usedK": 541, "limitK": 450 } },
    { "status": "ok",   "code": "check.mission.launchOnTime", "params": { "launchMonth": 15, "deadlineMonth": 18 } }
  ],
  "segments": [
    {
      "segment": "ground", "status": "ok",
      "chain": [
        { "kind": "decision",    "code": "chain.decision.radio",   "params": { "rateKbps": 50000 } },
        { "kind": "physics",     "code": "chain.physics.downlink", "params": { "minutesPerDay": 80, "gbPerDay": 30 }, "formula": "data = rate × contact time" },
        { "kind": "consequence", "code": "chain.consequence.goal", "params": { "deliveredGb": 10950, "goalGb": 500 } }
      ]
    }
  ],
  "bottleneck": { "resource": "budget", "code": "bottleneck.budget", "params": { "usedK": 541, "limitK": 450 } },
  "comparison": {
    "kind": "real",
    "missionId": "landsat-9",
    "nameCode": "reference.landsat9",
    "deltas": { "altitudeKm": 0, "inclinationDeg": 0, "massKg": -2658, "dataGb": -2000 },
    "source": { "kind": "nasa", "note": "NSSDCA Master Catalog", "url": null }
  }
}
```

- `limits` — перевірки лімітів усієї місії (сегмент `mission` з `evaluate`). Перевищений
  ліміт робить `success: false`, навіть якщо всі сегменти `ok`.
- `scores` — чотири бали з D25 і D82; кожен — `{ "value": 0–100, "formula": "…" }`.
  `formula` — рядок для показу поруч із балом (розділ 3 плану); фронтенд не рахує його сам.
- `segments` — завжди чотири, у порядку `launch`, `space`, `ground`, `user`.
- `chain` — ланки «рішення → фізика → наслідок» (D49); `formula` — рядок для показу,
  поруч фронтенд показує словесне пояснення з коду (D53).
- `bottleneck.resource`: `mass` · `power` · `budget` · `data` · `comms` · `time`.
- `comparison` — найближча схожа місія з бібліотеки (D85, задачі 019 і 023), або `null`,
  якщо бібліотека порожня:
  - `kind`: `real` — справжня місія NASA; `modeled` — еталонний проєкт, прорахований
    нашою симуляцією;
  - `missionId` — ідентифікатор у бібліотеці, `nameCode` — ключ назви;
  - `deltas` — різниця «проєкт гравця мінус схожа місія»; ключі з одиницею в назві, лише
    ті, що є в обох: `altitudeKm`, `inclinationDeg`, `massKg`, `dataGb` (`orbit`,
    `tutorial`), `cargoKg` (`iss`), `budgetK` (лише `modeled`);
  - `source` — джерело чисел справжньої місії (D51); для `modeled` — `null`.

### `POST /api/attempts`

```json
{ "playerId": "8c5f…uuid", "design": Design, "seed": 12345 }
```

Бекенд сам проганяє симуляцію й зберігає результат.

```json
{ "id": "a1b2…uuid", "createdAt": "2026-11-15T10:20:00Z", "seed": 12345, "success": false, "scores": { … }, "bottleneck": { … } }
```

`playerId` — UUID, який фронтенд створює й тримає в `localStorage`; реєстрації немає.
`scores` і `bottleneck` — як у `Report`.

### `GET /api/attempts?playerId=…`

Масив коротких записів як у відповіді `POST`, нові спершу, до 20 штук.

### `GET /api/attempts/{id}`

```json
{ "id": "…", "createdAt": "…", "playerId": "…", "design": Design, "seed": 12345, "result": { …відповідь simulate… } }
```

---

### Кооператив — кімнати **v2.2** (D109)

До чотирьох гравців спільно ведуть один `Design` через посилання. Кімната живе в пам'яті
бекенду: зникає через 6 годин без дій або при перезапуску сервера. Гравця впізнають за тим
самим `playerId` з `localStorage`, що й у спробах; іншим гравцям `playerId` не показується —
лише номер місця `slot` (1–4) та ім'я.

Синхронізація — опитуванням (D109): фронтенд раз на ~1 с викликає `GET /api/rooms/{code}`
з `since` — номером останнього відомого стану. Кожна зміна кімнати збільшує `revision`.

**Ролі.** Творець кімнати отримує всі чотири ролі. Роль має одного власника (`slot`) або
вільна (`null`). Один гравець може тримати кілька ролей. Призначити роль
(`PUT …/roles/{role}`) можна:

- свою — будь-якому гравцеві кімнати або звільнити (`slot: null`);
- вільну або роль гравця, що не на зв'язку (`online: false`), — лише собі.

**Зміни проєкту.** Гравець надсилає повний `Design`, а бекенд бере з нього лише поля ролей
цього гравця (таблиця «Хто власник рішення» вище); решту полів лишає з поточного проєкту
кімнати. Тож застарілі чужі поля у фронтенді нічого не перезаписують. `missionId` і `version`
задаються при створенні кімнати й не змінюються. Після злиття бекенд перевіряє проєкт, як
`evaluate`; помилка перевірки — `400`, і кімната не змінюється.

**Старт місії** (D97). Натиснути може будь-який гравець, коли кожна роль має власника.
Бекенд проганяє `simulate`, кімната переходить у `phase: "launched"`, і всі бачать звіт та
хто натиснув. Проєкт після старту не змінюється. `POST …/reset` повертає кімнату до
проєктування з тим самим проєктом — для нової спроби.

**Посилання** для друга формує фронтенд, наприклад
`https://shelbythx.github.io/space-game/#/coop/K7QX2`.

| Метод і шлях | Що робить |
| --- | --- |
| `POST /api/rooms` | Створити кімнату |
| `GET /api/rooms/{code}?playerId=…&since=…` | Стан кімнати; позначає гравця «на зв'язку» |
| `POST /api/rooms/{code}/join` | Увійти в кімнату (повторний вхід з тим самим `playerId` — дозволено) |
| `POST /api/rooms/{code}/leave` | Вийти; ролі гравця стають вільними |
| `PUT /api/rooms/{code}/roles/{role}` | Віддати, звільнити чи забрати роль |
| `PUT /api/rooms/{code}/design` | Змінити поля своїх ролей |
| `POST /api/rooms/{code}/launch` | Старт місії: симуляція й звіт для всіх |
| `POST /api/rooms/{code}/reset` | Після старту — назад до проєктування |

#### `POST /api/rooms`

```json
{ "playerId": "8c5f…uuid", "name": "Bohdan", "design": Design }
```

`design` — стартовий проєкт (наприклад, набір місії); з нього беруться `missionId` і
`version` кімнати. Відповідь — `201` і `RoomState`.

#### `POST /api/rooms/{code}/join` · `POST /api/rooms/{code}/leave`

```json
{ "playerId": "8c5f…uuid", "name": "Ira" }
```

`join` — `200` і `RoomState`; гравець без ролей отримує вільне місце. Повторний вхід
оновлює ім'я. `leave` — `200` і `RoomState` (поле `name` не потрібне).

`name` — до 24 символів; порожнє чи відсутнє — фронтенд показує «Гравець N».

#### `GET /api/rooms/{code}?playerId=…&since=…`

`200` і `RoomState`; якщо `since` дорівнює поточному `revision` — `204` без тіла. Запит з
`playerId` гравця кімнати оновлює його «на зв'язку»; без `playerId` — перегляд без місця.

#### `PUT /api/rooms/{code}/roles/{role}`

`role` — `engineer` · `designer` · `planner` · `scientist`.

```json
{ "playerId": "8c5f…uuid", "slot": 2 }
```

`slot: null` — звільнити роль. Відповідь — `200` і `RoomState`.

#### `PUT /api/rooms/{code}/design`

```json
{ "playerId": "8c5f…uuid", "design": Design }
```

Відповідь — `200` і `RoomState` (з новим `evaluation`).

#### `POST /api/rooms/{code}/launch` · `POST /api/rooms/{code}/reset`

```json
{ "playerId": "8c5f…uuid", "seed": 12345 }
```

`seed` — лише для `launch`, необов'язковий. Відповідь — `200` і `RoomState`.

#### `RoomState`

```json
{
  "code": "K7QX2",
  "revision": 17,
  "phase": "design",
  "missionId": "sat-orbit",
  "version": "simple",
  "you": { "slot": 1 },
  "players": [
    { "slot": 1, "name": "Bohdan", "online": true },
    { "slot": 2, "name": "Ira", "online": true }
  ],
  "roles": { "engineer": 1, "designer": 1, "planner": 2, "scientist": null },
  "design": Design,
  "evaluation": { …відповідь evaluate… },
  "lastChange": { "slot": 2, "kind": "design", "fields": ["orbit", "groundStationIds"] },
  "launch": null
}
```

- `phase`: `design` · `launched`.
- `you` — місце гравця з `playerId` запиту; `null`, якщо його немає в кімнаті.
- `players` — за `slot`; `online` — останній запит гравця був не раніше ніж 30 с тому.
- `roles` — власник кожної ролі (`slot`) або `null`.
- `lastChange` — остання зміна, щоб фронтенд показав «хто що змінив»: `kind` — `create` ·
  `join` · `leave` · `roles` · `design` · `launch` · `reset`; `fields` — для `design` шляхи
  змінених полів як у таблиці власників (`parts.solar`, `orbit`…), для `roles` — назви ролей,
  інакше порожній.
- `launch` — `null` до старту; після — `{ "slot": 2, "seed": 12345, "result": { …відповідь
  simulate… } }`.

Помилки кімнат — `404` чи `409` з кодом у `title` або `400` з полем `errors` (розділ
«Помилки кооперативу — `room.*`»); помилки перевірки проєкту — як у `evaluate`.

---

## Перелік кодів

Ключі i18n, які повертає бекенд, і їхні `params`. Позначка **v2** — нові у версії 2.
Бекенд не повертає кодів, яких немає в переліку; новий код — зміна контракту (рядок тут +
переклад `en` і `uk`).

### Назви з каталогів

`nameCode`, `titleCode`, `briefingCode` будуються за схемою `<група>.<id у camelCase>`:
`mission.<id>.title`, `mission.<id>.briefing`, `orbit.<id>`, `launch.<id>`, `part.<id>`,
`instrument.<id>`, `station.<id>`, `site.<id>` (**v2**), `cargo.<id>` (**v2**),
`reference.<id>` (**v2**), `preset.<id>`. Наприклад `prop-cold` → `part.propCold`,
`cubesat-learn` → `mission.cubesatLearn.title`.

### Перевірки — `check.*`

| Код | Сегмент | `params` |
| --- | --- | --- |
| `check.mission.overBudget` | mission | `usedK`, `limitK` |
| `check.mission.withinBudget` | mission | `usedK`, `limitK` |
| `check.mission.launchOnTime` | mission | `launchMonth`, `deadlineMonth` |
| `check.mission.launchLate` | mission | `launchMonth`, `deadlineMonth` |
| `check.launch.capacity` | launch | `massKg`, `capacityKg` |
| `check.launch.overCapacity` | launch | `massKg`, `capacityKg` |
| `check.launch.orbitUnreachable` | launch | `launchId`, `orbitId` |
| `check.launch.siteInclination` **v2** | launch | `latitudeDeg`, `targetInclinationDeg`, `planeChangeDeltaVms` |
| `check.launch.busTooLarge` **v2** | launch | `busSize`, `maxBusSize` |
| `check.space.busOverMass` | space | `massKg`, `busMaxKg` |
| `check.space.slots` | space | `slotsUsed`, `slots` |
| `check.space.powerMargin` | space | `marginPct` |
| `check.space.powerDeficit` | space | `marginPct` |
| `check.space.batteryShort` | space | `neededWh`, `capacityWh` |
| `check.space.missingRequirement` | space | `partId`, `requiredPartId` |
| `check.space.wrongSide` **v2** | space | `partId`, `side`, `expectedSide` |
| `check.space.massReserveLow` **v2** | space | `reservePct`, `recommendedPct` |
| `check.space.propellantMargin` **v2** | space | `neededKg`, `capacityKg` |
| `check.space.propellantShort` **v2** | space | `neededKg`, `capacityKg` |
| `check.space.orbitDecay` **v2** | space | `lifetimeYears`, `operationYears` |
| `check.space.disposal` **v2** | space | `disposalYears`, `limitYears` |
| `check.space.disposalTooLong` **v2** | space | `disposalYears`, `limitYears` |
| `check.ground.dataBacklog` | ground | `generatedGbPerDay`, `downlinkGbPerDay` |
| `check.ground.noStation` | ground | — |
| `check.ground.bandMismatch` **v2** | ground | `band`, `stationId` |
| `check.ground.storageOverflow` **v2** | ground | `storageGb`, `backlogGbPerDay` |
| `check.ground.relay` **v2** | ground | `priceK` |
| `check.ground.dockingWaitsForContact` **v2** | ground | `waitHours` |
| `check.user.goalReached` | user | `expectedGb`, `goalGb` |
| `check.user.goalMissed` | user | `expectedGb`, `goalGb` |
| `check.user.cargoDelivered` **v2** | user | `cargoKg`, `goalKg` |
| `check.user.cargoShort` **v2** | user | `cargoKg`, `goalKg` |
| `check.user.scienceShareLow` **v2** | user | `sciencePct`, `scienceMinPct` |
| `check.user.dockingLate` **v2** | user | `dockingDays`, `deadlineDays` |

### Коментарі ролей — `comment.*` і поради — `advice.*`

| Код коментаря | Порада (лише `simple`) | `params` |
| --- | --- | --- |
| `comment.planner.overBudget` | `advice.planner.cheaperLaunchOrParts` | `overK` |
| `comment.planner.launchLate` | `advice.planner.simplerParts` | `lateMonths` |
| `comment.planner.relayCost` **v2** | `advice.planner.groundOnly` | `priceK` |
| `comment.planner.launchSiteLatitude` **v2** | `advice.planner.lowerLatitudeSite` | `latitudeDeg`, `planeChangeDeltaVms` |
| `comment.engineer.powerMarginLow` | `advice.engineer.biggerPanels` | `marginPct` |
| `comment.engineer.batteryShortInEclipse` | `advice.engineer.biggerBattery` | `neededWh`, `capacityWh` |
| `comment.engineer.noPropulsionDecay` **v2** | `advice.engineer.addPropulsion` | `lifetimeYears`, `operationYears` |
| `comment.engineer.propellantShort` **v2** | `advice.engineer.biggerTankOrHigherIsp` | `neededKg`, `capacityKg` |
| `comment.engineer.disposalTooLong` **v2** | `advice.engineer.addPropulsion` | `disposalYears` |
| `comment.engineer.electricPropulsionPower` **v2** | `advice.engineer.biggerPanels` | `powerW` |
| `comment.designer.overMass` | `advice.designer.lighterParts` | `massKg`, `limitKg` |
| `comment.designer.noSlots` | `advice.designer.biggerBus` | `slotsUsed`, `slots` |
| `comment.engineer.storageSmall` **v2** | `advice.engineer.biggerStorage` | `storageGb`, `backlogGbPerDay` |
| `comment.designer.propellantMass` **v2** | `advice.designer.lowerInsertion` | `propellantKg`, `capacityKg` |
| `comment.designer.busTooLarge` **v2** | `advice.designer.smallerBusOrLaunch` | `busSize`, `maxBusSize` |
| `comment.designer.wrongSide` **v2** | `advice.designer.turnPart` | `partId`, `side`, `expectedSide` |
| `comment.designer.massReserveLow` **v2** | `advice.designer.raiseReserve` | `reservePct`, `recommendedPct` |
| `comment.scientist.dataBacklog` | `advice.scientist.fasterRadioOrStations` | `generatedGbPerDay`, `downlinkGbPerDay` |
| `comment.scientist.goalMissed` | `advice.scientist.betterInstrument` | `expectedGb`, `goalGb` |
| `comment.scientist.scienceCargoLow` **v2** | `advice.scientist.moreScienceCargo` | `sciencePct`, `scienceMinPct` |
| `comment.scientist.bandMismatch` **v2** | `advice.scientist.matchStationBand` | `band` |

Пам'ять (`storageSmall`) — коментар Інженера: комп'ютер належить йому (D92).

### Розрахункові листи — `calc.*` **v2**

Кожен код має пару `<код>.summary` — рядок для простішої версії з тими самими `params`,
що вказані тут. Формули — розділ 2 плану; джерела NASA — задача 026.

| Код | `resource` | `params` у `summary` |
| --- | --- | --- |
| `calc.mass.total` | mass | `usedKg`, `reservePct`, `withReserveKg`, `capacityKg` |
| `calc.power.balance` | power | `averageGenerationW`, `averageConsumptionW`, `marginPct` |
| `calc.power.eclipseBattery` | power | `eclipsePct`, `neededWh` |
| `calc.budget.total` | budget | `usedK`, `limitK` |
| `calc.data.generated` | data | `generatedGbPerDay` |
| `calc.data.downlink` | data | `rateKbps`, `distanceKm`, `downlinkGbPerDay` |
| `calc.comms.contacts` | comms | `contactsPerDay`, `contactMinutesPerDay` |
| `calc.time.ready` | time | `buildMonths`, `integrationMonths`, `readyMonth`, `launchMonth` |
| `calc.orbit.period` | orbit | `altitudeKm`, `periodMin`, `speedKmS` |
| `calc.orbit.eclipse` | orbit | `altitudeKm`, `eclipsePct` |
| `calc.orbit.lifetime` | orbit | `altitudeKm`, `lifetimeYears` |
| `calc.orbit.disposal` | orbit | `disposalYears`, `limitYears` |
| `calc.propellant.rocketEquation` | propellant | `deltaVms`, `ispS`, `neededKg` |
| `calc.rendezvous.hohmann` | rendezvous | `fromKm`, `toKm`, `deltaVms` |
| `calc.rendezvous.phasing` | rendezvous | `degPerOrbit`, `phasingDays` |
| `calc.rendezvous.planeChange` | rendezvous | `deltaInclinationDeg`, `deltaVms` |

### Ланцюжки — `chain.*`

| Код | `kind` | `params` | `formula` |
| --- | --- | --- | --- |
| `chain.decision.orbit` | decision | `altitudeKm`, `inclinationDeg` | — |
| `chain.decision.radio` | decision | `rateKbps` | — |
| `chain.decision.instrument` | decision | `dataRateKbps` | — |
| `chain.decision.battery` | decision | `capacityWh` | — |
| `chain.decision.propulsion` **v2** | decision | `ispS`, `propellantKg` | — |
| `chain.decision.launchSite` **v2** | decision | `latitudeDeg` | — |
| `chain.decision.insertion` **v2** | decision | `insertionAltitudeKm` | — |
| `chain.decision.relay` **v2** | decision | `relay` (0 або 1) | — |
| `chain.physics.orbit` | physics | `periodMin`, `speedKmS` | `T = 2π√(r³/μ)` |
| `chain.physics.eclipse` | physics | `eclipseFraction` | `f = (1/π)·arccos(…)` |
| `chain.physics.power` | physics | `generationW`, `consumptionW` | `E_gen = P_gen·T·(1 − f)` |
| `chain.physics.downlink` | physics | `minutesPerDay`, `gbPerDay` | `data = rate × contact time` |
| `chain.physics.linkBudget` **v2** | physics | `distanceKm`, `rateKbps` | `rate = R·(1000 km / d)²` |
| `chain.physics.storage` **v2** | physics | `storageGb`, `lostGb` | — |
| `chain.physics.drag` **v2** | physics | `densityKgM3`, `altitudeLossKmPerYear` | `F = ½·ρ·v²·C_d·A` |
| `chain.physics.rocketEquation` **v2** | physics | `deltaVms`, `propellantKg` | `Δv = Isp·g₀·ln(m₀/m₁)` |
| `chain.physics.hohmann` **v2** | physics | `deltaV1ms`, `deltaV2ms` | `Δv₁ = √(μ/r₁)·(√(2r₂/(r₁+r₂)) − 1)` |
| `chain.physics.phasing` **v2** | physics | `degPerOrbit`, `phasingDays` | `Δθ = (n₁ − n₂)·T₁` |
| `chain.physics.planeChange` **v2** | physics | `deltaInclinationDeg`, `deltaVms` | `Δv = 2v·sin(Δi/2)` |
| `chain.physics.earthRotation` **v2** | physics | `bonusMs` | `465·cos φ` |
| `chain.consequence.goal` | consequence | `deliveredGb`, `goalGb` | — |
| `chain.consequence.dataLost` **v2** | consequence | `lostGb` | — |
| `chain.consequence.reentry` **v2** | consequence | `day` | — |
| `chain.consequence.disposal` **v2** | consequence | `disposalYears`, `limitYears` | — |
| `chain.consequence.docking` **v2** | consequence | `dockedAtHours` | — |
| `chain.consequence.cargoDelivered` **v2** | consequence | `cargoKg`, `goalKg` | — |

`formula` у таблиці — орієнтир; точний рядок і джерело NASA для кожної формули — задача 026
(`docs/physics-sources.md`, D89).

### Вузьке місце — `bottleneck.*`

`bottleneck.mass`, `bottleneck.power`, `bottleneck.budget`, `bottleneck.data`,
`bottleneck.comms`, `bottleneck.time`; `params` — `used…` і `limit…` відповідного ресурсу.

### Події — `event.*`

| Код | `type` | `params` |
| --- | --- | --- |
| `event.solarStorm` | solarStorm | `kp`, `lostContacts` |
| `event.solarStormComputerReset` **v2** | solarStorm | `kp`, `lostGb` |
| `event.debrisAvoidance` **v2** | debris | `deltaVms`, `propellantKg` |
| `event.debrisLoss` **v2** | debris | — |
| `event.failure` | failure | `partId` |
| `event.reentry` **v2** | reentry | `altitudeKm` |
| `event.spaceWeatherUnavailable` **v2** | spaceWeatherUnavailable | — |

### Помилки спроб — `attempt.*` **v2.1**

| Код | Коли |
| --- | --- |
| `attempt.playerIdRequired` | у `POST /api/attempts` або `GET /api/attempts` немає `playerId` чи він порожній UUID — `400` з полем `errors.playerId` |

### Помилки кооперативу — `room.*` **v2.2**

| Код | Статус | Коли |
| --- | --- | --- |
| `room.playerIdRequired` | `400`, `errors.playerId` | немає `playerId` чи він порожній UUID |
| `room.nameTooLong` | `400`, `errors.name` | ім'я довше за 24 символи |
| `room.unknownRole` | `400`, `errors.role` | роль не з чотирьох |
| `room.unknownSlot` | `400`, `errors.slot` | у кімнаті немає гравця з таким `slot` |
| `room.notFound` | `404` | кімнати немає або вона зникла |
| `room.full` | `409` | у кімнаті вже чотири гравці |
| `room.notMember` | `409` | гравця з `playerId` немає в кімнаті |
| `room.roleTaken` | `409` | роль чужа, а її власник на зв'язку; або вільну роль віддають іншому |
| `room.noRole` | `409` | зміна проєкту від гравця без ролей |
| `room.rolesFree` | `409` | старт, коли якась роль вільна |
| `room.launched` | `409` | зміна проєкту чи повторний старт після старту |
| `room.notLaunched` | `409` | `reset` до старту |
| `room.tooMany` | `409` | на сервері забагато кімнат (захист пам'яті) |

### Помилки перевірки запиту — `design.*`

| Код | Коли |
| --- | --- |
| `design.unknownMission` | `missionId` не існує |
| `design.unknownPart` | деталь не з каталогу місії або не тієї категорії |
| `design.missingPart` | немає однієї з семи категорій у `parts` |
| `design.unknownOrbit` | `orbit.presetId` не з каталогу |
| `design.orbitOutOfRange` | числа орбіти поза межами складнішої версії |
| `design.unknownLaunch` | `launchId` не з каталогу |
| `design.unknownInstrument` | інструмент не з каталогу |
| `design.unknownStation` | станція не з каталогу |
| `design.unknownLaunchSite` **v2** | `launchSiteId` не з каталогу |
| `design.unknownCargoCategory` **v2** | категорія вантажу не з каталогу |
| `design.duplicateCargoCategory` **v2** | категорія вантажу повторюється |
| `design.insertionAltitudeOutOfRange` **v2** | `insertionAltitudeKm` поза межами з каталогу |
| `design.issFieldRequired` **v2** | для `iss` немає `launchSiteId`, `insertionAltitudeKm`, `cargo` чи `relay` |
| `design.issFieldNotAllowed` **v2** | ці поля прийшли в місії іншого `kind` |
| `design.advancedFieldNotAllowed` **v2** | `layout` чи `massReservePct` у версії `simple` |
| `design.unknownLayoutKey` **v2** | ключ `layout` — не категорія з `parts` (крім `bus`) і не id з `instrumentIds` |
| `design.massReserveOutOfRange` **v2** | `massReservePct` поза 0–50 |
