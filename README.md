# textGameEngine

A tiny text-adventure engine for the browser. Write a story in a small custom DSL,
and the engine parses it into a typed graph and plays it back as a typewriter-style
visual novel — branching choices, text-input puzzles, and background swaps included.

Built in TypeScript (strict) on Vite, with zero runtime dependencies.

---

## Quick start

```bash
npm install
npm run dev
```
---

## Writing a story

A script is plain text. Header directives declare characters and assets;
node blocks declare scenes, dialog, and transitions.

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

---

## How it works

Three files, ~400 lines total.

- **`src/types.ts`** — the data model. `Game` is a `head` node id plus a
  `Record<string, Node>`; each `Node` carries an ordered list of `DialogLine`s,
  the `Option`s the player can pick, and an optional input puzzle.
- **`src/parser.ts`** — a single-pass parser that walks the script line-by-line.
  Header directives populate the character / background registries; node bodies
  push lines and options onto the current node. Image references are resolved
  through `import.meta.glob`, so Vite bundles and fingerprints assets at build
  time even though the script names them as plain strings.
- **`src/main.ts`** — the runtime. On start it parses the script, dynamically
  injects one sprite pair + one speech bubble per declared character, then drives
  an async render loop: for each line it shows the right sprite, typewrites the
  text, awaits a click, then advances. At node boundaries it renders option
  buttons or an input box and `await`s the player's choice before walking to the
  next node.

The async-loop shape means control flow reads top-to-bottom — every "wait for
something" is just an `await`.

---


## Tech stack

- TypeScript 5 (strict, no runtime deps)
- Vite 7
- ESLint 9 + `typescript-eslint`
