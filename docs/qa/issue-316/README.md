# Issue #316 verification record

Issue: [#316](https://github.com/luminari-gurus/tactics-guru-v2/issues/316).
Plan: [implementation handoff](../../ongoing-projects/plan.md).
OpenSpec: [tasks](../../../openspec/changes/issue-316-mage-acceptance-fixtures/tasks.md).
Original source: `1a02557e76041e307ddf172d39ddc3e477ac967d` (runtime/tests equal
to main `6aad368`); baseline workflow publication: `d687e6d`.

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
  final current-source qualification remains required.
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
pattern. Final publication will run focused production Mage cases on all six
profiles, the existing Chromium picker cases and all six extended Mage cases
serially. PR verification independently reserves VM-01 for the standard gate.
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
tags without changing assertions or approved classification policy. All six
local selection contracts pass; qualified Linux batch contracts and all six
affected browser executions remain pending. The Mage branch incorporates that
separate prerequisite and stacks #357 above it. Its three restored mobile
executions and two title renames are distinct from the Mage discovery additions.

GitHub service failures are preserved separately: #357 standard run attempt 1,
Mage qualification 42671820980 (attempts 1 and 2), and manual run 42672732211
failed with **Internal server error** annotations before any job/test existed.
The standard retry succeeded. These attempts are not application failures or
passing test evidence; subsequent qualification must still run every gate.

Complete focused/extended browser execution and final acceptance remain pending.
Physical hardware was not requested; describe device emulation accurately and
retain engine/platform failures.

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
