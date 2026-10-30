/* =====================================================================
   ivia solutions — motion & interactions (v2)
   three r128 · gsap 3.12 + ScrollTrigger · lenis — all optional
   ===================================================================== */
(function () {
'use strict';
const touch = matchMedia('(hover: none)').matches;
const small = innerWidth < 760;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = -(e.clientY / innerHeight * 2 - 1); });

/* ---------------- tracking: contact clicks ---------------- */
function track(method) {
  try { if (typeof gtag === 'function') gtag('event', 'contact_click', { method: method }); } catch (e) {}
  try { if (typeof fbq === 'function') fbq('track', 'Contact', { content_name: method }); } catch (e) {}
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  const h = a.getAttribute('href') || '';
  if (h.startsWith('mailto:')) track('email');
  else if (h.includes('wa.me/')) track('whatsapp');
  else if (h.includes('fiverr.com')) track('fiverr');
}, true);

/* ---------------- signal field (WebGL dot wave) ---------------- */
let scrollVel = 0;
const wave = { amp: 1, tAmp: 1, alpha: 1, tAlpha: 1, camY: 5.2, tCamY: 5.2 };
(function initWave() {
  const canvas = $('#wave');
  if (!canvas || typeof THREE === 'undefined' || reduce) { canvas && canvas.remove(); return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' }); } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  const COLS = small ? 90 : 180, ROWS = small ? 60 : 110, W = 64, D = 48;
  const pos = new Float32Array(COLS * ROWS * 3); let k = 0;
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    pos[k++] = (i / (COLS - 1) - .5) * W; pos[k++] = 0; pos[k++] = -(j / (ROWS - 1)) * D + 6;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const uni = { uTime: { value: 0 }, uAmp: { value: 1 }, uMouse: { value: new THREE.Vector2(0, -10) }, uHover: { value: 0 },
    uPx: { value: renderer.getPixelRatio() }, uAlpha: { value: 1 }, uW: { value: W } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `uniform float uTime,uAmp,uHover,uPx,uW;uniform vec2 uMouse;varying float vH;varying float vF;varying float vX;
      void main(){vec3 p=position;float t=uTime;
        float y=sin(p.x*.21+t*.55)*.75+sin(p.z*.32+t*.42)*.6+sin((p.x*.6+p.z)*.17-t*.35)*.85+sin(p.x*.05+p.z*.11+t*.2)*1.1;
        float d=distance(p.xz,uMouse);y+=exp(-d*d*.035)*2.4*uHover;
        p.y=y*uAmp;vH=clamp((y+2.6)/5.2,0.,1.);vX=p.x/uW+.5;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_PointSize=(1.7+vH*2.8)*uPx*(18./-mv.z);
        vF=smoothstep(56.,10.,-mv.z)*smoothstep(.0,.12,vX)*smoothstep(1.,.88,vX);
        gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uAlpha;varying float vH;varying float vF;varying float vX;
      void main(){vec2 c=gl_PointCoord-.5;float r=length(c);if(r>.5)discard;
        vec3 a=vec3(.48,.38,1.);vec3 b=vec3(.31,.55,1.);vec3 cy=vec3(.13,.83,.93);
        vec3 g=mix(mix(a,b,smoothstep(0.,.55,vX)),cy,smoothstep(.5,1.,vX));
        vec3 base=vec3(.62,.66,.82);
        vec3 col=mix(base,g,smoothstep(.35,.85,vH));
        float al=(.28+.72*smoothstep(.25,1.,vH))*vF*uAlpha*(1.-smoothstep(.32,.5,r));
        gl_FragColor=vec4(col,al);}`
  });
  const pts = new THREE.Points(geo, mat); scene.add(pts);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), mv2 = new THREE.Vector2();
  let hover = 0, vis = true; document.addEventListener('visibilitychange', () => vis = !document.hidden);
  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop); if (!vis) return;
    const t = clock.getElapsedTime(); uni.uTime.value = t;
    wave.amp += (wave.tAmp - wave.amp) * .05; wave.alpha += (wave.tAlpha - wave.alpha) * .06; wave.camY += (wave.tCamY - wave.camY) * .05;
    uni.uAmp.value = wave.amp * (1 + clamp(Math.abs(scrollVel) / 3000, 0, .6)); uni.uAlpha.value = wave.alpha;
    cam.position.set(mouse.nx * 1.4, wave.camY + mouse.ny * .5, 14); cam.lookAt(0, 0, -14);
    if (!touch) { mv2.set(mouse.nx, mouse.ny); ray.setFromCamera(mv2, cam); if (ray.ray.intersectPlane(plane, hit)) { uni.uMouse.value.set(hit.x, hit.z); hover += (1 - hover) * .08; } }
    uni.uHover.value = hover;
    renderer.render(scene, cam);
  })();
})();

