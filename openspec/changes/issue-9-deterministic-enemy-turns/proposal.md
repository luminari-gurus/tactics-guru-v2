# Proposal

## Why

Enemies have legal movement and attack rules but no deterministic decision maker. Issue [#9](https://github.com/luminari-gurus/tactics-guru-v2/issues/9) supplies the missing prerequisite for battle integration #10 and downstream validation #11.

## What Changes

- Add a pure chooser for the active enemy's move, ordinary attack and Wait commands.
- Use existing previews and dispatch for legality, with documented total candidate ordering and bounded execution.
- Add RED-first boundary, rejection and seeded replay tests plus a small integration hand-off.

## Capabilities

### New Capabilities

- `enemy-turns`: deterministic legal enemy decisions and bounded command execution.

### Modified Capabilities

None. Existing movement, combat, signatures and turn ownership remain authoritative.

## Impact

New `src/domain/ai.ts`, `tests/unit/ai.test.ts`, and `docs/enemy-turns.md`; existing domain files only if an integration defect requires a narrowly scoped correction. No runtime dependencies, browser integration, timers, AI profiles, difficulty settings or advanced hazard strategy.

## Work identity and dependencies

- Caller/assignee: `dubstylee`.
- Base: `origin/main`, `b86f558` (full SHA recorded by Git history).
- Branch: `work/issue-9-deterministic-enemy-turns`.
- Change: `issue-9-deterministic-enemy-turns`.
- #7 and #8 are closed and their implementation is on main. #9's comment confirms the preview/dispatch hand-off. GitHub reports no blocking relationships; no open PR or task covers #9. #6 is already implemented by merged PR #51.
- Approval: caller explicitly approved this plan on 2026-10-10 in this conversation.
