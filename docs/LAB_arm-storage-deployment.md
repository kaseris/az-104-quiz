# Deploy and update an ARM template

Definition: arm-storage-deployment, version 1. **unreleased; Azure walkthroughs pending.** Documentation reviewed 2026-09-08.

Generated from the catalog by `node scripts/lab-guides.mjs`. Record results in [the batch verification log](STAGE6_BATCH1_VERIFICATION.md). Use a fresh group/account for each method. Run commands yourself, one block at a time; stop on any error.

## Goal

Read a parameterized ARM template, deploy one empty storage account, then redeploy with a changed tag while keeping the same resource identity.

Skill: compute.templates.deploy.

## Preflight

- An active Azure subscription and permission to create/delete a dedicated resource group and its storage account. No previous lab is required.
- For CLI use a local Bash terminal with Azure CLI installed; record az version. Portal execution requires only a browser.
- Check allowed locations, subscription policies and Microsoft.Storage provider availability with your administrator. Do not weaken policies to make the lab pass.

- Contributor: Chosen subscription for group creation, resource deployment and deletion. An administrator may instead supply a NEW empty dedicated group with Contributor at that group scope; skip group creation and arrange group deletion with them.

- Choose and record the subscription and an allowed Azure region before creating anything.
- Use a fresh dedicated resource group for EACH method, such as rg-az104-arm-portal and a different -cli group. Never reuse a shared group.
- Choose a globally available storage account name: 3–24 lowercase letters/digits, with your own unique suffix. Use different names for Portal and CLI. Do not paste credentials or account keys.

Estimated duration: 10–20 minutes. Planning estimates, not measured walkthrough times; sign-in, provisioning and deletion waits can add time.

## Resources

- Microsoft.Resources/resourceGroups: Your new dedicated LAB_GROUP. Contains only this method’s exercise resources.
- Microsoft.Storage/storageAccounts: Your globally unique LAB_STORAGE. Empty Standard LRS general-purpose v2 account; no uploaded data.
- Microsoft.Resources/deployments: storage-practice (CLI); Portal-generated deployment name. Resource-group deployment history for the template and its repeat deployment.

## Costs

Designed to minimize usage by keeping the account empty. Storage pricing depends on region, redundancy, stored capacity, operations and enabled features. The public pricing page uses selectable rates; no subscription-specific quote or blanket free-usage promise is made. Check your region/currency and subscription pricing before starting.

- Use Standard_LRS and Hot. Upload no data and create no file shares, private endpoints, diagnostic destinations or other services.
- Leave SFTP, hierarchical namespace and paid add-ons off. Do not activate Defender plans or trials for this lab; existing subscription plans/policy can affect cost.
- Delete the dedicated resource group after each method and check Cost Management later for delayed charges.

## Expected results

- StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.
- The Practice tag changes from first to second on the same account; latest deployment succeeds and outputs its name. No second account is created.

## Progressive hints

<details><summary>Hint 1</summary>

Find parameters, resources and outputs. Which parameter changes a tag, and which parameter selects the resource identity?

</details>

<details><summary>Hint 2</summary>

Keep account name and location fixed on the second deployment; change practiceLabel from first to second. Check both the deployment output and the actual account tag.

</details>

## Azure Portal

### Step 1

In Azure Portal, select your subscription. Create the new dedicated resource group in your chosen region, tagged Purpose=az104-lab. Confirm it is empty before proceeding.

### Step 2

Search for Deploy a custom template → Build your own template in the editor. Replace the editor contents with the following JSON (also available in content/templates/storage-practice.json). Before saving, identify the one resource, its settings, three parameters and accountName output.

### Step 3


```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string",
      "minLength": 3,
      "maxLength": 24
    },
    "location": {
      "type": "string"
    },
    "practiceLabel": {
      "type": "string",
      "defaultValue": "first"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "kind": "StorageV2",
      "sku": {
        "name": "Standard_LRS"
      },
      "tags": {
        "Purpose": "az104-lab",
        "Practice": "[parameters('practiceLabel')]"
      },
      "properties": {
        "accessTier": "Hot",
        "supportsHttpsTrafficOnly": true,
        "minimumTlsVersion": "TLS1_2",
        "allowBlobPublicAccess": false,
        "publicNetworkAccess": "Disabled"
      }
    }
  ],
  "outputs": {
    "accountName": {
      "type": "string",
      "value": "[parameters('storageAccountName')]"
    }
  }
}
```


### Step 4

