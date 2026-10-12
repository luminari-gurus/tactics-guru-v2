# Issue #73: battle autosave and resume evidence

This is the original implementation evidence. The [PR #95 review repair record](issue-92-public-asset-base.md) covers the later rebase onto merged map routing, public asset-base correction and integrated verification.

2026-10-12, Asia/Jerusalem. Implementation verified on `branch/issue-73-battle-resume`, based on main `3f3792025f29716c977cbdebff9d1c94b750ec3c`. Runtime implementation: `05f2d84937ee22ca1e47c690a2f7e141614a942e`. Final test additions: `f92da65440b39a8b45cca7e51b61b2342563836f`. Later handoff/evidence commits do not change runtime behavior.

## Acceptance mapping

1. **Validated hydration and continuation.** `tests/unit/battleSession.test.ts` compares actual hydrated and uninterrupted queues, events, states and next RNG at every accepted boundary for seeds 1–5, including seed 2/command 29. Shared fixtures cover Guarded, victory, defeat and 10,000-command exhaustion. Factory rejection, owned frozen state, empty transient state and nullable replay/explicit continuation diagnostics are checked. Browser startup remains read-only until Continue; player/enemy presentation reloads are compared to a separate uninterrupted browser context.
2. **Accepted-boundary autosave.** Session/coordinator tests prove one attempt per accepted player/enemy command before returning presentation, none for previews/cancel/rejection/acknowledgement, and exception containment. Browser tests compare the stored envelope with the unfinished presentation's committed state. Quota/read-denial failures leave real controls playable with unsaved status; retired sessions cannot dispatch or save.
3. **Accessible recovery.** `tests/battle-persistence.spec.ts` exercises keyboard Continue, Tab wrapping, touch recovery/dismissal, focus restoration, backdrop capture, 44px controls and screenshots. It checks backup selection with a broken primary, exact JSON export (oversized strings, null characters and a lone UTF-16 surrogate), cancelled and confirmed per-slot removal, changed-value refusal, invalid saves and a well-formed future-version envelope rejected as incompatible, unknown storage startup and retry, and unrelated-key preservation.
4. **Guarded replacement.** `tests/unit/battlePersistence.test.ts` injects failure at all nine invalidation acquisition/read/remove/final-inspection operations and all five first-save operations. No failed invalidation replaces the session or seed; retained text survives partial deletion. Duplicate confirmation, cancellation, final absence, stale values and uint32 seed wrap are covered. Actual browser controls cover partial removal failure, exact recovery export, changed data, cancel/retry and a failed fresh save followed by reload. The fallback is documented in [battle storage](../battle-storage.md): no visible replacement until both old slots are confirmed absent, with single-writer/atomic-call limits.
5. **Real-control lifecycle.** The existing legal seed 1 loss and seed 2 victory tests in `tests/battle-loop.spec.ts` now reload and Continue their actual completed saves, verify ended state and no historical cues, then restart. Final assertions inject primary-removal denial from each outcome, prove the ended session/seed and usable toolbar survive partial reset, then successfully retry. Existing audio/board/restart checks retain their original assertions and use the new explicit confirmation. The sound-on/off comparison explicitly clears only its two owned test slots between independent fresh histories. Controlled-clock player/enemy reload tests use real actions in both interrupted and uninterrupted browser contexts. Injected storage failures are recovery evidence, not proof of legal full-battle completion.

## Completed checks

- `npm run test:unit`: 419 tests passed across 29 files.
- `npm run validate:content`: 77 tests passed.
- `npm run typecheck`: both TypeScript configurations passed.
- `npm run build`: passed; existing Phaser chunk-size warning remains.
- Focused desktop checks: three HUD/touch/modal cases passed; after repairs, four reload/focus/paused-restart cases passed. The earlier new persistence run had eight passes and two failures, repaired as described below.
- `npm test -- --reporter=line,json`: **255/255 passed**, 85 per configured profile, zero failures/flaky/skipped cases, 14.0 minutes, on the runtime/test tree committed as `05f2d84`.
- After the test-only expansions in `f92da65`, `npm test -- tests/battle-loop.spec.ts tests/battle-persistence.spec.ts --grep 'complete legal authored|invalid startup|startup is read-only' --reporter=line,json`: **15/15 passed**, five per profile, 2.0 minutes. Both typechecks passed again. The full 255-case suite was not repeated after these test-only additions; runtime and build inputs are unchanged. Native touch feedback is allowed 350ms to fade before retaining a screenshot; assertion timeouts remain unchanged.
- `openspec validate issue-73-battle-resume --strict`, `git diff --check` and relative documentation link checks passed.

[Verification record](issue-73/verification.json) lists every case/result, source revisions, host/browser, and SHA-256 hashes of the tested production bundle. Full local raw reports remain in `tmp/issue-73/full-browser.{log,json}` and `tmp/issue-73/acceptance-recheck.{log,json}`; they are ignored, not published as a second duplicate report.

Inspected screenshots: [desktop Continue](issue-73/desktop-continue.png), [desktop recovery](issue-73/desktop-recovery.png), [portrait Continue](issue-73/mobile-portrait-continue.png), [portrait recovery](issue-73/mobile-portrait-recovery.png), [landscape Continue](issue-73/mobile-landscape-continue.png), [landscape recovery](issue-73/mobile-landscape-recovery.png). Text and controls stay within their viewport; the modal scrolls in short landscape and touch targets remain at least 44 CSS pixels.

Host: Windows, Node runtime on PATH; Edge `155.0.4283.45` via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The repository's desktop, Pixel 7 portrait and 915×412 landscape profiles are unchanged. An ignored `tmp/tools/npm.cmd` points to the installed npm CLI because npm is absent from PATH. No test configuration, dependency or timeout was changed to obtain these results.

## Repairs discovered during verification

- Native dialog focus could leave the document after the last button: the shared modal now wraps Tab/Shift+Tab at its boundaries.
- Navigation's hidden event cancelled the current animation and could pump one more enemy command before unload: enemy dispatch now checks visibility, and visibility return resumes the pending decision once. The paired browser reload regression passed after this repair.
- A restart test held RAF paused while waiting for the queued Phaser restart. Its shared confirmation helper now lets the clock-owning caller resume before checking the new scene; no runtime timeout was increased.

## Scope and limits

The codec, save identity, AI/combat/RNG policy and storage adapter remain unchanged. No alternate history format, importer, tombstone, background save loop or multi-tab lock was introduced. Ordinary in-memory play survives failed saves; denied storage can deliberately prevent startup/replacement when old data cannot be ruled out. JSON recovery export is not an import feature. Physical persistence/lifecycle certification belongs to #74; #57/#58 remain open. No physical-device test, hosted deployment, merge, release tag or production operation is claimed.
