# RoundKeep Operate Restyle — Design Spec

Date: 2026-09-19
Status: ready for implementation plan
Authority: `desing.md` (Supabase token system) applied as an Operate product skin

## Intent

Restyle RoundKeep so it feels like a midnight code editor with phosphor-green punctuation: near-black canvas, monochrome surfaces, one green used only as CTA / current-turn / focus / brand. The combat table stays a combat table. Tokens and surface grammar come from `desing.md`. Marketing layout from that file (72px display hero, logo cloud, 2x2 feature grids, 64–96px section gaps, testimonial masonry) is out of scope.

## Audience and success

A DM mid-session must scan initiative, HP, and the current turn in under a second. Success is: same flows and shortcuts, darker terminal-native chrome, green used as punctuation, no new framework, no broken mobile or player view.

## What is said vs assumed

Said:

- Apply the style in `desing.md`.
- Fix UI problems found while restyling.
- Produce a full implementation plan (this spec is the plan’s authority).

Assumed (correct if wrong):

- Keep the existing Appearance setting (system / light / dark). Dark is the canonical mapping of `desing.md`. Light is a snow-canvas translation of the same grammar, not a second brand.
- Do not change information architecture, copy, shortcuts, routes, or data.
- Lucide stays. Manrope stays as the Circular substitute already in the repo. DM Sans leaves the UI.

## Mode

Impeccable **Operate**. Dials: variance 4, motion 3, density 7.

## Preserve

- Rail + topbar + library / battle / sheet
- Saved encounters, command palette, settings, import/export
- Player view (`/?player`) and local BroadcastChannel sync
- Shortcuts: `N`, `/`, `D`, `⌘K`, undo
- `src/model.ts` and `src/storage.ts` unless a visual bug requires a one-line theme-color or class fix
- Vanilla CSS in `src/style.css` and template strings in `src/main.ts`
- Offline / service worker behavior
- Existing empty, error, and dialog flows (restyle them; do not replace with new IA)

## Replace

The current visual world in `src/style.css`:

- Light default tokens (`#f5f5f5` canvas, green `#16a34a`, shadows, mixed radii)
- Dark tokens that use `#000000` and `#22c55e`
- DM Sans as the UI face, weights 600–800
- Card and overlay `box-shadow`
- Green washes (`--accent-soft`, `--ally-soft`) as large fills
- Glow focus rings (`box-shadow: 0 0 0 3px …`)
- Brand-mark drop-shadow glow
- `public/credits.html` inline navy theme (`#090d16` / `#e2e8f0`)

## Token contract

Map existing CSS variables. Do not invent a parallel token set. Do not paste the marketing type scale (72 / 36 / 24) into the product UI.

### Dark (canonical, `html[data-theme="dark"]`)

| Variable | New value | Role |
|---|---|---|
| `--bg` | `#121212` | Obsidian canvas |
| `--panel` | `#121212` | Card / dialog surface (edge via border) |
| `--surface` | `#242424` | Ash: nested, hover, popover, current-turn fill |
| `--line` | `#2e2e2e` | Charcoal card border |
| `--line-strong` | `#393939` | Slate: stronger divider / input rest |
| `--text` | `#fafafa` | Snow |
| `--muted` | `#898989` | Smoke (captions). Do not use for long body. |
| `--accent` | `#3ecf8e` | Phosphor Green |
| `--accent-strong` | `#00c573` | Mint Pulse (links, inline accent) |
| `--accent-soft` | `#1f4b37` | Forest Depth — borders only, never a large fill |
| `--accent-text` | `#fafafa` | Label on green primary |
| `--ally` | `#3ecf8e` | Party punctuation (dot, avatar stroke, HP fill) |
| `--ally-soft` | `#121212` | No green wash |
| `--enemy` | `#b4b4b4` | Silver Mist |
| `--enemy-soft` | `#242424` | Ash |
| `--red` | `#b4b4b4` | Keep monochrome; danger is weight + label, not a second hue |
| `--gold` | `#898989` | Smoke |
| `--shadow` | `none` | Elevation is a 1px border |
| `--input-bg` | `#121212` | |
| `--input-border` | `#393939` | |
| `--input-border-hover` | `#4d4d4d` | Graphite |
| `--input-focus` | `#3ecf8e` | 1px border, no glow |
| `--input-placeholder` | `#898989` | |
| `--input-disabled` | `#242424` | |
| `--input-disabled-text` | `#898989` | |
| `--rail-bg` | `#121212` | Same canvas as page |
| `--rail-fg` | `#b4b4b4` | |
| `--radius` | `16px` | Cards, panels, dialogs, toasts |
| `--radius-sm` | `8px` | Inputs, selects |
| `--radius-pill` | `9999px` | Buttons, tags, chips, kbd |

### Light (translated, `:root` without dark)

Same grammar, inverted neutrals. Not a second accent.

| Variable | New value |
|---|---|
| `--bg` | `#fafafa` |
| `--panel` | `#fafafa` |
| `--surface` | `#f0f0f0` |
| `--line` | `#e5e5e5` |
| `--line-strong` | `#d4d4d4` |
| `--text` | `#121212` |
| `--muted` | `#4d4d4d` (Graphite — Smoke `#898989` on snow fails body contrast) |
| `--accent` | `#3ecf8e` |
| `--accent-strong` | `#006239` (Midnight Emerald for links on light) |
| `--accent-soft` | `#1f4b37` |
| `--accent-text` | `#fafafa` |
| `--ally` | `#006239` |
| `--ally-soft` | `#fafafa` |
| `--enemy` | `#4d4d4d` |
| `--enemy-soft` | `#f0f0f0` |
| `--red` | `#4d4d4d` |
| `--gold` | `#4d4d4d` |
| `--shadow` | `none` |
| `--input-bg` | `#fafafa` |
| `--input-border` | `#d4d4d4` |
| `--input-border-hover` | `#4d4d4d` |
| `--input-focus` | `#3ecf8e` |
| `--input-placeholder` | `#898989` |
| `--input-disabled` | `#f0f0f0` |
| `--input-disabled-text` | `#898989` |
| `--rail-bg` | `#121212` |
| `--rail-fg` | `#b4b4b4` |
| Radii | same as dark |

