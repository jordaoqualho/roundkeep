# Combat Automation and Remote Player Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close RoundKeep's ten Improved Initiative table gaps: timed tags, concentration checks, persistent characters, linked initiative, Quick Add, remote `/p/` player view, encounter difficulty, per-creature AC reveal, manual initiative reorder, and clean encounter + restore PC HP.

**Architecture:** Extend `Combatant` / `State` in `src/model.ts` with tags, sortIndex, initiative groups, persistent IDs, and revealed AC. Keep the DM tab as the IndexedDB writer. Project a public DTO over BroadcastChannel (`/?player`) and Socket.IO (`/p/{roomId}`) from the existing Node server, bound to the LAN. Do not add a cloud account.

**Tech Stack:** TypeScript, Vite, vanilla DOM templates, Lucide, Node test runner (`node --import tsx --test tests/*.test.ts`), Socket.IO on `server.mjs`, IndexedDB `roundkeep`.

**Spec:** `docs/superpowers/specs/2026-09-19-combat-automation-remote-room-design.md`

## Global Constraints

- Stack stays Vite + vanilla TypeScript + `src/main.ts` template strings. No React, Tailwind, or icon-library swap.
- State `version` remains `1`. New fields are additive; `validateState` migrates legacy `conditions: string[]` backups instead of rejecting them.
- No Patreon, Mongo sync, patron CSS, ads, live Open5e books, or XML import.
- `GET /api/bootstrap` is 403 unless Host is loopback. Player sockets never receive campaign JSON — only `projection()`.
- Host allowlist is localhost + RFC1918 + link-local. Listen on `0.0.0.0`. Public internet hosts stay 403.
- Player view is not a security boundary. Hidden combatants and hidden tags stay off the wire. Exact HP stays as Healthy/Bloodied/Down.
- Operate visual contract: canvas `#121212`, phosphor `#3ecf8e` once per region, no pill buttons, no card shadows, focus 1px green.
- `change()` history snapshots `{ encounter, characters }` so persistent HP write-through can undo.
- Every task ends with `npm test` still passing. Existing HP/turn/import tests in `tests/model.test.ts` must stay green.
- Do not implement nice-to-haves from the gap canvas (portraits, turn timer, HP verbosity, player suggestions, extra books).

## File structure

- `src/model.ts` — types, combat rules, migrate, validate, import
- `src/difficulty.ts` — CR→XP and party budget label
- `src/projection.ts` — public player DTO
- `src/room.mjs` — in-memory room snapshots
- `server.mjs` — Socket.IO, LAN bind, `/api/player-info`, host allowlist
- `src/main.ts` — UI
- `src/style.css` — chips, Quick Add footer, difficulty text
- `tests/model.test.ts` — combat rules
- `tests/difficulty.test.ts` — budget
- `tests/projection.test.ts` — AC / hidden tags
- `tests/room.test.ts` — room helper
- `package.json` — `socket.io`, `socket.io-client`
- `README.md`, `docs/ANALISE.md` — player view is LAN `/p/`

## Review Focus

- Legacy backup with `conditions: ["Poisoned"]` and no `tags` must load and show Poisoned. Covered in Task 1 migrate tests.
- Damage of 14 with 6 temp HP still prompts concentration at DC 10 using taken=14, not HP lost. Covered in Task 2.
- Backward `advance(e, -1)` must not restore a tag that already expired. Covered in Task 1.
- `GET /api/bootstrap` from a LAN Host header must 403. Covered in Task 11.
- Hidden tags must not appear in projection even when the combatant is visible. Covered in Task 7.

---

### Task 1: Timed tags and tick on advance

**Files:**
- Modify: `src/model.ts`
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: existing `advance`, `createCombatant`, `ordered`
- Produces: `Tag`, `Combatant.tags`, `tagText(c)`, `syncConditions(c)`, `addTag(c, partial)`, `tickTags(e, phase, combatantId)`, `advance` ticks end-of-leaving then start-of-arriving when `direction > 0` and already started

- [ ] **Step 1: Write the failing test**

Append to `tests/model.test.ts`:

```ts
import {
  addTag,
  type Tag,
} from "../src/model.ts";

function bless(c: { id: string }, rounds = 1): Tag {
  return {
    id: "tag-bless",
    text: "Bless",
    remainingRounds: rounds,
    timing: "end",
    untilCombatantId: c.id,
    hidden: false,
    concentration: false,
  };
}

test("timed tags expire at end of the anchored combatant's turn; backward does not restore them", () => {
  const e = emptyEncounter();
  const a = createCombatant(stat);
  const b = createCombatant(stat);
  a.initiative = 20;
  b.initiative = 10;
  a.tags = [bless(a, 1)];
  e.combatants = [a, b];
  advance(e);
  assert.equal(e.activeId, a.id);
  assert.equal(a.tags[0].remainingRounds, 1);
  advance(e);
  assert.equal(e.activeId, b.id);
  assert.equal(a.tags.length, 0);
  assert.deepEqual(a.conditions, []);
  advance(e, -1);
  assert.equal(e.activeId, a.id);
  assert.equal(a.tags.length, 0);
});

test("start-of-turn tags tick when that combatant becomes active; null remaining never expires", () => {
  const e = emptyEncounter();
  const a = createCombatant(stat);
  const b = createCombatant(stat);
  a.initiative = 20;
  b.initiative = 10;
  b.tags = [
    {
      id: "stun",
      text: "Stunned",
      remainingRounds: 1,
      timing: "start",
      untilCombatantId: b.id,
      hidden: false,
      concentration: false,
    },
    {
      id: "mark",
      text: "Hunter's mark",
      remainingRounds: null,
      timing: "end",
      untilCombatantId: b.id,
      hidden: false,
      concentration: false,
    },
  ];
  e.combatants = [a, b];
  advance(e);
  advance(e);
  assert.equal(e.activeId, b.id);
  assert.equal(b.tags.map((t) => t.text).join(","), "Hunter's mark");
  assert.equal(b.tags[0].remainingRounds, null);
});

test("legacy conditions strings migrate into untimed tags", () => {
  const c = createCombatant(stat);
  (c as { tags?: Tag[] }).tags = undefined;
  c.conditions = ["Poisoned"];
  const s = {
    version: 1 as const,
    encounter: { ...emptyEncounter(), combatants: [c] },
    library: [],
    spells: [],
    saved: [],
    characters: [],
    party: { size: 4, level: 3 },
    updatedAt: "",
  };
  const v = validateState(s);
  assert.equal(v.encounter.combatants[0].tags[0].text, "Poisoned");
  assert.equal(v.encounter.combatants[0].tags[0].remainingRounds, null);
  assert.deepEqual(v.encounter.combatants[0].conditions, ["Poisoned"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/model.test.ts`

