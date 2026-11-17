---
name: Local Media Downloader
description: A private household shelf for moving a link from the laptop to the phone.
colors:
  porcelain: "#F1EFE8"
  paper: "#FAF9F4"
  raised: "#E8E5DB"
  graphite: "#1A1B18"
  signal-orange: "#E9551F"
  cobalt: "#2F5DA8"
  green: "#1F7A4D"
  red: "#B3261E"
  night-ground: "#121310"
  night-panel: "#191B17"
  night-raised: "#22251F"
  bone: "#F2F0E8"
  board: "#1B1C17"
  board-edge: "#2D2F27"
  board-muted: "#B3B5A8"
  board-faint: "#929487"
  board-green: "#84D6A7"
  board-red: "#FF9D90"
typography:
  display:
    fontFamily: "'Archivo Variable', Archivo, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 0.87
    letterSpacing: "-0.045em"
  body:
    fontFamily: "'Archivo Variable', Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.6
  data:
    fontFamily: "'Azeret Mono Variable', 'Azeret Mono', ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "11px"
    letterSpacing: "0.05em"
    fontVariantNumeric: tabular-nums
rounded:
  card: "14px"
  field: "10px"
  button: "9px"
  pill: "999px"
  board: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "#161612"
    rounded: "{rounded.button}"
    height: "48px"
  surface-card:
    backgroundColor: "{colors.paper}"
    borderColor: "#D9D5C8"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.paper}"
    borderColor: "#D9D5C8"
    rounded: "{rounded.field}"
    height: "48px"
  shelf-board:
    backgroundColor: "{colors.board}"
    borderColor: "{colors.board-edge}"
    textColor: "{colors.bone}"
    rounded: "{rounded.board}"
---

# Design System: Local Media Downloader

## Overview

**Creative North Star: "The Shelf"**

The product is one workspace with one shelf. You add a link at the top; the laptop fetches it; finished files stand on a dark board with their title, platform, size, date, and one Save action. Files already on a phone move to their own group. Failed and removed files stay visible so the shelf never pretends work happened that did not. Defaults open over the same board as a side sheet. There is nowhere else to go.

The room around the shelf is porcelain. The shelf itself is graphite, always, in both themes. That contrast is the structure: a quiet household surface carrying one physical object. The board has a 6px top edge, square corners, hairline rules, a coloured spine on each row, and a soft cast shadow. The result should feel like a piece of furniture, not a streaming catalogue or an admin dashboard.

The redesign is structural, not a recolour. The former four-page model (Home, Downloads, Library, Settings) and its desktop rail, mobile tab bar, and page headers are gone. Live jobs and archived history are merged into the one board. The default settings live in a sheet, the old routes redirect to the shelf, and the phone's primary action stays in a fixed bar while a download is being chosen or fetched.

**Key characteristics:**
- One route, one workspace. The shelf is the home, the queue, the archive, and the save surface.
- The board is a real object: dark in both themes, edged, square, and visibly divided into shelf groups.
- One primary action at a time: **Fetch** → **Download on this laptop** → **Save** on a phone.
- Honest states: real sizes, real progress, real filenames, interrupted work labelled as cancelled, and a save that checks the file first.
- Defaults are a sheet over the shelf. No settings page, no secondary navigation.
- Short, warm, household language. No archive jargon and no format codes in the primary path.
- Phone first: 44px actions, 16px fields, and an 11px floor for functional text.

## Colors

The palette assigns jobs, not moods. Orange means "act"; cobalt means "phone" or focus; green means "ready or arrived"; red means "stopped"; porcelain and graphite carry the page and the board.

### Light world
- **Porcelain `#F1EFE8`** — the ground. Everything sits on it.
- **Paper `#FAF9F4`** — the add dock, cards, fields, and the sheet.
- **Raised `#E8E5DB`** — selected rows, inset wells, quiet fills.
- **Graphite `#1A1B18`** — primary ink, the dark board, and the active filter chip.
- **Signal orange `#E9551F`** — primary buttons, focus selection, and the active marker. It is a surface, not a small-text colour.
- **Brand orange `#B84312`** — orange used as text or an icon on light surfaces; 5.17:1 on paper.
- **Cobalt `#2F5DA8`** — the phone side of the handoff and the keyboard focus ring outside the board.
- **Green `#1F7A4D`** — ready, arrived, healthy service.
- **Red `#B3261E`** — failed, stopped, destructive.

