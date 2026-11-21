// Düğün Planla — ortak arayüz yardımcıları: ikonlar, çekmece, onay, bildirim, tema, QR, yönlendirme
import { qrMatris } from '/yonetim/qr.js?v=2026-11-21-f';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const ONIZLEME = !!window.DP_ONIZLEME;
export const SITE = location.hostname.endsWith('nfcdunyasi.com') || ONIZLEME || !/^(localhost|127\.)/.test(location.hostname) ? 'https://nfcdunyasi.com' : location.origin;
export const TL = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const sayiYaz = (n) => new Intl.NumberFormat('tr-TR').format(Number(n) || 0);
export function zamanOnce(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'az önce'; if (s < 3600) return Math.floor(s / 60) + ' dk önce'; if (s < 86400) return Math.floor(s / 3600) + ' sa önce';
  const g = Math.floor(s / 86400); return g < 30 ? g + ' gün önce' : new Date(t).toLocaleDateString('tr-TR');
}

// ---------------------------------------------------------------- yönlendirme (önizlemede # ile)
export function yol() { return ONIZLEME ? (location.hash.slice(1) || '/dugun/demo') : location.pathname; }
let DEMO_YOL = false;
export const demoYol = (v) => { DEMO_YOL = !!v; };
/** Uygulama içi yolu gerçek adrese çevirir: /yonetim → /dugun/yonetim; demoda /d, /salon, /yonetim → /dugun/demo/... */
export const tamYol = (p) => (p.startsWith('/yonetim') ? (DEMO_YOL ? '/dugun/demo' : '/dugun') + p : DEMO_YOL && (p.startsWith('/d/') || p.startsWith('/salon/')) ? '/dugun/demo' + p : p);
let AYRILMA = null;
export const ayrilmaKoy = (f) => { AYRILMA = f; };
export async function git(p, { degistir = false } = {}) {
  p = tamYol(p);
  if (AYRILMA && !(await AYRILMA())) return;
  if (ONIZLEME) { if (degistir) history.replaceState(null, '', '#' + p); else location.hash = p; window.dispatchEvent(new Event('dp-yol')); return; }
  if (p === location.pathname + location.hash) return;
  history[degistir ? 'replaceState' : 'pushState'](null, '', p); window.dispatchEvent(new Event('dp-yol'));
}
export const href = (p) => (ONIZLEME ? '#' : '') + tamYol(p);
/** Paylaşılacak tam adres (demoda demo yolu) */
export const paylasLink = (p) => SITE + tamYol(p);
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-git]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.button) return;
  e.preventDefault(); git(a.dataset.git);
});

