# Design

## Context

See [proposal](proposal.md) for motivation and scope. Inspected base: `main` at `3f3792025f29716c977cbdebff9d1c94b750ec3c`; issue [#73](https://github.com/luminari-gurus/tactics-guru-v2/issues/73); branch `branch/issue-73-battle-resume`; owner `moshehbenavraham`.

`BattleSession.resolve` commits a frozen state before returning a `Presentation`; only `confirm` and `nextEnemy` reach it. `BattleScene.present` currently starts cues/animation after that return. `BattleSession` only constructs seed-created battles, and its replay getter assumes seed-origin history. The accepted snapshot codec preserves enemy continuation through state flags (including seed 2/command 29); it intentionally stores no historical commands.

`createBattleStorage` exposes guarded `load`, `save` and `removeSlot`. It inspects both slots, preserves exact invalid text, and refuses ordinary writes if either slot is invalid/unreadable. Removal is conditional on an inspected value but is not a two-slot transaction. `src/main.ts` and `src/phaser/start.ts` currently invoke raw scene restart, bypassing any persistence coordination. The scene seed starts at 1 and advances modulo uint32 per new battle. These are the concrete seams to change.

## Goals / Non-Goals

**Goals:** One app-owned coordinator for storage decisions; pure session hydration; one accepted-command save hook; shared guarded replacement for every battle restart path; reuse the current modal/input ownership and snapshot/adapter contracts.

**Non-Goals:** Persisting complete replay history, changing combat/AI/RNG or save identities, migrations, additional storage slots/tombstones, multi-tab locking, generic persistence frameworks, run state, file import, production changes or hardware certification. Keep proof/content-smoke startup separate from battle persistence.

## Decisions

### 1. Hydration is an explicit validated session factory

Add a fallible snapshot factory to `BattleSession` that validates using the existing reader/codec boundary, clones/freezes the owned state, and derives player/enemy/ended phase. The storage coordinator supplies only successfully decoded candidates, but the public factory also enforces domain validity so direct callers cannot create partial sessions. Use state.mapId for the board and current state for cursor/HUD. Clear intent, queue, resolved-event log and presentation generation; enemy planning resumes through the accepted `planEnemyTurn` policy with no extra RNG draw. Terminal and command-limit behavior stays authoritative.

Retain the fresh constructor and its exact replay behavior. For resumed sessions expose `replay: null` plus a separately named continuation diagnostic containing restored snapshot and post-resume commands/events. Do not feed that snapshot to `replayBattle`, whose initial boundary must be seed-created. Update diagnostics and typed test helpers intentionally; full fresh-session replay assertions remain. This avoids storing a second history format or regenerating unknown player decisions.

### 2. Autosave is synchronous at the one accepted-command boundary

Provide an optional app callback invoked once from session resolution after state and accepted-command record commit and before returning the presentation. It receives only the immutable committed state. The coordinator calls existing `save(state)` and updates status; its failure is contained so neither storage nor observer exceptions undo a command or skip presentation. Fresh constructors/fixtures default to no callback. Hydration itself does not save, promote backup or emit historical events.

This hook covers both player and enemy commands without duplicating handlers. Saving on animation completion, timers, unload or separate player/enemy paths was rejected because a tab can be discarded during presentation. No retry loop or debounce coalesces accepted boundaries. First fresh startup attempts one initial snapshot save before enemy pumping; later failures mark progress unsaved while the battle remains playable.

### 3. One coordinator owns startup, recovery and status

Introduce `src/app/BattlePersistence.ts` (name is an implementation suggestion) around the existing storage interface, with injectable storage for tests and no Phaser/DOM imports. Keep it scoped to one battle app lifecycle; cancel its old-session save binding on successful replacement. Render its typed status through the existing HUD/dialog conventions, not through fatal scene-loading errors.

- Both slots confirmed missing: retain normal fresh seed-1 startup and save the initial boundary.
- Valid primary: show Continue/New battle; do not construct a disposable fresh battle, overwrite storage or pump enemies behind the choice.
- Valid backup selected: label it as recovery with possible progress loss. Continue hydrates it without writing. Keep the primary problem and blocked autosave visible until explicit removal/retry resolves it.
- Invalid slots without a candidate: offer exact raw export, explicitly confirmed per-slot removal/reset and retry. Never render raw save text as HTML or log it.
- Acquisition/read failure: show a nonfatal retry/recovery screen. With no existing in-memory session, do not silently start a new battle while an old save may be hidden by denied reads. With a current session, permit continued play but block replacement until absence can be proved.

Export inspected strings losslessly, including oversized/invalid text. Use a JSON download containing slot identity and its original `text` string, so even unpaired UTF-16 code units survive export; verify decoding the download reproduces the inspected string exactly. This transport wrapper is not a new persisted battle format or an import feature. Do not normalize, truncate or invent unavailable data. Revoke temporary object URLs. Keep inspected text available through a failed/partial reset for export. A changed value requires a fresh inspection and renewed destructive choice; never delete the newly discovered value under an old confirmation.

### 4. Replacement is atomic to the player, not a fictitious storage transaction

Under the accepted single-writer, individually atomic-call model, gate the visible transition instead of attempting compensating writes or introducing a second persistence protocol:

1. Capture the old session and inspected raw slot values, prepare the valid next-seed session without pumping it, and pause new command dispatch during the synchronous replacement attempt. Coalesce duplicate requests. At the startup choice, derive the next seed from the selected validated snapshot even before hydration; if no valid snapshot exists after explicit recovery reset, use the existing fresh default seed 1. Never trust a seed extracted from invalid text.
2. Confirm destructive intent when saved/recovery data is being discarded. Use `removeSlot` for backup first, then primary, passing exact inspected text or confirmed absence. The confirmation covers only those values. Stop at the first changed/read/remove failure.
3. Reinspect both slots. Only a successful inspection with both missing permits scene/session replacement. No failure advances the committed seed or disposes the current session. Retain raw copies and clearly report any partial deletion. After cancel/failure, resume the current session; ordinary autosave can persist that same battle, but cannot delete remaining damaged data.
4. After confirmed absence, commit the fresh session, reset transients and advance the seed once to old seed + 1 modulo uint32. Dispose old scene callbacks/audio/listeners and attempt the fresh initial save before enemy pumping. A failed initial save can leave only fresh data or no data, never an old recoverable slot. Keep play available with a warning.

If interruption occurs before both removals finish, a reload can offer the old battle because replacement never committed; that is an incomplete reset, not a successful New battle. If it occurs after both removals, reload sees no old battle. This is the chosen fallback for failed invalidation. Concurrent tab writers and browser eviction remain outside the adapter guarantee; document one active battle tab rather than claiming compare-and-swap or durable transactions.

Routing must change at all three layers: `main.ts` must not unconditionally mark the app loading before a potentially refused battle restart; `start.ts` must delegate battle restart to the coordinator/scene request while proof keeps its existing restart; `BattleDialogs` callbacks must use that same request. Preserve the current single Phaser game/canvas and sound preference across successful scene restart. A failed reset must leave usable controls and focus, not strand an ended battle behind a dismissed outcome dialog.

### 5. Native controls share existing input boundaries

Extend the existing dialog/HUD patterns or add one small persistence view beside them; avoid a second modal state system. Continue/recovery choice occurs before gameplay becomes interactive. Use safe text, semantic native buttons, status announcements, 44 CSS pixel targets, focus restoration and gesture reset. Dialogs may pause the next enemy pump but never undo or replay an already accepted command. Closing a recovery modal resumes exactly once. Preserve responsive board space and existing action-confirmation behavior.

## Verification and acceptance mapping

1. **Hydration (issue criterion 1):** extend `tests/unit/battleSession.test.ts` using `tests/helpers/saveFixtures.ts`. Compare hydrated sessions with uninterrupted actual queued decisions, events, state and next RNG across seed 1-5 accepted boundaries; explicitly cover seed 2/command 29, player/enemy, Guarded, victory/defeat and command-limit states. Reject malformed/unvalidated factory input. Verify ownership/freeze and no historical cues.
2. **Autosave (criterion 2):** coordinator/session unit tests assert one attempt per accepted player/enemy command before presentation, none for previews/rejection/acknowledgement, and unchanged accepted state under quota/security/read/observer failures. Include initial-save failure without disabling gameplay when absence was known.
3. **Recovery UI (criterion 3):** unit fault matrix plus real browser controls for primary/backup precedence, invalid/future/oversized data, unreadable storage, exact export, per-slot removal, changed-value refusal and nonfatal status. Assert unrelated/legacy keys stay unchanged, focus is contained/restored, no click-through, keyboard parity and responsive targets.
4. **Replacement (criterion 4):** inject failure or interruption at every acquisition/read/remove/final-inspection/save point. Assert no new seed/session on incomplete invalidation; after success, reload cannot select either old slot even when the fresh initial save fails. Include stale value, double click, cancelled confirmation and modulo seed boundary.
5. **Real-control integration (criterion 5):** add `tests/battle-persistence.spec.ts`, reuse/extract existing battle-loop helpers and clock control. Reach player/enemy presentation through legal UI actions, reload while presenting, choose Continue and compare continuation to an uninterrupted control. Complete legal victory/defeat before testing ended saves/restart. Use injected slot data only for recovery/fault fixtures, never as full-battle completion evidence. Verify one canvas, no stale listeners/commands, no old audio and repeated restart. Existing browser suites start with isolated storage or explicitly select startup actions; do not weaken their assertions.

Run focused regressions, full `npm run test:unit`, `npm run validate:content`, `npm run typecheck` (both configs), `npm run build`, `npm test`, strict OpenSpec and `git diff --check`. Browser projects are desktop plus emulated Pixel 7 portrait/landscape. Record actual browser/commit/results and remaining limitations in `docs/qa/issue-73-battle-resume.md`. Physical iOS is unavailable here; #74 owns that separate certification.

## Risks / Trade-offs

- Storage denial can block a requested replacement or initial start when saved state is unknown -> preserve the existing session when available and provide retry/export; do not promise persistence or discard hidden data.
- Two-slot deletion can partially succeed -> retain inspected recovery copies, report the exact partial result and gate transition on final confirmed absence. No compensating rollback writes.
- Resumed diagnostic consumers may assume a complete replay -> make unavailability explicit in types/UI, retain separate continuation data and test every existing consumer.
- A recovery dialog can interfere with enemy pumping or animation completion -> keep accepted resolution authoritative, gate only future dispatch and resume through one lifecycle owner.
- New PRs can touch shared main/scene files -> recheck/rebase before implementation; PR #93 map work is independent and must not be folded into this plan. #92 remains separate asset-base work.

## Migration Plan

Existing codec format and primary/backup keys remain compatible; no data migration is introduced. Old compatible snapshots become selectable on first load. Invalid/incompatible strings remain untouched until explicit user action. Rollback to the pre-integration application removes live controls/autosave but does not remove storage bytes. Implementation delivery is a later reviewed PR; this planning branch performs no release or deployment and does not close #58/#57/#74.
