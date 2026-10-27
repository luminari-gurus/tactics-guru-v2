# Three-encounter run contract

Current #163 extension: level-2 Fighter Second Wind can increase battle HP above
encounter entry. The active-snapshot reader requires its spent-use flag and bounds
HP by entry HP plus one `4 + projected power` heal, capped at projected max HP.
Completion supplies an exact optional `secondWindUsed: true` fact from that
validated battle to the reducer, which applies the same bound; other heroes and
unspent state retain entry-HP bounds. The fact does not enter party data and cannot
revive a defeated hero. Current equipment modifies accuracy/AC, preserving the
reducer's healing-power equivalence. Battle state 3/rules 4 and run envelope 5
reject prior saves while retaining original bytes for recovery/export.

The #164 Ranger extension adds level-2 Mark Target and level-3 Pinning Shot;
[their shared rules](signature-abilities.md#ranger-progression-164) govern the
active battle. Exact Mark/Pin source references survive active-save continuation
and reset in each new encounter. They never enter carried party data or alter
the run's HP/award rules.

[Issue #75](https://github.com/luminari-gurus/tactics-guru-v2/issues/75), branch `work/issue-75-run-contract`, base `79f7d983ff3a12ca38e93efdc72f3f317dfb789c`. Caller `dubstylee` approved the published OpenSpec implementation plan on 2026-10-13. The executable contract is [run.ts](../src/domain/run.ts), with [fixtures](../tests/unit/run.test.ts) and [plan](../openspec/changes/issue-75-run-contract/proposal.md).

## Reviewed gameplay decisions

The caller approved retaining survivors' remaining HP between encounters; [hero progression](hero-progression.md) now heals living heroes only when a victory award crosses a level. Fighter, Ranger and Mage are the initial party. A hero at zero HP stays defeated and does not participate again during this run. Revival is a future feature, outside this contract. One reward choice follows each of the first two victories; the third victory completes the run without another reward. Wiping the party ends the run immediately.

Both final victory and defeat screens will contain **Start new run**. It resets to encounter 1 with the original full-HP party, empty inventory/equipment, and a fresh externally supplied seed and run identity. No separate restart modal is required. The actual outcome screen is #80 work; this issue provides its pure intent. Healing item definitions, balance, choice count and effects belong to #77; owned effects/commands belong to #78. Revival remains unavailable; level-up healing is explicitly defined by #160.

## State and ownership

`RunDefinition` is a trusted ordered tuple of exactly three distinct encounter IDs. #76 chooses actual IDs and binds them to validated authored maps. This reference contract tests synthetic encounter IDs and does not claim that real encounter content exists. Encounter IDs have prefix `encounter:` and a 1–64 character ASCII letters/digits/underscore/hyphen suffix. A state's encounter tuple must match its trusted definition exactly.

| Field | Contract |
| --- | --- |
| `format` | `RUN_FORMAT_VERSION = 2` |
| `versions` | Exact current battle rules/RNG and computed catalog content identity |
| `id` | Caller-provided unique attempt identity, 1–64 ASCII letters/digits/hyphens |
| `seed` | Integer 0–4294967295 |
| `encounters` | Exactly three distinct known IDs, in trusted definition order |
| `encounterIndex` | Integer 0–2; retained at the completed encounter during reward/outcome |
| `revision` | Integer 0–16, additionally constrained by the phase/index table below |
| `party` | Exactly three validated `{ heroId, hp, xp, level, maxHp, learned }` records in Fighter/Ranger/Mage order; HP integer 0–derived maxHp |
| `phase` | `battle`, `reward`, `victory`, or `defeat` |
| `pendingReward` | Exactly `{ id, seed }` in reward phase; null otherwise |

Readers reject extra keys, symbols, accessors, sparse/extended arrays, duplicate/out-of-order/unknown heroes, unsafe numbers, unknown/future versions and inconsistent phases. Accepted data is copied. Run state does not include initiative, actions, Guarded, positions, animation/preview data or mutable battle RNG. Zero HP encodes defeat without a redundant flag. Current run format intentionally has no inventory fields; their future format requires explicit ownership validation.

At the initial battle entry (index 0, revision 0), every hero must have catalog-max HP. Damaged or defeated initial entry parties are rejected, including when restored from JSON. Later encounter entries retain survivor HP. Current damage during encounter 1 belongs to the separate active battle snapshot, not the run entry party.

The catalog/definition are trusted validated inputs, not arbitrary uploaded objects. `describeRunBattle` and `runBoundaryId` are previews of an already validated RunState. Adapters must call `readRunState` before using saved/unknown data.

## Atomic transition table

| Current boundary | Command/result | Next boundary/revision |
| --- | --- | --- |
| Battle at index i, revision 2i | Victory, i < 2 | Reward at i, revision 2i+1 |
| Reward at i (i < 2) | Matching reward acknowledgment | Battle at i+1, revision 2i+2 |
| Battle at index 2, revision 4 | Victory | Final victory at index 2, revision 5 |
| Battle at index i, revision 2i | Party wipe | Defeat at i, revision 2i+1 |
| Final victory or defeat | Start new run | Fresh identity/seed, battle index 0, revision 0 |

Battle/reward/victory phases require at least one living hero; defeat requires every hero at zero HP. Within one identity progression is acyclic. `completeBattle` requires a complete canonical party result and an outcome consistent with its survivors. HP may decrease or remain equal; completion cannot heal or revive a hero. The later item command layer must implement any reviewed explicit healing atomically, rather than smuggling it into a completion callback.

Every command carries `runId`, expected `revision`, current `encounterId`, and `boundaryId`. The boundary identity is `<runId>:battle:<index>`, `<runId>:reward:<index>`, or `<runId>:outcome:<index>`. `completeBattle` also carries `outcome` and resulting `party`. `acknowledgeReward` carries no additional payload. `startNewRun` carries `newRunId` and `newSeed`, both different from the terminal run's values. A trusted adapter supplies a unique new attempt identity; the reducer rejects reuse of the immediate prior identity, but is not a global identity registry.

Invalid commands return `invalidCommand`; mismatched identities/revisions return `staleBoundary`; an otherwise matching command in the wrong phase returns `wrongPhase`. Invalid saved state returns `invalidRun`. Rejection changes no party data, reward boundary, revision or RNG. Successful transitions return owned state and data events (`rewardPending`, `encounterReady`, `runEnded`, `runStarted`); presentation does not control progression.

The reference completion payload is trusted only after domain/session validation: #80 must obtain it from an accepted terminal BattleSession and match the encounter identity, not accept HP/outcomes supplied by UI. Shape and monotonic HP checks alone are not proof of a legal battle victory.

## Deterministic seeds and preview behavior

Run format 1 uses the existing RNG version 1 sfc32 warmup and these fixed mixing rules:

1. Purpose tag is `0x454e4331` for encounter (`ENC1`) or `0x52574431` for reward (`RWD1`).
2. `mixed = (seed XOR tag XOR uint32((index + 1) * 0x9e3779b9)) >>> 0`.
3. Start fresh `seedRng(mixed)` (12 warmup draws, cursor reset), and use the next uint32 as the derived seed.

Changing these rules requires a run format/version decision, never silently updating saved behavior. No mutable stream is shared between encounter generation, reward generation or battle dice. Purpose separation is stream isolation, not a guarantee against all possible 32-bit seed collisions. Run identity is excluded from seed derivation: same seed/definition/version gives the same encounter/reward seeds, while attempt identities safely distinguish callbacks.

For run seed 123, encounter indices 0/1/2 derive `1167576323 / 1556857405 / 3704156101`; reward indices derive `1746306032 / 2025501471 / 731033742`. The third reward seed is mathematically defined but no third reward is offered. Golden outputs were checked independently with Python uint32 arithmetic and the sfc32 recurrence. Fixtures also independently mix input using BigInt.

The module never obtains entropy; new-run seeds/identities come from an adapter. Repeated descriptor/offer previews and rejected/duplicate commands do not advance RNG. Reward consumers start from the persisted boundary seed, generate the reviewed catalog offer once, and retain its identity. Previewing an existing offer must not regenerate it by drawing from battle RNG.

## Downstream interfaces

`RunBattleDescriptor` contains encounter ID, derived battle seed, boundary ID and copies of living party `{heroId,hp}` only. #76 ensures each supported survivor subset has legal validated spawns. #80 resets initiative, flags, Guarded/statuses and battle counters while carrying approved HP and later derived equipment stats. Current `createBattle` always uses full HP, and replay reconstructs a map/seed start exactly; #80 must adapt both together for carried-party starts. Existing APIs and single-battle replay remain untouched here.

`PendingReward` provides stable identity and independent seed. #77 defines reward catalog, timing, offer count and valid targets/effects. #78 owns the concrete pending offer and owned inventory. `acknowledgeReward` grants no item and is a reference progression step: #78/#80 must validate ownership/target/effect/offer and progression together, produce both next values before committing, and leave both unchanged on failure. Never grant inventory and then independently call a potentially failing progression step. Replayed/reloaded claims must match the same saved offer/boundary identity.

`RunSnapshot` in `src/domain/runSaveEnvelope.ts` replaces the #75 placeholder with `{items: RunItems, activeBattle: BattleState|null}`. #79 owns the bounded run codec, item session and guarded run storage; see [the #79 handoff](qa/issue-79.md) for its context, identities, 32,768-code-unit bound and recovery API. The existing battle-save payload is unchanged. Run persistence must:

- Version and bound the complete envelope and nested owned inventory/equipment/pending offer using the reviewed #77 contract, without serializing scene references, previews or pending presentation.
- Include an accepted active battle snapshot only for battle phase, cross-validating map/encounter, seed, surviving heroes, rules/content/RNG and committed HP. Run party HP represents encounter-entry HP during battle; the accepted active snapshot supplies current battle HP. Completion updates run HP at the terminal boundary.
- Require null active battle at reward/victory/defeat boundaries; retain concrete pending offer only in reward phase, matching run identity/seed and catalog.
- Preserve the exact run identity, revision and pending offer so reload cannot advance/grant twice. Round-trip must preserve next command/dice and derived seeds.
- Use explicit compatibility/version rejection and the existing guarded storage/recovery policy; preserve corrupt/incompatible original bytes and backup. Never widen format-1 battle decoding implicitly or access legacy Godot keys.

No storage adapter or new save format was implemented in #75. #79 now supplies one concrete format for #80 to consume; #80 still owns complete battle progression and carried-party replay. #74/#58 retain persistence acceptance.

## Acceptance mapping

| #75 acceptance | Delivered contract evidence |
| --- | --- |
| Reviewed HP/defeat/reward/wipe/outcome/seed decisions | Decision record above; full-HP, carryover, wipe-at-each-index, terminal reset fixtures |
| Bounded JSON RunState and separate ownership | Strict reader, invalid shape/numeric/identity fixtures, owned round trips and survivor descriptor |
| Acyclic exactly-once sequence | Complete deterministic trace, stale/duplicate/out-of-order rejection, terminal behavior and frozen-input fixtures |
| Reward and save interfaces | Typed boundaries/descriptors and the concrete #79 snapshot handoff above |
| Deterministic fixtures and #59 mapping | Golden seed vectors, identical trace and preview/RNG isolation; matrix below |

| #59 acceptance | Contract contribution and remaining owner |
| --- | --- |
| Three legal encounters, rewards and final victory/defeat/restart through controls | Three-boundary trace here; actual authored maps #76, reward commands #78, controls and full-run integration #79/#80, certification #81 |
| HP and defeated heroes; no leaked battle state | Survivor descriptor and HP fixtures here; fresh battle construction/equipment projection #78/#80 |
| Deterministic transitions, no duplicate callbacks/claims | Seed/identity/revision contract and rejection fixtures here; concrete offer choices #77/#78 and integrated command replay #80/#81 |
| Validated encounter references/spawns and visible content errors | Definition ID matching here; actual content runtime/build validation #76 and visible errors #80 |
| Resume same run/battle/RNG and unclaimed reward | Run JSON round trip and extension requirements here; codec/ownership #79/#80 and persistence certification #74/#81 |
| Physical controls and transfer/frame budgets | No hardware or integrated-run acceptance in #75; #57 readiness remains, #81 certifies full run |
| Full-run unit/browser flows and playtest tuning | Contract fixtures here; actual full-run tests #80/#81 and content tuning #81 |

## Verification

Checks on 2026-10-13:

| Command | Actual result |
| --- | --- |
| `npm run test:unit -- tests/unit/run.test.ts tests/unit/domainBoundary.test.ts` | 62 passed, including 54 run fixtures |
| `npm run test:unit` | 500 passed across 31 files |
| `npm run validate:content` | 77 passed |
| `npm run typecheck` | Both configurations passed |
| `npm run build` | Passed; existing large Phaser chunk warning remains |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` | 336 passed in 15.9 minutes across desktop and emulated Pixel 7 portrait/landscape |
| `openspec validate issue-75-run-contract --strict` | Passed |
| `git diff --check` | Passed |

The initial focused test caught incorrect expected seed vectors in the new fixture; those expectations were corrected against an independent Python calculation, then the focused and full suites passed. Browser regression and contract fixtures are supporting automation, not physical-device or playable-run certification. The caller reported iPhone Chrome/Safari verification in chat; this issue does not change #57/#64/#66 acceptance records. All five #75 contract acceptance criteria are covered above; downstream playable run, inventory and save integration remain with their named owners.

### Initial entry HP validation correction

The reader now rejects damaged or defeated heroes at battle/index 0/revision 0. Six regression cases (damaged and defeated for each initial hero) failed before the fix and passed afterward. Two additional fixtures retain damaged survivors and defeated-hero exclusion at later encounter entries. Rejected reads/transitions preserve frozen input; current first-battle damage remains owned by the separate battle snapshot.

Follow-up validation: focused run/domain-boundary suite 70 passed; full unit suite 508 passed; content checks 77 passed; both TypeScript checks and production build passed; strict validation of this change and all 17 OpenSpec items passed; `git diff --check` passed. The full configured browser suite passed 336 checks in 33.8 minutes using `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/playwright-browsers/chromium-1228/chrome-linux64/chrome npm test`. Browser coverage remains desktop and emulated Pixel 7 portrait/landscape, not physical-device certification.

## Live integration (#80)

`/run` is an additive entry linked from the single-battle panel. It starts with seed 13;
Start new run increments the previous run seed modulo uint32 and supplies a fresh UUID.
`createRunBattle` reconstructs initiative and local state from the projected catalog,
then applies only the canonical living entry HP. `BattleSession.fromRun` records that
fresh carried boundary; `replayRunBattle` reconstructs the same entry before accepting
its initial snapshot/commands. `replayBattle` retains its original full-HP contract.
Restored sessions expose a snapshot continuation, not a fabricated full replay.
