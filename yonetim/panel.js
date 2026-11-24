// Okut ve Oyna · Yönetici paneli (nfcdunyasi.com/yonetim)
// İşletmeler ve temaları, takip durumu, QR kartları, ödemeler ve oyun soruları tek yerden yönetilir.
// Veriler Netlify fonksiyonunda (/api) saklanır; yerleşik temalar /oyun/js/themes.js içinden okunur.
import { THEMES } from '/oyun/js/themes.js?v=2026-11-22-c';
import { qrMatris } from '/yonetim/qr.js?v=2026-11-22-c';

const SITE = 'https://nfcdunyasi.com';
const SUNUCU = String(window.OYUN_SUNUCU || '').replace(/\/+$/, '');
const VARS = [
  ['gece', 'Arka plan', 'sayfanın ana rengi'],
  ['morarti', 'Koyu arka plan', 'kutular, gölgeler'],
  ['murekkep', 'Çizgi ve yazı', 'en koyu renk'],
  ['ortu', 'Açık renk', 'başlık ve kartlar'],
  ['limon', 'Vurgu', 'ana düğmeler'],
  ['cay', 'İkinci vurgu', 'ikincil düğmeler'],
];
const DURUMLAR = [
  ['gorusme', '🤝', 'Görüşüldü'],
  ['tasarim', '🎨', 'Tema hazırlanıyor'],
  ['onay', '👀', 'Onay bekliyor'],
  ['qr', '🖨️', 'QR basıldı'],
  ['yayinda', '✅', 'Yayında'],
];
// Yerleşik temaların süs emojileri (oyun sayfasındakiyle aynı)
const DECO_STATIK = {
  'chicken-rice-crush': ['🍗', '🍚', '🍛', '🐔', '🥘', '🌶️'], 'durum-max': ['🌯', '🥙', '🌶️', '🍟', '🔥'], springfield: ['🌯', '🔥', '🥙', '🌶️', '🍟'],
  'fried-chiko': ['🍗', '🐔', '🍟', '🥤', '🍔'], 'los-bravos': ['🍗', '🍔', '🍟', '🐔', '🔥', '🥤'], eliz: ['🧇', '🍓', '🍫', '🍨', '🍌', '🥤'],
};
const EMOJI_ONERI = ['🍔', '🍕', '🌯', '🥙', '🍗', '🍟', '🌭', '🍝', '🍣', '🥗', '🥩', '🍳', '☕', '🍵', '🥤', '🧋', '🍹', '🍺', '🧇', '🥞', '🍰', '🧁', '🍩', '🍦', '🍫', '🍓', '🍌', '🍉', '🔥', '🌶️', '⭐', '🎉'];
const PALETLER = [
  ['NFC moru', { gece: '28 22 51', morarti: '46 37 85', murekkep: '18 14 34', ortu: '255 246 233', limon: '255 210 63', cay: '224 65 47' }],
  ['Ateş', { gece: '196 52 22', morarti: '128 30 10', murekkep: '36 12 6', ortu: '255 245 230', limon: '255 204 51', cay: '120 20 10' }],
  ['Okyanus', { gece: '12 120 150', morarti: '6 80 104', murekkep: '8 32 44', ortu: '240 252 255', limon: '255 214 92', cay: '4 58 76' }],
  ['Orman', { gece: '36 120 64', morarti: '22 80 42', murekkep: '12 34 18', ortu: '246 255 240', limon: '255 214 64', cay: '160 54 30' }],
  ['Kahve', { gece: '110 66 40', morarti: '74 42 24', murekkep: '34 18 10', ortu: '255 246 232', limon: '242 180 80', cay: '60 30 14' }],
  ['Şeker', { gece: '226 70 132', morarti: '160 36 90', murekkep: '50 12 30', ortu: '255 243 248', limon: '255 214 90', cay: '120 30 160' }],
];

