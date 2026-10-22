import { request } from '@/lib/api';
import { requireToken, type TokenContext } from '@/lib/context';

export const MAX_FEEDBACK_CHARACTERS = 1000;

export interface SentFeedback {
  id: string;
  createdAt: string;
}

interface FeedbackReceipt {
  id: string;
  created_at: string;
}

export function feedbackCharacters(message: string): number {
  return Array.from(message.trim()).length;
}

export function isSendableFeedback(message: string): boolean {
  const characters = feedbackCharacters(message);
  return characters >= 1 && characters <= MAX_FEEDBACK_CHARACTERS;
}

export async function sendFeedback(context: TokenContext, message: string): Promise<SentFeedback> {
  if (!isSendableFeedback(message)) {
    throw new Error(`feedback must be 1 to ${MAX_FEEDBACK_CHARACTERS} characters`);
  }

  const response = await request<FeedbackReceipt>({
    method: 'POST',
    path: '/feedback',
    body: { message: message.trim() },
    token: requireToken(context),
    timeoutMs: context.timeoutMs,
  });

  return { id: response.data.id, createdAt: response.data.created_at };
}