Expected: FAIL — `addTag` / `tags` not defined or existing validate rejects missing `characters`.

- [ ] **Step 3: Write minimal implementation**

In `src/model.ts`, add types and helpers. Keep `conditions` in sync:

```ts
export interface Tag {
  id: string;
  text: string;
  remainingRounds: number | null;
  timing: "start" | "end";
  untilCombatantId: string;
  hidden: boolean;
  concentration: boolean;
}
export interface PersistentCharacter {
  id: string;
  stat: StatBlock;
  currentHp: number;
  maxHp: number;
  notes: string;
}
export interface PartyBudget {
  size: number;
  level: number;
}
```

Extend `Combatant` with `tags: Tag[]`, `sortIndex: number`, `initiativeGroup: string | null`, `persistentId: string | null`, `revealedAC: boolean`.

Extend `State` with `characters: PersistentCharacter[]` and `party: PartyBudget`.

`createCombatant` sets `tags: []`, `sortIndex: 0`, `initiativeGroup: null`, `persistentId: null`, `revealedAC: false`.

```ts
export function syncConditions(c: Combatant) {
  c.conditions = c.tags.map((t) => t.text);
}
export function addTag(
  c: Combatant,
  input: Partial<Tag> & { text: string },
): Tag {
  const tag: Tag = {
    id: input.id || id(),
    text: input.text,
    remainingRounds:
      input.remainingRounds === undefined ? null : input.remainingRounds,
    timing: input.timing || "end",
    untilCombatantId: input.untilCombatantId || c.id,
    hidden: !!input.hidden,
    concentration: !!input.concentration,
  };
  c.tags.push(tag);
  syncConditions(c);
  return tag;
}
export function tickTags(
  e: Encounter,
  phase: "start" | "end",
  combatantId: string,
) {
  for (const c of e.combatants) {
    c.tags = c.tags.filter((t) => {
      if (t.untilCombatantId !== combatantId || t.timing !== phase) return true;
      if (t.remainingRounds === null) return true;
      t.remainingRounds -= 1;
      return t.remainingRounds > 0;
    });
    syncConditions(c);
  }
}
```

In `advance`, after the `if (!e.started) { ... return; }` block, when `direction > 0`, call `tickTags(e, "end", e.activeId)` if `e.activeId` is set, then do the existing move, then `tickTags(e, "start", e.activeId)`.

In `validateState`, default `s.characters ||= []`, `s.party ||= { size: 4, level: 3 }`. For each combatant, if `!Array.isArray(c.tags)`, set `c.tags = (c.conditions || []).filter(x => typeof x === "string").map(text => ({ id: id(), text, remainingRounds: null, timing: "end", untilCombatantId: c.id, hidden: false, concentration: /^concentration$/i.test(text) }))`. Default the new combatant fields. Call `syncConditions(c)`. Accept `remainingRounds === null` or a non-negative integer. Reject unknown `timing`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/model.test.ts`

Expected: PASS including the three new tests and all previous tests.

- [ ] **Step 5: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "$(cat <<'EOF'
feat: expire timed combat tags on the anchored turn

Bless and stun need a clock mid-session; leftover labels were forcing the DM to remember durations by hand.
EOF
)"
```

---

### Task 2: Concentration DC and damage taken

**Files:**
- Modify: `src/model.ts:112-131`
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: `applyHP`, `Tag.concentration`
- Produces: `applyHP` returns `{ taken: number }`; `concentrationDC(damage: number): number`; `isConcentrating(c: Combatant): boolean`; `endConcentration(c: Combatant): void`; `constitutionMod(c: Combatant): number`

- [ ] **Step 1: Write the failing test**

```ts
test("concentration DC uses full damage including temp HP; fail strips concentration tags only", () => {
  const c = createCombatant({
    ...stat,
    Abilities: { ...stat.Abilities, Con: 14 },
  });
  addTag(c, { text: "Concentration", concentration: true });
  addTag(c, { text: "Bless", remainingRounds: 10, concentration: true });
  addTag(c, { text: "Poisoned" });
  applyHP(c, 6, "temp");
  const result = applyHP(c, 14, "damage");
  assert.equal(result.taken, 14);
  assert.equal(c.hp, 2);
  assert.equal(concentrationDC(result.taken), 10);
  assert.equal(concentrationDC(22), 11);
  assert.equal(isConcentrating(c), true);
  endConcentration(c);
  assert.equal(isConcentrating(c), false);
  assert.deepEqual(c.conditions, ["Poisoned"]);
  assert.equal(constitutionMod(c), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/model.test.ts -t "concentration DC"`

