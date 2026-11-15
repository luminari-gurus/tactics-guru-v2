# Issue #318 — Weakened accuracy appears to apply twice

Date: 2026-11-15.
Issue: [#318](https://github.com/luminari-gurus/tactics-guru-v2/issues/318).
Owner: [@moshehbenavraham](https://github.com/moshehbenavraham).
Branch: [`branch/issue-318-weakened-accuracy`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-318-weakened-accuracy).
Base: `origin/main` at `3c71153e`.
Status: plan only. No implementation yet.
The previous `plan.md` (#389) was moved to `issue-389-snared-indicator-plan.md`.

## Report

A fighter Weakened by a Goblin Shaman shows HUD `Accuracy +2` (base +4, −2 Weakened).
The Basic attack preview showed `attack +0 vs AC 12`, and the log showed
`miss (10 + 0 vs AC 12)`. The reporter read this as the −2 applied twice.

## Findings from code (before any change)

- `combatStats` (`src/domain/effects.ts:10-16`) subtracts the Weakened 2 **once**.
- The HUD `#battle-stats` accuracy (`src/ui/hud.ts:88`, `:295`) is `combatStats(...).accuracy`.
- `previewAttack` (`src/domain/combat.ts:38-44`) sets
  `bonus = combatStats(actor).accuracy + height + markBonus`, where `height` is
  `±HEIGHT_ATTACK_MODIFIER` (2) whenever the attacker and target stand at different elevations.
- `resolveAttack` (`combat.ts:67`, `:77`) rolls with `preview.bonus` and writes it to the
  `attackRolled` event that the log line `eventText` (`hud.ts:50`) prints.
- `previewText` (`hud.ts:32`) explains `markBonus` but **not** the height modifier.

So HUD +2 → preview +0 is exactly `combatStats` (+2) + downhill height (−2). The only
difference between the HUD accuracy and the preview bonus is the height and Mark terms.
The likely defect is that the **preview does not explain the height modifier**, not
double application. Step 1 below confirms this before any code change.

## Outcome

The attack preview breaks down every modifier that makes up its total, so a player can
reconcile the HUD accuracy with the attack bonus. If step 1 instead shows a real second
−2, that double application is removed.

## Non-goals

- Changing any combat rule, including the height modifier, Weakened, Mark or Guarded values.
- Adding fields to the `attackRolled` event. Four modules consume it: the HUD log, critical
  impact, ability presentation and audio cues. The preview is where the player decides, so
  the preview is where the explanation belongs. See Q2.
- Redesigning the preview or battle log layout.

## Plan

1. **Reproduce in a unit test** (`tests/unit/abilities.test.ts`, near the Mark preview test ~L400).
   Use the existing `shamanSetup`/`activate` helpers. For a Weakened fighter
   (`weakenedBy` = Shaman id) compare `previewAttack(...).bonus` against the same state
   without `weakenedBy`:
   - on equal elevation, the difference must be exactly −2 (proves a single application);
   - with the attacker one level below the target, the bonus equals
     `combatStats(...).accuracy − 2`.
   If the equal-elevation case shows −4, stop: the bug is real double application. Fix it
   at its source and drop step 2's premise. This step decides which branch the work takes.
2. **Expose the height term** in `AttackPreview` (`src/domain/combat.ts:13-14`, `:44-45`).
   Follow the existing `markBonus` pattern: add optional `heightModifier`, set only when
   non-zero (`...(height ? { heightModifier: height } : {})`). The `bonus` value and the
   RNG are unchanged.
3. **Explain it in `previewText`** (`src/ui/hud.ts:32`). Append
   ` · High ground +2` / ` · Low ground −2` next to the Mark segment. This shows the result
   of the `attack +N` total; the total itself does not change.
4. **Tests.** Extend the step-1 test so `previewText` contains `Low ground −2` downhill and
   no height segment on flat ground. Existing `toEqual(preview)` assertions use the same
   function on both sides, so no other test should change. Run `tests/unit/combat.test.ts`
   and `abilities.test.ts` to confirm.
5. **Close-out.** Comment the root cause on #318 and open a `risk:low` PR with
   `Closes #318`, linking the reproduction test.

### Ablation notes

- **Dropped:** the event shape change for the log line. Widening a shared domain event
  isn't needed to explain a number the preview already broke down (see Q2).
- **Dropped:** an itemized `base +4 · Weakened −2 · …` breakdown in the preview.
  The HUD already shows base-with-status accuracy plus a Weakened status line. Height is
  the only unexplained term, with Mark already shown.
- **Simplified:** reuse the `markBonus` optional-field pattern instead of a new breakdown
  type.
- **Kept:** the reproduction test. Without it, the root-cause claim stays unproven and a
  real double application could ship.

## Files

- `src/domain/combat.ts`: optional `heightModifier` on `AttackPreview`.
- `src/ui/hud.ts`: `previewText` height segment.
- `tests/unit/abilities.test.ts`: reproduction and text assertions.

## Proof

- `npm run test:unit -- tests/unit/abilities.test.ts tests/unit/combat.test.ts`, run focused while working.
- `npm run verify:pr` before the PR (domain + HUD text change; per `docs/verification-policy.md`).
- No Playwright acceptance gate is required. The visible change is text from a pure
  function that the unit test covers. If a reviewer asks for one, the existing dungeon
  Shaman journey (`tests/dungeon.spec.ts:559`) can assert the preview text.

## Estimate

About 45–75 minutes of agent time: 15 min for the reproduction test, 15 min for the
domain and HUD change, and 15–45 min for `verify:pr` plus PR/CI handling. If step 1 finds
a real double application, add 30–60 min to trace it.

## Open questions

1. **Was the reporter's fighter actually downhill?** The screenshot
   (`battle_debug_board_controls_and_weakened_accuracy_mismatch`) would confirm it. The
   plan doesn't depend on the answer, because step 1 covers both outcomes.
2. **Should the battle log line also show height?** For example,
   `miss (10 + 0 vs AC 12; low ground −2)`. That requires a new field on the
   `attackRolled` domain event (four consumers), so this plan leaves it out unless the
   maintainer wants it.
3. **Wording:** is `High ground +2` / `Low ground −2` acceptable, or is
   `Height ±2` preferred to match other UI copy?
