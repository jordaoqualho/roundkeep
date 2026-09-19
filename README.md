# RoundKeep

**Master the round. Run the combat.**

RoundKeep is a tactical combat table for D&D 5e that runs locally in the browser. Track initiative, manage HP and conditions, browse SRD creatures and spells offline, and import your campaign from Improved Initiative — no account, no cloud, and no internet required during the session.

## Features

- **Combat table** with turns, rounds, editable initiative, damage/healing, and conditions
- **Offline library** with 331 SRD 2024 creatures and 319 spells, ready to browse
- **Import** from Improved Initiative and RoundKeep backups, with a review step before confirming
- **Player view** synced locally in the same browser
- **Offline mode** via service worker after the first load
- **Portable backups** as JSON to move your campaign to another device

## Run

```sh
npm install
npm run build
npm start
```

Open **http://localhost:5173**. The server listens only on `127.0.0.1`.

For development: `npm run dev`. To verify: `npm test` and `npm run build`.

Offline mode with the service worker is enabled in the production build, after the first successful load. Catalogs live in IndexedDB; the encounter is saved on every change. Clearing browser data removes that storage, so use **Data & settings → Export backup** for portable copies.

## Your campaign

The backup extracted from the original tab lives in `private-data/improved-initiative.json`. The folder is gitignored and is not copied to `dist`. On first launch, the local server provides that backup to import your personal stat blocks. If the file is missing, the app opens with the public catalog and an empty table.

Later exports from Improved Initiative can be imported through the UI. Import shows a review step before confirmation. The source file is preserved in full and can be downloaded again.

**Data & settings** handles import/export. **Saved encounters** stores combat prep. **Player view** opens a window synced locally in this browser; it does not create a remote room.

## Shortcuts

- `N`: next turn
- `/`: search the library
- `D`: roll dice
- `Ctrl/⌘ + Z`: undo encounter action

Click the initiative value to edit it. Click HP for damage, healing, or temporary HP. Select a name to view the stat block and conditions.

## Project layout

- `src/model.ts`: encounter rules, import, and validation
- `src/storage.ts`: IndexedDB and catalog cache
- `src/main.ts`: UI and flows
- `src/style.css`: responsive design
- `server.mjs`: local HTTP server and private bootstrap
- `public/data`: public offline catalog
- `scripts/convert-open5e.py`: reproducible Open5e v2 full-response conversion
- `scripts/build-sw.mjs`: automatic production cache versioning
- `tests`: rules, data, and import tests
- [Reference analysis and evidence](docs/ANALISE.md)

Creature records come from SRD 5.2 (2024) via Open5e, under CC BY 4.0; spells come from the basic catalog distributed by Improved Initiative. Credits and licenses are in `public/credits.html`, `public/SRD-OGL_V1.1.pdf`, and `docs/UPSTREAM-LICENSE.txt`.

Only one DM tab edits the campaign at a time in browsers with Web Locks, preventing overwrites across tabs. Player windows can stay open in parallel. Fonts are local and included in the production precache.
