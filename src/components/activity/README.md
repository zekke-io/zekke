# `components/activity`

The Activity screen, opened by the clock in the top bar. It has two pills: *Notifications* and *Recent*.

| File | Role |
| --- | --- |
| `ActivityScreen.tsx` | The two pills and their lists |
| `NotificationsProvider.tsx` | Wraps the shell. Owns the unread count (read on mount, every five minutes and when the window regains focus), the loaded notifications and their paging |
| `useRecentItems.ts` | The *Recent* list: reads the feed replicas, decrypts the names of the newest items and hands them to `recentEntries` (`lib/app/activity.ts`) |

## Notifications

A row is a tile with the kind's icon, the title and sentence from `notificationView`, and either one
button or the age. The button exists for the kinds that have somewhere to go: *See plans* opens the
Plan tab of Settings, *Open Drive* and *Open Shared* change section. Opening the pill loads the
newest page and marks what it showed as read, so the dot on the clock goes out; the orange number on
the pill is how many were unread when the page loaded, and stays until the next load. **A rising
count re-reads `GET /users/me`**, because plan notices change what the account may do. Polling
failures are silent.

## Recent

The twelve newest notes, passwords, secrets, documents and spreadsheets the device holds, by the
time they last changed (a password's is its newest revision). Names are decrypted here, so the
list only shows what this device can read; an item that cannot be opened is left out. Documents
and spreadsheets cost a read of their snapshot for the title, so only the twelve newest are opened.
A row opens the item's section. The list reloads when the feed brings a change to one of the four
scopes and when the tab becomes visible again.

A scope this device does not hold contributes nothing. Files, calendar and diary are not listed.
