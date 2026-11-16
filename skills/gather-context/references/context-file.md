# Context File

One file per ticket: `context.md` in the ticket's folder ([Ticket Folder](./ticket-folder.md)). Name sources and link them; do not copy their content. Pasted text has no link: save it as `pasted.md` in the same folder and link that.

Sections, in this order. Leave out an empty one.

- `Date`
- `Sources read`: ticket keys, page titles, frame names, domain rule IDs, app environment and build, each with its link and last content change date
- `Not read`: sources that could not be read, and why
- `Found by search`: each source with the gap it fills
- `Existing cases`: count, TestRail section, `C<id>` range
- `Conflicts`: what each side says and the side followed. Mark `(open)` the ones the source rules leave open.
- `Open questions`: gaps no source fills, and doubts a skill recorded
- `Left without a test`: validation rules and error messages without a checklist item, and why
- `Answers`: answers the user or the PO gave, each with who gave it and where

An open question or open conflict that tests depend on has a `Cases:` sub-bullet naming them: test titles, or `C<id>` once pushed.

Updates:

- Overwrite the file on a re-run, but keep `Left without a test`, `Answers`, and each open question and open conflict no source settles yet, with its `asked` marks and `Cases:`.
- An open question or open conflict sent to the PO ends with `asked <date>` and the comment's link. Sending it again adds another.
- An answer to an open question or an open conflict, or a story change that settles one → move it to `Answers`, with its `Cases:`.
- A new doubt → add it to `Open questions`.

```markdown
# Cancel a pending order

Date: 2026-11-10

Sources read:

- Jira [TRADE-205](https://example.atlassian.net/browse/TRADE-205), updated 2026-11-03; parent TRADE-200
- Confluence [Order rules](https://example.atlassian.net/wiki/x/Ab12), updated 2026-09-15
- Figma [Trade › Order book](https://figma.com/design/Ab12), updated 2026-10-30
- Live app: UAT, Trade › Order book, build 4.12.0
- Domain rule order-rules-1 in [order-rules.md](../../domain/order-rules.md), checked 2026-11-15

Not read: Confluence "Order rules FAQ" (no access)

Found by search:

- Jira [TRADE-180](https://example.atlassian.net/browse/TRADE-180) (same epic, released), updated 2026-10-15: order statuses in Trade › Order book

Existing cases: 5 in TestRail section Trade › Order book (C201–C205)

Conflicts:

- Cancel during ATO and ATC: the story lets the investor cancel any pending order; a later PO comment blocks cancel during ATO and ATC, as Confluence "Order rules" does. Follows the comment.
- Cancel during ATO: the live app shows "Cancel"; TRADE-205 blocks it. Follows TRADE-205.
- Partially matched order: the acceptance criteria let the investor cancel the unmatched quantity; a later comment says a partially matched order cannot be cancelled. Follows neither side. (open)
  - Cases: C208

Open questions:

- Order matched before the cancel reaches the exchange: no source says what the investor sees; asked 2026-11-11 ([TRADE-205 comment](https://example.atlassian.net/browse/TRADE-205?focusedCommentId=1002))
  - Cases: C210, C211

Answers:

- Cancel confirmation: the investor confirms in a dialog before the order is cancelled, PO in [TRADE-205 comment](https://example.atlassian.net/browse/TRADE-205?focusedCommentId=1001)
```
