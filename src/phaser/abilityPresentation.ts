import type { BattleEvent } from '../domain/types';

export type SignatureKind = 'guarded_strike' | 'high_shot' | 'magic_missile';
export interface CombatFeedback {
  unitId: number;
  text: string;
  kind: 'result' | 'defeat' | 'guard';
}

/** Read accepted events only. No rolls, rules, HP inference or snapshot mutation. */
export function abilityPresentation(events: readonly BattleEvent[]) {
  const used = events.find(e => e.type === 'abilityUsed');
  const attack = events.find(e => e.type === 'attackRolled');
  const missile = events.find(e => e.type === 'missileRolled');
  const kind: SignatureKind | null = used?.abilityId === 'ability:guarded_strike' ? 'guarded_strike'
    : used?.abilityId === 'ability:high_shot' ? 'high_shot'
    : used?.abilityId === 'ability:magic_missile' ? 'magic_missile' : null;
  const resolved = attack ?? missile;
  const signature = kind && used && resolved ? {
    kind, actorId: used.unitId, targetId: resolved.targetId,
    missed: attack?.result === 'miss',
    guarded: events.some(e => e.type === 'guarded' && e.unitId === used.unitId),
  } : null;
  const feedback: CombatFeedback[] = [];
  if (attack) {
    const damage = events.find((e): e is Extract<BattleEvent,{type:'damaged'}> => e.type === 'damaged' && e.unitId === attack.targetId);
    const result = attack.result === 'critical' ? 'Critical' : attack.result === 'hit' ? 'Hit' : 'Miss';
    feedback.push({unitId: attack.targetId, kind: 'result', text: result + (damage ? ` · −${damage.damage}` : '')});
  }
  for (const event of events) {
    if (event.type === 'damaged' && event.unitId !== attack?.targetId)
      feedback.push({unitId: event.unitId, kind: 'result', text: `−${event.damage}`});
    if (event.type === 'defeated') feedback.push({unitId: event.unitId, kind: 'defeat', text: 'Defeated'});
    if (event.type === 'guarded') feedback.push({unitId: event.unitId, kind: 'guard', text: 'Guarded'});
    if (event.type === 'healed') feedback.push({unitId:event.unitId,kind:'result',text:`+${event.healing} HP`});
    if (event.type === 'taunted') feedback.push({unitId:event.unitId,kind:'guard',text:'Taunted'});
    if (event.type === 'marked') feedback.push({unitId:event.unitId,kind:'guard',text:'Marked'});
    if (event.type === 'pinned') feedback.push({unitId:event.unitId,kind:'guard',text:'Pinned'});
  }
  return {signature, feedback};
}
