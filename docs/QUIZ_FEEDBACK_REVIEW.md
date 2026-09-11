# Quiz feedback in smaller windows

## Scope and coverage

Reviewed the practice-quiz flow from choosing an answer through submission, reading feedback, and advancing. Exam mode and the other study tools are outside this review. The implementation uses React, Electron, Lucide, and the existing CSS tokens. No dedicated interface standards, AGENTS.md, CLAUDE.md, or contributing guide was found in the project search; the existing components and token file supply the conventions.

| Domain        | Evidence inspected                                                                                                                                           | Result                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Accessibility | Native answer controls, feedback-heading focus, continuation, keyboard traversal below feedback, reduced-motion behavior, and automated accessibility checks | Focus transfer added; checked paths pass                     |
| Layout        | Actual submission at 1100×700 and 900×600; 320px reflow and 200% zoom; action and heading bounds                                                             | Scrolling defect fixed                                       |
| Writing       | Check answer, saving, feedback, next, and finish labels against their actions                                                                                | Clear within scope; existing wording retained                |
| Typography    | Rendered feedback and wrapping action row at small widths; existing Inter size and weight tokens                                                             | Clear within scope                                           |
| Colors        | Existing surface, text, and focus tokens; automated rendered contrast checks on active quiz and answer explanation                                           | No automated violations; no palette changes                  |
| UI polish     | Existing surface shadow and radius, static next action, per-question entrance, and instant feedback positioning                                              | Repeated entrance removed; existing visual language retained |

## Findings resolved

| Severity | Domain | Location                             | Before                                                                                            | After                                                                                         | Why                                                                 |
| -------- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| MEDIUM   | Layout | src/App.jsx:935; src/styles.css:1209 | In a 700px-high viewport, inserting feedback moved Next question to y=771–817, outside the window | Keep the action row sticky; focus and reveal the feedback heading after successful submission | Stable controls and reading order remove the repeated manual scroll |
| LOW      | UI     | src/App.jsx:968                      | Each question replayed the whole-page entrance animation                                          | Render the quiz without that entrance                                                         | High-frequency navigation benefits from immediate feedback          |

The bar stays in document flow. Its measured height supplies scroll clearance for focusable quiz content. The feedback is neither collapsed nor truncated. Advancing focuses the new question, while changes to the saving state alone do not trigger feedback scrolling.

## Verification

- `npm run check`: lint, 146 unit tests, and production build passed.
- `npx playwright test tests/e2e/desktop.spec.js tests/e2e/accessibility.spec.js`: both passed as part of the initial five-test run with three viewport cases.
- `npx playwright test tests/e2e/quiz-viewport.spec.js`: all four cases passed, including the subsequently added 200% zoom case. Tests check actual viewport bounds, focus transfer, content clearance, horizontal overflow, and advancing to another question.
- Inspected submitted-state screenshots at desktop and 320px width. Full explanation and source controls remain reachable by scrolling and keyboard.
- Pending submission: source inspected; focus effect depends only on submission state. The preceding UI verification covered saving and disabled controls. New failure injection was not performed.

**Not verified:** screen-reader speech, forced-colors mode, RTL, and Windows-specific rendering. Error recovery was not re-exercised in this scoped fix. There is no dark theme to inspect.

**Approve** — the inspected practice-quiz flow has no remaining high-severity findings.
