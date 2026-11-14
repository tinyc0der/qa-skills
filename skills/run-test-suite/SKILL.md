---
name: run-test-suite
description: Run manual test cases on the live web app with the `agent-browser` skill, record a Passed, Failed, or Blocked result with screenshot evidence for each case, push the results to a TestRail test run, and hand failed cases to `report-bug`. Works from `*.test.md` files, a TestRail section, a ticket key, or an existing TestRail run. Reads and updates the app's automation lessons so each run is faster than the last. Use when the user says "run the test suite", "run these test cases", "execute the tests for PROJ-123", "run regression", "run smoke on staging", "run test run R123", "test this and record pass/fail", "create a test run", or "push the results to TestRail". Not for writing test cases or filing bugs.
---

# Run Test Suite

Runs test cases on a non-production web app, records one result per case with evidence, and pushes the results to TestRail. Each run leaves the app's automation lessons better than it found them.

References:

- [Results Format](./references/results-format.md) defines `results.md` and how the `results` command of `sync-test-cases-with-testrail` maps it to TestRail.
- [Automation Lessons](./references/automation-lessons.md) defines the per-app lesson files and what belongs in them.
- [UI Checks](./references/ui-checks.md) defines how to read displayed values, transient states, and screenshots.
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
| Ticket key          | Cases whose `refs` include the key, in `test-cases/` or a pull. None found → tell the user the story's cases lack refs; never swap in a whole section on your own. |
| TestRail run `R<id>` | `list --run <id>` for statuses, then `pull --run <id> --out <run folder>/cases`. Default scope: cases Untested or Retest in the run. |
| TestRail link       | Case link: that case. Section link: its `group_id` is the section ID that `list` prints; pull that section. A run link the user gives as the case list for a new run: `pull --run <id>`, without `testrail_run_id`. |

Scope by kind of run:

- New feature: every case of the story.
- Fix verification: the failed cases, plus cases in the same flow.
- Regression: cases in the sections the change touches. Ask which areas changed when no ticket says.
- Smoke: cases with `smoke: yes`, or the ones the user names.

Order the cases so setup is shared: group by precondition and start page, and put cases that delete or reset data last in their group.

Write `results.md` per [Results Format](./references/results-format.md): one run block, then one `untested` result block per case in run order. For a TestRail run, set `testrail_run_id: R<id>` in the run block; without it, the push creates a new run. Set `milestone:` to the TestRail milestone named after the story's sprint, picked as `report-bug` picks it, or after the release for a regression. No milestone of that name → leave it out and say so in the plan. A case without `testrail_id` gets an empty `case:` and stays local; push it first with `sync-test-cases-with-testrail` to get its result onto TestRail.

### Step 2: Prepare the session

1. Find the app's lesson file in `automation-lessons/` by its URL and read it. Use its session, navigation, and wait lessons from the first command.
2. Load the `agent-browser` skill. Its `SKILL.md` is a stub: run `agent-browser skills get core` before the first command.
3. Environment: a non-production URL, test account, and role, from the user or the lesson file. **Never run on production.**
4. Open one named session for the run with restore, as the lesson file says. Without a lesson, open `agent-browser --session <app>-qa --restore open <url>`.
5. Set the viewport the lesson file names, else `agent-browser set viewport 1920 1080`. Read the real size with `eval '[innerWidth, innerHeight]'` and write it in the run description. A case with its own viewport sets it and restores the run's after.
6. Check sign-in from the UI before logging in. A restored session can be signed out, and a live one needs no login. Log in with `agent-browser auth login <alias>` from the auth vault. Never put passwords in commands or files.
7. Read the build from the app, not from the environment name: the version string it shows, else the version or hash in its script bundle URL, from `eval 'performance.getEntriesByType("resource").map(e => e.name)'`. Write it to `build:` in `results.md`.

Show the plan:

- cases to run (count and list), and cases left out with the reason
- environment URL, account, role, build
- cases that save, change, or delete data
- run order, and parallel lanes if any
- estimated time: the sum of each case's latest `elapsed` in earlier `results.md` files under `test-runs/`, else its forecast or estimate that `list` prints. Add the last run's setup and waiting: its run time minus the sum of its `elapsed`. Count the cases with no number.

```
❓ Do you want to:

1. ✅ Run
2. ✏️ Type changes
```

Run only after the user approves. The approval covers the data changes the listed cases make.

### Step 3: Run the cases

Runner subagents run the cases, one batch of up to 10 cases at a time, in the same named session. Each runner gets its cases, the `results.md` path, the run folder, the lesson file, [Results Format](./references/results-format.md), [UI Checks](./references/ui-checks.md), and the rules below. It returns its results, lesson candidates (what was slow or broke, and the fix that worked), and user actions still needed. Runners never push to TestRail or file bugs: the main session reviews every result first.

Risky scope (money, sign-in and permissions, data hard to restore, personal data): the first batch is one happy path, one negative case, and one boundary case. Review them per Step 4 before the next batch. Fix a setup problem and rerun them; a case that needs a fix is `blocked`. Their results count for the run.

Parallel lanes only when each lane has its own test account, the lanes share no data, and the accounts share no OTP device. A sequence that builds on itself (create, edit, cancel) stays in one lane. Each lane:

- opens its own session, `agent-browser --session <app>-qa-<n> --restore`, and never shares a `--profile` or `--state` file with another lane: shared cookies are one server session, so the lanes sign each other out.
- logs in once at the start and keeps the session: repeated logins can lock the account.
- writes its blocks to `results-<n>.md`.

Start with two small lanes and check that the first is still signed in before handing out the rest. The main session merges the lanes into `results.md`. A case with no block after the merge stays `untested`: name the lane that missed it and rerun the case.

Without subagents, run the batches yourself.

