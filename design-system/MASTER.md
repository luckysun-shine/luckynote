# lucky账本 Design System · 印记账本

Guided by **frontend-design** + product vernacular (Chinese household ledger).

## Direction

**印记账本 (Seal Ledger)** — cool celadon-tinted paper, ink black type, 朱砂 seal red for action/expense, celadon for income. Distinct from warm cream + terracotta AI defaults and dark fintech glass.

## Tokens

```css
:root {
  --ground: #e8ede6;
  --paper: #f5f7f2;
  --ink: #16191f;
  --muted: #5c6470;
  --seal: #b91c1c;
  --seal-deep: #8f1414;
  --celadon: #2f6f5e;
  --celadon-soft: #d7e8e1;
  --gold: #a67c00;
  --coral: var(--seal); /* legacy alias */
  --coral-deep: var(--seal-deep);
  --sage: var(--celadon);
  --sage-deep: #245748;
  --butter: #e6d39a;
  --blush: #f0d9d6;
  --line: rgba(22, 25, 31, 0.12);
  --shadow: 0 1px 0 rgba(22, 25, 31, 0.04), 0 14px 32px rgba(22, 25, 31, 0.07);
  --radius: 16px;
  --focus: var(--seal);
  --duration: 180ms;
}
```

## Hierarchy

1. One hero moment per primary screen (login brand / home balance)
2. Secondary data as quiet splits or ruled lists
3. Cards for forms and interactive panels only — not decorative metric tiles with gradients
