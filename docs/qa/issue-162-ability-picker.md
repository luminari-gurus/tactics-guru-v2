# Issue 162 ability picker acceptance

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/162
Branch: `work/issue-162-ability-picker`. Original planning base: `5a1857f`; upstream square-map-cell fix merged at `1620349` before implementation.
Caller approved the published OpenSpec plan and separately approved extending the fixed-ID content validator to admit bounded additional abilities using existing profiles. No new production abilities, learned-level system, cooldowns, consumable resources or save format were added.

## Implemented behavior

- Every owned non-basic ability is selectable by exact ID, in deterministic ID order. Move, Basic attack and Wait stay directly available. The named ability button reactivates a choice after changing actions/cancelling.
- Picker updates preserve focus on ordinary refresh. Profile metadata describes range, targeting and effect; domain previews describe actual hit/damage. Missile preview distinguishes count and damage per missile.
- Native targeting and board overlays construct the same explicit command. Attacks retain hostile-only eligibility. Magic Missile exposes friendly candidates under unchanged domain legality, with named friendly-fire warning at preview and confirmation. Current minimum range rejects self-targeting; same-target unitId allocates all missiles correctly.
- Inspection/resize preserve selection and pending intent. Cancellation changes no authoritative state, RNG, replay or save; execution clears stale intent, locks spent actions, and accepts one command. Continue reconstructs availability from authoritative state.
- Canonical ability IDs remain required with exact kinds and ordered owners. Extensions require well-formed IDs, implemented exact profile shapes, bounded values and nonempty distinct existing owners. Canonical Guarded tradeoff constants remain enforced.

## Evidence and limits

Host: macOS with installed Google Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, Playwright 1.63.0. Desktop Chromium, Pixel 7 portrait and 915×412 landscape emulation; focused cases also resize to 320×568. This is browser/device emulation, with no physical-device claim.

`tests/fixtures/abilities/` uses production BattleScene, BattleHud, dialogs, renderer, previews and session authority. Its validated catalog clones existing profiles into one additional non-basic ID per hero, with controlled reachable positions and a level-3 missile profile. Definitions and synthetic localStorage keys are fixture-only and absent from the production bundle. Fixture snapshot writes exercise the real session snapshot reconstruction; they are not production persistence-adapter qualification. Production persistence/run regression tests cover those adapters separately.

Initial acceptance matrix: 12/12 passed. It verifies native popup/type-ahead choice and later-entry commands for Fighter/Ranger/Mage, actual touch activation on emulated devices, range metadata, pending-ID identity, inspection/resize preservation, 44px picker height, no horizontal overflow, immutable cancellation, one accepted command and exact snapshot reload with spent-action lock. Friendly-fire cases verify Cancel and Escape without mutation, then two actual missile events and ally damage from one confirmation.

Initial screenshots in [issue-162](issue-162/) were visually reviewed at narrow width: readable selector, wrapped guidance and accessible scroll region with visible board. Final representative desktop, portrait, landscape and 320px screenshots are retained in that directory. Desktop Ranger, landscape Mage, portrait Magic Missile and landscape High Shot captures were visually inspected; controls are readable within their scrollable dock/rail, with the board visible.

Historical failures retained/dispositioned:

- The first new browser tests used End on a closed macOS select; it left the original value selected. Native popup/type-ahead (`Space`, `z`, `Enter`) selected the intended item. No arbitrary delay/retry or assertion weakening was added. Final mobile checks also open the selector by touch.
- A test-fixture placement attempt overlapped the third enemy and an ally. Authoritative snapshot validation rejected it. The fixture now assigns distinct reachable cells; runtime validation was not bypassed.
- An old unit assertion rejected every unknown ability ID, including valid extension IDs. It now rejects malformed IDs, with a separate extension suite checking both allowed content and malformed/canonical mutation cases.
- The three existing #190 desktop native-select cases reproduce: clearing destination, Cancel retry and Escape retry. The earlier focused production run passed 9/12 with those same three failures. They remain unchanged and are not skipped or relaxed.

## Qualification results

- `npm run test:unit`: 850/850 passed across 52 files.
- `npm run validate:content`: 190/190 passed across seven files.
- `npm run typecheck`: both application and domain scopes passed.
- `npm run build`: passed; existing Phaser large-chunk and Vite config warnings remain.
- After clarifying per-missile preview wording, focused action/session checks: 25/25 passed; type checking passed.
- Broad `npm test`: 675 cases, 666 passed, 6 failed, 3 skipped (33.7 minutes). Three failures are the existing #190 desktop cases. Three are the exact Magic Missile command-shape expectation described below; that fixture was corrected without weakening state/event comparisons. The skips are the existing dev-server-only map placement fixture on production preview.
- Final build: `npm run test:unit` 850/850, `npm run build` including content 190/190 and both TypeScript scopes passed.
- Final production checks: 24/24 passed across desktop/portrait/landscape, covering every real signature's exact state/events/command and animation, default Move and keyboard-only play, and Guarded lifecycle on standalone/run/dungeon.
- `npm run posttest`: 24 encounter, 21 item and 12 ability-picker cases passed (57 total). The final picker cases use actual touch to open the native selector on mobile emulation, native type-ahead, and assert focus preservation.
- Production screenshot recapture: 9/9 signature animation checks passed; representative images retained and reviewed.
- `openspec validate issue-162-ability-picker --strict` and `git diff --check`: passed.

The broad run used an earlier frozen production build. Final wording, guarded-owner enforcement and helper wiring were verified by the final build, full unit/content checks, 24 targeted production cases, all 57 configured posttests and 9 production capture cases. The entire 675-case run was not repeated after those bounded changes. Its initial failures are preserved; the later focused passes do not turn that raw run green.

Final runtime and build hashes are retained in runtime-sha256.json and build-sha256.json under issue-162/. Tests ran from the dirty task worktree before its delivery commit; a clean postcommit build is not claimed. No production activation, merge or OpenSpec archive is performed.

Additional guardedAttack profiles retain the domain’s Fighter-only guarded-effect lifecycle; the validator rejects other owners for that profile.

The broad browser run also exposed an exact-event fixture expectation: Magic Missile formerly emitted a one-element missileTargets command; the approved UI now emits the domain’s same-target unitId shorthand. The animation fixture now supplies that command shape before producing expected state/events. Its exact state/event/replay assertions are retained; final focused rerun results follow below.

## Acceptance disposition

Every #162 criterion is mapped in the approved design and covered by the implemented path and focused evidence. Locked/unavailable testing covers current ownership, spent budgets and phase/target legality. Level gating, cooldowns and limited uses have no authoritative schema on this base and remain explicitly inapplicable, as approved; self-heal/area profiles and new production skills were not invented. Multiple-choice proof uses the isolated validated fixtures, while existing production signatures and persistence use real routes.

Delivery remains a draft PR with `Refs #162`: the full configured browser gate retains the three #190 desktop failures. Their tests are unchanged and require separate repair/qualification. The issue is not auto-closed. No new failures from this implementation remain after the targeted rerun. Existing build warnings are retained. No merge, production activation or OpenSpec archive is performed.

Published draft PR: https://github.com/luminari-gurus/tactics-guru-v2/pull/211. Runtime/test delivery revision: `b5e80c2f2e7f3e8f5407a0ca11f7c7df0313dbbe`; subsequent closeout changes only documentation/task state. Runtime receipt verification matches all 103 retained source files.
