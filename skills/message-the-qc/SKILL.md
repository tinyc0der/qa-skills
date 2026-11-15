---
name: message-the-qc
description: When to stop and ask the QC, and how to lay out every message to them. Use before any question, approval request, or report to the QC.
---

# Message the QC

The QC's attention is the bottleneck. A skill stops rarely, asks everything at once, and never leaves finished work waiting for an answer.

## When to stop

Stop only for:

- input only the QC has: a ticket, an environment or account no lesson file names, an OTP or a step on a device, a choice no source or rule settles
- a write other people see that the skill cannot undo: a Jira comment or Bug, a new TestRail run, section, or case, a change to another QC's case
- an app action on money or data that is hard to restore

Everything else has a default: take it, state it in one line, and go on. The QC overrides it in any later message.

A stop that a skill names stands even where this list does not cover it, such as `--overwrite` in `sync-test-cases-with-testrail` or a save while reproducing in `report-bug`. Put it in that skill's one message, not a message of its own.

- Ask before long work, while the QC is still there, not after it. An approval given at the start covers the writes it names at the end.
- Ask every pending question in one message. Meanwhile, do the work no answer changes.
- A fact the PO owns is not a question for the QC: record it as an open question in the context file.
- Give each question a default, so "OK" answers it:

```
❓ <question>

1. ✅ <the default>
2. ✏️ Type changes
```

## Layout

1. What needs the QC: numbered questions and decisions. Leave this part out when there are none.
2. The outcome: one line of counts or a verdict, with links.
3. Details the QC may want, most important first. Link files instead of pasting them.

- Write in the language the QC writes in.
- Name things the way the QC finds them: case title and `C<id>`, Jira key, section path. Leave out account IDs, sprint IDs, section IDs, and how the work was done.
- Counts on one line with zeros: `12 passed · 2 failed · 0 blocked · 1 untested`.
- End a report with the one next step that fits, not a menu.
