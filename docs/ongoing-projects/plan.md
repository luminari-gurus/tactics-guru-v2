# Issue #476 — Cap Heal Goblin in dungeon battles

- Issue [#476](https://github.com/luminari-gurus/tactics-guru-v2/issues/476) · [claim](https://github.com/luminari-gurus/tactics-guru-v2/issues/476#issuecomment-7130827527) · requested by the Elite stall report in [#418](https://github.com/luminari-gurus/tactics-guru-v2/issues/418)
- Planned branch `branch/issue-476-heal-goblin-cap` · planning base `10895b93bc53a4e8ad9312baa25f2fdf7a6a8058` · November 24, 2026 (Asia/Jerusalem)
- Previous handoff [#483 dungeon counter migration](issue-483-dungeon-counter-migration-plan.md)

## Selection

Reviewed all 41 open issues, four open PRs, recent branch refs, and available GitHub Projects. The review included unlabeled issues and found no org or account Projects. #476 was unassigned, with no linked branch or open implementation PR and no formal blockers. Its prerequisite, the Shaman combat implementation, shipped in [PR #252](https://github.com/luminari-gurus/tactics-guru-v2/pull/252). The active dungeon scaling work in [PR #480](https://github.com/luminari-gurus/tactics-guru-v2/pull/480) can affect seeded fixtures, so confirm their encounter identity again on the implementation base.

#476 directly addresses a reported progression stall in a core game mode and specifies the player-visible rule and compatibility obligations. Enemy visibility [#417](https://github.com/luminari-gurus/tactics-guru-v2/issues/417) and audio retry [#412](https://github.com/luminari-gurus/tactics-guru-v2/issues/412) still require root-cause isolation. The P1 CI sharding work [#208](https://github.com/luminari-gurus/tactics-guru-v2/issues/208) has an active owner and recent implementation.

## Outcome

Each Goblin Shaman in a newly entered dungeon battle can successfully cast Heal Goblin twice. Inspection shows the acting unit’s own `2/2`, `1/2`, or `0/2` remaining. Every successful heal still costs one action and heals up to 4 HP under the existing targeting rules. A canceled, invalid, or exhausted action spends no cast. Continue preserves the remaining count. Older active dungeon battles and replays retain their original healing rules, including an eligible third cast. The next fresh battle uses the cap even in an older dungeon run.

## Implementation and files

1. **Initialize at dungeon entry.** In [dungeon.ts](../../src/domain/dungeon.ts), have `startDungeonBattle` opt into initializing one remaining-use counter per Shaman through the existing projected battle builder. Both entry paths already pass through `startDungeonBattle`. Use a single cap constant and an optional per-unit field in [types.ts](../../src/domain/types.ts). A missing field is the legacy rule, and an explicit zero is an exhausted counter. Reconstruction for active snapshots keeps their saved counts, including when the snapshot contains zero commands. Keep the counter on its unit for the life of that battle, including after defeat.
2. **Validate at existing boundaries.** Extend [battle.ts](../../src/domain/battle.ts) to admit only safe integers in `0..2` on eligible enemy Shamans. Require each Shaman in a capped snapshot to carry the field, with full uses at command zero. Check the accepted dungeon transition against its current battle so it cannot switch rules or increase uses. The dungeon envelope already validates and hashes the nested snapshot. Reuse that mechanism and its current identifiers. Apply the existing standalone and authored-run admission pattern in [saveEnvelope.ts](../../src/domain/saveEnvelope.ts) and [runSaveEnvelope.ts](../../src/domain/runSaveEnvelope.ts) to keep dungeon counters out of those save types.
3. **Use one legality check.** In [combat.ts](../../src/domain/combat.ts), reject an exhausted Heal Goblin through the shared `previewSupportAbility` with `useExhausted`. The existing [AI planner](../../src/domain/ai.ts) uses that preview for both immediate attacks and movement goals, so both paths inherit the rule. Decrement only the caster’s counter in the existing successful heal resolution alongside HP, `hasActed`, and the accepted events. Hex and heals from an uncapped Shaman follow their existing paths.
4. **Reconstruct the recorded rule on replay.** `BattleSession` already records the complete initial snapshot. For dungeon replay verification, rebuild the canonical dungeon entry using the existing builder with the recorded capped or legacy rule, compare it to the validated replay initial state, and run the existing `replayCommandSequence`. At a resumed boundary use the saved snapshot and continuation commands. The ordinary standalone and authored-run replay entry checks keep using their own canonical constructors.
5. **Show the count in enemy inspection.** Extend the Shaman support text in [hud.ts](../../src/ui/hud.ts), which [BattleScene](../../src/phaser/BattleScene.ts) already uses to render the dialog. Render `Heal Goblin: 2/2 casts remaining` and the corresponding lower counts. The legacy text remains valid for records without a counter. Update [combat effects](../combat-effects.md) and [battle save format](../battle-save-format.md) with the cap, its compatibility rule, and the fact that older clients reject capped snapshots under exact-shape validation.

## Ablation

One field per Shaman in the existing snapshot supplies the rule, persistence, and display. Its presence is sufficient to distinguish legacy commands for replay. A separate rules registry, storage migration, or replay format would duplicate that distinction. The same preview supplies the AI’s legality check. Keep cooldowns, general ability resources, battle round limits, and changes to healing amount or AI scoring outside this increment.

## Proof

- **Rules and AI.** Extend [abilities.test.ts](../../tests/unit/abilities.test.ts), [ai.test.ts](../../tests/unit/ai.test.ts), and [dungeonBattle.test.ts](../../tests/unit/dungeonBattle.test.ts). Prove `2 → 1 → 0`, healing clamped to missing HP, normal action cost, unchanged RNG on each heal, and unchanged HP, actions, RNG, and counts on an invalid or otherwise legal third attempt. Use a seeded Elite boundary with a wounded Grunt, an exhausted Shaman out of melee range, and a hero with a legal Hex line to prove the AI chooses Hex without a heal or heal-driven reposition. Verify two Shamans have independent counts and a later dungeon encounter starts fresh.
- **Save and replay.** Capture a real pre-change save and replay from the planning base or the final unchanged baseline before editing. Pin bytes and source identity. Use a legal command history whose third heal succeeds under the legacy rule. Exercise reload after one use using the real dungeon codec and session, malformed counters and mixed legacy/capped rosters, zero-command legacy Continue, and new entry in an older run. Cover standalone/run save admission in the existing envelope tests. For a complete fresh battle, compare the rebuilt initial, accepted commands, ordered events, final state and RNG. For continuation, compare the saved snapshot and post-resume command/event sequence against the uninterrupted suffix.
- **Browser.** Extend the existing `Shaman production journey` in [dungeon.spec.ts](../../tests/dungeon.spec.ts) and reuse its legal seeded [journey helper](../../tests/helpers/dungeonFixtures.ts). Verify inspection at `2/2`, after the first heal at `1/2`, after reload/Continue still at `1/2`, and after the second heal at `0/2`. Retain the current Hex, Weakened, and terminal outcome assertions. Freeze the seed and case IDs after qualifying the battle. Use Chromium desktop and emulated portrait/landscape touch and WebKit desktop and emulated portrait/landscape. Preserve the browser’s actual post-reload history and compare it to the deterministic legal battle witness.
- **PR readiness.** Run focused units first, then `npm run verify:pr` for all ordinary units, both type scopes, the production build, and the core battle/run/dungeon smoke journeys. Discover the exact Shaman case IDs with `--list`, then use the same production build for the focused browser runs. Record commit, build identity, seeds, fixture provenance, profile/case IDs and any failures per the [verification policy](../verification-policy.md). When all #476 criteria pass, use `Closes #476` and `Refs #418` in the implementation PR so the original stall report remains available for its own verification.

```sh
npm run test:unit -- tests/unit/abilities.test.ts tests/unit/ai.test.ts tests/unit/dungeonBattle.test.ts tests/unit/saveEnvelope.test.ts tests/unit/runSaveEnvelope.test.ts
npm run verify:pr

case_name='Shaman production journey'
npx --no-install playwright test -c playwright.regression.config.ts tests/dungeon.spec.ts -g "$case_name" --workers=1 --retries=0
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts -g "$case_name" --workers=1 --retries=0
git diff --check
```

## Estimate and open questions

Estimate 1.5–2.5 hours for implementation, baseline fixture capture, and verification with dependencies and browsers installed. Self-hosted queue time is additional. No open product or design questions. The first implementation check is to qualify a legal seed that demonstrates a third heal on the baseline. Recheck the chosen seed if #480 lands first.