Expected: FAIL with `concentrationDC is not defined` or `taken` undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
export function applyHP(
  c: Combatant,
  amount: number,
  mode: "damage" | "heal" | "temp",
): { taken: number } {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Enter a positive value.");
  amount = Math.floor(amount);
  if (mode === "temp") {
    c.tempHp = Math.max(c.tempHp, amount);
    return { taken: 0 };
  }
  if (mode === "heal") {
    c.hp = clamp(c.hp + amount, 0, c.maxHp);
    return { taken: 0 };
  }
  const absorbed = Math.min(c.tempHp, amount);
  c.tempHp -= absorbed;
  c.hp = Math.max(0, c.hp - (amount - absorbed));
  return { taken: amount };
}
export function concentrationDC(damage: number) {
  return Math.max(10, Math.floor(damage / 2));
}
export function isConcentrating(c: Combatant) {
  return c.tags.some((t) => t.concentration);
}
export function endConcentration(c: Combatant) {
  c.tags = c.tags.filter((t) => !t.concentration);
  syncConditions(c);
}
export function constitutionMod(c: Combatant) {
  return Math.floor((num(c.stat.Abilities?.Con, 10) - 10) / 2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/model.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "$(cat <<'EOF'
feat: prompt concentration from the damage amount

A concentrator who eats a hit needs the 5e DC, including temp HP, not a leftover label.
EOF
)"
```

---

### Task 3: Persistent characters

**Files:**
- Modify: `src/model.ts` (`importOriginal`, `createCombatant` optional persistentId, new helpers)
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: `PersistentCharacter`, `Combatant.persistentId`
- Produces: `upsertHeroFromStat(characters, stat, hp, notes)`, `addHeroToEncounter(e, hero)`, `syncPersistentHp(characters, c)`, `importOriginal` fills `characters`

- [ ] **Step 1: Write the failing test**

```ts
test("persistent characters keep HP across encounters and import CurrentHP", () => {
  const characters: PersistentCharacter[] = [];
  const hero = upsertHeroFromStat(characters, { ...stat, Name: "Hero", Player: "player" }, 5, "secret");
  assert.equal(characters.length, 1);
  assert.equal(hero.currentHp, 5);
  const e1 = emptyEncounter();
  const c = addHeroToEncounter(e1, hero);
  assert.equal(c.hp, 5);
  assert.equal(c.persistentId, hero.id);
  applyHP(c, 2, "heal");
  syncPersistentHp(characters, c);
  assert.equal(characters[0].currentHp, 7);
  const e2 = emptyEncounter();
  const again = addHeroToEncounter(e2, characters[0]);
  assert.equal(again.hp, 7);
  const raw = {
    "PersistentCharacters.a": {
      Id: "a",
      Name: "Hero",
      CurrentHP: 5,
      Notes: "secret",
      StatBlock: stat,
    },
  };
  const imported = importOriginal(raw);
  assert.equal(imported.characters.length, 1);
  assert.equal(imported.characters[0].currentHp, 5);
  assert.equal(imported.library.filter((s) => s.Player).length, 1);
});
```

Update the existing import test to also `assert.equal(r.characters.length, 1)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/model.test.ts -t "persistent characters"`

Expected: FAIL — helpers missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export function upsertHeroFromStat(
  characters: PersistentCharacter[],
  stat: StatBlock,
  currentHp?: number,
  notes = "",
): PersistentCharacter {
  const maxHp = Math.max(1, num(stat.HP?.Value, 1));
  const existing = characters.find((h) => h.id === stat.Id || h.stat.Id === stat.Id);
  const record: PersistentCharacter = existing || {
    id: stat.Id || id(),
    stat: { ...structuredClone(stat), Player: "player" },
    currentHp: maxHp,
    maxHp,
    notes,
  };
  record.stat = { ...structuredClone(stat), Player: "player" };
  record.maxHp = maxHp;
  record.currentHp = clamp(
    currentHp === undefined ? record.currentHp : num(currentHp),
    0,
    maxHp,
  );
  record.notes = notes || record.notes;
  if (!existing) characters.push(record);
  return record;
}
export function addHeroToEncounter(e: Encounter, hero: PersistentCharacter): Combatant {
  const c = createCombatant(hero.stat, "ally");
  c.persistentId = hero.id;
  c.hp = clamp(hero.currentHp, 0, c.maxHp);
  c.notes = hero.notes;
  e.combatants.push(c);
  return c;
}
export function syncPersistentHp(characters: PersistentCharacter[], c: Combatant) {
  const hero = characters.find((h) => h.id === c.persistentId);
  if (!hero) return;
  hero.currentHp = c.hp;
  hero.maxHp = c.maxHp;
  hero.notes = c.notes;
}
```

In `importOriginal`, initialize `characters: PersistentCharacter[] = []`. When seeing PersistentCharacters keys, also `upsertHeroFromStat(characters, normalizeOriginalStat(v.StatBlock), v.CurrentHP, v.Notes || "")` with `Id: v.Id`. Return `{ library, spells, saved, encounter, characters }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/model.test.ts`

Expected: PASS. Existing import test still has `r.library.length === 2`.

- [ ] **Step 5: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "$(cat <<'EOF'
feat: keep hero hit points between encounters

Party HP was cloning the stat block every fight; persistent records carry current HP into the next scene.
EOF
)"
```

---

### Task 4: Linked initiative and manual reorder

**Files:**
- Modify: `src/model.ts` (`ordered`, new helpers)
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: `Combatant.sortIndex`, `Combatant.initiativeGroup`
- Produces: `ordered` uses sortIndex then initiative then modifier then id; `linkInitiative`; `unlinkInitiative`; `rollCombatantInitiative`; `rollEncounterInitiative`; `reindexSort`; `moveCombatant`

- [ ] **Step 1: Write the failing test**

```ts
test("linked combatants share one roll; move up swaps sortIndex including a group block", () => {
  const e = emptyEncounter();
  const a = createCombatant(stat);
  const b = createCombatant(stat);
  const c = createCombatant({ ...stat, Name: "Wolf" });
  a.initiative = 12;
  b.initiative = 8;
  c.initiative = 8;
  e.combatants = [a, b, c];
  linkInitiative(e, [b.id, c.id]);
  assert.equal(b.initiativeGroup, c.initiativeGroup);
  rollCombatantInitiative(e, b, () => 0.99);
  assert.equal(b.initiative, c.initiative);
  assert.equal(b.initiative, 20 + 2);
  reindexSort(e);
  assert.equal(ordered(e)[0].id, b.id);
  moveCombatant(e, a.id, -1);
  assert.equal(ordered(e)[0].id, a.id);
  moveCombatant(e, b.id, -1);
  const order = ordered(e).map((x) => x.name);
  assert.equal(order[0], "Goblin");
});
```

Use distinct names: `a.Name` stay Goblin, `c.Name` Wolf, and after linking b+c (two goblins and a wolf) — set `b.name = "Goblin B"`. Simpler assertion:

```ts
test("linked combatants share one roll and move as a block", () => {
  const e = emptyEncounter();
  const leader = createCombatant({ ...stat, Name: "Pack" });
  const mate = createCombatant({ ...stat, Name: "Pack" });
  const hero = createCombatant({ ...stat, Name: "Hero", Player: "player" });
  leader.initiative = 5;
  mate.initiative = 5;
  hero.initiative = 10;
  e.combatants = [leader, mate, hero];
  linkInitiative(e, [leader.id, mate.id]);
  rollCombatantInitiative(e, leader, () => 0);
  assert.equal(leader.initiative, mate.initiative);
  assert.equal(leader.initiative, 3);
  reindexSort(e);
  assert.equal(ordered(e)[0].id, hero.id);
  moveCombatant(e, leader.id, -1);
  assert.equal(ordered(e)[0].initiativeGroup, leader.initiativeGroup);
  assert.equal(ordered(e)[2].id, hero.id);
});
```

Keep the existing tie test: when all `sortIndex === 0`, `ordered()[0]` is still the higher modifier.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/model.test.ts -t "linked combatants"`