Save. Select your subscription and dedicated group. Supply storageAccountName, location (Azure region identifier, for example westeurope ONLY if allowed) and practiceLabel=first. Review + create and Create. Wait for success; inspect the deployment Inputs/Outputs and the account’s tags.

### Step 5

Repeat Deploy a custom template with exactly the same JSON, subscription, group, account name and location. Change only practiceLabel to second. Review and deploy again; inspect the latest deployment output, account tags and group resource list.

### Verify

StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.

Practice tag is second, output accountName matches the account, both deployments succeeded, and the group still contains exactly one storage account.

### Cleanup

Open the selected subscription and dedicated resource group. Inspect its full resource list: only your empty lab storage account should be present. For the ARM lab also inspect Deployments. Stop if anything is shared or unexpected.

Delete the resource GROUP after reviewing the listed resources and confirmation. Deleting only deployment history does not delete its storage account.

Wait for completion, refresh Resource groups and Storage accounts in the same subscription with filters cleared; confirm both the group and account are absent. A permission or connection error is not proof of deletion.

Confirm the dedicated group and storage account are absent in the selected subscription. Group deletion includes deployment history. Record cleanup separately even if setup failed part-way.

If intentionally retained or deletion fails, record cleanup pending with a reason; resources may continue to incur charges. Learning success does not imply cleanup.

## Azure CLI (Bash)

### Step 1


```bash
# Bash: replace ALL placeholders; run one block at a time and stop on any error.
az login
az version
LAB_SUBSCRIPTION='REPLACE_WITH_SUBSCRIPTION_ID'
LAB_LOCATION='REPLACE_WITH_ALLOWED_REGION'
LAB_GROUP='REPLACE_WITH_NEW_DEDICATED_GROUP_NAME'
LAB_STORAGE='REPLACE_WITH_UNIQUE_LOWERCASE_ACCOUNT_NAME'
az account set --subscription "$LAB_SUBSCRIPTION"
az account show --query '{subscription:id,name:name}' --output json
az account list-locations --query '[].name' --output tsv
az group exists --name "$LAB_GROUP"
az storage account check-name --name "$LAB_STORAGE" --output json
```


### Step 2

Continue only if the group check returned false and nameAvailable is true. If a query fails, stop. For an administrator-supplied group, confirm it is empty and dedicated instead; skip the following create command.

### Step 3


```bash
az group create --name "$LAB_GROUP" --location "$LAB_LOCATION" --tags Purpose=az104-lab
```


### Step 4

Create a NEW local directory for this exercise and open Bash there. Save the following JSON as storage-practice.json using your editor. Do not overwrite an existing file. Read the parameters/resources/outputs before running deployment commands.

### Step 5


```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string",
      "minLength": 3,
      "maxLength": 24
    },
    "location": {
      "type": "string"
    },
    "practiceLabel": {
      "type": "string",
      "defaultValue": "first"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "kind": "StorageV2",
      "sku": {
        "name": "Standard_LRS"
      },
      "tags": {
        "Purpose": "az104-lab",
        "Practice": "[parameters('practiceLabel')]"
      },
      "properties": {
        "accessTier": "Hot",
        "supportsHttpsTrafficOnly": true,
        "minimumTlsVersion": "TLS1_2",
        "allowBlobPublicAccess": false,
        "publicNetworkAccess": "Disabled"
      }
    }
  ],
  "outputs": {
    "accountName": {
      "type": "string",
      "value": "[parameters('storageAccountName')]"
    }
  }
}
```


### Step 6


```bash
az deployment group validate --resource-group "$LAB_GROUP" --template-file ./storage-practice.json --parameters storageAccountName="$LAB_STORAGE" location="$LAB_LOCATION" practiceLabel=first
# Continue only after validation succeeds.
az deployment group create --name storage-practice --resource-group "$LAB_GROUP" --mode Incremental --template-file ./storage-practice.json --parameters storageAccountName="$LAB_STORAGE" location="$LAB_LOCATION" practiceLabel=first
az storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query tags --output json
```


### Step 7

Confirm Practice=first. Keep the same account name, location, group and template. Redeploy with only the practiceLabel parameter changed:

### Step 8


```bash
az deployment group create --name storage-practice --resource-group "$LAB_GROUP" --mode Incremental --template-file ./storage-practice.json --parameters storageAccountName="$LAB_STORAGE" location="$LAB_LOCATION" practiceLabel=second
```


### Verify


