# Ticket Folder

Each QC keeps their own QA workspace, and no repo is shared. TestRail holds the cases every QC shares, and Jira holds the decisions. Local files are one QC's working copies for one ticket.

```text
tickets/<KEY>-<slug>/
  context.md          # written by gather-context
  <slug>.test.md      # cases written for the ticket
  *.test.md           # sections pulled to expand, under the names pull gives them
test-runs/<YYYY-MM-DD>-<slug>/
automation-lessons/
domain/
  index.md            # one line per topic file
  <topic>.md          # rules that hold beyond one ticket
.env
```

- `KEY` is the story's key, or the parent story's key for a sub-task.
- `tickets/<slug>/` holds work with no story: cases for behavior already released, such as a regression pack, or a new feature's cases until its story exists. Cases without the story's key in `refs:` are not linked to it on TestRail.
- `slug` names the feature: lowercase ASCII, two to four words joined by hyphens, under 40 characters. It stays when the story's title changes.
- Find a ticket's folder with `tickets/<KEY>-*/`. None → look for a `tickets/<slug>/` folder of the same feature before creating one: rename it to `tickets/<KEY>-<slug>/`, and set `refs:` to the key in its cases, which their next push sends. Two folders for one key: ask which one to use, and never merge them on your own.
- A ticket that changes existing cases: pull them fresh into its folder with `pull --section <name> --out tickets/<KEY>-<slug>/`. Never copy files from another ticket's folder: other QCs may have changed those cases on TestRail since.
- A workspace with an older flat `test-cases/` folder: read its files as before, and put new work in `tickets/`.
- `domain/` keeps the rules that apply beyond one ticket, such as session times, fees, and order rules. It is the QC's own like the rest of the workspace, and goes into the workspace's git history. Only [`save-domain-knowledge`](../../save-domain-knowledge/SKILL.md) writes it.
- A decision other QCs need goes where they can see it: a case fix to the TestRail case, and a rule or accepted difference to a comment on the story, with the user's approval. The context file keeps the link.
