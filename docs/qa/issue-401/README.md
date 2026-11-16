# Issue #401 desktop battle HUD layout

The first increment prioritizes the battlefield and the controls needed to act. The next increment will group secondary tools and detailed stats behind labeled disclosures and verify focus restoration for that layout.

## Before and after

| Viewport | Rail, prepared move | Radial, ready for input |
| --- | --- | --- |
| 1440 × 900 | [Comparison](rail-1440x900.webp) | [Comparison](radial-1440x900.webp) |
| 1280 × 720 | [Comparison](rail-1280x720.webp) | [Comparison](radial-1280x720.webp) |

The after column uses the initial layout commit, `5850adb9e05186a825e4a34ab5a3059fb189b801`. Both columns of each comparison were captured at the labeled viewport using fresh standalone battles, seed 1, on Chromium with reduced motion. The Rail comparisons select the first legal destination with the native picker and leave the move unconfirmed. Measurements are CSS pixels rounded to the nearest pixel, with zero initial scroll.

| Viewport | Rail drawable board height | Rail Confirm bottom | Radial drawable board height | Radial End Turn bottom | HUD bottom |
| --- | --- | --- | --- | --- | --- |
| 1440 × 900 | 756 → 807 | 1007 → 592 | 464 → 575 | 856 → 727 | 887 |
| 1280 × 720 | 576 → 627 | 1007 → 592 | 327 → 420 | 736 → 572 | 707 |

## Verification

The baseline was built from `0cc0777fa1a7e7613d43758ad88c270d8b744f26`. The initial layout build used the runtime sources from `5850adb9e05186a825e4a34ab5a3059fb189b801`, Node 24.22.1, the unchanged lockfile, and Linux x86-64. The root-base production assets were `battleLayout-DD4t112e.css` and `BattleScene-DuYUR2TG.js`. SHA-256 values are listed below.

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

## Rail confirmation follow-up

The 1280 × 720 Rail test now checks both a prepared move and Magic Missile aimed at an ally. On the initial layout build, Confirm and Cancel were clipped during the spell preview at zero scroll. The follow-up keeps the friendly-fire warning and both controls in view by placing the ability description and Inspect target control after the confirmation row on desktop.

The production build passed 226 content tests and both TypeScript scopes. The follow-up used Node 24.22.1 and Chromium 153.0.8010.0 with the same single-process SwiftShader setup. The root-base production assets were:

```text
2cc2ba9223112c92172a1b03fe03a7a5d2b7975575f4c7c2e9e20d391117e1  dist/assets/battleLayout-hMrtXW4w.css
99cb117394219141fae37413934932cb9fc9275777e60117c32ddc86ca8d9f8d  dist/assets/BattleScene-DU9y87xq.js
```

Nine focused Chromium cases passed on the follow-up build. They covered the Rail viewport regression, keyboard confirmation, inspection and cancellation, responsive geometry, the desktop Radial dock, three-battle run undo and reload, dungeon Frost Snare and reload, and Radial End Turn with adjacent tools in emulated Pixel portrait and landscape. Each case ran separately with one worker and zero retries. Both iPhone WebKit cases stopped at browser launch because the host lacked `libGLESv2.so.2`.

## Dungeon Rail confirmation follow-up

The level-three Mage dungeon fixture exposed another short-window case. At zero scroll and 1280 × 720, the prepared Frost Snare preview left the bottom 16 pixels of Confirm and Cancel outside the rail. The desktop Rail now uses the target summary for occupied cells and keeps the confirmation row in view when a prepared action exceeds the rail.

The Chromium regression verifies the entire Frost Snare preview and both buttons at 1280 × 720. At 1280 × 660 it verifies that both buttons stay in view, that scrolling reveals the full preview, and that Cancel restores focus without committing the action. The test failed on `3b52ac9` and passed with this follow-up's root-base stylesheet.

```text
92cd6d0df99f156553d1b71f06d5764d1964ecee04557915ffc31cf112ad91ca  dist/assets/battleLayout-CiibOQR0.css
```

## Friendly-fire warning follow-up

After the Battle tools branch merged into this PR, the Rail warning and Confirm button no longer overlapped at 1280 × 600 in a fresh Chromium battle. At 1280 × 580, preparing Magic Missile against the Fighter still put the pinned Confirm button over the warning at zero scroll.

The desktop Rail now puts the friendly-fire warning directly above Confirm and Cancel inside the pinned row. The warning also describes Confirm for assistive technology. The Chromium regression checks complete visibility and spacing at 1280 × 600 and 1280 × 580, then cancels and verifies that combat state is unchanged.

```text
76df6722ddacd095e20cd04d8cc0f7ddee7806749e4bf24b66c373afd1b11b06  dist/assets/battleLayout-CViSXgl8.css
```

## Target picker pointer follow-up

At 1280 × 580 on `f656cd4`, preparing Frost Snare in the level-three dungeon fixture moved Confirm over the bottom of the target picker. The pinned row is now bounded by the results area below the picker. At short heights, the rail can scroll to reveal the full action when there is too little room beneath the picker.

The regression uses the same raw pointer coordinate before and after preparation. The old build hit Confirm. The new build hits and focuses the native target picker and preserves the exact combat state.

```text
d7e36c99b381b151efe2218cbfa6004470c7adbf2744e02cb204ba0f1916e431  dist/assets/battleLayout-C4-VWlF6.css
```
