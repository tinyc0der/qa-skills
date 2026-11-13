# Related Sources

Search for sources not read yet only when the given sources leave a gap:

- no acceptance criteria
- an undefined term, flow, or state
- an unclear expected result
- a referenced feature or screen that no source read so far describes, including each screen a ticket applies to ("all screens with field X")
- an API endpoint a test would mock or check: confirm in the sub-tasks of the ticket and of related stories which endpoint serves the data now

Search through the Atlassian MCP:

- Jira: the ticket's linked issues, sub-tasks, and the epic's other issues; then JQL `text ~ "<feature name>"` in the ticket's project.
- Confluence: the pages the sub-tasks link or name (the spec a BA sub-task updated); then CQL `text ~ "<feature name>"`, `text ~ "<ticket key>"`, and `title ~ "<screen code>"` for each screen in scope.
- No ticket → JQL and CQL `text ~ "<feature name>"`, without a project filter.
- No Atlassian MCP → ask once to connect it. Declined → skip the search.

Read:

- Titles first. Open only the issues and pages that answer the gap.
- Use only the parts within the ticket's scope, or the feature's when there is no ticket.
