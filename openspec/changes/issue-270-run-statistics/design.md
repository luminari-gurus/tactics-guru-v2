# Design

## Context

See [proposal](proposal.md) for motivation and [requirements](specs/run-statistics/spec.md)
for the contract. Inspected main `f0bdac46dbd018ba11300c800e3dfb0d986fd6a5`:

- `BattleSession.resolve` and `undoMove` publish accepted state after resolving
  events; the callback currently exposes state only. `moved`, `moveUndone` and
  `defeated` already exist. Never count the accumulated `events` array on render.
- `RunItemSession` validates a `RunSnapshot`, saves each accepted battle result,
  then clears terminal `activeBattle` via `completeRunBattle`. `DungeonSession`
  similarly owns accepted battle/step publication, with save-before-publish for
  spatial actions. This ordering must also cover stats on the final event.
- Active snapshots have exact-key validation. Current authored envelopes accept
  formats 8/9 plus documented compatibility paths; dungeon formats are 10/11
  with format-9 compatibility. Adding a property requires deliberate versioning.
- `RunHistory` and v1 records already supply bounded pending/sealed receipts,
  paired replacement, cross-tab locks, immutable endings and read-only recovery.
  Existing stats only project battle wins and dungeon floor/depth facts.
- `startRunApp`/`startDungeonApp` know startup/loading/playing/dialog states;
  `BattleScene` already observes visibility. `appEntry.persistent` selects
  menu-origin storage. Testing entries pass null storage and null history.

## Goals / Non-Goals

**Goals:** update counters and active snapshots atomically, keep clock inputs out
of deterministic battle state, preserve paired frozen endings, and make bounded
personal bests survive recent-history eviction.

**Non-Goals:** a generic event bus/journal, backend, telemetry, whole-event storage,
damage breakdown UI, extra currencies, combat changes, revised revival policy,
new packages, new cutscenes or a menu redesign. Existing legacy behavior and
records recovery remain supported.

## Decisions

### 1. One pure accumulator, fed by exact accepted results

Implementation ablation (2026-11-11): persist only irrecoverable kills, net moves,
active milliseconds, coverage and one battle/command receipt in stats version 1.
Project wins and unique floors from validated progress, avoiding duplicate stored
facts. Authored envelope 10 and dungeon envelope 12 carry statistics, including
draught battles. Their backups rotate complete battle/counter snapshots; prior
untracked formats retain the older draught compatibility-checkpoint behavior.
New menu factories explicitly opt in. Old snapshots remain unchanged on read and
gain since-upgrade counters on their first accepted action; testing owners discard
injected statistics and never reduce events.

Add `src/domain/runStats.ts` with a versioned bounded value, validation and pure
reduction. Persist it in `RunSnapshot` and `DungeonState`, rather than a separate
key that could diverge from the active save. Every new menu-origin journey has
whole-run coverage; migrated journeys identify since-upgrade coverage for facts
that cannot be reconstructed. Testing journeys have tracking disabled.

Extend the existing accepted notification with its resolved before/after/events
as an additional compatible callback argument. Keep all current state-only
consumers valid. Apply only the current accepted batch after the journey owner
validates the transition. Use its existing encounter identity and command count
as a bounded last-accepted boundary; repeated notification of that boundary is a
no-op. Do not add an unbounded processed-event set or replay old event arrays.

Count `defeated` only for enemy-side IDs in the authoritative result. Count one
player `moved`, subtract one accepted `moveUndone`, and count one successfully
published adjacent dungeon step, including a step onto an encounter or stairs.
Travel itself, enemy movement and failed save-before-publish steps add nothing.
Undo does not subtract time. Current undo permits only a safe immediately
preceding player move, so its existing domain event is sufficient.

Retain exact wins and floors from validated run phase/unique cleared slots,
integrating these projections into the same accumulator contract. Redelivering a
terminal callback, descending, or revisiting cannot add them twice. Preserve
the terminal event's kill/move update before `activeBattle` is cleared.

### 2. One small clock helper for two real owners

Add an injected monotonic-clock helper in `src/app/ActivePlaytime.ts`. An owner
sets eligibility only after an explicit new/Continue admission: visible, focused,
live, no pause dialog and either a mounted ongoing battle (including presentation
and enemy turns) or ready dungeon exploration. Preparation/reward screens and
loading/error/terminal states pause. There is no arbitrary user-inactivity cutoff;
"idle menus" are the actual non-gameplay screens.

Sample completed intervals on accepted actions, eligibility changes and a single
5-second active checkpoint. Persist elapsed integer milliseconds only; never
persist a running timestamp to bridge process sessions. Repeated pause events
are idempotent; backwards/invalid clock values add no negative time. Pause and
flush before inspecting save bytes or freezing a replacement/terminal summary,
so a timer cannot invalidate a reviewed token or mutate an immutable record.
No whole-state DOM mutation observer or independent timer per statistic.

