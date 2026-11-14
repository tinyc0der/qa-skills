---
name: qa-write-test-cases
description: Generate checklists and manual test cases in TestRail format (`*.test.md`) from Jira tickets, Confluence pages, Figma designs, and the live app. Use this skill whenever the user asks to create test cases, test scenarios, test plans, checklists (high-level test cases), or QA documentation, or says "write test cases for PROJ-123", "write test cases from a Jira ticket", "create test cases from this Confluence page", "write test cases from this Figma design", "write test cases for TestRail", "create a test checklist", "generate test scenarios from requirements", or similar. It also works from the user prompt alone.
---

# Test Case & Checklist Generator

Generates test cases and checklists for software testing from the context the user provides.

References:

- [Test Case Format](./references/testrail-test-case-format.md) defines the markdown for suites, tests, and steps, and maps each part to TestRail.
- [Writing Rules](./references/writing-rule.md) covers suites, tests, preconditions, steps, and AI writing patterns to avoid.
- [Test Design Techniques](./references/test-design-techniques.md) lists how Step 4 derives checklist items.
- [Review Checklist](./references/review-checklist.md) lists what Self review checks.
- [Related Sources](../qa-thinking/references/related-sources.md) of `qa-thinking` covers when and where to search for sources the ticket does not link.

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

1. Gather context and save it to a context file
2. Ask for coverage scope — approval gate
3. Ask for role if any test cases for the feature exist; always skipped for smoke
4. Generate checklist — self review, then approval gate
5. Generate detailed test cases
6. Review test cases — self review
7. Show summary

### Step 1: Gather context

Understand:

- the feature/functionality under test and its business goals
- main testing flows and user journeys
- specific areas of concern

A context file for the feature from an earlier run is the starting point: read the sources it lists instead of searching again, and check its conflicts and open questions again. Ignore it when the user asks for an independent run.

Information sources:

- User prompt
- Jira: the ticket and its acceptance criteria (Atlassian MCP)
- Confluence: specs and requirements pages (Atlassian MCP)
- Figma: screens, states, and UI copy (Figma MCP)
- TestRail: existing test cases, via the `sync-test-cases-with-testrail` skill
- Live app: actual behavior on a non-production environment, via the `agent-browser` skill
- QA workspace: feature catalogs (`catalog-features` output) and mismatch pages (`detect-product-mismatches` output)

Source priority:

- A ticket, when given, is the primary source: its description, acceptance criteria, images, comments, parent ticket, sub-tasks, and linked issues. Linked bugs record behavior settled after the ticket was written.
- Read the ticket's description history (`expand: changelog`). A phrase removed in an edit that kept the rest of the text is a decision against that behavior, not silence. After a full rewrite, the old draft is an earlier plan. Date every source by its last content change, not by Jira `updated`, which moves on status changes.
- Ticket images the Atlassian MCP cannot download, and ticket sections that come back empty: ask the user for screenshots, or record them as not read.
- From linked documents, use only the parts within the ticket's scope, plus rules that apply to every result of the screen (which records it lists).
- Expected results follow the ticket. When another source contradicts it, keep the ticket's behavior and record the conflict in the context file.
- A ticket silent on a behavior another source states does not contradict it: write the item from that source, as an `ask` when that source predates the ticket and the ticket does not link it. A released story that built the same screen or component, and its fixed bugs, describe current behavior, not an `ask`; for parts the ticket does not change they rank above a spec page. When the ticket adds a new instance of a shared component, the released instance is current behavior for what the shared front end does and for a template the ticket names; output of the new instance's own API stays `ask`.
- A typo, missing space, or bold in the ticket's text is not behavior: use the text another source writes correctly. Raise an `ask` only when no source writes it correctly.
- UI labels (the names of fields, buttons, and tabs) and layout follow the design, or without a readable design, the screen spec's field table or existing cases. Behavior and messages follow the ticket; a field's displayed value, the set of fields, and the filter criteria are behavior. An order or position that behavior depends on (the first button a row click opens, the default tab) is behavior. Labels on a screen another story built follow that story.
- When parts of the ticket conflict (description, sub-tasks, comments), a later implementation sub-task or comment that refines or narrows an earlier plan wins: record the conflict, no `ask`. One that reverses an acceptance criterion's outcome for the same input gets one `ask` item whose expected result is what both sides keep. A part that lists fewer options than another is silent on the rest, not in conflict.
- When sources other than the ticket conflict, follow the one updated most recently, record the conflict, and mark the items that depend on it `ask`.
- If the user gave no ticket, document, or feature description, ask once for the ticket or its description and acceptance criteria. If they decline, continue from the prompt.

Sources may come as pasted text, links, or MCP tools. If a Jira, Confluence, or Figma link needs an MCP that is not connected, stop and ask the user to connect it.

Learn the UI pages, components, and API endpoints from Figma, Confluence, and the live app:

- If the feature is deployed, ask the user for a non-production URL and credentials, then explore the related pages with the `agent-browser` skill.
- In the live app, navigate only. Submit nothing that saves data unless the user agrees.
- Use screenshots of related pages when the user shares them.
- In Figma, read the frames of each component the ticket changes or gives a new state (picker, sheet, keyboard), not only the screen frames. Context files of related features from earlier runs list frames already found.

#### QA workspace

A catalog's README `Type` names its source. Default folders: `catalog/` and `mismatches/sources/*/catalog/`.

- Live app catalog: the feature's URL and navigation path are where exploring starts.
- Jira catalog: the feature's other issues, read as context.
- TestRail catalog: see Existing test cases.
- Mismatch pages (`mismatches/mismatches/README.md`): read the ones for the feature. They are known conflicts.

