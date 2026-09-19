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
