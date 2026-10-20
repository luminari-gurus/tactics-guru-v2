# Tasks

## 1. Default selection and same-turn behavior

- [x] 1.1 Reproduce missing startup selection, implement once-per-turn initialization and verify first/later/round-wrap turns, overrides, cancel and deliberate movement in existing browser suites; record baseline failure and implementation in the handoff.
- [x] 1.2 Verify unavailable, origin-only, Continue and legal attack-before-move boundaries; repair any demonstrated Move eligibility mismatch using existing rules, and record proof.
- [x] 1.3 Verify restart and run encounter reconstruction with existing replay/lock/gesture regressions; update the battle-controls contract and retain representative screenshots with source identity.

## 2. Integration and review delivery

- [x] 2.1 Pass full unit, build, browser lifecycle including posttests, strict OpenSpec and whitespace checks; finish QA and handoff, commit/push and verify a focused review-ready PR.

## Workflow follow-up

## 3. PR #150 review repair

- [x] 3.1 Reproduce the stale move after clearing the native destination selector; route the placeholder through scene selection and clear destination, intent and preview without changing state or save bytes.
- [x] 3.2 Reproduce the same-destination retry failure after Cancel/Escape; reset movement destination and hover while retaining Move, and prove native keyboard re-selection prepares one fresh intent.
- [ ] 3.3 Validate the rebased integration with local unit/build/browser/posttest checks and strict OpenSpec; reconcile demonstrated stale main-branch test expectations for privacy disclosures, opt-out reads, generated run maps and legitimate terminal outcomes while retaining behavioral assertions; update QA/handoff, publish with an exact lease, address the review and verify merge readiness and remote parity.

- Leave the active change for review and later sync/archive. No merge, release tag or deployment is requested.
