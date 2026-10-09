import { ATTACK_BOUNDS, CONTENT_BOUNDS, ENEMY_IDS, FIGHTING_DEFENSIVELY, FIRST_MAP_TERRAIN_IDS, HERO_IDS, TERRAIN_TEXTURE_SPEC } from './constants';
import type { ContentCatalog } from './types';
import { attackAbilities } from './abilities';
import { hasShape, isDenseArray, isPlainRecord, type JsonRecord } from '../domain/validation';

export type ContentErrorCode = 'shape' | 'id' | 'duplicateId' | 'number' | 'reference' | 'cells' | 'duplicateCell' | 'coordinate' | 'walkability' | 'occupiedSpawn';
export interface ContentError { readonly code: ContentErrorCode; readonly path: string; readonly message: string }
export type ContentValidation = { readonly ok: true; readonly catalog: ContentCatalog } | { readonly ok: false; readonly errors: readonly ContentError[] };

/** Validate unknown JSON without defaults, mutation, rendering or packaged-file I/O. */
export function validateContent(input: unknown): ContentValidation {
  const errors: ContentError[] = [];
  const fail = (code: ContentErrorCode, path: string, message: string): void => { errors.push({ code, path, message }); };
  const shape = (v: unknown, keys: readonly string[], path: string): v is JsonRecord => {
    if (hasShape(v, keys)) return true;
    fail('shape', path, `Expected a plain data record with exactly: ${keys.join(', ')}.`); return false;
  };
  const string = (v: unknown, path: string): v is string => {
    if (typeof v === 'string' && v.trim().length > 0) return true;
    fail('shape', path, 'Expected a nonempty string.'); return false;
  };
  const number = (v: unknown, bound: keyof typeof CONTENT_BOUNDS, path: string): v is number => {
    const { min, max } = CONTENT_BOUNDS[bound];
    if (typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max) return true;
    fail('number', path, `Expected a finite safe integer in ${bound} [${min}, ${max}].`); return false;
  };
  const array = (v: unknown, path: string): v is unknown[] => {
    if (isDenseArray(v)) return true;
    fail('shape', path, 'Expected a dense data array.'); return false;
  };
  const prefixedId = (v: unknown, prefix: string): v is string => typeof v === 'string' && new RegExp(`^${prefix}:[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`).test(v);
  const groups = ['maps', 'heroes', 'enemies', 'terrains', 'assets', 'abilities'] as const;
  if (!shape(input, groups, '$')) return { ok: false, errors };
  const catalogs: Record<typeof groups[number], JsonRecord> = { maps: {}, heroes: {}, enemies: {}, terrains: {}, assets: {}, abilities: {} };
  for (const group of groups) {
    const v = input[group];
    if (!isPlainRecord(v) || !hasShape(v, Object.keys(v))) { fail('shape', group, 'Expected a catalog of plain enumerable data entries.'); continue; }
    catalogs[group] = v;
    const fixed = group === 'heroes' ? HERO_IDS : group === 'enemies' ? ENEMY_IDS : group === 'terrains' ? FIRST_MAP_TERRAIN_IDS :
      group === 'abilities' ? Object.keys(attackAbilities) : undefined;
    if (fixed) for (const id of fixed) if (!Object.hasOwn(v, id)) fail('id', `${group}.${id}`, 'Required definition is missing.');
    const seen = new Set<string>();
    for (const [key, record] of Object.entries(v)) {
      const path = `${group}.${key}`;
      if (fixed ? !fixed.some(id => id === key) : !prefixedId(key, group === 'maps' ? 'map' : 'asset')) fail('id', path, 'Unknown or malformed catalog ID.');
      if (!isPlainRecord(record) || !hasShape(record, Object.keys(record))) { fail('shape', path, 'Expected a plain definition without accessors or hidden fields.'); continue; }
      if (record.id !== key) fail('id', `${path}.id`, 'Record ID must equal its catalog key.');
      if (typeof record.id === 'string') {
        if (seen.has(record.id)) fail('duplicateId', `${path}.id`, 'Record ID is already defined in this catalog.');
        seen.add(record.id);
      }
    }
  }
  // Shape-invalid catalog entries are never read by subsequent passes.
  const entries = (group: typeof groups[number]): [string, JsonRecord][] => Object.entries(catalogs[group]).filter((entry): entry is [string, JsonRecord] => isPlainRecord(entry[1]) && hasShape(entry[1], Object.keys(entry[1])));
  const ref = (id: unknown, group: typeof groups[number], path: string, kind?: string): JsonRecord | undefined => {
    const value = typeof id === 'string' && Object.hasOwn(catalogs[group], id) ? catalogs[group][id] : undefined;
    if (isPlainRecord(value) && hasShape(value, Object.keys(value)) && (!kind || value.kind === kind)) return value;
    fail('reference', path, `Expected an existing ${kind ?? group} reference in ${group}.`); return undefined;
  };
  for (const [id, ability] of entries('abilities')) {
    const path = `abilities.${id}`;
    const keys = ability.kind === 'magicMissile' ? ['id','kind','owners','casterLevel','rangeMin','rangeMax'] : ['id','kind','owners','rangeMin','rangeMax','baseDamage','uphillDamage'];
    if (ability.kind === 'guardedAttack') keys.push('attackPenalty','armorClassBonus');
    if (!shape(ability, keys, path)) continue;
    const expected = Object.hasOwn(attackAbilities, id) ? attackAbilities[id as keyof typeof attackAbilities] : undefined;
    if (!expected || ability.kind !== expected.kind) fail('shape', `${path}.kind`, 'Expected the approved ability kind.');
    if (ability.kind === 'guardedAttack') for (const field of ['attackPenalty','armorClassBonus'] as const)
      if (ability[field] !== FIGHTING_DEFENSIVELY[field]) fail('number', `${path}.${field}`, `Expected ${FIGHTING_DEFENSIVELY[field]}.`);
    if (ability.kind === 'magicMissile') {
      for (const [field, max] of [['casterLevel',20],['rangeMin',20],['rangeMax',20]] as const)
        if (typeof ability[field] !== 'number' || !Number.isSafeInteger(ability[field]) || ability[field] < 1 || ability[field] > max)
          fail('number', `${path}.${field}`, `Expected an integer in [1,${max}].`);
    } else for (const field of ['rangeMin','rangeMax','baseDamage','uphillDamage'] as const) {
      const value = ability[field];
      const { min, max } = ATTACK_BOUNDS[field];
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
        fail('number', `${path}.${field}`, `Expected a safe integer in [${min},${max}].`);
    }
    if (typeof ability.rangeMin === 'number' && typeof ability.rangeMax === 'number' && ability.rangeMin > ability.rangeMax)
      fail('number', path, 'Minimum range must not exceed maximum range.');
    if (array(ability.owners, `${path}.owners`) && (!expected ||
      ability.owners.length !== expected.owners.length || ability.owners.some((owner, i) => owner !== expected.owners[i])))
      fail('reference', `${path}.owners`, 'Expected the approved ability owners in their defined order.');
  }
  for (const group of ['heroes', 'enemies'] as const) for (const [id, unit] of entries(group)) {
    const path = `${group}.${id}`;
    if (!shape(unit, ['id','kind','stats','spriteAssetId','portraitAssetId'], path)) continue;
    if (unit.kind !== (group === 'heroes' ? 'hero' : 'enemy')) fail('shape', `${path}.kind`, `Expected ${group === 'heroes' ? 'hero' : 'enemy'}.`);
    const stats = ['maxHp','move','jump','accuracy','armorClass','power','dexterity','will'] as const;
    if (shape(unit.stats, stats, `${path}.stats`)) for (const stat of stats) number(unit.stats[stat], stat, `${path}.stats.${stat}`);
    ref(unit.spriteAssetId, 'assets', `${path}.spriteAssetId`, 'unit-sprite');
    ref(unit.portraitAssetId, 'assets', `${path}.portraitAssetId`, 'portrait');
  }
  for (const [id, terrain] of entries('terrains')) {
    const path = `terrains.${id}`;
    if (!shape(terrain, ['id','surfaceAssetId','moveCost','walkable','blocksLineOfSight'], path)) continue;
    number(terrain.moveCost, 'moveCost', `${path}.moveCost`);
    for (const key of ['walkable','blocksLineOfSight']) if (typeof terrain[key] !== 'boolean') fail('shape', `${path}.${key}`, 'Expected boolean.');
    ref(terrain.surfaceAssetId, 'assets', `${path}.surfaceAssetId`, 'terrain-surface');
  }
  for (const [id, asset] of entries('assets')) {
    const path = `assets.${id}`;
    const keys = ['id','kind','sourcePath','runtimePath','sourceWidth','sourceHeight','runtimeWidth','runtimeHeight','format','provenance'];
    if (asset.kind === 'terrain-surface') keys.push('textureSpec');
    else if (asset.kind === 'unit-sprite' || asset.kind === 'prop') keys.push('anchor');
    else if (asset.kind !== 'portrait') { fail('shape', `${path}.kind`, 'Unknown asset kind.'); continue; }
    if (!shape(asset, keys, path)) continue;
    for (const key of ['sourcePath','runtimePath']) string(asset[key], `${path}.${key}`);
    for (const key of ['sourceWidth','sourceHeight','runtimeWidth','runtimeHeight']) number(asset[key], 'imageDimension', `${path}.${key}`);
    if (asset.format !== 'png') fail('shape', `${path}.format`, 'Expected png.');
    if (asset.kind === 'terrain-surface') {
      if (shape(asset.textureSpec, Object.keys(TERRAIN_TEXTURE_SPEC), `${path}.textureSpec`)) for (const [key, value] of Object.entries(TERRAIN_TEXTURE_SPEC)) if (asset.textureSpec[key] !== value) fail('shape', `${path}.textureSpec.${key}`, `Expected ${String(value)}.`);
      for (const key of ['sourceWidth','sourceHeight','runtimeWidth','runtimeHeight'] as const) if (asset[key] !== TERRAIN_TEXTURE_SPEC[key]) fail('shape', `${path}.${key}`, `Expected surface dimension ${TERRAIN_TEXTURE_SPEC[key]}.`);
    } else if (asset.kind === 'unit-sprite' || asset.kind === 'prop') {
      if (shape(asset.anchor, ['x','y'], `${path}.anchor`)) for (const [axis, dimension] of [['x','sourceWidth'],['y','sourceHeight']] as const) {
        const n = asset.anchor[axis];
        if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0 || typeof asset[dimension] !== 'number' || n >= asset[dimension]) fail('coordinate', `${path}.anchor.${axis}`, 'Expected a safe integer source-pixel position inside the source rectangle.');
      }
    }
    const p = asset.provenance;
    if (!isPlainRecord(p) || !hasShape(p, Object.keys(p))) { fail('shape', `${path}.provenance`, 'Expected plain provenance data.'); continue; }
    const common = ['origin','sourceSha256','rightsNote','productionNotes'];
    if (p.origin === 'generated') common.push('tool','generatedAt','prompt','referenceAssetIds');
    else if (p.origin === 'canonical') common.push('repository','revision','originalPath');
    else { fail('shape', `${path}.provenance.origin`, 'Expected canonical or generated.'); continue; }
    if (!shape(p, common, `${path}.provenance`)) continue;
    for (const key of common.filter(k => k !== 'referenceAssetIds')) string(p[key], `${path}.provenance.${key}`);
    if (typeof p.sourceSha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(p.sourceSha256)) fail('shape', `${path}.provenance.sourceSha256`, 'Expected a 64-digit SHA-256 hex digest.');
    if (asset.kind === 'terrain-surface' && p.origin !== 'generated') fail('shape', `${path}.provenance.origin`, 'Terrain surfaces require generated provenance.');
    if (p.origin === 'generated' && array(p.referenceAssetIds, `${path}.provenance.referenceAssetIds`)) p.referenceAssetIds.forEach((id, i) => ref(id, 'assets', `${path}.provenance.referenceAssetIds[${i}]`));
  }
  for (const [id, map] of entries('maps')) {
    const path = `maps.${id}`;
    if (!shape(map, ['id','width','height','cells','spawns'], path)) continue;
    const widthOK = number(map.width, 'mapWidth', `${path}.width`);
    const heightOK = number(map.height, 'mapHeight', `${path}.height`);
    const position = (v: JsonRecord, p: string): boolean => {
      const xOK = number(v.x, 'coordinate', `${p}.x`), yOK = number(v.y, 'coordinate', `${p}.y`);
      if (!xOK || !yOK || !widthOK || !heightOK) return false;
      if ((v.x as number) >= (map.width as number) || (v.y as number) >= (map.height as number)) { fail('coordinate', p, 'Position must lie inside this map.'); return false; }
      return true;
    };
    const cells = new Map<string, JsonRecord>();
    if (array(map.cells, `${path}.cells`)) {
      map.cells.forEach((cell, i) => {
        const p = `${path}.cells[${i}]`;
        const keys = ['x','y','elevation','terrainId'];
        if (isPlainRecord(cell) && Object.hasOwn(cell, 'propAssetId')) keys.push('propAssetId');
        if (!shape(cell, keys, p)) return;
        number(cell.elevation, 'elevation', `${p}.elevation`);
        ref(cell.terrainId, 'terrains', `${p}.terrainId`);
        if (Object.hasOwn(cell, 'propAssetId')) ref(cell.propAssetId, 'assets', `${p}.propAssetId`, 'prop');
        if (position(cell, p)) {
          const key = `${cell.x},${cell.y}`;
          if (cells.has(key)) fail('duplicateCell', p, 'Coordinate is already defined.');
          cells.set(key, cell);
        }
      });
      if (widthOK && heightOK && cells.size !== (map.width as number) * (map.height as number)) fail('cells', `${path}.cells`, 'Every map coordinate must be defined exactly once.');
    }
    const spawnIds = new Set<number>(), occupied = new Set<string>();
    if (array(map.spawns, `${path}.spawns`)) map.spawns.forEach((spawn, i) => {
      const p = `${path}.spawns[${i}]`;
      if (!shape(spawn, ['id','side','unitId','x','y'], p)) return;
      if (number(spawn.id, 'spawnId', `${p}.id`)) {
        if (spawnIds.has(spawn.id)) fail('duplicateId', `${p}.id`, 'Spawn ID is already used in this map.');
        spawnIds.add(spawn.id);
      }
      if (spawn.side === 'heroes' || spawn.side === 'enemies') ref(spawn.unitId, spawn.side, `${p}.unitId`);
      else fail('shape', `${p}.side`, 'Expected heroes or enemies.');
      if (!position(spawn, p)) return;
      const key = `${spawn.x},${spawn.y}`, cell = cells.get(key);
      if (!cell) fail('reference', p, 'Spawn must reference a defined map cell.');
      else {
        const terrain = ref(cell.terrainId, 'terrains', `${p}.terrainId`);
        if (terrain && terrain.walkable !== true) fail('walkability', p, 'Spawn cell must be walkable.');
      }
      if (occupied.has(key)) fail('occupiedSpawn', p, 'Another spawn occupies this cell.');
      occupied.add(key);
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true, catalog: input as unknown as ContentCatalog };
}
