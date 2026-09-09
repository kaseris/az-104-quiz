# Stage 2 content audit

Reviewed: 2026-09-06. Blueprint: 2026-04-17.

The shipped bank has **100 questions**, distributed **23 identity / 18 storage / 24 compute / 20 networking / 15 monitoring**, across all 15 objective groups. Close variants share families: **92 distinct families** support the 50-item allocation of 12/9/12/10/7.

The original 20 adaptations below are retained. The additional 80 adapt MIT-licensed public questions, labs, and reference concepts from the same pinned Tim Warner repository. These additions were written and editorially reviewed with AI assistance during development; they are not imported official exam questions and are not the runtime AI-generation feature planned for Stage 5. Review means comparing the answer and distractors against retrieved official documentation, not a human sign-off or execution of Azure deployments.

[STAGE2_CONTENT_AUDIT.json](STAGE2_CONTENT_AUDIT.json) records every added item’s skill/family, exact source section and revision URL, official reference, redirect destination, retrieval hash, and editorial review basis. Full Microsoft articles are not redistributed. The original MIT notice is retained. Source material contains outdated examples; only the adapted decision and linked current reference are approved, not every upstream claim. Sources were retrieved on 2026-09-06.

The bank samples 59 of 82 stable catalog skills. [STAGE2_SKILL_GAPS.json](STAGE2_SKILL_GAPS.json) lists the 23 uncovered skills. Local disputes can create further eligibility gaps, which the app computes dynamically.

## Original Stage 1 audit (historical)

### Starter content audit

Reviewed: 2026-09-06. Target outline: 2026-04-17.

## Provenance

