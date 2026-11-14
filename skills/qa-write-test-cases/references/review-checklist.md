# Review Checklist

Self review checks the checklist (Step 4) or the new test cases (Step 6) against the sources, the context file, the existing cases found in Step 1, [Test Case Format](./testrail-test-case-format.md), and [Writing Rules](./writing-rule.md). Check against the source text, not your memory of it.

## Checklist review

- Every acceptance criterion has an item. At the Smoke tier, only criteria on the critical path need one.
- Every validation rule, edge case, and error message in the sources has an item, or the context file says why not. A missing expected result is not a reason. Not at the Smoke tier.
- Each [Test Design Technique](./test-design-techniques.md) that fits the feature produced its items, and high-risk areas have the most items.
- No item falls under "Not worth a test" in Test Design Techniques.
- **Every item comes from a source.** Flag items that test behavior no source states or implies.
- Items follow the ticket. Where the context file records a conflict, they follow the side it names.
- The item count and categories fit the tier and the role.
- Each item is one test objective. No two items differ only in test data or share preconditions and steps.
- Groups follow user journeys in flow order, with the happy path first.
- The main flow has a higher priority than its edge cases.
- No item repeats another item or an existing case.
- No item tests a linked feature the user did not ask for, a role or data scope another story defines, or generic behavior of a shared component the story does not change.

## Test case review

Checklist:

- One new test per approved checklist item. No missing tests, no extra tests.
- Each test checks its item's objective and has its item's priority and `smoke:` value.
- No new test repeats an existing test in the file or an existing case.

Sources:

- **Every expected result comes from a source.** Flag error texts, limits, redirects, and UI copy that no source states.
- Expected results follow the ticket. Where the context file records a conflict, they follow the side it names.
- UI labels, messages, and values match the source word for word.
- `refs:` holds the Jira key the test comes from.

Executable:

- A tester who has not read the sources can run every step with the values given.
- Preconditions set up every role, record, state, and value the steps assume, without pointing to data in the suite description.
- Each expected result is visible in the UI or a public API response, or in the data source an acceptance criterion names for data accuracy. Behavior with no UI (tracking, counters, scheduled jobs) is read in the data store or log the backend team opens to QC; the preconditions name that access.
- Every precondition can be set up on the day of the run (no past dates the UI rejects). Past data the UI cannot create comes from seeded test data; the precondition line of that record names who seeds it. Records a tester can create in the UI need no seeding note.
- A test does not depend on another test's data or order.

Rules:

- Every rule in Test Case Format and Writing Rules, and the ID rule in Step 5.
- No test of a linked feature the user did not ask for.

## Findings

Write each finding as:

- the checklist item, or the file and test title
- `fix` or `ask`
- the broken check or rule, with the source quote or link
- for `fix`, the exact change

`fix` is a change the fixer can make within the sources, the tier, and the approved checklist. It includes adding, splitting, merging, removing, and reprioritizing checklist items, writing a missing test for an approved item, and removing a test with no item. `ask` needs the user: a conflict the context file marks `(open)`, a fact no source gives, or a coverage trade-off the tier does not decide.
