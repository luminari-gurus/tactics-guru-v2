# Battle-save envelope implementation plan

## Scope and status

Implementation authorized by the user's 2026-10-11 request. Working in the existing clean issue worktree, with main refreshed and unchanged at `e955e9d`. OpenSpec apply is ready (7/9). Snapshot codec and format/adapter contract are implemented. Sixteen save tests, 89 focused domain/session tests and both typechecks pass. Current task: configured full unit/content/build/browser gates, final audit and PR publication. The planning-only statements below describe the original publication, now superseded by this authorization. Keep this section and the root handoff current after each implementation stage.

Progress: task 1.1 complete. Eight shared fixtures build successfully and replay to their independently captured states; typecheck passed. The first comparison selects snapshots because replay reaches roughly 301 KB and 564 ms median decode at 10,000 commands versus roughly 1.1 KB and 0.07 ms for snapshots on this host. Commit the harness, retain a pinned run, then specify/implement the selected contract. See [QA report](../../qa/issue-69-save-envelope.md).

[Issue #69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69) is a child of [#58: Safe local battle save and resume](https://github.com/luminari-gurus/tactics-guru-v2/issues/58), implementing its first work package: a bounded versioned save contract selected from measured snapshot/replay costs. The issue's acceptance criteria are preserved in [issue.md](issue.md).

Prepared on 2026-10-11 against main `e955e9d9f182a76f057ea69057c7a1ac6c0bd682`. The user explicitly approved creating and claiming this child and publishing the prepared plan. #69 is open, labelled `ready for work`, assigned to `moshehbenavraham`, and linked natively under #58. The [claim comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/69#issuecomment-6111209952) records the scope.

Published branch: [work/issue-69-save-envelope](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-69-save-envelope), based on that main revision and natively linked in #69's Development section. OpenSpec change: [battle-save-envelope](../../../openspec/changes/battle-save-envelope/). The full #58 epic remains open. This publication contains planning only; implementation remains unstarted and requires a subsequent implementation request.

## Selection and device eligibility

Before creating #69, the refreshed repository inventory contained seven open issues and one open deployment PR (#12). #68 is ready but assigned to `dubstylee` with an existing branch. #64 and #66 require physical iOS access; #57 is their acceptance parent. #58–#60 are epics that explicitly call for scoped children. #59 requires save/resume and reward contracts; #60 requires the initial RunState/reward contract. No parent was promoted merely to make an issue available.

#58 explicitly permits schema investigation against merged main before the remaining acceptance gates. Its save contract supplies the foundation for later storage, session hydration and run persistence. Selecting this existing work package preserves the parent’s complete scope instead of claiming the whole epic from a pure-code result.

Local `CAN_TEST_MOBILE=android`. This child's complete acceptance requires **no physical mobile platform**: it is a pure contract/codec investigation, without browser storage, live-session hydration or UI. Later children retain all browser and physical-device acceptance. The earlier Android-certification draft is not selected.

The public repository Projects page previously showed no linked projects; authenticated project-only drafts could not be enumerated because the credential lacks `read:project`. Repository issues were fully enumerated. No existing ready unclaimed non-iOS standalone issue or save-contract branch was found before creating this approved child.

## Current implementation

- [BattleSession](../../../src/app/BattleSession.ts) records an immutable initial state and accepted player/enemy commands. Its `state` and `replay` already reflect the committed command while presentation is running. Pending intent, presentation tokens and the enemy queue are transient.
- [battle.ts](../../../src/domain/battle.ts) provides strict `readBattleState` and `readReplay` readers. The replay reader validates shape and bounds; it does not establish semantic validity.
- [turns.ts](../../../src/domain/turns.ts) provides `replayBattle`, checks the initial state against map/seed creation and dispatches every command. It is the semantic replay check to reuse.
- [constants.ts](../../../src/domain/constants.ts) separates state/rules/RNG versions and bounds accepted commands at 10,000. [types.ts](../../../src/domain/types.ts) contains the serializable state/replay shapes.
- [contentIdentity.ts](../../../src/domain/contentIdentity.ts) supplies sorted-key canonical JSON and pure SHA-256; content identity excludes presentation assets. Hash only validated, bounded data. A checksum is not authentication.
- [Existing turn tests](../../../tests/unit/turns.test.ts) cover replay equivalence, forged starts, duplicate/illegal commands and a maximum-map 10,000-command replay. Their five-second assertion is an existing host test, not a mobile reconstruction budget.
- [The domain boundary](../../../tsconfig.domain.json) excludes DOM and Node ambient types; [boundary tests](../../../tests/unit/domainBoundary.test.ts) reject external imports and entropy sources. Keep the new pure code within that enforcement.

## Outcome, files and non-goals

Deliver one documented save representation, a bounded pure encoder/decoder prototype, deterministic fixtures and reproducible size/reconstruction measurements. It remains unused by the game UI in this child.

Expected files: `src/domain/saveEnvelope.ts`, `tests/unit/saveEnvelope.test.ts`, existing battle-session/turn/boundary tests only where a real gap exists, one small `scripts/measure-save-envelope.ts` comparison harness, `docs/battle-save-format.md`, and a task-numbered QA report/raw measurements. Reuse existing domain helpers; do not create a second serializer, RNG, replay engine or validation framework.

Exclude localStorage, backup writes, quota/security adapters, autosave hooks, live BattleSession restore, Continue/recovery/reset/export UI, restart invalidation, arbitrary file import, Godot conversion, migration registry, cloud services, run/reward state, dependencies, deployment and iOS testing. These are distinct later #58 work packages, not waived acceptance.

## Implementation sequence

1. **Fix the comparison inputs.** Pin source/catalog identity and build deterministic fixtures from existing domain dispatch/session flows: empty start, accepted player and enemy boundaries, a committed state captured during presentation, active Guarded state, legal win/loss and the 10,000-command bound. Retain commands and final state together for independent comparison. Use valid existing catalog limits rather than inventing larger unsupported worlds.
2. **Measure both candidates, then retain one.** Compare a validated current snapshot with an initial-state/accepted-command replay representation on the same fixtures. Include envelope/digest overhead, string code-unit count, UTF-8 byte count, encode/parse/validate/reconstruct timings, repetitions, exact host/runtime and raw results. Avoid timing assertions that manufacture a performance guarantee. Prefer existing replay when its measured cost is suitable; choose snapshot if measured reconstruction cost justifies it. Record the choice and remove the unused runtime prototype rather than support two permanent formats.
3. **Write the contract.** Define an envelope discriminator and save-format version independent of state/rules/content/RNG versions. Specify one exact payload shape, version compatibility, canonical digest inputs (excluding the digest field), and explicit finite text/array/collection limits derived from supported fixtures and domain bounds. State whether the limit is UTF-16 code units or UTF-8 bytes and enforce it consistently. No timestamp, application version, alternate mode or extension mechanism without a concrete consumer.
4. **Implement pure validation and codec behavior.** Accept serialized text as the trust boundary. Check its size before parsing, validate the envelope/version and bounded payload before hashing or reconstruction, reject corruption/incompatibility, and reuse the existing state/replay validators. Replay payloads require semantic replay execution. Return a typed result with a validated domain state or explicit failure; never mutate the caller's state/catalog/text or access browser storage. Reject future/incompatible versions rather than guessing migrations.
5. **Prove continuation.** For each accepted boundary, compare original and round-tripped state, the next legal command result, next RNG output/cursor and deterministic enemy plan. Include ended states (no legal next battle action), empty/max logs, rejected commands, transient previews and presentation. Corrupt/oversized/unsafe-number/unknown-ID/invariant-invalid payloads and format/rules/content/RNG changes need meaningful fixtures and failure assertions; verify decoding consumes no extra RNG.
6. **Document the adapter boundary.** Explain how a later adapter can preserve the original failing text, maintain backup/interrupted-write safety and handle unavailable storage. Document accepted-command capture and the future session-hydration contract without implementing it. Keep namespaced keys, restart invalidation, recovery UI, real-browser upgrades and physical-device checks in #58. Do not claim successful live resume from a pure decoder result.
7. **Validate and report.** Run focused save/turn/session/RNG/AI/boundary fixtures first, then configured unit/content checks, both typechecks, production build and browser regressions; run strict OpenSpec and whitespace validation. Retain actual commands/results, fixture identities and raw comparison evidence. A later implementation PR references only the child and must not close #58.

## Acceptance mapping

- AC1: comparison harness and raw measurements select one representation with measured size/reconstruction rationale, including the 10,000-command case.
- AC2: format document and codec constants define exact versions, canonicalization/digest coverage, shape and bounds.
- AC3: pure codec rejection fixtures cover trust-boundary failures and semantic replay; no state reaches a session or UI.
- AC4: boundary fixtures demonstrate state/next-command/RNG/enemy equivalence, including player, enemy, presentation and ended cases.
- AC5: frozen inputs and exact original-text assertions prove non-mutation; incompatible fixtures fail explicitly without migration/deletion.
- AC6: adapter-boundary documentation enumerates remaining #58 scope; imports/build checks prove no runtime persistence integration.
- AC7: focused and configured validation plus strict OpenSpec and whitespace checks, with truthful scope of evidence.

## Risks and review decisions

Snapshot versus replay is an internal representation decision to make from the required comparison; neither choice is predetermined by convenient tests. Snapshot validation proves defined state invariants, not anti-cheat reachability. Replay validation costs scale with the accepted log, and the current maximum is material. Bound malformed data before expensive work and keep validation failures non-destructive.

A domain-state round trip does not prove that a later live session resumes a queued enemy turn correctly; that integration belongs to the next child. Platform-independent results do not certify browser storage behavior. Refresh main before publication and later implementation; avoid overlapping #68's renderer work.

The plan is minimal because it reuses the existing domain and limits this child to the already-planned save-contract foundation. No runtime feature, tests or benchmark has been implemented or run by this planning task.

## Planning validation

OpenSpec 1.14.1 strict validation passed. All four required OpenSpec artifacts exist; implementation tasks remain unchecked. All 16 relative Markdown links resolve, and planning-file whitespace checks pass. Application test suites and benchmarks are reserved for implementation; this publication changes documentation only.
