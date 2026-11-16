# Related Sources

Search for sources not read yet only when the given sources leave a gap:

- no acceptance criteria
- an undefined term, flow, or state
- an unclear expected result
- a referenced feature or screen that no source read so far describes, including each screen a ticket applies to ("all screens with field X")
- a ticket that says an existing X stays unchanged without linking X (template, file layout, screen): find X, the oracle of its regression item
- an API endpoint a test would mock or check: confirm in the sub-tasks of the ticket and of related stories which endpoint serves the data now

Search through the Atlassian MCP, in this order:

1. The ticket's own links: linked issues, sub-tasks, the epic's other issues, and the pages the sub-tasks link or name (the spec a BA sub-task updated).
2. Rovo Search (`search`), one query per gap: the feature, screen, or flow it is about, in the words and language the tickets use. Rovo matches meaning, so it finds issues and pages worded differently from the ticket. Set `targetApp` to `JIRA` or `CONFLUENCE` when the gap belongs to one, and `limit` to 30. Nothing relevant → rephrase once, or switch language when the project writes in two.
3. JQL and CQL, where Rovo's ranked, capped results fall short:
   - Exact identifiers: CQL `text ~ "<ticket key>"`, and `title ~ "<screen code>"` for each screen in scope. Rovo can rank an exact match low.
   - A gap that needs every match (each screen a ticket applies to, every page that names an endpoint): JQL or CQL `text ~ "<term>"`, paged to the end. Rovo returns at most 30 results.
   - Rovo fails or warns that results may be incomplete: JQL `text ~ "<feature name>"` in the ticket's project, and CQL `text ~ "<feature name>"`.

- No ticket → skip step 1, and search without a project filter.
- No Atlassian MCP → ask once to connect it. Declined → skip the search.

Read:

- Titles first. Open only the issues and pages that answer the gap. Rovo searches every project and space: skip results outside the ticket's product, such as QA process pages.
- Use only the parts within the ticket's scope, or the feature's when there is no ticket.
