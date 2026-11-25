#!/usr/bin/env node
// Pull the newest M-VAVE FM1 Open release's offline workbench and re-wrap it as this PWA.
//
//   node tools/update.mjs            newest release on GitHub
//   node tools/update.mjs V14        a specific release tag
//   node tools/update.mjs --rewrap   no download: re-inject into the upstream file already in upstream/
//
// What it does, in order:
//   1. downloads the release's "*Workbench.html" asset and its SHA256SUMS file, and refuses to go on
//      if the checksum doesn't match;
//   2. fetches LICENSE.md and THIRD_PARTY.md from the repo at that tag;
//   3. writes index.html = the official file + two marked PWA blocks (nothing else is touched);
//   4. bumps the service-worker cache version, so installed copies drop the old cache;
//   5. updates the version line in manifest.webmanifest and pwa.json.
// Node 18+ (built-in fetch), no dependencies. Set GITHUB_TOKEN to avoid API rate limits.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'm-vave/fm1_open';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UP = join(ROOT, 'upstream');
const args = process.argv.slice(2);
const rewrap = args.includes('--rewrap');
const wantTag = args.find(a => !a.startsWith('--'));

const headers = { 'User-Agent': 'fm1-workbench-pwa-updater', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function get(url, accept) {
  const res = await fetch(url, { headers: accept ? { ...headers, Accept: accept } : headers, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}
const sha256 = buf => createHash('sha256').update(buf).digest('hex');

// ---- 1-2. fetch (or reuse) the upstream file -------------------------------------------------
let state = JSON.parse(await readFile(join(ROOT, 'pwa.json'), 'utf8').catch(() => '{}'));
let tag, assetName, html;

if (rewrap) {
  if (!state.upstream_file) throw new Error('pwa.json has no upstream_file; run without --rewrap first');
  tag = state.upstream_tag; assetName = state.upstream_file;
  html = await readFile(join(UP, assetName));
  if (sha256(html) !== state.upstream_sha256) throw new Error(`upstream/${assetName} does not match the recorded checksum`);
} else {
  const rel = await (await get(`https://api.github.com/repos/${REPO}/releases/${wantTag ? 'tags/' + wantTag : 'latest'}`)).json();
  tag = rel.tag_name;
  const asset = rel.assets.find(a => /workbench\.html$/i.test(a.name));
  if (!asset) throw new Error(`Release ${tag} has no "*Workbench.html" asset. Fall back to building it from source ` +
    `(README "Build": tools/Build-Web.ps1 -LocalPreview → build/official-web/FM1-Official-Open-Source.html).`);
  assetName = asset.name;
  console.log(`release ${tag}: ${assetName} (${asset.size} bytes)`);
  html = Buffer.from(await (await get(asset.browser_download_url, 'application/octet-stream')).arrayBuffer());

  const sums = rel.assets.find(a => /^SHA256SUMS/i.test(a.name));
  if (!sums) throw new Error(`Release ${tag} has no SHA256SUMS file; refusing to use an unverified download`);
  const sumText = await (await get(sums.browser_download_url, 'application/octet-stream')).text();
  const line = sumText.split('\n').find(l => l.trim().endsWith(assetName));
  if (!line) throw new Error(`${sums.name} does not list ${assetName}`);
  const want = line.trim().split(/\s+/)[0].toLowerCase();
  if (sha256(html) !== want) throw new Error(`checksum mismatch for ${assetName}: got ${sha256(html)}, release says ${want}`);
  console.log(`checksum OK (${want})`);

  await mkdir(UP, { recursive: true });
  for (const f of await readdir(UP)) if (/workbench\.html$|^SHA256SUMS/i.test(f) && f !== assetName && f !== sums.name) {
    console.log(`note: old upstream file upstream/${f} left in place; delete it if you no longer want it`);
  }
  await writeFile(join(UP, assetName), html);
  await writeFile(join(UP, sums.name), sumText);

  for (const f of ['LICENSE.md', 'THIRD_PARTY.md']) {
    const r = await get(`https://api.github.com/repos/${REPO}/contents/${f}?ref=${encodeURIComponent(tag)}`, 'application/vnd.github.raw');
    await writeFile(join(ROOT, f), Buffer.from(await r.arrayBuffer()));
    console.log(`copied ${f} from ${REPO}@${tag}`);
  }
}

// ---- 3. inject the PWA blocks -----------------------------------------------------------------
const sha = sha256(html);
let page = html.toString('utf8');

const HEAD_ANCHOR = /<meta name="viewport"[^>]*>\n?/;
const BODY_ANCHOR = /<\/html>\s*$/;
if (!HEAD_ANCHOR.test(page)) throw new Error('could not find the viewport <meta> to anchor the head block');
if (!BODY_ANCHOR.test(page)) throw new Error('could not find </html> to anchor the service-worker block');
if (page.includes('FM1-PWA:BEGIN')) throw new Error('upstream file already contains PWA blocks?');

const headBlock =
`<!-- FM1-PWA:BEGIN head. Added by fm1-workbench-pwa; NOT part of M-VAVE's build.
     Wrapped file: ${assetName} (FM1 Open ${tag}, sha256 ${sha})
     from https://github.com/${REPO}/releases/tag/${tag} . Everything outside the FM1-PWA blocks is that file, byte for byte. -->
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#121518">
<meta name="mobile-web-app-capable" content="yes">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<script src="vendor/supabase.min.js"></script>
<script src="gate.js"></script>
<!-- FM1-PWA:END head -->
`;
const swBlock =
`<!-- FM1-PWA:BEGIN sw. Added by fm1-workbench-pwa; NOT part of M-VAVE's build. -->
<script>
if('serviceWorker' in navigator&&window.isSecureContext){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('FM1 PWA: service worker not registered',e);});});}
</script>
<!-- FM1-PWA:END sw -->
`;
page = page.replace(HEAD_ANCHOR, m => m + headBlock).replace(BODY_ANCHOR, m => swBlock + m);
await writeFile(join(ROOT, 'index.html'), page);

// ---- 4. bump the cache version ----------------------------------------------------------------
const swPath = join(ROOT, 'sw.js');
let sw = await readFile(swPath, 'utf8');
const m = sw.match(/const CACHE_VERSION = 'fm1-wb-[^']*-r(\d+)';/);
if (!m) throw new Error('sw.js: CACHE_VERSION line not found');
const rev = Number(m[1]) + 1;
const cacheVersion = `fm1-wb-${tag}-${sha.slice(0, 8)}-r${rev}`;
sw = sw.replace(m[0], `const CACHE_VERSION = '${cacheVersion}';`);
await writeFile(swPath, sw);

// ---- 5. record state --------------------------------------------------------------------------
const manPath = join(ROOT, 'manifest.webmanifest');
const man = JSON.parse(await readFile(manPath, 'utf8'));
man.description = `Offline, installable wrap of M-VAVE's official FM1 Open ${tag} workbench (simulator + flasher).`;
await writeFile(manPath, JSON.stringify(man, null, 2) + '\n');

state = { upstream_repo: REPO, upstream_tag: tag, upstream_file: assetName, upstream_sha256: sha, cache_version: cacheVersion };
await writeFile(join(ROOT, 'pwa.json'), JSON.stringify(state, null, 2) + '\n');
console.log(`index.html rebuilt; cache version now ${cacheVersion}`);
console.log('Next: test locally (python3 -m http.server), then commit and push; installed phones pick it up on their next two launches.');