### Dark world & the board
- **Night ground `#121310`**, **panel `#191B17`**, **raised `#22251F`**.
- **Bone `#F2F0E8`** — primary ink.
- **Signal orange `#FF6A2E`**, **brand `#FF8A58`**, **cobalt `#9BBCFF`**, **green `#64C894`**, **red `#FF7A6C`**.
- The board is **`#1B1C17`** with a **`#2D2F27`** edge in light mode and **`#1F211B`** with a **`#3B3F31`** edge in dark mode. It keeps bone text, muted **`#B3B5A8`**, faint **`#929487`**, and its own green **`#84D6A7`**, red **`#FF9D90`**, and orange **`#FF8A58`**.
- Borders stay low-contrast; text and controls carry the contrast.

The porcelain ground is intentional. This is a warm household appliance, not a pure-white SaaS page. The dark board is what gives it structure; it is not a theme toggle.

**Contrast floor:** body and helper text clear 4.5:1 against their ground. Faint text clears 4.5:1 on ground, paper, and the board. Signal orange is never used for text smaller than 18px on light surfaces. Status is always a word plus a dot or shape, never colour alone.

## Typography

**Archivo Variable** is the only UI and display family. Headings are semibold, tightly tracked, and sentence case. The page title is the exception: it is deliberately huge, set at 48–96px with −0.045em tracking and 0.87 line-height, so "Your shelf." behaves like a sign on the wall. Body copy is 15–16px with generous line height. Labels are 12–13px semibold. The product never uses all-caps sans for primary navigation or actions.

**Azeret Mono Variable** is reserved for counters, addresses, timestamps, byte counts, format strings, and instrument labels. It uses tabular numerals. Mono labels are 11–12px. Functional text never drops below 11px, including shelf metadata, filters, board counts, and footer smallprint; legal smallprint may be 12px with relaxed line height.

**Scale**
- Display / page title: `clamp(3rem, 8vw, 6rem)`, weight 600, tracking −0.045em.
- Sheet title: 24px.
- Section title: 17–20px.
- Row title: 14px / 1.35, clamped to two lines.
- Body: 15px / 1.6.
- Helper: 13px / 1.5.
- Data and metadata: 11–12px mono.
- Instrument label: 11px mono uppercase, tracking 0.12em.

## Layout

### Desktop (≥1024px)
A single 1240px column with 32px gutters, under a 56px sticky masthead. The masthead holds the wordmark, the service dot, **Defaults**, and the theme control. There is no rail and no page navigation.

The page reads top to bottom:
1. **Hero** — the title and one-sentence lede on the left; two counters on the right (**Ready now**, **On a phone**), separated by a hairline.
2. **Add dock** — a full-width paper strip with a label, one underlined URL field, and two actions. At ≥768px the label, field, and actions sit on one line.
3. **Choose a copy** — appears only after a link is read. A ruled mono label, then the quality picker or playlist card on the left and a sticky Handoff panel at 320px (1024–1279) or 360px (≥1280) on the right.
4. **The shelf board** — full width, dark, with the search and filters in its top bar.
5. **Footer** — one privacy line and the route mnemonic, at 12px.

### Phone (<1024px)
A 56px masthead: wordmark, service dot, a 44px **Defaults** icon, and the theme control. Content uses 16px gutters. The hero stacks; counters stay side by side with a vertical rule. The dock stacks its label, field, and two actions. The board follows.

The quality picker and Handoff panel stack. While a copy is selected or a job is live, a fixed action bar sits directly on the bottom edge with the selected copy, progress, and one action; the page reserves bottom padding so the bar never covers the last row. At 320px the layout still works: shelf actions wrap under the row body and the filter chips remain one scroll-free row.

### Breakpoints
- `680px`: shelf rows switch from a three-column (spine, thumb, body, then actions below) to a four-column row with actions on the right; search text drops from 16px to 13px.
- `768px`: the add dock becomes a three-column strip; the hero keeps its position.
- `900px`: the board top bar becomes one row: title and count on the left, search and filters on the right.
- `1024px`: the choose area becomes two columns; the Handoff panel becomes sticky; the fixed mobile action bar disappears.
- `1240px`: the content column caps. There is no wider layout.

