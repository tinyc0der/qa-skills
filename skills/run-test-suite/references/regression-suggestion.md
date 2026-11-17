---
title: Regression Suggestion
description: How the report of a story's run picks the related features worth a regression run, and what it shows the QC for each.
---

# Regression Suggestion

A story's cases cover the story. Its change can still break a feature the story never names, and the QC has no code to see what the change touches. The report of a new feature run therefore suggests the related features to run a regression on, and the QC picks.

- Most of the story's cases failed or are blocked → no suggestion: the build is not ready for a regression.
- No related feature found → no question.

## Find the Related Features

| Source                                                                             | Related feature                                                                                        | Reason to show                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| This run's `probes.md`: a request whose fields changed against the previous build | Each feature whose earlier run captured the same request, as `test-runs/*/api-<METHOD>-<path slug>.json` | "Reads `GET /orders`, where `fee` changed type" |
| A product defect this run saw outside the case steps                               | The feature that owns that screen                                                                      | The defect                                     |
| The context file: a shared component a sub-task changes                            | The other features that use it                                                                         | "Shares the order table"                       |
| The context file: each place the changed data reaches                              | The feature that shows it                                                                              | "Shows the changed fee"                        |
| The context file's `Existing cases`                                                | Their TestRail section: the behavior the story builds on                                               | "The story changes this screen"                |

A feature with Bugs in its last runs (`defects` in `test-runs/*/results.md`) gets that count added to its reason, such as "3 Bugs in the last 2 runs".

Order them: features with evidence from this run (the first two rows), then features that move orders or money or guard sign-in, then the rest. Suggest five at most. A longer list is a full regression, which the QC asks for by name.

## What the Report Shows

One line per feature: its TestRail section path, the reason, its case count from `list --section`, and the time estimate as Step 2 of the skill computes it.
