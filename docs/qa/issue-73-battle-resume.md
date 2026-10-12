# Issue #73: battle autosave and resume evidence

2026-10-12, Asia/Jerusalem. Implementation verification in progress on `branch/issue-73-battle-resume`, based on main `3f3792025f29716c977cbdebff9d1c94b750ec3c`. This report does not yet claim completion of the full browser suite.

## Acceptance mapping

1. **Validated hydration and continuation.** `tests/unit/battleSession.test.ts` compares actual hydrated and uninterrupted queues, events, states and next RNG at every accepted boundary for seeds 1–5, including seed 2/command 29. Shared fixtures cover Guarded, victory, defeat and 10,000-command exhaustion. Factory rejection, owned frozen state, empty transient state and nullable replay/explicit continuation diagnostics are checked. Browser startup remains read-only until Continue; player/enemy presentation reloads are compared to a separate uninterrupted browser context.
2. **Accepted-boundary autosave.** Session/coordinator tests prove one attempt per accepted player/enemy command before returning presentation, none for previews/cancel/rejection/acknowledgement, and exception containment. Browser tests compare the stored envelope with the unfinished presentation's committed state. Quota/read-denial failures leave real controls playable with unsaved status; retired sessions cannot dispatch or save.
3. **Accessible recovery.** `tests/battle-persistence.spec.ts` exercises keyboard Continue, Tab wrapping, touch recovery/dismissal, focus restoration, backdrop capture, 44px controls and screenshots. It checks backup selection with a broken primary, exact JSON export (oversized strings, null characters and a lone UTF-16 surrogate), cancelled and confirmed per-slot removal, changed-value refusal, invalid/future saves, unknown storage startup and retry, and unrelated-key preservation.
4. **Guarded replacement.** `tests/unit/battlePersistence.test.ts` injects failure at all nine invalidation acquisition/read/remove/final-inspection operations and all five first-save operations. No failed invalidation replaces the session or seed; retained text survives partial deletion. Duplicate confirmation, cancellation, final absence, stale values and uint32 seed wrap are covered. Actual browser controls cover partial removal failure, exact recovery export, changed data, cancel/retry and a failed fresh save followed by reload. The fallback is documented in [battle storage](../battle-storage.md): no visible replacement until both old slots are confirmed absent, with single-writer/atomic-call limits.
5. **Real-control lifecycle.** The existing legal seed 1 loss and seed 2 victory tests in `tests/battle-loop.spec.ts` now reload and Continue their actual completed saves, verify ended state and no historical cues, then restart. Existing audio/board/restart checks retain their original assertions and use the new explicit confirmation. The sound-on/off comparison explicitly clears only its two owned test slots between independent fresh histories. Controlled-clock player/enemy reload tests use real actions in both interrupted and uninterrupted browser contexts. Injected storage failures are recovery evidence, not proof of legal full-battle completion.

## Completed checks

- `npm run test:unit`: 419 tests passed across 29 files.
- `npm run validate:content`: 77 tests passed.
- `npm run typecheck`: both TypeScript configurations passed.
- `npm run build`: passed; existing Phaser chunk-size warning remains.
- Focused desktop checks: three HUD/touch/modal cases passed; after repairs, four reload/focus/paused-restart cases passed. The earlier new persistence run had eight passes and two failures, repaired as described below.
- `npm test -- --reporter=line,json`: all 255 configured cases are currently running, one worker, normal configured timeouts. Raw local output is `tmp/issue-73/full-browser.log` and JSON is `tmp/issue-73/full-browser.json`.

Host: Windows, Node runtime on PATH; Edge `155.0.4283.45` via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The repository's desktop, Pixel 7 portrait and 915×412 landscape profiles are unchanged. An ignored `tmp/tools/npm.cmd` points to the installed npm CLI because npm is absent from PATH. No test configuration, dependency or timeout was changed to obtain these results.

## Repairs discovered during verification

- Native dialog focus could leave the document after the last button: the shared modal now wraps Tab/Shift+Tab at its boundaries.
- Navigation's hidden event cancelled the current animation and could pump one more enemy command before unload: enemy dispatch now checks visibility, and visibility return resumes the pending decision once. The paired browser reload regression passed after this repair.
- A restart test held RAF paused while waiting for the queued Phaser restart. Its shared confirmation helper now lets the clock-owning caller resume before checking the new scene; no runtime timeout was increased.

## Scope and limits

The codec, save identity, AI/combat/RNG policy and storage adapter remain unchanged. No alternate history format, importer, tombstone, background save loop or multi-tab lock was introduced. Ordinary in-memory play survives failed saves; denied storage can deliberately prevent startup/replacement when old data cannot be ruled out. JSON recovery export is not an import feature. Physical persistence/lifecycle certification belongs to #74; #57/#58 remain open. No physical-device test, hosted deployment, merge, release tag or production operation is claimed.
