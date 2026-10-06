# Tactics Guru v2

Minimal Phaser 4 + TypeScript + Vite browser-project scaffold. The only scene is a responsive startup placeholder; gameplay, legacy assets, and saves are not implemented. Restricted-SSH static beta deployment tooling lives in [`deploy/README.md`](deploy/README.md); production activation requires the documented operator gates. The original Godot project is untouched. Design plans are maintained outside this repository.

## Requirements

Node.js **22.12 or newer** (prefer a supported LTS release) and npm. Dependencies are pinned and `package-lock.json` is tracked.

## Development

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Development and preview bind to localhost by default; pass `-- --host 0.0.0.0` only when intentionally testing on a trusted LAN.

```sh
npm run typecheck
npm run build
npm run preview
```

`dist/` is generated static output, not committed. Vite currently warns about the single Phaser bundle size; production load-time optimization requires later measurement and is not claimed by this scaffold.

## Browser smoke tests

```sh
npx playwright install chromium
npm run build
npm test
```

Tests serve the production build, verify the Phaser scene boots without console/page errors, and check desktop/mobile-emulated viewport resizing in both orientations. They do not certify real iPhone Safari/Chrome or Android hardware behavior.

If browser downloads are unavailable, an existing compatible Chromium can be selected explicitly:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/absolute/path/to/chrome npm test
```

## Layout

- `src/main.ts`: minimal Phaser scene and game setup
- `src/style.css`: full-viewport canvas container
- `tests/boot.spec.ts`: production-browser boot/resize smoke test
- `playwright.config.ts`: desktop and mobile-emulated test projects

`.gitignore` excludes dependencies, build/test output, logs, local environment files, TypeScript caches and editor/OS files. Lockfiles and source/assets remain tracked; `.env.example` is allowed if needed later. No environment configuration or secrets are required.
