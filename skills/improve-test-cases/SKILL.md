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
- The natural language the tests are written in.

**When to skip steps:**

- The QC names the cases or the change (a run's "case needs fix", one wrong step) → change only those. Step 5's dry run and push question still apply.

## Step 1: Get Test Cases

- Use the local `*.test.md` files the user points at.
- Otherwise download the cases with the `pull` command of the `sync-test-cases-with-testrail` skill, into the ticket's folder ([Ticket Folder](../gather-context/references/ticket-folder.md)).

## Step 2: Analyze Test Quality

Run `check` of the `sync-test-cases-with-testrail` skill on the files and flag what it reports. Then read each test and flag every place it breaks a check in the "Executable" and "Rules" sections of the [Review Checklist](../qa-write-test-cases/references/review-checklist.md). Skip its other sections: they need the sources and an approved checklist.

## Step 3: Improve Tests

- Rewrite each flagged test to the format and writing rules. Do not ask first: the summary shows each change.
- A fact the test needs and no file or user answer gives (an error text, how to cause a failure) is a question for the PO. Do not invent it. Add it to the ticket's context file when there is one.
- Include context from the parent suite in a description when relevant.
- Keep `priority:`, `refs:`, `smoke:`, `automation:`, `platform:`, and other metadata values.

## Step 4: Save

- Overwrite the original files.
- Keep the same file names and directory structure.

## Step 5: Summarize and Push

Run `push --dry-run` of the `sync-test-cases-with-testrail` skill on the changed files, then send one message as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out:

1. The question below. Name each case another QC owns, with its owner.
2. Counts: tests improved, files changed.
3. One line per improved test: its title and what changed.
4. Facts no source gives, as questions for the PO.

```
❓ Push the <N> improved cases to TestRail?

1. ✅ Push
2. ✏️ Type changes
```

Push after a yes. The yes is the confirmation that skill asks for, `--confirm-others` for the cases this message named included. These are rewrites the QC did not write, so ask even for their own cases.
