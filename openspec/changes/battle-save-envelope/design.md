# Design

## Context

See [proposal.md](proposal.md) and the [plan](../../../docs/ongoing-projects/battle-save-envelope/plan.md). Main at `e955e9d9f182a76f057ea69057c7a1ac6c0bd682` already has strict state/replay readers, semantic replay, version identifiers, canonical hashing and immutable accepted command records. No new session/storage behavior is needed to investigate the envelope.

Issue [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69) is a native child of #58, assigned to `moshehbenavraham`; branch `work/issue-69-save-envelope`. Local physical availability is Android; this pure-code scope requires no mobile hardware. The original checkout's environment/workflow edits remain separate from this worktree.

## Goals / Non-Goals

**Goals:** one measured representation, explicit trust-boundary limits and version/integrity rules, pure reconstruction, deterministic continuation proof and a precise contract for later adapters.

**Non-Goals:** live session restore, storage writes/backups, browser error UI, autosave/restart hooks, device certification, Godot import, run/reward modeling, migration framework, new dependency or deployment.

## Decisions

1. **Compare existing primitives before adding a format.** Benchmark validated snapshots and initial-state/accepted-command replay with identical domain fixtures. Use normal, ended, presentation-boundary and maximum-command cases; record raw sizes and costs. Choose one based on those results rather than preserving two formats. The comparison is a required investigation, not a premature fixed encoding choice.
2. **Place the pure contract under the existing domain boundary.** A small `src/domain/saveEnvelope.ts` can reuse `readBattleState`, `readReplay`, `replayBattle`, `canonical` and `hashJson`. The current ES2022-only typecheck and boundary tests apply automatically. Avoid a storage package whose purity would require duplicate enforcement.
3. **Make serialized text the external input.** Enforce an explicit finite length bound before parse, then validate envelope shape/version and bounded payload before canonicalization/hash/reconstruction. Reuse existing collection/number/state bounds; never recurse/hash arbitrary unknown objects first. Return typed failures, preserving original text for a future adapter's recovery/export policy.
4. **Keep identity layers distinct.** The outer save-format version does not replace state/rules/content/RNG identities. Define canonical digest coverage excluding the digest itself, and keep version compatibility exact for the initial format. A checksum is accidental-corruption detection, not anti-cheat proof. Do not add speculative migrations, timestamps or extensibility fields.
5. **Prove continuation, not just JSON equality.** Use accepted player/enemy boundaries and compare next command dispatch, RNG output/cursor and enemy planning as well as reconstructed state. State observed during presentation is already committed; transient intent/tokens/queues are excluded. Live session hydration and queued enemy integration need their own later tests.
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

The required benchmark determines the final representation and justified finite text cap; record both before implementing the selected codec. These internal choices preserve the same external contract and are part of the planned investigation. Child creation and plan publication are authorized; implementation remains a separate next step.
