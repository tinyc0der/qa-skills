---
name: detect-duplicate-test-cases
description: Find duplicate, near-duplicate, and overlapping manual test cases in TestRail or local `*.test.md` files. Identifies exact matches, semantically similar cases, subsets, and variations that differ only in data. Recommends which cases to keep, merge, or remove. Use when asked to find or clean up duplicate test cases or dedupe a TestRail section. Not for pruning cases that duplicate nothing.
---

# Detect Duplicate Test Cases

Detect duplicate test cases in TestRail. Recommend cleanup actions.

## Workflow

### 1. Collect Test Cases

- Input, one of:
  - cases downloaded with the `pull` command of the `sync-test-cases-with-testrail` skill
  - local `*.test.md` files
- Parse each case to extract: `C<id>`, section, title, platform, preconditions, steps, expected results, priority, and refs.
- Identify each case by `C<id>` and section. A local case without `testrail_id:` is identified by file and title.

### 2. Analyze Duplicates

Compare cases by what they test: title, steps, expected results, preconditions, refs, and section. Differences in wording, formatting, and test data values that reach the same rule and expected result do not make two cases different. A different platform does.

Classify each pair into a detection level (defined in [Duplicate Detection](./references/duplicate-detection.md)):
- Level 1: exact duplicates.
- Level 2: semantic duplicates.
- Level 3: overlapping / subset tests.
- Level 4: redundant variations.

Build duplicate groups where multiple tests represent the same testing intent.
Each group includes:
- All related tests.
- Detection level.
- Proposed canonical test.

### 3. Generate Report

Follow the report template in [Duplicate Detection](./references/duplicate-detection.md). Include:
- Summary statistics (total scanned, duplicates found by category).
- Each duplicate group with `C<id>`, section, and title of every case.
- Recommendation for each group (`keep`/`merge`/`remove`).

### 4. Execute Actions

**Apply actions only after the user approves the recommendations.**

The script cannot delete TestRail cases. Changes reach TestRail as updates pushed with the `sync-test-cases-with-testrail` skill.
Rewritten cases follow the `qa-write-test-cases` [Test Case Format](../qa-write-test-cases/references/testrail-test-case-format.md) and [Writing Rules](../qa-write-test-cases/references/writing-rule.md).

- Merge: rewrite the canonical case in its `*.test.md` file.
  - Keep the canonical case's `testrail_id:` line.
  - Combine unique preconditions, steps, and expected results from all merged cases.
  - Merge `refs` from all merged cases.
  - Redundant variations (Level 4): each merged case's data becomes a row of the canonical case's examples table.
  - Push the file. The push updates the canonical case in place.
  - Add the merged-away cases to the delete list.
- Remove: add the case to the delete list.
  - A local case without `testrail_id:` is deleted from its file instead.
- Keep: change nothing. State why the cases stay apart (different platforms, data that reaches a different rule or expected result, or other coverage).
- Finish with the delete list: `C<id>`, section, title, and the case that replaces it. The user deletes these cases in TestRail or moves them to a "Deprecated" section by hand.

**Do not merge or remove a case whose unique steps or coverage no other case keeps.**
