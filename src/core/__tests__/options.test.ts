import { resolveMockProps } from '../options';

interface CardProps {
  title: string;
  amount: number;
}

describe('resolveMockProps', () => {
  it('returns undefined when no mock is configured', () => {
    expect(resolveMockProps()).toBeUndefined();
    expect(resolveMockProps({})).toBeUndefined();
  });

  it('keeps mockProps working as before (v1–v3)', () => {
    expect(resolveMockProps({ mockProps: { title: 'Lorem' } })).toEqual({ title: 'Lorem' });
  });

  it('accepts mockData typed against the component props', () => {
    expect(resolveMockProps<CardProps>({ mockData: { title: 'Jean VALJEAN' } })).toEqual({ title: 'Jean VALJEAN' });
  });

  it('prefers mockData when both names are set', () => {
    expect(resolveMockProps<CardProps>({ mockData: { title: 'new' }, mockProps: { title: 'old' } })).toEqual({ title: 'new' });
  });
});
