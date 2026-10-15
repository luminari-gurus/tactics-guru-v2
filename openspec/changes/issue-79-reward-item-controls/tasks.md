# Tasks

## 1. Run snapshot contract

- [x] 1.1 Record explicit approval in proposal.md before implementation; add the bounded run codec and replace the placeholder contract, verifying round-trip of reward, encounter-entry, active battle and terminal snapshots with exact ownership/stats/next RNG and nonaccumulating projection.
- [x] 1.2 Add malformed, oversized, corrupt, incompatible identity/version, invalid ownership/offer and cross-field mismatch tests; verify rejection before hydration and document the shared payload/32,768-unit bound for #80 in docs/qa/issue-79.md.

## 2. Guarded persistence and session

- [x] 2.1 Add run primary/backup storage and explicit recovery APIs; verify guarded access, quota/interrupted writes, compare-before-remove and exact byte preservation for invalid primary/backup, existing battle saves and legacy keys; document key/recovery semantics.
- [x] 2.2 Add RunItemSession dispatch/restore/save ownership using existing domain commands; verify revision-bound stale/duplicate rejection, authoritative active-battle context, post-claim next encounter, no partial mutation and unsaved status after storage failure with focused session tests.

## 3. Reward and party controls

- [ ] 3.1 Add catalog-driven reward, consumable, target and equip/unequip controls with native review/cancel dialogs and scoped responsive CSS; verify mouse/touch/keyboard paths, eligible-target explanations, projected stats and actual success/rejection through a fixture mounting production modules.
- [ ] 3.2 Add browser checks for rapid/stale submissions, held confirmation keys, cancellation, modal capture and usable focus return; verify no board pass-through, 44px controls, safe areas, 320x568 portrait and 915x412 landscape without horizontal overflow; record screenshots and fixture limitations.
- [ ] 3.3 Exercise reload pending/after claim/use/equip, backup recovery and unavailable/corrupt storage via actual controls; assert identical ownership/stats/next encounter/RNG with no duplicated effects or playback, and document the #80 integration API separately from full-run acceptance.

## 4. Integration verification and delivery

- [ ] 4.1 Run focused tests then full configured unit/content/browser checks including encounter posttest, both typechecks, production build, strict OpenSpec and git diff --check; record exact commands/revision/results, payload sizes and unverified physical/full-run criteria against every #79 acceptance item.
- [ ] 4.2 Commit only approved issue changes, push and open/attach a PR after checking for an existing one; verify branch/PR identity and use Refs #79 with a draft if any issue acceptance remains unmet.

## Workflow follow-up

- Do not merge or archive before review/merge. #80 connects complete run progression; #81 retains physical/full-run certification.
