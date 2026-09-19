import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const html = await readFile("dist/index.html", "utf8");
const version = createHash("sha256")
  .update(html)
  .update(await readFile("dist/data/creatures.json"))
  .update(await readFile("dist/data/spells.json"))
  .digest("hex")
  .slice(0, 12);
const assets = (await readdir("dist/assets")).map((name) => "/assets/" + name);
const template = await readFile("public/sw.js", "utf8");
await writeFile(
  "dist/sw.js",
  template
    .replace("roundkeep-shell-v2", "roundkeep-shell-" + version)
    .replace(
      "const PRECACHE_ASSETS = [];",
      "const PRECACHE_ASSETS = " + JSON.stringify(assets) + ";",
    ),
);
console.log("Offline cache version:", version);
