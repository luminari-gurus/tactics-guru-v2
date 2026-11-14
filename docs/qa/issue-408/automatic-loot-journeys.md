# Issue #408 increment 3: natural automatic and manual journeys

## Final result

On 2026-11-14, all **four requested complete saved first-floor journeys passed**
with one worker, zero retries, and no skipped or flaky outcomes:

| Collection preference | Desktop WebKit | iPhone portrait | iPhone landscape |
| --- | --- | --- | --- |
| On, natural automatic pickup | Passed | Passed | Passed |
| Off, explicit manual pickup | Passed | Prior manual journey and current Off-boundary evidence reused | Prior manual journey and current Off-boundary evidence reused |

The three On cases took **278,421.643 ms** together. The Off desktop case took
**96,760.986 ms**. These four final passes are separate from the initial harness
failures preserved below.

Each case starts through **New Game**, with the existing entropy fixture selecting
playable seed **28**. It enacts all three legal first-floor battles, preparation,
descent to floor two, ascent back to floor one, and the existing saved carry and
Hall of Records checks. No dungeon snapshot, inventory, HP, progression or
victory is injected into these journeys.

The [compact comparison evidence](automatic-loot-journeys.json) retains report
hashes, each source run ID, observed encounter boundaries, movement counts,
enemy movement/RNG, rewards, HP/XP/levels/abilities, ownership, assignments and
the final depleted piles. It omits the large repeated map snapshots.

## What the natural timing witness verifies

Saved cases change **Auto-collect loot** through the actual Settings dialog,
verify the stored `on` or `off` preference, reload, and verify the checkbox again.
The touch profiles use actual taps for Settings and exploration controls.

A passive `MutationObserver` records the actual dungeon snapshot when combat
first settles. It does not change game state, hold callbacks, replace timers or
install a fake clock. For On, the test sends no input after victory until the
normal post-return callback moves the party to the recorded contact and depletes
the new reward. For Off, it waits **500 ms after the map becomes visible**, beyond
the 400 ms automatic window, verifies that the party and pile remain unchanged,
then performs the manual step.

Both modes require the same completed pickup: the party is on the contact cell,
the exact new loot record is depleted, HP and equipment assignments are unchanged
by pickup, and `movesTaken` increases exactly once from the observed winning
boundary. The primary save decodes successfully and matches the accepted state,
normalizing only elapsed `activeMs` for that comparison.

Combat also contributes to `movesTaken`, so the winning boundary is the correct
reference for a post-victory move. The evidence retains all three counts:

| Victory order | Origin → contact | Moves at battle entry | Moves at victory | Moves after pickup | Enemy step before → after pickup |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | 108 → 128 | 1 | 12 | 13 | 1 → 2 |
| 2 | 148 → 168 | 14 | 22 | 23 | 3 → 4 |
| 3 | 188 → 208 | 24 | 37 | 38 | 5 → 5 |

The final floor has no remaining enemies. Its ordinary movement reducer therefore
leaves the enemy step unchanged, while the accepted party move still increments
`movesTaken`. The first two pickups each advance the enemy movement step once.

## Exact comparison with manual collection

