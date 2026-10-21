import { describe, expect, it } from 'vitest';
import { NEW_FEATURE_SCOPES, lockedScopes } from './features';

const LEGACY = ['admin', 'passwords', 'secrets', 'notes', 'documents', 'files', 'sharing'];

describe('the features a full device can turn on', () => {
  it('are the scopes added after the first six keyrings', () => {
    expect(NEW_FEATURE_SCOPES).toEqual(['calendar', 'diary']);
  });

  it('are listed for a full device that holds none of them', () => {
    expect(lockedScopes(LEGACY)).toEqual(['calendar', 'diary']);
  });

  it('are listed only for what is still missing', () => {
    expect(lockedScopes([...LEGACY, 'calendar'])).toEqual(['diary']);
  });

  it('are empty once the device holds them all', () => {
    expect(lockedScopes([...LEGACY, 'calendar', 'diary'])).toEqual([]);
  });

  it('are empty for a limited device and for a narrowed full device', () => {
    expect(lockedScopes(['passwords'])).toEqual([]);
    expect(lockedScopes(['admin', 'passwords', 'secrets'])).toEqual([]);
    expect(lockedScopes(LEGACY.filter((scope) => scope !== 'admin'))).toEqual([]);
  });
});
