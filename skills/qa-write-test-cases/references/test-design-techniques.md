# Test Design Techniques

Step 4 derives checklist items with the techniques that fit the feature. An item derived from a source rule (its negative, its complement, a relation a formula implies) comes from that source.

## Coverage of the sources

- At least one item per acceptance criterion.
- One item per validation rule, edge case, and error message a source names, empty required fields included. An edge case a source names without its result still gets an item, marked `ask`: its expected result checks what any correct answer keeps (no error page, no NaN or blank value, the count matches the list), and must fail on at least one wrong outcome.
- A source that says "same as the existing X": items for the parts of X the feature shows, such as limits, defaults, values recalculated from other fields, and the options of an existing field the feature compares with.
- A sub-task that changes a shared component other features read (engine, API, table): one regression item for those features.

## Inputs

- Equivalence partitioning and boundary values: for each stated minimum or maximum, one item at the limit and one just outside it.
- Number inputs: negative and zero when the data can be negative, decimals, each accepted suffix in upper and lower case (`1.5B`, `1b`), malformed numbers (`1.2.3`, `--5`), a range with one bound empty.
- A time, date, or number input or display: one item with the device setting that changes its format (12-hour clock, region format).
- A message with placeholders: each value a placeholder takes (Buy/Sell) appears in at least one test of that message.
- Decision tables for combined conditions; pairwise combinations when several independent options interact.
- Invalid input combinations.

## State and time

- State transitions for statuses and lifecycles, and for a screen or request: invalid → fixed, failed → retried, a second record picked while the first is shown, one field of an active condition changed while the others keep their values.
- A trigger (status change, market or exchange event): the result arrives at the trigger's time, does not repeat while the state stays, and holds for each state the record can be in when it fires (already cancelled, edited).
- Several records hit by the same trigger at once: each gets its own result with its own values.
- A check that can pass on screen and fail at submit: the value changes in between (time passes, the balance is used elsewhere).
- An input that calls the server while typing: changing the keyword before the results arrive shows only the latest keyword's results.
- A form left and opened again (another tab, Back, another screen): one item for the values it keeps or clears and whether its empty state (placeholder, default) returns. With no source for the result, the item is `ask`.
- A change that moves, renames, or removes something the previous app version saved (last selected tab, filter, setting): one item that updates over the previous version with that state saved.

## Who and where

- A role/permission matrix when any source names user types for the screen (Guest, logged-in, account tiers), even if the ticket names none: one item per user type that the new behavior works for it. Access rules another story defines stay with that story.
- Each precondition a source states (user logged in, session valid): one item for when it does not hold.
- A source that lists where a result shows or who gets it (tabs, columns, tooltips, accounts): one item per place the new data reaches, even a place another feature owns, and one negative item for a place or receiver outside the list.
- A value or limit the ticket changes (minimum 5 → 10): one item per place that shows it (guide, tooltip, error text), even where the ticket leaves the text unchanged.
- An input whose UI or empty state the ticket changes: one item that the entered value still reaches each screen that shows it (confirmation, order book).

## Formulas and errors

- A formula: one check per period or variant it names, plus a relation it implies when exact values are hard to read (the sum over 20 days ≥ the sum over 10 days).
- One item per error class a source names or implies (timeout, 5xx, 4xx, network offline) that has its own expected result. Classes with the same result share one item with a data table.
