---
title: UI Checks
description: How a runner reads display assertions, transient states, timing, and screenshots before it records a step as passed or failed.
---

# UI Checks

A screenshot is evidence, not the check. Read each displayed value from the page, then compare it with Expected.

## Read the Value

| Assertion                   | Web (`agent-browser`)                                                                                       | Android and iOS (`agent-device`)                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Present or absent           | `is visible`, `get count`. Lists that render only visible rows: see [Read Traps](#read-traps)              | `is visible`, `is exists`, `is absent`                        |
| Text, number or date format | `get text`, `get value`. Placeholder and tooltip text: `get attr`                                           | `get text`, `is text`                                         |
| Order, position, alignment  | Compare `get box` of the elements. DOM and snapshot order are not screen order                              | Compare the bounds in `get attrs`                             |
| Color                       | `get styles`, or `eval` with `getComputedStyle`: `color`, `background-color`, `border-color`, `opacity`. SVG icons: `fill`, `stroke` | Not readable: [judge from a screenshot](#judge-from-a-screenshot) |
| Font                        | Same, with `font-family`, `font-weight`, `font-size`, `line-height`, `letter-spacing`                       | Not readable: judge from a screenshot                        |
| Icon                        | `get attr`: `aria-label`, `src`, or class                                                                   | Content description in `get attrs`, else a screenshot        |
| Component state             | `is enabled`, `is checked`, `aria-*` attributes. A disabled look made with `opacity` needs the style too    | `is selected`, `is focused`, `is editable`, `get attrs`       |
| Cut-off or overflowing text | `eval` comparing `scrollWidth` with `clientWidth`, and `text-overflow`. Overlap: compare `get box`          | Compare bounds in `get attrs`, plus a screenshot              |

- Put the value read in the step's `observed` entry, such as `2 passed (rgb(220, 38, 38), red)`.
- Name a computed color with its common name and compare that with Expected. A semi-transparent color or one on another background: read the background and `opacity` first.
- `font-family` lists fallbacks. The design font is in use only when `[...document.fonts].filter(f => f.status === 'loaded')` includes it.
- Hover and focus states: `hover` or `focus` the element, then read again. Android and iOS have no hover.

## Timing

- Web page load: `agent-browser vitals <url> --json` (TTFB, FCP, LCP). One request: `eval` reading `performance.getEntriesByType('resource')` for its URL.
- Android and iOS: `agent-device perf frames --json` for dropped frames. A wait on screen: a `record` video, from the frame of the action to the frame of the result.
- Measure five times on the same build, environment, and network. `observed` holds the median and the maximum, such as `2 passed (median 1.2 s, max 1.9 s; limit 2 s)`.
- Expected gives no limit → record the numbers and mark the step not observed.
- Many users at once (load) cannot run with these tools: such a case is `blocked` with "Needs a load test tool".

## Judge from a Screenshot

Only for what the page cannot report: color and font on Android and iOS, text drawn on a canvas, icon shape, overlap the boxes do not show.

- Take `C<id>-step<n>.png` at that step, open it, and add `(from screenshot)` to the step's `observed` entry.
- The image cannot tell two states apart (disabled grey and light grey, for example): the step is `not observed`. Never pass a borderline call.
- Animations and transitions: only a video proves them. Without one the step is `not observed`.

## Read Traps

| Trap                                   | Wrong reading                                                         | Safe reading                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Virtual lists and grids                | `get count` and snapshots see only drawn rows, so counts are low and rows look absent | Scroll to the end, collecting each row's unique key, or count from the data source (API, export) |
| Masked or formatted input cleared with `fill ""` | The field looks empty, but the form keeps the old value     | Web: select all and press Backspace. Android and iOS: use the field's clear control or delete keys. Then read the field and what depends on it (validation, buttons, totals) |
| Tooltips                               | Nothing appears: the tooltip belongs to another element or shows after about 1 s | `hover` the element that owns it (icon, input, cut-off cell), wait 1.5 s, then read. "No tooltip" only after every candidate |

A `failed` step based on a count, an absence, an empty field, or a missing tooltip: read it again the safe way first.

## Transient States

A step that reads a value right after switching context (record, tab, filter, account, language) or submitting a form can pass on the final value while a stale frame showed wrong data first.

- Capture the change: `record start <run folder>/C<id>-step<n>.webm` (`.mp4` on a device) before the action and `record stop` once it settles, or screenshots at about 0, 250, 500, 1000 and 2000 ms named `C<id>-step<n>-<ms>.png`.
- A frame showing the previous context's data or a wrong state (an empty form, a "new" state flashing) fails the step, even when the final value is right. Put the frame and its time in the result.
- A realtime value (price, volume, order status pushed by the server): read it again after the tolerance the case or `domain/` gives, and compare it with the case's reference (another screen, the API response). No tolerance → the step is not observed, with the delay measured.

## Check the Screenshots

Before `passed` on a case with evidence, open every screenshot of the case and look for:

- anything wrong outside the steps: wrong, missing, overlapping, or cut-off text, stale values, untranslated keys such as `label.title`, odd colors or states.
- every number the screen derives from others (totals, percentages, fees, limits): recompute it from the inputs on the same screen, not only the field Expected names.

Write the outcome in `checked`: `checked: 2 screenshots, 3 derived numbers recomputed, nothing wrong`, or what is wrong.

- A problem one of the case's steps asserts: that step is failed.
- Any other problem: a product defect outside the steps, for the report.
- A case that leaves the test data open: pick data whose derived numbers are easy to recompute.
