# RoundKeep Combat Automation and Remote Player Room — Design Spec

Date: 2026-09-19
Status: approved for implementation
Authority: this document. Gap inventory: [RoundKeep vs Improved Initiative](/Users/jordaoqualho/.cursor/projects/Users-jordaoqualho-Workspaces-Roundkeep/canvases/ii-feature-gap.canvas.tsx). Architecture limits in `docs/ANALISE.md` still hold except where this spec explicitly extends player view.

## Intent

Close the ten session-blocking holes versus Improved Initiative 3.17 so a live table can run timed effects, concentration, persistent PC HP, grouped initiative, quick mooks, encounter budget, per-creature AC reveal, manual order, end-of-fight cleanup, and a shareable player-view URL. HP, turns, undo, ⌘K, SRD library, and local-first storage already exist and stay.

## Audience and success

The DM is mid-round. Success is: Bless expires without a reminder note; a concentrator taking 14 damage is prompted at DC 10; heroes keep HP between fights; two wolves share one initiative; a 12 HP bandit is on the list in one field; players on a phone see `/p/{id}` update; the tracker shows Easy/Medium/Hard/Deadly; one ogre's AC can be shown; the DM can move a row by hand; Clean encounter strips dead monsters and tops up PCs.

Verification is failing tests first, then green tests, then a browser pass of those ten flows on the local server.

## What is said vs assumed

Said:

- The ten "missing at the table" items in the gap canvas are in scope.
- Nice-to-haves, partials that are already usable, parity items, and skip items are out of scope unless a ten-item flow requires a one-line hook (for example player projection must learn `revealedAC`).
- Implement after a written spec and plan. Execution is subagent-driven.

Assumed (locked):

- Keep Vite, vanilla TypeScript, `src/main.ts` templates, Lucide, Operate visual contract, IndexedDB `roundkeep` / `data`.
- No Patreon, no Mongo account, no CSS of patron, no ads, no live Open5e books, no XML import.
- Player view is still not a security boundary. Anyone who has the room URL sees the public projection. DM notes, exact HP (unless we later add verbosity — we do not), and hidden combatants stay off the wire.
- Remote room is LAN (or same host), not a public internet service. The existing loopback-only bootstrap file stays loopback-only.
- State `version` remains `1`. New fields are additive. `validateState` migrates missing fields so existing backups load.

## Mode

Impeccable **Operate**. Combat chrome does not get a new visual world. New controls use existing tokens, radii, and one phosphor accent per region.

## Approaches considered

1. **Clone Improved Initiative CombatantState and Settings.ts.** Rejected. It would import patron flags, HP verbosity, portraits, and a cloud account model RoundKeep deliberately dropped.

2. **Recommended: extend RoundKeep's Combatant/Encounter/State and attach a Socket.IO room to `server.mjs`.** Chosen. Rules live in `src/model.ts` (plus small focused modules). The DM tab remains the writer. Players receive a projection.

3. **Supabase/cloud realtime room.** Rejected. Contradicts local-first IndexedDB and `docs/ANALISE.md`. Offline DM table would depend on a hosted service.

## Architecture

```
DM tab (Web Lock writer)
  IndexedDB state
  → mutate via model functions (undoable `change()`)
  → persist()
  → projection()
       ├─ BroadcastChannel "roundkeep-player"   (`/?player`, same browser)
       └─ socket.emit("update encounter", roomId, projection)  (`/p/{roomId}`)

Player tab
  `/?player`     → BroadcastChannel only
  `/p/{roomId}`  → Socket.IO join; render projection; no IndexedDB writes
```

The Node HTTP server already serves the SPA. It gains:

- Socket.IO on the same HTTP server.
- In-memory map `roomId → latest projection`.
- Listen on `0.0.0.0` so a phone on the LAN can open the URL.
- Host allowlist: `localhost`, `127.0.0.1`, IPv6 loopback, RFC1918, link-local. Public hosts still 403.
- `GET /api/bootstrap` remains 403 unless the Host is loopback.
- `GET /api/player-info` (loopback Host only) returns `{ roomId, urls[] }` so the DM can copy a LAN link even when the table was opened at `localhost`.

Campaign JSON never leaves the DM browser except the public projection and the already-local IndexedDB.

## Data model

### Tag

