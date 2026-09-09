// 6A.3 batch 1: documentation-reviewed drafts. Release requires new user walkthrough records.
export const batch1Labs = [
  {
    id: 'storage-account-basics',
    title: 'Create and inspect a storage account',
    version: 1,
    contractVersion: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.create',
    relatedSkillIds: ['storage.accounts.redundancy'],
    prerequisiteLabIds: [],
    status: 'unreleased',
    verification: {
      portal: {
        status: 'pending',
      },
      cli: {
        status: 'pending',
      },
    },
    provenance: {
      kind: 'original-documentation-based',
      author: 'AZ-104 Study Desk',
      reviewBasis:
        'Documentation and local checks only. Neither Azure method has been executed for this version.',
      reviewedAt: '2026-09-08',
      notice:
        'Original practice exercise informed by Microsoft documentation; not an official Microsoft lab.',
    },
    prerequisites: [
      'An active Azure subscription and permission to create/delete a dedicated resource group and its storage account. No previous lab is required.',
      'For CLI use a local Bash terminal with Azure CLI installed; record az version. Portal execution requires only a browser.',
      'Check allowed locations, subscription policies and Microsoft.Storage provider availability with your administrator. Do not weaken policies to make the lab pass.',
    ],
    requiredRoles: [
      {
        role: 'Contributor',
        scope:
          'Chosen subscription for group creation, resource deployment and deletion. An administrator may instead supply a NEW empty dedicated group with Contributor at that group scope; skip group creation and arrange group deletion with them.',
      },
    ],
    selection: [
      'Choose and record the subscription and an allowed Azure region before creating anything.',
      'Use a fresh dedicated resource group for EACH method, such as rg-az104-storage-portal and a different -cli group. Never reuse a shared group.',
      'Choose a globally available storage account name: 3\u201324 lowercase letters/digits, with your own unique suffix. Use different names for Portal and CLI. Do not paste credentials or account keys.',
    ],
    duration: {
      minMinutes: 5,
      maxMinutes: 12,
      setupNote:
        'Planning estimates, not measured walkthrough times; sign-in, provisioning and deletion waits can add time.',
    },
    resources: [
      {
        id: 'group',
        type: 'Microsoft.Resources/resourceGroups',
        name: 'Your new dedicated LAB_GROUP',
        purpose: 'Contains only this method\u2019s exercise resources.',
      },
      {
        id: 'storage',
        type: 'Microsoft.Storage/storageAccounts',
        name: 'Your globally unique LAB_STORAGE',
        purpose: 'Empty Standard LRS general-purpose v2 account; no uploaded data.',
      },
    ],
    costs: {
      reviewedAt: '2026-09-08',
      estimate:
        'Designed to minimize usage by keeping the account empty. Storage pricing depends on region, redundancy, stored capacity, operations and enabled features. The public pricing page uses selectable rates; no subscription-specific quote or blanket free-usage promise is made. Check your region/currency and subscription pricing before starting.',
      restrictions: [
        'Use Standard_LRS and Hot. Upload no data and create no file shares, private endpoints, diagnostic destinations or other services.',
        'Leave SFTP, hierarchical namespace and paid add-ons off. Do not activate Defender plans or trials for this lab; existing subscription plans/policy can affect cost.',
        'Delete the dedicated resource group after each method and check Cost Management later for delayed charges.',
      ],
      sources: [
        {
          title: 'Blob Storage pricing',
          url: 'https://azure.microsoft.com/en-us/pricing/details/storage/blobs/',
          publisher: 'Microsoft',
          reviewedAt: '2026-09-08',
        },
        {
          title: 'Azure pricing calculator',
          url: 'https://azure.microsoft.com/en-us/pricing/calculator/',
          publisher: 'Microsoft',
          reviewedAt: '2026-09-08',
        },
      ],
    },
    sources: [
      {
        title: 'Create a storage account',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Storage account overview',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Storage account CLI reference',
        url: 'https://learn.microsoft.com/en-us/cli/azure/storage/account',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Resource-group management',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-cli',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Contributor role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#contributor',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
    ],
    troubleshooting: [
      {
        kind: 'environment',
        symptom:
          'AuthorizationFailed, RequestDisallowedByPolicy, missing provider, unavailable name or unsupported region.',
        action:
          'Record the sanitized error and method separately from your understanding of the objective. Correct the subscription/name or ask the administrator about access/allowed settings; do not retry mutations blindly or disable policy.',
      },
      {
        kind: 'conceptual',
        symptom:
          'Account exists but its kind, redundancy, region or security settings differ from the target.',
        action:
          'Compare explicit inputs with the expected results. A successful deployment alone does not prove the configuration is correct. Record discrepancies before correcting this dedicated account.',
      },
      {
        kind: 'environment',
        symptom: 'Data browsing fails with network access denied.',
        action:
          'Public data access is intentionally disabled. This lab checks management-plane properties only; do not enable data networking or fetch account keys to work around this.',
      },
    ],
    expectedResults: [
      'StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.',
    ],
    evidenceChecklist: [
      'Confirm the selected subscription, dedicated group and account name (sanitize identifying values before sharing).',
      'Record the account configuration and provisioning state against every expected result.',
      'Record discrepancies, hints used and conceptual versus environment/access/policy problems.',
      'Answer the reflection and record elapsed time; track resource cleanup separately.',
    ],
    cleanup: {
      resourceIds: ['group', 'storage'],
      keepResources:
        'If intentionally retained or deletion fails, record cleanup pending with a reason; resources may continue to incur charges. Learning success does not imply cleanup.',
      portal: [
        'Open the selected subscription and dedicated resource group. Inspect its full resource list: only your empty lab storage account should be present. For the ARM lab also inspect Deployments. Stop if anything is shared or unexpected.',
        'Delete the resource GROUP after reviewing the listed resources and confirmation. Deleting only deployment history does not delete its storage account.',
        'Wait for completion, refresh Resource groups and Storage accounts in the same subscription with filters cleared; confirm both the group and account are absent. A permission or connection error is not proof of deletion.',
      ],
      cli: [
        "az account show --query '{subscription:id,name:name}' --output json\naz group show --name \"$LAB_GROUP\" --query '{name:name,tags:tags}' --output json\naz resource list --resource-group \"$LAB_GROUP\" --query '[].{name:name,type:type}' --output json",
        'Inspect the list against the manifest. Stop if unexpected or shared resources appear. In the ARM exercise inspect deployment history too: az deployment group list --resource-group "$LAB_GROUP" --output table',
        '# Only after inspection: deletes EVERYTHING in the dedicated group, with confirmation.\naz group delete --name "$LAB_GROUP"\naz group exists --name "$LAB_GROUP"\naz storage account list --query "[?name==\'$LAB_STORAGE\'].name" --output json',
        'Expect false and [] from successful queries in the selected subscription. Wait and retry read-only checks if deletion is still running. Record errors as cleanup pending. For ARM, delete only your local practice JSON file if no longer needed.',
      ],
      verification:
        'Confirm the dedicated group and storage account are absent in the selected subscription. Group deletion includes deployment history. Record cleanup separately even if setup failed part-way.',
    },
    goal: 'Create an empty general-purpose v2 storage account with Standard LRS redundancy and Hot tier; verify its identity, location and access settings.',
    hints: [
      'Separate account kind from redundancy: general-purpose v2 describes capabilities; LRS describes replication.',
      'Use Standard performance and explicitly select locally redundant storage. Inspect Configuration and Networking after deployment.',
    ],
    methods: {
      portal: {
        walkthrough: [
          'In Azure Portal, select your subscription. Create the new dedicated resource group in your chosen region, tagged Purpose=az104-lab. Confirm it is empty before proceeding.',
          'Open Storage accounts \u2192 Create. Select your subscription and dedicated group, unique account name and chosen region. Choose Blob storage if a preferred type is requested, Standard performance and Locally-redundant storage (LRS).',
          'Set Hot access tier, require secure transfer, minimum TLS 1.2 and disable anonymous blob access. Leave hierarchical namespace and SFTP off. Under Networking disable public network access; create no private endpoint. Review all tabs and leave optional paid features off.',
          'Review + create, inspect the summary, then Create. Wait for completion. Open the account Overview, Configuration and Networking to check every expected result. Do not upload data.',
        ],
        verification: [
          'StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.',
          'Record the actual configuration, not just the deployment success banner.',
        ],
      },
      cli: {
        shell: 'bash',
        walkthrough: [
          "# Bash: replace ALL placeholders; run one block at a time and stop on any error.\naz login\naz version\nLAB_SUBSCRIPTION='REPLACE_WITH_SUBSCRIPTION_ID'\nLAB_LOCATION='REPLACE_WITH_ALLOWED_REGION'\nLAB_GROUP='REPLACE_WITH_NEW_DEDICATED_GROUP_NAME'\nLAB_STORAGE='REPLACE_WITH_UNIQUE_LOWERCASE_ACCOUNT_NAME'\naz account set --subscription \"$LAB_SUBSCRIPTION\"\naz account show --query '{subscription:id,name:name}' --output json\naz account list-locations --query '[].name' --output tsv\naz group exists --name \"$LAB_GROUP\"\naz storage account check-name --name \"$LAB_STORAGE\" --output json",
          'Continue only if the group check returned false and nameAvailable is true. If a query fails, stop. For an administrator-supplied group, confirm it is empty and dedicated instead; skip the following create command.',
          'az group create --name "$LAB_GROUP" --location "$LAB_LOCATION" --tags Purpose=az104-lab',
          'az storage account create --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --location "$LAB_LOCATION" --kind StorageV2 --sku Standard_LRS --access-tier Hot --https-only true --min-tls-version TLS1_2 --allow-blob-public-access false --public-network-access Disabled --tags Purpose=az104-lab',
        ],
        verification: [
          'az storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query \'{name:name,location:location,state:provisioningState,kind:kind,sku:sku.name,tier:accessTier,httpsOnly:enableHttpsTrafficOnly,tls:minimumTlsVersion,anonymousBlobAccess:allowBlobPublicAccess,publicNetwork:publicNetworkAccess}\' --output json',
          'StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.',
        ],
      },
    },
    reflection: {
      prompt:
        'What do StorageV2 and Standard_LRS each describe? Does disabling anonymous blob access also disable public networking?',
      expectedAnswer:
        'StorageV2 is the account kind; Standard_LRS selects standard performance with local redundancy. Anonymous blob access and public network access are separate controls. This exercise disables both; it does not create a private endpoint.',
    },
  },
  {
    id: 'arm-storage-deployment',
    title: 'Deploy and update an ARM template',
    version: 1,
    contractVersion: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.deploy',
    relatedSkillIds: ['compute.templates.interpret', 'compute.templates.arm'],
    prerequisiteLabIds: [],
    status: 'unreleased',
    verification: {
      portal: {
        status: 'pending',
      },
      cli: {
        status: 'pending',
      },
    },
    provenance: {
      kind: 'original-documentation-based',
      author: 'AZ-104 Study Desk',
      reviewBasis:
        'Documentation and local checks only. Neither Azure method has been executed for this version.',
      reviewedAt: '2026-09-08',
      notice:
        'Original practice exercise informed by Microsoft documentation; not an official Microsoft lab.',
    },
    prerequisites: [
      'An active Azure subscription and permission to create/delete a dedicated resource group and its storage account. No previous lab is required.',
      'For CLI use a local Bash terminal with Azure CLI installed; record az version. Portal execution requires only a browser.',
      'Check allowed locations, subscription policies and Microsoft.Storage provider availability with your administrator. Do not weaken policies to make the lab pass.',
    ],
    requiredRoles: [
      {
        role: 'Contributor',
        scope:
          'Chosen subscription for group creation, resource deployment and deletion. An administrator may instead supply a NEW empty dedicated group with Contributor at that group scope; skip group creation and arrange group deletion with them.',
      },
    ],
    selection: [
      'Choose and record the subscription and an allowed Azure region before creating anything.',
      'Use a fresh dedicated resource group for EACH method, such as rg-az104-arm-portal and a different -cli group. Never reuse a shared group.',
      'Choose a globally available storage account name: 3\u201324 lowercase letters/digits, with your own unique suffix. Use different names for Portal and CLI. Do not paste credentials or account keys.',
    ],
    duration: {
      minMinutes: 10,
      maxMinutes: 20,
      setupNote:
        'Planning estimates, not measured walkthrough times; sign-in, provisioning and deletion waits can add time.',
    },
    resources: [
      {
        id: 'group',
        type: 'Microsoft.Resources/resourceGroups',
        name: 'Your new dedicated LAB_GROUP',
        purpose: 'Contains only this method\u2019s exercise resources.',
      },
      {
        id: 'storage',
        type: 'Microsoft.Storage/storageAccounts',
        name: 'Your globally unique LAB_STORAGE',
        purpose: 'Empty Standard LRS general-purpose v2 account; no uploaded data.',
      },
      {
        id: 'deployment',
        type: 'Microsoft.Resources/deployments',
        name: 'storage-practice (CLI); Portal-generated deployment name',
        purpose: 'Resource-group deployment history for the template and its repeat deployment.',
      },
    ],
    costs: {
      reviewedAt: '2026-09-08',
      estimate:
        'Designed to minimize usage by keeping the account empty. Storage pricing depends on region, redundancy, stored capacity, operations and enabled features. The public pricing page uses selectable rates; no subscription-specific quote or blanket free-usage promise is made. Check your region/currency and subscription pricing before starting.',
      restrictions: [
        'Use Standard_LRS and Hot. Upload no data and create no file shares, private endpoints, diagnostic destinations or other services.',
        'Leave SFTP, hierarchical namespace and paid add-ons off. Do not activate Defender plans or trials for this lab; existing subscription plans/policy can affect cost.',
        'Delete the dedicated resource group after each method and check Cost Management later for delayed charges.',
      ],
      sources: [
        {
          title: 'Blob Storage pricing',
          url: 'https://azure.microsoft.com/en-us/pricing/details/storage/blobs/',
          publisher: 'Microsoft',
          reviewedAt: '2026-09-08',
        },
        {
          title: 'Azure pricing calculator',
          url: 'https://azure.microsoft.com/en-us/pricing/calculator/',
          publisher: 'Microsoft',
          reviewedAt: '2026-09-08',
        },
      ],
    },
    sources: [
      {
        title: 'Create a storage account',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Storage account overview',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Storage account CLI reference',
        url: 'https://learn.microsoft.com/en-us/cli/azure/storage/account',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Resource-group management',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-cli',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Contributor role',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#contributor',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Deploy with Portal',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-portal',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Deploy with CLI',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
      {
        title: 'Storage template schema',
        url: 'https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-05-01/storageaccounts',
        publisher: 'Microsoft',
        reviewedAt: '2026-09-08',
      },
    ],
    troubleshooting: [
      {
        kind: 'environment',
        symptom:
          'AuthorizationFailed, RequestDisallowedByPolicy, missing provider, unavailable name or unsupported region.',
        action:
          'Record the sanitized error and method separately from your understanding of the objective. Correct the subscription/name or ask the administrator about access/allowed settings; do not retry mutations blindly or disable policy.',
      },
      {
        kind: 'conceptual',
        symptom:
          'Account exists but its kind, redundancy, region or security settings differ from the target.',
        action:
          'Compare explicit inputs with the expected results. A successful deployment alone does not prove the configuration is correct. Record discrepancies before correcting this dedicated account.',
      },
      {
        kind: 'environment',
        symptom: 'Data browsing fails with network access denied.',
        action:
          'Public data access is intentionally disabled. This lab checks management-plane properties only; do not enable data networking or fetch account keys to work around this.',
      },
      {
        kind: 'conceptual',
        symptom: 'Second deployment created another account or the tag did not change.',
        action:
          'Compare resource name and practiceLabel parameters. Inspect both deployments and clean up all resources created in the dedicated group; do not mark the objective passed until identity is preserved.',
      },
    ],
    expectedResults: [
      'StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.',
      'The Practice tag changes from first to second on the same account; latest deployment succeeds and outputs its name. No second account is created.',
    ],
    evidenceChecklist: [
      'Confirm the selected subscription, dedicated group and account name (sanitize identifying values before sharing).',
      'Record the account configuration and provisioning state against every expected result.',
      'Record discrepancies, hints used and conceptual versus environment/access/policy problems.',
      'Answer the reflection and record elapsed time; track resource cleanup separately.',
      'Record first and second Practice tag values, successful deployments, matching output and a single account in the group.',
    ],
    cleanup: {
      resourceIds: ['group', 'storage', 'deployment'],
      keepResources:
        'If intentionally retained or deletion fails, record cleanup pending with a reason; resources may continue to incur charges. Learning success does not imply cleanup.',
      portal: [
        'Open the selected subscription and dedicated resource group. Inspect its full resource list: only your empty lab storage account should be present. For the ARM lab also inspect Deployments. Stop if anything is shared or unexpected.',
        'Delete the resource GROUP after reviewing the listed resources and confirmation. Deleting only deployment history does not delete its storage account.',
        'Wait for completion, refresh Resource groups and Storage accounts in the same subscription with filters cleared; confirm both the group and account are absent. A permission or connection error is not proof of deletion.',
      ],
      cli: [
        "az account show --query '{subscription:id,name:name}' --output json\naz group show --name \"$LAB_GROUP\" --query '{name:name,tags:tags}' --output json\naz resource list --resource-group \"$LAB_GROUP\" --query '[].{name:name,type:type}' --output json",
        'Inspect the list against the manifest. Stop if unexpected or shared resources appear. In the ARM exercise inspect deployment history too: az deployment group list --resource-group "$LAB_GROUP" --output table',
        '# Only after inspection: deletes EVERYTHING in the dedicated group, with confirmation.\naz group delete --name "$LAB_GROUP"\naz group exists --name "$LAB_GROUP"\naz storage account list --query "[?name==\'$LAB_STORAGE\'].name" --output json',
        'Expect false and [] from successful queries in the selected subscription. Wait and retry read-only checks if deletion is still running. Record errors as cleanup pending. For ARM, delete only your local practice JSON file if no longer needed.',
      ],
      verification:
        'Confirm the dedicated group and storage account are absent in the selected subscription. Group deletion includes deployment history. Record cleanup separately even if setup failed part-way.',
    },
    goal: 'Read a parameterized ARM template, deploy one empty storage account, then redeploy with a changed tag while keeping the same resource identity.',
    hints: [
      'Find parameters, resources and outputs. Which parameter changes a tag, and which parameter selects the resource identity?',
      'Keep account name and location fixed on the second deployment; change practiceLabel from first to second. Check both the deployment output and the actual account tag.',
    ],
    methods: {
      portal: {
        walkthrough: [
          'In Azure Portal, select your subscription. Create the new dedicated resource group in your chosen region, tagged Purpose=az104-lab. Confirm it is empty before proceeding.',
          'Search for Deploy a custom template \u2192 Build your own template in the editor. Replace the editor contents with the following JSON (also available in content/templates/storage-practice.json). Before saving, identify the one resource, its settings, three parameters and accountName output.',
          '{\n  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",\n  "contentVersion": "1.0.0.0",\n  "parameters": {\n    "storageAccountName": {\n      "type": "string",\n      "minLength": 3,\n      "maxLength": 24\n    },\n    "location": {\n      "type": "string"\n    },\n    "practiceLabel": {\n      "type": "string",\n      "defaultValue": "first"\n    }\n  },\n  "resources": [\n    {\n      "type": "Microsoft.Storage/storageAccounts",\n      "apiVersion": "2023-05-01",\n      "name": "[parameters(\'storageAccountName\')]",\n      "location": "[parameters(\'location\')]",\n      "kind": "StorageV2",\n      "sku": {\n        "name": "Standard_LRS"\n      },\n      "tags": {\n        "Purpose": "az104-lab",\n        "Practice": "[parameters(\'practiceLabel\')]"\n      },\n      "properties": {\n        "accessTier": "Hot",\n        "supportsHttpsTrafficOnly": true,\n        "minimumTlsVersion": "TLS1_2",\n        "allowBlobPublicAccess": false,\n        "publicNetworkAccess": "Disabled"\n      }\n    }\n  ],\n  "outputs": {\n    "accountName": {\n      "type": "string",\n      "value": "[parameters(\'storageAccountName\')]"\n    }\n  }\n}',
          'Save. Select your subscription and dedicated group. Supply storageAccountName, location (Azure region identifier, for example westeurope ONLY if allowed) and practiceLabel=first. Review + create and Create. Wait for success; inspect the deployment Inputs/Outputs and the account\u2019s tags.',
          'Repeat Deploy a custom template with exactly the same JSON, subscription, group, account name and location. Change only practiceLabel to second. Review and deploy again; inspect the latest deployment output, account tags and group resource list.',
        ],
        verification: [
          'StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.',
          'Practice tag is second, output accountName matches the account, both deployments succeeded, and the group still contains exactly one storage account.',
        ],
      },
      cli: {
        shell: 'bash',
        walkthrough: [
          "# Bash: replace ALL placeholders; run one block at a time and stop on any error.\naz login\naz version\nLAB_SUBSCRIPTION='REPLACE_WITH_SUBSCRIPTION_ID'\nLAB_LOCATION='REPLACE_WITH_ALLOWED_REGION'\nLAB_GROUP='REPLACE_WITH_NEW_DEDICATED_GROUP_NAME'\nLAB_STORAGE='REPLACE_WITH_UNIQUE_LOWERCASE_ACCOUNT_NAME'\naz account set --subscription \"$LAB_SUBSCRIPTION\"\naz account show --query '{subscription:id,name:name}' --output json\naz account list-locations --query '[].name' --output tsv\naz group exists --name \"$LAB_GROUP\"\naz storage account check-name --name \"$LAB_STORAGE\" --output json",
          'Continue only if the group check returned false and nameAvailable is true. If a query fails, stop. For an administrator-supplied group, confirm it is empty and dedicated instead; skip the following create command.',
          'az group create --name "$LAB_GROUP" --location "$LAB_LOCATION" --tags Purpose=az104-lab',
          'Create a NEW local directory for this exercise and open Bash there. Save the following JSON as storage-practice.json using your editor. Do not overwrite an existing file. Read the parameters/resources/outputs before running deployment commands.',
          '{\n  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",\n  "contentVersion": "1.0.0.0",\n  "parameters": {\n    "storageAccountName": {\n      "type": "string",\n      "minLength": 3,\n      "maxLength": 24\n    },\n    "location": {\n      "type": "string"\n    },\n    "practiceLabel": {\n      "type": "string",\n      "defaultValue": "first"\n    }\n  },\n  "resources": [\n    {\n      "type": "Microsoft.Storage/storageAccounts",\n      "apiVersion": "2023-05-01",\n      "name": "[parameters(\'storageAccountName\')]",\n      "location": "[parameters(\'location\')]",\n      "kind": "StorageV2",\n      "sku": {\n        "name": "Standard_LRS"\n      },\n      "tags": {\n        "Purpose": "az104-lab",\n        "Practice": "[parameters(\'practiceLabel\')]"\n      },\n      "properties": {\n        "accessTier": "Hot",\n        "supportsHttpsTrafficOnly": true,\n        "minimumTlsVersion": "TLS1_2",\n        "allowBlobPublicAccess": false,\n        "publicNetworkAccess": "Disabled"\n      }\n    }\n  ],\n  "outputs": {\n    "accountName": {\n      "type": "string",\n      "value": "[parameters(\'storageAccountName\')]"\n    }\n  }\n}',
          'az deployment group validate --resource-group "$LAB_GROUP" --template-file ./storage-practice.json --parameters storageAccountName="$LAB_STORAGE" location="$LAB_LOCATION" practiceLabel=first\n# Continue only after validation succeeds.\naz deployment group create --name storage-practice --resource-group "$LAB_GROUP" --mode Incremental --template-file ./storage-practice.json --parameters storageAccountName="$LAB_STORAGE" location="$LAB_LOCATION" practiceLabel=first\naz storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query tags --output json',
          'Confirm Practice=first. Keep the same account name, location, group and template. Redeploy with only the practiceLabel parameter changed:',
          'az deployment group create --name storage-practice --resource-group "$LAB_GROUP" --mode Incremental --template-file ./storage-practice.json --parameters storageAccountName="$LAB_STORAGE" location="$LAB_LOCATION" practiceLabel=second',
        ],
        verification: [
          'az deployment group show --name storage-practice --resource-group "$LAB_GROUP" --query \'{state:properties.provisioningState,outputs:properties.outputs}\' --output json\naz storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query tags --output json\naz resource list --resource-group "$LAB_GROUP" --query \'[].{name:name,type:type}\' --output json',
          'az storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query \'{name:name,location:location,state:provisioningState,kind:kind,sku:sku.name,tier:accessTier,httpsOnly:enableHttpsTrafficOnly,tls:minimumTlsVersion,anonymousBlobAccess:allowBlobPublicAccess,publicNetwork:publicNetworkAccess}\' --output json',
          'StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.',
          'Expect Succeeded, output accountName matching LAB_STORAGE, Practice=second, and exactly one storage account.',
        ],
      },
    },
    reflection: {
      prompt:
        'Why did changing practiceLabel update the same account? Would deleting only the deployment history clean up the lab?',
      expectedAnswer:
        'The account resource identity stayed fixed while a parameter changed its tag. Deployment history is a record, not ownership that deletes resources when removed. Delete the inspected dedicated resource group to remove the account.',
    },
  },
];
