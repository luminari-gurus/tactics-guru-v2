# Issue 80: authored run integration

[Issue #80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80), branch `work/issue-80-run-progression`, base `46284e10d18271b2e410e3c2532e27231cd3a8d6`. The caller approved the published OpenSpec plan in the task conversation on 2026-10-15. The caller separately accepted the #57 Playwright baseline as sufficient certification of the current app state; that gate is satisfied.

## Play and persistence

Follow **Play three-encounter run** from the battle panel, or open `/run` beneath the configured public base. Start new run opens party preparation; Start encounter begins the battle. After each of the first two victories, claim one reward, optionally use/equip owned items, then start the next encounter. The third victory has no additional reward. Defeat and final victory offer Start new run directly. In-battle replacement requires confirmation. Single battle remains a separate route and save namespace.

A fresh origin starts at run seed 13. New-run replacement increments the prior run seed modulo uint32 and creates a fresh UUID. This deterministic default was selected using legal simulation and verified through actual browser controls; no encounter/item values were tuned. Approved survivors retain HP with no automatic healing, and defeated heroes stay absent. The seed-13 legal policy uses the existing expected-damage player policy with each encounter's projected catalog, prefers Healing Draught when offered, equips owned charms on the first eligible living hero, and spends draughts on eligible damaged heroes in canonical party order. This reaches victory with fighter 6 HP and the other heroes defeated.

The existing run format 1 and 32,768-code-unit bound are unchanged. RunItemSession owns accepted battle state and atomic completion; RunSnapshot stores entry-party/items plus live activeBattle, never previews/animation. Entry construction projects equipment once; canonical replay reconstructs that exact entry before dispatch. Existing single-battle replay remains strict. Continue reconstructs presentation without historical actions or cues and does not rewrite a restored active snapshot until another command is accepted. Startup reads storage without writing. Corrupt/incompatible bytes remain exportable; storage failure permits unsaved play. Replacement compares reviewed bytes and preserves the live run/seed on a partial reset, retaining original texts for export. This is best-effort local storage, not cross-tab atomicity or durable retention.

## Acceptance mapping

| #80 acceptance | Implementation and evidence |
| --- | --- |
| Create accepted authored battles with HP/party carryover and clean local state | runBattle helper and BattleSession.fromRun; survivor-subset, entry validity, equipment nonaccumulation and replay-tampering unit tests; three legal authored browser encounters |
| Atomic outcomes, reward, next encounter, final victory, defeat and fresh run | RunItemSession owns BattleSession callbacks; aggregate preflight before publication; unit legal run/defeat, duplicate/stale/disposed session and ended-snapshot reconciliation; browser duplicate activation and legal defeat/restart |
| Responsive reward/item and encounter/outcome flow; single battle preserved | Production `/run`, reused runItems and BattleScene host; narrow/portrait/landscape touch/keyboard/modal checks, sound preference and return-to-single-battle independent save test |
| Bounded metadata, ownership and active-battle saves | Existing run codec/storage reused; codec malformed/version/digest/identity/HP/roster/offer/size checks and maximum-shape stress; storage corruption/quota/backup/changed-byte tests |
| Same reload state/next command/RNG without duplicate reward/cues | Real reload before/after reward/preparation/final outcome and player/enemy presentation; uninterrupted browser comparison, snapshot continuation and no historical cues; BFCache replacement test preserves exact primary/backup bytes |
| Integrated legal victory/defeat/restart/resume | run-progression.spec.ts enacts production controls from a fresh run; no forced HP/outcome/progression. Per-encounter replay evidence and screenshots retained with final validation |

## Verification status

Focused run/domain/controller/storage checks: 19 passed. Full unit suite: 654 passed across 39 files. Content checks: 167 passed. Both typechecks and production build passed. Initial focused application matrix: 18/18 passed; additional history/layout/sound matrix: 6/6 passed. The final full browser suite and focused WebKit results will be recorded below after execution.

The production build retains the pre-existing large-chunk warning. Desktop engines and mobile device settings are emulation; no new physical-browser claim, deployment, PR merge or parent-epic certification is made. #64/#66 remain independent follow-ups; #81 retains broader playtest/tuning. Known baseline WebKit sizing and performance-collector limitations remain recorded under the owner's #57 acceptance; any run-specific new finding is retained separately.