All per-encounter fields match across the three new On profiles and the new Off
desktop journey after replacing only the run UUID. Contact, generated reward,
party before battle, party after battle and preparation, ownership and assignments
also match the [previous increment's manual evidence](ground-loot-manual-journeys.json).

The comparison additionally checks the **complete returned dungeon state** from
all four new reports and all three original manual reports. After replacing the
run UUID and setting only `stats.activeMs` to zero, all seven states match exactly.
Map state, RNG, position, revision, movement counts, HP, XP, learned abilities,
ownership, assignments and loot are not normalized. The shared normalized state
SHA-256 is:

```text
7729b4704a96819d3f8e4255ded3567a79570b7692bac9aaf4555e718f94b055
```

Both modes produce the same concrete reward sequence: **Aiming Charm**, explicitly
equipped to Fighter during preparation; **Warding Charm**, explicitly equipped to
Ranger; then one **Healing Draught**, retained. Pickup does not equip or heal. The
second victory's existing level-up transition changes HP; the third victory leaves
Mage defeated, and the retained draught does not revive Mage. Descent and ascent
preserve that party and ownership. On returning to floor one, the recorded totals
are **57 moves and 9 enemy kills**.

This establishes equivalence for the deterministic seed-28 first-floor policy.
It is not a general balance result or an assertion that automatic preflight has
the same behavior as manual input when capacity, an occupied tile or stairs
prevent automatic movement.

## Reused evidence and scope

The [manual-loot report](ground-loot.md) supplies complete saved manual journeys
on all three profiles, including the two mobile profiles not repeated here.
The [automatic-boundary report](automatic-loot-boundaries.md) supplies current
Settings Off/On, cancellation, capacity, save/reload and stale-callback checks on
all three profiles. Its controlled callback fixtures complement these four
natural complete journeys; their timing claims remain separate.

The five focused manual-loot tests now explicitly store Off in their boundary
loader. The extended Fighter/Ranger/Mage browser seed helper also explicitly
stores Off to retain its intentional manual preparation policy. The testing-route
complete-floor title explicitly stores Off while preserving its saved-game
storage guards. Those long extended and testing-route browser cases were not
rerun in this final four-case selection.

These are WebKit/device-emulation results, not physical-device results. No local
Chromium pass is claimed. Combined #397/#400 compatibility results, including
their retained native-media limitation, are recorded separately.

## Preserved initial failures

The first CLI selection used an over-anchored title expression and discovered
**zero tests**. Its log was retained before the selection was corrected.

The first executable On invocation then recorded **two assertion failures**, on
desktop and portrait, because the new test incorrectly expected the victory's
move count to equal the battle-entry count. The first battle entered with one
move and completed with twelve, including eleven accepted combat moves. Contact,
depleted loot, enemy step, unchanged party and assignments had already passed.
The redundant landscape attempt was **interrupted**, not reported as a pass or a
third assertion failure.

The test was corrected to require `collected.movesTaken === won.movesTaken + 1`.
No application change or combat-account reconstruction was needed. Both TypeScript
scopes passed again, then the final On selection passed 3/3 and the final Off
selection passed 1/1. Original failure logs and error contexts remain retained;
the JSON records diagnostic log hashes. No source or build input changed during
the final four executions.

## Source, build and execution

The final runs used the working tree above
`1b50b4e0459a341153f370512579631f78d09acd`, with changes to the three browser files
`tests/dungeon.spec.ts`, `tests/dungeon-exploration.spec.ts` and
`tests/dungeon-extended.spec.ts` still uncommitted. The receipt hashes **348**
application, test, helper, script, config, dependency and built inputs; every hash
still matched after the final runs. The JSON records the exact browser-test hash
and receipt hash. This is not a claim that HEAD alone contains the tested edits.

The production build and both TypeScript scopes passed before browser execution,
as did the complete fast unit suite (**1,417 tests in 83 files**) and root/prefix
build integration (**2/2**). The only subsequent source correction was the test's
movement assertion; its final TypeScript check also passed. The application and
served bundle remained unchanged. The tested `dist/index.html` SHA-256 is:

```text
c6ae815ca39fd00e6b8c4449ecbcde272cd502ed3889aebd6f56a353618f3a78
```

Execution used Node 24.22.1, Playwright 1.64.1, WebKit 27.2 revision 2370,
Linux x86_64, and the production preview at `/` on port 4173. Extracted WebKit
libraries were supplied through `LD_LIBRARY_PATH`; the host cache check that
cannot see that directory was disabled. Actual browser execution was serialized
with the other verification jobs.

Equivalent selections are:

```sh
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'saved menu dungeon auto-collects loot across a complete first floor' \
  --max-failures=1 --reporter=line,json
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'saved menu dungeon keeps proof tools hidden across legal encounters' \
  --project=desktop-webkit --max-failures=1 --reporter=line,json
```
