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
retain exact Windows discovery IDs and expected statuses. No existing case is
removed or changed. The only additions are the two staged Mage cases per
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
workers 1/retries 0. It remains live while implementation proceeds; final results
and any failures will be retained here.

The task-scoped `Issue 316 Mage acceptance` workflow reserves
`tactics-browser-tactics-browser-02`, following the existing qualified runner
pattern. Final publication will run focused production Mage cases on all six
profiles, the existing Chromium picker cases and all six extended Mage cases
serially. PR verification independently reserves VM-01 for the standard gate.
Per-case ten-minute budgets remain unchanged; the 80-minute enclosing job budget
accounts for the serial union and setup, not a longer test deadline.

Current-source browser execution, complete standard PR verification and final
acceptance are pending. A green discovery or unit result is not substituted for
those gates. Physical hardware was not requested; describe device emulation
accurately and retain engine/platform failures.