```bash
az deployment group show --name storage-practice --resource-group "$LAB_GROUP" --query '{state:properties.provisioningState,outputs:properties.outputs}' --output json
az storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query tags --output json
az resource list --resource-group "$LAB_GROUP" --query '[].{name:name,type:type}' --output json
```



```bash
az storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query '{name:name,location:location,state:provisioningState,kind:kind,sku:sku.name,tier:accessTier,httpsOnly:enableHttpsTrafficOnly,tls:minimumTlsVersion,anonymousBlobAccess:allowBlobPublicAccess,publicNetwork:publicNetworkAccess}' --output json
```


StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.

Expect Succeeded, output accountName matching LAB_STORAGE, Practice=second, and exactly one storage account.

### Cleanup


```bash
az account show --query '{subscription:id,name:name}' --output json
az group show --name "$LAB_GROUP" --query '{name:name,tags:tags}' --output json
az resource list --resource-group "$LAB_GROUP" --query '[].{name:name,type:type}' --output json
```


Inspect the list against the manifest. Stop if unexpected or shared resources appear. In the ARM exercise inspect deployment history too: az deployment group list --resource-group "$LAB_GROUP" --output table


```bash
# Only after inspection: deletes EVERYTHING in the dedicated group, with confirmation.
az group delete --name "$LAB_GROUP"
az group exists --name "$LAB_GROUP"
az storage account list --query "[?name=='$LAB_STORAGE'].name" --output json
```


Expect false and [] from successful queries in the selected subscription. Wait and retry read-only checks if deletion is still running. Record errors as cleanup pending. For ARM, delete only your local practice JSON file if no longer needed.

Confirm the dedicated group and storage account are absent in the selected subscription. Group deletion includes deployment history. Record cleanup separately even if setup failed part-way.

If intentionally retained or deletion fails, record cleanup pending with a reason; resources may continue to incur charges. Learning success does not imply cleanup.

## Evidence checklist

- [ ] Confirm the selected subscription, dedicated group and account name (sanitize identifying values before sharing).
- [ ] Record the account configuration and provisioning state against every expected result.
- [ ] Record discrepancies, hints used and conceptual versus environment/access/policy problems.
- [ ] Answer the reflection and record elapsed time; track resource cleanup separately.
- [ ] Record first and second Practice tag values, successful deployments, matching output and a single account in the group.

## Reflection

Why did changing practiceLabel update the same account? Would deleting only the deployment history clean up the lab?

<details><summary>Compare your answer</summary>

The account resource identity stayed fixed while a parameter changed its tag. Deployment history is a record, not ownership that deletes resources when removed. Delete the inspected dedicated resource group to remove the account.

</details>

## Troubleshooting

**environment: AuthorizationFailed, RequestDisallowedByPolicy, missing provider, unavailable name or unsupported region.** Record the sanitized error and method separately from your understanding of the objective. Correct the subscription/name or ask the administrator about access/allowed settings; do not retry mutations blindly or disable policy.

**conceptual: Account exists but its kind, redundancy, region or security settings differ from the target.** Compare explicit inputs with the expected results. A successful deployment alone does not prove the configuration is correct. Record discrepancies before correcting this dedicated account.

**environment: Data browsing fails with network access denied.** Public data access is intentionally disabled. This lab checks management-plane properties only; do not enable data networking or fetch account keys to work around this.

**conceptual: Second deployment created another account or the tag did not change.** Compare resource name and practiceLabel parameters. Inspect both deployments and clean up all resources created in the dedicated group; do not mark the objective passed until identity is preserved.

## Sources

Original practice exercise informed by Microsoft documentation; not an official Microsoft lab.

- [Create a storage account](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create) — Microsoft, reviewed 2026-09-08.
- [Storage account overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview) — Microsoft, reviewed 2026-09-08.
- [Storage account CLI reference](https://learn.microsoft.com/en-us/cli/azure/storage/account) — Microsoft, reviewed 2026-09-08.
- [Resource-group management](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-cli) — Microsoft, reviewed 2026-09-08.
- [Contributor role](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#contributor) — Microsoft, reviewed 2026-09-08.
- [Deploy with Portal](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-portal) — Microsoft, reviewed 2026-09-08.
- [Deploy with CLI](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli) — Microsoft, reviewed 2026-09-08.
- [Storage template schema](https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-05-01/storageaccounts) — Microsoft, reviewed 2026-09-08.
- [Blob Storage pricing](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/) — Microsoft, reviewed 2026-09-08.
- [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/) — Microsoft, reviewed 2026-09-08.
