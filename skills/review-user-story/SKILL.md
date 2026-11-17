---
name: review-user-story
description: Review a Jira user story with its subtasks, comments, parent epic, linked Confluence pages, and linked Figma frames, and draft QA feedback for the product owner. Produce the gaps a tester needs filled (complete, testable, ready to test) and the material ambiguities and contradictions. Use when a user supplies a Jira story or ticket and asks to review it, check its testability or acceptance criteria, or give feedback to the PO. Accept Jira links, Confluence pages, and pasted text.
---

# Review User Story

Review a user story before testing starts: find what is unclear, missing, or untestable. The result is QA feedback for the product owner.

The deliverable is a brief, useful review, not a sentence-by-sentence audit or a critique of ticket organization.

## Workflow

### 1. Gather context

- Run the [`gather-context`](../gather-context/SKILL.md) skill for the story.
- Do not review the parent epic. Use it only for the rules and decisions that apply to this story.
- The context file's open questions are Ready to test candidates. Its open conflicts are unresolved decisions for Questions, even when a comment seems to answer them.
- An important source not read: state the limitation in one line above the headings.

### 2. Find the gaps

Report only the checks the story fails, each quoting the story text it concerns or naming what is missing:

- **Complete**: actor, trigger, outcome, and business rules; acceptance criteria cover the empty, error, and permission paths.
- **Testable**: every acceptance criterion has a measurable pass/fail, with no vague words (`fast`, `relevant`, `user-friendly`, `should work`, `as needed`).
- **Ready to test**: a tester can write every expected result and set up every test without guessing. Name each missing item a test of this story needs and no source gives:
  - message texts, validation rules (format, length, required), limits with units
  - money values the investor acts on (fees, tax, buying power, P&L): formula, inputs, and rounding
  - trading sessions (ATO, continuous, lunch break, ATC, PLO): which ones allow the action, and what happens when the session changes mid-flow
  - order and request statuses: each status and what moves it, including partial match, expiry, and session close
  - realtime prices and order status: how fast they update, and what shows when the feed drops
  - scope: what is out, platforms, screens
  - what each role sees and can do, when roles differ
  - what happens to existing data; which existing features change
  - setup: environment, feature flag or config, test accounts and data
  - where a backend, API, or async result shows (screen, email, log, API response)
  - designs for the loading, empty, and error states
  - dependencies: third-party APIs, other teams
  - languages, notifications, and OTP or login session expiry, when the story touches them

A confirmed rule from `domain/` that the context file lists is a source. A gap it fills, in a part the story does not change, is not a gap.

### 3. Identify material ambiguities and contradictions

Raise only questions whose answers could materially change user behavior, scope, permissions, dependencies, or acceptance expectations.

For each item:
- Say what the answer changes for the user, such as a wrong fee or buying power, an order accepted in the wrong session, or a failed submission.
- Cite the source: story, comment, epic, page, or frame. For a rule from `domain/`, cite the rule's own source link, not its ID: the PO cannot open the QC's `domain/`.

Do not:
- Enumerate minor UI details, copy edits, every validation case, or arbitrary edge cases. A message text or validation rule a test needs and no source gives is a Ready to test gap.
- Treat existing defects as unresolved decisions when their expected behavior is already explicit.
- Invent concerns just to fill the section. If none are material, say so.

### 4. Record the gaps and questions

- Add each gap and question to the context file's open questions or conflicts, as [Context File](../gather-context/references/context-file.md) describes.

## Output format

Use exactly these two headings, in this order. Do not add an executive summary, readiness verdict, recommendation, or offer unless requested.

```markdown
## Gaps

- **Testable:** "the price board updates fast" has no measurable pass/fail.
- **Ready to test:** no error text when buying power is too low; no rounding rule for the fee.

## Questions

- **Cancel during ATC:** the story lets the investor cancel any pending order, but the [PRD](url) blocks cancelling in ATC. The answer decides whether the cancel button shows in ATC.
```

Output constraints:
- Gaps: one bullet per failed check from step 2, or "No gaps found."
- Do not edit issues, create subtasks, rewrite the story, or execute tests. The context file update (step 4) is the only write.
