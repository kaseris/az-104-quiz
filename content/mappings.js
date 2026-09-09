import { mappingVersion } from './catalog.js';
export const legacyMappings = {
  'identity-01@1': 'identity.governance.management-groups',
  'identity-02@1': 'identity.access.roles',
  'identity-03@1': 'identity.governance.locks',
  'identity-04@1': 'identity.users.external',
  'storage-01@1': 'storage.accounts.redundancy',
  'storage-02@1': 'storage.data.lifecycle',
  'storage-03@1': 'storage.data.blob-delete',
  'storage-04@1': 'storage.access.policies',
  'compute-01@1': 'compute.containers.instances',
  'compute-02@1': 'compute.vms.availability',
  'compute-03@1': 'compute.apps.slots',
  'compute-04@1': 'compute.vms.sizes',
  'networking-01@1': 'networking.security.groups',
  'networking-02@1': 'networking.security.private-endpoints',
  'networking-03@1': 'networking.networks.routes',
  'networking-04@1': 'networking.networks.peering',
  'monitoring-01@1': 'monitoring.monitor.queries',
  'monitoring-02@1': 'monitoring.monitor.alerts',
  'monitoring-03@1': 'monitoring.backup.restore',
  'monitoring-04@1': 'monitoring.monitor.insights',
};
export function mapping(q) {
  return {
    primarySkillId: q.primarySkillId ?? legacyMappings[`${q.id}@${q.version}`] ?? null,
    relatedSkillIds: q.relatedSkillIds ?? [],
    familyId: q.familyId ?? q.id,
    mappingVersion: q.mappingVersion ?? mappingVersion,
  };
}
