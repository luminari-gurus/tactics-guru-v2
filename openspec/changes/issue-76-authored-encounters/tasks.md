# Tasks

Implementation approval is pending. Record the caller's explicit approval of this plan in proposal.md before implementation. All boxes remain unchecked until completed and verified.

## 1. Author and validate encounter content

- [ ] 1.1 Add the ordered three-encounter roster, two fixed 12x12 map modules and separate validated run catalog; verify IDs/references/geometry/spawns through focused authored-encounter and existing content tests, including unchanged single-battle content identity and deterministic catalog fixtures.
- [ ] 1.2 Add the narrow runtime encounter reader with structured failures for malformed IDs, duplicate/missing heroes, unknown maps and invalid map references; verify adversarial input tests and existing asset-file checks. Document roster, layout differences, spawn tables and reused asset provenance in docs/authored-encounters.md.

## 2. Prove survivor eligibility and tactical routes

- [ ] 2.1 Add a pure validated survivor spawn projection retaining authored numeric IDs and enemy spawns, with no production carried-HP battle/replay changes; verify all three maps times all seven nonempty survivor subsets, bounded injured/one-HP fixtures, no defeated spawns, malformed/empty input rejection and immutability.
- [ ] 2.2 Use existing state/movement/targeting validators to prove projected starting states and legal movement routes to enemy engagement for every survivor subset; retain deterministic seeds/fixtures and document the exact #80 spawn/carryover handoff and fixture limits.

## 3. Verify browser rendering and picking

- [ ] 3.1 Add the minimal isolated browser fixture using production asset loading, BoardRenderer and BoardInput with explicit cleanup; verify it resolves only valid encounter IDs, does not write battle saves, and stays outside production build entries. Add browser missing/decode and malformed encounter checks with controlled errors.
- [ ] 3.2 Add focused browser tests for all three maps in portrait and landscape using real mouse/touch selection, pan/zoom and resize; verify tile coordinates, elevated top/side selection, unit anchors, reachable overlays and no page errors. Inspect and retain build/seed/viewport-identified screenshots and document results in docs/authored-encounters.md.

## 4. Complete integration verification and delivery

- [ ] 4.1 Run focused encounter checks, npm run test:unit, npm run validate:content, npm test, npm run typecheck, npm run build and a /prototype/ base-path production build; run git diff --check and openspec validate issue-76-authored-encounters --strict. Record actual results, failures and unavailable checks in the acceptance matrix, preserving existing battle/persistence behavior.
- [ ] 4.2 Compare baseline/result dist and transferred asset/code sizes against documented budgets; verify no added media bytes, record measured increases and remaining #57/#80/#81 gates, and confirm every #76 acceptance criterion and approved-plan requirement has evidence before choosing complete versus draft PR status.

## Workflow follow-up

- Commit and push only issue 76 changes, then open and attach the PR against main. Use Closes #76 only when all its acceptance criteria are verified; otherwise use a draft and Refs #76 with remaining gaps.
- Do not merge or archive before merge; no production activation is authorized.
