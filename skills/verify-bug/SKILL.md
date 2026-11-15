---
name: verify-bug
description: Retest a Jira Bug that Dev marked fixed, then close or reopen it with evidence. Checks that the build under test carries the fix, reruns the Bug's steps under its own conditions, the TestRail cases that failed on it, and the nearby flows the fix could break through `run-test-suite`, gives each Bug one verdict (fixed, not fixed, or fixed with a side regression), and after one approval moves each Bug through the project's Jira workflow with a comment naming the build, cases, and evidence. Use when Dev marked a Bug fixed or resolved, the user wants a Bug verified or retested, or wants a Bug closed or reopened after a retest. Not for reporting a new Bug (`report-bug`) or running cases with no Bug to verify (`run-test-suite`).
---

# Verify Bug

Retests each Bug Dev marked fixed on a build that carries the fix, and closes or reopens it with evidence. `run-test-suite` runs the cases and owns the devices, evidence, `results.md`, and the TestRail push. This skill decides what the retest covers, judges each Bug, and writes to Jira.

**When to skip steps:**

- Retest results that name the Bug already exist in `test-runs/`, on a build that carries the fix → skip the retest in Step 2 and judge from them. The build check, the approval, and the read-back still apply.

## Workflow

1. Read the Bugs
2. Retest with `run-test-suite`
3. Judge each Bug — one approval for every verdict
4. Update the Bugs and read them back

### Step 1: Read the Bugs

Input: one or more Bug keys. Read each through the Atlassian MCP:

- Steps to reproduce, Expected and Actual result, Environment, build, platform (from the title), and the account type, language, and trading session when the Bug names them
- status, Fix versions, and Dev's comments: the fix comment says what changed and which build carries it
- the story, found as [Find the user story](../report-bug/SKILL.md#step-1-find-the-user-story) of `report-bug` finds it
- the Bug's available transitions, for Step 3. Never hardcode transition IDs or names: each project's workflow differs.

The fix build is the Bug's fix version, else the build or deploy Dev's fix comment names.

A key that is not a Bug, or a Bug whose status and comments do not say Dev fixed it → leave it out, with the reason in the plan.

### Step 2: Retest with run-test-suite

Run the `run-test-suite` skill with the Bug keys as its source and fix verification as the kind of run. Its Bug key source and fix verification scope pick the cases. On top of its rules:

- Add the cases of the flows Dev's fix comment names as changed.
- The Bug's steps run on its platform, in the environment the fix is deployed to (Dev's comment, else the Bug's), with its data, account type, language, and trading session, after what the reporter did before step 1. A pass on other data or another path proves nothing: it may take another branch.
- Check the build in its Step 2, before the first case. **Never judge a fix on a build that may not carry it.** The build read from the app confirms the fix when it is the fix build or a later version. A hash, an environment name, or a deploy time confirms only on an exact match with what Dev named.
- Not confirmed, or the Bug names no build → that Bug's cases do not run. Ask in its Step 2 message:

```
❓ <KEY> is fixed in <fix build>, and <platform> runs <build read>. Wait for the fix build?

1. ✅ Wait for <fix build>
2. ✏️ Type the build that carries the fix
```

### Step 3: Judge each Bug

After the push in Step 5 of `run-test-suite`, judge each Bug from the reviewed results:

| Verdict                      | When                                                                                       | Proposed transition                 |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| Fixed                        | The Bug's steps and every case that names the Bug pass                                     | One into a Done status              |
| Not fixed                    | The Bug's failing step still fails, in its steps or a case that names it, with the same or a different wrong result | One that returns the Bug to Dev     |
| Fixed with a side regression | Fixed, and a nearby case that passed on an earlier build fails now                         | One into a Done status              |
| Not verified                 | The Bug's steps or its cases are blocked or untested                                       | None: name what unblocks it         |

- A side regression is a new Bug: `report-bug` drafts it in Step 6 of `run-test-suite`. Other new failures are ordinary failed cases, not linked to this Bug.
- Pick the transition from the Bug's transitions by its target status. None fits → say so; the comment still goes.

Draft one Jira comment per Bug, in the Bug's language:

- the verdict, environment, platform, and the build read
- the Bug's steps and each case run, as `C<id> <title>` with its status, and the TestRail run link
- not fixed: Expected and Actual per failing step, as in [Bug Report Format](../report-bug/references/bug-report-format.md#4-expected-and-actual-results), and what differs from the first report
- a side regression: the new Bug's key, filled in after it is created
- the line `Evidence attached.`, for the screenshots of the Bug's steps and of the cases that decided the verdict

The verdicts lead the Step 8 report of `run-test-suite`, which also carries the drafts from `report-bug`, as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out. One line per Bug: key, verdict, build, the step that decided it, the transition and its target status, and the comment.

```
❓ Update these Bugs?

1. ✅ Move each Bug as proposed, post the comments, and create the side-regression Bugs
2. ✏️ Type changes
```

### Step 4: Update the Bugs and read them back

**Close or reopen a Bug only after the QC approves its verdict.** Then run every approved write without asking again. A changed verdict or comment needs a new approval.

1. Create the side-regression Bugs with Step 5 of `report-bug`.
2. Post each comment.
3. Attach the evidence. The tool cannot upload a file → hand the files to the QC to attach.
4. Move each Bug through its approved transition. Fields the transition requires take values its metadata allows.

Change nothing else on the Bug: title, description, fields, assignee, and links stay. Reopen the same Bug, never a new one: its fix history is there.

Read each Bug back: status, comment, attachments, and the side regression's link. A successful response is not proof. A status other than the transition's target → report Jira's current status, and do not move the Bug again until the cause is known: a workflow automation may have moved it.

Report as `message-the-qc` says:

- `2 fixed · 1 not fixed · 0 side regressions · 0 not verified`
- each Bug as a Jira link with its new status, and each new Bug
- writes not done, with the reason
- the next step: every Bug closed and every case passed → the QC signs off the story. A reopened Bug → Dev fixes it again. A Bug reopened twice before → its Expected may be unclear: settle it with the PO before the next retest.
