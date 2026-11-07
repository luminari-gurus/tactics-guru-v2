import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');

test('dungeon startup evidence retains failed boundaries with bounded private data', () => {
  mkdirSync('tmp', {recursive:true});
  const fixture=mkdtempSync('tmp/startup-diagnostics-');
  try {
    const helper=resolve('tests/helpers/startupDiagnostics.ts').replaceAll('\\','/');
    writeFileSync(join(fixture,'contract.config.ts'),`
      import {defineConfig} from '@playwright/test';
      export default defineConfig({testDir:'.',testMatch:'contract.spec.ts',workers:1,retries:0,use:{baseURL:'https://diagnostics.invalid'},
        projects:[{name:'chromium',use:{browserName:'chromium',channel:'chromium',launchOptions:{
          executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}}},
          {name:'webkit',use:{browserName:'webkit'}}]});
    `);
    writeFileSync(join(fixture,'contract.spec.ts'),`
      import {test,expect} from '${helper}';
      for(const noisy of [false,true])test('failed startup '+noisy,async({page})=>{
        await page.route('**/*',route=>{
          const path=new URL(route.request().url()).pathname;
          if(new URL(route.request().url()).hostname==='foreign.invalid')return route.fulfill({contentType:'text/javascript',body:''});
          if(path.endsWith('.css'))return route.abort('failed');
          if(path.endsWith('.js'))return route.fulfill({contentType:'text/javascript',body:"throw new TypeError('ERR_PRIVATE_SENTINEL private-error-sentinel')"});
          return route.fulfill({contentType:'text/html',body:'<p id="fit-status">Loading</p><link rel="stylesheet" href="/assets/style-12345678.css?private=query-sentinel"><script src="/assets/probe-12345678.js?private=query-sentinel"></script><script src="https://foreign.invalid/assets/private-12345678.js"></script>'});
        });
        const error=page.waitForEvent('pageerror');
        await page.goto('https://diagnostics.invalid/dungeon?private=query-sentinel');await error;
        expect(await page.evaluate(()=>crypto.getRandomValues(new Uint32Array(1))[0])).toBe(100);
        await page.evaluate(noisy=>{localStorage.setItem('private-save','private-save-sentinel');if(noisy)for(let i=0;i<300;i++)console.error('private-console-sentinel');},noisy);
        await expect(page.locator('#dungeon-screen')).toBeVisible({timeout:100});
      });
    `);
    const output=resolve(fixture,'results.json');
    const run=spawnSync(process.execPath,[require.resolve('@playwright/test/cli'),'test','-c',resolve(fixture,'contract.config.ts'),'--reporter=json','--output',resolve(fixture,'artifacts')],{
      encoding:'utf8',timeout:60000,env:{...process.env,PLAYWRIGHT_JSON_OUTPUT_FILE:output},
    });
    assert.equal(run.status,1,run.stdout+run.stderr); // Four deliberate assertion failures.
    const report=JSON.parse(readFileSync(output,'utf8'));
    assert.equal(report.stats.unexpected,4);
    const tests=report.suites.flatMap(s=>s.specs.flatMap(spec=>spec.tests.map(t=>({...t,title:spec.title}))));
    for(const entry of tests) {
      const result=entry.results[0];
      assert.equal(entry.results.length,1);assert.match(result.errors[0].message,/toBeVisible/);
      const attachment=result.attachments.find(a=>a.name==='startup-evidence');
      assert.ok(attachment,'failed case must retain its startup boundary');
      const raw=attachment.body?Buffer.from(attachment.body,'base64').toString():readFileSync(attachment.path,'utf8');
      for(const secret of ['query-sentinel','ERR_PRIVATE_SENTINEL','private-error-sentinel','private-console-sentinel','private-save-sentinel','diagnostics.invalid','private-12345678'])assert.ok(!raw.includes(secret),secret);
      const evidence=JSON.parse(raw);
      assert.ok(evidence.events.length<=128);assert.ok(evidence.pending.length<=64);
      assert.ok(evidence.browser.samples.length<=32);assert.ok(evidence.browser.resources.length<=64);
      assert.ok(evidence.browser.samples.some(s=>!s.screen&&s.status==='loading'));
      assert.ok(evidence.browser.scripts.includes('/assets/probe-12345678.js'));
      if(entry.title.endsWith('false')) {
        assert.ok(evidence.events.some(e=>e.kind==='requestfailed'&&e.path==='/assets/style-12345678.css'));
        assert.ok(evidence.events.some(e=>e.kind==='pageerror'&&e.name==='TypeError'&&e.error==='[redacted]'));
      } else assert.equal(evidence.events.length,128,'noisy errors must remain bounded');
    }
  } finally { rmSync(fixture,{recursive:true,force:true}); }
});

