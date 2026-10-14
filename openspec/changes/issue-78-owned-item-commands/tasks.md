# Tasks

Implementation awaits explicit approval of this plan. Issue/caller/base/branch are recorded in [proposal](proposal.md); all acceptance mappings and verification commands are in [design](design.md).

## 1. Ownership and command context

- [ ] 1.1 Implement strict owned-stack/instance/assignment and aggregate readers, item revision and bound context in `src/domain/items.ts`; verify malformed shapes, limits, unknown references, duplicate identities, assignment uniqueness, frozen-input independence and JSON round trips in `tests/unit/itemCommands.test.ts`; document exact instance encoding and aggregate/context fields in `docs/run-items.md`.
- [ ] 1.2 Implement boundary/item-revision/active-battle preflight; verify initial, terminal, active-battle, mismatched and stale operations reject with unchanged run/ownership/action/RNG data; document the trusted #79/#80 adapter responsibility.

## 2. Atomic commands

- [ ] 2.1 Implement claim by reusing offer validation and run acknowledgment with preflight grant capacity; verify offered choice, duplicate/stale/tampered claims, stack overflow, equipment overflow/identity collisions, equal-seed replay and no extra RNG; document the single aggregate claim path and offer clearing.
- [ ] 2.2 Implement generic healing use with living/eligible/injured targets and capped base HP; verify exactly-one decrement, zero-stack removal, full/dead/ineligible/unowned rejection and duplicate item revision; document successful and rejected examples.
- [ ] 2.3 Implement equip/unequip/replacement with retained ownership; verify compatible slots, cross-hero instance rejection, living targets, stale intents, retained defeated-hero assignments and replacement/unequip results; document semantics.

## 3. Projection and composition

- [ ] 3.1 Implement fresh base-derived hero stat projection; verify immutable catalog/base records, living-only bonuses, repeated construction, equip/unequip cycles and JSON restoration without accumulation, using projected catalog with existing battle creation/combat and deterministic next RNG; document #80 replay/content-identity reconstruction.
- [ ] 3.2 Exercise an additional validated consumable/equipment fixture through claim and use/projection with existing effect shapes, verifying generic behavior without ID-specific branches; keep tests and API examples alongside the module handoff.

## 4. Integrated regression and delivery

- [ ] 4.1 Run focused tests, full configured unit/content/browser suites including encounter posttest, both typechecks, production build, strict OpenSpec and whitespace; record exact revision/commands/results and genuine limitations, mapping every #78 acceptance criterion to executable evidence.
- [ ] 4.2 Review the issue-only diff against the approved scope, commit/push and open/attach the PR against main; verify published head and PR URL, using Closes only if all #78 acceptance criteria are verified, otherwise a draft with Refs and explicit remaining work.

## Workflow follow-up

- Keep #57 physical readiness and #79/#80 UI/persistence integration as separate gates.
- Do not merge the PR or archive the OpenSpec change before merge.
