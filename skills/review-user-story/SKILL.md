---
name: review-user-story
description: Review a Jira user story with its subtasks, comments, parent epic, linked Confluence pages, and linked Figma frames, and draft QA feedback for the product owner. Produce story quality gaps (atomic, clear, complete, consistent, testable, ready to test), material ambiguities, concrete risks, and proposed acceptance criteria; post the approved feedback as a Jira comment. Use when a user supplies a Jira story or ticket and asks to review it, check its testability or acceptance criteria, or give feedback to the PO. Accept Jira links, Confluence pages, and pasted text.
---

# Review User Story

Review a user story before testing starts: find what is unclear, missing, or untestable, and describe how its outcome can be accepted. The result is QA feedback for the product owner.

The deliverable is a brief, useful review, not a sentence-by-sentence audit or a critique of ticket organization.

## Workflow

### 1. Gather context

- Run the [`gather-context`](../gather-context/SKILL.md) skill for the story.
- Do not review the parent epic. Use it only for the rules and decisions that apply to this story.
- Cite a known mismatch instead of raising it as new.
- A behavior found only in a source the story does not link is still a Story quality finding (Complete): name the source and ask the PO to link it.
- The context file's open questions are Ready to test candidates. Its open conflicts are unresolved decisions for Ambiguities & Contradictions, even when a comment seems to answer them.
- Distinguish the original request, later clarifications, and implementation reports. A closed subtask or a comment saying PASS is not your own execution evidence.
- An important source not read: state the limitation in one line above the headings. Continue unless the story cannot be understood.

### 2. Check story quality

Report only the checks the story fails, each quoting the story text it concerns or naming what is missing:

- **Atomic**: one actor, one capability.
- **Clear**: no vague words that make a criterion untestable (`fast`, `relevant`, `user-friendly`, `should work`, `as needed`).
- **Complete**: actor, trigger, outcome, and business rules; acceptance criteria cover the empty, error, and permission paths.
- **Consistent**: the same terms throughout; no contradictions with comments, the parent epic, linked pages, or designs.
- **Testable**: every acceptance criterion has a measurable pass/fail.
- **Ready to test**: a tester can write every expected result and set up every test without guessing. Name each missing item a test of this story needs and no source gives:
  - message texts, validation rules (format, length, required), limits with units
  - scope: what is out, platforms, screens
  - what each role sees and can do, when roles differ
  - what happens to existing data; which existing features change
  - setup: environment, feature flag or config, test accounts and data
  - where a backend, API, or async result shows (screen, email, log, API response)
  - designs for the loading, empty, and error states
  - dependencies: third-party APIs, other teams, release order
  - languages, time zones, notifications, analytics events, accessibility, when the story touches them

### 3. Identify material ambiguities and contradictions

Raise only questions whose answers could materially change user behavior, scope, permissions, dependencies, or acceptance expectations.

For each item:
- State exactly what is unresolved or conflicting.
- Explain the competing meanings or the missing governing rule when useful.
- Cite the source: story, comment, epic, page, or frame.
- Check that a comment or linked page has not already answered it.

Do not:
- Enumerate minor UI details, copy edits, every validation case, or arbitrary edge cases. A message text or validation rule a test needs and no source gives is a Ready to test gap.
- Demand ticket restructuring, extra subtasks, or traceability matrices without a demonstrated functional need.
- Treat existing defects as unresolved decisions when their expected behavior is already explicit.
- Invent concerns just to fill the section. If none are material, say so.

### 4. Describe concrete risks

- Identify plausible user or business consequences supported by the story and its context.
- Prefer concrete outcomes such as wrong totals, lost data, inaccessible screens, or failed submission over vague claims about quality or rework.
- Link risks to evidence where available.
- Distinguish reported defects from hypothetical risks.
- Do not invent severity or business-impact ratings without supporting context.

### 5. Propose acceptance criteria

- Provide the observable outcomes that cover the story.
- State what must happen, not a detailed test procedure or implementation design.
- Ground criteria in the story, its comments, and explicit decisions.
- Do not invent thresholds, mappings, credentials, formats, or policy decisions.
- When behavior is unresolved, flag that the criterion depends on that decision.
- For an investigation story, define the investigation deliverable rather than a working feature.
- Criteria are proposed acceptance expectations, not claims that the story has been executed or passed.

### 6. Send the feedback to the PO

- Show the review to the user first.
- **Post it only after the user approves**, as one comment on the story through the Atlassian MCP.
- The comment is the only write to Jira. Never edit the story's description, fields, or subtasks.
- After posting, add each gap and ambiguity the comment raised to the context file's open questions or conflicts, marked `asked` as [Context File](../gather-context/references/context-file.md) describes.

## Output format

Use exactly these four headings, in this order. Do not add an executive summary, readiness verdict, recommendation, or offer unless requested.

```markdown
## Story quality

- **Testable:** "results load fast" has no measurable pass/fail.
- **Ready to test:** no error text for an expired card; no limit on saved cards per user.

## Ambiguities & Contradictions

- **Specific unresolved behavior:** concise explanation, citing [source](url).

## Risks

- **Concrete consequence:** how it could affect users, citing [source](url).

## Acceptance Criteria

*Proposed acceptance criteria; identify any that depend on unresolved decisions.*

1. Observable outcome.
2. Observable outcome.
```

Output constraints:
- Story quality: one bullet per failed check from step 2, or "No gaps found."
- Ambiguities & Contradictions: only the material ones from step 3.
- Follow-up review (an earlier QA review comment is on the story): raise only what it did not raise, the `asked` items the user asks to send again, and criteria an answer changed. Leave out the headings with none.
- Risks: concise and specific.
- Acceptance Criteria: a numbered list.
- Use plain, direct language. Every bullet must teach the reader something about the story, a decision, a consequence, or an acceptance outcome.
- Do not repeat the same concern across sections without a distinct purpose: quality = how the story is written; ambiguity = unresolved decision; risk = consequence; criterion = observable expected result.
- Do not edit issues, create subtasks, rewrite the story, or execute tests. The approved Jira comment and the context file update (step 6) are the only writes.

## Quality check before responding

- Did the context cover the comments, subtasks, and linked pages, including truncated content?
- Does each story-quality item quote the story text or name what is missing?
- Does each Ready to test gap block an expected result or a test setup, with no source filling it?
- Is every ambiguity genuinely unanswered in the sources?
- Is each concern consequential rather than cosmetic or procedural?
- Are acceptance criteria grounded, observable, and free of invented decisions?
- Is the result brief enough to be useful?
