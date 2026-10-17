import { describe, expect, it } from 'vitest';
import { HEALTH_BAR, HEALTH_COLORS, healthArc, healthBarScale, healthColor, healthFraction } from '../../src/phaser/healthBar';

describe('board health display', () => {
  it.each([[-2,20,0],[0,20,0],[5,20,0.25],[10,20,0.5],[20,20,1],[30,20,1]])('clamps %s/%s', (hp,max,ratio) => {
    expect(healthFraction(hp,max)).toBe(ratio);
  });
  it.each([[0,'red'],[0.249,'red'],[0.25,'red'],[0.251,'yellow'],[0.499,'yellow'],[0.5,'yellow'],[0.501,'green'],[1,'green']] as const)('colors ratio %s', (ratio,color) => {
    expect(healthColor(ratio)).toBe(HEALTH_COLORS[color]);
  });
  it('sweeps a lower half ellipse proportionally without exceeding the track', () => {
    for (const ratio of [-1,0,0.25,0.5,0.75,1,2]) {
      const points=healthArc(ratio), clamped=Math.max(0,Math.min(1,ratio));
      expect(points[0].x).toBe(-HEALTH_BAR.radiusX);
      expect(points.at(-1)!.x).toBeCloseTo(Math.cos(Math.PI*(1-clamped))*HEALTH_BAR.radiusX);
      for(const p of points){expect(p.x).toBeGreaterThanOrEqual(-15);expect(p.x).toBeLessThanOrEqual(15);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(4);}
    }
    expect(healthArc(0).every(p=>p.x===-15)).toBe(true);
    expect(healthArc(0.5).at(-1)!.y).toBe(4);
  });
  it('bounds mobile enlargement and leaves zoomed bars board-scaled', () => {
    expect(healthBarScale(0.4)).toBe(1.25);expect(healthBarScale(0.1)).toBe(1.4);expect(healthBarScale(1)).toBe(1);expect(healthBarScale(6)).toBe(1);
  });
});
