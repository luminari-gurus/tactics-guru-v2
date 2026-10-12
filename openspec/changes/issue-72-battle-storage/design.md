# Design

## Context

See [proposal](proposal.md) for motivation and the [task plan](../../../docs/ongoing-projects/issue-72-battle-storage/plan.md) for backlog evidence, ownership, base and acceptance mapping. Issue #72 starts from `d167ac97e56b4b192c9212d6eb596fdbb42fe743` on `branch/issue-72-battle-storage`.

The merged `src/domain/saveEnvelope.ts` already provides bounded, exact-compatible snapshot encode/decode with explicit failure reasons. `BattleSession.state` represents the committed boundary even while presenting. Neither module accesses browser storage; the session has no hydration entrypoint. Existing save fixtures cover normal, enemy, guarded, ended and command-limit states. Domain/content are typechecked without DOM ambient types.

## Goals / Non-Goals

**Goals:** A small storage adapter with injectable effects, read-only recovery, explicit partial-failure semantics and no duplicated domain validation. Resolve write ordering before implementation so failures have a verifiable contract.

**Non-Goals:** A storage framework, alternate serializer, migration registry, journal/archive service, multi-tab lock, live session wiring or atomic restart UI. An explicit slot-removal primitive is not a complete fresh-battle invalidation protocol.

## Decisions

### Keep storage outside the pure domain

Add `src/persistence/battleStorage.ts`. Inject a provider for a minimal `getItem`/`setItem`/`removeItem` interface. The browser provider acquires `window.localStorage` lazily inside a guard. Module import must remain safe without `window`. Use the existing codec and trusted immutable catalog. Prefer injection over a global browser mock because failures at acquisition and each call must be independently testable.

Expose discriminated results for slot inspection, load selection, save and explicit removal. Slot inspections retain missing/valid/invalid/unavailable distinctions, raw text when read, codec failure reasons when invalid, and decoded owned state only when valid. Storage failures carry operation (`acquire`, `read`, `write`, `remove`), slot when known, and quota/security/unavailable/other category. No exception text or raw save logging is needed. #73 owns wording/rendering of the returned status.

### Use two fixed keys and no automatic repair

Keys are `tactics-guru:phaser:battle:primary:v1` and `tactics-guru:phaser:battle:backup:v1`. Both store the existing snapshot text directly. No outer record, timestamp, generation counter or additional compatibility mechanism is needed for the selected single-writer backup policy. Never enumerate keys or call `clear`.

Inspect and decode both independently. Select valid primary first, otherwise valid backup with a warning describing primary's status. If primary read throws, a separately readable/validated backup can still be offered, but unknown storage is not absent storage and writes must refuse. Loading has zero persistent effects. An automatic backup promotion was rejected because it can destroy the original corrupt/incompatible primary and complicate failure handling.

### Refuse ordinary writes while recovery is required

Encode the input first. Before mutation, freshly inspect both slots. Any failed read blocks writes. Any undecodable text in either slot returns recovery-required with the inspection, preserving exact bytes. This handles invalid backup as well as invalid primary; silently overwriting either would discard recoverable evidence. Keeping raw strings in their original slots avoids a third archive key, archive quotas and another failure-sensitive copy operation. It intentionally requires explicit recovery before autosave can continue.

### Preserve backup before publishing primary

With valid/missing slots only:

- Valid primary: write its exact text to backup; only after success write the new encoded primary.
- Missing primary with valid backup: leave backup untouched; write the new primary.
- Both missing: write new encoded text to backup first, then the same text to primary.

On any write failure stop and return the failed stage; perform no compensating delete/write. A new reader after an interruption between calls selects the old primary or the preserved/seeded backup. If the final primary write fails, do not report new-primary success, even when the first-ever save is now recoverable from backup. In all cases caller state is untouched. Do not claim a multi-key transaction or guaranteed disk flush.

### Keep explicit removal narrow

An explicit `removeSlot`-style operation takes the selected slot and expected raw text (`null` for inspected absence), obtains storage, re-reads the slot, and refuses with `changed` if it differs. A successful read of absence is idempotent. Otherwise guard one `removeItem` and return success/failure plus available inspection data. This recheck detects an already changed inspection; it is not atomic compare-and-swap and must not claim to exclude concurrent-tab races.

Do not add `resetAll` or a force-save flag. #73 owns coordinated invalidation and disabling stale Continue after partial failure. The new API/docs must explicitly warn that deleting backup and primary independently can partially succeed.

### Reuse fixtures and existing verification mechanisms

Use `tests/helpers/saveFixtures.ts`, the real codec and the real trusted catalog with a tiny recording storage fake local to `tests/unit/battleStorage.test.ts`. Assert values and observable call ordering; inject getter/read/write/remove errors and reconstruct the reader at interruption points. Use a deny-on-unexpected-key fake to prove namespace isolation. Assert frozen input state/catalog and next RNG/enemy continuation remain equivalent.

Do not create a second codec test corpus or new production/test route. Focused unit tests prove the adapter policy; the existing configured browser suite protects game regressions. Later integration owns live browser persistence and physical lifecycle evidence. Follow the issue's configured unit/content/typecheck/build/browser delivery checks and record failures honestly.

## Risks / Trade-offs

- Undecodable slot blocks saving -> return recoverable raw data and explicit status; #73 must offer recovery choices before autosave is connected.
- Synchronous origin storage can deny access, run out of quota or be evicted -> guard every access, bound decode work with the existing codec, retain in-memory play and document best-effort persistence.
- Reading oversized stored strings necessarily allocates them before the codec rejects them -> never parse/hash them beyond the codec bound and preserve originals without duplicate archival writes.
- Backup can be older than the attempted save -> identify selected source and failed stage; do not promise zero progress loss.
- Concurrent tabs can interleave or replace data -> document the single-writer assumption; no claim of transactional/linearizable saves, locks or cross-tab reconciliation in this child.
- Fault-injected throws and interruption between operations do not prove power-loss durability -> distinguish deterministic adapter evidence from browser/device certification.

## Migration Plan

There is no legacy migration and no live application wiring in #72. Ship the adapter, tests and documented API; retain the codec unchanged. Add a short link from `docs/battle-save-format.md` explaining that storage policy now exists while live resume remains pending. #73 can integrate only after its own plan resolves hydration, UX and restart invalidation. Reverting this unused adapter requires no data deletion or deployment operation. Do not archive the OpenSpec change before implementation and merge.
