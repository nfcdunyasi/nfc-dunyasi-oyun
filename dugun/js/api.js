// Düğün Planla — arka uç erişimi. Gerçek sitede /dugun-api (Netlify fonksiyonu); demoda aynı sunucu kodu tarayıcıda, bellek deposuyla çalışır.
import * as C from './cekirdek.js?v=2026-11-21-f';
import { isle, demoPin } from './sunucu.js?v=2026-11-21-f';
import { davetliUret, DEMO_SALON, demoAlanlar } from './demo.js?v=2026-11-21-f';
import { bekle, gecikmeli } from './ui.js?v=2026-11-21-f';

let DEMO = false;
const BELLEK = new Map();
const on = () => (DEMO ? 'dpd:' : '');
export const depoYerel = {
  al(k) { try { return localStorage.getItem(on() + k) || ''; } catch { return BELLEK.get(on() + k) || ''; } },
  koy(k, v) { try { localStorage.setItem(on() + k, v); } catch { BELLEK.set(on() + k, v); } },
  sil(k) { try { localStorage.removeItem(on() + k); } catch { BELLEK.delete(on() + k); } },
};
export const TK = { yonetici: 'yonetim-token', salon: (s) => 'dp:s:' + s, cift: (k) => 'dp:c:' + k };

// ---------------------------------------------------------------- demo deposu ve sunucusu
class DemoDepo {
  constructor(anahtar) { this.k = anahtar; this.m = new Map(); try { const s = localStorage.getItem(anahtar); if (s) this.m = new Map(JSON.parse(s)); } catch { /* bellek */ } this.yaz = gecikmeli(() => { try { localStorage.setItem(this.k, JSON.stringify([...this.m])); } catch { /* sığmadı: bellekte kalır */ } }, 250); }
  async get(k, o = {}) { const v = this.m.get(k); if (v == null) return null; return o.type === 'json' ? JSON.parse(v) : v; }
  async setJSON(k, v) { this.m.set(k, JSON.stringify(v)); this.yaz(); }
  async set(k, v) { this.m.set(k, String(v)); this.yaz(); }
  async delete(k) { this.m.delete(k); this.yaz(); }
  async list({ prefix = '' } = {}) { return { blobs: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }
}
const DEMO_SURUM = 'dp-demo-6';
try { localStorage.removeItem('dp-demo-4'); localStorage.removeItem('dp-demo-5'); } catch { /* */ }
const cumartesi = (g) => { let t = g; while (new Date(t + 'T12:00:00Z').getUTCDay() !== 6) t = C.gunEkle(t, 1); return t; };
let demoDepo = null;
const demoO = () => ({ demo: true, depo: () => demoDepo, kripto: crypto, simdi: () => Date.now(), adminDogrula: async (t) => t === 'demo-yonetici', gorselUrl: async (slug, tur) => (await demoDepo.get(`gorsel/${slug}/${tur}`)) || '' });
let DO = null;
async function demoIstek(yontem, yol, govde, token) {
  const [p, q] = yol.split('?');
  const r = await isle({ yontem, yol: p, sorgu: new URLSearchParams(q || ''), baslik: (k) => (k === 'authorization' && token ? 'Bearer ' + token : null), govde: govde ? JSON.parse(JSON.stringify(govde)) : null, ip: 'demo' }, DO);
  await bekle(70);
  const v = r.veri === undefined ? null : JSON.parse(JSON.stringify(r.veri));
  if (r.durum >= 400) { const e = new Error(v?.hata || 'Bir sorun oluştu'); e.durum = r.durum; e.veri = v; throw e; }
  return v;
}
export async function demoKur(sifirla = false) {
  demoDepo = new DemoDepo(DEMO_SURUM); DO = demoO();
  if (sifirla) demoDepo.m.clear();
  if (await demoDepo.get('salon/ornek-salon')) return;
  const Y = 'demo-yonetici', bugun = C.trBugun();
  await demoIstek('PUT', 'salon/ornek-salon', { ...DEMO_SALON, yeni: true, alanlar: demoAlanlar(), odeme: { tutar: 0, gun: 1 } }, Y);
  await demoIstek('POST', 'salon/ornek-salon/sifre', { sifre: 'salon123' }, Y);
  // 1) planlama aşamasındaki düğün
  const a = await demoIstek('POST', 'dugun', { salon: 'ornek-salon', alan: 'kristal', kod: 'elif-can-ornek', bilgi: { tur: 'dugun', gelin: 'Elif', damat: 'Can', aile: 'Şahin ve Öztürk aileleri', tarih: cumartesi(C.gunEkle(bugun, 72)), saat: '19:30', bitis: '23:30' } }, Y);
  await demoPin(DO, a.kod, '123456');
  let t = await demoIstek('GET', `d/${a.kod}/tam`, null, Y);
  const L = davetliUret(128, 11);
  const ops = L.map((v) => ({ t: 'ekle', k: 'davetliler', v }));
  ops.push({ t: 'ekle', k: 'iliskiler', v: { a: L[3].id, b: L[9].id, tur: 'ayri' } }, { t: 'ekle', k: 'iliskiler', v: { a: L[5].id, b: L[14].id, tur: 'birlikte' } });
  ops.push({ t: 'ayar', v: { mesaj: 'Hayatımızın en güzel gününde sizi de aramızda görmek istiyoruz.', lcvSon: C.gunEkle(bugun, 50) } });
  const gk = ['Ayşe Şahin', 'Murat Öztürk', 'Selin', 'Kerem', 'Nermin Teyze'];
  t.dugun.gorevler.forEach((g, i) => ops.push({ t: 'guncelle', k: 'gorevler', id: g.id, v: { kim: gk[i % gk.length], bitti: i === 1 } }));
  C.GOREV_HAZIRLIK.slice(0, 9).forEach((ad, i) => ops.push({ t: 'ekle', k: 'gorevler', v: { ad, bolum: 'hazirlik', bitti: i < 5, kim: i % 2 ? 'Can' : 'Elif', tarih: C.gunEkle(bugun, i * 6 - 18) } }));
  t.dugun.program.forEach((p, i) => { if (i === 1) ops.push({ t: 'guncelle', k: 'program', id: p.id, v: { kim: 'DJ' } }); if (i === 6) ops.push({ t: 'guncelle', k: 'program', id: p.id, v: { kim: 'Ayşe Şahin', not: 'Tepsi ve kurdeleler gelin odasında' } }); });
  await demoIstek('POST', `d/${a.kod}/islem`, { ops, rev: t.dugun.rev, bid: 'demo1' }, Y);
  t = await demoIstek('GET', `d/${a.kod}/tam`, null, Y);
  const D = t.dugun;
  // davetlilerin bir kısmı yerleşmiş olsun
  const yarim = { ...D, davetliler: D.davetliler.filter((x, i) => i % 3 !== 2) };
  const oy = C.otomatikYerlestir(yarim, {});
  await demoIstek('POST', `d/${a.kod}/islem`, { ops: oy.ops, rev: D.rev, bid: 'demo2' }, Y);
  for (const [ad, kisi, durum] of [['Kemal Aksoy', 3, 'geliyor'], ['Derya Güneş', 1, 'gelmiyor'], [L[1].ad, L[1].kisi, 'geliyor']]) await demoIstek('POST', `d/${a.kod}/lcv`, { ad, kisi, durum });
  // 2) bugünkü düğün (masa bulucu)
  const b = await demoIstek('POST', 'dugun', { salon: 'ornek-salon', alan: 'kristal', kod: 'deniz-kerem-ornek', bilgi: { tur: 'dugun', gelin: 'Deniz', damat: 'Kerem', tarih: bugun, saat: '20:00', bitis: '00:00' } }, Y);
  await demoPin(DO, b.kod, '654321');
  t = await demoIstek('GET', `d/${b.kod}/tam`, null, Y);
  const L2 = davetliUret(110, 23, { geliyor: 0.92, bekliyor: 0 });
  const D2 = { ...t.dugun, davetliler: L2.map((v) => C.temizDavetli(v)) };
  const oy2 = C.otomatikYerlestir(D2, {});
  const ops2 = L2.map((v) => ({ t: 'ekle', k: 'davetliler', v })).concat(oy2.ops);
  await demoIstek('POST', `d/${b.kod}/islem`, { ops: ops2, rev: t.dugun.rev, bid: 'demo3' }, Y);
}

// ---------------------------------------------------------------- uzak
async function uzakIstek(yontem, yol, govde, token) {
  let r;
  try { r = await fetch('/dugun-api/' + yol, { method: yontem, headers: { ...(govde ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: govde ? JSON.stringify(govde) : undefined }); } catch { const e = new Error('İnternet bağlantısı yok gibi görünüyor.'); e.ag = true; throw e; }
  let v = null; try { v = await r.json(); } catch { /* boş */ }
  if (!r.ok) { const e = new Error(v?.hata || `Bir sorun oluştu (hata ${r.status})`); e.durum = r.status; e.veri = v; throw e; }
  return v;
}
const istek = (...a) => (DEMO ? demoIstek(...a) : uzakIstek(...a));

export const api = {
  get demo() { return DEMO; },
  async kur({ demo = false } = {}) { DEMO = !!demo; if (DEMO && !demoDepo) await demoKur(); },
  async demoSifirla() { await demoKur(true); },
  salon: (s) => istek('GET', `salon/${encodeURIComponent(s)}`),
  dugun: (k) => istek('GET', `d/${encodeURIComponent(k)}`),
  bulucu: (k) => istek('GET', `d/${encodeURIComponent(k)}/bulucu`),
  lcv: (k, b) => istek('POST', `d/${encodeURIComponent(k)}/lcv`, b),
  sayac: (k, tur) => istek('POST', `d/${encodeURIComponent(k)}/sayac`, { tur }).catch(() => null),
  giris: (k, pin) => istek('POST', `d/${encodeURIComponent(k)}/giris`, { pin }),
  salonGiris: (s, sifre) => istek('POST', `salon/${encodeURIComponent(s)}/giris`, { sifre }),
  tam: (k, rev, t) => istek('GET', `d/${encodeURIComponent(k)}/tam${rev ? '?rev=' + encodeURIComponent(rev) : ''}`, null, t),
  islem: (k, b, t) => istek('POST', `d/${encodeURIComponent(k)}/islem`, b, t),
  pin: (k, b, t) => istek('POST', `d/${encodeURIComponent(k)}/pin`, b, t),
  meta: (k, b, t) => istek('PUT', `d/${encodeURIComponent(k)}/meta`, b, t),
  dugunSil: (k, t) => istek('DELETE', `d/${encodeURIComponent(k)}`, null, t),
  salonTam: (s, t) => istek('GET', `salon/${encodeURIComponent(s)}/tam`, null, t),
  dugunOlustur: (b, t) => istek('POST', 'dugun', b, t),
  yonetim: (t) => istek('GET', 'yonetim', null, t),
  istat: (t) => istek('GET', 'istat', null, t),
  salonKaydet: (s, b, t) => istek('PUT', `salon/${encodeURIComponent(s)}`, b, t),
  salonSil: (s, hepsi, t) => istek('DELETE', `salon/${encodeURIComponent(s)}${hepsi ? '?hepsi=1' : ''}`, null, t),
  salonSifre: (s, sifre, t) => istek('POST', `salon/${encodeURIComponent(s)}/sifre`, { sifre }, t),
  salonSifreDegis: (s, eski, yeni, t) => istek('POST', `salon/${encodeURIComponent(s)}/sifre`, { eski, yeni }, t),
  gorsel: (s, tur, veri, t) => istek('PUT', `gorsel/${encodeURIComponent(s)}/${tur}`, { veri }, t),
  async adminGiris(kullanici, sifre) {
    if (DEMO) return { token: 'demo-yonetici' };
    let r; try { r = await fetch('/api/giris', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kullanici, sifre }) }); } catch { throw new Error('İnternet bağlantısı yok gibi görünüyor.'); }
    const v = await r.json().catch(() => null); if (!r.ok) throw new Error(v?.hata || 'Giriş yapılamadı'); return v;
  },
};

