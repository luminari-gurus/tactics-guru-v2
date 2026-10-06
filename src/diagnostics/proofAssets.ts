import { BOARD_SIZE } from './boardFixture';
// Selected diagnostic assets only; provenance and anchors: docs/qa/issue-16-assets.md.
export const PROOF_ASSETS = [
  { key: 'grass', url: '/proof/grass.png' },
  { key: 'tree', url: '/proof/tree.png' },
  { key: 'fighter', url: '/proof/fighter.png' },
  { key: 'fighter-portrait', url: '/proof/fighter-portrait.png' },
] as const;
export const PROOF_ART = {
  grass: { width: 88, height: 121, originY: 226 / 352, crop: { x: 0, y: 170, width: 256, height: 106 } },
  tree: { width: 80, height: 110, originY: 170 / 352 },
  fighter: { width: 40, height: 50, originY: 76 / 80 },
} as const;
export const PROOF_FIXTURES = {
  'ground-behind': { hero: { x: 1, y: 0, elevation: 0 }, heroOffsetX: 28, prop: { x: 2, y: 0, elevation: 0 }, relation: 'behind' },
  'ground-front': { hero: { x: 3, y: 0, elevation: 0 }, heroOffsetX: -28, prop: { x: 2, y: 0, elevation: 0 }, relation: 'front' },
  'raised-behind': { hero: { x: 0, y: 0, elevation: 0 }, heroOffsetX: 0, prop: { x: 1, y: 1, elevation: 1 }, relation: 'behind' },
  'raised-front': { hero: { x: 2, y: 2, elevation: 2 }, heroOffsetX: 0, prop: { x: 1, y: 1, elevation: 1 }, relation: 'front' },
} as const;
export type ProofFixture = keyof typeof PROOF_FIXTURES;
// Tile columns get one slot, then art, then occupants. Elevation never changes depth.
export function proofDepth(tile: { x: number; y: number }, layer: number): number {
  return ((tile.x + tile.y) * BOARD_SIZE + tile.y) * 3 + layer;
}
