---
name: run-test-suite
description: Run manual test cases on the live web app with the `agent-browser` skill or on an Android or iOS device with the `agent-device` skill, record a Passed, Failed, or Blocked result with screenshot evidence for each case, push the results to a TestRail test run, and hand failed cases to `report-bug`. Works from `*.test.md` files, a TestRail section, a ticket key, or an existing TestRail run. Reads and updates the app's automation lessons so each run is faster than the last. Use when the user says "run the test suite", "run these test cases", "execute the tests for PROJ-123", "run regression", "run smoke on staging", "run these cases on the Android or iOS app", "run test run R123", "test this and record pass/fail", "create a test run", or "push the results to TestRail". Not for writing test cases or filing bugs.
---

# Run Test Suite

Runs test cases on a non-production web, Android, or iOS app, records one result per case with evidence, and pushes the results to TestRail. Each run leaves the app's automation lessons better than it found them.

References:

- [Results Format](./references/results-format.md) defines `results.md` and how the `results` command of `sync-test-cases-with-testrail` maps it to TestRail.
- [Automation Lessons](./references/automation-lessons.md) defines the per-app lesson files and what belongs in them.
- [UI Checks](./references/ui-checks.md) defines how to read displayed values, transient states, and screenshots.
- [Device Session](./references/device-session.md) defines how Android and iOS cases pick a device, open the app, read its build, and take evidence.
- [Test Case Format](../qa-write-test-cases/references/testrail-test-case-format.md) of `qa-write-test-cases` defines the `*.test.md` cases this skill runs.

TestRail commands run the script of `sync-test-cases-with-testrail`: `node <sync skill>/scripts/testrail.mjs <command>`, with the setup that skill describes.

## Workflow

1. Select cases
2. Prepare the session — the one approval gate, when needed
3. Run the cases
4. Review the results
5. Push to TestRail
6. Hand failed cases to `report-bug`
7. Save automation lessons
8. Report

### Step 1: Select cases

Create the run folder `test-runs/<YYYY-MM-DD>-<slug>/` in the QA workspace. Find the cases by source:

| Source              | Cases                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `*.test.md` files   | Files with `testrail_id`: run `push --dry-run` on them first. A case it would update differs from TestRail: pull TestRail's copy into `<run folder>/cases`, run that, and list the case in the report as differing locally. |
| TestRail section    | `pull --section <name> --out <run folder>/cases`                                           |
| Ticket key          | Cases whose `refs` include the key, in the story's ticket folder or a pull. None found → tell the user the story's cases lack refs; never swap in a whole section on your own. |
| TestRail run `R<id>` | `list --run <id>` for statuses, then `pull --run <id> --out <run folder>/cases`. Default scope: cases Untested or Retest in the run. |
| TestRail link       | Case link: that case. Section link: its `group_id` is the section ID that `list` prints; pull that section. A run link the user gives as the case list for a new run: `pull --run <id>`, without `testrail_run_id`. |

Scope by kind of run:

- New feature: every case of the story.
- Fix verification: the failed cases, plus cases in the same flow.
- Regression: cases in the sections the change touches. No ticket says which areas changed → ask in the Step 2 message.
- Smoke: cases with `smoke: yes`, or the ones the user names.

Platform of each case, from its `platform`: a web option runs in the browser, an Android or iOS option on that OS, and a mobile option on each mobile OS of the run. `All`, or no platform, runs on every platform of the run: the ones the user names, else the ones the story covers.

Order the cases so setup is shared: group by precondition and start page, and put cases that delete or reset data last in their group.

Write `results.md` per [Results Format](./references/results-format.md): one run block, then one `untested` result block per case in run order. For a TestRail run, set `testrail_run_id: R<id>` in the run block; without it, the push creates a new run. Set `milestone:` to the TestRail milestone named after the story's sprint, picked as `report-bug` picks it, or after the release for a regression. No milestone of that name → leave it out and say so in the plan. A case without `testrail_id` gets an empty `case:` and stays local; push it first with `sync-test-cases-with-testrail` to get its result onto TestRail.

### Step 2: Prepare the session

Once per platform of the run. Android and iOS follow [Device Session](./references/device-session.md) in place of items 2, 4, 5, and 7.

1. Find the app's lesson file in `automation-lessons/` by its URL, Android package, or iOS bundle ID, and read it. Use its session, navigation, and wait lessons from the first command.
2. Load the `agent-browser` skill. Its `SKILL.md` is a stub: run `agent-browser skills get core` before the first command.
3. Environment: a non-production URL, test account, and role, from the user or the lesson file. Each platform uses its own account: one account on two platforms mixes their data. **Never run on production.**
4. Open one named session for the run with restore, as the lesson file says. Without a lesson, open `agent-browser --session <app>-qa --restore open <url>`.
5. Set the viewport the lesson file names, else `agent-browser set viewport 1920 1080`. Read the real size with `eval '[innerWidth, innerHeight]'` and write it in the run description. A case with its own viewport sets it and restores the run's after.
6. Check sign-in from the UI before logging in. A restored session can be signed out, and a live one needs no login. Log in with `agent-browser auth login <alias>` from the auth vault. Never put passwords in commands or files.
7. Read the build from the app, not from the environment name: the version string it shows, else the version or hash in its script bundle URL, from `eval 'performance.getEntriesByType("resource").map(e => e.name)'`. Write it to `build:` in `results.md`. A run on several platforms names each build, such as `staging · web 2.14.3 · android 4.12.0 (4120) · ios 4.12.0 (812)`.

