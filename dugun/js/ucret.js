// Düğün Planla — salon ücret hesabı. Düğün Planla yönetici paneli ve NFC Dünyası ana paneli aynı hesabı kullanır.
// Modeller: dugun (düğün başı), aylik (sabit), ikisi (aylık + düğün başı), yok.
// Bir ayın hesabı = aylık sabit + o ay tarihli (ücrete dahil) düğün sayısı × düğün başı ücret.
// Düğün başı ücret varsa hesap, düğünler bittikten sonra ertesi ayın ödeme gününde ödenir; yalnız aylık ücrette aynı ayın ödeme gününde.
import * as C from './cekirdek.js?v=2026-11-24-a';

export const MODELLER = [['dugun', 'Düğün başı'], ['aylik', 'Aylık sabit'], ['ikisi', 'Aylık + düğün başı'], ['yok', 'Ücret yok']];
export function modelAl(s) {
  const o = s?.odeme || {};
  if (MODELLER.some(([k]) => k === o.model)) return o.model;
  return o.periyot === 'yok' ? 'yok' : o.tutar > 0 ? 'aylik' : 'dugun';
}
export const ayEkle = (ay, n) => { const [y, m] = ay.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
export const ayAdi = (ay, { kisa = false, yil = true } = {}) => { const a = C.AYLAR[+ay.slice(5) - 1] || ''; return (kisa ? a.slice(0, 3) : a) + (yil ? ' ' + ay.slice(0, 4) : ''); };

/** Ücret açıklaması, ör. "Düğün başı 750 ₺" ya da "1.500 ₺/ay + düğün başı 400 ₺" */
export function ucretYazi(s, TL) {
  const m = modelAl(s), o = s?.odeme || {};
  if (m === 'yok') return 'Ücret yok';
  if (m === 'dugun') return o.dugunBasi ? `Düğün başı ${TL(o.dugunBasi)}` : 'Düğün başı ücret girilmedi';
  if (m === 'aylik') return o.tutar ? `${TL(o.tutar)} / ay` : 'Aylık ücret girilmedi';
  return `${TL(o.tutar || 0)} / ay + düğün başı ${TL(o.dugunBasi || 0)}`;
}

/** Bir ayın hesabı */
export function donem(s, dugunler, ay, bugun = C.trBugun()) {
  const o = s?.odeme || {}, m = modelAl(s);
  const bas = o.baslangic ? o.baslangic.slice(0, 7) : '', basladi = !bas || ay >= bas;
  const D = dugunler.filter((d) => d.salon === s.slug && (d.tarih || '').startsWith(ay));
  const ucretli = D.filter((d) => !d.ucretsiz).length;
  const birim = m === 'dugun' || m === 'ikisi' ? +o.dugunBasi || 0 : 0;
  const sabit = basladi && (m === 'aylik' || m === 'ikisi') && s.aktif !== false ? +o.tutar || 0 : 0;
  const dTutar = basladi ? ucretli * birim : 0, tutar = sabit + dTutar;
  const odenen = (s.odemeler || []).filter((p) => p.donem === ay).reduce((n, p) => n + (+p.tutar || 0), 0);
  const vade = `${birim ? ayEkle(ay, 1) : ay}-${String(o.gun || 1).padStart(2, '0')}`;
  const kalan = Math.max(0, tutar - odenen);
  const durum = !tutar ? (odenen ? 'odendi' : 'yok') : kalan <= 0 ? 'odendi' : bugun > vade ? 'gecikti' : 'bekliyor';
  return { ay, dugun: D.length, ucretli, birim, sabit, dTutar, tutar, odenen, kalan, vade, durum, model: m };
}

/** Salonun hesap dökümü: ilk aydan (başlangıç, ilk düğün, ilk ödeme ya da kayıt) bu aya, isteğe bağlı ileri aylar */
export function dokum(s, dugunler, { ileri = 0, bugun = C.trBugun() } = {}) {
  const buAy = bugun.slice(0, 7);
  const adaylar = [s.odeme?.baslangic, ...dugunler.filter((d) => d.salon === s.slug).map((d) => d.tarih), ...(s.odemeler || []).map((p) => (p.donem ? p.donem + '-01' : '')), s.olusturma ? new Date(s.olusturma).toISOString().slice(0, 10) : '']
    .filter(Boolean).map((t) => t.slice(0, 7)).filter((a) => /^\d{4}-\d{2}$/.test(a) && a <= buAy).sort();
  let ilk = adaylar[0] || buAy; if (ilk < ayEkle(buAy, -36)) ilk = ayEkle(buAy, -36);
  const L = []; for (let a = ilk; a <= ayEkle(buAy, ileri); a = ayEkle(a, 1)) L.push(donem(s, dugunler, a, bugun));
  return L;
}

/** Salonun para özeti: bu ay, toplam alacak (bu aya kadar), geciken, planlanan düğünlerden beklenen */
export function salonOzet(s, dugunler, bugun = C.trBugun()) {
  const buAy = bugun.slice(0, 7), L = dokum(s, dugunler, { ileri: 3, bugun }), G = L.filter((x) => x.ay <= buAy);
  return {
    buAy: L.find((x) => x.ay === buAy), dokum: L,
    alacak: G.reduce((n, x) => n + x.kalan, 0),
    geciken: L.filter((x) => x.durum === 'gecikti').reduce((n, x) => n + x.kalan, 0),
    gecikenAy: L.filter((x) => x.durum === 'gecikti'),
    tahakkuk: G.reduce((n, x) => n + x.tutar, 0),
    tahsil: (s.odemeler || []).reduce((n, p) => n + (+p.tutar || 0), 0),
    beklenen: L.filter((x) => x.ay > buAy).reduce((n, x) => n + x.tutar, 0),
  };
}

/** Tüm salonların bir ayı */
export function ayToplam(salonlar, dugunler, ay, bugun = C.trBugun()) {
  const R = salonlar.map((s) => ({ s, r: donem(s, dugunler, ay, bugun) }));
  return { R, dugun: R.reduce((n, x) => n + x.r.dugun, 0), tutar: R.reduce((n, x) => n + x.r.tutar, 0), odenen: R.reduce((n, x) => n + x.r.odenen, 0), kalan: R.reduce((n, x) => n + x.r.kalan, 0) };
}
