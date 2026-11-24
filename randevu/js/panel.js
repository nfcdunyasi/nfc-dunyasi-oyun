// Randevu Vaktim — personel paneli. Her usta kendi kullanıcı adıyla girer; "işletme yöneticisi" yetkili usta tüm ekibi görür,
// işletme bilgilerini, hizmetleri ve randevu kurallarını düzenler. Panel işletmenin temasıyla açılır.
import * as C from './cekirdek.js?v=2026-11-24-b';
import { api, yerel, TK } from './api.js?v=2026-11-24-b';
import * as D from './duzen.js?v=2026-11-24-b';
import {
  $, $$, esc, TL, sayiYaz, ikon, bildir, cekmece, onayla, kopyala, waLink, git, href, temaUygula, avatar, logo, durumRozet, saatAraligi, hizmetYazi,
  randevuNo, yukleniyor, hataKutu, metaRobots, paylasLink, qrSvg, indir, gorselSec, zamanOnce, ONIZLEME,
} from './rui.js?v=2026-11-24-b';

let P = null; // { token, v, sec: '*'|pid, tarih, yenile }
export function temizle() { if (P?.yenile) { clearInterval(P.yenile); P.yenile = null; } korumaKaldir(); }
const KOK = () => $('#uygulama');
const tok = () => yerel.al(TK.personel);
const I = () => P.v.isletme;
const ben = () => I().personel.find((p) => p.id === P.v.ben);
const pAl = (id) => I().personel.find((p) => p.id === id);
const sim = () => C.trSimdi(Date.now() + (P?.fark || 0));
const yol = (p = '') => '/randevu/panel' + (p ? '/' + p : '');
const ust = () => P.v.yonetici;
const aktifPersonel = () => I().personel.filter((p) => p.aktif !== false);

function cikis() { yerel.sil(TK.personel); P = null; git('/randevu/giris', { degistir: true }); }
async function yukle() {
  const v = await api.panel(P.token);
  P.v = v; P.fark = v.simdi.ms - Date.now();
  if (P.sec == null) P.sec = v.yonetici ? '*' : v.ben;
  temaUygula(v.isletme.tema);
}

export async function panel(parca) {
  metaRobots(true);
  const t = tok();
  if (!t) return git('/randevu/giris', { degistir: true });
  if (!P || P.token !== t) P = { token: t, v: null, sec: null, tarih: null };
  if (!P.v) {
    KOK().innerHTML = `<div class="giris-sayfa">${yukleniyor()}</div>`;
    try { await yukle(); } catch (e) {
      if (e.durum === 401) { yerel.sil(TK.personel); P = null; return git('/randevu/giris', { degistir: true }); }
      KOK().innerHTML = `<div class="giris-sayfa"><div class="giris-kart">${ikon('uyari')}<h1>${e.durum === 403 ? 'Giriş kapalı' : 'Bağlanılamadı'}</h1><p class="soluk">${esc(e.message)}</p><button class="dg ana" type="button" data-t>Tekrar dene</button><button class="dg sade" type="button" data-c>Çıkış yap</button></div></div>`;
      KOK().querySelector('[data-t]').onclick = () => panel(parca); KOK().querySelector('[data-c]').onclick = cikis;
      return;
    }
  }
  const [a, b] = parca;
  document.title = `${ben()?.ad || 'Panel'} · ${I().ad}`;
  temizle();
  P.yenile = setInterval(arkaYenile, 40e3);
  if (a === 'takvim') return takvim(kabuk('takvim'), b);
  if (a === 'ayarlar') return ayarlar(kabuk('ayarlar'));
  if (a === 'profil') return profilSayfa(kabuk('profil'), b);
  if (a === 'istatistik') return istatistik(kabuk('istatistik'));
  if (a === 'isletme' && ust()) return isletmeAyar(kabuk('isletme'), b);
  return bugun(kabuk(''));
}
async function arkaYenile() {
  if (document.hidden || !P) return;
  const once = P.v.bekleyen.map((x) => x.id).join();
  try { await yukle(); } catch (e) { if (e.durum === 401) cikis(); return; }
  const sonra = P.v.bekleyen.map((x) => x.id).join();
  rozetGuncelle();
  if (once !== sonra) {
    if (P.v.bekleyen.length > once.split(',').filter(Boolean).length) bildir('Yeni ödeme bildirimi var');
    const e = $('#pI'); if (e?.dataset.sayfa === '') bugun(e); else if (e?.dataset.sayfa === 'takvim') takvim(e, P.tarih);
  }
}
function rozetGuncelle() {
  const n = P.v.bekleyen.length;
  document.title = `${n ? `(${n}) ` : ''}${ben()?.ad || 'Panel'} · ${I().ad}`;
  $$('[data-rozet]').forEach((e) => { e.textContent = n || ''; e.hidden = !n; });
}

// ---------------------------------------------------------------- kabuk
function kabuk(aktif) {
  const s = I(), N = [['', 'ev', 'Bugün'], ['takvim', 'takvim', 'Takvim'], ['istatistik', 'istatistik', 'İstatistik'], ...(ust() ? [['isletme', 'salon', 'İşletme']] : []), ['profil', 'kisi', 'Profilim'], ['ayarlar', 'ayar', 'Ayarlar']];
  const rozet = (k) => (k === '' ? '<em data-rozet hidden></em>' : '');
  KOK().innerHTML = `<div class="kabuk yon rv-panel"><header class="yon-ust"><div class="ic"><a class="marka" href="${href(yol())}" data-git="${yol()}">${logo(s, 28)}<span>${esc(s.ad)}</span></a>
    <nav>${N.map(([k, , a]) => `<a href="${href(yol(k))}" data-git="${yol(k)}" class="${aktif === k ? 'on' : ''}">${a}${rozet(k)}</a>`).join('')}</nav><span class="bosluk"></span>
    <button class="dg ikon-d" type="button" data-y="ara" aria-label="Müşteri ara">${ikon('ara')}</button>
    <button class="rv-ben" type="button" data-y="ben" aria-label="Hesap">${avatar(ben(), 30)}</button></div></header>
    ${P.v.admin ? `<div class="rv-admin-bant"><span>${ikon('kilit', 'kk')}<span>NFC Dünyası yöneticisi olarak <b>${esc(ben().ad)}</b> panelindesiniz</span></span><a href="${href('/randevu/yonetim/isletme/' + s.slug)}" data-git="/randevu/yonetim/isletme/${esc(s.slug)}">Yönetime dön</a></div>` : ''}
    <main class="icerik" id="pI" data-sayfa="${aktif}"></main><nav class="alt-menu">${N.map(([k, i, a]) => `<a href="${href(yol(k))}" data-git="${yol(k)}" class="${aktif === k ? 'on' : ''}">${ikon(i)}<span>${a}</span>${rozet(k)}</a>`).join('')}</nav></div>`;
  KOK().querySelector('[data-y=ara]').onclick = musteriAra;
  KOK().querySelector('[data-y=ben]').onclick = benMenu;
  rozetGuncelle();
  return $('#pI');
}
function benMenu() {
  const p = ben();
  const c = cekmece({
    baslik: esc(p.ad), govde: `<div class="rv-ben-bas">${avatar(p, 56)}<span><b>${esc(p.ad)}</b><small>${esc(p.unvan || C.personelAd(I().tur))}${ust() ? ' · işletme yöneticisi' : ''}</small><small>${P.v.kullanici ? 'Kullanıcı adı: ' + esc(P.v.kullanici) : 'Yönetici oturumu'}</small></span></div>
      <div class="rv-secenekler"><a class="rv-secenek" href="${href(yol('profil'))}" data-git="${yol('profil')}">${ikon('kisi')}<span><b>Profilim</b><small>Fotoğraf, hakkımda, uzmanlıklar, çalışmalarım</small></span></a>
      <a class="rv-secenek" href="${href(yol('ayarlar'))}" data-git="${yol('ayarlar')}">${ikon('ayar')}<span><b>Ayarlar</b><small>IBAN, çalışma saatleri, izinler, şifre</small></span></a>
      <a class="rv-secenek" href="${href('/randevu/' + I().slug)}" target="_blank" rel="noopener">${ikon('baglanti')}<span><b>Randevu sayfasını aç</b><small>Müşterilerin gördüğü sayfa</small></span></a>
      <button class="rv-secenek" type="button" data-c>${ikon('cikis')}<span><b>Çıkış yap</b><small>Bu cihazdaki oturum kapanır</small></span></button></div>`,
  });
  c.el.querySelectorAll('[data-git]').forEach((a) => a.addEventListener('click', () => c.kapat()));
  c.el.querySelector('[data-c]').onclick = async () => { c.kapat(); if (P.v.admin || (await onayla({ baslik: 'Çıkış yapılsın mı?', evet: 'Çıkış yap' }))) cikis(); };
}
const kapsam = () => (ust() ? P.sec : P.v.ben);
function ekipCipleri(onDegis, tum = true) {
  if (!ust() || aktifPersonel().length < 2) return '';
  return `<div class="cipler rv-ekip-cip">${tum ? `<button class="cip${P.sec === '*' ? ' on' : ''}" type="button" data-sec="*">Tüm ekip</button>` : ''}${aktifPersonel().map((p) => `<button class="cip${P.sec === p.id ? ' on' : ''}" type="button" data-sec="${p.id}">${avatar(p, 20)}${esc(p.ad)}</button>`).join('')}</div>`;
}
function ekipBagla(el, onDegis) { el.querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => { P.sec = b.dataset.sec; onDegis(); })); }

