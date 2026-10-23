import { assert, expect, it } from 'vitest';
import { legalDefeatSaves } from '../helpers/runRecoveryFixtures';
import { runContext } from '../helpers/runItemFixtures';
import { replayRunBattle } from '../../src/domain/runBattle';
import { decodeRunSave, encodeRunSave } from '../../src/domain/runSaveEnvelope';
import { canonical } from '../../src/domain/contentIdentity';

it('reaches deterministic defeat and the exact preceding save through accepted commands', () => {
  const fixture = legalDefeatSaves();
  expect(legalDefeatSaves()).toEqual(fixture);
  expect(fixture.entry.run.party.every(hero => hero.hp === runContext.catalog.heroes[hero.heroId].stats.maxHp)).toBe(true);
  for (const [text, snapshot] of [[fixture.primary, fixture.ended], [fixture.backup, fixture.ongoing]] as const) {
    expect(decodeRunSave(text, runContext)).toEqual({ ok: true, state: snapshot });
    expect(encodeRunSave(snapshot, runContext)).toEqual({ ok: true, text });
  }
  expect(fixture.ended.items.run.phase).toBe('defeat');
  expect(fixture.ended.activeBattle).toBeNull();
  const replay = replayRunBattle(fixture.replay, fixture.entry, runContext);
  assert(replay.ok);
  expect(replay.state).toEqual(fixture.finalBattle);
  expect(replay.events).toEqual(fixture.events);
  const previous = replayRunBattle({ ...fixture.replay, commands: fixture.replay.commands.slice(0, -1) }, fixture.entry, runContext);
  assert(previous.ok);
  expect(canonical(previous.state)).toBe(canonical(fixture.ongoing.activeBattle));
  expect(previous.state.commandCount + 1).toBe(fixture.finalBattle.commandCount);
}, 20000);
