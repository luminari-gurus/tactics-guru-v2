import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { arch, cpus, platform, release } from 'node:os';
import { chromium, devices } from '@playwright/test';
import { buildIdentity, collectorConditions, parseMeasureArgs } from './measure-fit-options.ts';

// `measure:fit [output] [--url <origin>]`: without --url the collector serves `dist` itself on the preview port;
// with --url (or FIT_URL) it measures that deployed origin and reads the served build from the page.
const options = parseMeasureArgs(process.argv.slice(2), process.env);
const { output, url } = options;
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
    for (const profile of profiles) {
      for (let repetition = 1; repetition <= 3; repetition++) {
        const context = await browser.newContext(profile.options);
        try {
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          // No routing/interception: Playwright routing would disable the HTTP cache.
          for (const cache of ['cold', 'warm'] as const) {
            if (cache === 'cold') await page.goto(url);
            else await page.reload();
            await page.getByRole('button', { name: 'Restart proof scene' }).waitFor();
            await page.waitForFunction(() => window.fitDiagnostics?.().controlsUsableMs !== null && window.fitDiagnostics?.().frames.count >= 120);
            const diagnostics = await page.evaluate(() => window.fitDiagnostics());
            samples.push({ profile: profile.name, repetition, cache, diagnostics, errors: [...errors] });
          }
        } finally { await context.close(); }
      }
    }
    const measuredBuild = buildIdentity(samples);
    const result = {
      measuredAt: new Date().toISOString(),
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
      // The build the pages were actually served from (baked `__BUILD_INFO__`); for a deployed origin this is the deployed commit.
      measuredBuild,
      browserVersion: browser.version(),
      host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
      conditions: collectorConditions(options),
      buildFiles: options.remote ? null : await buildFiles('dist'),
      samples,
    };
    await mkdir(join(output, '..'), { recursive: true });
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Recorded ${samples.length} cold/warm samples from build ${measuredBuild.commit}${measuredBuild.dirty ? ' (dirty)' : ''} in ${output}`);
    if (!options.remote && measuredBuild.commit !== result.sourceCommit) throw new Error(`dist was built from ${measuredBuild.commit} but the source is at ${result.sourceCommit}; rebuild before measuring`);
    if (samples.some(sample => sample.errors.length)) throw new Error('Console/page errors detected; inspect output');
  } finally { await browser.close(); }
} finally { server?.kill(); }
