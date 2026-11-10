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
Automatic recording is added in the dependent authored-run and dungeon increments;
the empty state alone is not evidence that issue #176 is complete. Planned endings
are authored victory/defeat and confirmed replacement, and dungeon defeat or
confirmed replacement. Floor/guardian wins, stairs, backtracking, menu return and
page closure do not end the endless dungeon. Dedicated testing routes and
standalone battles do not create run records. See the active
[implementation plan](ongoing-projects/plan.md) for acceptance and current progress.
