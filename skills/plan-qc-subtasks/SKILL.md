---
name: plan-qc-subtasks
description: Create, estimate, and schedule the QC's own QC subtasks in Jira. Finds the stories assigned to the QC for testing, creates a QC subtask under each story that has none, estimates story points from the story, and fills empty Start and Due dates from the Dev subtasks' Due dates and the story points, all in one approval. Use when the user asks to list the stories they test, create QC subtasks, estimate or fill story points on them, set QC start or due dates, or plan their QC work for a sprint. Not for story point or sprint reports.
---

# Plan QC Subtasks

A QC subtask is the QC's own Jira issue for testing one story: it carries the QC's assignee, story points, and dates. This skill creates the missing ones and fills their empty fields, in one change set the QC approves once.

**When to skip steps:**

- The QC only asks which stories they test → run Step 1 and list the stories. Skip the plan and the question, and offer the plan in one line.

## Settings

Jira field keys come from the project's create and edit metadata, found by field name. Never hardcode field IDs.

Team choices live in `.env` in the QA workspace, next to the TestRail variables. A missing value takes its default: state the defaults used in one line of the approval message. A value the QC changes there gets saved to `.env`.

| Variable                 | Default                         | Meaning                                                                                       |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------- |
| `JIRA_QC_ASSIGNEE_FIELD` | `QC Assignee`                   | Name of the story field that names the story's QC                                              |
| `QC_SUBTASK_TITLE`       | the pattern of your latest QC subtask in the project, else `QC - {story}` | Title of a new QC subtask, `{story}` being the story's title. The text before `{story}` marks a QC subtask |
| `JIRA_DEV_SUBTASK`       | none: every other subtask       | JQL condition that matches Dev subtasks, such as `labels = dev`                                |
| `QC_SP_HOURS`            | `1:2,2:4,3:8,5:16,8:24,13:40`   | Story points and the most hours each covers. The highest is the most one QC subtask may hold   |
| `QC_HOURS_PER_DAY`       | `8`                             | Working hours in a day                                                                         |
| `QC_WORKDAYS`            | `mon,tue,wed,thu,fri`           | Working weekdays                                                                               |
| `QC_HOLIDAYS`            | none                            | Days off as `YYYY-MM-DD`, comma-separated. None set: say the Due dates ignore holidays          |

The date script is [scripts/schedule.mjs](./scripts/schedule.mjs) (Node 18+, no dependencies). It reads the `QC_` variables itself. Run it from the QA workspace, where `<skill>` is this skill's directory:

```bash
node <skill>/scripts/schedule.mjs settings
node <skill>/scripts/schedule.mjs plan <stories.json>
node <skill>/scripts/schedule.mjs verify <plan.json> <readback.json>
```

Its `--help` text shows the JSON shape. Keep these files in a scratch dir, not in `tickets/`.

## Workflow

1. Find the stories
2. Plan each story
3. Ask once
4. Write and read back
5. Report

### Step 1: Find the stories

- Story keys given: those stories, which count as assigned to the QC. A subtask key: its parent story.
- Otherwise: every story whose `JIRA_QC_ASSIGNEE_FIELD` is the current Jira user and whose status category is not Done.
- The field does not exist in the project: ask for the story keys in the Step 3 message.

Read Jira through the Atlassian MCP. For each story read its title, status, the QC field, and every subtask with its title, assignee, status, resolution, story points, Start date, and Due date. Page through every result.

Sort the subtasks of each story:

- QC subtask: assigned to the current user, or its title starts with the `QC_SUBTASK_TITLE` prefix.
- Dev subtask: matches `JIRA_DEV_SUBTASK`, else any other subtask.
- Cancelled (a resolution such as Won't Do or Duplicate, or a cancelled status): left out of both.

**Plan only QC subtasks assigned to the current user.** List other QCs' QC subtasks without changing them.

### Step 2: Plan each story

**Fill only empty fields. Never change a value that is already set.**

- No QC subtask, and the story is assigned to the QC: plan one, titled from `QC_SUBTASK_TITLE` and assigned to the current user. A story with another QC or none, or whose only QC subtasks belong to another QC: list it, do not plan a subtask.
- A QC subtask in a Done status category: leave it.
- Story points: estimate them when the QC asks, or when every Dev subtask has a Due date and the QC subtask's Due date is empty. Otherwise leave them empty.
- Dates: pass each story's Dev subtasks and open QC subtasks to `plan`, with the new and estimated story points. A new subtask uses `<story key>/new-<n>` as its key. `plan` returns the dates to set, the Dev subtask that sets the Start date, and why a date cannot be set.

The script owns the date rules: Start is the next working day after the latest Dev Due date, and Due is working day N with Start as day 1, where N is the story points' hours divided by `QC_HOURS_PER_DAY`, rounded up. A story with no Dev subtask, or a Dev subtask without a Due date, gets no dates.

#### Estimate

Read the story's description, acceptance criteria, and linked pages. If the story has a ticket folder ([Ticket Folder](../gather-context/references/ticket-folder.md)), read its `context.md` and count its test cases.

Estimate the hours to test the story from:

1. acceptance criteria and the number of test cases
2. flows and branches: success, errors, validation, edge cases
3. business risk: money, orders, and calculations weigh more
4. dependencies and integrations
5. environment variants: language, theme, device, browser, role
6. test data to prepare, and how clear the spec is

The story points are the smallest value in `QC_SP_HOURS` whose hours cover the estimate. More hours than the highest value: plan several QC subtasks, split by group of acceptance criteria, then by test phase, then by platform, each titled `<QC_SUBTASK_TITLE> - <part>` and within the highest value.

### Step 3: Ask once

One message as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out. Questions from Steps 1 and 2, such as missing story keys or a field the project lacks, go in it.

- One line of counts: `3 to create · 4 story points · 5 dated · 2 waiting`.
- One row per QC subtask: story key, QC subtask (key, or new with its title), story points with the estimated hours, Start date, Due date, and the Dev subtask key and title that set the Start date. A kept value that differs from the computed one gets a short note.
- Waiting: each subtask that gets nothing, with the reason and who acts, such as the Dev subtask that lacks a Due date.
- Stories assigned to another QC or none.
- The settings used, in one line.

```
❓ Write these to Jira?

1. ✅ Write all
2. ✏️ Type changes
```

### Step 4: Write and read back

Run every approved write without asking again. A change to the approved rows needs a new approval.

1. Re-read the subtasks of the approved stories and run `plan` again. Write only the rows it returns unchanged. A row that changed waits for the next run, and the report says why.
2. Create each new QC subtask with its parent, title, assignee, and approved story points and dates. If the create call rejects a field, create the subtask and then edit the field.
3. On each existing QC subtask, set only the approved fields that are still empty.
4. Read the subtasks back, write them in the `plan` input shape with each new subtask's real key, and run `verify` with the plan whose keys you updated the same way. Also check each new subtask's parent, title, and assignee, and every story point value written. Report a mismatch with Jira's current value. Do not write it again until the cause is known: a workflow or automation may have changed it.

**Never create a second subtask to retry a failed step.** Fix the one already created.

### Step 5: Report

- One line of counts with zeros: `3 created · 4 story points · 5 dated · 2 waiting · 0 failed`.
- Each QC subtask written, as a Jira link, with its story points and dates.
- Each subtask still waiting, with the reason, and each failed write with Jira's current value.
- One next step, such as running this skill again once Dev fills its Due dates.
