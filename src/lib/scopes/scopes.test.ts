import { describe, expect, it } from 'vitest';
import {
  DEK_SCOPES,
  KEYRING_SCOPES,
  LEGACY_KEYRING_SCOPES,
  ITEM_SCOPES,
  SCOPES,
  formatScopeList,
  fullDeviceScopesFor,
  isGenesisRotation,
  parseScopeList,
} from './index';

describe('the scope list', () => {
  it('appends calendar and diary so every stored list stays valid', () => {
    const legacy = 'admin,passwords,secrets,notes,documents,files,sharing';
    expect(parseScopeList(legacy)).toHaveLength(7);
    expect(formatScopeList(parseScopeList(`${legacy},calendar,diary`))).toBe(`${legacy},calendar,diary`);
    expect(SCOPES.join(',')).toBe(`${legacy},calendar,diary`);
  });

  it('refuses the new scopes out of place', () => {
    expect(() => parseScopeList('diary,calendar')).toThrow();
    expect(() => parseScopeList('calendar,sharing')).toThrow();
  });

  it('keeps calendar and diary out of sharing and into the rekey list', () => {
    expect(ITEM_SCOPES).not.toContain('calendar');
    expect(ITEM_SCOPES).not.toContain('diary');
    expect(DEK_SCOPES).toEqual(expect.arrayContaining(['calendar', 'diary']));
    expect(KEYRING_SCOPES).toEqual([...LEGACY_KEYRING_SCOPES, 'calendar', 'diary']);
  });
});

describe('what a new device of an account may hold', () => {
  it('is admin plus the keyrings the account has', () => {
    expect(fullDeviceScopesFor(LEGACY_KEYRING_SCOPES)).toEqual(['admin', ...LEGACY_KEYRING_SCOPES]);
    expect(fullDeviceScopesFor(KEYRING_SCOPES)).toEqual(['admin', ...KEYRING_SCOPES]);
    expect(fullDeviceScopesFor(['notes', 'unknown'])).toEqual(['admin', 'notes']);
  });

  it('knows the two genesis sets and no other', () => {
    expect(isGenesisRotation(LEGACY_KEYRING_SCOPES)).toBe(true);
    expect(isGenesisRotation(KEYRING_SCOPES)).toBe(true);
    expect(isGenesisRotation([...LEGACY_KEYRING_SCOPES, 'calendar'])).toBe(false);
    expect(isGenesisRotation([])).toBe(false);
  });
});
