# Verification tiers and evidence reuse

This is the selection contract from #201, with explicit commands added by #202.
Assertions, device projects, retries, timeouts and performance limits are unchanged. Re-inventory after new tests/configurations merge.
An issue's explicit acceptance criteria remain required; this policy does not
silently waive them. Browser/device emulation satisfies device acceptance under
AGENTS.md unless the caller explicitly requests physical devices for that task.

Contents: [tiers](#choose-a-tier), [change matrix](#pr-readiness-selection-by-change),
[suites and commands](#current-suite-inventory-and-commands),
[evidence reuse](#evidence-reuse-and-final-source-identity),
[self-hosted execution](#execution-capacity-and-follow-up-work).

## Choose a tier

| Tier | When | Required result |
| --- | --- | --- |
| Iteration | While changing one behavior | Run the smallest affected unit/test file and relevant browser case; use file/project/title filters. Record failures. This is feedback, not PR acceptance. |
| PR readiness | Final affected inputs are frozen | Apply the change matrix below, include transitive consumers and meaningful negative cases, verify the final build identity, and account for reused evidence. Include required device/engine cases. |
| Full regression | Broad/uncertain impact, shared test harness or selection changes, dependency/browser upgrades, cross-cutting runtime changes, release qualification, or explicit issue/caller requirement | Account for every suite in the inventory, including dev-only checks and distinct telemetry builds. Reuse only qualifying unchanged evidence; run invalidated coverage. |

Choose the union for mixed changes. Expand to full regression when affected
consumers cannot be bounded convincingly. A small diff is not proof of small
impact. Isolated test repairs require the repaired case, relevant consumers and
an exact-base comparison when attributing a failure; they do not automatically
require another full matrix. Preserve the original full-run failure even when a
focused repair passes. Never label that combination a clean full-suite run.

## PR-readiness selection by change

Paths below identify coverage families, not an exhaustive static dependency graph.
Check imports, callers, fixtures and config before choosing exact tests.

| Change | Required checks and browser scope |
| --- | --- |
| Docs / agent instructions only | Check links, paths, command syntax and consistency with configs. If commands or selection guidance change, use test discovery to verify them. No app build/browser execution solely for prose changes. Changes to actual test/config code use the applicable rows below. |
| UI / layout / input | Affected UI/geometry units; both TypeScript scopes and production build; affected browser files with desktop keyboard/focus and portrait/landscape native touch. Include narrow layouts and relevant health-bar/WebKit configs. Preserve preparation, modal, resize and input-lock boundaries. Shared HUD/scene changes include standalone, run and dungeon consumers. |
| Domain / combat / content rules | Affected domain/session/content units, both TypeScript scopes and build. Exercise affected abilities/commands through the real HUD and a complete legal battle or run journey; include save/replay consequences. Shared turn/RNG/command contracts require full unit and browser regression. Add dev encounter/item suites when their consumers change. |
| Persistence / lifecycle | Relevant storage/envelope/session units, both TypeScript scopes and build; affected battle/run/dungeon reload, corruption, backup, stale-write, focus and actual BFCache cases. Include WebKit acceptance/exploration and legal complete journeys for affected routes. Shared save formats/admission or cross-route lifecycle changes require full regression. |
| Assets / build / loading | Affected content/inventory/export units and `buildHeaders.test.ts` (both root/prefix builds), both TypeScript scopes and production build; asset/base-path, loading/failure and boot tests at root/prefix and relevant dev/preview modes. Include visual desktop/mobile checks for changed art and audio delivery/unlock for audio changes. Run isolated performance captures when bytes/startup/rendering can change. Toolchain/lockfile upgrades require full regression. |
| Telemetry | Telemetry units, both TypeScript scopes, ordinary unconfigured build behavior and dedicated configured production + development telemetry suites. Retain opt-out, disabled/failure behavior, error mapping and gameplay-independence assertions. Shared bootstrap/transport consumers expand selection. Never reuse an ordinary build as proof of the instrumented build. |
| Test tooling / CI / selection | Relevant tooling contracts, config discovery and exact before/after selected test IDs; execute affected modes/engines on the qualified runner. Changed shared harness/project/selection behavior requires full regression of affected coverage, with explicit coverage mapping for any removed execution. A test-only edit can invalidate acceptance evidence. |

Use complete legal journeys, not mocked unit tests, as browser interaction proof.
Retain touch/pointer, orientation, keyboard/focus, audio unlock and engine-specific
lifecycle checks on their actual profiles. Viewport resizing does not substitute
for touch-device or WebKit coverage. Do not reduce current matrices in this task;
#203 owns measured matrix changes and #204/#205 own fixture/audio refactors.

## Current suite inventory and commands

Run from the repository root after `npm ci`. Production-preview checks require a
successful `npm run build` for the selected source and base path. Do not serve an
old `dist/` after a failed build. Run browser commands sequentially: most own port
4173; telemetry owns 4288. The table maps all configured suites to full regression;
PR readiness selects the applicable rows under the change matrix.

| Coverage | Current command | Mode and selection |
| --- | --- | --- |
| All units, including content and two real build integrations | `npm run test:unit` | `tests/unit/**/*.test.ts`; includes `buildHeaders.test.ts`. Iteration can append explicit unit paths. |
| Standalone content validation | `npm run validate:content` | Eight content test files from package.json. Already included in all units and standalone build; retain that fact in timing receipts. |
| App and domain type boundaries | `npm run typecheck` | Both tsconfig scopes; also part of standalone build. |
| Production build | `npm run build` | Content validation, both typechecks, Vite. #206 owns removing duplicate work; do not bypass checks ad hoc. |
| Default Chromium | `npx --no-install playwright test` | All default files listed below, desktop + mobile portrait/landscape. The dev-only placement case skips in preview and must run separately. |
| Authored encounter fixtures | `npm run test:fixtures -- authored-encounters.spec.ts` | `authored-encounters.spec.ts`, dev server, all three Chromium profiles. |
| Run-item fixtures | `npm run test:fixtures -- run-items.spec.ts` | `run-items.spec.ts`, dev server, all three Chromium profiles. |
| Placement failure/retry | `PLAYWRIGHT_SERVER_MODE=dev npx --no-install playwright test tests/overworld-map.spec.ts -g 'controlled placement failure preserves complete state and supports retry'` | Three Chromium profiles; preview skips are not coverage. |
| WebKit battle/run acceptance | `npx --no-install playwright test -c playwright.device-acceptance.config.ts` | Config's selected battle-loop, persistence, run-progression and audio cases, iPhone portrait/landscape. |
| WebKit dungeon/exploration | `npx --no-install playwright test -c playwright.exploration.config.ts` | Dungeon, exploration, lifecycle files; desktop and two mobile orientations. |
| Health-bar device matrix | `npx --no-install playwright test -c playwright.health-bars.config.ts` | Health-bar file, three Chromium and two WebKit profiles. Account for existing Chromium overlap; no silent removal. |
| Configured production telemetry | `npm run test:telemetry` | `telemetry.spec.ts`; dedicated instrumented build in `tmp/issue128-dist`, all three Chromium profiles. |
| Configured development telemetry | `PLAYWRIGHT_TELEMETRY_DEV=true npm run test:telemetry` | Dedicated dev-server environment; distinct from production evidence. |
| Root/prefix asset behavior | `npx --no-install playwright test tests/public-asset-base.spec.ts` | Run root preview, prefixed preview and corresponding dev modes for full regression or affected build/base changes; recipe below. |
| Performance capture | `npm run measure:fit` | Isolated production proof-scene collector; this is not a substitute for runtime budget assertions in browser tests. Required for affected performance work and release qualification, not every docs/UI-copy edit. |

The 27 default browser files (all included by the default config) are grouped here
so every browser file has an owner in the inventory:

- Assets/boot/rendering: `assets.spec.ts`, `boot.spec.ts`, `content-loading.spec.ts`,
  `engine-fit.spec.ts`, `public-asset-base.spec.ts`, `grass-surface.spec.ts`,
  `terrain-materials.spec.ts`, `procedural-grids.spec.ts`.
- Proof interaction/audio/layout: `board.spec.ts`, `input.spec.ts`, `move.spec.ts`,
  `opacity.spec.ts`, `audio.spec.ts`, `lifecycle.spec.ts`, `layout.spec.ts`.
- Battle presentation/commands/persistence: `battle-board.spec.ts`,
  `battle-animations.spec.ts`, `battle-loop.spec.ts`, `battle-persistence.spec.ts`,
  `battle-audio.spec.ts`, `guarded-effects.spec.ts`, `unit-health-bars.spec.ts`.
- Run/dungeon/map: `run-progression.spec.ts`, `dungeon.spec.ts`,
  `dungeon-exploration.spec.ts`, `dungeon-lifecycle.spec.ts`, `overworld-map.spec.ts`.

The other three files are explicitly assigned above: authored encounters, run
items and telemetry. New suites must be assigned before their change is accepted.
Honor meaningful engine/mode skips (for example Chromium CDP-only input checks
and production-only resource hints); record reasons, and run the owning mode.

### Focused commands and base paths

```sh
npm run test:unit -- tests/unit/grid.test.ts
npx --no-install playwright test tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene'
# Verify selection without launching browsers or a server:
npx --no-install playwright test tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene' --list
```

`npm test -- <filters>` forwards file, project and grep filters directly to
Playwright with no lifecycle posttests. `npm run test:fixtures -- <filters>` does
the same for the dev fixtures. Without filters, `test:fixtures` runs both authored
encounters and run items under one dev-server lifecycle, preserving all three
projects and assertions. The old individual config entry points remain supported.
`npm test` alone is still not full regression.

### Explicit full verification

`npm run verify:full` executes the complete inventory sequentially: tooling,
units, safe standalone root build (content plus both typechecks), default Chromium,
combined fixtures, dev placement, both WebKit configs, health bars, production and
dev telemetry, root dev assets, isolated performance capture, prefix build/assets
in preview and dev, then root-build restoration. Root preview assets already run
in the default Chromium suite. Duplicate validation remains until #206.
`npm run verify:full -- --list` displays the stage plan without executing it.
Aggregate filters are rejected; use the focused commands instead.

Each stage gets its own log, browser JSON report and artifact directory under
`tmp/verification/full-<timestamp>-<pid>/`. `summary.json` is updated after every
stage with commands, exit status, failures or blocked prerequisites. The runner
continues independent suites after failure and exits nonzero for any failed or
blocked stage. A failed build blocks its preview/performance consumers instead
of testing stale output; dev fixtures and independent telemetry builds still run.
A shared fixture invocation has no fail-fast limit, so an encounter assertion
failure does not suppress run-item execution. A server/engine startup failure
can still prevent cases from executing and must be reported as incomplete.

The full command clears inherited server/base/telemetry mode flags and isolates
report output while retaining explicit browser executable selection. Run it via
npm on qualified, otherwise idle self-hosted capacity; it does not provision a
browser, dispatch CI or use GitHub-hosted capacity. See #207 for qualification.
Do not invoke it for ordinary focused edits solely to exercise the orchestrator;
use `npm run test:verification`, discovery comparisons and affected browser suites.
It is an execution command, not automatic acceptance of its reports: retain all
skips, engine/mode limits and performance findings under the policy above.

Root preview uses the ordinary build. For prefix checks:

```sh
npm run build -- --base=/prototype/
PLAYWRIGHT_BASE_PATH=/prototype/ npx --no-install playwright test tests/public-asset-base.spec.ts
PLAYWRIGHT_BASE_PATH=/prototype/ PLAYWRIGHT_SERVER_MODE=dev npx --no-install playwright test tests/public-asset-base.spec.ts
PLAYWRIGHT_SERVER_MODE=dev npx --no-install playwright test tests/public-asset-base.spec.ts
# Restore the root production build before other root-preview suites:
npm run build
```

These environment assignments use POSIX shell syntax. In PowerShell, set the same
`$env:NAME` values for that invocation and remove them afterward. Clear mode/base
and telemetry overrides before changing suites. Preserve separate reports before
Playwright clears its default output root; retain evidence outside `test-results/`
and `test-results-webkit/` (for example ignored `tmp/verification/<run-id>/`).
Use the #207 receipt wrapper only once it is available on the tested branch.

## Evidence reuse and final-source identity

Evidence can be reused for a particular coverage obligation only when all inputs
that affect it are unchanged and the original result and artifacts are available.
A matching commit message, successful rerun of a different test, or a clean git
status alone is insufficient. Record in the PR:

- Tested commit, dirty state and relevant file hashes (including untracked inputs
  if used); exact command, config, project/test IDs, server/base mode and build ID.
- Lockfile/runtime/browser version and executable, OS/architecture, worker/retry
  settings, relevant build flags, fixtures/assets, and cache/background-load
  conditions. Capture allowlisted settings, not secrets or the whole environment.
- Results and retained report paths/hashes, including failures, skips, retries,
  interruptions and cases not run; identify each reused coverage obligation.
- Final commit and a dependency-aware comparison explaining why the relevant
  source, test, helper, config, dependency, asset and build inputs are unchanged.

Changes to any of those relevant inputs invalidate the affected evidence. Shared
helpers/configuration invalidate all their consumers; unknown reach requires
broader verification. A different host/browser/cache can invalidate performance
comparisons even if source is identical. A new build must be identified separately;
reuse only with demonstrated relevant artifact/input equivalence, including build
metadata where behavior reads it. Build/server-mode differences are not equivalent.

Run affected checks after the last relevant edit and tie them to the final served
build. Documentation-only follow-ups may reference earlier runtime evidence after
checking unchanged inputs, explicitly as reused evidence from the tested commit.
Never say an old run executed the final commit. Failed or incomplete runs remain
failed/incomplete; focused repair evidence does not erase them. Missing artifacts
or uncertain provenance cannot support acceptance reuse.

When a failure is isolated, reproduce that exact case on a worktree at the literal
base SHA with the same dependencies, browser, mode and build conditions. Retain
both outputs and compare the assertion. A matching base failure can establish a
pre-existing limitation; it does not authorize weakening, hiding or skipping it.

## Execution capacity and follow-up work

Browser CI targets Brian's self-hosted runner, with no automatic GitHub-hosted
fallback. On 2026-10-21 the caller explicitly authorized temporary GitHub-hosted
execution for PR #214. `issue-202-verification.yml` is scoped to that PR, uses one
Ubuntu job and retains browser reports; migrate to qualified self-hosted capacity
later. This exception does not reroute #200/#207 or enable general hosted CI. Qualify the actual host under #207 before #200's baseline. Start with
one browser job at a time, `workers: 1`, and idle unrelated host workloads for
performance captures. Use the shared `tactics-browser-exclusive` concurrency group
when adding workflows on that runner; other repositories/host workloads require
separate coordination. Multiple agents/containers sharing one GPU are not isolated
capacity. #208 sizes shards from measured available hosts and reports queue/setup
as well as execution time. No hosted workflow is introduced by this policy.

#202 supplies explicit fixture/full commands. #200 supplies timing/provenance
tooling; #203 changes the matrix; #204/#205 reduce repeated setup; #206 removes
duplicate build validation. Until merged, those proposed commands/optimizations
are not available and their benefits must not be claimed.
