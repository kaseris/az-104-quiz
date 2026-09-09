import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';
import ipaddr from 'ipaddr.js';

export const MAX_BYTES = 5 * 1024 * 1024;
export const hash = (s) => createHash('sha256').update(s).digest('hex');
export function approvedURL(value) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.hostname !== 'learn.microsoft.com' ||
    u.port ||
    u.username ||
    u.password ||
    !/^\/en-us\/(azure|entra)\//.test(u.pathname)
  )
    throw new Error('Only approved Microsoft Learn HTTPS articles can be retrieved.');
  u.hash = '';
  return u;
}
export function publicAddress(address) {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}
export async function safeLookup(hostname, resolver = lookup) {
  const addresses = await resolver(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error('The source resolved to a prohibited network address.');
  return addresses;
}
export async function readBody(response, limit = MAX_BYTES) {
  const encoding = (response.headers['content-encoding'] || 'identity').toLowerCase();
  const decoders = { gzip: createGunzip, deflate: createInflate, br: createBrotliDecompress };
  if (encoding !== 'identity' && !decoders[encoding]) {
    response.destroy();
    throw new Error('Unsupported source encoding.');
  }
  const stream = encoding === 'identity' ? response : response.pipe(decoders[encoding]());
  const relay = (error) => stream.destroy(error);
  if (stream !== response) response.on('error', relay);
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of stream) {
      bytes += chunk.length;
      if (bytes > limit) throw new Error('This article exceeds the 5 MiB reader limit.');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    response.removeListener('error', relay);
    stream.destroy();
    response.destroy();
  }
}
export async function fetchArticle(
  url,
  { signal, timeout = 20000, resolver = lookup, requester = request } = {},
) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, timeout);
  const aborted = new Promise((_, reject) => {
    if (controller.signal.aborted)
      reject(new Error('Retrieval cancelled or timed out. Retry when connected.'));
    else
      controller.signal.addEventListener(
        'abort',
        () => reject(new Error('Retrieval cancelled or timed out. Retry when connected.')),
        { once: true },
      );
  });
  const run = async () => {
    let current = approvedURL(url);
    const redirects = [];
    for (let i = 0; i <= 3; i++) {
      const addresses = await safeLookup(current.hostname, resolver);
      controller.signal.throwIfAborted();
      const res = await new Promise((resolve, reject) => {
        const req = requester(
          current,
          {
            signal: controller.signal,
            agent: false,
            headers: {
              Accept: 'text/html',
              'Accept-Encoding': 'gzip, br',
              'User-Agent': 'AZ104-Study-Desk/0.3',
            },
            // Pin the validated DNS result to prevent a second lookup / rebinding.
            lookup: (_host, options, callback) =>
              options.all
                ? callback(null, addresses)
                : callback(null, addresses[0].address, addresses[0].family),
          },
          resolve,
        );
        req.on('error', reject);
        req.end();
      });
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.destroy();
        if (i === 3 || !res.headers.location)
          throw new Error('The source redirected too many times. Open the original article.');
        const next = approvedURL(new URL(res.headers.location, current).href);
        redirects.push({ from: current.href, to: next.href });
        current = next;
        continue;
      }
      if (res.statusCode !== 200) {
        res.destroy();
        throw new Error(`The source returned HTTP ${res.statusCode}. Retry or open the original.`);
      }
      if (!/^text\/html(?:;|$)/i.test(res.headers['content-type'] || '')) {
        res.destroy();
        throw new Error('This source format cannot be imported. Open the original.');
      }
      if (Number(res.headers['content-length']) > MAX_BYTES) {
        res.destroy();
        throw new Error('This article exceeds the 5 MiB reader limit.');
      }
      return {
        html: await readBody(res),
        finalUrl: current.href,
        redirects,
        etag: res.headers.etag || null,
        lastModified: res.headers['last-modified'] || null,
      };
    }
  };
  try {
    return await Promise.race([run(), aborted]);
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error('Retrieval cancelled or timed out. Retry when connected.');
    if (error.code)
      throw new Error('The article could not be retrieved. Check your connection and retry.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
const attr = (n, key) => n.attrs?.find((a) => a.name === key)?.value || '';
const children = (n) => n.childNodes || [];
function find(n, predicate) {
  if (predicate(n)) return n;
  for (const c of children(n)) {
    const found = find(c, predicate);
    if (found) return found;
  }
}
const rawText = (n) => (n.nodeName === '#text' ? n.value : children(n).map(rawText).join(''));
const allowed = new Set(
  'p ul ol li table thead tbody tfoot tr th td pre code strong em b i blockquote a br hr h1 h2 h3 h4 h5 h6 dl dt dd sub sup caption'.split(
    ' ',
  ),
);
const discard = new Set(
  'script style iframe object embed form input button select textarea svg math template noscript nav footer'.split(
    ' ',
  ),
);
export function safeLink(value, base) {
  try {
    const u = new URL(value, base);
    return u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname === 'learn.microsoft.com'
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export const nodeText = (node) =>
  typeof node === 'string'
    ? node
    : (node.children || []).map(nodeText).join('') +
      (['p', 'li', 'tr', 'pre', 'br'].includes(node.tag)
        ? '\n'
        : ['td', 'th'].includes(node.tag)
          ? '\t'
          : '');
export function extractArticle(html, source) {
  if (Buffer.byteLength(html) > MAX_BYTES) throw new Error('Article exceeds the reader limit.');
  const root = parse(html);
  const meta = (key) =>
    attr(find(root, (n) => n.tagName === 'meta' && attr(n, 'name') === key) || {}, 'content');
  const sourceUrl = meta('github_feedback_content_git_url') || meta('original_content_git_url');
  const repoPattern = new RegExp(
    `^https://github\\.com/MicrosoftDocs/${source.repository}/blob/[^/]+/.+\\.(?:md|yml)$`,
    'i',
  );
  if (!repoPattern.test(sourceUrl))
    throw new Error(
      'Source-use evidence could not be verified for this article. Open the original.',
    );
  const main = find(root, (n) => n.tagName === 'main' && attr(n, 'id') === 'main');
  const article =
    main &&
    find(
      main,
      (n) =>
        n.tagName === 'div' &&
        attr(n, 'class').split(/\s+/).includes('content') &&
        !!find(n, (c) => c.tagName === 'p'),
    );
  if (!article) throw new Error('The article layout is unsupported. Open the original.');
  function clean(n, depth = 0) {
    if (depth > 80) throw new Error('Article nesting exceeds the reader limit.');
    if (n.nodeName === '#text') return [n.value.replace(/\r\n/g, '\n')];
    if (n.tagName === 'iframe')
      return [
        {
          tag: 'p',
          children: [
            { tag: 'a', href: source.url, children: ['View embedded media in original article'] },
          ],
        },
      ];
    if (
      discard.has(n.tagName) ||
      attr(n, 'aria-hidden') === 'true' ||
      n.attrs?.some((a) => a.name === 'hidden')
    )
      return [];
    if (n.tagName === 'img' || n.tagName === 'video' || n.tagName === 'audio')
      return [
        {
          tag: 'p',
          children: [
            {
              tag: 'a',
              href: source.url,
              children: [
                `View media in original: ${attr(n, 'alt') || attr(n, 'title') || 'article media'}`,
              ],
            },
          ],
        },
      ];
    const content = children(n).flatMap((c) => clean(c, depth + 1));
    if (!allowed.has(n.tagName)) return content;
    const result = { tag: n.tagName, children: content };
    if (/^h[1-6]$/.test(n.tagName)) result.anchor = attr(n, 'id');
    if (n.tagName === 'a') {
      result.href = safeLink(attr(n, 'href'), source.url);
      if (!result.href) return content;
    }
    if (['th', 'td'].includes(n.tagName)) {
      for (const key of ['colspan', 'rowspan']) {
        const value = Number(attr(n, key));
        if (value > 0 && value < 100) result[key] = value;
      }
    }
    if (n.tagName === 'ol' && /^\d{1,6}$/.test(attr(n, 'start')))
      result.start = Number(attr(n, 'start'));
    return [result];
  }
  const nodes = clean(article).filter((n) => typeof n !== 'string' || n.trim());
  const title = rawText(find(main, (n) => n.tagName === 'h1') || {}) || source.title;
  const sections = [];
  const anchors = new Map();
  const section = (heading, anchor, level) => {
    const base = anchor || `section-${hash(heading).slice(0, 12)}`;
    const count = anchors.get(base) || 0;
    anchors.set(base, count + 1);
    const stable = count ? `${base}-${count + 1}` : base;
    const s = { id: `${source.id}:${stable}`, anchor: stable, title: heading, level, nodes: [] };
    sections.push(s);
    return s;
  };
  let current = section(title, 'introduction', 1);
  for (const n of nodes) {
    if (typeof n !== 'string' && /^h[1-6]$/.test(n.tag)) {
      if (n.tag === 'h1') continue;
      current = section(nodeText(n).trim(), n.anchor, Number(n.tag[1]));
    } else current.nodes.push(n);
  }
  for (const s of sections) s.text = s.nodes.map(nodeText).join('').trim();
  if (sections.map((s) => s.text).join('').length < 80)
    throw new Error('No usable article content was found. Open the original.');
  return {
    title,
    sections,
    revision: hash(JSON.stringify({ title, sections })),
    sourceUrl,
    sourceUpdated: meta('updated_at') || meta('ms.date') || null,
    extractionVersion: 'reader-v1',
  };
}
