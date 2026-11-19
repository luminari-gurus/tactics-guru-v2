import { levelUpFeedback } from '../domain/progression';
import { BattleSession } from './BattleSession';
import { stepDungeon, type ExplorationCommand, acceptDungeonBattle, dungeonBattle, dungeonItem, freshDungeon, readDungeon, startDungeonBattle, type DungeonState, type DungeonItemCommand } from '../domain/dungeon';
import { encodeDungeon } from '../domain/dungeonSaveEnvelope';
import { createDungeonStorage, removingDungeonSaveWouldReopenRun, resumableDungeonSave, resumableDungeonSlot, type DungeonInspection, type DungeonSlot } from '../persistence/dungeonStorage';
import { dungeonRunRecord } from '../domain/runRecords';
import type { RunHistory } from './RunHistory';
import { acceptBattleStats, boundedStat, dungeonProgressStats, freshRunStats, type AcceptedBattle } from '../domain/runStats';
import type { BattleState } from '../domain/types';
import { ActivePlaytime } from './ActivePlaytime';
import { dungeonContent } from '../content/dungeon';
import { autoCollectDungeon, victoryAutoCollectIntent, type DungeonAutoCollectIntent } from '../domain/dungeonAutoCollect';

/** Describe the accepted transfer, including pickups that accompany a stair step. */
function pickupFeedback(before: DungeonState, after: DungeonState, cell: number) {
  const oldLoot = before.floors[before.depth - 1].loot ?? [];
  const newLoot = after.floors[before.depth - 1].loot ?? [];
  const collected = oldLoot.filter(item => item.cell === cell && item.remaining > 0 &&
    newLoot.some(next => next.id === item.id && next.remaining === 0));
  const left = newLoot.filter(item => item.cell === cell && item.remaining > 0);
  const labels = new Map<string, number>();
  for (const item of collected) {
    const label = dungeonContent.items[item.itemId].label;
    labels.set(label, (labels.get(label) ?? 0) + 1);
  }
  const acquired = labels.size ? `Picked up ${[...labels].map(([label, count]) => `${label}${count > 1 ? ` ×${count}` : ''}`).join(', ')}.` : '';
  const capacity = left.length ? `Inventory full: ${left.length} ${left.length === 1 ? 'item remains' : 'items remain'} on the ground.` : '';
  return [acquired, capacity].filter(Boolean).join(' ');
}
export class DungeonSession {
  private current: DungeonState;
  private battle: BattleSession | null = null;
  private disposed = false;
  private review: DungeonInspection | null = null;
  private unsaved = false;
  private progressSaved = false;
  private savedActiveMs = 0;
  private savedRevision: number | null = null;
  private boundaryError = '';
  private expectedPrimary: string | null | undefined;
  private expectedBackup?: DungeonInspection['backup'];
  private retained: { label: string; text: string }[] = [];
  private started = false;
  private readonly playtime: ActivePlaytime | null;
  /** The latest autosave waiting for exclusive access, if its lineage is still current. */
  private queuedSave: { snapshot: DungeonState; quiet: boolean; feedback: string } | null = null;
  readonly history: RunHistory | null;
  private message = 'Progress has not been saved';
  private lootMessage = '';
  get lootStatus() { return this.lootMessage; }
  get explorationStatus() { return this.withHistory(this.message); }
  get status() {
    const message = this.lootMessage && this.message
      ? `${this.message.replace(/\.$/, '')}. ${this.lootMessage}` : this.message || this.lootMessage;
    return this.withHistory(message);
  }
  private withHistory(message: string) {
    return [this.boundaryError, message, this.history?.status].filter(Boolean).join('. ');
  }
  onChange: (() => void) | null = null;
  onVictory: ((intent: DungeonAutoCollectIntent) => void) | null = null;
  completedBattle: unknown = null;
  constructor(initial: unknown, readonly storage: ReturnType<typeof createDungeonStorage> | null = createDungeonStorage(), history: RunHistory | null = null,
    now: () => number = () => performance.now(),
    private readonly serializeWrite?: (task: () => void, unavailable: (contended?: boolean) => void) => void) {
    const checked = readDungeon(initial); if (!checked.ok) throw Error('Invalid dungeon'); this.current = checked.state;
    this.playtime = storage ? new ActivePlaytime(now) : null;
    if (!storage) { const { stats: _, ...untracked } = this.current; this.current = untracked; }
    this.history = storage ? history : null;
    if (this.history) this.history.onChange = () => { if (!this.disposed) this.report(this.message, this.lootMessage); };
    if (!storage) this.message = 'Testing dungeon. Progress resets on reload.';
  }
  get snapshot() { return structuredClone(this.current); }
  /** Commands need only copied scalar identity; keep the full state private. */
  get spatialBoundary() { const {id,depth,revision}=this.current; return {id,depth,revision}; }
  get phase() { return this.current.phase; }
  /** Durable progress is independent of transient command/recovery feedback. */
  get hasUnsavedProgress() { return this.storage !== null && (this.unsaved || !this.progressSaved); }
  /** Saving mode stays enabled while ordinary writes are pending or need recovery. */
  get savesProgress() { return this.storage !== null && !this.unsaved; }
  private write(state: DungeonState) {
    if (!this.storage) throw Error('Testing dungeons have no save storage');
    const result = this.storage.save(state, this.expectedPrimary, this.expectedBackup);
    if (result.ok) {
      this.expectedPrimary = this.storage.lastSavedText();
      this.expectedBackup = undefined;
      this.savedRevision = state.revision; this.savedActiveMs = state.stats?.activeMs ?? 0;
      this.storage.clearClockCheckpoint();
    }
    return result;
  }
  private report(text: string, loot = '') {
    this.message = text;
    this.lootMessage = loot;
    try { this.onChange?.(); } catch { /* Observers cannot undo state. */ }
  }
  private reportSave(text: string, feedback: string) {
    this.report(feedback ? `${text.replace(/\.$/, '')}. ${feedback}` : text);
  }
  dispose() {
    if (this.disposed) return;
    void this.flushPlaytime();
    this.disposed = true; this.battle?.dispose(); this.battle = null;
    this.onChange = null; this.onVictory = null;
    if (this.history) this.history.onChange = null;
  }
  private capturePlaytime(active?: boolean) {
    if (!this.started || !this.playtime) return false;
    const elapsed = this.playtime.sample(active);
    if (!elapsed) return false;
    const before = this.current, stats = before.stats ?? freshRunStats('since-upgrade');
    this.current = { ...before, stats: { ...stats, activeMs: boundedStat(stats.activeMs + elapsed) } };
    this.progressSaved = false;
    // Only a clock update can advance a queued autosave's snapshot.
    if (this.queuedSave?.snapshot === before) this.queuedSave.snapshot = this.current;
    return true;
  }
  private checkpointPlaytime(active: boolean) {
    if (this.capturePlaytime(active) && this.queuedSave?.snapshot !== this.current) void this.save(true);
    // A background tab can close without another pagehide after this sample.
    const activeMs = this.current.stats?.activeMs ?? 0;
    if (this.started && this.savesProgress && this.expectedPrimary !== undefined && activeMs > this.savedActiveMs)
      this.storage?.clockCheckpoint(this.current.id, this.expectedPrimary, this.expectedBackup, activeMs);
  }
  setPlaytimeActive(active: boolean) {
    if (this.disposed) return;
    this.checkpointPlaytime(active && (this.current.phase === 'ready' || this.current.phase === 'battle' && !this.boundaryError && this.battle?.state.outcome === 'ongoing'));
  }
  async flushPlaytime() {
    if (this.disposed) return;
    this.checkpointPlaytime(false);
    let pending: Promise<unknown>;
    do { pending = this.pendingWrite; await pending; } while (this.pendingWrite !== pending);
  }
  private pendingWrite: Promise<unknown> = Promise.resolve();
  private mutate<T>(task: () => T, failure: T, writes = true, {
    finishAfterDispose = false, reportUnavailable = (message: string) => this.report(message),
  } = {}): Promise<T> {
    const pending = new Promise<T>(resolve => {
      const unavailable = (contended = false) => {
        reportUnavailable(contended
          ? 'Progress unsaved: another tab is saving. Open Save recovery to review the latest progress.'
          : 'Progress unsaved: exclusive save access unavailable. Open Save recovery to retry or export.');
        resolve(failure);
      };
      const run = () => { if (this.disposed && !finishAfterDispose) resolve(failure); else resolve(task()); };
      if (writes && this.storage && this.serializeWrite) this.serializeWrite(run, unavailable); else run();
    });
    this.pendingWrite = pending; return pending;
  }
  private recordEnding() { if (!this.disposed && this.history) void this.history.record(dungeonRunRecord(this.current, this.history.now())); }
  save(quiet = false, feedback = '') {
    // A newer save of the same lineage settles its pending predecessor's status and feedback.
    const previous = this.queuedSave;
    const request = { snapshot: this.current, quiet: quiet && (previous?.quiet ?? true),
      feedback: [previous?.feedback, feedback].filter(Boolean).join(' ') };
    this.queuedSave = request;
    this.recordEnding();
    this.progressSaved = false;
    if (!request.quiet) this.report(request.feedback ? `Saving dungeon… ${request.feedback}` : 'Saving dungeon…');
    const settle = () => {
      if (this.queuedSave !== request) return false;
      this.queuedSave = null;
      return this.current === request.snapshot;
    };
    // Accepted progress stays durable after disposal; the storage compare-and-swap guards the write.
    return this.mutate(() => settle() && this.saveNow({ quiet: request.quiet || this.disposed, feedback: request.feedback }), false, !this.unsaved, {
      finishAfterDispose: true,
      reportUnavailable: message => { if (settle()) this.reportSave(message, request.feedback); },
    });
  }
  private saveNow({ quiet = false, feedback = '', retryUnsaved = false } = {}) {
    if (this.disposed && !quiet) return false;
    // Accepted endings survive an independent active-save opt-out or conflict.
    if (!this.storage) { this.reportSave('Testing dungeon. Progress resets on reload.', feedback); return false; }
    if (this.unsaved && !retryUnsaved) { this.reportSave('Playing unsaved. Floor travel requires saving; open Save recovery.', feedback); return false; }
    const result = this.write(this.current);
    this.progressSaved = result.ok;
    if (result.ok) this.unsaved = false;
    if (!quiet || !result.ok || this.message.startsWith('Progress unsaved'))
      this.reportSave(result.ok ? 'Dungeon saved on this device' : `Progress unsaved: ${result.reason}. Open Save recovery to retry or export.`, feedback);
    return result.ok;
  }
  playUnsaved() { if (!this.storage) return; this.unsaved = true; this.started = true; this.report('Playing unsaved. Floor travel requires saving; open Save recovery.'); }
  private publishSpatial(candidate: ReturnType<typeof stepDungeon>, preparation = false) {
    if (!candidate.ok) { this.report(`Movement refused: ${{blockedStep:'Choose an adjacent walkable cell',staleBoundary:'The floor changed; choose again',wrongPhase:'Finish the current encounter or reward first',remoteEncounter:'Walk onto the available encounter marker',resourceLimit:'Progress has reached a storage or counter limit'}[candidate.reason] ?? 'This step is unavailable'}. Nothing changed.`); return false; }
    const traveling = candidate.state.depth !== this.current.depth;
    if (traveling && this.unsaved) { this.report('Travel requires saving. Open Save recovery to retry or export.'); return false; }
    if (this.storage && !this.unsaved) {
      const saved = this.write(candidate.state);
      if (!saved.ok) { this.report(`${preparation ? 'Item choice' : traveling ? 'Travel' : 'Movement'} not published: ${saved.reason}. Current ${preparation ? 'progress' : 'floor'} retained; open Save recovery to retry or export.`); return false; }
    }
    const feedback = candidate.state.phase === 'battle' ? '' : pickupFeedback(this.current, candidate.state,
      candidate.state.floors[this.current.depth - 1].position);
    this.battle?.dispose(); this.battle = null; this.current = candidate.state; this.started = true; this.review = null;
    this.progressSaved = this.storage !== null && !this.unsaved;
    const status = !this.storage ? 'Testing dungeon. Progress resets on reload.' : this.unsaved ? 'Playing unsaved. Floor travel requires saving; open Save recovery.' :
      preparation ? 'Dungeon saved on this device' : traveling ? 'Travel saved on this device' : 'Exploration saved on this device';
    this.report(status, feedback);
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
  autoCollect(intent: DungeonAutoCollectIntent, isCurrent: () => boolean) {
    return this.mutate(() => {
      // This runs inside the same exclusive write boundary as manual movement.
      // A user interaction while waiting for the lock must win the race.
      if (this.disposed || !isCurrent() || this.battle && !['ended', 'disposed'].includes(this.battle.phase)) return false;
      if (this.storage && !this.unsaved && this.savedRevision !== this.current.revision) {
        this.report('', 'Loot remains on the ground. Open Save recovery before automatic collection.');
        return false;
      }
      const source = this.storage && !this.current.stats ? { ...this.current, stats: freshRunStats('since-upgrade') } : this.current;
      const candidate = autoCollectDungeon(source, intent);
      if (!candidate.ok) {
        this.report('', candidate.reason === 'capacity'
          ? 'Inventory full. Loot remains on the ground; the party has not moved.'
          : 'Loot remains on the ground. Automatic movement was canceled.');
        return false;
      }
      if (this.capturePlaytime()) return this.publishSpatial({ ...candidate,
        state: { ...candidate.state, stats: { ...candidate.state.stats!, activeMs: this.current.stats!.activeMs } } });
      return this.publishSpatial(candidate);
    }, false, !this.unsaved);
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
      if (!next.ok) {
        session.dispose();
        this.boundaryError = `Dungeon boundary rejected: ${next.reason}. Open Save recovery to continue`;
        this.report(this.message);
        return;
      }
      const feedback = levelUpFeedback(this.current.party, next.state.party);
      const previous = this.current;
      this.current = this.storage && batch ? { ...next.state, stats: acceptBattleStats(
        this.current.stats ?? freshRunStats('since-upgrade'), dungeonProgressStats(this.current).battlesWon, batch) } : next.state;
      this.review = null;
      if (session.state.outcome !== 'ongoing') this.completedBattle = { entry, selection: source.selection, state: session.state, replay: session.replay, continuation: session.continuation, events: session.events };
      const intent = victoryAutoCollectIntent(previous, this.current);
      if (intent) { try { this.onVictory?.(intent); } catch { /* Observers cannot undo an accepted victory. */ } }
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
    return this.mutate(() => this.dispatchNow(command), false, !this.unsaved);
  }
  private dispatchNow(command: DungeonItemCommand) {
    if (this.disposed || this.battle && !['ended','disposed'].includes(this.battle.phase)) return false;
    const next = dungeonItem(this.current, command);
    if (!next.ok) { this.report(`Choice refused: ${next.reason}. Nothing changed.`); return false; }
    if (this.capturePlaytime()) return this.publishSpatial({ ...next,
      state: { ...next.state, stats: { ...this.current.stats! } } }, true);
    return this.publishSpatial(next, true);
  }
  inspect() { if (!this.storage) throw Error('Testing dungeons have no save storage'); const review = this.storage.inspect(); this.review = review; return review; }
  continue(review: DungeonInspection, slot: DungeonSlot | null = resumableDungeonSlot(review)) {
    if (!this.storage || this.disposed || review !== this.review || slot === null) return false;
    const selected = resumableDungeonSave(review, slot);
    if (!selected || !this.storage.acknowledge(review)) return false;
    // Explicit Continue abandons this live lineage, including its staged clock.
    if (this.started) this.storage.clearClockCheckpoint();
    this.battle?.dispose(); this.battle = null; this.current = structuredClone(selected.state); this.expectedPrimary = review.primary.text; this.unsaved = false; this.progressSaved = true; this.review = null;
    this.queuedSave = null;
    this.expectedBackup = slot === 'backup' ? selected : undefined;
    this.started = true; this.boundaryError = ''; this.savedRevision = this.current.revision;
    this.savedActiveMs = selected.state.stats?.activeMs ?? 0;
    this.report(slot === 'backup' ? 'Continued backup; some progress may be lost.' : 'Continued saved dungeon');
    const recovered = this.storage.clockCheckpoint(this.current.id, review.primary.text, this.expectedBackup);
    if (recovered > this.savedActiveMs) {
      this.current = { ...this.current, stats: { ...(this.current.stats ?? freshRunStats('since-upgrade')), activeMs: recovered } };
      void this.save(true);
    }
    if (this.history) void this.history.resume(this.current.id, dungeonRunRecord(this.current, this.history.now()));
    return true;
  }
  retry(review: DungeonInspection) { this.recordEnding(); return this.mutate(() => this.retryNow(review), false); }
  private retryNow(review: DungeonInspection) {
    if (!this.storage || this.disposed || review !== this.review || !this.storage.acknowledge(review)) return false;
    this.expectedPrimary = review.primary.text;
    // An explicit retry acknowledges the newly reviewed storage boundary.
    if (this.expectedBackup) this.expectedBackup = review.backup.status === 'valid' ? review.backup : undefined;
    this.review = null;
    return this.saveNow({ retryUnsaved: true });
  }
  private liveExports(review: DungeonInspection) {
    const values: { label: string; text: string }[] = [];
    if (this.started) {
      const current = encodeDungeon(this.current);
      if (current.ok) values.push({ label: 'current progress', text: current.text });
    }
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
      if (!this.retained.some(copy => copy.label === value.label && copy.text === value.text)) this.retained.push(value);
    }
  }
  remove(slot: DungeonSlot, review: DungeonInspection) { return this.mutate(() => this.removeNow(slot, review), false); }
  private removeNow(slot: DungeonSlot, review: DungeonInspection) {
    if (!this.storage || this.disposed || review !== this.review) return false;
    if (removingDungeonSaveWouldReopenRun(this.storage.inspect(), slot)) {
      this.report('Remove the earlier checkpoint before removing the defeated save.');
      return false;
    }
    this.retainExports(review);
    this.progressSaved = false;
    this.savedRevision = null;
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
    const next = freshDungeon(id, seed, undefined, true);
    this.retainExports(review);
    const result = this.storage.replace(review, next);
    this.review = null;
    if (!result.ok) {
      this.report(`Reset refused: ${result.reason}. Review saved progress before retrying.`);
      return false;
    }
    this.reset(next);
    this.expectedPrimary = this.storage.lastSavedText();
    this.progressSaved = true; this.savedRevision = next.revision; this.savedActiveMs = 0;
    this.storage.clearClockCheckpoint();
    this.report('Dungeon saved on this device');
    return true;
  }
  /** Testing restart has no durable replacement or recovery step. */
  restart(id: string, seed: number) {
    if (this.storage || this.disposed) return false;
    this.reset(freshDungeon(id, seed)); this.report('Testing dungeon. Progress resets on reload.'); return true;
  }
  private reset(next: DungeonState) {
    this.battle?.dispose(); this.battle = null; this.current = next; this.expectedPrimary = null; this.completedBattle = null; this.review = null; this.unsaved = false;
    this.queuedSave = null; this.started = true; this.boundaryError = '';
    this.expectedBackup = undefined;
  }
}
