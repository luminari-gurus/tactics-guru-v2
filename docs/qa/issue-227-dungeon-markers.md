# Issue 227 dungeon markers

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/227

Caller `dubstylee` approved the concrete small-change chat plan with “Yes” on 2026-10-24. Branch `work/issue-227-dungeon-markers` starts at main `852e9d5a5a6b23fb5b986f2d555fcf000c70a70f`. No OpenSpec artifacts were needed for this localized presentation change.

## Contract and acceptance mapping

- Floor-1 upstairs and uncleared-floor downstairs are omitted from both map markers and discovered places. Floor-2+ upstairs and cleared-floor downstairs still require revealed cells. Unlocking does not mutate discovery.
- All uncleared encounters, including the guardian, use `M`; cleared encounters retain `✓`. The player marker still takes precedence. The legend explains these symbols, while discovered places retains encounter kind, order, availability and location.
- The new saved-state rendering case covers locked/unlocked stairs, hidden unlocked stairs, all three `M` markers, cleared markers, reload, upper-floor upstairs, keyboard/touch movement and a narrow viewport. Its structural fixtures prove rendering, not preceding battle completion.
- The existing legal two-floor six-battle journey now also asserts downstairs visibility after each victory and floor-1 stair descriptions after return travel/reload. It retains actual encounter order, rewards, movement, ascent/descent, save/resume and both-biome checks.
- Existing domain gates and the full exploration browser file cover travel eligibility, locks, focus, input, art/resize, corruption and continued battles.

## Verification selection and provenance

PR-readiness scope: only dungeon map presentation and its existing browser consumers change. No domain, persistence, shared HUD, assets, dependencies or browser configuration changed. Run affected exploration/dungeon units, the ordinary production build (221 content checks and both TypeScript scopes), the complete Chromium exploration file on desktop/native-touch portrait/landscape, and focused WebKit marker/traversal checks on all three configured profiles. Shared-health-bar, telemetry and full-regression matrices are outside this bounded change.

Tests run against the dirty task worktree based on the SHA above; exact relevant input hashes and production bundle hashes are retained in the evidence receipt. Documentation/evidence packaging after the tests does not change those runtime/test/build inputs. Browser mode is root production preview with one worker and zero retries. Playwright device emulation is used; no physical-device testing is claimed. Local `CAN_TEST_MOBILE` was missing/invalid, interpreted as none.

Initial sandboxed Chromium invocation could not bind 127.0.0.1:4173 (EPERM), so no browser tests ran in that attempt. The authorized execution outside the sandbox runs the same source and strict-port server, without stale-server reuse. The initial log is retained separately.

Results: **91/91 affected units, 221/221 content checks, both TypeScript scopes, production build, 36/36 Chromium exploration cases, 3/3 final marker reruns and 6/6 focused WebKit checks passed.** All browser results have zero skips, retries and failures. `git diff --check` passed.

The full Chromium file ran before the new marker case gained element screenshots and an additional moved-off-stairs assertion. The final three Chromium marker cases and six WebKit cases use the final test file. The other 33 Chromium cases have unchanged bodies/helpers/configs and reuse the original successful run against the same runtime and bundle; a second full-file run is not claimed.

Exact commands, stats and artifact hashes: [evidence.json](issue-227/evidence.json). Tested inputs, final test hash, bundle hashes and host/browser versions: [inputs.json](issue-227/inputs.json). Compressed raw logs/reports, legal journey receipts, and desktop/portrait/landscape marker screenshots are beside them. `PLAYWRIGHT_JSON_OUTPUT_FILE` selected the separate JSON report path for each browser command. Screenshots were inspected for readable markers and responsive presentation; scroll containers can clip element captures in short landscape viewports, while DOM assertions verify all marker states. Existing Vite chunk-size and native-config-loader warnings are retained; budgets/assertions were not relaxed.
