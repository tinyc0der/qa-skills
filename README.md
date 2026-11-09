# QA Skills for Manual QC

AI agent skills for manual QC engineers who work from Jira, Confluence, Figma, TestRail, and the running app, with no access to the product codebase. Forked from [testomatio/skills](https://github.com/testomatio/skills).

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
| Confluence | Specs, requirements, user docs               | Atlassian MCP server (same connection as Jira)                                                       |
| Figma      | Screens, states, copy                        | Figma MCP server                                                                                     |
| TestRail   | Test cases                                   | `.env` with the variables listed in [`sync-test-cases-with-testrail`](./skills/sync-test-cases-with-testrail/SKILL.md) |
| Live app   | Exploring and checking actual behavior       | A staging URL and [agent-browser](https://github.com/vercel-labs/agent-browser): `npm i -g agent-browser && agent-browser install`, then `npx skills add vercel-labs/agent-browser` |

Keep test cases (`test-cases/`) and `.env` in one shared QA workspace repo.

## Skills

### Requirements

| Skill                       | Description                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `review-user-story`         | Review a Jira user story and draft feedback for the PO: gaps, risks, acceptance criteria         |
| `qa-thinking`               | Analyze a ticket, requirement, or design from a QA perspective: edge cases, negative flows, abuse |
| `catalog-features`          | Catalog the features of one source (Jira, Confluence, TestRail, or the live app) as key, title, and link |
| `detect-product-mismatches` | Compare the live app, Jira, Confluence, Figma, and TestRail: what is missing, differs, or is undocumented |

### Test cases

| Skill                           | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `qa-write-test-cases`           | Generate TestRail test cases and checklists from Jira, Confluence, Figma, or the live app |
| `improve-test-cases`            | Improve existing test cases for clarity and format                                  |
| `detect-duplicate-test-cases`   | Find duplicate, overlapping, and low-value test cases                               |
| `sync-test-cases-with-testrail` | Push test cases to TestRail, pull existing cases, and list sections                 |

### QA process

| Skill                      | Description                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `testing-workflow`         | Orchestrate the test case lifecycle: requirements review, generation, improvement, TestRail sync |
| `qa-lead-strategy-advisor` | Interview the team, assess QA maturity, and deliver a prioritized roadmap                     |

## Typical flow

1. Review the Jira story with `qa-thinking` or `review-user-story`.
2. Generate cases with `qa-write-test-cases`. Each case links its Jira key in `refs`.
3. Push to TestRail with `sync-test-cases-with-testrail` after a dry run.
4. Later, pull cases back and run `improve-test-cases` or `detect-duplicate-test-cases`.

## Claude Code plugins

Skills are also bundled as Claude Code plugins in this repo's marketplace:

| Plugin            | Bundled skills                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `requirements`    | `review-user-story`, `qa-thinking`, `catalog-features`, `detect-product-mismatches`   |
| `test-management` | `qa-write-test-cases`, `improve-test-cases`, `detect-duplicate-test-cases`, `sync-test-cases-with-testrail`, `review-user-story`, `qa-thinking` |
| `qa-process`      | `testing-workflow`, `qa-lead-strategy-advisor`, `qa-thinking`                                                     |

## Repository structure

- `skills/` holds each skill (the canonical source).
- `plugins/<plugin>/skills/` holds symlinks into `skills/`.
- `tests/` holds the TestRail script tests and the skill reference check.

## Maintaining the fork

`tests/skill-refs.test.mjs` lists the upstream skills this fork removed. Run `npm test` after every merge from upstream. It fails when a merge brings back a removed skill or a reference to one, or leaves a broken plugin link.
