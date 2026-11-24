// Randevu Vaktim — arayüz yardımcıları: yönlendirme, tema, simgeler, ortak parçalar.
// Temel parçalar (çekmece, bildirim, QR, kopyalama) Düğün Planla ile ortaktır.
import { $, $$, esc, TL, sayiYaz, ikon as dIkon, bildir, cekmece, onayla, qrSvg, kopyala, indir, waLink, resimKucult, bekle, gecikmeli, zamanOnce } from '/dugun/js/ui.js?v=2026-11-24-b';
import * as C from './cekirdek.js?v=2026-11-24-b';
import { ONIZLEME } from './api.js?v=2026-11-24-b';
import { fotoSec } from './kirp.js?v=2026-11-24-b';
export { $, $$, esc, TL, sayiYaz, bildir, cekmece, onayla, qrSvg, kopyala, indir, waLink, resimKucult, bekle, gecikmeli, zamanOnce, ONIZLEME };

export const SITE = ONIZLEME || location.hostname.endsWith('nfcdunyasi.com') || !/^(localhost|127\.)/.test(location.hostname) ? 'https://nfcdunyasi.com' : location.origin;

// ---------------------------------------------------------------- yönlendirme (önizlemede # ile)
export const yol = () => (ONIZLEME ? decodeURI(location.hash.slice(1)).split('?')[0] || '/randevu' : location.pathname.replace(/\/+$/, '') || '/');
export const sorgu = () => new URLSearchParams(ONIZLEME ? decodeURI(location.hash.slice(1)).split('?')[1] || '' : location.search);
let ciz = null;
export const cizKur = (f) => { ciz = f; };
export function git(p, { degistir = false, kaydirma = true } = {}) {
  const u = ONIZLEME ? '#' + p : p;
  if (degistir) history.replaceState(null, '', u); else history.pushState(null, '', u);
  if (kaydirma) scrollTo(0, 0);
  ciz && ciz();
}
export const href = (p) => (ONIZLEME ? '#' : '') + p;
export const paylasLink = (p) => SITE + p;
addEventListener('popstate', () => ciz && ciz());
// Bağlantılar: <html> üzerinde dinlenir. Ortak /dugun/js/ui.js de document üzerinde a[data-git] dinliyor (Düğün Planla yönlendiricisi);
// kabarcık <html>'den önce geçtiği için bu dinleyici önce çalışır ve olayı sahiplenir. Yönetimdeki "kaydedilmedi" koruması
// document yakalama aşamasında olduğundan ikisinden de önce çalışmaya devam eder.
document.documentElement.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-git]'); if (!a || e.defaultPrevented || a.target === '_blank') return;
  if (e.metaKey || e.ctrlKey || e.button) return; // yeni sekme: tarayıcıya bırakılır (ui.js de bunlara dokunmaz)
  e.preventDefault(); git(a.dataset.git);
});

// ---------------------------------------------------------------- tema
export const URUN_TEMA = { stil: 'acik', vurgu: '#1f7a5c', yazi: 'modern' };
export function temaUygula(tema, kok = document.documentElement) {
  const { degisken, koyu, zemin } = C.temaDegiskenleri(tema);
  for (const [k, v] of Object.entries(degisken)) kok.style.setProperty('--' + k, v);
  kok.classList.toggle('koyu', koyu);
  if (kok === document.documentElement) { const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = zemin; }
}

