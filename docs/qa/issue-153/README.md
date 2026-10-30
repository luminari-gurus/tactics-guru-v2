# Issue 153 implementation and focused qualification

2026-10-30 (America/New_York). Runtime implementation: `569544d3d0d034ac624774d4d10324093599eafc`,
merged from main `c8ca3c2`. No unmerged gameplay branches imported.
This is focused functional qualification; the full self-hosted regression is pending.
Issue #153 remains open and the implementation PR remains a draft.

## What shipped in the branch

Root menu, canonical `/battle`, preserved explicit root scene diagnostics, and
base-aware mode links. Read-only discovery uses the actual standalone level-one
catalog and the existing run/dungeon validators. Continue re-inspects at destination,
multiple eligible modes require a choice, and invalid/unreadable data exposes recovery.
New Game uses dungeon replacement confirmation. Its failed-save path offers retained
old-save exports. Main menu return links warn about reported unsaved progress.

Dawn is the delivered background, with the exact supplied transparent title exported
at 3:1 and native controls above the background. Both supplied backgrounds were
compared visually; neither includes baked controls/title. The runtime asset manifest
is in `docs/art/issue-153/runtime.json`. Dawn + title total 358,602 bytes;
Midnight is retained but not requested at normal boot. Records remains an empty
state; Settings reuses privacy controls and audio guidance. No Phaser/audio loader
or collection starts on the menu. Both desktop and mobile remain portrait; short
and narrow viewports scroll and actual 200% root text scaling remains usable.

## Executed evidence

- `npm run build`: content, both TypeScript scopes, root production bundle passed.
  Prefix production build passed separately. `npm run test:build`: both real
  root/prefix build/header integrations passed.
- `npm run test:unit`: 1,052 passed, 27 preview-server contracts timed out because
  sandboxed processes could not bind their ports. Retained as a failed run.
  Only the blocked file was rerun with server permission: **27/27 passed**.
  This is combined evidence, not a claim of a clean full-unit invocation.
- Final focused route, save-summary and collector-options units: **19/19 passed**.
  The save matrix enumerates all 16 primary/backup combinations in all three modes,
  with zero writes/removals and legacy preservation. Legal terminal battle recovery
  is verified through the browser.
- Final production Chromium menu/base navigation suite: **39/39 passed** on desktop,
  Pixel portrait and Pixel landscape. Added unsaved-return case: **3/3 passed** in
  dev with identical runtime inputs. Combined: **42 passed**, zero skips/retries.
- Final iPhone WebKit portrait/landscape menu suite: **24/24 passed**. Added
  unsaved-return case: **2/2 passed**. Combined: **26 passed**, zero skips/retries.
- Root dev menu asset/navigation: **3/3 passed**. Prefix preview and prefix dev:
  **3/3 passed each**. These round-trip through a real battle, then prove the menu
  recognizes the battle save. Earlier prefix evidence differs from final source
  only in unrelated dialog visibility filtering and test-only additions; runtime
  route/catalog/art behavior is unchanged. Original reports remain retained.
- Final existing desktop boot suite: **6/6 passed**, including proof/content-smoke
  compatibility, Canvas fallback and controlled engine-import failures. The original
  run had one test-migration error (`battlerun`); its corrected rerun and original
  failure are retained. The task-specific audio comparison now requests explicit
  `?scene=battle`, compatible with both historical and menu builds.
- Existing batch/selection tooling: **27/27 passed**. Exact source-bound discovery
  retains every prior selected ID; additions are explicit in `selection-comparison.json`.
  Main-menu cases are selected in Chromium and WebKit; there is no discovery-as-execution claim.
- `openspec validate issue-153-portrait-main-menu --strict` and `git diff --check` passed.

`environment.json` records browser/runtime versions and exact emulation scope.
`inputs.json` retains source and served build hashes. The final production bundle
was built from runtime commit `569544d`; later changes are tests/evidence/docs only.
No physical-device, idle-host performance or clean full-regression claim is made.
All commands used one worker and zero retries. Browser emulation satisfies AGENTS.md.
Screenshots include both background compositions, three main profiles and 200% text
at 320px. Compressed raw reports and logs include original failures.

## Iteration findings retained

- Old incompatible-format fixture bytes were initially used as positive fixtures;
  tests now construct legal current saves through production encoders.
- The production preload hook initially requested the engine on menu; now game
  preloads use the explicit route/diagnostic whitelist. Network isolation passes.
- Actual standalone saves initially failed menu validation because raw and
  level-one catalog identities differ. One pure factory now owns both projections;
  actual battle-to-menu round trips and active-session resume pass.
- The initial failed-new-game expectation assumed atomic replacement. Existing
  replacement semantics can clear reviewed slots before a failed new save. The UI
  now opens recovery and a download proves the retained original bytes are exportable.
- Collapsed privacy inputs initially remained in manual Tab traversal. The dialog
  now filters with `checkVisibility()`; closed/open privacy and focus return pass.

## Pending full regression

The branch-scoped manual job in `issue-200-baseline.yml` runs `npm run verify:full`
under the shared `tactics-browser-exclusive` lock on `[self-hosted, tactics-browser]`.
It retains original workers/retries/performance limits, full discovery, logs and
artifacts for 30 days. Superseded revisions were cancelled during queue/startup to test the final PR
head; their cancelled/incomplete runs remain in Actions history. No hosted fallback was added.

Full execution is dispatched for `6559b9c781edb39c91c48662f6e783884507d1c5`;
see [Actions run 41105273512](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41105273512)
for live status. Subsequent PR changes only update this evidence/links/tasks.
[Draft PR #256](https://github.com/luminari-gurus/tactics-guru-v2/pull/256) contains the reviewable implementation. Full Chromium,
fixtures/dev placement, both WebKit families, health bars, configured production/dev
telemetry, root/prefix assets, performance and restoration remain acceptance gates.
The issue is not closed and the draft PR must not be marked merge-ready from focused
results alone. No merge or deployment was performed.
