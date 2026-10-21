# `lib/records` — sealed rows of the calendar and the diary

The client of the `calendar` and `diary` scopes, which the API serves as two sets of identical routes
built like notes ([`records` domain](../../../../api-general/internal/domain/records/README.md),
[ADR 00025](../../../../api-general/docs/adr/00025_calendar_and_diary_scopes.md)). A record is a JSON
payload sealed under its own random DEK, wrapped under the scope's KEK of the current generation.

| Function | What it does |
| --- | --- |
| `createRecord(context, scope, payload, { id? })` | `POST`, with a client-generated id so a retry is safe; `created` says `201` from `200` |
| `updateRecord(context, scope, record, payload)` | `PUT`: re-seals under the stored DEK, re-wrapping only if the stored wrap is of an older generation. **Last writer wins** |
| `openRecord(context, scope, record)` | Opens a record's payload as JSON |
| `listRecordsMeta(context, scope)` | The paged metadata, which `lib/rekey` reads to find what a rotation left behind |
| `deleteRecords(context, scope, ids)` | One signed `calendar-delete` or `diary-delete` over the sorted, de-duplicated ids |

A payload that seals to more than 131 072 base64 characters is refused here, before any request
(`RecordTooLargeError`); the modules that build payloads (`lib/calendar`, `lib/diary`) keep them under
90 000 bytes, so a normal record never reaches it. Reading the list of records is not here: a screen reads
them through the change feed (`feedCalendar`, `feedDiary`), which keeps the replica of
[`lib/feed`](../feed/README.md).

Neither scope is a sharing item type, and the diary is never shared.
