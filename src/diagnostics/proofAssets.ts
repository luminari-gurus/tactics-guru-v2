import { TERRAIN_MATERIALS } from '../terrain/materials';
import { BOARD_SIZE } from './boardFixture';
// Ground textures and separate props; provenance: docs/art/terrain-textures.md and docs/qa/issue-16-assets.md.
export const PROOF_IMAGES = [
  ...TERRAIN_MATERIALS.map(material => ({ kind: 'image' as const, ...material })),
  { kind: 'image', key: 'tree', url: '/proof/tree-grass-v1.png' },
  { kind: 'image', key: 'fighter', url: '/proof/fighter.png' },
  { kind: 'image', key: 'fighter-portrait', url: '/proof/fighter-portrait.png' },
] as const;
// Generated unlock tone (issue #19, docs/qa/issue-19-lifecycle.md):
// ffmpeg 8.1.1, 880 Hz sine, 150 ms, 10 ms fades, mono 44.1 kHz, bitexact, no metadata.
//   mp3: libmp3lame 64 kb/s, 1,462 bytes, sha256 0af0c3a2d1ef4eb91cce55ab6b4a9668b74274741e5c20cbd2e24b4d096d31ec
//   ogg: libvorbis q3,         3,768 bytes, sha256 e57491c81c51e2a1f81fad699be7cbcc5916866cf48a1b1075aebe9a6956668d
// Only the MP3 is played. The OGG is a decode-only probe for the iOS codec question (restart plan D1).
export const UNLOCK_TONE_KEY = 'unlock-tone';
export const UNLOCK_TONE_PROBE_KEY = 'unlock-tone-ogg';
export const PROOF_AUDIO = [
  { kind: 'audio', key: UNLOCK_TONE_KEY, url: '/proof/unlock-tone.mp3', format: 'mp3' },
  { kind: 'audio', key: UNLOCK_TONE_PROBE_KEY, url: '/proof/unlock-tone.ogg', format: 'ogg' },
] as const;
export const PROOF_ASSETS = [...PROOF_IMAGES, ...PROOF_AUDIO] as const;
/** Per-file XHR timeout for the audio pass: a stalled request becomes a load error instead of holding the control at Loading. */
export const AUDIO_LOAD_TIMEOUT_MS = 5000;
export type ProofAsset = (typeof PROOF_ASSETS)[number];
export const PROOF_ART = {
  // Fresh square material: the renderer supplies all isometric geometry.
  grass: { horizontalBleed: 1 },
  tree: { width: 80, height: 80 * 1276 / 1233, originY: 1070 / 1276 },
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
