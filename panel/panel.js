// NFC Dünyası · Yönetici paneli (nfcdunyasi.com/panel)
// Tek girişle üç ürünün özeti: Okut ve Oyna (/api, işletmeler ve aylık ödemeler), Düğün Planla (/dugun-api, salonlar,
// düğünler ve düğün başı ücret) ve Randevu Vaktim (/randevu-api, işletmeler, randevular ve aylık ücret).
// Oturum anahtarı üç panelle ortaktır (localStorage 'yonetim-token').
import { THEMES } from '/oyun/js/themes.js?v=2026-11-24-b';
import { $, esc, ikon, markaIkon, bildir, onayla, TL, sayiYaz } from '/dugun/js/ui.js?v=2026-11-24-b';
import * as C from '/dugun/js/cekirdek.js?v=2026-11-24-b';
import * as U from '/dugun/js/ucret.js?v=2026-11-24-b';
import * as RC from '/randevu/js/cekirdek.js?v=2026-11-24-b';

const ANAHTAR = 'yonetim-token';
const kok = $('#uygulama');
let token = ''; try { token = localStorage.getItem(ANAHTAR) || ''; } catch { /* gizli sekme */ }
const tokenYaz = (t) => { token = t; try { if (t) localStorage.setItem(ANAHTAR, t); else localStorage.removeItem(ANAHTAR); } catch { /* */ } };

async function istek(url, { method = 'GET', body } = {}) {
  let r; try { r = await fetch(url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); }
  catch { throw Object.assign(new Error('İnternet bağlantısı yok gibi görünüyor.'), { durum: 0 }); }
  let j = {}; try { j = await r.json(); } catch { /* boş yanıt */ }
  if (!r.ok) throw Object.assign(new Error(j.hata || `Sunucu yanıt vermedi (${r.status}).`), { durum: r.status });
  return j;
}

