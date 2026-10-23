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

### B — Persistent action bar + smart defaults (owner-chosen)

A bottom (mobile) / board-bottom (desktop) bar always shows Move, Attack, the
**shown special**, Wait, and one gold **Go**. Smart default: **Move** if no enemy
is in the current verb’s range; **Attack** when an enemy is in melee (or the
selected verb’s range) after a move. Movement preview is Option A’s on-tile
**Move here** chip, not a dropdown. Hover/press on a target fills an on-board
forecast. Go commits. Go never changes location.

#### Special slot (no Ability dropdown)

`ownedAbilities()` lists every catalog ability the active unit owns except
`ability:basic_attack`, sorted by ID (`src/ui/battleActions.ts`). Production
content gives each hero **exactly one** special:

| Unit | Non-basic abilities |
| --- | --- |
| Fighter | Guarded Strike |
| Ranger | High Shot |
| Mage | Magic Missile |
| Goblin grunt | none |
| Goblin archer | Shortbow Shot (its ordinary attack, not a hero signature) |

The validator already allows extra well-formed IDs (#162). Test fixtures clone
each hero’s signature as `ability:zz_{hero}` (range 1–5). There is **no
cooldown, charge, or level-gate field**. Availability is:

- **Owned** — catalog `owners`
- **Shared action budget** — `hasActed` greys every special (`alreadyActed`)
- **Phase** — enemy / presenting / ended locks the bar
- **Per-target preview** — `outOfRange`, `blockedLos`, `sameSide`, …

The slot shows the **last-used** special, or the first owned special on a new
actor. Main tap selects that special (same as Attack). **If the unit owns only
one special, there is no chevron, long-press, or picker.** If it owns two or
more, a 44px **▾** (or long-press on the slot) opens a compact picker above the
slot. Rows are ≥44px. Unavailable rows stay visible and greyed with the
authoritative reason (today: Action spent, Enemy turn, No target in range, …
never invented cooldown numbers). Choosing a row selects it and closes the
picker. Keyboard: **`S`** cycles owned specials (wraps; Shift+S previous). That
cycle does not need the picker.

| Action | Today | B |
| --- | ---: | ---: |
| Move | 3 | **1–2** (tile + path chip; Go) |
| Basic attack | 4 | **1–2** (0 verb taps when Attack is the smart default) |
| Shown / last-used special | 4 | **2** (tap slot, target+Go) |
| A different special | 5* | **3** (▾, pick, target+Go) — **+1** vs the shown special |
| Wait | 1 | **1** |

\*Today: open Ability `<select>`, pick, tap Signature, target, Review, Confirm.

**Removes / merges:** rail/dock, Ability dropdown, target dropdown, Review,
Confirm modal, heading, caption, inspect as a primary control, duplicate
preview copy. The chevron is not a second selector when there is nothing to
select.

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

**Owner picked Option B**, with A’s on-tile path chip and the split special slot
above. Implement that. Do not restore the Ability `<select>`.

- Default special stays 2 steps; another owned special is one extra tap on ▾
  then the row (the pick also selects, so it replaces the slot tap).
- Production heroes hide ▾. Multi-ability catalogs (#162 fixtures, later
  class skills) get the picker without a new dropdown.
- `S` cycles specials for keyboard (Shift+S previous). Enter still confirms via Go.
- Greyed picker rows use real rejection copy, not placeholder cooldowns.

Spec note: `openspec/specs/battle-controls/spec.md` currently requires Review
then Confirm. Adopting B is a **spec change** from two confirms to one, not a
CSS restyle of the rail.

## Files

| File | Role |
| --- | --- |
| `index.html` | Comparison, links |
| `current.html` | Shipped HUD recreation |
| `option-a.html` | Board + wheel |
| `option-b.html` | Action bar + Go. `?state=move` (default), `picker`, `single` |
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
- `previews/option-b-desktop.png` / `previews/option-b-mobile.png` (move chip + ▾)
- `previews/option-b-picker-desktop.png` / `previews/option-b-picker-mobile.png`
- `previews/option-c-desktop.png` / `previews/option-c-mobile.png`

Live app (Vite, this checkout, Mage first in initiative):

- `previews/live-desktop.png` (1440×900)
- `previews/live-mobile.png` (390×844)

Regenerate mockup PNGs: `CHROME=/usr/bin/google-chrome node mockups/combat-ui/capture.mjs`
