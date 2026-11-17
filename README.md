# QA Skills for Vietcap Manual QC

AI agent skills for manual QC engineers at Vietcap Securities, who test Vietcap's web and mobile apps from Jira, Confluence, Figma, TestRail, and the running app, with no access to the product codebase. Forked from [testomatio/skills](https://github.com/testomatio/skills) by Testomat.io (MIT license).

## Install

```bash
npx skills add tinyc0der/qa-skills
```

To update installed skills:

```bash
npx skills update
```

Other ways to install (Claude Code plugin, Codex, Cursor): see [install details](./docs/install-details.md).

## Setup

| Source     | Used for                                     | Connect                                                                                              |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Jira       | Epics, stories, acceptance criteria, bugs    | Atlassian MCP server                                                                                 |
| Confluence | Specs and requirements                       | Atlassian MCP server (same connection as Jira)                                                       |
| Figma      | Screens, states, copy                        | Figma MCP server                                                                                     |
| TestRail   | Test cases                                   | `.env` with the variables listed in [`sync-test-cases-with-testrail`](./skills/sync-test-cases-with-testrail/SKILL.md) |
| Live app   | Exploring and checking actual behavior       | A staging URL and [agent-browser](https://github.com/vercel-labs/agent-browser): `npm i -g agent-browser && agent-browser install`, then `npx skills add vercel-labs/agent-browser` |
| Mobile app | Running cases on Android and iOS             | A device, emulator, or simulator and [agent-device](https://github.com/callstack/agent-device): `npm i -g agent-device` |

Each QC keeps their own QA workspace, with no shared repo: one folder per ticket under `tickets/` (context file and test cases), test run results (`test-runs/`), automation lessons (`automation-lessons/`), domain rules (`domain/`), and `.env`. TestRail holds the cases every QC shares, and Jira holds the decisions. `automation-lessons/` holds one file per app and platform with the deep links, waits, and session tips that make the next run faster. `domain/` keeps the rules that apply beyond one ticket, such as session times, fees, and order rules, each with its source and who confirmed it. See [Ticket Folder](./skills/gather-context/references/ticket-folder.md).

## Skills

### Requirements

| Skill                       | Description                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `gather-context`            | Collect what every source says about a ticket or feature into a context file: sources, conflicts, open questions |
| `review-user-story`         | Review a Jira user story and draft feedback for the PO: gaps and open questions                  |
| `save-domain-knowledge`     | Save a rule the PO or a source confirmed that holds beyond one ticket to `domain/`, so later tickets reuse it |

### Test cases

| Skill                           | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `qa-write-test-cases`           | Generate TestRail test cases and checklists from Jira, Confluence, Figma, or the live app |
| `improve-test-cases`            | Improve existing test cases for clarity and format                                  |
| `detect-duplicate-test-cases`   | Find duplicate and overlapping test cases                                           |
| `sync-test-cases-with-testrail` | Push test cases to TestRail, pull existing cases, list sections, and push run results |
| `run-test-suite`                | Run test cases on the live app, record results with evidence, and push them to a TestRail run |

### Bugs

| Skill        | Description                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `report-bug` | Create a reproducible Jira Bug from a failed TestRail case or a live app defect, linked to its story |
| `verify-bug` | Retest a Bug Dev marked fixed on a build that carries the fix, then close or reopen it with evidence |

### QA process

| Skill                      | Description                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `testing-workflow`         | Run the workflow for what just happened on a ticket, or continue a ticket where it stands     |
| `plan-qc-subtasks`         | Create your QC subtasks in Jira, estimate their story points, and set their dates from Dev's   |
| `message-the-qc`           | When the skills stop to ask you, and how every message to you is laid out                     |

## Typical flow

A ticket spans several conversations, since it waits for the PO, a build, and Bug fixes. Tell `testing-workflow` what happened (you were assigned a story, a build is ready, Dev fixed a bug) and it runs that workflow, or say "continue <KEY>" and it finds where the ticket stands from Jira, TestRail, and the ticket folder.

1. Review the Jira story with `review-user-story` and send the feedback to the PO yourself. It starts with `gather-context`, which saves the ticket's sources, conflicts, and open questions to a context file that later steps reuse.
2. Generate cases with `qa-write-test-cases`. Each case links its Jira key in `refs`. Approve the checklist with "Write and push" and the cases go to TestRail without another question. Through `testing-workflow`, the same answer creates your QC subtask with `plan-qc-subtasks`. Open questions left in the context file show up again in the next `review-user-story`.
3. Run the cases on the live app with `run-test-suite`. Its one question, when it needs one, comes before the first case; the results go to a TestRail run without another.
4. File Jira Bugs for the failed cases with `report-bug`, approving them all in one answer.
5. When Dev fixes a Bug, retest it with `verify-bug`. It checks the build carries the fix, reruns the Bug's steps, its failed cases, and the flows around them, and one answer closes or reopens every Bug it retested.
6. Later, pull cases back and run `improve-test-cases` or `detect-duplicate-test-cases`.

Skills stop only for input only you have and for writes others see that cannot be undone, and ask everything pending in one message. See the [`message-the-qc`](./skills/message-the-qc/SKILL.md) skill.

## Claude Code plugins

Skills are also bundled as Claude Code plugins in this repo's marketplace:

| Plugin            | Bundled skills                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `requirements`    | `gather-context`, `review-user-story`, `save-domain-knowledge`, `message-the-qc` |
| `test-management` | `gather-context`, `qa-write-test-cases`, `improve-test-cases`, `detect-duplicate-test-cases`, `sync-test-cases-with-testrail`, `run-test-suite`, `report-bug`, `verify-bug`, `review-user-story`, `save-domain-knowledge`, `message-the-qc` |
| `qa-process`      | `testing-workflow`, `plan-qc-subtasks`, `gather-context`, `save-domain-knowledge`, `message-the-qc` |

## Repository structure

- `skills/` holds each skill (the canonical source).
- `plugins/<plugin>/skills/` holds symlinks into `skills/`.
- `tests/` holds the script tests and the skill reference check.

## Maintaining the fork

`tests/skill-refs.test.mjs` lists the upstream skills this fork removed. Run `npm test` after every merge from upstream. It fails when a merge brings back a removed skill or a reference to one, or leaves a broken plugin link.
