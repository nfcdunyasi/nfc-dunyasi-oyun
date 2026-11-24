// Randevu Vaktim — NFC Dünyası yönetici paneli (yalnız sizin hesabınız: Okut ve Oyna ve Düğün Planla ile aynı giriş).
// İşletmeler, temalar, hizmetler, ustalar ve giriş hesapları, randevu kuralları, aylık ücret ve ödemeler, bağlantı ve QR.
import * as C from './cekirdek.js?v=2026-11-24-a';
import { api, yerel, TK } from './api.js?v=2026-11-24-a';
import {
  $, $$, esc, TL, sayiYaz, ikon, markaIkon, bildir, cekmece, onayla, kopyala, waLink, git, href, temaUygula, URUN_TEMA, avatar, logo, yukleniyor, hataKutu,
  metaRobots, paylasLink, qrSvg, indir, gorselSec, zamanOnce, durumRozet, saatAraligi, hizmetYazi, ONIZLEME,
} from './rui.js?v=2026-11-24-a';
import { haftaDuzenleyici } from './panel.js?v=2026-11-24-a';
import * as D from './duzen.js?v=2026-11-24-a';
import * as RP from './rapor.js?v=2026-11-24-a';

let Y = null; // { token, v, E (düzenlenen kopya), kirli }
let koruma = null;
export function temizle() { if (koruma) { document.removeEventListener('click', koruma, true); koruma = null; } removeEventListener('beforeunload', kapanisUyari); }
const KOK = () => $('#uygulama');
const tok = () => yerel.al(TK.yonetici);
const yolY = (p = '') => '/randevu/yonetim' + (p ? '/' + p : '');
const bugunTR = () => C.trBugun(Date.now() + (Y?.fark || 0));
function kapanisUyari(e) { if (Y?.kirli) { e.preventDefault(); e.returnValue = ''; } }

async function yukle() { const v = await api.yonetim(Y.token); Y.v = v; Y.fark = v.simdi.ms - Date.now(); }
export async function yonetim(parca) {
  metaRobots(true); temaUygula(URUN_TEMA);
  const t = tok();
  if (!t) return git('/randevu/giris', { degistir: true });
  if (!Y || Y.token !== t) Y = { token: t, v: null };
  const [a, b, c] = parca;
  // aynı işletmenin sekmeleri arasında gezerken veri yeniden çekilmez; başka sayfadan (ör. usta paneli) gelince tazelenir
  const ayni = a === 'isletme' && b === Y.acik && !!KOK().querySelector('.rv-yon');
  Y.acik = a === 'isletme' ? b : '';
  if (!Y.v || (!Y.kirli && !ayni)) {
    if (!Y.v) KOK().innerHTML = `<div class="giris-sayfa">${yukleniyor()}</div>`;
    try { await yukle(); } catch (e) {
      if (e.durum === 401) { yerel.sil(TK.yonetici); bildir('Oturumun süresi doldu, yeniden giriş yapın.', { hata: true }); return git('/randevu/giris', { degistir: true }); }
      KOK().innerHTML = `<div class="giris-sayfa"><div class="giris-kart">${hataKutu(e.message)}</div></div>`; KOK().querySelector('[data-tekrar]').onclick = () => yonetim(parca); return;
    }
  }
  document.title = 'Yönetim · Randevu Vaktim';
  if (a === 'isletmeler') return liste(kabuk('isletmeler'));
  if (a === 'odemeler') return odemeler(kabuk('odemeler'));
  if (a === 'kazanc') return RP.kazancSayfa(kabuk('kazanc'), Y, b, { yol: yolY });
  if (a === 'isletme' && b) return detay(kabuk('isletmeler'), b, c || 'genel');
  return ozet(kabuk(''));
}
function kabuk(aktif) {
  const N = [['', 'ozet', 'Özet'], ['isletmeler', 'salon', 'İşletmeler'], ['kazanc', 'istatistik', 'Kazançlar'], ['odemeler', 'para', 'Ödemeler']];
  KOK().innerHTML = `<div class="kabuk yon rv-yon"><header class="yon-ust"><div class="ic"><a class="marka" href="${href(yolY())}" data-git="${yolY()}">${markaIkon(28)}<span>Randevu Vaktim</span></a>
    <nav>${N.map(([k, , a]) => `<a href="${href(yolY(k))}" data-git="${yolY(k)}" class="${aktif === k ? 'on' : ''}">${a}</a>`).join('')}</nav><span class="bosluk"></span>
    ${ONIZLEME ? '' : `<a class="dg sade kucuk ana-panel" href="/panel/" title="NFC Dünyası yönetici paneli">${ikon('sol', 'kk')}<span>Ana panel</span></a>`}<button class="dg ikon-d" type="button" data-y="cikis" aria-label="Çıkış">${ikon('cikis')}</button></div></header>
    <main class="icerik" id="yI"></main><nav class="alt-menu">${N.map(([k, i, a]) => `<a href="${href(yolY(k))}" data-git="${yolY(k)}" class="${aktif === k ? 'on' : ''}">${ikon(i)}<span>${a}</span></a>`).join('')}</nav></div>`;
  KOK().querySelector('[data-y=cikis]').onclick = async () => { if (await onayla({ baslik: 'Çıkış yapılsın mı?', metin: 'Okut ve Oyna ve Düğün Planla yönetiminden de çıkılır.', evet: 'Çıkış yap' })) { yerel.sil(TK.yonetici); Y = null; git('/randevu/giris', { degistir: true }); } };
  return $('#yI');
}
const isletmeBul = (slug) => Y.v.isletmeler.find((s) => s.slug === slug);
const aboneDurum = (s, ay) => C.aboneAy(s, ay, bugunTR());

