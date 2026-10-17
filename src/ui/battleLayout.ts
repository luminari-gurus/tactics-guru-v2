/** Shared responsive shell for standalone battles and authored run encounters. */
export function mountBattleLayout(): void {
  document.body.classList.add('battle-mode');
  document.querySelector<HTMLElement>('#battlefield')!.hidden = false;
  const panel = document.querySelector<HTMLElement>('#fit-panel')!;
  const scroll = document.createElement('div');
  scroll.id = 'battle-scroll'; scroll.tabIndex = 0;
  scroll.setAttribute('aria-label', 'Actions, target and secondary tools; scroll for more');
  scroll.append(...panel.childNodes);
  scroll.prepend(scroll.querySelector('#battle-controls')!);
  const actor = document.createElement('header');
  actor.id = 'battle-actor'; actor.tabIndex = 0;
  actor.setAttribute('aria-label', 'Acting unit information; scroll for details');
  actor.hidden = true;
  panel.append(actor, scroll);
}
