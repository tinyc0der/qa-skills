---
title: Test Case Markdown Format
description: Markdown format for manual test cases (`*.test.md`) and how the `sync-test-cases-with-testrail` skill maps each part to TestRail.
---

# Test Case Markdown Format

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

A file holds one or more suites, and each suite one or more tests.

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

### 1. Description

- Everything after the test heading until `## Steps` or the next `<!-- test` is the test description, except the examples table.
- Description supports standard markdown.

### 2. Preconditions

- Optional. Write them under a `## Preconditions` heading after the test description and before `## Steps`.
- List each precondition as a bullet point.

### 3. Examples section

- Introduced by `<!-- example -->` (optional content after `-->`).
- Place it after the test description and preconditions, before `## Steps`. A table after the steps also works.
- Must be a markdown table. The table ends at the first line that is not a table row.
- **Table format:** rows must start with `| ` and end with ` |`.
- **Headers:** first row after `<!-- example -->` is header.
- **Separator:** next row must contain `---` (3+ dashes) in each cell to mark headers.
- **Data rows:** rows after the separator are example rows. The steps run once per row, with that row's values in the `${column}` placeholders. Records that must exist together go in preconditions, not in an example table.

### 4. Steps

```markdown
## Steps

1. (Step Action)
   *Expected*: ... (Observable behavior)
2. ...
   *Expected*: ...
```

Numbered (`1.`) and bulleted (`-`) lists both work.

## Mapping to TestRail

| Markdown                                  | TestRail                                   |
| ----------------------------------------- | ------------------------------------------ |
| Suite title and description               | Section name and description               |
| Test title                                | Case title                                 |
| Test description, `## Preconditions`, examples table | Preconditions (table under `Test data:`) |
| `## Steps` action and `*Expected*` lines  | Steps (separated): step and expected result |
| `priority`, `refs`                        | Priority, References                       |

## Example

```markdown
<!-- suite
refs: TRADE-101
platform: Mobile
-->

# LO buy order

- Environment: UAT
- App language: English
- Every test starts on the **Trade** tab

<!-- test
priority: high
smoke: no
automation: yes
-->

# LO buy order accepts only prices from floor to ceiling

HOSE accepts a price only inside the day's band, from the floor to the ceiling price (reference price ± 7%). The price step is 0.10 for prices of 50.00 and above, so the ceiling price + 0.10 and the floor price − 0.10 are the nearest prices outside the band.

## Preconditions

- HOSE is in the continuous matching session
- `${ticker}` is a HOSE stock with a reference price of 60.00 or more
- The account has buying power for 100 shares of `${ticker}` at its ceiling price

<!-- example -->

| price | result |
| --- | --- |
| Ceiling price | Confirmation dialog opens |
| Floor price | Confirmation dialog opens |
| Ceiling price + 0.10 | Error "Price must be between the floor and ceiling price." under **Price** |
| Floor price − 0.10 | Error "Price must be between the floor and ceiling price." under **Price** |

## Steps

1. Open the **Buy** form of `${ticker}`
   *Expected*: Form shows the ceiling and floor prices of `${ticker}`
2. Enter `${price}` in **Price** and 100 in **Quantity** and tap **Place order**
   *Expected*: `${result}`
```
