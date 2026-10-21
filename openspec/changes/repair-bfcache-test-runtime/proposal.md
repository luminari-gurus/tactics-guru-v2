# Proposal

## Why

The full #159 qualification run exposed seven cached-history assertions that did not receive real BFCache returns under headless shell, plus an animation restart test stalled by its paused fake clock. Full Chromium passes the seven history cases unchanged; asynchronous scene boot still needs a running clock.

## What Changes

- Select full Chromium for the three Chromium projects and document the standard browser installation; preserve explicit executable overrides and WebKit configuration.
- Resume the clock until restarted scenes become observably ready, then pause again for controlled visual sampling.
- Bound individual actions in the compound three-actor inspection case to five seconds and give its complete workflow 90 seconds; retain its full cumulative coverage and existing assertion/product limits.
- Retain every assertion and real cached-document/keyboard/modal coverage. Add no skips, retries or arbitrary waits.

## Capabilities

No application requirement changes (`skip_specs: true`). This repairs the test runtime and orchestration used to verify existing lifecycle contracts.

## Impact

Playwright project configuration, animation/compound-workflow tests and browser-test documentation. No game code, saves, assets or production actions.
