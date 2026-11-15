# Test Writing Rules

## Test Suites

- Formulas, business rules, edge-case reasoning, and feature context live in the suite/test description.
- Prerequisites common to all test cases go as bullet points in the suite description: the environment, such as role and account type when no expected result depends on them, language, app settings, the screen every test starts on, and tools every test uses (DevTools).
- Keep test data and the state a test relies on out of the suite description. TestRail shows a case without its section description.

## Test Cases

- A test case consists of an optional description and steps.
- Golden rule: "why" in the description, "what" in the steps. Add a description only when the title does not explain the intent.
- Prefer UI over public APIs when possible. When the app can show a value (add a column, open details), read it there. Use DevTools or an API only for what the UI cannot show, and cover every page of a paged list.
- Drive a backend story through the system that feeds it (the CMS, the app) and capture the request in DevTools. Send requests directly only for inputs that system blocks.
- Mock or check an endpoint only when a source names it as the one serving the data, or the step copies the request from DevTools while doing the action under test. Otherwise describe the data state in preconditions (`Most searched has 2 tickers`).

## Title

Title states the behavior under test: the object, the condition, and the outcome.

Title structure: `<object> <condition> <outcome>`. Start with a role only when the feature has several roles or the test is about permissions.

Examples:

- LO buy order at the reference price opens the confirmation dialog
- Quantity not in lots of 100 shows an error
- Price 0.10 above the ceiling shows an error
- Retry button appears when NetworkError occurs
- Broker can cancel a client's pending order
- Read-only user cannot place an order

Avoid:

- Filler prefixes: `Verify that ...`, `Test that ...`, `Check ...`, `Should ...`
- Words every title would share: a role when the feature has one role, `User sees`, `User can`
- Multi-intent titles joined by `and` / `then`. A merged item still has one objective; name that objective.
- Restating the suite name in every title
- Embedding IDs or numbers: `TC-001: LO buy order`
- Vague outcomes: `Successful order`, `Buy works`

## Preconditions

- Add preconditions for setup that is required for the test to run but is not part of the test actions.
- If relevant, include the user role.
- Skip preconditions that are not needed or repeat the suite description.
- Give every value the steps rely on that differs from the screen's defaults: form data, time window, account state. Do not point to data written elsewhere.
- Leave out values the screen already shows by default (`Order type: Market` when Market is the default). A test about the default itself says so in its steps.
- Do not include preconditions like "service is running" or "user is logged in" unless the user explicitly mentioned them or the test is about them.

## Steps

A step is an action (with optional test data) and an expected result, in the format of [Test Case Format](./testrail-test-case-format.md) §4. A wait or setup step (`Wait until 10:05`, `Go to the iPhone home screen`) may have no expected result.

- Each expected result passes or fails: no "either X or Y", no "record whether X". An outcome no source gives is an `ask` item, not two accepted outcomes.
- Every check goes in the expected result, never in the action.
- Each step is a simple sentence. Avoid commas and sub-sentences.
- Steps are mechanical: click, send, read, assert.
- Each step includes exact instructions with concrete, realistic values a tester can act on directly.
- Use a `${variable}` placeholder, in backticks, only for a value reused across steps, a data-driven value (the examples table), or environment data no source gives that the tester supplies (test account, customer name). Never for other data or preconditions.
- Prefer URL paths over full URLs, e.g. `/trade/order-book`.
- Avoid vague qualifiers like "small", "known", "around", "e.g.", "like", "(…)", and subjective outcomes like "should work" or "might fail"; replace them with concrete, literal values.
- For data that changes with time (market prices, the clock, balances), give the rule to derive it from what the screen shows: `ceiling price + 0.10`, `current time − 7 minutes`.
- Do not chain multiple distinct actions or use unnecessary And / Or combinations in a single step.
- Exception: data entry that only sets up the action under test joins that action (`Enter 100 in **Quantity** and click **Place order**`) or goes in preconditions.
- No expected result that only repeats the input (`Field shows 3,050`).
- No check that another check on the same line implies: an error shown on the form already means the next screen did not open.
- A code block may follow a step when it holds an API request or response body.

One expected line per screen or state. Separate the checks on it with `; `, each check one verifiable fact. Start a new line when the screen or state changes.

Instead of:

`*Expected*: Error "Price must be between the floor and ceiling price." under **Price**`
`*Expected*: Red border on **Price**`

Use:

`*Expected*: Error "Price must be between the floor and ceiling price." under **Price**; red border on **Price**`

### Bold and italic in steps

Use sparingly. Each style serves one purpose; otherwise write plain text.

- **bold** — UI elements the user interacts with: buttons, links, fields, tabs, checkboxes, modals (e.g. `Click **Save**`, `Open **Settings** tab`).
- *italic* — names of pages/screens/documents referenced as context (e.g. `Open the *Privacy Policy* page`).

## Tone

Write in a neutral, literal tone: say what the system does and what the tester sees. No marketing or emphatic adjectives, filler phrases, or emoji, unless the user asks for them.
