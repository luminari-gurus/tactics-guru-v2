/** Reviewed initial progression slice; cumulative XP, no non-HP stat growth. */
export const HERO_PROGRESSION = {
  version: 1,
  thresholds: [0, 60, 180, 360, 600],
  hpPerLevel: { fighter: 6, ranger: 5, mage: 4 },
  awards: { normal: 30, elite: 55, vault: 70, boss: 90 },
} as const;
