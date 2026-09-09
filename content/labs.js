import { blueprint } from './catalog.js';
import { batch1Labs } from './labs-batch1.js';

export const labCatalogVersion = 'labs-2026-09-08-v3';
const reviewedAt = '2026-09-07';
const source = (title, path) => ({
  title,
  url: `https://learn.microsoft.com/en-us/${path}`,
  publisher: 'Microsoft',
  reviewedAt,
});
const commonSources = [
  source(
    'Resource groups in Azure CLI',
    'azure/azure-resource-manager/management/manage-resource-groups-cli',
  ),
  source(
    'Resource groups in Azure Portal',
    'azure/azure-resource-manager/management/manage-resource-groups-portal',
  ),
  source(
    'Contributor role',
    'azure/role-based-access-control/built-in-roles/privileged#contributor',
  ),
];
const setup = `# Run one block at a time in Bash; stop on any error. Replace every placeholder.
az login
az version
LAB_SUBSCRIPTION='REPLACE_WITH_SUBSCRIPTION_ID'
LAB_LOCATION='REPLACE_WITH_ALLOWED_REGION'
LAB_GROUP='REPLACE_WITH_NEW_DEDICATED_GROUP_NAME'
az account set --subscription "$LAB_SUBSCRIPTION"
az account show --query '{subscription:id,name:name,tenant:tenantId}' --output json
az account list-locations --query '[].name' --output tsv
az group exists --name "$LAB_GROUP"`;
const createGroup = `az group create --name "$LAB_GROUP" --location "$LAB_LOCATION" --tags Purpose=az104-pilot`;
const inspect = `az account show --query '{subscription:id,name:name}' --output json
az group show --name "$LAB_GROUP" --query '{id:id,tags:tags}' --output json
az resource list --resource-group "$LAB_GROUP" --query '[].{name:name,type:type,id:id}' --output json`;
const remove = `# Only after inspecting the resource list and confirming this is your dedicated lab group.
# This prompts for confirmation and deletes everything in that group.
az group delete --name "$LAB_GROUP"
az group exists --name "$LAB_GROUP"`;
// Editorial release records from user reports, not independently queried Azure state.
// verifiedAt uses the supplied walkthrough date; retry timing was not supplied separately.
function verificationFor(id) {
  const tags = id === 'rg-tags';
  const record = (method, elapsedMinutes, findings, evidence) => ({
    status: 'passed',
    labVersion: 1,
    verifiedAt: '2026-09-07',
    reviewer: 'User walkthrough; reviewed in 6A.2',
    environment:
      'User Azure subscription; dedicated exercise resource groups. Region not reported.',
    findings,
    evidence,
    elapsedMinutes,
    cleanupOutcome: 'completed',
    ...(method === 'cli' ? { cliVersion: '2.90.0' } : {}),
  });
  return {
    portal: record(
      'portal',
      tags ? 1.5 : 2,
      tags
        ? 'Expected tag values reported; no instruction defect reported.'
        : 'Expected subnet values reported. Original pilot names and ranges retained by user request; exact Portal ranges were not separately reported.',
      tags
        ? 'User reported both tags correct, resource group deleted and absence confirmed in Portal.'
        : 'User reported both subnets correct, VNet deleted, and later confirmed dedicated resource group deleted and Portal clear of resources.',
    ),
    cli: record(
      'cli',
      tags ? 3 : 10,
      tags
        ? 'Expected tags reported using CLI 2.90.0; 3 minutes includes reading.'
        : 'Passed after assisted retries: missing prefix, then prefix outside VNet. Read-only output showed 10.0.0.0/16 with subnet1 10.0.0.0/24; user confirmed subnet2 creation with 10.0.1.0/24. Accepted as equivalent containment/non-overlap exercise, not exact execution of original names/ranges. 10 minutes refers to initial failed attempt including reading; retry duration/date not separately reported.',
      tags
        ? 'User reported expected tags and group deletion, with absence checked in Portal.'
        : 'User supplied initial VNet/subnet ranges, confirmed successful second-subnet creation, then confirmed dedicated group deletion and Portal clear of resources. Final subnet-list output was not supplied. See docs/STAGE6_VERIFICATION.md for preserved failed attempts and limitations.',
    ),
  };
}
function base(id, title, domainId, objectiveId, primarySkillId) {
  return {
    id,
    title,
    version: 1,
    contractVersion: 1,
    blueprintVersion: blueprint.version,
    domainId,
    objectiveId,
    primarySkillId,
    relatedSkillIds: [],
    prerequisiteLabIds: [],
    status: 'released',
    provenance: {
      kind: 'original-documentation-based',
      author: 'AZ-104 Study Desk',
      reviewBasis:
        'AI-assisted documentation review and user-reported Azure walkthroughs; alternate VNet CLI ranges accepted in 6A.2. No independent agent verification.',
      reviewedAt,
      notice:
        'Original exercise prose and command examples based on the attributed Microsoft documentation; not a Microsoft-endorsed lab.',
    },
    verification: verificationFor(id),
    prerequisites: [
      'Use an authorized learning subscription with network access to Azure. No free sandbox is supplied.',
      'Confirm the tenant, subscription, allowed region, naming rules and policies with your administrator. Never weaken organization policies for a lab.',
      'Choose a new dedicated resource group for each run. If the name already exists, choose another name; do not reuse a shared group.',
      'CLI method: install a current Azure CLI and use Bash locally; record az version. Cloud Shell is optional and may involve storage charges. Installation, sign-in and permissions setup are additional time.',
      'Instructions can be read without AI or internet from the source checkout; carrying out the lab requires Azure connectivity. Nothing here executes commands automatically.',
    ],
    requiredRoles: [
      {
        role: 'Contributor or an administrator-approved custom role with equivalent exercise permissions',
        scope:
          'Existing authorization on the selected learning subscription, including resource-group create/read/delete and the operations below. The app does not request or assign roles.',
      },
    ],
    selection: [
      'Select and confirm the intended tenant and subscription in the Portal directory/subscription filter or az account show.',
      'Select a region permitted by your subscription; record it and the exact dedicated resource names before creating anything.',
    ],
    troubleshooting: [
      {
        kind: 'environment',
        symptom:
          'AuthorizationFailed, denied policy, unregistered provider, region restriction or CLI/login failure',
        action:
          'Stop and record the sanitized error. Ask the environment administrator to resolve access or policy requirements; do not mark this a conceptual mistake.',
      },
      {
        kind: 'conceptual',
        symptom: 'The operation succeeds but the resulting configuration differs from the goal',
        action:
          'Compare the expected results, reveal hints in order if needed, and explain the discrepancy before correcting the lab resources.',
      },
    ],
  };
}
function cleanup(resourceIds, expected) {
  return {
    resourceIds,
    keepResources:
      'If you intentionally retain resources, record cleanup pending separately from learning completion. Complete cleanup later and record its date.',
    portal: [
      `Open the exact dedicated group in the confirmed subscription. Refresh its resource list: expect ${expected}. Inspect names, types and ownership before deleting. If unexpected resources exist, stop and investigate; do not delete them.`,
      'Delete this dedicated resource group only, review the deletion list, and enter its name to confirm. Wait for completion, then refresh Resource groups and confirm it is absent under the same subscription filter.',
    ],
    cli: [
      inspect,
      `Expect ${expected}. Stop if any resource is unrelated or unexpected. Check the group name and subscription again, then run the next block.`,
      remove,
    ],
    verification:
      'Cleanup passes only when the group is absent in the Portal or az group exists succeeds with false. A failed query, permission error or timeout is not proof of deletion. If blocked by locks or policy, retain cleanup pending and ask the administrator; do not remove unrelated locks.',
  };
}

