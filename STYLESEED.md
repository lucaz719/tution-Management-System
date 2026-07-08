# StyleSeed — Design Lock
<!-- Locked design decisions. The agent re-reads this every prompt and must obey it. -->
- App domain:        SaaS Multi-tenant Tuition Management Dashboard
- Skin:              trust-corporate
- Primary brand:     #0F4C8A (Deep Academic Blue — sidebar, headings)
- Primary light:     #1B5FA7 (Royal Blue — links, focus, secondary actions)
- Accent CTA:        #F39C12 (Hover: #F7B733)
- Surfaces/text:     #FFFFFF bg, #F5F7FA surface, #2C3E50 text
- Status colors:     success #2E9E5B, warning #E08E00, error #D64545, info #1B5FA7
- Typography:        Fraunces display + Roboto UI
- Spacing scale:     4, 8, 12, 16, 24, 32, 40, 56
- Radius personality: structured-soft (7px inputs/buttons, 12px cards, 18px modals, 20px pills)
- Motion seed:       Silk (cubic-bezier(0.16, 1, 0.3, 1))
- Source of truth:   apps/web/src/index.css
- Legacy note:       packages/ui-login is prototype inspiration only; apps/web tokens are canonical
- Locked:            2026-07-07