const S = { token: '', isletmeler: new Map(), sorular: {}, bankalar: null, hazir: false };
let E = null;      // açık düzenleyici
let SQ = { q: '', f: 'hepsi', n: 150 }; // soru listesi filtresi
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const kopya = (o) => JSON.parse(JSON.stringify(o));
const TL = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(n) || 0);
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d) => ymd(d).slice(0, 7);
const ayAdi = (k) => { const [y, m] = k.split('-'); return `${AYLAR[+m - 1]} ${y}`; };
const tarihYaz = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${+d} ${AYLAR[+m - 1]} ${y}`; };
const rgb2hex = (s) => '#' + String(s || '0 0 0').split(' ').map((x) => Math.max(0, Math.min(255, +x || 0)).toString(16).padStart(2, '0')).join('');
const hex2rgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return '0 0 0'; const n = parseInt(m[1], 16); return `${n >> 16} ${(n >> 8) & 255} ${n & 255}`; };
const graf = (s) => { try { return [...new Intl.Segmenter('tr', { granularity: 'grapheme' }).segment(s)].map((x) => x.segment); } catch { return Array.from(s); } };
const slugla = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const QR_AD = { eliz: 'eliz-cups-bowl' }; // basılı QR'da görünen ad
const qrUrl = (slug) => `${SITE}/q/${QR_AD[slug] || slug}`;

function bildir(m, hata = false) {
  const d = document.createElement('div'); d.textContent = m; if (hata) d.className = 'hata';
  $('#bildirim').appendChild(d); setTimeout(() => d.remove(), hata ? 5200 : 2800);
}
async function api(yol, { method = 'GET', body } = {}) {
  let r;
  try { r = await fetch('/api' + yol, { method, headers: { 'content-type': 'application/json', ...(S.token ? { authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined }); } catch { throw new Error('İnternet bağlantısı yok gibi görünüyor'); }
  let d = null; try { d = await r.json(); } catch { /* boş */ }
  if (r.status === 401 && yol !== '/giris') { cikis(true); throw new Error(d?.hata || 'Oturum kapandı, tekrar giriş yap'); }
  if (!r.ok) throw new Error(d?.hata || `Kaydedilemedi (hata ${r.status})`);
  return d;
}
// oyun sunucusuna "panel verisi değişti, yeniden al" haberi (sonuç beklenmez)
function sunucuyaHaber() { if (SUNUCU) fetch(SUNUCU + '/veri-yenile', { method: 'POST', mode: 'no-cors' }).catch(() => {}); }

// ---------------------------------------------------------------- veri
function bosIsletme(slug, ad = '') {
  return { slug, ad, yerlesik: false, aktif: true, durum: 'gorusme', notlar: '', kisi: '', telefon: '', adres: '', odeme: { tutar: 0, gun: 1, baslangic: '', periyot: 'aylik' }, odemeler: [], tema: null };
}
function hepsi() {
  const m = new Map();
  for (const [slug, t] of Object.entries(THEMES)) m.set(slug, { ...bosIsletme(slug, t.name), yerlesik: true, durum: 'yayinda' });
  for (const x of S.isletmeler.values()) m.set(x.slug, { ...(m.get(x.slug) || bosIsletme(x.slug)), ...x, yerlesik: !!THEMES[x.slug] || !!x.yerlesik });
  return [...m.values()].sort((a, b) => (b.guncelleme || 0) - (a.guncelleme || 0) || a.ad.localeCompare(b.ad, 'tr'));
}
const bul = (slug) => hepsi().find((x) => x.slug === slug);
function temaOf(x) {
  if (x.tema) return x.tema;
  const t = THEMES[x.slug];
  if (t) return { name: t.name, tagline: t.tagline, shape: t.shape, logo: t.logo, links: { ...(t.links || {}) }, vars: { ...t.vars }, deco: DECO_STATIK[x.slug] || [] };
  return { name: x.ad, tagline: 'Okut ve Oyna', logo: '', links: { instagram: '', review: '' }, vars: { ...PALETLER[0][1] }, deco: [] };
}
function eksikler(x) {
  const t = temaOf(x), e = [];
  if (!t.logo) e.push('Logo yok');
  if (!t.links?.instagram) e.push('Instagram yok');
  if (!t.links?.review) e.push('Google yorum linki yok');
  if (!(x.odeme?.tutar > 0) && x.odeme?.periyot !== 'yok') e.push('Ödeme planı yok');
  return e;
}

// ---------------------------------------------------------------- ödemeler
function vadeOf(x, ay) { const [y, m] = ay.split('-').map(Number); return new Date(y, m - 1, Math.min(28, Math.max(1, x.odeme?.gun || 1))); }
function ayDurum(x, ay) {
  const o = x.odeme || {};
  const odenen = (x.odemeler || []).filter((p) => p.donem === ay).reduce((s, p) => s + (+p.tutar || 0), 0);
  if (o.periyot === 'yok' || !(o.tutar > 0)) return odenen ? { x, ay, tutar: 0, odenen, kalan: 0, durum: 'odendi', vade: vadeOf(x, ay) } : null;
  const bas = o.baslangic ? o.baslangic.slice(0, 7) : ym(new Date(x.olusturma || Date.now()));
  if (ay < bas) return null;
  if (x.aktif === false && !odenen) return null;
  const vade = vadeOf(x, ay), kalan = Math.max(0, o.tutar - odenen), gun = Math.round((vade - bugun()) / 864e5);
  const durum = kalan <= 0 ? 'odendi' : gun < 0 ? 'gecikti' : gun <= 3 ? 'yakin' : 'bekliyor';
  return { x, ay, tutar: o.tutar, odenen, kalan, durum, vade, gun };
}
function ayListesi(ay) { return hepsi().map((x) => ayDurum(x, ay)).filter(Boolean).sort((a, b) => a.vade - b.vade); }
function gecikmisler() {
  const out = [], b = new Date();
  for (let i = 0; i < 12; i++) { const d = new Date(b.getFullYear(), b.getMonth() - i, 1); for (const r of ayListesi(ym(d))) if (r.durum === 'gecikti') out.push(r); }
  return out.sort((a, b2) => a.vade - b2.vade);
}
const durumRozet = (r) => r.durum === 'odendi' ? '<span class="rozet yesil">✓ Ödendi</span>'
  : r.durum === 'gecikti' ? `<span class="rozet kirmizi">${-r.gun} gün gecikti</span>`
  : r.durum === 'yakin' ? `<span class="rozet sari">${r.gun === 0 ? 'Bugün' : r.gun + ' gün kaldı'}</span>`
  : `<span class="rozet gri">${r.gun} gün var</span>`;

// ---------------------------------------------------------------- iskelet
function logoHtml(x, cls = 'logo-k') {
  const t = temaOf(x);
  if (t.logo) return `<img class="${cls}${t.shape === 'wide' ? ' genis' : ''}" src="${t.logo}" alt="">`;
  return `<span class="${cls}" style="background:${rgb2hex(t.vars?.gece)};color:${rgb2hex(t.vars?.ortu)}">${esc(graf(x.ad || '?')[0] || '?')}</span>`;
}
const SEKMELER = [['ozet', '🏠', 'Özet'], ['isletmeler', '🏪', 'İşletmeler'], ['istatistik', '📊', 'İstatistik'], ['odemeler', '💰', 'Ödemeler'], ['sorular', '❓', 'Sorular']];
function iskelet() {
  $('#kok').innerHTML = `
  <header class="ust-cubuk"><div class="ic">
    <img src="/oyun/img/logo-icon.png" alt="">
    <b><small>Okut ve Oyna</small>Yönetici Paneli</b>
    <nav class="sekmeler-ust">${SEKMELER.map(([k, i, a]) => `<a href="#/${k}" data-sekme="${k}">${i} ${a}</a>`).join('')}</nav>
    <div class="sag"><a class="dugme kucuk" href="/panel/" title="NFC Dünyası yönetici paneli: Okut ve Oyna, Düğün Planla ve Randevu Vaktim">‹ Ana panel</a><a class="dugme kucuk" href="#/ayarlar" aria-label="Ayarlar">⚙️</a></div>
  </div></header>
  <main class="sayfa" id="icerik"></main>
  <nav class="alt-sekme">${SEKMELER.map(([k, i, a]) => `<a href="#/${k}" data-sekme="${k}"><i>${i}</i>${a}</a>`).join('')}</nav>`;
}
function sekmeIsaretle(k) { document.querySelectorAll('[data-sekme]').forEach((a) => a.classList.toggle('on', a.dataset.sekme === k)); }

// ---------------------------------------------------------------- giriş
function girisEkrani(mesaj = '') {
  $('#kok').innerHTML = `<div class="giris"><form id="gform" autocomplete="on">
    <div class="ust"><img src="/oyun/img/logo-icon.png" alt=""><div><h1>Yönetici Paneli</h1><p class="alt">Okut ve Oyna · NFC Dünyası</p></div></div>
    <div class="yigin">
      <label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="kullanici" autocomplete="username" autocapitalize="none" required></label>
      <label class="alan"><span>Şifre</span><input class="girdi" name="sifre" type="password" autocomplete="current-password" required></label>
      <button class="dugme ana tam" type="submit">Giriş yap</button>
    </div>
    <p class="hata" id="ghata">${esc(mesaj)}</p>
  </form></div>`;
  $('#gform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), b = e.target.querySelector('button');
    b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try {
      const d = await api('/giris', { method: 'POST', body: { kullanici: f.get('kullanici'), sifre: f.get('sifre') } });
      S.token = d.token; try { localStorage.setItem('yonetim-token', d.token); } catch { /* gizli sekme */ }
      await basla();
    } catch (err) { $('#ghata').textContent = err.message; b.disabled = false; b.textContent = 'Giriş yap'; }
  });
}
function cikis(sure = false) {
  S.token = ''; S.hazir = false; E = null;
  try { localStorage.removeItem('yonetim-token'); } catch { /* yok */ }
  girisEkrani(sure ? 'Oturumun süresi doldu, tekrar giriş yap.' : '');
}
async function yukle() {
  const d = await api('/yonetim');
  S.isletmeler = new Map((d.isletmeler || []).map((x) => [x.slug, x]));
  S.sorular = d.sorular || {};
  S.ayar = d.ayar || null;
}
async function basla() {
  $('#kok').innerHTML = '<div class="yukleniyor"><i></i></div>';
  try { await yukle(); } catch (e) { if (!S.token) return; $('#kok').innerHTML = `<div class="giris"><form><h1>Bağlanılamadı</h1><p class="hata">${esc(e.message)}</p><button class="dugme ana tam" type="button" onclick="location.reload()">Tekrar dene</button></form></div>`; return; }
  S.hazir = true;
  iskelet();
  goster();
}

// ---------------------------------------------------------------- yönlendirme
let sonHash = '';
function goster() {
  if (!S.hazir) return;
  const h = location.hash.replace(/^#\/?/, '') || 'ozet';
  const [a, b] = h.split('/');
  const sayfa = $('#icerik');
  if (E && !(a === 'isletme' && b === E.slug) && !(a === 'yeni' && E.yeni) && E.kirli) {
    const geri = sonHash; history.replaceState(null, '', geri || '#/isletmeler');
    cekmece('Kaydedilmedi', `<p style="margin:0 0 14px;font-weight:600">Bu işletmede yaptığın değişiklikler henüz kaydedilmedi.</p>
      <div class="yigin"><button class="dugme ana tam" data-c="kaydet">💾 Kaydet</button><button class="dugme kirmizi tam" data-c="at">Kaydetmeden çık</button><button class="dugme tam" data-c="kal">Vazgeç</button></div>`, async (k, kapat) => {
      if (k === 'kal') return kapat();
      if (k === 'kaydet') { kapat(); if (await kaydet()) location.hash = '#/' + h; return; }
      if (k === 'at') { E.kirli = false; kapat(); location.hash = '#/' + h; }
    });
    return;
  }
  sonHash = location.hash;
  window.scrollTo(0, 0);
  if (a !== 'isletme' && a !== 'yeni') E = null;
  if (a === 'ozet') { sekmeIsaretle('ozet'); sayfa.innerHTML = ozetHtml(); istKartOzet(); }
  else if (a === 'istatistik') { sekmeIsaretle('istatistik'); istatistikSayfa(b ? decodeURIComponent(b) : null); }
  else if (a === 'isletmeler') { sekmeIsaretle('isletmeler'); sayfa.innerHTML = listeHtml(); }
  else if (a === 'isletme' || a === 'yeni') { sekmeIsaretle('isletmeler'); duzenleyici(a === 'yeni' ? null : decodeURIComponent(b || '')); }
  else if (a === 'odemeler') { sekmeIsaretle('odemeler'); sayfa.innerHTML = odemelerHtml(b || ym(new Date())); }
  else if (a === 'sorular') { sekmeIsaretle('sorular'); sorularSayfa(b ? decodeURIComponent(b) : null); }
  else if (a === 'ayarlar') { sekmeIsaretle(''); sayfa.innerHTML = ayarlarHtml(); sunucuDurum(); }
  else location.hash = '#/ozet';
}
addEventListener('hashchange', goster);

// ---------------------------------------------------------------- özet
function ozetHtml() {
  const L = hepsi(), ay = ym(new Date()), A = ayListesi(ay);
  const beklenen = A.reduce((s, r) => s + r.tutar, 0), alinan = A.reduce((s, r) => s + Math.min(r.tutar || r.odenen, r.odenen), 0);
  const gec = gecikmisler();
  const yakin = A.filter((r) => r.durum === 'yakin' || (r.durum === 'bekliyor' && r.gun <= 7));
  const hazirlanan = L.filter((x) => x.durum !== 'yayinda' && x.aktif !== false);
  const satir = (r, dugme = true) => `<div class="sat">${logoHtml(r.x)}<div><h4>${esc(r.x.ad)}</h4><p>${ayAdi(r.ay)} · vade ${r.vade.getDate()} ${AYLAR[r.vade.getMonth()]}</p></div>
    <div class="sag"><span class="tutar">${TL(r.kalan)}</span>${dugme ? `<button class="dugme kucuk yesil" data-act="ode" data-slug="${esc(r.x.slug)}" data-ay="${r.ay}">✓ Ödendi</button>` : ''}</div></div>`;
  return `<div class="baslik-satir"><h1>Merhaba 👋</h1></div>
  <div class="sayilar">
    <div class="sayi sari"><small>${AYLAR[new Date().getMonth()]} alınan</small><b>${TL(alinan)}</b><em>beklenen ${TL(beklenen)}</em></div>
    <div class="sayi ${gec.length ? 'kirmizi' : 'yesil'}"><small>Geciken ödeme</small><b>${gec.length}</b><em>${gec.length ? TL(gec.reduce((s, r) => s + r.kalan, 0)) + ' bekliyor' : 'her şey yolunda'}</em></div>
    <div class="sayi"><small>Yayındaki işletme</small><b>${L.filter((x) => x.durum === 'yayinda' && x.aktif !== false).length}</b><em>toplam ${L.length} işletme</em></div>
    <div class="sayi mor"><small>Hazırlanan</small><b>${hazirlanan.length}</b><em>tema ya da QR aşamasında</em></div>
  </div>
  <div class="izgara iki" style="margin-top:16px">
    <section class="kart"><div class="kb"><h2>📊 Bugün oyunlarda</h2><span class="bosluk"></span><a class="dugme kucuk" href="#/istatistik">Ayrıntı</a></div><div id="istOzet"><p class="not" style="margin:0">Yükleniyor…</p></div></section>
    <section class="kart"><div class="kb"><h2>⏰ Geciken ödemeler</h2></div>
      ${gec.length ? `<div class="liste">${gec.map((r) => satir(r)).join('')}</div>` : '<div class="bos"><i>🎉</i>Geciken ödeme yok</div>'}</section>
    <section class="kart"><div class="kb"><h2>📅 Bu hafta alınacaklar</h2><span class="bosluk"></span><a class="dugme kucuk" href="#/odemeler">Tümü</a></div>
      ${yakin.length ? `<div class="liste">${yakin.map((r) => satir(r)).join('')}</div>` : '<div class="bos"><i>☕</i>Bu hafta ödeme günü yok</div>'}</section>
    <section class="kart"><div class="kb"><h2>🛠️ Hazırlanan işler</h2><span class="bosluk"></span><a class="dugme kucuk ana" href="#/yeni">+ Yeni işletme</a></div>
      ${hazirlanan.length ? `<div class="liste">${hazirlanan.map((x) => `<a class="sat" href="#/isletme/${encodeURIComponent(x.slug)}" style="text-decoration:none">${logoHtml(x)}<div><h4>${esc(x.ad)}</h4><p>${durumYazi(x)}${eksikler(x).length ? ' · ' + esc(eksikler(x).join(', ')) : ''}</p></div><span class="rozet">›</span></a>`).join('')}</div>` : '<div class="bos"><i>✨</i>Bekleyen iş yok. Yeni işletme eklemek için yukarıdaki düğmeye bas.</div>'}</section>
  </div>`;
}
const durumYazi = (x) => { const d = DURUMLAR.find((z) => z[0] === x.durum) || DURUMLAR[0]; return `${d[1]} ${d[2]}`; };

// ---------------------------------------------------------------- işletme listesi
let LF = 'hepsi';
function listeHtml() {
  const L = hepsi();
  const say = (f) => L.filter(f).length;
  const F = [['hepsi', 'Hepsi', () => true], ['yayinda', 'Yayında', (x) => x.durum === 'yayinda' && x.aktif !== false], ['hazir', 'Hazırlanan', (x) => x.durum !== 'yayinda' && x.aktif !== false], ['kapali', 'Kapalı', (x) => x.aktif === false]];
  const f = (F.find((z) => z[0] === LF) || F[0])[2];
  const G = L.filter(f);
  return `<div class="baslik-satir"><h1>İşletmeler</h1><span class="bosluk"></span><a class="dugme ana" href="#/yeni">+ Yeni işletme</a></div>
  <div class="filtre">${F.map(([k, a, fn]) => `<button class="cip ${LF === k ? 'on' : ''}" data-act="lf" data-k="${k}">${a}<b>${say(fn)}</b></button>`).join('')}</div>
  ${G.length ? `<div class="isletmeler">${G.map((x) => {
    const i = DURUMLAR.findIndex((z) => z[0] === x.durum), r = ayDurum(x, ym(new Date()));
    return `<a class="kart isl" href="#/isletme/${encodeURIComponent(x.slug)}">${logoHtml(x)}<div style="min-width:0"><h3>${esc(x.ad)}</h3>
      <div class="alt">${x.aktif === false ? '<span class="rozet gri">Kapalı</span>' : `<span class="rozet ${x.durum === 'yayinda' ? 'yesil' : 'mor'}">${durumYazi(x)}</span>`}
      ${r ? (r.durum === 'gecikti' ? '<span class="rozet kirmizi">Ödeme gecikti</span>' : r.durum === 'odendi' ? '<span class="rozet yesil">Bu ay ödendi</span>' : `<span class="rozet">${TL(r.tutar)}/ay · ${r.vade.getDate()}'i</span>`) : ''}
      <span class="rozet gri">/q/${esc(QR_AD[x.slug] || x.slug)}</span></div>
      <div class="adimlar">${DURUMLAR.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div></div></a>`;
  }).join('')}</div>` : '<div class="kart bos"><i>🏪</i>Bu listede işletme yok</div>'}`;
}

// ---------------------------------------------------------------- düzenleyici
function duzenleyici(slug) {
  if (!E || (slug === null ? !E.yeni : E.yeni || E.slug !== slug)) {
    if (slug === null) E = { yeni: true, slug: '', slugElle: false, x: { ...bosIsletme(''), tema: temaOf(bosIsletme('', '')) }, temaDegisti: true, kirli: false };
    else {
      const x = bul(slug);
      if (!x) { $('#icerik').innerHTML = `<div class="kart bos"><i>🤷</i>Bu işletme bulunamadı.<br><br><a class="dugme" href="#/isletmeler">İşletmelere dön</a></div>`; return; }
      E = { yeni: false, slug, x: kopya({ ...x, tema: temaOf(x) }), temaDegisti: !!x.tema, kirli: false };
    }
  }
  const x = E.x, t = x.tema;
  const di = DURUMLAR.findIndex((z) => z[0] === x.durum);
  $('#icerik').innerHTML = `
  <a class="geri" href="#/isletmeler">‹ İşletmeler</a>
  <div class="baslik-satir"><h1>${E.yeni ? 'Yeni işletme' : esc(x.ad)}</h1>${x.yerlesik ? '<span class="rozet mavi">Yerleşik tema</span>' : ''}<span class="bosluk"></span>
    ${E.yeni ? '' : `<a class="dugme kucuk" href="/oyun/?kaynak=${encodeURIComponent(E.slug)}" target="_blank" rel="noopener">🎮 Oyunda aç</a>`}</div>
  <div class="izgara yan">
    <div class="izgara">
      <section class="kart"><div class="kb"><h2>🏪 İşletme</h2></div><div class="yigin">
        <label class="alan"><span>İşletmenin adı <small>oyunda büyük yazar</small></span><input class="girdi" data-k="ad" value="${esc(x.ad)}" maxlength="40" placeholder="Örn. ELİZ CUPS & BOWL"></label>
        <label class="alan"><span>QR kodu <small>${E.yeni ? 'adres: nfcdunyasi.com/q/…' : 'basılı QR bu koda gider, değişmez'}</small></span><input class="girdi" data-k="slug" value="${esc(E.yeni ? E.slug : x.slug)}" ${E.yeni ? '' : 'disabled'} autocapitalize="none" placeholder="isletme-adi"></label>
        <label class="alan"><span>Slogan <small>adın altında küçük yazar</small></span><input class="girdi" data-k="tema.tagline" value="${esc(t.tagline || '')}" maxlength="60" placeholder="Okut ve Oyna"></label>
        <label class="anahtar"><input type="checkbox" data-k="aktif" ${x.aktif !== false ? 'checked' : ''}><span>Tema açık<small style="display:block;font-weight:600;color:var(--gri);font-size:12.5px">Kapalıysa QR, standart NFC Dünyası görünümünü açar</small></span></label>
      </div></section>

      <section class="kart"><div class="kb"><h2>🎨 Logo ve renkler</h2></div><div class="yigin">
        <div class="logo-alan"><div class="onizle ${t.shape === 'wide' ? 'genis' : ''}" id="logoOn"></div>
          <div class="yigin" style="gap:8px"><div class="dugmeler">
            <label class="dugme kucuk ana">📷 Görsel yükle<input type="file" accept="image/*" data-act="logo-dosya" hidden></label>
            <button class="dugme kucuk" data-act="logo-yazi">✏️ Yazıdan yap</button>
            ${t.logo ? '<button class="dugme kucuk" data-act="logo-sil">🗑</button>' : ''}</div>
            <p class="not">Logoyu yükle, daire içine yerleştir. Logosu olmayan işletmeye yazıdan logo yapabilirsin.</p></div></div>
        <div class="kb" style="margin:0"><b style="font-size:14px">Renkler</b><span class="bosluk"></span>${t.logo ? '<button class="dugme kucuk mor" data-act="renk-oner">✨ Logodan renk öner</button>' : ''}</div>
        <div class="renkler">${VARS.map(([k, a, n]) => `<label class="renk"><input type="color" data-renk="${k}" value="${rgb2hex(t.vars[k])}"><span>${a}<small>${n}</small></span></label>`).join('')}</div>
        <div><p class="not" style="margin:0 0 6px">Hazır paletler:</p><div class="hazir-palet">${PALETLER.map(([a, v], i) => `<button title="${a}" aria-label="${a}" data-act="palet" data-i="${i}">${['gece', 'limon', 'ortu', 'cay'].map((k) => `<i style="background:${rgb2hex(v[k])}"></i>`).join('')}</button>`).join('')}</div></div>
        <label class="alan"><span>Süs emojileri <small>arka planda uçuşur, en çok 8</small></span><input class="girdi" data-k="deco" value="${esc((t.deco || []).join(' '))}" placeholder="Örn. ☕ 🍰 🥐 — aşağıdan seç"></label>
        <div class="hazir-palet" style="gap:4px">${EMOJI_ONERI.map((e) => `<button class="dugme ikon kucuk" style="width:36px;min-height:34px;height:34px;box-shadow:none" data-act="emoji" data-e="${e}">${e}</button>`).join('')}</div>
      </div></section>

      <section class="kart"><div class="kb"><h2>🔗 Bağlantılar</h2></div><div class="yigin">
        <label class="alan"><span>Instagram <small>kullanıcı adı ya da profil linki</small></span><input class="girdi" data-k="tema.links.instagram" value="${esc(t.links?.instagram || '')}" autocapitalize="none" placeholder="isletme.instagram"></label>
        <label class="alan"><span>Google yorum linki <small>“Bizi puanla” düğmesi açar</small></span><input class="girdi" data-k="tema.links.review" value="${esc(t.links?.review || '')}" autocapitalize="none" placeholder="https://g.page/r/…"></label>
        <p class="not">Oyun bitince ve açılışta “⭐ Bizi puanla” ile “📷 Bizi takip et” düğmeleri bu linklere gider.</p>
      </div></section>

      <section class="kart"><div class="kb"><h2>📋 Takip</h2></div><div class="yigin">
        <div class="durum-adim">${DURUMLAR.map(([k, i, a], n) => `<button data-act="durum" data-d="${k}" class="${n === di ? 'on' : n < di ? 'gecti' : ''}"><i>${i}</i>${a}</button>`).join('')}</div>
        ${eksikler(x).length ? `<div class="uyari">Eksikler: ${esc(eksikler(x).join(' · '))}</div>` : '<div class="uyari" style="background:#d7f5e3">Her şey tamam 👍</div>'}
        <div class="ikili"><label class="alan"><span>Yetkili kişi</span><input class="girdi" data-k="kisi" value="${esc(x.kisi || '')}"></label>
        <label class="alan"><span>Telefon ${x.telefon ? `<a href="tel:${esc(x.telefon.replace(/[^\d+]/g, ''))}" style="font-weight:800">Ara</a>` : ''}</span><input class="girdi" data-k="telefon" inputmode="tel" value="${esc(x.telefon || '')}"></label></div>
        <label class="alan"><span>Notlar</span><textarea class="girdi" data-k="notlar" placeholder="Görüşme notları, istekler, stand sayısı…">${esc(x.notlar || '')}</textarea></label>
      </div></section>
    </div>

    <div class="izgara">
      <section class="kart"><div class="kb"><h2>📱 Oyunda böyle görünür</h2></div><div id="tel"></div></section>
      ${E.yeni ? '' : '<section class="kart"><div class="kb"><h2>📊 Son 30 gün</h2></div><div id="istKart"><p class="not" style="margin:0">Yükleniyor…</p></div></section>'}
      <section class="kart"><div class="kb"><h2>🔳 QR kodu</h2></div><div class="qr-alan">
        ${E.yeni && !SLUG_RE.test(E.slug) ? '<div class="bos"><i>🔳</i>QR, işletme adını yazınca oluşur</div>' : '<canvas id="qrKart" width="1200" height="1600"></canvas>'}
        <div class="qr-link"><input class="girdi" readonly value="${esc(qrUrl(E.yeni ? E.slug || '…' : x.slug))}" id="qrLink"><button class="dugme kucuk" data-act="kopyala">Kopyala</button></div>
        <div class="dugmeler" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
          <button class="dugme kucuk ana" data-act="qr-indir" data-tur="kart">⬇️ QR kartı</button>
          <button class="dugme kucuk" data-act="qr-indir" data-tur="sade">⬇️ Sade QR</button></div>
        ${E.yeni ? '<p class="not">Kaydettikten sonra QR çalışmaya başlar.</p>' : '<p class="not">Değişiklikler kaydedildikten 1 dakika içinde QR’ı okutanlara görünür.</p>'}
      </div></section>

      <section class="kart"><div class="kb"><h2>💰 Ödeme</h2></div><div class="yigin">
        <label class="anahtar"><input type="checkbox" data-k="odeme.ucretli" ${x.odeme?.periyot !== 'yok' ? 'checked' : ''}> Aylık ücret alıyorum</label>
        ${x.odeme?.periyot !== 'yok' ? `<div class="uclu">
          <label class="alan"><span>Aylık ücret (₺)</span><input class="girdi" data-k="odeme.tutar" type="number" inputmode="numeric" min="0" step="50" value="${x.odeme?.tutar || ''}" placeholder="0"></label>
          <label class="alan"><span>Ödeme günü</span><select class="girdi" data-k="odeme.gun">${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}" ${(x.odeme?.gun || 1) === i + 1 ? 'selected' : ''}>Her ayın ${i + 1}'i</option>`).join('')}</select></label>
          <label class="alan"><span>Başlangıç</span><input class="girdi" data-k="odeme.baslangic" type="date" value="${esc(x.odeme?.baslangic || '')}"></label></div>` : ''}
        <div class="kb" style="margin:6px 0 0"><b style="font-size:14px">Alınan ödemeler</b><span class="bosluk"></span><button class="dugme kucuk yesil" data-act="odeme-ekle">+ Ödeme ekle</button></div>
        ${odemeGecmis(x)}
      </div></section>

      ${E.yeni ? '' : `<section class="kart"><div class="kb"><h2>⚠️ Diğer</h2></div>
        ${x.yerlesik ? '<p class="not" style="margin:0">Yerleşik tema silinemez; kapatmak için yukarıdaki “Tema açık” anahtarını kapat.</p>' : '<button class="dugme kirmizi" data-act="sil">🗑 İşletmeyi sil</button>'}
        ${x.yerlesik && x.tema && S.isletmeler.get(x.slug)?.tema ? '<button class="dugme" style="margin-top:10px" data-act="sifirla">↺ Temayı ilk hâline döndür</button>' : ''}</section>`}
    </div>
  </div>
  <div class="kaydet-cubuk" id="kcubuk" ${E.kirli || E.yeni ? '' : 'hidden'}><span>${E.yeni ? 'Yeni işletme' : 'Kaydedilmemiş değişiklik var'}</span><button class="dugme ana" data-act="kaydet">💾 Kaydet</button></div>`;
  logoOnizle(); telefonCiz(); qrCiz();
  if (!E.yeni) istKartIsletme(E.slug);
}
function odemeGecmis(x) {
  const L = [...(x.odemeler || [])].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  if (!L.length) return '<p class="not" style="margin:0">Henüz ödeme kaydı yok.</p>';
  return `<div class="liste odeme-gecmis">${L.map((p) => `<div class="sat"><div><h4>${TL(p.tutar)}</h4><p>${tarihYaz(p.tarih)}${p.donem ? ' · ' + ayAdi(p.donem) + ' ödemesi' : ''}${p.not ? ' · ' + esc(p.not) : ''}</p></div><span></span><button class="dugme kucuk hayalet" data-act="odeme-sil" data-id="${esc(p.id)}" aria-label="Sil">✕</button></div>`).join('')}</div>`;
}
function kirlet(temaMi = false) {
  if (!E) return; E.kirli = true; if (temaMi) E.temaDegisti = true;
  const k = $('#kcubuk'); if (k) k.hidden = false;
}
function setYol(o, yol, v) { const p = yol.split('.'); let a = o; for (let i = 0; i < p.length - 1; i++) a = a[p[i]] ??= {}; a[p.at(-1)] = v; }
function logoOnizle() {
  const el = $('#logoOn'); if (!el || !E) return;
  const t = E.x.tema;
  el.className = 'onizle' + (t.shape === 'wide' ? ' genis' : '');
  el.style.backgroundImage = t.logo ? `url("${t.logo}")` : '';
  el.style.backgroundColor = t.logo ? '' : rgb2hex(t.vars.gece);
  el.style.color = rgb2hex(t.vars.ortu);
  el.textContent = t.logo ? '' : graf(E.x.ad || '?')[0] || '?';
}
function telefonCiz() {
  const el = $('#tel'); if (!el || !E) return;
  const t = E.x.tema, v = t.vars;
  const st = VARS.map(([k]) => `--th-${k}:${rgb2hex(v[k])}`).join(';') + `;--th-limon-rgb:${v.limon}`;
  const yer = [[8, 14], [80, 9], [86, 40], [6, 52], [84, 70], [12, 86], [52, 93], [90, 94]];
  const deco = (t.deco || []).length ? yer.map(([l, tp], i) => `<span class="emo" style="left:${l}%;top:${tp}%">${esc(t.deco[i % t.deco.length])}</span>`).join('') : '';
  el.innerHTML = `<div class="telefon" style="${st}"><div class="desen"></div>${deco}
    <div class="ust"><div class="lg ${t.shape === 'wide' ? 'genis' : ''}" style="${t.logo ? `background-image:url('${t.logo}')` : ''}">${t.logo ? '' : esc(graf(E.x.ad || '?')[0] || '?')}</div>
      ${t.shape === 'wide' ? '' : `<div class="ad">${esc(E.x.ad || 'İşletme adı')}</div>`}<div class="slogan">${esc(t.tagline || 'Okut ve Oyna')} · NFC Dünyası altyapısıyla</div>
      <div class="lnk">${t.links?.review ? '<span style="background:var(--th-limon);color:var(--th-murekkep)">⭐ Bizi puanla</span>' : ''}${t.links?.instagram ? '<span style="background:var(--th-ortu);color:var(--th-murekkep)">📷 Bizi takip et</span>' : ''}</div></div>
    <div class="gov"><b>Adın ne?</b><div class="kutu">Takma adını yaz</div><div class="bt">🎲 Oda kur</div><div class="bt k">🔑 Odaya katıl</div></div></div>`;
}
async function qrCiz() {
  const c = $('#qrKart'); if (!c || !E) return;
  const slug = E.yeni ? E.slug : E.x.slug;
  if (!SLUG_RE.test(slug)) return;
  await qrKartCiz(c, slug, E.x.ad, E.x.tema);
}
let qrZaman = 0;
function qrGecikmeli() { clearTimeout(qrZaman); qrZaman = setTimeout(qrCiz, 250); }

