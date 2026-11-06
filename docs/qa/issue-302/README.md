# PR #331 integration verification

The reward-pending label belongs to the active cleared encounter, not other revealed encounters. Current main's persistent discovery rows and variable-size map rendering are preserved. This integration combines original head `5ff9e024394401056fcac0cfc6238d1d885e123d` with main `ab4be76`; relative to that main, production changes are only the status helper and its call in discovery-row construction.

## Fresh checks

On macOS arm64, Node 23.2.0 and lockfile Playwright 1.64.1, ordinary production preview, one worker, zero retries:

- `npm run build`: passed; includes 226 content tests and both TypeScript scopes.
- `npm run test:unit -- tests/unit/dungeonEncounterStatus.test.ts`: 3/3 passed. Covers out-of-order reward ownership, battle/defeat transitions and sequential legacy exploration labels.
- `npx --no-install playwright test -c playwright.regression.config.ts tests/dungeon-exploration.spec.ts -g 'only the Guardian|map markers respect|maximum-size saved floor renders|walking onto a guardian' --workers=1 --retries=0`: 15/15 passed.
- Same filter with `-c playwright.exploration.config.ts`: 15/15 passed on WebKit.

Both browser matrices cover desktop and emulated mobile portrait/landscape. Cases include existing marker state, Guardian entry/resume, maximum-size exploration, and reward claim/reload on 20×20 and 36×36 floors. The reward fixtures are admitted structural boundaries, not evidence of preceding Guardian combat. The reward checks also verify discovery-row nodes remain connected across a claim. No performance budget or fixture timeout is changed; performance qualification of main's renderer remains separate.

## Preserved failures

[Original CI attempt 1](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42293082488/attempts/1) passed tooling, units, types, build integrations, bundle and six core journeys. The remaining run journey never reached application navigation: the empty-canvas graphics preflight's evaluate call stalled until its 15-second timeout. The trace and `graphics-setup.json` are retained in that run's artifact and locally under `tmp/pr331-failure/`. This establishes the failure boundary, not the graphics-stall root cause. Follow-up `tg-build-q93` tracks investigation; timeout and pixel assertions are unchanged.

An unchanged-head rerun was requested before the integration conflict was discovered. It is not evidence for the newer merged source. Intermediate integration typechecking caught a duplicate test import and an unsupported helper argument; both were repaired before the successful build. A browser discovery invocation on that intermediate test file ran no cases. The earlier failed results remain separate from the fresh passing matrices above.

## Tested inputs

These hashes bind the fresh local checks to the integrated production/test inputs. This evidence document is added afterward; it does not change application behavior.

```text
4aaeb7c6d338f92bb087d219ee9c3866f1dad9a0ff702ac213d7dc5c6f1ccb6a  src/ui/dungeonMap.ts
7fb3d96a4e23f33c6ed2e222ec0736c32810deebb8a77f5dbb54f15a9b4be75b  tests/dungeon-exploration.spec.ts
4b4202b18d90b33d02c8e3523d33d8fc4784a78693c2805e16e6e10974b1962b  tests/unit/dungeonEncounterStatus.test.ts
e4768389a179a65df5f04502dab87e8875b465b939e55493d5820a7dc99a74ed  package-lock.json
```

Local logs: `/tmp/pr331-merged-build-final.log`, `/tmp/pr331-status-units.log`, `/tmp/pr331-merged-chromium-final.log`, `/tmp/pr331-merged-webkit.log`. Browser artifacts: `tmp/pr331-merged/`. Remote PR verification separately qualifies its recorded merge commit and uploads its own receipts.
