# Supabase Operate Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle RoundKeep to the `desing.md` midnight / phosphor system as an Operate combat table, without changing flows, shortcuts, or data.

**Architecture:** Keep the vanilla CSS variable layer in `src/style.css` and remap it. Dark is the canonical `desing.md` mapping. Light is a snow-canvas translation of the same grammar. Product type scale and rail / library / battle / sheet layout stay. Marketing layout from `desing.md` is not applied.

**Tech Stack:** TypeScript, Vite, vanilla CSS, Lucide, Manrope (`@fontsource-variable/manrope`), Node test runner (`node --import tsx --test tests/*.test.ts`)

**Spec:** `docs/superpowers/specs/2026-09-19-supabase-operate-restyle-design.md`

## Global Constraints

- Stack stays Vite + vanilla CSS + `src/main.ts` template strings. No React, Tailwind, or icon-library swap.
- Do not change `src/model.ts` or `src/storage.ts`.
- Do not change routes, shortcuts (`N`, `/`, `D`, `⌘K`, undo), copy, or form field `name` attributes.
- Do not apply `desing.md` marketing type (72 / 36 / 24) or 64–96px section gaps to the table.
- Phosphor `#3ecf8e` is one element per visual region. No second chromatic hue. No gradients. No card shadows.
- Type weights 400 and 500 only. Family is Manrope. Tracking `-0.007em`.
- Radius vocabulary: pills `9999px`, cards `16px`, inputs `8px`.
- Focus is a 1px `#3ecf8e` edge, no glow ring.
- Dark canvas `#121212`. Never `#000000`.
- Lucide stays.
- Every task ends with `npm test` still passing. Token tests land in Task 2 and stay green.

## Review Focus

- Light theme helper text: Smoke `#898989` on `#fafafa` fails AA. Light `--muted` must stay Graphite `#4d4d4d`. Covered in Task 2 token assertions.
- Current-turn row: green wash hides HP. Current row is Ash fill + 1px phosphor border. Covered in Task 6.
- Keyboard focus: removing glow must not remove the edge. Covered in Task 4.
- Player view and credits: satellite pages can keep old navy/black. Covered in Task 8.
- Mobile bottom rail: hardcoded `#1a1a1a` border drifts off-token. Covered in Task 9.

---

### Task 1: Visual contract rule

**Files:**
- Create: `.cursor/rules/roundkeep-visual.mdc`
- Modify: none
- Test: none (rule is agent guidance; token tests land in Task 2)

**Interfaces:**
- Consumes: spec token tables and Operate constraints
- Produces: always-on Cursor rule that later tasks and later agents must follow

- [ ] **Step 1: Create the rule file**

```markdown
---
description: RoundKeep visual system. Use when editing UI, CSS, HTML, or visual copy.
globs: src/style.css,src/main.ts,index.html,public/credits.html
alwaysApply: false
---

# RoundKeep visual contract

Authority: `desing.md` tokens. Mode: Operate. Stack: CSS variables in `src/style.css`.

Apply: canvas `#121212`; surfaces `#121212` / `#242424`; edges `#2e2e2e`; text `#fafafa` / `#b4b4b4` / `#898989`; accent `#3ecf8e` once per region; Manrope 400/500; tracking `-0.007em`; radii 9999 / 16 / 8; elevation = 1px border; focus = 1px green, no glow; motion 150–250ms.

Do not: 72px display type, marketing section gaps, logo clouds, second accent, card shadows, gradients, framework migration, Lucide swap, IA / shortcut / copy changes.

Light theme is a snow-canvas translation. Light `--muted` is `#4d4d4d`, not `#898989`.
```

- [ ] **Step 2: Confirm the file is the only new artifact**

Run: `ls -la .cursor/rules/roundkeep-visual.mdc`

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add .cursor/rules/roundkeep-visual.mdc
git commit -m "$(cat <<'EOF'
docs: pin RoundKeep Operate visual contract

EOF
)"
```

---

### Task 2: Token contract test, then remap `:root`

