import Phaser from 'phaser';
import { battleCatalog } from '../content/catalog';
import type { CellPosition, ContentCatalog } from '../content/types';
import { BattleSession, type Presentation } from '../app/BattleSession';
import { BattlePersistence } from '../app/BattlePersistence';
import { previewMove, previewMovement } from '../domain/grid';
import { measurements, setBattleAudioDiagnostics } from '../diagnostics/browser';
import type { Point, BoardRegion } from '../geometry/iso';
import { BattleHud, actionCommand, previewText, displayName, unitFeedback, unitLabel, type Action } from '../ui/hud';
import { BattleDialogs } from '../ui/dialogs';
import { BattleSaveControls } from '../ui/persistence';
import { targetOverlays, hoverPreview } from '../ui/targetPreview';
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
    let hovered:CellPosition|null=null;
    let region:BoardRegion={x:0,y:0,width:0,height:0};
    let animation:{done:Promise<void>;cancel:()=>void}|null=null;
    const game=document.querySelector<HTMLElement>('#game')!;
    const canvas=this.game.canvas;canvas.tabIndex=0;canvas.setAttribute('aria-label','Battle board. Arrow keys navigate, Enter selects, Escape cancels.');
    let cursor:CellPosition=session.active.cell;
    const clear=()=>{session.cancel();action=null;hovered=null;message='Choose an action and target';};
    const refresh=()=>{
      if(!live)return;
      const reach=session.phase==='player' && (!action || action==='move')?previewMovement(session.state,session.active.id,catalog):null;
      const preview=session.pending?.type==='move'?previewMove(session.state,session.pending,catalog):null;
      board.setIdle(ready && session.phase==='player' && !dialogs.open && !document.hidden);
      const hover=!dialogs.open?hoverPreview(session,hovered ?? (session.pending?.type==='move'?session.pending.to:null)):null;
      board.present(session.state,reach?.ok?reach.cells.map(c=>c.cell):[],selected,preview?.ok?preview.path:[],targetOverlays(session,action,selected),hover);
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
    const hover=(point:Point|null)=>{
      const cell=point && session.phase==='player' && !dialogs.open?board.cellAt(point):null;
      if(hovered?.x===cell?.x && hovered?.y===cell?.y)return;
      hovered=cell;refresh();
    };
    const removeInput=bindBoardInput(canvas,{
      select:(point:Point)=>board.select(point),
      hover,
      pan:(dx:number,dy:number)=>{const now=performance.now();if(board.pan(dx,dy))measurements.interaction('pan',now);},
      zoom:(factor:number,anchor:Point)=>{const now=performance.now();if(board.zoom(factor,anchor))measurements.interaction('zoom',now);},
    },()=>({width:this.scale.width,height:this.scale.height}),point=>ready && !initialFit && !dialogs.open
      && point.x>=region.x && point.x<region.x+region.width && point.y>=region.y && point.y<region.y+region.height);
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
    const review=()=>{
      if(session.phase!=='player' || !session.pending || dialogs.open)return;
      const command=session.pending,preview=session.preview(command);
      const name=command.type==='useAbility'?displayName(command.abilityId):command.type==='move'?'Move':'Wait';
      const targetIds=command.type==='useAbility' ? 'unitId' in command.target ? [command.target.unitId]
        : 'missileTargets' in command.target ? [...new Set(command.target.missileTargets)] : [] : [];
      const target=command.type==='move'?`Destination (${command.to.x}, ${command.to.y})`
        :targetIds.map(id=>`Target: ${unitLabel(session,session.state.units.find(u=>u.id===id)!)}`).join('\n');
      dialogs.show('Confirm action',`${unitFeedback(session,session.active).name} · ${name}\n${target}\n${previewText(preview)}`,()=>void present(session.confirm()),()=>{session.cancel();if(command.type==='useAbility')action=null;message='Cancelled';refresh();});
    };
    const cancel=()=>{if(dialogs.open || session.phase!=='player')return;clear();refresh();hud.focusAction();};
    const inspect=(id:number=session.active.id)=>{
      const unit=session.state.units.find(u=>u.id===id);if(!unit)return;
      const {def,name,armorClass,accuracy,status}=unitFeedback(session,unit);
      dialogs.showChoices(`Inspection only — ${name} #${unit.id}`,
        `HP ${unit.hp}/${def.stats.maxHp} · ${status}\nAC ${armorClass} · Accuracy ${accuracy>=0?'+':''}${accuracy} · Power ${def.stats.power}\nMovement allowance ${def.stats.move} · Jump ${def.stats.jump} · Dexterity ${def.stats.dexterity} · Will ${def.stats.will}\nActing unit remains ${unitFeedback(session,session.active).name}. Inspection never changes the turn.`,[
          ...session.state.units.map(u=>({id:`inspect-unit-${u.id}`,label:`Inspect ${unitFeedback(session,u).name} #${u.id}`,run:()=>inspect(u.id),keepOpen:true})),
          {id:'inspection-close',label:'Close inspection',run:()=>{}},
        ],()=>{});
    };
    const hud=new BattleHud(session,{
      action:a=>{session.cancel();hovered=null;action=a;message='Select a target';if(selected){const command=actionCommand(session,a,selected);message=command?describe(command):'Unavailable: choose a living target';}refresh();},
      target:cell=>{hovered=null;select(cell);},review,cancel,inspect,inspectTarget:inspect,
      log:lines=>{
        dialogs.showChoices('Battle log',lines.length?'':'No events yet.',[{id:'log-close',label:'Close log',run:()=>{}}],()=>{});
        const list=document.createElement('ol');list.id='battle-log';list.setAttribute('aria-label','Battle log');
        list.append(...lines.map(text=>{const item=document.createElement('li');item.textContent=text;return item;}));
        dialogs.element.querySelector('#battle-dialog-message')!.append(list);
      },
      wait:()=>{if(session.phase==='player' && !dialogs.open){session.prepare({type:'endTurn',unitId:session.active.id});void present(session.confirm());}},
      sound:()=>{this.soundEnabled=!this.soundEnabled;if(this.host)this.host.sound.enabled=this.soundEnabled;audio.setEnabled(this.soundEnabled);},
      retrySound:()=>audio.unlock(),
    });
    const audio=new BattleAudio(this,catalog,this.soundEnabled,snapshot=>hud.renderSound(snapshot));
    setBattleAudioDiagnostics(()=>audio.snapshot());
    const key=(event:KeyboardEvent)=>{
      if(!live || !ready || dialogs.open || session.phase!=='player')return;
      if(event.key==='Escape'){cancel();event.preventDefault();return;}
      if(['Enter',' '].includes(event.key)){event.preventDefault();hovered=null;select(cursor);return;}
      const delta:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(!delta[event.key])return;event.preventDefault();const [dx,dy]=delta[event.key],map=catalog.maps[session.state.mapId];
      cursor={x:Math.max(0,Math.min(map.width-1,cursor.x+dx)),y:Math.max(0,Math.min(map.height-1,cursor.y+dy))};hovered=cursor;select(cursor);
    };
    canvas.addEventListener('keydown',key);
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape' && !event.defaultPrevented && !dialogs.open && ready && session.phase==='player'){cancel();event.preventDefault();}};
    document.addEventListener('keydown',escape);
    const visibility=()=>{if(document.hidden){measurements.frame(performance.now(),false);animation?.cancel();removeInput.reset();refresh();}else {refresh();pump();}};
    document.addEventListener('visibilitychange',visibility);
    const drawable=document.querySelector<HTMLElement>('#battle-board-region')!;
    const fit=()=>{
      if(this.scale.width!==innerWidth || this.scale.height!==innerHeight)return;
      const r=drawable.getBoundingClientRect(),c=canvas.getBoundingClientRect();
      const next={x:(r.left-c.left)*this.scale.width/c.width,y:(r.top-c.top)*this.scale.height/c.height,
        width:r.width*this.scale.width/c.width,height:r.height*this.scale.height/c.height};
      if(next.x!==region.x||next.y!==region.y||next.width!==region.width||next.height!==region.height)removeInput.reset();
      region=next;
      canvas.style.clipPath=`inset(${r.top-c.top}px ${c.right-r.right}px ${c.bottom-r.bottom}px ${r.left-c.left}px)`;
      board.fit(this.scale.width,this.scale.height,region);
    };
    const observer=new ResizeObserver(fit);observer.observe(drawable);observer.observe(document.querySelector('#battle-shell')!);this.scale.on(Phaser.Scale.Events.RESIZE,fit);
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
      document.removeEventListener('keydown',escape);canvas.style.clipPath='';
      document.removeEventListener('visibilitychange',visibility);this.scale.off(Phaser.Scale.Events.RESIZE,fit);this.game.events.off(Phaser.Core.Events.POST_RENDER,onReady);
      delete game.dataset.battleReport;delete game.dataset.session;delete game.dataset.phase;
    });
  }
}
