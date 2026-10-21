import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync, readFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { stages as fullStages, stageEnvironment } from './verify-full.mjs';
import { sourceIdentity, summarizePlaywright, summarizeVitest, summarizeContent, slowest, compareReports, readReport } from './verification-report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Derive coverage and ordering from the maintained full-verification manifest.
// Split only its typecheck stage so both compiler scopes retain distinct timings.
export const stages = fullStages.flatMap(stage => stage.id === 'typecheck'
  ? [{ id: 'typecheck-app', bin: 'typescript/bin/tsc', args: ['--noEmit'], sourceStage: stage.id },
     { id: 'typecheck-domain', bin: 'typescript/bin/tsc', args: ['--noEmit', '-p', 'tsconfig.domain.json'], sourceStage: stage.id }]
  : [{ ...stage, sourceStage: stage.id,
      needs: stage.needs?.flatMap(id => id === 'typecheck' ? ['typecheck-app', 'typecheck-domain'] : [id]) }]);

export function enginesFor(stage) {
  if (stage.id === 'performance') return ['chromium-headless'];
  if (!stage.browser) return [];
  const config = stage.args[stage.args.indexOf('-c') + 1];
  if (config === 'playwright.health-bars.config.ts') return ['chromium-headless', 'webkit'];
  if (['playwright.device-acceptance.config.ts', 'playwright.exploration.config.ts'].includes(config)) return ['webkit'];
  return ['chromium'];
}

// The asynchronous counterpart of full verification's failure-preserving scheduler.
export async function runTimingStages(plan, execute, record = () => {}, signal) {
  const results = [];
  for (const stage of plan) {
    if (signal?.aborted) break;
    const blockedBy = (stage.needs ?? []).filter(id => results.find(s => s.id === id)?.status !== 'passed');
    let result;
    if (blockedBy.length) result = { id: stage.id, status: 'blocked', blockedBy, wallMs: 0 };
    else {
      try { result = { id: stage.id, ...await execute(stage) }; }
      catch (error) { result = { id: stage.id, status: 'failed', error: String(error) }; }
    }
    results.push(result);
    record(results);
  }
  return results;
}

export function stageCommand(stage, directory, inherited = process.env, npmPath = process.env.npm_execpath) {
  const env = stageEnvironment(stage, directory, inherited);
  const rawPath = resolve(directory, stage.id + '.json');
  let args;
  if (stage.bin) args = [resolve(root, 'node_modules', stage.bin), ...stage.args];
  else {
    if (!npmPath) throw Error('Run via npm run measure:verification so npm_execpath is available');
    args = [npmPath, ...stage.args];
  }
  const kind = stage.browser ? 'playwright' : ['units', 'build-integration'].includes(stage.id) ? 'vitest'
    : stage.id === 'performance' ? 'performance' : null;
  if (kind === 'playwright') args.push('--reporter=line,json', '--output', resolve(directory, stage.id + '-artifacts'));
  if (kind === 'vitest') {
    args.push('--', '--reporter=default', '--reporter=json', '--reporter=./scripts/verification-vitest-reporter.mjs', `--outputFile.json=${rawPath}`);
    env.VERIFICATION_VITEST_METADATA = resolve(directory, stage.id + '-metadata.json');
  }
  if (kind === 'performance') args.push('--', rawPath);
  return { command: process.execPath, args, env, kind, rawPath };
}

export function selectStages(names) {
  const selected = new Set(names);
  for (const name of names) if (!stages.some(s=>s.id===name)) throw Error(`Unknown stage: ${name}`);
  const include = id => { for (const dep of stages.find(s=>s.id===id).needs ?? []) {selected.add(dep);include(dep);} };
  names.forEach(include);
  return stages.filter(s=>selected.has(s.id));
}

export async function runCommand(command, args, { cwd, env, logPath, timeoutMs = 3_600_000, signal } = {}) {
  const started = performance.now();
  const log = createWriteStream(logPath, { flags: 'wx' });
  return await new Promise((resolveResult, reject) => {
    let child, error = null, timedOut = false, killTimer;
    const terminate = () => {
      if (!child?.pid) return;
      const kill = sig => { try { if (process.platform === 'win32') child.kill(sig); else process.kill(-child.pid, sig); } catch {} };
      kill('SIGTERM'); killTimer = setTimeout(()=>kill('SIGKILL'), 3000);
    };
    log.on('error', e => { error = e.message; terminate(); reject(e); });
    child = spawn(command, args, { cwd, env, shell: false, detached: process.platform !== 'win32', stdio: ['ignore','pipe','pipe'] });
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
    child.on('error', e => { error = e.message; });
    const timer = setTimeout(()=>{timedOut=true;terminate();},timeoutMs);
    signal?.addEventListener('abort', terminate, { once: true });
    if (signal?.aborted) terminate();
    child.on('close', (exitCode, exitSignal) => {
      clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener('abort',terminate);
      log.end(()=>resolveResult({ wallMs: performance.now()-started, exitCode, signal: exitSignal,
        timedOut, interrupted: signal?.aborted ?? false, error }));
    });
  });
}

