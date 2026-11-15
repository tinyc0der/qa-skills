---
title: Ticket Folder
description: Where a QC keeps a ticket's context file and test cases in their own QA workspace, and where shared decisions go instead.
---

# Ticket Folder

Each QC keeps their own QA workspace, and no repo is shared. TestRail holds the cases every QC shares, and Jira holds the decisions. Local files are one QC's working copies for one ticket.

```text
tickets/<KEY>-<slug>/
  context.md          # written by gather-context
  pasted.md           # source text the user pasted, when there is any
  <slug>.test.md      # cases written for the ticket
  *.test.md           # sections pulled to expand, under the names pull gives them
test-runs/<YYYY-MM-DD>-<slug>/
automation-lessons/
.env
```

- `KEY` is the story's key, or the parent story's key for a sub-task. Work with no ticket uses `tickets/<slug>/`.
- `slug` names the feature: lowercase ASCII, two to four words joined by hyphens, under 40 characters. It stays when the story's title changes.
- Find a ticket's folder with `tickets/<KEY>-*/`. Two folders for one key: ask which one to use, and never merge them on your own.
- A ticket that changes existing cases: pull them fresh into its folder with `pull --section <name> --out tickets/<KEY>-<slug>/`. Never copy files from another ticket's folder: other QCs may have changed those cases on TestRail since.
- A workspace with an older flat `test-cases/` folder: read its files as before, and put new work in `tickets/`.
- A decision other QCs need goes where they can see it: a case fix to the TestRail case, and a rule or accepted difference to a comment on the story, with the user's approval. The context file keeps the link.