```ts
export interface Tag {
  id: string;
  text: string;
  remainingRounds: number | null; // null = until removed by hand
  timing: "start" | "end";
  untilCombatantId: string; // whose turn ticks the clock
  hidden: boolean; // omitted from player projection when true
  concentration: boolean;
}
```

`Combatant.conditions: string[]` remains as a **derived view** of `tags.map(t => t.text)` for one release so render call sites can migrate in the same tasks. Storage writes `tags`. `validateState` accepts legacy `conditions: string[]` with no `tags` and builds tags (`remainingRounds: null`, `timing: "end"`, `untilCombatantId: combatant.id`, `hidden: false`, `concentration: /^concentration$/i.test(text)`). After migration, `conditions` is always rewritten from tags so backups stay coherent.

### Combatant additions

| Field | Type | Default | Role |
|---|---|---|---|
| `tags` | `Tag[]` | `[]` | Timed and untimed markers |
| `sortIndex` | `number` | `0` | Manual order; `ordered()` uses this first when values differ |
| `initiativeGroup` | `string \| null` | `null` | Shared roll; members copy the same `initiative` |
| `persistentId` | `string \| null` | `null` | Link to `State.characters` |
| `revealedAC` | `boolean` | `false` | Include `ac` on player projection |

### PersistentCharacter

```ts
export interface PersistentCharacter {
  id: string;
  stat: StatBlock; // Player: "player"
  currentHp: number;
  maxHp: number;
  notes: string;
}
```

`State.characters: PersistentCharacter[]` defaults to `[]`. Heroes tab lists these first, then legacy `library` stats with `Player` set. Adding a persistent character to the encounter sets `persistentId`, `side: "ally"`, and HP from `currentHp`. Any HP/maxHp/notes change on a combatant with `persistentId` writes through to the character record in the same `change()` call.

Import of Improved Initiative `PersistentCharacters.*` creates `State.characters` entries (not only Player stat blocks). Existing Player stat blocks without a character record keep working as copies.

### Party budget (settings)

```ts
export interface PartyBudget {
  size: number;  // default 4, min 1, max 12
  level: number; // default 3, min 1, max 20
}
```

Stored on `State.party`. Edited in Settings. Used only for encounter difficulty.

### Encounter

No new required fields. `Encounter.id` is the Socket.IO room id (already a UUID).

## Rules

### ordered()

Sort key: `sortIndex` ascending, then `initiative` descending, then `InitiativeModifier` descending, then `id` ascending.

If every combatant has `sortIndex === 0` (legacy), the first key ties and today's initiative sort still wins.

### tickTags(encounter, direction)

Called from `advance` when `direction > 0` and combat is already started:

1. Let `leaving` be the combatant with `activeId` before the move.
2. Decrement every tag in the encounter whose `untilCombatantId === leaving.id` and `timing === "end"` and `remainingRounds !== null`. Remove tags whose remaining rounds drop to `0`.
3. Perform the existing turn/round move (including reaction reset on the arriving combatant).
4. Let `arriving` be the new active combatant. Decrement tags whose `untilCombatantId === arriving.id` and `timing === "start"` the same way.

Going backward (`direction < 0`) does not restore expired tags (undo already snapshots the whole encounter).

When combat **starts** (`!e.started`), do not tick; just start as today.

### Concentration

`concentrationDC(damage) = max(10, floor(damage / 2))`.

`applyHP` in damage mode returns `{ taken: number }` equal to the amount the caller applied (temp HP still counts as taking damage). Heal/temp return `{ taken: 0 }`.

After a successful damage apply, if the combatant `isConcentrating` (`tags.some(t => t.concentration)`), the UI must prompt before the next unrelated action:

- Title: `{name} is concentrating`
- Body: `DC {dc} Constitution saving throw (took {taken} damage).`
- Actions: **Pass** (keep tags), **Fail** (remove all tags with `concentration: true` and log it), **Roll** (`1d20 + Con mod`, compare to DC, then Pass or Fail automatically).

There is no silent auto-fail. Closing the dialog without a choice keeps concentration (DM can ignore). The prompt is not itself an undo step; Fail is an undoable `change()`.

### Linked initiative

`linkInitiative(encounter, ids: string[])` assigns a fresh group id to those combatants and copies the first member's `initiative` to the rest.

`unlinkInitiative(encounter, id)` sets that combatant's `initiativeGroup` to `null`.

