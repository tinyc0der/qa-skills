# Catalog layout

The tree mirrors how the source groups its content: epics, page tree, TestRail sections, app navigation.

```
catalog/                     # output folder
  README.md                  # source facts, counts, areas, ungrouped features
  {area}/                    # epic, parent page, TestRail section, app menu section; any depth
    README.md                # the area's own link/path, subarea if any, its features
    {feature}.yaml           # feature page
    {subarea}/               # subarea (optional)
      README.md              # the subarea own link/path, name, its features; breadcrumbs
      {feature}.yaml         # feature page; breadcrumbs; feature info (below)
    ...
```

## Formatting

Every `.md` should include info about its entity and child entities list (if any). Relative links between catalog pages.

README.md in catalog root:

| Fact    | Value                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------- |
| Type    | Jira, Confluence, TestRail, live app, or other                                                        |
| Role    | Actual, Intended, or Documented (SKILL.md › Source roles)                                             |
| Scope   | Defined by user (or inferred)                                                                         |
| History | Important for sources like Jira                                                                       |
| Access  | Atlassian MCP, `sync-test-cases-with-testrail`, `agent-browser`, URL, files                                   |
| Date    | Date of this sync; live app: app version (About page or release notes); Jira: creation and resolution |
| Domain  | What the product does and for whom; infer if not given                                                |

## Feature YAML

Name: {feature-name}.yaml

Feature YAML should include:

- Key [optional]. Do not invent. Use only if the source provides it.
- Title: short description of the feature.
- Links/headings: link(s) to sources that describe the feature (issue, page, or case URL; live app: URL + navigation path); headings in case source is a document.

No description, requirements or other details.
