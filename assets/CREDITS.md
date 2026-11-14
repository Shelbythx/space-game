# Походження асетів

Кожен файл в `assets/` має бути записаний тут: хто автор і на яких умовах його можна
використовувати. Чужі матеріали без ліцензії в репозиторій не додаємо.

## Аудіо

| Файл | Тривалість | Автор | Джерело / ліцензія |
| --- | --- | --- | --- |
| `audio/angryutro.ogg` | 0:17 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |
| `audio/breaktime.ogg` | 0:37 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |
| `audio/final.ogg` | 1:08 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |
| `audio/forgtn.ogg` | 1:29 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |
| `audio/missilost.ogg` | 3:04 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |
| `audio/prostranstvo.ogg` | 3:17 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |
| `audio/vrata.ogg` | 1:04 | Stiluss, учасник команди | Власна робота автора, написана для його гри «yourself.» |

## Референси настрою (файлів у репозиторії немає)

Саундтрек Murder Drones (AJ DiSpirito): «Eternal Dream», «Magic School Bus», «The HuMaN
Gala». Це чужа комерційна музика — лише орієнтир звучання, використовувати її в грі не
можна.

## Шрифти

Підключені як npm-пакети Fontsource у `frontend/`, файлів у `assets/` немає.

| Шрифт | Автор | Де в грі | Ліцензія |
| --- | --- | --- | --- |
| Tiny5 | Stefie Justprince | Головне меню (D90) | SIL Open Font License 1.1 |
| IBM Plex Sans, IBM Plex Mono | IBM | Тема креслення (D54) | SIL Open Font License 1.1 |

## Джерела NASA для формул і чисел

Використані в грі документи NASA (D89, задача 026). Сторінки й статуси кожної формули — у
`docs/physics-sources.md`; числа деталей — у `docs/catalogs.md`.

| Документ | Що беремо |
| --- | --- |
| NASA Earth Fact Sheet (NSSDCA) | Константи Землі: GM, радіус, J2, зоряна доба, сонячна стала, g₀ |
| S. L. Rickman, «Introduction to Orbital Mechanics and Spacecraft Attitudes for Thermal Engineers», NASA NESC (NTRS 20205003902) | Період і швидкість орбіти, Гоман, зміна площини, J2, сонячно-синхронна орбіта, β-кут, тінь |
| S. L. Rickman, «Introduction to On-Orbit Thermal Environments», TFAWS 2023 | β-кут, тінь |
| NASA Glenn Research Center, Beginner's Guide to Aeronautics | Рівняння ракети, питомий імпульс, рівняння опору |
| U.S. Standard Atmosphere 1976, NASA-TM-X-74335 | Густина атмосфери за висотою |
| NASA-STD-8719.14C «Process for Limiting Orbital Debris» | Правило 25 років (вимога 4.6-1) |
| GSFC-STD-1000 Rev I (Gold Rules) | Мінімальні запаси маси, енергії, радіолінії (табл. 1.06-1) |
| NASA Systems Engineering Handbook, SP-2016-6105 Rev 2 | Технічні показники, аналіз рішень — засади балів |
| NID 7120.148 до NPR 7120.5F | Базові й порогові наукові вимоги, критерії успіху |
| Near Earth Network Users' Guide, 453-NENUG Rev 4 | Станції, діапазони, кути місця для розрахунку ліній |
| State-of-the-Art of Small Spacecraft Technology, 2026 | Числа деталей і двигунів (задача 016) |
| NASA ORDEM 3.2 | Опис потоків космічного сміття (лише як пояснення) |

## Код

Рушій гри «yourself.» (© 2026 Stiluss) можна використовувати в цьому проєкті з дозволу
автора від 14.11.2026. Дозвіл поширюється лише на агента хмарної сесії автора: інші
учасники та їхні агенти код «yourself.» сюди не копіюють.
