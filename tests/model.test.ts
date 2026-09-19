import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addTag,
  addHeroToEncounter,
  applyHP,
  concentrationDC,
  constitutionMod,
  createCombatant,
  emptyEncounter,
  advance,
  endConcentration,
  isConcentrating,
  ordered,
  removeCombatant,
  roll,
  importOriginal,
  syncPersistentHp,
  upsertHeroFromStat,
  validateState,
  type PersistentCharacter,
  type State,
  type Tag,
} from "../src/model.ts";
const stat = {
  Id: "goblin",
  Name: "Goblin",
  HP: { Value: 10 },
  AC: { Value: 12 },
  InitiativeModifier: 2,
  Abilities: { Dex: 14 },
};
test("temporary HP absorbs damage first; healing never exceeds maximum", () => {
  const c = createCombatant(stat);
  applyHP(c, 6, "temp");
  applyHP(c, 3, "temp");
  assert.equal(c.tempHp, 6);
  applyHP(c, 9, "damage");
  assert.equal(c.hp, 7);
  assert.equal(c.tempHp, 0);
  applyHP(c, 99, "heal");
  assert.equal(c.hp, 10);
  applyHP(c, 99, "damage");
  assert.equal(c.hp, 0);
  assert.throws(() => applyHP(c, -1, "damage"));
  assert.throws(() => applyHP(c, NaN, "heal"));
});
test("turns sort descending and round trips across round boundaries", () => {
  const e = emptyEncounter(),
    a = createCombatant(stat),
    b = createCombatant(stat);
  a.initiative = 5;
  b.initiative = 20;
  e.combatants = [a, b];
  advance(e);
  assert.equal(e.activeId, b.id);
  assert.equal(e.round, 1);
  advance(e);
  assert.equal(e.activeId, a.id);
  advance(e);
  assert.equal(e.activeId, b.id);
  assert.equal(e.round, 2);
  advance(e, -1);
  assert.equal(e.activeId, a.id);
  assert.equal(e.round, 1);
  advance(e, -1);
  advance(e, -1);
  assert.equal(e.round, 1);
  assert.equal(e.activeId, b.id);
});
test("initiative edits keep current combatant; ties use modifier", () => {
  const e = emptyEncounter(),
    a = createCombatant(stat),
    b = createCombatant({ ...stat, InitiativeModifier: 5 });
  a.initiative = b.initiative = 12;
  e.combatants = [a, b];
  assert.equal(ordered(e)[0].id, b.id);
  advance(e);
  a.initiative = 25;
  assert.equal(e.activeId, b.id);
  advance(e);
  assert.equal(e.activeId, a.id);
  assert.equal(e.round, 2);
});
test("removing active final combatant advances correctly and empty encounter resets", () => {
  const e = emptyEncounter(),
    a = createCombatant(stat),
    b = createCombatant(stat);
  a.initiative = 20;
  b.initiative = 10;
  e.combatants = [a, b];
  advance(e);
  advance(e);
  removeCombatant(e, b.id);
  assert.equal(e.activeId, a.id);
  assert.equal(e.round, 2);
  removeCombatant(e, a.id);
  assert.equal(e.activeId, null);
  assert.equal(e.round, 0);
  assert.equal(e.started, false);
  advance(e);
  assert.equal(e.round, 0);
});
test("dice handle negative modifiers, reject malformed/unbounded input", () => {
  assert.deepEqual(
    roll("2d6+3", () => 0),
    { dice: [1, 1], modifier: 3, total: 5 },
  );
  assert.equal(roll("1d20-2", () => 0.999).total, 18);
  for (const s of ["0d6", "101d6", "1d1", "1d1001", "foo", "1d20;alert(1)"])
    assert.throws(() => roll(s));
});
test("original backup imports custom creatures, characters, spell and encounter fields", () => {
  const raw = {
    "Creatures.x": stat,
    "PersistentCharacters.a": {
      Id: "a",
      Name: "Hero",
      CurrentHP: 5,
      StatBlock: stat,
      Notes: "secret",
    },
    "Spells.s": { Id: "s", Name: "Light" },
    "ImprovedInitiative.AutoSavedEncounters.default": JSON.stringify({
      RoundCounter: 3,
      ActiveCombatantId: "c",
      Combatants: [
        {
          Id: "c",
          StatBlock: stat,
          CurrentHP: 4,
          TemporaryHP: 2,
          Initiative: 18,
          Alias: "Enemy",
          Hidden: true,
          Tags: [{ Text: "Poisoned" }],
        },
      ],
    }),
  };
  const r = importOriginal(raw);
  assert.equal(r.library.length, 2);
  assert.equal(r.characters.length, 1);
  assert.equal(r.library[0].InitiativeModifier, 4);
  assert.equal(r.library[1].ImportedCurrentHP, 5);
  assert.equal(r.library[1].ImportedNotes, "secret");
  assert.equal(r.spells.length, 1);
  assert.equal(r.encounter?.combatants[0].hp, 4);
  assert.equal(r.encounter?.combatants[0].tempHp, 2);
  assert.deepEqual(r.encounter?.combatants[0].conditions, ["Poisoned"]);
  assert.equal(r.encounter?.combatants[0].hidden, true);
  assert.equal(r.encounter?.activeId, "c");
});
test("persistent characters keep HP across encounters and import CurrentHP", () => {
  const characters: PersistentCharacter[] = [];
  const hero = upsertHeroFromStat(
    characters,
    { ...stat, Name: "Hero", Player: "player" },
    5,
    "secret",
  );
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
test("backup validation rejects invalid HP, duplicate ids and invalid active turn", () => {
  const s: State = {
    version: 1,
    encounter: emptyEncounter(),
    library: [],
    spells: [],
    saved: [],
    updatedAt: "",
  };
  s.encounter.combatants = [createCombatant(stat)];
  assert.deepEqual(validateState(s), s);
  const invalid = structuredClone(s);
  invalid.encounter.combatants[0].hp = 999;
  assert.throws(() => validateState(invalid));
  invalid.encounter.combatants[0].hp = 5;
  invalid.encounter.activeId = "missing";
  assert.throws(() => validateState(invalid));
  invalid.encounter.activeId = null;
  invalid.encounter.combatants.push(invalid.encounter.combatants[0]);
  assert.throws(() => validateState(invalid));
});

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
