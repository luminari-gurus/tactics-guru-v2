# Design

## Context

See [proposal.md](proposal.md) and the [plan](../../../docs/ongoing-projects/battle-save-envelope/plan.md). Main at `e955e9d9f182a76f057ea69057c7a1ac6c0bd682` already has strict state/replay readers, semantic replay, version identifiers, canonical hashing and immutable accepted command records. No new session/storage behavior is needed to investigate the envelope.

Issue [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69) is a native child of #58, assigned to `moshehbenavraham`; branch `work/issue-69-save-envelope`. Local physical availability is Android; this pure-code scope requires no mobile hardware. The original checkout's environment/workflow edits remain separate from this worktree.

## Goals / Non-Goals

**Goals:** one measured representation, explicit trust-boundary limits and version/integrity rules, pure reconstruction, deterministic continuation proof and a precise contract for later adapters.

**Non-Goals:** live session restore, storage writes/backups, browser error UI, autosave/restart hooks, device certification, Godot import, run/reward modeling, migration framework, new dependency or deployment.

## Decisions

Implementation decision (2026-10-11): retain snapshots. The clean `bc53bba` comparison measured 1,130 bytes / about 0.07 ms median decode against 301,272 bytes / about 703 ms for replay at 10,000 commands. See [format contract](../../../docs/battle-save-format.md) and [raw evidence](../../../docs/qa/issue-69/comparison.json). The format has a 16,384-code-unit input cap and 128-code-unit map-ID cap, with existing domain bounds for all other fields. This is an internal representation choice already authorized by the plan; no runtime resume or new scope is added.

1. **Compare existing primitives before adding a format.** Benchmark validated snapshots and initial-state/accepted-command replay with identical domain fixtures. Use normal, ended, presentation-boundary and maximum-command cases; record raw sizes and costs. Choose one based on those results rather than preserving two formats. The comparison is a required investigation, not a premature fixed encoding choice.
2. **Place the pure contract under the existing domain boundary.** A small `src/domain/saveEnvelope.ts` can reuse `readBattleState`, `readReplay`, `replayBattle`, `canonical` and `hashJson`. The current ES2022-only typecheck and boundary tests apply automatically. Avoid a storage package whose purity would require duplicate enforcement.
3. **Make serialized text the external input.** Enforce an explicit finite length bound before parse, then validate envelope shape/version and bounded payload before canonicalization/hash/reconstruction. Reuse existing collection/number/state bounds; never recurse/hash arbitrary unknown objects first. Return typed failures, preserving original text for a future adapter's recovery/export policy.
4. **Keep identity layers distinct.** The outer save-format version does not replace state/rules/content/RNG identities. Define canonical digest coverage excluding the digest itself, and keep version compatibility exact for the initial format. A checksum is accidental-corruption detection, not anti-cheat proof. Do not add speculative migrations, timestamps or extensibility fields.
5. **Prove continuation against the uninterrupted queue.** The enemy policy orders optional movement, optional attack, then Wait. After an accepted attack, `hasActed` means only Wait remains, even if movement is unused. Validate state/actor as before, then return Wait before enumerating positions when `hasActed` is true. After movement, the same location/targets/attack scores remain and only the origin is available; replanning selects the same attack or Wait. Fresh-turn choices, dispatch rules, RNG and serialization identities are unchanged. Compare decoded presentation-boundary commands/events/state against the original `BattleSession.nextEnemy()` queue at seed 2/command 29 and throughout authored seeds 1–5; comparing a planner with itself is insufficient. Live hydration still needs later integration tests.
6. **Separate evidence from runtime.** Keep one small reproducible measurement script and raw results, with the chosen codec unused by the game UI. Reuse existing fixtures and tests, adding dedicated save fixtures only for uncovered semantics. No unstable host timing threshold is introduced as a claim about mobile hardware.

## Risks / Trade-offs

- Replay reconstruction grows with log length -> measure the existing 10,000-command bound before selecting; retain explicit limits.
- Snapshot invariants do not prove historical reachability -> document that distinction and avoid authenticity claims.
- Canonicalization of untrusted nested data can be costly -> reject unsupported shapes/limits before hashing and return explicit bounded failures.
- Pure success can be mistaken for resume completion -> document remaining #58 storage/session/UI/device gates and do not close the parent.
- Main or another save task may move -> refresh source, parent children and active branches before creating/claiming the child and before implementation.

## Migration Plan

No existing save data or key is touched. This child introduces a pure unused-by-UI contract prototype and evidence only. Later storage work will define guarded namespaced keys, backup-first recovery and compatible-version policy. Revert a future codec change through normal Git history if necessary; do not delete original data.

## Open Questions

The representation and finite cap are now resolved by the evidence and contract above. The user authorized implementation on 2026-10-11. Storage and live session behavior remain separate work under #58.

## PR #70 review repair — 2026-10-12

The review finding reproduces on rebased main: seed 2/command 29 captures archer 5 after its attack; the original queue Waits, while the old planner invents a move. Outcome: state-only reconstruction preserves the remaining queue. Non-goals: storage, hydration, new save fields, AI strategy changes or release/deployment. Files: existing planner, AI/save tests, format/enemy docs and current plans/QA. Proof: regression fails before the fix, matches original commands/events/state afterward, existing planned prefixes remain reproducible, and configured local checks pass. Ablation retains one planner and the existing snapshot shape; serializing a queue or introducing a second resume planner is unnecessary because the current flags encode the required policy position.
