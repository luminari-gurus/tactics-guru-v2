# Issue 80: authored run integration

[Issue #80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80), branch `work/issue-80-run-progression`, base `46284e10d18271b2e410e3c2532e27231cd3a8d6`. The caller approved the published OpenSpec plan in the task conversation on 2026-10-15. The caller separately accepted the #57 Playwright baseline as sufficient certification of the current app state; that gate is satisfied.

## Play and persistence

Follow **Play three-encounter run** from the battle panel, or open `/run` beneath the configured public base. Start new run opens party preparation; Start encounter begins the battle. After each of the first two victories, claim one reward, optionally use/equip owned items, then start the next encounter. The third victory has no additional reward. Defeat and final victory offer Start new run directly. In-battle replacement requires confirmation. Single battle remains a separate route and save namespace.

A fresh origin starts at run seed 13. New-run replacement increments the prior run seed modulo uint32 and creates a fresh UUID. This deterministic default was selected using legal simulation and verified through actual browser controls; no encounter/item values were tuned. Approved survivors retain HP with no automatic healing, and defeated heroes stay absent. The seed-13 legal policy uses the existing expected-damage player policy with each encounter's projected catalog, prefers Healing Draught when offered, equips owned charms on the first eligible living hero, and spends draughts on eligible damaged heroes in canonical party order. This reaches victory with fighter 6 HP and the other heroes defeated.

The existing run format 1 and 32,768-code-unit bound are unchanged. RunItemSession owns accepted battle state and atomic completion; RunSnapshot stores entry-party/items plus live activeBattle, never previews/animation. Entry construction projects equipment once; canonical replay reconstructs that exact entry before dispatch. Existing single-battle replay remains strict. Continue reconstructs presentation without historical actions or cues and does not rewrite a restored active snapshot until another command is accepted. Startup reads storage without writing. Corrupt/incompatible bytes remain exportable; storage failure permits unsaved play. Replacement compares reviewed bytes and preserves the live run/seed on a partial reset, retaining original texts for export. This is best-effort local storage, not cross-tab atomicity or durable retention.

## Acceptance mapping

| #80 acceptance | Implementation and evidence |
| --- | --- |
| Create accepted authored battles with HP/party carryover and clean local state | runBattle helper and BattleSession.fromRun; survivor-subset, entry validity, equipment nonaccumulation and replay-tampering unit tests; three legal authored browser encounters |
| Atomic outcomes, reward, next encounter, final victory, defeat and fresh run | RunItemSession owns BattleSession callbacks; aggregate preflight before publication; unit legal run/defeat, duplicate/stale/disposed session and ended-snapshot reconciliation; browser duplicate activation and legal defeat/restart |
| Responsive reward/item and encounter/outcome flow; single battle preserved | Production `/run`, reused runItems and BattleScene host; narrow/portrait/landscape touch/keyboard/modal checks, sound preference and return-to-single-battle independent save test |
| Bounded metadata, ownership and active-battle saves | Existing run codec/storage reused; codec malformed/version/digest/identity/HP/roster/offer/size checks and maximum-shape stress; storage corruption/quota/backup/changed-byte tests |
| Same reload state/next command/RNG without duplicate reward/cues | Real reload before/after reward/preparation/final outcome and player/enemy presentation; uninterrupted browser comparison, snapshot continuation and no historical cues; BFCache replacement test preserves exact primary/backup bytes |
| Integrated legal victory/defeat/restart/resume | run-progression.spec.ts enacts production controls from a fresh run; no forced HP/outcome/progression. Per-encounter replay evidence and screenshots retained with final validation |

## Verification

Tested implementation revision: `23a98521a4a2337854d8d47f26c0f78c6446aee3`, clean build identity. A final delivery commit updates evidence/task checkboxes and removes one extra blank line at the end of the shared test policy; no application behavior changes. See [validation manifest and source hashes](issue-80/validation.json).

- `npm run test:unit`: 654 passed across 39 files, including seven new run construction/controller/replay tests.
- `npm run validate:content`: 167 passed.
- `npm run typecheck` and `npm run build`: both typechecks/content/build passed. Existing large-chunk warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: 419 passed, one failed in the 420-case main suite. The existing desktop elevated-impact rotation test observed the old viewport immediately after resize, matching the retained #79 handoff limitation. See [initial output](issue-80/browser-initial.txt) and [failure context](issue-80/initial-rotation-failure.md).
- The same executable with `npx playwright test --last-failed`: the one failure passed unchanged. No app/test expectation was changed to obtain that pass. Coverage combines 419 initial passes plus one successful targeted rerun; the full 420-case suite was not repeated afterward.
- The same executable with `npm run posttest`: all 18 authored-encounter and 21 run-item tests passed. Explicitly invoked because npm does not run its posttest hook after a failed main command.
- `npx playwright test -c tmp/issue80-webkit.config.ts`: six passed, covering legal three-encounter victory/rewards/resume/restart, committed-animation reload, narrow controls, native touch and sound preference in iPhone-sized WebKit portrait/landscape. Retained [config](issue-80/webkit.config.ts.txt), [output](issue-80/webkit.txt), [portrait replay receipt](issue-80/webkit-portrait-run-records.json), [reward screenshot](issue-80/webkit-portrait-run-reward.png) and [victory screenshot](issue-80/webkit-portrait-run-victory.png). Restore the config to `tmp/issue80-webkit.config.ts` to preserve its relative paths.
- Strict OpenSpec, document links and whitespace checks pass.

The full main suite includes all 21 new run-flow cases across desktop and both mobile orientations. Command outputs (trailing whitespace normalized) and both WebKit orientations' receipts/screenshots are retained in the evidence directory. No forced state or outcome is used for legal full-run evidence; storage corruption/unavailability cases are explicitly failure injection.

The caller accepted Playwright as sufficient current-state certification. These results identify desktop engines with device emulation accurately; they add no physical-browser claim, deployment, merge or parent-epic closure. #64/#66 remain separate follow-ups and #81 retains broader playtest/tuning. Historical baseline WebKit sizing and performance-collector gaps are retained under #57's accepted disposition; no all-browser hardware frame-budget claim is added here.

## Build size comparison

The exact base archive and implementation were built on the same host with locked
dependencies and equivalent Vite production settings. All emitted JS/CSS totals
401,929 versus 415,123 gzip bytes (+13,194 bytes). Static asset bytes are unchanged.
The run entry is lazy loaded; the all-bundle total includes routes that are not all
fetched by one entry. This is local gzip accounting rather than measured CDN/network
transfer or hardware frame-budget evidence. See [raw inventories](issue-80/build-comparison.json).
The initial baseline comparison failed because npm's prefix invocation selected an
incorrect install context; a direct npm ci in the temporary baseline and a successful
complete build replaced that invalid partial inventory.
