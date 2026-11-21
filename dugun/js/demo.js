// Düğün Planla — demo verisi (kurgusal salon ve davetliler; gerçek kişi ya da işletme yoktur)
import * as C from './cekirdek.js?v=2026-11-21-g';

const ERKEK = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Murat', 'Ömer', 'Emre', 'Burak', 'Serkan', 'Kemal', 'Yusuf', 'Osman', 'Cem', 'Tolga', 'Onur', 'Volkan', 'Selim', 'Okan', 'Barış', 'Halil', 'Erkan', 'Levent', 'Uğur', 'Sinan', 'Kaan', 'Arda', 'Mert'];
const KADIN = ['Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Şerife', 'Sultan', 'Hacer', 'Esra', 'Merve', 'Büşra', 'Gizem', 'Derya', 'Seda', 'Ebru', 'Aslı', 'Pınar', 'Gül', 'Nur', 'Selin', 'Ece', 'Ceren', 'İrem', 'Damla', 'Sevgi', 'Nermin', 'Filiz', 'Canan'];
const SOYAD = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Erdoğan', 'Aksoy', 'Tekin', 'Güneş', 'Korkmaz', 'Avcı', 'Bulut', 'Ünal', 'Turan', 'Güler', 'Bozkurt', 'Karaca', 'Tuncer', 'Ekinci'];

function zar(tohum) { let s = tohum >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
/** Kurgusal davetli listesi: aileler, çiftler, tek kişiler; taraf ve grup dağılımı gerçekçi */
export function davetliUret(n = 120, tohum = 7, oran = { geliyor: 0.72, bekliyor: 0.2 }) {
  const r = zar(tohum), sec = (L) => L[Math.floor(r() * L.length)];
  const L = [], kul = new Set();
  const gruplar = [['Aile', 0.12], ['Akraba', 0.24], ['Yakın arkadaş', 0.14], ['Arkadaş', 0.2], ['İş', 0.16], ['Komşu', 0.09], ['Diğer', 0.05]];
  for (let i = 0; i < n * 3 && L.length < n; i++) {
    const tip = r(), soy = sec(SOYAD);
    let ad, kisi, cocuk = 0;
    if (tip < 0.3) { ad = `${sec(ERKEK)} ve ${sec(KADIN)} ${soy}`; kisi = 2; }
    else if (tip < 0.62) { ad = `${sec(r() < 0.5 ? ERKEK : KADIN)} ${soy} ailesi`; kisi = 3 + Math.floor(r() * 3); cocuk = Math.floor(r() * 3); }
    else { ad = `${sec(r() < 0.5 ? ERKEK : KADIN)} ${soy}`; kisi = 1; }
    if (kul.has(ad)) continue; kul.add(ad);
    let x = r(), grup = 'Diğer'; for (const [g, p] of gruplar) { if ((x -= p) < 0) { grup = g; break; } }
    const t = r(), taraf = t < 0.46 ? 'gelin' : t < 0.92 ? 'damat' : 'ortak';
    const d = r(), durum = d < oran.geliyor ? 'geliyor' : d < oran.geliyor + oran.bekliyor ? 'bekliyor' : 'gelmiyor';
    const etiket = []; if (r() < 0.06) etiket.push('vejetaryen'); if (cocuk && r() < 0.3) etiket.push('mama'); if (grup === 'Aile' && r() < 0.25) etiket.push('oncelikli');
    L.push({ id: 'o' + (L.length + 1), ad, kisi, cocuk: Math.min(cocuk, kisi - 1), taraf, grup, durum, etiket, tel: r() < 0.35 ? `05${30 + Math.floor(r() * 20)} ${String(100 + Math.floor(r() * 900))} ${String(10 + Math.floor(r() * 90))} ${String(10 + Math.floor(r() * 90))}` : '', eklenme: Date.now() - Math.floor(r() * 40) * 864e5 });
  }
  return L;
}
export const DEMO_SALON = {
  slug: 'ornek-salon', ad: 'Örnek Düğün Salonu',
  tema: { stil: 'acik', vurgu: '', kisaAd: 'Örnek Salon', slogan: 'Davet ve organizasyon' },
  iletisim: { adres: 'Gül Sokak No: 1, İstanbul', telefon: '0212 000 00 00', harita: '', instagram: '', web: '' },
};
export function demoAlanlar() {
  return [
    { id: 'kristal', ad: 'Kristal Salon', plan: C.planOlustur({ en: 34, boy: 26, adet: 40, kap: 10, ek: 1, sahneEn: 10, pistEn: 10, pistDerin: 7 }).plan },
    { id: 'bahce', ad: 'Bahçe', plan: C.planOlustur({ en: 28, boy: 20, adet: 22, kap: 8, ek: 2, sahneEn: 8, pistEn: 8, pistDerin: 6, gelinMasasi: true }).plan },
  ];
}
