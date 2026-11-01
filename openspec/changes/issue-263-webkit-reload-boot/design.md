# Design

## Context

See proposal.md for motivation and `docs/ongoing-projects/plan.md` for source
identities, the traced boot graph, issue acceptance and the implementation order.
PR #256 remains open at `c2e3c56`; the reported failed runtime is `9b543cb`.
Its engine-ready mitigation is absent from main and the failure reportedly occurs
before dungeon screen construction. The owning failure is not yet identified.

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
3. Select the repair only after evidence narrows the boundary. Preserve normal
   module error recovery and save bytes. Treat network/module evaluation, clock
   behavior, initialization lifecycle and engine readiness as hypotheses until
   discriminating evidence exists. Update this decision with the actual cause.
4. Keep the work branch on main and review PR #256 as an integration consumer.
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
