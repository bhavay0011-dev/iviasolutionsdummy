/* =====================================================================
   ivia solutions — website chat assistant (loaded on every page)

   HOW IT WORKS
   • Out of the box it answers from ivia's own knowledge base (chat-kb.js):
     instant, free, nothing to set up.
   • To switch on AI answers, set up the small connector from
     ivia-chatbot-ai-connector.zip (a free Cloudflare Worker, ~10 minutes)
     and paste its address into AI_URL below. Your AI key lives inside the
     connector, never in this website. If the AI is ever unreachable the
     chat quietly falls back to the knowledge base.
   ===================================================================== */
var IVIA_CHAT = {
  AI_URL: '',                                     // e.g. 'https://ivia-chat.your-name.workers.dev'
  LEAD_FORM: 'https://formspree.io/f/xykngvlj',   // where leads captured in the chat are sent
  WHATSAPP: '918607070505',                       // country code + number, digits only
  EMAIL: 'connect@bidvista.org',
  NUDGE_AFTER_SECONDS: 10                         // small "ask me" bubble once per visit; 0 = never
};

/* ---------- nothing below this line needs editing ---------- */
(function () {
  'use strict';
  var C = IVIA_CHAT, D = document, W = window;
  if (W.__ivc) return; W.__ivc = 1;
  var SRC = (D.currentScript && D.currentScript.src) || 'chatbot.js';
  var KB_URL = SRC.replace(/chatbot\.js(\?.*)?$/, 'chat-kb.js') + '?v=3';

  function start() {
  var body = D.body;
  var persona = body.dataset.persona === 'bidvista' ? 'bidvista' : 'ivia';
  var svc = body.dataset.service || '';
  var pageKey = body.dataset.pagekey || '';
  var AI = (C.AI_URL || '').trim();
  var small = function () { return innerWidth <= 600; };
  var track = function (n, p) { try { W.ivTrack && W.ivTrack(n, Object.assign({ persona: persona }, p || {})); } catch (e) {} };
  var SS = null; try { SS = W.sessionStorage; } catch (e) {}
  var sget = function (k) { try { return SS ? SS.getItem(k) : null; } catch (e) { return null; } };
  var sset = function (k, v) { try { SS && SS.setItem(k, v); } catch (e) {} };
  var HK = 'ivc_hist_' + persona;

  var PERS = {
    ivia: { name: 'Ivvy <em>by ivia</em>', short: 'Ivvy', av: '<span class="eyes"><i></i><i></i></span>', avc: '',
      hello: "Hi! I'm **Ivvy**, ivia's assistant. Ask me anything about our services, pricing, results or Bidvista, or tell me what you're trying to grow.",
      ph: 'Ask Ivvy about ads, pricing, Bidvista…', tip: "Hi, I'm Ivvy 👋 Questions about ads, pricing or Bidvista? Ask me." },
    bidvista: { name: 'Ivvy <em>by ivia</em>', short: 'Ivvy', av: '<span class="eyes"><i></i><i></i></span>', avc: '',
      hello: "Hi! I'm **Ivvy**, ivia's assistant. On this page I can tell you about Bidvista, explain ACOS, TACOS and bids, run the bid formulas for you, or add you to early access.",
      ph: 'Ask Ivvy about Bidvista, ACOS, bids…', tip: "Hi, I'm Ivvy 👋 Ask me about Bidvista or your Amazon numbers." }
  };
  var PS = PERS[persona];
  var status = AI ? 'AI assistant · online' : 'Instant answers · online';

  /* ------------------------------------------------ DOM */
  var ICO = {
    send: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  var launch = D.createElement('button');
  launch.id = 'ivc-launch'; launch.type = 'button';
  launch.setAttribute('aria-label', 'Open chat with ' + PS.short); launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-controls', 'ivc');
  launch.dataset.cursor = 'Chat';
  launch.innerHTML = '<span class="eyes"><i></i><i></i></span><span class="x">×</span><span class="nm">Ask Ivvy</span>';
  var tip = D.createElement('div'); tip.id = 'ivc-tip'; tip.setAttribute('role', 'status');
  tip.innerHTML = '<span></span><button type="button" aria-label="Dismiss">×</button>';
  tip.firstChild.textContent = PS.tip;
  var box = D.createElement('div');
  box.id = 'ivc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', PS.short + ' chat'); box.setAttribute('data-lenis-prevent', '');
  box.innerHTML =
    '<div class="ivc-h"><div class="ivc-av' + PS.avc + '">' + PS.av + '</div>' +
    '<div class="ivc-t"><b>' + PS.name + '</b><small><i></i><span>' + status + '</span></small></div>' +
    '<button class="ivc-hb" type="button" data-a="reset" aria-label="Start a new chat" title="New chat">' + ICO.reset + '</button>' +
    '<button class="ivc-hb" type="button" data-a="close" aria-label="Close chat">' + ICO.close + '</button></div>' +
    '<div class="ivc-m" aria-live="polite" data-lenis-prevent></div>' +
    '<div class="ivc-chips"></div>' +
    '<form class="ivc-f" autocomplete="off"><textarea rows="1" maxlength="800" aria-label="Your message" placeholder="' + PS.ph + '"></textarea>' +
    '<button class="ivc-send" type="submit" aria-label="Send" disabled>' + ICO.send + '</button></form>' +
    '<div class="ivc-ft"><span>' + (AI ? 'AI can make mistakes. For quotes, ask the team.' : 'Answers from ivia\'s knowledge base.') + '</span><a href="' + waLink('Hi ivia, I have a question.') + '" data-a="human">Talk to a human</a></div>';
  body.appendChild(box); body.appendChild(tip); body.appendChild(launch);
  var M = box.querySelector('.ivc-m'), CH = box.querySelector('.ivc-chips'), F = box.querySelector('.ivc-f'), TA = F.querySelector('textarea'), SEND = F.querySelector('.ivc-send');

  /* ------------------------------------------------ helpers */
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function waLink(text) { return 'https://wa.me/' + C.WHATSAPP + '?text=' + encodeURIComponent(text); }
  function inr(n, d) { return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d || 0 }); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function okUrl(u) { return /^(https?:\/\/|mailto:|tel:|#|[a-z0-9-]+\.html(#[\w-]+)?(\?[\w=&%-]*)?$)/i.test(u); }
  // markdown-lite: **bold**, [text](url), - lists, 1. lists, [[calc block]], paragraphs
  function md(t) {
    var h = esc(t);
    h = h.replace(/\[\[([^\]]+)\]\]/g, '<span class="calc-r">$1</span>');
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, txt, url) {
      url = url.replace(/&amp;/g, '&');
      if (!okUrl(url)) return txt;
      var ext = /^https?:/.test(url) && url.indexOf(location.host) < 0;
      return '<a href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + txt + '</a>';
    });
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:]|$)/g, '$1<em>$2</em>');
    h = h.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]+)(?=[\s).,]|$)/g, '$1<a href="mailto:$2">$2</a>');
    var out = [], list = null;
    h.split(/\n/).forEach(function (l) {
      var u = l.match(/^\s*[-•*]\s+(.*)/), o = l.match(/^\s*\d+[.)]\s+(.*)/);
      var m = u || o, tag = u ? 'ul' : 'ol';
      if (m) { if (list !== tag) { if (list) out.push('</' + list + '>'); out.push('<' + tag + '>'); list = tag; } out.push('<li>' + m[1] + '</li>'); }
      else { if (list) { out.push('</' + list + '>'); list = null; } if (l.trim()) out.push('<p>' + l + '</p>'); }
    });
    if (list) out.push('</' + list + '>');
    return out.join('');
  }
  function plain(t) { return String(t).replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, ''); }
  function scrub(t) { return String(t).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]').replace(/\+?\d[\d\s-]{7,}\d/g, '[number]').slice(0, 90); }

  /* ------------------------------------------------ knowledge base */
  var KB = null, kbP = null, STOP = {}, N = 0, DF = {};
  function loadKB() {
    if (KB) return Promise.resolve(KB);
    if (kbP) return kbP;
    kbP = new Promise(function (res, rej) {
      if (W.IVIA_KB) return res(W.IVIA_KB);
      var s = D.createElement('script'); s.src = KB_URL; s.async = true;
      s.onload = function () { W.IVIA_KB ? res(W.IVIA_KB) : rej(new Error('kb')); };
      s.onerror = function () { kbP = null; rej(new Error('kb')); };
      D.head.appendChild(s);
    }).then(function (kb) { index(kb); return KB; });
    return kbP;
  }
  function norm(s) { return String(s).toLowerCase().replace(/[’'`]/g, '').replace(/₹/g, ' inr ').replace(/[^a-z0-9%+\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function stem(w) {
    if (w.length > 4) {
      if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
      if (/ing$/.test(w) && w.length > 6) return w.slice(0, -3);
      if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    }
    return w;
  }
  function toks(s) {
    var out = [];
    norm(s).split(' ').forEach(function (w) {
      if (!w || STOP[w]) return;
      var st = stem(w); out.push(st);
      var syn = KB.syn[w] || KB.syn[st];
      if (syn) syn.split(' ').forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
    });
    return out;
  }
  function index(kb) {
    KB = kb; STOP = {}; kb.stop.split(' ').forEach(function (w) { STOP[w] = 1; });
    N = kb.entries.length; DF = {};
    kb.entries.forEach(function (e) {
      var w = {};
      toks(e.k).forEach(function (t) { w[t] = 3; });
      (e.q || []).forEach(function (q) { toks(q).forEach(function (t) { if (!w[t]) w[t] = 1.5; }); });
      toks(e.title || '').forEach(function (t) { w[t] = Math.max(w[t] || 0, 2); });
      e._w = w; e._n = Object.keys(w).length; e._k = ' ' + norm(e.k) + ' ';
      e._q = (e.q || []).map(norm);
      Object.keys(w).forEach(function (t) { DF[t] = (DF[t] || 0) + 1; });
    });
  }
  function rank(text) {
    var nq = norm(text), q = toks(text), uq = q.filter(function (t, i) { return q.indexOf(t) === i; });
    var words = nq.split(' ');
    var offMkt = /\b(meta|facebook|fb|instagram|insta|google|youtube|seo|website|websites|email|emails|social|creative|ugc|ga4|analytics)\b/.test(nq);
    var res = KB.entries.map(function (e) {
      var s = 0;
      if (e._q.indexOf(nq) > -1) s = 100;
      else {
        uq.forEach(function (t) { if (e._w[t]) s += e._w[t] * Math.log(1 + N / DF[t]); });
        for (var i = 0; i < words.length - 1; i++) { var bg = words[i] + ' ' + words[i + 1]; if (!STOP[words[i]] && !STOP[words[i + 1]] && e._k.indexOf(' ' + bg + ' ') > -1) s += 3; }
        s = s / Math.pow(Math.max(e._n, 4), 0.18);
      }
      if (svc && e.svc === svc) s *= 1.25;
      if (persona === 'bidvista' && !offMkt && e.tags && (e.tags.indexOf('mkt') > -1 || e.tags.indexOf('bv') > -1)) s *= (e.tags.indexOf('bv') > -1 ? 1.4 : 1.2);
      return { e: e, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
    return res;
  }

  /* ------------------------------------------------ calculator intents */
  function pick(t, names, cur) {
    for (var i = 0; i < names.length; i++) {
      var n = names[i].replace(/ /g, '\\s*');
      var m = t.match(new RegExp('\\b' + n + '\\b[^0-9%]{0,14}?(?:rs\\.?|inr|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(%|x|×)?'))
           || t.match(new RegExp('(?:rs\\.?|inr|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(%|x|×)?\\s*(?:of\\s+)?\\b' + n + '\\b'));
      if (m) return parseFloat(m[1]);
    }
    if (cur) { var c = t.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)/); if (c) return parseFloat(c[1]); }
    return null;
  }
  function calcIntent(text) {
    var t = text.toLowerCase().replace(/(\d),(\d)/g, '$1$2');
    var wantsCpc = /\b(cpc|bid|bids|bidding)\b/.test(t) && /(target|max|calculat|what should|how much|kitna|formula)/.test(t) || /target cpc/.test(t);
    var be = /break\s*-?\s*even/.test(t) && /\d/.test(t);
    var price = pick(t, ['selling price', 'price', 'aov', 'order value', 'mrp', 'priced at'], true);
    var acos = pick(t, ['target acos', 'acos']);
    var cvr = pick(t, ['conversion rate', 'conv rate', 'cvr', 'conversion', 'cr']);
    var margin = pick(t, ['profit margin', 'margin']);
    var roas = pick(t, ['roas']);
    var cpa = pick(t, ['target cpa', 'cpa', 'cost per acquisition', 'cost per lead', 'cost per purchase']);
    if (price != null && acos != null && cvr != null && !be) wantsCpc = true;
    if (wantsCpc && cpa != null && cvr != null && acos == null) {
      var mc = cpa * cvr / 100;
      return { id: 'calc_gcpc', t: 'Max CPC = target CPA × conversion rate\n[[' + inr(cpa) + ' × ' + cvr + '% = ' + inr(r2(mc), 2) + ']]\nBid around **' + inr(r2(mc), 2) + '** per click to hit your target CPA. More on [Google Ads](google-ads.html).', chips: ['How do you manage Google Ads?', 'lead:Get a free audit'] };
    }
    if (wantsCpc) {
      if (price != null && acos != null && cvr != null) {
        var cpc = acos / 100 * cvr / 100 * price;
        return { id: 'calc_tcpc', t: 'Target CPC = Target ACOS × conversion rate × price\n[[' + acos + '% × ' + cvr + '% × ' + inr(price) + ' = ' + inr(r2(cpc), 2) + ']]\nBid around **' + inr(r2(cpc), 2) + '** per click. If your current bid is higher, you are paying for clicks the margin can\'t support. Try the full calculator on the [Bidvista page](bidvista.html#calc).', chips: ['What is a good ACOS?', 'Breakeven ACOS?', persona === 'bidvista' ? 'lead:Join early access' : 'lead:Get a free audit'] };
      }
      var miss = []; if (price == null) miss.push('**price**'); if (acos == null) miss.push('**target ACOS**'); if (cvr == null) miss.push('**conversion rate**');
      return { id: 'calc_tcpc_ask', t: 'Happy to work it out. The formula is **Target ACOS × conversion rate × price**. I still need your ' + miss.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.\nFor example: *price 999, ACOS 30%, CVR 10%*.', chips: ['Price 999, ACOS 30%, CVR 10%', 'What is CVR?'] };
    }
    if (be) {
      if (margin == null && price != null) { var cost = pick(t, ['cost', 'costs', 'cogs', 'landed cost']); if (cost != null && price > cost) margin = (price - cost) / price * 100; }
      if (margin != null && margin > 0 && margin < 100) {
        return { id: 'calc_be', t: 'With a **' + r2(margin) + '%** margin before ad costs:\n[[Breakeven ROAS = 1 ÷ ' + r2(margin) + '% = ' + r2(100 / margin) + '×]]\n[[Breakeven ACOS = ' + r2(margin) + '%]]\nBelow ' + r2(100 / margin) + '× ROAS (or above ' + r2(margin) + '% ACOS) an ad sale loses money on the first order.', chips: ['What is TACOS?', 'What is MER?', 'lead:Get a free audit'] };
      }
      return { id: 'calc_be_ask', t: 'Breakeven ROAS is **1 ÷ your margin** (before ad costs), and breakeven ACOS equals that margin. Tell me your margin, e.g. *breakeven at 40% margin*, and I\'ll work it out.', chips: ['Breakeven at 40% margin'] };
    }
    if (acos != null && /roas/.test(t) && roas == null && acos > 0) {
      return { id: 'calc_a2r', t: '[[ROAS = 1 ÷ ' + acos + '% = ' + r2(100 / acos) + '×]]\nSo ACOS ' + acos + '% means about **' + inr(r2(10000 / acos)) + ' of ad sales per ₹100** of ad spend.', chips: ['What is TACOS?', 'Breakeven ACOS?'] };
    }
    if (roas != null && /acos/.test(t) && acos == null && roas > 0) {
      return { id: 'calc_r2a', t: '[[ACOS = 1 ÷ ' + roas + '× = ' + r2(100 / roas) + '%]]\nA ROAS of ' + roas + '× is the same as ' + r2(100 / roas) + '% ACOS.', chips: ['Breakeven ACOS?', 'What is MER?'] };
    }
    return null;
  }

  /* ------------------------------------------------ local answer */
  function localAnswer(text) {
    var nt = norm(text);
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text) || /(\+?\d[\d\s-]{8,}\d)/.test(text)) {
      return { id: 'contact_given', t: 'Thanks! Shall I pass your details to the team so they can get in touch? Add your name below and hit send.', lead: { prefill: (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || text.match(/\+?\d[\d\s-]{8,}\d/) || [''])[0] } };
    }
    var c = calcIntent(text); if (c) return c;
    var r = rank(text), best = r[0];
    if (!nt || !best || best.s < 2.2) {
      track('chat_unanswered', { question: scrub(text) });
      return { id: 'fallback', t: KB.fallback[persona], chips: KB.start[persona === 'bidvista' ? 'bidvista' : 'default'].slice(0, 3).concat(['wa:Ask a human on WhatsApp']) };
    }
    var e = best.e, pre = '';
    var chips = (e.chips || []).slice();
    var second = r[1];
    if (second && second.s > best.s * 0.8 && second.e.title && chips.length < 4 && second.s < 100) chips.push(second.e.q && second.e.q[0] ? cap(second.e.q[0]) : second.e.title);
    return { id: e.id, t: pre + e.a, chips: chips, go: e.link ? { href: e.link, label: e.lt || 'Open page' } : null, lead: e.act === 'lead' ? { offer: true } : null };
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) + (/[?.!]$/.test(s) ? '' : '?'); }
  function context(text) {
    return rank(text).slice(0, 4).filter(function (x) { return x.s > 1; }).map(function (x) { return (x.e.title ? x.e.title + ': ' : '') + plain(x.e.a) + (x.e.link ? ' (page: ' + x.e.link + ')' : ''); }).join('\n---\n').slice(0, 6000);
  }

  /* ------------------------------------------------ AI answer (optional) */
  function aiAnswer(text) {
    var msgs = hist.filter(function (m) { return m.r === 'u' || m.r === 'b'; }).slice(-12).map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: plain(m.t).slice(0, 1500) }; });
    var ctl = W.AbortController ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, 25000);
    return fetch(AI, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ persona: persona, page: { path: location.pathname, title: D.title, service: svc }, messages: msgs, context: context(text) }) })
      .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || typeof j.reply !== 'string' || !j.reply.trim()) throw new Error('empty');
        var t = j.reply.trim(), lead = /\[\[lead\]\]/i.test(t);
        t = t.replace(/\s*\[\[lead\]\]\s*/gi, ' ').trim();
        var loc = localAnswer(text);
        return { id: 'ai', ai: true, t: t, chips: (loc.chips || []).slice(0, 3), go: loc.go, lead: lead ? { offer: true } : null };
      });
  }

  /* ------------------------------------------------ state + render */
  var hist = []; try { hist = JSON.parse(sget(HK) || '[]') || []; } catch (e) { hist = []; }
  var busy = false, opened = false, greeted = hist.length > 0;
  function save() { sset(HK, JSON.stringify(hist.slice(-40))); }
  function scrollEnd(smooth) { M.scrollTo ? M.scrollTo({ top: M.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }) : (M.scrollTop = M.scrollHeight); }
  function addMsg(r, t, opts) {
    opts = opts || {};
    var el = D.createElement('div'); el.className = 'ivc-msg ' + r;
    el.innerHTML = r === 'u' ? esc(t).replace(/\n/g, '<br>') : md(t);
    M.appendChild(el);
    if (opts.go && opts.go.href) {
      var a = D.createElement('a'); a.className = 'ivc-go'; a.href = opts.go.href; a.textContent = opts.go.label + ' →'; a.dataset.label = opts.go.label.replace(/^Open /, '');
      M.appendChild(a);
    }
    if (!opts.quiet && W.gsap) {
      W.gsap.from(el, { y: 16, opacity: 0, scale: .97, transformOrigin: r === 'u' ? '100% 100%' : '0% 100%', duration: .45, ease: 'back.out(1.6)' });
      if (r === 'b') W.gsap.from(el.children, { y: 8, opacity: 0, stagger: .06, duration: .4, delay: .1 });
    }
    if (!opts.nosave) { hist.push({ r: r, t: t, go: opts.go || null }); save(); }
    scrollEnd(!opts.quiet);
    return el;
  }
  function setChips(list) {
    CH.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (c) {
      var b = D.createElement('button'); b.type = 'button'; b.className = 'ivc-chip';
      var kind = (c.match(/^(lead|wa|go):/) || [])[1];
      var label = kind ? c.slice(kind.length + 1) : c;
      if (kind === 'go') { var p = label.split('|'); label = p[0]; b.dataset.href = p[1]; }
      if (kind) b.classList.add('hot');
      b.textContent = label; b.dataset.kind = kind || 'ask';
      CH.appendChild(b);
    });
    if (W.gsap && CH.children.length) W.gsap.from(CH.children, { y: 10, opacity: 0, stagger: .05, duration: .35, ease: 'power3.out' });
  }
  function typing(on) {
    var t = M.querySelector('.ivc-typing');
    if (on && !t) { t = D.createElement('div'); t.className = 'ivc-typing'; t.innerHTML = '<i></i><i></i><i></i>'; M.appendChild(t); scrollEnd(true); }
    if (!on && t) t.remove();
  }
  function startChips() {
    var s = KB.start;
    if (persona === 'bidvista') return s.bidvista;
    if (svc && s[svc]) return s[svc];
    if (pageKey && s[pageKey]) return s[pageKey];
    return s['default'];
  }
  function greet() {
    greeted = true;
    addMsg('b', PS.hello + (svc && KB.svcNames[svc] && persona === 'ivia' ? '\nYou\'re on our **' + KB.svcNames[svc] + '** page, so ask me anything about it.' : ''));
    setChips(startChips());
  }
  function restore() {
    hist.forEach(function (m) { addMsg(m.r, m.t, { quiet: true, nosave: true, go: m.go }); });
    setChips(startChips());
  }

  /* ------------------------------------------------ conversation */
  function respond(text, via) {
    if (busy || !text.trim()) return;
    text = text.trim().slice(0, 800);
    busy = true; SEND.disabled = true;
    addMsg('u', text); setChips([]);
    var t0 = Date.now();
    track('chat_message', { mode: AI ? 'ai' : 'local', via: via || 'typed', length: text.length });
    loadKB().then(function () {
      typing(true);
      var local = localAnswer(text);
      var p = (AI && !/^(calc_|contact_given)/.test(local.id)) ? aiAnswer(text).catch(function () { return local; }) : Promise.resolve(local);
      return p.then(function (ans) {
        var wait = Math.max(0, (ans.ai ? 0 : 450 + Math.min(700, ans.t.length * 2)) - (Date.now() - t0));
        return new Promise(function (res) { setTimeout(function () { res(ans); }, wait); });
      });
    }).then(function (ans) {
      typing(false);
      addMsg('b', ans.t, { go: ans.go });
      if (ans.lead && ans.lead.prefill != null) leadForm(ans.lead.prefill);
      var chips = ans.chips || [];
      if (ans.lead && ans.lead.offer && !chips.some(function (c) { return /^lead:/.test(c); })) chips = ['lead:' + (persona === 'bidvista' ? 'Join early access' : 'Yes, contact me')].concat(chips);
      setChips(chips);
      busy = false; SEND.disabled = !TA.value.trim();
    }).catch(function () {
      typing(false);
      addMsg('b', 'Sorry, I could not load my answers just now. You can reach the team on [WhatsApp](' + waLink('Hi ivia') + ') or at ' + C.EMAIL + '.');
      busy = false; SEND.disabled = !TA.value.trim();
    });
  }

  /* ------------------------------------------------ lead capture */
  function leadForm(prefill) {
    if (M.querySelector('.ivc-lead')) { M.querySelector('.ivc-lead input').focus(); scrollEnd(true); return; }
    var bv = persona === 'bidvista';
    var f = D.createElement('form'); f.className = 'ivc-lead'; f.dataset.form = 'chat_lead'; f.noValidate = true;
    f.innerHTML = '<b>' + (bv ? 'Join Bidvista early access' : 'Talk to the ivia team') + '</b>' +
      '<p>' + (bv ? 'We\'ll let you know as soon as the beta opens.' : 'Leave your details and we\'ll reply within 1 business day.') + '</p>' +
      '<input name="name" placeholder="Your name" autocomplete="name" required>' +
      '<input name="contact" placeholder="Email or WhatsApp number" autocomplete="email" required>' +
      '<input name="brand" placeholder="' + (bv ? 'Brand + marketplace (optional)' : 'Brand or website (optional)') + '" autocomplete="organization">' +
      '<div class="row"><button type="submit">' + (bv ? 'Join the waitlist ↗' : 'Send ↗') + '</button><button type="button" class="x">Not now</button></div><div class="err" role="status"></div>';
    M.appendChild(f);
    var E = f.elements;
    if (prefill) E.contact.value = prefill.trim();
    if (W.gsap) W.gsap.from(f, { y: 20, opacity: 0, scale: .96, duration: .5, ease: 'back.out(1.6)' });
    scrollEnd(true);
    setTimeout(function () { E.name.focus({ preventScroll: true }); }, 250);
    f.querySelector('.x').onclick = function () { f.remove(); };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = E.name.value.trim(), contact = E.contact.value.trim(), err = f.querySelector('.err');
      var isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact), isPhone = (contact.replace(/\D/g, '').length >= 8);
      if (!name) { err.textContent = 'Please add your name.'; E.name.focus(); return; }
      if (!isMail && !isPhone) { err.textContent = 'Please add a valid email or phone number.'; E.contact.focus(); return; }
      err.textContent = '';
      var btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
      var fd = new FormData();
      fd.append('_subject', bv ? 'Bidvista early access (chat)' : 'New ivia chat lead');
      fd.append('name', name); fd.append('contact', contact); if (isMail) fd.append('email', contact);
      fd.append('brand', E.brand.value.trim()); fd.append('source', bv ? 'Bidvista chat' : 'ivia website chat');
      fd.append('page', location.pathname);
      fd.append('transcript', hist.slice(-14).map(function (m) { return (m.r === 'u' ? 'Visitor: ' : 'Bot: ') + plain(m.t); }).join('\n').slice(0, 4000));
      try { var at = W.ivAttribution ? W.ivAttribution() : {}; Object.keys(at).forEach(function (k) { if (at[k] != null && at[k] !== '') fd.append(k, at[k]); }); } catch (x) {}
      fetch(C.LEAD_FORM, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function (r) {
        if (!r.ok) throw new Error('bad');
        track('generate_lead', { method: bv ? 'bidvista_waitlist_chat' : 'chat' });
        track('chat_lead', { method: bv ? 'bidvista_waitlist' : 'contact' });
        if (bv) track('bidvista_waitlist', { method: 'chat' });
        f.remove();
        addMsg('b', 'Thanks, ' + name.split(' ')[0] + '! ' + (bv ? 'You\'re on the Bidvista early-access list. We\'ll be in touch when the beta opens.' : 'The team has your details and will reply within 1 business day. For anything urgent, [WhatsApp us](' + waLink('Hi ivia, I just sent my details via the website chat.') + ').'));
        setChips(bv ? ['What can Bidvista do?', 'Calculate my target CPC'] : ['What\'s in the free audit?', 'How do you work?']);
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Try again';
        err.innerHTML = 'That didn\'t send. Please <a href="' + waLink('Hi ivia, my name is ' + name + '. ' + contact) + '" style="color:inherit;text-decoration:underline">message us on WhatsApp</a> instead.';
      });
    });
  }

  /* ------------------------------------------------ open / close */
  function open(how) {
    if (opened) return;
    opened = true; box.classList.add('open'); launch.classList.add('open'); body.classList.add('ivc-open');
    launch.setAttribute('aria-expanded', 'true'); launch.setAttribute('aria-label', 'Close chat');
    hideTip(true);
    track('chat_open', { via: how || 'launcher' });
    sset('ivc_opened', '1');
    loadKB().then(function () {
      if (!M.children.length) { if (hist.length) restore(); else greet(); }
      setTimeout(function () { scrollEnd(false); }, 30);
    }).catch(function () { if (!M.children.length) addMsg('b', 'Hi! Message the team on [WhatsApp](' + waLink('Hi ivia') + ') or email ' + C.EMAIL + '.', { nosave: true }); });
    if (!small() && how !== 'restore') setTimeout(function () { TA.focus({ preventScroll: true }); }, 350);
    if (W.gsap && how !== 'restore') W.gsap.fromTo(box, { clipPath: 'circle(0% at 92% 100%)' }, { clipPath: 'circle(150% at 92% 100%)', duration: .7, ease: 'expo.out', clearProps: 'clipPath' });
  }
  function close() {
    if (!opened) return;
    opened = false; box.classList.remove('open'); launch.classList.remove('open'); body.classList.remove('ivc-open');
    launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-label', 'Open chat with ' + PS.short);
    if (D.activeElement && box.contains(D.activeElement)) launch.focus({ preventScroll: true });
  }
  W.ivChat = { open: function (q) { open('api'); if (q) setTimeout(function () { respond(q, 'link'); }, 400); }, close: close,
    ask: function (q) { return loadKB().then(function () { return localAnswer(q); }); } };

  /* ------------------------------------------------ events */
  launch.addEventListener('click', function () { opened ? close() : open('launcher'); });
  tip.addEventListener('click', function (e) { if (e.target.closest('button')) { hideTip(); return; } open('nudge'); });
  box.addEventListener('click', function (e) {
    var a = e.target.closest('[data-a]');
    if (a && a.dataset.a === 'close') close();
    if (a && a.dataset.a === 'reset') { hist = []; save(); M.innerHTML = ''; CH.innerHTML = ''; greet(); track('chat_reset'); }
    if (a && a.dataset.a === 'human') track('chat_handoff', { method: 'whatsapp' });
    var chip = e.target.closest('.ivc-chip');
    if (chip) {
      var k = chip.dataset.kind; track('chat_quick_reply', { label: chip.textContent.slice(0, 60), kind: k });
      if (k === 'lead') { leadForm(); }
      else if (k === 'wa') { track('chat_handoff', { method: 'whatsapp' }); W.open(waLink('Hi ivia, I have a question: ' + (lastUser() || '')), '_blank', 'noopener'); }
      else if (k === 'go') { location.href = chip.dataset.href; }
      else respond(chip.textContent, 'chip');
    }
    var link = e.target.closest('a[href]');
    if (link && /^[a-z0-9-]+\.html/i.test(link.getAttribute('href') || '')) sset('ivc_reopen', '1');
  });
  function lastUser() { for (var i = hist.length - 1; i >= 0; i--) if (hist[i].r === 'u') return plain(hist[i].t).slice(0, 200); return ''; }
  F.addEventListener('submit', function (e) { e.preventDefault(); var v = TA.value; TA.value = ''; grow(); respond(v); });
  TA.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (TA.value.trim()) F.requestSubmit ? F.requestSubmit() : F.dispatchEvent(new Event('submit')); } });
  function grow() { TA.style.height = 'auto'; TA.style.height = Math.min(110, TA.scrollHeight) + 'px'; SEND.disabled = busy || !TA.value.trim(); }
  TA.addEventListener('input', grow);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && opened) close(); });
  // any element with data-chat="question" opens the chat (and optionally asks it)
  D.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-chat]'); if (!t) return;
    e.preventDefault(); W.ivChat.open(t.dataset.chat || '');
  });
  // preload the knowledge base when the visitor shows interest
  launch.addEventListener('pointerenter', function () { loadKB().catch(function () {}); }, { once: true });

  /* ------------------------------------------------ entrance, nudge, reopen */
  function hideTip(forever) { tip.classList.remove('on'); if (forever !== false) sset('ivc_tip', '1'); }
  setTimeout(function () { launch.classList.add('in'); }, D.getElementById('loader') && !sget('bv_seen_chat') ? 3400 : 900);
  sset('bv_seen_chat', '1');
  if (sget('ivc_reopen') === '1') { sset('ivc_reopen', '0'); setTimeout(function () { open('restore'); }, 1300); }
  var nudge = +C.NUDGE_AFTER_SECONDS || 0;
  if (nudge && !sget('ivc_tip') && !sget('ivc_opened')) setTimeout(function () {
    if (opened || sget('ivc_tip') || D.documentElement.classList.contains('menu-open')) return;
    tip.classList.add('on'); sset('ivc_tip', '1');
    setTimeout(function () { hideTip(); }, 12000);
  }, nudge * 1000);
  }
  if (D.body) start(); else D.addEventListener('DOMContentLoaded', start);
})();