**Files:**
- Create: `tests/tokens.test.ts`
- Modify: `src/style.css:16-98`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: spec dark and light tables
- Produces: `--bg`, `--panel`, `--surface`, `--line`, `--line-strong`, `--text`, `--muted`, `--accent`, `--accent-strong`, `--accent-soft`, `--accent-text`, `--ally`, `--ally-soft`, `--enemy`, `--enemy-soft`, `--red`, `--gold`, `--shadow`, `--input-*`, `--rail-*`, `--radius`, `--radius-sm`, `--radius-pill` with the values below

- [ ] **Step 1: Write the failing token test**

Create `tests/tokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --import tsx --test tests/tokens.test.ts`

Expected: FAIL. Current dark `--bg` is `#000000`, current light `--bg` is `#f5f5f5`, `--radius-pill` does not exist.

- [ ] **Step 3: Remap both token blocks**

Replace `src/style.css` `:root {` through the end of `:root[data-theme="dark"] { ... }` (lines 16–98) with:

```css
:root {
  color-scheme: light;
  --bg: #fafafa;
  --panel: #fafafa;
  --surface: #f0f0f0;
  --line: #e5e5e5;
  --line-strong: #d4d4d4;
  --muted: #4d4d4d;
  --text: #121212;
  --accent: #3ecf8e;
  --accent-strong: #006239;
  --accent-soft: #1f4b37;
  --accent-text: #fafafa;
  --ally: #006239;
  --ally-soft: #fafafa;
  --enemy: #4d4d4d;
  --enemy-soft: #f0f0f0;
  --red: #4d4d4d;
  --gold: #4d4d4d;
  --shadow: none;
  --input-bg: #fafafa;
  --input-border: #d4d4d4;
  --input-border-hover: #4d4d4d;
  --input-focus: #3ecf8e;
  --input-placeholder: #898989;
  --input-disabled: #f0f0f0;
  --input-disabled-text: #898989;
  --rail-bg: #121212;
  --rail-fg: #b4b4b4;
  --radius: 16px;
  --radius-sm: 8px;
  --radius-pill: 9999px;
  --rail: 56px;
  --topbar: 48px;
  --control: 32px;
  --fs-title: 20px;
  --fs-section: 14px;
  --fs-body: 13px;
  --fs-ui: 12px;
  --fs-meta: 11px;
  --fs-data: 15px;
  --lh-title: 1.2;
  --lh-ui: 1.35;
  --lh-body: 1.5;
  --track-title: -0.007em;
  --scroll-size: 8px;
  --scroll-thumb: var(--line-strong);
  --scroll-track: transparent;
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
  font-synthesis: none;
  color: var(--text);
  background: var(--bg);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #121212;
  --panel: #121212;
  --surface: #242424;
  --line: #2e2e2e;
  --line-strong: #393939;
  --muted: #898989;
  --text: #fafafa;
  --accent: #3ecf8e;
  --accent-strong: #00c573;
  --accent-soft: #1f4b37;
  --accent-text: #fafafa;
  --ally: #3ecf8e;
  --ally-soft: #121212;
  --enemy: #b4b4b4;
  --enemy-soft: #242424;
  --red: #b4b4b4;
  --gold: #898989;
  --shadow: none;
  --input-bg: #121212;
  --input-border: #393939;
  --input-border-hover: #4d4d4d;
  --input-focus: #3ecf8e;
  --input-placeholder: #898989;
  --input-disabled: #242424;
  --input-disabled-text: #898989;
  --rail-bg: #121212;
  --rail-fg: #b4b4b4;
}
```

Do not change the `@font-face` blocks yet (Task 3). Keep `--radius-pill` on `:root` only; dark inherits it.

- [ ] **Step 4: Run token tests and the full suite**

Run: `npm test`

Expected: `tests/tokens.test.ts` PASS. `tests/model.test.ts` and `tests/data.test.ts` still PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/tokens.test.ts src/style.css
git commit -m "$(cat <<'EOF'
style: remap CSS tokens to the desing.md Operate palette

