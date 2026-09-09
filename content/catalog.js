export const blueprint = {
  version: '2026-04-17',
  url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104',
};

export const domains = [
  {
    id: 'identity',
    title: 'Identity & governance',
    weight: '20–25%',
    description: 'Users, access, and organizational controls',
    icon: 'shield',
    color: '#426856',
    objectives: [
      ['identity.users', 'Users and groups'],
      ['identity.access', 'Resource access'],
      ['identity.governance', 'Subscriptions and governance'],
    ],
  },
  {
    id: 'storage',
    title: 'Storage',
    weight: '15–20%',
    description: 'Accounts, data protection, and access',
    icon: 'database',
    color: '#98612e',
    objectives: [
      ['storage.access', 'Storage access'],
      ['storage.accounts', 'Storage accounts'],
      ['storage.data', 'Files and blobs'],
    ],
  },
  {
    id: 'compute',
    title: 'Compute',
    weight: '20–25%',
    description: 'Virtual machines, containers, and web apps',
    icon: 'server',
    color: '#576e97',
    objectives: [
      ['compute.templates', 'ARM and Bicep deployments'],
      ['compute.vms', 'Virtual machines'],
      ['compute.containers', 'Containers'],
      ['compute.apps', 'App Service'],
    ],
  },
  {
    id: 'networking',
    title: 'Virtual networking',
    weight: '15–20%',
    description: 'Connectivity, traffic, and secure endpoints',
    icon: 'network',
    color: '#81608b',
    objectives: [
      ['networking.networks', 'Networks and routing'],
      ['networking.security', 'Secure network access'],
      ['networking.dns', 'DNS and load balancing'],
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring & recovery',
    weight: '10–15%',
    description: 'Observability, alerts, and backup',
    icon: 'activity',
    color: '#3a7a83',
    objectives: [
      ['monitoring.monitor', 'Resource monitoring'],
      ['monitoring.backup', 'Backup and recovery'],
    ],
  },
];
export const objectives = domains.flatMap((d) =>
  d.objectives.map(([id, title]) => ({ id, title, domainId: d.id })),
);

export const mappingVersion = 'skills-2026-04-17-v1';
const skillGroups = {
  'identity.users':
    'create:Create users and groups|properties:Manage user and group properties|licenses:Manage licenses|external:Manage external users|sspr:Configure self-service password reset',
  'identity.access':
    'roles:Manage built-in roles|assignments:Assign roles at scopes|interpret:Interpret access assignments',
  'identity.governance':
    'policy:Manage Azure Policy|locks:Configure resource locks|tags:Manage tags|groups:Manage resource groups|subscriptions:Manage subscriptions|costs:Manage costs and budgets|management-groups:Configure management groups',
  'storage.access':
    'firewalls:Configure storage firewalls and networks|sas:Create and use SAS tokens|policies:Configure stored access policies|keys:Manage access keys|files-identity:Configure identity-based Azure Files access',
  'storage.accounts':
    'create:Create storage accounts|redundancy:Configure redundancy|replication:Configure object replication|encryption:Configure encryption|tools:Use Storage Explorer and AzCopy',
  'storage.data':
    'shares:Configure file shares|containers:Configure blob containers|tiers:Configure storage tiers|blob-delete:Configure blob soft delete|file-snapshots:Configure file snapshots and soft delete|lifecycle:Configure blob lifecycle|versioning:Configure blob versioning',
  'compute.templates':
    'interpret:Interpret ARM and Bicep|arm:Modify ARM templates|bicep:Modify Bicep files|deploy:Deploy templates|export:Export ARM or convert to Bicep',
  'compute.vms':
    'create:Create virtual machines|encryption:Configure host encryption|move:Move virtual machines|sizes:Manage VM sizes|disks:Manage VM disks|availability:Deploy availability zones and sets|scalesets:Configure scale sets',
  'compute.containers':
    'registry:Manage container registries|instances:Provision Container Instances|apps:Provision Container Apps|scaling:Manage container sizing and scaling',
  'compute.apps':
    'plan:Provision App Service plans|scaling:Configure plan scaling|create:Create App Service|tls:Configure certificates and TLS|dns:Map custom DNS|backup:Configure backups|networking:Configure networking|slots:Configure deployment slots',
  'networking.networks':
    'create:Configure networks and subnets|peering:Configure peering|public-ip:Configure public IPs|routes:Configure routes|troubleshoot:Troubleshoot connectivity',
  'networking.security':
    'groups:Configure NSGs and ASGs|effective:Evaluate effective security rules|bastion:Implement Bastion|service-endpoints:Configure service endpoints|private-endpoints:Configure private endpoints',
  'networking.dns':
    'dns:Configure Azure DNS|balancer:Configure load balancers|troubleshoot:Troubleshoot load balancing',
  'monitoring.monitor':
    'metrics:Interpret metrics|logs:Configure log settings|queries:Query and analyze logs|alerts:Configure alerts and action groups|insights:Configure Monitor Insights|watcher:Use Network Watcher and Connection monitor',
  'monitoring.backup':
    'recovery-vault:Create Recovery Services vaults|backup-vault:Create Backup vaults|policy:Configure backup policies|restore:Perform backup and restore|site-recovery:Configure Site Recovery|failover:Perform regional failover|reports:Interpret backup reports and alerts',
};
export const skills = Object.entries(skillGroups).flatMap(([objectiveId, entries]) =>
  entries.split('|').map((entry) => {
    const [id, title] = entry.split(':');
    return { id: `${objectiveId}.${id}`, title, objectiveId, domainId: objectiveId.split('.')[0] };
  }),
);
