// NFC Dünyası — Okut ve Oyna yönetici paneli arka ucu (Netlify Functions + Netlify Blobs, ücretsiz plan)
// Veriler Netlify Blobs'ta "yonetim" deposunda durur: işletmeler (tema, takip, ödemeler), soru düzenlemeleri, şifre.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const KULLANICI = 'admin';
// Varsayılan şifrenin özeti (şifrenin kendisi burada yazmaz). Panelden şifre değiştirilince bu kullanılmaz.
const VARSAYILAN = { salt: 'nfc-yonetim-2026', hash: '619e541893e202b7517c5423405f1ebad3ba17f5438792ad99328bfa6f3b6c1c', it: 150000, pv: 0 };
const GUN = 864e5;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const RGB_RE = /^\d{1,3} \d{1,3} \d{1,3}$/;
const VARS = ['gece', 'morarti', 'murekkep', 'ortu', 'limon', 'cay'];
const DURUMLAR = ['gorusme', 'tasarim', 'onay', 'qr', 'yayinda', 'durdu'];

const store = () => getStore({ name: 'yonetim', consistency: 'strong' });
const json = (d, st = 200, h = {}) => new Response(JSON.stringify(d), { status: st, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });
const hata = (m, st = 400) => json({ hata: m }, st);
const b64u = (b) => Buffer.from(b).toString('base64url');
const pbkdf = (s, salt, it) => crypto.pbkdf2Sync(String(s), salt, it, 32, 'sha256').toString('hex');
const esit = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function gizli(st) {
  let g = await st.get('gizli', { type: 'json' });
  if (!g?.k) { g = { k: crypto.randomBytes(32).toString('hex') }; await st.setJSON('gizli', g); }
  return g.k;
}
async function sifreBilgi(st) { return (await st.get('sifre', { type: 'json' })) || VARSAYILAN; }
function imzala(k, p) { const b = b64u(JSON.stringify(p)); return b + '.' + crypto.createHmac('sha256', k).update(b).digest('base64url'); }
async function yetki(req, st) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const [b, s] = t.split('.');
  if (!b || !s) return null;
  const k = await gizli(st);
  if (!esit(crypto.createHmac('sha256', k).update(b).digest('base64url'), s)) return null;
  let p; try { p = JSON.parse(Buffer.from(b, 'base64url').toString()); } catch { return null; }
  if (!p || p.exp < Date.now()) return null;
  if (p.pv !== (await sifreBilgi(st)).pv) return null;
  return p;
}

const str = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const sayi = (v, min, max, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
const tarih = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
function temizTema(t) {
  if (!t || typeof t !== 'object') return null;
  const vars = {};
  for (const k of VARS) { const v = str(t.vars?.[k], 11); if (!RGB_RE.test(v) || v.split(' ').some((x) => +x > 255)) throw new Error('Renk eksik: ' + k); vars[k] = v; }
  const logo = typeof t.logo === 'string' ? t.logo : '';
  if (logo && (!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logo) || logo.length > 900000)) throw new Error('Logo görseli geçersiz ya da çok büyük');
  const ig = str(t.links?.instagram, 60).replace(/^@/, '');
  const rv = str(t.links?.review, 1500);
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) throw new Error('Instagram kullanıcı adı geçersiz');
  if (rv && !/^https:\/\/[^\s"'<>]+$/.test(rv)) throw new Error('Google yorum linki https:// ile başlamalı');
  const deco = (Array.isArray(t.deco) ? t.deco : []).map((x) => str(x, 16)).filter(Boolean).slice(0, 8);
  return { name: str(t.name, 40), tagline: str(t.tagline, 60) || 'Okut ve Oyna', shape: t.shape === 'wide' ? 'wide' : undefined, logo, links: { instagram: ig, review: rv }, vars, deco };
}
function temizIsletme(slug, x, eski) {
  const o = {
    slug,
    ad: str(x.ad, 60),
    yerlesik: !!(eski?.yerlesik ?? x.yerlesik),
    aktif: x.aktif !== false,
    durum: DURUMLAR.includes(x.durum) ? x.durum : 'gorusme',
    notlar: str(x.notlar, 4000),
    kisi: str(x.kisi, 80), telefon: str(x.telefon, 30), adres: str(x.adres, 200),
    odeme: { tutar: sayi(x.odeme?.tutar, 0, 1e7), gun: Math.round(sayi(x.odeme?.gun, 1, 28, 1)), baslangic: tarih(x.odeme?.baslangic), periyot: x.odeme?.periyot === 'yok' ? 'yok' : 'aylik' },
    odemeler: (Array.isArray(x.odemeler) ? x.odemeler : []).slice(0, 600).map((p) => ({ id: str(p.id, 24) || crypto.randomBytes(6).toString('hex'), tarih: tarih(p.tarih), donem: /^\d{4}-\d{2}$/.test(p.donem || '') ? p.donem : '', tutar: sayi(p.tutar, 0, 1e7), not: str(p.not, 200) })),
    tema: x.tema ? temizTema(x.tema) : null,
    olusturma: eski?.olusturma || Date.now(),
    guncelleme: Date.now(),
  };
  if (!o.ad) o.ad = o.tema?.name || slug;
  if (o.tema && !o.tema.name) o.tema.name = o.ad;
  return o;
}

// ---- istatistik (oyun sunucusu gönderir, panel okur) ----
const GUN_RE = /^\d{4}-\d{2}-\d{2}$/;
const KAYNAK_RE = /^[a-z0-9_-]{1,40}$/;
const ALANLAR = ['z', 'zt', 'zy', 'oda', 'botOda', 'oyuncu', 'pms', 'rms', 'bayt', 'g', 'i'];
const n0 = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(n, 1e13) : 0; };
function istKat(hedef, y) { // y'yi hedefe ekle (temizleyerek)
  if (!y || typeof y !== 'object') return hedef;
  const x = hedef || { oyun: {}, saat: [] };
  for (const f of ALANLAR) if (y[f] != null) x[f] = (x[f] || 0) + n0(y[f]);
  for (const f of ['tepe', 'tepeOda']) if (y[f] != null) x[f] = Math.max(x[f] || 0, n0(y[f]));
  x.oyun ||= {}; x.saat ||= [];
  if (y.oyun && typeof y.oyun === 'object') for (const [k, v] of Object.entries(y.oyun).slice(0, 80)) if (/^[a-z0-9-]{1,40}$/.test(k)) x.oyun[k] = (x.oyun[k] || 0) + n0(v);
  if (Array.isArray(y.saat)) for (let i = 0; i < 24; i++) if (y.saat[i]) x.saat[i] = (x.saat[i] || 0) + n0(y.saat[i]);
  return x;
}
const MALIYET_VARSAYILAN = { aylikUsd: 0, dahilGb: 5, gbUsd: 0.15, kur: 50, plan: 'Free (ücretsiz)' };
function temizAyar(a) {
  const m = a?.maliyet || {};
  return { maliyet: { aylikUsd: sayi(m.aylikUsd, 0, 10000, 0), dahilGb: sayi(m.dahilGb, 0, 100000, 5), gbUsd: sayi(m.gbUsd, 0, 100, 0.15), kur: sayi(m.kur, 1, 100000, 50), plan: str(m.plan, 40) || 'Free (ücretsiz)' } };
}
async function ayarAl(st) { const a = await st.get('ayar', { type: 'json' }); return a ? temizAyar(a) : { maliyet: { ...MALIYET_VARSAYILAN } }; }