EOF
)"
```

---

### Task 3: Manrope-only type and weight cap

**Files:**
- Modify: `src/style.css` `@font-face` at lines 1–14; `h1`/`h2`/`h3` at 216–247; `kbd` at 346–349; every `font-weight` above 500; every `"DM Sans"` string
- Modify: `package.json` dependencies (remove `@fontsource-variable/dm-sans`)
- Modify: `public/credits.html` font credit line
- Test: `tests/tokens.test.ts` (still green) plus the grep checks in Step 4

**Interfaces:**
- Consumes: `:root { font-family: "Manrope", ... }` from Task 2
- Produces: one family, weights 400/500, no DM Sans references in CSS or credits

- [ ] **Step 1: Write a failing assertion that DM Sans is gone**

Add to `tests/tokens.test.ts`:

```ts
test("UI type is Manrope only and never heavier than 500", () => {
  assert.equal(css.includes("DM Sans"), false);
  assert.equal(/font-weight:\s*(?:[6-9]\d{2}|[1-9]\d{3})/.test(css), false);
});
```

- [ ] **Step 2: Run that test and confirm it fails**

Run: `node --import tsx --test tests/tokens.test.ts`

Expected: FAIL. `DM Sans` is still in `@font-face` and `h1` is `font-weight: 700`.

- [ ] **Step 3: Apply the type edits**

1. Delete the DM Sans `@font-face` block (lines 1–7). Keep the Manrope `@font-face`.
2. Set every heading and UI weight that is 550/600/650/700/800 to `500`. Keep `font-weight: 400` where it already is implicit.
3. Replace `font-family: "DM Sans"` and `10px "DM Sans"` with `"Manrope", ui-sans-serif, system-ui, sans-serif`.
4. Keep `letter-spacing: var(--track-title)` on `h1`. Set `h2` letter-spacing to `-0.007em`.
5. In `package.json`, remove the `@fontsource-variable/dm-sans` dependency.
6. In `public/credits.html`, change `DM Sans and Manrope fonts` to `Manrope font`.

Concrete heading block after edit:

```css
h1,
h2,
h3 {
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
}

h1 {
  letter-spacing: var(--track-title);
  font-size: var(--fs-title);
  line-height: var(--lh-title);
  text-wrap: balance;
}

h2 {
  letter-spacing: -0.007em;
  font-size: var(--fs-section);
  line-height: var(--lh-ui);
}

h3 {
  font-size: var(--fs-ui);
  line-height: var(--lh-ui);
}
```

Also set these known heavy weights to `500`: `.primary`/`.secondary`/`.danger`/`.subtle`, `.wordmark`, `.boot`, `.initiative input`, `.hp-cell strong`, `.dice-result .dice-total`, `.player-initiative`, `.profile`, `.combatant-identity strong`, `.settings-metrics b`, `.spell-meta b`, `.turn-label`.

- [ ] **Step 4: Re-run tests**

Run: `npm test`

Expected: PASS, including the new Manrope / weight assertion.

- [ ] **Step 5: Commit**

```bash
git add src/style.css package.json public/credits.html tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
style: use Manrope at 400/500 and drop DM Sans

EOF
)"
```

---

### Task 4: Radius, elevation, focus

**Files:**
- Modify: `src/style.css` button/input/focus/dialog/toast/select-menu rules
- Test: `tests/tokens.test.ts` plus the grep assertions added below

**Interfaces:**
- Consumes: `--radius`, `--radius-sm`, `--radius-pill`, `--shadow: none`, `--input-focus`
- Produces: pill buttons, 16px cards, 8px inputs, 1px green focus, zero overlay shadows

- [ ] **Step 1: Add failing assertions**

Add to `tests/tokens.test.ts`:

```ts
test("overlays do not use drop shadows or glow rings", () => {
  assert.equal(css.includes("box-shadow: var(--shadow)"), false);
  assert.equal(css.includes("0 0 0 3px"), false);
  assert.equal(css.includes("drop-shadow("), false);
});
```

- [ ] **Step 2: Run and confirm fail**

Run: `node --import tsx --test tests/tokens.test.ts`

Expected: FAIL on dialog/toast `box-shadow: var(--shadow)` and input glow `0 0 0 3px`.

- [ ] **Step 3: Apply control and elevation CSS**

Buttons (replace the shared radius on `.primary, .secondary, .danger, .subtle`):

```css
.primary,
.secondary,
.danger,
.subtle {
  min-height: var(--control);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
}

