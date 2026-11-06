// GPU-free node environment for the tools: `self` for three addons, fetch for file: URLs, quiet texture warnings.
import { readFile } from 'node:fs/promises';
globalThis.self ??= globalThis;
const netFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const s = String(u?.url ?? u);
  if (!s.startsWith('file:')) return netFetch(u, o);
  const b = await readFile(new URL(s));
  return new Response(b, { headers: { 'content-type': s.endsWith('.json') ? 'application/json' : 'application/octet-stream' } });
};
for (const k of ['warn', 'error']) { const f = console[k]; console[k] = (...a) => { if (/Couldn't load texture/.test(String(a[0]))) return; f(...a); }; }
