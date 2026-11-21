// Düğün Planla — yönetici paneli (tüm salonlar) ve salon paneli (tek salon): salonlar, temalar, salon planları, düğünler, ödemeler, istatistik
import * as C from './cekirdek.js?v=2026-11-21-e';
import { api, depoYerel, TK } from './api.js?v=2026-11-21-e';
import { $, $$, esc, ikon, markaIkon, bildir, cekmece, onayla, temaUygula, temaSifirla, STILLER, VURGULAR, stilAdi, qrSvg, kopyala, href, git, SITE, paylasLink, TL, sayiYaz, resimKucult, waLink, ayrilmaKoy, ONIZLEME, tamYol } from './ui.js?v=2026-11-21-e';
import { harita, planSvg } from './harita.js?v=2026-11-21-e';
import { qrPng } from './yazdir.js?v=2026-11-21-e';

let Y = null, E = null;
const yolY = (p = '') => Y.taban + (p ? '/' + p : '');
const kopya = (o) => JSON.parse(JSON.stringify(o));
const AYLAR = C.AYLAR;
const takvimK = (t) => { if (!t) return '<div class="takvim-k"><b>—</b><span>tarih yok</span></div>'; const [, a, g] = t.split('-').map(Number); return `<div class="takvim-k"><b>${g}</b><span>${AYLAR[a - 1].slice(0, 3)}</span></div>`; };
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
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">${markaIkon(64, 'giris-ikon')}<div><h1>${rol === 'salon' ? 'Salon paneli' : 'Düğün Planla'}</h1><p class="soluk" style="margin-top:6px">${rol === 'salon' ? 'Salonunuza verilen şifreyle girin.' : 'Yönetici paneli. Okut ve Oyna paneliyle aynı kullanıcı adı ve şifre.'}</p></div>
    <form id="yG" autocomplete="on">${rol === 'salon' ? '' : `<label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="k" autocomplete="username" autocapitalize="none" required></label>`}<label class="alan"><span>Şifre</span><input class="girdi" name="s" type="password" autocomplete="current-password" required></label><button class="dg ana tam buyuk" type="submit">Giriş yap</button><p class="hata-yazi" id="yH">${esc(mesaj)}</p></form>
    ${api.demo ? `<p class="rozet vurgu">${rol === 'salon' ? 'Demo şifresi: salon123' : 'Demo: herhangi bir kullanıcı adı ve şifre'}</p>` : ''}</div></div>`;
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
  const N = Y.rol === 'salon' ? [['', 'takvim', 'Düğünler'], ['alanlar', 'masa', 'Salon planları']] : [['', 'ozet', 'Özet'], ['salonlar', 'salon', 'Salonlar'], ['dugunler', 'takvim', 'Düğünler'], ['istatistik', 'istatistik', 'İstatistik']];
  Y.kok.innerHTML = `<div class="kabuk yon"><header class="yon-ust"><div class="ic"><a class="marka" href="${href(yolY())}" data-git="${yolY()}">${s0 ? logoK(s0) : markaIkon(28)}<span>${esc(s0 ? s0.ad : 'Düğün Planla')}</span></a>
    <nav>${N.map(([k, i, a]) => `<a href="${href(yolY(k))}" data-git="${yolY(k)}" class="${aktif === k ? 'on' : ''}">${a}</a>`).join('')}</nav><span class="bosluk"></span>
    ${Y.rol === 'yonetici' && !api.demo ? `<a class="dg sade kucuk" href="/yonetim/">Okut ve Oyna</a>` : ''}<button class="dg ikon-d" data-y="cikis" aria-label="Çıkış">${ikon('cikis')}</button></div></header>
    <main class="icerik" id="yI"></main><nav class="alt-menu">${N.map(([k, i, a]) => `<a href="${href(yolY(k))}" data-git="${yolY(k)}" class="${aktif === k ? 'on' : ''}">${ikon(i)}<span>${a}</span></a>`).join('')}</nav></div>`;
  Y.kok.querySelector('[data-y=cikis]').onclick = async () => { if (await onayla({ baslik: 'Çıkış yapılsın mı?', evet: 'Çıkış yap' })) cikis(); };
  return $('#yI');
}
function sayfa(alt) {
  ayrilmaKoy(null); E = null;
  const p = alt.split('/').filter(Boolean);
  if (Y.rol === 'salon') {
    if (p[0] === 'dugun' && p[1]) return dugunDetay(kabuk(''), p[1]);
    if (p[0] === 'dugun-plan' && p[1]) return dugunPlanDuzen(p[1]);
    if (p[0] === 'alanlar') return alanlarSalon(kabuk('alanlar'));
    return dugunListe(kabuk(''), { salon: Y.slug });
  }
  if (p[0] === 'salonlar') return salonListe(kabuk('salonlar'));
  if (p[0] === 'yeni-salon') return salonDuzen(kabuk('salonlar'), null);
  if (p[0] === 'salon' && p[1]) return salonDuzen(kabuk('salonlar'), p[1], p[2] || 'bilgi');
  if (p[0] === 'plan' && p[1] && p[2]) return alanPlanDuzen(p[1], p[2]);
  if (p[0] === 'dugunler') return dugunListe(kabuk('dugunler'), {});
  if (p[0] === 'dugun' && p[1]) return dugunDetay(kabuk('dugunler'), p[1]);
  if (p[0] === 'dugun-plan' && p[1]) return dugunPlanDuzen(p[1]);
  if (p[0] === 'istatistik') return istatistik(kabuk('istatistik'));
  return ozet(kabuk(''));
}
const salonBul = (slug) => Y.veri.salonlar.find((s) => s.slug === slug);

// ---------------------------------------------------------------- ödeme durumu
function odemeDurum(s, ay = C.trBugun().slice(0, 7)) {
  const o = s.odeme || {}; if (!o.tutar || o.periyot === 'yok' || (o.baslangic && o.baslangic.slice(0, 7) > ay)) return null;
  const odenen = (s.odemeler || []).filter((p) => p.donem === ay).reduce((n, p) => n + p.tutar, 0);
  const vade = `${ay}-${String(o.gun || 1).padStart(2, '0')}`;
  return { tutar: o.tutar, odenen, vade, durum: odenen >= o.tutar ? 'odendi' : C.trBugun() > vade ? 'gecikti' : 'bekliyor' };
}
const odemeRozet = (r) => (!r ? '' : r.durum === 'odendi' ? '<span class="rozet iyi">Bu ay ödendi</span>' : r.durum === 'gecikti' ? `<span class="rozet hata">Gecikti · ${TL(r.tutar - r.odenen)}</span>` : `<span class="rozet uyari">${esc(C.tarihYaz(r.vade, { yil: false }))} · ${TL(r.tutar - r.odenen)}</span>`);

// ---------------------------------------------------------------- özet
function ozet(el) {
  const V = Y.veri, bugun = C.trBugun(), sinir = C.gunEkle(bugun, 120);
  const yak = V.dugunler.filter((d) => d.tarih && d.tarih >= bugun && d.tarih <= sinir);
  const ay = bugun.slice(0, 7), od = V.salonlar.map((s) => [s, odemeDurum(s, ay)]).filter((x) => x[1]);
  const toplam = od.reduce((n, [, r]) => n + r.tutar, 0), alinan = od.reduce((n, [, r]) => n + Math.min(r.odenen, r.tutar), 0);
  el.innerHTML = `<div class="bolum-bas"><h1>Özet</h1><span class="bosluk"></span><button class="dg ana kucuk" data-y="yeni-dugun">${ikon('arti', 'k')} Düğün</button></div>
  <div class="sayilar"><a class="sayi" href="${href(yolY('salonlar'))}" data-git="${yolY('salonlar')}"><b>${V.salonlar.length}</b><span>salon · ${V.salonlar.filter((s) => s.aktif !== false).length} etkin</span></a>
    <a class="sayi" href="${href(yolY('dugunler'))}" data-git="${yolY('dugunler')}"><b>${yak.length}</b><span>düğün önümüzdeki 4 ayda</span></a>
    <div class="sayi"><b>${sayiYaz(yak.reduce((n, d) => n + d.kisi, 0))}</b><span>davetli bu düğünlerde</span></div>
    ${toplam ? `<div class="sayi"><b style="font-size:26px">${TL(alinan)}</b><span>${TL(toplam)} bu ay alınacak</span><div class="ilerleme"><i style="width:${Math.round((alinan / toplam) * 100)}%"></i></div></div>` : `<a class="sayi" href="${href(yolY('dugunler'))}" data-git="${yolY('dugunler')}"><b>${V.dugunler.length}</b><span>düğün kaydı toplam</span></a>`}</div>
  ${!V.salonlar.length ? `<section class="kart bos" style="margin-top:16px"><span class="serif">Henüz salon yok</span>İlk düğün salonunuzu ekleyin; logosunu, rengini ve salon planını ayarlayın.<br><a class="dg ana" href="${href(yolY('yeni-salon'))}" data-git="${yolY('yeni-salon')}">Salon ekle</a></section>` : ''}
  <div class="ozet-izgara" style="margin-top:16px"${V.salonlar.length ? '' : ' hidden'}><section class="kart"><div class="kart-bas"><h2>Yaklaşan düğünler</h2><span class="bosluk"></span><a class="dg sade kucuk" href="${href(yolY('dugunler'))}" data-git="${yolY('dugunler')}">Tümü</a></div>${yak.length ? yak.slice(0, 12).map(dugunSatir).join('') : '<p class="soluk">Önümüzdeki 4 ayda düğün yok.</p>'}</section>
    <section class="kart"><div class="kart-bas"><h2>Bu ay ödemeler</h2></div>${od.length ? od.map(([s, r]) => `<a class="satir" href="${href(yolY('salon/' + s.slug + '/odeme'))}" data-git="${yolY('salon/' + s.slug + '/odeme')}">${logoK(s)}<span class="ana"><b>${esc(s.ad)}</b><small>${TL(r.tutar)} / ay</small></span>${odemeRozet(r)}</a>`).join('') : '<p class="soluk">Aylık ücret girilmiş salon yok.</p>'}</section></div>`;
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
    <section class="kart" style="padding:6px 14px">${L.length ? L.map(dugunSatir).join('') : '<div class="bos"><span class="serif">Düğün yok</span>Yeni bir düğün ekleyerek çifte PIN ve bağlantı verin.</div>'}</section>`;
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
      await veriAl(); c.kapat(); git(yolY('dugun/' + r.kod)); setTimeout(() => girisBilgisi(r.kod, r.pin), 200);
    } catch (e) { $('#nH', c.el).textContent = e.message; b.disabled = false; }
  };
}
function ciftMesaji(d, pin) { return `Merhaba ${d.gelin} & ${d.damat}, Düğün Planla ile davetli listenizi ve oturma planınızı hazırlayabilirsiniz.\nGiriş: ${paylasLink('/d/' + d.kod + '/plan')}\nPIN: ${pin}\nDavetlilerinize göndereceğiniz bağlantı: ${paylasLink('/d/' + d.kod)}`; }
function girisBilgisi(kod, pin) {
  const d = Y.veri.dugunler.find((x) => x.kod === kod); if (!d) return;
  cekmece({ baslik: 'Düğün oluşturuldu', govde: `<div class="yigin"><p>Çifte aşağıdaki bilgileri iletin. PIN'i daha sonra düğünün sayfasından da görebilirsiniz.</p>
    <div class="kart sik" style="display:grid;gap:8px"><span class="etiket">Çift paneli</span><div class="baglanti"><code>${esc(paylasLink('/d/' + kod + '/plan'))}</code></div><span class="etiket" style="margin-top:6px">PIN</span><b class="pin-goster">${esc(pin)}</b></div>
    <a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', ciftMesaji(d, pin)))}">${ikon('mesaj', 'k')} WhatsApp ile çifte gönder</a></div>`, alt: '<button class="dg ana" data-kapat>Tamam</button>' });
}
async function dugunDetay(el, kod) {
  el.innerHTML = '<div class="yukleniyor"><i></i></div>';
  let r; try { r = await api.tam(kod, '', Y.token); } catch (e) { el.innerHTML = `<div class="kart bos"><span class="serif">Düğün açılamadı</span>${esc(e.message)}<br><a class="dg cizgili" href="${href(yolY(Y.rol === 'salon' ? '' : 'dugunler'))}" data-git="${yolY(Y.rol === 'salon' ? '' : 'dugunler')}">Düğünlere dön</a></div>`; return; }
  const d = r.dugun, b = d.bilgi, s = salonBul(d.salon) || r.salon, sy = C.sayilar(d), pin = r.pin;
  const link = paylasLink('/d/' + kod);
  el.innerHTML = `<a class="geri-bag" href="${href(yolY(Y.rol === 'salon' ? '' : 'dugunler'))}" data-git="${yolY(Y.rol === 'salon' ? '' : 'dugunler')}">${ikon('sol', 'k')} Düğünler</a>
    <div class="bolum-bas"><div><p class="etiket">${esc(Object.fromEntries(C.TURLER)[b.tur])} · ${esc(C.tarihYaz(b.tarih, { gun: true }))} · ${esc(C.saatYaz(b.saat))}</p><h1 style="margin-top:4px">${esc(C.ciftAdi(b))}</h1><p class="soluk" style="margin-top:4px">${esc([s?.ad, d.alanAd].filter(Boolean).join(' · '))} · kod <b>${esc(kod)}</b></p></div><span class="bosluk"></span><a class="dg ana" href="${href('/d/' + kod + '/plan')}" data-git="/d/${kod}/plan">${ikon('kalem', 'k')} Planı aç</a></div>
    <div class="sayilar"><div class="sayi"><b>${sy.kisi}</b><span>${sy.davet} davetiye</span></div><div class="sayi"><b>${sy.geliyor}</b><span>geliyor · ${sy.bekliyor} bekleniyor</span></div><div class="sayi"><b>${sy.yerlesen}</b><span>kişi yerleşti · ${sy.masa} masa</span></div><div class="sayi"><b>${sy.gorevBitti}/${sy.gorev}</b><span>görev</span></div></div>
    <div class="paylas-izgara" style="margin-top:16px">
      <section class="kart"><div class="kart-bas"><h2>Çiftin girişi</h2></div><div class="yigin" style="gap:10px"><div class="baglanti"><code>${esc(link)}/plan</code><button class="dg kucuk" data-y="kopya" data-v="${esc(link)}/plan">${ikon('kopya', 'kk')}</button></div>
        <div style="display:flex;align-items:center;gap:12px"><span class="soluk">PIN</span><b class="pin-goster" id="dPin">${esc(pin || '—')}</b><span class="bosluk" style="flex:1"></span><button class="dg cizgili kucuk" data-y="pin">Yeni PIN</button></div>
        <a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', ciftMesaji({ ...b, kod }, pin)))}">${ikon('mesaj', 'k')} WhatsApp ile çifte gönder</a></div></section>
      <section class="kart"><div class="kart-bas"><h2>Davetli bağlantısı</h2></div><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="qr-kutu" style="width:132px;height:132px">${qrSvg(link)}</div><div class="yigin" style="flex:1;min-width:180px;gap:8px"><div class="baglanti"><code>${esc(link)}</code><button class="dg kucuk" data-y="kopya" data-v="${esc(link)}">${ikon('kopya', 'kk')}</button></div><button class="dg cizgili kucuk" data-y="qr">${ikon('indir', 'kk')} QR'ı indir</button><a class="dg sade kucuk" href="${href('/d/' + kod)}" data-git="/d/${kod}">${ikon('goz', 'kk')} Sayfayı gör</a></div></div></section>
      <section class="kart"><div class="kart-bas"><h2>Düğün bilgileri</h2></div><form class="yigin" id="mF">
        <div class="izgara2"><label class="alan"><span>Gelin</span><input class="girdi" name="gelin" value="${esc(b.gelin)}" maxlength="40"></label><label class="alan"><span>Damat</span><input class="girdi" name="damat" value="${esc(b.damat)}" maxlength="40"></label></div>
        <div class="izgara3"><label class="alan"><span>Tarih</span><input class="girdi" type="date" name="tarih" value="${esc(b.tarih)}"></label><label class="alan"><span>Başlangıç</span><input class="girdi" type="time" name="saat" value="${esc(b.saat)}"></label><label class="alan"><span>Bitiş</span><input class="girdi" type="time" name="bitis" value="${esc(b.bitis)}"></label></div>
        <div class="izgara2"><label class="alan"><span>Tür</span><select class="girdi" name="tur">${C.TURLER.map(([k, a]) => `<option value="${k}"${k === b.tur ? ' selected' : ''}>${a}</option>`).join('')}</select></label><label class="alan"><span>Salon alanı</span><select class="girdi" name="alan">${(s?.alanlar || []).map((a) => `<option value="${esc(a.id)}"${a.id === d.alan ? ' selected' : ''}>${esc(a.ad)}</option>`).join('')}</select></label></div>
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
    else if (a.dataset.y === 'pin') { if (!(await onayla({ baslik: 'Yeni PIN oluşturulsun mu?', metin: 'Çiftin açık oturumları kapanır; yeni PIN’i onlara iletmeniz gerekir.', evet: 'Oluştur' }))) return; try { const x = await api.pin(kod, {}, Y.token); $('#dPin').textContent = x.pin; bildir('Yeni PIN: ' + x.pin, { sure: 8000 }); } catch (er) { bildir(er.message, { hata: true }); } }
    else if (a.dataset.y === 'yenile') { if (!(await onayla({ baslik: 'Salon planı yeniden uygulansın mı?', metin: 'Bu düğünün masa düzeni, salonun güncel planıyla değiştirilir. Aynı masalarda oturanlar yerinde kalır; kaldırılan masalardakiler masasız kalır.', evet: 'Uygula' }))) return; try { await api.meta(kod, { planYenile: true }, Y.token); await veriAl(); bildir('Salon planı uygulandı'); dugunDetay(el, kod); } catch (er) { bildir(er.message, { hata: true }); } }
    else if (a.dataset.y === 'sil') { if (!(await onayla({ baslik: `${C.ciftAdi(b)} silinsin mi?`, metin: 'Davetli listesi, oturma planı, görevler ve katılım yanıtları kalıcı olarak silinir. Bu işlem geri alınamaz.', evet: 'Kalıcı olarak sil', tehlike: true }))) return; try { await api.dugunSil(kod, Y.token); await veriAl(); bildir('Düğün silindi'); git(yolY(Y.rol === 'salon' ? '' : 'dugunler')); } catch (er) { bildir(er.message, { hata: true }); } }
  };
  $('#mF', el).onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    if (!v.tarih) return bildir('Tarih boş olamaz', { hata: true });
    try { await api.meta(kod, { bilgi: { gelin: v.gelin, damat: v.damat, tarih: v.tarih, saat: v.saat, bitis: v.bitis, tur: v.tur }, ...(v.alan && v.alan !== d.alan ? { alan: v.alan } : {}) }, Y.token); await veriAl(); bildir('Kaydedildi'); dugunDetay(el, kod); } catch (er) { bildir(er.message, { hata: true }); }
  };
}

// ---------------------------------------------------------------- salonlar
function salonListe(el) {
  const bugun = C.trBugun();
  el.innerHTML = `<div class="bolum-bas"><h1>Salonlar</h1><span class="bosluk"></span><a class="dg ana" href="${href(yolY('yeni-salon'))}" data-git="${yolY('yeni-salon')}">${ikon('arti', 'k')} Yeni salon</a></div>
  ${Y.veri.salonlar.length ? `<div class="kart-izgara">${Y.veri.salonlar.map((s) => { const yak = Y.veri.dugunler.filter((d) => d.salon === s.slug && d.tarih >= bugun).length; const oz = s.alanlar.map((a) => C.planOzet(a.plan)); return `<a class="kart salon-kart" href="${href(yolY('salon/' + s.slug))}" data-git="${yolY('salon/' + s.slug)}"><div class="ust-s">${logoK(s)}<div style="min-width:0"><b>${esc(s.ad)}</b><small class="soluk">/salon/${esc(s.slug)}</small></div></div><div class="cipler">${s.aktif === false ? '<span class="rozet hata">Kapalı</span>' : ''}<span class="rozet">${s.alanlar.length} alan · ${oz.reduce((n, o) => n + o.masa, 0)} masa</span><span class="rozet vurgu">${yak} yaklaşan düğün</span>${odemeRozet(odemeDurum(s))}</div></a>`; }).join('')}</div>` : `<div class="kart bos"><span class="serif">Henüz salon yok</span>İlk düğün salonunuzu ekleyin; logosunu, renklerini ve salon planını ayarlayın.<br><a class="dg ana" href="${href(yolY('yeni-salon'))}" data-git="${yolY('yeni-salon')}">Salon ekle</a></div>`}`;
}
const SEK = [['bilgi', 'Bilgiler'], ['tema', 'Görünüm'], ['alanlar', 'Salon planları'], ['dugunler', 'Düğünler'], ['giris', 'Giriş ve QR'], ['odeme', 'Ödemeler']];
function salonDuzen(el, slug, sekme = 'bilgi') {
  const eski = slug ? salonBul(slug) : null;
  if (slug && !eski) { el.innerHTML = `<div class="kart bos"><span class="serif">Salon bulunamadı</span><a class="dg cizgili" href="${href(yolY('salonlar'))}" data-git="${yolY('salonlar')}">Salonlara dön</a></div>`; return; }
  if (!Y.duz || Y.duz.slug !== (slug || '') || !slug) Y.duz = eski ? { ...kopya(eski), tema: kopya(eski.temaHam || eski.tema), temaUrl: eski.tema } : { slug: '', ad: '', aktif: true, tema: { stil: 'acik', vurgu: '', logoZemin: 'yok', kisaAd: '', slogan: '' }, iletisim: {}, alanlar: [], kisi: '', notlar: '', odeme: { tutar: 0, gun: 1, periyot: 'aylik' }, odemeler: [], yeni: true, temaUrl: {} };
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
  $$('[data-s]', g).forEach((i) => { const p = i.dataset.s.split('.'); let o = x; for (let k = 0; k < p.length - 1; k++) o = o[p[k]] ||= {}; o[p.at(-1)] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
}
async function salonKaydet(slug) {
  const x = Y.duz, g = $('#sG'); if (g) topla(g, x);
  const yeni = !slug;
  const hedef = yeni ? C.slugla(x.slug || x.ad) : slug;
  if (!x.ad.trim()) return bildir('Salon adını yazın', { hata: true });
  if (!C.SLUG_RE.test(hedef)) return bildir('Salon adresi geçersiz: küçük harf, rakam ve tire kullanın', { hata: true });
  if (hedef === 'ornek-salon' && !api.demo) return bildir('Bu adres ayrılmış, başka bir adres seçin', { hata: true });
  try {
    const r = await api.salonKaydet(hedef, { ...x, yeni, tema: { stil: x.tema.stil, vurgu: x.tema.vurgu, logoZemin: x.tema.logoZemin, kisaAd: x.tema.kisaAd, slogan: x.tema.slogan } }, Y.token);
    await veriAl(); Y.duz = null; bildir('Kaydedildi');
    if (yeni) git(yolY('salon/' + r.salon.slug + '/tema')); else salonDuzen($('#yI'), slug, $('.sekmeler .on')?.dataset.sk || 'bilgi');
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
    ${slug ? `<hr class="ayrac"><div><button class="dg tehlike" data-sil="1">${ikon('cop', 'k')} Salonu sil</button></div>` : ''}</div>`;
  const ad = $('[data-s=ad]', g), sl = $('#sSlug', g);
  if (!slug) { ad.oninput = () => { if (!sl.dataset.el) { sl.value = C.slugla(ad.value); $('#sSlugO', g).textContent = sl.value || '…'; } }; sl.oninput = () => { sl.dataset.el = '1'; sl.value = sl.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); $('#sSlugO', g).textContent = sl.value || '…'; }; }
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
  const sl = paylasLink('/salon/' + slug), panel = `${sl}/yonetim`;
  g.innerHTML = `<div class="paylas-izgara"><section class="kart"><div class="kart-bas"><h2>Kalıcı salon QR'ı</h2></div><p class="soluk" style="margin-bottom:12px">Salonun girişine konacak QR ya da NFC standı bu adrese gider. O gün salonda düğün varsa misafir doğrudan masa bulucuya ulaşır; yoksa salonun sayfası açılır.</p>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="qr-kutu" style="width:150px;height:150px">${qrSvg(sl)}</div><div class="yigin" style="flex:1;min-width:180px;gap:8px"><div class="baglanti"><code>${esc(sl)}</code><button class="dg kucuk" data-g="kopya" data-v="${esc(sl)}">${ikon('kopya', 'kk')}</button></div><button class="dg cizgili kucuk" data-g="qr">${ikon('indir', 'kk')} QR'ı indir (PNG)</button><a class="dg sade kucuk" href="${href('/salon/' + slug)}" data-git="/salon/${slug}">${ikon('goz', 'kk')} Sayfayı gör</a></div></div></section>
    <section class="kart"><div class="kart-bas"><h2>Salon paneli girişi</h2><span class="bosluk"></span><span class="rozet ${x.giris ? 'iyi' : ''}">${x.giris ? 'Açık' : 'Kapalı'}</span></div><p class="soluk" style="margin-bottom:12px">Salon çalışanları bu şifreyle kendi düğünlerini ekleyebilir, çiftlere PIN verebilir ve planları yazdırabilir. Ödemeleri ve notlarınızı göremezler.</p>
      <div class="baglanti" style="margin-bottom:10px"><code>${esc(panel)}</code><button class="dg kucuk" data-g="kopya" data-v="${esc(panel)}">${ikon('kopya', 'kk')}</button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="girdi" id="sSf" type="text" placeholder="${x.giris ? 'Yeni şifre' : 'Şifre (en az 6 karakter)'}" autocomplete="off" style="flex:1;min-width:160px"><button class="dg ana" data-g="sifre">${x.giris ? 'Şifreyi değiştir' : 'Girişi aç'}</button></div>
      ${x.giris ? `<button class="dg sade kucuk" data-g="kapat" style="margin-top:8px">Girişi kapat</button>` : ''}</section></div>`;
  g.onclick = async (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    if (b.dataset.g === 'kopya') kopyala(b.dataset.v);
    else if (b.dataset.g === 'qr') qrPng(sl, `salon-qr-${slug}.png`, x.tema.kisaAd || x.ad);
    else if (b.dataset.g === 'sifre' || b.dataset.g === 'kapat') {
      const s = b.dataset.g === 'kapat' ? null : $('#sSf', g).value;
      if (s !== null && s.length < 6) return bildir('Şifre en az 6 karakter olmalı', { hata: true });
      try { const r = await api.salonSifre(slug, s, Y.token); x.giris = r.giris; await veriAl(); bildir(r.giris ? 'Salon girişi açık. Şifreyi salonla paylaşın.' : 'Salon girişi kapatıldı'); sGiris(g, x, slug); } catch (er) { bildir(er.message, { hata: true }); }
    }
  };
}
function sOdeme(g, x, slug) {
  const o = x.odeme ||= { tutar: 0, gun: 1, periyot: 'aylik' };
  const L = [...(x.odemeler || [])].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  const r = odemeDurum(x);
  g.innerHTML = `<div class="ozet-izgara"><section class="kart"><div class="kart-bas"><h2>Aylık ücret</h2><span class="bosluk"></span>${odemeRozet(r)}</div><div class="yigin">
      <div class="izgara3"><label class="alan"><span>Tutar (₺)</span><input class="girdi" type="number" min="0" step="50" data-s="odeme.tutar" value="${o.tutar || 0}"></label><label class="alan"><span>Ödeme günü</span><input class="girdi" type="number" min="1" max="28" data-s="odeme.gun" value="${o.gun || 1}"></label><label class="alan"><span>Başlangıç</span><input class="girdi" type="date" data-s="odeme.baslangic" value="${esc(o.baslangic || '')}"></label></div>
      <p class="kucuk-yazi">Kaydetmeyi unutmayın.</p></div></section>
    <section class="kart"><div class="kart-bas"><h2>Ödeme ekle</h2></div><form class="yigin" id="oF"><div class="izgara3"><label class="alan"><span>Tarih</span><input class="girdi" type="date" name="tarih" value="${C.trBugun()}"></label><label class="alan"><span>Dönem</span><input class="girdi" type="month" name="donem" value="${C.trBugun().slice(0, 7)}"></label><label class="alan"><span>Tutar</span><input class="girdi" type="number" name="tutar" min="0" value="${o.tutar || ''}"></label></div><input class="girdi" name="not" placeholder="Not (isteğe bağlı)" maxlength="200"><button class="dg ana" type="submit">Ödemeyi kaydet</button></form></section></div>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Ödeme geçmişi</h2><span class="bosluk"></span><span class="rozet">${TL(L.reduce((n, p) => n + p.tutar, 0))} toplam</span></div>${L.length ? L.map((p) => `<div class="satir"><span class="ana"><b>${TL(p.tutar)}</b><small>${esc(C.tarihYaz(p.tarih))}${p.donem ? ' · ' + esc(AYLAR[+p.donem.slice(5) - 1] + ' ' + p.donem.slice(0, 4)) + ' dönemi' : ''}${p.not ? ' · ' + esc(p.not) : ''}</small></span><button class="dg ikon-d" data-osil="${p.id}" aria-label="Sil">${ikon('cop', 'k')}</button></div>`).join('') : '<p class="soluk">Kayıt yok.</p>'}</section>`;
  g.oninput = () => topla(g, x);
  $('#oF', g).onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); if (!(+v.tutar > 0)) return bildir('Tutarı yazın', { hata: true }); x.odemeler = [...(x.odemeler || []), { id: C.rastgele(8), tarih: v.tarih, donem: v.donem, tutar: +v.tutar, not: v.not }]; topla(g, x); if (await salonKaydet(slug)) bildir('Ödeme kaydedildi'); };
  g.onclick = async (e) => { const b = e.target.closest('[data-osil]'); if (!b) return; if (!(await onayla({ baslik: 'Ödeme kaydı silinsin mi?', evet: 'Sil', tehlike: true }))) return; x.odemeler = x.odemeler.filter((p) => p.id !== b.dataset.osil); await salonKaydet(slug); };
}
function alanlarSalon(el) {
  const s = Y.veri.salonlar[0];
  el.innerHTML = `<div class="bolum-bas"><h1>Salon planları</h1></div><p class="soluk" style="margin-bottom:14px">Yeni düğünler bu planlarla başlar. Plan değişikliği için yöneticiyle görüşün; tek bir düğünün masa düzenini o düğünün sayfasından değiştirebilirsiniz.</p><div class="kart-izgara">${s.alanlar.map((a) => alanKart(a, { duzenle: false })).join('') || '<div class="kart bos">Henüz salon planı yok.</div>'}</div>`;
}

