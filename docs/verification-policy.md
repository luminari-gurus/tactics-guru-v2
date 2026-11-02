# Verification tiers and evidence reuse

This is the selection contract from #201, with explicit commands added by #202.
Select checks by the behavior and
consumers affected, not by a dependency version, lockfile edit or merge step alone.
The inventory below does not change scripts, assertions, retries, timeouts or
performance limits. Re-inventory when tests/configurations change.
An issue's explicit acceptance criteria remain required; this policy does not
silently waive them. Browser/device emulation satisfies device acceptance under
AGENTS.md unless the caller explicitly requests physical devices for that task.

Contents: [tiers](#choose-a-tier), [change matrix](#pr-readiness-selection-by-change),
[small dependency patches](#small-dependency-patches), [merge checks](#merge-checks),
[suites and commands](#current-suite-inventory-and-commands),
[evidence reuse](#evidence-reuse-and-final-source-identity),
[self-hosted execution](#execution-capacity-and-follow-up-work).

## Choose a tier

| Tier | When | Required result |
| --- | --- | --- |
| Iteration | While changing one behavior | Run the smallest affected unit/test file and relevant browser case; use file/project/title filters. Record failures. This is feedback, not PR acceptance. |
| PR readiness | Final affected inputs are frozen | Apply the change matrix below, include transitive consumers and meaningful negative cases, verify the final build identity, and account for reused evidence. Include required device/engine cases. |
| Full regression | Cross-cutting runtime/save/input changes, broad shared harness changes, major engine/compiler/browser compatibility changes with broad impact, affected consumers that remain unbounded after focused inspection, release qualification, or explicit issue/caller requirement | Account for every routine suite in the inventory, including dev-only checks and distinct telemetry builds. Run extended journeys when an explicit acceptance gate or the affected behavior requires them. Reuse qualifying existing evidence; run invalidated coverage. |

Choose the union of affected checks for mixed changes. A dependency or browser
upgrade does not automatically select full regression; inspect its actual changes
and consumers first. Expand only for a concrete broad impact or unresolved reach,
and record that reason before starting the larger run. A small diff or patch
version alone is not proof of small impact. Isolated test repairs require the
repaired case, relevant consumers and an exact-base comparison when attributing
a failure; they do not automatically
require another full matrix. Preserve the original full-run failure even when a
focused repair passes. Never label that combination a clean full-suite run.

## PR-readiness selection by change

Paths below identify coverage families, not an exhaustive static dependency graph.
Check imports, callers, fixtures and config before choosing exact tests.

| Change | Required checks and browser scope |
| --- | --- |
| Docs / agent instructions only | Check links, paths, command syntax and consistency with configs. Use test discovery for changed commands, filters or suite membership; prose-only policy changes need no application execution. Changes to actual test/config code use the applicable rows below. |
| UI / layout / input | Affected UI/geometry units; both TypeScript scopes and production build; affected browser files with desktop keyboard/focus and portrait/landscape native touch. Include narrow layouts and relevant health-bar/WebKit configs. Preserve preparation, modal, resize and input-lock boundaries. Shared HUD/scene changes include standalone, run and dungeon consumers. |
| Domain / combat / content rules | Affected domain/session/content units, both TypeScript scopes and build. Exercise affected abilities/commands through the real HUD and a complete legal battle or run journey; include save/replay consequences. Shared turn/RNG/command contracts require full unit and browser regression. Add dev encounter/item suites when their consumers change. |
| Persistence / lifecycle | Relevant storage/envelope/session units, both TypeScript scopes and build; affected battle/run/dungeon reload, corruption, backup, stale-write, focus and actual BFCache cases. Include WebKit acceptance/exploration and legal complete journeys for affected routes. Shared save formats/admission or cross-route lifecycle changes require full regression. |
| Dependency / security patch | Use the [small dependency patch](#small-dependency-patches) checks when impact is bounded. Runtime, browser and engine changes also select the rows for their affected behavior. A lockfile edit is not a blanket full-regression trigger. |
| Assets / build / loading | Affected content/inventory/export units and `buildHeaders.test.ts` (both root/prefix builds), both TypeScript scopes and production build; affected asset/base-path, loading/failure and boot cases in relevant modes. Include visual desktop/mobile checks for changed art and audio delivery/unlock for audio changes. Inspect build-size deltas; collect performance captures for changed performance behavior, a material delta that threatens a documented budget, or explicit release/performance qualification. Bounded toolchain patches use the dependency row. |
| Telemetry | Telemetry units, both TypeScript scopes, ordinary unconfigured build behavior and dedicated configured production + development telemetry suites. Retain opt-out, disabled/failure behavior, error mapping and gameplay-independence assertions. Shared bootstrap/transport consumers expand selection. Never reuse an ordinary build as proof of the instrumented build. |
| Test tooling / CI / selection | Relevant tooling contracts, config discovery and exact before/after selected test IDs; execute affected modes/engines on the qualified runner. Changed shared harness/project/selection behavior requires full regression of affected coverage, with explicit coverage mapping for any removed execution. A test-only edit can invalidate acceptance evidence. |

Use complete legal journeys, not mocked unit tests, as browser interaction proof.
Retain touch/pointer, orientation, keyboard/focus, audio unlock and engine-specific
lifecycle checks on their actual profiles. Viewport resizing does not substitute
for touch-device or WebKit coverage when those behaviors are affected. The three long progression journeys are excluded from routine full regression and remain available through the extended commands. Selecting other focused checks does not remove tests from the configured routine matrices. #203 owns measured matrix changes and #204/#205 own fixture/audio refactors.

### Browser profile selection

The default Chromium matrix keeps unclassified cases on desktop, native touch
portrait and native touch landscape. Only reviewed metadata narrows selection:

- `@canonical`: desktop runs the complete device-independent resource failure or
  loading-delay case; both mobile projects exclude it.
- `@fixed-viewport`: desktop and mobile portrait run the complete explicit viewport
  corpus. Mobile landscape excludes only the duplicate execution after the test
  overwrites its viewport before navigation with otherwise identical Pixel settings.

Metadata is in Playwright test details, preserving titles and retained test IDs.
Neither tag is a runtime skip, a replacement for touch or WebKit, nor permission
to classify additional cases without reviewing their assertions. Current approved
scope is nine canonical startup/asset cases and five explicit-viewport layout
cases. Other routine interactions retain their matrix. The three extended progression journeys retain their matrix in the explicit extended commands.

`npm run test:verification-batches` also checks real selection discovery, exact
removed-to-retained mappings and negative selection/device drift. Batch discovery
must still partition the canonical default set exactly. Special configs/modes
retain their prior sets. The [issue #203 plan](../openspec/changes/issue-203-browser-coverage/design.md)
and QA evidence in `docs/qa/issue-203/` describe the classification and measurements.

```sh
node scripts/verification-selection.mjs capture tmp/selection.json
node scripts/verification-selection.mjs compare tmp/before.json tmp/after.json tmp/coverage-map.json
# Existing resumable self-hosted plan and exact batch discovery:
npm run verify:batches -- discover verification-receipts/serial/selection-plan
```

Capture before changing selection. The compare command rejects unmapped omissions,
extra/duplicate IDs, changed retained metadata and unexpected effective device
settings. Historical captures are immutable; deliberate later selection changes
need their own source-bound comparison and updated contract, not rewritten history.

### Small dependency patches

For a patch whose impact can be bounded from its advisory/changelog, dependency
diff and actual consumers, use PR readiness rather than full regression:

- Inspect the direct and transitive lockfile changes; verify installation and the
  applicable dependency audit. A patch version alone does not establish scope.
- Run the affected consumer checks. For a build-tool patch, the ordinary build
  already covers content validation and both TypeScript scopes; add the existing
  build integration tests and a focused boot/dev-server smoke as relevant.
- Reuse valid unaffected unit/gameplay/device evidence under the rules below.
  Add engine, lifecycle, telemetry or performance runs only when the changed
  behavior, a failure or an explicit acceptance gate requires them.

For example, a same-minor Vite editor-security patch normally needs audit,
build/type/content checks, root/prefix build-header tests and focused boot or
dev-server checks. It does not require replaying the complete battle/dungeon,
audio, telemetry and device matrices solely because Vite and its lockfile changed.
Broaden if inspection or those focused checks expose a wider regression risk.

### Merge checks

Use the qualification already attached to the PR and current main. A merge is not
a new release qualification.
Refresh the exact head/current base, reviews, required CI, branch rules and merge
tree. Review the retained evidence and run only missing or invalidated checks for
the affected scope. A new merge SHA, documentation edit or advance of main does
not by itself invalidate earlier results. Compare relevant inputs and the combined
tree first; conflicts require checking the resolved behavior and its consumers.

Once applicable checks and repository merge gates are satisfied, merge, verify
the published tree/parents and remote parity, and stop. Do not repeat passing
suites or add release/performance qualification merely to finish a merge.

## Current suite inventory and commands

Run from the repository root after `npm ci`. Production-preview checks require a
successful `npm run build` for the selected source and base path. Do not serve an
old `dist/` after a failed build. Run browser commands sequentially: most own port
4173; telemetry owns 4288. The table distinguishes routine full regression from explicit extended coverage;
PR readiness selects the applicable rows under the change matrix.

| Coverage | Current command | Mode and selection |
| --- | --- | --- |
| Fast units, including content | `npm run test:unit` | All `tests/unit/**/*.test.ts`; no real Vite builds. Iteration can append explicit unit paths. |
| Root/prefix build integrations | `npm run test:build` | `tests/integration/**/*.test.ts`; retains both real `buildHeaders.test.ts` builds and all asset/header assertions. |
| All units and build integrations | `npm run test:unit:all` | Union of both selections, in one Vitest run; deliberate equivalent of the previous all-unit command. |
| Standalone content validation | `npm run validate:content` | Eight content test files from package.json. Already included in all units and standalone build; retain that fact in timing receipts. |
| App and domain type boundaries | `npm run typecheck` | Both tsconfig scopes; also part of standalone build. |
| Standalone production build | `npm run build` | Content validation, both typechecks and Vite; remains safe when run on its own, including prefix builds. |
| Aggregate bundle step | `npm run build:bundle` | Internal to full verification after successful units/content and both type scopes. Creates the root, prefix or restored-root bundle without revalidating unchanged prerequisites. Use `npm run build` directly outside that guarded sequence. |
| Default Chromium | `npx --no-install playwright test` | Routine default files, desktop + mobile portrait/landscape; the three long progression journeys are in the extended suite below. The dev-only placement case skips in preview and must run separately. |
| Extended progression journeys | `npm run test:extended` and `npm run test:extended:webkit` | Explicit, non-routine complete Mage, Ranger and Fighter progression journeys across three Chromium and three WebKit profiles; run when their full progression behavior needs certification. |
| Authored encounter fixtures | `npm run test:fixtures -- authored-encounters.spec.ts` | `authored-encounters.spec.ts`, dev server, all three Chromium profiles. |
| Ability-picker fixtures | `npm run test:fixtures -- ability-picker.spec.ts` | `ability-picker.spec.ts`, dev server, all three Chromium profiles. |
| Run-item fixtures | `npm run test:fixtures -- run-items.spec.ts` | `run-items.spec.ts`, dev server, all three Chromium profiles. |
| Placement failure/retry | `PLAYWRIGHT_SERVER_MODE=dev npx --no-install playwright test tests/overworld-map.spec.ts -g 'controlled placement failure preserves complete state and supports retry'` | Three Chromium profiles; preview skips are not coverage. |
| WebKit battle/run acceptance | `npx --no-install playwright test -c playwright.device-acceptance.config.ts` | Config's selected battle-loop, persistence, run-progression and audio cases, iPhone portrait/landscape. |
| WebKit dungeon/exploration | `npx --no-install playwright test -c playwright.exploration.config.ts` | Dungeon, exploration, lifecycle files; desktop and two mobile orientations. |
| Health-bar device matrix | `npx --no-install playwright test -c playwright.health-bars.config.ts` | Health-bar file, three Chromium and two WebKit profiles. Account for existing Chromium overlap; no silent removal. |
| Configured production telemetry | `npm run test:telemetry` | `telemetry.spec.ts`; dedicated instrumented build in `tmp/issue128-dist`, all three Chromium profiles. |
| Configured development telemetry | `PLAYWRIGHT_TELEMETRY_DEV=true npm run test:telemetry` | Dedicated dev-server environment; distinct from production evidence. |
| Root/prefix asset behavior | `npx --no-install playwright test tests/public-asset-base.spec.ts` | Run root preview, prefixed preview and corresponding dev modes for full regression or affected build/base changes; recipe below. |
| Performance capture | `npm run measure:fit` | Isolated production proof-scene collector; this is not a substitute for runtime budget assertions in browser tests. Required for affected performance work and release qualification, not every docs/UI-copy edit. |

The routine default browser files (all included by the default config) are grouped here
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

The other four files are explicitly assigned above: authored encounters, run
items, ability picker and telemetry. New suites must be assigned before their
change is accepted.
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
the same for the dev fixtures. Without filters, `test:fixtures` runs authored
encounters, run items and ability-picker fixtures under one dev-server lifecycle, preserving all three
projects and assertions. The old individual config entry points remain supported.
`npm test` alone is still not full regression.

### Explicit full verification

`npm run verify:full` executes the complete inventory sequentially: tooling,
all fast units (including content), both type scopes, root/prefix build integrations,
then the root bundle and default Chromium,
combined fixtures, dev map placement/cleanup, both WebKit configs, health bars, production and
dev telemetry, root dev assets, isolated performance capture, prefix build/assets
in preview and dev, then root-build restoration. Root preview assets already run
in the default Chromium suite. The 19 stages validate ordinary content and both
type scopes once before any ordinary bundle. Prefix and restored-root bundles
reuse those successful prerequisites; neither is executed after unit/content or
type failure. Independent dev suites and build integrations continue. Configured
telemetry retains its separate build and validation because its flags differ.
`npm run verify:full -- --list` displays the stage plan without executing it.
Aggregate filters are rejected; use the focused commands instead.

Each stage gets its own log, browser JSON report and artifact directory under
`tmp/verification/full-<timestamp>-<pid>/`. `summary.json` is updated after every
stage with commands, exit status, failures or blocked prerequisites. The runner
continues independent suites after failure and exits nonzero for any failed or
blocked stage. A failed build blocks its preview/performance consumers instead
of testing stale output; dev fixtures and independent telemetry builds still run.
A shared fixture invocation has no fail-fast limit, so an encounter assertion
failure does not suppress run-item or ability-picker execution. A server/engine startup failure
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

Start with the PR's existing CI/local results and retained artifacts. Evidence can
be reused for a coverage obligation when the inputs and behavior relevant to that
obligation are unchanged, or their equivalence is demonstrated. A lockfile change
does not invalidate every suite: identify which changed dependencies and behavior
each check actually relies on. For a bounded patch, focused fresh compatibility
checks can accompany reused evidence for unaffected behavior; they do not become
a claim that the entire suite ran on the new dependency version.
The original result and supporting artifacts must be available.
A matching commit message, successful rerun of a different test, or a clean git
status alone is insufficient. Record in the PR:

- Tested commit, dirty state and relevant file hashes (including untracked inputs
  if used); exact command, config, project/test IDs, server/base mode and build ID.
- Lockfile/runtime/browser version and executable, OS/architecture, worker/retry
  settings, relevant build flags, fixtures/assets, and cache/background-load
  conditions. Capture allowlisted settings, not secrets or the whole environment.
- Results and retained report paths/hashes, including failures, skips, retries,
  interruptions and cases not run; identify each reused coverage obligation.
- Final commit and a dependency-aware comparison identifying the source, tests,
  helpers, configs, dependencies, assets and build inputs relevant to each reused
  check, and why its covered behavior is unchanged or equivalent.

Changes to relevant behavior invalidate the affected evidence. Shared helper or
configuration changes require tracing their consumers; rerun the affected checks
and reuse demonstrably unchanged coverage. Unknown reach requires broader
verification, not an automatic restart of every suite. A different host, browser
or cache can invalidate performance comparisons even if source is identical.
Identify a new build separately. Claims about exact bytes, caching, provenance or
performance require relevant artifact/input equivalence, including build metadata
where it matters. Unaffected functional coverage follows the behavior-based reuse
rules above; a routine toolchain patch does not require comparing every emitted
byte. Build/server modes are not interchangeable for assertions that depend on them.

Run affected checks after the last relevant edit and tie them to the final served
build. Documentation-only follow-ups may reference earlier runtime evidence after
checking unchanged inputs, explicitly as reused evidence from the tested commit.
Never say an old run executed the final commit. Failed or incomplete runs remain
failed/incomplete; focused repair evidence does not erase them. Missing artifacts
or uncertain provenance cannot support acceptance reuse.

To attribute a failure to the change or establish that it is pre-existing, compare
that case with the literal base SHA under matching relevant conditions; reuse a
valid existing base result when available. Retain both outputs and compare the
assertion. Do not rerun the entire base suite for a focused comparison. A matching
base failure does not authorize weakening, hiding or skipping it. Setup failures
require fixing the environment and repeating blocked checks, not restarting
unaffected passing suites. Keep failures and incomplete runs explicit.

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

#202 supplies explicit fixture/full commands; #206 separates unit/build checks
and removes repeated ordinary aggregate validation. #200 supplies timing/provenance
tooling; #203 changes the matrix; #204/#205 reduce repeated setup. Until merged, those proposed commands/optimizations
are not available and their benefits must not be claimed.
