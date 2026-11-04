import { enemyThreats, type Threat } from '../domain/threat';
import { progressionLabel } from '../domain/progression';
import { standaloneBattleCatalog } from '../content/standaloneCatalog';
import Phaser from 'phaser';
import { battleCatalog } from '../content/catalog';
import type { AbilityId, CellPosition, ContentCatalog } from '../content/types';
import { BattleSession, type Presentation } from '../app/BattleSession';
import { BattlePersistence } from '../app/BattlePersistence';
import { previewMove, previewMovement } from '../domain/grid';
import { measurements, setBattleAudioDiagnostics } from '../diagnostics/browser';
import type { Point, BoardRegion } from '../geometry/iso';
import { BattleHud, unitFeedback } from '../ui/hud';
import { BattleDialogs } from '../ui/dialogs';
import { BattleSaveControls } from '../ui/persistence';
import { menuReturnLink } from '../ui/menuReturn';
import { track } from '../telemetry/telemetry';
import { hoverPreview } from '../ui/targetPreview';
import { previewDraught } from '../domain/turns';
import { BattleSelection } from '../ui/battleSelection';
import { BattleRadial, clientPointFromCanvas } from '../ui/battleRadial';
import { resolveCombatControlsSkin, watchCombatControls, type CombatSkin } from '../ui/combatControls';
import { lightHaptic, type RadialSliceId } from '../ui/radialGesture';
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
  private testingSeed = 1;
  constructor(private readonly status: (state: 'loading'|'ready'|'error') => void, private readonly error: (message:string)=>void, private readonly host?: RunBattleHost, private readonly persistent = false) {super('battle'); this.soundEnabled=host?.sound.enabled??false;}
  requestRestart(){this.restartAction?.();}
  create():void {
    this.status('loading');measurements.begin(performance.now());
    let catalog:ContentCatalog;
    // Hosts supply trusted progression/equipment projections of validated raw content.
    try{catalog=this.host?.catalog??contentLoadPlan(battleCatalog);}catch(e){this.error(e instanceof Error?e.message:'Invalid battle content');return;}
    if(!this.host)catalog=standaloneBattleCatalog(catalog);
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
    if (!this.persistent) {
      let modalTransition=()=>{};
      const dialogs=new BattleDialogs(()=>modalTransition(),()=>this.requestRestart());
      const outcomeKey=crypto.randomUUID();
      const session=new BattleSession(catalog,FIRST_BATTLE_MAP_ID,this.testingSeed,()=>{
        if(session.state.outcome!=='ongoing')track('battle_outcome',{route:'battle',phase:'ended',outcome:session.state.outcome==='playerWin'?'victory':'defeat'},outcomeKey);
      });
      track('battle_started',{route:'battle',phase:session.phase});
      const tools=document.querySelector<HTMLElement>('#battle-persistence')!;
      const notice=document.createElement('span');notice.textContent='Testing battle. Progress resets on reload.';
      const menu=menuReturnLink(()=>false,()=>{});tools.hidden=false;tools.replaceChildren(notice,menu);
      this.restartAction=()=>{
        if(dialogs.open)return;
        this.testingSeed=(this.testingSeed+1)>>>0;this.status('loading');this.scene.restart();
      };
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restartAction=null;dialogs.dispose();tools.replaceChildren();});
      this.begin(catalog,session,dialogs,fn=>{modalTransition=fn;},()=>location.assign(menu.href));
      return;
    }
    this.persistence??=new BattlePersistence(catalog,FIRST_BATTLE_MAP_ID);
    let modalTransition=()=>{};
    const dialogs=new BattleDialogs(()=>modalTransition(),()=>this.requestRestart());
    const saves=new BattleSaveControls(this.persistence,dialogs,session=>this.begin(catalog,session,dialogs,fn=>{modalTransition=fn;},()=>saves.returnToMenu()),()=>{
      this.status('loading');this.scene.restart();
    });
    this.restartAction=()=>{if(!dialogs.open)saves.requestNew();};
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restartAction=null;saves.dispose();dialogs.dispose();});
    saves.start();
    if(!this.persistence.session)this.status('ready');
  }
  private begin(catalog:ContentCatalog,session:BattleSession,dialogs:BattleDialogs,setModalTransition:(fn:()=>void)=>void,returnToMenu?:()=>void):void {
    const selection=new BattleSelection(session);
    let live=true,ready=false,outcomeShown=false,initialFit=true,skin:CombatSkin=resolveCombatControlsSkin();
    let movingPresentation=false,planInFlight=false,planInterrupted=false;
    let threatState: typeof session.state | null=null, threatIds: readonly number[]=[], threats: readonly Threat[] | null=null;
    let hovered:CellPosition|null=null;
    let region:BoardRegion={x:0,y:0,width:0,height:0};
    let animation:{done:Promise<void>;cancel:()=>void}|null=null;
    const game=document.querySelector<HTMLElement>('#game')!;
    const canvas=this.game.canvas;canvas.tabIndex=0;canvas.setAttribute('aria-label','Battle board. Arrow keys navigate, Enter selects, Escape cancels.');
    let cursor:CellPosition=session.active.cell;
    const radialMode=()=>skin==='radial' && session.phase==='player' && !dialogs.open;
    const clientFrom= (point:Point)=>clientPointFromCanvas(canvas,point,{width:this.scale.width,height:this.scale.height});
    const cellOrigin=(cell:CellPosition, fallback?:Point)=>{
      const screen=board.screenPoint(cell);
      return screen ? clientFrom(screen) : fallback ?? {x:innerWidth/2,y:innerHeight/2};
    };
    const clearRadial=()=>{selection.clear();selection.selectedCell=null;};
    const clear=(preserveQueued=false)=>{board.resetPicking();selection.clear(preserveQueued);if(skin==='radial')selection.selectedCell=null;hovered=null;radial.hide();};
    const refresh=()=>{
      if(!live)return;
      if(ready && session.phase==='player')selection.applyTurnDefault();
      const action=selection.selectedAction, selected=selection.selectedCell, message=selection.message;
      const reach=session.phase==='player' && (!action || action==='move')?previewMovement(session.state,session.active.id,catalog):null;
      const reviewMove=selection.planning && selection.planMove ? selection.planMove : session.pending?.type==='move' ? session.pending : null;
      const preview=reviewMove?previewMove(session.state,reviewMove,catalog):null;
      board.setIdle(ready && session.phase==='player' && !dialogs.open && !document.hidden);
      const hover=!dialogs.open?hoverPreview(session,hovered ?? (session.pending?.type==='move'?session.pending.to:null)):null;
      if(selection.showDanger && session.phase==='player' && threatState!==session.state){
        const result=enemyThreats(session.state,catalog);threatIds=result.ok?result.targets:[];threats=result.ok?result.threats:null;threatState=session.state;
      }
      const danger=selection.showDanger && session.phase==='player'?session.state.units.filter(u=>threatIds.includes(u.id)).map(u=>u.cell):[];
      board.present(session.state,reach?.ok?reach.cells.map(c=>c.cell):[],selected,preview?.ok?preview.path:[],selection.overlays(),hover,danger);
      hud.render(action,selected,message,selection.showDanger && session.phase==='player',threats,selection.planning && !radial.open);
      const caption=document.querySelector('#battle-board-caption')!;
      caption.textContent=board.pickingHint+caption.textContent;
      game.dataset.phase=session.phase;
      game.dataset.session=JSON.stringify({state:session.state,replay:session.replay,continuation:session.continuation,events:session.events,pending:session.pending,phase:session.phase});
      if(session.phase!=='player' || dialogs.open)radial.hide();
      if(ready && !dialogs.open && session.phase==='ended' && !outcomeShown){outcomeShown=true;if(this.host){queueMicrotask(()=>{if(live)this.host?.ended();});return;}dialogs.showChoices(session.state.outcome==='playerWin'?'Victory':'Defeat','Battle complete. Restart for a fresh battle.',[{id:'dialog-restart',label:'Restart battle',run:()=>this.requestRestart()},...(returnToMenu?[{id:'save-main-menu',label:'Main menu',run:returnToMenu}]:[])],()=>{});}
    };
    const openRadial=(cell:CellPosition, mode:'hold'|'tap', origin:Point)=>{
      session.clearPrepared();
      selection.selectedCell=cell;cursor=cell;
      const followUp=selection.planning && selection.planMove;
      if(!followUp){selection.selectedAction=null;selection.message='Choose an action and target';}
      const aimed=followUp ? 'attack' : selection.defaultSlice(cell);
      if(!followUp && aimed!=='inspect' && aimed!=='plan')selection.aimSlice(cell,aimed);
      radial.show(cell,{mode,origin});
      const liveRegion=document.querySelector('#battle-preview');
      if(liveRegion)liveRegion.textContent=`Cell (${cell.x}, ${cell.y}). ${radial.root.getAttribute('aria-label')}`;
    };
    const select=(cell:CellPosition|null)=>{
      if(!live || !ready || dialogs.open || session.phase!=='player')return;
      const inputMs=performance.now();
      const changed=selection.selectedCell?.x!==cell?.x || selection.selectedCell?.y!==cell?.y;
      if(cell)cursor=cell;
      if(skin==='radial' && cell){
        if(selection.followUp){
          session.clearPrepared();
          selection.selectedCell=cell;
          selection.selectedAction=selection.followUp;
          selection.applyCell(cell);
          refresh();
          if(selection.canConfirm())confirm();
          if(changed)measurements.interaction('selection',inputMs);
          return;
        }
        if(selection.planning && !selection.planMove){
          if(selection.choosePlanDestination(cell)){openRadial(cell,'tap',cellOrigin(cell));refresh();if(changed)measurements.interaction('selection',inputMs);return;}
          refresh();return;
        }
        openRadial(cell,'tap',cellOrigin(cell));
        refresh();
        if(changed)measurements.interaction('selection',inputMs);
        return;
      }
      selection.selectCell(cell);
      if(!cell)hovered=null;
      refresh();
      if(changed)measurements.interaction('selection',inputMs);
    };
    const board=new BoardRenderer(this,catalog,session.state.mapId,select);
    const radial=new BattleRadial(selection,{
      commit:(cell,slice,abilityId)=>commitSlice(cell,slice,abilityId),
      inspect:()=>{
        const unit=selection.selectedCell?session.state.units.find(u=>u.hp>0&&u.cell.x===selection.selectedCell!.x&&u.cell.y===selection.selectedCell!.y):null;
        clearRadial();
        inspect(unit?.id ?? session.active.id);
      },
      plan:()=>{if(session.phase==='player' && !dialogs.open){selection.startPlan();refresh();}},
      cancel:()=>{clearRadial();refresh();},
    });
    const commitSlice=(cell:CellPosition,slice:RadialSliceId,abilityId?:AbilityId)=>{
      if(slice==='special' && abilityId){
        const result=selection.commitSpecial(cell,abilityId);
        refresh();
        if(result.commit)confirm();
        return;
      }
      const result=selection.aimSlice(cell,slice);
      refresh();
      if(result.commit)confirm();
    };
    const hover=(point:Point|null)=>{
      const cell=point && session.phase==='player' && !dialogs.open?board.cellAt(point):null;
      if(hovered?.x===cell?.x && hovered?.y===cell?.y)return;
      hovered=cell;refresh();
    };
    const removeInput=bindBoardInput(canvas,{
      select:(point:Point)=>{if(session.phase==='player')board.select(point);},
      cancel:()=>cancel(),
      resetPicking:()=>board.resetPicking(),
      hover,
      pan:(dx:number,dy:number)=>{const now=performance.now();if(board.pan(dx,dy))measurements.interaction('pan',now);},
      zoom:(factor:number,anchor:Point)=>{const now=performance.now();if(board.zoom(factor,anchor))measurements.interaction('zoom',now);},
      hold:(point:Point)=>{
        // Plan destination and follow-up picking use the same selection path on release.
        if(!radialMode() || selection.planning)return false;
        const cell=board.cellAt(point);if(!cell)return false;
        lightHaptic();
        openRadial(cell,'hold',clientFrom(point));
        refresh();
        return true;
      },
      aim:(point:Point)=>{if(radial.open)radial.aimAt(clientFrom(point));},
      release:(point:Point)=>{if(radial.open)radial.releaseAt(clientFrom(point));refresh();},
      dismiss:()=>{if(radial.open){radial.hide();clearRadial();refresh();}},
    },()=>({width:this.scale.width,height:this.scale.height}),point=>ready && !initialFit && !dialogs.open
      && point.x>=region.x && point.x<region.x+region.width && point.y>=region.y && point.y<region.y+region.height,
    {reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
    const present=async(step:Presentation|null,followPlan=false)=>{
      if(!step){refresh();return;}
      if(followPlan){planInFlight=true;planInterrupted=false;}
      clear(followPlan);selection.selectedCell=null;removeInput.reset();hud.append(step.events);audio.present(step.token,step.events);
      refresh();animation=board.animate(step.before,step.after,step.events);
      const moving=step.events.some(event=>event.type==='moved');movingPresentation=moving;
      if(moving)measurements.workload('move',performance.now());
      // Suspension may finish presentation early, but never resolve the command again.
      await animation.done;if(!live)return;animation=null;
      if(moving)measurements.workload('move',performance.now(),0);movingPresentation=false;
      session.finishPresentation(step.token);cursor=session.active.cell;
      if(followPlan){
        planInFlight=false;
        if(planInterrupted || document.hidden || dialogs.open){session.cancel();selection.message='Planned ability cancelled after interruption';}
        else {const next=session.confirmPlannedAbility();if(next){await present(next);return;}}
      }
      refresh();
      if(initialFit && session.phase==='player'){initialFit=false;fit();board.resetView();measurements.controlsUsable(performance.now());}
      pump();
    };
    const pump=()=>{if(live && ready && !document.hidden && !dialogs.open && session.phase==='enemy')void present(session.nextEnemy());};
    setModalTransition(()=>{removeInput.reset();if(radial.open){clearRadial();radial.hide();}queueMicrotask(()=>{if(live){refresh();pump();}});});
    const confirm=()=>{
      if(session.phase!=='player' || (!session.pending && !session.pendingPlan) || dialogs.open)return;
      const focused=document.activeElement===hud.root.querySelector('#battle-review');
      const compound=Boolean(session.pendingPlan);
      void present(compound?session.confirmPlan():session.confirm(),compound);
      if(focused)document.querySelector<HTMLElement>('#fit-restart')?.focus();
    };
    const cancel=()=>{if(dialogs.open || session.phase!=='player')return;clear();refresh();hud.focusAction();};
    const applySkin=()=>{skin=resolveCombatControlsSkin();hud.applySkin(skin);if(skin!=='radial')radial.hide();refresh();};
    const inspect=(id:number=session.active.id)=>{
      const unit=session.state.units.find(u=>u.id===id);if(!unit)return;
      const {def,name,armorClass,accuracy,status,support}=unitFeedback(session,unit);
      dialogs.showChoices(`Inspection only — ${name} #${unit.id}`,
        `HP ${unit.hp}/${def.stats.maxHp} · ${status}${session.progression.find(h => h.heroId === unit.defId) ? ` · ${progressionLabel(session.progression.find(h => h.heroId === unit.defId)!)}` : ''}\nAC ${armorClass} · Accuracy ${accuracy>=0?'+':''}${accuracy} · Power ${def.stats.power}\nMovement allowance ${def.stats.move} · Jump ${def.stats.jump} · Dexterity ${def.stats.dexterity} · Will ${def.stats.will}${support?`\n${support}`:''}\nActing unit remains ${unitFeedback(session,session.active).name}. Inspection never changes the turn.`,[
          ...session.state.units.map(u=>({id:`inspect-unit-${u.id}`,label:`Inspect ${unitFeedback(session,u).name} #${u.id}`,run:()=>inspect(u.id),keepOpen:true})),
          {id:'inspection-close',label:'Close inspection',run:()=>{}},
        ],()=>{});
    };
    const hud=new BattleHud(session,{
      action:a=>{board.resetPicking();hovered=null;selection.setAction(a);refresh();},
      plan:()=>{if(session.phase==='player' && !dialogs.open){board.resetPicking();hovered=null;selection.startPlan();refresh();}},
      undo:()=>{if(session.phase==='player' && !dialogs.open)void present(session.undoMove());},
      draught:()=>{
        if(!live || !ready || dialogs.open || session.phase!=='player')return;
        const reviewed = session.state;
        const command = {type:'drinkDraught',unitId:session.active.id} as const;
        const preview = previewDraught(reviewed, command, catalog);
        if(!preview.ok)return;
        const name = unitFeedback(session, session.active).name;
        dialogs.showChoices('Drink Healing Draught?',
          `${name} will heal ${preview.healing} HP to ${preview.hp} HP. Uses one action and one draught. ${preview.remaining - 1} left after use.`, [
            {id:'battle-draught-cancel',label:'Cancel',run:()=>{}},
            {id:'battle-draught-confirm',label:'Drink',run:()=>{
              if(live && !document.hidden && session.state===reviewed && session.prepare(command).ok)void present(session.confirm());
            }},
          ],()=>{});
      },
      danger:()=>{if(session.phase==='player' && !dialogs.open){selection.toggleDanger();refresh();}},
      target:cell=>{board.resetPicking();hovered=null;select(cell);},confirm,cancel,inspect,inspectTarget:inspect,
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
    applySkin();
    const stopSkinWatch=watchCombatControls(applySkin);
    const key=(event:KeyboardEvent)=>{
      if(!live || !ready || dialogs.open || session.phase!=='player')return;
      if(event.key==='Escape'){cancel();event.preventDefault();return;}
      if(radial.open)return;
      if(['Enter',' '].includes(event.key)){event.preventDefault();board.resetPicking();hovered=null;select(cursor);return;}
      const delta:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(!delta[event.key])return;event.preventDefault();const [dx,dy]=delta[event.key],map=catalog.maps[session.state.mapId];
      board.resetPicking();cursor={x:Math.max(0,Math.min(map.width-1,cursor.x+dx)),y:Math.max(0,Math.min(map.height-1,cursor.y+dy))};hovered=cursor;
      if(skin==='radial'){refresh();return;}
      select(cursor);
    };
    canvas.addEventListener('keydown',key);
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape' && !event.defaultPrevented && !dialogs.open && ready && session.phase==='player'){cancel();event.preventDefault();}};
    document.addEventListener('keydown',escape);
    const visibility=()=>{if(document.hidden){if(movingPresentation){if(planInFlight)planInterrupted=true;session.cancel();}measurements.frame(performance.now(),false);animation?.cancel();removeInput.reset();if(radial.open){clearRadial();radial.hide();}refresh();}else {refresh();pump();}};
    document.addEventListener('visibilitychange',visibility);
    const drawable=document.querySelector<HTMLElement>('#battle-board-region')!;
    let viewport={width:this.scale.width,height:this.scale.height};
    const fit=()=>{
      if(this.scale.width!==innerWidth || this.scale.height!==innerHeight)return;
      const viewportChanged=viewport.width!==this.scale.width || viewport.height!==this.scale.height;
      viewport={width:this.scale.width,height:this.scale.height};
      if(viewportChanged && radial.open){
        removeInput.reset(true);
        // A held radial is dismissed by reset; a tap-open radial has no captured pointer.
        if(radial.open){clearRadial();radial.hide();refresh();}
      }
      const r=drawable.getBoundingClientRect(),c=canvas.getBoundingClientRect();
      const next={x:(r.left-c.left)*this.scale.width/c.width,y:(r.top-c.top)*this.scale.height/c.height,
        width:r.width*this.scale.width/c.width,height:r.height*this.scale.height/c.height};
      // A caption/layout reflow cancels held gestures, but may keep the same
      // camera and hit candidates. Do not let our overlap hint reset itself.
      if(next.x!==region.x||next.y!==region.y||next.width!==region.width||next.height!==region.height)removeInput.reset(true);
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
      live=false;ready=false;this.game.events.off(Phaser.Core.Events.POST_RENDER,onRender);audio.destroy();setBattleAudioDiagnostics(null);session.dispose();animation?.cancel();radial.dispose();hud.dispose();removeInput();stopSkinWatch();observer.disconnect();
      canvas.removeEventListener('keydown',key);canvas.removeAttribute('tabindex');canvas.removeAttribute('aria-label');
      document.removeEventListener('keydown',escape);canvas.style.clipPath='';
      document.removeEventListener('visibilitychange',visibility);this.scale.off(Phaser.Scale.Events.RESIZE,fit);this.game.events.off(Phaser.Core.Events.POST_RENDER,onReady);
      delete game.dataset.battleReport;delete game.dataset.session;delete game.dataset.phase;
      delete document.body.dataset.combatSkin;document.body.classList.remove('battle-skin-radial','battle-skin-rail');
    });
  }
}
