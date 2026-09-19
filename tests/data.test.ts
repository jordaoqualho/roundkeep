import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { importOriginal } from "../src/model.ts";
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
test("complete SRD catalogue has unique IDs and renderable, finite combat statistics", () => {
  const creatures = read("public/data/creatures.json");
  assert.equal(creatures.length, 331);
  assert.equal(new Set(creatures.map((c: any) => c.Id)).size, 331);
  for (const c of creatures) {
    assert.ok(c.Name);
    assert.ok(c.HP.Value >= 1);
    assert.ok(Number.isFinite(c.AC.Value));
    assert.ok(Number.isFinite(c.InitiativeModifier));
    assert.ok(Object.values(c.Abilities).every(Number.isFinite));
    for (const action of [
      ...c.Actions,
      ...c.Traits,
      ...c.BonusActions,
      ...c.Reactions,
      ...c.LegendaryActions,
    ]) {
      assert.equal(typeof action.Name, "string");
      assert.equal(typeof action.Content, "string");
    }
  }
  assert.equal(
    creatures.find((c: any) => c.Name === "Aboleth").InitiativeModifier,
    7,
  );
  assert.equal(creatures.find((c: any) => c.Name === "Aboleth").HP.Value, 150);
});
test("spell catalogue is complete and descriptions are retained", () => {
  const spells = read("public/data/spells.json");
  assert.equal(spells.length, 319);
  assert.equal(new Set(spells.map((s: any) => s.Id)).size, 319);
  assert.ok(
    spells.every(
      (s: any) =>
        typeof s.Name === "string" &&
        typeof s.Description === "string" &&
        s.Description.length > 0,
    ),
  );
});
test(
  "actual private backup preserves every creature and character statblock",
  { skip: !existsSync("private-data/improved-initiative.json") },
  () => {
    const raw = read("private-data/improved-initiative.json"),
      result = importOriginal(raw);
    assert.equal(result.library.length, 13);
    assert.equal(result.library.filter((s) => s.Player).length, 4);
    for (const [key, v] of Object.entries(raw) as [string, any][]) {
      if (
        !key.startsWith("Creatures.") &&
        !key.startsWith("PersistentCharacters.")
      )
        continue;
      const before = v.StatBlock || v;
      const after = result.library.find((s) => s.Id === v.Id)!;
      assert.ok(after);
      for (const field of [
        "HP",
        "AC",
        "Abilities",
        "Traits",
        "Actions",
        "BonusActions",
        "Reactions",
        "LegendaryActions",
        "Description",
      ])
        assert.deepEqual(after[field], before[field]);
    }
    assert.equal(result.encounter?.combatants.length, 0);
  },
);
test("private campaign export is not bundled into production", () => {
  assert.equal(existsSync("dist/private-data"), false);
  assert.equal(existsSync("dist/improved-initiative.json"), false);
});
