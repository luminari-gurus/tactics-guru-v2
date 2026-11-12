import { assert, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { RunItemSession } from '../../../src/app/RunItemSession';
import { DungeonSession } from '../../../src/app/DungeonSession';
import { freshRunSnapshot } from '../../../src/domain/runBattle';
import { freshDungeon } from '../../../src/domain/dungeon';
import { encodeRunSave } from '../../../src/domain/runSaveEnvelope';
import { encodeDungeon } from '../../../src/domain/dungeonSaveEnvelope';
import { createRunStorage } from '../../../src/persistence/runStorage';
import { createDungeonStorage } from '../../../src/persistence/dungeonStorage';
import { runContext } from '../../helpers/runItemFixtures';
import { atEncounter } from '../../helpers/dungeonFixtures';
import { playerDecision } from '../../helpers/playerPolicy';
import type { BattleSession } from '../../../src/app/BattleSession';
const directory='C:/Users/apexw/.codex/worktrees/issue-270-active-time-history/Tactics-Guru/tests/fixtures/saves/issue-270';
function memory(){const values=new Map<string,string>();return ()=>({getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}});}
function fight(battle:BattleSession){for(let i=0;i<500&&battle.state.outcome==='ongoing';i++){const step=battle.phase==='enemy'?battle.nextEnemy():(battle.prepare(playerDecision(battle.state,battle.catalog)),battle.confirm());assert(step);battle.finishPresentation(step.token);}expect(battle.state.outcome).not.toBe('ongoing');}
it('retains literal counter-only saves before the clock exists',()=>{
 expect(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()).toBe('49ad112e7539542a88c73a7e76788b33ce8402a8');
 const run=new RunItemSession(freshRunSnapshot('counter-run-v1',13,runContext,true),runContext,createRunStorage(runContext,memory()));
 run.startNew();const runBattle=run.startEncounter();assert(runBattle);fight(runBattle);
 const dungeon=new DungeonSession(atEncounter(freshDungeon('counter-dungeon-v1',13,undefined,true)),createDungeonStorage(memory()));
 const dungeonBattle=dungeon.startEncounter();assert(dungeonBattle);fight(dungeonBattle);
 for(const stats of [run.snapshot.stats,dungeon.snapshot.stats]){expect(stats).toMatchObject({version:1,coverage:'whole-run',activeMs:0});}
 const runSave=encodeRunSave(run.snapshot,runContext),dungeonSave=encodeDungeon(dungeon.snapshot);assert(runSave.ok&&dungeonSave.ok);
 expect(JSON.parse(runSave.text).format).toBe(10);expect(JSON.parse(dungeonSave.text).format).toBe(12);
 mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/counter-run-v1.json`,runSave.text+'\n');writeFileSync(`${directory}/counter-dungeon-v1.json`,dungeonSave.text+'\n');
},20000);
