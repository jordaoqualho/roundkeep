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
  assert.equal(dark.muted, "#a3a3a3");
  assert.equal(dark.accent, "#3ecf8e");
  assert.equal(dark["accent-strong"], "#00c573");
  assert.equal(dark["accent-soft"], "#1f4b37");
  assert.equal(dark["accent-text"], "#121212");
  assert.equal(dark.ally, "#3ecf8e");
  assert.equal(dark["ally-soft"], "#121212");
  assert.equal(dark.enemy, "#b4b4b4");
  assert.equal(dark["enemy-soft"], "#242424");
  assert.equal(dark.shadow, "none");
  assert.equal(dark["input-bg"], "#121212");
  assert.equal(dark["input-border"], "#393939");
  assert.equal(dark["input-focus"], "#3ecf8e");
  assert.equal(dark["rail-bg"], "#121212");
  assert.equal(dark.radius, "8px");
  assert.equal(dark["radius-sm"], "6px");
  assert.equal(dark["radius-md"], "6px");
});

test("UI type is Inter with Manrope headings and never heavier than 500", () => {
  assert.equal(css.includes("DM Sans"), false);
  assert.match(css, /font-family:\s*Inter,/);
  assert.match(css, /h1,\s*h2,\s*h3\s*\{[\s\S]*?font-family:\s*Manrope/);
  assert.equal(/font-weight:\s*(?:[6-9]\d{2}|[1-9]\d{3})/.test(css), false);
  assert.match(css, /strong,\s*b\s*\{[\s\S]*?font-weight:\s*500/);
});

test("interactive chrome uses rounded-md, not pills", () => {
  assert.equal(css.includes("--radius-pill"), false);
  assert.equal(/border-radius:\s*9999px/.test(css), false);
  assert.equal(/border-radius:\s*(?:4|5|12|16)px/.test(css), false);
  assert.match(css, /\.primary,[\s\S]*?border-radius:\s*var\(--radius-md\)/);
  assert.equal(/background:\s*var\(--accent-soft\)/.test(css), false);
  assert.equal(/\.rail-button\.active \{[^}]*--accent/.test(css), false);
});

test("rail hairline stays charcoal in both themes", () => {
  assert.equal(light["rail-line"], "#2e2e2e");
  assert.equal(dark["rail-line"], "#2e2e2e");
  assert.match(css, /border-right:\s*1px solid var\(--rail-line\)/);
  assert.match(css, /border-top:\s*1px solid var\(--rail-line\)/);
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

test("satellite surfaces share the contract", () => {
  const credits = readFileSync(new URL("../public/credits.html", import.meta.url), "utf8");
  assert.equal(credits.includes("#090d16"), false);
  assert.equal(credits.includes("#e2e8f0"), false);
  assert.match(credits, /background:\s*#121212/);
  assert.match(credits, /color:\s*#fafafa/);
  assert.match(credits, /@font-face/);
  assert.match(credits, /inter-latin-wght-normal\.woff2/);
  assert.match(credits, /manrope-latin-wght-normal\.woff2/);
  assert.match(
    css,
    /\.player-card\.current \{[\s\S]*?background: var\(--surface\);[\s\S]*?border-color: var\(--accent\);/,
  );
});

test("overlays do not use drop shadows or glow rings", () => {
  assert.equal(css.includes("box-shadow: var(--shadow)"), false);
  assert.equal(css.includes("0 0 0 3px"), false);
  assert.equal(css.includes("drop-shadow("), false);
});

test("CSS has no leftover pre-contract brand hex", () => {
  for (const hex of ["#000000", "#16a34a", "#22c55e", "#4ade80", "#1a1a1a", "#090d16"]) {
    assert.equal(css.includes(hex), false, hex);
  }
});

test("light theme is a snow-canvas translation with Graphite muted", () => {
  assert.equal(light.bg, "#fafafa");
  assert.equal(light.panel, "#fafafa");
  assert.equal(light.surface, "#f0f0f0");
  assert.equal(light.text, "#121212");
  assert.equal(light.muted, "#4d4d4d");
  assert.equal(light.accent, "#3ecf8e");
  assert.equal(light["accent-strong"], "#006239");
  assert.equal(light["accent-text"], "#121212");
  assert.equal(light.ally, "#006239");
  assert.equal(light["ally-soft"], "#fafafa");
  assert.equal(light.line, "#e5e5e5");
  assert.equal(light.shadow, "none");
  assert.equal(light["input-focus"], "#3ecf8e");
  assert.equal(light.radius, "8px");
  assert.equal(light["radius-sm"], "6px");
  assert.equal(light["radius-md"], "6px");
});

test("chrome matches Studio Button tiny, not medium", () => {
  assert.equal(light.control, "26px");
  assert.match(css, /\.primary,[\s\S]*?font-size:\s*12px/);
  assert.match(css, /\.primary,[\s\S]*?font-weight:\s*400/);
  assert.match(css, /\.primary,[\s\S]*?padding:\s*0 10px/);
});

test("primary ink is obsidian on phosphor, never snow", () => {
  assert.equal(light["accent-text"], "#121212");
  assert.equal(dark["accent-text"], "#121212");
  assert.match(css, /\.primary \{[\s\S]*?color: var\(--accent-text\)/);
  assert.match(css, /\.primary svg \{[\s\S]*?color: inherit/);
  assert.equal(/\.primary \{[^}]*#fafafa/.test(css), false);
});

function luminance(hex: string) {
  const n = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test("text pairs meet WCAG AA 4.5:1 in both themes", () => {
  assert.ok(contrast(light["accent-text"], light.accent) >= 4.5, "primary on phosphor light");
  assert.ok(contrast(dark["accent-text"], dark.accent) >= 4.5, "primary on phosphor dark");
  assert.ok(contrast(light.text, light.bg) >= 4.5, "body on snow");
  assert.ok(contrast(dark.text, dark.bg) >= 4.5, "body on obsidian");
  assert.ok(contrast(light.muted, light.bg) >= 4.5, "muted on snow");
  assert.ok(contrast(light.muted, light.surface) >= 4.5, "muted on light surface");
  assert.ok(contrast(dark.muted, dark.bg) >= 4.5, "muted on obsidian");
  assert.ok(contrast(dark.muted, dark.surface) >= 4.5, "muted on ash");
  assert.ok(contrast(light["accent-strong"], light.bg) >= 4.5, "green ink on snow");
  assert.ok(contrast(dark.accent, dark.bg) >= 4.5, "phosphor ink on obsidian");
  assert.ok(contrast("#fafafa", dark.accent) < 4.5, "snow on phosphor must stay unused");
});