// ---------------------------------------------------------------- senkron (çift paneli ve yönetim düzenlemeleri)
/**
 * Yerel belgeye işlemleri hemen uygular, arka planda toplu gönderir. Bağlantı yoksa kuyruk cihazda saklanır.
 * Sunucu koşullu yazma bilmediği için: gönderilen her toplu işlemin kimliği belgenin "son" listesinde görünmezse yeniden gönderilir.
 */
export class Senkron {
  constructor({ kod, token, dugun, rol, onDegisim, onDurum, onOturum }) {
    Object.assign(this, { kod, token, d: dugun, rol, onDegisim, onDurum, onOturum });
    this.kuyruk = []; this.ucusta = null; this.onaylanan = []; this.geriYigin = []; this.durum = 'kaydedildi'; this.mesaj = ''; this.son = Date.now(); this.hata = 0;
    this.qk = 'dp:q:' + kod;
    try { const q = JSON.parse(depoYerel.al(this.qk) || '[]'); if (Array.isArray(q) && q.length) { for (const p of q) C.uygula(this.d, p.ops, this.cekRol()); this.kuyruk = q; setTimeout(() => this.gonder(), 300); } } catch { /* bozuk kuyruk */ }
    this._gor = () => { if (document.visibilityState === 'visible') this.yenile(); };
    document.addEventListener('visibilitychange', this._gor);
    this._et = () => { this.son = Date.now(); };
    for (const e of ['pointerdown', 'keydown']) window.addEventListener(e, this._et, { passive: true });
    this._z = setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - this.son < 180e3) this.yenile(); }, 15000);
    this._cev = () => { if (this.kuyruk.length) this.gonder(); };
    window.addEventListener('online', this._cev);
  }
  cekRol() { return this.rol === 'cift' ? 'cift' : 'yonetici'; }
  kapat() { clearInterval(this._z); clearTimeout(this._tg); clearTimeout(this._tr); document.removeEventListener('visibilitychange', this._gor); window.removeEventListener('online', this._cev); for (const e of ['pointerdown', 'keydown']) window.removeEventListener(e, this._et); }
  durumYaz(d, m = '') { this.durum = d; this.mesaj = m; this.onDurum && this.onDurum(d, m); }
  sakla() { const q = [...(this.ucusta ? [this.ucusta] : []), ...this.kuyruk]; if (q.length) depoYerel.koy(this.qk, JSON.stringify(q)); else depoYerel.sil(this.qk); }
  /** ops uygula; geri alınabilir ise ters işlemleri sakla. Döndürür: ters işlemler */
  uygula(ops, { etiket = '', geri = true } = {}) {
    if (!ops || !ops.length) return [];
    const ters = C.uygula(this.d, ops, this.cekRol());
    this.kuyruk.push({ bid: C.rastgele(10), ops });
    if (geri && ters.length) { this.geriYigin.push({ etiket, ters }); if (this.geriYigin.length > 60) this.geriYigin.shift(); }
    this.son = Date.now(); this.sakla(); this.durumYaz('kaydediliyor');
    clearTimeout(this._tg); this._tg = setTimeout(() => this.gonder(), 500);
    return ters;
  }
  geriAlinabilir() { return this.geriYigin.length > 0; }
  geriAl() { const g = this.geriYigin.pop(); if (!g) return null; this.uygula(g.ters, { geri: false }); return g.etiket || 'Son değişiklik'; }
  async gonder() {
    if (this.ucusta || !this.kuyruk.length) return;
    const parti = this.kuyruk.splice(0, this.kuyruk.length);
    this.ucusta = { bid: parti.length === 1 ? parti[0].bid : C.rastgele(10), ops: parti.flatMap((p) => p.ops) };
    this.sakla(); this.durumYaz('kaydediliyor');
    const u = this.ucusta;
    try {
      const r = await api.islem(this.kod, { ops: u.ops, rev: this.d.rev, bid: u.bid }, this.token);
      this.ucusta = null; this.hata = 0;
      this.onaylanan.push({ bid: u.bid, ops: u.ops, t: Date.now() }); if (this.onaylanan.length > 40) this.onaylanan.shift();
      if (r.dugun) { this.belgeAl(r.dugun); this.onDegisim && this.onDegisim('uzak'); } else this.d.rev = r.rev;
      this.sakla();
      if (this.kuyruk.length) this.gonder(); else this.durumYaz('kaydedildi');
    } catch (e) {
      this.ucusta = null;
      if (e.durum === 401) { this.kuyruk.unshift(u); this.sakla(); this.durumYaz('oturum', e.message); this.onOturum && this.onOturum(); return; }
      if (e.durum && e.durum < 500 && e.durum !== 429 && e.durum !== 408) { this.sakla(); this.durumYaz('hata', e.message); this.yenile(true); return; }
      this.kuyruk.unshift(u); this.sakla(); this.hata++;
      this.durumYaz('cevrimdisi', e.ag ? 'Bağlantı yok; değişiklikler bu cihazda bekliyor.' : 'Sunucuya ulaşılamadı; yeniden denenecek.');
      clearTimeout(this._tr); this._tr = setTimeout(() => this.gonder(), Math.min(30000, 2000 * 2 ** Math.min(4, this.hata - 1)));
    }
  }
  /** Sunucudan gelen belgeyi esas al, bekleyen yerel işlemleri üstüne yeniden uygula */
  belgeAl(d) {
    const son = new Set(d.son || []), simdi = Date.now();
    const kayip = this.onaylanan.filter((o) => !son.has(o.bid) && simdi - o.t < 30 * 60e3);
    this.onaylanan = [];
    for (const o of kayip.reverse()) this.kuyruk.unshift({ bid: o.bid, ops: o.ops });
    this.d = C.belgeDuzelt(d);
    for (const p of [...(this.ucusta ? [this.ucusta] : []), ...this.kuyruk]) C.uygula(this.d, p.ops, this.cekRol());
    if (kayip.length) { this.sakla(); clearTimeout(this._tg); this._tg = setTimeout(() => this.gonder(), 300); }
  }
  async yenile(zorla = false) {
    if (this.ucusta || (this.kuyruk.length && !zorla) || this._yeniliyor) return;
    this._yeniliyor = true;
    try {
      const r = await api.tam(this.kod, zorla ? '' : this.d.rev, this.token);
      if (r.ayni) { this.onaylanan = []; return; }
      if (this.ucusta || this.kuyruk.length) { if (!zorla) return; }
      const once = this.d.rev;
      this.belgeAl(r.dugun);
      if (this.d.rev !== once || zorla) this.onDegisim && this.onDegisim('uzak');
      if (this.durum === 'cevrimdisi' && !this.kuyruk.length) this.durumYaz('kaydedildi');
    } catch (e) {
      if (e.durum === 401) { this.durumYaz('oturum', e.message); this.onOturum && this.onOturum(); }
    } finally { this._yeniliyor = false; }
  }
}
