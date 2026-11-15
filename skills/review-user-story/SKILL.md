---
name: review-user-story
description: Review a Jira user story with its subtasks, comments, parent epic, linked Confluence pages, and linked Figma frames, and draft QA feedback for the product owner. Produce the gaps a tester needs filled (complete, testable, ready to test) and the material ambiguities and contradictions; post the approved feedback as a Jira comment. Use when a user supplies a Jira story or ticket and asks to review it, check its testability or acceptance criteria, or give feedback to the PO. Accept Jira links, Confluence pages, and pasted text.
---

# Review User Story

Review a user story before testing starts: find what is unclear, missing, or untestable. The result is QA feedback for the product owner.

The deliverable is a brief, useful review, not a sentence-by-sentence audit or a critique of ticket organization.

**When to skip steps:**

- No Jira story to comment on (pasted text, a Confluence page) → end with the review, without the post question. Record its gaps as open questions in the context file.
- A follow-up review finds nothing new → post nothing, and report the `asked` items still unanswered.

## Workflow

### 1. Gather context

- Run the [`gather-context`](../gather-context/SKILL.md) skill for the story.
- Do not review the parent epic. Use it only for the rules and decisions that apply to this story.
- Cite a known mismatch instead of raising it as new.
- The context file's open questions are Ready to test candidates. Its open conflicts are unresolved decisions for Questions, even when a comment seems to answer them.
- Distinguish the original request, later clarifications, and implementation reports. A closed subtask or a comment saying PASS is not your own execution evidence.
- An important source not read: state the limitation in one line above the headings. Continue unless the story cannot be understood.

### 2. Find the gaps

Report only the checks the story fails, each quoting the story text it concerns or naming what is missing:

- **Complete**: actor, trigger, outcome, and business rules; acceptance criteria cover the empty, error, and permission paths.
- **Testable**: every acceptance criterion has a measurable pass/fail, with no vague words (`fast`, `relevant`, `user-friendly`, `should work`, `as needed`).
- **Ready to test**: a tester can write every expected result and set up every test without guessing. Name each missing item a test of this story needs and no source gives:
  - message texts, validation rules (format, length, required), limits with units
  - money values the investor acts on (fees, tax, buying power, P&L): formula, inputs, and rounding
  - trading sessions (ATO, continuous, lunch break, ATC, PLO): which ones allow the action, and what happens when the session changes mid-flow
  - order and request statuses: each status and what moves it, including partial match, expiry, and session close
  - scope: what is out, platforms, screens
  - what each role sees and can do, when roles differ
  - what happens to existing data; which existing features change
  - setup: environment, feature flag or config, test accounts and data
  - where a backend, API, or async result shows (screen, email, log, API response)
  - designs for the loading, empty, and error states
  - dependencies: third-party APIs, other teams
  - languages, notifications, and OTP or login session expiry, when the story touches them

A confirmed rule from `domain/` that the context file lists is a source. A gap it fills, in a part the story does not change, is not a gap. The context file cites the rule's ID.

### 3. Identify material ambiguities and contradictions

Raise only questions whose answers could materially change user behavior, scope, permissions, dependencies, or acceptance expectations.

For each item:
- State exactly what is unresolved or conflicting.
- Explain the competing meanings or the missing governing rule when useful.
- Say what the answer changes for the user, such as a wrong fee or buying power, an order accepted in the wrong session, or a failed submission.
- Cite the source: story, comment, epic, page, or frame. For a rule from `domain/`, cite the rule's own source link, not its ID: the PO cannot open the QC's `domain/`.
- Check that a comment or linked page has not already answered it.

Do not:
- Enumerate minor UI details, copy edits, every validation case, or arbitrary edge cases. A message text or validation rule a test needs and no source gives is a Ready to test gap.
- Demand ticket restructuring, extra subtasks, or traceability matrices without a demonstrated functional need.
- Treat existing defects as unresolved decisions when their expected behavior is already explicit.
- Invent concerns just to fill the section. If none are material, say so.

### 4. Send the feedback to the PO

- Show the review to the user first, with the question below. Run inside the testing workflow, the question waits for the checklist and goes in the same message.
- **Post it only after the user approves**, as one comment on the story through the Atlassian MCP.

```
❓ Post this review as a comment on <KEY>?

1. ✅ Post
2. ✏️ Type changes
```
- The comment is the only write to Jira. Never edit the story's description, fields, or subtasks.
- After posting, add each gap and question the comment raised to the context file's open questions or conflicts, marked `asked` as [Context File](../gather-context/references/context-file.md) describes.

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
- Questions: only the material ones from step 3.
- Follow-up review (an earlier QA review comment is on the story): raise only what it did not raise and the `asked` items the user asks to send again. Leave out a heading with none.
- Do not edit issues, create subtasks, rewrite the story, or execute tests. The approved Jira comment and the context file update (step 4) are the only writes.

## Quality check before responding

- Did the context cover the comments, subtasks, and linked pages, including truncated content?
- Does each gap quote the story text or name what is missing?
- Does each Ready to test gap block an expected result or a test setup, with no source filling it?
- Is every question genuinely unanswered in the sources, and does it say what the answer changes?
- Is each concern consequential rather than cosmetic or procedural?
- Is the result brief enough to be useful?
