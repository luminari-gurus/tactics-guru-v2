# Tasks

## 1. Run identity and state

- [x] 1.1 Record explicit plan approval in proposal.md before code edits; verify it cites the caller's approval of this specific plan.
- [x] 1.2 Define bounded run types, strict reader and fresh creation in src/domain/run.ts; add tests/unit/run.test.ts for catalog HP, fixed party, three encounter IDs, exact shapes, phase invariants, JSON round trips and invalid numbers/identities; document decisions and field bounds in docs/run-contract.md. Verify focused tests and both typechecks.
- [x] 1.3 Define independent versioned encounter/reward seed derivation and boundary identities; document exact algorithm and add fixed seed vectors, separation and repeated-preview fixtures. Verify focused tests and domain-boundary checks show no entropy/platform imports.

## 2. Atomic transition boundaries

- [x] 2.1 Implement reference battle outcome/reward acknowledgment transitions with expected run/revision/boundary preflight, carryover and wipe/final outcomes; add complete three-encounter traces and stale/duplicate/out-of-order/invalid HP rejection tests proving unchanged inputs and RNG. Document the transition table and trusted completion boundary; verify focused tests.
- [x] 2.2 Define terminal Start new run intent with externally supplied fresh seed/identity and clean full-HP party; add victory/defeat reset and stale callback tests. Document empty ownership and both outcome-screen buttons as #80 obligations; verify focused tests without wiring UI.
- [x] 2.3 Document/type the surviving-party next-battle descriptor, reward identity/seed handoff and versioned save extension points. Map every #75/#59 criterion to contract proof or its owning downstream issue, including #77/#78 atomic ownership and #79/#80 persistence/battle replay adaptation. Verify round-trip/descriptor fixtures and the delivered acceptance mapping; no actual inventory or save codec changes.

## 3. Regression and delivery

- [x] 3.1 Run full unit/content/browser suites, both typechecks, production build, strict OpenSpec validation and git diff --check; record commands, actual results and any unavailable checks in docs/run-contract.md. Verify existing single-battle behavior and distinguish regression evidence from physical/run integration acceptance.
- [ ] 3.2 Review the diff against all five #75 criteria and approved scope; commit only issue changes, push and open/attach a PR with validation and remaining downstream limitations. Use Closes #75 only when its contract acceptance is fully verified; otherwise use a draft with Refs #75.

## Workflow follow-up

- Do not merge, manually close the issue or archive this change before merge.
- #76/#77 may use the accepted contract; downstream feature delivery still requires recorded #57 acceptance.