// ---------------------------------------------------------------- ikonlar (24×24, çizgi)
const I = {
  ozet: '<path d="M3.5 10.5 12 4l8.5 6.5M5.5 9v10.5h4.5v-6h4v6h4.5V9"/>',
  davetli: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.5-3.3 2.9-5.2 6-5.2s5.5 1.9 6 5.2"/><path d="M15.2 5.3a3 3 0 0 1 0 5.6M17.5 14.6c2 .6 3.2 2.3 3.5 4.9"/>',
  masa: '<circle cx="12" cy="12" r="4.3"/><circle cx="12" cy="3.9" r="1.3"/><circle cx="19" cy="8" r="1.3"/><circle cx="19" cy="16" r="1.3"/><circle cx="12" cy="20.1" r="1.3"/><circle cx="5" cy="16" r="1.3"/><circle cx="5" cy="8" r="1.3"/>',
  gorev: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
  akis: '<path d="M7 4v16"/><circle cx="7" cy="6.5" r="1.7"/><circle cx="7" cy="12" r="1.7"/><circle cx="7" cy="17.5" r="1.7"/><path d="M11.5 6.5H20M11.5 12H20M11.5 17.5h5.5"/>',
  paylas: '<path d="M12 15V4M8 7.5 12 3.5l4 4"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>',
  ayar: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  ara: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  arti: '<path d="M12 5v14M5 12h14"/>', eksi: '<path d="M6 12h12"/>', carpi: '<path d="M6 6l12 12M18 6 6 18"/>',
  cop: '<path d="M4.5 7h15M10 4h4M6.5 7l.8 11.5A1.6 1.6 0 0 0 8.9 20h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10 10.5v6M14 10.5v6"/>',
  kalem: '<path d="M4 20h4L19.2 8.8a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20z"/><path d="m14.5 6.5 3 3"/>',
  kilit: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  geri: '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',
  sihir: '<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  konum: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
  takvim: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  saat: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  telefon: '<path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z"/>',
  mesaj: '<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.4-4A7.5 7.5 0 1 1 20 11.5z"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2v2h-2zM18 14h2M14 19.5h2"/>',
  indir: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>', yukle: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
  sag: '<path d="m9.5 6 6 6-6 6"/>', sol: '<path d="m14.5 6-6 6 6 6"/>', asagi: '<path d="m6 9.5 6 6 6-6"/>', yukari: '<path d="m6 14.5 6-6 6 6"/>',
  kopya: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3"/>',
  goz: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  cikis: '<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16l4-4-4-4M14 12H4.5"/>',
  uyari: '<path d="M12 4.2 21 19.5H3z"/><path d="M12 10v4.2M12 17.2v.1"/>', bilgi: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  tik: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', yazdir: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7.5" rx="1.8"/><path d="M7 14h10v6H7z"/>',
  baglanti: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  salon: '<path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M9 20v-5.5h6V20M3 20h18"/>', kisi: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.8 3.3-6 7-6s6.4 2.2 7 6"/>',
  menu: '<path d="M5.5 12h.01M12 12h.01M18.5 12h.01" stroke-width="2.6"/>', filtre: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  yenile: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>', tasi: '<path d="M12 3.5v17M3.5 12h17M9 6.5l3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3"/>',
  sigdir: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', etiket: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.3 6.3a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.4"/>',
  dosya: '<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M14 3.5V8h4"/>', istatistik: '<path d="M5 20V11M10 20V5M15 20v-7M20 20V9"/>',
  para: '<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/>', dondur: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4.5h-4.5"/>',
  kalp: '<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>', duzen: '<path d="M4 4h16v16H4z"/><path d="M4 10h16M10 10v10"/>',
};
export const ikon = (ad, cls = '') => `<svg class="ikon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[ad] || ''}</svg>`;
/** Ürün simgesi: koyu kare içinde yuvarlak masa ve sandalyeler (favicon ile aynı çizim) */
const SANDALYE = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4 - Math.PI / 2; return `<circle cx="${(16 + 9.4 * Math.cos(a)).toFixed(2)}" cy="${(16 + 9.4 * Math.sin(a)).toFixed(2)}" r="1.8"/>`; }).join('');
export const markaIkon = (px = 28, cls = '') => `<svg class="${cls}" width="${px}" height="${px}" viewBox="0 0 32 32" aria-hidden="true" style="flex:none;display:block;border-radius:${Math.round(px * 0.23)}px"><rect width="32" height="32" rx="7.4" fill="#1d1d1f"/><g fill="#fff"><circle cx="16" cy="16" r="5.4"/>${SANDALYE}</g></svg>`;

// ---------------------------------------------------------------- bildirim
export function bildir(m, { hata = false, eylem = null, eylemAd = 'Geri al', sure } = {}) {
  let k = $('.bildirimler'); if (!k) { k = document.createElement('div'); k.className = 'bildirimler'; k.setAttribute('aria-live', 'polite'); document.body.appendChild(k); }
  const d = document.createElement('div'); d.className = 'bildirim' + (hata ? ' hata' : '');
  d.innerHTML = `<span>${esc(m)}</span>${eylem ? `<button type="button">${esc(eylemAd)}</button>` : ''}`;
  if (eylem) d.querySelector('button').onclick = () => { d.remove(); eylem(); };
  k.appendChild(d); while (k.children.length > 3) k.firstChild.remove();
  setTimeout(() => d.remove(), sure || (eylem ? 6500 : hata ? 5200 : 2800));
}

