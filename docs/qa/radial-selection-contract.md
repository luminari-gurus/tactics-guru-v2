# Radial selection contract repair

Found while qualifying issue #316. Literal main `6aad368` reproduces
`Unmapped omission: chromium mobile-portrait desktop radial preference replaces
the side rail with a bottom dock @canonical` in the first real selection contract.
The same failure on the Mage branch is therefore not caused by its added cases.

Two layout/touch witnesses used unregistered reduction tags. The radial dock
case was marked `@canonical`, a resource-failure classification it does not fit.
The narrow-landscape case also had an unregistered `@fixed-viewport` tag.
Removing that second tag restores its unchanged three-profile coverage.

The first local restoration run passed 5/6 cases and exposed the radial dock's
desktop viewport assumption: at the normal short landscape size the app
intentionally uses a side panel. Preserve the original dock assertions by making
their 1280×720 viewport explicit before navigation. Register this one real
`@fixed-viewport` case in the existing classification path. Pixel portrait and
landscape have identical effective touch/device settings at that explicit size;
the selection contract checks that equivalence and its exact retained mapping.
Normal narrow-landscape behavior remains tested on all three native profiles.

The approved reduction count becomes 24: the original 18 resource and five
fixed-viewport mappings plus this one explicit radial mapping. Routine coverage
restores two previously excluded mobile executions; two retained titles change
without losing assertions. Policy and positive/negative exact-count contracts
record the added mapping rather than accepting arbitrary tags or omissions.

The task-scoped workflow runs all batch/selection contracts and an explicit
all-profile control for these two witnesses, including the equivalent omitted
radial execution (six actual cases). The control removes only project selection
filters; assertions, devices, workers, retries and deadlines remain unchanged.
Qualified Linux results now pass at `8c199ba99698df3554c8f0703bdd5dd884c3c939`:

- [Selection run 42675291510](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42675291510)
  on `unraid-tactics-01`: all **31 batch/selection contracts** and **6/6 actual
  control cases**, workers 1/retries 0, no skips/flakes/failures. Browser duration
  was 38,985 ms. The radial cases use the explicitly named 1280×720 viewport;
  the narrow-landscape corpus retains its original viewport/input assertions.
- [PR verification 42675302736](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42675302736):
  **1,244 units**, both types, **2 build integrations**, bundle and **7 core
  journeys** passed in 245,834 ms. The actual synthetic merge `9c91abf` has tree
  `4b318f07af655e8acee1c879a7773a5a557ec30f`, verified equal to the published head.

[Portable receipts](radial-selection/) include the full qualified browser report,
stage receipt and logs. Earlier zero-job GitHub service failures and the local
scope failure remain distinct; this is not a full-regression or physical-device
claim. Only this documentation/receipt update follows the tested code, so the
relevant inputs are unchanged. PR #358 is ready for review; merge is not part of
this implementation handoff.

Local Windows iteration passed all six selection contracts and all six explicit
control cases (18.9 seconds, one worker, zero retries/skips) after the viewport
correction. [Portable iteration receipts](radial-selection/) retain literal-main
failure, the 5-pass/1-fail scope discovery and the final green control. This is
iteration evidence; the qualified Linux workflow still owns final acceptance.

The Windows batch-contract run also hit a separate environment limitation:
`spawnSync('sh')` returned no exit status because this session has no `sh` on PATH.
Run that existing shell contract on the qualified Linux host; do not change or
skip it to accommodate the local shell.
