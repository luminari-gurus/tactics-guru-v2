import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;

// The game owns deterministic grid rules and uses no Matter physics. This stock
// Phaser distribution retains both renderers, audio and all scene/game APIs.
const phaserArcade = resolve(dirname(createRequire(import.meta.url).resolve('phaser/package.json')), 'dist/phaser-arcade-physics.js');
export default defineConfig({
  resolve: { alias: [{ find: /^phaser$/, replacement: phaserArcade }] },
  define: { __BUILD_INFO__: JSON.stringify({ commit, dirty }) },
});