// ---------------------------------------------------------------- istatistik
async function istatistik(el) {
  el.innerHTML = '<div class="yukleniyor"><i></i></div>';
  let r; try { r = await api.istat(Y.token); } catch (e) { el.innerHTML = `<div class="kart bos">${esc(e.message)}</div>`; return; }
  const bugun = C.trBugun(), L = r.dugunler;
  const S = Y.veri.salonlar.map((s) => { const D = L.filter((d) => d.salon === s.slug); const t = (f) => D.reduce((n, d) => n + (f(d) || 0), 0); return { s, n: D.length, yak: D.filter((d) => d.tarih >= bugun).length, kisi: t((d) => d.kisi), gel: t((d) => d.geliyor), lcv: t((d) => d.sayac.lcv), bul: t((d) => d.sayac.bul), zi: t((d) => d.sayac.ziyaret) }; });
  const aylar = []; for (let i = -5; i <= 6; i++) { const d = new Date(bugun + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + i); aylar.push(d.toISOString().slice(0, 7)); }
  const say = aylar.map((a) => L.filter((d) => (d.tarih || '').startsWith(a)).length), mx = Math.max(1, ...say);
  const T = (f) => S.reduce((n, x) => n + x[f], 0);
  el.innerHTML = `<div class="bolum-bas"><h1>İstatistik</h1></div>
    <div class="sayilar"><div class="sayi"><b>${L.length}</b><span>düğün kaydı · ${T('yak')} yaklaşan</span></div><div class="sayi"><b>${sayiYaz(T('kisi'))}</b><span>davetli (kişi)</span></div><div class="sayi"><b>${sayiYaz(T('lcv'))}</b><span>katılım yanıtı (LCV)</span></div><div class="sayi"><b>${sayiYaz(T('bul'))}</b><span>kişi masa bulucuyu kullandı</span></div></div>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Aylara göre düğünler</h2></div><div class="cubuklar">${aylar.map((a, i) => `<div><b>${say[i] || ''}</b><i style="height:${Math.round((say[i] / mx) * 100)}%;${a === bugun.slice(0, 7) ? '' : 'opacity:.55'}"></i><span>${AYLAR[+a.slice(5) - 1].slice(0, 3)}</span></div>`).join('')}</div></section>
    <div class="tablo-kaydir" style="margin-top:16px"><table class="tablo"><thead><tr><th>Salon</th><th class="sag">Düğün</th><th class="sag">Yaklaşan</th><th class="sag">Davetli</th><th class="sag">Geliyor</th><th class="sag">LCV yanıtı</th><th class="sag">Davet sayfası</th><th class="sag">Masa bulucu</th></tr></thead><tbody>${S.map((x) => `<tr><td><a href="${href(yolY('salon/' + x.s.slug))}" data-git="${yolY('salon/' + x.s.slug)}">${esc(x.s.ad)}</a></td><td class="sag">${x.n}</td><td class="sag">${x.yak}</td><td class="sag">${sayiYaz(x.kisi)}</td><td class="sag">${sayiYaz(x.gel)}</td><td class="sag">${sayiYaz(x.lcv)}</td><td class="sag">${sayiYaz(x.zi)}</td><td class="sag">${sayiYaz(x.bul)}</td></tr>`).join('') || '<tr><td colspan="8">Salon yok.</td></tr>'}</tbody></table></div>
    <p class="kucuk-yazi" style="margin-top:14px">“Davet sayfası” ve “masa bulucu” her cihazı bir kez sayar. Düğün Planla Netlify’ın ücretsiz planında çalışır; oyun sunucusu (Render) kullanılmaz, ek sunucu maliyeti yoktur.</p>`;
}

// ---------------------------------------------------------------- salon planı düzenleyici
async function alanPlanDuzen(slug, alanId) {
  const s = salonBul(slug), a = s?.alanlar.find((x) => x.id === alanId);
  if (!a) { kabuk('salonlar').innerHTML = '<div class="kart bos">Salon planı bulunamadı.</div>'; return; }
  const olustur = /[?&]olustur=1/.test(location.search + location.hash);
  duzenleyici({ baslik: `${s.ad} · ${a.ad}`, plan: a.plan, geri: yolY(`salon/${slug}/alanlar`), olustur, kaydet: async (plan) => {
    const x = { ...kopya(s), tema: kopya(s.temaHam || s.tema) };
    x.alanlar = x.alanlar.map((z) => (z.id === alanId ? { ...z, plan } : z));
    await api.salonKaydet(slug, { ...x, tema: { stil: x.tema.stil, vurgu: x.tema.vurgu, logoZemin: x.tema.logoZemin, kisaAd: x.tema.kisaAd, slogan: x.tema.slogan } }, Y.token);
    await veriAl(); Y.duz = null;
  } });
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
