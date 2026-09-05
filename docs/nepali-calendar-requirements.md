# Nepali academic calendar

Status: Web implementation. Scope agreed: an institution/HR calendar with BS and AD dates, institution events, and live Nepal time. Tithi and automatic festival feeds are out of scope.

## Shared components

- `apps/web/src/components/NepalDateTime.tsx`: Nepali date and weekday, English date, and a live Nepal clock. Uses existing brand/theme colors. Uses a compact two-line layout without a separate card or oversized clock. Props: `compact`, `showSeconds`, `className`.
- `apps/web/src/components/calendar/NepalCalendar.tsx`: reusable month calendar with typed events, loading/error/retry states, opt-in clock (`showClock` defaults to false to prevent duplicate page clocks), calendar-system control, date-selection callback, and weekly closure configuration.
- `apps/web/src/hooks/useNepalClock.ts`: one timer shared across mounted instances, cleaned up when unused. Calendar consumers update on date changes rather than every second. Refreshes on tab visibility changes and window focus.
- `apps/web/src/utils/nepalCalendar.ts`: explicit Kathmandu date keys, date-only arithmetic, BS conversion, month boundaries, event membership, and Nepal input conversion. Existing legacy date helpers retain their contracts.

```tsx
<NepalDateTime />
<NepalDateTime compact showSeconds={false} />
<NepalCalendar
  events={events}
  loading={loading}
  error={errorMessage}
  onRetry={reload}
  weeklyDaysOff={[6]}
  onDateSelect={(gregorianDateKey) => openDay(gregorianDateKey)}
/>
```

The widget appears on dashboard/home routes using `DashboardShell`. The institution academic calendar uses the shared calendar through `TenantAcademicCalendar`. Other portal calendars and native Flutter screens can adopt the component/model in a later rollout.

## Calendar behavior

- BS is the initial calendar system. AD/BS switching preserves the selected absolute date.
- Nepali BS dates are prominent; Gregorian dates appear in the corner. AD mode reverses the hierarchy.
- Sunday-first weeks, Nepali weekday labels, complete required weeks, and muted adjacent-month dates.
- Previous/next month, month/year picker, and Today. Selecting an adjacent date opens its containing month.
- Today uses the brand blue fill; selection uses the brand outline. Combined states retain a separate outline. Holidays and weekly closures use semantic holiday text colors.
- Up to two event titles appear in desktop cells, with an overflow count. Phones show dates and event counts; full details remain available below the grid.
- Arrow keys move between days, Home/End move within a week, Enter/Space select, and Escape closes the month picker.
- The installed BS dataset covers 1976-2100 BS. Navigation is limited to its supported years; unsupported BS dates do not silently show AD numbers.
- Loading and event-fetch errors are distinct from an empty schedule, with retry available to the host.

## HR rules and ownership

Institution-created holiday records are the source of truth. A festival does not automatically close the institution. Weekly days off are supplied with `weeklyDaysOff` (Sunday = 0); the current institution adapter defaults to Saturday. This is a display setting, not a payroll or attendance policy change. Persisted weekly closure administration is not included in this implementation.

Existing holiday, exam, event, and fee-due records remain available under their existing institution/branch permissions. No public calendar scraping or third-party holiday dataset is used. Leave/shift overlays can be added when their workflows and access rules are connected; private staff details must remain role-restricted.

## Time and event semantics

- Display timezone: `Asia/Kathmandu` (UTC+05:45), independent of browser timezone.
- The live clock shows device time converted to Nepal time. It is not a server-authoritative attendance clock or a stopwatch.
- Nepal midnight refreshes the date and Today marker without reloading. Browsing another month does not forcibly navigate away.
- Date-only keys use Gregorian `YYYY-MM-DD`; timestamps retain their canonical instants. BS values are derived.
- The institution calendar event form explicitly accepts Nepal time and rejects an end before the start.
- Event membership includes both start and end Nepal dates, preserving existing inclusive behavior. An event ending exactly at midnight therefore appears on the ending date too.
- The shared calendar can display date-only events. A dedicated all-day creation control/backend contract is future work.
- Displaying BS does not redefine payroll, billing, or attendance reporting periods.

## Validation

Run `node --test apps/web/tests/nepal-calendar.test.cjs` for date conversion, all supported BS month boundaries, rollover, timezone independence, and multi-day event membership.

Run `node apps/web/tests/run-nepal-calendar-browser.cjs` for an isolated Edge headless component fixture with navigation, event details, date rollover, and responsive screenshots. It serves local test fixtures on port 5187 and writes generated files under `apps/web/node_modules/.cache/nepal-calendar-preview`.

Run `npm.cmd run build --workspace web` and `npm.cmd run lint --workspace web` for web checks on Windows.