.primary {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.primary:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent-soft);
  color: var(--accent-text);
}

.secondary,
.subtle {
  background: transparent;
  border-color: var(--line-strong);
  color: var(--text);
}

.secondary:hover:not(:disabled),
.subtle:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text) 4%, transparent);
  border-color: var(--input-border-hover);
}

.danger {
  background: transparent;
  border-color: var(--line-strong);
  color: var(--text);
}

.icon-button,
.tiny-button {
  border-radius: var(--radius-pill);
}

.tiny-button {
  width: 22px;
  height: 22px;
  border: 1px solid var(--line);
  color: var(--muted);
}
```

Delete the entire `:root[data-theme="dark"] .primary:hover:not(:disabled)` rule that hardcodes `#4ade80`.

Focus and inputs:

```css
:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

input,
textarea,
select,
.select-trigger {
  border-radius: var(--radius-sm);
}

input:focus,
textarea:focus,
select:focus,
.select-trigger[aria-expanded="true"] {
  border-color: var(--input-focus);
  box-shadow: none;
  outline: 0;
}

input[aria-invalid="true"],
textarea[aria-invalid="true"],
select[aria-invalid="true"],
.input-error {
  border-color: var(--red);
  box-shadow: none;
}

.searchbox:focus-within {
  box-shadow: none;
  border-color: var(--input-focus);
}
```

Find `.searchbox` (around line 668) and remove its `box-shadow: 0 0 0 3px …` if present.

Overlays:

```css
dialog,
#toast,
.select-menu {
  box-shadow: none;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
```

`.brand-mark:hover` — delete `filter: drop-shadow(...)`. Keep `transform: scale(1.08)` or drop the scale if it feels loud; do not keep the glow.

`.profile`:

```css
.profile {
  background: var(--surface);
  border: 1px solid var(--line-strong);
  color: var(--text);
  font-weight: 500;
}
```

`kbd`:

```css
kbd {
  font: 10px/1.3 "Manrope", ui-sans-serif, system-ui, sans-serif;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  min-width: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  color: var(--muted);
  background: var(--surface);
}
```

Replace leftover `border-radius: 4px`, `5px`, `6px`, `12px` on interactive chrome (`.hp-cell`, `.initiative input`, `.select-option`, `.condition-picker button`, `.command-item`, `dialog` if still 12px) with `var(--radius-sm)` or `var(--radius-pill)` or `var(--radius)` per the vocabulary. Do not hunt decorative exceptions that are already `99px` on the HP track; that 99px is a pill and may become `var(--radius-pill)`.

Autofill inset `box-shadow: 0 0 0 1000px var(--input-bg)` stays. That is a paint hack, not elevation.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS. The new overlay assertions pass.

- [ ] **Step 5: Commit**

```bash
git add src/style.css tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
style: pill controls, border elevation, and 1px green focus

EOF
)"
```

---

### Task 5: App chrome — rail, topbar, command trigger

**Files:**
- Modify: `src/style.css` `.rail` through `.command-trigger` (approx. 361–540)
- Modify: `src/main.ts:140` theme-color hex
- Modify: `index.html:6` default `theme-color`
- Test: `tests/tokens.test.ts`; browser check in Step 4

**Interfaces:**
- Consumes: `--rail-bg`, `--accent`, `--line`, `--radius-pill`
- Produces: flat `#121212` rail, Snow wordmark, ghost command trigger, theme-color `#121212` / `#fafafa`

- [ ] **Step 1: Point theme-color at the new canvas**

In `index.html`:

```html
<meta name="theme-color" content="#121212" />
```

In `src/main.ts` `applyTheme()`:

```ts
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#121212" : "#fafafa");
```

- [ ] **Step 2: Restyle chrome**

```css
.rail {
  background: var(--rail-bg);
  border-right: 1px solid var(--line);
}

.brand-mark {
  color: var(--accent);
}

.brand-mark:hover {
  transform: none;
  filter: none;
}

.rail-button {
  border-radius: var(--radius-pill);
  color: var(--rail-fg);
}

.rail-button.active {
  background: var(--surface);
  color: var(--accent);
}

.wordmark {
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.007em;
  font-size: var(--fs-section);
  color: var(--text);
}

.command-trigger,
.global-search {
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1px solid var(--line);
}

.command-trigger:hover:not(:disabled),
.command-trigger:focus-visible {
  border-color: var(--input-focus);
  background: var(--surface);
}
```

