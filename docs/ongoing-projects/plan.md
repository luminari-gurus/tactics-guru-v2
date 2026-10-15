# Issue #111 — responsive battle controls review handoff

Updated 2026-10-15 (Asia/Jerusalem). **Implementation and acceptance verified; final PR publication in progress.** OpenSpec is 9/10 checked; the final task includes publishing this handoff and the dependent PR.

- Issue: [#111](https://github.com/luminari-gurus/tactics-guru-v2/issues/111).
- Geometry: [PR #118](https://github.com/luminari-gurus/tactics-guru-v2/pull/118), `work/issue-111-responsive-battle-controls` → `main`, head `ba47b0a95ff315fd3f38e7d628f99ffbe5ef3307`.
- HUD/input implementation: `branch/issue-111-responsive-hud`, stacked on the geometry branch; PR publication is the immediate next action.
- Active checkout: `C:/Users/apexw/.codex/worktrees/issue-111-responsive-controls/Tactics-Guru`. Original and planning checkouts remain untouched.
- OpenSpec: [proposal](../../openspec/changes/issue-111-responsive-battle-controls/proposal.md), [design](../../openspec/changes/issue-111-responsive-battle-controls/design.md), [delta](../../openspec/changes/issue-111-responsive-battle-controls/specs/battle-controls/spec.md), [tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md).
- Detailed acceptance, screenshots and commands: [QA record](../qa/issue-111-battle-controls.md). Accepted visual reference: [#108 design](issue-108-battle-controls-design/design.md).

## Outcome and scope

The real battle now uses the accepted 352px desktop rail, 280px short-landscape rail (244px at narrow widths), and portrait dock capped at 56% safe height/510px. Actor information and actions/tools scroll independently. Live HP, effective stats/status, budgets and catalog-named signatures remain distinct from target/preview and inspection. Inspection and the event log use the existing native modal owner.

One measured canvas-coordinate rectangle excludes safe areas, captions and controls. Fit, pan/zoom constraints, canvas clipping and captured-pointer gating use it. HUD changes preserve navigation; actual viewport changes preserve relative zoom; new battles fit afresh. Raised art, transformed picking and separated damage/defeat feedback remain usable. Nonmodal Escape/Cancel share Move/Wait focus restoration; existing held-key and modal callback ordering protections remain intact.

Preserved: domain rules/RNG, immediate Wait, preview/review/confirm/cancel, authoritative presentation completion, accepted-command autosave, current-save history return, recovery/restart, audio and reward/item controls. No dependency, save-format, combat/balance, new-art, run-progression or deployment changes. Existing #57/#58/#64/#66/#74 and separately assigned #80 remain outside this scope.

Ablation retained one HUD, one dialog owner and one rectangle. No framework, duplicate state machine, compatibility overload or overlay registry was added. Existing suites provide the proof. The game-playtest, game-ui-frontend and phaser-2d-game reviews confirm the DOM/Phaser/domain boundary and the accepted playfield protection; no new assets or architectural changes were needed.

## Verification and source identity

- Geometry source `3a645ca0a412ab3e2de73fbb1ce4a821094ad1d3`: 651 unit, 167 content, both typechecks/build, 12 focused browser and 18 encounter cases passed before PR #118 publication.
- HUD source `057166e2bae9d4e2249d379964bfc447179a5b72`: 652 unit tests, 167 content checks, both typechecks and production build passed. Focused integration passed 24 cases; final target-inspection, fitted screenshots and asset-selector checks passed another 12.
- Clean root build `7d333f1281b88120918d1663f8aebeae2f34feb7`: **420/420** configured browser cases, one passing attempt each with no failures/retries/skips. `npm test` automatically ran both posttests: **18/18 encounters**, **21/21 run items**.
- Prefix build `98f630cefc0a6324905c110dfee22cd362061588`: **48/48** asset/audio/loading and cached-history-return cases under `/tactics-guru/`, no failures/retries/skips. Source and test objects are identical to the root run; differences are documentation/evidence only.
- Strict OpenSpec and whitespace checks pass. The QA record maps all seven issue criteria to current evidence. Browser is installed Edge 155.0.4283.45 through repository Playwright, one worker.

The first probes and their repaired failures remain documented in QA; they are not represented as clean runs. The normal build's snapshot generator changed only line endings; normalized content was verified against HEAD before restoring that file, then Vite emitted a clean build stamp. Existing bundle-size warning remains.

Ignored evidence is in the active checkout: `tmp/hud-final-full.json`, `tmp/hud-final-full.log`, `tmp/hud-final-full-artifacts/`, `tmp/hud-prefix.json`, `tmp/hud-prefix-artifacts/`, `tmp/hud-root-build-manifest.json`, unit/build logs and earlier focused reports. Selected runtime screenshots and measurements are committed under `docs/qa/issue-111-battle-controls/`. Physical-device, screen-reader and deployment certification are not claimed or required for #111.

## Git and continuation

Current `main` was refreshed at `4e601480400a241a2c08cb88a41442e55a5385b7`; the parent PR still points at `ba47b0a`. No integration drift was found. The HUD branch descends from that exact parent. No history rewrite, tag, merge or manual deployment is warranted for these review-ready feature chunks.

Immediate closeout: publish the HUD branch, open its PR against `work/issue-111-responsive-battle-controls`, attach/link both PRs, mark task 4.2 complete, and verify exact remote-head equality, `0 0` parity and a clean worktree. Do not merge either PR. Review #118 first, then its dependent HUD PR; after any future parent merge, refresh main and retarget/integrate the child without losing the verified source. Preserve the merged #113 spec scenarios during a later normal archive workflow; this unmerged change is not archived here.

To reproduce, add the ignored `tmp/bin` directory to PATH for its temporary npm wrapper (bundled Node is already available), set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, and run:

```text
npm run test:unit
npm run build
npm test
openspec validate issue-111-responsive-battle-controls --strict
git diff --check
```

The build includes content validation and both TypeScript configurations. The test lifecycle includes encounter and run-item posttests. OpenSpec 1.14.1 entrypoint on this machine is `node C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`, with `OPENSPEC_TELEMETRY=0`. The temporary inspection server is stopped. Default-root build output will be restored after the prefix check; future preview commands use the normal project scripts.
