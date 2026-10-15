# Design

## Context

See proposal.md for issue, base and branch identity. `RunItems` and `applyItemCommand` already validate ownership and run/item revisions; `projectItemCatalog` returns derived combat catalogs. `RunSaveExtension` is explicitly a placeholder. The existing codec/storage/controller only accept a single BattleState. `BattleDialogs` owns native modal capture. `startBattleApp` currently starts the existing single battle; no live run orchestrator exists.

## Goals / Non-Goals

**Goals:** deliver reusable item UI/session and the single run persistence contract consumed by #80, with real-input browser evidence for reward and party preparation boundaries.

**Non-Goals:** complete run battle orchestration, legal three-battle playthrough, main battle HUD redesign (#111), balance changes, new item mechanics, deployment, physical certification or replacing single-battle save behavior. #80 wires these components into battle progression; #81 owns full-run/hardware acceptance. Fixtures may load explicit boundary states but cannot claim legal full-run completion.

## Decisions

1. **Small authoritative controller.** Add `RunItemSession` containing validated RunItems and optional active BattleState. Dispatch via existing pure commands, obtaining activeBattle context from the controller rather than DOM inputs. Review captures revisions; revalidate on confirmation. Commit accepted mutations once, then save and render. Storage failure reports unsaved status without rolling back successful gameplay. Avoid a general event bus or duplicate domain rules.
2. **One run snapshot contract.** Add `runSaveEnvelope.ts` using existing canonical hashing and exact-shape validation conventions. Payload is `{items: RunItems, activeBattle: BattleState|null}`; derive run metadata from items.run. Use a distinct run kind/format v1, rules/RNG identity and base encounter plus item/reward catalog identity. Validate before hashing arbitrary nested input. Start with a 32,768-code-unit bound; reject overflow and verify actual largest supported fixture fits. Preserve the battle codec and old keys. Replace the placeholder RunSaveExtension with this authoritative shape and document #80 consumption.
3. **Cross-field validation.** With no active battle, battle phase means encounter entry and party preparation is allowed by the existing command context. Reward/terminal phases require null activeBattle. Active battle must match the run's encounter map, derived seed, roster and projected content; validate its snapshot against a freshly projected catalog. Keep run party as encounter-entry HP rather than equating it to damaged live battle HP. Validate pending offers using existing readers. Restoration never reprojects onto already modified base stats.
4. **Guarded storage adapter.** Add run primary/backup keys and reuse the battle adapter's proven access, compare-before-remove, invalid-slot preservation and explicit recovery semantics. Prefer a small dedicated adapter using the codec over a broad storage-framework refactor. Save each accepted item boundary. Export damaged bytes, explicit reset and backup continuation remain reviewable operations; never overwrite incompatible data automatically.
5. **Reusable UI and narrow fixture.** Add `runItems.ts` with catalog-generated reward choices, party HP/eligible target selection, quantities, charm assignment, projected bonuses and visible failure/status text. Native buttons/selects and the existing modal owner provide shared mouse/touch/keyboard paths. Keep one modal owner per mounted flow and dispose listeners on replacement. Scoped CSS supports 412x915, 915x412 and 320x568, safe areas and 44px controls. Use a dedicated Vite browser fixture/config mounting production controller/UI/storage, avoiding a competing public run route before #80. Exercise board-input isolation with the production board fixture where relevant. Do not import active PR #112/#113 branches or reproduce unrelated HUD work.

## Acceptance and verification mapping

| Issue criterion | Implementation and evidence |
| --- | --- |
| Catalog labels, claim/use/equip/unequip and responsive input | Production UI/controller; browser mouse, touch and keyboard operations, both orientations, narrow viewport and focus/modal capture assertions |
| Duplicate/stale/reload atomicity and visible rejection | Revision-bound intents; unit/session and real-input double activation, stale dialog, cancel and rejected-target fixtures |
| Bounded save inventory/slots/offer and safe incompatibility | Codec malformed/oversized/version/digest/identity/cross-field tests; storage failure injection and exact primary/backup byte assertions |
| Pending and claimed reload, identical stats/RNG/next encounter | Round-trip/session fixtures and browser reload before/after claim/use/equip, nonaccumulating projection and next-command comparison |
| Actual inputs and honest acceptance boundaries | Dedicated fixture drives production components via DOM inputs; document seeded fixture entry separately from #80/#81 full-run/physical evidence |

Expected tests: unit runSaveEnvelope, runStorage, RunItemSession; browser run-items spec and fixture/config. Existing battle-loop/persistence/audio/animation tests remain regressions. Run focused tests, full configured unit/content/browser suites including encounter posttest, both typechecks, production build, strict OpenSpec and git diff --check. Record exact revision, payload size, failures and limitations in docs/qa/issue-79.md and link #80 handoff.

## Risks / Trade-offs

- Shared save drift with #80 → this change owns the codec and documents phase/active-battle invariants for reuse.
- Existing modal focus bug in active PR #113 → avoid depending on its unmerged implementation; verify new component focus after callbacks and defer broad repair to that PR.
- Fixture-only integration → explicit delivery boundary; do not close #59/#60 or claim complete run acceptance.
- Best-effort browser storage → preserve bytes and show failures; no permanent-storage guarantee.

## Migration Plan

Additive run codec/keys; no old-save migration or automatic deletion. Existing single-battle route and keys remain valid. Reverting the feature leaves run bytes untouched. No deployment action is included.
