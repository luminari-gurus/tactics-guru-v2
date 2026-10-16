import Phaser from 'phaser';
import { battleCatalog } from '../content/catalog';
import type { CellPosition, ContentCatalog } from '../content/types';
import { BattleSession, type Presentation } from '../app/BattleSession';
import { BattlePersistence } from '../app/BattlePersistence';
import { previewMove, previewMovement } from '../domain/grid';
import { measurements, setBattleAudioDiagnostics } from '../diagnostics/browser';
import type { Point } from '../geometry/iso';
import { BattleHud, actionCommand, previewText, type Action } from '../ui/hud';
import { BattleDialogs } from '../ui/dialogs';
import { BattleSaveControls } from '../ui/persistence';
import { BoardRenderer } from './BoardRenderer';
import { bindBoardInput } from './BoardInput';
import { contentLoadPlan, loadContentAssets } from './contentLoading';
import { BattleAudio } from './BattleAudio';

export interface RunBattleHost {
  catalog: ContentCatalog; session: BattleSession; dialogs: BattleDialogs;
  sound: { enabled: boolean }; modalTransition: () => void;
  ended: () => void; restart: () => void;
}
export const FIRST_BATTLE_MAP_ID = 'map:forest_ruins';
export class BattleScene extends Phaser.Scene {
  private persistence: BattlePersistence | null = null;
  private restartAction: (()=>void) | null = null;
  private soundEnabled = false;
  constructor(private readonly status: (state: 'loading'|'ready'|'error') => void, private readonly error: (message:string)=>void, private readonly host?: RunBattleHost) {super('battle'); this.soundEnabled=host?.sound.enabled??false;}
  requestRestart(){this.restartAction?.();}
  create():void {
    this.status('loading');measurements.begin(performance.now());
    let catalog:ContentCatalog;
    try{catalog=contentLoadPlan(this.host?.catalog??battleCatalog);}catch(e){this.error(e instanceof Error?e.message:'Invalid battle content');return;}
    loadContentAssets(this,catalog,()=>{try{this.prepareBattle(catalog);}catch(e){this.error(e instanceof Error?e.message:'Could not render battle');}},this.error);
  }
  private prepareBattle(catalog:ContentCatalog):void {
    if(this.host) {
      const host=this.host;
      this.restartAction=()=>{if(!host.dialogs.open)host.restart();};
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restartAction=null;host.modalTransition=()=>{};});
      this.begin(catalog,host.session,host.dialogs,fn=>{host.modalTransition=fn;});
      return;
    }
    this.persistence??=new BattlePersistence(catalog,FIRST_BATTLE_MAP_ID);
    let modalTransition=()=>{};
    const dialogs=new BattleDialogs(()=>modalTransition(),()=>this.requestRestart());
    const saves=new BattleSaveControls(this.persistence,dialogs,session=>this.begin(catalog,session,dialogs,fn=>{modalTransition=fn;}),()=>{
      this.status('loading');this.scene.restart();
    });
    this.restartAction=()=>{if(!dialogs.open)saves.requestNew();};
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restartAction=null;saves.dispose();dialogs.dispose();});
    saves.start();
    if(!this.persistence.session)this.status('ready');
  }
  private begin(catalog:ContentCatalog,session:BattleSession,dialogs:BattleDialogs,setModalTransition:(fn:()=>void)=>void):void {
    let selected:CellPosition|null=null,action:Action|null=null,message='Choose an action and target',live=true,ready=false,outcomeShown=false,initialFit=true;
    let movingPresentation=false;
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
      game.dataset.session=JSON.stringify({state:session.state,replay:session.replay,continuation:session.continuation,events:session.events,pending:session.pending,phase:session.phase});
      if(ready && !dialogs.open && session.phase==='ended' && !outcomeShown){outcomeShown=true;if(this.host){queueMicrotask(()=>{if(live)this.host?.ended();});return;}dialogs.show(session.state.outcome==='playerWin'?'Victory':'Defeat','Battle complete. Restart for a fresh battle.',null,null);}
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
      const inputMs=performance.now();
      const changed=selected?.x!==cell?.x || selected?.y!==cell?.y;
      selected=cell;if(cell)cursor=cell;session.cancel();
      if(action && cell){const command=actionCommand(session,action,cell);message=command?describe(command):'Unavailable: choose a living target';}
      refresh();
      if(changed)measurements.interaction('selection',inputMs);
    };
    const board=new BoardRenderer(this,catalog,session.state.mapId,select);
    const removeInput=bindBoardInput(canvas,{
      select:(point:Point)=>board.select(point),
      pan:(dx:number,dy:number)=>{const now=performance.now();if(board.pan(dx,dy))measurements.interaction('pan',now);},
      zoom:(factor:number,anchor:Point)=>{const now=performance.now();if(board.zoom(factor,anchor))measurements.interaction('zoom',now);},
    },()=>({width:this.scale.width,height:this.scale.height}),()=>ready && !initialFit && !dialogs.open);
    const present=async(step:Presentation|null)=>{
      if(!step){refresh();return;}
      clear();selected=null;removeInput.reset();hud.append(step.events);audio.present(step.token,step.events);
      refresh();animation=board.animate(step.before,step.after,step.events);
      const moving=step.events.some(event=>event.type==='moved');movingPresentation=moving;
      if(moving)measurements.workload('move',performance.now());
      // Suspension may finish presentation early, but never resolve the command again.
      await animation.done;if(!live)return;animation=null;
      if(moving)measurements.workload('move',performance.now(),0);movingPresentation=false;
      session.finishPresentation(step.token);cursor=session.active.cell;refresh();
      if(initialFit && session.phase==='player'){initialFit=false;fit();board.resetView();measurements.controlsUsable(performance.now());}
      pump();
    };
    const pump=()=>{if(live && ready && !document.hidden && !dialogs.open && session.phase==='enemy')void present(session.nextEnemy());};
    setModalTransition(()=>{removeInput.reset();queueMicrotask(()=>{if(live){refresh();pump();}});});
    const review=()=>{if(session.phase!=='player' || !session.pending || dialogs.open)return;const preview=session.preview(session.pending);dialogs.show('Confirm action',previewText(preview),()=>void present(session.confirm()),()=>{session.cancel();message='Cancelled';refresh();});};
    const hud=new BattleHud(session,{
      action:a=>{session.cancel();action=a;message='Select a target';if(selected){const command=actionCommand(session,a,selected);message=command?describe(command):'Unavailable: choose a living target';}refresh();},
      target:select,review,cancel:()=>{clear();refresh();},
      wait:()=>{if(session.phase==='player' && !dialogs.open){session.prepare({type:'endTurn',unitId:session.active.id});void present(session.confirm());}},
      sound:()=>{this.soundEnabled=!this.soundEnabled;if(this.host)this.host.sound.enabled=this.soundEnabled;audio.setEnabled(this.soundEnabled);},
      retrySound:()=>audio.unlock(),
    });
    const audio=new BattleAudio(this,catalog,this.soundEnabled,snapshot=>hud.renderSound(snapshot));
    setBattleAudioDiagnostics(()=>audio.snapshot());
    const key=(event:KeyboardEvent)=>{
      if(!live || !ready || dialogs.open || session.phase!=='player')return;
      if(event.key==='Escape'){clear();refresh();event.preventDefault();return;}
      if(['Enter',' '].includes(event.key)){event.preventDefault();select(cursor);return;}
      const delta:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(!delta[event.key])return;event.preventDefault();const [dx,dy]=delta[event.key],map=catalog.maps[session.state.mapId];
      cursor={x:Math.max(0,Math.min(map.width-1,cursor.x+dx)),y:Math.max(0,Math.min(map.height-1,cursor.y+dy))};selected=cursor;session.cancel();refresh();
    };
    canvas.addEventListener('keydown',key);
    const visibility=()=>{if(document.hidden){measurements.frame(performance.now(),false);animation?.cancel();removeInput.reset();}else pump();};
    document.addEventListener('visibilitychange',visibility);
    const panel=document.querySelector<HTMLElement>('#fit-panel')!;
    const fit=()=>{const y=panel.getBoundingClientRect().bottom;board.fit(this.scale.width,this.scale.height,{x:0,y,width:this.scale.width,height:this.scale.height-y});};
    const observer=new ResizeObserver(fit);observer.observe(panel);this.scale.on(Phaser.Scale.Events.RESIZE,fit);
    refresh();fit();
    const onReady=()=>{if(!live)return;measurements.sceneReady(performance.now());ready=true;this.status('ready');refresh();if(session.phase==='player'){initialFit=false;fit();board.resetView();measurements.controlsUsable(performance.now());}pump();};
    this.game.events.once(Phaser.Core.Events.POST_RENDER,onReady);
    const onRender=()=>{
      if(!live || !ready)return;
      const now=performance.now(),visible=document.visibilityState==='visible' && !document.hidden;
      if(movingPresentation)measurements.workload('move',now);
      measurements.frame(now,visible,session.phase==='player');
      measurements.rendered(now,visible);
    };
    this.game.events.on(Phaser.Core.Events.POST_RENDER,onRender);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      live=false;ready=false;this.game.events.off(Phaser.Core.Events.POST_RENDER,onRender);audio.destroy();setBattleAudioDiagnostics(null);session.dispose();animation?.cancel();hud.dispose();removeInput();observer.disconnect();
      canvas.removeEventListener('keydown',key);canvas.removeAttribute('tabindex');canvas.removeAttribute('aria-label');
      document.removeEventListener('visibilitychange',visibility);this.scale.off(Phaser.Scale.Events.RESIZE,fit);this.game.events.off(Phaser.Core.Events.POST_RENDER,onReady);
      delete game.dataset.battleReport;delete game.dataset.session;delete game.dataset.phase;
    });
  }
}
