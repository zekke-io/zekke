import { describe, expect, it } from 'vitest';
import { FEEDBACK_COPY, feedbackDraft } from './feedback';

describe('feedbackDraft', () => {
  it('cannot send nothing, or while a send is under way', () => {
    expect(feedbackDraft('', false).canSend).toBe(false);
    expect(feedbackDraft('  ', false).canSend).toBe(false);
    expect(feedbackDraft('hello', false).canSend).toBe(true);
    expect(feedbackDraft('hello', true).canSend).toBe(false);
  });

  it('counts what is left of the thousand characters', () => {
    expect(feedbackDraft('hello', false).charactersLeft).toBe(995);
    expect(feedbackDraft('a'.repeat(1001), false)).toEqual({ canSend: false, charactersLeft: -1 });
  });

  it('words the count in the singular', () => {
    expect(FEEDBACK_COPY.charactersLeft(1)).toBe('1 character left');
    expect(FEEDBACK_COPY.charactersLeft(995)).toBe('995 characters left');
  });
});
