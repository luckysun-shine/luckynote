---
name: luckynote-ui
description: >
  lucky账本 (LuckyNote) product UI constraints and brand system. Use whenever designing,
  building, reviewing, or polishing LuckyNote frontend UI (login, tabs, ledgers, calendar,
  forms, Me hub). Takes precedence over generic ui-ux-pro-max palette/style suggestions
  when they conflict with this brand. Also use for production login (no demo credentials).
---

# lucky账本 UI Skill

Pair with `ui-ux-pro-max` for accessibility / touch / motion checklists.
**When they conflict, this file wins for brand, layout language, and product rules.**

## Brand tokens (do not replace)

| Token | Value | Role |
|-------|-------|------|
| `--cream` | `#fbf6f0` | Page atmosphere |
| `--paper` | `#fff9f4` | Surfaces |
| `--ink` | `#3d405b` | Text |
| `--muted` | `#5c6078` | Secondary text (≥4.5:1 on cream) |
| `--coral` / `--coral-deep` | `#e07a5f` / `#c45c42` | Primary CTA |
| `--sage` / `--sage-deep` | `#81b29a` / `#5e9178` | Positive / income |
| `--butter` / `--blush` | `#f2cc8f` / `#f4dcd4` | Soft accents |
| Fonts | ZCOOL XiaoWei (display) + Nunito (UI) | Keep |

Light, warm, family-home mood. **Do not** switch to dark fintech blue, purple gradients, or generic glassmorphism redesigns.

## Product rules

1. Production login: empty username/password; **never** show demo accounts/passwords on UI.
2. Brand first on auth / marketing surfaces: `lucky账本` is hero-level, not a nav crumb.
3. Bottom tabs ≤5: 总览 / 账本 / 记账 / 日历 / 我的.
4. Cards only when they hold interaction or a clear list row — not decorative chrome.
5. One job per section; reduce pill clusters and competing promo blocks.
6. Preserve App-like segmented controls + horizontal filter chips.

## UX checklist (from ui-ux-pro-max, adapted)

- Touch targets ≥44px; filter chips ≥40px where density requires, prefer 44px.
- Visible `:focus-visible` rings (coral).
- Disable / busy state on async submit buttons.
- Form fields use visible labels (not placeholder-only).
- Honor `prefers-reduced-motion`.
- No horizontal page scroll on mobile; safe-area for tabbar/header.
- Cursor pointer + 150–300ms transitions on interactive controls.

## Stack

React + Vite + hand-written CSS variables (not Tailwind/shadcn). Prefer extending `frontend/src/styles.css` tokens over introducing a new CSS framework.

## References

- Persisted design notes: `design-system/MASTER.md`
- Run generic searches only as supplements:
  `python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux`