Show the plan as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out:

- cases to run (count and list), and cases left out with the reason
- environment URL, account, role, build, per platform, and the device for each mobile platform
- cases that save, change, or delete data
- run order, and parallel lanes if any
- estimated time: the sum of each case's latest `elapsed` in earlier `results.md` files under `test-runs/`, else its forecast or estimate that `list` prints. Add the last run's setup and waiting: its run time minus the sum of its `elapsed`. Count the cases with no number.
- where results go: the TestRail run to create (name, milestone) or the existing run, or local only

Ask before the first case only when the run creates a TestRail run, has cases in risky scope (Step 3) that save, change, or delete data, or has an open question: an environment or account no lesson file names (item 3), changed areas (Step 1), or which device ([Device Session](./references/device-session.md)). Put every such question in this one message. Otherwise show the plan and start.

```
❓ Start the run?

1. ✅ Run and push the results
2. ✏️ Type changes
```

The approval covers the data changes the listed cases make and creating the TestRail run the plan names. **After it, only steps a person must do (Step 3) and the Bug drafts (Step 6) wait for the QC.** The run and the push finish while the QC is away.

### Step 3: Run the cases

Runner subagents run the cases, one batch of up to 10 cases at a time, in the same named session. Each runner gets its cases, the `results.md` path, the run folder, the lesson file, [Results Format](./references/results-format.md), [UI Checks](./references/ui-checks.md), [Device Session](./references/device-session.md) for Android and iOS, and the rules below. It returns its results, lesson candidates (what was slow or broke, and the fix that worked), and user actions still needed. Runners never push to TestRail or file bugs: the main session reviews every result first.

Risky scope (money, sign-in and permissions, data hard to restore, personal data): the first batch is one happy path, one negative case, and one boundary case. Review them per Step 4 before the next batch. Fix a setup problem and rerun them; a case that needs a fix is `blocked`. Their results count for the run.

Parallel lanes only when each lane has its own test account, the lanes share no data, and the accounts share no OTP device. A sequence that builds on itself (create, edit, cancel) stays in one lane. Each lane:

- opens its own session, `agent-browser --session <app>-qa-<n> --restore`, and never shares a `--profile` or `--state` file with another lane: shared cookies are one server session, so the lanes sign each other out.
- on Android or iOS, has its own device and session `<app>-qa-<os>-<n>`: two lanes on one device take the screen from each other.
- logs in once at the start and keeps the session: repeated logins can lock the account.
- writes its blocks to `results-<n>.md`.

Start with two small lanes and check that the first is still signed in before handing out the rest. The main session merges the lanes into `results.md`. A case with no block after the merge stays `untested`: name the lane that missed it and rerun the case.

Without subagents, run the batches yourself.

Per case:

- Follow the steps as written from the first step. A step that passes only after a reload, retry, or other action not in the case is failed. Put the extra action in the result: it is how to reproduce.
- Rerun a step only when its first attempt failed from the agent's own mistake (stale ref, page not loaded yet). Say so in the runner's report, not in the result.
- Read each value from the page per [UI Checks](./references/ui-checks.md) and compare it with Expected. Never judge from a screenshot or from the absence of an error. A step right after switching context or submitting a form also needs its transient frames captured.
- Record every step in `observed` as passed, failed, or not observed, with the value read. Status from the worst step: a failed step → `failed`; a step that cannot run because of a verified blocker → `blocked`; steps that do not match the app or have no checkable Expected → `blocked` with "case needs fix"; every step observed and passed → `passed`. A step not observed for another reason leaves the case `untested` with the reason.
- Take screenshots with `agent-browser screenshot --full <run folder>/<file>`, or on a device `agent-device screenshot <run folder>/<file>`. Open each before the next step: readable, right state, shows the value judged.
  - `C<id>-step<n>.png` right after a step that fails, a step judged from a screenshot, or a step whose value a later step replaces.
  - `C<id>.png` for the final state. Add `C<id>-02.png` for scrolled areas. Never zoom out or widen the viewport to fit a screenshot: it hides real overflow bugs.
