import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { arch, cpus, platform, release } from 'node:os';
import { createServer } from 'vite';
import type { SaveFixture } from '../tests/helpers/saveFixtures';

// Node strips this script's types; Vite resolves the project's extensionless TS imports.
// Run: node --experimental-strip-types scripts/measure-save-envelope.ts [output.json]
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { saveFixtures } = await server.ssrLoadModule('/tests/helpers/saveFixtures.ts') as typeof import('../tests/helpers/saveFixtures');
  const { readBattleState, readReplay, contentVersion } = await server.ssrLoadModule('/src/domain/battle.ts') as typeof import('../src/domain/battle');
  const { replayBattle } = await server.ssrLoadModule('/src/domain/turns.ts') as typeof import('../src/domain/turns');
  const { canonical, hashJson } = await server.ssrLoadModule('/src/domain/contentIdentity.ts') as typeof import('../src/domain/contentIdentity');
  const fixtures = saveFixtures();
  const repetitions = 5;
  const measure = <T>(operation: () => T) => {
    const started = performance.now(); const value = operation();
    return { value, ms: performance.now() - started };
  };
  function candidate(fixture: SaveFixture, mode: 'snapshot' | 'replay') {
    const read = (payload: unknown) => {
      const checked = mode === 'snapshot' ? readBattleState(payload, fixture.catalog) : readReplay(payload, fixture.catalog);
      if (!checked.ok) throw Error(`Invalid ${mode} fixture`);
      return 'state' in checked ? checked.state : checked.replay;
    };
    // Both candidates use the same outer fields and digest algorithm; kind is their format identity.
    const encode = () => {
      const payload = read(mode === 'snapshot' ? fixture.state : fixture.replay);
      const body = { kind: `tactics-guru:battle-${mode}`, format: 1, payload };
      return canonical({ ...body, digest: hashJson(body) });
    };
    const sample = () => {
      const encoded = measure(encode);
      const parsed = measure(() => JSON.parse(encoded.value));
      const validated = measure(() => read(parsed.value.payload));
      const integrity = measure(() => {
        const { digest, ...body } = parsed.value;
        if (digest !== hashJson(body)) throw Error('Digest mismatch');
      });
      // Snapshot's reader already reconstructs an owned state; no second clone is needed.
      const reconstructed = measure(() => {
        if (mode === 'snapshot') return validated.value;
        const result = replayBattle(validated.value, fixture.catalog);
        if (!result.ok) throw Error('Replay semantics rejected');
        return result.state;
      });
      if (canonical(reconstructed.value) !== canonical(fixture.state)) throw Error('State mismatch');
      return { codeUnits: encoded.value.length, utf8Bytes: Buffer.byteLength(encoded.value, 'utf8'),
        encodeMs: encoded.ms, parseMs: parsed.ms, validateMs: validated.ms, integrityMs: integrity.ms,
        reconstructMs: reconstructed.ms, decodeMs: parsed.ms + validated.ms + integrity.ms + reconstructed.ms };
    };
    sample(); // One discarded warmup per candidate/fixture; no concurrent benchmark work.
    return Array.from({ length: repetitions }, sample);
  }
  const results = fixtures.map(fixture => ({ name: fixture.name, catalog: contentVersion(fixture.catalog),
    seed: fixture.state.seed, commandCount: fixture.state.commandCount, outcome: fixture.state.outcome,
    stateDigest: hashJson(fixture.state), replayDigest: hashJson(fixture.replay),
    snapshot: candidate(fixture, 'snapshot'), replay: candidate(fixture, 'replay') }));
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const output = process.argv[2] ?? 'docs/qa/issue-69/comparison.json';
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ sourceCommit: git('rev-parse', 'HEAD'), sourceTree: git('rev-parse', 'HEAD^{tree}'),
    dirtyPaths: git('status', '--porcelain'), runtime: process.version, platform: platform(), release: release(), arch: arch(),
    cpu: cpus()[0]?.model, repetitions, warmups: 1, unit: 'milliseconds',
    conditions: 'Serial Node host run, catalog identity prewarmed by fixture construction; no browser or mobile certification. Encode validates payload shape; replay semantic reconstruction is measured in decode.',
    results }, null, 2) + '\n');
  console.log(`Saved ${results.length} fixture comparisons to ${output}`);
} finally { await server.close(); }
