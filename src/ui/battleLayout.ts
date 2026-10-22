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
  const contents = document.createElement('div');
  contents.id = 'battle-hud-contents'; contents.append(actor, scroll);
  const toggle = document.createElement('button');
  toggle.id = 'battle-hud-toggle'; toggle.type = 'button';
  toggle.setAttribute('aria-controls', contents.id);
  panel.append(toggle, contents);
  // Match the existing portrait dock and short-landscape rail breakpoints.
  const mobile = matchMedia('(max-width:759px) and (min-height:501px), (orientation:portrait), (orientation:landscape) and (max-height:500px)');
  let collapsed = false;
  const render = () => {
    const hide = mobile.matches && collapsed;
    const focus = document.activeElement;
    toggle.hidden = !mobile.matches;
    toggle.textContent = hide ? 'Show HUD' : 'Hide HUD';
    toggle.setAttribute('aria-label', hide ? 'Show battle controls' : 'Hide battle controls');
    toggle.setAttribute('aria-expanded', String(!hide));
    contents.hidden = hide;
    contents.inert = hide;
    document.querySelector('#battle-shell')!.classList.toggle('hud-collapsed', hide);
    if (hide && focus instanceof Node && contents.contains(focus)) toggle.focus();
    else if (!mobile.matches && focus === toggle) scroll.focus();
  };
  toggle.addEventListener('click', () => { collapsed = !collapsed; render(); });
  mobile.addEventListener('change', render);
  render();
}
