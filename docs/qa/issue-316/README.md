# Issue #316 verification record

Issue: [#316](https://github.com/luminari-gurus/tactics-guru-v2/issues/316).
Plan: [implementation handoff](../../ongoing-projects/plan.md).
OpenSpec: [tasks](../../../openspec/changes/issue-316-mage-acceptance-fixtures/tasks.md).
Original source: `1a02557e76041e307ddf172d39ddc3e477ac967d` (runtime/tests equal
to main `6aad368`); baseline workflow publication: `d687e6d`.

**Final functional status:** all five issue acceptance gates are proven at repair
`debe0ef`: 1,245 units, both types/build integrations, seven core journeys and a
source-bound union of **36 affected browser cases**. All six freshly requalified
progression profiles finish below 600 seconds, with no skipped/flaky/retried
cases. [Final proof](qualification-42687875604/summary.json),
[reuse validation](evidence-reuse.json) and [requirement audit](acceptance-audit.json)
are authoritative. Historical failed attempts below remain failed. Both PRs are
ready for review and all six OpenSpec tasks are complete. The final handoff
updates documentation only; no application matrix is repeated for prose.

## Scope and preserved assertions

No runtime, content, dependency, gameplay, save format, browser project, retry,
worker or test-deadline change. The optional simulator argument belongs only to
the test helper: negative selection tests can supply completed nonqualifying
results or errors without depending on a particular future losing seed.

All original complete Mage journey assertions remain in
`tests/dungeon-extended.spec.ts`:

- The unplayed level-one dungeon is continued through real spatial keyboard or
  touch traversal, accepted battle commands and real reward/item preparation.
  Floor depth, active encounter and party agree with the pure witness.
- Every battle starts without a carried movement block; the 500-command and
  20-preparation-step bounds remain. The 600,000 ms case and 10,000 ms ordinary
  action limits remain unchanged.
- Snare is earned at level three, does not consume RNG or change HP, applies the
  exact source/ability block, appears in inspection and survives active-battle
  reload with exact state and no replayed historical effects.
- Level-three missiles are used; every terminal battle equals the expected
  state and exact command/event replay. A Snared unit cannot move in the replay,
  and its block expires. Final phase/party, both-ability flags, blocked/expired
  flags, empty page-error list and screenshots remain.

The original pure earned-journey test retains its exact replay and event order,
target-end-turn expiry and terminal status cleanup assertions. The separate
low-HP staged continuation test is unchanged. Existing `abilities.test.ts`
continues to assert actual `immobilized` movement rejection, unchanged rejected
state/RNG, correct expiry and invalid-target cases. Existing real-picker tests
retain preview/cancel, keyboard/touch, inspection, audio and reload checks.

The two new `staged Mage` production cases explicitly supply level-three party
and legal positioning. They prove actual HUD Snare/two-missile commands, exact
effects/state/RNG and replay, saved active-battle reload with empty events and
byte-identical primary/backup slots. They **do not prove earned XP or movement**;
the complete legal journey still owns that proof.

## Selection evidence

[discovery.json](discovery.json) and compressed
[before](selection-before.json.gz)/[after](selection-after.json.gz) inventories
retain exact Windows discovery IDs and expected statuses for the initial Mage
increment. No existing case is removed or changed in that increment. Its only
additions are the two staged Mage cases per
production profile: Chromium 1,177 → 1,183; WebKit exploration 177 → 183.
Fixtures remain 141; each extended engine retains all nine Mage/Ranger/Fighter
cases; ordinary PR selection remains seven. These are discovery counts, not
execution or a full-regression claim.

Pure candidate evaluation on Windows/Node 24.22.1 is retained in
[candidates.json](candidates.json): one simulation for each seed 64–79 took
approximately 13.7 seconds total. Seeds 68 and 78 reached level three with both
abilities and expiry; ascending selection chooses 68. This initial measurement
does not include selector replay qualification and is not a browser speedup.
The selected witness remains five battles/274 commands. Runtime receipts will
record the actual selected range, rejected outcomes, seed and selection duration.

## Iteration results and limits

- Original seed-68 earned unit: 1 passed in 1,239 ms before implementation.
- Selector iteration: 3 Mage cases passed, including real earned replay,
  deterministic bounded selection, exhaustion, unexpected failure and replay
  divergence; selected earned case ~4,343 ms, boundary/failure case ~6,293 ms.
- Affected unit run: 72 passed, 0 failed, across `dungeonBattle.test.ts`,
  `abilities.test.ts` and `dungeonProgressionBoundary.test.ts`. This iteration
  preceded restoration of the original unchanged low-HP continuation fixture;
  final current-source qualification was still required at that iteration.
- The first typecheck exposed an inferred `{}` map index in the new staging
  helper. An explicit existing `ContentCatalog` type fixed it; both type scopes
  then passed, and a direct local production bundle succeeded. Existing Vite
  native-loader/chunk-size warnings remain. This direct bundle is iteration
  feedback, not the complete `npm run build` gate.

Windows iteration used the existing installed dependencies and the desktop
runtime's Node directly because this session's Windows PATH has no npm.
OpenSpec 1.14.1 is available through WSL. No project dependency or machine setup
was changed to work around that environment. Browser acceptance runs on the
qualified Linux self-hosted VM, not a substituted local engine.

## Self-hosted baseline and final qualification

[Baseline run 42670137498](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42670137498)
checks out exact `1a02557`, records source hashes/runner conditions, builds and
executes the original desktop Chromium and desktop WebKit Mage journey, with
workers 1/retries 0. It passed both cases: desktop Chromium **438,973 ms** and
desktop WebKit **211,504 ms**, with no skips/flakes/errors. The source receipt
confirms clean exact `1a02557` on `unraid-tactics-02`.
[Source/results summary](baseline/summary.json) and compressed full reports in
`baseline/` preserve the measurements. Both are below the unchanged 600,000 ms
deadline; no before/after speedup is claimed.

The task-scoped `Issue 316 Mage acceptance` workflow reserves
`tactics-browser-tactics-browser-02`, following the existing qualified runner
pattern. Initial all-scope qualification ran focused production Mage cases on all
six profiles, existing Chromium picker cases and all six extended Mage cases
serially. The scoped progression repair then requalified the changed six cases.
PR verification independently reserves VM-01 for the standard gate.
Per-case ten-minute budgets remain unchanged; the 80-minute enclosing job budget
accounts for the serial union and setup, not a longer test deadline.

### Published implementation and prerequisite

PR [#357](https://github.com/luminari-gurus/tactics-guru-v2/pull/357), initial
implementation `5e3df8b`, is labeled enhancement/risk:medium. Standard
[PR verification 42671827774, attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42671827774/attempts/2)
passed in **204,929 ms**: 1,245 units, both types, two build integrations, bundle
and all seven core journeys (zero skipped/flaky/failed).
[Full stage receipt](pr-5e3df8b-summary.json) records actual synthetic merge
`cb5927663f66ec5dd1f70aca9edfd3dec5e32c09`; GitHub's Git objects confirm its tree
`928405d9b164b2659d2548fb5a6cbd88136e5077` equals the published implementation tree.

Broader selection contracts exposed two pre-existing unregistered reduction
tags on literal main `6aad368`. The exact base reproduces the radial omission;
after that first tag repair, the second narrow-landscape omission becomes
visible. Compressed original/base/intermediate/green logs are retained here.
PR [#358](https://github.com/luminari-gurus/tactics-guru-v2/pull/358) removes both
tags using the existing classification path. The radial dock's desktop viewport
is explicit at 1280×720, with one checked fixed-viewport equivalence; the original
23 mappings remain and the current exact count is 24. All six local selection
contracts and all six explicit browser control cases pass. Qualified Linux
run 42675291510 also passed all **31 batch/selection contracts and six real
control cases**, and PR verification 42675302736 passed **1,244 units, both
types/build integrations and seven core journeys** in 245.8 s. PR #358 is ready
for review with its full portable receipts. The Mage branch incorporates that
separate prerequisite and stacks #357 above it. Its two restored mobile
executions, two title changes and explicit viewport mapping are distinct from
the Mage discovery additions. The initial unrestricted radial-landscape
iteration failed its desktop-layout assumption; its correction and red/green
receipts remain in the separate repair record.

GitHub service failures are preserved separately: #357 standard run attempt 1,
Mage qualification 42671820980 (attempts 1 and 2), and manual run 42672732211
failed with **Internal server error** annotations before any job/test existed.
The standard retry succeeded. These attempts are not application failures or
passing test evidence; subsequent qualification must still run every gate.

At that stage complete focused/extended execution and final acceptance were pending.
Physical hardware was not requested; describe device emulation accurately and
retain engine/platform failures.

The initial Mage run [42675462523](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42675462523)
at `bcc523c` completed with the one deadline failure detailed below. Its 30
focused/picker passes are retained only after explicit input/runtime validation;
its full progression cases were requalified after the observer repair.

### Focused fixture correction

While GitHub was rejecting qualification jobs, local Windows desktop iteration
used the existing production browser configs with only the preview command/cwd
overridden in ignored scratch configs (direct Node/Vite, because npm is absent
on the Windows PATH). The first scratch command failed before browser startup
due to its cwd; correcting the task-local cwd started the intended preview.

The first real Chromium run passed Snare but failed missile event equality:
the HUD records `{unitId: target}`, while the new fixture had expected
`{missileTargets: [target, target]}`. Both produced the same state, but exact
event payloads correctly differed. The fixture now uses the actual HUD's
single-target command, which authoritative level-three resolution expands to
two missiles. No event assertion was normalized, omitted or relaxed.

After that correction, both focused cases passed on desktop Chromium and desktop
WebKit (4/4, zero retries/skips). Portable red and green reports are in
`iteration/`. These are local iteration results, not the required qualified
Linux six-profile matrix. Old-head CI attempts are superseded by this concrete
fixture change; cancellation preserves them as incomplete, never passing proof.

## First complete qualified matrix — one deadline failure

[Run 42675462523](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42675462523)
is now terminal: **35 passed, 1 failed**, zero skipped/flaky/retried cases.
[Complete accounting](qualification-42675462523/summary.json), all five raw JSON
reports, source hashes, journey receipts and logs are retained in that directory.
All 24 focused production cases and six picker cases pass. Both mobile Chromium
and all three WebKit full progression cases pass; these prove their complete
retained earned journeys under the unchanged deadlines.

Desktop Chromium exceeded 600,000 ms, then a 30,000 ms teardown deadline; its
reported total is **639,262 ms**. The same case wrote a five-battle terminal
receipt with seed 68, both ability flags and blocked/expired flags, and a final
screenshot. That does not make its deadline failure pass. Its selection took
9,808 ms, so the bounded selector alone does not account for the excess time.

The 351 MB diagnostic trace lacks its ZIP central directory, consistent with
interrupted finalization. [Original trace identity](qualification-42675462523/desktop-trace.json)
records its hash and retained local path; event data was recovered separately.
The raw original is not modified or committed as a huge Git blob. It is also in
the run's 14-day artifact. The recovered timing below established a substantial
observation cost before the targeted repair was chosen.

A pure component measurement confirmed per-command catalog reconstruction costs
~1.76 s locally across 145 player commands, and cached/uncached choices produce
the same commands and terminal states. This is not a browser attribution; no
cache or gameplay change was added in response to that small component cost.

At this failure, focused task 2.2 was complete while full progression and handoff
remained open. The later repair retains this original failed run and reuses only
results whose relevant inputs remain unchanged.

### Trace-guided observation repair

The intact `test.trace` event stream was extracted from the original truncated
archive with the existing streaming archive reader. It contains 6,304 events
and 3,151 calls. [API cost accounting](qualification-42675462523/trace-api-cost.json)
shows **864 full dungeon-snapshot reads (146.7 s)** and **666 full session reads
(129.7 s)**. The final screenshot completed near the main deadline; the separate
context teardown then took 38.6 s. This is slow observation throughout the
journey, not evidence that reaching terminal state satisfies its deadline.

The Mage loop now obtains fresh phase/count values from the same public DOM
attributes in one page evaluation per status poll. Full snapshots/sessions are
still read for command decisions, HP/RNG/inspection checks, reload and exact
replay assertions. The two original readiness polls remain separate with the
same predicates and timeouts; no state is cached or advanced by observation.
All original commands, assertions, six profiles, trace mode and deadlines remain.

Both TypeScript scopes and exact extended/core discovery pass locally. All six
progression profiles were requalified because their observer changed. The
30 focused/picker cases remain reusable at their original source: their tests,
helpers, runtime, configuration and arguments are unchanged. The scoped manual
workflow supports `all` or `progression` for this concrete recovery; the latter
executes both complete three-profile engines, with diagnostics retained.

## Final source-bound acceptance

[Run 42687875604](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42687875604)
passed all **six complete progression cases** at `debe0ef`, workers 1/retries 0,
with no skipped/flaky/unexpected cases. All reports, source, environment, journey
records and logs are in [the final qualification](qualification-42687875604/summary.json).
Each case enacts the same five-battle seed-68 journey from level one/XP zero,
reaches Mage level three, uses both abilities, validates exact replay/active
reload and terminates with blocked/expired flags and clean status boundaries.

Complete case durations, including the 7.908–8.192 s selection work:

- Chromium desktop: **507.168 s**; portrait: **274.547 s**; landscape: **306.371 s**.
- WebKit desktop: **216.799 s**; portrait: **203.648 s**; landscape: **208.347 s**.

All are below **600 s**, with the original diagnostics, assertions and deadlines.
Persistent host caches/background workloads remain recorded conditions; these
are acceptance measurements, not a controlled cross-run speedup claim.

[Reuse validation](evidence-reuse.json) proves the 30 focused/picker passes remain
valid: all 246 relevant file hashes and exact commands match, as do VM-02,
Node 24.22.2, Playwright 1.64.1, OS/arch, executable paths, overrides and browser
versions (Chromium 156.0.8078.4/WebKit 27.2). The separate VM-01 standard verifier
uses its recorded Node 24.22.1. The accepted browser union is **30 unchanged
focused/picker cases + 6 freshly qualified progression cases = 36**. The five
old passing progression results were not reused after their observer changed.

[Standard run 42687175365](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42687175365)
passed 1,245 units, both types, two build integrations, bundle and seven core
journeys in **199.342 s**. [The stage receipt](pr-debe0ef-summary.json) records
synthetic merge `b17443a`; its tree `4a3dfda631c1db37530fc35e2300e4227fb769d7`
equals published repair `debe0ef`. The [requirement audit](acceptance-audit.json)
maps every original gate to direct evidence. Subsequent work changes only
documentation/receipts and PR/OpenSpec handoff state, so no runtime matrix is
repeated for those edits. Review #358 before the stacked #357; keep #316 open
until merge. The original failed matrix remains failed and preserved.
