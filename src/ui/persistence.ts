import { consumeEntryIntent, routeHref } from '../app/routes';
import { menuReturnLink, confirmMenuDeparture } from './menuReturn';
import { BattlePersistence } from '../app/BattlePersistence';
import type { BattleSession } from '../app/BattleSession';
import type { BattleLoadResult, BattleStorageSlot } from '../persistence/battleStorage';
import { BattleDialogs, type DialogChoice } from './dialogs';

/** Persistence controls use the scene's existing native dialog and input capture. */
export class BattleSaveControls {
  private readonly root=document.querySelector<HTMLElement>('#battle-persistence')!;
  private readonly abort=new AbortController();
  constructor(private readonly persistence:BattlePersistence, private readonly dialogs:BattleDialogs,
    private readonly activate:(session:BattleSession)=>void, private readonly replaced:()=>void) {
    this.root.hidden=false;
    this.root.innerHTML='<span id="battle-save-status" aria-live="polite"></span><button id="battle-recovery" type="button">Save recovery</button>';
    this.root.querySelector('button')!.addEventListener('click',event=>{
      // WebKit touch activation does not focus buttons; retain the actual invoker.
      (event.currentTarget as HTMLButtonElement).focus();this.recovery();
    },{signal:this.abort.signal});
    this.root.append(menuReturnLink(() => this.persistence.hasUnsavedProgress, () => this.recovery()));
    persistence.onChange=()=>this.render();this.render();
  }
  returnToMenu() {
    if (confirmMenuDeparture(() => this.persistence.hasUnsavedProgress, () => this.recovery())) {
      location.assign(routeHref('menu', import.meta.env.BASE_URL));
    }
  }
  private render(){this.root.querySelector('#battle-save-status')!.textContent=this.persistence.status;}
  start(){
    const intent=consumeEntryIntent();
    if(intent==='continue'){
      const review=this.persistence.inspect();
      const session=this.persistence.continue(review);if(session){this.activate(session);return;}
      this.recovery(review);return;
    }
    if(intent==='new'){this.requestNew();return;}
    if(intent==='recovery'){this.recovery();return;}
    const session=this.persistence.startup();if(session)this.activate(session);else this.recovery(this.persistence.inspection!);
  }
  private details(review:BattleLoadResult) {
    if(!review.ok)return 'Storage is unavailable. Retry after allowing storage for this site. Existing saves have not been discarded.';
    const describe=(slot:BattleStorageSlot)=>{
      const v=review.inspection[slot];return `${slot === 'primary'?'Primary':'Backup'}: ${v.status === 'invalid'?`needs recovery (${v.reason})`:v.status === 'unavailable'?'unreadable':v.status}.`;
    };
    return [describe('primary'),describe('backup'),review.selected?.slot==='backup'?'Continue uses the backup; some progress may be lost.':'',
      'Saves stay in this browser on this site. Use one battle tab; browser cleanup can remove them.'].filter(Boolean).join(' ');
  }
  recovery(review:BattleLoadResult=this.persistence.inspect()) {
    const p=this.persistence, choices:DialogChoice[]=[];
    if(!p.session && review.ok && review.selected) choices.push({id:'save-continue',label:review.selected.slot==='backup'?'Continue backup':'Continue',run:()=>{
      const session=p.continue(review);if(session)this.activate(session);else this.recovery();
    }});
    choices.push({id:'save-new',label:'New battle',run:()=>this.requestNew(review)});
    if(p.recoveryTexts(review).length)choices.push({id:'save-export',label:'Export recovery data',run:()=>{this.export(review);this.recovery(review);}});
    if(review.ok)for(const slot of ['primary','backup'] as const){
      const v=review.inspection[slot];if('text' in v && v.text!==null)choices.push({id:`save-remove-${slot}`,label:`Remove ${slot} save`,run:()=>this.confirmRemoval(slot,review)});
    }
    choices.push({id:'save-retry',label:'Retry storage',run:()=>{
      const hadSession=!!p.session;p.retry();
      if(!hadSession && p.session)this.activate(p.session);else this.recovery(p.inspection??p.inspect());
    }});
    if(p.session)choices.push({id:'save-close',label:'Back to battle',run:()=>{}});
    else choices.push({id:'save-main-menu',label:'Main menu',run:()=>this.returnToMenu()});
    this.dialogs.showChoices(p.session?'Save recovery':'Saved battle',`${p.status} ${this.details(review)}`,choices,p.session?()=>{}:null);
  }
  requestNew(review:BattleLoadResult=this.persistence.inspect()) {
    const cancel=()=>{if(!this.persistence.session)this.recovery(review);};
    this.dialogs.showChoices('Start a new battle?', 'This discards the current battle and both saved slots. Export recovery data first if you want a copy. If storage cannot be cleared, your current battle and seed will stay unchanged.',[
      {id:'save-confirm-reset',label:'Start new battle',run:()=>{if(this.persistence.replace(review))this.replaced();else this.recovery(this.persistence.inspection??this.persistence.inspect());}},
      {id:'save-cancel-reset',label:'Cancel',run:cancel},
    ],cancel);
  }
  private confirmRemoval(slot:BattleStorageSlot,review:BattleLoadResult) {
    const back=()=>this.recovery(review);
    this.dialogs.showChoices(`Remove ${slot} save?`,'Only the inspected saved value will be removed. Export a copy first if needed.',[
      {id:'save-confirm-remove',label:'Remove saved data',run:()=>{this.persistence.remove(slot,review);this.recovery(this.persistence.inspection??this.persistence.inspect());}},
      {id:'save-cancel-remove',label:'Cancel',run:back},
    ],back);
  }
  private export(review:BattleLoadResult) {
    // JSON escaping preserves lone UTF-16 surrogates as well as oversized/invalid strings.
    const blob=new Blob([JSON.stringify({slots:this.persistence.recoveryTexts(review)})],{type:'application/json'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='tactics-guru-recovery.json';
    anchor.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  dispose(){this.abort.abort();this.persistence.onChange=null;this.root.replaceChildren();}
}
