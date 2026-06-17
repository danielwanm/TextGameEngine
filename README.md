# TextGameEngine

A browser-based engine for building branching, visual-novel-style text adventures.
You write a story in a small custom scripting language, and the engine compiles it
into a typed scene graph and plays it back as a typewriter-style game — complete
with branching choices, free-text input puzzles, character sprites, speech bubbles,
and background swaps.

Built in strict TypeScript on Vite, with **zero runtime dependencies**.

---

## Demo

> _Demo coming soon._

<!-- TODO: add a GIF / screen recording and a link to the live deployment here -->

---

## Technical Specification

### Scene graph

The heart of the engine is a **directed graph of story nodes**. Parsing a script
produces a single `Game` object whose `nodes` field is a `Record<string, Node>` —
an adjacency-list representation where every node is addressable by id and edges
are stored as id references rather than object pointers.

```ts
interface Game {
  title: string;
  head: string;                          // entry node — where playback starts
  characters: Record<string, Character>;
  narratorId: string | null;
  backgrounds: Record<string, string>;
  nodes: Record<string, Node>;           // the graph itself
}

interface Node {
  nodeId: string;
  lines: DialogLine[];                    // ordered dialog played in sequence
  options: Option[];                      // choice edges → next node
  expectedInputContains?: string;         // input-puzzle edge (matched substring)
  inputNext?: string;                     // edge taken on correct input
  wrongInputNext?: string;                // edge taken on incorrect input
  changeBackground?: string;
}
```

Each `Node` carries an ordered list of dialog lines plus its **outgoing edges**:

- **Choice edges** — every `Option` holds the displayed label and a `next` node id,
  rendered at runtime as a button.
- **Input-puzzle edges** — a node can branch on free-text input: a correct substring
  match routes to `inputNext`, anything else routes to `wrongInputNext`. This lets a
  single node fork the graph two ways without buttons.

Because edges are plain string ids, the graph can contain **cycles** (e.g. a "wrong
answer" node looping back to retry) with no special handling — traversal just looks
up the next id in the `nodes` map.

### Parser

`src/parser.ts` is a **single-pass, line-oriented parser** (~160 lines, no parser
generator). It walks the script top to bottom, dispatching on each line's prefix:

- **Header directives** (`@title`, `@character`, `@narrator`, `@background`)
  populate the character and background registries.
- **Node bodies** accumulate dialog lines, choice options, input puzzles, and
  background changes onto the *current* node; a `::nodeId` header commits the
  previous node and opens a new one.

The parser validates as it goes — unknown speakers, malformed options, missing
`START` node, and unresolved images all throw with descriptive errors, so a broken
script fails fast at parse time rather than mid-playback.

### Asset resolution

Scripts reference images by plain filename (e.g. `hero_idle.png`). At build time the
parser resolves these through Vite's `import.meta.glob`, so all art under
`src/images/` is **bundled, fingerprinted, and tree-shaken** by Vite even though the
script only names assets as strings.

### Runtime

`src/main.ts` drives playback as an **async render loop**. For each node it shows the
correct sprite, typewrites the text, `await`s a click to advance, then renders the
node's outgoing edges as buttons or an input box and `await`s the player's choice
before walking to the next node id. Modeling every "wait for the player" as an
`await` keeps the control flow linear and readable top-to-bottom.

### Stack

- **TypeScript 5** (strict mode, zero runtime dependencies)
- **Vite 7** — dev server, bundling, and asset pipeline
- **ESLint 9** + `typescript-eslint`

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
