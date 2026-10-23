# Combat UI mockups

Static HTML/CSS sketches only. No game code, build step, or simulation.
Open [`index.html`](index.html) from this folder (file URL or any static server).

These pages explore a **lower-step** combat HUD for desktop (1440×900) and
portrait phone (~390×844). The owner asked for the fewest taps and for redundant
chrome to go. The live HUD this replaces is the #108 / #111 rail/dock.

## How combat works today

A player turn is **one move and one action, in either order**, then **Wait / End
turn**. The scene auto-selects Move at the start of a usable player turn (#145).
Items are **not** combat actions: inventory is locked while a battle is active
(`Items are unavailable during a battle.`).

| Control | What it does |
| --- | --- |
| Move | Select reachable tile, preview path, Review, Confirm dialog |
| Basic attack | Select verb, select enemy, preview, Review, Confirm |
| Signature | Same as attack (`Guarded Strike` / `High Shot` / `Magic Missile`) |
| Wait / End turn | One tap; no dialog |
| Inspect party / inspect target | Modal stats; does not change the actor |
| Battle log, sound, restart, save recovery | Secondary tools in the same rail |

Authoritative path: `src/ui/hud.ts`, `src/phaser/BattleScene.ts` (`review` opens
`BattleDialogs.show`), `src/ui/battleActions.ts`, `src/ui/targetPreview.ts`.
Board taps and the target `<select>` both call `select()`. Signature uses the
ability dropdown’s current value. Wait calls `prepare` + `confirm` immediately.

### Current step counts

Counts assume Move is already selected (the live default). A click/tap is one
step. Opening the confirm **dialog** is a separate step from Review.

| Action | Steps | Path |
| --- | ---: | --- |
| Move | **3** | Destination (board or dropdown) → Review action → Confirm |
| Basic attack | **4** | Basic attack → target → Review → Confirm |
| Signature | **4** | Signature → target → Review → Confirm |
| Wait / End turn | **1** | Wait (no confirm) |
| Use item | n/a | Out of combat only |

Keyboard is the same intent path: arrows/Enter select a cell, then Review.

### Redundant or duplicated elements

- **Ability `<select>` + Signature button** — one owned non-basic ability, two
  widgets (`hud.ts` builds both; Signature reads `this.ability.value`).
- **Target `<select>` + board tap + “Selected (x, y)” + target-info + preview**
  — five presentations of one cell.
- **Ability-info, availability copy, and button subtitles** — range, spent, and
  “choose an action” restated three times.
- **Review action + Confirm dialog** — two confirms. The dialog repeats actor,
  action, target, and `previewText`, and also offers **Restart battle**.
- **Board heading** (“Tactics Guru / Forest Ruins”) **+** actor “Round · turn”
  **+** board caption legend.
- **Inspect party** restates HP/AC/accuracy already in the actor header.
- **Portrait dock at 56% viewport height** on phone — the board becomes a strip
  while the player still scrolls to reach Review.

Wait skipping confirm while move/attack require two confirms is inconsistent.

The #108 design accepted this rail/dock and the preview→Review→Confirm loop.
These sketches keep **preview then one explicit confirm** (battle-controls spec)
and drop the second confirm plus the duplicate selectors.

## The three options

### A — Direct board + contextual wheel

The board is the UI. Tap a reachable tile to drop a **Move here** chip on that
tile; tap the chip (or the same tile again) to commit. Tap an in-range enemy for
the same pattern with a damage chip. A four-spoke wheel around the acting unit
switches Attack / Signature / Move / Inspect. End turn is the only persistent
verb. Overflow (log, sound, restart) lives behind the actor chip.

**Removes / merges:** entire 352px rail, ability dropdown, target dropdown,
Review, Confirm modal, board heading, legend caption, inspect-party button,
duplicate selection copy.

| Action | Today | A |
| --- | ---: | ---: |
| Move | 3 | **2** (tile, chip) |
| Basic attack | 4 | **2** (enemy, chip) |
| Signature | 4 | **2–3** (wheel spoke if needed, target, chip) |
| Wait | 1 | **1** |

Desktop: wheel on the acting unit; chips on the board. Mobile: same, board
keeps most of the 390×844 viewport; End turn is a full-width 44px control.

### B — Persistent action bar + smart defaults (recommended)

A bottom (mobile) / board-bottom (desktop) bar always shows Move, Attack,
named signature, Wait, and one gold **Go**. Smart default: **Move** if no enemy
is in the current verb’s range; **Attack** when an enemy is in melee (or the
selected verb’s range) after a move. Hover/press on a target fills an on-board
forecast. Go commits the previewed command. Go never changes location.

**Removes / merges:** rail/dock, both dropdowns, Review, Confirm modal, heading,
caption, inspect as a primary control (⋯ overflow), duplicate preview copy.
Actor header becomes a compact overlapping chip.

| Action | Today | B |
| --- | ---: | ---: |
| Move | 3 | **1–2** (tile; Go if you want a second deliberate tap) |
| Basic attack | 4 | **1–2** (0 verb taps when Attack is the smart default) |
| Signature | 4 | **2** (verb, target+Go) |
| Wait | 1 | **1** |

The 2-tap reading (select target, tap Go) still satisfies “preview then
explicit confirmation.” A 1-tap variant (release on the target commits) is
possible later for mouse-out cancel; do not skip preview.

### C — Radial / hold gestures

Hold (touch) or right-click (desktop) on a unit or tile. A radial appears;
drag toward Attack / Signature / Move / Inspect; **release commits**. Left-click
on desktop still uses B-like smart defaults (empty reachable = move, enemy in
range = attack). Icon rail on desktop is a shortcut, hidden on the phone.

**Removes / merges:** the same chrome as A, plus the persistent action bar.
Almost no always-visible verbs on mobile.

| Action | Today | C |
| --- | ---: | ---: |
| Move | 3 | **1** (hold empty reachable tile, release) |
| Basic attack | 4 | **1** (hold enemy in range, release) |
| Signature | 4 | **2** (hold self → Signature, then hold target) |
| Wait | 1 | **1** |

Risks: hold fights pan/zoom (`BoardInput` already uses press-and-drag to pan);
no hover on a phone; slices are easy to miss; worse keyboard/screen-reader
parity unless a non-gesture path remains.

## Recommendation

**Implement Option B**, and steal A’s on-tile path chip for movement preview.

- Fewest taps that stay discoverable and meet the existing preview/confirm
  contract, 44px targets, and keyboard parity (arrows select, Enter = Go).
- One confirm control, always in the same place — important on a 390px phone
  where Review today lives below a scroll fold.
- Smart defaults remove the extra verb tap in the two most common cases
  (walk somewhere; hit the adjacent goblin).
- Does not teach a new hold gesture on a camera that already pans on drag.

Do not make C the only path. Hold-to-inspect can land later as an accelerator.
Keep Wait at one tap. Keep items out of the combat bar until a real in-combat
item command exists.

Spec note: `openspec/specs/battle-controls/spec.md` currently requires Review
then Confirm. Adopting B is a **spec change** from two confirms to one, not a
CSS restyle of the rail.

## Files

| File | Role |
| --- | --- |
| `index.html` | Comparison, links |
| `current.html` | Shipped HUD recreation |
| `option-a.html` | Board + wheel |
| `option-b.html` | Action bar + Go |
| `option-c.html` | Radial hold |
| `styles.css` | Shared tokens (game colors) |
| `export.js` | `?export=1` hides reviewer chrome |
| `assets/` | Board capture + portraits copied for a self-contained folder |
| `previews/` | PNG captures at 1440×900 and 390×844 |

Board art is the #108 Forest Ruins context capture; portraits are the runtime
HUD assets. Display fixtures only — not a legal snapshot of one battle.

## Screenshots

Captured with headless Chrome at device scale 1:

- `previews/current-desktop.png` / `previews/current-mobile.png`
- `previews/option-a-desktop.png` / `previews/option-a-mobile.png`
- `previews/option-b-desktop.png` / `previews/option-b-mobile.png`
- `previews/option-c-desktop.png` / `previews/option-c-mobile.png`

Live app (Vite, this checkout, Mage first in initiative):

- `previews/live-desktop.png` (1440×900)
- `previews/live-mobile.png` (390×844)

Regenerate mockup PNGs: `CHROME=/usr/bin/google-chrome node mockups/combat-ui/capture.mjs`
