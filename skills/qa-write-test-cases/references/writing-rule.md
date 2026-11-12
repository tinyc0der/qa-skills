# Test Writing Rules

If the user provided example test cases, follow their style first; then apply these rules.

## Test Suites

- Formulas, business rules, edge-case reasoning, and feature context live in the suite/test description.
- Prerequisites common to all test cases go as bullet points in the suite description.
- Keep test data out of the suite description. TestRail shows a case without its section description.
- Formulas and diagrams relevant to all test cases can be included as code blocks in the suite description.

## Test Cases

- A test case consists of a description and steps.
- Golden rule: "why" in the description, "what" in the steps.
- Add the intent to the description if the title is not enough to explain it.
- Keep the description clear and concise.
- Put preparations into preconditions/description, not into steps.
- Focus on black-box testing: every action and observable result goes through public APIs or UI (unless the user specifies otherwise).
- Prefer UI over public APIs when possible.
- Add system checks only when it is not clear how to test via public APIs or UI. This is not a unit test; usually no direct server or code access is allowed.

## Title

Title states the behavior under test: the object, the condition, and the outcome.

Title structure: `<object> <condition> <outcome>`. Start with a role only when the feature has several roles or the test is about permissions.

Examples:

- Login with valid email and password opens the dashboard
- Invalid email format shows an error
- Interval of 59 seconds shows an error
- Retry button appears when NetworkError occurs
- Admin can invite up to 10 users to a project
- Viewer cannot edit a comment

Avoid:

- Filler prefixes: `Verify that ...`, `Test that ...`, `Check ...`, `Should ...`
- Words every title would share: a role when the feature has one role, `User sees`, `User can`
- Multi-intent titles joined by `and` / `then`
- Restating the suite name in every title
- Embedding IDs or numbers: `TC-001: Login`
- Vague outcomes: `Successful login`, `Login works`

Good vs bad:

- `Verify successful login` → `Login with valid email and password opens the dashboard`
- `Wrong password test` → `Login with invalid password shows an error`
- `User sees error when email format is invalid` → `Invalid email format shows an error`
- `Login and update profile` → split into two tests

## Preconditions

- Add preconditions for setup that is required for the test to run but is not part of the test actions.
- Define the preconditions and initial state of the system as bullet points.
- If relevant, include the user role.
- Skip preconditions that are not needed or repeat the suite description.
- Give every value the steps rely on that differs from the screen's defaults: form data, time window, account state. Do not point to data written elsewhere.
- Do not include preconditions like "service is running" or "user is logged in" unless the user explicitly mentioned them or the test is about them.

## Steps

A step consists of an action (with optional test data) and an expected result.

Test steps use the `## Steps` header section with a nested markdown list format:

```markdown
## Steps

- (Step Action)
  *Expected*: ... (Observable behavior)
- ...
  *Expected*: ...
```

e.g.

```markdown
## Steps

- Open the *Login* page
  *Expected*: Login form shows **Email**, **Password** and **Log in**
- Enter `jane@example.com` and `Secret-123` and click **Log in**
  *Expected*: Dashboard opens; header shows "Jane Doe"
```

Step format rules:

- Steps must be under a `## Steps` heading.
- Use nested markdown lists (bulleted `-`/`*` or numbered `1.`).
- Top-level items describe the action to perform.
- Nested items with `*Expected*` (or `*Expected*:`, `*Expected result*`) describe the observable behavior.
- Expected results should be specific and verifiable.

Step content rules:

- Each step is a simple sentence. Avoid commas and sub-sentences.
- Steps are mechanical: click, send, read, assert.
- Each step includes exact instructions with concrete, realistic values a tester can act on directly.
- Do NOT parametrize by default — first-pass test cases should read as executable manual steps, not templates.
- Use a placeholder variable like `${domain}` only when the value is genuinely reused across steps or is data-driven (see the Examples section in the format reference). A plain UI/API acceptance step needs concrete values, not placeholders.
- Do not turn data unrelated to the test into placeholders.
- Do not add preconditions as placeholders.
- Prefer URL paths over full URLs, e.g. `/auth/login`.
- Use specific values when they are important for the scenario (boundary values, format validation, locale-specific input).
- Avoid vague qualifiers like "small", "known", "around", "e.g.", "like", "(…)"; replace them with concrete, literal values.
- Avoid general statements in steps. Move them to the description.
- Do not chain multiple distinct actions or use unnecessary And / Or combinations in a single step.
- Exception: data entry that only sets up the action under test joins that action (`Enter 59 in **Interval** and click **Create**`) or goes in preconditions.
- No expected result that only repeats the input (`Field shows 3,050`).
- No check that another check on the same line implies: an error shown on the form already means the next screen did not open.
- All step actions must be clear to perform via public API or UI.
- All checks/verifications/assertions belong in the expected result, not in the step action.
- A code block may follow a step when it holds an API request or response body.

One expected line per screen or state. Separate the checks on it with `; `, each check one verifiable fact. Start a new line when the screen or state changes.

Instead of:

`*Expected*: Error "The minimum order interval is 60 seconds." under **Interval**`
`*Expected*: Red border on **Interval**`
`*Expected*: Confirmation screen does not open`

Use:

`*Expected*: Error "The minimum order interval is 60 seconds." under **Interval**; red border on **Interval**; confirmation screen does not open`

### Bold and italic in steps

Use sparingly. Each style serves one purpose; otherwise write plain text.

- **bold** — UI elements the user interacts with: buttons, links, fields, tabs, checkboxes, modals (e.g. `Click **Save**`, `Open **Settings** tab`).
- *italic* — names of pages/screens/documents referenced as context (e.g. `Open the *Privacy Policy* page`).

Avoid:

- Bold/italic on full sentences or whole steps.
- Combining bold and italic (`***...***`).
- Emphasis for visual weight; rephrase or split the step instead.
- Bold/italic in place of a placeholder (`[url]`) or a code block.

## AI Writing Patterns to Avoid

Be specific, not grandiose. Say what it actually does. Avoid marketing language and emojis (unless explicitly intended).

Avoid:

- Puffery: pivotal, crucial, vital, testament, enduring legacy, indelible mark, deeply rooted, profound heritage, steadfast dedication, key turning point
- Promotional adjectives: groundbreaking (figurative), seamless/seamlessly, robust, cutting-edge, vibrant, nuanced, multifaceted, intricate/intricacies, stunning natural beauty
- Overused AI vocabulary: delve/delves, leverage/leveraging, foster/fostering, realm, tapestry, landscape, interplay, streamline, shed light on, garnered, notably, key (as adjective)
- Empty "-ing" phrases: ensuring, showcasing, highlighting, emphasizing, reflecting, underscoring, aligning with, contributing to, enhancing, underpinning
- Filler frames: stands/serves as, is a testament/reminder, plays a vital/significant/crucial/pivotal role, underscores/highlights its importance, reflects broader, symbolizing its ongoing/enduring/lasting impact, continues to captivate, nestled in the heart of, boasts a
- Hedges and closers: it's important/critical/crucial to note/remember/consider, may vary, In summary, In conclusion, Overall
- "Challenges/Legacy" framing: Despite its... faces several challenges, Despite these challenges, Challenges and Legacy, Future Outlook
- Parallel "not/but/however" constructions: "Not only ... but ...", "It is not just about ..., it's ..." — common in LLM writing but unsuitable for a neutral tone
- Formatting overuse: excessive bullets, emoji decorations, bold on every other word
