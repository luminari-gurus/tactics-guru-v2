# Issue 161 — Guarded increment acceptance

Approved scope: [proposal](../../openspec/changes/issue-161-combat-effects/proposal.md), [design](../../openspec/changes/issue-161-combat-effects/design.md), [tasks](../../openspec/changes/issue-161-combat-effects/tasks.md). Caller approved the published staged plan in chat on 2026-10-20. Base: `2b5a063f4a7e8f4a6329eaf1f80630133754012a`. Branch: `work/issue-161-combat-effects`.

## Result and boundaries

Guarded now has one pure projection used by combat and HUD/inspection; AI already consumes those attack previews. Grant/expiry/defeat cleanup share bounded helpers. Guarded Strike retains its −2 attack/+2 AC, accepted-miss grant, single application and next-Fighter-turn expiry. No new abilities, effect arrays, finite-use maps, damage types, saving-throw mechanics, immunities or dependencies are enabled. The [combat-effects contract](../combat-effects.md) maps those later cases to real content owners. #161 remains open and this increment is a draft PR with `Refs #161`.

Readers retain existing format/rules versions and historic inert defeated-unit guard exactly through integrity checking. The live evaluator treats defeated guard as inactive; accepted damage/turn transitions clear it. Existing recovery retains original unsupported/corrupt/incompatible bytes. Live and resumed values do not reapply equipment or guard.

## Validation

Environment: macOS 27.0.1, Node 26.11.0, Playwright 1.63.0. Chromium runs use the installed Google Chrome executable; focused WebKit uses installed Playwright WebKit 2359. Desktop, Pixel 7 portrait and 915×412 landscape are emulated profiles, not physical-device tests. Source SHA-256 inputs are in [validation.json](issue-161/validation.json).

| Check | Actual result |
| --- | --- |
| Focused Vitest (abilities, AI, combat, turns, standalone/run/dungeon save) | 120 passed |
| `npm run test:unit` | 807 passed across 49 files |
| `npm run build` including `validate:content` and both TypeScript configs | 190 content checks passed; build passed |
| Final `npm run typecheck` | Passed |
| Focused Chromium `playwright test tests/guarded-effects.spec.ts` | 9 passed |
| Focused WebKit, same three modes × three profiles | 9 passed |
| Full main `npm test` | 654 passed / 3 failed / 3 configured skips (660 cases); nonzero exit prevented automatic posttest |
| Explicit encounter / item posttests | 24 / 21 passed |
| Exact-base desktop selector comparison | Same 3 failures on clean base `2b5a063` |
| Separate `npm run test:telemetry` | 36 passed |
| Strict OpenSpec / `git diff --check` | Passed; final check repeated before publication |

Focused tests first reach a boundary through accepted pure-domain commands, then browser input previews/cancels and confirms Guarded Strike. This is browser evidence of the final cast and continuation, not a claim that every preceding fixture command used browser input. Each mode/profile retains inspection, resumed and expired screenshots plus command/state/event receipts. Every receipt contains at least one incoming attack against Guarded AC and living-Fighter expiry. Retained [Chromium](issue-161/chromium/) and [WebKit](issue-161/webkit/) evidence covers standalone, run and dungeon routes.

Full-suite fixtures additionally exercise ordinary hits/misses/natural 1/20, double-penalty prevention, exact preview/resolution values, AI target preference when guarded AC breaks a tie, frozen-input rejection, RNG/command exhaustion, Magic Missile spread/overkill, replay, presentation locks and fresh-encounter reset. New tests cover lethal ordinary/Missile cleanup, historical guarded defeated-state digest compatibility, unsupported effect/resource fields and projected equipment across roundtrip/expiry.

## Retained failures and warnings

