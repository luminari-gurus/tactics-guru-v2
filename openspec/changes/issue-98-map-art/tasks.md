# Tasks

## 1. Verified map artwork

- [ ] 1.1 Copy exactly the three inventoried PNGs to public/map-art/legacy-8bit and update export records; verify SHA-256 equality, dimensions and 1,118-byte total (AC1/4/6).
- [ ] 1.2 Add the bounded map-only style mapping and base-aware lazy image loader with nonfatal decode/load handling; add focused failure/coverage checks and document mapping and provenance in docs/overworld-map.md (AC1/4/5).

## 2. Independent presentation control

- [ ] 2.1 Add the Art style dropdown and separate presentation rendering from generation commits; verify unchanged map data/RNG, valid pending seed preservation, invalid selection rollback, Generate/New seed retention and keyboard behavior through existing browser tests (AC2/6).
- [ ] 2.2 Render loaded art and Simple fallback consistently in cells/legend with visible fallback feedback; verify missing coverage, failed assets and delayed completion after selection changes through browser tests and document user behavior (AC3/4/6).

## 3. Integrated acceptance

- [ ] 3.1 Verify all 18 combinations on desktop/mobile portrait/mobile landscape, inspect screenshots, check control sizes/overflow and record actual visual findings in docs/qa/issue-98-map-art.md (AC3/6).
- [ ] 3.2 Verify direct entry/refresh at root/prefix, map/battle/save isolation and absent battle artwork requests; measure actual transferred image bytes and added JS/CSS bundle bytes against the base build and record results (AC5/6).
- [ ] 3.3 Run content validation, focused and full unit/browser tests, strict typecheck, production build, strict OpenSpec validation and git diff --check; record outcomes, compare every acceptance criterion and identify physical-device limits (AC6).

## Workflow follow-up

- Obtain caller approval of this concrete plan before application edits; record approval on continuation.
- Commit/push the completed scoped change and open a PR against main. Use Closes #98 only when acceptance is verified; otherwise use a draft and Refs #98 with the gap recorded.
- Do not merge, deploy or archive before separately authorized review/merge.
