import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { sourceIdentity, summarizePlaywright, summarizeVitest, slowest, compareReports, readReport } from './verification-report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentTests = ['content','authoredContent','authoredEncounters','items','rewards','battlefieldSources','battlefield'];
export const stages = [
  { id: 'content', bin: 'vitest/vitest.mjs', args: ['run', ...contentTests.map(n=>`tests/unit/${n}.test.ts`)], kind: 'vitest' },
  { id: 'typecheck-app', bin: 'typescript/bin/tsc', args: ['--noEmit'] },
  { id: 'typecheck-domain', bin: 'typescript/bin/tsc', args: ['--noEmit','-p','tsconfig.domain.json'] },
  { id: 'bundle', bin: 'vite/bin/vite.js', args: ['build'], needs: ['content','typecheck-app','typecheck-domain'] },
  { id: 'unit', bin: 'vitest/vitest.mjs', args: ['run'], kind: 'vitest' },
  { id: 'chromium', config: 'playwright.config.ts', needs: ['bundle'] },
  { id: 'encounters', config: 'playwright.encounters.config.ts' },
  { id: 'items', config: 'playwright.run-items.config.ts' },
  { id: 'webkit', config: 'playwright.device-acceptance.config.ts', needs: ['bundle'] },
  { id: 'telemetry', config: 'playwright.telemetry.config.ts' },
];

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
  for (const s of report.stages) lines.push(`| ${s.id} | ${s.status} | ${((s.wallMs??0)/1000).toFixed(2)} | ${JSON.stringify(s.summary?.counts??{})} |`);
  lines.push('', 'Wall time includes process startup, server startup and teardown. Summed test durations are work, not wall time.',
    'Queue time is unavailable for this local runner. Raw reports/logs retain failures and skips.', '');
  for (const s of report.stages.filter(s=>s.summary)) {
    lines.push(`## ${s.id}: slowest files`, '', ...slowest(s.summary.tests).files.map(f=>`- ${f.file}: ${(f.durationMs/1000).toFixed(2)}s`), '');
  }
  return lines.join('\n');
}

async function browserMetadata(selected) {
  if (!selected.some(s=>s.config)) return {};
  const { chromium, webkit } = await import('playwright');
  const browsers = {};
  for (const [name, type] of Object.entries({chromium,webkit})) {
    if (name==='webkit' && !selected.some(s=>s.id==='webkit')) continue;
    if (name==='chromium' && !selected.some(s=>s.config && s.id!=='webkit')) continue;
    const executablePath = name==='chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE : undefined;
    try {
      const browser=await type.launch({executablePath,timeout:15000});
      try { browsers[name]={version:browser.version(), executableOverride:executablePath??null}; }
      finally { await browser.close(); }
    } catch(error) { browsers[name]={version:null,error:error.message}; }
  }
  return browsers;
}

async function capture(args) {
  const opts=options(args), selected=selectStages(opts.stages);
  // Base changes need their own build identity; do not silently measure a dev or prefixed matrix here.
  for (const key of ['PLAYWRIGHT_BASE_PATH','PLAYWRIGHT_SERVER_MODE','PLAYWRIGHT_TELEMETRY_DEV']) {
    if (process.env[key]) throw Error(`Unset ${key}: baseline uses the configured root production matrix`);
  }
  const out=resolve(root,opts.out??`test-results/timings/${new Date().toISOString().replaceAll(':','-')}`);
  const allowedRoot=resolve(root,'test-results/timings');
  if (!out.startsWith(allowedRoot+'/') && !out.startsWith(allowedRoot+'\\')) throw Error('--out must be a new directory beneath test-results/timings/');
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
    const report={schemaVersion:1,startedAt:new Date().toISOString(),complete:false,passed:false,
      requestedStages:opts.stages,conditions:opts.conditions,queueMs:null,
      environment:{node:process.version,platform:process.platform,arch:process.arch,osRelease:os.release(),
        cpus:os.cpus().length,cpuModel:os.cpus()[0]?.model,memoryBytes:os.totalmem(),CI:process.env.CI??null},
      source:sourceIdentity(root),stages:[],browsers:{}};
    const save=()=>{writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');writeFileSync(resolve(out,'summary.md'),summaryText(report));};
    save();
    const preflight=performance.now();report.browsers=await browserMetadata(selected);report.browserPreflightMs=performance.now()-preflight;
    for (const stage of selected) {
      if (abort.signal.aborted) break;
      if (stage.config && report.browsers[stage.id==='webkit'?'webkit':'chromium']?.error) {
        report.stages.push({id:stage.id,status:'blocked',reason:'Browser preflight failed; see browsers metadata',wallMs:0});save();continue;
      }
      const failedDependencies=(stage.needs??[]).filter(id=>report.stages.find(s=>s.id===id)?.status!=='passed');
      if (failedDependencies.length) {report.stages.push({id:stage.id,status:'blocked',failedDependencies,wallMs:0});save();continue;}
      const rawPath=resolve(out,stage.id+'.json');
      const env={...process.env};
      const kind=stage.config?'playwright':stage.kind;
      const commandArgs=[resolve(root,'node_modules',stage.config?'playwright/cli.js':stage.bin),...(stage.args??[])];
      if (stage.config) {
        commandArgs.push('test','-c',stage.config,'--reporter=line,json','--output',resolve(out,stage.id+'-artifacts'));
        env.PLAYWRIGHT_JSON_OUTPUT_FILE=rawPath;
      } else if (kind==='vitest') {
        commandArgs.push('--reporter=default','--reporter=json','--reporter=./scripts/verification-vitest-reporter.mjs',`--outputFile.json=${rawPath}`);
        env.VERIFICATION_VITEST_METADATA=resolve(out,stage.id+'-metadata.json');
      }
      console.log(`[timings] ${stage.id}: starting; log ${relative(root,resolve(out,stage.id+'.log'))}`);
      const result=await runCommand(process.execPath,commandArgs,{cwd:root,env,logPath:resolve(out,stage.id+'.log'),timeoutMs:opts.timeoutMs,signal:abort.signal});
      const entry={id:stage.id,command:[process.execPath,...commandArgs],...result,
        status:result.exitCode===0&&!result.timedOut&&!result.interrupted&&!result.error?'passed':'failed'};
      if (kind) {
        try {
          entry.summary=(kind==='playwright'?summarizePlaywright:summarizeVitest)(readReport(rawPath));
          if (kind==='vitest') {
            Object.assign(entry.summary,readReport(env.VERIFICATION_VITEST_METADATA));
            delete entry.summary.notes;
          }
          for (const test of entry.summary.tests) if (isAbsolute(test.file)) test.file=relative(root,test.file).replaceAll('\\','/');
          entry.slowest=slowest(entry.summary.tests);
          if (entry.summary.counts.total===0 || entry.summary.success===false || entry.summary.counts.unexpected>0 || entry.summary.globalErrors?.length) entry.status='failed';
        } catch(error) {entry.reportError=error.message;entry.status='failed';}
      }
      report.stages.push(entry);save();console.log(`[timings] ${stage.id}: ${entry.status} (${(entry.wallMs/1000).toFixed(1)}s)`);
    }
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
  if (args[0]==='--help') {
    console.log('npm run measure:verification -- [--stages '+stages.map(s=>s.id).join(',')+'] [--conditions "host/cache notes"] [--out test-results/timings/new-name] [--timeout-ms 3600000]\nCompare: npm run measure:verification -- compare before/report.json after/report.json');return 0;
  }
  return capture(args);
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code=>{process.exitCode=code;},error=>{console.error(error.message);process.exitCode=1;});
}
