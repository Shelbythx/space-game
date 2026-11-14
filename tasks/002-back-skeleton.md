# 002 · Бекенд · Каркас сервісу

Статус: done
Виконавець: Khudashchov (D101)
Гілка: task/002-back-skeleton
Частина: Бекенд
Залежить від: 001
Коротко: Порожній сервіс ASP.NET з PostgreSQL і Docker, відповідає на /api/health

## Мета

Порожній, але робочий сервіс ASP.NET на .NET 10 (D58): модульний моноліт, OpenAPI,
підключення до PostgreSQL, Dockerfile і `docker-compose.yml` для локального запуску (D77).

## Обсяг

- Рішення `backend/SpaceGame.sln`, проєкт API і проєкт тестів.
- Модулі-папки: `Catalogs`, `Simulation`, `SpaceWeather`, `References`, `Attempts`.
- `GET /api/health`, OpenAPI на `/openapi/v1.json`, CORS для `localhost`.
- EF Core + PostgreSQL, рядок підключення зі змінної середовища.
- `backend/Dockerfile`, `backend/docker-compose.yml` (PostgreSQL + API).
- Не входить: логіка місій.

## Зона файлів

- `backend/`

## Критерії готовності

- [x] `dotnet build` і `dotnet test` проходять.
- [x] `GET /api/health` відповідає за контрактом.
- [x] OpenAPI-документ генерується.

## Нотатки

- 15.11.2026 (Claude, сесія Khudashchov, локально, D101): .NET 10.0.203, EF Core 10 +
  Npgsql 10.0.3, xUnit + WebApplicationFactory. Порт бекенду — 5080 (так чекає
  `frontend/.env.example`); у Docker — 8080 всередині, 5080 назовні. `dotnet build` — 0
  попереджень (Microsoft.OpenApi піднято до 2.13.0 через вразливість у 2.0.0), `dotnet test`
  — 3 тести (health, OpenAPI, CORS). Сервіс перевірено запуском: `/api/health` і
  `/openapi/v1.json` відповідають.
- Docker на цій машині не встановлено — `Dockerfile` і `docker-compose.yml` не перевірено
  запуском. Локально без Docker: PostgreSQL 17 + роль `spacegame` (див. `backend/README.md`).
- Міграцій ще немає (таблиць немає): перша міграція — задача 003. `Database:MigrateOnStartup`
  накочує міграції під час старту (увімкнено в Development і в docker-compose).
- Поза зоною задачі: `docs/development-plan.md` (розділи 1, 8, «Що потрібно встановити») і
  `CLAUDE.md` досі кажуть «бекенд у хмарній сесії» (D87 → D101) — оновити окремим комітом.
