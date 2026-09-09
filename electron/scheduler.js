import { domains } from '../content/catalog.js';
export const schedulerVersion = 'adaptive-v1';
export const examWeights = [23, 18, 24, 20, 15];
export function allocate(count, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (count * w) / sum);
  const result = raw.map(Math.floor);
  const order = raw
    .map((v, i) => ({ i, rest: v - result[i] }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  const remaining = count - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) result[order[i].i]++;
  return result;
}
export function random(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function select({ bank, stats, config, seed, now }) {
  const rng = random(seed);
  const ranked = bank.map((q) => ({ q, tie: rng() })).sort((a, b) => a.tie - b.tie);
  const family = (q) => stats.families[q.familyId];
  const available = ranked.filter(
    ({ q }) =>
      config.repeatHeavy ||
      !family(q) ||
      now - Date.parse(family(q).latest.at) >= config.cooldownHours * 3600000,
  );
  const skillStats = Object.fromEntries(stats.skills.map((s) => [s.id, s]));
  const pool = ({ q }) => {
    const f = family(q);
    if (!f) return stats.exposedFamilies?.includes(q.familyId) ? 'review' : 'unseen';
    if (
      skillStats[q.primarySkillId]?.recent.total &&
      skillStats[q.primarySkillId].recent.correct / skillStats[q.primarySkillId].recent.total < 0.7
    )
      return 'weak';
    return f.due && f.due <= now ? 'due' : 'review';
  };
  const pools = {
    weak: available.filter(
      (x) =>
        family(x.q) &&
        skillStats[x.q.primarySkillId]?.recent.total &&
        skillStats[x.q.primarySkillId].recent.correct /
          skillStats[x.q.primarySkillId].recent.total <
          0.7,
    ),
    due: available.filter((x) => family(x.q)?.due && family(x.q).due <= now),
    unseen: available.filter((x) => !family(x.q) && !stats.exposedFamilies?.includes(x.q.familyId)),
    review: available,
  };
  pools.weak.sort((a, b) => {
    const x = skillStats[a.q.primarySkillId].recent,
      y = skillStats[b.q.primarySkillId].recent;
    return x.correct / x.total - y.correct / y.total || a.tie - b.tie;
  });
  pools.due.sort((a, b) => family(a.q).due - family(b.q).due || a.tie - b.tie);
  pools.unseen.sort(
    (a, b) =>
      (skillStats[a.q.primarySkillId]?.distinctFamilies ?? 0) -
        (skillStats[b.q.primarySkillId]?.distinctFamilies ?? 0) || a.tie - b.tie,
  );
  const chosen = [],
    used = new Set(),
    counts = { weak: 0, due: 0, unseen: 0, review: 0 };
  const labels = {
    weak: 'Recently missed',
    due: 'Due for review',
    unseen: 'Not practiced yet',
    review: 'Review practice',
  };
  const add = (x, kind, fallback = null) => {
    if (!x || used.has(x.q.familyId)) return false;
    used.add(x.q.familyId);
    chosen.push({ question: x.q, reason: labels[kind], pool: kind, fallback });
    counts[kind]++;
    return true;
  };
  const selectedDomains = config.domainIds;
  if (config.count >= selectedDomains.length)
    for (const id of selectedDomains) {
      const x = available.find((x) => x.q.domainId === id);
      if (x) add(x, pool(x), 'Domain coverage');
    }
  const quotas = allocate(config.count, [50, 30, 20]);
  ['weak', 'due', 'unseen'].forEach((kind, i) => {
    for (const x of pools[kind]) {
      if (chosen.length >= config.count || counts[kind] >= quotas[i]) break;
      add(x, kind);
    }
  });
  for (const kind of ['weak', 'due', 'unseen', 'review'])
    for (const x of pools[kind]) {
      if (chosen.length >= config.count) break;
      add(x, kind, 'Selection pool exhausted');
    }
  return {
    chosen,
    missingDomains: selectedDomains.filter((id) => !chosen.some((x) => x.question.domainId === id)),
    eligibleFamilies: new Set(available.map((x) => x.q.familyId)).size,
  };
}
export function examSelect(bank, count, seed) {
  const rng = random(seed),
    allocation = allocate(count, examWeights),
    used = new Set(),
    chosen = [],
    shortages = [];
  domains.forEach((d, i) => {
    const candidates = bank
      .filter((q) => q.domainId === d.id)
      .map((q) => ({ q, tie: rng() }))
      .sort((a, b) => a.tie - b.tie);
    let n = 0;
    for (const { q } of candidates) {
      if (n >= allocation[i]) break;
      if (used.has(q.familyId)) continue;
      used.add(q.familyId);
      chosen.push({ question: q, reason: 'Fixed exam distribution' });
      n++;
    }
    if (n < allocation[i])
      shortages.push({ domainId: d.id, required: allocation[i], available: n });
  });
  return {
    chosen: chosen.map((x) => ({ ...x, tie: rng() })).sort((a, b) => a.tie - b.tie),
    allocation,
    shortages,
  };
}
