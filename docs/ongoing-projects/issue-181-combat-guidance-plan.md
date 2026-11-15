# Issue 181: turn queue, class tips and presentation pace

Start from `5f4f73666f05e1abf250034e02fb7fc0c32c5a6f` on November 15, 2026.
[Issue #181](https://github.com/luminari-gurus/tactics-guru-v2/issues/181) stays open
until all three presentation increments and their acceptance checks are complete.
The first increment implements the turn queue only.

## Verified legacy paths

The comparison uses legacy commit `e9433f6b608ae6b2d95418615cce9cf17dadcf74`.

- [`BattleView.gd`](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/BattleView.gd):
  `refresh_turn_queue` rotates recorded initiative from the current index;
  `_build_turn_queue_entry` renders portraits, side and current-actor styling.
  Legacy retains defeated entries and does not identify a round boundary. V2's
  issue explicitly requires living units and a visible boundary.
- [`BattleController.gd`](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd):
  `_maybe_emit_class_tutorial_callout` uses `CLASS_TUTORIAL_CALLOUTS` and an
  in-memory `seen_class_tutorials` list keyed by unit instance. The pinned behavior
  suppresses repeat tips, including restart. The issue's newer November 14
  requirement is dismissible, settings-toggleable per-turn guidance.
- `BattleView.gd`: `set_combat_pace` chooses normal or fast; `_paced_duration`
  scales movement, combat effects and impact delays. The legacy fast multiplier
  is 0.48. This is a reference, not an approved V2 timing value. The separate
  enemy-animation skipping option is outside this issue's proposed scope.

## Increment 1: read-only living turn queue

- Project one cycle from `BattleState.initiative`, `activeIndex` and `round`.
  V2 `endTurn` keeps the same stored order across rounds and skips defeated units.
  Do not reroll, infer order from portraits or change domain/session behavior.
- Show the current actor once, each other living unit once, and the exact wrap
  into the next round. A trailing boundary is retained when all displayed actors
  belong to the current round. Stop at the domain's maximum round and show no
  queue after battle completion.
- Place a compact strip above the actor/actions panel in rail and radial layouts.
  Use existing catalog portrait assets, readable unit IDs, explicit Ally/Enemy
  text and a Now marker. The stable ordered list supports horizontal touch and
  keyboard browsing. Constrained-height layouts also retain vertical scrolling.
- Preserve scroll and focus during target previews, hover and HP-only changes.
  Reset to the current actor when the ordered living roster, actor or round changes.
- Use the existing `presentationStart` snapshot during animation, matching the
  actor card and board. Reconcile to accepted state when animation completes or
  visibility interruption settles it. Recreate/dispose the strip with its HUD.
- No preference, combat-save format, commands, RNG, ability rules, AI, effect
  durations or presentation timings change in this increment.

### Verification obligations

Pure projection tests compare entries against repeated legal `endTurn` calls,
including defeated units around the wrap, duplicate enemy definitions, immutable
state, terminal outcomes and the maximum round.

Focused production-browser cases cover queue order, current actor, round wrap,
preview scroll stability, keyboard/native touch input, small/enlarged-text layouts,
restart, visibility interruption, reduced motion, defeated-unit removal and legal
terminal/replay journeys. Existing rail/radial layout and input checks remain in
scope. Ordinary PR verification covers the shared standalone, run and dungeon
consumers and their resume boundaries.

The local unit/content/type/build checks can run in the editing environment.
Local browser preflight was blocked before tests: Chromium cannot open its local
socket, and WebKit lacks required system libraries. An escalation request was
automatically rejected by the environment policy. The branch-scoped workflow uses
the existing qualified `tactics-browser-02` runner and its shared concurrency group
for browser evidence, with no GitHub-hosted fallback. Receipts include the exact
source identity, environment, results and screenshots. Browser/device emulation
is the accepted device evidence; no physical-device test is claimed.

## Increment 2: contextual class guidance

Implementation starts from main `31b2931df092216d17023137a4451ae48b379dd6` after
queue PR #421 merged, on `feat/issue-181-class-guidance`. Presentation pace remains
a separate increment.

- Show one compact skill tip in the existing action-panel scroll area at settled
  player turns, with an accessible 44 px dismissal control. Use the current
  session catalog's learned ownership, damage/healing values and shared rule
  constants. Prioritize unacknowledged skills, then rotate known skills by round.
- Keep the same tip through previews and accepted actions in that turn. During
  presentation retain the displayed player's tip with dismissal disabled; hide
  it on settled enemy turns and terminal/error states. Appearance never requests
  focus. Dismissal returns focus to the existing rail/radial action control.
- Dismissal lasts until the next player turn or a fresh battle HUD, including
  reload/restart. It does not reopen after movement, action use or undo in the
  same turn. Merely seeing or skipping a tip does not acknowledge it.
- Explicit dismissal acknowledges that skill lesson and any displayed first-time
  preview/confirm lesson. Rail and radial teaching have separate IDs because a
  radial action tap/hold release may execute immediately. Acknowledged skill tips
  still recur; only the first-time interaction lesson is suppressed.
- Store enabled/seen preferences in the independent version-1
  `tactics-guru:class-guidance` envelope. Default Class tips on. Validate and bound
  lesson IDs; retain explicit choices in memory when persistence fails. Preserve
  unknown future-version data rather than downgrade it. No combat snapshot is
  read or changed by preference operations.
- Main-menu Settings and in-battle More both provide Class tips and Reset tutorials.
  Reset clears seen lessons and current-turn dismissal while preserving opt-out;
  enabling remains an explicit choice. Same-page/cross-tab changes notify open
  controls, and subscriptions are disposed with the HUD or Settings content.

Verification covers pure learned-skill projection and catalog/preview equivalence,
preference corruption/future-version/storage-failure/reset boundaries, explicit
acknowledgment versus skipped tips, unchanged prepared commands/replay, repeated
tips, keyboard/touch focus, small/enlarged-text layouts, reduced motion, restart,
and repeated visibility interruption. The focused self-hosted workflow also keeps
the existing hover, turn-queue, rail/radial layout/input and menu focus witnesses.
Ordinary PR verification covers all units/build boundaries plus shared standalone,
run and dungeon gameplay/resume consumers. Record results and source identities
in the PR, including any failed or incomplete initial runs.

The implementation uses `mainMenu.ts` Settings and `hud.ts` overflow controls.
Existing `combatControls.ts` and `autoCollectLootPreference.ts` provide independent
storage/change-notification patterns, but their values are unversioned and there
is no shared settings reset. Use `ownedAbilities` with the session's projected
catalog for learned skills. Passive guidance must not call `BattleSelection.describe`,
which prepares an intent; use read-only previews and the existing formatting helpers.

## Increment 3: presentation pace

Implementation starts from main `347b971f7c66f341a6f4c40bfe3f628d724cf54a`, after
class-guidance PR #423 merged, on `feat/issue-181-combat-pace`.

Normal retains the existing V2 timings. Fast uses a 0.5 multiplier so the user-facing
choice is a clear 2× speed; the legacy 0.48 multiplier is not copied as an arbitrary
V2 constant. Travel, impact and feedback share the existing animation progress.

| Presentation | Normal | Fast (2×) |
| --- | --- | --- |
| Movement | 70 ms per path step, at least one step | 35 ms per path step |
| Signature ability | 560 ms | 280 ms |
| Other result feedback | 180 ms | 90 ms |
| Turn transition without feedback | 25 ms | 12.5 ms |
| Reduced motion with result text | 180 ms, stationary | 90 ms, stationary |
| Reduced motion without result text | 25 ms, then snap | 12.5 ms, then snap |

- Sample the pace and reduced-motion preference once at `BoardRenderer.animate`.
  Changes during playback apply to the next accepted action; an active tween is
  neither restarted nor retimed. Keep the existing idempotent completion and
  cancellation path for hidden pages, restart and scene shutdown.
- Reduced motion omits sprite travel, projectiles, blade sweeps and expanding
  impact graphics. Stationary result text appears immediately, then the board
  snaps to the already accepted state. Existing idle-bob suppression remains.
- Store `{ version: 1, pace: 'normal' | 'fast' }` under the independent
  `tactics-guru:combat-pace` key. Reading never writes. Default to Normal; choosing
  Normal resets the speed. Tutorial resets leave this separate preference alone.
  Preserve future/oversized envelopes; retain explicit unsaved choices in memory
  and report that persistence failed. Retry writes only on an explicit choice.
- Main-menu Settings and in-battle More use native Normal/Fast radio controls,
  unique group/help IDs, 44 px labels and the existing scrolling/focus boundaries.
  Same-page and filtered cross-tab updates refresh mounted controls; disposal
  removes their subscriptions and event listeners.
- Keep timing in the presentation layer. The domain, session, command sequence,
  RNG, effect expiry, AI, combat snapshots, audio and input/hold timeouts do not
  read or write this preference. Global Phaser time scaling is unchanged.
  Audio keeps its existing pitch, playback rate and latest-accepted-batch policy;
  faster action handoff can replace a preceding cue sooner. The Fast audio
  interruption witness verifies that mute/visibility/context handling still
  leaves command completion independent of sound playback.

Verification includes pure exact-timing and preference boundaries, real-control
Normal/Fast state/replay and enemy-continuation equivalence, next-action sampling,
Fast interruption/restart, reduced-motion endpoints and stationary feedback,
menu/More persistence and reset independence, keyboard/touch focus and enlarged
text. Existing signature, idle-bob, HUD handoff and layout witnesses remain in
scope. Ordinary PR verification covers all units, both type/build boundaries and
shared standalone/run/dungeon journeys. Browser execution uses qualified
self-hosted runners and device emulation; retain actual results and initial
failures in the final PR.

Use `Refs #181` for incremental PRs; reserve `Closes #181` for the final verified
increment. Queue completion alone does not satisfy the tutorial or pace criteria.
