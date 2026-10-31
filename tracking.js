/* =====================================================================
   ivia solutions — analytics, ad tracking & measurement (every page)

   HOW TO TURN TRACKING ON
   1. Paste your IDs between the quotes below.
   2. Commit the file. Every page picks it up automatically.
   Leave an ID empty ('') to keep that tag switched off.

   HOW TO CHECK IT WORKS
   Open any page with ?debug_tracking=1 on the end of the address, e.g.
   https://www.iviasolutions.in/?debug_tracking=1
   A panel appears bottom-left listing every event as it fires and which
   tools received it. It stays on while you browse; ?debug_tracking=0
   switches it off.
   ===================================================================== */
var IVIA_TRACKING = {
  GA4_ID:        'G-GDV2GVXPKS',   // Google Analytics 4 measurement ID, looks like 'G-ABC123XYZ9'
  META_PIXEL_ID: '1299160462262289',   // Meta (Facebook & Instagram) Pixel ID, 15–16 digits
  CLARITY_ID:    'vr3gfchndq',   // Microsoft Clarity project ID, about 10 letters/numbers
  GOOGLE_ADS_ID: '',   // Optional: Google Ads tag ID, looks like 'AW-123456789'
  GOOGLE_ADS_LEAD_LABEL: '', // Optional: label of your Google Ads "lead" conversion, e.g. 'AbC-D_efGhIjKlMn'
  GTM_ID:        ''    // Optional: Google Tag Manager container, 'GTM-XXXXXXX' (only if you use GTM)
};

