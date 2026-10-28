# Issue 155 dungeon follow-up verification

The caller clarified that dungeon enemies move only after player steps, that any uncleared encounter may be entered, and that `/map` is encounter-free. This follow-up changes the dungeon save format and requires full regression under the verification policy.

On 2026-10-27, the focused domain suites passed 109 tests; `npm run build` passed content validation (221 tests), both typecheck scopes, and production bundling. The two affected dungeon Playwright suites passed 66 tests across desktop, mobile portrait and mobile landscape emulation. Strict OpenSpec validation and `git diff --check` passed. No physical hardware was tested.

Iteration evidence: an initial preview run used an older build (one movement assertion failed); after rebuilding, static-enemy test assumptions caused compass, traversal, presentation and performance fixture failures. Fixtures were corrected for moving enemies, and the affected suites then passed. The initial broad iteration was interrupted after its failures. A unit run started before implementation was interrupted when its inputs changed; it is not counted as passing evidence.

Full regression remains required. Its source revision, stage results, failures and any incomplete stages must be recorded in the full verification report; this focused evidence does not replace that gate.

The first full-regression attempt on `87d8390` reported 961/962 unit tests passing. The stair revisit assertion incorrectly expected the departing floor's enemy state from before the player's stair-entry step. It was corrected to compare the actual saved departing floor; the 23 exploration unit tests then passed. The full run was interrupted during fixtures after this failure and is not acceptance evidence. Its partial report is `tmp/verification/full-2026-10-28T00-38-06.487Z-88785/`.
