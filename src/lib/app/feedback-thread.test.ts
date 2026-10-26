import { describe, expect, it } from 'vitest';
import type { FeedbackThread } from '@/lib/feedback';
import {
  FEEDBACK_TITLE_MAX_CHARACTERS,
  feedbackTitle,
  repliesLabel,
  sentLabel,
  threadMessages,
  threadWhen,
} from './feedback-thread';

const now = new Date(2026, 9, 26, 15, 0);

function at(day: number, hours: number, minutes = 0): string {
  return new Date(2026, 9, day, hours, minutes).toISOString();
}

describe('feedbackTitle', () => {
  it('takes the first line that has text', () => {
    expect(feedbackTitle('\n  Dark mode on unlock  \nMore detail')).toBe('Dark mode on unlock');
  });

  it('cuts a long first line at the limit with an ellipsis', () => {
    const title = feedbackTitle('a'.repeat(FEEDBACK_TITLE_MAX_CHARACTERS + 20));
    expect(Array.from(title)).toHaveLength(FEEDBACK_TITLE_MAX_CHARACTERS + 1);
    expect(title.endsWith('…')).toBe(true);
    expect(feedbackTitle('😀'.repeat(FEEDBACK_TITLE_MAX_CHARACTERS))).toBe('😀'.repeat(FEEDBACK_TITLE_MAX_CHARACTERS));
  });

  it('falls back to a plain heading for an empty message', () => {
    expect(feedbackTitle('  \n ')).toBe('Feedback');
  });
});

describe('repliesLabel', () => {
  it('counts replies', () => {
    expect(repliesLabel(0)).toBe('No replies yet');
    expect(repliesLabel(1)).toBe('1 reply');
    expect(repliesLabel(2)).toBe('2 replies');
  });
});

describe('threadWhen and sentLabel', () => {
  it('names today and yesterday and gives a date after that', () => {
    expect(threadWhen(at(26, 9, 12), now)).toMatch(/^Today, /);
    expect(threadWhen(at(25, 18, 40), now)).toMatch(/^Yesterday, /);
    expect(threadWhen(at(20, 18, 40), now)).not.toMatch(/^(Today|Yesterday)/);
    expect(threadWhen('not a date', now)).toBe('');
  });

  it('says when it was sent', () => {
    expect(sentLabel(at(25, 18), now)).toBe('Sent yesterday');
    expect(sentLabel(at(26, 8), now)).toBe('Sent today');
    expect(sentLabel(at(2, 8), now)).toMatch(/^Sent \d/);
  });
});

describe('threadMessages', () => {
  const thread: FeedbackThread = {
    id: 'f1',
    message: 'Too bright at night',
    createdAt: at(25, 18, 40),
    replies: [
      { id: 'r1', author: 'team', message: 'Thank you', createdAt: at(26, 9, 12) },
      { id: 'r2', author: 'user', message: 'Great', createdAt: at(26, 10, 0) },
    ],
  };

  it('puts the sender\'s message first, then each reply under its author', () => {
    const messages = threadMessages(thread, 'maria', now);

    expect(messages.map((message) => message.author)).toEqual(['user', 'team', 'user']);
    expect(messages[0]).toMatchObject({ name: 'You', initial: 'M', message: 'Too bright at night' });
    expect(messages[1]).toMatchObject({ name: 'Zekke team', initial: 'Z' });
    expect(messages[2]).toMatchObject({ name: 'You', initial: 'M' });
  });

  it('uses the first letter of the name or Y when there is none', () => {
    expect(threadMessages(thread, undefined, now)[0].initial).toBe('Y');
    expect(threadMessages(thread, '  ', now)[0].initial).toBe('Y');
  });
});
