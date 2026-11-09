import { DEFAULT_SKELETON_CONFIG, resolveBoneFill } from '../constants';

describe('DEFAULT_SKELETON_CONFIG', () => {
  it('keeps the skeleton visible long enough to be seen on fast responses (v4)', () => {
    expect(DEFAULT_SKELETON_CONFIG.minDuration).toBe(500);
  });

  it('documents the enter / exit / reveal defaults the native renderer honours', () => {
    expect(DEFAULT_SKELETON_CONFIG.enter).toBe('none');
    expect(DEFAULT_SKELETON_CONFIG.exit).toBe('fade');
    expect(DEFAULT_SKELETON_CONFIG.revealOnExit).toBe(false);
  });
});

describe('resolveBoneFill — boxColor / boxOpacity (v4)', () => {
  const config = { color: '#E0E0E0', boxColor: '', boxOpacity: 0.25 };

  it('keeps the v3 look by default : boxes use color at 0.25', () => {
    expect(resolveBoneFill({ isBox: true, opacity: 0.25 }, config)).toEqual({ backgroundColor: '#E0E0E0', opacity: 0.25 });
  });

  it('uses boxColor and boxOpacity for boxes only', () => {
    const custom = { color: '#E0E0E0', boxColor: '#EEF1F6', boxOpacity: 0.6 };
    expect(resolveBoneFill({ isBox: true, opacity: 0.25 }, custom)).toEqual({ backgroundColor: '#EEF1F6', opacity: 0.6 });
    expect(resolveBoneFill({}, custom)).toEqual({ backgroundColor: '#E0E0E0' });
  });

  it('keeps a regular bone opacity override', () => {
    expect(resolveBoneFill({ opacity: 0.5 }, config)).toEqual({ backgroundColor: '#E0E0E0', opacity: 0.5 });
  });
});
