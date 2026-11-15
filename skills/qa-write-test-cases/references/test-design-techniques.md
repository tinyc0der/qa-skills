# Test Design Techniques

Step 4 derives checklist items with standard test design techniques (ISTQB), weighted by risk. Pick the techniques that fit the feature. An item derived from a source rule (its negative, its complement, a relation a formula implies) comes from that source. Inputs, classes, or rules with the same expected result share one item with a data table, per the Step 4 item rules.

## 1. Risk first

Rate each area of the feature by impact and likelihood before deriving items. High impact: money and values users act on, irreversible actions and their status lifecycle, time windows, data shown to users, who can see or do what, and authentication. On a trading system, for example: price, volume, buying power, fees, P&L, order lifecycle, trading sessions, and OTP.

- Derive items for high-risk areas first and in most depth. A low-risk area gets the requirement coverage items and at most one UI item per screen.
- A costly test (a time window, two devices, a long wait, another team's action, a real transaction placed only to look at the UI) is worth it for a high-risk item. For a lower one, fold the check into a cheaper test or leave it out.

## 2. Specification-based techniques

**Requirement coverage (traceability)**

- At least one item per acceptance criterion.
- One item or data row per validation rule, edge case, and error message a source names, empty required fields included.
- A named edge case with no result in any source is an `ask` item. Its expected result checks what any correct answer keeps (no error page, no NaN or blank value, the count matches the list) and fails on at least one wrong outcome. If it holds whatever the answer is, it is a step in an existing test, not an item.
- A source gives the outcome but not the message: assert the outcome only. Unknown whether a value is kept or cleared: assert that the screen, the next screen, the request, and the saved record agree.
- An acceptance criterion that states a property (idempotent, sorted), or a released story of the same module, is a source: no `ask`.
- Input the client cannot send is a row in the server validation test.
- A source that says "same as the existing X": items for the parts of X the feature shows (limits, defaults, recalculated values, options it compares with).
- An acceptance criterion that says "matches screen X" when X reads the same data: one more item checks a record against an independent oracle (the formula, or a third screen), since the match passes by construction.

**Equivalence partitioning**

- One item per valid and per invalid class of each input.
- Each way a source names to do one action (drag and drop or a move button, a click or a shortcut) is one row.
- Number inputs: negative and zero when the data can be negative, decimals, each accepted suffix in upper and lower case (`1.5B`, `1b`), malformed numbers (`1.2.3`, `--5`), a range with one bound empty.
- A message with placeholders: each value a placeholder takes appears in at least one test of that message.
- An input the ticket adds or changes that the app formats by device setting (12-hour clock, region format): that setting is one class. Read-only values with a fixed format are not.

**Boundary value analysis**

- Each stated minimum, maximum, or time limit (length, amount, step, window open and close, the last day of a rolling window): one item at the limit and one just outside it. Use the ticket's limit, even when it changed (minimum 5 → 10).
- A number shown at fixed precision: a value that rounds to the smallest shown value (0.00) or to zero.
- Boundaries the client already blocks, and time boundaries finer than a scheduler's interval, are rows in one accept/reject test.
- A list with a stated maximum (columns, criteria, result rows): a row at the maximum, or far above the usual count when the source says "no limit", added to an existing test.

**Decision tables and combinations**

- Combined conditions: one item per rule with its own outcome.
- Pairwise combinations when several independent options interact.
- Invalid input combinations.
- An ordering rule: data where creation order, text order, and numeric order all differ (2, 5, 10).
- A rule that picks one of several records (latest period, latest version, effective date): one item where a newer record wins and an older one does not show, and one where a record re-imported while shown leaves no duplicate or mixed rows.

**State transition**

- Statuses and lifecycles: each valid transition and each blocked one.
- A screen or form: invalid → fixed, failed → retried, a second record picked while the first is shown, one field of an active condition changed, and the form left and opened again. Kept-or-cleared items cover values that reach a request or a saved record; sort and paging get one only when a source gives the result or the change invalidates the old state (fewer rows than the current page). No source for the result: `ask`.
- A state an acceptance criterion names (after the drawer closes, logged out, including by session expiry during the action): one row per way to reach it; ways no source states are `ask` rows.
- A trigger (status change, scheduled event): the result arrives at the trigger's time, does not repeat while the state stays, and holds for each state the record can be in when it fires (cancelled, edited).
- Several records hit by one trigger: each gets its own result with its own values.
- A check that passes on screen and can fail at submit: the value changes in between (time passes, the balance is used elsewhere).
- An input that calls the server while typing: changing the keyword before the results arrive shows only the latest keyword's results.
- A change that moves, renames, or removes something the previous app version saved (last tab, filter, setting): one item that updates over the previous version with that state saved.

**Use case and data flow**

- The main flow end to end, then each alternative flow.
- Each place the new or changed data reaches (another screen, notification, export), even one another feature owns, gets one item, plus one negative item for a place or receiver outside the list. A changed value or limit: each place that shows it (guide, tooltip, error text). Places that read the same record at the same time (app and web) are steps of one test.
- A backend sub-task gets API items only for results the UI cannot show.

**Role and permission matrix**

- User types any source names for the screen (guest, logged-in, tiers, experiment groups), even if the ticket names none: one item per user type whose result can differ. A fix that does not read the user type needs none. Access rules another story defines stay with that story.
- A permission the server checks: one API item with a row per user type it denies, no session included.
- A screen open to more users than its data's source screen: one item that the response for the least privileged user carries only the fields the screen shows.

## 3. Experience-based techniques

**Error guessing**

- One item per error class a source names or implies (timeout, 5xx, 4xx, offline) that has its own expected result.
- Each precondition the feature itself checks (OTP at submit, session at a save): one item for when it does not hold. Not the login every read-only screen needs. For a failed job or import, seed the data state the failure leaves (a missing record, a null field) instead of stopping the job.
- A new instance of a shared component (a new tab with the same table, a new export): each bug fixed on the other instances is a row or step for the new one.
- An intermittent bug (race, timing): repeat the repro about 3/p times for a reported rate p (1 in 15 → 45 rounds), 10 times when no source gives a rate.

**Regression**

- A sub-task that changes a shared component other features read (engine, API, table, tab bar): one regression item for those features, checking only what the sub-task changed.
- Its expected result is the previous version's result on the same data (values and row count), not only "no error". Before the deploy, with no source, the preconditions record the values for a fixed past date; after it, the oracle is the spec formula, another screen, or an export.
- A field removed or made null: the data has one row per value it used to hold.

## 4. UI and language

- One UI item per screen compares it with the design. Without a readable design, it checks only what sources state and flow tests miss, or is left out. A screen where the ticket only adds a row or field gets the check as a step of a flow test that reaches it.
- Another theme is a step in the screen's UI item.
- Text the ticket adds or changes: one item per other language, which also checks that longer labels fit. Message texts in other languages share one item with a data table.

## 5. Not worth a test

Leave these out, unless the user asks for them or a source says the ticket changes them:

- Behavior the ticket does not change, such as validation an earlier story owns.
- Cosmetic details: colors, fonts, spacing, alignment, icon shapes, animation, picker wheel positions.
- A separate theme item, or a language item for a screen whose text the ticket leaves unchanged.
- Generic platform behavior: the keyboard opens, scrolling, the back gesture, pull to refresh, unless the ticket changes gesture or touch handling.
- A negative place no user would expect the feature in (another product's screen the ticket never mentions).
