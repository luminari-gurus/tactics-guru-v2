import { assert, expect, it } from 'vitest';
import { preparedSnapshot, rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { createRunStorage, RUN_STORAGE_KEYS as keys } from '../../src/persistence/runStorage';
import { BATTLE_STORAGE_KEYS } from '../../src/persistence/battleStorage';
import { encodeRunSave } from '../../src/domain/runSaveEnvelope';
function fixture() {
  const data = new Map<string, string>([['godot:save', 'legacy'], [BATTLE_STORAGE_KEYS.primary, 'battle']]);
  let fail = '';
  const store = { getItem(key: string) { if (fail === 'read') throw new DOMException('', 'SecurityError'); return data.get(key) ?? null; },
    setItem(key: string, value: string) { if (fail === key) throw new DOMException('', 'QuotaExceededError'); data.set(key, value); },
    removeItem(key: string) { if (fail === 'remove') throw Error('failed'); data.delete(key); } };
  return { data, storage: createRunStorage(runContext, () => store), fail(value: string) { fail = value; } };
}
it('saves only owned keys, rotates validated backup and preserves recovery on failed primary publication', () => {
  const f = fixture();
  expect(f.storage.save(rewardSnapshot()).ok).toBe(true);
  const old = f.data.get(keys.primary)!;
  expect(f.data.get(keys.backup)).toBe(old);
  f.fail(keys.primary);
  expect(f.storage.save(preparedSnapshot())).toMatchObject({ ok: false, kind: 'quota', slot: 'primary' });
  expect(f.data.get(keys.backup)).toBe(old);
  expect(f.data.get(keys.primary)).toBe(old);
  f.fail(''); expect(f.storage.save(preparedSnapshot()).ok).toBe(true);
  expect(f.data.get(keys.backup)).toBe(old);
  expect(f.data.get('godot:save')).toBe('legacy');
  expect(f.data.get(BATTLE_STORAGE_KEYS.primary)).toBe('battle');
});
it('preserves either damaged slot exactly and refuses implicit repair', () => {
  for (const slot of ['primary', 'backup'] as const) {
    const f = fixture(); f.storage.save(rewardSnapshot());
    f.data.set(keys[slot], ' \n{damaged raw'); const before = [...f.data];
    const load = f.storage.load(); assert(load.ok);
    expect(load.inspection[slot]).toMatchObject({ status: 'invalid', text: ' \n{damaged raw' });
    expect(load.selected?.slot).toBe(slot === 'primary' ? 'backup' : 'primary');
    expect(f.storage.save(preparedSnapshot())).toMatchObject({ ok: false, reason: 'recoveryRequired' });
    expect([...f.data]).toEqual(before);
    expect(f.storage.removeSlot(slot, 'obsolete')).toMatchObject({ ok: false, reason: 'changed' });
    expect(f.storage.removeSlot(slot, ' \n{damaged raw').ok).toBe(true);
  }
});
it('guards acquisition, reads, backup writes and explicit removal', () => {
  expect(createRunStorage(runContext, () => { throw new DOMException('', 'SecurityError'); }).load()).toMatchObject({ ok: false, kind: 'security' });
  expect(createRunStorage(runContext, () => null).load()).toMatchObject({ ok: false, kind: 'unavailable' });
  const f = fixture(); f.fail('read');
  const load = f.storage.load(); assert(load.ok); expect(load.inspection.primary.status).toBe('unavailable');
  f.fail(keys.backup); const before = [...f.data];
  expect(f.storage.save(rewardSnapshot())).toMatchObject({ ok: false, slot: 'backup' }); expect([...f.data]).toEqual(before);
  f.fail(''); f.storage.save(rewardSnapshot()); f.fail('remove');
  expect(f.storage.removeSlot('primary', f.data.get(keys.primary)!)).toMatchObject({ ok: false, operation: 'remove' });
  expect(f.storage.removeSlot('foreign' as any, null)).toEqual({ ok: false, reason: 'invalidSlot' });
});
it('keeps sole valid backup when saving after explicit bad-primary removal', () => {
  const f = fixture(); const encoded = encodeRunSave(rewardSnapshot(), runContext); assert(encoded.ok);
  f.data.set(keys.backup, encoded.text); f.storage.save(preparedSnapshot());
  expect(f.data.get(keys.backup)).toBe(encoded.text);
});
