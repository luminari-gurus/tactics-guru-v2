import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;

export default defineConfig({ define: { __BUILD_INFO__: JSON.stringify({ commit, dirty }) } });
