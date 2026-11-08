import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PreviewServer } from 'vite';

interface ControlledAsset {
  file: string;
  blocked: number;
  allowed: number;
  responses: { '200': number; '304': number; '503': number; other: number };
}

/** A real HTTP fault on the existing build, without Playwright request interception. */
export async function startBattleModuleFaultServer() {
  // Only the recovery witness starts another preview server; discovery and the
  // other main-menu tests do not import Vite or change their server lifecycle.
  const { preview } = await import('vite');
  let owned: PreviewServer | undefined, unavailable = true, base = '/';
  const assets = new Map<string, ControlledAsset>();
  try {
    const server = await preview({
      preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
      plugins: [{
        name: 'test-battle-module-http-fault',
        async configurePreviewServer(server) {
          owned = server;
          base = server.config.base;
          const files = (await readdir(resolve(server.config.root, server.config.build.outDir, 'assets'), { withFileTypes: true }))
            .filter(file => file.isFile() && /^startBattleApp-[A-Za-z0-9_-]{8}\.js$/.test(file.name))
            .map(file => file.name).sort();
          if (files.length !== 1) throw new Error('Expected one built battle application entry');
          for (const file of files) assets.set(`${base}assets/${file}`, {
            file: `assets/${file}`, blocked: 0, allowed: 0,
            responses: { '200': 0, '304': 0, '503': 0, other: 0 },
          });
          server.middlewares.use((request, response, next) => {
            const asset = assets.get((request.url ?? '').split('?', 1)[0]);
            if (!asset) { next(); return; }
            response.once('finish', () => {
              const status = response.statusCode;
              const key = status === 200 || status === 304 || status === 503 ? `${status}` as '200' | '304' | '503' : 'other';
              asset.responses[key]++;
            });
            if (unavailable) {
              asset.blocked++;
              response.statusCode = 503;
              response.setHeader('Content-Type', 'text/javascript');
              response.setHeader('Cache-Control', 'no-store');
              response.end('// Controlled unavailable application module.\n');
            } else {
              asset.allowed++;
              next(); // Vite serves its unchanged build bytes and normal headers.
            }
          });
        },
      }],
    });
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Preview server did not bind a loopback port');
    const origin = `http://127.0.0.1:${address.port}`;
    return {
      battleURL: `${origin}${base}?game=battle`,
      allowImport() { unavailable = false; },
      isModuleURL(raw: string) {
        try { const url = new URL(raw); return url.origin === origin && assets.has(url.pathname); }
        catch { return false; }
      },
      receipt() {
        const entries = structuredClone([...assets.values()]);
        return { transport: 'http-server' as const, entryState: 'cold' as const,
          blocked: entries.reduce((sum, asset) => sum + asset.blocked, 0),
          allowed: entries.reduce((sum, asset) => sum + asset.allowed, 0), assets: entries };
      },
      close: () => server.close(),
    };
  } catch (error) {
    await owned?.close();
    throw error;
  }
}
