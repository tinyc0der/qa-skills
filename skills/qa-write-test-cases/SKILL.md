---
name: qa-write-test-cases
description: Generate checklists and manual test cases in TestRail format (`*.test.md`) from Jira tickets, Confluence pages, Figma designs, the live app, or the user prompt alone. Use this skill whenever the user asks to create or write test cases, test scenarios, test plans, checklists (high-level test cases), or QA documentation, for a ticket, a page, a design, a feature, or TestRail.
---

# Test Case & Checklist Generator

Generates test cases and checklists for software testing from the context the user provides.

References:

- [Test Case Format](./references/testrail-test-case-format.md) defines the markdown for suites, tests, and steps, and maps each part to TestRail.
- [Writing Rules](./references/writing-rule.md) covers suites, tests, preconditions, steps, and tone.
- [Test Design Techniques](./references/test-design-techniques.md) lists how Step 4 derives checklist items.
- [Review Checklist](./references/review-checklist.md) lists what Self review checks.

## User interaction

- **Always generate a checklist before test cases**, even if the user asks for test cases directly.
- **Do not skip steps. Get user approval at each gate before moving to the next step.**
- Write the checklist and test cases in the language the user asks for. Otherwise use the language of existing test cases, then of the requirements.
- Use the Ask tool for choices when available.
- Fill input fields with suggestions when asking the user for input.
- Mark questions with ❓ and numbered options:

```
❓ Do you want to:

1. action 1
2. action 2
3. type something else
```

## Self review

Review the checklist (Step 4) and the test cases (Step 6) yourself against [Review Checklist](./references/review-checklist.md). A fixer subagent applies the fixes. **Do not show either to the user before its review ends.**

Loop until a review finds nothing to fix:

1. Review: re-read the checklist or the written files item by item against every check. Write each finding in the Review Checklist's findings format.
2. Fix: start a fresh fixer subagent, never one from an earlier round. Give it the `fix` findings, the paths of the files they name, the context file, and the Review Checklist. For the checklist, give it the checklist text, and it returns the fixed checklist. It applies only the listed findings.
3. Keep `ask` findings for the user. Do not act on them.

After the third fix, review once more and stop. Show the user only the `ask` findings and the `fix` findings still open, not the review or the fixes made.

Without subagents, apply the fixes yourself.

## Workflow

1. Gather context into a context file
2. Ask for coverage scope — approval gate
3. Ask for role if any test cases for the feature exist; always skipped for smoke
4. Generate checklist — self review, then approval gate
5. Generate detailed test cases
6. Review test cases — self review
7. Show summary

### Step 1: Gather context

Run the [`gather-context`](../gather-context/SKILL.md) skill for the feature. Show its report above the Step 2 question.

Items follow the context file:

- Expected results follow the side each conflict names.
- An item that depends on an open conflict or an open question is `ask`. A reversed acceptance criterion gets one `ask` item that checks what both sides keep.
- Record new doubts, rules left without a checklist item, and the user's answers to `ask` findings in the context file, as [Context File](../gather-context/references/context-file.md) describes.

### Step 2: Ask for coverage scope

The scope sets the initial checklist size; the user can still fine-tune it in Step 4.

- **Compute approximate test counts per tier from your Step 1 analysis. Do not use generic or hardcoded ranges** — the numbers must reflect the specific feature under test.
- If you can't reasonably estimate (feature too vague, context too thin), say so and either omit the numbers or go back to Step 1.
- If the user picks ✏️ Other, accept a number ("around 10") or a free-form description ("just the API contract, no UI") and size the checklist from it.

Show each option as a block: bold label with test count on the first line, description on the next. Replace `<N>` with your estimates:

```markdown
❓ **How much coverage do you want?**

**1. 🚀 Smoke** ~<N> tests
Critical-path only

**2. ⚖️ Balanced** ~<N> tests
Happy path, alternative flows, key negative and common edge cases

**3. 🧨 Exhaustive** ~<N> tests
Full coverage incl. error states, boundaries, invalid input combinations, empty and default states, and UI/security/perf/i18n where relevant

**4. ✏️ Other**
Type a number of tests, or describe scope in your own words
```

### Step 3: Ask for role

Ask for a role only when Step 1 found existing test cases for the feature under test. The basics are already covered, so the user may want a specific angle. Skip it when TestRail was not read.

Also skip this step for "smoke" scope.

If the user already named a role or focus (in the prompt or via ✏️ Other in Step 2, e.g. "security edge cases"), apply the matching role without asking.

When ask for a role:

- Show the roles (markdown table with name and short description) and ask the user to pick one. Recommend a role based on context and on what the existing test cases don't cover yet.
- Use ⚙️ default if the user does not specify a role.
- If the user selects 🔧 other, ask them to define a custom role.
- If you show only some roles, add a "Show all available roles" option:

```
❓ Choose role:

1. default (or recommended role based on context)
2. ☰ Show all available roles
3. ✏️ Type role name
```

#### Roles

| Role               | Description                              |
| ------------------ | ---------------------------------------- |
| **⚙️ default**     | **balanced** approach                    |
| **🌈 optimist**    | **positive** flows, happy path           |
| **🤓 nerd**        | **details**, dependencies, perfectionist |
| **🔪 psycho**      | **edge cases**                           |
| **🔐 pentest**     | **security**                             |
| **🎨 picasso**     | **ui/ux**                                |
| **⚖️ lawyer**      | **texts**, error messages, typos, etc.   |
| **🌐 polyglot**    | **localization**, translations           |
| **📈 performance** | **performance**, slow pages, timeouts    |
| 🔧 other           | **specify your own role**                |

