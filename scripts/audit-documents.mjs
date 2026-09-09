import { writeFileSync } from 'node:fs';
import { documents, registryVersion } from '../content/documents.js';
import { fetchArticle, extractArticle } from '../electron/document-source.js';
const results = [];
for (const source of documents) {
  try {
    const response = await fetchArticle(source.url);
    const article = extractArticle(response.html, source);
    const nodes = JSON.stringify(article.sections);
    const record = {
      id: source.id,
      url: source.url,
      objectiveId: source.objectiveId,
      skillIds: source.skillIds,
      sourceUrl: article.sourceUrl,
      license: source.license,
      licenseUrl: source.licenseUrl,
      finalUrl: response.finalUrl,
      redirects: response.redirects,
      revision: article.revision,
      sourceUpdated: article.sourceUpdated,
      sections: article.sections.length,
      hasCode: nodes.includes('"tag":"pre"'),
      hasTable: nodes.includes('"tag":"table"'),
      status: 'verified',
    };
    if (
      (source.id === 'redundancy' && !record.hasTable) ||
      (source.id === 'bicep' && !record.hasCode)
    )
      throw new Error('Representative content is missing.');
    results.push(record);
    console.log(`${source.id}: ${record.sections} sections verified`);
  } catch (error) {
    results.push({ id: source.id, url: source.url, status: 'failed', error: error.message });
    process.exitCode = 1;
    console.log(`${source.id}: ${error.message}`);
  }
}
writeFileSync(
  new URL('../docs/DOCUMENT_SOURCE_AUDIT.json', import.meta.url),
  JSON.stringify({ registryVersion, checkedAt: new Date().toISOString(), results }, null, 2) + '\n',
);
