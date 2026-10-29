import { expect,it } from 'vitest';
import { abilityCatalog,abilitySession } from '../helpers/abilityCatalog';
import { actionCommand,ownedAbilities,actionTargets,friendlyFire } from '../../src/ui/battleActions';
import { BattleSession } from '../../src/app/BattleSession';
import { previewText } from '../../src/ui/hud';
import { targetOverlays } from '../../src/ui/targetPreview';

it('self healing uses the shared preview and self target without friendly-fire or attack copy',()=>{
  const base=abilitySession('fighter'),state={...base.state,units:base.state.units.map(u=>u.id===base.active.id?{...u,hp:2}:u)};
  const s=new BattleSession(base.catalog,state,2),command=actionCommand(s,'ability:second_wind',s.active.cell)!;
  expect(actionTargets(s,'ability:second_wind')).toEqual([s.active]);expect(friendlyFire(s,command)).toBe('');
  expect(previewText(s.preview(command))).toContain('Heal 7 HP');expect(previewText(s.preview(command))).not.toMatch(/attack|Friendly fire/);
  expect(targetOverlays(s,'ability:second_wind',s.active.cell)).toMatchObject([{valid:true,selected:true}]);
});
it.each(['fighter','ranger','mage'] as const)('selects later %s abilities by identity across catalog order and rejects foreign IDs',hero=>{
  const catalog=abilityCatalog(),s=abilitySession(hero,catalog),before=JSON.stringify({state:s.state,replay:s.replay});
  const choices=ownedAbilities(s);expect(choices).toHaveLength(hero==='mage'?3:4);
  const reverse=abilitySession(hero,{...catalog,abilities:Object.fromEntries(Object.entries(catalog.abilities).reverse())});
  expect(ownedAbilities(reverse)).toEqual(choices);
  const target=s.state.units.find(u=>u.side==='enemy')!;
  expect(actionCommand(s,choices.at(-1)!.id,target.cell)).toMatchObject({abilityId:`ability:zz_${hero}`,target:{unitId:target.id}});
  expect(actionCommand(s,'ability:missing',target.cell)).toBeNull();
  expect(actionCommand(s,'ability:shortbow_shot',target.cell)).toBeNull();
  targetOverlays(s,choices.at(-1)!.id,target.cell);
  expect(JSON.stringify({state:s.state,replay:s.replay})).toBe(before);expect(s.pending).toBeNull();
});
it('allocates all missiles to one legal friendly target and preserves atomic cancellation and spent locks',()=>{
  const base=abilitySession('mage'),ally=base.state.units.find(u=>u.defId==='fighter')!;
  const state=base.state;
  const s=new BattleSession(base.catalog,state,2),before=JSON.stringify({state:s.state,replay:s.replay});
  expect(actionTargets(s,'ability:zz_mage')).toContainEqual(s.state.units.find(u=>u.id===ally.id));
  const command=actionCommand(s,'ability:zz_mage',ally.cell)!;
  const preview=s.prepare(command);
  expect(preview).toMatchObject({ok:true,missileCount:2,targetIds:[ally.id,ally.id]});
  expect(previewText(preview)).toContain('2 missiles · 2–5 force damage each');
  expect(friendlyFire(s,command)).toContain('fighter');s.cancel();
  expect(JSON.stringify({state:s.state,replay:s.replay})).toBe(before);
  s.prepare(command);const step=s.confirm()!;expect(step.events.filter(e=>e.type==='missileRolled')).toHaveLength(2);
  expect(s.confirm()).toBeNull();s.finishPresentation(step.token);
  expect(s.prepare(command)).toMatchObject({ok:false,reason:'alreadyActed'});
});
