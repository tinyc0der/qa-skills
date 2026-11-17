---
title: API Checks
description: How a runner reads the app's requests, calls an endpoint directly, probes the API behind the cases for defects, and saves API evidence.
---

# API Checks

## Read or Send the Request

- The app's own request: after the step's action, `agent-browser network requests --filter <path>` lists it with its method, status, and `requestId`. `agent-browser network request <requestId> --json` adds the request body (`postData`) and the response body (`responseBody`). Check the method, status, and the response fields the step names. On Android and iOS, as [Device Session](./device-session.md#network) says.
- A direct call: `eval` with `fetch` inside the signed-in page, so the session cookie never leaves the browser. A no-session check adds `credentials: 'omit'`. A check that one account cannot reach another's data runs in a second test account's lane, never with a copied token.
- A host or sign-in that differs from the web app's (a mobile-only endpoint, a bearer token): from the lesson file. None there → ask in the Step 2 message. Never put a token in a command or a file.

## Special Requests

- Two requests at the same moment: one `eval` that starts both `fetch` calls before awaiting either.
- A request sent again after its session ended: keep the old cookie or token only for that replay, never in evidence or a file.
- An error the case names (timeout, 5xx, offline): `agent-browser network route <url> --abort`, or `--body <json>` for a server response, before the action. Run `agent-browser network unroute <url>` right after the step.

## Compare with the Previous Build

- The previous build's response is the `api-<METHOD>-<path slug>.json` of the latest earlier run under `test-runs/` on another build, or the same request on an environment still on the previous build. Neither → nothing to compare: this run's file is the baseline for the next run.
- Compare the fields, not the values: name, type, null or missing, and fields only one side has.

## Probe the API

Extra checks that no case holds, on the requests the run's cases send. The stories name no endpoint and the project has no API spec, so the request the app sends is the starting point. A finding is a product defect outside the case's steps, never a case result.

### During the run

No extra request is sent. Smoke runs skip this.

- Capture each request that saves data, moves money, or returns account data, once per method and path. Save its request body and response as `api-<METHOD>-<path slug>.json`, as [Evidence](#evidence) says: later runs compare with it, and the probes start from it.
- [Compare it with the previous build](#compare-with-the-previous-build). A field removed, renamed, or retyped that the ticket does not name is a finding: installed app versions still read it.
- A list response where a field holds a number in one record and a string in another is a finding.

### probes.md

The run folder's record of every extra check: each captured request with its probes, and each data check ([Data Checks](./data-checks.md)), whose row names the screen. The Step 8 report and the Step 9 run both read and update it.

```markdown
# Extra checks

| Request      | Probe                     | Status    | Result                                                        |
| ------------ | ------------------------- | --------- | ------------------------------------------------------------- |
| POST /orders | Previous build            | done      | No difference from build 2.14.2                               |
| POST /orders | Field the app never sends | found     | `fee: 0` is saved on the order · `api-POST-orders-field.json` |
| POST /orders | Same moment               | suggested | Places up to two orders                                       |
| GET /orders  | Another account's ID      | skipped   | One test account                                              |
| Order book   | Database                  | suggested | Reads only                                                    |
```

- Status: `suggested`, `done` (ran, found nothing), `found`, or `skipped` with the reason.
- A `suggested` row's Result says what the probe saves. A `found` row's Result names the evidence file, what the probe saved and reversed, and the Bug key once filed.

### After the run

Suggest the probes below for each captured request, one `suggested` row each. Leave out a probe that an earlier run's `probes.md` shows `done` or `found` for the same request on the same build. The Step 8 question offers them ([Follow-up Checks](./follow-up.md)). Run a probe only after the QC picks it (Step 9), in the run's session opened again.

| Probe                     | Send                                                                                                      | Saves data                        | Defect when                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| Malformed body            | One request each: a required field missing, a wrong type, `null`, an unknown field, an over-long string   | Only if the server accepts it     | Anything but a 4xx, data saved, or a stack trace, SQL, or internal host in the response |
| Field the app never sends | A field the response has and the request lacks (`fee`, `status`, `accountId`, `price`), added to the body | Yes, on a request that saves data | The saved record takes the sent value                                                   |
| Another account's ID      | The second test account's order, sub-account, or cash ID with this account's session                      | Only if the server accepts it     | Any of its data is returned or changed                                                  |
| List parameters           | A page past the end, a size above the maximum, an invalid sort or filter                                  | No                                | A 5xx, or the whole list                                                                |
| Same moment               | Two requests against one limit (two orders on one buying power, two withdrawals on one balance)           | Yes                               | The total accepted exceeds the limit                                                    |

- The security rules of Step 3 apply: the run's own test accounts only, no flooding, no lockouts. Skip the other-account probe when the run has one account.
- Cancel or reverse what a probe saved.
- A finding's evidence: `api-<METHOD>-<path slug>-<probe>.json`, as [Evidence](#evidence) says.
- Android and iOS traffic that cannot be captured ([Device Session](./device-session.md#network)): every probe of that platform is `skipped`, with that reason.

## Evidence

- `C<id>-step<n>.json` for a case's step, with the method, URL, status, and response body.
- `<path slug>` in an `api-` file name is the path in lowercase, with `-` for `/` and `id` for each ID, such as `api-GET-orders-id-fills.json`. Every run uses the same name for the same request: other runs find the file by it.
- Remove cookies, `Authorization` headers, and tokens first. Never save a HAR: it keeps them.
