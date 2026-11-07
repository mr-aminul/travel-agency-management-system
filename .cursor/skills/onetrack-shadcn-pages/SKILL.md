---
name: onetrack-shadcn-pages
description: >-
  Rebuild an OneTrack list page with the Sub Agents look: shadcn controls,
  Geist, theme-colored stat cards, navy table header, column filters, and the
  floating form sheet. Use when converting Clients or other OneTrack pages to
  match Sub Agents, or when the user says follow the Sub Agents or FN People
  page.
---

# OneTrack shadcn pages

Match `src/pages/SubAgentsPage.tsx` and `src/styles/layout-clients.css`. Do not restyle the sidebar or top bar. Do not use the word partner.

## Page

- Root: `pd-page pd-page--elevated`. That class already sets the gray canvas, Geist, and theme chrome.
- Stat cards are shadcn `Button` with `pd-summary-stat`. Icons stay white. Do not add a border or a white line around the cards.
- Light mode cards use the theme gradient. Dark mode uses the lifted navy already set on `.dark .pd-page--elevated`.
- Search, Clear, view toggles, and Reset use `pd-white-control` so the fill is the surface color, not forced white.
- Buttons that match New Sub Agent are `h-9 rounded-lg shadow-xs`.
- Title case on labels and buttons. Leave names, IDs, and phone numbers as stored.
- No page subtitles.

## Table

- Wrap in `overflow-auto rounded-xl border bg-card shadow-md`.
- Header cells use `pd-chrome-head`. No line under the header.
- Keep row dividers. Column dividers stay the lighter ones in `layout-clients.css`.
- Put a column filter on every data column. Reuse the Sub Agents filter menu: small icon, “Filter …”, Select All, checkbox rows. Empty selection means no filter.
- Do not also put the same filters in the toolbar.

## Sheet

- New-record forms use shadcn `Sheet` with class `pd-sub-agent-sheet`: 180ms, floating rounded panel.
- Overlay stays `bg-black/42` with a 2px blur.
- Fields are shadcn inputs with a thin border and a clear fill. Footer divider is `border-border`, not the text color.
- Footer buttons are the same height as the page primary button.
- Photo upload uses `ProfilePhotoField`: shadcn dialog, thin border, always-visible camera badge.

## Leave alone

- Shared shell.
- Delete confirms and row menus that other pages still import, unless the task is that page.
