## 1. Save completion

- [x] 1.1 Add a deterministic lock and clock regression and reproduce the original failure on the pinned base.
- [x] 1.2 Preserve the queued save's snapshot, result and feedback through playtime capture. Verify success, refusal, teardown and stale request handling with the dungeon session tests.
- [x] 1.3 Address the PR review: carry superseded feedback, fold every playtime sample, finish the latest request after disposal, and cover granted and refused stale Continue for both slots.

## 2. Integration

- [x] 2.1 Run the PR verification suite and the affected persistence and lifecycle browser cases listed in the handoff. Record results and source identity.
