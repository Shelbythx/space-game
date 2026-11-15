# 013 · Інфраструктура · Розгортання

Статус: todo
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
- Фронтенд — Azure Static Web Apps (безкоштовний тариф), збірка `frontend/` з GitHub;
  `VITE_API_URL` — адреса бекенду.
- Бекенд — `backend/Dockerfile` в App Service (Linux, B1); порт контейнера 8080; CORS
  дозволяє домен Static Web Apps; `/api/health` відповідає.
- PostgreSQL — Azure Database for PostgreSQL Flexible Server (B1ms); доступ для App
  Service; міграції — `Database__MigrateOnStartup=true`.
- Секрети (`ConnectionStrings__Default`, `NASA_API_KEY`) — лише в налаштуваннях App
  Service, не в репозиторії.
- Розгортання з GitHub Actions — за бажанням; достатньо й ручного.
- Не входить: власний домен, CD для кожної гілки.

## Зона файлів

- `.github/workflows/` (файли розгортання), `frontend/staticwebapp.config.json`,
  налаштування CORS у бекенді (`Program.cs` або `appsettings`)

## Критерії готовності

- [ ] Посилання відкривається в приватному вікні браузера й на телефоні.
- [ ] Гру можна пройти від меню до звіту; спроба зберігається в PostgreSQL.
- [ ] Посилання записане в `README.md` і `docs/requirements.md`.
- [ ] У нотатках записано, які ресурси Azure видалити після оцінювання.

## Нотатки

D77 замінено на D105 (15.11.2026). Якщо Azure for Students не активується — запасний
варіант із D105: Cloudflare Pages + Render (безкоштовно) + Neon.
