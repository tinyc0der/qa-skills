---
name: qa-write-test-cases
description: Generate checklists and manual test cases in TestRail format (`*.test.md`) from Jira tickets, Confluence pages, Figma designs, and the live app. Use this skill whenever the user asks to create test cases, test scenarios, test plans, checklists (high-level test cases), or QA documentation, or says "write test cases for PROJ-123", "write test cases from a Jira ticket", "create test cases from this Confluence page", "write test cases from this Figma design", "write test cases for TestRail", "create a test checklist", "generate test scenarios from requirements", or similar. It also works from the user prompt alone.
---

# Test Case & Checklist Generator

Generates test cases and checklists for software testing from the context the user provides.

References:

- [Test Case Format](./references/testrail-test-case-format.md) defines the markdown for suites, tests, and steps, and maps each part to TestRail.
- [Writing Rules](./references/writing-rule.md) covers suites, tests, preconditions, steps, and AI writing patterns to avoid.
- [Related Sources](../qa-thinking/references/related-sources.md) of `qa-thinking` covers when and where to search for sources the ticket does not link.

## User interaction

- **Always generate a checklist before test cases**, even if the user asks for test cases directly.
- **Do not skip steps. Get user approval at each gate before moving to the next step.**
- Strictly recommend PLAN mode. Switch to Edit mode only on Step 5 — writing test cases to md files.
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

## Workflow

1. Gather context and show sources — approval gate
2. Ask for coverage scope — approval gate
3. Ask for role if any test cases for the feature exist; always skipped for smoke
4. Generate checklist — approval gate
5. Generate detailed test cases
6. Show summary

### Step 1: Gather context

Understand:

- the feature/functionality under test and its business goals
- main testing flows and user journeys
- specific areas of concern

Information sources:

- User prompt
- Jira: the ticket and its acceptance criteria (Atlassian MCP)
- Confluence: specs and requirements pages (Atlassian MCP)
- Figma: screens, states, and UI copy (Figma MCP)
- TestRail: existing test cases, via the `sync-test-cases-with-testrail` skill
- Live app: actual behavior on a non-production environment, via the `agent-browser` skill
- QA workspace: feature catalogs (`catalog-features` output) and mismatch pages (`detect-product-mismatches` output)

Source priority:

- A ticket, when given, is the primary source: its description, acceptance criteria, images, comments, and parent ticket.
- From linked documents, use only the parts within the ticket's scope.
- Expected results follow the ticket. When another source contradicts it, keep the ticket's behavior and report the conflict at the gate.
- If the user gave no ticket, document, or feature description, ask once for the ticket or its description and acceptance criteria. If they decline, continue from the prompt.

Sources may come as pasted text, links, or MCP tools. If a Jira, Confluence, or Figma link needs an MCP that is not connected, stop and ask the user to connect it.

Learn the UI pages, components, and API endpoints from Figma, Confluence, and the live app:

- If the feature is deployed, ask the user for a non-production URL and credentials, then explore the related pages with the `agent-browser` skill.
- In the live app, navigate only. Submit nothing that saves data unless the user agrees.
- Use screenshots of related pages when the user shares them.

#### QA workspace

A catalog's README `Type` names its source. Default folders: `catalog/` and `mismatches/sources/*/catalog/`.

- Live app catalog: the feature's URL and navigation path are where exploring starts.
- Jira catalog: the feature's other issues, read as context.
- TestRail catalog: see Existing test cases.
- Mismatch pages (`mismatches/mismatches/README.md`): read the ones for the feature. They are known conflicts.

#### Existing test cases

Find the TestRail cases that already test the feature, with the `sync-test-cases-with-testrail` skill:

- TestRail catalog: find the feature there. Its links are the existing cases, and its area folder is their section. Run `list --section <section>` for cases added after the catalog `Date`.
- No catalog: run `list` and match sections and case titles to the feature.
- TestRail not set up: ask for its Setup, or continue without the check and report that at the gate.
- Do not `pull` here: it writes files. Step 5 pulls the section the user chooses to expand.

#### Related sources

When the sources above leave a gap, search as [Related Sources](../qa-thinking/references/related-sources.md) describes.

#### Approval gate

Show names only, no content:

- sources read: ticket keys, page titles, frame names, app environment
- sources that could not be read
- sources found by search, each with the gap it fills
- existing cases: count, section, `C<id>` range
- conflicts between sources, including known mismatches
- gaps no source filled

