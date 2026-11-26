// Phone layout switch for fm1-workbench-pwa (NOT part of M-VAVE's build). Styling lives in phone.css.
// On a landscape phone the virtual FM-1 fills the screen; the ☰ button shows the normal page
// (projects, files, help, device update) and "Back to synth" returns.
(function () {
  'use strict';
  var root = document.documentElement;
  var small = window.matchMedia('(orientation: landscape) and (max-height: 560px)');
  var get = function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} };
  var full = false; // user chose the normal page for now

  function apply() {
    var on = small.matches && !full;
    root.classList.toggle('fm1-phone', on);
    root.classList.toggle('fm1-full', small.matches && full);
    if (on) {
      var tab = document.getElementById('tab-sim'), btn = document.getElementById('mode-sim');
      if (tab && tab.hidden && btn) btn.click();
    }
  }
  // Measure the real screen size in px. On the installed app, Chrome can report a stale 100dvh at
  // launch (before the landscape lock settles), which pushed the bottom and the keyboard off screen.
  function measure() {
    root.style.setProperty('--vh', window.innerHeight + 'px');
    root.style.setProperty('--vw', window.innerWidth + 'px');
  }
  measure();
  ['resize', 'orientationchange', 'pageshow', 'load'].forEach(function (e) { window.addEventListener(e, measure); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', measure);
  document.addEventListener('visibilitychange', measure);
  [100, 400, 1000, 2500].forEach(function (ms) { setTimeout(measure, ms); });
  function setKeys(open) {
    root.classList.toggle('fm1-kb-open', open);
    set('fm1-kb-open', open ? '1' : '0');
    var t = document.getElementById('fm1-kb-tab');
    if (t) { t.textContent = open ? 'KEYS ▼' : 'KEYS ▲'; t.setAttribute('aria-expanded', String(open)); }
  }
  // The workbench builds its encoders with script; tag them (data attributes only) once they exist.
  function tag() {
    var encs = document.querySelectorAll('#sim-device > .encoder:not([data-fm1-enc])');
    if (!encs.length) return;
    encs = document.querySelectorAll('#sim-device > .encoder');
    for (var i = 0; i < encs.length; i++) {
      encs[i].setAttribute('data-fm1-enc', i < 4 ? String(i + 1) : 'k');
      if (i >= 4) encs[i].setAttribute('data-fm1-knob', String(i - 3));
    }
  }
  function build() {
    tag();
    var dev = document.getElementById('sim-device');
    if (dev && window.MutationObserver) new MutationObserver(tag).observe(dev, { childList: true });
    var bar = document.createElement('div');
    bar.id = 'fm1-phone-bar';
    bar.innerHTML = '<button id="fm1-kb-tab" type="button" aria-label="Show or hide the keyboard"></button>' +
      '<button id="fm1-menu-btn" type="button" aria-label="Menu: show the full page">☰</button>' +
      '<button id="fm1-help-btn" type="button" aria-label="Cheat sheet">?</button>' +
      '<button id="fm1-stop-btn" type="button" aria-label="Stop everything and rewind to the start">■ STOP</button>';
    document.body.appendChild(bar);
    var back = document.createElement('button');
    back.id = 'fm1-synth-btn'; back.type = 'button'; back.textContent = 'Back to synth';
    document.body.appendChild(back);
    document.getElementById('fm1-kb-tab').addEventListener('click', function () { setKeys(!root.classList.contains('fm1-kb-open')); });
    document.getElementById('fm1-menu-btn').addEventListener('click', function () { full = true; apply(); scrollTo(0, 0); });
    back.addEventListener('click', function () { full = false; apply(); });
    var sheet = document.createElement('div');
    sheet.id = 'fm1-sheet'; sheet.hidden = true;
    sheet.innerHTML = '<div class="fm1-sheet-head"><b>Cheat sheet</b><button type="button" id="fm1-sheet-close" aria-label="Close">✕</button></div><div id="fm1-sheet-body">Loading…</div>';
    document.body.appendChild(sheet);
    var loaded = false;
    // the workbench's own "Panic / Stop all": stops the sequencer, rewinds to step 1, releases notes
    document.getElementById('fm1-stop-btn').addEventListener('click', function () {
      var b = document.getElementById('sim-panic'); if (b && !b.disabled) b.click();
    });
    document.getElementById('fm1-help-btn').addEventListener('click', function () {
      sheet.hidden = false;
      if (loaded) return;
      fetch('cheatsheet.html').then(function (r) { return r.text(); }).then(function (t) { document.getElementById('fm1-sheet-body').innerHTML = t; loaded = true; })
        .catch(function () { document.getElementById('fm1-sheet-body').textContent = 'Could not load the cheat sheet.'; });
    });
    document.getElementById('fm1-sheet-close').addEventListener('click', function () { sheet.hidden = true; });
    setKeys(get('fm1-kb-open') === '1');
    apply();
  }
  if (small.addEventListener) small.addEventListener('change', apply); else small.addListener(apply);
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
