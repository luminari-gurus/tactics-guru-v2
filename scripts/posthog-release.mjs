import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Explicit CI step. Never reads .env or falls back to a developer's CLI credentials.
for (const name of ['POSTHOG_CLI_API_KEY', 'POSTHOG_CLI_PROJECT_ID', 'POSTHOG_CLI_HOST']) {
  if (!process.env[name]) throw new Error(`Missing CI secret/configuration: ${name}`);
}
if (!['https://us.posthog.com', 'https://eu.posthog.com'].includes(process.env.POSTHOG_CLI_HOST)) throw new Error('Unapproved PostHog upload host');
if (/^(true|1|yes|on)$/i.test(process.env.POSTHOG_CLI_DRY_RUN ?? '')) throw new Error('A release upload cannot use CLI dry-run mode');
const directory = resolve(process.argv[2] ?? 'dist');
if (!readdirSync(join(directory, 'assets')).some(file => file.endsWith('.js.map')))
  throw new Error('No JavaScript source maps: rebuild with POSTHOG_SOURCEMAPS=true');
const version = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
// A single exact artifact is injected, uploaded and then published. Never rebuild after this step.
const cli = resolve('node_modules/.bin/posthog-cli');
const args = ['--directory', join(directory, 'assets'), '--release-name', 'tactics-guru-v2', '--release-version', version, '--release-mode', 'symbol-set'];
execFileSync(cli, ['sourcemap', 'inject', ...args], { stdio: 'inherit' });
execFileSync(cli, ['sourcemap', 'upload', ...args], { stdio: 'inherit' });
function stripMaps(path) {
  for (const file of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, file.name);
    if (file.isDirectory()) stripMaps(full);
    else if (file.name.endsWith('.map')) rmSync(full);
    else if (file.name.endsWith('.js') && readFileSync(full, 'utf8').includes('sourceMappingURL='))
      throw new Error(`Unexpected public source map reference: ${file.name}`);
  }
}
stripMaps(directory);
