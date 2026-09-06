# Brand — TMS

_Status: deferred_

The user chose to defer setup. This project is currently using its existing TMS design system and no additional brand layer. The `frontend-design-guidelines` skill will quietly use the existing project defaults and will not prompt again.

To set up a real brand palette, typography, and voice at any time, run:

    /brand-design

or say: "pick brand colors"

When `brand-design` runs, it will detect this deferred state, skip the "confirm overwrite" step, and proceed directly to the full brand setup. The resulting palette will be applied to the project design tokens and this file will be replaced with the real brand documentation.

_Deferred at: 2026-08-28T00:00:00+05:45_
