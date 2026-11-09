# Issue #316 — Resilient Mage acceptance fixtures

Updated: 2026-11-09 (Asia/Jerusalem). Owner: @moshehbenavraham.
Issue: [#316](https://github.com/luminari-gurus/tactics-guru-v2/issues/316).
Branch: [`branch/issue-316-mage-acceptance-fixtures`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-316-mage-acceptance-fixtures).
Original main base: `6aad368761e6684d88d9b3eb5b3cacc53a615c90`.

**Status:** code is implemented and published. Standard verification passes.
The first qualified matrix has 35 passes and one desktop Chromium deadline
failure under investigation; #357 remains draft. The caller explicitly
authorized implementation, autonomous repairs, commits/pushes, incremental PRs
and OpenSpec on November 9. No additional implementation approval is needed.

Review stack:

- [PR #358](https://github.com/luminari-gurus/tactics-guru-v2/pull/358),
  `branch/fix-radial-selection-contract` → main, is **ready for review**.
- [PR #357](https://github.com/luminari-gurus/tactics-guru-v2/pull/357), the issue
  branch → #358's branch, contains the Mage implementation and remains draft.
- Both have appropriate feature/risk labels. Keep #316 open until the complete
  reviewed implementation merges. No merge, release tag or production operation
  is part of this handoff.

The [OpenSpec tasks](../../openspec/changes/issue-316-mage-acceptance-fixtures/tasks.md)
track completion; strict validation passes. `skip_specs: true` applies because
this is verification work with unchanged product requirements. The
[QA record](../qa/issue-316/README.md) retains detailed assertions, identities,
failures, timings and portable receipts. The former #284 plan is preserved
unchanged in [its archive](issue-284-desktop-shortcuts-plan.md); its two OpenSpec
pointers were corrected when this plan replaced it.

## Outcome and required acceptance

Make focused Mage ability/replay/resume verification independent of a fortunate
movement seed, while retaining the full legal journey from an unplayed
level-one party through earned level three, Frost Snare, multiple missiles and
legal terminal cleanup. Every original issue gate remains required:

1. Focused checks use explicitly staged valid battle state and run independently
   of full dungeon traversal. Staging must never be called earned progression.
2. A complete real-input journey still earns level three and witnesses both
   abilities; retain all original assertions and all six engine/device profiles.
3. Evaluate a bounded deterministic pure selector with an explicit range, shared
   selected seed/witness, recorded exclusions and a clear exhaustion error.
   Unexpected simulation/replay errors must propagate, not become another seed.
4. Preserve exact state/events/RNG replay, active-battle reload without historical
   effects, actual Snare movement rejection and correct expiry, multiple missile
   rolls and legal terminal status cleanup.
5. Record per-profile browser time and pure-selection overhead against the
   existing 600,000 ms per-case budget. Retain failures/incomplete attempts;
   change neither deadlines nor gameplay to obtain a witness.

## Scope and ablation

**Keep:** the complete legal earned journey, exact assertions, current
preview/session/save authority and original device/engine coverage. A staged
level-three fight cannot establish earned XP, traversal or reward preparation.

**Simplify:** one Mage-specific pure selector beside the existing journey;
existing validated save/HUD and picker fixtures for focused checks. No persistent
seed cache, generic search framework, extra fixture route or new dependency.

**Drop:** balance changes, content changes, production UI/save/RNG changes,
product/developer configuration surfaces, sharding, broad timing captures and unrelated cleanup.
The seven-case ordinary PR selection stays unchanged. Existing browser configs,
workers 1 and retries 0 remain. The task-scoped self-hosted workflow supplies the
needed extended selection without changing general CI policy.

The only additional repair is the separately reviewable #358 prerequisite. Its
literal-main selection failure was reproduced. The narrow-landscape witness
regains all three profiles. The radial dock witness makes its original 1280×720
viewport explicit and uses one checked Pixel landscape-to-portrait equivalence.
The original 23 approved mappings remain; the exact current count is 24. Original
assertions/deadlines remain, and all six explicit browser controls were executed.

## Implemented files and consumers

- [dungeonFixtures.ts](../../tests/helpers/dungeonFixtures.ts):
  `selectMageJourney` defaults to candidates 64–79 inclusive, ascending, with at
  most 16 pure simulations, exact qualification/replay and no fallback. It
  returns range, exclusion reasons and witness together. Its small optional
  simulator seam makes negative unit tests independent of future lucky seeds.
  `stagedMageAbility` validates current-format level/position staging and uses
  the same single-target command as the HUD; level-three resolution supplies
  two missiles.
- [dungeonBattle.test.ts](../../tests/unit/dungeonBattle.test.ts): shared real
  selection plus deterministic bounds, exclusions, exhaustion, unexpected
  failures and replay-divergence coverage. The original earned replay assertions
  and separate low-HP Snare continuation fixture remain.
- [dungeon-extended.spec.ts](../../tests/dungeon-extended.spec.ts): uses the shared
  returned seed consistently and attaches selection/timing evidence. Every
  original earned-progression, inspection, replay, reload and terminal assertion
  remains. The deadline is still 600,000 ms.
- [dungeon.spec.ts](../../tests/dungeon.spec.ts): two explicit staged production
  HUD casts prove exact effects/state/events/RNG, replay, active reload with no
  historical events, and byte-identical primary/backup slots.
- Existing `ability-picker.spec.ts`, `abilities.test.ts`, player policy and
  traversal helpers keep preview/cancel, keyboard/touch, inspection, actual
  immobilized-move rejection, expiry and progression boundary coverage.
- [Unchanged-consumer comparison](../qa/issue-316/unchanged-consumers.json)
  confirms seven complete shared helper bodies, including Fighter/Ranger/Shaman,
  traversal and preparation, match the planning base. Their affected earned-unit
  witnesses pass. Extended discovery retains all three heroes on both engines;
  no new full Fighter/Ranger browser certification is claimed.
- [Mage qualification workflow](../../.github/workflows/issue-316-mage-acceptance.yml),
  OpenSpec, this plan and QA receipts provide execution and the handoff. #358
  owns its selection script, exact-count/device-equivalence contracts, two layout
  cases, policy clarification and scoped runner workflow.

## Verified evidence

- Exact-base [run 42670137498](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42670137498)
  checked out clean `1a02557` on VM-02. Original seed-68 desktop Chromium passed
  in 438.973 s and desktop WebKit in 211.504 s, with zero retries/skips/flakes.
  [Baseline receipts](../qa/issue-316/baseline/summary.json) preserve this source.
- Candidate simulation and full qualification costs are separate. Raw simulation
  of all 16 candidates took ~13.7 s locally. Full per-candidate qualification of
  the entire fixed interval took ~16.0 s on Windows/Node 24.22.1, including replay
  and explicit ordinary nonqualification. Seeds 68 and 78 fully qualify; default
  ascending selection chooses 68. See [measured range](../qa/issue-316/qualified-range-cost.json).
  These figures are not a cross-host or browser speedup claim.
- Final implementation [standard run 42675477861](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42675477861)
  passed **1,245 units, both types, two build integrations, bundle and seven core
  journeys** in 276.174 s. Actual synthetic merge `a0a0964` has tree
  `ee1f37434749297c2b970ec5951bff9540069b19`, verified equal to tested head
  `bcc523c`. [Receipt](../qa/issue-316/pr-bcc523c-summary.json).
- #358's qualified run 42675291510 passed **31 batch/selection contracts and six
  actual browser controls** on VM-01. Standard run 42675302736 passed 1,244 units,
  both types/build integrations, bundle and seven core journeys in 245.834 s.
  Its synthetic merge tree equals implementation `8c199ba`. Later `36c2f26`
  changes only documentation/receipts. [Repair record](../qa/radial-selection-contract.md).
- Exact discovery preserves the seven core and nine-per-engine extended cases.
  Initial Mage work adds only two staged cases per production profile. After the
  separately verified prerequisite, stacked discovery is 1,185 Chromium and 183
  WebKit-exploration cases; these are discovery counts, not executed full suites.
- Local iteration failures and corrections are retained in QA: a staging-helper
  type inference error, temporary preview cwd error, and the missile fixture's
  vector-versus-single-target event mismatch. Exact assertions were preserved.
  Both focused cases then passed on desktop Chromium/WebKit (4/4).
- GitHub internal-service failures created no jobs/tests; canceled obsolete-head
  attempts remain incomplete. Their records are not application failures or
  passing acceptance. Current qualified execution is authoritative.

## Current failure and continuation

**[Run 42675462523](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42675462523)**
at clean `bcc523c` on VM-02 is terminal: **35 passed, 1 failed**, no skips, flakes
or test retries. All 24 focused production and six picker cases pass. Both mobile
Chromium and all three WebKit complete journeys pass. Desktop Chromium hit the
600,000 ms deadline and then a 30,000 ms teardown deadline (639,262 ms total).

The failed case wrote its complete five-battle terminal receipt and screenshot.
Its selection took 9.808 s. Its 351 MB trace is truncated; keep the original.
The intact event stream has been extracted: 1,530 full snapshot/session reads
consumed ~276 s. The observer now returns fresh phase/count fields from the same
DOM records in one call per status poll, retaining full decision/assertion state,
both original poll conditions, tracing and deadlines. Strict types and unchanged
exact discovery pass; all six progression profiles require requalification.
Full accounting, source, all raw reports and journey receipts are retained in
`docs/qa/issue-316/qualification-42675462523/`. The full download completed under
`tmp/issue316-qualified-bcc523c/`. Watch session 40420 and recovery session 61118
have ended. The unmodified raw trace is identified by SHA-256 in the QA record.
Do not claim that the original 35/36 run is green after a later repair.

Next actions:

1. Publish the compact-observer repair and let ordinary PR verification finish.
   Then dispatch the scoped manual workflow on the issue branch with
   `scope=progression`, avoiding overlap with our own VM-01 verification work.
   The old baseline remains preserved in its exact historical workflow/source.
2. Requalify all six invalidated progression cases on the qualified runner.
   Preserve the
   complete acceptance union: **36 browser cases** = 12 focused production
   Chromium + 12 focused WebKit + 6 picker + 3 full Chromium + 3 full WebKit.
   Require zero unexpected/skipped/flaky/retried cases in final affected proof;
   reuse only unchanged relevant inputs and clearly identify each source/run.
   The 30 focused/picker tests and their dependencies are unchanged and retain
   their original passing evidence. Use the existing manual workflow command:
   `gh workflow run issue-316-mage-acceptance.yml --ref branch/issue-316-mage-acceptance-fixtures -f scope=progression`.
3. Compare each full case's complete duration, including selection/setup, to
   600,000 ms. Record actual measured overhead and retained runner/cache limits.
4. Retain portable raw/derived receipts, source/build identity and a final audit
   of all five acceptance bullets. Check off OpenSpec only after proof exists.
5. Commit/push the final plan/evidence, preserve the stack and labels, change
   #357 to `Closes #316` only when all criteria pass, and mark it ready for review.
   Keep the issue open until merge. Do not merge or archive OpenSpec here.
6. Verify remote parity, clean owned worktree, PR states and absence of unresolved
   implementation feedback. Remove only owned scratch configs/probe scripts;
   preserve unrelated worktrees and required recovery evidence. Complete the
   active goal only after the entire requested review handoff is achieved.

## Commands and execution policy

Apply [verification-policy.md](../verification-policy.md) to the affected test
and lifecycle consumers. Iteration uses the narrowest relevant unit/browser
case; final readiness includes the union below and exact discovery comparisons.
Production-preview commands follow a successful source-bound build.

```sh
npm run test:unit -- tests/unit/dungeonBattle.test.ts tests/unit/abilities.test.ts tests/unit/dungeonProgressionBoundary.test.ts
npm run test:verification-batches
npm run verify:pr
npm run test:regression -- tests/dungeon.spec.ts -g 'Mage'
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts -g 'Mage'
npm run test:fixtures -- tests/ability-picker.spec.ts -g 'Mage real'
npm run test:extended -- -g 'Mage legal progression'
npm run test:extended:webkit -- -g 'Mage legal progression'
git diff --check
```

Use qualified self-hosted capacity and its per-VM lock, serial browser/GPU work,
workers 1/retries 0 and no GitHub-hosted fallback. Desktop and mobile
portrait/landscape Chromium/WebKit emulation satisfy acceptance under AGENTS.md;
no physical hardware was requested. The original developer capability was
`CAN_TEST_MOBILE=android`, not a claim that hardware was tested.

Reuse evidence only with unchanged relevant inputs and original source identity.
A documentation-only final commit needs link/command/whitespace checks, not a
new application matrix. Preserve failures and indirect/unexecuted limitations.

## Planning provenance

The initial selection reviewed all 50 open issues regardless of readiness label,
all two open PRs, assignments, body/native prerequisites and published branches.
#316 was bounded, unowned and unblocked; high-leverage foundations were assigned
elsewhere and several smaller reports already had fixes. No readiness labels
were changed. [The original planning snapshot](https://github.com/luminari-gurus/tactics-guru-v2/blob/1a02557e76041e307ddf172d39ddc3e477ac967d/docs/ongoing-projects/plan.md)
retains the full inventory and rationale. PR #314's merged contact fix is an
ancestor of the base; it is not reopened by this work.

Initial implementation/verification estimate was **2–3 hours**, excluding runner
queue time. Code work is complete; the remaining work is current-source browser
qualification and the final review handoff. Do not trade acceptance for a nicer
time estimate or call a selected seed a gameplay fix.
