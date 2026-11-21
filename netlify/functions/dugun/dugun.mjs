// Düğün Planla — arka uç (Netlify Functions + Netlify Blobs "dugun" deposu, ücretsiz plan).
// Asıl mantık sunucu.mjs ve cekirdek.mjs içindedir; ikisi de derlemede /dugun/js/ kaynağından buraya kopyalanır (tarayıcı demosu aynı kodu kullanır).
import { getStore } from '@netlify/blobs';
import crypto, { webcrypto } from 'node:crypto';
import { kriptoKur } from './cekirdek.mjs';
import { isle } from './sunucu.mjs';

kriptoKur(webcrypto);
// Yönetici girişi Okut ve Oyna paneliyle ortaktır: aynı "yonetim" deposundaki anahtar ve şifre sürümüyle doğrulanır.
async function adminDogrula(t) {
  const [b, s] = String(t || '').split('.'); if (!b || !s) return false;
  const st = getStore({ name: 'yonetim', consistency: 'strong' });
  const g = await st.get('gizli', { type: 'json' }); if (!g?.k) return false;
  const x = Buffer.from(crypto.createHmac('sha256', g.k).update(b).digest('base64url')), y = Buffer.from(s);
  if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) return false;
  let p; try { p = JSON.parse(Buffer.from(b, 'base64url').toString()); } catch { return false; }
  if (!p || !(p.exp > Date.now())) return false;
  const sb = (await st.get('sifre', { type: 'json' })) || { pv: 0 };
  return p.pv === sb.pv;
}
const O = {
  depo: () => getStore({ name: 'dugun', consistency: 'strong' }),
  kripto: webcrypto, simdi: () => Date.now(), adminDogrula,
  gorselUrl: async (slug, tur, v) => `/dugun-api/gorsel/${encodeURIComponent(slug)}/${tur}?v=${encodeURIComponent(v)}`,
};
const JSON_H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
export default async (req, context) => {
  const url = new URL(req.url);
  let govde = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const t = await req.text();
    if (t.length > 3e6) return new Response(JSON.stringify({ hata: 'İstek çok büyük.' }), { status: 413, headers: JSON_H });
    try { govde = t ? JSON.parse(t) : null; } catch { return new Response(JSON.stringify({ hata: 'Geçersiz istek.' }), { status: 400, headers: JSON_H }); }
  }
  const r = await isle({ yontem: req.method, yol: url.pathname.replace(/^\/dugun-api\/?/, ''), sorgu: url.searchParams, baslik: (k) => req.headers.get(k), govde, ip: context?.ip || req.headers.get('x-nf-client-connection-ip') || '' }, O);
  if (r.ham) return new Response(r.ham, { status: r.durum, headers: { 'cache-control': 'no-store', ...r.basliklar } });
  return new Response(JSON.stringify(r.veri), { status: r.durum, headers: { ...JSON_H, ...r.basliklar } });
};
export const config = { path: '/dugun-api/*' };
