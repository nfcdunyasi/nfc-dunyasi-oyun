// Düğün Planla — istek işleyicisi. Aynı kod Netlify fonksiyonunda (Netlify Blobs) ve tarayıcı demosunda (bellek deposu) çalışır.
// isle(I, O) → { durum, veri | ham, basliklar }
//   I: { yontem, yol, sorgu: URLSearchParams, baslik(k), govde, ip }
//   O: { depo(), kripto (WebCrypto), simdi(), adminDogrula?(token), gorselUrl(slug, tur, surum) }
import * as C from './cekirdek.mjs';

const GUN = 864e5;
const yanit = (veri, durum = 200, basliklar = {}) => ({ durum, veri, basliklar });
const hata = (m, durum = 400) => yanit({ hata: m }, durum);
const CDN = (sn, swr) => ({ 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': `public, s-maxage=${sn}, stale-while-revalidate=${swr}` });
const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64Coz = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const t = atob(s), b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; };
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const hexCoz = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));
const esit = (a, b) => { a = String(a ?? ''); b = String(b ?? ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const RENK_RE = /^#[0-9a-f]{6}$/i;
export const STIL_K = ['acik', 'koyu'];
/** Önceki sürümün stil adları yeni iki görünüme çevrilir */
const ESKI_STIL = { fildisi: 'acik', beyaz: 'acik', pudra: 'acik', gece: 'koyu', zumrut: 'koyu', lacivert: 'koyu', bordo: 'koyu' };

// ---------------------------------------------------------------- kripto
async function gizli(O) {
  if (O._g) return O._g;
  const st = O.depo(); let g = await st.get('gizli', { type: 'json' });
  if (!g?.k) { g = { k: hex(O.kripto.getRandomValues(new Uint8Array(32))) }; await st.setJSON('gizli', g); }
  return (O._g = g.k);
}
async function hmac(O, veri) { const key = await O.kripto.subtle.importKey('raw', hexCoz(await gizli(O)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64u(await O.kripto.subtle.sign('HMAC', key, enc.encode(veri))); }
async function pbkdf(O, s, tuz, it = 100000) { const key = await O.kripto.subtle.importKey('raw', enc.encode(String(s)), 'PBKDF2', false, ['deriveBits']); return hex(await O.kripto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(tuz), iterations: it, hash: 'SHA-256' }, key, 256)); }
const sha = async (O, s) => hex(await O.kripto.subtle.digest('SHA-256', enc.encode(String(s))));
async function aes(O) { return O.kripto.subtle.importKey('raw', await O.kripto.subtle.digest('SHA-256', enc.encode('pin:' + (await gizli(O)))), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function sifrele(O, m) { const iv = O.kripto.getRandomValues(new Uint8Array(12)); return b64u(iv) + '.' + b64u(await O.kripto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(O), enc.encode(m))); }
async function coz(O, s) { try { const [a, b] = String(s).split('.'); return dec.decode(await O.kripto.subtle.decrypt({ name: 'AES-GCM', iv: b64Coz(a) }, await aes(O), b64Coz(b))); } catch { return ''; } }
async function imzala(O, p) { const b = b64u(enc.encode(JSON.stringify(p))); return b + '.' + (await hmac(O, b)); }
async function tokenCoz(O, t) {
  const [b, s] = String(t || '').split('.'); if (!b || !s || b.length > 2000) return null;
  if (!esit(await hmac(O, b), s)) return null;
  try { const p = JSON.parse(dec.decode(b64Coz(b))); return p && p.exp > O.simdi() ? p : null; } catch { return null; }
}
const pinUret = (O) => { const b = O.kripto.getRandomValues(new Uint32Array(1)); return String(100000 + (b[0] % 900000)); };

// ---------------------------------------------------------------- hız sınırı ve hatalı giriş
const HIZ = new Map();
function hizSinir(anahtar, adet, sure, simdi) {
  const h = HIZ.get(anahtar); if (!h || simdi - h.t > sure) { HIZ.set(anahtar, { t: simdi, n: 1 }); if (HIZ.size > 5000) HIZ.clear(); return true; }
  return ++h.n <= adet;
}
async function denemeVar(O, anahtarlar, sinir = 8) {
  const st = O.depo(), simdi = O.simdi();
  for (const k of anahtarlar) { const d = await st.get('deneme/' + k, { type: 'json' }); if (d && simdi - d.t < 15 * 60e3 && d.n >= sinir) return false; }
  return true;
}
async function denemeYaz(O, anahtarlar) {
  const st = O.depo(), simdi = O.simdi();
  for (const k of anahtarlar) { let d = await st.get('deneme/' + k, { type: 'json' }); if (!d || simdi - d.t > 15 * 60e3) d = { t: simdi, n: 0 }; d.n++; await st.setJSON('deneme/' + k, d); }
}
const ipAnahtar = async (O, ip) => 'ip/' + (await sha(O, 'ip:' + (ip || '?'))).slice(0, 16);

// ---------------------------------------------------------------- depo
const salonAl = async (O, slug) => (C.SLUG_RE.test(slug || '') ? O.depo().get('salon/' + slug, { type: 'json' }) : null);
async function dugunAl(O, kod) {
  if (!C.KOD_RE.test(kod || '')) return null;
  const d = await O.depo().get('dugun/' + kod, { type: 'json' });
  return d ? C.belgeDuzelt(d) : null;
}
async function dugunYaz(O, d) {
  const st = O.depo();
  d.guncelleme = O.simdi();
  const oz = C.ozetCikar(d), k = `idx/${d.salon}/${d.bilgi.tarih || 'tarihsiz'}/${d.kod}`;
  const h = JSON.stringify({ ...oz, guncelleme: 0 }), eskiK = d.idxK, degisti = d.idxH !== h || eskiK !== k;
  d.idxH = h; d.idxK = k;
  await st.setJSON('dugun/' + d.kod, d);
  if (degisti) { await st.setJSON(k, oz); if (eskiK && eskiK !== k) await st.delete(eskiK); }
}
async function idxListe(O, onek) {
  const st = O.depo(); const { blobs } = await st.list({ prefix: onek });
  const L = await Promise.all(blobs.map((b) => st.get(b.key, { type: 'json' })));
  return L.filter(Boolean).sort((a, b) => (a.tarih || '9').localeCompare(b.tarih || '9') || (a.saat || '').localeCompare(b.saat || ''));
}
async function sayacArtir(O, kod, tur) {
  const st = O.depo(), k = 'sayac/' + kod, s = (await st.get(k, { type: 'json' })) || {};
  s[tur] = (s[tur] || 0) + 1; s.t = O.simdi(); await st.setJSON(k, s);
}
async function pinYaz(O, kod, pin, pv) {
  const tuz = C.rastgele(16);
  await O.depo().setJSON('pin/' + kod, { tuz, hash: await pbkdf(O, pin, tuz), pv, sifreli: await sifrele(O, pin) });
}
async function pinAcik(O, kod) { const p = await O.depo().get('pin/' + kod, { type: 'json' }); return p?.sifreli ? coz(O, p.sifreli) : ''; }

/** LCV yanıtları ayrı kayıtlarda bekler (anahtar: lcv/<kod>/<id>/<zaman>); çift/salon belgeyi açınca yalnızca yeni olanlar okunup belgeye işlenir */
async function lcvBirlestir(O, d) {
  const st = O.depo(); const { blobs } = await st.list({ prefix: `lcv/${d.kod}/` }); if (!blobs.length) return false;
  d.lcvAlinan = d.lcvAlinan && typeof d.lcvAlinan === 'object' ? d.lcvAlinan : {};
  const yeniler = blobs.map((b) => { const p = b.key.split('/'); return { key: b.key, id: p[2], t: +p[3] || 0 }; }).filter((x) => x.id && (d.lcvAlinan[x.id] || 0) < x.t);
  if (!yeniler.length) return false;
  const K = (await Promise.all(yeniler.map((b) => st.get(b.key, { type: 'json' })))).filter(Boolean).sort((a, b) => a.t - b.t);
  let degisti = false;
  for (const k of K) {
    if ((d.lcvAlinan[k.id] || 0) >= k.t) continue;
    d.lcvAlinan[k.id] = k.t; degisti = true;
    const lcv = { id: k.id, t: k.t, ad: k.ad, kisi: k.kisi, durum: k.durum, not: k.not };
    const x = d.davetliler.find((z) => z.lcv?.id === k.id) || (k.eslesen && d.davetliler.find((z) => z.id === k.eslesen));
    if (x) Object.assign(x, C.temizDavetli({ ...x, durum: k.durum, kisi: k.durum === 'geliyor' ? k.kisi : x.kisi, lcv, yeni: true, tel: x.tel || k.tel }, x));
    else if (d.davetliler.length < 2500) d.davetliler.push(C.temizDavetli({ id: 'l' + k.id.slice(1), ad: k.ad, kisi: k.kisi || 1, durum: k.durum, taraf: 'ortak', tel: k.tel, lcv, yeni: true, eklenme: k.t }));
  }
  const ids = Object.keys(d.lcvAlinan); if (ids.length > 3000) for (const i of ids.slice(0, ids.length - 3000)) delete d.lcvAlinan[i];
  return degisti;
}

// ---------------------------------------------------------------- salon
function temizSalon(slug, x, eski) {
  const t = x.tema || {}, i = x.iletisim || {};
  const url = (v) => { const s = C.str(v, 500); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''; };
  const ids = new Set();
  const alanlar = (Array.isArray(x.alanlar) ? x.alanlar : []).slice(0, 12).map((a, n) => {
    let id = C.idMi(a?.id); while (!id || ids.has(id)) id = 'a' + C.rastgele(5); ids.add(id);
    return { id, ad: C.str(a?.ad, 60) || `Salon ${n + 1}`, plan: C.temizPlan(a?.plan) };
  });
  return {
    slug, ad: C.str(x.ad, 80) || slug, aktif: x.aktif !== false,
    tema: { stil: STIL_K.includes(t.stil) ? t.stil : ESKI_STIL[t.stil] || 'acik', vurgu: RENK_RE.test(t.vurgu || '') ? t.vurgu.toLowerCase() : '', logo: eski?.tema?.logo || '', kapak: eski?.tema?.kapak || '', logoZemin: ['yok', 'acik', 'koyu'].includes(t.logoZemin) ? t.logoZemin : 'yok', kisaAd: C.str(t.kisaAd, 40), slogan: C.str(t.slogan, 90) },
    iletisim: { adres: C.str(i.adres, 200), telefon: C.str(i.telefon, 30), harita: url(i.harita), instagram: C.str(i.instagram, 60).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30), web: url(i.web) },
    alanlar, giris: eski?.giris || null, kisi: C.str(x.kisi, 80), notlar: C.metin(x.notlar, 4000),
    odeme: { tutar: C.sayi(x.odeme?.tutar, 0, 1e7, 0), gun: C.tamSayi(x.odeme?.gun, 1, 28, 1), baslangic: C.tarihMi(x.odeme?.baslangic), periyot: x.odeme?.periyot === 'yok' ? 'yok' : 'aylik' },
    odemeler: (Array.isArray(x.odemeler) ? x.odemeler : []).slice(0, 600).map((p) => ({ id: C.idMi(p?.id) || C.rastgele(8), tarih: C.tarihMi(p?.tarih), donem: /^\d{4}-\d{2}$/.test(p?.donem || '') ? p.donem : '', tutar: C.sayi(p?.tutar, 0, 1e7, 0), not: C.str(p?.not, 200) })),
    olusturma: eski?.olusturma || Date.now(), guncelleme: Date.now(),
  };
}
async function salonGenel(O, s, tam = false) {
  const g = {
    slug: s.slug, ad: s.ad, aktif: s.aktif !== false,
    tema: { ...s.tema, logo: s.tema?.logo ? await O.gorselUrl(s.slug, 'logo', s.tema.logo) : '', kapak: s.tema?.kapak ? await O.gorselUrl(s.slug, 'kapak', s.tema.kapak) : '' },
    iletisim: s.iletisim || {}, giris: !!s.giris,
    alanlar: (s.alanlar || []).map((a) => (tam ? { id: a.id, ad: a.ad, plan: a.plan } : { id: a.id, ad: a.ad })),
  };
  return g;
}
const salonYonetici = (s) => ({ ...s, giris: !!s.giris });

// ---------------------------------------------------------------- kimlik
async function kimlik(I, O) {
  const t = (I.baslik('authorization') || '').replace(/^Bearer\s+/i, '').trim(); if (!t) return null;
  const p = await tokenCoz(O, t);
  if (p?.r === 'c' && C.KOD_RE.test(p.k || '')) { const pin = await O.depo().get('pin/' + p.k, { type: 'json' }); return pin && (pin.pv || 0) === p.pv ? { rol: 'cift', kod: p.k } : null; }
  if (p?.r === 's') { const s = await salonAl(O, p.s); return s && s.giris && (s.giris.pv || 0) === p.pv && s.aktif !== false ? { rol: 'salon', salon: p.s } : null; }
  if (!p && O.adminDogrula && (await O.adminDogrula(t))) return { rol: 'yonetici' };
  return null;
}
const yetkili = (k, d) => !!k && (k.rol === 'yonetici' || (k.rol === 'salon' && k.salon === d.salon) || (k.rol === 'cift' && k.kod === d.kod));
const OTURUM = 'Oturumun süresi doldu, lütfen yeniden giriş yapın.';

// ---------------------------------------------------------------- yönlendirme
export async function isle(I, O) {
  const y = String(I.yol || '').split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  const m = I.yontem, b = I.govde && typeof I.govde === 'object' ? I.govde : {}, st = O.depo(), simdi = O.simdi();
  try {
    // ---- herkese açık
    if (m === 'GET' && y[0] === 'gorsel' && y.length === 3) {
      const v = await st.get(`gorsel/${y[1]}/${y[2]}`);
      const r = typeof v === 'string' && /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v);
      if (!r) return hata('yok', 404);
      return { durum: 200, ham: b64Coz(r[2]), basliklar: { 'content-type': r[1], 'cache-control': 'public, max-age=31536000, immutable' } };
    }
    if (y[0] === 'salon' && y[1] && y.length === 2 && m === 'GET') {
      const s = await salonAl(O, y[1].toLowerCase());
      if (!s || s.aktif === false) return yanit({ yok: true }, 404, CDN(60, 600));
      const bugun = C.trBugun(simdi), saat = new Date(simdi + C.TR_OFSET).getUTCHours();
      const L = [...(saat < 6 ? await idxListe(O, `idx/${s.slug}/${C.gunEkle(bugun, -1)}/`) : []), ...(await idxListe(O, `idx/${s.slug}/${bugun}/`))];
      return yanit({ salon: await salonGenel(O, s), bugun: L.map((x) => ({ kod: x.kod, gelin: x.gelin, damat: x.damat, saat: x.saat, tur: x.tur, alanAd: x.alanAd, tarih: x.tarih })) }, 200, CDN(60, 300));
    }
    if (y[0] === 'salon' && y[1] && y[2] === 'giris' && m === 'POST') {
      const s = await salonAl(O, y[1].toLowerCase());
      if (!s || s.aktif === false || !s.giris) return hata('Bu salon için giriş açık değil.', 404);
      const ipk = await ipAnahtar(O, I.ip), anahtarlar = ['s/' + s.slug, ipk];
      if (!(await denemeVar(O, anahtarlar, 10))) return hata('Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.', 429);
      if (!esit(await pbkdf(O, b.sifre ?? '', s.giris.tuz), s.giris.hash)) { await denemeYaz(O, anahtarlar); return hata('Şifre hatalı.', 401); }
      return yanit({ token: await imzala(O, { r: 's', s: s.slug, pv: s.giris.pv || 0, exp: simdi + 30 * GUN }) });
    }
    if (y[0] === 'd' && y[1]) {
      const kod = y[1].toLowerCase(), alt = y[2] || '';
      if (m === 'GET' && !alt) {
        const d = await dugunAl(O, kod); if (!d) return yanit({ yok: true }, 404, CDN(30, 120));
        const s = await salonAl(O, d.salon); if (!s || s.aktif === false) return yanit({ kapali: true }, 403, CDN(30, 120));
        const a = d.ayar;
        return yanit({ dugun: { kod: d.kod, bilgi: d.bilgi, alanAd: d.alanAd, plan: C.genelPlan(d), ayar: { mesaj: a.mesaj, komsu: a.komsu, lcvMod: a.lcvMod, lcvSon: a.lcvSon, telSor: a.telSor }, lcvAcik: C.lcvAcikMi(d, simdi), bulucuAcik: C.bulucuAcikMi(d, simdi) }, salon: await salonGenel(O, s) }, 200, CDN(20, 120));
      }
      if (m === 'GET' && alt === 'bulucu') {
        const d = await dugunAl(O, kod); if (!d) return hata('yok', 404);
        if (!C.bulucuAcikMi(d, simdi)) return yanit({ kapali: true }, 403, CDN(20, 60));
        return yanit({ liste: C.bulucuListe(d), plan: C.genelPlan(d) }, 200, CDN(20, 60));
      }
      if (m === 'POST' && alt === 'sayac') {
        if (!['ziyaret', 'bul'].includes(b.tur) || !hizSinir('s:' + I.ip, 60, 3600e3, simdi)) return yanit({ tamam: false });
        if (!(await st.get('dugun/' + kod))) return hata('yok', 404);
        await sayacArtir(O, kod, b.tur); return yanit({ tamam: true });
      }
      if (m === 'POST' && alt === 'lcv') {
        if (b.web) return yanit({ tamam: true });
        const d = await dugunAl(O, kod); if (!d) return hata('Bu davet bulunamadı.', 404);
        const s = await salonAl(O, d.salon); if (!s || s.aktif === false) return hata('Bu davet sayfası şu anda kapalı.', 403);
        if (!C.lcvAcikMi(d, simdi)) return hata('Bu davet için katılım bildirimi kapandı.', 403);
        if (!hizSinir('l:' + I.ip, 40, 3600e3, simdi)) return hata('Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.', 429);
        const ad = C.str(b.ad, 80); if (C.trNorm(ad).replace(/ /g, '').length < 3) return hata('Lütfen adınızı ve soyadınızı yazın.');
        const durum = b.durum === 'gelmiyor' ? 'gelmiyor' : 'geliyor', kisi = durum === 'geliyor' ? C.tamSayi(b.kisi, 1, 20, 1) : 0;
        let id = C.idMi(b.id), eski = null, eskiK = [];
        if (id) { eskiK = (await st.list({ prefix: `lcv/${kod}/${id}/` })).blobs.map((x) => x.key).sort(); eski = eskiK.length ? await st.get(eskiK[eskiK.length - 1], { type: 'json' }) : null; if (!eski || !esit(eski.anahtar, await sha(O, b.anahtar || ''))) { id = ''; eski = null; eskiK = []; } }
        const es = eski?.eslesen ? { id: eski.eslesen } : C.lcvEsle(d, ad);
        if (!eski && d.ayar.lcvMod === 'liste' && !es) return hata('Adınızı davetli listesinde bulamadık. Davetiyede yazan adla tekrar deneyin.', 404);
        let anahtar = '';
        if (!eski) { const { blobs } = await st.list({ prefix: `lcv/${kod}/` }); if (blobs.length >= 1500) return hata('Bu davet için çok fazla yanıt geldi.', 429); id = 'l' + C.rastgele(9); anahtar = C.rastgele(20); }
        const yeniK = `lcv/${kod}/${id}/${simdi}`;
        await st.setJSON(yeniK, { id, anahtar: eski ? eski.anahtar : await sha(O, anahtar), ad, kisi, durum, not: C.metin(b.not, 400), tel: C.str(b.tel, 24), t: simdi, eslesen: es?.id || null });
        for (const k of eskiK) if (k !== yeniK) await st.delete(k);
        await sayacArtir(O, kod, 'lcv');
        return yanit({ tamam: true, id, anahtar: anahtar || b.anahtar, durum, kisi });
      }
      if (m === 'POST' && alt === 'giris') {
        const d = await dugunAl(O, kod); if (!d) return hata('Bu düğün kodu bulunamadı. Kodu kontrol edin.', 404);
        const s = await salonAl(O, d.salon); if (!s || s.aktif === false) return hata('Bu salonun Düğün Planla hesabı şu anda kapalı.', 403);
        const ipk = await ipAnahtar(O, I.ip), anahtarlar = ['k/' + kod, ipk];
        if (!(await denemeVar(O, anahtarlar))) return hata('Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.', 429);
        const p = await st.get('pin/' + kod, { type: 'json' }), pin = String(b.pin ?? '').replace(/\D/g, '');
        if (!p || pin.length !== 6 || !esit(await pbkdf(O, pin, p.tuz), p.hash)) { await denemeYaz(O, anahtarlar); return hata('PIN hatalı. Salonunuzdan aldığınız 6 haneli PIN’i girin.', 401); }
        return yanit({ token: await imzala(O, { r: 'c', k: kod, pv: p.pv || 0, exp: simdi + 180 * GUN }) });
      }
      // ---- giriş isteyenler
      const k = await kimlik(I, O);
      const d = await dugunAl(O, kod); if (!d) return hata('Bu düğün bulunamadı.', 404);
      if (!yetkili(k, d)) return hata(OTURUM, 401);
      const s = await salonAl(O, d.salon);
      if (k.rol !== 'yonetici' && (!s || s.aktif === false)) return hata('Bu salonun Düğün Planla hesabı şu anda kapalı.', 403);
      if (m === 'GET' && alt === 'tam') {
        if (await lcvBirlestir(O, d)) { d.rev = (parseInt(d.rev, 10) + 1 || 2) + '-' + C.rastgele(5); await dugunYaz(O, d); }
        if (I.sorgu?.get('rev') && I.sorgu.get('rev') === d.rev) return yanit({ ayni: true, rev: d.rev });
        return yanit({ dugun: d, rol: k.rol, salon: s ? await salonGenel(O, s) : null, ...(k.rol !== 'cift' ? { pin: await pinAcik(O, kod) } : {}) });
      }
      if (m === 'POST' && alt === 'islem') {
        const ops = Array.isArray(b.ops) ? b.ops : [];
        if (ops.length > 3000 || JSON.stringify(ops).length > 2.5e6) return hata('Tek seferde çok fazla değişiklik gönderildi.', 413);
        await lcvBirlestir(O, d);
        const onceki = d.rev, bid = C.idMi(b.bid);
        if (bid && d.son.includes(bid)) return yanit({ rev: d.rev, ...(b.rev !== d.rev ? { dugun: d } : {}) });
        C.uygula(d, ops, k.rol === 'cift' ? 'cift' : 'yonetici');
        d.rev = (parseInt(d.rev, 10) + 1 || 2) + '-' + C.rastgele(5);
        if (bid) d.son = [...d.son, bid].slice(-200);
        if (JSON.stringify(d).length > 4.5e6) return hata('Düğün kaydı çok büyüdü; bazı notları kısaltın.', 413);
        await dugunYaz(O, d);
        return yanit({ rev: d.rev, ...(b.rev !== onceki ? { dugun: d } : {}) });
      }
      if (m === 'POST' && alt === 'pin') {
        const p = (await st.get('pin/' + kod, { type: 'json' })) || { pv: 0 };
        if (k.rol === 'cift') {
          const yeni = String(b.yeni ?? '').replace(/\D/g, '');
          if (yeni.length !== 6) return hata('Yeni PIN 6 haneli bir sayı olmalı.');
          if (!esit(await pbkdf(O, String(b.eski ?? '').replace(/\D/g, ''), p.tuz || 'x'), p.hash)) return hata('Mevcut PIN hatalı.');
          await pinYaz(O, kod, yeni, (p.pv || 0) + 1);
          return yanit({ token: await imzala(O, { r: 'c', k: kod, pv: (p.pv || 0) + 1, exp: simdi + 180 * GUN }) });
        }
        const pin = pinUret(O); await pinYaz(O, kod, pin, (p.pv || 0) + 1);
        return yanit({ pin });
      }
      if (k.rol === 'cift') return hata('Bu işlem için yetkiniz yok.', 403);
      if (m === 'PUT' && alt === 'meta') {
        d.bilgi = C.temizBilgi(b.bilgi || {}, 'yonetici', d.bilgi);
        if (b.alan || b.planYenile) {
          const a = s?.alanlar?.find((x) => x.id === (b.alan || d.alan)); if (!a) return hata('Salon alanı bulunamadı.');
          d.alan = a.id; d.alanAd = a.ad; C.uygula(d, [{ t: 'plan', v: a.plan }], 'yonetici');
        }
        d.rev = (parseInt(d.rev, 10) + 1 || 2) + '-' + C.rastgele(5);
        await dugunYaz(O, d);
        return yanit({ dugun: d });
      }
      if (m === 'DELETE' && !alt) {
        const { blobs } = await st.list({ prefix: `lcv/${kod}/` });
        for (const x of blobs) await st.delete(x.key);
        for (const key of ['dugun/' + kod, 'pin/' + kod, 'sayac/' + kod, d.idxK].filter(Boolean)) await st.delete(key);
        return yanit({ tamam: true });
      }
      return hata('Bulunamadı', 404);
    }
    // ---- salon ve yönetici
    const k = await kimlik(I, O);
    if (!k || k.rol === 'cift') return hata(OTURUM, 401);
    if (m === 'GET' && y[0] === 'salon' && y[2] === 'tam') {
      const s = await salonAl(O, y[1]); if (!s) return hata('Salon bulunamadı.', 404);
      if (k.rol === 'salon' && k.salon !== s.slug) return hata(OTURUM, 401);
      const dugunler = await idxListe(O, `idx/${s.slug}/`);
      return yanit({ salon: k.rol === 'yonetici' ? { ...salonYonetici(s), tema: (await salonGenel(O, s)).tema, temaHam: s.tema } : await salonGenel(O, s, true), dugunler, rol: k.rol });
    }
    if (m === 'POST' && y[0] === 'dugun' && !y[1]) {
      const s = await salonAl(O, b.salon); if (!s) return hata('Salon bulunamadı.', 404);
      if (k.rol === 'salon' && k.salon !== s.slug) return hata(OTURUM, 401);
      const a = s.alanlar.find((x) => x.id === b.alan) || s.alanlar[0];
      if (!a) return hata('Önce bu salon için bir salon planı (alan) ekleyin.');
      if (!C.tarihMi(b.bilgi?.tarih)) return hata('Düğün tarihini seçin.');
      let kod = C.KOD_RE.test(b.kod || '') && (O.demo || !/-ornek$/.test(b.kod)) ? b.kod : '';
      if (kod && (await st.get('dugun/' + kod))) return hata('Bu düğün kodu kullanılıyor, başka bir kod yazın.');
      for (let i = 0; !kod && i < 8; i++) { const x = C.kodUret(b.bilgi); if (!(await st.get('dugun/' + x))) kod = x; }
      const d = C.yeniDugun({ kod, salon: s.slug, alan: a, bilgi: b.bilgi, simdi });
      const pin = pinUret(O); await pinYaz(O, kod, pin, 0);
      await dugunYaz(O, d);
      return yanit({ kod, pin, ozet: C.ozetCikar(d) });
    }
    if (k.rol !== 'yonetici') return hata('Bu işlem için yetkiniz yok.', 403);
    if (m === 'GET' && y[0] === 'yonetim') {
      const { blobs } = await st.list({ prefix: 'salon/' });
      const S = (await Promise.all(blobs.map((x) => st.get(x.key, { type: 'json' })))).filter(Boolean);
      const salonlar = await Promise.all(S.map(async (s) => ({ ...salonYonetici(s), tema: (await salonGenel(O, s)).tema, temaHam: s.tema })));
      return yanit({ salonlar: salonlar.sort((a, b) => a.ad.localeCompare(b.ad, 'tr')), dugunler: await idxListe(O, 'idx/') });
    }
    if (m === 'GET' && y[0] === 'istat') {
      const L = await idxListe(O, 'idx/');
      const S = await Promise.all(L.map((x) => st.get('sayac/' + x.kod, { type: 'json' })));
      return yanit({ dugunler: L.map((x, i) => ({ ...x, sayac: S[i] || {} })) });
    }
    if (y[0] === 'salon' && y[1] && !y[2]) {
      const slug = y[1].toLowerCase(); if (!C.SLUG_RE.test(slug)) return hata('Salon adresi sadece küçük harf, rakam ve tire içerebilir.');
      if (slug === 'ornek-salon' && !O.demo && m === 'PUT' && b.yeni) return hata('Bu adres ayrılmış, başka bir adres seçin.');
      const eski = await salonAl(O, slug);
      if (m === 'PUT') {
        if (b.yeni && eski) return hata('Bu adres başka bir salonda kullanılıyor, başka bir adres seçin.');
        const s = temizSalon(slug, b, eski); await st.setJSON('salon/' + slug, s);
        return yanit({ salon: { ...salonYonetici(s), tema: (await salonGenel(O, s)).tema, temaHam: s.tema } });
      }
      if (m === 'DELETE') {
        if (!eski) return yanit({ tamam: true });
        const L = await idxListe(O, `idx/${slug}/`);
        if (L.length && I.sorgu?.get('hepsi') !== '1') return hata(`Bu salonda ${L.length} düğün kaydı var. Önce düğünleri silin.`);
        for (const x of L) { const { blobs } = await st.list({ prefix: `lcv/${x.kod}/` }); for (const z of blobs) await st.delete(z.key); for (const key of ['dugun/' + x.kod, 'pin/' + x.kod, 'sayac/' + x.kod, `idx/${slug}/${x.tarih || 'tarihsiz'}/${x.kod}`]) await st.delete(key); }
        for (const key of ['salon/' + slug, `gorsel/${slug}/logo`, `gorsel/${slug}/kapak`]) await st.delete(key);
        return yanit({ tamam: true });
      }
    }
    if (m === 'POST' && y[0] === 'salon' && y[2] === 'sifre') {
      const s = await salonAl(O, y[1]); if (!s) return hata('Salon bulunamadı.', 404);
      if (b.sifre == null || b.sifre === '') s.giris = null;
      else { const sf = String(b.sifre); if (sf.length < 6) return hata('Salon şifresi en az 6 karakter olmalı.'); const tuz = C.rastgele(16); s.giris = { tuz, hash: await pbkdf(O, sf, tuz), pv: (s.giris?.pv || 0) + 1 }; }
      await st.setJSON('salon/' + s.slug, s); return yanit({ giris: !!s.giris });
    }
    if (m === 'PUT' && y[0] === 'gorsel' && y.length === 3 && ['logo', 'kapak'].includes(y[2])) {
      const s = await salonAl(O, y[1]); if (!s) return hata('Önce salonu kaydedin.', 404);
      const v = typeof b.veri === 'string' ? b.veri : '';
      if (v && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || v.length > 1.4e6)) return hata('Görsel geçersiz ya da çok büyük.');
      const key = `gorsel/${s.slug}/${y[2]}`;
      if (v) { await st.set(key, v); s.tema[y[2]] = (await sha(O, v)).slice(0, 10); } else { await st.delete(key); s.tema[y[2]] = ''; }
      await st.setJSON('salon/' + s.slug, s);
      return yanit({ salon: { ...salonYonetici(s), tema: (await salonGenel(O, s)).tema, temaHam: s.tema } });
    }
    return hata('Bulunamadı', 404);
  } catch (e) {
    return hata('Sunucu hatası: ' + (e?.message || e), 500);
  }
}
/** Yalnızca tarayıcı demosu: bilinen bir PIN atar */
export async function demoPin(O, kod, pin) { await pinYaz(O, kod, pin, 0); }
