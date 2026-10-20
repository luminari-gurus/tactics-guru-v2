import type { ContentCatalog } from '../../src/content/types';
import type { BattleState } from '../../src/domain/types';
import { BattleSession } from '../../src/app/BattleSession';
import { playerDecision } from './playerPolicy';

/** Reach the boundary using accepted domain commands. Browser coverage enacts the final cast itself. */
export function guardedBoundary(catalog: ContentCatalog, initial: BattleState) {
  const session = new BattleSession(catalog, initial, initial.seed);
  for (let i = 0; i < 300 && session.state.outcome === 'ongoing'; i++) {
    if (session.phase === 'enemy') {
      const step = session.nextEnemy(); if (!step) throw Error('Enemy stalled');
      session.finishPresentation(step.token); continue;
    }
    const command = playerDecision(session.state, catalog);
    if (command.type === 'useAbility' && command.abilityId === 'ability:guarded_strike')
      return { before: session.state, command, commands: session.continuation!.commands };
    if (!session.prepare(command).ok) throw Error('Player policy rejected');
    const step = session.confirm(); if (!step) throw Error('Missing command'); session.finishPresentation(step.token);
  }
  throw Error('No legal Guarded boundary');
}
