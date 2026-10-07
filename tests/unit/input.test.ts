import { expect, it } from 'vitest';
import { bindBoardInput } from '../../src/phaser/BoardInput';
import type { BoardRenderer } from '../../src/phaser/BoardRenderer';

interface Fake {
  canvas: HTMLCanvasElement;
  listeners: Map<string, EventListener>;
  documentListeners: Map<string, EventListener>;
  captured: Set<number>;
  released: number[];
  document: { visibilityState: string };
  board: { pans: number[]; selections: number };
}

function fake(): Fake {
  const listeners = new Map<string, EventListener>();
  const documentListeners = new Map<string, EventListener>();
  const captured = new Set<number>();
  const released: number[] = [];
  const document = {
    visibilityState: 'visible',
    addEventListener: (name: string, fn: EventListener) => documentListeners.set(name, fn),
    removeEventListener: (name: string, fn: EventListener) => { expect(documentListeners.get(name)).toBe(fn); documentListeners.delete(name); },
  };
  const canvas = {
    style: { touchAction: 'auto' },
    ownerDocument: document,
    addEventListener: (name: string, fn: EventListener) => listeners.set(name, fn),
    removeEventListener: (name: string, fn: EventListener) => { expect(listeners.get(name)).toBe(fn); listeners.delete(name); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 600 }),
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => { captured.delete(id); released.push(id); },
  } as unknown as HTMLCanvasElement;
  const board = { pans: [] as number[], selections: 0 };
  return { canvas, listeners, documentListeners, captured, released, document, board };
}

function board(fake: Fake): BoardRenderer {
  return { pan: (dx: number) => { fake.board.pans.push(dx); }, select: () => { fake.board.selections++; } } as unknown as BoardRenderer;
}

function pointer(type: string, id: number, x: number, y: number): PointerEvent {
  return { type, pointerId: id, button: 0, clientX: x, clientY: y } as unknown as PointerEvent;
}

it('removes every listener and restores touch style on shutdown', () => {
  const f = fake();
  const cleanup = bindBoardInput(f.canvas, board(f), () => ({ width: 400, height: 600 }));
  expect(f.listeners.size).toBe(6);
  expect([...f.documentListeners.keys()]).toEqual(['visibilitychange']);
  expect(f.canvas.style.touchAction).toBe('none');
  cleanup();
  expect(f.listeners.size).toBe(0);
  expect(f.documentListeners.size).toBe(0);
  expect(f.canvas.style.touchAction).toBe('auto');
});

it('drops a pointer that is down when the page is hidden so resume cannot pan without a press', () => {
  const f = fake();
  bindBoardInput(f.canvas, board(f), () => ({ width: 400, height: 600 }));
  f.listeners.get('pointerdown')!(pointer('pointerdown', 7, 100, 100));
  f.listeners.get('pointermove')!(pointer('pointermove', 7, 140, 100));
  expect(f.board.pans).toEqual([40]);
  expect(f.captured.has(7)).toBe(true);
  f.document.visibilityState = 'hidden';
  f.documentListeners.get('visibilitychange')!(new Event('visibilitychange'));
  expect(f.released).toEqual([7]);
  f.document.visibilityState = 'visible';
  f.documentListeners.get('visibilitychange')!(new Event('visibilitychange'));
  f.listeners.get('pointermove')!(pointer('pointermove', 7, 200, 100));
  f.listeners.get('pointerup')!(pointer('pointerup', 7, 200, 100));
  expect(f.board.pans).toEqual([40]);
  expect(f.board.selections).toBe(0);
  f.listeners.get('pointerdown')!(pointer('pointerdown', 8, 50, 50));
  f.listeners.get('pointerup')!(pointer('pointerup', 8, 51, 50));
  expect(f.board.selections).toBe(1);
});

it('leaves pointer state alone while the page stays visible', () => {
  const f = fake();
  bindBoardInput(f.canvas, board(f), () => ({ width: 400, height: 600 }));
  f.listeners.get('pointerdown')!(pointer('pointerdown', 1, 100, 100));
  f.documentListeners.get('visibilitychange')!(new Event('visibilitychange'));
  expect(f.released).toEqual([]);
  f.listeners.get('pointermove')!(pointer('pointermove', 1, 130, 100));
  expect(f.board.pans).toEqual([30]);
});
