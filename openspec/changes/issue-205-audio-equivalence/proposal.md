# Proposal

## Why

Issue #205 identifies repeated full muted/audible battles as a measured browser-test cost. Preserve the existing battle-audio contract while moving exhaustive deterministic equivalence to the session/adapter boundary.

## What Changes

- Compare both original legal outcome seeds at every accepted command in existing unit tests.
- Retain complete audible win/loss browser journeys on every existing Chromium profile; replace complete muted repetitions with short paired real-control/save comparisons.
- Preserve all other audio and WebKit checks and publish assertion mapping, matched timings and failures.

## Capabilities

### New Capabilities

None. This is a test refactor, with `skip_specs: true`.

### Modified Capabilities

None. The existing `battle-audio` requirements and scenarios remain unchanged. AGENTS.md supersedes historical physical-device-only acceptance wording.

## Impact

Only `tests/battle-audio.spec.ts`, existing audio unit files, this OpenSpec ledger and the issue plan/QA receipts. No production, dependencies, shared helpers, matrix configuration, CI, merge or deployment changes. See [the continuation plan](../../../docs/ongoing-projects/issue-205-audio-equivalence-plan.md) for outcome, files, non-goals and proof.
