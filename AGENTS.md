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

## `/work-work-work`

When the user submits `/work-work-work`, read and follow
`.agents/skills/work-work-work/SKILL.md`. This is a repository message alias,
not a registered native slash-menu command. Codex also supports invoking the
same workflow as `$work-work-work` through its skill selector.
