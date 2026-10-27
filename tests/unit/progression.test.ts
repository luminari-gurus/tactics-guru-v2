import { describeRunBattle } from '../../src/domain/run';
import { RunItemSession } from '../../src/app/RunItemSession';
import { createRunStorage } from '../../src/persistence/runStorage';
import { emptyItemOwnership as emptyOwnership } from '../../src/domain/items';
import { encodeRunSave, decodeRunSave } from '../../src/domain/runSaveEnvelope';
import { freshRunSnapshot, createRunBattle, replayRunBattle } from '../../src/domain/runBattle';
import { runContext } from '../helpers/runItemFixtures';
import { projectEncounterSpawns, authoredEncounters } from '../../src/content/encounters';
import { abilitySession } from '../helpers/abilityCatalog';
import { dispatch } from '../../src/domain/turns';
import { describe, expect, it } from 'vitest';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { HERO_IDS } from '../../src/content/constants';
import { HERO_PROGRESSION as rules } from '../../src/content/progression';
import { awardHero, progressHero, projectProgression, readProgressHero } from '../../src/domain/progression';
import { validateContent } from '../../src/content/validate';
import { projectOwnedCatalog, emptyItemOwnership } from '../../src/domain/items';
import { itemCatalog } from '../../src/content/items';
import { createRun, transitionRun, runBoundaryId } from '../../src/domain/run';
import { authoredRun, runCatalog } from '../../src/content/encounters';