/* ---------------- helpers ---------------- */
function splitWords(el) {
  const out = [];
  const walk = node => {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(' ')); return; }
          const o = document.createElement('span'); o.className = 'w';
          const i = document.createElement('span'); i.className = 'wi'; i.textContent = w;
          o.appendChild(i); f.appendChild(o); out.push(i);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') {
        if (c.classList.contains('hl') || c.classList.contains('keep')) {
          const o = document.createElement('span'); o.className = 'w'; c.replaceWith(o);
          const i = document.createElement('span'); i.className = 'wi'; i.appendChild(c); o.appendChild(i); out.push(i);
        } else walk(c);
      }
    });
  };
  walk(el); return out;
}
function countTo(el, dur = 1.8) {
  const to = parseFloat(el.dataset.to), dec = +el.dataset.dec || 0, pre = el.dataset.pre || '', suf = el.dataset.suf || '', loc = el.dataset.fmt === 'in';
  const fmt = v => pre + (loc ? Math.round(v).toLocaleString('en-IN') : v.toFixed(dec)) + suf;
  if (typeof gsap === 'undefined') { el.textContent = fmt(to); return; }
  const o = { v: 0 }; gsap.to(o, { v: to, duration: dur, ease: 'expo.out', onUpdate: () => el.textContent = fmt(o.v) });
}
const hlOn = root => $$('.hl', root).forEach((h, i) => setTimeout(() => h.classList.add('on'), 120 + i * 160));

/* ---------------- no-GSAP fallback ---------------- */
if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
  document.documentElement.classList.remove('js');
  ['#loader', '#curtain'].forEach(s => { const e = $(s); e && e.remove(); });
  $$('.cnt').forEach(el => countTo(el)); $$('.hl').forEach(h => h.classList.add('on'));
  initForm(); initFaq(); initMenuBasic();
  return;
}
window.__iv = 1;
gsap.registerPlugin(ScrollTrigger);

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (typeof Lenis !== 'undefined' && !reduce) {
  lenis = new Lenis({ lerp: .09 });
  lenis.on('scroll', e => { ScrollTrigger.update(); scrollVel = e.velocity * 60; });
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollToEl = el => { if (!el) return; lenis ? lenis.scrollTo(el, { duration: 1.4, offset: -90 }) : el.scrollIntoView({ behavior: 'smooth' }); };

/* ---------------- page transitions ---------------- */
const curtain = $('#curtain'); if (curtain) curtain.style.animation = 'none';
function isInternal(a) {
  const h = a.getAttribute('href') || '';
  if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || a.target === '_blank' || a.hasAttribute('download')) return false;
  try { const u = new URL(a.href, location.href); return u.origin === location.origin && !(u.pathname === location.pathname && u.hash); } catch (e) { return false; }
}
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  const h = a.getAttribute('href');
  if (h.startsWith('#')) { const t = $(h); if (t) { e.preventDefault(); closeMenu(); setTimeout(() => scrollToEl(t), 250); } return; }
  if (!isInternal(a) || !curtain) return;
  e.preventDefault();
  const lbl = (a.dataset.label || (a.textContent || '').trim().split('\n')[0]).replace(/[↗→←]/g, '').trim().slice(0, 30) || 'ivia';
  $('.cl span', curtain).textContent = lbl;
  gsap.set(curtain, { display: 'flex', visibility: 'visible', clipPath: 'inset(100% 0% 0% 0% round 40px 40px 0 0)' });
  gsap.to(curtain, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0 0)', duration: .7, ease: 'expo.inOut', onComplete: () => { location.href = a.href; } });
  gsap.fromTo($('.cl', curtain), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .5, delay: .25 });
});
addEventListener('pageshow', e => { if (e.persisted && curtain) gsap.set(curtain, { clipPath: 'inset(0% 0% 100% 0%)' }); });

