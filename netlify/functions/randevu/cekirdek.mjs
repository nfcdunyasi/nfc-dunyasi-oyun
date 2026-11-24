// Randevu Vaktim — ortak çekirdek. Tarayıcıda (müşteri sayfası, paneller, önizleme) ve Netlify fonksiyonunda aynı kod çalışır.
// Saatler Türkiye saatiyle (UTC+3, yaz saati yok) gün içi dakika olarak tutulur: 09:30 → 570.

export const TR_OFSET = 3 * 3600e3;
let K = globalThis.crypto;
export const kriptoKur = (k) => { K = k; };

// ---------------------------------------------------------------- küçük yardımcılar
const HARF = 'abcdefghijkmnpqrstuvwxyz23456789'; // 32 karakter: l, o, 0, 1 yok
export function rastgele(n = 10, alfabe = HARF) { const b = K.getRandomValues(new Uint8Array(n)); let s = ''; for (const x of b) s += alfabe[x % alfabe.length]; return s; }
/** Okunaklı şifre: 4 harf + 4 rakam (ör. kmtp4825) */
export const sifreUret = () => rastgele(4, 'abcdefghjkmnpqrstuvwxyz') + rastgele(4, '23456789');
export const str = (v, n = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
export const metin = (v, n = 1000) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
export const sayi = (v, min, max, vars = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : vars; };
export const tamSayi = (v, min, max, vars = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : vars; };
export const ID_RE = /^[a-z0-9]{3,16}$/;
export const idMi = (v) => (ID_RE.test(String(v || '')) ? String(v) : '');
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const KULLANICI_RE = /^[a-z0-9][a-z0-9._-]{1,29}$/;
/** /randevu/<adres> altında işletme adresi olamayacak sözcükler */
export const AYRILMIS = new Set(['giris', 'panel', 'yonetim', 'demo', 'js', 'css', 'img', 'r', 'api', 'yeni', 'yardim', 'randevu', 'onizleme', 'admin', 'g', 'i']);
const TRK = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export const slugYap = (s, n = 50) => String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => TRK[c] || c).normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n).replace(/-+$/g, '');
/** Personel adından kullanıcı adı önerisi: "Harun Bey" → harun */
export const kullaniciOner = (ad) => slugYap(String(ad || '').replace(/\b(bey|hanım|hanim|usta)\b/gi, ''), 30).split('-')[0] || 'personel';

