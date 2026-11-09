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
Current-source qualified results remain pending before review readiness.

Local Windows iteration passed all six selection contracts and all six explicit
control cases (18.9 seconds, one worker, zero retries/skips) after the viewport
correction. [Portable iteration receipts](radial-selection/) retain literal-main
failure, the 5-pass/1-fail scope discovery and the final green control. This is
iteration evidence; the qualified Linux workflow still owns final acceptance.

The Windows batch-contract run also hit a separate environment limitation:
`spawnSync('sh')` returned no exit status because this session has no `sh` on PATH.
Run that existing shell contract on the qualified Linux host; do not change or
skip it to accommodate the local shell.
