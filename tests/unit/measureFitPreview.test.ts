import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { ownedPreview, withPreview } from '../../scripts/measure-fit-preview';

let root: string;
let fixtures: ReturnType<typeof ownedPreview>[];
let servers: Server[];
const signal = () => new AbortController().signal;
async function listen(server: Server) {
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function freeUrl() {
  const server = createServer();
  const url = await listen(server);
  await new Promise<void>(done => server.close(() => done()));
  return url;
}
function fixture(url: string, mode = 'silent', startupMs = 1500) {
  const preview = ownedPreview({ url, command: [process.execPath, join(root, 'worker.mjs'), url, mode], startupMs, graceMs: 100 });
  fixtures.push(preview);
  return preview;
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fit-preview-'));
  fixtures = []; servers = [];
  await writeFile(join(root, 'worker.mjs'), `
import {createServer} from 'node:http';
const [url,mode] = process.argv.slice(2);
const server=createServer((req,res)=>{
  if(req.url==='/die'){process.exit(9);return;}
  if(req.url==='/pid'){res.end(String(process.pid));return;}
  if(mode==='hang')return;
  if(mode==='die'){process.exit(7);return;}
  res.writeHead(mode==='status'?503:200);res.end('fixture');
});
if(mode==='exit'){console.log('startup output');console.error('startup broke');process.exit(7);}
if(mode==='ignore')process.on('SIGTERM',()=>{});
process.on('message',m=>{if(m.type==='close' && mode!=='ignore')server.close(()=>{process.disconnect();});});
if(mode==='noack')setInterval(()=>{},1000);
else setTimeout(()=>server.listen(Number(new URL(url).port),'127.0.0.1',()=>{
  if(mode==='color')console.log('\\x1b[32mready without URL\\x1b[0m');
  if(mode==='split'){process.stdout.write('http://127.');setTimeout(()=>process.stdout.write('0.0.1:split'),10);}
  if(mode==='noisy'){console.log('x'.repeat(30000)+'OUT-TAIL');console.error('y'.repeat(30000)+'ERR-TAIL');}
  process.send({type:'bound'});
}),mode==='slow'?250:0);
`);
});
afterEach(async () => {
  await Promise.all(fixtures.map(preview => preview.close()));
  await Promise.all(servers.map(server => new Promise<void>(done => { server.closeAllConnections(); server.close(() => done()); })));
  await rm(root, { recursive: true, force: true });
});

