import { expandedQuestions } from './expanded-questions.js';
import { mapping } from './mappings.js';
import { blueprint } from './catalog.js';

export const sourceRevision = '5f440153d0c835b8ba9f38353287e7ef1df65259';
const root = `https://github.com/timothywarner/az104/blob/${sourceRevision}/practice-questions/`;
const doc = (path) => `https://learn.microsoft.com/en-us/${path}`;

/** Reviewed adaptations, not actual examination items. Option IDs never depend on display order. */
function question(
  id,
  objectiveId,
  title,
  prompt,
  choices,
  answers,
  explanation,
  reference,
  sourceSection,
  changes,
  code,
) {
  const [file, section] = sourceSection;
  return {
    id,
    ...mapping({ id, version: 1 }),
    version: 1,
    blueprintVersion: blueprint.version,
    domainId: objectiveId.split('.')[0],
    objectiveId,
    title,
    prompt,
    type: answers.length > 1 ? 'multiple' : 'single',
    options: choices.map(([text, rationale], index) => ({ id: `o${index + 1}`, text, rationale })),
    correctOptionIds: answers.map((a) => `o${a}`),
    explanation,
    references: [{ title: reference[0], url: doc(reference[1]) }],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: sourceRevision,
      url: `${root}az104-${file}-questions.md`,
      section,
      changes,
    },
    reviewedAt: '2026-09-06',
    ...(code ? { code } : {}),
  };
}

