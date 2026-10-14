# PR #105 review repair

2026-10-14 (Asia/Jerusalem). Review: [P1 cached battle autosave](https://github.com/luminari-gurus/tactics-guru-v2/pull/105#pullrequestreview-5510799418). Reviewed head `46465d4f398ed9c87ea5223a8ef928fcdcfc3e11`; refreshed main `7a9b22b73f5187fff5a27701a2879e94368a148a`. The four original PR patches rebased without conflicts or patch changes (`git range-diff 79f7d98..46465d4 origin/main..8cd986d`).

## Finding and repair

The only actionable review finding is valid. On the rebased unmodified production runtime, one tab visited battle → map → battle, explicitly replaced seed 1 with seed 2, then went Back twice. Actual `pageshow.persisted` restored seed 1/command 2 while primary/backup still held seed 2/commands 4/3. One Wait overwrote both slots with seed 1/commands 7/6. Edge 155.0.4283.45 reported no page errors. [Exact reproduction record](pr-105/reproduction.json).

`src/phaser/start.ts` now synchronously stops the battle scene on pagehide, reusing all existing shutdown cleanup, and reloads a persisted pageshow into read-only startup. Current saved data is inspected before gameplay can resume. This also removes old recovery choices. No save format, storage key, schema, domain rule or map change is needed. Normal visibility-only suspension retains its existing behavior. [Storage contract and limits](../battle-storage.md#browser-history).

The existing persistence browser suite enables BFCache by omitting Playwright's default `--disable-back-forward-cache` launch argument. Four regressions run in all three profiles: active cached battle replaced by a newer save; cached recovery dialog replaced by a newer save; unchanged saved battle after scene restart; and departure during accepted-command presentation. They require real persisted pageshow, compare both raw slots before Continue, and verify the continued boundary and subsequent battle identity. Navigation uses commit readiness and then the recovery UI, avoiding a nonexistent cache load event and evaluation during the intentional reload.

The initial permanent regression failed on the original runtime because no current-save startup dialog appeared after confirmed cache restoration. The focused repaired run passes 12/12 without retries, flakes or skips. Earlier harness-only failures (worker-scoped launch options, a helper requiring an existing session, cache navigation waits, and evaluation during reload) were corrected before the final run; they are not counted as product failures or passing verification.

## Local verification

Builds identify `8cd986d0e5a481b189eaa6abd2cdc6562bc897af` with a dirty worktree containing this repair. [Validation record](pr-105/validation.json) binds the runtime/test/config Git objects and exact case counts, so later documentation commits do not imply a different tested implementation. Installed Node v24.19.0 and Edge 155.0.4283.45, one browser worker, unchanged timeouts and zero retries. The existing npm CLI was exposed through an ignored local wrapper; no package/config changes were needed.

- `npm ci --no-audit --no-fund`: 44 locked packages installed; no lockfile changes or vulnerability audit.
- `npm run test:unit -- --reporter=json --outputFile=tmp/review-105/unit.json`: 508 passed, zero failures (includes current main's run contract).
- `npm run validate:content`: 77 passed.
- `npm run build`: both TypeScript configurations and root production build passed.
- `npm run build -- --base=/prototype/ --outDir=tmp/review-105/prefix-dist`: both typechecks and prefix production build passed. Both builds retain the existing large-chunk warning.
- `npm test -- tests/battle-persistence.spec.ts --grep 'browser history' --retries=0`: 12/12 passed across desktop, Pixel 7 portrait and landscape.
- `npm test -- --retries=0`: full root browser suite 348/348 passed (116 per profile, 19.0 minutes).
- Prefixed biome/art/history checks with the adapter below: 36/36 passed (12 per profile, 59.8 seconds).
- Both final browser runs have zero failures, skips, flakes or retries. The 12 actual BFCache cases pass at both root and prefix. Normal visibility and the existing recovery/error/restart paths pass in the full suite.
- Strict OpenSpec validation passes for `pr-105-bfcache-recovery` and the original `issue-96-map-acceptance`. Relative document links and whitespace checks pass.

The prefix run uses this ignored adapter at `tmp/review-105-prefix.config.ts` (environment variables use PowerShell syntax on Windows):

```ts
import {defineConfig} from '@playwright/test';
import config from '../playwright.config';
const baseURL='http://127.0.0.1:4183/prototype/';
export default defineConfig({...config,testDir:'../tests',use:{...config.use,baseURL},webServer:{
  command:'npm run preview -- --base=/prototype/ --outDir=tmp/review-105/prefix-dist --port=4183 --strictPort',
  cwd:process.cwd(),url:baseURL,reuseExistingServer:false,
}});
```

Run `npm test -- --config=tmp/review-105-prefix.config.ts tests/overworld-map.spec.ts tests/battle-persistence.spec.ts --grep 'biome|art |browser history' --retries=0`. The selected tests use base-relative routes. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the installed Edge binary when using this host. Root and prefix raw JSON, logs and screenshots remain under ignored `tmp/review-105/`.

Representative screenshots were visually inspected: [desktop recovery](pr-105/recovery-desktop.png), [landscape recovery](pr-105/recovery-landscape.png), [portrait continued battle](pr-105/continued-portrait.png). Recovery controls and focus remain readable and within the viewport; continued battle controls and playfield render correctly.

## Publication

Repair commit `2b1ac4db4345c8f57e6223840b343a8b49d85c7b` was pushed to `branch/issue-96-map-acceptance` with an exact lease against reviewed head `46465d4`. The published commit's source/test/config objects match the validation record. All four original patches are preserved by rebase onto current main; the original planning checkout retains its prior history. No squash, extra stacked branch or release tag is warranted.

The PR title/body describe both map acceptance and the lifecycle fix. The [P1 reply](https://github.com/luminari-gurus/tactics-guru-v2/pull/105#issuecomment-6164933576) was posted and read back exactly. There are no inline threads to resolve; the automated Cloudflare status requires no code action. GitHub confirms open, non-draft and mergeable. Metadata/comment writes used the verified repository credential after connector integration 403 errors. Final closeout commits modify documentation/tracking only and preserve every tested input object.

## Scope and historical evidence

The [original #96 map acceptance](issue-96-map-acceptance.md) remains a record of its original source and checks. It is not rewritten to imply that it tested this later repair. Physical Android/iOS testing, production hosting, concurrent-tab serialization and durable retention are not established here. The original art-license gap, desert fallback and physical certification work remain unchanged.

No merge, release tag, manual deployment, issue closure or OpenSpec archive is performed. GitHub/Cloudflare CI is not a gate for this locally verified repair. The unrelated primary checkout and original planning worktree remain preserved.
