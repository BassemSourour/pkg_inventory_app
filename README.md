# Packaging Inventory Logger

Windows desktop app for running a packaging inventory count at Reunion Coffee
Roasters. Counts are collected on any device on the local network and written
back into the original Excel workbook on export.

It runs as a normal desktop program on the host computer — its own window, its
own taskbar icon, no browser involved — while serving the same count screen to
tablets and phones over Wi-Fi. It installs without an administrator password
and needs no Python on the host.

## Installing

Run `PackagingInventoryLogger-Setup-<version>.exe` and follow the prompts.

- Installs for the current Windows user only, so **no admin password is
  needed**. It lands in `%LOCALAPPDATA%\Programs\Packaging Inventory Logger`.
- Adds a Start Menu entry, and a desktop shortcut if you tick the box.
- Uninstall from **Settings → Apps**, or the Start Menu shortcut. Uninstalling
  asks whether to delete your saved counts; answer No to keep them for a
  future install.

**First launch shows a Windows Firewall prompt.** Tick *Private networks* and
click **Allow access**, or tablets will not be able to connect. If it gets
dismissed by accident, re-allow the app under Windows Defender Firewall →
Allow an app through firewall.

Because the app is not code-signed, SmartScreen may show "Windows protected
your PC" the first time. Click **More info → Run anyway**.

## How a count session works

1. **Load the workbook.** An admin uploads the inventory `.xlsx`. The app
   reads it and imports every item into a local SQLite database.
2. **Count.** Anyone on the same network opens the app (via the on-screen QR
   code) and searches for an item, then records a count. Multiple counts can
   be recorded against the same item — they add up.
3. **Review.** The *View Zero Counts* list shows every item nobody has
   counted yet, so nothing is missed.
4. **Export.** An admin downloads `updated_inventory.xlsx`, which is the
   original workbook with the `counted` column filled in.

The uploaded workbook is never edited in place. It is the source for the
import and the template for the export.

## Features

### Counting

- **Live search** by item number or product name, with exact matches ranked
  first. Keyboard navigation with arrow keys and Enter.
- **Multiple entries per item.** Each count is saved as its own timestamped
  entry. An item's total is the sum of its entries, so a pallet can be
  counted in several passes without mental arithmetic.
- **Edit or delete any entry** after the fact from *Edit Entries* on the
  selected item.
- **"Still holding the same material?"** shortcut jumps straight back to the
  item you just counted — for when there are several of the same box in front
  of you.
- **Zero-count review** lists every item with no counts recorded.
- **Stray-tap shield** briefly ignores taps right after a screen change, so a
  double-tap on a tablet does not fire the next screen's button.

### Items not in the workbook

Items found on the floor but missing from the inventory list can be added
manually with a description and a count. Item numbers are validated against
the site's format:

| Pattern     | Example     |
| ----------- | ----------- |
| `PKG####`   | `PKG0628`   |
| `PKG####-#` | `PKG1422-2` |
| `FLA####`   | `FLA9200`   |
| `FLA####-#` | `FLA9289-2` |
| `ALL####`   | `ALL8109`   |

Manually added items are appended to the bottom of the exported sheet and
flagged in an `Added Manually` column, which the app creates if it is not
already there.

### Excel handling

- **Columns are found by header name, not by column letter.** The app scans
  the first 20 rows for a header row and matches on aliases, so columns can
  move between workbooks. See `HEADER_ALIASES` in `app/config.py`.
- Required headers: an **item number** column and a **counted** column.
  Product name and physical inventory are used when present.
- On export, totals are written into the `counted` column on each item's
  original row. **The `diff` column is never touched** — existing formulas
  survive the round trip.
- Uploads are validated before they are accepted. A workbook without the
  required headers is rejected and the current session is left intact.

### Access and admin

- **QR code on the home screen** encodes the host's LAN address, so a tablet
  joins by scanning instead of typing an IP.
- **Admin password** gates uploading a workbook, replacing a workbook, and
  downloading the export. Counting itself needs no password.
- **Exit Application** button, shown only on the host computer, shuts the
  server down cleanly. Closing the window does the same, after a confirmation.
- **Only one copy runs at a time.** Launching it again points you at the
  window already open instead of starting a second server.
- **Port 5000 is not assumed.** If something else holds it, the app moves to
  the next free port and the QR code follows automatically.

## Running from source

Requires Python 3.14 (developed on 3.14.6).

```bash
cd pkg_inventory_app
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

This opens the same desktop window. Add `--no-window` to run the server alone
with no window, which is useful when testing against the HTTP API.

Running from source keeps its data in the project's own `data/` folder, so
development counts stay separate from the installed app's.

## Building the installer

PyInstaller and Inno Setup are build-only tools and are not in
`requirements.txt`:

```bash
pip install pyinstaller
winget install --id JRSoftware.InnoSetup -e
```

Then, from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File tools\build.ps1
```

