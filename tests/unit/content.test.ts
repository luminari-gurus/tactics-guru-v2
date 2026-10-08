import { describe, expect, it } from 'vitest';
import { CONTENT_BOUNDS, TERRAIN_TEXTURE_SPEC } from '../../src/content/constants';
import { validateContent } from '../../src/content/validate';
import { catalogFixture } from './fixtures/contentContract';

const fixture = (): any => structuredClone(catalogFixture);
const cases: [string, (c: any) => void, string][] = [
  ['malformed root', c => { c.maps = []; }, 'shape'],
  ['missing catalog', c => { delete c.heroes; }, 'shape'],
  ['unknown field', c => { c.extra = true; }, 'shape'],
  ['unknown unit ID', c => { c.heroes.rogue = c.heroes.fighter; }, 'id'],
  ['missing fixed ID', c => { delete c.terrains.water; }, 'id'],
  ['invalid map ID', c => { c.maps.bad = c.maps['map:contract_fixture']; }, 'id'],
  ['invalid asset ID', c => { c.assets['asset:bad-id']=c.assets['asset:fixture_grass']; }, 'id'],
  ['duplicate record IDs', c => { c.assets['asset:duplicate'] = c.assets['asset:fixture_grass']; }, 'duplicateId'],
  ['key ID mismatch', c => { c.heroes.fighter.id = 'mage'; }, 'id'],
  ['unresolved terrain', c => { c.maps['map:contract_fixture'].cells[0].terrainId = 'lava'; }, 'reference'],
  ['unresolved asset', c => { c.heroes.fighter.spriteAssetId = 'asset:missing'; }, 'reference'],
  ['wrong asset kind', c => { c.heroes.fighter.spriteAssetId = 'asset:fixture_portrait'; }, 'reference'],
  ['unresolved unit', c => { c.maps['map:contract_fixture'].spawns[0].unitId = 'missing'; }, 'reference'],
  ['wrong spawn family', c => { c.maps['map:contract_fixture'].spawns[0].unitId = 'goblin_grunt'; }, 'reference'],
  ['invalid side', c => { c.maps['map:contract_fixture'].spawns[0].side = 'neutral'; }, 'shape'],
  ['malformed stats', c => { delete c.heroes.fighter.stats.move; }, 'shape'],
  ['invalid discriminant', c => { c.heroes.fighter.kind = 'enemy'; }, 'shape'],
  ['invalid boolean', c => { c.terrains.grass.walkable = 1; }, 'shape'],
  ['missing cell', c => { c.maps['map:contract_fixture'].cells = []; }, 'cells'],
  ['duplicate cell', c => { c.maps['map:contract_fixture'].cells.push(c.maps['map:contract_fixture'].cells[0]); }, 'duplicateCell'],
  ['out of map cell', c => { c.maps['map:contract_fixture'].cells[0].x = 1; }, 'coordinate'],
  ['out of map spawn', c => { c.maps['map:contract_fixture'].spawns[0].y = 1; }, 'coordinate'],
  ['blocked spawn', c => { c.terrains.grass.walkable = false; }, 'walkability'],
  ['duplicate spawn ID', c => { c.maps['map:contract_fixture'].spawns.push({...c.maps['map:contract_fixture'].spawns[0]}); }, 'duplicateId'],
  ['occupied spawn', c => { c.maps['map:contract_fixture'].spawns.push({...c.maps['map:contract_fixture'].spawns[0], id: 2}); }, 'occupiedSpawn'],
  ['prop kind', c => { c.maps['map:contract_fixture'].cells[0].propAssetId = 'asset:fixture_portrait'; }, 'reference'],
  ['provenance reference', c => { c.assets['asset:fixture_grass'].provenance.referenceAssetIds = ['asset:missing']; }, 'reference'],
  ['bad hash', c => { c.assets['asset:fixture_grass'].provenance.sourceSha256 = 'bad'; }, 'shape'],
  ['empty metadata', c => { c.assets['asset:fixture_grass'].sourcePath = ''; }, 'shape'],
  ['malformed asset', c => { delete c.assets['asset:fixture_portrait'].runtimePath; }, 'shape'],
  ['unknown asset kind', c => { c.assets['asset:fixture_portrait'].kind='audio'; }, 'shape'],
  ['malformed anchor', c => { c.assets['asset:fixture_sprite'].anchor=[]; }, 'shape'],
  ['noninteger anchor', c => { c.assets['asset:fixture_sprite'].anchor.x=NaN; }, 'coordinate'],
  ['missing spawn cell', c => { c.maps['map:contract_fixture'].cells=[]; }, 'reference'],
  ['invalid provenance', c => { c.assets['asset:fixture_grass'].provenance.origin = 'unknown'; }, 'shape'],
  ['canonical surface', c => { c.assets['asset:fixture_grass'].provenance = canonical(); }, 'shape'],
  ['out of rectangle anchor', c => { c.assets['asset:fixture_sprite'].anchor.x = 1024; }, 'coordinate'],
];
const canonical = () => ({ origin: 'canonical', repository: 'fixture', revision: 'abc', originalPath: 'fake.png', sourceSha256: '0'.repeat(64), rightsNote: 'Synthetic', productionNotes: 'Test only' });

