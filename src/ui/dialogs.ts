/** Native modal capture plus explicit focus restoration; listeners live for one scene run. */
export class BattleDialogs {
  readonly element=document.createElement('dialog');
  private readonly abort=new AbortController();
  private prior:HTMLElement|null=null;
  private accept:(()=>void)|null=null;
  private cancel:(()=>void)|null=null;
  constructor(private readonly transition:()=>void, restart:()=>void) {
    this.element.id='battle-dialog';this.element.setAttribute('aria-labelledby','battle-dialog-title');
    this.element.innerHTML='<h2 id="battle-dialog-title"></h2><p id="battle-dialog-message"></p><div class="fit-controls"><button id="dialog-confirm">Confirm</button><button id="dialog-cancel">Cancel</button><button id="dialog-restart">Restart battle</button></div>';
    document.body.append(this.element); const signal=this.abort.signal;
    this.element.querySelector('#dialog-confirm')!.addEventListener('click',()=>{const fn=this.accept;this.close(fn);},{signal});
    this.element.querySelector('#dialog-cancel')!.addEventListener('click',()=>this.dismiss(),{signal});
    this.element.querySelector('#dialog-restart')!.addEventListener('click',()=>{this.close(restart);},{signal});
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.dismiss();},{signal});
  }
  get open(){return this.element.open;}
  show(title:string,message:string,accept:(()=>void)|null,cancel:(()=>void)|null) {
    this.accept=accept;this.cancel=cancel;this.prior=document.activeElement as HTMLElement;
    this.element.querySelector('#battle-dialog-title')!.textContent=title;
    this.element.querySelector('#battle-dialog-message')!.textContent=message;
    (this.element.querySelector('#dialog-confirm') as HTMLElement).hidden=!accept;
    (this.element.querySelector('#dialog-cancel') as HTMLElement).hidden=!cancel;
    this.transition();this.element.showModal();
  }
  dismiss(){const fn=this.cancel;this.close(fn);}
  close(callback:(()=>void)|null=null){this.accept=this.cancel=null;this.element.close();this.transition();callback?.();if(this.prior?.isConnected && !(this.prior instanceof HTMLButtonElement && this.prior.disabled))this.prior.focus();else document.querySelector<HTMLElement>('#fit-restart')?.focus();}
  dispose(){this.abort.abort();this.element.close();this.element.remove();this.accept=this.cancel=null;}
}
