import { HERO_PROGRESSION as rules } from '../content/progression';
import { HERO_IDS } from '../content/constants';
import type { AbilityId, ContentCatalog, HeroId } from '../content/types';
import { hasShape, isDenseArray } from './validation';
import { isIntegerIn } from './rng';

export interface ProgressHero {
  readonly heroId: HeroId; readonly hp: number; readonly xp: number;
  readonly level: number; readonly maxHp: number; readonly learned: readonly AbilityId[];
}
export function progressHero(heroId: HeroId, xp: number, hp: number, catalog: ContentCatalog): ProgressHero {
  const level = rules.thresholds.filter(t => xp >= t).length;
  const maxHp = catalog.heroes[heroId].stats.maxHp + (level - 1) * rules.hpPerLevel[heroId];
  const learned = Object.values(catalog.abilities).filter(a => a.owners.includes(heroId) && (a.requiredLevel ?? 1) <= level).map(a => a.id).sort();
  return { heroId, hp, xp, level, maxHp, learned };
}
export function readProgressHero(input: unknown, heroId: HeroId, catalog: ContentCatalog): ProgressHero | null {
  if (!hasShape(input, ['heroId','hp','xp','level','maxHp','learned']) || input.heroId !== heroId ||
      !isIntegerIn(input.xp,{min:0,max:600}) || !isDenseArray(input.learned,64)) return null;
  const expected = progressHero(heroId,input.xp,0,catalog);
  if (!isIntegerIn(input.hp,{min:0,max:expected.maxHp}) || input.level !== expected.level || input.maxHp !== expected.maxHp ||
      input.learned.length !== expected.learned.length || input.learned.some((id,i) => id !== expected.learned[i])) return null;
  return { ...expected, hp: input.hp };
}
export function awardHero(hero: ProgressHero, amount: number, catalog: ContentCatalog): ProgressHero {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Invalid XP award');
  if (hero.hp === 0) return { ...hero, learned: [...hero.learned] };
  const next = progressHero(hero.heroId, Math.min(600, hero.xp + Math.min(amount,600)), hero.hp, catalog);
  return next.level > hero.level ? { ...next, hp: next.maxHp } : next;
}
/** Always project from the immutable baseline, before equipment. */
export function projectProgression(party: readonly ProgressHero[], base: ContentCatalog): ContentCatalog {
  const heroes = { ...base.heroes }, abilities = { ...base.abilities };
  for (const hero of party) heroes[hero.heroId] = { ...heroes[hero.heroId], stats: { ...heroes[hero.heroId].stats, maxHp: hero.maxHp } };
  for (const a of Object.values(abilities)) {
    const owners = a.owners.filter(id => !HERO_IDS.includes(id as HeroId) || party.find(h => h.heroId === id)?.learned.includes(a.id));
    if (!owners.length) { delete abilities[a.id]; continue; }
    abilities[a.id] = { ...a, owners, ...(a.kind === 'magicMissile' && a.owners.includes('mage') ? { casterLevel: party.find(h => h.heroId === 'mage')!.level } : {}) };
  }
  return { ...base, heroes, abilities };
}
export function progressionLabel(hero: ProgressHero): string {
  return `Level ${hero.level} · ${hero.level === 5 ? 'MAX' : `XP ${hero.xp}/${rules.thresholds[hero.level]}`} · Learned: ${hero.learned.map(id => id.replace('ability:','').replaceAll('_',' ')).join(', ')}`;
}
export function levelUpFeedback(before: readonly ProgressHero[], after: readonly ProgressHero[]): string {
  return after.filter((h,i) => h.level > before[i].level).map(h => `${h.heroId} reached level ${h.level}: healed to ${h.maxHp} HP${h.learned.filter(id => !before.find(b => b.heroId === h.heroId)!.learned.includes(id)).map(id => `; learned ${id}`).join('')}`).join('. ');
}
