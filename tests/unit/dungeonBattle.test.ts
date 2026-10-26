import { HERO_PROGRESSION } from '../../src/content/progression';
import { progressHero } from '../../src/domain/progression';
import { atEncounter } from '../helpers/dungeonFixtures';
import { freshDungeon, floorDescriptor, startDungeonBattle, readDungeon } from '../../src/domain/dungeon';
import { guardedBoundary } from '../helpers/guardedBoundary';
import { combatStats } from '../../src/domain/effects';
import { expect,it } from 'vitest';
import { dungeonJourney, dungeonVictoryBoundary } from '../helpers/dungeonFixtures';
import { dungeonBattle, acceptDungeonBattle } from '../../src/domain/dungeon';
import { encodeDungeon,decodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { dungeonContent } from '../../src/content/dungeon';
import { resolveBattlefield } from '../../src/domain/battlefield';
import { dispatch } from '../../src/domain/turns';
import { LEGACY_ENCOUNTER_POLICY } from '../../src/domain/dungeonEncounters';
import { priorDungeonEnvelope } from '../helpers/dungeonFixtures';
import { freshExploration } from '../../src/domain/exploration';
import { previewAttack } from '../../src/domain/combat';
import { planEnemyTurn, runEnemyTurn } from '../../src/domain/ai';
import { rollDie, seedRng } from '../../src/domain/rng';

it('restores bounded healing and Taunt without refreshing them and resets battle state at the next encounter',()=>{
  let entry=freshDungeon('fighter-heal',190);
  entry={...entry,party:entry.party.map(h=>progressHero(h.heroId,180,2,dungeonContent.catalog))};
  const started=startDungeonBattle(atEncounter(entry));if(!started.ok)throw Error(started.reason);
  const built=dungeonBattle(started.state)!,initial=started.state.activeBattle!;
  const active={...initial,activeIndex:initial.initiative.indexOf(1)};
  const used=dispatch(active,{type:'useAbility',unitId:1,abilityId:'ability:second_wind',target:{unitId:1}},built.catalog);if(!used.ok)throw Error(used.reason);
  const enemy=used.state.units.find(u=>u.side==='enemy')!;
  const battle={...used.state,units:used.state.units.map(u=>u.id===enemy.id?{...u,tauntedBy:1}:u)};
  const snapshot={...started.state,activeBattle:battle};
  const encoded=encodeDungeon(snapshot);if(!encoded.ok)throw Error(encoded.reason);const decoded=decodeDungeon(encoded.text);if(!decoded.ok)throw Error(decoded.reason);
  expect(decoded.state).toEqual(snapshot);expect(decoded.state.activeBattle!.units[0]).toMatchObject({hp:9,secondWindUsed:true});
  const wait={type:'endTurn',unitId:1} as const;expect(dispatch(decoded.state.activeBattle!,wait,built.catalog)).toEqual(dispatch(battle,wait,built.catalog));
  for(const [id,patch] of [[1,{hp:10}],[1,{secondWindUsed:false}],[2,{hp:3}],[enemy.id,{tauntedBy:2}]] as const)
    expect(readDungeon({...snapshot,activeBattle:{...battle,units:battle.units.map(u=>u.id===id?{...u,...patch}:u)}}).ok).toBe(false);
  const won={...used.state,outcome:'playerWin' as const,units:used.state.units.map(u=>u.side==='enemy'?{...u,hp:0}:u)};
  const completed=acceptDungeonBattle(started.state,won);if(!completed.ok)throw Error(completed.reason);
  expect(completed.state.party[0].hp).toBe(9);expect(completed.state.party[0]).not.toHaveProperty('secondWindUsed');expect(completed.state.activeBattle).toBeNull();
  expect(dungeonBattle(completed.state)!.state.units.every(u=>!u.secondWindUsed && u.tauntedBy===undefined)).toBe(true);
  const old=JSON.stringify({...JSON.parse(encoded.text),format:4});expect(decodeDungeon(old)).toEqual({ok:false,reason:'incompatible'});
});
it('legally reaches guardian victory with next-command/RNG equivalence after save/resume',()=>{
  let fixture:ReturnType<typeof dungeonVictoryBoundary>=null,seed=0;
  for(seed=1;seed<=50&&!fixture;seed++)fixture=dungeonVictoryBoundary(seed,2);
  expect(fixture).not.toBeNull();if(!fixture)return;
  expect(seed-1).toBeGreaterThan(0);
  const encoded=encodeDungeon(fixture.snapshot);expect(encoded.ok).toBe(true);if(!encoded.ok)return;
  const decoded=decodeDungeon(encoded.text);expect(decoded.ok).toBe(true);if(!decoded.ok)return;
  const catalog=dungeonBattle(fixture.snapshot)!.catalog;
  const a=dispatch(fixture.snapshot.activeBattle!,fixture.command,catalog),b=dispatch(decoded.state.activeBattle!,fixture.command,catalog);
  expect(a).toEqual(b);expect(a.ok).toBe(true);
  if(a.ok){expect(a.state.outcome).toBe('playerWin');const result=acceptDungeonBattle(decoded.state,a.state);expect(result.ok).toBe(true);if(result.ok){expect(result.state.phase).toBe('ready');expect(result.state.floors[0].completed).toBe(3);}}
},120000);

it('retains the accepted-command history through every legal encounter',()=>{
  let fixture:ReturnType<typeof dungeonVictoryBoundary>=null;
  for(let seed=1;seed<=50&&!fixture;seed++)fixture=dungeonVictoryBoundary(seed,2);
  expect(fixture).not.toBeNull();if(!fixture)return;
  for(const value of fixture.histories){
    const {replay:record,entry}=value as {replay:import('../../src/domain/types').Replay;entry:import('../../src/domain/dungeon').DungeonState};
    const catalog=dungeonBattle(entry)!.catalog;
    let state=record.initial;
    for(const command of record.commands){const next=dispatch(state,command,catalog);expect(next.ok).toBe(true);if(!next.ok)throw Error(next.reason);state=next.state;}
    expect(state.outcome).toBe('playerWin');
  }
},120000);

it('continues a legally reached Guarded dungeon boundary through exact save/resume and expiry', () => {
  let reached = false;
  for (let seed = 1; seed <= 10 && !reached; seed++) {
    const started = startDungeonBattle(atEncounter(freshDungeon('guarded-save', seed))); if (!started.ok) throw Error(started.reason);
    const built = dungeonBattle(started.state)!;
    let fixture; try { fixture = guardedBoundary(built.catalog, started.state.activeBattle!); } catch { continue; }
    const cast = dispatch(fixture.before, fixture.command, built.catalog); if (!cast.ok) throw Error(cast.reason);
    const snapshot = { ...started.state, activeBattle: cast.state };
    const encoded = encodeDungeon(snapshot); if (!encoded.ok) throw Error(encoded.reason);
    const decoded = decodeDungeon(encoded.text); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state).toEqual(snapshot); expect(encodeDungeon(decoded.state)).toEqual(encoded);
    const fighter = decoded.state.activeBattle!.units.find(u => u.defId === 'fighter')!;
    expect(combatStats(fighter, built.catalog).armorClass).toBe(built.catalog.heroes.fighter.stats.armorClass + 2);
    let live = cast.state, resumed = decoded.state.activeBattle!;
    for (let i = 0; i < live.units.length; i++) {
      const command = { type: 'endTurn', unitId: live.initiative[live.activeIndex] };
      const a = dispatch(live, command, built.catalog), b = dispatch(resumed, command, built.catalog); expect(a).toEqual(b);
      if (!a.ok || !b.ok) throw Error('Wait rejected'); live = a.state; resumed = b.state;
    }
    expect(live.units.find(u => u.defId === 'fighter')!.guarded).toBeUndefined();
    for (const field of ['statuses', 'resources']) {
      const bad = { ...snapshot, activeBattle: { ...cast.state, units: cast.state.units.map((u, i) => i ? u : { ...u, [field]: [] }) } };
      expect(readDungeon(bad).ok).toBe(false);
    }
    reached = true;
  }
  expect(reached).toBe(true);
});


