# Workspace AGENTS.md

`AGENTS.md` at the QA workspace root is a short overview of the product the QC tests. Codex and Cursor load it at the start of every session, so every skill knows the product's modules, users, and terms before it reads a ticket.

Claude Code loads `CLAUDE.md` instead. No `CLAUDE.md` → create it with the one line `@AGENTS.md`, which imports the overview. One without that line → add it at the top, and keep the rest.

## Rules

- Keep it under about 40 lines: it loads on every session.
- Link Confluence pages and Figma files, never copy them: copies go stale.
- Leave out business rules (`domain/`), environments, accounts, and how to drive the app (`automation-lessons/`), TestRail settings (`.env`), and anything about one ticket (`tickets/`).
- Never write passwords, OTP codes, tokens, or account numbers.

## Template

```markdown
# <Product name>

<One or two sentences: what the product is and who uses it.>

- Platforms: <Web, Android, iOS>
- Jira: project <KEY>, components <component, component>

## Users

- <Account type or role>: <what it can do or see that the others cannot>

## Modules

- <Module> (<main screens>): [Confluence](<page link>) · [Figma](<file link>)
  - Shares <component> with <module>

## Terms

- <Term or abbreviation>: <what it means, in one line>
```
