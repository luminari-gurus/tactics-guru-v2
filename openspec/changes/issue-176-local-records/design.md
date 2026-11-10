# Design

## Context

See [proposal.md](proposal.md) for motivation and
[plan.md](../../../docs/ongoing-projects/plan.md) for inspected owners and acceptance.
The menu already has a modal and records placeholder. RunItemSession and
DungeonSession own validated accepted outcomes and reviewed two-slot replacement;
the menu's New Game confirmation hands replacement off to the dungeon app.
Direct routes already pass null persistence. Domain/content cannot use DOM, Node
or ambient entropy. Existing envelopes validate exact shapes and have recovery
contracts; modifying them solely for history would expand compatibility work.

## Goals / Non-Goals

**Goals:** immutable, bounded, recoverable history for the two real journey modes;
reuse current authorities and keep records failures outside gameplay decisions.

**Non-Goals:** full #270 statistics, standalone-battle scores, currencies, cloud
sync, save import, new dependencies or a general event/recovery framework.

## Decisions

### Small shared record model and projections

Add a pure record validator/projector accepting validated snapshots and an
application-supplied timestamp. Keys combine mode and existing journey ID.
Freeze the first admitted terminal result; a different later candidate for that
key cannot replace it. Project authored wins from phase/index, dungeon wins from
distinct cleared slots, cleared floors from completed floors and deepest floor
from retained descriptors. Floor fields are nullable for authored runs. Reuse
existing bounds and validators. Do not estimate moves, kills or duration.

An accumulator would require new events, undo bookkeeping and active-save
migrations; none is necessary for #176's supported counters. #270 can introduce
those with its own versioned projection and compatibility policy.

### One bounded history envelope

Use records-specific primary/backup keys and one injected-provider adapter with
version, up to 100 summaries, and bounded current-journey receipts (one per mode).
Use strict size/shape/unique-key validation, defensive copies, verified writes and
newest-first timestamp ordering with a stable key tie-break. Serialize mutations
under a records-specific browser lock, following existing run-save locking.
Do not silently fall back to unlocked conflicting writes; report unavailable
recording while allowing gameplay. Verify concurrent candidates in units and a
bounded two-tab witness. This is not a claim of distributed transactional storage.

A current-journey receipt records pending replacement or a sealed terminal key.
It prevents a still-current old terminal save being reinserted after retention
eviction. Keep only the receipts needed by the current owned journey per mode;
no unbounded tombstone list or per-action journal. Retention intentionally discards
old history. Manually restoring arbitrary external archives is not a supported
import feature and cannot reconstruct discarded history.

### Finalize from accepted owners

Gate recording construction and every operation with the persistent entry policy.
Invoke finalization at accepted terminal state in each session, and idempotently
on explicit Continue of validated terminal data. Never record the fresh placeholder
created before storage inspection. Existing terminal records keep their timestamp
and values on retry. A terminal save whose history write was lost can supply its
summary again; the visible time is recording time, not a claim of original wall-clock
completion time. Do not change saved combat bytes or replay historical events.

For replacement, capture the exact validated old summary and expected reviewed
save identity before destructive work, persisting a small pending receipt when
storage permits. Finalize abandonment only after the existing replacement method
accepts the new identity. Canceled/stale/failed replacement does not finalize.
After interruption, reconcile pending data against validated saved identities;
if both identities are absent or otherwise ambiguous, retain it and show an
unresolved status until an explicit reviewed choice supplies evidence. Do not
infer abandonment solely from missing slots. A receipt-write failure must be
visible but cannot block the already authorized new game or imply history survived.

Record before discarding the old snapshot, through one small helper used by the
in-flow replacement and root-menu destination handler. Returning to menu suspends;
pagehide is cleanup, not an ending. Dungeon guardian/floor wins, stairs and
backtracking never invoke terminal recording. Existing confirmation text should
explain that confirmed replacement ends the prior unfinished journey.

### Reuse menu recovery and focus patterns

Replace the placeholder with a small renderer inside the current dialog. Show
mode, outcome, recording time and supported counters. Missing history is empty;
unavailable is explicit; a valid backup can be displayed as degraded while
retaining bad primary bytes. Export and reviewed records-only reset/restore use
existing explicit-download and confirmation patterns. No auto-clear on parse or
version failure. Refresh when opened and on relevant storage changes without
creating gameplay sessions. Labels state local scope and best-effort persistence.

## Risks / Trade-offs

- Two stores cannot be atomically committed with localStorage: bounded receipts,
  idempotent finalization, readback and honest unresolved states cover recovery;
  storage denial still means history is best effort, never guaranteed durable.
- Concurrent tabs can present competing endings: serialized history writes freeze
  the first admitted result and preserve existing active-save stale-write guards.
- Derivable counters omit detailed statistics: label only supported facts; keep
  #270 open and avoid invented zero values or misleading best-run claims.
- Cross-cutting lifecycle consumers can regress: verify legal menu/run/dungeon,
  terminal resume, replacement, route isolation and relevant WebKit behavior with
  exact source/build evidence rather than relying on pure-model tests alone.

## Migration Plan

Introduce a fresh history namespace; missing keys mean no previous collected
records. Do not scan active saves merely by opening the menu or retroactively
label an unfinished existing run as finished. Explicit Continue can record an
existing validated terminal journey, identified as recorded now. Active save
formats/readers remain unchanged. Unsupported history versions retain recovery
bytes rather than guessing a migration. A code rollback leaves history keys
untouched and existing gameplay saves readable. No deployment is authorized here.

Implement the three increments in the plan; freeze and verify each independently.
The first two PRs reference #176; only the final fully verified increment closes it.
