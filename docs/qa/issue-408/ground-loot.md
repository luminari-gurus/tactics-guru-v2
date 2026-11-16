# Issue #408 increment 2: manual ground loot

## Scope and source

Verified on 2026-11-14 on the ground-loot working tree above encounter-entry
commit `27a8661e`. At execution, HEAD was
`5c4764a84afbdb10d82c3c0f1522f86f4e1ef076` with the remaining domain, save,
feedback and browser changes uncommitted. This report does not identify that
working tree as a published commit.

New origin-bearing victories create one deterministic item on the encounter
contact cell and return to exploration. Pickup is a real accepted step; capacity
can leave part or all of a shared pile behind. Previously saved battles without
an encounter entry retain their saved reward choice. Automatic collection and
its preference are a later increment, so every journey recorded here collects
manually.

## Browser results

The final matrix contains **22 passing scenario/profile outcomes**: 15 new
manual-loot outcomes, three complete saved first-floor journeys, and four
existing legacy-reward consumers on portrait. The four mobile capacity cases
were also repeated successfully to improve the screenshots; these repeats are
not additional distinct coverage.

| Scenario | Desktop WebKit | iPhone portrait | iPhone landscape |
| --- | --- | --- | --- |
| Legal finishing command creates one contact-cell reward; explicit pickup, refused save, recovery and reload | Passed | Passed | Passed |
| Partial capacity collects one shared-cell item and retains the next; confirmed discard retries without an enemy tick | Passed | Passed | Passed |
| Full capacity retains both shared-cell items; successive confirmed discards collect in order without enemy ticks | Passed | Passed | Passed |
| Enemy occupying a pile starts combat at the origin; both rewards remain through active-battle resume | Passed | Passed | Passed |
| Final victory unlocks descent without pickup; an uncollected reward survives descent, ascent, reload and later pickup | Passed | Passed | Passed |
| New Game seed 28: all three first-floor battles, manual pickups/preparation, descent, ascent, carry and records | Passed | Passed | Passed |
| Legacy legal reward/guardian boundaries, travel reload, backtracking and isolated saves | — | Passed | — |
| Legacy decline preserves ownership and permits the next encounter; both resized layouts remain visible | — | Passed after layout correction | — |
| Legacy full inventory, confirmed discard and pending reward remain consistent through reload | — | Passed | — |
| Second encounter reuses the battle engine after a legal legacy victory without reload | — | Passed | — |

The first new-case invocation passed **15/15 in 65.5 seconds**. The saved
journeys passed **3/3 in 291.4 seconds**. Mobile capacity screenshot recaptures
passed **4/4 in 10.3 seconds**. Legacy follow-up first returned **3 passed /
1 failed**; the failure and subsequent correction are described below.

Execution used WebKit 27.2 / Playwright 1.64.1 (revision 2370), Node 24.22.1,
Linux x86_64, ordinary production preview at `/`, one worker and zero retries.
Profiles were Desktop Safari, iPhone 13 portrait, and iPhone 13 landscape at
844 × 390. These are browser/device-emulation results. The extracted WebKit
libraries were supplied with `LD_LIBRARY_PATH`; Playwright's `ldconfig`-based
host check was skipped because it cannot see that library directory. The real
browser launched and completed every reported execution.

The bounded invocations used `playwright.exploration.config.ts`:

```sh
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'ground loot:'
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'saved menu dungeon keeps proof tools hidden across legal encounters'
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'ground loot: (partial|full) capacity' \
  --project=portrait-webkit --project=landscape-webkit
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'legal reward and guardian boundaries, travel reload, backtracking and isolated saves|declining a dungeon reward preserves inventory and allows the next encounter|confirmed charm discard frees full capacity without cancelling or duplicating the pending reward|a second dungeon encounter reuses the engine after a legal victory without reloading' \
  --project=portrait-webkit
```

## Observed reward usefulness

The compact [manual journey evidence](ground-loot-manual-journeys.json) retains
each encounter's contact, exact generated item, party before battle, party after
battle and preparation, ownership, and final depleted piles. These fields matched
on all three profiles after normalizing only the run UUID; each original report's
SHA-256 is retained. Full map snapshots and elapsed-time fields are omitted.

