---
name: RoundKeep
description: Midnight Operate desk with phosphor punctuation
colors:
  phosphor-green: "#3ecf8e"
  mint-pulse: "#00c573"
  forest-depth: "#1f4b37"
  midnight-emerald: "#006239"
  snow: "#fafafa"
  fog: "#f0f0f0"
  hairline: "#e5e5e5"
  stone: "#d4d4d4"
  silver-mist: "#b4b4b4"
  pewter: "#a3a3a3"
  smoke: "#898989"
  graphite: "#4d4d4d"
  slate: "#393939"
  charcoal: "#2e2e2e"
  ash: "#242424"
  obsidian: "#121212"
typography:
  wordmark:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.16em"
  title:
    fontFamily: "Manrope, Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.007em"
  headline:
    fontFamily: "Manrope, Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.007em"
  body:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  ui:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
  data:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
rounded:
  controls: "6px"
  cards: "8px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
components:
  button-primary:
    backgroundColor: "{colors.phosphor-green}"
    textColor: "{colors.obsidian}"
    typography: "{typography.ui}"
    rounded: "{rounded.controls}"
    padding: "0 10px"
    height: "26px"
  button-primary-hover:
    backgroundColor: "{colors.phosphor-green}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.controls}"
    padding: "0 10px"
    height: "26px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.snow}"
    typography: "{typography.ui}"
    rounded: "{rounded.controls}"
    padding: "0 10px"
    height: "26px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.pewter}"
    rounded: "{rounded.controls}"
    size: "26px"
  input:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.snow}"
    typography: "{typography.body}"
    rounded: "{rounded.controls}"
    padding: "8px 10px"
    height: "26px"
  input-focus:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.snow}"
    rounded: "{rounded.controls}"
  panel:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.snow}"
    rounded: "{rounded.cards}"
    padding: "12px"
  chip:
    backgroundColor: "{colors.ash}"
    textColor: "{colors.snow}"
    typography: "{typography.label}"
    rounded: "{rounded.controls}"
    padding: "3px 6px"
  badge:
    backgroundColor: "{colors.ash}"
    textColor: "{colors.silver-mist}"
    typography: "{typography.label}"
    rounded: "{rounded.controls}"
    padding: "2px 6px"
  rail-button:
    backgroundColor: "transparent"
    textColor: "{colors.silver-mist}"
    rounded: "{rounded.controls}"
    size: "36px"
  stat-tile:
    backgroundColor: "{colors.ash}"
    textColor: "{colors.snow}"
    padding: "10px 4px"
  ability-cell:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.snow}"
    rounded: "{rounded.controls}"
    padding: "6px 0"
---

# Design System: RoundKeep

## Overview

**Creative North Star: "Phosphor punctuation on an Obsidian desk"**

RoundKeep is an Operate tool for the table. The shipped world follows the Supabase Studio product system, not the marketing site: an Obsidian canvas, Inter for interface and numbers, Manrope only for headings, 6px controls, 8px panels, and Phosphor Green used as a single mark. Dark is canonical. Light is the same grammar translated onto a snow canvas. Density is tight, type stays at or below medium, and depth is a hairline, never a shadow.

This file is the shared RoundKeep visual system. A sibling app for player character sheets copies color, type, shape, elevation, motion, and components from here. It keeps the shell — a fixed Obsidian rail, a 48px topbar, and panels edged by a 1px line — and composes its own panes. The combat table's three-column encounter grid is this app's layout, not a brand requirement.

**Key Characteristics:**

- Dark is canonical; light is a snow-canvas translation of the same tokens
- Phosphor appears once per region, as an edge, a word, or a fill — never as a wash
- Depth is a 1px border; focus is a 1px phosphor edge
- Chrome is Studio tiny: 26px tall, 12px Inter, weight 400
- Nothing is heavier than weight 500
- Numbers use tabular figures
- Controls are 6px; panels are 8px; buttons are never pills

## Colors

One green hue, rationed. Neutrals do the structure. Dark values below are the canonical theme; light swaps the neutral roles and the green *ink*, never the green fill.

### Primary

