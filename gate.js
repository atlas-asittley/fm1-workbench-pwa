// Sign-in curtain for fm1-workbench-pwa (NOT part of M-VAVE's build).
// Hides the workbench until Drew (or the Atlas service account) signs in with the same Supabase
// email + password as his other private pages; public.is_owner() decides who is allowed.
// It is a curtain, not security: the app file itself is public on GitHub.
// Offline: once a sign-in has been confirmed on this device, the app opens without the network;
// the check is repeated whenever the network is reachable.
(function () {
  'use strict';
  var URL_ = 'https://igaulapupbtdcqqjobhs.supabase.co';
  var KEY = 'sb_publishable_7yi3BNg-J-K5nralw5JSww_c71Pge6e';
  var FLAG = 'fm1-gate-ok';
  var root = document.documentElement;
  root.classList.add('fm1-locked');
  var css = document.createElement('style');
  css.textContent =
    'html.fm1-locked body>*:not(#fm1-gate){visibility:hidden!important}' +
    '#fm1-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
    'background:#121518;color:#e2e7e9;font:16px/1.5 system-ui,sans-serif;padding:16px}' +
    'html:not(.fm1-locked) #fm1-gate{display:none}' +
    '#fm1-gate form{width:100%;max-width:340px}#fm1-gate h1{font-size:22px;margin:0 0 4px}' +
    '#fm1-gate p{color:#99a7a8;font-size:14px;margin:0 0 14px}' +
    '#fm1-gate input{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;font:inherit;' +
    'background:#1d2326;color:#e2e7e9;border:1px solid #465150;border-radius:7px}' +
    '#fm1-gate button{width:100%;padding:11px;font:inherit;font-weight:650;border:0;border-radius:7px;background:#aae4c8;color:#172e24}' +
    '#fm1-gate .msg{min-height:1.5em;color:#f0a8a0;font-size:14px;margin-top:8px}';
  (document.head || root).appendChild(css);

  var flag = function (v) { try { if (v === undefined) return localStorage.getItem(FLAG) === '1'; if (v) localStorage.setItem(FLAG, '1'); else localStorage.removeItem(FLAG); } catch (_) {} return false; };
  var unlock = function () { root.classList.remove('fm1-locked'); };
  var lock = function () { flag(false); root.classList.add('fm1-locked'); };
  var sb = window.supabase && window.supabase.createClient(URL_, KEY);

  function say(t) { var m = document.getElementById('fm1-gate-msg'); if (m) m.textContent = t || ''; }

  // true = allowed, false = definitely not, null = couldn't tell (offline / network error)
  async function check() {
    if (!sb) return null;
    try {
      var r = await sb.auth.getSession();
      if (r.error) return null;
      if (!r.data.session) return false;
      var o = await sb.rpc('is_owner');
      if (o.error) return null;
      return o.data === true;
    } catch (_) { return null; }
  }

  async function decide() {
    if (flag()) unlock();               // confirmed before on this device: open at once, verify quietly
    if (!navigator.onLine && flag()) return;
    var ok = await check();
    if (ok === true) { flag(true); unlock(); }
    else if (ok === false) { lock(); if (sb) sb.auth.signOut({ scope: 'local' }).catch(function () {}); }
    else if (!flag()) say('Connect to the internet to sign in the first time.');
  }

  function build() {
    var g = document.createElement('div');
    g.id = 'fm1-gate';
    g.innerHTML = '<form autocomplete="on"><h1>FM1 Workbench</h1><p>Private. Sign in with your Atlas pages account.</p>' +
      '<input id="fm1-em" type="email" autocomplete="username" inputmode="email" placeholder="Email" aria-label="Email">' +
      '<input id="fm1-pw" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password">' +
      '<button type="submit">Sign in</button><div class="msg" id="fm1-gate-msg" role="status"></div></form>';
    document.body.appendChild(g);
    try { document.getElementById('fm1-em').value = localStorage.getItem('songbook:email') || ''; } catch (_) {}
    g.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = g.querySelector('button'), email = document.getElementById('fm1-em').value.trim().toLowerCase(),
        pw = document.getElementById('fm1-pw').value;
      if (!email || !pw) return say('Email and password, please.');
      if (!sb) return say('Sign-in code did not load. Reload while online.');
      btn.disabled = true; btn.textContent = 'Signing in…'; say('');
      try {
        var r = await sb.auth.signInWithPassword({ email: email, password: pw });
        if (r.error) return say(r.error.message);
        try { localStorage.setItem('songbook:email', email); } catch (_) {}
        var ok = await check();
        if (ok === true) { flag(true); unlock(); document.getElementById('fm1-pw').value = ''; }
        else { say(ok === false ? 'This account is not allowed here.' : 'Could not confirm the sign-in. Try again.'); sb.auth.signOut({ scope: 'local' }).catch(function () {}); }
      } catch (err) { say('Sign-in failed: ' + (err && err.message || err)); }
      finally { btn.disabled = false; btn.textContent = 'Sign in'; }
    });
    decide();
    addEventListener('online', decide);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
