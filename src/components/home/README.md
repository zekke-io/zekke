# `components/home`

The Home screen: the first entry in the sidebar and the screen the app opens on after unlocking.
It shows every section this browser can open as an app icon, the way a phone's home screen does,
and a tap opens that section.

| File | Role |
| --- | --- |
| `HomeScreen.tsx` | The icon grid |
| `FeatureIcons.tsx` | The eleven feature tiles, one component each |
| `HomeStorage.tsx` | The storage summary above the icons: used, free, and how many files |

## Where the icons come from

The tiles are the *Feature icons* board of the Zekke File Icons design: a rounded square in the
feature's own colour with a soft highlight on top, a cream shape knocked into it and a small shadow
beneath. They are **copied in as React components, not imported or fetched**: `web-app` depends on no
other module in the workspace ([CLAUDE.md](../../../../CLAUDE.md)), and an inline SVG needs no `img-src`
entry in the Content Security Policy.

| Section | Tile | Colour |
| --- | --- | --- |
| Vault | a dial | violet |
| Passwords | a key | orange |
| Notes | a tilted note | amber |
| Documents | a page with a pencil | blue |
| Spreadsheets | a grid | green |
| Drive | a folder with a padlock | bright orange |
| Calendar | a calendar with rings | red |
| To-do | a checked list | purple |
| Diary | a book with a bookmark | brown |
| Shared | two people and a padlock | teal |
| Trash | a bin | grey-brown |

Each tile carries its own colours, so a palette change does not reach them, and each is the whole
tile: the grid draws no card behind it. Which tile belongs to which section is the `appIcon` field
of the section's entry in `NAV_ITEMS` (`components/shell/AppShell.tsx`). The sidebar and the lists
keep their line icons and the shared `FileTypeIcon`s. **A section with no `appIcon` is not on
Home** — Home itself has none.

## What it shows

- **Only the sections this browser holds.** The shell passes its already scope-filtered
  navigation through `ShellNavigation` (`components/shell/ShellNavigation.tsx`), the same list the
  sidebar draws, so a device without the `files` scope has no Drive icon here either.
- **The tile is the phone's shape**: the feature's tile with the label underneath. It lifts on
  hover and presses in on tap. 64px on a phone, 80px from `sm` up; the grid is `auto-fill`, so it
  wraps to however many fit.
- **The section's description is the tooltip**, the same sentence the top bar shows once it is
  open.

## The storage summary

At the top of Home, above the icons, on a browser that holds the `files` scope, three figures and a bar:

| Figure | What it is | Where it comes from |
| --- | --- | --- |
| **Used** | what the drive holds, and its share of the ceiling | `stored_bytes` over `quota_bytes` (`storageBar`, `usedShareLabel`) |
| **Free** | what the next upload may still take | `quota_bytes − used_bytes` (`freeBytes`) |
| **Files** | how many files the user has | counted here (`countStoredFiles`), **not** `file_count` |

The bar is the sidebar's `StorageMeter` bar, larger: stored bytes solid, reservations behind them.

- **Used and Free are deliberately not complements.** Used is `stored_bytes`, the files that exist,
  as the bar shows. Free subtracts `used_bytes`, which also counts unfinished uploads, because that
  is the number `POST /files` checks: a Free computed from `stored_bytes` would promise room an
  upload is then refused. When the two differ, the line under Free says how much the unfinished
  uploads hold, instead of *Ready for new files*. The reasoning behind the two sums is under
  [the storage reading](../../lib/app/README.md#the-storage-reading-and-why-two-numbers).
- **`file_count` is not the number of files.** The API counts every live row, and a thumbnail is a
  file row of its own ([Thumbnails are files](../../lib/files/README.md#thumbnails-are-files)), as is
  an upload that never finished — a drive of ten photos reports twenty. So Home lists the drive,
  opens each manifest to learn which rows are thumbnails, and counts the stored rows that are not:
  the same rule the drive grid applies when it hides thumbnails. Opening a manifest decrypts a few
  hundred bytes from the listing, with no object fetched from storage.
- **The reading is refreshed each time Home opens** and published to the shared `lib/app/usage`
  store, so the sidebar meter moves with it. The count shows `…` until it arrives.
- **A deployment without the drive shows no summary**, as the sidebar shows no meter: the drive
  being switched off is not an error to report on Home.


## Accounts created before Calendar, To-do and Diary

A full device that does not hold `calendar` or `diary` shows their icons anyway: the screen behind them is the *Turn on* screen of [`components/features`](../features/README.md).
