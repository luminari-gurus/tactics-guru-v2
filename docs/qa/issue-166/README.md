# Goblin Shaman qualification (#166)

Updated 2026-10-29 (Asia/Jerusalem). Implementation and qualification are complete
on combined main/Shaman source **f4616ae301da4be133455334d4c2b38e3583c8f7**. All five issue criteria below are
proven. Final PR publication is tracked in the [live plan](../../ongoing-projects/plan.md)
and [OpenSpec tasks](../../../openspec/changes/issue-166-goblin-shaman/tasks.md).

[PR #251](https://github.com/luminari-gurus/tactics-guru-v2/pull/251) supplies the
source-pinned foundation; dependent [PR #252](https://github.com/luminari-gurus/tactics-guru-v2/pull/252)
supplies support runtime, placement, feedback and continuation. No merge,
deployment or physical-device testing is claimed.

## Current acceptance

1. Validated stats/assets/abilities and placement: exact closed profiles, pinned
   art and every encounter/survivor/fallback pass. Dungeon Forest Ruins alone uses
   `forest_ruins_shaman_v1`; canonical standalone/authored-run/desert rosters and
   map/selection RNG remain unchanged.
2. Exact Will-save/Weakened and feedback: twenty-face enumeration, equality,
   extremes, no automatic natural 1/20, Guard/Mark composition, refresh, saved-cast
   preservation, immunity and defeat/turn expiry are tested. Inspection shows DC
   12 and Fighter/Ranger/Mage 50%/45%/55% save chances. Shaman seed 31 records a
   failed natural 5 and successful natural 13 against Ranger Will 0. One source
   applies -2 accuracy once.
3. Healing eligibility/cap/atomic rejection: tests cover injured living allied
   grunt/archer/Shaman, wrong side, dead/missing/full/self/range/LOS, missing HP
   1/4/7 and exhausted RNG. Production has two useful heals with no die/use pool;
   hero-entry HP and Second Wind admission stay bounded.
4. Useful stable AI: 45 cases pass utility, deterministic ties/permutations,
   repeated planning, no preview RNG, Taunt, Pin/Snare and support approach/Wait.
   An injured ally opposite attack goals proves the repaired approach branch.
5. Complete continuation and negatives: rejected malformed/source/immunity/range/
   LOS/action/target cases are atomic; old bytes stay recoverable. All six
   Chromium/WebKit journeys have byte-identical **54-command** histories, two heals,
   Hex, active Weakened reload/expiry, victory and independent exact actual
   command/event/state/RNG replay.

Current state/rules/run/dungeon versions are **5/6/7/9**. Main **b343ab0**
(#246/#155) introduced moving encounters and independently allocated dungeon 8.
The combined change resolves all seven conflicts and writes 9, retaining current-
format legacy exploration behavior and exact incompatible format-7/8 recovery.
The literal-main format-8 fixture is source-pinned in tests/fixtures/saves/issue-166/.

## Combined-source qualification

[Current manifest](full-run/integration/manifest.json) and the
[19-family reconciliation](full-run/qualification.json) bind every required family
to fresh affected checks or explicit unchanged-input reuse. This is a qualified
combination of evidence, **not a clean new full-suite run**. Original failures,
skips and incomplete attempts remain unchanged below.

- **1,069/1,069 units**, both TypeScript scopes, **2/2** real root/prefix header
  integrations, production builds and **18/18** performance samples passed.
- **360 passing current-source browser executions**: Chromium dungeon 105, map
  69, restart/backup 9; WebKit dungeon 105, restart/backup 6; owning dev map 6;
  root/prefix preview/dev asset boot/cold-warm checks 60. Six expected preview map
  skips are covered by the six owning development executions. Zero unexpected,
  flaky or retry results. All jobs were serial with one worker.
- All four complete Shaman/Fighter/Ranger/Mage production witnesses pass on each
  engine's desktop/portrait/landscape profiles. Seeds are **31/28/2/12**. Fighter
  retains six battles, level three, healing/Taunt and depth-2/slot-2 terminal defeat;
  Ranger retains five battles, Mark/Pin, level three and defeat. Actual commands,
  events, saved status, party/progression and terminal states replay exactly.
- All six Shaman raw files have SHA-256
  **e2c0cc8be5e8bfb307cc4e476d436ae4a01fdaca04dc448df7a3adf64fca5456**;
  [compressed records](full-run/integration/shaman-journeys.json.gz) retain every
  54-command history, both save outcomes, two heals, reload/expiry and victory.
- Root/restored inventory: **9f7ee2225f09d687a0b2c90daa12df4370417b79c5abba693ace3222b50b16d1**.
  Prefix inventory: **86f20f9cf35f9e4b5f878b9964cb19a99c7fbd28822b28f55a1134bda5c57f40**.
  Root restoration is byte-identical. Input hash:
  **4946258a18330a0ef7cd1709bbc31971f19f8be5b1408858af70f78686d6f575**; all inputs stayed unchanged throughout the checks.

Linux Node **24.15.0**, npm **12.0.2**, Playwright **1.63.0**;
Chromium **153.0.8010.12**, WebKit **26.6**.
This is browser/device emulation. Final serial version probes and source/build
inventories are retained with the reports. Git input comparison shows no committed
application/test/config/dependency difference after the qualified source; native
working files differ only by checkout newlines. The 14 inputs changed since the
prior repair are inherited movement/entry/focus consumers plus dungeon format 9.
Shared Shaman rules/content/AI/presentation, tooling, loading and telemetry inputs
retain their earlier qualified evidence with the ledger's explicit reach mapping.

Portable archives include expanded units/metadata, stage commands/reports/logs,
per-case traces and samples, all 604 current raw-artifact hashes, reproduction
recipes and source parity. Full raw trees remain in the Linux checkout under
tmp/issue166/integration-{browsers,dev-map,assets}/. Fresh
[foundation-main receipts](full-run/foundation-main/manifest.json) independently
retain 1,032 passing units, both type scopes, headers and root bundle for #251.

Reviewed current [Chromium portrait](full-run/integration/chromium-portrait-inspection.png),
[WebKit board](full-run/integration/webkit-desktop-board.png),
[portrait inspection](full-run/integration/webkit-portrait-inspection.png),
[landscape Weakened](full-run/integration/webkit-landscape-weakened.png) and
[save log](full-run/integration/webkit-portrait-save-log.png): art, source/expiry,
save math/ranges and heal rules are legible, with existing modal scrolling.

## Retained full attempt and repair evidence

Original source **4e765f89bf84ae2651f6a571f8b8370c4dd35d36** executed all **19
stages: 17 passed, two failed**. Browser counts: **1,286 passed / nine failed /
nine expected mode skips**, zero flaky/retry cases. Passing coverage includes
1,048 units, both type scopes, two build integrations, fixtures 87, dev placement,
WebKit acceptance 54, health bars 25, configured telemetry 36 per mode, all four
asset modes and 18 performance samples. This remains a **failed original full
run**, never a clean full-suite result.

[Original manifest](full-run/aggregate/manifest.json) indexes compressed reports/
logs, per-case JSON/error contexts, 1,407 raw-artifact hashes and source/build
inventories. Raw tree:
`/tmp/tactics-issue-166-20261029/tmp/verification/full-2026-10-28T22-38-13.070Z-3061420/`.
Root/restored hash:
`ace84f9570c810d914d61abbc15861e2218f951ac5afd389334a2baf8bb26ba5`.

All nine findings have bounded follow-up:

- Six Fighter failures: old seed 190 loses before Taunt. Replacement **17** keeps
  six battles, healing/Taunt, level three, defeat at depth 2/slot 2 and exact replay.
  All six fresh profiles pass. Earlier Ranger/guardian unit-witness failures remain
  retained; seeds **1/4** preserve those original assertions.
- Two mobile backup-Continue failures: the test read `data-session` after exactly
  32 mocked milliseconds while still Loading. It now waits for restored-session
  publication, advancing one frame only while absent. Exact continuation,
  visibility, one canvas and later defeat assertions remain; all five owning
  profiles pass. No application recovery behavior changed.
- Landscape WebKit cold startup **3,844 ms > 2,500 ms** remains recorded. Three
  literal-base repeats measured **1,058/1,066/1,088 ms** (924,857 bytes); three
  final-build repeats measured **1,061/1,155/1,169 ms** (926,177 bytes). No retry or
  budget change; cause is not established. The first anchored selector found no
  tests and is retained separately as an incomplete attempt.

A stronger fixture also exposed a real support-approach defect: rich MapCells
were passed as exact UnitState positions, invalidating hypothetical previews.
The one-line repair projects `{x,y}` and keeps the reader strict. Original failing
proof and passing 59-case AI/dungeon repair are retained. Complete old/new packets
match for Ranger 1, Mage 17, Shaman 3, guardian 4, healed Fighter and selected
victory boundaries, including commands/events/states/RNG/party/progression/replay.
At that repair checkpoint, only the guarded support branch and five test inputs
changed after the aggregate;
loader/URL/cache/nonce/configuration/image bytes did not.

## Pre-integration repair checkpoint (retained)

[Repair manifest](full-run/repair/manifest.json): source **28cba2a**, input hash
`51d3e7476a95e97d8fef65b03ea0fa1fc1f38d6aece503ae5ec53c71d532add7`;
Linux Node 24.15.0/npm 12.0.2, Playwright 1.63.0, Chromium **153.0.8010.12**,
WebKit **26.6**. Serial jobs, one worker, zero retries. Fresh results:

- **1,049/1,049 units**, both type scopes, **2/2** build integrations, root/prefix
  builds and **18/18** performance samples.
- **17/17** Shaman/Fighter/backup executions, **3/3** final cold repeats and
  **60/60** root/prefix preview/dev asset executions: **80 fresh passing browser
  executions**. Three base diagnostic repeats are separate.
- Byte-identical root restoration:
  `6b54b1d6a8786a4557ded45a6b2ce2e23ff3d6c1c84392349ea14228cd720598`.
  Prefix: `958698f51cd0788c943f62818191d0c2fa21e8fdd69f09f06dbd73deb19fb99c`.

Portable archives retain prerequisites/expanded unit metadata, browser reports/
logs, per-case traces, cold samples, consumer equality, repair patch/probe recipe
and artifact inventories. Final native/Linux inputs differ only by checkout
newlines. The [prior raw Chromium report](../issue-165/full-run/chromium.json.gz)
supplies literal-base-equivalent passing Fighter/backup evidence: relevant inputs
are identical between qualified `4f8c194` and base `7cea1e9`. This does not make the
new failures pre-existing.

Reviewed fresh [Chromium portrait](full-run/repair/chromium-portrait-inspection.png),
[WebKit desktop](full-run/repair/webkit-desktop-inspection.png),
[portrait](full-run/repair/webkit-portrait-inspection.png) and
[landscape Weakened](full-run/repair/webkit-landscape-weakened.png): save ranges,
percentages, source/expiry and healing text are legible; existing modal scrolling
retains detail access. All six actual histories are retained in
[compressed journey evidence](full-run/repair/shaman-journeys.json.gz).

## Source and foundation history

Legacy revision **e9433f6b608ae6b2d95418615cce9cf17dadcf74**; registry:
[assets.ts](../../../src/content/assets.ts). Exact original Git blobs:

- Sprite `art/units/goblin_shaman.png`: 64x80 RGBA, alpha bounds (4,13)-(60,80),
  anchor (32,76), 7,817 bytes, SHA-256
  `43d287a0d5e801bb4fdcfe007e94aae424472ccdb01619eb02d35906753a9d3f`.
- Source portrait `art/portraits/goblin_shaman_portrait.png`: 1254x1254 RGB,
  3,245,364 bytes, SHA-256
  `55cc13df61bab3b51581a5be52c42c21a7c5b376607ef92dbd6b3f8901efbbe2`.
- Full-frame 96px Lanczos RGB PNG (Pillow 10.2.0): 20,391 bytes, SHA-256
  `c81d18f2d869258283e8c2d969a9c179fe6aaa9d14f4408b1af61f3486e4b5e0`.
  No generation/crop/repaint. Eager delta **28,208 bytes/two requests**; source
  portrait is packaged but not loaded. Registry rights uncertainty stays explicit.

Foundation passed 199 focused content tests, 28 combat/turn tests, 222 content
validation tests, both type scopes, two build integrations and 27 loading/board/
cold-warm browser cases. Windows Chrome 155.0.8059.41 followed packaged Chromium
launch failure. Original launch/snapshot/fixture/setup failures remain in
`foundation/`; [source inventory](foundation/inputs.json) and
[browser report](foundation/browser.json) are retained. This was focused proof.

`iteration/` retains the first 1,045/1,047 unit run and a Magic Missile shorthand
oracle mismatch. Only the comparison oracle canonicalizes equivalent target
syntax; actual HUD commands/events remain independently replayed. Strict OpenSpec
validation passes. Archive/sync follows review when requested.
