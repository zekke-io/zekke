# `lib/calendar` — events and tasks as sealed records

The pure part of the calendar and to-do features: time, recurrence, the payloads of an event and a
task, reminders and `.ics`. Framework-free and offline; it never touches the network, the keys or
the storage. **Why** the calendar is a scope of sealed rows and not a document is
[ADR 00025](../../../../api-general/docs/adr/00025_calendar_and_diary_scopes.md). Storing, syncing
and the screens are Task 162's later steps and will sit beside this module.

## Files

| File | Role |
| --- | --- |
| `ids.ts` | Random 10-character ids |
| `order.ts` | Fractional order keys: a reorder is one field write |
| `time.ts` | All-day and timed moments, IANA zones, instants, weekdays, date arithmetic |
| `recurrence.ts` | The supported rule subset, its validation and `occurrenceDates` |
| `events.ts` | `eventPayload` and `parseEvent`, validation, per-occurrence overrides, `expandEvents` |
| `tasks.ts` | `taskPayload` and `parseTask`, and `listPayload` and `parseList` for to-do lists |
| `reminders.ts` | `planReminders`: what the device should schedule, with no content |
| `ics.ts` | `exportIcs` and `importIcs`, with the report of what was left behind |

## Payloads

A row of the `calendar` scope seals one JSON object; `type` says which. The server never sees it.

```
event   { version: 1, type: 'event', title, notes, location,
          start, end            { date } (all day, end exclusive) or { dateTime: 'YYYY-MM-DDTHH:mm', tz }
          recurrence?           { frequency, interval, weekdays?, monthDay?, weekdayPosition?, count? | until? }
          overrides             original date -> { cancelled? | title?, notes?, location?, start?, end? }
          reminders }           minutes before the start, at most 5, at most 28 days

task    { version: 1, type: 'task', title, notes, order, reminders,
          list?, due?, doneAt? }

list    { version: 1, type: 'list', name, order }
```

**A payload is at most 90 000 bytes of UTF-8 JSON** (`requirePayloadFits`, checked on every write), which seals to under 131 072 base64 characters, the server's cap; notes are at most 10 000 characters, a title 300 and a place 500, and an event keeps at most 200 changed occurrences. Every writer validates and every reader checks every value, so a record a peer wrote badly is skipped
and never stops the others from opening. A writer refuses what a reader would refuse.

## Recurrence

Daily, weekly (with weekdays), monthly (a day, or the first to fourth or last weekday) and yearly,
with an interval and a count or an end date. Months without the day (31st, 29 February) are skipped,
as RFC 5545 does. A rule outside this subset is refused by `parseRecurrence`, and an imported one is
listed in the import report.

## Reminders

`planReminders` returns at most 60 reminders in the next 14 days, each a key, a kind (`event` or
`task`) and a time. **It never carries a title, place or text**: the notification says only *You have
an event* or *A task is due*. A device calls it when the app opens and after each sync and replaces
what it scheduled. A device that has not been opened cannot schedule; the product says so.

## `.ics`

Export writes events (with overrides as `RECURRENCE-ID` components and cancellations as `EXDATE`),
tasks and reminders. Import reads them back and reports what it left behind: a repeat outside the
subset, a time zone that is not an IANA name (Outlook's Windows names), an event with no readable
start, a file over 2 MB or 5000 items.

## Tests

`calendar.test.ts` covers the order keys, zones and daylight saving, every recurrence shape, the
payload round trips and refusals, reminders and the `.ics` round trip, a file from another
application and every refusal.