describe('bounded progression',()=>{
  it('learns and exposes Ranger Mark at level two and Pin only at level three',()=>{
    for(const [xp,level] of [[0,1],[59,1],[60,2],[179,2],[180,3],[600,5]]) {
      const party=HERO_IDS.map(id=>progressHero(id,xp,1,catalog)),projected=projectProgression(party,catalog);
      const ranger=party.find(h=>h.heroId==='ranger')!;
      for(const [abilityId,gate] of [['ability:mark_target',2],['ability:pinning_shot',3]] as const) {
        expect(ranger.learned.includes(abilityId)).toBe(level>=gate);
        expect(Boolean(projected.abilities[abilityId])).toBe(level>=gate);
        if(level<gate) {
          const s=abilitySession('ranger',projected);
          expect(dispatch(s.state,{type:'useAbility',unitId:s.active.id,abilityId,target:{unitId:4}},projected)).toEqual({ok:false,reason:'unknownAbility'});
        }
      }
      expect(projected.abilities['ability:high_shot']).toEqual(catalog.abilities['ability:high_shot']);
    }
  });
  it('unlocks Fighter effects only at canonical levels and keeps standalone at level one',()=>{
    for(const [xp,level] of [[0,1],[60,2],[180,3],[600,5]]) {
      const party=HERO_IDS.map(id=>progressHero(id,xp,1,catalog)),projected=projectProgression(party,catalog);
      expect(party[0].level).toBe(level);
      expect(party[0].learned.includes('ability:second_wind')).toBe(level>=2);
      expect(party[0].learned.includes('ability:taunt')).toBe(level>=3);
      expect(Boolean(projected.abilities['ability:second_wind'])).toBe(level>=2);
      expect(Boolean(projected.abilities['ability:taunt'])).toBe(level>=3);
      expect(projectProgression(party,catalog)).toEqual(projected);
      const s=abilitySession('fighter',projected);
      for(const abilityId of ['ability:second_wind','ability:taunt'] as const)if(!projected.abilities[abilityId])
        expect(dispatch(s.state,{type:'useAbility',unitId:s.active.id,abilityId,target:{unitId:s.active.id}},projected)).toEqual({ok:false,reason:'unknownAbility'});
    }
    expect(catalog.heroes.fighter.stats.maxHp).toBe(18);
  });
  it.each(HERO_IDS)('derives all thresholds and exact HP for %s without non-HP growth',id=>{
    for(const [i,xp] of rules.thresholds.entries()){
      const h=progressHero(id,xp,1,catalog);
      expect(h.level).toBe(i+1);expect(h.maxHp).toBe(catalog.heroes[id].stats.maxHp+i*rules.hpPerLevel[id]);
      expect(readProgressHero(h,id,catalog)).toEqual(h);
      const party=HERO_IDS.map(hero=>progressHero(hero,xp,1,catalog));
      const projected=projectOwnedCatalog(emptyItemOwnership(),party,catalog,itemCatalog);
      expect({...projected.heroes[id].stats,maxHp:catalog.heroes[id].stats.maxHp}).toEqual(catalog.heroes[id].stats);
      expect(projectOwnedCatalog(emptyItemOwnership(),party,catalog,itemCatalog)).toEqual(projected);
      if(xp)expect(progressHero(id,xp-1,1,catalog).level).toBe(i);
    }
  });
  it('caps large awards, heals only on advancement and never revives',()=>{
    const h=progressHero('fighter',0,2,catalog);
    expect(awardHero(h,30,catalog)).toMatchObject({xp:30,level:1,hp:2});
    expect(awardHero(h,Number.MAX_SAFE_INTEGER,catalog)).toMatchObject({xp:600,level:5,hp:42});
    const capped=progressHero('fighter',600,2,catalog);expect(awardHero(capped,90,catalog)).toEqual(capped);
    const dead={...h,hp:0};expect(awardHero(dead,600,catalog)).toEqual(dead);
    for(const amount of [-1,1.5,Infinity])expect(()=>awardHero(h,amount,catalog)).toThrow();
  });
  it('rejects corrupt canonical state',()=>{
    const h=progressHero('mage',180,3,catalog);
    for(const patch of [{xp:-1},{xp:601},{xp:1.5},{level:4},{maxHp:99},{hp:99},{learned:[]},{learned:[...h.learned,...h.learned]}])expect(readProgressHero({...h,...patch},'mage',catalog)).toBeNull();
  });
  it('validates and gates implemented fixture abilities at learned level',()=>{
    const base={...catalog,abilities:{...catalog.abilities,'ability:later':{...catalog.abilities['ability:high_shot'],id:'ability:later' as const,requiredLevel:2}}};
    expect(validateContent(base).ok).toBe(true);
    const party=(xp:number)=>HERO_IDS.map(id=>progressHero(id,xp,1,base));
    expect(projectProgression(party(0),base).abilities['ability:later']).toBeUndefined();
    const lockedCatalog=projectProgression(party(0),base),locked=abilitySession('ranger',lockedCatalog);
    const rejected=dispatch(locked.state,{type:'useAbility',unitId:locked.active.id,abilityId:'ability:later',target:{unitId:locked.state.units.find(u=>u.side==='enemy')!.id}},lockedCatalog);
    expect(rejected).toEqual({ok:false,reason:'unknownAbility'});

    expect(projectProgression(party(60),base).abilities['ability:later'].owners).toEqual(['ranger']);
    for(const requiredLevel of [0,6,1.5])expect(validateContent({...base,abilities:{...base.abilities,'ability:later':{...base.abilities['ability:later'],requiredLevel}}}).ok).toBe(false);
    let accessed=false;const owners:string[]=[];Object.defineProperty(owners,'0',{get:()=>{accessed=true;return 'ranger';},enumerable:true});
    expect(validateContent({...base,abilities:{...base.abilities,'ability:later':{...base.abilities['ability:later'],owners}}}).ok).toBe(false);expect(accessed).toBe(false);

    for(const [xp,count] of [[0,1],[180,2],[600,3]]){
      const a=projectProgression(party(xp),base).abilities['ability:magic_missile'];
      if(a.kind!=='magicMissile')throw Error();
      const projected=projectProgression(party(xp),base),session=abilitySession('mage',projected);
      const cast=dispatch(session.state,{type:'useAbility',unitId:session.active.id,abilityId:'ability:magic_missile',target:{unitId:session.state.units.find(u=>u.side==='enemy')!.id}},projected);
      expect(cast.ok).toBe(true);if(cast.ok)expect(cast.events.filter(e=>e.type==='missileRolled')).toHaveLength(count);
    }
  });
  it('projects progressed survivors into authored encounter rosters',()=>{
    const party=HERO_IDS.map(id=>progressHero(id,600,id==='mage'?0:30,runCatalog));
    const projected=projectEncounterSpawns(authoredEncounters[0].id,party);expect(projected.ok).toBe(true);
    if(projected.ok)expect(projected.map.spawns.some(s=>s.unitId==='mage')).toBe(false);
    expect(projectEncounterSpawns(authoredEncounters[0].id,party.map(h=>({...h,maxHp:999}))).ok).toBe(false);
  });
  it('awards only accepted victory boundaries including the terminal boss',()=>{
    const made=createRun('xp-run',13,authoredRun,runCatalog);if(!made.ok)throw Error();let s=made.state;
    for(const expectedXp of [30,60,150]){
      const cmd={type:'completeBattle',runId:s.id,revision:s.revision,encounterId:s.encounters[s.encounterIndex],boundaryId:runBoundaryId(s),outcome:'victory',party:s.party.map(h=>({...h,hp:h.heroId==='mage'?0:1}))};
      const result=transitionRun(s,cmd,authoredRun,runCatalog);if(!result.ok)throw Error(result.reason);s=result.state;
      expect(s.party[0].xp).toBe(expectedXp);expect(s.party[2].xp).toBe(0);
      expect(transitionRun(s,cmd,authoredRun,runCatalog).ok).toBe(false);
      if(s.phase==='reward'){const next=transitionRun(s,{type:'acknowledgeReward',runId:s.id,revision:s.revision,encounterId:s.encounters[s.encounterIndex],boundaryId:runBoundaryId(s)},authoredRun,runCatalog);if(!next.ok)throw Error();s=next.state;}
    }
    expect(s.phase).toBe('victory');expect(s.party[0].level).toBe(2);
  });
  it('round-trips progressed battle entry and replay without repeated projection or awards',()=>{
    const fresh=freshRunSnapshot('progress-save',13,runContext),party=HERO_IDS.map(id=>progressHero(id,180,4,runContext.catalog));
    // Explicit later-entry fixture; no claim of a preceding browser playthrough.
    const entry={...fresh.items,run:{...fresh.items.run,encounterIndex:2,revision:4,party},ownership:emptyOwnership()};
    const created=createRunBattle(entry,runContext);expect(created.ok).toBe(true);if(!created.ok)throw Error();
    const snapshot={items:entry,activeBattle:created.state,battlefield:created.battlefield};
    const encoded=encodeRunSave(snapshot,runContext);if(!encoded.ok)throw Error(encoded.reason);
    expect(decodeRunSave(encoded.text,runContext)).toEqual({ok:true,state:snapshot});
    expect(createRunBattle(entry,runContext)).toEqual(created);
    const replay={format:created.state.format,versions:created.state.versions,initial:created.state,commands:[],battlefield:created.battlefield};
    const result=replayRunBattle(replay,entry,runContext);expect(result.ok).toBe(true);if(result.ok)expect(result.state).toEqual(created.state);
    const older=JSON.stringify({...JSON.parse(encoded.text),format:2});expect(decodeRunSave(older,runContext)).toEqual({ok:false,reason:'incompatible'});
  });

  it('owns learned arrays exposed through previews and inspection metadata',()=>{
    const snapshot=freshRunSnapshot('owned-progress',13,runContext),before=structuredClone(snapshot);
    const preview=describeRunBattle(snapshot.items.run)!;
    (preview.party[0].learned as string[]).push('ability:forged');
    expect(snapshot).toEqual(before);
    const controller=new RunItemSession(snapshot,runContext,createRunStorage(runContext,()=>null));
    const battle=controller.startEncounter()!;
    (battle.progression[0].learned as string[]).push('ability:forged');
    expect(controller.snapshot.items.run.party).toEqual(before.items.run.party);
    controller.dispose();
  });

});
