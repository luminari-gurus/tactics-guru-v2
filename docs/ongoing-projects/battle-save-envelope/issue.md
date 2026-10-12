# P1: Specify and validate the bounded battle-save envelope

Parent: #58, work package 1. This is the platform-independent schema investigation that #58 explicitly permits against merged main before full first-battle/device acceptance.

## Outcome
Specify one bounded, versioned battle-save envelope and validate a pure codec/contract prototype for it. Compare snapshot and accepted-command replay using the existing domain, choose one representation from measured size/reconstruction costs, and provide the contract needed by later storage and resume integration.

## Acceptance
- [ ] Compare snapshot and replay candidates on the same pinned code/catalog and deterministic fixtures, including a normal authored battle and the existing 10,000-command bound. Retain serialized size, encode/decode/reconstruction timings and conditions; select one representation with an explicit rationale. No unsupported mobile performance claim.
- [ ] Define the envelope identity, independent save format version, rules/content/RNG versions, exact payload shape, serialization/canonicalization, integrity-digest coverage and finite input/collection limits. The digest detects accidental corruption, not authenticity or cheating.
- [ ] Implement a pure, unused-by-the-UI codec/validation prototype using existing domain validators, canonical hashing and replay where appropriate. Reject malformed/oversized/unsafe-number/unknown-ID/invariant-invalid/corrupt/future or incompatible data before exposing a restored state. Validate replay semantics, not just command shapes.
- [ ] Round-trip accepted player and enemy boundaries to identical state, next legal command result, next RNG output/cursor and enemy decisions. Include ongoing and ended battles and a boundary captured during presentation; exclude pending preview, animation, DOM/Phaser/audio objects and callbacks.
- [ ] Validation/decoding is non-mutating and returns an explicit failure without deleting or replacing the caller's original data. Use deterministic fixtures for version/content/rules/RNG changes and corruption; do not implement speculative migration machinery.
- [ ] Document the future storage boundary and acceptance left in #58: namespaced storage, last-known-good backup/interrupted writes, quota/security failures, Continue/recovery/reset/export UI, restart invalidation, real-browser lifecycle and physical-device certification. No localStorage access, live session hydration, runtime autosave, UI, Godot importer or run/reward model is part of this child.
- [ ] Meaningful focused fixtures, the domain boundary, configured unit/content checks, both typechecks, production build, configured browser regressions and strict OpenSpec/whitespace checks pass. Report actual commands/results; pure-contract tests do not certify live browser persistence.

## Readiness and device scope
Merged main provides BattleState/Replay, strict domain readers, deterministic replay, content/rules/RNG versions, canonical SHA-256 and legal battle fixtures. #58 has no existing child or native blocker at selection. No physical mobile device is required for this child's full acceptance; local CAN_TEST_MOBILE=android therefore does not block it. The full #58 epic and its release/device gates remain open.

## Delivery
Start from current origin/main, not an unmerged task branch. Keep the pure contract separate from browser adapters and retain only the selected representation after the comparison. No dependency/toolchain changes, deployment changes, combat-rule changes, broader persistence feature or closure of #58. The current assignment covers planning and branch publication first; implementation follows review of the concrete plan.
