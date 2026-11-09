---
name: improve-test-cases
description: Analyze and improve existing manual test cases (`*.test.md` in TestRail format, or cases pulled from TestRail) for clarity, structure, and format compliance, then push the fixes back to TestRail. Use when the user asks to improve, clean up, review, standardize, or rewrite existing test cases or a TestRail section.
---

# Improve Test Cases

Analyze and improve existing manual test cases to make them clearer for the QA team:
- Improve test titles for clarity.
- Enhance test descriptions.
- Fix broken formatting and markdown syntax.
- Standardize test structure to the TestRail test case format.
- Ensure consistent terminology and language.

The target format and rules are owned by the `qa-write-test-cases` skill:
- [Test Case Format](../qa-write-test-cases/references/testrail-test-case-format.md)
- [Writing Rules](../qa-write-test-cases/references/writing-rule.md)

**DO NOT CHANGE:**
- `testrail_id:` and `testrail_section_id:` lines.
- Original test intent.
- Original language (fix only clarity, grammar, typos).

## Step 1: Get Test Cases

- Use the local `test-cases/*.test.md` files the user points at.
- Otherwise download the cases with the `pull` command of the `sync-test-cases-with-testrail` skill.

## Step 2: Analyze Test Quality

Read each test and flag every place it breaks the format or the writing rules. Also flag:

Steps and expected results:
- Missing expected results.
- Unclear actions.
- Steps not ordered logically.
- Expected results not relevant to the steps.
- Missing pass/fail criteria.

Formatting:
- Broken markdown syntax.
- Missing sections.
- Inconsistent header hierarchy.

Ambiguity:
- Generic or subjective terms ("should work", "might fail").
- Vague language that could be interpreted multiple ways.
- Steps that cannot be verified objectively.
- Missing specific values, data, or conditions.

## Step 3: Show Summary to User

- List issues found per test.
- Give specific recommendations for improvements.
- **Ask the user to confirm before proceeding.**
- If the user does not confirm, do not change anything.

## Step 4: Improve Tests

- Rewrite each flagged test to the format and writing rules.
- Include context from the parent suite in a description when relevant.
- Keep `priority:` and `refs:` values.

## Step 5: Save and Push

- Overwrite the original files.
- Keep the same file names and directory structure.
- Push the changed files with the `sync-test-cases-with-testrail` skill. Its dry-run and confirmation step apply.

## Step 6: Show Final Summary

- Number of files modified.
- Number of tests improved.
- Key improvements made.
