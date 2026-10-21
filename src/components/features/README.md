# `components/features` — Turning on features added after the account

| File | What it is |
| --- | --- |
| `NewFeaturesScreen.tsx` | Shown in place of Calendar, To-do or Diary on a full device that does not hold the scope yet. It says why the recovery phrase is needed, takes the phrase (and the account PIN on a Paranoid account) and calls `openNewKeyrings` |

An account created before a scope existed has no keyring for it. The root opens it with one `keyring-open`
event that gives it to every full device ([ADR 00027](../../../../api-general/docs/adr/00027_opening_a_new_scope_on_existing_accounts.md)),
so the phrase is typed once, only to use the new features, and everything the account already had keeps
working without it. A limited device (the extension) is told to do it from a full device. A browser that
is open on another device gets the scopes the next time it is unlocked: the unlock reads them from the
verified chain.
