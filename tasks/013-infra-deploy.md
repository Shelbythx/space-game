# 013 · Інфраструктура · Розгортання

Статус: in progress
Виконавець: Stiluss
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

- [ ] Посилання відкривається в приватному вікні браузера й на телефоні.
- [ ] Гру можна пройти від меню до звіту; спроба зберігається в PostgreSQL.
- [ ] Посилання записане в `README.md` і `docs/requirements.md`.
- [ ] У нотатках записано, які ресурси Azure видалити після оцінювання.

## Нотатки

D77 замінено на D105 (15.11.2026). Якщо Azure for Students не активується — запасний
варіант із D105: Cloudflare Pages + Render (безкоштовно) + Neon.
