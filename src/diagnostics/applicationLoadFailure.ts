import type { AppRoute } from '../app/routes';

export const APPLICATION_LOAD_FAILURE_EVENT = 'tactics:application-load-failure';
export const APPLICATION_LOAD_FILES_META = 'tactics-application-load-files';
export const APPLICATION_LOAD_FILES_MANIFEST = 'application-load-files.json';
const names = ['Error','TypeError','SyntaxError','RangeError','ReferenceError','URIError','EvalError','AggregateError','AbortError','NetworkError','SecurityError'] as const;
const categories = ['module-fetch','css-preload','network','other'] as const;
const routes = ['menu','battle','run','dungeon','map','qbert','unknown'] as const;
const devEntries: Record<string, string> = {
  '/src/main.ts': 'dev:main',
  '/src/ui/mainMenu.ts': 'dev:menu',
  '/src/app/startBattleApp.ts': 'dev:battle',
  '/src/app/startRunApp.ts': 'dev:run',
  '/src/app/startDungeonApp.ts': 'dev:dungeon',
  '/src/map/view.ts': 'dev:map',
  '/src/phaser/start.ts': 'dev:engine',
};
const noBuildFiles: ReadonlySet<string> = new Set();
export interface ApplicationLoadFrame { file: string; line?: number; column?: number }
export interface ApplicationLoadFailure {
  route: typeof routes[number];
  name: typeof names[number];
  category: typeof categories[number];
  frames: ApplicationLoadFrame[];
}

function errorText(error: unknown, key: 'name' | 'message' | 'stack', limit: number): string {
  try {
    const value = typeof error === 'string' && key === 'message' ? error
      : error && typeof error === 'object' ? (error as Record<string, unknown>)[key] : undefined;
    return typeof value === 'string' ? value.slice(0, limit) : '';
  } catch { return ''; }
}
function frame(raw: string, origin: string, base: string, buildFiles: ReadonlySet<string>): ApplicationLoadFrame | null {
  try {
    const url = new URL(raw), root = new URL(base, origin).pathname.replace(/\/$/, '');
    if (url.origin !== origin || url.pathname.length > 256) return null;
    // Only suffixes on the pathname are line/column numbers. Query/hash contents
    // never contribute even if a supplied URL ends with number-like secrets.
    const match = url.pathname.match(/^(.*\.(?:js|ts))(?::(\d{1,7}))?(?::(\d{1,7}))?$/);
    if (!match || !match[1].startsWith(root + '/')) return null;
    const relative = match[1].slice(root.length), builtFile = relative.slice(1);
    const file = buildFiles.has(builtFile) ? builtFile : devEntries[relative];
    if (!file) return null;
    return { file, ...(match[2] ? { line: Number(match[2]) } : {}), ...(match[3] ? { column: Number(match[3]) } : {}) };
  } catch { return null; }
}

/** A local, bounded description: no message, URL origin, query/hash, causes or save data. */
export function describeApplicationLoadFailure(
  error: unknown, route: AppRoute, origin: string, base = '/', buildFiles = noBuildFiles,
): ApplicationLoadFailure {
  const rawName = errorText(error, 'name', 64), message = errorText(error, 'message', 2000);
  const category = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message) ? 'module-fetch'
    : message.includes('Unable to preload CSS') ? 'css-preload'
    : message.includes('Load failed') || rawName === 'NetworkError' ? 'network' : 'other';
  const frames: ApplicationLoadFrame[] = [], seen = new Set<string>();
  const references = `${message}\n${errorText(error, 'stack', 6000)}`.match(/https?:\/\/[^\s)]+/g) ?? [];
  for (const reference of references) {
    const clean = frame(reference, origin, base, buildFiles), key = JSON.stringify(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key); frames.push(clean);
    if (frames.length === 8) break;
  }
  return { route: (routes as readonly string[]).includes(route) ? route : 'unknown',
    name: (names as readonly string[]).includes(rawName) ? rawName as ApplicationLoadFailure['name'] : 'Error', category, frames };
}

/** Rebuild local event payloads before a diagnostic consumer retains them. */
export function readApplicationLoadFailure(value: unknown, buildFiles = noBuildFiles): ApplicationLoadFailure | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const input = value as Record<string, unknown>;
    // Snapshot accessors once so retained values are exactly those validated.
    const { route, name, category, frames: inputFrames } = input;
    if (!(routes as readonly unknown[]).includes(route) || !(names as readonly unknown[]).includes(name)
      || !(categories as readonly unknown[]).includes(category)) return null;
    const frames: ApplicationLoadFrame[] = [];
    if (Array.isArray(inputFrames)) {
      const count = Math.min(inputFrames.length, 8);
      for (let index = 0; index < count; index++) {
        const entry: unknown = inputFrames[index];
        if (!entry || typeof entry !== 'object') continue;
        const { file, line, column } = entry as Record<string, unknown>;
        if (typeof file !== 'string' || !(file.endsWith('.js') && buildFiles.has(file)) && !Object.values(devEntries).includes(file)) continue;
        const clean: ApplicationLoadFrame = { file };
        for (const [key, coordinate] of [['line', line], ['column', column]] as const) {
          if (typeof coordinate === 'number' && Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 9_999_999) clean[key] = coordinate;
        }
        frames.push(clean);
      }
    }
    return { route: route as ApplicationLoadFailure['route'], name: name as ApplicationLoadFailure['name'],
      category: category as ApplicationLoadFailure['category'], frames };
  } catch { return null; }
}

/** Best-effort local notification only; collection settings and network are unrelated. */
export function reportApplicationLoadFailure(error: unknown, route: AppRoute): void {
  try {
    const files = document.querySelector<HTMLMetaElement>(`meta[name="${APPLICATION_LOAD_FILES_META}"]`)?.content;
    const buildFiles = files ? new Set(files.split(' ')) : noBuildFiles;
    const detail = describeApplicationLoadFailure(error, route, location.origin, import.meta.env.BASE_URL, buildFiles);
    window.dispatchEvent(new CustomEvent(APPLICATION_LOAD_FAILURE_EVENT, { detail }));
  } catch { /* Diagnostics must not interrupt the existing visible recovery path. */ }
}
