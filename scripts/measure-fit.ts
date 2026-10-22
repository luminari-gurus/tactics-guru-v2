import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { arch, cpus, platform, release } from 'node:os';
import { chromium, devices, type Page } from '@playwright/test';
import { buildIdentity, collectorConditions, parseMeasureArgs, captureTarget, captureFailures } from './measure-fit-options.ts';
import { navigateCapture, battleGesturePoint } from './measure-fit-controls.ts';
import { evaluateCapture } from './measure-fit-evaluate.ts';
import { withPreview } from './measure-fit-preview.ts';

// `measure:fit [output] [--url <origin>]`: without --url the collector serves `dist` itself on the preview port;
// with --url (or FIT_URL) it measures that deployed origin and reads the served build from the page.
const options = parseMeasureArgs(process.argv.slice(2), process.env);
const { output } = options;
const target = captureTarget(options);
// Bind the collector actually loaded, before a long capture can overlap later source edits.
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim());
const collectorSha256 = Object.fromEntries(await Promise.all(['measure-fit.ts','measure-fit-preview.ts','measure-fit-options.ts','measure-fit-controls.ts','measure-fit-evaluate.ts'].map(async name => [name,createHash('sha256').update(await readFile(new URL(name,import.meta.url))).digest('hex')])));

async function buildFiles(directory: string): Promise<{ path: string; bytes: number; sha256: string }[]> {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await buildFiles(path));
    else {
      const content = await readFile(path);
      files.push({ path, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
    }
  }
  return files;
}

/** Presentation workload uses the same player controls as manual play; no state injection. */
async function settleWorkloads(page: Page) {
  await page.waitForFunction(() => {
    const snapshot = window.fitDiagnostics();
    return snapshot.workloads.every(window => window.untilMs < performance.now() - 50);
  });
}
async function battleWorkload(page: Page) {
  await page.locator('#game[data-phase="player"]').waitFor();
  await settleWorkloads(page);
  const workloadStartIndex = await page.evaluate(() => window.fitDiagnostics().workloads.length);
  const canvas = page.locator('canvas');
  const point = await battleGesturePoint(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, -100);
  await page.waitForFunction(() => window.fitDiagnostics().interactions.some(i=>i.action==='zoom'));
  await settleWorkloads(page);
  await page.mouse.down();
  await page.mouse.move(point.x+40, point.y-25, {steps:8});
  await page.mouse.up();
  await page.waitForFunction(() => window.fitDiagnostics().interactions.some(i=>i.action==='pan'));
  await settleWorkloads(page);
  // The first non-placeholder Move option is supplied by shared legal reachability.
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.locator('#battle-target').selectOption({index:1});
  await page.waitForFunction(() => window.fitDiagnostics().interactions.some(i=>i.action==='selection'));
  await settleWorkloads(page);
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.locator('#game[data-phase="player"]').waitFor();
  await page.waitForFunction(() => window.fitDiagnostics().workloads.some(w=>w.action==='move' && w.frames.count>0));
  await settleWorkloads(page);
  if (await canvas.count() !== 1) throw new Error('Unexpected battle canvas count');
  return { workloadStartIndex, actions: ['zoom: wheel -100', 'pan: drag +40/-25 in eight steps', 'selection: legal Move target', 'move: Review and Confirm'] };
}