function options(args) {
  const result = { stages: stages.map(s=>s.id), conditions: 'unspecified', timeoutMs: 3_600_000 };
  for (let i=0;i<args.length;i++) {
    const key=args[i], value=args[++i];
    if (!['--out','--stages','--conditions','--timeout-ms'].includes(key) || !value) throw Error(`Invalid option: ${key}`);
    if (key==='--stages') result.stages=value.split(',');
    if (key==='--out') result.out=value;
    if (key==='--conditions') result.conditions=value;
    if (key==='--timeout-ms') result.timeoutMs=Number(value);
  }
  if (!Number.isSafeInteger(result.timeoutMs) || result.timeoutMs < 1) throw Error('timeout-ms must be a positive integer');
  return result;
}

function summaryText(report) {
  const lines = ['# Verification timing report', '', `Source: ${report.source.commit} (dirty: ${report.source.dirty})`,
    `Conditions: ${report.conditions}`, `Complete: ${report.complete}; passed: ${report.passed}`, '',
    '| Stage | Result | Wall seconds | Counts |', '| --- | --- | ---: | --- |'];
  for (const s of report.stages) lines.push(`| ${s.id} | ${s.status} | ${((s.wallMs??0)/1000).toFixed(2)} | ${JSON.stringify(s.summary?.counts??(s.performance?{samples:s.performance.samples}:{}))} |`);
  lines.push('', 'Wall time includes process startup, server startup and teardown. Summed test durations are work, not wall time.',
    'Queue time is unavailable for this local runner. Raw reports/logs retain failures and skips.', '');
  for (const s of report.stages.filter(s=>s.summary)) {
    if (s.contentValidation) lines.push(`Content subset: ${JSON.stringify(s.contentValidation.counts)}; summed test work ${(s.contentValidation.summedTestDurationMs/1000).toFixed(2)}s (included in units, not a separate wall-time phase).`, '');
    lines.push(`## ${s.id}: slowest files`, '', ...slowest(s.summary.tests).files.map(f=>`- ${f.file}: ${(f.durationMs/1000).toFixed(2)}s`), '');
  }
  return lines.join('\n');
}

async function browserMetadata(selected) {
  const engines = [...new Set(selected.flatMap(enginesFor))];
  if (!engines.length) return {};
  const { chromium, webkit } = await import('playwright');
  const browsers = {};
  for (const name of engines) {
    const type = name === 'webkit' ? webkit : chromium;
    const executablePath = name === 'webkit' ? undefined : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const launchOptions = { ...(name === 'chromium' ? { channel: 'chromium' } : {}), executablePath, timeout: 15000 };
    const metadata = { channel: launchOptions.channel ?? null, executableOverride: executablePath ?? null,
      // Playwright's default Chromium API path is not proof of the headless-shell path.
      executablePath: executablePath ?? (name === 'chromium-headless' ? null : type.executablePath()) };
    try {
      const browser = await type.launch(launchOptions);
      try { browsers[name] = { ...metadata, version: browser.version() }; }
      finally { await browser.close(); }
    } catch (error) { browsers[name] = { ...metadata, version: null, error: error.message }; }
  }
  return browsers;
}

