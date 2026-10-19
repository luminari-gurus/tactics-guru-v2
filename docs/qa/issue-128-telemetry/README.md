# Issue #128 telemetry verification

Local implementation on `codex/issue-128-posthog-telemetry`, based on `a75c056` (the pre-existing issue #142 checkout). Unrelated issue #84 documentation and the desert-grid OpenSpec change are preserved. No production deployment, PostHog project change or live ingestion/upload is authorized or performed.

- `npm run typecheck` passes both application and domain configurations.
- `npm run test:unit`: [715 tests / 42 files passed](unit.log). Includes configuration/automation/privacy gates, save/reward boundaries, sink/offline failure isolation, frame sanitization and injected chunk-ID preservation.
- Installed Chrome 155.0.8059.82 with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`: [15 flow cases passed](browser-flows.json), desktop plus Pixel 7 portrait/landscape emulation. These play the actual three encounters, heal/equip through real controls, claim both rewards, reload and Continue at boundaries, finish the run, and assert exact telemetry counts. Blocked ingestion, opt-out, DNT and GPC cases pass too.
- [Nine error/recovery cases passed](browser-errors.json): duplicate uncaught errors and rejections, hostile rejection payload exclusion, failed parser loading, repeated corrupt-save recovery inspections. Every ingestion request uses fake credentials and a mocked response.
- [21 development cases passed](browser-development.json), verifying explicit development opt-in separately with the same fake credentials and mocked ingestion.
- [Initial browser attempt](browser-initial.log) is preserved: the initial test driver omitted preparation and reached legal defeat instead of victory on all three profiles. Fixing the driver to use healing/equipment, matching the existing run acceptance test, produced the passing flow evidence. Earlier local-server/browser-binary setup failures were harness limitations, not game results.
- [Release guards](release-guards.json) reject missing CI credentials, dry-run mode and absent JavaScript maps before upload.
- [Source-map injection probe](source-map-injection.json) uses the real pinned CLI with a local mock release API and fake credentials. Application chunks receive `chunkId` metadata; helper chunks with no source map are skipped. Official stack parser + sanitized chunk-ID retention also pass the unit test. Live upload, server-side symbolication, retention and production settings verification remain operator checks.

## Performance

[72 local samples](performance.json.gz), with [summary](performance-summary.json), compare three repetitions × cold/reload × desktop/portrait/landscape for each route and collection mode. All numeric loading, asset, idle and interaction limits hold in this diagnostic; provenance validation remains rejected as described below. The original full browser SDK produced a 107,340-byte gzip chunk and was removed before acceptance. The retained official stack parser plus capture transport is about 4.8 KB gzip, loaded only when collection is explicitly enabled.

| Mode | Battle code transfer | Run code transfer | Worst usability | Worst idle p95 |
| --- | ---: | ---: | ---: | ---: |
| Disabled | 378,988 bytes | 387,696 bytes | 649.4 ms | 18.0 ms |
| Enabled | 384,105 bytes | 392,813 bytes | 665.1 ms | 17.9 ms |

Enabled transfer adds **5,117 bytes** per route. Disabled samples make no ingestion requests and never load the parser. The broad browser SDK was removed because its additional 107 KB exceeded the existing budget. Faster enabled timings are order-dependent local variation, not an optimization claim.

[Final artifact parity](final-artifact-parity.json) confirms the final default-off build emits byte-identical JS/CSS to the measured disabled artifact and zero public maps. [Source binding](source-binding.json) retains hashes of the implementation and both measured builds. [Final build](build.log) passes content validation, both typechecks and bundling with the existing Vite warnings.

[Probe source](performance-probe.ts.txt) compares disabled/enabled builds with identical mocked routing and real battle/run startup, idle, pan, zoom, selection and movement. The probe retains raw intervals, requests and per-sample budget decisions. Mock routing disables HTTP cache, so reload rows do not establish warm-cache acceptance. Served builds are dirty local implementation builds; the existing evaluator rejects that provenance and those rejections remain visible. No deployed-host or clean-release performance certification is claimed.

## Owner policy follow-up and activation checks

On October 19 the owner selected the existing US project, default anonymous collection with opt-out, and a 30-day retention target. The ignored developer configuration has the supplied public token/US host; development and local previews remain off by default. The Privacy & analytics UI is implemented across all routes. Provider-side retention and access/deletion ownership still need verification; no account changes or deployment were performed. CI must run `POSTHOG_SOURCEMAPS=true npm run build`, inject/upload the exact artifact with `npm run telemetry:release`, remove maps, then verify a controlled development-project error before any separately approved production enablement. No live account credentials were needed for these local checks.

The 72-sample measurements above predate the policy UI. They remain evidence for the underlying transport/session instrumentation, not a certification of the revised UI build. Follow-up browser and loading evidence below covers the policy update.

## Approved policy implementation

[716 unit tests passed](unit-policy.log) after adding localhost-preview isolation. [27 policy cases](browser-policy.json) and [six final layout/cross-tab cases](browser-policy-layout.json) pass across desktop and both mobile orientations. These verify immediate opt-out, unchanged saved game state, persistence across routes/reload, future-visit re-enable and propagation to another open tab. The UI is in existing scrollable tools rather than an overlay on the board. Every request is mocked; no live project data was sent.

[12 revised-build cold diagnostics](performance-policy.json.gz), with [summary](performance-policy-summary.json) and [probe](performance-policy-probe.ts.txt), cover desktop/portrait/landscape once per route and collection mode, including real pan/zoom/selection/move workloads. All numeric limits hold: disabled battle/run code **381,572 / 390,307 bytes**; enabled **386,664 / 395,400 bytes**, under 400,000 bytes. These are a smaller diagnostic, not a replacement for the earlier full matrix or a clean/deployed release certification. Existing evaluator rejections for dirty provenance and incomplete 18-cell matrices are preserved. No budgets were changed.

The project's public token and US host are saved only in ignored `.env`; collection is enabled for configured production-origin builds, while normal developer mode, loopback previews and automation remain disabled unless explicitly opted in. A release still needs the platform's public build inputs and CI source-map secrets. The approved 30-day retention target has not been applied to the PostHog account by this task.

[Final privacy visibility checks](browser-policy-final-layout.json) pass on all three profiles. The [portrait battle](policy-ui/portrait-battle.png) and [landscape map](policy-ui/landscape-map.png) screenshots were visually inspected: readable notice, visible checkbox/status and keyboard focus, with controls in the existing scroll/page regions.

The [final full-run check](browser-policy-full-run.json) passes after the privacy UI change, exercising all three encounters, rewards/preparation, final victory and Continue while checking event counts. The [configured production build](build-configured.log) also succeeds; local-origin collection remains gated off. [Policy source binding](policy-source-binding.json) records the revised implementation and measured build hashes.

## PR integration

Rebased onto current main `41ca782` before publishing the analytics-only PR. Earlier receipts remain bound to their recorded source; fresh integration verification is recorded below. The owner reports that the public PostHog environment variables are now configured in Cloudflare Pages. No private keys, local `.env`, unrelated issue #84 documents or desert-grid planning files belong to this PR. Raw performance captures are gzip-compressed for review; the recorded probes emit plain JSON.

Fresh integration proof on current main `41ca782`: [720 unit tests / 42 files](pr-unit.log), [production build and both typechecks](pr-build.log), and [all 30 telemetry browser cases](pr-browser.json) pass with no skips or retries. Browser cases cover desktop and both Pixel 7 orientations, including all three encounters and final victory, error/recovery paths, privacy signals, immediate opt-out, cross-tab preference propagation and future-visit re-enable. Ingestion remains mocked with fake credentials.

A fresh [six-sample cold diagnostic](performance-pr.json.gz), with [summary](performance-pr-summary.json) and [executed probe](performance-pr-probe.ts.txt), exercises all three profiles on each enabled route after rebasing. Code transfer is **387,928 bytes for battle / 396,661 bytes for run**, with no numeric budget violations. These smaller local diagnostics retain dirty-provenance and incomplete-matrix evaluator rejections and do not certify a clean deployed release.