it('uses the same scaled catalog for inspection, attack preview, AI, actual damage and replay', () => {
  const base = freshDungeon('scaled-consumers', 1);
  // Structural depth fixture isolates combat consumers; legal multi-floor play is covered separately.
  const floors = Array.from({length:10}, (_, i) => {
    const descriptor = floorDescriptor(base.seed, i + 1);
    return { descriptor, completed: i === 9 ? 0 : 3, position: descriptor.upstairs, exploration: freshExploration(descriptor.seed, descriptor.upstairs) };
  });
  const built = dungeonBattle({...base, depth:10, floors})!, enemy = built.state.units.find(u=>u.side==='enemy'&&u.defId==='goblin_grunt')!, hero = built.state.units.find(u=>u.defId==='fighter')!;
  let hitSeed = 0; while (rollDie(seedRng(hitSeed),20).value !== 10) hitSeed++;
  const state: import('../../src/domain/types').BattleState = { ...built.state, rng:seedRng(hitSeed), activeIndex:built.state.initiative.indexOf(enemy.id), units:built.state.units.map(u=>u.id===enemy.id?{...u,cell:{x:4,y:0}}:u.id===hero.id?{...u,cell:{x:3,y:0}}:{...u,hp:0}) };
  const command = { type:'useAbility' as const, unitId:enemy.id, abilityId:'ability:basic_attack' as const, target:{unitId:hero.id} };
  const preview = previewAttack(state, command, built.catalog); if(!preview.ok)throw Error(preview.reason);
  expect(preview.bonus).toBe(8); expect(combatStats(enemy,built.catalog).accuracy).toBe(preview.bonus);
  expect(preview.damage).toBe((built.catalog.abilities['ability:basic_attack'] as {baseDamage:number}).baseDamage+4);
  const plan = planEnemyTurn(state,enemy.id,built.catalog); if(!plan.ok)throw Error(plan.reason);
  expect(plan.commands).toContainEqual(command);
  const result = runEnemyTurn(state,enemy.id,built.catalog); if(!result.ok)throw Error(result.reason);
  expect(result.events.find(e=>e.type==='attackRolled')).toMatchObject({bonus:preview.bonus,armorClass:preview.armorClass});
  expect(result.events.find(e=>e.type==='damaged')).toMatchObject({unitId:hero.id,damage:preview.damage,hp:hero.hp-preview.damage});
  let replay = state;
  for(const c of result.commands){const next=dispatch(replay,c,built.catalog);if(!next.ok)throw Error(next.reason);replay=next.state;}
  expect(replay).toEqual(result.state);
});

