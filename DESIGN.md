---
name: Local Media Downloader
description: A personal media darkroom — contact-sleeve fetch, develop, and shelf for local downloads.
colors:
  safelight-amber: "#F5A524"
  on-amber: "#12100C"
  ink-umbra: "#12100C"
  panel-sepia: "#1A1712"
  panel-bark: "#221D15"
  hairline-registration: "#33291C"
  warm-paper: "#F2EAD8"
  muted-ash: "#B3A68C"
  fixer-green: "#8FC16A"
  grease-red: "#E4572E"
  day-paper: "#F5F1E6"
  day-ink: "#211C12"
  day-amber-deep: "#93500A"
  day-on-amber: "#FBF8EF"
  day-fixer-deep: "#2F7A33"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Cascadia Mono', 'JetBrains Mono', ui-monospace, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.14em"
  mono:
    fontFamily: "'Cascadia Mono', 'JetBrains Mono', ui-monospace, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "2px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.safelight-amber}"
    textColor: "{colors.ink-umbra}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "#C77F0E"
    textColor: "{colors.ink-umbra}"
    rounded: "{rounded.sm}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.sm}"
  input-field:
    backgroundColor: "{colors.panel-sepia}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.sm}"
    height: "48px"
  frame-sleeve:
    backgroundColor: "{colors.panel-sepia}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.sm}"
---

# Design System: Local Media Downloader

## Overview

**Creative North Star: "The Contact Sleeve"**

A personal media darkroom, not a dashboard. The interface borrows a photo lab's contact sleeve — deep umber ground, warm paper text, safelight amber carrying the shell — and spends it on exactly four things: type, palette, density, and one signature move (the developing wash). Layout, navigation, and controls stay standard web components an owner already knows: top bar, side rail / bottom bar, ledger rows, uniform contact grid.

Density comes from the sheet, never chrome: 1px registration hairlines, corner-ticked frames, a sticky mono status strip, right-aligned run data on every row. The first viewport is the fetcher — URL plus platform mark, developing frame, format ledger — because paste-to-file in seconds is the whole job.

**Key Characteristics:**
- Committed darkroom palette; dark by scene (dim room, glowing phone), warm-paper light twin
- Contact-sheet density with hairline registration and frame numbers
- One signature move: downloads develop left-to-right under amber wash
- Tabular mono for every measurement; workhorse system sans for everything else
- State colors do jobs: amber working, fixer finished, grease-pencil red errors only

## Colors

Deep ink sleeve lit by safelight amber; warm paper ink; fixer green reserved for finished frames.

