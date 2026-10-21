import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizePlaywright, summarizeVitest, compareReports, slowest } from '../../scripts/verification-report.mjs';
import { runCommand, selectStages } from '../../scripts/verification-timings.mjs';

test('Playwright totals preserve retries, flaky results and unexpected failures',()=>{
  const r=summarizePlaywright({config:{workers:1},stats:{expected:0,unexpected:1,flaky:1,skipped:1,duration:100},
    suites:[{file:'a.spec.ts',specs:[{title:'case',tests:[{projectName:'mobile',status:'flaky',expectedStatus:'passed',results:[
      {status:'failed',duration:20,retry:0},{status:'passed',duration:10,retry:1}]}]}],suites:[]}]});
  assert.equal(r.counts.retryAttempts,1);assert.equal(r.counts.unexpected,1);
  assert.equal(r.tests[0].durationMs,30);assert.equal(r.tests[0].outcome,'flaky');
  assert.equal(slowest(r.tests).files[0].durationMs,30);
});
test('Vitest preserves pending tests and failed report status',()=>{
  const r=summarizeVitest({numTotalTests:2,numPassedTests:0,numFailedTests:1,numPendingTests:1,success:false,
    testResults:[{name:'a.test.ts',assertionResults:[{fullName:'fails',status:'failed',duration:12},{title:'skips',status:'pending'}]}]});
  assert.equal(r.success,false);assert.equal(r.counts.pending,1);assert.equal(r.tests[1].durationMs,0);
  assert.throws(()=>summarizeVitest({}),/Invalid/);assert.throws(()=>summarizePlaywright({}),/Invalid/);
});
test('comparison refuses a passing speedup for a failed or omitted stage',()=>{
  const base={schemaVersion:1,complete:true,environment:{node:'v24'},source:{inputHash:'a'},browsers:{},conditions:'warm',
    stages:[{id:'unit',status:'passed',wallMs:100,summary:{counts:{total:1},tests:[{file:'a',title:'one'}]}}]};
  const next={...base,environment:{node:'v26'},stages:[{id:'unit',status:'failed',wallMs:10}]};
  const result=compareReports(base,next);assert.equal(result.stages[0].percent,null);
  assert.ok(result.warnings.some(w=>w.includes('Environment')));assert.ok(result.warnings.some(w=>w.includes('selection')));
  assert.equal(compareReports(base,{...base,stages:[]}).stages[0].afterStatus,'missing');
});
test('stage selection includes build prerequisites exactly once and rejects typos',()=>{
  assert.deepEqual(selectStages(['chromium','bundle']).map(s=>s.id),['content','typecheck-app','typecheck-domain','bundle','chromium']);
  assert.throws(()=>selectStages(['typo']),/Unknown stage/);
});
test('subprocess exit code, raw log and timeout remain visible',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tg-timing-'));
  try {
    const fail=await runCommand(process.execPath,['-e','console.error("fixture failure");process.exit(7)'],{logPath:join(dir,'fail.log')});
    assert.equal(fail.exitCode,7);assert.match(readFileSync(join(dir,'fail.log'),'utf8'),/fixture failure/);
    const timeout=await runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],{logPath:join(dir,'timeout.log'),timeoutMs:100});
    assert.equal(timeout.timedOut,true);assert.notEqual(timeout.exitCode,0);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('missing executable produces a failed receipt',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tg-timing-'));
  try {const r=await runCommand(join(dir,'missing'),[],{logPath:join(dir,'missing.log')});assert.ok(r.error);assert.notEqual(r.exitCode,0);}
  finally {rmSync(dir,{recursive:true,force:true});}
});