/* ---------------- cursor ---------------- */
const cur = $('#cur'), curLbl = cur && $('span', cur);
if (cur && !touch) {
  const qx = gsap.quickTo(cur, 'x', { duration: .3, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .3, ease: 'power3' });
  addEventListener('mousemove', e => { qx(e.clientX); qy(e.clientY); });
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-cursor]');
    if (t) { cur.className = 'lab'; curLbl.textContent = t.dataset.cursor; return; }
    if (e.target.closest('a,button,input,select,textarea,label')) { cur.className = 'hov'; curLbl.textContent = ''; return; }
    cur.className = ''; curLbl.textContent = '';
  });
  document.addEventListener('mouseleave', () => cur.classList.add('hide'));
  document.addEventListener('mouseenter', () => cur.classList.remove('hide'));
}

/* ---------------- nav: hide on scroll down ---------------- */
let menuOpen = false;
const nav = $('.nav');
let lastY = 0;
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
  const y = s.scroll(); if (!nav) return;
  if (y > 140 && y > lastY + 4 && !menuOpen) nav.classList.add('hide');
  else if (y < lastY - 4 || y < 140) nav.classList.remove('hide');
  lastY = y;
} });

/* ---------------- mobile menu ---------------- */
const ov = $('#overlay'), mb = $('#menuBtn');
function openMenu() {
  menuOpen = true; mb.classList.add('open'); lenis && lenis.stop();
  gsap.set(ov, { visibility: 'visible' });
  gsap.to(ov, { clipPath: 'inset(0% 0% 0% 0%)', duration: .8, ease: 'expo.inOut' });
  gsap.fromTo($$('a.big', ov), { yPercent: 110 }, { yPercent: 0, stagger: .06, duration: .9, delay: .25, ease: 'expo.out' });
  gsap.fromTo('.ov-foot', { opacity: 0, y: 20 }, { opacity: 1, y: 0, delay: .6 });
}
function closeMenu() {
  if (!menuOpen) return; menuOpen = false; mb.classList.remove('open'); lenis && lenis.start();
  gsap.to(ov, { clipPath: 'inset(0% 0% 100% 0%)', duration: .7, ease: 'expo.inOut', onComplete: () => gsap.set(ov, { visibility: 'hidden' }) });
}
if (ov && mb) { mb.addEventListener('click', () => menuOpen ? closeMenu() : openMenu()); addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); }); }

/* ---------------- magnetic ---------------- */
if (!touch) $$('.mag').forEach(b => {
  const s = b.classList.contains('cta-ball') ? .35 : .22;
  b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * s, y: (e.clientY - r.top - r.height / 2) * s, duration: .5, ease: 'power3' }); });
  b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
});

/* ---------------- intro (loader on first home visit, curtain otherwise) ---------------- */
const heroH = $('.hero h1, .ph h1, .art-hero h1, .nf h1');
const heroWords = heroH ? splitWords(heroH) : [];
const heroBits = $$('[data-in]');
gsap.set(heroWords, { yPercent: 108 });
gsap.set(heroBits, { opacity: 0, y: 30 });
gsap.set('.kcard', { opacity: 0, y: 40, scale: .92 });
function heroIn() {
  const tl = gsap.timeline();
  tl.to(heroWords, { yPercent: 0, duration: 1.1, stagger: .055, ease: 'expo.out' })
    .add(() => heroH && hlOn(heroH), '-=.6')
    .to(heroBits, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'power3.out' }, .25)
    .to('.kcard', { opacity: 1, y: 0, scale: 1, duration: 1, stagger: .12, ease: 'back.out(1.5)' }, .5)
    .from('#wave', { opacity: 0, duration: 1.6 }, 0);
  return tl;
}
const loader = $('#loader');
let seen = false;
try { seen = sessionStorage.getItem('iv_seen') === '1'; sessionStorage.setItem('iv_seen', '1'); } catch (e) {}
const intro = gsap.timeline({ delay: .05 });
if (loader && !seen && !reduce) {
  loader.style.animation = 'none';
  if (curtain) gsap.set(curtain, { display: 'none' });
  const n = $('#ldN'), o = { v: 0 };
  intro.from('#loader img', { scale: .8, opacity: 0, filter: 'blur(10px)', duration: .9, ease: 'expo.out' })
    .to('#loader .bar i', { scaleX: 1, duration: 1.4, ease: 'power3.inOut' }, .2)
    .to(o, { v: 100, duration: 1.4, ease: 'power3.inOut', onUpdate: () => n && (n.textContent = String(Math.round(o.v)).padStart(3, '0')) }, .2)
    .to('#loader img', { y: -30, opacity: 0, duration: .45, ease: 'power3.in' })
    .to(loader, { clipPath: 'inset(0% 0% 100% 0% round 0 0 60px 60px)', duration: 1, ease: 'expo.inOut' }, '-=.15')
    .set(loader, { display: 'none' })
    .add(heroIn(), '-=.55');
} else {
  loader && loader.remove();
  if (curtain) intro.to(curtain, { clipPath: 'inset(0% 0% 100% 0% round 0 0 60px 60px)', duration: .9, ease: 'expo.inOut' }).set(curtain, { display: 'none' });
  intro.add(heroIn(), curtain ? '-=.5' : 0);
}
intro.add(() => { lenis && lenis.start(); ScrollTrigger.refresh(); }, '<');

