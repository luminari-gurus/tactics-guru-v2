import { expect, it } from 'vitest';
import { stat } from 'node:fs/promises';
import { BATTLE_CUES } from '../../src/audio/battleCues';
import { cueBytes, inventory } from '../../scripts/battle-audio-inventory';

it('counts the actual cue files equally with Windows and POSIX inventory paths',async()=>{
  const files=await inventory('public');
  const sizes=await Promise.all(Object.values(BATTLE_CUES).map(cue=>stat(`public${cue.url}`).then(file=>file.size)));
  const expected=sizes.reduce((a,b)=>a+b,0);
  expect(expected).toBe(11741);
  expect(cueBytes(files)).toBe(expected);
  expect(cueBytes(files.map(file=>({...file,path:file.path.replaceAll('/','\\')})))).toBe(expected);
  expect(files.filter(file=>file.path.startsWith('audio/battle/'))).toHaveLength(8);
  expect(cueBytes([{path:'other/audio/battle/example.mp3',bytes:100},{path:'audio/proof.mp3',bytes:100}])).toBe(0);
});