// ---------------------------------------------------------------- özet
function ozet(el) {
  const L = Y.v.isletmeler, bugun = bugunTR(), ay = bugun.slice(0, 7);
  const toplamBugun = L.reduce((n, s) => n + (Y.v.ozet[s.slug]?.bugun || 0), 0), bek = L.reduce((n, s) => n + (Y.v.ozet[s.slug]?.bekleyen || 0), 0);
  const R = L.map((s) => aboneDurum(s, ay)).filter(Boolean), hesap = R.reduce((n, r) => n + r.tutar, 0), alinan = R.reduce((n, r) => n + Math.min(r.odenen, r.tutar || r.odenen), 0);
  const geciken = L.flatMap((s) => Array.from({ length: 12 }, (_, i) => aboneDurum(s, C.ayEkle(ay, -i))).filter((r) => r?.durum === 'gecikti')).reduce((n, r) => n + r.kalan, 0);
  el.innerHTML = `<div class="bolum-bas"><div><p class="etiket">${esc(C.tarihYaz(bugun, { gun: true }))}</p><h1>Randevu Vaktim</h1></div><span class="bosluk"></span><button class="dg ana" type="button" data-yeni>${ikon('arti', 'k')}<span>Yeni işletme</span></button></div>
    <div class="sayilar"><a class="sayi" href="${href(yolY('isletmeler'))}" data-git="${yolY('isletmeler')}"><b>${L.length}</b><span>işletme · ${L.filter((s) => s.aktif !== false).length} açık</span></a>
      <div class="sayi"><b>${toplamBugun}</b><span>randevu bugün</span></div><div class="sayi"><b>${bek}</b><span>ödeme onayı bekliyor</span></div>
      <a class="sayi" href="${href(yolY('kazanc'))}" data-git="${yolY('kazanc')}" data-kz><b class="tl">…</b><span>${esc(C.ayAdi(ay, { yil: false }))} cirosu · işletme ve usta bazında</span></a>
      <a class="sayi" href="${href(yolY('odemeler'))}" data-git="${yolY('odemeler')}"><b class="tl">${TL(hesap)}</b><span>${esc(C.ayAdi(ay, { yil: false }))} ücretleri · ${TL(alinan)} alındı${geciken ? ` · <em class="kirmizi">${TL(geciken)} gecikti</em>` : ''}</span></a></div>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>İşletmeler</h2></div>
      ${L.length ? `<div class="rv-y-liste">${L.map((s) => isletmeSatir(s, ay)).join('')}</div>` : '<p class="soluk">Henüz işletme yok. “Yeni işletme” ile başlayın.</p>'}</section>`;
  el.querySelector('[data-yeni]').onclick = yeniIsletme;
  // bu ayın cirosu (gerçek işletmeler; yalnız örnek varsa onlar)
  api.kazanc(Y.token, ay).then((v) => {
    const g = v.isletmeler.filter((x) => !x.ornek), L2 = g.length ? g : v.isletmeler, b = el.querySelector('[data-kz] b');
    if (b) b.textContent = TL(L2.reduce((n, x) => n + x.ozet.ciro, 0));
  }).catch(() => { const b = el.querySelector('[data-kz] b'); if (b) b.textContent = '–'; });
}
function isletmeSatir(s, ay) {
  const o = Y.v.ozet[s.slug] || {}, r = aboneDurum(s, ay);
  return `<a class="rv-y-satir" href="${href(yolY('isletme/' + s.slug))}" data-git="${yolY('isletme/' + s.slug)}">${logo(s, 44, '', true)}<span class="rv-y-ana"><b>${esc(s.ad)}${s.aktif === false ? ' <em class="rozet hata">kapalı</em>' : ''}</b><small>${esc(C.turAd(s.tur))} · ${s.personel.filter((p) => p.aktif !== false).length} personel · ${esc(C.aboneYazi(s, TL))}</small></span>
    <span class="rv-y-sag"><b>${o.bugun || 0}</b><small>bugün${o.bekleyen ? ` · <em class="uyari-yazi">${o.bekleyen} onay</em>` : ''}</small>${r && r.tutar ? `<small class="${r.durum}">${r.durum === 'odendi' ? 'ödendi' : r.durum === 'gecikti' ? 'ücret gecikti' : 'ücret bekliyor'}</small>` : ''}</span></a>`;
}

// ---------------------------------------------------------------- işletme listesi ve yeni işletme
function liste(el) {
  const ay = bugunTR().slice(0, 7);
  el.innerHTML = `<div class="bolum-bas"><h1>İşletmeler</h1><span class="bosluk"></span><button class="dg ana" type="button" data-yeni>${ikon('arti', 'k')}<span>Yeni işletme</span></button></div>
    ${Y.v.isletmeler.length ? `<div class="kart"><div class="rv-y-liste">${Y.v.isletmeler.map((s) => isletmeSatir(s, ay)).join('')}</div></div>` : '<div class="kart bos">Henüz işletme yok.</div>'}`;
  el.querySelector('[data-yeni]').onclick = yeniIsletme;
}
function yeniIsletme() {
  const c = cekmece({
    baslik: 'Yeni işletme',
    govde: `<form id="nF" class="rv-form-dar"><label class="alan"><span>İşletmenin adı</span><input class="girdi" name="ad" required maxlength="80" placeholder="Ör. Yıldız Kuaför"></label>
      <label class="alan"><span>Tür</span><select class="girdi" name="tur">${C.TURLER.map(([k, a]) => `<option value="${k}">${a}</option>`).join('')}</select></label>
      <label class="alan"><span>Sayfa adresi</span><div class="rv-adres-girdi"><span>nfcdunyasi.com/randevu/</span><input class="girdi" name="slug" required maxlength="50" pattern="[a-z0-9][a-z0-9\\-]{1,48}[a-z0-9]" autocapitalize="none" spellcheck="false"></div><small class="kucuk-yazi">Sonradan değiştirilemez; QR kodlarına basılır.</small></label>
      <label class="rv-satir-sec"><input type="checkbox" name="sablon" checked><span>Bu tür için örnek hizmetleri ekle (fiyatları sonra düzenlersiniz)</span></label><p class="hata-yazi" id="nH"></p></form>`,
    alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="nF">Oluştur</button>',
  });
  const f = c.el.querySelector('#nF');
  let elle = false;
  f.ad.oninput = () => { if (!elle) f.slug.value = C.slugYap(f.ad.value); };
  f.slug.oninput = () => { elle = true; f.slug.value = f.slug.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const slug = f.slug.value.trim(), tur = f.tur.value, h = c.el.querySelector('#nH');
    if (!C.SLUG_RE.test(slug) || C.AYRILMIS.has(slug)) { h.textContent = 'Adres geçersiz: küçük harf, rakam ve tire kullanın (en az 3 karakter).'; return; }
    try {
      await api.isletmeYaz(Y.token, slug, {
        yeni: true, ad: f.ad.value, tur, tema: C.HAZIR_TEMA[tur], calisma: C.VARS_CALISMA, ayar: C.AYAR_VARS, personel: [],
        hizmetler: f.sablon.checked ? (C.HIZMET_SABLON[tur] || []).map(([ad, sure, fiyat, kategori]) => ({ ad, sure, fiyat, kategori: kategori || '', aktif: true })) : [],
        odeme: { tutar: 0, personelBasi: 0, gun: 1, baslangic: bugunTR(), periyot: 'aylik' },
      });
      c.kapat(); bildir('İşletme oluşturuldu'); await yukle(); git(yolY(`isletme/${slug}/personel`));
    } catch (er) { h.textContent = er.message; }
  });
}

