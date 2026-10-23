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
    expect(projectProgression(party(60),base).abilities['ability:later'].owners).toEqual(['ranger']);
    for(const requiredLevel of [0,6,1.5])expect(validateContent({...base,abilities:{...base.abilities,'ability:later':{...base.abilities['ability:later'],requiredLevel}}}).ok).toBe(false);
    for(const [xp,count] of [[0,1],[180,2],[600,3]]){
      const a=projectProgression(party(xp),base).abilities['ability:magic_missile'];
      if(a.kind!=='magicMissile')throw Error();expect(Math.floor((a.casterLevel+1)/2)).toBe(count);
    }
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
});
