# Issue #145 acceptance evidence

Updated 2026-10-19 (Asia/Jerusalem). Implementation is ready for review; the complete browser matrix is in progress. See the [handoff](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-145-default-move/tasks.md).

## Candidate and reproduction

Base: `b1bd7e7` (plan) on `main` `41ca782`. Initial focused build: that base with the issue implementation in the working tree. Production source blobs are `ccadc293b2d5085b524d1d37b9b7a9b290c48381` for BattleScene and `db923598af5b9874df02355a2e29e3c111098741` for HUD. No movement, combat, save or replay rules changed.

The unchanged application failed `default Move initializes once per usable player turn and preserves explicit choices` on desktop: Move was enabled but `aria-pressed` was `false`, expected `true`. This was tested against a production build before the scene edit.

A second direct regression isolated a validated artificial snapshot at the existing 10,000-command limit. After the scene fix, Move was correctly unselected but the HUD still enabled it despite `previewMovement` returning `commandLimit`. The test failed before the narrow HUD fix. Both checks and origin-only behavior pass in the candidate's desktop boundary pass. Artificial boundary snapshots are not represented as ordinary gameplay progression.

## Acceptance map

1. First/later turns: `battle-loop.spec.ts` defaults without an action click after an enemy opening, another hero, round wrap and a real player-first restart seed selected from domain state.
2. Normal selected state: the same test compares native destination values and board reach with `previewMovement`, checks an empty destination, null pending intent and disabled Review before input.
3. Explicit override: Basic attack and signature survive target selection, hover, inspection/log dialogs, resize and simulated visibility restoration. State, replay and exact localStorage bytes stay unchanged.
4. Next turn: real Wait/enemy progression replaces an explicit choice with Move. `run-progression.spec.ts` checks fresh selection and empty destination at all three legally played encounter entries.
5. Selection never executes: existing keyboard, real touch and occluded-ground pointer/touch tests now use the default directly. Existing confirmation, right-click, Escape, modal capture, held-key and gesture suites remain in the full regression run.
6. Unavailable movement: the Continue test legally confirms one move, checks spent/unpressed Move and reconstructs that saved state unchanged. The synthetic command-limit case proves domain rejection disables Move. The origin-only case keeps existing enabled selection but offers no destination or intent.
7. Post-action flow: Move accepts exactly one command and leaves the remaining action usable. A legally reached attack-before-move boundary stays cleared with unspent Move manually selectable. Session result comparison and existing complete-battle/run replay checks retain deterministic acceptance proof.
8. Interaction/visual evidence: desktop, Pixel 7 portrait and landscape run the same scenarios. Screenshots cover initial selection, explicit override and spent movement. Playwright emulation satisfies AGENTS.md; no hardware, screen-reader or deployment testing is claimed.

## Verification

- `npm ci`: 44 packages, zero audit findings.
- Focused unit command from the plan: 53/53 tests in four files.
- `npm run test:unit`: 712/712 tests in 41 files.
- `npm run build`: content checks, both TypeScript configurations and Vite passed.
- Strict OpenSpec validation: passed for this change.
- Three-profile focused default/Continue/map/run pass: in progress; final results and retained images will be added before closeout.
- Complete `npm test`, including both configured posttest suites: pending.

The environment uses bundled Windows Node 24.19.0, npm 12.0.2 and Playwright 1.63.0 with its installed Chromium. Windows npm is invoked through an ignored wrapper because npm is absent from the session PATH. OpenSpec runs via the installed WSL CLI. No browser executable override is set.

Existing warnings: Vite reports its large Phaser chunk and future native-config-loader extension support; Node reports FORCE_COLOR/NO_COLOR precedence. These do not fail build/tests. A premature second Playwright invocation found the owned preview port busy and ran no cases; subsequent browser runs are serialized.

## Visual review

The desktop initial capture shows the gold selected Move button, teal movement range, untouched board selection and disabled Review. The battle board stays unobstructed by the existing right-side rail. Portrait/landscape and post-move captures will be reviewed and retained at closeout.
