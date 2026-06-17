# TextGameEngine

Write a branching text adventure in a simple scripting language and play it in the browser as a visual novel.

---

## Demo
User writes a script like:
```txt
@title

@character hero    right danielNotTalking.png danielTalking.png
@character guard   left  melNotTalking.png    melTalking.png
@narrator narrator

@background day     cloudyBackground.png
@background night   nightBackground.png
@background sunrise sunriseBackground.png


::open START
cb day
* A traveler crests the final hill. The road ends at an old stone arch.
--Step through the arch -> meet

::meet
cb night
@guard
hero: Who's there? I thought this place was abandoned.
guard: Abandoned, perhaps. Unguarded — never.
--Ask who she is        -> identify
--Draw your sword       -> hostile

::identify
guard: I am the keeper of this gate. Answer my riddle and you may pass.
* The guard raises her hand.
--I'll try -> riddle

::riddle
guard: Ok ill give you an easy one whats color is the sea
-? blue -> passed / wrongAnswer


::wrongAnswer
guard: No. Think again, traveler.
-? blue -> passed / wrongAnswer

::hostile
guard: Foolish. Steel cannot answer what the gate asks.
--Lower your weapon -> identify

::passed
cb sunrise
guard: Correct. The needle, the lodestone, the silent guide.
hero: Then the road is mine?
guard: For now.
--Walk on -> ending

::ending
* Dawn breaks. The arch fades behind you as the next valley opens below.
:!
```
Renders to following game:
[Game](https://text-game-engine-mb3a135no-danielwanms-projects.vercel.app/)


---

## Technical Specification

- **Scene graph** — a script compiles into a directed graph of story nodes (`Record<string, Node>`), where edges are node-id references for both menu choices and free-text input puzzles, so branches and loops are just id lookups.
- **Parser** — a single-pass, line-oriented parser turns the scripting language into the typed graph, validating speakers, options, and assets as it goes so broken scripts fail fast.
- **Runtime** — playback runs as an async render loop that types out each line, `await`s the player's click or choice, then walks to the next node id.

---

## Quick start

```bash
npm install
npm run dev
```

---

## Writing a story

A script is plain text. Header directives declare characters and assets; node blocks
declare scenes, dialog, and transitions.
