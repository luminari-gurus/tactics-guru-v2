# PR #129-#138 review repair and current acceptance

All five distinct review findings are repaired and carried through the existing PR stack. The source is **`6e615dca32f19bdde9afab5f3233ba089aaa74b4`** in [PR #137](https://github.com/luminari-gurus/tactics-guru-v2/pull/137); #138 adds evidence and documentation only. **Issue #127 remains open: current deployed loading acceptance fails.** This repair handoff supersedes the earlier closeout claim for source `74088a4` without changing its historical receipts.

## Review disposition

- #129: reproduced the initial-idle false pass and destructive filesystem-alias output write. Initial p50/p95 now gate separately from final idle; CLI output uses exclusive creation. Three new regressions failed before repair and all 39 focused tests passed afterward. Original run landscape repetition-3 cold also has an initial F1 failure; raw bytes and the original total of ten failing samples remain intact.
- #130: carried both evaluator repairs, verifying unchanged runtime inputs and the combined focused checks.
- #131: reproduced all six browser variants of the three save-recovery defects. Explicit unsaved play cannot write until reviewed Continue/replacement; Cancel/Escape/export refresh startup bindings; deleting both loaded slots then starting creates a fresh playable run. The [separate recovery report](pr-131-run-recovery.md) retains red/green proof, 677 unit tests and 54 Edge plus 54 WebKit lifecycle checks. The visual guide and its original image bytes are preserved.
- #132: carried only #131's focused source/evidence commits, excluding the design guide. Verified 44 focused tests, 18 recovery browser cases and all 144 original performance samples/hashes.
- #133: verified the repaired startup runtime with 702 units, both typechecks/builds, 129 root browser cases and seven prefix checks.
- #134: re-evaluated all 72 startup samples and 14 report hashes; the original 777.4 ms failure remains. Runtime inputs match #133.
- #135: verified 46 focused tests including actual root/prefix generated cache rules, both typechecks and production build. Runtime inputs match the validated parent.
- #136: re-evaluated all 72 cache samples and 14 manifest hashes, retaining the original four loading failures and zero warm JS/CSS transfer.
- #137/#138: carried all repairs, verified the clean combined source below, and replaced the current issue-closing claim with this evidence-bounded handoff. Re-audited #138's original 72 passing samples, 29 manifest hashes and 707 historical test executions; these remain historical proof for their original source.

## Fresh functional proof

All checks use the exact combined runtime above. The [41-receipt manifest](issue-127-performance-budgets/review-repair/manifest.json) hashes every retained file and binds source, assets, scripts, tests, package inputs and Vite/TypeScript configuration. #138 has identical runtime inputs.

- [704 unit tests](issue-127-performance-budgets/review-repair/pr137-unit.txt), including content checks; both TypeScript configurations; [production build](issue-127-performance-budgets/review-repair/pr137-build.txt).
- [537 full Edge cases](issue-127-performance-budgets/review-repair/pr137-full-browser.json).
- [39 development encounter/item posttests](issue-127-performance-budgets/review-repair/pr137-dev.json), with forced dependency optimization.
- [63 prefixed-route cases](issue-127-performance-budgets/review-repair/pr137-prefix.json).
- [66 Linux WebKit acceptance cases](issue-127-performance-budgets/review-repair/pr137-webkit.json), including the six new recovery scenarios in both phone orientations.

All **705 browser executions pass**, with one attempt each, no skipped/flaky/unexpected tests and no report errors. This is browser/emulation evidence. [Canvas fallback](issue-127-performance-budgets/review-repair/canvas-fallback-desktop.png) and [fresh-run landscape recovery](issue-127-performance-budgets/review-repair/fresh-after-removal-landscape.png) screenshots were inspected. Existing Vite warnings are retained; they are not build failures.

## Performance: retain every attempt

[Summary and raw hashes](issue-127-performance-budgets/review-repair/pr137-final-summary.json) cover **108 complete acceptance samples**, with **99 passes and nine loading-failing samples**. All six 18-cell captures have the same clean served/source commit, Edge **155.0.4283.62**, identical collector hashes, complete workloads and zero capture/browser errors. Every L3/L4/F1/F2 gate passes. Limits, markers, startup animation and request accounting are unchanged. Captures were serial with no overlapping owned browser tests or profiling; there was no request interception.

- Local battle/run: **36/36 pass**. Worst cold code is 374,795 / 383,191 bytes; worst warm usability is 596.6 / 648 ms.
- First preview matrix: **31/36 pass**. Battle passes 18/18; run has five landscape loading failures, including 7,261 ms cold and 2,615.8 ms warm. All five HTML navigation durations alone exceed the respective total loading budget.
- One complete preview recheck: **32/36 pass**. Battle retains two cold and one warm failure; run retains a desktop warm failure at 865.2 ms. The three failing battle HTML requests alone exceed the total loading budget. The run failure includes 217.5 ms HTML plus 647.7 ms from navigation completion to usable controls; it remains a failure of the full 750 ms budget.

Every raw capture has an adjacent `-gates.json` in [the receipt directory](issue-127-performance-budgets/review-repair/). No sample or failed attempt was replaced. The second preview matrix followed observed recovery in a separate diagnostic; its subsequent failures are retained too. There are no further retries to seek a pass.

[Preview verification](issue-127-performance-budgets/review-repair/pr137-preview-verification.json) binds [immutable preview f2ba4504](https://f2ba4504.tactics-guru-v2.pages.dev/) to all 13 clean local code files and immutable headers. HTML and fixed image/audio policy remains unchanged; every warm preview JS/CSS resource transfers zero bytes. [The build inventory](issue-127-performance-budgets/review-repair/pr137-build-inventory.json) preserves all output hashes.

[Separate navigation diagnostic](issue-127-performance-budgets/review-repair/pr137-navigation-diagnostic.json) captures both untouched `74088a4` and repaired `6e615dc`. The untouched source also failed cold loading at 3,893.1 ms, including 2,275.6 ms DNS and 2,905.7 ms to HTML completion. Later candidate diagnostic samples returned to ordinary timing. This locates a real pre-application delivery delay and does **not** prove its upstream cause, fix it, or exempt any sample. The remaining smaller warm failure is likewise not attributed to an application cause without evidence.

## Current handoff and Git

The review repair is complete; deployed performance acceptance is not. **Keep #127 open**, and leave OpenSpec tasks **6.3 and 8.2** open. RS.1 records the completed validation and its actual outcome; `repair-run-save-recovery` is complete. The next performance action is to investigate the observed HTML/DNS/response delay and the remaining warm budget on the approved delivery path, preserving these receipts. Do not change budgets, hide navigation time, replace failed samples, or infer a causal application fix. Any hosting/production change remains separately authorized. Parent #57/#64/#81 retain their independent acceptance.

Existing branches are preserved through forward merges; #131's focused repair was cherry-picked into #132 without its guide. Main remains `a009a3e`. A merge-tree check confirms combining #131 with the final runtime is conflict-free and adds only its five guide/reference files. Land #129, #130, then #132-#138 in dependency order, retargeting each descendant to main once its parent lands; #131 can land independently. Merge commits preserve the verified ancestry. No release tag or history rewrite is needed, and no PR merge or production activation was performed.

Exact test/capture commands and driver sources are archived beside the receipts. Restore them under `tmp/review/` to use their recorded relative imports. Node CLIs were used directly because Windows npm was not on PATH; OpenSpec and Linux WebKit ran through WSL. Strict OpenSpec, document links, evidence hashes, whitespace, published head and branch-parent checks are verified at publication. Hosted CI was not a gate.
