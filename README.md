# FM1 Workbench (installable offline copy)

An installable, offline-capable PWA of **M-VAVE's official FM1 Open workbench**: the browser
simulator, editor and USB flasher for the M-VAVE FM-1 synth.

**This is an unmodified wrap of FM1 Open V14 by M-VAVE.** The app itself is M-VAVE's release asset
`FM1-Open-V14-Workbench.html`, byte for byte, with two small marked blocks added so it can be
installed and run offline. Nothing in the simulator, sound engine, firmware or flasher was changed.

- Upstream source: https://github.com/m-vave/fm1_open
- The release wrapped here: https://github.com/m-vave/fm1_open/releases/tag/V14
  (asset `FM1-Open-V14-Workbench.html`, sha256 `4b3197fdb23d9922a122b72fd11cdf9100215cc9c812de381b0888662d59e6c8`,
  checked against the release's `SHA256SUMS-V14`)
- M-VAVE's own hosted version: https://open.m-vave.com/fm1-workbench

## License

The workbench is © M-VAVE, licensed **GPLv3 with the FM1 SDK linking exception**; SDK, firmware and
third-party components carry their own terms. Both files are included here unchanged from the V14
tag: [`LICENSE.md`](LICENSE.md) and [`THIRD_PARTY.md`](THIRD_PARTY.md). The complete corresponding
source is M-VAVE's repository linked above (the workbench's About dialog also links M-VAVE's
source + SDK archive). The PWA additions listed below are released under the same GPLv3 terms.

## Exactly what was added

| File | What it is |
|---|---|
| `index.html` | The official `FM1-Open-V14-Workbench.html` plus two blocks marked `FM1-PWA:BEGIN` / `FM1-PWA:END`: one in `<head>` (manifest link, theme colour, icons, the sign-in scripts, the phone layout, a comment naming the original file and its checksum) and one before `</html>` (registers the service worker). Strip those two blocks and the file is identical to the release asset. |
| `gate.js` | A sign-in screen over the workbench: email + password against the owner's Supabase project, allowed only if `public.is_owner()` says yes. Once confirmed on a device it opens offline too, and re-checks whenever online. **It is a curtain, not security** — this repo and the app file are public. The workbench underneath is not changed. |
| `phone.css`, `phone.js` | Phone layout: on a landscape phone (height ≤ 560 px) the virtual FM-1 fills the screen with a large LCD, encoders left, knobs and buttons right, and the keyboard in a pull-up drawer (KEYS tab). ☰ shows the normal page; "Back to synth" returns. CSS over the official markup plus data attributes on the encoders; no control is added, removed or rewired. Desktop and portrait are unchanged. |
| `vendor/supabase.min.js` | supabase-js 2.45.4 (MIT, `vendor/supabase-js.LICENSE`), vendored so the sign-in code is available offline. |
| `upstream/` | The untouched release asset and M-VAVE's `SHA256SUMS-V14`, for comparison. |
| `manifest.webmanifest` | App name "FM1 Workbench", short name "FM1", standalone, landscape, colours `#121518`. |
| `sw.js` | Service worker: pre-caches `index.html`, the manifest, the icons, `gate.js`, the phone layout and supabase-js; serves them cache-first; versioned cache name (`fm1-wb-<tag>-<sha>-r<n>`) so an update replaces the old cache. |
| `icons/` | 192 px and 512 px icons, plus maskable versions. Original design (two FM operator rings and a modulated wave), not M-VAVE's logo. Drawn by `tools/make-icons.py`. |
| `tools/update.mjs` | One-command updater (below). |
| `pwa.json` | Which upstream file and version is currently wrapped. |

## What the workbench loads from the network

Nothing. The official file is fully self-contained: UI, WASM sound engine, simulator, firmware image
and sample bank are all inlined (base64). Its only `fetch()` is for assets given as a same-origin
URL, and in this build every asset is inlined, so it never runs. The audio worklet and encoder
worker are created from `data:`/`blob:` URLs. It uses system fonts only. So nothing of M-VAVE's needed
vendoring. The only network calls this wrap adds are the sign-in checks to Supabase.

Online-only bits, left alone (they are plain links that open in the browser):
- About dialog: M-VAVE's source + SDK zip on `open.m-vave.com`, and the forum `forum.m-vave.com`.
- License text: the FM-1 V15 recovery firmware page `www.m-vave.com/download`, plus license URLs.

## Updating when M-VAVE releases a new version

```sh
node tools/update.mjs          # newest release (or: node tools/update.mjs V15)
```

It downloads the release's `*Workbench.html`, refuses it unless it matches the release's
`SHA256SUMS`, refreshes `LICENSE.md`/`THIRD_PARTY.md` from that tag, rebuilds `index.html` with the
two blocks, and bumps the cache version in `sw.js`. Then test, update the version references in this
README, and commit + push. `node tools/update.mjs --rewrap` re-applies the blocks to the file already
in `upstream/` without downloading. If a release ever lacks the workbench asset, the script stops and
points at the from-source build (`tools/Build-Web.ps1 -LocalPreview` in M-VAVE's repo, Windows).

Installed copies pick up an update on the launch after the one that downloaded it (cache-first).

## Notes

- **Saves are per site.** Projects saved in the browser live in this site's storage, separate from
  `open.m-vave.com`. To move work between them, use the workbench's export and import buttons
  (Simulator: export project / voice / patch; Library tab: Export / Import project file).
- **Web MIDI** (flashing a real FM-1 over USB) needs HTTPS, which GitHub Pages provides. The
  service worker only handles same-origin GET requests and does not touch MIDI.

## Install on an Android phone

Open the site in Chrome (or Brave), then menu (⋮) → **Install app** (or **Add to Home screen**).
Open it once while online; after that it works offline.