test('startup evidence covers proof battle and development boundaries while preserving fixtures', () => {
  mkdirSync('tmp', { recursive: true });
  const fixture = mkdtempSync('tmp/startup-boundaries-');
  try {
    const helper = resolve('tests/helpers/startupDiagnostics.ts').replaceAll('\\', '/');
    writeFileSync(join(fixture, 'contract.config.ts'), `
      import {defineConfig} from '@playwright/test';
      export default defineConfig({testDir:'.',testMatch:'contract.spec.ts',workers:1,retries:0,
        use:{baseURL:'https://diagnostics.invalid/tactics/'},
        projects:[{name:'chromium',use:{browserName:'chromium',channel:'chromium',launchOptions:{
          executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}}},
          {name:'webkit',use:{browserName:'webkit'}}]});
    `);
    writeFileSync(join(fixture, 'contract.spec.ts'), `
      import {plainTest as test,railTest,expect} from '${helper}';
      async function shell(page,mode) {
        await page.route('**/*',route=>{
          const url=new URL(route.request().url()),path=url.pathname;
          if(path.endsWith('/startBattleApp.ts'))return route.abort('failed');
          if(path.endsWith('.css'))return route.fulfill({contentType:'text/css',body:'body { color: black; }'});
          if(path.endsWith('.js')||path.endsWith('.ts'))return route.fulfill({contentType:'text/javascript',body:''});
          return route.fulfill({contentType:'text/html',body:
            '<p id="fit-status">Loading private-status-sentinel</p><div id="game" data-ready="false"></div>'
            +'<link rel="stylesheet" href="/tactics/src/style.css?private=query-sentinel">'
            +(mode==='dev'
              ?'<script src="/tactics/src/main.ts?private=query-sentinel"></script><script src="/tactics/src/app/startBattleApp.ts?private=query-sentinel"></script>'
                +'<script src="/tactics/src/private-file-sentinel.ts"></script><script src="https://foreign.invalid/tactics/src/main.ts"></script>'
                +'<script src="/outside/src/main.ts"></script>'
              :'<script src="/tactics/assets/probe-12345678.js?private=query-sentinel"></script>')});
        });
        await page.goto('./battle?private=query-sentinel');
      }
      for(const mode of ['proof','battle','dev'])test('failed '+mode+' startup boundary',async({page})=>{
        if(mode==='proof'){
          await page.clock.install({time:new Date('2026-10-25T12:00:00Z')});
          await page.clock.pauseAt(new Date('2026-10-25T12:00:01Z'));
        }
        await shell(page,mode);
        await page.evaluate(mode=>{
          if(mode==='proof')performance.mark('fit:scene-start');
          performance.mark('private-mark-sentinel');
          localStorage.setItem('private-save','private-save-sentinel');
          const game=document.querySelector('#game');
          if(mode==='battle'){
            window.fitDiagnostics=()=>({run:2,sceneStartedMs:10,sceneReadyMs:20,controlsUsableMs:30,
              private:'private-diagnostics-sentinel',get resources(){throw Error('private-diagnostics-sentinel');}});
            game.setAttribute('data-ready','true');game.setAttribute('data-phase','player');
            document.querySelector('#fit-status').textContent='Battle ready';
          }else if(mode==='dev'){
            window.fitDiagnostics=()=>({run:-1,sceneStartedMs:Infinity,sceneReadyMs:NaN,controlsUsableMs:'private-diagnostics-sentinel'});
            game.setAttribute('data-phase','private-phase-sentinel');
          }
        },mode);
        if(mode==='proof')await expect(page.locator('#fit-status')).toHaveText('Ready',{timeout:1100});
        else await expect(page.locator('#game')).toHaveAttribute('data-phase','ended',{timeout:100});
      });
      test('successful startup keeps neutral fixtures',async({page})=>{
        await shell(page,'plain');
        const storage=await page.evaluate(()=>{
          crypto.getRandomValues(new Uint32Array(1));
          return {entropy:sessionStorage.getItem('test-dungeon-entropy'),rail:localStorage.getItem('tactics-guru:combat-controls')};
        });
        expect(storage).toEqual({entropy:null,rail:null});
      });
      railTest('successful startup keeps seeded rail fixtures',async({page})=>{
        await shell(page,'rail');
        const storage=await page.evaluate(()=>({draw:crypto.getRandomValues(new Uint32Array(1))[0],
          rail:localStorage.getItem('tactics-guru:combat-controls')}));
        expect(storage).toEqual({draw:100,rail:'rail'});
      });
    `);
    const output = resolve(fixture, 'results.json');
    const run = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '-c',
      resolve(fixture, 'contract.config.ts'), '--reporter=json', '--output', resolve(fixture, 'artifacts')], {
      encoding: 'utf8', timeout: 60000, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: output },
    });
    assert.equal(run.status, 1, run.stdout + run.stderr);
    const report = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(report.stats.unexpected, 6); // Three deliberate failed waits in each engine.
    assert.equal(report.stats.expected, 4); // Fixture behavior remains unchanged.
    const tests = report.suites.flatMap(suite => suite.specs.flatMap(spec => spec.tests.map(entry => ({ ...entry, title: spec.title }))));
    for (const entry of tests) {
      assert.equal(entry.results.length, 1);
      const result = entry.results[0];
      const attachment = result.attachments.find(item => item.name === 'startup-evidence');
      if (entry.title.startsWith('successful')) {
        assert.equal(result.status, 'passed');
        assert.equal(attachment, undefined, 'successful cases must not emit failure evidence');
        continue;
      }
      assert.ok(attachment, entry.title);
      assert.match(result.errors[0].message, /toHaveText|toHaveAttribute/);
      const raw = attachment.body ? Buffer.from(attachment.body, 'base64').toString() : readFileSync(attachment.path, 'utf8');
      for (const secret of ['query-sentinel', 'private-status-sentinel', 'private-phase-sentinel', 'private-mark-sentinel',
        'private-save-sentinel', 'private-file-sentinel', 'private-diagnostics-sentinel', 'diagnostics.invalid', 'foreign.invalid', '/outside/']) {
        assert.ok(!raw.includes(secret), secret);
      }
      const evidence = JSON.parse(raw);
      assert.ok(evidence.events.length <= 128);
      assert.ok(evidence.pending.length <= 64);
      assert.ok(evidence.browser.samples.length <= 32);
      assert.ok(evidence.browser.marks.length <= 24);
      assert.ok(evidence.browser.resources.length <= 64);
      assert.ok(evidence.runner.samples.length >= 2 && evidence.runner.samples.length <= 32);
      assert.ok(evidence.runner.cpus > 0 && evidence.runner.totalMemoryBytes > 0);
      for (const sample of evidence.runner.samples) {
        assert.ok(Number.isFinite(sample.at) && Number.isFinite(sample.elapsedMs));
        assert.equal(sample.load.length, 3);
        assert.ok(sample.load.every(value => Number.isFinite(value) && value >= 0));
        assert.ok(sample.freeMemoryBytes >= 0);
      }
      const state = evidence.browser.samples.at(-1);
      assert.equal(state.game, true);
      if (entry.title.includes('proof')) {
        assert.ok(evidence.browser.marks.some(mark => mark.name === 'fit:scene-start' && mark.at >= 0));
        assert.equal(evidence.browser.measurements, null);
        assert.equal(state.status, 'loading');
        assert.equal(state.gameReady, false);
        assert.ok(evidence.runner.samples.length >= 3, 'Node sampling must continue while page.clock is paused');
        assert.ok(evidence.runner.samples.at(-1).elapsedMs - evidence.runner.samples[0].elapsedMs >= 1000);
      } else if (entry.title.includes('battle')) {
        assert.equal(state.status, 'ready');
        assert.equal(state.gameReady, true);
        assert.equal(state.phase, 'player');
        assert.deepEqual(evidence.browser.marks, []);
        assert.deepEqual(evidence.browser.measurements, { run: 2, sceneStartedMs: 10, sceneReadyMs: 20, controlsUsableMs: 30 });
      } else {
        assert.deepEqual(evidence.browser.measurements, { run: null, sceneStartedMs: null, sceneReadyMs: null, controlsUsableMs: null });
        assert.equal(state.phase, 'other');
        assert.ok(evidence.browser.scripts.includes('/src/main.ts'));
        assert.ok(evidence.browser.styles.some(style => style.url === '/src/style.css'));
        assert.ok(evidence.events.some(event => event.kind === 'requestfailed' && event.path === '/src/app/startBattleApp.ts'));
        assert.ok(evidence.browser.scripts.includes('[other]'));
      }
    }
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

