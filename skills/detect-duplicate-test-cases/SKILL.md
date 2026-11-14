---
name: detect-duplicate-test-cases
description: Find duplicate, near-duplicate, overlapping, and low-value manual test cases in TestRail, local `*.test.md` files, or a TestRail CSV export. Identifies exact matches, semantically similar cases, subsets, and cases with little business value. Recommends which cases to keep, merge, or delete. Use when asked to find or clean up duplicate test cases, dedupe a TestRail section, find low-value test cases, or "which test cases can we delete?".
---

# Detect Duplicate Test Cases

Detect duplicate and low-value test cases in TestRail. Recommend cleanup actions.

## Workflow

### 1. Collect Test Cases

- Input, one of:
  - cases downloaded with the `pull` command of the `sync-test-cases-with-testrail` skill
  - local `test-cases/*.test.md` files
  - a TestRail CSV export the user provides
- Parse each case to extract: `C<id>`, section, title, preconditions, steps, expected results, priority, and refs.
- Identify each case by `C<id>` and section. A local case without `testrail_id:` is identified by file and title.

### 2. Analyze Duplicates

Compare cases by what they test: title, steps, expected results, preconditions, refs, and section. Differences in wording, formatting, and test data values (emails, IDs, usernames) do not make two cases different.

Classify each pair into a detection level (defined in `./references/DUPLICATE_INSTRUCTIONS.md`):
- Level 1: exact duplicates.
- Level 2: semantic duplicates.
- Level 3: overlapping / subset tests.
- Level 4: redundant variations.

Build duplicate groups where multiple tests represent the same testing intent.
Each group includes:
- All related tests.
- Detection level.
- Proposed canonical test.

### 3. Find Low-Value Cases

Flag the remaining cases that match the low-value rules in `./references/DUPLICATE_INSTRUCTIONS.md`.
Recommend `Remove`, `Merge`, or `Simplify` for each.

### 4. Generate Report

Follow the report template in `./references/DUPLICATE_INSTRUCTIONS.md`. Include:
- Summary statistics (total scanned, duplicates found by category, low-value cases).
- Each duplicate group with `C<id>`, section, and title of every case.
- Recommendation for each group (`keep`/`merge`/`remove`).
- Low-value cases with the business-value problem of each.

### 5. Execute Actions

**Apply actions only after the user approves the recommendations.**

The script cannot delete TestRail cases. Changes reach TestRail as updates pushed with the `sync-test-cases-with-testrail` skill.
Rewritten cases follow the `qa-write-test-cases` [Test Case Format](../qa-write-test-cases/references/testrail-test-case-format.md) and [Writing Rules](../qa-write-test-cases/references/writing-rule.md).

- Merge: rewrite the canonical case in its `*.test.md` file.
  - With CSV input, first download the affected sections with the `pull` command.
  - Keep the canonical case's `testrail_id:` line.
  - Combine unique preconditions, steps, and expected results from all merged cases.
  - Merge `refs` from all merged cases.
  - Push the file. The push updates the canonical case in place.
  - Add the merged-away cases to the delete list.
- Simplify: rewrite the case to its smallest scenario and push it the same way.
- Remove: add the case to the delete list.
  - A local case without `testrail_id:` is deleted from its file instead.
- Keep: change nothing. State why the cases stay apart (different data, platforms, or coverage).
- Finish with the delete list: `C<id>`, section, title, and the case that replaces it. The user deletes these cases in TestRail or moves them to a "Deprecated" section by hand.

**Do not merge or remove a case whose unique steps or coverage no other case keeps.**
