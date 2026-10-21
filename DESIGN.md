---
name: Local Media Downloader
description: A private local media route — paste a link, fetch it on the laptop, save it to the phone.
colors:
  night-ground: "#14130F"
  night-surface: "#1D1B16"
  night-raised: "#26231C"
  night-line: "#3A362B"
  paper-ground: "#F3EFE4"
  paper-surface: "#FFFDF7"
  paper-raised: "#EAE4D6"
  paper-line: "#D7CFBF"
  saffron: "#F5C542"
  saffron-deep: "#8A5C00"
  ink: "#17150F"
  warm-white: "#F8F4E9"
  muted-night: "#B8B1A1"
  muted-day: "#665F52"
  go-night: "#59C08A"
  go-day: "#1C7A4C"
  stop-night: "#F47A61"
  stop-day: "#B23A2A"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Aptos, Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Aptos, Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  data:
    fontFamily: "'Cascadia Mono', 'JetBrains Mono', ui-monospace, Consolas, monospace"
    fontSize: "13px"
    fontVariantNumeric: tabular-nums
rounded:
  card: "18px"
  field: "12px"
  button: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    height: "48px"
  surface-card:
    backgroundColor: "{colors.night-surface}"
    borderColor: "{colors.night-line}"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.night-surface}"
    borderColor: "{colors.night-line}"
    rounded: "{rounded.field}"
    height: "52px"
---

# Design System: Local Media Downloader

## Overview

**Creative North Star: "The Departure Board"**

A small private transit board for media. The app takes the clarity of a station departure board — bold saffron bands, black ink, large numbers, sentence-case signs, route lines — and uses it to explain one journey: **link → laptop → phone**. The world enters through type, palette, density, and one signature move. It never dresses the controls as airport equipment.

The first viewport answers three questions without a manual: what this does, where to start, and what happens next. On Home that means a plain headline, a large paste field, and the three-stop route. After a link is read, the page becomes a quality picker with a persistent mobile action. After a download starts, the route becomes live and tells the truth about which part of the journey is happening.

**Key characteristics:**
- Saffron and black carry action and attention; warm paper is the light world, warm near-black the dark one.
- One humanist sans family for UI and headings; mono only for measurements.
- The route strip is the signature: Link → Laptop → Phone, with completed stops checked and the active stop signed.
- Large touch targets, short copy, visible page titles, standard controls.
- Honest states: no fake progress, no "saved" without saying where, no save action without the file preflight.

## Colors

The palette does jobs. Saffron is the route and the primary action. Green is arrival. Red is a stopped route. Muted ink is secondary information.

### Roles
- **Saffron (#F5C542):** primary buttons, route fill, active tab underline, focus in dark mode, small attention marks.
- **Saffron Deep (#8A5C00):** links, icons, and accent text on light surfaces where saffron itself would not carry enough contrast.
- **Ink (#17150F) / Warm White (#F8F4E9):** text on the opposite ground.
- **Go (#59C08A dark / #1C7A4C light):** ready, on your phone, FFmpeg ready.
- **Stop (#F47A61 dark / #B23A2A light):** failed, missing helper, destructive actions.
- **Ground / Surface / Raised / Line:** tonal layering only; no decorative gradients on working surfaces.

**The Where-Am-I Rule.** A finished file is never just "Saved". It is "On this laptop" until the phone save completes, then "On your phone".

## Typography

**One family:** the system humanist sans. Headings are heavy (800) and tightly tracked; body copy is 15–16px; labels are sentence case, 13–14px, weight 600. Avoid tiny tracked uppercase as a default voice.

**Data:** mono, tabular numerals, 12–13px, right-aligned where values are compared.

**Scale:** display 32–44px; page title 30–38px; section title 18–20px; card title 15–16px; body 15–16px; helper 13–14px; data 12–13px. Essential information never drops below 12px.

## Layout

- **Desktop:** sticky top bar; four text-and-icon links inline; content max 1120px. Home is a 7/5 split: paste, result, and quality on the left; a sticky route card on the right.
- **Phone:** compact top bar with wordmark, status, and theme; four-tab bottom bar at 68px; single-column content with 16px gutters. Primary actions become a fixed bar above the nav when a download is ready to start or save.
- **Page headers:** every route begins with a visible h1 and one short sentence. No page relies on the nav alone for orientation.
- **Spacing:** tight groups 8–12px, card padding 16–20px, section gaps 24–32px, generous separation above headings.

## Elevation & Depth

Working surfaces are flat and hairline-ruled. Shadow belongs only to floating layers: toasts and the fixed mobile action bar. No offset block shadows, no glassmorphism.

## Shapes

Cards 18px, fields 12px, buttons 10px, status pills fully round. Thumbnails use a 12px radius inside cards. The route strip uses circles and 2px lines. Standard web controls stay standard.

## Signature: the Route Strip

Three stops: **Link**, **Laptop**, **Phone**. A thin track connects them. Completed stops show a check; the active stop has a saffron ring and a plain-language caption; the arrival stop turns green only when the file is actually on the phone. The strip appears on Home and on live job cards, and never replaces the separate progress meter.

The route is honest about the two-machine model: the laptop fetches and holds the file; the phone saves it. This is the one piece of world-specific interaction the app keeps.

## Components

### Buttons
Primary: saffron fill, ink text, 48px. Secondary: surface with a line border. Ghost: muted text, surface on hover. Danger: stop-colored text and border. All interactive targets are at least 44px on touch.

### Fields
Inputs and selects are 52px, 12px radius, surface fill, line border, 16px text. Focus uses a 3px visible ring in the theme focus color. Selects keep a clear chevron and native behavior. Labels sit above fields; helper text sits below.

### Status Pills
Dot + word, tinted background, 13px semibold. Words: Waiting, Reading link, Downloading, Finishing, Ready, Failed, Cancelled, On your phone. Never rely on color alone.

### Job Card
A horizontal card on phone and desktop: 16:9 thumbnail, title, platform and size/time, a compact route strip, a progress meter, and only the actions for the current state. Save uses the preflight `SaveLink`.

### Library Card
Phone: horizontal row with a 112×72 thumbnail, title, metadata, status, and a wrapped action row. Desktop: vertical card in a 2–3 column grid. Search and filters sit above and scope the list; the clear action is separated from the search field.

### Empty States
One icon, one plain title, one sentence, and a next action when one exists. No giant blank media plate.

### Toasts
Phone: top, below the header. Desktop: bottom-right. Colored rail, title, optional body, close control, auto-dismiss.

## Motion

One easing: `cubic-bezier(.2, .8, .2, 1)`. Press 140ms, entrance 240ms, route fill 400ms. The route line fills left-to-right; arrival gets one small stamp/scale confirmation. No looping decorative motion. Respect `prefers-reduced-motion` and remove all non-essential transitions.

## Do's and Don'ts

### Do
- Make the next action the most prominent thing on the screen.
- Say "Save to this device", "On this laptop", "On your phone", "Download again".
- Keep the mobile primary action reachable above the nav.
- Use real sizes, percentages, speeds, and ETAs from the backend.
- Keep the route strip and the progress meter separate: one explains the journey, the other measures the transfer.

### Don't
- Use darkroom or archive jargon ("sleeve", "frame", "develop", "fixer") in user-facing copy.
- Show a giant empty preview plate before there is media.
- Use tiny uppercase mono for primary actions or essential labels.
- Show "Saved" without saying where.
- Bypass the file-existence preflight for any save link.
