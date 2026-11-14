import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DelayedDungeonStep } from '../../src/app/DelayedDungeonStep';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('leaves a visible interval then runs one action without replaying it', async () => {
  const step = new DelayedDungeonStep(), run = vi.fn();
  step.schedule(run);
  await vi.advanceTimersByTimeAsync(399); expect(run).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(run).toHaveBeenCalledTimes(1);
  await vi.runAllTimersAsync(); expect(run).toHaveBeenCalledTimes(1);
});

it('cancels before the delay and does not resume merely because time passes', async () => {
  const step = new DelayedDungeonStep(), run = vi.fn();
  step.schedule(run); step.cancel();
  await vi.runAllTimersAsync(); expect(run).not.toHaveBeenCalled();
});

it('invalidates an action already waiting for exclusive save access', async () => {
  const step = new DelayedDungeonStep();
  let queued: (() => void) | undefined, published = 0;
  step.schedule(isCurrent => new Promise<void>(resolve => {
    queued = () => { if (isCurrent()) published++; resolve(); };
  }));
  await vi.advanceTimersByTimeAsync(400); expect(queued).toBeTypeOf('function');
  step.cancel(); queued!(); await Promise.resolve();
  expect(published).toBe(0);
});

it('replacing a pending victory cannot execute the older callback', async () => {
  const step = new DelayedDungeonStep(), first = vi.fn(), second = vi.fn();
  step.schedule(first); await vi.advanceTimersByTimeAsync(200); step.schedule(second);
  await vi.advanceTimersByTimeAsync(400);
  expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledTimes(1);
});

it('disposal invalidates both a waiting callback and future scheduling', async () => {
  const step = new DelayedDungeonStep(), run = vi.fn();
  step.schedule(run); step.dispose(); step.schedule(run);
  await vi.runAllTimersAsync(); expect(run).not.toHaveBeenCalled();
});

it('does not retry a rejected optional action', async () => {
  const step = new DelayedDungeonStep(), run = vi.fn(async () => { throw Error('unavailable'); });
  step.schedule(run); await vi.runAllTimersAsync();
  expect(run).toHaveBeenCalledTimes(1);
});