// ---------------------------------------------------------------- giriş
function girisEkrani(mesaj = '') {
  document.title = 'Giriş · Yönetici Paneli · NFC Dünyası';
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">
    <img class="giris-ikon nfc-ikon" src="/images/mark.png" alt="NFC Dünyası" width="64" height="64">
    <div><h1>Yönetici Paneli</h1><p class="soluk" style="margin-top:6px">NFC Dünyası · Okut ve Oyna, Düğün Planla ve Randevu Vaktim tek yerden.</p></div>
    <form id="gF" autocomplete="on">
      <label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="kullanici" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></label>
      <label class="alan"><span>Şifre</span><input class="girdi" name="sifre" type="password" autocomplete="current-password" required></label>
      <button class="dg ana tam buyuk" type="submit">Giriş yap</button>
      <p class="hata-yazi" id="gH">${esc(mesaj)}</p>
    </form>
    <p class="kucuk-yazi">Düğün salonu sahipleri <a href="/dugun/giris?isletme">nfcdunyasi.com/dugun</a> adresinden “İşletme” sekmesiyle girer.</p>
    <a class="dg sade kucuk" href="/">nfcdunyasi.com</a></div></div>`;
  const f = $('#gF');
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); const b = f.querySelector('button'), v = Object.fromEntries(new FormData(f));
    $('#gH').textContent = ''; b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try {
      const r = await istek('/api/giris', { method: 'POST', body: { kullanici: String(v.kullanici).trim(), sifre: v.sifre } });
      tokenYaz(r.token); await yukle();
    } catch (er) {
      $('#gH').textContent = er.durum === 401 && String(v.kullanici).trim().toLowerCase() !== 'admin' ? 'Kullanıcı adı ya da şifre hatalı. Salon sahibiyseniz nfcdunyasi.com/dugun adresinden girin.' : er.message;
      b.disabled = false; b.textContent = 'Giriş yap';
    }
  });
  if (!matchMedia('(pointer:coarse)').matches) f.kullanici.focus();
}

// ---------------------------------------------------------------- Okut ve Oyna hesabı (aylık sabit ücret; /yonetim paneliyle aynı kurallar)
const ayOf = (t) => new Date(t).toISOString().slice(0, 7);
function okutIsletmeler(liste) {
  const m = new Map();
  for (const [slug, t] of Object.entries(THEMES)) m.set(slug, { slug, ad: t.name, aktif: true, durum: 'yayinda', yerlesik: true, odeme: { tutar: 0 }, odemeler: [] });
  for (const x of liste || []) m.set(x.slug, { ...(m.get(x.slug) || {}), ...x });
  return [...m.values()].map((x) => ({ ...x, ad: x.ad || x.slug, odemeler: Array.isArray(x.odemeler) ? x.odemeler : [], odeme: x.odeme || {} }));
}
function okutAy(x, ay, bugun) {
  const o = x.odeme || {}, odenen = x.odemeler.filter((p) => p.donem === ay).reduce((n, p) => n + (+p.tutar || 0), 0);
  const vade = `${ay}-${String(Math.min(28, Math.max(1, o.gun || 1))).padStart(2, '0')}`;
  if (o.periyot === 'yok' || !(o.tutar > 0)) return odenen ? { ay, tutar: 0, odenen, kalan: 0, durum: 'odendi', vade } : null;
  const bas = o.baslangic ? o.baslangic.slice(0, 7) : ayOf(x.olusturma || Date.now());
  if (ay < bas || (x.aktif === false && !odenen)) return null;
  const kalan = Math.max(0, o.tutar - odenen);
  return { ay, tutar: o.tutar, odenen, kalan, durum: kalan <= 0 ? 'odendi' : bugun > vade ? 'gecikti' : 'bekliyor', vade };
}
function okutHesap(isletmeler, bugun) {
  const buAy = bugun.slice(0, 7), aylar = Array.from({ length: 12 }, (_, i) => U.ayEkle(buAy, -i));
  const satir = [], buAyR = [];
  for (const x of isletmeler) for (const ay of aylar) {
    const r = okutAy(x, ay, bugun); if (!r) continue;
    if (ay === buAy) buAyR.push(r);
    if (r.kalan > 0 && (ay === buAy || r.durum === 'gecikti')) satir.push({ urun: 'okut', x, r, detay: `${U.ayAdi(ay)} aylık ücreti`, git: '/yonetim/#/odemeler' });
  }
  return {
    satir, isletme: isletmeler.length, aktif: isletmeler.filter((x) => x.aktif !== false).length,
    yayinda: isletmeler.filter((x) => x.aktif !== false && (x.durum === 'yayinda' || x.yerlesik)).length,
    buAyTutar: buAyR.reduce((n, r) => n + r.tutar, 0), buAyOdenen: buAyR.reduce((n, r) => n + Math.min(r.odenen, r.tutar || r.odenen), 0),
    alacak: satir.reduce((n, s) => n + s.r.kalan, 0), geciken: satir.filter((s) => s.r.durum === 'gecikti').reduce((n, s) => n + s.r.kalan, 0),
  };
}

// ---------------------------------------------------------------- Düğün Planla hesabı (ucret.js — Düğün Planla paneliyle aynı)
function dugunHesap(V, bugun) {
  const buAy = bugun.slice(0, 7), T = U.ayToplam(V.salonlar, V.dugunler, buAy, bugun), satir = [];
  let alacak = 0, geciken = 0;
  for (const s of V.salonlar) {
    const oz = U.salonOzet(s, V.dugunler, bugun); alacak += oz.alacak; geciken += oz.geciken;
    for (const r of oz.dokum) if (r.ay <= buAy && r.kalan > 0 && (r.ay === buAy || r.durum === 'gecikti')) satir.push({ urun: 'dugun', x: s, r, detay: `${U.ayAdi(r.ay)} · ${r.dugun ? `${r.dugun} düğün${r.birim ? ' × ' + TL(r.birim) : ''}` : 'düğün yok'}${r.sabit ? ' + aylık' : ''}`, git: `/dugun/yonetim/salon/${s.slug}/odeme` });
  }
  return { T, satir, alacak, geciken, sonrakiAy: V.dugunler.filter((d) => (d.tarih || '').startsWith(U.ayEkle(buAy, 1))).length };
}

// ---------------------------------------------------------------- Randevu Vaktim hesabı (aylık sabit + personel başı; Randevu Vaktim paneliyle aynı kurallar)
function randevuHesap(V, bugun) {
  const buAy = bugun.slice(0, 7), aylar = Array.from({ length: 12 }, (_, i) => U.ayEkle(buAy, -i));
  const satir = [], buAyR = [];
  for (const s of V.isletmeler) for (const ay of aylar) {
    const r = RC.aboneAy(s, ay, bugun); if (!r) continue;
    if (ay === buAy) buAyR.push(r);
    if (r.kalan > 0 && (ay === buAy || r.durum === 'gecikti')) satir.push({ urun: 'randevu', x: s, r, detay: `${U.ayAdi(ay)} aylık ücreti${r.kisi ? ` · ${r.kisi} personel` : ''}`, git: `/randevu/yonetim/isletme/${s.slug}/ucret` });
  }
  const oz = Object.values(V.ozet || {});
  return {
    satir, isletme: V.isletmeler.length, aktif: V.isletmeler.filter((s) => s.aktif !== false).length,
    bugun: oz.reduce((n, o) => n + (o.bugun || 0), 0), bekleyen: oz.reduce((n, o) => n + (o.bekleyen || 0), 0),
    buAyTutar: buAyR.reduce((n, r) => n + r.tutar, 0), buAyOdenen: buAyR.reduce((n, r) => n + Math.min(r.odenen, r.tutar || r.odenen), 0),
    alacak: satir.reduce((n, x) => n + x.r.kalan, 0), geciken: satir.filter((x) => x.r.durum === 'gecikti').reduce((n, x) => n + x.r.kalan, 0),
  };
}

// ---------------------------------------------------------------- görünüm
const logo = (urun, x) => {
  const l = urun === 'okut' ? x.tema?.logo || THEMES[x.slug]?.logo || '' : x.tema?.logo || '';
  return l ? `<span class="logo-k"><img src="${esc(l)}" alt=""></span>` : `<span class="logo-k">${esc((x.ad || '?').trim().charAt(0).toLocaleUpperCase('tr'))}</span>`;
};
const URUN = { okut: 'Okut ve Oyna', dugun: 'Düğün Planla', randevu: 'Randevu Vaktim' };
const rvIkon = (px = 44) => `<svg class="urun-ikon" width="${px}" height="${px}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7.4" fill="#1d1d1f"/><circle cx="16" cy="17.2" r="8.4" fill="none" stroke="#fff" stroke-width="2.1"/><path d="M16 12.6v4.8l3.1 2" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 5.8h6" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/><circle cx="23.2" cy="10" r="1.6" fill="#3fbf8f"/></svg>`;
const mini = (b, a, cls = '') => `<div class="mini${cls ? ' ' + cls : ''}"><b>${b}</b><span>${a}</span></div>`;
const durumYazi = (r) => (r.durum === 'gecikti' ? 'gecikti' : `son gün ${C.tarihYaz(r.vade, { yil: false })}`);

function iskelet() {
  kok.innerHTML = `<div class="kabuk yon nfc-panel"><header class="yon-ust"><div class="ic"><a class="marka" href="/panel/"><img src="/images/mark.png" alt="" width="26" height="26"><span>Yönetici Paneli</span></a>
    <nav><a class="on" href="/panel/">Genel bakış</a><a href="/yonetim/">Okut ve Oyna</a><a href="/dugun/yonetim">Düğün Planla</a><a href="/randevu/yonetim">Randevu Vaktim</a></nav><span class="bosluk"></span>
    <button class="dg ikon-d" type="button" data-y="yenile" aria-label="Yenile">${ikon('yenile')}</button><button class="dg ikon-d" type="button" data-y="cikis" aria-label="Çıkış">${ikon('cikis')}</button></div></header>
    <main class="icerik" id="pI"><div class="yukleniyor"><i></i></div></main></div>`;
  kok.querySelector('[data-y=cikis]').onclick = async () => { if (await onayla({ baslik: 'Çıkış yapılsın mı?', metin: 'Okut ve Oyna, Düğün Planla ve Randevu Vaktim yönetici panellerinden de çıkılır.', evet: 'Çıkış yap' })) { tokenYaz(''); girisEkrani(); } };
  kok.querySelector('[data-y=yenile]').onclick = () => yukle(true);
}

async function yukle(sessiz = false) {
  if (!token) return girisEkrani();
  if (!$('#pI')) iskelet(); else if (!sessiz) $('#pI').innerHTML = '<div class="yukleniyor"><i></i></div>';
  const [ok, dp, rv] = await Promise.allSettled([istek('/api/yonetim'), istek('/dugun-api/yonetim'), istek('/randevu-api/yonetim')]);
  if (ok.status === 'rejected' && ok.reason.durum === 401) { tokenYaz(''); return girisEkrani('Oturumun süresi doldu, yeniden giriş yapın.'); }
  if (ok.status === 'rejected' && dp.status === 'rejected' && rv.status === 'rejected') {
    $('#pI').innerHTML = `<div class="kart bos"><span class="serif">Bağlanılamadı</span>${esc(ok.reason.message)}<br><button class="dg ana" type="button" onclick="location.reload()">Tekrar dene</button></div>`; return;
  }
  goster(ok.status === 'fulfilled' ? ok.value : null, dp.status === 'fulfilled' ? dp.value : null, ok.reason, dp.reason, rv.status === 'fulfilled' ? rv.value : null, rv.reason);
  if (sessiz) bildir('Güncellendi');
}

function goster(okV, dpV, okH, dpH, rvV, rvH) {
  document.title = 'Yönetici Paneli · NFC Dünyası';
  const bugun = C.trBugun(), buAy = bugun.slice(0, 7), ayAd = U.ayAdi(buAy, { yil: false });
  const isl = okV ? okutIsletmeler(okV.isletmeler) : [], O = okV ? okutHesap(isl, bugun) : null;
  const V = dpV ? { salonlar: dpV.salonlar || [], dugunler: dpV.dugunler || [] } : null, D = V ? dugunHesap(V, bugun) : null;
  const RV = rvV ? { isletmeler: rvV.isletmeler || [], ozet: rvV.ozet || {} } : null, R = RV ? randevuHesap(RV, bugun) : null;
  // bu ay kasaya giren (üç ürün): ödeme tarihi bu ay olanlar
  const alinanlar = [...isl.flatMap((x) => x.odemeler.map((p) => ({ urun: 'okut', x, p }))), ...(V ? V.salonlar.flatMap((s) => (s.odemeler || []).map((p) => ({ urun: 'dugun', x: s, p }))) : []),
    ...(RV ? RV.isletmeler.flatMap((s) => (s.odemeler || []).map((p) => ({ urun: 'randevu', x: s, p }))) : [])]
    .filter((a) => a.p.tarih).sort((a, b) => b.p.tarih.localeCompare(a.p.tarih));
  const buAyGiren = alinanlar.filter((a) => a.p.tarih.startsWith(buAy)).reduce((n, a) => n + (+a.p.tutar || 0), 0);
  const alacak = (O?.alacak || 0) + (D?.alacak || 0) + (R?.alacak || 0), geciken = (O?.geciken || 0) + (D?.geciken || 0) + (R?.geciken || 0);
  const odenecek = [...(O?.satir || []), ...(D?.satir || []), ...(R?.satir || [])].sort((a, b) => (b.r.durum === 'gecikti') - (a.r.durum === 'gecikti') || a.r.vade.localeCompare(b.r.vade));
  const yak = V ? V.dugunler.filter((d) => d.tarih && d.tarih >= bugun && d.tarih <= C.gunEkle(bugun, 14)) : [];
  const salonAd = (slug) => V?.salonlar.find((s) => s.slug === slug)?.ad || '';
  const hataKart = (ad, h) => `<p class="uyari-kutu hata">${ikon('uyari', 'k')}<span>${esc(ad)} verileri alınamadı: ${esc(h?.message || 'bilinmeyen hata')}</span></p>`;

  $('#pI').innerHTML = `<div class="bolum-bas"><div><p class="etiket">${esc(C.tarihYaz(bugun, { gun: true }))}</p><h1 style="margin-top:4px">Genel bakış</h1></div></div>
    <div class="sayilar">
      <div class="sayi"><b class="tl">${TL(buAyGiren)}</b><span>${esc(ayAd)} ayında alınan ödemeler</span></div>
      <div class="sayi"><b class="tl">${TL(alacak)}</b><span>toplam alacak${geciken ? ` · <em class="kirmizi">${TL(geciken)} gecikti</em>` : ''}</span></div>
      <a class="sayi" href="/yonetim/#/isletmeler"><b>${O ? O.isletme : '—'}</b><span>Okut ve Oyna işletmesi${O ? ` · ${O.yayinda} yayında` : ''}</span></a>
      <a class="sayi" href="/dugun/yonetim/dugunler"><b>${D ? D.T.dugun : '—'}</b><span>düğün ${esc(ayAd)} ayında${V ? ` · ${V.salonlar.length} salon` : ''}</span></a></div>

    <div class="urunler">
      <section class="kart urun-kart">
        <a class="urun-bas" href="/yonetim/"><img class="urun-ikon" src="/oyun/img/logo-icon.png" alt=""><span><b>Okut ve Oyna</b><small>İşletmeye özel QR oyunları · aylık ücret</small></span>${ikon('sag', 'kk')}</a>
        ${O ? `<div class="mini-izgara">${mini(O.isletme, `işletme · ${O.aktif} etkin`)}${mini(TL(O.buAyTutar), `${esc(ayAd)} hesabı`)}${mini(TL(O.buAyOdenen), `${esc(ayAd)} alınan`)}${mini(TL(O.geciken), 'geciken', O.geciken ? 'kirmizi' : '')}</div>` : hataKart('Okut ve Oyna', okH)}
        <div class="urun-bag"><a href="/yonetim/#/isletmeler">İşletmeler</a><a href="/yonetim/#/odemeler">Ödemeler</a><a href="/yonetim/#/istatistik">İstatistik</a><a href="/yonetim/#/sorular">Sorular</a></div>
        <a class="dg ana tam" href="/yonetim/">Okut ve Oyna paneli</a></section>
      <section class="kart urun-kart">
        <a class="urun-bas" href="/dugun/yonetim">${markaIkon(44, 'urun-ikon')}<span><b>Düğün Planla</b><small>Salonlar, düğünler · düğün başı ücret</small></span>${ikon('sag', 'kk')}</a>
        ${D ? `<div class="mini-izgara">${mini(V.salonlar.length, `salon · ${V.salonlar.filter((s) => s.aktif !== false).length} etkin`)}${mini(D.T.dugun, `düğün ${esc(ayAd)} ayında · ${D.sonrakiAy} gelecek ay`)}${mini(TL(D.T.tutar), `${esc(ayAd)} hesabı`)}${mini(TL(D.alacak), D.geciken ? `alacak · ${TL(D.geciken)} gecikti` : 'alacak', D.geciken ? 'kirmizi' : '')}</div>` : hataKart('Düğün Planla', dpH)}
        <div class="urun-bag"><a href="/dugun/yonetim/salonlar">Salonlar</a><a href="/dugun/yonetim/dugunler">Düğünler</a><a href="/dugun/yonetim/gelir">Gelir</a><a href="/dugun/yonetim/istatistik">İstatistik</a></div>
        <a class="dg ana tam" href="/dugun/yonetim">Düğün Planla paneli</a></section>
      <section class="kart urun-kart">
        <a class="urun-bas" href="/randevu/yonetim">${rvIkon(44)}<span><b>Randevu Vaktim</b><small>Berber ve kuaförlere online randevu · aylık ücret</small></span>${ikon('sag', 'kk')}</a>
        ${R ? `<div class="mini-izgara">${mini(R.isletme, `işletme · ${R.aktif} açık`)}${mini(R.bugun, `randevu bugün${R.bekleyen ? ` · ${R.bekleyen} ödeme onayı bekliyor` : ''}`)}${mini(TL(R.buAyTutar), `${esc(ayAd)} hesabı`)}${mini(TL(R.alacak), R.geciken ? `alacak · ${TL(R.geciken)} gecikti` : 'alacak', R.geciken ? 'kirmizi' : '')}</div>` : hataKart('Randevu Vaktim', rvH)}
        <div class="urun-bag"><a href="/randevu/yonetim/isletmeler">İşletmeler</a><a href="/randevu/yonetim/odemeler">Ödemeler</a><a href="/randevu" target="_blank" rel="noopener">Tanıtım sayfası</a></div>
        <a class="dg ana tam" href="/randevu/yonetim">Randevu Vaktim paneli</a></section></div>

    ${D && V.salonlar.length ? `<section class="kart hub-salonlar" style="margin-top:16px"><div class="kart-bas"><h2>Düğün Planla · salonlar</h2><span class="bosluk"></span><a class="dg sade kucuk" href="/dugun/yonetim/istatistik">Ayrıntı</a></div>
      <div class="tablo-kaydir"><table class="tablo salon-tablo"><thead><tr><th>Salon</th><th>Ücret</th><th class="sag">Düğün</th><th class="sag">${esc(ayAd)}</th><th class="sag">Yaklaşan</th><th class="sag">${esc(ayAd)} hesabı</th><th class="sag">Alacak</th></tr></thead><tbody>
      ${V.salonlar.map((s) => { const L = V.dugunler.filter((d) => d.salon === s.slug), oz = U.salonOzet(s, V.dugunler, bugun), r = D.T.R.find((z) => z.s.slug === s.slug)?.r; return `<tr><td><a href="/dugun/yonetim/salon/${esc(s.slug)}/odeme">${esc(s.ad)}</a></td><td>${esc(U.ucretYazi(s, TL))}</td><td class="sag">${L.length}</td><td class="sag">${r?.dugun || 0}</td><td class="sag">${L.filter((d) => d.tarih >= bugun).length}</td><td class="sag">${TL(r?.tutar || 0)}</td><td class="sag${oz.geciken ? ' kirmizi' : ''}">${TL(oz.alacak)}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="odeme-liste salon-liste">${V.salonlar.map((s) => { const L = V.dugunler.filter((d) => d.salon === s.slug), oz = U.salonOzet(s, V.dugunler, bugun), r = D.T.R.find((z) => z.s.slug === s.slug)?.r; return `<a class="satir" href="/dugun/yonetim/salon/${esc(s.slug)}/odeme">${logo('dugun', s)}<span class="ana"><b>${esc(s.ad)}</b><small>${esc(U.ucretYazi(s, TL))}</small><small>${L.length} düğün · ${r?.dugun || 0} ${esc(ayAd)} ayında · ${L.filter((d) => d.tarih >= bugun).length} yaklaşan</small></span><span class="tutar"><b>${TL(r?.tutar || 0)}</b><small class="${oz.geciken ? 'gecikti' : ''}">${oz.alacak ? 'alacak ' + TL(oz.alacak) : esc(ayAd) + ' hesabı'}</small></span></a>`; }).join('')}</div></section>` : ''}

    <div class="ozet-izgara" style="margin-top:16px">
      <section class="kart"><div class="kart-bas"><h2>Alınacak ödemeler</h2><span class="bosluk"></span>${odenecek.length ? `<span class="rozet">${TL(alacak)}</span>` : ''}</div>
        ${odenecek.length ? `<div class="odeme-liste">${odenecek.slice(0, 12).map((o) => `<a class="satir" href="${esc(o.git)}">${logo(o.urun, o.x)}<span class="ana"><b>${esc(o.x.ad)}</b><small>${URUN[o.urun]} · ${esc(o.detay)}</small></span><span class="tutar"><b>${TL(o.r.kalan)}</b><small class="${o.r.durum}">${esc(durumYazi(o.r))}</small></span></a>`).join('')}</div>${odenecek.length > 12 ? `<p class="kucuk-yazi" style="margin-top:8px">+${odenecek.length - 12} ödeme daha. Ürünlerin “Ödemeler” ve “Gelir” sayfalarına bakın.</p>` : ''}`
          : '<p class="soluk">Bekleyen ödeme yok.</p>'}</section>
      <div class="yigin-b">
        <section class="kart"><div class="kart-bas"><h2>Önümüzdeki 14 gün</h2><span class="bosluk"></span><a class="dg sade kucuk" href="/dugun/yonetim/dugunler">Düğünler</a></div>
          ${yak.length ? yak.slice(0, 8).map((d) => `<a class="dugun-satir" href="/dugun/yonetim/dugun/${esc(d.kod)}"><div class="takvim-k"><b>${+d.tarih.slice(8)}</b><span>${esc(C.AYLAR[+d.tarih.slice(5, 7) - 1].slice(0, 3))}</span></div><span style="min-width:0"><b class="ad">${esc(C.ciftAdi(d))}</b><small>${d.tarih === bugun ? '<em class="vurgu-y">Bugün</em> · ' : ''}${esc([salonAd(d.salon), C.saatYaz(d.saat)].filter(Boolean).join(' · '))}</small></span><span class="sag"><b>${d.kisi}</b><small>kişi</small></span></a>`).join('') : `<p class="soluk">${V ? 'Önümüzdeki 14 günde düğün yok.' : 'Düğün Planla verileri alınamadı.'}</p>`}</section>
        <section class="kart"><div class="kart-bas"><h2>Son alınan ödemeler</h2></div>
          ${alinanlar.length ? alinanlar.slice(0, 6).map((a) => `<div class="satir">${logo(a.urun, a.x)}<span class="ana"><b>${esc(a.x.ad)}</b><small>${esc(C.tarihYaz(a.p.tarih, { yil: false }))} · ${URUN[a.urun]}${a.p.donem ? ' · ' + esc(U.ayAdi(a.p.donem, { yil: false })) + ' hesabı' : ''}</small></span><b class="sayi-yazi">${TL(a.p.tutar)}</b></div>`).join('') : '<p class="soluk">Henüz ödeme kaydı yok.</p>'}</section></div></div>

    <div class="panel-alt"><a href="/yonetim/#/ayarlar">${ikon('kilit', 'kk')} Şifreyi değiştir</a><a href="/">${ikon('sol', 'kk')} nfcdunyasi.com</a><span>Okut ve Oyna, Düğün Planla ve Randevu Vaktim aynı yönetici hesabını kullanır.</span></div>`;
}

yukle();
