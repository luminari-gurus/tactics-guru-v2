import { expect, it } from 'vitest';
import { fontSizeToFit, stripUnavailablePrefix, uniqueHubLines } from '../../src/ui/radialLabels';

it('does not repeat the hub reason and strips the Unavailable prefix', () => {
  expect(stripUnavailablePrefix('Unavailable: Out Of Range')).toBe('Out Of Range');
  expect(uniqueHubLines('Attack', 'Unavailable: Out Of Range', 'Unavailable: Out Of Range', true)).toEqual({
    title: 'Attack', subtitle: 'Out Of Range',
  });
  expect(uniqueHubLines('Move', 'Movement spent', 'Movement spent', true)).toEqual({
    title: 'Move', subtitle: 'Movement spent',
  });
  expect(uniqueHubLines('Inspect', 'Goblin Grunt', null, false)).toEqual({
    title: 'Inspect', subtitle: 'Goblin Grunt',
  });
  expect(uniqueHubLines('Cancel', 'Cancel', null, false)).toEqual({
    title: 'Cancel', subtitle: '',
  });
});

it('shrinks until the line fits and stops at the readable minimum', () => {
  expect(fontSizeToFit(px => px > 13, 10, 16)).toBeGreaterThanOrEqual(12.5);
  expect(fontSizeToFit(px => px > 13, 10, 16)).toBeLessThanOrEqual(13.25);
  expect(fontSizeToFit(() => false, 10, 16)).toBe(16);
  expect(fontSizeToFit(() => true, 10, 16)).toBe(10);
});