Expected: FAIL — `linkInitiative` missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export function ordered(e: Encounter) {
  return [...e.combatants].sort(
    (a, b) =>
      a.sortIndex - b.sortIndex ||
      b.initiative - a.initiative ||
      num(b.stat.InitiativeModifier) - num(a.stat.InitiativeModifier) ||
      a.id.localeCompare(b.id),
  );
}
export function reindexSort(e: Encounter) {
  ordered(e).forEach((c, i) => (c.sortIndex = i));
}
export function linkInitiative(e: Encounter, ids: string[]) {
  const members = e.combatants.filter((c) => ids.includes(c.id));
  if (members.length < 2) return;
  const group = members.find((c) => c.initiativeGroup)?.initiativeGroup || id();
  const initiative = members[0].initiative;
  for (const c of members) {
    c.initiativeGroup = group;
    c.initiative = initiative;
  }
}
export function unlinkInitiative(c: Combatant) {
  c.initiativeGroup = null;
}
export function rollCombatantInitiative(
  e: Encounter,
  c: Combatant,
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
) {
  const total = roll("1d20", random).total + num(c.stat.InitiativeModifier);
  const group = c.initiativeGroup;
  for (const other of e.combatants) {
    if (other.id === c.id || (group && other.initiativeGroup === group))
      other.initiative = total;
  }
  return total;
}
export function rollEncounterInitiative(
  e: Encounter,
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
) {
  const seen = new Set<string>();
  for (const c of e.combatants) {
    const key = c.initiativeGroup || c.id;
    if (seen.has(key)) continue;
    seen.add(key);
    rollCombatantInitiative(e, c, random);
  }
  const ranked = [...e.combatants].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      num(b.stat.InitiativeModifier) - num(a.stat.InitiativeModifier) ||
      a.id.localeCompare(b.id),
  );
  ranked.forEach((c, i) => (c.sortIndex = i));
}
function groupBlock(list: Combatant[], index: number) {
  const group = list[index].initiativeGroup;
  if (!group) return { start: index, end: index };
  let start = index;
  let end = index;
  while (start > 0 && list[start - 1].initiativeGroup === group) start--;
  while (end < list.length - 1 && list[end + 1].initiativeGroup === group) end++;
  return { start, end };
}
export function moveCombatant(e: Encounter, combatantId: string, direction: -1 | 1) {
  if (e.combatants.every((c) => c.sortIndex === 0)) reindexSort(e);
  const list = ordered(e);
  const index = list.findIndex((c) => c.id === combatantId);
  if (index < 0) return;
  const block = groupBlock(list, index);
  const swapWith = direction < 0 ? block.start - 1 : block.end + 1;
  if (swapWith < 0 || swapWith >= list.length) return;
  const other = groupBlock(list, swapWith);
  const moving = list.slice(block.start, block.end + 1);
  const neighbor = list.slice(other.start, other.end + 1);
  const next =
    direction < 0
      ? [...list.slice(0, other.start), ...moving, ...neighbor, ...list.slice(block.end + 1)]
      : [...list.slice(0, block.start), ...neighbor, ...moving, ...list.slice(other.end + 1)];
  next.forEach((c, i) => (c.sortIndex = i));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/model.test.ts`

Expected: PASS. Existing tie test still uses `sortIndex === 0` so modifier decides.

- [ ] **Step 5: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "$(cat <<'EOF'
feat: share initiative rolls and reorder by hand

Swarms need one d20, and fiction sometimes overrides the number; sortIndex carries both.
EOF
)"
```

---

### Task 5: Quick Add and clean encounter

**Files:**
- Modify: `src/model.ts`
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: `createCombatant`, `removeCombatant`, `PersistentCharacter`
- Produces: `quickAddCombatant(name, hp)`, `cleanEncounter(e, characters)`

- [ ] **Step 1: Write the failing test**

```ts
test("quick add builds a nameless mook; clean strips dead enemies and restores ally HP", () => {
  const mook = quickAddCombatant("Bandit", 12);
  assert.equal(mook.name, "Bandit");
  assert.equal(mook.hp, 12);
  assert.equal(mook.ac, 10);
  assert.equal(mook.side, "enemy");
  assert.equal(mook.stat.Type, "Quick add");
  assert.throws(() => quickAddCombatant("  ", 12));
  assert.throws(() => quickAddCombatant("Bandit", 0));
  const e = emptyEncounter();
  const heroStat = { ...stat, Name: "Hero", Player: "player" };
  const characters: PersistentCharacter[] = [];
  const hero = upsertHeroFromStat(characters, heroStat, 4);
  const pc = addHeroToEncounter(e, hero);
  const dead = createCombatant(stat);
  const living = createCombatant(stat);
  dead.hp = 0;
  living.hp = 3;
  pc.tempHp = 2;
  e.combatants.push(dead, living);
  e.started = true;
  e.round = 2;
  e.activeId = dead.id;
  cleanEncounter(e, characters);
  assert.equal(e.combatants.some((c) => c.id === dead.id), false);
  assert.equal(living.hp, 3);
  assert.equal(pc.hp, pc.maxHp);
  assert.equal(pc.tempHp, 0);
  assert.equal(characters[0].currentHp, pc.maxHp);
  assert.equal(e.round, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/model.test.ts -t "quick add"`

Expected: FAIL — `quickAddCombatant` missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export function quickAddCombatant(name: string, hp: number): Combatant {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a name.");
  if (!Number.isFinite(hp) || hp < 1) throw new Error("Enter a positive HP value.");
  return createCombatant(
    {
      Id: id(),
      Name: trimmed,
      Type: "Quick add",
      HP: { Value: Math.floor(hp) },
      AC: { Value: 10 },
      InitiativeModifier: 0,
    },
    "enemy",
  );
}
export function cleanEncounter(e: Encounter, characters: PersistentCharacter[]) {
  const deadEnemies = e.combatants.filter((c) => c.side === "enemy" && c.hp === 0);
  for (const dead of deadEnemies) removeCombatant(e, dead.id);
  for (const c of e.combatants) {
    if (c.side !== "ally" && !c.persistentId) continue;
    c.hp = c.maxHp;
    c.tempHp = 0;
    syncPersistentHp(characters, c);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/model.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "$(cat <<'EOF'
feat: quick-add mooks and clean the table after a fight

Nameless 12 HP bandits should not require a stat-block editor, and PCs should stand up without a new encounter.
EOF
)"
```

---

### Task 6: Encounter difficulty

**Files:**
- Create: `src/difficulty.ts`
- Test: `tests/difficulty.test.ts`

**Interfaces:**
- Consumes: `Encounter`, `PartyBudget`, `Combatant.stat.Challenge`, `side`, `hp`
- Produces: `xpFromChallenge(cr: string | undefined): number`; `encounterDifficulty(e, party): { xp: number; label: "Trivial" | "Easy" | "Medium" | "Hard" | "Deadly" | "—" }`

- [ ] **Step 1: Write the failing test**

Create `tests/difficulty.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCombatant, emptyEncounter } from "../src/model.ts";
import { encounterDifficulty, xpFromChallenge } from "../src/difficulty.ts";

test("CR maps to SRD XP and party of 4 level 3 rates a living CR 2 as Easy", () => {
  assert.equal(xpFromChallenge("1/4"), 50);
  assert.equal(xpFromChallenge("2"), 450);
  assert.equal(xpFromChallenge("nope"), 0);
  const e = emptyEncounter();
  const wolf = createCombatant({
    Id: "w",
    Name: "Wolf",
    HP: { Value: 11 },
    Challenge: "1/4",
  });
  const ogre = createCombatant({
    Id: "o",
    Name: "Ogre",
    HP: { Value: 59 },
    Challenge: "2",
  });
  e.combatants = [wolf, ogre];
  const party = { size: 4, level: 3 };
  assert.equal(encounterDifficulty(e, party).xp, 500);
  assert.equal(encounterDifficulty(e, party).label, "Easy");
  ogre.hp = 0;
  assert.equal(encounterDifficulty(e, party).xp, 50);
  assert.equal(encounterDifficulty(e, party).label, "Trivial");
  wolf.hp = 0;
  assert.equal(encounterDifficulty(e, party).label, "—");
});
```

Easy for 4×3 is 300, Medium 600. 500 XP is Easy. 50 XP is Trivial.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/difficulty.test.ts`

Expected: FAIL — cannot find module `src/difficulty.ts`.

- [ ] **Step 3: Write minimal implementation**

`src/difficulty.ts`:

```ts
import type { Encounter, PartyBudget } from "./model";

const CR_XP: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

const PER_CHARACTER = [
  [0, 0, 0, 0],
  [25, 50, 75, 100],
  [50, 100, 150, 200],
  [75, 150, 225, 400],
  [125, 250, 375, 500],
  [250, 500, 750, 1100],
  [300, 600, 900, 1400],
  [350, 750, 1100, 1700],
  [450, 900, 1400, 2100],
  [550, 1100, 1600, 2400],
  [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600],
  [1000, 2000, 3000, 4500],
  [1100, 2200, 3400, 5100],
  [1250, 2500, 3800, 5700],
  [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200],
  [2000, 3900, 5900, 8800],
  [2100, 4200, 6300, 9500],
  [2400, 4900, 7300, 10900],
  [2800, 5700, 8500, 12700],
];

export function xpFromChallenge(cr: string | undefined) {
  if (!cr) return 0;
  return CR_XP[String(cr).trim()] ?? 0;
}

export function encounterDifficulty(e: Encounter, party: PartyBudget) {
  const living = e.combatants.filter((c) => c.side === "enemy" && c.hp > 0);
  if (!living.length) return { xp: 0, label: "—" as const };
  const xp = living.reduce((sum, c) => sum + xpFromChallenge(c.stat.Challenge), 0);
  const level = Math.min(20, Math.max(1, Math.floor(party.level) || 1));
  const size = Math.min(12, Math.max(1, Math.floor(party.size) || 1));
  const [easy, medium, hard, deadly] = PER_CHARACTER[level].map((n) => n * size);
  let label: "Trivial" | "Easy" | "Medium" | "Hard" | "Deadly" = "Trivial";
  if (xp >= deadly) label = "Deadly";
  else if (xp >= hard) label = "Hard";
  else if (xp >= medium) label = "Medium";
  else if (xp >= easy) label = "Easy";
  return { xp, label };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/difficulty.test.ts tests/model.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/difficulty.ts tests/difficulty.test.ts
git commit -m "$(cat <<'EOF'
feat: rate the live encounter against party XP budgets

Ally and enemy counts do not tell the DM if a CR 2 is a problem for this table.
EOF
)"
```

---

### Task 7: Player projection

**Files:**
- Create: `src/projection.ts`
- Test: `tests/projection.test.ts`

**Interfaces:**
- Consumes: `ordered`, `Encounter`, `Tag.hidden`, `Combatant.revealedAC`, `Combatant.hidden`
- Produces: `PlayerProjection` and `projectEncounter(e): PlayerProjection`

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addTag, createCombatant, emptyEncounter } from "../src/model.ts";
import { projectEncounter } from "../src/projection.ts";

