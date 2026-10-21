# Issue 202 — explicit fixture verification

Base: `5704e765d6feb26b396852c7f5c68dc06011fdad` (includes #201).
Branch: `work/issue-202-explicit-fixtures`. Caller: `dubstylee`.
The caller approved the concrete chat plan and branch publication on 2026-10-21.
This is the bounded tooling path; no OpenSpec artifacts are required.

## Results

- Seven orchestration tests pass, including real child exit codes, continuation
  after failure, blocked build consumers, independent dev/telemetry execution,
  signal/spawn-error accounting, mode isolation and rejection of aggregate filters.
- Both application and domain TypeScript checks pass; `git diff --check` passes.
- Discovery before/after preserves exactly 45 fixture executions: 24 authored
  encounter and 21 run-item cases across desktop, portrait and landscape.
  Comparison uses project, file and full test title; no assertions were edited.
- `npm test -- tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene' --list`
  selects exactly one test and exits without invoking fixtures. Equivalent
  fixture file/project/grep filtering selects one mobile-portrait reward case.
- `npm run verify:full -- --list` accounts for the policy's complete suite/mode
  inventory. Its 17 stages are sequential, with unique logs/artifacts and a
  checkpointed summary. Root-preview asset checks belong to default Chromium.
- The previous npm lifecycle was reproduced before the change: the same focused
  `--list` invocation launched 24 encounter tests after discovery, all of which
  failed at missing Chromium startup; the `&&` chain then omitted run items.
  That is retained as an environmental failure, not gameplay evidence.

The runtime was Node 24.19.0 / pinned Playwright 1.63.0 on Linux. Existing installed
lockfile dependencies were reused via a local, uncommitted node_modules symlink.
`source-hashes.json` binds the relevant final tooling/config bytes to these checks.
Captured command outputs are adjacent. No speedup measurement is claimed.

## Initial acceptance limitation (retained history)

Chromium is absent at the lockfile-selected executable path
`/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.
Consequently the new combined fixture suite has not passed in a real browser;
shared dev-server execution and isolation still require qualification on Brian's
self-hosted runner under #207. This remains a draft, referring to #202 rather than
closing it. No physical-device access is configured or required; emulation suffices.

On the qualified runner, use:

```sh
npm ci
npm run test:verification
npm run typecheck
npm run test:fixtures
# After a successful root build, one real focused browser invocation:
npm run build
npm test -- tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene'
```

Confirm all 45 fixtures pass with one dev-server lifecycle and the focused command
runs only the selected case. Retain logs, browser/host receipts and actual failures.
The full browser matrix was deliberately not rerun for this bounded command/config
change; full runner behavior is covered by injected outcomes and real process
contracts, not claimed as a complete gameplay acceptance run. No GitHub-hosted
fallback, CI dispatch, merge or deployment occurred. Coordinate #200/#207 tooling
and any new fixture suite from PR #211 when those branches merge.

## Hosted unblock authorized 2026-10-21

The caller authorized GitHub-hosted execution for PR #214, with migration to
self-hosted capacity later. The PR-scoped workflow installs locked Chromium and
its OS dependencies, runs orchestration contracts, all 45 fixtures, the safe
production build and one focused boot case. It requires exact passing counts and
zero failures, flaky results or skips, and retains separate JSON/artifacts.
Runtime results will be recorded after the workflow completes. This authorization
supersedes the self-hosted-only gate for this PR, not the wider epic.

## Integration with current main — 2026-10-21

The initial results above remain historical. Integrating main
`f99765143ddd470b8115cea4993d68a16b767646` includes #211's ability picker,
#213's native-select repair, patched Vite 8.3.5 and the proportional verification
policy. Resolve the package/config/policy conflicts by retaining explicit fixture
commands and the current policy; include all 12 ability-picker cases in the
shared fixture lifecycle. Individual suite entry points remain supported.

[Selection comparison](integration-selection.json) confirms the combined 57
project/file/full-title entries exactly match the union of current-main's three
individual suites: 24 encounters, 21 run-item and 12 ability-picker executions.
Default selection remains 687 cases, with fixture files excluded. Seven existing
orchestration contracts and focused npm discovery pass locally. Discovery used
existing pinned local dependencies; it is not browser execution evidence.

The PR-scoped hosted workflow now executes all 57 fixtures, seven orchestration
contracts, the content/type/build pipeline, and exactly one focused npm boot case.
It checks exact pass counts with no skipped/flaky/failed cases, compares combined
versus individual fixture selection, and retains source/browser/toolchain/build
identity with separate reports. Final runtime results belong to the PR and its
retained Actions run; no new full gameplay regression or speedup is claimed.
