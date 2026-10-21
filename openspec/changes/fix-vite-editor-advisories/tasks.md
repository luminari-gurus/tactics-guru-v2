# Tasks

## 1. Patch dependency

- [x] 1.1 Pin Vite 8.3.5 with minimal lockfile updates; verify npm audit reports zero vulnerabilities and package diff has no unrelated changes.
- [x] 1.2 Verify content validation, both TypeScript scopes, production build, existing build-header tests and strict OpenSpec; publish a focused review-ready PR with exact branch parity.

Delivered in [PR #193](https://github.com/luminari-gurus/tactics-guru-v2/pull/193), independent of the #159 stack. `npm audit` reports zero vulnerabilities; 190 content tests, both typechecks, production build, two production-header tests and strict OpenSpec pass. Review only; no merge or deployment.