// ---------------------------------------------------------------- tarih ve saat
export const tarihMi = (v) => { v = String(v || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''; const d = new Date(v + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === v ? v : ''; };
export const saatMi = (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v) : '');
export const dkCoz = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m && +m[1] <= 24 && +m[2] < 60 ? Math.min(1440, +m[1] * 60 + +m[2]) : NaN; };
export const saatYaz = (dk) => (dk >= 1440 ? '24:00' : `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`);
export const trSimdi = (ms = Date.now()) => { const d = new Date(ms + TR_OFSET); return { tarih: d.toISOString().slice(0, 10), dk: d.getUTCHours() * 60 + d.getUTCMinutes(), gun: d.getUTCDay(), ms }; };
export const trBugun = (ms) => trSimdi(ms).tarih;
export const gunEkle = (t, n) => { const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const haftaGunu = (t) => new Date(t + 'T12:00:00Z').getUTCDay();
export const gunFark = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
/** Türkiye saatindeki tarih + dakika → zaman damgası (ms) */
export const trMs = (tarih, dk) => Date.parse(tarih + 'T00:00:00Z') - TR_OFSET + dk * 60e3;
export const ayOf = (ms) => trBugun(ms).slice(0, 7);
export const ayEkle = (ay, n) => { const [y, m] = ay.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
/** Pazartesiden başlayan hafta sırası */
export const HAFTA = [1, 2, 3, 4, 5, 6, 0];
export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export function tarihYaz(t, { gun = false, yil = true, kisa = false } = {}) {
  if (!tarihMi(t)) return '';
  const [y, m, d] = t.split('-').map(Number);
  const ay = kisa ? AYLAR[m - 1].slice(0, 3) : AYLAR[m - 1];
  return `${d} ${ay}${yil ? ' ' + y : ''}${gun ? ' ' + GUNLER[haftaGunu(t)] : ''}`;
}
/** "Bugün", "Yarın", "Salı" ya da "25 Kasım Salı" */
export function gunAdi(t, bugun) {
  const f = gunFark(bugun, t);
  if (f === 0) return 'Bugün'; if (f === 1) return 'Yarın'; if (f === -1) return 'Dün';
  if (f > 1 && f < 7) return GUNLER[haftaGunu(t)];
  return tarihYaz(t, { gun: true, yil: t.slice(0, 4) !== bugun.slice(0, 4) });
}
export const ayAdi = (ay, { yil = true, kisa = false } = {}) => { const [y, m] = String(ay).split('-').map(Number); const a = AYLAR[m - 1] || ''; return (kisa ? a.slice(0, 3) : a) + (yil ? ' ' + y : ''); };
export const sureYaz = (dk) => (dk < 60 ? `${dk} dk` : dk % 60 ? `${Math.floor(dk / 60)} sa ${dk % 60} dk` : `${dk / 60} saat`);

/** Özel ada Türkçe ek: ek('Harun Bey', 'in') → Harun Bey'in · ek('Elif Hanım', 'e') → Elif Hanım'a · ek('Ayşe', 'in') → Ayşe'nin */
const UNLU = 'aeıioöuüâîû';
export function ek(ad, tur = 'in') {
  const s = String(ad || '').trim(); if (!s) return s;
  let u = 'e'; for (let i = s.length - 1; i >= 0; i--) { const c = s[i].toLocaleLowerCase('tr'); if (UNLU.includes(c)) { u = c; break; } }
  const unluSon = UNLU.includes(s.slice(-1).toLocaleLowerCase('tr')), kalin = 'aıouâû'.includes(u);
  if (tur === 'e') return `${s}'${unluSon ? 'y' : ''}${kalin ? 'a' : 'e'}`;
  const v = { a: 'ı', ı: 'ı', â: 'ı', o: 'u', u: 'u', û: 'u', e: 'i', i: 'i', î: 'i', ö: 'ü', ü: 'ü' }[u] || 'i';
  return `${s}'${unluSon ? 'n' : ''}${v}n`;
}

// ---------------------------------------------------------------- telefon ve IBAN
/** Türkiye numarası → +90XXXXXXXXXX (geçersizse '') */
export function telNorm(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  return /^[2-58]\d{9}$/.test(d) ? '+90' + d : '';
}
export const cepMi = (n) => /^\+905\d{9}$/.test(n || '');
export const telYaz = (n) => { const d = String(n || '').replace(/^\+90/, ''); return /^\d{10}$/.test(d) ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : String(n || ''); };
export const ibanNorm = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export function ibanGecerli(v) {
  const s = ibanNorm(v); if (!/^TR\d{24}$/.test(s)) return false;
  let m = 0; for (const c of s.slice(4) + s.slice(0, 4)) { const x = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c; for (const d of x) m = (m * 10 + +d) % 97; }
  return m === 1;
}
export const ibanYaz = (v) => ibanNorm(v).replace(/(.{4})/g, '$1 ').trim();
const BANKALAR = {
  '00010': 'Ziraat Bankası', '00012': 'Halkbank', '00015': 'VakıfBank', '00032': 'TEB', '00046': 'Akbank', '00059': 'Şekerbank', '00062': 'Garanti BBVA',
  '00064': 'İş Bankası', '00067': 'Yapı Kredi', '00099': 'ING', '00103': 'Fibabanka', '00111': 'QNB', '00123': 'HSBC', '00124': 'Alternatif Bank', '00125': 'Burgan Bank',
  '00134': 'DenizBank', '00135': 'Anadolubank', '00146': 'Odeabank', '00203': 'Albaraka Türk', '00205': 'Kuveyt Türk', '00206': 'Türkiye Finans',
  '00209': 'Ziraat Katılım', '00210': 'Vakıf Katılım', '00211': 'Emlak Katılım',
};
export const bankaAdi = (v) => { const s = ibanNorm(v); return /^TR\d{24}$/.test(s) ? BANKALAR[s.slice(4, 9)] || '' : ''; };

// ---------------------------------------------------------------- işletme türleri ve tema
export const TURLER = [
  ['berber', 'Berber', 'Usta'], ['kuafor', 'Kuaför', 'Uzman'], ['guzellik', 'Güzellik merkezi', 'Uzman'], ['tirnak', 'Tırnak stüdyosu', 'Uzman'],
  ['dovme', 'Dövme stüdyosu', 'Sanatçı'], ['spa', 'Masaj ve spa', 'Terapist'], ['klinik', 'Klinik ve danışmanlık', 'Uzman'], ['diger', 'Diğer', 'Personel'],
];
export const turAd = (t) => (TURLER.find((x) => x[0] === t) || TURLER[7])[1];
/** Müşteri ekranında personele verilen ad: "Usta seçin", "Uzman seçin" */
export const personelAd = (t) => (TURLER.find((x) => x[0] === t) || TURLER[7])[2];
/** Çoğul eki ünlü uyumuyla: Usta → Ustalar, Terapist → Terapistler */
export const cogul = (ad) => { const m = String(ad).match(/[aıouâeiöüAIOUEİÖÜ](?=[^aıouâeiöüAIOUEİÖÜ]*$)/); return ad + (m && /[eiöüEİÖÜ]/.test(m[0]) ? 'ler' : 'lar'); };
/** Beş zemin: açık, krem, koyu, kömür (sıcak siyah), gece (lacivert) */
export const STILLER = {
  acik: { ad: 'Açık', koyu: false, zemin: '#f4f4f5', yuzey: '#ffffff', yuzey2: '#f4f4f5', kontrol: '#e7e7ea', yazi: '#18181b', soluk: '#5b5b63', silik: '#8a8a93', cizgi: '#e7e7ea', cizgi2: '#d6d6db' },
  krem: { ad: 'Krem', koyu: false, zemin: '#f4f1ec', yuzey: '#fffdfa', yuzey2: '#f4f1ec', kontrol: '#e8e2d8', yazi: '#22201c', soluk: '#625b52', silik: '#8a8276', cizgi: '#e8e2d8', cizgi2: '#d9d1c4' },
  koyu: { ad: 'Koyu', koyu: true, zemin: '#09090b', yuzey: '#141416', yuzey2: '#1f1f23', kontrol: '#2b2b30', yazi: '#f4f4f5', soluk: '#a1a1aa', silik: '#84848d', cizgi: '#27272c', cizgi2: '#3a3a40' },
  komur: { ad: 'Kömür', koyu: true, zemin: '#0f0e0c', yuzey: '#1a1815', yuzey2: '#25221e', kontrol: '#322e29', yazi: '#f4efe8', soluk: '#b3a99d', silik: '#91877b', cizgi: '#2e2a25', cizgi2: '#403a34' },
  gece: { ad: 'Gece', koyu: true, zemin: '#0a0f1b', yuzey: '#121a2b', yuzey2: '#1a2439', kontrol: '#243049', yazi: '#eef2fa', soluk: '#a3aec4', silik: '#8590a8', cizgi: '#222d44', cizgi2: '#2f3b57' },
};
export const YAZILAR = {
  modern: { ad: 'Modern', aile: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  klasik: { ad: 'Klasik', aile: "ui-serif, 'New York', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif" },
  yuvarlak: { ad: 'Yuvarlak', aile: "ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif" },
};
export const VURGULAR = [['#18181b', 'Siyah'], ['#3f3f46', 'Antrasit'], ['#1e3a8a', 'Lacivert'], ['#1d4ed8', 'Mavi'], ['#0f766e', 'Petrol'], ['#15803d', 'Yeşil'],
  ['#9f1239', 'Bordo'], ['#be185d', 'Fuşya'], ['#e11d48', 'Gül'], ['#c2410c', 'Turuncu'], ['#a16207', 'Hardal'], ['#6d28d9', 'Mor']];
export const HAZIR_TEMA = {
  berber: { stil: 'acik', vurgu: '#18181b', yazi: 'modern' }, kuafor: { stil: 'acik', vurgu: '#9f1239', yazi: 'modern' },
  guzellik: { stil: 'acik', vurgu: '#be185d', yazi: 'modern' }, tirnak: { stil: 'acik', vurgu: '#e11d48', yazi: 'modern' },
  dovme: { stil: 'koyu', vurgu: '#f4f4f5', yazi: 'modern' }, spa: { stil: 'krem', vurgu: '#0f766e', yazi: 'modern' },
  klinik: { stil: 'acik', vurgu: '#1d4ed8', yazi: 'modern' }, diger: { stil: 'acik', vurgu: '#4338ca', yazi: 'modern' },
};
/** Hizmetlerin gruplanacağı başlık önerileri (işletme dilediğini yazar) */
export const KATEGORI_ONER = {
  berber: ['Saç', 'Sakal', 'Paket', 'Bakım', 'Çocuk'], kuafor: ['Kesim', 'Fön ve şekillendirme', 'Boya', 'Bakım', 'Gelin'],
  guzellik: ['Cilt bakımı', 'Kaş ve kirpik', 'Ağda', 'Makyaj'], tirnak: ['Manikür', 'Pedikür', 'Kalıcı oje', 'Protez tırnak'],
  dovme: ['Dövme', 'Piercing', 'Görüşme'], spa: ['Masaj', 'Bakım', 'Paket'], klinik: ['Görüşme', 'Seans', 'Kontrol'], diger: ['Hizmetler'],
};
const RENK_RE = /^#[0-9a-f]{6}$/i;
export function temaTemiz(t = {}, tur = 'diger') {
  const h = HAZIR_TEMA[tur] || HAZIR_TEMA.diger;
  return { stil: STILLER[t.stil] ? t.stil : h.stil, vurgu: RENK_RE.test(t.vurgu || '') ? t.vurgu.toLowerCase() : h.vurgu, yazi: YAZILAR[t.yazi] ? t.yazi : h.yazi };
}
const hexRgb = (h) => { const n = parseInt(String(h || '#000000').slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const parlaklik = (h) => { const [r, g, b] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const karistir = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
/** Renkli zemin üstündeki yazı: beyaz ya da koyu, hangisinin karşıtlığı yüksekse */
export const yaziRengi = (h) => { const L = parlaklik(h), b = 1.05 / (L + 0.05), k = (L + 0.05) / 0.056; return b >= 4.5 || b >= k * 0.9 ? '#ffffff' : '#141210'; };
/** Tema → CSS değişkenleri. Açık zeminde soluk vurgu koyulaştırılır, koyu zeminde siyah vurgu açılır. */
export function temaDegiskenleri(tema) {
  const t = temaTemiz(tema), s = STILLER[t.stil];
  let v = t.vurgu;
  if (!s.koyu && parlaklik(v) > 0.45) v = karistir(v, '#000000', 0.45);
  if (s.koyu && parlaklik(v) < 0.03) v = '#f2efe9';
  const [r, g, b] = hexRgb(v);
  const d = { zemin: s.zemin, yuzey: s.yuzey, yuzey2: s.yuzey2, kontrol: s.kontrol, yazi: s.yazi, soluk: s.soluk, silik: s.silik, cizgi: s.cizgi, cizgi2: s.cizgi2 };
  d.vurgu = v; d['vurgu-yazi'] = yaziRengi(v);
  d['vurgu-acik'] = `rgb(${r} ${g} ${b} / ${s.koyu ? 0.18 : 0.1})`;
  d['vurgu-koyu'] = s.koyu ? (parlaklik(v) < 0.12 ? karistir(v, '#ffffff', 0.45) : v) : parlaklik(v) > 0.18 ? karistir(v, '#000000', 0.3) : v;
  d.baslik = YAZILAR.modern.aile; // tek, sade yazı ailesi (eski kayıtlardaki yazı seçimi yok sayılır)
  return { degisken: d, koyu: s.koyu, zemin: s.zemin };
}
/** Logosu olmayan işletme ve personel için baş harfler: "Hüseyin Özdemir Barbers Club" → HÖ */
export function basHarf(ad, n = 2) {
  const k = String(ad || '').replace(/\b(bey|hanım|hanim)\b/gi, '').trim().split(/\s+/).filter((w) => /^[\p{L}\d]/u.test(w));
  return k.slice(0, n).map((w) => w[0].toLocaleUpperCase('tr')).join('') || '?';
}

// ---------------------------------------------------------------- çalışma saatleri
/** { 0..6: [[başDk, bitişDk], …] }; 0 = Pazar. Varsayılan: Pzt–Cmt 09:00–21:00, Pazar kapalı */
export const VARS_CALISMA = { 0: [], 1: [[540, 1260]], 2: [[540, 1260]], 3: [[540, 1260]], 4: [[540, 1260]], 5: [[540, 1260]], 6: [[540, 1260]] };
export function birlestir(L) {
  const s = L.filter((r) => r[1] > r[0]).map((r) => [r[0], r[1]]).sort((a, b) => a[0] - b[0]), o = [];
  for (const r of s) { const son = o[o.length - 1]; if (son && r[0] <= son[1]) son[1] = Math.max(son[1], r[1]); else o.push(r); }
  return o;
}
export function calismaTemiz(c) {
  const o = {};
  for (let g = 0; g < 7; g++) {
    const L = Array.isArray(c?.[g]) ? c[g] : [];
    o[g] = birlestir(L.slice(0, 4).map((r) => [tamSayi(r?.[0], 0, 1440, 0), tamSayi(r?.[1], 0, 1440, 0)]).map(([a, b]) => [a - (a % 5), b - (b % 5)])).slice(0, 4);
  }
  return o;
}
export const calismaYaz = (L) => (L && L.length ? L.map(([a, b]) => `${saatYaz(a)}–${saatYaz(b)}`).join(', ') : 'Kapalı');
/** Tarih aralıkları (izin, tatil): [{ bas, bit, neden }] */
export function aralikTemiz(L, n = 60) {
  return (Array.isArray(L) ? L : []).map((x) => ({ bas: tarihMi(x?.bas), bit: tarihMi(x?.bit) || tarihMi(x?.bas), neden: str(x?.neden, 60) }))
    .filter((x) => x.bas && x.bit >= x.bas).sort((a, b) => a.bas.localeCompare(b.bas)).slice(-n);
}
const aralikta = (L, t) => (L || []).some((x) => t >= x.bas && t <= x.bit);
/** O gün personelin çalıştığı aralıklar (işletme tatili ve personel izni düşülür) */
export function gunCalisma(isletme, personel, tarih) {
  if (aralikta(isletme?.kapali, tarih) || aralikta(personel?.izinler, tarih)) return [];
  const c = personel?.calisma || isletme?.calisma || VARS_CALISMA;
  return (c[haftaGunu(tarih)] || []).map((r) => [r[0], r[1]]);
}
export const izinde = (isletme, personel, tarih) => aralikta(isletme?.kapali, tarih) ? 'kapali' : aralikta(personel?.izinler, tarih) ? 'izin' : '';

// ---------------------------------------------------------------- randevu durumu ve müsaitlik
export const DURUM = {
  odeme: { ad: 'Ödeme bekleniyor', kisa: 'Ödeme bekleniyor', sinif: 'uyari' },
  kontrol: { ad: 'Ödeme kontrol ediliyor', kisa: 'Onay bekliyor', sinif: 'uyari' },
  onay: { ad: 'Onaylandı', kisa: 'Onaylı', sinif: 'iyi' },
  iptal: { ad: 'İptal edildi', kisa: 'İptal', sinif: 'hata' },
  gelmedi: { ad: 'Gelmedi', kisa: 'Gelmedi', sinif: 'hata' },
};
/** Saati dolduran randevu: onaylı, onay bekleyen ya da süresi dolmamış ödeme bekleyen */
export const bloklar = (r, simdi) => r.durum === 'onay' || r.durum === 'kontrol' || (r.durum === 'odeme' && (r.son || 0) > simdi);
export function doluAraliklar(gun, simdi, ara = 0) {
  const L = [];
  for (const r of gun?.r || []) if (bloklar(r, simdi)) L.push([r.bas, r.bit + ara]);
  for (const k of gun?.k || []) L.push([k.bas, k.bit]);
  return birlestir(L);
}
/** Seçilebilir başlangıç saatleri. dolu: birleştirilmiş dolu aralıklar; enErken: bu dakikadan önce başlayanlar listelenmez */
export function saatListesi({ calisma = [], dolu = [], sure = 30, adim = 30, ara = 0, enErken = -1 }) {
  const out = [];
  for (const [a, b] of calisma) for (let t = a; t + sure <= b; t += adim) {
    if (t < enErken) continue;
    out.push({ dk: t, bos: !dolu.some(([x, y]) => t < y && t + sure + ara > x) });
  }
  return out;
}
export const cakisir = (dolu, bas, sure, ara = 0) => dolu.some(([x, y]) => bas < y && bas + sure + ara > x);

// ---------------------------------------------------------------- kurallar
export const AYAR_VARS = { onOdeme: 'tam', kapora: 100, odemeSure: 15, ileriGun: 30, enAzOnce: 60, adim: 30, ara: 0, iptalSaat: 3 };
export const ON_ODEME = [['tam', 'Hizmet ücretinin tamamı'], ['kapora', 'Sabit kapora'], ['yok', 'Ön ödeme yok (usta onaylar)']];
export function ayarTemiz(a = {}) {
  a = a && typeof a === 'object' ? a : {};
  const sec = (v, L, d) => (L.includes(+v) ? +v : d);
  return {
    onOdeme: ON_ODEME.some((x) => x[0] === a.onOdeme) ? a.onOdeme : AYAR_VARS.onOdeme,
    kapora: sayi(a.kapora, 0, 1e6, AYAR_VARS.kapora),
    odemeSure: sec(a.odemeSure, [10, 15, 20, 30, 45, 60], 15),
    ileriGun: sec(a.ileriGun, [7, 14, 21, 30, 45, 60, 90], 30),
    enAzOnce: sec(a.enAzOnce, [0, 15, 30, 60, 120, 180, 360, 720, 1440], 60),
    adim: sec(a.adim, [10, 15, 20, 30, 45, 60], 30),
    ara: sec(a.ara, [0, 5, 10, 15, 20, 30], 0),
    iptalSaat: sec(a.iptalSaat, [0, 1, 2, 3, 6, 12, 24, 48], 3),
  };
}
/** Müşterinin önceden göndereceği tutar */
export const onOdemeTutar = (ayar, toplam) => (ayar.onOdeme === 'yok' ? 0 : ayar.onOdeme === 'kapora' ? Math.min(toplam, ayar.kapora || 0) : toplam);
export const SURELER = [10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360];

// ---------------------------------------------------------------- yeni işletme için hizmet örnekleri (fiyatlar örnektir)
export const HIZMET_SABLON = {
  berber: [['Saç kesimi', 30, 400, 'Saç'], ['Sakal tıraşı', 20, 250, 'Sakal'], ['Saç + sakal', 45, 600, 'Paket'], ['Çocuk saç kesimi', 30, 300, 'Çocuk'], ['Cilt bakımı', 30, 450, 'Bakım'],
    ['Yıkama ve fön', 15, 150, 'Saç'], ['Sakal şekillendirme', 20, 200, 'Sakal'], ['Damat tıraşı', 90, 1500, 'Paket'], ['Saç boyama', 45, 600, 'Saç'], ['Ağda (burun, kulak)', 10, 100, 'Bakım']],
  kuafor: [['Saç kesimi', 45, 600, 'Kesim'], ['Fön', 30, 300, 'Fön ve şekillendirme'], ['Maşa', 45, 450, 'Fön ve şekillendirme'], ['Dip boya', 90, 1200, 'Boya'], ['Saç boyama', 120, 1500, 'Boya'],
    ['Röfle', 150, 2500, 'Boya'], ['Keratin bakım', 120, 2000, 'Bakım'], ['Saç bakım maskesi', 30, 400, 'Bakım'], ['Gelin saçı', 120, 3000, 'Gelin']],
  guzellik: [['Klasik cilt bakımı', 60, 900, 'Cilt bakımı'], ['Hydrafacial', 60, 1800, 'Cilt bakımı'], ['Kaş tasarımı', 20, 250, 'Kaş ve kirpik'], ['Kirpik lifting', 60, 800, 'Kaş ve kirpik'],
    ['İpek kirpik', 90, 1200, 'Kaş ve kirpik'], ['Tüm vücut ağda', 60, 900, 'Ağda'], ['Bölgesel ağda', 20, 250, 'Ağda'], ['Günlük makyaj', 45, 900, 'Makyaj']],
  tirnak: [['Manikür', 45, 400, 'Manikür'], ['Pedikür', 60, 500, 'Pedikür'], ['Kalıcı oje', 60, 550, 'Kalıcı oje'], ['Kalıcı oje çıkarma', 20, 150, 'Kalıcı oje'],
    ['Protez tırnak', 120, 1200, 'Protez tırnak'], ['Protez tırnak dolgu', 90, 800, 'Protez tırnak'], ['Nail art (tırnak başı)', 10, 50, 'Kalıcı oje']],
  dovme: [['Ön görüşme', 30, 0, 'Görüşme'], ['Minimal dövme', 60, 1500, 'Dövme'], ['Orta boy dövme', 180, 4000, 'Dövme'], ['Kapatma (cover-up)', 180, 5000, 'Dövme'], ['Piercing', 20, 600, 'Piercing']],
  spa: [['Klasik masaj', 50, 1200, 'Masaj'], ['Aromaterapi masajı', 60, 1400, 'Masaj'], ['Sıcak taş masajı', 75, 1800, 'Masaj'], ['Bali masajı', 60, 1500, 'Masaj'],
    ['Kese köpük', 30, 600, 'Bakım'], ['Çift masajı', 60, 2600, 'Paket']],
  klinik: [['Ön görüşme', 30, 0, 'Görüşme'], ['Seans', 50, 1000, 'Seans'], ['Kontrol', 20, 500, 'Kontrol']],
  diger: [['Randevu', 30, 0, 'Hizmetler']],
};

// ---------------------------------------------------------------- açık / kapalı ve arama
/** Şu an açık mı; değilse ne zaman açılacak. s: işletme (calisma, kapali), sim: trSimdi() */
export function acikDurum(s, sim) {
  const bugun = gunCalisma(s, null, sim.tarih);
  const simdi = bugun.find(([a, b]) => sim.dk >= a && sim.dk < b);
  if (simdi) {
    const kapanis = bugun.reduce((son, [a, b]) => (a <= son ? Math.max(son, b) : son), simdi[1]);
    return { acik: true, kisa: 'Açık', metin: `Açık · Kapanış ${saatYaz(kapanis >= 1440 ? 1439 : kapanis)}` };
  }
  const sonra = bugun.find(([a]) => a > sim.dk);
  if (sonra) return { acik: false, kisa: 'Kapalı', metin: `Kapalı · Açılış ${saatYaz(sonra[0])}` };
  for (let i = 1; i <= 14; i++) {
    const t = gunEkle(sim.tarih, i), c = gunCalisma(s, null, t);
    if (c.length) return { acik: false, kisa: 'Kapalı', metin: `Kapalı · Açılış ${i === 1 ? 'yarın' : GUNLER[haftaGunu(t)].toLocaleLowerCase('tr')} ${saatYaz(c[0][0])}` };
  }
  return { acik: false, kisa: 'Kapalı', metin: 'Şu an randevu almıyor' };
}
/** Türkçe harf duyarsız arama için sadeleştirme: "Şükrü Çağlar" → "sukru caglar" */
export const katla = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (h) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[h]).replace(/[^a-z0-9]+/g, ' ').trim();
/** Usta profilinde önerilen uzmanlıklar (işletme türüne göre) */
export const UZMANLIK_ONER = {
  berber: ['Skin fade', 'Klasik kesim', 'Makas kesim', 'Sakal tasarımı', 'Ustura tıraş', 'Çocuk kesimi', 'Damat tıraşı', 'Perma', 'Saç boyama', 'Cilt bakımı'],
  kuafor: ['Kesim', 'Fön', 'Boya', 'Balyaj', 'Ombre', 'Keratin', 'Topuz', 'Gelin saçı', 'Perma', 'Saç bakımı'],
  guzellik: ['Cilt bakımı', 'Kaş tasarımı', 'Kirpik lifting', 'İpek kirpik', 'Ağda', 'Makyaj', 'Gelin makyajı', 'Hydrafacial'],
  tirnak: ['Kalıcı oje', 'Protez tırnak', 'Nail art', 'Manikür', 'Pedikür', 'Jel güçlendirme', 'French'],
  dovme: ['Fine line', 'Minimal', 'Realistik', 'Old school', 'Yazı (lettering)', 'Kapatma (cover-up)', 'Siyah gri', 'Renkli'],
  spa: ['Klasik masaj', 'Derin doku masajı', 'Aromaterapi', 'Sıcak taş', 'Hamam', 'Kese köpük', 'Refleksoloji'],
  klinik: ['Cilt analizi', 'Lazer epilasyon', 'Dolgu', 'Botoks', 'Mezoterapi', 'Diyet danışmanlığı'],
  diger: [],
};
/** 81 il (Türk alfabesi sırasıyla). Vitrindeki şehir süzgeci aynı yazımla çalışsın diye işletme şehri buradan seçilir. */
export const SEHIRLER = ('Adana Adıyaman Afyonkarahisar Ağrı Aksaray Amasya Ankara Antalya Ardahan Artvin Aydın Balıkesir Bartın Batman Bayburt Bilecik Bingöl Bitlis Bolu Burdur Bursa '
  + 'Çanakkale Çankırı Çorum Denizli Diyarbakır Düzce Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Iğdır Isparta İstanbul İzmir Kahramanmaraş '
  + 'Karabük Karaman Kars Kastamonu Kayseri Kırıkkale Kırklareli Kırşehir Kilis Kocaeli Konya Kütahya Malatya Manisa Mardin Mersin Muğla Muş Nevşehir Niğde Ordu Osmaniye Rize '
  + 'Sakarya Samsun Siirt Sinop Sivas Şanlıurfa Şırnak Tekirdağ Tokat Trabzon Tunceli Uşak Van Yalova Yozgat Zonguldak').split(' ');
/** Yazılan şehri listedeki yazımına çevirir (istanbul → İstanbul); listede yoksa olduğu gibi bırakır */
export const sehirBul = (s) => { const k = katla(s); return (k && SEHIRLER.find((x) => katla(x) === k)) || str(s, 40); };

// ---------------------------------------------------------------- NFC Dünyası aboneliği (işletmenin aylık ücreti)
/** Aylık hesap: sabit tutar + etkin personel başına ücret. Ödeme günü geçip kalan varsa gecikti. */
export function aboneAy(s, ay, bugun) {
  const o = s.odeme || {}, odenen = (s.odemeler || []).filter((p) => p.donem === ay).reduce((n, p) => n + (+p.tutar || 0), 0);
  const vade = `${ay}-${String(Math.min(28, Math.max(1, o.gun || 1))).padStart(2, '0')}`;
  const kisi = (s.personel || []).filter((p) => p.aktif !== false).length;
  const tutar = o.periyot === 'yok' ? 0 : (+o.tutar || 0) + (+o.personelBasi || 0) * kisi;
  const bas = o.baslangic ? o.baslangic.slice(0, 7) : ayOf(s.olusturma || Date.now());
  if (ay < bas) return odenen ? { ay, tutar: 0, odenen, kalan: 0, durum: 'odendi', vade, kisi } : null;
  if (s.aktif === false && !odenen) return null; // kapalı işletme ücret biriktirmez
  if (!tutar) return odenen ? { ay, tutar: 0, odenen, kalan: 0, durum: 'odendi', vade, kisi } : null;
  const kalan = Math.max(0, tutar - odenen);
  return { ay, tutar, odenen, kalan, durum: kalan <= 0 ? 'odendi' : bugun > vade ? 'gecikti' : 'bekliyor', vade, kisi };
}
export const aboneYazi = (s, TL) => { const o = s.odeme || {}; if (o.periyot === 'yok') return 'Ücretsiz'; const p = []; if (+o.tutar) p.push(`${TL(o.tutar)} / ay`); if (+o.personelBasi) p.push(`personel başı ${TL(o.personelBasi)}`); return p.join(' + ') || 'Ücret girilmedi'; };
