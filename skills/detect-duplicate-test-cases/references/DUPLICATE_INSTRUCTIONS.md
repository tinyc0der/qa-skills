# Duplicate Detection Guide

Reference for scoring and classifying duplicate test cases.

## Detection Levels

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| 1 | Exact Duplicates | Identical titles on the same platform | "LO buy order accepts only prices from floor to ceiling" appears in 3 sections |
| 2 | Semantic Duplicates | Same intent, similar steps | "Pending order can be cancelled in the continuous session" vs "Cancel button cancels a pending order during continuous matching" |
| 3 | Overlapping / Subset | One test contains another | Price band test (3 steps) inside the full LO buy order test (8 steps) |
| 4 | Redundant Variations | Same rule and expected result, different data | LO buy order of 100 shares vs 200 shares at the reference price |

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