If `.command-trigger` currently uses a glow on focus, remove it.

- [ ] **Step 3: Add a theme-color assertion**

Add to `tests/tokens.test.ts`:

```ts
test("browser chrome uses the contract canvases", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(html, /theme-color" content="#121212"/);
  assert.match(main, /dark \? "#121212" : "#fafafa"/);
  assert.equal(main.includes("#000000"), false);
  assert.equal(main.includes("#f5f5f5"), false);
});
```

Import `readFileSync` is already in the file from Task 2.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/style.css src/main.ts index.html tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
style: flatten rail and topbar onto the contract canvas

EOF
)"
```

---

### Task 6: Combat table, library, and sheet

**Files:**
- Modify: `src/style.css` `.panel` through `.empty-combat` (approx. 602–1512)
- Test: add current-turn / wash assertions; `npm test`

**Interfaces:**
- Consumes: `--surface`, `--accent`, `--ally`, `--radius`
- Produces: current-turn = Ash + 1px phosphor; no green wash; ally avatar is border-only

- [ ] **Step 1: Add failing assertions**

Add to `tests/tokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and confirm fail**

Run: `node --import tsx --test tests/tokens.test.ts`

Expected: FAIL. `.combatant.current` still uses `var(--accent-soft)`.

- [ ] **Step 3: Apply combat-surface CSS**

```css
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.combatant {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.combatant.selected {
  border-color: var(--line-strong);
  background: var(--surface);
}

.combatant.current {
  background: var(--surface);
  border-color: var(--accent);
}

.initiative input {
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.avatar {
  border-radius: 8px;
  background: var(--enemy-soft);
  border: 1px solid var(--line);
  color: var(--enemy);
}

.avatar.ally {
  background: var(--ally-soft);
  border-color: var(--ally);
  color: var(--ally);
}

.turn-label {
  color: var(--accent);
  font-weight: 500;
}

.hp-cell strong {
  font-weight: 500;
}

.hp-track,
.hp-track i {
  border-radius: var(--radius-pill);
}

.badge,
.condition-chip {
  border-radius: var(--radius-pill);
}

.stat-tiles > div {
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: var(--radius-sm);
}
```

Read `.stat-tiles > div` first and only change color/radius/border. Do not change the grid.

Library items and empty states inherit tokens. If `.library-item` or `.empty-combat` still uses a leftover 6px radius, set `var(--radius-sm)` or `var(--radius)`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/style.css tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
style: treat current turn as a phosphor edge, not a wash

EOF
)"
```

---

### Task 7: Overlays — dialogs, command palette, toasts, empty

**Files:**
- Modify: `src/style.css` `dialog` through `.command-empty`, `#toast`, `.boot`, `.empty-*`
- Test: `npm test` (overlay shadow assertion from Task 4 must stay green)

**Interfaces:**
- Consumes: `--radius`, `--line`, `--surface`, no `--shadow`
- Produces: flat overlays that still read as above-canvas via border + `#242424` interiors

- [ ] **Step 1: Restyle overlays**

```css
dialog {
  width: min(520px, calc(100vw - 28px));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--text);
  box-shadow: none;
  padding: 18px;
  max-height: 85vh;
}

dialog::backdrop {
  background: rgba(18, 18, 18, 0.72);
}

.command-palette {
  width: min(560px, calc(100vw - 28px));
  margin: 14vh auto auto;
  padding: 0;
  overflow: hidden;
}

.command-item {
  border-radius: var(--radius-sm);
}

.command-item.active,
.command-item:hover:not(:disabled) {
  background: var(--surface);
}

#toast {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: none;
}

.boot {
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.007em;
  color: var(--text);
}

.condition-picker button {
  border-radius: var(--radius-pill);
}

.condition-picker button.selected {
  color: var(--accent);
  background: var(--surface);
  border-color: var(--accent);
}

.select-menu {
  box-shadow: none;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.select-option {
  border-radius: var(--radius-sm);
}

.select-option[aria-selected="true"] {
  color: var(--accent);
}
```

