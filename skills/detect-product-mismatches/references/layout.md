# Mismatches layout

Reads catalogs (layout owned by `catalog-features`); changes them only through that skill (SKILL.md › 2. Catalogs). Writes mismatch pages into `mismatches/`.

```
mismatches/                  # output folder
  sources/
    README.md                # every catalog here: name, type, role, link, Date
    {name}/                  # source name
      catalog/               # `catalog-features` skill output
      test-cases/            # TestRail only: pulled `*.test.md` files
  mismatches/
    README.md                # index
    {mismatch}.md            # one mismatch per disagreement, every compared source
    screenshots/             # live app evidence, linked from the pages
```

## Formatting

Relative links to pages and screenshots in the output folder; source features as key + URL.

## Kinds

| Kind                | Meaning                                                                      | Where       |
| ------------------- | ---------------------------------------------------------------------------- | ----------- |
| Differs             | Sources disagree on one behavior: values, conditions, roles, labels, flow    | Page        |
| Not observed in app | Behavior from another source that the live app lacks; live app compared only | Page        |
| Missing in {source} | Feature a source is silent on, within its catalog Scope (SKILL.md › Sources) | README list |

## README

`mismatches/README.md` missing → create it: `# Mismatches`. Write the mismatches list.

1. Compared: one row per source: name, role, scope, history, catalog link, Date. App version. Check date.
2. Differs, Not observed in app: one list per kind, highest impact first: page link + impact level + sources + likely cause.
3. Missing features: one `Missing in {source}` list per silent source: feature + where found (catalog feature links) + where searched.
4. Open questions: vague behaviors, unread content, or unclear Scope that blocks a comparison.

## Page

A reader learns what disagrees from the first lines, without opening the sources.

File name: follow existing file name pattern or kebab-case of the title by default.

- `# Title`: the behavior in question, as the user meets it.
- `Feature:` the feature area › title; link to its feature YAML in the live app catalog, else in the first catalog that has it.
- `## Difference`: first a one-sentence summary of how they differ, then one bullet per side, live app first when compared; sources that agree grouped on one bullet. Each bullet: the sources (key or name), then their behavior. Write each side so it is clear alone: the condition, then what the user gets. Not observed in app: the live app bullet says what is missing and the navigation path where it was looked for.
- `## Impact`: level first: **High** (users blocked, data or money wrong), **Medium** (a workaround exists), **Low** (wording, cosmetic). Then who meets it, when, and what they see or cannot do.
- `## Likely cause`: SKILL.md › Likely cause, with the dates that decide it.
- `## Solution`: suggested fix, from the likely cause: Bug → file a Jira defect with the steps and screenshot; Stale requirement → update the requirement; Decide → the options for the product owner.
- `## Sources`: evidence, one row per compared source; live app row always, first, when the app is compared.
- `## Steps in the app`: live app compared only: numbered steps from the start URL to the observed result, then the screenshot.
- Other info required to explain the mismatch.

### Example

```markdown
# Cancelling a pending order during ATO

Feature: [Trade › Order book › Cancel pending order](../sources/app/catalog/trade/order-book/cancel-pending-order.yaml)

## Difference

The live app lets the investor cancel a pending order during ATO; TRADE-205 and Confluence say orders cannot be cancelled during ATO.

- **Live app:** During ATO, a pending order in Trade › Order book shows "Cancel", and the investor can cancel it.
- **TRADE-205, Confluence "Order rules":** During ATO, the investor cannot cancel an order.

## Impact

High. During ATO, an investor can cancel a pending order the rules say must stay. If the exchange still matches it, the investor holds shares they believe they cancelled.

## Likely cause

Bug: the live app (build 4.12.0, 2026-11-14) differs from TRADE-205 (2026-11-13), the newest intended behavior, and nothing newer explains it.

## Solution

File a Jira defect with the steps and screenshot.

## Sources

| Source                | Says                                                             | Link                                                                | Updated    |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| Live app (actual)     | During ATO, a pending order shows "Cancel" and can be cancelled  | Trade › Order book, [URL](https://uat.example.com/trade/order-book) | 2026-11-14 |
| Jira (intended)       | TRADE-205: Investor cannot cancel an order during ATO or ATC     | [TRADE-205](https://example.atlassian.net/browse/TRADE-205)         | 2026-11-13 |
| Confluence (intended) | Investor cannot cancel an order during ATO or ATC                | [Order rules](https://example.atlassian.net/wiki/x/Ab12)            | 2026-09-15 |

## Steps in the app

1. Sign in as an investor with a pending LO buy order.
2. During ATO, open Trade › Order book.
3. The pending order shows "Cancel", and the investor can cancel it.

![Cancel during ATO](screenshots/cancelling-a-pending-order-during-ato.png)
```

- `Says`: the source's behavior, as [features.md](features.md) › Behaviors describes; `silent` when it has none.
- `Link`: live app: navigation path + URL; Jira issue: key + URL; Confluence page: title + URL, with the heading when the page is long; Figma: frame name + URL; TestRail case: `C<id>` + URL; silent: where searched.
- `Updated`: the date read at the source (SKILL.md › Likely cause).
- Superseded issues of a source with history: omit, or mark `superseded by {key}` when it explains the mismatch.
