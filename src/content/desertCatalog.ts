import { readBattlefieldEncounters } from './battlefieldTypes';
import { battlefieldEncounters, runCatalog } from './encounters';
import { desertAssets } from './desertAssets';
import { validateContent } from './validate';
const checked=validateContent({...runCatalog,assets:{...runCatalog.assets,...desertAssets},terrains:{...runCatalog.terrains,
  sand:{id:'sand',surfaceAssetId:'asset:terrain_sand',moveCost:1,walkable:true,blocksLineOfSight:false},
  rock:{id:'rock',surfaceAssetId:'asset:terrain_rock',moveCost:1,walkable:false,blocksLineOfSight:true},
}});
if(!checked.ok)throw Error(`Invalid desert content: ${JSON.stringify(checked.errors)}`);
export const desertRunCatalog=checked.catalog;

const sources=readBattlefieldEncounters(battlefieldEncounters,desertRunCatalog);
if(!sources.ok)throw Error(sources.reason);
