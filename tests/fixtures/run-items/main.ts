import { RunItemSession } from '../../../src/app/RunItemSession';
import { BattleDialogs } from '../../../src/ui/dialogs';
import { mountRunItems } from '../../../src/ui/runItems';
import { createRunStorage } from '../../../src/persistence/runStorage';
import { activeSnapshot, preparedSnapshot, rewardSnapshot, runContext } from '../../helpers/runItemFixtures';
import { bindBoardInput } from '../../../src/phaser/BoardInput';
const params = new URLSearchParams(location.search);
const initial = params.get('state') === 'prepared' ? preparedSnapshot() : params.get('state') === 'active' ? activeSnapshot() : rewardSnapshot(Number(params.get('seed') ?? 123));
const start = params.has('capacity') ? { ...initial, items: { ...initial.items, ownership: { ...initial.items.ownership,
  consumables: [{ itemId: 'item:healing_draught' as const, quantity: 9 }] } } } : initial;
const storage = createRunStorage(runContext, () => params.has('unavailable') ? null : window.localStorage);
const session = new RunItemSession(start, runContext, storage);
const loaded = session.inspect();
if (loaded.ok && loaded.selected) session.continue(loaded);
else if (loaded.ok && Object.values(loaded.inspection).every(s => s.status === 'missing')) session.save();
const root = document.querySelector<HTMLElement>('#items')!;
const canvas = document.querySelector<HTMLCanvasElement>('#board')!;
let selected = 0;
const dialogs = new BattleDialogs(() => input?.reset(), () => {});
const input = bindBoardInput(canvas, { select: () => { selected++; evidence(); }, pan: () => {}, zoom: () => {} },
  () => ({ width: canvas.clientWidth, height: canvas.clientHeight }), () => !dialogs.open);
const dispose = mountRunItems(root, session, dialogs);
function evidence() {
  document.querySelector('#evidence')!.textContent = JSON.stringify({ build: __BUILD_INFO__, snapshot: session.snapshot, selected, status: session.status });
}
const render = session.onChange!;
session.onChange = () => { render(); evidence(); };
evidence();
window.addEventListener('pagehide', () => { dispose(); dialogs.dispose(); input(); }, { once: true });
