/* =====================================================================
   ivia solutions — motion + interactions (shared by every page)
   Requires: three r128, gsap 3.12 + ScrollTrigger, lenis (all optional;
   the page stays usable if any fail to load)
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
addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = -(e.clientY / innerHeight * 2 - 1);
});

/* =====================================================================
   WEBGL ORB
   ===================================================================== */
const blob = { x: .9, y: 0, s: 1, c: 0 }, blobT = { x: .9, y: 0, s: 1, c: 0 };
let scrollVel = 0;
window.__blobPulse = 0;
const palettes = [
  [[.04, .04, .045], [.32, .1, .03], [1, .42, .16]],
  [[.045, .04, .04], [.16, .14, .12], [.94, .84, .66]],
  [[.05, .035, .03], [.45, .14, .04], [1, .72, .5]]
];
(function initGL() {
  if (typeof THREE === 'undefined' || reduce) return;
  const canvas = $('#gl'); if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, .1, 100); cam.position.z = 6;
  const noise = `vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
  const uni = {
    uTime: { value: 0 }, uAmp: { value: .16 }, uFreq: { value: .75 }, uMouse: { value: new THREE.Vector2() },
    uA: { value: new THREE.Vector3(...palettes[0][0]) }, uB: { value: new THREE.Vector3(...palettes[0][1]) },
    uC: { value: new THREE.Vector3(...palettes[0][2]) }, uAlpha: { value: 1 }
  };
  const vs = noise + `uniform float uTime,uAmp,uFreq;uniform vec2 uMouse;varying float vD;varying vec3 vN;varying vec3 vV;
void main(){vec3 p=position;float n=snoise(normal*uFreq+vec3(uTime*.18,uTime*.12,0.)+vec3(uMouse*.5,0.));
float n2=snoise(normal*uFreq*1.8-uTime*.15)*.22;float d=(n+n2)*uAmp;p+=normal*d;vD=d;
vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
  const fs = `uniform vec3 uA,uB,uC;uniform float uAlpha;varying float vD;varying vec3 vN;varying vec3 vV;
void main(){vec3 n=normalize(vN);float f=pow(1.-max(dot(n,normalize(vV)),0.),2.6);vec3 col=mix(uA,uB,smoothstep(-.25,.3,vD));
col+=uC*f*1.15;col+=uC*pow(max(dot(n,normalize(vec3(-.4,.7,.6))),0.),24.)*.55;col+=uB*pow(max(dot(n,normalize(vec3(.6,-.5,.4))),0.),6.)*.35;gl_FragColor=vec4(col,uAlpha);}`;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, small ? 32 : 64), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vs, fragmentShader: fs }));
  const group = new THREE.Group(); group.add(mesh); scene.add(group);
  const N = small ? 700 : 1800, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2.5 + Math.random() * 6, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); pos[i * 3 + 2] = r * Math.cos(p) - 2;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .016, color: 0xefebe4, transparent: true, opacity: .35, depthWrite: false }));
  scene.add(pts);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .006, 8, 200), new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: .35 }));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, .004, 8, 200), new THREE.MeshBasicMaterial({ color: 0xefebe4, transparent: true, opacity: .14 }));
  ring.rotation.x = 1.2; ring2.rotation.x = 1.6; ring2.rotation.y = .4; group.add(ring); group.add(ring2);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  const clock = new THREE.Clock(); const sm = { x: 0, y: 0 };
  let visible = true; document.addEventListener('visibilitychange', () => visible = !document.hidden);
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();
    uni.uTime.value = t;
    sm.x += (mouse.nx - sm.x) * .05; sm.y += (mouse.ny - sm.y) * .05;
    uni.uMouse.value.set(sm.x, sm.y);
    for (const k of ['x', 'y', 's', 'c']) blob[k] += (blobT[k] - blob[k]) * .045;
    const v = clamp(Math.abs(scrollVel) / 2500, 0, 1);
    window.__blobPulse *= .92;
    uni.uAmp.value = .14 + v * .22 + window.__blobPulse * .45 + Math.sin(t * .6) * .025;
    uni.uFreq.value = .75 + v * .35;
    const ci = Math.floor(blob.c) % 3, cn = (ci + 1) % 3, f = blob.c - Math.floor(blob.c);
    ['uA', 'uB', 'uC'].forEach((u, j) => {
      const a = palettes[ci][j], b = palettes[cn][j];
      uni[u].value.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    });
    group.position.set(blob.x * (small ? .35 : 1) * 1.6, blob.y, 0);
    group.scale.setScalar(blob.s * (small ? .6 : 1));
    group.rotation.y = t * .15 + sm.x * .5; group.rotation.x = sm.y * .4 + t * .05;
    ring.rotation.z = t * .4; ring2.rotation.z = -t * .3;
    pts.rotation.y = t * .03 + sm.x * .15; pts.rotation.x = sm.y * .1;
    pts.position.y = (window.scrollY || 0) * .0006;
    cam.position.x += (sm.x * .4 - cam.position.x) * .05; cam.position.y += (sm.y * .3 - cam.position.y) * .05; cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
  })();
})();

/* shared pointer: position + inside-window flag; listeners run on move, scroll and leave */
const ptr = { x: -9999, y: -9999, in: false }, ptrFns = [];
const onPtr = fn => ptrFns.push(fn);
let ptrQ = false; const ptrRun = () => { ptrQ = false; ptrFns.forEach(f => f()); };
const ptrSoon = () => { if (!ptrQ) { ptrQ = true; requestAnimationFrame(ptrRun); } };
addEventListener('mousemove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.in = true; ptrSoon(); }, { passive: true });
addEventListener('scroll', ptrSoon, { passive: true });
document.addEventListener('mouseout', e => { if (!e.relatedTarget) { ptr.in = false; ptrSoon(); } });
addEventListener('blur', () => { ptr.in = false; ptrSoon(); });

/* =====================================================================
   HELPERS
   ===================================================================== */
function splitChars(el) {
  const out = [];
  const walk = node => {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          const wd = document.createElement('span'); wd.className = 'wd';
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; wd.appendChild(s); out.push(s); });
          frag.appendChild(wd);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') {
        if (c.classList.contains('grad')) {
          c.classList.remove('grad');
          const before = out.length; walk(c); out.slice(before).forEach(s => s.classList.add('grad'));
        } else walk(c);
      }
    });
  };
  walk(el); return out;
}
const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%₹×#';
function scramble(el, final, dur = 600) {
  if (!el) return;
  final = final ?? el.dataset.final ?? el.textContent; el.dataset.final = final;
  const start = performance.now();
  (function f(n) {
    const p = Math.min((n - start) / dur, 1); let s = '';
    for (let i = 0; i < final.length; i++) s += (i < p * final.length || final[i] === ' ') ? final[i] : SCR[Math.floor(Math.random() * SCR.length)];
    el.textContent = s; if (p < 1) requestAnimationFrame(f);
  })(start);
}
function countTo(el, dur = 1.6) {
  const to = parseFloat(el.dataset.to), dec = +el.dataset.dec || 0, pre = el.dataset.pre || '', suf = el.dataset.suf || '', loc = el.dataset.fmt === 'in';
  const o = { v: 0 };
  const fmt = v => pre + (loc ? Math.round(v).toLocaleString('en-IN') : v.toFixed(dec)) + suf;
  if (typeof gsap === 'undefined') { el.textContent = fmt(to); return; }
  gsap.to(o, { v: to, duration: dur, ease: 'expo.out', onUpdate: () => el.textContent = fmt(o.v) });
}

/* =====================================================================
   FALLBACK: no GSAP → show everything, keep page usable
   ===================================================================== */
if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
  document.documentElement.classList.add('no-motion');
  const l = $('#loader'); l && l.remove();
  const c = $('#curtain'); c && c.remove();
  $$('.cnt').forEach(el => countTo(el));
  initForm(); initFaqBasic(); initCalcs(); initConsoles(); initMMM();
  return;
}
gsap.registerPlugin(ScrollTrigger);

/* smooth scroll */
let lenis = null;
if (typeof Lenis !== 'undefined' && !reduce) {
  lenis = new Lenis({ lerp: .085 });
  lenis.on('scroll', e => { ScrollTrigger.update(); scrollVel = e.velocity * 60; });
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollToEl = el => { if (!el) return; lenis ? lenis.scrollTo(el, { duration: 1.6, offset: -20 }) : el.scrollIntoView({ behavior: 'smooth' }); };

/* =====================================================================
   PAGE TRANSITIONS (curtain)
   ===================================================================== */
const curtain = $('#curtain');
if (curtain) curtain.style.animation = 'none';
function isInternal(a) {
  const h = a.getAttribute('href') || '';
  if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || a.target === '_blank' || a.hasAttribute('download')) return false;
  try { const u = new URL(a.href, location.href); return u.origin === location.origin && !(u.pathname === location.pathname && u.hash); } catch (e) { return false; }
}
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  const h = a.getAttribute('href');
  // same-page anchors (also "/#x" style when already on that page)
  if (h.startsWith('#')) { let t = null; try { t = h.length > 1 ? $(h) : null; } catch (x) {} if (t) { e.preventDefault(); closeMenu(); setTimeout(() => scrollToEl(t), 300); } return; }
  if (!isInternal(a) || !curtain) return;
  e.preventDefault();
  const lbl = a.dataset.label || (a.textContent || '').trim().split('\n')[0].slice(0, 28) || 'ivia';
  $('span', curtain).textContent = lbl.replace(/[↗→←]/g, '').trim();
  gsap.set(curtain, { display: 'flex', clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.to(curtain, { clipPath: 'inset(0% 0% 0% 0%)', duration: .75, ease: 'expo.inOut', onComplete: () => { location.href = a.href; } });
});
addEventListener('pageshow', e => { if (e.persisted && curtain) gsap.set(curtain, { clipPath: 'inset(0% 0% 100% 0%)' }); });

/* =====================================================================
   CURSOR + CLICK BURSTS
   ===================================================================== */
