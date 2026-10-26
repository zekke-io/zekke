# `components/feedback`

The thread of one feedback: what the person sent, what the Zekke team answered and what they wrote
back. It is opened from a row of the *Feedback* pill of the Activity screen
([`components/activity`](../activity/README.md)), never from the sidebar: *Feedback* is a hidden entry
of `NAV_ITEMS`, and the id comes through `openFeedback(id)` / `feedbackId` of `ShellNavigation`.

| File | Role |
| --- | --- |
| `FeedbackThreadScreen.tsx` | *Back* to Activity, the number of replies and when it was sent, the title, the messages and the reply form |

## What it shows

- The title is the first line of the message (`feedbackTitle`, `lib/app/feedback-thread.ts`); the
  server keeps no title.
- Messages are oldest first: the person's own message, then every reply. A reply by the team is a card
  with a violet **Z**; the person's own are tinted with the first letter of their username and the name
  *You*. Text is plain: line breaks kept, never HTML or markdown.
- *Send reply* posts to the thread (`answerFeedback`, `lib/feedback`) under the same rules as the first
  message: 1 to 1000 characters and the per-account rate limit, whose reason is shown above the field.
  Afterwards the thread is read again, so the reply appears with the server's time.
- The thread re-reads itself every 10 s while the tab is visible, so an answer appears while it is open, and
  opening it marks the unread replies of this conversation as read.
- The form says what the sheet says: the team reads this, so no passwords or recovery phrase.

A thread that cannot be read (deleted, someone else's, or the server is down) shows one message and
no form. The API answers `404` for both of the first two, so the screen cannot tell them apart and
does not try.
