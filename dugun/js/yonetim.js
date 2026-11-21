// Düğün Planla — yönetici paneli (tüm salonlar) ve salon paneli (tek salon): salonlar, temalar, salon planları, düğünler, ödemeler, istatistik
import * as C from './cekirdek.js?v=2026-11-21-g';
import { api, depoYerel, TK } from './api.js?v=2026-11-21-g';
import { $, $$, esc, ikon, markaIkon, bildir, cekmece, onayla, temaUygula, temaSifirla, STILLER, VURGULAR, stilAdi, qrSvg, kopyala, href, git, SITE, paylasLink, TL, sayiYaz, resimKucult, waLink, ayrilmaKoy, ONIZLEME, tamYol } from './ui.js?v=2026-11-21-g';
import { harita, planSvg } from './harita.js?v=2026-11-21-g';
import { qrPng } from './yazdir.js?v=2026-11-21-g';
import * as U from './ucret.js?v=2026-11-21-g';

let Y = null, E = null;
const yolY = (p = '') => Y.taban + (p ? '/' + p : '');
const kopya = (o) => JSON.parse(JSON.stringify(o));
const AYLAR = C.AYLAR;
const takvimK = (t) => { if (!t) return '<div class="takvim-k"><b>—</b><span>tarih yok</span></div>'; const [, a, g] = t.split('-').map(Number); return `<div class="takvim-k"><b>${g}</b><span>${AYLAR[a - 1].slice(0, 3)}</span></div>`; };
const SIFRE_ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
const sifreUret = () => C.rastgele(4, SIFRE_ABC) + '-' + C.rastgele(4, SIFRE_ABC);
const girisLink = () => paylasLink('/dugun');
const salonMesaji = (ad, slug, sifre) => `Merhaba, ${ad} için Düğün Planla işletme paneliniz hazır.\n\nGiriş: ${girisLink()} (“İşletme” sekmesi)\nKullanıcı adı: ${slug}\nŞifre: ${sifre}\n\nPanelinizden düğün açıp çiftlere giriş kodu verebilir, düğünlerinizin istatistiklerini görebilirsiniz.`;
const kopyaD = (v) => `<button class="dg ikon-d" type="button" data-kopya="${esc(v)}" aria-label="Kopyala">${ikon('kopya', 'k')}</button>`;
function bilgiListe(slug, sifre) {
  return `<div class="bilgi-liste"><div><span>Giriş adresi</span><b>${esc(girisLink().replace(/^https:\/\//, ''))}</b>${kopyaD(girisLink())}</div><div><span>Kullanıcı adı</span><b>${esc(slug)}</b>${kopyaD(slug)}</div>${sifre === null ? '' : `<div><span>Şifre</span><b>${sifre ? esc(sifre) : '••••••••'}</b>${sifre ? kopyaD(sifre) : ''}</div>`}</div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-kopya]'); if (b) kopyala(b.dataset.kopya); });
/** Salon sahibinin giriş bilgileri (salon oluşturulunca ya da şifre yenilenince) */
function hesapBilgisi(ad, slug, sifre) {
  cekmece({ baslik: 'İşletme paneli hazır', govde: `<div class="yigin"><p class="soluk">Bu bilgileri salon sahibine iletin. Şifreyi daha sonra salonun “Giriş ve QR” sekmesinden de görebilirsiniz.</p>${bilgiListe(slug, sifre)}
    <div class="dg-grup"><a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', salonMesaji(ad, slug, sifre)))}">${ikon('mesaj', 'k')} WhatsApp ile gönder</a><button class="dg cizgili" type="button" data-kopya="${esc(salonMesaji(ad, slug, sifre))}">${ikon('kopya', 'k')} Hepsini kopyala</button></div></div>`, alt: '<button class="dg ana" data-kapat>Tamam</button>' });
}
const logoK = (s) => (s?.tema?.logo ? `<span class="logo-k"><img src="${esc(s.tema.logo)}" alt=""></span>` : `<span class="logo-k">${esc(C.basHarf(s?.ad) || '?')}</span>`);

// ---------------------------------------------------------------- giriş ve kabuk
export async function yonetimAc(kok, { rol, slug = '', alt = '' }) {
  temaSifirla();
  if (api.demo && rol === 'yonetici' && !depoYerel.al(TK.yonetici)) depoYerel.koy(TK.yonetici, 'demo-yonetici');
  const token = depoYerel.al(rol === 'salon' ? TK.salon(slug) : TK.yonetici);
  const taban = rol === 'salon' ? `/salon/${slug}/yonetim` : '/yonetim';
  if (Y && Y.rol === rol && Y.slug === slug && Y.token === token && Y.veri) { Y.kok = kok; return sayfa(alt); }
  if (!token) return girisEkrani(kok, { rol, slug, alt });
  Y = { rol, slug, token, taban, kok, veri: null };
  kok.innerHTML = '<div class="yukleniyor"><i></i></div>';
  try { await veriAl(); } catch (e) { if (e.durum === 401) { depoYerel.sil(rol === 'salon' ? TK.salon(slug) : TK.yonetici); Y = null; return girisEkrani(kok, { rol, slug, alt, mesaj: 'Oturumun süresi doldu, yeniden giriş yapın.' }); } kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart"><h1>Bağlanılamadı</h1><p class="hata-yazi">${esc(e.message)}</p><button class="dg ana" onclick="location.reload()">Tekrar dene</button></div></div>`; return; }
  sayfa(alt);
}
async function veriAl() {
  if (Y.rol === 'salon') { const r = await api.salonTam(Y.slug, Y.token); Y.veri = { salonlar: [r.salon], dugunler: r.dugunler }; if (r.salon.tema) temaUygula(r.salon.tema, { tam: false }); }
  else Y.veri = await api.yonetim(Y.token);
}
function girisEkrani(kok, { rol, slug, alt, mesaj = '' }) {
  temaSifirla();
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">${markaIkon(64, 'giris-ikon')}<div><h1>${rol === 'salon' ? 'İşletme paneli' : 'Düğün Planla'}</h1><p class="soluk" style="margin-top:6px">${rol === 'salon' ? `Kullanıcı adınız <b>${esc(slug)}</b>. İşletmenize verilen şifreyle girin.` : 'Yönetici paneli. NFC Dünyası yönetici hesabınızla girin.'}</p></div>
    <form id="yG" autocomplete="on">${rol === 'salon' ? '' : `<label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="k" autocomplete="username" autocapitalize="none" required></label>`}<label class="alan"><span>Şifre</span><input class="girdi" name="s" type="password" autocomplete="current-password" required></label><button class="dg ana tam buyuk" type="submit">Giriş yap</button><p class="hata-yazi" id="yH">${esc(mesaj)}</p></form>
    ${api.demo ? `<p class="rozet vurgu">${rol === 'salon' ? 'Demo şifresi: salon123' : 'Demo: herhangi bir kullanıcı adı ve şifre'}</p>` : `<a class="dg sade kucuk" href="/dugun/giris?isletme">${rol === 'salon' ? 'Başka bir hesapla giriş' : 'İşletme sahibi misiniz? İşletme girişi'}</a>`}</div></div>`;
  $('#yG').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try {
      const r = rol === 'salon' ? await api.salonGiris(slug, f.get('s')) : await api.adminGiris(f.get('k'), f.get('s'));
      depoYerel.koy(rol === 'salon' ? TK.salon(slug) : TK.yonetici, r.token); Y = null; yonetimAc(kok, { rol, slug, alt });
    } catch (er) { $('#yH').textContent = er.message; b.disabled = false; b.textContent = 'Giriş yap'; }
  });
}
function cikis() { depoYerel.sil(Y.rol === 'salon' ? TK.salon(Y.slug) : TK.yonetici); const { rol, slug, kok } = Y; Y = null; girisEkrani(kok, { rol, slug, alt: '' }); }
function kabuk(aktif) {
  const s0 = Y.rol === 'salon' ? Y.veri.salonlar[0] : null;
  const N = Y.rol === 'salon' ? [['', 'ozet', 'Özet'], ['dugunler', 'takvim', 'Düğünler'], ['istatistik', 'istatistik', 'İstatistik'], ['alanlar', 'masa', 'Planlar'], ['hesap', 'ayar', 'Hesap']] : [['', 'ozet', 'Özet'], ['salonlar', 'salon', 'Salonlar'], ['dugunler', 'takvim', 'Düğünler'], ['gelir', 'para', 'Gelir'], ['istatistik', 'istatistik', 'İstatistik']];
  Y.kok.innerHTML = `<div class="kabuk yon"><header class="yon-ust"><div class="ic"><a class="marka" href="${href(yolY())}" data-git="${yolY()}">${s0 ? logoK(s0) : markaIkon(28)}<span>${esc(s0 ? s0.ad : 'Düğün Planla')}</span></a>
    <nav>${N.map(([k, i, a]) => `<a href="${href(yolY(k))}" data-git="${yolY(k)}" class="${aktif === k ? 'on' : ''}">${a}</a>`).join('')}</nav><span class="bosluk"></span>
    ${Y.rol === 'yonetici' && !api.demo ? `<a class="dg sade kucuk ana-panel" href="/panel/" title="NFC Dünyası yönetici paneli">${ikon('sol', 'kk')}<span>Ana panel</span></a>` : ''}<button class="dg ikon-d" data-y="cikis" aria-label="Çıkış">${ikon('cikis')}</button></div></header>
    <main class="icerik" id="yI"></main><nav class="alt-menu">${N.map(([k, i, a]) => `<a href="${href(yolY(k))}" data-git="${yolY(k)}" class="${aktif === k ? 'on' : ''}">${ikon(i)}<span>${a}</span></a>`).join('')}</nav></div>`;
  Y.kok.querySelector('[data-y=cikis]').onclick = async () => { if (await onayla({ baslik: 'Çıkış yapılsın mı?', evet: 'Çıkış yap' })) cikis(); };
  return $('#yI');
}
function sayfa(alt) {
  ayrilmaKoy(null); E = null; Y.alt = alt;
  const p = alt.split('/').filter(Boolean);
  if (Y.rol === 'salon') {
    if (p[0] === 'dugun' && p[1]) return dugunDetay(kabuk('dugunler'), p[1]);
    if (p[0] === 'dugun-plan' && p[1]) return dugunPlanDuzen(p[1]);
    if (p[0] === 'dugunler') return dugunListe(kabuk('dugunler'), { salon: Y.slug });
    if (p[0] === 'alanlar') return alanlarSalon(kabuk('alanlar'));
    if (p[0] === 'hesap') return salonHesap(kabuk('hesap'));
    if (p[0] === 'istatistik') return istatistik(kabuk('istatistik'));
    return salonOzet(kabuk(''));
  }
  if (p[0] === 'salonlar') return salonListe(kabuk('salonlar'));
  if (p[0] === 'yeni-salon') return salonDuzen(kabuk('salonlar'), null);
  if (p[0] === 'salon' && p[1]) return salonDuzen(kabuk('salonlar'), p[1], p[2] || 'bilgi');
  if (p[0] === 'plan' && p[1] && p[2]) return alanPlanDuzen(p[1], p[2]);
  if (p[0] === 'dugunler') return dugunListe(kabuk('dugunler'), {});
  if (p[0] === 'dugun' && p[1]) return dugunDetay(kabuk('dugunler'), p[1]);
  if (p[0] === 'dugun-plan' && p[1]) return dugunPlanDuzen(p[1]);
  if (p[0] === 'gelir') return gelir(kabuk('gelir'), p[1]);
  if (p[0] === 'istatistik') return istatistik(kabuk('istatistik'));
  return ozet(kabuk(''));
}
const salonBul = (slug) => Y.veri.salonlar.find((s) => s.slug === slug);

// ---------------------------------------------------------------- ücret ve ödeme durumu (hesap: ucret.js)
const BUAY = () => C.trBugun().slice(0, 7);
const durumRozet = (r) => (!r || r.durum === 'yok' ? '' : r.durum === 'odendi' ? '<span class="rozet iyi">Ödendi</span>' : r.durum === 'gecikti' ? `<span class="rozet hata">Gecikti · ${TL(r.kalan)}</span>` : `<span class="rozet uyari">${TL(r.kalan)} · son gün ${esc(C.tarihYaz(r.vade, { yil: false }))}</span>`);
const durumKisa = (r) => (r.durum === 'odendi' ? 'Ödendi' : r.durum === 'gecikti' ? `${TL(r.kalan)} gecikti` : r.durum === 'bekliyor' ? `Son gün ${C.tarihYaz(r.vade, { yil: false })}` : r.tutar ? '' : 'Hesap yok');
const hesapYazi = (r) => (r.dugun ? `${r.dugun} düğün${r.birim ? (r.ucretli !== r.dugun ? ` (${r.ucretli} ücretli)` : '') + ' × ' + TL(r.birim) : ''}` : 'Düğün yok') + (r.sabit ? ` + ${TL(r.sabit)} aylık` : '');
/** Salonun bir ayına ait satır: tutar, durum ve "Ödeme al". dokum: salonun aylık dökümü (solda ay kutusu, başlıkta hesap) */
function odemeSatir(s, r, { ay = r.ay, dokum = false, etiket = '' } = {}) {
  const kismi = r.odenen && r.kalan > 0 ? `${TL(r.odenen)} alındı` : '';
  const sol = dokum ? `<span class="ay-k"><b>${esc(U.ayAdi(r.ay, { kisa: true, yil: false }))}</b><small>${r.ay.slice(0, 4)}</small></span>` : logoK(s);
  const ana = dokum ? `<span class="ana"><b>${esc(hesapYazi(r))}</b>${etiket || kismi ? `<small>${esc([etiket, kismi].filter(Boolean).join(' · '))}</small>` : ''}</span>`
    : `<a class="ana" href="${href(yolY('salon/' + s.slug + '/odeme'))}" data-git="${yolY('salon/' + s.slug + '/odeme')}"><b>${esc(s.ad)}</b><small>${esc(hesapYazi(r) + (kismi ? ' · ' + kismi : ''))}</small></a>`;
  return `<div class="satir${dokum ? ' dokum' : ''}">${sol}${ana}<span class="tutar"><b>${TL(r.tutar)}</b><small class="${r.durum}">${esc(durumKisa(r))}</small></span>${r.kalan > 0 && r.ay <= BUAY() ? `<button class="dg cizgili kucuk" type="button" data-odeme="${esc(s.slug)}" data-ay="${ay}">Ödeme al</button>` : '<span class="odeme-bos"></span>'}</div>`;
}
/** Salonun kaydını yerinde değiştirip kaydeder (ödeme ekleme, plan kaydı) */
async function salonGuncelle(slug, f) {
  const s = salonBul(slug), x = { ...kopya(s), tema: kopya(s.temaHam || s.tema) };
  f(x);
  await api.salonKaydet(slug, { ...x, tema: { stil: x.tema.stil, vurgu: x.tema.vurgu, logoZemin: x.tema.logoZemin, kisaAd: x.tema.kisaAd, slogan: x.tema.slogan } }, Y.token);
  await veriAl(); Y.duz = null;
}
/** Okut ve Oyna'daki gibi hızlı ödeme kaydı; ay verilmezse en eski ödenmemiş ay seçilir */
function odemeAl(slug, ay = '') {
  const s = salonBul(slug); if (!s) return;
  if (!ay) ay = (U.salonOzet(s, Y.veri.dugunler).dokum.find((x) => x.kalan > 0 && x.ay <= BUAY()) || {}).ay || BUAY();
  const bilgi = (a) => { const r = U.donem(s, Y.veri.dugunler, a); return [r, `${U.ayAdi(a)}: ${hesapYazi(r)} = ${TL(r.tutar)}${r.odenen ? ` · ${TL(r.odenen)} alındı` : ''}`]; };
  const [r, yazi] = bilgi(ay);
  const c = cekmece({ baslik: 'Ödeme al', govde: `<form class="yigin" id="qO" autocomplete="off"><div style="display:flex;gap:12px;align-items:center">${logoK(s)}<span style="min-width:0"><b>${esc(s.ad)}</b><br><small class="soluk">${esc(U.ucretYazi(s, TL))}</small></span></div>
    <label class="alan"><span>Hangi ayın ödemesi?</span><input class="girdi" type="month" name="donem" value="${ay}" required></label>
    <p class="kucuk-yazi" id="qB" style="margin-top:-8px">${esc(yazi)}</p>
    <div class="izgara2"><label class="alan"><span>Tutar (₺)</span><input class="girdi" type="number" name="tutar" inputmode="numeric" min="0" value="${r.kalan || ''}"></label><label class="alan"><span>Alındığı gün</span><input class="girdi" type="date" name="tarih" value="${C.trBugun()}"></label></div>
    <label class="alan"><span>Not <span class="ipucu">(isteğe bağlı)</span></span><input class="girdi" name="not" maxlength="200" placeholder="Nakit, havale, kurulum ücreti…"></label></form>`,
  alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" id="qK">Kaydet</button>` });
  const f = $('#qO', c.el);
  f.donem.onchange = () => { if (!/^\d{4}-\d{2}$/.test(f.donem.value)) return; const [r2, y2] = bilgi(f.donem.value); $('#qB', c.el).textContent = y2; f.tutar.value = r2.kalan || ''; };
  $('#qK', c.el).onclick = async (e) => {
    const v = Object.fromEntries(new FormData(f)); if (!(+v.tutar > 0)) return bildir('Tutarı yazın', { hata: true });
    e.target.disabled = true;
    try { await salonGuncelle(slug, (x) => { x.odemeler = [...(x.odemeler || []), { id: C.rastgele(8), tarih: v.tarih || C.trBugun(), donem: v.donem || '', tutar: +v.tutar, not: v.not }]; }); c.kapat(); bildir(`${TL(+v.tutar)} kaydedildi`); sayfa(Y.alt || ''); }
    catch (er) { bildir(er.message, { hata: true }); e.target.disabled = false; }
  };
}
document.addEventListener('click', (e) => { const o = e.target.closest && e.target.closest('[data-odeme]'); if (o && Y?.rol === 'yonetici') { e.preventDefault(); odemeAl(o.dataset.odeme, o.dataset.ay || ''); } });

