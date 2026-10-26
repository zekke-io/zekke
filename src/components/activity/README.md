# `components/activity`

The Activity screen, opened by the clock in the top bar. It has three pills: *Notifications*, *Feedback* and *Recent*. The pill in use is kept by the shell (`activityTab` of `ShellNavigation`), so *Back* from a feedback thread returns to *Feedback*.

| File | Role |
| --- | --- |
| `ActivityScreen.tsx` | The two pills and their lists |
| `NotificationsProvider.tsx` | Wraps the shell. Owns the unread count (read on mount, every five minutes and when the window regains focus), the loaded notifications and their paging |
| `useRecentItems.ts` | The *Recent* list: reads the feed replicas, decrypts the names of the newest items and hands them to `recentEntries` (`lib/app/activity.ts`) |

## Notifications

**A reply to your feedback is not a row here.** Every `feedback_replied` notification is left out of this pill, however many arrive; they belong to the *Feedback* pill, under the conversation they answer. A row is a tile with the kind's icon, the title and sentence from `notificationView`, and either one
button or the age. The button exists for the kinds that have somewhere to go: *See plans* opens the
Plan tab of Settings, *Open Drive* and *Open Shared* change section. Opening the pill loads the
newest page and marks what it showed as read, so the dot on the clock goes out; the orange number on
the pill is how many were unread when the page loaded, and stays until the next load. **A rising
count re-reads `GET /users/me`**, because plan notices change what the account may do. Polling
failures are silent. **While the Notifications pill is open the count is read every 10 s and when the
tab becomes visible, and a count above zero re-reads the list**, so a notification that arrives is shown
without leaving the screen; the bell's own five-minute poll keeps running everywhere else.

## Feedback

One row per conversation, newest activity first (`GET /feedback`, [`lib/feedback`](../../lib/feedback/README.md)):
the title (first line of what you sent), a one-line preview of the latest message with who wrote it
(*Zekke team* or *You*), how long ago, and the number of replies. A row opens the thread
([`components/feedback`](../feedback/README.md)). Replies never add rows: a second, third or tenth answer
changes the preview, the age and the count of the same row, and moves it to the top.

An orange dot and the number on the pill come from the unread `feedback_replied` notifications, grouped by
their `feedback_id` (`unreadByFeedback`, `lib/app/activity.ts`). Showing the Notifications pill does **not**
mark them read; opening the thread does (`markFeedbackRead` in `NotificationsProvider`), so the dot stays
until the conversation is read. Only the newest 50 notifications are consulted for that, read fresh when the thread opens, so a reply that arrives while the thread is open is marked read as soon as the thread shows it (and once more on the next refresh, in case the notification trailed the reply); the dot then goes out without leaving the thread.

## Recent

The twelve newest notes, passwords, secrets, documents and spreadsheets the device holds, by the
time they last changed (a password's is its newest revision). Names are decrypted here, so the
list only shows what this device can read; an item that cannot be opened is left out. Documents
and spreadsheets cost a read of their snapshot for the title, so only the twelve newest are opened.
A row opens the item's section. The list reloads when the feed brings a change to one of the four
scopes and when the tab becomes visible again.

A scope this device does not hold contributes nothing. Files, calendar and diary are not listed.
