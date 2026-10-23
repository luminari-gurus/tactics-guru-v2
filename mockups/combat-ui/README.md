# Combat UI mockups

Static HTML/CSS sketches only. No game code, build step, or simulation.
Open [`index.html`](index.html) from this folder (file URL or any static server).

These pages explore a **lower-step** combat HUD for desktop (1440×900) and
portrait phone (~390×844). The owner asked for the fewest taps and for redundant
chrome to go. The live HUD this replaces is the #108 / #111 rail/dock.

**Current direction:** Option B on desktop, Option C on mobile, one shared
action/target model. Developed pages are [`desktop-b-final.html`](desktop-b-final.html)
and [`mobile-c-final.html`](mobile-c-final.html). Every earlier sketch stays in
this folder for comparison.

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

The chevron mockup stays in the gallery for comparison. The three pages
below keep Option B’s bar, Go, path chip, and “no Ability dropdown” rule, and
replace ▾ / long-press with a different choice mechanic.

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

## Option B special-selection alternatives

All three assume the same Fighter fixture as the chevron picker: Guarded Strike
(last-used, melee), Extended Strike (range 1–5, legal on the grunt), Far Shot
(no legal preview). Production heroes still own one special.

Counts keep B’s convention: **target + Go** is the second step. Default
special stays **2**. Switching adds **at most 1**, except Segment, where every
owned special is a first-class verb so another special costs the same as the
default.

### Target-first (recommended)

Tap an enemy or tile first. The bar replaces the special slot with **inline
buttons for specials that currently preview as legal on that target**.
Last-used valid special is already pressed. Far Shot is omitted, not greyed.
Move / Attack / Wait and Go stay put. Choosing a special is part of targeting.

| Path | Steps |
| --- | ---: |
| Default / last-used special | **2** — tap target (Guarded preselected) → Go |
| A different legal special | **3** — tap target → Extended → Go (**+1**, no menu) |
| Single-special unit | **2** — one pressed button, no extra chrome |

Keyboard: **1 / 2 / …** select a listed special (order on the bar). **S**
cycles the valid list (Shift+S previous). Enter = Go. Arrow keys move along
the valid row.

**Pros:** scales when a class has 3–5 specials (only legal ones appear); no
popover; illegal options never compete for a tap; production heroes look like
today’s single slot; pairs with the existing on-board forecast.

**Cons:** ability-second — you do not pick a special in order to paint range
highlights; a special with no current legal target is invisible (must retarget
or tap Attack); the bar changes after the target tap.

### Segmented row

The special slot **expands in place** into a segmented control of every owned
special. Unavailable segments stay visible and greyed with the reason. One
owned special → one button, no segment chrome. No popover.

| Path | Steps |
| --- | ---: |
| Default / last-used special | **2** — tap Guarded (same as Attack) → target + Go |
| A different special | **2** — tap Extended instead; switching is not extra |
| Single-special unit | **2** — collapses to one button |

Keyboard: Left / Right move within the segment. **S** cycles owned specials
(wraps; skips nothing, lands on greyed). Enter = Go.

**Pros:** best discoverability; switching is free vs the default; ability-first
so range highlights can still follow the pressed segment; keyboard maps to a
toolbar.

**Cons:** the bar grows with the catalog (three specials already crowd a 390px
dock); greyed Far Shot reintroduces “why is this here?”; shortened labels
(Guarded / Extended) hide full names on mobile.

### On-board chips

No special slot in the bar. After a target tap, **ability chips with forecast**
appear next to that unit. Last-used legal chip is gold / pressed. Far Shot has
no chip. Tap a chip to select it, then Go. Single-special units get one chip
(the forecast). Move / Attack / Wait remain in the bar.

| Path | Steps |
| --- | ---: |
| Default / last-used special | **2** — tap target (chip preselected) → Go |
| A different legal special | **3** — tap target → other chip → Go (**+1**) |
| Single-special unit | **2** — one chip, no picker |

Keyboard: **1 / 2 / …** select a chip. **S** cycles chips for the current
target. Enter = Go.

**Pros:** specials live where the decision is; matches Option A’s on-tile path
chip; bar stays three verbs + Go; illegal specials stay off-screen.

**Cons:** chips occlude isometric tiles and stack badly on clustered enemies;
ability-second, same as target-first; the bar no longer shows “what special do
I even have?” until a target is chosen; mobile docks the stack to the board
bottom, on top of the forecast zone.

### Swipe-the-slot (not mocked)

A swipe / scroll on the special slot with count dots was considered and
**not** built as a fourth page. `BoardInput` already uses press-and-drag to
pan, so a competing swipe on the dock fights the board. Dots do not name the
next special. Desktop has no natural swipe, so it would still need a click
path — which is the chevron again.

### Comparison

