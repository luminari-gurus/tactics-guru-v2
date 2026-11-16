# Desktop Battle tools

On desktop Rail and Radial, Battle tools groups armor class and accuracy, party inspection, battle history, sound, settings, and keyboard help. The disclosure appears ahead of tactical tools and class guidance. Closing it returns focus to its summary. Closing the log or party inspection returns focus to the button that opened it. A prepared Rail move or aimed desktop Radial move remains available. Mobile follows its existing Rail or Radial layout and gesture behavior.

## Before and after

The original baseline from [the first increment](../README.md) is on the left. The final HUD is on the right. Rail shows a prepared move. Radial shows the start of a playable turn.

| Viewport | Rail | Radial |
| --- | --- | --- |
| 1440 × 900 | [Comparison](rail-1440x900.webp) | [Comparison](radial-1440x900.webp) |
| 1280 × 720 | [Comparison](rail-1280x720.webp) | [Comparison](radial-1280x720.webp) |

At 1280 × 720 and zero initial scroll, the Rail disclosure ends at y=635 and the Radial disclosure ends at y=671. The HUD clips content below y=707. The browser geometry checks also verify the primary buttons and prepared Rail Confirm and Cancel at that size.

## Verification

The exact comparison base for this increment was `5850adb9e05186a825e4a34ab5a3059fb189b801`. The screenshots use the standalone battle route in production builds served at the root base path. The updated production build passed 226 content tests and both TypeScript scopes. The six affected input and geometry unit files passed all 25 tests. Local tests ran on Linux x86-64 with Node 24.22.1 and Playwright 1.64.1.

- Chromium 153.0.8010.0 passed 12 focused browser cases in separate one-worker runs. Desktop cases covered disclosure focus and prepared moves, Rail and Radial viewport geometry, Radial keyboard plan confirmation, five responsive viewport sizes, sound and focus across restart, three-battle run preparation and restart, and two dungeon Mage progression boundaries after reload. The Radial log case also passed on emulated Pixel portrait and landscape. Chromium used the single-process SwiftShader executable in this environment.
- WebKit 27.2 passed the Radial read-only dialog case in both emulated iPhone orientations. The first launch was blocked by missing host libraries. The rerun used locally supplied libraries with the runtime validated by opening and exercising both cases.
- The unmodified Mage XP 180 checkpoint case failed both on the exact base and twice on the initial changed build at equality after reload. The application persisted an independently accrued playtime interval. The updated fixture uses tracked runs and verifies elapsed playtime is monotonic, with exact equality for the remaining checkpoint and battle state. Both XP boundary cases passed after the test correction.

Browser commands use `npm run test:regression -- tests/<file>.spec.ts --project=<profile> -g '<case title>'` for Chromium, and `npx --no-install playwright test -c playwright.device-acceptance.config.ts tests/battle-radial.spec.ts --project=acceptance-webkit-portrait --project=acceptance-webkit-landscape -g 'radial tap fallback read-only dialog'` for WebKit. Each invocation used one worker and zero retries.

```text
e4768389a179a65df5f04502dab87e8875b465b939e55493d5820a7dc99a74ed  package-lock.json
532cc9b46055c390a5f83e6dd03ce17e630042de29843398d1e2f61b190b8069  src/phaser/BattleScene.ts
967769a003e61c40ec6d211aa7b81a6abe2bce6b64a8e16fb6b7f29e308d36aa  src/style.css
97f4e0688738ccfb1fb80650c51cac52ba668a7f35dccebba3df0c2a22923c6a  src/ui/hud.ts
8d50d156eaf69fec904c2ca3f1ed94a60375851beedd7977208cb248ae0af1d4  tests/battle-loop.spec.ts
988fa21ae459f6e4b09f2ba6e58e53768f10fab7c93c1df3088e806dd6b9139e  tests/battle-radial.spec.ts
1636ac54ee402acd355c3d900b616362f59ce0ccf39ba7629ff09c11831efaca  tests/dungeon.spec.ts
78725c0093c5fb8ab83001c64b2bf7beaebc5feac5f5cd238e063e16a98a89aa  dist/assets/battleLayout-BWce-R5t.css
ceba5bd635a3f52826f9d21c55d6ceacfaddac3321533d43ca5eed45b8d9eeda  dist/assets/BattleScene-D7lIkwBv.js
```
