# Guarded local battle storage

[#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72) adds a storage adapter around the [accepted snapshot codec](battle-save-format.md). It does not hydrate a session or enable autosave/Continue controls; those belong to #73. The caller supplies a validated immutable catalog and can continue in-memory play when persistence fails.

## API and owned keys

`createBattleStorage(catalog, provider?)` in `src/persistence/battleStorage.ts` lazily acquires the browser's `window.localStorage` by default. Tests or other callers can supply a synchronous provider exposing only `getItem`, `setItem`, `removeItem`, or returning null/undefined when unavailable. Module import does not access `window`.

Only these two keys are accessed:

- `tactics-guru:phaser:battle:primary:v1`
- `tactics-guru:phaser:battle:backup:v1`

Their values are existing snapshot-envelope strings, not another serialization format. No key enumeration, `clear`, legacy Godot import or access to unrelated keys is permitted. The key version does not bypass the codec's format/rules/content/RNG compatibility checks.

## Read-only recovery

`load()` acquires storage and independently reads/validates both slots. An acquisition failure is `{ok:false, reason:'storage', operation:'acquire', kind}`. Otherwise `{ok:true, inspection, selected}` means inspection completed, **not** that both slots are usable. Inspect each slot's `status` (`missing`, `valid`, `invalid`, `unavailable`); `selected` is null if neither validates.

A valid primary wins; otherwise a valid backup is offered with `selected.slot === 'backup'`. Callers must present the primary's invalid/missing/unreadable condition and any backup problem using `inspection`. A failed read is unknown, never missing. Each invalid slot retains its exact `text` and codec `reason`; valid slots retain both text and an owned decoded state. These original strings support later explicit export/recovery.

Loading never writes, deletes, promotes or repairs a slot. The existing 16,384 UTF-16-code-unit bound applies before JSON parsing, but reading a stored string necessarily materializes it first. Oversized strings stay unchanged; no truncation, normalization, logging or duplicate recovery archive is performed.

All storage effects return typed nonfatal errors identifying operation and slot where applicable, with `kind` quota/security/unavailable/other. Error classification does not rely on realm-specific `instanceof` checks and does not expose raw error messages or saved data.

## Writes and interrupted saves

`save(state)` encodes through the existing codec **before storage acquisition**. It freshly inspects both slots each time. An unreadable slot returns its storage error and prevents mutation. An invalid slot returns `{ok:false, reason:'recoveryRequired', inspection}`; both original strings are retained in place. A valid other slot does not grant permission to overwrite undecodable data. The caller's state/catalog/RNG is never changed.

For valid/missing slots, write ordering is:

1. With a valid primary, copy its exact validated text to backup, then publish the newly encoded primary. Backup write failure stops the operation before primary replacement.
2. With primary missing and backup valid, leave backup untouched and publish the new primary.
3. With both missing, first seed backup with the new encoded snapshot, then publish the same text as primary.

Success is `{ok:true}` only after primary publication returns successfully. On failure, stop and report the operation/slot; never attempt compensating deletes or rollback writes. A fresh load after backup preservation but before primary replacement sees the prior primary. If primary was absent, it can recover the retained/seeded backup. When the very first backup write fails, no saved state exists; in-memory play remains intact. A failed first primary write can leave the new state recoverable from backup, but the result still reports failure rather than claiming primary success.

This policy assumes one writer and individually atomic browser storage calls. Deterministic tests cover exceptions and interruption between calls; they do not prove disk durability, browser retention or concurrent-tab serialization. The backup may contain an older accepted boundary and does not promise zero progress loss.

## Explicit recovery removal

Use `removeSlot(slot, expectedText)` only after an explicit caller/user choice. `slot` is `primary` or `backup`; an untyped caller's unknown slot returns `invalidSlot` before storage access. `expectedText` is the exact previously inspected string (or null for inspected absence). Acquisition, re-read and removal are guarded. A different value returns `{ok:false, reason:'changed', slot, expectedText, text}` with no removal. A successful read of expected absence is idempotent success. Storage failures retain `expectedText` so even a later unreadable slot does not discard the prior recovery/export copy.

This primitive removes only that slot. Load/save never invoke it. The pre-removal read detects already changed data but is **not** atomic compare-and-swap; another tab can race it. Removing two slots can partially succeed. #73 must handle failed invalidation before wiring New battle/restart and must never interpret this API as an atomic reset or permission for an automatic destructive retry.

## Delivery boundary

Storage is synchronous, origin-scoped and best-effort. Browser policy/private mode, quota, eviction and other tabs can invalidate assumptions. This adapter does not provide cross-tab transactions, permanent retention or power-loss durability. #73 owns live hydration, accepted-command autosave, player-facing warning/recovery/export controls and safe restart invalidation. #74 owns browser lifecycle and physical-device certification. #58/#57 remain open.
