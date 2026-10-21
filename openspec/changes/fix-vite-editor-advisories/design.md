# Design

## Context

`npm audit` reports GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw and GHSA-587h-7wmj-h5pm against Vite 8.3.2. See the proposal for scope.

## Decisions

Use the available same-minor patch 8.3.5, keeping exact version pinning and the existing build configuration. No custom middleware workaround or audit suppression is needed. Keep this independent of the biome encounter stack.

## Proof

Run `npm audit`, `npm run build`, existing `buildHeaders.test.ts`, and strict OpenSpec. Record actual results in tasks before publishing.