/* ---------------- global scroll effects ---------------- */
const prog = $('#prog'); if (prog) gsap.to(prog, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
const heroSec = $('.hero, .ph, .art-hero');
if (heroSec) ScrollTrigger.create({ trigger: heroSec, start: 'top top', end: 'bottom 30%', onLeave: () => { wave.tAlpha = .28; wave.tAmp = .7; wave.tCamY = 8; }, onEnterBack: () => { wave.tAlpha = 1; wave.tAmp = 1; wave.tCamY = 5.2; } });
if ($('.hero h1') && !small) gsap.to('.hero h1', { fontVariationSettings: "'opsz' 96, 'wdth' 75", yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
if ($('.kcards')) gsap.to('.kcard', { y: (i) => -120 - i * 60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
if (!touch) $$('.kcard').forEach((c, i) => gsap.to(c, { y: '+=' + (8 + i * 3), duration: 2.4 + i * .4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.6 }));

/* reveal headings word by word */
$$('.rw').forEach(h => {
  const ws = splitWords(h);
  gsap.from(ws, { yPercent: 108, duration: 1.05, stagger: .045, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 86%', onEnter: () => setTimeout(() => hlOn(h), 450) } });
});
$$('.fu').forEach(el => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
$$('.fu-stag').forEach(g => gsap.from(g.children, { y: 50, opacity: 0, duration: .9, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 88%' } }));
$$('.cnt').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countTo(el) }));

/* ticker (velocity aware) */
$$('.tk').forEach((tk, n) => {
  let x = 0; const dir = n % 2 ? 1 : -1;
  gsap.ticker.add(() => { const half = tk.scrollWidth / 2; x += dir * (.55 + Math.abs(scrollVel) / 260); if (x <= -half) x += half; if (x > 0) x -= half; tk.style.transform = `translateX(${x}px)`; });
});

/* statement: words light up while scrolling */
$$('.statement p').forEach(p => {
  const ws = []; const walk = node => [...node.childNodes].forEach(c => {
    if (c.nodeType === 3) { const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(w)); return; } const s = document.createElement('span'); s.className = 'sw'; s.textContent = w; f.appendChild(s); ws.push(s); }); c.replaceWith(f); }
    else if (c.nodeType === 1) { if (c.classList.contains('inl')) { c.classList.add('sw'); ws.push(c); } else walk(c); }
  }); walk(p);
  gsap.to(ws, { opacity: 1, stagger: .5, ease: 'none', scrollTrigger: { trigger: p, start: 'top 78%', end: 'bottom 52%', scrub: true } });
});

/* bento: fill from the side the cursor enters */
$$('.bx').forEach(b => {
  const set = e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%'); b.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%'); };
  b.addEventListener('mouseenter', set); b.addEventListener('mouseleave', set);
});
$$('.bento').forEach(g => gsap.from(g.children, { y: 70, opacity: 0, scale: .96, duration: 1.1, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: g, start: 'top 85%' } }));

/* orbit */
$$('.orbit').forEach(o => {
  $$('.ring', o).forEach((r, ri) => {
    const slots = $$('.slot', r), n = slots.length, off = ri * 0.6;
    slots.forEach((s, i) => { const a = off + i / n * Math.PI * 2; s.style.left = (50 + 50 * Math.cos(a)) + '%'; s.style.top = (50 + 50 * Math.sin(a)) + '%'; });
    const dur = 40 + ri * 16, dir = ri % 2 ? -1 : 1;
    const t1 = gsap.to(r, { rotation: 360 * dir, duration: dur, repeat: -1, ease: 'none' });
    const t2 = gsap.to($$('.chipo', r), { rotation: -360 * dir, duration: dur, repeat: -1, ease: 'none' });
    if (!touch) { o.addEventListener('mouseenter', () => { t1.timeScale(.15); t2.timeScale(.15); }); o.addEventListener('mouseleave', () => { gsap.to([t1, t2], { timeScale: 1, duration: 1 }); }); }
  });
  gsap.fromTo($('.pulse', o), { scale: 1, opacity: .7 }, { scale: 2.6, opacity: 0, duration: 2.6, repeat: -1, ease: 'power2.out' });
  gsap.from($$('.ring', o), { scale: .4, opacity: 0, duration: 1.4, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: o, start: 'top 80%' } });
  gsap.from($('.core', o), { scale: 0, duration: 1.2, ease: 'back.out(1.7)', scrollTrigger: { trigger: o, start: 'top 80%' } });
});

