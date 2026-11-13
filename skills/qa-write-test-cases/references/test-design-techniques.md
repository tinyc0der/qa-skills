# Test Design Techniques

Step 4 derives checklist items with standard test design techniques (ISTQB), spent by risk on a securities trading system. Pick the techniques that fit the feature. An item derived from a source rule (its negative, its complement, a relation a formula implies) comes from that source.

## 1. Risk first

Rate each area of the feature by impact and likelihood before deriving items. High impact in trading: money and orders (price, volume, buying power, fees, P&L), order status and lifecycle, trading sessions and market time, data shown to investors, who can see or do what (account, sub-account, user type), and authentication (OTP, session). Derive items for high-risk areas first and in most depth. A low-risk area gets the requirement coverage items and at most one UI item per screen.

## 2. Specification-based techniques

**Requirement coverage (traceability)**

- At least one item per acceptance criterion.
- One item per validation rule, edge case, and error message a source names, empty required fields included. An edge case a source names without its result still gets an item, marked `ask`: its expected result checks what any correct answer keeps (no error page, no NaN or blank value, the count matches the list), and must fail on at least one wrong outcome.
- A source that says "same as the existing X": items for the parts of X the feature shows, such as limits, defaults, values recalculated from other fields, and the options of an existing field the feature compares with.
- An acceptance criterion that says "matches screen X" when X reads the same data: one more item checks one record against an independent oracle (recomputed from the formula, or a third screen), since the match passes by construction.

**Equivalence partitioning**

- One item per valid class and per invalid class of each input; values of one class share one item with a data table.
- Number inputs: negative and zero when the data can be negative, decimals, each accepted suffix in upper and lower case (`1.5B`, `1b`), malformed numbers (`1.2.3`, `--5`), a range with one bound empty.
- A message with placeholders: each value a placeholder takes (Buy/Sell) appears in at least one test of that message.
- A field the ticket adds or changes that shows time, date, or numbers: the device setting that changes its format (12-hour clock, region format) is one class.
- A fix whose root cause names the components it changes (gesture handler, touch handler, button type): one class per component, each tested with its highest-risk example (the order button).

**Boundary value analysis**

- For each stated minimum, maximum, or time limit (lot size, price step, ceiling and floor, session open and close, the last day of a rolling window): one item at the limit and one just outside it. Use the limit in the ticket, even when it changed (minimum 5 → 10).
- A number shown at fixed precision: a value that rounds to the smallest shown value (0.00) or to zero.

**Decision tables and combinations**

- Combined conditions: one item per rule with its own outcome; rules with the same outcome share one item.
- Pairwise combinations when several independent options interact.
- Invalid input combinations.
- A rule that picks one of several records (latest period, latest version, effective date): one item where a newer record wins and an older one does not show, and one where a record re-imported while shown leaves no duplicate or mixed rows.

**State transition**

- Statuses and lifecycles (order states): each valid transition and each blocked one.
- A screen or form: invalid → fixed, failed → retried, a second record picked while the first is shown, one field of an active condition changed while the others keep their values, and the form left and opened again (values kept or cleared; with no source for the result, an `ask` item).
- A state an acceptance criterion names (after the drawer closes, after login): one row per way to reach it; ways no source states are `ask` rows.
- A trigger (status change, market or exchange event): the result arrives at the trigger's time, does not repeat while the state stays, and holds for each state the record can be in when it fires (already cancelled, edited).
- Several records hit by the same trigger at once: each gets its own result with its own values.
- A check that can pass on screen and fail at submit: the value changes in between (time passes, the balance is used elsewhere).
- An input that calls the server while typing: changing the keyword before the results arrive shows only the latest keyword's results.
- A change that moves, renames, or removes something the previous app version saved (last selected tab, filter, setting): one item that updates over the previous version with that state saved.

**Use case and data flow**

- The main flow end to end, then each alternative flow.
- Where the result goes: one item per place the new or changed data reaches (another screen, order book, notification, export), even a place another feature owns, and one negative item for a place or receiver outside the list. A changed value or limit: each place that shows it (guide, tooltip, error text).

**Role and permission matrix**

- When any source names user types for the screen (Guest, logged-in, account tiers, experiment groups), even if the ticket names none: one item per user type whose result can differ (the behavior reads login state, tier, or group); user types with the same result share one item with a data table. A fix that does not read the user type needs no user-type rows. Access rules another story defines stay with that story.
- A screen open to more users than the data's source screen (public screen, restricted source): one item that the response for the least privileged user carries only the fields the screen shows.

## 3. Experience-based techniques

**Error guessing**

- One item per error class a source names or implies (timeout, 5xx, 4xx, network offline) that has its own expected result. Classes with the same result share one item with a data table.
- Each precondition a source states (user logged in, session valid, OTP valid): one item for when it does not hold. For a failed job or import, seed the data state the failure leaves (a missing record, a null field) instead of stopping the job.
- An intermittent bug (race, timing): repeat the repro about 3/p times for a reported rate p (1 in 15 → 45 rounds), 10 times when no source gives a rate, and the same count for every repro of that bug.

**Regression**

- A sub-task that changes a shared component other features read (engine, API, table, tab bar): one regression item for those features. Its expected result is the previous version's result on the same data (values and row count), not only "no error". When a field is removed or becomes null, the data has one row per value the field used to hold (each exchange, each type).
- A fix to gestures or touch handling on a container: one item for the gestures that share its area (back swipe on a pushed screen, scroll), `ask` when no source gives the result.

## 4. Not worth a test

Leave these out, unless the user asks for them or a source says the ticket changes them:

- Behavior the ticket does not change, such as validation an earlier story owns (one regression item covers a changed shared component).
- Cosmetic details: colors, fonts, spacing, alignment, icon shapes, animation, picker wheel positions. One UI item per screen compares the screen with the design.
- A separate theme item, or a language item for a screen whose text the ticket leaves unchanged.
- One item per field label, tooltip line, or data row that one item with a data table covers.
- Generic platform behavior: the keyboard opens, scrolling, the back gesture, pull to refresh, unless the ticket changes gesture or touch handling.
- A negative place no user would expect the feature in (another product's screen the ticket never mentions).
