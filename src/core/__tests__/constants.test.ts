import { DEFAULT_SKELETON_CONFIG } from '../constants';

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
