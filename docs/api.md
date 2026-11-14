# Контракт API

Статус: **чинний** (задача 001, D60). Змінюється лише окремою задачею: спершу цей файл,
потім бекенд і фронтенд.

Межа (D59): бекенд рахує все, фронтенд лише показує. Фронтенд не повторює формул.

## Загальні правила

- REST і JSON, UTF-8. Усі шляхи починаються з `/api`. Версії в шляху немає.
- Поля — `camelCase` англійською. Одиниця — в назві поля: `massKg`, `powerW`,
  `capacityWh`, `rateKbps`, `altitudeKm`, `priceK` (тисячі ігрових кредитів), `days`,
  `month` (місяць від початку проєкту, з 0).
- Ідентифікатори — короткі рядки: `sso`, `radio-x`, `fairbanks`.
- Бекенд публікує OpenAPI на `/openapi/v1.json`; фронтенд генерує з нього типи
  TypeScript. Якщо OpenAPI розходиться з цим файлом — помилка в коді, а не тут.
- CORS: дозволено адресу GitHub Pages і `http://localhost:5173`.

### Коди повідомлень

Усі тексти для гравця (коментарі ролей, перевірки, пояснення, події) бекенд повертає
**кодом із параметрами**, а не готовим текстом:

```json
{ "code": "comment.engineer.batteryShortInEclipse", "params": { "neededWh": 62.4, "capacityWh": 40 } }
```

Код — це ключ i18n на фронтенді (`en` і `uk`). Числа в `params` — сирі, без одиниць;
фронтенд форматує їх за мовою. Новий код = рядок перекладу в обох мовах.

### Помилки

Формат RFC 7807 (`application/problem+json`). Помилка перевірки запиту — `400` з полем
`errors`: `{ "<шлях поля>": ["<код>"] }`, наприклад `{ "parts.radio": ["design.unknownPart"] }`.
Невідома місія чи спроба — `404`.

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

---

### `GET /api/health`

```json
{ "status": "ok", "version": "0.1.0" }
```

Фронтенд викликає її під час завантаження й показує «сервер прокидається», доки не прийде
відповідь (безкоштовний сервер Render засинає, D61).

### `GET /api/missions`

```json
[
  { "id": "sat-orbit", "titleCode": "mission.satOrbit.title", "available": true },
  { "id": "iss-cargo", "titleCode": "mission.issCargo.title", "available": false }
]
```

### `GET /api/missions/{id}`

```json
{
  "id": "sat-orbit",
  "titleCode": "mission.satOrbit.title",
  "briefingCode": "mission.satOrbit.briefing",
  "goal": { "dataGb": 500, "operationMonths": 12 },
  "limits": { "budgetK": 450, "launchDeadlineMonth": 18 },
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
    "groundStations": [GroundStation]
  },
  "presets": [Preset]
}
```