// Integration check: requires installed full Chromium and WebKit, no application server.
test('ordinary Playwright cleanup preserves environment, JSON and failure traces', () => {
  mkdirSync('tmp', { recursive: true });
  const fixture = mkdtempSync('tmp/browser-diagnostics-');
  try {
    writeFileSync(join(fixture, 'contract.config.ts'), `
      import { defineConfig } from '@playwright/test';
      export default defineConfig({ testDir: '.', testMatch: 'contract.spec.ts', workers: 1,
        retries: 2, use: { channel: 'chromium', launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } });
    `);
    writeFileSync(join(fixture, 'contract.spec.ts'), `
      import { test, expect } from '@playwright/test';
      test('diagnostic contract', async ({ page }) => {
        await page.setContent('<p>Browser diagnostic contract</p>');
        expect(await page.locator('p').textContent()).toBe(process.env.DIAGNOSTIC_EXPECTED);
      });
    `);
    const preflight = spawnSync(process.execPath, ['scripts/browser-check.mjs'], {
      encoding: 'utf8', timeout: 60000,
    });
    assert.equal(preflight.status, 0, preflight.stdout + preflight.stderr);
    const environmentPath = /Browser environment receipt: (.+)/.exec(preflight.stdout)?.[1];
    assert.ok(environmentPath, preflight.stdout);
    const receipts = [environmentPath];
    const runs = [];
    for (const failing of [true, false]) {
      const run = spawnSync(process.execPath, ['scripts/browser-test.mjs', '-c',
        resolve(fixture, 'contract.config.ts'), '--diagnostics'], {
        encoding: 'utf8', timeout: 60000,
        env: { ...process.env, DIAGNOSTIC_EXPECTED: failing ? 'intentional mismatch' : 'Browser diagnostic contract' },
      });
      assert.equal(run.status, failing ? 1 : 0, run.stdout + run.stderr);
      const directory = /Browser receipts: (.+)/.exec(run.stdout)?.[1];
      assert.ok(directory, run.stdout);
      runs.push(directory);
      const report = JSON.parse(readFileSync(join(directory, 'results.json'), 'utf8'));
      assert.equal(report.stats.unexpected, failing ? 1 : 0);
      assert.equal(report.stats.expected, failing ? 0 : 1);
      const result = report.suites[0].specs[0].tests[0];
      assert.equal(result.results.length, 1, 'wrapper must override configured retries');
      const traces = readdirSync(join(directory, 'artifacts'), { recursive: true })
        .filter(name => name.endsWith('trace.zip'));
      assert.equal(traces.length, failing ? 1 : 0, 'retain only failed traces');
      receipts.push(join(directory, 'results.json'), ...traces.map(path => join(directory, 'artifacts', path)));
    }
    assert.notEqual(runs[0], runs[1]);
    assert.ok(existsSync(join(runs[0], 'results.json')), 'second run must retain first receipt');
    const before = new Map(receipts.map(path => [path, hash(path)]));
    // Match npm test's default output root; this must exercise real cleanup.
    mkdirSync('test-results', { recursive: true });
    const sentinel = join('test-results', 'diagnostic-cleanup-sentinel');
    writeFileSync(sentinel, 'Playwright must delete this file');
    const ordinary = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'),
      'test', '-c', resolve(fixture, 'contract.config.ts'), '--retries=0',
      '--output', resolve('test-results')], {
      encoding: 'utf8', timeout: 60000,
      env: { ...process.env, DIAGNOSTIC_EXPECTED: 'Browser diagnostic contract' },
    });
    assert.equal(ordinary.status, 0, ordinary.stdout + ordinary.stderr);
    assert.equal(existsSync(sentinel), false, 'ordinary run must actually clean test-results');
    for (const [path, digest] of before) {
      assert.ok(existsSync(path), `ordinary run deleted ${path}`);
      assert.equal(hash(path), digest, `ordinary run changed ${path}`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
