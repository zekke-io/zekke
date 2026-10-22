import { feedbackCharacters, isSendableFeedback, MAX_FEEDBACK_CHARACTERS } from '@/lib/feedback';

export const FEEDBACK_COPY = {
  open: 'Send feedback',
  title: 'Feedback',
  question: 'What would make Zekke better?',
  placeholder: 'Tell us what you think',
  privacy: 'Only this message is sent. Your files stay locked.',
  send: 'Send',
  sending: 'Sending…',
  cancel: 'Cancel',
  thanksTitle: 'Thank you',
  thanks: 'Your message reached the Zekke team.',
  done: 'Done',
  charactersLeft: (left: number) => (left === 1 ? '1 character left' : `${left} characters left`),
} as const;

export interface FeedbackDraft {
  canSend: boolean;
  charactersLeft: number;
}

export function feedbackDraft(message: string, busy: boolean): FeedbackDraft {
  return {
    canSend: !busy && isSendableFeedback(message),
    charactersLeft: MAX_FEEDBACK_CHARACTERS - feedbackCharacters(message),
  };
}
