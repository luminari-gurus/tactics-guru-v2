import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { arch, cpus, platform, release } from 'node:os';
import { chromium, devices } from '@playwright/test';

const output = process.argv[2] ?? 'test-results/fit-baseline.json';
const url = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'pipe' });
let serverError = '';
let previewListening = false;
server.stdout.on('data', chunk => { if (String(chunk).includes(url)) previewListening = true; });
server.stderr.on('data', chunk => { serverError += String(chunk); });
server.on('error', error => { serverError += error.message; });

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
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview exited: ${serverError}`);
    try { if (previewListening && (await fetch(url)).ok) { ready = true; break; } } catch { /* server starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Preview failed to start');
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
    const result = {
      measuredAt: new Date().toISOString(),
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
      browserVersion: browser.version(),
      host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
      conditions: { url, mode: 'headless Chromium; mobile profiles are emulation', network: 'unthrottled loopback HTTP, no TLS or content compression', cache: 'cold: fresh context; warm: same-context reload; inspect per-resource transfer bytes', frames: 'first >=120 active scene update intervals; nearest-rank p50/p95; cap 600; no interaction workload' },
      buildFiles: await buildFiles('dist'),
      samples,
    };
    await mkdir(join(output, '..'), { recursive: true });
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Recorded ${samples.length} cold/warm samples in ${output}`);
    if (samples.some(sample => sample.errors.length)) throw new Error('Console/page errors detected; inspect output');
  } finally { await browser.close(); }
} finally { server.kill(); }
