# Proposal

## Why

[#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72) needs a guarded browser-storage boundary before autosave/resume can use the merged #69 snapshot codec. Storage failures and undecodable saves must preserve recoverable data and allow in-memory play to continue.

## What Changes

- Add a small injectable storage adapter using the existing encoder/decoder and two fixed Phaser-namespaced keys.
- Validate both slots, prefer a valid primary, and expose a validated backup plus recovery diagnostics without automatic repair writes.
- Preserve a validated prior save before publishing a new primary; refuse ordinary writes when either slot contains undecodable bytes.
- Return typed failures for acquisition, reads, writes and explicit removal. Expose original strings for later export/reset controls without touching legacy keys.
- Document write ordering, failure cases, origin-scoped limitations and the handoff to #73/#74; add focused fault-injection coverage using existing battle fixtures.

## Capabilities

### New Capabilities

- `battle-storage`: Guarded local storage, validated recovery selection, backup ordering and explicit raw-data preservation for battle snapshots.

### Modified Capabilities

None. The existing save envelope, battle/session semantics and runtime UI remain unchanged by this adapter delivery.

## Impact

Planned files: `src/persistence/battleStorage.ts`, `tests/unit/battleStorage.test.ts`, `docs/battle-storage.md`, a small link/boundary update in `docs/battle-save-format.md`, and task-specific planning/QA records. Reuse `src/domain/saveEnvelope.ts` and `tests/helpers/saveFixtures.ts`; no new dependency or serializer.

Issue: #72; parent: #58. Base: `d167ac97e56b4b192c9212d6eb596fdbb42fe743`. Planned branch: `branch/issue-72-battle-storage`. Live session hydration, autosave, player-facing controls and restart invalidation belong to #73; lifecycle/device certification belongs to #74. This proposal does not close those issues or authorize deployment.
