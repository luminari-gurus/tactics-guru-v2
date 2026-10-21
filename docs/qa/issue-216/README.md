# Legal-defeat lifecycle test repair (#216)

Base: `3510d1e3db8814b9111b76676e8413c90dedb8a5` (current main).
Only the targeted unit scenario changes; application code, dependencies, helper
implementations, retries and the existing five-second timeout remain unchanged.

## Failure and profile

PR #215's original hosted [run 39683698696](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39683698696)
executed 909 cases: 908 passed, the legal-defeat lifecycle case timed out
(6600.53 ms). Local exact-base full/focused comparisons also failed that case.

Temporary local timing wrappers, removed from the final test, measured 9008.23 ms
for the original case. `RunItemSession.save` ran 68 times and consumed 6294.40 ms.
`nextEnemy` ran 53 times (6934.82 ms inclusive), player confirmation 14 times
(1844.92 ms inclusive), and `startEncounter` ran three times (132.19 ms).
These are nested/inclusive timings, not additive CPU samples. Real persistence
revalidates and serializes accepted states and checks existing primary/backup
records; repeatedly simulating a full-health loss dominated this lifecycle case.

## Repair and coverage mapping

Use the existing `preparedSnapshot()` boundary fixture with one surviving fighter
at one HP. The real snapshot validator admits the boundary, the real battle/session
code executes defeat, and real storage still validates, encodes, writes, loads and
resets saves. The fixture is an explicit prepared boundary, not proof of a legal
full playthrough. The test asserts its one-HP player roster.

Every original lifecycle assertion remains: owned-session reuse, accepted defeat,
active-battle cleanup, ended-session behavior, exact restored state, reset,
stale-review rejection, seed preservation, disposed session and primary storage.
Additional assertions verify a single run-revision increment and no extra save
when invoking the ended session. The storage spy calls the real implementation.

Full-health legal journey coverage remains in the unchanged `replays a legal
representative run to a reproducible terminal outcome` case (real controller,
storage, commands and replay). The unchanged ended-snapshot restoration case
also executes a seed-1 full-health defeat. Survivor-subset admission, next-RNG
continuation and replay identity remain in their original cases. No case is
removed, renamed, skipped or given a larger timeout.

## Validation

Local Node 24.19.0, Vite 8.3.5 and Vitest 5.0.3:

- `npm run test:unit -- tests/unit/runBattle.test.ts --maxWorkers=1 --reporter=json --outputFile=...`:
  8/8 passed; repaired case 1555.47 ms, unchanged representative run 17605.13 ms
  within its existing 120-second budget.
- After adding the explicit one-HP roster assertion, the final focused case passed
  in 1641.77 ms with the unchanged five-second limit. Seven other cases were
  intentionally unselected in this focused check; this is not full-suite evidence.
- The initial attempt to injure a fresh first-encounter snapshot was correctly
  rejected as invalid. The final prepared second-encounter boundary is admitted;
  no validator or production rule was weakened.

See `validation.json` for local timings and final test SHA-256. Hosted full 909-case
qualification and root/prefix/restoration builds are recorded on the PR at the
exact tested integration SHA. Local profile and candidate timings have different
instrumentation and fixture work, so no overall build/test speedup is claimed.
Browser/performance-matrix qualification remains separate; no browser code changes.
