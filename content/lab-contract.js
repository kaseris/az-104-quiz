import { blueprint, domains, objectives, skills } from './catalog.js';

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const strings = (value) => Array.isArray(value) && value.length > 0 && value.every(text);
const date = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const officialURL = (value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      ['learn.microsoft.com', 'azure.microsoft.com'].includes(url.hostname)
    );
  } catch {
    return false;
  }
};
const sources = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (s) =>
      object(s) && text(s.title) && text(s.publisher) && date(s.reviewedAt) && officialURL(s.url),
  );

// Pure: validates definitions only; no mutation, network access or Azure execution.
// A recorded manual pass is editorial evidence, not independent resource verification.
export function validateLabs(catalog) {
  const require = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  require(Array.isArray(catalog) && catalog.length > 0, 'Lab catalog must be nonempty.');
  const ids = new Set();
  for (const lab of catalog) {
    require(object(lab), 'Invalid lab definition.');
    const check = (condition, message) => require(condition, `${lab.id || 'Lab'}: ${message}`);
    check(text(lab.id) && !ids.has(lab.id), 'duplicate or missing ID');
    ids.add(lab.id);
    check(
      lab.contractVersion === 1 && Number.isInteger(lab.version) && lab.version > 0,
      'invalid version',
    );
    check(lab.blueprintVersion === blueprint.version, 'invalid blueprint');
    check(
      domains.some((d) => d.id === lab.domainId),
      'invalid domain',
    );
    check(
      objectives.some((o) => o.id === lab.objectiveId && o.domainId === lab.domainId),
      'invalid objective',
    );
    check(
      skills.some((s) => s.id === lab.primarySkillId && s.objectiveId === lab.objectiveId),
      'invalid primary skill',
    );
    check(
      Array.isArray(lab.relatedSkillIds) &&
        new Set(lab.relatedSkillIds).size === lab.relatedSkillIds.length &&
        lab.relatedSkillIds.every(
          (id) => id !== lab.primarySkillId && skills.some((s) => s.id === id),
        ),
      'invalid related skills',
    );
    check(
      Array.isArray(lab.prerequisiteLabIds) &&
        new Set(lab.prerequisiteLabIds).size === lab.prerequisiteLabIds.length &&
        lab.prerequisiteLabIds.every((id) => id !== lab.id && catalog.some((l) => l?.id === id)),
      'invalid prerequisite labs',
    );
    for (const key of ['title', 'goal']) check(text(lab[key]), `missing ${key}`);
    for (const key of [
      'prerequisites',
      'selection',
      'hints',
      'expectedResults',
      'evidenceChecklist',
    ])
      check(strings(lab[key]), `missing ${key}`);
    check(lab.hints.length >= 2, 'progressive hints required');
    check(
      Array.isArray(lab.requiredRoles) &&
        lab.requiredRoles.length > 0 &&
        lab.requiredRoles.every((r) => object(r) && text(r.role) && text(r.scope)),
      'invalid roles',
    );
    check(
      object(lab.duration) &&
        Number.isInteger(lab.duration.minMinutes) &&
        lab.duration.minMinutes > 0 &&
        Number.isInteger(lab.duration.maxMinutes) &&
        lab.duration.maxMinutes >= lab.duration.minMinutes &&
        text(lab.duration.setupNote),
      'invalid duration',
    );
    check(
      object(lab.provenance) &&
        lab.provenance.kind === 'original-documentation-based' &&
        ['author', 'reviewBasis', 'notice'].every((k) => text(lab.provenance[k])) &&
        date(lab.provenance.reviewedAt),
      'invalid provenance',
    );
    check(sources(lab.sources), 'invalid sources');
    check(
      object(lab.costs) &&
        date(lab.costs.reviewedAt) &&
        text(lab.costs.estimate) &&
        strings(lab.costs.restrictions) &&
        sources(lab.costs.sources),
      'invalid costs',
    );
    check(
      Array.isArray(lab.resources) &&
        lab.resources.length > 0 &&
        lab.resources.every(
          (r) => object(r) && ['id', 'type', 'name', 'purpose'].every((k) => text(r[k])),
        ),
      'invalid resources',
    );
    const resourceIds = lab.resources.map((r) => r.id);
    check(new Set(resourceIds).size === resourceIds.length, 'duplicate resource IDs');
    check(
      object(lab.cleanup) &&
        Array.isArray(lab.cleanup.resourceIds) &&
        lab.cleanup.resourceIds.length === resourceIds.length &&
        new Set(lab.cleanup.resourceIds).size === resourceIds.length &&
        lab.cleanup.resourceIds.every((id) => resourceIds.includes(id)),
      'cleanup must cover exactly the resource manifest',
    );
    check(
      text(lab.cleanup.keepResources) && text(lab.cleanup.verification),
      'missing cleanup outcome',
    );
    check(
      object(lab.methods) && Object.keys(lab.methods).length === 2,
      'Portal and CLI methods required',
    );
    check(
      object(lab.verification) && Object.keys(lab.verification).length === 2,
      'method verification required',
    );
    check(['unreleased', 'released'].includes(lab.status), 'invalid release status');
    for (const method of ['portal', 'cli']) {
      check(
        object(lab.methods[method]) &&
          strings(lab.methods[method].walkthrough) &&
          strings(lab.methods[method].verification),
        `invalid ${method} instructions`,
      );
      check(strings(lab.cleanup[method]), `missing ${method} cleanup`);
      const record = lab.verification[method];
      check(
        object(record) && ['pending', 'failed', 'passed'].includes(record.status),
        `invalid ${method} verification`,
      );
      if (record.status !== 'pending') {
        check(
          record.labVersion === lab.version &&
            date(record.verifiedAt) &&
            ['reviewer', 'environment', 'findings', 'evidence', 'cleanupOutcome'].every((k) =>
              text(record[k]),
            ) &&
            Number.isFinite(record.elapsedMinutes) &&
            record.elapsedMinutes > 0,
          `incomplete ${method} walkthrough record`,
        );
        check(
          ['completed', 'pending'].includes(record.cleanupOutcome),
          'invalid recorded cleanup outcome',
        );
        if (method === 'cli') check(text(record.cliVersion), 'tested CLI version required');
      }
      if (lab.status === 'released')
        check(
          record.status === 'passed' && record.cleanupOutcome === 'completed',
          'release requires both walkthroughs and cleanup to pass',
        );
    }
    check(lab.methods.cli.shell === 'bash', 'CLI shell must be Bash');
    check(
      object(lab.reflection) && text(lab.reflection.prompt) && text(lab.reflection.expectedAnswer),
      'missing reflection',
    );
    check(
      Array.isArray(lab.troubleshooting) &&
        ['environment', 'conceptual'].every((kind) =>
          lab.troubleshooting.some(
            (t) => object(t) && t.kind === kind && text(t.symptom) && text(t.action),
          ),
        ),
      'failure categories required',
    );
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    require(!visiting.has(id), 'Cyclic lab prerequisites.');
    if (visited.has(id)) return;
    visiting.add(id);
    catalog.find((l) => l.id === id).prerequisiteLabIds.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  catalog.forEach((l) => visit(l.id));
  return true;
}
