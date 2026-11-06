import { describe, expect, it } from 'vitest';
import { freshDungeon, type DungeonState } from '../../src/domain/dungeon';
import { dungeonEncounterStatus } from '../../src/ui/dungeonMap';
import { movableExploration } from '../../src/domain/exploration';

const fresh = freshDungeon('status-view', 1), floor = fresh.floors[0];
function modern(phase: DungeonState['phase'], active: number | null, cleared: number[]): DungeonState {
  return {...fresh,phase,floors:[{...floor,completed:cleared.length,exploration:{
    ...movableExploration(floor.exploration,floor.descriptor.seed,0,'ready'),active,cleared}}]};
}
const statuses = (state: DungeonState) => [0,1,2].map(slot=>dungeonEncounterStatus(state,slot));
describe('encounter status ownership',()=>{
  it('keeps an out-of-order reward on its cleared active slot until claimed',()=>{
    expect(statuses(modern('reward',2,[2]))).toEqual(['Available','Available','Reward pending']);
    expect(statuses(modern('ready',null,[2]))).toEqual(['Available','Available','Cleared']);
  });
  it('labels only the active battle and preserves cleared slots on defeat',()=>{
    expect(statuses(modern('battle',0,[2]))).toEqual(['In battle','Available','Cleared']);
    expect(statuses(modern('defeat',null,[2]))).toEqual(['Unavailable after defeat','Unavailable after defeat','Cleared']);
  });
  it('retains sequential legacy exploration battle, reward and defeat labels',()=>{
    const state={...fresh,floors:[{...floor,completed:1}]};
    expect(statuses({...state,phase:'battle'})).toEqual(['Cleared','In battle','Available']);
    expect(statuses({...state,phase:'reward'})).toEqual(['Reward pending','Available','Available']);
    expect(statuses({...state,phase:'defeat'})).toEqual(['Cleared','Unavailable after defeat','Unavailable after defeat']);
  });
});