async function capture(args) {
  const opts=options(args), selected=selectStages(opts.stages);
  const out=resolve(root,opts.out??`verification-receipts/timings/${new Date().toISOString().replaceAll(':','-')}`);
  const allowedRoot=resolve(root,'verification-receipts/timings');
  if (!out.startsWith(allowedRoot+'/') && !out.startsWith(allowedRoot+'\\')) throw Error('--out must be a new directory beneath verification-receipts/timings/');
  mkdirSync(allowedRoot,{recursive:true});
  const lock=resolve(allowedRoot,'.capture.lock');
  let fd;
  try {fd=openSync(lock,'wx');} catch {throw Error('Another capture owns the timing lock; inspect it before removing a stale lock');}
  const abort=new AbortController();
  const stop=()=>abort.abort();
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  try {
    writeFileSync(fd,JSON.stringify({pid:process.pid,out}));
    mkdirSync(out); // Refuse to overwrite prior receipts.
    const started=performance.now();
    const report={schemaVersion:2,scope:selected.length===stages.length?'full':'partial',selectedStages:selected.map(s=>s.id),coveragePlan:stages.map(s=>({id:s.id,sourceStage:s.sourceStage,args:s.args,needs:s.needs??[],env:s.env??{}})),startedAt:new Date().toISOString(),complete:false,passed:false,
      requestedStages:opts.stages,conditions:opts.conditions,queueMs:null,
      environment:{node:process.version,platform:process.platform,arch:process.arch,osRelease:os.release(),
        cpus:os.cpus().length,cpuModel:os.cpus()[0]?.model,memoryBytes:os.totalmem(),CI:process.env.CI??null},
      source:sourceIdentity(root),stages:[],browsers:{}};
    const save=()=>{writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');writeFileSync(resolve(out,'summary.md'),summaryText(report));};
    save();
    const preflight=performance.now();report.browsers=await browserMetadata(selected);report.browserPreflightMs=performance.now()-preflight;
    await runTimingStages(selected, async stage => {
      const failedEngines = enginesFor(stage).filter(name => report.browsers[name]?.error);
      if (failedEngines.length) return { status: 'blocked', reason: 'Browser preflight failed', failedEngines, wallMs: 0 };
      const { command, args, env, kind, rawPath } = stageCommand(stage, out);
      console.log(`[timings] ${stage.id}: starting; log ${relative(root,resolve(out,stage.id+'.log'))}`);
      const result = await runCommand(command, args, { cwd: root, env,
        logPath: resolve(out, stage.id + '.log'), timeoutMs: opts.timeoutMs, signal: abort.signal });
      const entry = { command: [command, ...args], ...result,
        status: result.exitCode === 0 && !result.signal && !result.timedOut && !result.interrupted && !result.error ? 'passed' : 'failed' };
      if (kind) {
        try {
          const raw = readReport(rawPath);
          if (kind === 'performance') {
            if (!Array.isArray(raw.samples) || !raw.samples.length || !Array.isArray(raw.failures)) throw Error('Invalid performance capture');
            entry.performance = { samples: raw.samples.length, failures: raw.failures, measuredBuild: raw.measuredBuild };
            if (raw.failures.length) entry.status = 'failed';
          } else {
            entry.summary = (kind === 'playwright' ? summarizePlaywright : summarizeVitest)(raw);
            if (kind === 'vitest') {
              Object.assign(entry.summary, readReport(env.VERIFICATION_VITEST_METADATA));
              delete entry.summary.notes;
            }
            for (const test of entry.summary.tests) if (isAbsolute(test.file)) test.file = relative(root, test.file).replaceAll('\\', '/');
            entry.slowest = slowest(entry.summary.tests);
            if (stage.id === 'units') entry.contentValidation = summarizeContent(entry.summary, JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts['validate:content']);
            if (entry.summary.counts.total === 0 || entry.summary.success === false || entry.summary.counts.unexpected > 0 || entry.summary.globalErrors?.length) entry.status = 'failed';
          }
        } catch (error) { entry.reportError = error.message; entry.status = 'failed'; }
      }
      return entry;
    }, results => {
      report.stages = results;
      save();
      const latest = results.at(-1);
      console.log(`[timings] ${latest.id}: ${latest.status} (${((latest.wallMs ?? 0)/1000).toFixed(1)}s)`);
    }, abort.signal);
    report.finishedAt=new Date().toISOString();report.wallMs=performance.now()-started;
    report.sourceAfter=sourceIdentity(root);
    report.inputsUnchanged=report.source.inputHash===report.sourceAfter.inputHash;
    report.complete=!abort.signal.aborted&&report.stages.length===selected.length&&report.stages.every(s=>s.status!=='blocked');
    report.passed=report.complete&&report.inputsUnchanged&&report.stages.every(s=>s.status==='passed');
    save();console.log(`[timings] report: ${relative(root,resolve(out,'report.json'))}`);
    return report.passed?0:1;
  } finally {process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);closeSync(fd);unlinkSync(lock);}
}

export async function main(args) {
  if (args[0]==='compare') {
    if (args.length!==3) throw Error('Usage: compare <before-report.json> <after-report.json>');
    console.log(JSON.stringify(compareReports(readReport(args[1]),readReport(args[2])),null,2));return 0;
  }
  if (args[0] === '--list') { console.log(JSON.stringify(stages, null, 2)); return 0; }
  if (args[0]==='--help') {
    console.log('npm run measure:verification -- [--stages '+stages.map(s=>s.id).join(',')+'] [--conditions "host/cache notes"] [--out verification-receipts/timings/new-name] [--timeout-ms 3600000]\nCompare: npm run measure:verification -- compare before/report.json after/report.json');return 0;
  }
  return capture(args);
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code=>{process.exitCode=code;},error=>{console.error(error.message);process.exitCode=1;});
}
