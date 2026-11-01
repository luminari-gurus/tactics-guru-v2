# Design

## Context

See proposal.md for motivation and `docs/ongoing-projects/plan.md` for source
identities, the traced boot graph, issue acceptance and the implementation order.
PR #256 is merged into main at `78a3f75`; the reported failed runtime is `9b543cb`.
Qualified diagnostics captured native entry/static-resource failures before
dungeon screen construction. The official runtime update is published as stacked
PR #265; its complete acceptance gate remains open.

## Goals / Non-Goals

**Goals:** locate the last completed boundary, create a causal witness, repair
that boundary, and qualify saved continuation on the final integration candidate.

**Non-Goals:** new startup services, broad telemetry collection, save migration,
menu redesign, automatic retries, weaker assertions or timeout-only mitigation.

## Decisions

1. Recover the immutable original artifact before drawing causal conclusions.
   Use isolated diagnostic checkouts for exact failing source and literal main.
   A local pass is useful evidence about its conditions, not runner attribution.
2. Capture errors/requests before navigation, with bounded allowlisted evidence
   and no arbitrary storage dumps. Reuse Playwright reports/attachments and
   existing source/build receipts. Diagnostics placed only in the suspect import
   graph could never run, so they cannot alone locate a pre-mount stall.
   The recovered original has no failure trace or request/exception ledger.
   Therefore the first reviewable chunk is an automatic fixture on the existing
   dungeon exploration tests: no request interception, timers driving the page,
   browser storage access or runtime telemetry. Attach only on unexpected failure;
   cap requests/events/samples and retain build-owned filenames plus safe error
   categories. A synthetic two-engine contract checks redaction and bounds.
   Preserve a distinct pending task for the causal witness and eventual repair.
3. Select the repair only after evidence narrows the boundary. Preserve normal
   module error recovery and save bytes. Treat network/module evaluation, clock
   behavior, initialization lifecycle and engine readiness as hypotheses until
   discriminating evidence exists. Update this decision with the actual cause.
4. Keep the work branch integrated with main and review PR #256 as an integration consumer.
   Use a dependent branch/PR only if the cause genuinely requires its code;
   do not copy the menu feature into this repair or mutate another owner's branch.
5. Use focused serial repetitions while iterating, then satisfy #263's explicit
   full-verification gate. Preserve unchanged test IDs, input profiles, one worker,
   no blanket retries, the exclusive self-hosted lock and all previous failures.

## Risks / Trade-offs

- Intermittent reproduction → bounded runs with retained failure diagnostics and
  an explicit unresolved cause until a causal witness is obtained.
- Active menu integration → pin diagnostic refs, recheck current consumers and
  qualify the combined candidate without claiming old evidence ran new code.
- Shared entry/engine reach → trace battle/run/proof/map/menu consumers before
  selecting checks; keep the complete issue gate and proportional iteration.
- Large original artifact → preserve its hash and extract only relevant reports,
  traces and screenshots for analysis; retain original failed-run provenance.

## Migration Plan

No save migration or deployment is planned. Publish focused review-ready PRs,
including source-bound evidence and the current handoff. Any rollback is an
ordinary code revert; player saves and production infrastructure remain intact.

## Qualified evidence and candidate decision (2026-11-02)

Two ordinary qualified runs now reproduce entry/static-resource failure with
`WebKit encountered an internal error` before the application module executes.
The old bundled networking library is 3.6.5 on both inspected hosts; official
stable Playwright 1.64.1 ships 3.6.6. Use that supported runtime as the repair
candidate, rather than retries, timeout changes, custom native-library overlays
or changes to game rules. Specific native-defect attribution remains an inference
until the same-host application comparison supports the repair.

Qualified candidate run 41361259848 now passes the original 90-case prefix and
60 traced stair repetitions, with both native bundles confirmed at 3.6.6.
The owning observed failure is native networking before entry evaluation; exact
upstream defect attribution remains an inference. Existing application stair
cases are the regression witness, with earlier failed runs retained rather than
replaced by a synthetic security or network reproducer. The complete issue gate
remains distinct and is running at candidate e3e9ebf in 41362013777.

Preserve the existing viewport/touch/DPR and screen behavior. Playwright 1.64
starts forwarding device-descriptor screen options that 1.63's test runner
ignored; explicitly retain the old effective behavior and record actual profile
inputs. Browser-version/user-agent updates are intentional runtime changes.
Qualify the original prefix without debug or early page script injection, then
the complete issue-required inventory. Old successful captures are baselines,
not proof that the fault was fixed.
