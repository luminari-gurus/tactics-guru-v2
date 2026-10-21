# Design

## Context

See [the continuation plan](../../../docs/ongoing-projects/plan.md) for the audited source and exact accepted policy. DungeonSession already supplies one catalog to BattleSession, and storage already persists candidates before publishing movement/travel. Prior format identities must remain byte compatible.

## Goals / Non-Goals

**Goals:** Keep selection/projection pure, record durable facts once per floor, and preserve old dungeon difficulty. Implement every acceptance area from #159.

**Non-Goals:** New biome packs, enemies, rewards, progression systems, art, geometry, input redesign or generalized registries. No changes to the standalone or short-run encounter catalogs.

## Decisions

- Two modules separate trusted content/unknown-data admission from pure selection/stat projection. Reuse battlefield source/roster and reachability validation for every admitted pairing and all survivor subsets. Pools and compositions use stable sorted IDs. A guardian definition requires full-battle victory.
- Admission exposed nine unreachable height-2 tiles in original Forest Ruins. Add one dungeon-only height-1 stone step at (4,2), preserving all other cells and rosters and leaving existing modes unchanged. Do not relax reachability or discard an intended map to hide the failure.
- Use `dungeon-encounters-v1`, independent purpose hashes for biome/kind/map/composition, and existing dungeon floor/battle/reward seeds. First biome is seeded; later floors alternate Forest/Desert. Slot 0 is normal, slot 1 equally selects elite/vault, slot 2 is boss. Persist pool/map/composition/boss references, roster/source and battlefield hash; reload validates facts without rerunning random selection.
- `enemy-depth-v1`: round baseline stat times `(depth+9)/10`, clamp, then vault-only round times `6/5`, clamp. Positive half-up rounding; signed accuracy uses the same nearest/ties-toward-positive-infinity convention. Saturate before multiplication; zero remains zero. Project immutable baseline enemies once, then existing hero equipment. No elite multiplier or attack/movement/resource changes.
- Format 3 includes an encounter policy and floor selections. Keep exact format-1/2 identities and original validation before adding legacy fixed/unscaled selections. Legacy policy also governs unvisited floors. Do not fork controllers/storage. Inspection does not rewrite bytes; accepted existing transitions/recovery write format 3.
- Repeated snapshot validation initially repeated graph work on every saved step (about 95 ms in a spatial transition test). A bounded 128-entry cache remembers only verified full selection/seed/battlefield facts. Changed facts cannot hit an old key; no geometry, progress or selection draw is cached. Durable history is never evicted.
- Reuse Forest/Desert map styling and Simple fallback, with Grassland for legacy. UI reads saved facts. Existing DungeonSession callback ownership remains the completion authority. Receipts retain actual projected context.
- Publish the pure policy first, then dependent persistence/application work, with each PR's scope and remaining work explicit in plan.md. No release tag is warranted by review-only delivery.

## Risks / Trade-offs

- Difficulty grows while hero progression is outside scope → legal route tests assess the initial policy; do not claim high-depth balance from arithmetic tests.
- Format 3 cannot load on older builds → document export/backup and downgrade limits; never delete invalid data.
- Descriptor growth and near-budget dungeon code transfer → measure existing budgets, retain all floor history and fail atomically at resource limits.
- Authored pools have one compatible roster per map → sufficient independence without inventing content.

## Migration Plan

Ship through focused review PRs. Existing storage keys and recovery protocol remain unchanged. Accepted old payloads normalize in memory; durable originals remain until an explicit accepted write. Export old bytes before downgrade. No deployment or merge is authorized by this task.
