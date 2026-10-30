# Guarded local battle storage

Source reference: `b343ab02ae033a57f8c5f613f07883764f0752c0`. Original implementation and verification notes describe their named historical slices; see [current gameplay overview](../README.md) and linked contracts for later integration.

[#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72) adds a storage adapter around the [accepted snapshot codec](battle-save-format.md). The adapter itself does not hydrate a session; #73 integrated autosave and Continue controls as described below. The caller supplies a validated immutable catalog and can continue in-memory play when persistence fails.

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

## Live battle controls (#73)

`BattlePersistence` owns one app lifecycle and composes this adapter with `BattleSession`. Startup only inspects: a compatible primary offers Continue; a backup is labelled recovery with possible lost progress. Invalid/unreadable data stays in place. If both slots are confirmed absent, seed 1 starts normally and its initial state is saved. If storage cannot be read and no valid candidate exists, Retry storage is required before starting; the app never silently replaces unknown saved data.

Each accepted player/enemy command invokes one synchronous save callback before presentation. Previews, rejection, cancellation, acknowledgements and hydration never write. A failure leaves the accepted in-memory battle playable and the Save recovery status says progress is unsaved. Retry storage saves the current state when safe. A damaged other slot continues to block autosave until explicitly removed. No automatic destructive retry occurs.

Save recovery offers exact-data JSON export and per-slot removal with a second confirmation. The download contains `slots: [{slot, text}]`; JSON escaping preserves original strings including lone UTF-16 surrogates and oversized data. This is a recovery export, not a supported import format. A changed value is refused and requires fresh review. No raw save text is inserted into HTML or logged.

Toolbar restart, action-dialog restart, outcome restart and New battle share one confirmation and replacement gate. The app prepares the next seed (current or selected saved seed + 1 modulo 2^32; seed 1 if no valid state exists), removes the inspected backup then primary using exact expected values, then reinspects both. Only confirmed absence commits the new session and seed. Duplicate confirmations are consumed once. Old callbacks cannot save after replacement.

If removal or final inspection fails, the current battle and seed remain; the UI reports incomplete reset, retains inspected raw copies for export (including partially deleted slots), and offers review/retry/cancel. Partial deletion is not rolled back and is never described as a transaction. After successful invalidation, a failed first fresh save can leave only the new battle or no save; the old battle cannot reappear under the single-writer, individually atomic storage-call assumptions. Storage denial can therefore block replacement while an existing battle continues. Use one active battle tab. This is origin-scoped best-effort retention, with physical lifecycle acceptance still owned by #74.

## Browser history

Leaving a battle document (`pagehide`) synchronously shuts down its scene, disposing the live session, presentation callbacks, audio and recovery controls. A return from the back/forward cache reloads the same URL through startup. Current saved slots are inspected again and Continue or recovery requires a fresh choice before play resumes. This prevents an old history entry from autosaving over a replacement battle created later in the same tab, including after scene restarts or when a recovery dialog was cached.

The reload does not itself write or remove existing slots. With both slots absent, the normal fresh-start rule applies. A successful Continue uses the current saved boundary; accepted enemy commands may subsequently autosave as usual. Normal hide/show without navigation keeps the live session. A cached return incurs a reload and can recover only saved progress; the existing warning for failed saves remains significant. This does not add concurrent-tab ownership or physical-device certification.

## Delivery boundary

Storage is synchronous, origin-scoped and best-effort. Browser policy/private mode, quota, eviction and other tabs can invalidate assumptions. This adapter does not provide cross-tab transactions, permanent retention or power-loss durability. #73 owns live hydration, accepted-command autosave, player-facing warning/recovery/export controls and safe restart invalidation. Historical #74/#58/#57 acceptance records retain their original results; see [verification policy](verification-policy.md) for current device acceptance.
