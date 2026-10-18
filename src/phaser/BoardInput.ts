import { DRAG_THRESHOLD } from '../geometry/picking';
import type { Point } from '../geometry/iso';

export interface BoardInputTarget {
  pan(dx: number, dy: number): void;
  zoom(factor: number, anchor: Point): void;
  select(point: Point): void;
}

/** Mouse/pen pointers and native touch contacts share one gesture state. */
export function bindBoardInput(canvas: HTMLCanvasElement, board: BoardInputTarget, size: () => {width:number;height:number}, enabled: (point:Point) => boolean = () => true) {
  const pointers = new Map<string, { start: Point; point: Point; capture: number | null }>();
  let gesture = false;
  const owner = canvas.ownerDocument;
  const nativeTouch = typeof owner.defaultView?.TouchEvent === 'function';
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  const point = (event: {clientX:number;clientY:number}): Point => {
    const rect = canvas.getBoundingClientRect(), viewport = size();
    return { x: (event.clientX-rect.left)*viewport.width/rect.width, y: (event.clientY-rect.top)*viewport.height/rect.height };
  };
  const begin = (id:string, p:Point, capture:number|null): boolean => {
    if (!enabled(p)) return false;
    pointers.set(id, {start:p,point:p,capture});
    if (pointers.size>1) gesture=true;
    if (capture!==null) canvas.setPointerCapture(capture);
    return true;
  };
  const moveContact = (id:string, next:Point): boolean => {
    const pointer=pointers.get(id);
    if (!pointer) return false;
    if (!enabled(next)) { reset(); return true; }
    const other=[...pointers.entries()].find(([key])=>key!==id)?.[1];
    if (other) {
      const before=Math.hypot(pointer.point.x-other.point.x,pointer.point.y-other.point.y);
      const after=Math.hypot(next.x-other.point.x,next.y-other.point.y);
      if (before>0) board.zoom(after/before,{x:(pointer.point.x+other.point.x)/2,y:(pointer.point.y+other.point.y)/2});
      board.pan((next.x-pointer.point.x)/2,(next.y-pointer.point.y)/2);
    } else if (!gesture && Math.hypot(next.x-pointer.start.x,next.y-pointer.start.y)>=DRAG_THRESHOLD) {
      gesture=true;board.pan(next.x-pointer.start.x,next.y-pointer.start.y);
    } else if (gesture) board.pan(next.x-pointer.point.x,next.y-pointer.point.y);
    pointer.point=next;
    return true;
  };
  const finish = (id:string, next:Point, select:boolean): boolean => {
    const pointer=pointers.get(id);
    if (!pointer) return false;
    if (!enabled(next)) { reset(); return true; }
    if (select && !gesture && pointers.size===1 && Math.hypot(next.x-pointer.start.x,next.y-pointer.start.y)<DRAG_THRESHOLD) board.select(next);
    pointers.delete(id);
    if (pointer.capture!==null && canvas.hasPointerCapture(pointer.capture)) canvas.releasePointerCapture(pointer.capture);
    if (!pointers.size) gesture=false;
    return true;
  };
  const ignore = (event:PointerEvent) => nativeTouch && event.pointerType==='touch';
  const down = (event:PointerEvent) => { if (!ignore(event) && event.button===0) begin(`p${event.pointerId}`,point(event),event.pointerId); };
  const move = (event:PointerEvent) => { if (!ignore(event)) moveContact(`p${event.pointerId}`,point(event)); };
  const end = (event:PointerEvent) => { if (!ignore(event)) finish(`p${event.pointerId}`,point(event),event.type==='pointerup'); };
  // Use the native contact list for touch: capture/cancellation of compatibility
  // pointer events must not drop a second finger or dispatch the gesture twice.
  const touch = (event:TouchEvent) => {
    let handled=false;
    for (const contact of Array.from(event.changedTouches)) {
      const id=`t${contact.identifier}`,p=point(contact);
      const accepted=event.type==='touchstart'?begin(id,p,null):event.type==='touchmove'?moveContact(id,p):finish(id,p,event.type==='touchend');
      handled=accepted || handled;
    }
    if (handled && event.cancelable) event.preventDefault();
  };
  const wheel = (event:WheelEvent) => {
    event.preventDefault();
    if (!enabled(point(event))) { reset(); return; }
    if (pointers.size) gesture=true;
    board.zoom(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*0.002),point(event));
  };
  const reset = ():void => {
    const captured=[...pointers.values()];pointers.clear();gesture=false;
    for (const pointer of captured) if (pointer.capture!==null && canvas.hasPointerCapture(pointer.capture)) canvas.releasePointerCapture(pointer.capture);
  };
  const visibility = () => { if (owner.visibilityState==='hidden') reset(); };
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',end);
  canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('lostpointercapture',end);
  canvas.addEventListener('wheel',wheel,{passive:false});
  const touchEvents=['touchstart','touchmove','touchend','touchcancel'] as const;
  if (nativeTouch) for (const type of touchEvents) canvas.addEventListener(type,touch,{passive:false});
  owner.addEventListener('visibilitychange',visibility);
  return Object.assign(()=>{
    owner.removeEventListener('visibilitychange',visibility);
    canvas.removeEventListener('pointerdown',down);
    canvas.removeEventListener('pointermove',move);
    canvas.removeEventListener('pointerup',end);
    canvas.removeEventListener('pointercancel',end);
    canvas.removeEventListener('lostpointercapture',end);
    canvas.removeEventListener('wheel',wheel);
    if (nativeTouch) for (const type of touchEvents) canvas.removeEventListener(type,touch);
    reset();canvas.style.touchAction=previousTouchAction;
  },{reset});
}