/* command center */
if ($('.cc')) {
  const d = $('.dash2'), kps = $$('.kp b[data-from]'), kp = { p: 0 };
  const kFmt = (b, v) => (b.dataset.pre || '') + (b.dataset.fmt === 'in' ? Math.round(v).toLocaleString('en-IN') : v.toFixed(+b.dataset.dec || 0)) + (b.dataset.suf || '');
  kps.forEach(b => b.textContent = kFmt(b, +b.dataset.from));
  const lines = $$('.chart .ln'); lines.forEach(l => { const L = l.getTotalLength(); l.style.strokeDasharray = L; l.style.strokeDashoffset = L; });
  const area = $('.chart .area');
  const desk = !matchMedia('(max-width:820px)').matches;
  const tl = gsap.timeline({ scrollTrigger: desk ? { trigger: '.cc', start: 'top top', end: 'bottom bottom', scrub: 1 } : { trigger: d, start: 'top 75%' } });
  tl.fromTo(d, { rotateX: desk ? 38 : 0, y: desk ? 160 : 40, scale: desk ? .8 : .96, opacity: .2, transformPerspective: 1400 }, { rotateX: 0, y: 0, scale: 1, opacity: 1, duration: 1, ease: 'power2.out' })
    .from('.dash2 .kp', { y: 30, opacity: 0, stagger: .08, duration: .5 }, '-=.5')
    .to(lines, { strokeDashoffset: 0, duration: 1.2, stagger: .15, ease: 'none' }, '-=.2')
    .fromTo(area, { opacity: 0 }, { opacity: 1, duration: .6 }, '<.4')
    .to(kp, { p: 1, duration: 1.2, ease: 'none', onUpdate: () => kps.forEach(b => { const f = +b.dataset.from, t = +b.dataset.to; b.textContent = kFmt(b, f + (t - f) * kp.p); }) }, '<-.4')
    .from('.dash2 aside .ch', { x: -20, opacity: 0, stagger: .08, duration: .4 }, 0.4);
  if (desk) tl.to({}, { duration: .4 });
}

