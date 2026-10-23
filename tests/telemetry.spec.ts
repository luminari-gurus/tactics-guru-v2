import { test, expect, type Page } from '@playwright/test';
import { readSession, playCommand } from './helpers/battlePolicy';
import { playerDecision } from './helpers/playerPolicy';
import { runContext } from './helpers/runItemFixtures';
import { runBattleCatalog } from '../src/domain/runSaveEnvelope';
const endpoint = 'https://us.i.posthog.com/**';
type Event = { event: string; properties: Record<string, any> };
async function ingest(page: Page, blocked = false) {
  const events: Event[] = [];
  await page.route(endpoint, async route => {
    const body = route.request().postData();
    if (body) {
      const parsed = JSON.parse(body);
      events.push(...(Array.isArray(parsed) ? parsed : parsed.batch ?? [parsed]));
    }
    if (blocked) await route.abort(); else await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
  });
  return events;
}
test('mocked ingestion sees accepted run, rewards, completion and continue without replaying boundaries', async ({ page }) => {
  test.setTimeout(300000);
  const events = await ingest(page);
  await page.goto('/run?token=private#private'); await page.locator('#run-start').click();
  await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  for (let index = 0; index < 3; index++) {
    for (let step = 0; step < 600; step++) {
      await expect.poll(async () => await page.locator('#run-screen').isVisible() || (await readSession(page))?.phase === 'player').toBe(true);
      if (await page.locator('#run-screen').isVisible()) break;
      const state = JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
      const battle = await readSession(page);
      await playCommand(page, playerDecision(battle.state, runBattleCatalog(state.items, runContext)!));
    }
    const state = JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
    if(index===2)expect(['victory','defeat']).toContain(state.items.run.phase);
    else expect(state.items.run.phase).toBe('reward');
    if (index < 2) {
      const item = (state.items.offer.options.find((option: { itemId: string }) => option.itemId === 'item:healing_draught') ?? state.items.offer.options[0]).itemId;
      await page.getByRole('button', { name: `Claim ${runContext.items[item as keyof typeof runContext.items].label}`, exact: true }).click();
      await page.locator('#item-confirm').click();
      const snapshot = async () => JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
      for (const equipment of (await snapshot()).items.ownership.equipment) {
        const now = await snapshot();
        if (now.items.ownership.assignments.some((a: { instanceId: string }) => a.instanceId === equipment.instanceId)) continue;
        const def = runContext.items[equipment.itemId as keyof typeof runContext.items];
        const hero = now.items.run.party.find((h: { hp: number; heroId: any }) => h.hp > 0 && def.eligibleHeroes.includes(h.heroId));
        if (hero) {
          await page.locator(`[id="target-${equipment.instanceId}"]`).selectOption(hero.heroId);
          await page.getByRole('button', { name: `Equip ${def.label}`, exact: true }).click(); await page.locator('#item-confirm').click();
        }
      }
      for (const hero of (await snapshot()).items.run.party) {
        const now = await snapshot();
        if (hero.hp === 0 || hero.hp === hero.maxHp || !now.items.ownership.consumables.length) continue;
        await page.locator('[id="target-item:healing_draught"]').selectOption(hero.heroId);
        await page.getByRole('button', { name: 'Use Healing Draught', exact: true }).click(); await page.locator('#item-confirm').click();
      }
      await page.reload(); await page.locator('#run-continue').click();
      await page.locator('#run-start-encounter').click();
      await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
    }
  }
  await expect.poll(() => events.filter(e => e.event === 'run_outcome').length).toBe(1);
  const terminal=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!).items.run.phase;
  expect(events.find(e=>e.event==='run_outcome')!.properties).toMatchObject({phase:terminal,outcome:terminal,encounter:2});
  await page.reload(); await page.locator('#run-continue').click();
  await expect.poll(() => events.filter(e => e.event === 'run_continued').length).toBe(3);
  expect(events.filter(e => e.event === 'run_started')).toHaveLength(1);
  expect(events.filter(e => e.event === 'encounter_started')).toHaveLength(3);
  expect(events.filter(e => e.event === 'encounter_outcome')).toHaveLength(3);
  expect(events.filter(e => e.event === 'reward_chosen')).toHaveLength(2);
  expect(events.filter(e => e.event === 'run_outcome')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain('private');
  const errors = events.filter(e => e.event === '$exception'); expect(errors.length).toBeGreaterThan(0);
  if (process.env.PLAYWRIGHT_TELEMETRY_DEV !== 'true') expect(errors[0].properties.$exception_list[0].stacktrace.frames.length).toBeGreaterThan(0);
});
test('blocked ingestion leaves battle continue and save working', async ({ page }) => {
  await ingest(page, true); await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const before = (await readSession(page)).state;
  await page.locator('#battle-next').click(); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const after = (await readSession(page)).state; expect(after.commandCount).toBeGreaterThan(before.commandCount);
  await page.reload(); await page.locator('#save-continue').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player'); expect((await readSession(page)).state).toEqual(after);
});
for (const signal of ['opt-out','DNT','GPC'] as const) test(`${signal} prevents parser loading and all collection`, async ({ page }) => {
  const events = await ingest(page); const sdk: string[] = []; page.on('request', r => { if (r.url().includes('/transport-')) sdk.push(r.url()); });
  await page.addInitScript(signal => {
    if (signal === 'opt-out') localStorage.setItem('tactics-guru:telemetry-opt-out', 'true');
    else Object.defineProperty(navigator, signal === 'DNT' ? 'doNotTrack' : 'globalPrivacyControl', { value: signal === 'DNT' ? '1' : true });
  }, signal);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect(events).toEqual([]); expect(sdk).toEqual([]);
});
test('uncaught errors and rejections are sanitized and duplicate objects are reported once', async ({ page }) => {
  const events = await ingest(page);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect.poll(() => events.filter(e => e.event === '$exception').length).toBe(1); // Controlled verification.
  await page.evaluate(() => {
    const error = new TypeError('private error with save contents');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    window.dispatchEvent(new ErrorEvent('error', { error }));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: error }));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: { payload: 'private save' } }));
  });
  await expect.poll(() => events.filter(e => e.event === '$exception').length).toBe(3);
  expect(events.filter(e => e.properties.failure === 'runtime_error')).toHaveLength(1);
  expect(events.filter(e => e.properties.failure === 'unhandled_rejection')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain('private');
});
test('failed parser loading preserves gameplay and saving without a reporting loop', async ({ page }) => {
  const events = await ingest(page);
  await page.route(process.env.PLAYWRIGHT_TELEMETRY_DEV === 'true' ? '**/src/telemetry/transport.ts' : '**/assets/transport-*.js', route => route.abort());
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await page.locator('#battle-next').click(); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect(page.locator('#battle-persistence')).toContainText('saved'); expect(events).toEqual([]);
});
test('recovery inspections and retries report no raw data and no duplicate failure event', async ({ page }) => {
  const events = await ingest(page);
  await page.addInitScript(() => localStorage.setItem('tactics-guru:phaser:run:primary:v1','private broken save'));
  await page.goto('/run'); await page.locator('#run-recovery').click();
  await page.locator('#run-retry-save').click(); await page.locator('#run-retry-save').click();
  await expect.poll(() => events.filter(e => e.event === 'save_recovery_failed').length).toBe(1);
  expect(JSON.stringify(events)).not.toContain('private');
});
test('privacy controls stop collection immediately, persist across routes, and allow future visits', async ({ page }) => {
  const events = await ingest(page);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect.poll(() => events.filter(e => e.event === 'battle_started').length).toBe(1);
  const privacy = page.locator('#battle-scroll .telemetry-preferences');
  await privacy.locator('summary').focus(); await page.keyboard.press('Enter');
  const choice = privacy.getByRole('checkbox', { name: 'Allow anonymous analytics and error reports' });
  await expect(choice).toBeChecked();
  const labelBox = await privacy.locator('label').boundingBox(); expect(labelBox!.height).toBeGreaterThanOrEqual(44);
  await choice.scrollIntoViewIfNeeded(); await expect(choice).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath('privacy-battle.png') });
  const before = (await readSession(page)).state;
  await choice.uncheck(); await expect(privacy.getByRole('status')).toContainText('off');
  expect((await readSession(page)).state).toEqual(before);
  const count = events.length;
  await page.locator('#battle-next').click(); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await page.goto('/run'); const runPrivacy = page.locator('#run-screen .telemetry-preferences');
  await runPrivacy.locator('summary').click();
  await expect(runPrivacy.getByRole('checkbox')).not.toBeChecked(); expect(events).toHaveLength(count);
  await runPrivacy.getByRole('checkbox').check(); await expect(runPrivacy.getByRole('status')).toContainText('later visit');
  expect(events).toHaveLength(count);
  await page.goto('/map'); await expect(page.locator('#map-page .telemetry-preferences')).toBeVisible();
  await expect.poll(() => events.filter(e => e.event === 'app_entered' && e.properties.route === 'map').length).toBe(1);
  await page.locator('#map-page .telemetry-preferences summary').click();
  await page.getByRole('checkbox').scrollIntoViewIfNeeded(); await expect(page.getByRole('checkbox')).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath('privacy-map.png') });
  await page.getByRole('checkbox').uncheck();
  await page.reload(); await expect(page.locator('#map-page .telemetry-preferences')).toBeVisible();
  expect(events.filter(e => e.event === 'app_entered' && e.properties.route === 'map')).toHaveLength(1);
});
test('privacy opt-out applies to another open tab without touching saves', async ({ page, context }) => {
  await ingest(page); await page.goto('/run'); await page.locator('#run-start').click();
  const snapshot = await page.locator('#game').getAttribute('data-run-snapshot');
  const other = await context.newPage(); await ingest(other); await other.goto('/map');
  const privacy = page.locator('#run-screen .telemetry-preferences');
  await privacy.locator('summary').click(); await privacy.getByRole('checkbox').uncheck();
  const otherPrivacy = other.locator('.telemetry-preferences'); await otherPrivacy.locator('summary').click();
  await expect(otherPrivacy.getByRole('checkbox')).not.toBeChecked(); await expect(otherPrivacy.getByRole('status')).toContainText('off');
  expect(await page.locator('#game').getAttribute('data-run-snapshot')).toBe(snapshot); await other.close();
});


