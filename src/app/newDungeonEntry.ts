import { bothDungeonSlotsMissing, resumableDungeonSlot, type DungeonInspection, type DungeonSlot } from '../persistence/dungeonStorage';

export type MenuDungeonReview = Partial<Record<DungeonSlot, { status?: string; text?: string | null }>>;

export function newDungeonEntryAction(current: DungeonInspection, approved: MenuDungeonReview | null) {
  const matches = (['primary', 'backup'] as const).every(slot =>
    current[slot].status !== 'unavailable' && approved?.[slot]?.status === current[slot].status &&
    approved?.[slot]?.text === current[slot].text);
  if (matches || bothDungeonSlotsMissing(current)) return 'replace';
  if (approved || resumableDungeonSlot(current)) return 'confirm';
  // Preserve unreadable saves when starting without a replacement review.
  if (Object.values(current).some(slot => slot.status === 'invalid' || slot.status === 'unavailable')) return 'unsaved';
  return 'replace';
}
