---
name: sync-test-cases-with-testrail
description: Push Markdown test cases (`*.test.md`) to TestRail through its API, pull (download, export) existing TestRail cases into `*.test.md` files, list TestRail sections and cases, and push a test run's results (`results.md` from `run-test-suite`). Use when the user wants to upload, push, import, or sync test cases to TestRail, pull, download, or export cases from TestRail, check which TestRail cases already exist for a feature, or push test run results.
---

# Sync Test Cases with TestRail

Pushes `*.test.md` files to TestRail as sections and cases, pulls existing cases back into `*.test.md` files, lists existing case titles, and pushes test run results. The script is [scripts/testrail.mjs](./scripts/testrail.mjs) (Node 18+, no dependencies). The file format is defined in the `qa-write-test-cases` skill's [`references/testrail-test-case-format.md`](../qa-write-test-cases/references/testrail-test-case-format.md).

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
| `TESTRAIL_FIELDS`      | Metadata keys to send as case fields, as `key:field_system_name` pairs: `smoke:custom_case_smoketest,automation:custom_automation_type,platform:custom_case_platform` |

- Save values to `.env`. If the folder is a git repo, make sure `.env` is git-ignored.
- Map every case field the project requires (an owner field, for example) in `TESTRAIL_FIELDS` and set its value once on each suite. The field system names come from **Administration → Customizations**.
- The API must be enabled in **Administration → Site Settings → API**.

## Commands

Run from the project root. `<skill>` is this skill's directory.

```bash
node <skill>/scripts/testrail.mjs check <files...>
node <skill>/scripts/testrail.mjs list [--section <name>]
node <skill>/scripts/testrail.mjs list --run <id>
node <skill>/scripts/testrail.mjs pull [--section <name>] [--run <id>] [--out <dir>] [--overwrite]
node <skill>/scripts/testrail.mjs push <files...> --dry-run [--parent-section <name>]
node <skill>/scripts/testrail.mjs push <files...> [--parent-section <name>]
node <skill>/scripts/testrail.mjs results <results.md> --dry-run
node <skill>/scripts/testrail.mjs results <results.md>
```

- `check` validates the files offline. It needs no credentials.
- `list` prints the section tree and case titles with their `C<id>`. `list --run` prints a run's cases with their status in the run.
- `pull` downloads cases into `*.test.md` files. `--out` defaults to `test-cases/`. `--run` keeps only the run's cases.
- `results` pushes a run's results. The `run-test-suite` skill owns the flow and the [Results Format](../run-test-suite/references/results-format.md).
- Use only the options listed here.

## Push

1. Run `check` on the files and fix what it reports.
2. Run `push --dry-run` and show the user the plan: sections to create, cases to add, cases to update.
3. **Push only after the user confirms the plan.** It writes to a shared TestRail project.
4. Run `push` with the same files and options.
5. If the folder is a git repo, commit the files. The push writes `testrail_section_id:` and `testrail_id:` into them.

Rules:

- Pass the files explicitly. Push only `*.test.md` files.
- Each suite becomes a section with the same name. An existing section with that name is reused.
- `--parent-section` nests the sections under a top-level section, created if missing.
- A test with `testrail_id:` is updated in place. A test without it is created. Never edit or remove these lines by hand.
- `priority:` matches the project's priorities by name (`normal` counts as Medium, `important` as High). `push` stops before writing anything if a value matches none of them, and lists the project's priorities.
- Keys mapped in `TESTRAIL_FIELDS` are sent as case fields. `push` stops before writing anything on a dropdown value the field does not offer, and lists the options. It warns when `smoke`, `automation`, or `platform` is used but not mapped.

## Pull

Use `list` when titles are enough. Use `pull` when a skill needs full case content (steps, expected results, preconditions).

1. Run `pull`, with `--section <name>` to limit it to one section and its child sections.
2. Read the files from `--out`.

Rules:

- One file per section that holds cases. The file name is the section path, slugified and joined with `--` (`web-login--sso.test.md`). The suite title is the section's own name.
- Each file carries `testrail_section_id`, `testrail_id`, `priority` (lowercase name), `refs`, the keys mapped in `TESTRAIL_FIELDS`, preconditions, and separated steps with `*Expected*`. A pulled file passes `check`, and `push --dry-run` on it shows no updates for unchanged cases.
- A case from a template without separated steps becomes one step: the Steps text as the action, the Expected text as the result. Pushing it back converts it to the steps template and shows as an update.
- Pull never replaces a local file that differs from the download. It lists those files and writes nothing. Pass `--overwrite` only after the user agrees to lose the local edits.

## Errors

Exit code 1 is a config or validation error. Exit code 2 is an API error that names the endpoint, HTTP status, and TestRail's message.

- `401`: wrong user or API key, or the API is disabled.
- `403`: the user lacks permission to add or edit cases in the project.
- Several suites: set `TESTRAIL_SUITE_ID` to one of the suites the script lists.
- No steps template: set `TESTRAIL_TEMPLATE_ID` to one of the templates the script lists.
