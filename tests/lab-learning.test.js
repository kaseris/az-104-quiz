import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendLabs } from '../electron/lab-learning.js';
import { learning } from '../electron/learning.js';
import { labs } from '../content/labs.js';
const weak = (id) => ({ id, title: id, state: 'Needs review', recent: { correct: 1, total: 3 } });
test('recommendations are deterministic, released, objective-mapped and prerequisite-aware', () => {
  const objectives = [
    weak('identity.governance'),
    weak('networking.networks'),
    weak('storage.accounts'),
  ];
  const result = recommendLabs(labs, objectives, []);
  assert.deepEqual(
    result.map((r) => r.labId),
    ['rg-tags', 'vnet-two-subnets'],
  );
  assert.match(result[0].reason, /1 of 3/);
  assert.match(result[0].reason, /objective match/);
  assert.deepEqual(recommendLabs(labs, [], []), []);
  const catalog = structuredClone(labs);
  catalog[1].prerequisiteLabIds = ['rg-tags'];
  assert.equal(recommendLabs(catalog, objectives, []).length, 1);
  assert.equal(
    recommendLabs(catalog, objectives, [
      { id: 'a', labId: 'rg-tags', status: 'completed', startedAt: '2026-09-08' },
    ]).length,
    2,
  );
});
test('recommendations reuse quiz uncertainty/exclusions and do not invent weak evidence', () => {
  const evidence = [0, 1, 2].map((n) => ({
    key: String(n),
    familyId: String(n),
    questionId: String(n),
    at: '2026-09-08',
    correct: false,
    assistance: 'none',
    priorExposure: false,
    objectiveId: 'identity.governance',
    primarySkillId: 'identity.governance.tags',
    domainId: 'identity',
  }));
  const recommend = (rows) =>
    recommendLabs(labs, learning(rows, [], Date.parse('2026-09-08')).objectives, []);
  assert.equal(recommend(evidence.slice(0, 2)).length, 0);
  assert.equal(recommend(evidence).length, 1);
  assert.equal(recommend(evidence.map((e) => ({ ...e, excluded: true }))).length, 0);
  assert.equal(recommend(evidence.map((e) => ({ ...e, correct: true }))).length, 0);
});
test('resume suggestions separate access problems and completion from quiz weakness', () => {
  const attempts = [
    { id: 'old', labId: 'rg-tags', status: 'completed', startedAt: '2026-09-07' },
    {
      id: 'new',
      labId: 'rg-tags',
      status: 'paused',
      startedAt: '2026-09-08',
      problemKind: 'environment',
    },
  ];
  const result = recommendLabs(labs, [weak('identity.governance')], attempts)[0];
  assert.equal(result.attemptId, 'new');
  assert.match(result.context, /does not count as a conceptual mistake/);
  assert.equal(recommendLabs(labs, [], attempts).length, 0);
});