describe('runtime content validation', () => {
  it('accepts synthetic complete content without modifying it and returns a typed catalog', () => {
    const c = fixture(); const before = structuredClone(c);
    const result = validateContent(c);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.catalog).toBe(c);
    expect(c).toEqual(before);
  });
  it.each(cases)('rejects %s with an actionable typed error', (_, change, code) => {
    const c = fixture(); change(c); const before = structuredClone(c);
    const result = validateContent(c);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({code, path: expect.any(String), message: expect.any(String)})]));
    expect(c).toEqual(before);
  });
  it.each(Object.entries(CONTENT_BOUNDS))('checks all %s numeric bounds', (name, bound) => {
    const setters: Record<string, (c: any, n: unknown) => void> = {
      mapWidth: (c,n) => { c.maps['map:contract_fixture'].width=n; },
      mapHeight: (c,n) => { c.maps['map:contract_fixture'].height=n; },
      coordinate: (c,n) => { c.maps['map:contract_fixture'].cells[0].x=n; },
      elevation: (c,n) => { c.maps['map:contract_fixture'].cells[0].elevation=n; },
      spawnId: (c,n) => { c.maps['map:contract_fixture'].spawns[0].id=n; },
      moveCost: (c,n) => { c.terrains.grass.moveCost=n; },
      imageDimension: (c,n) => { c.assets['asset:fixture_portrait'].sourceWidth=n; },
    };
    const set = setters[name] ?? ((c: any,n: unknown) => { c.heroes.fighter.stats[name]=n; });
    for (const n of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER+1, 1.5, bound.min-1, bound.max+1, '1']) {
      const c=fixture(); set(c,n); const result=validateContent(c);
      expect(result.ok, `${name}=${String(n)}`).toBe(false);
      if (!result.ok) expect(result.errors.some(e => e.code==='number')).toBe(true);
    }
  });
  it.each(Object.entries(TERRAIN_TEXTURE_SPEC))('requires surface specification %s', (key, value) => {
    const c=fixture(); c.assets['asset:fixture_grass'].textureSpec[key] = typeof value === 'boolean' ? !value : 'wrong';
    expect(validateContent(c).ok).toBe(false);
  });
  it('requires actual surface dimensions and PNG format', () => {
    for (const key of ['sourceWidth','sourceHeight','runtimeWidth','runtimeHeight','format']) {
      const c=fixture(); c.assets['asset:fixture_grass'][key]=key==='format'?'jpeg':1;
      expect(validateContent(c).ok).toBe(false);
    }
  });
  it('accepts canonical sprite/portrait, props, enemy spawns and numeric endpoints', () => {
    const c=fixture(); c.assets['asset:fixture_sprite'].provenance=canonical();
    c.assets['asset:fixture_portrait'].provenance=canonical();
    c.assets['asset:prop']={...c.assets['asset:fixture_sprite'], id:'asset:prop', kind:'prop', anchor:{x:0,y:1023}};
    const map=c.maps['map:contract_fixture']; map.cells[0].propAssetId='asset:prop';
    map.spawns[0]={id:64, side:'enemies',unitId:'goblin_archer',x:0,y:0};
    for (const edge of ['min','max'] as const) {
      for (const stat of Object.keys(c.heroes.fighter.stats)) c.heroes.fighter.stats[stat]=CONTENT_BOUNDS[stat as keyof typeof CONTENT_BOUNDS][edge];
      expect(validateContent(c).ok).toBe(true);
    }
  });
  it('accepts complete maximum-size maps and rectangular maps with distinct repeated enemy spawns', () => {
    for (const [width,height] of [[32,32],[2,1],[1,2]]) {
      const c=fixture(); const map=c.maps['map:contract_fixture']; map.width=width; map.height=height;
      map.cells=Array.from({length:width*height}, (_,i) => ({x:i%width,y:Math.floor(i/width),elevation:4,terrainId:'grass'}));
      map.spawns=[{id:1,side:'enemies',unitId:'goblin_grunt',x:0,y:0},{id:64,side:'enemies',unitId:'goblin_grunt',x:width-1,y:height-1}];
      expect(validateContent(c).ok).toBe(true);
    }
  });
  it('accepts frozen inputs and terrain move-cost endpoints', () => {
    const freeze = (value: any): any => {
      if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
      return value;
    };
    for (const moveCost of [1,8]) {
      const c=fixture(); c.terrains.grass.moveCost=moveCost;
      expect(validateContent(freeze(c)).ok).toBe(true);
    }
  });
  it('accepts image dimension endpoints and anchor rectangle endpoints', () => {
    for (const n of [1,4096]) {
      const c=fixture(); const asset=c.assets['asset:fixture_sprite'];
      asset.sourceWidth=n; asset.sourceHeight=n; asset.runtimeWidth=n; asset.runtimeHeight=n; asset.anchor={x:n-1,y:0};
      expect(validateContent(c).ok).toBe(true);
    }
  });
  it('rejects accessors, sparse arrays and non-JSON objects without reading getters', () => {
    const c=fixture(); Object.defineProperty(c.heroes.fighter,'stats',{enumerable:true,get(){throw Error('read getter');}});
    expect(validateContent(c).ok).toBe(false);
    const sparse=fixture(); sparse.maps['map:contract_fixture'].cells=new Array(1);
    expect(validateContent(sparse).ok).toBe(false);
    for (const input of [null, undefined, 42, new Date(), Object.create(null)]) expect(validateContent(input).ok).toBe(false);
  });
});
