import { levelUpFeedback } from '../domain/progression';
import { BattleSession } from './BattleSession';
import { stepDungeon, type ExplorationCommand, acceptDungeonBattle, dungeonBattle, dungeonItem, freshDungeon, readDungeon, startDungeonBattle, travelDungeon, type DungeonState, type DungeonItemCommand } from '../domain/dungeon';
import { encodeDungeon } from '../domain/dungeonSaveEnvelope';
import { createDungeonStorage, type DungeonInspection, type DungeonSlot } from '../persistence/dungeonStorage';
export class DungeonSession {
  private current: DungeonState;
  private battle: BattleSession | null = null;
  private disposed = false;
  private review: DungeonInspection | null = null;
  private unsaved = false;
  private retained: { label: string; text: string }[] = [];
  status = 'Progress has not been saved';
  onChange: (() => void) | null = null;
  completedBattle: unknown = null;
  constructor(initial: unknown, readonly storage = createDungeonStorage()) {
    const checked = readDungeon(initial); if (!checked.ok) throw Error('Invalid dungeon'); this.current = checked.state;
  }
  get snapshot() { return structuredClone(this.current); }
  private report(text: string) { this.status = text; try { this.onChange?.(); } catch { /* Observers cannot undo state. */ } }
  dispose() { this.disposed = true; this.battle?.dispose(); this.battle = null; this.onChange = null; }
  save() {
    if (this.disposed) return false;
    if (this.unsaved) { this.report('Playing unsaved. Floor travel requires saving; open Save recovery.'); return false; }
    const result = this.storage.save(this.current);
    this.report(result.ok ? 'Dungeon saved on this device' : `Progress unsaved: ${result.reason}. Open Save recovery to retry or export.`);
    return result.ok;
  }
  playUnsaved() { this.unsaved = true; this.report('Playing unsaved. Floor travel requires saving; open Save recovery.'); }
  travel(direction: 'ascend' | 'descend', revision: number) {
    if (this.disposed || this.battle && !['ended','disposed'].includes(this.battle.phase)) return false;
    const candidate = travelDungeon(this.current, direction, revision);
    if (!candidate.ok) { this.report(`Travel refused: ${candidate.reason}. Nothing changed.`); return false; }
    if (this.unsaved) { this.report('Travel requires saving. Open Save recovery to retry or export.'); return false; }
    const saved = this.storage.save(candidate.state);
    if (!saved.ok) { this.report(`Travel not published: ${saved.reason}. Current floor retained; review recovery before retrying.`); return false; }
    this.battle?.dispose(); this.battle = null; this.current = candidate.state; this.review = null;
    this.report('Travel saved on this device'); return true;
  }
  private publishSpatial(candidate: ReturnType<typeof stepDungeon>) {
    if (!candidate.ok) { this.report(`Movement refused: ${{blockedStep:'Choose an adjacent walkable cell',staleBoundary:'The floor changed; choose again',wrongPhase:'Finish the current encounter or reward first',remoteEncounter:'Walk onto the available encounter marker',resourceLimit:'Progress has reached a storage or counter limit'}[candidate.reason] ?? 'This step is unavailable'}. Nothing changed.`); return false; }
    if (!this.unsaved) {
      const saved = this.storage.save(candidate.state);
      if (!saved.ok) { this.report(`Movement not published: ${saved.reason}. Open Save recovery to retry or export.`); return false; }
    }
    this.battle?.dispose(); this.battle = null; this.current = candidate.state; this.review = null;
    this.report(this.unsaved ? 'Playing unsaved. Floor travel requires saving; open Save recovery.' : 'Exploration saved on this device');
    return true;
  }
  step(command: ExplorationCommand) {
    if (this.disposed || this.battle && !['ended','disposed'].includes(this.battle.phase)) return false;
    return this.publishSpatial(stepDungeon(this.current, command));
  }
  startEncounter() {
    if (this.disposed) return null;
    if (this.battle && !['ended','disposed'].includes(this.battle.phase)) return this.battle;
    if (this.current.phase === 'ready') {
      if (!this.publishSpatial(startDungeonBattle(this.current))) return null;
    }
    if (this.current.phase !== 'battle' || !this.current.activeBattle) return null;
    const entry = this.snapshot, source = dungeonBattle(entry); if (!source) return null;
    let session: BattleSession;
    const accepted = () => {
      if (this.disposed || this.battle !== session || this.current.phase !== 'battle') return;
      const next = acceptDungeonBattle(this.current, session.state);
      if (!next.ok) { this.report(`Dungeon boundary rejected: ${next.reason}`); return; }
      const feedback = levelUpFeedback(this.current.party, next.state.party);
      this.current = next.state; this.review = null;
      if (session.state.outcome !== 'ongoing') this.completedBattle = { entry, selection: source.selection, state: session.state, replay: session.replay, continuation: session.continuation, events: session.events };
      this.save();
      if (feedback) this.report(`${this.status}. ${feedback}`);
    };
    // A persisted boundary resumes; fresh entry retains its canonical replay origin.
    session = new BattleSession(source.catalog, this.current.activeBattle, this.current.activeBattle.seed, accepted,
      entry.activeBattle!.commandCount === 0, source.battlefield);
    this.battle = session; session.progression = this.current.party;
    if (session.state.outcome !== 'ongoing') { accepted(); return null; }
    return session;
  }
  dispatch(command: DungeonItemCommand) {
    if (this.disposed || this.battle && !['ended','disposed'].includes(this.battle.phase)) return false;
    const next = dungeonItem(this.current, command);
    if (!next.ok) { this.report(`Choice refused: ${next.reason}. Nothing changed.`); return false; }
    this.battle?.dispose(); this.battle = null; this.current = next.state; this.review = null; this.save(); return true;
  }
  inspect() { const review = this.storage.inspect(); this.review = review; return review; }
  continue(review: DungeonInspection, slot: DungeonSlot = review.primary.status === 'valid' ? 'primary' : 'backup') {
    if (this.disposed || review !== this.review || review[slot].status !== 'valid' || !this.storage.acknowledge(review)) return false;
    const selected = review[slot]; if (selected.status !== 'valid') return false;
    this.battle?.dispose(); this.battle = null; this.current = structuredClone(selected.state); this.unsaved = false; this.review = null;
    this.report(slot === 'backup' ? 'Continued backup; some progress may be lost.' : 'Continued saved dungeon'); return true;
  }
  retry(review: DungeonInspection) {
    if (this.disposed || review !== this.review || !this.storage.acknowledge(review)) return false;
    this.unsaved = false; this.review = null; return this.save();
  }
  exports(review: DungeonInspection) {
    const values = [...this.retained];
    const current = encodeDungeon(this.current);
    if (current.ok) values.push({ label: 'current progress', text: current.text });
    for (const slot of ['primary','backup'] as const) if (review[slot].text !== null) values.push({ label: `${slot} save`, text: review[slot].text! });
    return values;
  }
  remove(slot: DungeonSlot, review: DungeonInspection) {
    if (this.disposed || review !== this.review) return false;
    this.retained = this.exports(review);
    const result = this.storage.remove(slot, review[slot].text); this.review = null;
    this.report(result.ok ? 'Reviewed save removed. Retry saving to preserve current progress.' : `Removal refused: ${result.reason}`); return result.ok;
  }
  replace(review: DungeonInspection, id: string, seed: number) {
    if (this.disposed || review !== this.review || id === this.current.id || seed === this.current.seed) return false;
    const next = freshDungeon(id, seed);
    this.retained = this.exports(review);
    for (const slot of ['backup','primary'] as const) if (!this.storage.remove(slot, review[slot].text).ok) {
      this.review = null; this.report('Reset incomplete. Current dungeon retained; export recovery copies and review again.'); return false;
    }
    const after = this.storage.inspect();
    if (Object.values(after).some(s => s.status !== 'missing') || !this.storage.acknowledge(after)) return false;
    this.battle?.dispose(); this.battle = null; this.current = next; this.completedBattle = null; this.review = null; this.unsaved = false;
    this.save(); return true;
  }
}
