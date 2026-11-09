# Issue #284 — Desktop keyboard shortcuts

Planning date: 2026-11-09 (Asia/Jerusalem).
Issue: [#284](https://github.com/luminari-gurus/tactics-guru-v2/issues/284).
Owner: @moshehbenavraham, verified from the authenticated GitHub identity and assigned on the issue.
Base: `origin/main` at `130c5ccffc491f893da8e598b8c008898fa92138`.
Branch: [`branch/issue-284-desktop-shortcuts`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-284-desktop-shortcuts).
Status: planning handoff only; application code and tests have not been implemented.
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
- **S:** select the currently chosen learned ability; do not cast it.
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
