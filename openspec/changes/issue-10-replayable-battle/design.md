# Design

## Context

See proposal.md for issue, branch and prerequisite identity. Current `BattleScene` stores a snapshot in a closure and wires Move selected/Next turn directly to dispatch, including enemy ownership. `BoardRenderer` already hides defeated units and publishes geometry diagnostics; `BoardInput` handles drag/pinch/cancel and hidden-page pointer reset. `main.ts` chooses battle/proof/content-smoke modes, and the existing shell caps its panel and uses safe-area insets. Combat previews live in `src/domain/combat.ts`, including `previewMagicMissile`; signatures are catalog-driven, not a separate abilities module. `Replay` and `replayBattle` already validate the initial creation boundary and version identities. There are no main OpenSpec specs yet; #9's pending archive owns its enemy-turn change separately.

## Goals / Non-Goals

**Goals:** Small session boundary, one authoritative snapshot, readable action feedback and reproducible records, real UI battles and stable teardown.

**Non-Goals:** Changing legality, AI policy, authored party/balance, persistent saves, replay playback/export UI, generalized UI framework, new art/audio, device certification or deployment. Proof/content-smoke modes remain supported.

## Decisions

1. **Session owns orchestration, domain owns rules.** Add a browser-independent `src/app/BattleSession.ts` holding initial/current state, pending command, accepted commands, command-generated events and presentation phase. Reuse `previewMove`/`previewAttack`/`previewMagicMissile`, `dispatch`, and `planEnemyTurn`. Reject player intents for an enemy or during presentation. Enemy commands dispatch individually and present their events before the next; stop at terminal state or first rejection, preserving the accepted prefix and showing an error. Avoid a second rules engine or an aggregate enemy animation that loses intermediate snapshots.
2. **Explicit decision flow.** Player selects Move/Basic Attack/Signature, then a board cell or accessible target control, reviews path/range/hit/damage/cost information from existing previews, and chooses Confirm or Cancel. Wait/end-turn is explicit. One valid move and action do not implicitly end the turn; Wait advances it using existing semantics. Mage uses one target for the authored level-one missile, constructing the catalog-required missile-target array; no higher-level progression UI is introduced. Selecting other hero portraits inspects them but does not transfer turn ownership. All confirmations revalidate. Alternative immediate tile dispatch was rejected because it violates preview/cancel acceptance.
3. **Presentation is cancellable, never authoritative.** BattleScene resolves a command first, then asks BoardRenderer to animate the returned path/events with named short durations; retain per-command before/after snapshots for movement/combat presentation, finish by presenting the authoritative snapshot. Display attacks/misses/damage/Guarded/defeat in the log and temporary highlights/text. Lock gameplay from resolution through animation completion and across consecutive enemy turns. Restart disposes session, tweens and callbacks using a run token; resume reconciles to resolved state without dispatching again. Avoid timers in domain and avoid changing snapshot coordinates to animate. Camera navigation may remain available when no modal is open; selection and confirmation stay locked.
4. **DOM HUD and native dialogs.** Add `src/ui/hud.ts` and `dialogs.ts`; use existing portrait asset IDs and textContent for names/logs. Keep the shell's status/restart integration, switch diagnostic controls to battle actions only in battle mode, and retain `#fit-panel` geometry integration. Native modal dialogs capture focus; restore focus deliberately, guard board input and cancel held pointer state on dialog transitions. Canvas becomes focusable: arrows navigate an in-bounds cursor, Enter/Space selects, Escape cancels; action buttons and target list provide accessible alternatives. No keyboard interception inside form/dialog controls. Avoid a custom modal framework.
5. **Replay and restart identities.** Record accepted player and enemy commands in an in-memory `Replay` with an immutable initial snapshot; creation events stay outside the command event comparison. Restart advances the existing uint32 session seed deterministically with wraparound. Keep RULES_VERSION 1 because rules are unchanged; document that future rule changes affecting stored records require a bump. UI log is bounded independently of the complete command record, which uses existing command limits. No localStorage or export surface.
6. **Preserve renderer evidence under the new flow.** Existing authored-board tests assume manually controlled enemies and immediate Move/Next turn. Update them to use real player previews and automatic AI while retaining their projection, camera, canopy, DPR and teardown assertions; do not retain a production bypass for old tests. Keep read-only diagnostics for state/phase/accepted records so browser checks can compare replay; do not expose a force-win, command injection or state mutation endpoint. Tests can compute a legal policy from reported state but must execute every player decision through controls.

## Acceptance and affected files

| Issue criterion | Implementation | Verification |
| --- | --- | --- |
| Move/basic/signature/Wait, outcomes/restart, fixed party | Session + BattleScene + HUD, existing catalog/domain | RED-first session cases; real browser uses of all three signatures; complete authored win and loss using legal actions/Wait, fresh restart, replay equality |
| Responsive portraits/log/status/turn, safe areas, 44px targets | hud.ts, index.html, main.ts, style.css | Desktop and mobile portrait/landscape screenshots inspected; control bounding boxes, overflow/focus/HP/budget/status/log assertions |
| Preview/confirm/cancel, modal capture, animation locks | Session phases, dialogs.ts, BoardRenderer presentation, BoardInput guards | Cancel/invalid/stale intents preserve RNG/state; click-through and repeated confirm probes; delayed animation/hidden-resume cannot alter outcome |
| Keyboard/mouse/touch, restart cleanup, full playable battles | BoardInput keyboard/guard reset, scene/UI disposal | Keyboard decision flow, actual touch selection/confirmation, drag/pinch/cancel, restart during move/enemy/dialog, one canvas and one command per confirmation |

Add `tests/unit/battleSession.test.ts`, `tests/unit/battleControls.test.ts` where pure control behavior warrants it, and `tests/battle-loop.spec.ts`; adapt existing `tests/battle-board.spec.ts`/`layout.spec.ts` and shared helpers only as needed. Update domain constants comments for the established replay policy, without changing constants or rules. Add `docs/qa/issue-10-battle.md` with commands, actual outcomes, screenshots and #11 hand-off.

## Risks / Trade-offs

- HUD growth can clamp camera or obscure tiles → retain camera-fit regression checks; cap/scroll HUD and log; inspect short-landscape screenshots.
- Async restart or suspension can leave stale callbacks → explicit disposal/run token and restart-at-each-phase tests.
- Greedy AI can Wait behind obstacles → retain documented #9 policy, test real playable seeds; a rules/content/AI change requires a revised plan and approval.
- Full UI battles can be long → deterministic legal player policies with bounded tests; no forced HP/outcome fixtures as completion proof.
- Renderer physical-device acceptance remains open in #6 → no device completion claim here; #11 verifies full interaction and deployed performance.

## Migration Plan

After approval implement in this branch, run focused RED/GREEN and configured checks, publish the PR against main. No storage migration or production action; revert the task commit to restore prior battle controls. Keep OpenSpec unarchived until merge. Caller approved plan `9b896c8` on 2026-10-10; implementation follows this approved scope.
