# TextGameEngine

Write a branching text adventure in a simple scripting language and play it in the browser as a visual novel.

---

## Demo

> _Demo coming soon._

<!-- TODO: add a GIF / screen recording and a link to the live deployment here -->

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
