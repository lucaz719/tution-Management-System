# Accountant Portal Changes

## Overview

The Accountant Workspace was updated to improve navigation, petty-cash requests, invoice handling, and detailed financial record review. The main implementation is in:

- `apps/web/src/pages/StaffFinancePage.tsx`
- `apps/web/src/pages/staffFinance.css`
- `apps/web/src/components/patterns/PageShell.tsx`

## 1. Accountant navigation

The accountant sections were moved into the existing left-side navigation drawer opened by the top-left hamburger button.

Available sections:

1. Overview
2. Petty cash
3. Billing & invoices
4. Reports

Each section uses a URL hash such as `/staff/finance#petty-cash`. This allows the correct section to remain selected when the URL changes or the page is revisited. The shared `PageShell` was updated so hash-based navigation items receive the correct active state.

On mobile, selecting a section automatically closes the navigation drawer. On desktop, the existing sidebar collapse and expand behavior remains available.

## 2. Itemized petty-cash request form

The previous petty-cash form contained only a description and amount. It was replaced with a receipt-style itemized request form.

Each request now contains:

- Item name
- Quantity
- Amount per item
- Automatically calculated line total
- Automatically calculated request total
- Separate request description
- Supporting document when resubmitting a requested revision

Accountants can add multiple item rows and remove unnecessary rows. At least one row must remain in the form.

### Validation

A request cannot be submitted when:

- The description is empty.
- An item name is missing.
- Quantity is zero or invalid.
- Unit amount is zero or invalid.
- The calculated request total is zero.
- The total exceeds the remaining monthly petty-cash limit.
- A revision requires supporting evidence and no file is attached.

The total amount is derived from the item rows instead of being manually entered:

`request total = sum(quantity × unit amount)`

## 3. Petty-cash request submission and revision

New submissions store their itemized rows together with the description and calculated total in the page state. Revision-requested records reopen the same form and preserve the existing request details.

After resubmission:

- The same request ID is retained.
- The request returns to pending status.
- Previous reviewer and revision markers are cleared from the active request state.
- The revised item list, description, and calculated total are retained.

The existing two-step approval explanation remains visible:

1. Branch Admin review
2. Tenant Admin approval and fund release
3. Accountant receipt submission
4. Administrator receipt verification and closure

## 4. Complete petty-cash request details

Accountants can open a request by clicking its request ID, description, or view arrow.

The details dialog displays:

- Request ID
- Current status
- Submission date
- Description
- Complete item list
- Quantity and amount per item
- Line totals
- Overall request total
- Branch Admin review progress
- Tenant Admin release progress
- Receipt-verification progress
- Reviewer name and notes
- Submitted receipt filename, when available
- The next action required from the accountant or administrator

Contextual actions are provided:

- `Revise request` for revision-requested records
- `Add receipt` for released records
- `Close` for records with no immediate accountant action

Older records without itemized data remain readable. They are displayed as a single legacy line item using the existing purpose and total amount.

## 5. Billing and invoice search

The search control was rebuilt to prevent its visible label, search icon, and entered text from overlapping.

The updated search supports:

- Student names
- Invoice numbers
- Grade or course text already included in the invoice search data

A separate visible payment-status filter supports:

- All statuses
- Paid
- Due
- Overdue
- Needs verification

The controls stack vertically on small screens.

## 6. Fine removal

The fine feature was removed from the Accountant Workspace billing interface.

The following were removed:

- Fine values from invoice records used by this page
- Fine presentation in the invoice table
- Fine additions in collected and outstanding totals
- Fine additions in payment-confirmation totals

Invoice calculations now use:

`net payable = gross amount − discount`

## 7. Invoice discounts

Accountants can apply a discount to unpaid invoices.

Available discount types:

- Flat
- Percentage
- Sibling
- Scholarship

Percentage discounts are limited to the configured 20% policy used by the current interface. Flat discounts cannot exceed the invoice gross amount.

After application, the invoice table displays:

- Discount amount
- Discount type
- Recalculated net payable amount

## 8. Student billing history

Student names in the invoice table are interactive buttons. Selecting a student opens a complete billing-history dialog.

The dialog includes:

- Current and past invoice numbers
- Billing cycles
- Gross amounts
- Discount amounts and types
- Final payable amounts
- Payment methods
- Payment references
- Invoice statuses
- Total amount billed
- Total discounts received
- Current outstanding amount

The dialog and table support horizontal scrolling on narrow screens.

## 9. Accessibility and responsive behavior

The updated interface includes:

- Real buttons for all interactive controls
- Visible labels for form inputs
- Keyboard-accessible navigation and record actions
- Escape-to-close modal behavior
- Focus trapping and focus restoration for dialogs
- Minimum 40-pixel interactive targets
- Numeric mobile keyboards for quantity and currency fields
- Responsive item rows and summary cards
- Reduced-motion support
- Existing light and dark theme tokens

## 10. Verification performed

The changes were verified with:

- Web TypeScript production build
- Webpack production build
- Project lint command
- `git diff --check`

The production build completed successfully. Existing unrelated lint warnings remain elsewhere in the project.

## 11. Current integration note

`StaffFinancePage.tsx` currently operates as an interactive front-end workspace using local sample state. The itemized petty-cash rows and expanded billing-history interactions are represented in the page model, but they are not yet connected by this page to persistent accountant API calls.

For production persistence, the follow-up integration should:

1. Add itemized petty-cash fields to the API request contract and database record.
2. Submit new and revised requests through the finance API.
3. Load petty-cash and invoice records from the authenticated branch.
4. Load complete student billing history from the server.
5. Persist discount operations through an authorized finance endpoint.

