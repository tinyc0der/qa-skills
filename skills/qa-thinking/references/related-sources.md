# Related Sources

Search for sources not read yet only when the given sources leave a gap:

- no acceptance criteria
- an undefined term, flow, or state
- an unclear expected result
- a referenced feature that no source describes

Search through the Atlassian MCP:

- Jira: the ticket's linked issues, sub-tasks, and the epic's other issues; then JQL `text ~ "<feature name>"` in the ticket's project.
- Confluence: CQL `text ~ "<feature name>"` and `text ~ "<ticket key>"`.
- No ticket → JQL and CQL `text ~ "<feature name>"`, without a project filter.
- No Atlassian MCP → ask once to connect it. Declined → skip the search.

Read:

- Titles first. Open only the issues and pages that answer the gap.
- Use only the parts within the ticket's scope, or the feature's when there is no ticket.
