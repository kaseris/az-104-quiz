import { blueprint, domains, objectives, skills } from '../content/catalog.js';

export function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateBank(bank) {
  ensure(Array.isArray(bank) && bank.length > 0, 'The question bank is empty.');
  const ids = new Set();
  for (const q of bank) {
    ensure(typeof q.id === 'string' && !ids.has(q.id), 'Duplicate or missing question ID.');
    ids.add(q.id);
    ensure(Number.isInteger(q.version) && q.version > 0, `${q.id}: invalid version.`);
    ensure(q.blueprintVersion === blueprint.version, `${q.id}: wrong blueprint.`);
    ensure(
      domains.some((d) => d.id === q.domainId),
      `${q.id}: unknown domain.`,
    );
    ensure(
      objectives.some((o) => o.id === q.objectiveId && o.domainId === q.domainId),
      `${q.id}: unknown objective.`,
    );
    if (q.primarySkillId !== undefined) {
      ensure(
        skills.some((s) => s.id === q.primarySkillId && s.objectiveId === q.objectiveId),
        `${q.id}: invalid primary skill.`,
      );
      ensure(typeof q.familyId === 'string' && q.familyId.length > 0, `${q.id}: missing family.`);
      ensure(
        Array.isArray(q.relatedSkillIds) &&
          new Set(q.relatedSkillIds).size === q.relatedSkillIds.length &&
          q.relatedSkillIds.every(
            (id) => id !== q.primarySkillId && skills.some((s) => s.id === id),
          ),
        `${q.id}: invalid related skills.`,
      );
    }
    if (q.correctsVersions !== undefined)
      ensure(
        Array.isArray(q.correctsVersions) &&
          q.correctsVersions.every((v) => Number.isInteger(v) && v > 0 && v < q.version),
        `${q.id}: invalid correction versions.`,
      );
    for (const field of ['title', 'prompt', 'explanation', 'reviewedAt'])
      ensure(typeof q[field] === 'string' && q[field].trim(), `${q.id}: missing ${field}.`);
    ensure(['single', 'multiple'].includes(q.type), `${q.id}: invalid type.`);
    ensure(Array.isArray(q.options) && q.options.length >= 2, `${q.id}: too few options.`);
    const optionIds = q.options.map((o) => o.id);
    ensure(new Set(optionIds).size === optionIds.length, `${q.id}: duplicate options.`);
    ensure(
      q.options.every((o) => typeof o.id === 'string' && o.text && o.rationale),
      `${q.id}: incomplete option.`,
    );
    ensure(
      Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0,
      `${q.id}: no answer.`,
    );
    ensure(
      new Set(q.correctOptionIds).size === q.correctOptionIds.length &&
        q.correctOptionIds.every((id) => optionIds.includes(id)),
      `${q.id}: invalid answers.`,
    );
    ensure(
      q.type === 'single' ? q.correctOptionIds.length === 1 : q.correctOptionIds.length > 1,
      `${q.id}: answer count mismatch.`,
    );
    if (q.source?.kind === 'ai-generated') {
      ensure(
        q.source.jobId &&
          q.source.model &&
          q.source.reviewModel &&
          q.source.promptVersion &&
          q.source.reviewBasis === 'automated' &&
          q.source.evidence?.length,
        `${q.id}: missing AI provenance.`,
      );
      ensure(q.selectionCount === q.correctOptionIds.length, `${q.id}: answer count mismatch.`);
    } else {
      ensure(
        q.source?.kind === 'adapted-public' &&
          q.source.license === 'MIT' &&
          /^[a-f0-9]{40}$/.test(q.source.revision),
        `${q.id}: missing provenance.`,
      );
      ensure(
        q.source.url.includes(q.source.revision) &&
          q.source.author &&
          q.source.section &&
          q.source.changes,
        `${q.id}: incomplete provenance.`,
      );
    }
    ensure(
      q.references?.length &&
        q.references.every(
          (r) => r.title && new URL(r.url).origin === 'https://learn.microsoft.com',
        ),
      `${q.id}: missing official reference.`,
    );
  }
}

export function validateSelection(question, selected, allowEmpty = false) {
  ensure(Array.isArray(selected), 'Select an answer.');
  ensure(selected.length <= question.options.length, 'Too many answers.');
  ensure(new Set(selected).size === selected.length, 'Duplicate answer IDs.');
  ensure(
    selected.every((id) => typeof id === 'string' && question.options.some((o) => o.id === id)),
    'Unknown answer option.',
  );
  ensure(allowEmpty || selected.length > 0, 'Select an answer before submitting.');
  ensure(question.type !== 'single' || selected.length <= 1, 'This question accepts one answer.');
}
export const sameSelection = (a, b) => a.length === b.length && a.every((id) => b.includes(id));
export function validateDuration(value) {
  ensure(Number.isInteger(value) && value >= 0 && value <= 604800000, 'Invalid answer duration.');
}
