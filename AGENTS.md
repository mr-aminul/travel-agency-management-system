# AGENTS.md

Project-specific guidance for AI coding agents.

## Terminology

- Use **sub agent** / **sub-agent** / `sub_agent` for referring agents who send clients.
- Never use **partner** in UI copy, errors, comments, tests, variable names, or new code.
- Legacy-only leftovers (`/partners` redirects, `pd-partners-created`, `partnerId` reads) must stay labeled as legacy and must not appear in new user-facing text.

<!-- ASTRYX:START -->
Product UI uses the custom `pd-*` design system (components under `src/components/ui`, styles under `src/styles`). Prefer extending existing `pd-*` patterns for new screens.

Astryx (`@astryxdesign/core`) is an **optional reference** only — do not require Astryx for new UI, and do not block work on Astryx CLI discovery. If exploring Astryx for inspiration:

CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (optional, only if deliberately using Astryx components):
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

OPTIONAL WORKFLOW:
1. `astryx build "<idea>"` — kit of closest [page] + [block]s + [component]s
2. `astryx template <name> [--skeleton]` — reference scaffold
3. `astryx component <Name>` — props + examples

When adapting Astryx ideas into this app, map them onto `pd-*` components/tokens — do not introduce raw Astryx layout requirements (`AppShell` / no-`<div>` rules) into product pages.
<!-- ASTRYX:END -->