// düzenleyici olayları
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!E || !el.closest('#icerik')) return;
  if (el.dataset.renk) { E.x.tema.vars[el.dataset.renk] = hex2rgb(el.value); kirlet(true); telefonCiz(); logoOnizle(); qrGecikmeli(); return; }
  const k = el.dataset.k; if (!k) return;
  if (k === 'ad') {
    E.x.ad = el.value; E.x.tema.name = el.value.trim(); kirlet(true);
    if (E.yeni && !E.slugElle) { E.slug = slugla(el.value); const s = $('[data-k="slug"]'); if (s) s.value = E.slug; $('#qrLink').value = qrUrl(E.slug || '…'); }
    telefonCiz(); logoOnizle(); qrGecikmeli(); return;
  }
  if (k === 'slug') { E.slugElle = true; const v = slugla(el.value.replace(/\s/g, '-')); E.slug = v; $('#qrLink').value = qrUrl(v || '…'); kirlet(); qrGecikmeli(); return; }
  if (k === 'deco') { E.x.tema.deco = graf(el.value).filter((s) => s.trim() && !/^[\s,;]$/.test(s)).slice(0, 8); kirlet(true); telefonCiz(); return; }
  if (k === 'tema.links.instagram') { let v = el.value.trim(); const m = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(v); if (m) v = m[1]; E.x.tema.links.instagram = v.replace(/^@/, ''); kirlet(true); telefonCiz(); return; }
  if (k.startsWith('tema.')) { setYol(E.x, k, el.value); kirlet(true); telefonCiz(); qrGecikmeli(); return; }
  if (k === 'aktif') { E.x.aktif = el.checked; kirlet(); return; }
  if (k === 'odeme.ucretli') { E.x.odeme.periyot = el.checked ? 'aylik' : 'yok'; kirlet(); duzenleyici(E.yeni ? null : E.slug); return; }
  if (k === 'odeme.tutar' || k === 'odeme.gun') { setYol(E.x, k, Number(el.value) || 0); kirlet(); return; }
  setYol(E.x, k, el.value); kirlet();
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.act === 'logo-dosya' && el.files?.[0]) { logoKirp(el.files[0]); el.value = ''; }
});

async function kaydet() {
  if (!E) return false;
  const slug = E.yeni ? E.slug : E.x.slug;
  if (!E.x.ad.trim()) { bildir('İşletmenin adını yaz', true); return false; }
  if (!SLUG_RE.test(slug)) { bildir('QR kodu sadece küçük harf, rakam ve tire içerebilir', true); return false; }
  if (E.yeni && hepsi().some((x) => x.slug === slug)) { bildir('Bu QR kodu kullanılıyor, başka bir kod yaz', true); return false; }
  const b = $('[data-act="kaydet"]'); if (b) { b.disabled = true; b.textContent = 'Kaydediliyor…'; }
  const govde = { ...E.x, slug, yeni: E.yeni, tema: E.temaDegisti || E.yeni ? { ...E.x.tema, name: E.x.ad.trim() } : null };
  try {
    const d = await api('/isletme/' + encodeURIComponent(slug), { method: 'PUT', body: govde });
    S.isletmeler.set(slug, d);
    const yeniydi = E.yeni;
    E = { yeni: false, slug, x: kopya({ ...d, tema: temaOf({ ...d, yerlesik: !!THEMES[slug] }) }), temaDegisti: !!d.tema, kirli: false };
    bildir(yeniydi ? 'İşletme eklendi 🎉 QR artık çalışıyor' : 'Kaydedildi ✓ Oyunda 1 dakika içinde görünür');
    if (yeniydi) location.hash = '#/isletme/' + encodeURIComponent(slug); else duzenleyici(slug);
    return true;
  } catch (e) { bildir(e.message, true); if (b) { b.disabled = false; b.textContent = '💾 Kaydet'; } return false; }
}

// ---------------------------------------------------------------- çekmece (alt sayfa)
function cekmece(baslik, html, olay) {
  const p = document.createElement('div'); p.className = 'perde';
  p.innerHTML = `<div class="cekmece" role="dialog" aria-modal="true"><div class="kb"><h2>${esc(baslik)}</h2><button class="dugme ikon hayalet" data-c="kapat" aria-label="Kapat">✕</button></div>${html}</div>`;
  document.body.appendChild(p);
  const kapat = () => p.remove();
  p.addEventListener('click', (e) => { if (e.target === p) return kapat(); const b = e.target.closest('[data-c]'); if (!b) return; if (b.dataset.c === 'kapat') return kapat(); olay?.(b.dataset.c, kapat, p, b); });
  return p;
}

