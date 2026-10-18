# Tasks

## 1. Shared visibility and accessible controls

- [x] 1.1 Record caller approval in proposal.md before implementation; verify approval names this concrete plan and branch.
- [ ] 1.2 Add shared mobile toggle and compact layout in battleLayout.ts/style.css, starting expanded and retaining only the app-session choice; add browser checks for portrait, narrow, short landscape, desktop and repeated toggles, verifying 44px targets, accessible state, safe-area spacing, visible focus, hidden tab stops and no board click-through (issue criteria 1, 4).
- [ ] 1.3 Verify actor, inspection, target, availability and prepared intent survive toggles through state/replay/RNG assertions; document default/session behavior and screenshot evidence in docs/qa/issue-123-collapsible-hud.md (criterion 2).

## 2. Geometry and lifecycle integration

- [ ] 2.1 Reuse BattleScene's observed drawable region and minimally adjust existing camera fit if needed; add actual pointer/touch picking, pan/zoom, combat feedback and stale-gesture tests after toggles, orientation and resize, verifying reclaimed area and retained valid view (criterion 3).
- [ ] 2.2 Preserve confirmation/cancel, modal capture and visible focus return while collapsed; add tests for prepared review, enemy/presentation locks, outcome, errors and persistence recovery, verifying no extra command or lost intent; record results alongside geometry evidence (criterion 5).
- [ ] 2.3 Exercise both standalone and /run entry points through restart and encounter/boundary transitions, verifying session preference and unobstructed run screens; retain screenshots and touch/keyboard results for Chromium and configured WebKit emulation (criterion 6).

## 3. Integration acceptance

- [ ] 3.1 Run focused collapse tests, npm run test:unit, npm run validate:content, npm run typecheck, npm run build and full configured npm test including encounter/item posttests; record exact commands, versions, failures and limitations with no physical-device claim.
- [ ] 3.2 Run openspec validate issue-123-collapsible-hud --strict and git diff --check; map each of the six issue criteria to evidence, record bundle impact and preserve independent #127 budget failures without claiming release certification.

## Workflow follow-up

- Commit only approved issue changes, push and create/attach a PR against main; use Closes #123 only when all criteria are verified, otherwise a draft with Refs #123 and remaining gaps.
- Do not merge, deploy or archive before merge.
