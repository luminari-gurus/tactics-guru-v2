import type { CellPosition, ContentCatalog } from '../content/types';
import { previewCommand, readBattleState } from './battle';
import { MOVEMENT_DIRECTIONS } from './constants';
import type { BattleState, Command, CommandResult, Rejection } from './types';

type ReachableCell = { readonly cell: CellPosition; readonly cost: number };
type Route = ReachableCell & { readonly path: readonly CellPosition[] };
const key = (cell: CellPosition): string => `${cell.x},${cell.y}`;
const compare = (a: ReachableCell, b: ReachableCell): number => a.cost - b.cost || a.cell.y - b.cell.y || a.cell.x - b.cell.x;
/** Occupancy is derived from the current validated snapshot, never cached separately. */
function search(state: BattleState, unitId: number, catalog: ContentCatalog, origin?: CellPosition): Map<string, Route> {
  const unit = state.units.find(u => u.id === unitId)!;
  const map = catalog.maps[state.mapId];
  const stats = unit.side === 'player' ? catalog.heroes[unit.defId].stats : catalog.enemies[unit.defId].stats;
  const tiles = new Map(map.cells.map(c => [key(c), c]));
  const occupied = new Set(state.units.filter(u => u.hp > 0 && u.id !== unitId).map(u => key(u.cell)));
  const startCell = origin ?? unit.cell;
  const start = { cell: { ...startCell }, cost: 0, path: [{ ...startCell }] };
  const routes = new Map<string, Route>([[key(start.cell), start]]);
  const frontier: Route[] = [start];
  while (frontier.length) {
    frontier.sort(compare);
    const current = frontier.shift()!;
    if (routes.get(key(current.cell)) !== current) continue;
    const from = tiles.get(key(current.cell))!;
    for (const direction of MOVEMENT_DIRECTIONS) {
      const cell = { x: current.cell.x + direction.x, y: current.cell.y + direction.y };
      const tile = tiles.get(key(cell));
      const occupiedCell = occupied.has(key(cell));
      if (!tile || cell.x < 0 || cell.y < 0 || cell.x >= map.width || cell.y >= map.height || (occupiedCell && !origin)) continue;
      const terrain = catalog.terrains[tile.terrainId];
      const uphill = Math.max(0, tile.elevation - from.elevation);
      if (!terrain.walkable || uphill > stats.jump) continue;
      const cost = current.cost + terrain.moveCost + uphill;
      if (cost > stats.move || cost >= (routes.get(key(cell))?.cost ?? Infinity)) continue;
      const route = { cell, cost, path: [...current.path, cell] };
      routes.set(key(cell), route);
      // A hypothetical range includes occupied endpoints, but never paths through units.
      if (!occupiedCell) frontier.push(route);
    }
  }
  return routes;
}
/** Optional hypothetical origins include occupied endpoints for planning, without moving the actor or traversing units. */
export function previewMovement(state: unknown, unitId: number, catalog: ContentCatalog, origin?: CellPosition): { readonly ok: true; readonly cells: readonly ReachableCell[] } | Rejection {
  const intent = previewCommand(state, { type: 'endTurn', unitId }, catalog);
  if (!intent.ok) return intent;
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  if (checked.state.units.find(u => u.id === unitId)!.hasMoved) return { ok: false, reason: 'alreadyMoved' };
  if (origin) {
    const map = catalog.maps[checked.state.mapId];
    if (!Number.isInteger(origin.x) || !Number.isInteger(origin.y) || origin.x < 0 || origin.y < 0 || origin.x >= map.width || origin.y >= map.height)
      return { ok: false, reason: 'outOfBounds' };
    const tile = map.cells.find(c => c.x === origin.x && c.y === origin.y)!;
    if (!catalog.terrains[tile.terrainId].walkable) return { ok: false, reason: 'notWalkable' };
    if (checked.state.units.some(u => u.hp > 0 && u.id !== unitId && u.cell.x === origin.x && u.cell.y === origin.y))
      return { ok: false, reason: 'occupied' };
  }
  return { ok: true, cells: [...search(checked.state, unitId, catalog, origin).values()].sort(compare).map(({ cell, cost }) => ({ cell, cost })) };
}
export function previewMove(state: unknown, input: unknown, catalog: ContentCatalog): { readonly ok: true; readonly command: Extract<Command, {type: 'move'}>; readonly path: readonly CellPosition[]; readonly cost: number } | Rejection {
  const intent = previewCommand(state, input, catalog);
  if (!intent.ok) return intent;
  if (intent.command.type !== 'move') return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state; const command = intent.command;
  const unit = snapshot.units.find(u => u.id === command.unitId)!;
  if (unit.hasMoved) return { ok: false, reason: 'alreadyMoved' };
  const map = catalog.maps[snapshot.mapId]; const to = command.to;
  if (to.x >= map.width || to.y >= map.height) return { ok: false, reason: 'outOfBounds' };
  if (key(to) === key(unit.cell)) return { ok: false, reason: 'sameCell' };
  const tile = map.cells.find(c => key(c) === key(to));
  if (!tile || !catalog.terrains[tile.terrainId].walkable) return { ok: false, reason: 'notWalkable' };
  if (snapshot.units.some(u => u.hp > 0 && u.id !== unit.id && key(u.cell) === key(to))) return { ok: false, reason: 'occupied' };
  const route = search(snapshot, unit.id, catalog).get(key(to));
  if (!route) return { ok: false, reason: 'unreachable' };
  return { ok: true, command, path: route.path, cost: route.cost };
}
/** Resolve a move as one fresh snapshot plus its path event; no RNG draws. */
export function moveUnit(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const preview = previewMove(state, input, catalog); if (!preview.ok) return preview;
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state;
  return { ok: true, state: { ...snapshot, commandCount: snapshot.commandCount + 1,
    units: snapshot.units.map(u => u.id === preview.command.unitId ? { ...u, cell: { ...preview.command.to }, hasMoved: true } : u) },
    events: [{ type: 'moved', unitId: preview.command.unitId, path: preview.path }] };
}
