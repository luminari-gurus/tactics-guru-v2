## Why

Ordinary startup exposes proof-scene controls before route code loads. Dungeon battles also retain those controls because layout reparenting invalidates their hiding selector (#297).

## What Changes

- Start with hidden diagnostic markup and a visible neutral loading/error status.
- Reveal proof tools only in the explicit proof scene; preserve content-smoke and all gameplay controls.
- Give dungeon battles a player-facing landmark and retain hiding across battle re-entry.
- Verify pre-module HTML, recovery, explicit diagnostics and legal gameplay on desktop/touch/WebKit.

## Capabilities

### New Capabilities
- `application-startup`: Player-facing startup status and deliberate diagnostic visibility across routes.

### Modified Capabilities
None.

## Impact

HTML and existing application bootstrap owners; focused existing browser tests. No rule, save, routing-policy or dependency changes. Plan: `docs/ongoing-projects/plan.md`. Branch: `branch/issue-297-hide-gameplay-diagnostics`. Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/297.
