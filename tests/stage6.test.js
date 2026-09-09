import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labs } from '../content/labs.js';
import { validateLabs } from '../content/lab-contract.js';

// Negative cases start from unreleased drafts, independently of editorial release state.
const copy = () =>
  structuredClone(labs).map((lab) => ({
    ...lab,
    status: 'unreleased',
    verification: { portal: { status: 'pending' }, cli: { status: 'pending' } },
  }));
test('expanded catalog preserves two independent released pilots without mutation', () => {
  const snapshot = structuredClone(labs);
  assert.equal(validateLabs(labs), true);
  assert.deepEqual(labs, snapshot);
  assert.equal(labs.length, 4);
  const released = labs.filter((lab) => lab.status === 'released');
  assert.equal(released.length, 2);
  assert.deepEqual(
    released.map((l) => l.primarySkillId),
    ['identity.governance.tags', 'networking.networks.create'],
  );
  for (const lab of released) {
    assert.equal(lab.status, 'released');
    assert.deepEqual(lab.prerequisiteLabIds, []);
    assert.equal(lab.verification.portal.status, 'passed');
    assert.equal(lab.verification.portal.cleanupOutcome, 'completed');
    assert.equal(lab.verification.cli.status, 'passed');
    assert.equal(lab.verification.cli.cleanupOutcome, 'completed');
    assert.equal(lab.verification.cli.cliVersion, '2.90.0');
  }
});
test('required contract fields cannot be omitted', () => {
  for (const field of Object.keys(labs[0])) {
    const catalog = copy();
    delete catalog[0][field];
    assert.throws(() => validateLabs(catalog), Error, field);
  }
});
test('invalid nested values and references fail validation', () => {
  const cases = [
    (c) => c.push(structuredClone(c[0])),
    (c) => {
      c[0].primarySkillId = 'networking.networks.create';
    },
    (c) => {
      c[0].objectiveId = 'storage.accounts';
    },
    (c) => {
      c[0].blueprintVersion = 'old';
    },
    (c) => {
      c[0].relatedSkillIds = ['unknown'];
    },
    (c) => {
      c[0].prerequisiteLabIds = ['unknown'];
    },
    (c) => {
      c[0].prerequisiteLabIds = [c[1].id];
      c[1].prerequisiteLabIds = [c[0].id];
    },
    (c) => {
      c[0].methods.portal = null;
    },
    (c) => {
      c[0].methods.cli.shell = 'powershell';
    },
    (c) => {
      c[0].methods.cli.walkthrough = [' '];
    },
    (c) => {
      c[0].sources[0].url = 'https://learn.microsoft.com.evil.test/docs';
    },
    (c) => {
      c[0].sources[0].reviewedAt = '2026-02-30';
    },
    (c) => {
      c[0].costs.sources = [];
    },
    (c) => {
      c[0].requiredRoles[0].scope = '';
    },
    (c) => {
      c[0].duration.maxMinutes = 1;
    },
    (c) => {
      c[0].cleanup.resourceIds = [];
    },
    (c) => {
      c[1].cleanup.resourceIds[0] = 'unrelated';
    },
    (c) => {
      c[1].resources[1].id = 'group';
    },
    (c) => {
      c[0].cleanup.cli = [];
    },
    (c) => {
      c[0].troubleshooting = [];
    },
    (c) => {
      c[0].verification.portal.status = 'verified-in-azure';
    },
    (c) => {
      c[0].status = 'released';
    },
    (c) => {
      c[0].status = 'draft';
    },
  ];
  for (const mutate of cases) {
    const catalog = copy();
    mutate(catalog);
    assert.throws(() => validateLabs(catalog), Error, mutate.toString());
  }
  for (const invalid of [null, [], [null], {}]) assert.throws(() => validateLabs(invalid));
});
test('release requires complete successful manual records for the current version and both methods', () => {
  const catalog = copy();
  const lab = catalog[0];
  // Synthetic records exercise the gate only; never written to the catalog.
  for (const method of ['portal', 'cli'])
    lab.verification[method] = {
      status: 'passed',
      labVersion: 1,
      verifiedAt: '2026-09-07',
      reviewer: 'Test fixture',
      environment: 'Synthetic fixture',
      findings: 'Fixture only',
      evidence: 'Fixture only',
      cleanupOutcome: 'completed',
      elapsedMinutes: 12,
      ...(method === 'cli' ? { cliVersion: 'fixture' } : {}),
    };
  lab.status = 'released';
  assert.equal(validateLabs(catalog), true);
  for (const method of ['portal', 'cli']) {
    for (const field of Object.keys(lab.verification[method])) {
      const invalid = structuredClone(catalog);
      delete invalid[0].verification[method][field];
      assert.throws(() => validateLabs(invalid), Error, `${method}.${field}`);
    }
    for (const patch of [{ status: 'failed' }, { cleanupOutcome: 'pending' }, { labVersion: 2 }]) {
      const invalid = structuredClone(catalog);
      Object.assign(invalid[0].verification[method], patch);
      assert.throws(() => validateLabs(invalid));
    }
  }
});

// New content must never inherit the pilots' historical verification.
test('6A.3 adds two independent drafts with current sources and a release gate', () => {
  const drafts = labs.filter((l) => l.status === 'unreleased');
  assert.equal(drafts.length, 2);
  assert.deepEqual(
    drafts.map((l) => l.primarySkillId),
    ['storage.accounts.create', 'compute.templates.deploy'],
  );
  for (const lab of drafts) {
    assert.deepEqual(lab.prerequisiteLabIds, []);
    assert.deepEqual(lab.verification, {
      portal: { status: 'pending' },
      cli: { status: 'pending' },
    });
    assert.equal(lab.provenance.reviewedAt, '2026-09-08');
    assert.ok([...lab.sources, ...lab.costs.sources].every((s) => s.reviewedAt === '2026-09-08'));
    const promoted = structuredClone(labs);
    promoted.find((l) => l.id === lab.id).status = 'released';
    assert.throws(() => validateLabs(promoted), /both walkthroughs/);
  }
});
