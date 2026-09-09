import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { batch1Labs } from '../content/labs-batch1.js';

const bullets = (items) => items.map((item) => `- ${item}`).join('\n');
const block = (text) => {
  if (text.startsWith('{')) return `\n\`\`\`json\n${text}\n\`\`\`\n`;
  if (text.startsWith('az ') || text.startsWith('#')) return `\n\`\`\`bash\n${text}\n\`\`\`\n`;
  return text;
};
export function renderGuide(lab) {
  return (
    [
      `# ${lab.title}`,
      `Definition: ${lab.id}, version ${lab.version}. **${lab.status}; Azure walkthroughs pending.** Documentation reviewed ${lab.provenance.reviewedAt}.`,
      'Generated from the catalog by `node scripts/lab-guides.mjs`. Record results in [the batch verification log](STAGE6_BATCH1_VERIFICATION.md). Use a fresh group/account for each method. Run commands yourself, one block at a time; stop on any error.',
      '## Goal',
      lab.goal,
      `Skill: ${lab.primarySkillId}.`,
      '## Preflight',
      bullets(lab.prerequisites),
      bullets(lab.requiredRoles.map((r) => `${r.role}: ${r.scope}`)),
      bullets(lab.selection),
      `Estimated duration: ${lab.duration.minMinutes}–${lab.duration.maxMinutes} minutes. ${lab.duration.setupNote}`,
      '## Resources',
      bullets(lab.resources.map((r) => `${r.type}: ${r.name}. ${r.purpose}`)),
      '## Costs',
      lab.costs.estimate,
      bullets(lab.costs.restrictions),
      '## Expected results',
      bullets(lab.expectedResults),
      '## Progressive hints',
      ...lab.hints.map(
        (hint, i) => `<details><summary>Hint ${i + 1}</summary>\n\n${hint}\n\n</details>`,
      ),
      ...['portal', 'cli'].flatMap((method) => [
        `## ${method === 'portal' ? 'Azure Portal' : 'Azure CLI (Bash)'}`,
        ...lab.methods[method].walkthrough.map((step, i) => `### Step ${i + 1}\n\n${block(step)}`),
        '### Verify',
        ...lab.methods[method].verification.map(block),
        '### Cleanup',
        ...lab.cleanup[method].map(block),
        lab.cleanup.verification,
        lab.cleanup.keepResources,
      ]),
      '## Evidence checklist',
      bullets(lab.evidenceChecklist.map((s) => `[ ] ${s}`)),
      '## Reflection',
      lab.reflection.prompt,
      `<details><summary>Compare your answer</summary>\n\n${lab.reflection.expectedAnswer}\n\n</details>`,
      '## Troubleshooting',
      ...lab.troubleshooting.map((t) => `**${t.kind}: ${t.symptom}** ${t.action}`),
      '## Sources',
      lab.provenance.notice,
      bullets(
        [...lab.sources, ...lab.costs.sources].map(
          (s) => `[${s.title}](${s.url}) — ${s.publisher}, reviewed ${s.reviewedAt}.`,
        ),
      ),
    ].join('\n\n') + '\n'
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const lab of batch1Labs)
    writeFileSync(new URL(`../docs/LAB_${lab.id}.md`, import.meta.url), renderGuide(lab));
}
