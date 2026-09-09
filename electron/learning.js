import { skills, objectives, domains } from '../content/catalog.js';
export const evidenceVersion = 'evidence-v1';
export const DAY = 86400000;
const accuracy = (items) => ({
  correct: items.filter((x) => x.correct).length,
  total: items.length,
});
const rate = (items) => (items.length ? accuracy(items).correct / items.length : null);
export function learning(evidence, bank, now) {
  const valid = evidence
    .filter((e) => !e.excluded)
    .sort((a, b) => a.at.localeCompare(b.at) || a.key.localeCompare(b.key));
  const families = {};
  for (const e of valid) {
    const f = (families[e.familyId] ??= {
      first: e,
      latest: e,
      interval: 0,
      due: null,
      lastQualified: null,
    });
    f.latest = e;
    if (!e.correct) {
      f.interval = 0;
      f.due = Date.parse(e.at) + DAY;
      f.lastQualified = Date.parse(e.at);
    } else if (
      e.assistance === 'none' &&
      (f.lastQualified === null || Date.parse(e.at) - f.lastQualified >= DAY)
    ) {
      f.interval = Math.min(f.interval + 1, 4);
      f.due = Date.parse(e.at) + [0, 3, 7, 14, 30][f.interval] * DAY;
      f.lastQualified = Date.parse(e.at);
    }
  }
  function summarize(id, title, field) {
    const rows = valid.filter((e) => e[field] === id);
    const localFamilies = {};
    for (const e of rows) localFamilies[e.familyId] = { ...families[e.familyId], latest: e };
    const fs = Object.values(localFamilies);
    const recent = fs
      .map((f) => f.latest)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 10);
    const first = Object.values(families)
      .map((f) => f.first)
      .filter((e) => e[field] === id)
      .sort((a, b) => a.at.localeCompare(b.at));
    const independent = first.filter((e) => e.assistance === 'none' && !e.priorExposure);
    let state = rows.length
      ? fs.length < 3
        ? 'Insufficient evidence'
        : 'Evidence collected'
      : 'Unpracticed';
    if (fs.length >= 3 && rate(recent) < 0.7) state = 'Needs review';
    else if (
      independent.length >= 10 &&
      rate(independent.slice(-5)) - rate(independent.slice(-10, -5)) >= 0.2
    )
      state = 'Improving';
    const dueDates = fs.filter((f) => f.due).map((f) => f.due);
    return {
      id,
      title,
      state,
      accuracy: accuracy(rows),
      first: accuracy(first),
      unassisted: accuracy(independent),
      unknown: accuracy(first.filter((e) => e.assistance === 'unknown')),
      assisted: accuracy(rows.filter((e) => e.assistance === 'seen')),
      repeated: accuracy(
        rows.filter((e) => e.priorExposure || families[e.familyId].first.key !== e.key),
      ),
      recent: accuracy(recent),
      distinctQuestions: new Set(rows.map((e) => e.questionId)).size,
      distinctFamilies: fs.length,
      lastPracticed: rows.at(-1)?.at ?? null,
      due: dueDates.length ? Math.min(...dueDates) : null,
      dueCount: fs.filter((f) => f.due && f.due <= now).length,
      excluded: evidence.filter((e) => e.excluded && e[field] === id).length,
      bankCount: bank.filter((q) => q[field] === id).length,
      trend: recent
        .slice()
        .reverse()
        .map((e) => ({ at: e.at, correct: e.correct, mode: e.mode })),
    };
  }
  return {
    version: evidenceVersion,
    families,
    skills: skills.map((s) => ({
      ...summarize(s.id, s.title, 'primarySkillId'),
      objectiveId: s.objectiveId,
      domainId: s.domainId,
    })),
    objectives: objectives.map((o) => ({
      ...summarize(o.id, o.title, 'objectiveId'),
      domainId: o.domainId,
    })),
    domains: domains.map((d) => summarize(d.id, d.title, 'domainId')),
  };
}