## Elevation & Depth

Working surfaces are flat with 1px hairline borders. The shelf board is the one object with a cast shadow; it is a physical layer above the porcelain page. Shadow is otherwise reserved for floating layers: toasts, the fixed mobile action bar, the Defaults sheet, and dialogs. There are no decorative gradients, glass panels, or offset block shadows. Progress and the board's coloured spines are the only continuous marks in the work area.

## Shapes

Cards **14px**, fields **10px**, buttons **9px**, status pills fully round. The shelf board, its rows, its filter chips, and the Defaults sheet are square. Thumbnails are 48px squares inside rows. The row spine is a 3px strip; the board's top edge is 6px. Standard controls keep standard behaviour; custom chrome never replaces a native select, checkbox, or dialog contract.

## Signature: the Shelf Board

The board is the product's instrument and its memory.

- **Ready to save** — a green spine, a real file, and a Save button. Only rows with a file that still exists or a live finished job belong here.
- **In motion** — an orange spine, a percent, speed, ETA, and a progress meter. Playlist parents show "3 of 12 saved" and the current episode instead of a fake byte count. Cancel is always available.
- **On your phone** — a faint spine and the saved-to-device sentence. The local laptop copy may already be gone; the row says so.
- **Finished** — archive-only rows, playlists, and files that were removed from the laptop. They stay visible, but never offer a misleading Save or Download again.
- **Didn't finish** — a red spine, a plain-language error, and a **Details** disclosure with the raw engine message. Retry starts from the saved link when one exists; otherwise the dock is focused and the user is asked to paste it again.

Live jobs and history are one list. A live job wins over its archived duplicate so progress and Save state stay attached to the same row. A stale "active" history status with no in-memory job becomes **Cancelled** with an honest "service restarted" note, not phantom work. Search matches title and platform; the filters are **All**, **Ready**, **Saved**, and **Failed**. Saved means transferred, not merely finished. Remove is a two-step inline confirm; clear-list is a native dialog that removes records only, never files.

## Components

### Masthead
56px sticky, porcelain, one hairline below. Wordmark at 14px with an 11px mono "DOWNLOADER" line. The right side is utility only: readiness dot plus label, Defaults, theme. No navigation rows and no active page chip.

### Hero
A sign, not a marketing header. The title is the largest type in the product; the lede is one sentence and mentions the Wi-Fi boundary. Two counters with mono labels sit at the far right on desktop and below the lede on phone. No eyebrow chip, no badge, no decorative rule.

### Add dock
The first action surface. A paper strip with a 1px border and no bottom border, so it opens directly onto the choose area. The URL field is underlined in graphite; focus turns the rule orange. Paste and Fetch share one row on phone. Dragging a link over the dock turns the rule orange and washes the field. A clear control appears only when there is text. Privacy is stated in the hero lede and the footer, not in a separate chip.

### Choose a copy
A ruled label introduces the workbench. The quality picker holds media identity, three plain-language copies (Best quality, Smaller file, Audio only), a subtitle language selector when captions exist, and a disclosure for the full format ledger. The selected copy uses an orange wash and a filled radio. Playlists get a card with episode count, already-on-shelf count, and a single "Download new episodes" action.

### Handoff panel
A sticky card with a header, the two-port rail, a one-sentence caption, the selected copy, and the one primary action. The rail is **Laptop → track → Phone**. Fetching pulses the laptop port; ready turns it green and the phone port cobalt; saving moves a packet only during a real transfer; arrival stamps the phone port with a green check. The rail explains the journey; the progress meter measures it. On phone the panel stacks and its action is delegated to the fixed bar.

### Defaults sheet
A right-side `<dialog>` at `min(600px, 100vw)` and full height. Header: "This laptop", **Defaults.**, one sentence, and a 44px close control. A horizontal section strip (Appearance, Downloads, Subtitles, Private, Advanced, This laptop) scrolls on phone. The body holds every setting in labelled rows; the footer is sticky and only shows Discard and Save changes when the draft is dirty. Theme applies immediately; everything else saves together. The sheet owns the scroll and locks the page behind it. Old `/settings` links open this sheet over the shelf.

