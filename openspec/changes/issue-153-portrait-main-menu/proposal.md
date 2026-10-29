# Proposal

## Why

The root URL starts a standalone battle and offers no shared entry surface for saved games or future Records/Settings destinations. [Issue #153](https://github.com/luminari-gurus/tactics-guru-v2/issues/153) requests a responsive portrait main menu while preserving existing playable modes and save recovery.

## What Changes

- **BREAKING:** plain `/` becomes the menu; `/battle` becomes the canonical standalone battle URL. Keep explicit root diagnostic/scene query entries working, and retain `/run`, `/dungeon`, and `/map` under the configured base URL.
- Render Continue, New Game, Hall of Records, and Settings from an ordered definition. Add quiet secondary links to standalone battle, three-encounter run, and map inspection.
- Continue inspects all three existing save families without creating sessions or writing saves. One resumable mode routes to that mode; multiple modes require explicit choice. Destination code re-inspects before resuming, retaining existing backup/recovery safeguards.
- New Game starts the dungeon flow through its existing reviewed replacement confirmation; preserve unrelated battle/run saves. Hall of Records is an honest empty-state dialog pending #176. Settings exposes existing privacy controls and current audio guidance, with no new music/preferences subsystem.
- Use the two user-supplied background sources, Dawn Beyond the Ivy Ruins and Midnight Strategist’s War Room, with separate title-image and native-control layers. Preserve the originals under `docs/art/issue-153/source/`; derive optimized runtime backgrounds from these sources during implementation. Preserve portrait composition on wide screens and reachable controls on narrow/short screens, with readable fallbacks when images fail.

## Capabilities

### New Capabilities

- `main-menu`: base-aware entry routing, portrait menu, explicit save selection/new-game handoff, and bounded secondary destinations.

### Modified Capabilities

None. Existing battle rules, controls, save formats, and audio contracts remain authoritative. Existing capability inventory and battle-session/battle-controls scenarios were inspected; none currently specifies a root menu.

## Impact

Likely implementation: `src/main.ts`, new route/menu modules, small handoff/navigation additions in `src/app/start{Battle,Run,Dungeon}App.ts`, menu styles/assets, affected browser fixtures/entry URLs and performance collector routing, README and design/route documentation. No new runtime dependency, save-format migration, gameplay mechanic, hosting change, or deployment.

Planning identity: caller `dubstylee`; issue #153; base `main` at `7cea1e9071c922b8a27cefe105d2fe069bc82a56`; branch `work/issue-153-portrait-main-menu` (already published). Prepared 2026-10-28; implementation approval is pending. Local `.env` is absent: physical platforms `none`, required physical platforms `none`; browser emulation is sufficient under AGENTS.md.

Supplied artwork is available: the caller provided both background originals and identified `Tactics Guru.webp` as the title image on 2026-10-28. The unchanged title source is retained at `docs/art/issue-153/source/tactics-guru.webp` (2172×724, alpha channel), with its byte hash in the provenance manifest. This resolves the earlier inaccessible Discord-link requirement. Use this title as a separate image layer; preserve its aspect ratio and lettering.
