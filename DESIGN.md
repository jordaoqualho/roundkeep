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
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.007em"
  heading:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.007em"
rounded:
  inputs: "8px"
  cards: "16px"
  pills: "9999px"
spacing:
  8: "8px"
  16: "16px"
  24: "24px"
components:
  button-primary:
    backgroundColor: "{colors.phosphor-green}"
    textColor: "{colors.snow}"
    rounded: "{rounded.pills}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.snow}"
    rounded: "{rounded.pills}"
    padding: "8px 16px"
---

## Overview

RoundKeep is a local D&D 5e combat table. The shipped visual world is a midnight Operate skin: Obsidian canvas, hairline Charcoal borders, Manrope at 400/500, and Phosphor Green used once per region (brand, primary CTA, current turn, focus). Dark is canonical. Light is a snow-canvas translation of the same grammar.

## Colors

Dark canvas `#121212`, surfaces `#121212` / `#242424`, borders `#2e2e2e` / `#393939`, text `#fafafa` / `#b4b4b4` / `#898989`, accent `#3ecf8e`. Light is snow `#fafafa` with Graphite muted `#4d4d4d`, line `#e5e5e5`, and ally-soft `#fafafa`. The rail stays Obsidian in both themes with a charcoal `--rail-line` `#2e2e2e`. No second hue. Ally marks reuse phosphor; enemy marks stay silver/graphite. Forest Depth is a border only.

## Typography

Manrope only. Weights 400 and 500. Product sizes stay compact: 20 / 14 / 13 / 12 / 11 / 15. Tracking `-0.007em`. Tabular nums on data. No 72px marketing display type.

## Layout

Fixed 56px rail, 48px topbar, three-pane combat grid (library / battle / sheet). Max content is the existing workspace, not a 1200px marketing container. At 600px the rail becomes a bottom bar.

## Elevation & Depth

No drop shadows. A 1px border is the only elevation. Focus is a 1px `#3ecf8e` edge, never a glow ring.

## Shapes

Pills `9999px` for buttons, tags, chips, and kbd. Cards and dialogs `16px`. Inputs `8px`.

## Components

Primary button: phosphor fill, snow label, forest-depth border on hover. Ghost buttons: transparent, slate border. Current combatant and current player card: Ash fill plus a 1px phosphor edge. Inputs share the canvas and turn the border green on focus.

## Do's and Don'ts

Do ration green to one element per region. Do keep rail / library / battle / sheet. Do honor `prefers-reduced-motion`.

Do not apply marketing heroes, logo clouds, card shadows, gradients, weights above 500, or a second accent. Do not use `#000000` as a canvas.
