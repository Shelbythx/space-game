# Demo slides (7)

Space Apps allows a demo of up to 7 slides including the title and intro (D67). Texts are
final English; `[SCREENSHOT: …]` marks the image for each slide; four are already in
`screenshots/` (flight and report were taken on sample data — retake on the live backend). Внутрішня примітка: людей до 18 років на скриншотах і в GIF бути не
може; логотип NASA не використовуємо.

---

## 1 · Title

**Space Mission Design Game**
*You get a goal. You design the mission. Physics tells you why.*

NASA Space Apps Challenge 2026 · challenge "Space Mission Design Game"
Team: Stiluss · Khudashchov · TheAdvental · katyashozda

[SCREENSHOT: `screenshots/menu.jpg` — pixel title over the starry sky]

---

## 2 · The problem

Students learn orbits, rockets and spacecraft **separately**.
Real missions fail at the **seams**:

- a better camera → more power → bigger panels → more mass → bigger rocket → over budget;
- more data than the radio can send → the mission "succeeds" but delivers nothing.

No tool lets you **feel** these trade-offs across a whole mission.

---

## 3 · Our answer: the whole mission in five stages

Goal & requirements → Concept → **Blueprint** → Flight → Report

- Three missions: beginner CubeSat · Satellite to orbit · Cargo to the ISS
- Six resources always visible: mass · power · budget · data · comms · time
- Many designs reach the goal — there is no single right answer

[SCREENSHOT: briefing with the mission goal and limits]

---

## 4 · Design: every choice has a price

Build the spacecraft part by part, pick orbit, launch vehicle and ground stations.
Four roles react instantly:

- **Planner** — budget and schedule · **Engineer** — power and propulsion
- **Designer** — mass, slots, fit in the fairing · **Scientist** — data and the goal

[SCREENSHOT: `screenshots/design.jpg` — blueprint with the resource panel and role comments]

---

## 5 · Fly it on real physics

Day-by-day simulation: drag and orbital lifetime, eclipses and battery, ground-station
passes and downlink, ISS rendezvous.
**Real geomagnetic storms from NASA DONKI** strike during your flight.

[GIF: record from the live game; still: `screenshots/flight.jpg` — flight over the flat Earth map — orbit track, station passes, a storm event]

---

## 6 · Understand why — and fly again

The report covers NASA's four segments: launch · space · ground · user.

- Cause chain: *decision → physics with numbers → consequence*
- The **bottleneck** resource that limited the mission
- Your design next to a **real NASA mission** (Landsat 9, ICESat-2, TROPICS, CRS-29…)
- "Redesign" — change one thing and fly again

[SCREENSHOT: `screenshots/report.jpg` — report with the cause chain and the comparison]

---

## 7 · Built on NASA science

- **Data:** Small Spacecraft Technology State-of-the-Art 2026 · DONKI · NSSDCA and NASA
  mission pages · ISS cargo manifests
- **Formulas:** NASA Glenn, GSFC GMAT specs, U.S. Standard Atmosphere 1976,
  NASA-STD-8719.14C, GSFC Gold Rules — every number has a source
- **Next:** 4-player co-op on a local network (designed), Arcade mode

Play: **shelbythx.github.io/space-game** · Code: **github.com/Shelbythx/space-game**
AI use: Claude Code as coding and research agent — see `docs/ai-usage.md`
