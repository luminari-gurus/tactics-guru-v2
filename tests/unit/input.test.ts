import { expect, it } from 'vitest';
import { bindBoardInput } from '../../src/phaser/BoardInput';
import type { BoardRenderer } from '../../src/phaser/BoardRenderer';

it('removes every listener and restores touch style on shutdown', () => {
  const listeners = new Map<string, EventListener>();
  const canvas = {
    style: {touchAction:'auto'},
    addEventListener: (name:string, fn:EventListener) => listeners.set(name,fn),
    removeEventListener: (name:string, fn:EventListener) => { expect(listeners.get(name)).toBe(fn); listeners.delete(name); },
  } as unknown as HTMLCanvasElement;
  const cleanup = bindBoardInput(canvas, {} as BoardRenderer, () => ({width:400,height:600}));
  expect(listeners.size).toBe(6);
  expect(canvas.style.touchAction).toBe('none');
  cleanup();
  expect(listeners.size).toBe(0);
  expect(canvas.style.touchAction).toBe('auto');
});
