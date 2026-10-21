import { battlefieldEncounters } from './encounters';
import { desertRunCatalog } from './desertCatalog';
import { itemCatalog } from './items';
import { hashJson } from '../domain/contentIdentity';
import { RULES_VERSION, RNG_VERSION } from '../domain/constants';
import { contentVersion } from '../domain/battle';
import { itemCatalogIdentity } from '../domain/rewards';
import { dungeonBattleCatalog, dungeonEncounterIdentity } from './dungeonEncounters';
export const dungeonContent = { encounters: battlefieldEncounters, catalog: desertRunCatalog, items: itemCatalog };
export const DUNGEON_TEMPLATE = 'three-encounters-v1';
export const legacyDungeonIdentity = hashJson({ rules: RULES_VERSION, rng: RNG_VERSION, template: DUNGEON_TEMPLATE, encounters: battlefieldEncounters,
  content: contentVersion(desertRunCatalog), items: itemCatalogIdentity(itemCatalog), floor: 'rooms-v1:grassland-v1:first-last-open' });

export const priorDungeonIdentity = hashJson({ legacy: legacyDungeonIdentity, exploration: 'exploration-v1', format: 2 });
export const dungeonIdentity = hashJson({ prior: priorDungeonIdentity, selection: dungeonEncounterIdentity,
  content: contentVersion(dungeonBattleCatalog), scaling: 'enemy-depth-v1', format: 3 });
