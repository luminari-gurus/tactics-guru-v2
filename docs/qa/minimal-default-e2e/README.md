# Minimal default E2E and progression migration

The ordinary `npm test`/Playwright entry point now selects the same seven core
journeys as PR verification. Before this change it selected 1,036 Chromium cases.
`test:regression` explicitly selects the historical broad compatibility matrix;
`verify:full` and each specialty config now import that matrix explicitly.

## Functional ownership

| Key behavior | Fast unit coverage | Routine browser witness |
| --- | --- | --- |
| Combat, abilities, AI, turns, RNG and replay | `combat`, `abilities`, `abilityValidation`, `ai`, `turns`, `rng`, `battleSession`, `movementUndo`, `tacticalPlan` | Complete winning battle through real controls; replay and outcome reload |
| Run state, rewards, inventory and persistence | `run`, `runBattle`, `RunItemSession`, `items`, `itemCommands`, `rewards`, `runStorage`, `runSaveEnvelope` | Run undo, active reload, terminal outcome, terminal reload and fresh restart |
| Dungeon generation, exploration, progression and saves | `dungeon`, `dungeonBattle`, `dungeonEncounters`, `exploration`, `progression`, `dungeonProgressionBoundary`, `menuSaves` | Dungeon startup, keyboard action, exact active resume on Chromium and WebKit |
| Input, geometry and display state | `input`, `picking`, `radialGesture`, `radialLabels`, `combatControls`, `healthBar`, `boardPresentation` | Real Pixel board touch, modal capture and suspend/resume; boot/viewport resize |
| Content, assets, audio state and telemetry | Content/inventory/export tests, `audioState`, `battleAudio`, `battleCues`, `telemetry`; root/prefix real build integrations | Production boot and controlled missing-engine error; rendering/audio/telemetry specialty configs remain explicit compatibility tools |

Unit names in the table refer to `tests/unit/<name>.test.ts`. This assigns key
functional ownership; it does not claim every historical browser assertion is
unit-equivalent. The small routine gate intentionally covers core integrations;
additional browser-sensitive diagnostics remain available by explicit selection.
New browser cases do not automatically multiply routine PR work.

## Exact selection proof

The [coverage map](coverage-map.json) compares base `637ab92` discovery with this
candidate. Every retained test ID, test metadata and device setting in every
explicit full/special mode is unchanged. The only removed broad executions are
Mage XP 60 and XP 600, three Chromium and three WebKit profiles each (12 total).
All other special mode selections remain identical. The broad Chromium selection
is 1,030; the broad WebKit exploration selection is 123. The core default is seven.

`dungeonProgressionBoundary.test.ts` covers XP 0/59/60/179/180/360/600: canonical
HP/level, exact active turn/state, learned ability and caster projection, stable
save encoding, no historical events/replay, and rejection of forged projections.
The remaining XP 0/180 browser witnesses straddle the Frost Snare learning gate
and keep the original UI, save/reload and caster assertions on every prior profile.
No retained assertions, product performance limits, retries or case timeouts changed.

Verification before publication: 15 core/orchestration contracts, 30 real
selection/batching contracts and both TypeScript scopes passed. Full ordinary-PR
CI and matched affected-profile execution will be attached to the PR after running.

## Bounded matched execution

The existing manual `Browser setup smoke` workflow now accepts `suite=progression`
and an optional exact `source_ref`. Run both baseline `637ab92` and candidate on
the same qualified VM; keep caches, browser lockfile and worker/retry policy
consistent and record limitations. The workflow executes only the XP browser
cases in Chromium and WebKit, retaining durable JSON and failure traces. Its
ordinary setup/boot qualification remains the default `suite=setup` behavior.
