# 002 — Каркас бекенду

Статус: todo (робиться в хмарній сесії, D87)
Виконавець: Stiluss
Гілка: task/002-backend-skeleton
Частина: бекенд
Залежить від: 001

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

- [ ] `dotnet build` і `dotnet test` проходять.
- [ ] `GET /api/health` відповідає за контрактом.
- [ ] OpenAPI-документ генерується.

## Нотатки

—
