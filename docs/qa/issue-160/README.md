# Issue 160 qualification

This record covers the approved HP/XP/level/learned-action slice on
`work/issue-160-hero-progression`, based on main
`5a8802753811663957ea38bb828773866b000f95`. The caller approved the OpenSpec plan
in chat before implementation. PR: [#238](https://github.com/luminari-gurus/tactics-guru-v2/pull/238).

Required affected qualification and visual review are complete. All approved acceptance gates are verified; no clean full-regression claim is made. The earlier failed baseline remains failed in its original record.

## Scope and acceptance mapping

| Issue criterion | Implementation and proof |
| --- | --- |
| Bounded hero state and once-only awards | Validated cumulative XP/level/max HP/learned records; accepted run/dungeon completion owns awards. Progression/run/dungeon contracts exercise rejection, stale completion and terminal awards. |
| Level-5 rules, eligibility, healing and caps | All three HP curves and thresholds; multi-level/large awards, cap saturation, losses and defeated heroes. Legal two-floor domain witness checks every encounter kind's actual per-hero XP increments. |
| Non-HP stats and projection | Immutable baseline → progression → equipment; preparation caps and saved-battle readers share derived values. Repeated construction, existing equipment/Guarded and unchanged non-HP stats are checked. |
| Definitions and Magic Missile | Optional validated required level, canonical learned IDs and authoritative catalog gating; existing signatures stay level 1. Legal fixture profiles exercise later levels; actual dispatch verifies 1/2/3 missiles at levels 1/3/5. |
| UI, save/resume and transitions | Party/inspection XP/level/learned feedback, accepted-only announcements, new envelope identities, incompatible-old-save export/recovery. Responsive progression and fixture browser cases pass on the qualified profiles. |

No revival, new class ability, non-HP class growth, deployment or production
telemetry activation is included. Standalone catalog defaults and content identity
remain unchanged. New class abilities stay in #163–#165 and stat advancement in #185.

## Executed local evidence

- `unit-940.txt`: 940/940 full unit tests on the inputs committed as
  `c1007818ddf10e7bc3a48555257055d220b994d1`, using Node 26.11.0 on macOS.
- `current-format-66.txt`: 66/66 focused dungeon, exploration and battle contracts
  after removing obsolete pre-progression migration readers; relevant final inputs
  are committed in `ece83833d29fa3e4b20cefb51d94920effc111a4`.
- Other numbered logs retain intermediate focused validation. They are iteration
  evidence, not claims that every suite ran on the final commit.
- Build logs include content checks, both TypeScript scopes and ordinary production
  output. Existing Vite bundle-size warnings remain.
- Text logs are whitespace-normalized for repository diff checks. Original local
  logs remain in the task's temporary workspace; CI raw JSON and retained artifacts
  provide separate durable receipts.

The initial sandbox-limited full-unit attempts reached preview-server contracts
that require loopback binding, timed out and were terminated. Their partial failures
remain in `initial-partial-sandbox.txt` and `sandbox-preview-failures.txt`.
The later full run with the required local server access passed. Original failures
are not relabeled as passes.

## Self-hosted capture ledger

- [40033808531](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40033808531):
  superseded/cancelled source `fb8dc43`. Its retained artifact includes partial
  Chromium output and a fixture setup error (port 4173 was still in use during
  cancellation). It is not a completed capture.
- [40034218544](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40034218544):
  source `c100781`, broader affected selection: 114 Chromium IDs, 69 dev fixture
  IDs, 14 focused WebKit run-recovery IDs and two-engine smoke. All 114 Chromium, 69 fixture and 14 WebKit cases passed, with zero skips, failures, flaky results or retries; both engine smokes passed. Full units: 940/940. Raw reports/logs and complete artifact hashes are in broad/.
- [40035027749](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40035027749):
  cancelled while pending; replaced before execution to retain environment/build
  manifests with the same final test selection.
- [40035508795](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40035508795):
  cancelled while pending to fold in visible party screenshots and reload-announcement assertions; no tests executed.
- [40035983556](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40035983556):
  cancelled while pending to include the learned-array ownership repair; no tests executed.
- [40038512313](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40038512313):
  invalid temporary workflow YAML (a plain scalar contained a colon in the shell filter); no jobs or browser tests executed. The parser error was repaired without app changes.
- [40038555853](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40038555853):
  source `2e2362c`, final focused units/build, Chromium/WebKit progression boundary,
  required-level/caster restoration fixtures and engine smoke passed: 146 focused units, three Chromium boundaries, nine WebKit boundaries, six remaining WebKit run cases, twelve fixtures and both engines. The desktop telemetry journey failed because its test compared level-2 HP with catalog level-1 max HP and attempted a disabled heal. The failure is retained in final-boundaries/. The test now uses the saved hero max HP; no application fix, timeout increase or retry was needed.
- [40040352676](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40040352676):
  source `88d5222`, follow-up qualification. Sixteen focused units/build, twelve fixtures with actual rendered max-HP/fraction assertions, and three production plus three development telemetry journeys passed. All 60 WebKit exploration and nine Guarded preservation cases passed. All browser groups had zero skips, failures, flaky results or retries. Raw receipts and complete artifact hashes are in followup/.

All browser work uses the exclusive self-hosted browser lock with no hosted
fallback, one worker, existing timeouts/budgets and no added retries. Browser/device
emulation is the acceptance evidence; physical devices were not tested.

## Final-input differences and reuse

After the broad source `c100781`, the final source changes are bounded:
ability metadata validation checks dense data arrays before inspecting owners;
pre-progression dungeon migration readers are removed because those envelopes are
now explicitly incompatible; and the test-only player policy assigns the correct
number of Mage missiles at higher levels. An unused type import is removed. Learned arrays returned by run previews and attached to battle inspection metadata are independently copied; mutation regression tests prove they cannot alter authoritative party state.
No assets, dependencies, configuration budgets or gameplay formulas change. A stale cold-history test title is renamed from format-3 to progression-format, and its unit diagnostic reads the actual envelope format (4); assertion bodies and browser budgets are unchanged. The broad report retains its original title/source identity.

Fresh focused tests cover these changes. The final browser boundary tests exercise
the current reader and save/inspection path on all Chromium and WebKit profiles.
The pure legal two-floor witness remains fully checked, including every award kind.
Short runs never reach level 3 before their final battle, so their policy casts
remain one missile; first-floor dungeon entry XP is at most 100, also below level 3.
The seed-190 two-floor witness's Mage is defeated at 175 XP before reaching level 3.
Its existing UI policy commands therefore remain unchanged by the higher-level
test-policy repair. Higher-level real dispatch is covered by the new fixtures.

Final source/build manifests, original browser failure, screenshots and run dispositions are retained in broad/, final-boundaries/ and followup/. The final CI inputs match all current application/browser/dependency inputs; the sole later test change is the locally verified authentic old-save unit fixture. final-source-inputs.json records the final runtime/test/configuration/asset hashes. Temporary qualification workflow changes are restored byte-for-byte to the main base. There is no new full-matrix baseline or release certification.

## Complete inventory accounting

The save change is cross-cutting, so all 19 inventory stages are accounted for.
This is functional evidence reuse under verification-policy.md, not a claim that
every matrix ran again on the final build. The selected change's fresh gates must
pass before readiness. The previous full-run aggregate remains failed/incomplete.

| Stage/family | Disposition |
| --- | --- |
| Tooling | Fresh 10 full-runner and 27 batch/selection contracts pass. |
| Units | Fresh full 940-test run at c100781, followed by current affected domain/session/content and ownership checks. |
| Typecheck, root build, restored root | Both scopes and final self-hosted production build pass. Final emitted root build is recorded separately from configured telemetry output. |
| Build integration / prefix build | Fresh root and /tactics/ in-memory production builds check every emitted code/cache header and unchanged image digest. No prefix-specific source, asset URL or Vite behavior changes. |
| Default Chromium | 123 fresh affected cases (114 broad plus nine final Guarded) plus 550 retained cases account for 673 current cases. chromium-reuse.json keeps 546 old passes, three expected skips and the one previously failed startup case separate. No clean full-matrix result is claimed. |
| Dev fixtures | All 69 cases pass at c100781; the 12 added level/caster cases are also qualified on final inputs. |
| Placement-dev | Reuse three passed cases from #203's ledger. All map generation/marker/input sources, fixture and test assertions are unchanged; progression is not used by /map. |
| WebKit battle/run | All 20 configured run-persistence cases are refreshed (14 broad + six final). The remaining 32 standalone battle/audio cases retain their earlier proof: baseline catalog, turn/RNG/command/save/audio/input behavior stays unchanged. |
| WebKit exploration | All 60 current cases pass freshly on final inputs: desktop, portrait and landscape WebKit, including both-biome legal traversal, progression, aggregate cloning, serialized arrays, old-save recovery, keyboard/touch/focus/compass and cold-history budgets. The original three old-save normalization cases are replaced, not reused. |
| Health bars | Reuse 25 passed cases from #203. Health-bar geometry/rendering, base hero stats and old level-1 fixtures are unchanged. Twelve fresh fixtures additionally assert actual board health-bar max HP and fraction at levels 1/2/3/5 across all profiles; current domain rules and real battle/inspection cases cover the shared projection. |
| Telemetry production | Three fresh separately configured complete-run journeys pass on desktop, portrait and landscape, exercising outcomes/rewards/Continue after level-up. The remaining 33 adapter/error/privacy cases retain prior production-mode receipts and full unit proof. |
| Telemetry development | Three fresh development-server complete-run journeys pass on desktop, portrait and landscape. The remaining 33 SDK loading/opt-in, adapter, sanitization and event-taxonomy cases retain the distinct development report from #203. No production collection is enabled; ordinary-build bytes are not used as telemetry proof. |
| Root-dev / prefix-preview / prefix-dev assets | Retain the 201 passes and six expected dev resource-hint skips from #203. Asset files, URL/base/hint/cache consumers, routing and compiler/config/dependencies are unchanged. Fresh root/prefix emission checks cover the changed module graph; current engine and route tests load it. No byte-identical emitted bundle claim is made. |
| Performance | The proof-scene renderer, workload/collector/evaluator and budgets are unchanged. Preserve the historical 18-sample recovery and earlier failures as historical only. There is no fresh loading/frame timing, speedup, new complete baseline or release certification claim for this build. Current dungeon cold-history/startup budgets remain fresh acceptance assertions. |

The original reports and their source/build/condition limitations are retained in
[issue-203/coverage-ledger.json](../issue-203/coverage-ledger.json), its compressed
raw reports and the underlying issue records. Their earlier failures are not erased.
[unchanged-consumers.json](unchanged-consumers.json) verifies exact unchanged source
hashes for the core standalone rules, storage, UI/input, assets, telemetry, build
configuration and dependencies against this task's main base.

Shared changed consumers were traced explicitly: BattleSession adds presentation
metadata without changing deterministic state; standalone sessions use an empty
metadata list and their inspection text remains identical. Run/dungeon contexts
supply copied canonical progression; fresh cases cover those paths. The owners
validation change runs only for the newly introduced optional required-level
metadata; existing production definitions remain unchanged. Removing old dungeon
normalization changes only the intentionally incompatible envelope boundary, which
has fresh negative recovery/export proof. Array copies preserve values while
removing aliases, with a mutation regression and current browser restoration proof.

Current acceptance does not depend on interpreting the inherited startup timeout
as passing. Its literal-main reproduction and later focused passing observation
remain in #203's startup disposition, with the original full aggregate still failed.

The final local old-save fixture correction recreates authentic pre-progression format-3 identity and HP-only party records. Its three rejection cases pass (`authentic-old-saves-3.txt`); this unit-only fixture edit changes no browser or application inputs.

Final receipts identify Node 24 on the Linux self-hosted runner and the installed Chromium/WebKit builds; local unit logs separately identify macOS/Node 26. CI manifests record ordinary production and separately configured telemetry output hashes. Development telemetry uses its configured dev server. Uploaded artifacts have 30-day retention; selected compressed raw reports and screenshot evidence are retained here beyond that window.
