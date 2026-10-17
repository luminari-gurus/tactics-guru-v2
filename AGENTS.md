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

## `/work-work-work`

When the user submits `/work-work-work`, read and follow
`.agents/skills/work-work-work/SKILL.md`. This is a repository message alias,
not a registered native slash-menu command. Codex also supports invoking the
same workflow as `$work-work-work` through its skill selector.
