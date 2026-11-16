import { expect, type Page } from '@playwright/test';
import type { BattleState } from '../../src/domain/types';
import { confirmRestart, playCommand, readSession } from './battlePolicy';
import { playerDecision } from './playerPolicy';

/** Reach a legal boundary through the live UI now that public battles start fresh. */
export async function reachStandaloneBoundary(page: Page, target: BattleState) {
  await page.goto('./?game=battle');
  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-phase', 'player');
  for (let seed = 1; seed < target.seed; seed++) {
    await page.locator('#fit-restart').click();
    await confirmRestart(page);
    await expect(game).toHaveAttribute('data-phase', 'player');
  }
  for (;;) {
    const { state } = await readSession(page);
    if (state.commandCount === target.commandCount) {
      expect(state).toEqual(target);
      return;
    }
    expect(state.commandCount).toBeLessThan(target.commandCount);
    await playCommand(page, playerDecision(state));
    await expect(game).toHaveAttribute('data-phase', 'player');
  }
}
