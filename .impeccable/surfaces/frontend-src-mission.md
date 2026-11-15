---
version: 1
slug: "frontend-src-mission"
primary_target: "frontend/src/mission"
related_targets: ["frontend/src/blueprint","frontend/src/report","frontend/src/flight","frontend/src/rendezvous","frontend/src/tutorial"]
---

# Mission stages — surface brief

Scope: the five mission stages (Goal, Concept, Design, Flight, Report) of all three missions, inside
`MissionShell`. Mode: Operate. Audience: students 14–22 on a laptop first; judges from screenshots.
Task: make one decision at a time and see its consequence. Constraints: keep every function, state,
demo mode, both languages, both versions; blueprint drawing (D54) and pixel menu style (D90) are
binding; no physics in UI code. Problems to fix: identical dark frames with no hierarchy, small text
and many words, no feeling of a game or of space.

## Direction contract

THESIS: The mission is a flight plan — a NASA checklist you work down: where you are, what is already
decided, what to do now. Refuses the dashboard of equal bordered panels.

OWN-WORLD: Dark drafting paper with grid; cyan line work; Tiny5 pixel headings and blocky pixel
buttons; sun-yellow marks the current step and the main action, green ticks what is done; frames only
where a drawing lives, everything else sits on the paper divided by thin rules.

STORY: The player sees the whole plan, knows the current task in one line, decides, watches the
numbers move, presses «Next >» and the plan ticks forward.

FIRST VIEWPORT: Left rail (about 230 px): mission name, the five stages as a vertical checklist on a
trajectory line (stage N of 5 lives here), decisions already made under each done stage, version switch
at the bottom. Main: task title in Tiny5 at about 40 px with no label above it, one-line task; a slim
strip of six resource readouts; the stage scene without boxes; roles as radio transmissions; a footer
with the readiness status (ready / N failed checks) beside a large pixel «Next >». The rail collapses
to numbers on Design and below 1100 px becomes a top stepper.

FORM: flight-plan checklist, position 5 on the ordered list of 7, seed key 45ee8ca3.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