`rollCombatantInitiative(c, random)` rolls `1d20 + InitiativeModifier`. If `c.initiativeGroup` is set, every member of that group gets the same total.

`rollEncounterInitiative` uses one roll per group and one per ungrouped combatant, then assigns `sortIndex` `0..n-1` in `ordered()` sequence after the new numbers are written (reindex so the list matches the roll).

### Manual reorder

`moveCombatant(encounter, id, direction: -1 | 1)` swaps `sortIndex` with the neighbor in the current `ordered()` list. If all `sortIndex` are `0`, first assign `0..n-1` in current order, then swap. Members of the same `initiativeGroup` move as a block: the whole consecutive run of that group swaps with the adjacent combatant or group.

### Quick Add

`quickAddCombatant(name: string, hp: number): Combatant` builds a stat block `{ Id: new, Name, HP: { Value: hp }, AC: { Value: 10 }, InitiativeModifier: 0, Type: "Quick add" }` and `createCombatant(..., "enemy")`. Reject empty name and `hp < 1`. Does not write the library.

### Difficulty

Module `src/difficulty.ts`.

CR string → XP uses the 5e SRD table, including fractions `"0"`, `"1/8"`, `"1/4"`, `"1/2"`, integers `"1"`–`"30"`. Unknown CR is 0 XP.

Enemy XP is the sum of `xpFromChallenge(c.stat.Challenge)` for `side === "enemy"` and `hp > 0`.

Party thresholds use the 2014 DMG per-character XP-by-level table (Easy / Medium / Hard / Deadly) times `party.size` at `party.level`. This matches Improved Initiative's familiar labels and the SRD 2024 catalog's CR field.

Return `{ xp, label: "Trivial" | "Easy" | "Medium" | "Hard" | "Deadly" | "—" }`. `"—"` when there are no living enemies. `"Trivial"` when XP is below Easy.

### Reveal AC

`projection()` includes `ac: number | null`. `ac` is the numeric armor class when `revealedAC` is true; otherwise `null`. Player view renders `AC {n}` only when `ac` is a number. Hidden combatants stay omitted. Hidden tags stay omitted. Tag texts that are not hidden appear as today.

### Clean encounter

`cleanEncounter(encounter, characters)`:

1. Remove combatants with `side === "enemy"` and `hp === 0`. If the active combatant is removed, use existing `removeCombatant` semantics (or equivalent) so `activeId`/`round` stay valid.
2. For each remaining combatant with `side === "ally"` or a `persistentId`, set `hp = maxHp`, `tempHp = 0`.
3. Write `currentHp = maxHp` on linked persistent characters.

Do not clear tags, notes, initiative, or the round clock. Do not remove living enemies.

## Player room protocol

Events (Socket.IO):

| Event | Direction | Payload |
|---|---|---|
| `join encounter` | player → server | `roomId: string` |
| `update encounter` | DM → server | `roomId, projection` |
| `encounter updated` | server → room | `projection` |
| `request encounter` | player → server | `roomId` (replay last snapshot) |

Empty room after the last socket disconnects: drop the snapshot (DM will emit on next persist). If a player joins before the DM has emitted, they wait on the existing "Waiting for the DM table…" screen.

`/?player` continues to use BroadcastChannel and does not require Socket.IO. The Player view button opens `/p/{encounter.id}` in a window **and** still posts BroadcastChannel so a same-browser tab opened at `/?player` keeps working. Help text states the LAN URL is the remote session.

Service worker: navigation to `/p/*` already falls through to network-then-`/` cache. Do not cache Socket.IO. `/api/*` stays uncached.

## UI surfaces

Operate contract: Inter UI, Manrope headings, canvas `#121212`, phosphor once per region, no pill buttons, no shadows, focus 1px green.

1. **Condition picker** — existing presets plus: duration (blank = until removed), timing Start/End of turn, whose turn (select of current combatants, default = the tagged combatant), checkbox Hidden from players, checkbox Concentration. Chips show `Bless · 3` when timed. Sheet chips remain remove-on-click.

2. **HP dialog** — unchanged fields; after damage + concentrating, open the concentration dialog described above.

3. **Heroes tab** — persistent characters with current/max HP in the subtitle. Add uses `persistentId`. Command "Save as hero" on an ally combatant creates/updates a persistent record.