export const starterQuestions = [
  question(
    'identity-01',
    'identity.governance',
    'Govern across subscriptions',
    'Your organization has several Azure subscriptions in the same Microsoft Entra tenant. You need one parent scope where policy assignments can be inherited by all of them. Which scope should you use?',
    [
      ['Resource group', 'A resource group belongs to one subscription.'],
      [
        'Management group',
        'A management group can contain subscriptions and pass policy assignments down to them.',
      ],
      [
        'Policy initiative',
        'An initiative groups policy definitions; it is not a parent scope for subscriptions.',
      ],
      ['Resource tag', 'Tags classify resources but do not create an inheritance hierarchy.'],
    ],
    [2],
    'Organize the subscriptions under a management group, then assign the policy at that scope. Descendant subscriptions inherit the assignment.',
    ['Management groups', 'azure/governance/management-groups/overview'],
    ['practice', 'Identity and Governance / Question 1'],
    'Clarified that the question asks for a scope, and that subscriptions share a tenant.',
  ),
  question(
    'identity-02',
    'identity.access',
    'Give an operations team access',
    'An operations team must create and manage all resource types in a resource group, but must not assign Azure RBAC roles. Which built-in role meets these requirements?',
    [
      ['Owner', 'Owner also allows access management, which exceeds the requirement.'],
      [
        'Contributor',
        'Contributor manages resources without permission to assign Azure RBAC roles.',
      ],
      [
        'Virtual Machine Contributor',
        'This role is limited to virtual machine management and related operations.',
      ],
      ['Reader', 'Reader cannot create or change resources.'],
    ],
    [2],
    'Assign Contributor at the resource-group scope. Contributor does allow resource deletion unless a separate control, such as a deletion lock, prevents it.',
    ['General built-in roles', 'azure/role-based-access-control/built-in-roles/general'],
    ['scenario', 'Question 1.2'],
    'Removed the bundled deletion constraint and corrected the explanation of Contributor permissions.',
  ),
  question(
    'identity-03',
    'identity.governance',
    'Protect a production resource',
    'You want to prevent accidental deletion of a production resource through Azure Resource Manager while still allowing configuration updates. Which lock should you apply?',
    [
      ['ReadOnly', 'ReadOnly also prevents updates through the control plane.'],
      [
        'CanNotDelete',
        'A deletion lock allows reads and updates while blocking deletion through Resource Manager.',
      ],
      ['A resource tag named Protected', 'A tag alone does not enforce a deletion restriction.'],
      ['A backup retention policy', 'Backups help recovery; they do not block resource deletion.'],
    ],
    [2],
    'CanNotDelete protects against control-plane deletion while permitting updates. A user with permission to manage locks can remove the lock; it is not an absolute guarantee against all administrators or data-plane deletion.',
    ['Resource locks', 'azure/azure-resource-manager/management/lock-resources'],
    ['scenario', 'Question 1.3'],
    'Replaced the absolute “anyone” claim with accidental control-plane deletion and documented lock removal.',
  ),
  question(
    'identity-04',
    'identity.users',
    'Invite an external contractor',
    'A contractor must access your tenant using their existing work identity. You want to represent them as an external guest instead of issuing a new employee account. What should you use?',
    [
      [
        'A local employee account with a shared password',
        'This issues another identity and creates shared-credential risk.',
      ],
      [
        'Microsoft Entra B2B collaboration',
        'B2B lets invited external users collaborate using their own identity.',
      ],
      [
        'A new tenant for every contractor',
        'A separate tenant per contractor is not required for guest collaboration.',
      ],
      [
        'A shared service principal secret',
        'A service principal is a workload identity, not a personal guest account.',
      ],
    ],
    [2],
    'Invite the contractor through Microsoft Entra B2B collaboration. The guest still needs appropriate authorization to the resources they will use.',
    ['B2B collaboration', 'entra/external-id/what-is-b2b'],
    ['scenario', 'Question 2.1'],
    'Updated Azure AD naming and separated identity invitation from access expiry and authorization.',
  ),
  question(
    'storage-01',
    'storage.accounts',
    'Choose geo-redundant storage',
    'A standard storage account needs three locally redundant copies in its primary region and asynchronous replication to another region. Read access to the secondary is not required. Which redundancy option fits?',
    [
      ['LRS', 'Locally redundant storage keeps copies in one primary location.'],
      ['ZRS', 'Zone-redundant storage distributes copies across zones in the primary region.'],
      [
        'GRS',
        'Geo-redundant storage combines local primary copies with asynchronous secondary-region replication.',
      ],
      [
        'RA-GZRS',
        'This adds primary-zone redundancy and secondary read access, neither of which is required.',
      ],
    ],
    [3],
    'GRS replicates locally in the primary region and asynchronously to a secondary region. Asynchronous replication means it does not guarantee zero data loss during a regional failure.',
    ['Storage redundancy', 'azure/storage/common/storage-redundancy'],
    ['practice', 'Storage / Question 1'],
    'Adapted the cmdlet question to test the redundancy behavior without outdated command distractors.',
  ),
  question(
    'storage-02',
    'storage.data',
    'Move older blobs automatically',
    'Block blobs in a general-purpose v2 account should move from Hot to Cool once they have not been modified for 30 days. Which feature automates this transition?',
    [
      [
        'Azure Storage Explorer',
        'Storage Explorer provides interactive management, not a server-side lifecycle policy.',
      ],
      [
        'Blob lifecycle management',
        'Lifecycle rules can transition eligible blobs using their age or last-modified time.',
      ],
      ['A resource lock', 'Locks control management operations; they do not change access tiers.'],
      ['An Azure RBAC assignment', 'RBAC controls access permissions, not tier transitions.'],
    ],
    [2],
    'Configure a lifecycle rule for eligible block blobs using days since last modification. Policy execution is asynchronous, so do not expect a transition at an exact minute.',
    ['Blob lifecycle management', 'azure/storage/blobs/lifecycle-management-overview'],
    ['scenario', 'Question 3.2'],
    'Specified account type, blob type, and last-modified time instead of unspecified access patterns.',
  ),
  question(
    'storage-03',
    'storage.data',
    'Recover a deleted blob',
    'You need the ability to recover individual blobs deleted after protection is enabled, for up to 14 days. Which feature should you configure with a 14-day retention period?',
    [
      [
        'Blob soft delete',
        'Soft delete retains deleted blobs for the configured recovery interval.',
      ],
      [
        'Container soft delete alone',
        'Container soft delete protects a deleted container, not individual blobs deleted from a live container.',
      ],
      [
        'A ReadOnly resource lock',
        'A control-plane lock does not protect individual blob data operations.',
      ],
      [
        'Storage account geo-redundancy alone',
        'Replication also propagates data changes and is not a substitute for soft delete.',
      ],
    ],
    [1],
    'Enable blob soft delete and set retention to 14 days before deletion occurs. Container soft delete is a separate setting for recovering deleted containers.',
    ['Blob soft delete', 'azure/storage/blobs/soft-delete-blob-overview'],
    ['scenario', 'Question 3.3'],
    'Separated blob and container protection; clarified that protection must already be enabled.',
  ),
  question(
    'storage-04',
    'storage.access',
    'Delegate temporary access',
    'A vendor needs time-limited read access to blobs in one container and already has network connectivity to the account. The delegation must be associated with a stored access policy. Which credential type supports this?',
    [
      [
        'The storage account key',
        'An account key grants much broader access and is not scoped by a stored access policy.',
      ],
      ['A service SAS', 'A service SAS can reference a stored access policy on a container.'],
      ['An account SAS', 'An account SAS cannot be associated with a stored access policy.'],
      ['A user delegation SAS', 'A user delegation SAS does not support stored access policies.'],
    ],
    [2],
    'A service SAS can inherit read permissions and expiry from a stored access policy. Without this specific requirement, prefer a user delegation SAS where possible. A SAS authorizes data access; it does not bypass network restrictions.',
    ['Shared access signatures', 'azure/storage/common/storage-sas-overview'],
    ['scenario', 'Question 4.2'],
    'Added a stored-access-policy constraint to distinguish SAS types without implying service SAS is always preferred.',
  ),
  question(
    'compute-01',
    'compute.containers',
    'Run a standalone container',
    'You need to run a short-lived container as a standalone container group. You do not need Kubernetes orchestration or a web-app hosting platform and do not want to manage a VM. Which service is designed for this?',
    [
      [
        'Azure Kubernetes Service',
        'AKS introduces a Kubernetes environment not needed by this scenario.',
      ],
      [
        'Azure Container Instances',
        'ACI runs container groups without requiring a VM or a Kubernetes cluster to manage.',
      ],
      [
        'A virtual machine with Docker installed',
        'You would be responsible for the virtual machine.',
      ],
      [
        'Azure Virtual Desktop',
        'Virtual Desktop provides hosted desktops and applications, not standalone container groups.',
      ],
    ],
    [2],
    'Azure Container Instances provides a direct way to run a container group. Choose a higher-level service when you need its orchestration or application-platform features.',
    ['Container Instances overview', 'azure/container-instances/container-instances-overview'],
    ['practice', 'Compute Resources / Question 3'],
    'Narrowed the workload to standalone container groups to avoid several equally plausible managed platforms.',
  ),
  question(
    'compute-02',
    'compute.vms',
    'Design for a zone failure',
    'A web application can run on multiple identical VMs. To keep a serving instance available if one availability zone fails, where should you place the VMs? Assume traffic routing and application replication are configured.',
    [
      [
        'In one availability set in a single zone',
        'This does not place serving instances across separate zones.',
      ],
      ['On one larger VM', 'One VM remains a single serving instance.'],
      [
        'Across at least two availability zones in the region',
        'Multiple zones separate instances across independent zone infrastructure.',
      ],
      [
        'On one VM with daily backups',
        'Backups support recovery but do not keep another instance serving during a zone failure.',
      ],
    ],
    [3],
    'Distribute replicated serving instances across zones. Placing a single VM in one zone does not make the application resilient to that zone failing.',
    ['VM availability options', 'azure/virtual-machines/availability'],
    ['scenario', 'Question 5.1'],
    'Removed an unqualified SLA claim and made redundancy, routing, and replication assumptions explicit.',
  ),
  question(
    'compute-03',
    'compute.apps',
    'Stage an App Service release',
    'An application runs on an Azure App Service Standard plan. You need to validate a new version at a separate endpoint and then swap it into production. What should you configure?',
    [
      [
        'A deployment slot',
        'A staging slot has its own endpoint and can be swapped with production.',
      ],
      ['An availability set', 'Availability sets apply to VMs, not App Service release slots.'],
      ['A storage lifecycle rule', 'Lifecycle rules manage blob data tiers and retention.'],
      [
        'A network security group',
        'An NSG filters traffic; it does not stage and swap application versions.',
      ],
    ],
    [1],
    'Use a staging deployment slot and then perform a slot swap. Verify application behavior and slot-specific settings before swapping; the Standard plan supports deployment slots.',
    ['App Service deployment slots', 'azure/app-service/deploy-staging-slots'],
    ['scenario', 'Question 5.2'],
    'Focused on a supported plan and slot swapping instead of conflating autoscaling, global routing, and SLA.',
  ),
  question(
    'compute-04',
    'compute.vms',
    'Resize a busy VM',
    'A database on a standalone E-series VM has sustained CPU pressure. Testing confirms it needs more vCPUs while retaining a high memory-to-CPU ratio. Which action increases the capacity of this VM?',
    [
      ['Add more data disks only', 'More disks do not add vCPUs.'],
      [
        'Resize to a compatible larger E-series size',
        'A larger suitable VM size can add the required CPU and memory capacity.',
      ],
      ['Enable a resource lock', 'Locks do not change compute capacity.'],
      ['Change the public IP address', 'An IP address does not affect VM CPU capacity.'],
    ],
    [2],
    'Resize to a supported size after checking regional availability, quota, and workload compatibility. Resizing a running VM causes a restart and may require deallocation.',
    ['Resize a VM', 'azure/virtual-machines/sizes/resize-vm'],
    ['scenario', 'Question 6.2'],
    'Made CPU diagnosis explicit and included the restart/deallocation implications.',
  ),
  question(
    'networking-01',
    'networking.security',
    'Filter subnet traffic',
    'You need rules that allow or deny inbound traffic to a subnet based on source, destination, protocol, and port. Which resource should you associate with the subnet?',
    [
      ['A route table', 'Routes choose the next hop, not allow/deny port filtering.'],
      [
        'A network security group',
        'NSG rules filter traffic using addresses, protocols, and ports.',
      ],
      [
        'An application security group alone',
        'An ASG groups interfaces for use in NSG rules; it does not filter on its own.',
      ],
      [
        'A service endpoint',
        'Service endpoints extend subnet identity to a service, not general traffic filtering.',
      ],
    ],
    [2],
    'Associate an NSG with the subnet and configure security rules. Evaluate rule priorities and any NIC-level NSGs when checking effective access.',
    ['Network security groups', 'azure/virtual-network/network-security-groups-overview'],
    ['practice', 'Virtual Networking / Question 2'],
    'Specified the rule inputs and distinguished grouping from enforcement.',
  ),
  question(
    'networking-02',
    'networking.security',
    'Reach storage on a private IP',
    'Your application must connect to a supported Azure Storage service through an IP address from your VNet subnet. Which feature supplies that private network interface?',
    [
      ['A public IP address', 'A public IP does not satisfy the private address requirement.'],
      [
        'A service endpoint',
        'A service endpoint does not allocate a private endpoint interface in your subnet.',
      ],
      [
        'A private endpoint',
        'A private endpoint uses a private address in the VNet to reach a supported service.',
      ],
      ['A resource tag', 'Tags are metadata and do not provide connectivity.'],
    ],
    [3],
    'Create a private endpoint for the required storage subresource and configure DNS appropriately. Creating the private endpoint does not itself disable the service’s public endpoint.',
    ['Private endpoints', 'azure/private-link/private-endpoint-overview'],
    ['practice', 'Virtual Networking / Question 3'],
    'Replaced ambiguous service-to-service wording with a private-IP requirement; corrected public-access implications.',
  ),
  question(
    'networking-03',
    'networking.networks',
    'Route internet traffic to a firewall',
    'A workload subnet must send traffic matching the default internet route through an Azure Firewall private IP. No more-specific route applies. Which user-defined route should you add?',
    [
      ['0.0.0.0/0 → Internet', 'This sends matching traffic directly to the Internet next hop.'],
      [
        '0.0.0.0/0 → Virtual appliance, using the firewall private IP',
        'The virtual-appliance next hop directs matching traffic to the firewall.',
      ],
      ['0.0.0.0/0 → None', 'A None next hop drops matching traffic.'],
      [
        'The firewall public IP as the subnet DNS server',
        'DNS configuration does not create a forwarding route.',
      ],
    ],
    [2],
    'Associate a route table containing the default route with the workload subnet. Use the firewall private IP as the virtual-appliance next hop. More-specific routes can take precedence.',
    ['Virtual network routing', 'azure/virtual-network/virtual-networks-udr-overview'],
    ['scenario', 'Question 7.3'],
    'Qualified longest-prefix behavior and included next-hop type and subnet association.',
  ),
  question(
    'networking-04',
    'networking.networks',
    'Share a hub VPN gateway',
    'A hub VNet has a supported VPN gateway. A peered spoke has no gateway of its own. Which two gateway-related peering settings allow the spoke to use the hub gateway? Assume the other required peering settings are already enabled.',
    [
      [
        'Allow gateway transit on the hub-to-spoke peering',
        'The hub must make its gateway available to its peer.',
      ],
      [
        'Use remote gateways on the spoke-to-hub peering',
        'The spoke must select the gateway available in the peered hub.',
      ],
      [
        'Use remote gateways on the hub-to-spoke peering',
        'The hub owns the gateway; it is not borrowing one from the spoke.',
      ],
      [
        'Deploy another VPN gateway in the spoke',
        'A separate spoke gateway is unnecessary and conflicts with the stated design.',
      ],
    ],
    [1, 2],
    'Enable gateway transit on the hub side and use of remote gateways on the spoke side. The spoke cannot use a remote gateway while it has its own gateway. Basic VPN Gateway SKU does not support gateway transit.',
    ['VPN gateway transit', 'azure/vpn-gateway/vpn-gateway-peering-gateway-transit'],
    ['scenario', 'Question 7.2'],
    'Split the paired settings into a two-answer item and stated gateway prerequisites.',
  ),
  question(
    'monitoring-01',
    'monitoring.monitor',
    'Read a CPU query',
    'The workspace collects the relevant total CPU counters in Perf. What does this query return?',
    [
      [
        'Every individual CPU sample above 90%',
        'The query aggregates samples before applying its filter.',
      ],
      [
        'Computer and five-minute time bins whose average CPU is above 90%',
        'summarize groups by Computer and time bin, then the result is filtered by AvgCPU.',
      ],
      [
        'One CPU average per computer for the whole day',
        'It looks back one hour and groups into five-minute bins.',
      ],
      ['The count of CPU spikes per computer', 'avg calculates a mean, not a count.'],
    ],
    [2],
    'The query considers the last hour, groups samples per computer into five-minute bins, and returns only groups with an average above 90%. It does not require every sample in a bin to exceed 90%.',
    ['Perf query examples', 'azure/azure-monitor/reference/queries/perf'],
    ['practice', 'Monitoring and Backup / Question 1'],
    'Added the total CPU instance filter and described returned bins precisely.',
    {
      language: 'kusto',
      text: 'Perf\n| where ObjectName == "Processor"\n    and CounterName == "% Processor Time"\n    and InstanceName == "_Total"\n| where TimeGenerated > ago(1h)\n| summarize AvgCPU = avg(CounterValue)\n    by Computer, bin(TimeGenerated, 5m)\n| where AvgCPU > 90',
    },
  ),
  question(
    'monitoring-02',
    'monitoring.monitor',
    'Understand a metric alert',
    'An Azure metric alert uses max Percentage CPU > 90, a five-minute window, and a one-minute evaluation frequency. How is its condition evaluated?',
    [
      [
        'All five consecutive minute averages must exceed 90%',
        'The aggregation is maximum, not five consecutive averages.',
      ],
      [
        'Each minute, it checks whether the maximum in the preceding five-minute window exceeds 90%',
        'Evaluation frequency and lookback window are separate settings.',
      ],
      [
        'Every five minutes, it checks the average of the last minute',
        'This reverses the settings and uses the wrong aggregation.',
      ],
      ['Only once, when the rule is created', 'An enabled metric alert evaluates repeatedly.'],
    ],
    [2],
    'The rule evaluates every minute using the maximum value in its five-minute lookback. This describes condition evaluation, not a guarantee that a notification is sent every minute.',
    ['Metric alert CLI reference', 'cli/azure/monitor/metrics/alert?view=azure-cli-latest'],
    ['practice', 'Monitoring and Backup / Question 2'],
    'Separated condition evaluation from notification behavior.',
  ),
  question(
    'monitoring-03',
    'monitoring.backup',
    'Back up an Azure file share',
    'You need centrally managed backup policies and restore operations for a supported Azure SMB file share. Which Azure service provides this integration?',
    [
      [
        'Azure Site Recovery',
        'Site Recovery focuses on replication and disaster recovery for supported machines.',
      ],
      [
        'Azure Backup',
        'Azure Backup integrates with Azure Files for policy-based backup and restore.',
      ],
      [
        'Storage replication alone',
        'Replication does not provide the requested backup policy and restore management.',
      ],
      ['Azure Network Watcher', 'Network Watcher diagnoses and monitors networking.'],
    ],
    [2],
    'Use Azure Backup for Azure Files and configure a suitable policy. Replication and backup solve different problems; check the supported share and backup-tier requirements.',
    ['Azure Files backup', 'azure/backup/azure-file-share-backup-overview'],
    ['practice', 'Compute Resources / Question 5'],
    'Reclassified under recovery and specified supported SMB shares.',
  ),
  question(
    'monitoring-04',
    'monitoring.monitor',
    'Analyze VM performance',
    'You want one Azure monitoring platform for VM performance metrics and collected guest logs, with analysis and alerting. Which service should you use?',
    [
      [
        'Azure Monitor',
        'Azure Monitor combines resource metrics, collected logs, analysis, and alerts.',
      ],
      [
        'Azure Service Health only',
        'Service Health reports Azure service issues rather than collecting your guest performance logs.',
      ],
      [
        'Azure Activity Log only',
        'The Activity Log records control-plane events, not general guest performance telemetry.',
      ],
      [
        'Azure Resource Manager locks',
        'Locks protect management operations; they do not collect telemetry.',
      ],
    ],
    [1],
    'Use Azure Monitor. Host metrics and guest logs have different collection requirements; guest telemetry may require Azure Monitor Agent and data collection rules.',
    ['Monitor virtual machines', 'azure/azure-monitor/vm/monitor-virtual-machine'],
    ['practice', 'Compute Resources / Question 4'],
    'Reclassified under monitoring and clarified that guest telemetry requires configuration.',
  ),
];

export const questions = [...starterQuestions, ...expandedQuestions];
