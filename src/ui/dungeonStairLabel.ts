import { currentFloor, dungeonStairStatus, type DungeonState } from '../domain/dungeon';

export function dungeonStairLabel(s: DungeonState, direction: 'ascend' | 'descend'): string {
  const floor = currentFloor(s);
  const stair = direction === 'descend' ? 'Downstairs' : 'Upstairs';
  const availability = dungeonStairStatus(s, direction);
  let detail: string;
  if (availability === 'available') {
    detail = direction === 'descend' ? 'unlocked' : 'available';
    if (floor.position === (direction === 'descend' ? floor.descriptor.downstairs : floor.descriptor.upstairs)) {
      detail += ` · Step off the ${stair.toLowerCase()} and back onto it to ${direction}.`;
    } else if (direction === 'descend') detail += ' · walk onto the stairs';
  } else if (availability === 'encounters') {
    const remaining = floor.descriptor.encounters.length - floor.completed;
    detail = `locked · clear ${remaining} more encounter${remaining === 1 ? '' : 's'}`;
  } else detail = {
    floorOne: 'unavailable on floor 1', reward: 'locked · resolve reward',
    battle: 'unavailable during battle', defeat: 'unavailable after defeat',
  }[availability];
  return `${stair}: ${detail}`;
}
