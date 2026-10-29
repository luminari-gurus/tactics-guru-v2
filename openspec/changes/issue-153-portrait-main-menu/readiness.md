# Backlog readiness and selection

Audit date: 2026-10-28 (America/New_York). Repository `luminari-gurus/tactics-guru-v2`; authenticated caller `dubstylee`; default `main` inspected/fetched at `7cea1e9071c922b8a27cefe105d2fe069bc82a56`.

Read the entire paginated open REST backlog: 35 entries, comprising 30 issues and five PRs. Read all issue comments and blocked-by relationships with pagination, closed issue/merged PR history, eight remote branches, and current relevant code/specs. Open PRs: #12, #237, #246, #251, #252. The only native blocked-by relationship in this scan was #155 → closed #154; body-level prerequisites still apply. Parent epic references were not treated as blockers. Existing chats and branch work were checked to avoid duplicate pickup.

No readiness label changed. Unlabeled issues lacked evidence for a new independent implementation promotion, were umbrella/integration trackers, or had ongoing ownership. Existing labels/assignees were preserved. The narrower review below does not assert a global issue is completed simply because some implementation merged.

| Open issue(s) | Readiness disposition |
| --- | --- |
| #85 | Existing assigned release/operator tracker; no ready label, outstanding authenticated operations and acceptance outside new feature scope. |
| #128 | Existing assigned analytics tracker; PR #151 delivered code, remaining collection/account decisions are not a new ready implementation. |
| #153 | Exact ready label, unassigned at recheck, concrete verifiable menu criteria, no native/actual gameplay prerequisite and no active matching branch/PR. Selected. |
| #155 | Assigned and actively covered by PR #246 / `work/issue-155-overworld-enemy-movement`; excluded. |
| #161 | Assigned incremental effect foundation; Guarded/Fighter/Ranger/Mage slices merged but typed save/damage/immunity/modifier/stack consumers remain. Its criteria call for consumer-driven slices, not speculative standalone completion. |
| #162 | Assigned picker tracker with implemented foundation and recently merged hero consumers. Remaining acceptance reconciliation is not a clearly distinct new feature; retain ownership and ready label without selecting duplicate work. |
| #166 | Assigned to another person; active branches and PRs #251/#252. Do not relabel or claim. |
| #167, #168, #171, #173 | Relevant #159/#160 foundations merged, but #161 remains open with substantive required effect/movement/modifier contracts. No complete readiness evidence for each requested contract; leave unchanged. Basic push may precede hazard content, but this does not establish its entire effect prerequisite. |
| #169 | Requires typed damage/immunity plus Graveyard content; #161/#170 still open. |
| #170 | Content epic requires independently bounded biome-pack issues and explicit roster/art decisions; do not promote a bulk import. |
| #172 | Existing ready independent consumable/revival slice; coordinates rather than waits on every future loot/ability addition. Less downstream enabling value than the shared menu. |
| #174 | Foundation identities/progression merged, but coin/score purpose, selected effect slices and functioning downstream consumers remain unresolved. |
| #175 | #158 exploration merged; #174 reward/unlock/currency contract unfinished. |
| #176 | Existing ready label permits authored-run records first; no need to treat the entire dungeon epic as blocking. #153 provides its shared menu destination. |
| #177 | Existing ready label and completed #142 foundation; future effects/hazards need coordination. Independent tactical planning has less evidenced downstream enabling reach. |
| #178 | Explicit unresolved accept/defer usability decision and rotation semantics; retain without promotion. |
| #179 | Existing ready independent export slice; no hard evidenced downstream blocker unblocked by it. |
| #180 | Explicit #153 Settings destination prerequisite outstanding, plus asset/selection policy choices. |
| #181 | Existing ready convenience presentation slice; coordinates with #153 Settings and hero ability work; low priority. |
| #182 | Unresolved whether developer authoring/practice is wanted and access/route scope; retain without promotion. |
| #183 | Existing ready docs-only reconciliation, no gameplay prerequisite; fewer direct downstream implementation dependencies. |
| #184 | Existing ready generator profiles; can precede gameplay integration, lower dependency leverage. |
| #185 | Explicit not-ready product/rules mapping and level/formula decisions remain, despite #160 completion. |
| #199 | Performance epic; child checklist contains historical states. Measurement/capacity acceptance remains; no independent implementation slice selected. |
| #200 | Existing assigned baseline acceptance/capture tracker; body explicitly says not an unclaimed implementation task. |
| #208 | Phase A merged; body explicitly defers Phase B pending another isolated runner. One host is not parallel capacity. |
| #219 | Existing assigned integration tracker; cleanup code/qualification delivered through PR #222/#209 history. No new ready implementation scope. |

## Selection rationale

[Issue #153](https://github.com/luminari-gurus/tactics-guru-v2/issues/153) supplies the Settings destination explicitly required by [#180](https://github.com/luminari-gurus/tactics-guru-v2/issues/180), the requested shared menu entry for [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176), and Settings coordination for [#181](https://github.com/luminari-gurus/tactics-guru-v2/issues/181). These links establish enabling value without claiming those issues become immediately ready. #153 is also the oldest remaining unassigned eligible ready feature. Higher-priority combat foundations are either incremental owned trackers or active work; the evidence does not justify taking over another contributor's work.

Immediately before claim, re-read #153 body/state/labels/assignees, native dependencies and current open PRs. It remained open/unassigned with exact `ready for work` label. Assignment to `dubstylee` was applied and read back. Created isolated branch `work/issue-153-portrait-main-menu` from the current fetched main and published it immediately before drafting the plan. Remote readback confirmed base SHA `7cea1e9`. Original checkout on `feat/195-dungeon-compass` was preserved.

The host worktree API returned `Not a git repository` for this chat's parent-directory context. Used a conventional isolated worktree at `../issue-153-main-menu` instead. It is not claimed as a host-managed worktree attachment.

Physical availability: caller checkout has no `.env`; availability defaults to `none`, not the example file's value. Required physical platforms: none. AGENTS.md accepts Playwright device emulation.

Planning discovered an external asset limitation: supplied title URL returns HTTP 403. The exact original image or a renewed link is required before artwork completion. No substitution, application edit, runtime test, deployment, or implementation approval is claimed.