// ---------------------------------------------------------------- özet
function ozet(el) {
  const V = Y.veri, bugun = C.trBugun(), ay = bugun.slice(0, 7), sonraki = U.ayEkle(ay, 1);
  const T = U.ayToplam(V.salonlar, V.dugunler, ay), O = V.salonlar.map((s) => U.salonOzet(s, V.dugunler));
  const alacak = O.reduce((n, o) => n + o.alacak, 0), geciken = O.reduce((n, o) => n + o.geciken, 0);
  const yak = V.dugunler.filter((d) => d.tarih && d.tarih >= bugun && d.tarih <= C.gunEkle(bugun, 30));
  const sonrakiN = V.dugunler.filter((d) => (d.tarih || '').startsWith(sonraki)).length;
  const gecikenler = V.salonlar.map((s, i) => ({ s, L: O[i].gecikenAy.filter((x) => x.ay < ay) })).filter((x) => x.L.length);
  const git2 = (p) => `href="${href(yolY(p))}" data-git="${yolY(p)}"`;
  el.innerHTML = `<div class="bolum-bas"><h1>Özet</h1><span class="bosluk"></span><button class="dg ana kucuk" data-y="yeni-dugun">${ikon('arti', 'k')} Düğün</button></div>
  <div class="sayilar">
    <a class="sayi" ${git2('gelir')}><b>${T.dugun}</b><span>düğün ${esc(U.ayAdi(ay, { yil: false }))} ayında · ${sonrakiN} gelecek ay</span></a>
    <a class="sayi" ${git2('gelir')}><b class="tl">${TL(T.tutar)}</b><span>bu ayın hesabı · ${TL(T.odenen)} alındı</span>${T.tutar ? `<div class="ilerleme"><i style="width:${Math.min(100, Math.round((T.odenen / T.tutar) * 100))}%"></i></div>` : ''}</a>
    <a class="sayi" ${git2('gelir')}><b class="tl">${TL(alacak)}</b><span>toplam alacak${geciken ? ` · <em class="kirmizi">${TL(geciken)} gecikti</em>` : ''}</span></a>
    <a class="sayi" ${git2('salonlar')}><b>${V.salonlar.length}</b><span>salon · ${V.salonlar.filter((s) => s.aktif !== false).length} etkin</span></a></div>
  ${!V.salonlar.length ? `<section class="kart bos" style="margin-top:16px"><span class="serif">Henüz salon yok</span>İlk düğün salonunuzu ekleyin; logosunu, rengini, salon planını ve düğün başı ücretini ayarlayın.<br><a class="dg ana" ${git2('yeni-salon')}>Salon ekle</a></section>` : ''}
  ${gecikenler.length ? `<div class="uyari-kutu hata" style="margin-top:16px">${ikon('uyari', 'k')}<span>Geciken ödemeler: ${gecikenler.map((x) => `<b>${esc(x.s.ad)}</b> (${x.L.map((r) => `${esc(U.ayAdi(r.ay, { yil: false }))} ${TL(r.kalan)}`).join(', ')})`).join(' · ')}</span></div>` : ''}
  <div class="ozet-izgara" style="margin-top:16px"${V.salonlar.length ? '' : ' hidden'}>
    <section class="kart"><div class="kart-bas"><h2>Salonlar · ${esc(U.ayAdi(ay, { yil: false }))}</h2><span class="bosluk"></span><a class="dg sade kucuk" ${git2('gelir')}>Gelir</a></div>
      <div class="odeme-liste">${T.R.filter(({ s, r }) => s.aktif !== false || r.tutar).map(({ s, r }) => odemeSatir(s, r)).join('')}</div>
      <p class="kucuk-yazi" style="margin-top:8px">Düğün başı ücret, düğünün olduğu ayın hesabına yazılır.</p></section>
    <section class="kart"><div class="kart-bas"><h2>Önümüzdeki 30 gün</h2><span class="bosluk"></span><a class="dg sade kucuk" ${git2('dugunler')}>Tümü</a></div>${yak.length ? yak.slice(0, 12).map(dugunSatir).join('') : '<p class="soluk">Önümüzdeki 30 günde düğün yok.</p>'}</section></div>`;
  el.onclick = (e) => { if (e.target.closest('[data-y=yeni-dugun]')) dugunOlustur(); };
}
function dugunSatir(d) {
  const s = salonBul(d.salon), bugun = C.trBugun();
  const yuzde = d.geliyor + d.bekliyor ? Math.round((d.yerlesen / (d.geliyor + d.bekliyor)) * 100) : 0;
  return `<a class="dugun-satir" href="${href(yolY('dugun/' + d.kod))}" data-git="${yolY('dugun/' + d.kod)}">${takvimK(d.tarih)}<span style="min-width:0"><b class="ad">${esc(C.ciftAdi(d))}${d.tarih === bugun ? ' <span class="rozet vurgu">Bugün</span>' : ''}</b><small>${esc([Y.rol === 'yonetici' ? s?.ad : '', d.alanAd, C.saatYaz(d.saat)].filter(Boolean).join(' · '))}</small></span><span class="sag"><b>${d.kisi}</b><small>kişi · %${yuzde}</small></span></a>`;
}

// ---------------------------------------------------------------- düğün listesi, oluşturma, ayrıntı
function dugunListe(el, { salon = '' }) {
  const f = (Y.df ||= { k: 'yaklasan', s: salon, q: '' });
  if (salon) f.s = salon;
  const bugun = C.trBugun();
  const L = Y.veri.dugunler.filter((d) => (!f.s || d.salon === f.s) && (f.k === 'hepsi' || (f.k === 'yaklasan' ? !d.tarih || d.tarih >= bugun : d.tarih && d.tarih < bugun)) && (!f.q || C.araEslesir(C.ciftAdi(d) + ' ' + d.kod, f.q)));
  if (f.k === 'gecmis') L.reverse();
  const s0 = Y.rol === 'salon' ? Y.veri.salonlar[0] : null;
  el.innerHTML = `<div class="bolum-bas"><h1>Düğünler</h1><span class="bosluk"></span><button class="dg ana" data-y="yeni">${ikon('arti', 'k')} Yeni düğün</button></div>
    ${s0 && !s0.alanlar.length ? '<div class="uyari-kutu" style="margin-bottom:14px">Bu salon için henüz salon planı tanımlanmamış. Düğün eklemeden önce yöneticinizden salon planını isteyin.</div>' : ''}
    <div class="kaydir-x">${[['yaklasan', 'Yaklaşan'], ['gecmis', 'Geçmiş'], ['hepsi', 'Tümü']].map(([k, a]) => `<button class="cip${f.k === k ? ' on' : ''}" data-f="${k}">${a}</button>`).join('')}</div>
    <div class="filtre-cubuk"><label class="arama">${ikon('ara', 'k')}<input class="girdi" id="yAra" type="search" placeholder="Çift adı ya da kod" value="${esc(f.q)}"></label>${Y.rol === 'yonetici' ? `<select class="girdi" id="ySal" style="width:auto;flex:none;max-width:44%"><option value="">Tüm salonlar</option>${Y.veri.salonlar.map((s) => `<option value="${esc(s.slug)}"${f.s === s.slug ? ' selected' : ''}>${esc(s.ad)}</option>`).join('')}</select>` : ''}</div>
    <section class="kart" style="padding:6px 14px">${L.length ? L.map(dugunSatir).join('') : '<div class="bos"><span class="serif">Düğün yok</span>Yeni bir düğün ekleyerek çifte giriş kodu verin.</div>'}</section>`;
  el.onclick = (e) => { const c = e.target.closest('[data-f]'); if (c) { f.k = c.dataset.f; dugunListe(el, { salon }); } if (e.target.closest('[data-y=yeni]')) dugunOlustur(Y.rol === 'salon' ? Y.slug : f.s); };
  $('#yAra', el).oninput = (e) => { f.q = e.target.value; const p = e.target.selectionStart; dugunListe(el, { salon }); const i = $('#yAra', el); i.focus(); i.setSelectionRange(p, p); };
  const ss = $('#ySal', el); if (ss) ss.onchange = () => { f.s = ss.value; dugunListe(el, { salon }); };
}
function dugunOlustur(slug = '') {
  const S = Y.veri.salonlar.filter((s) => s.aktif !== false);
  if (!S.length) return bildir('Önce bir salon ekleyin', { hata: true });
  let s = salonBul(slug) || S[0];
  const alanSec = (s) => s.alanlar.map((a) => `<option value="${esc(a.id)}">${esc(a.ad)} · ${C.planOzet(a.plan).masa} masa</option>`).join('');
  const c = cekmece({ baslik: 'Yeni düğün', govde: `<form class="yigin" id="nD" autocomplete="off">
    ${Y.rol === 'yonetici' ? `<label class="alan"><span>Salon</span><select class="girdi" name="salon">${S.map((x) => `<option value="${esc(x.slug)}"${x.slug === s.slug ? ' selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label>` : ''}
    <label class="alan"><span>Salon alanı</span><select class="girdi" name="alan" id="nA">${alanSec(s)}</select></label>
    <div class="izgara2"><label class="alan"><span>Gelin</span><input class="girdi" name="gelin" maxlength="40" required></label><label class="alan"><span>Damat</span><input class="girdi" name="damat" maxlength="40" required></label></div>
    <div class="izgara3"><label class="alan"><span>Tarih</span><input class="girdi" type="date" name="tarih" required min="${C.gunEkle(C.trBugun(), -1)}"></label><label class="alan"><span>Başlangıç</span><input class="girdi" type="time" name="saat" value="19:00"></label><label class="alan"><span>Bitiş</span><input class="girdi" type="time" name="bitis" value="23:30"></label></div>
    <label class="alan"><span>Tür</span><select class="girdi" name="tur">${C.TURLER.map(([k, a]) => `<option value="${k}">${a}</option>`).join('')}</select></label>
    <p class="hata-yazi" id="nH" style="text-align:left"></p></form>`,
  alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" id="nK">Oluştur</button>` });
  const f = $('#nD', c.el);
  const ss = f.querySelector('[name=salon]'); if (ss) ss.onchange = () => { s = salonBul(ss.value); $('#nA', c.el).innerHTML = alanSec(s); };
  $('#nK', c.el).onclick = async () => {
    const v = Object.fromEntries(new FormData(f));
    if (!s.alanlar.length) return ($('#nH', c.el).textContent = 'Bu salonun salon planı yok. Önce salon planı ekleyin.');
    if (!v.gelin.trim() || !v.damat.trim()) return ($('#nH', c.el).textContent = 'Gelin ve damadın adını yazın.');
    if (!v.tarih) return ($('#nH', c.el).textContent = 'Düğün tarihini seçin.');
    const b = $('#nK', c.el); b.disabled = true;
    try {
      const r = await api.dugunOlustur({ salon: s.slug, alan: v.alan, bilgi: { gelin: v.gelin, damat: v.damat, tarih: v.tarih, saat: v.saat, bitis: v.bitis, tur: v.tur } }, Y.token);
      await veriAl(); c.kapat(); git(yolY('dugun/' + r.kod)); setTimeout(() => girisBilgisi(r.kod, r.girisKodu), 200);
    } catch (e) { $('#nH', c.el).textContent = e.message; b.disabled = false; }
  };
}
/** Çifte gönderilen mesaj: tek giriş adresi ve giriş kodu */
function ciftMesaji(d, gk) { return `Merhaba ${C.ciftAdi(d)}, Düğün Planla hesabınız hazır. Davetli listenizi ve oturma planınızı buradan hazırlayabilirsiniz.\n\nGiriş: ${girisLink()}\nGiriş kodunuz: ${C.girisKoduYaz(gk)}`; }
function girisBilgisi(kod, gk) {
  const d = Y.veri.dugunler.find((x) => x.kod === kod); if (!d || !gk) return;
  cekmece({ baslik: 'Düğün oluşturuldu', govde: `<div class="yigin"><p>Giriş kodunu çifte iletin. Kodu daha sonra düğünün sayfasında da görebilirsiniz.</p>
    <div class="kod-goster"><span class="etiket">${esc(C.ciftAdi(d))} · giriş kodu</span><b class="pin-goster">${esc(C.girisKoduYaz(gk))}</b><small class="soluk">${esc(girisLink().replace(/^https:\/\//, ''))} → Etkinlik sahibi</small></div>
    <div class="dg-grup"><a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', ciftMesaji(d, gk)))}">${ikon('mesaj', 'k')} WhatsApp ile çifte gönder</a><button class="dg cizgili" type="button" data-kopya="${esc(ciftMesaji(d, gk))}">${ikon('kopya', 'k')} Mesajı kopyala</button></div></div>`, alt: '<button class="dg ana" data-kapat>Tamam</button>' });
}
async function dugunDetay(el, kod) {
  el.innerHTML = '<div class="yukleniyor"><i></i></div>';
  let r; try { r = await api.tam(kod, '', Y.token); } catch (e) { el.innerHTML = `<div class="kart bos"><span class="serif">Düğün açılamadı</span>${esc(e.message)}<br><a class="dg cizgili" href="${href(yolY('dugunler'))}" data-git="${yolY('dugunler')}">Düğünlere dön</a></div>`; return; }
  const d = r.dugun, b = d.bilgi, s = salonBul(d.salon) || r.salon, sy = C.sayilar(d), gk = r.girisKodu || '';
  const link = paylasLink('/d/' + kod);
  const birim = Y.rol === 'yonetici' && s && b.tarih ? U.donem(s, [], b.tarih.slice(0, 7)).birim : 0;
  el.innerHTML = `<a class="geri-bag" href="${href(yolY('dugunler'))}" data-git="${yolY('dugunler')}">${ikon('sol', 'k')} Düğünler</a>
    <div class="bolum-bas"><div><p class="etiket">${esc(Object.fromEntries(C.TURLER)[b.tur])} · ${esc(C.tarihYaz(b.tarih, { gun: true }))} · ${esc(C.saatYaz(b.saat))}</p><h1 style="margin-top:4px">${esc(C.ciftAdi(b))}</h1><p class="soluk" style="margin-top:4px">${esc([s?.ad, d.alanAd].filter(Boolean).join(' · '))}</p></div><span class="bosluk"></span><a class="dg ana" href="${href('/d/' + kod + '/plan')}" data-git="/d/${kod}/plan">${ikon('kalem', 'k')} Planı aç</a></div>
    <div class="sayilar"><div class="sayi"><b>${sy.kisi}</b><span>${sy.davet} davetiye</span></div><div class="sayi"><b>${sy.geliyor}</b><span>geliyor · ${sy.bekliyor} bekleniyor</span></div><div class="sayi"><b>${sy.yerlesen}</b><span>kişi yerleşti · ${sy.masa} masa</span></div><div class="sayi"><b>${sy.gorevBitti}/${sy.gorev}</b><span>görev</span></div></div>
    <div class="paylas-izgara" style="margin-top:16px">
      <section class="kart"><div class="kart-bas"><h2>Çiftin girişi</h2></div><div class="yigin" style="gap:12px">
        <div class="kod-goster"><span class="etiket">Giriş kodu</span><span style="display:flex;align-items:center;gap:6px"><b class="pin-goster" id="dPin">${esc(C.girisKoduYaz(gk) || '—')}</b><button class="dg ikon-d" type="button" data-y="kopya" data-v="${esc(C.girisKoduYaz(gk))}" aria-label="Kodu kopyala">${ikon('kopya', 'k')}</button></span></div>
        <p class="kucuk-yazi">Çift <b>${esc(girisLink().replace(/^https:\/\//, ''))}</b> adresinde “Etkinlik sahibi” sekmesine bu kodu yazarak girer. Eşler aynı kodu kullanır.</p>
        <div class="dg-grup"><a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', ciftMesaji(b, gk)))}">${ikon('mesaj', 'k')} WhatsApp ile çifte gönder</a><button class="dg cizgili kucuk" data-y="pin">${ikon('yenile', 'kk')} Yeni kod</button></div></div></section>
      <section class="kart"><div class="kart-bas"><h2>Davetli bağlantısı</h2></div><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="qr-kutu" style="width:132px;height:132px">${qrSvg(link)}</div><div class="yigin" style="flex:1;min-width:180px;gap:8px"><div class="baglanti"><code>${esc(link)}</code><button class="dg kucuk" data-y="kopya" data-v="${esc(link)}">${ikon('kopya', 'kk')}</button></div><button class="dg cizgili kucuk" data-y="qr">${ikon('indir', 'kk')} QR'ı indir</button><a class="dg sade kucuk" href="${href('/d/' + kod)}" data-git="/d/${kod}">${ikon('goz', 'kk')} Sayfayı gör</a></div></div></section>
      <section class="kart"><div class="kart-bas"><h2>Düğün bilgileri</h2></div><form class="yigin" id="mF">
        <div class="izgara2"><label class="alan"><span>Gelin</span><input class="girdi" name="gelin" value="${esc(b.gelin)}" maxlength="40"></label><label class="alan"><span>Damat</span><input class="girdi" name="damat" value="${esc(b.damat)}" maxlength="40"></label></div>
        <div class="izgara3"><label class="alan"><span>Tarih</span><input class="girdi" type="date" name="tarih" value="${esc(b.tarih)}"></label><label class="alan"><span>Başlangıç</span><input class="girdi" type="time" name="saat" value="${esc(b.saat)}"></label><label class="alan"><span>Bitiş</span><input class="girdi" type="time" name="bitis" value="${esc(b.bitis)}"></label></div>
        <div class="izgara2"><label class="alan"><span>Tür</span><select class="girdi" name="tur">${C.TURLER.map(([k, a]) => `<option value="${k}"${k === b.tur ? ' selected' : ''}>${a}</option>`).join('')}</select></label><label class="alan"><span>Salon alanı</span><select class="girdi" name="alan">${(s?.alanlar || []).map((a) => `<option value="${esc(a.id)}"${a.id === d.alan ? ' selected' : ''}>${esc(a.ad)}</option>`).join('')}</select></label></div>
        ${Y.rol === 'yonetici' ? `<label class="anahtar"><span><b style="font-weight:500">Ücrete dahil</b><br><small class="soluk">${birim ? `Düğün başı ${TL(birim)} · ${esc(U.ayAdi(b.tarih.slice(0, 7)))} hesabına yazılır.` : 'Bu salonda düğün başı ücret yok.'} Deneme ya da ikram düğünlerinde kapatın.</small></span><input type="checkbox" name="ucretli"${d.ucretsiz ? '' : ' checked'}><i></i></label>` : ''}
        <div class="dg-grup"><button class="dg ana" type="submit">Kaydet</button></div></form></section>
      <section class="kart"><div class="kart-bas"><h2>Bu düğünün salon planı</h2></div><div class="plan-kutu" style="height:180px">${planSvg(C.genelPlan(d), { izgara: false })}</div>
        <p class="kucuk-yazi" style="margin:10px 0">${C.planOzet(d.plan).masa} masa · ${C.planOzet(d.plan).kisi} kişi. Çiftin masaları bu düğüne özel kopyadır; salonun ana planındaki değişiklikler buraya kendiliğinden geçmez.</p>
        <div class="dg-grup"><a class="dg cizgili kucuk" href="${href(yolY('dugun-plan/' + kod))}" data-git="${yolY('dugun-plan/' + kod)}">${ikon('duzen', 'kk')} Bu düğünün planını düzenle</a><button class="dg sade kucuk" data-y="yenile">${ikon('yenile', 'kk')} Salon planını yeniden uygula</button></div></section>
    </div>
    <div class="dg-grup" style="margin-top:22px"><button class="dg tehlike" data-y="sil">${ikon('cop', 'k')} Düğünü sil</button></div>`;
  el.onclick = async (e) => {
    const a = e.target.closest('[data-y]'); if (!a) return;
    if (a.dataset.y === 'kopya') kopyala(a.dataset.v);
    else if (a.dataset.y === 'qr') qrPng(link, `davet-qr-${kod}.png`, C.ciftAdi(b));
    else if (a.dataset.y === 'pin') { if (!(await onayla({ baslik: 'Yeni giriş kodu oluşturulsun mu?', metin: 'Eski kod çalışmaz ve çiftin açık oturumları kapanır; yeni kodu çifte iletmeniz gerekir.', evet: 'Oluştur' }))) return; try { const x = await api.pin(kod, {}, Y.token); bildir('Yeni giriş kodu: ' + C.girisKoduYaz(x.girisKodu), { sure: 8000 }); dugunDetay(el, kod); } catch (er) { bildir(er.message, { hata: true }); } }
    else if (a.dataset.y === 'yenile') { if (!(await onayla({ baslik: 'Salon planı yeniden uygulansın mı?', metin: 'Bu düğünün masa düzeni, salonun güncel planıyla değiştirilir. Aynı masalarda oturanlar yerinde kalır; kaldırılan masalardakiler masasız kalır.', evet: 'Uygula' }))) return; try { await api.meta(kod, { planYenile: true }, Y.token); await veriAl(); bildir('Salon planı uygulandı'); dugunDetay(el, kod); } catch (er) { bildir(er.message, { hata: true }); } }
    else if (a.dataset.y === 'sil') { if (!(await onayla({ baslik: `${C.ciftAdi(b)} silinsin mi?`, metin: 'Davetli listesi, oturma planı, görevler ve katılım yanıtları kalıcı olarak silinir. Bu işlem geri alınamaz.', evet: 'Kalıcı olarak sil', tehlike: true }))) return; try { await api.dugunSil(kod, Y.token); await veriAl(); bildir('Düğün silindi'); git(yolY('dugunler')); } catch (er) { bildir(er.message, { hata: true }); } }
  };
  $('#mF', el).onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    if (!v.tarih) return bildir('Tarih boş olamaz', { hata: true });
    try { await api.meta(kod, { bilgi: { gelin: v.gelin, damat: v.damat, tarih: v.tarih, saat: v.saat, bitis: v.bitis, tur: v.tur }, ...(v.alan && v.alan !== d.alan ? { alan: v.alan } : {}), ...(Y.rol === 'yonetici' ? { ucretsiz: !v.ucretli } : {}) }, Y.token); await veriAl(); bildir('Kaydedildi'); dugunDetay(el, kod); } catch (er) { bildir(er.message, { hata: true }); }
  };
}

