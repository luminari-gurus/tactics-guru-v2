export interface DialogChoice { id: string; label: string; run: () => void }
/** One native modal owner for battle actions, outcomes and persistence recovery. */
export class BattleDialogs {
  readonly element=document.createElement('dialog');
  private readonly abort=new AbortController();
  private prior:HTMLElement|null=null;
  private choices:readonly DialogChoice[]=[];
  private cancel:(()=>void)|null=null;
  constructor(private readonly transition:()=>void, private readonly restart:()=>void) {
    this.element.id='battle-dialog';this.element.setAttribute('aria-labelledby','battle-dialog-title');
    this.element.innerHTML='<h2 id="battle-dialog-title"></h2><p id="battle-dialog-message"></p><div class="fit-controls"></div>';
    document.body.append(this.element); const signal=this.abort.signal;
    this.element.addEventListener('click',event=>{
      const button=(event.target as Element).closest('button');
      const choice=this.choices.find(c=>c.id===button?.id);
      if(choice)this.close(choice.run);
    },{signal});
    this.element.addEventListener('cancel',e=>{e.preventDefault();if(this.cancel)this.close(this.cancel);},{signal});
    this.element.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const buttons=[...this.element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
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
    this.transition();if(!this.open)this.element.showModal();
  }
  dismiss(){if(this.cancel)this.close(this.cancel);}
  close(callback:(()=>void)|null=null){
    this.choices=[];this.cancel=null;this.element.close();this.transition();
    if(this.prior?.isConnected && !this.prior.closest('dialog') && !(this.prior instanceof HTMLButtonElement && this.prior.disabled))this.prior.focus();
    else document.querySelector<HTMLElement>('#fit-restart')?.focus();
    callback?.();
  }
  dispose(){this.abort.abort();this.element.close();this.element.remove();this.choices=[];this.cancel=null;}
}
