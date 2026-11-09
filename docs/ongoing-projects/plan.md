# Issue #316 — Resilient Mage acceptance fixtures

Planning date: 2026-11-09 (Asia/Jerusalem).

Issue: [#316](https://github.com/luminari-gurus/tactics-guru-v2/issues/316).

Owner: @moshehbenavraham, verified through the authenticated GitHub identity and assigned on the issue.

Base: `origin/main` at `6aad368761e6684d88d9b3eb5b3cacc53a615c90`.

Branch: [`branch/issue-316-mage-acceptance-fixtures`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-316-mage-acceptance-fixtures).

Status: implementation authorized by the caller on 2026-11-09. OpenSpec change
[`issue-316-mage-acceptance-fixtures`](../../openspec/changes/issue-316-mage-acceptance-fixtures/proposal.md)
tracks implementation. No runtime changes are planned.

The previous plan is preserved byte-for-byte in
[issue-284-desktop-shortcuts-plan.md](issue-284-desktop-shortcuts-plan.md).
Its historical evidence and status statements remain historical; PR #356 is now
merged. Update its two OpenSpec source pointers to the preserved filename.

## Selection and availability

Reviewed all **50 open issues**, including those without `ready for work`, their
bodies/assignments/labels, relevant discussions, all **2 open PRs**, remote
branches, and native issue dependency/branch relationships. REST inventory and
GraphQL `totalCount: 50` / `hasNextPage: false` agree. No open issue has a native
blocking relationship recorded; body-level prerequisites still apply.

Choose #316 for a bounded verification improvement with concrete acceptance,
confirmed code consumers and no overlapping published work. It removes coupling
that already required replacing seed 46 with 68 after encounter-contact changes,
and improves confidence in later dungeon movement and Mage work. It does not
formally unblock another issue; no dependency is invented for ranking it.

Availability comparison:

- **Existing ownership:** #85, #128, #161, #162, #184, #200, #208, #219, #254,
  #258 and #306 are assigned to @dubstylee. Preserve those assignments. The
  highest-leverage effect/UI foundation trackers are therefore not available for
  an independent pickup. #208 also retains its isolated-runner-capacity blocker.
- **Already published work:** #291/#302 have changes on `fix/qa-next-three`;
  #292/#298/#304 on `fix/top-five-bugs`; #296/#307/#312 have dedicated fix
  branches. #303 overlaps merged encounter-contact PR #314 and retained QA
  branches. Their remaining review, qualification or reconciliation is not a
  reason to create competing implementations. #268 already has an investigation
  branch, with the original startup cause still unresolved.
- **Larger or undecided candidates:** #170 is a content epic requiring bounded
  biome issues; #176 is useful foundation for #270 but needs coordinated record,
  duration and terminal-boundary design. #167/#168/#169/#171 need their remaining
  effect contracts; #173/#174/#175 require acquisition/reward/unlock decisions.
  #178/#182/#185/#261/#262/#287 retain explicit design choices. #179/#180/#181
  are lower-priority convenience work with policy/asset choices. #199 is an epic,
  not a focused implementation increment.
- **Other unassigned reports:** #299/#308 aggregate distinct polish/design
  changes; #301/#313/#320/#323 leave defeat, recovery or reward policy open.
  #311 is a smaller discoverability improvement. #318 deserves a controlled
  reproduction: current `combatStats` subtracts Weakened once, while attack
  preview separately applies elevation. That is an attribution uncertainty,
  not proof that the reported defect is fixed or caused by height.

No readiness labels were changed: no newly examined unready issue was promoted
without resolving its concrete uncertainty. The caller's instruction permits
selection regardless of label; #316 independently meets the readiness checks.
Immediately before claiming it, it was open, unassigned, already ready, with no
native blockers/linked branch and no matching remote branch/open PR.

PR [#314](https://github.com/luminari-gurus/tactics-guru-v2/pull/314) is merged at
`c7b35cf1373474fcd764d1037c53681cd09bcc95`, confirmed an ancestor of this base.
Its [review](https://github.com/luminari-gurus/tactics-guru-v2/pull/314#pullrequestreview-5789933339)
is the issue's source. There is no outstanding implementation prerequisite.
Existing unrelated worktrees and remote branches remain untouched.

## Outcome

Make focused Mage ability, replay and resume verification runnable independently
of a fortunate dungeon movement seed, while retaining a complete legal journey
from an unplayed level-one party through earned level three, Frost Snare,
multiple Magic Missiles and a legal terminal outcome. Preserve every current
assertion or explicitly map it to equally strong proof.

## Non-goals

Do not change gameplay, balance, encounter contact, movement/RNG ordering,
progression, saves, production UI, dependencies, timeouts, retries or workers.
Do not implement #313, create a generic seed-search framework, introduce a new
fixture route, broaden the seven-case PR allowlist, or run a full baseline.
No merge, deployment or PR creation is part of this planning handoff.

## Source findings and affected files

- [tests/helpers/dungeonFixtures.ts](../../tests/helpers/dungeonFixtures.ts):
  `mageJourney(seed)` simulates real spatial steps and accepted session commands;
  bounded traversal, floor and turn loops already exist. Extend this helper with
  the smallest Mage-specific selection/qualification function.
- [tests/helpers/playerPolicy.ts](../../tests/helpers/playerPolicy.ts):
  `mageDecision` attempts one legal Snare, then uses the established policy.
  Inspect and reuse it; no policy change is planned. Fighter/Ranger consumers of
  the same helper module must retain their behavior.
- [tests/unit/dungeonBattle.test.ts](../../tests/unit/dungeonBattle.test.ts):
  the earned Mage case calls `mageJourney(68)`; a separate staged continuation
  case already covers Snare roundtrip/cleanup. Extend these existing cases and
  add only selector boundary/failure coverage that is missing.
- [tests/dungeon-extended.spec.ts](../../tests/dungeon-extended.spec.ts):
  the Mage journey repeats seed 68 at witness creation, fresh dungeon creation
  and receipt writing. Use one returned selection throughout. Retain its
  600,000 ms budget and full earned-progression, replay, reload and terminal gates.
- [tests/dungeon.spec.ts](../../tests/dungeon.spec.ts): existing explicitly staged
  menu-save tests at XP 0/180 provide the focused production route and durable
  save pattern. Extend this surface for the missing cast/resume integration.
- Reuse [tests/ability-picker.spec.ts](../../tests/ability-picker.spec.ts),
  [tests/unit/abilities.test.ts](../../tests/unit/abilities.test.ts) and
  [tests/helpers/dungeonTraversal.ts](../../tests/helpers/dungeonTraversal.ts).
  They already own real-picker Snare interactions, actual immobilized-move
  rejection/expiry, and keyboard/touch dungeon traversal. Avoid duplicating them.
- Record final assertion mapping, exact commands, durations, chosen seed/range,
  rejected-candidate reasons, source/build identity and failures in
  `docs/qa/issue-316/README.md` and test attachments. Update this plan's progress.

Planning publication touches this file, the unchanged previous-plan archive and
the two #284 OpenSpec pointer corrections. Implementation should touch only the
test/helper/evidence files above, the requested OpenSpec artifacts and one
task-scoped self-hosted qualification workflow. Existing browser configurations
remain unchanged. The workflow is necessary to select these extended cases on
the qualified runner; existing manual jobs do not expose this selection.

## Ablation decisions

**Keep** the full legal journey: a staged level-three battle cannot prove earned
XP, traversal, reward choices or encounter-to-encounter progression. Keep exact
state/events/RNG, active-battle reload, no historical event replay, movement-block
expiry and terminal cleanup gates.

**Simplify** seed handling into one Mage-specific pure helper shared by unit and
browser consumers, using current session/content rules. Reuse existing staged
production-save and picker fixtures for focused checks. The caller subsequently
requested OpenSpec: use its proposal/design/tasks with `skip_specs: true` because
product requirements do not change. This plan remains the session handoff.

**Drop** generalized journey search, new configuration/dependencies, new fixture
routes, persistent/generated seed caches, CI sharding and balance adjustments.
No accepted criterion depends on them. Do not remove existing assertions just
to shorten the run; any moved assertion needs an explicit replacement mapping.

**Investigate during implementation** the bounded selector's real cost and
candidate qualification. It must fail visibly when no candidate qualifies; a
fallback to seed 68 or a caught unexpected helper exception would hide failure.

## Implementation sequence

1. **Capture the unchanged contract and baseline.** Record source identity,
   exact selected test IDs and the seed-68 Mage witness's duration/result on the
   qualified self-hosted runner. Inventory every current assertion against the
   existing units, staged picker and full production journey. Retain red or
   incomplete attempts; do not turn this into a whole-suite timing capture.
2. **Evaluate bounded deterministic selection.** Start with a documented fixed
   candidate interval **64–79 inclusive**, ascending, which includes the current
   witness. Run only pure Node-side simulation, not trial browser play. Qualify
   a candidate only if the Mage actually earns level three, both abilities are
   witnessed, histories replay exactly and the required expiry/terminal cleanup
   is reachable. Return the chosen seed and witness together; unit/browser
   consumers use the same helper and all receipts use that returned seed.
   Record ordinary nonqualifying outcomes/reasons; unexpected rejected commands,
   invalid states or simulation errors fail immediately. Exhaustion produces a
   clear error naming the range and unmet gates. Measure worst-case bounded
   work before retaining this interval; do not increase test timeouts to fit it.
   Keep any process-local reuse minimal and tied to unchanged current inputs.
3. **Isolate focused production integration.** Use validated current-format
   staged level-three dungeon entries for a small Snare/missile witness through
   the actual HUD. Label this staging honestly. Verify accepted action effects,
   exact state/events/RNG and saved active-boundary reload with empty historical
   events; retain exact missile count/rolls and Snare cleanup proof. Existing
   pure tests continue to prove immobilized movement is rejected atomically and
   expiry occurs on the correct accepted turn. Reuse existing picker coverage
   for preview/cancel, keyboard/touch and inspection rather than cloning it.
4. **Retain the full earned journey and qualify the change.** Replace only its
   duplicated seed literals with the shared selected witness. Start from an
   unplayed level-one state and enact all movement, commands and preparation
   through real inputs. Keep exact replay, active reload and legal terminal
   assertions. Record per-profile duration and pure selection overhead against
   the existing ten-minute per-case budget, including setup/search cost.
5. **Publish one focused implementation PR under the caller's 2026-11-09
   implementation authorization.** Run the checks below, audit every issue bullet and the final diff,
   attach the source-bound evidence, and use `Closes #316` only when all gates
   pass. If delivery needs an incomplete increment, use `Refs #316`, state what
   remains and keep the issue open. Do not close it with this planning commit.

## Proof and acceptance mapping

1. **Focused checks independent of movement seed:** staged production HUD/save
   witness in `dungeon.spec.ts`, existing real-picker cases and relevant pure
   ability/continuation tests. Run these without selecting the extended journey.
2. **Earned level three and both abilities:** retained complete Mage extended
   journey starts fresh, traverses legally and earns XP; no staged state is
   presented as proof of this criterion.
3. **Bounded shared selection:** unit checks for deterministic choice, inclusive
   range limits, nonqualifying candidates, exhaustion and unexpected failure;
   actual-current-content witness used by both consumers. Record selection in
   attachments; no browser retry/search loop or hidden failed assertion.
4. **Replay, reload, Snare, missiles and cleanup:** exact state/event/RNG replay
   in unit and complete browser histories; real active-battle reload; existing
   actual movement rejection/target-turn expiry tests; at least two real missile
   rolls; status cleared at the legal terminal boundary. Audit old-to-new proof
   explicitly if an assertion moves.
5. **Runtime without weakened gates:** per-case browser and selector durations,
   unchanged 600,000 ms deadline, workers 1, retries 0, all failures/incomplete
   attempts retained. Do not promise a speedup before measuring it.

During iteration use the smallest changed helper/unit case and one focused
browser profile. PR readiness follows [verification-policy.md](../verification-policy.md)
for **test tooling/selection** and affected lifecycle consumers:

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

Run the new focused cases under both existing Chromium and WebKit production
configs; their final titles must match the documented `Mage` filter. Discover
each command with `--list` before execution. Capture exact before/after IDs for
changed selections: retain all three extended journeys on each engine's three
profiles and the seven-case PR allowlist. New focused cases remain in the
existing `dungeon.spec.ts` suite/batches. Recheck unchanged Fighter/Ranger helper
consumers and their discovery; their current full browser journeys may reuse
valid source-bound evidence when their inputs are unchanged. Expand execution
only for a concrete changed consumer or failure.

`verify:pr` supplies all fast units, both type scopes, root/prefix build
integrations, the ordinary production bundle and seven core journeys. Build
before focused production-preview commands and bind every result to the same
relevant source/build inputs. Reuse unchanged coverage with its original
identity; focused passes do not erase historical failures.

Use the qualified self-hosted runner and its existing exclusive browser lock;
execute browser/GPU workloads serially with no GitHub-hosted fallback. The
unchanged developer capability is `CAN_TEST_MOBILE=android`, but this task does
not require physical hardware. Desktop, portrait and landscape Playwright
Chromium/WebKit emulation satisfy device acceptance under AGENTS.md. Describe
emulation accurately and retain any real platform failure.

## Estimate and handoff

### Implementation progress — 2026-11-09

- The caller explicitly authorized implementation, autonomous fixes, commits,
  pushes, incremental PRs and OpenSpec. The OpenSpec change is valid with
  `skip_specs: true` (test refactor; no product requirements changed).
- Baseline workflow source `d687e6d` is published. Live run
  [42670137498](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42670137498)
  checks out exact `1a02557` on VM-02 and measures the original seed-68 desktop
  Chromium/WebKit journey. Preserve its actual result; no broad capture was
  started and no app/test timeout was increased.
- `selectMageJourney` searches at most 16 candidates, records exclusions and
  checks the actual earned/replayed terminal witness. Default first qualifying
  seed remains 68; 78 is a second qualifying candidate in the measured interval.
  One-time simulation of all 16 candidates took ~13.7 seconds locally; default
  selection plus retained unit replay took ~4.3 seconds. No browser speedup is
  claimed. Failure-path tests inject synthetic results only at this helper's
  small test seam; production/browser selection uses actual simulation.
- Two focused production cases now stage validated level/position boundaries
  and enact Snare/multiple missiles through the real HUD, checking exact
  effects/replay and active reload with unchanged save bytes. Their browser
  qualification is pending. All old extended assertions and the original
  low-HP continuation fixture remain intact.
- Exact discovery comparison adds six staged cases to each engine's production
  matrix and removes/changes none. Each extended configuration remains nine;
  ordinary PR selection remains seven. Affected iteration units passed 72/72;
  both type scopes and direct local bundle pass after fixing a staging-helper
  type inference error. Final current-source standard/browser checks are still
  required. See [QA record](../qa/issue-316/README.md) for identities and limits.
- Published implementation `5e3df8b` as draft PR
  [#357](https://github.com/luminari-gurus/tactics-guru-v2/pull/357), labeled
  enhancement/risk:medium. Its ordinary PR verification passed 1,245 units, two
  build integrations, both types, bundle and seven core journeys in 204.9 s.
  Actual synthetic merge tree was verified equal to the published source tree.
- Baseline run 42670137498 is complete: both exact-base desktop cases passed,
  Chromium 438.973 s and WebKit 211.504 s on VM-02, with zero retries/skips.
  Portable source/full result receipts are in `docs/qa/issue-316/baseline/`.
- Broader selection contracts exposed two pre-existing unregistered reduction
  tags on literal main. A separate repair PR
  [#358](https://github.com/luminari-gurus/tactics-guru-v2/pull/358) restores two
  mobile executions and makes the radial dock's original desktop viewport
  explicit at 1280×720. One checked fixed-viewport equivalence extends the exact
  count from 23 to 24; assertions, filter mechanics and deadlines remain. It has
  bug/risk:medium labels; all six local selection contracts and all six explicit
  browser-control cases pass. The Mage
  branch incorporates the repair and #357 stacks above #358; qualified layout
  and Linux shell-contract execution remains pending.
- GitHub rejected several qualification/PR attempts with an Internal server
  error before creating any job. Preserve those zero-test attempts; one ordinary
  PR retry succeeded. Mage dedicated browser qualification has not yet run.
- Next: qualify the separate selection repair and the complete current-source
  focused/extended Mage matrix on the qualified runner; retain all failures and
  source identities, update OpenSpec/evidence and mark both PRs ready only after
  their gates pass. No merge, release tag or deployment is part of this work.
- Local production-browser iteration exposed a mismatch in the new missile
  fixture's expected command shape: the HUD uses a single-target command and
  expands it into two missiles. The fixture now uses that actual command form;
  exact event/state assertions remain. Both focused cases pass locally on
  desktop Chromium/WebKit (4/4), with red/green receipts retained. A temporary
  preview-command/cwd override bypassed the missing local npm command without
  changing shipped configs. Qualified Linux/mobile acceptance remains required.
- Cancel obsolete `904e82b` browser/duplicate PR runs after this demonstrated
  fixture correction, preserving their incomplete state, then qualify the new
  head. Retry #358's zero-job service failures on the same handles now that
  GitHub is admitting jobs again. Do not relabel those failures as product tests.
- Prerequisite **PR #358 is ready for review**. Qualified run 42675291510 passed
  all 31 batch/selection contracts and six real browser-control executions.
  Its ordinary PR run 42675302736 passed 1,244 units, both types, two build
  integrations, bundle and seven core journeys in 245.8 s. Synthetic merge tree
  equals implementation `8c199ba`; the later `36c2f26` commit adds only receipts.
  The Mage branch incorporates that handoff without changing relevant inputs.
- Current Mage qualification **42675462523** is live on tested implementation
  `bcc523c`: selection contracts, focused Chromium/WebKit and the retained
  picker steps succeeded, and full earned progression is running. The wrapper's
  final JSON/skip/retry counts still need inspection before checking those
  OpenSpec tasks complete. Watch the existing run rather than restarting it;
  the local watcher is session 40420 and writes `tmp/issue316-mage-watch.log`.
- Final ordinary Mage PR run **42675477861** tests the same implementation.
  Verify its terminal result and source tree, then retain both that receipt and
  the complete Mage matrix in the QA record. Only after every acceptance gate
  passes should #357 become ready and use `Closes #316`.

Estimated time **for me: 2–3 hours** of elapsed implementation and affected
verification after work begins, excluding self-hosted runner queue time:

- 20–30 minutes: baseline/assertion mapping and selector qualification design.
- 40–60 minutes: bounded helper and focused unit/browser changes.
- 60–90 minutes: serial engine/profile qualification, fixes, receipts and PR.

The main uncertainty is extended-journey/browser time and whether the candidate
range supplies a qualifying witness cheaply. If measurement exposes a real
problem, update the plan and report it without changing gameplay, deadlines or
acceptance. The historical seed-68 acceptance remains attached to its original
source and is not claimed as a fresh run here.

Planning validation includes source/config/path inspection, identical archived
Git content and Git whitespace/link checks. Discovery initially rejected the
anchored `^Mage legal progression` filter because Playwright matches the full
title path; the commands above use the corrected unanchored filter. No
application build, feature test or browser acceptance is claimed for this
documentation-only handoff.

Planning publication checks:

- Corrected Mage extended discovery passes: **3 Chromium + 3 WebKit** cases.
- Existing focused production `Mage` discovery passes: **6 Chromium + 6 WebKit**
  cases; existing `Mage real` picker discovery passes: **6 Chromium** cases.
- Ordinary PR selection remains **7** journeys; the unfiltered Chromium extended
  configuration still discovers all **9** Mage/Ranger/Fighter cases.
- All local plan links/paths resolve, the archived plan has identical Git content
  and `git diff --check` passes.
- GitHub `createLinkedBranch` created this branch at the recorded base. A fresh
  issue readback confirms the native Development association with #316, and the
  local tracking branch uses that exact remote ref. The plan commit is pushed
  to this branch as the final handoff step; final SHA/parity is reported in chat
  and the pickup comment, avoiding a self-referential commit hash in this file.
