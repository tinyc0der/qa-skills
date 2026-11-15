# Duplicate Detection Guide

Reference for scoring and classifying duplicate test cases.

## Detection Levels

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| 1 | Exact Duplicates | Identical titles on the same platform | "User can log in" appears in 3 sections |
| 2 | Semantic Duplicates | Same intent, similar steps | "Check user can sign in" vs "Validate user authentication" |
| 3 | Overlapping / Subset | One test contains another | Cart test (3 steps) inside Checkout test (8 steps) |
| 4 | Redundant Variations | Same rule and expected result, different data | Login with john@example.com vs jane@example.com |

## Actions

| Action | When to Use |
|--------|-------------|
| Merge | Tests duplicate the same intent: combine into one canonical test |
| Remove | One test is redundant: keep the more complete one |
| Keep | Tests serve different purposes (different platforms or environments, data that reaches a different rule or expected result, other coverage) |

## Report Template

```markdown
# Duplicate Analysis Report

**Scanned:** {N} cases across {M} sections
**Duplicates found:** {X} cases in {Y} groups

## Summary
- Exact: {N} groups | Semantic: {N} groups | Overlapping: {N} groups | Variations: {N}

## Group {N}: {Type}: {Test Name}

**Cases:**
- C{id} "{title}" (section: {section})
- C{id} "{title}" (section: {section})

**Canonical:** C{id}
**Recommendation:** {Keep / Merge / Remove}
```
