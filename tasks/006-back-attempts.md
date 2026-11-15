# 006 · Бекенд · Спроби гравця

Статус: done
Виконавець: Khudashchov (D101)
Гілка: task/006-back-attempts
Частина: Бекенд
Залежить від: 005
Коротко: Зберегти й показати спроби за анонімним playerId

## Мета

Зберігати спроби гравця без реєстрації за анонімним `playerId` (D60), щоб звіт міг
порівняти їх.

## Обсяг

- `POST /api/attempts`, `GET /api/attempts?playerId=`, `GET /api/attempts/{id}`.
- Таблиця спроб у PostgreSQL: проєкт, seed, підсумок звіту, час.
- Не входить: облікові записи, таблиця лідерів.

## Зона файлів

- `backend/src/**/Attempts/`, міграції в `backend/`

## Критерії готовності

- [x] Спроба зберігається й повертається за контрактом.
- [x] Чужий `playerId` не бачить чужих спроб у списку.

## Нотатки

- 15.11.2026 (Claude, сесія Khudashchov, D101). Гілка — від 021. Таблиця `attempts`
  (міграція `Attempts`): id, player_id, created_at, mission_id, seed, success, design /
  scores / bottleneck / result — jsonb; індекс (player_id, created_at). Без бази — сховище в
  пам'яті (тести, запуск без PostgreSQL).
- `POST /api/attempts` сам проганяє симуляцію тим самим кодом, що й `/api/simulate`
  (тест: той самий seed → той самий звіт). Список — до 20, нові спершу, лише свій `playerId`.
- Код помилки `attempt.playerIdRequired` (порожній або відсутній `playerId`) у переліку кодів
  контракту немає — додати при наступній зміні `docs/api.md`.
- На реальному PostgreSQL не перевірено: на цій машині ще немає ролі `spacegame`.
