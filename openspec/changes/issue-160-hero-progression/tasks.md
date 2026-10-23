# Tasks

Caller approved proposal/design/specs in chat on 2026-10-23. Issue #160; branch work/issue-160-hero-progression; base 5a8802753811663957ea38bb828773866b000f95. Browser/device emulation is sufficient; physical access none, required none.

## 1. Progression definitions and pure rules

- [x] 1.1 Add validated progression definitions, hero state/derivation and ability required-level metadata; verify all five thresholds, three HP curves, multi-level/huge awards, cap saturation and malformed definitions/state with focused unit contracts.
- [x] 1.2 Add shared learned-ability projection using implemented content only; verify fixture unlock/locked-command boundaries, existing level-1 signatures, Mage level 1/3/5 missiles and unchanged non-HP stats. Document cumulative XP representation and HP/formula adaptations in current rules docs with pinned legacy references.

## 2. Accepted encounter advancement and shared projection

- [x] 2.1 Integrate authoritative short-run normal/normal/boss kinds and completion awards; verify all award kinds, living-only eligibility, defeat/no revival, terminal award, atomic rejection and repeated/stale completion in run/session tests. Document award timing and eligibility.
- [x] 2.2 Integrate dungeon descriptor-kind awards at completion, including guardian boundaries and prior encounter policy; verify repeated callback/reward/reload/backtrack cannot re-award and floor travel retains progress with domain/session tests.
- [x] 2.3 Apply progression before existing equipment in shared catalog projection and update carried-HP/spawn/readers/preparation caps; verify repeated construction, healing caps, equipment, Guarded, preview/resolution/AI/replay and no cumulative bonuses across all three heroes. Update item/projection contract documentation.

## 3. Saves and recovery

- [x] 3.1 Version progression-bearing state/envelopes/identity and validate learned/progress state on resume; verify run/dungeon active, reward, ready, victory/defeat round trips, seeded replay equivalence and malformed data rejection. Document new versions and identity scope.
- [x] 3.2 Preserve incompatible old run/dungeon bytes and recovery/export behavior, including prior legacy dungeon formats; verify load/inspection never overwrites slots and explicit replacement safeguards still apply. Check whether shared identity affects standalone saves and cover/document its actual compatibility outcome.

## 4. Player feedback and browser behavior

- [ ] 4.1 Show level, XP/next or MAX, learned actions and current/max HP through existing run/dungeon party and inspection views; add accepted-only level-up feedback. Verify accessible labels, no duplicate reload announcements and unchanged targeting/modal locks in UI/session tests; update gameplay docs.
- [ ] 4.2 Add focused legal-boundary Playwright journeys for real victory advancement, threshold healing, all responsive layouts, inspection/picker, reload/floor travel, defeated hero, terminal award and duplicate prevention. Verify discovered case IDs and retain desktop/portrait/landscape screenshots and source-bound reports.
- [ ] 4.3 Cover pre-progression recovery/export and progressed active-battle restoration using existing legal fixtures, including required-level fixture abilities; verify dev fixture selection plus focused WebKit resume/keyboard/touch and representative standalone battle/engine smokes. Keep unimplemented production abilities absent.

## 5. Integrated PR qualification

- [ ] 5.1 Map affected consumers and discover the exact PR-readiness selections under docs/verification-policy.md; run full units, content validation, both TypeScript scopes and production build, plus affected run/dungeon/item/save/picker browser suites on exclusive self-hosted capacity. Include telemetry-specific checks only if relevant inputs changed; preserve failures/skips and reuse only input-bound evidence.
- [ ] 5.2 Deliver docs/qa/issue-160 evidence with acceptance mapping, source/build identities, commands/results and actual limits; compare against all issue acceptance criteria, validate OpenSpec strictly and run git diff --check. Open a ready PR only when acceptance is verified, otherwise draft with explicit gaps.

## Workflow follow-up

- Ask the caller to review and approve this plan before implementation.
- Open/attach the resulting PR after implementation; do not merge or archive before caller review and merge.
