# Design

## Context

See [proposal](proposal.md) for motivation and identity. Source inspected at `7cea1e9`: `src/main.ts` dispatches dungeon/run/map by base-relative pathname and sends every other path to the battle app. `index.html` supplies battle/proof DOM. Root scene queries select battle/proof/content-smoke inside `src/app/startBattleApp.ts` and `src/phaser/start.ts`.

`createBattleStorage(battleCatalog).load()`, `createRunStorage(context).load()`, and `createDungeonStorage().inspect()` validate separate primary/backup slots without creating sessions. Battle/run load results and dungeon inspections have different shapes and must remain distinct. `BattlePersistence` and run/dungeon sessions own adoption, export, replacement, stale-write and recovery rules. Importing start-app modules initializes engines and handlers, so menu code must not import those modules for inspection.

`src/telemetry/browser.ts` currently classifies every non-run/map route as battle; dungeon deliberately avoids initialization. Many tests and `scripts/measure-fit.ts` consumers treat plain root as battle. `docs/DESIGN.md` supplies separate art layers, forest-ruin direction, safe padding and fallbacks; issue #153 overrides its flexible landscape composition with a portrait menu on every device.

## Goals / Non-Goals

**Goals:** keep menu entry read-only, isolate it from Phaser, and route deliberate actions into the existing lifecycle owners. Make every navigation/product choice below reviewable before implementation.

**Non-Goals:** new combat rules, save formats, music settings, persistent records, a mode-selection campaign, external fonts, production telemetry changes, publishing/deployment, and integration of unfinished PRs #246/#251/#252/#237.

## Decisions

### 1. Canonical routes and compatibility

Add a small pure `src/app/routes.ts` classifier/builder consumed by entry dispatch and menu links. Normalize trailing slash and BASE_URL without accepting arbitrary external destinations. Plain base root is menu; `/battle`, `/run`, `/dungeon`, `/map` retain explicit meanings. Whitelist root scene values `battle`, `proof`, `content-smoke`; other query parameters alone no longer imply battle. Document that old root bookmarks now reach the menu and provide an explicit Standalone battle link.

Preserve diagnostic query parameters when migrating test/collector URLs; do not rewrite arbitrary query text using broad string replacements. Full-page navigation gives each existing app its normal lifecycle and limits the new controller to menu concerns. A single-page scene router would require unnecessary disposal coordination.

### 2. Menu state and save summary

Implement `src/app/menuSaves.ts` as a read-only adapter over the existing storage readers. Reuse the run context currently assembled in `startRunApp.ts` through a side-effect-free shared factory if needed. Return summaries tagged by mode and slot status, including backup warnings. Do not rank by timestamps: no shared trustworthy last-played marker exists. Re-read on pageshow/focus/storage changes and immediately before action. Never retain raw save bytes in UI datasets or telemetry.

Continue disabled means no valid primary/backup across all modes; invalid-only or unreadable states get a separate visible Save recovery action and per-mode destination choices. If one valid mode exists, Continue selects it. Several valid modes open a native dialog listing Dungeon, Three-encounter run, and Standalone battle in that stable order, with backup/recovery qualifiers. Selected terminal snapshots remain valid and resume the owning mode's terminal UI.

### 3. Handoffs and destructive actions

Menu links use bounded `entry=continue`, `entry=new`, or `entry=recovery` intents. Treat these as requests only; parse a closed set, consume once, and use current destination inspection/session APIs. They carry no save content or permission to skip confirmation. New Game always targets `/dungeon?entry=new`; it invokes the existing `requestNew()` once after startup rendering, including its confirmation and checked replacement. Continue invokes each mode's existing continuation flow using a newly obtained review; loss of eligibility opens startup/recovery. Do not pass in-memory review tokens between documents or hydrate from menu-decoded state.

Add a quiet Main menu link to each mode at existing accessible navigation/tool surfaces. Preserve lifecycle teardown on pagehide. Where the owner reports unsaved progress, use a leave confirmation with recovery/save access; the link must not claim successful saving. Back/forward revisits refresh the menu summary rather than restoring stale action closures.

### 4. Visuals and bounded dialogs

Use a new `src/ui/mainMenu.ts`/CSS module with a native main/nav and buttons from an ordered data definition. Center a portrait column with max width around 30rem, 16px plus safe-area padding, minimum 44px controls, and vertical document scrolling. Use a restrained midnight/olive/ivory/brass palette from DESIGN.md. Do not constrain the whole page to an unscrollable fixed aspect ratio. Keep visible text and title aspect ratio at 320px widths, short landscape and 200% text.

Use the user-supplied Dawn Beyond the Ivy Ruins and Midnight Strategist’s War Room images as the background sources. Original PNGs and byte hashes are retained under `docs/art/issue-153/source/`. Both provide portrait framing and a quieter dark center for controls; Dawn uses an ivy arch/castle vista and Midnight uses a candlelit strategy room. Keep the selected background behind a readability scrim, the supplied title image above, and native controls in their own DOM layer. After approval, derive optimized runtime sizes/crops from these originals, preserving their visual composition and recording measured transfer size. Do not generate a replacement backdrop. Compare both behind the menu during visual QA before settling the delivered composition; supplying two sources does not require a runtime theme switch, slideshow, randomized selection, or blended image. These files are backgrounds, not the separate title artwork. The caller subsequently supplied `Tactics Guru.webp` as the title image; the unchanged source is retained at `docs/art/issue-153/source/tactics-guru.webp`, with dimensions 2172×724 (3:1), alpha channel, and a recorded SHA-256. This resolves the earlier Discord 403 asset gap. Use this supplied wordmark rather than typesetting or regenerating its lettering, and export a stable runtime asset after approval. During missing/error states show readable Georgia Tactics Guru text and a midnight backdrop with usable native actions; fallback is not proof the required title shipped.

