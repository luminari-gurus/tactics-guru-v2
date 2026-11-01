# Tasks

## 1. Evidence and cause

- [x] 1.1 Recover the exact failed-run artifact and relevant report/trace/screenshots; verify source identities and artifact hashes, and record findings plus reproduction commands in docs/qa/issue-263/README.md and plan.md.
- [x] 1.2 Capture bounded pre-navigation startup evidence and establish a causal failure witness on the exact affected source, using literal-base comparison where attribution is needed; retain failures and unresolved hypotheses in QA/design/plan.
- [x] 1.3 Publish the bounded startup-diagnostic fixture as an independently reviewable chunk; verify private-data exclusion, event caps, unchanged selection and affected real browser cases, and keep #263 open for the causal repair and complete acceptance.

## 2. Repair and focused qualification

- [x] 2.1 Fix the evidenced owning cause and add the causal regression to existing test owners; verify failure before and success after the repair without timeout increases, automatic retries, dropped profiles or save/state changes, updating design and owning documentation.
- [ ] 2.2 Verify all stair inputs on desktop/portrait/landscape WebKit, saved continuation/recovery and affected shared route/lifecycle consumers; retain exact source/build/test identities, original failures and results in QA and the current handoff, then commit/push/open a focused reviewable PR when this chunk is ready.

## 3. Complete integration acceptance

- [ ] 3.1 Qualify the final integration candidate with the complete full-verification inventory, including passing WebKit exploration without post-reload boot timeouts on all three profiles and any affected extended journeys; audit both #263 criteria against source-bound evidence and keep incomplete/failed runs explicit.
- [ ] 3.2 Finish the current-session handoff and focused PR descriptions, verify clean Git status, remote parity and issue links, and leave completed work ready for review without merging, deploying or creating an unrequested release tag.
- [ ] 3.3 Repair the independently found full-verification dev-selector omission in a separate focused PR: preserve all existing coverage, add exactly the three existing direct map-disposer profile cases, execute the six affected dev cases and verification contracts, and retain source-bound comparison evidence without restarting unchanged #263 coverage.
