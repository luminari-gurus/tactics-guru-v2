# Issue #10: replayable battle integration

Approved OpenSpec plan: `issue-10-replayable-battle`, published at `9b896c8`, explicitly approved by the caller on 2026-10-10. Base `5a7a5b6`; branch `work/issue-10-replayable-battle`.

## Session contract and controls

BattleSession owns immutable snapshots, previews and accepted-only records. Existing previews/dispatch and planEnemyTurn decide legality and enemy choices. An enemy queue executes at most one move, one attack and Wait per turn; each command resolves before its presentation. Rejection stops automatic execution and retains the accepted prefix. A presentation token and scene disposal prevent old completions from affecting a new battle. Presentation timers never enter the domain or choose outcomes.

Move / Basic attack / named Signature select an action. Select a cell or use the target dropdown, review the preview and Confirm or Cancel. Wait / End turn explicitly ends the active player's turn. Hero portraits inspect HP/status without transferring initiative. The log retains its latest 40 entries; the complete accepted-command replay is retained in memory within the existing command limit. There is no persistent save, replay export or playback UI.

Focus the board: arrows move an in-bounds cursor; Enter/Space select its cell; Escape cancels the intent. Native action/target/dialog controls support keyboard navigation. Dialogs capture focus, reset held pointers and restore a usable focus target. Restart remains available during presentation and in dialogs, advances the uint32 seed and clears the old run. Hidden-page presentation reconciles to its already resolved snapshot without dispatching again. Proof/content-smoke routes remain separate.

RULES_VERSION remains 1: orchestration does not change rules. Future changes that alter replay outcomes must bump the rules identity.

## Verification

- RED session test failed because BattleSession did not exist; initial 4 cases passed after implementation.
- RED browser preview test failed because no player session/HUD existed; GREEN passed all three configured desktop/portrait/landscape profiles.
- Expanded 10 session cases pass: authored seeds 1 (loss), 2 and 42 (win), all three signatures, accepted-command/event replay equality, cancellation, invalid target, immutable intent, exactly-once confirmation, obsolete callbacks, fresh run, confirmation rejection, enemy accepted-prefix rejection without retries.

| Issue criterion | Evidence |
| --- | --- |
| Fixed Fighter/Ranger/Mage party; move/basic/signature/Wait; actual victory, defeat and restart | `battle-loop.spec.ts` plays legal authored seeds 1 and 2 through action, target, Review and Confirm controls. It asserts all three signatures in the winning run, terminal controls, fresh seed, and exact `replayBattle` state/event equality. No forced HP/outcome or state injection. |
| Responsive portraits, HP/status/turn feedback, log, safe areas, 44px targets | HUD assertions inspect three portraits, active budgets, responsive 390×844 / 844×390 / 360×640 layouts, scroll/overflow and both target dimensions. Existing safe-area padding remains; board/layout regressions cover fit, orientation and DPR. |
| Preview/confirm/cancel, focus/capture and animation lock | Cancellation preserves state/RNG/replay. Native-dialog Enter/Escape and focus return, pointer capture reset, blocked backdrop touch and disabled controls during animation are asserted. Hidden/resume reconciliation advances no additional command. Session tests reject stale/duplicate confirmation and retain accepted prefixes on enemy rejection. |
| Keyboard/mouse/touch and repeated restart; playable full battles | Keyboard-only action buttons, board cursor, Review/Confirm and Wait; real CDP touch selection/confirmation; existing drag/pinch/cancel tests. Restarts during player preview/movement, enemy animation and dialogs retain one canvas and a fresh accepted record. Full legal win/loss runs exercise the actual UI. |

The initial native-select keyboard experiment passed mobile emulation but did not commit a selection in desktop Chrome automation. The final keyboard-only check uses the documented board cursor on all profiles; target dropdown selection is separately exercised by the full battle tests. Physical platform keyboard/menu behavior remains part of the device hand-off.

### Configured checks (2026-10-10)

