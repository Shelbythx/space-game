# Джерела NASA для формул гри

Задача 026, D89. Перевірено 15.11.2026: кожен документ відкрито, формули й числа знайдено в
тексті або на слайдах. Номери сторінок — сторінки PDF (для звіту SmallSat SOA —
друковані номери повного звіту, вони ж стоять на сторінках окремих розділів).

Статуси:

- **✓** — формула чи число є в документі NASA на вказаній сторінці;
- **≈** — виведено з підтвердженої формули чи констант NASA (одна алгебраїчна дія) —
  у звіті гри показуємо як «розрахунок» із посиланням на вихідну формулу;
- **✗** — джерела NASA не знайдено; за D89 така формула чи число не йде в гру, доки
  користувач не вирішить (див. «Відкриті питання» в `decisions.md`).

## Документи

| Код | Документ | Адреса |
| --- | --- | --- |
| EFS | NASA Earth Fact Sheet, NSSDCA (оновлено 15.11.2024) | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| RICK | S. L. Rickman, «Introduction to Orbital Mechanics and Spacecraft Attitudes for Thermal Engineers», NASA NESC, TFAWS 2020, NTRS 20205003902 (слайди; сторінка = номер слайда) | https://ntrs.nasa.gov/citations/20205003902 |
| RICK23 | S. L. Rickman, «Introduction to On-Orbit Thermal Environments», TFAWS 2023 | https://tfaws.nasa.gov/wp-content/uploads/16.On-Orbit-Thermal-Environments-TFAWS-2023_SRickman.pdf |
| GRC | NASA Glenn, Beginner's Guide to Aeronautics: «Ideal Rocket Equation», «Specific Impulse», «Drag Equation» | https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/ · https://www.grc.nasa.gov/www/k-12/airplane/specimp.html · https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/ |
| USSA | U.S. Standard Atmosphere 1976, NASA-TM-X-74335, NTRS 19770009539 | https://ntrs.nasa.gov/citations/19770009539 |
| ODS | NASA-STD-8719.14C «Process for Limiting Orbital Debris» (05.11.2021, чинна) | https://standards.nasa.gov/standard/NASA/NASA-STD-871914 |
| GOLD | GSFC-STD-1000 Rev I «Rules for the Design, Development, Verification, and Operation of Flight Systems» (Gold Rules), затв. 19.08.2025 | https://standards.nasa.gov/system/files/tmp/GSFC-STD-1000RevI_Approved_0.pdf |
| SEH | NASA Systems Engineering Handbook, NASA/SP-2016-6105 Rev 2 | https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf |
| NID | NID 7120.148 (тимчасова директива до NPR 7120.5F) | https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPR&c=7120&s=5 |
| NEN | Near Earth Network Users' Guide, 453-NENUG Rev 4 (14.03.2019) | https://explorers.larc.nasa.gov/2021APMIDEX/pdf_files/453-UG-002905.pdf |
| SOA | State-of-the-Art of Small Spacecraft Technology, видання 2026 (травень 2026), NASA Ames SSVI | https://www.nasa.gov/smallsat-institute/sst-soa/ |
| GMAT | GMAT Mathematical Specifications (чернетка, 2007), NTRS 20080031744 | https://ntrs.nasa.gov/citations/20080031744 |
| ORDEM | NASA ORDEM 3.2 | https://orbitaldebris.jsc.nasa.gov/modeling/ordem.html |

## Константи (план, розділ 2.1)

| Константа | Значення в грі | Джерело | Статус |
| --- | --- | --- | --- |
| μ Землі (GM) | 398 600 км³/с² | EFS, «Bulk parameters»: 0,39860·10⁶ км³/с² | ✓ |
| Екваторіальний радіус R | 6378,137 км | EFS, «Bulk parameters» | ✓ |
| J2 | 1,08263·10⁻³ | EFS: 1082,63·10⁻⁶; RICK с. 104: 1,082626683·10⁻³ | ✓ |
| Зоряна доба | 86 164,2 с (23,9345 год) | EFS, «Orbital parameters»: 23,9345 год | ✓ (у плані було 86 164,1 с — виправлено) |
| Сонячна стала | 1361 Вт/м² | EFS: 1361,0 Вт/м² | ✓ |
| g₀ | 9,80665 м/с² | EFS (примітка, CODATA 2018, «exact») | ✓ |
| Швидкість поверхні на екваторі | 465 м/с | 2π·R / зоряна доба з EFS = 465,1 м/с | ≈ |

## Формули фізики (план, розділи 2.2–2.13)

