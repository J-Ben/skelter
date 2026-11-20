describe('warnOnce', () => {
  const g = globalThis as { __DEV__?: boolean };

  afterEach(() => {
    delete g.__DEV__;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('warns once per key in development', () => {
    g.__DEV__ = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { warnOnce } = require('../dev');
    warnOnce('k', 'first');
    warnOnce('k', 'again');
    warnOnce('other', 'second');
    expect(warn.mock.calls).toEqual([['[skelter] first'], ['[skelter] second']]);
  });

  it('stays silent in a React Native release build', () => {
    g.__DEV__ = false;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { warnOnce } = require('../dev');
    warnOnce('k', 'message');
    expect(warn).not.toHaveBeenCalled();
  });
});
