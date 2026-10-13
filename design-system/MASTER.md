# luckynest Design System

Aligned to `docs/prototypes/luckynest-app.html` + brand logo.
Audited with `.cursor/skills/ui-design` + `frontend-design-pro` (design-ui-prototype kit).

## Tokens

```css
--bg:#f7f7fc; --paper:#ffffff;
--ink:#29263e; --ink2:#77748a; --ink3:#77748a;
--line:#eceaf3;
--brand:#a99ae8; --brand-mid:#8270d8; --brand-d:#6855be; --brand-l:#f0ecfc;
--hero-grad: linear-gradient(105deg,#f9e6f3,#eae4fc,#e2edfd);
--teal:#c1e7dc; --teal-d:#2e9e78; --amber:#ffd98a; --red:#ff9d9d; --red-d:#d45a5a;
--space-1..6 (4→32px); --text-xs..2xl (1.25 scale); --touch:44px;
--ease: cubic-bezier(0.16, 1, 0.3, 1);
```

## Brand

- Name: **luckynest**（视觉对齐 Figma「暖暖账本」，产品名不变）
- Tagline: 每一笔，都是认真生活的印记
- Logo: `/brand/luckynest-logo.png` · mark `/brand/luckynest-mark.png`
- Font: Noto Sans SC (+ Inter for amounts); fallback PingFang SC / Microsoft YaHei

## Nav

首页 · 账单 · 记账 · 统计 · 我的  
（日历查账 / 账户资产为首页快捷入口，二级页）

## Quality gates (from ui-design)

- Caption/secondary text ≥ 4.5:1 on `--bg` / white
- Primary buttons use `--brand-d` / `--seal-deep` so white label passes AA
- Touch targets ≥ 44px
- Focus rings brand-lavender (no leftover seal-red)
- `prefers-reduced-motion` respected
