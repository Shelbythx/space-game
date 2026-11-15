# 048 · Бекенд · ШІ-наставник (Claude і демо)

Статус: done
Виконавець: Khudashchov
Гілка: task/048-back-advisor
Частина: Бекенд
Залежить від: 047
Коротко: Модуль Advisor: Claude Sonnet 5.5 з ключем, демо за правилами без нього (D111)

## Мета

Наставник відповідає на питання про проєкт і розбирає звіт на даних гри; без ключа — демо.

## Обсяг

- Модуль `Advisor`: `POST /api/advisor/ask`, `POST /api/advisor/report` за `docs/api.md` 2.3.
- `ClaudeAdvisor` — офіційний NuGet `Anthropic`, модель `claude-sonnet-5-5`, ключ зі змінної
  `ANTHROPIC_API_KEY`; при помилці чи відмові — відповідь демо.
- `DemoAdvisor` — коди повідомлень із `evaluate` / звіту, пошук ресурсу в питанні.
- Ліміт 30 питань на гравця за годину; `advisor` у `/api/health`.
- Тести без справжніх викликів API.
- Не входить: фронтенд, збереження чату.

## Зона файлів

- `backend/src/SpaceGame.Api/Advisor/`, `backend/src/SpaceGame.Api/Program.cs`,
  `backend/src/SpaceGame.Api/Endpoints/HealthEndpoints.cs`, `backend/src/SpaceGame.Api/SpaceGame.Api.csproj`,
  `backend/tests/SpaceGame.Tests/AdvisorTests.cs`, `tasks/048-back-advisor.md`.

## Критерії готовності

- [x] Без ключа обидві точки повертають `source: "demo"` з кодами з переліку.
- [x] З ключем — `source: "claude"`; помилка виклику — демо.
- [x] Тести зелені: 164/164, з них 18 нових в `AdvisorTests`.

## Нотатки

- 15.11.2026: гілку зрізано від `task/047-api-advisor` (контракт ще не в `main`).
- NuGet `Anthropic` 13.8.0 (офіційний SDK). Виклик — beta-endpoint, бо серверний запасний
  маршрут при відмові (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) є лише там;
  `effort: low`, `max_tokens` 1500, кеш системних інструкцій.
- Справжній виклик Claude не перевірено — ключа немає. Тести підміняють модель фейком; що SDK
  правильно збирає запит, видно лише з ключем: після налаштування поставити питання й подивитись,
  що `source` = `claude`. Помилку виклику сервер пише в лог і відповідає демо.
- Ключ: змінна `ANTHROPIC_API_KEY` в Azure App Service; модель можна змінити `Advisor__Model`.