it('plays a legal full-floor witness with existing rewards and carried party HP', () => {
  const witness=dungeonJourney(43);expect(witness.won).toBe(true);
  console.info(JSON.stringify({seed:witness.seed,battles:witness.battles.map(b=>({biome:b.selection.policy===LEGACY_ENCOUNTER_POLICY?'grassland':b.selection.biome,kind:b.selection.kind,commands:b.commands,party:b.party}))}));
  expect(witness.state.depth).toBe(1);expect(witness.state.floors.every(f=>f.completed===3)).toBe(true);
},120000);

it('legally clears both biome guardians and every encounter kind with carried rewards', () => {
  const witness=dungeonJourney(190,2,true);expect(witness.won).toBe(true);
  expect(witness.state.floors.map(f=>f.completed)).toEqual([3,3]);
  expect(witness.battles).toHaveLength(6);
  let previous=[0,0,0];
  for(const battle of witness.battles){
    battle.party.forEach((hero,i)=>expect(hero.xp-previous[i]).toBe(hero.hp>0?HERO_PROGRESSION.awards[battle.selection.kind]:0));
    previous=battle.party.map(h=>h.xp);
  }

  expect([...new Set(witness.battles.map(b=>b.selection.kind))].sort()).toEqual(['boss','elite','normal','vault']);
  expect([...new Set(witness.battles.map(b=>b.selection.policy===LEGACY_ENCOUNTER_POLICY?'grassland':b.selection.biome))].sort()).toEqual(['desert','forest']);
  expect(witness.state.party.some(h=>h.hp>0)).toBe(true);
  expect(witness.state.party.filter(h=>h.hp>0).every(h=>h.xp>0 && h.level>=2)).toBe(true);
},120000);