Per case:

- Follow the steps as written from the first step. A step that passes only after a reload, retry, or other action not in the case is failed. Put the extra action in the result: it is how to reproduce.
- Rerun a step only when its first attempt failed from the agent's own mistake (stale ref, page not loaded yet). Say so in the runner's report, not in the result.
- Read each value from the page per [UI Checks](./references/ui-checks.md) and compare it with Expected. Never judge from a screenshot or from the absence of an error. A step right after switching context or submitting a form also needs its transient frames captured.
- Record every step in `observed` as passed, failed, or not observed, with the value read. Status from the worst step: a failed step → `failed`; a step that cannot run because of a verified blocker → `blocked`; steps that do not match the app or have no checkable Expected → `blocked` with "case needs fix"; every step observed and passed → `passed`. A step not observed for another reason leaves the case `untested` with the reason.
- Take screenshots with `agent-browser screenshot --full <run folder>/<file>`. Open each before the next step: readable, right state, shows the value judged.
  - `C<id>-step<n>.png` right after a step that fails, a step judged from a screenshot, or a step whose value a later step replaces.
  - `C<id>.png` for the final state. Add `C<id>-02.png` for scrolled areas. Never zoom out or widen the viewport to fit a screenshot: it hides real overflow bugs.
- Before `passed`, check every screenshot of the case per [UI Checks](./references/ui-checks.md#check-the-screenshots) and write the outcome in `checked`.
- Write the result block right after the case, not at the end of the batch. Set `run_at` to the time of the verdict. Set `elapsed` to the case's own time, without waits for the user or reruns caused by the agent.
- After a reload, a new session, or a deploy notice, read the build again. Changed → set `build:` on the results after the change.
- **The first cases all fail → check sign-in, role, data, and build before trusting any result.**
- A blocker stops only the cases that depend on it. Run every independent case.
- OTP, MFA, CAPTCHA, or a step only a person can do: send the user one short message (case, step, what to do) and run other cases meanwhile. Still not done at the end → `blocked`, owner the user.
- Never write a `passed` the runner did not observe.

After the last batch, close every session the run opened, lanes included: `agent-browser --session <name> close`. Then check `agent-browser session list` and close any the run left behind, such as a lane whose runner stopped. A session where the user is still signing in or entering an OTP stays open until they finish. Never `close --all`: it closes other work's sessions.

### Step 4: Review the results

The main session reviews every block once, before the push, with the feature's context file (`test-cases/<feature>.context.md`, per [Context File](../gather-context/references/context-file.md)) at hand:

- Each `failed`: reopen the evidence. It must show the failing step. If it does not, rerun the case, or set it back to `untested` with the reason.
- A difference the context file's `Conflicts` or `Answers` settles follows that entry.
- Text that differs from Expected is `failed` when a source (story, design, spec) fixes the text. It is "case needs fix" only when the sources leave the text open.
- A product defect seen outside the case's steps is not a result. Keep it for the report, for `report-bug` or a question to the PO.
- A failed case the user judges "case wrong, not product wrong" becomes `blocked` with "case needs fix". Fix the case later with `improve-test-cases`.
- The user decides a rule or accepts a difference between the app and a source → record it in the context file: the rule in `Answers`, with who decided and where; the accepted difference in `Conflicts`, with the side followed. The next case written and the next run then follow it.

### Step 5: Push to TestRail

```bash
node <sync skill>/scripts/testrail.mjs results <run folder>/results.md --dry-run
node <sync skill>/scripts/testrail.mjs results <run folder>/results.md
```

1. Run `--dry-run` and fix what it reports. A case changed on TestRail after its `run_at`: run it again, or set its block back to `untested` with the reason "case changed on <date>".
2. Show the plan: the run to create (name, refs, milestone, owner, case count) or the existing run and the refs the push adds to it, results by status, files to attach.
3. **Push only after the user confirms the plan.** It writes to a shared TestRail project.
4. Run the push. It writes the IDs back into `results.md` and posts only what TestRail does not have yet, as [Results Format](./references/results-format.md) describes.

Every later push, after a status change or new Bug keys, goes through these steps again.

Exit code 2 with "may have saved" means TestRail may hold the write without its ID in `results.md`. Check with `list --run <id>`, or the run list in TestRail, before pushing again. A blind rerun posts duplicates.

The user asked to run only, not push → keep the results local and say so in the report.

The user asks only to create the run → Step 1, then this step with every block `untested`. The run gets its cases and no results.

### Step 6: Hand failed cases to report-bug

- Each `failed` case → `report-bug` with the case, its result block, and its evidence.
- `report-bug` returns a Bug key → add it to the block's `defects:`. After the last Bug, push the keys through Step 5.

### Step 7: Save automation lessons

Update `automation-lessons/<app>.md` per [Automation Lessons](./references/automation-lessons.md), from the runners' lesson candidates and the `elapsed` times:

- Add what saved time or prevented a false result, with the exact command, URL, or wait.
- Fix or delete each lesson this run contradicted.
- For the slowest cases, look for a shortcut (deep link, data setup, case order) and record it.

### Step 8: Report

- For the user to decide, first: product defects outside the case steps, cases that need a fix, results not pushed. The story adds or changes screens and links Figma frames → offer `detect-product-mismatches` on the live app and Figma for that feature.
- Counts by status, zeros included, the TestRail run link, and the `results.md` path. Part of an existing run: this run's counts, then the run's totals.
- Cases left out because they already had a result: count by status, outside this run's counts.
- Run time against the estimate.
- Failed: case link, failing step with Expected vs Actual, evidence, Bug key or "Bug pending".
- Blocked: reason, owner, and what unblocks it.
- Untested: case and reason.
- Lessons added, changed, or removed, one line each.