describe('collector-owned preview', () => {
  it.each(['silent', 'color', 'split', 'slow'])('accepts owned HTTP with %s output/startup and releases the port for reuse', async mode => {
    const url = await freeUrl();
    const preview = fixture(url, mode);
    await preview.ready(signal());
    expect((await fetch(url)).status).toBe(200);
    await preview.close();
    expect(preview.child.exitCode).toBe(0);
    const next = fixture(url);
    await next.ready(signal());
  });

  it.each(['status', 'hang', 'noack'])('bounds %s readiness and reports HTTP/process diagnostics', async mode => {
    const preview = fixture(await freeUrl(), mode, 450);
    const start = performance.now();
    await expect(preview.ready(signal())).rejects.toThrow(/deadline.*[\s\S]*pid=.*HTTP:/);
    expect(performance.now() - start).toBeLessThan(1800);
    if (mode === 'status') expect(preview.diagnostics()).toContain('status 503');
    if (mode === 'noack') expect(preview.diagnostics()).toContain('no bind acknowledgement');
  });

  it.each(['exit', 'die'])('fails promptly when child exits %s', async mode => {
    const preview = fixture(await freeUrl(), mode);
    await expect(preview.ready(signal())).rejects.toThrow(/exited.*[\s\S]*pid=/);
    await preview.close();
    expect(preview.child.exitCode).toBe(7);
    if (mode === 'exit') expect(preview.diagnostics()).toContain('startup broke');
  });

  it('reports spawn errors without waiting for the startup deadline', async () => {
    const preview = ownedPreview({ url: await freeUrl(), command: [join(root, 'missing-node')], graceMs: 50 });
    fixtures.push(preview);
    await expect(preview.ready(signal())).rejects.toThrow(/ENOENT/);
  });

  it('bounds diagnostic tails independently', async () => {
    const preview = fixture(await freeUrl(), 'noisy');
    await preview.ready(signal());
    expect(preview.diagnostics()).toContain('OUT-TAIL');
    expect(preview.diagnostics()).toContain('ERR-TAIL');
    expect(preview.diagnostics().length).toBeLessThan(17000);
  });

  it('forces unresponsive exact-child cleanup while an unrelated sibling survives', async () => {
    const sibling = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    try {
      const url = await freeUrl();
      const preview = fixture(url, 'ignore');
      await preview.ready(signal());
      const start = performance.now();
      await preview.close();
      expect(performance.now() - start).toBeLessThan(2500);
      expect(preview.child.signalCode).not.toBeNull();
      expect(sibling.exitCode).toBeNull();
      const next = fixture(url);
      await next.ready(signal());
    } finally { const closed = once(sibling, 'close'); sibling.kill(); await closed; }
  });

  it('uses pinned Vite with the fixture config and rejects foreign port ownership without probing it', async () => {
    await mkdir(join(root, 'built'));
    await writeFile(join(root, 'built/index.html'), 'real vite fixture');
    await writeFile(join(root, 'vite.config.mjs'), "export default {build:{outDir:'built'},base:'/fixture/'}");
    const url = await freeUrl();
    const preview = ownedPreview({ url: url + '/fixture/', cwd: root });
    fixtures.push(preview);
    await preview.ready(signal());
    expect(await (await fetch(url + '/fixture/')).text()).toContain('real vite fixture');
    await preview.close();
    let requests = 0;
    const foreign = createServer((_req, res) => { requests++; res.end('foreign'); });
    servers.push(foreign);
    await new Promise<void>(done => foreign.listen(Number(new URL(url).port), '127.0.0.1', done));
    const collision = ownedPreview({ url, cwd: root });
    fixtures.push(collision);
    await expect(collision.ready(signal())).rejects.toThrow(/Port .* already in use/);
    await collision.close();
    expect(requests).toBe(0);
    expect(await (await fetch(url)).text()).toBe('foreign');
  });

  it('rejects missing production output and leaves no preview listener', async () => {
    const url = await freeUrl();
    const preview = ownedPreview({ url, cwd: root });
    fixtures.push(preview);
    await expect(preview.ready(signal())).rejects.toThrow(/ENOENT|Missing production/);
    await preview.close();
    await expect(fetch(url)).rejects.toThrow();
  });

  it.each(['browser launch failed', 'capture failed'])('awaits cleanup while preserving %s', async message => {
    const url = await freeUrl();
    await expect(withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'silent'] }, async () => { throw new Error(message); })).rejects.toThrow(message);
    await expect(fetch(url)).rejects.toThrow();
  });

  it.each(['SIGINT', 'SIGTERM'] as const)('cleans up catchable %s and restores signal handlers', async interruption => {
    const url = await freeUrl();
    const count = process.listenerCount(interruption);
    await expect(withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'silent'] }, async activeSignal => {
      process.emit(interruption);
      activeSignal.throwIfAborted();
    })).rejects.toThrow(interruption);
    expect(process.listenerCount(interruption)).toBe(count);
    await expect(fetch(url)).rejects.toThrow();
  });

  it('cancels startup before acknowledgement and releases its child', async () => {
    const url = await freeUrl();
    const interruption = setTimeout(() => process.emit('SIGINT'), 100);
    try {
      await expect(withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'slow'] }, async () => { throw new Error('must not capture'); })).rejects.toThrow(/SIGINT/);
      await expect(fetch(url)).rejects.toThrow();
    } finally { clearTimeout(interruption); }
  });

  it.each(['SIGINT', 'SIGTERM'] as const)('retains %s when browser closure also rejects capture', async interruption => {
    const url = await freeUrl();
    const secondary = new Error('browser closed during capture');
    const handlers = process.listenerCount(interruption);
    const error = await withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'silent'] }, async activeSignal => {
      const rejected = new Promise<never>((_done, reject) => activeSignal.addEventListener('abort', () => reject(secondary), { once: true }));
      process.emit(interruption);
      return rejected;
    }).catch(error => error);
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.message).toContain(interruption);
    expect(error.errors).toContain(secondary);
    expect(process.listenerCount(interruption)).toBe(handlers);
    await expect(fetch(url)).rejects.toThrow();
  });

  it('retains preview exit when browser closure also rejects capture', async () => {
    const url = await freeUrl();
    const secondary = new Error('browser closed during capture');
    const error = await withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'silent'] }, async activeSignal => {
      const rejected = new Promise<never>((_done, reject) => activeSignal.addEventListener('abort', () => reject(secondary), { once: true }));
      void fetch(url + '/die').catch(() => {});
      return rejected;
    }).catch(error => error);
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.message).toMatch(/Preview exited during capture.*exit=9/s);
    expect(error.errors).toContain(secondary);
    await expect(fetch(url)).rejects.toThrow();
  });

  it('aborts on exit before waiting for trailing stderr and retains it after pipe drain', async () => {
    const url = await freeUrl();
    let pid: number | undefined;
    const events: string[] = [];
    const originalEmit = ChildProcess.prototype.emit;
    // Force the legal exit -> final pipe data -> close ordering without relying
    // on platform-specific scheduling of the real child and its stderr pipe.
    const ordered = vi.spyOn(ChildProcess.prototype, 'emit').mockImplementation(function (this: ChildProcess, event, ...args) {
      const emitted = Reflect.apply(originalEmit, this, [event, ...args]);
      if (this.pid === pid && event === 'exit') {
        events.push('tail');
        this.stderr!.emit('data', Buffer.from('FINAL VITE CRASH DETAIL'));
      }
      if (this.pid === pid && event === 'close') events.push('close');
      return emitted;
    });
    try {
      const error = await withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'silent'] }, async activeSignal => {
        pid = Number(await (await fetch(url + '/pid')).text());
        const aborted = new Promise<never>((_done, reject) => activeSignal.addEventListener('abort', () => {
          events.push('abort');
          reject(activeSignal.reason);
        }, { once: true }));
        void fetch(url + '/die').catch(() => {});
        return aborted;
      }).catch(error => error);
      expect(events).toEqual(['abort', 'tail', 'close']);
      expect(error.message).toMatch(/Preview exited during capture.*exit=9.*stderr \(tail\):.*FINAL VITE CRASH DETAIL/s);
      await expect(fetch(url)).rejects.toThrow();
    } finally { ordered.mockRestore(); }
  });

  it('aborts capture when the owned preview dies after readiness', async () => {
    const url = await freeUrl();
    await expect(withPreview({ remote: false, url, command: [process.execPath, join(root, 'worker.mjs'), url, 'silent'] }, async activeSignal => {
      const aborted = new Promise<void>((_done, reject) => activeSignal.addEventListener('abort', () => reject(activeSignal.reason), { once: true }));
      void fetch(url + '/die').catch(() => {});
      return aborted;
    })).rejects.toThrow(/Preview exited during capture/);
  });

  it.each([false, true])('preserves capture and cleanup failures with concurrent interruption=%s', async interrupted => {
    const url = await freeUrl();
    const originalKill = ChildProcess.prototype.kill;
    let pid: number | undefined;
    const held = vi.spyOn(ChildProcess.prototype, 'kill').mockImplementation(function (this: ChildProcess, signal) {
      return this.pid === pid ? false : originalKill.call(this, signal);
    });
    try {
      await expect(withPreview({ remote: false, url, graceMs: 50, command: [process.execPath, join(root, 'worker.mjs'), url, 'ignore'] }, async () => {
        pid = Number(await (await fetch(url + '/pid')).text());
        if (interrupted) process.emit('SIGINT');
        throw new Error('original capture failure');
      })).rejects.toThrow(interrupted
        ? /SIGINT.*original capture failure.*cleanup failed.*Preview cleanup failed/s
        : /original capture failure.*cleanup failed.*Preview cleanup failed/s);
    } finally {
      held.mockRestore();
      if (pid) process.kill(pid, 'SIGKILL');
    }
  });

  it('remote loopback mode never creates or stops a child or reads dist', async () => {
    const server = createServer((_req, res) => res.end('remote'));
    servers.push(server);
    const url = await listen(server);
    const result = await withPreview({ remote: true, url, cwd: join(root, 'missing'), command: ['missing-command'] }, async () => 'capture');
    expect(result).toBe('capture');
    expect(await (await fetch(url)).text()).toBe('remote');
  });
});
