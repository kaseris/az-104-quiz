# Control alignment and spacing review

Implemented September 12, 2026 using better-ui and better-layout.

## Align to shared edges

| Severity          | Location                                                             | Before                                                                                                             | After                                                                                                                    | Why                                                                                                 |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| MEDIUM — resolved | `src/styles.css:3574`, `src/Generation.jsx:194`                      | Save allowance centered against the combined label/field; candidate selection and queue action used inline spacing | Controls align to the field edge, share a 44px height, and wrap with 16px gaps                                           | Labels remain grouped with fields; adjacent actions share an alignment edge                         |
| MEDIUM — resolved | `src/styles.css:3617`, `src/Labs.jsx:379`, `src/LabEvidence.jsx:170` | Lab search/select widths and padding varied across forms                                                           | Equal-width responsive filter columns; 44px single-line controls, consistent padding/radii, and shared input-well colors | Controls at the same level have consistent geometry; multiline evidence fields retain useful height |

## Optical alignment

| Severity       | Location                                  | Before                                            | After                                                                                                                         | Why                                                                                                                 |
| -------------- | ----------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| LOW — resolved | `src/Select.jsx:1`, `src/styles.css:3538` | Platform dropdown arrow crowded the trailing edge | Shared native-select wrapper with a 16px Lucide chevron inset 12px from the logical trailing edge; 40px trailing text padding | Gives the icon breathing room and prevents text collisions, including RTL; native keyboard selection remains intact |

## Group with space

| Severity       | Location                                  | Before                                                     | After                                                                                                                    | Why                                                      |
| -------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| LOW — resolved | `src/App.jsx:1337`, `src/styles.css:3631` | Session-history explanation sat directly against the table | 12px spacing within the filter/explanation group and 24px before results; explanation constrained to the reading measure | The gap between groups is twice the gap within the group |

## Verification

- Measured generator allowance and Save allowance: both 44px high with equal top/bottom coordinates when beside one another.
- Measured lab filters: matching widths/heights at 1320px and 800px; stacked controls at narrow widths.
- Measured session-history explanation-to-table gap: 24px.
- Inspected generator, labs, and populated history at 1320px, 800px, 390px, and 320px in light and dark appearances; no document horizontal overflow in those checks.
- Checked RTL control alignment/arrow placement and 200% zoom reflow. Native window capture was used to inspect zoom because Playwright's screenshot clipping did not reflect the full window.
- `npm run check` passed: lint, 148 unit tests, production build. Final CSS adjustment also rebuilt successfully. Formatting and diff whitespace checks passed.
- Full Electron suite: 35 passed across both themes; 2 opt-in live retrieval tests skipped. Existing keyboard, disabled/error, accessibility, reader, generator, and lab lifecycle coverage remains passing.

Not verified: pseudo-localization or a translated locale; motion replay at 10% speed (no animations changed); native picker appearance on other operating systems.

Approve for the inspected controls and layouts.