const cur = $('#cur'), curLbl = cur && $('span', cur);
if (cur && !touch) {
  const qx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
  addEventListener('mousemove', e => { qx(e.clientX); qy(e.clientY); });
  let lx = 0, ly = 0;
  gsap.ticker.add(() => {
    const dx = mouse.x - lx, dy = mouse.y - ly; lx = mouse.x; ly = mouse.y;
    const sp = clamp(Math.hypot(dx, dy) / 30, 0, .6);
    if (!cur.dataset.big) gsap.set(cur, { scaleX: 1 + sp, scaleY: 1 - sp * .5, rotate: Math.atan2(dy, dx) * 180 / Math.PI });
  });
  const HOV = 'a,button,input,select,textarea,label,[role=button]';
  let curState = '';
  const curSet = el => {
    const t = el && el.closest ? el.closest('[data-cursor]') : null;
    const h = !t && el && el.closest ? el.closest(HOV) : null;
    const st = t ? 'lab:' + t.dataset.cursor : h ? 'hov' : '';
    if (st === curState) return; curState = st;
    gsap.killTweensOf(cur, 'scale,scaleX,scaleY,rotate');
    if (t) { cur.classList.add('lab'); cur.dataset.big = 1; curLbl.textContent = t.dataset.cursor; gsap.to(cur, { scale: 6, scaleX: 6, scaleY: 6, rotate: 0, duration: .4, ease: 'power3' }); }
    else if (h) { cur.classList.remove('lab'); cur.dataset.big = 1; gsap.to(cur, { scale: 3, scaleX: 3, scaleY: 3, rotate: 0, duration: .3 }); }
    else { cur.classList.remove('lab'); delete cur.dataset.big; gsap.to(cur, { scale: 1, scaleX: 1, scaleY: 1, duration: .4 }); }
  };
  let px = -1, py = -1, inWin = false, recheck = false;
  const curCheck = () => { recheck = false; curSet(inWin && px >= 0 ? document.elementFromPoint(px, py) : null); };
  const curSoon = () => { if (!recheck) { recheck = true; requestAnimationFrame(curCheck); } };
  addEventListener('mousemove', e => { px = e.clientX; py = e.clientY; inWin = true; curSoon(); }, { passive: true });
  document.addEventListener('mouseover', e => { inWin = true; curSet(e.target); });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) { inWin = false; curSet(null); } else curSet(e.relatedTarget); });
  addEventListener('scroll', curSoon, { passive: true });
  addEventListener('wheel', curSoon, { passive: true });
  addEventListener('blur', () => { inWin = false; curSet(null); });
  document.addEventListener('click', () => setTimeout(curSoon, 60));
  setInterval(() => { if (inWin) curCheck(); }, 500); // safety net: content that moves or disappears under a still mouse
}
addEventListener('pointerdown', e => {
  if (e.target.closest('input,select,textarea')) return;
  window.__blobPulse = .45;
  const cols = ['#ff5a1f', '#d9c7a3', '#ff9a6b', '#efebe4'];
  for (let i = 0; i < 12; i++) {
    const d = document.createElement('div'); d.className = 'burst';
    d.style.left = e.clientX - 4 + 'px'; d.style.top = e.clientY - 4 + 'px'; d.style.background = cols[i % cols.length];
    document.body.appendChild(d);
    const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 80;
    gsap.to(d, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 0, duration: .8 + Math.random() * .4, ease: 'expo.out', onComplete: () => d.remove() });
  }
});

/* =====================================================================
   MENU OVERLAY
   ===================================================================== */
const ov = $('#overlay'), mb = $('#menuBtn'), pv = ov && $('.pv', ov);
let menuOpen = false;
const ovLinks = ov ? $$('a.big', ov) : [];
function openMenu() {
  menuOpen = true; mb.classList.add('open'); lenis && lenis.stop(); document.documentElement.classList.add('menu-open');
  gsap.to(ov, { clipPath: 'circle(150% at calc(100% - 60px) 40px)', duration: 1, ease: 'expo.inOut' });
  gsap.fromTo(ovLinks, { yPercent: 120, rotate: 6 }, { yPercent: 0, rotate: 0, stagger: .07, duration: 1, delay: .35, ease: 'expo.out' });
  gsap.fromTo('.ov-foot', { opacity: 0, y: 20 }, { opacity: 1, y: 0, delay: .8 });
  gsap.fromTo('.ov-svc > *', { opacity: 0, x: 40 }, { opacity: 1, x: 0, stagger: .04, delay: .5, duration: .7, ease: 'expo.out' });
  scramble($('.scr', mb), 'Close');
}
function closeMenu() {
  if (!menuOpen) return; menuOpen = false; mb.classList.remove('open'); lenis && lenis.start(); document.documentElement.classList.remove('menu-open');
  gsap.to(ov, { clipPath: 'circle(0% at calc(100% - 60px) 40px)', duration: .8, ease: 'expo.inOut' });
  scramble($('.scr', mb), 'Menu');
}
if (ov && mb) {
  mb.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const pvx = gsap.quickTo(pv, 'x', { duration: .5, ease: 'power3' }), pvy = gsap.quickTo(pv, 'y', { duration: .5, ease: 'power3' });
  ov.addEventListener('mousemove', e => { pvx(e.clientX + 30); pvy(e.clientY - 60); });
  // The hover style swaps the font (serif italic, narrower) and the text scrambles; if the link's own box changed size or moved,
  // the mouse would fall off it, un-hover, grow back, re-hover... (the jitter loop). Lock each link's box to its normal width
  // and slide only the text inside it.
  const kids = a => $$(':scope > span, :scope > sup', a);
  const lockW = () => ovLinks.forEach(a => { if (a.matches(':hover')) return; a.style.width = ''; a.style.width = Math.ceil(a.getBoundingClientRect().width) + 'px'; });
  lockW(); document.fonts && document.fonts.ready.then(lockW); addEventListener('resize', lockW);
  ovLinks.forEach(a => {
    a.addEventListener('mouseenter', () => {
      $('b', pv).textContent = a.dataset.stat; $('small', pv).textContent = a.dataset.sub;
      gsap.to(pv, { opacity: 1, scale: 1, rotate: gsap.utils.random(-8, 8), duration: .4, ease: 'back.out(2)', overwrite: 'auto' });
      scramble($('.t', a) || a, null, 450);
      gsap.to(ovLinks.filter(x => x !== a), { opacity: .3, duration: .3, overwrite: 'auto' }); gsap.to(a, { opacity: 1, duration: .3, overwrite: 'auto' }); gsap.to(kids(a), { x: 30, duration: .4, overwrite: 'auto' });
    });
    a.addEventListener('mouseleave', () => pvHide(a));
  });
  function pvHide(a) {
    gsap.to(pv, { opacity: 0, scale: .5, duration: .3, overwrite: 'auto' });
    gsap.to(ovLinks, { opacity: 1, duration: .3, overwrite: 'auto' });
    gsap.to(a ? kids(a) : ovLinks.flatMap(kids), { x: 0, duration: .4, overwrite: 'auto' });
  }
  // safety net: pointer no longer on a big menu link (moved fast, left the window, menu closed) -> hide the card
  ov.addEventListener('mouseleave', () => pvHide());
  ov.addEventListener('mouseover', e => { if (!e.target.closest('a.big')) pvHide(); });
  mb.addEventListener('click', () => setTimeout(() => { if (!menuOpen) pvHide(); }, 0));
  addEventListener('keydown', e => { if (e.key === 'Escape') pvHide(); });
}

/* =====================================================================
   MAGNETIC BUTTONS
   ===================================================================== */
if (!touch) $$('.mag').forEach(b => {
  const fill = $('.fill', b);
  b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .35, y: (e.clientY - r.top - r.height / 2) * .45, duration: .4, ease: 'power3' }); });
  if (fill) {
    b.addEventListener('mouseenter', e => { const r = b.getBoundingClientRect(); gsap.fromTo(fill, { yPercent: e.clientY < r.top + r.height / 2 ? -101 : 101 }, { yPercent: 0, duration: .45, ease: 'power3.out' }); });
    b.addEventListener('mouseleave', e => { const r = b.getBoundingClientRect(); gsap.to(fill, { yPercent: e.clientY < r.top + r.height / 2 ? -101 : 101, duration: .45, ease: 'power3.in' }); });
  }
  b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.35)' }));
});

/* =====================================================================
   INTRO: home loader (first visit per session) or curtain reveal
   ===================================================================== */
const heroTitle = $('#heroTitle');
const pTitle = $('.phero h1, .art-hero h1, .nf h1, .bv-hero h1');
const heroChars = [];
if (heroTitle) $$('.row', heroTitle).forEach(r => heroChars.push(...splitChars(r)));
const pChars = pTitle ? splitChars(pTitle) : [];
const heroBits = $$('.h-in, .phero .crumb, .phero-foot > *, .art-hero .back, .art-meta, .art-hero .intro, .nf p, .nf .cta-row, .badge');
gsap.set(heroBits, { opacity: 0, y: 40 });
gsap.set('nav', { opacity: 0 });
gsap.set([...heroChars, ...pChars], { yPercent: 120, rotateX: -90, opacity: 0, transformOrigin: '50% 100%' });

