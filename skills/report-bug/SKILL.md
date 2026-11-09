---
name: report-bug
description: Create a Jira Bug from a failed TestRail case or a defect found in the live app. Find the user story it belongs to, search Jira for duplicates first, write reproducible steps with Expected vs Actual per failing step, link the Bug to the story and the TestRail case, and read it back after creating. Use when the user says "create a bug", "log a bug", "report this in Jira", "this case failed, file a bug", "write a bug report", "raise a defect for PROJ-123", or describes wrong behavior they want recorded, including when they only share a screenshot of the error. Not for retesting a fixed bug.
---

# Report Bug

Creates a Jira Bug that a developer can reproduce on the first read without asking back. The Bug links to its user story and to each TestRail case whose failed result it explains.

References:

- [Bug Report Format](./references/bug-report-format.md) defines the title, fields, and description, and maps each part to Jira.
- [Writing Rules](../qa-write-test-cases/references/writing-rule.md) of `qa-write-test-cases` cover steps, expected results, and AI writing patterns to avoid.

## Workflow

1. Find the user story
2. Check for duplicates
3. Confirm the defect
4. Draft the Bug — approval gate
5. Create the Bug and its links
6. Show the result

### Step 1: Find the user story

**Every Bug links to a user story. Do not create a Bug until the story is known.**

- Jira ticket: a story is used as is. For a subtask or another issue, find the story through `parent`, issue links, and keys in the text. Never use a subtask, task, bug, or epic in place of the story.
- TestRail case `C<id>`: with the `sync-test-cases-with-testrail` skill, run `list` to find its section, then `pull --section <section> --out <scratch dir>`. Read the case's `refs`, preconditions, and steps from the pulled file, and resolve the story from `refs`.
- Any other source: use only a story key it names. Never guess the story from a title, screen, or section name.
- No story, several candidates, or conflicting sources → ask the user for the story key and list the candidates. Check duplicates and draft meanwhile.

From the story, read:

- project key: the Bug goes in the story's project
- `assignee`: display name and `accountId`, read again right before creating
- sprint: name and ID. A verified empty sprint differs from a field that failed to load. Several sprints → the one not closed; still several → ask.
- description, acceptance criteria, comments, and linked Confluence pages and Figma frames, for Step 3

Read Jira and Confluence through the Atlassian MCP and Figma through the Figma MCP. Missing connection → stop and ask for it.

### Step 2: Check for duplicates

Always search Jira before drafting a new Bug:

- by feature keywords and symptom, without filtering on the title prefix (older Bugs may lack it)
- open Bugs in the same area
- recently closed Bugs

On a match, propose the action and write only after the user approves:

- Same defect, other data or conditions → no new Bug. Report the existing key; for a failed result, Step 6 lists it for the result's Defects. Do not edit the old Bug's title, description, or attachments.
- Closed Bug that recurs → reopen it with a comment instead of creating a new one.
- Different defect the user assigns to an existing Bug → comment on it with Environment, Steps to reproduce, Expected result, and Actual result, written as in the description, plus images.
- Unsure whether it is the same defect → show both and let the user decide.

### Step 3: Confirm the defect

- Check the expected behavior against the story, its comments, and its linked pages. Behavior descoped there is not a bug.
- If the QA workspace has mismatch pages (`mismatches/mismatches/README.md`), read the ones for the feature. Likely cause `Bug` supports the Bug; its `Steps in the app` and screenshot are evidence. Likely cause `Decide`, or specs that contradict each other → a question for the PO, not a Bug.
- Web on a non-production environment: reproduce with the `agent-browser` skill. Ask before any action that saves data.
  - Use the same screen, tab, filters, data, and build as the report.
  - Redo what the reporter did before the failing step, not only the numbered steps.
  - Record displayed values read from the app, not impressions from a screenshot.
  - Read the build from the app's version string, not from the environment name.
  - A different result on a similar but different screen is a separate finding. Report "not reproduced" only with the conditions set up, and ask whether to file from the user's evidence.
- Other platforms or production: work from the user's evidence and ask for what is missing.
- Failed TestRail case: the script does not read results. Take the result comment, build version, and screenshots from the user.

### Step 4: Draft the Bug

Format rules:

- Strictly follow [Bug Report Format](./references/bug-report-format.md) for the title, fields, and description.

Writing rules:

- Follow the Steps and AI Writing Patterns sections of [Writing Rules](../qa-write-test-cases/references/writing-rule.md). Where they differ from the Bug Report Format, the format wins.
- Write in the language the user asks for. Otherwise use the language of the project's existing Bugs. Keep Jira field names as Jira shows them.
- Setup steps hold only the account, data, and settings the defect depends on. Never passwords.
- Actual holds observations only: values, messages, error codes, requests. Never a guessed cause.
- Leave out correct behavior around the defect, effects on other screens, timestamps from the run, a second example of the same point, and repeats on other data.
- Never name the story, page, or criterion that defines the expected behavior. Never mention TestRail cases, runs, or results, local files, skill names, or agent actions.

Priority and severity:

- Propose each separately, with a reason. Never derive one from the other.
- Use only values the project's Jira offers.
- The table supports the priority proposal. Anything touching money or balances starts at Critical and goes lower only with a reason.

| Priority | Signs                                                          |
| -------- | -------------------------------------------------------------- |
| Critical | Wrong money or balance, data loss, core flow blocked, security |
| High     | Main flow wrong with a workaround; wrong figures displayed     |
| Medium   | Secondary flow, or only under narrow conditions                |
| Low      | Display, typos, layout                                         |

#### Approval gate

Show the title, fields, and description. Also show:

- story key, how it was found, and the link type and direction
- story assignee (name and `accountId`), the basis for the Bug's assignee
- story sprint (name and ID), or "no sprint" when verified
- web link to each TestRail case whose failed result gets this Bug
- files to attach
- reasons for priority and severity

Mark each unknown value `Unverified`. Do not create the Bug while the story, found-on environment, platform, build, or sprint is `Unverified`.

```
❓ Do you want to:

1. ✅ Create
2. ✏️ Type changes
```

### Step 5: Create the Bug and its links

**Write to Jira only after the user approves the draft.** Then run every approved write without asking again. An extra Bug or a changed payload needs a new approval.

- Field keys and allowed values come from the project's create metadata for the Bug issue type. Never hardcode field IDs.
- Leave out optional fields without data. Never send `Unverified` or a placeholder as a value.
- Issue link to the story: `relates to`, or `blocks` when the Bug blocks the story. A story key in the description is not a link.
- Web link to each TestRail case whose failed result gets this Bug: title `C<id> — <case title>`, URL `<TESTRAIL_URL>/index.php?/cases/view/<id>`.
- Attach the evidence.
- The tool cannot create an issue link or web link, or upload a file → hand them to the user to add.

Read the Bug back: every field sent, the story link, the assignee `accountId`, the sprint ID, the web links, and the attachments. A successful create response is not proof. Fix a mismatch on the same Bug. **Never create a second Bug to retry a failed step.**

### Step 6: Show the result

- Bug key and URL.
- Steps not completed, with the reason.
- TestRail: the script does not write results. List each failed result with the Bug key for the user to add to its Defects field.
