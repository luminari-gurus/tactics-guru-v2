# Hall of Records

Hall of Records opens from the existing main menu. History belongs to this browser
and device; it is best-effort browser storage, separate from active game saves.
Clearing site data also removes history. The view retains the newest 100 journeys,
ordered by recording time with a stable journey-ID tie-break.

## Record contract

Each immutable summary identifies an authored run or dungeon, its existing journey
ID, outcome and recording time. Recent summaries show enemies killed, battles won,
moves taken, floors cleared and active playtime. Dungeons also retain deepest
visited floor; authored floors are N/A. Missing historical totals display as
unavailable, and continued older journeys label new counters as since upgrade.
Playtime may be partial while kills/moves remain whole-run facts; labels and
personal-best eligibility follow each field's actual coverage.
Personal bests disclose per-mode maxima and open the originating frozen summary,
including winners that have left the newest 100. Native disclosures work with
keyboard and touch, within the existing focus-preserving recovery dialog.

## Active counters (issue #270, increment 1)

Menu-origin authored runs and dungeons now save a version-one statistics value
alongside active progress (authored envelope 10, dungeon envelope 12). All prior
supported formats remain readable without rewriting them on inspection/Continue.
Stats-bearing saves rotate complete matching battle/counter snapshots into backup.
The prior draught reader's pre-battle compatibility checkpoint is retained for
old untracked saves; newer statistics envelopes promise no older-app rollback.
Kills count enemy `defeated` events in the current accepted command batch. Moves
count one accepted hero movement command, regardless of path length, or one
published adjacent exploration step. Undo removes its move; enemy movement,
previews, rejected commands and floor travel alone add nothing. Wins and unique
cleared floors derive from validated progress; authored floors are not applicable.

Only irrecoverable kills, net moves and active milliseconds plus a bounded last
battle/command receipt are stored. Repeated or older batches cannot increment them.
Continued old journeys begin irrecoverable counters on their first accepted action
with `since-upgrade` coverage; missing old totals are never whole-run zeroes.
New menu journeys use `whole-run` coverage. Testing routes disable accumulation.
The active clock and immutable summary/best projection are described below. The
Hall of Records presents those frozen values without changing stored bytes merely
by opening a record or a personal-best disclosure.

## Active time and immutable personal bests (issue #270, increment 2)

Timed stats use version two, in run envelope 11 and dungeon envelope 13 for legacy sight or 17 for wall-aware sight. The
counter-only increment's v1 stats (run envelope 10, dungeon 12/16) reserved zero time without
measuring it. Their known kill/move coverage and values remain intact; only time
is marked since upgrade via `timeCoverage`. Partial time cannot set a complete
duration maximum, while whole known kills/moves can still set their own bests.
Legacy reading normalizes in memory and does not rewrite stored bytes.

Active milliseconds accumulate only during admitted, visible, focused ongoing
battle (including animations and enemy turns), or ready dungeon exploration.
Startup/loading, preparation, rewards, terminal screens, menus and paused dialogs
do not count. There is no arbitrary inactivity timeout. One monotonic clock per
owner samples accepted actions, eligibility changes and a five-second checkpoint;
only elapsed integer milliseconds are saved. New processes start paused, so closed
time is never added. Undo removes movement, retaining elapsed time.

Opening a save review pauses and flushes time before reading the reviewed bytes.
The authored owner waits for its existing save queue in a cancelable pause dialog;
Cancel resumes play even if another tab holds the write lock. Time checkpoints
cannot change a paused review token. Normal same-origin links checkpoint before
navigation. Confirmed replacement keeps its modal open through history staging;
the old scene stops before that modal closes. Thus a pending enemy turn cannot
change the frozen journey while the accepted replacement is being prepared.
Hide/blur/pagehide close the active interval, and an already queued
final write can finish after owner disposal. Browser/process termination or storage
refusal can still lose uncommitted intervals; no second journal or closed-time
compensation is used. Successful clock writes preserve current focus/scroll rather
than rebuilding the game view.

Version-two history retains the same primary/backup keys, newest 100 summaries and
single/paired replacement receipts. Each new ending freezes its versioned stats
with the original outcome. Only accepted recording boundaries update per-mode
maxima; duration ranks by **longest active playtime**, across all outcomes. Equal
maxima select newest recording time, then stable mode/ID order. At most five
winning summaries per mode remain accessible even after recent-list eviction.
Authored floors are not applicable. Partial since-upgrade kills/moves/time do not
compete as whole-run maxima; exact known wins/floors remain eligible.

Version-one history is read lazily without rewriting bytes, carrying retained
known facts and a historical best-coverage limitation. Evicted old history cannot
be reconstructed. Unknown/corrupt bytes retain explicit export/recovery. Reset
clears recent history and personal bests together, preserving active saves.

