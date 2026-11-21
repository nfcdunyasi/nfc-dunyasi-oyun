// Düğün Planla — salon kat planı (SVG, metre ölçeğinde): çizim, kaydırma/yakınlaştırma, dokunma, sürükleme
import { OGELER, sahneOf } from './cekirdek.js?v=2026-11-21-e';
import { esc } from './ui.js?v=2026-11-21-e';

const OGE_AD = Object.fromEntries(OGELER);
let SAY = 0;
const f2 = (n) => Math.round(n * 1000) / 1000;
const buyuk = (s) => String(s || '').toLocaleUpperCase('tr');

/** Masanın sandalye konumları (masa merkezine göre, dönmeden önce) */
export function sandalyeler(m, adet) {
  const n = Math.max(0, adet), L = [];
  if (m.sekil === 'yuvarlak') {
    const R = m.w / 2 + 0.3;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; L.push([R * Math.cos(a), R * Math.sin(a)]); }
    return L;
  }
  if (m.ozel === 'gelin-damat') { for (let i = 0; i < n; i++) L.push([-m.w / 2 + (m.w / n) * (i + 0.5), -m.h / 2 - 0.3]); return L; }
  const ust = Math.ceil(n / 2), alt = n - ust;
  for (let i = 0; i < ust; i++) L.push([-m.w / 2 + (m.w / ust) * (i + 0.5), -m.h / 2 - 0.3]);
  for (let i = 0; i < alt; i++) L.push([-m.w / 2 + (m.w / alt) * (i + 0.5), m.h / 2 + 0.3]);
  return L;
}

/**
 * SVG iç çizimi. bilgi(m) → { sinif, alt, dolu:[taraf...], sandalye (gösterilecek sandalye sayısı), ad }
 */
