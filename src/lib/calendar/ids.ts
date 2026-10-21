const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export const RECORD_ID_LENGTH = 10;

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function randomId(length: number = RECORD_ID_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) {
    id += ALPHABET[byte & 63];
  }
  return id;
}

export function freshId(taken: ReadonlySet<string> | { has(id: string): boolean }): string {
  let id = randomId();
  while (taken.has(id)) {
    id = randomId();
  }
  return id;
}

export function isRecordId(value: unknown): value is string {
  return typeof value === 'string' && value.length === RECORD_ID_LENGTH && ID_PATTERN.test(value);
}