### Shelf row
Spine, 48px thumbnail, title, mono meta line, then state detail and actions. The meta line never uses separators that could orphan at a line start; items wrap as whole units with a 12px gap. Ready rows lead with Save (44px); live rows lead with Cancel; saved rows lead with the transfer sentence; failed rows lead with the friendly error. Save always uses the preflight `SaveLink`; a gone file is labelled, not offered again.

### Empty states
One small drawn shelf lip, one plain title, one sentence, one next action when one exists. The empty shelf points back to the dock. No giant blank media plate.

### Toasts and dialogs
Toasts sit below the masthead on phone and bottom-right on desktop: a coloured rail, title, optional body, close control, auto-dismiss. Dialogs use the native `<dialog>` element, a dimmed backdrop, and a clear destructive/cancel pair. The clear-list dialog starts focused on **Keep list**.

## Motion

One easing curve: `cubic-bezier(0.16, 1, 0.3, 1)`. Press 120ms, entrance 220ms, sheet arrival 260ms, arrival stamp 300ms. The handoff packet travels only during a real phone save. The progress bar is the only looping element while a job is live. There is no ambient motion, no floating decoration, and no animation that implies progress the backend has not reported.

`prefers-reduced-motion: reduce` removes page entrances, toast/dialog/sheet entrances, the port pulse, the packet, the arrival stamp, and the indeterminate progress slide. Smooth scrolling is disabled. The layout and state words remain identical.

## Accessibility

- Primary controls, row actions, filters, dock actions, and sheet tabs meet 44×44px on touch. The inline **Details** disclosure is the only smaller text control.
- Visible focus: 2px cobalt ring with a 2px offset outside the board; bone focus ring inside the dark board.
- Every icon-only control has an `aria-label`; every status has a text label; the handoff rail has a full sentence via `role="img"` and `aria-label`.
- Live job progress and save results use polite live regions; the sheet announces "Defaults open"; the document title names the shelf or Defaults.
- Native `<dialog>` for the sheet and the clear confirmation, native `<select>` for long option sets, real radio groups for segmented choices.
- Functional text stays at 11px or above; 16px URL and search fields on phone prevent browser zoom.
- Colour is never the only carrier of state. Green, red, and orange always arrive with a word and a shape.
- The skip link is the first focusable element and targets `#main`.

## Do's and Don'ts

### Do
- Make the shelf the home, the queue, the archive, and the save surface.
- Let the board feel like furniture: dark, edged, square, with visible groups.
- Say "Ready to save", "On your phone", "Save", "Download again", and "Didn't finish".
- Keep one primary action per state and keep it reachable on a phone.
- Show real sizes, percentages, speeds, and ETAs from the backend.
- Merge live jobs and history into one row per job; let the live row win.
- Put defaults in the sheet and leave the shelf visible behind it.
- Show the laptop address in the sheet where it reduces setup anxiety, and nowhere else.

### Don't
- Reintroduce a four-page nav, a desktop rail, a bottom tab bar, or page headers.
- Turn the shelf into a streaming-service poster grid or an equal-card dashboard.
- Use "Library", "Downloads tab", or "Settings page" as separate destinations in the interface.
- Use archive or darkroom jargon ("sleeve", "frame", "develop", "fixer").
- Show a giant empty preview plate before there is media.
- Use tiny uppercase mono for primary actions or essential labels.
- Show "Saved" without saying where.
- Leave a "Download again" action on a playlist parent that cannot be reconstructed from a single row.
- Show a stale active status as phantom work after a service restart.
- Bypass the file-existence preflight for any save link.
- Add decorative gradients, glassmorphism, or shadows to working surfaces.

## Assets and provenance

- Fonts are bundled locally through `@fontsource-variable/archivo` and `@fontsource-variable/azeret-mono`; the app makes no external font request.
- The app icon is a drawn SVG (`frontend/public/icons/icon.svg`) rendered to 192px, 512px, maskable 512px, and a 180px Apple touch icon. The PNGs are generated from that SVG, not traced from a third-party mark.
- The service worker caches the app shell and icons, never `/api/*`. Its cache name is bumped whenever the shell changes.
- README screenshots use representative demo rows and placeholder files. No personal history is shown.
