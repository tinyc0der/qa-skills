---
name: testing-workflow
description: Route manual QA work across the QA skills, from requirements in Jira, Confluence, and Figma to test cases and test runs in TestRail, and suggest the next step. Use when the QC reports what just happened on a ticket (assigned a story, the PO answered, Dev set their dates, a build is ready, Dev fixed a bug), says "continue <KEY>" or asks what is left on a ticket, a request spans several QA skills, the user asks what to do next, or a QA request no other skill fits. A request for a single task goes to that task's skill.
---

# Testing Workflow

Orchestrates the test case lifecycle by routing requests to specialized skills and suggesting next steps. A ticket's flows start from real events in the QC's work and span many conversations: each flow ends when its deliverable exists.

## Routing

- Start from the QC's intent: the deliverable they want and where it ends up. Match it to a flow below, or to a skill, then suggest its next actions.
- **A flow is the usual path to its deliverable, not a script.** Skip steps whose result already exists or that the request makes unnecessary, add steps the situation needs, and when no flow fits, combine the skills that own what the task touches. Say in one line how the path differs from the flow.
- Each skill's write approvals, formats, duplicate checks, ownership rules, and read-back apply on any path.
- No skill owns what the task changes → work out the approach yourself. Name the deliverable, reuse what fits from other skills, show each change others will see and ask once as `message-the-qc` says, read it back, and report the approach in one line.
- When suggesting next steps, take into account the flows, context, user request, and results of previous steps. Suggest the one next step that fits.
- Stop and write to the QC as the [`message-the-qc`](../message-the-qc/SKILL.md) skill says.
- A ticket's flow ends with its deliverable, then the event the ticket waits for next: who acts, and what the QC says when it happens, such as "build 2.3.1 is ready, continue <KEY>".
- **Assigned a story** (a new ticket to test) → follow the Assigned Story Flow.
- **The PO answered, or the story changed** → follow the PO Answer Flow.
- **Dev set the Due dates of their subtasks** → follow the Dev Dates Flow.
- **A build with the story is ready** → follow the Build Ready Flow.
- **Dev fixed a bug** → follow the Bug Fix Flow.
- **Continue a ticket** ("continue <KEY>", what is left on a ticket) → follow the Continue Ticket Flow.
- **A test status report** (status and pass rate for a ticket, milestone, or date) → the `runs` command of the `sync-test-cases-with-testrail` skill.
- **Behavior questions** ("what happens when…", "can a user…", "is X supported") → check on the live app with the `agent-browser` skill, or `agent-device` on Android and iOS, then continue with the flow the answer points to.

## Basic Flows

### Assigned Story Flow

Run the steps back to back. Stop only where a step needs the QC, and put every question pending at that point in one message.

```
Event: the QC is assigned a story
=>
1. 🔎 Draft the review of the story (with `review-user-story` skill). It runs `gather-context` first; later steps reuse the context file.
   ⏸ One message with the review, its gaps and questions numbered for the reply, then one question. A review with no gap and no question has nothing to confirm: skip this stop.
      Read the review above and answer the points you can. I draft the checklist once you confirm it.
      ❓ Is the review complete?
      1. ✅ Confirm: the open questions are for the PO, as written
      2. ✏️ Type the answers you have, or changes to the review
   **Draft no checklist before the QC replies: each answer changes its items.** An answer settles its gap or question: move it to the context file's `Answers`, and take it out of the review. A typed reply completes the review too: go on without asking again.
2. 📝 Draft the checklist (with `qa-write-test-cases` skill). Questions the QC left open become `ask` items; do not wait for the PO. Add the open questions the checklist raised to the review.
   ⏸ That skill's checklist gate. Above the checklist, list the questions this step added to the review: the QC sends them to the PO with the rest.
3. 💬 Write the cases (with `qa-write-test-cases` skill). Its report asks the QC to review them.
4. ⬆️ Push the cases once the QC says they are right (with `sync-test-cases-with-testrail` skill).
=>
Deliverable: the review for the QC to send to the PO, the cases on TestRail linked to the story
Next event: the PO answers, Dev sets their Due dates, or a build is ready
```

### PO Answer Flow

```
Event: the PO answers in the story's comments, or the story changes
=>
1. 🔄 Re-run `gather-context` for the story.
2. 📝 Update the cases each new answer lists in the context file, and the cases the change touches (with `qa-write-test-cases` skill). Its report asks the QC to review them.
3. ⬆️ Push the cases once the QC says they are right (with `sync-test-cases-with-testrail` skill).
=>
Deliverable: the answers in the cases on TestRail
Next event: a build is ready
```

### Dev Dates Flow

```
Event: Dev sets the Due dates of their subtasks
=>
Create the QC subtask when the story has none, estimate its story points, and date it (with `plan-qc-subtasks` skill)
=>
Deliverable: the QC subtask in Jira, with its story points and dates
```

### Build Ready Flow

```
Event: Dev deploys a build with the story to a test environment
=>
1. ▶️ Run the story's cases on the build (with `run-test-suite` skill): new feature scope on the first run, then the cases without a passed or failed result.
2. 🐞 `run-test-suite` hands the failed cases to `report-bug`, which drafts their Bugs and creates the ones the QC approves.
=>
Deliverable: the results on TestRail, and a Bug in Jira for each failed case
Next event: Dev marks a Bug fixed. Every case passed → the story's testing is done.
```

### Bug Fix Flow

```
Event: Dev marks a Bug fixed
=>
Rerun the Bug's cases on a build with the fix, then close or reopen the Bug once the QC approves (with `verify-bug` skill)
=>
Deliverable: the retest results on TestRail, and the Bug closed or reopened
Next event: Dev marks a reopened Bug fixed. Every case passed and every Bug closed → the story's testing is done.
```

### Continue Ticket Flow

```
User: says "continue <KEY>", or asks what is left on a ticket
=>
1. 🔄 Run `gather-context` for the ticket.
2. 🔎 Find each event that happened without its deliverable. Read Jira, TestRail, the ticket folder, and `test-runs/`, never an earlier conversation:
   - no cases with refs <KEY> on TestRail → Assigned Story Flow
   - an answer in the context file that a case it lists lacks → PO Answer Flow
   - every Dev subtask has a Due date, and `plan-qc-subtasks` finds something to write → Dev Dates Flow
   - a `results.md` with refs <KEY> in `test-runs/` that has `untested` blocks or results not pushed to TestRail → resume that run (with `run-test-suite` skill)
   - a build with the story is on a test environment, and cases with refs <KEY> have no passed or failed result → Build Ready Flow
   - a failed result in `test-runs/` without a Bug key → draft its Bugs (with `report-bug` skill)
   - a Bug linked to the story that Dev marked fixed and nobody closed or reopened since → Bug Fix Flow
3. Run those flows in this order. None found: name the event the ticket waits for.
```
