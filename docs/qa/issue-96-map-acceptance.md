# Issue 96 — combined map acceptance

[Issue #96](https://github.com/luminari-gurus/tactics-guru-v2/issues/96), branch `branch/issue-96-map-acceptance`. Executed 2026-10-14 (Asia/Jerusalem). **All six epic criteria are supported; recommend closure through the review PR.** No application or test correction was needed.

## Source and inherited evidence

Fresh fetch before execution and publication: main `79f7d983ff3a12ca38e93efdc72f3f317dfb789c`; tested starting HEAD `9670a64ba508463ddd3d3e3335e273463fa7014a`. Live #97/#99/#98 are closed/completed; their PRs #100/#101/#104 are ancestors of this branch. #96 remains open for review. `git diff cc64433 HEAD -- src tests public package.json package-lock.json playwright.config.ts vite.config.ts tsconfig.json tsconfig.domain.json vitest.config.ts` is empty: the merged child implementation and acceptance branch have identical implementation/check inputs. Documentation edits make the tested builds dirty; no runtime/test/config edits are present. Subsequent commits publish only this acceptance evidence and handoff, so their commit IDs were not the IDs served during testing.

Git identities: `src` tree `05e8ba87d1200e6059ab1078959fcaa8992938fa`, `tests` tree `2e2e7426238d7bceb4e5c4d84c9e4796a36ad902`, `public` tree `6f239df3c5775f89c679ac4abf532dc3448bd161`, lockfile blob `a05fb559f0da9e91eb1d7d6cf1900113d04ac3b7`, Playwright config blob `46fc780b74fed4d634216e45b3eb30a2c86cb614`, Vite config blob `59a5900815bc4a3cabc5accd93dbce3ae76914ca`.

[Algorithm QA](issue-97-map-algorithms.md), [biome QA](issue-99-map-biomes.md) and [art QA](issue-98-map-art.md) are inherited records. The art record's 336 browser passes ran on a working tree based on `4315ca9`; it has no complete source manifest for that run. Final committed inputs match this branch, but that does not prove the exact bytes served historically. Fresh broad verification below replaces that uncertainty. Child screenshots and provenance remain linked rather than duplicated.

## AC1 — three accessible controls

The [view](../../src/map/view.ts) provides three associated labels and native selects. Existing [browser checks](../../tests/overworld-map.spec.ts) use `getByLabel`, native type-ahead plus Tab for each control, minimum 44px bounds and no horizontal overflow in desktop, Pixel 7 portrait and landscape. Fresh Codex in-app browser inspection verified all three controls have a visible 3px gold focus outline, 3px offset and 44px height; keyboard type-ahead plus Tab selected Cellular / Forest / Legacy 8-bit together. See [focus screenshot](issue-96/keyboard-focus.png) and [direct inspection](issue-96/direct-inspection.json). This is local browser evidence, not physical-device certification.

## AC2 — seed and selection transactions

Browser cases `map types apply the displayed seed`, `biome and type changes apply edited seeds`, `art controls retain pending seeds` and entropy-failure recovery cover Generate/New seed, retained selections and invalid rollback. Preserve the approved exception: art rerenders retained data and does not apply a pending valid seed edit; type and biome changes do apply it. [Contract](../overworld-map.md) and child specifications remain authoritative.

## AC3 — reproducibility and RNG isolation

[Map unit checks](../../tests/unit/overworldMap.test.ts) cover all nine type/biome combinations at 260 seeds (0–255, 12345, 424242, 2147483648, 4294967295), independent connectivity/border/density inspection, repeat equality, frozen input and forced bounded fallback. Rooms retains the pre-change fingerprint. Layout uses fresh local RNG; biome treatment consumes none. Art reads retained terrain, and browser signatures compare every cell/terrain and seed/type/version/biome/version/fallback field before and after art changes. Existing battle state/next-draw sentinels verify isolation.

## AC4 — baseline and metadata

Defaults are seed 1 / Rooms / Grassland / Simple; all remain selectable and refresh resets them. Browser assertions verify generated seed, stable type/version, biome/version, layout fallback and art selection. Visible status includes the versions, selected labels and fallback feedback; the grid carries reproducibility metadata. No URL/persistence feature is required or implemented. Fresh direct root entry, combined keyboard selection and refresh restored all four defaults with `data-commit=9670a64ba508463ddd3d3e3335e273463fa7014a`.

## AC5 — combinations, legend and fallback

Existing browser loops cover 3 types × 3 biomes × 2 art styles and compare cell/legend presentation. Both desert terrain IDs use documented Simple fallback with feedback; network/decode failures fall back per treatment, and delayed image completions preserve newer selections/validation. [Pinned inventory](../art/issue-98/README.md) preserves three PNGs totaling 1,118 bytes and the unresolved legacy creator/license entry. No asset or licensing change is proposed. Fresh review of all 18 combinations in each of the three profiles (54 screenshots) and full-resolution originals found distinct layouts, readable open/blocked treatments, matching legends and aligned controls. Portrait controls/status wrap without clipping; both orientations allow vertical scrolling to the complete map and legend.

Reviewed contact sheets: [desktop](issue-96/desktop-combinations.jpg), [portrait](issue-96/mobile-portrait-combinations.jpg), [landscape](issue-96/mobile-landscape-combinations.jpg). Representative originals: [desktop grassland](issue-96/desktop-representative.png), [portrait desert fallback](issue-96/mobile-portrait-representative.png), [landscape forest](issue-96/mobile-landscape-representative.png). Rows are Rooms / Random walker / Cellular; columns pair Simple and Legacy for Grassland / Forest / Desert, all at seed 1. [SHA-256 records](issue-96/screenshot-hashes.json) identify all 54 originals retained locally in the root results directory; sheets are resized composites, not replacement source captures.

## AC6 — navigation, regressions and execution

Existing root map tests cover direct entry/reload, map isolation from battle/audio/storage, and normal battle boot. Prefix checks select only relative-route biome/art cases; absolute `/map` cases cannot establish prefix coverage. Fresh direct `/prototype/map` entry/refresh verified the same starting HEAD. Random walker / Forest / Legacy 8-bit with seed 424242 rendered 400 cells, no art fallback and both image URLs under `/prototype/map-art/legacy-8bit/`; reload restored defaults. The 393×727 responsive inspection found six controls at least 44px high and no horizontal overflow, with readable desert fallback/status and legend. [Prefix screenshot](issue-96/prefix-map.png), [mobile fallback](issue-96/mobile-prefix-fallback.png), [observations](issue-96/direct-inspection.json).

Host: Windows, Node v24.19.0, Edge 155.0.4283.45, one worker and all three configured browser profiles: desktop 1280×720, Pixel 7 portrait 412×839 and landscape 915×412. The additional Codex in-app browser inspection used its default viewport and a 393×727 responsive override. A temporary ignored `npm.cmd` calls the available npm CLI with bundled Node because npm is absent from PATH; repository commands/configuration and dependency lockfile are unchanged. `npm ci --no-audit --no-fund` installed the 44 locked packages successfully; no audit was run.

Fresh checks:

- `npm run test:unit -- --reporter=json --outputFile=tmp/issue-96/unit.json`: 446 passed, zero failed/pending; includes all 27 map tests.
- `npm run validate:content`: 77 passed in two files.
- `npm run build`: both TypeScript checks and root production build passed.
- `npm run build -- --base=/prototype/ --outDir=tmp/issue-96/prefix-dist`: both TypeScript checks and prefix production build passed; root output preserved.
- Full configured `npm test -- --reporter=list,json --output=tmp/issue-96/root-results`: **336 passed** (112 per profile), 15.8 minutes, zero failures/skips/flakes/retries. Includes the 42 root map cases; they were not a second independent run.
- `npm test -- --config=tmp/issue-96-prefix.config.ts tests/overworld-map.spec.ts --grep 'biome|art ' --reporter=list,json`: **24 passed** (eight per profile), 26.6 seconds, zero failures/skips/flakes/retries. These are the relative-route biome/art cases under `/prototype/`, including legend/failure/loading checks and battle startup without map-art requests. No absolute root-route test is counted as prefix proof.
- `openspec validate issue-96-map-acceptance --strict`, relative Markdown link validation across the six planning/report documents (33 links) and `git diff --check`: passed.

Builds retain the pre-existing large battle-chunk warning; browser logs retain the environment's NO_COLOR/FORCE_COLOR warning. Local artifacts under ignored `tmp/issue-96/` retain command logs and raw test reports. [Validation record](issue-96/validation.json) preserves source objects, environment, actual counts, every browser case/result/retry and durations. The root browser run uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` and `PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-96/root-browser.json`; the prefix run uses the same executable and `tmp/issue-96/prefix-browser.json`.

The temporary prefix adapter below preserves the configured profiles, one worker and normal timeouts while using the separate prefix build. Both root and prefix servers were stopped after checks.

```ts
import { defineConfig } from '@playwright/test';
import original from '../playwright.config';
export default defineConfig({
  ...original,
  testDir: '../tests',
  outputDir: './issue-96/prefix-results',
  use: { ...original.use, baseURL: 'http://127.0.0.1:4174/prototype/' },
  webServer: {
    cwd: process.cwd(),
    command: 'npm run preview -- --base=/prototype/ --outDir=tmp/issue-96/prefix-dist --port=4174 --strictPort',
    url: 'http://127.0.0.1:4174/prototype/',
    reuseExistingServer: false,
  },
});
```

Save it as ignored `tmp/issue-96-prefix.config.ts` to reproduce the prefix command. Use an absolute `PLAYWRIGHT_JSON_OUTPUT_NAME` when reproducing: relative reporter paths resolve beside the configuration file, so this run's prefix JSON was collected from `tmp/tmp/issue-96/prefix-browser.json` into `tmp/issue-96/prefix-browser.json` after completion. No repository test/build configuration or dependency change was needed.

## Disposition and limits

All six criteria have direct contract/test/visual evidence above; no acceptance gap, reproducible product defect or unresolved blocker was found. Ablation retained the existing implementation, tests and legacy assets and avoided duplicate requirements, tests or infrastructure. The result is documentation and evidence only, ready for review with `Closes #96`.

Local preview/emulated mobile evidence does not establish physical-device behavior or production hosting. #64/#74 and other battle acceptance remain separate. No merge, deployment, release tag, manual issue closure or OpenSpec archive occurred. The original checkout's unrelated changes were preserved.