### Primary
- **Safelight Amber** (#F5A524): shell tint, active states, developing wash, primary buttons, focus rings, selection. Carries 30–60% of attention by design.

### Secondary
- **Fixer Green** (#8FC16A, day twin #2F7A33): finished states only — fixed frames, success toasts, ready engine dot.
- **Grease-Pencil Red** (#E4572E): errors, destructive actions, missing-engine warning. Never decoration.

### Neutral
- **Ink Umbra** (#12100C): dark ground; chosen from the use scene (night couch, dim desk), never by category default.
- **Panel Sepia** (#1A1712): sleeve cards, fetch panel, ledger.
- **Panel Bark** (#221D15): recessed wells (thumbnail beds).
- **Registration Hairline** (#33291C): 1px borders and dividers.
- **Warm Paper** (#F2EAD8): primary text on dark.
- **Muted Ash** (#B3A68C): secondary mono readouts; tinted from the umber, never gray.
- **Day Paper / Day Ink / Day Amber-Deep** (#F5F1E6 / #211C12 / #93500A): light-theme twins of the same roles.

### Named Rules
**The Developing-Amber Rule.** Amber means working-or-ready. Finished belongs to fixer green; nothing finished stays amber.
**The No-Gray Rule.** Secondary text is tinted umber or paper, never neutral gray, on either theme.

## Typography

**Display Font:** none — this Operate surface has no display voice; section titles set the top of the ramp.
**Body Font:** system workhorse grotesk (-apple-system, Segoe UI, Roboto…) with fallbacks.
**Label/Mono Font:** Cascadia Mono / JetBrains Mono / ui-monospace stack, tabular numerals everywhere.

**Character:** Lab-ledger plain: semibold short titles, roomy body, tracked mono caps for frame data. Weight and size carry emphasis; type is never gradient, never italic for flair.

### Hierarchy
- **Headline** (700, 15px, 1.3): section titles (Format ledger, Shelf, History counts).
- **Body** (400, 15px/1.55, max ~70ch): descriptions, settings copy, empty-state bodies.
- **Label** (mono 400, 11px, +0.14em, uppercase): frame numbers, status strip, field labels, run data.
- **Mono data** (mono 400, 12–13px, tabular): progress %, bytes, speed, ETA, sizes, LAN URLs.

### Named Rules
**The Duration-as-Length Rule.** Progress and duration are encoded as extent (wash width, bar fill), never as color alone.
**The Right-Aligned Run-Data Rule.** Sizes, ETAs, and counts sit tight against the row margin like track timings.

## Layout

Shell first: sticky mono status strip, top bar (wordmark, LAN chip, theme toggle), side rail on desktop / bottom tab bar on phone, single centered work column (max 72rem). Home splits fetcher-plus-ledger (5fr) against developing frame (4fr) on desktop, stacking single-column on phone. History is a uniform contact grid at fixed 16:9 scale (2 cols phone → 4 wide desktop). Spacing rhythm: tight groups (8px), generous separations (16–24px), always more space above a heading than below it.

## Elevation & Depth

No shadows as decoration. Depth is tonal layering: ground → panel → recessed bark wells, separated by 1px hairlines. The single shadow in the system is the toast stack's soft offset blur (large, diffused, offset) — transient surfaces only.

### Named Rules
**The Flat-Sleeve Rule.** Surfaces are flat at rest. Lift appears only on transient layers (toasts), never on cards or rows.

## Shapes

Nearly sharp registration language: 2px radius everywhere (frames, buttons, inputs, badges). Frames carry amber corner ticks (10px, 2px stroke) marking the active plate. No pills, no hard offset block shadows, no circular crops — thumbnails are full-bleed 16:9 plates with bottom scrim captions.

## Components

### Buttons
- **Shape:** nearly sharp (2px radius), 40px height, 16px horizontal padding, semibold 14px.
- **Primary:** safelight amber fill, ink-umbra text; hover deepens to amber-deep.
- **Hover / Focus:** color shift only; visible 2px amber focus ring with 2px offset.
- **Outline:** 1px hairline border, paper text; hover re-tints border and text to amber. **Ghost:** muted text, brightens on hover. **Danger:** grease border and text, grease wash on hover.

### Inputs / Fields
- **Style:** 48px height, panel-sepia fill, hairline stroke, 2px radius, 15px paper text; amber caret.
- **Focus:** border shifts to amber; no glow. **Placeholder:** muted at 70%. Selects and checkboxes match (amber accent).

### Badges
- **Style:** mono 11px tracked caps, hairline-or-state border, 2px radius. Tones: amber working, fixer finished, grease error, muted neutral.

### Navigation
- **Style:** side rail (desktop, 14px semibold rows) / bottom tab bar (phone, 11px labels with 19px glyphs). Active item: amber-tinted border plus amber wash fill; inactive: muted, brightening on hover. Standard links throughout — never a costume control.

### Developing Frame (signature)
- Full-bleed 16:9 thumbnail plate with corner ticks; amber wash overlay recedes left-to-right via transform as progress climbs (transform-only, layout-thrash free); finished frames sit fixed with fixer badge and frame number. Mono readout row: % · downloaded/total · speed · ETA · cancel ("pull").

### Format Ledger
- Ruled radio rows: semibold label, mono codec/resolution/FPS subline, right-aligned size estimate; grouped video then "Side B" audio-only; best-with-audio preselected; Download plus audio-only quick action in the footer.

## Do's and Don'ts

### Do:
- **Do** keep every measurement in tabular mono with right-aligned run data.
- **Do** let amber mean working-or-ready and fixer mean finished, everywhere.
- **Do** theme browser surfaces (selection, caret, scrollbar, focus ring) from the palette.
- **Do** hold history thumbnails to one fixed 16:9 scale on a shared baseline.

### Don't:
- **Don't** add kickers or eyebrows above headings; the heading carries its own weight.
- **Don't** use gradient text, glassmorphism, or hard offset block shadows.
- **Don't** costume controls as lab equipment; controls stay standard web components.
- **Don't** show progress by color alone; always pair extent with numerals.
- **Don't** invent testimonials, stats, or claims; surface only what yt-dlp actually returned.
