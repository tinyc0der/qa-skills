---
name: catalog-features
description: >-
  Builds a catalog of product features from one source: a tree that mirrors the source, each feature as a key, title, and link to the source. Supports Jira, Confluence, TestRail, the live app, and user docs.
  Use when asked to catalog/list features, existing functionality, Jira issues, Confluence requirements, specs, PRDs, user docs, TestRail test cases, the live app's screens, or similar sources.
---

# Catalog features

Catalog of **the source's features**: a tree that mirrors the source, each feature with its key, title, and link. Its behaviors (description, requirements, acceptance criteria, etc.) stay at the source.

Output folder: given by the calling skill or the user. Default: `catalog/`. Write only inside it.

## Modes

`build` from scratch; `update` from an existing catalog. When `update`, use info from the catalog README.

## Source roles

| Role       | Description                                                                                |
| ---------- | ------------------------------------------------------------------------------------------ |
| Actual     | Actual behavior of the product. The live app.                                              |
| Intended   | What we attempted to implement. Jira issues, Confluence requirements, TestRail test cases. |
| Documented | What the product says it does. User docs.                                                  |

## Rules

- **Read-only on the source.** Do NOT edit the source even when the tools offer it. In the live app, navigate only; submit nothing that saves data.
- One catalog per source.

## Sources

### Jira

- Access: Atlassian MCP.
- Tree: the Jira hierarchy: epics, parent issues, issues, sub-tasks.
- Scope: a JQL query; ask the user for it and store it. "Done" issues only (typical successfully resolved statuses); ask the user when in doubt.
- Link: issue key + URL.
- Role: Intended.
- History: Yes (unless user specified). Because different issues may be related to the same feature. Need to store date of creation and resolution to determine which issue overrides the other.

### Confluence

- Access: Atlassian MCP.
- Word, PDF attachments: extract the text first.
- Tree: the page tree; headings inside long pages.
- Scope: a space or a root page; ask the user for it and other crucial filters. Take into account that there could be drafts, deprecated pages, copies. Process them accordingly.
- Link: page title + URL; the heading for long pages.
- Role: Intended for requirements and specs; Documented for user docs. Ask when a space holds both.
- History: No.

### TestRail

- Access: the `list` command of the `sync-test-cases-with-testrail` skill.
- Tree: TestRail sections and subsections.
- Feature: what users do, named from the product ("Invite member", not the case title "Invite member with a valid email"), grouping every case that tests it; not one per case or section; cases in several sections → one feature.
- Key: none. Links: each case as `C<id>` + `{TESTRAIL_URL}/index.php?/cases/view/{id}`.
- Scope: sections; ask the user.
- Role: Intended.
- History: No.

### Live app

- Access: the `agent-browser` skill, signed in with the test account and role the user gives.
- Tree: the app's navigation: menu sections, pages, tabs.
- Feature: what users do, named from the product ("Invite member"), not one per page or URL; same feature on two screens → one feature.
- Link: URL + navigation path, e.g. `Settings › Members`.
- Scope: environment URL, roles, areas; ask the user. Only what the given roles can reach.
- Role: Actual.
- History: No.

### Other

Any source that describes the product (help site, release notes). Agree on role, coverage, history with the user before syncing.

## Steps

```
- [ ] 1. Source and domain
- [ ] 2. Inventory
- [ ] 3. Write the tree
- [ ] 4. Validate
- [ ] 5. Report
```

Read [references/layout.md](references/layout.md) before writing files.

## 1. Source and domain

Ask the user in one message, unless given:

- Source and access: Jira or Confluence (Atlassian MCP), TestRail (`sync-test-cases-with-testrail` setup), live app (URL and test account), export or file. No access → stop and ask for the connection or an export.
- Scope as a concrete, repeatable filter: JQL, Confluence space or root page, TestRail sections, app areas and roles.
- Domain: what the product does and for whom, key terms. Not given → infer it from the source.

Name area and features in the domain terms.

Several sources in one run → one output folder each; define all of them first, then run steps 2–4 per source.

## 2. Inventory

List every feature in scope with key or URL, title, status. Navigate all the pages.

When `update`: take into account renamed, moved, deleted issues, pages, sections, cases, and screens. Process them accordingly.

## 3. Write the tree

Catalog README and area READMEs, as [references/layout.md](references/layout.md) describes.

## 4. Validate

```markdown
Structure
- [ ] Catalog README has every fact and the counts; indexes every area
- [ ] Every area README lists its subareas and features; the tree mirrors the source

Content
- [ ] Every feature yml is according to the `references/layout.md`
- [ ] Update: features gone from scope removed
- [ ] Only existing keys and urls are used in the catalog
```

## 5. Report

Where to start. Features synced, skipped by reason.

To a calling skill: features added, changed, and removed.

## Next actions

- `detect-product-mismatches`
- `review-user-story`
- Test cases from requirements → `qa-write-test-cases`
