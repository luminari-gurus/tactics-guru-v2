import {expect,it} from 'vitest';
import {abilityCatalog} from '../helpers/abilityCatalog';
import {validateContent} from '../../src/content/validate';
it('admits bounded extra profiles without altering canonical definitions',()=>{expect(validateContent(abilityCatalog()).ok).toBe(true);});
it.each([
  ['kind','heal'],['rangeMax',999],['rangeMin',6],['rangeMax',NaN],['owners',[]],['owners',['fighter','fighter']],['owners',['ranger']],['owners',['unknown']],['owners',['toString']],['extra',1],['attackPenalty',1],
])('rejects malformed extra ability %s=%j',(field,value)=>{
  const c=structuredClone(abilityCatalog());Object.assign(c.abilities['ability:zz_fighter'],{[field]:value});expect(validateContent(c).ok).toBe(false);
});
it.each(['bad','ability:Bad','ability:bad__id'])('rejects malformed ID %s',id=>{
  const c=structuredClone(abilityCatalog());Object.assign(c.abilities,{[id]:{...c.abilities['ability:zz_fighter'],id}});expect(validateContent(c).ok).toBe(false);
});
it.each(['owners','kind'])('retains canonical %s checks',field=>{
  const c=structuredClone(abilityCatalog());Object.assign(c.abilities['ability:guarded_strike'],{[field]:field==='owners'?['ranger']:'attack'});expect(validateContent(c).ok).toBe(false);
});
it('retains required canonical IDs',()=>{
  const c=structuredClone(abilityCatalog());delete (c.abilities as Record<string,unknown>)['ability:high_shot'];expect(validateContent(c).ok).toBe(false);
});

it.each([
  ['ability:second_wind','requiredLevel',1],['ability:second_wind','rangeMax',1],['ability:second_wind','target','hostile'],
  ['ability:second_wind','usesPerBattle',2],['ability:second_wind','healBase',5],['ability:second_wind','owners',['mage']],
  ['ability:taunt','requiredLevel',2],['ability:taunt','rangeMin',0],['ability:taunt','duration','roundEnd'],
  ['ability:taunt','immunity',false],['ability:taunt','owners',['goblin_grunt']],['ability:taunt','target','self'],
  ['ability:frost_snare','requiredLevel',2],['ability:frost_snare','rangeMin',1],['ability:frost_snare','rangeMax',5],
  ['ability:frost_snare','target','self'],['ability:frost_snare','duration','roundEnd'],['ability:frost_snare','owners',['ranger']],
  ['ability:frost_snare','immunity',false],['ability:frost_snare','baseDamage',0],
  ['ability:weakening_hex','rangeMin',1],['ability:weakening_hex','rangeMax',5],['ability:weakening_hex','target','allied'],
  ['ability:weakening_hex','accuracyPenalty',3],['ability:weakening_hex','duration','roundEnd'],['ability:weakening_hex','owners',['mage']],
  ['ability:weakening_hex','requiredLevel',1],['ability:weakening_hex','baseDamage',1],
  ['ability:heal_goblin','rangeMin',0],['ability:heal_goblin','healAmount',5],['ability:heal_goblin','targetFilter','injured'],
  ['ability:heal_goblin','owners',['goblin_grunt']],['ability:heal_goblin','usesPerBattle',1],
])('rejects unsupported Fighter profile %s.%s=%j',(id,field,value)=>{
  const c=structuredClone(abilityCatalog());Object.assign(c.abilities[id as keyof typeof c.abilities],{[field]:value});
  expect(validateContent(c).ok).toBe(false);
});

it('admits only bounded explicit effect immunity IDs without assigning production immunities', () => {
  const original = abilityCatalog();
  expect(Object.values({ ...original.heroes, ...original.enemies }).every(u => u.immunities === undefined)).toBe(true);
  for (const immunities of [['weakened'], ['debuff'], ['debuff','weakened']]) {
    const c = structuredClone(original); Object.assign(c.heroes.fighter, { immunities });
    expect(validateContent(c).ok).toBe(true);
  }
  for (const immunities of [[], ['fear'], ['Weakened'], ['weakened','weakened'], ['weakened','debuff','fear'], true, new Array(1)]) {
    const c = structuredClone(original); Object.assign(c.heroes.fighter, { immunities });
    expect(validateContent(c).ok).toBe(false);
  }
});
