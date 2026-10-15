# Design

## Context

See [proposal.md](proposal.md) for motivation and [the implementation plan](../../../docs/ongoing-projects/plan.md) for all eight issue acceptance criteria. The inspected baseline is `main` at `d2a1a61abb636b5ab38ddce6c26207f6bcb6d4f5`.

`BattleHud` renders party portraits/HP, the active unit, budget flags, catalog-derived signatures, targeting, preview, review/cancel and sound/log controls. Party clicks show inspection text without changing the actor. `BattleScene` owns action/selection intent; `BattleSession` owns legal previews, accepted commands and player/enemy/presenting/ended phases. Move, Basic attack and signatures use review then confirmation; Wait commits immediately. The design must preserve this distinction.

`BattleDialogs` supplies native modal focus capture, dismissal and focus return. Save recovery and restart share that owner. Accepted state is saved before presentation; #106 provides a bounded 560 ms signature presentation, and returning from browser history uses current-save startup. Mockups must represent those states without implying that actions unlock on an arbitrary visual timer or that old effects replay after Continue.

`#fit-panel` is a top overlay with safe-area offsets, internal scrolling, 70dvh maximum height and a 45dvh short-landscape cap. `BattleScene` passes its bottom edge to `BoardRenderer.fit`; `fitBoard` and `constrainView` assume the remaining region is below that edge. A side rail or bottom dock therefore needs an explicit later geometry/input handoff, not only CSS positioning.

## Goals / Non-Goals

**Goals:** One coherent design package with three responsive compositions, a finite state catalogue, measurable readability/board-space checks and a file-level handoff that a later implementation can follow.

**Non-Goals:** Shipping the HUD, changing authoritative state/commands, adding a second battle simulation, building a reusable UI framework, expanding assets or certifying physical devices. Design-time fixture controls are clearly labeled and cannot be mistaken for gameplay evidence.

## Decisions

1. **Use a small documentation prototype with existing art.** Produce `mockups.html` with local CSS/JavaScript under the issue directory, plus exported preview images and `design.md`. Native HTML controls make focus, disabled explanations, scrolling and modal capture reviewable; static images alone cannot demonstrate these interactions. Keep any fixture selector outside exported player views. Do not mount this prototype in production or add a dependency.

2. **Derive a finite state catalogue from existing sources.** Copy only the display fields needed for representative Fighter/Guarded Strike, Ranger/High Shot and Mage/Magic Missile examples. Record the source revision and distinguish illustrative values from a real battle trace. Identify the acting unit separately from inspected allies and targeted enemies; inspection cannot alter which unit owns the action bar. Reuse existing ability names, previews, HP/max HP, Guarded, movement/action availability and relevant combat stats. Secondary stats remain inspectable instead of always expanded. No command resolution, RNG, save adapter or combat rules belong in the prototype.

3. **Design hierarchy before decorative styling.** Begin with the current tactical-fantasy art, dark backing panels and readable warm highlights. Order primary information as acting unit and budget, actions, then selected target/preview/review; keep party inspection, log, sound and save/restart access discoverable without equal visual weight. Document typography, spacing, palette, status symbols and restrained transitions in the design artifact. At most two bounded layout sketches are needed to resolve placement; iterate one selected direction thereafter.

4. **Measure placement against the real board constraint.** Compare a compact top cluster that retains `panelBottom` with a desktop rail/mobile dock only if it improves the actual usable board region. Do not predetermine the winning composition before visual review. At desktop 1280x720, portrait 412x915 and landscape 915x412, annotate safe areas, unobscured board bounds, selected tile/unit visibility, control dimensions and scroll regions. Also inspect 320x568, 568x320 and enlarged text. Preserve at least the current usable-board floor (30% of height normally; 55% in short landscape) and seek improvement; these are minimum checks, not a claim that a percentage alone proves usability. If a rail/dock is selected, specify its reserved rectangle, fit/pan/zoom/feedback anchors and input exclusions for the follow-up, without implementing geometry here.

5. **Specify interaction/accessibility alongside each state.** Include idle/action selection, target/valid preview, invalid target with reason, review/confirm/cancel, movement spent, action spent, enemy turn, presentation lock, victory/defeat and inspection of a non-acting unit. Document which controls remain reachable and why others are unavailable. Interactive targets are at least 44x44 CSS px. Set design contrast targets of 4.5:1 for ordinary text and 3:1 for large text and meaningful control boundaries; record measured pairs rather than claiming general conformance. Use visible focus, native accessible names, text/icons beyond color, keyboard and touch parity, polite status updates, bounded scrolling and reduced-motion alternatives. Disabled explanations must be available without hover or focusing a disabled element.

6. **Keep the handoff honest about what a prototype proves.** Exercise prototype focus order, modal trap/return, disclosure, disabled reasons and click/tap interception with a board-event counter. Use a screenshot of the actual board as context and annotate where live integration remains unverified. A counter proves the prototype consumes inputs; the runtime issue must separately prove no battle command/selection occurs beneath overlays. Reuse existing battle-loop, battle-board, animation, persistence and audio regression suites in that handoff instead of inventing a parallel test framework.

7. **Record review and split runtime delivery only when concrete.** Complete `design.md` with the chosen layouts, all states, measurements, rejected layout trade-offs and acceptance evidence. Record the review disposition, then create or reuse one focused implementation issue if required; link it to #108 and specify files, geometry implications and regression checks. Do not mark #108 accepted merely because this plan or an HTML file exists.

## Risks / Trade-offs

PR #112 review repair keeps the finite display prototype: Guarded is its own display flag, set only by Fighter signature confirmation or the explicitly authored Fighter action-spent fixture. Basic attack spends the action without granting Guarded. Share post-cancel focus restoration between the visible Cancel button and nonmodal Escape. Retain Restart fallback with repeated Enter/Space button activation suppressed; carry this requirement into the runtime handoff. Extend `verify.mjs` with these exact regressions and keep existing layout/interaction checks.

- Rich unit details can consume the board area. Use inspection/disclosure and measure the expanded states, not only the ideal idle screenshot.
- A prototype can display impossible states. Check examples against the existing catalog/session fields; label illustrative fixtures, and retain real command semantics.
- Top-only geometry can make a polished rail/dock impossible to integrate through CSS alone. Document the needed viewport rectangle adaptation and focused camera tests in the handoff; do not hide this cost.
- Duplicating actor information into inspection can imply changing turns. Keep acting-unit identity persistent and label inspection/target roles in text and accessible names.
- Existing tests contain exact selectors and names. Map stable hooks and intended label changes before runtime implementation; do not weaken behavioral assertions to accommodate a layout.
- Mockup responsiveness does not prove live or physical-browser behavior. Report prototype checks separately; retain #64/#66/#74 certification gates.

## Migration Plan

No runtime migration or deployment. Publish documentation and review assets on the task branch. A later HUD implementation uses the accepted handoff and its own validation/approval; the current combat, save and presentation paths remain the reference.
