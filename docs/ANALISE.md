# Improved Initiative analysis and RoundKeep implementation

Inspection on September 18, 2026. Reference: https://improvedinitiative.app/e/.

## Evidence reviewed

- Production HTML: bundle `/js/ImprovedInitiative.3.17.1.js` (2,109,232 bytes), versioned CSS, manifest, and `environmentJSON` configuration with encounter context and auth state.
- Public production bundle: confirms LocalForage, IndexedDB, legacy storage, Open5e source loading, and Socket.IO. No `serviceWorker` reference was found in that bundle.
- Public repository https://github.com/cynicaloptimist/improved-initiative, `development` branch, whose `package.json` indicated 3.17.2. That branch is not identical to the 3.17.1 production build; code findings are distinguished from endpoints actually queried.
- Live Chrome tab: library, custom creatures, characters, encounter controls, settings, and local data export.
- Export from the original UI via Settings → Account → Export. Full backup preserved in `private-data/improved-initiative.json`, outside Git and the build.
- Real GET to `/open5e/`: HTTP 200, JSON with 10 creature sources and 8 spell sources; `cache-control: private`, `cf-cache-status: DYNAMIC`, `ETag` present.
- Real GET to `https://api.open5e.com/v2/creatures/?document__key=srd-2024&limit=1000`: 331 records, no next page.

No exhaustive HAR capture of every action or server database access was performed. This report does not conflate code inspection with observed traffic.

## Observed architecture

The original frontend combines React, Knockout, TypeScript, LESS, and Webpack. The public backend uses Express; repository modules include MongoDB for accounts and optional Redis for sessions and Socket.IO distribution. The infrastructure configuration actually used in production is not public.

| Route or transport | Function found in code |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /statblocks/`, `/statblocks/:id` | Basic creature index and individual stat block |
| `GET /spells/`, `/spells/:id` | Spell index and spell sheet |
| `GET /open5e/` | Enableable creature and spell sources; response verified |
| `GET /open5e/:source/` | Creature metadata grouped by document |
| `GET /open5e-spells/:source/` | Spell metadata by document |
| Open5e `/v2/creatures/:key/`, `/v1/spells/:slug/` | Remote details, requested when a stat block is used |
| `/my`, `/my/fullaccount`, `/my/settings`, `/my/:type/` | Account, settings, and authenticated sync |
| `GET /playerviews/:id` | Initial player view state |
| Socket.IO | `join encounter`, `update encounter`, `encounter updated`, `update settings`, damage/condition suggestions |
| `/importencounter/`, `/launchencounter/`, `/encounterfrom/` | Encounter import and launch |

Relevant files: `client/Library/Listing.ts`, `client/Library/Libraries.ts`, `client/Utility/Store.ts`, `client/Utility/LegacySynchronousLocalStore.ts`, `client/Combatant/Combatant.ts`, `server/configureOpen5eContent.ts`, `server/configureBasicRulesContent.ts`, `server/storageroutes.ts`, `server/sockets.ts`.

## Cache is not a single layer

1. **Server memory:** Open5e indexes are loaded and grouped by source at startup.
2. **Page memory:** `Listing` keeps the loaded stat block in an observable; this avoids new queries in that instance but does not guarantee offline persistence.
3. **LocalForage:** `Creatures`, `Spells`, `PersistentCharacters`, and `SavedEncounters` databases use IndexedDB, with library fallback mechanisms.
4. **Legacy localStorage:** `ImprovedInitiative.*` keys include preferences, indexes, and encounter autosave.
5. **HTTP/CDN:** the observed sources endpoint uses private cache and ETag; it was not served as public CDN cache on that request.

The personal export contained 9 creatures and 4 persistent characters. The autosaved encounter was empty. The enabled creature source was `srd-2024`; the spell source, `wotc-srd`. There were no personal spells or saved encounters with combatants in the snapshot.

The original backup remains intact, including settings and fields with no equivalent control in the new product. Migration to new controls does not mean equivalence for all legacy preferences.

## Delivered implementation

RoundKeep has its own TypeScript frontend, Vite, and Lucide icons. The local Node backend serves the build, provides private bootstrap on loopback only, and offers ETags for files. Combat does not depend on remote calls during a session.

- 331 SRD 2024 creatures via Open5e, with actions, bonus actions, reactions, legendary actions, saves, skills, and defenses.
- 319 spells from the basic catalog distributed by Improved Initiative.
- Imported personal library; stat block fields and text preserved. Initiative bonus converted: the original sums Dexterity modifier and additional bonus; the new model stores the total bonus.
- Accent-insensitive search, source filter, detailed stat blocks, creature and spell create/edit, action and ability editor.
- Turns and rounds, editable initiative, rolling, temporary HP before damage, healing capped at maximum, conditions, reaction, hide, and duplicate.
- History, undo encounter actions, private notes, saved encounters, validated import with review, exportable backup, and original preservation.
- IndexedDB `roundkeep`, store `data`: `state`, versioned catalog, and `before-import` snapshot. Automatic migration from legacy `patron` databases.
- Production service worker: shell, local assets, and catalogs. Cache version is derived from the build and catalogs. Private `/api/bootstrap` never enters the service worker cache.
- Player view is a LAN Socket.IO room at `/p/{id}` plus same-browser BroadcastChannel (`/?player`); only the public encounter projection is sent.

The UI keeps the library, combat order, and stat block in separate areas. Action names are explicit, focus is visible, native dialogs are used, state contrast is clear, and the layout adapts to mobile.

## Explicit limits

- No Patreon auth, cloud account sync, or public cloud room. Player view is a LAN Socket.IO room plus same-browser BroadcastChannel. Not a public cloud room. Bootstrap remains loopback-only.
- Rule content keeps the source language; the interface is in English.
- Conditions are manual markers; no automatic round expiration or engine applying all condition rules.
- The offline catalog is a snapshot of the source on the analysis date. It does not automatically download all additional Open5e books.
- The importer supports types present in the observed backup and documented schema backups; XML/DnDAppFile exports are not supported.
- Original settings and fields without equivalents remain in the full backup; they are not executed automatically.
- Player view hides data in presentation but is not a security boundary between people sharing the same browser profile.

## Verification performed

- TypeScript + Vite production build.
- 11 automated tests: HP, healing, temporary HP, turn/round, ties, active removal, dice, import validation, full catalog, personal stat block preservation, and backup exclusion from build.
- Real Chrome: imported library, added four heroes and one custom creature, started combat, 15 damage reducing 112 → 97, Poisoned marker, both persisted after reload.
- Player view: correct public state and turn change synced for Underfoot; notes, AC, and exact HP hidden.
- Server stopped: service worker reload kept the app and encounter accessible with saved state.
- Desktop layout and 390 px mobile viewport inspected visually. Console observed with no visible messages; not a guarantee of zero bugs.

### Final delivery check

- Real export `roundkeep-backup.json` downloaded by the browser and validated by the model. The `sourceBackup` field is identical to the original backup; additional copy in `private-data/roundkeep-verified-backup.json`.
- Encounter `Vallaki - demo` saved, in prep, with 4 allies and 1 enemy. Damage and condition from tests were removed; HP restored.
- Local HTTP bootstrap compared to original file: identical content, `Cache-Control: no-store`. Catalog served with 331 records and ETag.
- DM Sans and Manrope fonts included in build and precache list; no Google Fonts runtime dependency.
- Web Locks protection verified in two real tabs: the first keeps editing and the second reports the table is already open, without overwriting data. Player view remains available in parallel.