| Модель | Формула в грі | Документ | Де | Статус |
| --- | --- | --- | --- | --- |
| Період орбіти | `T = 2π√(a³/μ)` | RICK | с. 92 (3-й закон Кеплера), с. 95 (геостаціонарна, 35 786 км) | ✓ |
| Кругова швидкість | `v = √(μ/r)` | RICK | с. 154 («circular orbit velocity») | ✓ |
| Віс-віва / енергія орбіти | `ε = −μ/(2a)`, `v² = μ(2/r − 1/a)` | RICK | с. 154 | ✓ |
| Перехід Гомана | `Δv₁`, `Δv₂`, час переходу `π√(a_t³/μ)` | RICK | с. 152–155 | ✓ |
| Зміна площини | `Δv = 2v·sin(Δi/2)` | RICK | с. 156–157 | ✓ |
| Прецесія вузла від J2 | `Ω̇ = −(3/2)·n·J2·(R/p)²·cos i` | RICK | с. 104–105 | ✓ |
| Сонячно-синхронна орбіта | `Ω̇ = 0,986°/добу`; приклад i = 98,2°, a = 7083 км (705 км) | RICK | с. 107–108 | ✓ (збігається з каталогом) |
| β-кут | `β = sin⁻¹(cos Γ sin Ω sin i − sin Γ cos ε cos Ω sin i + sin Γ sin ε cos i)`; межі `±(ε + i)` | RICK; RICK23 | RICK с. 124–126; RICK23 с. 96–97 | ✓ |
| Частка тіні | вхід у тінь і повний кут тіні для низької кругової орбіти (циліндрична тінь) → `f = (1/π)·arccos(√(h² + 2Rh) / ((R + h)·cos β))` | RICK; RICK23 | RICK с. 131–139; RICK23 с. 111–118 | ✓ |
| Сеанси зв'язку: кут місця | маска кута місця **10°** | NEN | розд. 17, табл. 17-2 і 17-3 (с. 174–175): параметри ліній дано для кутів місця 5° і 10° | ≈ — NASA рахує лінії на 5° і 10°; явної маски для всіх станцій не знайдено |
| Радіолінія `rate ∝ 1/d²` | `rate(d) = min(R, R·(1000/d)²)` | — | NASA-документа з формулою Фріїса не знайдено; NEN, розд. 17 дає лише параметри для розрахунку ліній; SOA, розд. 9.0 — що втрати у вільному просторі ростуть із квадратом частоти | ✗ |
| Запас лінії | ≥ 3 дБ для станцій NSN | GOLD | правило 1.06, табл. 1.06-1, с. 12 | ✓ |
| Енергобаланс за виток | `E_gen = P·T·(1 − f)` проти `E_use` | — | арифметика з підтверджених `T` і `f` | ≈ |
| Запас енергії | ≥ 25 % від кінця строку (Pre-Phase A) … ≥ 5 % (Phase D) | GOLD | табл. 1.06-1, с. 12 | ✓ |
| Деградація панелей 2,75 %/рік | — | SOA, розд. 3.0 | лише якісно (старіння, радіація, забруднення), чисел немає | ✗ |
| Глибина розряду батареї 30 % LEO / 70 % GEO | — | SOA, розд. 3.0; GOLD | SOA називає глибину розряду чинником старіння без чисел; у GOLD правила немає | ✗ |
| Опір атмосфери | `D = C_d·ρ·V²·A/2` | GRC «Drag Equation»; GMAT | GRC, розділ «Drag Coefficient»; GMAT розд. 5.2.3 | ✓ |
| Густина за висотою | таблиця 150–1000 км | USSA | запис NTRS підтверджено; номер таблиці й сторінки не звірено — PDF понад 10 МБ не відкрився | ≈ |
| Падіння висоти за добу | `Δa = −ρ·(C_d·A/m)·√(μ·a)·Δt` | — | NASA-документа з цією формулою не знайдено; виводиться з рівняння опору (GRC) і `v = √(μ/r)` (RICK) | ≈ / ✗ |
| Правило 25 років | відведення з LEO не пізніше 25 років після кінця місії | ODS | розд. 4.6.2.2, вимога 4.6-1, с. 42–43 | ✓ |
| Рівняння ракети | `Δu = Isp·g₀·ln(m_f/m_e)` | GRC «Ideal Rocket Equation»; «Specific Impulse» (`Isp = V_eq/g₀`) | розділ «Ideal Rocket Equation» | ✓ |
| Запуск із широти | `i ≥ φ`; бонус `465·cos φ м/с` | — | правила `i ≥ φ` у NASA-документі не знайдено; швидкість поверхні — розрахунок з EFS | ≈ / ✗ |
| Фазування | `(n₁ − n₂)·T`, `n = √(μ/a³)` | RICK | `n` випливає з 3-го закону Кеплера (с. 92); JSC-49686 (NTRS 20240003182) не відкрився — понад 10 МБ | ≈ |
| Космічне сміття | імовірність маневру за висотою | ORDEM | дає потоки уламків за висотою, розміром і напрямком, але програма — за угодою з NASA; чисел для гри немає | ✗ |
| Сторони корпусу (D93) | косинус кута для панелі на корпусі | RICK23 | с. 121: нагрів поверхні масштабується з `cos`; для потужності панелі прямої формули не знайдено | ≈ |
| Запас маси (D93) | `(дозволена − прогнозована) / базова × 100 %`; ≥ 15 % до SRR | GOLD | правило 1.06, табл. 1.06-1, с. 12 | ✓ |

## Бали (план, розділ 3)

| Що | Документ | Де | Статус |
| --- | --- | --- | --- |
| Базові й порогові наукові вимоги; критерії успіху місії — від порогових | NID | дод. A: «Baseline Science Requirements» (с. 54), «Threshold Science Requirements» (с. 67); критерії успіху — с. 106 | ✓ |
| Технічні показники й запаси (TPM) | SEH | розд. 6.7 «Technical Assessment» (с. 155–160) | ✓ |
| Trade study й аналіз рішень | SEH | розд. 6.8 «Decision Analysis» (с. 160–170); процес trade study — PDF с. 79–80 | ✓ |
| Межі запасів для балу «Ефективність ресурсів» | GOLD | табл. 1.06-1, с. 12: маса > 15 % (до SRR), енергія > 25 % (Pre-Phase A), лінія ≥ 3 дБ | ✓ для маси, енергії й зв'язку; для бюджету, даних і часу чисел немає — ✗ |
| Ваги наукової цінності інструментів | — | NASA-документа не знайдено | ✗ |

Гра моделює проєкт на етапі концепту, тож беремо колонку Pre-Phase A таблиці 1.06-1.

## Каталог деталей

Числа деталей і двигунів звірено із SOA 2026 у задачі 016 — див. `docs/catalogs.md`.