export const labs = [
  {
    ...base(
      'rg-tags',
      'Manage tags on a dedicated resource group',
      'identity',
      'identity.governance',
      'identity.governance.tags',
    ),
    goal: 'Add Environment=Practice to a dedicated empty group, change it to Review while preserving Purpose=az104-pilot, then explain merge versus replacement.',
    relatedSkillIds: ['identity.governance.groups'],
    duration: {
      minMinutes: 10,
      maxMinutes: 15,
      setupNote:
        'Allow additional time for installation, authentication, access approval and deletion.',
    },
    resources: [
      {
        id: 'group',
        type: 'Microsoft.Resources/resourceGroups',
        name: 'User-selected LAB_GROUP',
        purpose: 'Empty, dedicated container for practicing tags.',
      },
    ],
    costs: {
      reviewedAt,
      estimate:
        'No priced workload is intentionally created: the group stays empty. No numerical total is quoted; check your subscription and any optional shell storage costs before starting.',
      restrictions: [
        'Do not add storage, compute or other workloads to this group.',
        'Do not put personal data, secrets or subscription identifiers in tags.',
      ],
      sources: [
        {
          title: 'Azure pricing calculator',
          url: 'https://azure.microsoft.com/en-us/pricing/calculator/',
          publisher: 'Microsoft',
          reviewedAt,
        },
      ],
    },
    sources: [
      ...commonSources,
      source('CLI tag operations', 'azure/azure-resource-manager/management/tag-resources-cli'),
      source(
        'Portal tag operations',
        'azure/azure-resource-manager/management/tag-resources-portal',
      ),
      source(
        'Tag behavior and limitations',
        'azure/azure-resource-manager/management/tag-resources',
      ),
    ],
    hints: [
      'Find the Tags page on the resource group itself.',
      'Keep Purpose while changing only Environment.',
      'In Bash, use az tag update with --operation Merge and the group resource ID; Replace would discard tags omitted from the request.',
    ],
    methods: {
      portal: {
        walkthrough: [
          'Confirm the subscription and choose a new group name and allowed region. In Resource groups, select Create, enter these values, add Purpose=az104-pilot on Tags, review and create.',
          'Open the new group. On Tags, add Environment=Practice and Apply. Refresh and inspect both values.',
          'Change only Environment to Review, Apply, then refresh. Retain Purpose=az104-pilot.',
        ],
        verification: [
          'On the group Tags page confirm Environment=Review and Purpose=az104-pilot. On Overview confirm the resource list is empty.',
        ],
      },
      cli: {
        shell: 'bash',
        walkthrough: [
          setup,
          'Continue only if the selected account and region are correct and az group exists successfully returned false. Stop on errors or an existing group. Run the following blocks one at a time.',
          createGroup,
          `LAB_GROUP_ID=$(az group show --name "$LAB_GROUP" --query id --output tsv)
az tag update --resource-id "$LAB_GROUP_ID" --operation Merge --tags Environment=Practice
az tag list --resource-id "$LAB_GROUP_ID"`,
          `az tag update --resource-id "$LAB_GROUP_ID" --operation Merge --tags Environment=Review`,
        ],
        verification: [
          `az tag list --resource-id "$LAB_GROUP_ID"
az resource list --resource-group "$LAB_GROUP" --output json`,
          'Expect Environment=Review and Purpose=az104-pilot in properties.tags; the resource list must be empty.',
        ],
      },
    },
    expectedResults: [
      'Environment=Review and Purpose=az104-pilot coexist on the dedicated resource group.',
      'No workload resources were created.',
    ],
    evidenceChecklist: [
      'Record the chosen method and sanitized final tag values.',
      'Confirm the group is empty and record which hints or walkthrough sections you used.',
      'Record learning completion and cleanup outcome separately; neither is independently verified by the app.',
    ],
    reflection: {
      prompt:
        'What happens to Purpose if you use Replace with only Environment? Are group tags automatically copied to child resources?',
      expectedAnswer:
        'Replace removes omitted tags, including Purpose. Group tags are not automatically inherited by resources; inheritance requires an explicit mechanism such as policy.',
    },
    cleanup: cleanup(['group'], 'an empty resource list'),
  },
  {
    ...base(
      'vnet-two-subnets',
      'Create a virtual network with two subnets',
      'networking',
      'networking.networks',
      'networking.networks.create',
    ),
    goal: 'Create a 10.42.0.0/16 virtual network with frontend 10.42.1.0/24 and backend 10.42.2.0/24; explain containment and non-overlap.',
    duration: {
      minMinutes: 15,
      maxMinutes: 20,
      setupNote:
        'Allow additional time for provider registration by your administrator, policy checks and deployment/deletion waits.',
    },
    resources: [
      {
        id: 'group',
        type: 'Microsoft.Resources/resourceGroups',
        name: 'User-selected LAB_GROUP',
        purpose: 'Dedicated container for this run.',
      },
      {
        id: 'vnet',
        type: 'Microsoft.Network/virtualNetworks',
        name: 'User-selected LAB_VNET',
        purpose: '10.42.0.0/16 address space.',
      },
      {
        id: 'frontend',
        type: 'Microsoft.Network/virtualNetworks/subnets',
        name: 'frontend',
        purpose: '10.42.1.0/24 inside the VNet.',
      },
      {
        id: 'backend',
        type: 'Microsoft.Network/virtualNetworks/subnets',
        name: 'backend',
        purpose: '10.42.2.0/24 inside the VNet.',
      },
    ],
    costs: {
      reviewedAt,
      estimate:
        'Microsoft lists the virtual network itself as free of charge. This limited topology excludes billed appliances, peering and workloads; this is not a guarantee of a zero subscription bill.',
      restrictions: [
        'Do not enable Bastion, Firewall, NAT Gateway, VPN Gateway, DDoS paid protection, peering, public IPs or VMs.',
        'Microsoft.Network must already be registered or registered by an authorized administrator. Use only the dedicated group; do not connect this network to existing infrastructure.',
        'Azure may automatically enable regional Network Watcher outside this group. Record any observed side effect and discuss ownership with the administrator; never delete a shared watcher.',
      ],
      sources: [
        {
          title: 'Virtual Network pricing',
          url: 'https://azure.microsoft.com/en-us/pricing/details/virtual-network/',
          publisher: 'Microsoft',
          reviewedAt,
        },
      ],
    },
    sources: [
      ...commonSources,
      source('Manage virtual networks', 'azure/virtual-network/manage-virtual-network'),
      source('Manage subnets', 'azure/virtual-network/virtual-network-manage-subnet'),
      source(
        'Network Watcher automatic enablement',
        'azure/network-watcher/network-watcher-create',
      ),
    ],
    hints: [
      'Both subnet prefixes must fit inside 10.42.0.0/16.',
      'Use distinct /24 ranges; do not leave an extra default subnet.',
      'Create frontend with the VNet, then add backend using the Subnets page or az network vnet subnet create.',
    ],
    methods: {
      portal: {
        walkthrough: [
          'Confirm subscription, a new dedicated group name, allowed region and a VNet name. Create the empty dedicated group with Purpose=az104-pilot.',
          'Open Virtual networks > Create. Select that subscription, group, VNet name and region. Leave optional paid security services disabled.',
          'On IP addresses set IPv4 space to 10.42.0.0/16. Edit/remove the proposed default subnet so the final list contains exactly frontend (10.42.1.0/24) and backend (10.42.2.0/24). Do not attach gateways, service endpoints or delegated services.',
          'Review the resource choices and create. Wait for deployment to finish, then open the VNet.',
        ],
        verification: [
          'Inspect Address space and Subnets for the three prefixes in the goal and exactly two subnets. Inspect Connected devices: none expected. In the group resource list expect only the VNet; subnets appear inside it.',
        ],
      },
      cli: {
        shell: 'bash',
        walkthrough: [
          setup,
          'Continue only after confirming account/region and a successful false result for group existence. Choose a VNet name. Run blocks separately and stop on any error.',
          `LAB_VNET='REPLACE_WITH_VNET_NAME'
az provider show --namespace Microsoft.Network --query registrationState --output tsv`,
          'Continue only if Registered. Ask the administrator if not; do not change subscription registration silently.',
          createGroup,
          `az network vnet create --resource-group "$LAB_GROUP" --name "$LAB_VNET" --location "$LAB_LOCATION" --address-prefixes 10.42.0.0/16 --subnet-name frontend --subnet-prefixes 10.42.1.0/24`,
          `az network vnet subnet create --resource-group "$LAB_GROUP" --vnet-name "$LAB_VNET" --name backend --address-prefixes 10.42.2.0/24`,
        ],
        verification: [
          `az network vnet show --resource-group "$LAB_GROUP" --name "$LAB_VNET" --query '{prefixes:addressSpace.addressPrefixes,subnets:subnets[].{name:name,prefix:addressPrefix,ipConfigurations:ipConfigurations}}' --output json
az resource list --resource-group "$LAB_GROUP" --query '[].{name:name,type:type}' --output json`,
          'Expect 10.42.0.0/16 and exactly frontend 10.42.1.0/24 plus backend 10.42.2.0/24. No subnet IP configurations should be attached (empty or omitted). Only the VNet appears as a top-level resource in the group.',
        ],
      },
    },
    expectedResults: [
      'VNet prefix is 10.42.0.0/16.',
      'Exactly frontend 10.42.1.0/24 and backend 10.42.2.0/24, with no connected workloads.',
    ],
    evidenceChecklist: [
      'Record sanitized address-space and subnet results and the selected method.',
      'Record any extra resources, deployment failures and hint/walkthrough exposure.',
      'Record learning completion separately from cleanup; pasted output remains self-reported evidence.',
    ],
    reflection: {
      prompt:
        'Why can these two /24 subnets coexist, and why would 10.43.1.0/24 fail inside this VNet?',
      expectedAnswer:
        'The selected ranges are disjoint and contained in 10.42.0.0/16. The 10.43.1.0/24 range lies outside that address space.',
    },
    cleanup: cleanup(
      ['group', 'vnet', 'frontend', 'backend'],
      'only the named VNet as a top-level resource, containing the two lab subnets and no connected devices',
    ),
  },
  ...batch1Labs,
];
