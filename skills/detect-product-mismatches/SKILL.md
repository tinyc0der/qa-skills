---
name: detect-product-mismatches
description: >-
  Compares what different sources say the product does: the live app (observed behavior), Jira, Confluence requirements, Figma designs, and TestRail test cases (intended behavior), user docs (documented behavior), and any other source (release notes etc.).
  Checks every feature in every source and records mismatches: contradictions and differences, not observed in the app, unspecified, undocumented.
  Use when the user asks to compare, cross-check, align, validate requirements, specs, Jira tickets, Confluence pages, Figma designs, TestRail test cases, user docs, or the live app against each other, to find mismatches, contradictions, differences, or outdated docs, designs, or requirements, or to find what is missing from the app, not documented, or not specified.
---

# Detect product mismatches

Checks each feature in every source and records where the sources disagree.

Output folder:
  - given by calling skill or the user
  - all paths are relative inside the output folder
  - default: `mismatches/`

## Modes

`build` (from scratch) or `update` (for changes since the last check).

## Sources

Type, role, scope, and history of each source come from its catalog README (`catalog-features` › Source roles, Sources).

| Source                  | Role                  |
| ----------------------- | --------------------- |
| Live app                | Actual                |
| Jira                    | Intended              |
| Confluence requirements | Intended              |
| Figma                   | Intended              |
| TestRail                | Intended              |
| User docs               | Documented            |
| Other                   | As its catalog README |

Figma has no catalog: read the frames linked from the feature's Jira issues and Confluence pages, else search the Figma file the user names. Compare copy, states, and screens.

Per feature, what each source says is rewritten as behaviors in one shape ([features.md](references/features.md) › Behaviors), so sources compare line by line:

- Two sources say different things about the same behavior → Differs.
- Another source has a behavior the live app lacks → Not observed in app; only when the live app is a compared source. The live app is the product: it must do what the other sources say.
- Several intended sources: a feature is specified when any of them has it.
- `History: Yes` (Jira by default): the newest issue wins (resolution date, else creation date); older contradicting issues are superseded, not mismatches.

**Not a mismatch:**

- Same behavior in other words.
- **Silence on a detail.** A coarser source agrees with a finer one unless it contradicts it (`Customer can save a card.` agrees with `Customer can save up to 5 cards.`).
- A behavior only the live app has, inside a feature the other sources have.
- Superseded issues; behaviors of another version; content outside a catalog Scope (open issues, drafts, deprecated pages).
- Can't tell (vague behavior, unreadable content) → open question.

## Likely cause

From dates read at the source: Jira resolution date (else creation date), Confluence page last version, Figma file version history, TestRail case last update, docs "last updated"; live app: the release date of its version (release notes, else the Jira fix version). The same dates decide the newest issue for `History: Yes`.

- The live app differs from the newest intended behavior, and nothing newer explains it → Bug.
- Confluence page, Figma frame, or TestRail case older than the Jira issue or release that set the current behavior → Stale requirement.
- User docs older than that change → Stale docs.
- Otherwise → Decide (product owner).

## Steps

```
- [ ] 1. Sources and access
- [ ] 2. Catalogs: create missing, update stale
- [ ] 3. Check each feature (one subagent each)
- [ ] 4. Verify (subagents; one live app session)
- [ ] 5. Merge
- [ ] 6. Validate
- [ ] 7. Report
```

Read [references/features.md](references/features.md) and [references/layout.md](references/layout.md) before writing files.

## Rules

- **Read-only on sources.** Never edit Jira issues, Confluence pages, Figma files, or TestRail cases. In the live app, change only data the check creates.
- Catalogs change only by running `catalog-features`.
- **Report, don't decide.** A mismatch page shows what each source says; its Solution only suggests a fix.
- Compare behaviors, not wording: different values, conditions, roles, labels, or flows differ.
- Write only keys and URLs that exist in the catalogs or the sources. Do not invent them.

## 1. Sources and access

