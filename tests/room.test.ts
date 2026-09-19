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