Числа — з `docs/catalogs.md` (D55, D56, D66).

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
{ "id": "sso", "nameCode": "orbit.sso", "altitudeKm": 705, "inclinationDeg": 98.2, "source": {…} }
```

Ідентифікатори: `leo`, `sso`, `meo`, `geo`.

#### `Launch`

```json
{
  "id": "small", "nameCode": "launch.small", "priceK": 250,
  "capacityKg": { "leo": 450, "sso": 300 },
  "fixedOrbitId": null,
  "source": {…}
}
```

Ідентифікатори: `rideshare`, `small`, `medium`. Орбіти, яких немає в `capacityKg`, носій не
виводить. У `rideshare` — `"fixedOrbitId": "sso"` і `capacityKg: { "sso": 200 }`.

#### `Part`

```json
{
  "id": "radio-x", "category": "radio", "tier": "best", "nameCode": "part.radioX",
  "massKg": 0.13, "priceK": 25, "consumptionW": 20,
  "specs": { "rateKbps": 50000 },
  "requires": [],
  "source": {…}
}
```

`category` і можливі `specs`:

| Категорія | Ідентифікатори | `specs` |
| --- | --- | --- |
| `bus` | `bus-s`, `bus-m`, `bus-l` | `maxMassKg`, `slots` |
| `solar` | `solar-body`, `solar-deploy`, `solar-roll` | `powerW` |
| `battery` | `bat-s`, `bat-m`, `bat-l` | `capacityWh` |
| `radio` | `radio-uhf`, `radio-s`, `radio-x` | `rateKbps` |
| `computer` | `cpu-basic`, `cpu-power` | — |
| `adcs` | `adcs-basic`, `adcs-fine` | `accuracyDeg` |

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

Ідентифікатори: `magnetometer`, `radiometer`, `camera`, `radar`. `value`: `low` · `medium` ·
`high` · `highest`.

#### `GroundStation`

```json
{ "id": "fairbanks", "nameCode": "station.fairbanks", "latitudeDeg": 65, "bands": ["uhf", "s", "x"], "priceK": 30, "source": {…} }
```

Ідентифікатори: `fairbanks`, `white-sands`, `guam`.

#### `Preset`

Готові набори для простішої версії SINGLE (D48): `{ "id", "nameCode", "design": Design }`.

---

### Проєкт місії — `Design`

Один і той самий об'єкт у `evaluate`, `simulate` і `attempts`.

```json
{
  "missionId": "sat-orbit",
  "version": "simple",
  "orbit": { "presetId": "sso" },
  "launchId": "small",
  "parts": {
    "bus": "bus-m", "solar": "solar-deploy", "battery": "bat-m",
    "radio": "radio-x", "computer": "cpu-power", "adcs": "adcs-fine"
  },
  "instrumentIds": ["camera"],
  "groundStationIds": ["fairbanks"]
}
```

- `version`: `simple` або `advanced` (D46). Фізика однакова; різниться лише текст
  коментарів ролей.
- `orbit`: у простішій версії — `{ "presetId": "sso" }`; у складнішій можна задати числа:
  `{ "altitudeKm": 650, "inclinationDeg": 98 }`. Із `rideshare` орбіта завжди `sso`.
- У `parts` кожна з шести категорій обов'язкова й має одну деталь.
- Порожній `instrumentIds` чи `groundStationIds` — допустимо; перевірки покажуть наслідок.

---

### `POST /api/evaluate`

Запит — `Design`. Відповідь миттєва (без покрокової симуляції); фронтенд викликає її після
кожної зміни з затримкою ~300 мс (D39).

Приклад — відповідь на `Design` вище (камера, X-радіо, точна орієнтація, малий носій):

```json
{
  "orbit": {
    "altitudeKm": 705, "inclinationDeg": 98.2,
    "periodMin": 98.7, "speedKmS": 7.5, "eclipseFraction": 0.36
  },
  "resources": {
    "mass":   { "usedKg": 45.2, "busMaxKg": 150, "launchCapacityKg": 300, "slotsUsed": 7, "slots": 12 },
    "power":  { "generationW": 135, "averageGenerationW": 86.4, "averageConsumptionW": 83, "eclipseNeedWh": 49.2, "batteryWh": 150 },
    "budget": { "usedK": 511, "limitK": 450 },
    "data":   { "generatedGbPerDay": 432, "downlinkGbPerDay": 30, "expectedTotalGb": 10950, "goalGb": 500 },
    "comms":  { "contactsPerDay": 10, "contactMinutesPerDay": 80 },
    "time":   { "readyMonth": 12, "launchMonth": 15, "deadlineMonth": 18 }
  },
  "checks": [
    { "segment": "mission", "status": "fail", "code": "check.mission.overBudget",  "params": { "usedK": 511, "limitK": 450 } },
    { "segment": "launch",  "status": "ok",   "code": "check.launch.capacity",     "params": { "massKg": 45.2, "capacityKg": 300 } },
    { "segment": "space",   "status": "warn", "code": "check.space.powerMargin",   "params": { "marginPct": 4 } },
    { "segment": "ground",  "status": "warn", "code": "check.ground.dataBacklog",  "params": { "generatedGbPerDay": 432, "downlinkGbPerDay": 30 } },
    { "segment": "user",    "status": "ok",   "code": "check.user.goalReached",    "params": { "expectedGb": 10950, "goalGb": 500 } }
  ],
  "comments": [
    {
      "role": "planner", "severity": "warn",
      "message": { "code": "comment.planner.overBudget", "params": { "overK": 61 } },
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
готовність на 12-му місяці, малий носій — старт на 15-му.

- `segment` у `checks`: `launch` · `space` · `ground` · `user` (D23) і `mission` — для
  лімітів усієї місії (бюджет, строк).
- `status`: `ok` · `warn` · `fail`.
- `role`: `engineer` · `designer` · `planner` · `scientist` (D13, D27).
- `severity`: `info` · `warn`.
- `advice` є лише у версії `simple`; у `advanced` — `null` (D48).
- Числа в прикладі округлені; точні рахує бекенд.

### `POST /api/simulate`

```json
{ "design": Design, "seed": 12345 }
```

`seed` необов'язковий; якщо його немає, бекенд обирає сам і повертає. Той самий `design` і
`seed` дають той самий результат (D65).

```json
{
  "seed": 12345,
  "evaluation": { …відповідь evaluate… },
  "timeline": {
    "stepDays": 1,
    "days":            [0, 1, 2],
    "batteryMinPct":   [100, 67, 67],
    "dataStoredGb":    [0, 402, 804],
    "dataDeliveredGb": [0, 30, 60]
  },
  "events": [
    {
      "day": 143, "type": "solarStorm", "segment": "space",
      "message": { "code": "event.solarStorm", "params": { "lostContacts": 6 } }
    }
  ],
  "report": Report
}
```

- Ряди `timeline` однакової довжини, від старту до кінця строку роботи.
- `type` події: `solarStorm` · `debris` · `failure`.

#### `Report`

```json
{
  "success": false,
  "scores": { "missionSuccess": 40, "scienceValue": 90, "resourceEfficiency": 35, "decisionQuality": 55 },
  "limits": [
    { "status": "fail", "code": "check.mission.overBudget", "params": { "usedK": 511, "limitK": 450 } },
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
  "bottleneck": { "resource": "budget", "code": "bottleneck.budget", "params": { "usedK": 511, "limitK": 450 } }
}
```

- `limits` — перевірки лімітів усієї місії (сегмент `mission` з `evaluate`). Перевищений
  ліміт робить `success: false`, навіть якщо всі сегменти `ok`.

- `scores` — 0–100 за чотирма частинами з D25.
- `segments` — завжди чотири, у порядку `launch`, `space`, `ground`, `user`.
- `chain` — ланки «рішення → фізика → наслідок» (D49); `formula` — рядок для показу,
  поруч фронтенд показує словесне пояснення з коду (D53).
- `bottleneck.resource`: `mass` · `power` · `budget` · `data` · `comms` · `time`.

### `POST /api/attempts`

```json
{ "playerId": "8c5f…uuid", "design": Design, "seed": 12345 }
```

Бекенд сам проганяє симуляцію й зберігає результат.

```json
{ "id": "a1b2…uuid", "createdAt": "2026-11-15T10:20:00Z", "seed": 12345, "success": false, "scores": { … }, "bottleneck": { … } }
```

`playerId` — UUID, який фронтенд створює й тримає в `localStorage`; реєстрації немає.

### `GET /api/attempts?playerId=…`

Масив коротких записів як у відповіді `POST`, нові спершу, до 20 штук.

### `GET /api/attempts/{id}`

```json
{ "id": "…", "createdAt": "…", "playerId": "…", "design": Design, "seed": 12345, "result": { …відповідь simulate… } }
```