// ---------------------------------------------------------------- logo araçları
function resimYukle(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
function logoKirp(dosya) {
  const url = URL.createObjectURL(dosya);
  resimYukle(url).then((img) => {
    const k = { z: 1, x: 0, y: 0, arka: '', genis: img.width / img.height > 1.7 };
    const p = cekmece('Logoyu yerleştir', `<div class="kirp">
      <canvas width="560" height="560" id="kc"></canvas>
      <label class="alan" style="width:min(280px,82vw)"><span>Yakınlaştır</span><input type="range" min="1" max="4" step="0.01" value="1" id="kz"></label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center">
        <label class="anahtar"><input type="checkbox" id="kg" ${k.genis ? 'checked' : ''}> Geniş logo</label>
        <label class="renk" style="padding:4px 8px"><input type="color" id="ka" value="#ffffff"><span>Arka plan<small><label><input type="checkbox" id="kat"> kullan</label></small></span></label>
      </div>
      <p class="not" style="text-align:center;margin:0">Parmağınla sürükleyerek logoyu daireye ortala. Geniş logolar (yazılı tabela gibi) kırpılmadan kullanılır.</p>
      <button class="dugme ana tam" data-c="tamam">✓ Bu logoyu kullan</button></div>`, (c, kapat) => {
      if (c !== 'tamam') return;
      E.x.tema.logo = cikti(k.genis ? 'genis' : 'yuvarlak');
      E.x.tema.shape = k.genis ? 'wide' : undefined;
      kapat(); URL.revokeObjectURL(url); kirlet(true);
      duzenleyici(E.yeni ? null : E.slug);
      bildir('Logo eklendi. “Logodan renk öner” ile renkleri ayarlayabilirsin');
    });
    const cv = p.querySelector('#kc'), g = cv.getContext('2d');
    function ciz(ctx, W, H, mod) {
      ctx.clearRect(0, 0, W, H);
      if (mod === 'genis') {
        const s = Math.min(W / img.width, H / img.height) * k.z;
        if (k.arka) { ctx.fillStyle = k.arka; ctx.fillRect(0, 0, W, H); }
        ctx.drawImage(img, (W - img.width * s) / 2 + k.x * (W / 560), (H - img.height * s) / 2 + k.y * (W / 560), img.width * s, img.height * s);
        return;
      }
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); ctx.clip();
      if (k.arka) { ctx.fillStyle = k.arka; ctx.fillRect(0, 0, W, H); }
      const s = Math.max(W / img.width, H / img.height) * k.z, f = W / 560;
      ctx.drawImage(img, (W - img.width * s) / 2 + k.x * f, (H - img.height * s) / 2 + k.y * f, img.width * s, img.height * s);
      ctx.restore();
    }
    function yeniden() { cv.classList.toggle('genis', k.genis); ciz(g, 560, 560, k.genis ? 'genis' : 'yuvarlak'); }
    function cikti(mod) {
      let W = 320, H = 320;
      if (mod === 'genis') { const r = img.width / img.height; W = 640; H = Math.max(120, Math.min(640, Math.round(640 / r))); }
      const o = document.createElement('canvas'); o.width = W; o.height = H;
      if (mod === 'genis') { const ctx = o.getContext('2d'); if (k.arka) { ctx.fillStyle = k.arka; ctx.fillRect(0, 0, W, H); } ctx.drawImage(img, 0, 0, W, H); }
      else ciz(o.getContext('2d'), W, H, mod);
      const w = o.toDataURL('image/webp', 0.9);
      return w.startsWith('data:image/webp') ? w : o.toDataURL('image/png');
    }
    yeniden();
    p.querySelector('#kz').addEventListener('input', (e) => { k.z = +e.target.value; yeniden(); });
    p.querySelector('#kg').addEventListener('change', (e) => { k.genis = e.target.checked; k.x = k.y = 0; yeniden(); });
    const ka = p.querySelector('#ka'), kat = p.querySelector('#kat');
    const arkaGuncelle = () => { k.arka = kat.checked ? ka.value : ''; yeniden(); };
    ka.addEventListener('input', () => { kat.checked = true; arkaGuncelle(); }); kat.addEventListener('change', arkaGuncelle);
    let surukle = null;
    cv.addEventListener('pointerdown', (e) => { surukle = { x: e.clientX, y: e.clientY, kx: k.x, ky: k.y }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!surukle) return; const f = 560 / cv.getBoundingClientRect().width; k.x = surukle.kx + (e.clientX - surukle.x) * f; k.y = surukle.ky + (e.clientY - surukle.y) * f; yeniden(); });
    cv.addEventListener('pointerup', () => { surukle = null; });
  }).catch(() => bildir('Bu görsel açılamadı. PNG ya da JPG dene.', true));
}
function logoYazi() {
  const t = E.x.tema;
  const ilk = (E.x.ad || '').trim().split(/\s+/).map((w) => graf(w)[0] || '').join('').slice(0, 3).toLocaleUpperCase('tr');
  const k = { yazi: ilk || 'NFC', alt: '', emo: (t.deco || [])[0] || '', arka: rgb2hex(t.vars.gece), renk: rgb2hex(t.vars.ortu) };
  const p = cekmece('Yazıdan logo', `<div class="kirp"><canvas width="560" height="560" id="yc"></canvas></div>
    <div class="yigin" style="margin-top:14px">
      <div class="ikili"><label class="alan"><span>Büyük yazı</span><input class="girdi" id="yy" value="${esc(k.yazi)}" maxlength="12"></label>
      <label class="alan"><span>Emoji <small>isteğe bağlı</small></span><input class="girdi" id="ye" value="${esc(k.emo)}" maxlength="8"></label></div>
      <label class="alan"><span>Alt yazı <small>isteğe bağlı</small></span><input class="girdi" id="ya" maxlength="24" placeholder="KAFE · BAKIRKÖY"></label>
      <div class="ikili"><label class="renk"><input type="color" id="yr1" value="${k.arka}"><span>Arka plan</span></label><label class="renk"><input type="color" id="yr2" value="${k.renk}"><span>Yazı rengi</span></label></div>
      <button class="dugme ana tam" data-c="tamam">✓ Bu logoyu kullan</button></div>`, (c, kapat) => {
    if (c !== 'tamam') return;
    const o = document.createElement('canvas'); o.width = o.height = 320; ciz(o.getContext('2d'), 320);
    const w = o.toDataURL('image/webp', 0.92);
    E.x.tema.logo = w.startsWith('data:image/webp') ? w : o.toDataURL('image/png'); E.x.tema.shape = undefined;
    kapat(); kirlet(true); duzenleyici(E.yeni ? null : E.slug);
  });
  const cv = p.querySelector('#yc');
  function ciz(g, W) {
    const f = W / 560;
    g.clearRect(0, 0, W, W);
    g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = k.arka; g.fillRect(0, 0, W, W);
    g.strokeStyle = k.renk; g.globalAlpha = 0.35; g.lineWidth = 10 * f; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 26 * f, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = k.renk; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ust = k.emo ? 210 : 280;
    if (k.emo) { g.font = `${130 * f}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; g.fillText(k.emo, W / 2, 168 * f); }
    let fs = 190; g.font = `700 ${fs * f}px Fredoka, system-ui, sans-serif`;
    while (g.measureText(k.yazi).width > 430 * f && fs > 40) { fs -= 6; g.font = `700 ${fs * f}px Fredoka, system-ui, sans-serif`; }
    g.fillText(k.yazi, W / 2, (k.emo ? ust + 128 : k.alt ? 258 : 288) * f);
    if (k.alt) { g.font = `800 ${36 * f}px "Bricolage Grotesque", system-ui, sans-serif`; g.globalAlpha = 0.85; g.fillText(k.alt.toLocaleUpperCase('tr'), W / 2, (k.emo ? 452 : 400) * f); }
    g.restore();
  }
  const yeniden = () => ciz(cv.getContext('2d'), 560);
  document.fonts?.load('700 80px Fredoka').then(yeniden).catch(() => {});
  yeniden();
  const bag = (id, key) => p.querySelector(id).addEventListener('input', (e) => { k[key] = e.target.value; yeniden(); });
  bag('#yy', 'yazi'); bag('#ye', 'emo'); bag('#ya', 'alt'); bag('#yr1', 'arka'); bag('#yr2', 'renk');
}

// logodaki renklerden tema paleti çıkarır
function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function rgbOf(h, s, l) { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map((x) => Math.round(x * 255)).join(' '); }
async function renkOner() {
  const t = E.x.tema; if (!t.logo) return;
  const img = await resimYukle(t.logo), c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data, kova = new Map();
  let koyu = null;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]);
    if (l < 0.18 && (!koyu || l < koyu[2])) koyu = [h, s, l];
    if (s < 0.28 || l < 0.12 || l > 0.9) continue;
    const key = Math.round(h / 15) % 24, v = kova.get(key) || { n: 0, h: 0, s: 0, l: 0 };
    v.n++; v.h += h; v.s += s; v.l += l; kova.set(key, v);
  }
  const K = [...kova.values()].map((v) => ({ n: v.n, h: v.h / v.n, s: v.s / v.n, l: v.l / v.n })).sort((a, b) => b.n - a.n);
  if (!K.length) { bildir('Logoda belirgin bir renk bulamadım; hazır paletlerden birini seç', true); return; }
  const ana = K[0], fark = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const vurgu = K.find((x) => fark(x.h, ana.h) > 40 && x.n > K[0].n * 0.04);
  const L = Math.min(0.48, Math.max(0.26, ana.l)), Sa = Math.max(0.55, ana.s);
  t.vars = {
    gece: rgbOf(ana.h, Sa, L),
    morarti: rgbOf(ana.h, Sa, Math.max(0.14, L - 0.13)),
    murekkep: koyu ? rgbOf(koyu[0], Math.min(0.6, koyu[1]), Math.max(0.07, Math.min(0.13, koyu[2]))) : rgbOf(ana.h, 0.5, 0.1),
    ortu: rgbOf(ana.h, 0.7, 0.97),
    limon: vurgu ? rgbOf(vurgu.h, Math.max(0.75, vurgu.s), 0.62) : '255 210 63',
    cay: rgbOf(ana.h, 0.8, 0.22),
  };
  kirlet(true); duzenleyici(E.yeni ? null : E.slug);
  bildir('Renkler logodan seçildi. Beğenmediğin rengi kutusuna basıp değiştirebilirsin');
}

// ---------------------------------------------------------------- QR kartı
function yuvarlakDortgen(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function qrModul(g, m, x, y, boy, renk) {
  const n = m.length, s = boy / n; g.fillStyle = renk;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) g.fillRect(Math.floor(x + c * s), Math.floor(y + r * s), Math.ceil(s), Math.ceil(s));
}
async function qrKartCiz(cv, slug, ad, t) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, v = t.vars, h = (k) => rgb2hex(v[k]);
  await document.fonts?.load('700 80px Fredoka').catch(() => {});
  g.clearRect(0, 0, W, H);
  g.fillStyle = h('gece'); g.fillRect(0, 0, W, H);
  // ışın deseni
  g.save(); g.translate(W / 2, 330); g.fillStyle = `rgb(${v.limon} / 0.13)`;
  for (let i = 0; i < 24; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1700, (i * 2) * Math.PI / 24, (i * 2 + 1) * Math.PI / 24); g.closePath(); g.fill(); }
  g.restore();
  // logo
  let y = 64;
  if (t.logo) {
    const img = await resimYukle(t.logo).catch(() => null);
    if (img && t.shape === 'wide') { const s = Math.min(860 / img.width, 280 / img.height); g.drawImage(img, (W - img.width * s) / 2, y + (280 - img.height * s) / 2, img.width * s, img.height * s); y += 310; }
    else if (img) {
      const R = 148, cx = W / 2, cy = y + R;
      g.fillStyle = h('murekkep'); g.beginPath(); g.arc(cx + 12, cy + 12, R + 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = h('ortu'); g.beginPath(); g.arc(cx, cy, R + 14, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip(); g.drawImage(img, cx - R, cy - R, R * 2, R * 2); g.restore();
      y += R * 2 + 44;
    }
  } else y += 60;
  // ad
  if (!(t.logo && t.shape === 'wide')) {
    let fs = 100; g.font = `700 ${fs}px Fredoka, system-ui, sans-serif`;
    while (g.measureText(ad).width > 1040 && fs > 50) { fs -= 4; g.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = h('murekkep'); g.fillText(ad, W / 2 + 6, y + fs * 0.8 + 6);
    g.fillStyle = h('ortu'); g.fillText(ad, W / 2, y + fs * 0.8);
    y += fs + 30;
  }
  // QR paneli
  const P = 660, px = (W - P) / 2, py = Math.max(y, 560);
  g.fillStyle = h('murekkep'); yuvarlakDortgen(g, px + 14, py + 14, P, P, 56); g.fill();
  g.fillStyle = '#ffffff'; yuvarlakDortgen(g, px, py, P, P, 56); g.fill();
  g.lineWidth = 10; g.strokeStyle = h('murekkep'); yuvarlakDortgen(g, px, py, P, P, 56); g.stroke();
  qrModul(g, qrMatris(qrUrl(slug), 'H'), px + 60, py + 60, P - 120, '#120e22');
  // alt yazılar
  let ay = py + P + 118;
  g.textAlign = 'center';
  g.font = '700 92px Fredoka, system-ui, sans-serif';
  g.fillStyle = h('murekkep'); g.fillText('OKUT VE OYNA', W / 2 + 6, ay + 6);
  g.fillStyle = h('limon'); g.fillText('OKUT VE OYNA', W / 2, ay);
  ay += 70; g.font = '700 40px "Bricolage Grotesque", system-ui, sans-serif'; g.fillStyle = h('ortu');
  g.fillText('Kamerayı aç · QR’ı okut · Masadakilerle oyna', W / 2, ay);
  g.globalAlpha = 0.7; g.font = '600 28px "Bricolage Grotesque", system-ui, sans-serif';
  g.fillText('Bir NFC Dünyası ürünüdür', W / 2, H - 46); g.globalAlpha = 1;
}
function sadeQr(slug) {
  const m = qrMatris(qrUrl(slug), 'H'), n = m.length, s = 24, b = 4, c = document.createElement('canvas');
  c.width = c.height = (n + b * 2) * s; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); qrModul(g, m, b * s, b * s, n * s, '#000');
  return c;
}
function indir(canvas, ad) {
  canvas.toBlob(async (blob) => {
    const f = new File([blob], ad, { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { try { await navigator.share({ files: [f], title: ad }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---------------------------------------------------------------- ödemeler sayfası
function odemelerHtml(ay) {
  const A = ayListesi(ay), [y, m] = ay.split('-').map(Number);
  const onceki = ym(new Date(y, m - 2, 1)), sonraki = ym(new Date(y, m, 1));
  const beklenen = A.reduce((s, r) => s + r.tutar, 0), alinan = A.reduce((s, r) => s + r.odenen, 0);
  const tum = hepsi().flatMap((x) => (x.odemeler || []).filter((p) => (p.tarih || '').startsWith(ay)).map((p) => ({ x, p }))).sort((a, b) => b.p.tarih.localeCompare(a.p.tarih));
  return `<div class="baslik-satir"><h1>Ödemeler</h1><span class="bosluk"></span>
    <div class="ay-sec"><a class="dugme ikon" href="#/odemeler/${onceki}" aria-label="Önceki ay">‹</a><b>${ayAdi(ay)}</b><a class="dugme ikon" href="#/odemeler/${sonraki}" aria-label="Sonraki ay">›</a></div></div>
  <div class="sayilar">
    <div class="sayi sari"><small>Beklenen</small><b>${TL(beklenen)}</b><em>${A.filter((r) => r.tutar).length} işletme</em></div>
    <div class="sayi yesil"><small>Alınan</small><b>${TL(alinan)}</b><em>${A.filter((r) => r.durum === 'odendi').length} ödendi</em></div>
    <div class="sayi ${A.some((r) => r.durum === 'gecikti') ? 'kirmizi' : ''}"><small>Kalan</small><b>${TL(Math.max(0, beklenen - Math.min(beklenen, alinan)))}</b><em>${A.filter((r) => r.durum === 'gecikti').length} gecikmiş</em></div>
    <div class="sayi mor"><small>Yıllık tahmin</small><b>${TL(hepsi().reduce((s, x) => s + (x.aktif !== false && x.odeme?.periyot !== 'yok' ? (x.odeme?.tutar || 0) * 12 : 0), 0))}</b><em>şu anki planlarla</em></div>
  </div>
  <div class="izgara iki" style="margin-top:16px">
    <section class="kart"><div class="kb"><h2>📅 ${AYLAR[m - 1]} ödeme günleri</h2></div>
      ${A.length ? `<div class="liste">${A.map((r) => `<div class="sat">${logoHtml(r.x)}<div><h4>${esc(r.x.ad)}</h4><p>Her ayın ${r.vade.getDate()}'i · ${TL(r.tutar)}${r.odenen && r.durum !== 'odendi' ? ' · ' + TL(r.odenen) + ' alındı' : ''}</p></div>
        <div class="sag">${durumRozet(r)}${r.durum === 'odendi' ? '' : `<button class="dugme kucuk yesil" data-act="ode" data-slug="${esc(r.x.slug)}" data-ay="${r.ay}">✓ ${TL(r.kalan)} alındı</button>`}</div></div>`).join('')}</div>`
        : '<div class="bos"><i>💤</i>Bu ay ödeme planı olan işletme yok.<br>İşletmenin sayfasındaki “Ödeme” bölümünden aylık ücret gir.</div>'}</section>
    <section class="kart"><div class="kb"><h2>🧾 Bu ay alınanlar</h2></div>
      ${tum.length ? `<div class="liste">${tum.map(({ x, p }) => `<div class="sat">${logoHtml(x)}<div><h4>${esc(x.ad)}</h4><p>${tarihYaz(p.tarih)}${p.donem ? ' · ' + ayAdi(p.donem) : ''}${p.not ? ' · ' + esc(p.not) : ''}</p></div><span class="tutar">${TL(p.tutar)}</span></div>`).join('')}</div>` : '<div class="bos"><i>🧾</i>Bu ay kayıtlı ödeme yok</div>'}</section>
  </div>`;
}
async function odemeKaydet(slug, kayit) {
  const x = bul(slug); if (!x) return;
  const govde = { ...x, odemeler: [...(x.odemeler || []), { id: Math.random().toString(36).slice(2, 10), ...kayit }] };
  const d = await api('/isletme/' + encodeURIComponent(slug), { method: 'PUT', body: govde });
  S.isletmeler.set(slug, d);
  return d;
}
function odemeCekmece(slug, ay) {
  const x = bul(slug), r = ay ? ayDurum(x, ay) : null;
  const tutar = r ? r.kalan : x.odeme?.tutar || '';
  cekmece('Ödeme ekle', `<div class="yigin">
    <p style="margin:0;font-weight:700">${esc(x.ad)}</p>
    <div class="ikili"><label class="alan"><span>Tutar (₺)</span><input class="girdi" id="ot" type="number" inputmode="numeric" min="0" value="${tutar}"></label>
    <label class="alan"><span>Alındığı gün</span><input class="girdi" id="od" type="date" value="${ymd(new Date())}"></label></div>
    <label class="alan"><span>Hangi ayın ödemesi?</span><input class="girdi" id="oa" type="month" value="${ay || ym(new Date())}"></label>
    <label class="alan"><span>Not <small>isteğe bağlı</small></span><input class="girdi" id="on" placeholder="Nakit, havale, kurulum ücreti…"></label>
    <button class="dugme yesil tam" data-c="kaydet">✓ Kaydet</button></div>`, async (c, kapat, p, b) => {
    if (c !== 'kaydet') return;
    const tut = Number(p.querySelector('#ot').value);
    if (!(tut > 0)) return bildir('Tutarı yaz', true);
    b.disabled = true;
    try {
      const d = await odemeKaydet(slug, { tutar: tut, tarih: p.querySelector('#od').value || ymd(new Date()), donem: p.querySelector('#oa').value || '', not: p.querySelector('#on').value });
      kapat(); bildir(`${TL(tut)} kaydedildi ✓`);
      if (E && E.slug === slug && !E.yeni) { E.x.odemeler = d.odemeler; duzenleyici(slug); } else goster();
    } catch (e) { bildir(e.message, true); b.disabled = false; }
  });
}

// ---------------------------------------------------------------- sorular
const kopyaBos = (x) => (Array.isArray(x) ? x.map(kopyaBos) : typeof x === 'number' ? 0 : '');
const yolAl = (o, p) => p.reduce((a, k) => (a == null ? a : a[k]), o);
function yolKoy(o, p, v) { if (!p.length) return v; let a = o; for (let i = 0; i < p.length - 1; i++) a = a[p[i]]; a[p.at(-1)] = v; return o; }
function bid(x) { const s = JSON.stringify(x); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
async function bankalariAl() {
  if (S.bankalar) return S.bankalar;
  const r = await fetch('/yonetim/bankalar.json?v=' + (window.PANEL_SURUM || ''));
  if (!r.ok) throw new Error('Soru listesi yüklenemedi');
  S.bankalar = (await r.json()).bankalar;
  return S.bankalar;
}
const ozelOf = (id) => S.sorular[id] || { hide: [], add: [] };
function bankaSay(b) {
  const o = ozelOf(b.id), gizli = new Set(o.hide || []);
  const gor = b.items.filter(([k]) => !gizli.has(k)).length + (o.add || []).length;
  return { gor, gizli: b.items.filter(([k]) => gizli.has(k)).length, ek: (o.add || []).length };
}
function ozetle(b, x) {
  const f = b.f, ana = yolAl(x, f[0].p);
  const dogru = [], yanlis = [], diger = [];
  for (const a of f.slice(1)) {
    const v = yolAl(x, a.p);
    if (a.t === 'b') { (v ? dogru : yanlis).push(v ? 'Doğru' : 'Yanlış'); continue; }
    if (v === '' || v == null) continue;
    if (/^Doğru/.test(a.l)) dogru.push(v); else if (/^Yanlış/.test(a.l)) yanlis.push(v); else diger.push(`${a.l.replace(/ \(.*\)/, '')}: ${v}`);
  }
  const alt = [dogru.length ? `<span class="ok">✓ ${esc(dogru.join(', '))}</span>` : '', yanlis.length ? `✗ ${esc(yanlis.join(', '))}` : '', esc(diger.join(' · '))].filter(Boolean).join(' · ');
  return `${esc(ana)}${alt ? `<small>${alt}</small>` : ''}`;
}
async function sorularSayfa(id) {
  const el = $('#icerik');
  el.innerHTML = '<div class="kart bos"><i>⏳</i>Sorular yükleniyor…</div>';
  let B; try { B = await bankalariAl(); } catch (e) { el.innerHTML = `<div class="kart bos"><i>⚠️</i>${esc(e.message)}</div>`; return; }
  if (!id) { el.innerHTML = bankaListeHtml(B); return; }
  const b = B.find((z) => z.id === id);
  if (!b) { location.hash = '#/sorular'; return; }
  el.innerHTML = bankaHtml(b);
}
function bankaListeHtml(B) {
  const q = SQ.q.trim().toLocaleLowerCase('tr');
  let govde;
  if (q.length >= 2) {
    const sonuc = [];
    for (const b of B) {
      const o = ozelOf(b.id), gizli = new Set(o.hide || []);
      b.items.forEach(([k, x]) => { if (JSON.stringify(x).toLocaleLowerCase('tr').includes(q)) sonuc.push({ b, k, x, gizli: gizli.has(k) }); });
      (o.add || []).forEach((x, i) => { if (JSON.stringify(x).toLocaleLowerCase('tr').includes(q)) sonuc.push({ b, x, ek: i }); });
    }
    govde = `<section class="kart"><div class="kb"><h2>“${esc(SQ.q.trim())}” için ${sonuc.length} sonuç</h2></div>
      ${sonuc.length ? `<div class="sorular">${sonuc.slice(0, 120).map((r) => soruSatir(r.b, r.x, r.k, r.gizli, r.ek, true)).join('')}</div>${sonuc.length > 120 ? '<p class="not">İlk 120 sonuç gösteriliyor, aramayı daralt.</p>' : ''}` : '<div class="bos"><i>🔎</i>Hiçbir oyunda bulunamadı</div>'}</section>`;
  } else {
    govde = `<div class="bankalar">${B.map((b) => { const s = bankaSay(b); return `<a class="kart banka" href="#/sorular/${encodeURIComponent(b.id)}"><i>${b.emo}</i><div style="min-width:0"><h3>${esc(b.oyun)}</h3><p>${esc(b.ad)}${s.gizli ? ` · ${s.gizli} gizli` : ''}${s.ek ? ` · +${s.ek} eklendi` : ''}</p></div><b>${s.gor}</b></a>`; }).join('')}</div>`;
  }
  return `<div class="baslik-satir"><h1>Oyun soruları</h1></div>
  <p class="not" style="margin:-8px 0 14px">Burada yaptığın değişiklik <b>bütün işletmelerin</b> oyunlarına aynı anda uygulanır. Bir soruyu gizlersen artık kimsenin karşısına çıkmaz.</p>
  <div class="arama" style="margin-bottom:14px"><input class="girdi" id="sqAra" value="${esc(SQ.q)}" placeholder="Tüm oyunlarda soru ara…" autocomplete="off"></div>
  <div id="sqGovde">${govde}</div>`;
}
function soruSatir(b, x, k, gizli, ek, bankAdi = false) {
  const ad = bankAdi ? `<a class="bank-ad" href="#/sorular/${encodeURIComponent(b.id)}">${b.emo} ${esc(b.oyun)} · ${esc(b.ad)}</a>` : '';
  if (ek != null) return `<div class="soru yeni"><div class="m">${ad}${ozetle(b, x)}</div><div class="islem"><button class="dugme ikon kucuk" data-act="sq-duz" data-b="${esc(b.id)}" data-ek="${ek}" aria-label="Düzenle">✏️</button><button class="dugme ikon kucuk" data-act="sq-sil" data-b="${esc(b.id)}" data-ek="${ek}" aria-label="Sil">🗑</button></div></div>`;
  return `<div class="soru ${gizli ? 'gizli' : ''}"><div class="m">${ad}${ozetle(b, x)}</div><div class="islem">
    ${gizli ? `<button class="dugme kucuk" data-act="sq-goster" data-b="${esc(b.id)}" data-k="${k}">↺ Geri al</button>` : `<button class="dugme ikon kucuk" data-act="sq-duz" data-b="${esc(b.id)}" data-k="${k}" aria-label="Düzenle">✏️</button><button class="dugme kucuk" data-act="sq-gizle" data-b="${esc(b.id)}" data-k="${k}">Gizle</button>`}</div></div>`;
}
function bankaHtml(b) {
  const o = ozelOf(b.id), gizli = new Set(o.hide || []), s = bankaSay(b);
  const q = SQ.q.trim().toLocaleLowerCase('tr');
  const uy = (x) => !q || JSON.stringify(x).toLocaleLowerCase('tr').includes(q);
  let satirlar = [];
  if (SQ.f !== 'gizli') (o.add || []).forEach((x, i) => { if (uy(x)) satirlar.push(soruSatir(b, x, null, false, i)); });
  if (SQ.f !== 'ek') b.items.forEach(([k, x]) => { const g = gizli.has(k); if ((SQ.f === 'gizli' && !g) || !uy(x)) return; satirlar.push(soruSatir(b, x, k, g)); });
  const toplam = satirlar.length; satirlar = satirlar.slice(0, SQ.n);
  const taban = Math.min(15, Math.ceil(b.items.length * 0.3));
  return `<a class="geri" href="#/sorular">‹ Tüm oyunlar</a>
  <div class="baslik-satir"><h1>${b.emo} ${esc(b.oyun)}</h1><span class="bosluk"></span><button class="dugme ana" data-act="sq-ekle" data-b="${esc(b.id)}">+ Yeni ekle</button></div>
  <section class="kart"><div class="kb"><h2>${esc(b.ad)}</h2><span class="bosluk"></span><span class="rozet yesil">${s.gor} oyunda</span>${s.gizli ? `<span class="rozet gri">${s.gizli} gizli</span>` : ''}${s.ek ? `<span class="rozet sari">+${s.ek} senin</span>` : ''}</div>
    ${b.ipucu ? `<div class="uyari" style="margin-bottom:12px">💡 ${esc(b.ipucu)}</div>` : ''}
    ${b.oto ? `<p class="not" style="margin:0 0 12px">Bu oyunda ayrıca her açılışta otomatik üretilen ${b.oto} soru daha var; onlar burada listelenmez.</p>` : ''}
    ${s.gor < taban ? `<div class="uyari kirmizi" style="margin-bottom:12px">Çok az soru kaldı. En az ${taban} soru olmazsa oyun gizlediklerini de kullanır.</div>` : ''}
    <div class="arama" style="margin-bottom:10px"><input class="girdi" id="sqAra" value="${esc(SQ.q)}" placeholder="Bu oyunda ara…" autocomplete="off"></div>
    <div class="filtre">${[['hepsi', 'Hepsi', b.items.length + s.ek], ['ek', 'Eklediklerim', s.ek], ['gizli', 'Gizlenenler', s.gizli]].map(([k, a, n]) => `<button class="cip ${SQ.f === k ? 'on' : ''}" data-act="sq-f" data-f="${k}">${a}<b>${n}</b></button>`).join('')}</div>
    <div class="sorular" id="sqListe">${satirlar.join('') || '<div class="bos"><i>🔎</i>Bu filtrede soru yok</div>'}</div>
    ${toplam > SQ.n ? `<div class="daha"><button class="dugme" data-act="sq-daha">Daha fazla göster (${toplam - SQ.n})</button></div>` : ''}
  </section>`;
}
let sqZaman = 0;
async function bankaKaydet(id) {
  const o = ozelOf(id);
  try {
    await api('/sorular', { method: 'PUT', body: { id, hide: o.hide || [], add: o.add || [] } });
    clearTimeout(sqZaman); sqZaman = setTimeout(sunucuyaHaber, 600);
    bildir('Kaydedildi ✓ Yeni oyunlarda geçerli');
  } catch (e) { bildir(e.message, true); }
}
function sorularYenile() { const h = location.hash.replace(/^#\/?/, '').split('/'); const y = window.scrollY; sorularSayfa(h[1] ? decodeURIComponent(h[1]) : null).then(() => window.scrollTo(0, y)); }
function soruFormu(b, { k = null, ek = null } = {}) {
  const ilk = ek != null ? ozelOf(b.id).add[ek] : k ? b.items.find(([z]) => z === k)?.[1] : null;
  // en sık görülen biçim şablon olur
  const say = new Map(); for (const [, x] of b.items) { const s = JSON.stringify(kopyaBos(x)); say.set(s, (say.get(s) || 0) + 1); }
  const sablon = JSON.parse([...say.entries()].sort((a, c) => c[1] - a[1])[0][0]);
  const secenek = (p) => [...new Set(b.items.map(([, x]) => yolAl(x, p)).filter((v) => typeof v === 'string' && v))].sort((a, c) => a.localeCompare(c, 'tr'));
  const bosOlur = (p) => b.items.some(([, x]) => yolAl(x, p) === '');
  const tek = b.f.length === 1;
  const alan = (a, i) => {
    const v = ilk ? yolAl(ilk, a.p) : '';
    if (a.t === 'sel') return `<label class="alan"><span>${esc(a.l)}</span><select class="girdi" data-i="${i}">${secenek(a.p).map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    if (a.t === 'b') return `<label class="alan"><span>${esc(a.l)}</span><select class="girdi" data-i="${i}"><option value="1" ${v ? 'selected' : ''}>Doğru</option><option value="0" ${ilk && !v ? 'selected' : ''}>Yanlış</option></select></label>`;
    if (a.t === 'n') return `<label class="alan"><span>${esc(a.l)}</span><input class="girdi" data-i="${i}" type="number" step="any" inputmode="decimal" value="${v === '' ? '' : esc(v)}"></label>`;
    if (tek) return `<label class="alan"><span>${esc(a.l)}</span><textarea class="girdi" data-i="${i}" maxlength="280" placeholder="${esc(a.ph || '')}">${esc(v)}</textarea></label>`;
    return `<label class="alan"><span>${esc(a.l)}${bosOlur(a.p) ? ' <small>boş kalabilir</small>' : ''}</span><input class="girdi" data-i="${i}" maxlength="140" value="${esc(v)}" placeholder="${esc(a.ph || '')}" ${a.up ? 'autocapitalize="characters"' : ''}></label>`;
  };
  cekmece(ilk ? 'Soruyu düzenle' : `${b.oyun} · yeni`, `<div class="yigin">
    ${b.ipucu ? `<div class="uyari">💡 ${esc(b.ipucu)}</div>` : ''}
    ${k ? '<p class="not" style="margin:0">Orijinal soru gizlenir, düzenlediğin hâli eklenir.</p>' : ''}
    ${b.f.map(alan).join('')}
    <button class="dugme ana tam" data-c="kaydet">✓ Kaydet</button></div>`, async (c, kapat, p, btn) => {
    if (c !== 'kaydet') return;
    let x = kopya(sablon);
    for (const [i, a] of b.f.entries()) {
      const el = p.querySelector(`[data-i="${i}"]`); let v = el.value.trim();
      if (a.t === 'n') { if (v === '' || !Number.isFinite(+v)) return bildir(`“${a.l}” bir sayı olmalı`, true); v = +v; }
      else if (a.t === 'b') v = +v;
      else { if (a.up) v = v.toLocaleUpperCase('tr'); if (!v && !bosOlur(a.p)) return bildir(`“${a.l}” boş olamaz`, true); }
      x = yolKoy(x, a.p, v);
    }
    if (b.id === 'tahmin-ustasi/QUESTIONS') { const [lo, hi] = x[3] || []; if (!(lo < hi) || x[1] < lo || x[1] > hi) return bildir('Cevap, en az ve en çok değerinin arasında olmalı', true); }
    const ana = String(yolAl(x, b.f[0].p)).toLocaleLowerCase('tr');
    const o = (S.sorular[b.id] ??= { hide: [], add: [] }); o.hide ??= []; o.add ??= [];
    if (ek == null && !k && (b.items.some(([, y]) => String(yolAl(y, b.f[0].p)).toLocaleLowerCase('tr') === ana) || o.add.some((y) => String(yolAl(y, b.f[0].p)).toLocaleLowerCase('tr') === ana))) return bildir('Bu zaten listede var', true);
    btn.disabled = true;
    if (ek != null) o.add[ek] = x; else { o.add.unshift(x); if (k && !o.hide.includes(k)) o.hide.push(k); }
    kapat(); await bankaKaydet(b.id); sorularYenile();
  });
}

// ---------------------------------------------------------------- ayarlar
function ayarlarHtml() {
  return `<div class="baslik-satir"><h1>Ayarlar</h1></div>
  <div class="izgara iki">
    <section class="kart"><div class="kb"><h2>🔑 Şifre değiştir</h2></div>
      <form class="yigin" id="sform"><label class="alan"><span>Mevcut şifre</span><input class="girdi" type="password" name="eski" autocomplete="current-password" required></label>
      <label class="alan"><span>Yeni şifre <small>en az 8 karakter</small></span><input class="girdi" type="password" name="yeni" autocomplete="new-password" minlength="8" required></label>
      <label class="alan"><span>Yeni şifre (tekrar)</span><input class="girdi" type="password" name="yeni2" autocomplete="new-password" minlength="8" required></label>
      <button class="dugme ana" type="submit">Şifreyi değiştir</button></form>
      <p class="not">Şifre değişince diğer cihazlardaki oturumlar kapanır.</p></section>
    <section class="kart"><div class="kb"><h2>🎮 Oyun sunucusu</h2></div><div id="sdurum" class="not" style="margin:0">Kontrol ediliyor…</div>
      <p class="not">Soru değişiklikleri oyun sunucusuna birkaç saniye içinde iletilir; o anda oynanan oyun bitince yeni oyunlarda geçerli olur.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="dugme kucuk" data-act="sunucu-yenile">↻ Soruları şimdi gönder</button><a class="dugme kucuk" href="/oyun/" target="_blank" rel="noopener">Oyun sayfasını aç</a></div></section>
    <section class="kart"><div class="kb"><h2>👋 Oturum</h2></div><button class="dugme kirmizi" data-act="cikis">Çıkış yap</button></section>
  </div>`;
}
async function sunucuDurum() {
  const el = $('#sdurum'); if (!el) return;
  if (!SUNUCU) { el.textContent = 'Sunucu adresi bulunamadı'; return; }
  try {
    const d = await (await fetch(SUNUCU + '/veri-durum', { signal: AbortSignal.timeout?.(20000) })).json();
    const dk = d.t ? Math.round((Date.now() - d.t) / 60000) : null;
    el.innerHTML = d.hata ? `⚠️ Sunucu panel verisini alamadı: ${esc(d.hata)}` : dk == null ? 'Sunucu açık; panel verisini henüz almadı (birkaç saniye sürebilir).' : `✅ Sunucu açık. Sorular en son ${dk < 1 ? 'az önce' : dk + ' dakika önce'} alındı.`;
    try {
      const i = await (await fetch(SUNUCU + '/istat-durum', { signal: AbortSignal.timeout?.(10000) })).json();
      const idk = i.son ? Math.round((Date.now() - i.son) / 60000) : null;
      el.innerHTML += '<br>' + (!i.anahtar ? '⚠️ İstatistik anahtarı sunucuda tanımlı değil, sayılar panele gelmiyor.' : i.hata ? `⚠️ İstatistik gönderilemedi: ${esc(i.hata)}` : idk == null ? '📊 İstatistik: sunucu açıldığından beri henüz gönderilecek sayı birikmedi.' : `📊 İstatistik en son ${idk < 1 ? 'az önce' : idk + ' dakika önce'} gönderildi.`);
    } catch { /* eski sürüm sunucu */ }
  } catch { el.textContent = 'Sunucu şu an uykuda olabilir (ücretsiz planda kullanılmayınca uyur, ilk oyunda uyanır). Sorun değil.'; }
}

// ---------------------------------------------------------------- istatistik
// Oyun sunucusu her işletmenin (QR kodunun) sayaçlarını birkaç dakikada bir buraya yollar.
// Maliyet: Render faturası sabit aylık ücret + kotayı aşan veri trafiği. Sabit ücret oynama süresine,
// veri ücreti her işletmenin ürettiği veri miktarına göre paylaştırılır (tahmini).
const IST = { donem: '30', cache: {}, oyunlar: null };
const trGun = (t = Date.now()) => new Date(t + 3 * 3600e3).toISOString().slice(0, 10);
const gunEkle = (g, n) => { const d = new Date(g + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const gunKisa = (g) => { const [, m, d] = g.split('-'); return `${+d} ${AYLAR[+m - 1].slice(0, 3)}`; };
const DONEMLER = [['bugun', 'Bugün'], ['dun', 'Dün'], ['7', '7 gün'], ['30', '30 gün'], ['buay', 'Bu ay'], ['gecenay', 'Geçen ay'], ['90', '90 gün']];
const MALIYET0 = { aylikUsd: 0, dahilGb: 5, gbUsd: 0.15, kur: 50, plan: 'Free (ücretsiz)' };
const sayiYaz = (n, k = 0) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: k }).format(Number(n) || 0);
const TL2 = (n) => { n = Number(n) || 0; return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: n > 0 && n < 100 ? 2 : 0 }).format(n); };
const sureYaz = (ms) => { const dk = (ms || 0) / 60000; return dk < 60 ? `${sayiYaz(dk)} dk` : `${sayiYaz(dk / 60, dk < 600 ? 1 : 0)} sa`; };
const veriYaz = (b) => { b = b || 0; return b < 1e6 ? `${sayiYaz(b / 1e3)} KB` : b < 1e9 ? `${sayiYaz(b / 1e6, b < 1e7 ? 1 : 0)} MB` : `${sayiYaz(b / 1e9, 2)} GB`; };
const KAYNAK_AD = { direkt: 'QR’sız giriş (düz site)', diger: 'Diğer' };
function kaynakAd(k) { const x = bul(k); return x ? x.ad : KAYNAK_AD[k] || k; }
function donemAralik(k) {
  const b = trGun();
  if (k === 'bugun') return [b, b];
  if (k === 'dun') { const d = gunEkle(b, -1); return [d, d]; }
  if (k === 'buay') return [b.slice(0, 8) + '01', b];
  if (k === 'gecenay') { const son = gunEkle(b.slice(0, 8) + '01', -1); return [son.slice(0, 8) + '01', son]; }
  return [gunEkle(b, -(+k - 1)), b];
}
async function istAl(bas, son) {
  const k = bas + '|' + son, c = IST.cache[k];
  if (c && Date.now() - c.t < 60e3) return c.d;
  const d = await api(`/istat?bas=${bas}&son=${son}`);
  IST.cache[k] = { t: Date.now(), d };
  return d;
}
async function oyunAdlari() {
  if (IST.oyunlar) return IST.oyunlar;
  try { const r = await fetch('/yonetim/bankalar.json?v=' + (window.PANEL_SURUM || '')); const j = await r.json(); S.bankalar ||= j.bankalar; IST.oyunlar = j.oyunlar || {}; } catch { IST.oyunlar = {}; }
  return IST.oyunlar;
}
const bosToplam = () => ({ z: 0, zt: 0, zy: 0, oda: 0, botOda: 0, oyuncu: 0, pms: 0, rms: 0, bayt: 0, g: 0, i: 0, tepe: 0, oyun: {}, saat: Array(24).fill(0), gun: {} });
function istTopla(gunler, bas, son) {
  const K = new Map(), gunluk = [], sunucu = { rms: 0, tepe: 0, tepeOda: 0 }, top = bosToplam();
  for (let g = bas; g <= son; g = gunEkle(g, 1)) {
    const G = gunler[g] || {}, gs = { g, zt: 0, oyuncu: 0, pms: 0 };
    for (const [k, x] of Object.entries(G)) {
      if (k === '_sunucu') { sunucu.rms += x.rms || 0; sunucu.tepe = Math.max(sunucu.tepe, x.tepe || 0); sunucu.tepeOda = Math.max(sunucu.tepeOda, x.tepeOda || 0); continue; }
      if (!K.has(k)) K.set(k, bosToplam());
      for (const t of [K.get(k), top]) {
        for (const f of ['z', 'zt', 'zy', 'oda', 'botOda', 'oyuncu', 'pms', 'rms', 'bayt', 'g', 'i']) t[f] += x[f] || 0;
        t.tepe = Math.max(t.tepe, x.tepe || 0);
        for (const [o, v] of Object.entries(x.oyun || {})) t.oyun[o] = (t.oyun[o] || 0) + v;
        (x.saat || []).forEach((v, i) => { if (v) t.saat[i] += v; });
      }
      K.get(k).gun[g] = { zt: x.zt || 0, oyuncu: x.oyuncu || 0, pms: x.pms || 0 };
      gs.zt += x.zt || 0; gs.oyuncu += x.oyuncu || 0; gs.pms += x.pms || 0;
    }
    gunluk.push(gs);
  }
  return { K, gunluk, sunucu, top, gunSay: gunluk.length };
}
// Render faturasının bu döneme ve bu kaynağa düşen payı (₺)
function maliyetOf(x, T) {
  const m = { ...MALIYET0, ...(S.ayar?.maliyet || {}) }, ay = T.gunSay / 30.4;
  const sabit = m.aylikUsd * ay, dahil = m.dahilGb * 1e9 * ay;
  const asim = Math.max(0, T.top.bayt - dahil) / 1e9 * m.gbUsd;
  const pPay = T.top.pms ? x.pms / T.top.pms : 0, bPay = T.top.bayt ? x.bayt / T.top.bayt : 0;
  return { gercek: (sabit * pPay + asim * bPay) * m.kur, kotasiz: (sabit * pPay + x.bayt / 1e9 * m.gbUsd) * m.kur, m };
}
function cubukGrafik(seri, anahtarlar, renkler, etiket) { // basit SVG çubuk grafik
  const W = 640, H = 170, P = 22, n = seri.length || 1, enc = Math.max(1, ...seri.flatMap((s) => anahtarlar.map((k) => s[k] || 0)));
  const bw = (W - P * 2) / n, gb = Math.max(2, Math.min(18, bw / (anahtarlar.length + 0.8)));
  const adim = Math.ceil(n / 8);
  return `<div class="grafik"><svg viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="${esc(etiket)}">
    <line x1="${P}" x2="${W - P}" y1="${H}" y2="${H}" stroke="currentColor" stroke-opacity=".25"/>
    <text x="${P}" y="12" class="eks">${sayiYaz(enc)}</text>
    ${seri.map((s, i) => anahtarlar.map((k, j) => { const h = Math.round(((s[k] || 0) / enc) * (H - 20)); const x = P + i * bw + (bw - gb * anahtarlar.length) / 2 + j * gb; return `<rect x="${x.toFixed(1)}" y="${H - h}" width="${(gb - 1).toFixed(1)}" height="${h}" rx="2" fill="${renkler[j]}"><title>${esc(s.et || '')}: ${sayiYaz(s[k] || 0)}</title></rect>`; }).join('')).join('')}
    ${seri.map((s, i) => (i % adim === 0 || n <= 8) ? `<text x="${(P + i * bw + bw / 2).toFixed(1)}" y="${H + 16}" text-anchor="middle" class="eks">${esc(s.kisa || '')}</text>` : '').join('')}
  </svg></div>`;
}
function istDurumHtml(son, slug) {
  if (!son) return `<div class="uyari">📡 Oyun sunucusundan henüz veri gelmedi. Yeni sürüm yüklendikten sonra ilk oyunlarla birlikte birkaç dakika içinde sayılar görünmeye başlar.</div>`;
  const dk = Math.round((Date.now() - son.t) / 60000), a = son.anlik;
  const canli = a && Date.now() - a.t < 12 * 60e3;
  const burada = slug ? a?.kaynak?.[slug] || 0 : 0;
  return `<p class="not" style="margin:0">📡 Son veri ${dk < 1 ? 'az önce' : dk < 120 ? dk + ' dakika önce' : Math.round(dk / 60) + ' saat önce'} geldi${canli ? (slug ? ` · o an burada <b>${burada}</b> kişi oynuyordu` : ` · o an <b>${a.oyuncu}</b> kişi <b>${a.oda}</b> odada oynuyordu`) : ''}. Sayılar 5 dakikada bir güncellenir.</p>`;
}
async function istatistikSayfa(slug) {
  const el = $('#icerik');
  const [bas, son] = donemAralik(IST.donem);
  el.innerHTML = `${slug ? '<a class="geri" href="#/istatistik">‹ Tüm işletmeler</a>' : ''}
  <div class="baslik-satir"><h1>${slug ? esc(kaynakAd(slug)) : 'İstatistik'}</h1><span class="bosluk"></span>${slug && bul(slug) ? `<a class="dugme kucuk" href="#/isletme/${encodeURIComponent(slug)}">🏪 İşletmeye git</a>` : ''}</div>
  <div class="filtre">${DONEMLER.map(([k, a]) => `<button class="cip ${IST.donem === k ? 'on' : ''}" data-act="ist-donem" data-k="${k}">${a}</button>`).join('')}</div>
  <p class="not" style="margin:-4px 0 12px">${bas === son ? tarihYaz(bas) : `${tarihYaz(bas)} – ${tarihYaz(son)}`}</p>
  <div id="istGovde"><div class="kart bos"><i>⏳</i>Yükleniyor…</div></div>`;
  let d; try { [d] = await Promise.all([istAl(bas, son), oyunAdlari()]); } catch (e) { $('#istGovde').innerHTML = `<div class="kart bos"><i>⚠️</i>${esc(e.message)}</div>`; return; }
  if (!$('#istGovde')) return;
  const T = istTopla(d.gunler || {}, bas, son);
  $('#istGovde').innerHTML = slug ? istDetayHtml(slug, T, d.son) : istGenelHtml(T, d.son);
}
function istGenelHtml(T, son) {
  const t = T.top, mT = maliyetOf(t, T), m = mT.m;
  const satirlar = [...T.K.entries()].sort((a, b) => b[1].oyuncu - a[1].oyuncu || b[1].zt - a[1].zt);
  const seri = T.gunluk.map((s) => ({ ...s, kisa: gunKisa(s.g), et: tarihYaz(s.g) }));
  return `<div class="izgara">
  ${istDurumHtml(son)}
  <div class="sayilar">
    <div class="sayi sari"><small>Ziyaretçi</small><b>${sayiYaz(t.zt)}</b><em>${sayiYaz(t.z)} açılış · ${sayiYaz(t.zy)} ilk kez</em></div>
    <div class="sayi"><small>Oynayan</small><b>${sayiYaz(t.oyuncu)}</b><em>${sayiYaz(t.oda)} oda · ${sayiYaz(Object.values(t.oyun).reduce((a, b) => a + b, 0))} oyun</em></div>
    <div class="sayi mor"><small>Oynama süresi</small><b>${sureYaz(t.pms)}</b><em>kişi başı ${t.oyuncu ? sureYaz(t.pms / t.oyuncu) : '—'}</em></div>
    <div class="sayi ${mT.gercek > 0 ? 'kirmizi' : 'yesil'}"><small>Sunucu maliyeti</small><b>${TL2(mT.gercek)}</b><em>${veriYaz(t.bayt)} veri · kota olmasa ${TL2(mT.kotasiz)}</em></div>
  </div>
  ${T.gunSay > 1 ? `<section class="kart"><div class="kb"><h2>📈 Günlük</h2><span class="bosluk"></span><span class="lejant"><i style="background:var(--limon)"></i>Ziyaretçi <i style="background:var(--mor)"></i>Oynayan</span></div>${cubukGrafik(seri, ['zt', 'oyuncu'], ['#ffd23f', '#6c47ff'], 'Günlük ziyaretçi ve oynayan')}</section>` : ''}
  <section class="kart"><div class="kb"><h2>🏪 İşletmelere göre</h2><span class="bosluk"></span><span class="not" style="margin:0">dokun: ayrıntı</span></div>
    ${satirlar.length ? `<div class="ist-liste">${satirlar.map(([k, x]) => { const mc = maliyetOf(x, T), isl = bul(k); return `<a class="ist-sat" href="#/istatistik/${encodeURIComponent(k)}">
      ${isl ? logoHtml(isl) : `<div class="logo-k">${k === 'direkt' ? '🌐' : '❔'}</div>`}
      <div class="ad"><h4>${esc(kaynakAd(k))}</h4><p>${isl?.odeme?.periyot !== 'yok' && isl?.odeme?.tutar ? `${TL(isl.odeme.tutar)}/ay ödüyor` : k === 'direkt' ? 'QR okutmadan gelenler' : ''}</p></div>
      <div class="ol"><span><b>${sayiYaz(x.zt)}</b>ziyaretçi</span><span><b>${sayiYaz(x.oyuncu)}</b>oynayan</span><span><b>${sureYaz(x.pms)}</b>süre</span><span><b>${TL2(mc.gercek)}</b>${veriYaz(x.bayt)}</span></div></a>`; }).join('')}</div>`
      : '<div class="bos"><i>📭</i>Bu dönemde kayıt yok</div>'}
  </section>
  <div class="izgara iki">
    <section class="kart"><div class="kb"><h2>🖥️ Sunucu</h2></div>
      <div class="ist-mini"><span><b>${sureYaz(T.sunucu.rms)}</b>açık kaldı</span><span><b>${sayiYaz(T.sunucu.tepe)}</b>en çok aynı anda oyuncu</span><span><b>${sayiYaz(T.sunucu.tepeOda)}</b>en çok aynı anda oda</span><span><b>${veriYaz(t.bayt)}</b>toplam veri</span></div>
      <p class="not">Render ücretsiz planı ayda 750 saat açık kalma hakkı verir; tek sunucu olduğu için bu sınıra takılmaz. Kullanılmayınca 15 dakikada uyur, ilk oyuncuyla yarım dakikada uyanır.</p></section>
    ${maliyetFormHtml(m)}
  </div>
  </div>`;
}
function maliyetFormHtml(m) {
  return `<section class="kart"><div class="kb"><h2>💵 Maliyet ayarları</h2></div>
    <form class="yigin" id="mform">
      <div class="ikili"><label class="alan"><span>Render planı</span><input class="girdi" name="plan" value="${esc(m.plan)}" maxlength="40"></label>
      <label class="alan"><span>Aylık ücret <small>$</small></span><input class="girdi" name="aylikUsd" type="number" step="0.01" min="0" inputmode="decimal" value="${m.aylikUsd}"></label></div>
      <div class="uclu"><label class="alan"><span>Ücretsiz veri <small>GB/ay</small></span><input class="girdi" name="dahilGb" type="number" step="1" min="0" inputmode="decimal" value="${m.dahilGb}"></label>
      <label class="alan"><span>Fazla veri <small>$/GB</small></span><input class="girdi" name="gbUsd" type="number" step="0.01" min="0" inputmode="decimal" value="${m.gbUsd}"></label>
      <label class="alan"><span>Dolar kuru <small>₺</small></span><input class="girdi" name="kur" type="number" step="0.01" min="1" inputmode="decimal" value="${m.kur}"></label></div>
      <button class="dugme ana" type="submit">Kaydet</button>
    </form>
    <p class="not">Şu an sunucu Render’ın ücretsiz planında, bu yüzden gerçek maliyet 0 ₺. Ücretli plana geçilirse (Starter: 7 $/ay) aylık ücreti buraya yaz; sabit ücret oynama süresine, fazla veri ücreti de her işletmenin kullandığı veriye göre paylaştırılır. Kuru ara ara güncelle. Site (Netlify) ücretsiz planda, maliyete eklenmez.</p></section>`;
}
function istDetayHtml(k, T, son) {
  const x = T.K.get(k) || bosToplam(), mc = maliyetOf(x, T), isl = bul(k), O = IST.oyunlar || {};
  const oyunlar = Object.entries(x.oyun).sort((a, b) => b[1] - a[1]), enO = oyunlar[0]?.[1] || 1;
  const saatEn = Math.max(1, ...x.saat);
  const ucret = isl?.odeme?.periyot !== 'yok' ? (isl?.odeme?.tutar || 0) * T.gunSay / 30.4 : 0;
  const seri = T.gunluk.map((s) => ({ ...(x.gun[s.g] || { zt: 0, oyuncu: 0 }), kisa: gunKisa(s.g), et: tarihYaz(s.g) }));
  const geri = x.zt - x.zy;
  return `<div class="izgara">
  ${istDurumHtml(son, k)}
  <div class="sayilar">
    <div class="sayi sari"><small>Ziyaretçi</small><b>${sayiYaz(x.zt)}</b><em>${sayiYaz(x.zy)} yeni · ${sayiYaz(Math.max(0, geri))} tekrar gelen</em></div>
    <div class="sayi"><small>Oynayan</small><b>${sayiYaz(x.oyuncu)}</b><em>${sayiYaz(x.oda)} oda${x.botOda ? ` · ${sayiYaz(x.botOda)} botlu` : ''} · en çok ${sayiYaz(x.tepe)} kişi aynı anda</em></div>
    <div class="sayi mor"><small>Oynama süresi</small><b>${sureYaz(x.pms)}</b><em>kişi başı ${x.oyuncu ? sureYaz(x.pms / x.oyuncu) : '—'}</em></div>
    <div class="sayi ${mc.gercek > 0 ? 'kirmizi' : 'yesil'}"><small>Sunucu maliyeti</small><b>${TL2(mc.gercek)}</b><em>${veriYaz(x.bayt)} veri · kota olmasa ${TL2(mc.kotasiz)}</em></div>
  </div>
  ${T.gunSay > 1 ? `<section class="kart"><div class="kb"><h2>📈 Günlük</h2><span class="bosluk"></span><span class="lejant"><i style="background:var(--limon)"></i>Ziyaretçi <i style="background:var(--mor)"></i>Oynayan</span></div>${cubukGrafik(seri, ['zt', 'oyuncu'], ['#ffd23f', '#6c47ff'], 'Günlük ziyaretçi ve oynayan')}</section>` : ''}
  <div class="izgara iki">
    <section class="kart"><div class="kb"><h2>🎮 En çok oynanan</h2></div>
      ${oyunlar.length ? `<div class="ist-bar">${oyunlar.slice(0, 12).map(([o, v]) => `<div><span>${esc(O[o]?.emo || '🎲')} ${esc(O[o]?.ad || o)}</span><i style="width:${Math.max(4, (v / enO) * 100)}%"></i><b>${sayiYaz(v)}</b></div>`).join('')}</div>` : '<div class="bos"><i>🎲</i>Bu dönemde oyun açılmadı</div>'}</section>
    <section class="kart"><div class="kb"><h2>🕒 Yoğun saatler</h2></div>
      ${x.saat.some(Boolean) ? `<div class="saatler">${x.saat.map((v, h) => `<div title="${h}:00 – ${h + 1}:00 · ${sayiYaz(v)} oyuncu-dakika"><i style="height:${Math.round((v / saatEn) * 100)}%"></i><small>${h % 3 === 0 ? h : ''}</small></div>`).join('')}</div><p class="not">Çubuk ne kadar uzunsa o saatte o kadar çok kişi oynamış.</p>` : '<div class="bos"><i>🕒</i>Henüz veri yok</div>'}</section>
    <section class="kart"><div class="kb"><h2>💵 Bu dönemin hesabı</h2></div>
      <div class="liste">
        ${isl ? `<div class="sat hesap"><div><h4>İşletmenin ödediği</h4><p>${isl.odeme?.periyot === 'yok' ? 'ücret almıyorsun' : isl.odeme?.tutar ? `${TL(isl.odeme.tutar)}/ay, ${T.gunSay} güne düşen` : 'aylık ücret girilmemiş'}</p></div><span class="tutar">${TL2(ucret)}</span></div>` : ''}
        <div class="sat hesap"><div><h4>Sunucu payı</h4><p>${esc(mc.m.plan)} · ${veriYaz(x.bayt)} veri</p></div><span class="tutar">${TL2(mc.gercek)}</span></div>
        <div class="sat hesap"><div><h4>Ücretsiz kota olmasaydı</h4><p>veri ${mc.m.gbUsd} $/GB + sabit ücret payı</p></div><span class="tutar">${TL2(mc.kotasiz)}</span></div>
        ${isl ? `<div class="sat hesap"><div><h4>Kalan</h4><p>ödenen − sunucu payı</p></div><span class="tutar" style="color:${ucret - mc.gercek < 0 ? 'var(--cay)' : '#157a44'}">${TL2(ucret - mc.gercek)}</span></div>` : ''}
        ${x.oyuncu ? `<div class="sat hesap"><div><h4>Oyuncu başına sunucu</h4><p>kota olmasa</p></div><span class="tutar">${TL2(mc.kotasiz / x.oyuncu)}</span></div>` : ''}
      </div></section>
    <section class="kart"><div class="kb"><h2>🔗 Düğme tıklamaları</h2></div>
      <div class="ist-mini"><span><b>${sayiYaz(x.g)}</b>⭐ Bizi puanla (Google)</span><span><b>${sayiYaz(x.i)}</b>📷 Instagram</span><span><b>${sayiYaz(x.z)}</b>sayfa açılışı</span><span><b>${x.zt ? sayiYaz((x.oyuncu / x.zt) * 100) : 0}%</b>gelenlerden oynayan</span></div>
      <p class="not">Ziyaretçi: o gün QR’ı okutan farklı telefon sayısı. Oynayan: bir odaya giren kişi (aynı kişi gün içinde birkaç odaya girdiyse her biri sayılır).</p></section>
  </div></div>`;
}
async function istKartIsletme(slug) { // işletme düzenleyicisindeki küçük kart
  const el = $('#istKart'); if (!el) return;
  const [bas, son] = donemAralik('30');
  try {
    const d = await istAl(bas, son); if (!$('#istKart')) return;
    const T = istTopla(d.gunler || {}, bas, son), x = T.K.get(slug) || bosToplam(), mc = maliyetOf(x, T);
    el.innerHTML = `<div class="ist-mini"><span><b>${sayiYaz(x.zt)}</b>ziyaretçi</span><span><b>${sayiYaz(x.oyuncu)}</b>oynayan</span><span><b>${sureYaz(x.pms)}</b>oynama</span><span><b>${TL2(mc.gercek)}</b>sunucu (${veriYaz(x.bayt)})</span></div>
      <a class="dugme kucuk" style="margin-top:12px" href="#/istatistik/${encodeURIComponent(slug)}">📊 Ayrıntılı istatistik</a>`;
  } catch (e) { el.innerHTML = `<p class="not" style="margin:0">İstatistik alınamadı: ${esc(e.message)}</p>`; }
}
async function istKartOzet() { // özet sayfasındaki "bugün" kartı
  const el = $('#istOzet'); if (!el) return;
  const b = trGun();
  try {
    const d = await istAl(b, b); if (!$('#istOzet')) return;
    const T = istTopla(d.gunler || {}, b, b), t = T.top, a = d.son?.anlik, canli = a && Date.now() - a.t < 12 * 60e3;
    const en = [...T.K.entries()].filter(([k]) => k !== 'direkt').sort((p, q) => q[1].oyuncu - p[1].oyuncu)[0];
    el.innerHTML = `<div class="ist-mini"><span><b>${sayiYaz(t.zt)}</b>ziyaretçi</span><span><b>${sayiYaz(t.oyuncu)}</b>oynayan</span><span><b>${sureYaz(t.pms)}</b>oynama</span><span><b>${canli ? sayiYaz(a.oyuncu) : '—'}</b>şu an oyunda</span></div>
      ${en && en[1].oyuncu ? `<p class="not">Bugün en hareketli: <b>${esc(kaynakAd(en[0]))}</b> (${sayiYaz(en[1].oyuncu)} oyuncu)</p>` : ''}${d.son ? '' : '<p class="not">Sunucudan henüz veri gelmedi.</p>'}`;
  } catch (e) { el.innerHTML = `<p class="not" style="margin:0">${esc(e.message)}</p>`; }
}

