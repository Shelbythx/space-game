# 028 · Інфраструктура · Мінімальний CI

Статус: done
Виконавець: Khudashchov
Гілка: task/028-infra-ci
Частина: Інфраструктура
Залежить від: —
Коротко: GitHub Actions перевіряє збірку фронтенду й бекенду на кожен PR

## Мета

Ловити зламану збірку до злиття в `main`, бо туди вливають кілька людей (D99, D100).

## Обсяг

- Workflow `CI` на pull request у `main` і пуш у `main`.
- Фронтенд: `npm ci`, `npm run lint`, `npm run build` (Node 22).
- Бекенд: `dotnet build backend`, `dotnet test backend` (.NET 10); поки в `backend/` немає
  `.sln` (задача 002), крок пропускається з поясненням.
- Не входить: CD, розгортання, релізи, автоверсії (D77 не вирішено).

## Зона файлів

- `.github/workflows/ci.yml`
- `tasks/028-infra-ci.md`

## Критерії готовності

- [x] Workflow запускається на PR у `main`.
- [ ] Перший PR показує зелені перевірки `Frontend` і `Backend` (перевіряє користувач).

## Нотатки

- Після першого зеленого запуску варто в налаштуваннях GitHub (Settings → Branches →
  `main`) увімкнути «Require status checks to pass» для обох перевірок — це робить власник
  репозиторію.
