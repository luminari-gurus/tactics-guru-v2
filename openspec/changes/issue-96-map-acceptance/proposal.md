# Proposal

## Why

[#96](https://github.com/luminari-gurus/tactics-guru-v2/issues/96) remains open after all three map-selection children merged. Their implementation and QA records already cover the combined feature, but the epic needs a single acceptance disposition tied to merged source, with inherited evidence and any new checks clearly distinguished.

## What Changes

- Add an epic acceptance report mapping all six criteria to the existing map contract, child reports, tests and exact source/build identity.
- Verify the combined controls, 18 supported combinations, fallback and battle isolation using existing checks; extend a test only for a demonstrated coverage gap.
- Record an honest closeout recommendation, including any remaining failures. Do not assume that closed children automatically satisfy the parent.

## Capabilities

### New Capabilities

None. This is verification and documentation of existing behavior.

### Modified Capabilities

None. `skip_specs: true` deliberately avoids duplicating the approved specifications in `issue-97-map-algorithms`, `issue-99-map-biomes` and `issue-98-map-art`. Any change to their behavior requires a separate scope decision.

## Impact

Primary deliverable: `docs/qa/issue-96-map-acceptance.md`, with bounded supporting evidence if fresh checks require it. Update `docs/ongoing-projects/plan.md` as work progresses. Existing `tests/overworld-map.spec.ts`, `tests/unit/overworldMap.test.ts`, `playwright.config.ts`, map modules and child QA reports supply the verification mechanisms; no new test harness or runtime architecture is planned. Acceptance execution and review PR publication were authorized on 2026-10-14; the earlier planning-only boundary is superseded by that instruction.

Planned branch: `branch/issue-96-map-acceptance`; caller: `moshehbenavraham`; planning base: `79f7d983ff3a12ca38e93efdc72f3f317dfb789c` on `main`. Dependencies #97/#99/#98 are completed through merged PRs #100/#101/#104. This does not depend on #57 or #75 and does not certify their work. No deployment, new assets, campaign, battle integration, generation change or dependency upgrade is included. The planning publication was completed first; the subsequent 2026-10-14 request authorizes acceptance execution and PR preparation.