- **Phosphor Green** (`colors.phosphor-green`): the only accent. Primary button fill, focus border, current-row edge, live dot, wordmark dot, and selection tint (32% mix). On a green *fill*, the label is always Obsidian.
- **Mint Pulse** (`colors.mint-pulse`): green *text* in dark — links, turn labels, ally marks, HP emphasis. Not a second hue; it is Phosphor stepped darker so it reads on Obsidian.
- **Midnight Emerald** (`colors.midnight-emerald`): the same green-text role in light. Links, ally marks, and accent-strong ink on snow.
- **Forest Depth** (`colors.forest-depth`): a border pigment only. Primary hover border, and the edge of a "green" glyph. Never a fill.

### Neutral

- **Obsidian** (`colors.obsidian`): dark canvas, dark panel, dark input, rail in both themes, and the ink on every Phosphor fill. Also the text color in light.
- **Ash** (`colors.ash`): dark raised surface — hover rows, selected rows, chips, stat tiles, disabled inputs.
- **Charcoal** (`colors.charcoal`): dark hairline and the rail divider in both themes.
- **Slate** (`colors.slate`): dark strong line, secondary button border, dark input border.
- **Graphite** (`colors.graphite`): light muted text, light enemy mark, input border on hover.
- **Pewter** (`colors.pewter`): dark muted text. It clears WCAG AA on both Obsidian and Ash.
- **Smoke** (`colors.smoke`): placeholder and disabled text in both themes.
- **Silver Mist** (`colors.silver-mist`): rail icons, and the enemy mark in dark.
- **Snow** (`colors.snow`): dark text, and the light canvas / panel.
- **Fog** (`colors.fog`): light raised surface.
- **Hairline** (`colors.hairline`): light border.
- **Stone** (`colors.stone`): light strong border and light input border.

### Theme roles

| Role | Dark | Light |
| --- | --- | --- |
| Canvas, panel, input | Obsidian | Snow |
| Raised surface | Ash | Fog |
| Hairline | Charcoal | Hairline |
| Strong line / input border | Slate | Stone |
| Text | Snow | Obsidian |
| Muted | Pewter | Graphite |
| Green fill | Phosphor | Phosphor |
| Ink on green fill | Obsidian | Obsidian |
| Green text, links, ally | Mint Pulse | Midnight Emerald |
| Ally surface | Obsidian | Snow |
| Enemy mark | Silver Mist | Graphite |
| Enemy surface | Ash | Fog |
| Rail background / icon / line | Obsidian / Silver Mist / Charcoal | same |

Placeholders and disabled labels stay Smoke in both themes. The rail never flips to snow.

### Named Rules

**The One Phosphor Rule.** Each region gets one green mark: a current edge, a primary button, a live dot, or a focused field. A second green element in the same region is a bug.

**The Obsidian Ink Rule.** Text and icons on a Phosphor fill are Obsidian. Snow on Phosphor fails contrast and is unused.

**The No Second Hue Rule.** Ally reuses the green ink. Enemy, damage, and warning stay inside the neutral scale. There is no red and no gold.

## Typography

**Display Font:** none. There is no hero scale.
**Body / UI / numbers:** Inter, with Helvetica Neue, Helvetica, Arial.
**Headings:** Manrope, falling back through Inter.
**Wordmark:** ui-monospace (SF Mono, Menlo, Monaco, Consolas).

**Character:** A product UI, not an editorial page. Inter carries reading, controls, and data. Manrope appears only where a heading needs a slightly more geometric voice. The wordmark is tracked-out monospace, with the middle dot in Phosphor.

### Hierarchy

- **Wordmark** (500, 13px, line-height 1, tracking 0.16em, uppercase): the ROUND·KEEP mark in the topbar and on the boot screen. The boot subtitle drops to Manrope 13px, muted, normal case, tracking 0.
- **Title** (Manrope 500, 20px, line-height 1.2, tracking -0.007em): page titles. A sheet identity name may step to 18px; a quiet player-facing title may step to 28px. Do not invent a size above 28px.
- **Headline** (Manrope 500, 14px, line-height 1.35, tracking -0.007em): section titles and panel names.
- **Body** (Inter 400, 14px, line-height 1.5, tracking -0.01em): paragraphs and field values. Measure stays near 65ch in dialogs.
- **UI** (Inter 400, 12px, line-height 1.35): buttons, tabs, list names, field chrome.
- **Label** (Inter 500, 11px, line-height 1.35, tracking 0, sentence case): eyebrows, meta, column captions, badges. Not uppercase.
- **Data** (Inter 500, 15px, tabular-nums): initiative and other figures the eye scans. Stat values step to 18px or 22px; HP in a row is 13px. All of them are tabular.

