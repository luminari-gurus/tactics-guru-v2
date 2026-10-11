# Battle save format 1

This is the pure contract for [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69), the schema child of [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58). `src/domain/saveEnvelope.ts` has no application caller. Successful decoding returns an owned domain state; it does not resume a live session or access storage.

## Representation decision

Use a **current BattleState snapshot**. The [pinned comparison](qa/issue-69/comparison.json) at `bc53bba1afe6f3ec24ec416f22eb0fa78dd508e6` compares eight identical state/log fixtures and catalog identities. Empty snapshots are 1,112–1,113 bytes versus 1,262–1,263 for replay; legal win/loss snapshots are 1,123/1,122 bytes versus 3,356/5,954 for replay. At the existing 10,000-command bound, snapshot is 1,130 bytes with about 0.07 ms median decode; replay is 301,272 bytes with about 703 ms median decode. The [QA report](qa/issue-69-save-envelope.md) describes methodology and limitations. Sizes include envelope/digest overhead. UTF-8 bytes equal UTF-16 code units for these ASCII fixtures.

Snapshots keep reconstruction independent of command history and preserve the existing state validator. The replay candidate remains only in the measurement harness, using `readReplay` plus **semantic** `replayBattle`. No replay save encoder/decoder, alternate payload flag or migration registry is shipped. A snapshot proves the reader's structural/state invariants, not historical reachability; it is not an anti-cheat artifact.

## Exact envelope

The only root keys are `kind`, `format`, `payload`, and `digest`:

```typescript
{
  kind: 'tactics-guru:battle-snapshot',
  format: 1,
  payload: BattleState,
  digest: 'sha256:' + 64 lowercase hexadecimal characters
}
```

`format` is the independent **save format** version. The payload has exactly the existing BattleState keys: `format`, `versions`, `seed`, `rng`, `mapId`, `units`, `initiative`, `activeIndex`, `round`, `outcome`, `commandCount`. Its `format` must equal `STATE_FORMAT_VERSION` (currently 1). `versions` has exactly `rules`, `rng`, and `content`; the first two match `RULES_VERSION`/`RNG_VERSION` (currently 1), and `content` equals `contentVersion(trustedCatalog)`. Content identity includes rules-relevant catalog data and excludes art. Compatibility is exact; future/older/different identities fail explicitly. A format number alone cannot override rules/content/RNG compatibility.

Units retain `id`, `defId`, `side`, `{x,y}` cell, HP, `hasMoved`, `hasActed`, and optional `guarded: true` only for a player fighter. Initiative contains every unit ID exactly once. RNG retains exactly four uint32 `words` and its raw-draw `cursor`. The reader enforces catalog spawns/definitions, map bounds, living walkable/non-overlapping positions, valid active unit, HP and outcome consistency, and the RNG cursor/counter relationship. Refer to [battle.ts](../src/domain/battle.ts) and [types.ts](../src/domain/types.ts) for the shared authoritative shape. It does not infer the command history from a snapshot.

## Serialization and integrity

Encode uses the existing `canonical`: recursively sorted object keys, preserved array order, compact JSON, safe integer numbers and JSON string escaping. The digest is existing pure SHA-256 of the UTF-8 canonical JSON of **`{kind, format, payload}`**. The `digest` field itself is excluded; every other field is covered. Digest calculation occurs only after bounded domain validation. Decode accepts JSON property reordering/whitespace and canonicalizes the validated parsed values; standard JSON.parse duplicate-name/number semantics apply. Re-encoding emits one canonical representation.

The digest detects accidental corruption. Anyone can recompute it; it provides no authentication, secrecy, anti-cheat guarantee or proof that a state was reached legally. Structurally valid illegal replays fail the comparison's semantic replay validator, and all replay envelopes are unsupported by this snapshot decoder.

## Finite input and collection limits

- Input text: at most **16,384 JavaScript UTF-16 code units**, checked before JSON parsing. This is not a UTF-8 byte quota. Even noncanonical whitespace and escape sequences count against the input limit.
- Map identifier: at most **128 code units**, valid `map:` syntax and present in the trusted catalog. Longer catalog IDs are unsupported by this format.
- Units and initiative: 1–64 entries, exactly the selected map's spawn count; IDs 1–64, units ordered by ID, initiative unique. No command array or event history is stored.
- Command count: 0–10,000. Coordinates: 0–31 and within the map. HP: 0 through the unit definition's max (content max 100). RNG words/seed: 0–4,294,967,295. Cursor: 0–Number.MAX_SAFE_INTEGER; round: 1–Number.MAX_SAFE_INTEGER. All numbers are finite safe integers.
- All record keys/arrays are exact/dense; unknown fields, IDs, nested objects in scalar fields and unsupported versions fail. Unit definition IDs and side/outcome strings are fixed enums. RNG has exactly four words; versions has exactly three fields; all other object structure has fixed depth.

The 16 Ki cap has room for the domain's 64 units: each canonical unit occupies fewer than 160 code units even with Guarded and maximal numeric fields; initiative is under 200, and the remaining fixed fields plus a 128-character map ID are under 1 Ki. This is below 12 Ki total. The smaller measured six-unit snapshots are not used as a universal worst-case estimate. A supported-limit fixture exercises 64 units, the maximum map ID, counters and text cap. A deeply nested malformed input still has the pre-parse bound and fails the fixed-shape reader before recursive hashing.

## API and failures

`encodeBattleSave(state, catalog)` returns `{ok:true, text}` or `{ok:false, reason}`. It validates an unknown state before hashing and never mutates it. `decodeBattleSave(text, catalog)` returns `{ok:true, state}` only after size, parse, envelope identity, compatibility, full state and integrity checks. Both require a previously validated, immutable catalog; the catalog is not part of untrusted save text. The existing content identity cache assumes immutable catalogs; build a new catalog object for changed content.

Failure reasons are `tooLarge`, `invalidJson`, `invalidEnvelope`, `incompatible`, `invalidState`, and `corrupt`. They identify the first failing stage, so damaged state fields may report `invalidState` before a digest mismatch. Failures contain no partial state. The caller retains the exact original text and any prior state/catalog; no deletion, replacement, fallback write, exception-based recovery or migration is performed. Encoders validate domain states, not arbitrary storage/session objects.

## Capture and later adapter boundary (#58)

Capture `BattleSession.state` after an accepted command. It already contains the committed result while `phase === 'presenting'`. A pending preview/rejected intent changes neither state nor RNG. The snapshot excludes previews, callbacks, animation tokens/queues, events, DOM, Phaser and audio objects. Restoring a state must not replay presentation or draw extra RNG. Ended outcomes and the command-limit boundary remain ended/exhausted.

Future integration must provide a deliberate session hydration path: reconstruct transient controls/presentation from the accepted state and regenerate/validate remaining enemy decisions. The original session's replay history is **not** contained in this snapshot; do not pass a mid-battle snapshot as `Replay.initial`, which requires an exact seed-created start. Decide later how post-resume diagnostics record history. Pure enemy-decision equivalence does not certify live queue resumption.

Remaining #58 acceptance is explicit: namespaced storage keys; last-known-good backup and interrupted-write recovery; quota/security/unavailable-storage failures; Continue/recovery/reset/export controls; deliberate restart invalidation; real-browser refresh/background/upgrade/lifecycle behavior; and physical-device certification. A later adapter must retain undecodable original text for recovery/export and must not overwrite the last good save merely because a load failed. Storage atomicity, backup ordering and UX require their own implementation and evidence. No localStorage, runtime autosave, live hydration, UI, Godot importer, run/reward model, deployment or parent-epic closure belongs to this contract.
