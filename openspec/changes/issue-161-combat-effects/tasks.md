# Tasks

Caller explicitly approved this published staged plan in chat on 2026-10-20. These tasks cover the contract and first production integration; completing them does not imply all #161 downstream mechanics are implemented.

## 1. Contract and scope

- [x] 1.1 Record explicit caller approval of this published plan and verify issue/branch/base identity before code changes; verify approval exists in the conversation and proposal.
- [x] 1.2 Add `docs/combat-effects.md` with the closed case table, source links, concrete ordering/lifetime/bounds proposals and consumer gates from design; verify every #161 criterion is mapped and contract-only cases are clearly labeled.

## 2. First production consumer

- [x] 2.1 Add the minimal shared Guarded evaluator and replace duplicate combat/HUD projection; extend existing combat/feedback tests to prove −2/+2 once, equipment once, ordinary hit/miss/natural-1/natural-20 parity, and matching AI attack scores; document the enabled runtime case alongside the change.
- [x] 2.2 Route Guarded grant, next-turn expiry and defeat cleanup through supported lifecycle helpers; extend turn/combat tests for accepted miss, repeated grant, source/target defeat, initiative wrap and fresh encounter, verifying existing events and no duplicate modifier; update Guarded's current signature documentation.
- [x] 2.3 Verify atomic preflight and pure preview using frozen snapshots and existing rejection/session tests for invalid/stale target, full budgets, RNG exhaustion, repeat preview/cancel and presentation locks; assert unchanged RNG/state/history on rejection and preserve Magic Missile numeric/target-spread regressions.

## 3. Persistence and feedback

- [x] 3.1 Extend existing standalone, run and dungeon save tests for guarded roundtrip/expiry and uninterrupted-versus-resumed continuation, respecting exact shape/size bounds and projected equipment; test historic inert guard on defeated units without pre-integrity normalization, unsupported resource/status fields and preserved original storage bytes.
- [x] 3.2 Extend replay/session tests so accepted guard, expiry and defeat command/event sequences match replay and resumed continuation; prove new encounters carry no Guarded and unsupported effect/resource data remains rejected; document retained format/rules compatibility and future consumer migration gates.
- [x] 3.3 Retain desktop and mobile portrait/landscape browser evidence for Guarded preview/confirm, inspection, incoming enemy attack, save/reload and expiry through existing standalone/run/dungeon flows, with focused WebKit lifecycle coverage; verify visible values agree with authoritative previews and no new action/catalog content is exposed.

## 4. Integration acceptance

- [x] 4.1 Run focused suites, full configured unit/content/type/build/browser checks listed in design (including npm posttest and separately configured telemetry tests), strict OpenSpec validation and diff checks; retain exact commands/results and any real failures in `docs/qa/issue-161-combat-effects.md` without claiming physical hardware testing.
- [ ] 4.2 Reconcile every #161 criterion against the approved increment and downstream gates; verify final diff contains only required files, commit/push and create an attached draft PR using `Refs #161`, explicitly retaining unimplemented consumer-dependent acceptance rather than closing the issue.

## Workflow follow-up

- Activate further effect cases only with the approved real content consumers in #163–#169/#171/#172/#173. Their plans must settle profile-specific DC/duration/adoption/resource and migration details before implementation.
- Keep #161 open until its remaining effect/resource/typed-damage/save/immunity acceptance has real production consumers and verification; this increment cannot certify that work.
- Do not merge or archive automatically; archive only after merge and a separate caller request.
