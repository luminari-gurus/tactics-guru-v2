export interface DialogChoice { id: string; label: string; run: () => void; keepOpen?: boolean }
/** One native modal owner for battle actions, outcomes and persistence recovery. */
export class BattleDialogs {
  readonly element=document.createElement('dialog');
  private readonly abort=new AbortController();
  private prior:HTMLElement|null=null;
  private choices:readonly DialogChoice[]=[];
  private cancel:(()=>void)|null=null;
  constructor(private readonly transition:()=>void, private readonly restart:()=>void) {
    this.element.id='battle-dialog';this.element.setAttribute('aria-labelledby','battle-dialog-title');
    this.element.setAttribute('aria-describedby','battle-dialog-message');
    this.element.innerHTML='<h2 id="battle-dialog-title"></h2><div id="battle-dialog-message"></div><div class="fit-controls"></div>';
    document.body.append(this.element); const signal=this.abort.signal;
    // A held confirmation key must not activate the next focused button (e.g. reset).
    document.addEventListener('keydown',event=>{
      if(event.repeat && (event.key==='Enter' || event.key===' ') && event.target instanceof Element && event.target.closest('button'))event.preventDefault();
    },{capture:true,signal});
    this.element.addEventListener('click',event=>{
      const button=(event.target as Element).closest('button');
      const choice=this.choices.find(c=>c.id===button?.id);
      if(choice){if(choice.keepOpen)choice.run();else this.close(choice.run);}
    },{signal});
    this.element.addEventListener('cancel',e=>{e.preventDefault();if(this.cancel)this.close(this.cancel);},{signal});
    this.element.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const buttons=[...this.element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if(!buttons.length){e.preventDefault();return;}
      // WebKit's native Tab policy can skip buttons and leave the document.
      // Own the complete cycle, including focus initially on the dialog itself.
      const current=buttons.findIndex(button=>button===document.activeElement);
      const next=current<0?(e.shiftKey?buttons.length-1:0)
        :(current+(e.shiftKey?-1:1)+buttons.length)%buttons.length;
      e.preventDefault();buttons[next].focus();
    },{signal});
  }
  get open(){return this.element.open;}
  show(title:string,message:string,accept:(()=>void)|null,cancel:(()=>void)|null) {
    const choices:DialogChoice[]=[];
    if(accept)choices.push({id:'dialog-confirm',label:'Confirm',run:accept});
    if(cancel)choices.push({id:'dialog-cancel',label:'Cancel',run:cancel});
    choices.push({id:'dialog-restart',label:'Restart battle',run:this.restart});
    this.showChoices(title,message,choices,cancel??(()=>{}));
  }
  showChoices(title:string,message:string,choices:readonly DialogChoice[],cancel:(()=>void)|null=null) {
    if(!this.open)this.prior=document.activeElement as HTMLElement;
    this.choices=choices;this.cancel=cancel;
    this.element.querySelector('#battle-dialog-title')!.textContent=title;
    this.element.querySelector('#battle-dialog-message')!.textContent=message;
    this.element.querySelector('.fit-controls')!.replaceChildren(...choices.map(choice=>{
      const button=document.createElement('button');button.type='button';button.id=choice.id;button.textContent=choice.label;return button;
    }));
    this.transition();if(!this.open)this.element.showModal();else this.element.querySelector('button')?.focus();
  }
  dismiss(){if(this.cancel)this.close(this.cancel);}
  close(callback:(()=>void)|null=null){
    const prior=this.prior;
    this.choices=[];this.cancel=null;this.element.close();this.transition();
    callback?.();
    // The callback can disable the invoker or open a replacement modal.
    if(this.open)return;
    if(prior?.isConnected && prior!==document.body && prior!==document.documentElement && !prior.closest('dialog') && !prior.matches(':disabled')) {
      prior.focus();
      if(document.activeElement===prior){
        // Native dialog restoration can already have focused an offscreen
        // control, making focus() alone a no-op in the nested battle scroller.
        prior.scrollIntoView({block:'nearest',inline:'nearest'});
        return;
      }
    }
    document.querySelector<HTMLElement>('#fit-restart')?.focus();
  }
  dispose(){this.abort.abort();this.element.close();this.element.remove();this.choices=[];this.cancel=null;}
}