Future damage by class/type belongs in a new version of the pure `runStats.ts`
accepted-event reducer. Its before/after battle context and exact event batch
permit new counters without reading UI or replaying history. Damage attribution
may require additional domain event fields; no breakdown or extension registry is
implemented now.

The first accepted result for a mode/ID wins. Repeated callbacks cannot rewrite its
outcome or time. Two bounded current-journey receipts protect pending replacement
and prevent a still-current terminal save from recreating an evicted old record.
The model and adapter are shared; counters come from the pure accepted-event
accumulator, never rendered text or sprite state.

## Storage and recovery

History uses `tactics-guru:records:primary:v1` and
`tactics-guru:records:backup:v1`. The bounded envelope includes a digest and is
validated before use. These keys retain their original namespace; payload version
two reads version-one history compatibly. Writes use a records-specific browser lock
and verified by readback. Missing lock/storage access or write failure is reported;
it never changes combat or prevents playing.

Opening records is read-only. Missing history shows an empty state; invalid or
future-version bytes are preserved. A valid backup can be displayed as degraded
history without repairing the primary automatically. Explicit Export downloads
the reviewed slot bytes. Restore reviewed history or confirmed Reset records
rechecks both exact slots under the lock; stale reviews are refused. These actions
write only records keys, preserving active run, dungeon and battle saves.

## Incremental delivery

The first increment supplies the model, persistence adapter and real menu view.
The authored-run increment records accepted victory/defeat, explicit terminal
Continue and confirmed replacement. A bounded pending receipt is saved before
replacement; it is finalized only after the existing run owner accepts replacement.
Cancel, stale review and failed partial reset do not record abandonment. After an
interruption, Continue of the validated new identity finalizes the old record;
Continue of the old identity cancels that intent. Unknown identities keep an honest
unresolved status. History failure cannot prevent a new game.
Accepted authored endings submit history before active-save serialization, including
explicit unsaved play or denied active-save locks. Encounter entry stays disabled
until replacement's final history mutation finishes. Preparatory history feedback
does not invalidate the save owner's reviewed confirmation.

The dungeon increment uses that same boundary for defeat, explicit terminal
Continue and confirmed replacement through either the in-flow dialog or root-menu
New Game handoff. Both reviewed slots are rechecked, and a newly accepted
exploration step is preserved if it races replacement preparation.
Floor/guardian wins, stairs, backtracking, menu return and
page closure do not end the endless dungeon. Dedicated testing routes and
standalone battles do not create run records. See the
[foundation plan](ongoing-projects/issue-176-local-records-plan.md) for acceptance and progress.

Explicit unsaved dungeon play also admits a journey before its first move; accepted
defeat or confirmed replacement can record it even if active saving is disabled or
conflicted. Replacement keeps exploration and pending battle loading paused until
its history boundary finishes. Reload recovery lets native dungeon engine imports
request restored modules directly, retaining other preload hints.

When New Game replaces a reviewed save while a different admitted journey is live,
both ended identities are recorded together. Cancellation, stale review and partial
reset record neither as abandoned. A pending history receipt carries at most two
summaries; it finalizes both on Continue of the accepted new identity and cancels
them on Continue of an old identity. It also retains up to two frozen-result IDs,
so known results stay immutable through refusal, interruption and summary eviction.
Legacy v1 single-summary receipts remain readable without an opening write. The
extension uses the same bounded history namespace; active saves are unchanged.


## Save review and departure safety

Dungeon saves, spatial publication, retries, removal and replacement share the
origin lock named by the dungeon primary key. Reviews await queued clock writes
before inspecting bytes; a no-op flush is a queue fence and does not retry or
recreate a deliberately removed save. Removal stays paused while its lock is pending.
Fresh elapsed playtime and explicit Retry saving can still create a new checkpoint.

Same-tab gameplay links flush before checking the existing unsaved-progress guard.
Cancel keeps the owner available for recovery/export; explicit discard permits
navigation. Opening recovery is independent of whether the flush actually saved.
Dungeon flushes also await their mutation queue, including the final admitted clock
checkpoint after disposal. Abrupt process termination can still lose the last bounded
checkpoint interval; there is no synchronous unlocked unload write.

New wall-aware timed saves use envelope 17 and read counter envelope 16 as partial
time, retaining exact fog memory. Legacy-sight 12/13 and untracked fog 14/15 stay
supported, as do older fog-preview 12/13 payloads without statistics. A client
predating statistics cannot resume the new envelopes. Recover/export using a
statistics-capable build; do not reset or silently downgrade for an old client.

Records updates from another tab preserve open personal-best disclosures and restore the matching focused summary or action. If that control disappears, focus moves to the current status inside the dialog.

Pending failed checkpoints remain distinct from deliberately removed slots; fresh accepted playtime/progress or explicit Retry saving can save again. Ending history is submitted independently of active-save locks. Review preparation blocks reentrant eligibility until its modal opens, and completed unload flushes avoid new no-op locks.