- A case run on several platforms keeps one result block, since TestRail holds one status per case. Each `observed` step covers every platform, such as `2 failed (web: "Saved"; ios: no toast)`. The status comes from the worst platform. Screenshot names end in `-web`, `-android`, or `-ios`. `run_at` is the earliest verdict, and `elapsed` is the sum.
- Before `passed`, check every screenshot of the case per [UI Checks](./references/ui-checks.md#check-the-screenshots) and write the outcome in `checked`.
- Write the result block right after the case, not at the end of the batch. Set `run_at` to the time of the verdict. Set `elapsed` to the case's own time, without waits for the user or reruns caused by the agent.
- After a reload, a new session, or a deploy notice, read the build again. Changed → set `build:` on the results after the change.
- **The first cases all fail → check sign-in, role, data, and build before trusting any result.**
- A blocker stops only the cases that depend on it. Run every independent case.
- OTP, MFA, CAPTCHA, a step on the device itself, or any other step only a person can do: send the user one short message (case, step, what to do) and run other cases meanwhile. Still not done at the end → `blocked`, owner the user.
- Never write a `passed` the runner did not observe.

After the last batch, close every session the run opened, lanes included: `agent-browser --session <name> close`, and on Android and iOS as [Device Session](./references/device-session.md#close) says. Then check `agent-browser session list` and `agent-device session list`, and close any the run left behind, such as a lane whose runner stopped. A session where the user is still signing in or entering an OTP stays open until they finish. Never `close --all`: it closes other work's sessions.

### Step 4: Review the results

The main session reviews every block once, before the push, with the ticket's context file ([Ticket Folder](../gather-context/references/ticket-folder.md)) at hand:

- Each `failed`: reopen the evidence. It must show the failing step. If it does not, rerun the case, or set it back to `untested` with the reason.
- A difference the context file's `Conflicts` or `Answers` settles follows that entry.
- Text that differs from Expected is `failed` when a source (story, design, spec) fixes the text. It is "case needs fix" only when the sources leave the text open.
- A product defect seen outside the case's steps is not a result. Keep it for the report, for `report-bug` or a question to the PO.
- A failed case the user judges "case wrong, not product wrong" becomes `blocked` with "case needs fix". Fix the case later with `improve-test-cases`.
- The user decides a rule or accepts a difference between the app and a source → record it in the context file: the rule in `Answers`, with who decided and where; the accepted difference in `Conflicts`, with the side followed. Other QCs see only TestRail and Jira: list a comment on the story among the report's decisions, and keep the comment's link once posted.

### Step 5: Push to TestRail

```bash
node <sync skill>/scripts/testrail.mjs results <run folder>/results.md --dry-run
node <sync skill>/scripts/testrail.mjs results <run folder>/results.md
```

1. Run `--dry-run` and fix what it reports. A case changed on TestRail after its `run_at`: run it again, or set its block back to `untested` with the reason "case changed on <date>".
2. The push creates a run: create it only when the Step 2 approval named it, since a wrong run stays in the shared project and deleting it needs rights the user may not have. A run Step 2 did not name: show its name, refs, milestone, and case count, and ask.
3. Otherwise push without asking. TestRail adds results and never overwrites them: a wrong one gets a correction result, and both stay in the history.
4. Run the push. It writes the IDs back into `results.md` and posts only what TestRail does not have yet, as [Results Format](./references/results-format.md) describes.

Every later push, after a status change, new Bug keys, or refs, goes through these steps again. A status the user changes is their go-ahead to push it.

Exit code 2 with "may have saved" means TestRail may hold the write without its ID in `results.md`. Check with `list --run <id>`, or the run list in TestRail, before pushing again. A blind rerun posts duplicates.

The user asked to run only, not push → keep the results local and say so in the report.

The user asks only to create the run → Step 1, then this step with every block `untested`. The run gets its cases and no results.

### Step 6: Hand failed cases to report-bug

- Hand every `failed` case to `report-bug` at once, with its result block and evidence. It drafts all the Bugs, and the Step 8 report carries its one question for the batch.
- The QC answers the report → `report-bug` creates the Bugs. Add each key to its block's `defects:` and push the keys through Step 5 in the same turn.

### Step 7: Save automation lessons

Update `automation-lessons/<app>.md` per [Automation Lessons](./references/automation-lessons.md), from the runners' lesson candidates and the `elapsed` times:

- Add what saved time or prevented a false result, with the exact command, URL, or wait.
- Fix or delete each lesson this run contradicted.
- For the slowest cases, look for a shortcut (deep link, data setup, case order) and record it.

### Step 8: Report

Lay it out as the [`message-the-qc`](../message-the-qc/SKILL.md) skill says:

1. For the QC to decide: the Bug drafts (Step 6), product defects outside the case steps, cases that need a fix, cases that differ locally (Step 1), story comments to post (Step 4), results not pushed.
2. Counts by status, zeros included, the TestRail run link, and run time against the estimate. Part of an existing run: this run's counts, then the run's totals. Cases left out because they already had a result: count by status, outside this run's counts.
3. Failed: one line per case, with its title, failing step, Expected vs Actual, and Bug key or "Bug pending".
4. Blocked: one line per case, with the reason, owner, and what unblocks it. Untested: case and reason.
5. One line: the `results.md` path and how many lessons were added, changed, or removed.

The story adds or changes screens and links Figma frames → the next step is `detect-product-mismatches` on the live app and Figma for that feature.
