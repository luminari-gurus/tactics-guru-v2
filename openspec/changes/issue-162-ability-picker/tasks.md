# Tasks

## 1. Explicit ability identity and availability

- [x] 1.1 Record caller approval in proposal.md and inspect current main/overlapping PR state; verify the approved confirmation and ownership contracts still apply before code edits.
- [x] 1.2 Replace first-signature lookup with explicit AbilityId selection and a shared minimal action helper; verify pure tests with at least two non-basic profiles per hero, catalog permutations and foreign/unknown IDs.
- [x] 1.3 Implement catalog-derived metadata and current ownership/budget/phase availability; verify range/effect and disabled reasons against profile/session truth and document absent level/use/cooldown systems in docs/signature-abilities.md.

- [x] 1.4 Implement the caller-approved validator extension; verify valid additional profiles plus malformed IDs, fields, bounds and owners while preserving canonical checks.

## 2. Accessible controls and consistent targeting

- [x] 2.1 Add the labeled native ability selector retaining Move/Basic/Wait and stable focus; verify keyboard/mouse/touch choice, exact selected IDs, disabled reasons, 44px targets and compact layouts in focused browser coverage.
- [x] 2.2 Share ability-specific candidate/command construction across target select, board selection and overlays; verify attack allegiance, defeated/range/LOS rejection, friendly Missile legality and complete same-target multi-missile allocation through authoritative previews.
- [x] 2.3 Add named friendly-fire guidance and deliberate confirmation without changing domain rules; verify cancel/Escape leaves state/RNG/replay/save bytes unchanged and one confirmation accepts one command, documenting the targeting contract alongside existing signatures.

## 3. Intent lifecycle and representative play

- [x] 3.1 Preserve explicit ability/target/pending intent through inspection and resize, clear stale intent on action/actor/cancel/restart transitions, and reconstruct current availability on Continue; verify exact state, RNG, replay and raw-save comparisons with focused tests.
- [x] 3.2 Add isolated validated multi-ability catalogs using only implemented profiles for Fighter/Ranger/Mage; verify later-entry selection, unavailable ownership/spent/phase cases, repeated use and authoritative resume, keeping fixture definitions out of production bundles.
- [x] 3.3 Exercise actual production signatures on standalone/run routes and desktop/320px portrait/short landscape; retain and visually inspect screenshots plus keyboard/touch and modal-focus evidence, with source/browser identity and fixture limitations in docs/qa/issue-162-ability-picker.md.

## 4. Integration qualification and delivery

- [x] 4.1 Run focused tests, full unit/content checks, both TypeScript scopes, production build and full configured npm browser suite including posttests; reproduce/disposition #190 baseline failures without skips or weakened assertions, record all actual results and remaining acceptance gaps in the QA report.
- [ ] 4.2 Compare delivered behavior with every issue criterion and spec scenario; verify strict OpenSpec and git diff checks, commit only approved issue work and push. Open/reuse and attach a PR; use Closes only for fully verified acceptance, otherwise a draft with Refs and explicit gaps.

## Workflow follow-up

- Do not merge or archive before merge. Implementation requires explicit approval of this published plan.