await withPreview(options, async signal => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const interrupted = () => { void browser.close().catch(() => {}); };
  signal.addEventListener('abort', interrupted, { once: true });
  try {
    signal.throwIfAborted();
    const samples = [];
    const profiles = [
      { name: 'desktop', options: { ...devices['Desktop Chrome'] } },
      { name: 'mobile-portrait', options: { ...devices['Pixel 7'] } },
      { name: 'mobile-landscape', options: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
    ];
    let captureError: string | null = null;
    let failedCapture: {profile:string; repetition:number; cache:string; diagnostics:ReturnType<typeof window.fitDiagnostics>|null; errors:string[]} | null = null;
    try {
      for (const profile of profiles) {
        for (let repetition = 1; repetition <= 3; repetition++) {
          const context = await browser.newContext(profile.options);
          const page = await context.newPage();
          page.setDefaultTimeout(18000);
          page.setDefaultNavigationTimeout(30000);
          const errors: string[] = [];
          let responses: Promise<{url:string;status:number;encoding:string;contentLength:string|null;cacheControl:string|null}>[] = [];
          let currentCache = 'cold';
          try {
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
            page.on('response', response => responses.push(response.allHeaders().then(headers => ({
              url:response.url(),status:response.status(),encoding:headers['content-encoding'] ?? 'identity',
              contentLength:headers['content-length'] ?? null,cacheControl:headers['cache-control'] ?? null,
            }))));
            // No routing/interception: Playwright routing would disable the HTTP cache.
            for (const cache of ['cold', 'warm'] as const) {
              currentCache = cache;
              responses = [];
              await navigateCapture(page, target, cache);
              await page.waitForFunction(() => window.fitDiagnostics?.().controlsUsableMs !== null && window.fitDiagnostics?.().frames.count >= 120);
              const idleDiagnostics = await page.evaluate(() => window.fitDiagnostics());
              const workload = options.scene === 'battle' ? await battleWorkload(page) : { actions: [], workloadStartIndex: 0 };
              const diagnostics = await page.evaluate(() => window.fitDiagnostics());
              // Navigation duration includes load-event work; retain the actual
              // DNS/connection/response timestamps instead of calling it HTML latency.
              const navigationTiming = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.toJSON() ?? null);
              const responseInventory = await Promise.all(responses);
              samples.push({ profile: profile.name, repetition, cache, idleDiagnostics, diagnostics, navigationTiming, ...workload, responseInventory, errors: [...errors] });
            }
          } catch (error) {
            const diagnostics = await page.evaluate(()=>window.fitDiagnostics?.() ?? null).catch(()=>null);
            failedCapture = {profile:profile.name, repetition, cache:currentCache, diagnostics, errors:[...errors]};
            throw error;
          } finally { await context.close(); }
        }
      }
    } catch (error) { captureError = error instanceof Error ? error.message : String(error); }
    const failures = captureFailures(samples);
    if (captureError) failures.push(captureError);
    let measuredBuild = null;
    try { measuredBuild = buildIdentity(samples); } catch { /* retained below */ }
    const result = {
      measuredAt: new Date().toISOString(),
      sourceCommit,
      sourceDirty,
      // The build the pages were actually served from (baked `__BUILD_INFO__`); for a deployed origin this is the deployed commit.
      measuredBuild,
      browserVersion: browser.version(),
      collectorSha256,
      host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
      conditions: { ...collectorConditions(options), scene: options.scene, route: target.route, sceneUrl: target.url,
        warmStorage: 'four v2 save slots cleared in collector-owned context; HTTP cache preserved; fresh-start, not saved resume' },
      buildFiles: options.remote ? null : await buildFiles('dist'),
      failures,
      failedCapture,
      samples,
    };
    if (!options.remote && measuredBuild?.commit !== result.sourceCommit) failures.push(`dist was built from ${measuredBuild?.commit} but source is ${result.sourceCommit}; rebuild before measuring`);
    const evaluation = evaluateCapture(result);
    failures.push(...evaluation.captureFailures.filter(failure => !failures.includes(failure)));
    await mkdir(join(output, '..'), { recursive: true });
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Recorded ${samples.length} ${options.scene} cold/warm samples in ${output}`);
    for (const row of evaluation.rows) for (const warning of row.warnings) console.warn(`Load warning: ${row.profile}/${row.cache} repetition ${row.repetition}: ${warning.actual} ms > ${warning.threshold} ms`);
    for (const group of evaluation.loadingHistory) if (group.disposition === 'review-repeated-slow-loads') console.warn(`Review repeated slow loads: ${group.profile}/${group.cache}`);
    if (failures.length) throw new Error(failures.join('; '));
  } finally {
    signal.removeEventListener('abort', interrupted);
    await browser.close();
  }
});
