# План розробки

Послідовний план першого релізу: архітектура, база даних, порядок задач. Кожен крок —
окрема задача в `tasks/`, окрема гілка `task/NNN-…` від свіжого `main`, одне злиття.
Будь-хто (людина чи агент) може взяти задачу зі статусом `todo`, у якої всі залежності
`done`.

Джерела рішень: D58–D66, D74–D76 у `decisions.md`. Контракт — `docs/api.md` (текст) і
`docs/openapi.yaml` (машинний опис). Якщо вони розходяться — правда в `api.md`, а
`openapi.yaml` виправляють тією ж задачею.

## 1. Архітектура

```
 Браузер (GitHub Pages)                    Render
┌──────────────────────────┐   HTTPS   ┌──────────────────────────────┐   ┌────────────┐
│ frontend/  React + MUI    │ ───────▶ │ backend/  ASP.NET .NET 10     │──▶│ PostgreSQL │
│ екрани, блюпринт, політ,  │   JSON    │  Api       — HTTP, OpenAPI   │   │ каталоги,  │
│ звіт, i18n, звук          │ ◀─────── │  Catalogs  — місії, деталі   │   │ спроби     │
│ localStorage: мова,       │           │  Simulation— фізика, звіт    │   └────────────┘
│ playerId, чернетка        │           │  Attempts  — збереження      │
└──────────────────────────┘           └──────────────────────────────┘
```

Правила:

- **Бекенд рахує все, фронтенд лише показує** (D59). Жодної формули на фронтенді.
- **Один сервіс — модульний моноліт** (D58). Модулі спілкуються лише через публічні
  інтерфейси, щоб після релізу їх можна було винести в окремі сервіси й RabbitMQ.
- **Simulation — чистий код без бази й HTTP**: на вхід проєкт, каталог і seed, на вихід
  результат. Так його легко тестувати.
- **Детермінізм** (D65): той самий проєкт і seed → той самий результат.
- **Тексти — коди повідомлень** (`docs/api.md`), переклади — лише на фронтенді.

### Структура бекенду

```
backend/
  SpaceGame.sln
  Dockerfile
  src/SpaceGame.Api/
    Program.cs                 — DI, CORS, OpenAPI, ендпоінти
    Endpoints/                 — тонкі обробники HTTP, лише виклик модулів
    Catalogs/                  — сутності, репозиторій, seed-дані місії 1
    Simulation/
      Physics/                 — Orbit, Power, Link, Budget, Timing (статичні функції)
      Evaluator.cs             — Design + Mission → Evaluation
      Simulator.cs             — Design + Mission + seed → SimulationResult
      Report/                  — ланцюжки, вузьке місце, бали
      Comments/                — коментарі ролей (факти / поради)
      Random/                  — детермінований генератор подій
    Attempts/                  — сутності, репозиторій
    Data/AppDbContext.cs, Migrations/
  tests/SpaceGame.Tests/       — xUnit: фізика, детермінізм, ендпоінти
```

### Структура фронтенду

```
frontend/src/
  api/          — типи контракту, клієнт, пробудження сервера
  i18n/         — en.json, uk.json (ключі = коди повідомлень)
  lib/          — storage, форматування чисел і одиниць
  state/        — стан проєкту місії (контекст + reducer), автозбереження
  pages/        — меню, брифінг, концепт, проєкт, політ, звіт
  blueprint/    — креслення, панель ресурсів, стрічка коментарів
  flight/       — карта Землі, орбіта, програвання часових рядів
  report/       — сегменти, ланцюжки, вузьке місце, порівняння спроб
  audio/        — музика й WebAudio-звуки
```

## 2. База даних (PostgreSQL)

Каталоги — довідкові дані, вносяться міграцією-seed із `docs/catalogs.md`. Спроби —
єдині дані, що пише гра. Облікових записів немає.

