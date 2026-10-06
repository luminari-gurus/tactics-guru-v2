# Packaging provenance and review boundary

This public package awaits independent **exact-package** review. The previous independent verdict covered external installer source and isolated acceptance, not these relocated bytes or the new operator runbook. No installation approval is conveyed. Production execution remains user-owned.

## Prior frozen source scope

- Installer production catalog: 18-file canonical digest `e7404471ea7c5389855ac32b1d391c21e00f9be29c18601dca49407b803f84b7`.
- Complete prior 32-file Python catalog: canonical digest `eeee435a2588246480de7a533e842aa139d8761a588e9b3856526126976f1a09`.
- Three publisher runtime files remain byte-identical to that catalog. Public publisher tests/fixes were already present as an approved dirty PR baseline and are preserved.

All 26 copied installer/dependency/test Python files were checked against that prior catalog **before copying**. The initial packaging changed three copied files (the historical packaging deltas below); the subsequent R1/R2 fixes also change `console_lifecycle.py`, `host_console_backend.py`, `host_policy.py`, `host_adapters.py`, `test_native_actor.py` and `test_integrated_actor.py`, and extend `run_native_candidate.py`. `SOURCE-MANIFEST.json` distinguishes every unchanged/delta predecessor mapping and binds the current production catalog.

1. `console-candidate/console_cli.py`: inserts its operator-controlled sibling module directory before importing `candidate_plan`, so the documented `python3 -I -B` invocation resolves modules while still rejecting container/remote execution before input access or effects. This is a production-source packaging delta and requires fresh review.
2. `console-candidate/run_native_candidate.py`: derives the publisher directory from this checkout instead of an agent-specific absolute repository path.
3. `console-candidate/run_integrated_candidate.py`: imports shared isolated-fixture helpers from `fixture_support.py` rather than obsolete combined-transaction tests.

`fixture_support.py` extracts only the prior reviewed `IMAGE`, `cli`, `inspect`, `UBUNTU`, `CONF` and `archive` helpers. The obsolete `combined_transaction.py` and `test_host_combined_runtime.py` are not packaged; the integrated lifecycle and native actor tests are. Other copied bytes remain unchanged, including historical dependency documentation/fixture constants. Such modules are dependencies, not alternative operator entry points.

New files: portability tests, isolated publisher driver (fresh fixture keys, existing pinned equipped image), generated-output ignore rules, operator runbook, this provenance note, `SOURCE-MANIFEST.json` and `SHA256SUMS`. R1/R2 additionally introduce `console-candidate/test_defects_actor.py` and its explicit confined driver `console-candidate/run_defects_candidate.py`; these have no copied predecessor. The manifest enumerates all 26 predecessor mappings with current hashes and explicit changed/unchanged classification, the two new regression files, and the named 18-file production canonical map. Existing `deploy/README.md` now links the public runbook and removes obsolete unfinished requirements. No CI workflow change is introduced by packaging; package-specific commands are explicitly listed in the runbook and exercised locally, not claimed as newly wired CI checks.

## Exact-review contract

Authenticate `SHA256SUMS` by its separately supplied manifest SHA256, then verify it from the repository root. It includes all public deploy files plus the existing release workflow and excludes itself/generated evidence. The external handoff also binds the baseline Git HEAD, every public path/mode/hash, complete tracked and untracked diff and validation receipts. Any edit invalidates that handoff.

A `passed` unit result, preserved prior approval or `installation_ready:false` CLI output is not independent approval. The intentionally conservative `UNREVIEWED CANDIDATE` console warning remains. Review must include the complete privileged transaction and prospective runbook commands, specifically root-console enforcement, timed lease/plan invariants, source/backup bindings, SSH/PAM activation, account/file ownership, bootstrap deletion recovery, exact Docker identity reconciliation and postpublication rollback limitations.

## Validation interpretation

Offline, native SSH/PAM, actual owned Docker lifecycle and publisher checks are separate scopes. Integrated tests inject inventory/reload boundaries; they do not execute authentic host `HostInventory`/`factory`/systemctl on production. Equipped test images are pinned local image IDs, not reproducible fresh dependency builds. Fixture keys never become production keys. The runbook explicitly preserves these acceptance limits and the separate installation/activation/merge/legacy-retirement authorities.
