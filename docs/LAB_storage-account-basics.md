# Create and inspect a storage account

Definition: storage-account-basics, version 1. **unreleased; Azure walkthroughs pending.** Documentation reviewed 2026-09-08.

Generated from the catalog by `node scripts/lab-guides.mjs`. Record results in [the batch verification log](STAGE6_BATCH1_VERIFICATION.md). Use a fresh group/account for each method. Run commands yourself, one block at a time; stop on any error.

## Goal

Create an empty general-purpose v2 storage account with Standard LRS redundancy and Hot tier; verify its identity, location and access settings.

Skill: storage.accounts.create.

## Preflight

- An active Azure subscription and permission to create/delete a dedicated resource group and its storage account. No previous lab is required.
- For CLI use a local Bash terminal with Azure CLI installed; record az version. Portal execution requires only a browser.
- Check allowed locations, subscription policies and Microsoft.Storage provider availability with your administrator. Do not weaken policies to make the lab pass.

- Contributor: Chosen subscription for group creation, resource deployment and deletion. An administrator may instead supply a NEW empty dedicated group with Contributor at that group scope; skip group creation and arrange group deletion with them.

- Choose and record the subscription and an allowed Azure region before creating anything.
- Use a fresh dedicated resource group for EACH method, such as rg-az104-storage-portal and a different -cli group. Never reuse a shared group.
- Choose a globally available storage account name: 3–24 lowercase letters/digits, with your own unique suffix. Use different names for Portal and CLI. Do not paste credentials or account keys.

Estimated duration: 5–12 minutes. Planning estimates, not measured walkthrough times; sign-in, provisioning and deletion waits can add time.

## Resources

- Microsoft.Resources/resourceGroups: Your new dedicated LAB_GROUP. Contains only this method’s exercise resources.
- Microsoft.Storage/storageAccounts: Your globally unique LAB_STORAGE. Empty Standard LRS general-purpose v2 account; no uploaded data.

## Costs

Designed to minimize usage by keeping the account empty. Storage pricing depends on region, redundancy, stored capacity, operations and enabled features. The public pricing page uses selectable rates; no subscription-specific quote or blanket free-usage promise is made. Check your region/currency and subscription pricing before starting.

- Use Standard_LRS and Hot. Upload no data and create no file shares, private endpoints, diagnostic destinations or other services.
- Leave SFTP, hierarchical namespace and paid add-ons off. Do not activate Defender plans or trials for this lab; existing subscription plans/policy can affect cost.
- Delete the dedicated resource group after each method and check Cost Management later for delayed charges.

## Expected results

- StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.

## Progressive hints

<details><summary>Hint 1</summary>

Separate account kind from redundancy: general-purpose v2 describes capabilities; LRS describes replication.

</details>

<details><summary>Hint 2</summary>

Use Standard performance and explicitly select locally redundant storage. Inspect Configuration and Networking after deployment.

</details>

## Azure Portal

### Step 1

In Azure Portal, select your subscription. Create the new dedicated resource group in your chosen region, tagged Purpose=az104-lab. Confirm it is empty before proceeding.

### Step 2

Open Storage accounts → Create. Select your subscription and dedicated group, unique account name and chosen region. Choose Blob storage if a preferred type is requested, Standard performance and Locally-redundant storage (LRS).

### Step 3

Set Hot access tier, require secure transfer, minimum TLS 1.2 and disable anonymous blob access. Leave hierarchical namespace and SFTP off. Under Networking disable public network access; create no private endpoint. Review all tabs and leave optional paid features off.

### Step 4

Review + create, inspect the summary, then Create. Wait for completion. Open the account Overview, Configuration and Networking to check every expected result. Do not upload data.

### Verify

StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.

Record the actual configuration, not just the deployment success banner.

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


```bash
az storage account create --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --location "$LAB_LOCATION" --kind StorageV2 --sku Standard_LRS --access-tier Hot --https-only true --min-tls-version TLS1_2 --allow-blob-public-access false --public-network-access Disabled --tags Purpose=az104-lab
```


### Verify


```bash
az storage account show --name "$LAB_STORAGE" --resource-group "$LAB_GROUP" --query '{name:name,location:location,state:provisioningState,kind:kind,sku:sku.name,tier:accessTier,httpsOnly:enableHttpsTrafficOnly,tls:minimumTlsVersion,anonymousBlobAccess:allowBlobPublicAccess,publicNetwork:publicNetworkAccess}' --output json
```


StorageV2, Standard_LRS, Hot, Succeeded; HTTPS required, minimum TLS1_2, anonymous blob access false, public network Disabled; selected account name and region.

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

## Reflection

What do StorageV2 and Standard_LRS each describe? Does disabling anonymous blob access also disable public networking?

<details><summary>Compare your answer</summary>

StorageV2 is the account kind; Standard_LRS selects standard performance with local redundancy. Anonymous blob access and public network access are separate controls. This exercise disables both; it does not create a private endpoint.

</details>

## Troubleshooting

**environment: AuthorizationFailed, RequestDisallowedByPolicy, missing provider, unavailable name or unsupported region.** Record the sanitized error and method separately from your understanding of the objective. Correct the subscription/name or ask the administrator about access/allowed settings; do not retry mutations blindly or disable policy.

**conceptual: Account exists but its kind, redundancy, region or security settings differ from the target.** Compare explicit inputs with the expected results. A successful deployment alone does not prove the configuration is correct. Record discrepancies before correcting this dedicated account.

**environment: Data browsing fails with network access denied.** Public data access is intentionally disabled. This lab checks management-plane properties only; do not enable data networking or fetch account keys to work around this.

## Sources

Original practice exercise informed by Microsoft documentation; not an official Microsoft lab.

- [Create a storage account](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create) — Microsoft, reviewed 2026-09-08.
- [Storage account overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview) — Microsoft, reviewed 2026-09-08.
- [Storage account CLI reference](https://learn.microsoft.com/en-us/cli/azure/storage/account) — Microsoft, reviewed 2026-09-08.
- [Resource-group management](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-cli) — Microsoft, reviewed 2026-09-08.
- [Contributor role](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#contributor) — Microsoft, reviewed 2026-09-08.
- [Blob Storage pricing](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/) — Microsoft, reviewed 2026-09-08.
- [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/) — Microsoft, reviewed 2026-09-08.
