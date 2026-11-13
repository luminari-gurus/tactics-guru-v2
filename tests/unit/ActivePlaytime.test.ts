import { expect, it, vi } from 'vitest';
import { ActivePlaytime, observeActivePlaytime } from '../../src/app/ActivePlaytime';

it('keeps a pause when checkpoint status causes a synchronous eligibility render', () => {
  vi.useFakeTimers();const document=new EventTarget();Object.assign(document,{hidden:false,hasFocus:()=>true});
  vi.stubGlobal('document',document);vi.stubGlobal('window',new EventTarget());
  const updates:boolean[]=[];let observer:ReturnType<typeof observeActivePlaytime>;
  observer=observeActivePlaytime(active=>{updates.push(active);if(!active)observer.sync();},()=>true);
  try {
    observer.sync();observer.pause();expect(updates).toEqual([true,false]);
    vi.advanceTimersByTime(10000);expect(updates).toEqual([true,false]);
  } finally {observer.dispose();vi.useRealTimers();vi.unstubAllGlobals();}
});

it('counts only eligible intervals and repeated pauses never add hidden/closed/menu time', () => {
  let now = 100; const clock = new ActivePlaytime(() => now);
  expect(clock.sample(false)).toBe(0);
  now = 1000; expect(clock.sample(true)).toBe(0);
  now = 1500; expect(clock.sample(true)).toBe(500);
  now = 1800; expect(clock.sample(false)).toBe(300);
  now = 9000; expect(clock.sample(false)).toBe(0);
  now = 10000; expect(clock.sample(true)).toBe(0);
  now = 10500; expect(clock.sample(false)).toBe(500);
  const resumed = new ActivePlaytime(() => now);
  now = 100000; expect(resumed.sample(true)).toBe(0);
});

it('retains fractional milliseconds without double-counting backwards or invalid samples', () => {
  let now = 1; const clock = new ActivePlaytime(() => now); clock.sample(true);
  now = 1.5; expect(clock.sample(true)).toBe(0);
  now = 2; expect(clock.sample(true)).toBe(1);
  now = 1; expect(clock.sample(true)).toBe(0);
  now = 3; expect(clock.sample(true)).toBe(1);
  now = NaN; expect(clock.sample(true)).toBe(0);
  now = 10; expect(clock.sample(true)).toBe(0);
  now = 15; expect(clock.sample(false)).toBe(5);
});
