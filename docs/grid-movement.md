# Grid movement (#5)

Source reference: `b343ab02ae033a57f8c5f613f07883764f0752c0`. Original implementation and verification notes describe their named historical slices; see [current gameplay overview](../README.md) and linked contracts for later integration.

`src/domain/grid.ts` adds pure movement APIs over the validated battle snapshot and trusted typed content catalog. `previewMovement(state, unitId, catalog)` returns reachable cells ordered by cost, y, x, including the origin at cost zero. `previewMove(state, command, catalog)` returns a legal move's cost and path including both endpoints. `moveUnit` resolves that intent into a fresh snapshot and a `moved` event; it sets `hasMoved` and increments `commandCount`, preserving `hasActed` and RNG. General command dispatch is `dispatch` in `src/domain/turns.ts` (#7; see [turn flow and combat](turn-flow-combat.md)). The foundation's `previewCommand` continues to check structural intent and common actor preconditions only.

Rules follow [legacy GridService.gd](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/GridService.gd), lines 6–95 and 147–163: cardinal neighbours in +x, −x, +y, −y order; uphill delta must not exceed Jump; downhill is unrestricted; destination terrain cost plus uphill delta spends Move. The lowest-cost frontier breaks ties by y then x, and equal-cost discoveries retain the first path. Pinning Shot and Frost Snare can prevent movement; see [ability rules](signature-abilities.md). Hazard, flying, forced-movement and undo behavior are not included.

Actor/command validation precedes movement checks. Movement rejections are ordered: alreadyMoved, outOfBounds, sameCell, notWalkable, occupied, unreachable. Coordinates outside the content schema (negative, fractional, or above 31) are malformedCommand at the existing intent boundary; coordinates within that schema but outside this map are outOfBounds. Same-cell commands reject without consuming movement; the origin remains queryable at cost zero. A battle at the command limit rejects `commandLimit` in the shared intent check (#7), before any movement check.

Living units of either side block destination and traversal. Defeated units do not occupy cells. Occupancy derives from current unit positions on every query, rather than introducing a second serialized grid or cache. Invalid overlapping snapshots reject at the existing state boundary. Legal movement replaces the actor's position in one returned state, releasing the previous cell and occupying the destination together. No input is mutated and no RNG is consumed by preview, rejection or successful movement.

Focused behavior tests were written before the grid module and failed on its missing import. Verification: `npm run test:unit -- tests/unit/grid.test.ts`, `npm run test:unit`, `npm run typecheck`, `npm run build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`, and `git diff --check`. Browser tests exercise existing presentation regressions; this domain slice does not wire a playable battle or claim physical iPhone validation.

## Battlefield admission and detours

`movementEdgeCost` defines one cardinal edge: destination cost plus ascent must fit
Move, and ascent must fit Jump. Descent remains unrestricted. `routeDistances`
uses these same edges across turns; each edge must be affordable in a fresh turn,
not the entire route. Living units block runtime routes.

Run battlefield admission checks every walkable cell in both directed reachability
searches using the minimum roster Move/Jump. It also checks immediate occupied
spawn exits for all seven nonempty hero subsets and searches damaging-ability
positions with actual range/LOS. For structural engagement only the chosen target
is fixed; other units may move. This proves terrain access to combat, not freedom
from every congestion state, a winning strategy, or a finite battle duration.

Enemy immediate expected-damage attack ordering is unchanged. Without an attack,
weighted routes target legal ordinary-attack cells. Goals sort by route cost,
target ID, ability ID and cell y/x; one-turn destinations sort by remaining cost,
move cost and y/x. A strictly improving route may increase Manhattan distance.
Planning draws no RNG and serializes no route commitment. Accepted movement/action
flags reproduce the remaining move/attack/Wait suffix after reload. Rules version
2 explicitly rejects saves using the previous autonomous decisions.
