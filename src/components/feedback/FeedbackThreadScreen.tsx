'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { answerFeedback, readFeedbackThread, type FeedbackThread } from '@/lib/feedback';
import {
  FEEDBACK_COPY,
  FEEDBACK_THREAD_COPY,
  feedbackDraft,
  feedbackTitle,
  repliesLabel,
  sentLabel,
  threadMessages,
} from '@/lib/app';
import { MAX_FEEDBACK_CHARACTERS } from '@/lib/feedback';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';
import { useNotifications } from '@/components/activity/NotificationsProvider';
import { useShellNavigation } from '@/components/shell/ShellNavigation';
import { Badge, Button, Notice, Spinner, TextArea } from '@/components/ui';
import { ArrowLeftIcon } from '@/components/ui/icons';

const THREAD_REFRESH_MS = 10_000;

export default function FeedbackThreadScreen() {
  const context = useAuthedContext();
  const { account, reportError } = useZekke();
  const { open, feedbackId, setActivityTab } = useShellNavigation();
  const { markFeedbackRead } = useNotifications();
  const markRead = useRef(markFeedbackRead);
  const readOnce = useRef(false);
  const repliesRead = useRef(0);
  const recheck = useRef(0);

  useEffect(() => {
    markRead.current = markFeedbackRead;
  }, [markFeedbackRead]);
  const [thread, setThread] = useState<FeedbackThread>();
  const [failed, setFailed] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const load = useCallback(async () => {
    if (feedbackId === undefined) {
      return;
    }
    try {
      const read = await readFeedbackThread(context, feedbackId);
      setThread(read);
      setFailed(false);
      const changed = !readOnce.current || read.replies.length !== repliesRead.current;
      if (changed || recheck.current > 0) {
        void markRead.current(feedbackId);
      }
      recheck.current = changed ? 1 : Math.max(0, recheck.current - 1);
      readOnce.current = true;
      repliesRead.current = read.replies.length;
    } catch {
      if (!readOnce.current) {
        setFailed(true);
      }
    }
  }, [context, feedbackId]);

  useEffect(() => {
    readOnce.current = false;
    setThread(undefined);
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };
    const timer = window.setInterval(refresh, THREAD_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  const draft = feedbackDraft(reply, busy);

  async function send() {
    if (feedbackId === undefined || !draft.canSend) {
      return;
    }
    setBusy(true);
    setProblem(undefined);
    try {
      await answerFeedback(context, feedbackId, reply);
      setReply('');
      await load();
    } catch (error) {
      setProblem(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  const now = new Date();
  const messages = thread === undefined ? [] : threadMessages(thread, account?.username, now);
  const replies = thread?.replies.length ?? 0;

  return (
    <div className="flex max-w-[53.75rem] flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary" onClick={() => {
            setActivityTab('feedback');
            open('activity');
          }}>
          <ArrowLeftIcon className="h-4 w-4 shrink-0" />
          {FEEDBACK_THREAD_COPY.back}
        </Button>
        {thread !== undefined ? (
          <div className="flex items-center gap-2">
            <Badge>{repliesLabel(replies)}</Badge>
            <span className="text-[0.8125rem] font-semibold text-ink-muted">{sentLabel(thread.createdAt, now)}</span>
          </div>
        ) : null}
      </div>

      {thread === undefined && !failed ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : null}
      {failed ? <Notice tone="danger">{FEEDBACK_THREAD_COPY.failed}</Notice> : null}

      {thread !== undefined ? (
        <>
          <h2 className="text-2xl font-black tracking-tight text-ink">{feedbackTitle(thread.message)}</h2>

          <ol className="flex flex-col gap-3.5">
            {messages.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black ${entry.author === 'user' ? 'bg-brand-500 text-on-brand' : 'bg-accent-500 text-on-accent'}`}
                >
                  {entry.initial}
                </span>
                <div
                  className={`flex min-w-0 grow flex-col gap-2 rounded-3xl px-5 py-4 ${entry.author === 'user' ? 'bg-brand-100' : 'bg-surface'}`}
                >
                  <div className="flex justify-between gap-3">
                    <span className="text-base font-black text-ink">{entry.name}</span>
                    <span className="text-[0.8125rem] font-semibold text-ink-muted">{entry.when}</span>
                  </div>
                  <p className="whitespace-pre-line break-words text-base font-semibold leading-relaxed text-ink">
                    {entry.message}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="flex flex-col gap-3 rounded-[1.75rem] bg-surface px-5 py-4"
          >
            {problem ? <Notice tone="danger">{problem}</Notice> : null}
            <TextArea
              plain
              label={FEEDBACK_THREAD_COPY.replyLabel}
              placeholder={FEEDBACK_THREAD_COPY.replyPlaceholder}
              rows={3}
              maxLength={MAX_FEEDBACK_CHARACTERS}
              value={reply}
              disabled={busy}
              hint={FEEDBACK_COPY.charactersLeft(draft.charactersLeft)}
              onChange={(event) => setReply(event.target.value)}
              className="h-24"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[0.8125rem] font-semibold text-ink-muted">{FEEDBACK_THREAD_COPY.privacy}</span>
              <Button type="submit" disabled={!draft.canSend}>
                {busy ? FEEDBACK_THREAD_COPY.sending : FEEDBACK_THREAD_COPY.send}
              </Button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
