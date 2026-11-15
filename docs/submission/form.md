# Submission form texts

Ready-to-paste English texts for the Space Apps project page. Внутрішня примітка
(українською): перед вставкою звірте з чеклістом `checklist.md`, розділ «Перевірити
заяви»: кожна фраза тут має відповідати тому, що реально працює в грі на момент подачі.

## Project name

Space Mission Design Game

## High-level summary (short description)

A browser game where you get only a mission goal — "deliver 500 GB of Earth images in
12 months on a 450 k budget" — and design the whole mission yourself: spacecraft parts,
orbit, launch vehicle and ground stations. Real physics with NASA sources then flies your
mission day by day and explains, across NASA's four mission segments, where and *why* it
worked or failed. Change one decision and fly again.

## Detailed description

**The problem.** Students learn orbits, rockets and spacecraft as separate topics. They
rarely see how one decision ripples through a whole mission: a better camera needs more
power, bigger panels add mass, more mass needs a bigger rocket, and the budget runs out.

**What we built.** A Science Mode game in five stages — goal and requirements → concept →
blueprint → flight → report:

- **Three missions:** a beginner CubeSat deployed from the ISS, "Satellite to orbit" and
  "Cargo to the ISS".
- **Six resources always on screen:** mass, power, budget, data, communications and time.
- **Four roles, four voices:** Planner, Engineer, Designer and Scientist comment on every
  choice, so the trade-offs are visible even in single-player.
- **Real physics:** Tsiolkovsky equation, Hohmann transfers, eclipse and power balance, link
  budget, atmospheric drag and orbital lifetime, ISS rendezvous phasing. Every formula
  links to a NASA document.
- **Real NASA data in play:** spacecraft parts from NASA's Small Spacecraft Technology
  State-of-the-Art 2026; historical geomagnetic storms from NASA DONKI hit your satellite
  during the flight; the report compares your design with a real NASA mission (Landsat 9,
  Aqua, ICESat-2, TROPICS, IceCube, CRS-29 and others).
- **Explanations, not just a score:** each segment shows a cause chain "decision → physics
  with numbers → consequence" and names the bottleneck resource.
- **No single right answer:** many designs reach the goal; the game rewards understanding
  trade-offs.

**Team play.** The four roles map to a cooperative mode for up to four players on a local
network. It is designed (rooms, role ownership, sync) but not built yet; in this version
one player leads all four roles.

**Why it matters.** It teaches the systems thinking of a mission engineer to high-school
and university students without a technical background — in English and Ukrainian.

## Links

- Play: <https://shelbythx.github.io/space-game/>
- Code: <https://github.com/Shelbythx/space-game>
- Demo (slides): _add link after upload_

## NASA data and resources

See the "NASA resources" section of the [README](../../README.md#nasa-resources).

## Use of AI

See [`docs/ai-usage.md`](../ai-usage.md). Short version for the form:

> We used Claude Code (Anthropic) as a coding and research agent: it drafted the plan,
> wrote most of the backend and frontend code and tests, searched NASA sources and drafted
> these texts. Team members made every design decision, reviewed and merged all changes
> through pull requests, and verified the sources. No AI-generated images, video, voice or
> music are used; the music is a team member's original work.