// ---------------------------------------------------------------- çekmece
let acikCekmece = [];
export function cekmece({ baslik = '', govde = '', alt = '', genis = false, onAc = null, onKapat = null, kapatilamaz = false } = {}) {
  const dl = document.createElement('dialog'); dl.className = 'cekmece' + (genis ? ' genis' : '');
  dl.innerHTML = `<div class="cekmece-bas"><i class="tut"></i><h2>${baslik}</h2><button class="dg ikon-d" type="button" data-kapat aria-label="Kapat">${ikon('carpi')}</button></div><div class="cekmece-govde">${govde}</div>${alt ? `<div class="cekmece-alt">${alt}</div>` : ''}`;
  document.body.appendChild(dl);
  let kapandi = false;
  const g = dl.querySelector('.cekmece-govde');
  // Gövdenin yüksekliği açıkça verilir: bazı Safari sürümleri esnek kutuda gövdeyi sıfıra indirip içeriği gizliyordu
  const boyutla = () => { if (!dl.isConnected) return removeEventListener('resize', boyutla); const genis = matchMedia('(min-width: 720px)').matches, ust = Math.min(innerHeight * (genis ? 0.86 : 0.92), genis ? 860 : 900); const a = dl.querySelector('.cekmece-alt'); g.style.maxHeight = Math.max(120, Math.floor(ust - dl.querySelector('.cekmece-bas').offsetHeight - (a ? a.offsetHeight : 0))) + 'px'; };
  const kapat = (sonuc) => { if (kapandi) return; kapandi = true; removeEventListener('resize', boyutla); acikCekmece = acikCekmece.filter((x) => x !== dl); try { dl.close(); } catch { /* */ } dl.remove(); onKapat && onKapat(sonuc); };
  dl.addEventListener('cancel', (e) => { e.preventDefault(); if (!kapatilamaz) kapat(); });
  dl.addEventListener('click', (e) => { if (e.target === dl && !kapatilamaz) kapat(); if (e.target.closest('[data-kapat]')) kapat(); });
  try { dl.showModal(); } catch { dl.setAttribute('open', ''); }
  acikCekmece.push(dl);
  boyutla(); addEventListener('resize', boyutla);
  if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => { const a = document.activeElement; if (a && dl.contains(a) && a.matches('input,textarea,select')) return; const f = g.querySelector('input:not([type=hidden]):not([type=checkbox]):not([readonly]),textarea'); f && f.focus(); }, 30);
  else dl.querySelector('[data-kapat]').blur();
  onAc && onAc(dl, kapat);
  return { el: dl, kapat };
}
export const cekmeceKapatHepsi = () => { for (const d of [...acikCekmece]) { try { d.close(); } catch { /* */ } d.remove(); } acikCekmece = []; };
export function onayla({ baslik = 'Emin misiniz?', metin = '', evet = 'Evet', hayir = 'Vazgeç', tehlike = false } = {}) {
  return new Promise((ok) => {
    const c = cekmece({ baslik: esc(baslik), govde: metin ? `<p class="soluk" style="font-size:15.5px">${metin}</p>` : '', alt: `<button class="dg sade" data-c="0" type="button">${esc(hayir)}</button><button class="dg ${tehlike ? 'tehlike' : 'ana'}" data-c="1" type="button">${esc(evet)}</button>`, onKapat: (s) => ok(s === true) });
    c.el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => c.kapat(b.dataset.c === '1')));
  });
}