`.empty-combat` and `.empty-library` already use `--muted`. Confirm they sit on `--bg` / `--panel` and do not introduce a new color.

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: PASS. `box-shadow: var(--shadow)` remains absent.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
style: flatten dialogs, palette, and toasts to hairline elevation

EOF
)"
```

---

### Task 8: Player view, credits, saved cards

**Files:**
- Modify: `src/style.css` `.saved-grid` through `.player-screen`
- Modify: `public/credits.html` (inline theme)
- Test: add credits/player assertions

**Interfaces:**
- Consumes: same tokens as the DM table
- Produces: player cards and credits on the same canvas; current player card matches combat current-turn treatment

- [ ] **Step 1: Add failing assertions**

Add to `tests/tokens.test.ts`:

```ts
test("satellite surfaces share the contract", () => {
  const credits = readFileSync(new URL("../public/credits.html", import.meta.url), "utf8");
  assert.equal(credits.includes("#090d16"), false);
  assert.equal(credits.includes("#e2e8f0"), false);
  assert.match(credits, /background:\s*#121212/);
  assert.match(credits, /color:\s*#fafafa/);
  assert.match(
    css,
    /\.player-card\.current \{[\s\S]*?background: var\(--surface\);[\s\S]*?border-color: var\(--accent\);/,
  );
});
```

- [ ] **Step 2: Run and confirm fail**

Run: `node --import tsx --test tests/tokens.test.ts`

Expected: FAIL. Credits still use `#090d16`. `.player-card.current` still uses `--accent-soft`.

- [ ] **Step 3: Apply satellite styles**

`public/credits.html` body style and add a link color:

```html
<body
  style="
    font: 16px/1.8 Manrope, ui-sans-serif, system-ui, sans-serif;
    max-width: 760px;
    margin: 50px auto;
    padding: 24px;
    background: #121212;
    color: #fafafa;
  "
>
  <style>
    h1 { font-size: 2.25rem; line-height: 1.2; margin: 0 0 1.5rem; font-weight: 500; }
    h2 { font-size: 1.35rem; line-height: 1.3; margin: 2rem 0 0.75rem; font-weight: 500; }
    p { margin: 0 0 1rem; color: #b4b4b4; }
    a { color: #3ecf8e; }
  </style>
```

Keep the existing credit paragraphs. Only the theme and the Manrope credit line (already edited in Task 3) change.

Player / saved:

```css
.saved-card,
.saved-empty {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
}

.player-card {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
}

.player-card.current {
  border-color: var(--accent);
  background: var(--surface);
}

.player-initiative {
  font-weight: 500;
}

.player-screen > .wordmark span {
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/style.css public/credits.html tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
style: put player view and credits on the same canvas

EOF
)"
```

---

### Task 9: Mobile and leftover hardcoded colors

**Files:**
- Modify: `src/style.css` `@media (max-width: 900px)` and `@media (max-width: 600px)`
- Test: add assertion that `#1a1a1a`, `#4ade80`, `#16a34a`, `#22c55e`, `#000000` are gone from `src/style.css`

**Interfaces:**
- Consumes: `var(--line)`, `var(--rail-bg)`, pill buttons that already collapse via existing font-size: 0 tricks
- Produces: no hardcoded leftover brand hex in CSS

- [ ] **Step 1: Add failing assertion**

Add to `tests/tokens.test.ts`:

```ts
test("CSS has no leftover pre-contract brand hex", () => {
  for (const hex of ["#000000", "#16a34a", "#22c55e", "#4ade80", "#1a1a1a", "#090d16"]) {
    assert.equal(css.includes(hex), false, hex);
  }
});
```

- [ ] **Step 2: Run and confirm fail if leftovers remain**

Run: `node --import tsx --test tests/tokens.test.ts`

Expected: FAIL if `.rail` mobile still uses `#1a1a1a` or any old green remains.

- [ ] **Step 3: Replace leftovers**

In `@media (max-width: 600px)`:

```css
.rail {
  inset: auto 0 0 0;
  width: 100%;
  height: 52px;
  flex-direction: row;
  justify-content: space-around;
  border-top: 1px solid var(--line);
  background: var(--rail-bg);
}
```

Grep `src/style.css` for `#` and replace any remaining raw hex that is not a contract token already declared on `:root`. `#ffffff` on `.profile` should already be gone from Task 4. Autofill and backdrop rgba may stay as `rgba(18, 18, 18, 0.72)`.

Do not change the layout breakpoints or the order rules (battle 1, library 2, sheet 3).

- [ ] **Step 4: Run tests and production build**

Run:

```bash
npm test
npm run build
```

Expected: tests PASS, `tsc --noEmit` and Vite build exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/style.css tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
style: tokenise mobile rail and purge leftover brand hex

EOF
)"
```

---

### Task 10: Browser verification and DESIGN.md

**Files:**
- Create: `DESIGN.md` only after the browser pass (via `impeccable document`, or by hand from shipped CSS if the launcher is unavailable)
- Modify: none unless verification finds a defect; fix in the owning file and add a regression assertion in `tests/tokens.test.ts`

**Interfaces:**
- Consumes: Tasks 1–9 shipped CSS
- Produces: evidence that the table works; `DESIGN.md` that describes the shipped world

- [ ] **Step 1: Start the app**

Run: `npm run dev`

Open `http://127.0.0.1:5173`.

- [ ] **Step 2: Exercise both themes on desktop**

1. Boot screen, then combat table.
2. Settings: switch Light, Dark, Use system theme. Canvas must be `#fafafa` or `#121212`, never `#000000`.
3. Add two combatants (or demo). Start combat. Current row is Ash + green edge.
4. Click HP: damage, heal, temp. Primary pills are phosphor with Snow labels.
5. Conditions, dice (`D`), undo.
6. `⌘K` / `/`: palette is border-only, active row is Ash.
7. Open player view. Current card matches the table treatment. No navy.
8. Saved encounters empty and populated cards.
9. Tab through rail, command trigger, combatant HP. Focus is a 1px green edge.
10. Open `/credits.html`. Obsidian + phosphor links.

- [ ] **Step 3: Exercise mobile widths**

Resize to 900px and 390px. Bottom rail uses `var(--line)`. Heading actions still wrap. Library stacks under battle. No horizontal overflow.

- [ ] **Step 4: Reduced motion**

Enable `prefers-reduced-motion`. Transitions stop. Buttons still press. Combat still advances.

- [ ] **Step 5: Record DESIGN.md from the shipped CSS**

If `.cursor/skills/impeccable/scripts/impeccable` runs: `impeccable document`. If the launcher fails, write `DESIGN.md` from the live `:root` and `:root[data-theme="dark"]` blocks (tokens first, then the eight DESIGN.md sections). Do not copy marketing 72px type into it.

- [ ] **Step 6: Final verification commands**

Run:

```bash
npm test
npm run build
```

Expected: 0 failures, build exit 0. Only then claim the restyle is done.

- [ ] **Step 7: Commit DESIGN.md if it was written**

```bash
git add DESIGN.md
git commit -m "$(cat <<'EOF'
docs: record the shipped Operate visual system

EOF
)"
```

---

## Self-review

**Spec coverage**

| Spec section | Task |
|---|---|
| Dark / light token tables | 2 |
| Type, weight cap, drop DM Sans | 3 |
| Radius / elevation / focus | 4 |
| Color rationing, rail green, primary CTA | 5, 6 |
| Current-turn / ally punctuation | 6 |
| Overlays, empty, boot | 7 |
| Player view, credits | 8 |
| Mobile leftovers, `#000000` ban | 9 |
| Browser + DESIGN.md | 10 |
| Visual contract rule | 1 |
| model.ts / storage.ts untouched | all tasks |
| Marketing layout not applied | Global Constraints |

**Placeholder scan:** none. Each CSS step names selectors and values.

**Type consistency:** token names stay the existing `--bg` / `--accent` set. `--radius-pill` is the only new variable and is defined in Task 2, used from Task 4 on.

**Review Focus:** each of the five lines has an assertion in Tasks 2, 4, 6, 8, or 9.
