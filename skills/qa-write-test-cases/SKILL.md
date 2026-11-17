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

**When to skip steps:**

- The QC gives the finished cases → skip Steps 2 to 4 and write only those cases. Format them, set `refs:`, and compare them with the story's existing cases. Step 6 still runs.
- New answers in the context file's `Answers` list cases already written → pull those cases fresh, change only what the answers settle, and skip Steps 2 to 4. Step 6 still runs.

## User interaction

- **Always generate a checklist before test cases**, even if the user asks for test cases directly.
- **The checklist (Step 4) is the one approval gate.** Scope, role, and destination are defaults the checklist message states, and the QC changes them in the same reply.
- **Never push the cases, even when the QC asked for the push before they were written: the QC reads them before other QCs see them on TestRail.** The report asks the QC to review them, and the push waits for their word.
- Stop and write to the QC as the [`message-the-qc`](../message-the-qc/SKILL.md) skill says.
- Write the checklist and test cases in the language the user asks for. Otherwise use the language of existing test cases, then of the requirements.

## Self review

Review the checklist (Step 4) and the test cases (Step 6) yourself against [Review Checklist](./references/review-checklist.md). A fixer subagent applies the fixes. **Do not show either to the user before its review ends.**

Loop until a review finds nothing to fix:

1. Review: re-read the checklist or the written files item by item against every check. Write each finding in the Review Checklist's findings format.
2. Fix: start a fresh fixer subagent, never one from an earlier round. Give it the `fix` findings, the paths of the files they name, the context file, and the Review Checklist. For the checklist, give it the checklist text, and it returns the fixed checklist. It applies only the listed findings.
3. Keep `ask` findings out of the fixes. Do not act on them.

After the third fix, review once more and stop. Show the user only the `ask` findings and the `fix` findings still open, not the review or the fixes made. An `ask` on a fact no source gives, or on an open conflict, is the PO's: record it in the context file's open questions, keep its item `ask`, and count it instead of asking the QC.

Without subagents, apply the fixes yourself.

## Workflow

1. Gather context into a context file
2. Choose coverage scope — default
3. Choose role — default
4. Generate checklist — self review, then the checklist gate
5. Generate detailed test cases
6. Review test cases — self review, then the report

### Step 1: Gather context

Run the [`gather-context`](../gather-context/SKILL.md) skill for the feature. Its report goes into the checklist message header (Step 4).

Items follow the context file:

- Expected results follow the side each conflict names.
- An expected result may come from a confirmed rule from `domain/` that the context file lists. Cite the rule's ID as its source.
- An item that depends on an open conflict or an open question is `ask`. A reversed acceptance criterion gets one `ask` item that checks what both sides keep.
- Record new doubts, rules left without a checklist item, and the user's answers to `ask` findings in the context file, as [Context File](../gather-context/references/context-file.md) describes.

### Step 2: Choose coverage scope

Use the scope the user named: a tier, a number ("around 10"), or a description ("only price and quantity validation, no layout"). Otherwise use ⚖️ Balanced. Do not ask.

| Tier          | Covers                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 🚀 Smoke      | Critical path only                                                                                                              |
| ⚖️ Balanced   | Happy path, alternative flows, key negative and common edge cases                                                               |
| 🧨 Exhaustive | Full coverage incl. error states, boundaries, invalid input combinations, empty and default states, and UI/security/perf/i18n where relevant |

**Estimate each tier's test count from your Step 1 analysis, never from generic ranges.** The checklist message shows the other tiers' counts so the QC can switch. Context too thin to estimate → leave the counts out and say why.

### Step 3: Choose role

Use the role or focus the user named, such as "security edge cases". Otherwise use ⚙️ default. Do not ask.

When Step 1 found existing cases for the feature and the scope is not smoke, the checklist message names the one role that would add the most beyond them, so the QC can switch to it.

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
| **📈 performance** | **performance**, slow pages, timeouts; one user's timing, not load |
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
- 1 LO buy order
  - 1.1 🔴 [critical] [smoke] LO buy order at the reference price shows as pending in the order book
  - 1.2 🟠 [high] LO buy order accepts only prices from floor to ceiling
  - 1.3 🟡 [medium] Quantity not in lots of 100 shows an error

