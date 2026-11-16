---
name: save-domain-knowledge
description: Save a business rule that holds beyond one ticket (trading session windows, fee and tax formulas and their rounding, price band and step, lot size, order and cancel rules, buying power, settlement, OTP, realtime price tolerance) to `domain/` in the QA workspace, with its scope, status, source, and who confirmed it, so later tickets reuse it instead of asking again; and answer what those notes say. Use when the QC asks to save, remember, or note a rule; when a PO answer, a Confluence rule, or session times the QC typed hold beyond the current ticket; or when the QC asks what the notes say about a topic. Not for one ticket's facts (the `gather-context` context file) or how to drive the app (the `run-test-suite` automation lessons).
---

# Save Domain Knowledge

Keeps the rules that hold beyond one ticket in `domain/` of the QC's own QA workspace, each with its scope, status, source, and who confirmed it, so later tickets read the rule instead of asking the PO again or guessing. [Domain File](./references/domain-file.md) defines the layout, the entry, and how other skills read a rule.

**When to skip steps:**

- The QC asks what the notes say about a topic → Step 1 only, then answer with each matching rule's ID, rule, status, and source date, and name the rules that are replaced or have an open conflict. Write nothing.
- Run by another skill → Steps 1 and 2, then hand that skill the drafted entries and the Step 3 question: its message carries them. Step 4 runs on the QC's answer.

## Rules

- One entry per rule that holds beyond one ticket. A fact about one ticket's screens stays in its context file. How to drive the app stays in `automation-lessons/`.
- **Every value comes from a source or from the QC, never from what the agent knows of the market: session times, fees, and limits differ by exchange and change with the rules.**
- Who confirmed a rule, and every date, come from the source or the QC, never from a guess.
- Never write passwords, OTP codes, tokens, account numbers, or other credentials.

## Workflow

### 1. Find the topic file

- Read `domain/index.md` and open only the topic files whose line matches the rule or the topic asked about. No `domain/` yet → there are no notes; when saving, create it with an `index.md` titled `# Domain rules`.
- No topic fits → when saving, a new topic file and its index line.

### 2. Compare with the rules there

Look for a rule about the same thing: the same action, value, or limit, for a scope that overlaps.

- Same rule and scope → refresh its source and date. Step 3 asks only when the refresh turns `observed` into `confirmed`. The same source too → nothing to write.
- None → draft a new entry with the next ID.
- A source that changes the rule on purpose, such as a story that changes it from a release → draft the new rule, and add `Replaced by:` to the old one.
- Any other difference in value or outcome is a conflict. **Never overwrite a rule: Step 3 shows both sides.**

### 3. Ask once

Show each entry as it will be written, with the file, and ask as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out:

```
❓ Save these rules to domain/?

1. ✅ Save
2. ✏️ Type changes
```

A conflict shows both sides, each with its source and date, and asks which holds:

```
❓ order-rules-2 says <A> (<source>, <date>); <new source> says <B> (<date>). Which holds?

1. ✅ Keep order-rules-2 and record the conflict as open
2. 🔁 <B> holds: a new rule replaces order-rules-2
3. ✏️ Type changes
```

The QC settles an open conflict later → drop the `Conflict:` line, and replace the rule if the other side holds.

### 4. Write, commit, and read back

- Write the entries, and the index line or its new date, as [Domain File](./references/domain-file.md) describes.
- If the workspace is a git repo, commit only the files written, so the commit never takes the QC's other staged work: `git add domain/index.md domain/<topic>.md && git commit -m "Save <IDs>" -- domain/index.md domain/<topic>.md`.
- Read the files back: each entry is there once with a unique ID, and the index links every topic file.
- Report the IDs saved, refreshed, or kept open, with the file, as `message-the-qc` lays out.
