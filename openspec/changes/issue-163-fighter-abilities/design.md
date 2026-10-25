# Design

## Context

See [proposal.md](proposal.md) and [the human handoff](../../../docs/ongoing-projects/plan.md). The shared pure domain → session → Phaser/DOM path already supplies progression, routing, atomic dispatch, accepted events and storage recovery. Main `e489a30` adds direct confirmation and Guarded board indicators; merged into this branch before implementation.

## Goals / Non-Goals

**Goals:** retain those boundaries, model exactly the two required profiles and bounded state, and prove every affected consumer.

**Non-Goals:** generic resource/status frameworks, new engines/assets, other classes, unrelated cleanup, deployment or merge.

## Decisions

- Project standalone level-1 learned abilities before content loading/session/persistence; retain raw definitions for run/dungeon progression. Ship this prerequisite separately before adding unlocks.
- Use `secondWindUsed?: true` on the Fighter and `tauntedBy?: number` on hostiles. Exact readers validate eligibility and a living opposing Fighter source. No generic map or scheduler is needed.
- Add pure effect previews and route session/dispatch/hover through one ability-preview dispatch. Existing attack/missile rules remain their own implementations. Taunt restriction applies to all offensive previews and AI candidates.
- End target Taunt after its accepted endTurn; clear source/target defeat in accepted damage resolution. Reapplication replaces its source.
- Admit HP up to `min(maxHp, entryHp + 4 + power)` only for a Fighter with spent Second Wind, retaining entry bounds otherwise. Shared battle validation still rejects over-max HP and invalid state. Carry only party HP through existing completion.
- The short-run completion reducer also had an entry-HP check. Its completion command accepts an optional exact `secondWindUsed: true` fact copied from the already validated battle, allowing the same bounded healing without persisting flags in party data. Current equipment changes only accuracy/AC, so the reducer's progression catalog has the same healing power/max HP as the battle catalog. Host catalogs are trusted projections of validated raw definitions; validate raw standalone input before projecting, rather than requiring locked definitions in a projected host catalog.
- Bump rules 2→3, battle state 1→2, run envelope 3→4, dungeon envelope 4→5. Existing export/recovery preserves incompatible bytes. Include rules/content in identities even without active battles.
- Extend picker text, self targets, inspection, logs and existing floating text. Preserve direct confirmation and Guarded badges. No assets or new UI architecture.

## Risks / Trade-offs

- Accidental unlock → standalone projection and level boundary tests.
- Legal healing rejected by aggregate save readers → run/dungeon round trips and negative HP bounds.
- Wrong expiry/AI stalls → idle endTurn, wrap, source death, range/route and unreachable tests.
- Cross-route shared changes → focused iteration then policy full-regression accounting with valid evidence reuse. Retain failures, retries and incomplete coverage.

## Migration Plan

No automatic migration or release action. Changed saves deliberately enter existing incompatible recovery with exportable original bytes. Publish focused prerequisite and dependent feature PRs, leaving them open for review.
