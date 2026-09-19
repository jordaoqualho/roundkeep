import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

function block(source: string, prelude: string): string {
  const start = source.indexOf(prelude);
  assert.notEqual(start, -1, `missing ${prelude}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`unclosed ${prelude}`);
}

function vars(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

const light = vars(block(css, ":root {"));
const dark = vars(block(css, ':root[data-theme="dark"]'));

test("dark theme maps the desing.md canvas and phosphor accent", () => {
  assert.equal(dark.bg, "#121212");
  assert.equal(dark.panel, "#121212");
  assert.equal(dark.surface, "#242424");
  assert.equal(dark.line, "#2e2e2e");
  assert.equal(dark["line-strong"], "#393939");
  assert.equal(dark.text, "#fafafa");
  assert.equal(dark.muted, "#898989");
  assert.equal(dark.accent, "#3ecf8e");
  assert.equal(dark["accent-strong"], "#00c573");
  assert.equal(dark["accent-soft"], "#1f4b37");
  assert.equal(dark["accent-text"], "#fafafa");
  assert.equal(dark.ally, "#3ecf8e");
  assert.equal(dark["ally-soft"], "#121212");
  assert.equal(dark.enemy, "#b4b4b4");
  assert.equal(dark["enemy-soft"], "#242424");
  assert.equal(dark.shadow, "none");
  assert.equal(dark["input-bg"], "#121212");
  assert.equal(dark["input-border"], "#393939");
  assert.equal(dark["input-focus"], "#3ecf8e");
  assert.equal(dark["rail-bg"], "#121212");
  assert.equal(dark.radius, "16px");
  assert.equal(dark["radius-sm"], "8px");
  assert.equal(dark["radius-pill"], "9999px");
});

test("UI type is Manrope only and never heavier than 500", () => {
  assert.equal(css.includes("DM Sans"), false);
  assert.equal(/font-weight:\s*(?:[6-9]\d{2}|[1-9]\d{3})/.test(css), false);
});

test("browser chrome uses the contract canvases", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(html, /theme-color" content="#121212"/);
  assert.match(main, /dark \? "#121212" : "#fafafa"/);
  assert.equal(main.includes("#000000"), false);
  assert.equal(main.includes("#f5f5f5"), false);
});

test("current turn and ally marks are punctuation, not washes", () => {
  assert.match(
    css,
    /\.combatant\.current \{[\s\S]*?background: var\(--surface\);[\s\S]*?border-color: var\(--accent\);/,
  );
  assert.match(
    css,
    /\.avatar\.ally \{[\s\S]*?background: var\(--ally-soft\);[\s\S]*?color: var\(--ally\);/,
  );
  assert.equal(/\.combatant\.current \{[^}]*accent-soft/.test(css), false);
});

test("overlays do not use drop shadows or glow rings", () => {
  assert.equal(css.includes("box-shadow: var(--shadow)"), false);
  assert.equal(css.includes("0 0 0 3px"), false);
  assert.equal(css.includes("drop-shadow("), false);
});

test("light theme is a snow-canvas translation with Graphite muted", () => {
  assert.equal(light.bg, "#fafafa");
  assert.equal(light.panel, "#fafafa");
  assert.equal(light.surface, "#f0f0f0");
  assert.equal(light.text, "#121212");
  assert.equal(light.muted, "#4d4d4d");
  assert.equal(light.accent, "#3ecf8e");
  assert.equal(light["accent-strong"], "#006239");
  assert.equal(light["accent-text"], "#fafafa");
  assert.equal(light.ally, "#006239");
  assert.equal(light.shadow, "none");
  assert.equal(light["input-focus"], "#3ecf8e");
  assert.equal(light.radius, "16px");
  assert.equal(light["radius-sm"], "8px");
  assert.equal(light["radius-pill"], "9999px");
});
