# Cloud-neutral appearance review

Implemented September 12, 2026. The approved cobalt identity now applies across the application, with System (default), Light, and Dark options at the top of Settings & sources.

## Semantic roles and theme ownership

| Severity          | Location                                                                                             | Before                                                                                      | After                                                                                                                                         | Why                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| MEDIUM — resolved | `src/tokens.css:1`, `src/styles.css:1`, `src/App.jsx:1431`                                           | Green/paper presentation colors and no appearance preference                                | Primitive palette, semantic component roles, and two appearances; neutral course icons                                                        | One color, one meaning: blue identifies actions/selection; green, amber, and red identify feedback |
| MEDIUM — resolved | `electron/appearance.js:1`, `electron/main.js:98`, `electron/preload.cjs:123`, `src/appearance.js:1` | Window and renderer had independent fixed colors                                            | Saved native theme before window creation; renderer initializes from resolved native state before React and before the window becomes visible | One theme authority prevents mismatched native controls and a wrong-theme launch flash             |
| LOW — resolved    | `src/styles.css:483`                                                                                 | Page focus color reused on the dark sidebar                                                 | Sidebar uses its brighter indicator for keyboard focus                                                                                        | Measure against the actual background; keep focus distinguishable                                  |
| LOW — resolved    | `src/styles.css:346`, `src/styles.css:1190`                                                          | Narrow viewports could overflow on badges, answer text/results, and the offscreen skip link | Wrapping answer content, bounded skip-link positioning, and clipped unfocused skip link                                                       | Preserve readable content and keyboard navigation at 320px                                         |
| LOW — resolved    | `src/Reader.jsx:68`, `src/Reader.jsx:196`                                                            | Scrollable code lacked keyboard access; draft textarea carried unsupported expanded state   | Focusable code regions; expanded state belongs to the reference-picker button                                                                 | Keyboard and semantic checks exposed these during populated-reader verification                    |

SQLite stores only the validated `system`, `light`, or `dark` preference. A failed write leaves the existing preference and native appearance intact and offers Try again. Portable learning-data exports continue to exclude appearance. No schema migration, stored course changes, generic settings writer, or runtime color-generation dependency was introduced.

Electron resolves System appearance and sends native updates through the isolated preload bridge. `.dark` is the sole CSS theme selector. Theme changes temporarily suppress transitions and restore them on the next frame. Inter, existing elevation/press feedback, and the quiz feedback/continuation behavior are preserved.

## Measured contrast

The appearance tests resolve 52 foreground/background combinations per theme from the renderer's computed custom properties. This includes action hover/pressed colors, selection, status surfaces, input boundaries, focus, and translucent secondary elements. Disabled control measurements are recorded separately without applying an AA requirement to exempt inactive controls. Axe also measures actual rendered text in lifecycle screenshots after entrance animations settle.

| Pair                           |   Light |    Dark |
| ------------------------------ | ------: | ------: |
| Body text / card               | 15.53:1 | 13.54:1 |
| Secondary text / page          |  5.90:1 |  9.89:1 |
| Primary action label / fill    |  5.17:1 |  7.36:1 |
| Focus ring / card              |  6.70:1 |  8.86:1 |
| Sidebar focus / sidebar        |  8.66:1 | 10.38:1 |
| Input boundary / input well    |  3.42:1 |  4.86:1 |
| Success text / success surface |  6.81:1 | 10.51:1 |
| Caution text / caution surface |  6.84:1 | 10.04:1 |
| Error text / error surface     |  7.60:1 |  8.26:1 |

All measured applicable combinations pass their text (4.5:1) or non-text (3:1) threshold. No actionable color findings remain in the inspected coverage.

## Verification

- `npm run check`: lint, 148 unit tests, and production build pass.
- Desktop suite now has Light and Dark projects. All 35 local checks pass across the full-suite run and final targeted rerun. Two opt-in live Microsoft Learn retrieval cases were skipped.
- Final targeted rerun: 15 passed, 2 opt-in skips; covers appearances, native System update signals, save failure/retry, restart, complete quiz lifecycle, reader, and viewport regressions.
- Rendered WCAG A/AA scans cover onboarding, overview, setup, selected/correct/incorrect answers, results, empty history/progress/issues, settings, populated documentation/highlights/drafts, tutor, generation, lab preflight/evidence/history, and data management.
- Quiz checks cover 1100×700, 900×600, 320×640, 200% zoom, keyboard focus, and reduced motion in both themes. Reader selection checks include 390px.
- Appearance changes during an active quiz preserve the question. Restarts preserve the chosen preference. Native controls use the matching CSS `color-scheme`; window background matches Electron's resolved theme.
- Visual inspection included both overview palettes, dark results, narrow quiz feedback, and narrow reader selection tools.

Not verified: actual OS preference changes on Windows/Linux or other hardware (native update signals were simulated without changing the user's desktop); exhaustive combinations of external provider errors; opt-in live Microsoft Learn retrieval. These results do not claim full platform certification or every possible transient state.

Approve for the inspected local application coverage.
