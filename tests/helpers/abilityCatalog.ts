import { battleCatalog } from '../../src/content/catalog';
import type { ContentCatalog, HeroId } from '../../src/content/types';
import { validateContent } from '../../src/content/validate';
import { BattleSession } from '../../src/app/BattleSession';
export function abilityCatalog():ContentCatalog {
  const abilities={...battleCatalog.abilities};
  for(const hero of ['fighter','ranger','mage'] as const){
    const source=Object.values(abilities).find(a=>a.id!=='ability:basic_attack' && a.owners.includes(hero))!;
    const id=`ability:zz_${hero}` as const;
    abilities[id]={...source,id,rangeMin:1,rangeMax:5,...(source.kind==='magicMissile'?{casterLevel:3}:{})};
  }
  const catalog={...battleCatalog,abilities};
  const valid=validateContent(catalog);if(!valid.ok)throw Error(JSON.stringify(valid));
  return catalog;
}
export function abilitySession(hero:HeroId,catalog=abilityCatalog()) {
  const initial=new BattleSession(catalog,'map:forest_ruins',2).state;
  const actor=initial.units.find(u=>u.defId===hero)!;
  const others=initial.units.filter(u=>u.id!==actor.id);
  const enemies=others.filter(u=>u.side==='enemy'),allies=others.filter(u=>u.side==='player');
  const positions=new Map([[actor.id,{x:0,y:0}],...enemies.map((u,i)=>[u.id,{x:i+1,y:0}] as const),...allies.map((u,i)=>[u.id,{x:i+enemies.length+1,y:0}] as const)]);
  return new BattleSession(catalog,{...initial,activeIndex:initial.initiative.indexOf(actor.id),units:initial.units.map(u=>({...u,cell:positions.get(u.id)!}))},2);
}
