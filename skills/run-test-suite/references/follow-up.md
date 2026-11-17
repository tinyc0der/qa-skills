# Follow-up Checks

A run's cases cover the story as written. After the result, one question offers what could still find bugs, and the QC picks. Offer only what the run and the story make worth the QC's time, the riskiest first.

## The Options

| Option      | Its line shows                                              | A pick runs                                                                                                                              |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| API probes  | The requests to probe                                       | [API Checks](./api-checks.md#probe-the-api): the probes that save nothing when the server is right                                       |
| Data checks | The screens to compare with the database                    | [Data Checks](./data-checks.md#after-the-run). They only read                                                                            |
| Regression  | The related features, their case count, and a time estimate | A new run of the skill, kind Regression, on their `smoke: yes` cases, else their critical ones, in a new TestRail run `<KEY> regression` |

- Each line ends with why the option is at risk, in a few words.
- A probe that always saves data (`Yes` under Saves data) places an order or moves money. Name it under the API probes line, and run it only when the QC names it.
- The QC may pick several options, or change a scope: fewer requests, every case of a feature.

## Rank by Risk

Start from what the run found, then from what the story changes:

| Signal                                                                                             | Effect                                                                                  |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A failed case or a defect outside the steps on a stored or calculated value (fee, balance, status) | Data checks on that screen first, then a regression on the features that show the value |
| A request whose fields changed against the previous build                                          | A regression on the features that call it, then API probes on it                        |
| A request that answered with a 5xx during the cases                                                | API probes on it                                                                        |
| The story changes what is saved or how it is validated (a field, a limit, an order rule)           | API probes on those requests                                                            |
| The story changes a calculation, or what a table, chart, or export shows                           | Data checks on those screens                                                            |
| The story changes a shared component, or data other screens show                                   | A regression                                                                            |
| The story changes only text, layout, or style                                                      | Drop API probes and data checks                                                         |
| Most of the cases failed or are blocked                                                            | Drop the regression: the build is not ready for it                                      |

- Order the options by these signals. The first is the default: "OK" picks it.
- Drop an option with nothing to offer: no request captured, no screen left to compare, no related feature.
- Leave out what already ran on this build: a probe or data check an earlier `probes.md` shows `done` or `found`, and a feature whose cases have results on this build under `test-runs/`.
- No option left → no question.

## Related Features for a Regression

| Source                                                                             | Related feature                                                                                          | Reason to show                                  |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| This run's `probes.md`: a request whose fields changed against the previous build | Each feature whose earlier run captured the same request, as `test-runs/*/api-<METHOD>-<path slug>.json` | "Reads `GET /orders`, where `fee` changed type" |
| A product defect this run saw outside the case steps                               | The feature that owns that screen                                                                        | The defect                                      |
| The context file: a shared component a sub-task changes                            | The other features that use it                                                                           | "Shares the order table"                        |
| The context file: each place the changed data reaches                              | The feature that shows it                                                                                | "Shows the changed fee"                         |
| The context file's `Existing cases`                                                | Their TestRail section: the behavior the story builds on                                                 | "The story changes this screen"                 |

- A feature with Bugs in its last runs (`defects` in `test-runs/*/results.md`) gets that count added to its reason, such as "3 Bugs in the last 2 runs".
- Order them: features with evidence from this run (the first two rows), then features that move orders or money or guard sign-in, then the rest.
- Offer five at most. A longer list is a full regression, which the QC asks for by name.
- The case count comes from `list --section`, and the time estimate as Step 2 of the skill computes it.
