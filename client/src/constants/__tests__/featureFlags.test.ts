import { describe, expect, it } from 'vitest';

import { __testing__ } from '../featureFlags';

const { parseFlag } = __testing__;

describe('parseFlag', () => {
  it('returns the fallback when the env var is undefined', () => {
    expect(parseFlag(undefined, true)).toBe(true);
    expect(parseFlag(undefined, false)).toBe(false);
  });

  it.each(['0', 'false', 'FALSE', 'off', ''])(
    'treats %j as disabled regardless of fallback',
    (value) => {
      expect(parseFlag(value, true)).toBe(false);
      expect(parseFlag(value, false)).toBe(false);
    },
  );

  it.each(['1', 'true', 'TRUE', 'on', 'yes', 'enable'])(
    'treats %j as enabled regardless of fallback',
    (value) => {
      expect(parseFlag(value, true)).toBe(true);
      expect(parseFlag(value, false)).toBe(true);
    },
  );

  it('trims whitespace before evaluating', () => {
    expect(parseFlag('   ', true)).toBe(false);
    expect(parseFlag('  0  ', true)).toBe(false);
    expect(parseFlag(' true ', false)).toBe(true);
  });
});
