# Proposal

## Why

Issue [#76](https://github.com/luminari-gurus/tactics-guru-v2/issues/76) needs three authored encounters after the accepted #75 run contract. Main currently has one authored map; a validated roster will supply #80 integration without changing the current single battle.

Caller: `dubstylee`. Branch: `work/issue-76-authored-encounters`. Base: `origin/main` at `7a9b22b73f5187fff5a27701a2879e94368a148a` (merged PR #107). Implementation approval: caller explicitly approved this published plan on 2026-10-14 ("Approved").

## What Changes

- Define exactly three ordered encounter IDs mapped to fixed maps: Forest Ruins, Woodland Crossing, and Ruined Approach, using existing heroes, goblins, terrain and assets.
- Keep the current battle catalog/default map intact; expose a separately validated run catalog and run definition.
- Validate encounter references, unique roster/IDs, geometry, spawns and required assets; verify survivor spawn eligibility and tactical reachability with deterministic fixtures.
- Retain portrait/landscape renderer and actual pointer-picking evidence through an isolated browser fixture using production board/input modules.
- Document maps, asset reuse, bundle/transfer impact, acceptance evidence and #80 handoff.

## Capabilities

### New Capabilities

- `authored-encounters`: Ordered fixed encounter content, validation, survivor spawn eligibility and board verification for the three-encounter run.

### Modified Capabilities

None. Existing board/control requirements remain regression constraints.

## Impact

Expected files: `src/content/encounters.ts`, two new authored map modules, `tests/unit/authoredEncounters.test.ts`, `tests/authored-encounters.spec.ts`, a minimal `tests/fixtures/encounters/` browser entry, and `docs/authored-encounters.md`. Validation wiring also affects `package.json`, `playwright.config.ts`, `playwright.encounters.config.ts` and `tsconfig.json`. Reuse `src/content/validate.ts`, `src/domain/run.ts`, `src/domain/turns.ts`, `src/phaser/BoardRenderer.ts` and `BoardInput.ts`; change these only for a demonstrated requirement within scope.

No run progression UI, reward/item logic, production carryover constructor/replay changes, persistence changes, new art, balance/stat/ability changes, dependency updates or deployment. #57 still gates feature release; #81 owns full-run balance and physical certification.

## Backlog readiness evidence — 2026-10-14

Reviewed all 19 open repository issues with paginated bodies/labels/assignees, GitHub dependency summaries (all zero), relevant comments, all open PRs and remote branches. GitHub caller verified through `gh api user`: dubstylee. Main fetched and PR #107 verified merged at the base above; #75 is closed and its contract is present. No issue-76 branch or open PR existed before this claim. Assignment and remote publication were read back successfully.

Promotions, each re-read immediately before adding only `ready for work`, then verified:

- [#76](https://github.com/luminari-gurus/tactics-guru-v2/issues/76): #75 accepted/merged; concrete content and verification scope. Supplies #80, which in turn supplies #81. Chosen for evidenced downstream value among executable candidates.
- [#106](https://github.com/luminari-gurus/tactics-guru-v2/issues/106): existing abilities and presentation lifecycle on main; concrete animation/cleanup acceptance, no implementation prerequisite or active branch/PR.
- [#108](https://github.com/luminari-gurus/tactics-guru-v2/issues/108): bounded design deliverables, established HUD/actions and explicit acceptance; coordination with #106 is not a merge prerequisite.

Unchanged dispositions:

- #64/#66 require physical-device evidence; current agent device access is not established. #66's retained branch is explicitly historical per its latest comment, not active implementation. No hardware certification is inferred.
- #96 is assigned to moshehbenavraham and covered by open PR #105; excluded.
- #77 now has its #75 prerequisite complete but lacks reviewed item/balance/ownership choices; leave unlabelled rather than infer the product contract. #78 waits for #77; #79 waits for #78; #80 also waits for #78 and #57; #81 waits for #80/#79/#58/#57.
- #74 still waits for #57 despite merged save implementation. #57/#58/#59/#60 are incomplete parent acceptances, not executable single-task scopes.
- #84 needs owner target/path decisions; #85 waits for #84/#57 and explicit activation authorization. #83 is their parent epic.

Backlog refreshed after promotions before selection. Existing local checkout hosts issue-75 work; managed isolated worktree preserves it. Branch publication verified at the main base before planning. Only planning files have been changed here.
