# 002 — Каркас бекенду

Статус: blocked (немає .NET 10 SDK на машині користувача)
Виконавець: Stiluss
Гілка: task/002-backend-skeleton
Частина: бекенд
Залежить від: 001

## Мета

Порожній, але робочий сервіс ASP.NET на .NET 10 (D58): модульний моноліт, OpenAPI,
підключення до PostgreSQL, Dockerfile для Render.

## Обсяг

- Рішення `backend/SpaceGame.sln`, проєкт API і проєкт тестів.
- Модулі-папки: `Catalogs`, `Simulation`, `Attempts`.
- `GET /api/health`, OpenAPI на `/openapi/v1.json`, CORS для GitHub Pages і `localhost`.
- EF Core + PostgreSQL, рядок підключення зі змінної середовища.
- `backend/Dockerfile`.
- Не входить: логіка місій.

## Зона файлів

- `backend/`

## Критерії готовності

- [ ] `dotnet build` і `dotnet test` проходять.
- [ ] `GET /api/health` відповідає за контрактом.
- [ ] OpenAPI-документ генерується.

## Нотатки

—