| Command | Actual result |
| --- | --- |
| `npm run test:unit` | 260 passed across 23 files |
| `npm run validate:content` | 77 passed across 2 files |
| `npm run typecheck` | Passed both application and pure-domain TypeScript configurations |
| `npm run build` | Passed; existing large Phaser chunk warning remains |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/battle-loop.spec.ts --grep 'keyboard-only\|restart during initial'` | 6 passed across all three configured profiles |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` | 168 passed across desktop, mobile portrait and mobile landscape (7.3 minutes) |
| `git diff --check` / `git diff --cached --check` | Passed |
| `openspec validate issue-10-replayable-battle --strict` | Passed |

Focused authored-board and battle-loop checks previously passed 45/45 before the two final keyboard/enemy-restart cases were added. An intermediate full run passed 162/165: the three keyboard failures used an incorrect assumption that the seed-2 first decision must be movement. The final test explicitly exercises legal attack, movement and Wait and passes its focused check. Earlier failures are not counted as passing runs.

### Complete authored battle records

Both use the test-only legal policy in `tests/helpers/battlePolicy.ts`: preview catalog actions, choose expected damage/guard benefit, move through shared legal reachability, then Wait. Each choice is enacted through the visible controls; it is not an application AI or a forced terminal fixture.

| Seed | Result | Final round | Accepted commands | Events | Move / Wait / basic / Guarded Strike / High Shot / Magic Missile / enemy shortbow |
| --- | --- | --- | --- | --- | --- |
| 1 | Defeat | 10 | 85 | 183 | 23 / 33 / 10 / 8 / 3 / 2 / 6 |
| 2 | Victory | 3 | 38 | 85 | 9 / 16 / 3 / 2 / 3 / 3 / 2 |

Counts include both sides. [Loss record](issue-10/replay-loss.json) and [win record](issue-10/replay-win.json) contain the initial versioned snapshot, every accepted command, final state and events; browser assertions reproduced both state and events exactly. Test artifacts are not a gameplay export feature.

Retained screenshots: [portrait](issue-10/portrait.png), [short landscape](issue-10/landscape.png), [victory](issue-10/victory.png), [defeat](issue-10/defeat.png).

## Independent review follow-up — PR #55

The Linux review reproduced four browser failures at `54820f5`: the lock test sampled a one-step animation after it could finish, and the portrait restart test required the previous seed's camera origin despite a different HUD height. Both were test assumptions, not runtime defects.

- Pause the Playwright clock before confirming the move, assert presentation/disabled controls and exactly one accepted command, then restart during held presentation and resume. Forced pointer clicks are confined to the paused-clock interval because animation-based actionability cannot settle there; normal UI handlers still execute. No production test hook was added.
- Compute fresh camera fit from the original local board/art extent and current panel boundary. Assert reset scale/x/y precisely; retain existing same-session camera checks.
- RED: original focused run reproduced 4 failures / 2 passes. GREEN: both corrected tests repeated twice on all three profiles, **12 passed**, without retries.
- Full Linux validation: **260 unit tests**, **77 content tests**, both strict type checks/build, `openspec validate --all --strict`, and `git diff --check` passed. `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/playwright-browsers/chromium-1228/chrome-linux64/chrome npm test`: **168 passed (12.2 minutes)**.
- Independent follow-up review found no concrete blockers. Only tests and this QA note changed; existing bundle warning and physical-device/performance limits remain.

## Acceptance limits and #11 hand-off

Browser evidence uses installed Chrome and Chromium mobile emulation. No physical iPhone Safari/Chrome or Android hardware acceptance, deployed loading/frame budgets, production deployment, new assets/audio or AI/rule rebalance is claimed. #6 remains open for its device gate; #11 must validate full battles, audio/lifecycle/device behavior and deployed performance. Deferred: saves/resume, short route, inventory/equipment, procedural generation, advanced combat, editor, analytics and backend.

## Delivery

Implementation commit `46d2bfe` published on the approved work branch. [PR #55](https://github.com/luminari-gurus/tactics-guru-v2/pull/55) targets main, is open for review and is attached to this task. All four issue criteria have browser/session evidence above. OpenSpec remains unarchived pending merge.
