// Randevu Vaktim — istek işleyicisi. Aynı kod Netlify fonksiyonunda (Netlify Blobs "randevu" deposu) ve tarayıcı önizlemesinde çalışır.
// isle(I, O) → { durum, veri | ham, basliklar }
//   I: { yontem, yol, sorgu: URLSearchParams, baslik(k), govde, ip }
//   O: { depo(), kripto (WebCrypto), simdi(), adminDogrula?(token), gorselUrl(slug, ad, surum), demo? }
// Depo anahtarları:
//   isletme/<slug>                 işletme (tema, hizmetler, personel, kurallar, abonelik)
//   hesap/<kullanıcı>              personel girişi (PBKDF2 özeti + yönetici için şifreli kopya)
//   g/<slug>/<personel>/<tarih>    o günün randevuları { r: [...], k: [kapalı saatler] } — koşullu yazma ile çakışma önlenir
//   rid/<id>                       randevu → gün belgesi; bek/<slug>/<personel>/<id> ödeme onayı bekleyenler
//   gorsel/<slug>/<ad>             logo, kapak, personel fotoğrafı (data: URL)
import * as C from './cekirdek.js?v=2026-11-22-c';

const GUN = 864e5;
export class Hata extends Error { constructor(m, durum = 400, ek = null) { super(m); this.durum = durum; this.ek = ek; } }
const yanit = (veri, durum = 200, basliklar = {}) => ({ durum, veri, basliklar });
const hata = (m, durum = 400, ek = null) => yanit({ hata: m, ...(ek || {}) }, durum);
const CDN = (sn, swr) => ({ 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': `public, s-maxage=${sn}, stale-while-revalidate=${swr}` });
const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64Coz = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const t = atob(s), b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; };
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const hexCoz = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));
const esit = (a, b) => { a = String(a ?? ''); b = String(b ?? ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const J = { type: 'json' };

// ---------------------------------------------------------------- kripto
async function gizli(O) {
  if (O._g) return O._g;
  const st = O.depo(); let g = await st.get('gizli', J);
  if (!g?.k) { const yeni = { k: hex(O.kripto.getRandomValues(new Uint8Array(32))) }; const w = await st.setJSON('gizli', yeni, { onlyIfNew: true }); g = w && w.modified === false ? await st.get('gizli', J) : yeni; }
  return (O._g = g.k);
}
async function hmac(O, veri) { const key = await O.kripto.subtle.importKey('raw', hexCoz(await gizli(O)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64u(await O.kripto.subtle.sign('HMAC', key, enc.encode(veri))); }
async function pbkdf(O, s, tuz, it = 100000) { const key = await O.kripto.subtle.importKey('raw', enc.encode(String(s)), 'PBKDF2', false, ['deriveBits']); return hex(await O.kripto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(tuz), iterations: it, hash: 'SHA-256' }, key, 256)); }
const sha = async (O, s) => hex(await O.kripto.subtle.digest('SHA-256', enc.encode(String(s))));
async function aes(O) { return O.kripto.subtle.importKey('raw', await O.kripto.subtle.digest('SHA-256', enc.encode('rv-sifre:' + (await gizli(O)))), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function sifrele(O, m) { const iv = O.kripto.getRandomValues(new Uint8Array(12)); return b64u(iv) + '.' + b64u(await O.kripto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(O), enc.encode(m))); }
async function coz(O, s) { try { const [a, b] = String(s).split('.'); return dec.decode(await O.kripto.subtle.decrypt({ name: 'AES-GCM', iv: b64Coz(a) }, await aes(O), b64Coz(b))); } catch { return ''; } }
async function imzala(O, p) { const b = b64u(enc.encode(JSON.stringify(p))); return b + '.' + (await hmac(O, b)); }
async function tokenCoz(O, t) {
  const [b, s] = String(t || '').split('.'); if (!b || !s || b.length > 2000) return null;
  if (!esit(await hmac(O, b), s)) return null;
  try { const p = JSON.parse(dec.decode(b64Coz(b))); return p && p.exp > O.simdi() ? p : null; } catch { return null; }
}

// ---------------------------------------------------------------- depo yardımcıları
async function okuMeta(st, key) {
  if (st.getWithMetadata) { const g = await st.getWithMetadata(key, J); return g && g.data != null ? { veri: g.data, etag: g.etag || null } : null; }
  const v = await st.get(key, J); return v == null ? null : { veri: v, etag: null };
}
/** Koşullu güncelleme: f(eski | null) → { veri?, cikti }. Araya başka bir yazma girerse baştan dener (iki müşteri aynı saati alamaz). */
async function guncelle(st, key, f, kez = 7) {
  for (let i = 0; i < kez; i++) {
    const g = await okuMeta(st, key);
    const r = await f(g ? JSON.parse(JSON.stringify(g.veri)) : null);
    if (!r || r.veri === undefined) return r?.cikti;
    const w = await st.setJSON(key, r.veri, g ? (g.etag ? { onlyIfMatch: g.etag } : {}) : { onlyIfNew: true });
    if (!w || w.modified !== false) return r.cikti;
  }
  throw new Hata('Şu an çok yoğun, lütfen birkaç saniye sonra tekrar deneyin.', 409);
}
const K = {
  is: (s) => 'isletme/' + s, gun: (s, p, t) => `g/${s}/${p}/${t}`, rid: (id) => 'rid/' + id, bek: (s, p, id) => `bek/${s}/${p}/${id}`,
  hes: (k) => 'hesap/' + k, gor: (s, a) => `gorsel/${s}/${a}`,
};
const isletmeAl = async (O, slug) => (C.SLUG_RE.test(slug || '') ? O.depo().get(K.is(slug), J) : null);
async function hepsiAl(O, onek) {
  const st = O.depo(), { blobs } = await st.list({ prefix: onek });
  return (await Promise.all(blobs.map((b) => st.get(b.key, J).then((v) => (v ? { key: b.key, v } : null))))).filter(Boolean);
}
async function gunlerAl(O, slug, pid, bas, n) {
  const st = O.depo(), T = Array.from({ length: n }, (_, i) => C.gunEkle(bas, i));
  const D = await Promise.all(T.map((t) => st.get(K.gun(slug, pid, t), J)));
  return T.map((t, i) => ({ t, g: D[i] || { r: [], k: [] } }));
}
/** Süresi dolan ödeme beklemeleri iptal sayılır (saat boşalır) */
function gunTemizle(g, simdi) {
  let d = false;
  for (const r of g.r || []) if (r.durum === 'odeme' && (r.son || 0) <= simdi) { r.durum = 'iptal'; r.iptal = { t: simdi, kim: 'sistem', neden: 'Ödeme süresi doldu' }; d = true; }
  return d;
}

// ---------------------------------------------------------------- hız sınırı ve hatalı giriş
const HIZ = new Map();
function hizSinir(anahtar, adet, sure, simdi) {
  const h = HIZ.get(anahtar); if (!h || simdi - h.t > sure) { HIZ.set(anahtar, { t: simdi, n: 1 }); if (HIZ.size > 5000) HIZ.clear(); return true; }
  return ++h.n <= adet;
}
async function sayacOku(O, k, pencere) { const d = await O.depo().get('sinir/' + k, J); return d && O.simdi() - d.t < pencere ? d.n : 0; }
async function sayacArtir(O, k, pencere) { const st = O.depo(), simdi = O.simdi(); let d = await st.get('sinir/' + k, J); if (!d || simdi - d.t > pencere) d = { t: simdi, n: 0 }; d.n++; await st.setJSON('sinir/' + k, d); return d.n; }
const ipAnahtar = async (O, ip) => 'ip/' + (await sha(O, 'ip:' + (ip || '?'))).slice(0, 16);

// ---------------------------------------------------------------- görseller
const GORSEL_RE = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/;
/** Değer: data: URL (yeni) → saklanır, özet döner; '' → silinir; başka bir şey (mevcut adres) → eski özet kalır */
async function gorselIsle(O, slug, ad, deger, eski) {
  const st = O.depo();
  if (typeof deger === 'string' && deger.startsWith('data:')) {
    if (!GORSEL_RE.test(deger) || /^data:image\/svg/.test(deger) || deger.length > 1.4e6) throw new Hata('Görsel PNG, JPEG ya da WEBP olmalı ve 1 MB\'ı geçmemeli.');
    await st.set(K.gor(slug, ad), deger); return (await sha(O, deger)).slice(0, 10);
  }
  if (deger === '' || deger === null) { if (eski) await st.delete(K.gor(slug, ad)); return ''; }
  return eski || '';
}
const gUrl = (O, slug, ad, h) => (h ? O.gorselUrl(slug, ad, h) : '');

// ---------------------------------------------------------------- temizleme
function hizmetTemiz(L, eski = []) {
  const ids = new Set();
  return (Array.isArray(L) ? L : []).slice(0, 60).map((h) => {
    let id = C.idMi(h?.id); while (!id || ids.has(id)) id = 'h' + C.rastgele(6); ids.add(id);
    return { id, ad: C.str(h?.ad, 60) || 'Hizmet', sure: C.tamSayi(h?.sure, 5, 600, 30), fiyat: C.sayi(h?.fiyat, 0, 1e6, 0), aciklama: C.str(h?.aciklama, 160), kategori: C.str(h?.kategori, 30), aktif: h?.aktif !== false };
  });
}
/** Ürünler (işletmenin sattığı ürünler, vitrinde fiyatıyla görünür). Fotoğraf özeti eski kayıttan korunur; yenisi ayrıca işlenir. */
function urunTemiz(L, eski = []) {
  const ids = new Set();
  return (Array.isArray(L) ? L : []).slice(0, 120).map((u) => {
    let id = C.idMi(u?.id); while (!id || ids.has(id)) id = 'u' + C.rastgele(6); ids.add(id);
    const e = (eski || []).find((z) => z.id === id);
    return { id, ad: C.str(u?.ad, 60) || 'Ürün', fiyat: C.sayi(u?.fiyat, 0, 1e6, 0), aciklama: C.str(u?.aciklama, 160), kategori: C.str(u?.kategori, 30), tukendi: !!u?.tukendi, aktif: u?.aktif !== false, foto: e?.foto || '' };
  });
}
/** Ustanın müşteriye görünen profili: hakkında, deneyim (yıl), uzmanlıklar */
const uzmanlikTemiz = (L) => [...new Set((Array.isArray(L) ? L : []).map((x) => C.str(x, 30)).filter(Boolean))].slice(0, 12);
const profilTemiz = (p, e = {}) => ({ hakkinda: C.metin(p?.hakkinda ?? e.hakkinda, 500), deneyim: C.tamSayi(p?.deneyim ?? e.deneyim, 0, 60, 0), uzmanlik: uzmanlikTemiz(p?.uzmanlik ?? e.uzmanlik) });
/** Çalışma fotoğrafları (en çok 30): {id, foto, not, hizmet, t}; fotoğraf eski kayıttan gelir, yenisi isGorselleri ile yazılır */
function isTemiz(L, eski = [], hizmetIds = null) {
  const ids = new Set();
  return (Array.isArray(L) ? L : []).slice(0, 30).map((x) => {
    let id = C.idMi(x?.id); while (!id || ids.has(id)) id = 'i' + C.rastgele(6); ids.add(id);
    const e = (eski || []).find((z) => z.id === id);
    const hizmet = C.str(x?.hizmet, 20);
    return { id, foto: e?.foto || '', not: C.str(x?.not, 120), hizmet: hizmet && (!hizmetIds || hizmetIds.has(hizmet)) ? hizmet : '', t: e?.t || C.sayi(x?.t, 0, 9e15, 0) };
  });
}
async function isGorselleri(O, slug, pid, isler, gelen = [], eski = []) {
  const st = O.depo(), simdi = O.simdi();
  for (let i = 0; i < isler.length; i++) { isler[i].foto = await gorselIsle(O, slug, `i-${pid}-${isler[i].id}`, gelen[i] ? gelen[i].foto : undefined, isler[i].foto); if (!isler[i].t) isler[i].t = simdi; }
  for (const e of eski || []) if (e.foto && !isler.some((x) => x.id === e.id)) await st.delete(K.gor(slug, `i-${pid}-${e.id}`));
  return isler.filter((x) => x.foto);
}
const islerUrl = (O, s, p) => Promise.all((p.isler || []).map(async (x) => ({ ...x, foto: await gUrl(O, s.slug, `i-${p.id}-${x.id}`, x.foto) })));
/** Ürün fotoğrafları: gelen[i].foto data: URL ise kaydedilir, '' ise silinir; kaldırılan ürünlerin fotoğrafları da silinir */
async function urunGorselleri(O, slug, urunler, gelen = [], eski = []) {
  for (let i = 0; i < urunler.length; i++) urunler[i].foto = await gorselIsle(O, slug, 'u-' + urunler[i].id, gelen[i] ? gelen[i].foto : undefined, urunler[i].foto);
  for (const e of eski || []) if (e.foto && !urunler.some((u) => u.id === e.id)) await O.depo().delete(K.gor(slug, 'u-' + e.id));
}
function personelTemiz(p, eski, hizmetIds, n) {
  const ibanNo = C.ibanNorm(p?.iban?.no);
  let iban;
  if (!ibanNo) iban = { ad: C.str(p?.iban?.ad, 60), no: '', banka: '' };
  else if (eski?.iban?.ornek && ibanNo === eski.iban.no) iban = { ...eski.iban, ad: C.str(p?.iban?.ad, 60) || eski.iban.ad };
  else if (!C.ibanGecerli(ibanNo)) throw new Hata(`${C.str(p?.ad, 40) || 'Personel'}: IBAN geçersiz görünüyor. TR ile başlayan 26 karakteri kontrol edin.`);
  else iban = { ad: C.str(p?.iban?.ad, 60), no: ibanNo, banka: C.str(p?.iban?.banka, 40) || C.bankaAdi(ibanNo) };
  return {
    id: eski?.id || C.idMi(p?.id) || 'p' + C.rastgele(6), ad: C.str(p?.ad, 40) || `Personel ${n + 1}`, unvan: C.str(p?.unvan, 40), tel: C.telNorm(p?.tel), foto: eski?.foto || '',
    hizmetler: (Array.isArray(p?.hizmetler) ? p.hizmetler : []).map(String).filter((id) => hizmetIds.has(id)),
    calisma: p?.calisma && typeof p.calisma === 'object' ? C.calismaTemiz(p.calisma) : null, izinler: C.aralikTemiz(p?.izinler),
    iban, yonetici: !!p?.yonetici, aktif: p?.aktif !== false, kullanici: eski?.kullanici || '',
    ...profilTemiz(p, eski || {}), isler: isTemiz(p?.isler ?? eski?.isler, eski?.isler, hizmetIds),
  };
}
const iletisimTemiz = (i = {}) => {
  const url = (v) => { const s = C.str(v, 500); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''; };
  return { telefon: C.telNorm(i.telefon), whatsapp: i.whatsapp !== false, adres: C.str(i.adres, 200), ilce: C.str(i.ilce, 40), sehir: C.sehirBul(i.sehir), harita: url(i.harita), instagram: C.str(i.instagram, 60).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30) };
};
function aboneTemiz(o = {}) {
  o = o && typeof o === 'object' ? o : {};
  return { tutar: C.sayi(o.tutar, 0, 1e7, 0), personelBasi: C.sayi(o.personelBasi, 0, 1e7, 0), gun: C.tamSayi(o.gun, 1, 28, 1), baslangic: C.tarihMi(o.baslangic), periyot: o.periyot === 'yok' ? 'yok' : 'aylik' };
}
const odemelerTemiz = (L) => (Array.isArray(L) ? L : []).slice(-600).map((p) => ({ id: C.idMi(p?.id) || C.rastgele(8), tarih: C.tarihMi(p?.tarih), donem: /^\d{4}-\d{2}$/.test(p?.donem || '') ? p.donem : '', tutar: C.sayi(p?.tutar, 0, 1e7, 0), not: C.str(p?.not, 200) }));
/** Yönetici kaydı: işletmenin tamamı (görseller ayrıca işlenir) */
function isletmeTemiz(slug, x, eski) {
  const tur = C.TURLER.some((t) => t[0] === x.tur) ? x.tur : eski?.tur || 'diger';
  const hizmetler = hizmetTemiz(x.hizmetler), hIds = new Set(hizmetler.map((h) => h.id));
  const pids = new Set();
  const personel = (Array.isArray(x.personel) ? x.personel : []).slice(0, 40).map((p, n) => {
    const e = (eski?.personel || []).find((z) => z.id === p?.id);
    const y = personelTemiz(p, e, hIds, n); while (pids.has(y.id)) y.id = 'p' + C.rastgele(6); pids.add(y.id); return y;
  });
  return {
    slug, ad: C.str(x.ad, 80) || slug, tur, aciklama: C.metin(x.aciklama, 400), aktif: x.aktif !== false, liste: x.liste !== false, one: !!x.one,
    tema: { ...C.temaTemiz(x.tema, tur), logo: eski?.tema?.logo || '', kapak: eski?.tema?.kapak || '' },
    iletisim: iletisimTemiz(x.iletisim), calisma: C.calismaTemiz(x.calisma || C.VARS_CALISMA), kapali: C.aralikTemiz(x.kapali),
    hizmetler, urunler: urunTemiz(x.urunler, eski?.urunler), personel, ayar: C.ayarTemiz(x.ayar), odeme: aboneTemiz(x.odeme), odemeler: odemelerTemiz(x.odemeler), notlar: C.metin(x.notlar, 4000),
    ornek: !!eski?.ornek, rev: (eski?.rev || 0) + 1, olusturma: eski?.olusturma || Date.now(), guncelleme: Date.now(),
  };
}

// ---------------------------------------------------------------- görünümler
const urunlerUrl = (O, s, acik = false) => Promise.all((s.urunler || []).filter((u) => !acik || u.aktif !== false).map(async (u) => ({ ...u, foto: await gUrl(O, s.slug, 'u-' + u.id, u.foto) })));
async function genel(O, s, bugun) {
  const P = s.personel.filter((p) => p.aktif !== false);
  return {
    slug: s.slug, ad: s.ad, tur: s.tur, aciklama: s.aciklama,
    tema: { ...C.temaTemiz(s.tema, s.tur), logo: await gUrl(O, s.slug, 'logo', s.tema?.logo), kapak: await gUrl(O, s.slug, 'kapak', s.tema?.kapak) },
    iletisim: s.iletisim, calisma: s.calisma, kapali: (s.kapali || []).filter((k) => k.bit >= bugun),
    hizmetler: s.hizmetler.filter((h) => h.aktif !== false).map(({ id, ad, sure, fiyat, aciklama, kategori }) => ({ id, ad, sure, fiyat, aciklama, kategori: kategori || '' })),
    urunler: await urunlerUrl(O, s, true),
    personel: await Promise.all(P.map(async (p) => ({ id: p.id, ad: p.ad, unvan: p.unvan, foto: await gUrl(O, s.slug, 'p-' + p.id, p.foto), hizmetler: p.hizmetler, calisma: p.calisma || s.calisma, izinler: (p.izinler || []).filter((k) => k.bit >= bugun),
      hakkinda: p.hakkinda || '', deneyim: p.deneyim || 0, uzmanlik: p.uzmanlik || [], isler: (await islerUrl(O, s, p)).map(({ id, foto, not, hizmet, t }) => ({ id, foto, not, hizmet, t })) }))),
    ayar: s.ayar, ornek: !!s.ornek,
  };
}
const randevuOzet = (r) => ({ id: r.id, durum: r.durum, tarih: r.tarih, bas: r.bas, bit: r.bit, hizmetler: r.h, fiyat: r.fiyat, kapora: r.kapora, ad: r.ad, tel: r.tel, not: r.not, kaynak: r.kaynak, olusturma: r.olusturma, son: r.son || 0, bildirim: r.bildirim || 0, onay: r.onay || 0, iptal: r.iptal || null, p: r.p });
async function durumGorunum(O, s, p, r) {
  const simdi = O.simdi(), basMs = C.trMs(r.tarih, r.bas);
  const iptalEdilebilir = basMs > simdi && (r.durum === 'odeme' || r.durum === 'kontrol' || (r.durum === 'onay' && basMs - simdi >= s.ayar.iptalSaat * 3600e3));
  const odemeGoster = r.kapora > 0 && (r.durum === 'odeme' || r.durum === 'kontrol' || (r.durum === 'iptal' && r.iptal?.kim === 'sistem'));
  return {
    isletme: { slug: s.slug, ad: s.ad, tur: s.tur, tema: { ...C.temaTemiz(s.tema, s.tur), logo: await gUrl(O, s.slug, 'logo', s.tema?.logo) }, iletisim: s.iletisim, ayar: { iptalSaat: s.ayar.iptalSaat, odemeSure: s.ayar.odemeSure, onOdeme: s.ayar.onOdeme } },
    personel: { id: p.id, ad: p.ad, unvan: p.unvan, foto: await gUrl(O, s.slug, 'p-' + p.id, p.foto), tel: p.tel },
    randevu: randevuOzet(r),
    odeme: odemeGoster ? { tutar: r.kapora, alici: p.iban?.ad || p.ad, iban: C.ibanYaz(p.iban?.no), banka: p.iban?.banka || C.bankaAdi(p.iban?.no), aciklama: r.ad, ornek: !!p.iban?.ornek, yok: !p.iban?.no } : null,
    iptalEdilebilir, simdi,
  };
}
/** Personel paneli: işletmenin tamamı, ama başka personelin IBAN'ı ve abonelik bilgisi yok */
async function panelGorunum(O, s, k) {
  const bugun = C.trBugun(O.simdi());
  return {
    slug: s.slug, ad: s.ad, tur: s.tur, aciklama: s.aciklama, aktif: s.aktif !== false, rev: s.rev,
    tema: { ...C.temaTemiz(s.tema, s.tur), logo: await gUrl(O, s.slug, 'logo', s.tema?.logo), kapak: await gUrl(O, s.slug, 'kapak', s.tema?.kapak) },
    iletisim: s.iletisim, calisma: s.calisma, kapali: s.kapali || [], hizmetler: s.hizmetler, urunler: await urunlerUrl(O, s), ayar: s.ayar,
    personel: await Promise.all(s.personel.map(async (p) => ({ ...p, foto: await gUrl(O, s.slug, 'p-' + p.id, p.foto), isler: await islerUrl(O, s, p), iban: p.id === k.p ? p.iban : { ad: '', no: p.iban?.no ? '•' : '', banka: '' }, kullanici: p.id === k.p ? p.kullanici : '', izinler: (p.izinler || []).filter((x) => x.bit >= C.gunEkle(bugun, -60)) }))),
  };
}
async function yoneticiGorunum(O, s) {
  const hesaplar = {};
  for (const p of s.personel) if (p.kullanici) { const h = await O.depo().get(K.hes(p.kullanici), J); if (h) hesaplar[p.id] = { kullanici: p.kullanici, sifre: h.sifreli ? await coz(O, h.sifreli) : '', son: h.son || 0 }; }
  return {
    ...s, hesaplar, urunler: await urunlerUrl(O, s),
    tema: { ...s.tema, logo: await gUrl(O, s.slug, 'logo', s.tema?.logo), kapak: await gUrl(O, s.slug, 'kapak', s.tema?.kapak) },
    personel: await Promise.all(s.personel.map(async (p) => ({ ...p, foto: await gUrl(O, s.slug, 'p-' + p.id, p.foto), isler: await islerUrl(O, s, p) }))),
  };
}

// ---------------------------------------------------------------- vitrin dizini (Randevu Vaktim ana sayfası: arama ve kategoriler)
// Tek "dizin" kaydı: listede görünen işletmelerin özeti. İşletme her kaydedildiğinde güncellenir; yoksa ya da bozulursa yeniden kurulur.
const dizinde = (s) => !!s && s.aktif !== false && s.liste !== false && s.personel.some((p) => p.aktif !== false);
async function dizinOzet(O, s) {
  const bugun = C.trBugun(O.simdi()), H = s.hizmetler.filter((h) => h.aktif !== false), F = H.map((h) => h.fiyat).filter((f) => f > 0);
  return {
    slug: s.slug, ad: s.ad, tur: s.tur, sehir: s.iletisim?.sehir || '', ilce: s.iletisim?.ilce || '',
    tema: { ...C.temaTemiz(s.tema, s.tur), logo: await gUrl(O, s.slug, 'logo', s.tema?.logo), kapak: await gUrl(O, s.slug, 'kapak', s.tema?.kapak) },
    calisma: s.calisma, kapali: (s.kapali || []).filter((k) => k.bit >= bugun),
    hizmet: H.slice(0, 40).map((h) => h.ad), urun: (s.urunler || []).filter((u) => u.aktif !== false).slice(0, 40).map((u) => u.ad),
    min: F.length ? Math.min(...F) : 0, max: F.length ? Math.max(...F) : 0, personel: s.personel.filter((p) => p.aktif !== false).length,
    one: !!s.one, ornek: !!s.ornek, olusturma: s.olusturma || 0,
  };
}
async function dizinYaz(O, s, slug = s?.slug) {
  const oz = dizinde(s) ? await dizinOzet(O, s) : null;
  if (!(await O.depo().get('dizin', J))) { await dizinKur(O); return; }
  await guncelle(O.depo(), 'dizin', (d) => {
    const L = (Array.isArray(d?.L) ? d.L : []).filter((x) => x.slug !== slug); if (oz) L.push(oz);
    return { veri: { L, t: O.simdi() }, cikti: true };
  });
}
async function dizinKur(O, hepsi = null) {
  const L = (hepsi || (await hepsiAl(O, 'isletme/')).map((x) => x.v)).filter(dizinde);
  const veri = { L: await Promise.all(L.map((s) => dizinOzet(O, s))), t: O.simdi() };
  await O.depo().setJSON('dizin', veri);
  return veri;
}

// ---------------------------------------------------------------- kimlik
async function kimlik(I, O) {
  const t = (I.baslik('authorization') || '').replace(/^Bearer\s+/i, '').trim(); if (!t) return null;
  const p = await tokenCoz(O, t);
  if (p?.r === 'p' && C.KULLANICI_RE.test(p.k || '')) {
    const h = await O.depo().get(K.hes(p.k), J); if (!h || (h.pv || 0) !== p.pv) return null;
    const s = await isletmeAl(O, h.s), per = s?.personel.find((x) => x.id === h.p);
    if (!s || !per || per.aktif === false) return null;
    if (s.aktif === false) return { rol: 'kapali' };
    return { rol: 'personel', s, p: per.id, yonetici: !!per.yonetici, kullanici: p.k };
  }
  if (p?.r === 'pa') { const s = await isletmeAl(O, p.s); return s && s.personel.some((x) => x.id === p.p) ? { rol: 'personel', s, p: p.p, yonetici: true, admin: true } : null; }
  if (!p && O.adminDogrula && (await O.adminDogrula(t))) return { rol: 'yonetici' };
  return null;
}
const OTURUM = 'Oturumun süresi doldu, lütfen yeniden giriş yapın.';
async function hesapKur(O, slug, pid, kullanici, sifre) {
  const tuz = C.rastgele(16);
  const eski = await O.depo().get(K.hes(kullanici), J);
  const h = { k: kullanici, s: slug, p: pid, tuz, hash: await pbkdf(O, sifre, tuz), sifreli: await sifrele(O, sifre), pv: (eski?.pv || 0) + 1, olusturma: eski?.olusturma || O.simdi(), son: eski?.son || 0 };
  await O.depo().setJSON(K.hes(kullanici), h);
  return h;
}

// ---------------------------------------------------------------- örnek işletme (ilk istekte bir kez kurulur)
export const ORNEK_SLUG = 'huseyin-ozdemir-barbers-club';
const ORNEK_ACIKLAMA = ['Yıkama ve şekillendirme dahil.', 'Sıcak havlu ve ustura ile.', 'Saç kesimi ve sakal tıraşı birlikte.', '12 yaş altı çocuklar için.', 'Temizleme, peeling ve maske.', ''];
/** Yalnız önizlemede: vitrin boş görünmesin diye farklı türlerde birkaç örnek işletme (girişleri yok, IBAN'ları örnek) */
const DEMO_ISLETMELER = [
  ['lale-kuafor', 'Lale Kuaför', 'kuafor', 'İstanbul', 'Kadıköy', { stil: 'acik', vurgu: '#9f1239' }, [['Lale Hanım', 'Kurucu · saç tasarımcısı'], ['Ece Hanım', 'Kolorist']], 'Kesim, fön, boya ve gelin saçı.'],
  ['mira-nail-studio', 'Mira Nail Studio', 'tirnak', 'İstanbul', 'Beşiktaş', { stil: 'acik', vurgu: '#e11d48' }, [['Mira Hanım', 'Tırnak sanatçısı']], 'Manikür, pedikür, kalıcı oje ve protez tırnak.'],
  ['derin-spa', 'Derin Spa', 'spa', 'İzmir', 'Karşıyaka', { stil: 'krem', vurgu: '#0f766e' }, [['Aylin Hanım', 'Masaj terapisti'], ['Can Bey', 'Masaj terapisti']], 'Masaj ve bakım; çift masajı için iki terapist.'],
  ['cizgi-dovme', 'Çizgi Dövme Stüdyosu', 'dovme', 'Ankara', 'Çankaya', { stil: 'koyu', vurgu: '#f4f4f5' }, [['Bora Bey', 'Dövme sanatçısı']], 'Minimal ve ince çizgi dövme. Ön görüşme ücretsiz.'],
  ['kenan-erkek-kuaforu', 'Kenan Erkek Kuaförü', 'berber', 'Ankara', 'Keçiören', { stil: 'acik', vurgu: '#1e3a8a' }, [['Kenan Bey', 'Usta berber'], ['Okan Bey', 'Berber']], 'Saç, sakal ve damat tıraşı.'],
  ['isilti-guzellik', 'Işıltı Güzellik Merkezi', 'guzellik', 'İzmir', 'Bornova', { stil: 'acik', vurgu: '#be185d' }, [['Selin Hanım', 'Cilt bakım uzmanı'], ['Damla Hanım', 'Kaş ve kirpik uzmanı']], 'Cilt bakımı, kaş, kirpik ve ağda.'],
];
async function demoIsletmeler(O) {
  const simdi = O.simdi();
  for (const [slug, ad, tur, sehir, ilce, tema, P, aciklama] of DEMO_ISLETMELER) {
    const s = {
      slug, ad, tur, aciklama, aktif: true, liste: true, one: slug === 'lale-kuafor', tema: { ...tema, yazi: 'modern', logo: '', kapak: '' },
      iletisim: { telefon: '', whatsapp: true, adres: '', ilce, sehir, harita: '', instagram: '' },
      calisma: tur === 'dovme' ? { 0: [], 1: [], 2: [[660, 1200]], 3: [[660, 1200]], 4: [[660, 1200]], 5: [[660, 1200]], 6: [[660, 1200]] } : C.VARS_CALISMA, kapali: [],
      hizmetler: (C.HIZMET_SABLON[tur] || C.HIZMET_SABLON.diger).slice(0, 7).map(([had, sure, fiyat, kategori], i) => ({ id: 'h' + i, ad: had, sure, fiyat, kategori, aciklama: '', aktif: true })), urunler: [],
      personel: P.map(([pad, unvan], i) => ({ id: 'p' + i, ad: pad, unvan, tel: '', foto: '', hizmetler: [], calisma: null, izinler: [], iban: { ad: pad, no: 'TR000000000000000000000000', banka: '', ornek: true }, yonetici: i === 0, aktif: true, kullanici: '',
        hakkinda: i ? '' : `${aciklama} Randevulu çalışıyoruz; gelmeden önce aklınızdaki modeli fotoğrafla gösterebilirsiniz.`, deneyim: [12, 6, 9, 4][i % 4], uzmanlik: (C.UZMANLIK_ONER[tur] || []).slice(i * 2, i * 2 + 3), isler: [] })),
      ayar: C.ayarTemiz({}), odeme: aboneTemiz({ periyot: 'yok' }), odemeler: [], notlar: 'Önizleme için örnek işletme.', ornek: true, rev: 1, olusturma: simdi - (DEMO_ISLETMELER.findIndex((x) => x[0] === slug) + 1) * 864e5, guncelleme: simdi,
    };
    await O.depo().setJSON(K.is(slug), s);
  }
}
async function ornekKur(O) {
  const st = O.depo(), simdi = O.simdi(), bugun = C.trBugun(simdi);
  const ogle = { 0: [], 1: [[540, 780], [840, 1260]], 2: [[540, 780], [840, 1260]], 3: [[540, 780], [840, 1260]], 4: [[540, 780], [840, 1260]], 5: [[540, 780], [840, 1260]], 6: [[540, 780], [840, 1260]] };
  const salisiz = { 0: [[600, 1080]], 1: [[600, 1260]], 2: [], 3: [[600, 1260]], 4: [[600, 1260]], 5: [[600, 1260]], 6: [[600, 1260]] };
  const H = C.HIZMET_SABLON.berber, hid = ['hsac', 'hsakal', 'hsacsakal', 'hcocuk', 'hcilt', 'hyikama'];
  const iban = (ad) => ({ ad, no: 'TR000000000000000000000000', banka: '', ornek: true });
  const s = {
    slug: ORNEK_SLUG, ad: 'Hüseyin Özdemir Barbers Club', tur: 'berber', aciklama: 'Erkek kuaförü. Saç kesimi, sakal tıraşı ve cilt bakımı.', aktif: true, liste: true, one: true,
    tema: { stil: 'acik', vurgu: '#18181b', yazi: 'modern', logo: '', kapak: '' },
    iletisim: { telefon: '', whatsapp: true, adres: '', ilce: '', sehir: '', harita: '', instagram: '' },
    calisma: { 0: [[600, 1080]], 1: [[540, 1260]], 2: [[540, 1260]], 3: [[540, 1260]], 4: [[540, 1260]], 5: [[540, 1260]], 6: [[540, 1260]] }, kapali: [],
    hizmetler: H.slice(0, 6).map(([ad, sure, fiyat, kategori], i) => ({ id: hid[i], ad, sure, fiyat, kategori, aciklama: ORNEK_ACIKLAMA[i], aktif: true })),
    urunler: [['uwax', 'Mat şekillendirici wax', 250, '100 ml'], ['uyag', 'Sakal yağı', 220, '30 ml'], ['usampuan', 'Günlük şampuan', 180, '400 ml'], ['ulosyon', 'Tıraş sonrası losyon', 200, '100 ml']]
      .map(([id, ad, fiyat, aciklama]) => ({ id, ad, fiyat, aciklama, kategori: '', tukendi: false, aktif: true, foto: '' })),
    personel: [
      { id: 'phuseyin', ad: 'Hüseyin Bey', unvan: 'Kurucu · usta berber', tel: '', foto: '', hizmetler: [], calisma: null, izinler: [], iban: iban('Hüseyin Bey'), yonetici: true, aktif: true, kullanici: 'huseyin' },
      { id: 'pharun', ad: 'Harun Bey', unvan: 'Usta berber', tel: '', foto: '', hizmetler: [], calisma: ogle, izinler: [], iban: iban('Harun Bey'), yonetici: false, aktif: true, kullanici: 'harun' },
      { id: 'pelyesa', ad: 'Elyesa Bey', unvan: 'Usta berber', tel: '', foto: '', hizmetler: [], calisma: salisiz, izinler: [], iban: iban('Elyesa Bey'), yonetici: false, aktif: true, kullanici: 'elyesa' },
      { id: 'pemre', ad: 'Emre Bey', unvan: 'Berber', tel: '', foto: '', hizmetler: ['hsac', 'hsakal', 'hsacsakal', 'hcocuk', 'hyikama'], calisma: null, izinler: [], iban: iban('Emre Bey'), yonetici: false, aktif: true, kullanici: 'emre' },
    ],
    ayar: C.ayarTemiz({}), odeme: aboneTemiz({}), odemeler: [], notlar: 'Deneme işletmesi: fiyatlar, saatler ve IBAN\'lar örnektir.', ornek: true, rev: 1, olusturma: simdi, guncelleme: simdi,
  };
  await st.setJSON(K.is(s.slug), s);
  const sifreler = {};
  for (const p of s.personel) { const sf = O.demo ? p.kullanici + '123' : C.sifreUret(); sifreler[p.kullanici] = sf; await hesapKur(O, s.slug, p.id, p.kullanici, sf); }
  // birkaç örnek randevu: takvim ve "dolu" saatler boş görünmesin; biri ödeme onayı bekliyor
  const AD = ['Mert Kaya', 'Can Demir', 'Burak Şahin', 'Yusuf Aydın', 'Ali Çelik', 'Emir Yıldız', 'Kerem Arslan', 'Oğuz Koç', 'Serkan Öztürk', 'Tolga Aksoy', 'Murat Polat', 'Kaan Erdem', 'Arda Kılıç', 'Deniz Acar'];
  const L = [['pharun', 0, '10:00', 'hsac'], ['pharun', 0, '11:00', 'hsacsakal'], ['pharun', 1, '10:30', 'hsac'], ['pharun', 1, '14:00', 'hsacsakal'], ['pharun', 1, '18:00', 'hsac'],
    ['pelyesa', 0, '12:00', 'hsac'], ['pelyesa', 0, '17:00', 'hcilt'], ['pelyesa', 1, '11:30', 'hsacsakal'], ['pelyesa', 1, '15:00', 'hsac'],
    ['phuseyin', 0, '13:00', 'hsacsakal'], ['phuseyin', 0, '16:00', 'hsac'], ['phuseyin', 1, '11:00', 'hsac'], ['phuseyin', 1, '16:00', 'hsakal'],
    ['pemre', 0, '14:30', 'hcocuk'], ['pemre', 1, '12:30', 'hsac'], ['pemre', 1, '19:00', 'hsakal']];
  const gunler = {};
  let n = 0;
  const ekle = (pid, gun, saat, hId, durum) => {
    const p = s.personel.find((x) => x.id === pid), h = s.hizmetler.find((x) => x.id === hId), t = C.gunEkle(bugun, gun), bas = C.dkCoz(saat);
    if (!C.gunCalisma(s, p, t).some(([a, b]) => bas >= a && bas + h.sure <= b)) return false;
    const key = K.gun(s.slug, pid, t), g = (gunler[key] ||= { r: [], k: [] });
    if (C.cakisir(C.doluAraliklar(g, simdi), bas, h.sure)) return false;
    const id = 'r' + C.rastgele(9);
    g.r.push({ id, durum, p: pid, tarih: t, bas, bit: bas + h.sure, h: [{ id: h.id, ad: h.ad, sure: h.sure, fiyat: h.fiyat }], fiyat: h.fiyat, kapora: h.fiyat, ad: AD[n++ % AD.length], tel: '+90500000' + String(1000 + n).slice(-4), not: '', kaynak: 'ornek', ah: '', olusturma: simdi - 864e5, son: 0, bildirim: durum === 'kontrol' ? simdi - 4 * 60e3 : simdi - 864e5, onay: durum === 'onay' ? simdi - 80e6 : 0 });
    return { key, id, pid, t };
  };
  for (const [pid, gun, saat, hId] of L) ekle(pid, gun, saat, hId, 'onay');
  const bek = ekle('pharun', 0, '16:30', 'hsakal', 'kontrol') || ekle('pharun', 1, '16:30', 'hsakal', 'kontrol') || ekle('phuseyin', 0, '18:30', 'hsakal', 'kontrol');
  for (const [key, g] of Object.entries(gunler)) {
    await st.setJSON(key, g);
    for (const r of g.r) await st.setJSON(K.rid(r.id), { s: s.slug, p: r.p, t: r.tarih });
  }
  if (bek) await st.setJSON(K.bek(s.slug, bek.pid, bek.id), { t: bek.t, o: simdi });
  return sifreler;
}
async function tohumla(O) {
  if (O._tohum) return;
  const st = O.depo();
  if (await st.get('ayar/tohum', J)) { O._tohum = true; return; }
  const w = await st.setJSON('ayar/tohum', { t: O.simdi() }, { onlyIfNew: true });
  if (!(w && w.modified === false) && !(await st.get(K.is(ORNEK_SLUG), J))) {
    await ornekKur(O);
    if (O.demo) await demoIsletmeler(O);
    await dizinKur(O);
  }
  O._tohum = true;
}

// ---------------------------------------------------------------- randevu işlemleri
async function randevuBul(O, id) {
  if (!/^r[a-z0-9]{9}$/.test(id || '')) return null;
  const st = O.depo(), x = await st.get(K.rid(id), J); if (!x) return null;
  const s = await isletmeAl(O, x.s); if (!s) return null;
  const p = s.personel.find((z) => z.id === x.p); if (!p) return null;
  const g = await st.get(K.gun(x.s, x.p, x.t), J), r = g?.r?.find((z) => z.id === id);
  return r ? { s, p, r, key: K.gun(x.s, x.p, x.t) } : null;
}
/** Gün belgesindeki randevuyu değiştirir: f(r, g) → true (yaz) | false (yazma). Hata fırlatabilir. */
async function randevuDegistir(O, key, id, f) {
  const simdi = O.simdi();
  return guncelle(O.depo(), key, (g) => {
    if (!g) throw new Hata('Randevu bulunamadı.', 404);
    const r = g.r.find((z) => z.id === id); if (!r) throw new Hata('Randevu bulunamadı.', 404);
    const temiz = gunTemizle(g, simdi);
    const yaz = f(r, g);
    return yaz || temiz ? { veri: g, cikti: r } : { cikti: r };
  });
}
async function bekleyenYaz(O, s, r, var_) {
  const st = O.depo(), k = K.bek(s, r.p, r.id);
  if (var_) await st.setJSON(k, { t: r.tarih, o: O.simdi() }); else await st.delete(k);
}
function hizmetlerSec(s, p, ids) {
  const L = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 8);
  const H = L.map((id) => s.hizmetler.find((h) => h.id === id && h.aktif !== false)).filter(Boolean);
  if (!H.length || H.length !== L.length) throw new Hata('En az bir hizmet seçin.');
  if (p.hizmetler?.length && H.some((h) => !p.hizmetler.includes(h.id))) throw new Hata(`${p.ad} seçtiğiniz hizmetlerden birini vermiyor.`);
  return H;
}
/** Yeni randevu ekler (müşteri ya da personel). Saat doluysa 409. */
async function randevuEkle(O, s, p, kayit, { zorla = false } = {}) {
  const simdi = O.simdi(), ara = s.ayar.ara || 0;
  await guncelle(O.depo(), K.gun(s.slug, p.id, kayit.tarih), (g) => {
    g = g || { r: [], k: [] }; gunTemizle(g, simdi);
    if (!zorla && C.cakisir(C.doluAraliklar(g, simdi, ara), kayit.bas, kayit.bit - kayit.bas, ara)) throw new Hata('Bu saat az önce doldu. Lütfen başka bir saat seçin.', 409, { dolu: true });
    if (g.r.length >= 300) throw new Hata('Bu gün için çok fazla kayıt var.', 429);
    g.r.push(kayit); g.r.sort((a, b) => a.bas - b.bas); return { veri: g };
  });
  await O.depo().setJSON(K.rid(kayit.id), { s: s.slug, p: p.id, t: kayit.tarih });
}
const saatGecerli = (s, p, tarih, bas, sure) => C.gunCalisma(s, p, tarih).some(([a, b]) => bas >= a && bas + sure <= b);

// ---------------------------------------------------------------- istatistik
async function ayIstat(O, s, pids, ay) {
  const st = O.depo(), simdi = O.simdi(), bugun = C.trBugun(simdi);
  const out = { toplam: 0, onay: 0, iptal: 0, gelmedi: 0, bekleyen: 0, ciro: 0, gelecekCiro: 0, onOdeme: 0, web: 0, panel: 0, musteri: 0, gunler: [0, 0, 0, 0, 0, 0, 0], saatler: {}, hizmetler: {}, hizmetCiro: {}, personel: {}, gunluk: {}, gunlukCiro: {} };
  const tel = new Set();
  for (const pid of pids) {
    const { blobs } = await st.list({ prefix: `g/${s.slug}/${pid}/${ay}` });
    const D = await Promise.all(blobs.map((b) => st.get(b.key, J)));
    const P = (out.personel[pid] = { toplam: 0, onay: 0, ciro: 0, gelecekCiro: 0, gelmedi: 0, iptal: 0, musteri: 0 });
    const ptel = new Set();
    for (const g of D) for (const r of g?.r || []) {
      if (r.kaynak === 'ornek' && !s.ornek) continue;
      if (r.durum === 'odeme') continue;
      if (r.durum === 'iptal') { if (r.iptal?.kim !== 'sistem') { out.iptal++; P.iptal++; } continue; }
      out.toplam++; P.toplam++; out.gunluk[r.tarih] = (out.gunluk[r.tarih] || 0) + 1;
      if (r.durum === 'gelmedi') { out.gelmedi++; P.gelmedi++; continue; }
      if (r.durum === 'kontrol') out.bekleyen++;
      if (r.durum === 'onay') {
        const f = r.fiyat || 0; out.onay++; P.onay++; out.ciro += f; P.ciro += f; out.onOdeme += r.kaynak !== 'panel' ? r.kapora || 0 : 0;
        out.gunlukCiro[r.tarih] = (out.gunlukCiro[r.tarih] || 0) + f;
        if (C.trMs(r.tarih, r.bas) > simdi) { out.gelecekCiro += f; P.gelecekCiro += f; }
        for (const h of r.h || []) out.hizmetCiro[h.ad] = (out.hizmetCiro[h.ad] || 0) + (h.fiyat || 0);
      }
      out[r.kaynak === 'panel' ? 'panel' : 'web']++;
      out.gunler[C.haftaGunu(r.tarih)]++;
      const sa = Math.floor(r.bas / 60); out.saatler[sa] = (out.saatler[sa] || 0) + 1;
      for (const h of r.h || []) out.hizmetler[h.ad] = (out.hizmetler[h.ad] || 0) + 1;
      if (r.tel) { tel.add(r.tel); ptel.add(r.tel); }
    }
    P.musteri = ptel.size;
  }
  out.musteri = tel.size; out.ay = ay; out.bugun = bugun;
  return out;
}

/** Yönetim → Kazançlar: her işletmenin ve ustanın ay özeti. Hesap pahalı olduğu için önbellekte tutulur
 *  (içinde bulunulan ay 1 dakika, geçmiş aylar 6 saat). */
async function kazancRapor(O, ay) {
  const st = O.depo(), simdi = O.simdi(), buAy = C.trBugun(simdi).slice(0, 7), ttl = ay >= buAy ? 60e3 : 6 * 3600e3;
  const L = (await hepsiAl(O, 'isletme/')).map((x) => x.v);
  const isletmeler = await Promise.all(L.map(async (s) => {
    const key = `onb/ist/${s.slug}/${ay}`;
    let c = ay > buAy ? null : await st.get(key, J);
    if (!c || simdi - c.t > ttl) { c = { t: simdi, v: await ayIstat(O, s, s.personel.map((p) => p.id), ay) }; if (ay <= buAy) await st.setJSON(key, c); }
    const v = c.v;
    return {
      slug: s.slug, ad: s.ad, tur: s.tur, ornek: !!s.ornek, aktif: s.aktif !== false, olusturma: s.olusturma || 0,
      tema: { ...C.temaTemiz(s.tema, s.tur), logo: await gUrl(O, s.slug, 'logo', s.tema?.logo) },
      ozet: { toplam: v.toplam, onay: v.onay, iptal: v.iptal, gelmedi: v.gelmedi, bekleyen: v.bekleyen, ciro: v.ciro, gelecekCiro: v.gelecekCiro || 0, onOdeme: v.onOdeme, musteri: v.musteri, web: v.web, panel: v.panel },
      personel: await Promise.all(s.personel.map(async (p) => ({ id: p.id, ad: p.ad, unvan: p.unvan, aktif: p.aktif !== false, foto: await gUrl(O, s.slug, 'p-' + p.id, p.foto), ...(v.personel[p.id] || {}) }))),
      hizmetler: v.hizmetler, hizmetCiro: v.hizmetCiro || {}, gunluk: v.gunluk, gunlukCiro: v.gunlukCiro || {},
    };
  }));
  return { ay, isletmeler, hesapZamani: simdi, simdi: C.trSimdi(simdi) };
}

// ---------------------------------------------------------------- yönlendirme
export async function isle(I, O) {
  const y = String(I.yol || '').split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  const m = I.yontem, b = I.govde && typeof I.govde === 'object' ? I.govde : {}, st = O.depo(), simdi = O.simdi(), q = I.sorgu || new URLSearchParams();
  try {
    await tohumla(O);
    // ---------------------------------------------- herkese açık
    if (m === 'GET' && y[0] === 'g' && y.length === 3) {
      const v = await st.get(K.gor(y[1], y[2]));
      const r = typeof v === 'string' && GORSEL_RE.exec(v);
      if (!r) return hata('yok', 404);
      return { durum: 200, ham: b64Coz(r[2]), basliklar: { 'content-type': r[1], 'cache-control': 'public, max-age=31536000, immutable', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" } };
    }
    if (m === 'GET' && y[0] === 'dizin' && y.length === 1) {
      const d = (await st.get('dizin', J)) || (await dizinKur(O));
      return yanit({ isletmeler: d.L || [], simdi: C.trSimdi(simdi) }, 200, CDN(30, 300));
    }
    if (y[0] === 'i' && y[1]) {
      const s = await isletmeAl(O, String(y[1]).toLowerCase());
      if (!s || s.aktif === false) return yanit({ yok: true }, 404);
      const sim = C.trSimdi(simdi);
      if (m === 'GET' && y.length === 2) return yanit({ isletme: await genel(O, s, sim.tarih), simdi: sim }, 200, CDN(20, 120));
      if (m === 'GET' && y[2] === 'takvim') {
        const pq = q.get('p') || '', bas = C.tarihMi(q.get('bas')) || sim.tarih, n = C.tamSayi(q.get('gun'), 1, 35, 14);
        const P = pq === '*' ? s.personel.filter((p) => p.aktif !== false) : s.personel.filter((p) => p.id === pq && p.aktif !== false);
        if (!P.length) return hata('Usta bulunamadı.', 404);
        if (pq === '*' && n > 2) return hata('En fazla 2 gün.', 400);
        const son = C.gunEkle(sim.tarih, s.ayar.ileriGun);
        const out = {};
        await Promise.all(P.map(async (p) => {
          out[p.id] = (await gunlerAl(O, s.slug, p.id, bas, n)).map(({ t, g }) => ({
            t, c: t < sim.tarih || t > son ? [] : C.gunCalisma(s, p, t), d: C.doluAraliklar(g, simdi, s.ayar.ara), izin: C.izinde(s, p, t), disi: t > son,
          }));
        }));
        return yanit({ personel: out, simdi: sim, ileriSon: son });
      }
      if (m === 'POST' && y[2] === 'randevu') {
        if (b.web) return hata('Geçersiz istek.', 400); // bot tuzağı
        const p = s.personel.find((x) => x.id === b.personel && x.aktif !== false); if (!p) return hata('Usta bulunamadı.', 404);
        const H = hizmetlerSec(s, p, b.hizmetler), sure = H.reduce((n, h) => n + h.sure, 0), fiyat = H.reduce((n, h) => n + h.fiyat, 0);
        const tarih = C.tarihMi(b.tarih), bas = C.dkCoz(b.saat);
        if (!tarih || !Number.isFinite(bas)) return hata('Gün ve saat seçin.');
        if (tarih < sim.tarih || C.gunFark(sim.tarih, tarih) > s.ayar.ileriGun) return hata('Bu gün için randevu alınamıyor.');
        if (!saatGecerli(s, p, tarih, bas, sure)) return hata('Seçilen saat çalışma saatleri dışında.');
        if (tarih === sim.tarih && bas < sim.dk + s.ayar.enAzOnce) return hata('Bu saat için artık randevu alınamıyor. Lütfen daha ileri bir saat seçin.');
        const ad = C.str(b.ad, 60);
        if (ad.length < 4 || !/\S+\s+\S+/.test(ad)) return hata('Adınızı ve soyadınızı yazın.');
        const tel = C.telNorm(b.tel); if (!C.cepMi(tel)) return hata('Geçerli bir cep telefonu yazın (05xx xxx xx xx).');
        const ipk = await ipAnahtar(O, I.ip), telk = `t/${s.slug}/${(await sha(O, 'tel:' + tel)).slice(0, 16)}`;
        if (!hizSinir('rv:' + ipk, 12, 3600e3, simdi) || (await sayacOku(O, ipk + '/r', 3600e3)) >= 12) return hata('Kısa sürede çok fazla randevu denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.', 429);
        if ((await sayacOku(O, telk, 12 * 3600e3)) >= 4) return hata('Bu telefonla kısa sürede çok fazla randevu alındı. Lütfen işletmeyi arayın.', 429);
        const id = 'r' + C.rastgele(9), anahtar = C.rastgele(12), kapora = p.iban?.no ? C.onOdemeTutar(s.ayar, fiyat) : 0; // IBAN'ı olmayan usta: ön ödemesiz, usta onaylar
        const durum = kapora > 0 ? 'odeme' : 'kontrol';
        const kayit = { id, durum, p: p.id, tarih, bas, bit: bas + sure, h: H.map((h) => ({ id: h.id, ad: h.ad, sure: h.sure, fiyat: h.fiyat })), fiyat, kapora, ad, tel, not: C.metin(b.not, 300), kaynak: 'web', ah: await sha(O, anahtar), olusturma: simdi, son: durum === 'odeme' ? simdi + s.ayar.odemeSure * 60e3 : 0, bildirim: durum === 'kontrol' ? simdi : 0, onay: 0 };
        await randevuEkle(O, s, p, kayit);
        await sayacArtir(O, ipk + '/r', 3600e3); await sayacArtir(O, telk, 12 * 3600e3);
        if (durum === 'kontrol') await bekleyenYaz(O, s.slug, kayit, true);
        return yanit({ kod: id + anahtar, ...(await durumGorunum(O, s, p, kayit)) }, 201);
      }
      return hata('Bulunamadı.', 404);
    }
    if (y[0] === 'r' && y[1]) {
      const kod = String(y[1]), id = kod.slice(0, 10), anahtar = kod.slice(10);
      const x = /^r[a-z0-9]{21}$/.test(kod) ? await randevuBul(O, id) : null;
      if (!x || !x.r.ah || !esit(x.r.ah, await sha(O, anahtar))) return hata('Randevu bulunamadı. Bağlantıyı kontrol edin.', 404);
      const { s, p } = x;
      if (m === 'GET' && y.length === 2) {
        let r = x.r;
        if (r.durum === 'odeme' && (r.son || 0) <= simdi) r = await randevuDegistir(O, x.key, id, () => false);
        return yanit(await durumGorunum(O, s, p, r));
      }
      if (m === 'POST' && y[2] === 'odedim') {
        const ara = s.ayar.ara || 0;
        const r = await randevuDegistir(O, x.key, id, (r, g) => {
          if (r.durum === 'kontrol' || r.durum === 'onay') return false;
          const sureDoldu = r.durum === 'iptal' && r.iptal?.kim === 'sistem';
          if (r.durum !== 'odeme' && !sureDoldu) throw new Hata('Bu randevu için ödeme bildirimi yapılamaz.', 409);
          if (sureDoldu && C.cakisir(C.doluAraliklar({ r: g.r.filter((z) => z.id !== r.id), k: g.k }, simdi, ara), r.bas, r.bit - r.bas, ara)) throw new Hata('Ödeme süresi dolduğu için bu saat başka birine verildi. Ödeme yaptıysanız lütfen işletmeyi arayın.', 409);
          r.durum = 'kontrol'; r.bildirim = simdi; r.son = 0; delete r.iptal; return true;
        });
        await bekleyenYaz(O, s.slug, r, true);
        return yanit(await durumGorunum(O, s, p, r));
      }
      if (m === 'POST' && y[2] === 'iptal') {
        const r = await randevuDegistir(O, x.key, id, (r) => {
          if (r.durum === 'iptal') return false;
          const basMs = C.trMs(r.tarih, r.bas);
          if (basMs <= simdi) throw new Hata('Geçmiş bir randevu iptal edilemez.', 409);
          if (r.durum === 'onay' && basMs - simdi < s.ayar.iptalSaat * 3600e3) throw new Hata(`Randevuya ${s.ayar.iptalSaat} saatten az kaldığı için buradan iptal edilemez. Lütfen işletmeyi arayın.`, 409);
          if (r.durum === 'gelmedi') throw new Hata('Bu randevu iptal edilemez.', 409);
          r.durum = 'iptal'; r.iptal = { t: simdi, kim: 'musteri', neden: C.str(b.neden, 160) }; return true;
        });
        await bekleyenYaz(O, s.slug, r, false);
        return yanit(await durumGorunum(O, s, p, r));
      }
      return hata('Bulunamadı.', 404);
    }
    if (m === 'POST' && y[0] === 'giris' && y.length === 1) {
      const kad = C.str(b.kullanici, 40).toLocaleLowerCase('tr').replace(/ı/g, 'i');
      if (!C.KULLANICI_RE.test(kad)) return hata('Kullanıcı adı ya da şifre hatalı.', 401);
      const ipk = await ipAnahtar(O, I.ip), anahtarlar = ['g/' + kad, ipk];
      for (const k of anahtarlar) if ((await sayacOku(O, 'deneme/' + k, 15 * 60e3)) >= 10) return hata('Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.', 429);
      const h = await st.get(K.hes(kad), J);
      if (!h || !esit(await pbkdf(O, b.sifre ?? '', h.tuz), h.hash)) { for (const k of anahtarlar) await sayacArtir(O, 'deneme/' + k, 15 * 60e3); return hata('Kullanıcı adı ya da şifre hatalı.', 401); }
      const s = await isletmeAl(O, h.s), p = s?.personel.find((x) => x.id === h.p);
      if (!s || !p) return hata('Bu hesap artık kullanılmıyor.', 401);
      if (p.aktif === false) return hata('Hesabınız kapatılmış. İşletme yöneticinizle görüşün.', 403);
      if (s.aktif === false) return hata('İşletmenin randevu sayfası şu an kapalı. NFC Dünyası ile görüşün.', 403);
      h.son = simdi; await st.setJSON(K.hes(kad), h);
      return yanit({ token: await imzala(O, { r: 'p', k: kad, pv: h.pv || 0, exp: simdi + 30 * GUN }), kullanici: kad, isletme: s.slug, ad: p.ad });
    }

    // ---------------------------------------------- personel paneli
    const k = await kimlik(I, O);
    if (k?.rol === 'kapali') return hata('İşletmenin randevu sayfası şu an kapalı. NFC Dünyası ile görüşün.', 403);
    if (y[0] === 'panel') {
      if (!k || k.rol !== 'personel') return hata(OTURUM, 401);
      const s = k.s, sim = C.trSimdi(simdi);
      const kapsam = (pid) => { if (!pid || pid === k.p) return [k.p]; if (!k.yonetici) throw new Hata('Bu işlem için işletme yöneticisi yetkisi gerekir.', 403); return pid === '*' ? s.personel.map((p) => p.id) : s.personel.some((p) => p.id === pid) ? [pid] : []; };
      const personelAl = (pid) => { const p = s.personel.find((x) => x.id === pid); if (!p) throw new Hata('Personel bulunamadı.', 404); return p; };
      if (m === 'GET' && y.length === 1) {
        const bek = (await st.list({ prefix: `bek/${s.slug}/` })).blobs.map((x) => x.key.split('/')).filter((a) => k.yonetici || a[2] === k.p);
        const onbellek = {}, bekleyen = [];
        for (const [, , pid, id] of bek) {
          const ix = await st.get(K.rid(id), J); if (!ix) { await st.delete(K.bek(s.slug, pid, id)); continue; }
          const key = K.gun(s.slug, pid, ix.t), g = (onbellek[key] ||= await st.get(key, J)), r = g?.r?.find((z) => z.id === id);
          if (!r || r.durum !== 'kontrol') { await st.delete(K.bek(s.slug, pid, id)); continue; }
          bekleyen.push(randevuOzet(r));
        }
        bekleyen.sort((a, b2) => a.bildirim - b2.bildirim);
        return yanit({ isletme: await panelGorunum(O, s, k), ben: k.p, yonetici: k.yonetici, admin: !!k.admin, kullanici: k.kullanici || '', bekleyen, simdi: sim });
      }
      if (m === 'GET' && y[1] === 'gun') {
        const P = kapsam(q.get('p')), bas = C.tarihMi(q.get('bas')) || sim.tarih, n = C.tamSayi(q.get('gun'), 1, 7, 1), out = {};
        await Promise.all(P.map(async (pid) => {
          const p = personelAl(pid);
          out[pid] = (await gunlerAl(O, s.slug, pid, bas, n)).map(({ t, g }) => ({ t, c: C.gunCalisma(s, p, t), izin: C.izinde(s, p, t), r: (g.r || []).filter((r) => r.durum !== 'odeme' || (r.son || 0) > simdi).map(randevuOzet), k: g.k || [] }));
        }));
        return yanit({ gunler: out, simdi: sim });
      }
      if (m === 'GET' && y[1] === 'istat') {
        const ay = /^\d{4}-\d{2}$/.test(q.get('ay') || '') ? q.get('ay') : sim.tarih.slice(0, 7);
        return yanit(await ayIstat(O, s, kapsam(q.get('p')), ay));
      }
      if (m === 'GET' && y[1] === 'ara') {
        // müşteri arama (ad ya da telefon) — son 90 gün ve ileri 60 gün
        const aranan = C.str(q.get('q'), 40).toLocaleLowerCase('tr'), P = kapsam(q.get('p') || (k.yonetici ? '*' : k.p));
        if (aranan.length < 2) return yanit({ sonuc: [] });
        const tq = C.telNorm(aranan), sonuc = [];
        for (const pid of P) {
          const keys = (await st.list({ prefix: `g/${s.slug}/${pid}/` })).blobs.map((x) => x.key).filter((key) => { const t = key.split('/')[3]; return t >= C.gunEkle(sim.tarih, -90) && t <= C.gunEkle(sim.tarih, 60); });
          const D = await Promise.all(keys.map((key) => st.get(key, J)));
          for (const g of D) for (const r of g?.r || []) if ((tq && r.tel === tq) || (r.ad || '').toLocaleLowerCase('tr').includes(aranan) || (r.tel || '').includes(aranan.replace(/\D/g, '') || '¬')) sonuc.push(randevuOzet(r));
        }
        sonuc.sort((a, b2) => (b2.tarih + b2.bas).localeCompare(a.tarih + a.bas));
        return yanit({ sonuc: sonuc.slice(0, 60) });
      }
      if (m === 'POST' && y[1] === 'randevu' && y.length === 2) {
        const [pid] = kapsam(b.p), p = personelAl(pid);
        let H;
        if (Array.isArray(b.hizmetler) && b.hizmetler.length) { const L = b.hizmetler.map(String); H = L.map((id) => s.hizmetler.find((h) => h.id === id)).filter(Boolean); if (H.length !== L.length) return hata('Hizmet bulunamadı.'); }
        else H = [{ id: 'ozel', ad: C.str(b.hizmetAd, 60) || 'Randevu', sure: C.tamSayi(b.sure, 5, 600, 30), fiyat: C.sayi(b.fiyat, 0, 1e6, 0) }];
        const sure = b.sure && H.length ? C.tamSayi(b.sure, 5, 600, 30) : H.reduce((n, h) => n + h.sure, 0), fiyat = b.fiyat != null && b.fiyat !== '' ? C.sayi(b.fiyat, 0, 1e6, 0) : H.reduce((n, h) => n + h.fiyat, 0);
        const tarih = C.tarihMi(b.tarih), bas = C.dkCoz(b.saat);
        if (!tarih || !Number.isFinite(bas) || bas + sure > 1440) return hata('Gün ve saat seçin.');
        const ad = C.str(b.ad, 60); if (ad.length < 2) return hata('Müşterinin adını yazın.');
        const tel = b.tel ? C.telNorm(b.tel) : ''; if (b.tel && !tel) return hata('Telefon numarası geçersiz.');
        const kayit = { id: 'r' + C.rastgele(9), durum: 'onay', p: pid, tarih, bas, bit: bas + sure, h: H.map((h) => ({ id: h.id, ad: h.ad, sure: h.sure, fiyat: h.fiyat })), fiyat, kapora: 0, ad, tel, not: C.metin(b.not, 300), kaynak: 'panel', ah: '', olusturma: simdi, son: 0, bildirim: 0, onay: simdi, onayKim: k.p };
        await randevuEkle(O, s, p, kayit, { zorla: !!b.zorla });
        return yanit({ randevu: randevuOzet(kayit) }, 201);
      }
      if (m === 'POST' && y[1] === 'randevu' && y[2] && y[3]) {
        const x = await randevuBul(O, y[2]); if (!x || x.s.slug !== s.slug) return hata('Randevu bulunamadı.', 404);
        kapsam(x.p.id);
        const eylem = y[3], neden = C.str(b.neden, 160);
        if (eylem === 'tasi') {
          const [pid] = kapsam(b.p || x.p.id), p2 = personelAl(pid), tarih = C.tarihMi(b.tarih), bas = C.dkCoz(b.saat);
          if (!tarih || !Number.isFinite(bas)) return hata('Yeni gün ve saati seçin.');
          if (!['onay', 'kontrol', 'odeme'].includes(x.r.durum)) return hata('Bu randevu taşınamaz.', 409);
          const sure = x.r.bit - x.r.bas, yeni = { ...x.r, p: pid, tarih, bas, bit: bas + sure, tasindi: { t: simdi, eski: { p: x.r.p, tarih: x.r.tarih, bas: x.r.bas } } };
          if (bas + sure > 1440) return hata('Randevu gün içinde bitmeli.');
          if (pid === x.p.id && tarih === x.r.tarih) {
            const r = await randevuDegistir(O, x.key, x.r.id, (r, g) => {
              if (!b.zorla && C.cakisir(C.doluAraliklar({ r: g.r.filter((z) => z.id !== r.id), k: g.k }, simdi, s.ayar.ara), bas, sure, s.ayar.ara)) throw new Hata('Bu saat dolu.', 409, { dolu: true });
              Object.assign(r, { bas, bit: bas + sure, tasindi: yeni.tasindi }); g.r.sort((a, c) => a.bas - c.bas); return true;
            });
            return yanit({ randevu: randevuOzet(r) });
          }
          await randevuEkle(O, s, p2, yeni, { zorla: !!b.zorla });
          await guncelle(st, x.key, (g) => { if (!g) return { cikti: null }; g.r = g.r.filter((z) => z.id !== x.r.id); return { veri: g }; });
          if (x.r.durum === 'kontrol') { await bekleyenYaz(O, s.slug, x.r, false); await bekleyenYaz(O, s.slug, yeni, true); }
          return yanit({ randevu: randevuOzet(yeni) });
        }
        const r = await randevuDegistir(O, x.key, x.r.id, (r) => {
          if (eylem === 'onayla') { if (r.durum === 'onay') return false; if (!['kontrol', 'odeme'].includes(r.durum)) throw new Hata('Bu randevu onaylanamaz.', 409); r.durum = 'onay'; r.onay = simdi; r.onayKim = k.admin ? 'yonetici' : k.p; r.son = 0; return true; }
          if (eylem === 'reddet') { if (!['kontrol', 'odeme'].includes(r.durum)) throw new Hata('Bu randevu için ödeme bekleniyor değil.', 409); r.durum = 'iptal'; r.iptal = { t: simdi, kim: 'personel', neden: neden || 'Ödeme ulaşmadı' }; return true; }
          if (eylem === 'iptal') { if (r.durum === 'iptal') return false; r.durum = 'iptal'; r.iptal = { t: simdi, kim: 'personel', neden }; return true; }
          if (eylem === 'gelmedi') { if (r.durum !== 'onay') throw new Hata('Yalnız onaylı randevu "gelmedi" yapılabilir.', 409); r.durum = 'gelmedi'; r.gelmedi = simdi; return true; }
          if (eylem === 'geldi') { if (r.durum !== 'gelmedi') return false; r.durum = 'onay'; delete r.gelmedi; return true; }
          if (eylem === 'not') { r.pnot = C.metin(b.not, 300); return true; }
          throw new Hata('Bilinmeyen işlem.', 400);
        });
        if (['onayla', 'reddet', 'iptal'].includes(eylem)) await bekleyenYaz(O, s.slug, r, false);
        return yanit({ randevu: randevuOzet(r) });
      }
      if (m === 'POST' && y[1] === 'kapat') {
        const [pid] = kapsam(b.p), tarih = C.tarihMi(b.tarih), bas = C.dkCoz(b.bas), bit = C.dkCoz(b.bit);
        if (!tarih || !(bit > bas)) return hata('Kapatılacak saat aralığını seçin.');
        const kb = { id: 'k' + C.rastgele(6), bas, bit, neden: C.str(b.neden, 60) };
        await guncelle(st, K.gun(s.slug, pid, tarih), (g) => { g = g || { r: [], k: [] }; g.k = [...(g.k || []), kb].slice(-40); return { veri: g }; });
        return yanit({ kapali: kb }, 201);
      }
      if (m === 'DELETE' && y[1] === 'kapat' && y.length === 5) {
        const [pid] = kapsam(y[2]), tarih = C.tarihMi(y[3]);
        if (!tarih) return hata('Geçersiz gün.');
        await guncelle(st, K.gun(s.slug, pid, tarih), (g) => (g ? { veri: { ...g, k: (g.k || []).filter((z) => z.id !== y[4]) } } : { cikti: null }));
        return yanit({ ok: true });
      }
      if (m === 'PUT' && y[1] === 'profil') {
        const [pid] = kapsam(b.p);
        const kendi = pid === k.p;
        const ibanNo = b.iban ? C.ibanNorm(b.iban.no) : null;
        const sOnce = s.personel.find((x) => x.id === pid);
        const ibanDegisti = b.iban && (ibanNo !== (sOnce.iban?.no || '') || C.str(b.iban.ad, 60) !== (sOnce.iban?.ad || ''));
        if (ibanDegisti) {
          if (!kendi && !k.admin) return hata('IBAN bilgisini yalnız ustanın kendisi değiştirebilir.', 403);
          if (!k.admin) { const h = await st.get(K.hes(k.kullanici), J); if (!h || !esit(await pbkdf(O, b.sifre ?? '', h.tuz), h.hash)) return hata('IBAN\'ı değiştirmek için şifrenizi doğru girin.', 401, { sifre: true }); }
          if (ibanNo && !C.ibanGecerli(ibanNo) && !(sOnce.iban?.ornek && ibanNo === sOnce.iban.no)) return hata('IBAN geçersiz görünüyor. TR ile başlayan 26 karakteri kontrol edin.');
        }
        let foto = sOnce.foto, isler = null;
        if (b.foto !== undefined) foto = await gorselIsle(O, s.slug, 'p-' + pid, b.foto, sOnce.foto);
        if (b.isler !== undefined) isler = await isGorselleri(O, s.slug, pid, isTemiz(b.isler, sOnce.isler, new Set(s.hizmetler.map((h) => h.id))), Array.isArray(b.isler) ? b.isler.slice(0, 30) : [], sOnce.isler);
        const yeni = await guncelle(st, K.is(s.slug), (e) => {
          const p = e.personel.find((x) => x.id === pid); if (!p) throw new Hata('Personel bulunamadı.', 404);
          if (b.ad !== undefined) p.ad = C.str(b.ad, 40) || p.ad;
          if (b.unvan !== undefined) p.unvan = C.str(b.unvan, 40);
          if (b.tel !== undefined) p.tel = C.telNorm(b.tel);
          if (b.hizmetler !== undefined) { const ids = new Set(e.hizmetler.map((h) => h.id)); p.hizmetler = (Array.isArray(b.hizmetler) ? b.hizmetler : []).map(String).filter((id) => ids.has(id)); }
          if (b.calisma !== undefined) p.calisma = b.calisma && typeof b.calisma === 'object' ? C.calismaTemiz(b.calisma) : null;
          if (b.izinler !== undefined) p.izinler = C.aralikTemiz(b.izinler);
          if (ibanDegisti) p.iban = ibanNo ? (p.iban?.ornek && ibanNo === p.iban.no ? { ...p.iban, ad: C.str(b.iban.ad, 60) } : { ad: C.str(b.iban.ad, 60), no: ibanNo, banka: C.str(b.iban.banka, 40) || C.bankaAdi(ibanNo) }) : { ad: C.str(b.iban.ad, 60), no: '', banka: '' };
          else if (b.iban && b.iban.banka !== undefined && p.iban?.no) p.iban.banka = C.str(b.iban.banka, 40);
          p.foto = foto;
          if (b.hakkinda !== undefined) p.hakkinda = C.metin(b.hakkinda, 500);
          if (b.deneyim !== undefined) p.deneyim = C.tamSayi(b.deneyim, 0, 60, 0);
          if (b.uzmanlik !== undefined) p.uzmanlik = uzmanlikTemiz(b.uzmanlik);
          if (isler) p.isler = isler;
          e.rev = (e.rev || 0) + 1; e.guncelleme = simdi; return { veri: e, cikti: e };
        });
        return yanit({ isletme: await panelGorunum(O, yeni, k) });
      }
      if (m === 'PUT' && y[1] === 'isletme') {
        if (!k.yonetici) return hata('Bu işlem için işletme yöneticisi yetkisi gerekir.', 403);
        if (b.rev != null && b.rev !== s.rev && !b.zorla) return hata('İşletme bilgileri siz düzenlerken değişti. Sayfayı yenileyip tekrar deneyin.', 409, { rev: true });
        // görseller kayıttan önce işlenir (data: URL → depo; '' → silinir)
        let logo, kapak, urunler = null;
        if (b.tema) { logo = await gorselIsle(O, s.slug, 'logo', b.tema.logo, s.tema?.logo); kapak = await gorselIsle(O, s.slug, 'kapak', b.tema.kapak, s.tema?.kapak); }
        if (Array.isArray(b.urunler)) { urunler = urunTemiz(b.urunler, s.urunler); await urunGorselleri(O, s.slug, urunler, b.urunler, s.urunler); }
        const yeni = await guncelle(st, K.is(s.slug), (e) => {
          if (b.rev != null && b.rev !== e.rev && !b.zorla) throw new Hata('İşletme bilgileri siz düzenlerken değişti. Sayfayı yenileyip tekrar deneyin.', 409, { rev: true });
          if (b.ad !== undefined) e.ad = C.str(b.ad, 80) || e.ad;
          if (b.aciklama !== undefined) e.aciklama = C.metin(b.aciklama, 400);
          if (b.iletisim) e.iletisim = iletisimTemiz({ ...e.iletisim, ...b.iletisim });
          if (b.calisma) e.calisma = C.calismaTemiz(b.calisma);
          if (b.kapali) e.kapali = C.aralikTemiz(b.kapali);
          if (b.hizmetler) {
            e.hizmetler = hizmetTemiz(b.hizmetler);
            const ids = new Set(e.hizmetler.map((h) => h.id)); for (const p of e.personel) p.hizmetler = (p.hizmetler || []).filter((id) => ids.has(id));
          }
          if (urunler) e.urunler = urunler;
          if (b.tema) e.tema = { ...C.temaTemiz({ ...e.tema, ...b.tema }, e.tur), logo, kapak };
          if (b.ayar) e.ayar = C.ayarTemiz({ ...e.ayar, ...b.ayar });
          e.rev = (e.rev || 0) + 1; e.guncelleme = simdi; return { veri: e, cikti: e };
        });
        await dizinYaz(O, yeni);
        return yanit({ isletme: await panelGorunum(O, yeni, k) });
      }
      if (m === 'POST' && y[1] === 'sifre') {
        if (k.admin || !k.kullanici) return hata('Yönetici oturumunda şifre değiştirilemez.', 400);
        const h = await st.get(K.hes(k.kullanici), J);
        if (!h || !esit(await pbkdf(O, b.eski ?? '', h.tuz), h.hash)) return hata('Mevcut şifre hatalı.', 401);
        const yeni = String(b.yeni || ''); if (yeni.length < 6 || yeni.length > 64) return hata('Yeni şifre en az 6 karakter olmalı.');
        const h2 = await hesapKur(O, h.s, h.p, k.kullanici, yeni);
        return yanit({ token: await imzala(O, { r: 'p', k: k.kullanici, pv: h2.pv, exp: simdi + 30 * GUN }) });
      }
      return hata('Bulunamadı.', 404);
    }

    // ---------------------------------------------- yönetici (NFC Dünyası)
    if (!k || k.rol !== 'yonetici') return hata(OTURUM, 401);
    if (m === 'GET' && y[0] === 'yonetim' && y[1] === 'kazanc') {
      const ay = /^\d{4}-\d{2}$/.test(q.get('ay') || '') ? q.get('ay') : C.trBugun(simdi).slice(0, 7);
      return yanit(await kazancRapor(O, ay));
    }
    if (m === 'GET' && y[0] === 'yonetim' && y.length === 1) {
      const L = (await hepsiAl(O, 'isletme/')).map((x) => x.v).sort((a, c) => a.ad.localeCompare(c.ad, 'tr'));
      const bugun = C.trBugun(simdi), bek = (await st.list({ prefix: 'bek/' })).blobs.map((x) => x.key.split('/')[1]);
      const ozet = {};
      await Promise.all(L.map(async (s) => {
        const D = await Promise.all(s.personel.filter((p) => p.aktif !== false).map((p) => st.get(K.gun(s.slug, p.id, bugun), J)));
        ozet[s.slug] = { bugun: D.reduce((n, g) => n + (g?.r || []).filter((r) => r.durum === 'onay' || r.durum === 'kontrol').length, 0), bekleyen: bek.filter((x) => x === s.slug).length };
      }));
      // dizin kendini onarır: liste her açıldığında işletmelerle karşılaştırılır
      const d = await st.get('dizin', J), beklenen = L.filter(dizinde).map((s) => s.slug).sort().join();
      if (!d || (d.L || []).map((x) => x.slug).sort().join() !== beklenen) await dizinKur(O, L);
      return yanit({ isletmeler: await Promise.all(L.map((s) => yoneticiGorunum(O, s))), ozet, simdi: C.trSimdi(simdi) });
    }
    if (y[0] === 'isletme' && y[1]) {
      const slug = String(y[1]).toLowerCase();
      if (!C.SLUG_RE.test(slug) || C.AYRILMIS.has(slug)) return hata('İşletme adresi geçersiz: küçük harf, rakam ve tire kullanın (en az 3 karakter).');
      const eski = await isletmeAl(O, slug);
      if (m === 'PUT' && y.length === 2) {
        if (b.yeni && eski) return hata('Bu adres başka bir işletmede kullanılıyor. Başka bir adres seçin.', 409);
        if (!b.yeni && !eski) return hata('İşletme bulunamadı.', 404);
        if (eski && b.rev != null && b.rev !== eski.rev && !b.zorla) return hata('Bu işletme siz düzenlerken değişti (ör. bir usta saatlerini güncelledi). Sayfayı yenileyin ya da yine de kaydedin.', 409, { rev: true });
        const x = isletmeTemiz(slug, b, eski);
        x.tema.logo = await gorselIsle(O, slug, 'logo', b.tema?.logo, eski?.tema?.logo);
        x.tema.kapak = await gorselIsle(O, slug, 'kapak', b.tema?.kapak, eski?.tema?.kapak);
        for (const p of x.personel) {
          const gp = (b.personel || []).find((z) => z.id === p.id), ep = eski?.personel.find((z) => z.id === p.id);
          p.foto = await gorselIsle(O, slug, 'p-' + p.id, gp ? gp.foto : undefined, p.foto);
          p.isler = await isGorselleri(O, slug, p.id, p.isler, Array.isArray(gp?.isler) ? gp.isler.slice(0, 30) : [], ep?.isler);
        }
        for (const p of eski?.personel || []) if (!x.personel.some((z) => z.id === p.id)) {
          if (p.kullanici) await st.delete(K.hes(p.kullanici)); if (p.foto) await st.delete(K.gor(slug, 'p-' + p.id));
          for (const i of p.isler || []) if (i.foto) await st.delete(K.gor(slug, `i-${p.id}-${i.id}`));
        }
        await urunGorselleri(O, slug, x.urunler, b.urunler, eski?.urunler);
        await st.setJSON(K.is(slug), x);
        await dizinYaz(O, x);
        return yanit({ isletme: await yoneticiGorunum(O, x) }, b.yeni ? 201 : 200);
      }
      if (!eski) return hata('İşletme bulunamadı.', 404);
      if (m === 'DELETE' && y.length === 2) {
        for (const p of eski.personel) if (p.kullanici) await st.delete(K.hes(p.kullanici));
        for (const on of [`g/${slug}/`, `bek/${slug}/`, `gorsel/${slug}/`, `sinir/t/${slug}/`, `onb/ist/${slug}/`]) { const { blobs } = await st.list({ prefix: on }); for (const x of blobs) await st.delete(x.key); }
        await st.delete(K.is(slug));
        await dizinYaz(O, null, slug);
        return yanit({ ok: true });
      }
      if (m === 'POST' && y[2] === 'hesap') {
        const p = eski.personel.find((x) => x.id === b.p); if (!p) return hata('Personel bulunamadı.', 404);
        if (b.kapat) {
          if (p.kullanici) await st.delete(K.hes(p.kullanici));
          const s2 = await guncelle(st, K.is(slug), (e) => { const z = e.personel.find((x) => x.id === p.id); if (z) z.kullanici = ''; e.rev++; return { veri: e, cikti: e }; });
          return yanit({ isletme: await yoneticiGorunum(O, s2) });
        }
        const kad = C.str(b.kullanici || p.kullanici || C.kullaniciOner(p.ad), 30).toLocaleLowerCase('tr').replace(/ı/g, 'i');
        if (!C.KULLANICI_RE.test(kad) || kad === 'admin') return hata('Kullanıcı adı geçersiz: küçük harf, rakam, nokta ya da tire kullanın (2–30 karakter).');
        const var_ = await st.get(K.hes(kad), J);
        if (var_ && !(var_.s === slug && var_.p === p.id)) return hata(`"${kad}" kullanıcı adı başka bir hesapta kullanılıyor. Başka bir ad seçin.`, 409);
        const eskiH = p.kullanici && p.kullanici !== kad ? await st.get(K.hes(p.kullanici), J) : null;
        let sifre = String(b.sifre || '');
        if (sifre && (sifre.length < 6 || sifre.length > 64)) return hata('Şifre en az 6 karakter olmalı.');
        if (!sifre) sifre = !b.yeniSifre && (var_ || eskiH) ? await coz(O, (var_ || eskiH).sifreli) : C.sifreUret();
        if (!sifre) sifre = C.sifreUret();
        await hesapKur(O, slug, p.id, kad, sifre);
        if (eskiH) await st.delete(K.hes(p.kullanici));
        const s2 = await guncelle(st, K.is(slug), (e) => { const z = e.personel.find((x) => x.id === p.id); if (z) z.kullanici = kad; e.rev++; return { veri: e, cikti: e }; });
        return yanit({ kullanici: kad, sifre, isletme: await yoneticiGorunum(O, s2) });
      }
      if (m === 'POST' && y[2] === 'oturum') {
        const p = eski.personel.find((x) => x.id === b.p) || eski.personel.find((x) => x.yonetici) || eski.personel[0];
        if (!p) return hata('Bu işletmede personel yok.', 404);
        return yanit({ token: await imzala(O, { r: 'pa', s: slug, p: p.id, exp: simdi + 8 * 3600e3 }), personel: p.id });
      }
      if (m === 'GET' && y[2] === 'istat') {
        const ay = /^\d{4}-\d{2}$/.test(q.get('ay') || '') ? q.get('ay') : C.trBugun(simdi).slice(0, 7);
        return yanit(await ayIstat(O, eski, eski.personel.map((p) => p.id), ay));
      }
      if (m === 'GET' && y[2] === 'randevular') {
        const bas = C.tarihMi(q.get('bas')) || C.trBugun(simdi), n = C.tamSayi(q.get('gun'), 1, 31, 7), L = [];
        await Promise.all(eski.personel.map(async (p) => { for (const { g } of await gunlerAl(O, slug, p.id, bas, n)) for (const r of g.r || []) if (r.durum !== 'odeme' || (r.son || 0) > simdi) L.push(randevuOzet(r)); }));
        L.sort((a, c) => (a.tarih + String(a.bas).padStart(4, '0')).localeCompare(c.tarih + String(c.bas).padStart(4, '0')));
        return yanit({ randevular: L });
      }
    }
    return hata('Bulunamadı.', 404);
  } catch (e) {
    if (e instanceof Hata) return hata(e.message, e.durum, e.ek);
    throw e;
  }
}
