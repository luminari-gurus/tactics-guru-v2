# Proposal

## Why

Issue [#161](https://github.com/luminari-gurus/tactics-guru-v2/issues/161) needs a bounded combat-effect contract so the nine dependent ability, enemy and hazard issues can share legality, timing and persistence. Current runtime duplicates Guarded calculations across combat and HUD, has no general status reader, and declares save events without implementing saving throws.

Caller: `dubstylee`. Branch: `work/issue-161-combat-effects`. Base: `origin/main` at `2b5a063f4a7e8f4a6329eaf1f80630133754012a`. Implementation approval: pending.

## What Changes

- Specify closed, source-linked effect cases for healing, next-attack marks, taunt, movement blocking, accuracy/AC modifiers and bounded stacks/resources; define atomic preflight, deterministic consumption and turn/defeat cleanup.
- Implement the shared status reader, modifier evaluation and lifecycle through existing Guarded Strike as the first production consumer. Preserve its −2 attack/+2 AC tradeoff, grant on an accepted miss, and expiry before the Fighter's next turn.
- Integrate supported status evaluation with combat, movement, AI, inspection, preview and snapshot validation. Keep new ability profiles, unlocks and enemy content in their owning issues; document which contract cases are specified versus exercised in production.
- Add only the damage/save/immunity contracts traced to #166–#169/#171. Implement a primitive with its first production consumer, rather than shipping unused roll or resistance machinery in this change.
- Define bounded effect/resource serialization and compatibility/recovery for standalone, authored-run and dungeon battle saves; preserve data on incompatible input.

## Capabilities

### New Capabilities

- `combat-effects`: Closed effect semantics, shared evaluation, battle-local lifecycle, bounded serialization and incremental activation with real content consumers.

### Modified Capabilities

None. Existing battle-session, battle-controls and enemy-turns requirements remain regression constraints; this change supplies their shared effect contract without adding player actions or support-enemy behavior.

## Impact

Expected implementation: `src/domain/{types,battle,combat,turns,grid,constants,saveEnvelope,runSaveEnvelope,dungeonSaveEnvelope}.ts`, a small `src/domain/effects.ts`, `src/content/{types,validate,constants}.ts` as needed, `src/app/BattleSession.ts`, `src/ui/hud.ts`, and `src/domain/ai.ts` only where shared evaluation replaces duplication. Extend existing unit/browser suites and `docs/signature-abilities.md`; add `docs/combat-effects.md` and task-specific QA evidence. Actual file names and compatibility decisions are detailed in design.

No new dependencies, effect scripting language, new hero skills/enemies/hazards, progression, multi-ability picker, production operation or merge. Remaining effect cases belong to a documented staged contract, not a claim that downstream gameplay has shipped.