```
missions
  id               text PK            -- 'sat-orbit'
  title_code       text
  briefing_code    text
  available        bool
  goal_data_gb     numeric
  goal_months      int
  budget_k         numeric
  deadline_month   int
  timing           jsonb              -- buildMonths, integrationMonths, rideshare, lead

orbits
  id text, mission_id text FK → missions, PK (mission_id, id)
  name_code text, altitude_km numeric, inclination_deg numeric, source jsonb

launches
  id text, mission_id text FK, PK (mission_id, id)
  name_code text, price_k numeric, capacity_kg jsonb, fixed_orbit_id text NULL, source jsonb

parts
  id text, mission_id text FK, PK (mission_id, id)
  category text CHECK in (bus, solar, battery, radio, computer, adcs)
  tier text CHECK in (basic, medium, best)
  name_code text, mass_kg numeric, price_k numeric, consumption_w numeric
  specs jsonb, requires jsonb, source jsonb

instruments
  id text, mission_id text FK, PK (mission_id, id)
  name_code text, tier text, mass_kg numeric, price_k numeric, consumption_w numeric
  data_rate_kbps numeric, value text, requires jsonb, source jsonb

ground_stations
  id text, mission_id text FK, PK (mission_id, id)
  name_code text, latitude_deg numeric, bands text[], price_k numeric, source jsonb

presets
  id text, mission_id text FK, PK (mission_id, id)
  name_code text, design jsonb

attempts
  id           uuid PK
  player_id    uuid NOT NULL           -- анонімний, із браузера
  mission_id   text FK → missions
  design       jsonb NOT NULL
  seed         bigint NOT NULL
  success      bool NOT NULL
  scores       jsonb NOT NULL
  bottleneck   jsonb NOT NULL
  result       jsonb NOT NULL          -- повна відповідь simulate
  created_at   timestamptz NOT NULL DEFAULT now()
  INDEX (player_id, created_at DESC)
```

Чому так: каталоги прив'язані до місії, бо в місії «Вантаж на МКС» вони інші;
`jsonb` — для полів, що різняться за категорією (`specs`) або читаються лише цілком
(`design`, `result`). Міграції — EF Core; рядок підключення — змінна
`ConnectionStrings__Default`.

## 3. Порядок робіт

Дві доріжки йдуть паралельно; фронтенд не чекає на бекенд — до готовності бекенду він
працює на прикладах із `docs/api.md` (мок-клієнт).

| Крок | Задача | Частина | Залежить від | Стан |
| --- | --- | --- | --- | --- |
| 1 | 001 Контракт API | спільне | — | done |
| 2 | 007 Каркас фронтенду | фронт | 001 | done |
| 3 | 002 Каркас бекенду | бек | 001 | blocked (.NET 10 SDK) |
| 4 | 003 Каталоги й місія 1 | бек | 002 | todo |
| 5 | 004 Фізика й `evaluate` | бек | 003 | todo |
| 6 | 005 Симуляція й звіт | бек | 004 | todo |
| 7 | 006 Спроби | бек | 005 | todo |
| 8 | 008 Меню й етапи циклу | фронт | 007 | todo |
| 9 | 009 Блюпринт, ресурси, коментарі | фронт | 008 | todo |
| 10 | 010 Політ | фронт | 008 | todo |
| 11 | 011 Звіт | фронт | 008 | todo |
| 12 | 012 Музика й звуки | фронт | 007 | todo |
| 13 | 013 Розгортання | інфра | 002, 007 | todo |
| 14 | 014 Матеріали подачі | подача | 013 | todo |

Паралельно можна брати: будь-яку задачу бекенду з будь-якою задачею фронтенду; 010, 011,
012 — між собою (різні папки). Не можна одночасно: 008 і 009 (009 вбудовується в екрани
008).

### Віхи

1. **Скелет наскрізь** — 002 + 007 + 013: порожня гра за посиланням бачить живий бекенд.
2. **Проєктування працює** — 003 + 004 + 008 + 009: збираєш апарат, ресурси й коментарі
   оновлюються.
3. **Місія від цілі до звіту** — 005 + 010 + 011: перший реліз, який можна подавати.
4. **Подача** — 006, 012, 014.

## 4. Як узяти задачу

1. `git switch main && git pull`.
2. Обери в `tasks/` задачу `todo`, у якої всі «Залежить від» — `done`.
3. `git switch -c task/NNN-коротка-назва`; у файлі задачі: `Статус: in progress`,
   своє ім'я у «Виконавець». Закоміть і запуш це одразу, щоб інші бачили, що задача зайнята.
4. Роби лише в «Зоні файлів». Потрібна зміна контракту — окрема задача (спершу
   `docs/api.md` і `docs/openapi.yaml`).
5. Перевір «Критерії готовності», постав `Статус: done`.
6. Код — через pull request у `main` (D74); документи — прямим злиттям. Перед злиттям
   ще раз підтягни `main`.

### Перевірки перед злиттям

| Частина | Команди |
| --- | --- |
| Бекенд | `dotnet build backend` · `dotnet test backend` |
| Фронтенд | `npm --prefix frontend run build` · `npm --prefix frontend run lint` |

### Що потрібно встановити

- Бекенд: .NET 10 SDK, PostgreSQL 16+ (локально або Docker).
- Фронтенд: Node 22+.
- Аудіо (012): ffmpeg.
