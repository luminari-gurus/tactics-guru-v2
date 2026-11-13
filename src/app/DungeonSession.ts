import { levelUpFeedback } from '../domain/progression';
import { BattleSession } from './BattleSession';
import { stepDungeon, type ExplorationCommand, acceptDungeonBattle, dungeonBattle, dungeonItem, freshDungeon, readDungeon, startDungeonBattle, type DungeonState, type DungeonItemCommand } from '../domain/dungeon';
import { encodeDungeon } from '../domain/dungeonSaveEnvelope';
import { createDungeonStorage, type DungeonInspection, type DungeonSlot } from '../persistence/dungeonStorage';
import { dungeonRunRecord } from '../domain/runRecords';
import type { RunHistory } from './RunHistory';
import { acceptBattleStats, boundedStat, dungeonProgressStats, freshRunStats, type AcceptedBattle } from '../domain/runStats';
import type { BattleState } from '../domain/types';
import { ActivePlaytime } from './ActivePlaytime';
export class DungeonSession {
  private current: DungeonState;
  private battle: BattleSession | null = null;
  private disposed = false;
  private review: DungeonInspection | null = null;
  private unsaved = false;
  private progressSaved = false;
  private expectedPrimary: string | null | undefined;
  private retained: { label: string; text: string }[] = [];
  private started = false;
  private readonly playtime: ActivePlaytime | null;
  readonly history: RunHistory | null;
  private message = 'Progress has not been saved';
  get status() { return this.history?.status ? `${this.message}. ${this.history.status}` : this.message; }
  onChange: (() => void) | null = null;
  completedBattle: unknown = null;
  constructor(initial: unknown, readonly storage: ReturnType<typeof createDungeonStorage> | null = createDungeonStorage(), history: RunHistory | null = null,
    now: () => number = () => performance.now(),
    private readonly serializeWrite?: (task: () => void, unavailable: () => void) => void) {
    const checked = readDungeon(initial); if (!checked.ok) throw Error('Invalid dungeon'); this.current = checked.state;
    this.playtime = storage ? new ActivePlaytime(now) : null;
    if (!storage) { const { stats: _, ...untracked } = this.current; this.current = untracked; }
    this.history = storage ? history : null;
    if (this.history) this.history.onChange = () => { if (!this.disposed) this.report(this.message); };
    if (!storage) this.message = 'Testing dungeon. Progress resets on reload.';
  }
  get snapshot() { return structuredClone(this.current); }
  /** Commands need only copied scalar identity; keep the full state private. */
  get spatialBoundary() { const {id,depth,revision}=this.current; return {id,depth,revision}; }
  get phase() { return this.current.phase; }
  /** Durable progress is independent of transient command/recovery feedback. */
  get hasUnsavedProgress() { return this.storage !== null && (this.unsaved || !this.progressSaved); }
  private write(state: DungeonState) {
    if (!this.storage) throw Error('Testing dungeons have no save storage');
    const result = this.storage.save(state, this.expectedPrimary);
    if (result.ok) this.expectedPrimary = this.storage.lastSavedText();
    return result;
  }
  private report(text: string) { this.message = text; try { this.onChange?.(); } catch { /* Observers cannot undo state. */ } }
  dispose() { this.flushPlaytime(); this.disposed = true; this.battle?.dispose(); this.battle = null; this.onChange = null; if (this.history) this.history.onChange = null; }
  private capturePlaytime(active?: boolean) {
    if (!this.started || !this.playtime) return false;
    const elapsed = this.playtime.sample(active);
    if (!elapsed) return false;
    const stats = this.current.stats ?? freshRunStats('since-upgrade');
    this.current = { ...this.current, stats: { ...stats, activeMs: boundedStat(stats.activeMs + elapsed) } };
    this.progressSaved = false;
    return true;
  }
  setPlaytimeActive(active: boolean) {
    if (this.disposed) return;
    if (this.capturePlaytime(active && (this.current.phase === 'ready' || this.current.phase === 'battle' && this.battle?.state.outcome === 'ongoing')))
      this.save(true);
  }
  async flushPlaytime() {
    if (this.disposed) return;
    if (this.capturePlaytime(false)) void this.save(true);
    let pending: Promise<unknown>;
    do { pending = this.pendingWrite; await pending; } while (this.pendingWrite !== pending);
  }
  private pendingWrite: Promise<unknown> = Promise.resolve();
  private mutate<T>(task: () => T, failure: T, writes = true, finishAfterDispose = false): Promise<T> {
    const pending = new Promise<T>(resolve => {
      const unavailable = () => { this.report('Progress unsaved: exclusive save access unavailable. Open Save recovery to retry or export.'); resolve(failure); };
      const run = () => { if (this.disposed && !finishAfterDispose) resolve(failure); else resolve(task()); };
      if (writes && this.storage && this.serializeWrite) this.serializeWrite(run, unavailable); else run();
    });
    this.pendingWrite = pending; return pending;
  }
  private recordEnding() { if (!this.disposed && this.history) void this.history.record(dungeonRunRecord(this.current, this.history.now())); }
  save(quiet = false, feedback = '') {
    const snapshot = this.current;
    this.recordEnding();
    this.progressSaved = false;
    if (!quiet) this.report(feedback ? `Saving dungeon… ${feedback}` : 'Saving dungeon…');
    return this.mutate(() => this.current === snapshot && this.saveNow(quiet, feedback), false, true, quiet);
  }
  private saveNow(quiet = false, feedback = '') {
    if (this.disposed && !quiet) return false;
    const report = (status: string) => this.report(feedback ? `${status.replace(/\.$/, '')}. ${feedback}` : status);
    // Accepted endings survive an independent active-save opt-out or conflict.
    if (!this.storage) { report('Testing dungeon. Progress resets on reload.'); return false; }
    if (this.unsaved) { report('Playing unsaved. Floor travel requires saving; open Save recovery.'); return false; }
    const result = this.write(this.current);
    this.progressSaved = result.ok;
    if (!quiet || !result.ok || this.message.startsWith('Progress unsaved')) report(result.ok ? 'Dungeon saved on this device' : `Progress unsaved: ${result.reason}. Open Save recovery to retry or export.`);
    return result.ok;
  }
  playUnsaved() { if (!this.storage) return; this.unsaved = true; this.started = true; this.report('Playing unsaved. Floor travel requires saving; open Save recovery.'); }
  private publishSpatial(candidate: ReturnType<typeof stepDungeon>) {
    if (!candidate.ok) { this.report(`Movement refused: ${{blockedStep:'Choose an adjacent walkable cell',staleBoundary:'The floor changed; choose again',wrongPhase:'Finish the current encounter or reward first',remoteEncounter:'Walk onto the available encounter marker',resourceLimit:'Progress has reached a storage or counter limit'}[candidate.reason] ?? 'This step is unavailable'}. Nothing changed.`); return false; }
    const traveling = candidate.state.depth !== this.current.depth;
    if (traveling && this.unsaved) { this.report('Travel requires saving. Open Save recovery to retry or export.'); return false; }
    if (this.storage && !this.unsaved) {
      const saved = this.write(candidate.state);
      if (!saved.ok) { this.report(`${traveling ? 'Travel' : 'Movement'} not published: ${saved.reason}. Current floor retained; open Save recovery to retry or export.`); return false; }
    }
    this.battle?.dispose(); this.battle = null; this.current = candidate.state; this.started = true; this.review = null;
    this.progressSaved = this.storage !== null && !this.unsaved;
    this.report(!this.storage ? 'Testing dungeon. Progress resets on reload.' : this.unsaved ? 'Playing unsaved. Floor travel requires saving; open Save recovery.' : traveling ? 'Travel saved on this device' : 'Exploration saved on this device');
    return true;
  }
  step(command: ExplorationCommand) { return this.mutate(() => this.stepNow(command), false, !this.unsaved); }
  private stepNow(command: ExplorationCommand) {
    if (this.disposed || this.battle && !['ended','disposed'].includes(this.battle.phase)) return false;
    const source = this.storage && !this.current.stats ? { ...this.current, stats: freshRunStats('since-upgrade') } : this.current;
    const candidate = stepDungeon(source, command);
    if (candidate.ok && this.capturePlaytime()) return this.publishSpatial({ ...candidate,
      state: { ...candidate.state, stats: { ...candidate.state.stats!, activeMs: this.current.stats!.activeMs } } });
    return this.publishSpatial(candidate);
  }
  startEncounter() { return this.mutate(() => this.startEncounterNow(), null, !this.unsaved); }
  private startEncounterNow(): BattleSession | null {
    if (this.disposed) return null;
    if (this.battle && !['ended','disposed'].includes(this.battle.phase)) return this.battle;
    if (this.current.phase === 'ready') {
      if (!this.publishSpatial(startDungeonBattle(this.current))) return null;
    }
    if (this.current.phase !== 'battle' || !this.current.activeBattle) return null;
    const entry = this.snapshot, source = dungeonBattle(entry); if (!source) return null;
    let session: BattleSession;
    const accepted = (_state?: BattleState, batch?: AcceptedBattle) => {
      if (this.disposed || this.battle !== session || this.current.phase !== 'battle') return;
      this.capturePlaytime(session.state.outcome === 'ongoing' ? undefined : false);
      const next = acceptDungeonBattle(this.current, session.state);
      if (!next.ok) { this.report(`Dungeon boundary rejected: ${next.reason}`); return; }
      const feedback = levelUpFeedback(this.current.party, next.state.party);
      this.current = this.storage && batch ? { ...next.state, stats: acceptBattleStats(
        this.current.stats ?? freshRunStats('since-upgrade'), dungeonProgressStats(this.current).battlesWon, batch) } : next.state;
      this.review = null;
      if (session.state.outcome !== 'ongoing') this.completedBattle = { entry, selection: source.selection, state: session.state, replay: session.replay, continuation: session.continuation, events: session.events };
      this.save(false, feedback);
    };
    // A persisted boundary resumes; fresh entry retains its canonical replay origin.
    session = new BattleSession(source.catalog, this.current.activeBattle, this.current.activeBattle.seed, accepted,
      entry.activeBattle!.commandCount === 0, source.battlefield);
    this.battle = session; session.progression = structuredClone(this.current.party);
    if (session.state.outcome !== 'ongoing') { accepted(); return null; }
    return session;
  }
  dispatch(command: DungeonItemCommand) {
    if (this.disposed || this.battle && !['ended','disposed'].includes(this.battle.phase)) return false;
    const next = dungeonItem(this.current, command);
    if (!next.ok) { this.report(`Choice refused: ${next.reason}. Nothing changed.`); return false; }
    this.battle?.dispose(); this.battle = null; this.current = next.state; this.started = true; this.review = null; this.save(); return true;
  }
  inspect() { if (!this.storage) throw Error('Testing dungeons have no save storage'); const review = this.storage.inspect(); this.review = review; return review; }
  continue(review: DungeonInspection, slot: DungeonSlot = review.primary.status === 'valid' ? 'primary' : 'backup') {
    if (!this.storage || this.disposed || review !== this.review || review[slot].status !== 'valid' || !this.storage.acknowledge(review)) return false;
    const selected = review[slot]; if (selected.status !== 'valid') return false;
    this.battle?.dispose(); this.battle = null; this.current = structuredClone(selected.state); this.expectedPrimary = review.primary.text; this.unsaved = false; this.progressSaved = true; this.review = null;
    this.started = true;
    this.report(slot === 'backup' ? 'Continued backup; some progress may be lost.' : 'Continued saved dungeon');
    if (this.history) void this.history.resume(this.current.id, dungeonRunRecord(this.current, this.history.now()));
    return true;
  }
  retry(review: DungeonInspection) { this.recordEnding(); return this.mutate(() => this.retryNow(review), false); }
  private retryNow(review: DungeonInspection) {
    if (!this.storage || this.disposed || review !== this.review || !this.storage.acknowledge(review)) return false;
    this.expectedPrimary = review.primary.text; this.unsaved = false; this.review = null; return this.saveNow();
  }
  private liveExports(review: DungeonInspection) {
    const values: { label: string; text: string }[] = [];
    const current = encodeDungeon(this.current);
    if (current.ok) values.push({ label: 'current progress', text: current.text });
    for (const slot of ['primary','backup'] as const) {
      const reviewed = review[slot];
      if (reviewed.text === null) continue;
      if (reviewed.status === 'valid' && reviewed.checkpoint) {
        const exact = encodeDungeon(reviewed.state);
        if (exact.ok) {
          values.push({ label: 'backup save', text: exact.text }, { label: 'pre-fog backup save', text: reviewed.text });
          continue;
        }
      }
      values.push({ label: `${slot} save`, text: reviewed.text });
    }
    return values;
  }
  exports(review: DungeonInspection) {
    if (!this.storage) return [];
    const live = this.liveExports(review);
    const retained = this.retained.filter(copy => !live.some(value => value.label === copy.label && value.text === copy.text));
    return [...live, ...retained.map(({ label, text }, index) => ({
      label: `retained ${label} (copy ${index + 1})`, text,
    }))];
  }
  private retainExports(review: DungeonInspection) {
    for (const value of this.liveExports(review)) {
      // Startup holds a placeholder until a dungeon starts or resumes.
      if (!this.started && value.label === 'current progress') continue;
      if (!this.retained.some(copy => copy.label === value.label && copy.text === value.text)) this.retained.push(value);
    }
  }
  remove(slot: DungeonSlot, review: DungeonInspection) { return this.mutate(() => this.removeNow(slot, review), false); }
  private removeNow(slot: DungeonSlot, review: DungeonInspection) {
    if (!this.storage || this.disposed || review !== this.review) return false;
    this.retainExports(review);
    this.progressSaved = false;
    const reviewed = review[slot];
    const result = this.storage.remove(slot, reviewed.text, reviewed.status === 'valid' ? reviewed.checkpoint ?? null : null);
    this.review = null;
    this.report(result.ok ? 'Reviewed save removed. Retry saving to preserve current progress.' : `Removal refused: ${result.reason}`); return result.ok;
  }
  async replace(review: DungeonInspection, id: string, seed: number): Promise<boolean> {
    if (!this.storage || this.disposed || review !== this.review) return false;
    const expected = this.current;
    const selected = review.primary.status === 'valid' ? review.primary.state : review.backup.status === 'valid' ? review.backup.state : null;
    const old = this.started && (!selected || selected.id === this.current.id) ? this.current : selected;
    const recordedAt = this.history?.now();
    const record = old && recordedAt !== undefined ? dungeonRunRecord(old, recordedAt, true) : null;
    const other = this.started && old && old.id !== this.current.id && recordedAt !== undefined
      ? dungeonRunRecord(this.current, recordedAt, true) : null;
    const perform = async () => {
      if (this.current !== expected) { this.report('Reset refused: the dungeon changed while confirming. Review again.'); return false; }
      return this.mutate(() => this.current === expected && this.replaceNow(review, id, seed), false);
    };
    return this.history ? this.history.replace(record, id, perform, other) : perform();
  }
  private replaceNow(review: DungeonInspection, id: string, seed: number) {
    if (!this.storage || this.disposed || review !== this.review || id === this.current.id || seed === this.current.seed) return false;
    if (!this.storage.acknowledge(review)) { this.review = null; this.report('Reset refused: saved dungeon data changed. Review again.'); return false; }
    const next = freshDungeon(id, seed, undefined, true);
    this.retainExports(review);
    this.progressSaved = false;
    for (const slot of ['backup','primary'] as const) {
      const reviewed = review[slot];
      if (!this.storage.remove(slot, reviewed.text, reviewed.status === 'valid' ? reviewed.checkpoint ?? null : null).ok) {
        this.review = null; this.report('Reset incomplete. Current dungeon retained; export recovery copies and review again.'); return false;
      }
    }
    const after = this.storage.inspect();
    if (Object.values(after).some(s => s.status !== 'missing') || !this.storage.acknowledge(after)) return false;
    this.reset(next); return true;
  }
  /** Testing restart has no durable replacement or recovery step. */
  restart(id: string, seed: number) {
    if (this.storage || this.disposed) return false;
    this.reset(freshDungeon(id, seed)); return true;
  }
  private reset(next: DungeonState) {
    this.battle?.dispose(); this.battle = null; this.current = next; this.expectedPrimary = null; this.completedBattle = null; this.review = null; this.unsaved = false;
    this.started = true;
    this.saveNow();
  }
}
