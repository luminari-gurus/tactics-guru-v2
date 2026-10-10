import Phaser from 'phaser';
import { battleCatalog } from '../content/catalog';
import type { CellPosition, ContentCatalog } from '../content/types';
import { BattleSession, type Presentation } from '../app/BattleSession';
import { previewMove, previewMovement } from '../domain/grid';
import { measurements, setBattleAudioDiagnostics } from '../diagnostics/browser';
import { BattleHud, actionCommand, previewText, type Action } from '../ui/hud';
import { BattleDialogs } from '../ui/dialogs';
import { BoardRenderer } from './BoardRenderer';
import { bindBoardInput } from './BoardInput';
import { contentLoadPlan, loadContentAssets } from './contentLoading';
import { BattleAudio } from './BattleAudio';

export const FIRST_BATTLE_MAP_ID = 'map:forest_ruins';
export class BattleScene extends Phaser.Scene {
  private seed = 1;
  private soundEnabled = false;
  constructor(private readonly status: (state: 'loading'|'ready'|'error') => void, private readonly error: (message:string)=>void) {super('battle');}
  create():void {
    this.status('loading');measurements.begin(performance.now());
    let catalog:ContentCatalog;
    try{catalog=contentLoadPlan(battleCatalog);}catch(e){this.error(e instanceof Error?e.message:'Invalid battle content');return;}
    loadContentAssets(this,catalog,()=>{try{this.begin(catalog);}catch(e){this.error(e instanceof Error?e.message:'Could not render battle');}},this.error);
  }
  private begin(catalog:ContentCatalog):void {
    const session=new BattleSession(catalog,FIRST_BATTLE_MAP_ID,this.seed);this.seed=(this.seed+1)>>>0;
    let selected:CellPosition|null=null,action:Action|null=null,message='Choose an action and target',live=true,ready=false,outcomeShown=false,initialFit=true;
    let animation:{done:Promise<void>;cancel:()=>void}|null=null;
    const game=document.querySelector<HTMLElement>('#game')!;
    const canvas=this.game.canvas;canvas.tabIndex=0;canvas.setAttribute('aria-label','Battle board. Arrow keys navigate, Enter selects, Escape cancels.');
    let cursor:CellPosition=session.active.cell;
    const clear=()=>{session.cancel();action=null;message='Choose an action and target';};
    const refresh=()=>{
      if(!live)return;
      const reach=session.phase==='player'?previewMovement(session.state,session.active.id,catalog):null;
      const preview=session.pending?.type==='move'?previewMove(session.state,session.pending,catalog):null;
      board.present(session.state,reach?.ok?reach.cells.map(c=>c.cell):[],selected,preview?.ok?preview.path:[]);
      hud.render(action,selected,message);
      game.dataset.phase=session.phase;
      game.dataset.session=JSON.stringify({state:session.state,replay:session.replay,events:session.events,pending:session.pending,phase:session.phase});
      if(ready && session.phase==='ended' && !outcomeShown){outcomeShown=true;dialogs.show(session.state.outcome==='playerWin'?'Victory':'Defeat','Battle complete. Restart for a fresh battle.',null,null);}
    };
    const describe=(command: import('../domain/types').Command)=>{
      const text=previewText(session.prepare(command));
      if(command.type!=='useAbility')return text;
      const ability=catalog.abilities[command.abilityId];
      const effect=ability.kind==='guardedAttack'?` · −${ability.attackPenalty} attack / +${ability.armorClassBonus} AC until your next turn`:'';
      return `${text} · range ${ability.rangeMin}–${ability.rangeMax}${effect}`;
    };
    const select=(cell:CellPosition|null)=>{
      if(!live || !ready || dialogs.open || session.phase!=='player')return;
      selected=cell;if(cell)cursor=cell;session.cancel();
      if(action && cell){const command=actionCommand(session,action,cell);message=command?describe(command):'Unavailable: choose a living target';}
      refresh();
    };
    const board=new BoardRenderer(this,catalog,FIRST_BATTLE_MAP_ID,select);
    const removeInput=bindBoardInput(canvas,board,()=>({width:this.scale.width,height:this.scale.height}),()=>ready && !initialFit && !dialogs.open);
    const restart=()=>document.querySelector<HTMLButtonElement>('#fit-restart')!.click();
    const dialogs=new BattleDialogs(()=>removeInput.reset(),restart);
    const present=async(step:Presentation|null)=>{
      if(!step){refresh();return;}
      clear();selected=null;removeInput.reset();hud.append(step.events);audio.present(step.token,step.events);
      refresh();animation=board.animate(step.before,step.after,step.events);
      // Suspension may finish presentation early, but never resolve the command again.
      await animation.done;if(!live)return;animation=null;
      session.finishPresentation(step.token);cursor=session.active.cell;refresh();
      if(initialFit && session.phase==='player'){initialFit=false;fit();board.resetView();}
      pump();
    };
    const pump=()=>{if(live && ready && session.phase==='enemy')void present(session.nextEnemy());};
    const review=()=>{if(session.phase!=='player' || !session.pending || dialogs.open)return;const preview=session.preview(session.pending);dialogs.show('Confirm action',previewText(preview),()=>void present(session.confirm()),()=>{session.cancel();message='Cancelled';refresh();});};
    const hud=new BattleHud(session,{
      action:a=>{session.cancel();action=a;message='Select a target';if(selected){const command=actionCommand(session,a,selected);message=command?describe(command):'Unavailable: choose a living target';}refresh();},
      target:select,review,cancel:()=>{clear();refresh();},
      wait:()=>{if(session.phase==='player' && !dialogs.open){session.prepare({type:'endTurn',unitId:session.active.id});void present(session.confirm());}},
      sound:()=>{this.soundEnabled=!this.soundEnabled;audio.setEnabled(this.soundEnabled);},
      retrySound:()=>audio.unlock(),
    });
    const audio=new BattleAudio(this,catalog,this.soundEnabled,snapshot=>hud.renderSound(snapshot));
    setBattleAudioDiagnostics(()=>audio.snapshot());
    const key=(event:KeyboardEvent)=>{
      if(!live || !ready || dialogs.open || session.phase!=='player')return;
      if(event.key==='Escape'){clear();refresh();event.preventDefault();return;}
      if(['Enter',' '].includes(event.key)){event.preventDefault();select(cursor);return;}
      const delta:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(!delta[event.key])return;event.preventDefault();const [dx,dy]=delta[event.key],map=catalog.maps[FIRST_BATTLE_MAP_ID];
      cursor={x:Math.max(0,Math.min(map.width-1,cursor.x+dx)),y:Math.max(0,Math.min(map.height-1,cursor.y+dy))};selected=cursor;session.cancel();refresh();
    };
    canvas.addEventListener('keydown',key);
    const visibility=()=>{if(document.hidden){animation?.cancel();removeInput.reset();}};
    document.addEventListener('visibilitychange',visibility);
    const panel=document.querySelector<HTMLElement>('#fit-panel')!;
    const fit=()=>board.fit(this.scale.width,this.scale.height,panel.getBoundingClientRect().bottom);
    const observer=new ResizeObserver(fit);observer.observe(panel);this.scale.on(Phaser.Scale.Events.RESIZE,fit);
    refresh();fit();
    const onReady=()=>{if(!live)return;ready=true;this.status('ready');refresh();if(session.phase==='player'){initialFit=false;fit();board.resetView();}pump();};
    this.game.events.once(Phaser.Core.Events.POST_RENDER,onReady);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      live=false;ready=false;audio.destroy();setBattleAudioDiagnostics(null);session.dispose();animation?.cancel();dialogs.dispose();hud.dispose();removeInput();observer.disconnect();
      canvas.removeEventListener('keydown',key);canvas.removeAttribute('tabindex');canvas.removeAttribute('aria-label');
      document.removeEventListener('visibilitychange',visibility);this.scale.off(Phaser.Scale.Events.RESIZE,fit);this.game.events.off(Phaser.Core.Events.POST_RENDER,onReady);
      delete game.dataset.battleReport;delete game.dataset.session;delete game.dataset.phase;
    });
  }
}
