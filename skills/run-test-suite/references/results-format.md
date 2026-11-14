---
title: Results Format
description: Markdown format for a test run's results (`results.md`) and how the `results` command of `sync-test-cases-with-testrail` maps each part to TestRail.
---

# Results Format

One `results.md` per run, in `test-runs/<YYYY-MM-DD>-<slug>/`, next to its evidence files. It holds one run block, then one result block per case.

## Document Structure

```markdown
<!-- run
refs: PROJ-1
milestone: Sprint 12
build: staging · 2.14.3 (18212)
-->

# PROJ-1 Login

- Environment: https://staging.example.com, account `qa-admin`, viewport 1920×1080
- Cases: `tickets/PROJ-1-login/login.test.md`
- Run time: 2026-11-10 10:02–10:41

<!-- result
case: C11
status: passed
run_at: 2026-11-10 10:14
elapsed: 1m 10s
observed: 1 passed (login form) · 2 passed · 3 passed (dashboard, header shows "qa-admin")
checked: 1 screenshot, nothing wrong
evidence: C11.png
-->

## C11 Successful login

<!-- result
case: C12
status: failed
run_at: 2026-11-10 10:20
elapsed: 2m 15s
observed: 1 passed · 2 passed · 3 failed ("Invalid password")
evidence: C12-step3.png, C12.png
defects: PROJ-9
-->

## C12 Locked account

**Step 3 failed: lock message**
- Expected: "Account locked" message
- Actual: "Invalid password" message

<!-- result
case: C13
status: blocked
run_at: 2026-11-10 10:31
-->

## C13 Password reset

**Blocked: reset email never arrives on staging**
- Owner: DevOps
- Unblocks when: staging sends mail again
```

## Run Metadata

| Field             | Description                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `testrail_run_id` | TestRail run ID (`R123`). Set it to add results to an existing open run. Otherwise the push creates the run and writes its ID. |
| `refs`            | Ticket keys for the run's References field.                                                                 |
| `milestone`       | Exact name of a TestRail milestone. Optional.                                                               |
| `build`           | Build read from the app, as `<environment> · <build>`. Sent as each result's version.                       |

- The `#` heading is the run name. Use the story key and title, or the release name for regression.
- The text between the heading and the first result block is the run description. Keep it to environment, account, scope, and run time.

## Result Metadata

| Field                  | Description                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `case`                 | TestRail case ID (`C123`), from the case's `testrail_id`. Empty for a case not on TestRail: the push skips it. |
| `status`               | `passed`, `failed`, `blocked`, or `untested`. Another TestRail status works by its name or label. |
| `run_at`               | Local time of the verdict, as `2026-11-10 10:14`. Needed on every result the push sends. The push refuses a result whose case's preconditions, steps, or expected results changed on TestRail after it. |
| `elapsed`              | Time the case took, as `1m 30s` or `2h 5m`.                                                       |
| `observed`             | Each step as `passed`, `failed`, or `not observed`, with what was seen: `1 passed (form shown) · 2 failed ("Invalid password")`. The push refuses `passed` unless every step is `passed`. Not sent. |
| `checked`              | What the [screenshot check](./ui-checks.md#check-the-screenshots) found. The push refuses `passed` with evidence without it. Not sent. |
| `evidence`             | Comma-separated file names in the run folder.                                                     |
| `defects`              | Comma-separated Bug keys.                                                                         |
| `build`                | Only when the build changed mid-run. Overrides the run's `build`.                                 |
| `testrail_result_id`   | Written by the push. Never write it by hand.                                                      |
| `testrail_attachments` | Evidence files already uploaded. Written by the push. Never write it by hand.                     |

- The `##` heading is `C<id> <case title>`, for people reading the file. The push does not send it.
- The text under the heading is the TestRail result comment.

## Comment Rules

- Passed: no comment, unless a note matters to the verdict, such as substitute test data.
- Failed: one block per failing step: a bold line `**Step <n> failed: <what differs>**`, then `- Expected: …` and `- Actual: …`. No passing steps.
- Blocked: a bold line `**Blocked: <what blocks>**`, then `- Owner: …` and `- Unblocks when: …`. A case that needs fixing says "case needs fix" and what is wrong with it.
- Untested: the reason it did not run. Not sent to TestRail.
- Leave out the build, account, and environment already in the run block, reruns after the agent's own mistakes, file lists, and the run time.
- The push ends each comment of a result that is not passed with `Ran <run_at>`, since TestRail shows only when the result was pushed.

## Mapping to TestRail

| Markdown                                  | TestRail                                                      |
| ----------------------------------------- | ------------------------------------------------------------- |
| Run heading, description, `refs`, `milestone` | New run with only the file's cases (`include_all: false`) |
| Each result block except `untested`       | Result for the case: status, comment, version, elapsed, defects |
| `evidence`                                | Attachments on that result                                    |

On a rerun, the push compares each block with the result it posted before:

- No `testrail_result_id` → adds the result.
- Status changed → adds a correction result with the comment "Corrected result." and the new text, and uploads all its evidence again.
- Only `defects` changed → adds a result with the same status and the new Bug keys.
- Evidence not in `testrail_attachments` → uploads it to the block's result.
- Nothing changed → nothing is sent.
