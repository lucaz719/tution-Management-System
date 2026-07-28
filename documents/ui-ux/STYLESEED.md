# StyleSeed — Design Lock

<!-- Locked design decisions. The agent re-reads this every prompt and must obey it. -->

- App domain:        SaaS Multi-tenant Tuition Management Dashboard
- Skin:              trust-corporate
- Primary brand:     #1560BD (Sanskardip brand blue — sidebar, headings, gradients)
- Primary light:     #2F6FED (Bright blue — links, focus, secondary actions)
- Primary dark:      #002D72 (Navy — gradient top)
- Accent CTA:        #FFBC3B (brand gold, from logo sun; Hover: #FFCB63)
- Surfaces/text:     #FFFFFF bg, #F5F7FA surface, #1B1F3B text
- Status colors:     success #00AB66, warning #E08E00, error #E63946, info #1560BD
- Brand source:      sanskardipshikshalaya.com.np official site (#1560BD used 35× in their style.css)
- Rebranded:         2026-07-13 (was #0F4C8A/#F39C12 generic academic palette)
- Typography:        Fraunces display + Roboto UI
- Spacing scale:     4, 8, 12, 16, 24, 32, 40, 56
- Radius personality: structured-soft (7px inputs/buttons, 12px cards, 18px modals, 20px pills)
- Motion seed:       Silk (cubic-bezier(0.16, 1, 0.3, 1))
- Source of truth:   apps/web/src/index.css
- Legacy note:       packages/ui-login is prototype inspiration only; apps/web tokens are canonical
- Locked:            2026-07-07
