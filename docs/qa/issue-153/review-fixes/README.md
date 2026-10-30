# PR #256 review repairs

Both findings were repaired on `work/issue-153-portrait-main-menu`. Source/build
hashes and original reports are retained alongside this file. Runtime was tested
as a dirty tree based on `74949a4`; later edits only add evidence and the bounded
self-hosted job. The original full run at `6559b9c` remains intact; it does not
claim to execute these repairs.

## P1: unsaved dungeon departure after rejected input

`DungeonSession.hasUnsavedProgress` derives from explicit save/adoption state and
unsaved play, independent of transient status messages. Successful saves, saved
spatial publication and reviewed continuation establish durable progress. Failed
saves, unsaved play, removal and partial replacement retain an unsaved boundary.
Rejected movement/item feedback cannot clear it. Dungeon return links and the
failed-new-game recovery handoff use this owner state.

Regression coverage performs a legal unsaved move followed by a blocked keyboard
move, cancels departure, proves the snapshot is retained, exports the actual current
snapshot, then accepts departure. The same flow covers failed new-game saving.
Units cover rejected-command feedback, successful retry, removal and continuation.

## P2: return from modal battle states

Victory/Defeat now offers a native Main menu button inside the modal. Startup save
recovery also offers it for missing, invalid and inaccessible storage. The action
shares the existing departure confirmation/recovery contract with ordinary links,
and performs base-aware full-page navigation. Restart remains available. Terminal
keyboard activation and recovery return preserve saved bytes; no reset is required.

## Validation and retained failures

- Final production menu suite: **53 Chromium cases passed, one timed out** in the
  existing mobile-landscape recovery-export case. Its focused rerun passed **1/1**;
  both reports remain. This is combined coverage of **54 cases**, not a clean
  full Chromium invocation.
- Final iPhone WebKit menu suite: **36/36 passed**, zero skips/retries.
- Targeted dungeon session/lifecycle cases: **6 passed**, remaining 48 deliberately
  not selected. Full battle-persistence units: **38/38 passed**.
- The broader dungeon unit invocation passed **53/54**, including all new cases,
  but its existing byte-budget case timed out at 60 seconds (the synchronous work
  returned after about 567 seconds). No baseline failure attribution, limit change,
  skip or passing-full-unit claim is made. Its report is retained.
- Both TypeScript scopes, content validation and production build passed.
- Original default Chromium **808 → 823**, WebKit acceptance **80 → 90**; no old
  selected IDs removed. Existing profile/batch partition and worker/retry rules
  remain unchanged. The modified terminal test retains its ID.

The changed reach is dungeon departure state, ordinary menu link confirmation and
standalone battle modal actions. Existing run and dungeon battle hosts retain their
terminal handoff. No save formats, validators, game rules, artwork or product limits
changed. The older full regression remains useful for unchanged consumers but does
not establish acceptance for these repairs; a branch-scoped `mode=pilot` follow-up
in the registered manual workflow executes the bounded repair coverage on the same
exclusive self-hosted runner, retaining evidence for 30 days. PR #256 stays draft
pending outstanding full-regression/CI gates. No merge or deployment performed.
