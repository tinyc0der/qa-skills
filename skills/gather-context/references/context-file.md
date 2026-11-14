# Context File

One file per feature: `test-cases/<feature-name>.context.md`, with the feature name in kebab case (`saved-cards`). The feature's test case file takes the same name. Name sources and link them; do not copy their content. Pasted text has no link: save it as `test-cases/<feature-name>.pasted.md` and link that.

Sections, in this order. Leave out an empty one.

- `Date`
- `Sources read`: ticket keys, page titles, frame names, app environment and build, each with its link and last content change date
- `Not read`: sources that could not be read, and why
- `Found by search`: each source with the gap it fills
- `Existing cases`: count, TestRail section, `C<id>` range
- `Conflicts`: what each side says and the side followed, including known mismatches. Mark `(open)` the ones the source rules leave open.
- `Open questions`: gaps no source fills, and doubts a skill recorded
- `Left without a test`: validation rules and error messages without a checklist item, and why
- `Answers`: answers the user or the PO gave, each with who gave it and where

Updates:

- Overwrite the file on a re-run, but keep `Left without a test`, `Answers`, and each open question and open conflict no source settles yet, with its `asked` marks.
- An open question or open conflict sent to the PO ends with `asked <date>` and the comment's link. Sending it again adds another.
- An answer to an open question or an open conflict → move it to `Answers`.
- A new doubt → add it to `Open questions`.

```markdown
# Saved cards

Date: 2026-11-10

Sources read:

- Jira [ABC-123](https://jira.example.com/browse/ABC-123), updated 2026-11-03; parent ABC-100
- Confluence [Saved cards](https://wiki.example.com/x/Ab12), updated 2026-10-28
- Figma [Checkout › Payment](https://figma.com/design/Ab12), updated 2026-10-30
- Live app: staging, Checkout › Payment, build 4.12.0

Not read: Confluence "Payments FAQ" (no access)

Found by search:

- Jira [ABC-130](https://jira.example.com/browse/ABC-130) (same epic), updated 2026-10-15: card expiry rules

Existing cases: 8 in TestRail section Checkout › Payment (C101–C108)

Conflicts:

- Expired cards at checkout: the live app lists them; ABC-123 hides them. Follows ABC-123.
- Default card: the acceptance criteria pick the newest card; a later comment picks the first one added. Follows neither side. (open)

Open questions:

- Saved cards limit per user: no source says; asked 2026-11-11 ([ABC-123 comment](https://jira.example.com/browse/ABC-123?focusedCommentId=1002))

Answers:

- Card nickname length: 20 characters, PO in [ABC-123 comment](https://jira.example.com/browse/ABC-123?focusedCommentId=1001)
```
