# luckynest Design System

Aligned to `docs/prototypes/luckynest-app.html` + brand logo.
Audited with `.cursor/skills/ui-design` + `frontend-design-pro` (design-ui-prototype kit).

## Tokens

```css
--bg:#f7f5fc; --paper:#ffffff;
--ink:#262038; --ink2:#5c536e; --ink3:#706788; /* AA-safe captions */
--line:#efeaf6;
--brand:#c8a4f0; --brand-mid:#8f6fd6; --brand-d:#7450c4; --brand-l:#f3edfc;
--teal:#c1e7dc; --teal-d:#2e9e78; --amber:#ffd98a; --red:#ff9d9d; --red-d:#d45a5a;
--space-1..6 (4→32px); --text-xs..2xl (1.25 scale); --touch:44px;
--ease: cubic-bezier(0.16, 1, 0.3, 1);
```

## Brand

- Name: **luckynest**
- Tagline: 幸运记账 · 账户独立 · 日历一看就懂
- Logo: `/brand/luckynest-logo.png` · mark `/brand/luckynest-mark.png`
- Font: Nunito (+ PingFang SC for CJK)

## Nav

首页 · 日历 · 记一笔 · 账户 · 我的

## Quality gates (from ui-design)

- Caption/secondary text ≥ 4.5:1 on `--bg` / white
- Primary buttons use `--brand-d` / `--seal-deep` so white label passes AA
- Touch targets ≥ 44px
- Focus rings brand-lavender (no leftover seal-red)
- `prefers-reduced-motion` respected