Hall of Records opens “Records are not collected yet. Future records will be stored on this device.” Settings mounts the existing `mountTelemetryPreferences` UI and explains that in-game Sound controls retain their current gesture/mute behavior. Neither dialog creates a storage subsystem. Use menu-local native dialog focus capture, Escape/close, and origin focus restoration; do not initialize `BattleDialogs` or Phaser to show menu dialogs.

### 5. Telemetry and loading isolation

Skip `startTelemetry()` on menu just as dungeon is excluded, retaining a functional opt-out/preferences UI. No new route taxonomy, account configuration or collection is approved. Canonical `/battle` keeps the existing battle classification. Unknown-path/menu handling must not emit battle-started events. Lazy-load engine apps only after route selection; inspect production network logs to prove no Phaser/audio load on menu. Request artwork independently and keep controls usable during failures.

### 6. Verification scope and consumers

Entry dispatch, direct URLs and shared browser helpers affect every mode and collector, so select full regression under `docs/verification-policy.md` for implementation readiness. This is based on cross-route/harness reach, not file count. Keep focused iteration first. Planning itself requires no runtime tests.

Proposed additions: `tests/unit/routes.test.ts`, `tests/unit/menuSaves.test.ts`, `tests/main-menu.spec.ts`. Cover supported scene/base/trailing-slash routes; zero writes/RNG/session creation; all slot combinations across three modes; invalid/backup/unavailable/mixed saves; stale inspection; multiple/terminal modes; cancellation, repeated actions, lost storage, failures and legacy-key preservation. Existing recovery fixtures must use legal states and production validators.

Trace root assumptions in every `tests/**/*.spec.ts`, `tests/helpers/`, `scripts/measure-fit.ts` and imported collector modules, telemetry suites, asset checks, and batch manifests. Move battle entry to `/battle` or explicit `scene=battle`; preserve query flags and all assertions. Compare discovered test IDs before/after and justify additions/renames without lost coverage. Keep the collector's root/prefix battle workload targeting the actual battle, and menu boot as separate coverage.

Run focused units, both TypeScript scopes/build, changed entry/recovery tests, desktop keyboard/focus, real touch-profile portrait/landscape, narrow/short/enlarged-text and reduced-motion menu checks, screenshots, image failure and network isolation, and root/prefix preview/dev asset checks. Qualify the full inventory with `npm run verify:full` on exclusive qualified self-hosted capacity, workers:1, no hosted fallback. Include fixtures, placement, both WebKit configs, health bars, production/development telemetry, performance and prefix restoration. Add menu cases to appropriate Chromium/WebKit selections explicitly; discovery alone is not execution. Retain source/build/asset hashes, versions, reports, skips, failures and provenance for reused unaffected evidence. Do not relabel historical failures as green. No browser capture or artwork has been produced in this planning turn.

## Risks / Trade-offs

- Detailed title readability at narrow widths → preserve the supplied 3:1 wordmark, inspect actual rendered size and contrast, and retain readable text fallback for loading/error states.
- Menu inspection accidentally imports an app → pure adapter import boundary plus no-engine/audio/network and zero-write assertions.
- Shared test root assumptions hide regressions → enumerate consumers and compare discovery before/after; full relevant execution with original failures retained.
- Save changes during handoff → destination reinspection and existing compare-before-remove/continuation rules; menu chooses modes, not snapshot bytes.
- Root behavior changes external bookmarks → documented `/battle` link and explicit scene compatibility; no save migration or cleanup.
- Concurrent Shaman work touches combat consumers → base remains merged main; refresh/reconcile main before implementation and retain integration boundaries.

## Migration Plan

Implementation adds routes/UI/assets and relocates battle entry references; existing save keys and schemas remain unchanged. After approval, implement and qualify a focused PR. Review build/asset transfer deltas and preserve unchanged product performance budgets; use existing full-run performance checks plus menu-specific request/transfer measurements. Deployment is outside this workflow. Reverting code restores root battle routing without rewriting saved progress; rollback still needs normal release review if subsequently deployed.

## Acceptance mapping

| Issue #153 acceptance | Design/verification |
| --- | --- |
| Root menu and retained modes/base URL | Decisions 1/3; route units, entry/navigation and root/prefix checks |
| Portrait on desktop/mobile, safe areas, scrolling | Decision 4; desktop/touch/narrow/short/200% screenshots and assertions |
| Separate backdrop/title/buttons | Decision 4; DOM/layer checks and asset failure cases |
| Exact supplied title, local asset, alt/aspect | Decision 4; supplied original, provenance, natural/rendered dimensions, offline request assertion |
| Ordered dynamic actions | Decision 4; definition/order unit and browser checks |
| Continue/recovery/storage handling | Decisions 2/3; slot matrix, preserved bytes, stale/backup/unavailable and destination recovery |
| Agreed button destinations and guarded new game | Decisions 3/4; each button journey, existing reset confirmation/cancel/failure |
| Names, disabled state, focus, touch/readability | Decision 4; native keyboard/touch/dialog return checks |
| Playwright navigation, states, screenshots | Decision 6; recorded Chromium/WebKit device profiles and source-bound evidence |

## Planning review

The caller authorized implementation of these product choices on 2026-10-30 by requesting pickup and work on the issue. Both background sources and the caller-designated title are now available; this asset clarification does not change the proposed route/save architecture or constitute implementation approval.

## Implementation authorization

On 2026-10-30 the caller requested that this agent pick up the issue and start work. This authorizes implementation of the existing plan. Main refreshed and merged at `c8ca3c2`; no unmerged feature branches imported.
