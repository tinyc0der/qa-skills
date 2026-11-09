# Mismatches layout

Reads catalogs (layout owned by `catalog-features`); changes them only through that skill (SKILL.md › 2. Catalogs). Writes mismatch pages into `mismatches/`.

```
mismatches/                  # output folder
  README.md                  # sitemap; one line each
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

Every page: `# Title`, then a breadcrumb that matches folders (links to the parent pages only), then the body. Mismatch pages: no breadcrumb. Relative links to pages and screenshots in the output folder; source features as key + URL.

## Kinds

| Kind                | Meaning                                                                      | Where       |
| ------------------- | ---------------------------------------------------------------------------- | ----------- |
| Differs             | Sources disagree on one behavior: values, conditions, roles, labels, flow    | Page        |
| Not observed in app | Behavior from another source that the live app lacks; live app compared only | Page        |
| Missing in {source} | Feature a source is silent on, within its catalog Scope (SKILL.md › Sources) | README list |

## README

`mismatches/README.md` missing → create it: `# Mismatches`, breadcrumb. Write the mismatches list.

1. Compared: one row per source: name, role, scope, history, catalog link, Date. App version. Check date.
2. Differs, Not observed in app: one list per kind, highest impact first: page link + impact level + sources + likely cause.
3. Missing features: one list per silent source (Not observed in app, Unspecified, Undocumented, Missing in {source}): feature + where found (catalog feature links) + where searched.
4. Open questions: vague behaviors, unread content, or unclear Scope that blocks a comparison.

## Page

A reader learns what disagrees from the first lines, without opening the sources.

File name: follow existing file name pattern or kebab-case of the title by default.

- `# Title`: the behavior in question, as the user meets it.
- `Feature:` the feature area › title; link to its feature YAML in the live app catalog, else in the first catalog that has it.
- `## Difference`: first a one-sentence summary of how they differ, then one bullet per side, live app first when compared; sources that agree grouped on one bullet. Each bullet: the sources (key or name), then their behavior. Write each side so it is clear alone: the condition, then what the user gets. Not observed in app: the live app bullet says what is missing and the navigation path where it was looked for.
- `## Impact`: level first: **High** (users blocked, data or money wrong), **Medium** (a workaround exists), **Low** (wording, cosmetic). Then who meets it, when, and what they see or cannot do.
- `## Likely cause`: SKILL.md › Likely cause, with the dates that decide it.
- `## Solution`: suggested fix, from the likely cause: Bug → file a Jira defect with the steps and screenshot; Stale requirement → update the requirement; Stale docs → update the docs; Decide → the options for the product owner.
- `## Sources`: evidence, one row per compared source; live app row always, first, when the app is compared.
- `## Steps in the app`: live app compared only: numbered steps from the start URL to the observed result, then the screenshot.
- Other info required to explain the mismatch.

### Example

```markdown
# Expired cards at checkout

Feature: [Checkout › Pay with saved card](../sources/app/catalog/checkout/pay-with-saved-card.yaml)

## Difference

The live app lists expired saved cards at checkout, greyed out; Confluence says they are not listed.

- **Live app, PAY-112:** Expired saved cards are listed at checkout, greyed out and not selectable.
- **Confluence "Saved cards":** Expired saved cards are not listed at checkout.

## Impact

Low. A customer with an expired card sees it greyed out at checkout. Support answers based on Confluence say it should not appear.

## Likely cause

Stale requirement: PAY-112 (2026-08-28) changed the behavior after the Confluence page (2026-01-10).

## Solution

Update the Confluence page "Saved cards": expired saved cards are listed at checkout, greyed out and not selectable.

## Sources

| Source                 | Says                                                    | Link                                                                    | Updated    |
| ---------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| Live app (actual)      | Expired saved cards are listed, greyed out              | Checkout › Payment, [URL](https://staging.example.com/checkout/payment) | 2026-08-30 |
| Jira (intended)        | PAY-112: Expired saved cards are listed, not selectable | [PAY-112](https://example.atlassian.net/...)                            | 2026-08-28 |
| Confluence (intended)  | Expired saved cards are not listed                      | [Saved cards](https://example.atlassian.net/...)                        | 2026-01-10 |
| User docs (documented) | silent                                                  | Searched: Help › Payments, CQL "expired"                                |            |

## Steps in the app

1. Sign in as a customer with an expired saved card.
2. Open Checkout › Payment.
3. The expired card is listed, greyed out, and cannot be selected.

![Expired card at checkout](screenshots/expired-cards-at-checkout.png)
```

- `Says`: the source's behavior, as [features.md](features.md) › Behaviors describes; `silent` when it has none.
- `Link`: live app: navigation path + URL; Jira issue: key + URL; Confluence page: title + URL, with the heading when the page is long; Figma: frame name + URL; TestRail case: `C<id>` + URL; silent: where searched.
- `Updated`: the date read at the source (SKILL.md › Likely cause).
- Superseded issues of a source with history: omit, or mark `superseded by {key}` when it explains the mismatch.
