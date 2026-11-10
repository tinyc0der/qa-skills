---
title: Automation Lessons
description: Per-app lesson files in the QA workspace that make the next agent-browser run faster and its results more reliable.
---

# Automation Lessons

`automation-lessons/` in the QA workspace holds one file per app: `automation-lessons/<app>.md`. Read it before the first `agent-browser` command against the app. `run-test-suite` updates it after each run.

A lesson is how to drive the app, never what the app should do. It never becomes an Expected result.

## File Layout

```markdown
# Back Office

- Environments: https://staging.example.com, https://uat.example.com
- Updated: 2026-11-10

## Session

- Restore: `agent-browser --session backoffice-qa --restore open https://staging.example.com/orders`
- Signed in: the header shows the account name; signed out shows the "Sign in" button.
- Login: `agent-browser auth login backoffice-qa`. SSO asks for OTP on every new device: ask the user.

## Navigation

- Order detail: open `/orders/<id>` directly instead of searching the list.
- New order form: `/orders/new?type=limit` skips the type picker.

## Waits

- After Save on the order form: `wait --text "Saved"`.
- Never `wait --load networkidle`: the price feed websocket keeps the network busy.

## Elements

- Date fields: `fill` the input with `DD/MM/YYYY`; the calendar popup has no refs.
- Grid rows render only when visible: scroll the grid before `get text`.

## Test Data

- `qa-trader` has a cash balance of 10,000,000, reset nightly.
- Create an order with `/admin/seed?scenario=open-order` instead of through the form.

## Pitfalls

- The success toast disappears after 3 s: read it right after the click.
- The build string is in the footer only after scrolling to the bottom.
```

## Sections

| Section    | Holds                                                                                |
| ---------- | ------------------------------------------------------------------------------------ |
| Session    | Restore command, how to tell signed in from signed out, login alias, OTP and MFA notes |
| Navigation | Deep links and URL parameters that skip clicks                                       |
| Waits      | The wait that works after each slow action, and waits that never settle              |
| Elements   | Controls that need a special command, and stable text or roles to target             |
| Test Data  | Accounts by role, data that exists, and how to create or reset data fast             |
| Pitfalls   | Behavior that caused a false Failed or a wasted rerun, and how to avoid it           |

Leave out empty sections.

## Rules

- One line per lesson, with the exact command, URL, wait, or text to target.
- Add a lesson only when it saved time or prevented a false result in a real run.
- Never `@eN` refs: they change on every snapshot.
- Never passwords, tokens, OTP codes, or personal data. Name an auth vault alias instead.
- A lesson the run contradicted: fix it or delete it in the same update.
- Same lesson in other words: merge, keep the clearer one.
- Keep the file under 100 lines. When it grows past that, drop the lessons that save the least time.
- Update `Updated:` on every change.
- New file: add the environments the run used, and only the sections it has lessons for.
