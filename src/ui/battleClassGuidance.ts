import type { BattleSession } from '../app/BattleSession';
import type { CombatSkin } from './combatControls';
import { classTipForTurn, previewLesson, type ClassTip, type ClassGuidanceRun } from './classGuidance';
import { dismissClassGuidanceTip, markClassGuidanceSeen, readClassGuidanceDismissed, readClassGuidancePreferences, watchClassGuidancePreferences } from './classGuidancePreferences';

/** Presentation-only help. Showing or skipping a tip never acknowledges a lesson. */
export class BattleClassGuidance {
  private readonly root = document.createElement('section');
  private readonly title = document.createElement('strong');
  private readonly text = document.createElement('p');
  private readonly teaching = document.createElement('p');
  private readonly dismiss = document.createElement('button');
  private readonly feedback = document.createElement('p');
  private readonly abort = new AbortController();
  private readonly stopWatching: () => void;
  private skin: CombatSkin = 'rail';
  private turn = '';
  private dismissedTurn = '';
  private tip: ClassTip | null = null;

  constructor(parent: HTMLElement, private readonly session: BattleSession, private readonly focusAction: () => void,
    private readonly run: ClassGuidanceRun = { dismissed: new Set() }) {
    this.root.id = 'battle-class-guidance';
    this.root.hidden = true;
    this.root.setAttribute('aria-labelledby', 'battle-class-tip-title');
    this.title.id = 'battle-class-tip-title';
    this.text.id = 'battle-class-tip';
    this.teaching.id = 'battle-guidance-teaching';
    this.dismiss.id = 'battle-guidance-dismiss';
    this.dismiss.type = 'button';
    this.dismiss.textContent = '×';
    this.dismiss.setAttribute('aria-label', 'Dismiss tip');
    this.dismiss.title = 'Dismiss tip for this run';
    this.feedback.id = 'battle-guidance-feedback';
    this.feedback.setAttribute('role', 'status');
    this.feedback.hidden = true;
    const copy = document.createElement('div');
    copy.append(this.title, this.text);
    this.root.append(copy, this.dismiss, this.teaching);
    parent.prepend(this.root, this.feedback);
    this.dismiss.addEventListener('click', () => {
      if (this.root.hidden || this.dismiss.disabled || !this.tip || this.session.phase !== 'player') return;
      const ids = [this.tip.id, ...(!this.teaching.hidden ? [this.teaching.dataset.tutorialId!] : [])];
      // Preference notifications are synchronous: establish dismissal first so
      // acknowledging the lesson cannot reveal a different tip in this turn.
      this.dismissedTurn = this.turn;
      this.run.dismissed.add(this.tip.id);
      const saved = this.run.runId ? dismissClassGuidanceTip(this.run.runId, ids) : markClassGuidanceSeen(ids);
      this.feedback.textContent = saved ? '' : 'This browser could not save tutorial progress. It applies until you leave this page.';
      this.feedback.hidden = saved;
      this.render(this.skin);
      this.focusAction();
    }, { signal: this.abort.signal });
    this.stopWatching = watchClassGuidancePreferences(reset => {
      if (reset) {
        this.turn = '';
        this.dismissedTurn = '';
        this.run.dismissed.clear();
        this.tip = null;
        this.feedback.hidden = true;
      }
      this.render(this.skin);
    });
  }

  render(skin: CombatSkin): void {
    this.skin = skin;
    const preferences = readClassGuidancePreferences();
    if (!preferences.enabled) { this.hide(); return; }
    // Accepted End Turn already points at the next actor. Retain the last
    // settled player's copy until the same handoff used by the board completes.
    if (this.session.phase === 'presenting') { this.dismiss.disabled = true; return; }
    if (this.session.phase !== 'player' || this.session.state.outcome !== 'ongoing') { this.hide(); return; }
    const { state, active } = this.session;
    const turn = `${state.seed}:${state.mapId}:${state.round}:${active.id}`;
    const dismissed = [...this.run.dismissed, ...(this.run.runId ? readClassGuidanceDismissed(this.run.runId) : [])];
    if (turn !== this.turn) {
      this.turn = turn;
      this.tip = classTipForTurn(this.session, preferences.seen, dismissed);
      this.feedback.hidden = true;
    }
    if (this.dismissedTurn === turn || !this.tip || dismissed.includes(this.tip.id)) { this.hide(); return; }
    const lesson = previewLesson(skin);
    this.root.dataset.unitId = String(active.id);
    this.root.dataset.round = String(state.round);
    if (this.title.textContent !== this.tip.title) this.title.textContent = this.tip.title;
    if (this.text.textContent !== this.tip.text) this.text.textContent = this.tip.text;
    this.text.dataset.tutorialId = this.tip.id;
    if (this.teaching.textContent !== lesson.text) this.teaching.textContent = lesson.text;
    this.teaching.dataset.tutorialId = lesson.id;
    this.teaching.hidden = preferences.seen.includes(lesson.id);
    this.dismiss.disabled = false;
    this.root.hidden = false;
  }

  private hide(): void {
    const focused = this.root.contains(document.activeElement);
    this.root.hidden = true;
    if (focused) this.focusAction();
  }

  dispose(): void {
    this.abort.abort();
    this.stopWatching();
    this.root.remove();
    this.feedback.remove();
  }
}
