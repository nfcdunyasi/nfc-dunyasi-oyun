// Düğün Planla — çekirdek mantık. Sunucu (Netlify fonksiyonu), tarayıcı ve demo aynı dosyayı kullanır; DOM'a dokunmaz.
// Uzunluklar metre, saat dilimi Türkiye (UTC+3).

let K = globalThis.crypto;
export function kriptoKur(c) { K = c; }
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';
export function rastgele(n = 8, abc = ABC) { const b = new Uint8Array(n); K.getRandomValues(b); let s = ''; for (const x of b) s += abc[x % abc.length]; return s; }

// ---------------------------------------------------------------- yardımcılar
const HARF = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export const trNorm = (s) => String(s ?? '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => HARF[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const slugla = (s, n = 40) => trNorm(s).replace(/ /g, '-').slice(0, n).replace(/-+$/, '');
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const KOD_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
export const str = (v, n = 200) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');
export const metin = (v, n = 600) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n) : '');
export const sayi = (v, min, max, d = min) => { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v); return v !== null && v !== '' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
export const tamSayi = (v, min, max, d = min) => Math.round(sayi(v, min, max, d));
const secim = (v, liste, d) => (liste.includes(v) ? v : d);
export const tarihMi = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) ? v : '');
export const saatMi = (v) => (typeof v === 'string' && /^([01]\d|2[0-3])[:.][0-5]\d$/.test(v) ? v.replace('.', ':') : '');
export const idMi = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(v) ? v : '');
const m2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- tarih / saat (Türkiye)
export const TR_OFSET = 3 * 3600e3;
export const trBugun = (t = Date.now()) => new Date(t + TR_OFSET).toISOString().slice(0, 10);
export const gunEkle = (g, n) => { const d = new Date(g + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export function tarihYaz(g, { gun = false, yil = true } = {}) {
  if (!tarihMi(g)) return '';
  const [y, a, d] = g.split('-').map(Number);
  const w = new Date(Date.UTC(y, a - 1, d)).getUTCDay();
  return `${d} ${AYLAR[a - 1]}${yil ? ' ' + y : ''}${gun ? ' ' + GUNLER[w] : ''}`;
}
export const saatYaz = (s) => (s ? s.replace(':', '.') : '');
export function dugunZamani(b) { return tarihMi(b?.tarih) ? Date.parse(b.tarih + 'T' + (saatMi(b.saat) || '19:00') + ':00+03:00') : null; }
export function kalanGun(b, simdi = Date.now()) { if (!tarihMi(b?.tarih)) return null; return Math.round((Date.parse(b.tarih + 'T00:00:00Z') - Date.parse(trBugun(simdi) + 'T00:00:00Z')) / 864e5); }

// ---------------------------------------------------------------- sabitler
export const TARAFLAR = [['gelin', 'Gelin tarafı'], ['damat', 'Damat tarafı'], ['ortak', 'Ortak']];
export const DURUMLAR = [['geliyor', 'Geliyor'], ['bekliyor', 'Yanıt bekleniyor'], ['gelmiyor', 'Gelmiyor']];
export const ETIKETLER = [['vejetaryen', 'Vejetaryen'], ['mama', 'Mama sandalyesi'], ['engelli', 'Engelli erişimi'], ['oncelikli', 'Yaşlı / öncelikli'], ['protokol', 'Protokol']];
export const GRUPLAR = ['Aile', 'Akraba', 'Yakın arkadaş', 'Arkadaş', 'İş', 'Komşu', 'Diğer'];
export const TURLER = [['dugun', 'Düğün'], ['nisan', 'Nişan'], ['kina', 'Kına gecesi'], ['soz', 'Söz'], ['nikah', 'Nikâh'], ['davet', 'Davet']];
export const OGELER = [['sahne', 'Sahne'], ['pist', 'Dans pisti'], ['giris', 'Giriş'], ['bar', 'Bar'], ['dj', 'DJ / Orkestra'], ['bufe', 'Büfe'], ['pasta', 'Pasta masası'], ['foto', 'Fotoğraf köşesi'], ['kolon', 'Kolon'], ['yazi', 'Yazı']];
export const MASA_OZEL = [['', 'Davetli masası'], ['gelin-damat', 'Gelin ve damat masası'], ['rezerve', 'Rezerve masa']];
const TARAF_K = TARAFLAR.map((x) => x[0]), DURUM_K = DURUMLAR.map((x) => x[0]), ETIKET_K = ETIKETLER.map((x) => x[0]);

export const GOREV_GUN = [
  ['Misafirleri kapıda karşılama', ''], ['Nikâh şahitleri (kimlikleriyle)', ''], ['Gelin arabası ve konvoy', ''], ['Takı merasimi sunumu', ''],
  ['Takı ve hediye zarflarını teslim alma', ''], ['Fotoğrafçı ve video ekibiyle iletişim', ''], ['DJ / orkestra ile şarkı listesi', ''],
  ['Yaşlı misafirlerin ulaşımı', ''], ['Gece sonunda salonda eşya kontrolü', ''],
];
export const GOREV_HAZIRLIK = [
  'Bütçeyi belirle', 'Nikâh dairesinden randevu al', 'Nikâh evraklarını hazırla', 'Davetli listesini tamamla', 'Davetiyeleri sipariş et', 'Davetiyeleri dağıt, katılım bağlantısını gönder',
  'Gelinlik ve damatlık provası', 'Kuaför ve makyaj randevusu', 'Fotoğrafçı ve video çekimi', 'Müzik: DJ ya da orkestra', 'Alyanslar', 'Nikâh şekeri ve hediyelikler',
  'Çiçek ve masa süslemeleri', 'Pasta seçimi', 'Kına gecesi organizasyonu', 'Oturma planını bitir', 'Masa kartlarını yazdır', 'Balayı rezervasyonu',
];
export const PROGRAM_SABLON = [
  ['19:00', 'Misafir karşılama'], ['19:45', 'Gelin ve damadın salona girişi'], ['20:00', 'Nikâh töreni'], ['20:30', 'İlk dans'], ['20:45', 'Yemek servisi'],
  ['21:30', 'Pasta kesimi'], ['22:00', 'Takı merasimi'], ['22:30', 'Eğlence'], ['23:30', 'Kapanış ve uğurlama'],
];

// ---------------------------------------------------------------- salon planı
export function masaBoyut(sekil, kap) {
  if (sekil === 'dikdortgen') return { w: m2(Math.max(1.2, Math.ceil(kap / 2) * 0.6)), h: 0.9 };
  const c = kap <= 4 ? 1 : kap <= 6 ? 1.2 : kap <= 8 ? 1.5 : kap <= 10 ? 1.8 : kap <= 12 ? 2 : kap <= 14 ? 2.2 : 2.4;
  return { w: c, h: c };
}
const OGE_K = OGELER.map((x) => x[0]);
export function temizPlan(p) {
  const en = m2(sayi(p?.en, 6, 200, 30)), boy = m2(sayi(p?.boy, 6, 200, 22));
  const ids = new Set(), yeniId = (v, on) => { let id = idMi(v); while (!id || ids.has(id)) id = on + rastgele(6); ids.add(id); return id; };
  const masalar = (Array.isArray(p?.masalar) ? p.masalar : []).slice(0, 400).filter((m) => m && typeof m === 'object').map((m, i) => {
    const sekil = secim(m.sekil, ['yuvarlak', 'dikdortgen'], 'yuvarlak'), kap = tamSayi(m.kap, 1, 40, 10), b = masaBoyut(sekil, kap);
    return { id: yeniId(m.id, 'm'), no: tamSayi(m.no, 0, 9999, i + 1), ad: str(m.ad, 40), sekil, kap, ek: tamSayi(m.ek, 0, 8, 0), x: m2(sayi(m.x, 0, en, en / 2)), y: m2(sayi(m.y, 0, boy, boy / 2)), w: m2(sayi(m.w, 0.5, 14, b.w)), h: m2(sayi(m.h, 0.5, 14, b.h)), r: tamSayi(m.r, -180, 180, 0), ozel: secim(m.ozel, ['', 'gelin-damat', 'rezerve'], '') };
  });
  const ogeler = (Array.isArray(p?.ogeler) ? p.ogeler : []).slice(0, 120).filter((o) => o && OGE_K.includes(o.tur)).map((o) => ({ id: yeniId(o.id, 'o'), tur: o.tur, ad: str(o.ad, 40), x: m2(sayi(o.x, 0, en, en / 2)), y: m2(sayi(o.y, 0, boy, boy / 2)), w: m2(sayi(o.w, 0.2, 200, 2)), h: m2(sayi(o.h, 0.2, 200, 1)), r: tamSayi(o.r, -180, 180, 0) }));
  return { en, boy, masalar, ogeler };
}
export const sahneOf = (plan) => plan?.ogeler?.find((o) => o.tur === 'sahne') || null;
function kutu(o) {
  const r = ((Math.abs(o.r || 0) % 180) + 180) % 180, dik = r > 45 && r < 135, w = dik ? o.h : o.w, h = dik ? o.w : o.h;
  return { x1: o.x - w / 2, y1: o.y - h / 2, x2: o.x + w / 2, y2: o.y + h / 2, w, h };
}
const yariCap = (m, ux, uy) => (m.sekil === 'yuvarlak' ? m.w / 2 : (() => { const k = kutu(m); return Math.abs(ux) * k.w / 2 + Math.abs(uy) * k.h / 2; })());
function enYakin(a, x, y) { return { x: Math.min(a.x2, Math.max(a.x1, x)), y: Math.min(a.y2, Math.max(a.y1, y)) }; }
/** Masanın kenarından sahnenin kenarına boşluk (m). Sahne yoksa null. */
export function sahneUzaklik(plan, m) {
  const s = sahneOf(plan); if (!s) return null;
  const p = enYakin(kutu(s), m.x, m.y), dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return 0;
  return Math.max(0, d - yariCap(m, dx / d, dy / d));
}
/** Masayı sahneye olan uzaklığı `hedef` m olacak şekilde, aynı doğrultuda taşır. */
export function uzaklikAyarla(plan, m, hedef) {
  const s = sahneOf(plan); if (!s) return m;
  const a = kutu(s), p = enYakin(a, m.x, m.y);
  let ux = m.x - p.x, uy = m.y - p.y, d = Math.hypot(ux, uy);
  if (d < 1e-6) { ux = 0; uy = s.y < plan.boy / 2 ? 1 : -1; d = 1; }
  ux /= d; uy /= d;
  const t = Math.max(0, hedef) + yariCap(m, ux, uy);
  return { ...m, x: m2(Math.min(plan.en, Math.max(0, p.x + ux * t))), y: m2(Math.min(plan.boy, Math.max(0, p.y + uy * t))) };
}
/** Sahneye bakan kişinin sol yönü (birim vektör, ekran koordinatı) */
export function solVektor(plan) {
  const s = sahneOf(plan); if (!s) return { x: -1, y: 0, f: { x: 0, y: -1 } };
  const vx = s.x - plan.en / 2, vy = s.y - plan.boy / 2;
  const f = Math.abs(vy) >= Math.abs(vx) ? { x: 0, y: vy < 0 ? -1 : 1 } : { x: vx < 0 ? -1 : 1, y: 0 };
  return { x: f.y, y: -f.x, f };
}
/** Sıra: sahneye bakan yöndeki konuma göre (yan yana duran masalar aynı sırada) */
const derinlik = (plan, m) => { const f = solVektor(plan).f; return -(m.x * f.x + m.y * f.y); };
function siraBantlari(plan) {
  const d = plan.masalar.filter((m) => m.ozel !== 'gelin-damat').map((m) => derinlik(plan, m)).sort((a, b) => a - b);
  const bant = []; for (const x of d) if (!bant.length || x - bant[bant.length - 1].son > 0.9) bant.push({ bas: x, son: x }); else bant[bant.length - 1].son = x;
  return bant;
}
export function siraNo(plan, m, bant = siraBantlari(plan)) {
  if (!sahneOf(plan)) return 0;
  const d = derinlik(plan, m); let i = bant.findIndex((b) => d <= b.son + 0.45); if (i < 0) i = bant.length - 1;
  return i + 1;
}
/** "Sahneye bakarken sol tarafta, 2. sırada" */
export function masaYeri(plan, m) {
  const s = sahneOf(plan); if (!s) return '';
  const sol = solVektor(plan), yan = (m.x - s.x) * sol.x + (m.y - s.y) * sol.y;
  const sinir = Math.max(1.2, (Math.abs(sol.x) ? s.w : s.h) * 0.18);
  const n = siraNo(plan, m);
  if (Math.abs(yan) < sinir) return `Sahnenin tam karşısında, ${n}. sırada`;
  return `Sahneye bakarken ${yan > 0 ? 'sol' : 'sağ'} tarafta, ${n}. sırada`;
}
export function planOzet(plan) {
  let masa = 0, kisi = 0, ek = 0;
  for (const m of plan?.masalar || []) { if (m.ozel === 'gelin-damat') continue; masa++; kisi += m.kap; ek += m.ek; }
  return { masa, kisi, ek };
}
const ayakIzi = (m) => { const k = kutu(m); return { x1: k.x1 - 0.45, y1: k.y1 - 0.45, x2: k.x2 + 0.45, y2: k.y2 + 0.45 }; };
const kesisir = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const daralt = (k, e = 0.15) => ({ x1: k.x1 + e, y1: k.y1 + e, x2: k.x2 - e, y2: k.y2 - e });
/** Üst üste binen ya da salon dışına taşan masalar */
export function cakismalar(plan) {
  const s = new Set(), M = plan.masalar;
  for (let i = 0; i < M.length; i++) {
    const a = M[i], k = kutu(a);
    if (k.x1 < -0.05 || k.y1 < -0.05 || k.x2 > plan.en + 0.05 || k.y2 > plan.boy + 0.05) s.add(a.id);
    for (let j = i + 1; j < M.length; j++) {
      const b = M[j];
      const ust = a.sekil === 'yuvarlak' && b.sekil === 'yuvarlak' ? Math.hypot(a.x - b.x, a.y - b.y) < (a.w + b.w) / 2 + 0.6 : kesisir(daralt(ayakIzi(a)), daralt(ayakIzi(b)));
      if (ust) { s.add(a.id); s.add(b.id); }
    }
  }
  return s;
}
/** Hızlı plan: salon ölçüsü, sahne/pist, masa tipi ve adedine göre masaları ön sıralardan başlayarak yerleştirir */
export function planOlustur(o = {}) {
  const en = m2(sayi(o.en, 8, 200, 30)), boy = m2(sayi(o.boy, 8, 200, 22));
  const kenar = sayi(o.kenar, 0.3, 5, 0.8), bosluk = sayi(o.bosluk, 0.3, 5, 0.6), sahneMesafe = sayi(o.sahneMesafe, 0.3, 20, 2);
  const sekil = secim(o.sekil, ['yuvarlak', 'dikdortgen'], 'yuvarlak'), kap = tamSayi(o.kap, 2, 30, 10), ek = tamSayi(o.ek, 0, 6, 1);
  const adet = tamSayi(o.adet, 1, 400, 30), b = masaBoyut(sekil, kap);
  const ogeler = [];
  const sw = m2(sayi(o.sahneEn, 2, en, Math.min(10, en * 0.35))), sh = m2(sayi(o.sahneDerin, 1, boy / 2, 3));
  ogeler.push({ id: 'sahne', tur: 'sahne', ad: 'Sahne', x: m2(en / 2), y: m2(sh / 2), w: sw, h: sh, r: 0 });
  let alt = sh;
  const masalar = [];
  if (o.gelinMasasi !== false) {
    masalar.push({ id: 'gd', no: 0, ad: 'Gelin & Damat', sekil: 'dikdortgen', kap: 2, ek: 0, x: m2(en / 2), y: m2(alt + 1.2), w: 2.4, h: 0.8, r: 0, ozel: 'gelin-damat' });
    alt += 1.9;
  }
  if (o.pist !== false) {
    const pw = m2(sayi(o.pistEn, 2, en, Math.min(9, en * 0.32))), ph = m2(sayi(o.pistDerin, 2, boy, Math.min(7, boy * 0.3)));
    ogeler.push({ id: 'pist', tur: 'pist', ad: 'Dans pisti', x: m2(en / 2), y: m2(alt + 0.6 + ph / 2), w: pw, h: ph, r: 0 });
  }
  ogeler.push({ id: 'giris', tur: 'giris', ad: 'Giriş', x: m2(en / 2), y: m2(boy - 0.3), w: 2.6, h: 0.6, r: 0 });
  const fx = b.w + 0.9 + bosluk, fy = b.h + 0.9 + bosluk;
  const nx = Math.max(1, Math.floor((en - 2 * kenar + bosluk) / fx));
  const x0 = en / 2 - ((nx - 1) * fx) / 2;
  const yasak = ogeler.map((g) => { const k = kutu(g), e = g.tur === 'sahne' ? sahneMesafe : g.tur === 'pist' ? Math.min(sahneMesafe, 1.2) : g.tur === 'giris' ? 1.8 : 0.5; return { x1: k.x1 - e, y1: k.y1 - e, x2: k.x2 + e, y2: k.y2 + e }; });
  for (const m of masalar) { const k = kutu(m); yasak.push({ x1: k.x1 - 1, y1: k.y1 - 0.8, x2: k.x2 + 1, y2: k.y2 + 0.8 }); }
  const aday = [];
  const yIlk = sh + sahneMesafe + fy / 2 - bosluk / 2;
  for (let yi = -12; yi < 80; yi++) {
    const y = yIlk + yi * fy;
    if (y - fy / 2 + bosluk / 2 < kenar - 1e-6 || y + fy / 2 - bosluk / 2 > boy - kenar + 1e-6) continue;
    for (let xi = 0; xi < nx; xi++) {
      const x = x0 + xi * fx, iz = { x1: x - (fx - bosluk) / 2, y1: y - (fy - bosluk) / 2, x2: x + (fx - bosluk) / 2, y2: y + (fy - bosluk) / 2 };
      if (iz.x1 < kenar - 1e-6 || iz.x2 > en - kenar + 1e-6) continue;
      if (yasak.some((z) => kesisir(z, daralt(iz, 0.01)))) continue;
      aday.push({ x: m2(x), y: m2(y) });
    }
  }
  const tmp = { en, boy, ogeler, masalar: [] };
  const uz = (p) => sahneUzaklik(tmp, { ...p, sekil, w: b.w, h: b.h }) ?? p.y;
  aday.sort((p, q) => uz(p) - uz(q) || Math.abs(p.x - en / 2) - Math.abs(q.x - en / 2) || p.x - q.x);
  const secilen = aday.slice(0, adet);
  const numara = secim(o.numara, ['sira', 'yilan', 'uzaklik'], 'sira');
  if (numara === 'uzaklik') secilen.sort((p, q) => uz(p) - uz(q) || p.x - q.x);
  else {
    secilen.sort((p, q) => p.y - q.y || p.x - q.x);
    if (numara === 'yilan') { const sat = []; for (const p of secilen) { const s = sat.find((r) => Math.abs(r[0].y - p.y) < 0.3); s ? s.push(p) : sat.push([p]); } secilen.length = 0; sat.forEach((r, i) => secilen.push(...(i % 2 ? r.reverse() : r))); }
  }
  secilen.forEach((p, i) => masalar.push({ id: 'm' + (i + 1), no: i + 1, ad: '', sekil, kap, ek, x: p.x, y: p.y, w: b.w, h: b.h, r: 0, ozel: '' }));
  return { plan: temizPlan({ en, boy, masalar, ogeler }), sigan: aday.length, istenen: adet };
}
/** Masa numaralarını yeniden verir (gelin-damat masası 0 kalır) */
export function yenidenNumarala(plan, tur = 'sira') {
  const M = plan.masalar.filter((m) => m.ozel !== 'gelin-damat');
  if (tur === 'uzaklik') M.sort((a, b) => (sahneUzaklik(plan, a) ?? 0) - (sahneUzaklik(plan, b) ?? 0) || a.x - b.x);
  else {
    const sat = []; for (const m of [...M].sort((a, b) => a.y - b.y)) { const s = sat.find((r) => Math.abs(r[0].y - m.y) < 0.6); s ? s.push(m) : sat.push([m]); }
    M.length = 0; sat.forEach((r, i) => { r.sort((a, b) => a.x - b.x); M.push(...(tur === 'yilan' && i % 2 ? r.reverse() : r)); });
  }
  M.forEach((m, i) => { m.no = i + 1; });
  return plan;
}

// ---------------------------------------------------------------- düğün belgesi
export function temizBilgi(b = {}, rol = 'cift', eski = {}) {
  const o = { ...eski };
  if (rol !== 'cift' || !eski.tur) {
    o.tur = secim(b.tur ?? eski.tur, TURLER.map((x) => x[0]), 'dugun');
    o.tarih = tarihMi(b.tarih ?? eski.tarih) || '';
    o.saat = saatMi(b.saat ?? eski.saat) || '';
    o.bitis = saatMi(b.bitis ?? eski.bitis) || '';
  }
  o.gelin = str(b.gelin ?? eski.gelin, 40); o.damat = str(b.damat ?? eski.damat, 40); o.aile = str(b.aile ?? eski.aile, 90);
  return o;
}
export function temizAyar(a = {}) {
  return {
    lcv: secim(a.lcv, ['acik', 'kapali'], 'acik'), lcvSon: tarihMi(a.lcvSon), lcvMod: secim(a.lcvMod, ['herkes', 'liste'], 'herkes'),
    mesaj: metin(a.mesaj, 600), bulucu: secim(a.bulucu, ['otomatik', 'acik', 'kapali'], 'otomatik'), komsu: a.komsu !== false,
    gelinTarafi: secim(a.gelinTarafi, ['sol', 'sag'], 'sol'), telSor: !!a.telSor,
  };
}
export function temizDavetli(v, eski = null) {
  if (!v || typeof v !== 'object') return null;
  const kisi = tamSayi(v.kisi, 1, 30, 1);
  const lcv = v.lcv && typeof v.lcv === 'object' ? { t: tamSayi(v.lcv.t, 0, 9e15, 0), ad: str(v.lcv.ad, 80), kisi: tamSayi(v.lcv.kisi, 0, 30, 0), durum: secim(v.lcv.durum, DURUM_K, 'bekliyor'), not: metin(v.lcv.not, 400), id: idMi(v.lcv.id) } : null;
  return {
    id: idMi(v.id) || rastgele(8), ad: str(v.ad, 80) || 'İsimsiz davetli', kisi, cocuk: tamSayi(v.cocuk, 0, kisi, 0),
    taraf: secim(v.taraf, TARAF_K, 'ortak'), grup: str(v.grup, 30), durum: secim(v.durum, DURUM_K, 'bekliyor'),
    tel: str(v.tel, 24).replace(/[^\d+ ()-]/g, ''), not: metin(v.not, 400), etiket: [...new Set((Array.isArray(v.etiket) ? v.etiket : []).filter((e) => ETIKET_K.includes(e)))],
    masa: idMi(v.masa) || null, yeni: !!v.yeni, lcv, eklenme: tamSayi(v.eklenme ?? eski?.eklenme, 0, 9e15, Date.now()),
  };
}
const temizIliski = (v) => { const a = idMi(v?.a), b = idMi(v?.b); if (!a || !b || a === b) return null; return { id: idMi(v.id) || rastgele(8), a, b, tur: secim(v.tur, ['birlikte', 'ayri'], 'birlikte') }; };
const temizGorev = (v, eski) => (v && typeof v === 'object' ? { id: idMi(v.id) || rastgele(8), ad: str(v.ad, 140) || 'Görev', kim: str(v.kim, 60), tarih: tarihMi(v.tarih), bolum: secim(v.bolum, ['hazirlik', 'gun'], 'hazirlik'), bitti: !!v.bitti, not: metin(v.not, 400), eklenme: tamSayi(v.eklenme ?? eski?.eklenme, 0, 9e15, Date.now()) } : null);
const temizProgram = (v) => (v && typeof v === 'object' ? { id: idMi(v.id) || rastgele(8), saat: saatMi(v.saat), ad: str(v.ad, 120) || 'Program', kim: str(v.kim, 60), not: metin(v.not, 300) } : null);
export function temizGruplar(v) {
  const g = []; const gor = new Set();
  for (const x of Array.isArray(v) ? v : []) { const s = str(x, 30), k = trNorm(s); if (s && !gor.has(k)) { gor.add(k); g.push(s); } if (g.length >= 30) break; }
  return g.length ? g : [...GRUPLAR];
}
function temizMasaEk(v) { const o = { ad: str(v?.ad, 40), not: metin(v?.not, 200), kilit: !!v?.kilit, rezerve: !!v?.rezerve }; return o.ad || o.not || o.kilit || o.rezerve ? o : null; }
export const KOLEKSIYON = { davetliler: [temizDavetli, 2500], iliskiler: [temizIliski, 2500], gorevler: [temizGorev, 600], program: [temizProgram, 200] };

export function yeniDugun({ kod, salon, alan, plan, bilgi, simdi = Date.now() }) {
  const d = {
    kod, salon, alan: str(alan?.id, 24), alanAd: str(alan?.ad, 60), rev: '1-' + rastgele(5), son: [],
    bilgi: temizBilgi(bilgi, 'yonetici'), plan: temizPlan(plan || alan?.plan), masaEk: {}, ayar: temizAyar({}), gruplar: [...GRUPLAR],
    davetliler: [], iliskiler: [], gorevler: GOREV_GUN.map(([ad], i) => ({ id: 'g' + rastgele(7), ad, kim: '', tarih: '', bolum: 'gun', bitti: false, not: '', eklenme: simdi + i })),
    program: PROGRAM_SABLON.map(([saat, ad]) => ({ id: 'p' + rastgele(7), saat, ad, kim: '', not: '' })), olusturma: simdi, guncelleme: simdi,
  };
  return d;
}
/** Eski/eksik belgeyi güncel biçime getirir (güvenli okuma) */
export function belgeDuzelt(d) {
  d.plan = temizPlan(d.plan); d.ayar = temizAyar(d.ayar); d.bilgi = temizBilgi(d.bilgi || {}, 'yonetici', d.bilgi || {});
  d.gruplar = temizGruplar(d.gruplar); d.masaEk = d.masaEk && typeof d.masaEk === 'object' ? d.masaEk : {}; d.son = Array.isArray(d.son) ? d.son.slice(-200) : [];
  for (const [k, [tz]] of Object.entries(KOLEKSIYON)) d[k] = (Array.isArray(d[k]) ? d[k] : []).map((x) => tz(x, x)).filter(Boolean);
  return d;
}

// ---------------------------------------------------------------- işlemler (op) ve geri alma
const sec = (o, anahtarlar) => { const r = {}; for (const k of anahtarlar) r[k] = o?.[k] ?? null; return r; };
function tekUygula(d, op, rol) {
  if (!op || typeof op !== 'object') return null;
  if (op.k && KOLEKSIYON[op.k]) {
    const [tz, max] = KOLEKSIYON[op.k], L = d[op.k];
    if (op.t === 'ekle') {
      const v = tz(op.v); if (!v) return null;
      const i = L.findIndex((x) => x.id === v.id);
      if (i >= 0) { const eski = L[i]; L[i] = v; return [{ t: 'ekle', k: op.k, v: eski }]; }
      if (L.length >= max) return null;
      L.push(v); return [{ t: 'sil', k: op.k, id: v.id }];
    }
    const i = L.findIndex((x) => x.id === op.id); if (i < 0) return null;
    if (op.t === 'guncelle') {
      if (!op.v || typeof op.v !== 'object') return null;
      const eski = L[i], y = tz({ ...eski, ...op.v, id: eski.id }, eski); if (!y) return null;
      L[i] = y; return [{ t: 'guncelle', k: op.k, id: eski.id, v: sec(eski, Object.keys(op.v).filter((k) => k !== 'id')) }];
    }
    if (op.t === 'sil') { const [eski] = L.splice(i, 1); return [{ t: 'ekle', k: op.k, v: eski }]; }
    return null;
  }
  switch (op.t) {
    case 'ayar': { const eski = d.ayar; d.ayar = temizAyar({ ...eski, ...op.v }); return [{ t: 'ayar', v: sec(eski, Object.keys(op.v || {})) }]; }
    case 'bilgi': { const eski = d.bilgi; d.bilgi = temizBilgi(op.v || {}, rol, eski); return [{ t: 'bilgi', v: { ...eski } }]; }
    case 'gruplar': { const eski = d.gruplar; d.gruplar = temizGruplar(op.v); return [{ t: 'gruplar', v: eski }]; }
    case 'masaEk': {
      const id = idMi(op.id); if (!id) return null;
      const eski = d.masaEk[id] || null, y = temizMasaEk({ ...(eski || {}), ...(op.v || {}) });
      if (y) d.masaEk[id] = y; else delete d.masaEk[id];
      return [{ t: 'masaEk', id, v: eski || { ad: '', not: '', kilit: false, rezerve: false } }];
    }
    case 'plan': {
      if (rol === 'cift') return null;
      const eski = d.plan; d.plan = temizPlan(op.v);
      const ids = new Set(d.plan.masalar.map((m) => m.id)), t = [{ t: 'plan', v: eski }];
      for (const x of d.davetliler) if (x.masa && !ids.has(x.masa)) { t.push({ t: 'guncelle', k: 'davetliler', id: x.id, v: { masa: x.masa } }); x.masa = null; }
      return t;
    }
    default: return null;
  }
}
/** İşlemleri belgeye uygular; geri almak için ters işlem listesini (uygulanacak sırada) döndürür */
export function uygula(d, ops, rol = 'cift') {
  const ters = [];
  for (const op of Array.isArray(ops) ? ops.slice(0, 3000) : []) { let t = null; try { t = tekUygula(d, op, rol); } catch { t = null; } if (t) ters.unshift(...t); }
  return ters;
}

// ---------------------------------------------------------------- sayılar, doluluk, uyarılar
export const aktifMi = (x) => x.durum !== 'gelmiyor';
export function sayilar(d) {
  const s = { davet: 0, kisi: 0, geliyor: 0, bekliyor: 0, gelmiyor: 0, cocuk: 0, yerlesen: 0, yerlesmeyen: 0, yeni: 0, lcv: 0, gorev: d.gorevler.length, gorevBitti: 0 };
  const po = planOzet(d.plan); s.masa = po.masa; s.kapasite = po.kisi; s.ek = po.ek;
  const ids = new Set(d.plan.masalar.map((m) => m.id));
  for (const x of d.davetliler) {
    s.davet++; s.kisi += x.kisi; s[x.durum] += x.kisi; if (x.yeni) s.yeni++; if (x.lcv) s.lcv++;
    if (aktifMi(x)) { s.cocuk += x.cocuk; if (x.masa && ids.has(x.masa)) s.yerlesen += x.kisi; else s.yerlesmeyen += x.kisi; }
  }
  for (const g of d.gorevler) if (g.bitti) s.gorevBitti++;
  return s;
}
export function doluluk(d) {
  const M = new Map(d.plan.masalar.map((m) => [m.id, { masa: m, kisi: 0, cocuk: 0, liste: [], gelin: 0, damat: 0, ortak: 0, etiket: {} }]));
  for (const x of d.davetliler) {
    if (!x.masa || !aktifMi(x)) continue;
    const t = M.get(x.masa); if (!t) continue;
    t.kisi += x.kisi; t.cocuk += x.cocuk; t.liste.push(x); t[x.taraf] += x.kisi;
    for (const e of x.etiket) t.etiket[e] = (t.etiket[e] || 0) + 1;
  }
  return M;
}
export const masaAdi = (d, m) => (m ? (d.masaEk?.[m.id]?.ad || m.ad || (m.ozel === 'gelin-damat' ? 'Gelin & Damat' : '')) : '');
export const masaEtiket = (d, m) => (!m ? '' : m.ozel === 'gelin-damat' ? (masaAdi(d, m) || 'Gelin & Damat') : `Masa ${m.no}`);
export function uyarilar(d) {
  const u = [], dol = doluluk(d), ad = new Map(d.davetliler.map((x) => [x.id, x]));
  const s = sayilar(d);
  if (s.geliyor + s.bekliyor > s.kapasite + s.ek && s.kapasite > 0) u.push({ tur: 'hata', hedef: 'oturma', metin: `Gelecek ve yanıt bekleyen ${s.geliyor + s.bekliyor} kişi var; salonda ek sandalyelerle birlikte ${s.kapasite + s.ek} kişilik yer var.` });
  for (const t of dol.values()) {
    if (t.kisi > t.masa.kap + t.masa.ek) u.push({ tur: 'hata', masa: t.masa.id, metin: `${masaEtiket(d, t.masa)} dolu: ${t.kisi} kişi oturuyor, en fazla ${t.masa.kap + t.masa.ek} kişi sığar.` });
    else if (t.kisi > t.masa.kap) u.push({ tur: 'bilgi', masa: t.masa.id, metin: `${masaEtiket(d, t.masa)} için ${t.kisi - t.masa.kap} ek sandalye gerekiyor.` });
  }
  for (const r of d.iliskiler) {
    const a = ad.get(r.a), b = ad.get(r.b); if (!a || !b || !aktifMi(a) || !aktifMi(b)) continue;
    if (r.tur === 'ayri' && a.masa && a.masa === b.masa) u.push({ tur: 'uyari', masa: a.masa, metin: `${a.ad} ile ${b.ad} aynı masada; ayrı oturmaları istenmişti.` });
    if (r.tur === 'birlikte' && a.masa && b.masa && a.masa !== b.masa) u.push({ tur: 'uyari', davetli: a.id, metin: `${a.ad} ile ${b.ad} farklı masalarda; birlikte oturmaları istenmişti.` });
  }
  const ids = new Set(d.plan.masalar.map((m) => m.id));
  for (const x of d.davetliler) if (x.masa && ids.has(x.masa) && x.durum === 'gelmiyor') u.push({ tur: 'uyari', davetli: x.id, metin: `${x.ad} gelmeyeceğini bildirdi ama hâlâ bir masada görünüyor.` });
  if (s.yerlesmeyen > 0) u.push({ tur: 'bilgi', hedef: 'oturma', metin: `${s.yerlesmeyen} kişi henüz bir masaya yerleşmedi.` });
  if (s.yeni > 0) u.push({ tur: 'bilgi', hedef: 'yeni', metin: `${s.yeni} yeni katılım yanıtı var.` });
  return u;
}

// ---------------------------------------------------------------- otomatik yerleştirme
/**
 * Davetlileri masalara dağıtır. Gruplar (öncelik sırasıyla) sahneye en yakın masalardan başlar, aynı grup yan yana masalara,
 * taraflar istenirse sahnenin iki yanına ayrılır. "Birlikte" ilişkileri aynı masaya, "ayrı" ilişkileri farklı masalara konur.
 * Kilitli / rezerve / gelin-damat masalarına dokunmaz. Döndürür: { ops, yerlesen, kalan:[id], kalanKisi }
 */
export function otomatikYerlestir(d, o = {}) {
  const bastan = !!o.bastan, bekleyen = o.bekleyenler !== false, taraflar = o.taraflar !== false;
  const plan = d.plan, ek = d.masaEk || {}, s = sahneOf(plan), sol = solVektor(plan);
  const sx = s ? s.x : plan.en / 2, sy = s ? s.y : 0, gelinSol = d.ayar.gelinTarafi !== 'sag';
  const T = plan.masalar.filter((m) => !m.ozel && !ek[m.id]?.rezerve).map((m) => {
    const uz = sahneUzaklik(plan, m) ?? Math.hypot(m.x - sx, m.y - sy), yan = (m.x - sx) * sol.x + (m.y - sy) * sol.y;
    return { m, uz, bant: Math.round(uz / 1.5), yan, kilit: !!ek[m.id]?.kilit, dolu: 0, ids: new Set(), grup: new Map() };
  });
  const TM = new Map(T.map((t) => [t.m.id, t])), tumIds = new Set(plan.masalar.map((m) => m.id));
  const anahtar = (x) => x.taraf + '|' + trNorm(x.grup || 'diger');
  const yerles = (t, x) => { t.dolu += x.kisi; t.ids.add(x.id); const k = anahtar(x); t.grup.set(k, (t.grup.get(k) || 0) + x.kisi); };
  const yeni = new Map(); // id -> masa id | null
  const bekleyenler = [];
  for (const x of d.davetliler) {
    const t = x.masa && tumIds.has(x.masa) ? TM.get(x.masa) : null;
    const yerinde = x.masa && tumIds.has(x.masa) && (!bastan || !t || t.kilit);
    if (yerinde) { if (t && aktifMi(x)) yerles(t, x); continue; }
    if (x.masa && (bastan || !tumIds.has(x.masa))) yeni.set(x.id, null);
    if (x.durum === 'geliyor' || (bekleyen && x.durum === 'bekliyor')) bekleyenler.push(x);
  }
  // birlikte ilişkileri: birleşim-bul
  const ana = new Map(), bul = (a) => { while (ana.get(a) !== a) { ana.set(a, ana.get(ana.get(a))); a = ana.get(a); } return a; };
  for (const x of d.davetliler) ana.set(x.id, x.id);
  const ayri = new Map();
  for (const r of d.iliskiler) {
    if (!ana.has(r.a) || !ana.has(r.b)) continue;
    if (r.tur === 'birlikte') ana.set(bul(r.a), bul(r.b));
    else { (ayri.get(r.a) || ayri.set(r.a, new Set()).get(r.a)).add(r.b); (ayri.get(r.b) || ayri.set(r.b, new Set()).get(r.b)).add(r.a); }
  }
  const birimler = new Map();
  for (const x of bekleyenler) { const k = bul(x.id); (birimler.get(k) || birimler.set(k, []).get(k)).push(x); }
  const oncelik = (g) => { const i = d.gruplar.findIndex((z) => trNorm(z) === trNorm(g || 'diger')); return i < 0 ? 99 : i; };
  const maxKap = Math.max(1, ...T.map((t) => t.m.kap + t.m.ek));
  let B = [];
  for (const [kok, L] of birimler) {
    const bas = [...L].sort((a, b) => b.kisi - a.kisi)[0], boyut = L.reduce((n, x) => n + x.kisi, 0);
    const hedefId = d.davetliler.find((y) => bul(y.id) === kok && y.masa && TM.get(y.masa) && !L.includes(y))?.masa;
    const parcalar = boyut > maxKap ? L.map((x) => [x]) : [L];
    for (const p of parcalar) B.push({ L: p, boyut: p.reduce((n, x) => n + x.kisi, 0), taraf: bas.taraf, k: anahtar(bas), on: oncelik(bas.grup), hedef: hedefId ? TM.get(hedefId) : null });
  }
  B.sort((a, b) => a.on - b.on || a.k.localeCompare(b.k) || b.boyut - a.boyut);
  const tarafUyar = (t, taraf) => !taraflar || taraf === 'ortak' || Math.abs(t.yan) < 0.6 || ((t.yan > 0) === (taraf === 'gelin' ? gelinSol : !gelinSol));
  const sira = (L) => [...L].sort((a, b) => a.bant - b.bant || Math.abs(a.yan) - Math.abs(b.yan) || a.uz - b.uz);
  const SIRALI = sira(T.filter((t) => !t.kilit));
  function yerBul(b, adaylar, ekli) {
    let iyi = null, puan = Infinity;
    const ayr = new Set(); for (const x of b.L) for (const y of ayri.get(x.id) || []) ayr.add(y);
    adaylar.forEach((t, i) => {
      const bos = t.m.kap + (ekli ? t.m.ek : 0) - t.dolu; if (bos < b.boyut) return;
      for (const y of ayr) if (t.ids.has(y)) return;
      let p = i;
      if (b.hedef === t) p -= 1e6; else if (t.grup.get(b.k)) p -= 1000; else if (t.dolu > 0) p += 40;
      if (bos - b.boyut === 1) p += 2;
      if (p < puan) { puan = p; iyi = t; }
    });
    return iyi;
  }
  const kalan = [];
  for (const b of B) {
    const t = yerBul(b, SIRALI.filter((t) => tarafUyar(t, b.taraf)), false) || yerBul(b, SIRALI, false) || yerBul(b, SIRALI, true);
    if (!t) { kalan.push(...b.L); continue; }
    for (const x of b.L) { yerles(t, x); yeni.set(x.id, t.m.id); }
  }
  const ops = [];
  let yerlesen = 0;
  for (const x of d.davetliler) {
    if (!yeni.has(x.id)) continue;
    const m = yeni.get(x.id); if (m) yerlesen += x.kisi;
    if ((x.masa || null) !== m) ops.push({ t: 'guncelle', k: 'davetliler', id: x.id, v: { masa: m } });
  }
  return { ops, yerlesen, kalan: kalan.map((x) => x.id), kalanKisi: kalan.reduce((n, x) => n + x.kisi, 0) };
}

// ---------------------------------------------------------------- davetli sayfası
export function lcvEsle(d, ad) {
  const n = trNorm(ad); if (n.length < 3) return null;
  const esit = d.davetliler.filter((x) => trNorm(x.ad) === n);
  if (esit.length) return esit.length === 1 ? esit[0] : null;
  const DOLGU = new Set(['ailesi', 'aile', 've', 'bey', 'hanim', 'esi', 'cocuklari', 'ile']);
  const q = n.split(' ').filter((w) => !DOLGU.has(w));
  if (q.length < 2) return null;
  const aday = d.davetliler.filter((x) => { const t = trNorm(x.ad).split(' ').filter((w) => !DOLGU.has(w)); return t.length >= 2 && (t.every((w) => q.includes(w)) || q.every((w) => t.includes(w))); });
  return aday.length === 1 ? aday[0] : null;
}
export function bulucuAcikMi(d, simdi = Date.now()) {
  const a = d.ayar?.bulucu; if (a === 'acik') return true; if (a === 'kapali' || !tarihMi(d.bilgi?.tarih)) return false;
  const g0 = Date.parse(d.bilgi.tarih + 'T00:00:00+03:00');
  return simdi >= g0 - 12 * 3600e3 && simdi <= g0 + 36 * 3600e3;
}
export function lcvAcikMi(d, simdi = Date.now()) {
  if (d.ayar?.lcv !== 'acik') return false;
  const z = dugunZamani(d.bilgi); if (z && simdi > z + 4 * 3600e3) return false;
  return !(d.ayar.lcvSon && trBugun(simdi) > d.ayar.lcvSon);
}
export function genelPlan(d) {
  return { en: d.plan.en, boy: d.plan.boy, ogeler: d.plan.ogeler, masalar: d.plan.masalar.map((m) => ({ ...m, ad: masaAdi(d, m) })) };
}
/** Masa bulucu listesi: [ad, masa id|null, kişi] — sadece ad ve masa */
export function bulucuListe(d) {
  const ids = new Set(d.plan.masalar.map((m) => m.id));
  return d.davetliler.filter(aktifMi).map((x) => [x.ad, x.masa && ids.has(x.masa) ? x.masa : null, x.kisi]);
}
export function araEslesir(ad, q) {
  const t = trNorm(ad).split(' '), w = trNorm(q).split(' ').filter(Boolean);
  return w.length > 0 && w.every((p) => t.some((x) => x.startsWith(p)));
}
export function ozetCikar(d) {
  const s = sayilar(d);
  return { kod: d.kod, salon: d.salon, alan: d.alan, alanAd: d.alanAd || '', tur: d.bilgi.tur, tarih: d.bilgi.tarih, saat: d.bilgi.saat, gelin: d.bilgi.gelin, damat: d.bilgi.damat, davet: s.davet, kisi: s.kisi, geliyor: s.geliyor, bekliyor: s.bekliyor, gelmiyor: s.gelmiyor, yerlesen: s.yerlesen, kapasite: s.kapasite, lcv: s.lcv, gorev: s.gorev, gorevBitti: s.gorevBitti, olusturma: d.olusturma, guncelleme: d.guncelleme };
}
export function kodUret(b) {
  const a = slugla((b?.gelin || '').split(' ')[0], 14), c = slugla((b?.damat || '').split(' ')[0], 14);
  return [a, c].filter(Boolean).join('-') + (a || c ? '-' : 'davet-') + rastgele(3, 'abcdefghjkmnpqrstuvwxyz23456789');
}
export const ciftAdi = (b) => [b?.gelin, b?.damat].filter(Boolean).join(' & ') || 'Davet';
export const basHarf = (s) => (String(s || '').trim()[0] || '').toLocaleUpperCase('tr');