Light muted is Graphite, not Smoke, so helper text stays AA on `#fafafa`.

### Type (product scale, not marketing scale)

- Family: `"Manrope", ui-sans-serif, system-ui, sans-serif` everywhere, including `kbd`
- Weights: `400` and `500` only. Map 550/600/650/700/800 → `500`
- Tracking: `-0.007em` on UI text (`--track-title` becomes `-0.007em`)
- Keep current product sizes: `--fs-title: 20px`, `--fs-section: 14px`, `--fs-body: 13px`, `--fs-ui: 12px`, `--fs-meta: 11px`, `--fs-data: 15px`
- Tabular nums stay on body and numeric cells
- Remove DM Sans `@font-face` and the `@fontsource-variable/dm-sans` dependency after the swap
- Do not add Circular or Source Code Pro. `kbd` uses Manrope at 10–11px, weight 500

### Color rationing

One phosphor element per visual region:

- Rail: brand mark is the green
- Topbar: no green except the focused command trigger border
- Battle toolbar: Start / Next turn is the green
- Combat list: current-turn row border (not a green wash)
- Sheet: ally badge or HP number, not both as large fills
- Dialog: one primary submit

Ally HP track may stay phosphor at 3px. That is punctuation, not a wash.

### Elevation and focus

- Cards, dialogs, command palette, toasts, select menus: `border: 1px solid var(--line)`; `box-shadow: none`
- Focus: `border-color: var(--input-focus)` or `outline: 1px solid var(--accent); outline-offset: 2px`. No 3px glow ring
- `:focus-visible` on buttons uses the 1px outline, not a glow
- `caret-color: var(--accent)` stays

### Motion

- 150–250ms, `transform` and `opacity` (plus `border-color` / `background` already used)
- Keep `:active { transform: translateY(1px) }`
- Keep the existing `@media (prefers-reduced-motion: reduce)` kill switch
- Remove brand-mark `filter: drop-shadow(...)` glow

## Component mappings

| Component | Rule |
|---|---|
| `.primary` | Pill, `#3ecf8e` fill, `#fafafa` text, hover border `#1f4b37` |
| `.secondary`, `.subtle` | Pill ghost: transparent, `1px #393939` (dark) / `#d4d4d4` (light), hover `rgba(255,255,255,0.04)` on dark |
| `.danger` | Ghost pill, Snow/Graphite text, not a second hue |
| `.icon-button`, `.tiny-button` | Pill or 8px; no 4–6px leftover radii |
| `.panel`, `.saved-card`, `dialog`, `#toast` | 16px radius, 1px charcoal, no shadow |
| `input`, `textarea`, `select`, `.select-trigger` | 8px radius, focus = green 1px border |
| `.combatant.current`, `.player-card.current` | `--surface` fill + `1px solid var(--accent)` |
| `.avatar.ally` | 1px phosphor border, canvas fill, phosphor icon |
| `.condition-chip`, `.badge` | Pill |
| `.rail` | Same `#121212` as canvas, hairline `#2e2e2e` |
| `meta[name="theme-color"]` | `#121212` dark, `#fafafa` light |

## Surfaces in scope

1. Combat table (library, battle, sheet)
2. Saved encounters
3. Command palette
4. Settings / import / export / theme
5. HP, conditions, dice, edit, help dialogs
6. Empty library, empty combat, boot, lock-tab
7. Player view
8. `public/credits.html`
9. Mobile: 900px two-column, 600px stacked + bottom rail

## UI defects to fix while restyling

These are already visible in code. Close them in the task that owns the selector.

- Dark canvas `#000000` (forbidden; use `#121212`)
- Primary dark hover hardcoded `#4ade80`
- Input and select glow rings
- Dialog / toast / select-menu shadows
- Brand glow
- `h1`/`h2`/`h3` and data cells at 650–800
- Mixed radii (4 / 5 / 6 / 8 / 12)
- Credits page on a different navy system
- `theme-color` still `#000000` / `#f5f5f5`
- Light theme and dark theme disagree on accent (unify to `#3ecf8e`)
- `.profile` hardcoded `#1a1a1a` / `#3d3d3d` / `#ffffff`
- Mobile rail `border-top: 1px solid #1a1a1a` (use `var(--line)`)
- Current-turn green wash reduces scan contrast

## Out of scope

- React / Tailwind / shadcn / new icon set
- Marketing landing page
- Copy rewrite, URL changes, analytics rename
- New features (remote play, accounts)
- Applying `desing.md` display 72px or section-gap 64–96px to the table
- Impeccable concept-seed / new visual-world tournament (`desing.md` is the pin)

## Verification

- `npm test` and `npm run build` stay green
- Token contract test in `tests/tokens.test.ts` asserts dark and light variable values
- Browser, both themes, desktop and `<768px`: boot → add combatants → start → damage/heal → conditions → `⌘K` → player view → saved encounters → settings import/export → empty table
- Keyboard: tab through rail, command trigger, combatant HP; focus is a green 1px edge, readable
- Reduced motion: no animation, controls still work

## Finish artifacts (after the restyle, not before)

- `.cursor/rules/roundkeep-visual.mdc` — written in the first implementation task so later agents stay on the contract
- `DESIGN.md` — generated from shipped CSS at the end (`impeccable document`), never from this spec’s hopes
