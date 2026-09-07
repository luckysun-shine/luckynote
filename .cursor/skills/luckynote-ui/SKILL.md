---
name: luckynote-ui
description: >
  lucky账本 Seal Ledger visual system and product UI patterns. Use when building or
  reviewing LuckyNote UI. Aesthetic is 印记账本 (cool rice-paper, seal vermillion, celadon)
  derived from Chinese household ledger vernacular via frontend-design — not the older
  coral/cream soft-UI kit. Production login must not show demo credentials.
---

# lucky账本 · 印记账本 UI

## Aesthetic

| Role | Token | Hex |
|------|-------|-----|
| Ground | `--ground` | `#E8EDE6` |
| Paper | `--paper` | `#F5F7F2` |
| Ink | `--ink` | `#16191F` |
| Muted | `--muted` | `#5C6470` |
| Seal (CTA / expense) | `--seal` | `#B91C1C` |
| Seal deep | `--seal-deep` | `#8F1414` |
| Celadon (income) | `--celadon` | `#2F6F5E` |
| Gold (balance accent) | `--gold` | `#A67C00` |

- Display: ZCOOL XiaoWei
- UI: Figtree + Chinese system fallbacks
- Radius: 12–16px surfaces; chips may stay pill; avoid every-control `999px`
- Home hero: **本月家庭结余** as the single bold figure; secondary metrics as split ledger row

## Product rules

1. Login: empty fields; never show demo username/password on the page
2. Bottom tabs ≤5
3. Prefer ruled/list structure over stacks of identical gradient cards
4. Motion: one entrance on login; elsewhere prefer action feedback + `prefers-reduced-motion`

## Stack

React + Vite + `frontend/src/styles.css` tokens. Pair with `frontend-design` for critique and `ui-ux-pro-max` for a11y/touch checks.