function heroIn() {
  const tl = gsap.timeline();
  tl.to([...heroChars, ...pChars], { yPercent: 0, rotateX: 0, opacity: 1, stagger: { each: heroChars.length ? .025 : .02 }, duration: 1.2, ease: 'expo.out' })
    .to('nav', { opacity: 1, duration: .6 }, 0)
    .to(heroBits, { opacity: 1, y: 0, stagger: .1, duration: .9, ease: 'power3.out' }, .3)
    .add(() => { window.__blobPulse = .6; }, 0);
  return tl;
}
const loader = $('#loader');
let seen = false;
try { seen = sessionStorage.getItem('bv_seen') === '1'; sessionStorage.setItem('bv_seen', '1'); } catch (e) {}
const intro = gsap.timeline({ delay: .1 });
if (loader && !seen && !reduce) {
  if (curtain) gsap.set(curtain, { display: 'none' });
  const ldNum = $('#ldNum'), cnt = { v: 0 };
  intro.to(cnt, { v: 100, duration: 2, ease: 'power3.inOut', onUpdate: () => { ldNum.textContent = String(Math.round(cnt.v)).padStart(3, '0'); } })
    .to('#loader .ln', { scaleX: 1, duration: 2, ease: 'power3.inOut' }, 0)
    .add(() => scramble($('#ldLbl'), $('#ldLbl').dataset.to || 'EVERY CHANNEL. ONE TEAM.', 900), .4)
    .to('#loader .in', { scale: .9, opacity: 0, duration: .5, ease: 'power3.in' })
    .to('#loader .ln', { scaleY: 3, opacity: 0, duration: .3 }, '<')
    .to('#loader .sh.t', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=.1')
    .to('#loader .sh.b', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
    .from('#gl', { scale: 1.6, opacity: 0, duration: 1.8, ease: 'expo.out' }, '<')
    .set(loader, { display: 'none' })
    .add(heroIn(), '-=1');
} else {
  loader && loader.remove();
  if (curtain) intro.to(curtain, { clipPath: 'inset(0% 0% 100% 0%)', duration: .9, ease: 'expo.inOut' }).set(curtain, { display: 'none' });
  intro.add(heroIn(), curtain ? '-=.45' : 0);
}
intro.add(() => { lenis && lenis.start(); ScrollTrigger.refresh(); }, curtain || loader ? '-=1.2' : 0);

/* =====================================================================
   GLOBAL SCROLL EFFECTS
   ===================================================================== */
const prog = $('#prog'); if (prog) gsap.to(prog, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
$$('[data-blob]').forEach(sec => {
  const [x, y, s, c] = sec.dataset.blob.split(',').map(Number);
  ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: st => { if (st.isActive) { blobT.x = x; blobT.y = y; blobT.s = s; blobT.c = c; } } });
});
{ const first = $('[data-blob]'); if (first) { const [x, y, s, c] = first.dataset.blob.split(',').map(Number); Object.assign(blob, { x, y, s, c }); Object.assign(blobT, { x, y, s, c }); } }
const skewEls = $$('.svc-grid,.blog,.reasons,.chips,.plans,.related,.tool-grid,.pairs');
const skewSet = skewEls.map(el => gsap.quickTo(el, 'skewY', { duration: .6, ease: 'power3' }));
gsap.ticker.add(() => { const sk = small ? 0 : clamp(scrollVel / 400, -5, 5); skewSet.forEach(f => f(sk)); });

/* marquee */
function marquee(el, dir) {
  let x = 0; const half = () => el.scrollWidth / 2;
  gsap.ticker.add(() => {
    const boost = 1 + Math.abs(scrollVel) / 180; x += dir * -1.2 * boost * (scrollVel < 0 ? -1 : 1);
    const h = half(); if (x <= -h) x += h; if (x > 0) x -= h;
    gsap.set(el, { x, skewX: clamp(-scrollVel / 120, -18, 18) * dir });
  });
}
$$('.mq-row').forEach((r, i) => marquee(r, i % 2 ? -1 : 1));
if ($('#mq1')) gsap.fromTo('#mq1', { fontWeight: 300 }, { fontWeight: 650, ease: 'none', scrollTrigger: { trigger: '.mq', start: 'top bottom', end: 'bottom top', scrub: true } });

/* split titles */
$$('.split').forEach(h => {
  const cs = splitChars(h);
  gsap.from(cs, { yPercent: 110, rotateX: -100, opacity: 0, transformOrigin: '50% 100% -30px', stagger: .016, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 86%', toggleActions: 'play none none reverse' } });
  gsap.fromTo(h, { fontWeight: 300 }, { fontWeight: 600, ease: 'none', scrollTrigger: { trigger: h, start: 'top 90%', end: 'top 40%', scrub: true } });
});
$$('.fade').forEach(el => gsap.from(el, { y: 50, opacity: 0, filter: 'blur(10px)', duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
$$('.cnt').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => countTo(el) }));

/* =====================================================================
   HOME MODULES
   ===================================================================== */
if (heroChars.length && !touch) {
  const qs = heroChars.map(c => ({ y: gsap.quickTo(c, 'y', { duration: .5, ease: 'power3' }), s: gsap.quickTo(c, 'scale', { duration: .5, ease: 'power3' }), el: c }));
  let on = true, lifted = false;
  const hReset = () => { if (!lifted) return; lifted = false; qs.forEach(q => { q.y(0); q.s(1); }); };
  const hProx = () => {
    if (!on || !ptr.in) return hReset();
    if (intro.isActive()) return;
    lifted = true;
    qs.forEach(q => { const r = q.el.getBoundingClientRect(), d = Math.hypot(ptr.x - (r.left + r.width / 2), ptr.y - (r.top + r.height / 2)); const f = clamp(1 - d / 220, 0, 1); q.y(-f * 36); q.s(1 + f * .25); });
  };
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onToggle: s => { on = s.isActive; hProx(); } });
  onPtr(hProx);
}
if (heroChars.length) {
  gsap.fromTo(heroChars, { yPercent: 0, xPercent: 0, rotate: 0, opacity: 1 }, { immediateRender: false, yPercent: () => gsap.utils.random(-200, -40), xPercent: () => gsap.utils.random(-80, 80), rotate: () => gsap.utils.random(-60, 60), opacity: 0, ease: 'none', stagger: { each: .004, from: 'random' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.to('.hero-bottom,.hero .eyebrow', { y: -120, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } });
  gsap.to('.badge', { rotate: 360, scale: .4, y: 300, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}
if (pChars.length && $('.phero')) {
  gsap.fromTo(pChars, { yPercent: 0, rotate: 0, opacity: 1 }, { immediateRender: false, yPercent: () => gsap.utils.random(-120, -20), rotate: () => gsap.utils.random(-30, 30), opacity: 0, ease: 'none', stagger: { each: .003, from: 'random' }, scrollTrigger: { trigger: '.phero', start: '30% top', end: 'bottom top', scrub: 1 } });
}

/* stats band */
$$('.stat').forEach((s, i) => gsap.from(s, { y: 60, opacity: 0, duration: 1, delay: i * .1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%' } }));

/* cinematic */
if ($('.cine')) {
  const cineA = $('#cineA'), cineChars = splitChars(cineA), cineNum = $('#cineNum'), fChars = $$('#formula span');
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cine', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  tl.fromTo(cineA, { scale: 3.2, filter: 'blur(20px)', opacity: 0 }, { scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1, ease: 'power2.out' })
    .from(cineChars, { rotateY: 90, opacity: 0, stagger: .02, duration: .6 }, '<.2')
    .to(cineA, { scale: .6, opacity: 0, y: -100, duration: .8 }, '+=.4')
    .to('.cine .l2', { clipPath: 'circle(75% at 50% 50%)', duration: 1.2, ease: 'power2.inOut' }, '<.2')
    .fromTo(cineNum, { scale: .3, rotate: -12 }, { scale: 1, rotate: 0, duration: 1.2 }, '<')
    .to({ v: 0 }, { v: +cineNum.dataset.to || 44, duration: 1.4, ease: 'none', onUpdate() { cineNum.textContent = '−' + Math.round(this.targets()[0].v) + '%'; } }, '<')
    .to('.cine .l2', { clipPath: 'circle(0% at 50% 50%)', duration: 1, ease: 'power2.inOut' }, '+=.5')
    .to('.cine .l3', { opacity: 1, duration: .2 }, '<.5')
    .from(fChars, { y: () => gsap.utils.random(-300, 300), x: () => gsap.utils.random(-400, 400), rotate: () => gsap.utils.random(-90, 90), scale: 0, opacity: 0, stagger: .08, duration: 1, ease: 'back.out(1.5)' }, '<')
    .from('.cine .l3 p', { opacity: 0, y: 30, duration: .5 })
    .to({}, { duration: .6 });
}

/* service cards (3D) */
$$('.svc').forEach((c, i) => {
  gsap.from(c, { y: 200, z: -400, rotateX: gsap.utils.random(-60, -30), rotateY: gsap.utils.random(-40, 40), rotate: gsap.utils.random(-15, 15), opacity: 0, duration: 1.4, ease: 'expo.out', delay: (i % 3) * .12, scrollTrigger: { trigger: c, start: 'top 94%', toggleActions: 'play none none reverse' }, onComplete: () => { const sh = $('.shine', c); sh && gsap.fromTo(sh, { xPercent: -120 }, { xPercent: 120, duration: 1.2, ease: 'power2.inOut' }); } });
  const ico = $('.ico', c); ico && gsap.from(ico, { scale: 0, rotate: -200, duration: 1, delay: .4 + (i % 3) * .12, ease: 'back.out(3)', scrollTrigger: { trigger: c, start: 'top 94%', toggleActions: 'play none none reverse' } });
  tilt(c, 18, true);
});
function tilt(c, amt, spot) {
  if (touch) return;
  c.addEventListener('mousemove', e => {
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (spot) { c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px'); }
    gsap.to(c, { rotateY: (x / r.width - .5) * amt, rotateX: -(y / r.height - .5) * amt, scale: 1.02, transformPerspective: 1000, duration: .5, ease: 'power2' });
  });
  c.addEventListener('mouseenter', () => { const sh = $('.shine', c); sh && gsap.fromTo(sh, { xPercent: -120 }, { xPercent: 120, duration: .9, ease: 'power2.inOut' }); });
  c.addEventListener('mouseleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, scale: 1, duration: 1, ease: 'elastic.out(1,.4)' }));
}

/* dashboard pin */
if ($('.dsh')) {
  const dChart = $('#dChart'), bars = [], bv = [30, 42, 38, 55, 49, 62, 58, 70, 66, 78, 74, 85, 82, 92, 88, 97];
  bv.forEach(v => { const i = document.createElement('i'); i.style.height = v + '%'; dChart.appendChild(i); bars.push(i); });
  const kps = $$('.kp b[data-from]'), kp = { p: 0 };
  const kFmt = (b, v) => (b.dataset.pre || '') + (b.dataset.fmt === 'in' ? Math.round(v).toLocaleString('en-IN') : v.toFixed(+b.dataset.dec || 0)) + (b.dataset.suf || '');
  kps.forEach(b => b.textContent = kFmt(b, +b.dataset.from));
  const dt = gsap.timeline({ scrollTrigger: { trigger: '.dsh', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  dt.fromTo('#dash', { rotateX: 72, rotateZ: -14, y: 260, scale: .65, opacity: .3 }, { rotateX: 0, rotateZ: 0, y: 0, scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out' })
    .from('.dsh-stage h2', { y: -80, opacity: 0, duration: .6 }, 0)
    .from('.kp', { z: -300, opacity: 0, rotateY: 90, stagger: .1, duration: .6 }, '-=.6')
    .to(bars, { scaleY: 1, stagger: .04, duration: .7, ease: 'back.out(2)' }, '-=.3')
    .to(kp, { p: 1, duration: 1.2, ease: 'none', onUpdate: () => kps.forEach(b => { const f = +b.dataset.from, t = +b.dataset.to; b.textContent = kFmt(b, f + (t - f) * kp.p); }) }, '<')
    .to('#dash', { rotateY: -8, rotateX: 6, duration: .6 }, '<')
    .to('#dash', { scale: .85, y: -60, opacity: 0, rotateX: -30, duration: .8 }, '+=.3');
  setInterval(() => { if (!dt.scrollTrigger.isActive) return; bars.forEach((b, i) => gsap.to(b, { height: clamp(bv[i] + gsap.utils.random(-10, 10), 15, 100) + '%', duration: 1, ease: 'power2.inOut' })); }, 1600);
}

/* horizontal process */
if ($('.proc-pin')) {
  const pTrack = $('#pTrack'), steps = $$('.step', pTrack), pPath = $('#pPath');
  const pLen = pPath.getTotalLength(); gsap.set(pPath, { strokeDasharray: pLen, strokeDashoffset: pLen });
  const pDist = () => pTrack.scrollWidth - innerWidth;
  const pt = gsap.timeline({ scrollTrigger: { trigger: '.proc-pin', start: 'top top', end: () => '+=' + pDist() * 1.2, pin: true, scrub: 1, invalidateOnRefresh: true } });
  pt.to(pTrack, { x: () => -pDist(), ease: 'none' }, 0).to(pPath, { strokeDashoffset: 0, ease: 'none' }, 0);
  const ca = pt.getChildren()[0];
  steps.forEach(s => {
    gsap.fromTo(s, small ? { opacity: .35, scale: .94 } : { rotateY: -55, z: -250, opacity: .2, scale: .85 }, { rotateY: 0, z: 0, opacity: 1, scale: 1, ease: 'power2.out', scrollTrigger: { trigger: s, containerAnimation: ca, start: 'left 100%', end: 'left 45%', scrub: true } });
    gsap.fromTo($('.num', s), { xPercent: 80 }, { xPercent: -20, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: ca, start: 'left right', end: 'right left', scrub: true } });
  });
}

/* audit ring */
if ($('#ringBox')) {
  ScrollTrigger.create({ trigger: '#ringBox', start: 'top 75%', once: true, onEnter: () => {
    gsap.to('#ring', { strokeDashoffset: 0, duration: 2.2, ease: 'power3.inOut' });
    const o = { v: 0 }; gsap.to(o, { v: 15, duration: 2.2, ease: 'power3.inOut', onUpdate: () => $('#ringNum').textContent = Math.round(o.v) });
  } });
  gsap.from('#ringBox', { scale: .7, rotate: -30, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '#ringBox', start: 'top 85%' } });
  gsap.from('.chk', { x: 60, opacity: 0, stagger: .06, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '.checks', start: 'top 82%' } });
  gsap.from('.chk b', { scale: 0, rotate: -90, stagger: .06, duration: .6, delay: .3, ease: 'back.out(3)', scrollTrigger: { trigger: '.checks', start: 'top 82%' } });
}

/* stacking case cards */
const cases = $$('.case');
cases.forEach((c, i) => {
  gsap.from(c, { y: 200, rotate: i % 2 ? 4 : -4, scale: .9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 30%', scrub: 1 } });
  gsap.from($$('.met', c), { scale: .5, opacity: 0, rotate: () => gsap.utils.random(-20, 20), stagger: .08, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: c, start: 'top 60%' } });
  if (i < cases.length - 1) gsap.to(c, { scale: .88, filter: small ? 'brightness(.6)' : 'brightness(.45) blur(2px)', ease: 'none', scrollTrigger: { trigger: cases[i + 1], start: 'top bottom', end: 'top 12%', scrub: true } });
});

/* bot */
if ($('#bot')) {
  const bot = $('#bot'), pupils = $$('.pupil', bot), eyes = $('#eyes'), mouth = $('#mouth'), bubble = $('#bubbleTxt');
  const lines = (bot.dataset.lines || 'Hi!').split('|');
  let li = 0, typing = null;
  const say = t => { clearInterval(typing); let i = 0; bubble.textContent = ''; typing = setInterval(() => { bubble.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(typing); }, 38); };
  ScrollTrigger.create({ trigger: bot, start: 'top 80%', once: true, onEnter: () => {
    say(lines[0]);
    gsap.from('#botBody', { y: -300, rotate: -30, duration: 1.4, ease: 'bounce.out', transformOrigin: '50% 100%' });
    gsap.from('#shadow', { scale: 0, duration: 1.4, ease: 'bounce.out', transformOrigin: '50% 50%' });
  } });
  setInterval(() => { li = (li + 1) % lines.length; say(lines[li]); }, 4200);
  gsap.to('#botBody', { y: -12, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('#shadow', { scaleX: .8, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 50%' });
  gsap.to('#antenna', { attr: { r: 13 }, fill: '#ff5a1f', duration: .8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('#meter', { attr: { width: 20 }, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  (function blink() { gsap.to(eyes, { scaleY: .1, duration: .08, yoyo: true, repeat: 1, transformOrigin: '50% 50%', onComplete: () => setTimeout(blink, gsap.utils.random(1800, 4500)) }); })();
  const base = pupils.map(p => ({ x: +p.getAttribute('cx'), y: +p.getAttribute('cy') }));
  gsap.ticker.add(() => {
    const r = bot.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * .43, a = Math.atan2(mouse.y - cy, mouse.x - cx), d = clamp(Math.hypot(mouse.x - cx, mouse.y - cy) / 200, 0, 1) * 8;
    pupils.forEach((p, i) => gsap.set(p, { attr: { cx: base[i].x + Math.cos(a) * d, cy: base[i].y + Math.sin(a) * d } }));
    gsap.set('#botBody', { rotate: clamp((mouse.x - cx) / 60, -8, 8), transformOrigin: '50% 100%' });
  });
  bot.addEventListener('click', () => {
    li = (li + 1) % lines.length; say(lines[li]);
    gsap.timeline().to(mouth, { attr: { d: 'M120,152 Q150,190 180,152' }, duration: .2 })
      .to('#botBody', { scaleY: .8, scaleX: 1.15, duration: .12, transformOrigin: '50% 100%' })
      .to('#botBody', { scaleY: 1.15, scaleX: .9, y: -60, duration: .25, ease: 'power2.out' })
      .to('#botBody', { scaleY: 1, scaleX: 1, y: 0, duration: .6, ease: 'bounce.out' })
      .to(mouth, { attr: { d: 'M128,160 Q150,170 172,160' }, duration: .3 }, '+=.3');
  });
}
$$('.reason').forEach((r, i) => {
  gsap.from(r, { x: 200, rotateY: -40, opacity: 0, duration: 1.1, ease: 'expo.out', delay: i * .1, scrollTrigger: { trigger: r, start: 'top 92%', toggleActions: 'play none none reverse' } });
  const ri = $('.ri', r); ri && gsap.from(ri, { scale: 0, rotate: -180, duration: .9, delay: .3 + i * .1, ease: 'back.out(3)', scrollTrigger: { trigger: r, start: 'top 92%', toggleActions: 'play none none reverse' } });
});

/* drag testimonials */
if ($('#tTrack')) {
  const tt = $('#tTrack'), tCards = $$('.tcard', tt);
  let tx = 0, tv = 0, drag = false, sx = 0, sTx = 0, lastPX = 0, tAuto = -.6;
  const tMin = () => Math.min(0, innerWidth - tt.scrollWidth);
  tt.addEventListener('pointerdown', e => { drag = true; sx = e.clientX; sTx = tx; lastPX = e.clientX; tt.classList.add('drag'); tt.setPointerCapture(e.pointerId); gsap.to(tCards, { scale: .95, duration: .3 }); });
  tt.addEventListener('pointermove', e => { if (!drag) return; tv = e.clientX - lastPX; lastPX = e.clientX; tx = sTx + (e.clientX - sx); });
  const end = () => { if (!drag) return; drag = false; tt.classList.remove('drag'); gsap.to(tCards, { scale: 1, duration: .5, ease: 'back.out(2)' }); };
  tt.addEventListener('pointerup', end); tt.addEventListener('pointercancel', end);
  gsap.ticker.add(() => {
    if (!drag) { tv *= .94; tx += tv + tAuto; }
    const mn = tMin();
    if (tx > 0) { tx += (0 - tx) * .12; if (!drag) tAuto = -.6; }
    if (tx < mn) { tx += (mn - tx) * .12; if (!drag) tAuto = .6; }
    gsap.set(tt, { x: tx }); tCards.forEach(c => gsap.set(c, { rotate: clamp(tv * .4, -8, 8) }));
  });
  gsap.from(tCards, { y: 150, rotate: () => gsap.utils.random(-15, 15), opacity: 0, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: tt, start: 'top 88%' } });
}
$$('.chips,.mk-row').forEach(g => gsap.from($$('.chip', g), { y: 60, opacity: 0, scale: .4, rotate: () => gsap.utils.random(-30, 30), stagger: { each: .04, from: 'random' }, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: g, start: 'top 94%' } }));
if (!touch) $$('.chip').forEach(c => {
  c.addEventListener('mouseenter', () => gsap.to(c, { y: -8, rotate: gsap.utils.random(-6, 6), backgroundColor: '#ff5a1f', color: '#0a0a0b', duration: .3 }));
  c.addEventListener('mouseleave', () => gsap.to(c, { y: 0, rotate: 0, backgroundColor: 'rgba(239,235,228,.03)', color: '#efebe4', duration: .5, ease: 'elastic.out(1,.4)' }));
});

/* blog cards */
$$('.post').forEach((p, i) => {
  gsap.from(p, { clipPath: 'inset(100% 0% 0% 0% round 26px)', y: 100, duration: 1.3, delay: (i % 3) * .12, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 94%', toggleActions: 'play none none reverse' } });
  if (!touch) {
    p.addEventListener('mousemove', e => { const r = p.getBoundingClientRect(); gsap.to(p, { x: (e.clientX - r.left - r.width / 2) * .05, y: (e.clientY - r.top - r.height / 2) * .05, rotate: (e.clientX - r.left - r.width / 2) * .008, duration: .4 }); });
    p.addEventListener('mouseleave', () => gsap.to(p, { x: 0, y: 0, rotate: 0, duration: .8, ease: 'elastic.out(1,.4)' }));
    p.addEventListener('mouseenter', () => scramble($('h4', p), null, 500));
  }
});

/* sticky CTA */
if ($('.cta')) {
  const ctaChars = splitChars($('#ctaTitle'));
  const ct = gsap.timeline({ scrollTrigger: { trigger: '.cta', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  ct.fromTo('#ctaFill', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 1, ease: 'power2.inOut' })
    .to('.cta-in', { color: '#0a0a0b', duration: .3 }, '<.5')
    .from(ctaChars, { yPercent: 150, rotate: () => gsap.utils.random(-40, 40), opacity: 0, stagger: { each: .015, from: 'center' }, duration: .8, ease: 'back.out(1.6)' }, '<-.3')
    .from('.cta-in p,.cta-in .cta-row', { y: 60, opacity: 0, stagger: .1, duration: .5 }, '-=.3')
    .set('.cta-in .btn-p', { backgroundColor: '#0a0a0b', color: '#efebe4' }, '<')
    .set('.cta-in .btn-g', { borderColor: 'rgba(0,0,0,.4)' }, '<')
    .to({}, { duration: .5 });
}

/* =====================================================================
   INNER PAGE MODULES
   ===================================================================== */
/* service rows */
$$('.srow').forEach(r => {
  gsap.to($('.line', r), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: r, start: 'top 80%', end: 'bottom 60%', scrub: true } });
  gsap.from($('.idx', r), { xPercent: -60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: r, start: 'top 80%' } });
  gsap.from([$('.ico', r), $('h3', r), $('.tagline', r), $('p', r)], { y: 50, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: r, start: 'top 80%' } });
  gsap.from($$('.tick-list li', r), { x: 80, opacity: 0, rotateY: -30, stagger: .07, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: $('.tick-list', r), start: 'top 85%' } });
});
/* tools */
if ($('.tool-grid')) {
  gsap.from('.tool', { scale: .6, rotate: () => gsap.utils.random(-20, 20), opacity: 0, stagger: { each: .07, from: 'random' }, duration: 1, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.tool-grid', start: 'top 85%' } });
  $$('.tool').forEach(t => tilt(t, 22));
}
/* plans */
$$('.plan').forEach((p, i) => {
  gsap.from(p, { y: 160, rotateX: -40, opacity: 0, duration: 1.3, delay: i * .12, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: '.plans', start: 'top 85%' } });
  gsap.from($$('li', p), { x: -30, opacity: 0, stagger: .05, duration: .6, delay: .5 + i * .12, scrollTrigger: { trigger: '.plans', start: 'top 85%' } });
  tilt(p, 10);
});
/* live dashboards */
$$('.live').forEach(l => {
  const shot = $('.shot', l);
  gsap.from(shot, { rotateY: -25, rotateX: 15, scale: .8, opacity: 0, duration: 1.4, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: l, start: 'top 80%' } });
  gsap.to(shot, { y: -40, ease: 'none', scrollTrigger: { trigger: l, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from($$('.live-k div', l), { y: 40, opacity: 0, stagger: .1, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: l, start: 'top 80%' } });
  const bar = $('.acos-bar i', l); bar && gsap.to(bar, { width: bar.dataset.w + '%', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 75%' } });
  if (!touch && shot) {
    l.addEventListener('mousemove', e => { const r = shot.getBoundingClientRect(); gsap.to(shot, { rotateY: ((e.clientX - r.left) / r.width - .5) * 10, rotateX: -((e.clientY - r.top) / r.height - .5) * 10, transformPerspective: 1200, duration: .6 }); });
    l.addEventListener('mouseleave', () => gsap.to(shot, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.4)' }));
  }
});
/* blog filters */
if ($('.filters')) {
  const posts = $$('.blog.all .post');
  $$('.filter').forEach(f => f.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.toggle('on', x === f));
    const cat = f.dataset.cat;
    const show = posts.filter(p => cat === 'all' || p.dataset.cat === cat), hide = posts.filter(p => !show.includes(p));
    gsap.to(hide, { scale: .8, opacity: 0, duration: .35, ease: 'power2.in', onComplete: () => {
      hide.forEach(p => p.style.display = 'none'); show.forEach(p => p.style.display = '');
      gsap.fromTo(show, { scale: .85, opacity: 0, y: 40 }, { scale: 1, opacity: 1, y: 0, stagger: .06, duration: .6, ease: 'back.out(1.6)', onComplete: () => ScrollTrigger.refresh() });
    } });
    if (!hide.length) gsap.fromTo(show, { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, stagger: .05, duration: .5 });
  }));
}
/* article */
if ($('.prose') && $('.read-prog')) {
  gsap.to('.read-prog', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.prose', start: 'top 20%', end: 'bottom bottom', scrub: .3 } });
  $$('.prose > h2, .prose > h3').forEach(h => gsap.from(h, { x: -60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('.prose > p, .prose > ul, .prose > ol, .prose > table').forEach(p => gsap.from(p, { y: 30, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 92%' } }));
  $$('.prose .callout, .prose .key-points').forEach(c => gsap.from(c, { scale: .92, opacity: 0, rotate: -1.5, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
  $$('.prose .key-points li').forEach((li, i) => gsap.from(li, { x: 40, opacity: 0, duration: .6, delay: i * .06, scrollTrigger: { trigger: li, start: 'top 94%' } }));
}
if ($('.art-cta')) gsap.from('.art-cta', { clipPath: 'inset(20% 20% 20% 20% round 30px)', scale: .9, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.art-cta', start: 'top 85%' } });
$$('.related a').forEach((a, i) => gsap.from(a, { y: 80, opacity: 0, rotate: i % 2 ? 3 : -3, duration: 1, delay: i * .1, ease: 'expo.out', scrollTrigger: { trigger: '.related', start: 'top 90%' } }));
/* contact page */
if ($('.form-card')) {
  gsap.from('.form-card', { y: 100, opacity: 0, rotateX: -12, duration: 1.3, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: '.ct-grid', start: 'top 85%' } });
  gsap.from('.field', { y: 30, opacity: 0, stagger: .06, duration: .8, delay: .3, ease: 'power3.out', scrollTrigger: { trigger: '.ct-grid', start: 'top 85%' } });
  gsap.from('.side .audit-box', { x: 80, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.audit-box', start: 'top 92%' } });
  $$('.field input, .field textarea, .field select').forEach(i => i.addEventListener('focus', () => gsap.fromTo(i.closest('.field'), { x: 0 }, { x: 6, duration: .15, yoyo: true, repeat: 1 })));
}
$$('.audit-box li').forEach((li, i) => gsap.from(li, { x: 30, opacity: 0, duration: .6, delay: i * .06, scrollTrigger: { trigger: '.audit-box', start: 'top 85%' } }));
/* faq */
$$('.qa').forEach((q, i) => {
  gsap.from(q, { y: 40, opacity: 0, duration: .8, delay: i * .06, ease: 'power3.out', scrollTrigger: { trigger: '.faq', start: 'top 85%' } });
  const btn = $('button', q), ans = $('.ans', q);
  btn.addEventListener('click', () => {
    const open = q.classList.contains('open');
    $$('.qa.open').forEach(o => { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); gsap.to($('.ans', o), { height: 0, duration: .5, ease: 'power3.inOut' }); });
    if (!open) { q.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); gsap.to(ans, { height: 'auto', duration: .6, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() }); gsap.from($('p', ans), { y: 20, opacity: 0, duration: .5, delay: .15 }); }
  });
});
/* legal toc */
if ($('.toc')) {
  const links = $$('.toc a');
  links.forEach(a => { const s = $(a.getAttribute('href')); s && ScrollTrigger.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: st => { if (st.isActive) links.forEach(l => l.classList.toggle('on', l === a)); } }); });
  $$('.legal .prose section').forEach(s => gsap.from(s, { y: 40, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
}
/* landing */
$$('.proof div').forEach((d, i) => gsap.from(d, { y: 60, opacity: 0, scale: .9, duration: 1, delay: .2 + i * .1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.proof', start: 'top 95%' } }));
$$('.rc').forEach((c, i) => { gsap.from(c, { y: 160, rotateY: gsap.utils.random(-30, 30), opacity: 0, duration: 1.3, delay: i * .12, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: '.rc-grid', start: 'top 85%' } }); tilt(c, 12); });
if ($('.vs')) {
  gsap.from('.vs-card.them', { x: -120, rotate: -4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
  gsap.from('.vs-card.us', { x: 120, rotate: 4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
  gsap.from('.vs-card li', { y: 20, opacity: 0, stagger: .05, duration: .6, delay: .4, scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
}
$$('.ch').forEach((c, i) => gsap.from(c, { x: 60, opacity: 0, duration: .9, delay: i * .08, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 94%' } }));

/* =====================================================================
   FOOTER GIANT LETTERS
   ===================================================================== */
$$('.giant').forEach(giant => {
  const word = giant.dataset.word || giant.textContent.trim();
  giant.innerHTML = [...word].map(c => `<span>${c}</span>`).join('');
  const gL = $$('span', giant);
  gsap.from(gL, { yPercent: -200, rotate: () => gsap.utils.random(-90, 90), opacity: 0, stagger: { each: .06, from: 'random' }, duration: 1.6, ease: 'bounce.out', scrollTrigger: { trigger: giant, start: 'top 98%', toggleActions: 'play none none reverse' } });
  if (!touch) {
    const gq = gL.map(l => ({ l, y: gsap.quickTo(l, 'y', { duration: .6, ease: 'power3' }), r: gsap.quickTo(l, 'rotate', { duration: .6, ease: 'power3' }) }));
    let gLift = false;
    onPtr(() => {
      const gr = giant.getBoundingClientRect(), vis = !(gr.top > innerHeight || gr.bottom < 0);
      if (!ptr.in || !vis) { if (gLift) { gLift = false; gq.forEach(q => { q.y(0); q.r(0); q.l.style.color = ''; }); } return; }
      gLift = true;
      gq.forEach(q => { const r = q.l.getBoundingClientRect(), dx = ptr.x - (r.left + r.width / 2), dy = ptr.y - (r.top + r.height / 2), f = clamp(1 - Math.hypot(dx, dy) / 260, 0, 1); q.y(-f * 80); q.r(f * (dx > 0 ? -18 : 18)); q.l.style.color = f > .2 ? '#ff5a1f' : ''; });
    });
  }
});
if ($('.credit')) gsap.from('.credit span, .credit b', { y: 30, opacity: 0, stagger: .12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.credit', start: 'top 99%' } });

/* =====================================================================
   v3: MEGA MENU (desktop services panel)
   ===================================================================== */
const mega = $('#mega'), mLink = $('.nav-links [data-mega]');
if (mega && mLink && !touch) {
  let mt, mOn = false;
  const mItems = $$('.mg-i, .mg-bv, .mg-all', mega);
  gsap.set(mega, { opacity: 0 });
  const mShow = () => {
    clearTimeout(mt); if (mOn || menuOpen) return; mOn = true;
    mega.classList.add('on'); mega.setAttribute('aria-hidden', 'false'); mLink.setAttribute('aria-expanded', 'true');
    gsap.killTweensOf(mega);
    gsap.fromTo(mega, { opacity: 0, y: -14, clipPath: 'inset(0% 0% 100% 0% round 26px)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: .6, ease: 'expo.out' });
    gsap.fromTo(mItems, { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: .03, duration: .6, ease: 'expo.out', delay: .05 });
  };
  const mHide = (now) => {
    clearTimeout(mt);
    mt = setTimeout(() => {
      if (!mOn) return; mOn = false; mLink.setAttribute('aria-expanded', 'false');
      gsap.to(mega, { opacity: 0, y: -10, duration: .25, ease: 'power2.in', onComplete: () => { if (!mOn) { mega.classList.remove('on'); mega.setAttribute('aria-hidden', 'true'); } } });
    }, now === true ? 0 : 170);
  };
  [mLink, mega].forEach(el => { el.addEventListener('mouseenter', mShow); el.addEventListener('mouseleave', mHide); });
  mLink.addEventListener('focus', mShow);
  mega.addEventListener('focusout', e => { if (!mega.contains(e.relatedTarget) && e.relatedTarget !== mLink) mHide(); });
  mLink.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); mShow(); const f = $('.mg-i', mega); f && f.focus(); } });
  addEventListener('keydown', e => { if (e.key === 'Escape' && mOn) { mHide(true); mLink.focus(); } });
  addEventListener('scroll', () => { if (mOn && !mega.matches(':hover')) mHide(true); }, { passive: true });
  mega.addEventListener('click', e => { if (e.target.closest('a')) mHide(true); });
  $$('.mg-i', mega).forEach(a => a.addEventListener('mouseenter', () => { const i = $('.ico', a); i && gsap.fromTo(i, { rotate: -25, scale: .7 }, { rotate: 0, scale: 1, duration: .6, ease: 'back.out(3)' }); }));
}

/* =====================================================================
   v3: SERVICE-PAGE + BIDVISTA MODULES
   ===================================================================== */
$$('.inc-wrap .tick-list li').forEach(li => gsap.from(li, { x: 80, opacity: 0, rotateY: -30, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 93%' } }));
$$('.svc-hero-chips span').forEach((c, i) => gsap.from(c, { y: 20, opacity: 0, scale: .6, duration: .6, delay: 1 + i * .06, ease: 'back.out(2)' }));
$$('.pair').forEach((p, i) => { gsap.from(p, { y: 120, rotateX: -30, opacity: 0, duration: 1.2, delay: i * .1, ease: 'expo.out', transformPerspective: 1000, scrollTrigger: { trigger: '.pairs', start: 'top 88%' } }); tilt(p, 14, false); });
$$('.calc, .tchk').forEach(cl => {
  gsap.from(cl, { y: 140, rotateX: -16, scale: .94, opacity: 0, duration: 1.4, ease: 'expo.out', transformPerspective: 1400, scrollTrigger: { trigger: cl, start: 'top 90%' } });
  gsap.from($$('.ci, .co, .tchk-l label', cl), { y: 30, opacity: 0, stagger: .05, duration: .8, delay: .25, ease: 'power3.out', scrollTrigger: { trigger: cl, start: 'top 82%' } });
});
$$('.console').forEach(cn => {
  gsap.from(cn, { rotateY: -22, rotateX: 14, y: 90, opacity: 0, duration: 1.6, ease: 'expo.out', transformPerspective: 1400, delay: cn.closest('.bv-hero') ? .6 : 0, scrollTrigger: cn.closest('.bv-hero') ? null : { trigger: cn, start: 'top 90%' } });
  if (!touch) {
    const host = cn.parentElement;
    host.addEventListener('mousemove', e => { const r = cn.getBoundingClientRect(); gsap.to(cn, { rotateY: ((e.clientX - r.left) / r.width - .5) * 8, rotateX: -((e.clientY - r.top) / r.height - .5) * 8, transformPerspective: 1400, duration: .8 }); });
    host.addEventListener('mouseleave', () => gsap.to(cn, { rotateX: 0, rotateY: 0, duration: 1.2, ease: 'elastic.out(1,.4)' }));
  }
});
$$('.bv-band').forEach(b => {
  gsap.from(b, { clipPath: 'inset(16% 10% 16% 10% round 36px)', opacity: .3, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: b, start: 'top 86%' } });
  gsap.from($$('p, .cta-row, .status', b), { y: 50, opacity: 0, stagger: .08, duration: 1, delay: .2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 80%' } });
});
$$('.wl-perks li').forEach((li, i) => gsap.from(li, { x: 30, opacity: 0, duration: .6, delay: i * .07, scrollTrigger: { trigger: '.wl-perks', start: 'top 88%' } }));
if ($('.tabs')) gsap.from('.tab', { y: 30, opacity: 0, scale: .8, stagger: .06, duration: .7, ease: 'back.out(2)', scrollTrigger: { trigger: '.tabs', start: 'top 90%' } });

/* =====================================================================
   v3: CALCULATORS, CHECKLIST, CONSOLES, TABS (work without GSAP too)
   ===================================================================== */
function initCalcs() {
  const G = window.gsap;
  const F = {
    meta: v => ({ broas: 100 / v.margin, maxcpa: v.aov * v.margin / 100, troas: v.margin - v.profit > 0 ? 100 / (v.margin - v.profit) : NaN }),
    google: v => ({ maxcpc: v.cpa * v.cvr / 100, cpc_clicks: 100 / v.cvr, conv: v.budget / v.cpa }),
    tcpc: v => ({ cpc: v.acos / 100 * v.cvr / 100 * v.price, roas: 100 / v.acos, cpo: v.price * v.acos / 100 }),
    creative: v => { const hook = v.v3 / v.imp * 100, hold = v.tp / v.v3 * 100; return { hook, hold, verdict: !isFinite(hook) ? '—' : hook >= 30 ? 'Strong opening. Work on the story to lift hold rate.' : hook >= 20 ? 'Decent opening. Test new hooks to push it higher.' : 'The first 3 seconds are losing people. Test new hooks first.' }; },
    social: v => { const e = v.likes + v.comments + v.shares; return { er: e / v.reach * 100, deep: e ? v.shares / e * 100 : 0 }; },
    seo: v => ({ mval: v.clicks * v.cpc, yval: v.clicks * v.cpc * 12 }),
    cro: v => { const o0 = v.visitors * v.cr0 / 100, o1 = v.visitors * v.cr1 / 100; return { extra: o1 - o0, rev: (o1 - o0) * v.aov, cpa: o1 > 0 ? (o0 / o1 - 1) * 100 : NaN }; },
    email: v => { const o = v.cust * v.lift / 100; return { orders: o, rev: o * v.aov, yr: o * v.aov * 12 }; },
    beacos: v => { const m = (v.price - v.cost) / v.price * 100; return { be: m, beroas: m > 0 ? 100 / m : NaN, room: v.price - v.cost }; },
    acosroas: v => ({ roas: 100 / v.acos, per100: 10000 / v.acos }),
    tacos: v => ({ tacos: v.spend / v.total * 100, acos: v.spend / v.adsales * 100, org: Math.max(0, (v.total - v.adsales) / v.total * 100) })
  };
  const fmt = (n, f) => {
    if (f === 'text') return n;
    if (!isFinite(n)) return '—';
    if (f === 'x') return n.toFixed(2) + '×';
    if (f === 'inr') return '₹' + Math.round(n).toLocaleString('en-IN');
    if (f === 'inr2') return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (f === 'pct') return n.toFixed(1) + '%';
    if (f === 'pctd') return (n < 0 ? '−' : '+') + Math.abs(n).toFixed(1) + '%';
    return (n < 10 && n % 1 ? n.toFixed(1) : Math.round(n).toLocaleString('en-IN'));
  };
  $$('.calc[data-calc]').forEach(cl => {
    if (cl.dataset.bound) return; cl.dataset.bound = 1;
    const id = cl.dataset.calc, fn = F[id]; if (!fn) return;
    const nums = $$('input[data-k]', cl), ranges = $$('input[data-r]', cl), outs = $$('[data-o]', cl), cur = {};
    let used = false;
    const fill = r => r.style.setProperty('--p', ((+r.value - +r.min) / (+r.max - +r.min) * 100) + '%');
    const run = (anim) => {
      const v = {}; nums.forEach(n => v[n.dataset.k] = parseFloat(n.value));
      const res = fn(v);
      outs.forEach(o => {
        const k = o.dataset.o, f = o.dataset.fmt, val = res[k];
        if (f === 'text' || !anim || !G || !isFinite(val) || !isFinite(cur[k])) { o.textContent = fmt(val, f); cur[k] = val; return; }
        const t = { v: cur[k] }; cur[k] = val;
        G.to(t, { v: val, duration: .45, ease: 'power3.out', onUpdate: () => o.textContent = fmt(t.v, f) });
      });
    };
    const touched = () => { if (!used) { used = true; window.ivTrack && ivTrack('calculator_use', { calculator: id }); } };
    ranges.forEach(r => { fill(r); r.addEventListener('input', () => { const n = $(`input[data-k="${r.dataset.r}"]`, cl); n.value = r.value; fill(r); run(true); touched(); }); });
    nums.forEach(n => n.addEventListener('input', () => { const r = $(`input[data-r="${n.dataset.k}"]`, cl); if (r && n.value !== '') { r.value = n.value; fill(r); } run(true); touched(); }));
    run(false);
  });
  /* tracking health checklist */
  $$('.tchk').forEach(tc => {
    if (tc.dataset.bound) return; tc.dataset.bound = 1;
    const boxes = $$('input[type=checkbox]', tc), ring = $('.tc-ring circle.v', tc), num = $('.tc-ring b', tc), h = $('.tchk-r h4', tc), p = $('.tchk-r p', tc);
    const L = 2 * Math.PI * 88; ring.style.strokeDasharray = L; ring.style.strokeDashoffset = L;
    const V = tc.dataset.v ? JSON.parse(tc.dataset.v) : [[8, 'Rock solid.', 'Your tracking basics are in place. Keep checking reported numbers against real orders every month.'],
               [6, 'Nearly there.', 'A couple of gaps can still mislead the algorithms. Worth closing before you scale spend.'],
               [3, 'Leaky.', 'Platforms are probably optimising on incomplete data. This is usually the first thing we fix.'],
               [0, 'Flying blind.', 'Most decisions are being made without reliable data. Fix tracking before spending more.']];
    let used = false;
    const upd = () => {
      const n = boxes.filter(b => b.checked).length;
      boxes.forEach(b => b.closest('label').classList.toggle('on', b.checked));
      const off = L * (1 - n / boxes.length);
      window.gsap ? gsap.to(ring, { strokeDashoffset: off, duration: .6, ease: 'power3.out' }) : (ring.style.strokeDashoffset = off);
      num.textContent = n; const v = V.find(x => n >= x[0]); h.textContent = v[1]; p.textContent = v[2];
    };
    boxes.forEach(b => b.addEventListener('change', () => { upd(); if (!used) { used = true; window.ivTrack && ivTrack('calculator_use', { calculator: tc.dataset.name || 'tracking_checklist' }); } if (window.gsap) gsap.fromTo(b.closest('label'), { scale: .97 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); }));
    upd();
  });
  /* tabs */
  $$('.tabs').forEach(tb => {
    if (tb.dataset.bound) return; tb.dataset.bound = 1;
    const panels = $$('[data-panel]', tb.nextElementSibling);
    $$('.tab', tb).forEach(t => t.addEventListener('click', () => {
      $$('.tab', tb).forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      panels.forEach(p => { const on = p.dataset.panel === t.dataset.tab; p.hidden = !on; if (on && window.gsap) gsap.fromTo(p, { y: 40, opacity: 0, rotateX: -10 }, { y: 0, opacity: 1, rotateX: 0, duration: .7, ease: 'expo.out', transformPerspective: 1200 }); });
      window.ScrollTrigger && ScrollTrigger.refresh();
    }));
  });
}
function initConsoles() {
  const G = window.gsap;
  $$('.console[data-lines]').forEach(cn => {
    if (cn.dataset.bound) return; cn.dataset.bound = 1;
    const lines = cn.dataset.lines.split('|'), bd = $('.cn-body', cn), typed = $('.cn-typed', cn), ph = $('.ph', cn);
    const add = l => {
      const u = l[0] === '>', m = document.createElement('div');
      m.className = 'cn-msg ' + (u ? 'u' : 'b'); m.textContent = u ? l.slice(1) : l; bd.appendChild(m);
      while (bd.children.length > 6) bd.firstChild.remove();
      if (G) G.from(m, { y: 24, opacity: 0, scale: .96, transformOrigin: u ? '100% 100%' : '0% 100%', duration: .55, ease: 'back.out(1.6)' });
      return m;
    };
    if (reduce || !('IntersectionObserver' in window)) { lines.forEach(add); return; }
    let i = 0, running = false, visible = false;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !running) step(); }, { threshold: .2 }).observe(cn);
    function step() {
      if (!visible) { running = false; return; } running = true;
      if (i >= lines.length) {
        setTimeout(() => { const kids = [...bd.children]; const reset = () => { bd.innerHTML = ''; i = 0; step(); }; G ? G.to(kids, { opacity: 0, y: -20, stagger: .05, duration: .3, onComplete: reset }) : reset(); }, 3400);
        return;
      }
      const l = lines[i++];
      if (l[0] === '>') {
        const t = l.slice(1); let k = 0; if (ph) ph.style.display = 'none';
        const iv = setInterval(() => {
          typed.textContent = t.slice(0, ++k);
          if (k >= t.length) { clearInterval(iv); setTimeout(() => { typed.textContent = ''; if (ph) ph.style.display = ''; add(l); setTimeout(step, 450); }, 380); }
        }, 32);
      } else {
        const th = document.createElement('div'); th.className = 'cn-msg b think'; th.innerHTML = '<span><i></i><i></i><i></i></span>'; bd.appendChild(th);
        setTimeout(() => { th.remove(); add(l); setTimeout(step, 1700 + l.length * 14); }, 950);
      }
    }
  });
}

/* =====================================================================
   v3: MMM PAGE (budget lab, carryover + diminishing-returns demos)
   ===================================================================== */
function initMMM() {
  const G = window.gsap, NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const hill = (c, x) => x > 0 ? c.vmax * Math.pow(x, c.a) / (Math.pow(x, c.a) + Math.pow(c.k, c.a)) : 0;
  const mroi = (c, x) => (hill(c, x + .05) - hill(c, Math.max(0, x - .05))) / (x > .05 ? .1 : .05 + x);
  const L = v => '₹' + (Math.round(v * 10) / 10).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'L';
  const X2 = v => (Math.round(v * 100) / 100).toFixed(2) + '×';

  /* ---- budget lab ---- */
  $$('.mmlab').forEach(lab => {
    if (lab.dataset.bound) return; lab.dataset.bound = 1;
    const C = JSON.parse(lab.dataset.lab), svg = $('svg', lab), gGrid = $('.ml-grid', svg), gCurves = $('.ml-curves', svg), gMarks = $('.ml-marks', svg);
    const W = 560, H = 330, P = { l: 34, r: 14, t: 14, b: 30 }, XM = 10, YM = 16;
    const sx = x => P.l + x / XM * (W - P.l - P.r), sy = y => H - P.b - y / YM * (H - P.t - P.b);
    for (let i = 0; i <= XM; i += 2) { gGrid.appendChild(el('line', { x1: sx(i), x2: sx(i), y1: P.t, y2: H - P.b })); const t = el('text', { x: sx(i), y: H - 10, 'text-anchor': 'middle' }); t.textContent = i; gGrid.appendChild(t); }
    for (let j = 0; j <= YM; j += 4) { gGrid.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: sy(j), y2: sy(j) })); const t = el('text', { x: P.l - 8, y: sy(j) + 4, 'text-anchor': 'end' }); t.textContent = j; gGrid.appendChild(t); }
    const M = {};
    C.forEach(c => {
      let d = ''; for (let i = 0; i <= 100; i++) { const x = i / 10; d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(hill(c, x)).toFixed(1); }
      gCurves.appendChild(el('path', { d, stroke: c.color, class: 'c' }));
      const ring = el('circle', { r: 11, stroke: c.color, class: 'ring' }), dot = el('circle', { r: 7, fill: c.color, class: 'dot' });
      gMarks.appendChild(ring); gMarks.appendChild(dot); M[c.id] = { dot, ring };
    });
    const nums = $$('input[data-ch]', lab), rngs = $$('input[data-chr]', lab), O = k => $(`[data-o="${k}"]`, lab);
    const fill = r => r.style.setProperty('--p', (+r.value / +r.max * 100) + '%');
    const val = () => { const v = {}; nums.forEach(n => v[n.dataset.ch] = Math.max(0, Math.min(10, parseFloat(n.value) || 0))); return v; };
    const total = v => C.reduce((a, c) => a + v[c.id], 0), rev = v => C.reduce((a, c) => a + hill(c, v[c.id]), 0);
    function best(T) {   // brute force over a 0.05 grid: exact enough, and fine with S-shaped curves
      let bv = -1, bx = null; const st = .05, cap = 10;
      for (let a = 0; a <= Math.min(cap, T) + 1e-9; a += st) for (let b = 0; b <= Math.min(cap, T - a) + 1e-9; b += st) {
        const c3 = T - a - b; if (c3 > cap + 1e-9) continue;
        const r = hill(C[0], a) + hill(C[1], b) + hill(C[2], c3); if (r > bv) { bv = r; bx = [a, b, c3]; }
      }
      const o = {}; C.forEach((c, i) => o[c.id] = bx ? bx[i] : 0); return o;
    }
    let raf = 0, used = false, bestV = null;
    const place = (m, x, c) => { m.setAttribute('cx', sx(x)); m.setAttribute('cy', sy(hill(c, x))); };
    function run() {
      raf = 0;
      const v = val(), T = total(v), r = rev(v); bestV = best(T); const rb = rev(bestV);
      O('total').textContent = L(T); O('rev').textContent = L(r); O('best').textContent = L(rb);
      const g = r > 0 ? (rb / r - 1) * 100 : 0;
      O('gain').textContent = g >= .5 ? '+' + g.toFixed(0) + '% more, same spend' : 'You are already close to the best split';
      C.forEach(c => {
        place(M[c.id].dot, v[c.id], c); place(M[c.id].ring, bestV[c.id], c);
        const row = $(`tr[data-row="${c.id}"]`, lab), x = v[c.id], mr = mroi(c, x);
        $('[data-f="spend"]', row).textContent = L(x);
        $('[data-f="roi"]', row).textContent = x > 0 ? X2(hill(c, x) / x) : '—';
        $('[data-f="mroi"]', row).textContent = X2(mr);
        const tg = x <= 0 ? ['off', 'Not running'] : mr >= 1 ? ['up', 'Room to grow'] : mr >= .6 ? ['mid', 'Near its limit'] : ['down', 'Saturated'];
        const t = $('[data-f="tag"]', row); t.textContent = tg[1]; t.className = 'tg ' + tg[0];
      });
      const moves = C.map(c => ({ c, d: bestV[c.id] - v[c.id] }));
      const from = moves.filter(m => m.d < -.24).sort((a, b) => a.d - b.d), to = moves.filter(m => m.d > .24).sort((a, b) => b.d - a.d);
      const names = a => a.map(m => m.c.name).join(' and ');
      O('say').innerHTML = (from.length && to.length && g >= .5)
        ? `Moving about <b>${L(-from.reduce((a, m) => a + m.d, 0))}</b> a week from ${names(from)} to ${names(to)} adds about <b>${L(rb - r)}</b> of incremental revenue a week, with the same total budget.`
        : 'This split is already close to the best one for this budget. Try putting most of it into a single channel and watch the next-rupee return fall.';
    }
    const soon = () => { if (!raf) raf = requestAnimationFrame(run); };
    const touched = () => { if (!used) { used = true; window.ivTrack && ivTrack('calculator_use', { calculator: 'mmm_budget_lab' }); } };
    rngs.forEach(r => { fill(r); r.addEventListener('input', () => { $(`input[data-ch="${r.dataset.chr}"]`, lab).value = r.value; fill(r); soon(); touched(); }); });
    nums.forEach(n => n.addEventListener('input', () => { const r = $(`input[data-chr="${n.dataset.ch}"]`, lab); if (n.value !== '') { r.value = n.value; fill(r); } soon(); touched(); }));
    $('[data-best]', lab).addEventListener('click', () => {
      touched(); if (!bestV) return;
      const tgt = bestV, st = {}; nums.forEach(n => st[n.dataset.ch] = parseFloat(n.value) || 0);
      const apply = p => { nums.forEach(n => { const k = n.dataset.ch, x = Math.round((st[k] + (tgt[k] - st[k]) * p) * 20) / 20; n.value = x; const r = $(`input[data-chr="${k}"]`, lab); r.value = x; fill(r); }); run(); };
      if (G && !reduce) { const o = { p: 0 }; G.to(o, { p: 1, duration: 1, ease: 'power3.inOut', onUpdate: () => apply(o.p) }); } else apply(1);
    });
    run();
    if (G) G.from($$('.ml-curves path', lab), { strokeDashoffset: 900, strokeDasharray: 900, duration: 1.8, stagger: .2, ease: 'power3.out', clearProps: 'strokeDasharray,strokeDashoffset', scrollTrigger: { trigger: lab, start: 'top 75%' } });
    if (G) G.from(lab, { y: 140, rotateX: -16, scale: .94, opacity: 0, duration: 1.4, ease: 'expo.out', transformPerspective: 1400, scrollTrigger: { trigger: lab, start: 'top 90%' } });
  });

  /* ---- carryover demo ---- */
  $$('[data-adstock]').forEach(box => {
    if (box.dataset.bound) return; box.dataset.bound = 1;
    const r = $('input[type=range]', box), bars = $$('rect.b', box), out = $('[data-o="decay"]', box), rd = $('[data-o="adread"]', box);
    const fill = () => r.style.setProperty('--p', (+r.value / +r.max * 100) + '%');
    const up = () => {
      const d = +r.value / 100; out.textContent = r.value; fill();
      bars.forEach(b => { const w = +b.dataset.w, h = 120 * Math.pow(d, w) * (w === 0 ? 1 : 1); const y = 150 - h;
        G ? G.to(b, { attr: { y, height: h }, duration: .5, ease: 'power3.out' }) : (b.setAttribute('y', y), b.setAttribute('height', h)); });
      const first = (1 - d) * 100;
      rd.innerHTML = d === 0 ? 'No carryover: the whole effect lands in the week you spend. Typical of pure search.' :
        `The week you spend delivers <b>${first.toFixed(0)}%</b> of the total effect. The other <b>${(100 - first).toFixed(0)}%</b> arrives over the following weeks${d >= .5 ? ', so cutting this channel looks free at first and hurts later' : ''}.`;
    };
    r.addEventListener('input', up); up();
  });

  /* ---- diminishing returns demo ---- */
  $$('[data-sat]').forEach(box => {
    if (box.dataset.bound) return; box.dataset.bound = 1;
    const meta = { vmax: 15, k: 3.2, a: 1.3 };
    const r = $('input[type=range]', box), pt = $('.pt', box), tan = $('.tan', box), sp = $('[data-o="sp"]', box), rd = $('[data-o="satread"]', box);
    const X = x => x / 10 * 300, Y = y => 170 - y / 16 * 160;
    const fill = () => r.style.setProperty('--p', ((+r.value - +r.min) / (+r.max - +r.min) * 100) + '%');
    const up = () => {
      const x = +r.value, y = hill(meta, x), m = mroi(meta, x); fill(); sp.textContent = x;
      pt.setAttribute('cx', X(x)); pt.setAttribute('cy', Y(y));
      const dx = 1.6; tan.setAttribute('x1', X(x - dx)); tan.setAttribute('y1', Y(y - m * dx)); tan.setAttribute('x2', X(x + dx)); tan.setAttribute('y2', Y(y + m * dx));
      rd.innerHTML = `Average return here: <b>₹${(y / x).toFixed(2)}</b> per ₹1. The <b>next</b> ₹1 returns <b>₹${m.toFixed(2)}</b>${m < 1 ? ', less than it costs' : ''}.`;
    };
    r.addEventListener('input', up); up();
  });
  $$('.mm-idea').forEach((c, i) => { if (G) G.from(c, { y: 90, opacity: 0, rotateX: -18, duration: 1.2, delay: (i % 3) * .1, ease: 'expo.out', transformPerspective: 1200, scrollTrigger: { trigger: c, start: 'top 90%' } }); });
  $$('.tri').forEach((c, i) => { if (G) G.from(c, { y: 100, opacity: 0, duration: 1.1, delay: i * .12, ease: 'expo.out', scrollTrigger: { trigger: '.tris', start: 'top 85%' } }); });
  if (G && $('.tri-loop')) G.from('.tri-loop > *', { y: 20, opacity: 0, stagger: .07, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: '.tri-loop', start: 'top 92%' } });
}

initCalcs(); initConsoles(); initMMM();

/* contact page: preselect the service from ?s=meta etc. */
(() => {
  const sel = $('#f-svc'); if (!sel) return;
  let k = null; try { k = new URLSearchParams(location.search).get('s'); } catch (e) {}
  if (!k) return;
  const o = $$('option[data-k]', sel).find(x => x.dataset.k === k);
  if (o) { sel.value = o.value; sel.dispatchEvent(new Event('change')); }
})();

/* arriving on e.g. bidvista.html#waitlist: scroll there once the intro has played */
if (location.hash.length > 1) { let ht = null; try { ht = $(location.hash); } catch (e) {} if (ht) addEventListener('load', () => setTimeout(() => { ScrollTrigger.refresh(); scrollToEl(ht); }, 1400)); }

/* nav background on scroll */
{ const nb = $('#navbg'); if (nb) { const t = () => { const on = (window.scrollY || 0) > 40; nb.classList.toggle('on', on); document.documentElement.classList.toggle('nav-solid', on); }; addEventListener('scroll', t, { passive: true }); t(); } }


initForm();

/* =====================================================================
   CONTACT FORM — Formspree via fetch, falls back to normal POST
   ===================================================================== */
function initForm() {
  $$('form.js-form').forEach(f => {
  if (f.dataset.bound) return; f.dataset.bound = 1;
  const status = $('.f-status', f), btn = $('[type=submit]', f), method = f.dataset.form || 'contact_form';
  f.addEventListener('submit', async e => {
    if (!window.fetch) return; // let the browser post normally
    e.preventDefault();
    status.textContent = ''; status.classList.remove('err');
    const lbl = $('.lbl', btn); const old = btn.innerHTML;
    btn.disabled = true; if (lbl) lbl.innerHTML = '<span>Sending…</span><span>Sending…</span>';
    const fd = new FormData(f);
    try { const at = window.ivAttribution ? window.ivAttribution() : {}; Object.keys(at).forEach(k => { if (at[k] != null && at[k] !== '') fd.append(k, at[k]); }); } catch (x) {}
    try {
      const res = await fetch(f.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('bad');
      if (window.ivTrack) { ivTrack('generate_lead', { method: method, service: (f.elements.service && f.elements.service.value) || undefined }); if (method === 'bidvista_waitlist') ivTrack('bidvista_waitlist', { method: 'form' }); }
      const card = f.closest('.form-card');
      const done = document.createElement('div'); done.className = 'form-done';
      done.innerHTML = '<div class="ok"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div><h3>' + (f.dataset.doneTitle || 'Message sent.') + '</h3><p>' + (f.dataset.doneText || 'Thanks — we\'ll reply within 1 business day.') + ' For a faster answer, message us on <a href="' + (document.body.dataset.wa || '#') + '" style="color:var(--accent)">WhatsApp</a>.</p>';
      if (typeof gsap !== 'undefined') {
        gsap.to(f, { opacity: 0, y: -30, duration: .4, onComplete: () => { f.replaceWith(done); gsap.from(done, { scale: .8, opacity: 0, duration: .8, ease: 'back.out(1.8)' }); gsap.from($('.ok', done), { rotate: -180, scale: 0, duration: 1, delay: .2, ease: 'back.out(2)' }); window.__blobPulse = .9; } });
      } else f.replaceWith(done);
      card && card.scrollIntoView && card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      btn.disabled = false; btn.innerHTML = old;
      status.classList.add('err');
      status.innerHTML = 'Something went wrong sending that. Please email <a href="mailto:' + (document.body.dataset.email || '') + '" style="color:inherit;text-decoration:underline">' + (document.body.dataset.email || 'us') + '</a> or try WhatsApp.';
    }
  });
  });
}
function initFaqBasic() {
  $$('.qa').forEach(q => $('button', q).addEventListener('click', () => {
    const open = q.classList.toggle('open'); $('.ans', q).style.height = open ? 'auto' : '0';
  }));
}

addEventListener('load', () => ScrollTrigger.refresh());
let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();
