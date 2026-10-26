import { assertCanonicalUuid, request } from '@/lib/api';
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

export type FeedbackAuthor = 'team' | 'user';

export interface FeedbackReply {
  id: string;
  author: FeedbackAuthor;
  message: string;
  createdAt: string;
}

export interface FeedbackSummary {
  id: string;
  message: string;
  lastMessage: string;
  lastAuthor: FeedbackAuthor;
  replyCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface FeedbackPage {
  feedback: FeedbackSummary[];
  nextCursor?: string;
}

interface FeedbackListing {
  feedback: {
    id: string;
    message: string;
    last_message: string;
    last_author: string;
    reply_count: number;
    created_at: string;
    last_activity_at: string;
  }[];
}

export interface FeedbackThread {
  id: string;
  message: string;
  createdAt: string;
  replies: FeedbackReply[];
}

interface ThreadBody {
  id: string;
  message: string;
  created_at: string;
  replies?: { id: string; author: string; message: string; created_at: string }[];
}

export async function readFeedbackThread(context: TokenContext, id: string): Promise<FeedbackThread> {
  const response = await request<ThreadBody>({
    method: 'GET',
    path: `/feedback/${assertCanonicalUuid(id, 'feedback id')}`,
    token: requireToken(context),
    timeoutMs: context.timeoutMs,
  });

  return {
    id: response.data.id,
    message: response.data.message,
    createdAt: response.data.created_at,
    replies: (response.data.replies ?? []).map((reply) => ({
      id: reply.id,
      author: reply.author === 'user' ? 'user' : 'team',
      message: reply.message,
      createdAt: reply.created_at,
    })),
  };
}

export async function answerFeedback(context: TokenContext, id: string, message: string): Promise<SentFeedback> {
  if (!isSendableFeedback(message)) {
    throw new Error(`reply must be 1 to ${MAX_FEEDBACK_CHARACTERS} characters`);
  }

  const response = await request<FeedbackReceipt>({
    method: 'POST',
    path: `/feedback/${assertCanonicalUuid(id, 'feedback id')}/replies`,
    body: { message: message.trim() },
    token: requireToken(context),
    timeoutMs: context.timeoutMs,
  });

  return { id: response.data.id, createdAt: response.data.created_at };
}

export async function listFeedback(
  context: TokenContext,
  options: { limit?: number; cursor?: string } = {},
): Promise<FeedbackPage> {
  const response = await request<FeedbackListing>({
    method: 'GET',
    path: '/feedback',
    token: requireToken(context),
    query: { limit: options.limit, cursor: options.cursor },
    timeoutMs: context.timeoutMs,
  });

  const page = response.page;
  return {
    feedback: (response.data?.feedback ?? []).map((item) => ({
      id: item.id,
      message: item.message,
      lastMessage: item.last_message,
      lastAuthor: item.last_author === 'team' ? 'team' : 'user',
      replyCount: item.reply_count,
      createdAt: item.created_at,
      lastActivityAt: item.last_activity_at,
    })),
    nextCursor: page?.has_more === true ? page.next_cursor : undefined,
  };
}
