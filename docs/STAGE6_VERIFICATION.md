# Stage 6 pilot walkthrough record

**6A.2 complete.** Both version 1 pilots are released in the source catalog following review of the user's Azure walkthrough reports and final cleanup confirmation. They are now available in the app through the 6B.1 guided library; this document retains the 6A.2 content verification record. Catalog revision: `labs-2026-09-07-v2`; instruction and contract versions remain 1. Original lab instructions, names and address ranges are unchanged at the user's request.

These are **user-reported walkthroughs**, not independent agent queries of Azure state. The VNet CLI run was accepted as an equivalent exercise with alternate names/ranges and assisted retries. This does not claim exact execution of every original instruction or an independently verified Azure badge.

## Accepted walkthrough reports

The user supplied 2026-09-07 as the original walkthrough date and subsequently supplied Azure CLI 2.90.0 (core 2.90.0, no extensions). Subsequent retry dates/durations were not separately supplied; the catalog date identifies the supplied walkthrough report date.

| Exercise / version   | Method     | Result                                                           | Reported minutes                                                    | Cleanup                                                                                 |
| -------------------- | ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| rg-tags / 1          | Portal     | Expected tags reported                                           | 1.5                                                                 | Group deleted; absence confirmed                                                        |
| rg-tags / 1          | CLI 2.90.0 | Expected tags reported                                           | 3, including reading                                                | Group deleted; absence checked in Portal                                                |
| vnet-two-subnets / 1 | Portal     | Expected subnets reported                                        | 2, including reading                                                | VNet deletion reported; dedicated group deletion confirmed later                        |
| vnet-two-subnets / 1 | CLI 2.90.0 | Successful creation after assisted retries with alternate ranges | 10 for initial failed attempt including reading; retry time unknown | Dedicated group deleted after successful retry; user reported Portal clear of resources |

The user confirmed the VNet resource group was created specifically for the exercise, then confirmed its deletion and that only a subscription remained visible. This completes the outstanding cleanup confirmation. No subscription identifier or full resource ID from the raw errors is retained here.

## Preserved VNet CLI attempt history

1. **Missing address range:** the user's subnet-create command omitted `--address-prefixes` and provided no IPAM allocation. Azure returned `NoAddressPrefixOrPoolProvided`. The original v1 catalog already includes the prefix; no catalog command defect was identified.
2. **Range outside the VNet:** adding the pilot's `10.42.2.0/24` to the user's different VNet returned `NetcfgSubnetRangeOutsideVnet`. This was a setup/range mismatch, not an authorization failure.
3. **Read-only inspection:** user output showed VNet `10.0.0.0/16` and `subnet1` at `10.0.0.0/24`.
4. **Successful retry:** using `subnet2` at `10.0.1.0/24`, the user confirmed successful creation. The ranges are contained and non-overlapping. This demonstrates the intended subnet-creation behavior with different names and prefixes from the original `frontend`/`backend` and `10.42.*` setup.
5. **Cleanup:** user confirmed deletion of the dedicated resource group after the successful retry and no remaining exercise resources in the Portal.

The complete original command remains in the catalog. Microsoft’s [subnet-create reference](https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest#az-network-vnet-subnet-create) was checked during review. No cloud commands were executed by the implementation agent.

## Release decision and limits

Accepted both methods for each pilot on the basis of user-reported expected outcomes and cleanup. Accepted the VNet CLI variant for the same single learning objective; retaining the original instructions/names follows the user's explicit preference. `verification.portal` and `verification.cli` now contain passing editorial records, CLI version where applicable, report date, reported duration, evidence and completed cleanup. The validator's release gate is unchanged.

The VNet CLI `elapsedMinutes: 10` represents the reported initial attempt, not total time through successful retry; this limitation is explicit in its findings. Region, exact Portal prefixes, final successful CLI subnet-list output, full hint exposure and reflection responses were not supplied. Do not infer them. The accepted evidence establishes a limited manual pilot review, not independent live-state verification, comprehensive usability evaluation or a calibrated duration estimate. Historical errors remain available above.

## Read a pilot

From the project root, this local read-only command prints the definition:

```sh
node --input-type=module -e 'import { labs } from "./content/labs.js"; console.log(JSON.stringify(labs.find(l => l.id === "rg-tags"), null, 2))'
```

Use `vnet-two-subnets` for the other pilot. Read the preflight/cost instructions first. CLI blocks are for manual execution in Bash, using the chosen dedicated resource names and matching address ranges. The 6B.1 Hands-on labs screen also displays these instructions and saves the chosen method and reading position.

## Validation and next step

Final `npm run check`: lint passed, 103/103 Node tests passed, production build passed. Release-state assertions were updated; invalid/incomplete verification and cleanup-gate tests remain in place. No instruction, schema, IPC, UI or provider change was made. The catalog revision changed for release metadata; exercise instruction versions remain 1.

**6B.1 follow-up:** pilot library and durable guided start/pause/resume are now implemented; see the roadmap for validation. 6B.2 evidence, repeat attempts and separate completion/cleanup tracking are also implemented. Next is 6A.3 content expansion. Stage 6 remains incomplete: only two exercises across two domains are present, and the ten-exercise/two-per-domain gate is still outstanding.

## Reusable checklist for future verification

For **each row**, copy and fill the following checklist. Do not check boxes based only on reading the documentation.

- [ ] Record reviewer, exercise ID/version, method, date, region, sanitized environment description, and CLI version from `az version` (CLI only).
- [ ] Confirm authorized subscription, roles/scope, applicable policy, prerequisites and pricing restrictions. Record setup time separately.
- [ ] Choose a fresh dedicated group and resource names; confirm no existing group will be reused.
- [ ] Attempt the goal before revealing hints. Record which hints and walkthrough sections were used, in order; assess whether they helped.
- [ ] Follow every step of this method, recording confusing labels, unexpected defaults, failed commands or extra resources.
- [ ] Compare actual outputs with every expected result and the method verification steps. Record sanitized observations, not just “done.”
- [ ] Complete the evidence checklist. Remove tenant/subscription identifiers, account names, credentials, tokens and unrelated information from findings shared for review. No evidence is sent to AI by this increment.
- [ ] Answer the reflection before looking at the expected answer; record your reasoning and any content discrepancy.
- [ ] Inspect the exact group contents and (for the VNet) connected devices before deletion. Stop on unexpected resources; do not delete shared infrastructure or a regional Network Watcher.
- [ ] Perform scoped cleanup, wait for completion and independently inspect absence using the method's verification step. Record completed/pending explicitly; a failed query is not proof of deletion.
- [ ] Record learning outcome separately from cleanup. Classify failures as environment/access/policy or conceptual. Record elapsed practice and waiting time, discrepancies and follow-ups.

### Per-run result template

- Exercise/version and method:
- Reviewer / date:
- Sanitized environment and region:
- CLI version (or Portal N/A):
- Setup / practice / waiting minutes:
- Observed results and sanitized evidence:
- Hints/walkthrough exposed:
- Reflection response:
- Environment/access/policy problems:
- Conceptual problems or instruction defects:
- Extra resources/side effects:
- Cleanup outcome and evidence of absence:
- Overall walkthrough result: pending / failed / passed
- Required corrections:

## Contract

`content/labs.js` exports `labCatalogVersion` and `labs`; `content/lab-contract.js` exports pure `validateLabs(catalog)`, returning true or throwing an Error. The validator checks mappings, prerequisite cycles, resource/cleanup coverage, methods, provenance and release records without I/O or mutation. Changed instructions require a new exercise version and verification; release metadata alone does not change the instructions.