- Initial focused run: 119 passed / 1 failed. New lethal-Missile fixture placed Mage out of range; moving its fixture cell into range made the final focused 120 pass. Raw initial and final logs are retained.
- Initial external WebKit config started its web server from `/private/tmp`, where no package exists. Set explicit worktree cwd; all 9 cases then passed. This was harness startup failure, not a game pass/fail.
- Full Chromium: three desktop native destination-selector keyboard cases failed at `#battle-review` enablement (clearing destination, Cancel retry, Escape retry). All three reproduce on the clean exact base `2b5a063`, with matching failure locations and reasons. Both mobile profiles pass them. This establishes a pre-existing failure in this desktop Chrome environment; it does not relabel the current run as fully passing. Raw current/base logs and error contexts are retained. Raw logs and generated error-context Markdown are gzip-compressed byte-for-byte to preserve its original whitespace while satisfying repository diff checks.
- Three configured skips are `overworld-map.spec.ts:608` controlled placement failure, one per profile: that test intercepts a source module and explicitly runs only against the development server, while the full main suite uses production preview. No new skip or retry was introduced.
- Because main `npm test` exited nonzero, its automatic posttest hook did not run. Both configured posttest commands were run explicitly and passed: 24 encounter checks and 21 item checks. Separate telemetry matrix passed all 36 cases.
- Existing Vite native-config import warnings and >500 kB chunk warning remain. This change does not claim performance budget or deployment acceptance.
- Running the existing simulation suite generates a receipt file. The new [simulation receipts](issue-161/simulations.json) differ from historical receipts in two terminal snapshot hashes because defeated Guarded is removed. Outcomes, command counts and event hashes are unchanged. Historical `docs/qa/procedural-grids/simulations.json` was restored rather than rewritten as fresh evidence.

## Criterion handoff

| #161 acceptance | Delivered now | Outstanding |
| --- | --- | --- |
| Closed minimal effect model | Documented cases and executable self-Guarded view | Real heal/mark/taunt/movement-block/stack/resource consumers |
| Typed damage/save/immunity policy | Source-linked proposed order, rational rounding and immunity timing; baseline attack/Missile parity | Actual profiles/primitives/proof in #166–#169/#171 |
| Shared evaluation and atomic preflight | Combat/HUD/inspection/AI Guarded parity; rejected/cancelled intents do not mutate | Same integration for each new case |
| Status identity/lifecycle/scope | Fighter self identity, boolean bound, replacement, next-turn expiry, defeat/new-battle cleanup | Consumer-specific duration/stack/source policy |
| Bounded persistence and replay | Standalone/run/dungeon Guarded continuation and unsupported-field recovery | New finite resources and other statuses with reviewed migration/versioning |

No issue closure, merge, production deployment, physical-device testing or OpenSpec archive is claimed.

## Commands and evidence

- `npx vitest run tests/unit/abilities.test.ts tests/unit/ai.test.ts tests/unit/combat.test.ts tests/unit/turns.test.ts tests/unit/saveEnvelope.test.ts tests/unit/runSaveEnvelope.test.ts tests/unit/dungeonBattle.test.ts`
- `npm run test:unit`, `npm run build` (includes content/type checks), and final `npm run typecheck`.
- With `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`: `npx playwright test tests/guarded-effects.spec.ts`, `npm test`, both `npx playwright test -c playwright.encounters.config.ts` and `npx playwright test -c playwright.run-items.config.ts`, and `npm run test:telemetry`.
- WebKit: `npx playwright test -c /tmp/tg161-webkit.config.mts`; the [exact host config](issue-161/webkit.config.mts) is retained with explicit cwd/testDir and the same three profile definitions, browserName changed to WebKit and executable override cleared. Its absolute paths describe this host.
- Unchanged-base comparison used the same Chrome executable and `npx playwright test tests/battle-loop.spec.ts --project=desktop --grep 'clearing the native movement|movement confirmation'`. The managed comparison worktree was archived after its clean-base identity and failure evidence were retained.
- `openspec validate issue-161-combat-effects --strict` and `git diff --check` pass. All completed checks have raw logs under [issue-161](issue-161/); no full-suite success is claimed.

Code/test hashes bind the actual dirty-worktree build to its inputs; the initial build's commit metadata identifies the planning commit, not a later implementation commit. No runtime code changed after the focused browser captures. Evidence hashes exclude their own manifest to avoid a circular digest.
