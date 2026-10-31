# Issue 254 verification (incomplete)

Planning base: `a8b87c199fb2ae171a9bb72961ac7114622c4d60`; implementation was tested with a dirty working tree on macOS. The Playwright runs below are local browser emulation, not self-hosted CI or physical hardware. The final build after the last runtime edit passed content validation, both TypeScript scopes and Vite; it retains existing Vite loader and chunk-size warnings.

- `npm run test:unit -- tests/unit/overworldMap.test.ts tests/unit/dungeon.test.ts`: 109 passed before the final test-only refinement.
- `npm run test:unit -- tests/unit/overworldMap.test.ts tests/unit/dungeon.test.ts tests/unit/dungeonBattle.test.ts`: 121 passed, 3 failed. Existing Shaman witness selected another encounter; Mage and Ranger witnesses did not reach an encounter within their 400-step limit. The new chase behavior changes their movement trajectories. The literal base was checked later as described below. The focused map and dungeon files passed in this invocation.
- A subsequent experimental witness-search repair failed four journey cases. That experiment was discarded; the failure is not represented as a passing full unit suite.
- Chromium and WebKit each passed 15 affected local cases across desktop, portrait and landscape profiles, including pursuit, traversal, encounter entry and reload. Reports: `tmp/verification/issue-254/chromium.json` and `webkit.json` (local ignored files). A separate desktop legal reward/guardian journey passed (`journey.json`). These browser runs preceded a later error-message-only runtime edit, which does not affect their exercised behavior.
- The initial new pursuit-browser fixture failed on all three Chromium profiles because its saved position was not marked visited. After correcting the fixture, the new test passed all three Chromium and three WebKit profiles. The original failure output was retained in the task transcript; its default Playwright artifact directory was overwritten by subsequent runs.

Outstanding: repair and verify the legal production journey witnesses, run affected browser journeys against the final implementation on qualified self-hosted capacity, preserve reports and source/build identity, and complete the approved plan's final acceptance accounting. The current results do not establish PR readiness or a clean full regression.

## Witness refresh in progress

The legal journey helpers and their assertions are unchanged. Replacement seeds under the new pursuit rules are Shaman 189, Mage 46 and Ranger 12. `npm run test:unit -- tests/unit/dungeonBattle.test.ts` passed all 15 cases with those seeds, including combat-event and replay assertions. The prior 3-failure wider run remains a failure, not a passing full-unit run.

The first local Chromium Shaman run on seed 189 failed all three profiles because the new witness targeted the Fighter (50% Will save chance), whereas the old seed had targeted the Ranger (45%). After correcting the exact expectation, all three Chromium profiles passed. Original failed report: `tmp/verification/issue-254/shaman-local.json`; corrected report: `tmp/verification/issue-254/shaman-corrected.json` (local ignored files). The desktop Mage/Ranger browser run passed both complete journeys (`tmp/verification/issue-254/extended-local.json`, local ignored file).

[Self-hosted run 41224946470](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41224946470) is queued for source `b6dc96263938188b64ceba3e3d26613c589d18ce` on the exclusive runner. Its branch-scoped job records source, toolchain, browser, input and build identities and uploads separate engine reports. No result is claimed while it is pending.

- Exact-base comparison: an archive of `a8b87c199fb2ae171a9bb72961ac7114622c4d60`, using the same local `node_modules`, passed all 15 `tests/unit/dungeonBattle.test.ts` cases with the original seeds. The earlier source `5083c6d` run failed three of those cases under changed pursuit; the replacement-seed run at `b6dc962` passed all 15. The failed original run remains distinct.