// ---------------------------------------------------------------- tema
/** İki görünüm: açık ve koyu. Salonun rengi düğmelere, seçili sekmeye ve masa numarasına gelir. */
export const STILLER = {
  acik: { ad: 'Açık', koyu: false, zemin: '#f5f5f7', yuzey: '#ffffff', yuzey2: '#f5f5f7', kontrol: '#e8e8ed', yazi: '#1d1d1f', soluk: '#6e6e73', silik: '#86868b', cizgi: '#e5e5ea', cizgi2: '#d2d2d7', vurgu: '#0071e3' },
  koyu: { ad: 'Koyu', koyu: true, zemin: '#000000', yuzey: '#1c1c1e', yuzey2: '#2c2c2e', kontrol: '#3a3a3c', yazi: '#f5f5f7', soluk: '#a1a1a6', silik: '#8e8e93', cizgi: '#38383a', cizgi2: '#48484a', vurgu: '#0a84ff' },
};
/** Eski sürümün stil adları (fildişi, gece, …) yeni iki görünümden birine düşer */
const ESKI_STIL = { fildisi: 'acik', beyaz: 'acik', pudra: 'acik', gece: 'koyu', zumrut: 'koyu', lacivert: 'koyu', bordo: 'koyu' };
export const stilAdi = (s) => (STILLER[s] ? s : ESKI_STIL[s] || 'acik');
export const VURGULAR = [['#0071e3', 'Mavi'], ['#1d1d1f', 'Siyah'], ['#a2845e', 'Altın'], ['#c9435f', 'Gül'], ['#bf4800', 'Turuncu'], ['#248a3d', 'Yeşil'], ['#00808a', 'Turkuaz'], ['#5e5ce6', 'Mor']];
const hexRgb = (h) => { const n = parseInt(String(h || '#000').slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const parlaklik = (h) => { const [r, g, b] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const karistir = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
/** Salon temasını uygular. tam=false: sadece vurgu rengi (çift ve salon panelleri açık görünümde kalır) */
export function temaUygula(tema, { tam = true, kok = document.documentElement } = {}) {
  const st = STILLER[stilAdi(tema?.stil)];
  const s = tam ? st : STILLER.acik;
  let v = /^#[0-9a-f]{6}$/i.test(tema?.vurgu || '') ? tema.vurgu.toLowerCase() : s.vurgu;
  if (!s.koyu && parlaklik(v) > 0.45) v = karistir(v, '#000000', 0.4); // açık zeminde soluk renk okunmaz
  if (s.koyu && parlaklik(v) < 0.03) v = '#f5f5f7'; // koyu zeminde siyah düğme görünmez
  const [r, g, b] = hexRgb(v);
  const set = (k, x) => kok.style.setProperty('--' + k, x);
  for (const k of ['zemin', 'yuzey', 'yuzey2', 'kontrol', 'yazi', 'soluk', 'silik', 'cizgi', 'cizgi2']) set(k, s[k]);
  set('vurgu', v); set('vurgu-yazi', parlaklik(v) > 0.45 ? '#111111' : '#ffffff');
  set('vurgu-acik', `rgb(${r} ${g} ${b} / ${s.koyu ? 0.2 : 0.1})`);
  set('vurgu-koyu', s.koyu ? (parlaklik(v) < 0.1 ? karistir(v, '#ffffff', 0.4) : v) : parlaklik(v) > 0.2 ? karistir(v, '#000000', 0.3) : v);
  kok.classList.toggle('koyu', !!s.koyu);
  const m = document.querySelector('meta[name=theme-color]'); if (m && kok === document.documentElement) m.content = s.zemin;
}
export function temaSifirla() { const k = document.documentElement; k.removeAttribute('style'); k.classList.remove('koyu'); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = '#f5f5f7'; }

// ---------------------------------------------------------------- QR, pano, indirme
export function qrSvg(metin, { renk = '#111111', kenar = 2, seviye = 'M' } = {}) {
  const m = qrMatris(metin, seviye), n = m.length, t = n + kenar * 2;
  let p = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) p += `M${x + kenar} ${y + kenar}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${p}" fill="${renk}"/></svg>`;
}
export async function kopyala(m, el) {
  try { await navigator.clipboard.writeText(m); bildir('Kopyalandı'); return true; } catch {
    if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    bildir('Seçildi, kopyalamak için basılı tutun'); return false;
  }
}
export function indir(ad, icerik, tip = 'text/plain;charset=utf-8') {
  if (ONIZLEME) { bildir('Önizlemede dosya indirilemez; gerçek sitede çalışır.'); return; }
  const b = icerik instanceof Blob ? icerik : new Blob([icerik], { type: tip });
  const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = ad; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
export const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
export function gecikmeli(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
export const telTemiz = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '9' + d; else if (d.length === 10 && d.startsWith('5')) d = '90' + d; return d; };
export function waLink(tel, metin) { const d = telTemiz(tel); return `https://wa.me/${d.length >= 11 ? d : ''}?text=${encodeURIComponent(metin)}`; }
export function resimKucult(dosya, { max = 640, tip = 'image/png', kalite = 0.88 } = {}) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onerror = () => no(new Error('Dosya okunamadı'));
    r.onload = () => {
      const im = new Image();
      im.onerror = () => no(new Error('Bu dosya bir görsel değil'));
      im.onload = () => {
        const o = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(im.width * o)); cv.height = Math.max(1, Math.round(im.height * o));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL(tip, kalite));
      };
      im.src = r.result;
    };
    r.readAsDataURL(dosya);
  });
}