// ---------------------------------------------------------------- simgeler
const EK = {
  makas: '<circle cx="6.5" cy="6.5" r="2.8"/><circle cx="6.5" cy="17.5" r="2.8"/><path d="M8.6 8.4 19.5 18M8.6 15.6 19.5 6"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.7"/><circle cx="16.9" cy="7.1" r=".6" fill="currentColor"/>',
  whatsapp: '<path d="M5 19.5 6.1 16A7.6 7.6 0 1 1 9 18.6z"/><path d="M9.4 9.2c.2-.6.6-.7 1-.7l.5 1.4-.6.8a5 5 0 0 0 2.6 2.4l.7-.7 1.4.6c0 .5-.2.9-.8 1.1-1.6.4-5-2.2-4.8-4.9z"/>',
  kum: '<path d="M7 4h10M7 20h10M8 4c0 4.5 8 5.5 8 8s-8 3.5-8 8M16 4c0 4.5-8 5.5-8 8"/>',
  kart: '<rect x="3.5" y="6" width="17" height="12.5" rx="2.4"/><path d="M3.5 10h17M7 15h4"/>',
  ev: '<path d="M4.5 10.5 12 4.5l7.5 6V19a1 1 0 0 1-1 1H14v-5.5h-4V20H5.5a1 1 0 0 1-1-1z"/>',
  kilitAc: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2"/>',
  ekip: '<circle cx="9" cy="8.5" r="3"/><path d="M3.8 19a5.3 5.3 0 0 1 10.4 0M15.5 6a3 3 0 0 1 0 5.6M17.4 14.2A5.2 5.2 0 0 1 20.2 19"/>',
  sol: '<path d="M14.5 5.5 8 12l6.5 6.5"/>', asagi: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>', yukari: '<path d="m5.5 14.5 6.5-6.5 6.5 6.5"/>',
  bilgi: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
  carpi: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  yukle: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M5 15.5v2.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-2.5"/>',
  dukkan: '<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v7.5h13V12M10 19.5v-4.5h4v4.5"/>',
  urun: '<path d="M5.5 8.5h13l-1.1 11h-10.8z"/><path d="M9 10.5V7.5a3 3 0 0 1 6 0v3"/>',
};
export const ikon = (ad, cls = '') => (EK[ad] ? `<svg class="ikon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${EK[ad]}</svg>` : dIkon(ad, cls));
/** İşletme türü simgeleri (kategori sekmeleri ve kapak deseni) */
export const TUR_YOL = {
  tumu: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  berber: '<circle cx="6.2" cy="6.6" r="2.7"/><circle cx="6.2" cy="17.4" r="2.7"/><path d="M8.4 8.2 20 17.2M8.4 15.8 20 6.8"/>',
  kuafor: '<path d="M3.5 8.5a5 5 0 0 1 5-5h5.2l6.8 2.2v5.6l-6.8 2.2H8.5a5 5 0 0 1-5-5z"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m8.6 13.5-.9 7h3.4l1.2-7"/>',
  guzellik: '<path d="M11 3.5 12.8 8 17.5 9.8 12.8 11.6 11 16.2 9.2 11.6 4.5 9.8 9.2 8z"/><path d="m18 14 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  tirnak: '<rect x="9" y="2.5" width="6" height="7" rx="1.2"/><path d="M7.2 9.5h9.6l1.1 9.4a2.4 2.4 0 0 1-2.4 2.6H8.5a2.4 2.4 0 0 1-2.4-2.6z"/><path d="M9.5 14.5h5"/>',
  dovme: '<path d="m14.5 3.5 6 6-8.8 8.8H5.7v-6z"/><path d="m12.3 5.7 6 6M5.7 18.3 3 21"/>',
  spa: '<path d="M12 20.5c-4.4 0-8-2.7-8.8-7.2 3.3-.1 6.4 1.2 8.8 4 2.4-2.8 5.5-4.1 8.8-4-.8 4.5-4.4 7.2-8.8 7.2z"/><path d="M12 17.3c-2.1-2.6-2.4-6.4 0-10.8 2.4 4.4 2.1 8.2 0 10.8z"/>',
  klinik: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>',
  diger: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9.2 15.2l2 2 3.8-3.8"/>',
};
export const turIkon = (tur, cls = '') => `<svg class="ikon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${TUR_YOL[tur] || TUR_YOL.diger}</svg>`;
/** Kapak fotoğrafı yoksa: işletme renginde, türünün simgesiyle desenli zemin */
export function kapakStil(tema, tur) {
  const t = C.temaTemiz(tema, tur), { degisken: d, koyu } = C.temaDegiskenleri(t);
  const zemin = koyu ? d.yuzey2 : d.vurgu, cizgi = koyu ? d.vurgu : C.yaziRengi(d.vurgu);
  const yolu = (TUR_YOL[tur] || TUR_YOL.diger).replace(/"/g, "'");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'><g fill='none' stroke='${cizgi}' stroke-opacity='${koyu ? 0.22 : 0.17}' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'><g transform='translate(18 18) scale(1.25)'>${yolu}</g><g transform='translate(84 78) rotate(-16 12 12) scale(1.25)'>${yolu}</g></g></svg>`;
  return `background-color:${zemin};background-image:linear-gradient(160deg,rgb(255 255 255 / .07),rgb(0 0 0 / .14)),url("data:image/svg+xml,${encodeURIComponent(svg)}");background-size:auto,132px 132px`;
}
/** Fiyat aralığı: ₺250 – ₺600 */
export const fiyatAralik = (min, max) => (!max ? '' : min === max || !min ? TL(max) : `${TL(min)} – ${TL(max)}`);
/** Ürün simgesi: koyu kare içinde kronometre */
export const markaIkon = (px = 28) => `<svg width="${px}" height="${px}" viewBox="0 0 32 32" aria-hidden="true" style="flex:none;display:block;border-radius:${Math.round(px * 0.23)}px"><rect width="32" height="32" rx="7.4" fill="#1d1d1f"/><circle cx="16" cy="17.2" r="8.4" fill="none" stroke="#fff" stroke-width="2.1"/><path d="M16 12.6v4.8l3.1 2" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 5.8h6" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/><circle cx="23.2" cy="10" r="1.6" fill="#3fbf8f"/></svg>`;

// ---------------------------------------------------------------- ortak parçalar
export const yukleniyor = () => '<div class="yukleniyor"><i></i></div>';
export function avatar(p, px = 44, cls = '') {
  return p?.foto ? `<img class="rv-av ${cls}" src="${esc(p.foto)}" alt="" width="${px}" height="${px}" style="--av:${px}px" loading="lazy">` : `<span class="rv-av ${cls}" style="--av:${px}px" aria-hidden="true">${esc(C.basHarf(p?.ad || '?'))}</span>`;
}
/** İşletme logosu; logo yoksa baş harfler. kendi: işletmenin kendi renkleriyle (yönetim listelerinde) */
export function logo(s, px = 64, cls = '', kendi = false) {
  let st = `--lg:${px}px`;
  if (kendi && s?.tema) { const d = C.temaDegiskenleri(s.tema).degisken; st += ['zemin', 'yuzey', 'vurgu', 'vurgu-yazi', 'vurgu-koyu', 'cizgi', 'baslik'].map((k) => `;--${k}:${d[k]}`).join(''); }
  return s?.tema?.logo ? `<img class="rv-logo ${cls}" src="${esc(s.tema.logo)}" alt="${esc(s.ad)}" style="${esc(st)}">` : `<span class="rv-logo harf ${cls}" style="${esc(st)}" aria-hidden="true">${esc(C.basHarf(s?.ad || '?'))}</span>`;
}
export const durumRozet = (d, kisa = true) => { const x = C.DURUM[d] || C.DURUM.onay; return `<span class="rozet ${x.sinif}">${esc(kisa ? x.kisa : x.ad)}</span>`; };
export const saatAraligi = (r) => `${C.saatYaz(r.bas)}–${C.saatYaz(r.bit)}`;
export const hizmetYazi = (H) => (H || []).map((h) => h.ad).join(' + ');
export const randevuNo = (id) => String(id || '').slice(-6).toUpperCase();
/** Sunucu saatine göre çalışan geri sayım; her saniye f(kalanMs) */
export function geriSayim(sonMs, fark, f) {
  let t = null;
  const tik = () => { const k = sonMs - (Date.now() + fark); f(Math.max(0, k)); if (k <= 0) clearInterval(t); };
  tik(); t = setInterval(tik, 1000);
  return () => clearInterval(t);
}
export const dkSn = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---------------------------------------------------------------- takvime ekle
const icsKac = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsZaman = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function takvimeEkle({ uid, baslik, aciklama, yer, tarih, bas, bit }) {
  const b = C.trMs(tarih, bas), s = C.trMs(tarih, bit);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NFC Dunyasi//Randevu Vaktim//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${uid}@nfcdunyasi.com`, `DTSTAMP:${icsZaman(Date.now())}`, `DTSTART:${icsZaman(b)}`, `DTEND:${icsZaman(s)}`, `SUMMARY:${icsKac(baslik)}`, `DESCRIPTION:${icsKac(aciklama)}`, `LOCATION:${icsKac(yer)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${icsKac(baslik)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(baslik)}&dates=${icsZaman(b)}/${icsZaman(s)}&details=${encodeURIComponent(aciklama)}&location=${encodeURIComponent(yer)}`;
  const c = cekmece({
    baslik: 'Takvime ekle',
    govde: `<div class="rv-secenekler"><button class="rv-secenek" type="button" data-t="ics">${ikon('takvim')}<span><b>iPhone, Mac ya da Outlook</b><small>Takvim dosyası (.ics) indirilir; açınca randevu takviminize eklenir.</small></span></button>
      <a class="rv-secenek" href="${esc(g)}" target="_blank" rel="noopener">${ikon('takvim')}<span><b>Google Takvim</b><small>Google Takvim yeni sekmede açılır.</small></span></a></div>`,
  });
  c.el.querySelector('[data-t=ics]').onclick = () => { indir('randevu.ics', ics, 'text/calendar;charset=utf-8'); c.kapat(); };
}

/** Fotoğraf seçtirir ve ayarlatır (sürükle, yakınlaştır, döndür, oran): data: URL döner (vazgeçilirse null). Bkz. kirp.js */
export const gorselSec = (o = {}) => fotoSec(o);
/** Hata kutusu: tekrar dene düğmesiyle */
export const hataKutu = (m, tekrar = true) => `<div class="kart bos rv-hata">${ikon('uyari')}<p>${esc(m)}</p>${tekrar ? '<button class="dg ana" type="button" data-tekrar>Tekrar dene</button>' : ''}</div>`;
export function metaRobots(kapali) {
  let m = document.querySelector('meta[name=robots]');
  if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
  m.content = kapali ? 'noindex, nofollow' : 'index, follow';
}
