---
name: run-test-suite
description: Run manual test cases on the live web app with the `agent-browser` skill, record a Passed, Failed, or Blocked result with screenshot evidence for each case, push the results to a TestRail test run, and hand failed cases to `report-bug`. Works from `*.test.md` files, a TestRail section, a ticket key, or an existing TestRail run. Reads and updates the app's automation lessons so each run is faster than the last. Use when the user says "run the test suite", "run these test cases", "execute the tests for PROJ-123", "run regression", "run smoke on staging", "run test run R123", "test this and record pass/fail", "create a test run", or "push the results to TestRail". Not for writing test cases or filing bugs.
---

# Run Test Suite

Runs test cases on a non-production web app, records one result per case with evidence, and pushes the results to TestRail. Each run leaves the app's automation lessons better than it found them.

References:

- [Results Format](./references/results-format.md) defines `results.md` and how the `results` command of `sync-test-cases-with-testrail` maps it to TestRail.
- [Automation Lessons](./references/automation-lessons.md) defines the per-app lesson files and what belongs in them.
- [Test Case Format](../qa-write-test-cases/references/testrail-test-case-format.md) of `qa-write-test-cases` defines the `*.test.md` cases this skill runs.

TestRail commands run the script of `sync-test-cases-with-testrail`: `node <sync skill>/scripts/testrail.mjs <command>`, with the setup that skill describes.

## Workflow

1. Select cases
2. Prepare the session — approval gate
3. Run the cases
4. Review the results
5. Push to TestRail — approval gate
6. Hand failed cases to `report-bug`
7. Save automation lessons
8. Report

### Step 1: Select cases

Create the run folder `test-runs/<YYYY-MM-DD>-<slug>/` in the QA workspace. Find the cases by source:

| Source              | Cases                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `*.test.md` files   | Use them as they are.                                                                      |
| TestRail section    | `pull --section <name> --out <run folder>/cases`                                           |
| Ticket key          | Cases whose `refs` include the key, in `test-cases/` or a pull.                            |
| TestRail run `R<id>` | `list --run <id>` for statuses, then `pull --run <id> --out <run folder>/cases`. Default scope: cases Untested or Retest in the run. |

Scope by kind of run:

- New feature: every case of the story.
- Fix verification: the failed cases, plus cases in the same flow.
- Regression: cases in the sections the change touches. Ask which areas changed when no ticket says.
- Smoke: cases with `smoke: yes`, or the ones the user names.

Order the cases so setup is shared: group by precondition and start page, and put cases that delete or reset data last in their group.

Write `results.md` per [Results Format](./references/results-format.md): one run block, then one `untested` result block per case in run order. For a TestRail run, set `testrail_run_id: R<id>` in the run block; without it, the push creates a new run. A case without `testrail_id` gets an empty `case:` and stays local; push it first with `sync-test-cases-with-testrail` to get its result onto TestRail.

### Step 2: Prepare the session

1. Find the app's lesson file in `automation-lessons/` by its URL and read it. Use its session, navigation, and wait lessons from the first command.
2. Load the `agent-browser` skill. Its `SKILL.md` is a stub: run `agent-browser skills get core` before the first command.
3. Environment: a non-production URL, test account, and role, from the user or the lesson file. **Never run on production.**
4. Open one named session for the run with restore, as the lesson file says. Without a lesson, open `agent-browser --session <app>-qa --restore open <url>`.
5. Check sign-in from the UI before logging in. A restored session can be signed out, and a live one needs no login. Log in with `agent-browser auth login <alias>` from the auth vault. Never put passwords in commands or files.
6. Read the build from the app (version string or bundle), not from the environment name. Write it to `build:` in `results.md`.

Show the plan:

- cases to run (count and list), and cases left out with the reason
- environment URL, account, role, build
- cases that save, change, or delete data
- run order, and parallel lanes if any

```
❓ Do you want to:

1. ✅ Run
2. ✏️ Type changes
```

Run only after the user approves. The approval covers the data changes the listed cases make.

### Step 3: Run the cases

Runner subagents run the cases, one batch of up to 10 cases at a time, in the same named session. Each runner gets its cases, the `results.md` path, the run folder, the lesson file, [Results Format](./references/results-format.md), and the rules below. It returns its results, lesson candidates (what was slow or broke, and the fix that worked), and user actions still needed.

