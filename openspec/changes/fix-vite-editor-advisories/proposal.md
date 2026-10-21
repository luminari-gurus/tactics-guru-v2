# Proposal

## Why

Dependency installation for #159 reported three Vite 8.3.2 launch-editor command execution advisories, including Windows argument/path handling. The package audit identifies patched Vite 8.3.5.

## What Changes

- Pin Vite 8.3.5 and refresh its lockfile entries in an independent PR.
- Verify the dependency audit, content/type/build pipeline and existing production-header tests.

## Capabilities

No game requirement changes. This is a development-tool dependency patch (`skip_specs: true`).

## Impact

`package.json` and `package-lock.json`; no game rules, save identity, production deployment or new dependency.
