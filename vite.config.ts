import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { battleAssets } from './src/content/assets.ts';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;

// The game owns deterministic grid rules and uses no Matter physics. This stock
// Phaser entry retains both renderers, audio and all scene/game APIs. Let Vite
// bundle it once instead of embedding the package's nested webpack runtime.
const phaserArcade = resolve(dirname(createRequire(import.meta.url).resolve('phaser/package.json')), 'src/phaser-arcade-physics.js');
// Match phaser/config/webpack.dist.config.js's Arcade feature flags exactly.
const phaserDefines = {
  'typeof CANVAS_RENDERER': 'true',
  'typeof WEBGL_RENDERER': 'true',
  'typeof WEBGL_DEBUG': 'false',
  'typeof FEATURE_SOUND': 'true',
  global: 'globalThis',
};

/** Start only the selected game route's required requests while its entry script loads. */
function gamePreloads(): Plugin {
  let base = '/', nonce: string | undefined;
  return {
    name: 'game-startup-preloads',
    apply: 'build',
    configResolved(config) { base = config.base; nonce = config.html?.cspNonce; },
    generateBundle(_options, bundle) {
      const root = new URL(base, 'https://build.invalid').pathname;
      const paths = Object.values(bundle).map(file => file.fileName)
        .filter(file => /^assets\/.+-[\w-]{8}\.(?:js|css)$/.test(file));
      this.emitFile({ type: 'asset', fileName: '_headers', source: paths
        .map(file => `${root}${file}\n  Cache-Control: public, max-age=31536000, immutable\n`)
        .join('\n') });
    },
    transformIndexHtml: { order: 'post', handler(_html, {bundle}) {
      if (!bundle) return;
      const chunks = Object.values(bundle).filter(chunk => chunk.type === 'chunk');
      const entry = (source: string) => {
        const chunk = chunks.find(chunk => chunk.facadeModuleId?.replaceAll('\\', '/').endsWith('/' + source));
        if (!chunk) throw new Error(`Missing startup entry: ${source}`);
        return chunk.fileName;
      };
      const dependencies = (entries: string[]) => {
        const js = new Set<string>(), css = new Set<string>();
        const visit = (file: string) => {
          if (js.has(file)) return;
          const chunk = bundle[file];
          if (chunk?.type !== 'chunk') return;
          js.add(file);
          for (const style of chunk.viteMetadata?.importedCss ?? []) css.add(style);
          chunk.imports.forEach(visit);
        };
        entries.forEach(visit);
        return {js: [...js], css: [...css]};
      };
      const plan = {
        base,
        battle: dependencies([entry('src/app/startBattleApp.ts'), entry('src/phaser/start.ts')]),
        run: dependencies([entry('src/app/startRunApp.ts')]),
        images: Object.values(battleAssets).map(asset => asset.runtimePath.slice(1)),
      };
      // JSON is embedded as script text, never as executable content from a path.
      const data = JSON.stringify(plan).replaceAll('<', '\\u003c');
      const script = `(()=>{const p=${data},root=new URL(p.base,location.origin).pathname.replace(/\\/$/,""),path=location.pathname.replace(/\\/$/,"");if(path===root+"/map")return;const run=path===root+"/run",route=run?p.run:p.battle,nonce=document.currentScript?.nonce;const add=(file,rel,as)=>{const link=document.createElement("link");link.rel=rel;link.href=p.base+file;if(as!=="image")link.crossOrigin="";if(as)link.as=as;if(nonce)link.nonce=nonce;document.head.appendChild(link)};route.js.forEach(file=>add(file,"modulepreload"));route.css.forEach(file=>add(file,"preload","style"));const scene=new URLSearchParams(location.search).get("scene");if(run||(scene!=="proof"&&scene!=="content-smoke"))p.images.forEach(file=>add(file,"preload","image"))})();`;
      return [{tag: 'script', attrs: {'data-game-preloads': true, ...(nonce === undefined ? {} : {nonce})}, children: script, injectTo: 'head-prepend'}];
    }},
  };
}

export default defineConfig({
  plugins: [gamePreloads()],
  resolve: { alias: [{ find: /^phaser$/, replacement: phaserArcade }] },
  // Vite's dev dependency optimizer does not inherit the top-level define map.
  optimizeDeps: { rolldownOptions: { transform: { define: phaserDefines } } },
  define: { __BUILD_INFO__: JSON.stringify({ commit, dirty }), ...phaserDefines },
});