test('production ingestion receives generation latency and resume metrics without layout identifiers',async({page})=>{
  const events=await ingest(page);
  await page.goto('/run?private=seed#private');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const samples=()=>events.filter(e=>e.event==='battlefield_generation_measured');
  await expect.poll(()=>samples().length).toBe(1);
  const first=samples()[0].properties;
  expect(first).toMatchObject({route:'run',encounter:0,generation_context:'entry',generation_status:'generated',biome:'desert',generator_version:1,profile_version:'desert-v1'});
  expect(first.generation_duration_ms).toBeGreaterThanOrEqual(0);expect(first.generation_duration_ms).toBeLessThan(600000);
  expect([1,2,3,4]).toContain(first.generation_attempts);expect(typeof first.release).toBe('string');
  for(const key of ['seed','layoutSeed','mapHash','runId','cells','spawns'])expect(first).not.toHaveProperty(key);
  const snapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
  await page.reload();await page.locator('#run-continue').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect.poll(()=>samples().length).toBe(2);expect(samples()[1].properties.generation_context).toBe('resume');
  expect(JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!).activeBattle).toEqual(snapshot.activeBattle);
  expect(JSON.stringify(samples())).not.toContain('private');
});

test('generated encounters still start with collection opted out',async({page})=>{
  const events=await ingest(page);
  await page.addInitScript(()=>localStorage.setItem('tactics-guru:telemetry-opt-out','true'));
  await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(events).toEqual([]);
});
