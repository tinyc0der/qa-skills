---
title: Test Case Markdown Format
description: Markdown format for manual test cases (`*.test.md`) and how the `sync-test-cases-with-testrail` skill maps each part to TestRail.
---

# Test Case Markdown Format

## Format Overview

The document is structured as:

1. **Suite block** — one or more per file, with suite metadata, title, and description
2. **Test blocks** — one or more per suite, each with test metadata, title, description, preconditions, test data table, and steps

## Document Structure

```
<!-- suite
key: value
-->
# Suite Title

Suite description (optional)

<!-- test
key: value
-->
# Test Title

Test description (optional)

<!-- example -->

| Param1 | Param2 |
| --- | --- |
| value1 | value2 |
```

## Suite Metadata

Metadata is inside an HTML comment block: `<!-- suite ... -->`.

| Field                 | Type   | Description                                                                                       |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `testrail_section_id` | number | TestRail section ID. Written by the `sync-test-cases-with-testrail` push. Never write it by hand. |
| `priority`            | string | Default priority for the suite's tests.                                                           |
| `refs`                | string | Comma-separated references, e.g. ticket keys (`JIR-123, JIR-124`). Default for the suite's tests. |
| `platform`, `smoke`, `automation`, other mapped keys | string | Defaults for the suite's tests. See Test Metadata. |

## Test Metadata

Metadata is inside an HTML comment block: `<!-- test ... -->`.

| Field         | Type   | Description                                                                                                  |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `testrail_id` | string | TestRail case ID (e.g. `C123`). Written by the `sync-test-cases-with-testrail` push. Never write it by hand. |
| `priority`    | string | TestRail priority name. Default values, lowest to highest: `low`, `medium`, `high`, `critical`.               |
| `refs`        | string | Comma-separated references. Overrides the suite's `refs`.                                                    |
| `smoke`       | yes/no | The test belongs to the smoke set.                                                                           |
| `automation`  | yes/no | The test is a candidate for automation.                                                                      |
| `platform`    | string | Option name of the project's platform field, e.g. `Mobile`, `Web`, `All`.                                     |

If a test leaves out a key, the suite's value is used.

`smoke`, `automation`, `platform`, and any other key reach TestRail only when `TESTRAIL_FIELDS` maps them to case fields (see the `sync-test-cases-with-testrail` Setup). A dropdown takes the option name; a checkbox takes `yes` or `no`.

## Formatting Rules

### 1. Suite and test blocks

- Suite block starts with `<!-- suite`.
- Test blocks start with `<!-- test`.
- Each test block is separated by `<!-- test`.

### 2. Metadata blocks

- Metadata must be inside HTML comments: `<!-- suite ... -->` and `<!-- test ... -->`.
- Each line is `key: value`; lines without `:` are ignored.
- Keys and values are trimmed of surrounding whitespace.

### 3. Headings

- **Suite title:** first `#` heading after the suite metadata block.
- **Test title:** first `#` or `##` heading after each test metadata block.
- Only these headings are used for titles; other headings are part of the description.

### 4. Description

- Everything after the test heading until `## Steps` or the next `<!-- test` is the test description, except the examples table.
- Description supports standard markdown.

### 5. Preconditions

- Optional. Write them under a `## Preconditions` heading after the test description and before `## Steps`.
- List each precondition as a bullet point.

### 6. Examples section

- Introduced by `<!-- example -->` (optional content after `-->`).
- Place it after the test description and preconditions, before `## Steps`. A table after the steps also works.
- Must be a markdown table. The table ends at the first line that is not a table row.
- **Table format:** rows must start with `| ` and end with ` |`.
- **Headers:** first row after `<!-- example -->` is header.
- **Separator:** next row must contain `---` (3+ dashes) in each cell to mark headers.
- **Data rows:** rows after the separator are example rows.

### 7. Steps

Test steps use the `## Steps` header section with a nested markdown list format:

```markdown
## Steps

- (Step Action)
  *Expected*: ... (Observable behavior)
- ...
  *Expected*: ...
```

**Step format rules:**

- Steps must be under a `## Steps` heading
- Use nested markdown lists (bulleted `*` or numbered `1.`)
- Top-level items describe the action to perform
- Nested items with `*Expected*` (or `*Expected*:`, `*Expected result*`) describe the observable behavior
- Expected results should be specific and verifiable

## Mapping to TestRail

| Markdown                                  | TestRail                                   |
| ----------------------------------------- | ------------------------------------------ |
| Suite title and description               | Section name and description               |
| Test title                                | Case title                                 |
| Test description, `## Preconditions`, examples table | Preconditions (table under `Test data:`) |
| `## Steps` action and `*Expected*` lines  | Steps (separated): step and expected result |
| `priority`, `refs`                        | Priority, References                       |

## Examples

### Minimal suite with one test

```markdown
<!-- suite
-->

# Login Suite

Tests for login functionality.

<!-- test
-->

# Successful Login

User can log in with valid credentials.
```

### Full suite with metadata and examples

```markdown
<!-- suite
refs: JIR-123
-->

# Login Functionality

This suite contains manual tests for the login process.

<!-- test
priority: high
-->

# User can log in with valid credentials

A user should be able to log in with valid credentials.

## Preconditions

- The accounts from the test data table exist and are active
- User is logged out

<!-- example -->

| Username | Password | Role  |
| -------- | -------- | ----- |
| admin    | admin123 | admin |
| user     | user123  | user  |

## Steps

- Navigate to `/auth/login`
  *Expected*: Login form shows username and password fields
- Enter the username and password from the test data table and click **Login**
  *Expected*: Dashboard opens
```

### Test with numbered steps and a code block

````markdown
<!-- suite
-->

# API Testing

Tests for REST API endpoints.

<!-- test
priority: critical
-->

# Client can create a user via API

Verify that a new user can be created via POST request.

## Steps

1. Send POST request to `/api/users`
   ```json
   { "email": "jane@example.com", "name": "Jane" }
   ```
   *Expected*: Response status code is 201
   *Expected*: Response includes `id` and `createdAt` fields
2. Send GET request to `/api/users/{id}` with the returned `id`
   *Expected*: User data matches the data sent in POST request
````

### Multiple suites in one file

```markdown
<!-- suite
-->

# Suite One

Description for suite one

<!-- test
-->

# Test One

Description

<!-- suite
-->

# Suite Two

Description for suite two
```