| | Chevron (kept) | Target-first | Segment | Board chips |
| --- | --- | --- | --- | --- |
| Default special | 2 | **2** | **2** | **2** |
| Different special | 3 (+1) | 3 (+1) | **2** | 3 (+1) |
| Single-special | 2, no ▾ | 2, one button | 2, one button | 2, one chip |
| When the list appears | ▾ / long-press | after target tap | always in the bar | after target tap, on the board |
| Illegal specials | greyed rows | omitted | greyed segments | omitted |
| Keyboard | S cycle | 1/2…, S on valid list | ←/→, S on owned | 1/2…, S on chips |
| Affordance if 1 special | none | none | none | one chip (the forecast) |

## Split-platform plan (current recommendation)

Ship **two skins, one ruleset**.

| Platform | Skin | Developed page |
| --- | --- | --- |
| Desktop 1440×900 | Option B — bar + Go + path chip, **target-first specials** | [`desktop-b-final.html`](desktop-b-final.html) |
| Mobile 390×844 | Option C — radial hold, tap fallback, docked End turn | [`mobile-c-final.html`](mobile-c-final.html) |

Segmented specials stay as a **cheap secondary desktop variant**
(`?state=segment`) if the catalog never grows past two or three. Chevron,
board chips, Option A, and the first Option C sketch remain in the gallery.
Do not restore the Ability `<select>`. Adopting this is a **spec change**
from Review-then-Confirm to one confirm
(`openspec/specs/battle-controls/spec.md`).

### Shared action / target model

Both skins write the same session fields. The HUD is a view; legality still
comes from `battleActions` + `targetPreview`.

| Field | Meaning | Desktop B | Mobile C |
| --- | --- | --- | --- |
| `selectedCell` | Board cell under consideration | Click, arrows, hover-then-click | Hold or tap a unit/tile |
| `selectedAction` | `move` · `basic_attack` · ability id | Bar verbs + legal-special buttons | Radial slice / sub-ring chip |
| `preview` | Hit %, damage, rejection copy | On-board forecast + bar subtitles | Hub text updates while a slice is held |
| Confirm | One commit | Gold **Go** / Enter | Release on a slice, or tap a slice |
| Cancel | Clear preview, no commit | Esc | Release in the hub |
| End turn | Wait, no second confirm | Wait button (`W`) — commits immediately | Docked **End turn** — never a slice |

`prepare` then `confirm` is the same call on both. A later “undo last confirm”
is out of scope; cancel only drops an unconfirmed preview.

### Desktop B — developed

States: `start` · `move` · `target` · `spent` · `segment` (secondary).