// ---------------------------------------------------------------- bugün
const selam = () => { const s = sim().dk; return s < 360 ? 'İyi geceler' : s < 660 ? 'Günaydın' : s < 1080 ? 'İyi günler' : 'İyi akşamlar'; };
/** Profili eksik ustaya bir kez gösterilen hatırlatma (fotoğraf, hakkında, çalışmalar) */
function profilIpucu() {
  const p = ben(), eksik = [!p.foto && 'fotoğrafınızı', !p.hakkinda && 'kendinizi tanıtan birkaç cümleyi', !p.isler?.length && 'yaptığınız işlerin fotoğraflarını'].filter(Boolean);
  if (!eksik.length || P.v.admin || yerel.al('rv-ipucu-profil-' + p.id)) return '';
  return `<div class="kart rv-ipucu">${ikon('kisi')}<span><b>Profilinizi tamamlayın</b><small>Müşteriler ustasını seçerken profile bakıyor: ${esc(eksik.join(', ').replace(/, ([^,]*)$/, ' ve $1'))} ekleyin.</small></span>
    <span class="dg-grup"><a class="dg ana kucuk" href="${href(yol('profil'))}" data-git="${yol('profil')}">Profile git</a><button class="dg sade kucuk" type="button" data-ipucu-kapat>Sonra</button></span></div>`;
}
async function bugun(el) {
  const s = sim(), kap = kapsam();
  el.innerHTML = `<div class="bolum-bas"><div><p class="etiket">${esc(C.tarihYaz(s.tarih, { gun: true }))}</p><h1>${selam()}, ${esc(ben().ad)}</h1></div><span class="bosluk"></span>
    <div class="dg-grup"><button class="dg cizgili" type="button" data-y="kapat">${ikon('kilit', 'k')}<span>Saat kapat</span></button><button class="dg ana" type="button" data-y="ekle">${ikon('arti', 'k')}<span>Randevu ekle</span></button></div></div>
    ${ekipCipleri()}${bekleyenKart()}${profilIpucu()}<div id="bG">${yukleniyor()}</div>`;
  ekipBagla(el, () => bugun(el));
  el.querySelector('[data-ipucu-kapat]')?.addEventListener('click', () => { yerel.koy('rv-ipucu-profil-' + P.v.ben, '1'); el.querySelector('.rv-ipucu').remove(); });
  el.querySelector('[data-y=ekle]').onclick = () => randevuEkleSayfa({ tarih: s.tarih, p: kap === '*' ? P.v.ben : kap, bitti: () => bugun(el) });
  el.querySelector('[data-y=kapat]').onclick = () => kapatSayfa({ tarih: s.tarih, p: kap === '*' ? P.v.ben : kap, bitti: () => bugun(el) });
  bekleyenBagla(el, () => bugun(el));
  let v;
  try { v = await api.gun(P.token, kap, s.tarih, 2); } catch (e) { $('#bG').innerHTML = hataKutu(e.message); $('#bG [data-tekrar]').onclick = () => bugun(el); return; }
  if (!$('#bG')) return;
  const L0 = [], L1 = [];
  for (const [pid, G] of Object.entries(v.gunler)) { for (const r of G[0].r) L0.push({ ...r, p: pid }); for (const r of G[1].r) L1.push({ ...r, p: pid }); }
  const sirala = (L) => L.filter((r) => r.durum !== 'iptal').sort((a, b) => a.bas - b.bas || a.p.localeCompare(b.p));
  const B = sirala(L0), Y = sirala(L1);
  const gecerli = B.filter((r) => r.durum === 'onay' || r.durum === 'kontrol'), siradaki = gecerli.find((r) => r.bit > s.dk);
  const ciro = gecerli.reduce((n, r) => n + (r.fiyat || 0), 0);
  const tekG = kap !== '*' ? v.gunler[kap]?.[0] : null;
  const bosSaat = tekG ? C.saatListesi({ calisma: tekG.c, dolu: C.doluAraliklar(tekG, Date.now() + P.fark, I().ayar.ara), sure: 30, adim: I().ayar.adim, enErken: s.dk }).filter((x) => x.bos).length : null;
  $('#bG').innerHTML = `<div class="sayilar"><div class="sayi"><b>${gecerli.length}</b><span>randevu bugün</span></div>
      <div class="sayi"><b>${siradaki ? C.saatYaz(siradaki.bas) : '—'}</b><span>${siradaki ? `sıradaki: ${esc(siradaki.ad)}` : 'bugün başka randevu yok'}</span></div>
      <div class="sayi"><b class="tl">${TL(ciro)}</b><span>bugünkü randevuların tutarı</span></div>
      <div class="sayi"><b>${bosSaat ?? Y.filter((r) => r.durum === 'onay' || r.durum === 'kontrol').length}</b><span>${bosSaat != null ? 'boş saat kaldı (30 dk)' : 'randevu yarın'}</span></div></div>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Bugün</h2><span class="bosluk"></span><a class="dg sade kucuk" href="${href(yol('takvim'))}" data-git="${yol('takvim')}">Takvim</a></div>
      ${tekG && !tekG.c.length ? `<p class="soluk rv-bos-not">${tekG.izin === 'izin' ? 'Bugün izinlisiniz.' : tekG.izin === 'kapali' ? 'İşletme bugün kapalı.' : 'Bugün çalışma saatiniz yok.'}</p>` : ''}
      ${B.length ? `<div class="rv-liste">${satirlar(B, s)}</div>` : '<p class="soluk rv-bos-not">Bugün için randevu yok.</p>'}</section>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Yarın</h2><span class="bosluk"></span><span class="soluk">${esc(C.tarihYaz(C.gunEkle(s.tarih, 1), { gun: true, yil: false }))}</span></div>
      ${Y.length ? `<div class="rv-liste">${satirlar(Y, null)}</div>` : '<p class="soluk rv-bos-not">Yarın için randevu yok.</p>'}</section>
    <section class="kart rv-bag-kart" style="margin-top:16px">${bagKart(kap === '*' ? null : pAl(kap) || ben())}</section>`;
  satirBagla($('#bG'), [...B, ...Y], () => bugun(el));
  bagKartBagla($('#bG'));
}
function bekleyenKart(kisa = false) {
  const L = P.v.bekleyen.filter((r) => kapsam() === '*' || r.p === kapsam());
  if (!L.length) return '';
  if (kisa) return `<a class="rv-bant" href="${href('/randevu/panel')}" data-git="/randevu/panel">${ikon('kum', 'k')}<span><b>${L.length} ödeme onayı bekliyor</b><small>Onaylamak için Bugün sayfasına gidin</small></span>${ikon('sag', 'kk')}</a>`;
  return `<section class="kart rv-bekleyen"><div class="kart-bas"><h2>${ikon('kum', 'k')}Ödeme onayı bekleyen <span class="rv-say">${L.length}</span></h2></div>
    <p class="kucuk-yazi" style="margin:-4px 0 10px">Müşteri ödemeyi gönderdiğini bildirdi. Hesabınızı kontrol edin; açıklamada müşterinin adı yazar.</p>
    ${L.map((r) => { const p = pAl(r.p), s = sim(); return `<div class="rv-bek" data-r="${r.id}"><button class="rv-bek-ana" type="button" data-ac="${r.id}"><span class="rv-bek-ad"><b>${esc(r.ad)}</b><small>${esc(C.gunAdi(r.tarih, s.tarih))} ${saatAraligi(r)} · ${esc(hizmetYazi(r.hizmetler))}${ust() && kapsam() === '*' ? ' · ' + esc(p?.ad || '') : ''}</small><small>${r.bildirim ? esc(zamanOnce(r.bildirim)) + ' bildirdi' : 'Ön ödemesiz istek'}</small></span><b class="rv-bek-tutar">${r.kapora ? TL(r.kapora) : '—'}</b></button>
      <div class="rv-bek-eylem"><button class="dg ana" type="button" data-onay="${r.id}">${ikon('tik', 'k')}${r.kapora ? 'Ödeme geldi, onayla' : 'Onayla'}</button><button class="dg sade kucuk" type="button" data-red="${r.id}">${r.kapora ? 'Ödeme gelmedi' : 'Reddet'}</button></div></div>`; }).join('')}</section>`;
}
function bekleyenBagla(el, bitti) {
  const bul = (id) => P.v.bekleyen.find((x) => x.id === id);
  el.querySelectorAll('[data-onay]').forEach((b) => (b.onclick = () => eylemYap(bul(b.dataset.onay), 'onayla', bitti)));
  el.querySelectorAll('[data-red]').forEach((b) => (b.onclick = () => eylemYap(bul(b.dataset.red), 'reddet', bitti)));
  el.querySelectorAll('[data-ac]').forEach((b) => (b.onclick = () => randevuDetay(bul(b.dataset.ac), bitti)));
}
function satirlar(L, s) {
  const ara = s ? L.findIndex((r) => r.bit > s.dk) : -1;
  return L.map((r, i) => {
    const p = pAl(r.p), gecti = s && r.bit <= s.dk;
    return `${i === ara && i > 0 ? '<div class="rv-simdi"><span>Şimdi</span></div>' : ''}<button class="rv-satir${gecti ? ' gecti' : ''} d-${r.durum}" type="button" data-r="${r.id}">
      <span class="rv-satir-saat"><b>${C.saatYaz(r.bas)}</b><small>${C.sureYaz(r.bit - r.bas)}</small></span>
      <span class="rv-satir-ana"><b>${esc(r.ad)}</b><small>${r.kaynak === 'ornek' ? '<em class="rv-ornek-e">örnek</em> ' : ''}${esc(hizmetYazi(r.hizmetler))}${ust() && kapsam() === '*' ? ' · ' + esc(p?.ad || '') : ''}</small></span>
      <span class="rv-satir-sag">${r.durum === 'onay' ? (r.fiyat ? `<b>${TL(r.fiyat)}</b>` : '') : durumRozet(r.durum)}</span></button>`;
  }).join('');
}
function satirBagla(el, L, bitti) { el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => randevuDetay(L.find((r) => r.id === b.dataset.r), bitti))); }
function bagKart(p) {
  const s = I(), link = paylasLink(`/randevu/${s.slug}${p && aktifPersonel().length > 1 ? '?usta=' + p.id : ''}`);
  return `<div class="kart-bas"><h2>${p && aktifPersonel().length > 1 ? 'Randevu bağlantınız' : 'Randevu bağlantısı'}</h2></div>
    <p class="kucuk-yazi" style="margin:-4px 0 10px">${p && aktifPersonel().length > 1 ? `Bu bağlantıyı açan müşteri doğrudan ${esc(C.ek(p.ad))} takvimine gelir.` : 'Müşterileriniz bu bağlantıdan randevu alır.'} Instagram profilinize ve WhatsApp durumunuza ekleyin.</p>
    <div class="rv-link"><code>${esc(link.replace(/^https?:\/\//, ''))}</code><button class="dg ikon-d kucuk" type="button" data-kopya="${esc(link)}" aria-label="Kopyala">${ikon('kopya', 'k')}</button></div>
    <div class="dg-grup" style="margin-top:10px"><a class="dg cizgili kucuk" href="${esc(waLink('', `${s.ad} randevu: ${link}`))}" target="_blank" rel="noopener">${ikon('whatsapp', 'k')}WhatsApp'ta paylaş</a><button class="dg cizgili kucuk" type="button" data-qr="${esc(link)}">${ikon('qr', 'k')}QR kodu</button></div>`;
}
function bagKartBagla(el) {
  el.querySelectorAll('[data-kopya]').forEach((b) => (b.onclick = () => kopyala(b.dataset.kopya, b.parentElement.querySelector('code'))));
  el.querySelectorAll('[data-qr]').forEach((b) => (b.onclick = () => qrGoster(b.dataset.qr)));
}
function qrGoster(link) {
  const svg = qrSvg(link, { renk: '#111111' });
  const c = cekmece({ baslik: 'QR kodu', govde: `<div class="rv-qr">${svg}<p class="kucuk-yazi">${esc(link.replace(/^https?:\/\//, ''))}</p></div>`, alt: `<button class="dg ana tam" type="button" data-i>${ikon('indir', 'k')}QR'ı indir (SVG)</button>` });
  c.el.querySelector('[data-i]').onclick = () => indir(`randevu-qr-${I().slug}.svg`, svg, 'image/svg+xml');
}