`strong` and `b` are weight 500, same as headings. Tabular numerals are on for the whole body.

### Named Rules

**The Weight Ceiling Rule.** 400 for reading and controls, 500 for headings, names, and numbers. 600 and above do not exist.

**The Manrope Fence Rule.** Manrope is for `h1`–`h3` and the boot subtitle. Buttons, inputs, badges, and data stay in Inter.

**The No Display Rule.** No 72px marketing type, no logo clouds, no oversized numerals as decoration.

## Layout

The reusable shell is a fixed rail plus a topbar plus one workspace. The rail is 56px wide, Obsidian, full height, with a 28px Phosphor brand mark and 36px icon buttons. The topbar is 48px, gridded as context / command / actions, padded 0 20px, separated by a 1px hairline. Main padding is 14px 20px. Page headings sit 14px under that, actions gapped at 8px.

Panes are bordered panels, not floating cards. The combat table uses `240px / flexible / 300px` with a 12px gap; from 1600px that becomes `260 / flexible / 320` with a 16px gap. Below 1250px the sheet pane drops under the battle. Below 850px the rail narrows to 52px and the topbar loses context. At 600px the rail becomes a 52px bottom bar and the panes stack. A character-sheet app keeps this shell and these breakpoints, and chooses pane widths for the sheet instead of the encounter grid.

Vertical rhythm is 4 / 8 / 12 / 16 / 20. List rows are at least 44px. Combatant rows are 52px. Sticky side panes fill `100dvh` minus the chrome (about 132px). Scrollbars are 8px, thumb in the strong-line color, transparent track.

## Elevation & Depth

The system is flat. `--shadow` is `none`. Panels, dialogs, menus, toasts, and avatars do not cast shadows. A 1px border separates a surface from the canvas; Ash (or Fog, in light) separates a raised row from the panel. Overlays use a 72% Obsidian veil (`rgba(18, 18, 18, 0.72)`), still with no shadow on the dialog.

Focus on controls is `outline: 1px solid` Phosphor, offset 2px. Inputs and open selects replace that outline with a Phosphor border and `box-shadow: none`. There is no glow ring.

### Named Rules

**The Flat-By-Default Rule.** If a surface needs a shadow to explain itself, the border is missing. Add the border.

**The Hairline Focus Rule.** Focus is a 1px Phosphor edge. Never a 3px ring, never a glow.

## Shapes

Controls, inputs, chips, badges, kbd, list rows, avatars, and ability cells use 6px (`rounded.controls`). Panels, dialogs, toasts, menus, and player cards use 8px (`rounded.cards`). The two steps are the whole radius scale.

Circles are reserved for the profile mark, the toggle knob, the live dot, and the step index in an empty state. The toggle *track* is a 28×16 pill. Scrollbar thumbs are pills. Buttons, chips, and avatars are not pills. Avatars are 28px (40px when large) with a 6px corner and a 1px border. Empty states use a dashed hairline and an 8px corner.

Icons are small outline glyphs in `currentColor`, typically 13–16px, with a 6px gap to the label. They do not carry their own color unless they sit on Phosphor, where they inherit Obsidian.

## Components

Chrome feels like Studio's tiny button: short, quiet, and immediate. Motion is 160ms ease on color and border. Press shifts the control down 1px. Disabled controls drop to 38% opacity. `prefers-reduced-motion: reduce` removes transitions and animation.

### Buttons

- **Shape:** 6px corners, 26px height, padding 0 10px, 12px Inter at weight 400, 1px border, 6px icon gap.
- **Primary:** Phosphor fill, Phosphor border, Obsidian label and icon. Hover keeps the fill and moves the border to Forest Depth.
- **Secondary / subtle:** transparent, strong-line border, text color. Hover adds a 4% text wash and a Graphite border.
- **Danger:** same drawing as secondary. Danger is not red.
- **Icon:** 26×26, muted color, 6px corners, no border until it sits in a panel title (then a hairline and an Ash fill). Hover turns the glyph to text color.
- **Text:** green ink (Mint Pulse / Midnight Emerald), 12px, padding 4px 6px, no border.
- **Busy:** label hidden, 13px spinner, 2px ring, 0.7s linear.

### Chips

- **Style:** Ash fill, text color, 1px hairline, 6px corners, 11px, padding 3px 6px. Counts inside the chip are muted and tabular.
- **State:** chips are labels. They are not toggle pills.

### Badges

