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

### Directives (top of file)

| Directive                                | Meaning                                      |
| ---------------------------------------- | -------------------------------------------- |
| `@title <text>`                          | Window title and on-page heading             |
| `@character <id> <left\|right> <idle> <talking>` | Declare a character with two sprites |
| `@narrator <id>`                         | Declare a narrator id (no sprite)            |
| `@background <name> <file>`              | Register a named background image            |

Image filenames are looked up under `src/images/` — drop your art there and
reference it by basename.

### Node syntax

| Line                       | Meaning                                                  |
| -------------------------- | -------------------------------------------------------- |
| `::nodeId [START]`         | Begin a node. Add `START` on exactly one node.           |
| `@id`                      | Show that character's idle sprite                        |
| `id: text`                 | Character speaks (talking sprite + bubble + typewriter)  |
| `* text`                   | Narrator line (full-width text box, no sprite)           |
| `--label -> nextId`        | Choice button routing to `nextId`                        |
| `-? expected -> ok / bad`  | Free-text input; substring match routes to `ok` or `bad` |
| `cb name`                  | Swap the background to a named entry                     |
| `:!`                       | Optional explicit node terminator                        |
| `#` or `//`                | Comment                                                  |

Multiple lines inside a node play in sequence — the player clicks to advance
between them.

### Minimal example

```text
@title Hello, Traveler

@character hero  right hero_idle.png  hero_talk.png
@character guide left  guide_idle.png guide_talk.png
@narrator narrator

@background day day.png

::open START
cb day
* You stand at a crossroads.
@guide
hero: Which way leads home?
guide: Trust the wind. Answer me this: what has cities, but no people?
-? map -> home / lost

::home
guide: Then go in peace.

::lost
guide: ...try again.
-? map -> home / lost
```