// ---------------------------------------------------------------- randevu ayrıntısı ve işlemler
async function eylemYap(r, eylem, bitti, ek = {}) {
  if (!r) return;
  if (eylem === 'reddet' && !(await onayla({ baslik: r.kapora ? 'Ödeme gelmedi mi?' : 'Randevu reddedilsin mi?', metin: `${esc(r.ad)} adına ${r.kapora ? TL(r.kapora) + ' ödeme görünmüyorsa randevu iptal edilir ve saat boşalır.' : 'gelen istek iptal edilir ve saat boşalır.'}`, evet: r.kapora ? 'Ödeme gelmedi, iptal et' : 'Reddet', tehlike: true }))) return false;
  if (eylem === 'iptal' && !(await onayla({ baslik: 'Randevu iptal edilsin mi?', metin: `${esc(r.ad)} · ${esc(C.gunAdi(r.tarih, sim().tarih))} ${saatAraligi(r)}${r.kapora ? '<br>Alınan ön ödemenin iadesini müşteriyle konuşun.' : ''}`, evet: 'İptal et', tehlike: true }))) return false;
  if (eylem === 'gelmedi' && !(await onayla({ baslik: 'Müşteri gelmedi mi?', metin: 'Randevu “gelmedi” olarak işaretlenir.', evet: 'Gelmedi' }))) return false;
  try {
    const y = await api.eylem(P.token, r.id, eylem, ek);
    P.v.bekleyen = P.v.bekleyen.filter((x) => x.id !== r.id || y.randevu.durum === 'kontrol');
    rozetGuncelle();
    const ad = { onayla: 'Randevu onaylandı', reddet: 'Randevu iptal edildi', iptal: 'Randevu iptal edildi', gelmedi: '“Gelmedi” olarak işaretlendi', geldi: 'Düzeltildi', tasi: 'Randevu taşındı', not: 'Not kaydedildi' }[eylem];
    const wa = r.tel && (eylem === 'onayla' || eylem === 'tasi' || eylem === 'iptal' || eylem === 'reddet') ? musteriMesaj(y.randevu, eylem) : '';
    bildir(ad, wa ? { eylem: () => window.open(waLink(r.tel, wa), '_blank', 'noopener'), eylemAd: 'Müşteriye yaz' } : {});
    bitti && bitti(y.randevu);
    return true;
  } catch (e) { bildir(e.message, { hata: true }); return false; }
}
function musteriMesaj(r, eylem) {
  const s = I(), p = pAl(r.p), g = `${C.tarihYaz(r.tarih, { yil: false, gun: true })} ${C.saatYaz(r.bas)}`;
  if (eylem === 'onayla') return `Merhaba ${r.ad}, ${s.ad} · ${p?.ad} ile ${g} randevunuz onaylandı. Görüşmek üzere.`;
  if (eylem === 'tasi') return `Merhaba ${r.ad}, ${s.ad} randevunuz ${g} olarak güncellendi.`;
  if (eylem === 'reddet') return `Merhaba ${r.ad}, ${s.ad} için ${g} randevu talebinizde ödemeniz bize ulaşmadığı için randevu iptal edildi. Ödeme yaptıysanız lütfen bize yazın.`;
  return `Merhaba ${r.ad}, ${s.ad} · ${g} randevunuz iptal edildi.`;
}
function randevuDetay(r, bitti) {
  if (!r) return;
  const s = sim(), p = pAl(r.p), basladi = C.trMs(r.tarih, r.bas) <= Date.now() + P.fark, gelecek = !basladi;
  const kaynak = { web: 'Web sitesinden', panel: 'Panelden eklendi', ornek: 'Örnek kayıt' }[r.kaynak] || '';
  const alt = [];
  if (r.durum === 'kontrol' || r.durum === 'odeme') alt.push(`<button class="dg sade" type="button" data-e="reddet">${r.kapora ? 'Ödeme gelmedi' : 'Reddet'}</button>`, `<button class="dg ana" type="button" data-e="onayla">${ikon('tik', 'k')}${r.kapora ? 'Ödeme geldi, onayla' : 'Onayla'}</button>`);
  else if (r.durum === 'onay' && gelecek) alt.push('<button class="dg sade tehlike-yazi" type="button" data-e="iptal">İptal et</button>', '<button class="dg cizgili" type="button" data-e="tasi">Taşı</button>');
  else if (r.durum === 'onay') alt.push('<button class="dg sade" type="button" data-e="gelmedi">Gelmedi</button>');
  else if (r.durum === 'gelmedi') alt.push('<button class="dg cizgili" type="button" data-e="geldi">Geldi olarak düzelt</button>');
  const c = cekmece({
    baslik: esc(r.ad),
    govde: `<div class="rv-detay-ust">${durumRozet(r.durum, false)}${kaynak ? `<span class="rozet">${kaynak}</span>` : ''}<span class="soluk mono">No ${randevuNo(r.id)}</span></div>
      <dl class="rv-dl">
        <div><dt>Gün</dt><dd>${esc(C.tarihYaz(r.tarih, { gun: true }))}${r.tarih === s.tarih ? ' · bugün' : ''}</dd></div>
        <div><dt>Saat</dt><dd>${saatAraligi(r)} <span class="soluk">(${C.sureYaz(r.bit - r.bas)})</span></dd></div>
        <div><dt>Hizmet</dt><dd>${esc(hizmetYazi(r.hizmetler))}</dd></div>
        ${ust() ? `<div><dt>Usta</dt><dd>${esc(p?.ad || '')}</dd></div>` : ''}
        <div><dt>Ücret</dt><dd>${r.fiyat ? TL(r.fiyat) : '—'}${r.kapora ? ` <span class="soluk">· ön ödeme ${TL(r.kapora)}${r.kapora < r.fiyat ? `, kalan ${TL(r.fiyat - r.kapora)}` : ''}</span>` : ''}</dd></div>
        ${r.tel ? `<div><dt>Telefon</dt><dd><a href="tel:${esc(r.tel)}">${esc(C.telYaz(r.tel))}</a></dd></div>` : ''}
        ${r.not ? `<div><dt>Müşteri notu</dt><dd>${esc(r.not)}</dd></div>` : ''}
        ${r.bildirim && r.kapora ? `<div><dt>Ödeme bildirimi</dt><dd>${esc(zamanOnce(r.bildirim))}</dd></div>` : ''}
        ${r.durum === 'odeme' ? `<div><dt>Durum</dt><dd>Müşteri henüz “Ödeme yaptım” demedi; ${esc(zamanOnce(r.olusturma))} saat ayırttı.</dd></div>` : ''}
        ${r.iptal ? `<div><dt>İptal</dt><dd>${esc({ musteri: 'Müşteri iptal etti', personel: 'Siz iptal ettiniz', sistem: 'Ödeme süresi doldu' }[r.iptal.kim] || '')}${r.iptal.neden && r.iptal.kim !== 'sistem' ? ': ' + esc(r.iptal.neden) : ''}</dd></div>` : ''}
      </dl>
      ${r.tel ? `<div class="dg-grup rv-detay-ilet"><a class="dg cizgili kucuk" href="tel:${esc(r.tel)}">${ikon('telefon', 'k')}Ara</a><a class="dg cizgili kucuk" href="${esc(waLink(r.tel, `Merhaba ${r.ad}, ${I().ad}'den yazıyorum.`))}" target="_blank" rel="noopener">${ikon('whatsapp', 'k')}WhatsApp</a></div>` : ''}
      <label class="alan" style="margin-top:14px"><span>Not (yalnız siz görürsünüz)</span><textarea class="girdi" rows="2" data-not maxlength="300" placeholder="Ör. düzenli müşteri, kısa kesim sever">${esc(r.pnot || '')}</textarea></label>`,
    alt: alt.join(''),
  });
  const notEl = c.el.querySelector('[data-not]');
  let notEski = r.pnot || '';
  const notKaydet = async () => { const yeni = notEl.value.trim(); if (yeni === notEski) return; notEski = yeni; try { await api.eylem(P.token, r.id, 'not', { not: yeni }); r.pnot = yeni; bildir('Not kaydedildi'); } catch (e) { bildir(e.message, { hata: true }); } };
  notEl.addEventListener('blur', notKaydet);
  c.el.querySelectorAll('[data-e]').forEach((b) => (b.onclick = async () => {
    const e = b.dataset.e;
    await notKaydet();
    if (e === 'tasi') { c.kapat(); return tasiSayfa(r, bitti); }
    if (await eylemYap(r, e, bitti)) c.kapat();
  }));
}

