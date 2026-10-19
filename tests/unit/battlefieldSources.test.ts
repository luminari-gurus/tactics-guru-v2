import { expect, it } from 'vitest';
import { battlefieldEncounters } from '../../src/content/encounters';
import { desertRunCatalog } from '../../src/content/desertCatalog';
import { readBattlefieldEncounters } from '../../src/content/battlefieldTypes';
it('reads mixed sources with stable rosters',()=>expect(readBattlefieldEncounters(battlefieldEncounters,desertRunCatalog).ok).toBe(true));
it.each(['missing','ambiguous','biome','version','profile','map','roster','id','accessor'])('rejects unsupported source: %s',problem=>{
 const records:any=structuredClone(battlefieldEncounters);
 if(problem==='missing')delete records[0].source;
 if(problem==='ambiguous')records[0].source.mapId='map:forest_ruins';
 if(problem==='biome')records[0].source.biome='forest';
 if(problem==='version')records[0].source.generatorVersion=2;
 if(problem==='profile')records[0].source.profileVersion='future';
 if(problem==='map')records[2].source.mapId='map:unknown';
 if(problem==='roster')records[0].roster[1].id=records[0].roster[0].id;
 if(problem==='id')records[1].id=records[0].id;
 if(problem==='accessor')Object.defineProperty(records[0],'source',{enumerable:true,get(){throw Error('must not read');}});
 expect(readBattlefieldEncounters(records,desertRunCatalog).ok).toBe(false);
});
