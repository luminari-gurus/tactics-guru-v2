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
standalone battles do not create run records. See the active
[implementation plan](ongoing-projects/plan.md) for acceptance and current progress.

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