export function planCiz(plan, { bilgi = null, izgara = true, olcu = true, sec = null, vurgu = null, cakisan = null, isimler = true } = {}) {
  const { en, boy } = plan;
  let s = `<rect class="m-zemin" x="0" y="0" width="${en}" height="${boy}"/>`;
  if (izgara) {
    let g = '', gb = '';
    for (let x = 1; x < en; x++) (x % 5 ? (g += `M${x} 0V${boy}`) : (gb += `M${x} 0V${boy}`));
    for (let y = 1; y < boy; y++) (y % 5 ? (g += `M0 ${y}H${en}`) : (gb += `M0 ${y}H${en}`));
    s += `<path class="m-izgara" d="${g}"/><path class="m-izgara b" d="${gb}"/>`;
  }
  s += `<rect class="m-duvar" x="0" y="0" width="${en}" height="${boy}" rx=".08"/>`;
  if (olcu) {
    s += `<path class="m-olcu-cizgi" d="M0 -.55H${en}M0 -.75V-.35M${en} -.75V-.35M-.55 0V${boy}M-.75 0H-.35M-.75 ${boy}H-.35"/>`;
    s += `<text class="m-olcu" x="${en / 2}" y="-.72" text-anchor="middle">${String(en).replace('.', ',')} m</text>`;
    s += `<text class="m-olcu" x="-.72" y="${boy / 2}" text-anchor="middle" transform="rotate(-90 -.72 ${boy / 2})">${String(boy).replace('.', ',')} m</text>`;
  }
  for (const o of plan.ogeler) {
    const etk = o.tur === 'yazi' ? esc(o.ad || 'Yazı') : esc(buyuk(o.ad || OGE_AD[o.tur]));
    const fs = o.tur === 'yazi' ? '' : ` style="font-size:${f2(Math.min(o.tur === 'sahne' ? 0.55 : 0.38, Math.max(0.2, Math.min(o.w, o.h) * 0.42)))}px"`;
    const dik = Math.abs(o.r % 180) === 90;
    s += `<g class="m-oge ${o.tur}${sec && sec.has?.(o.id) ? ' secili' : ''}" data-oge="${o.id}" transform="translate(${o.x} ${o.y}) rotate(${o.r || 0})">`;
    s += `<rect x="${f2(-o.w / 2)}" y="${f2(-o.h / 2)}" width="${o.w}" height="${o.h}" rx="${o.tur === 'kolon' ? 0.04 : Math.min(0.18, o.w / 6, o.h / 6)}"/>`;
    if (o.tur !== 'kolon' && (o.w > 0.9 || o.tur === 'yazi')) s += `<text text-anchor="middle" dominant-baseline="central"${fs}${dik ? ` transform="rotate(-90)"` : ''}>${etk}</text>`;
    if (sec && sec.has?.(o.id)) s += `<rect class="m-secim" x="${f2(-o.w / 2 - 0.15)}" y="${f2(-o.h / 2 - 0.15)}" width="${f2(o.w + 0.3)}" height="${f2(o.h + 0.3)}" rx=".2"/>`;
    s += '</g>';
  }
  for (const m of plan.masalar) {
    const b = bilgi ? bilgi(m) : { sinif: '', alt: `${m.kap} kişi`, dolu: [], sandalye: m.kap };
    const cls = ['m-masa', b.sinif || '', m.ozel ? 'ozel' : '', sec && sec.has?.(m.id) ? 'secili' : '', vurgu === m.id ? 'vurgulu' : '', cakisan && cakisan.has(m.id) ? 'm-cakisma' : ''].join(' ');
    s += `<g class="${cls}" data-masa="${m.id}" transform="translate(${m.x} ${m.y}) rotate(${m.r || 0})">`;
    const adet = b.sandalye ?? m.kap;
    sandalyeler(m, adet).forEach(([x, y], i) => { const t = b.dolu?.[i]; s += `<circle class="m-sandalye${t ? ' dolu ' + t : ''}${i >= m.kap ? ' ek' : ''}" cx="${f2(x)}" cy="${f2(y)}" r=".19"/>`; });
    if (vurgu === m.id) s += m.sekil === 'yuvarlak' ? `<circle class="m-nabiz" r="${m.w / 2}"/>` : `<rect class="m-nabiz" x="${-m.w / 2}" y="${-m.h / 2}" width="${m.w}" height="${m.h}" rx=".12"/>`;
    s += m.sekil === 'yuvarlak' ? `<circle class="govde" r="${m.w / 2}"/>` : `<rect class="govde" x="${f2(-m.w / 2)}" y="${f2(-m.h / 2)}" width="${m.w}" height="${m.h}" rx=".12"/>`;
    const kucuk = Math.min(m.w, m.h) < 1.2;
    const geri = m.r ? ` transform="rotate(${-m.r})"` : '';
    s += `<g${geri}>`;
    if (m.ozel === 'gelin-damat') s += `<text class="no" style="font-size:.32px">${esc(isimler ? b.ad || 'Gelin & Damat' : 'G & D')}</text>`;
    else {
      s += `<text class="no" y="${b.alt ? (kucuk ? -0.1 : -0.14) : 0}"${kucuk ? ' style="font-size:.46px"' : ''}>${m.no}</text>`;
      if (b.alt) s += `<text class="alt" y="${kucuk ? 0.26 : 0.36}"${kucuk ? ' style="font-size:.22px"' : ''}>${esc(b.alt)}</text>`;
    }
    s += '</g>';
    if (isimler && b.ad && m.ozel !== 'gelin-damat') s += `<text class="ad"${geri} y="${f2((m.sekil === 'yuvarlak' ? m.w / 2 : m.h / 2) + 0.78)}">${esc(b.ad.length > 22 ? b.ad.slice(0, 21) + '…' : b.ad)}</text>`;
    s += '</g>';
  }
  return s;
}
export function planSvg(plan, o = {}) {
  const k = 1.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-k} ${-k} ${plan.en + 2 * k} ${plan.boy + 2 * k}" preserveAspectRatio="xMidYMid meet">${planCiz(plan, o)}</svg>`;
}

/**
 * Etkileşimli harita. mod: 'plan' (masaya dokun / sürükle-bırak hedefi), 'goster' (salt okunur), 'duzen' (masa ve öğe taşınır)
 * Geri çağrılar: onMasa(id, e), onOge(id, e), onBos(e), onTasiBasla(id, tur), onTasi(dx, dy), onTasiBit(dx, dy)
 */