20 adapted public items from [Tim Warner's AZ-104 repository](https://github.com/timothywarner/az104/tree/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions), pinned at commit 5f440153d0c835b8ba9f38353287e7ef1df65259. Copyright (c) 2021, Tim Warner. The original MIT license is included in [licenses/timothywarner-MIT.txt](../licenses/timothywarner-MIT.txt).

Both practice-question Markdown files and the license were inspected. No third-party PDFs, paid material, Microsoft assessment content, or linked external question banks were imported. Adaptations are marked in every question record and shown in answer review. Explanations and distractor rationales were rewritten; specific documentation below was consulted to check the answer, scope, and caveats. This is an editorial source review, not execution of Azure deployments or a psychometric exam validation.

## Coverage

| Domain                | Questions | Objective groups sampled |
| --------------------- | --------- | ------------------------ |
| Identity & governance | 4         | 3/3                      |
| Storage               | 4         | 3/3                      |
| Compute               | 4         | 3/4                      |
| Virtual networking    | 4         | 2/3                      |
| Monitoring & recovery | 4         | 2/2                      |

There are 13/15 objective groups sampled. Missing groups: ARM and Bicep deployments; DNS and load balancing. A sampled group can still have many untested individual skills. The introductory bank is deliberately small and must not be presented as comprehensive exam coverage.

## Item decisions

### identity-01: Govern across subscriptions

- Source: [Identity and Governance / Question 1](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: identity.governance; version 1; single-choice.
- Editorial change: Clarified that the question asks for a scope, and that subscriptions share a tenant.
- Answer evidence: [Management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview).

### identity-02: Give an operations team access

- Source: [Question 1.2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: identity.access; version 1; single-choice.
- Editorial change: Removed the bundled deletion constraint and corrected the explanation of Contributor permissions.
- Answer evidence: [General built-in roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/general).

### identity-03: Protect a production resource

- Source: [Question 1.3](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: identity.governance; version 1; single-choice.
- Editorial change: Replaced the absolute “anyone” claim with accidental control-plane deletion and documented lock removal.
- Answer evidence: [Resource locks](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources).

### identity-04: Invite an external contractor

- Source: [Question 2.1](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: identity.users; version 1; single-choice.
- Editorial change: Updated Azure AD naming and separated identity invitation from access expiry and authorization.
- Answer evidence: [B2B collaboration](https://learn.microsoft.com/en-us/entra/external-id/what-is-b2b).

### storage-01: Choose geo-redundant storage

- Source: [Storage / Question 1](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: storage.accounts; version 1; single-choice.
- Editorial change: Adapted the cmdlet question to test the redundancy behavior without outdated command distractors.
- Answer evidence: [Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy).

### storage-02: Move older blobs automatically

- Source: [Question 3.2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: storage.data; version 1; single-choice.
- Editorial change: Specified account type, blob type, and last-modified time instead of unspecified access patterns.
- Answer evidence: [Blob lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview).

### storage-03: Recover a deleted blob

- Source: [Question 3.3](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: storage.data; version 1; single-choice.
- Editorial change: Separated blob and container protection; clarified that protection must already be enabled.
- Answer evidence: [Blob soft delete](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview).

### storage-04: Delegate temporary access

- Source: [Question 4.2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: storage.access; version 1; single-choice.
- Editorial change: Added a stored-access-policy constraint to distinguish SAS types without implying service SAS is always preferred.
- Answer evidence: [Shared access signatures](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview).

### compute-01: Run a standalone container

- Source: [Compute Resources / Question 3](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: compute.containers; version 1; single-choice.
- Editorial change: Narrowed the workload to standalone container groups to avoid several equally plausible managed platforms.
- Answer evidence: [Container Instances overview](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-overview).

### compute-02: Design for a zone failure

- Source: [Question 5.1](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: compute.vms; version 1; single-choice.
- Editorial change: Removed an unqualified SLA claim and made redundancy, routing, and replication assumptions explicit.
- Answer evidence: [VM availability options](https://learn.microsoft.com/en-us/azure/virtual-machines/availability).

### compute-03: Stage an App Service release

- Source: [Question 5.2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: compute.apps; version 1; single-choice.
- Editorial change: Focused on a supported plan and slot swapping instead of conflating autoscaling, global routing, and SLA.
- Answer evidence: [App Service deployment slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots).

### compute-04: Resize a busy VM

- Source: [Question 6.2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: compute.vms; version 1; single-choice.
- Editorial change: Made CPU diagnosis explicit and included the restart/deallocation implications.
- Answer evidence: [Resize a VM](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm).

### networking-01: Filter subnet traffic

- Source: [Virtual Networking / Question 2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: networking.security; version 1; single-choice.
- Editorial change: Specified the rule inputs and distinguished grouping from enforcement.
- Answer evidence: [Network security groups](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview).

### networking-02: Reach storage on a private IP

- Source: [Virtual Networking / Question 3](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: networking.security; version 1; single-choice.
- Editorial change: Replaced ambiguous service-to-service wording with a private-IP requirement; corrected public-access implications.
- Answer evidence: [Private endpoints](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview).

### networking-03: Route internet traffic to a firewall

- Source: [Question 7.3](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: networking.networks; version 1; single-choice.
- Editorial change: Qualified longest-prefix behavior and included next-hop type and subnet association.
- Answer evidence: [Virtual network routing](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview).

### networking-04: Share a hub VPN gateway

- Source: [Question 7.2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md).
- Mapping: networking.networks; version 1; multiple-select.
- Editorial change: Split the paired settings into a two-answer item and stated gateway prerequisites.
- Answer evidence: [VPN gateway transit](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-peering-gateway-transit).

### monitoring-01: Read a CPU query

- Source: [Monitoring and Backup / Question 1](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: monitoring.monitor; version 1; single-choice.
- Editorial change: Added the total CPU instance filter and described returned bins precisely.
- Answer evidence: [Perf query examples](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/perf).

### monitoring-02: Understand a metric alert

- Source: [Monitoring and Backup / Question 2](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: monitoring.monitor; version 1; single-choice.
- Editorial change: Separated condition evaluation from notification behavior.
- Answer evidence: [Metric alert CLI reference](https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest).

### monitoring-03: Back up an Azure file share

- Source: [Compute Resources / Question 5](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: monitoring.backup; version 1; single-choice.
- Editorial change: Reclassified under recovery and specified supported SMB shares.
- Answer evidence: [Azure Files backup](https://learn.microsoft.com/en-us/azure/backup/azure-file-share-backup-overview).

### monitoring-04: Analyze VM performance

- Source: [Compute Resources / Question 4](https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md).
- Mapping: monitoring.monitor; version 1; single-choice.
- Editorial change: Reclassified under monitoring and clarified that guest telemetry requires configuration.
- Answer evidence: [Monitor virtual machines](https://learn.microsoft.com/en-us/azure/azure-monitor/vm/monitor-virtual-machine).

## Exclusions and corrections

The full source bank was not copied wholesale. In particular:

- VM monitoring and Azure Files backup appear twice in the practice bank, under Compute and Networking. Keep one of each and classify under Monitoring/Recovery.
- A single VM placed in an availability zone is not itself resilient to loss of that zone. The selected availability scenario specifies replicated serving instances across zones.
- Contributor does not intrinsically deny deletion. Deletion locks and role permissions are separate controls.
- Resource locks can be removed by authorized administrators and operate on control-plane requests; avoid the original absolute claim about preventing anyone from deleting a resource.
- The generic memory-optimized sizing question allows more than one plausible size family; it was not selected.
- Broad service selection, global-routing alternatives, and multi-domain “select all” questions are not used without narrower constraints.
- The original temporary SAS question did not distinguish all available SAS types. The adaptation explicitly requires a stored access policy.
- A private endpoint does not, by itself, disable public network access. The adapted question asks specifically for a private interface.
- CLI/ARM diagnostic-setting snippets, blanket vault/DR claims, and automatic contractor-expiry claims were not selected; they require additional technical review before import.
- The routing item includes a no-more-specific-route assumption; gateway transit lists its prerequisites and is converted to two explicit selections.

## Update process

Recheck the cited documentation, change wording or answers deliberately, and increment the item version when meaning changes. Preserve the upstream commit and attribution. Validate the bank, run scoring/persistence tests, and add coverage only when supporting sources are clear. Existing sessions preserve their old snapshots, including citations and answer explanations.
