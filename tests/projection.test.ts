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