const stat = {
  Id: "g",
  Name: "Goblin",
  HP: { Value: 10 },
  AC: { Value: 15 },
  InitiativeModifier: 2,
};

test("projection hides hidden combatants and tags, reveals AC only when flagged", () => {
  const e = emptyEncounter("Vallaki");
  const vis = createCombatant(stat);
  const hid = createCombatant(stat);
  hid.hidden = true;
  vis.hp = 4;
  vis.revealedAC = true;
  addTag(vis, { text: "Bless", remainingRounds: 2 });
  addTag(vis, { text: "Hunter's mark", hidden: true });
  e.combatants = [vis, hid];
  e.round = 2;
  e.activeId = vis.id;
  const p = projectEncounter(e);
  assert.equal(p.name, "Vallaki");
  assert.equal(p.combatants.length, 1);
  assert.equal(p.combatants[0].ac, 15);
  assert.equal(p.combatants[0].health, "Bloodied");
  assert.deepEqual(p.combatants[0].conditions, ["Bless"]);
  vis.revealedAC = false;
  vis.hp = 0;
  const hiddenAc = projectEncounter(e).combatants[0];
  assert.equal(hiddenAc.ac, null);
  assert.equal(hiddenAc.health, "Down");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/projection.test.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```ts
import { ordered, type Encounter } from "./model";

export function projectEncounter(e: Encounter) {
  return {
    name: e.name,
    round: e.round,
    activeId: e.activeId,
    combatants: ordered(e)
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        name: c.name,
        side: c.side,
        initiative: c.initiative,
        ac: c.revealedAC ? c.ac : null,
        conditions: c.tags.filter((t) => !t.hidden).map((t) => t.text),
        health: c.hp === 0 ? "Down" : c.hp <= c.maxHp / 2 ? "Bloodied" : "Healthy",
      })),
  };
}
export type PlayerProjection = ReturnType<typeof projectEncounter>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/projection.ts tests/projection.test.ts
git commit -m "$(cat <<'EOF'
feat: project per-creature AC and visible tags to players

The player window must be able to show one ogre's AC without leaking every sheet.
EOF
)"
```

---

### Task 8: Undo snapshot includes characters; validate party bounds

**Files:**
- Modify: `src/model.ts` (`validateState` party size/level)
- Modify: `src/main.ts` (`history` type, `change`, `undo`)
- Test: `tests/model.test.ts` (party bounds). UI history is asserted by a small exported helper if needed — do **not** export UI. Add `cloneTable(state)` in model:

**Interfaces:**
- Consumes: `State.characters`, `State.party`
- Produces: `TableSnapshot`, `snapshotTable(state)`, `restoreTable(state, snap)`; `validateState` clamps or rejects party outside 1–12 / 1–20 — **reject** out of range on import, **default** when missing

- [ ] **Step 1: Write the failing test**

```ts
test("party budget defaults and rejects out of range; snapshot restores hero HP", () => {
  const s: State = {
    version: 1,
    encounter: emptyEncounter(),
    library: [],
    spells: [],
    saved: [],
    characters: [],
    updatedAt: "",
  };
  const v = validateState(s);
  assert.equal(v.party.size, 4);
  assert.equal(v.party.level, 3);
  v.party.size = 99;
  assert.throws(() => validateState(v));
  const characters: PersistentCharacter[] = [];
  const hero = upsertHeroFromStat(characters, { ...stat, Name: "Hero", Player: "player" }, 10);
  const e = emptyEncounter();
  const c = addHeroToEncounter(e, hero);
  const table = { encounter: e, characters };
  const snap = snapshotTable(table);
  applyHP(c, 9, "damage");
  syncPersistentHp(characters, c);
  restoreTable(table, snap);
  assert.equal(table.encounter.combatants[0].hp, 10);
  assert.equal(table.characters[0].currentHp, 10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/model.test.ts -t "party budget"`

Expected: FAIL — `snapshotTable` missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export type TableSnapshot = {
  encounter: Encounter;
  characters: PersistentCharacter[];
};
export function snapshotTable(table: {
  encounter: Encounter;
  characters: PersistentCharacter[];
}): TableSnapshot {
  return structuredClone(table);
}
export function restoreTable(
  table: { encounter: Encounter; characters: PersistentCharacter[] },
  snap: TableSnapshot,
) {
  table.encounter = structuredClone(snap.encounter);
  table.characters = structuredClone(snap.characters);
}
```

In `validateState`, after defaults, if `party.size` not integer 1–12 or `party.level` not integer 1–20, throw `Invalid party budget.`

In `src/main.ts`:

```ts
history: TableSnapshot[] = [];
function change(fn: () => void, message?: string) {
  history.push(snapshotTable({ encounter: state.encounter, characters: state.characters }));
  ...
}
case "undo": {
  const previous = history.pop();
  if (previous) {
    restoreTable(state, previous);
    persist();
    render();
    toast("Last action undone.");
  }
}
```

`state` must always have `characters` (init and validate). Init empty state includes `characters: []` and `party: { size: 4, level: 3 }`. After bootstrap import, `state.characters = imported.characters || []`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model.ts src/main.ts tests/model.test.ts
git commit -m "$(cat <<'EOF'
feat: undo persistent HP with the encounter snapshot

Hero write-through has to roll back with the table or undo lies about the party.
EOF
)"
```

---

### Task 9: Tag picker, chips, and concentration dialog

**Files:**
- Modify: `src/main.ts` (conditions modal, combatant chips, `hp-form`)
- Modify: `src/style.css` (duration suffix on chips — use existing `.condition-chip`, add `small` inside)
- Test: `tests/model.test.ts` already covers rules. After UI wiring, run `npm test`. Manually grep that `projection()` in main uses `projectEncounter`.

**Interfaces:**
- Consumes: `addTag`, `tickTags` via `advance`, `applyHP` return, `isConcentrating`, `concentrationDC`, `endConcentration`, `constitutionMod`, `roll`
- Produces: UI only

- [ ] **Step 1: Replace main.ts projection()**

```ts
import { projectEncounter } from "./projection";
function broadcast() {
  channel.postMessage({ type: "state", data: projectEncounter(state.encounter) });
}
```

Delete the local `projection()` body.

- [ ] **Step 2: Tag chips and picker**

Combatant row `small` text uses `c.conditions` (already synced). Chip label: if `remainingRounds !== null` show `${text} · ${remainingRounds}`.

Replace `case "conditions"` body so the form includes:

```html
<label>Duration in rounds<input name="rounds" type="number" min="1" max="99" placeholder="Until removed"></label>
<label>Ticks<select name="timing"><option value="end">End of turn</option><option value="start">Start of turn</option></select></label>
<label>Whose turn<select name="until">${e.combatants.map(x => `<option value="${x.id}" ${x.id===c.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label>
<label class="check"><input type="checkbox" name="hidden"> Hidden from players</label>
<label class="check"><input type="checkbox" name="concentration"> Concentration</label>
```

Preset buttons still `toggle-condition` for untimed labels (including Concentration preset which sets `concentration: true`).

`condition-form` submit: `addTag` with rounds empty → `remainingRounds: null`.

`remove-condition` should remove by `data-tag` id, not text (two Bless tags). Update chips to `data-tag="${tag.id}"` and filter `c.tags = c.tags.filter(t => t.id !== el.dataset.tag)`.

- [ ] **Step 3: Concentration prompt**

```ts
function concentrationModal(c: Combatant, taken: number) {
  const dc = concentrationDC(taken);
  openModal(
    `${esc(c.name)} is concentrating`,
    `<p>DC ${dc} Constitution saving throw (took ${taken} damage).</p>
     <div class="modal-actions">
       ${btn("concentration-keep", "Pass", undefined, "secondary")}
       ${btn("concentration-roll", "Roll", "Dices", "secondary")}
       ${btn("concentration-fail", "Fail", undefined, "primary")}
     </div>`,
  );
}
```

In `hp-form`, capture `const result = applyHP(...)` inside `change`, and after `change` returns, if `mode === "damage" && isConcentrating(c) && result.taken > 0` call `concentrationModal(c, result.taken)`.

Problem: `result` inside `change` callback. Structure:

```ts
let taken = 0;
change(() => {
  taken = applyHP(c, amount, mode).taken;
}, logMessage);
if (mode === "damage" && taken > 0 && isConcentrating(c)) concentrationModal(c, taken);
```

`concentration-fail`: `change(() => endConcentration(c), `${c.name} lost concentration.`)`.
`concentration-keep`: `closeModal()`.
`concentration-roll`: `const total = roll("1d20").total + constitutionMod(c)`; if `total >= dc` toast pass and close; else fail path.

Closing the dialog without a button keeps concentration (native dialog close / X).

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/style.css
git commit -m "$(cat <<'EOF'
feat: give conditions a duration clock and a concentration prompt

Mid-round Bless and stun have to expire on the turn they were anchored to, and damage has to ask about concentration.
EOF
)"
```

---

### Task 10: Heroes, Quick Add, reorder, difficulty, clean, reveal AC, party settings

**Files:**
- Modify: `src/main.ts` (library footer, heroes list, menus, summary, settings, commands)
- Modify: `src/style.css` (`.quick-add` footer form using existing inputs)
- Test: `npm test` plus TypeScript `npx tsc --noEmit`

**Interfaces:**
- Consumes: all model helpers from Tasks 3–6, `encounterDifficulty`, `projectEncounter`
- Produces: UI for the remaining eight table actions (persistent add, quick add, link, move, difficulty, clean, reveal AC, party budget)

- [ ] **Step 1: Heroes tab and save-as-hero**

`renderLibrary` when `tab === "characters"`: list `state.characters` first (`<small>${h.currentHp}/${h.maxHp} HP</small>`, add uses `addHeroToEncounter`). Then legacy `state.library.filter(s => s.Player)` that do not already have `characters.some(h => h.stat.Id === s.Id)`.

`case "add"`: if dataset.hero, `addHeroToEncounter`. Avoid duplicates: if encounter already has `persistentId === hero.id`, toast "Already in the encounter."

Combatant menu: `Save as hero` when `c.side === "ally"` → `upsertHeroFromStat(state.characters, c.stat, c.hp, c.notes); c.persistentId = hero.id`.

`add-party`: for each character not already in the encounter, `addHeroToEncounter`; also keep adding leftover Player library stats as today if they have no character record.

Init bootstrap: `state.characters = imported.characters || []`. For each imported Player library stat with `ImportedCurrentHP`, `upsertHeroFromStat` so existing campaigns gain records.

- [ ] **Step 2: Quick Add footer**

In `render()` library footer when `tab === "creatures"`:

```html
<form id="quick-add-form" class="quick-add">
  <input name="name" maxlength="80" placeholder="Quick add name" aria-label="Quick add name" required>
  <input name="hp" type="number" min="1" max="9999" value="10" aria-label="Quick add HP" required>
  <button class="primary" type="submit">Add</button>
</form>
```

Submit handler: `change(() => state.encounter.combatants.push(quickAddCombatant(name, hp)))`.

- [ ] **Step 3: Move, link, reveal, clean, difficulty, party**

Combatant menu additions (use existing `menu-actions`):

- `move-up` / `move-down` → `moveCombatant(e, c.id, -1 | 1)`
- `link-next` → link this combatant with the next row in `ordered()` (`linkInitiative(e, [c.id, next.id])`)
- `unlink-initiative` if `c.initiativeGroup`
- `reveal-ac` toggle `c.revealedAC`

Row name: if `initiativeGroup`, append `icon("Link", 12)`.

`roll-initiative` case: `rollEncounterInitiative(e)` instead of per-row independent rolls.

Battle summary third span: `const diff = encounterDifficulty(e, state.party);` then `${diff.label === "—" ? cs.length + " combatants" : diff.label + " · " + diff.xp + " XP"}`.

Command palette entry `{ action: "clean-encounter", label: "Clean encounter", hint: "Remove defeated enemies, restore allies" }`.

`case "clean-encounter"`: confirm modal then `change(() => cleanEncounter(e, state.characters), "Encounter cleaned.")`.

Settings: after storage metrics, section Encounter budget with `<input name="party-size">` and `party-level`. Use a form `id="party-form"` saved with `change(() => { state.party.size = clamp(num(size),1,12); state.party.level = clamp(num(level),1,20); })`. Because `change` snapshots characters+encounter, party edits can persist() directly without undo, or include party in snapshot. **Ruling already in spec: history is encounter+characters only.** Party form calls `persist(); render();` without `change()`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`

Expected: PASS, noEmit exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/style.css
git commit -m "$(cat <<'EOF'
feat: wire the table UI for heroes, mooks, order, and budget

The rules were inert until the DM could quick-add, link a pack, reveal AC, and clean the fight from the same chrome.
EOF
)"
```

---

### Task 11: LAN Socket.IO room

**Files:**
- Create: `src/room.mjs`
- Modify: `server.mjs`
- Modify: `package.json` (dependency `socket.io`)
- Test: `tests/room.test.ts`

**Interfaces:**
- Consumes: projection JSON
- Produces: `createRooms()` `{ update, get, drop }`; HTTP+Socket.IO server; `GET /api/player-info`; host allowlist; listen `0.0.0.0`

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRooms } from "../src/room.mjs";

test("room keeps the last projection until dropped", () => {
  const rooms = createRooms();
  assert.equal(rooms.get("r1"), undefined);
  rooms.update("r1", { name: "Vallaki" });
  assert.equal(rooms.get("r1").name, "Vallaki");
  rooms.update("r1", { name: "Village" });
  assert.equal(rooms.get("r1").name, "Village");
  rooms.drop("r1");
  assert.equal(rooms.get("r1"), undefined);
});
```

Also add `tests/server-host.test.ts` that imports exported `isLoopbackHost` and `isAllowedHost` from `server.mjs` — **do not** start listening in tests. Extract allowlist to `src/host.mjs` so tests do not boot the HTTP server.

Create `src/host.mjs`:

```js
export function hostname(host) {
  return String(host || "").split(":")[0].replace(/^\[|\]$/g, "");
}
export function isLoopbackHost(host) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname(host));
}
export function isAllowedHost(host) {
  const h = hostname(host);
  if (isLoopbackHost(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}
```

Test:

```ts
test("bootstrap stays loopback; LAN hosts are allowed for the table", () => {
  assert.equal(isLoopbackHost("127.0.0.1:5173"), true);
  assert.equal(isLoopbackHost("192.168.1.8:5173"), false);
  assert.equal(isAllowedHost("192.168.1.8"), true);
  assert.equal(isAllowedHost("10.0.0.2"), true);
  assert.equal(isAllowedHost("8.8.8.8"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/room.test.ts tests/host.test.ts`

Expected: FAIL — modules missing.

- [ ] **Step 3: Implement room, host, server**

`src/room.mjs`:

```js
export function createRooms() {
  const snapshots = new Map();
  return {
    update(roomId, projection) {
      if (!roomId) return;
      snapshots.set(roomId, projection);
    },
    get(roomId) {
      return snapshots.get(roomId);
    },
    drop(roomId) {
      snapshots.delete(roomId);
    },
  };
}
```

Install: `npm install socket.io`

In `server.mjs`:

- Import `{ Server } from "socket.io"`, `os`, `createRooms`, host helpers.
- Replace the Host 403: if `!isAllowedHost(req.headers.host)` → 403.
- `/api/bootstrap`: if `!isLoopbackHost(req.headers.host)` → 403.
- `/api/player-info`: loopback only; JSON `{ roomId query optional, urls }` using `os.networkInterfaces()` IPv4 non-internal plus 127.0.0.1, port from `process.env.PORT || 5173`. Query `?room=` required or return urls with `:id` placeholder — **require** `?room=` UUID, 400 if missing.
- `server.listen(port, "0.0.0.0", ...)`.
- After `http.createServer`, `const io = new Server(server, { cors: { origin: true } })` and `const rooms = createRooms()`.
- `join encounter` → `socket.join(roomId)` and if snapshot, emit `encounter updated`.
- `request encounter` → emit snapshot to that socket.
- `update encounter` → `rooms.update`; `io.to(roomId).emit("encounter updated", projection)`.
- `disconnect`: if room empty, `rooms.drop(roomId)`. Track rooms per socket via `socket.data.roomId` set on join.

Do not attach Socket.IO handlers to `/api/bootstrap`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS. Dev server is not started in unit tests.

- [ ] **Step 5: Commit**

```bash
git add src/room.mjs src/host.mjs server.mjs tests/room.test.ts tests/host.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: host a LAN Socket.IO room for the player view

Phones and TVs cannot use BroadcastChannel; the local server can share a projection without opening bootstrap.
EOF
)"
```

---

### Task 12: Player client `/p/`, share URL, docs

**Files:**
- Modify: `src/main.ts` (playerMode from path, socket.io-client emit on persist, renderPlayer AC, settings copy link)
- Modify: `package.json` (`socket.io-client`)
- Modify: `README.md`, `docs/ANALISE.md` (player view paragraph)
- Test: `npm test && npm run build`

**Interfaces:**
- Consumes: Socket.IO events from Task 11, `projectEncounter`, `GET /api/player-info`
- Produces: `/p/{id}` player tab; DM emit; help copy; lock skip for `/p/`

- [ ] **Step 1: Install client and detect room**

`npm install socket.io-client`

```ts
import { io } from "socket.io-client";
const playerRoom = location.pathname.match(/^\/p\/([^/]+)\/?$/)?.[1] || "";
const playerMode = new URLSearchParams(location.search).has("player") || !!playerRoom;
let tableSocket: ReturnType<typeof io> | null = null;
```

Player `/p/` init: connect `io()`, emit `join encounter` then `request encounter`. On `encounter updated`, `renderPlayer`. On connect_error, waiting copy: `Cannot reach the table. Is RoundKeep running on this network?`

`/?player` stays BroadcastChannel only (no socket).

- [ ] **Step 2: DM emit and share**

After `broadcast()` in `persist()`, if `tableSocket` connected, `tableSocket.emit("update encounter", state.encounter.id, projectEncounter(state.encounter))`.

On DM `init()` after render, `tableSocket = io(); tableSocket.emit("join encounter", state.encounter.id);` then emit update so late joiners get a snapshot.

`case "player"`: `window.open("/p/" + state.encounter.id, "roundkeep-player-view")`.

Settings / player modal: fetch `/api/player-info?room=${id}` when Host is loopback; list URLs with a Copy button (`navigator.clipboard.writeText`). If fetch fails, show `location.origin + "/p/" + id`.

`renderPlayer`: show `AC ${c.ac}` when `c.ac !== null && c.ac !== undefined`. Footer: `Room ${playerRoom || "local"}` instead of "Local sync only".

Help text: replace "It is not a remote session link." with "Share /p/ plus the room id on this network. Same-browser ?player still works."

Web Lock failure screen: link to `/p/` is optional; keep `/?player`.

- [ ] **Step 3: Docs**

README Features: Player view via `/p/{id}` on the LAN; BroadcastChannel fallback in this browser.

ANALISE explicit limits: strike "Player view is local" as absolute; write "Player view is a LAN Socket.IO room plus same-browser BroadcastChannel. Not a public cloud room. Bootstrap remains loopback-only."

- [ ] **Step 4: Run tests and production build**

Run: `npm test && npm run build`

Expected: tests PASS, `tsc --noEmit` via build PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts package.json package-lock.json README.md docs/ANALISE.md
git commit -m "$(cat <<'EOF'
feat: open a shareable /p/ player view on the LAN

The table already knew the round; players on another device needed the room URL Improved Initiative has.
EOF
)"
```

---

## Self-review

1. **Spec coverage:** Timed tags T1+T9; concentration T2+T9; persistent T3+T8+T10; linked initiative T4+T10; Quick Add T5+T10; remote `/p/` T11+T12; difficulty T6+T10; reveal AC T7+T10+T12; manual reorder T4+T10; clean+restore T5+T10. Out of scope items have no tasks.
2. **Placeholders:** none. Host allowlist, XP tables, Socket.IO event names, and UI copy are specified.
3. **Type consistency:** `Tag`, `PersistentCharacter`, `PartyBudget`, `TableSnapshot`, `projectEncounter`, `createRooms`, `isAllowedHost` names match across tasks.
4. **Review Focus:** each of the five lines has a test in Tasks 1, 2, 7, and 11.

## Execution

User directed subagent-driven execution with parallel agents when possible. Model tasks 1–7 are sequential on `src/model.ts` (except Task 6 and 7 which add new files after Task 1 types exist). Task 6 (`difficulty.ts`) may run after Task 1 defaults exist; it does not edit `model.ts` — **Ruling: run Task 6 after Task 1 so `createCombatant` has `tags`.** Task 7 after Task 1. Do not parallelize edits to `src/main.ts` or `server.mjs`.
