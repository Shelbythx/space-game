# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

High-school and university students, about 14–22 years old, curious about space but without
space-engineering knowledge (D53). They play alone in the Science mode, on a laptop first; phones
must work too. NASA Space Apps judges are a second audience: they open the game from the README or
see it in screenshots and slides, mostly on a laptop.

## Product Purpose

Space Mission Design Game (NASA Space Apps Challenge 2026, challenge «Space Mission Design Game»).
The player gets only a mission goal and designs the whole mission: orbit, launcher, ground
stations, spacecraft parts, instruments or cargo. A simulation on real physics flies it and the
report explains where and why it worked or failed, so the player fixes the design and flies again.
Success: a newcomer understands why their decision changed the result, not just the score.

## Positioning

The whole mission as one system — the four NASA segments (launch, space, ground, user) — instead of
one topic. Every formula and number comes from a NASA document or is labelled as derived or a game
estimate (D51, D89, D103). Real NASA data in play: DONKI storms, SmallSat State-of-the-Art parts,
GSFC Gold Rules margins. Four roles (Planner, Scientist, Engineer, Designer) voice the trade-offs.

## Operating Context

Five stages per mission: Goal → Concept → Design (blueprint) → Flight → Report, with a stage bar to
any stage. Three missions: CubeSat training (step hints), satellite to orbit, cargo to the ISS
(rendezvous). Simple version (switches, role advice) and advanced version (role consoles, cards
with every number and source). Six resources always visible: mass, power, budget, data (cargo on
the ISS mission), comms, time. Without the mission server the game runs a labelled demo.

## Capabilities and Constraints

- The backend computes everything; the frontend only shows it (D59). No physics in UI code.
- English is the main language, Ukrainian the second (D29); all player texts are message codes.
- 2D only in the first release (D54); no NASA logo or insignia.
- React + TypeScript + Vite + MUI; menu font Tiny5 has no arrows or triangles — controls use `<` `>`.
- Every redesign keeps all existing functionality, states, demo mode and both languages.

## Brand Commitments

- The blueprint is a technical drawing (D54): dark drafting paper with a grid, thin cyan lines,
  parts as flat schematics with numbers. Confirmed by the user on 15.11.2026 as binding for the
  mission screens.
- The pixel style of the main menu (D90): Tiny5 headings and blocky pixel buttons with their own
  palette, mood of Minecraft without its elements. Confirmed binding for the mission screens too.
- Music by team member Stiluss (assets/audio); fonts Tiny5 and IBM Plex (OFL).

## Evidence on Hand

- Screens and catalogs in `frontend/src`; numbers and sources in `docs/catalogs.md`,
  `docs/physics-sources.md`.
- Screenshots in `docs/submission/screenshots/` (flight and report on sample data).
- No user testing, testimonials or metrics exist; do not invent them.

## Product Principles

1. Explain why, not just how much: the causal chain and the bottleneck lead every result.
2. The consequence of a decision is visible at once, where the decision was made.
3. Real NASA numbers with their source, honestly labelled when estimated.
4. A newcomer never needs outside help; depth is there for those who want it.
5. It is a game: failing is safe and the next attempt is one click away.

## Accessibility & Inclusion

Readable on a laptop at arm's length and on a 375 px phone without horizontal scrolling; text
contrast at least WCAG AA; keyboard control in the menu (D90); motion respects reduced-motion.