4. **Library footer (Creatures tab)** — compact Quick Add: name input, HP input, Add. Not shown on Spells.

5. **Combatant row** — move up / move down in the overflow menu; Link initiative when 2+ selected… Selection stays single. Link is: "Link initiative with next" on the menu linking this row with the row below, or "Unlink initiative". A small chain mark on grouped names.

6. **Battle summary** — after ally/enemy counts, show difficulty label (`Medium · 450 XP`) when there is at least one living enemy.

7. **Overflow / command palette** — Clean encounter. Confirm: "Remove defeated enemies and restore ally HP."

8. **Overflow** — Reveal AC / Hide AC toggle; player card shows AC when revealed.

9. **Player view button** — opens `/p/{id}`; Settings and the player modal show copyable LAN URLs from `/api/player-info`. Footer on player screen: `Room {id}` not "Local sync only".

10. **Settings** — Party size and level number inputs under a "Encounter budget" heading.

## Error handling

- Invalid Quick Add: toast, no combatant.
- Socket connect fail on `/p/`: stay on waiting screen; text "Cannot reach the table. Is RoundKeep running on this network?"
- `/api/player-info` fail: still open `/p/{id}` on `location.host` (works when the DM already used a LAN hostname).
- `validateState`: reject unknown `timing`, negative `remainingRounds`, `maxHp < 1`, party size/level out of range. Coerce missing new fields instead of throwing so v1 backups load.

## Testing

Node tests (`tests/*.test.ts`) own every rule in this spec: tag tick, concentration DC, persistent write-through, group roll, move up/down, quick add, XP/difficulty, clean encounter, projection AC, validate migrate.

Server room: `tests/room.test.ts` drives the in-memory room helper (join stores nothing until update; update then request returns snapshot).

Browser (Cursor browser / agent-browser): DM table at `http://127.0.0.1:5173` — timed tag expires on next, concentration prompt on damage, hero HP survives new encounter add, link two creatures and roll once, Quick Add, difficulty label, reveal AC, move row, Clean encounter. Player view: open `/p/{id}` in a second tab and confirm turn + revealed AC. Same-browser `/?player` still updates.

## Out of scope

Open5e extra books, roll-HP formula, auto-group by name, turn timer, player suggestions, custom keybindings, library manager, portraits, negative HP, HP verbosity modes, mid-fight global reroll command (roll initiative already exists), XML import, Patreon, patron CSS, ads, in-app tutorial, fullscreen API.

## Compatibility

- Undo continues to snapshot `Encounter` (tags, sortIndex, groups included). Persistent character mutations that happen inside `change()` must snapshot enough of `State.characters` to undo HP write-through. Implementation: `change()` snapshots `{ encounter, characters }` or the whole `State` slice it already clones for encounter — extend the history stack to `{ encounter, characters }[]`.
- Web Locks unchanged: one DM writer. Player sockets do not take the lock.
- `sourceBackup` untouched.

## File plan

| File | Responsibility |
|---|---|
| `src/model.ts` | Types, createCombatant, applyHP return, advance+tickTags, ordered, link/move/quickAdd/clean, migrate, validate, importOriginal characters/tags |
| `src/difficulty.ts` | CR→XP, party thresholds, `encounterDifficulty` |
| `src/projection.ts` | Public player DTO from Encounter |
| `src/room.mjs` | In-memory room map used by server and tests |
| `server.mjs` | Socket.IO, LAN bind, player-info, host allowlist |
| `src/main.ts` | UI wiring |
| `src/style.css` | Duration chips, Quick Add footer, difficulty summary — tokens only |
| `tests/model.test.ts` | Existing + new combat rule tests |
| `tests/difficulty.test.ts` | Budget tests |
| `tests/projection.test.ts` | AC/hidden tags |
| `tests/room.test.ts` | Room helper |
| `README.md` / `docs/ANALISE.md` | Player view is now LAN `/p/` + Socket.IO; bootstrap still local |

## Spec self-review

- No TBD/TODO. Duration null vs number is explicit. Backward initiative does not revive tags.
- Concentration uses full damage amount, not HP lost after temp.
- Clean does not reset the round.
- Remote room is LAN, not cloud; bootstrap stays loopback.
- Scope is the ten high gaps only.
- History must include characters so persistent HP undo works.