async function hepsi(st) {
  const { blobs } = await st.list({ prefix: 'isletme/' });
  const out = await Promise.all(blobs.map((b) => st.get(b.key, { type: 'json' })));
  return out.filter(Boolean);
}

export default async (req, context) => {
  const url = new URL(req.url);
  const yol = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '').split('/');
  const st = store();
  const m = req.method;
  try {
    // ---- herkese açık: oyun sayfası ve oyun sunucusu okur ----
    if (m === 'GET' && yol[0] === 'tema' && yol[1]) {
      const slug = decodeURIComponent(yol[1]).toLowerCase();
      if (!SLUG_RE.test(slug)) return hata('yok', 404);
      const x = await st.get('isletme/' + slug, { type: 'json' });
      const ch = { 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=600' };
      if (!x || (!x.tema && x.aktif !== false)) return json({ slug, yok: true }, 404, ch);
      return json({ slug, aktif: x.aktif !== false, tema: x.aktif !== false ? x.tema : null }, 200, ch);
    }
    if (m === 'GET' && yol[0] === 'sorular') {
      const s = (await st.get('sorular', { type: 'json' })) || {};
      return json({ banks: s });
    }
    if (m === 'POST' && yol[0] === 'istat') {
      const beklenen = process.env.ISTAT_ANAHTAR || '';
      if (!beklenen) return hata('istatistik anahtarı tanımlı değil', 503);
      if (!esit(req.headers.get('x-istat-anahtar') || '', beklenen)) return hata('yetkisiz', 401);
      const b = await req.json().catch(() => null);
      if (!b || typeof b.gun !== 'object') return hata('veri yok');
      const gunler = Object.keys(b.gun).filter((g) => GUN_RE.test(g)).slice(0, 4);
      for (const g of gunler) {
        const k = 'istat/' + g, eski = (await st.get(k, { type: 'json' })) || {};
        for (const [src, y] of Object.entries(b.gun[g] || {}).slice(0, 300)) {
          if (!KAYNAK_RE.test(src)) continue;
          eski[src] = istKat(eski[src], y);
        }
        await st.setJSON(k, eski);
      }
      const a = b.anlik && typeof b.anlik === 'object' ? { t: n0(b.anlik.t), oyuncu: n0(b.anlik.oyuncu), oda: n0(b.anlik.oda), kaynak: Object.fromEntries(Object.entries(b.anlik.kaynak || {}).filter(([k]) => KAYNAK_RE.test(k)).slice(0, 300).map(([k, v]) => [k, n0(v)])) } : null;
      await st.setJSON('istat-son', { t: Date.now(), surum: str(b.surum, 40), anlik: a });
      return json({ ok: true });
    }
    // ---- giriş ----
    if (m === 'POST' && yol[0] === 'giris') {
      const ip = crypto.createHash('sha256').update(String(context?.ip || req.headers.get('x-nf-client-connection-ip') || '?')).digest('hex').slice(0, 16);
      const dk = 'deneme/' + ip, d = (await st.get(dk, { type: 'json' })) || { n: 0, t: Date.now() };
      if (Date.now() - d.t > 15 * 60e3) { d.n = 0; d.t = Date.now(); }
      if (d.n >= 8) return hata('Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.', 429);
      const b = await req.json().catch(() => ({}));
      const sb = await sifreBilgi(st);
      const ok = str(b.kullanici, 40).toLowerCase() === KULLANICI && esit(pbkdf(b.sifre ?? '', sb.salt, sb.it), sb.hash);
      if (!ok) { d.n++; await st.setJSON(dk, d); return hata('Kullanıcı adı ya da şifre yanlış', 401); }
      await st.delete(dk);
      return json({ token: imzala(await gizli(st), { u: KULLANICI, exp: Date.now() + 30 * GUN, pv: sb.pv }) });
    }
    // ---- buradan sonrası giriş ister ----
    if (!(await yetki(req, st))) return hata('Oturum süresi doldu, tekrar giriş yap', 401);

    if (m === 'GET' && yol[0] === 'yonetim') {
      return json({ isletmeler: await hepsi(st), sorular: (await st.get('sorular', { type: 'json' })) || {}, ayar: await ayarAl(st) });
    }
    if (m === 'GET' && yol[0] === 'istat') {
      const bas = url.searchParams.get('bas') || '', son = url.searchParams.get('son') || '';
      if (!GUN_RE.test(bas) || !GUN_RE.test(son) || bas > son) return hata('tarih aralığı geçersiz');
      const { blobs } = await st.list({ prefix: 'istat/' });
      const keys = blobs.map((b) => b.key).filter((k) => { const g = k.slice(6); return g >= bas && g <= son; }).sort().slice(-400);
      const vals = await Promise.all(keys.map((k) => st.get(k, { type: 'json' })));
      const gunler = {}; keys.forEach((k, i) => { if (vals[i]) gunler[k.slice(6)] = vals[i]; });
      return json({ gunler, son: (await st.get('istat-son', { type: 'json' })) || null });
    }
    if (m === 'PUT' && yol[0] === 'ayar') {
      const b = await req.json().catch(() => ({}));
      const a = temizAyar(b);
      await st.setJSON('ayar', a);
      return json(a);
    }
    if (yol[0] === 'isletme' && yol[1]) {
      const slug = decodeURIComponent(yol[1]).toLowerCase();
      if (!SLUG_RE.test(slug)) return hata('QR kodu sadece küçük harf, rakam ve tire içerebilir');
      const k = 'isletme/' + slug, eski = await st.get(k, { type: 'json' });
      if (m === 'DELETE') { await st.delete(k); return json({ ok: true }); }
      if (m === 'PUT') {
        const b = await req.json();
        if (b.yeni && eski) return hata('Bu QR kodu başka bir işletmede kullanılıyor, başka bir kod seç');
        let o; try { o = temizIsletme(slug, b, eski); } catch (e) { return hata(e.message); }
        await st.setJSON(k, o);
        return json(o);
      }
    }
    if (m === 'PUT' && yol[0] === 'sorular') {
      const b = await req.json();
      const id = str(b.id, 80);
      if (!/^[a-z-]+\/[A-Z_]+$/.test(id)) return hata('banka geçersiz');
      const s = (await st.get('sorular', { type: 'json' })) || {};
      const hide = (Array.isArray(b.hide) ? b.hide : []).map((x) => str(x, 16)).filter(Boolean).slice(0, 5000);
      const add = (Array.isArray(b.add) ? b.add : []).slice(0, 2000);
      if (JSON.stringify(add).length > 400000) return hata('Çok fazla eklenen soru var');
      if (!hide.length && !add.length) delete s[id]; else s[id] = { hide, add, t: Date.now() };
      await st.setJSON('sorular', s);
      return json({ ok: true, [id]: s[id] || null });
    }
    if (m === 'POST' && yol[0] === 'sifre') {
      const b = await req.json();
      const sb = await sifreBilgi(st);
      if (!esit(pbkdf(b.eski ?? '', sb.salt, sb.it), sb.hash)) return hata('Mevcut şifre yanlış');
      const y = String(b.yeni ?? '');
      if (y.length < 8) return hata('Yeni şifre en az 8 karakter olmalı');
      const salt = crypto.randomBytes(16).toString('hex'), it = 150000, pv = (sb.pv || 0) + 1;
      await st.setJSON('sifre', { salt, it, hash: pbkdf(y, salt, it), pv });
      return json({ token: imzala(await gizli(st), { u: KULLANICI, exp: Date.now() + 30 * GUN, pv }) });
    }
    return hata('Bulunamadı', 404);
  } catch (e) {
    return hata('Sunucu hatası: ' + (e?.message || e), 500);
  }
};

export const config = { path: '/api/*' };
