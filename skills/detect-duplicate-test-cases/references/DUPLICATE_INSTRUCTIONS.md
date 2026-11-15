# Duplicate Detection Guide

Reference for scoring and classifying duplicate and low-value test cases.

## Detection Levels

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| 1 | Exact Duplicates | Identical titles on the same platform | "User can log in" appears in 3 sections |
| 2 | Semantic Duplicates | Same intent, similar steps | "Check user can sign in" vs "Validate user authentication" |
| 3 | Overlapping / Subset | One test contains another | Cart test (3 steps) inside Checkout test (8 steps) |
| 4 | Redundant Variations | Same rule and expected result, different data | Login with john@example.com vs jane@example.com |

## Low-Value Cases

Flag a case that [Test Design Techniques](../../qa-write-test-cases/references/test-design-techniques.md) would not write today:
- It falls under §5 "Not worth a test".
- It is a costly test of a low-risk area (§1).
- It tests old behavior the current Jira ticket or Confluence spec no longer describes.
- Its expected result cannot fail or is vague.

Keep a case that covers a high-impact area from §1, an acceptance criterion or spec rule, or a defect named in the case (a Jira bug key in `refs` or the title). For a defect, keep the smallest scenario that reproduces it. "This used to happen" without a key is not a named defect.

## Actions

| Action | When to Use |
|--------|-------------|
| Merge | Tests duplicate the same intent: combine into one canonical test |
| Remove | One test is redundant or low-value: keep the more complete one |
| Simplify | A low-value case hides one useful check: cut it to that check |
| Keep | Tests serve different purposes (different platforms or environments, data that reaches a different rule or expected result, other coverage) |

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
