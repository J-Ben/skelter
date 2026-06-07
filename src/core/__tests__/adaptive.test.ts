import { resolveAnimation } from '../adaptive';
import type { AdaptiveRule, SkeletonConditions } from '../types';

describe('resolveAnimation', () => {
  it('returns the base animation when no adaptive policy is set', () => {
    expect(resolveAnimation('shatter', { network: '2g' }, undefined)).toBe('shatter');
    expect(resolveAnimation('shatter', { network: '2g' }, [])).toBe('shatter');
  });

  it('returns base when conditions are absent', () => {
    const rules: AdaptiveRule[] = [{ when: { network: '2g' }, use: 'none' }];
    expect(resolveAnimation('wave', undefined, rules)).toBe('wave');
  });

  describe('matrix (rules)', () => {
    const rules: AdaptiveRule[] = [
      { when: { network: ['slow-2g', '2g'] }, use: 'none' },
      { when: { saveData: true }, use: 'pulse' },
      { when: { batteryBelow: 0.2 }, use: 'pulse' },
      { when: { network: '3g' }, use: 'wave' },
    ];

    it('matches by array membership', () => {
      expect(resolveAnimation('shatter', { network: '2g' }, rules)).toBe('none');
    });

    it('matches a boolean condition', () => {
      expect(resolveAnimation('shatter', { network: '4g', saveData: true }, rules)).toBe('pulse');
    });

    it('matches batteryBelow only when battery is known and under the threshold', () => {
      expect(resolveAnimation('shatter', { network: '4g', battery: 0.1 }, rules)).toBe('pulse');
      expect(resolveAnimation('shatter', { network: '4g', battery: 0.5 }, rules)).toBe('shatter');
      expect(resolveAnimation('shatter', { network: '4g' }, rules)).toBe('shatter'); // battery unknown
    });

    it('first matching rule wins (order matters)', () => {
      // 2g matches rule 1 before the 3g rule would ever be considered
      expect(resolveAnimation('shatter', { network: '2g', saveData: true }, rules)).toBe('none');
    });

    it('falls back to base when nothing matches', () => {
      expect(resolveAnimation('shatter', { network: '4g', battery: 0.9 }, rules)).toBe('shatter');
    });

    it('requires every key in a rule to hold (AND)', () => {
      const andRule: AdaptiveRule[] = [{ when: { network: '3g', saveData: true }, use: 'none' }];
      expect(resolveAnimation('wave', { network: '3g', saveData: false }, andRule)).toBe('wave');
      expect(resolveAnimation('wave', { network: '3g', saveData: true }, andRule)).toBe('none');
    });

    it('matches custom signals', () => {
      const custom: AdaptiveRule[] = [{ when: { thermal: ['serious', 'critical'] }, use: 'none' }];
      expect(resolveAnimation('shatter', { thermal: 'critical' } as SkeletonConditions, custom)).toBe('none');
      expect(resolveAnimation('shatter', { thermal: 'nominal' } as SkeletonConditions, custom)).toBe('shatter');
    });
  });

  describe('function policy', () => {
    it('uses the function result', () => {
      const fn = (c: SkeletonConditions) => (c.battery != null && c.battery < 0.2 ? 'none' : undefined);
      expect(resolveAnimation('shatter', { battery: 0.1 }, fn)).toBe('none');
    });

    it('falls back to base when the function returns undefined', () => {
      const fn = () => undefined;
      expect(resolveAnimation('shatter', { battery: 0.9 }, fn)).toBe('shatter');
    });

    it('is called with an empty object when conditions are absent', () => {
      const fn = (c: SkeletonConditions) => (Object.keys(c).length === 0 ? 'pulse' : 'wave');
      expect(resolveAnimation('shatter', undefined, fn)).toBe('pulse');
    });
  });
});
