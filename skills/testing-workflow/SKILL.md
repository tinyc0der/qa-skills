---
name: testing-workflow
description: Route manual QA work across the QA skills, from requirements in Jira, Confluence, and Figma to test cases and test runs in TestRail, and suggest the next step. Use when the user asks to manage the whole testing workflow, a request spans several QA skills, or the user asks what to do next. A request for a single task goes to that task's skill. For strategic intent ("where do I start", "improve our QA process", "review our quality", "QA maturity review") use the `qa-lead-strategy-advisor` skill instead.
---

# Testing Workflow

Orchestrates the test case lifecycle by routing requests to specialized skills and suggesting next steps.

## Specialized Skills

| Skill                           | Purpose                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `gather-context`                | Collect a ticket's sources, conflicts, and open questions into a context file |
| `review-user-story`             | Review a user story for gaps and testability; feedback to the PO            |
| `catalog-features`              | Catalog the features of one source                                          |
| `detect-product-mismatches`     | Compare sources with each other and record mismatches                       |
| `qa-thinking`                   | Analyze a feature as QA: edge cases, negative flows, abuses, risk scenarios |
| `qa-write-test-cases`           | Generate new test cases and checklists from requirements                    |
| `improve-test-cases`            | Improve existing test cases quality                                         |
| `detect-duplicate-test-cases`   | Find duplicate, near-duplicate, and overlapping test cases                  |
| `sync-test-cases-with-testrail` | Push test cases to TestRail, list existing cases, pull them into files      |
| `run-test-suite`                | Run test cases on the live app and push the results to a TestRail run       |
| `report-bug`                    | Create a Jira Bug from a failed case or a live app defect                   |
| `plan-qc-subtasks`              | Create the QC's subtasks in Jira, estimate story points, and set dates      |
| `agent-browser`                 | Check behavior on the live app in a browser                                 |

## Routing

