// Düğün Planla — arka uç erişimi. Gerçek sitede /dugun-api (Netlify fonksiyonu); demoda aynı sunucu kodu tarayıcıda, bellek deposuyla çalışır.
import * as C from './cekirdek.js?v=2026-11-24-a';
import { isle, demoKod } from './sunucu.js?v=2026-11-24-a';
import { davetliUret, DEMO_SALON, demoAlanlar } from './demo.js?v=2026-11-24-a';
import { bekle, gecikmeli } from './ui.js?v=2026-11-24-a';

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
const DEMO_SURUM = 'dp-demo-7';
try { for (const k of ['dp-demo-4', 'dp-demo-5', 'dp-demo-6']) localStorage.removeItem(k); } catch { /* */ }
const cumartesi = (g) => { let t = g; while (new Date(t + 'T12:00:00Z').getUTCDay() !== 6) t = C.gunEkle(t, 1); return t; };
let demoDepo = null;
const demoO = () => ({ demo: true, depo: () => demoDepo, kripto: crypto, simdi: () => Date.now(), adminDogrula: async (t) => t === 'demo-yonetici', gorselUrl: async (slug, tur) => (await demoDepo.get(`gorsel/${slug}/${tur}`)) || '' });
let DO = null;
async function demoIstek(yontem, yol, govde, token, hizli = false) {
  const [p, q] = yol.split('?');
  const r = await isle({ yontem, yol: p, sorgu: new URLSearchParams(q || ''), baslik: (k) => (k === 'authorization' && token ? 'Bearer ' + token : null), govde: govde ? JSON.parse(JSON.stringify(govde)) : null, ip: 'demo' }, DO);
  if (!hizli) await bekle(70);
  const v = r.veri === undefined ? null : JSON.parse(JSON.stringify(r.veri));
  if (r.durum >= 400) { const e = new Error(v?.hata || 'Bir sorun oluştu'); e.durum = r.durum; e.veri = v; throw e; }
  return v;
}
export async function demoKur(sifirla = false) {
  demoDepo = new DemoDepo(DEMO_SURUM); DO = demoO();
  if (sifirla) demoDepo.m.clear();
  if (await demoDepo.get('salon/ornek-salon')) return;
  const Y = 'demo-yonetici', bugun = C.trBugun();
  const ayBas = (n) => { const d = new Date(bugun + 'T12:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  await demoIstek('PUT', 'salon/ornek-salon', { ...DEMO_SALON, yeni: true, alanlar: demoAlanlar(), kisi: 'Ayhan Bey', odeme: { model: 'dugun', dugunBasi: 750, gun: 5, baslangic: ayBas(-6) } }, Y);
  await demoIstek('POST', 'salon/ornek-salon/sifre', { sifre: 'salon123' }, Y);
  // 1) planlama aşamasındaki düğün
  const a = await demoIstek('POST', 'dugun', { salon: 'ornek-salon', alan: 'kristal', kod: 'elif-can-ornek', bilgi: { tur: 'dugun', gelin: 'Elif', damat: 'Can', aile: 'Şahin ve Öztürk aileleri', tarih: cumartesi(C.gunEkle(bugun, 72)), saat: '19:30', bitis: '23:30' } }, Y);
  await demoKod(DO, a.kod, 'DEMO-2026');
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
  await demoKod(DO, b.kod, 'DNZK-2468');
  t = await demoIstek('GET', `d/${b.kod}/tam`, null, Y);
  const L2 = davetliUret(110, 23, { geliyor: 0.92, bekliyor: 0 });
  const D2 = { ...t.dugun, davetliler: L2.map((v) => C.temizDavetli(v)) };
  const oy2 = C.otomatikYerlestir(D2, {});
  const ops2 = L2.map((v) => ({ t: 'ekle', k: 'davetliler', v })).concat(oy2.ops);
  await demoIstek('POST', `d/${b.kod}/islem`, { ops: ops2, rev: t.dugun.rev, bid: 'demo3' }, Y);
  await DO.depo().setJSON(`sayac/${b.kod}`, { ziyaret: 164, bul: 71, lcv: 0 });
  // 3) istatistik ve gelir ekranları için geçmiş ve gelecek aylara yayılmış düğünler (davetli listeleri kısa)
  await demoIstek('PUT', 'salon/ornek-bahce', { slug: 'ornek-bahce', ad: 'Örnek Kır Bahçesi', yeni: true, tema: { stil: 'acik', vurgu: '#248a3d', kisaAd: 'Kır Bahçesi', slogan: 'Açık havada davet' }, iletisim: {}, alanlar: [demoAlanlar()[1]], odeme: { model: 'ikisi', tutar: 1500, dugunBasi: 400, gun: 10, baslangic: ayBas(-4) } }, Y, true);
  const CIFT = [['Selin', 'Emre'], ['Zeynep', 'Burak'], ['Merve', 'Onur'], ['Gizem', 'Kaan'], ['Ceren', 'Arda'], ['Ece', 'Mert'], ['Damla', 'Cem'], ['Aslı', 'Tolga'], ['Büşra', 'Yusuf'], ['İrem', 'Okan'], ['Seda', 'Murat'], ['Pınar', 'Selim'], ['Nur', 'Barış'], ['Esra', 'Uğur'], ['Sevgi', 'Halil'], ['Canan', 'Levent'], ['Hande', 'Serkan'], ['Derya', 'Volkan']];
  const PLAN = [[-5, 'ornek-salon', 4], [-5, 'ornek-bahce', 18], [-4, 'ornek-salon', 2], [-4, 'ornek-salon', 23], [-3, 'ornek-salon', 9], [-3, 'ornek-bahce', 16], [-2, 'ornek-salon', 6], [-2, 'ornek-salon', 13], [-2, 'ornek-bahce', 27], [-1, 'ornek-salon', 1], [-1, 'ornek-salon', 22], [1, 'ornek-salon', 8], [1, 'ornek-bahce', 15], [2, 'ornek-salon', 12], [3, 'ornek-salon', 4], [4, 'ornek-bahce', 9], [0, 'ornek-salon', 6], [0, 'ornek-bahce', 26]];
  for (const [i, [ay, salon, gun]] of PLAN.entries()) {
    const [gelin, damat] = CIFT[i], tarih = cumartesi(C.gunEkle(ayBas(ay), gun - 1)), gecmis = tarih < bugun;
    const r = await demoIstek('POST', 'dugun', { salon, alan: salon === 'ornek-salon' ? (i % 3 ? 'kristal' : 'bahce') : undefined, kod: `${C.slugla(gelin)}-${C.slugla(damat)}-ornek`, bilgi: { tur: 'dugun', gelin, damat, tarih, saat: '19:30', bitis: '23:30' } }, Y, true);
    const t3 = await demoIstek('GET', `d/${r.kod}/tam`, null, Y, true);
    const L3 = davetliUret(28 + ((i * 7) % 20), 40 + i, gecmis ? { geliyor: 0.9, bekliyor: 0 } : { geliyor: 0.6, bekliyor: 0.3 });
    const D3 = { ...t3.dugun, davetliler: L3.map((v) => C.temizDavetli(v)) };
    const ops3 = L3.map((v) => ({ t: 'ekle', k: 'davetliler', v })).concat(gecmis || i % 2 ? C.otomatikYerlestir(D3, {}).ops : []);
    await demoIstek('POST', `d/${r.kod}/islem`, { ops: ops3, rev: t3.dugun.rev, bid: 'dm' + i }, Y, true);
    if (gecmis) await DO.depo().setJSON(`sayac/${r.kod}`, { ziyaret: 60 + ((i * 37) % 90), bul: 20 + ((i * 13) % 50), lcv: 8 + ((i * 5) % 20) });
  }
  // salonların geçmiş ayları ödenmiş olsun (son ayın bir kısmı açık kalsın)
  const yon = await demoIstek('GET', 'yonetim', null, Y, true);
  for (const s of yon.salonlar) {
    const o = s.odeme, D = yon.dugunler.filter((d) => d.salon === s.slug);
    const odm = [];
    for (let n = -6; n <= -1; n++) {
      const ay = ayBas(n).slice(0, 7); if (o.baslangic && ay < o.baslangic.slice(0, 7)) continue;
      const tutar = (o.model === 'ikisi' || o.model === 'aylik' ? o.tutar : 0) + D.filter((d) => (d.tarih || '').startsWith(ay)).length * (o.dugunBasi || 0);
      if (!tutar) continue;
      odm.push({ id: 'od' + s.slug.slice(6, 9) + n, tarih: C.gunEkle(ayBas(n + 1), o.gun - 2), donem: ay, tutar: n === -1 ? Math.round(tutar / 2 / 50) * 50 : tutar, not: n % 2 ? 'Havale' : 'Nakit' });
    }
    await demoIstek('PUT', `salon/${s.slug}`, { ...s, tema: s.temaHam, odemeler: odm }, Y, true);
  }
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
  giris: (k, kod) => istek('POST', `d/${encodeURIComponent(k)}/giris`, { kod }),
  kodGiris: (kod) => istek('POST', 'giris', { kod }),
  salonIstat: (s, t) => istek('GET', `salon/${encodeURIComponent(s)}/istat`, null, t),
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
