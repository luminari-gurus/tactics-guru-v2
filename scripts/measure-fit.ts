import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { arch, cpus, platform, release } from 'node:os';
import { chromium, devices, type Page } from '@playwright/test';
import { buildIdentity, collectorConditions, parseMeasureArgs, captureTarget, captureFailures } from './measure-fit-options.ts';

// `measure:fit [output] [--url <origin>]`: without --url the collector serves `dist` itself on the preview port;
// with --url (or FIT_URL) it measures that deployed origin and reads the served build from the page.
const options = parseMeasureArgs(process.argv.slice(2), process.env);
const { output, url } = options;
const target = captureTarget(options);
const server = options.remote ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'pipe' });
let serverError = '';
let previewListening = false;
server?.stdout.on('data', chunk => { if (String(chunk).includes(url)) previewListening = true; });
server?.stderr.on('data', chunk => { serverError += String(chunk); });
server?.on('error', error => { serverError += error.message; });

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
async function battleWorkload(page: Page) {
  await page.locator('#game[data-phase="player"]').waitFor();
  const canvas = page.locator('canvas');
  const point = await page.evaluate(() => {
    const panel = document.querySelector('#fit-panel')!.getBoundingClientRect();
    return {x:innerWidth/2, y:panel.bottom+(innerHeight-panel.bottom)*0.65};
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, -100);
  await page.waitForFunction(() => window.fitDiagnostics().interactions.some(i=>i.action==='zoom'));
  await page.mouse.down();
  await page.mouse.move(point.x+40, point.y-25, {steps:8});
  await page.mouse.up();
  await page.waitForFunction(() => window.fitDiagnostics().interactions.some(i=>i.action==='pan'));
  // The first non-placeholder Move option is supplied by shared legal reachability.
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.locator('#battle-target').selectOption({index:1});
  await page.waitForFunction(() => window.fitDiagnostics().interactions.some(i=>i.action==='selection'));
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.locator('#game[data-phase="player"]').waitFor();
  await page.waitForFunction(() => window.fitDiagnostics().workloads.some(w=>w.action==='move' && w.frames.count>0));
  if (await canvas.count() !== 1) throw new Error('Unexpected battle canvas count');
  return ['zoom: wheel -100', 'pan: drag +40/-25 in eight steps', 'selection: legal Move target', 'move: Review and Confirm'];
}

try {
  if (server) {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Preview exited: ${serverError}`);
      try { if (previewListening && (await fetch(url)).ok) { ready = true; break; } } catch { /* server starting */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('Preview failed to start');
  } else {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  }
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try {
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
          let currentCache = 'cold';
          try {
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
            // No routing/interception: Playwright routing would disable the HTTP cache.
            for (const cache of ['cold', 'warm'] as const) {
              currentCache = cache;
              if (cache === 'cold') await page.goto(target.url);
              else await page.reload();
              await page.getByRole('button', { name: target.restart }).waitFor();
              await page.waitForFunction(() => window.fitDiagnostics?.().controlsUsableMs !== null && window.fitDiagnostics?.().frames.count >= 120);
              const idleDiagnostics = await page.evaluate(() => window.fitDiagnostics());
              const actions = options.scene === 'battle' ? await battleWorkload(page) : [];
              const diagnostics = await page.evaluate(() => window.fitDiagnostics());
              samples.push({ profile: profile.name, repetition, cache, idleDiagnostics, diagnostics, actions, errors: [...errors] });
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
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
      // The build the pages were actually served from (baked `__BUILD_INFO__`); for a deployed origin this is the deployed commit.
      measuredBuild,
      browserVersion: browser.version(),
      host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
      conditions: { ...collectorConditions(options), scene: options.scene, sceneUrl: target.url },
      buildFiles: options.remote ? null : await buildFiles('dist'),
      failures,
      failedCapture,
      samples,
    };
    if (!options.remote && measuredBuild?.commit !== result.sourceCommit) failures.push(`dist was built from ${measuredBuild?.commit} but source is ${result.sourceCommit}; rebuild before measuring`);
    await mkdir(join(output, '..'), { recursive: true });
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Recorded ${samples.length} ${options.scene} cold/warm samples in ${output}`);
    if (failures.length) throw new Error(failures.join('; '));
  } finally { await browser.close(); }
} finally { server?.kill(); }
