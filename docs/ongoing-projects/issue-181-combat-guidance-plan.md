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

## Increment 2: contextual class guidance (remaining)

- Preserve the issue's per-turn tip requirement, with dismissal for the current
  turn and a persistent Settings toggle. Keep first-seen teaching separate from
  repeated tactical hints; define explicit replay/reset behavior before adding it.
- Derive skill names, availability and rules from current catalog/preview truth.
  Legacy Ember Burst and older Guarded Strike prose are not authoritative V2 text.
- Include preview/confirm guidance without obscuring the board or stealing focus.
- Coordinate existing skill UI and #153 Settings. Store seen/preference data in
  a versioned preference boundary, independently of active battle snapshots.
- Verify skipped/repeated tips, disabled guidance, reset, keyboard/touch dismissal,
  restart, reload and the shared standalone/run/dungeon hosts.

## Increment 3: presentation pace (remaining)

- Choose and review normal/fast timings in the presentation layer; synchronize
  travel, impact and feedback without changing command order, RNG, effects or AI.
- Define persistence/default/reset behavior through Settings, separately from
  active combat saves, and respect reduced-motion behavior.
- Verify deterministic state/replay equivalence at both speeds, mid-animation
  changes, interrupted visibility, restart and shared battle hosts.

Use `Refs #181` for incremental PRs; reserve `Closes #181` for the final verified
increment. Queue completion alone does not satisfy the tutorial or pace criteria.
