---
title: Bug Report Format
description: Markdown format for a Jira Bug draft (title, fields, description) and how each part maps to Jira.
---

# Bug Report Format

## Format Overview

The draft is structured as:

1. **Title**: one `#` heading
2. **Fields**: Jira fields other than the description
3. **Description**: environment, steps to reproduce, expected and actual results, evidence

## Document Structure

```markdown
# [<Platform>] <Feature> - <Symptom>

## Fields

| Field    | Value |
| -------- | ----- |
| Priority |       |
| Assignee |       |
| Sprint   |       |

## Description

### Environment

- Environment: <dev / QA / staging / UAT / production, or its URL>
- Build: <version>
- Device / OS / browser:

### Steps to reproduce

1. <action with its data>
2. ...

### Expected result

- Step <n>: <correct behavior at the failing step>

### Actual result

- Step <n>: <what was observed at the same step>

### Evidence

Screenshots and recordings attached below.
```

## Fields

| Field                  | Value                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Priority               | Urgency to fix                                                                                                                              |
| Severity               | Impact; only when the project has the field                                                                                                 |
| Assignee               | The story's current assignee, or the user's choice. Unassigned story, deactivated account, or a user Jira rejects → empty, with the reason. Never chosen by role or module |
| Sprint                 | The story's sprint, or the user's choice. Story with a verified empty sprint → empty                                                        |
| Labels                 | Project conventions                                                                                                                         |
| Root cause and similar | Only when the user names it or the cause is confirmed. Never inferred from the symptom                                                     |
| Other required fields  | Allowed values from the project's create metadata                                                                                           |

Leave out rows without a value.

## Formatting Rules

### 1. Title

| Found on              | Title                                       |
| --------------------- | ------------------------------------------- |
| Dev, QA, staging, UAT | `[<Platform>] <Feature> - <Symptom>`        |
| Production            | `[PROD - <Platform>] <Feature> - <Symptom>` |

- The platform is where the bug was reproduced, such as `Web`, `iOS`, `Android`, or `API`. Use the names the project's Bugs already use. Never pick it from a guessed cause.
- A title names one defect on one platform. A defect reproduced on several platforms → one Bug per platform, each with its own steps, environment, and evidence. Never `All`.
- The symptom says what is wrong, specific enough to understand from the title alone.
- An existing Bug keeps its title when reopened or updated.

### 2. Description

- Only the sections in the structure above, in that order.
- Environment and Build are required. Add the network only when the defect depends on it.
- `Evidence` is the one line above when files are attached or handed to the user to attach. Never list or describe the files. Otherwise → no section.

### 3. Steps to reproduce

- A numbered list, one action per item, with no `*Expected*` lines.
- No preconditions section. The setup the defect depends on is the first steps.
- End at the last failing step.

### 4. Expected and actual results

- One line per failing step in each section, starting `Step <n>:`, in the same order, so both sections have the same number of lines.
- Each line leads with the point that differs.
- On an Actual line, after `;`: what was seen at that step and helps locate the defect, such as the related request, still wrong after reload, or another path that works.

## Mapping to Jira

| Draft                     | Jira                                           |
| ------------------------- | ---------------------------------------------- |
| `#` title                 | Summary                                        |
| `## Fields` rows          | Issue fields, keys from the create metadata    |
| `## Description` sections | Description                                    |
| Evidence files            | Attachments                                    |

## Bug from a failed test case

| Test case and result                               | Bug                       |
| -------------------------------------------------- | ------------------------- |
| Preconditions, then steps, with the run's values   | Steps to reproduce        |
| Expected line of the failing step                  | Expected result line      |
| Result of the failing step                         | Actual result line        |
| Result version                                     | Build                     |
| Screenshots of the failing steps                   | Attachments               |

- One test case is the source. Other failed cases with the same cause only get the Bug key in their Defects.
- Add nothing the case or result does not show.
- Step numbers are the Bug's, not the case's, since the preconditions became the first steps.
- A failing step that belongs to another defect goes to its own Bug.

## Example

```markdown
# [Web] Place order - Fee charged on ordered quantity instead of filled quantity

## Fields

| Field    | Value                                 |
| -------- | ------------------------------------- |
| Priority | Critical                              |
| Assignee | Jane Doe (`5b10ac8d82e05b22cc7d4ef5`) |
| Sprint   | Sprint 42 (`137`)                     |

## Description

### Environment

- Environment: staging
- Build: 2.14.0 (1523)
- Browser: Chrome 131 on macOS 15

### Steps to reproduce

1. Log in as an account with 100,000,000 cash
2. Open the *Place order* page
3. Place a buy order for 1,000 XYZ at 10,000
4. Wait until 600 shares are filled
5. Open the *Order book* page

### Expected result

- Step 5: Fee is 6,000 for the 600 filled shares

### Actual result

- Step 5: Fee is 10,000 for the 1,000 ordered shares; same after reload

### Evidence

Screenshots and recordings attached below.
```