#### Existing test cases

Find the TestRail cases that already test the feature, with the `sync-test-cases-with-testrail` skill:

- TestRail catalog: find the feature there. Its links are the existing cases, and its area folder is their section. Run `list --section <section>` for cases the catalog does not link yet.
- No catalog: run `list` and match sections and case titles to the feature.
- TestRail not set up: ask for its Setup, or continue without the check and record TestRail as not read.
- Do not `pull` here. Step 5 pulls the section the user chooses to expand.

#### Related sources

When the sources above leave a gap, search as [Related Sources](../qa-thinking/references/related-sources.md) describes.

#### Context file

Save the findings to `test-cases/<feature-name>.context.md`, named like the feature's test case file. Overwrite it on a re-run, and update it when the user picks the other side of a conflict or answers an open question. Name sources and link them; do not copy their content:

- `Date`
- sources read: ticket keys, page titles, frame names, app environment and build, each with its link and last-updated date
- sources that could not be read
- sources found by search, each with the gap it fills
- existing cases: count, section, `C<id>` range
- conflicts between sources, including known mismatches, and the side the test cases follow
- gaps no source filled
- validation rules and error messages left without a checklist item, and why
- answers the user gave to `ask` findings

```markdown
# Saved cards

Date: 2026-11-10

Sources read:

- Jira [ABC-123](https://jira.example.com/browse/ABC-123), updated 2026-11-03; parent ABC-100
- Confluence [Saved cards](https://wiki.example.com/x/Ab12), updated 2026-10-28
- Figma [Checkout › Payment](https://figma.com/design/Ab12), updated 2026-10-30
- Live app: staging, Checkout › Payment, build 4.12.0

Not read: Confluence "Payments FAQ" (no access)

Found by search:

- Jira [ABC-130](https://jira.example.com/browse/ABC-130) (same epic), updated 2026-10-15: card expiry rules

Existing cases: 8 in TestRail section Checkout › Payment (C101–C108)

Conflicts:

- Expired cards at checkout: the live app lists them; ABC-123 hides them. Test cases follow ABC-123.

Open questions:

- Saved cards limit per user: no source says
```

Do not ask for approval. Above the Step 2 question, show the file's path, sources not read, and at most five conflicts or open questions that change expected results. The file holds the rest.

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
- Merge items whose tests would share preconditions and steps, items that differ only in test data and share a priority and smoke tag with no `ask` part (one item with a data table), causes a source groups under one rule, and checkpoints on one timeline (after the 3rd and the 5th child order).
- Do not drop an item on an assumption no source states, such as "the field always has a value". Keep the item, mark it `ask`, and record the doubt as an open question in the context file.
- Group items by user journey in flow order. In each group, list the happy path first, then negative and edge cases.
- Cover UI consistency with one item per screen, not one per element. A screen where the ticket only adds a row or field gets its UI and language check as a step in the flow test that already reaches it. Without a readable design, the UI item checks only what sources state and flow tests do not already check, or is left out. When the ticket adds or changes text on a screen, each other language of it is one more item, which also checks that longer labels do not overlap or get cut; another theme is one more step in the screen's UI item. Message texts in another language are one item with a data table.
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
- Set `automation:` on every test: `yes` when a script can read the expected result (a value, message, or state), even if the flow waits on market time; `no` for layout, visual, and judgment checks.
- Set `platform:` on each suite when the product has several platforms. Use the option names the pulled cases use (`Mobile`, `Web`). Without pulled cases, use `All` for behavior every platform shares, else the platform the ticket names.
- Name files `feature-name.test.md` (always the `.test.md` extension).
- Multiple features or whole product → one file per feature.
- When the user chose to expand an existing section, `pull --section <section>` it, then add each new test to the pulled file of the subsection it fits. Never overwrite a pulled file.
- When pulled cases carry `platform:`, the project keeps one section tree per feature for all platforms. Add the new platform's tests to those subsections; do not create a section per platform.
- A new section with several suites: tell the user to push with `--parent-section "<feature name>"` so the suites nest under one section.
- **Keep scope**: test only the functionality under test; don't test linked features unless the user explicitly asks.

Format rules:

- Strictly follow [Test Case Format](./references/testrail-test-case-format.md) for suites, tests, and steps. Only exception: the user specifies their own format in the prompt.
- Strictly follow [Writing Rules](./references/writing-rule.md) for suite/test descriptions, preconditions, steps, expected results, and anti-patterns.
- Set `refs:` to the Jira key on every test case that comes from a Jira issue. When the whole file covers one issue, set `refs:` once on the suite instead.
- If reasonable, add preconditions and test data based on the analyzed context.
- Use concrete, executable values. **Do NOT introduce `${...}` placeholders in first-pass generation.** Parametrize only genuinely reused or data-driven values, and environment data no source gives that the tester supplies (test account, customer name); format them as `${variable}` in backticks.
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

### Step 6: Review test cases

Run [Self review](#self-review) on the new test cases. Before each review, run `check` of the `sync-test-cases-with-testrail` skill on the files and fix what it reports.

### Step 7: Show summary

- Show a concise summary (markdown table works well): number of test cases and suites, generated files.
- Ask the user to review the files and request changes if needed.
- List the findings Step 6 leaves for the user, items that needed splitting, and gaps found while writing, as suggested additions and questions.
- Suggest pushing the test cases to TestRail with the `sync-test-cases-with-testrail` skill.