1. List the sources to compare: given by the user, else ask; offer the ones already cataloged.
2. Check access: one real read per source (Atlassian MCP, Figma MCP, TestRail `list`, `agent-browser` signed in to the app, URL, file). No access → stop and ask for the connection or an export. A catalog alone is not enough: behaviors are read at the source.
3. Live app: environment URL, test account, and app version (About page or release notes).

## 2. Catalogs

Every listed source except Figma needs a catalog. Create the missing ones, update the stale ones, before any check:

- Use `catalog-features` skill to build the catalog for each source into `sources/{name}/catalog/`.
- TestRail: also pull the cases in scope into `sources/{name}/test-cases/` with the `pull` command of the `sync-test-cases-with-testrail` skill. Expected results are read from these files. They are a read copy: replace them on `update`.

## 3. Check each feature

Features: every feature from catalogs in this order: live app, Confluence, Jira, TestRail, other.

One subagent per feature, in parallel. Each gets: the feature (its feature YAML), the compared sources (name, type, role, scope, history, access, catalog path), the version, the Domain from the catalog READMEs, the source table and rules above, [references/features.md](references/features.md), [references/layout.md](references/layout.md). Subagents do not open the live app; step 4 does.

Subagent:

1. Per source: finds the feature in the catalog, else searches the source ([features.md](references/features.md) › Find).
2. Reads every matching feature at its links and states its behaviors ([features.md](references/features.md) › Read, Behaviors).
3. Aligns the same behavior across sources.
4. Returns one mismatch per disagreement: its kind and every section of a mismatch page ([layout.md](references/layout.md) › Page).
5. Live app compared: returns the app checks: each aligned behavior, the sources that state it, and the app catalog link to start from.

Subagent writes nothing. Returns: matched catalog features per source (or `not found` + where searched), mismatches, app checks, sources silent on the whole feature, open questions, catalog errors.

## 4. Verify

One fresh subagent per batch of mismatches, with the same inputs as step 3. It re-reads each mismatch at its Links and returns it as confirmed, corrected, or dropped (with why). Can't confirm → open question.

Live app compared: one subagent runs the app checks in one `agent-browser` session, feature after feature. No parallel browsers: the test account is shared. Per check:

- Open the app at the catalog link, follow the steps, state what the user gets ([features.md](references/features.md) › Behaviors).
- Matches every source → no page. Contradicts a source → Differs. Absent → Not observed in app. Same behavior already on a mismatch → add the app side to it.
- Evidence: URL, navigation path, steps, screenshot ([layout.md](references/layout.md) › Page).
- Can't reach (role, plan, or data the test account lacks) or can't tell → open question.

## 5. Merge

1. Write the confirmed mismatch pages ([layout.md](references/layout.md) › Page). Same disagreement from several features → one mismatch page, every disagreeing source on it.
2. `update`: remove resolved mismatches.
3. In `mismatches/README.md`, write the mismatches list ([layout.md](references/layout.md) › README).
4. New `sources/` or `mismatches/` → add a link and purpose for it to the root `README.md`.

## 6. Validate

```markdown
Structure
- [ ] Every feature of the compared catalogs was checked, or listed as an open question
- [ ] Mismatches list states compared sources (catalog Date), app version, check date; indexes every page and missing feature

Content
- [ ] Each page has every section of [layout.md](references/layout.md) › Page and one row per compared source; silent sources marked silent with where searched
- [ ] Difference opens with a one-sentence summary; each bullet is clear alone: sources, condition, what the user gets; the title doesn't say which side is right
- [ ] Every page was confirmed in Verify; nothing from Not a mismatch is a page
- [ ] Every live app side has URL, navigation path, steps, and a screenshot
- [ ] Every behavior on the pages passes the check in [references/features.md](references/features.md)
- [ ] update: resolved pages removed
```

## 7. Report

Where to start. Mismatches by highest user impact first. Missing features per source. Catalog errors (→ `catalog-features`). Open questions.

## Next actions

- Update a catalog → `catalog-features`
- Feedback to the PO on a contradicting story → `review-user-story`
- Test cases for differing behavior → `qa-write-test-cases`
