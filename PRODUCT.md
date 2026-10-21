# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of one laptop and the people in their household, usually on a phone on the same Wi-Fi network. They are in a casual, everyday situation: someone sent them a video or song, or they want to keep something they found, and they want it on their phone with as little ceremony as possible. They are not media archivists or command-line users.

## Product Purpose

A private, local media downloader. Paste a link, choose a quality, download it to the laptop, then save the finished file to the phone. Success means the owner can go from a copied link to a playable file on their phone without understanding formats, codecs, cookies, or FFmpeg.

## Positioning

The whole pipeline stays on hardware the household owns: the laptop fetches and keeps the file, and the phone only retrieves the finished copy over the local network. No cloud account, no third-party storage, no subscription. The same service is reachable from every phone on the LAN.

## Operating Context

- The laptop runs a local service; phones reach it at a LAN address such as `http://192.168.1.42:8000` (example).
- The phone browser is the primary surface, often one-handed and in portrait orientation.
- Downloads continue on the laptop while the phone navigates away or locks; the phone can return later to check progress.
- A laptop-side file exists before the phone can save it; the phone save is a separate, explicit step.
- The owner may use the laptop itself as a secondary surface.
- The household shares the device and the media shelf; content should remain family-friendly.

## Capabilities and Constraints

Confirmed behavior that a redesign must preserve:

- Paste or drop a video/audio URL, inspect the media, and start a download.
- Video quality choices and an audio-only path; default audio quality is 320 kbps. Per-download subtitle language choice remains available.
- Playlist detection with an option to download only new episodes.
- Live progress for queued, extracting, downloading, merging, finished, cancelled, and failed jobs. Jobs continue across navigation and are visible in a Downloads view.
- Finished downloads can be saved to the current device. The save flow must preflight the file's existence so a missing file never downloads as a JSON error body. Show a distinct "already on your device" state when the laptop copy was removed after transfer.
- History stores finished and failed items with title, platform, thumbnail, size, date, status, and actions to save, download again, or delete. It can be searched, filtered, and cleared.
- Settings persist: theme (System / Dark / Light), preferred video quality, default audio-only mode, 320/192/128 kbps audio, download folder, concurrent limit, auto-delete after phone save, subtitle mode and language, auto-caption fallback, cookie upload for private videos, thumbnail/metadata embedding, and an optional FFmpeg path.
- The service reports FFmpeg readiness and LAN URLs.
- The interface must be usable on a phone: large touch targets, minimal reading, clear primary actions, no hover-only affordances.
- The visual language must stay coherent across dark, light, and system themes.
- The product is a browser-based PWA; no native app assumption.

Known technical constraints:

- React + Vite + Tailwind frontend served by a FastAPI backend on the same origin.
- Save actions are HTTP file navigations guarded by an API check.
- Clipboard reads may be blocked on plain HTTP; the product must gracefully tell the user to paste manually.
- The app must not fabricate sizes, progress, durations, or file availability the backend has not returned.

## Brand Commitments

- Name: Local Media Downloader.
- Voice: plain, warm, household-friendly, never technical for its own sake.
- The previous darkroom/contact-sleeve metaphor was an internal visual direction, not a durable brand requirement. The redesign is explicitly allowed to replace it.
- Keep the promise of privacy and locality visible where it reduces anxiety; do not turn it into a marketing claim.
- Keep the current family-friendly tone.

## Evidence on Hand

- A running, working implementation in this repository; the code and its tests are the primary evidence.
- Real history rows and files for Instagram and X downloads were verified during the previous milestone.
- No testimonials, customer logos, press, benchmarks, or brand photography exist. Future work must not invent them.
- The current repository and regression suite are the source of truth. README screenshots use representative demo data.

## Product Principles

1. **One obvious next step.** At every moment the interface should make the next action clear without a manual. On Home that is paste/find; after a result it is choose quality/download; after a download it is save.
2. **Plain words over system vocabulary.** Say "Save to this device", "Download again", "Needs a login", not "frame", "sleeve", "develop", or raw engine codes.
3. **The phone is the remote, the laptop is the vault.** Progress belongs to the laptop; saving belongs to the phone. Make that division legible.
4. **Calm, honest feedback.** Show real states and real numbers. Never fake progress, and never leave an action looking available when the file is gone.
5. **Family-simple, not toy-like.** Large targets and short copy, with enough craft and character that the owner enjoys using it.

## Accessibility & Inclusion

Inferred from the brief and existing implementation; not separately confirmed in an interview:

- Touch targets at least 44–48 px on phone.
- Body text large enough to read one-handed; avoid essential information below 13 px.
- Keyboard and screen-reader support for all actions, visible focus, labeled controls.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone to communicate status; pair it with words and extent.
