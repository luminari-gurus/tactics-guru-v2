# Optional analytics and error reports

Issue [#128](https://github.com/luminari-gurus/tactics-guru-v2/issues/128) adds an application adapter for PostHog. Unconfigured builds and local development keep collection **off by default**. The owner-approved US project uses default anonymous collection with opt-out in configured production-origin builds. No deployment or PostHog account mutation is performed by this implementation.

## Setup and collection policy

All `VITE_` variables are public build inputs. Set `VITE_POSTHOG_ENABLED=true`, `VITE_POSTHOG_KEY=phc_…` (public project token), and `VITE_POSTHOG_HOST` to either `https://us.i.posthog.com` or `https://eu.i.posthog.com`. Missing/invalid configuration disables collection and avoids loading the parser. Do not put a personal API key in a `VITE_` variable. A built preview uses production mode; development and localhost previews additionally require `VITE_POSTHOG_DEV_OPT_IN=true`. Use a separate development project for that opt-in; leave it false for this production project. Automated browsers additionally require `VITE_POSTHOG_TEST_OPT_IN=true`; the committed test configuration uses a fake token and mocked ingestion.

Owner decision, October 19, 2026: use the existing **US** PostHog project, collect anonymous gameplay events and sanitized errors **by default with opt-out**, and target **30 days** of retention for both. The supplied public token and US host are configured in the ignored developer `.env`; no personal API key is stored there by this task. Repository examples remain disabled/unconfigured so other developers do not inherit this project's collection settings.

The accessible **Privacy & analytics** control appears in battle tools, every run preparation/reward/outcome/start screen, and the map. It explains the collection and retention target before offering an allow/disable checkbox. Disabling stops reporting immediately, aborts pending requests and applies to other open tabs. Allowing reports again takes effect on a later visit; the current game is never reloaded by this setting. Developer mode and localhost previews stay off unless explicitly opted in. Automated tests use fake credentials and mocked ingestion.

The 30-day value is the owner's approved **target**, not evidence of a provider-side setting. The owner still needs to configure/verify retention for events and errors in PostHog and record access/deletion ownership before production activation. There is no claim of legal compliance or automatic deletion by the application. Production deployment and account mutations remain separately authorized work.

DNT (`navigator.doNotTrack === '1'`) and Global Privacy Control disable collection. A local opt-out is stored under `tactics-guru:telemetry-opt-out` with value `true`. Set it before loading the application to prevent any request. The Privacy & analytics checkbox, backed by `optOutTelemetry()` in `src/telemetry/browser.ts`, stops collection immediately, aborts active requests and persists the preference; changes in another tab also stop collection. Removing the key and reloading permits collection only if all other gates allow it. The approved policy uses default collection with opt-out rather than an opt-in banner; the checkbox supplies the player preference. Storage denial fails closed at startup. Opt-out does not touch saves or remove previously collected events.

No cookies or stable player identity are used. A random anonymous ID lasts for one document, so reloads are separate anonymous visits. The transport sends no referrer or credentials. PostHog necessarily receives connection metadata such as the source IP and browser request headers; `$geoip_disable=true` requests no GeoIP enrichment. The owner must review provider/network log retention separately. Session replay, DOM/click autocapture, console logging, flags, surveys and URL/referrer collection are absent.

## Event and property schema

| Event | Authoritative boundary | Additional properties |
| --- | --- | --- |
| `app_entered` | Document boot, once | route, phase |
| `battle_started` | New single battle adopted | phase |
| `battle_continued` | Reviewed saved single battle adopted | phase |
| `battle_outcome` | Accepted single-battle command resolves outcome | outcome, phase |
| `run_started` | Explicit fresh/unsaved run start or successful replacement | phase |
| `run_continued` | Reviewed run successfully restored | phase, encounter |
| `encounter_started` | Fresh run encounter constructed; restored active battles do not emit | phase, encounter |
| `encounter_outcome` | Accepted run battle completion | outcome, encounter |
| `reward_chosen` | Accepted reward claim; rejected/stale claims do not emit | choice, phase, encounter |
| `run_outcome` | Accepted final victory or defeat | outcome, phase, encounter |
| `save_recovery_failed` | Inspection finds damaged/unavailable storage | operation |
| `$exception` | Uncaught error, unhandled rejection or bounded handled failure | failure, phase, encounter, visibility; sanitized exception list |

Common properties are `route` (`battle`, `run`, `map`), `release` (build commit), `build_dirty` (boolean), and `visibility` (`visible`, `hidden`). `encounter` is a zero-based index 0–2; `outcome` is `victory` or `defeat`. `choice` is `healing_draught`, `warding_charm` or `aiming_charm`. `operation` is `read`, `write`, `remove` or `reset`. Phase values are the existing session phases plus `entry`. Error `failure` values are `application_load`, `scene_load`, `battle_resolution`, `encounter_start`, `run_boundary`, `save_read`, `save_write`, `save_remove`, `save_reset`, `runtime_error`, `unhandled_rejection`, and the controlled `verification`.

Outgoing properties are rebuilt from allowlists. Save contents, exports, run IDs, seeds, commands, party/inventory state, personal data, URL query/hash, error messages, custom error properties, function names, locals, causes and foreign stack frames are excluded. Exception frames retain only build-asset URL, line, column, platform, in-app marker and injected chunk ID; the message becomes the bounded failure code. The network envelope contains a random event UUID, timestamp, anonymous distinct ID and public project token. No identify call is made and `$process_person_profile=false` is always sent.

Events come from application/session transitions, not render/animation callbacks. A bounded 256-entry session-storage ledger of local boundary hashes suppresses repeat encounter starts/outcomes, reward claims and run starts/outcomes across reload/recovery within the tab. Raw boundary IDs are never sent or stored by telemetry. Continue and document-entry events are intentional new actions. Recovery-inspection events are deduplicated by route/operation. Error objects are reported once; duplicate failure/context combinations are suppressed and capped at 20 per document. With unavailable session storage, deduplication is memory-only. Ledger eviction, cleared storage, separate tabs and a new browser session are outside this bounded guarantee; analytics is approximate, not an authoritative transaction log.

## Failure isolation and performance

The adapter never imports into `src/domain`, changes save formats, or draws gameplay RNG. It asynchronously loads only `@posthog/core`'s official stack parser, using the documented [capture API](https://posthog.com/docs/api) for transport. The larger browser SDK is unnecessary for this scope. The pending startup queue is capped at 50; at most four requests run concurrently with a three-second abort deadline. Blocked/offline requests are dropped, with no retries, disk queue, reporting loops or gameplay dependency. Missing events under failure are intentional. At-most-once best effort avoids replaying transitions on retry.

Keep #127's existing budgets: cold code 400,000 bytes, cold assets 1,500,000 bytes, cold usability 2,500 ms, warm usability 750 ms, idle p50/p95 16.7/20 ms and interaction p95 33.4 ms. Include the parser/transport transfer in enabled-build measurements. Mock-ingestion browser results and local timings are not deployed-host certification. See [verification evidence](qa/issue-128-telemetry/README.md).

## Release and private source maps

Set `POSTHOG_SOURCEMAPS=true` in the build process to generate hidden source maps. Ordinary builds generate no maps and do not upload anything. The hosting system must exclude `*.map` from any publish directory; for a telemetry-enabled release use the explicit CI step below, which uploads and removes maps before publication. This repository has no checked-in CI deployment workflow to extend.

1. Build a clean, reviewed commit with `npm ci` then `POSTHOG_SOURCEMAPS=true npm run build` and approved public environment values.
2. In the same isolated CI job, provide `POSTHOG_CLI_API_KEY` (personal token scoped to error-tracking writes), `POSTHOG_CLI_PROJECT_ID`, and `POSTHOG_CLI_HOST` (`https://us.posthog.com` or `https://eu.posthog.com`) from CI secrets/configuration. These names have no `VITE_` prefix and the script never reads `.env` or a developer's saved CLI credentials.
3. Run `npm run telemetry:release -- dist` (or the exact build directory). The pinned CLI injects chunk IDs, uploads the same chunks/maps, associates symbol sets with release `tactics-guru-v2` and the full commit SHA, then strips `.map` files. Failure stops this step; do not publish an enabled release after failed uploads.
4. Publish those exact injected assets without rebuilding. Never publish source maps, CI logs containing credentials, or a different copy of the JavaScript. Check any hosting file allowlist for the parser chunk. The existing hashed asset header rules include it automatically.
5. Verify symbol sets and a controlled exception in the development project before enabling production collection. Follow PostHog's [source-map procedure](https://posthog.com/docs/error-tracking/upload-source-maps/cli). No live upload/account verification is performed by repository tests.

For a controlled development verification, additionally set `VITE_POSTHOG_DEV_OPT_IN=true` and `VITE_POSTHOG_VERIFY_ERROR=true` in the separate development project. A single sanitized `verification` error is captured at entry. For a built preview the explicit dev opt-in is still required for this error; automated tests use their test opt-in. Remove the verification flag before normal builds. No query-string error trigger exists.

In PostHog's activity/events view, filter on `release` and event name, then `route=run` and `encounter` to find representative transitions. Use distinct ID only within a document; it intentionally changes on reload. In Error Tracking, find `verification`, inspect the commit/release, source-mapped frames and uploaded symbol sets. Messages are failure codes; use frame locations and phase/encounter to diagnose. Confirm no URL, save data or raw error message in event properties.

## Local verification

- `npm run test:unit -- tests/unit/telemetry.test.ts` checks config gates, sanitization and session boundaries.
- `npm run test:telemetry` builds an isolated opted-in preview with fake credentials and mocks all ingestion, exercising desktop and both Pixel 7 orientations. It requires no PostHog account. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an installed browser.
- `PLAYWRIGHT_TELEMETRY_DEV=true npm run test:telemetry -- --grep 'blocked ingestion|uncaught|recovery inspections|failed parser|prevents parser'` verifies explicit development opt-in with the same fake token/mocked ingestion, separately from the built preview. Development source paths are deliberately excluded from outgoing stack frames.
- The regular `npm test` uses the normal default-off build; it excludes the explicit opt-in suite.
- Uploads require separate authorization and CI credentials. CLI dry-run skips processing as well as uploading and therefore cannot establish symbolication.