```markdown
I've gathered information from the following sources:

- Jira ABC-123 (parent ABC-100)
- Confluence: Saved cards
- Figma: Checkout › Payment
- Live app: staging, Checkout › Payment

Not read: Confluence "Payments FAQ" (no access)

Found by search:

- Jira ABC-130 (same epic): card expiry rules

Existing cases: 8 in TestRail section Checkout › Payment (C101–C108)

Conflicts:

- Expired cards at checkout: the live app lists them; ABC-123 hides them. Test cases follow ABC-123.

Open questions:

- Saved cards limit per user: no source says

❓ Do you want to:

1. ➡️ Go to next step
2. ✏️ Type changes
```

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

Ask for a role only when Step 1 found existing test cases for the feature under test. The basics are already covered, so the user may want a specific angle.

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

Derive items with the techniques that fit the feature:

- at least one item per acceptance criterion
- equivalence partitioning and boundary values for inputs and limits
- decision tables for combined conditions
- pairwise combinations when several independent options interact
- state transitions for statuses and lifecycles
- a role/permission matrix when the feature has roles
- invalid input combinations and error handling

Item rules:

- Each item is one test objective. Split items that check several outcomes.
- Group items by user journey in flow order. In each group, list the happy path first, then negative and edge cases.
- Cover UI consistency with one item per screen, not one per element.
- Prefix each item with its TestRail priority: 🔴 critical, 🟠 high, 🟡 medium, 🟢 low. When pulled cases use other priority names, use those.

Example:

```markdown
- Signup
  - 🔴 [critical] Signup with valid email
  - 🟡 [medium] Signup with valid phone number

- Login
  - 🔴 [critical] Login with valid email
  - 🟡 [medium] Login with valid phone number
  - 🟠 [high] Login with invalid password
```

#### Approval gate

- If a multi-select/checkbox Ask tool is available: present leaf items as checkboxes, prefixed with priority and category (e.g. `🔴 Login: valid email`), with the recommended subset for the chosen tier pre-checked. The ticked items become the test cases in Step 5.
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

- Write exactly one test case per approved checklist item, and no others. Set its `priority:` to the item's priority.
- Name files `feature-name.test.md` (always the `.test.md` extension).
- Multiple features or whole product → one file per feature.
- When the user chose to expand an existing section, `pull --section <section>` it, then add the new tests to the pulled file. Never overwrite a pulled file.
- **Keep scope**: test only the functionality under test; don't test linked features unless the user explicitly asks.

Format rules:

- Strictly follow [Test Case Format](./references/testrail-test-case-format.md) for suites, tests, and steps. Only exception: the user specifies their own format in the prompt.
- Strictly follow [Writing Rules](./references/writing-rule.md) for suite/test descriptions, preconditions, steps, expected results, and anti-patterns.
- Set `refs:` to the Jira key on every test case that comes from a Jira issue. When the whole file covers one issue, set `refs:` once on the suite instead.
- If reasonable, add preconditions and test data based on the analyzed context.
- Use concrete, executable values. **Do NOT introduce `${...}` placeholders in first-pass generation.** Parametrize only genuinely reused or data-driven values; format them as `${variable}` in backticks.
- **NEVER generate test or suite IDs of any kind:**
  - Do NOT write `testrail_id:` or `testrail_section_id:`. The TestRail push writes them. Keep them when editing a file.
  - Do NOT include custom/random IDs (e.g. `TC-001`, `TC-R001`, `SUITE-01`) in metadata, titles, or anywhere else.

#### Matching existing test case formats

When the user provides an existing test case example or asks for "similar" test cases:

DO match:

- writing style and level of detail
- field structure (Priority, Preconditions, Type, Test Data, etc.)

DON'T copy:

- any IDs from the example: TestRail IDs (`testrail_id:`, `C<id>`) or custom prefixes (e.g. `TC-R001`, `TC-001`)
- original test case intent

### Step 6: Show summary

- Show a concise summary (markdown table works well): number of test cases and suites, generated files.
- Ask the user to review the files and request changes if needed.
- List items that needed splitting and gaps found while writing, as suggested additions.
- Suggest pushing the test cases to TestRail with the `sync-test-cases-with-testrail` skill.
