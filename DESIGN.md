---
name: RoundKeep
description: Midnight Operate combat table with phosphor punctuation
colors:
  phosphor-green: "#3ecf8e"
  mint-pulse: "#00c573"
  forest-depth: "#1f4b37"
  midnight-emerald: "#006239"
  snow: "#fafafa"
  silver-mist: "#b4b4b4"
  smoke: "#898989"
  graphite: "#4d4d4d"
  slate: "#393939"
  charcoal: "#2e2e2e"
  ash: "#242424"
  obsidian: "#121212"
typography:
  body:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Manrope, Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.007em"
rounded:
  inputs: "6px"
  cards: "8px"
  controls: "6px"
spacing:
  8: "8px"
  16: "16px"
  24: "24px"
components:
  button-primary:
    backgroundColor: "{colors.phosphor-green}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.controls}"
    padding: "0 10px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.snow}"
    rounded: "{rounded.controls}"
    padding: "0 10px"
---

## Overview

RoundKeep is a local D&D 5e combat table. The shipped visual world follows the Supabase product design system, not the marketing landing page: Obsidian canvas, Inter UI with Manrope headings, `rounded-md` 6px controls, 8px cards, and Phosphor Green used once per region. Dark is canonical. Light is a snow-canvas translation of the same grammar.

## Colors

Dark canvas `#121212`, surfaces `#121212` / `#242424`, borders `#2e2e2e` / `#393939`, text `#fafafa` / `#b4b4b4` / muted `#a3a3a3` (AA on Ash), accent `#3ecf8e`. Light is snow `#fafafa` with Graphite muted `#4d4d4d`, line `#e5e5e5`, and ally-soft `#fafafa`. The rail stays Obsidian in both themes with a charcoal `--rail-line` `#2e2e2e`. No second hue. Ally marks reuse phosphor; enemy marks stay silver/graphite. Forest Depth is a border only. Green fill always uses Obsidian ink `#121212` — never snow on phosphor. Green *text* uses Midnight Emerald in light and phosphor on Obsidian in dark.

## Typography

Inter for UI, body, and data (Studio `--font-inter`, Helvetica Neue fallback). Manrope only for headings and the wordmark. Weights 400 and 500. Product sizes: 20 / 14 / 14 / 12 / 11 / 15. Body tracking `-0.01em`. Tabular nums on data. No 72px marketing display type.

## Layout

Fixed 56px rail, 48px topbar, three-pane combat grid (library / battle / sheet). Max content is the existing workspace, not a 1200px marketing container. At 600px the rail becomes a bottom bar.

## Elevation & Depth

No drop shadows. A 1px border is the only elevation. Focus is a 1px `#3ecf8e` edge, never a glow ring.

## Shapes

Controls, chips, kbd, and inputs use `rounded-md` 6px — the official [Button](https://supabase.com/design-system/docs/components/button) atom. Cards and dialogs 8px. Switches and avatars stay circular. No pill buttons.

## Components

Primary button follows Studio `Button` `size="tiny"` / `variant="primary"`: 26px, 12px Inter regular, 6px radius, phosphor fill, Obsidian label and icon (`text-foreground` on light; we keep Obsidian in dark so the pair stays AA — snow-on-phosphor is ~1.9:1). Ghost/default buttons are transparent with a slate border. Current combatant and current player card: Ash fill plus a 1px phosphor edge. Inputs share the canvas and turn the border green on focus.

## Do's and Don'ts

Do ration green to one element per region. Do keep rail / library / battle / sheet. Do honor `prefers-reduced-motion`.

Do not apply marketing heroes, logo clouds, card shadows, gradients, weights above 500, or a second accent. Do not use `#000000` as a canvas.
