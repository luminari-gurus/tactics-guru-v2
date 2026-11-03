import { dragThresholdFor } from '../geometry/picking';
import { HOLD_MS, classifyHoldMove, classifyHoldUp } from '../ui/radialGesture';
import type { Point } from '../geometry/iso';

export interface BoardInputTarget {
  pan(dx: number, dy: number): void;
  zoom(factor: number, anchor: Point): void;
  select(point: Point): void;
  cancel?(): void;
  hover?(point: Point | null): void;
  resetPicking?(): void;
  hold?(point: Point): boolean | void;
  aim?(point: Point): void;
  release?(point: Point): void;
  dismiss?(): void;
}

export interface BoardInputOptions {
  reducedMotion?: () => boolean;
}

/** CSS coordinates are converted through the canvas rectangle, independent of DPR. */
export function bindBoardInput(canvas: HTMLCanvasElement, board: BoardInputTarget, size: () => {width:number;height:number}, enabled: (point:Point) => boolean = () => true, options: BoardInputOptions = {}) {
  const pointers = new Map<number, { start: Point; point: Point; pointerType: string; downAt: number }>();
  let gesture = false;
  let holding = false;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  const reducedMotion = () => options.reducedMotion?.() === true;
  const point = (event: PointerEvent | WheelEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    const viewport = size();
    return { x: (event.clientX - rect.left) * viewport.width / rect.width, y: (event.clientY - rect.top) * viewport.height / rect.height };
  };
  const stopHoldTimer = (): void => {
    if (holdTimer !== null) { clearTimeout(holdTimer); holdTimer = null; }
  };
  const dismissHold = (): void => {
    stopHoldTimer();
    if (holding) { holding = false; board.dismiss?.(); }
  };
  const down = (event: PointerEvent): void => {
    if (!enabled(point(event))) return;
    if (event.button === 2) { reset(); board.cancel?.(); return; }
    if (event.button !== 0) return;
    board.hover?.(null);
    const p = point(event);
    pointers.set(event.pointerId, { start: p, point: p, pointerType: event.pointerType, downAt: performance.now() });
    if (pointers.size > 1) { gesture = true; dismissHold(); board.resetPicking?.(); }
    else if (board.hold && !reducedMotion()) {
      holdTimer = setTimeout(() => {
        holdTimer = null;
        const pointer = pointers.get(event.pointerId);
        if (!pointer || gesture || holding) return;
        holding = true;
        if (board.hold!(pointer.start) === false) holding = false;
      }, HOLD_MS);
    }
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent, allowHover = true): void => {
    // An open hold stays live when a slice extends into the HUD or off the board.
    if (!holding && !enabled(point(event))) { reset(); return; }
    const pointer = pointers.get(event.pointerId);
    if (!pointer) {
      if (allowHover && !pointers.size && event.buttons === 0 && (event.pointerType === 'mouse' || event.pointerType === 'pen')) board.hover?.(point(event));
      return;
    }
    const next = point(event);
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      stopHoldTimer();
      const before = Math.hypot(pointer.point.x - other.point.x, pointer.point.y - other.point.y);
      const after = Math.hypot(next.x - other.point.x, next.y - other.point.y);
      if (before > 0) board.zoom(after / before, { x: (pointer.point.x + other.point.x)/2, y: (pointer.point.y + other.point.y)/2 });
      board.pan((next.x - pointer.point.x)/2, (next.y - pointer.point.y)/2);
    } else {
      const threshold = dragThresholdFor(pointer.pointerType);
      const distance = Math.hypot(next.x-pointer.start.x,next.y-pointer.start.y);
      const kind = classifyHoldMove({ distance, threshold, holdOpen: holding });
      if (kind === 'aim') board.aim?.(next);
      else if (kind === 'pan') {
        stopHoldTimer();
        if (!gesture) {
          gesture = true;
          board.pan(next.x-pointer.start.x,next.y-pointer.start.y);
        } else board.pan(next.x-pointer.point.x,next.y-pointer.point.y);
      }
    }
    pointer.point = next;
  };
  const end = (event: PointerEvent): void => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    if (!holding && !enabled(point(event))) { reset(); return; }
    board.hover?.(null);
    if(event.type!=='pointerup')board.resetPicking?.();
    const next = point(event);
    const threshold = dragThresholdFor(pointer.pointerType);
    const distance = Math.hypot(next.x-pointer.start.x,next.y-pointer.start.y);
    const verdict = classifyHoldUp({
      distance, threshold, holdOpen: holding, reducedMotion: reducedMotion(),
      leftHub: false, inHub: true, elapsedMs: performance.now() - pointer.downAt,
    });
    stopHoldTimer();
    if (event.type === 'pointerup' && pointers.size === 1) {
      if (holding) { holding = false; board.release?.(next); }
      else if (verdict === 'tap' && !gesture && distance < threshold) board.select(next);
    } else if (holding) { holding = false; board.dismiss?.(); }
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!pointers.size) { gesture = false; holding = false; }
  };
  const wheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (!enabled(point(event))) { reset(); return; }
    board.hover?.(null);
    if (pointers.size) gesture = true;
    stopHoldTimer();
    board.zoom(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*0.002),point(event));
  };
  const reset = (preservePicking = false): void => {
    dismissHold();
    if(!preservePicking)board.resetPicking?.();
    for (const id of pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    pointers.clear();
    gesture = false;
    holding = false;
    board.hover?.(null);
  };
  const owner = canvas.ownerDocument;
  // Non-hover touch/pen devices emit pointerleave after completed taps. Preserve overlap cycling
  // between taps; leaving during a captured pan still cancels it, but a hold must survive the
  // radial overlay appearing under the captured pointer (WebKit leaves the canvas for the hub).
  const leave = (event:PointerEvent):void => {
    if (pointers.size && holding) return;
    const related = 'relatedTarget' in event ? event.relatedTarget : null;
    if (pointers.size && typeof Node !== 'undefined' && related instanceof Node && owner.getElementById('battle-radial')?.contains(related)) return;
    if((event.pointerType==='touch'||event.pointerType==='pen') && !pointers.size){board.hover?.(null);return;}
    reset();
  };
  const fromOverlay = (event: PointerEvent): boolean => {
    const target = event.target;
    return !(target === canvas || (typeof Node !== 'undefined' && target instanceof Node && canvas.contains(target)));
  };
  const documentMove = (event: PointerEvent): void => { if (fromOverlay(event)) move(event, false); };
  const documentEnd = (event: PointerEvent): void => { if (fromOverlay(event)) end(event); };
  // A finger down at an app switch may never deliver pointerup; drop it so resume cannot pan without a press.
  const visibility = (): void => { if (owner.visibilityState === 'hidden') reset(); };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('wheel', wheel, { passive: false });
  owner.addEventListener('visibilitychange', visibility);
  owner.addEventListener('pointermove', documentMove, true);
  owner.addEventListener('pointerup', documentEnd, true);
  owner.addEventListener('pointercancel', documentEnd, true);
  return Object.assign(() => {
    owner.removeEventListener('visibilitychange', visibility);
    owner.removeEventListener('pointermove', documentMove, true);
    owner.removeEventListener('pointerup', documentEnd, true);
    owner.removeEventListener('pointercancel', documentEnd, true);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', end);
    canvas.removeEventListener('pointercancel', end);
    canvas.removeEventListener('lostpointercapture', end);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('wheel', wheel);
    reset();
    canvas.style.touchAction = previousTouchAction;
  }, { reset });
}