- **Turn start.** Move is the smart default (same as #145). Go is disabled until
  a tile or enemy is chosen. Specials are a placeholder (“Click an enemy”) —
  they are not a dropdown. Hovering an enemy shows a **ghost forecast**; it
  does not select. Click selects.
- **Move.** Click a reachable tile. Teal path dots + on-tile **Move here** chip
  are the preview. Go / Enter commits. The chip is not a second confirm.
- **Enemy targeted.** Click an enemy. The bar lists **only specials that
  currently preview as legal**. Last-used legal special is preselected.
  Far Shot is omitted. Hovering a special button shows a tooltip (full name,
  range, hotkey). Attack remains a verb (+1 if they want basic instead).
- **Action spent.** Move and action budgets spent. Attack / specials greyed
  with “Action spent”. Wait is pressed. **Wait commits immediately** (1 step,
  same as today). Go stays in the same place and stays disabled.
- **Keyboard.** `M` Move, `A` Attack, `1`–`9` legal specials in bar order,
  `S` cycle (Shift+S previous), `W` Wait, Enter Go, Esc clear, arrows move
  the cell cursor. Keys are drawn on the buttons.
- **Hover.** Enemy hover = ghost forecast (no select). Button hover = tooltip.
  Pressed border is selection; tooltip is naming only.

Segmented (`?state=segment`) keeps every owned special in the bar, greyed in
place. Use it only if the catalog stays tiny and you want switching to cost
the same as Attack. It is not the desktop default.

### Mobile C — developed

States: `idle` · `move` · `enemy` · `specials` · `cancel`.

**Pan vs hold (the known conflict).** `BoardInput` already pans on
press-and-drag. The radial must not steal that.

1. Finger down.
2. If it moves **more than ~10px before 300ms** → this is a **pan**. The
   radial never opens.
3. If it stays still **300ms** on a unit or tile → **radial opens**, light
   haptic, press-ring on the cell. Further movement is slice aiming, not pan.
4. If it lifts **before 300ms** with little movement → **tap fallback**:
   select that cell and open the same radial. A second tap on a slice commits.
   Reduce Motion skips step 3 and always uses tap.

Hold is therefore **not** the sole path. TalkBack / VoiceOver get named slice
buttons (44px labels) after a cell tap. End turn is a persistent 48px control.

**Slices adapt to what was held**

| Held | Default slice | Other slices |
| --- | --- | --- |
| Empty reachable tile | **Move** (path + cost in the hub) | Inspect. Attack / Special disabled (“Need an enemy”) |
| Enemy | **Attack** (forecast in the hub) | Special (expands), Inspect, Move if budget remains |
| Own unit | Inspect | Move if pointing at a reachable standing tile; Special only if it has a self preview |

**Multiple specials.** The Special slice is labeled with the last-used name
and a count (“2 legal · Guarded”). Sliding onto it **expands a sub-ring of
legal specials only**. Last-used is preselected. Far Shot has no chip. Sliding
onto Extended updates the hub forecast; release commits. Tap fallback: tap
Special to expand, tap Guarded to commit last-used.

**Forecast.** While the finger is on a slice (or a sub-ring chip), the hub
shows that slice’s preview. Nothing commits until release (hold) or a second
tap (fallback).

**Cancel.** Release in the **hub**. The hub is not a slice, so the rim cannot
cancel by accident. Same intent as desktop Esc.

**End turn / Wait.** Docked full-width button under the board. Never a radial
slice — Wait is too easy to miss on a rim and too important to hide behind a
hold.

### Step counts

Hold-and-slide is **one** step (one gesture). Tap fallback is one tap per
distinct control.

| Action | Today | Desktop B | Mobile hold | Mobile tap |
| --- | ---: | ---: | ---: | ---: |
| Move | 3 | **2** (tile, Go) | **1** | **2** (tile, Move slice) |
| Basic attack | 4 | **2–3** (2 if no legal special / they clicked Attack first; 3 when last-used special was preselected) | **1** | **2** |
| Default special | 4 | **2** (enemy, Go) | **1** (slide to Special, release) | **2–3** (expand then Guarded) |
| Different special | 5* | **3** (enemy, other, Go) | **1** (slide to Extended) | **2–3** |
| Wait / End turn | 1 | **1** | **1** | **1** |

### Risks

- **Two skins, one ruleset.** Testers must prove both HUDs against the same
  `targetPreview` rejections. A special that is omitted on desktop must also
  be absent from the mobile sub-ring.
- **300ms hold vs impatient taps.** The tap fallback is mandatory; if the
  threshold feels slow, lower it toward 250ms, do not remove tap-to-open.
- **Radial labels vs 44px.** Slice buttons are 44px; the painted wedge behind
  them is larger. Do not ship wedges without the labeled buttons.
- **Sub-ring occlusion.** Two special chips sit off the east rim and will
  cover nearby tiles while aiming. They dismiss on cancel / commit.
- **Desktop basic attack is sometimes +1** vs last-used special, because
  target-first preselects the special. Accept that, or flip the default to
  Attack when the player has not used a special this battle.
- **Spec.** Battle-controls still says Review then Confirm. This plan is one
  confirm. Wait already skips the dialog today — the split makes that the
  rule for every verb except that Wait stays immediate and Go is unused for it.

### Earlier recommendation (superseded)

The previous pass recommended target-first as a replacement for the chevron
**on both platforms**. That still holds for **desktop**. Mobile no longer uses
the B bar; it uses the developed radial instead. Chevron, segmented, and board
chips remain as comparison sketches.

## Files

| File | Role |
| --- | --- |
| `index.html` | Comparison, links |
| `desktop-b-final.html` | Developed desktop B. `?state=start`, `move`, `target`, `spent`, `segment` |
| `mobile-c-final.html` | Developed mobile C. `?state=idle`, `move`, `enemy`, `specials`, `cancel` |
| `current.html` | Shipped HUD recreation |
| `option-a.html` | Board + wheel |
| `option-b.html` | Action bar + Go + chevron picker. `?state=move`, `picker`, `single` |
| `option-b-specials-target.html` | B alternative: target-first valid specials |
| `option-b-specials-segment.html` | B alternative: inline segmented specials |
| `option-b-specials-chips.html` | B alternative: on-board ability chips |
| `option-c.html` | Early radial hold sketch |
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
- `previews/option-b-specials-target-desktop.png` / `previews/option-b-specials-target-mobile.png`
- `previews/option-b-specials-segment-desktop.png` / `previews/option-b-specials-segment-mobile.png`
- `previews/option-b-specials-chips-desktop.png` / `previews/option-b-specials-chips-mobile.png`
- `previews/option-c-desktop.png` / `previews/option-c-mobile.png`
- `previews/desktop-b-final-start.png` · `move` · `target` · `spent` · `segment` (1440×900)
- `previews/mobile-c-final-idle.png` · `move` · `enemy` · `specials` · `cancel` (390×844)

Live app (Vite, this checkout, Mage first in initiative):

- `previews/live-desktop.png` (1440×900)
- `previews/live-mobile.png` (390×844)

Regenerate mockup PNGs: `CHROME=/usr/bin/google-chrome node mockups/combat-ui/capture.mjs`
