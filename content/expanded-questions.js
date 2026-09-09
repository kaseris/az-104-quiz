// Editorial adaptations of MIT-licensed public instructional material. See docs/STAGE2_CONTENT_AUDIT.json.
export const expandedQuestions = [
  {
    id: 'identity-05',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.access',
    primarySkillId: 'identity.access.assignments',
    relatedSkillIds: [],
    familyId: 'identity-05',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Limit access to one resource',
    prompt:
      'An operator must manage one VM, without receiving permissions on other VMs in its resource group. At which scope should the role be assigned?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The individual VM',
        rationale: 'Resource scope confines this assignment to that resource.',
      },
      {
        id: 'o2',
        text: 'The subscription',
        rationale: 'Subscription assignments inherit to resources throughout the subscription.',
      },
      {
        id: 'o3',
        text: 'The management group',
        rationale: 'Management-group assignments inherit across descendant subscriptions.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Resource scope confines this assignment to that resource.',
    references: [
      {
        title: 'Rbac — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure RBAC / Scope Levels',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-06',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.access',
    primarySkillId: 'identity.access.interpret',
    relatedSkillIds: [],
    familyId: 'identity-06',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Read inherited permissions',
    prompt:
      'A user has Reader at subscription scope and no direct assignment on a resource group. Can that assignment permit reading the resource group?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'No, every resource group needs a direct assignment',
        rationale: 'Parent assignments do not require duplication at every child.',
      },
      {
        id: 'o2',
        text: 'Only if the user is a tenant administrator',
        rationale: 'Directory administration is not required for an Azure Reader assignment.',
      },
      {
        id: 'o3',
        text: 'Yes, through inheritance',
        rationale:
          'Assignments at a parent scope apply to child scopes, absent overriding restrictions.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation:
      'Assignments at a parent scope apply to child scopes, absent overriding restrictions.',
    references: [
      {
        title: 'Rbac — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure RBAC / Scope Levels',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-07',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.access',
    primarySkillId: 'identity.access.interpret',
    relatedSkillIds: [],
    familyId: 'identity-07',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Combine role assignments',
    prompt:
      'A user has Reader on a resource group and Contributor directly on one VM. Assume no deny assignments or locks. What can the user do to that VM?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Manage it using Contributor permissions',
        rationale: 'Allow permissions from applicable assignments are additive.',
      },
      {
        id: 'o2',
        text: 'Read it only because Reader is more restrictive',
        rationale: 'A narrower Reader assignment does not cancel another allowed permission.',
      },
      {
        id: 'o3',
        text: 'Assign roles because two roles combine into Owner',
        rationale: 'Combining these roles does not add role-assignment permission.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Allow permissions from applicable assignments are additive.',
    references: [
      {
        title: 'Rbac — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure RBAC / Common Built-in Roles',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-08',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.access',
    primarySkillId: 'identity.access.roles',
    relatedSkillIds: [],
    familyId: 'identity-02',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Delegate reading to finance',
    prompt:
      'Finance needs to inspect resource configuration but cannot change resources or assign access. Which general role fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Reader',
        rationale: 'Reader grants control-plane read access.',
      },
      {
        id: 'o2',
        text: 'Owner',
        rationale: 'Owner includes management and access assignment.',
      },
      {
        id: 'o3',
        text: 'User Access Administrator',
        rationale: 'This role manages access, which finance does not need.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Reader grants control-plane read access.',
    references: [
      {
        title: 'Roles — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/general',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure RBAC / Common Built-in Roles',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-09',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.access',
    primarySkillId: 'identity.access.roles',
    relatedSkillIds: [],
    familyId: 'identity-02',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Delegate access administration',
    prompt:
      'An access team must manage Azure role assignments. Which of these roles is designed for access administration?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Reader',
        rationale: 'Reader cannot create role assignments.',
      },
      {
        id: 'o2',
        text: 'Contributor',
        rationale: 'Contributor excludes Azure role-assignment writes.',
      },
      {
        id: 'o3',
        text: 'User Access Administrator',
        rationale: 'This role grants access-management operations.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'This role grants access-management operations.',
    references: [
      {
        title: 'Roles Privileged — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure RBAC / Common Built-in Roles',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-10',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.policy',
    relatedSkillIds: [],
    familyId: 'identity-10',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Group a policy baseline',
    prompt:
      'An organization wants several related Azure Policy definitions assigned and tracked as a single baseline. What should it create?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'An initiative definition',
        rationale: 'An initiative groups policy definitions.',
      },
      {
        id: 'o2',
        text: 'A resource tag',
        rationale: 'A tag provides metadata, not a policy collection.',
      },
      {
        id: 'o3',
        text: 'An RBAC role assignment',
        rationale: 'RBAC grants permissions; it does not group policy definitions.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'An initiative groups policy definitions.',
    references: [
      {
        title: 'Policy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/governance/policy/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure Policy / Policy vs Initiative',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-11',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.policy',
    relatedSkillIds: [],
    familyId: 'identity-11',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Enforce deployment regions',
    prompt:
      'New resources must be rejected when their location violates an assigned location rule. Which policy effect fits this enforcement requirement?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Audit',
        rationale: 'Audit records noncompliance without rejecting the request.',
      },
      {
        id: 'o2',
        text: 'Disabled',
        rationale: 'Disabled turns off evaluation of the policy rule.',
      },
      {
        id: 'o3',
        text: 'Deny',
        rationale: 'Deny can block noncompliant create or update requests.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Deny can block noncompliant create or update requests.',
    references: [
      {
        title: 'Policy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/governance/policy/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure Policy / Common Built-in Policies',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-12',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.policy',
    relatedSkillIds: [],
    familyId: 'identity-12',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Observe before enforcing',
    prompt:
      'An administrator wants to discover noncompliant resources without blocking deployments. Which policy effect should be used?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Deny',
        rationale: 'Deny can prevent matching operations.',
      },
      {
        id: 'o2',
        text: 'A CanNotDelete lock',
        rationale: 'A lock addresses resource management operations, not policy audit evaluation.',
      },
      {
        id: 'o3',
        text: 'Audit',
        rationale: 'Audit records noncompliance without denying the operation.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Audit records noncompliance without denying the operation.',
    references: [
      {
        title: 'Policy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/governance/policy/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Azure Policy / Common Built-in Policies',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-13',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.tags',
    relatedSkillIds: [],
    familyId: 'identity-13',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Separate tags from inheritance',
    prompt:
      'A resource group has a CostCenter tag. What happens to existing resources in that group without a policy or script copying the tag?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'They do not automatically inherit the tag',
        rationale: 'Resource tags are separate from resource-group tags.',
      },
      {
        id: 'o2',
        text: 'They inherit it immediately',
        rationale: 'Tags do not inherit automatically from a parent scope.',
      },
      {
        id: 'o3',
        text: 'They inherit it after the next RBAC refresh',
        rationale: 'RBAC refresh does not copy tags.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Resource tags are separate from resource-group tags.',
    references: [
      {
        title: 'Tags — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Commands / Tags',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-14',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.tags',
    relatedSkillIds: [],
    familyId: 'identity-14',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Use metadata for cost grouping',
    prompt:
      'Resources from different applications must be grouped in cost analysis by department. Which resource metadata should administrators apply consistently?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A Department tag',
        rationale: 'Tags can classify resources for cost organization where supported.',
      },
      {
        id: 'o2',
        text: 'A CanNotDelete lock',
        rationale: 'Locks protect management operations, not department classification.',
      },
      {
        id: 'o3',
        text: 'A private DNS record',
        rationale: 'DNS records support name resolution rather than cost grouping.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Tags can classify resources for cost organization where supported.',
    references: [
      {
        title: 'Tags — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Commands / Tags',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-15',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.locks',
    relatedSkillIds: [],
    familyId: 'identity-15',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Understand read-only protection',
    prompt:
      'A team must block both control-plane updates and deletions of a resource until a lock is removed. Which lock meets that requirement?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A tag named ReadOnly',
        rationale: 'Tags do not enforce management restrictions.',
      },
      {
        id: 'o2',
        text: 'ReadOnly',
        rationale: 'ReadOnly prevents update and deletion operations through the control plane.',
      },
      {
        id: 'o3',
        text: 'CanNotDelete',
        rationale: 'CanNotDelete still permits updates.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'ReadOnly prevents update and deletion operations through the control plane.',
    references: [
      {
        title: 'Locks — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Commands / Resource Locks',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-16',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.groups',
    relatedSkillIds: [],
    familyId: 'identity-16',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Locate a resource group',
    prompt:
      'A resource group is created in West Europe. Must every resource in the group also be in West Europe?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Yes; group location pins all members',
        rationale: 'Resource groups can contain resources in different regions.',
      },
      {
        id: 'o2',
        text: 'Only resources with Owner assignments can differ',
        rationale: 'RBAC role type does not impose this location rule.',
      },
      {
        id: 'o3',
        text: 'No; resources can use other regions',
        rationale:
          'The resource-group location stores group metadata and does not require all members to share that region.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation:
      'The resource-group location stores group metadata and does not require all members to share that region.',
    references: [
      {
        title: 'Groups — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Commands / Resource Groups',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-17',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.groups',
    relatedSkillIds: [],
    familyId: 'identity-17',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Understand group deletion',
    prompt:
      'Deleting a resource group succeeds after all blocking conditions are resolved. What happens to resources contained in that group?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'They move to an unassigned group',
        rationale: 'Azure does not automatically relocate those resources.',
      },
      {
        id: 'o2',
        text: 'Only group metadata is deleted',
        rationale: 'The operation is not merely a metadata removal.',
      },
      {
        id: 'o3',
        text: 'They are deleted with the group',
        rationale: 'Resource-group deletion deletes contained resources.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Resource-group deletion deletes contained resources.',
    references: [
      {
        title: 'Groups — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Commands / Resource Groups',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-18',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.users',
    primarySkillId: 'identity.users.create',
    relatedSkillIds: [],
    familyId: 'identity-18',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Bulk-create employees',
    prompt:
      'An administrator needs to create many cloud-only Entra users through the portal using a prepared file. Which workflow fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Bulk create using the supplied CSV template',
        rationale: 'The bulk-create operation accepts a correctly populated CSV template.',
      },
      {
        id: 'o2',
        text: 'Import an ARM resource-group template',
        rationale: 'ARM resource-group templates are not the Entra bulk-user import workflow.',
      },
      {
        id: 'o3',
        text: 'Create an Azure Policy initiative',
        rationale: 'Policy initiatives do not create directory users from CSV.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'The bulk-create operation accepts a correctly populated CSV template.',
    references: [
      {
        title: 'Users — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/entra/identity/users/users-bulk-add',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/identity-governance/lab01-entra-id-users-groups.md',
      section: 'Exercise 1 / Create a Bulk User Import Template',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-19',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.users',
    primarySkillId: 'identity.users.properties',
    relatedSkillIds: [],
    familyId: 'identity-19',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Update department membership',
    prompt:
      'A dynamic security group uses user.department equal to IT. A user transfers out of IT. What input should be corrected to update membership through rule processing?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The subscription display name',
        rationale: 'Subscription naming does not change the user.department attribute.',
      },
      {
        id: 'o2',
        text: 'The user department attribute',
        rationale: 'Dynamic membership evaluates directory attributes against its rule.',
      },
      {
        id: 'o3',
        text: 'The resource-group Department tag',
        rationale: 'A resource tag is not the directory user attribute in this rule.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Dynamic membership evaluates directory attributes against its rule.',
    references: [
      {
        title: 'Dynamic — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/identity-governance/lab01-entra-id-users-groups.md',
      section: 'Exercise 2 / Create Dynamic Group',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-20',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.users',
    primarySkillId: 'identity.users.create',
    relatedSkillIds: [],
    familyId: 'identity-20',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose explicit group membership',
    prompt:
      'A manager must explicitly select each member of a security group rather than use attribute rules. Which membership type fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Assigned',
        rationale: 'Assigned groups support explicit membership management.',
      },
      {
        id: 'o2',
        text: 'Dynamic User',
        rationale: 'Dynamic user membership follows configured attribute rules.',
      },
      {
        id: 'o3',
        text: 'Dynamic Device',
        rationale: 'Dynamic device groups evaluate device membership rules.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Assigned groups support explicit membership management.',
    references: [
      {
        title: 'Dynamic — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/identity-governance/lab01-entra-id-users-groups.md',
      section: 'Exercise 2 / Create Security Groups',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-21',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.users',
    primarySkillId: 'identity.users.sspr',
    relatedSkillIds: [],
    familyId: 'identity-21',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Pilot password reset',
    prompt: 'SSPR should initially be enabled only for a pilot group. Which enablement scope fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'All',
        rationale: 'All enables it for the wider eligible population.',
      },
      {
        id: 'o2',
        text: 'None',
        rationale: 'None leaves SSPR disabled.',
      },
      {
        id: 'o3',
        text: 'Selected',
        rationale: 'Selected scopes SSPR enablement to a chosen group.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Selected scopes SSPR enablement to a chosen group.',
    references: [
      {
        title: 'Sspr — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-enable-sspr',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/identity-governance/lab01-entra-id-users-groups.md',
      section: 'Exercise 4 / Configure Self-Service Password Reset',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-22',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.users',
    primarySkillId: 'identity.users.licenses',
    relatedSkillIds: [],
    familyId: 'identity-22',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Resolve location before licensing',
    prompt:
      'A license cannot be assigned because the user has no valid usage location. What should be corrected?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The user usage location',
        rationale:
          'License availability depends on usage location; set the correct country or region.',
      },
      {
        id: 'o2',
        text: 'The Azure resource-group region',
        rationale: 'Azure resource location is not the directory licensing property.',
      },
      {
        id: 'o3',
        text: 'The storage account redundancy',
        rationale: 'Storage replication settings do not establish a user usage location.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation:
      'License availability depends on usage location; set the correct country or region.',
    references: [
      {
        title: 'Licenses — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/entra/fundamentals/license-users-groups',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/identity-governance/lab01-entra-id-users-groups.md',
      section: 'Exercise 5 / Assign Licenses',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'identity-23',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'identity',
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.costs',
    relatedSkillIds: [],
    familyId: 'identity-23',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Understand budget alerts',
    prompt:
      'A cost budget reaches its notification threshold. Does the budget itself automatically stop Azure resources?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'No; it notifies unless separate automation acts',
        rationale: 'A budget is a cost-monitoring and notification mechanism.',
      },
      {
        id: 'o2',
        text: 'Yes; every resource is deallocated',
        rationale: 'A budget does not automatically stop resource consumption.',
      },
      {
        id: 'o3',
        text: 'Yes; the subscription is always disabled',
        rationale: 'Budget thresholds are not automatic subscription suspension rules.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'A budget is a cost-monitoring and notification mechanism.',
    references: [
      {
        title: 'Budget — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Portal Navigation Tips / Cost Management',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-05',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.redundancy',
    relatedSkillIds: [],
    familyId: 'storage-01',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Keep replicas across zones',
    prompt:
      'A supported storage account must replicate synchronously across availability zones within its primary region. Which option fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'GRS',
        rationale:
          'GRS has local primary redundancy and asynchronous secondary-region replication.',
      },
      {
        id: 'o2',
        text: 'ZRS',
        rationale: 'ZRS spreads synchronous copies across primary-region zones.',
      },
      {
        id: 'o3',
        text: 'LRS',
        rationale: 'LRS uses a single physical location in the primary region.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'ZRS spreads synchronous copies across primary-region zones.',
    references: [
      {
        title: 'Redundancy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / Redundancy Options',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-06',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.redundancy',
    relatedSkillIds: [],
    familyId: 'storage-01',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Read a geo-secondary',
    prompt:
      'An application needs read access to a GRS secondary endpoint before failover. Which option adds this?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'GRS without read access',
        rationale: 'Standard GRS does not provide secondary read access before failover.',
      },
      {
        id: 'o2',
        text: 'LRS',
        rationale: 'LRS has no geo-secondary endpoint.',
      },
      {
        id: 'o3',
        text: 'RA-GRS',
        rationale: 'Read-access GRS exposes a readable secondary endpoint.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Read-access GRS exposes a readable secondary endpoint.',
    references: [
      {
        title: 'Redundancy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / Redundancy Options',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-07',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.redundancy',
    relatedSkillIds: [],
    familyId: 'storage-01',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Combine zone and regional protection',
    prompt:
      'A supported account needs primary-zone redundancy plus asynchronous regional replication, without secondary read access. Which option fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'ZRS',
        rationale: 'ZRS alone does not replicate to another region.',
      },
      {
        id: 'o2',
        text: 'GZRS',
        rationale: 'GZRS combines zone-redundant primary storage with geo-replication.',
      },
      {
        id: 'o3',
        text: 'RA-GRS',
        rationale: 'RA-GRS adds read access but does not provide primary ZRS.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'GZRS combines zone-redundant primary storage with geo-replication.',
    references: [
      {
        title: 'Redundancy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / Redundancy Options',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-08',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.data',
    primarySkillId: 'storage.data.tiers',
    relatedSkillIds: [],
    familyId: 'storage-08',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Select frequent-access storage',
    prompt:
      'Block blobs are read frequently and require online access. Which tier is designed for frequent access?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Cool',
        rationale: 'Cool targets less frequent access and has different retrieval economics.',
      },
      {
        id: 'o2',
        text: 'Hot',
        rationale: 'Hot is optimized for frequently accessed data.',
      },
      {
        id: 'o3',
        text: 'Archive',
        rationale: 'Archive data must be rehydrated before ordinary reads.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Hot is optimized for frequently accessed data.',
    references: [
      {
        title: 'Tiers — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / Blob Access Tiers',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-09',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.data',
    primarySkillId: 'storage.data.tiers',
    relatedSkillIds: [],
    familyId: 'storage-09',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Read archived data',
    prompt:
      'An application must read an archived block blob through an ordinary download. What must happen first?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Change the container name',
        rationale: 'Naming changes do not rehydrate a blob.',
      },
      {
        id: 'o2',
        text: 'Rehydrate the blob to an online tier',
        rationale: 'Archive is offline and requires rehydration before ordinary reads.',
      },
      {
        id: 'o3',
        text: 'Add a Reader role only',
        rationale: 'Authorization does not make archived data online.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Archive is offline and requires rehydration before ordinary reads.',
    references: [
      {
        title: 'Tiers — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / Blob Access Tiers',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-10',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.access',
    primarySkillId: 'storage.access.keys',
    relatedSkillIds: [],
    familyId: 'storage-10',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Rotate account credentials',
    prompt:
      'An application uses key1. Administrators want to regenerate key1 without interrupting the application. What should they do first?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Regenerate both keys at once',
        rationale: 'This invalidates both existing shared-key credentials.',
      },
      {
        id: 'o2',
        text: 'Delete the storage account',
        rationale: 'Deletion is unnecessary and destructive.',
      },
      {
        id: 'o3',
        text: 'Move the application to valid key2',
        rationale: 'The two-key model permits moving consumers before regenerating a key.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'The two-key model permits moving consumers before regenerating a key.',
    references: [
      {
        title: 'Keys — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 2 / Manage Access Keys',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-11',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.access',
    primarySkillId: 'storage.access.sas',
    relatedSkillIds: [],
    familyId: 'storage-11',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Prefer Entra-backed delegation',
    prompt:
      'For Blob Storage, which SAS type is signed using a user delegation key secured through Microsoft Entra credentials?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Service SAS signed with an account key',
        rationale: 'This service SAS uses shared-key signing rather than a user delegation key.',
      },
      {
        id: 'o2',
        text: 'User delegation SAS',
        rationale: 'This SAS uses an Entra-authorized user delegation key.',
      },
      {
        id: 'o3',
        text: 'Account SAS',
        rationale: 'An account SAS is signed with the storage account key.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'This SAS uses an Entra-authorized user delegation key.',
    references: [
      {
        title: 'Sas — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / Storage Commands',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-12',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.access',
    primarySkillId: 'storage.access.firewalls',
    relatedSkillIds: [],
    familyId: 'storage-12',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Separate network and authorization',
    prompt:
      'A client has a valid SAS but its network is blocked by the storage firewall. What is the expected access outcome?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The network restriction still blocks it',
        rationale: 'Authorization credentials do not bypass storage network rules.',
      },
      {
        id: 'o2',
        text: 'The SAS always overrides network rules',
        rationale: 'SAS permissions and network access are separate checks.',
      },
      {
        id: 'o3',
        text: 'The SAS creates a private endpoint',
        rationale: 'A token cannot provision network infrastructure.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Authorization credentials do not bypass storage network rules.',
    references: [
      {
        title: 'Firewall — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 2 / Configure Storage Firewall',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-13',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.encryption',
    relatedSkillIds: [],
    familyId: 'storage-13',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Identify default encryption',
    prompt:
      'For Azure Storage service-side encryption at rest, what is the default key-management choice?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'No encryption until a customer key is uploaded',
        rationale: 'Storage service-side encryption is enabled by default.',
      },
      {
        id: 'o2',
        text: 'A SAS token used as an encryption key',
        rationale: 'A SAS authorizes requests and is not the service encryption key.',
      },
      {
        id: 'o3',
        text: 'Microsoft-managed keys',
        rationale: 'Azure Storage encrypts data at rest using Microsoft-managed keys by default.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Azure Storage encrypts data at rest using Microsoft-managed keys by default.',
    references: [
      {
        title: 'Encryption — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 1 / Bicep Template',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-14',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.data',
    primarySkillId: 'storage.data.containers',
    relatedSkillIds: [],
    familyId: 'storage-14',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Disable anonymous blob reads',
    prompt:
      'Account-level anonymous blob access is disabled. Can a container setting alone make blobs anonymously readable?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Yes, if the container is named public',
        rationale: 'The container name does not override account security.',
      },
      {
        id: 'o2',
        text: 'Yes, if the blob uses the Hot tier',
        rationale: 'Access tier is unrelated to anonymous authorization.',
      },
      {
        id: 'o3',
        text: 'No',
        rationale:
          'The account-level setting takes precedence over a container public-access setting.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation:
      'The account-level setting takes precedence over a container public-access setting.',
    references: [
      {
        title: 'Anonymous — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 3 / Create Containers with Different Access Levels',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-15',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.tools',
    relatedSkillIds: [],
    familyId: 'storage-15',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose a bulk transfer tool',
    prompt:
      'An administrator needs a command-line tool optimized for copying many files to Azure Blob Storage. Which tool fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Azure Resource Graph',
        rationale: 'Resource Graph queries resource metadata rather than transferring blob files.',
      },
      {
        id: 'o2',
        text: 'Azure Policy',
        rationale: 'Policy evaluates governance rules rather than copying files.',
      },
      {
        id: 'o3',
        text: 'AzCopy',
        rationale: 'AzCopy transfers data to and from supported Azure Storage services.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'AzCopy transfers data to and from supported Azure Storage services.',
    references: [
      {
        title: 'Azcopy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / AzCopy Commands',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-16',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.accounts',
    primarySkillId: 'storage.accounts.tools',
    relatedSkillIds: [],
    familyId: 'storage-16',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Copy nested folders',
    prompt:
      'A local directory contains nested subdirectories. Which AzCopy copy option includes those descendants?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: '--recursive',
        rationale: 'Recursive copying includes nested directory contents.',
      },
      {
        id: 'o2',
        text: '--resource-group',
        rationale: 'Resource-group selection is not the recursion control for AzCopy copy.',
      },
      {
        id: 'o3',
        text: '--what-if',
        rationale: 'This is not the AzCopy recursive-copy option.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Recursive copying includes nested directory contents.',
    references: [
      {
        title: 'Azcopy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Storage / AzCopy Commands',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-17',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.data',
    primarySkillId: 'storage.data.blob-delete',
    relatedSkillIds: [],
    familyId: 'storage-17',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Recover a deleted container',
    prompt:
      'A whole blob container was deleted after container soft delete was enabled. Which protection is intended to recover the container within retention?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'An account SAS',
        rationale: 'A SAS grants access but does not retain deleted containers.',
      },
      {
        id: 'o2',
        text: 'Container soft delete',
        rationale: 'This feature retains deleted containers for recovery.',
      },
      {
        id: 'o3',
        text: 'Blob soft delete alone',
        rationale: 'Blob soft delete alone does not protect container deletion.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'This feature retains deleted containers for recovery.',
    references: [
      {
        title: 'Container Delete — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-container-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 3 / Configure Soft Delete for Blobs and Containers',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'storage-18',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'storage',
    objectiveId: 'storage.access',
    primarySkillId: 'storage.access.firewalls',
    relatedSkillIds: [],
    familyId: 'storage-18',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Allow a selected subnet',
    prompt:
      'A storage account uses selected networks with default deny. A subnet has the appropriate storage service endpoint enabled. What account rule permits that subnet?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A container access policy alone',
        rationale: 'A stored access policy governs SAS authorization, not network allowlisting.',
      },
      {
        id: 'o2',
        text: 'A virtual network rule referencing the subnet',
        rationale:
          'The account network rule allows traffic from that service-endpoint-enabled subnet.',
      },
      {
        id: 'o3',
        text: 'An NSG allow rule alone',
        rationale: 'An NSG rule does not add the subnet to the storage account allowlist.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation:
      'The account network rule allows traffic from that service-endpoint-enabled subnet.',
    references: [
      {
        title: 'Firewall — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 2 / Configure Storage Firewall',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-05',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.interpret',
    relatedSkillIds: [],
    familyId: 'compute-05',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Recognize declarative deployment',
    prompt:
      'A Bicep file declares the desired Azure resources rather than a sequence of imperative management steps. What deployment approach is this?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A guest operating-system startup script',
        rationale: 'Bicep resource declarations are not commands executed inside a guest OS.',
      },
      {
        id: 'o2',
        text: 'An Azure RBAC role definition',
        rationale:
          'A deployment can create many resource types and is not limited to access roles.',
      },
      {
        id: 'o3',
        text: 'Declarative infrastructure as code',
        rationale: 'Bicep describes desired resource state for Resource Manager deployment.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Bicep describes desired resource state for Resource Manager deployment.',
    references: [
      {
        title: 'Bicep — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Key Study Areas / Bicep/ARM',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-06',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.bicep',
    relatedSkillIds: [],
    familyId: 'compute-06',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Parameterize a deployment',
    prompt:
      'One Bicep file must accept a different storage account name for each environment. Which construct should hold that caller-supplied value?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A resource type name',
        rationale:
          'The resource type identifies the provider resource, not the environment-specific account name.',
      },
      {
        id: 'o2',
        text: 'A parameter',
        rationale: 'Parameters accept deployment inputs.',
      },
      {
        id: 'o3',
        text: 'An output only',
        rationale: 'Outputs expose deployment results rather than supplying deployment inputs.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Parameters accept deployment inputs.',
    references: [
      {
        title: 'Parameters — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/parameters',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 1 / Bicep Template',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-07',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.deploy',
    relatedSkillIds: [],
    familyId: 'compute-07',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose deployment scope command',
    prompt:
      'A Bicep template targets a resource group. Which Azure CLI command family deploys it at that scope?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'az deployment group create',
        rationale: 'The group deployment command targets a resource group.',
      },
      {
        id: 'o2',
        text: 'az deployment tenant create',
        rationale: 'Tenant deployment is a different scope.',
      },
      {
        id: 'o3',
        text: 'az deployment mg create',
        rationale: 'Management-group deployment is a different scope.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'The group deployment command targets a resource group.',
    references: [
      {
        title: 'Deploy — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Key Study Areas / Bicep/ARM',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-08',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.deploy',
    relatedSkillIds: [],
    familyId: 'compute-08',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Preview infrastructure changes',
    prompt:
      'Before deploying a Bicep file, an administrator wants Resource Manager to predict changes without applying them. Which operation fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'What-if',
        rationale: 'What-if previews predicted changes and does not deploy resources.',
      },
      {
        id: 'o2',
        text: 'Create the deployment and inspect it afterward',
        rationale: 'That applies changes before inspection.',
      },
      {
        id: 'o3',
        text: 'Delete the resource group',
        rationale: 'Deletion is destructive and is not a preview.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'What-if previews predicted changes and does not deploy resources.',
    references: [
      {
        title: 'Whatif — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-what-if',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Key Study Areas / Bicep/ARM',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-09',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.export',
    relatedSkillIds: [],
    familyId: 'compute-09',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Convert an ARM template',
    prompt:
      'An existing JSON ARM template should become an initial Bicep file for further editing. Which operation fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Bicep build',
        rationale: 'Build compiles Bicep into ARM JSON, the opposite direction.',
      },
      {
        id: 'o2',
        text: 'AzCopy sync',
        rationale: 'AzCopy synchronizes storage data rather than converting deployment languages.',
      },
      {
        id: 'o3',
        text: 'Bicep decompile',
        rationale: 'Decompile converts ARM JSON to a Bicep starting point that may need review.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Decompile converts ARM JSON to a Bicep starting point that may need review.',
    references: [
      {
        title: 'Decompile — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/decompile',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Key Study Areas / Bicep/ARM',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-10',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.interpret',
    relatedSkillIds: [],
    familyId: 'compute-10',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Distinguish SKU from resource kind',
    prompt:
      'In a storage Bicep resource, sku.name is Standard_LRS while kind is StorageV2. Which value describes the redundancy/performance SKU?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The symbolic resource name',
        rationale: 'The Bicep symbolic name is a local identifier, not a storage SKU.',
      },
      {
        id: 'o2',
        text: 'Standard_LRS',
        rationale: 'The sku.name property specifies the storage SKU.',
      },
      {
        id: 'o3',
        text: 'StorageV2',
        rationale: 'The kind property specifies account kind.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'The sku.name property specifies the storage SKU.',
    references: [
      {
        title: 'Storage Template — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 1 / Bicep Template',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-11',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.arm',
    relatedSkillIds: [],
    familyId: 'compute-11',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Read an ARM input expression',
    prompt:
      "In ARM JSON, a resource name is set to [parameters('storageAccountName')]. Where does the name value come from?",
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The current blob container name',
        rationale: 'The expression does not inspect blob data.',
      },
      {
        id: 'o2',
        text: 'The name of the deploying user',
        rationale: 'The expression does not obtain the user identity.',
      },
      {
        id: 'o3',
        text: 'The storageAccountName deployment parameter',
        rationale: 'The parameters expression reads the named input parameter.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'The parameters expression reads the named input parameter.',
    references: [
      {
        title: 'Arm Parameters — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-deployment#parameters',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md',
      section: 'Storage / Question 5',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-12',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.create',
    relatedSkillIds: [],
    familyId: 'compute-12',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Stop compute billing correctly',
    prompt:
      'A VM is stopped from inside its operating system and still has allocated compute. Which Azure action releases its compute allocation?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Deallocate the VM',
        rationale:
          'Deallocation releases compute allocation; disks and other retained resources may still incur charges.',
      },
      {
        id: 'o2',
        text: 'Leave it stopped but allocated',
        rationale: 'Allocated compute can continue to incur charges.',
      },
      {
        id: 'o3',
        text: 'Disconnect the RDP session',
        rationale: 'Ending a remote session does not release the VM allocation.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation:
      'Deallocation releases compute allocation; disks and other retained resources may still incur charges.',
    references: [
      {
        title: 'Vmstates — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Pitfalls / stopped vs deallocated',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-13',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.sizes',
    relatedSkillIds: [],
    familyId: 'compute-size-categories',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose memory-focused compute',
    prompt:
      'A workload needs a high memory-to-vCPU ratio. Which general VM category should be evaluated?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Memory optimized',
        rationale: 'Memory-optimized sizes target workloads needing relatively more memory.',
      },
      {
        id: 'o2',
        text: 'Compute optimized',
        rationale: 'Compute-optimized sizes emphasize CPU relative to memory.',
      },
      {
        id: 'o3',
        text: 'Storage account access tiers',
        rationale: 'Blob tiers are not VM compute categories.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Memory-optimized sizes target workloads needing relatively more memory.',
    references: [
      {
        title: 'Vmsizes — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / VM Sizes Series',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-14',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.sizes',
    relatedSkillIds: [],
    familyId: 'compute-size-categories',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose GPU compute',
    prompt:
      'A graphics workload explicitly requires an Azure VM with a GPU. Which VM category should be evaluated?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'GPU optimized',
        rationale: 'GPU VM sizes provide GPU hardware for suitable workloads.',
      },
      {
        id: 'o2',
        text: 'General-purpose CPU-only sizes',
        rationale: 'CPU-only sizes cannot satisfy an explicit GPU requirement.',
      },
      {
        id: 'o3',
        text: 'Burstable CPU-only sizes',
        rationale: 'CPU burst credits do not supply a GPU.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'GPU VM sizes provide GPU hardware for suitable workloads.',
    references: [
      {
        title: 'Vmsizes — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / VM Sizes Series',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-15',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.scalesets',
    relatedSkillIds: [],
    familyId: 'compute-15',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Scale VM instance count',
    prompt:
      'A service should run on a managed group of VM instances and scale instance count with demand. Which resource fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A managed data disk',
        rationale: 'A disk is storage and cannot manage VM instance count.',
      },
      {
        id: 'o2',
        text: 'Virtual Machine Scale Sets',
        rationale: 'Scale sets manage groups of VMs and support autoscaling.',
      },
      {
        id: 'o3',
        text: 'One VM resized manually',
        rationale: 'Vertical resizing alone does not manage a horizontally scaled group.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Scale sets manage groups of VMs and support autoscaling.',
    references: [
      {
        title: 'Vmss — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / VM Commands',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-16',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.disks',
    relatedSkillIds: [],
    familyId: 'compute-16',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose durable VM data storage',
    prompt:
      'Application data must survive loss of a VM temporary disk. Where should persistent data be stored?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The remote desktop clipboard',
        rationale: 'The clipboard is not persistent application storage.',
      },
      {
        id: 'o2',
        text: 'A managed data disk',
        rationale:
          'Managed disks provide persistent block storage independent of temporary local storage.',
      },
      {
        id: 'o3',
        text: 'The temporary disk only',
        rationale: 'Temporary disk data is not durable across all VM lifecycle events.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation:
      'Managed disks provide persistent block storage independent of temporary local storage.',
    references: [
      {
        title: 'Disks — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/managed-disks-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/troubleshooting/common-scenarios.md',
      section: 'Scenario 9 / VM Performance Issues',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-17',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.availability',
    relatedSkillIds: [],
    familyId: 'availability-set-domains',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Understand update domains',
    prompt:
      'VMs in an availability set should not all reboot together during planned maintenance. Which availability-set grouping addresses this?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Update domains',
        rationale: 'Update domains group VMs and hardware that can be rebooted together.',
      },
      {
        id: 'o2',
        text: 'Blob access tiers',
        rationale: 'Blob tiers have no role in VM maintenance placement.',
      },
      {
        id: 'o3',
        text: 'Resource tags',
        rationale: 'Tags do not determine maintenance sequencing.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Update domains group VMs and hardware that can be rebooted together.',
    references: [
      {
        title: 'Availability — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / Availability Options',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-18',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.availability',
    relatedSkillIds: [],
    familyId: 'availability-set-domains',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Understand fault domains',
    prompt:
      'In an availability set, which grouping separates VMs across shared power and network infrastructure failure boundaries?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Update domains only',
        rationale: 'Update domains address maintenance reboot groups, not this hardware grouping.',
      },
      {
        id: 'o2',
        text: 'An App Service deployment slot',
        rationale: 'A deployment slot is unrelated to VM availability-set hardware placement.',
      },
      {
        id: 'o3',
        text: 'Fault domains',
        rationale: 'Fault domains separate shared hardware failure dependencies.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Fault domains separate shared hardware failure dependencies.',
    references: [
      {
        title: 'Availability — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / Availability Options',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-19',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.apps',
    primarySkillId: 'compute.apps.plan',
    relatedSkillIds: [],
    familyId: 'compute-19',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Identify App Service capacity',
    prompt: 'Several web apps share an App Service plan. What does that plan primarily define?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Only a DNS alias',
        rationale: 'A plan is not simply a hostname mapping.',
      },
      {
        id: 'o2',
        text: 'An independent VM for every application by definition',
        rationale: 'Apps in a shared plan can share its compute resources.',
      },
      {
        id: 'o3',
        text: 'The compute resources and pricing tier for hosting',
        rationale: 'An App Service plan defines the hosting compute capacity and features.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'An App Service plan defines the hosting compute capacity and features.',
    references: [
      {
        title: 'Appplan — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / App Service',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-20',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.apps',
    primarySkillId: 'compute.apps.scaling',
    relatedSkillIds: [],
    familyId: 'app-service-scaling',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Scale up a web app plan',
    prompt:
      'An App Service workload needs a larger worker size or features in a higher pricing tier. Which operation fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Change a blob access tier',
        rationale: 'Blob tier changes do not alter web-app workers.',
      },
      {
        id: 'o2',
        text: 'Add a resource tag',
        rationale: 'Tags do not change hosting capacity.',
      },
      {
        id: 'o3',
        text: 'Scale up the App Service plan',
        rationale: 'Scaling up changes tier or worker capacity.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Scaling up changes tier or worker capacity.',
    references: [
      {
        title: 'Appscale — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/app-service/manage-scale-up',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / App Service',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-21',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.apps',
    primarySkillId: 'compute.apps.scaling',
    relatedSkillIds: [],
    familyId: 'app-service-scaling',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Scale out a web workload',
    prompt:
      'A supported App Service plan needs more worker instances of its existing size. What kind of scaling is this?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Scale out',
        rationale: 'Scale out increases the number of worker instances.',
      },
      {
        id: 'o2',
        text: 'Scale up',
        rationale: 'Scale up changes the size or tier rather than specifically the instance count.',
      },
      {
        id: 'o3',
        text: 'Change the TLS certificate',
        rationale: 'Certificate replacement does not increase workers.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Scale out increases the number of worker instances.',
    references: [
      {
        title: 'Appplan — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Compute / App Service',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-22',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.containers',
    primarySkillId: 'compute.containers.instances',
    relatedSkillIds: [],
    familyId: 'compute-22',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Share a container-group lifecycle',
    prompt:
      'Two containers must be scheduled on the same host and share lifecycle and local networking in Azure Container Instances. What groups them?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'An App Service deployment slot',
        rationale: 'An App Service slot is not an ACI container-group boundary.',
      },
      {
        id: 'o2',
        text: 'A container group',
        rationale:
          'An ACI container group shares host, lifecycle, network, and supported resources.',
      },
      {
        id: 'o3',
        text: 'A management group',
        rationale: 'A management group organizes Azure subscriptions.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'An ACI container group shares host, lifecycle, network, and supported resources.',
    references: [
      {
        title: 'Aci — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/container-instances/container-instances-container-groups',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-practice-questions.md',
      section: 'Compute / Container Instances overview',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-23',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.templates',
    primarySkillId: 'compute.templates.bicep',
    relatedSkillIds: [],
    familyId: 'compute-23',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Expose a deployment result',
    prompt:
      'A Bicep deployment should return the created storage account ID to the caller. Which construct publishes that value?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'An NSG rule',
        rationale: 'Network security rules do not publish deployment outputs.',
      },
      {
        id: 'o2',
        text: 'An output',
        rationale: 'Outputs expose deployment result values.',
      },
      {
        id: 'o3',
        text: 'An input parameter alone',
        rationale: 'A parameter receives caller input instead of publishing a result.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Outputs expose deployment result values.',
    references: [
      {
        title: 'Bicep — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/storage/lab01-storage-accounts-blob.md',
      section: 'Exercise 1 / Bicep Template',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'compute-24',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'compute',
    objectiveId: 'compute.vms',
    primarySkillId: 'compute.vms.disks',
    relatedSkillIds: [],
    familyId: 'compute-24',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Separate disk and compute costs',
    prompt:
      'A VM has been deallocated but its managed disks are retained. Does deallocation alone remove disk storage charges?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'No; retained storage can still be charged',
        rationale: 'Deallocation releases compute but does not delete managed disks.',
      },
      {
        id: 'o2',
        text: 'Yes; all attached resources become free',
        rationale: 'Retained resources can have independent charges.',
      },
      {
        id: 'o3',
        text: 'Only if the OS was shut down first',
        rationale: 'Guest shutdown ordering does not make retained disks free.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Deallocation releases compute but does not delete managed disks.',
    references: [
      {
        title: 'Vmstates — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Pitfalls / stopped vs deallocated',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-05',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.networks',
    primarySkillId: 'networking.networks.create',
    relatedSkillIds: [],
    familyId: 'networking-05',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Calculate subnet capacity',
    prompt:
      'An Azure IPv4 subnet uses /24. With five addresses reserved by Azure, how many addresses remain assignable?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: '254',
        rationale: 'Azure reserves more than only network and broadcast addresses.',
      },
      {
        id: 'o2',
        text: '256',
        rationale: 'Not every address is assignable.',
      },
      {
        id: 'o3',
        text: '251',
        rationale: 'A /24 has 256 addresses; five are reserved.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'A /24 has 256 addresses; five are reserved.',
    references: [
      {
        title: 'Vnet — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Networking / Reserved Azure IPs',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-06',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.networks',
    primarySkillId: 'networking.networks.peering',
    relatedSkillIds: [],
    familyId: 'networking-06',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Check overlapping networks',
    prompt:
      'Two virtual networks both use 10.0.0.0/16. Can they be directly peered with these overlapping address spaces?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'No; address spaces must not overlap',
        rationale: 'Peering requires nonoverlapping address spaces.',
      },
      {
        id: 'o2',
        text: 'Yes; NSGs automatically translate addresses',
        rationale: 'NSGs do not translate overlapping addresses for peering.',
      },
      {
        id: 'o3',
        text: 'Yes; matching address spaces are required',
        rationale: 'Matching address spaces conflict rather than satisfy peering requirements.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Peering requires nonoverlapping address spaces.',
    references: [
      {
        title: 'Peering — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/troubleshooting/common-scenarios.md',
      section: 'Scenario 10 / VNet Peering Not Working',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-07',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.networks',
    primarySkillId: 'networking.networks.peering',
    relatedSkillIds: [],
    familyId: 'networking-07',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Avoid assumed transit',
    prompt:
      'VNet A peers with B, and B peers with C. Without routing appliances or other connectivity, does peering automatically connect A to C?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Only if all VNets have the same name',
        rationale: 'Names do not enable peering transit.',
      },
      {
        id: 'o2',
        text: 'No; peering is not transitive',
        rationale: 'Additional connectivity or routing is required between A and C.',
      },
      {
        id: 'o3',
        text: 'Yes; peering always propagates across all peers',
        rationale: 'Peering connections do not create automatic transitive connectivity.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Additional connectivity or routing is required between A and C.',
    references: [
      {
        title: 'Peering — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Key Study Areas / VNet Peering',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-08',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.security',
    primarySkillId: 'networking.security.effective',
    relatedSkillIds: [],
    familyId: 'networking-08',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Evaluate rule priority',
    prompt: 'Two matching inbound NSG rules have priorities 100 and 200. Which is evaluated first?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Priority 100',
        rationale: 'Lower numbers have higher priority.',
      },
      {
        id: 'o2',
        text: 'Priority 200',
        rationale: 'Higher numeric priority values are evaluated later.',
      },
      {
        id: 'o3',
        text: 'The rule with the longest name',
        rationale: 'Rule names do not determine precedence.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Lower numbers have higher priority.',
    references: [
      {
        title: 'Nsg — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Networking / Network Security Groups',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-09',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.security',
    primarySkillId: 'networking.security.effective',
    relatedSkillIds: [],
    familyId: 'networking-09',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Combine subnet and NIC rules',
    prompt:
      'An inbound connection is allowed by the subnet NSG but denied by the NIC NSG. What is the outcome?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Denied',
        rationale: 'Traffic must pass applicable NSGs at both levels.',
      },
      {
        id: 'o2',
        text: 'Allowed because the subnet rule always wins',
        rationale: 'A subnet allow does not override a NIC deny.',
      },
      {
        id: 'o3',
        text: 'Allowed if both NSGs have the same name',
        rationale: 'Names do not override rule evaluation.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Traffic must pass applicable NSGs at both levels.',
    references: [
      {
        title: 'Nsg How — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/networking/lab01-virtual-networks-nsg.md',
      section: 'Exercise 2 / View Effective Security Rules',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-10',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.security',
    primarySkillId: 'networking.security.groups',
    relatedSkillIds: [],
    familyId: 'networking-10',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Understand stateful filtering',
    prompt:
      'An outbound connection is allowed by an NSG. Does return traffic for that established flow need a separate inbound allow rule?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Only if a management group exists',
        rationale: 'Management groups do not supply flow state.',
      },
      {
        id: 'o2',
        text: 'No; NSGs track established flows',
        rationale: 'NSGs are stateful, so response traffic for an allowed flow is permitted.',
      },
      {
        id: 'o3',
        text: 'Yes; NSGs are stateless',
        rationale: 'NSGs track connection state.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'NSGs are stateful, so response traffic for an allowed flow is permitted.',
    references: [
      {
        title: 'Nsg — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Common Pitfalls / NSGs are stateful',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-11',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.security',
    primarySkillId: 'networking.security.groups',
    relatedSkillIds: [],
    familyId: 'networking-11',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Group application NICs',
    prompt:
      'NSG rules should refer to web-server NICs as one application group instead of maintaining individual IPs. What fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A storage container',
        rationale: 'Storage containers do not define NSG endpoint groups.',
      },
      {
        id: 'o2',
        text: 'An application security group',
        rationale: 'ASGs group NICs for use in NSG rules.',
      },
      {
        id: 'o3',
        text: 'A management group',
        rationale: 'Management groups contain subscriptions, not NIC rule memberships.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'ASGs group NICs for use in NSG rules.',
    references: [
      {
        title: 'Asg — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/networking/lab01-virtual-networks-nsg.md',
      section: 'Exercise 3 / Configure Application Security Groups',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-12',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.security',
    primarySkillId: 'networking.security.groups',
    relatedSkillIds: [],
    familyId: 'networking-12',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Use maintained service ranges',
    prompt:
      'An NSG rule should use Azure-maintained address prefixes for a service instead of a manually maintained IP list. What should it use?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A user-assigned identity',
        rationale: 'An identity does not define NSG IP prefixes.',
      },
      {
        id: 'o2',
        text: 'A service tag',
        rationale: 'Service tags represent Microsoft-managed address-prefix groups.',
      },
      {
        id: 'o3',
        text: 'A resource metadata tag',
        rationale: 'Resource tags do not expand into service address ranges.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Service tags represent Microsoft-managed address-prefix groups.',
    references: [
      {
        title: 'Service Tags — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Networking / Service Tags',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-13',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.networks',
    primarySkillId: 'networking.networks.routes',
    relatedSkillIds: [],
    familyId: 'networking-13',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose a more specific route',
    prompt:
      'A route table includes 10.1.0.0/16 and 10.1.2.0/24. Which prefix matches destination 10.1.2.9 most specifically?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: '10.1.2.0/24',
        rationale: 'Azure first selects the longest matching address prefix.',
      },
      {
        id: 'o2',
        text: '10.1.0.0/16',
        rationale: 'This is a match but is less specific.',
      },
      {
        id: 'o3',
        text: 'The route listed first in the portal',
        rationale: 'Display order does not determine longest-prefix selection.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Azure first selects the longest matching address prefix.',
    references: [
      {
        title: 'Routes — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Key Study Areas / VNet Peering',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-14',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.networks',
    primarySkillId: 'networking.networks.routes',
    relatedSkillIds: [],
    familyId: 'networking-14',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Activate a route table',
    prompt:
      'An administrator creates a route table and adds routes. What associates those routes with a subnet?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Associate the route table with the subnet',
        rationale: 'Subnet association applies the route table to that subnet.',
      },
      {
        id: 'o2',
        text: 'Give the table the same name as the subnet',
        rationale: 'Names do not create the association.',
      },
      {
        id: 'o3',
        text: 'Add a Department tag',
        rationale: 'Metadata tags do not associate route tables.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'Subnet association applies the route table to that subnet.',
    references: [
      {
        title: 'Routes — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/networking/lab01-virtual-networks-nsg.md',
      section: 'Exercise 5 / Configure User-Defined Routes',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-15',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.dns',
    primarySkillId: 'networking.dns.dns',
    relatedSkillIds: [],
    familyId: 'networking-15',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Resolve a private zone',
    prompt:
      'VMs in a VNet using Azure-provided DNS need to resolve records in an Azure private DNS zone. Which relationship enables resolution?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A public IP on every VM',
        rationale: 'Public IPs do not link a private DNS zone.',
      },
      {
        id: 'o2',
        text: 'An NSG rule named DNS',
        rationale: 'A rule name does not establish DNS zone visibility.',
      },
      {
        id: 'o3',
        text: 'A virtual network link to the private zone',
        rationale: 'A resolution link makes the private zone available to that VNet.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'A resolution link makes the private zone available to that VNet.',
    references: [
      {
        title: 'Dns — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/troubleshooting/common-scenarios.md',
      section: 'Scenario 11 / DNS Resolution Failures',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-16',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.dns',
    primarySkillId: 'networking.dns.dns',
    relatedSkillIds: [],
    familyId: 'networking-16',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Separate registration from resolution',
    prompt:
      'A private DNS zone is linked to a VNet with auto-registration disabled. Can VMs still resolve records already in the zone using Azure-provided DNS?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Only after assigning Owner to every VM',
        rationale: 'Resource-management roles do not enable DNS resolution this way.',
      },
      {
        id: 'o2',
        text: 'Yes',
        rationale: 'Resolution links work without automatic VM record registration.',
      },
      {
        id: 'o3',
        text: 'No; registration is required for all resolution',
        rationale: 'Auto-registration controls record creation, not basic linked-zone resolution.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Resolution links work without automatic VM record registration.',
    references: [
      {
        title: 'Dns — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/troubleshooting/common-scenarios.md',
      section: 'Scenario 11 / DNS Resolution Failures',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-17',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.dns',
    primarySkillId: 'networking.dns.balancer',
    relatedSkillIds: [],
    familyId: 'networking-17',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose a private load-balancer frontend',
    prompt:
      'An application should be load-balanced over a private VNet address without a public frontend. Which frontend fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A public DNS alias alone',
        rationale: 'DNS naming alone does not provide the private load-balancing frontend.',
      },
      {
        id: 'o2',
        text: 'An internal load balancer frontend',
        rationale: 'An internal frontend uses a private IP.',
      },
      {
        id: 'o3',
        text: 'A public load balancer frontend',
        rationale: 'A public frontend uses a public IP.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'An internal frontend uses a private IP.',
    references: [
      {
        title: 'Lb — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Networking / Load Balancer vs Application Gateway',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-18',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.dns',
    primarySkillId: 'networking.dns.balancer',
    relatedSkillIds: [],
    familyId: 'networking-18',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Identify transport load balancing',
    prompt: 'Which protocols are the primary transport protocols handled by Azure Load Balancer?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Only DNS zone transfers',
        rationale: 'Load Balancer is not limited to DNS zone transfer operations.',
      },
      {
        id: 'o2',
        text: 'TCP and UDP',
        rationale: 'Azure Load Balancer operates at transport layer for TCP and UDP.',
      },
      {
        id: 'o3',
        text: 'Only HTTP URL paths',
        rationale: 'URL-path routing is an application-layer feature.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Azure Load Balancer operates at transport layer for TCP and UDP.',
    references: [
      {
        title: 'Lb — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Networking / Load Balancer vs Application Gateway',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-19',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.dns',
    primarySkillId: 'networking.dns.troubleshoot',
    relatedSkillIds: [],
    familyId: 'networking-19',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Investigate an unhealthy backend',
    prompt: 'A load-balancer health probe is failing. Which check directly tests a common cause?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Rename the resource group',
        rationale: 'Group naming does not repair backend health.',
      },
      {
        id: 'o2',
        text: 'Change the resource CostCenter tag',
        rationale: 'Cost classification does not make the probe succeed.',
      },
      {
        id: 'o3',
        text: 'Verify the application listens on the probe port and the probe traffic is allowed',
        rationale: 'Probe success depends on backend response and network reachability.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Probe success depends on backend response and network reachability.',
    references: [
      {
        title: 'Probe — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/troubleshooting/common-scenarios.md',
      section: 'Scenario 12 / Load Balancer Health Probe Failing',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'networking-20',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'networking',
    objectiveId: 'networking.networks',
    primarySkillId: 'networking.networks.troubleshoot',
    relatedSkillIds: [],
    familyId: 'networking-20',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Diagnose an NSG flow decision',
    prompt:
      'An administrator wants to check whether security rules allow a specified packet to or from a VM. Which Network Watcher tool fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Blob lifecycle management',
        rationale: 'Lifecycle rules operate on stored blobs, not VM traffic.',
      },
      {
        id: 'o2',
        text: 'IP flow verify',
        rationale: 'IP flow verify evaluates the security-rule decision for a specified flow.',
      },
      {
        id: 'o3',
        text: 'Azure Cost analysis',
        rationale: 'Cost analysis does not evaluate NSG packet decisions.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'IP flow verify evaluates the security-rule decision for a specified flow.',
    references: [
      {
        title: 'Watcher — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/labs/networking/lab01-virtual-networks-nsg.md',
      section: 'Exercise 6 / Use Network Watcher',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-05',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.logs',
    relatedSkillIds: [],
    familyId: 'monitoring-05',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Route platform logs',
    prompt:
      'A supported resource should send its platform resource logs to a Log Analytics workspace. What should be configured?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'An NSG rule',
        rationale: 'Network security rules do not configure diagnostic log export.',
      },
      {
        id: 'o2',
        text: 'A resource lock',
        rationale: 'Locks do not route telemetry.',
      },
      {
        id: 'o3',
        text: 'A diagnostic setting',
        rationale: 'Diagnostic settings route supported resource logs and metrics to destinations.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Diagnostic settings route supported resource logs and metrics to destinations.',
    references: [
      {
        title: 'Diagnostics — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Monitoring Commands',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-06',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.logs',
    relatedSkillIds: [],
    familyId: 'monitoring-06',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Separate guest and platform logs',
    prompt:
      'A resource diagnostic setting is created for a VM. Does this alone install guest collection for arbitrary operating-system logs?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Only if the VM has an Owner assignment',
        rationale: 'An RBAC assignment is not guest-agent installation.',
      },
      {
        id: 'o2',
        text: 'No; guest collection needs its own agent and collection configuration',
        rationale: 'Platform diagnostic settings do not install guest telemetry collection.',
      },
      {
        id: 'o3',
        text: 'Yes; all guest files are automatically uploaded',
        rationale: 'Diagnostic settings do not upload arbitrary guest files.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Platform diagnostic settings do not install guest telemetry collection.',
    references: [
      {
        title: 'Guest — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/vm/monitor-virtual-machine',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Monitoring Commands',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-07',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.logs',
    relatedSkillIds: [],
    familyId: 'monitoring-07',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Find control-plane changes',
    prompt:
      'An administrator needs to investigate who performed a resource-management operation. Which Azure log is the starting point?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Blob contents',
        rationale: 'Blob data is not the subscription management event log.',
      },
      {
        id: 'o2',
        text: 'A private DNS zone',
        rationale: 'DNS records do not record who changed Azure resources.',
      },
      {
        id: 'o3',
        text: 'Activity Log',
        rationale: 'The Activity Log records subscription control-plane events.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'The Activity Log records subscription control-plane events.',
    references: [
      {
        title: 'Activity — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Resource changes',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-08',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.alerts',
    relatedSkillIds: [],
    familyId: 'monitoring-08',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Reuse notification actions',
    prompt:
      'Several alert rules should notify the same team using a reusable set of actions. What should be configured?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A resource group alone',
        rationale:
          'A resource group organizes resources but is not the notification configuration.',
      },
      {
        id: 'o2',
        text: 'An application security group',
        rationale: 'An ASG groups NICs for NSG filtering.',
      },
      {
        id: 'o3',
        text: 'An action group',
        rationale: 'An action group holds reusable notifications and actions for alerts.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'An action group holds reusable notifications and actions for alerts.',
    references: [
      {
        title: 'Actions — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md',
      section: 'Scenario 9.1',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-09',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.queries',
    relatedSkillIds: [],
    familyId: 'monitoring-09',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Filter a time window',
    prompt:
      'A KQL query should retain records whose TimeGenerated is within the last hour. Which expression fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'summarize count() only',
        rationale: 'Aggregation alone does not impose a time filter.',
      },
      {
        id: 'o2',
        text: 'where TimeGenerated > ago(1h)',
        rationale: 'This filters records newer than one hour ago.',
      },
      {
        id: 'o3',
        text: 'where TimeGenerated < ago(1h)',
        rationale: 'This selects older records.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'This filters records newer than one hour ago.',
    references: [
      {
        title: 'Kql — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/get-started-queries',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Common KQL Queries',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-10',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.queries',
    relatedSkillIds: [],
    familyId: 'monitoring-10',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Count records by resource',
    prompt: 'A query must produce the number of records per Computer. Which KQL operation fits?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'project Computer',
        rationale: 'Project selects a column without counting groups.',
      },
      {
        id: 'o2',
        text: 'take 10',
        rationale: 'Take selects a subset rather than calculating per-computer counts.',
      },
      {
        id: 'o3',
        text: 'summarize count() by Computer',
        rationale: 'Summarize groups records by Computer and counts each group.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Summarize groups records by Computer and counts each group.',
    references: [
      {
        title: 'Kql — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/get-started-queries',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Common KQL Queries',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-11',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.backup',
    primarySkillId: 'monitoring.backup.recovery-vault',
    relatedSkillIds: [],
    familyId: 'monitoring-11',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Choose a VM backup vault',
    prompt:
      'An administrator is configuring Azure Backup for Azure VMs using a Recovery Services vault. Which placement is required relative to the VMs?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'The same Azure region',
        rationale: 'The Recovery Services vault for Azure VM backup must be in the VM region.',
      },
      {
        id: 'o2',
        text: 'Any region because all vaults discover every VM',
        rationale: 'Azure VM backup has regional placement requirements.',
      },
      {
        id: 'o3',
        text: 'Only the paired region',
        rationale: 'The primary backup vault is not required to be in the paired region.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation: 'The Recovery Services vault for Azure VM backup must be in the VM region.',
    references: [
      {
        title: 'Vault — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/backup/backup-create-recovery-services-vault',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Backup & Recovery',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-12',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.backup',
    primarySkillId: 'monitoring.backup.policy',
    relatedSkillIds: [],
    familyId: 'monitoring-12',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Define retention and schedule',
    prompt:
      'Azure VM recovery points need a specific backup schedule and retention settings. What defines these?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'A VM size',
        rationale: 'VM size does not define backup retention.',
      },
      {
        id: 'o2',
        text: 'A backup policy',
        rationale: 'Backup policy configures scheduling and retention for the workload.',
      },
      {
        id: 'o3',
        text: 'An NSG policy',
        rationale: 'NSG rules govern traffic rather than recovery-point retention.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation: 'Backup policy configures scheduling and retention for the workload.',
    references: [
      {
        title: 'Backup — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-introduction',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md',
      section: 'Scenario 10.1',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-13',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.backup',
    primarySkillId: 'monitoring.backup.site-recovery',
    relatedSkillIds: [],
    familyId: 'monitoring-13',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Separate replication from backup',
    prompt:
      'A team needs VM replication and orchestrated disaster-recovery failover to another region. Which service is designed for that workflow?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Azure Monitor metric alerts alone',
        rationale: 'Alerts detect conditions but do not supply VM replication.',
      },
      {
        id: 'o2',
        text: 'Azure Site Recovery',
        rationale:
          'Site Recovery provides replication and failover orchestration for supported workloads.',
      },
      {
        id: 'o3',
        text: 'Azure resource tags',
        rationale: 'Tags cannot replicate VM state or orchestrate failover.',
      },
    ],
    correctOptionIds: ['o2'],
    explanation:
      'Site Recovery provides replication and failover orchestration for supported workloads.',
    references: [
      {
        title: 'Recovery — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md',
      section: 'Scenario 10.1',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-14',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.backup',
    primarySkillId: 'monitoring.backup.failover',
    relatedSkillIds: [],
    familyId: 'monitoring-14',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Rehearse disaster recovery',
    prompt:
      'A team wants to validate a Site Recovery disaster-recovery plan without disrupting production replication. Which operation is designed for a rehearsal?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Test failover',
        rationale:
          'Test failover validates recovery in a test environment without initiating production failover.',
      },
      {
        id: 'o2',
        text: 'Delete the replicated VM',
        rationale: 'Deletion is not a recovery rehearsal.',
      },
      {
        id: 'o3',
        text: 'Remove the recovery plan',
        rationale: 'Removing orchestration does not validate it.',
      },
    ],
    correctOptionIds: ['o1'],
    explanation:
      'Test failover validates recovery in a test environment without initiating production failover.',
    references: [
      {
        title: 'Recovery — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-overview',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/practice-questions/az104-scenario-questions.md',
      section: 'Scenario 10 / Backup and Disaster Recovery',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
  {
    id: 'monitoring-15',
    version: 1,
    blueprintVersion: '2026-04-17',
    domainId: 'monitoring',
    objectiveId: 'monitoring.monitor',
    primarySkillId: 'monitoring.monitor.metrics',
    relatedSkillIds: [],
    familyId: 'monitoring-15',
    mappingVersion: 'skills-2026-04-17-v1',
    title: 'Identify metric data',
    prompt:
      'An administrator charts Percentage CPU as numerical samples over time. Which Azure Monitor data category is being used?',
    type: 'single',
    options: [
      {
        id: 'o1',
        text: 'Resource tags',
        rationale: 'Tags are classification metadata rather than sampled measurements.',
      },
      {
        id: 'o2',
        text: 'Role assignments',
        rationale: 'Role assignments define authorization rather than CPU measurements.',
      },
      {
        id: 'o3',
        text: 'Metrics',
        rationale: 'Metrics contain numerical measurements collected at regular intervals.',
      },
    ],
    correctOptionIds: ['o3'],
    explanation: 'Metrics contain numerical measurements collected at regular intervals.',
    references: [
      {
        title: 'Metrics — Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/data-platform-metrics',
      },
    ],
    source: {
      kind: 'adapted-public',
      author: 'Tim Warner',
      license: 'MIT',
      revision: '5f440153d0c835b8ba9f38353287e7ef1df65259',
      url: 'https://github.com/timothywarner/az104/blob/5f440153d0c835b8ba9f38353287e7ef1df65259/quick-reference/az104-cheat-sheet.md',
      section: 'Monitoring / Azure Monitor Components',
      changes:
        'AI-assisted editorial adaptation of the cited public instructional concept into a focused practice decision with new wording and distractor explanations; checked the answer against the linked Microsoft documentation.',
    },
    reviewedAt: '2026-09-06',
  },
];
