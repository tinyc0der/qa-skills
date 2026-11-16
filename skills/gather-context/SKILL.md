---
name: gather-context
description: Gather what every source says about a Jira ticket or feature and save it to a context file (`tickets/<KEY>-<slug>/context.md`) with the sources read and not read, existing TestRail cases, conflicts between sources and the side followed, and open questions. Reads the ticket with its history, comments, sub-tasks, and linked issues, plus Confluence, Figma, TestRail, the live app, and the QA workspace. It is the first step of `review-user-story` and `qa-write-test-cases`. Use when the user asks what is known about a ticket or feature, asks to collect, refresh, or re-check its context, or asks for the sources a ticket does not link.
---

# Gather Context

Collect what every source says about one ticket or feature, decide which source wins where they disagree, and save the result to a context file that the other QA skills read.

## Workflow

### 1. Start from the context file

- The ticket's context file, found as [Ticket Folder](./references/ticket-folder.md) says, is the starting point: read the sources it lists, search only for gaps still open, and check its conflicts and open questions again.
- A context file written in this session is current: use it without re-reading its sources, unless the user says a source changed.
- Do not ask the user again about a source under `Not read`, unless the user offers it.
- Ignore the context file when the user asks for an independent run.
- No ticket, document, or description given: ask once for one, then continue from the prompt.

### 2. Read the sources

Sources may come as pasted text, links, or MCP tools. Read Jira and Confluence through the Atlassian MCP and Figma through the Figma MCP. A link or ticket key whose MCP is not connected → ask once to connect it. Declined → record the source as not read. Truncated tool output → retrieve the rest before drawing conclusions.

- Jira: the ticket's description, acceptance criteria, images, comments, parent, sub-tasks, and linked issues. Linked bugs record behavior settled later.
- Read the description history (`expand: changelog`). A phrase removed while the rest stayed is a decision against it; a full rewrite makes the old draft an earlier plan. Date sources by their last content change, not Jira `updated`. Pasted text has no history: record the history as not read.
- Images the MCP cannot download and sections that come back empty: record them as not read. The first report that lists them asks for screenshots.
- Linked documents: only the parts in the ticket's scope, and rules for every result of the screen.
- Figma: screens, states, and UI copy. Read the frames of each component the ticket changes or gives a new state (picker, sheet, keyboard), not only the screen frames. Context files of related tickets list frames already found.
- Live app: if the feature or the screens it changes are deployed, explore the related pages with the `agent-browser` skill, or on Android and iOS with the `agent-device` skill as the Device Session reference of `run-test-suite` says. Take the non-production URL and account from the app's file in `automation-lessons/`; ask only when it has none. Navigate only; submit nothing that saves data unless the user agrees. Use screenshots the user shares. Declined → record the live app as not read.
- Learn the UI pages, components, and API endpoints from Figma, Confluence, and the live app.
- When these sources leave a gap, search as [Related Sources](./references/related-sources.md) describes.

#### QA workspace

- Domain rules: read `domain/index.md`, then only the topic files whose line matches the ticket. Read each rule as [Domain File](../save-domain-knowledge/references/domain-file.md#reading-a-rule) says.

#### Existing test cases

Find the TestRail cases that already test the feature, with the `sync-test-cases-with-testrail` skill:

- Run `list` and match sections and case titles to the feature.
- TestRail not set up: continue without the check and record TestRail as not read.
- Do not `pull`.

### 3. Decide which source wins

- A PO answer in the context file's `Answers`, or a PO comment answering an `asked` item, settles that item. It wins over the ticket text it answers.
- The ticket is the primary source. Where another source contradicts it, the ticket wins.
- Silence is not conflict: a source that states a behavior the ticket does not mention gives that behavior. When that source predates the ticket and the ticket does not link it, the behavior is an open question.
- Released stories of the same screen and their fixed bugs are current behavior. For parts the ticket does not change, they rank above spec pages.
- A confirmed rule in `domain/` is current behavior too, and ranks with released stories. Where the ticket changes the rule, the ticket wins, and its `Conflicts` entry names the rule ID as stale from the ticket's release.
- Labels and layout follow the design, else the spec's field table or existing cases. Behavior and messages follow the ticket; displayed values, the set of fields, filters, and orders behavior depends on are behavior. Labels on a screen another story built follow that story.
- Ticket parts in conflict: a later sub-task or comment that narrows the plan wins. One that reverses an acceptance criterion's outcome for the same input is an open conflict that follows neither side. A part listing fewer options is silent on the rest.
- Other sources in conflict: follow the newest. The conflict stays open.

### 4. Save the context file

Save it in the ticket's folder ([Ticket Folder](./references/ticket-folder.md)), as [Context File](./references/context-file.md) describes.

### 5. Report

Report, as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out, the file's path, the sources not read, and the conflicts and open questions that change expected behavior. The file holds the rest. Do not ask for approval of the context file.

Hand to [`save-domain-knowledge`](../save-domain-knowledge/SKILL.md) what this run adds that holds beyond the ticket: answers it moves into `Answers`, and confirmed rules the ticket changes. An earlier run offered the rest. It drafts the entries, and the report carries its one question.

Run by another skill: hand the report to that skill instead of messaging the QC. Its own message carries what matters.
