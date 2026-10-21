import { LEGACY_KEYRING_SCOPES, SCOPES, type Scope } from '@/lib/scopes';

export const NEW_FEATURE_SCOPES: readonly Scope[] = SCOPES.filter(
  (scope) => scope !== 'admin' && !(LEGACY_KEYRING_SCOPES as readonly string[]).includes(scope),
);

export function lockedScopes(held: Iterable<string>): Scope[] {
  const scopes = new Set(held);
  const full = scopes.has('admin') && LEGACY_KEYRING_SCOPES.every((scope) => scopes.has(scope));
  return full ? NEW_FEATURE_SCOPES.filter((scope) => !scopes.has(scope)) : [];
}

export const NEW_FEATURES_COPY = {
  title: 'Turn on Calendar, To-do and Diary',
  summary:
    'These features were added after this account was created, so their keys do not exist yet. ' +
    'Creating them needs your recovery phrase, once. Everything else keeps working without it.',
  why:
    'Your recovery phrase must be able to reopen every key you will ever use, and only it can seal a key for itself. ' +
    'The new keys are made here, sealed for your phrase and for each of your full devices, and this browser forgets ' +
    'the phrase as soon as the request is sent. Nothing you already stored is touched.',
  limitedDevice:
    'This device was linked with only some of your features, so it cannot turn these on. Turn them on from a full device.',
  phraseHint: 'Your recovery phrase signs the new keys. This browser forgets it as soon as the request is sent.',
  submit: 'Turn on',
  working: 'Turning on…',
  done: 'Done. Calendar, To-do and Diary are on for your full devices. A device that is open elsewhere gets them the next time it is unlocked.',
  alreadyOpen: 'Another device already turned them on. Lock and unlock this browser to get them.',
} as const;
