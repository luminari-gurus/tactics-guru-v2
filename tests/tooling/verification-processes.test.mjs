import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import { runCommand, runTimingStages } from '../../scripts/verification-timings.mjs';

async function until(check) {
  for (let i = 0; i < 200; i++) { if (await check()) return; await delay(25); }
  throw Error('fixture readiness timed out');
}
async function canBind(port) {
  const server = createServer();
  return await new Promise(resolve => {
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

for (const mode of ['timeout', 'interrupt', 'normal-exit']) {
  test(`owned detached HTTP server is gone before continuation: ${mode}`, { skip: process.platform !== 'linux', timeout: 15000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tg-owned-'));
    const ready = join(dir, 'ready.json');
    const unrelatedReady = join(dir, 'unrelated.json');
    const unrelated = spawn(process.execPath, ['-e', `const s=require('node:net').createServer();
      s.listen(0,'127.0.0.1',()=>require('node:fs').writeFileSync(${JSON.stringify(unrelatedReady)},JSON.stringify({port:s.address().port})));`], {stdio:'ignore'});
    await until(() => existsSync(unrelatedReady));
    const unrelatedPort = JSON.parse(readFileSync(unrelatedReady, 'utf8')).port;
    const abort = new AbortController();
    let owned;
    // The server ignores TERM and detaches from its parent's process group. Its
    // stdio closes immediately, so the launcher closes before escalation fires.
    const serverCode = `const http = require('node:http');
      process.on('SIGTERM', () => {});
      const s = http.createServer((q,r) => r.end('owned'));
      s.listen(0, '127.0.0.1', () => require('node:fs').writeFileSync(${JSON.stringify(ready)}, JSON.stringify({pid:process.pid,port:s.address().port})));`;
    const launcher = `const c = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(serverCode)}], {detached:true,stdio:'ignore'}); c.unref();
      ${mode === 'normal-exit' ? 'setTimeout(() => process.exit(0), 500);' : 'setInterval(() => {}, 1000);'}`;
    try {
      const run = runCommand(process.execPath, ['-e', launcher], {
        logPath: join(dir, 'stage.log'), timeoutMs: mode === 'timeout' ? 800 : 10000, signal: abort.signal,
      });
      await until(() => existsSync(ready));
      owned = JSON.parse(readFileSync(ready, 'utf8'));
      assert.equal(await canBind(owned.port), false);
      if (mode === 'interrupt') abort.abort();
      const result = await run;
      assert.equal(result.timedOut, mode === 'timeout');
      assert.equal(result.interrupted, mode === 'interrupt');
      const stages = await runTimingStages([{id:'first'}, {id:'next'}], async stage => {
        if (stage.id === 'first') return {...result, status: mode === 'normal-exit' ? 'passed' : 'failed'};
        // Local forwarding layers may release a dead listener asynchronously.
        await until(() => canBind(owned.port));
        assert.equal(await canBind(unrelatedPort), false, 'unrelated server must survive');
        assert.equal(unrelated.exitCode, null, 'unrelated process must survive');
        return {status:'passed'};
      });
      assert.equal(stages[1].status, 'passed', stages[1].error);
      assert.equal(result.cleanup.complete, true);
      assert.ok(result.cleanup.escalated.includes(owned.pid));
    } finally {
      if (owned) { try { process.kill(owned.pid, 'SIGKILL'); } catch {} }
      unrelated.kill('SIGKILL');
      rmSync(dir, {recursive:true,force:true});
    }
  });
}
