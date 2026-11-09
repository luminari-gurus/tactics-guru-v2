# Radial selection contract repair

Found while qualifying issue #316. Literal main `6aad368` reproduces
`Unmapped omission: chromium mobile-portrait desktop radial preference replaces
the side rail with a bottom dock @canonical` in the first real selection contract.
The same failure on the Mage branch is therefore not caused by its added cases.

Two layout/touch witnesses used unregistered reduction tags. The approved
canonical inventory covers resource failure/delay cases; it does not permit
dropping this radial layout/input check from mobile. Removing the tag restores
the unchanged assertions on all three Chromium profiles. This exposed the next
latent omission: `narrow landscape battle stacks controls below a usable board
@fixed-viewport` also carried a tag outside the approved `layout.spec.ts` corpus.
Remove that unregistered tag as well, restoring its landscape execution. The
radial title drops `desktop` to describe the actual scope. No matcher,
classification allowlist, product assertion or test deadline changes.

Retained test identities change only through these two title renames; three
mobile executions are restored coverage. All other titles/profiles are unchanged.
The qualified self-hosted `Radial selection contract` workflow runs the complete
batch/selection contracts and all six actual layout cases. Current-source
results are pending and must pass before this repair is ready for review.

The Windows batch-contract run also hit a separate environment limitation:
`spawnSync('sh')` returned no exit status because this session has no `sh` on PATH.
Run that existing shell contract on the qualified Linux host; do not change or
skip it to accommodate the local shell.
