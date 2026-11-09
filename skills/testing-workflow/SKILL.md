---
name: testing-workflow
description: Orchestrate the manual test case lifecycle from requirements in Jira, Confluence, and Figma to test cases in TestRail. Review requirements, write user stories, catalog features, compare sources, analyze risks, generate test cases and checklists, improve them, find duplicates, check behavior on the live app, and push, list, or pull TestRail cases. Use this skill when you need to manage the whole testing workflow or do one of these tasks. This is the tactical/execution layer triggered by concrete task verbs. For strategic intent ("where do I start", "improve our QA process", "review our quality", "QA maturity review") use the `qa-lead-strategy-advisor` skill instead.
---

# Testing Workflow

Orchestrates the test case lifecycle by routing requests to specialized skills and suggesting next steps.

## Specialized Skills

| Skill                           | Purpose                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `review-user-story`             | Review a user story for gaps and testability; feedback to the PO            |
| `catalog-features`              | Catalog the features of one source                                          |
| `detect-product-mismatches`     | Compare sources with each other and record mismatches                       |
| `qa-thinking`                   | Analyze a feature as QA: edge cases, negative flows, abuses, risk scenarios |
| `qa-write-test-cases`           | Generate new test cases and checklists from requirements                    |
| `improve-test-cases`            | Improve existing test cases quality                                         |
| `detect-duplicate-test-cases`   | Find duplicate, near-duplicate, and overlapping test cases                  |
| `sync-test-cases-with-testrail` | Push test cases to TestRail, list existing cases, pull them into files      |
| `report-bug`                    | Create a Jira Bug from a failed case or a live app defect                   |
| `agent-browser`                 | Check behavior on the live app in a browser                                 |

## Routing

- Match the request to a flow below. Delegate to that flow's skill, then suggest its next actions.
- Flows are examples, not exhaustive. Combine or extend them when a request spans several tasks.
- When suggesting next steps, take into account the flows, context, user request, and results of previous steps.
- **Review a user story** (gaps, testability, feedback to the PO) → route to the `review-user-story` skill.
- **Catalog features of a source** (a Jira project, a Confluence space, a Figma file, a TestRail suite, the live app) → route to the `catalog-features` skill.
- **Compare sources** (Jira, Confluence, Figma, TestRail, the live app: not implemented, differs, unspecified, undocumented) → route to the `detect-product-mismatches` skill.
- **Report a bug** (a failed case, a defect in the live app, a screenshot of an error) → route to the `report-bug` skill.
- **Behavior questions** ("what happens when…", "can a user…", "is X supported") → check on the live app with the `agent-browser` skill, then continue with the flow the answer points to.
- **Strategic intent** ("where do I start", "improve our QA process", "QA maturity review") → route to the `qa-lead-strategy-advisor` skill instead. It owns the high-level roadmap and delegates execution back here.

## Basic Flows

### Test Generation Flow

```
User: asks to generate/create test cases/checklist
=>
Use `qa-write-test-cases` skill to proceed with test case, checklist generation
=>
After generation fully completed, suggest next actions:
1. ⬆️ Push the new test cases to TestRail (with `sync-test-cases-with-testrail` skill)
2. 🧹 Check for duplicate/overlapping cases (with `detect-duplicate-test-cases` skill)
3. 🎭 Generate specific test cases using `qa-write-test-cases` skill and role name
```

### QA Analysis Flow

```
User: asks "what could go wrong?", "what am I missing?", or "review this as QA"
=>
Use `qa-thinking` skill to surface edge cases, negative flows, abuses and risk scenarios
=>
After analysis fully completed, suggest next actions:
1. 📝 Generate test cases from the scenarios (with `qa-write-test-cases` skill)
```

### Test Case Improvement Flow

```
User: asks for test cases improvement, improve quality, make test cases better
=>
Use `improve-test-cases` skill to proceed with test case improvement
=>
After improvement step fully completed, suggest next actions:
1. ⬆️ Push the updated test cases to TestRail (with `sync-test-cases-with-testrail` skill)
2. 🧹 Check for duplicate/overlapping cases (with `detect-duplicate-test-cases` skill)
```

### Duplicate Detection Flow

```
User: asks to find duplicates, overlapping or redundant test cases
=>
Use `detect-duplicate-test-cases` skill to identify exact, near-duplicate and subset cases
=>
After detection fully completed, suggest next actions:
1. ✏️ Improve/merge the surviving test cases (with `improve-test-cases` skill)
2. ⬆️ Push the cleaned-up suite to TestRail (with `sync-test-cases-with-testrail` skill)
```

### Sync with TestRail Flow

```
User: asks to push test cases to TestRail, list existing TestRail cases, or pull them into files
=>
Use `sync-test-cases-with-testrail` skill with its `push`, `list`, or `pull` command
=>
After the sync fully completed, suggest next actions:
1. ✏️ Improve the pulled test cases (with `improve-test-cases` skill)
2. 🧹 Check the pulled suite for duplicates (with `detect-duplicate-test-cases` skill)
3. 📝 Generate test cases for features that have none in TestRail (with `qa-write-test-cases` skill)
```