For seed 28, the first reward was an **Aiming Charm**, explicitly equipped to the
Fighter through preparation. The second was a **Warding Charm**, explicitly
equipped to the Ranger. The third was one **Healing Draught**, retained in the
inventory. Pickup did not equip items or heal heroes. In this journey the
post-battle and post-preparation HP arrays matched at every victory; the HP
increase on the second victory was the existing level-up transition. The Mage
finished the third battle defeated, and the retained draught did not revive the
Mage. The party and ownership carried unchanged through descent and ascent.

This is a concrete useful-reward sample, not a balance conclusion. The existing
Fighter seed 50 policy now loses at the first battle on floor two, after four
battles, at level two without Taunt. That changed outcome is preserved in a unit
case and the [bounded Fighter witness search](ground-loot-fighter-witnesses.json).
The search retained outcomes from seed 28 and seeds 50 through 64; seed 64
supplies the prior six-battle terminal witness with both Second Wind and Taunt.
The new one-item reward policy and the real exploration steps required for
pickup both changed the journey. No reward weighting, enemy strength or healing
rules were adjusted to recover the old seed's result.

## Interaction and visual checks

Desktop input uses real keyboard movement and pointer activation; mobile cases
use actual map/compass taps. The final pickup state is checked after persistence,
including a refused primary write and explicit recovery. The live-region witness
keeps an element handle across pickup and proves that the same connected status
node receives the pickup text with `aria-live="polite"` and
`aria-atomic="true"`. This is DOM evidence, not a claim that a screen reader was
heard announcing it.

Screenshot review found the gold loot diamond distinct from the cyan party
marker, readable item names and remaining quantities, and no loot-content
clipping. Initial mobile capacity images had scrolled past the occupied player
cell; the four recaptures scroll that cell into view. Portrait now shows the gold
corner marker and named remaining contents together. Landscape shows the marker
and capacity feedback, with the earlier scrolled images covering the named
contents below it. Screenshots remain execution artifacts rather than repository
binary additions.

## Fixture boundaries and preserved failures

The five new focused scenarios do not pretend to earn every setup through the
browser. Victory-boundary fixtures use the real domain entry and legal combat
commands, then the browser enacts the final command. Shared-cell/capacity cases
use structurally valid saved states to isolate pile order, capacity and occupied
contact behavior. The three seed-28 saved journeys separately start through
New Game and enact every exploration, battle, preparation and stair command.
The final-loot revisit case explicitly avoids the pile on its way to unlocked
stairs and later returns for it.

The initial legacy decline failure exposed an actual regression from the new
migration explanation: the reward region was only 88.2% visible at 740 × 360.
A shorter paragraph still produced 96.5% visibility; both failed reports were
preserved. Removing that unnecessary explanation restored the panel's original
height while retaining the `Saved reward choice` heading and existing 44-pixel
controls. The original full-viewport assertion is unchanged. No layout CSS was
added for this correction. The final focused rerun passed **1/1 in 7.4 seconds**
and captured both 393 × 852 and 740 × 360 layouts.

The prior increment's unrelated Mage whole-snapshot reload assertion remains a
known baseline issue: normal clock checkpointing adds a `since-upgrade`
statistics object to an untracked fixture. Its exact-base reproduction at
`75f3bf7a6494f881f956b972f78dcf706cdc9e96` is recorded in
[the encounter-entry report](encounter-entry.md). This increment did not rerun
or alter that assertion. Local Chromium remains unavailable because its
process-singleton socket is refused with `Operation not permitted`; no local
Chromium pass is claimed.

## Build qualification and scope limits

The complete fast unit suite passed **1,397 tests**. Both TypeScript scopes,
content validation and the production build passed. Root/prefix build
integration passed **2/2** before the legacy paragraph removal; the final
production build passed again after that legacy-only text correction.

The first 15 new-case run predates only the restored preparation success
prefix and removal of the legacy migration explanation in application source.
Those changes do not alter ground-loot creation, pickup, capacity or persistence.
The complete journeys and legacy follow-up used the restored success prefix;
the final legacy layout check used the paragraph-free build. Source receipts
preserve the tested file hashes. The final build's `dist/index.html` SHA-256 is
`f180c63404683c1266ca077b9af2b00ff303687e877177f32ce8942a3049333e`.

Extended Fighter/Ranger/Mage browser helpers now perform explicit pickup before
preparation and share the bounded legal traversal policy. Their pure witnesses
pass; the long extended browser suites were not repeated in this increment.
Standalone battles and short runs retain their existing reward/session paths.
This increment leaves automatic collection and preference verification to the
next PR and does not close #408.
