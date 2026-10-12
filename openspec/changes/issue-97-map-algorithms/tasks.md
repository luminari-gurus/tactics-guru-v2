# Tasks

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/97
Caller: dubstylee. Branch: work/issue-97-map-algorithms. Base: a8e115aa07aea4831419ae19b4b1db88c368fbe0.
Contract approved; implementation plan approval pending. Begin code edits only after explicit approval.

## 1. Versioned pure generation

- [ ] 1.1 Record pre-change Rooms signatures and baseline map chunk sizes; add stable typed dispatch/result metadata without changing Rooms draws or cells. Verify default/explicit Rooms signatures and invalid input tests in the existing unit suite.
- [ ] 1.2 Implement bounded local Random walker with isolated deterministic attempts and validated fallback; verify dimensions, validity, perimeter, density, cardinal connectivity, repeatability, at least 90% diversity and bounded forced exhaustion across the documented seed matrix. Record constants, seed mixing and fallback frequency in issue QA.
- [ ] 1.3 Implement four-pass Cellular caves with deterministic bounded connectivity repair/retry/fallback; run the same independent matrix and forced fallback checks, verify metadata, record generation constants/fallback frequency and source provenance in QA.
- [ ] 1.4 Extend unit isolation checks to every type: perturb clock/ambient entropy, compare battle state and next RNG draw, and verify no battle/storage imports. Confirm focused map unit suite passes and QA documents actual evidence.

## 2. Map controls and shared contract

- [ ] 2.1 Add labeled native Map type dropdown and transactional valid-seed parsing/committed selection; preserve current seed/New seed behavior, publish type/version/fallback metadata and style select with accessible focus/touch sizing. Extend existing browser tests to verify all types, reproduction, invalid seed during switching, Generate, retained New seed selection and failed/same entropy.
- [ ] 2.2 Extend browser checks for keyboard access, desktop/mobile portrait/landscape dimensions, direct navigation/refresh and non-root base; confirm map/battle route, audio and sentinel storage isolation. Inspect representative type screenshots and record distinct layout character and actual profiles/limits in QA.
- [ ] 2.3 Update README and QA with defaults, IDs/versions, per-type constraints/fallback, and approved #98/#99 topology/terrain/presentation ownership. Verify documentation matches implemented selections and explicitly reserves sibling biome/art implementation for those issues.

## 3. Integration acceptance

- [ ] 3.1 Run full unit/content checks, both typechecks, production build and configured desktop/mobile browser suite; run strict OpenSpec validation and git diff --check. Record exact commands/results and any unresolved criterion in QA.
- [ ] 3.2 Compare emitted map/shared raw/gzip chunk sizes against recorded base, inspect final diff against every issue acceptance criterion and the shared contract, and confirm no dependency/battle/sibling implementation scope was added. Record final acceptance mapping and bundle evidence.

## Workflow follow-up

- Commit/push the approved issue implementation and open a PR against main, attaching it to this task. Use Closes #97 only when all criteria are verified; otherwise draft with Refs #97 and remaining work.
- Leave merge, production deployment and OpenSpec archive until separately authorized or the workflow's post-merge conditions are satisfied.