Parallel lanes only when the user gives one test account per lane and the lanes share no data. Each lane gets its own session and writes its blocks to `results-<n>.md`. The main session merges them into `results.md`.

Without subagents, run the batches yourself.

Per case:

- Follow the steps as written from the first step. A step that passes only after a reload, retry, or other action not in the case is failed. Put the extra action in the result: it is how to reproduce.
- Rerun a step only when its first attempt failed from the agent's own mistake (stale ref, page not loaded yet). Say so in the runner's report, not in the result.
- Read values from the page with `get text` or `eval` and compare them with Expected. Never judge from a screenshot or from the absence of an error.
- Status from the worst step: a failed step → `failed`; a step that cannot run because of a verified blocker → `blocked`; steps that do not match the app or have no checkable Expected → `blocked` with "case needs fix"; every step observed and passed → `passed`. A step not observed for another reason leaves the case `untested` with the reason.
- Take the screenshot at the moment of the verdict: `agent-browser screenshot --full <run folder>/C<id>.png`. Add `C<id>-02.png` for scrolled areas. Open it before leaving the case: readable, right state, shows the value judged.
- Write the result block right after the case, not at the end of the batch. Set `elapsed` to the case's own time, without waits for the user or reruns caused by the agent.
- **The first cases all fail → check sign-in, role, data, and build before trusting any result.**
- A blocker stops only the cases that depend on it. Run every independent case.
- OTP, MFA, CAPTCHA, or a step only a person can do: send the user one short message (case, step, what to do) and run other cases meanwhile. Still not done at the end → `blocked`, owner the user.
- Never write a `passed` the runner did not observe.

After the last batch, close the run's session: `agent-browser --session <name> close`. Never `close --all`.

### Step 4: Review the results

The main session reviews every block once, before the push:

- Each `failed`: reopen the evidence. It must show the failing step. If it does not, rerun the case, or set it back to `untested` with the reason.
- Text that differs from Expected is `failed` when a source (story, design, spec) fixes the text. It is "case needs fix" only when the sources leave the text open.
- A product defect seen outside the case's steps is not a result. Keep it for the report, for `report-bug` or a question to the PO.
- A failed case the user judges "case wrong, not product wrong" becomes `blocked` with "case needs fix". Fix the case later with `improve-test-cases`.

### Step 5: Push to TestRail

```bash
node <sync skill>/scripts/testrail.mjs results <run folder>/results.md --dry-run
node <sync skill>/scripts/testrail.mjs results <run folder>/results.md
```

1. Run `--dry-run` and fix what it reports.
2. Show the plan: the run to create (name, refs, milestone, case count) or the existing run, results by status, files to attach.
3. **Push only after the user confirms the plan.** It writes to a shared TestRail project.
4. Run the push. It writes the IDs back into `results.md` and posts only what TestRail does not have yet, as [Results Format](./references/results-format.md) describes.

Every later push, after a status change or new Bug keys, goes through these steps again.

Exit code 2 with "may have saved" means TestRail may hold the write without its ID in `results.md`. Check with `list --run <id>`, or the run list in TestRail, before pushing again. A blind rerun posts duplicates.

The user asked to run only, not push → keep the results local and say so in the report.

### Step 6: Hand failed cases to report-bug

- Each `failed` case → `report-bug` with the case, its result block, and its evidence.
- `report-bug` returns a Bug key → add it to the block's `defects:`. After the last Bug, push the keys through Step 5.

### Step 7: Save automation lessons

Update `automation-lessons/<app>.md` per [Automation Lessons](./references/automation-lessons.md), from the runners' lesson candidates and the `elapsed` times:

- Add what saved time or prevented a false result, with the exact command, URL, or wait.
- Fix or delete each lesson this run contradicted.
- For the slowest cases, look for a shortcut (deep link, data setup, case order) and record it.

### Step 8: Report

- Counts by status, zeros included, the TestRail run link, and the `results.md` path.
- Failed: case link, failing step with Expected vs Actual, evidence, Bug key or "Bug pending".
- Blocked: reason, owner, and what unblocks it.
- Untested: case and reason.
- For the user to decide: product defects outside the case steps, cases that need a fix, results not pushed.
- Lessons added, changed, or removed, one line each.
