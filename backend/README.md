# Бекенд

ASP.NET на .NET 10, модульний моноліт (D58), PostgreSQL. Контракт — `docs/api.md`.

## Запуск

З Docker (PostgreSQL + бекенд):

```bash
cd backend
docker compose up --build
```

Без Docker — потрібні .NET 10 SDK і PostgreSQL. Один раз створити роль і базу (від імені
`postgres`):

```sql
CREATE ROLE spacegame LOGIN PASSWORD 'spacegame';
CREATE DATABASE spacegame OWNER spacegame;
```

Далі:

```bash
dotnet run --project backend/src/SpaceGame.Api   # http://localhost:5080
```

У режимі Development рядок підключення береться з `appsettings.Development.json`, міграції
накочуються під час старту. Інша база — змінна `ConnectionStrings__Default`.

- Перевірка: `GET http://localhost:5080/api/health` → `{"status":"ok","version":"0.2.0"}`.
- OpenAPI: `http://localhost:5080/openapi/v1.json`.

## Перевірки

```bash
dotnet build backend
dotnet test backend
```

## Структура

| Папка | Що там |
| --- | --- |
| `src/SpaceGame.Api/Endpoints` | Тонкі обробники HTTP |
| `src/SpaceGame.Api/Catalogs` | Місії й каталоги (003) |
| `src/SpaceGame.Api/Simulation` | Фізика, оцінка, симуляція, звіт — без бази й HTTP (004, 005, 022) |
| `src/SpaceGame.Api/SpaceWeather` | NASA DONKI (021) |
| `src/SpaceGame.Api/References` | Схожі місії (023) |
| `src/SpaceGame.Api/Attempts` | Спроби гравця (006) |
| `src/SpaceGame.Api/Data` | `AppDbContext`, міграції |
| `tests/SpaceGame.Tests` | xUnit: формули, детермінізм, ендпоінти |
