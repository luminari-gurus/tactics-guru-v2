# Backlog review — 2026-10-15

Repository: [luminari-gurus/tactics-guru-v2](https://github.com/luminari-gurus/tactics-guru-v2). Caller: `moshehbenavraham`, resolved from authenticated account data. Default branch: `main` at `4e601480400a241a2c08cb88a41442e55a5385b7`.

## Coverage and evidence

Read all 13 open repository issues, including bodies, labels and assignees; all issue comments; native blocked-by/blocking/subissue/linked-branch relationships; the one open PR; and all 58 remote branches before this task branch is created. Pagination was exhausted; the GraphQL issue connection reported totalCount 13 and hasNextPage false. Read the closed #108 design item, merged #112/#113 PRs, review/comment history and the design/code on current main.

GitHub Projects queries failed with INSUFFICIENT_SCOPES because the repository credential lacks `read:project`. Private project-only drafts are outside this coverage; no claim of complete private-board enumeration is made. Native `gh` was absent, so authenticated repository REST/GraphQL access was used, with mutation readbacks. Credentials were not printed or copied into artifacts.

## Complete issue disposition

- [#111](https://github.com/luminari-gurus/tactics-guru-v2/issues/111): **selected and promoted**. Previously blocked only on explicit #108 design acceptance; the owner answered "Accept the design and plan #111" in this chat on 2026-10-15. #108 is closed and #112/#113 are merged on current main. No open blocker, existing linked branch, assignee or active implementation PR covered #111 before claim. Its seven criteria are concrete and it explicitly excludes physical certification. Added only `ready for work`, preserved `enhancement`, recorded acceptance and assigned `moshehbenavraham`.
- [#80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80): ready but assigned to `dubstylee`, with active `work/issue-80-run-progression`. It is the direct prerequisite of #81 and has downstream value, but is unavailable to this claim. Preserve its work and monitor shared-file drift only when #111 implementation is authorized.
- [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64): globally ready; ineligible locally because acceptance requires physical iPhone Safari/Chrome as well as Android/desktop. Local capability is Android only. Label unchanged.
- [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66): globally ready; requires physical iPhone Safari. Its existing branch is a historical withdrawn claim, as the issue comment explicitly records. Local Android capability remains insufficient. Label unchanged.
- [#74](https://github.com/luminari-gurus/tactics-guru-v2/issues/74): persistence implementation prerequisites are merged, but its own physical iOS/Android lifecycle and #57 acceptance requirements remain. The newer #57 disposition explicitly releases #80; it does not waive #74's hardware criteria. Do not infer a blanket readiness promotion from that narrow disposition.
- [#81](https://github.com/luminari-gurus/tactics-guru-v2/issues/81): blocked by incomplete #80 and persistence acceptance under #58; also requires physical iOS/Android certification. Merged reward/item work does not complete run integration or certification.
- [#84](https://github.com/luminari-gurus/tactics-guru-v2/issues/84): read-only investigation can proceed, but final acceptance requires owner choices of production target, path, protection and ownership. Those product/operations decisions remain unresolved; no ready label added.
- [#85](https://github.com/luminari-gurus/tactics-guru-v2/issues/85): requires accepted #84, applicable readiness and explicit target/build/operation authorization. None is supplied by this planning request.
- [#83](https://github.com/luminari-gurus/tactics-guru-v2/issues/83): release-planning epic with #84/#85 children; retain its decision and activation gates, without claiming or closing the parent.
- [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57): owner accepted the stated deployed baseline for #80 with known test/measurement limits retained. The epic stays open and #64/#66 remain separate follow-ups. This is not a fresh all-tests-pass or hardware certification claim.
- [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58): save/resume epic; #69/#72/#73 are completed, #74 remains open. The epic explicitly directs use of scoped children and is not a ready implementation item.
- [#59](https://github.com/luminari-gurus/tactics-guru-v2/issues/59): three-encounter epic; #75/#76 are completed, #80 is assigned/in progress and #81 awaits integration/acceptance. Parent references are organizational; actual incomplete child outcomes determine its status.
- [#60](https://github.com/luminari-gurus/tactics-guru-v2/issues/60): reward/item epic; #77/#78/#79 are completed, but complete-run integration/acceptance remains downstream. Do not duplicate those implementations or close the epic by proxy.

## Active work and selection rationale

[PR #12](https://github.com/luminari-gurus/tactics-guru-v2/pull/12), the only open PR at selection, is an unrelated restricted-SSH release proposal with explicit merge/install/activation gates. It does not block #111 and is not selected for modification.

No evidenced downstream ticket directly depends on #111, so no dependency-unblocking count is invented. #80 has stronger direct downstream value but is already owned. After the owner's design acceptance, #111 is the available scoped implementation item with merged prerequisites and verifiable runtime acceptance. The existing ready device tasks cannot be completed with the caller's available platforms, while the other unassigned items retain substantive gates.

Available physical platforms: **Android** from the caller checkout's `CAN_TEST_MOBILE=android`. Required physical platforms for #111: **none**. The setting was carried as capability metadata only; no `.env` was copied and no device testing has been performed.

Claim/readiness/acceptance receipt: [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/111#issuecomment-6196912979). Branch: [work/issue-111-responsive-battle-controls](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-111-responsive-battle-controls). [Implementation plan](../plan.md). No other issue was relabelled, assigned, commented on or closed by this readiness pass.