That regenerates the icon, builds the executable, and compiles the installer
to `installer_output\PackagingInventoryLogger-Setup-<version>.exe`. Pass
`-SkipInstaller` to stop after the executable.

**The version lives in `APP_VERSION` in `app/config.py`** and nowhere else —
the build script reads it and passes it to the installer compiler. Bump it
there before cutting a release.

Two things in the build worth knowing:

- `tools/make_icon.py` builds `assets/icon.ico` from the logo. Sizes 48px and
  under use a cropped version of the logo, because the "Coffee Roasters" line
  is illegible at taskbar size.
- The `AppId` GUID in the `.iss` file identifies the app to Windows. Changing
  it makes the next install a second copy rather than an upgrade, so leave it
  alone.

## Project layout

```text
run.py                      Entry point: desktop window + Waitress server
app/
  __init__.py               App factory, /shutdown endpoint
  config.py                 Paths, version, admin password, header aliases
  database.py               SQLite schema and item/count queries
  excel_service.py          Workbook import, validation, and export
  network_service.py        LAN IP detection and QR code generation
  validators.py             Count and item-number validation
  routes/
    main_routes.py          Home page
    item_routes.py          Search, lookup, zero-counts, manual items
    count_routes.py         Save, list, edit, delete count entries
    file_routes.py          Upload, download, password checks
  templates/index.html
  static/css, static/js, static/images
assets/icon.ico             App icon, generated from the logo
installer/                  Inno Setup script
tools/
  build.ps1                 Icon + executable + installer, one command
  make_icon.py              Regenerates assets/icon.ico
data/                       Runtime data when run from source, gitignored
```

### Where the data lives

| How it is run | Workbook and counts |
| ------------- | ------------------- |
| Installed app | `%LOCALAPPDATA%\PackagingInventoryLogger\data\` |
| From source   | `data\` in the project folder |

The installed app deliberately keeps its data **outside** the program folder.
An installed program cannot rely on being able to write next to its own
executable, and keeping counts there would also mean an uninstall or upgrade
could wipe them.

That folder also holds `startup.log`. A windowed app has no console, so if it
ever fails to start, that file is where the reason goes.

Two tables in `inventory_counts.sqlite3` (WAL mode):

- **`items`** — one row per inventory item: number, product name, physical
  inventory, the workbook row it came from, and whether it was added manually.
- **`count_entries`** — one row per recorded count: timestamp, item number,
  quantity, and source. Cascades on item delete.

An item's counted total is always computed as `SUM(count)` over its entries;
no running total is stored.

Uploading a new workbook **resets the database** and wipes all counts from the
current session. The UI confirms before doing this.

## HTTP API

| Method | Route                       | Purpose                              |
| ------ | --------------------------- | ------------------------------------ |
| GET    | `/`                         | Count screen                         |
| GET    | `/api/items?q=`             | Search items                         |
| GET    | `/api/item?item_number=`    | Look up one item                     |
| GET    | `/api/items/zero-count`     | Items with no counts                 |
| POST   | `/api/add-manual-item`      | Add an item not in the workbook      |
| POST   | `/api/save-count`           | Record a count entry                 |
| GET    | `/api/entries?item_number=` | List an item's entries               |
| POST   | `/api/update-entry`         | Change an entry's quantity           |
| POST   | `/api/delete-entry`         | Remove an entry                      |
| POST   | `/validate-upload-password` | Check the admin password             |
| POST   | `/upload`                   | Replace the workbook (admin)         |
| POST   | `/download`                 | Export `updated_inventory.xlsx`      |
| POST   | `/shutdown`                 | Stop the server (host computer only) |

## Notes and limitations

- **The admin password lives in `app/config.py`** and is therefore compiled
  into the distributed `.exe`. It keeps the counting crew from overwriting the
  workbook by accident; it is not a real secret.
- **No authentication on counting.** Anyone who can reach the host on the
  network can record counts. This is intentional for a shop-floor tool on a
  trusted network.
- **Uploads must not be locked.** If the current workbook is open in Excel on
  the host, replacing it fails with a clear message. Close Excel and retry.
- **Single workbook at a time.** There is no concept of separate count
  sessions or history across workbooks.
- **Installed per Windows user.** Another person signing into the host
  computer under their own account gets their own empty copy. Counts do not
  carry across Windows logins.
- **Not code-signed**, so SmartScreen warns on first run and the publisher
  shows as unknown. Signing needs a paid certificate.
- **Windows only.** The window uses the WebView2 runtime, which ships with
  Windows 10 and 11.
- **No automated tests.** The header-matching and export logic in
  `excel_service.py` is the most fragile part and is currently verified by
  hand.