export function harita(kap, a) {
  const id = ++SAY;
  kap.classList.add('harita'); if (a.mod === 'duzen') kap.classList.add('duzen');
  kap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Salon planı"></svg><div class="harita-arac"><button type="button" data-z="+" aria-label="Yakınlaştır"><svg class="ikon k" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button type="button" data-z="-" aria-label="Uzaklaştır"><svg class="ikon k" viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button><button type="button" data-z="0" aria-label="Tümünü göster"><svg class="ikon k" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>${a.ipucu ? `<div class="harita-ipucu">${esc(a.ipucu)}</div>` : ''}`;
  const svg = kap.querySelector('svg');
  let plan = a.plan, gor = null, ilk = true;
  const kenar = () => (a.olcu === false ? 0.8 : 1.6);
  const tum = () => ({ x: -kenar(), y: -kenar(), w: plan.en + 2 * kenar(), h: plan.boy + 2 * kenar() });
  const vb = () => svg.setAttribute('viewBox', `${f2(gor.x)} ${f2(gor.y)} ${f2(gor.w)} ${f2(gor.h)}`);
  function ciz() { svg.innerHTML = planCiz(plan, { bilgi: a.bilgi, izgara: a.izgara !== false, olcu: a.olcu !== false, sec: a.secili?.(), vurgu: a.vurgu?.(), cakisan: a.cakisan?.(), id, isimler: a.isimler !== false }); if (ilk || !gor) { gor = tum(); ilk = false; } vb(); }
  const olcek = () => { const r = svg.getBoundingClientRect(); return Math.max(gor.w / (r.width || 1), gor.h / (r.height || 1)); };
  function metre(cx, cy) { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const q = p.matrixTransform(m.inverse()); return { x: q.x, y: q.y }; }
  function sinirla() { const t = tum(); gor.w = Math.min(Math.max(gor.w, 3.5), t.w * 2.2); gor.h = gor.w * (svg.clientHeight / Math.max(1, svg.clientWidth)) || gor.h; const cx = gor.x + gor.w / 2, cy = gor.y + gor.h / 2; const nx = Math.min(Math.max(cx, t.x), t.x + t.w), ny = Math.min(Math.max(cy, t.y), t.y + t.h); gor.x += nx - cx; gor.y += ny - cy; }
  function yakin(f, px, py) { const n = gor.w / f; if (n < 3.5 || n > tum().w * 2.2) return; gor.x = px - (px - gor.x) / f; gor.y = py - (py - gor.y) / f; gor.w /= f; gor.h /= f; sinirla(); vb(); }
  let anim = 0;
  function git(hedef, ms = 320) {
    cancelAnimationFrame(anim); const bas = { ...gor }, t0 = performance.now();
    const ad = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3; for (const z of ['x', 'y', 'w', 'h']) gor[z] = bas[z] + (hedef[z] - bas[z]) * e; vb(); if (k < 1) anim = requestAnimationFrame(ad); };
    anim = requestAnimationFrame(ad);
  }
  function sigdir(animasyon = true) { const r = svg.getBoundingClientRect(), t = tum(); const oran = (r.height || 1) / (r.width || 1); let w = t.w, h = t.h; if (h / w < oran) h = w * oran; else w = h / oran; const hedef = { x: t.x + (t.w - w) / 2, y: t.y + (t.h - h) / 2, w, h }; animasyon ? git(hedef) : ((gor = hedef), vb()); }
  function odakla(mid, genislik = 11) { const m = plan.masalar.find((x) => x.id === mid) || plan.ogeler.find((x) => x.id === mid); if (!m) return; const r = svg.getBoundingClientRect(), oran = (r.height || 1) / (r.width || 1); const w = Math.min(tum().w, genislik), h = w * oran; git({ x: m.x - w / 2, y: m.y - h / 2, w, h }); }
  kap.querySelector('.harita-arac').addEventListener('click', (e) => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; if (z === '0') return sigdir(); const c = { x: gor.x + gor.w / 2, y: gor.y + gor.h / 2 }; yakin(z === '+' ? 1.4 : 1 / 1.4, c.x, c.y); });
  // ---- işaretçi
  const P = new Map(); let ad = null; // { tur:'tap'|'pan'|'tasi'|'pinch', ... }
  const hedefi = (t) => { const m = t.closest && t.closest('[data-masa]'), o = t.closest && t.closest('[data-oge]'); return m ? { tur: 'masa', id: m.dataset.masa } : o ? { tur: 'oge', id: o.dataset.oge } : null; };
  svg.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    svg.setPointerCapture?.(e.pointerId);
    P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (P.size === 2) { const [p, q] = [...P.values()]; ad = { tur: 'pinch', d: Math.hypot(p.x - q.x, p.y - q.y), m: metre((p.x + q.x) / 2, (p.y + q.y) / 2) }; return; }
    const h = hedefi(e.target);
    ad = { tur: 'tap', h, x: e.clientX, y: e.clientY, gx: gor.x, gy: gor.y, t: Date.now(), m0: metre(e.clientX, e.clientY) };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!P.has(e.pointerId) || !ad) return;
    P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ad.tur === 'pinch' && P.size >= 2) { const [p, q] = [...P.values()]; const d = Math.hypot(p.x - q.x, p.y - q.y); if (ad.d > 0) { yakin(d / ad.d, ad.m.x, ad.m.y); ad.d = d; } return; }
    const dx = e.clientX - ad.x, dy = e.clientY - ad.y;
    if (ad.tur === 'tap' && Math.hypot(dx, dy) > 6) {
      if (a.mod === 'duzen' && ad.h && a.onTasiBasla && a.onTasiBasla(ad.h.id, ad.h.tur) !== false) ad.tur = 'tasi';
      else ad.tur = 'pan';
    }
    if (ad.tur === 'pan') { const k = olcek(); gor.x = ad.gx - dx * k; gor.y = ad.gy - dy * k; sinirla(); vb(); }
    else if (ad.tur === 'tasi') { const m = metre(e.clientX, e.clientY); a.onTasi && a.onTasi(m.x - ad.m0.x, m.y - ad.m0.y); }
  });
  const birak = (e) => {
    if (!P.has(e.pointerId)) return;
    P.delete(e.pointerId);
    if (!ad) return;
    if (ad.tur === 'pinch') { if (!P.size) ad = null; return; }
    if (ad.tur === 'tap' && e.type === 'pointerup') { if (ad.h?.tur === 'masa') a.onMasa && a.onMasa(ad.h.id, e); else if (ad.h?.tur === 'oge') a.onOge && a.onOge(ad.h.id, e); else a.onBos && a.onBos(e); }
    else if (ad.tur === 'tasi') { const m = metre(e.clientX, e.clientY); a.onTasiBit && a.onTasiBit(m.x - ad.m0.x, m.y - ad.m0.y); }
    ad = null;
  };
  svg.addEventListener('pointerup', birak); svg.addEventListener('pointercancel', birak);
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const m = metre(e.clientX, e.clientY); const f = Math.exp(-(e.deltaY || 0) * (e.ctrlKey ? 0.012 : 0.0022)); yakin(f, m.x, m.y); }, { passive: false });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (gor) { const r = svg.getBoundingClientRect(); if (r.width && r.height) { const cy = gor.y + gor.h / 2; gor.h = gor.w * (r.height / r.width); gor.y = cy - gor.h / 2; vb(); } } }) : null;
  ro && ro.observe(kap);
  ciz(); requestAnimationFrame(() => sigdir(false));
  return {
    svg, ciz, sigdir, odakla, metre,
    merkez() { return gor ? { x: gor.x + gor.w / 2, y: gor.y + gor.h / 2 } : { x: plan.en / 2, y: plan.boy / 2 }; },
    planDegis(p, { sigdir: s = false } = {}) { plan = p; ciz(); if (s) sigdir(false); },
    get plan() { return plan; },
    masaAt(cx, cy) { const el = document.elementFromPoint(cx, cy); return el && kap.contains(el) ? el.closest('[data-masa]')?.dataset.masa || null : null; },
    hedefGoster(mid) { svg.querySelectorAll('.m-masa.hedef').forEach((g) => g.classList.remove('hedef')); if (mid) svg.querySelector(`[data-masa="${mid}"]`)?.classList.add('hedef'); },
    ogeTasi(oid, tur, x, y) { const g = svg.querySelector(tur === 'masa' ? `[data-masa="${oid}"]` : `[data-oge="${oid}"]`); if (!g) return; const r = (g.getAttribute('transform') || '').match(/rotate\(([^)]*)\)/); g.setAttribute('transform', `translate(${f2(x)} ${f2(y)}) rotate(${r ? r[1] : 0})`); },
    kapat() { ro && ro.disconnect(); cancelAnimationFrame(anim); },
  };
}
export { sahneOf };
