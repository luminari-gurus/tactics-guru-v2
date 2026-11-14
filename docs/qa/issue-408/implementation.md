# Issue #408: implementation and verification map

## Increment boundaries

The feature is delivered as three reviewable increments. [PR #409](https://github.com/luminari-gurus/tactics-guru-v2/pull/409)
establishes saved encounter origin/contact semantics. [PR #410](https://github.com/luminari-gurus/tactics-guru-v2/pull/410)
adds persistent ground loot, manual pickup and map presentation. The final
increment adds the independent default-on preference and the cancelable single
post-victory step. Merge in that order, retargeting each later stacked PR to
`main` after its predecessor lands.

New dungeon encounters start before movement. Every eligible victory creates
one independently seeded item of quantity one at the actual contact cell.
XP, cleared encounters and stairs are independent of collection. Manual and
automatic collection use the same accepted movement reducer and the same
save/readback boundary. No shared standalone or short-run reward code changes.

## Acceptance coverage

| Contract | Implementation and evidence |
| --- | --- |
| Preserve origin/contact, including wandering enemies; no premature visit or exploration tick | Format 18 entry contract, domain/storage rejection tests and three-layout active-resume witnesses in [encounter-entry.md](encounter-entry.md) |
| Generate one seeded item once; clear/award XP independently; no loot on defeat | Ground-loot domain tests, format 19 identity/provenance validation and real terminal-command browser cases in [ground-loot.md](ground-loot.md) |
| Manual pickup, full/partial capacity, same-cell records, occupied piles and inventory-triggered retry | Shared pickup reducer, atomic preparation session tests and five focused cases on all three WebKit profiles; inventory retry does not update enemies |
| Save before/after collection, uncertain writes, repeated callbacks and floor revisits | Domain/storage/session cases, refusal/recovery browser witness, final-victory descent without pickup and later floor return |
| Accessible visible loot, including beneath the party | Named map descriptions, independent corner marker, full-tile input and connected polite acquisition status; desktop and both mobile screenshot reviews |
| Default-on Settings, persisted Off/On, no retroactive collection | Independent preference key and accessible checkbox; [18 boundary executions](automatic-loot-boundaries.md) include settings, capacity, fresh input, recovery and reload |
| Exactly one ordinary automatic step after active exploration returns | Cancelable generation token and current-state preflight inside the save lock; natural on/off journeys in [automatic-loot-journeys.md](automatic-loot-journeys.md) |
| Cancel stale, blocked, occupied or stair-entering automatic movement | Domain/session cases bind run, floor, revision, origin, target, cleared slot, exact loot and capacity; manual stair collection still precedes travel |
| Cutscene return and session-only mode boundaries | Pinned combined #397/#400 checkout and [compatibility report](compatibility.md), including Skip, bypass, cancellation, standalone replay, short-run terminal/reset and save isolation |
| Repeated encounter UX and reward usefulness | Three-victory saved journeys, matching reward/party/ownership evidence across collection modes, and retained bounded Fighter witness results |

Legacy active battles without an origin and pending two-option offers finish
their existing flow once. Loading never fabricates an origin, rerolls an offer
or replays XP. Unsupported saves keep their existing recovery/export path.
The format 19 writer retains both outstanding and depleted per-floor records;
an automatic-step intent is never persisted or recreated on load.

## Final local gates

- Fast units: **1,417 passed across 83 files**.
- Content validation, both TypeScript scopes and ordinary production build:
  **passed**.
- Root/prefix deployment integration: **2/2 passed**.
- Verification selection/batch tooling: **31/31 passed**, including the exact
  nine-batch partition and extended-profile discovery.
- Automatic boundary browser cases: **18/18 passed** across desktop and
  iPhone portrait/landscape, with synthetic timer holding explicitly identified.
- Natural complete saved first-floor journeys: **4/4 passed** — On in all three
  layouts and explicit Off on desktop. Full returned states match the prior
  three-layout manual evidence after UUID and elapsed-playtime normalization;
  see [automatic-loot-journeys.md](automatic-loot-journeys.md).

The [local gate receipt](implementation-gates.json) preserves commands, log
hashes, the final bundle identity and relevant application-file hashes.

The final ordinary bundle was built after the complete-journey test additions.
Subsequent journey-assertion corrections and QA text do not change application
source or the bundle. Targeted browser evidence is qualified by the reports'
input manifests; this is not a claim that the full broad regression suite ran.
The published PR descriptions identify the exact remote tree and current
self-hosted CI result.

## Preserved failures and limits

The manual increment caught and fixed a real legacy reward-panel overflow.
Both failed paragraph variants remain in its report, followed by the unchanged
viewport assertion passing after the unnecessary paragraph was removed.

The first natural automatic-journey assertion incorrectly assumed the global
movement statistic counted only exploration. Combat also contributes to it.
The corrected assertion compares the captured winning state with the collected
state and requires exactly one added move. The original failure and interrupted
attempts remain in the journey report; no application change was needed.

The combined cutscene run has a separate native-video limitation: this local
WebKit played the four-second MP4 briefly, then stalled without `ended` or an
error. The seven-second watchdog returned to exploration and the automatic
pickup followed once. A diagnostic with only the new victory observer disabled
reproduced the media stall. This does not certify native video completion or
claim an exact-base #397 reproduction; see the preserved failed native-end
assertion and successful lifecycle paths in the compatibility report.

The unrelated Mage XP-0 whole-snapshot assertion still fails on the original
base because a normal playtime checkpoint adds since-upgrade statistics. Its
exact-base reproduction is retained in the first report; this work does not
suppress it. Local Chromium cannot launch because its process-singleton socket
is refused. Chromium evidence comes from the repository's self-hosted PR
workflow; local layout evidence uses actual WebKit with device emulation.

Removing reward choice changes the supplies a fixed journey receives. The
earlier Fighter seed 50 now ends after four battles before Taunt; that result
remains asserted. A bounded search found seed 64 for the six-battle healing,
Taunt and level-three terminal witness. The seed-28 repeated-encounter sample
uses two earned charms and retains its Healing Draught. This checks usefulness
without claiming general balance equivalence. No reward weighting, pity,
automatic healing, extra reward occasion or quantity adjustment is included.
