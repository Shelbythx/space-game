# 013 · Інфраструктура · Розгортання

Статус: in progress
Виконавець: Khudashchov (D106)
Гілка: task/013-infra-deploy
Частина: Інфраструктура
Залежить від: 002, 007
Коротко: Гра за посиланням на Azure (D105)

## Мета

Гра відкривається за посиланням без реєстрації й тримається щонайменше тиждень після
подачі, поки її оцінює журі (D105).

## Обсяг

- Azure for Students: одна група ресурсів на весь проєкт.
- Фронтенд — GitHub Pages (Static Web Apps заблоковано політикою регіонів студентської
  підписки); `VITE_API_URL` — адреса бекенду. Pages потребує публічного репозиторію.
- Бекенд — App Service (Linux, B1, .NET 10), збірка з `dotnet publish`; CORS
  (`Cors__Origins__N`) дозволяє `https://shelbythx.github.io`; `/api/health` відповідає.
- PostgreSQL — Azure Database for PostgreSQL Flexible Server (B1ms); доступ для App
  Service; міграції — `Database__MigrateOnStartup=true`.
- Секрети (`ConnectionStrings__Default`, `NASA_API_KEY`) — лише в налаштуваннях App
  Service, не в репозиторії.
- Розгортання з GitHub Actions після злиття в `main`: `deploy-backend.yml`,
  `deploy-frontend.yml`.
- Не входить: власний домен, CD для кожної гілки.

## Зона файлів

- `.github/workflows/deploy-*.yml`

## Критерії готовності

- [x] Посилання відкривається без входу: фронтенд — HTTP 200, `/api/health` — `ok`
  (перевірено 15.11.2026). На телефоні — перевірити вручну перед подачею.
- [ ] Гру можна пройти від меню до звіту — чекає фронтенд 008 (потік місії).
- [x] Спроба зберігається в PostgreSQL: `POST /api/attempts` на живому сервері
  повертає `id`, `GET /api/attempts?playerId=` її віддає (15.11.2026).
- [x] Посилання записане в `docs/requirements.md`; у `README.md` — у PR #20 (задача 014).
- [x] У нотатках записано, які ресурси Azure видалити після оцінювання.

## Нотатки

D77 замінено на D105 (15.11.2026). Якщо Azure for Students не активується — запасний
варіант із D105: Cloudflare Pages + Render (безкоштовно) + Neon.

Стан на 15.11.2026: розгортання працює — бекенд
`https://spacegame-api-kpi-b0gtcycfh7hjeja6.italynorth-01.azurewebsites.net`, фронтенд
`https://shelbythx.github.io/space-game/`; CORS дозволяє `https://shelbythx.github.io`;
обидва workflow зелені після злиття в `main`. Відкритий лише наскрізний прохід — після 008.
Гілку `task/013-infra-deploy-finish` відгалужено від `task/031-back-catalog-fixes-impl`
(PR #19 ще не влито).

Після оцінювання (≥ тиждень після 15.11.2026) видалити в порталі Azure **всю групу
ресурсів проєкту** — разом із нею зникнуть:
- App Service `spacegame-api-kpi` і його App Service Plan (B1) — головна стаття витрат;
- Azure Database for PostgreSQL Flexible Server (B1ms) разом із базою;
- Application Insights / Log Analytics, якщо створювались автоматично.

Потім у GitHub прибрати секрет `AZURE_WEBAPP_PUBLISH_PROFILE` і змінні
`AZURE_WEBAPP_NAME`, `VITE_API_URL`; GitHub Pages можна лишити (безкоштовно).