### Step 4: Generate checklist

Create a hierarchical, categorized checklist from the gathered context.

Size it to the tier chosen in Step 2. The tier description lists the categories to cover.

Derive items with the [Test Design Techniques](./references/test-design-techniques.md) that fit the feature, spending them by risk. Leave out what its "Not worth a test" section lists.

Item rules:

- Each item is one test objective: one action or flow and the state it reaches. Split items that check outcomes of different actions.
- Merge items whose tests would share preconditions and steps, items that differ only in test data and share a priority and smoke tag with no `ask` part (one item with a data table), causes a source groups under one rule, and checkpoints on one timeline.
- Do not drop an item on an assumption no source states, such as "the field always has a value". Keep the item, mark it `ask`, and record the doubt as an open question in the context file.
- Group items by user journey in flow order. In each group, list the happy path first, then negative and edge cases.
- Prefix each item with its TestRail priority: 🔴 critical for the core flow and for data shown to users who must not see it, 🟠 high for main alternative flows and key validations, 🟡 medium for edge cases and boundaries, 🟢 low for minor UI and copy. An `ask` item keeps the priority of its impact. When pulled cases use other priority names, use those.
- Tag `[smoke]` on the items of the critical path: the happy path of each main flow that one tester can run alone in one session. Smoke and critical items have no `ask` part; a doubtful check that shares their steps goes into its own item.
- Number groups and items (`2`, `2.3`) so the user can refer to them. The numbers stay in the checklist, never in test files.

Example:

```markdown
- 1 Signup
  - 1.1 🔴 [critical] [smoke] Signup with valid email
  - 1.2 🟡 [medium] Signup with valid phone number

- 2 Login
  - 2.1 🔴 [critical] [smoke] Login with valid email
  - 2.2 🟡 [medium] Login with valid phone number
  - 2.3 🟠 [high] Login with invalid password
```

#### Self review

Run [Self review](#self-review) on the checklist. Skip it when the user only removed or reworded items. Show the findings it leaves for the user above the approval question.

#### Approval gate

- If a multi-select/checkbox Ask tool is available: present leaf items as checkboxes, prefixed with number, priority and category (e.g. `2.1 🔴 Login: valid email`), with the recommended subset for the chosen tier pre-checked. The ticked items become the test cases in Step 5.
- Otherwise: show the markdown checklist and ask the user to add/remove/change items.

Always ask about the amount of cases / level of detail:

```
❓ Do you want to:

1. 👍 Keep as is
2. ➖ Less details
3. ➕ More details
4. ✏️ Type anything you want to change
```

- More details → enable the 🤓 nerd role.
- User modifies the checklist → regenerate (Step 4).
- User not satisfied → go back to Step 1 for more context.
- Approved → Step 5.

### Step 5: Generate detailed test cases

If the user originally asked only for a checklist, first ask: "Do you want to generate test cases for this checklist?"

If Step 1 found existing cases, ask:

```
❓ Where do the new test cases go?

1. ➕ Expand section Checkout › Payment
2. 🆕 Create a new section
```

Write test case files to `test-cases/`.

Generation rules:

- Write exactly one test case per approved checklist item, and no others. Set its `priority:` to the item's priority, and `smoke: yes` when the item has `[smoke]`.
- Set `automation:` on every test: `yes` when a script can read the expected result (a value, message, or state), even if the flow waits; `no` for layout, visual, and judgment checks.
- Set `platform:` on each suite when the product has several platforms. Use the option names the pulled cases use (`Mobile`, `Web`). Without pulled cases, use `All` for behavior every platform shares, else the platform the ticket names.
- Name files `<feature-name>.test.md` with the context file's feature name (always the `.test.md` extension).
- Multiple features or whole product → one file per feature.
- When the user chose to expand an existing section, `pull --section <section>` it, then add each new test to the pulled file of the subsection it fits. Never overwrite a pulled file.
- When pulled cases carry `platform:`, the project keeps one section tree per feature for all platforms. Add the new platform's tests to those subsections; do not create a section per platform.
- A new section with several suites: tell the user to push with `--parent-section "<feature name>"` so the suites nest under one section.
- **Keep scope**: test only the functionality under test; don't test linked features unless the user explicitly asks.

Format rules:

- Strictly follow [Test Case Format](./references/testrail-test-case-format.md) for suites, tests, and steps. Only exception: the user specifies their own format in the prompt.
- Strictly follow [Writing Rules](./references/writing-rule.md) for suite/test descriptions, preconditions, steps, expected results, and anti-patterns.
- Set `refs:` to the Jira key on every test case that comes from a Jira issue. When the whole file covers one issue, set `refs:` once on the suite instead.
- **Never write IDs:** no `testrail_id:` or `testrail_section_id:` (the TestRail push writes them; keep existing ones when editing), and no custom IDs (`TC-001`) anywhere.
- Example test cases from the user: match their style, detail, and fields, not their IDs or intent.

### Step 6: Review test cases

Run [Self review](#self-review) on the new test cases. Before each review, run `check` of the `sync-test-cases-with-testrail` skill on the files and fix what it reports.

### Step 7: Show summary

- Show the number of test cases and suites, and the generated files.
- Ask the user to review the files and request changes if needed.
- List the findings Step 6 leaves for the user, items that needed splitting, and gaps found while writing, as suggested additions and questions.
- Suggest pushing the test cases to TestRail with the `sync-test-cases-with-testrail` skill.
- When the context file has open questions or open conflicts, suggest sending them to the PO with the `review-user-story` skill.