// ---------------------------------------------------------------- salonlar
function salonListe(el) {
  const bugun = C.trBugun();
  el.innerHTML = `<div class="bolum-bas"><h1>Salonlar</h1><span class="bosluk"></span><a class="dg ana" href="${href(yolY('yeni-salon'))}" data-git="${yolY('yeni-salon')}">${ikon('arti', 'k')} Yeni salon</a></div>
  ${Y.veri.salonlar.length ? `<div class="kart-izgara">${Y.veri.salonlar.map((s) => { const yak = Y.veri.dugunler.filter((d) => d.salon === s.slug && d.tarih >= bugun).length; const oz = s.alanlar.map((a) => C.planOzet(a.plan)); return `<a class="kart salon-kart" href="${href(yolY('salon/' + s.slug))}" data-git="${yolY('salon/' + s.slug)}"><div class="ust-s">${logoK(s)}<div style="min-width:0"><b>${esc(s.ad)}</b><small class="soluk">/salon/${esc(s.slug)}</small></div></div><div class="cipler">${s.aktif === false ? '<span class="rozet hata">Kapalı</span>' : ''}<span class="rozet">${s.alanlar.length} alan · ${oz.reduce((n, o) => n + o.masa, 0)} masa</span><span class="rozet vurgu">${yak} yaklaşan düğün</span><span class="rozet">${esc(U.ucretYazi(s, TL))}</span>${s.giris ? '' : '<span class="rozet">İşletme girişi kapalı</span>'}${salonParaRozet(s)}</div></a>`; }).join('')}</div>` : `<div class="kart bos"><span class="serif">Henüz salon yok</span>İlk düğün salonunuzu ekleyin; logosunu, renklerini ve salon planını ayarlayın.<br><a class="dg ana" href="${href(yolY('yeni-salon'))}" data-git="${yolY('yeni-salon')}">Salon ekle</a></div>`}`;
}
function salonParaRozet(s) {
  const o = U.salonOzet(s, Y.veri.dugunler), r = o.buAy;
  if (o.geciken) return `<span class="rozet hata">Gecikti · ${TL(o.geciken)}</span>`;
  return r && r.tutar ? `<span class="rozet ${r.durum === 'odendi' ? 'iyi' : 'uyari'}">Bu ay ${TL(r.tutar)}${r.durum === 'odendi' ? ' · ödendi' : ''}</span>` : '';
}
const SEK = [['bilgi', 'Bilgiler'], ['tema', 'Görünüm'], ['alanlar', 'Salon planları'], ['dugunler', 'Düğünler'], ['giris', 'Giriş ve QR'], ['odeme', 'Ödemeler']];
function salonDuzen(el, slug, sekme = 'bilgi') {
  const eski = slug ? salonBul(slug) : null;
  if (slug && !eski) { el.innerHTML = `<div class="kart bos"><span class="serif">Salon bulunamadı</span><a class="dg cizgili" href="${href(yolY('salonlar'))}" data-git="${yolY('salonlar')}">Salonlara dön</a></div>`; return; }
  if (!Y.duz || Y.duz.slug !== (slug || '') || !slug) Y.duz = eski ? { ...kopya(eski), tema: kopya(eski.temaHam || eski.tema), temaUrl: eski.tema } : { slug: '', ad: '', aktif: true, tema: { stil: 'acik', vurgu: '', logoZemin: 'yok', kisaAd: '', slogan: '' }, iletisim: {}, alanlar: [], kisi: '', notlar: '', odeme: { tutar: 0, gun: 1, periyot: 'aylik' }, odemeler: [], yeni: true, temaUrl: {}, yeniSifre: sifreUret() };
  const x = Y.duz;
  if (!slug) sekme = 'bilgi';
  const sek = SEK.filter(([k]) => slug || k === 'bilgi');
  el.innerHTML = `<a class="geri-bag" href="${href(yolY('salonlar'))}" data-git="${yolY('salonlar')}">${ikon('sol', 'k')} Salonlar</a>
    <div class="bolum-bas"><div style="display:flex;gap:12px;align-items:center">${logoK({ ad: x.ad || 'Yeni', tema: x.temaUrl })}<h1>${esc(x.ad || 'Yeni salon')}</h1></div><span class="bosluk"></span><button class="dg ana" data-y="kaydet">${slug ? 'Kaydet' : 'Salonu oluştur'}</button></div>
    <div class="sekmeler">${sek.map(([k, a]) => `<button data-sk="${k}" class="${k === sekme ? 'on' : ''}">${a}</button>`).join('')}</div><div id="sG"></div>`;
  const g = $('#sG', el);
  const ciz = () => { ({ bilgi: sBilgi, tema: sTema, alanlar: sAlanlar, dugunler: sDugunler, giris: sGiris, odeme: sOdeme })[sekme](g, x, slug); };
  ciz();
  el.onclick = async (e) => {
    const sk = e.target.closest('[data-sk]'); if (sk) { sekme = sk.dataset.sk; $$('[data-sk]', el).forEach((b) => b.classList.toggle('on', b === sk)); history.replaceState(null, '', (ONIZLEME ? '#' : '') + tamYol(yolY(`salon/${slug}/${sekme}`))); ciz(); return; }
    if (e.target.closest('[data-y=kaydet]')) salonKaydet(slug);
  };
}
function topla(g, x) {
  $$('[data-s]', g).forEach((i) => { const p = i.dataset.s.split('.'); let o = x; for (let k = 0; k < p.length - 1; k++) o = o[p[k]] ||= {}; o[p.at(-1)] = i.type === 'checkbox' ? i.checked : i.type === 'number' || i.dataset.sayi ? +i.value : i.value; });
}
async function salonKaydet(slug) {
  const x = Y.duz, g = $('#sG'); if (g) topla(g, x);
  const yeni = !slug;
  const hedef = yeni ? C.slugla(x.slug || x.ad) : slug;
  if (!x.ad.trim()) return bildir('Salon adını yazın', { hata: true });
  if (!C.SLUG_RE.test(hedef)) return bildir('Salon adresi geçersiz: küçük harf, rakam ve tire kullanın', { hata: true });
  if (hedef === 'ornek-salon' && !api.demo) return bildir('Bu adres ayrılmış, başka bir adres seçin', { hata: true });
  const sifre = yeni ? (x.yeniSifre || '').trim() : '';
  if (sifre && sifre.length < 6) return bildir('Salon şifresi en az 6 karakter olmalı', { hata: true });
  try {
    const r = await api.salonKaydet(hedef, { ...x, yeni, tema: { stil: x.tema.stil, vurgu: x.tema.vurgu, logoZemin: x.tema.logoZemin, kisaAd: x.tema.kisaAd, slogan: x.tema.slogan } }, Y.token);
    let sifreOk = false;
    if (sifre) { try { await api.salonSifre(r.salon.slug, sifre, Y.token); sifreOk = true; } catch (e) { bildir('Salon kaydedildi ama şifre ayarlanamadı: ' + e.message, { hata: true }); } }
    await veriAl(); Y.duz = null; bildir('Kaydedildi');
    if (yeni) { git(yolY('salon/' + r.salon.slug + '/tema')); if (sifreOk) setTimeout(() => hesapBilgisi(r.salon.ad, r.salon.slug, sifre), 250); }
    else salonDuzen($('#yI'), slug, $('.sekmeler .on')?.dataset.sk || 'bilgi');
    return true;
  } catch (e) { bildir(e.message, { hata: true }); return false; }
}
function sBilgi(g, x, slug) {
  const i = x.iletisim || {};
  g.innerHTML = `<div class="yigin" style="max-width:760px">
    <div class="izgara2"><label class="alan"><span>Salon adı</span><input class="girdi" data-s="ad" value="${esc(x.ad)}" maxlength="80" placeholder="Örn. Yıldız Düğün Salonu"></label>
      <label class="alan"><span>Adres (QR bağlantısı)</span><input class="girdi" data-s="slug" id="sSlug" value="${esc(slug || x.slug)}" ${slug ? 'readonly' : ''} placeholder="yildiz-dugun" maxlength="40"><small class="ipucu">${esc(SITE)}/salon/<b id="sSlugO">${esc(slug || x.slug || '…')}</b>${slug ? ' · basılı QR’lar bozulmasın diye değiştirilemez' : ''}</small></label></div>
    <div class="izgara2"><label class="alan"><span>Kısa ad <span class="ipucu">(logo yoksa davetiyede görünür)</span></span><input class="girdi" data-s="tema.kisaAd" value="${esc(x.tema.kisaAd)}" maxlength="40"></label><label class="alan"><span>Slogan</span><input class="girdi" data-s="tema.slogan" value="${esc(x.tema.slogan)}" maxlength="90" placeholder="Örn. 1998’den beri Kadıköy’de"></label></div>
    <label class="alan"><span>Açık adres</span><input class="girdi" data-s="iletisim.adres" value="${esc(i.adres)}" maxlength="200"></label>
    <div class="izgara2"><label class="alan"><span>Telefon</span><input class="girdi" data-s="iletisim.telefon" value="${esc(i.telefon)}" maxlength="30" inputmode="tel"></label><label class="alan"><span>Instagram</span><input class="girdi" data-s="iletisim.instagram" value="${esc(i.instagram)}" maxlength="60" placeholder="kullaniciadi"></label></div>
    <div class="izgara2"><label class="alan"><span>Harita bağlantısı <span class="ipucu">(Google Haritalar, https://)</span></span><input class="girdi" data-s="iletisim.harita" value="${esc(i.harita)}" maxlength="500" placeholder="https://maps.app.goo.gl/…"></label><label class="alan"><span>Web sitesi</span><input class="girdi" data-s="iletisim.web" value="${esc(i.web)}" maxlength="500" placeholder="https://"></label></div>
    <label class="alan"><span>Yetkili kişi</span><input class="girdi" data-s="kisi" value="${esc(x.kisi)}" maxlength="80"></label>
    <label class="alan"><span>Notlar <span class="ipucu">(sadece siz görürsünüz)</span></span><textarea class="girdi" data-s="notlar" rows="3" maxlength="4000">${esc(x.notlar)}</textarea></label>
    <label class="anahtar"><span><b style="font-weight:500">Salon etkin</b><br><small class="soluk">Kapalıyken salonun sayfaları, davetli sayfaları ve çift paneli açılmaz.</small></span><input type="checkbox" data-s="aktif" ${x.aktif !== false ? 'checked' : ''}><i></i></label>
    ${slug ? `<hr class="ayrac"><div><button class="dg tehlike" data-sil="1">${ikon('cop', 'k')} Salonu sil</button></div>` : `<hr class="ayrac"><div class="yigin" style="gap:12px"><div><h3>Salon sahibinin girişi</h3><p class="soluk" style="margin-top:4px">Salon sahibi bu bilgilerle kendi işletme paneline girer; düğün açar, çiftlere giriş kodu verir ve istatistiklerini görür. Ödemeleri ve notlarınızı göremez.</p></div>
      <div class="izgara2"><label class="alan"><span>Kullanıcı adı <span class="ipucu">(salonun adresi)</span></span><input class="girdi" id="sKA" value="${esc(x.slug || '')}" readonly tabindex="-1"></label><label class="alan"><span>Şifre</span><span style="display:flex;gap:8px"><input class="girdi" id="sYS" value="${esc(x.yeniSifre || '')}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="60"><button class="dg cizgili" type="button" id="sYU" aria-label="Yeni şifre üret" style="flex:none;padding:0 14px">${ikon('yenile', 'k')}</button></span></label></div>
      <small class="ipucu">Boş bırakırsanız işletme girişi kapalı olur; sonradan “Giriş ve QR” sekmesinden açabilirsiniz. Ücreti salon oluşunca “Ödemeler” sekmesinden girin.</small></div>`}</div>`;
  const ad = $('[data-s=ad]', g), sl = $('#sSlug', g);
  if (!slug) {
    const ka = () => { $('#sSlugO', g).textContent = sl.value || '…'; $('#sKA', g).value = sl.value; };
    ad.oninput = () => { if (!sl.dataset.el) { sl.value = C.slugla(ad.value); ka(); } };
    sl.oninput = () => { sl.dataset.el = '1'; sl.value = sl.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); ka(); };
    $('#sYS', g).oninput = (e) => { x.yeniSifre = e.target.value.trim(); };
    $('#sYU', g).onclick = () => { x.yeniSifre = sifreUret(); $('#sYS', g).value = x.yeniSifre; };
  }
  g.oninput = () => topla(g, x);
  const sb = $('[data-sil]', g); if (sb) sb.onclick = () => salonSil(slug);
}
async function salonSil(slug) {
  const n = Y.veri.dugunler.filter((d) => d.salon === slug).length;
  if (!(await onayla({ baslik: 'Salon silinsin mi?', metin: n ? `Bu salonda <b>${n} düğün</b> kaydı var. Salonla birlikte bu düğünlerin tüm verileri (davetliler, planlar, yanıtlar) kalıcı olarak silinir.` : 'Salonun teması, planları ve QR sayfası kalıcı olarak silinir.', evet: n ? 'Her şeyiyle sil' : 'Sil', tehlike: true }))) return;
  try { await api.salonSil(slug, n > 0, Y.token); await veriAl(); Y.duz = null; bildir('Salon silindi'); git(yolY('salonlar')); } catch (e) { bildir(e.message, { hata: true }); }
}
function sTema(g, x, slug) {
  const t = x.tema; t.stil = stilAdi(t.stil);
  const varsayilan = () => STILLER[t.stil].vurgu, secili = () => (t.vurgu || varsayilan()).toLowerCase();
  g.innerHTML = `<div class="ozet-izgara"><div class="yigin">
    <div class="alan"><span>Görünüm</span><div class="stil-sec">${Object.entries(STILLER).map(([k, s]) => `<button type="button" data-stil="${k}" class="${k === t.stil ? 'on' : ''}"><span class="ornek" style="background:${s.zemin}"><i style="background:${s.yuzey};width:72%"></i><i style="background:${s.vurgu};width:38%"></i></span>${esc(s.ad)}</button>`).join('')}</div><small class="ipucu">Davetli ve salon sayfaları bu görünümle açılır. Çift ve salon panelleri her zaman açık görünümdedir.</small></div>
    <div class="alan"><span>Renk</span><div class="renk-sec" id="tRenk">${VURGULAR.map(([v, a]) => `<button type="button" data-vurgu="${v}" title="${a}" aria-label="${a}" style="background:${v}"></button>`).join('')}<label title="Özel renk"><input type="color" id="tV" value="${esc(secili())}" aria-label="Özel renk"> Özel</label></div><small class="ipucu">Düğmeler, seçili sekme ve masa numaraları bu renkte görünür.</small></div>
    <div class="izgara2"><div class="alan"><span>Logo</span><div class="dg-grup"><button class="dg cizgili kucuk" data-gorsel="logo">${ikon('yukle', 'kk')} ${x.temaUrl?.logo ? 'Değiştir' : 'Yükle'}</button>${x.temaUrl?.logo ? `<button class="dg sade kucuk" data-gsil="logo">Kaldır</button>` : ''}</div><small class="ipucu">Şeffaf zeminli PNG en iyisi.</small></div>
      <div class="alan"><span>Kapak fotoğrafı</span><div class="dg-grup"><button class="dg cizgili kucuk" data-gorsel="kapak">${ikon('yukle', 'kk')} ${x.temaUrl?.kapak ? 'Değiştir' : 'Yükle'}</button>${x.temaUrl?.kapak ? `<button class="dg sade kucuk" data-gsil="kapak">Kaldır</button>` : ''}</div><small class="ipucu">Salonun QR sayfasında görünür.</small></div></div>
    <label class="alan"><span>Logo arka planı</span><select class="girdi" id="tLZ"><option value="yok"${t.logoZemin === 'yok' ? ' selected' : ''}>Yok (şeffaf)</option><option value="acik"${t.logoZemin === 'acik' ? ' selected' : ''}>Beyaz kutu</option><option value="koyu"${t.logoZemin === 'koyu' ? ' selected' : ''}>Siyah kutu</option></select></label>
    <p class="kucuk-yazi">Değişiklikler “Kaydet” ile yayına girer. Logo ve kapak fotoğrafı seçildiği anda kaydedilir.</p></div>
    <div><p class="grup-baslik">Önizleme</p><div class="tema-onizle" id="tOn"></div></div></div>`;
  const on = () => {
    const k = $('#tOn', g);
    $$('[data-vurgu]', g).forEach((b) => b.classList.toggle('on', b.dataset.vurgu === secili()));
    $('#tV', g).value = secili();
    k.innerHTML = `<div class="ic">${x.temaUrl?.logo ? `<div class="davet-logo${t.logoZemin === 'acik' ? ' plaka' : t.logoZemin === 'koyu' ? ' plaka-koyu' : ''}"><img src="${esc(x.temaUrl.logo)}" alt="" style="max-height:48px"></div>` : `<div class="davet-logo"><span class="yazi-logo">${esc(t.kisaAd || x.ad || 'Salon adı')}</span></div>`}
      <div class="davet-kart" style="width:100%;padding:24px 16px;gap:10px"><p class="etiket">Düğünümüze davetlisiniz</p><div class="isimler" style="font-size:38px">Elif<span>&amp;</span>Can</div><div class="tarih" style="font-size:16px">12 Haziran 2027<small>Cumartesi · 19.30</small></div><span class="dg vurgu kucuk">Katılacağım</span></div></div>`;
    temaUygula({ stil: t.stil, vurgu: t.vurgu }, { tam: true, kok: k.querySelector('.ic') });
  };
  on();
  g.onclick = async (e) => {
    const s = e.target.closest('[data-stil]'); if (s) { const eskiV = varsayilan(); t.stil = s.dataset.stil; if (t.vurgu && t.vurgu.toLowerCase() === eskiV) t.vurgu = ''; $$('[data-stil]', g).forEach((b) => b.classList.toggle('on', b === s)); on(); return; }
    const v = e.target.closest('[data-vurgu]'); if (v) { t.vurgu = v.dataset.vurgu === varsayilan() ? '' : v.dataset.vurgu; on(); return; }
    const gs = e.target.closest('[data-gorsel]'); if (gs) return gorselSec(slug, gs.dataset.gorsel);
    const gx = e.target.closest('[data-gsil]'); if (gx) { try { const r = await api.gorsel(slug, gx.dataset.gsil, '', Y.token); x.temaUrl = r.salon.tema; await veriAl(); sTema(g, x, slug); } catch (er) { bildir(er.message, { hata: true }); } }
  };
  $('#tV', g).oninput = (e) => { t.vurgu = e.target.value; on(); };
  $('#tLZ', g).onchange = (e) => { t.logoZemin = e.target.value; on(); };
}
function gorselSec(slug, tur) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const v = await resimKucult(f, tur === 'logo' ? { max: 640, tip: f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png' } : { max: 1600, tip: 'image/jpeg', kalite: 0.82 });
      if (v.length > 1.35e6) return bildir('Görsel çok büyük; daha küçük bir dosya seçin', { hata: true });
      const r = await api.gorsel(slug, tur, v, Y.token); Y.duz.temaUrl = r.salon.tema; await veriAl(); bildir(tur === 'logo' ? 'Logo kaydedildi' : 'Kapak fotoğrafı kaydedildi');
      sTema($('#sG'), Y.duz, slug);
    } catch (e) { bildir(e.message, { hata: true }); }
  };
  inp.click();
}
function alanKart(a, { duzenle = true } = {}) {
  const o = C.planOzet(a.plan);
  return `<section class="kart"><div class="kart-bas"><h3>${esc(a.ad)}</h3><span class="bosluk"></span><span class="rozet">${a.plan.en} × ${a.plan.boy} m</span></div>
    <div class="plan-kutu" style="height:190px">${planSvg(a.plan, { izgara: false })}</div>
    <p class="kucuk-yazi" style="margin:10px 0">${o.masa} masa · ${o.kisi} kişi${o.ek ? ` · +${o.ek} ek sandalye` : ''}</p>
    ${duzenle ? `<div class="dg-grup"><a class="dg ana kucuk" href="${href(yolY(`plan/${Y.duz?.slug || ''}/${a.id}`))}" data-git="${yolY(`plan/${Y.duz?.slug || ''}/${a.id}`)}">${ikon('duzen', 'kk')} Planı düzenle</a><button class="dg cizgili kucuk" data-alan="ad" data-id="${a.id}">Adını değiştir</button><button class="dg sade kucuk" data-alan="kopya" data-id="${a.id}">Çoğalt</button><button class="dg sade kucuk" data-alan="sil" data-id="${a.id}" aria-label="Sil">${ikon('cop', 'kk')}</button></div>` : ''}</section>`;
}
function sAlanlar(g, x, slug) {
  g.innerHTML = `<p class="soluk" style="margin-bottom:14px">Salonun her alanı (salon, bahçe, teras…) için masa sayısını, masa başına kişiyi, sahneyi ve sahneye uzaklığı burada ayarlayın. Yeni düğünler seçilen alanın planıyla başlar.</p>
    <div class="kart-izgara" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${x.alanlar.map((a) => alanKart(a)).join('')}<button class="kart bos" type="button" data-alan="yeni">${ikon('arti')}<span class="serif">Yeni alan ekle</span>Hızlı oluşturucu ile masaları tek seferde yerleştirin.</button></div>`;
  g.onclick = async (e) => {
    const b = e.target.closest('[data-alan]'); if (!b) return;
    const i = x.alanlar.findIndex((a) => a.id === b.dataset.id);
    if (b.dataset.alan === 'yeni') {
      const ad = await sorPencere('Alanın adı', x.alanlar.length ? 'Bahçe' : 'Ana salon'); if (!ad) return;
      const id = 'a' + C.rastgele(5);
      x.alanlar.push({ id, ad, plan: C.planOlustur({}).plan });
      if (await salonKaydet(slug)) git(yolY(`plan/${slug}/${id}`) + '?olustur=1');
    } else if (b.dataset.alan === 'ad') { const ad = await sorPencere('Alanın yeni adı', x.alanlar[i].ad); if (!ad) return; x.alanlar[i].ad = ad; await salonKaydet(slug); }
    else if (b.dataset.alan === 'kopya') { x.alanlar.push({ ...kopya(x.alanlar[i]), id: 'a' + C.rastgele(5), ad: x.alanlar[i].ad + ' (kopya)' }); await salonKaydet(slug); }
    else if (b.dataset.alan === 'sil') { if (!(await onayla({ baslik: `${x.alanlar[i].ad} silinsin mi?`, metin: 'Bu alanla oluşturulmuş düğünlerin planları etkilenmez (her düğünün kendi kopyası vardır).', evet: 'Sil', tehlike: true }))) return; x.alanlar.splice(i, 1); await salonKaydet(slug); }
  };
}
function sorPencere(baslik, deger = '') {
  return new Promise((ok) => {
    const c = cekmece({ baslik: esc(baslik), govde: `<input class="girdi" id="sp" value="${esc(deger)}" maxlength="60">`, alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" id="spT">Tamam</button>`, onKapat: (v) => ok(typeof v === 'string' ? v.trim() : '') });
    const i = $('#sp', c.el); setTimeout(() => { i.focus(); i.select(); }, 50); $('#spT', c.el).onclick = () => c.kapat(i.value); i.onkeydown = (e) => { if (e.key === 'Enter') c.kapat(i.value); };
  });
}
function sDugunler(g, x, slug) { dugunListe(g, { salon: slug }); g.querySelector('.bolum-bas h1').textContent = 'Bu salonun düğünleri'; }
function sGiris(g, x, slug) {
  const sl = paylasLink('/salon/' + slug);
  g.innerHTML = `<div class="paylas-izgara"><section class="kart"><div class="kart-bas"><h2>İşletme girişi</h2><span class="bosluk"></span><span class="rozet ${x.giris ? 'iyi' : ''}">${x.giris ? 'Açık' : 'Kapalı'}</span></div>
      <p class="soluk" style="margin-bottom:12px">Salon sahibi bu bilgilerle işletme paneline girip düğün açar, çiftlere giriş kodu verir, planları yazdırır ve istatistiklerini görür. Ödemeleri ve notlarınızı göremez.</p>
      ${x.giris ? `${bilgiListe(slug, x.girisSifre)}${x.girisSifre ? '' : '<p class="kucuk-yazi" style="margin:-4px 0 12px">Bu şifre önceki sürümde belirlendiği için görüntülenemiyor. Yeni şifre oluşturursanız burada görünür.</p>'}
        <div class="dg-grup" style="margin-bottom:12px">${x.girisSifre ? `<a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', salonMesaji(x.ad, slug, x.girisSifre)))}">${ikon('mesaj', 'k')} WhatsApp ile gönder</a>` : ''}<button class="dg cizgili" data-g="yeni">${ikon('yenile', 'k')} Yeni şifre oluştur</button></div>`
      : `<div class="dg-grup" style="margin-bottom:12px"><button class="dg ana" data-g="yeni">Şifre oluştur ve girişi aç</button></div>`}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="girdi" id="sSf" type="text" placeholder="${x.giris ? 'Ya da şifreyi kendiniz yazın' : 'Şifreyi kendiniz yazın (en az 6 karakter)'}" autocomplete="off" autocapitalize="none" spellcheck="false" style="flex:1;min-width:160px"><button class="dg cizgili" data-g="sifre">${x.giris ? 'Değiştir' : 'Girişi aç'}</button></div>
      ${x.giris ? `<button class="dg sade kucuk" data-g="kapat" style="margin-top:10px">Girişi kapat</button>` : ''}</section>
    <section class="kart"><div class="kart-bas"><h2>Kalıcı salon QR'ı</h2></div><p class="soluk" style="margin-bottom:12px">Salonun girişine konacak QR ya da NFC standı bu adrese gider. O gün salonda düğün varsa misafir doğrudan masa bulucuya ulaşır; yoksa salonun sayfası açılır.</p>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="qr-kutu" style="width:150px;height:150px">${qrSvg(sl)}</div><div class="yigin" style="flex:1;min-width:180px;gap:8px"><div class="baglanti"><code>${esc(sl)}</code><button class="dg kucuk" data-g="kopya" data-v="${esc(sl)}">${ikon('kopya', 'kk')}</button></div><button class="dg cizgili kucuk" data-g="qr">${ikon('indir', 'kk')} QR'ı indir (PNG)</button><a class="dg sade kucuk" href="${href('/salon/' + slug)}" data-git="/salon/${slug}">${ikon('goz', 'kk')} Sayfayı gör</a></div></div></section></div>`;
  const ayarla = async (sifre) => {
    try {
      const r = await api.salonSifre(slug, sifre, Y.token); x.giris = r.giris; x.girisSifre = r.girisSifre || ''; await veriAl();
      sGiris(g, x, slug);
      if (r.giris) hesapBilgisi(x.ad, slug, sifre); else bildir('İşletme girişi kapatıldı');
    } catch (er) { bildir(er.message, { hata: true }); }
  };
  g.onclick = async (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    if (b.dataset.g === 'kopya') kopyala(b.dataset.v);
    else if (b.dataset.g === 'qr') qrPng(sl, `salon-qr-${slug}.png`, x.tema.kisaAd || x.ad);
    else if (b.dataset.g === 'yeni') { if (x.giris && !(await onayla({ baslik: 'Yeni şifre oluşturulsun mu?', metin: 'Salonun açık oturumları kapanır; yeni şifreyi salon sahibine iletmeniz gerekir.', evet: 'Oluştur' }))) return; ayarla(sifreUret()); }
    else if (b.dataset.g === 'sifre') { const v = $('#sSf', g).value.trim(); if (v.length < 6) return bildir('Şifre en az 6 karakter olmalı', { hata: true }); ayarla(v); }
    else if (b.dataset.g === 'kapat') { if (!(await onayla({ baslik: 'İşletme girişi kapatılsın mı?', metin: 'Salon sahibi işletme paneline giremez; düğünler ve davetli sayfaları açık kalır.', evet: 'Kapat', tehlike: true }))) return; ayarla(null); }
  };
}
function sOdeme(g, x, slug) {
  const o = (x.odeme ||= {});
  o.model = U.modelAl(x); o.gun ||= 1;
  const kayitli = salonBul(slug), oz = U.salonOzet(kayitli, Y.veri.dugunler), buAy = BUAY();
  const L = [...(kayitli.odemeler || [])].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  const aciklama = () => {
    const g2 = `${o.gun || 1}’i`;
    return { dugun: `Her ay, o ay tarihli düğün sayısı × düğün başı ücret hesaplanır; ertesi ayın ${g2} ödenir. Ücrete dahil olmayan düğünleri (deneme, ikram) düğünün sayfasından kapatabilirsiniz.`,
      aylik: `Her ayın ${g2} sabit ücret alınır; düğün sayısı fark etmez.`,
      ikisi: `Aylık sabit ücret + o ayın düğünleri × düğün başı ücret; ertesi ayın ${g2} ödenir.`,
      yok: 'Bu salondan ücret alınmaz. Yine de ödeme kaydedebilirsiniz.' }[o.model];
  };
  const dok = [...oz.dokum].reverse();
  g.innerHTML = `<div class="ozet-izgara"><section class="kart"><div class="kart-bas"><h2>Ücret</h2></div><div class="yigin" style="gap:14px">
      <div class="segment model-sec" id="oM" role="tablist">${U.MODELLER.map(([k, a]) => `<button type="button" data-model="${k}" class="${o.model === k ? 'on' : ''}">${a}</button>`).join('')}</div>
      <div class="izgara2">${o.model === 'dugun' || o.model === 'ikisi' ? `<label class="alan"><span>Düğün başı (₺)</span><input class="girdi" type="number" min="0" step="50" inputmode="numeric" data-s="odeme.dugunBasi" value="${o.dugunBasi || ''}" placeholder="0"></label>` : ''}${o.model === 'aylik' || o.model === 'ikisi' ? `<label class="alan"><span>Aylık (₺)</span><input class="girdi" type="number" min="0" step="50" inputmode="numeric" data-s="odeme.tutar" value="${o.tutar || ''}" placeholder="0"></label>` : ''}</div>
      ${o.model === 'yok' ? '' : `<div class="izgara2"><label class="alan"><span>Ödeme günü</span><select class="girdi" data-s="odeme.gun" data-sayi="1">${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}"${(o.gun || 1) === i + 1 ? ' selected' : ''}>Her ayın ${i + 1}’i</option>`).join('')}</select></label><label class="alan"><span>Başlangıç <span class="ipucu">(isteğe bağlı)</span></span><input class="girdi" type="date" data-s="odeme.baslangic" value="${esc(o.baslangic || '')}"></label></div>`}
      <p class="kucuk-yazi" id="oA">${esc(aciklama())}</p>
      <div><button class="dg ana" type="button" data-o="kaydet">Ücreti kaydet</button></div></div></section>
    <section class="kart"><div class="kart-bas"><h2>Hesap</h2><span class="bosluk"></span><button class="dg cizgili kucuk" type="button" data-odeme="${esc(slug)}">Ödeme al</button></div>
      <div class="sayilar iki"><div class="sayi"><b class="tl">${TL(oz.buAy?.tutar || 0)}</b><span>bu ayın hesabı · ${oz.buAy?.dugun || 0} düğün</span></div><div class="sayi"><b class="tl">${TL(oz.alacak)}</b><span>toplam alacak${oz.geciken ? ` · <em class="kirmizi">${TL(oz.geciken)} gecikti</em>` : ''}</span></div>
        <div class="sayi"><b class="tl">${TL(oz.tahsil)}</b><span>bugüne kadar alındı</span></div><div class="sayi"><b class="tl">${TL(oz.beklenen)}</b><span>önümüzdeki 3 ayın düğünlerinden</span></div></div>
      <p class="kucuk-yazi" style="margin-top:10px">Kaydedilmiş ücretle hesaplanır.</p></section></div>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Aylık döküm</h2></div><div class="odeme-liste">${dok.map((r) => odemeSatir(kayitli, r, { dokum: true, etiket: r.ay === buAy ? 'Bu ay' : r.ay > buAy ? 'Planlanan' : '' })).join('')}</div></section>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Alınan ödemeler</h2><span class="bosluk"></span><span class="rozet">${TL(L.reduce((n, p) => n + p.tutar, 0))} toplam</span></div>${L.length ? L.map((p) => `<div class="satir"><span class="ana"><b>${TL(p.tutar)}</b><small>${esc(C.tarihYaz(p.tarih))}${p.donem ? ' · ' + esc(U.ayAdi(p.donem)) + ' hesabı' : ''}${p.not ? ' · ' + esc(p.not) : ''}</small></span><button class="dg ikon-d" data-osil="${p.id}" aria-label="Sil">${ikon('cop', 'k')}</button></div>`).join('') : '<p class="soluk">Henüz ödeme kaydı yok.</p>'}</section>`;
  g.oninput = (e) => { topla(g, x); if (e.target.dataset.s === 'odeme.gun') $('#oA', g).textContent = aciklama(); };
  g.onchange = g.oninput;
  g.onclick = async (e) => {
    const m = e.target.closest('[data-model]'); if (m) { topla(g, x); o.model = m.dataset.model; sOdeme(g, x, slug); return; }
    if (e.target.closest("[data-o=kaydet]")) { topla(g, x); await salonKaydet(slug); return; }
    const b = e.target.closest('[data-osil]'); if (!b) return;
    if (!(await onayla({ baslik: 'Ödeme kaydı silinsin mi?', evet: 'Sil', tehlike: true }))) return;
    x.odemeler = (x.odemeler || []).filter((p) => p.id !== b.dataset.osil); await salonKaydet(slug);
  };
}
function salonHesap(el) {
  const s = Y.veri.salonlar[0], sl = paylasLink('/salon/' + Y.slug);
  el.innerHTML = `<div class="bolum-bas"><h1>Hesap</h1></div><div class="paylas-izgara">
    <section class="kart"><div class="kart-bas"><h2>Giriş bilgileri</h2></div>${bilgiListe(Y.slug, null)}
      <form class="yigin" id="hS" autocomplete="on" style="gap:10px"><input type="text" name="k" value="${esc(Y.slug)}" autocomplete="username" hidden><label class="alan"><span>Mevcut şifre</span><input class="girdi" type="password" name="eski" autocomplete="current-password" required></label><label class="alan"><span>Yeni şifre</span><input class="girdi" type="password" name="yeni" autocomplete="new-password" minlength="6" required></label><button class="dg ana" type="submit">Şifreyi değiştir</button></form></section>
    <section class="kart"><div class="kart-bas"><h2>Salonun kalıcı QR'ı</h2></div><p class="soluk" style="margin-bottom:12px">Girişe konacak QR ya da NFC standı. O gün düğün varsa misafiri masa bulucuya götürür.</p>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="qr-kutu" style="width:140px;height:140px">${qrSvg(sl)}</div><div class="yigin" style="flex:1;min-width:180px;gap:8px"><div class="baglanti"><code>${esc(sl)}</code><button class="dg kucuk" type="button" data-kopya="${esc(sl)}">${ikon('kopya', 'kk')}</button></div><button class="dg cizgili kucuk" type="button" data-h="qr">${ikon('indir', 'kk')} QR'ı indir (PNG)</button><a class="dg sade kucuk" href="${href('/salon/' + Y.slug)}" data-git="/salon/${Y.slug}">${ikon('goz', 'kk')} Sayfayı gör</a></div></div></section></div>
    <div class="dg-grup" style="margin-top:22px"><button class="dg cizgili" type="button" data-h="cikis">${ikon('cikis', 'k')} Çıkış yap</button></div>`;
  el.onclick = async (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    if (b.dataset.h === 'qr') qrPng(sl, `salon-qr-${Y.slug}.png`, s.tema?.kisaAd || s.ad);
    else if (b.dataset.h === 'cikis' && (await onayla({ baslik: 'Çıkış yapılsın mı?', evet: 'Çıkış yap' }))) cikis();
  };
  $('#hS', el).onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target), btn = e.target.querySelector('button');
    if (String(f.get('yeni')).length < 6) return bildir('Yeni şifre en az 6 karakter olmalı', { hata: true });
    btn.disabled = true;
    try { const r = await api.salonSifreDegis(Y.slug, f.get('eski'), f.get('yeni'), Y.token); Y.token = r.token; depoYerel.koy(TK.salon(Y.slug), r.token); e.target.reset(); bildir('Şifreniz değiştirildi'); }
    catch (er) { bildir(er.message, { hata: true }); }
    btn.disabled = false;
  };
}
function alanlarSalon(el) {
  const s = Y.veri.salonlar[0];
  el.innerHTML = `<div class="bolum-bas"><h1>Salon planları</h1></div><p class="soluk" style="margin-bottom:14px">Yeni düğünler bu planlarla başlar. Plan değişikliği için yöneticiyle görüşün; tek bir düğünün masa düzenini o düğünün sayfasından değiştirebilirsiniz.</p><div class="kart-izgara">${s.alanlar.map((a) => alanKart(a, { duzenle: false })).join('') || '<div class="kart bos">Henüz salon planı yok.</div>'}</div>`;
}

// ---------------------------------------------------------------- ortak grafik ve istatistik yardımcıları
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const haftaGunu = (t) => new Date(t + 'T12:00:00Z').getUTCDay();
const yuzde = (a, b) => (b ? Math.round((a / b) * 100) : 0);
/** Aylara göre düğün sayısı çubukları (bu ay vurgulu, gelecek aylar soluk) */
function aySutun(L, { once = 5, sonra = 6 } = {}) {
  const buAy = BUAY(), aylar = []; for (let i = -once; i <= sonra; i++) aylar.push(U.ayEkle(buAy, i));
  const say = aylar.map((a) => L.filter((d) => (d.tarih || '').startsWith(a)).length), mx = Math.max(1, ...say);
  return `<div class="cubuklar">${aylar.map((a, i) => `<div title="${esc(U.ayAdi(a))}: ${say[i]} düğün"${a === buAy ? ' class="on"' : ''}><span class="c"><b>${say[i] || ''}</b><i style="height:calc((100% - 20px) * ${(say[i] / mx).toFixed(3)});${a === buAy ? '' : a > buAy ? 'opacity:.35' : 'opacity:.6'}"></i></span><span>${esc(U.ayAdi(a, { kisa: true, yil: false }))}</span></div>`).join('')}</div>`;
}
/** Yatay oran çubukları: [[ad, sayı], ...] */
const oranListe = (L) => { const mx = Math.max(1, ...L.map((x) => x[1])); return `<div class="oranlar">${L.map(([a, n]) => `<div><span>${esc(a)}</span><i><em style="width:${Math.round((n / mx) * 100)}%"></em></i><b>${sayiYaz(n)}</b></div>`).join('')}</div>`; };
/** Düğünün hazırlık durumu: liste boş, yanıt bekleyen, masalar eksik */
function hazirlik(d, bugun) {
  const kalan = Math.round((new Date(d.tarih + 'T12:00:00Z') - new Date(bugun + 'T12:00:00Z')) / 864e5);
  const gelecek = d.geliyor + d.bekliyor, yer = yuzde(d.yerlesen, gelecek);
  if (!d.davet) return { sinif: kalan <= 30 ? 'hata' : 'uyari', yazi: 'Davetli listesi boş', yer, kalan };
  if (yer < 100 && kalan <= 14) return { sinif: yer < 60 ? 'hata' : 'uyari', yazi: `Masalar %${yer}`, yer, kalan };
  if (yer >= 100) return { sinif: 'iyi', yazi: 'Masalar hazır', yer, kalan };
  return { sinif: '', yazi: `Masalar %${yer}`, yer, kalan };
}
function hazirlikSatir(d, bugun) {
  const h = hazirlik(d, bugun);
  return `<a class="dugun-satir" href="${href(yolY('dugun/' + d.kod))}" data-git="${yolY('dugun/' + d.kod)}">${takvimK(d.tarih)}<span style="min-width:0"><b class="ad">${esc(C.ciftAdi(d))}</b><small>${d.tarih === bugun ? '<em class="vurgu-y">Bugün</em> · ' : ''}${esc([d.alanAd, C.saatYaz(d.saat), h.kalan > 0 ? `${h.kalan} gün kaldı` : ''].filter(Boolean).join(' · '))}</small><span class="ilerleme ince"><i style="width:${h.yer}%"></i></span></span><span class="sag"><b>${d.kisi}</b><small><span class="rozet ${h.sinif}">${esc(h.yazi)}</span></small></span></a>`;
}

// ---------------------------------------------------------------- işletme (salon sahibi) özeti
async function salonOzet(el) {
  const s = Y.veri.salonlar[0], bugun = C.trBugun(), ay = bugun.slice(0, 7), yil = bugun.slice(0, 4);
  const L = Y.veri.dugunler, yak = L.filter((d) => d.tarih && d.tarih >= bugun);
  const buAy = L.filter((d) => (d.tarih || '').startsWith(ay)), buYil = L.filter((d) => (d.tarih || '').startsWith(yil));
  const bugunku = L.filter((d) => d.tarih === bugun), y60 = yak.filter((d) => d.tarih <= C.gunEkle(bugun, 60));
  const git2 = (p) => `href="${href(yolY(p))}" data-git="${yolY(p)}"`;
  el.innerHTML = `<div class="bolum-bas"><div><p class="etiket">${esc(C.tarihYaz(bugun, { gun: true }))}</p><h1 style="margin-top:4px">Özet</h1></div><span class="bosluk"></span><button class="dg ana" data-y="yeni">${ikon('arti', 'k')} Yeni düğün</button></div>
    ${!s.alanlar.length ? '<div class="uyari-kutu" style="margin-bottom:14px">Bu salon için henüz salon planı tanımlanmamış. Düğün eklemeden önce yöneticinizden salon planını isteyin.</div>' : ''}
    ${bugunku.map((d) => `<a class="uyari-kutu iyi bugun-k" ${git2('dugun/' + d.kod)}>${ikon('kalp', 'k')}<span><b>Bugün: ${esc(C.ciftAdi(d))}</b> · ${esc([d.alanAd, C.saatYaz(d.saat)].filter(Boolean).join(' · '))} · ${d.kisi} kişi. Misafirler girişteki QR ile masalarını bulur.</span>${ikon('sag', 'kk')}</a>`).join('')}
    <div class="sayilar"${bugunku.length ? ' style="margin-top:14px"' : ''}><a class="sayi" ${git2('dugunler')}><b>${buAy.length}</b><span>düğün ${esc(U.ayAdi(ay, { yil: false }))} ayında</span></a><a class="sayi" ${git2('dugunler')}><b>${yak.length}</b><span>yaklaşan düğün</span></a>
      <div class="sayi"><b>${buYil.length}</b><span>düğün ${yil} yılında</span></div><div class="sayi"><b>${sayiYaz(yak.reduce((n, d) => n + d.kisi, 0))}</b><span>davetli yaklaşan düğünlerde</span></div></div>
    <div class="ozet-izgara" style="margin-top:16px"><section class="kart"><div class="kart-bas"><h2>Önümüzdeki 60 gün</h2><span class="bosluk"></span><a class="dg sade kucuk" ${git2('dugunler')}>Tümü</a></div>
        ${y60.length ? y60.slice(0, 14).map((d) => hazirlikSatir(d, bugun)).join('') : '<p class="soluk">Önümüzdeki 60 günde düğün yok.</p>'}
        <p class="kucuk-yazi" style="margin-top:8px">Listesi boş ya da masaları eksik düğünlerde çifti hatırlatabilirsiniz.</p></section>
      <div class="yigin-b"><section class="kart"><div class="kart-bas"><h2>Aylara göre düğünler</h2></div>${aySutun(L)}</section>
        <section class="kart" id="sIst"><div class="kart-bas"><h2>Misafirler</h2><span class="bosluk"></span><span class="rozet">${yil}</span></div><div class="yukleniyor kucuk"><i></i></div></section></div></div>`;
  el.onclick = (e) => { if (e.target.closest('[data-y=yeni]')) dugunOlustur(Y.slug); };
  let r; try { r = await api.salonIstat(Y.slug, Y.token); } catch { $('#sIst', el)?.remove(); return; }
  const k = $('#sIst', el); if (!k) return;
  const D = r.dugunler.filter((d) => (d.tarih || '').startsWith(yil)), T = (f) => D.reduce((n, d) => n + (f(d) || 0), 0);
  const gecmis = D.filter((d) => d.tarih < bugun);
  k.innerHTML = `<div class="kart-bas"><h2>Misafirler</h2><span class="bosluk"></span><span class="rozet">${yil}</span></div>
    <div class="sayilar iki"><div class="sayi"><b>${sayiYaz(T((d) => d.sayac.ziyaret))}</b><span>davet sayfası açıldı</span></div><div class="sayi"><b>${sayiYaz(T((d) => d.sayac.lcv))}</b><span>katılım yanıtı (LCV)</span></div>
      <div class="sayi"><b>${sayiYaz(T((d) => d.sayac.bul))}</b><span>kişi masasını telefondan buldu</span></div><div class="sayi"><b>${gecmis.length ? sayiYaz(Math.round(gecmis.reduce((n, d) => n + d.geliyor, 0) / gecmis.length)) : '—'}</b><span>ortalama misafir (geçmiş düğünler)</span></div></div>`;
}

// ---------------------------------------------------------------- yönetici: gelir
function gelir(el, ay) {
  const V = Y.veri, buAy = BUAY();
  ay = /^\d{4}-\d{2}$/.test(ay || '') ? ay : buAy;
  const T = U.ayToplam(V.salonlar, V.dugunler, ay), O = V.salonlar.map((s) => U.salonOzet(s, V.dugunler));
  const alacak = O.reduce((n, o) => n + o.alacak, 0), geciken = O.reduce((n, o) => n + o.geciken, 0), beklenen = O.reduce((n, o) => n + o.beklenen, 0);
  const aylar = []; for (let i = -8; i <= 3; i++) aylar.push(U.ayEkle(buAy, i));
  const G = aylar.map((a) => U.ayToplam(V.salonlar, V.dugunler, a)), mx = Math.max(1, ...G.map((g) => Math.max(g.tutar, g.odenen)));
  const yil = ay.slice(0, 4), YA = Array.from({ length: 12 }, (_, i) => U.ayToplam(V.salonlar, V.dugunler, `${yil}-${String(i + 1).padStart(2, '0')}`));
  const yT = YA.reduce((n, g) => n + g.tutar, 0), yO = YA.reduce((n, g) => n + g.odenen, 0), yD = YA.reduce((n, g) => n + g.dugun, 0);
  const odm = V.salonlar.flatMap((s) => (s.odemeler || []).filter((p) => (p.tarih || '').startsWith(ay)).map((p) => ({ s, p }))).sort((a, b) => (b.p.tarih || '').localeCompare(a.p.tarih || ''));
  const R = T.R.filter(({ s, r }) => s.aktif !== false || r.tutar || r.odenen);
  const ayYol = (a) => `href="${href(yolY('gelir/' + a))}" data-git="${yolY('gelir/' + a)}"`;
  el.innerHTML = `<div class="bolum-bas"><h1>Gelir</h1><span class="bosluk"></span><div class="ay-sec"><a class="dg ikon-d cizgili" ${ayYol(U.ayEkle(ay, -1))} aria-label="Önceki ay">${ikon('sol', 'k')}</a><b>${esc(U.ayAdi(ay))}</b><a class="dg ikon-d cizgili" ${ayYol(U.ayEkle(ay, 1))} aria-label="Sonraki ay">${ikon('sag', 'k')}</a></div></div>
    <div class="sayilar"><div class="sayi"><b class="tl">${TL(T.tutar)}</b><span>${esc(U.ayAdi(ay, { yil: false }))} hesabı · ${T.dugun} düğün</span></div>
      <div class="sayi"><b class="tl">${TL(T.odenen)}</b><span>alındı${T.kalan ? ` · ${TL(T.kalan)} kaldı` : ''}</span>${T.tutar ? `<div class="ilerleme"><i style="width:${Math.min(100, yuzde(T.odenen, T.tutar))}%"></i></div>` : ''}</div>
      <div class="sayi"><b class="tl">${TL(alacak)}</b><span>toplam alacak${geciken ? ` · <em class="kirmizi">${TL(geciken)} gecikti</em>` : ''}</span></div>
      <div class="sayi"><b class="tl">${TL(beklenen)}</b><span>önümüzdeki 3 ayın düğünlerinden</span></div></div>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Salonlar · ${esc(U.ayAdi(ay))}</h2></div>
      ${R.length ? `<div class="odeme-liste">${R.map(({ s, r }) => odemeSatir(s, r, { ay })).join('')}</div><div class="toplam-satir"><span>Toplam</span><b>${TL(T.tutar)}</b><small>${TL(T.odenen)} alındı</small></div>` : '<p class="soluk">Salon yok.</p>'}</section>
    <div class="ozet-izgara" style="margin-top:16px"><section class="kart"><div class="kart-bas"><h2>Aylara göre</h2><span class="bosluk"></span><span class="lejant-k"><span><i class="h"></i>Hesap</span><span><i class="o"></i>Alınan</span></span></div>
        <div class="gc">${aylar.map((a, i) => `<a ${ayYol(a)} class="${a === ay ? 'on' : ''}${a > buAy ? ' ileri' : ''}" title="${esc(U.ayAdi(a))}: ${TL(G[i].tutar)} hesap, ${TL(G[i].odenen)} alındı"><span class="c"><i class="h" style="height:${(G[i].tutar / mx) * 100}%"></i><i class="o" style="height:${(G[i].odenen / mx) * 100}%"></i></span><span>${esc(U.ayAdi(a, { kisa: true, yil: false }))}</span></a>`).join('')}</div>
        <div class="yil-ozet"><div><span>${yil} hesabı</span><b>${TL(yT)}</b></div><div><span>${yil} alınan</span><b>${TL(yO)}</b></div><div><span>${yil} düğün</span><b>${sayiYaz(yD)}</b></div></div></section>
      <section class="kart"><div class="kart-bas"><h2>${esc(U.ayAdi(ay, { yil: false }))} ayında alınanlar</h2><span class="bosluk"></span><span class="rozet">${TL(odm.reduce((n, x) => n + x.p.tutar, 0))}</span></div>
        ${odm.length ? odm.map(({ s, p }) => `<div class="satir">${logoK(s)}<span class="ana"><b>${esc(s.ad)}</b><small>${esc(C.tarihYaz(p.tarih, { yil: false }))}${p.donem ? ' · ' + esc(U.ayAdi(p.donem)) + ' hesabı' : ''}${p.not ? ' · ' + esc(p.not) : ''}</small></span><b class="sayi-yazi">${TL(p.tutar)}</b></div>`).join('') : '<p class="soluk">Bu ay kaydedilmiş ödeme yok.</p>'}</section></div>`;
}

// ---------------------------------------------------------------- istatistik (yönetici: tüm salonlar · işletme: kendi salonu)
async function istatistik(el) {
  el.innerHTML = '<div class="yukleniyor"><i></i></div>';
  const isletme = Y.rol === 'salon';
  let r; try { r = isletme ? await api.salonIstat(Y.slug, Y.token) : await api.istat(Y.token); } catch (e) { el.innerHTML = `<div class="kart bos">${esc(e.message)}</div>`; return; }
  const bugun = C.trBugun(), yil = bugun.slice(0, 4), L = r.dugunler;
  const t = (f, X = L) => X.reduce((n, d) => n + (f(d) || 0), 0);
  const gecmis = L.filter((d) => d.tarih && d.tarih < bugun), yak = L.filter((d) => d.tarih && d.tarih >= bugun);
  const ort = gecmis.length ? Math.round(t((d) => d.geliyor, gecmis) / gecmis.length) : 0;
  const gunSay = GUNLER.map((g, i) => [g, L.filter((d) => d.tarih && haftaGunu(d.tarih) === i).length]);
  const turSay = C.TURLER.map(([k, a]) => [a, L.filter((d) => d.tur === k).length]).filter((x) => x[1]);
  const yillar = [...new Set(L.map((d) => (d.tarih || '').slice(0, 4)).filter(Boolean))].sort();
  const git2 = (p) => `href="${href(yolY(p))}" data-git="${yolY(p)}"`;
  const mini = (b, a, cls = '') => `<div class="mini${cls ? ' ' + cls : ''}"><b>${b}</b><span>${a}</span></div>`;
  // yönetici: her salonun düğün sayısı, ücreti ve parası; işletme: salon alanlarına göre
  let gruplar = '';
  if (!isletme) {
    const S = Y.veri.salonlar.map((s) => {
      const D = L.filter((d) => d.salon === s.slug), Yk = D.filter((d) => d.tarih && d.tarih >= bugun), G = D.filter((d) => d.tarih && d.tarih < bugun);
      const oz = U.salonOzet(s, Y.veri.dugunler), m = U.modelAl(s), birim = m === 'dugun' || m === 'ikisi' ? +s.odeme?.dugunBasi || 0 : 0;
      return { s, D, Yk, G, oz, birim, planlanan: Yk.filter((d) => !d.ucretsiz).length * birim };
    }).sort((a, b) => b.D.length - a.D.length || a.s.ad.localeCompare(b.s.ad, 'tr'));
    gruplar = `<div class="bolum-bas" style="margin:26px 0 12px"><h2>Salonlar</h2></div>
      <div class="ist-salonlar">${S.map((x) => `<section class="kart ist-salon">
        <a class="ist-bas" ${git2('salon/' + x.s.slug)}>${logoK(x.s)}<span><b>${esc(x.s.ad)}</b><small>${esc(U.ucretYazi(x.s, TL))}${x.s.aktif === false ? ' · kapalı' : ''}</small></span>${ikon('sag', 'kk')}</a>
        <div class="mini-izgara">${mini(x.D.length, 'düğün toplam')}${mini(x.D.filter((d) => (d.tarih || '').startsWith(yil)).length, yil + ' yılında')}${mini(x.Yk.length, 'yaklaşan')}${mini(x.G.length ? sayiYaz(Math.round(t((d) => d.geliyor, x.G) / x.G.length)) : '—', 'ort. misafir')}</div>
        <div class="mini-izgara para">${mini(TL(x.oz.tahakkuk), 'hesap (bu aya kadar)')}${mini(TL(x.oz.tahsil), 'alındı')}${mini(TL(x.oz.alacak), x.oz.geciken ? `alacak · <em class="kirmizi">${TL(x.oz.geciken)} gecikti</em>` : 'alacak', x.oz.alacak ? 'vurgu' : '')}${mini(TL(x.planlanan), x.birim ? `${x.Yk.filter((d) => !d.ucretsiz).length} yaklaşan düğünden` : 'düğün başı ücret yok')}</div>
        <div class="ist-alt"><span>${sayiYaz(t((d) => d.kisi, x.D))} davetli · ${sayiYaz(t((d) => d.sayac.lcv, x.D))} LCV · ${sayiYaz(t((d) => d.sayac.bul, x.D))} masa bulucu</span><a ${git2('salon/' + x.s.slug + '/odeme')}>Ödemeler</a></div></section>`).join('') || '<div class="kart bos">Salon yok.</div>'}</div>`;
  }
  const alanSay = isletme ? [...new Set(L.map((d) => d.alanAd || 'Alan yok'))].map((a) => [a, L.filter((d) => (d.alanAd || 'Alan yok') === a).length]).sort((a, b) => b[1] - a[1]) : [];
  el.innerHTML = `<div class="bolum-bas"><h1>İstatistik</h1></div>
    <div class="sayilar"><div class="sayi"><b>${L.length}</b><span>düğün kaydı · ${yak.length} yaklaşan</span></div><div class="sayi"><b>${sayiYaz(t((d) => d.kisi))}</b><span>davetli (kişi)</span></div>
      <div class="sayi"><b>${sayiYaz(t((d) => d.sayac.lcv))}</b><span>katılım yanıtı (LCV)</span></div><div class="sayi"><b>${sayiYaz(t((d) => d.sayac.bul))}</b><span>kişi masasını telefondan buldu</span></div></div>
    ${gruplar}
    <div class="ozet-izgara" style="margin-top:${gruplar ? 26 : 16}px"><section class="kart"><div class="kart-bas"><h2>Aylara göre düğünler</h2></div>${aySutun(L)}</section>
      <section class="kart"><div class="kart-bas"><h2>${isletme ? 'Salon alanlarına göre' : 'Salonlara göre düğünler'}</h2></div>${isletme ? (alanSay.length ? oranListe(alanSay) : '<p class="soluk">Kayıt yok.</p>') : Y.veri.salonlar.length ? oranListe(Y.veri.salonlar.map((s) => [s.ad, L.filter((d) => d.salon === s.slug).length]).sort((a, b) => b[1] - a[1])) : '<p class="soluk">Salon yok.</p>'}</section>
      <section class="kart"><div class="kart-bas"><h2>Haftanın günleri</h2></div>${oranListe([...gunSay.slice(1), gunSay[0]])}</section>
      <section class="kart"><div class="kart-bas"><h2>Misafirler</h2></div><div class="sayilar iki"><div class="sayi"><b>${sayiYaz(t((d) => d.sayac.ziyaret))}</b><span>davet sayfası açıldı</span></div><div class="sayi"><b>${ort ? sayiYaz(ort) : '—'}</b><span>ortalama misafir (geçmiş düğünler)</span></div>
        <div class="sayi"><b>%${yuzde(t((d) => d.yerlesen, yak), t((d) => d.geliyor + d.bekliyor, yak))}</b><span>yaklaşan düğünlerde masaya yerleşen</span></div><div class="sayi"><b>${sayiYaz(t((d) => d.bekliyor, yak))}</b><span>yanıt bekleyen davetli</span></div></div></section>
      ${turSay.length > 1 ? `<section class="kart"><div class="kart-bas"><h2>Etkinlik türleri</h2></div>${oranListe(turSay)}</section>` : ''}
      ${yillar.length > 1 ? `<section class="kart"><div class="kart-bas"><h2>Yıllara göre</h2></div>${oranListe(yillar.map((y) => [y, L.filter((d) => (d.tarih || '').startsWith(y)).length]))}</section>` : ''}</div>
    <p class="kucuk-yazi" style="margin-top:14px">“Davet sayfası” ve “masa bulucu” her cihazı bir kez sayar. “Ortalama misafir”, geçmiş düğünlerde “geliyor” diyen kişi sayısıdır.${isletme ? '' : ' Hesap, salonun ücretine göre bugüne kadar oluşan tutardır; “alacak” henüz alınmayan kısmıdır.'}</p>`;
}

// ---------------------------------------------------------------- salon planı düzenleyici
async function alanPlanDuzen(slug, alanId) {
  const s = salonBul(slug), a = s?.alanlar.find((x) => x.id === alanId);
  if (!a) { kabuk('salonlar').innerHTML = '<div class="kart bos">Salon planı bulunamadı.</div>'; return; }
  const olustur = /[?&]olustur=1/.test(location.search + location.hash);
  duzenleyici({ baslik: `${s.ad} · ${a.ad}`, plan: a.plan, geri: yolY(`salon/${slug}/alanlar`), olustur, kaydet: (plan) => salonGuncelle(slug, (x) => { x.alanlar = x.alanlar.map((z) => (z.id === alanId ? { ...z, plan } : z)); }) });
}
async function dugunPlanDuzen(kod) {
  Y.kok.innerHTML = '<div class="yukleniyor"><i></i></div>';
  let r; try { r = await api.tam(kod, '', Y.token); } catch (e) { kabuk('').innerHTML = `<div class="kart bos">${esc(e.message)}</div>`; return; }
  let d = r.dugun;
  duzenleyici({ baslik: `${C.ciftAdi(d.bilgi)} · ${d.alanAd}`, plan: d.plan, geri: yolY('dugun/' + kod), not: 'Bu düğüne özel plan. Silinen masalardaki davetliler masasız kalır.', kaydet: async (plan) => {
    const x = await api.islem(kod, { ops: [{ t: 'plan', v: plan }], rev: d.rev, bid: C.rastgele(10) }, Y.token);
    d = x.dugun || { ...d, rev: x.rev };
    await veriAl();
  } });
}
const OGE_BOY = { sahne: [8, 3], pist: [8, 6], giris: [2.6, 0.6], bar: [4, 1.2], dj: [2.4, 1.4], bufe: [5, 1.2], pasta: [1.6, 1.2], foto: [3, 2], kolon: [0.6, 0.6], yazi: [4, 0.8] };
function duzenleyici({ baslik, plan, kaydet, geri, olustur = false, not = '' }) {
  E = { plan: C.temizPlan(kopya(plan)), sec: new Set(), coklu: false, gecmis: [], kirli: false, goster: 'kisi', geri };
  ayrilmaKoy(async () => !E || !E.kirli || (await onayla({ baslik: 'Kaydedilmemiş değişiklikler var', metin: 'Bu sayfadan çıkarsanız salon planındaki değişiklikler kaybolur.', evet: 'Kaydetmeden çık', tehlike: true })));
  Y.kok.innerHTML = `<div class="duzenleyici"><div class="d-ust"><a class="dg ikon-d" href="${href(geri)}" data-git="${geri}" aria-label="Geri">${ikon('sol')}</a><h2>${esc(baslik)}</h2>
      <button class="dg ikon-d cizgili" data-e="geri" aria-label="Geri al">${ikon('geri', 'k')}</button><button class="dg cizgili kucuk" data-e="olustur" aria-label="Hızlı oluştur">${ikon('sihir', 'kk')}<span class="genis-yazi"> Hızlı oluştur</span></button><button class="dg ana kucuk" data-e="kaydet">Kaydet</button></div>
    <div class="d-govde"><div id="dH"></div><div class="d-panel" id="dP"></div></div>
    <div class="d-alt"><span class="ozet" id="dO"></span><button class="dg cizgili kucuk" data-e="coklu" id="dCok">Çoklu seç</button>${not ? `<span class="kucuk-yazi">${esc(not)}</span>` : ''}</div></div>`;
  E.h = harita($('#dH'), {
    plan: E.plan, mod: 'duzen', secili: () => E.sec, cakisan: () => E.cak,
    bilgi: (m) => ({ alt: m.ozel === 'gelin-damat' ? '' : E.goster === 'uzaklik' ? (C.sahneUzaklik(E.plan, m) ?? 0).toFixed(1).replace('.', ',') + ' m' : `${m.kap} kişi`, sandalye: m.kap, dolu: [], sinif: '', ad: m.ad }),
    onMasa: (id) => secim(id), onOge: (id) => secim(id), onBos: () => { if (E.sec.size) { E.sec.clear(); yenile(); } },
    onTasiBasla: (id) => { if (!E.sec.has(id)) { if (!E.coklu) E.sec.clear(); E.sec.add(id); } nokta(); E.tasi = [...E.sec].map((i) => { const o = bul(i); return o ? { o, x: o.x, y: o.y } : null; }).filter(Boolean); return true; },
    onTasi: (dx, dy) => { for (const t of E.tasi) { t.o.x = sinir(yuvar(t.x + dx), E.plan.en); t.o.y = sinir(yuvar(t.y + dy), E.plan.boy); E.h.ogeTasi(t.o.id, E.plan.masalar.includes(t.o) ? 'masa' : 'oge', t.o.x, t.o.y); } },
    onTasiBit: () => { E.kirli = true; yenile(); },
  });
  const kok = Y.kok.querySelector('.duzenleyici');
  kok.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    const v = b.dataset.e;
    if (v === 'geri') geriAlE();
    else if (v === 'kaydet') { b.disabled = true; try { await kaydet(C.temizPlan(E.plan)); E.kirli = false; bildir('Salon planı kaydedildi'); } catch (er) { bildir(er.message, { hata: true }); } b.disabled = false; }
    else if (v === 'olustur') olusturucu();
    else if (v === 'coklu') { E.coklu = !E.coklu; b.classList.toggle('ana', E.coklu); b.classList.toggle('cizgili', !E.coklu); if (!E.coklu && E.sec.size > 1) E.sec.clear(); yenile(); }
  });
  kok.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); geriAlE(); } });
  window.onkeydown = (e) => {
    if (!E || e.target.closest('input,textarea,select')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && E.sec.size) { e.preventDefault(); sil(); }
    const ok = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (ok && E.sec.size) { e.preventDefault(); nokta(); const k = e.shiftKey ? 0.5 : 0.1; for (const i of E.sec) { const o = bul(i); if (o) { o.x = sinir(yuvar(o.x + ok[0] * k), E.plan.en); o.y = sinir(yuvar(o.y + ok[1] * k), E.plan.boy); } } E.kirli = true; yenile(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); geriAlE(); }
  };
  yenile();
  if (olustur) setTimeout(olusturucu, 250);
}
const yuvar = (v) => Math.round(v * 20) / 20, sinir = (v, m) => Math.min(m, Math.max(0, v));
const bul = (id) => E.plan.masalar.find((m) => m.id === id) || E.plan.ogeler.find((o) => o.id === id);
function nokta() { E.gecmis.push(JSON.stringify(E.plan)); if (E.gecmis.length > 80) E.gecmis.shift(); }
function geriAlE() { const p = E.gecmis.pop(); if (!p) return bildir('Geri alınacak değişiklik yok'); E.plan = JSON.parse(p); E.sec = new Set([...E.sec].filter((i) => bul(i))); E.kirli = true; yenile(); }
function secim(id) { if (E.coklu) { E.sec.has(id) ? E.sec.delete(id) : E.sec.add(id); } else { E.sec = new Set(E.sec.has(id) && E.sec.size === 1 ? [] : [id]); } yenile(); }
function sil() { nokta(); E.plan.masalar = E.plan.masalar.filter((m) => !E.sec.has(m.id)); E.plan.ogeler = E.plan.ogeler.filter((o) => !E.sec.has(o.id)); E.sec.clear(); E.kirli = true; yenile(); }
function yenile() {
  E.cak = C.cakismalar(E.plan);
  E.h.planDegis(E.plan);
  const o = C.planOzet(E.plan);
  $('#dO').textContent = `${o.masa} masa · ${o.kisi} kişi${o.ek ? ` · +${o.ek} ek` : ''} · ${E.plan.en}×${E.plan.boy} m`;
  panel();
}
const num = (ad, deger, ek = '') => `<input class="girdi" type="number" inputmode="decimal" data-p="${ad}" value="${deger}" ${ek} style="min-height:40px">`;
function panel() {
  const P = $('#dP'), S = [...E.sec].map(bul).filter(Boolean);
  if (!S.length) {
    P.innerHTML = `<div class="yigin" style="gap:16px"><div><div class="etiket" style="margin-bottom:8px">Ekle</div><div class="ekle-paleti"><button data-ekle="yuvarlak">${ikon('masa', 'kk')} Yuvarlak masa</button><button data-ekle="dikdortgen">${ikon('duzen', 'kk')} Uzun masa</button>${C.OGELER.map(([k, a]) => `<button data-ekle="${k}">${esc(a)}</button>`).join('')}</div></div>
      <div class="izgara2"><label class="alan"><span>Salon eni (m)</span>${num('en', E.plan.en, 'min="6" max="200" step=".5"')}</label><label class="alan"><span>Salon boyu (m)</span>${num('boy', E.plan.boy, 'min="6" max="200" step=".5"')}</label></div>
      <div><div class="etiket" style="margin-bottom:8px">Tüm masalar</div><div class="izgara2"><label class="alan"><span>Kişi</span>${num('hepsiKap', '', 'min="1" max="40" placeholder="örn. 10"')}</label><label class="alan"><span>Ek sandalye</span>${num('hepsiEk', '', 'min="0" max="8" placeholder="örn. 1"')}</label></div><button class="dg cizgili kucuk" data-p2="hepsi" style="margin-top:8px">Tüm masalara uygula</button></div>
      <div><div class="etiket" style="margin-bottom:8px">Masa numaraları</div><div class="dg-grup"><button class="dg cizgili kucuk" data-no="sira">Sıra sıra</button><button class="dg cizgili kucuk" data-no="yilan">Zikzak</button><button class="dg cizgili kucuk" data-no="uzaklik">Sahneye yakınlık</button></div></div>
      <div><div class="etiket" style="margin-bottom:8px">Masalarda göster</div><div class="segment" data-seg="goster"><button data-v="kisi" class="${E.goster === 'kisi' ? 'on' : ''}">Kişi sayısı</button><button data-v="uzaklik" class="${E.goster === 'uzaklik' ? 'on' : ''}">Sahneye uzaklık</button></div></div>
      ${E.cak.size ? `<div class="uyari-kutu hata">${ikon('uyari', 'k')}<span>${E.cak.size} masa üst üste biniyor ya da salonun dışına taşıyor (kırmızı çerçeveli).</span></div>` : ''}
      ${!C.sahneOf(E.plan) ? `<div class="uyari-kutu">${ikon('uyari', 'k')}<span>Planda sahne yok; sahneye uzaklık ve otomatik yerleştirme için bir sahne ekleyin.</span></div>` : ''}
      <p class="kucuk-yazi">Bir masaya ya da öğeye dokunup seçin, sürükleyerek taşıyın. İki parmakla yakınlaştırın.</p></div>`;
  } else if (S.length > 1) {
    const M = S.filter((x) => E.plan.masalar.includes(x));
    P.innerHTML = `<div class="yigin"><b style="font:600 18px var(--baslik)">${S.length} öğe seçili</b>${M.length ? `<div class="izgara2"><label class="alan"><span>Kişi</span>${num('cKap', '', 'min="1" max="40"')}</label><label class="alan"><span>Ek sandalye</span>${num('cEk', '', 'min="0" max="8"')}</label></div><div class="segment" data-seg="cSekil"><button data-v="yuvarlak">Yuvarlak</button><button data-v="dikdortgen">Uzun</button></div><button class="dg cizgili kucuk" data-p2="coklu">Seçililere uygula</button>` : ''}<div class="dg-grup"><button class="dg tehlike kucuk" data-p2="sil">${ikon('cop', 'kk')} Sil</button><button class="dg sade kucuk" data-p2="birak">Seçimi kaldır</button></div><p class="kucuk-yazi">Seçilenleri birlikte sürükleyebilirsiniz.</p></div>`;
  } else {
    const x = S[0], masa = E.plan.masalar.includes(x);
    const uz = masa ? C.sahneUzaklik(E.plan, x) : null;
    P.innerHTML = masa ? `<div class="yigin"><div style="display:flex;align-items:center;gap:10px"><span class="masa-bas"><span class="no" style="width:46px;height:46px;font-size:19px">${x.ozel === 'gelin-damat' ? 'G&D' : x.no}</span></span><b style="font:600 18px var(--baslik)">${x.ozel === 'gelin-damat' ? 'Gelin & Damat masası' : 'Masa ' + x.no}</b></div>
      <div class="izgara2"><label class="alan"><span>Masa no</span>${num('no', x.no, 'min="0" max="9999"')}</label><label class="alan"><span>Ad <span class="ipucu">(isteğe bağlı)</span></span><input class="girdi" data-p="ad" value="${esc(x.ad)}" maxlength="40" style="min-height:40px"></label></div>
      <div class="segment" data-seg="sekil"><button data-v="yuvarlak" class="${x.sekil === 'yuvarlak' ? 'on' : ''}">Yuvarlak</button><button data-v="dikdortgen" class="${x.sekil === 'dikdortgen' ? 'on' : ''}">Uzun</button></div>
      <div class="izgara2"><label class="alan"><span>Kişi</span>${num('kap', x.kap, 'min="1" max="40"')}</label><label class="alan"><span>Ek sandalye</span>${num('ek', x.ek, 'min="0" max="8"')}</label></div>
      <div class="izgara2">${x.sekil === 'yuvarlak' ? `<label class="alan"><span>Çap (m)</span>${num('w', x.w, 'min=".5" max="6" step=".1"')}</label>` : `<label class="alan"><span>Uzunluk (m)</span>${num('w', x.w, 'min=".5" max="14" step=".1"')}</label><label class="alan"><span>Genişlik (m)</span>${num('h', x.h, 'min=".5" max="4" step=".1"')}</label>`}</div>
      <div class="izgara2"><label class="alan"><span>Sağa (x, m)</span>${num('x', x.x, 'step=".1"')}</label><label class="alan"><span>Aşağı (y, m)</span>${num('y', x.y, 'step=".1"')}</label></div>
      <div class="izgara2"><label class="alan"><span>Sahneye uzaklık (m)</span>${uz == null ? '<input class="girdi" disabled value="Sahne yok" style="min-height:40px">' : num('uz', uz.toFixed(1), 'min="0" step=".1"')}</label><label class="alan"><span>Döndür (°)</span><select class="girdi" data-p="r" style="min-height:40px">${[0, 45, 90, 135].map((r) => `<option value="${r}"${Math.abs(x.r) === r ? ' selected' : ''}>${r}°</option>`).join('')}</select></label></div>
      <label class="alan"><span>Masa türü</span><select class="girdi" data-p="ozel" style="min-height:40px">${C.MASA_OZEL.map(([k, a]) => `<option value="${k}"${x.ozel === k ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <div class="dg-grup"><button class="dg cizgili kucuk" data-p2="kopya">Çoğalt</button><button class="dg tehlike kucuk" data-p2="sil">${ikon('cop', 'kk')} Sil</button><button class="dg sade kucuk" data-p2="birak">Seçimi kaldır</button></div>${uz != null ? `<p class="kucuk-yazi">${esc(C.masaYeri(E.plan, x))}</p>` : ''}</div>`
      : `<div class="yigin"><b style="font:600 18px var(--baslik)">${esc(Object.fromEntries(C.OGELER)[x.tur])}</b>
      <label class="alan"><span>Tür</span><select class="girdi" data-p="tur" style="min-height:40px">${C.OGELER.map(([k, a]) => `<option value="${k}"${x.tur === k ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <label class="alan"><span>Yazı</span><input class="girdi" data-p="ad" value="${esc(x.ad)}" maxlength="40" style="min-height:40px"></label>
      <div class="izgara2"><label class="alan"><span>En (m)</span>${num('w', x.w, 'min=".2" step=".1"')}</label><label class="alan"><span>Derinlik (m)</span>${num('h', x.h, 'min=".2" step=".1"')}</label></div>
      <div class="izgara2"><label class="alan"><span>Sağa (x, m)</span>${num('x', x.x, 'step=".1"')}</label><label class="alan"><span>Aşağı (y, m)</span>${num('y', x.y, 'step=".1"')}</label></div>
      <label class="alan"><span>Döndür (°)</span><select class="girdi" data-p="r" style="min-height:40px">${[0, 45, 90, 135].map((r) => `<option value="${r}"${Math.abs(x.r) === r ? ' selected' : ''}>${r}°</option>`).join('')}</select></label>
      <div class="dg-grup"><button class="dg cizgili kucuk" data-p2="kopya">Çoğalt</button><button class="dg tehlike kucuk" data-p2="sil">${ikon('cop', 'kk')} Sil</button><button class="dg sade kucuk" data-p2="birak">Seçimi kaldır</button></div></div>`;
  }
  P.onclick = (e) => {
    const sg = e.target.closest('.segment button');
    if (sg) {
      const seg = sg.parentElement.dataset.seg; sg.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sg));
      if (seg === 'goster') { E.goster = sg.dataset.v; E.h.ciz(); return; }
      if (seg === 'sekil') { nokta(); const x = S[0], b = C.masaBoyut(sg.dataset.v, x.kap); Object.assign(x, { sekil: sg.dataset.v, w: b.w, h: b.h }); E.kirli = true; return yenile(); }
      return;
    }
    const ek = e.target.closest('[data-ekle]');
    if (ek) {
      nokta(); const t = ek.dataset.ekle, c = E.h.merkez();
      if (t === 'yuvarlak' || t === 'dikdortgen') {
        const son = E.plan.masalar.filter((m) => !m.ozel).at(-1), kap = son?.kap || 10, b = C.masaBoyut(t, kap);
        const no = Math.max(0, ...E.plan.masalar.map((m) => m.no)) + 1, id = 'm' + C.rastgele(6);
        E.plan.masalar.push({ id, no, ad: '', sekil: t, kap, ek: son?.ek ?? 1, x: sinir(yuvar(c.x), E.plan.en), y: sinir(yuvar(c.y), E.plan.boy), w: b.w, h: b.h, r: 0, ozel: '' });
        E.sec = new Set([id]);
      } else {
        const [w, h] = OGE_BOY[t] || [2, 1], id = 'o' + C.rastgele(6);
        E.plan.ogeler.push({ id, tur: t, ad: t === 'yazi' ? 'Yazı' : '', x: sinir(yuvar(c.x), E.plan.en), y: sinir(yuvar(c.y), E.plan.boy), w, h, r: 0 });
        E.sec = new Set([id]);
      }
      E.kirli = true; return yenile();
    }
    const no = e.target.closest('[data-no]'); if (no) { nokta(); C.yenidenNumarala(E.plan, no.dataset.no); E.kirli = true; bildir('Masalar yeniden numaralandı'); return yenile(); }
    const p2 = e.target.closest('[data-p2]'); if (!p2) return;
    const k = p2.dataset.p2;
    if (k === 'sil') sil();
    else if (k === 'birak') { E.sec.clear(); yenile(); }
    else if (k === 'kopya') { nokta(); const x = S[0], masa = E.plan.masalar.includes(x), y = { ...kopya(x), id: (masa ? 'm' : 'o') + C.rastgele(6), x: sinir(yuvar(x.x + (x.w || 1) + 1), E.plan.en) }; if (masa) { y.no = Math.max(0, ...E.plan.masalar.map((m) => m.no)) + 1; y.ozel = ''; E.plan.masalar.push(y); } else E.plan.ogeler.push(y); E.sec = new Set([y.id]); E.kirli = true; yenile(); }
    else if (k === 'hepsi' || k === 'coklu') {
      const kap = $(`[data-p=${k === 'hepsi' ? 'hepsiKap' : 'cKap'}]`, P).value, ekv = $(`[data-p=${k === 'hepsi' ? 'hepsiEk' : 'cEk'}]`, P).value, sek = k === 'coklu' ? P.querySelector('[data-seg=cSekil] .on')?.dataset.v : '';
      if (!kap && !ekv && !sek) return bildir('Kişi, ek sandalye ya da şekil yazın');
      nokta();
      for (const m of k === 'hepsi' ? E.plan.masalar.filter((z) => !z.ozel) : S.filter((z) => E.plan.masalar.includes(z))) { if (sek) m.sekil = sek; if (kap) m.kap = C.tamSayi(kap, 1, 40, m.kap); if (ekv !== '') m.ek = C.tamSayi(ekv, 0, 8, m.ek); const b = C.masaBoyut(m.sekil, m.kap); m.w = b.w; m.h = b.h; }
      E.kirli = true; bildir('Uygulandı'); yenile();
    }
  };
  P.onchange = (e) => {
    const i = e.target.closest('[data-p]'); if (!i) return;
    const k = i.dataset.p, v = i.value, x = S[0];
    if (['hepsiKap', 'hepsiEk', 'cKap', 'cEk'].includes(k)) return;
    nokta();
    if (k === 'en' || k === 'boy') { E.plan[k] = C.sayi(v, 6, 200, E.plan[k]); E.plan = C.temizPlan(E.plan); E.h.planDegis(E.plan, { sigdir: true }); }
    else if (!x) return;
    else if (k === 'uz') Object.assign(x, C.uzaklikAyarla(E.plan, x, C.sayi(v, 0, 200, 0)));
    else if (k === 'kap') { x.kap = C.tamSayi(v, 1, 40, x.kap); const b = C.masaBoyut(x.sekil, x.kap); x.w = b.w; x.h = b.h; }
    else if (['ek', 'no', 'r'].includes(k)) x[k] = C.tamSayi(v, k === 'r' ? -180 : 0, k === 'no' ? 9999 : k === 'r' ? 180 : 8, x[k]);
    else if (['x', 'y'].includes(k)) x[k] = sinir(C.sayi(v, 0, 200, x[k]), k === 'x' ? E.plan.en : E.plan.boy);
    else if (k === 'w' || k === 'h') { x[k] = C.sayi(v, 0.2, 200, x[k]); if (x.sekil === 'yuvarlak') x.h = x.w; }
    else if (k === 'ad') x.ad = C.str(v, 40);
    else if (k === 'tur') { x.tur = v; const [w, h] = OGE_BOY[v] || [x.w, x.h]; if (v === 'sahne' && E.plan.ogeler.some((o) => o !== x && o.tur === 'sahne')) bildir('Planda zaten bir sahne var; uzaklıklar ilk sahneye göre ölçülür'); x.w = w; x.h = h; }
    else if (k === 'ozel') { x.ozel = v; if (v === 'gelin-damat') { x.sekil = 'dikdortgen'; x.kap = 2; x.ek = 0; x.w = 2.4; x.h = 0.8; x.ad = x.ad || 'Gelin & Damat'; } }
    E.kirli = true; yenile();
  };
}
function olusturucu() {
  const p = E.plan, son = p.masalar.filter((m) => !m.ozel).at(-1);
  const s = C.sahneOf(p), pist = p.ogeler.find((o) => o.tur === 'pist');
  const ilk = { en: p.en, boy: p.boy, adet: Math.max(p.masalar.filter((m) => !m.ozel).length, 20), sekil: son?.sekil || 'yuvarlak', kap: son?.kap || 10, ek: son?.ek ?? 1, sahneEn: s?.w || 10, sahneDerin: s?.h || 3, sahneMesafe: 2, bosluk: 0.6, kenar: 0.8, pist: !!pist || !p.masalar.length, pistEn: pist?.w || 9, pistDerin: pist?.h || 6, gelinMasasi: p.masalar.some((m) => m.ozel === 'gelin-damat') || !p.masalar.length, numara: 'sira' };
  const c = cekmece({ baslik: 'Hızlı oluştur', genis: true, govde: `<div class="ozet-izgara"><form class="yigin" id="oF">
      <div class="izgara2"><label class="alan"><span>Salon eni (m)</span><input class="girdi" type="number" name="en" value="${ilk.en}" min="8" max="200" step=".5"></label><label class="alan"><span>Salon boyu (m)</span><input class="girdi" type="number" name="boy" value="${ilk.boy}" min="8" max="200" step=".5"></label></div>
      <div class="izgara3"><label class="alan"><span>Masa sayısı</span><input class="girdi" type="number" name="adet" value="${ilk.adet}" min="1" max="400"></label><label class="alan"><span>Masa başına kişi</span><input class="girdi" type="number" name="kap" value="${ilk.kap}" min="2" max="30"></label><label class="alan"><span>Ek sandalye</span><input class="girdi" type="number" name="ek" value="${ilk.ek}" min="0" max="6"></label></div>
      <div class="alan"><span>Masa tipi</span><div class="segment" data-seg="sekil"><button type="button" data-v="yuvarlak" class="${ilk.sekil === 'yuvarlak' ? 'on' : ''}">Yuvarlak</button><button type="button" data-v="dikdortgen" class="${ilk.sekil === 'dikdortgen' ? 'on' : ''}">Uzun</button></div></div>
      <div class="izgara2"><label class="alan"><span>Sahne eni (m)</span><input class="girdi" type="number" name="sahneEn" value="${ilk.sahneEn}" min="2" step=".5"></label><label class="alan"><span>Sahne derinliği (m)</span><input class="girdi" type="number" name="sahneDerin" value="${ilk.sahneDerin}" min="1" step=".5"></label></div>
      <div class="izgara3"><label class="alan"><span>Sahne ile ilk sıra (m)</span><input class="girdi" type="number" name="sahneMesafe" value="${ilk.sahneMesafe}" min=".3" step=".1"></label><label class="alan"><span>Masalar arası boşluk (m)</span><input class="girdi" type="number" name="bosluk" value="${ilk.bosluk}" min=".3" step=".1"></label><label class="alan"><span>Duvar payı (m)</span><input class="girdi" type="number" name="kenar" value="${ilk.kenar}" min=".3" step=".1"></label></div>
      <label class="anahtar"><span><b style="font-weight:500">Dans pisti</b></span><input type="checkbox" name="pist" ${ilk.pist ? 'checked' : ''}><i></i></label>
      <div class="izgara2"><label class="alan"><span>Pist eni (m)</span><input class="girdi" type="number" name="pistEn" value="${ilk.pistEn}" min="2" step=".5"></label><label class="alan"><span>Pist derinliği (m)</span><input class="girdi" type="number" name="pistDerin" value="${ilk.pistDerin}" min="2" step=".5"></label></div>
      <label class="anahtar"><span><b style="font-weight:500">Gelin ve damat masası</b><br><small class="soluk">Sahnenin önüne iki kişilik masa</small></span><input type="checkbox" name="gelinMasasi" ${ilk.gelinMasasi ? 'checked' : ''}><i></i></label>
      <label class="alan"><span>Numaralandırma</span><select class="girdi" name="numara"><option value="sira">Sıra sıra (soldan sağa)</option><option value="yilan">Zikzak</option><option value="uzaklik">Sahneye yakınlığa göre</option></select></label></form>
    <div><div class="etiket" style="margin-bottom:8px">Önizleme</div><div style="border:1px solid var(--cizgi);border-radius:14px;overflow:hidden;background:var(--yuzey);aspect-ratio:4/3" id="oOn"></div><p class="kucuk-yazi" id="oBil" style="margin-top:10px"></p></div></div>`,
  alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" id="oUy">Planı uygula</button>` });
  const f = $('#oF', c.el);
  const oku = () => { const v = Object.fromEntries(new FormData(f)); return { ...v, pist: !!f.pist.checked, gelinMasasi: !!f.gelinMasasi.checked, sekil: f.querySelector('[data-seg=sekil] .on')?.dataset.v || 'yuvarlak' }; };
  const on = () => { const r = C.planOlustur(oku()); $('#oOn', c.el).innerHTML = planSvg(r.plan, { izgara: false }); const o = C.planOzet(r.plan); $('#oBil', c.el).innerHTML = `${r.istenen > r.sigan ? `<span style="color:var(--hata)">${r.istenen} masa istendi, bu ölçülere ${r.sigan} masa sığıyor.</span> ` : ''}${o.masa} masa · ${o.kisi} kişi${o.ek ? ` · +${o.ek} ek sandalye` : ''}`; return r; };
  f.addEventListener('input', on);
  f.addEventListener('click', (e) => { const b = e.target.closest('.segment button'); if (b) { b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); on(); } });
  on();
  $('#oUy', c.el).onclick = async () => {
    const r = on();
    if (E.plan.masalar.length && !(await onayla({ baslik: 'Mevcut plan değişsin mi?', metin: 'Masalar ve öğeler yeni plana göre yeniden oluşturulur. İsterseniz sonra “Geri al” ile dönebilirsiniz.', evet: 'Uygula' }))) return;
    nokta(); E.plan = r.plan; E.sec.clear(); E.kirli = true; c.kapat(); E.h.planDegis(E.plan, { sigdir: true }); yenile();
  };
}