- **Style:** 11px weight 500, padding 2px 6px, 6px corners.
- **Enemy / neutral:** enemy-soft fill, enemy ink, hairline border.
- **Ally:** ally ink, ally-soft fill, border mixed 30% ally into the hairline.

### Cards / Containers

- **Corner style:** 8px for panels, dialogs, saved cards, and player cards. Nested notes and metric tiles use 6px.
- **Background:** panel matches the canvas. Raised content uses the surface token.
- **Shadow strategy:** none. See Elevation.
- **Border:** 1px hairline. The current card (current combatant, current player) swaps the border to Phosphor and the fill to the surface token. Selected is surface fill plus a strong line, without Phosphor.
- **Internal padding:** panel titles 12px 12px 10px; card bodies 12–16px; dialogs 18px.
- **Stat tiles:** three-up strip, surface fill, 1px dividers, label at 11px muted, value at 18px (22px for the lead value), weight 500, tabular.
- **Ability cells:** six-up, 4px gap, canvas fill, 1px hairline, 6px corners. Label 11px muted, score 13px weight 500, modifier 10px muted.

### Inputs / Fields

- **Style:** canvas fill, 1px border (Slate in dark, Stone in light), 6px corners, padding 8px 10px, min-height 26px, inherited Inter. Placeholder is Smoke.
- **Hover:** border shifts to Graphite.
- **Focus:** border becomes Phosphor, shadow stays none, caret is Phosphor.
- **Disabled:** surface fill, Smoke text.
- **Error:** border uses the enemy neutral (Graphite in light, Silver Mist in dark). No red glow.
- **Search:** 26px row, 6px corners, 8px horizontal padding, icon in muted. Focus colors the border only.
- **Select menu:** panel fill, 8px corners, 4px padding, options at 26px with 6px corners. Hover and selected share the surface fill; the selected label turns green ink.

### Navigation

- **Rail:** Obsidian in both themes, 56px, icon buttons 36px at 6px radius in Silver Mist. Hover and active use the surface fill and text color. Active is not a Phosphor pill.
- **Topbar:** 48px, wordmark or breadcrumb on the left (breadcrumb 11px, muted, current crumb in text at weight 500), command trigger centered, actions on the right at 8px gap.
- **Tabs:** 12px, muted, 8px padding, transparent 1px bottom border. Selected uses text color and a text-colored underline. No filled tab.
- **Mobile:** at 600px the rail is a bottom bar, 52px, Charcoal top border, brand mark kept.

### Current row

The signature state of the product. A row or player card that is "now" gets an Ash (or Fog) fill and a 1px Phosphor border. It does not get a green wash, a left bar, or a glow. Fallen rows simply drop to 55% opacity.

### Dialogs and toasts

Dialogs are 520px (640px wide), 8px corners, 18px padding, hairline border, no shadow, max-height 85vh. Titles are Manrope 18px. Toasts sit bottom-center, panel fill, hairline, 8px corners, 12px type, and fade/translate in 180ms.

## Do's and Don'ts

### Do:

- **Do** treat dark as the source of truth and derive light by swapping the neutral roles in the theme table.
- **Do** keep one Phosphor mark per region.
- **Do** put Obsidian ink on every Phosphor fill.
- **Do** use a 1px border for separation and a 1px Phosphor edge for focus and for the current item.
- **Do** set controls to 26px, 12px Inter, weight 400, 6px radius, and panels to 8px radius.
- **Do** keep the Obsidian rail in both themes.
- **Do** use tabular numbers for scores, HP, AC, initiative, and modifiers.
- **Do** honor `prefers-reduced-motion` by cutting transitions and animation.
- **Do** reuse the shell (rail, topbar, panels, 4/8/12/16/20 rhythm) in the character-sheet app.

### Don't:

- **Don't** put snow text on a Phosphor fill.
- **Don't** introduce a second accent, a red, a gold, or a gradient.
- **Don't** use `#000000` as a canvas. The canvas is Obsidian.
- **Don't** add drop shadows, glow rings, or green washes behind the current row.
- **Don't** use pill buttons, pill chips, or pill avatars. The toggle track is the only control pill.
- **Don't** set a font weight above 500, or use Manrope on buttons and data.
- **Don't** ship marketing heroes, 72px display type, or logo clouds.
- **Don't** copy the combat three-pane grid into the sheet app as if the columns were the brand. Copy the shell and the components.
