# 048 · Бекенд · ШІ-наставник (Claude і демо)

Статус: todo
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

- [ ] Без ключа обидві точки повертають `source: "demo"` з кодами з переліку.
- [ ] З ключем — `source: "claude"`; помилка виклику — демо.
- [ ] Тести зелені.

## Нотатки

—
