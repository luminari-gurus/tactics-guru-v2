import { describe, expect, it } from 'vitest';
import { catalogFixture, mapFixture, statsFixture, surfaceFixture } from './fixtures/contentContract';
import { CONTENT_BOUNDS, FIRST_MAP_TERRAIN_IDS, TERRAIN_TEXTURE_SPEC } from '../../src/content/constants';

describe('first battle contract', () => {
  it('limits terrain to the forest map production brief', () => {
    expect(FIRST_MAP_TERRAIN_IDS).toEqual(['grass', 'grass_path', 'stone', 'forest', 'water']);
  });
  it('requires square top-down surfaces with no baked geometry', () => {
    expect(TERRAIN_TEXTURE_SPEC).toMatchObject({ sourceWidth: 1024, sourceHeight: 1024, runtimeWidth: 256, runtimeHeight: 256, format: 'png', orientation: 'top-down', cellsPerTexture: 1, opaque: true, edgeTreatment: 'seamless-repeat', bakedGeometry: false });
  });
  it('provides integer bounds for every stat and map dimension', () => {
    for (const { min, max } of Object.values(CONTENT_BOUNDS)) {
      expect(Number.isSafeInteger(min) && Number.isSafeInteger(max)).toBe(true);
      expect(min).toBeLessThanOrEqual(max);
    }
  });
});

it('keeps the synthetic fixture within declared bounds and references', () => {
  for (const [key, value] of Object.entries(statsFixture)) {
    const bounds = CONTENT_BOUNDS[key as keyof typeof statsFixture];
    expect(value).toBeGreaterThanOrEqual(bounds.min);
    expect(value).toBeLessThanOrEqual(bounds.max);
  }
  expect(mapFixture.cells).toHaveLength(mapFixture.width * mapFixture.height);
  expect(mapFixture.cells[0].terrainId).toBe('grass');
  expect(surfaceFixture.textureSpec).toEqual(TERRAIN_TEXTURE_SPEC);
});

it('resolves the synthetic catalog references through the real record shapes', () => {
  for (const cell of mapFixture.cells) expect(catalogFixture.terrains[cell.terrainId]).toBeDefined();
  for (const spawn of mapFixture.spawns) expect(catalogFixture.heroes[spawn.unitId]).toBeDefined();
  for (const terrain of Object.values(catalogFixture.terrains)) {
    expect(catalogFixture.assets[terrain.surfaceAssetId].kind).toBe('terrain-surface');
  }
  for (const unit of [...Object.values(catalogFixture.heroes), ...Object.values(catalogFixture.enemies)]) {
    expect(catalogFixture.assets[unit.spriteAssetId].kind).toBe('unit-sprite');
    expect(catalogFixture.assets[unit.portraitAssetId].kind).toBe('portrait');
  }
});
