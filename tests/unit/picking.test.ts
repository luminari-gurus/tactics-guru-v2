import { describe, it, expect } from 'vitest';
import { pickTile, screenToBoard, constrainView } from '../../src/geometry/picking';
import { projectTile, tileFaces } from '../../src/geometry/iso';

describe('visible solid picking', () => {
  const tiles = [{ x: 0, y: 0, elevation: 0 }, { x: 1, y: 0, elevation: 2 }];
  it('uses frontmost columns for overlapping elevation and side faces', () => {
    expect(pickTile(tiles, projectTile(tiles[1]!))).toEqual(tiles[1]);
    expect(pickTile(tiles, { x: 20, y: 0 })).toEqual(tiles[1]); // Raised side hides ground top.
    expect(pickTile(tiles, { x: 40, y: -48 })).toEqual(tiles[1]); // Exact elevated edge.
    expect(pickTile(tiles, { x: 40, y: -48.01 })).toBeNull();
    const face = tileFaces(tiles[1]!).right;
    expect(pickTile(tiles, { x: face.reduce((s,p) => s+p.x,0)/4, y: face.reduce((s,p) => s+p.y,0)/4 })).toEqual(tiles[1]);
    expect(pickTile(tiles, { x: 1000, y: 1000 })).toBeNull();
  });
  it('inverts pan and zoom without pixel-density assumptions', () => {
    expect(screenToBoard({x: 140,y: 280}, {x: 100,y: 200,scale: 2})).toEqual({x:20,y:40});
  });
  it('bounds scale and keeps board inside reachable viewport', () => {
    expect(constrainView({x:9999,y:-9999,scale:99}, {left:-40,right:40,top:-20,bottom:20}, {width:400,height:600}, 100, 1)).toEqual({x:360,y:270,scale:4});
  });
});
