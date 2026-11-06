# AGENTS.md

Project-specific guidance for AI coding agents.

## Copy

One line per thing. The title, field label, or button is that line.

- Do not add page subtitles, eyebrows, kickers, or helper text that restates the title or the label.
- `description` and `hint` stay on the components. Pass them only for a consequence the title cannot carry (an irreversible action, or a secret shown once). Prefer putting that fact in the title and leaving `description` empty.
- Errors and format placeholders stay. Sidebar “Platform” and “Sub agent portal” stay — they name a different shell.
- If a screen only makes sense with the extra sentence, change the layout so the control or the row shows the fact.

## Terminology

- Use **sub agent** / **sub-agent** / `sub_agent` for referring agents who send clients.
- Never use **partner** in UI copy, errors, comments, tests, variable names, or new code.
- Legacy-only leftovers (`/partners` redirects, `pd-partners-created`, `partnerId` reads) must stay labeled as legacy and must not appear in new user-facing text.

<!-- ASTRYX:START -->
Product UI uses the custom `pd-*` design system (components under `src/components/ui`, styles under `src/styles`). Prefer extending existing `pd-*` patterns for new screens.

Astryx (`@astryxdesign/core`) is an **optional reference** only. Do not require Astryx for new UI, and do not block work on Astryx CLI discovery. If exploring Astryx for inspiration:

CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (optional, only if deliberately using Astryx components):
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

OPTIONAL WORKFLOW:
1. `astryx build "<idea>"`: kit of closest [page] + [block]s + [component]s
2. `astryx template <name> [--skeleton]`: reference scaffold
3. `astryx component <Name>`: props + examples

When adapting Astryx ideas into this app, map them onto `pd-*` components/tokens. Do not introduce raw Astryx layout requirements (`AppShell` / no-`<div>` rules) into product pages.
<!-- ASTRYX:END -->
