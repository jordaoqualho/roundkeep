export interface Feature {
  Name: string;
  Content: string;
  Usage?: string;
}
export interface StatBlock {
  Id: string;
  Name: string;
  Type?: string;
  Source?: string;
  Path?: string;
  HP?: { Value: number; Notes?: string };
  AC?: { Value: number; Notes?: string };
  InitiativeModifier?: number;
  Abilities?: Record<string, number>;
  Speed?: string[];
  Challenge?: string;
  Traits?: Feature[];
  Actions?: Feature[];
  Reactions?: Feature[];
  LegendaryActions?: Feature[];
  Description?: string;
  Player?: string;
  [key: string]: unknown;
}
export interface Spell {
  Id: string;
  Name: string;
  Level: number;
  School: string;
  Description: string;
  CastingTime: string;
  Range: string;
  Duration: string;
  Components: string;
  Source?: string;
  [key: string]: unknown;
}
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
export interface Combatant {
  id: string;
  stat: StatBlock;
  name: string;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  initiative: number;
  side: "ally" | "enemy";
  conditions: string[];
  tags: Tag[];
  sortIndex: number;
  initiativeGroup: string | null;
  persistentId: string | null;
  revealedAC: boolean;
  notes: string;
  hidden: boolean;
  reaction: boolean;
}
export interface Encounter {
  id: string;
  name: string;
  combatants: Combatant[];
  activeId: string | null;
  round: number;
  started: boolean;
  notes: string;
  log: string[];
}
export interface State {
  version: 1;
  encounter: Encounter;
  library: StatBlock[];
  spells: Spell[];
  saved: Encounter[];
  characters: PersistentCharacter[];
  party: PartyBudget;
  sourceBackup?: unknown;
  importRevision?: number;
  updatedAt: string;
}
export const id = () => crypto.randomUUID();
export const num = (v: unknown, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
export function emptyEncounter(name = "New encounter"): Encounter {
  return {
    id: id(),
    name,
    combatants: [],
    activeId: null,
    round: 0,
    started: false,
    notes: "",
    log: [],
  };
}
export function createCombatant(
  stat: StatBlock,
  side: "ally" | "enemy" = "enemy",
): Combatant {
  const maxHp = Math.max(1, num(stat.HP?.Value, 1));
  return {
    id: id(),
    stat: structuredClone(stat),
    name: stat.Name,
    hp: maxHp,
    maxHp,
    tempHp: 0,
    ac: num(stat.AC?.Value, 10),
    initiative: num(stat.InitiativeModifier),
    side,
    conditions: [],
    tags: [],
    sortIndex: 0,
    initiativeGroup: null,
    persistentId: null,
    revealedAC: false,
    notes: "",
    hidden: false,
    reaction: false,
  };
}
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
      if (t.untilCombatantId !== combatantId || t.timing !== phase)
        return true;
      if (t.remainingRounds === null) return true;
      t.remainingRounds -= 1;
      return t.remainingRounds > 0;
    });
    syncConditions(c);
  }
}
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
export function ordered(e: Encounter) {
  return [...e.combatants].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      num(b.stat.InitiativeModifier) - num(a.stat.InitiativeModifier),
  );
}
export function advance(e: Encounter, direction = 1) {
  const list = ordered(e);
  if (!list.length) return;
  if (!e.started) {
    e.started = true;
    e.round = 1;
    e.activeId = list[0].id;
    return;
  }
  if (direction > 0 && e.activeId) {
    tickTags(e, "end", e.activeId);
  }
  const pos = list.findIndex((c) => c.id === e.activeId);
  let next = pos + direction;
  if (next >= list.length) {
    next = 0;
    e.round++;
  }
  if (next < 0) {
    if (e.round <= 1) {
      next = 0;
    } else {
      next = list.length - 1;
      e.round--;
    }
  }
  e.activeId = list[next].id;
  if (direction > 0) {
    list[next].reaction = false;
    tickTags(e, "start", e.activeId);
  }
}
export function removeCombatant(e: Encounter, combatantId: string) {
  const list = ordered(e),
    pos = list.findIndex((c) => c.id === combatantId);
  if (e.activeId === combatantId) {
    const next = list[(pos + 1) % list.length];
    e.activeId = next?.id === combatantId ? null : (next?.id ?? null);
    if (pos === list.length - 1 && list.length > 1) e.round++;
  }
  e.combatants = e.combatants.filter((c) => c.id !== combatantId);
  if (!e.combatants.length) {
    e.started = false;
    e.round = 0;
    e.activeId = null;
  }
}
export function roll(
  expression: string,
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
) {
  const m = expression
    .replace(/\s/g, "")
    .match(/^(\d{0,3})d(\d{1,4})([+-]\d{1,4})?$/i);
  if (!m) throw new Error("Use dice like 1d20+3 or 2d6.");
  const count = Number(m[1] || 1),
    sides = Number(m[2]),
    modifier = Number(m[3] || 0);
  if (count < 1 || count > 100 || sides < 2 || sides > 1000)
    throw new Error("Use 1 to 100 dice with 2 to 1,000 sides.");
  const dice = Array.from(
    { length: count },
    () => Math.floor(random() * sides) + 1,
  );
  return { dice, modifier, total: dice.reduce((a, b) => a + b, 0) + modifier };
}
export function normalizeOriginalStat(s: StatBlock): StatBlock {
  return {
    ...s,
    InitiativeModifier:
      num(s.InitiativeModifier) +
      Math.floor((num(s.Abilities?.Dex, 10) - 10) / 2),
  };
}
export function importOriginal(raw: Record<string, unknown>) {
  const library: StatBlock[] = [],
    spells: Spell[] = [],
    saved: Encounter[] = [];
  let encounter: Encounter | undefined;
  for (const [key, input] of Object.entries(raw)) {
    let v: any = input;
    try {
      if (typeof v === "string") v = JSON.parse(v);
    } catch {
      continue;
    }
    if (!v || typeof v !== "object") continue;
    if (
      key.startsWith("Creatures.") ||
      key.startsWith("ImprovedInitiative.Creatures.")
    ) {
      if (typeof v.Name === "string")
        library.push(normalizeOriginalStat({ ...v, Id: v.Id || key }));
    }
    if (
      key.startsWith("PersistentCharacters.") ||
      key.startsWith("ImprovedInitiative.PersistentCharacters.")
    ) {
      if (v.StatBlock?.Name)
        library.push({
          ...normalizeOriginalStat(v.StatBlock),
          Id: v.Id || key,
          Name: v.Name || v.StatBlock.Name,
          Player: "player",
          ImportedCurrentHP: v.CurrentHP,
          ImportedNotes: v.Notes,
        });
    }
    if (key.startsWith("Spells.") && v.Name)
      spells.push({ ...v, Id: v.Id || key });
    if (key.includes("SavedEncounters.") && Array.isArray(v.Combatants)) {
      const e = emptyEncounter(v.Name || "Imported encounter");
      e.notes = v.Notes || "";
      e.combatants = v.Combatants.filter((x: any) => x.StatBlock?.Name).map(
        (x: any) => ({
          ...createCombatant(
            normalizeOriginalStat(x.StatBlock),
            x.StatBlock.Player ? "ally" : "enemy",
          ),
          id: x.Id || id(),
          name: x.Alias || x.StatBlock.Name,
          hp: clamp(
            num(x.CurrentHP),
            0,
            Math.max(1, num(x.StatBlock.HP?.Value, 1)),
          ),
          tempHp: Math.max(0, num(x.TemporaryHP)),
          initiative: num(x.Initiative),
          conditions: (x.Tags || []).map((t: any) => String(t.Text)),
          notes: x.CurrentNotes || "",
          hidden: !!x.Hidden,
        }),
      );
      e.activeId = e.combatants.some((c) => c.id === v.ActiveCombatantId)
        ? v.ActiveCombatantId
        : null;
      e.round = Math.max(0, num(v.RoundCounter));
      e.started = !!e.activeId;
      if (key.includes("AutoSaved")) encounter = e;
      else saved.push(e);
    }
  }
  return { library, spells, saved, encounter };
}
function validateStat(s: StatBlock) {
  if (!s || typeof s.Name !== "string" || typeof s.Id !== "string")
    throw new Error("Invalid stat block.");
  for (const key of [
    "Speed",
    "DamageResistances",
    "DamageImmunities",
    "ConditionImmunities",
    "DamageVulnerabilities",
    "Senses",
    "Languages",
  ]) {
    const v = s[key];
    if (
      v !== undefined &&
      (!Array.isArray(v) || v.some((x) => typeof x !== "string"))
    )
      throw new Error("Invalid stat block list.");
  }
  for (const key of [
    "Traits",
    "Actions",
    "BonusActions",
    "Reactions",
    "LegendaryActions",
    "MythicActions",
  ]) {
    const v = s[key];
    if (
      v !== undefined &&
      (!Array.isArray(v) ||
        v.some(
          (x) =>
            !x || typeof x.Name !== "string" || typeof x.Content !== "string",
        ))
    )
      throw new Error("Invalid stat block action.");
  }
  if (
    s.Abilities &&
    (typeof s.Abilities !== "object" ||
      Object.values(s.Abilities).some((x) => !Number.isFinite(x)))
  )
    throw new Error("Invalid abilities.");
}
export function validateState(input: unknown): State {
  const s = input as State;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.library) ||
    !Array.isArray(s.spells) ||
    !Array.isArray(s.saved)
  )
    throw new Error("Invalid RoundKeep backup.");
  s.characters ||= [];
  s.party ||= { size: 4, level: 3 };
  const validEncounter = (e: Encounter) => {
    if (
      !e ||
      typeof e.name !== "string" ||
      typeof e.notes !== "string" ||
      !Array.isArray(e.log) ||
      !Array.isArray(e.combatants) ||
      !Number.isInteger(e.round) ||
      e.round < 0
    )
      throw new Error("Invalid encounter.");
    const ids = new Set<string>();
    for (const c of e.combatants) {
      if (
        !c.stat ||
        typeof c.stat.Name !== "string" ||
        typeof c.id !== "string" ||
        ids.has(c.id) ||
        typeof c.name !== "string" ||
        !Array.isArray(c.conditions) ||
        typeof c.notes !== "string" ||
        ![c.hp, c.maxHp, c.tempHp, c.ac, c.initiative].every(Number.isFinite) ||
        c.maxHp < 1 ||
        c.hp < 0 ||
        c.hp > c.maxHp ||
        c.tempHp < 0
      )
        throw new Error("Invalid combatant.");
      validateStat(c.stat);
      if (
        c.conditions.some((x) => typeof x !== "string") ||
        !["ally", "enemy"].includes(c.side)
      )
        throw new Error("Invalid condition or side.");
      if (!Array.isArray(c.tags)) {
        c.tags = (c.conditions || [])
          .filter((x) => typeof x === "string")
          .map((text) => ({
            id: id(),
            text,
            remainingRounds: null,
            timing: "end" as const,
            untilCombatantId: c.id,
            hidden: false,
            concentration: /^concentration$/i.test(text),
          }));
      }
      if (typeof c.sortIndex !== "number") c.sortIndex = 0;
      if (c.initiativeGroup !== null && typeof c.initiativeGroup !== "string")
        c.initiativeGroup = null;
      if (c.initiativeGroup === undefined) c.initiativeGroup = null;
      if (c.persistentId !== null && typeof c.persistentId !== "string")
        c.persistentId = null;
      if (c.persistentId === undefined) c.persistentId = null;
      if (typeof c.revealedAC !== "boolean") c.revealedAC = false;
      for (const t of c.tags) {
        if (
          !t ||
          typeof t.id !== "string" ||
          typeof t.text !== "string" ||
          typeof t.untilCombatantId !== "string" ||
          typeof t.hidden !== "boolean" ||
          typeof t.concentration !== "boolean" ||
          (t.remainingRounds !== null &&
            (!Number.isInteger(t.remainingRounds) || t.remainingRounds < 0)) ||
          (t.timing !== "start" && t.timing !== "end")
        )
          throw new Error("Invalid tag.");
      }
      syncConditions(c);
      ids.add(c.id);
    }
    if (e.activeId && !ids.has(e.activeId)) throw new Error("Invalid turn.");
  };
  s.library.forEach(validateStat);
  validEncounter(s.encounter);
  s.saved.forEach(validEncounter);
  if (
    s.library.some(
      (x) => !x || typeof x.Name !== "string" || typeof x.Id !== "string",
    ) ||
    s.spells.some((x) => !x || typeof x.Name !== "string")
  )
    throw new Error("Invalid library.");
  return structuredClone(s);
}
