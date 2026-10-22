# Proposal

## Why

Four desktop browser cases timed out in the interrupted #200 baseline. #221 requires causal diagnosis and a bounded repair without relaxing gameplay, save, camera, animation or lifecycle assertions.

## What Changes

- Recover the original evidence and attempt reproduction of the four cases on qualified self-hosted capacity; distinguish reproduced failures from evidence-backed non-reproductions.
- Repair demonstrated causes in the existing tests or runtime, retaining all original acceptance obligations and timeouts.
- Qualify affected consumers proportionally and retain source-bound results, including failures.

## Capabilities

No spec-level product behavior change is intended. This investigation repairs verification of existing behavior; `skip_specs: true` applies. Any discovered runtime defect must preserve the existing product contract.

## Impact

Primary scope: the existing browser cases and QA evidence. The temporary focused workflow is retired after diagnosis; the existing local browser wrapper supplies reruns without a new runner entry point. Runtime/helper edits are conditional on demonstrated defects and require consumer mapping. No dependency, combat, save-format, animation-speed or product-budget change. See `docs/ongoing-projects/plan.md` for the full acceptance contract.