// ---------------------------------------------------------------- tıklamalar
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'lf') { LF = el.dataset.k; $('#icerik').innerHTML = listeHtml(); return; }
  if (a === 'ist-donem') { IST.donem = el.dataset.k; const h = location.hash.replace(/^#\/?/, '').split('/'); const y = window.scrollY; await istatistikSayfa(h[1] ? decodeURIComponent(h[1]) : null); window.scrollTo(0, y); return; }
  if (a === 'kaydet') return kaydet();
  if (a === 'durum') { E.x.durum = el.dataset.d; kirlet(); duzenleyici(E.yeni ? null : E.slug); return; }
  if (a === 'palet') { E.x.tema.vars = { ...PALETLER[+el.dataset.i][1] }; kirlet(true); duzenleyici(E.yeni ? null : E.slug); return; }
  if (a === 'emoji') { const d = E.x.tema.deco ||= []; if (d.length >= 8) d.shift(); d.push(el.dataset.e); kirlet(true); const i = $('[data-k="deco"]'); if (i) i.value = d.join(' '); telefonCiz(); return; }
  if (a === 'logo-yazi') return logoYazi();
  if (a === 'logo-sil') { E.x.tema.logo = ''; E.x.tema.shape = undefined; kirlet(true); duzenleyici(E.yeni ? null : E.slug); return; }
  if (a === 'renk-oner') return renkOner();
  if (a === 'kopyala') { const v = $('#qrLink').value; try { await navigator.clipboard.writeText(v); bildir('Link kopyalandı'); } catch { $('#qrLink').select(); } return; }
  if (a === 'qr-indir') {
    const slug = E.yeni ? E.slug : E.x.slug;
    if (!SLUG_RE.test(slug)) return bildir('Önce işletmenin adını yaz', true);
    if (el.dataset.tur === 'sade') return indir(sadeQr(slug), `${slug}-qr.png`);
    const c = document.createElement('canvas'); c.width = 1200; c.height = 1600; await qrKartCiz(c, slug, E.x.ad, E.x.tema); return indir(c, `${slug}-qr-kart.png`);
  }
  if (a === 'odeme-ekle') { if (E.yeni) return bildir('Önce işletmeyi kaydet', true); if (E.kirli && !(await kaydet())) return; return odemeCekmece(E.slug, null); }
  if (a === 'odeme-sil') {
    cekmece('Ödeme silinsin mi?', '<div class="yigin"><button class="dugme kirmizi tam" data-c="evet">Evet, sil</button><button class="dugme tam" data-c="kapat">Vazgeç</button></div>', async (c, kapat) => {
      if (c !== 'evet') return; kapat();
      const x = bul(E.slug); try { const d = await api('/isletme/' + encodeURIComponent(E.slug), { method: 'PUT', body: { ...x, odemeler: x.odemeler.filter((p) => p.id !== el.dataset.id) } }); S.isletmeler.set(E.slug, d); E.x.odemeler = d.odemeler; duzenleyici(E.slug); bildir('Ödeme silindi'); } catch (er) { bildir(er.message, true); }
    });
    return;
  }
  if (a === 'ode') {
    const r = ayDurum(bul(el.dataset.slug), el.dataset.ay);
    el.disabled = true;
    try { await odemeKaydet(el.dataset.slug, { tutar: r.kalan, tarih: ymd(new Date()), donem: el.dataset.ay, not: '' }); bildir(`${TL(r.kalan)} alındı olarak işaretlendi ✓`); goster(); }
    catch (er) { bildir(er.message, true); el.disabled = false; }
    return;
  }
  if (a === 'sil') {
    cekmece('İşletme silinsin mi?', `<p style="margin:0 0 14px;font-weight:600">${esc(E.x.ad)} ve bütün kayıtları (ödemeler, notlar) silinecek. Basılı QR'lar standart NFC Dünyası görünümünü açar.</p>
      <div class="yigin"><button class="dugme kirmizi tam" data-c="evet">Evet, sil</button><button class="dugme tam" data-c="kapat">Vazgeç</button></div>`, async (c, kapat) => {
      if (c !== 'evet') return; kapat();
      try { await api('/isletme/' + encodeURIComponent(E.slug), { method: 'DELETE' }); S.isletmeler.delete(E.slug); E = null; bildir('İşletme silindi'); location.hash = '#/isletmeler'; } catch (er) { bildir(er.message, true); }
    });
    return;
  }
  if (a === 'sifirla') {
    const x = { ...bul(E.slug), tema: null };
    try { const d = await api('/isletme/' + encodeURIComponent(E.slug), { method: 'PUT', body: x }); S.isletmeler.set(E.slug, d); E = null; duzenleyici(d.slug); bildir('Tema ilk hâline döndü'); } catch (er) { bildir(er.message, true); }
    return;
  }
  // sorular
  const B = S.bankalar, b = B?.find((z) => z.id === el.dataset.b);
  if (a === 'sq-f') { SQ.f = el.dataset.f; SQ.n = 150; sorularYenile(); return; }
  if (a === 'sq-daha') { SQ.n += 300; sorularYenile(); return; }
  if (!b) {
    if (a === 'cikis') return cikis();
    if (a === 'sunucu-yenile') { sunucuyaHaber(); bildir('Sunucuya gönderildi'); setTimeout(sunucuDurum, 3000); }
    return;
  }
  const o = (S.sorular[b.id] ??= { hide: [], add: [] }); o.hide ??= []; o.add ??= [];
  if (a === 'sq-ekle') return soruFormu(b);
  if (a === 'sq-duz') return soruFormu(b, el.dataset.ek != null ? { ek: +el.dataset.ek } : { k: el.dataset.k });
  if (a === 'sq-gizle') { o.hide.push(el.dataset.k); sorularYenile(); return bankaKaydet(b.id); }
  if (a === 'sq-goster') { o.hide = o.hide.filter((k) => k !== el.dataset.k); sorularYenile(); return bankaKaydet(b.id); }
  if (a === 'sq-sil') { o.add.splice(+el.dataset.ek, 1); sorularYenile(); return bankaKaydet(b.id); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'mform') {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { S.ayar = await api('/ayar', { method: 'PUT', body: { maliyet: { ...f, aylikUsd: +f.aylikUsd, dahilGb: +f.dahilGb, gbUsd: +f.gbUsd, kur: +f.kur } } }); bildir('Maliyet ayarları kaydedildi ✓'); goster(); }
    catch (er) { bildir(er.message, true); }
    return;
  }
  if (e.target.id !== 'sform') return;
  e.preventDefault();
  const f = new FormData(e.target);
  if (f.get('yeni') !== f.get('yeni2')) return bildir('Yeni şifreler aynı değil', true);
  try { const d = await api('/sifre', { method: 'POST', body: { eski: f.get('eski'), yeni: f.get('yeni') } }); S.token = d.token; try { localStorage.setItem('yonetim-token', d.token); } catch { /* yok */ } e.target.reset(); bildir('Şifre değişti ✓'); }
  catch (er) { bildir(er.message, true); }
});
let araZaman = 0;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'sqAra') return;
  SQ.q = e.target.value; SQ.n = 150;
  clearTimeout(araZaman);
  araZaman = setTimeout(() => {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[1]) { const b = S.bankalar.find((z) => z.id === decodeURIComponent(h[1])); const yer = document.createElement('div'); yer.innerHTML = bankaHtml(b); $('#sqListe').replaceWith(yer.querySelector('#sqListe')); const dh = yer.querySelector('.daha'), eski = $('.daha'); if (eski) eski.remove(); if (dh) $('#sqListe').after(dh); }
    else { const yer = document.createElement('div'); yer.innerHTML = bankaListeHtml(S.bankalar); $('#sqGovde').replaceWith(yer.querySelector('#sqGovde')); }
  }, 180);
});
addEventListener('beforeunload', (e) => { if (E?.kirli) { e.preventDefault(); e.returnValue = ''; } });

// ---------------------------------------------------------------- başlangıç
try { S.token = localStorage.getItem('yonetim-token') || ''; } catch { /* yok */ }
if (S.token) basla(); else girisEkrani();
