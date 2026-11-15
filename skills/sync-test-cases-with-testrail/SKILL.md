---
name: sync-test-cases-with-testrail
description: Push Markdown test cases (`*.test.md`) to TestRail through its API, pull (download, export) existing TestRail cases into `*.test.md` files, list TestRail sections and cases, and push a test run's results (`results.md` from `run-test-suite`). Use when the user wants to upload, push, import, or sync test cases to TestRail, pull, download, or export cases from TestRail, check which TestRail cases already exist for a feature, push test run results, or see the status and pass rate of test runs for a ticket, milestone, or date.
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
| `TESTRAIL_SUITE_ID`    | Only for projects with several suites. Without it, the script lists their IDs |
| `TESTRAIL_TEMPLATE_ID` | Only when no template name contains "Steps". Without it, the script lists the template IDs |
| `TESTRAIL_FIELDS`      | Metadata keys to send as case fields, as `key:field_system_name` pairs: `smoke:custom_case_smoketest,automation:custom_automation_type,platform:custom_case_platform` |
| `TESTRAIL_OWNER`       | Your name as the project's owner field writes it. New cases get it as owner, and it tells your cases from other QCs' cases |

- Save values to `.env`. If the folder is a git repo, make sure `.env` is git-ignored.
- Map every case field the project requires in `TESTRAIL_FIELDS` and set its value once on each suite. Map the owner field under the key `owner`, such as `owner:custom_case_owner`. The field system names come from **Administration → Customizations**.
- The API must be enabled in **Administration → Site Settings → API**.

## Commands

Run from the project root. `<skill>` is this skill's directory.

```bash
node <skill>/scripts/testrail.mjs check <files...>
node <skill>/scripts/testrail.mjs list [--section <name>]
node <skill>/scripts/testrail.mjs list --run <id>
node <skill>/scripts/testrail.mjs pull [--section <name>] [--run <id>] [--out <dir>] [--overwrite]
node <skill>/scripts/testrail.mjs push <files...> --dry-run [--parent-section <name>]
node <skill>/scripts/testrail.mjs push <files...> [--parent-section <name>] [--confirm-others <case ids>]
node <skill>/scripts/testrail.mjs results <results.md> --dry-run
node <skill>/scripts/testrail.mjs results <results.md>
node <skill>/scripts/testrail.mjs runs [--refs <keys>] [--milestone <name>] [--since <YYYY-MM-DD>] [--active] [--details]
```

- `check` validates the files offline. It needs no credentials.
- `list` prints the section tree and case titles with their `C<id>`. `list --run` prints a run's cases with their status in the run. Both add TestRail's forecast or estimate time to a case's line when it has one.
- `pull` downloads cases into `*.test.md` files. Pass `--out` with the ticket's folder ([Ticket Folder](../gather-context/references/ticket-folder.md)); it defaults to `test-cases/`. `--run` keeps only the run's cases.
- `results` pushes a run's results. A run it creates gets the current TestRail user as owner and now as start date. An existing run gets any `refs` from the run block that it lacks. The `run-test-suite` skill owns the flow and the [Results Format](../run-test-suite/references/results-format.md).
- `runs` prints status counts, executed share, and pass rate of the matching runs, plan runs included. It needs at least one filter, and filters combine with AND. `--details` also lists the tests that did not pass, with their latest result. It only reads TestRail.
- Use only the options listed here.

## Push

1. Run `check` on the files and fix what it reports.
2. Run `push --dry-run`.
3. The plan creates sections or cases: show the user the counts per section, not the dry-run output. **Push only after the user confirms it.** New sections and cases stay in a shared TestRail project. An approval the user already gave for exactly these cases and section, such as option 1 at the `qa-write-test-cases` checklist gate, is that confirmation.
4. The plan only updates your own cases, or cases with no owner: push without asking.
5. The dry-run marks an update to a case another QC owns with `needs --confirm-others`. Show the user each one with its owner and what changes. Push it only if they say yes, by passing its ID in `--confirm-others`. Never confirm one on their behalf. A case they decline: leave it out of the files, or revert its local edit.
6. Run `push` with the same files and options.
7. If the folder is a git repo, commit the files. The push writes `testrail_section_id:` and `testrail_id:` into them.

Rules:

- Pass the files explicitly. Push only `*.test.md` files.
- Each suite becomes a section with the same name. An existing section with that name is reused.
- `--parent-section` nests the sections under a top-level section, created if missing.
- A test with `testrail_id:` is updated in place. A test without it is created. Never edit or remove these lines by hand.
- A new case gets `TESTRAIL_OWNER` as owner. An update never changes a case's owner, and a blank owner stays blank.
- Without `TESTRAIL_OWNER`, every case that has an owner counts as another QC's. With no `owner` field mapped, every case counts as another QC's, since no owner can be read. `push` stops when `TESTRAIL_OWNER` is set but no `owner` field is mapped, or when the field has no option of that name.
- `priority:` matches the project's priorities by name (`normal` counts as Medium, `important` as High). `push` stops before writing anything if a value matches none of them, and lists the project's priorities.
- Keys mapped in `TESTRAIL_FIELDS` are sent as case fields. `push` stops before writing anything on a dropdown value the field does not offer, and lists the options. It warns when `smoke`, `automation`, or `platform` is used but not mapped.

## Pull

Use `list` when titles are enough. Use `pull` when a skill needs full case content (steps, expected results, preconditions).

1. Run `pull`, with `--section <name>` to limit it to one section and its child sections.
2. Read the files from `--out`.

Rules:

- One file per section that holds cases. The file name is the section path, slugified and joined with `--` (`trade--order-book.test.md`). The suite title is the section's own name.
- Each file carries `testrail_section_id`, `testrail_id`, `priority` (lowercase name), `refs`, the keys mapped in `TESTRAIL_FIELDS`, preconditions, and separated steps with `*Expected*`. A pulled file passes `check`, and `push --dry-run` on it shows no updates for unchanged cases.
- A case from a template without separated steps becomes one step: the Steps text as the action, the Expected text as the result. Pushing it back converts it to the steps template and shows as an update.
- Pull never replaces a local file that differs from the download. It lists those files and writes nothing. Pass `--overwrite` only after the user agrees to lose the local edits.

## Errors

Exit code 1 is a config or validation error. Exit code 2 is an API error that names the endpoint, HTTP status, and TestRail's message.

- `401`: wrong user or API key, or the API is disabled.
- `403`: the user lacks permission to add or edit cases in the project.
