# lucky账本 Design System (Master)

Generated with guidance from **ui-ux-pro-max** (UX checklist / search), then locked to the
LuckyNote warm family-ledger brand. Do **not** apply the skill’s default dark-blue glass
finance palette to this product.

## Product

- Name: lucky账本 / LuckyNote
- Type: Family personal finance ledger (mobile-first PWA + desktop)
- Mood: Warm, cozy, calm home accounting — soft cream atmosphere, coral CTA, sage for income

## Visual tokens

```css
:root {
  --cream: #fbf6f0;
  --paper: #fff9f4;
  --ink: #3d405b;
  --muted: #5c6078; /* contrast-tuned for body secondary text */
  --coral: #e07a5f;
  --coral-deep: #c45c42;
  --sage: #81b29a;
  --sage-deep: #5e9178;
  --butter: #f2cc8f;
  --blush: #f4dcd4;
  --line: rgba(61, 64, 91, 0.1);
  --shadow: 0 14px 40px rgba(61, 64, 91, 0.08);
  --radius: 22px;
  --focus: #c45c42;
  --duration: 180ms;
}
```

- Display: `ZCOOL XiaoWei`
- UI: `Nunito` + system Chinese fallbacks

## Layout patterns

- Login: single-column brand → form (production, no demo credentials)
- Shell desktop: sidebar + main
- Shell mobile: sticky header + 5-tab bar (总览 / 账本 / 记账 / 日历 / 我的)
- Filters: horizontal chip scroller + segmented control

## Style decisions (overrides ui-ux-pro-max auto picks)

| Topic | Decision |
|-------|----------|
| Style | Soft warm light UI (not glassmorphism redesign / not dark mode) |
| Primary | Coral CTA |
| Positive | Sage |
| Cards | Interaction surfaces only |
| Icons in tab bar | Geometric glyphs (not emoji) |
| Ledger icon picker | Emoji allowed as user content |

## UX rules (critical)

1. Accessibility: 4.5:1 text contrast; focus rings; labeled inputs
2. Touch: ≥44×44px primary controls
3. Motion: 150–300ms; respect `prefers-reduced-motion`
4. Feedback: loading/disabled on async actions; toast for errors
5. Responsive: verify 375 / 768 / 1024 / 1440; no horizontal scroll

## Anti-patterns

- Showing seed/demo passwords on login
- Purple-on-white or cream+terracotta “AI default” redesign that drops coral/sage tokens
- Dark navy fintech glass dashboard skin
- Emoji as chrome icons in tab bar
- Hover-only interactions without tap affordance
