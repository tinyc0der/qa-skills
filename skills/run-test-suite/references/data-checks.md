---
title: Data Checks
description: How a runner compares what the app shows and saves with the database, through a read-only connection and a data map, and what a difference means.
---

# Data Checks

The QC has read access to the database of the environment under test. The runner uses it to check what a person can only sample: every row and cell of a table, and what an action really saved.

These are extra checks that no case holds. The cases stay as the story words them and name no table or query. A difference is a product defect outside the case's steps, never a case result.

The database holds what the system stored. A match proves the app shows and saves that data correctly. It does not prove the data was right when it arrived, such as a price from the exchange feed or an imported financial statement: that needs the source a case names.

## Connect

- Use the database of the environment the run tests, with the command-line client its lesson file names under Session. That command connects read-only by an alias, runs a `.sql` file, and prints CSV. None there → ask in the Step 2 message, and save the answer to the lesson file.
- Write each query to its `.sql` file first, then run that file: the query in the evidence is the one that ran.
- **`SELECT` only.** Never insert, update, delete, change a schema, or call a procedure, even with an account that can: other QCs share this data.
- Every query filters by the run's test account and by a date or a key. Never scan a whole table: the database is shared.
- The password stays in the client's own credential store or in `.env`. Never write it, or a connection string that holds it, in a command or a file.

## Data Map

`data-map/<app>.md` in the QA workspace maps each screen's data to its query, so a later run does not search again. Read it before the first query, and update it in Step 7.

```markdown
# Trade web data map

## Order book (Trade › Order book)

- Status: matched 2026-11-10
- Rows: `orders` where `account_id` is the test account and `trade_date` is the day
- Key: `order_id` ↔ **Order no.**
- Columns: `price` ↔ **Price** (÷ 1,000, 2 decimals) · `status` ↔ **Status** (`PD` Pending, `MT` Matched) · `created_at`, UTC ↔ **Time** (GMT+7, `HH:mm:ss`)
```

Status: `drafted` (never matched the screen), `matched <date>` (every row matched in a run), or `confirmed <who> <date>`.

## During the Run

Only for a screen whose entry is `matched` or `confirmed`: the query is known, so the check is quick. Smoke runs skip it.

- A step reads a table, a list, or a total on that screen → also compare what the screen shows with the database.
- A step saves data on that screen → also compare what it saved.
- A query that fails, or returns no row for data the screen shows: the schema may have changed. Set the entry back to `drafted` and suggest the check after the run.

A screen the cases read that has no entry, or a `drafted` one, gets a `suggested` row in `probes.md` ([API Checks](./api-checks.md#probe-the-api)): finding its query takes time, so it waits for the QC's pick.

## After the Run

Step 9 runs the data checks the QC picked:

1. Find the table from the request the app sends ([API Checks](./api-checks.md#read-or-send-the-request)): search the database's catalog for the path's nouns and the response's field names. Add the entry as `drafted`.
2. Compare, as below.
3. Every row matches → set the entry to `matched <date>` and the row to `done`.
4. A difference under a `drafted` entry may come from the wrong query. Set the row to `found`, and report it as a data difference for the QC to confirm, not as a defect. The QC confirms it → set the entry to `confirmed <who> <date>` and hand the difference to `report-bug`.

## Compare

- Read every row from the app: scroll a virtual list to the end, or take the rows from the app's own response.
- Match rows by key, never by position. Report the rows only the app has, the rows only the database has, and the cells that differ.
- Before comparing a cell, apply the entry's rule: unit and scale, decimals and rounding, date format and time zone, the label of a code, the placeholder of an empty value.
- A saved record: every field the action set, the fields the server sets (status, fee, time), and the rows the action must not change, such as another order or another sub-account's cash.
- A value worked out from records (P&L, buying power): work it out from the stored inputs with the formula in `domain/` or the case, then compare. Reading the stored result back proves nothing.
- Data that moves (prices, an order being matched): compare records that have settled, or read both sides within the tolerance the case or `domain/` gives. Neither → skip the check, with that reason.
- A difference: read the app's own response. It matches the database → the screen is wrong. It matches the screen → the server is wrong. Say which in the report.

## Evidence

- `data-<screen slug>.sql` with the query and `data-<screen slug>.csv` with its result. Keep only the compared columns and the rows of the run's test accounts.
- Give the counts with a difference, such as `214 rows, 9 columns: 3 differ in Fee, 1 missing on screen`.
