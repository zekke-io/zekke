# `components/calendar` — Calendar and To-do

Two screens over one set of sealed rows (`calendar` scope, [`lib/calendar`](../../lib/calendar/README.md)):
the clients present events and tasks as two features, as the design does.

| File | What it is |
| --- | --- |
| `CalendarScreen.tsx` | A month grid with a dot on every day that has an event, and the selected day's agenda. *New event*, edit, delete, `.ics` import and export, and *Turn on reminders* |
| `EventModal.tsx` | The event form: title, all day, date, starts, ends, repeat, reminder, notes |
| `ScopeModal.tsx` | *Only this event* or *All events in the series*, asked before saving or deleting a repeating event |
| `TodoScreen.tsx` | *All*, *Today* and one chip per list; *To do* and *Done*; check a task off, move it up or down, add, edit and delete tasks and lists |
| `useReminders.ts` | The permission, and the scheduler the shell runs while a tab is open |

## Reminders

A reminder is a browser notification scheduled with a timer **while Zekke is open and unlocked**, for the
next 14 days, at most 60. It says only *You have an event* or *A task is due*, never a title, a place or a
time ([ADR 00025](../../../../api-general/docs/adr/00025_calendar_and_diary_scopes.md)). It cannot fire
while the tab is closed or the app is locked, and the screens say so. The permission is asked only by the
*Turn on reminders* button, never on load.

## Repeating events

Editing or deleting one occurrence of a repeating event asks which: *only this event* writes an override
for that day inside the event, *all events* changes the series (moving it by the days the occurrence
moved, and clearing the changed days when it moved). The rules are in `lib/calendar/form.ts` and tested
there.

## Not here

Sharing a calendar, recurring tasks, and any sync with another calendar service: they need a server that
reads events, or a model this one does not have.
