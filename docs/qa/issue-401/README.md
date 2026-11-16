# Issue #401 desktop battle HUD layout

The first increment prioritizes the battlefield and the controls needed to act. The next increment will group secondary tools and detailed stats behind labeled disclosures and verify focus restoration for that layout.

## Before and after

| Viewport | Rail, prepared move | Radial, ready for input |
| --- | --- | --- |
| 1440 × 900 | [Comparison](rail-1440x900.webp) | [Comparison](radial-1440x900.webp) |
| 1280 × 720 | [Comparison](rail-1280x720.webp) | [Comparison](radial-1280x720.webp) |

Both columns of each comparison were captured at the labeled viewport using fresh standalone battles, seed 1, on Chromium with reduced motion. The Rail comparisons select the first legal destination with the native picker and leave the move unconfirmed. Measurements are CSS pixels rounded to the nearest pixel, with zero initial scroll.

| Viewport | Rail drawable board height | Rail Confirm bottom | Radial drawable board height | Radial End Turn bottom | HUD bottom |
| --- | --- | --- | --- | --- | --- |
| 1440 × 900 | 756 → 807 | 1007 → 592 | 464 → 575 | 856 → 727 | 887 |
| 1280 × 720 | 576 → 627 | 1007 → 592 | 327 → 420 | 736 → 572 | 707 |

## Verification

The baseline was built from `0cc0777fa1a7e7613d43758ad88c270d8b744f26`. The updated build used the runtime sources in this PR, Node 24.22.1, the unchanged lockfile, and Linux x86-64. The root-base production assets were `battleLayout-DD4t112e.css` and `BattleScene-DuYUR2TG.js`. SHA-256 values are listed below.

- `npm run test:verification-batches` passed all 31 tooling checks.
- `npm run build` passed 226 content tests, both TypeScript scopes, and the production build.
- `npm run test:regression -- <file> --project=<profile> -g <title>` passed the following cases individually with one worker, zero retries, Playwright 1.64.1 and Chromium 153.0.8010.0. The executable used single-process SwiftShader in this environment.

| Profile | Case |
| --- | --- |
| Desktop | Desktop Rail keeps primary and prepared controls inside the initial viewport |
| Desktop | Radial preference replaces the side rail with a bottom dock at 1280×720 |
| Desktop | Keyboard-only movement, attack confirmation and Wait use the shared decision flow |
| Desktop | Live actor, inspection and cancellation remain independent of pending intent |
| Desktop | Keyboard-only shortcuts retain Radial plan specials and follow-up confirmation |
| Desktop | Accepted rail and dock preserve drawable floors, readable controls and focus at five sizes |
| Desktop, three-battle run | Run battle undo and a legal terminal journey reset on reload |
| Desktop, dungeon | Staged Mage Frost Snare accepts exact effects, replay and saved active reload |
| Emulated Pixel portrait and landscape | Undo and danger remain reachable beside the Radial End Turn control |

System Chromium could not launch because a Unix socket syscall was denied. A combined run with the alternate single-process Chromium passed Rail and failed to create the second browser context. Both cases subsequently passed in separate invocations. Local device passes above are Chromium emulation. Both iPhone WebKit End Turn cases were blocked before application startup by missing host libraries, including GTK 4 and GLESv2.

```text
70a8c919ab78334c9eb1d2f46d1d05581eb262a6f57c43e1edc95ea6176e714f  src/style.css
dd48c77eacf62bc6a79cd5e46b8b405db81c31669e9b2fd3bba2e4de9c90ff44  src/ui/battleClassGuidance.ts
1ef79987d60e83b1b82a8125f78b19398de2d54b6180b3de33084b11ae9c3853  src/ui/hud.ts
53eeac6948fde331f8b166bdc4b80022cba55114fcd786c13ea4e054e7de1110  tests/battle-loop.spec.ts
0641b70ae9c887bafdbd26a074d9c6d1e0ee0a0af7a3b0e5695f85fedc7691a2  tests/battle-radial.spec.ts
9b0d1918936943a52e32d7c52a09bb4001cc0b0991f54fa12757580fd78b949a  dist/assets/battleLayout-DD4t112e.css
1c309a393d9c7ec232c5d49366c05182976a30291f5a2c7cbeb21a622ebe6748  dist/assets/BattleScene-DuYUR2TG.js
```
