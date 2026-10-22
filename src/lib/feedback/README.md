# `feedback`

The client of `POST /feedback` ([front-end-endpoints.md § 28](../../../front-end-endpoints.md#28-feedback-endpoint)):
a short message to the Zekke team. The server takes the account from the token, so the body is the
message and nothing else, and the screen must never put anything identifying in it. The words around
it are in [`lib/app/feedback.ts`](../app/feedback.ts) and the dialog is
[`components/shell/FeedbackButton.tsx`](../../components/shell/README.md).

| Export | |
| ------ | - |
| `sendFeedback(context, message)` | Trims the message, refuses one that is empty or longer than 1000 characters before any request, posts it with the session token and returns `{ id, createdAt }` |
| `feedbackCharacters(message)`, `isSendableFeedback(message)` | The length the server counts: characters (code points) after trimming, 1 to `MAX_FEEDBACK_CHARACTERS` (1000) |

Nothing here is sealed: a feedback is plain text written to be read. It needs only the token
(`TokenContext`), not the keystore. The id is not kept; the answer, when one is built, will arrive as
a notification.