- 2 Cancel a pending order
  - 2.1 🔴 [critical] [smoke] Pending order can be cancelled in the continuous session
  - 2.2 🟠 [high] Pending order cannot be cancelled during ATC
```

#### Self review

Run [Self review](#self-review) on the checklist. Skip it when the user only removed or reworded items.

#### Checklist gate

One message, in this order:

1. Header, one line each: scope and item count, with the other tiers' counts; role, and the role Step 3 recommends; destination section (Step 5); sources not read; count of `ask` items waiting on the PO.
2. The findings Self review leaves for the QC, as numbered questions.
3. The checklist.
4. The question:

```
❓ Write the test cases from this checklist?

1. ✅ Write the cases
2. ✏️ Type changes: item numbers to drop, items to add, another tier, role, or section
```

- Items only removed or reworded, or another section → apply the change and go to Step 5 without asking again.
- Items added, or another tier or role → regenerate (Step 4) and ask again.
- The user asked only for a checklist → leave out the question, end here, and offer the test cases in one line.
- More details → enable the 🤓 nerd role.
- User not satisfied → go back to Step 1 for more context.

### Step 5: Generate detailed test cases

Destination, named in the checklist header: the section where Step 1 found the feature's cases, expanded; otherwise a new section named after the feature.

Write test case files to the ticket's folder ([Ticket Folder](../gather-context/references/ticket-folder.md)).

Generation rules:

- Write exactly one test case per approved checklist item, and no others. Set its `priority:` to the item's priority, and `smoke: yes` when the item has `[smoke]`.
- Set `automation:` on every test: `yes` when a script can read the expected result (a value, message, or state), even if the flow waits; `no` for layout, visual, and judgment checks.
- Set `platform:` on each suite when the product has several platforms. Use the option names the pulled cases use (`Mobile`, `Web`). Without pulled cases, use `All` for behavior every platform shares, else the platform the ticket names.
- Name the file `<slug>.test.md` after the folder's slug (always the `.test.md` extension).
- Multiple features or whole product → one file per feature.
- When the user chose to expand an existing section, `pull --section <section> --out <ticket folder>` it, then add each new test to the pulled file of the subsection it fits. Never overwrite a pulled file.
- When pulled cases carry `platform:`, the project keeps one section tree per feature for all platforms. Add the new platform's tests to those subsections; do not create a section per platform.
- **Keep scope**: test only the functionality under test; don't test linked features unless the user explicitly asks.

Format rules:

- Strictly follow [Test Case Format](./references/testrail-test-case-format.md) for suites, tests, and steps. Only exception: the user specifies their own format in the prompt.
- Strictly follow [Writing Rules](./references/writing-rule.md) for suite/test descriptions, preconditions, steps, expected results, and anti-patterns.
- Set `refs:` to the Jira key on every test case that comes from a Jira issue. When the whole file covers one issue, set `refs:` once on the suite instead.
- **Never write IDs:** no `testrail_id:` or `testrail_section_id:` (the TestRail push writes them; keep existing ones when editing), and no custom IDs (`TC-001`) anywhere.
- Example test cases from the user: match their style, detail, and fields, not their IDs or intent.

### Step 6: Review test cases

Run [Self review](#self-review) on the new test cases. Before each review, run `check` of the `sync-test-cases-with-testrail` skill on the files and fix what it reports.

List the test of each `ask` item under the open question or open conflict it depends on, as [Context File](../gather-context/references/context-file.md) describes: the PO's answer finds its cases there.

Report as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out:

- The findings the review leaves for the QC, items that needed splitting, and gaps found while writing, as numbered questions.
- The number of test cases and suites, with the files linked.
- Last, the ask: `Review the test cases in <files>. Tell me what to change, or say "push" and I push them to <section>.`

On "push", run the `sync-test-cases-with-testrail` skill. A new section with several suites needs `--parent-section "<feature name>"` on that push, so the suites nest under the one section the header named.
