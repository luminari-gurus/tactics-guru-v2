# Tasks

## 1. Authoritative state

- [x] 1.1 Implement the pure versioned marker factory and non-DOM typecheck inclusion; verify 260 seeds × 3 types × 3 biomes, pinned terrain/marker fingerprints, frozen input and RNG isolation, bounded selection, malformed/disconnected failure and real fallback placement in the existing unit suite.
- [x] 1.2 Document the exported model and placement policy in the map guide and keep the handoff current; verify links and focused model tests.

## 2. Route and presentation

- [x] 2.1 Retain and commit complete worlds through existing controls, preserving pending/invalid seeds and asynchronous art state; verify real-route model parity, resets, entropy fallback and delayed success/network/decode checks in the existing browser suite.
- [x] 2.2 Add compact circle/diamond overlays, wrapping legend and accessible descriptions; verify the 3 types × 3 biomes × 2 art matrix on desktop/portrait/landscape, 320px screenshots, keyboard and touch controls; update the README and map guide.
- [x] 2.3 Implement explicit initial/regeneration placement failure and recovery; verify a dev-server module-interception test preserves prior state, committed controls and failure feedback through art completion without a production fault switch.

## 3. Integration and delivery

- [x] 3.1 Run production build, focused full browser suite, controlled dev failure and configured-base checks; inspect screenshots, resolve findings and record commands, source, results and limitations in the QA record and handoff.
- [ ] 3.2 Validate OpenSpec, document links and diff; commit/push reviewable chunks and open a focused PR for #154 with #155 model handoff; verify remote head/base and clean branch parity.

## Workflow follow-up

- Leave the change active for review; merge, deployment and archive are not part of this delivery.