/* process timeline */
$$('.steps').forEach(s => {
  gsap.to($('.rail i', s), { scaleY: 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top 62%', end: 'bottom 62%', scrub: true } });
  $$('.st', s).forEach(st => {
    ScrollTrigger.create({ trigger: st, start: 'top 64%', onEnter: () => st.classList.add('on'), onLeaveBack: () => st.classList.remove('on') });
    gsap.from([$('h3', st), $('p', st), $('.t', st)], { y: 30, opacity: 0, stagger: .08, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 80%' } });
  });
});

/* audit scanner */
$$('.term').forEach(t => {
  const items = $$('li', t), cnt = $('.ft b', t);
  ScrollTrigger.create({ trigger: t, start: 'top 72%', once: true, onEnter: () => {
    items.forEach((li, i) => {
      setTimeout(() => li.classList.add('run'), i * 380);
      setTimeout(() => { li.classList.remove('run'); li.classList.add('ok'); $('.s', li).textContent = '✓'; if (cnt) cnt.textContent = (i + 1) + '/' + items.length; }, i * 380 + 340);
    });
  } });
  gsap.from(t, { y: 60, opacity: 0, rotateX: 12, transformPerspective: 1200, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 85%' } });
});

/* horizontal case studies */
if ($('.hc-pin')) {
  const tr = $('.hc-track');
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': function () {
      const dist = () => tr.scrollWidth - innerWidth;
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.hc-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
      tl.to(tr, { x: () => -dist(), ease: 'none' });
      $$('.cs', tr).forEach(c => gsap.from(c, { rotate: 4, y: 60, opacity: .3, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tl, start: 'left 105%', end: 'left 55%', scrub: true } }));
    },
    '(max-width: 900px)': function () {
      tr.style.cssText = 'flex-direction:column;width:auto;padding:0 18px';
      $$('.cs', tr).forEach(c => { c.style.width = 'auto'; gsap.from(c, { y: 60, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' } }); });
    }
  });
}
$$('.cs-grid .cs, .live, .ms, .plan, .tool, .related a, .proof div, .vs-card, .chn, .qa').forEach((c, i) => gsap.from(c, { y: 50, opacity: 0, duration: 1, delay: (i % 3) * .07, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 92%' } }));
$$('.frame').forEach(f => { gsap.from(f, { rotateY: -18, rotateX: 8, scale: .9, opacity: 0, transformPerspective: 1200, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%' } }); });

/* testimonials */
$$('.tq').forEach(w => {
  const tabs = $$('.tab', w), qs = $$('.q', w); let i = 0, tm, bar;
  function show(n) {
    i = n; tabs.forEach((t, k) => t.classList.toggle('on', k === n));
    qs.forEach((q, k) => { if (k === n) { q.classList.add('on'); gsap.fromTo($('blockquote', q), { y: 30, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .9, ease: 'expo.out' }); } else q.classList.remove('on'); });
    bar && bar.kill(); tabs.forEach(t => gsap.set($('.pr', t), { scaleX: 0 }));
    bar = gsap.to($('.pr', tabs[n]), { scaleX: 1, duration: 7, ease: 'none', onComplete: () => show((i + 1) % tabs.length) });
  }
  tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
  ScrollTrigger.create({ trigger: w, start: 'top 75%', once: true, onEnter: () => show(0) });
});

/* blog filter */
if ($('.filters')) {
  const posts = $$('.posts.all .pc');
  $$('.filter').forEach(f => f.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.toggle('on', x === f));
    const c = f.dataset.cat, show = posts.filter(p => c === 'all' || p.dataset.cat === c), hide = posts.filter(p => !show.includes(p));
    gsap.to(hide, { opacity: 0, scale: .94, duration: .3, onComplete: () => {
      hide.forEach(p => p.style.display = 'none'); show.forEach(p => p.style.display = '');
      gsap.fromTo(show, { opacity: 0, y: 30 }, { opacity: 1, y: 0, scale: 1, stagger: .05, duration: .6, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() });
    } });
    if (!hide.length) gsap.fromTo(show, { opacity: 0 }, { opacity: 1, stagger: .04, duration: .4 });
  }));
}
$$('.posts').forEach(g => gsap.from(g.children, { y: 60, opacity: 0, duration: 1, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: g, start: 'top 88%' } }));

/* services side nav + blocks */
if ($('.svc-nav')) {
  const links = $$('.svc-nav a');
  links.forEach(a => { const s = $(a.getAttribute('href')); s && ScrollTrigger.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: st => { if (st.isActive) { links.forEach(l => l.classList.toggle('on', l === a)); if (matchMedia('(max-width:1000px)').matches) a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } } }); });
  $$('.sblock').forEach(b => { gsap.from([$('.hd', b), $('.tags', b), $('.desc', b)], { y: 40, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 80%' } }); gsap.from($$('.checks2 li', b), { y: 30, opacity: 0, stagger: .05, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: $('.checks2', b), start: 'top 88%' } }); });
}

/* article: progress + toc */
if ($('.prose') && $('.read-prog')) {
  gsap.to('.read-prog', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.prose', start: 'top 30%', end: 'bottom bottom', scrub: .3 } });
  const toc = $('.art-toc');
  if (toc) {
    const hs = $$('.prose > h2');
    hs.forEach((h, i) => { h.id = h.id || 'sec-' + (i + 1); const a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent; toc.appendChild(a); });
    const ls = $$('a', toc);
    hs.forEach((h, i) => ScrollTrigger.create({ trigger: h, start: 'top 40%', endTrigger: hs[i + 1] || '.prose', end: hs[i + 1] ? 'top 40%' : 'bottom 40%', onToggle: st => { if (st.isActive) ls.forEach((l, k) => l.classList.toggle('on', k === i)); } }));
    if (!hs.length) toc.remove();
  }
  $$('.prose > h2, .prose > h3').forEach(h => gsap.from(h, { y: 30, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('.prose .callout, .prose .key-points').forEach(c => gsap.from(c, { scale: .95, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
}
if ($('.art-cta')) gsap.from('.art-cta', { clipPath: 'inset(12% 12% 12% 12% round 36px)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.art-cta', start: 'top 85%' } });

/* legal toc */
if ($('.toc')) {
  const ls = $$('.toc a');
  ls.forEach(a => { const s = $(a.getAttribute('href')); s && ScrollTrigger.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: st => { if (st.isActive) ls.forEach(l => l.classList.toggle('on', l === a)); } }); });
}

/* faq */
initFaq();
function initFaq() {
  $$('.qa').forEach(q => {
    const btn = $('button', q), ans = $('.ans', q);
    btn.addEventListener('click', () => {
      const open = q.classList.contains('open');
      $$('.qa.open').forEach(o => { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); if (window.gsap) gsap.to($('.ans', o), { height: 0, duration: .5, ease: 'power3.inOut' }); else $('.ans', o).style.height = '0'; });
      if (!open) { q.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); if (window.gsap) gsap.to(ans, { height: 'auto', duration: .6, ease: 'power3.inOut', onComplete: () => window.ScrollTrigger && ScrollTrigger.refresh() }); else ans.style.height = 'auto'; }
    });
  });
}

/* CTA + footer */
$$('.cta').forEach(c => {
  const ball = $('.cta-ball', c);
  gsap.from(ball, { scale: 0, rotate: -90, duration: 1.4, ease: 'back.out(1.6)', scrollTrigger: { trigger: ball, start: 'top 92%' } });
  gsap.from($$('.glow', c), { scale: .3, opacity: 0, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 75%' } });
});
$$('.bigword').forEach(b => gsap.to($('.f', b), { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: b, start: 'top 98%', end: 'bottom 92%', scrub: true } }));

initForm();

/* ---------------- contact form (Formspree) ---------------- */
function initForm() {
  const f = $('#cf'); if (!f || f.dataset.bound) return; f.dataset.bound = 1;
  const status = $('.f-status', f), btn = $('[type=submit]', f);
  f.addEventListener('submit', async e => {
    if (!window.fetch) return;
    e.preventDefault(); status.textContent = ''; status.classList.remove('err');
    const old = btn.innerHTML; btn.disabled = true; $('.bt', btn) && ($('.bt', btn).textContent = 'Sending…');
    try {
      const res = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('bad');
      try { if (typeof gtag === 'function') gtag('event', 'generate_lead', { method: 'contact_form' }); } catch (x) {}
      try { if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'contact_form' }); } catch (x) {}
      const done = document.createElement('div'); done.className = 'form-done';
      done.innerHTML = '<div class="ok"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div><h3>Message sent.</h3><p>Thanks, we\'ll reply within 1 business day. For a faster answer, message us on <a href="' + (document.body.dataset.wa || '#') + '" style="color:var(--cobalt-l)">WhatsApp</a>.</p>';
      if (window.gsap) gsap.to(f, { opacity: 0, y: -20, duration: .35, onComplete: () => { f.replaceWith(done); gsap.from(done, { scale: .85, opacity: 0, duration: .8, ease: 'back.out(1.7)' }); } });
      else f.replaceWith(done);
    } catch (err) {
      btn.disabled = false; btn.innerHTML = old; status.classList.add('err');
      const em = document.body.dataset.email || '';
      status.innerHTML = 'Something went wrong sending that. Please email <a href="mailto:' + em + '" style="color:inherit;text-decoration:underline">' + (em || 'us') + '</a> or try WhatsApp.';
    }
  });
}
function initMenuBasic() {
  const o = $('#overlay'), b = $('#menuBtn'); if (!o || !b) return;
  b.addEventListener('click', () => { const op = b.classList.toggle('open'); o.style.visibility = op ? 'visible' : 'hidden'; o.style.clipPath = op ? 'inset(0)' : 'inset(0 0 100% 0)'; });
}

addEventListener('load', () => ScrollTrigger.refresh());
let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => ScrollTrigger.refresh(), 250); });
})();
