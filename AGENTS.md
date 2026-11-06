# AGENTS.md

## `.env` & `.env.example`

These files contain developer configuration for the application, not deployment
configuration. They may include developer-specific capabilities and secrets.
Read only the variables needed for the task; do not print or copy unrelated values.

Examples:

- Media generation API keys used to create game assets.
- `CAN_TEST_MOBILE`, which declares access to physical mobile testing platforms;
  see `.env.example` for supported values. Access does not imply completed testing.

## `docs/ongoing-projects`

Human documentation workspace, meant to be in intervals folded into the main docs

## Attribution

** NEVER add co-authors, attributions, `Claude-Session`, or signed-off-by lines.

## Device testing and acceptance

Standing caller instruction: Playwright evidence, including browser/device
emulation, is sufficient for device testing and acceptance for all work unless
the caller explicitly requests physical-device testing for the particular task.
Apply this default to existing and future work, including battle, persistence,
lifecycle, performance, and complete-run certification. Do not block readiness,
implementation, or acceptance solely because physical hardware is unavailable.

This instruction supersedes older physical-device-only gates in issues, plans,
specifications, and skills; historical wording alone does not reinstate them.
Retain actual test failures and limitations, and describe emulation accurately
without claiming that physical hardware was tested.

## Small, incremental PRs

Prefer small, focused PRs to minimize complexity, review burden, and regression
risk. Split larger work into coherent increments that can each be reviewed,
validated, and safely merged; avoid unrelated cleanup or refactors in the same PR.

An issue may take multiple PRs to satisfy its acceptance criteria. State which
criteria each PR addresses, record remaining work and dependencies on the issue,
and keep the issue open until all acceptance criteria are met and verified.
Use `Refs #<number>` for incremental PRs; reserve `Closes #<number>` for the PR
that completes the issue. A complete, validated increment can be ready for review
even while the broader issue remains open; use a draft when the increment itself
is incomplete or blocked. Apply the verification policy to each PR's affected
behavior without waiving the issue's remaining acceptance criteria.

## Verification scope

Follow [docs/verification-policy.md](docs/verification-policy.md) for proportional
iteration, PR-readiness and full-regression checks. Map all affected consumers and
retain explicit issue acceptance gates. Reuse evidence only with unchanged relevant
inputs and recorded source/build identity; preserve failures and incomplete runs.
Documentation-only changes do not require app/browser reruns. Browser CI uses the
self-hosted runner with no automatic GitHub-hosted fallback.

Eligible `risk:low` PRs auto-merge after `PR verification` passes for their current commit; [the workflow](.github/workflows/auto-merge-low-risk.yml) defines maintainer and safety checks.

## `/work-work-work`

When the user submits `/work-work-work`, read and follow
`.agents/skills/work-work-work/SKILL.md`. This is a repository message alias,
not a registered native slash-menu command. Codex also supports invoking the
same workflow as `$work-work-work` through its skill selector.
