import type { ContentCatalog } from '../content/types';
import type { BattleEvent } from '../domain/types';

export const BATTLE_CUES = {
  move: { key:'battle-move', url:'/audio/battle/move.mp3', durationMs:120 },
  miss: { key:'battle-miss', url:'/audio/battle/miss.mp3', durationMs:140 },
  hit: { key:'battle-hit', url:'/audio/battle/hit.mp3', durationMs:120 },
  critical: { key:'battle-critical', url:'/audio/battle/critical.mp3', durationMs:220 },
  magic: { key:'battle-magic', url:'/audio/battle/magic.mp3', durationMs:260 },
  'unit-defeat': { key:'battle-unit-defeat', url:'/audio/battle/unit-defeat.mp3', durationMs:240 },
  victory: { key:'battle-victory', url:'/audio/battle/victory.mp3', durationMs:420 },
  loss: { key:'battle-loss', url:'/audio/battle/loss.mp3', durationMs:420 },
} as const;
export type BattleCue = keyof typeof BATTLE_CUES;
export const MAX_BATCH_CUES = 4;

/** Read committed results only; never roll dice or retain domain data. */
export function battleCues(events: readonly BattleEvent[], catalog: ContentCatalog): BattleCue[] {
  const cues: BattleCue[] = [];
  let defeated = false, outcome: BattleCue | undefined;
  for (const event of events) {
    if (event.type === 'moved' && !cues.includes('move')) cues.push('move');
    if (event.type === 'attackRolled') cues.push(event.result);
    if (event.type === 'abilityUsed' && catalog.abilities[event.abilityId]?.kind === 'magicMissile' && !cues.includes('magic')) cues.push('magic');
    if (event.type === 'defeated') defeated = true;
    if (event.type === 'battleEnded') outcome = event.outcome === 'playerWin' ? 'victory' : 'loss';
  }
  const tail: BattleCue[] = [...(defeated ? ['unit-defeat' as const] : []), ...(outcome ? [outcome] : [])];
  return [...cues.slice(0, MAX_BATCH_CUES - tail.length), ...tail];
}
