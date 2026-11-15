# Review Checklist

Self review checks the checklist (Step 4) or the new test cases (Step 6) against the sources, the context file, the existing cases found in Step 1, [Test Case Format](./testrail-test-case-format.md), and [Writing Rules](./writing-rule.md). Check against the source text, not your memory of it.

## Checklist review

- Every rule in `qa-write-test-cases` Steps 1 and 4, the Keep scope rule in Step 5, and every [Test Design Techniques](./test-design-techniques.md) rule.
- **Every item comes from a source.** Flag items that test behavior no source states or implies.
- The item count and categories fit the tier and the role.
- No item repeats another item or an existing case.

## Test case review

Checklist:

- Every rule in `qa-write-test-cases` Steps 1 and 5.
- No new test repeats an existing test in the file or an existing case.

Sources:

- **Every expected result comes from a source.** Flag error texts, limits, redirects, and UI copy that no source states.
- UI labels, messages, and values match the source word for word.

Executable:

- A tester who has not read the sources can run every step with the values given.
- Steps run in the order given.
- Each expected result follows from its own step's action.
- Preconditions set up every role, record, state, and value the steps assume, without pointing to data in the suite description.
- Each expected result is visible in the UI or a public API response, or in the data source an acceptance criterion names for data accuracy. Behavior with no UI (tracking, counters, scheduled jobs) is read in the data store or log the backend team opens to QC; the preconditions name that access.
- Every precondition can be set up on the day of the run (no past dates the UI rejects). Past data the UI cannot create comes from seeded test data; the precondition line of that record names who seeds it. Records a tester can create in the UI need no seeding note.
- A test does not depend on another test's data or order.

Rules:

- Every rule in Test Case Format and Writing Rules, and the ID rule in `qa-write-test-cases` Step 5.
- The same thing has the same name in every test.

## Findings

Write each finding as:

- the checklist item, or the file and test title
- `fix` or `ask`
- the broken check or rule, with the source quote or link
- for `fix`, the exact change

`fix` is a change the fixer can make within the sources, the tier, and the approved checklist. It includes adding, splitting, merging, removing, and reprioritizing checklist items, writing a missing test for an approved item, and removing a test with no item. `ask` needs a person: the PO for a conflict the context file marks `(open)` or a fact no source gives, the user for a coverage trade-off the tier does not decide.
