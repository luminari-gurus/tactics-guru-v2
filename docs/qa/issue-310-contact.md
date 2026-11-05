# Issue 310: reliable dungeon encounter contact

## Behavior and scope

A live marker holds its position when an accepted cardinal player step ends next
to it. The next step onto that marker enters its own battle before enemy movement.
Held cells stay reserved against other live markers. Outside contact range the
existing passive/chase/block behavior is unchanged. The shared overworld movement
implementation, combat rules, save format and battle RNG are unchanged.

Affected consumers: `stepDungeon` through `DungeonSession.step`, map WASD/arrows,
compass and adjacent-cell inputs, dungeon save/Continue, encounter slot selection,
and legal journey helpers that traverse moving markers. Dungeon-only holding
changes the order in which a nearest-marker journey can encounter battles. Mage
seed 46 no longer earns its intended abilities before defeat; seed 68 retains the
same ability, level, replay, movement-block expiration and terminal assertions in
both the unit witness and the extended browser journey. After demonstrating both
earned abilities, the witness now issues legal Wait turns through defeat rather
than playing unrelated later floors. Level, ability, exact replay, resumed state,
movement-block expiry and terminal cleanup assertions remain unchanged.

## Source and environment

Base: `d350bb6247ad577b3e0b9c732dcf65d8918dfc8f`.
Contact/movement evidence source: `814947669b5bf5018795ffcdad7d8a8bd01c076e`, tree
`bd812c199970955e02b3075896612b420924b7a2`.
Current test source: `c3be6617c787a78ff2f0295a06e9d871ebfc1611`, tree
`5ee88915a2cf2b790dcf4764dca3361e85aa66ad`. Application source remains identical
to the contact/movement evidence source; final evidence/documentation edits do
not change functional inputs.

Local Node 24.22.1, Linux x64, existing lockfile. Installation required
`TAR_OPTIONS=--no-same-owner npm ci` because the PostHog CLI archive's ownership
could not be applied in this container. Local browser installation failed with
invalid/truncated Chromium archives; no local browser pass is claimed.

Self-hosted verification uses the pinned lockfile Playwright browsers, one worker,
zero retries, ordinary root production preview, and the configured desktop,
Pixel portrait/landscape and iPhone WebKit profiles. Host background workloads
were not independently controlled. Workflow logs and uploaded receipts record the
actual source, runtime, commands, selected profiles and outcomes. No physical
device testing or performance qualification is claimed.

## Retained failures and comparisons

- New contact regressions against the base implementation fail for passive and
  chase markers; the block case already passes. See
  [base contact output](issue-310/base-contact-failure.txt).
- The original Mage seed 46 passes on the base implementation:
  [base Mage output](issue-310/base-mage-pass.txt). On the initial implementation,
  the affected suite has 178 passes and that one failure:
  [initial affected units](issue-310/initial-affected-units.txt).
- [Initial PR verification](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42071314353)
  failed its unit stage before browser execution.
- [Initial focused browser run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42071444798)
  passed nine existing Chromium movement/pursuit/guardian cases. The three new
  contact cases failed because they captured the automatic enemy opening turn
  before it settled (revision 3 versus 2, or save state changed during reload).
  WebKit and legal journeys were blocked. The corrected witness waits for the
  player turn before exact snapshot comparisons; pure units still assert the
  precise atomic entry revision.
- [Intermediate local all-unit output](issue-310/intermediate-local-units.txt)
  is **not** a final-source acceptance run: it overlapped seed-search cleanup,
  included a removed temporary search file, loaded the original Mage seed, and
  hit dungeon/run-save timeouts. These failures are retained rather than counted
  as passing evidence.

- A single-worker local rerun passes all 16 final dungeon combat tests but still
  times out in two unchanged run-save cases:
  [final local consumer output](issue-310/final-local-consumers.txt).
  The same two tests time out on the literal base under the same Node, lockfile,
  single-worker settings and host:
  [base comparison](issue-310/base-run-timeouts.txt). The qualified self-hosted
  ordinary PR run passes all fast units, including those cases.
- The replacement seed 68 passes the complete original Mage assertion set:
  [final Mage output](issue-310/final-mage-pass.txt).

## Final verification

The contact/movement source ordinary PR workflow passed all six stages: tooling, all fast
units, both type scopes, root/prefix build integrations, bundle, and all seven
core browser journeys (no skips or retries). Results are linked in the PR description. That ordinary PR workflow
is [42071870867](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42071870867).
The contact/movement focused acceptance workflow is
[42071935707](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42071935707).
The workflows check out exact source commits, with a workflow isolated on
a QA branch rather than added to the application PR.

Focused browser scope: the new contact/save/reload journey for all three encounter
slots, existing movement cadence/reload, direct guardian entry, and chase/block
semantics, each on all three Chromium and all three WebKit profiles; a complete
legal dungeon floor clear/descent/backtrack and the updated Mage level-three
progression journey on desktop Chromium. The unit contact corpus covers all
three slots across 20 seeds, including exact battle seed, revision and save decode.
The extended Ranger/Fighter browser matrices are not rerun solely for the Mage
witness correction; their legal pure-domain witnesses remain in ordinary units.

The original seven-battle Mage witness reached floor 3 but exceeded its 600-second
browser budget in run 42071935707; the floor-clear step was skipped, not passed.
The bounded replacement keeps the same timeout and all assertions, using only
legal commands through the terminal boundary. Its pure test passes:
[bounded Mage output](issue-310/bounded-mage-pass.txt).

The documentation follow-up [PR run 42073577553](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42073577553)
failed twice on the unchanged five-second run-save test (1,172 other tests passed
in attempt 1). Its legal defeat/replay simulation also exceeds that budget on the
literal base. That one long test now has an explicit 20-second budget; its
assertions are untouched. The 20-seed contact cases also have a 20-second budget
after the recorded local concurrent-run timeout. These are test execution limits,
not gameplay performance budgets. The isolated run-save check passes with its
explicit budget: [output](issue-310/run-budget-pass.txt).

Current-test-source checks:
- [Ordinary PR verification](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42075423623).
- [Legal floor clear and bounded Mage acceptance](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42075476117).

The 24 passing contact/movement browser cases are reused from 8149476. Their
specifications, app source, fixtures, imports, configs, lockfile and assertions
are unchanged. Only the separate `mageJourney` function in the shared fixture
module changed (no top-level behavior, dependencies or other exports changed).
The Mage browser and unit witness are rerun; shared fixture consumers remain
covered by fresh ordinary fast units. The run-save change only adjusts its
explicit timeout. No older Mage pass is reused for the new waiting policy.
