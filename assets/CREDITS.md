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

## Зображення

Задача 020. Усі файли — з [NASA Image and Video Library](https://images.nasa.gov/), стиснуті до
≤ 300 КБ (довша сторона — 1600 пікселів). Умови — [NASA Images and Media Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/):
матеріали NASA зазвичай не захищені авторським правом у США; NASA треба вказати як джерело;
використання не має натякати на схвалення NASA. У підписах цих фото немає позначок чужого
авторського права. Людей на фото немає; логотипа NASA не видно (на `landsat9-atlas-v.jpg` —
емблема ULA, на `iss-sunset.jpg` — напис на кораблі «Союз»).

| Файл | Що на фото | NASA ID / джерело | Дата | Автор (credit) | Де в грі |
| --- | --- | --- | --- | --- | --- |
| `images/earth-blue-marble.jpg` | Blue Marble 2012 — Земля цілком | [GSFC_20171208_Archive_e001386](https://images.nasa.gov/details/GSFC_20171208_Archive_e001386) | 25.01.2012 | NASA | Брифінг, головне меню |
| `images/earth-from-iss.jpg` | Нічна Земля з МКС | [iss045e013851](https://images.nasa.gov/details/iss045e013851) | 17.09.2015 | NASA | Фон польоту |
| `images/iss-over-atlantic.jpg` | МКС над Атлантикою: панелі й маніпулятор | [iss073e0869068](https://images.nasa.gov/details/iss073e0869068) | 10.10.2025 | NASA | Місія на МКС |
| `images/iss-sunset.jpg` | МКС на заході Сонця над Китаєм | [iss074e0089785](https://images.nasa.gov/details/iss074e0089785) | 25.01.2026 | NASA | Фон, звіт |
| `images/iss-solar-arrays.jpg` | Сонячні панелі МКС у місячному світлі | [iss073e0039722](https://images.nasa.gov/details/iss073e0039722) | 23.04.2025 | NASA | Ресурс «енергія» |
| `images/cygnus-approach.jpg` | Cygnus XL підходить до МКС | [iss073e0816140](https://images.nasa.gov/details/iss073e0816140) | 18.09.2025 | NASA | Корабель `ship-small` |
| `images/dragon-approach.jpg` | Вантажний Dragon підходить до МКС (CRS-31) | [iss072e145206](https://images.nasa.gov/details/iss072e145206) | 05.11.2024 | NASA | Корабель `ship-pressurized` |
| `images/antares-launch-wallops.jpg` | Старт Antares з майданчика 0A, Воллопс | [201304210010HQ](https://images.nasa.gov/details/201304210010HQ) | 21.04.2013 | NASA/Bill Ingalls | Носій `medium`, космодром Воллопс |
| `images/falcon9-crs26-launch.jpg` | Старт Falcon 9 з Dragon (CRS-26), KSC | [KSC-20221126-PH-KLS01_0002](https://images.nasa.gov/details/KSC-20221126-PH-KLS01_0002) | 26.11.2022 | NASA/Kim Shiflett | Носій `heavy`, космодром Канаверал |
| `images/landsat9-atlas-v.jpg` | Atlas V з Landsat 9 у башті обслуговування | [NHQ202109250005](https://images.nasa.gov/details/NHQ202109250005) | 25.09.2021 | NASA/Bill Ingalls | Місія 1, порівняння з Landsat 9 |
| `images/cubesat-deploy.jpg` | Пускач CubeSat NanoRacks у модулі Kibo | [iss061e154749](https://images.nasa.gov/details/iss061e154749) | 04.02.2020 | NASA | Рівень CubeSat |
| `images/aurora-from-iss.jpg` | Полярне сяйво з МКС | [iss072e159172](https://images.nasa.gov/details/iss072e159172) | 30.10.2024 | NASA | Подія «магнітна буря» (DONKI) |
| `images/dsn-antenna.jpg` | 34-метрова антена DSS-53, Мадрид | [PIA25136](https://images.nasa.gov/details/PIA25136) | 16.03.2022 | NASA/JPL-Caltech | Наземні станції |

Підпис у грі: «Photo: NASA» або «Photo: NASA/Bill Ingalls» тощо — за колонкою «Автор».

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
