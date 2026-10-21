const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function midpoint(before: string, after: string | undefined): string {
  if (after !== undefined) {
    let shared = 0;
    while ((before[shared] ?? DIGITS[0]) === after[shared]) {
      shared += 1;
    }
    if (shared > 0) {
      return after.slice(0, shared) + midpoint(before.slice(shared), after.slice(shared));
    }
  }
  const low = before === '' ? 0 : DIGITS.indexOf(before[0]);
  const high = after === undefined ? DIGITS.length : DIGITS.indexOf(after[0]);
  if (high - low > 1) {
    return DIGITS[Math.round((low + high) / 2)];
  }
  if (after !== undefined && after.length > 1) {
    return after.slice(0, 1);
  }
  return DIGITS[low] + midpoint(before.slice(1), undefined);
}

export function isOrderKey(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && !value.endsWith(DIGITS[0]) && [...value].every((c) => DIGITS.includes(c));
}

export function orderBetween(before: string | undefined, after: string | undefined): string {
  if (before !== undefined && after !== undefined && before >= after) {
    throw new RangeError('The key before must sort below the key after');
  }
  return midpoint(before ?? '', after);
}

export function compareOrder(left: { order: string; id: string }, right: { order: string; id: string }): number {
  if (left.order !== right.order) {
    return left.order < right.order ? -1 : 1;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
