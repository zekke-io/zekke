# `components/diary` — Diary

`DiaryScreen.tsx`: a *How was your day?* card for today, the entries grouped by month with the day and a
preview, and an editor that opens one entry on its day. The text is written through the same private-text
props as every field (`PRIVATE_TEXT_PROPS`); it saves while typing and says *Saved*, *Saving…* or *Not
saved yet*. Deleting an entry asks first and cannot be undone. The data module is
[`lib/diary`](../../lib/diary/README.md).
