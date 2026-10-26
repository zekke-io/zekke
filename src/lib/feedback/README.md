# `feedback`

The client of the feedback routes ([front-end-endpoints.md § 28](../../../front-end-endpoints.md#28-feedback-endpoint)):
a short message to the Zekke team. The server takes the account from the token, so the body is the
message and nothing else, and the screen must never put anything identifying in it. The words around
it are in [`lib/app/feedback.ts`](../app/feedback.ts) and the dialog is
[`components/shell/FeedbackButton.tsx`](../../components/shell/README.md).

| Export | |
| ------ | - |
| `sendFeedback(context, message)` | Trims the message, refuses one that is empty or longer than 1000 characters before any request, posts it with the session token and returns `{ id, createdAt }` |
| `listFeedback(context, { limit?, cursor? })` | `GET /feedback`: the sender's own feedback, one item per conversation, newest activity first: `{ id, message, lastMessage, lastAuthor, replyCount, createdAt, lastActivityAt }` and the next cursor. The *Feedback* pill of Activity is this list |
| `readFeedbackThread(context, id)` | `GET /feedback/{id}`: the sender's own message and its replies, oldest first, each with its `author` (`team` or `user`; an unknown author is read as `team`). Another account's feedback is a `404`, the same as an unknown id |
| `answerFeedback(context, id, message)` | `POST /feedback/{id}/replies`: the sender answers in the thread, under the same 1 to 1000 character rule and per-account rate limit as `sendFeedback`. It sends no notification |
| `feedbackCharacters(message)`, `isSendableFeedback(message)` | The length the server counts: characters (code points) after trimming, 1 to `MAX_FEEDBACK_CHARACTERS` (1000) |

Nothing here is sealed: a feedback is plain text written to be read. It needs only the token
(`TokenContext`), not the keystore. The id of a sent feedback is not kept. A reply from the team arrives as a
`feedback_replied` notification whose `params` carry `feedback_id` and the reply; the Activity screen
uses that id to open the thread ([`components/feedback`](../../components/feedback/README.md)).
