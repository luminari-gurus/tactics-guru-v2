# Design

## Context

See [proposal.md](proposal.md) for motivation and branch identity. Inspection of main `cae524e9e7a8c9b617c1259f4b7dc4591562488a` found both requested documents already tracked (PR #13 merged), while their headers still say they are outside main. `package.json` pins Vitest 5.0.3 and supplies unit/content checks; `src/app/BattleSession.ts` resolves accepted commands before presentation and exposes deterministic replay. Main has six completed OpenSpec changes, battle/domain/content modules, responsive controls and audio. No new behavior contract is needed.

GitHub evidence captured 2026-10-12: PRs #63, #67 and #71 are merged; #12 and #70 are open. The #68 evidence explicitly rejects adopting the baked prototype and retains the #67 renderer. The QA notes preserve historical failures and distinguish emulation from physical certification. Documents must summarize those dispositions, not imply every experiment shipped.

## Goals / Non-Goals

**Goals:** Give both documents the same dated current-state baseline, evidence-linked milestone status, decision register and follow-up dependency map, with historical observations clearly dated.

**Non-Goals:** Change product decisions, expand feature scope, refresh legacy sources, certify devices, reconcile all historical QA notes, implement features, alter delivery infrastructure, or import/archive legacy OpenSpec requirements.

## Decisions

### Edit the two existing documents in place

Affected implementation files: `docs/phaser4-restart-plan.md` and `docs/tech_design.phaser4.draft.md`. Keep their names, shared source numbering and legacy SHA `e9433f6b608ae6b2d95418615cce9cf17dadcf74`. Add a dated current-state section and revision notes, relabel the October 6 audit as historical, and correct present-tense scaffold/branch claims throughout the relevant sections. A new replacement document or a top-only disclaimer would leave competing sources and contradictions.

### Separate evidence, implementation and acceptance

For each milestone, cite issue/merged commit and existing QA where available. Closed #1/#2–#11 are implementation milestones; #57/#64/#66 still own readiness. Audio #62 is merged; #65 performance evidence is merged; #68 is a completed experiment with the baseline retained. Re-read current issue states and PR #70 immediately before the edits; unmerged save code is not a main capability. Record observation date and actual validation limits rather than rewriting old results as fresh passes.

### Use the existing scope and evidence to reconcile registers

Review D1–D11 and T1–T11 against the current domain/session/content/Phaser/UI code, configured checks and owner-approved decisions. Mark resolved, implemented, deferred or still open with evidence; retain missing IDs as historical numbering instead of inventing decisions. Preserve Guarded Strike −2/+2, Magic Missile and fresh new-seed restart. Keep unsettled carryover, rewards, target/path and browser support choices visible. The accepted/deferred/retired ledger describes existing scope and historical omissions; it does not newly retire a feature.

### Map the actionable roadmap without changing dependencies

P6b: #58 → #69 (PR #70 still open), #72 guarded storage → #73 integration → #74 certification, retaining #57 release gates. P7: #59 → #75 contract → #76 encounters; #60 → #77 catalog → #78 commands → #79 controls; #80 run integration and #81 certification retain their listed prerequisites. #75 blocks #76/#77/#78/#79/#80, but its unresolved owner choices are not resolved by this reconciliation. P6a: #83/#84 review and #85 separately approved activation. Use issue bodies for precise dependencies, not the arrow shorthand alone.

### Describe Pages observations and SSH proposal separately

Use repository delivery/build configuration where present, pinned QA URLs/served-build evidence and the current PR #12 handoff. Historical Access probes do not establish live protection; Pages previews do not establish approved production cutover. Preserve exact-package/operator gates and explicitly unresolved host/domain/analytics decisions. Read-only evidence review does not authorize merge, installation, uploads or account changes.

### Documentation verification

Map all six issue acceptance criteria below. Validate relative Markdown targets and internal headings in the two documents and planning artifacts; verify GitHub issue/PR/commit sources using read-only GitHub data. Private legacy references are preserved at the historical SHA; unavailable local mirrors or private links are reported, not called newly verified. Review source-number references, current-state assertions, decision-register consistency and final changed paths manually. Run strict OpenSpec validation and `git diff --check`; application tests/typecheck/build are unnecessary for this documentation-only issue unless a concrete documentation claim needs corroboration. No new tests are written.

## Acceptance mapping

| Issue criterion | Implementation | Verification |
| --- | --- | --- |
| AC1: fresh main/tracker and obsolete claims | Both headers/current-state/toolchain/OpenSpec sections; retain dated October 6 audit | Pinned SHA, live issue/PR states, package scripts, tree and historical-section comparison |
| AC2: closed milestones versus readiness | Both milestone summaries; links to #62/#65/#68 QA and #57/#64/#66 | GitHub closed/merged state plus preserved device and experimental limitations |
| AC3: P6b/P7 and registers | Roadmap + D/T tables and follow-up references in both docs | Cross-check #58–#60/#69/#72–#81, PR #70 and code/owner evidence for each changed row |
| AC4: Pages versus SSH | Delivery sections, risk tables and D9/D10 | Existing served-build evidence and current #12 boundaries; unresolved gates stated |
| AC5: ledger/provenance/approved rules | Scope ledger and authoritative approved-rule links | Legacy SHA/source numbering retained; compare signatures and restart contract to merged code/docs |
| AC6: links/consistency/scope | Both docs and task records only | Link/heading check, cross-doc review, strict OpenSpec, diff whitespace and changed-path audit |

## Readiness refresh and selection evidence

All 21 open issues were read with paginated bodies, labels and assignees; the only commented issues (#66/#69), GitHub dependency summaries, #82 blocked-by API (empty), 35 remote branches, current open PRs and merged main were inspected. #82 was re-read before promotion, labeled only `ready for work`, read back, then re-read and assigned to `dubstylee`; assignment was verified. It had no unresolved implementation dependency or active issue branch/PR.

Only #82 was promoted. #72–#74 require unmerged #69/#70 or downstream delivery. #76–#81 require missing contracts/delivery. #75 and #84 need owner decisions, so remain unchanged. #57–#60/#83 are planning epics. #85 requires release authorization and readiness. #64 requires the outstanding physical matrix and retains its current labels. #69 is assigned to another person and covered by PR #70. Existing ready #66 has a withdrawn claim and historical branch, but acceptance requires physical iPhone Safari access not available to this agent; no changed label or fix claim. #82 is the concrete independently deliverable candidate; it corrects the source documents used by the follow-up planning tickets, without claiming to satisfy their prerequisites.

## Risks / Trade-offs

- [Tracker changes during editing] → Re-read live main/issue/PR status and date the snapshot; avoid timeless completion claims.
- [Broad documents retain contradictory wording] → Review headers, current-state sections, roadmap, D/T tables, delivery, risk and OpenSpec sections together.
- [Historical evidence mistaken for current validation] → Preserve dates and explicit device/preview limits; distinguish #68 prototype from retained runtime.
- [Private/missing reference material] → Preserve historical provenance and report unverifiable references without copying legacy docs or claiming a new audit.
- [Product choices silently resolved] → Keep unanswered #75/#77/#84 choices and #57/#64/#66 gates explicit.

## Migration Plan

After explicit approval, record it in this task's proposal, update the two documents, complete verification and task checkboxes, then commit/push and open a PR against main. No deployment step exists. Review or revert the documentation commit if evidence is wrong. Do not merge or archive this change before merge.

## Approval

Caller explicitly approved plan commit `d405ac7e163339429dcdca0c498f2ba50d4ce0b2` on 2026-10-12. The refreshed main snapshot is `30331e6c2fd18d2051aab32b6159839f3c994e1b`; its only change since the branch base is merged PR #86’s workflow skill update. The two target documents and application tree are unchanged. Live #87 explicitly assigns this reconciliation its roadmap placement; record the independent prototype without implementing it or changing battle acceptance.

## Implementation verification — 2026-10-12

AC1–AC6 are satisfied by the two edited documents: matching dated main/tracker snapshots; closed implementation versus open physical gates; shared D/T registers, exact child prerequisites and scope ledgers; conditional Pages/SSH evidence and production/analytics gates; preserved approved rules and historical legacy provenance; verified links/consistency/whitespace and documentation-only PR scope. #87 was discovered in the refreshed tracker and explicitly points to #82 for roadmap reconciliation; only its independent requested scope is recorded.

Actual checks:

- `python3 /tmp/tg82-check.py`: 39 relative Markdown file/directory/anchor targets resolve; all numeric source references resolve in the shared 93-definition set; four shared tables match byte-for-byte. Historical legacy audit body, both October 6 revision bodies and original numbered source definitions are unchanged against `cae524e`. The temporary check script is outside the repository.
- `openspec validate issue-82-doc-reconciliation --strict`: passed; documentation-only `skip_specs` is accepted by the installed schema.
- `git diff --check`: passed. Changed implementation paths are only the two requested docs; other branch files are this task's approved OpenSpec records. No attribution trailers added.
- Read-only GitHub refresh: paginated all-state issues, PR #12/#70 heads/body, merged PR history, #13/#86 merge state, #66 withdrawn-claim comment, #82 assignment/state and main `30331e6`. The pinned #12 operator-runbook path exists at `de518a77` (blob `7512e10d762468da9cbd2b488686b8a8cb9ee996`). Git confirms the game/docs tree is unchanged between initial base `cae524e` and refreshed main; only PR #86 workflow guidance differs.
- Source comparison: package/compiler/runner/Vite configs; domain RNG/AI/content constants and approved signature contract; BattleSession/BattleScene, geometry/picking, content loader/public asset metadata and BattleAudio/cue definitions; retained #62/#65/#68 QA evidence. No new unit/browser tests, typecheck, build, device test or deployment capture were run for this documentation-only change.

Limitations: private legacy sources, missing `ORIGINAL/`/discovery companion and historical external documentation/SRD links retain their provenance and are not claimed freshly verified. Live Pages headers/protection/served bytes and SSH installation remain unprobed. These do not block the documentation acceptance, which explicitly preserves those gaps; #57/#64/#66/#70 and product/operator/production gates remain unresolved as stated.
