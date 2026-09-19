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
