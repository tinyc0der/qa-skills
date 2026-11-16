---
title: Domain File
description: The layout of `domain/` in the QA workspace, the format of a rule entry, and how other skills read a rule.
---

# Domain File

`domain/` in the QA workspace keeps the rules that apply beyond one ticket, one business topic per file.

```text
domain/
  index.md          # one line per topic file
  <topic>.md        # such as trading-sessions.md, fees-and-tax.md, order-rules.md
```

- `<topic>` names a business area, not a ticket or screen: lowercase ASCII words joined by hyphens. It never changes, since rule IDs carry it.
- Index line: a link to the topic file, what it covers, and `Checked <YYYY-MM-DD>`, the date of the file's last save or refresh, as in the example.
- Rules in a topic file follow in ID order. A new rule goes at the end.

## Entry

```markdown
## <topic>-<n> · <short name>

- Rule: <one or two sentences>
- Applies to: <exchange, product, platform, account type, environment>
- Status: confirmed | observed
- Source: [<title>](<link>), <YYYY-MM-DD>
- Confirmed by: <who>, <where>
- Conflict: <what the other side says>, [<title>](<link>), <YYYY-MM-DD>
- Replaced by: <topic>-<m>
```

- ID: `<topic>-<n>`, where `n` is one above the highest ID in the file, replaced rules included. Never renumber or reuse an ID: context files cite it.
- Rule: a formula or table the source states in full gets its name and a link to its section, not a copy.
- Applies to: only the scope the source states. A dimension the source leaves open is `not stated`, never `all`. A rule a story changes names the release it starts from.
- Status: `confirmed` when a source states the rule or a person confirmed it; `observed` when it was only seen in the app or inferred.
- Source: the link and the date of its last content change, as in the context file. A value the QC typed has no link: `the QC, <date>`.
- Confirmed by: the person or role who stated or approved the rule, and where. A source that names nobody, and every `observed` rule: `unknown`.
- Conflict: only while a conflict the QC kept open stands.
- Replaced by: added when a new rule replaces this one. The entry keeps its ID and every other line.

## Reading a rule

- A confirmed rule has `Status: confirmed`, no `Conflict:` line, and no replacement in force where the reader works (environment, build). It is current behavior and a source for expected results and test setup. Cite it by its ID.
- **An `observed` rule is a lead to check in the sources or the app, never an Expected result.**
- A `Conflict:` line makes the rule an open conflict, as the context file treats one.
- `Replaced by:` → read the replacement. The old rule still holds where the replacement does not apply yet, such as on a build before its release.

## Example

Illustrative: these rules show the format, not real market rules.

`domain/index.md`:

```markdown
# Domain rules

- [Order rules](./order-rules.md): placing, changing, and cancelling orders, by session and exchange. Checked 2026-11-15
- [Trading sessions](./trading-sessions.md): session windows by exchange. Checked 2026-11-12
```

`domain/order-rules.md`:

```markdown
# Order rules

## order-rules-1 · Cancel during ATO and ATC

- Rule: On HOSE, the investor cannot cancel or change an order during ATO or ATC.
- Applies to: HOSE stocks and ETFs, every platform; account type and environment not stated
- Status: confirmed
- Source: Confluence [Order rules](https://example.atlassian.net/wiki/x/Ab12), 2026-09-15
- Confirmed by: unknown

## order-rules-2 · Confirm a cancel

- Rule: Cancelling an order asks the investor to confirm in a dialog.
- Applies to: every exchange, every platform; account type not stated
- Status: confirmed
- Source: [TRADE-205 comment](https://example.atlassian.net/browse/TRADE-205?focusedCommentId=1001), 2026-11-03
- Confirmed by: the PO, in that comment
- Replaced by: order-rules-3

## order-rules-3 · Confirm a cancel

- Rule: Cancelling an order asks for the OTP instead of a dialog.
- Applies to: every exchange, every platform, from release 4.13; account type not stated
- Status: confirmed
- Source: [TRADE-240](https://example.atlassian.net/browse/TRADE-240), 2026-11-14
- Confirmed by: the PO, in the TRADE-240 description

## order-rules-4 · Cancelled status after a cancel

- Rule: After a cancel in the continuous session, the order book shows the order as "Cancelled" within 2 seconds.
- Applies to: UAT web, build 4.12.0
- Status: observed
- Source: live app, UAT, 2026-11-12
- Confirmed by: unknown
```