/* ---------- nothing below this line needs editing ---------- */
(function () {
  // clean address bar: /bidvista.html -> /bidvista (live site); local file previews keep working
  try {
    if (location.protocol === 'file:') {
      document.addEventListener('DOMContentLoaded', function () {
        [].forEach.call(document.querySelectorAll('a[href]'), function (a) {
          var h = a.getAttribute('href'), m = h.match(/^(\.\/|[a-z0-9-]+)([?#].*)?$/);
          if (m) a.setAttribute('href', (m[1] === './' ? 'index' : m[1]) + '.html' + (m[2] || ''));
        });
      });
    } else if (/\.html$/.test(location.pathname) && !/404\.html$/.test(location.pathname)) {
      history.replaceState(null, '', location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '') + location.search + location.hash);
    }
  } catch (e) {}
})();
(function () {
  var T = IVIA_TRACKING, s = document.currentScript, W = window, D = document;
  var page = (s && s.getAttribute('data-page')) || D.title;
  function id(v) { return (v || '').replace(/\s+/g, ''); }
  var GA = id(T.GA4_ID), ADS = id(T.GOOGLE_ADS_ID), LBL = id(T.GOOGLE_ADS_LEAD_LABEL), PX = id(T.META_PIXEL_ID), CL = id(T.CLARITY_ID), GTM = id(T.GTM_ID);
  function store(kind) { try { return W[kind]; } catch (e) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  function get(st, k) { try { return st ? st.getItem(k) : null; } catch (e) { return null; } }
  function put(st, k, v) { try { st && st.setItem(k, v); } catch (e) {} }
  function jget(st, k) { try { return JSON.parse(get(st, k) || 'null'); } catch (e) { return null; } }

  /* ---------------- attribution: where did this visitor come from? ---------------- */
  var q = {}; try { new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; }); } catch (e) {}
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'];
  var touch = {}, hasNew = false;
  KEYS.forEach(function (k) { if (q[k]) { touch[k] = String(q[k]).slice(0, 120); hasNew = true; } });
  var ref = D.referrer && D.referrer.indexOf(location.host) < 0 ? D.referrer.slice(0, 200) : '';
  if (!hasNew && ref) { touch.utm_source = (ref.match(/^https?:\/\/([^/]+)/) || [])[1] || 'referral'; touch.utm_medium = /google\.|bing\.|duckduckgo|yahoo\./.test(ref) ? 'organic' : 'referral'; hasNew = true; }
  var now = new Date().toISOString();
  var lastT = jget(SS, 'iv_lt');
  if (hasNew || !lastT) { lastT = Object.assign({ landing_page: location.pathname, referrer: ref, at: now }, touch); if (!hasNew) lastT.utm_source = '(direct)'; put(SS, 'iv_lt', JSON.stringify(lastT)); }
  var firstT = jget(LS, 'iv_ft');
  if (!firstT) { firstT = lastT; put(LS, 'iv_ft', JSON.stringify(firstT)); }
  var pv = (+get(SS, 'iv_pv') || 0) + 1; put(SS, 'iv_pv', pv);
  /** Everything we know about how this visitor arrived — attached to every lead. */
  W.ivAttribution = function () {
    var o = {};
    Object.keys(lastT || {}).forEach(function (k) { o[k] = lastT[k]; });
    Object.keys(firstT || {}).forEach(function (k) { o['first_' + k] = firstT[k]; });
    o.pages_viewed = pv; o.lead_page = location.pathname;
    return o;
  };

  /* ---------------- tags ---------------- */
  W.dataLayer = W.dataLayer || [];
  if (GTM) {
    W.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var gt = D.createElement('script'); gt.async = true; gt.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM; D.head.appendChild(gt);
  }
  if (GA || ADS) {
    W.gtag = function () { W.dataLayer.push(arguments); };
    gtag('js', new Date());
    var g = D.createElement('script'); g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + (GA || ADS);
    D.head.appendChild(g);
    var gc = { page_title: page }; if (get(SS, 'iv_debug') === '1' || /[?&]debug_tracking=1/.test(location.search)) gc.traffic_type = 'internal';
    if (GA) gtag('config', GA, gc);
    if (ADS) gtag('config', ADS);
  }
  if (CL) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(W, D, 'clarity', 'script', CL);
    try { clarity('set', 'page', page); if (lastT.utm_source) clarity('set', 'utm_source', lastT.utm_source); if (lastT.utm_campaign) clarity('set', 'utm_campaign', lastT.utm_campaign); } catch (e) {}
  }
  if (PX) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(W, D, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PX);
    fbq('track', 'PageView');
  }

  /* ---------------- one function sends an event everywhere ---------------- */
  // Meta gets standard events where one fits, custom events for the rest.
  var META_STD = { generate_lead: 'Lead', contact_click: 'Contact', view_service: 'ViewContent', page_content: 'ViewContent', bidvista_waitlist: 'CompleteRegistration' };
  var META_CUSTOM = { chat_open: 1, chat_message: 1, chat_lead: 1, calculator_use: 1, cta_click: 1, form_start: 1, article_read: 1 };
  var log = [];
  function ivTrack(name, params) {
    params = params || {};
    var sent = [];
    try { W.dataLayer.push(Object.assign({ event: name }, params)); if (GTM) sent.push('GTM'); } catch (e) {}
    if (GA && name !== 'page_content' && typeof W.gtag === 'function') { try { gtag('event', name, params); sent.push('GA4'); } catch (e) {} }
    if (ADS && LBL && name === 'generate_lead' && typeof W.gtag === 'function') { try { gtag('event', 'conversion', { send_to: ADS + '/' + LBL }); sent.push('Ads'); } catch (e) {} }
    if (PX && typeof W.fbq === 'function') {
      try {
        var mp = { content_name: params.method || params.label || params.service || params.calculator || page };
        if (META_STD[name]) { fbq('track', META_STD[name], mp); sent.push('Meta:' + META_STD[name]); }
        else if (META_CUSTOM[name]) { fbq('trackCustom', name, mp); sent.push('Meta'); }
      } catch (e) {}
    }
    if (CL && typeof W.clarity === 'function') { try { clarity('event', name); sent.push('Clarity'); } catch (e) {} }
    log.push({ t: new Date(), name: name, params: params, sent: sent });
    if (dbg) dbgAdd(log[log.length - 1]);
    return sent;
  }
  W.ivTrack = ivTrack;
  ivTrack('page_content', { page: page, label: page });

  /* ---------------- debug panel (?debug_tracking=1) ---------------- */
  if (q.debug_tracking === '1') put(SS, 'iv_debug', '1');
  if (q.debug_tracking === '0') { try { SS && SS.removeItem('iv_debug'); } catch (e) {} }
  var dbg = get(SS, 'iv_debug') === '1', dbgList = null;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dbgAdd(e) {
    if (!dbgList) return;
    var p = Object.keys(e.params).filter(function (k) { return e.params[k] !== undefined && e.params[k] !== ''; }).map(function (k) { return k + '=' + esc(String(e.params[k]).slice(0, 40)); }).join(' · ');
    var li = D.createElement('li');
    li.innerHTML = '<b>' + esc(e.name) + '</b><span class="s">' + (e.sent.length ? esc(e.sent.join(' ')) : 'no IDs set — logged only') + '</span>' + (p ? '<small>' + p + '</small>' : '');
    dbgList.insertBefore(li, dbgList.firstChild);
    var c = D.getElementById('ivdbg-n'); if (c) c.textContent = log.length;
  }
  function dbgPanel() {
    var st = D.createElement('style');
    st.textContent = '#ivdbg{position:fixed;left:12px;bottom:12px;z-index:2147483000;width:340px;max-height:46vh;display:flex;flex-direction:column;background:#0b0b0c;color:#efebe4;border:1px solid #ff5a1f;border-radius:14px;font:12px/1.4 ui-monospace,Menlo,monospace;box-shadow:0 20px 60px rgba(0,0,0,.6)}#ivdbg header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #2a2826;background:#ff5a1f;color:#0a0a0b;border-radius:13px 13px 0 0;font-weight:700}#ivdbg header button{font:inherit;background:#0a0a0b;color:#efebe4;border:0;border-radius:6px;padding:3px 8px;cursor:pointer}#ivdbg .ids{padding:8px 12px;border-bottom:1px solid #2a2826;color:#8f8a82}#ivdbg .ids b{color:#efebe4}#ivdbg ul{list-style:none;margin:0;padding:6px 0;overflow:auto}#ivdbg li{padding:6px 12px;border-bottom:1px solid #1a1918}#ivdbg li b{color:#ff9a6b}#ivdbg li .s{float:right;color:#9be39b}#ivdbg li small{display:block;color:#8f8a82;word-break:break-all}#ivdbg.min ul,#ivdbg.min .ids{display:none}';
    D.head.appendChild(st);
    var box = D.createElement('div'); box.id = 'ivdbg';
    var on = function (v, n) { return n + ': <b>' + (v ? 'ON' : 'off') + '</b>'; };
    box.innerHTML = '<header><span>Tracking debug · <span id="ivdbg-n">0</span> events</span><span><button id="ivdbg-m">–</button> <button id="ivdbg-x">off</button></span></header><div class="ids">' +
      [on(GA, 'GA4'), on(PX, 'Meta'), on(CL, 'Clarity'), on(ADS, 'Ads'), on(GTM, 'GTM')].join(' · ') + '<br>Source: <b>' + esc((lastT.utm_source || '') + ' / ' + (lastT.utm_medium || '')) + '</b> · first: <b>' + esc(firstT.utm_source || '') + '</b></div><ul></ul>';
    D.body.appendChild(box); dbgList = box.querySelector('ul');
    log.forEach(dbgAdd);
    D.getElementById('ivdbg-m').onclick = function () { box.classList.toggle('min'); };
    D.getElementById('ivdbg-x').onclick = function () { try { SS.removeItem('iv_debug'); } catch (e) {} box.remove(); dbg = false; };
  }
  if (dbg) { if (D.body) dbgPanel(); else D.addEventListener('DOMContentLoaded', dbgPanel); }

  /* ---------------- automatic events ---------------- */
  function txt(el) { return ((el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').replace(/[↗→←↓]/g, '').trim()).slice(0, 60); }
  function where(el) { var s = el.closest('section,footer,nav,#overlay,#mega,#ivc'); return s ? (s.id || (s.className && String(s.className).split(' ')[0]) || s.tagName.toLowerCase()) : 'page'; }
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href],button[data-track]');
    if (!a) return;
    var h = a.getAttribute('href') || '', loc = where(a);
    if (a.dataset.track) ivTrack(a.dataset.track, { label: txt(a), location: loc });
    if (h.indexOf('mailto:') === 0) ivTrack('contact_click', { method: 'email', location: loc });
    else if (h.indexOf('tel:') === 0) ivTrack('contact_click', { method: 'phone', location: loc });
    else if (/wa\.me\/|api\.whatsapp\.com/.test(h)) ivTrack('contact_click', { method: 'whatsapp', location: loc });
    else if (h.indexOf('fiverr.com') > -1) ivTrack('contact_click', { method: 'fiverr', location: loc });
    else if (/^https?:/.test(h) && a.host && a.host !== location.host) ivTrack('outbound_click', { url: h.slice(0, 100), location: loc });
    if (a.classList.contains('btn') || a.classList.contains('mg-bv') || a.classList.contains('ivc-go')) ivTrack('cta_click', { label: txt(a), destination: h.slice(0, 80), location: loc });
  }, true);
  // scroll depth 25/50/75/90
  var marks = [25, 50, 75, 90], hit = {};
  function onScroll() {
    var h = D.documentElement, max = h.scrollHeight - innerHeight; if (max < 200) return;
    var p = (W.scrollY || h.scrollTop) / max * 100;
    marks.forEach(function (m) { if (p >= m && !hit[m]) { hit[m] = 1; ivTrack('scroll_depth', { percent: m }); } });
  }
  addEventListener('scroll', function () { clearTimeout(onScroll.t); onScroll.t = setTimeout(onScroll, 150); }, { passive: true });
  D.addEventListener('DOMContentLoaded', function () {
    var body = D.body;
    if (body.dataset.service) ivTrack('view_service', { service: body.dataset.service });
    // first interaction with any form
    D.addEventListener('focusin', function (e) {
      var f = e.target.closest && e.target.closest('form'); if (!f || f.dataset.started) return;
      f.dataset.started = 1; ivTrack('form_start', { form_id: f.id || f.dataset.form || 'form', method: f.dataset.form || f.id });
    });
    // FAQ opens
    D.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.qa button'); if (!b) return;
      if (b.getAttribute('aria-expanded') !== 'true') ivTrack('faq_open', { question: txt(b) });
    }, true);
    // blog filter
    D.addEventListener('click', function (e) { var f = e.target.closest && e.target.closest('.filter'); if (f) ivTrack('blog_filter', { category: f.dataset.cat }); });
    // article read to the end
    var prose = D.querySelector('.art-hero') && D.querySelector('.prose');
    if (prose && 'IntersectionObserver' in W) {
      var end = D.createElement('div'); end.style.height = '1px'; prose.appendChild(end);
      var t0 = Date.now();
      new IntersectionObserver(function (es, o) { es.forEach(function (en) { if (en.isIntersecting) { o.disconnect(); ivTrack('article_read', { article: page, seconds: Math.round((Date.now() - t0) / 1000) }); } }); }).observe(end);
    }
  });
})();
/* Event reference (full table in README.md):
   page_content, view_service, scroll_depth, cta_click, contact_click, outbound_click,
   form_start, generate_lead, faq_open, blog_filter, article_read, calculator_use,
   chat_open, chat_message, chat_quick_reply, chat_lead, chat_unanswered, chat_handoff */
