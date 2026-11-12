# Hall of Records

Hall of Records opens from the existing main menu. History belongs to this browser
and device; it is best-effort browser storage, separate from active game saves.
Clearing site data also removes history. The view retains the newest 100 journeys,
ordered by recording time with a stable journey-ID tie-break.

## Initial record contract

Each immutable summary identifies an authored run or dungeon, its existing journey
ID, outcome and recording time. Supported counters are battles won and, for dungeons,
floors cleared and deepest visited floor. Authored runs have no floor counters.
Only facts retained by validated authoritative progress are projected; detailed
kills, moves, active playtime and best-run statistics belong to issue #270.

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
The duration field is reserved here; active clock measurement, immutable summary
projection, bests and their presentation are the next two increments, not yet
delivered by this counter change.

Future damage by class/type belongs in a new version of the pure `runStats.ts`
accepted-event reducer. Its before/after battle context and exact event batch
permit new counters without reading UI or replaying history. Damage attribution
may require additional domain event fields; no breakdown or extension registry is
implemented now.

The first accepted result for a mode/ID wins. Repeated callbacks cannot rewrite its
outcome or time. Two bounded current-journey receipts protect pending replacement
and prevent a still-current terminal save from recreating an evicted old record.
The model and adapter are shared; no combat event accumulator is introduced.

## Storage and recovery

Version-one history uses `tactics-guru:records:primary:v1` and
`tactics-guru:records:backup:v1`. The bounded envelope includes a digest and is
validated before use. Writes are serialized using a records-specific browser lock
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


## Concurrent dungeon save safety

All browser dungeon mutations share the origin Web Lock named by the primary
save key. Spatial state publishes only after the locked expected-byte check and
primary/backup/checkpoint transaction succeed. Battle saves, explicit retries,
reviewed removal and replacement use the same lock. Missing exclusive access
refuses the mutation and preserves recovery/export; testing routes remain untracked.

Wall-aware counter saves use envelope 16; legacy-sight counter saves retain 12.
Untracked fog saves retain 14/15, including their exact rollback checkpoint. Older
fog-preview 12/13 payloads without statistics remain readable. Counter backups
retain both statistics and exact fog memory. A client predating statistics cannot
resume those new envelopes: recover/export with a statistics-capable build rather
than reset or silently downgrade. Reverse readability by an old client is not claimed.
