# Issue #284 — Desktop keyboard shortcuts

Planning date: 2026-11-09 (Asia/Jerusalem).
Issue: [#284](https://github.com/luminari-gurus/tactics-guru-v2/issues/284).
Owner: @moshehbenavraham, verified from the authenticated GitHub identity and assigned on the issue.
Base: `origin/main` at `130c5ccffc491f893da8e598b8c008898fa92138`.
Branch: [`branch/issue-284-desktop-shortcuts`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-284-desktop-shortcuts).
Status: implementation authorized by the caller on 2026-11-09. OpenSpec change
[`issue-284-desktop-shortcuts`](../../openspec/changes/issue-284-desktop-shortcuts/proposal.md)
tracks this approved plan. **Adversarial review corrections are in progress.**
[PR #356](https://github.com/luminari-gurus/tactics-guru-v2/pull/356) is undergoing
the caller-authorized independent review/fix/merge workflow. The original four
implementation tasks are complete; the review correction tasks below track the
current work. Earlier implementation/qualification evidence remains historical.

## PR #356 adversarial review — 2026-11-09

The caller authorized independent adversarial review, posting every valid finding,
fixes, local verification, merge and safe Git cleanup. This supersedes the prior
review-only handoff. Main and the PR base both remain `a6e9a2f`; the reviewed head
is `afab96c`. No pre-existing dirty work was present. Existing PR discussions were
read: no manual reviews/threads existed; automated review and risk comments were
not used as proof of correctness.

Five P2 findings are posted in [review 5827504020](https://github.com/luminari-gurus/tactics-guru-v2/pull/356#pullrequestreview-5827504020)
and [review 5827759684](https://github.com/luminari-gurus/tactics-guru-v2/pull/356#pullrequestreview-5827759684):

- Native Tab changes a radial ability's focus/hub, but the full HUD retains the
  preceding ability. The red witness accepted Magic Missile while showing Frost
  Snare's no-damage review.
- Radial ability shortcuts bypass the shared plan's destination prerequisite.
  Injured Fighter, Plan move, 2/C accepts standalone Second Wind: command count
  0→1, HP 20→27, action and single use consumed with no movement.
- Rail-to-radial switching preserves a selected cell; subsequent arrow movement
  updates the cursor, but M/C still targets the old cell. Red witness committed
  (0,1) after the cursor moved to legal (1,1).
- A valid self-targeted move/heal plan says only “Choose a target” before C
  immediately accepts both commands. It needs the actual compound review.
- Radial Magic Missile can damage the allied Fighter without the friendly-fire
  warning supplied by the existing shared selection formatter.

**Outcome:** resolve all findings and preserve all original shortcut, native-input,
hold, planning, persistence and host contracts. **Non-goals:** a new input system,
new dependencies or unrelated cleanup. **Files:** radial/scene, existing ability
regressions and direct radial harnesses, this plan/OpenSpec/evidence. **Proof:**
retain before/after browser results, run the callback's direct harness consumers,
affected Chromium/WebKit controls, standalone/run/dungeon journeys and local PR
verification; do not wait on optional GitHub job latency as an implementation gate.

Ablation: use one preview publication path for tap-menu focus/aim changes and the
existing scene refresh callback for both tap/focus and held aim, so the full HUD cannot contradict a release. Add the existing plan
prerequisite and use the already-synchronized cursor for keyboard targets. Update
the three direct `BattleRadial` browser harness call sites explicitly when adding
the callback. No source-text assertions or parallel command path are needed.

Red evidence: `tmp/pr356-red.json`/log for the first two; the initial third witness
used an unprojected catalog and was rejected as invalid fixture evidence. Its
corrected witness reads legal destinations from the actual native target control
and fails in `tmp/pr356-cursor-red.json`. All product repros use valid dev states;
no production state was mutated.

The same first finding also reproduces pointer→native Enter and hold→release: the unchanged code accepted Basic attack after hovering Special, and accepted Magic Missile while held aim still showed the Basic attack review. Both are recorded on the finding's PR thread and retained in `tmp/pr356-pointer-red.json` / `tmp/pr356-held-red.json`. Five focused desktop witnesses now pass (`tmp/pr356-focused-green.json`). The obsolete direct preview DOM writes/announcement helper were removed; the radial group retains the target coordinates in its accessible name.

The additional self-plan and friendly-target cases failed after accepting their
real commands (`tmp/pr356-semantic-red.json`). The repair reuses the existing
selection warning/range/effect formatter through a pure `reviewText` method and
the existing tactical-plan preview for self-healing. This also retains Guarded
Strike's established tradeoff text. All seven concrete desktop witnesses now pass
(`tmp/pr356-all-findings-green.json`). The earlier local `verify:pr` passed in
109.9 seconds, but predates this final formatter repair; final-source validation
is recorded separately below. No deadlines/assertions were relaxed.

Delivery decision: keep the normal merge commit rather than rewriting the reviewed
history; this preserves the source-bound commits and qualifications. No release
tag is warranted for this feature merge. After the qualified head is merged,
verify #284's closure and the published tree, fast-forward the caller checkout,
and remove only exact merged branch heads with no open PR or active checkout.
Use expected-head leases for remote deletion. Preserve worktrees with unique
commits, local changes/config or retained raw qualification evidence. The final
merge/cleanup readback is recorded on PR #356 after those actions actually occur;
it is not pre-marked complete in a source checkbox.

Final review source passed local `verify:pr` in **112.2 seconds** (all units,
both TypeScript scopes, both build integrations, bundle and seven core journeys),
plus **93/93** risk-gate tooling checks. Receipts:
`verification-receipts/pr/1794236752127-61024/` and `tmp/pr356-risk-gate.log`.
The full ability suite passed **96/96** on desktop/Pixel portrait/landscape,
including all seven repros and all three direct radial harnesses. Production
radial/keyboard/plan consumers passed **136**, with **3 expected skips** for
device-specific native touch/CDP cases; no failed/flaky cases. Raw JSON/logs:
`tmp/pr356-abilities-all.*`, `tmp/pr356-production-consumers.*`. WebKit is the
remaining local engine gate. The source/test/tooling SHA-256 snapshot is
`tmp/pr356-review-inputs.json`; later prose changes do not invalidate it.
The previous plan is preserved unchanged in [the #297 plan](issue-297-hide-gameplay-diagnostics-plan.md).

## Why this item

Reviewed the complete accessible backlog: **51 open issues**, including bodies, labels,
assignees and relevant discussions; **3 open PRs**; the current remote branches; and
merged work on current main. GitHub returned `totalCount: 51` and
`hasNextPage: false`. Native blocked-by and linked-branch relationships were empty
for these issues, so body-level prerequisites and active work were also considered.
The exact `ready for work` label was a signal, not an eligibility restriction.
No backlog labels or other people's assignments were changed.

#284 is the strongest bounded implementation choice: it improves ordinary player
interaction, has concrete observable acceptance criteria, uses a shipped shared
action/ability model, has no outstanding prerequisite, and has no active branch/PR.
It is more actionable than an unresolved mechanics/UX decision and more directly
player-facing than the next test-fixture refactor. This is a judgment of current
impact, certainty and delivery size, not a claim that every unchosen issue is blocked.

Backlog accounting, with each of the 51 issues represented once:

- **Selected:** #284.
- **Already assigned to another owner:** #85, #128, #161, #162, #184, #200,
  #208, #219, #254, #258, #306. Some are acceptance trackers with substantial
  merged implementation; their remaining criteria and existing owners are retained.
- **Existing branch/PR coverage:** #296 and #307 have matching remote fix branches;
  #312 is covered by active [PR #355](https://github.com/luminari-gurus/tactics-guru-v2/pull/355).
  The other open PRs are deployment draft #12 and design draft #237.
- **Other concrete candidates:** #298 (recovery layout), #316 (Mage fixture
  resilience). #316 is the strongest verification-reliability follow-up, but its
  bounded seed search and ten-minute complete journey have more uncertainty.
- **Need current symptom/intent attribution before prescribing a fix:** #291,
  #292, #302, #303, #304, #318. Testing routes intentionally do not persist;
  #302 has a later marker-association report beyond the removed list; #304's
  requested item name is already present in current dungeon confirmation code.
  #318 still needs basic-attack versus Guarded Strike attribution.
- **Product decisions, scope decomposition or remaining mechanics/consumer
  contracts:** #167, #168, #169, #170, #171, #173, #174, #175, #176, #178,
  #179, #180, #181, #182, #185, #199, #261, #262, #270, #287, #299, #301,
  #308, #311, #313, #320, #323. These vary in readiness; for example, #170 is an
  epic requiring biome issues, while #176/#270 need aligned record/counter and
  terminal-boundary decisions. They are not excluded merely by parent references.
- **Investigation already has a separate branch and needs recurrence/root-cause
  evidence:** #268.

GitHub Projects draft cards could not be audited: the credential returned
`INSUFFICIENT_SCOPES` for `projectsV2`, requiring `read:project`. Available
connector tools do not expose Projects. This selection covers all accessible
repository issues and work, without claiming inaccessible draft cards were checked.

## Outcome and non-goals

**Outcome:** common battle actions have discoverable, context-safe desktop
shortcuts. Action/ability selection remains a preview; only explicit confirmation
or the existing immediate Wait action can commit. Both selectable control skins
retain their existing interaction model. Standalone, run-hosted and dungeon-hosted
battles use the same implementation.

**Non-goals:** rebinding/preferences, a global input framework, new exploration or
menu shortcuts, new combat actions, ability-picker redesign, gameplay/balance,
RNG, save-format or telemetry changes. Existing arrow/WASD exploration controls,
Tab navigation, native activation and pointer/touch gestures remain in use.
No deployment or merge is part of this handoff.

## Source findings and dependencies

- [BattleScene](../../src/phaser/BattleScene.ts) owns the live session, readiness,
  input locks, shared action callbacks, canvas Arrow/Enter/Space selection,
  document Escape cancellation, skin changes and shutdown cleanup.
- [BattleHud](../../src/ui/hud.ts) renders availability, the native learned-ability
  picker, Confirm/Cancel and immediate Wait. Dynamic renders rewrite several
  labels, so shortcut hints must survive those updates and layout changes.
- [BattleSelection](../../src/ui/battleSelection.ts) already owns action/target
  previews and plans. [battleActions](../../src/ui/battleActions.ts) provides
  deterministically ordered owned abilities; there is no need for another list
  or another legality evaluator.
- [BattleRadial](../../src/ui/battleRadial.ts) has real disabled buttons, target-first
  previews, a special submenu and tap/hold state. Letter/number selection must not
  call its commit methods or simulate a held pointer release.
- [BattleDialogs](../../src/ui/dialogs.ts) owns modal focus and native cancellation.
  Shortcuts yield while a dialog is open and never activate recovery/reset choices.
- #162 remains assigned to its owner for its broader acceptance; the shipped
  picker and Fighter/Ranger/Mage consumers already provide the integration needed
  here. Completing #162 is not a prerequisite for these shortcuts. This task does
  not claim to close that tracker.
- PR #355 edits some of the same shared files. Check its status and relevant diff
  before implementation/rebase; retain its turn/presentation locks and tests.

## Selected keyboard contract

- **M:** select Move.
- **A:** select Basic attack.
- **S:** select the currently chosen rail ability or the legal ability currently
  offered by the radial Special control; do not cast it.
- **1–9:** select the corresponding learned ability in the existing ordered owned
  list. Show that order and each binding in help/picker hints. Do not renumber by
  target legality, hard-code hero names or expose unlearned abilities. Further
  abilities remain reachable through the native picker; current heroes fit the keys.
- **W:** invoke the existing enabled Wait / End turn control, once, immediately.
- **C:** confirm the currently valid reviewed action through the existing confirm
  path. Without a valid preview, do nothing.
- **Escape:** retain existing cancel/clear and modal behavior.
- **Arrow keys and Enter/Space:** retain board cursor/selection and native control
  activation. C is deliberately separate because Enter already selects a board
  cell and activates focused buttons/selects.

For the rail, reuse the same action/picker and confirm callbacks as the visible
controls, including disabled-action checks. For the radial skin, preserve its
**target-first** model: use the current selected/cursor cell, open its existing
menu in tap mode as needed, and aim/focus the matching enabled slice or learned
special while showing its existing preview. M/A/S/numbers do not commit; C (or
native Enter/Space on the focused button) activates that reviewed enabled control.
Opening a multi-ability submenu is not casting. Map numbers to canonical owned
IDs; an unavailable or absent target-specific special must never select another
ability. Retain follow-up targeting and plan confirmation semantics.

Accept shortcuts only for the active, ready, visible battle in player phase.
Ignore already handled events, IME composition, repeat keydowns and Ctrl/Alt/Meta/
Shift combinations. Do not intercept input, textarea, select, contenteditable or
textbox editing, including descendants. Guard modal/hidden/inactive state before
reading an action; do not suppress ordinary browser keys for a rejected shortcut.
Remove the scene's listener on shutdown so restart, scene replacement and return
from a dungeon battle cannot accumulate handlers.

Provide compact per-control hints (tooltips and `aria-keyshortcuts` where valid),
plus a native keyboard-accessible **Keyboard shortcuts** disclosure with the full
map and context rules. Hints must reflect active skin/ability ordering and remain
readable on narrow screens. Reuse the existing HUD tool area and modal owner;
a new help service or persistent setting is unnecessary.

## Implementation and files

Deliver one focused implementation PR for #284; do not bundle other QA issues.
All six acceptance bullets belong to this increment. Use `Closes #284` only after
all are verified; otherwise use `Refs #284` and record the exact remaining gates.

1. **Bind the existing actions safely.** Update
   [BattleScene](../../src/phaser/BattleScene.ts) and
   [BattleHud](../../src/ui/hud.ts). Give pointer controls and shortcuts the same
   bounded callbacks and availability checks. Keep one scene-owned listener;
   extend the existing Escape handling rather than installing competing handlers.
   Reuse the same fixed key descriptions for dispatch and displayed hints.
2. **Cover both skins.** Add only the bounded keyboard aim/focus/submenu entry
   methods needed in [BattleRadial](../../src/ui/battleRadial.ts). Reuse current
   previews, disabled controls and activation. Do not add a second selection or
   legality model; change shared selection/actions only if a demonstrated consumer
   gap requires it. Skin switching clears stale keyboard review consistently.
3. **Make bindings discoverable.** Add HUD hints/disclosure and only necessary
   spacing in [style.css](../../src/style.css). Update the existing player-control
   instructions in [README](../../README.md). Keep action labels/accessibility
   names and modal focus coherent through rerenders and scene disposal.
4. **Prove the actual interactions.** Extend existing
   [battle-loop tests](../../tests/battle-loop.spec.ts),
   [ability-picker tests](../../tests/ability-picker.spec.ts) and
   [radial tests](../../tests/battle-radial.spec.ts). Reuse their legal battle
   policy, real ability fixtures and snapshots. Prefix new relevant production
   test titles with `keyboard-only shortcuts` so the existing WebKit acceptance
   grep includes them; confirm that by discovery. Extend existing unit tests
   only if shared pure selection/action behavior changes.

## Proof mapped to acceptance

- **Bindings and UI equivalence:** M/A/S/numbers select the same available action
  as controls; targeting, C, Escape and W follow a legal move/attack/Wait sequence.
  Assert selection/preview changes leave authoritative state, RNG, command count
  and saves unchanged; accepted confirmation advances exactly once. Complete the
  existing legal battle/replay journey and cover shared run/dungeon consumers.
- **Hints/discovery:** keyboard-only access to the full map; correct accessible
  hints after actor changes, earned unlocks, skin switch and restart. Check desktop
  and narrow portrait/landscape layout without obscuring action controls.
- **Locks:** spent Move/Action, exhausted healing, unavailable targets, enemy turn,
  animation, loading, terminal battle and repeated keydowns reject dispatch.
  Hold W/C across actor/presentation transitions and prove no second command.
- **Context:** text input, textarea, contenteditable, native select typeahead,
  IME/modifiers, focused native buttons, inspection/log/help/recovery and restart
  dialogs yield correctly. No handler remains on the menu or exploration map.
- **Existing behavior:** preserve arrows, native Enter/Space, Tab/Shift+Tab and
  Escape focus restoration; rail pointer/touch, radial tap/hold/cancel, plan/follow-up,
  skin switching and repeated hosted encounter entry. Verify reload/resume does
  not introduce duplicate listeners or accepted commands.
- **Browser proof:** desktop keyboard coverage plus affected native-touch portrait/
  landscape and WebKit cases. Browser/device emulation is sufficient under
  [AGENTS.md](../../AGENTS.md); local `CAN_TEST_MOBILE` is `android`, which
  declares access only. No physical-device testing is required or claimed.

Follow [verification policy](../verification-policy.md): focused iteration, then
PR readiness for shared UI/input consumers. No full regression or new performance
capture is required unless a discovered change demonstrates broader impact.

Current command entry points (run sequentially for browser/server ownership):

~~~sh
npm run test:unit -- tests/unit/battleActions.test.ts tests/unit/battleSelection.test.ts tests/unit/combatControls.test.ts tests/unit/radialGesture.test.ts
npm run test:regression -- tests/battle-loop.spec.ts tests/battle-radial.spec.ts tests/battle-board.spec.ts --grep 'keyboard-only|keyboard selection, confirmation lock|radial tap fallback|radial hub cancel|radial switching to rail' --list
npm run test:fixtures -- tests/ability-picker.spec.ts --grep 'keyboard touch|real learned picker|keyboard-only shortcuts' --list
npm exec -- playwright test -c playwright.device-acceptance.config.ts --grep 'keyboard-only|radial tap fallback|radial switching to rail' --list
npm run verify:pr
npm run test:regression -- tests/battle-loop.spec.ts tests/battle-radial.spec.ts tests/battle-board.spec.ts --grep 'keyboard-only|keyboard selection, confirmation lock|radial tap fallback|radial hub cancel|radial switching to rail'
npm run test:fixtures -- tests/ability-picker.spec.ts --grep 'keyboard touch|real learned picker|keyboard-only shortcuts'
npm exec -- playwright test -c playwright.device-acceptance.config.ts --grep 'keyboard-only|radial tap fallback|radial switching to rail'
git diff --check
~~~

`verify:pr` includes all fast units/content, both TypeScript scopes, both build
integrations, the production build and seven core journeys. Use that successful
root build for preview suites; fixtures use their own dev server. After discovery,
add only missing affected consumers (for example a new hosted-entry witness),
and account for every criterion above. Tests outside the seven-journey core must
use the explicit regression/fixture/WebKit commands. Keep workers:1 and current
assertions/timeouts; browser CI uses self-hosted capacity without hosted fallback.
Retain exact source/build/runtime/project identities and failures/incomplete runs.
Do not claim focused reruns erase earlier failures.

## Ablation decisions

- **Keep** centralized scene gating and cleanup: otherwise letters can dispatch
  during typing, dialogs, presentation or a later scene, violating criteria 3–5.
- **Simplify** to the existing HUD callbacks, owned-ability ordering and radial
  preview/buttons: a parallel command or ability registry could diverge from UI
  legality and learned state. A fixed shared key description is enough.
- **Keep** a separate confirm key and explicit radial aiming: reusing global Enter
  or clicking a radial slice while selecting would bypass selection/confirmation.
- **Keep** both skins and shared hosted consumers: users can explicitly choose
  either skin, and all three battle hosts instantiate the same scene.
- **Keep** actual keyboard, native-select, touch and repeated-entry witnesses:
  a key lookup unit test cannot prove default browser behavior or listener lifetime.
- **Drop** configurable bindings, preference migrations, app-wide event buses,
  new dependencies, exploration/menu key remapping and unrelated cleanup. None
  supplies a #284 requirement. Reuse existing test files/configs rather than new
  infrastructure or the full regression matrix by default.

## Estimate and planning validation

**My estimated implementation time: 3–5 hours of active agent work**, including
about 1.5–2.5 hours for guarded action/radial wiring and hints, 1–1.5 hours for
focused regression witnesses, and 0.5–1 hour for affected qualification and PR
preparation. CI queueing, external runner outages and human review are additional.
The main uncertainty is radial focus/confirmation and native key-event ordering;
a source-attributed broader defect would require a revised estimate, not extra
scope silently included here.

Planning validation: existing production command discovery selected **27 cases**
across the three Chromium profiles; the fixture filter selected **15 cases** across
those profiles. These are discovered existing cases, not executed tests or proof
of the future feature. The prose-only handoff requires link/path consistency,
archive preservation, diff checks and published commit/branch/issue readback;
application/browser execution belongs to implementation. The branch was created
with GitHub's native linked-branch mutation, attaching it to #284 in Development.
No production state was changed and no application verification is claimed by
this planning commit.

## Implementation progress — 2026-11-09

- Caller explicitly authorized implementation, autonomous issue resolution, commits/pushes and a labeled review PR, and requested OpenSpec. This approval applies to the concrete plan above.
- Confirmed clean branch at `b7dad6a`, unchanged `origin/main` at `130c5cc`, issue assignment and open PR #355. No runtime evidence is reused as proof of the new feature.
- Created the OpenSpec change using the existing project root and spec-driven schema. Reusing the existing `battle-controls` capability; no new framework, preferences or dependencies are needed.
- Implemented one scene-owned guarded dispatch path, fixed key descriptions, accessible hints/disclosure, ordered learned ability selection and radial aim/focus before explicit confirmation. Reused existing callbacks, previews and disabled controls; no new dependencies, preferences, rules or save fields.
- The compact radial label fitter can omit long hub text. New keyboard aiming now retains the complete existing preview in the HUD; the focused Snare case proves the no-damage/no-roll details remain visible before casting. This repair is required by the planned preview contract.
- Added focused regressions to the existing battle-loop, ability-picker and radial suites; preserved the old radial plan test and added its keyboard variant. Existing run/dungeon core journeys now assert shortcut selection leaves their authoritative snapshots unchanged.
- Desktop iteration: `tmp/issue284-desktop-final.log` records **6/6 production shortcut passes**, including guarded selection, held keys, modal/editable contexts, presentation/visibility, restart/reload, radial movement, held pointer/skin change and plan follow-up. `tmp/issue284-abilities-desktop.log` retains three passing real hero ability cases plus the radial preview failure; `tmp/issue284-radial-abilities-fixed.log` records the repaired radial case passing. Both TypeScript scopes passed. These are focused iteration results; full affected qualification remains in progress.
- Retained failures: initial dev navigation timed out at startup before any feature assertion (`tmp/issue284-red`); the built-preview pre-change witness correctly failed because A did not select Basic attack (`tmp/issue284-red-preview.log`). A newly written reload test initially used the fresh-replay-only helper on a resumed battle; switching it to the existing `readSession` helper repaired the witness without changing product behavior (`tmp/issue284-rail-guards.log`). The radial HUD detail failure above was repaired in production code, not hidden by weakening its detail assertion.
- Verification source inputs are recorded in `tmp/issue284-verification-inputs.json`: original tested HEAD `b7dad6a` plus dirty paths and 333 relevant source/test/tooling SHA-256 values, Node 24.22.1, Windows x64, Playwright 1.64.1, one worker, zero retries. Standard `verify:pr` is running with receipts at `verification-receipts/pr/1794232084939-8808/`; no passing result is assumed yet. Source/build identity and final relevant-input parity will be checked before review handoff.
- OpenSpec implementation tasks 1.1/2.1 are complete; integrated device/browser qualification and the final review handoff remain. Next: finish standard verification, run the affected Chromium/fixture/WebKit filters, review screenshots, retain results, and publish/update the focused review PR.

## Integrated qualification and review handoff

- Published implementation commit `be7ec0b` and opened [PR #356](https://github.com/luminari-gurus/tactics-guru-v2/pull/356), labeled `enhancement` and `risk:medium`. It remains draft while final CI is checked. No merge, deployment or release tag was requested or performed.
- PR #355 merged during qualification. Integrated current main `a6e9a2f` with an ordinary merge at **`3daa5d738be84c305b09bec268fd59ba6b6eb7fb`**. The merge changed only the upstream scene/HUD presentation behavior and its animation tests; it preserved the shortcut path. No force push or discarded work.
- Local `npm run verify:pr` passed before that merge: **1,244 units**, both TypeScript scopes, **2 root/prefix build integrations**, production bundle and **all 7 core journeys**, in 112.5 seconds. Receipts remain at `verification-receipts/pr/1794232084939-8808/`. This is pre-merge evidence, not a claim the command ran on `3daa5d7`.
- On clean `3daa5d7`, both TypeScript scopes and a fresh root bundle passed, then **112/112 focused cases** passed with one worker, zero retries, skips or failures: **51** Chromium production cases across desktop/Pixel portrait/landscape; **26** production WebKit cases across iPhone portrait/landscape; **27** Chromium real-ability fixture cases across the same three Chromium profiles; **8** new ability-shortcut fixture cases across both WebKit profiles.
- The production Chromium filter is the plan's filter plus `radial plan specials|undo and compound plan`, retaining existing pointer/keyboard plan witnesses alongside the new shortcut variants. WebKit production uses the original planned filter. The ability fixture filter adds the new `keyboard-only shortcuts` titles to the existing real-picker/keyboard-touch checks. The exact selected titles, projects, configs, filters, modes, counts and raw-report hashes are retained in [verification.json](../qa/issue-284/verification.json).
- WebKit ability fixtures reuse the existing dev fixture server and existing WebKit acceptance profiles through ignored `tmp/issue284-abilities-webkit.config.ts`; its complete contents are retained in the receipt so a new session can reconstruct it. No shipped Playwright configuration or selection contract changed. The fixture JSON report was moved from its config-relative `tmp/tmp/` output to `tmp/issue284-fixtures-webkit.json` without changing its bytes.
- Environment checked directly: Windows x64 build 26300, Node **24.22.1**, Playwright **1.64.1**, Chromium **156.0.8078.4** and WebKit **27.2**. Browser environment receipt: `verification-receipts/browser-environment/run-AAUsWA/environment.json`. Devices are emulated; no physical-device evidence is claimed.
- Reviewed screenshots of [desktop help](../qa/issue-284/desktop-shortcut-help.png), [touch portrait preview](../qa/issue-284/touch-portrait-preview.png) and [touch landscape preview](../qa/issue-284/touch-landscape-preview.png). Help is keyboard reachable in the bounded HUD scroller; full action details remain visible, the playfield remains usable and controls retain visible focus. The original compact radial overlay is unchanged.
- Source integrity: all **333** relevant source/test/tooling hashes matched after the focused runs. The committed receipt binds them to clean `3daa5d7`, records root build hashes and keeps the pre-merge result distinct. Further documentation/evidence-only commits do not change those inputs; no application rerun is needed solely for prose.
- **Retained CI failure:** [initial self-hosted run 42628928524](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42628928524) stopped with 1,243/1,244 units passing. The unchanged `measureFitPreview.test.ts` silent-startup case exceeded its 1.5-second fixture readiness deadline. [Raw artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42628928524/artifacts/13678744670) and local download `tmp/issue284-ci-initial-receipt/` preserve the result. No timeout, assertion, retry policy or unrelated collector source was changed; local passes do not establish the historical CI failure's cause. The final current-head run must pass before the PR is marked ready.
- At this checkpoint, publishing the integrated qualification record and checking current-head CI remained; those steps are completed in the final disposition below. Keep #284 open until the reviewed implementation is merged.
- Final review found a radial S/hint mismatch: the visible Special control can offer Magic Missile when the first learned Frost Snare is illegal at range one, while S read the hidden picker. S now uses the existing legal-special/last-used choice that drives the visible control. Numeric IDs retain their exact no-fallback contract. The source change reopens task 2.1 until its expanded witness passes; earlier 112-case evidence remains bound to `3daa5d7`, not relabeled as final-source execution.
- [Self-hosted run 42630279039](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42630279039) passed on published head `40af1a0` in **204.6 seconds**: tooling, all units, both types/build integrations, bundle and seven core journeys. `tmp/issue284-ci-40af1a0.log` retains the job log. This proves a fresh complete CI pass without changing the collector assertion/deadline; it does not explain or erase the earlier readiness failure. The subsequent S correction still needs its own current-head CI.
- The expanded radial fixture hit its existing 30-second budget at a reset reload before the new S assertion (`tmp/issue284-radial-s.log`). Split the original cast/resource case and the range-one S/A case into two independent focused tests, retaining every assertion and the original timeout. Both now pass across all three Chromium profiles (**6/6**, `tmp/issue284-final-fixtures.json`). Production reload/Continue coverage remains in its dedicated lifecycle witness and the core journeys.
- Final correction qualification passed both TypeScript scopes, a fresh root bundle and **40/40 fresh checks**: 18 production Chromium shortcut cases, 12 production WebKit shortcut cases, 6 Chromium radial ability cases and 4 WebKit radial ability cases. All use one worker, zero retries and no skipped/failed cases. The expanded range-one witness proves S aims the offered Magic Missile, key 1 never substitutes for illegal Frost Snare, and A previews Basic attack before C accepts exactly one command. Task 2.1 is complete again.
- Only `src/phaser/BattleScene.ts`, `src/ui/hud.ts` and `tests/ability-picker.spec.ts` differ from the initially tested runtime inputs. The fresh checks cover the S branch, full-map wording/layout, canonical numbering, preview/confirmation, locks, modal/editable contexts, lifecycle and plans. The remaining initial pointer/native-control and rail ability cases retain their relevant behavior and inputs; their original source identity remains explicit. The receipt records the changed hashes, exact fresh cases and reuse rationale rather than calling the old 112-case run a final-source run.

## Final disposition — ready for review

- Final implementation is published as **`9329ff0ed2912466dab6fe695de06322ece3dc4a`** on the issue's natively linked branch. [Self-hosted run 42631947486](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42631947486) passed all standard stages and all **7 core journeys** in **196.6 seconds**. Its [raw artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42631947486/artifacts/13680857744) and `tmp/issue284-ci-9329ff0.log` retain the result.
- CI checked out synthetic merge **`3047fcd36c41a083d7bde2b1ac37e470f9568fa2`**. Its complete Git tree **`8a1c17f2fb6088f0ce0f9710da8d1f0b151ee860`** was read from GitHub and verified equal to the published implementation tree. This identifies the actual CI checkout without claiming the job checked out the branch SHA directly.
- Re-read all six issue acceptance bullets against the final implementation and evidence: M/A/S/numbers/W/C match the active controls; hints and the full map remain accessible; unavailable, repeated and locked input cannot dispatch; editing/modifiers/composition/modal contexts yield; native keyboard/pointer/touch, plans and lifecycle remain covered; focused desktop and both browser-engine/device matrices pass. No implementation criterion remains deferred.
- Marked PR #356 ready for review and updated its description with `Closes #284` only after these gates passed. The issue remains open until merge. Appropriate feature/risk labels are present; normal repository risk assessment and human review remain review work, not an implementation exception or a request to merge.
- OpenSpec reports **4/4 tasks complete** and strict validation passes. The branch has the approved plan, implementation, regressions and portable QA evidence. No dependency, preference, domain rule, save format, CI workflow or shipped Playwright configuration was added.
- This final checklist/receipt update changes documentation only. Its source/test/tooling hashes are identical to `9329ff0`; the final PR's Checks tab supplies any automatically triggered documentation-commit CI result. Do not rerun application tests merely to rewrite this prose. Preserve the earlier failed/incomplete attempts with their actual source identities.