Route normal navigation through the existing owner checkpoint before disposal.
Flush on hidden/blur/pagehide and stop listeners/intervals on disposal. Ensure
already queued checkpoints are not silently canceled by the disposal guard;
retain existing serialization and expected-primary checks. Checkpoint writes
must not mark gameplay dirty merely by rendering or resume a stale identity.
Browser termination and failed storage can still lose uncommitted progress;
preserve the existing unsaved/recovery status and never count closed time to
compensate. Do not introduce a second lifecycle storage journal for this limit.

### 3. Extend existing history, preserving all-time bests

Use version 2 of the records payload in the existing namespace, with compatible
v1 reading. Add a versioned stats value to new records and all nested pending
receipt records. Existing mode/ID first-result-wins rules remain authoritative.
Retain the 100 recent summaries and a bounded per-mode/per-stat winner map with
the attributed frozen summary (at most ten winner summaries). Update that map
only inside successful `appendRunRecord`-equivalent mutations under the current
lock. UI derivation from only the newest 100 would lose older personal bests and
does not satisfy "across all recorded runs".

Rank each statistic by maximum within authored/dungeon mode. Duration means
longest active play, not fastest victory. Include victory, defeat and abandonment
as the issue's recording boundary requires. Ties follow newest `recordedAt`, then
the existing stable mode/ID order. Authored floors remain N/A; do not invent a
floor model for the three-encounter run. A best's journey reference opens/shows
its retained summary, even after recent-list eviction.

### 4. Explicit, lazy compatibility

Independent increments require a time boundary distinct from the counter boundary.
Counter-only stats v1 (run envelope 10 / dungeon 12) reserve `activeMs: 0` without
measuring time. Timed stats v2 add `timeCoverage`, while `coverage` continues to
describe kills/moves. New timed envelopes are run 11 / dungeon 13. Reading v1
preserves known counter coverage and values but marks time since upgrade; only
partial time is excluded from its maximum. Validate the old run digest against
its raw v1 payload before normalization. Opening still does not write.

Add new active-envelope formats without reusing historical format numbers.
Keep all currently supported readers, digest/identity checks, byte limits,
primary/backup review and recovery. Translate validated old data in memory;
write the new representation only after an accepted save/mutation. Merely opening
the menu/Continue review must not rewrite old bytes.

Old whole-run wins/floors remain exact. Old kills/moves/time are unavailable for
finished records. Continued old journeys track these three from upgrade onward
with a visible partial marker; never rank those partial fields as complete totals.
New journeys supply all applicable whole-run fields. Upgrade v1 history winners
from its retained exact facts only; previously evicted v1 records are unknowable,
so label pre-upgrade best coverage honestly. Preserve unknown/corrupt bytes and
the explicit existing recovery/export/reset flow. Reset clears recent and best
history together, preserving active saves.

### 5. Reuse UI and event extension points

Extend `runRecords.ts` and existing menu CSS for recent stats, per-mode bests and
attributed summaries. Keep storage errors, recovery controls, keyboard focus and
native touch. Format active milliseconds for people without hiding raw precision
in persisted values. Document the stat definitions/coverage in `docs/run-records.md`.

The pure reducer already receives `abilityUsed`, `attackRolled`, `damaged` and
`defeated` context. A later schema version can add per-class/type accumulators
at this boundary. Do not ship optional damage totals or a generic plugin registry
now; some current damage events would need additional attribution for those
future requirements, which is separate work.

## Risks / Trade-offs

- Accepted callback fan-out -> retain callback compatibility and test standalone
  battle/run/dungeon consumers; observers never alter battle rules or RNG.
- Timer versus review/terminal race -> pause/flush before review/freeze, use the
  same owner queue and stale-save guard, and test delayed write plus replacement.
- Save-format growth -> explicit new versions and legacy fixtures, bounded payloads,
  maximum-size tests, preserved corrupt/future bytes and no automatic repair.
- Partial old data -> show unavailable/since-upgrade coverage and exclude unknown
  fields from complete maxima; avoid fake historical zeroes.
- Focus/lifecycle differences -> fake clock tests plus actual Chromium/WebKit
  navigation and native-touch acceptance; retain engine limits and failures.
- Concurrent tabs/unsaved play -> retain existing locking/refusal behavior and
  freeze each admitted journey's own stats; never sum competing snapshots.

## Migration Plan

Deliver three independently qualified increments: (1) compatible stats-bearing
snapshots and accepted counters, (2) active clock plus immutable history/bests,
(3) records UI and whole-issue qualification. Keep `Refs #270` until all eight
criteria are proven; the last PR alone can use `Closes #270`. No deployment is
part of this plan. Because new-version saves can outlive a code rollback, do not
claim reverse compatibility: preserve original bytes and use reviewed recovery
if old code encounters a newer save. No production rollback is authorized here.

No blocking product question remains in this proposed contract. The definitions
above are explicit review choices; a requested change updates the artifacts
before implementation. Exact final envelope numbers and test filters are chosen
against the implementation base to avoid colliding with intervening changes.
