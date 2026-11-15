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

## Код

Рушій гри «yourself.» (© 2026 Stiluss) можна використовувати в цьому проєкті з дозволу
автора від 14.11.2026. Дозвіл поширюється лише на агента хмарної сесії автора: інші
учасники та їхні агенти код «yourself.» сюди не копіюють.

## Джерела NASA для формул і констант

Повний перелік із розділами й сторінками — `docs/physics-sources.md` (задача 026). Логотип
та емблеми NASA не використовуються.

| Документ | Що беремо |
| --- | --- |
| Earth Fact Sheet, NSSDCA (NASA GSFC) | Константи Землі: GM, радіус, J2, період обертання, сонячна стала |
| Drag Equation, Beginner's Guide to Aeronautics (NASA Glenn) | Формула сили опору |
| Ideal Rocket Equation, Beginner's Guide to Aeronautics (NASA Glenn) | Рівняння Ціолковського, `Veq = Isp · g0` |
| GMAT Mathematical Specifications (NASA GSFC, NTRS 20080031744) | Орбітальні параметри, тінь, β-кут, прискорення від опору, траса |
| U.S. Standard Atmosphere, 1976 (NASA-TM-X-74335) | Густина атмосфери за висотою |
| NASA-STD-8719.14C «Process for Limiting Orbital Debris» | Правило 25 років, межа ймовірності зіткнення |
| Small Spacecraft Technology State-of-the-Art 2026 (NASA) | Деталі апарата, енергосистема |
| NASA Systems Engineering Handbook, SP-2016-6105 Rev2 | Trade study й аналіз рішень для балу «Якість рішень» |
| Basics of Space Flight (NASA JPL) | Пояснення переходів Гомана й запуску |
| S. L. Rickman, Introduction to Orbital Mechanics and Spacecraft Attitudes for Thermal Engineers (NASA, NTRS 20205003902) | Прецесія вузла J2, сонячно-синхронна орбіта, β-кут, частка тіні, перехід Гомана, зміна площини |
| GSFC-STD-1000 Rev I «Rules for the Design, Development, Verification, and Operation of Flight Systems» (Gold Rules, NASA GSFC) | Запаси маси, енергії й радіолінії за фазою проєкту (табл. 1.06-1) |
| Guidelines on Lithium-ion Battery Use in Space Applications, NASA/TM-2009-215751 | Визначення глибини розряду батареї |
| Near Earth Network Users' Guide, 453-NENUG Rev 5 (NASA GSFC) | Кут місця станцій (5°/10°) |
| Approximate Positions of the Planets (NASA JPL Solar System Dynamics) | Середня довгота Землі → положення Сонця за датою |
