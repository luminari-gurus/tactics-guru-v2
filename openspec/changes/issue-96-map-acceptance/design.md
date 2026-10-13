# Design

## Context

See [proposal](proposal.md) for the reason for this closeout. The base already contains all three selectors in `src/map/view.ts`, pure layout in `generate.ts`, topology-preserving treatment in `biomes.ts`, and lazy image decoding/fallback in `art.ts`. The child change specifications remain authoritative. There is no proposed runtime behavior change.

`tests/unit/overworldMap.test.ts` covers generator bounds, Rooms fingerprints, seed diversity, fallback, biome preservation and RNG isolation. `tests/overworld-map.spec.ts` covers all 18 combinations, seed transactions, separate keyboard selection of each dropdown, matching legends, decode/network/stale-load cases, root navigation and battle isolation. `docs/qa/issue-98-map-art.md` already reports 336 configured browser passes and prefix checks on the child implementation; this is inherited evidence, not a fresh execution against the epic branch.

## Goals / Non-Goals

**Goals:** Make the six epic criteria reviewable against identified source and actual checks; distinguish valid inherited evidence, fresh verification and unresolved gaps. Preserve the scope and exact meanings approved by #96–#99.

**Non-Goals:** Reimplement merged children, redesign generators/controls, invent new tests to match implementation, add a harness, archive unrelated OpenSpec changes, certify physical iOS, or deploy anything.

## Decisions

1. **One epic acceptance report.** Add `docs/qa/issue-96-map-acceptance.md` with six criterion sections, source/build identity, commands/results and explicit limitations. Link existing child records instead of copying their screenshots, manifests and prose. Alternative rejected: treating three closed children as automatic epic acceptance.
2. **Reuse checks before adding coverage.** Execute the existing map unit and browser suites for the pinned implementation revision; review their assertions against the six criteria. Existing separate keyboard checks can satisfy the three-control requirement when their byte identity and combined page are verified. Add a narrow assertion in the existing suites only if an uncovered requirement is demonstrated. Alternative rejected: another integration test framework or an unconditional suite rewrite.
3. **Use the approved art exception.** Type and biome changes apply the displayed valid seed; art only rerenders the last generated map and retains a pending valid seed edit. The shared contract and child spec resolve the epic's generic selection wording. Preserve rollback on invalid seed input, readable desert fallback, partial asset failure and stale decode behavior.
4. **Bind evidence to its actual scope.** Record Git revision and any dirty source diff, build identity from `data-commit`, browser/version, profile, root/prefix URL, exact command and outcomes. Compare relevant runtime/test/config/lockfile blobs before reusing #98 results. Fresh local previews establish local behavior; their screenshots establish emulated mobile layout, not hardware or hosted acceptance.
5. **Keep regressions conditional and bounded.** A report-only result is valid. If an existing check exposes a reproducible violation, retain the failure and use an existing test to demonstrate a minimal correction within the approved contract. No behavior redesign is preapproved. Larger changes require a revised plan; do not silently broaden #96.

## Risks / Trade-offs

- Child QA ran on a working tree rather than an already-created final commit → compare committed sources and identify any unbound evidence; rerun the affected checks instead of assuming exact parity.
- Some map tests navigate to absolute `/map` → use the existing relative-path biome/art checks for prefixed previews and separately inspect direct `/prototype/map` entry/refresh. Use `PLAYWRIGHT_BASE_PATH` with the repository config; do not misreport an absolute route as prefix coverage.
- Main can move while work is underway → refresh before execution and before publication; record the actual tested revision, integrating only justified changes.
- The legacy art inventory records an unresolved creator/license field → preserve that provenance limit without adding assets or claiming a license.

## Migration Plan

No data migration, deployment or rollback operation is needed. Publish reviewable documentation/test corrections through a normal PR after plan approval. Use `Closes #96` only after all criteria have supported dispositions; otherwise use `Refs #96` and retain remaining work. This planning branch alone does not close the epic.
