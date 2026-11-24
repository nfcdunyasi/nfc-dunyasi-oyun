// Randevu Vaktim — arka uç erişimi. Gerçek sitede /randevu-api (Netlify fonksiyonu);
// önizlemede aynı sunucu kodu tarayıcıda, localStorage deposuyla çalışır (koşullu yazma dahil).

export const ONIZLEME = !!window.RV_ONIZLEME;
const DEMO = ONIZLEME;
const BELLEK = new Map();
const on = () => (DEMO ? 'rvd:' : '');
export const yerel = {
  al(k) { try { return localStorage.getItem(on() + k) || ''; } catch { return BELLEK.get(on() + k) || ''; } },
  koy(k, v) { try { localStorage.setItem(on() + k, v); } catch { BELLEK.set(on() + k, v); } },
  sil(k) { try { localStorage.removeItem(on() + k); } catch { BELLEK.delete(on() + k); } },
  json(k, d = null) { try { return JSON.parse(this.al(k)) ?? d; } catch { return d; } },
};
export const TK = { personel: 'rv-personel', yonetici: 'yonetim-token', yoneticiP: 'rv-yonetici-panel' };

// ---------------------------------------------------------------- önizleme deposu
class DemoDepo {
  constructor(anahtar) {
    this.k = anahtar; this.m = new Map(); this.e = 0;
    try { const s = localStorage.getItem(anahtar); if (s) this.m = new Map(JSON.parse(s)); } catch { /* bellek */ }
    this.zaman = null;
  }
  yaz() { clearTimeout(this.zaman); this.zaman = setTimeout(() => { try { localStorage.setItem(this.k, JSON.stringify([...this.m])); } catch { /* sığmadı */ } }, 250); }
  async get(k, o = {}) { const x = this.m.get(k); if (x == null) return null; return o.type === 'json' ? JSON.parse(x[0]) : x[0]; }
  async getWithMetadata(k, o = {}) { const x = this.m.get(k); if (x == null) return null; return { data: o.type === 'json' ? JSON.parse(x[0]) : x[0], etag: 'e' + x[1] }; }
  async setJSON(k, v, o) { return this.set(k, JSON.stringify(v), o); }
  async set(k, v, o = {}) {
    const x = this.m.get(k);
    if (o.onlyIfNew && x) return { modified: false };
    if (o.onlyIfMatch && (!x || 'e' + x[1] !== o.onlyIfMatch)) return { modified: false };
    this.m.set(k, [String(v), ++this.e + Date.now()]); this.yaz(); return { modified: true };
  }
  async delete(k) { this.m.delete(k); this.yaz(); }
  async list({ prefix = '' } = {}) { return { blobs: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }
}
let demoO = null;
function demoKur() {
  if (demoO) return demoO;
  const depo = new DemoDepo('rv-demo-4');
  demoO = { demo: true, depo: () => depo, kripto: crypto, simdi: () => Date.now(), adminDogrula: async (t) => t === 'demo-yonetici', gorselUrl: async (slug, ad) => (await depo.get(`gorsel/${slug}/${ad}`)) || '' };
  return demoO;
}
export function demoSifirla() { try { localStorage.removeItem('rv-demo-4'); for (const k of Object.keys(localStorage)) if (k.startsWith('rvd:')) localStorage.removeItem(k); } catch { /* */ } location.reload(); }

// ---------------------------------------------------------------- istek
export async function istek(yontem, yol, govde = null, token = '') {
  if (DEMO) {
    // sunucu kodu yalnız önizlemede indirilir; gerçek sitede tarayıcıya gelmez
    const { isle } = await import('./sunucu.js?v=2026-11-24-b');
    const [p, q] = yol.split('?');
    const r = await isle({ yontem, yol: p, sorgu: new URLSearchParams(q || ''), baslik: (k) => (k === 'authorization' && token ? 'Bearer ' + token : null), govde: govde ? JSON.parse(JSON.stringify(govde)) : null, ip: 'onizleme' }, demoKur());
    await new Promise((ok) => setTimeout(ok, 90));
    const v = r.veri === undefined ? null : JSON.parse(JSON.stringify(r.veri));
    if (r.durum >= 400) { const e = new Error(v?.hata || 'Bir sorun oluştu.'); e.durum = r.durum; e.veri = v; throw e; }
    return v;
  }
  let r;
  try {
    r = await fetch('/randevu-api/' + yol, { method: yontem, headers: { ...(govde ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: govde ? JSON.stringify(govde) : undefined, cache: 'no-store' });
  } catch { const e = new Error('İnternet bağlantısı yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.'); e.durum = 0; throw e; }
  let v = null; try { v = await r.json(); } catch { /* boş */ }
  if (!r.ok) { const e = new Error(v?.hata || `Sunucu yanıt vermedi (${r.status}).`); e.durum = r.status; e.veri = v; throw e; }
  return v;
}
const q = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

export const api = {
  demo: DEMO,
  // müşteri
  dizin: () => istek('GET', 'dizin'),
  isletme: (slug) => istek('GET', `i/${encodeURIComponent(slug)}`),
  takvim: (slug, p, bas, gun) => istek('GET', `i/${encodeURIComponent(slug)}/takvim?${q({ p, bas, gun })}`),
  randevuAl: (slug, v) => istek('POST', `i/${encodeURIComponent(slug)}/randevu`, v),
  durum: (kod) => istek('GET', `r/${kod}`),
  odedim: (kod) => istek('POST', `r/${kod}/odedim`, {}),
  musteriIptal: (kod, neden) => istek('POST', `r/${kod}/iptal`, { neden }),
  // personel
  giris: (kullanici, sifre) => istek('POST', 'giris', { kullanici, sifre }),
  panel: (t) => istek('GET', 'panel', null, t),
  gun: (t, p, bas, gun) => istek('GET', `panel/gun?${q({ p, bas, gun })}`, null, t),
  istat: (t, p, ay) => istek('GET', `panel/istat?${q({ p, ay })}`, null, t),
  ara: (t, aranan, p) => istek('GET', `panel/ara?${q({ q: aranan, p })}`, null, t),
  randevuEkle: (t, v) => istek('POST', 'panel/randevu', v, t),
  eylem: (t, id, eylem, v = {}) => istek('POST', `panel/randevu/${id}/${eylem}`, v, t),
  kapat: (t, v) => istek('POST', 'panel/kapat', v, t),
  kapatSil: (t, p, tarih, id) => istek('DELETE', `panel/kapat/${p}/${tarih}/${id}`, null, t),
  profil: (t, v) => istek('PUT', 'panel/profil', v, t),
  isletmeDuzenle: (t, v) => istek('PUT', 'panel/isletme', v, t),
  sifre: (t, eski, yeni) => istek('POST', 'panel/sifre', { eski, yeni }, t),
  // yönetici
  yonetim: (t) => istek('GET', 'yonetim', null, t),
  kazanc: (t, ay) => istek('GET', `yonetim/kazanc?${q({ ay })}`, null, t),
  isletmeYaz: (t, slug, v) => istek('PUT', `isletme/${slug}`, v, t),
  isletmeSil: (t, slug) => istek('DELETE', `isletme/${slug}`, null, t),
  hesap: (t, slug, v) => istek('POST', `isletme/${slug}/hesap`, v, t),
  oturum: (t, slug, p) => istek('POST', `isletme/${slug}/oturum`, { p }, t),
  yIstat: (t, slug, ay) => istek('GET', `isletme/${slug}/istat?${q({ ay })}`, null, t),
  yRandevular: (t, slug, bas, gun) => istek('GET', `isletme/${slug}/randevular?${q({ bas, gun })}`, null, t),
  /** Yönetici girişi Okut ve Oyna ile ortak (/api/giris). Önizlemede: admin / demo */
  async adminGiris(kullanici, sifre) {
    if (DEMO) { if (kullanici === 'admin' && sifre === 'demo') return 'demo-yonetici'; const e = new Error('Önizlemede yönetici: admin / demo'); e.durum = 401; throw e; }
    let r; try { r = await fetch('/api/giris', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kullanici, sifre }) }); } catch { throw new Error('İnternet bağlantısı yok gibi görünüyor.'); }
    const v = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(v.hata || 'Kullanıcı adı ya da şifre hatalı.'); e.durum = r.status; throw e; }
    return v.token;
  },
};
