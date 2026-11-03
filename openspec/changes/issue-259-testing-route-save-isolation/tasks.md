# Tasks

## 1. Entry and menu boundary

- [x] 1.1 Recheck main and draft PRs #273/#274, capture current selected test IDs, and implement the closed root `game` entry policy plus menu URL builder; verify root/prefix, diagnostic precedence, unknown/conflicting parameters and one-shot intent reload behavior in route units.
- [x] 1.2 Update menu New/Continue/recovery navigation and production preload routing; move #269 destination checks into persistent root play, update main-menu documentation, and verify empty, changed, backup-only and failed-write menu cases plus root/prefix build-header checks.

## 2. Transient gameplay owners

- [x] 2.1 Supply standalone testing battle through the existing storage-independent session and make persistence explicitly absent in testing run/dungeon owners; verify no storage-provider acquisition, complete legal actions, fresh restarts, transient floor travel and unchanged persistent failed-save guards in focused session tests.
- [x] 2.2 Scope recovery controls, menu-review handoffs and departure feedback to persistent owners, retaining all non-save tools; update dungeon/persistence documentation and verify native keyboard/touch controls, restart, modal cancellation, pagehide and BFCache behavior in affected browser cases.

## 3. Coverage and collector consumers

- [x] 3.1 Move direct-route save/recovery expectations into menu-owned journeys using existing helpers; verify primary/backup byte preservation, current/old/corrupt/unavailable storage, exact resume/replay and new-game safeguards, with a recorded old-to-new coverage mapping and updated verification policy where selection changes.
- [x] 3.2 Add direct-route fresh-session/no-save-access cases and update collector warm navigation to avoid clearing saved progress; verify battle/run/dungeon/map and explicit diagnostic scenes, forged entry parameters, root/prefix paths, legal dungeon descent/ascent, and retained collector controls/cold-warm semantics.
- [x] 3.3 Audit every changed helper consumer across ordinary, dev fixtures, WebKit acceptance/exploration, telemetry, assets and extended journeys; verify exact discovery/selection accounting and update relevant configs/contracts only where required by moved or added cases.

## 4. Integration qualification

- [ ] 4.1 Account for the final full-regression inventory and affected extended journeys, running remaining checks locally under the caller's execution update instead of waiting for CI; verify both TypeScript scopes/builds, complete coverage ledger and exact source/build/browser identities, retaining all failures, skips, incomplete runs and justified reused results.
- [ ] 4.2 Audit every #259 acceptance criterion against code and retained evidence, validate this OpenSpec change and diff scope, then publish the focused implementation PR with issue links, source-bound validation and remaining limitations; use a closing reference only after all acceptance gates pass.

## Workflow follow-up

- Implementation was authorized by the caller on 2026-11-03. Current progress, source identities, qualification jobs and retained failures are recorded in `docs/ongoing-projects/plan.md`.
- Merge/deployment and closing related #176/#270 work are outside this request. Archive/sync the completed OpenSpec change through the repository's normal post-merge workflow.
