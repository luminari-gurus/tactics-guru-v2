import { authoredRun, battlefieldEncounters } from '../content/encounters';
import { desertRunCatalog } from '../content/desertCatalog';
import { itemCatalog } from '../content/items';
import type { RunSaveContext } from '../domain/runSaveEnvelope';
export const runSaveContext: RunSaveContext = { definition: authoredRun, encounters: battlefieldEncounters, catalog: desertRunCatalog, items: itemCatalog };
