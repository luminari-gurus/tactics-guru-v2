# Battle save format 1

Source audit: `b343ab02ae033a57f8c5f613f07883764f0752c0`, extended by qualified Shaman source `f4616ae301da4be133455334d4c2b38e3583c8f7`. The standalone wrapper remains format 1, containing battle state format 5 / rules 6; the run envelope is 7 and dungeon envelope is 9. RNG remains 1. Earlier formats, including dungeon 7/8, are incompatible and preserve original bytes for recovery/export.
The bounded active `markedBy`, `tauntedBy`, `movementBlock`, and `weakenedBy` references are validated against eligible living sources and remain battle-local. See [current effect rules](combat-effects.md)
and [progression compatibility](hero-progression.md#save-compatibility). The
procedural-format section below records its historical introduction.

This is the pure contract for [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69), the schema child of [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58). The [#72 storage adapter](battle-storage.md) calls `src/domain/saveEnvelope.ts`; the codec itself remains pure. Successful decoding returns an owned domain state; it does not resume a live session or access storage.

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

`format` is the independent **save format** version. The payload has exactly the existing BattleState keys: `format`, `versions`, `seed`, `rng`, `mapId`, `units`, `initiative`, `activeIndex`, `round`, `outcome`, `commandCount`. Its `format` must equal `STATE_FORMAT_VERSION` (5). `versions` has exactly `rules`, `rng`, and `content`; the first two match `RULES_VERSION` (6) and `RNG_VERSION` (1), and `content` equals `contentVersion(trustedCatalog)`. Content identity includes rules-relevant catalog data and excludes art. Compatibility is exact; future/older/different identities fail explicitly. A format number alone cannot override rules/content/RNG compatibility.

Units retain `id`, `defId`, `side`, `{x,y}` cell, HP, `hasMoved`, `hasActed`, and bounded optional combat effects and resources. See [combat effects](combat-effects.md) for the enabled fields and their ownership/lifetime constraints. Initiative contains every unit ID exactly once. RNG retains exactly four uint32 `words` and its raw-draw `cursor`. The reader enforces catalog spawns/definitions, map bounds, living walkable/non-overlapping positions, valid active unit, HP and outcome consistency, and the RNG cursor/counter relationship. Refer to [battle.ts](../src/domain/battle.ts) and [types.ts](../src/domain/types.ts) for the shared authoritative shape. It does not infer the command history from a snapshot.

## Serialization and integrity

Encode uses the existing `canonical`: recursively sorted object keys, preserved array order, compact JSON, safe integer numbers and JSON string escaping. The digest is existing pure SHA-256 of the UTF-8 canonical JSON of **`{kind, format, payload}`**. The `digest` field itself is excluded; every other field is covered. Digest calculation occurs only after bounded domain validation. Decode accepts JSON property reordering/whitespace and canonicalizes the validated parsed values; standard JSON.parse duplicate-name/number semantics apply. Re-encoding emits one canonical representation.

The digest detects accidental corruption. Anyone can recompute it; it provides no authentication, secrecy, anti-cheat guarantee or proof that a state was reached legally. Structurally valid illegal replays fail the comparison's semantic replay validator, and all replay envelopes are unsupported by this snapshot decoder.

## Finite input and collection limits

- Input text: at most **16,384 JavaScript UTF-16 code units**, checked before JSON parsing. This is not a UTF-8 byte quota. Even noncanonical whitespace and escape sequences count against the input limit.
- Map identifier: at most **128 code units**, valid `map:` syntax and present in the trusted catalog. Longer catalog IDs are unsupported by this format.
- Units and initiative: 1–64 entries, exactly the selected map's spawn count; IDs 1–64, units ordered by ID, initiative unique. No command array or event history is stored.
- Command count: 0–10,000. Coordinates: 0–31 and within the map. HP: 0 through the unit definition's max (content max 100). RNG words/seed: 0–4,294,967,295. Cursor: 0–Number.MAX_SAFE_INTEGER; round: 1–Number.MAX_SAFE_INTEGER. All numbers are finite safe integers.
- All record keys/arrays are exact/dense; unknown fields, IDs, nested objects in scalar fields and unsupported versions fail. Unit definition IDs and side/outcome strings are fixed enums. RNG has exactly four words; versions has exactly three fields; all other object structure has fixed depth.

The original #69 size estimates and supported-limit fixture describe its then-current unit shape, not a new maximum-size proof for later effects. The encoder and decoder enforce the 16 Ki code-unit limit; oversize text is rejected. A deeply nested malformed input has the pre-parse bound and fails the fixed-shape reader before recursive hashing.

## API and failures

`encodeBattleSave(state, catalog)` returns `{ok:true, text}` or `{ok:false, reason}`. It validates an unknown state before hashing and never mutates it. `decodeBattleSave(text, catalog)` returns `{ok:true, state}` only after size, parse, envelope identity, compatibility, full state and integrity checks. Both require a previously validated, immutable catalog; the catalog is not part of untrusted save text. The existing content identity cache assumes immutable catalogs; build a new catalog object for changed content.

Failure reasons are `tooLarge`, `invalidJson`, `invalidEnvelope`, `incompatible`, `invalidState`, and `corrupt`. They identify the first failing stage, so damaged state fields may report `invalidState` before a digest mismatch. Failures contain no partial state. The caller retains the exact original text and any prior state/catalog; no deletion, replacement, fallback write, exception-based recovery or migration is performed. Encoders validate domain states, not arbitrary storage/session objects.

## Capture and later adapter boundary (#58)

Capture `BattleSession.state` after an accepted command. It already contains the committed result while `phase === 'presenting'`. A pending preview/rejected intent changes neither state nor RNG. The snapshot excludes previews, callbacks, animation tokens/queues, events, DOM, Phaser and audio objects. Restoring a state must not replay presentation or draw extra RNG. Ended outcomes and the command-limit boundary remain ended/exhausted.

The #73 integration provides `BattleSession.fromSnapshot(catalog, input, accepted?)`, a fallible factory that revalidates the domain state, owns/freezes its copy, and derives player/enemy/ended phase with empty transient state. It can reconstruct transient controls/presentation from the accepted state and use `planEnemyTurn(state, activeId, catalog)` to regenerate the remaining enemy plan. Its ordered policy is optional move, optional attack, then Wait. After validation, `hasActed: true` returns only Wait, including an attack with unused movement. After movement, only the new origin is available and the unchanged attack scores/targets select the same attack or Wait; before either action, the full plan is reproducible. Check terminal/command-limit failures instead of inventing a further action. The current flags therefore suffice for this policy; no pending command or queue is serialized. Any future enemy policy that depends on hidden decisions must revisit this contract and its compatibility identity.

The continuation tests compare decoded presentation snapshots against the **uninterrupted session's actual queued command, events and resulting state**, including seed 2/command 29 (archer 5 attacks without moving and must next Wait). Full authored battles for seeds 1–5 cover every accepted boundary. The original session's replay history is **not** contained in this snapshot; do not pass a mid-battle snapshot as `Replay.initial`, which requires an exact seed-created start. Fresh sessions expose a complete `replay`. Resumed sessions expose `replay: null` and `continuation: {snapshot, commands, events}`, recording only post-resume commands/events. Neither hydration nor diagnostic reads generate history, sounds or RNG draws. Session tests compare actual hydrated and uninterrupted queues for every boundary across seeds 1-5; browser coverage is recorded separately in the issue #73 QA report.

The [#72 adapter](battle-storage.md) supplies Phaser-namespaced primary/backup storage, guarded failures, raw-data preservation and documented interrupted-write ordering without changing this pure codec. The #73 coordinator connects it to hydration, autosave, Continue/recovery/export controls and guarded restart invalidation. The original #74 certification evidence retains its recorded device limits; current device acceptance follows [verification policy](verification-policy.md). Persistence is origin-scoped and best-effort. No live UI, Godot importer, run/reward model, deployment or parent-epic closure belongs to this codec contract.

## Procedural run snapshots: format 2 (historical introduction)

Run snapshots now require `{items, activeBattle, battlefield}`. `battlefield` is
null without an active battle. Authored descriptors contain `encounterId`, `kind`,
`mapId`, `mapHash`; generated descriptors also contain `layoutSeed`, `biome`,
`generatorVersion`, `profileVersion`. Exact keys and bounded IDs/hashes are checked
before canonical comparison; no geometry is accepted from saved input.

Restoration validates run/items, derives the expected encounter seed and complete
map from trusted source configuration, compares the descriptor/full-map hash,
projects equipment and surviving heroes, then hydrates battle state. Source
configuration contributes to the run envelope identity. The existing 32,768-code-
unit cap and digest remain unchanged. Regression tests cover maximum inventory,
roster and numeric widths within this cap.

Run replay records carry the same descriptor alongside the existing replay fields.
Canonical entry construction rejects altered source, seed, hash, HP, equipment,
roster and initiative. Resumed session continuation records carry the descriptor
and accepted snapshot/commands; they do not fabricate a full pre-resume replay.
Committed events, audio, animation and rewards are not replayed on Continue.

Run format 1, unsupported source versions and rules version 1 are incompatible.
No migration or generator-version registry is provided. Existing recovery/export
controls preserve original primary/backup bytes until explicit removal/reset.
For rollback, restore authored source configuration and report incompatible run
identities; export retained bytes before choosing Start new run. Do not convert,
delete or silently resolve a saved recipe with a different generator. Independent
single-battle storage keeps its existing namespace and recovery behavior; the rules
version change explicitly rejects its old autonomous-decision saves too.
