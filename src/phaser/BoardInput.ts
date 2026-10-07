import type { BoardRenderer } from './BoardRenderer';
import { DRAG_THRESHOLD } from '../geometry/picking';
import type { Point } from '../geometry/iso';

/** CSS coordinates are converted through the canvas rectangle, independent of DPR. */
export function bindBoardInput(canvas: HTMLCanvasElement, board: BoardRenderer, size: () => {width:number;height:number}): () => void {
  const pointers = new Map<number, { start: Point; point: Point }>();
  let gesture = false;
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  const point = (event: PointerEvent | WheelEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    const viewport = size();
    return { x: (event.clientX - rect.left) * viewport.width / rect.width, y: (event.clientY - rect.top) * viewport.height / rect.height };
  };
  const down = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const p = point(event);
    pointers.set(event.pointerId, { start: p, point: p });
    if (pointers.size > 1) gesture = true;
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent): void => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const next = point(event);
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const before = Math.hypot(pointer.point.x - other.point.x, pointer.point.y - other.point.y);
      const after = Math.hypot(next.x - other.point.x, next.y - other.point.y);
      if (before > 0) board.zoom(after / before, { x: (pointer.point.x + other.point.x)/2, y: (pointer.point.y + other.point.y)/2 });
      board.pan((next.x - pointer.point.x)/2, (next.y - pointer.point.y)/2);
    } else {
      if (!gesture && Math.hypot(next.x-pointer.start.x,next.y-pointer.start.y) >= DRAG_THRESHOLD) {
        gesture = true;
        board.pan(next.x-pointer.start.x,next.y-pointer.start.y);
      } else if (gesture) board.pan(next.x-pointer.point.x,next.y-pointer.point.y);
    }
    pointer.point = next;
  };
  const end = (event: PointerEvent): void => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const next = point(event);
    if (event.type === 'pointerup' && !gesture && pointers.size === 1
      && Math.hypot(next.x-pointer.start.x,next.y-pointer.start.y) < DRAG_THRESHOLD) board.select(next);
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!pointers.size) gesture = false;
  };
  const wheel = (event: WheelEvent): void => {
    event.preventDefault();
    board.zoom(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*0.002),point(event));
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('wheel', wheel, { passive: false });
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', end);
    canvas.removeEventListener('pointercancel', end);
    canvas.removeEventListener('lostpointercapture', end);
    canvas.removeEventListener('wheel', wheel);
    for (const id of pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    pointers.clear();
    canvas.style.touchAction = previousTouchAction;
  };
}
