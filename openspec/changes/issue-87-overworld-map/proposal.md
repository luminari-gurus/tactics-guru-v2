# Proposal

## Why

[Issue #87](https://github.com/luminari-gurus/tactics-guru-v2/issues/87) requests a small procedural map that can be inspected independently of the authored battle. A seeded 20×20 prototype will provide concrete generator and bundle evidence without extending the short-run milestone.

## What Changes

- Add a standalone `/map` view with a 20×20 walkable/blocked grid, displayed editable seed, generate and new-seed controls, and a legend.
- Dispatch this route before battle startup; load map code only for this route and preserve battle, proof and content-smoke entry behavior.
- Compare exact-version rot.js focused imports, selective reuse/adaptation, and a minimal local generator for connectivity, repeatability, bounded execution, compatibility, bundle size and maintenance. Ship one approach supported by that evidence.
- Verify direct navigation/refresh, configured base paths, responsive controls, generation invariants and battle regressions. Record reproducible research and actual QA results.

## Capabilities

### New Capabilities

- `overworld-map`: Independent seeded map inspection, connected bounded generation and responsive prototype controls.

### Modified Capabilities

None. Existing battle requirements remain regression obligations.

## Impact

Expected files: `src/main.ts`, extracted `src/app/startBattleApp.ts`, new `src/map/generate.ts`, `src/map/view.ts` and scoped `src/map/style.css`; `tests/unit/overworldMap.test.ts`, `tests/overworld-map.spec.ts`, `tsconfig.domain.json`, README and `docs/qa/issue-87-overworld-map.md`. `vite.config.ts` or `index.html` changes only if direct-route/base-path evidence requires them. `package.json` and its lockfile change only if the measured comparison selects rot.js; no upgrade of existing dependencies.

Caller: `dubstylee`. Branch: [`work/issue-87-overworld-map`](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-87-overworld-map). Base: `origin/main` at `5d8351468463a9766665f3dce1da35f074e3476f` (2026-10-12). No implementation prerequisite; #59 and #82 are context rather than blockers, and #82 is merged. #72/PR #91 and their persistence dependents remain separate work.

Backlog refresh covered all 21 open issues, issue comments, native dependencies (none declared), remote branches, open PRs #12/#91 and current merged main. No readiness promotion had sufficient evidence: #73/#74 and #76–#81 retain unmet prerequisites; #75/#84 need reviewed product/owner choices; parents remain planning epics and #85 needs release authorization. #64 requires the full physical matrix; #66 has a retained planning branch and requires physical iPhone Safari evidence unavailable in this task. #87 and #88 are independent ready alternatives with no evidenced downstream advantage; oldest issue #87 wins.

Approval: pending explicit user approval of this change. Planning publication does not authorize application edits or tests. No party movement, encounters, fog, economy, persistence, new art, generator selector, backend or deployment mechanism is included.
