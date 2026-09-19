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
