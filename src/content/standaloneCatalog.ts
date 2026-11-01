import { battleCatalog } from './catalog';
import { HERO_IDS } from './constants';
import type { ContentCatalog } from './types';
import { progressHero, projectProgression } from '../domain/progression';
/** Standalone saves and scenes share the same level-one ability boundary. */
export function standaloneBattleCatalog(base: ContentCatalog = battleCatalog): ContentCatalog {
  return projectProgression(HERO_IDS.map(id => progressHero(id, 0, base.heroes[id].stats.maxHp, base)), base);
}
