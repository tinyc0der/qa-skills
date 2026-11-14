# Duplicate Detection Guide

Reference for scoring and classifying duplicate and low-value test cases.

## Detection Levels

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| 1 | Exact Duplicates | Identical titles | "User can log in" appears in 3 sections |
| 2 | Semantic Duplicates | Same intent, similar steps | "Check user can sign in" vs "Validate user authentication" |
| 3 | Overlapping / Subset | One test contains another | Cart test (3 steps) inside Checkout test (8 steps) |
| 4 | Redundant Variations | Same logic, different data | Login with john@example.com vs jane@example.com |

## Low-Value Cases

Flag cases that primarily cover:
- Conditions with little or no impact on a user workflow.
- Every variation of the same error, shortcut, platform, state transition, or entry point.
- Setup persistence or state-retention details that only save minor user effort.
- Expensive installation, restart, external-service, or multi-platform flows with weak business value.
- Old behavior that the current Jira ticket or Confluence spec no longer describes.
- Expected results that cannot meaningfully fail or are vague.

Do not flag cases for checking wording, labels, icons, or exact message text. Manual QC verifies those.

Keep a case only when it protects at least one of these:
- A critical end-user business flow.
- Data loss, security, permissions, billing, or irreversible actions.
- A documented product contract: Jira acceptance criteria or a Confluence spec.
- A defect named in the case (a Jira bug key in `refs` or the title) with material user impact.

A sentence such as "this used to happen" is not enough by itself.
When a defect requires protection, keep the smallest regression scenario possible. Merge permutations instead of preserving every trigger.

## Actions

| Action | When to Use |
|--------|-------------|
| Merge | Tests duplicate the same intent: combine into one canonical test |
| Remove | One test is redundant or low-value: keep the more complete one |
| Simplify | A low-value case hides one useful check: cut it to that check |
| Keep | Tests serve different purposes (different environments, data, coverage) |

## Report Template

```markdown
# Duplicate Analysis Report

**Scanned:** {N} cases across {M} sections
**Duplicates found:** {X} cases in {Y} groups
**Low-value cases:** {Z}

## Summary
- Exact: {N} groups | Semantic: {N} groups | Overlapping: {N} groups | Variations: {N}

## Group {N}: {Type}: {Test Name}

**Cases:**
- C{id} "{title}" (section: {section})
- C{id} "{title}" (section: {section})

**Canonical:** C{id}
**Recommendation:** {Keep / Merge / Remove}

## Low-Value Cases

| Case | Section | Title | Action | Why |
|------|---------|-------|--------|-----|
| C{id} | {section} | {title} | {Remove / Merge / Simplify} | {business-value problem} |
```
