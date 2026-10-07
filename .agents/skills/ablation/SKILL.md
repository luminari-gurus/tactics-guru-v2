---
name: ablation
description: >-
  Simplify a plan or change to what the requested outcome needs, then implement and prove it
  without dropping any requirement. Use after planning and before implementation, when
  implementing a feature or fix without over-engineering, for scope reviews, or when work
  accumulates speculative layers, workarounds, or unrelated changes.
---

# Ablation

Deliver the complete requested outcome through the simplest correct change. Cut machinery and
work, never the outcome or its acceptance criteria. Fewer lines, fewer files, or green tests do
not by themselves make a solution better.

Ablation is a counterfactual check: mentally remove or replace a part, then trace what would
fail. It needs no alternative implementations or experiments. Apply it to a plan before editing,
and again whenever new evidence changes the plan or the work starts to grow.

## Establish what must survive

- Read the request, earlier decisions, and acceptance criteria. Separate required outcomes and
  constraints from suggested approaches and assumptions. Difficulty, effort spent, or existing
  test coverage never redefine the objective.
- Inspect the relevant code, callers, tests, configuration, and repository instructions
  directly; names, snippets, guesses, and unverified premises are not enough. Trace the affected
  path far enough to know its behavior and dependencies, and investigate any uncertainty that
  could change correctness, scope, or the approach.
- Inspect existing changes before editing, so later pruning removes only work this task owns.
- State the **Outcome, Non-goals, Files, and Proof** in the current plan or conversation; a
  sentence covers a small task. Do not create a separate report, checklist, or approval stage.

## Ablate the plan

For each meaningful change, abstraction, dependency, configuration option, fallback, and check,
ask: **if this is omitted, which requirement or concrete failure goes unaddressed, and what
evidence shows it?** A requirement, a traced consumer, a reproduced defect, or a repository rule
justifies work. Hypothetical future use does not.

| Decision | When it fits |
| --- | --- |
| Keep | It supplies required behavior, compatibility, safety, recovery, or verification. |
| Simplify | The need is real, but an existing path or a smaller mechanism can meet it. |
| Drop | No requirement or demonstrated current risk depends on it. |
| Investigate | Missing evidence could change the decision; check that specific uncertainty. |

- Judge related parts together. A framework can look necessary only because its adapter,
  configuration, and tests depend on it, so test whether the whole cluster can go. Keep the
  supporting changes a required migration, integration, or recovery path needs, even when they
  expose no feature of their own.
- Prefer the existing path, fix the root cause, and preserve unrelated behavior. Reuse helpers,
  patterns, and tests. Keep one implementation unless truly independent responsibilities or
  required compatibility justify more. Add an abstraction, adapter, or configuration surface
  only for an explicit requirement, a second real caller, or a demonstrated correctness
  boundary, never to make a small change look general.
- Compare total complexity: branches, state, dependencies, public interfaces, operational
  burden, and maintenance. A shorter patch that hides behavior, stacks workarounds, or leaves
  two competing paths may be worse; a necessary multi-file repair belongs in scope even when a
  local symptom patch would be smaller.
- Check both directions: every retained change has a concrete purpose, and every requirement
  still has an implementation path and proof.

Say briefly what was removed or simplified and why, then update the plan. If nothing can go,
say why the plan is already minimal; do not manufacture a deletion quota.

## Implement within scope

- A request to review or simplify a plan authorizes that review, not the implementation.
  Read-only discovery is allowed throughout.
- The request authorizes the local edits and checks its outcome needs, including requested API
  or schema changes; do not add confirmation steps for routine choices. Drop optional extras
  such as unrelated or repository-wide cleanup, future-use layers, new services, or general test
  infrastructure instead of stopping to ask about them.
- Ask only when the request leaves open a consequential choice about behavior, compatibility,
  or data, or when the next action exceeds existing authorization; keep doing independent work
  while waiting. Deleting or overwriting data, mutating production, discarding user work, and
  rewriting history need explicit permission for that action; this skill grants none.
- When new evidence exposes a missing requirement or a defect blocking the requested workflow,
  include the repair and update the plan. Any other real defect found along the way is separate
  work: fix it as its own change instead of folding it in or only reporting it.
- If the work starts growing fallback paths, workaround stacks, duplicate implementations, or
  unstated tests, stop, find the cause, and shrink the plan back to what the task needs.
- Remove code, callers, and configuration this task made obsolete; keep an old path only for an
  identified compatibility obligation. Read the actual diff before pruning, especially where
  user changes share a file.

## Prove the whole outcome, then stop

- Run the narrowest relevant existing checks while working, and every required completion check
  at the end. Extend existing tests before adding files or infrastructure. Add a test only where
  changed observable behavior, an acceptance criterion, or a concrete regression risk is not
  already covered, never to restate the implementation or add unrelated coverage.
- Match proof to the claim: a helper test does not prove a feature is reachable through its
  command, API, or workflow, so check the real path when acceptance depends on it. Update the
  documentation, help, manifests, or migrations the behavior needs alongside it.
- Reuse valid results. Repeat or widen verification only for relevant changes, failures,
  unresolved risks, or required gates; once the evidence holds, finish instead of rerunning
  green suites or starting a hardening phase.
- Passing tests justify neither extra scope nor a missing requirement. Missing, skipped, or
  indirect evidence leaves its claim unverified.

Done means:

- every original requirement and accepted scope change is implemented and proven, with no
  required work left open;
- the final diff holds only necessary changes: every touched file is needed, and nothing is
  unrelated;
- no replaced code or task-created debug, backup, or scratch files remain, while unrelated work
  and required recovery evidence are preserved;
- the report gives the outcome, useful simplifications, and the exact verification commands and
  results, and plainly states assumptions, limitations, unverified runtime behavior, and any
  preserved unrelated work that matters for review.
