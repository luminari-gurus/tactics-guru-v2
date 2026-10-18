import { expect, it } from 'vitest';
import { bindBoardInput } from '../../src/phaser/BoardInput';
import type { BoardInputTarget } from '../../src/phaser/BoardInput';

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

function board(fake: Fake): BoardInputTarget {
  return { pan: (dx: number) => { fake.board.pans.push(dx); }, select: () => { fake.board.selections++; }, zoom: () => {} };
}

function pointer(type: string, id: number, x: number, y: number): PointerEvent {
  return { type, pointerId: id, button: 0, clientX: x, clientY: y } as unknown as PointerEvent;
}

it('drops captured gestures at the drawable boundary, including outside release and wheel', () => {
  const f=fake();
  const cleanup=bindBoardInput(f.canvas,board(f),()=>({width:400,height:600}),p=>p.x>=20&&p.x<220&&p.y>=40&&p.y<300);
  f.listeners.get('pointerdown')!(pointer('pointerdown',1,100,100));
  f.listeners.get('pointermove')!(pointer('pointermove',1,240,100));
  f.listeners.get('pointermove')!(pointer('pointermove',1,110,100));
  f.listeners.get('pointerup')!(pointer('pointerup',1,100,100));
  expect(f.released).toContain(1);expect(f.board.pans).toEqual([]);expect(f.board.selections).toBe(0);
  // A release alone can cross the boundary without a delivered pointermove.
  f.listeners.get('pointerdown')!(pointer('pointerdown',2,219,100));
  f.listeners.get('pointerup')!(pointer('pointerup',2,221,100));
  expect(f.board.selections).toBe(0);
  f.listeners.get('pointerdown')!(pointer('pointerdown',3,100,100));
  f.listeners.get('wheel')!({clientX:240,clientY:100,deltaY:-100,preventDefault(){}} as unknown as Event);
  f.listeners.get('pointerup')!(pointer('pointerup',3,100,100));
  expect(f.board.selections).toBe(0);cleanup();
});

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

it('suppresses a trailing release after wheel zoom while a pointer is held', () => {
  const f = fake();
  bindBoardInput(f.canvas, board(f), () => ({ width: 400, height: 600 }));
  f.listeners.get('pointerdown')!(pointer('pointerdown', 1, 100, 100));
  f.listeners.get('wheel')!({ clientX: 100, clientY: 100, deltaY: -100, preventDefault() {} } as unknown as Event);
  f.listeners.get('pointerup')!(pointer('pointerup', 1, 100, 100));
  expect(f.board.selections).toBe(0);
  f.listeners.get('pointerdown')!(pointer('pointerdown', 2, 100, 100));
  f.listeners.get('pointerup')!(pointer('pointerup', 2, 100, 100));
  expect(f.board.selections).toBe(1);
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

it('modal guards and explicit reset discard held pointers before input is re-enabled',()=>{
  const f=fake();let enabled=true;
  const cleanup=bindBoardInput(f.canvas,board(f),()=>({width:400,height:600}),()=>enabled);
  f.listeners.get('pointerdown')!(pointer('pointerdown',1,100,100));
  enabled=false;cleanup.reset();
  f.listeners.get('pointermove')!(pointer('pointermove',1,150,100));
  f.listeners.get('pointerup')!(pointer('pointerup',1,150,100));
  expect(f.board.pans).toEqual([]);expect(f.board.selections).toBe(0);expect(f.captured.size).toBe(0);
  enabled=true;
  f.listeners.get('pointerup')!(pointer('pointerup',1,100,100));expect(f.board.selections).toBe(0);
  f.listeners.get('pointerdown')!(pointer('pointerdown',2,100,100));
  f.listeners.get('pointerup')!(pointer('pointerup',2,100,100));expect(f.board.selections).toBe(1);
  cleanup();
});

it('tracks native touch contacts without depending on touch pointer capture',()=>{
  const f=fake();
  Object.assign(f.canvas.ownerDocument,{defaultView:{TouchEvent:class {}}});
  const zooms:number[]=[];
  const cleanup=bindBoardInput(f.canvas,{...board(f),zoom:factor=>zooms.push(factor)},()=>({width:400,height:600}));
  const contact=(identifier:number,x:number,y=100)=>({identifier,clientX:x,clientY:y});
  const touch=(type:string,changedTouches:ReturnType<typeof contact>[])=>{
    const event={type,changedTouches,cancelable:true,preventDefault(){}} as unknown as Event;
    f.listeners.get(type)?.(event);
  };
  touch('touchstart',[contact(1,100),contact(2,140)]);
  // A browser delivering both streams must not register extra contacts.
  f.listeners.get('pointerdown')!(Object.assign(pointer('pointerdown',91,100,100),{pointerType:'touch'}));
  touch('touchmove',[contact(1,80),contact(2,160)]);
  expect(zooms.reduce((total,n)=>total*n,1)).toBeCloseTo(2);
  touch('touchend',[contact(2,160)]);
  const before=f.board.pans.reduce((sum,n)=>sum+n,0);
  touch('touchmove',[contact(1,100)]);
  expect(f.board.pans.reduce((sum,n)=>sum+n,0)-before).toBe(20);
  touch('touchend',[contact(1,100)]);
  expect(f.board.selections).toBe(0);expect(f.captured.size).toBe(0);
  touch('touchstart',[contact(3,100)]);cleanup.reset();touch('touchmove',[contact(3,140)]);touch('touchend',[contact(3,140)]);
  expect(f.board.selections).toBe(0);
  touch('touchstart',[contact(4,100)]);touch('touchend',[contact(4,100)]);expect(f.board.selections).toBe(1);
  touch('touchstart',[contact(5,100)]);touch('touchcancel',[contact(5,100)]);touch('touchend',[contact(5,100)]);expect(f.board.selections).toBe(1);
  cleanup();expect(f.listeners.size).toBe(0);
});
