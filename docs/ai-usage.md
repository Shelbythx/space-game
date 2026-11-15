# Use of AI

NASA Space Apps allows AI tools if the team says clearly where and how they were used.
This is that statement for the Space Mission Design Game.

## Tools

- **Claude Code** (Anthropic) — coding agents in the Claude desktop app and in Claude cloud
  sessions, models **Claude Opus 5.5** and **Claude Fable 5.2**.
- No AI-generated images, video, music or voice are used in the game or in the submission.

## Who did what

**People decided; agents wrote most of the text and code.** Each team member worked with
their own Claude agent on tasks assigned to them; everything reached `main` through pull
requests that a team member opened and merged, with CI (build, lint, tests) on every PR.

| Area | People | AI agents |
| --- | --- | --- |
| Game concept, scope, mechanics | Chose the concept, the missions, the roles, the stack and every rule recorded as a team or user decision in [`decisions.md`](decisions.md) | Asked questions, proposed options and drafts; proposals entered the decision log only after a person approved them. Decisions taken by an agent on a person's instruction are marked "agent's decision" there |
| Physics and numbers | Required that every formula and number come from a NASA document (D89) and approved how derived formulas and game estimates are marked (D103) | Found and read the NASA documents, wrote [`physics-sources.md`](physics-sources.md) with sections and pages, checked catalog numbers against SmallSat State-of-the-Art 2026 |
| Backend (C#, .NET 10) | Ran the agent on their machine, built and tested the code, reviewed and merged | Wrote the API, physics, simulation, report, DONKI client and 80+ unit tests |
| Frontend (React) | Chose the visual style (pixel menu, blueprint look), reviewed screens in the browser, merged | Wrote the screens, the demo mode and the English and Ukrainian texts; checked each screen in a browser at desktop and phone widths |
| Documents and submission | Reviewed and edited | Drafted the plan, the API contract, this README, this file and the slides |
| Music | All seven tracks in `assets/audio/` were composed by team member Stiluss without AI | — |

Commits written with an agent carry a `Co-Authored-By: Claude …` line, so the git history
shows which changes an agent produced.

## How we kept it honest

- **Every number has a source label** in the game: NASA, NASA retold (to be verified),
  derived from NASA formulas, or game estimate (D51, D103).
- **The physics lives in one place** — the backend; the frontend never recomputes it, so a
  wrong number can be traced to one formula and its NASA source.
- **Agents did not invent data.** Where no NASA number was found, the value is marked as a
  game estimate in [`catalogs.md`](catalogs.md) and [`physics-sources.md`](physics-sources.md).
- **Tests pin the formulas** — orbit period, eclipse fraction, drag, rocket equation,
  Hohmann transfer, deterministic simulation for a given seed.
- **People checked the results** in the running game. The screenshots in the submission
  are of the real game; where the flight and the report show sample data instead of a live
  backend run, the caption says so.

## Where the text of this file goes

The summary above is pasted into the "Use of AI" field of the Space Apps project page.
