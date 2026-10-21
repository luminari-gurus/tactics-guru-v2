# Spatial dungeon exploration acceptance

Runtime under test: `4da0159` on `work/issue-158-overworld-traversal`, based on `38474f2`. The caller approved published OpenSpec plan `e115ea2`. Source and built-file SHA-256 values are bound in [runtime-manifest.json](issue-158/runtime-manifest.json). The build's dirty flag reflects an existing test-generated QA simulations file, not an uncommitted runtime edit.

Delivered behavior: `/dungeon` accepts legal single-cell keyboard/pointer/touch traversal, retains reveal/visited cells and seeded POIs, enters the next battle on contact, returns with exactly-once completion/reward state, and requires arrival at stairs for floor travel. Existing party/item projection, battle actions and recovery remain authoritative. `/map` stays independent inspection. Stationary POIs do not complete #155 enemy wandering; #159 content/scaling and #175 scouting/traps/caches remain separate.

## Verification in progress

- Full Vitest: 828/828 passed across 50 files.
- Content validation: 190/190 passed across seven files.
- Both TypeScript configurations passed; production build passed with existing Vite native-loader and large-engine-chunk warnings.
- Complete Chromium suite and configured encounter/item posttests: running against the pinned build.
- Focused WebKit matrix: pending after Chromium to avoid GPU/test-server contention.

The first focused Chromium matrix passed 44/45. One portrait assertion measured a control detached by an asynchronous artwork redraw; it now measures all current control rectangles atomically. The initial readback-mismatch unit fixture also armed its failure before the write, so it did not exercise the intended uncertainty path; it now fails primary readback after a committed write. Raw failures and context are preserved as gzip files under [initial](issue-158/initial/). These failures are not counted as passing runs.

## Evidence boundaries

The real traversal case walks from a fresh dungeon through actual keyboard/cell-pointer/mobile-tap controls to an encounter, accepts a legal battle command, and reloads the exact active snapshot. Separate legal final-command fixtures exercise victory, pending rewards, guardian completion, defeat and return. Structural capacity fixtures are labeled and are not a claim that every preceding turn or step used browser input.

Browser/device emulation is sufficient under the caller's standing instruction. No physical-device testing, production deployment, merge or broader release certification is claimed.

Performance receipts compare localhost startup, observed route code gzip and assets, and synchronous map-step scripting time with unchanged budgets. Script duration is not a full frame/paint percentile; deployed network and complete-run performance are not inferred from localhost measurements. Final matrix receipts and disposition will be recorded when verification completes.