// ---------------------------------------------------------------- randevu ekle / taşı / saat kapat
function saatSecici(G, sure, secili, { tumSaatler = false } = {}) {
  const s = sim(), L = C.saatListesi({ calisma: G.c.length ? G.c : [[480, 1320]], dolu: C.doluAraliklar(G, Date.now() + P.fark, I().ayar.ara), sure, adim: 15, ara: I().ayar.ara, enErken: G.t === s.tarih ? s.dk : -1 });
  const B = L.filter((x) => x.bos || tumSaatler);
  return `<div class="rv-saatler kucuk">${B.map((x) => `<button type="button" class="rv-saat${x.dk === secili ? ' on' : ''}${x.bos ? '' : ' dolu'}" data-dk="${x.dk}"><b>${C.saatYaz(x.dk)}</b></button>`).join('') || '<p class="soluk" style="grid-column:1/-1">Bu gün için boş saat yok. Aşağıdan saati elle yazabilirsiniz.</p>'}</div>`;
}
function randevuEkleSayfa({ tarih, dk = null, p, bitti }) {
  const s = I(), st = { p: p || P.v.ben, tarih, dk, h: [], ozel: false };
  const c = cekmece({
    baslik: 'Randevu ekle', genis: true,
    govde: `<form id="eF" class="rv-form-dar">${ust() && aktifPersonel().length > 1 ? `<label class="alan"><span>Usta</span><select class="girdi" name="p">${aktifPersonel().map((x) => `<option value="${x.id}" ${x.id === st.p ? 'selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label>` : ''}
      <div class="alan"><span>Hizmet</span><div class="rv-hizmet-cip" id="eH"></div></div>
      <div class="izgara2"><label class="alan"><span>Süre</span><select class="girdi" name="sure">${C.SURELER.map((d) => `<option value="${d}">${C.sureYaz(d)}</option>`).join('')}</select></label><label class="alan"><span>Ücret (₺)</span><input class="girdi" name="fiyat" type="number" inputmode="numeric" min="0" step="10"></label></div>
      <label class="alan"><span>Gün</span><input class="girdi" name="tarih" type="date" value="${tarih}" required></label>
      <div class="alan"><span>Saat</span><div id="eS">${yukleniyor()}</div><input class="girdi" name="saat" type="time" step="300" style="margin-top:8px" aria-label="Saati elle yazın"></div>
      <label class="alan"><span>Müşteri adı</span><input class="girdi" name="ad" required maxlength="60" autocomplete="off" placeholder="Ad Soyad"></label>
      <label class="alan"><span>Telefon (isteğe bağlı)</span><input class="girdi" name="tel" type="tel" inputmode="tel" maxlength="20" placeholder="05xx xxx xx xx"></label>
      <label class="alan"><span>Not (isteğe bağlı)</span><input class="girdi" name="not" maxlength="300"></label><p class="hata-yazi" id="eHt"></p></form>`,
    alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="eF">Ekle</button>',
  });
  const f = c.el.querySelector('#eF');
  const hizmetCiz = () => {
    const pp = pAl(st.p), H = s.hizmetler.filter((h) => h.aktif !== false && (!pp.hizmetler?.length || pp.hizmetler.includes(h.id)));
    c.el.querySelector('#eH').innerHTML = H.map((h) => `<label class="cip"><input type="checkbox" value="${h.id}" ${st.h.includes(h.id) ? 'checked' : ''}>${esc(h.ad)} <small>${C.sureYaz(h.sure)}</small></label>`).join('') + `<label class="cip"><input type="checkbox" value="ozel" ${st.ozel ? 'checked' : ''}>Diğer</label>`;
    c.el.querySelectorAll('#eH input').forEach((i) => (i.onchange = () => {
      if (i.value === 'ozel') st.ozel = i.checked; else st.h = $$('#eH input:checked', c.el).map((x) => x.value).filter((x) => x !== 'ozel');
      const HS = st.h.map((id) => s.hizmetler.find((h) => h.id === id));
      if (HS.length) { f.sure.value = String(HS.reduce((n, h) => n + h.sure, 0)); if (!C.SURELER.includes(+f.sure.value)) f.sure.insertAdjacentHTML('beforeend', `<option value="${f.sure.value}" selected>${C.sureYaz(+f.sure.value)}</option>`); f.fiyat.value = HS.reduce((n, h) => n + h.fiyat, 0); }
      saatCiz();
    }));
  };
  let G = null;
  const saatCiz = async (yeni = false) => {
    const e = c.el.querySelector('#eS');
    if (yeni || !G || G.t !== f.tarih.value || G.p !== st.p) {
      e.innerHTML = yukleniyor();
      try { const v = await api.gun(P.token, st.p, f.tarih.value, 1); G = { ...v.gunler[st.p][0], p: st.p }; } catch (er) { e.innerHTML = `<p class="hata-yazi">${esc(er.message)}</p>`; return; }
    }
    e.innerHTML = (G.c.length ? `<p class="kucuk-yazi" style="margin:0 0 8px">Çalışma saatleri: ${esc(C.calismaYaz(G.c))} · yalnız boş saatler</p>` : `<p class="kucuk-yazi" style="margin:0 0 8px">${G.izin === 'izin' ? 'Bu gün izinlisiniz.' : 'Bu gün çalışma saati yok.'} Saati elle yazabilirsiniz.</p>`) + saatSecici(G, +f.sure.value || 30, st.dk);
    e.querySelectorAll('[data-dk]').forEach((b) => (b.onclick = () => { st.dk = +b.dataset.dk; f.saat.value = C.saatYaz(st.dk); e.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
  };
  if (dk != null) f.saat.value = C.saatYaz(dk);
  f.sure.value = '30';
  hizmetCiz(); saatCiz();
  f.p && (f.p.onchange = () => { st.p = f.p.value; st.h = []; hizmetCiz(); saatCiz(); });
  f.tarih.onchange = () => { st.dk = null; f.saat.value = ''; saatCiz(); };
  f.sure.onchange = () => saatCiz();
  f.saat.oninput = () => { st.dk = C.dkCoz(f.saat.value); c.el.querySelectorAll('#eS .on').forEach((x) => x.classList.remove('on')); };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const h = c.el.querySelector('#eHt'); h.textContent = '';
    if (!st.h.length && !st.ozel) { h.textContent = 'En az bir hizmet seçin ya da “Diğer”i işaretleyin.'; return; }
    if (!f.saat.value) { h.textContent = 'Saati seçin.'; return; }
    const govde = { p: st.p, hizmetler: st.h, hizmetAd: st.ozel && !st.h.length ? 'Randevu' : undefined, sure: +f.sure.value, fiyat: f.fiyat.value, tarih: f.tarih.value, saat: f.saat.value, ad: f.ad.value, tel: f.tel.value, not: f.not.value };
    const gonder = async (zorla) => { try { await api.randevuEkle(P.token, { ...govde, zorla }); bildir('Randevu eklendi'); c.kapat(); bitti && bitti(); } catch (er) { if (er.veri?.dolu && !zorla) { if (await onayla({ baslik: 'Bu saat dolu', metin: 'Bu saatte başka bir randevu ya da kapalı saat var. Yine de eklensin mi?', evet: 'Yine de ekle' })) gonder(true); return; } h.textContent = er.message; } };
    gonder(false);
  });
}
function tasiSayfa(r, bitti) {
  const st = { p: r.p, dk: null };
  const c = cekmece({
    baslik: 'Randevuyu taşı',
    govde: `<p class="soluk" style="margin:0 0 12px">${esc(r.ad)} · şu an ${esc(C.tarihYaz(r.tarih, { yil: false, gun: true }))} ${saatAraligi(r)}</p><form id="tF" class="rv-form-dar">
      ${ust() && aktifPersonel().length > 1 ? `<label class="alan"><span>Usta</span><select class="girdi" name="p">${aktifPersonel().map((x) => `<option value="${x.id}" ${x.id === r.p ? 'selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label>` : ''}
      <label class="alan"><span>Yeni gün</span><input class="girdi" name="tarih" type="date" value="${r.tarih}" required></label>
      <div class="alan"><span>Yeni saat</span><div id="tS">${yukleniyor()}</div></div><p class="hata-yazi" id="tH"></p></form>`,
    alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="tF">Taşı</button>',
  });
  const f = c.el.querySelector('#tF');
  const ciz = async () => {
    const e = c.el.querySelector('#tS'); e.innerHTML = yukleniyor();
    try {
      const v = await api.gun(P.token, st.p, f.tarih.value, 1), G = v.gunler[st.p][0];
      G.r = G.r.filter((x) => x.id !== r.id);
      e.innerHTML = saatSecici(G, r.bit - r.bas, st.dk);
      e.querySelectorAll('[data-dk]').forEach((b) => (b.onclick = () => { st.dk = +b.dataset.dk; e.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
    } catch (er) { e.innerHTML = `<p class="hata-yazi">${esc(er.message)}</p>`; }
  };
  ciz();
  f.tarih.onchange = () => { st.dk = null; ciz(); };
  f.p && (f.p.onchange = () => { st.p = f.p.value; st.dk = null; ciz(); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (st.dk == null) { c.el.querySelector('#tH').textContent = 'Yeni saati seçin.'; return; }
    if (await eylemYap(r, 'tasi', bitti, { p: st.p, tarih: f.tarih.value, saat: C.saatYaz(st.dk) })) c.kapat();
  });
}
function kapatSayfa({ tarih, bas = null, p, bitti }) {
  const c = cekmece({
    baslik: 'Saat kapat',
    govde: `<p class="soluk" style="margin:0 0 12px">Kapattığınız saatlerde müşteriler randevu alamaz; mevcut randevular etkilenmez. Bütün gün için Ayarlar'dan izin ekleyin.</p>
      <form id="kF" class="rv-form-dar">${ust() && aktifPersonel().length > 1 ? `<label class="alan"><span>Usta</span><select class="girdi" name="p">${aktifPersonel().map((x) => `<option value="${x.id}" ${x.id === p ? 'selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label>` : ''}
      <label class="alan"><span>Gün</span><input class="girdi" name="tarih" type="date" value="${tarih}" required></label>
      <div class="izgara2"><label class="alan"><span>Başlangıç</span><input class="girdi" name="bas" type="time" step="300" value="${bas != null ? C.saatYaz(bas) : ''}" required></label><label class="alan"><span>Bitiş</span><input class="girdi" name="bit" type="time" step="300" value="${bas != null ? C.saatYaz(Math.min(1440, bas + 60)) : ''}" required></label></div>
      <div class="cipler" style="margin-bottom:12px">${['Mola', 'Öğle arası', 'Özel iş', 'Doktor', 'Toplantı'].map((n) => `<button class="cip" type="button" data-n="${n}">${n}</button>`).join('')}</div>
      <label class="alan"><span>Açıklama (isteğe bağlı)</span><input class="girdi" name="neden" maxlength="60"></label><p class="hata-yazi" id="kH"></p></form>`,
    alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="kF">Saati kapat</button>',
  });
  const f = c.el.querySelector('#kF');
  c.el.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { f.neden.value = b.dataset.n; }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(C.dkCoz(f.bit.value) > C.dkCoz(f.bas.value))) { c.el.querySelector('#kH').textContent = 'Bitiş saati başlangıçtan sonra olmalı.'; return; }
    try { await api.kapat(P.token, { p: f.p ? f.p.value : p, tarih: f.tarih.value, bas: f.bas.value, bit: f.bit.value, neden: f.neden.value }); bildir('Saat kapatıldı'); c.kapat(); bitti && bitti(); } catch (er) { c.el.querySelector('#kH').textContent = er.message; }
  });
}

// ---------------------------------------------------------------- takvim
const PX = 1.5; // dakika başına piksel
async function takvim(el, tarihP) {
  const s = sim();
  P.tarih = C.tarihMi(tarihP) || P.tarih || s.tarih;
  const t = P.tarih, kap = kapsam(), hafta = C.gunEkle(t, -((C.haftaGunu(t) + 6) % 7));
  el.innerHTML = `<div class="rv-tk-bas"><button class="dg ikon-d" type="button" data-g="-1" aria-label="Önceki gün">${ikon('sol')}</button>
      <label class="rv-tk-tarih"><b>${esc(C.gunAdi(t, s.tarih))}</b><small>${esc(C.tarihYaz(t, { gun: C.gunFark(s.tarih, t) > 1 || C.gunFark(s.tarih, t) < -1 ? false : true }))}</small><input type="date" value="${t}" aria-label="Tarih seç"></label>
      <button class="dg ikon-d" type="button" data-g="1" aria-label="Sonraki gün">${ikon('sag')}</button><span class="bosluk"></span>
      ${t !== s.tarih ? '<button class="dg sade kucuk" type="button" data-bugun>Bugün</button>' : ''}<button class="dg ana kucuk" type="button" data-y="ekle">${ikon('arti', 'kk')}<span>Ekle</span></button></div>
    <div class="rv-hafta-serit">${Array.from({ length: 7 }, (_, i) => { const g = C.gunEkle(hafta, i); return `<button type="button" class="${g === t ? 'on' : ''}${g === s.tarih ? ' bugun' : ''}" data-t="${g}"><small>${C.GUN_KISA[C.haftaGunu(g)]}</small><b>${+g.slice(8)}</b></button>`; }).join('')}</div>
    ${ekipCipleri()}${bekleyenKart(true)}<div id="tG">${yukleniyor()}</div>`;
  ekipBagla(el, () => takvim(el, t));
  bekleyenBagla(el, () => takvim(el, t));
  el.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => git(yol('takvim/' + C.gunEkle(t, +b.dataset.g)), { degistir: true, kaydirma: false })));
  el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => git(yol('takvim/' + b.dataset.t), { degistir: true, kaydirma: false })));
  el.querySelector('[data-bugun]')?.addEventListener('click', () => git(yol('takvim/' + s.tarih), { degistir: true, kaydirma: false }));
  el.querySelector('.rv-tk-tarih input').onchange = (e) => e.target.value && git(yol('takvim/' + e.target.value), { degistir: true, kaydirma: false });
  el.querySelector('[data-y=ekle]').onclick = () => randevuEkleSayfa({ tarih: t, p: kap === '*' ? P.v.ben : kap, bitti: () => takvim(el, t) });
  let v;
  try { v = await api.gun(P.token, kap, t, 1); } catch (e) { $('#tG').innerHTML = hataKutu(e.message); $('#tG [data-tekrar]').onclick = () => takvim(el, t); return; }
  if (!$('#tG') || P.tarih !== t) return;
  const sutunlar = Object.entries(v.gunler).map(([pid, G]) => ({ p: pAl(pid), g: G[0] })).filter((x) => x.p && (x.p.aktif !== false || x.g.r.length));
  let bas = 1440, bit = 0;
  for (const { g } of sutunlar) { for (const [a, b] of g.c) { bas = Math.min(bas, a); bit = Math.max(bit, b); } for (const r of g.r) { bas = Math.min(bas, r.bas); bit = Math.max(bit, r.bit); } for (const k of g.k) { bas = Math.min(bas, k.bas); bit = Math.max(bit, k.bit); } }
  if (bit <= bas) { bas = 540; bit = 1260; }
  bas = Math.max(0, Math.floor(bas / 60) * 60 - 60); bit = Math.min(1440, Math.ceil(bit / 60) * 60 + 30);
  const H = (bit - bas) * PX, y = (dk) => (dk - bas) * PX;
  const saatler = []; for (let d = Math.ceil(bas / 60) * 60; d < bit; d += 60) saatler.push(d);
  const simdiCizgi = t === s.tarih && s.dk >= bas && s.dk <= bit ? `<div class="rv-zc-simdi" style="top:${y(s.dk)}px"></div>` : '';
  const iptalGoster = !!P.iptalGoster;
  const sutun = ({ p, g }) => `<div class="rv-zc" data-p="${p.id}">${sutunlar.length > 1 ? `<div class="rv-zc-bas">${avatar(p, 24)}<b>${esc(p.ad)}</b></div>` : ''}
    <div class="rv-zc-gov" style="height:${H}px" data-p="${p.id}">
      ${saatler.map((d) => `<i class="rv-zc-cizgi" style="top:${y(d)}px"></i>`).join('')}
      ${g.c.map(([a, b]) => `<i class="rv-zc-calisma" style="top:${y(a)}px;height:${(b - a) * PX}px"></i>`).join('')}
      ${!g.c.length ? `<div class="rv-zc-bos">${g.izin === 'izin' ? 'İzinli' : g.izin === 'kapali' ? 'İşletme kapalı' : 'Çalışmıyor'}</div>` : ''}
      ${g.k.map((k) => `<div class="rv-zc-kapali" style="top:${y(k.bas)}px;height:${Math.max(22, (k.bit - k.bas) * PX)}px"><span>${C.saatYaz(k.bas)}–${C.saatYaz(k.bit)} · ${esc(k.neden || 'Kapalı')}</span><button type="button" data-ks="${k.id}" data-kp="${p.id}" aria-label="Açmak için">${ikon('carpi', 'kk')}</button></div>`).join('')}
      ${g.r.filter((r) => iptalGoster || r.durum !== 'iptal').map((r) => `<button type="button" class="rv-blok d-${r.durum}${(r.bit - r.bas) * PX < 40 ? ' ince' : ''}" style="top:${y(r.bas)}px;height:${Math.max(24, (r.bit - r.bas) * PX - 2)}px" data-r="${r.id}"><b>${C.saatYaz(r.bas)} ${esc(r.ad)}</b><small>${esc(hizmetYazi(r.hizmetler))}${r.durum !== 'onay' ? ' · ' + esc(C.DURUM[r.durum].kisa) : ''}</small></button>`).join('')}
      ${simdiCizgi}</div></div>`;
  const toplam = sutunlar.reduce((n, x) => n + x.g.r.filter((r) => r.durum === 'onay' || r.durum === 'kontrol').length, 0);
  const iptaller = sutunlar.reduce((n, x) => n + x.g.r.filter((r) => r.durum === 'iptal').length, 0);
  $('#tG').innerHTML = `<div class="rv-tk-ozet"><span>${toplam} randevu${sutunlar.length === 1 && sutunlar[0].g.c.length ? ` · çalışma ${esc(C.calismaYaz(sutunlar[0].g.c))}` : ''}</span>${iptaller ? `<label class="rv-iptal-goster"><input type="checkbox" ${iptalGoster ? 'checked' : ''}> İptalleri göster (${iptaller})</label>` : ''}</div>
    <div class="rv-zaman${sutunlar.length > 1 ? ' cok' : ''}"><div class="rv-zaman-eksen" style="height:${H}px;${sutunlar.length > 1 ? 'margin-top:40px' : ''}">${saatler.map((d) => `<span style="top:${y(d)}px">${C.saatYaz(d)}</span>`).join('')}</div>
      <div class="rv-zaman-sutunlar">${sutunlar.map(sutun).join('')}</div></div>
    <p class="kucuk-yazi" style="margin-top:10px">Boş bir yere dokunarak o saate randevu ekleyebilir ya da saati kapatabilirsiniz.</p>`;
  const tumR = sutunlar.flatMap((x) => x.g.r.map((r) => ({ ...r, p: x.p.id })));
  $('#tG').querySelector('.rv-iptal-goster input')?.addEventListener('change', (e) => { P.iptalGoster = e.target.checked; takvim(el, t); });
  $('#tG').querySelectorAll('[data-r]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); randevuDetay(tumR.find((r) => r.id === b.dataset.r), () => takvim(el, t)); }));
  $('#tG').querySelectorAll('[data-ks]').forEach((b) => (b.onclick = async (e) => {
    e.stopPropagation();
    if (!(await onayla({ baslik: 'Kapalı saat açılsın mı?', evet: 'Saati aç' }))) return;
    try { await api.kapatSil(P.token, b.dataset.kp, t, b.dataset.ks); bildir('Saat açıldı'); takvim(el, t); } catch (er) { bildir(er.message, { hata: true }); }
  }));
  $('#tG').querySelectorAll('.rv-zc-gov').forEach((g) => (g.onclick = (e) => {
    if (e.target.closest('[data-r],[data-ks],.rv-zc-kapali')) return;
    const r = g.getBoundingClientRect(), dk = Math.round((bas + (e.clientY - r.top) / PX) / 15) * 15, pid = g.dataset.p;
    const c = cekmece({ baslik: `${C.saatYaz(dk)} · ${esc(pAl(pid).ad)}`, govde: `<div class="rv-secenekler"><button class="rv-secenek" type="button" data-s="ekle">${ikon('arti')}<span><b>Randevu ekle</b><small>Telefonla ya da yüz yüze gelen müşteri</small></span></button><button class="rv-secenek" type="button" data-s="kapat">${ikon('kilit')}<span><b>Saati kapat</b><small>Mola, özel iş: müşteriler bu saati alamaz</small></span></button></div>` });
    c.el.querySelector('[data-s=ekle]').onclick = () => { c.kapat(); randevuEkleSayfa({ tarih: t, dk, p: pid, bitti: () => takvim(el, t) }); };
    c.el.querySelector('[data-s=kapat]').onclick = () => { c.kapat(); kapatSayfa({ tarih: t, bas: dk, p: pid, bitti: () => takvim(el, t) }); };
  }));
  // ilk açılışta çalışma saatinin başına ya da şimdiye kaydır
  const kap2 = $('#tG .rv-zaman');
  if (kap2) { const calisan = sutunlar.some((x) => x.g.c.length), hedef = !calisan ? 0 : t === s.tarih ? y(Math.max(bas, s.dk - 60)) : y(Math.max(bas, (sutunlar.find((x) => x.g.c.length)?.g.c[0]?.[0] ?? bas) - 30)); kap2.scrollTop = 0; requestAnimationFrame(() => { const top = kap2.getBoundingClientRect().top + scrollY + hedef - 140; if (hedef > 200) scrollTo({ top, behavior: 'instant' }); }); }
}

// ---------------------------------------------------------------- müşteri arama
function musteriAra() {
  const c = cekmece({ baslik: 'Müşteri ara', genis: true, govde: `<input class="girdi" type="search" placeholder="Ad ya da telefon" id="mA" autocomplete="off"><div id="mS" style="margin-top:12px"><p class="soluk">En az 2 harf yazın. Son 90 gün ve önümüzdeki 60 gün aranır.</p></div>` });
  const i = c.el.querySelector('#mA'); let t = null;
  setTimeout(() => i.focus(), 50);
  i.oninput = () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const e = c.el.querySelector('#mS'); if (i.value.trim().length < 2) { e.innerHTML = '<p class="soluk">En az 2 harf yazın.</p>'; return; }
      e.innerHTML = yukleniyor();
      try {
        const v = await api.ara(P.token, i.value.trim(), ust() ? '*' : undefined);
        e.innerHTML = v.sonuc.length ? `<div class="rv-liste">${v.sonuc.map((r) => `<button class="rv-satir d-${r.durum}" type="button" data-r="${r.id}"><span class="rv-satir-saat"><b>${esc(C.tarihYaz(r.tarih, { yil: false, kisa: true }))}</b><small>${C.saatYaz(r.bas)}</small></span><span class="rv-satir-ana"><b>${esc(r.ad)}</b><small>${esc(hizmetYazi(r.hizmetler))}${r.tel ? ' · ' + esc(C.telYaz(r.tel)) : ''}</small></span><span class="rv-satir-sag">${durumRozet(r.durum)}</span></button>`).join('')}</div>` : '<p class="soluk">Sonuç yok.</p>';
        e.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => randevuDetay(v.sonuc.find((r) => r.id === b.dataset.r), () => i.oninput())));
      } catch (er) { e.innerHTML = `<p class="hata-yazi">${esc(er.message)}</p>`; }
    }, 300);
  };
}

// ---------------------------------------------------------------- haftalık çalışma saati düzenleyici
// Saat seçici: 15 dakikalık adımlar (telefonda tekerlek, masaüstünde liste); kayıtlı değer adım dışındaysa o da listede kalır
const saatSec = (dk, i, u) => {
  const L = [...new Set([...Array.from({ length: 97 }, (_, k) => k * 15).filter((x) => (u ? x > 0 : x < 1440)), dk])].sort((x, y) => x - y);
  return `<select data-i="${i}" data-u="${u}" aria-label="${u ? 'Bitiş saati' : 'Başlangıç saati'}">${L.map((x) => `<option value="${x}"${x === dk ? ' selected' : ''}>${C.saatYaz(x)}</option>`).join('')}</select>`;
};
export function haftaDuzenleyici(kap, cal, degisti = () => {}) {
  const c = C.calismaTemiz(cal || C.VARS_CALISMA);
  const ciz = () => {
    kap.innerHTML = `<div class="rv-hafta-duzen">${C.HAFTA.map((g) => { const L = c[g]; return `<div class="rv-hd-gun${L.length ? '' : ' kapali'}" data-g="${g}"><label class="anahtar"><input type="checkbox" ${L.length ? 'checked' : ''} data-ac><i></i></label><b>${C.GUNLER[g]}</b>
      <div class="rv-hd-araliklar">${L.length ? L.map(([a, b], i) => `<span class="rv-hd-aralik">${saatSec(a, i, 0)}<em>–</em>${saatSec(b, i, 1)}${L.length > 1 ? `<button type="button" class="dg ikon-d kucuk" data-sil="${i}" aria-label="Aralığı sil">${ikon('carpi', 'kk')}</button>` : ''}</span>`).join('') + (L.length < 3 ? '<button type="button" class="rv-hd-mola" data-mola>+ Mola</button>' : '') : '<span class="soluk">Kapalı</span>'}</div></div>`; }).join('')}
      <div class="rv-hd-kopya"><button type="button" class="dg sade kucuk" data-kopya>Pazartesiyi hafta içine kopyala</button></div></div>`;
    kap.querySelectorAll('[data-g]').forEach((row) => {
      const g = +row.dataset.g;
      row.querySelector('[data-ac]').onchange = (e) => { c[g] = e.target.checked ? [[540, 1260]] : []; ciz(); degisti(); };
      row.querySelectorAll('select[data-u]').forEach((i) => (i.onchange = () => { c[g][+i.dataset.i][+i.dataset.u] = +i.value; degisti(); }));
      row.querySelectorAll('[data-sil]').forEach((b) => (b.onclick = () => { c[g].splice(+b.dataset.sil, 1); ciz(); degisti(); }));
      row.querySelector('[data-mola]')?.addEventListener('click', () => {
        const L = c[g], son = L[L.length - 1];
        if (L.length === 1 && son[1] - son[0] >= 240) { const orta = Math.round((son[0] + son[1]) / 120) * 60; c[g] = [[son[0], orta], [orta + 60, son[1]]]; }
        else L.push([Math.min(1380, son[1] + 60), Math.min(1440, son[1] + 180)]);
        ciz(); degisti();
      });
    });
    kap.querySelector('[data-kopya]').onclick = () => { for (const g of [2, 3, 4, 5]) c[g] = c[1].map((r) => [...r]); ciz(); degisti(); };
  };
  ciz();
  return () => { for (const g of Object.keys(c)) for (const r of c[g]) if (!(r[1] > r[0])) throw new Error(`${C.GUNLER[g]}: bitiş saati başlangıçtan sonra olmalı.`); return C.calismaTemiz(c); };
}
function aralikListe(L, bos = 'Kayıt yok.') {
  return L.length ? `<ul class="rv-aralik-liste">${L.map((x, i) => `<li><span><b>${esc(C.tarihYaz(x.bas, { yil: false, gun: x.bas === x.bit }))}${x.bit !== x.bas ? ' – ' + esc(C.tarihYaz(x.bit, { yil: false })) : ''}</b>${x.neden ? `<small>${esc(x.neden)}</small>` : ''}</span><button type="button" class="dg ikon-d kucuk" data-asil="${i}" aria-label="Sil">${ikon('cop', 'kk')}</button></li>`).join('')}</ul>` : `<p class="soluk">${bos}</p>`;
}
function aralikEkle(baslik, bitti) {
  const s = sim();
  const c = cekmece({ baslik, govde: `<form id="aF" class="rv-form-dar"><div class="izgara2"><label class="alan"><span>Başlangıç</span><input class="girdi" type="date" name="bas" value="${s.tarih}" required></label><label class="alan"><span>Bitiş</span><input class="girdi" type="date" name="bit" value="${s.tarih}" required></label></div><label class="alan"><span>Açıklama (isteğe bağlı)</span><input class="girdi" name="neden" maxlength="60" placeholder="Ör. yıllık izin, bayram"></label><p class="hata-yazi" id="aH"></p></form>`, alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="aF">Ekle</button>' });
  const f = c.el.querySelector('#aF');
  f.bas.onchange = () => { if (f.bit.value < f.bas.value) f.bit.value = f.bas.value; };
  f.addEventListener('submit', (e) => { e.preventDefault(); if (f.bit.value < f.bas.value) { c.el.querySelector('#aH').textContent = 'Bitiş, başlangıçtan önce olamaz.'; return; } c.kapat(); bitti({ bas: f.bas.value, bit: f.bit.value, neden: f.neden.value.trim() }); });
}

// ---------------------------------------------------------------- ayarlar (kendi hesabı)
async function ayarlar(el) {
  const p = ben(), s = I();
  const H = s.hizmetler.filter((h) => h.aktif !== false);
  el.innerHTML = `<div class="bolum-bas"><h1>Ayarlar</h1></div>
    <div class="rv-ayarlar">
    <section class="kart"><div class="rv-profil-foto">${avatar(p, 56)}<span class="rv-profil-ad"><b>${esc(p.ad)}</b><small>${esc(p.unvan || C.personelAd(s.tur))}${p.isler?.length ? ` · ${p.isler.length} çalışma fotoğrafı` : ''}</small></span><span class="bosluk"></span><a class="dg cizgili kucuk" href="${href(yol('profil'))}" data-git="${yol('profil')}">Profili düzenle</a></div></section>

    <section class="kart"><div class="kart-bas"><h2>Ödeme bilgileri (IBAN)</h2></div>
      <p class="kucuk-yazi" style="margin:-4px 0 12px">Müşteri ön ödemeyi bu hesaba gönderir. Değiştirmek için şifreniz sorulur.</p>
      ${p.iban?.ornek ? `<div class="uyari-kutu" style="margin-bottom:12px">${ikon('uyari', 'k')}<span>Şu an örnek IBAN görünüyor. Gerçek IBAN'ınızı girin.</span></div>` : ''}
      ${P.v.admin ? `<p class="soluk">Yönetici oturumunda IBAN yönetim panelinden değiştirilir.</p>` : `<form id="ibF" class="rv-form-dar"><label class="alan"><span>Hesap sahibinin adı soyadı</span><input class="girdi" name="ad" value="${esc(p.iban?.ad || '')}" maxlength="60" autocomplete="name"></label>
      <label class="alan"><span>IBAN</span><input class="girdi mono" name="no" value="${esc(p.iban?.no ? C.ibanYaz(p.iban.no) : '')}" maxlength="40" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="TR00 0000 0000 0000 0000 0000 00"><small class="kucuk-yazi" id="ibB">${esc(p.iban?.banka || C.bankaAdi(p.iban?.no) || '')}</small></label>
      <label class="alan"><span>Banka</span><input class="girdi" name="banka" value="${esc(p.iban?.banka || '')}" maxlength="40" placeholder="IBAN'dan bulunur"></label>
      <button class="dg ana" type="submit">IBAN'ı kaydet</button></form>`}</section>

    <section class="kart"><div class="kart-bas"><h2>Çalışma saatlerim</h2></div>
      <div class="segment" id="cS" role="tablist"><button type="button" class="${p.calisma ? '' : 'on'}" data-c="0">İşletme saatleri</button><button type="button" class="${p.calisma ? 'on' : ''}" data-c="1">Kendi saatlerim</button></div>
      <div id="cD" style="margin-top:14px"></div><button class="dg ana" type="button" data-cal style="margin-top:12px">Saatleri kaydet</button></section>

    <section class="kart"><div class="kart-bas"><h2>İzin günlerim</h2><span class="bosluk"></span><button class="dg cizgili kucuk" type="button" data-izin>${ikon('arti', 'kk')}İzin ekle</button></div>
      <div id="iL">${aralikListe(p.izinler || [], 'Kayıtlı izin yok. İzinli olduğunuz günlerde müşteriler size randevu alamaz.')}</div></section>

    <section class="kart"><div class="kart-bas"><h2>Verdiğim hizmetler</h2></div>
      <label class="rv-satir-sec"><input type="checkbox" data-tum ${!p.hizmetler?.length ? 'checked' : ''}><span>Tüm hizmetler</span></label>
      <div id="hL" class="rv-hizmet-sec"${!p.hizmetler?.length ? ' hidden' : ''}>${H.map((h) => `<label class="rv-satir-sec"><input type="checkbox" value="${h.id}" ${p.hizmetler?.includes(h.id) ? 'checked' : ''}><span>${esc(h.ad)} <small class="soluk">${C.sureYaz(h.sure)} · ${h.fiyat ? TL(h.fiyat) : 'ücretsiz'}</small></span></label>`).join('')}</div>
      <button class="dg ana" type="button" data-hiz style="margin-top:12px">Kaydet</button></section>

    <section class="kart rv-bag-kart">${bagKart(aktifPersonel().length > 1 ? p : null)}</section>

    ${P.v.admin ? '' : `<section class="kart"><div class="kart-bas"><h2>Şifre</h2></div><form id="sfF" class="rv-form-dar"><input type="text" name="u" autocomplete="username" value="${esc(P.v.kullanici)}" hidden>
      <label class="alan"><span>Mevcut şifre</span><input class="girdi" name="eski" type="password" autocomplete="current-password" required></label>
      <label class="alan"><span>Yeni şifre (en az 6 karakter)</span><input class="girdi" name="yeni" type="password" autocomplete="new-password" minlength="6" required></label>
      <p class="hata-yazi" id="sfH"></p><button class="dg ana" type="submit">Şifreyi değiştir</button></form></section>`}
    <button class="dg sade tehlike-yazi" type="button" data-cikis style="justify-self:start">${ikon('cikis', 'k')}Çıkış yap</button></div>`;
  const kaydet = async (govde, mesaj = 'Kaydedildi') => {
    try { const v = await api.profil(P.token, govde); P.v.isletme = v.isletme; bildir(mesaj); return true; }
    catch (e) {
      if (e.veri?.sifre) { const s2 = await sifreSor(); if (s2 == null) return false; return kaydet({ ...govde, sifre: s2 }, mesaj); }
      bildir(e.message, { hata: true }); return false;
    }
  };
  const ib = el.querySelector('#ibF');
  if (ib) {
    ib.no.oninput = () => { const b = C.bankaAdi(ib.no.value); $('#ibB').textContent = C.ibanNorm(ib.no.value).length >= 26 ? (C.ibanGecerli(ib.no.value) ? (b || 'IBAN doğru görünüyor') : 'IBAN hatalı görünüyor, kontrol edin') : b; if (b && !ib.banka.value) ib.banka.value = b; };
    ib.addEventListener('submit', async (e) => { e.preventDefault(); if (ib.no.value && !C.ibanGecerli(ib.no.value) && !p.iban?.ornek) return bildir('IBAN hatalı görünüyor. TR ile başlayan 26 karakteri kontrol edin.', { hata: true }); if (await kaydet({ iban: { ad: ib.ad.value, no: ib.no.value, banka: ib.banka.value } }, 'IBAN kaydedildi')) ayarlar(el); });
  }
  let oku = null;
  const calCiz = (ozel) => { el.querySelectorAll('#cS button').forEach((b) => b.classList.toggle('on', b.dataset.c === (ozel ? '1' : '0'))); const d = $('#cD'); if (ozel) oku = haftaDuzenleyici(d, p.calisma || s.calisma); else { oku = null; d.innerHTML = `<ul class="rv-hafta-liste">${C.HAFTA.map((g) => `<li><span>${C.GUNLER[g]}</span><b>${esc(C.calismaYaz(s.calisma?.[g]))}</b></li>`).join('')}</ul>`; } };
  calCiz(!!p.calisma);
  el.querySelectorAll('#cS button').forEach((b) => (b.onclick = () => calCiz(b.dataset.c === '1')));
  el.querySelector('[data-cal]').onclick = async () => { let cal = null; try { cal = oku ? oku() : null; } catch (e) { return bildir(e.message, { hata: true }); } if (await kaydet({ calisma: cal }, 'Çalışma saatleri kaydedildi')) P.v.isletme.personel.find((x) => x.id === p.id); };
  const izinCiz = () => { const L = ben().izinler || []; $('#iL').innerHTML = aralikListe(L, 'Kayıtlı izin yok.'); $('#iL').querySelectorAll('[data-asil]').forEach((b) => (b.onclick = async () => { const y = L.filter((_, i) => i !== +b.dataset.asil); if (await kaydet({ izinler: y }, 'İzin silindi')) izinCiz(); })); };
  izinCiz();
  el.querySelector('[data-izin]').onclick = () => aralikEkle('İzin ekle', async (x) => { if (await kaydet({ izinler: [...(ben().izinler || []), x] }, 'İzin eklendi')) izinCiz(); });
  const tum = el.querySelector('[data-tum]');
  tum.onchange = () => { $('#hL').hidden = tum.checked; };
  el.querySelector('[data-hiz]').onclick = () => kaydet({ hizmetler: tum.checked ? [] : $$('#hL input:checked', el).map((i) => i.value) }, 'Hizmetler kaydedildi');
  bagKartBagla(el);
  el.querySelector('#sfF')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try { const v = await api.sifre(P.token, f.eski.value, f.yeni.value); yerel.koy(TK.personel, v.token); P.token = v.token; f.reset(); bildir('Şifre değişti'); } catch (er) { $('#sfH').textContent = er.message; }
  });
  el.querySelector('[data-cikis]').onclick = async () => { if (await onayla({ baslik: 'Çıkış yapılsın mı?', evet: 'Çıkış yap' })) cikis(); };
}
function kabukYenile(aktif, el) { const yeni = kabuk(aktif); ayarlar(yeni); }
function sifreSor() {
  return new Promise((ok) => {
    let sonuc = null;
    const c = cekmece({ baslik: 'Şifrenizi girin', govde: `<p class="soluk" style="margin:0 0 12px">Ödeme bilgileriniz güvenliğiniz için şifre ile değiştirilir.</p><form id="ssF"><input type="text" autocomplete="username" value="${esc(P.v.kullanici)}" hidden><label class="alan"><span>Şifre</span><input class="girdi" type="password" name="s" autocomplete="current-password" required></label></form>`, alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="ssF">Onayla</button>', onKapat: () => ok(sonuc) });
    c.el.querySelector('#ssF').addEventListener('submit', (e) => { e.preventDefault(); sonuc = e.target.s.value; c.kapat(); });
  });
}

// ---------------------------------------------------------------- işletme (yönetici usta)
// İşletme yöneticisi: hizmetler ve fiyatlar, ürünler, bilgiler, görünüm, saatler, kurallar. Değişiklikler taslakta
// birikir, alttaki çubuktan tek seferde kaydedilir (NFC Dünyası yönetimiyle aynı düzenleyiciler).
const ISL_SEKME = [['hizmetler', 'Hizmetler'], ['urunler', 'Ürünler'], ['bilgiler', 'Bilgiler'], ['gorunum', 'Görünüm'], ['saatler', 'Saatler'], ['kurallar', 'Kurallar'], ['ekip', 'Ekip'], ['qr', 'Bağlantı ve QR']];
let koruma = null;
function cikisUyari(e) { if (P?.kirli) { e.preventDefault(); e.returnValue = ''; } }
function korumaKaldir() { if (koruma) { document.removeEventListener('click', koruma, true); koruma = null; } removeEventListener('beforeunload', cikisUyari); document.body.classList.remove('rv-kaydet-var'); }
function islKirli() { P.kirli = true; const b = $('#kB'); if (b) b.hidden = false; document.body.classList.add('rv-kaydet-var'); }
const kaydetBar = () => `<div class="rv-kaydet-bar" id="kB" ${P.kirli ? '' : 'hidden'}><div class="rv-kaydet-ic"><span>Kaydedilmemiş değişiklikler var</span><button class="dg sade kucuk" type="button" data-vazgec>Vazgeç</button><button class="dg ana kucuk" type="button" data-kaydet>Kaydet</button></div></div>`;
/** Taslaklı sayfalar (İşletme, Profil): kaydet çubuğu ve kaydetmeden ayrılırken uyarı. onek ile başlayan bağlantılar serbest */
function korumaKur(el, onek, kaydet, vazgec) {
  korumaKaldir();
  document.body.classList.toggle('rv-kaydet-var', !!P.kirli);
  el.querySelector('[data-kaydet]').onclick = kaydet;
  el.querySelector('[data-vazgec]').onclick = () => { P.kirli = false; P.E = null; P.PE = null; vazgec(); };
  koruma = async (e) => {
    const a = e.target.closest('a[data-git]');
    if (!a || !P?.kirli || a.dataset.git.startsWith(onek)) return;
    e.preventDefault(); e.stopPropagation();
    if (await onayla({ baslik: 'Değişiklikler kaydedilmedi', metin: 'Kaydetmeden çıkarsanız yaptığınız değişiklikler kaybolur.', evet: 'Kaydetmeden çık', tehlike: true })) { P.kirli = false; P.E = null; P.PE = null; git(a.dataset.git); }
  };
  document.addEventListener('click', koruma, true);
  addEventListener('beforeunload', cikisUyari);
}
function isletmeAyar(el, sekme) {
  if (!P.E || !P.kirli) { P.E = JSON.parse(JSON.stringify(I())); P.kirli = false; P.PE = null; }
  if (!ISL_SEKME.some(([k]) => k === sekme)) sekme = 'hizmetler';
  const E = P.E;
  el.innerHTML = `<div class="bolum-bas"><div><p class="etiket">İşletme yöneticisi</p><h1>İşletme</h1></div><span class="bosluk"></span><a class="dg cizgili" href="${href('/randevu/' + E.slug)}" ${ONIZLEME ? `data-git="/randevu/${esc(E.slug)}"` : 'target="_blank" rel="noopener"'}>${ikon('baglanti', 'k')}<span>Sayfayı aç</span></a></div>
    <div class="sekmeler rv-sekmeler kaydir-x">${ISL_SEKME.map(([k, a]) => `<a href="${href(yol('isletme/' + k))}" data-isk="${k}" class="${sekme === k ? 'on' : ''}">${a}</a>`).join('')}</div>
    <div id="iS"></div>
    ${kaydetBar()}`;
  korumaKur(el, yol('isletme'), () => isletmeKaydet(el, sekme), () => isletmeAyar(el, sekme));
  el.querySelectorAll('[data-isk]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); git(yol('isletme/' + a.dataset.isk), { degistir: true, kaydirma: false }); }));
  el.querySelector('.rv-sekmeler .on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  const k = $('#iS');
  ({
    hizmetler: () => D.hizmetDuzenle(k, E, islKirli),
    urunler: () => D.urunDuzenle(k, E, islKirli),
    bilgiler: () => D.bilgiDuzenle(k, E, islKirli),
    gorunum: () => D.gorunumDuzenle(k, E, islKirli),
    saatler: () => saatlerSekme(k, E),
    kurallar: () => kurallarSekme(k, E),
    ekip: () => ekipSekme(k, E),
    qr: () => { k.innerHTML = `<div class="rv-ayarlar"><section class="kart rv-bag-kart">${bagKart(null)}</section></div>`; bagKartBagla(k); },
  })[sekme]();
}
// Profilim: fotoğraf, ad, unvan, telefon, hakkında, uzmanlıklar, çalışma fotoğrafları. İşletme yöneticisi /profil/<pid> ile başkasınınkini düzenler.
function profilSayfa(el, pid) {
  const kendi = !pid || pid === P.v.ben;
  if (!kendi && !ust()) return git(yol('profil'), { degistir: true });
  const id = kendi ? P.v.ben : pid, s = I(), kaynak = s.personel.find((x) => x.id === id);
  if (!kaynak) { el.innerHTML = hataKutu('Kişi bulunamadı.', false); return; }
  if (!P.PE || P.PE.id !== id || !P.kirli) { P.PE = JSON.parse(JSON.stringify(kaynak)); P.kirli = false; P.E = null; }
  const p = P.PE;
  el.innerHTML = `${kendi ? '' : `<a class="geri-bag" href="${href(yol('isletme/ekip'))}" data-git="${yol('isletme/ekip')}">${ikon('sol', 'kk')}Ekip</a>`}
    <div class="bolum-bas"><div><p class="etiket">${kendi ? esc(p.unvan || C.personelAd(s.tur)) : 'Ekip profili'}</p><h1>${kendi ? 'Profilim' : esc(kaynak.ad)}</h1></div><span class="bosluk"></span>
      <a class="dg cizgili" href="${href('/randevu/' + s.slug)}" ${ONIZLEME ? `data-git="/randevu/${esc(s.slug)}"` : 'target="_blank" rel="noopener"'}>${ikon('baglanti', 'k')}<span>Sayfada gör</span></a></div>
    <div class="rv-ayarlar"><div id="prK"></div><div id="prP" class="rv-ayarlar"></div></div>
    ${kaydetBar()}`;
  korumaKur(el, yol('profil'), () => profilKaydet(el, id, kendi), () => profilSayfa(el, kendi ? '' : id));
  D.kimlikDuzenle($('#prK'), p, islKirli);
  D.profilDuzenle($('#prP'), p, { tur: s.tur, hizmetler: s.hizmetler.filter((h) => h.aktif !== false && (!p.hizmetler?.length || p.hizmetler.includes(h.id))), degisti: islKirli });
}
async function profilKaydet(el, id, kendi) {
  const p = P.PE;
  if (!C.str(p.ad, 40)) return bildir('Görünen adı boş bırakmayın.', { hata: true });
  if (p.tel && !C.telNorm(p.tel)) return bildir('Telefon numarası geçersiz görünüyor. Ör. 0532 000 00 00', { hata: true, sure: 6000 });
  const govde = { p: id, ad: p.ad, unvan: p.unvan || '', tel: p.tel || '', foto: p.foto || '', hakkinda: p.hakkinda || '', deneyim: +p.deneyim || 0, uzmanlik: p.uzmanlik || [], isler: p.isler || [] };
  const boyut = JSON.stringify(govde).length;
  if (boyut > 4.5e6) return bildir(`Tek seferde çok fazla yeni fotoğraf var (${(boyut / 1e6).toFixed(1)} MB). Bir kısmını silip kaydedin, sonra kalanları ekleyin.`, { hata: true, sure: 9000 });
  const b = $('#kB [data-kaydet]'); if (b) { b.disabled = true; b.textContent = 'Kaydediliyor…'; }
  try {
    const v = await api.profil(P.token, govde);
    P.v.isletme = v.isletme; P.PE = null; P.kirli = false;
    bildir('Kaydedildi');
    profilSayfa(el, kendi ? '' : id);
  } catch (e) { bildir(e.message, { hata: true, sure: 7000 }); }
  finally { if (b?.isConnected) { b.disabled = false; b.textContent = 'Kaydet'; } }
}
async function isletmeKaydet(el, sekme, zorla = false) {
  const E = P.E, sorun = D.dogrula(E);
  if (sorun) return bildir(sorun, { hata: true, sure: 6000 });
  const b = $('#kB [data-kaydet]'); if (b) { b.disabled = true; b.textContent = 'Kaydediliyor…'; }
  try {
    const v = await api.isletmeDuzenle(P.token, {
      rev: E.rev, zorla, ad: E.ad, aciklama: E.aciklama, iletisim: E.iletisim, calisma: E.calisma, kapali: E.kapali || [],
      hizmetler: E.hizmetler, urunler: E.urunler || [], tema: E.tema, ayar: E.ayar,
    });
    P.v.isletme = v.isletme; P.E = null; P.kirli = false; temaUygula(v.isletme.tema);
    bildir('Kaydedildi');
    isletmeAyar(el, sekme);
  } catch (e) {
    if (e.veri?.rev && !zorla) {
      if (await onayla({ baslik: 'Bu sırada bilgiler değişti', metin: 'İşletme bilgileri başka bir ekrandan güncellendi (ör. NFC Dünyası yönetimi). Yine de kaydederseniz sizin ekranınızdaki hâli geçerli olur.', evet: 'Yine de kaydet', hayir: 'Vazgeç' })) return isletmeKaydet(el, sekme, true);
    } else bildir(e.message, { hata: true, sure: 7000 });
  } finally { if (b?.isConnected) { b.disabled = false; b.textContent = 'Kaydet'; } }
}
function saatlerSekme(k, E) {
  k.innerHTML = `<div class="rv-ayarlar">
    <section class="kart"><div class="kart-bas"><h2>Çalışma saatleri</h2></div><p class="kucuk-yazi" style="margin:-4px 0 10px">Kendi saatini seçmeyen ${esc(C.cogul(C.personelAd(E.tur)).toLocaleLowerCase('tr'))} bu saatlerle çalışır. Müşteri sayfasındaki “Açık / Kapalı” bilgisi de buradan gelir.</p><div id="isC"></div></section>
    <section class="kart"><div class="kart-bas"><h2>Kapalı günler</h2><span class="bosluk"></span><button class="dg cizgili kucuk" type="button" data-tatil>${ikon('arti', 'kk')}Ekle</button></div><div id="tL"></div></section></div>`;
  const oku = haftaDuzenleyici($('#isC'), E.calisma, () => { try { E.calisma = oku(); } catch { /* yazılırken */ } islKirli(); });
  const tatilCiz = () => {
    const L = E.kapali || [];
    $('#tL').innerHTML = aralikListe(L, 'Kapalı gün yok. Bayram ya da tatil günlerini buraya ekleyin.');
    $('#tL').querySelectorAll('[data-asil]').forEach((b) => (b.onclick = () => { E.kapali = L.filter((_, i) => i !== +b.dataset.asil); islKirli(); tatilCiz(); }));
  };
  tatilCiz();
  k.querySelector('[data-tatil]').onclick = () => aralikEkle('Kapalı gün ekle', (x) => { E.kapali = [...(E.kapali || []), x]; islKirli(); tatilCiz(); });
}
function kurallarSekme(k, E) {
  const a = E.ayar;
  const sec = (ad, ad2, L, f) => `<label class="alan"><span>${ad}</span><select class="girdi" data-a="${ad2}">${L.map((x) => `<option value="${x}" ${+a[ad2] === x ? 'selected' : ''}>${f(x)}</option>`).join('')}</select></label>`;
  k.innerHTML = `<div class="rv-ayarlar"><section class="kart"><div class="kart-bas"><h2>Randevu kuralları</h2></div><div class="rv-form-dar">
    <label class="alan"><span>Ön ödeme</span><select class="girdi" data-a="onOdeme">${C.ON_ODEME.map(([x, ad]) => `<option value="${x}" ${a.onOdeme === x ? 'selected' : ''}>${ad}</option>`).join('')}</select></label>
    <label class="alan" data-kap><span>Kapora tutarı (₺)</span><input class="girdi" data-a="kapora" type="number" inputmode="numeric" min="0" step="10" value="${a.kapora}"></label>
    <div class="izgara2">${sec('Ödeme süresi', 'odemeSure', [10, 15, 20, 30, 45, 60], (x) => `${x} dakika`)}${sec('Kaç gün ileriye', 'ileriGun', [7, 14, 21, 30, 45, 60, 90], (x) => `${x} gün`)}</div>
    <div class="izgara2">${sec('En az ne kadar önce', 'enAzOnce', [0, 15, 30, 60, 120, 180, 360, 720, 1440], (x) => (x ? C.sureYaz(x) + ' önce' : 'Sınır yok'))}${sec('Saat aralığı', 'adim', [10, 15, 20, 30, 45, 60], (x) => `${x} dakikada bir`)}</div>
    <div class="izgara2">${sec('Randevular arası boşluk', 'ara', [0, 5, 10, 15, 20, 30], (x) => (x ? `${x} dakika` : 'Yok'))}${sec('Müşteri iptali', 'iptalSaat', [0, 1, 2, 3, 6, 12, 24, 48], (x) => (x ? `${x} saat öncesine kadar` : 'Her zaman'))}</div>
    <p class="kucuk-yazi">Ön ödeme, boş yere alınıp gelinmeyen randevuları önler: müşteri ödemeyi ustanın IBAN'ına gönderip “Ödeme yaptım” der, usta onaylayınca randevu kesinleşir.</p></div></section></div>`;
  const kapG = () => { k.querySelector('[data-kap]').hidden = a.onOdeme !== 'kapora'; };
  kapG();
  k.querySelectorAll('[data-a]').forEach((g) => g.addEventListener(g.tagName === 'SELECT' ? 'change' : 'input', () => { const x = g.dataset.a; a[x] = x === 'onOdeme' ? g.value : +g.value; if (x === 'onOdeme') kapG(); islKirli(); }));
}
function ekipSekme(k, E) {
  k.innerHTML = `<div class="rv-ayarlar"><section class="kart"><div class="kart-bas"><h2>${esc(C.cogul(C.personelAd(E.tur)))}</h2></div>${E.personel.map((p) => `<div class="rv-ekip-satir">${avatar(p, 40)}<span><b>${esc(p.ad)}</b><small>${esc(p.unvan || '')}${p.yonetici ? ' · yönetici' : ''}${p.aktif === false ? ' · kapalı' : ''}</small></span><span class="dg-grup"><a class="dg cizgili kucuk" href="${href(yol('profil/' + p.id))}" data-git="${yol('profil/' + p.id)}">Profil</a><button class="dg sade kucuk" type="button" data-tk="${p.id}">Takvimi</button></span></div>`).join('')}
    <p class="kucuk-yazi" style="margin-top:10px">${esc(C.personelAd(E.tur))} eklemek, çıkarmak ya da giriş şifresi için NFC Dünyası ile görüşün. Herkes kendi IBAN'ını ve çalışma saatlerini kendi “Ayarlar” sayfasından, fotoğrafını ve çalışmalarını “Profilim”den düzenler; siz de “Profil” ile düzenleyebilirsiniz.</p></section></div>`;
  k.querySelectorAll('[data-tk]').forEach((b) => (b.onclick = () => { P.sec = b.dataset.tk; git(yol('takvim')); }));
}

// ---------------------------------------------------------------- istatistik
async function istatistik(el, ay) {
  const s = sim(); ay = ay || P.ay || s.tarih.slice(0, 7); P.ay = ay;
  const kap = kapsam();
  el.innerHTML = `<div class="bolum-bas"><h1>İstatistik</h1><span class="bosluk"></span><div class="ay-sec"><button class="dg ikon-d" type="button" data-a="-1" aria-label="Önceki ay">${ikon('sol')}</button><b>${esc(C.ayAdi(ay))}</b><button class="dg ikon-d" type="button" data-a="1" aria-label="Sonraki ay" ${ay >= s.tarih.slice(0, 7) ? 'disabled' : ''}>${ikon('sag')}</button></div></div>
    ${ekipCipleri()}<div id="iG">${yukleniyor()}</div>`;
  ekipBagla(el, () => istatistik(el, ay));
  el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => istatistik(el, C.ayEkle(ay, +b.dataset.a))));
  let v; try { v = await api.istat(P.token, kap, ay); } catch (e) { $('#iG').innerHTML = hataKutu(e.message); return; }
  if (!$('#iG')) return;
  const bar = (L, top) => (L.length ? `<div class="rv-barlar">${L.map(([a, n]) => `<div><span>${esc(a)}</span><i><b style="width:${top ? Math.max(2, (n / top) * 100) : 0}%"></b></i><em>${n}</em></div>`).join('')}</div>` : '<p class="soluk">Kayıt yok.</p>');
  const H = Object.entries(v.hizmetler).sort((a, b) => b[1] - a[1]), topH = H[0]?.[1] || 0;
  const G = C.HAFTA.map((g) => [C.GUNLER[g], v.gunler[g]]), topG = Math.max(...G.map((x) => x[1]), 0);
  const S = Object.entries(v.saatler).sort((a, b) => a[0] - b[0]).map(([h, n]) => [`${String(h).padStart(2, '0')}:00`, n]), topS = Math.max(...S.map((x) => x[1]), 0);
  const ekip = ust() && kap === '*' ? Object.entries(v.personel).map(([pid, x]) => ({ p: pAl(pid), ...x })).filter((x) => x.p).sort((a, b) => b.toplam - a.toplam) : [];
  $('#iG').innerHTML = `<div class="sayilar"><div class="sayi"><b>${v.toplam}</b><span>randevu${v.bekleyen ? ` · ${v.bekleyen} onay bekliyor` : ''}</span></div><div class="sayi"><b class="tl">${TL(v.ciro)}</b><span>onaylı randevuların tutarı</span></div>
      <div class="sayi"><b>${v.musteri}</b><span>farklı müşteri</span></div><div class="sayi"><b>${v.gelmedi}</b><span>gelmedi · ${v.iptal} iptal</span></div></div>
    <div class="ozet-izgara" style="margin-top:16px">
      ${ekip.length ? `<section class="kart"><div class="kart-bas"><h2>Ekip</h2></div>${ekip.map((x) => `<div class="rv-ekip-satir">${avatar(x.p, 36)}<span><b>${esc(x.p.ad)}</b><small>${x.toplam} randevu · ${x.gelmedi} gelmedi</small></span><b class="sayi-yazi">${TL(x.ciro)}</b></div>`).join('')}</section>` : ''}
      <section class="kart"><div class="kart-bas"><h2>Hizmetler</h2></div>${bar(H.slice(0, 8), topH)}</section>
      <section class="kart"><div class="kart-bas"><h2>Günler</h2></div>${bar(G, topG)}</section>
      <section class="kart"><div class="kart-bas"><h2>Saatler</h2></div>${bar(S, topS)}</section>
      <section class="kart"><div class="kart-bas"><h2>Randevu kaynağı</h2></div>${bar([['Web sitesi', v.web], ['Panelden eklenen', v.panel]], Math.max(v.web, v.panel))}<p class="kucuk-yazi" style="margin-top:10px">Web sitesinden gelen ön ödemeler: ${TL(v.onOdeme)}</p></section></div>`;
}
