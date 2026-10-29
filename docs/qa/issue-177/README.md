# Issue 177 verification

Issue [#177](https://github.com/luminari-gurus/tactics-guru-v2/issues/177); PR [#255](https://github.com/luminari-gurus/tactics-guru-v2/pull/255). Full-regression capture [40929820198](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40929820198) is in progress; it must not be described as passing until its complete aggregate is reviewed.

## Focused browser evidence

The root production-preview build and the Chromium and WebKit journey reports tested clean source `abac1e262007dd64b0184e5d176f7e4425c8f764`. The Chromium recapture began with a later, uncommitted unit-test-only addition; during the run the command-limit change was also edited locally. The preview served the previously built `abac1e2` artifact throughout. Playwright workers may have imported the edited source, but these journeys remain far below the command limit and do not depend on stale-error clearing. The test-only addition is not used by the browser cases or build. `source-build-manifest.json.gz` records changed source and built-file hashes. Host: macOS arm64, Node 26.12.1, Playwright 1.63.0, Chromium 153.0.8010.12 and WebKit 26.6, one worker, zero retries, root preview, persistent caches and unverified background load. Mobile runs use browser device emulation, not physical devices.

- `chromium.json.gz`: 12/12 passed, desktop, Pixel portrait and landscape; the compound-plan/undo interaction and complete standalone victory, run defeat and dungeon defeat journeys. The latter two include reload and restart. The dungeon starts fresh and reaches its battle through exploration.
- `webkit.json.gz`: 6/6 passed, iPhone portrait and landscape, covering the compound interaction and complete standalone and run journeys. It used the retained `tmp/issue-177/webkit.config.ts` equivalent: device-acceptance config with the three named tests selected. The standard acceptance config's grep otherwise excludes two new focused cases.
- `dungeon-webkit.json.gz`: 3/3 passed, desktop, portrait and landscape WebKit using the exploration config, for the fresh dungeon defeat/reload/restart journey.
- `browser-artifacts.tar.gz` retains the Chromium and WebKit replay attachments and screenshots. The absolute paths in the JSON reports correspond to the `chromium-artifacts` or `webkit-artifacts` directories in this archive; the dungeon test did not create attachments.

These focused checks do not constitute the full matrix. An earlier Chromium capture's output directory was overwritten by Playwright; it was recaptured to an isolated directory and is not used as evidence here. The earlier dungeon checks started from a seeded battle boundary; the retained fresh journey supersedes them for this acceptance case.

## Command-limit follow-up and evidence comparison

`ce7e06201054e1e2a4fdddedd0536f2c253f7fd5` removes the temporary branch allowance used by the full capture and changes `BattleSession` only to disable undo at the command limit and clear a stale error before an undo. It also adds unit and browser tests for that boundary. No other runtime, assets, test helpers, dependency or build configuration changed relative to `abac1e2`. The command-limit build log and browser JSON reports use a clean `ce7e062` build: 3/3 Chromium profiles and 2/2 iPhone WebKit profiles passed. The final focused unit report covers 31 tests, including the new command-limit and stale-error cases, all passed; its working tree contained only that latter additional test. The earlier test result does not claim to have run that added assertion.

`selection-diff.json.gz` compares exact discovery for the capture and follow-up: the default Chromium matrix adds three IDs for the command-limit test and removes none; all other stages retain identical ID sets. Those three additions have fresh focused Chromium evidence above. The new WebKit boundary cases were selected explicitly and do not alter the configured WebKit matrix. All other capture coverage can be reused only after confirming its own result and reviewing the final diff under the verification policy.

## Retained failures and pending full regression

A local `npm run test:unit` attempt had 1,016 passes and 27 failures in `measureFitPreview.test.ts`: the sandbox rejected loopback listeners with `EPERM`. The focused file was rerun with local-server access and all 27 passed. That repair does not turn the original aggregate into a passing run; its truncated tool output remains in the task history. The self-hosted capture has separate preparation, unit, browser, telemetry, performance and aggregate receipts. Preserve any failed, skipped or incomplete stage and compare source/build identities before claiming full acceptance.
