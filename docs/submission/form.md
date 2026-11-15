# Submission form texts

Ready-to-paste English texts for the Space Apps project page, one section per form field.
Внутрішня примітка (українською): форму заповнює й надсилає людина зі свого акаунта Space Apps.
Назви полів узято зі звичної форми Space Apps; перед вставкою звірте їх із Project Submission
Guide у браузері (з машини агента сайт не відкривається). Тексти звірено з живою грою
15.11.2026, ввечері (коміт після 0d5c458).

## Project name

Space Mission Design Game

## Challenge

Space Mission Design Game

## High-level project summary

A browser game where you get only a mission goal — "deliver 500 GB of Earth images in 12
months on a 450k budget" — and design the whole mission yourself: orbit, launch vehicle,
ground stations and the spacecraft, part by part. The mission launches only when your
decisions pass every check. Then a physics simulation with NASA sources flies it day by day,
with real NASA DONKI space-weather storms, and explains across NASA's four mission segments
where and why it worked or failed. Change one decision and fly again. Three missions, two
difficulty levels, English and Ukrainian.

## Link to the final project

- Play (no sign-in): <https://shelbythx.github.io/space-game/>
- Code: <https://github.com/Shelbythx/space-game>

## Link to the project demo

<https://shelbythx.github.io/space-game/> — the playable game itself.
<!-- Слайди (7 сторінок) роблять у самому кінці; коли буде новий slides.pdf, дати посилання:
https://github.com/Shelbythx/space-game/blob/main/docs/submission/slides.pdf -->

## Project details

**What it does.** The game turns the NASA mission life cycle into five stages:

1. **Goal** — the need, the end product and the limits: budget, launch deadline, NASA mass
   margin, and which role owns which decision.
2. **Concept** — orbit, launcher and ground stations (or the TDRS relay), with what each choice
   means: period, time in Earth's shadow, lifetime, contact time.
3. **Design** — build the spacecraft on a blueprint: bus, solar arrays, battery, radio,
   computer, attitude control, engine, instruments or cargo. Six resources update after every
   change — mass, power, budget, data, comms, time — and checks are grouped by NASA's four
   mission segments (launch, space, ground, user).
4. **Flight** — the backend flies the whole mission; the game replays it on a flat Earth map
   with the ground track, Earth's shadow, station visibility, contacts, battery, data, altitude,
   propellant and events. For the ISS mission a two-orbit view shows the chase and docking.
5. **Report** — for each segment a chain "your decision → physics with numbers → result", the
   bottleneck resource, four scores with their formulas (mission success, science value,
   resource efficiency, decision quality), a comparison with a similar real NASA mission or a
   reference design, and with your previous attempt.

**Three missions.** A training CubeSat released from the ISS (1 GB in 6 months, 150k, step-by-step
hints); "Satellite to orbit" (500 GB of Earth images in 12 months, 450k); "Cargo to the ISS"
(2,500 kg, at least 30% science, docking within 5 days, 1,500k).

**Four roles, one spacecraft.** Planner, Scientist, Engineer and Designer each own their
decisions and comment on every change, so the trade-offs are visible even in single player: a
better camera collects more data than the radio can send down, bigger panels add mass, more mass
needs a bigger rocket, and the budget runs out. There is no single right answer.

**Two depths.** In the simple version the roles give advice. In the advanced version they state
facts only, the player sets the layout and the mass margin, and every resource opens a
calculation sheet with the formula, the numbers and the NASA document it comes from.

**Benefits and intended impact.** Students meet orbits, rockets and spacecraft as separate
topics. The game lets high-school and university students without an engineering background
see the systems thinking of a mission team: every decision costs something elsewhere, and a
failed mission explains itself instead of just showing a score. Same design and same seed give
the same flight, so a class can compare designs fairly.

**How we built it.** Backend: C#, ASP.NET Core on .NET 10, PostgreSQL 17, xUnit tests — it
computes all physics (orbit period, Earth's shadow and power balance, data downlink and ground
contacts, drag and orbital decay, rocket equation, Hohmann transfer and ISS phasing). Frontend:
React 19, TypeScript, Vite, MUI, i18next — it only shows what the backend computed. Hosting:
GitHub Pages and Azure App Service with Azure PostgreSQL; GitHub Actions build, test and deploy.
The music is original, composed by a team member.

**Status at the deadline.** All three missions are playable end to end with the live backend.
A co-op mode for 2–4 players on a local network (one role per player) and an Arcade mode are
designed but not built; the menu says they come later.

## Use of artificial intelligence

> We used Claude Code (Anthropic) coding agents. They drafted the plan and the API contract,
> wrote most of the backend and frontend code and tests, searched and read NASA documents, and
> drafted the documentation and these texts. Team members made every design decision, chose the
> missions and the visual style, reviewed every change, ran the game and checked the numbers
> against the NASA sources. Commits written with an agent are marked "Co-Authored-By: Claude" in
> the repository history. No AI-generated images, video, voice or music are used; the music is
> a team member's original work. Details: https://github.com/Shelbythx/space-game/blob/main/docs/ai-usage.md

## NASA data and resources

- **NASA DONKI** (api.nasa.gov) — real geomagnetic storms replayed during the flight.
- **Small Spacecraft Technology State-of-the-Art 2026** (NASA SmallSat Institute) — the parts
  catalog: solar arrays, batteries, engines, attitude control, computers.
- **GSFC-STD-1000 "Gold Rules"** (NASA Goddard) — mass and power margins.
- **NASA-STD-8719.14C** — the 25-year rule for leaving orbit.
- **Earth Fact Sheet** (NSSDCA), **GMAT Mathematical Specifications**, Rickman's *Introduction to
  Orbital Mechanics and Spacecraft Attitudes for Thermal Engineers*, **U.S. Standard Atmosphere
  1976** — orbits, shadow, drag, Hohmann transfer, phasing.
- **Ideal Rocket Equation** and **Drag Equation** (NASA Glenn Beginner's Guide to Aeronautics).
- **Near Earth Network Users' Guide**, **Near Space Network** and **TDRS** pages — ground
  stations and relay coverage.
- **ISS resupply missions** (SpaceX CRS-29, Northrop Grumman NG-20, Orb-2) and ISS trajectory
  data — cargo masses, science share, launch sites.
- **Real NASA missions for comparison:** Landsat 9, Aqua, PACE, ICESat-2, GOES-16, TDRS-M,
  TROPICS, IceCube, Dellingr, CRS-29, NG-20.
- **NASA Image and Video Library** — photos for the submission materials.

Every formula with its document, section and page:
<https://github.com/Shelbythx/space-game/blob/main/docs/physics-sources.md>

## Space agency partner data

None used.

## References

- Full list of sources and their sections: `docs/physics-sources.md`, `docs/catalogs.md`,
  `docs/catalogs-iss.md`, `docs/reference-missions.md` in the repository.
- Assets and their licences: `assets/CREDITS.md`. Fonts: Tiny5 and IBM Plex (SIL Open Font
  License 1.1). Code: MIT.

## Team

Svyatoslav Maliuga (Stiluss, @Shelbythx) · Bohdan Khudashchov (@Khudashchov) · TheAdvental
(@TheAdvental) · katyashozda (@katyashozda)