- Match the request to a flow below. Delegate to that flow's skill, then suggest its next actions.
- Flows are examples, not exhaustive. Combine or extend them when a request spans several tasks.
- When suggesting next steps, take into account the flows, context, user request, and results of previous steps. Suggest the one next step that fits.
- Stop and write to the QC as the [`message-the-qc`](../message-the-qc/SKILL.md) skill says.
- **Assigned ticket** (a ticket to test from start to finish) → follow the Assigned Ticket Flow.
- **Gather context** (what is known about a ticket, its sources, its open questions) → route to the `gather-context` skill.
- **Review a user story** (gaps, testability, feedback to the PO) → route to the `review-user-story` skill.
- **Catalog features of a source** (a Jira project, a Confluence space, a TestRail suite, the live app) → route to the `catalog-features` skill.
- **Compare sources** (Jira, Confluence, Figma, TestRail, the live app: not implemented, differs, unspecified, undocumented) → route to the `detect-product-mismatches` skill.
- **Run test cases** (a suite, a ticket's cases, regression, smoke, a TestRail run) → route to the `run-test-suite` skill.
- **Report a bug** (a failed case, a defect in the live app, a screenshot of an error) → route to the `report-bug` skill.
- **Plan QC work in Jira** (stories to test, QC subtasks, their story points or dates) → route to the `plan-qc-subtasks` skill.
- **Behavior questions** ("what happens when…", "can a user…", "is X supported") → check on the live app with the `agent-browser` skill, then continue with the flow the answer points to.
- **Strategic intent** ("where do I start", "improve our QA process", "QA maturity review") → route to the `qa-lead-strategy-advisor` skill instead. It owns the high-level roadmap and delegates execution back here.

## Basic Flows

### Assigned Ticket Flow

Run the steps back to back. Stop only where a step needs the QC, and put every question pending at that point in one message.

```
User: is assigned a ticket, or asks to test one from start to finish
=>
1. 🔎 Draft the review of the story (with `review-user-story` skill). It runs `gather-context` first; later steps reuse the context file. Add `qa-thinking` when the user wants risk scenarios. Do not stop for the post question.
2. 📝 Draft the checklist (with `qa-write-test-cases` skill). Unanswered points become `ask` items; do not wait for the PO. Add the open questions the checklist raised to the review draft.
3. 🗂 Plan the story's QC subtask (with `plan-qc-subtasks` skill): steps 1 and 2 only, no message of its own. A plan that writes nothing stays out of Stop 1.
   ⏸ Stop 1: one message with the review, then the checklist, then the QC subtask plan, then one question for all:
      ❓ Post the review and write the cases?
      1. ✅ Post the review, write the QC subtask, write the cases, and push them to TestRail
      2. 📝 Post the review, write the QC subtask, and write the cases, no push
      3. ✏️ Type changes to the review, the checklist, or the QC subtask plan
4. 💬 Do only what the answer approved: post the review, write the QC subtask plan (with `plan-qc-subtasks` skill, from its step 4), write the cases, push them (with `qa-write-test-cases` skill). A typed change approves nothing else.
   ⏸ Stop 2: report the cases, and ask the QC to say when the build is ready.
5. 💬 Each later request on the ticket → re-run `gather-context` first. PO replies in the story's comments update the `ask` test cases, which then get pushed.
6. ▶️ Build ready → run the cases (with `run-test-suite` skill). Its one question, when it needs one, comes before the first case.
7. 🐞 The run's report carries the Bug drafts for its failed cases: one answer creates them all. Fix the cases marked "case needs fix" (with `improve-test-cases` skill).
```

### Test Generation Flow

```
User: asks to generate/create test cases/checklist
=>
Use `qa-write-test-cases` skill to proceed with test case, checklist generation
=>
After generation fully completed, pick the next step from:
1. ⬆️ Push the new test cases to TestRail, when the checklist gate did not (with `sync-test-cases-with-testrail` skill)
2. 🧹 Check for duplicate/overlapping cases (with `detect-duplicate-test-cases` skill)
3. 🎭 Generate specific test cases using `qa-write-test-cases` skill and role name
```

### QA Analysis Flow

```
User: asks "what could go wrong?", "what am I missing?", or "review this as QA"
=>
Use `qa-thinking` skill to surface edge cases, negative flows, abuses and risk scenarios
=>
After analysis fully completed, pick the next step from:
1. 📝 Generate test cases from the scenarios (with `qa-write-test-cases` skill)
```

### Test Case Improvement Flow

```
User: asks for test cases improvement, improve quality, make test cases better
=>
Use `improve-test-cases` skill to proceed with test case improvement
=>
After improvement step fully completed, pick the next step from:
1. ⬆️ Push the updated test cases to TestRail (with `sync-test-cases-with-testrail` skill)
2. 🧹 Check for duplicate/overlapping cases (with `detect-duplicate-test-cases` skill)
```

### Test Run Flow

```
User: asks to run test cases, a suite, regression, smoke, or a TestRail run
=>
Use `run-test-suite` skill to run the cases on the live app and push the results to TestRail
=>
After the run fully completed, pick the next step from:
1. 🐞 Answer the Bug drafts the run's report carries (with `report-bug` skill)
2. ✏️ Fix the cases marked "case needs fix" (with `improve-test-cases` skill)
```

### Duplicate Detection Flow

```
User: asks to find duplicates, overlapping or redundant test cases
=>
Use `detect-duplicate-test-cases` skill to identify exact, near-duplicate and subset cases
=>
After detection fully completed, pick the next step from:
1. ✏️ Improve/merge the surviving test cases (with `improve-test-cases` skill)
2. ⬆️ Push the cleaned-up suite to TestRail (with `sync-test-cases-with-testrail` skill)
```

### Sync with TestRail Flow

```
User: asks to push test cases to TestRail, list existing TestRail cases, or pull them into files
=>
Use `sync-test-cases-with-testrail` skill with its `push`, `list`, or `pull` command
=>
After the sync fully completed, pick the next step from:
1. ✏️ Improve the pulled test cases (with `improve-test-cases` skill)
2. 🧹 Check the pulled suite for duplicates (with `detect-duplicate-test-cases` skill)
3. 📝 Generate test cases for features that have none in TestRail (with `qa-write-test-cases` skill)
```