// ---------------------------------------------------------------- işletme ayrıntısı
const SEKMELER = [['genel', 'Genel'], ['istatistik', 'İstatistik'], ['hizmetler', 'Hizmetler'], ['urunler', 'Ürünler'], ['gorunum', 'Görünüm'], ['personel', 'Ustalar'], ['kurallar', 'Kurallar'], ['ucret', 'Ücret'], ['baglanti', 'Bağlantı ve QR']];
function detay(el, slug, sekme) {
  const s0 = isletmeBul(slug);
  if (!s0) { el.innerHTML = `<div class="kart bos">İşletme bulunamadı. <a href="${href(yolY('isletmeler'))}" data-git="${yolY('isletmeler')}">İşletmeler</a></div>`; return; }
  if (!Y.E || Y.E.slug !== slug || !Y.kirli) { Y.E = JSON.parse(JSON.stringify(s0)); Y.kirli = false; }
  if (!SEKMELER.some((x) => x[0] === sekme)) sekme = 'genel';
  const E = Y.E, o = Y.v.ozet[slug] || {};
  el.innerHTML = `<a class="geri-bag" href="${href(yolY('isletmeler'))}" data-git="${yolY('isletmeler')}">${ikon('sol', 'kk')}İşletmeler</a>
    <div class="rv-y-bas">${logo(E, 56, '', true)}<div><h1>${esc(E.ad)}</h1><p class="soluk">${esc(C.turAd(E.tur))} · ${o.bugun || 0} randevu bugün${o.bekleyen ? ` · ${o.bekleyen} ödeme onayı bekliyor` : ''}</p></div>
      <div class="dg-grup"><a class="dg cizgili" href="${href('/randevu/' + slug)}" ${ONIZLEME ? `data-git="/randevu/${esc(slug)}"` : 'target="_blank" rel="noopener"'}>${ikon('baglanti', 'k')}<span>Sayfayı aç</span></a><button class="dg ana" type="button" data-panel>${ikon('takvim', 'k')}<span>Takvim ve panel</span></button></div></div>
    <div class="sekmeler rv-sekmeler kaydir-x">${SEKMELER.map(([k, a]) => `<a href="${href(yolY(`isletme/${slug}/${k}`))}" data-sk="${k}" class="${sekme === k ? 'on' : ''}">${k === 'personel' ? esc(C.cogul(C.personelAd(E.tur))) : a}</a>`).join('')}</div>
    <div id="dS"></div><div class="rv-kaydet-bar" id="kB" hidden><div class="rv-kaydet-ic"><span>Kaydedilmemiş değişiklikler var</span><button class="dg sade kucuk" type="button" data-vazgec>Vazgeç</button><button class="dg ana kucuk" type="button" data-kaydet>Kaydet</button></div></div>`;
  el.querySelectorAll('[data-sk]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); git(yolY(`isletme/${slug}/${a.dataset.sk}`), { degistir: true, kaydirma: false }); }));
  el.querySelector('[data-panel]').onclick = () => panelAc(slug, E.personel.find((p) => p.yonetici)?.id || E.personel[0]?.id);
  el.querySelector('[data-kaydet]').onclick = () => kaydet(slug);
  el.querySelector('[data-vazgec]').onclick = () => { Y.kirli = false; Y.E = null; detay(el, slug, sekme); };
  temizle();
  koruma = async (e) => {
    const a = e.target.closest('a[data-git]'); if (!a || !Y?.kirli || a.dataset.git.startsWith(yolY('isletme/' + slug))) return;
    e.preventDefault(); e.stopPropagation();
    if (await onayla({ baslik: 'Değişiklikler kaydedilmedi', metin: 'Kaydetmeden çıkarsanız yaptığınız değişiklikler kaybolur.', evet: 'Kaydetmeden çık', tehlike: true })) { Y.kirli = false; Y.E = null; git(a.dataset.git); }
  };
  document.addEventListener('click', koruma, true);
  addEventListener('beforeunload', kapanisUyari);
  kirliGoster();
  ({ genel: sGenel, istatistik: (k, x) => { const ac = (ay) => { Y.istAy = ay; RP.isletmeIstat(k, x, Y, ay, ac); }; ac(Y.istAy); }, gorunum: (k, x) => D.gorunumDuzenle(k, x, kirli), hizmetler: (k, x) => D.hizmetDuzenle(k, x, kirli), urunler: (k, x) => D.urunDuzenle(k, x, kirli), personel: sPersonel, kurallar: sKurallar, ucret: sUcret, baglanti: sBaglanti })[sekme]($('#dS'), E);
}
function kirli() { Y.kirli = true; kirliGoster(); }
function kirliGoster() { const b = $('#kB'); if (b) { b.hidden = !Y.kirli; document.body.classList.toggle('rv-kaydet-var', !!Y.kirli); } }
async function kaydet(slug, { zorla = false, sessiz = false } = {}) {
  const sorun = D.dogrula(Y.E);
  if (sorun) { bildir(sorun, { hata: true, sure: 6000 }); return false; }
  const b = $('#kB [data-kaydet]'); if (b) { b.disabled = true; b.textContent = 'Kaydediliyor…'; }
  try {
    const v = await api.isletmeYaz(Y.token, slug, { ...Y.E, zorla });
    const i = Y.v.isletmeler.findIndex((s) => s.slug === slug); Y.v.isletmeler[i] = v.isletme;
    Y.E = JSON.parse(JSON.stringify(v.isletme)); Y.kirli = false; kirliGoster();
    if (!sessiz) bildir('Kaydedildi');
    const sk = $('.rv-sekmeler .on')?.dataset.sk || 'genel'; detay($('#yI'), slug, sk);
    return true;
  } catch (e) {
    if (e.veri?.rev && !zorla) {
      if (await onayla({ baslik: 'Bu işletme siz düzenlerken değişti', metin: 'Bir usta ya da işletme yöneticisi bilgileri güncellemiş olabilir (ör. çalışma saatleri, IBAN). Yine de kaydederseniz sizin ekranınızdaki hâli geçerli olur.', evet: 'Yine de kaydet', hayir: 'Vazgeç' })) return kaydet(slug, { zorla: true, sessiz });
    } else bildir(e.message, { hata: true, sure: 7000 });
    return false;
  } finally { if (b?.isConnected) { b.disabled = false; b.textContent = 'Kaydet'; } }
}
async function panelAc(slug, pid) {
  if (Y.kirli && !(await kaydet(slug, { sessiz: true }))) return;
  try { const v = await api.oturum(Y.token, slug, pid); yerel.koy(TK.personel, v.token); git('/randevu/panel'); } catch (e) { bildir(e.message, { hata: true }); }
}
const alan = (ad, ic, ek = '') => `<label class="alan"><span>${ad}</span>${ic}${ek}</label>`;
const bagla = (kap, f) => kap.querySelectorAll('[data-e]').forEach((i) => i.addEventListener(i.type === 'checkbox' || i.tagName === 'SELECT' ? 'change' : 'input', () => { f(i); kirli(); }));

// ---- genel
function sGenel(el, E) {
  el.innerHTML = `<div class="rv-ayarlar"><section class="kart"><div class="kart-bas"><h2>Yayın</h2></div>
    <div class="rv-form-dar">${alan('Ad', `<input class="girdi" data-e="ad" value="${esc(E.ad)}" maxlength="80">`)}
    ${alan('Tür', `<select class="girdi" data-e="tur">${C.TURLER.map(([k, a]) => `<option value="${k}" ${E.tur === k ? 'selected' : ''}>${a}</option>`).join('')}</select>`, `<small class="kucuk-yazi">İşletme listesindeki kategori ve müşteri ekranındaki “${esc(C.personelAd(E.tur))} seçin” sözcüğü türe göre değişir.</small>`)}
    <label class="rv-satir-sec"><input type="checkbox" data-e="aktif" ${E.aktif !== false ? 'checked' : ''}><span>Randevu sayfası açık</span></label>
    <label class="rv-satir-sec"><input type="checkbox" data-e="liste" ${E.liste !== false ? 'checked' : ''}><span>İşletme listesinde göster (nfcdunyasi.com/randevu)</span></label>
    <label class="rv-satir-sec"><input type="checkbox" data-e="one" ${E.one ? 'checked' : ''}><span>Öne çıkar: listede üstte, “Öne çıkan” etiketiyle</span></label>
    <p class="kucuk-yazi">Sayfa adresi: <b>nfcdunyasi.com/randevu/${esc(E.slug)}</b>. Listede gösterilmeyen işletmeye yalnız bu adresle ve QR kodla ulaşılır.</p></div></section>
    <div class="rv-ayarlar" id="gB"></div>
    <section class="kart"><div class="kart-bas"><h2>Çalışma saatleri</h2></div><p class="kucuk-yazi" style="margin:-4px 0 10px">Kendi saatini seçmeyen ustalar bu saatlerle çalışır.</p><div id="gC"></div></section>
    <section class="kart"><div class="kart-bas"><h2>Kapalı günler</h2><span class="bosluk"></span><button class="dg cizgili kucuk" type="button" data-tatil>${ikon('arti', 'kk')}Ekle</button></div><div id="gT"></div></section>
    <section class="kart"><div class="kart-bas"><h2>Notlar</h2></div>${alan('Yalnız siz görürsünüz', `<textarea class="girdi" data-e="notlar" rows="3" maxlength="4000" placeholder="Ör. sözleşme, yetkili kişi, özel fiyat">${esc(E.notlar || '')}</textarea>`)}</section>
    <section class="kart rv-tehlike"><div class="kart-bas"><h2>İşletmeyi sil</h2></div><p class="kucuk-yazi">İşletme, tüm randevuları, ustaların giriş hesapları ve görselleri kalıcı olarak silinir. Geçici olarak kapatmak için yukarıdaki “Randevu sayfası açık” işaretini kaldırın.</p><button class="dg tehlike" type="button" data-sil>${ikon('cop', 'k')}Sil</button></section></div>`;
  bagla(el, (i) => { E[i.dataset.e] = i.type === 'checkbox' ? i.checked : i.value; });
  D.bilgiDuzenle($('#gB'), E, kirli, { ad: false });
  const oku = haftaDuzenleyici($('#gC'), E.calisma, () => { try { E.calisma = oku(); } catch { /* yazılırken */ } kirli(); });
  const tatil = () => {
    const L = E.kapali || [];
    $('#gT').innerHTML = L.length ? `<ul class="rv-aralik-liste">${L.map((x, i) => `<li><span><b>${esc(C.tarihYaz(x.bas, { yil: false }))}${x.bit !== x.bas ? ' – ' + esc(C.tarihYaz(x.bit, { yil: false })) : ''}</b>${x.neden ? `<small>${esc(x.neden)}</small>` : ''}</span><button type="button" class="dg ikon-d kucuk" data-tsil="${i}" aria-label="Sil">${ikon('cop', 'kk')}</button></li>`).join('')}</ul>` : '<p class="soluk">Kapalı gün yok.</p>';
    $('#gT').querySelectorAll('[data-tsil]').forEach((b) => (b.onclick = () => { E.kapali.splice(+b.dataset.tsil, 1); kirli(); tatil(); }));
  };
  tatil();
  el.querySelector('[data-tatil]').onclick = () => {
    const c = cekmece({ baslik: 'Kapalı gün ekle', govde: `<form id="tF" class="rv-form-dar"><div class="izgara2">${alan('Başlangıç', `<input class="girdi" type="date" name="bas" value="${bugunTR()}" required>`)}${alan('Bitiş', `<input class="girdi" type="date" name="bit" value="${bugunTR()}" required>`)}</div>${alan('Açıklama', '<input class="girdi" name="neden" maxlength="60" placeholder="Ör. Kurban Bayramı">')}</form>`, alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="tF">Ekle</button>' });
    const f = c.el.querySelector('#tF');
    f.addEventListener('submit', (e) => { e.preventDefault(); if (f.bit.value < f.bas.value) return bildir('Bitiş, başlangıçtan önce olamaz.', { hata: true }); E.kapali = [...(E.kapali || []), { bas: f.bas.value, bit: f.bit.value, neden: f.neden.value }]; kirli(); tatil(); c.kapat(); });
  };
  el.querySelector('[data-sil]').onclick = async () => {
    if (!(await onayla({ baslik: `${esc(E.ad)} silinsin mi?`, metin: 'Bu işlem geri alınamaz. Tüm randevular ve giriş hesapları silinir.', evet: 'Kalıcı olarak sil', tehlike: true }))) return;
    try { await api.isletmeSil(Y.token, E.slug); Y.kirli = false; Y.E = null; bildir('İşletme silindi'); await yukle(); git(yolY('isletmeler'), { degistir: true }); } catch (e) { bildir(e.message, { hata: true }); }
  };
}

// ---- ustalar
function sPersonel(el, E) {
  const h = E.hesaplar || {};
  el.innerHTML = `<section class="kart"><div class="kart-bas"><h2>${esc(C.cogul(C.personelAd(E.tur)))}</h2><span class="bosluk"></span><button class="dg ana kucuk" type="button" data-ekle>${ikon('arti', 'kk')}Ekle</button></div>
    ${E.personel.length ? E.personel.map((p, i) => { const hs = h[p.id]; return `<div class="rv-per" data-i="${i}">${avatar(p, 48)}<span class="rv-per-ana"><b>${esc(p.ad)}${p.yonetici ? ' <em class="rozet">yönetici</em>' : ''}${p.aktif === false ? ' <em class="rozet hata">kapalı</em>' : ''}</b>
      <small>${esc(p.unvan || '')}${p.calisma ? ' · kendi saatleri' : ''}${p.hizmetler?.length ? ` · ${p.hizmetler.length} hizmet` : ''}${p.isler?.length ? ` · ${p.isler.length} çalışma` : ''}${p.uzmanlik?.length ? ` · ${p.uzmanlik.length} uzmanlık` : ''}</small>
      <small>${p.iban?.no ? (p.iban.ornek ? '<span class="uyari-yazi">Örnek IBAN</span>' : `IBAN ${esc(C.ibanYaz(p.iban.no).slice(-9))}`) : '<span class="uyari-yazi">IBAN yok · ön ödemesiz çalışır</span>'} · ${hs ? `giriş: <b>${esc(hs.kullanici)}</b>` : p.id && Y.v.isletmeler.find((s) => s.slug === E.slug)?.personel.some((z) => z.id === p.id) ? '<span class="uyari-yazi">giriş yok</span>' : 'kaydedince giriş açılır'}</small></span>
      <span class="dg-grup"><button class="dg cizgili kucuk" type="button" data-duz="${i}">Düzenle</button><button class="dg cizgili kucuk" type="button" data-prof="${i}">Profil</button>${hs || p.id ? `<button class="dg sade kucuk" type="button" data-giris="${i}">${ikon('kilit', 'kk')}Giriş</button>` : ''}</span></div>`; }).join('') : `<p class="soluk">Henüz ${esc(C.personelAd(E.tur).toLocaleLowerCase('tr'))} yok. “Ekle” ile ekleyin; her birine ayrı kullanıcı adı ve şifre verirsiniz.</p>`}
    <p class="kucuk-yazi" style="margin-top:12px">Giriş adresi: <b>nfcdunyasi.com/randevu/giris</b>. “Yönetici” yetkisi verilen usta tüm ekibin takvimini görür ve işletme bilgilerini, hizmetleri ve kuralları düzenler.</p></section>`;
  el.querySelector('[data-ekle]').onclick = () => personelDuzenle(E, null, () => sPersonel(el, E));
  el.querySelectorAll('[data-duz]').forEach((b) => (b.onclick = () => personelDuzenle(E, +b.dataset.duz, () => sPersonel(el, E))));
  el.querySelectorAll('[data-giris]').forEach((b) => (b.onclick = () => girisYonet(E, E.personel[+b.dataset.giris], () => sPersonel(el, E))));
  el.querySelectorAll('[data-prof]').forEach((b) => (b.onclick = () => {
    const p = E.personel[+b.dataset.prof];
    const c = cekmece({ baslik: `${esc(p.ad)} · profil`, genis: true, govde: '<div class="rv-ayarlar" id="yPr"></div>', alt: '<span class="kucuk-yazi">Değişiklikler alttaki “Kaydet” ile kaydedilir.</span><span class="bosluk"></span><button class="dg ana" type="button" data-kapat>Tamam</button>', onKapat: () => sPersonel(el, E) });
    D.profilDuzenle(c.el.querySelector('#yPr'), p, { tur: E.tur, hizmetler: E.hizmetler.filter((h) => h.aktif !== false && (!p.hizmetler?.length || p.hizmetler.includes(h.id))), degisti: kirli });
  }));
}
function personelDuzenle(E, i, bitti) {
  const yeni = i == null, p = yeni ? { id: '', ad: '', unvan: '', tel: '', foto: '', hizmetler: [], calisma: null, izinler: [], iban: { ad: '', no: '', banka: '' }, yonetici: !E.personel.some((x) => x.yonetici), aktif: true } : JSON.parse(JSON.stringify(E.personel[i]));
  let okuCal = null;
  const c = cekmece({
    baslik: yeni ? `${esc(C.personelAd(E.tur))} ekle` : esc(p.ad), genis: true,
    govde: `<form id="pF" class="rv-form-dar"><div class="rv-profil-foto" id="pFoto"></div>
      <div class="izgara2">${alan('Görünen ad', `<input class="girdi" name="ad" value="${esc(p.ad)}" maxlength="40" required placeholder="Ör. Harun Bey">`)}${alan('Unvan', `<input class="girdi" name="unvan" value="${esc(p.unvan || '')}" maxlength="40" placeholder="Ör. Usta berber">`)}</div>
      ${alan('Telefon (WhatsApp)', `<input class="girdi" name="tel" type="tel" value="${esc(C.telYaz(p.tel))}" placeholder="05xx xxx xx xx">`, '<small class="kucuk-yazi">Müşteri ödeme bildirimini bu numaraya WhatsApp\'tan da iletebilir.</small>')}
      <fieldset class="rv-fs"><legend>Ödeme bilgileri</legend>${p.iban?.ornek ? `<p class="uyari-yazi" style="margin:0 0 8px">Örnek IBAN: gerçeğini girin.</p>` : ''}
        ${alan('Hesap sahibi', `<input class="girdi" name="ibanAd" value="${esc(p.iban?.ad || '')}" maxlength="60">`)}
        ${alan('IBAN', `<input class="girdi mono" name="ibanNo" value="${esc(p.iban?.no ? C.ibanYaz(p.iban.no) : '')}" maxlength="40" autocapitalize="characters" spellcheck="false" placeholder="TR00 0000 0000 0000 0000 0000 00">`, '<small class="kucuk-yazi" id="pBanka"></small>')}
        ${alan('Banka', `<input class="girdi" name="ibanBanka" value="${esc(p.iban?.banka || '')}" maxlength="40" placeholder="IBAN'dan bulunur">`)}</fieldset>
      <fieldset class="rv-fs"><legend>Verdiği hizmetler</legend><label class="rv-satir-sec"><input type="checkbox" name="tum" ${!p.hizmetler?.length ? 'checked' : ''}><span>Tüm hizmetler</span></label>
        <div id="pH" ${!p.hizmetler?.length ? 'hidden' : ''}>${E.hizmetler.map((h) => `<label class="rv-satir-sec"><input type="checkbox" value="${h.id}" ${p.hizmetler?.includes(h.id) ? 'checked' : ''} ${h.id ? '' : 'disabled'}><span>${esc(h.ad || 'Yeni hizmet')} <small class="soluk">${C.sureYaz(h.sure)}</small></span></label>`).join('')}</div></fieldset>
      <fieldset class="rv-fs"><legend>Çalışma saatleri</legend><div class="segment" id="pCs"><button type="button" class="${p.calisma ? '' : 'on'}" data-c="0">İşletme saatleri</button><button type="button" class="${p.calisma ? 'on' : ''}" data-c="1">Kendi saatleri</button></div><div id="pC" style="margin-top:12px"></div></fieldset>
      <label class="rv-satir-sec"><input type="checkbox" name="yonetici" ${p.yonetici ? 'checked' : ''}><span><b>İşletme yöneticisi</b> · tüm ekibi görür; hizmetleri, fiyatları, ürünleri ve kuralları düzenler</span></label>
      <label class="rv-satir-sec"><input type="checkbox" name="aktif" ${p.aktif !== false ? 'checked' : ''}><span>Randevu alıyor (kapatırsanız müşteriye görünmez)</span></label>
      <p class="hata-yazi" id="pHt"></p></form>`,
    alt: `${yeni ? '' : '<button class="dg sade tehlike-yazi" type="button" data-sil>Sil</button>'}<span class="bosluk"></span><button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="pF">${yeni ? 'Ekle' : 'Tamam'}</button>`,
  });
  const f = c.el.querySelector('#pF');
  const fotoCiz = () => { c.el.querySelector('#pFoto').innerHTML = `${avatar({ ...p, ad: f.ad.value || p.ad || '?' }, 64)}<div class="dg-grup"><button class="dg cizgili kucuk" type="button" data-foto>${ikon('yukle', 'kk')}Fotoğraf</button>${p.foto ? '<button class="dg sade kucuk" type="button" data-fsil>Kaldır</button>' : ''}</div>`; c.el.querySelector('[data-foto]').onclick = async () => { const d = await gorselSec({ oran: 1, max: 512, yuvarlak: true, baslik: 'Profil fotoğrafı', ipucu: 'Yüzünüz dairenin ortasında olsun. Sürükleyip yakınlaştırarak ayarlayın.' }); if (d) { p.foto = d; fotoCiz(); } }; c.el.querySelector('[data-fsil]')?.addEventListener('click', () => { p.foto = ''; fotoCiz(); }); };
  fotoCiz();
  f.ad.oninput = () => { if (!p.foto) fotoCiz(); };
  const bankaY = () => { const n = C.ibanNorm(f.ibanNo.value); c.el.querySelector('#pBanka').textContent = n.length >= 26 ? (C.ibanGecerli(n) ? C.bankaAdi(n) || 'IBAN doğru görünüyor' : p.iban?.ornek && n === p.iban.no ? 'Örnek IBAN' : 'IBAN hatalı görünüyor') : ''; if (C.bankaAdi(n) && !f.ibanBanka.value) f.ibanBanka.value = C.bankaAdi(n); };
  bankaY(); f.ibanNo.oninput = bankaY;
  f.tum.onchange = () => { c.el.querySelector('#pH').hidden = f.tum.checked; };
  const calCiz = (ozel) => { c.el.querySelectorAll('#pCs button').forEach((b) => b.classList.toggle('on', b.dataset.c === (ozel ? '1' : '0'))); const d = c.el.querySelector('#pC'); if (ozel) okuCal = haftaDuzenleyici(d, p.calisma || E.calisma); else { okuCal = null; d.innerHTML = `<p class="kucuk-yazi">${C.HAFTA.map((g) => `${C.GUN_KISA[g]} ${esc(C.calismaYaz(E.calisma?.[g]))}`).join(' · ')}</p>`; } };
  calCiz(!!p.calisma);
  c.el.querySelectorAll('#pCs button').forEach((b) => (b.onclick = () => calCiz(b.dataset.c === '1')));
  c.el.querySelector('[data-sil]')?.addEventListener('click', async () => {
    if (!(await onayla({ baslik: `${esc(p.ad)} silinsin mi?`, metin: 'Kaydettiğinizde giriş hesabı da silinir. Geçmiş randevular kalır ama takvimde görünmez; yalnız randevu almayı durdurmak için “Randevu alıyor” işaretini kaldırmanız yeterli.', evet: 'Sil', tehlike: true }))) return;
    E.personel.splice(i, 1); kirli(); c.kapat(); bitti();
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const ht = c.el.querySelector('#pHt'); ht.textContent = '';
    const n = C.ibanNorm(f.ibanNo.value);
    if (n && !C.ibanGecerli(n) && !(p.iban?.ornek && n === p.iban.no)) { ht.textContent = 'IBAN hatalı görünüyor. TR ile başlayan 26 karakteri kontrol edin.'; return; }
    if (f.tel.value && !C.telNorm(f.tel.value)) { ht.textContent = 'Telefon numarası geçersiz.'; return; }
    let cal = null; try { cal = okuCal ? okuCal() : null; } catch (er) { ht.textContent = er.message; return; }
    Object.assign(p, { ad: f.ad.value.trim(), unvan: f.unvan.value.trim(), tel: C.telNorm(f.tel.value), hizmetler: f.tum.checked ? [] : $$('#pH input:checked', c.el).map((x) => x.value), calisma: cal, yonetici: f.yonetici.checked, aktif: f.aktif.checked,
      iban: { ad: f.ibanAd.value.trim(), no: n, banka: f.ibanBanka.value.trim(), ...(p.iban?.ornek && n === p.iban.no ? { ornek: true } : {}) } });
    if (yeni) E.personel.push(p); else E.personel[i] = p;
    kirli(); c.kapat(); bitti();
    if (yeni) bildir('Eklendi. Giriş hesabı için önce kaydedin.', { sure: 4000 });
  });
}
async function girisYonet(E, p, bitti) {
  const kayitli = Y.v.isletmeler.find((s) => s.slug === E.slug)?.personel.some((z) => z.id === p.id);
  if (!kayitli) { bildir('Önce değişiklikleri kaydedin.', { hata: true }); return; }
  if (Y.kirli && !(await kaydet(E.slug, { sessiz: true }))) return;
  const s = isletmeBul(E.slug), hs = s.hesaplar?.[p.id];
  const mesaj = (k, sf) => `Randevu Vaktim · ${s.ad}\n${p.ad} için ${C.personelAd(s.tur).toLocaleLowerCase('tr')} girişi\nAdres: ${paylasLink('/randevu/giris').replace(/^https?:\/\//, '')}\nKullanıcı adı: ${k}\nŞifre: ${sf}`;
  const c = cekmece({
    baslik: `${esc(p.ad)} · giriş`,
    govde: hs ? `<div class="bilgi-liste"><div><span>Giriş adresi</span><b>${esc(paylasLink('/randevu/giris').replace(/^https?:\/\//, ''))}</b></div><div><span>Kullanıcı adı</span><b>${esc(hs.kullanici)}</b></div><div><span>Şifre</span><b class="mono" data-sf>••••••••</b><button class="dg sade kucuk" type="button" data-goster>Göster</button></div>${hs.son ? `<div><span>Son giriş</span><b>${esc(zamanOnce(hs.son))}</b></div>` : ''}</div>
      <div class="dg-grup" style="margin-top:14px"><a class="dg ana" href="${esc(waLink(p.tel || '', mesaj(hs.kullanici, hs.sifre)))}" target="_blank" rel="noopener">${ikon('whatsapp', 'k')}WhatsApp ile gönder</a><button class="dg cizgili" type="button" data-kopyala>${ikon('kopya', 'k')}Kopyala</button></div>
      <details class="rv-gelismis" style="margin-top:16px"><summary>Kullanıcı adını ya da şifreyi değiştir</summary><form id="hF" class="rv-form-dar" style="margin-top:12px">${alan('Kullanıcı adı', `<input class="girdi" name="k" value="${esc(hs.kullanici)}" maxlength="30" autocapitalize="none" spellcheck="false">`)}${alan('Yeni şifre (boş bırakırsanız mevcut şifre kalır)', '<input class="girdi" name="s" maxlength="64" autocomplete="off">')}
        <div class="dg-grup"><button class="dg cizgili kucuk" type="submit">Kaydet</button><button class="dg cizgili kucuk" type="button" data-rastgele>Yeni şifre oluştur</button><button class="dg sade kucuk tehlike-yazi" type="button" data-kapa>Girişi kapat</button></div></form></details>
      <button class="dg sade" type="button" data-panel style="margin-top:12px">${ikon('takvim', 'k')}${esc(C.ek(p.ad))} panelini aç</button>`
      : `<p class="soluk" style="margin:0 0 12px">${esc(p.ad)} için henüz giriş yok. Kullanıcı adı önerilir, şifre otomatik oluşturulur.</p><form id="hF" class="rv-form-dar">${alan('Kullanıcı adı', `<input class="girdi" name="k" value="${esc(C.kullaniciOner(p.ad))}" maxlength="30" autocapitalize="none" spellcheck="false" required>`)}${alan('Şifre (boş bırakırsanız oluşturulur)', '<input class="girdi" name="s" maxlength="64" autocomplete="off">')}<button class="dg ana" type="submit">Giriş oluştur</button></form>`,
  });
  const goster = (k, sf) => { c.kapat(); bitti(); const c2 = cekmece({ baslik: 'Giriş bilgileri', govde: `<div class="bilgi-liste"><div><span>Adres</span><b>${esc(paylasLink('/randevu/giris').replace(/^https?:\/\//, ''))}</b></div><div><span>Kullanıcı adı</span><b>${esc(k)}</b></div><div><span>Şifre</span><b class="mono">${esc(sf)}</b></div></div><p class="kucuk-yazi" style="margin-top:12px">Şifreyi daha sonra “Giriş” düğmesinden yeniden görebilirsiniz.</p>`, alt: `<button class="dg cizgili" type="button" data-k>${ikon('kopya', 'k')}Kopyala</button><a class="dg ana" href="${esc(waLink(p.tel || '', mesaj(k, sf)))}" target="_blank" rel="noopener">${ikon('whatsapp', 'k')}WhatsApp</a>` }); c2.el.querySelector('[data-k]').onclick = () => kopyala(mesaj(k, sf)); };
  const gonder = async (govde) => { try { const v = await api.hesap(Y.token, E.slug, { p: p.id, ...govde }); const i = Y.v.isletmeler.findIndex((x) => x.slug === E.slug); Y.v.isletmeler[i] = v.isletme; Y.E = JSON.parse(JSON.stringify(v.isletme)); return v; } catch (e) { bildir(e.message, { hata: true }); return null; } };
  c.el.querySelector('[data-goster]')?.addEventListener('click', (e) => { c.el.querySelector('[data-sf]').textContent = hs.sifre || '(şifre görüntülenemiyor, yenisini oluşturun)'; e.target.remove(); });
  c.el.querySelector('[data-kopyala]')?.addEventListener('click', () => kopyala(mesaj(hs.kullanici, hs.sifre)));
  c.el.querySelector('[data-panel]')?.addEventListener('click', () => { c.kapat(); panelAc(E.slug, p.id); });
  c.el.querySelector('[data-rastgele]')?.addEventListener('click', async () => { if (!(await onayla({ baslik: 'Yeni şifre oluşturulsun mu?', metin: 'Eski şifre geçersiz olur ve açık oturumlar kapanır.', evet: 'Oluştur' }))) return; const v = await gonder({ kullanici: hs.kullanici, yeniSifre: true }); if (v) goster(v.kullanici, v.sifre); });
  c.el.querySelector('[data-kapa]')?.addEventListener('click', async () => { if (!(await onayla({ baslik: 'Giriş kapatılsın mı?', metin: `${esc(p.ad)} panele giremez; randevu almaya devam eder.`, evet: 'Girişi kapat', tehlike: true }))) return; if (await gonder({ kapat: true })) { bildir('Giriş kapatıldı'); c.kapat(); bitti(); } });
  c.el.querySelector('#hF')?.addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; const v = await gonder({ kullanici: f.k.value.trim().toLowerCase(), sifre: f.s.value }); if (v) goster(v.kullanici, v.sifre); });
}

// ---- kurallar
function sKurallar(el, E) {
  const a = (E.ayar = C.ayarTemiz(E.ayar));
  const sec = (k, ad, L, f) => alan(ad, `<select class="girdi" data-e="${k}">${L.map((x) => `<option value="${x}" ${+a[k] === x ? 'selected' : ''}>${f(x)}</option>`).join('')}</select>`);
  el.innerHTML = `<section class="kart"><div class="kart-bas"><h2>Randevu kuralları</h2></div><div class="rv-form-dar">
    ${alan('Ön ödeme', `<select class="girdi" data-e="onOdeme">${C.ON_ODEME.map(([k, x]) => `<option value="${k}" ${a.onOdeme === k ? 'selected' : ''}>${x}</option>`).join('')}</select>`, '<small class="kucuk-yazi">Ön ödeme, boş yere alınan randevuları önler. Müşteri ustanın IBAN\'ına gönderir, “Ödeme yaptım” der, usta onaylar.</small>')}
    <div data-kap ${a.onOdeme === 'kapora' ? '' : 'hidden'}>${alan('Kapora tutarı (₺)', `<input class="girdi" type="number" min="0" step="10" data-e="kapora" value="${a.kapora}">`)}</div>
    <div class="izgara2">${sec('odemeSure', 'Ödeme için süre', [10, 15, 20, 30, 45, 60], (x) => `${x} dakika`)}${sec('ileriGun', 'Kaç gün ileriye', [7, 14, 21, 30, 45, 60, 90], (x) => `${x} gün`)}</div>
    <div class="izgara2">${sec('enAzOnce', 'En az ne kadar önce', [0, 15, 30, 60, 120, 180, 360, 720, 1440], (x) => (x ? C.sureYaz(x) + ' önce' : 'Sınır yok'))}${sec('adim', 'Saat aralığı', [10, 15, 20, 30, 45, 60], (x) => `${x} dakikada bir`)}</div>
    <div class="izgara2">${sec('ara', 'Randevular arası boşluk', [0, 5, 10, 15, 20, 30], (x) => (x ? `${x} dakika` : 'Yok'))}${sec('iptalSaat', 'Müşteri iptali', [0, 1, 2, 3, 6, 12, 24, 48], (x) => (x ? `${x} saat öncesine kadar` : 'Her zaman'))}</div>
    <p class="kucuk-yazi">“Ödeme için süre”: müşteri saati ayırttıktan sonra bu süre içinde “Ödeme yaptım” demezse saat yeniden açılır.</p></div></section>`;
  bagla(el, (i) => { const k = i.dataset.e; a[k] = k === 'onOdeme' ? i.value : +i.value; if (k === 'onOdeme') el.querySelector('[data-kap]').hidden = i.value !== 'kapora'; });
}

// ---- ücret (NFC Dünyası aboneliği)
function sUcret(el, E) {
  E.odeme = { tutar: 0, personelBasi: 0, gun: 1, baslangic: '', periyot: 'aylik', ...(E.odeme || {}) };
  E.odemeler = E.odemeler || [];
  const ciz = () => {
    const o = E.odeme, ay = bugunTR().slice(0, 7), aylar = Array.from({ length: 7 }, (_, i) => C.ayEkle(ay, 1 - i));
    const D = aylar.map((x) => C.aboneAy(E, x, bugunTR())).filter(Boolean);
    el.innerHTML = `<div class="rv-ayarlar"><section class="kart"><div class="kart-bas"><h2>Aylık ücret</h2></div><div class="rv-form-dar">
      <div class="segment" id="uP"><button type="button" class="${o.periyot !== 'yok' ? 'on' : ''}" data-p="aylik">Aylık ücretli</button><button type="button" class="${o.periyot === 'yok' ? 'on' : ''}" data-p="yok">Ücretsiz</button></div>
      <div class="rv-form-dar" ${o.periyot === 'yok' ? 'hidden' : ''} style="margin-top:4px"><div class="izgara2">${alan('Sabit aylık (₺)', `<input class="girdi" type="number" min="0" step="50" data-u="tutar" value="${o.tutar}">`)}${alan('Personel başı aylık (₺)', `<input class="girdi" type="number" min="0" step="50" data-u="personelBasi" value="${o.personelBasi}">`)}</div>
      <div class="izgara2">${alan('Ödeme günü', `<select class="girdi" data-u="gun">${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}" ${o.gun === i + 1 ? 'selected' : ''}>Her ayın ${i + 1}'i</option>`).join('')}</select>`)}${alan('Başlangıç', `<input class="girdi" type="date" data-u="baslangic" value="${o.baslangic || C.trBugun(E.olusturma || Date.now())}">`)}</div>
      <p class="kucuk-yazi">Bu ay: ${TL((+o.tutar || 0) + (+o.personelBasi || 0) * E.personel.filter((p) => p.aktif !== false).length)} (${E.personel.filter((p) => p.aktif !== false).length} etkin personel)</p></div></div></section>
      <section class="kart"><div class="kart-bas"><h2>Aylık döküm</h2><span class="bosluk"></span><button class="dg ana kucuk" type="button" data-al>${ikon('arti', 'kk')}Ödeme al</button></div>
        ${D.length ? `<div class="odeme-liste">${D.map((r) => `<div class="satir"><span class="ay-k"><b>${esc(C.ayAdi(r.ay, { kisa: true, yil: false }))}</b><small>${r.ay.slice(0, 4)}</small></span><span class="ana"><b>${TL(r.tutar)}</b><small>${r.odenen ? `${TL(r.odenen)} alındı` : r.ay > ay ? 'gelecek ay' : 'ödeme yok'}</small></span><span class="tutar"><small class="${r.durum}">${r.durum === 'odendi' ? 'Ödendi' : r.durum === 'gecikti' ? `${TL(r.kalan)} gecikti` : `Son gün ${esc(C.tarihYaz(r.vade, { yil: false }))}`}</small></span></div>`).join('')}</div>` : '<p class="soluk">Ücret girilmedi.</p>'}</section>
      <section class="kart"><div class="kart-bas"><h2>Alınan ödemeler</h2></div>${E.odemeler.length ? `<div class="odeme-liste">${[...E.odemeler].sort((a, b) => b.tarih.localeCompare(a.tarih)).map((p) => `<div class="satir"><span class="ana"><b>${TL(p.tutar)}</b><small>${esc(C.tarihYaz(p.tarih))}${p.donem ? ' · ' + esc(C.ayAdi(p.donem)) + ' için' : ''}${p.not ? ' · ' + esc(p.not) : ''}</small></span><button class="dg ikon-d kucuk" type="button" data-osil="${esc(p.id)}" aria-label="Sil">${ikon('cop', 'kk')}</button></div>`).join('')}</div>` : '<p class="soluk">Kayıt yok.</p>'}</section></div>`;
    el.querySelectorAll('#uP [data-p]').forEach((b) => (b.onclick = () => { o.periyot = b.dataset.p; kirli(); ciz(); }));
    el.querySelectorAll('[data-u]').forEach((i) => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => { const k = i.dataset.u; o[k] = k === 'baslangic' ? i.value : +i.value; kirli(); }));
    el.querySelectorAll('[data-osil]').forEach((b) => (b.onclick = async () => { if (!(await onayla({ baslik: 'Ödeme kaydı silinsin mi?', evet: 'Sil', tehlike: true }))) return; E.odemeler = E.odemeler.filter((x) => x.id !== b.dataset.osil); kirli(); ciz(); }));
    el.querySelector('[data-al]').onclick = () => odemeAl(E, async () => { ciz(); await kaydet(E.slug); });
  };
  ciz();
}
function odemeAl(E, bitti) {
  const bugun = bugunTR(), ay = bugun.slice(0, 7);
  const borc = Array.from({ length: 12 }, (_, i) => C.aboneAy(E, C.ayEkle(ay, -i), bugun)).filter((r) => r && r.kalan > 0).sort((a, b) => a.ay.localeCompare(b.ay))[0];
  const c = cekmece({
    baslik: `Ödeme al · ${esc(E.ad)}`,
    govde: `<form id="oF" class="rv-form-dar"><div class="izgara2">${alan('Tutar (₺)', `<input class="girdi" type="number" name="tutar" min="1" step="1" required value="${borc?.kalan || ''}">`)}${alan('Tarih', `<input class="girdi" type="date" name="tarih" value="${bugun}" required>`)}</div>
      ${alan('Hangi ay için', `<input class="girdi" type="month" name="donem" value="${borc?.ay || ay}">`)}${alan('Not', '<input class="girdi" name="not" maxlength="200" placeholder="Ör. havale, nakit">')}</form>`,
    alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="oF">Kaydet</button>',
  });
  c.el.querySelector('#oF').addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; E.odemeler = [...(E.odemeler || []), { id: C.rastgele(8), tutar: +f.tutar.value, tarih: f.tarih.value, donem: f.donem.value, not: f.not.value }]; kirli(); c.kapat(); bitti(); });
}

// ---- bağlantı ve QR
function sBaglanti(el, E) {
  const link = paylasLink('/randevu/' + E.slug), svg = qrSvg(link, { renk: '#111111' });
  el.innerHTML = `<div class="rv-ayarlar"><section class="kart"><div class="kart-bas"><h2>Randevu sayfası</h2></div>
      <div class="rv-link"><code>${esc(link.replace(/^https?:\/\//, ''))}</code><button class="dg ikon-d kucuk" type="button" data-kopya="${esc(link)}" aria-label="Kopyala">${ikon('kopya', 'k')}</button></div>
      <div class="rv-qr-buyuk">${svg}</div>
      <div class="dg-grup"><button class="dg ana" type="button" data-qr>${ikon('indir', 'k')}QR'ı indir (SVG)</button><a class="dg cizgili" href="${esc(waLink('', `${E.ad} online randevu: ${link}`))}" target="_blank" rel="noopener">${ikon('whatsapp', 'k')}Paylaş</a></div>
      <p class="kucuk-yazi" style="margin-top:12px">QR'ı tezgâha, aynaya ya da kartvizite basın; Instagram profiline bağlantıyı ekleyin.</p></section>
    <section class="kart"><div class="kart-bas"><h2>Kişiye özel bağlantılar</h2></div><p class="kucuk-yazi" style="margin:-4px 0 10px">Bu bağlantıyı açan müşteri seçim yapmadan doğrudan o kişinin takvimine gelir; ${esc(C.personelAd(E.tur).toLocaleLowerCase('tr'))} kendi Instagram'ında ya da WhatsApp'ında paylaşabilir.</p>
      ${E.personel.filter((p) => p.id).map((p) => { const l = `${link}?usta=${p.id}`; return `<div class="rv-ekip-satir">${avatar(p, 36)}<span><b>${esc(p.ad)}</b><small class="mono">${esc(l.replace(/^https?:\/\//, ''))}</small></span><button class="dg ikon-d kucuk" type="button" data-kopya="${esc(l)}" aria-label="Kopyala">${ikon('kopya', 'k')}</button></div>`; }).join('') || '<p class="soluk">Kayıtlı usta yok.</p>'}</section>
    <section class="kart"><div class="kart-bas"><h2>${esc(C.personelAd(E.tur))} girişi</h2></div><p>${esc(C.cogul(C.personelAd(E.tur)))} <b>${esc(paylasLink('/randevu/giris').replace(/^https?:\/\//, ''))}</b> adresinden kendi kullanıcı adlarıyla girer. Kullanıcı adı ve şifreler “${esc(C.cogul(C.personelAd(E.tur)))}” sekmesinde.</p></section></div>`;
  el.querySelectorAll('[data-kopya]').forEach((b) => (b.onclick = () => kopyala(b.dataset.kopya)));
  el.querySelector('[data-qr]').onclick = () => indir(`randevu-qr-${E.slug}.svg`, svg, 'image/svg+xml');
}

// ---------------------------------------------------------------- ödemeler (tüm işletmeler)
function odemeler(el, ay) {
  const bugun = bugunTR(); ay = ay || Y.ay || bugun.slice(0, 7); Y.ay = ay;
  const R = Y.v.isletmeler.map((s) => ({ s, r: C.aboneAy(s, ay, bugun) })).filter((x) => x.r);
  const top = R.reduce((n, x) => n + x.r.tutar, 0), al = R.reduce((n, x) => n + x.r.odenen, 0);
  el.innerHTML = `<div class="bolum-bas"><h1>Ödemeler</h1><span class="bosluk"></span><div class="ay-sec"><button class="dg ikon-d" type="button" data-a="-1" aria-label="Önceki ay">${ikon('sol')}</button><b>${esc(C.ayAdi(ay))}</b><button class="dg ikon-d" type="button" data-a="1" aria-label="Sonraki ay">${ikon('sag')}</button></div></div>
    <div class="sayilar"><div class="sayi"><b class="tl">${TL(top)}</b><span>${esc(C.ayAdi(ay, { yil: false }))} hesabı</span></div><div class="sayi"><b class="tl">${TL(al)}</b><span>alındı</span></div><div class="sayi"><b class="tl">${TL(Math.max(0, top - al))}</b><span>kalan</span></div><div class="sayi"><b>${R.filter((x) => x.r.durum === 'gecikti').length}</b><span>geciken işletme</span></div></div>
    <section class="kart" style="margin-top:16px">${R.length ? `<div class="odeme-liste">${R.map(({ s, r }) => `<div class="satir">${logo(s, 36, '', true)}<a class="ana" href="${href(yolY(`isletme/${s.slug}/ucret`))}" data-git="${yolY(`isletme/${s.slug}/ucret`)}"><b>${esc(s.ad)}</b><small>${esc(C.aboneYazi(s, TL))}${r.kisi ? ` · ${r.kisi} personel` : ''}</small></a><span class="tutar"><b>${TL(r.tutar)}</b><small class="${r.durum}">${r.durum === 'odendi' ? 'Ödendi' : r.durum === 'gecikti' ? `${TL(r.kalan)} gecikti` : `Son gün ${esc(C.tarihYaz(r.vade, { yil: false }))}`}</small></span>${r.kalan > 0 ? `<button class="dg cizgili kucuk" type="button" data-al="${esc(s.slug)}">Ödeme al</button>` : '<span class="odeme-bos"></span>'}</div>`).join('')}</div>` : '<p class="soluk">Bu ay için ücretli işletme yok. Ücretleri işletmenin “Ücret” sekmesinden girin.</p>'}</section>`;
  el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => odemeler(el, C.ayEkle(ay, +b.dataset.a))));
  el.querySelectorAll('[data-al]').forEach((b) => (b.onclick = () => {
    const s = isletmeBul(b.dataset.al); Y.E = JSON.parse(JSON.stringify(s));
    odemeAl(Y.E, async () => { try { const v = await api.isletmeYaz(Y.token, s.slug, { ...Y.E }); const i = Y.v.isletmeler.findIndex((x) => x.slug === s.slug); Y.v.isletmeler[i] = v.isletme; Y.kirli = false; Y.E = null; bildir('Ödeme kaydedildi'); odemeler(el, ay); } catch (e) { Y.kirli = false; Y.E = null; bildir(e.message, { hata: true }); } });
  }));
}
