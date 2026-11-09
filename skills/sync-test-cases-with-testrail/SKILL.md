---
name: sync-test-cases-with-testrail
description: Push Markdown test cases (`*.test.md`) to TestRail through its API, and list existing TestRail sections and cases. Use when the user wants to upload, push, import, or sync test cases to TestRail, or check which TestRail cases already exist for a feature.
---

# Sync Test Cases with TestRail

Pushes `*.test.md` files to TestRail as sections and cases, and lists existing cases for deduplication. The script is [scripts/testrail.mjs](./scripts/testrail.mjs) (Node 18+, no dependencies). The file format is defined in the `qa-write-test-cases` skill's [`references/testrail-test-case-format.md`](../qa-write-test-cases/references/testrail-test-case-format.md).

## Setup

The script reads these variables from the environment, then from `.env` in the current directory:

| Variable               | Value                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| `TESTRAIL_URL`         | Instance URL, e.g. `https://example.testrail.io`                            |
| `TESTRAIL_USER`        | TestRail user email                                                         |
| `TESTRAIL_API_KEY`     | API key from **My Settings → API Keys**                                     |
| `TESTRAIL_PROJECT_ID`  | Project ID, the number in `index.php?/projects/overview/<id>`               |
| `TESTRAIL_SUITE_ID`    | Only for projects with several suites                                       |
| `TESTRAIL_TEMPLATE_ID` | Only when the project has no template named like "Test Case (Steps)"        |

- Save values to `.env` and make sure `.env` is git-ignored.
- The API must be enabled in **Administration → Site Settings → API**.

## Commands

Run from the project root. `<skill>` is this skill's directory.

```bash
node <skill>/scripts/testrail.mjs check <files...>
node <skill>/scripts/testrail.mjs list [--section <name>]
node <skill>/scripts/testrail.mjs push <files...> --dry-run [--parent-section <name>]
node <skill>/scripts/testrail.mjs push <files...> [--parent-section <name>]
```

- `check` validates the files offline. It needs no credentials.
- `list` prints the section tree and case titles with their `C<id>`.
- Use only the options listed here.

## Push

1. Run `check` on the files and fix what it reports.
2. Run `push --dry-run` and show the user the plan: sections to create, cases to add, cases to update.
3. **Push only after the user confirms the plan.** It writes to a shared TestRail project.
4. Run `push` with the same files and options.
5. Commit the files. The push writes `testrail_section_id:` and `testrail_id:` into them.

Rules:

- Pass the files explicitly. Push only `*.test.md` files.
- Each suite becomes a section with the same name. An existing section with that name is reused.
- `--parent-section` nests the sections under a top-level section, created if missing.
- A test with `testrail_id:` is updated in place. A test without it is created. Never edit or remove these lines by hand.
- `priority:` matches the project's priorities by name (`normal` counts as Medium, `important` as High). An unknown value gets the project's default priority.

## Errors

Exit code 1 is a config or validation error. Exit code 2 is an API error that names the endpoint, HTTP status, and TestRail's message.

- `401`: wrong user or API key, or the API is disabled.
- `403`: the user lacks permission to add or edit cases in the project.
- Several suites: set `TESTRAIL_SUITE_ID` to one of the suites the script lists.
- No steps template: set `TESTRAIL_TEMPLATE_ID` to one of the templates the script lists.
