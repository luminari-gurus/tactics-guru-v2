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
