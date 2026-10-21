# `lib/diary` — the diary

The diary's entries as sealed rows of the `diary` scope ([`lib/records`](../records/README.md)). A
separate scope, so a limited client can be given the calendar without the diary
([ADR 00025](../../../../api-general/docs/adr/00025_calendar_and_diary_scopes.md)).

An entry is one payload, `{ version: 1, type: 'entry', date, text }`: the date is inside the
ciphertext and the row id is random. **Two entries on one day are two rows**: a device that writes on a
day where another already did does not overwrite it, and the screen shows both under that day.
`entryPayload` refuses an impossible date, a text over 20 000 characters and a payload over 90 000
bytes; `parseEntry` skips what a peer wrote badly, and `loadDiary` counts it as *unreadable* instead of
failing the others.

`loadDiary` reads the feed, opens every entry (eight at a time) and arranges them newest day first, and
within a day in the order they were written. `saveEntry` creates or replaces; `removeEntries` is one
signed delete.

The screen (`components/diary`) saves while the person types, 800 ms after the last key, and again on
*Back*; it never creates an empty entry.
