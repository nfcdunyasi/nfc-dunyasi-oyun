// Randevu Vaktim — müşteri tarafı (üyelik yok).
// İşletme sayfası: kapak, kimlik, hizmetler (işletmenin kategorilerine göre), ekip, ürünler, çalışma saatleri ve kurallar.
// Randevu: hizmet(ler) seç → kişi (ya da "fark etmez") → gün ve saat → ad ve telefon → IBAN'a ön ödeme ve "Ödeme yaptım" → işletme onayı.
import * as C from './cekirdek.js?v=2026-11-24-b';
import { galeriAc } from './galeri.js?v=2026-11-24-b';
import { api, yerel } from './api.js?v=2026-11-24-b';
import {
  $, $$, esc, TL, ikon, bildir, onayla, cekmece, kopyala, waLink, git, href, sorgu, temaUygula, avatar, logo, durumRozet, saatAraligi, hizmetYazi, randevuNo,
  geriSayim, dkSn, takvimeEkle, yukleniyor, hataKutu, metaRobots, markaIkon, kapakStil, paylasLink,
} from './rui.js?v=2026-11-24-b';

const KOK = () => $('#uygulama');
let S = null; // { slug, isletme, fark, secim: { h: [], p: '', tarih: '', dk: null, atanan: '' }, takvim: { pid: { t, bas, gunler } }, ilk: { t, v } }
let temizlikler = [];
export function temizle() {
  for (const f of temizlikler) try { f(); } catch { /* */ }
  temizlikler = [];
  document.body.classList.remove('dk-sepet-var');
}
const simdiTR = () => C.trSimdi(Date.now() + (S?.fark || 0));
const ADIMLAR = ['usta', 'saat', 'bilgi'];
const imza = () => `<footer class="dk-imza"><a href="${href('/randevu')}" data-git="/randevu">${markaIkon(18)}<b>Randevu Vaktim</b></a><span>bir NFC Dünyası ürünüdür</span></footer>`;
const kisiAd = (s, kucuk = false) => { const a = C.personelAd(s.tur); return kucuk ? a.toLocaleLowerCase('tr') : a; };

// ---------------------------------------------------------------- bu cihazda kayıtlı randevular
const kayitliRandevular = () => yerel.json('rv-randevular', []);
function randevuKaydet(x) { const L = kayitliRandevular().filter((z) => z.kod !== x.kod); L.unshift(x); yerel.koy('rv-randevular', JSON.stringify(L.slice(0, 20))); }
function randevuGuncelle(kod, ek) { const L = kayitliRandevular(); const z = L.find((x) => x.kod === kod); if (z) { Object.assign(z, ek); yerel.koy('rv-randevular', JSON.stringify(L)); } }

// ---------------------------------------------------------------- seçim yardımcıları
const secilenHizmet = () => S.secim.h.map((id) => S.isletme.hizmetler.find((h) => h.id === id)).filter(Boolean);
const toplamSure = () => secilenHizmet().reduce((n, h) => n + h.sure, 0);
const toplamFiyat = () => secilenHizmet().reduce((n, h) => n + h.fiyat, 0);
const yapar = (p, id) => !p.hizmetler?.length || p.hizmetler.includes(id);
const uygun = () => S.isletme.personel.filter((p) => S.secim.h.every((id) => yapar(p, id)));
/** Randevunun kime yazılacağı: seçilen kişi ya da "fark etmez"de saate göre atanan */
const kisi = () => S.isletme.personel.find((p) => p.id === (S.secim.p === '*' ? S.secim.atanan : S.secim.p));
const oncekiKisi = () => (S.secim.p && S.secim.p !== '*' ? S.isletme.personel.find((p) => p.id === S.secim.p) : null);
const adimGit = (adim, degistir = false) => git(`/randevu/${S.slug}${adim ? '?adim=' + adim : ''}`, { degistir, kaydirma: true });

// ---------------------------------------------------------------- giriş
export async function isletmeSayfasi(slug) {
  if (!S || S.slug !== slug) {
    temizle();
    KOK().innerHTML = `<div class="dk">${yukleniyor()}</div>`;
    let v;
    try { v = await api.isletme(slug); } catch (e) {
      metaRobots(true);
      KOK().innerHTML = e.durum === 404 ? yokSayfa() : `<div class="dk"><div class="dk-ic dk-dar" style="padding-top:60px">${hataKutu(e.message)}</div></div>`;
      KOK().querySelector('[data-tekrar]')?.addEventListener('click', () => isletmeSayfasi(slug));
      return;
    }
    S = { slug, isletme: v.isletme, fark: v.simdi.ms - Date.now(), secim: { h: [], p: '', tarih: '', dk: null, atanan: '' }, takvim: {}, ilk: null };
    const usta = sorgu().get('usta');
    if (usta && S.isletme.personel.some((p) => p.id === usta)) S.secim.p = usta;
    else if (S.isletme.personel.length === 1) S.secim.p = S.isletme.personel[0].id;
  }
  const s = S.isletme;
  metaRobots(!!s.ornek); // deneme işletmesi arama motorlarına kapalı
  temaUygula(s.tema);
  let adim = sorgu().get('adim') || '';
  if (adim && !ADIMLAR.includes(adim)) adim = '';
  const hazir = { usta: () => S.secim.h.length > 0, saat: () => S.secim.h.length > 0 && !!S.secim.p, bilgi: () => S.secim.h.length > 0 && !!S.secim.p && !!S.secim.tarih && S.secim.dk != null && !!kisi() };
  while (adim && !hazir[adim]()) adim = adim === 'usta' ? '' : ADIMLAR[ADIMLAR.indexOf(adim) - 1];
  temizle();
  if (!adim) return dukkan();
  akis(adim);
}
function yokSayfa() {
  return `<div class="dk">${ustBar({ baslik: 'Randevu Vaktim', geri: '/randevu', paylas: false })}<div class="dk-ic dk-dar dk-yok">${ikon('ara')}<h1>Sayfa bulunamadı</h1>
    <p class="soluk">Bu işletme sayfası kaldırılmış ya da bağlantı yanlış yazılmış olabilir.</p><a class="dg ana" href="${href('/randevu')}" data-git="/randevu">Tüm işletmeler</a></div>${imza()}</div>`;
}

// ---------------------------------------------------------------- üst çubuk
function ustBar({ baslik = '', alt = '', geri = '/randevu', paylas = true, adim = '' } = {}) {
  return `<header class="dk-ust${baslik ? ' ad-gorunur' : ''}" id="dkUst"><div class="dk-ust-ic">
    <a class="dk-ust-d" href="${href(geri)}" data-git="${esc(geri)}" aria-label="Geri">${ikon('sol')}</a>
    <div class="dk-ust-ad"><b>${esc(baslik || S?.isletme?.ad || '')}</b>${alt ? `<small>${esc(alt)}</small>` : ''}</div>
    ${adim ? `<span class="dk-ust-adim">${esc(adim)}</span>` : paylas ? `<button class="dk-ust-d" type="button" data-paylas aria-label="Paylaş">${ikon('paylas')}</button>` : '<span class="dk-ust-bos"></span>'}
  </div></header>`;
}
async function paylas() {
  const s = S.isletme, url = paylasLink('/randevu/' + s.slug);
  if (navigator.share) { try { await navigator.share({ title: s.ad, text: `${s.ad} · online randevu`, url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  kopyala(url);
}

// ---------------------------------------------------------------- işletme sayfası
function dukkan() {
  const s = S.isletme, sim = simdiTR(), d = C.acikDurum(s, sim), i = s.iletisim || {};
  document.title = `${s.ad} · Randevu al`;
  const yer = [i.ilce, i.sehir].filter(Boolean).join(', ');
  const harita = i.harita || (i.adres ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.ad, i.adres, i.ilce, i.sehir].filter(Boolean).join(', '))}` : '');
  const eylem = [];
  if (harita) eylem.push(`<a class="dk-eylem" href="${esc(harita)}" target="_blank" rel="noopener">${ikon('konum')}<span>Yol tarifi</span></a>`);
  if (i.telefon) eylem.push(`<a class="dk-eylem" href="tel:${esc(i.telefon)}">${ikon('telefon')}<span>Ara</span></a>`);
  if (i.telefon && i.whatsapp !== false && C.cepMi(i.telefon)) eylem.push(`<a class="dk-eylem" href="${esc(waLink(i.telefon, `Merhaba, ${s.ad} için yazıyorum.`))}" target="_blank" rel="noopener">${ikon('whatsapp')}<span>WhatsApp</span></a>`);
  if (i.instagram) eylem.push(`<a class="dk-eylem" href="https://instagram.com/${esc(i.instagram)}" target="_blank" rel="noopener">${ikon('instagram')}<span>Instagram</span></a>`);
  eylem.push(`<button class="dk-eylem" type="button" data-paylas>${ikon('paylas')}<span>Paylaş</span></button>`);
  const P = s.personel, U = s.urunler || [];
  const ekipVar = P.length > 1 || P.some((p) => p.hakkinda || p.uzmanlik?.length || p.isler?.length), W = isler(s);
  const sekmeler = [['hizmetler', 'Hizmetler'], ekipVar ? ['ekip', P.length > 1 ? 'Ekip' : C.personelAd(s.tur)] : null, W.length ? ['calismalar', 'Çalışmalar'] : null, U.length ? ['urunler', 'Ürünler'] : null, ['bilgiler', 'Bilgiler']].filter(Boolean);
  KOK().innerHTML = `<div class="dk">
    ${ustBar()}
    <div class="dk-kapak-kap"><div class="dk-kapak" style="${s.tema.kapak ? '' : esc(kapakStil(s.tema, s.tur))}">${s.tema.kapak ? `<img src="${esc(s.tema.kapak)}" alt="">` : ''}</div></div>
    <section class="dk-kimlik"><div class="dk-ic">
      ${logo(s, 88, 'dk-logo')}
      <div class="dk-kimlik-yazi">
        <h1 id="dkAd">${esc(s.ad)}</h1>
        <p class="dk-alt">${esc(C.turAd(s.tur))}${yer ? ` · ${esc(yer)}` : ''}</p>
        <p class="dk-durum${d.acik ? ' acik' : ''}"><i></i><span>${esc(d.metin)}</span></p>
      </div>
      ${s.aciklama ? `<p class="dk-aciklama">${esc(s.aciklama)}</p>` : ''}
      ${s.ornek ? `<p class="dk-ornek">${ikon('bilgi', 'kk')}<span>Örnek işletme: fiyatlar ve ödeme bilgileri gerçek değildir.</span></p>` : ''}
      <div class="dk-eylemler">${eylem.join('')}</div>
    </div></section>
    <nav class="dk-sekme" id="dkSekme" aria-label="Bölümler"><div class="dk-ic">${sekmeler.map(([k, a], n) => `<button type="button" data-bolum="${k}" class="${n ? '' : 'on'}">${a}</button>`).join('')}</div></nav>
    <div class="dk-ic dk-duzen">
      <main class="dk-ana">
        ${aktifBant(s)}
        <section class="dk-bolum" id="hizmetler"></section>
        ${ekipVar ? `<section class="dk-bolum" id="ekip"><div class="dk-bolum-bas"><h2>${P.length > 1 ? 'Ekip' : esc(C.personelAd(s.tur))}</h2><span class="soluk">${P.length > 1 ? `${P.length} kişi` : ''}</span></div><div class="dk-ekip" id="dkEkip"></div></section>` : ''}
        ${W.length ? `<section class="dk-bolum" id="calismalar"><div class="dk-bolum-bas"><h2>Çalışmalar</h2><span class="soluk">${W.length} fotoğraf</span></div><div id="dkIs"></div></section>` : ''}
        ${U.length ? `<section class="dk-bolum" id="urunler"><div class="dk-bolum-bas"><h2>Ürünler</h2><span class="soluk">${U.length} ürün</span></div>${urunBolum(U)}</section>` : ''}
        <section class="dk-bolum" id="bilgiler">${bilgiBolum()}</section>
      </main>
      <aside class="dk-yan"><div class="dk-yan-kart" id="dkYan"></div></aside>
    </div>
    ${imza()}
  </div><div class="dk-sepet" id="dkSepet" hidden></div>`;
  hizmetCiz(); ekipCiz(); isCiz(); sepetCiz();
  KOK().querySelectorAll('[data-paylas]').forEach((b) => (b.onclick = paylas));
  // sekmeler: bölüme kaydır, kaydırdıkça etkin sekme değişir
  const ofset = () => ($('#dkUst')?.offsetHeight || 56) + ($('#dkSekme')?.offsetHeight || 48) + 8;
  $$('#dkSekme [data-bolum]').forEach((b) => (b.onclick = () => { const e = document.getElementById(b.dataset.bolum); if (e) scrollTo({ top: e.getBoundingClientRect().top + scrollY - ofset() + 2, behavior: 'smooth' }); }));
  const sekmeYap = () => {
    const y = ofset() + 20; let ak = sekmeler[0][0];
    for (const [k] of sekmeler) { const e = document.getElementById(k); if (e && e.getBoundingClientRect().top <= y) ak = k; }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) ak = sekmeler[sekmeler.length - 1][0];
    $$('#dkSekme [data-bolum]').forEach((b) => b.classList.toggle('on', b.dataset.bolum === ak));
    $('#dkUst')?.classList.toggle('ad-gorunur', ($('#dkAd')?.getBoundingClientRect().bottom ?? 0) < 56);
  };
  let bekle = 0; const kay = () => { if (!bekle) bekle = requestAnimationFrame(() => { bekle = 0; sekmeYap(); }); };
  addEventListener('scroll', kay, { passive: true }); temizlikler.push(() => removeEventListener('scroll', kay));
  sekmeYap();
  ilkBosYaz();
}
function aktifBant(s) {
  const sim = simdiTR(), L = kayitliRandevular().filter((x) => x.slug === s.slug && x.durum !== 'iptal' && (x.tarih > sim.tarih || (x.tarih === sim.tarih && x.bit > sim.dk)));
  if (!L.length) return '';
  return L.slice(0, 2).map((x) => `<a class="dk-bant" href="${href(`/randevu/${s.slug}/r/${x.kod}`)}" data-git="/randevu/${esc(s.slug)}/r/${esc(x.kod)}">${ikon('takvim')}<span><b>Randevunuz: ${esc(C.gunAdi(x.tarih, sim.tarih))} ${esc(C.saatYaz(x.bas))}</b><small>${esc(x.personel || '')}${x.durum === 'odeme' ? ' · ödeme bekleniyor' : x.durum === 'kontrol' ? ' · onay bekleniyor' : x.durum === 'onay' ? ' · onaylandı' : ''}</small></span>${ikon('sag', 'k')}</a>`).join('');
}

// ---- hizmetler
function gorunenHizmetler() { const p = oncekiKisi(); return S.isletme.hizmetler.filter((h) => !p || yapar(p, h.id)); }
function hizmetCiz() {
  const el = $('#hizmetler'); if (!el) return;
  const s = S.isletme, H = gorunenHizmetler(), p = s.personel.length > 1 ? oncekiKisi() : null;
  const gruplar = new Map();
  for (const h of H) { const k = h.kategori || ''; if (!gruplar.has(k)) gruplar.set(k, []); gruplar.get(k).push(h); }
  const baslikli = gruplar.size > 1 || !!H[0]?.kategori;
  el.innerHTML = `<div class="dk-bolum-bas"><h2>Hizmetler</h2><span class="soluk">${H.length} hizmet</span></div>
    ${p ? `<div class="dk-secili-kisi">${avatar(p, 36)}<span><b>${esc(p.ad)}</b> ile randevu alıyorsunuz</span><button type="button" class="dg sade kucuk" data-kisi-kaldir>Kaldır</button></div>` : ''}
    ${H.length ? [...gruplar].map(([k, L]) => `<div class="dk-grup">${baslikli ? `<h3>${esc(k || 'Diğer')}</h3>` : ''}<div class="dk-liste">${L.map(hizmetSatir).join('')}</div></div>`).join('')
    : '<p class="soluk dk-bos-yazi">Bu işletme henüz hizmet eklemedi.</p>'}`;
  el.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => hizmetSec(b.dataset.h)));
  el.querySelector('[data-kisi-kaldir]')?.addEventListener('click', () => { S.secim.p = ''; hizmetCiz(); ekipCiz(); sepetCiz(); });
}
function hizmetSatir(h) {
  const on = S.secim.h.includes(h.id);
  return `<button class="dk-hz${on ? ' on' : ''}" type="button" data-h="${esc(h.id)}" aria-pressed="${on}">
    <span class="dk-hz-ic"><b>${esc(h.ad)}</b><span class="dk-hz-sure">${esc(C.sureYaz(h.sure))}</span>${h.aciklama ? `<span class="dk-hz-acik">${esc(h.aciklama)}</span>` : ''}</span>
    <span class="dk-hz-sag"><b>${h.fiyat ? TL(h.fiyat) : 'Ücretsiz'}</b><span class="dk-ekle" aria-hidden="true">${ikon(on ? 'tik' : 'arti')}</span></span></button>`;
}
function hizmetSec(id) {
  const on = S.secim.h.includes(id);
  const sira = S.isletme.hizmetler.map((h) => h.id);
  S.secim.h = (on ? S.secim.h.filter((x) => x !== id) : [...S.secim.h, id]).sort((a, b) => sira.indexOf(a) - sira.indexOf(b));
  S.secim.tarih = ''; S.secim.dk = null; S.secim.atanan = '';
  const b = $(`#hizmetler [data-h="${CSS.escape(id)}"]`);
  if (b) b.outerHTML = hizmetSatir(S.isletme.hizmetler.find((h) => h.id === id));
  $(`#hizmetler [data-h="${CSS.escape(id)}"]`)?.addEventListener('click', () => hizmetSec(id));
  sepetCiz();
}

// ---- ekip
function ekipCiz() {
  const el = $('#dkEkip'); if (!el) return;
  const s = S.isletme;
  el.innerHTML = s.personel.map((p) => `<button class="dk-kisi${S.secim.p === p.id ? ' on' : ''}" type="button" data-kisi="${esc(p.id)}" aria-label="${esc(p.ad)} profili">
    ${S.secim.p === p.id ? `<span class="dk-kisi-sec">${ikon('tik', 'kk')}Seçildi</span>` : ''}
    ${avatar(p, 68)}<b>${esc(p.ad)}</b><small>${esc([p.unvan || kisiAd(s), p.deneyim ? `${p.deneyim} yıl deneyim` : ''].filter(Boolean).join(' · '))}</small>
    ${p.uzmanlik?.length ? `<span class="dk-kisi-uz">${p.uzmanlik.slice(0, 2).map((u) => `<i>${esc(u)}</i>`).join('')}${p.uzmanlik.length > 2 ? `<i>+${p.uzmanlik.length - 2}</i>` : ''}</span>` : ''}
    ${p.isler?.length ? `<span class="dk-kisi-is">${p.isler.slice(0, 3).map((x) => `<img src="${esc(x.foto)}" alt="" loading="lazy">`).join('')}</span>` : ''}
    <em data-ilk="${esc(p.id)}">&nbsp;</em><span class="dk-kisi-bag">Profili gör</span></button>`).join('');
  el.querySelectorAll('[data-kisi]').forEach((b) => (b.onclick = () => ustaProfil(b.dataset.kisi)));
}
/** Ustayı seçer (ya da seçimi kaldırır) ve hizmetlere kaydırır */
function ustaSec(id) {
  const s = S.isletme, p = s.personel.find((x) => x.id === id);
  S.secim.p = S.secim.p === id ? '' : id;
  if (S.secim.p) S.secim.h = S.secim.h.filter((h) => yapar(p, h));
  S.secim.tarih = ''; S.secim.dk = null; S.secim.atanan = '';
  hizmetCiz(); ekipCiz(); sepetCiz(); ilkBosYaz();
  if (S.secim.p) { const e = $('#hizmetler'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 112, behavior: 'smooth' }); }
}
/** Usta profili: hakkında, uzmanlıklar, çalışmaları, yaptığı hizmetler */
function ustaProfil(id) {
  const s = S.isletme, p = s.personel.find((x) => x.id === id); if (!p) return;
  const H = s.hizmetler.filter((h) => yapar(p, h.id)), secili = S.secim.p === id;
  const c = cekmece({
    baslik: esc(p.ad), genis: true,
    govde: `<div class="up">
      <div class="up-bas">${avatar(p, 84)}<div><p class="up-unvan">${esc([p.unvan || kisiAd(s), p.deneyim ? `${p.deneyim} yıl deneyim` : ''].filter(Boolean).join(' · '))}</p><p class="up-bos"><em data-ilk="${esc(p.id)}">&nbsp;</em></p></div></div>
      ${p.hakkinda ? `<p class="up-hakkinda">${esc(p.hakkinda)}</p>` : ''}
      ${p.uzmanlik?.length ? `<div class="up-uz">${p.uzmanlik.map((u) => `<span>${esc(u)}</span>`).join('')}</div>` : ''}
      ${p.isler?.length ? `<h4>Çalışmaları <small>${p.isler.length}</small></h4><div class="up-isler">${p.isler.map((x, i) => `<button type="button" data-is="${i}" aria-label="Fotoğraf ${i + 1}${x.not ? ': ' + esc(x.not) : ''}"><img src="${esc(x.foto)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      <h4>Yaptığı hizmetler <small>${H.length}</small></h4><ul class="up-hizmet">${H.map((h) => `<li><span>${esc(h.ad)}<small>${esc(C.sureYaz(h.sure))}</small></span><b>${h.fiyat ? TL(h.fiyat) : 'Ücretsiz'}</b></li>`).join('')}</ul>
    </div>`,
    alt: `<button class="dg sade" type="button" data-kapat>Kapat</button><button class="dg ana" type="button" data-sec>${secili ? 'Seçimi kaldır' : `${esc(p.ad)} ile randevu al`}</button>`,
  });
  c.el.classList.add('up-cekmece');
  ilkBosYaz(c.el);
  c.el.querySelector('[data-sec]').onclick = () => { c.kapat(); ustaSec(id); };
  c.el.querySelectorAll('[data-is]').forEach((b) => (b.onclick = () => isGoster(p.isler.map((x) => ({ ...x, p })), +b.dataset.is)));
}
/** Tüm ustaların çalışmaları, yeniden eskiye */
function isler(s) { return s.personel.flatMap((p) => (p.isler || []).map((x) => ({ ...x, p }))).sort((a, b) => (b.t || 0) - (a.t || 0)); }
let isSuzgec = '', isHepsi = false;
function isCiz() {
  const el = $('#dkIs'); if (!el) return;
  const s = S.isletme, W = isler(s), kisiler = s.personel.filter((p) => p.isler?.length);
  if (isSuzgec && !kisiler.some((p) => p.id === isSuzgec)) isSuzgec = '';
  const L = isSuzgec ? W.filter((x) => x.p.id === isSuzgec) : W, gor = isHepsi ? L : L.slice(0, 9);
  el.innerHTML = `${kisiler.length > 1 ? `<div class="dk-is-suz" role="group" aria-label="Ustaya göre">${[['', 'Tümü', W.length], ...kisiler.map((p) => [p.id, p.ad, p.isler.length])].map(([k, a, n]) => `<button type="button" class="cip${isSuzgec === k ? ' on' : ''}" data-suz="${esc(k)}" aria-pressed="${isSuzgec === k}">${esc(a)} <small>${n}</small></button>`).join('')}</div>` : ''}
    <div class="dk-isler">${gor.map((x, i) => `<button type="button" class="dk-is" data-is="${i}" aria-label="${esc(x.p.ad)}${x.not ? ': ' + esc(x.not) : ''}"><img src="${esc(x.foto)}" alt="" loading="lazy">${kisiler.length > 1 && !isSuzgec ? `<span>${avatar(x.p, 20)}${esc(x.p.ad)}</span>` : ''}</button>`).join('')}</div>
    ${L.length > gor.length ? `<button type="button" class="dg cizgili tam dk-is-hepsi" data-hepsi>Tümünü gör (${L.length})</button>` : ''}`;
  el.querySelectorAll('[data-suz]').forEach((b) => (b.onclick = () => { isSuzgec = b.dataset.suz; isHepsi = false; isCiz(); }));
  el.querySelector('[data-hepsi]')?.addEventListener('click', () => { isHepsi = true; isCiz(); });
  el.querySelectorAll('[data-is]').forEach((b) => (b.onclick = () => isGoster(L, +b.dataset.is)));
}
function isGoster(L, i) {
  const s = S.isletme;
  galeriAc(L, i, {
    alt: (x) => `<div class="gl-bilgi">${avatar(x.p, 40)}<span><b>${esc(x.p.ad)}</b><small>${esc([x.not, s.hizmetler.find((h) => h.id === x.hizmet)?.ad].filter(Boolean).join(' · ') || x.p.unvan || kisiAd(s))}</small></span></div>
      <button type="button" class="dg ana" data-gsec>${S.secim.p === x.p.id ? 'Hizmet seçmeye dön' : 'Bu ustadan randevu al'}</button>`,
    bagla: (el, x, kapat) => { el.querySelector('[data-gsec]').onclick = () => { kapat(); if (S.secim.p !== x.p.id) ustaSec(x.p.id); else $('#hizmetler')?.scrollIntoView({ behavior: 'smooth' }); }; },
  });
}
/** Bugün ve yarın için ilk boş saat (ekip kartları ve kişi seçimi) */
async function ilkBosYaz(kap = document) {
  const s = S.isletme;
  try {
    const sim = simdiTR();
    if (!S.ilk || Date.now() - S.ilk.t > 60e3) { const v = await api.takvim(S.slug, '*', sim.tarih, 2); S.ilk = { t: Date.now(), v: v.personel }; }
    for (const p of s.personel) {
      const e = kap.querySelector(`[data-ilk="${CSS.escape(p.id)}"]`); if (!e) continue;
      const H = S.secim.h.length ? secilenHizmet() : s.hizmetler.filter((h) => yapar(p, h.id));
      const sure = S.secim.h.length ? toplamSure() : Math.min(60, ...H.map((h) => h.sure));
      const G = S.ilk.v[p.id] || [];
      const ilk = (g) => g && C.saatListesi({ calisma: g.c, dolu: g.d, sure, adim: s.ayar.adim, ara: s.ayar.ara, enErken: g.t === sim.tarih ? sim.dk + s.ayar.enAzOnce : -1 }).find((x) => x.bos);
      const b0 = ilk(G[0]), b1 = ilk(G[1]);
      e.textContent = b0 ? `Bugün ${C.saatYaz(b0.dk)}` : b1 ? `Yarın ${C.saatYaz(b1.dk)}` : G[0]?.izin === 'izin' ? 'Bugün izinli' : 'Yakında boş saat yok';
      e.className = b0 || b1 ? 'iyi' : '';
    }
  } catch { /* ilk boş saat gösterilmez */ }
}

// ---- ürünler
function urunBolum(U) {
  const kart = (u) => `<div class="dk-urun${u.tukendi ? ' tukendi' : ''}">
    <div class="dk-urun-g">${u.foto ? `<img src="${esc(u.foto)}" alt="" loading="lazy">` : ikon('urun')}${u.tukendi ? '<span>Tükendi</span>' : ''}</div>
    <b>${esc(u.ad)}</b>${u.aciklama ? `<small>${esc(u.aciklama)}</small>` : ''}<span class="dk-urun-f">${u.fiyat ? TL(u.fiyat) : ''}</span></div>`;
  const G = new Map();
  for (const u of U) { const k = u.kategori || ''; if (!G.has(k)) G.set(k, []); G.get(k).push(u); }
  const baslikli = G.size > 1 || !!U[0]?.kategori;
  return `${[...G].map(([k, L]) => `<div class="dk-grup">${baslikli ? `<h3>${esc(k || 'Diğer')}</h3>` : ''}<div class="dk-urunler">${L.map(kart).join('')}</div></div>`).join('')}
    <p class="kucuk-yazi dk-not">Ürünler işletmede satılır; fiyatlar bilgi içindir.</p>`;
}

// ---- bilgiler
function bilgiBolum() {
  const s = S.isletme, sim = simdiTR(), i = s.iletisim || {}, a = s.ayar;
  const adres = [i.adres, i.ilce, i.sehir].filter(Boolean).join(', ');
  const harita = i.harita || (i.adres ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.ad, i.adres, i.ilce, i.sehir].filter(Boolean).join(', '))}` : '');
  const kapali = (s.kapali || []).filter((k) => k.bit >= sim.tarih).slice(0, 4);
  const kural = a.onOdeme === 'yok' ? 'Ön ödeme istenmez; işletme randevunuzu onaylayınca kesinleşir.'
    : a.onOdeme === 'kapora' ? `Randevuyu kesinleştirmek için ${TL(a.kapora)} kapora önceden gönderilir; kalan tutar işletmede ödenir.`
      : 'Randevuyu kesinleştirmek için hizmet bedeli önceden, kişinin IBAN\'ına gönderilir.';
  const iletisim = [
    adres ? `<li>${ikon('konum', 'k')}<span>${esc(adres)}${harita ? `<a href="${esc(harita)}" target="_blank" rel="noopener">Haritada aç</a>` : ''}</span></li>` : '',
    i.telefon ? `<li>${ikon('telefon', 'k')}<span><a href="tel:${esc(i.telefon)}">${esc(C.telYaz(i.telefon))}</a></span></li>` : '',
    i.instagram ? `<li>${ikon('instagram', 'k')}<span><a href="https://instagram.com/${esc(i.instagram)}" target="_blank" rel="noopener">@${esc(i.instagram)}</a></span></li>` : '',
  ].filter(Boolean).join('');
  return `<div class="dk-bolum-bas"><h2>Bilgiler</h2></div>
    <div class="dk-bilgi">
      <div class="dk-bilgi-k"><h3>Çalışma saatleri</h3>
        <ul class="dk-saatler">${C.HAFTA.map((g) => `<li class="${g === sim.gun ? 'bugun' : ''}"><span>${C.GUNLER[g]}${g === sim.gun ? ' <em>bugün</em>' : ''}</span><b>${esc(C.calismaYaz(s.calisma?.[g]))}</b></li>`).join('')}</ul>
        ${kapali.length ? `<p class="kucuk-yazi dk-kapali">Kapalı olduğu günler: ${kapali.map((k) => esc(k.bas === k.bit ? C.tarihYaz(k.bas, { yil: false }) : `${C.tarihYaz(k.bas, { yil: false })} – ${C.tarihYaz(k.bit, { yil: false })}`) + (k.neden ? ` (${esc(k.neden)})` : '')).join(', ')}</p>` : ''}
      </div>
      ${iletisim ? `<div class="dk-bilgi-k"><h3>Adres ve iletişim</h3><ul class="dk-iletisim">${iletisim}</ul></div>` : ''}
      <div class="dk-bilgi-k"><h3>Randevu kuralları</h3><ul class="dk-kurallar">
        <li>${ikon('kart', 'k')}<span>${kural}</span></li>
        ${a.onOdeme !== 'yok' ? `<li>${ikon('saat', 'k')}<span>Saatiniz ödeme için ${a.odemeSure} dakika ayrılır; bu sürede gönderip “Ödeme yaptım”a basarsınız.</span></li>` : ''}
        <li>${ikon('takvim', 'k')}<span>${a.iptalSaat ? `Randevuya ${a.iptalSaat} saat kalana kadar iptal edebilirsiniz.` : 'Randevunuzu dilediğiniz zaman iptal edebilirsiniz.'}</span></li>
        <li>${ikon('kilit', 'k')}<span>Üyelik gerekmez. Adınız ve telefonunuz yalnızca randevunuz için işletmeyle paylaşılır.</span></li>
      </ul></div>
    </div>`;
}

// ---- seçim özeti: masaüstünde yan kart, telefonda alt çubuk
function sepetCiz() {
  const s = S.isletme, H = secilenHizmet(), n = H.length, sure = toplamSure(), fiyat = toplamFiyat();
  const yan = $('#dkYan');
  if (yan) {
    yan.innerHTML = n ? `<h3>Randevunuz</h3>${oncekiKisi() && s.personel.length > 1 ? `<p class="dk-yan-kisi">${avatar(oncekiKisi(), 28)}<span>${esc(oncekiKisi().ad)}</span></p>` : ''}
      <ul class="dk-yan-liste">${H.map((h) => `<li><span>${esc(h.ad)}<small>${esc(C.sureYaz(h.sure))}</small></span><b>${h.fiyat ? TL(h.fiyat) : 'Ücretsiz'}</b><button type="button" data-cikar="${esc(h.id)}" aria-label="${esc(h.ad)} çıkar">${ikon('carpi', 'kk')}</button></li>`).join('')}</ul>
      <div class="dk-yan-toplam"><span>Toplam · ${esc(C.sureYaz(sure))}</span><b>${fiyat ? TL(fiyat) : 'Ücretsiz'}</b></div>
      <button class="dg ana buyuk tam" type="button" data-devam>Devam et</button>`
      : `<h3>Randevunuz</h3><p class="soluk">Listeden bir ya da birkaç hizmet seçin; ardından ${esc(kisiAd(s, true))} ve saat seçersiniz.</p>
      <ol class="dk-yan-adim"><li>Hizmet</li><li>${esc(kisiAd(s))}</li><li>Gün ve saat</li><li>Ön ödeme ve onay</li></ol>`;
    yan.querySelectorAll('[data-cikar]').forEach((b) => (b.onclick = () => hizmetSec(b.dataset.cikar)));
  }
  const b = $('#dkSepet'); if (!b) return;
  b.hidden = !n; document.body.classList.toggle('dk-sepet-var', n > 0);
  b.innerHTML = n ? `<div class="dk-sepet-ic"><span class="dk-sepet-yazi"><b>${n} hizmet · ${esc(C.sureYaz(sure))}</b><small>${fiyat ? TL(fiyat) : 'Ücretsiz'}</small></span><button class="dg ana" type="button" data-devam>Devam et</button></div>` : '';
  KOK().querySelectorAll('[data-devam]').forEach((x) => (x.onclick = devam));
}
function devam() {
  const U = uygun();
  if (!U.length) return bildir(`Seçtiğiniz hizmetlerin hepsini yapan bir ${kisiAd(S.isletme, true)} yok. Hizmetleri ayrı randevularla alın.`, { hata: true, sure: 6000 });
  if (S.secim.p && S.secim.p !== '*' && !U.some((p) => p.id === S.secim.p)) S.secim.p = '';
  if (!S.secim.p && U.length === 1) S.secim.p = U[0].id;
  adimGit(S.secim.p ? 'saat' : 'usta');
}

// ---------------------------------------------------------------- randevu adımları
function akis(adim) {
  const s = S.isletme, cokKisi = uygun().length > 1;
  const sira = ['hizmet', ...(cokKisi ? ['usta'] : []), 'saat', 'bilgi'], n = sira.indexOf(adim) + 1, top = sira.length;
  const ad = { usta: `${kisiAd(s)} seçin`, saat: 'Gün ve saat', bilgi: 'Bilgileriniz' }[adim];
  const geri = adim === 'usta' ? `/randevu/${s.slug}` : adim === 'saat' ? (cokKisi ? `/randevu/${s.slug}?adim=usta` : `/randevu/${s.slug}`) : `/randevu/${s.slug}?adim=saat`;
  document.title = `${ad} · ${s.ad}`;
  KOK().innerHTML = `<div class="dk dk-akis">${ustBar({ baslik: ad, alt: s.ad, geri, adim: `${n}/${top}` })}<div class="dk-ilerleme" aria-hidden="true"><i style="width:${Math.round((n / top) * 100)}%"></i></div>
    <div class="dk-ic dk-duzen"><main class="dk-ana" id="rvAdim"></main><aside class="dk-yan"><div class="dk-yan-kart" id="dkYan"></div></aside></div>${imza()}</div><div class="dk-sepet" id="dkSepet" hidden></div>`;
  ozetYan();
  ({ usta: ustaAdim, saat: saatAdim, bilgi: bilgiAdim })[adim]($('#rvAdim'));
}
/** Masaüstü yan kart: seçilenlerin özeti */
function ozetYan() {
  const yan = $('#dkYan'); if (!yan) return;
  const s = S.isletme, H = secilenHizmet(), p = kisi(), fiyat = toplamFiyat(), kapora = C.onOdemeTutar(s.ayar, fiyat), sim = simdiTR();
  const satir = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  yan.innerHTML = `<div class="dk-yan-isl">${logo(s, 44)}<span><b>${esc(s.ad)}</b><small>${esc(C.turAd(s.tur))}</small></span></div>
    <dl class="dk-yan-dl">${p ? satir(esc(kisiAd(s)), esc(p.ad)) : S.secim.p === '*' ? satir(esc(kisiAd(s)), 'Fark etmez') : ''}
    ${S.secim.tarih && S.secim.dk != null ? satir('Gün', esc(C.tarihYaz(S.secim.tarih, { gun: true, yil: false })) + (S.secim.tarih === sim.tarih ? ' (bugün)' : '')) + satir('Saat', `${C.saatYaz(S.secim.dk)}–${C.saatYaz(S.secim.dk + toplamSure())}`) : ''}</dl>
    <ul class="dk-yan-liste">${H.map((h) => `<li><span>${esc(h.ad)}<small>${esc(C.sureYaz(h.sure))}</small></span><b>${h.fiyat ? TL(h.fiyat) : 'Ücretsiz'}</b></li>`).join('')}</ul>
    <div class="dk-yan-toplam"><span>Toplam · ${esc(C.sureYaz(toplamSure()))}</span><b>${fiyat ? TL(fiyat) : 'Ücretsiz'}</b></div>
    ${kapora > 0 ? `<p class="dk-yan-not">${ikon('kart', 'kk')}<span>Ön ödeme ${TL(kapora)}${kapora < fiyat ? `; kalan ${TL(fiyat - kapora)} işletmede ödenir` : ''}.</span></p>` : ''}`;
}
function cubuk(html, bagla) {
  const b = $('#dkSepet'); if (!b) return;
  b.hidden = !html; document.body.classList.toggle('dk-sepet-var', !!html);
  b.innerHTML = html ? `<div class="dk-sepet-ic">${html}</div>` : '';
  if (html && bagla) bagla(b);
}
function secimSatiri(degistir) {
  const s = S.isletme, p = kisi() || oncekiKisi();
  const kimde = S.secim.p === '*' ? `<span class="dk-sec-ikon">${ikon('ekip', 'k')}</span><span><b>Fark etmez</b>` : p ? `${avatar(p, 36)}<span><b>${esc(p.ad)}</b>` : '<span><b></b>';
  return `<div class="dk-secim">${kimde}<small>${esc(hizmetYazi(secilenHizmet()))} · ${esc(C.sureYaz(toplamSure()))} · ${toplamFiyat() ? TL(toplamFiyat()) : 'Ücretsiz'}</small></span>${degistir ? `<a href="${href(degistir)}" data-git="${esc(degistir)}">Değiştir</a>` : ''}</div>`;
}

// ---- kişi
function ustaAdim(el) {
  const s = S.isletme, U = uygun();
  cubuk('');
  el.innerHTML = `<h2 class="dk-adim-b">Kiminle randevu almak istersiniz?</h2>${secimSatiri(`/randevu/${s.slug}`)}
    <div class="dk-secenekler">
      <button class="dk-secenek${S.secim.p === '*' ? ' on' : ''}" type="button" data-p="*"><span class="dk-sec-ikon buyuk">${ikon('ekip')}</span><span><b>Fark etmez</b><small>Uygun olan herkesin boş saatleri birlikte görünür</small></span>${ikon('sag', 'k')}</button>
      ${U.map((p) => `<button class="dk-secenek${S.secim.p === p.id ? ' on' : ''}" type="button" data-p="${esc(p.id)}">${avatar(p, 48)}<span><b>${esc(p.ad)}</b><small>${esc(p.unvan || kisiAd(s))}</small><em data-ilk="${esc(p.id)}">&nbsp;</em></span>${ikon('sag', 'k')}</button>`).join('')}
    </div>`;
  el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => {
    if (S.secim.p !== b.dataset.p) { S.secim.p = b.dataset.p; S.secim.tarih = ''; S.secim.dk = null; S.secim.atanan = ''; }
    adimGit('saat');
  }));
  ilkBosYaz(el);
}

// ---- gün ve saat
async function saatAdim(el) {
  const s = S.isletme, tum = S.secim.p === '*', P = tum ? uygun() : uygun().filter((p) => p.id === S.secim.p);
  if (!P.length) return adimGit(uygun().length > 1 ? 'usta' : '', true);
  el.innerHTML = `<h2 class="dk-adim-b">Gün ve saat seçin</h2>${secimSatiri(uygun().length > 1 ? `/randevu/${s.slug}?adim=usta` : `/randevu/${s.slug}`)}<div id="rvTakvim">${yukleniyor()}</div>`;
  saatCubuk();
  const sim = simdiTR(), n = Math.min(35, s.ayar.ileriGun + 1);
  try {
    await Promise.all(P.map(async (p) => {
      const T = S.takvim[p.id];
      if (T && Date.now() - T.t < 45e3 && T.bas === sim.tarih) return;
      const v = await api.takvim(S.slug, p.id, sim.tarih, n);
      S.takvim[p.id] = { t: Date.now(), bas: sim.tarih, gunler: v.personel[p.id] }; S.fark = v.simdi.ms - Date.now();
    }));
  } catch (e) { $('#rvTakvim').innerHTML = hataKutu(e.message); $('#rvTakvim [data-tekrar]').onclick = () => saatAdim(el); return; }
  if (!$('#rvTakvim')) return;
  takvimCiz(P);
}
/** Bir gün için saatler; "fark etmez"de kişilerin boş saatleri birleşir (her saat için boş olanlar: kim) */
function gunDurum(P, t) {
  const s = S.isletme, sim = simdiTR(), sure = toplamSure(), M = new Map(), G = [];
  for (const p of P) {
    const g = S.takvim[p.id]?.gunler.find((x) => x.t === t); if (!g) continue;
    G.push({ p, g });
    for (const x of C.saatListesi({ calisma: g.c, dolu: g.d, sure, adim: s.ayar.adim, ara: s.ayar.ara, enErken: t === sim.tarih ? sim.dk + s.ayar.enAzOnce : -1 })) {
      if (!M.has(x.dk)) M.set(x.dk, []);
      if (x.bos) M.get(x.dk).push(p.id);
    }
  }
  const L = [...M].sort((a, b) => a[0] - b[0]).map(([dk, kim]) => ({ dk, bos: kim.length > 0, kim }));
  return { t, G, L, bos: L.filter((x) => x.bos).length, c: C.birlestir(G.flatMap((x) => x.g.c)) };
}
function takvimCiz(P) {
  const s = S.isletme, sim = simdiTR(), tum = S.secim.p === '*';
  const gunler = (S.takvim[P[0].id]?.gunler || []).map((g) => g.t);
  const durumlar = gunler.map((t) => gunDurum(P, t));
  if (!S.secim.tarih || !gunler.includes(S.secim.tarih)) S.secim.tarih = (durumlar.find((d) => d.bos) || durumlar[0]).t;
  const sec = durumlar.find((d) => d.t === S.secim.tarih);
  const cip = (d) => {
    const isletmeAcik = C.gunCalisma(s, null, d.t).length, hepsiIzin = d.G.length && d.G.every((x) => x.g.izin === 'izin');
    const alt = !d.c.length ? (d.G.some((x) => x.g.izin === 'kapali') || !isletmeAcik ? 'Kapalı' : hepsiIzin || !tum ? 'İzinli' : 'Kapalı') : !d.bos ? 'Dolu' : `${d.bos} boş`;
    return `<button class="rv-gun${d.t === S.secim.tarih ? ' on' : ''}${!d.bos ? ' yok' : ''}" type="button" data-t="${d.t}"><small>${d.t === sim.tarih ? 'Bugün' : d.t === C.gunEkle(sim.tarih, 1) ? 'Yarın' : C.GUN_KISA[C.haftaGunu(d.t)]}</small><b>${+d.t.slice(8)}</b><span>${esc(C.AYLAR[+d.t.slice(5, 7) - 1].slice(0, 3))}</span><em>${alt}</em></button>`;
  };
  const gruplar = [['Sabah', (x) => x.dk < 720], ['Öğleden sonra', (x) => x.dk >= 720 && x.dk < 1020], ['Akşam', (x) => x.dk >= 1020]];
  const kutular = sec.L.length ? gruplar.map(([ad, f]) => {
    const L = sec.L.filter(f);
    return L.length ? `<div class="rv-saat-grup"><p>${ad}</p><div class="rv-saatler">${L.map((x) => `<button type="button" class="rv-saat${x.bos ? '' : ' dolu'}${x.dk === S.secim.dk && x.bos ? ' on' : ''}" ${x.bos ? `data-dk="${x.dk}"` : 'disabled aria-label="' + C.saatYaz(x.dk) + ' dolu"'}>${C.saatYaz(x.dk)}</button>`).join('')}</div></div>` : '';
  }).join('') : '';
  const ileri = durumlar.find((d) => d.t > sec.t && d.bos), p0 = P[0], g0 = sec.G[0]?.g;
  let bilgi = '';
  if (!sec.c.length) bilgi = !tum && g0?.izin === 'izin' ? `${esc(p0.ad)} bu gün izinli.` : g0?.izin === 'kapali' || !C.gunCalisma(s, null, sec.t).length ? 'İşletme bu gün kapalı.' : !tum ? `${esc(p0.ad)} ${C.GUNLER[C.haftaGunu(sec.t)].toLocaleLowerCase('tr')} günleri çalışmıyor.` : 'Bu gün çalışan yok.';
  else if (!sec.bos) bilgi = sec.L.length ? 'Bu gün için boş saat kalmadı.' : 'Bu gün için randevu saati kalmadı.';
  const ay = C.AYLAR[+sec.t.slice(5, 7) - 1] + ' ' + sec.t.slice(0, 4);
  $('#rvTakvim').innerHTML = `<div class="dk-ay"><b>${esc(ay)}</b></div><div class="rv-gunler-kap"><div class="rv-gunler" role="listbox" aria-label="Gün seçin">${durumlar.map(cip).join('')}</div></div>
    <div class="rv-gun-bilgi"><b>${esc(C.tarihYaz(sec.t, { gun: true, yil: false }))}</b><span>${ikon('saat', 'kk')}${sec.c.length ? `${tum ? 'Çalışılan saatler' : 'Çalışma saatleri'}: ${esc(C.calismaYaz(sec.c))}` : 'Çalışılmıyor'}</span></div>
    ${sec.L.length && sec.bos ? '<div class="rv-lejant"><span><i class="l-bos"></i>Boş</span><span><i class="l-dolu"></i>Dolu</span></div>' : ''}
    ${bilgi ? `<div class="rv-bos-gun">${ikon('takvim')}<p>${bilgi}</p>${ileri ? `<button class="dg cizgili kucuk" type="button" data-t="${ileri.t}">İlk boş gün: ${esc(C.gunAdi(ileri.t, sim.tarih))}</button>` : ''}</div>` : ''}
    ${kutular}${sec.L.length && sec.t === sim.tarih && s.ayar.enAzOnce ? `<p class="kucuk-yazi" style="margin-top:12px">Bugün için en az ${esc(C.sureYaz(s.ayar.enAzOnce))} sonrasına randevu alınabilir.</p>` : ''}`;
  const kap = $('.rv-gunler'), on = kap.querySelector('.on'); if (on) kap.scrollLeft += on.getBoundingClientRect().left - kap.getBoundingClientRect().left - 16;
  $$('#rvTakvim [data-t]').forEach((b) => (b.onclick = () => { S.secim.tarih = b.dataset.t; S.secim.dk = null; S.secim.atanan = ''; takvimCiz(P); }));
  $$('#rvTakvim [data-dk]').forEach((b) => (b.onclick = () => {
    const dk = +b.dataset.dk, x = sec.L.find((z) => z.dk === dk);
    S.secim.dk = dk;
    // fark etmez: o saatte boş olanlardan o gün en az dolu olan
    if (tum) { const yuk = (pid) => (sec.G.find((z) => z.p.id === pid)?.g.d || []).reduce((n, [a, c]) => n + (c - a), 0); S.secim.atanan = [...x.kim].sort((a, c) => yuk(a) - yuk(c))[0]; }
    $$('#rvTakvim .rv-saat.on').forEach((z) => z.classList.remove('on')); b.classList.add('on'); saatCubuk();
  }));
  saatCubuk();
}
function saatCubuk() {
  const ok = S.secim.dk != null && !!kisi(), p = kisi();
  cubuk(ok ? `<span class="dk-sepet-yazi"><b>${esc(C.gunAdi(S.secim.tarih, simdiTR().tarih))} · ${C.saatYaz(S.secim.dk)}–${C.saatYaz(S.secim.dk + toplamSure())}</b><small>${esc(p.ad)} · ${toplamFiyat() ? TL(toplamFiyat()) : 'Ücretsiz'}</small></span><button class="dg ana" type="button" data-ileri>Devam et</button>`
    : `<span class="dk-sepet-yazi"><b>Saat seçin</b><small>${esc(C.sureYaz(toplamSure()))} · ${toplamFiyat() ? TL(toplamFiyat()) : 'Ücretsiz'}</small></span><button class="dg ana" type="button" disabled>Devam et</button>`,
  (b) => b.querySelector('[data-ileri]')?.addEventListener('click', () => adimGit('bilgi')));
  ozetYan();
  const yan = $('#dkYan');
  if (yan) { yan.insertAdjacentHTML('beforeend', `<button class="dg ana buyuk tam" type="button" data-ileri${ok ? '' : ' disabled'}>Devam et</button>`); yan.querySelector('[data-ileri]').onclick = () => adimGit('bilgi'); }
}

// ---- bilgiler ve gönderme
function bilgiAdim(el) {
  const s = S.isletme, p = kisi(), H = secilenHizmet(), fiyat = toplamFiyat(), kapora = C.onOdemeTutar(s.ayar, fiyat), sim = simdiTR();
  const m = yerel.json('rv-musteri', {});
  cubuk('');
  const dugme = kapora > 0 ? 'Saati ayırt ve ödemeye geç' : 'Randevu iste';
  el.innerHTML = `<h2 class="dk-adim-b">Bilgileriniz</h2>
    <div class="dk-ozet-kart">
      <div class="dk-ozet-bas">${avatar(p, 44)}<span><b>${esc(p.ad)}</b><small>${esc(p.unvan || kisiAd(s))}</small></span><a href="${href(`/randevu/${s.slug}?adim=saat`)}" data-git="/randevu/${esc(s.slug)}?adim=saat">Değiştir</a></div>
      <dl class="rv-dl"><div><dt>Gün</dt><dd>${esc(C.tarihYaz(S.secim.tarih, { gun: true, yil: false }))}${S.secim.tarih === sim.tarih ? ' (bugün)' : ''}</dd></div>
      <div><dt>Saat</dt><dd>${C.saatYaz(S.secim.dk)}–${C.saatYaz(S.secim.dk + toplamSure())}</dd></div>
      <div><dt>Hizmet</dt><dd>${H.map((h) => `${esc(h.ad)} <span class="soluk">${h.fiyat ? TL(h.fiyat) : ''}</span>`).join('<br>')}</dd></div>
      <div class="toplam"><dt>Toplam</dt><dd>${fiyat ? TL(fiyat) : 'Ücretsiz'}</dd></div>
      ${kapora > 0 ? `<div class="vurgu"><dt>Ön ödeme</dt><dd>${TL(kapora)}${kapora < fiyat ? ` <span class="soluk">· kalan ${TL(fiyat - kapora)} işletmede</span>` : ''}</dd></div>` : ''}</dl></div>
    <form class="dk-form" id="rvF" autocomplete="on" novalidate>
      <label class="alan"><span>Adınız ve soyadınız</span><input class="girdi" name="ad" autocomplete="name" autocapitalize="words" required maxlength="60" value="${esc(m.ad || '')}" placeholder="Ör. Ahmet Yılmaz"></label>
      <label class="alan"><span>Cep telefonunuz</span><input class="girdi" name="tel" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" value="${esc(m.tel || '')}" placeholder="05xx xxx xx xx"></label>
      <label class="alan"><span>Not <em class="soluk">(isteğe bağlı)</em></span><textarea class="girdi" name="not" rows="2" maxlength="300" placeholder="Ör. sakal kısa olsun"></textarea></label>
      <input type="text" name="web" tabindex="-1" autocomplete="off" class="rv-tuzak" aria-hidden="true">
      <p class="hata-yazi" id="rvH" role="alert"></p>
      <button class="dg ana buyuk tam" type="submit">${dugme}</button>
      <p class="kucuk-yazi dk-kvkk">${kapora > 0 ? `Saatiniz ${s.ayar.odemeSure} dakika sizin için ayrılır. Bu sürede ${esc(C.ek(p.ad))} hesabına ${TL(kapora)} gönderip “Ödeme yaptım”a basmanız gerekir; ödeme görülünce randevunuz kesinleşir.` : `${esc(p.ad)} randevunuzu onaylayınca kesinleşir.`} Adınız ve telefonunuz yalnızca bu randevu için ${esc(s.ad)} ile paylaşılır.</p>
    </form>`;
  const f = $('#rvF');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)), h = $('#rvH'), btn = f.querySelector('button[type=submit]');
    h.textContent = '';
    if (C.str(v.ad).length < 4 || !/\S+\s+\S+/.test(C.str(v.ad))) { h.textContent = 'Adınızı ve soyadınızı yazın.'; f.ad.focus(); return; }
    if (!C.cepMi(C.telNorm(v.tel))) { h.textContent = 'Geçerli bir cep telefonu yazın (05xx xxx xx xx).'; f.tel.focus(); return; }
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    try {
      const r = await api.randevuAl(S.slug, { personel: p.id, hizmetler: S.secim.h, tarih: S.secim.tarih, saat: C.saatYaz(S.secim.dk), ad: v.ad, tel: v.tel, not: v.not, web: v.web });
      yerel.koy('rv-musteri', JSON.stringify({ ad: C.str(v.ad, 60), tel: v.tel }));
      randevuKaydet({ kod: r.kod, slug: S.slug, isletme: s.ad, personel: p.ad, tarih: r.randevu.tarih, bas: r.randevu.bas, bit: r.randevu.bit, durum: r.randevu.durum });
      S.takvim = {}; S.ilk = null; S.secim = { p: s.personel.length === 1 ? p.id : '', h: [], tarih: '', dk: null, atanan: '' };
      durumOnbellek = { kod: r.kod, v: r };
      git(`/randevu/${s.slug}/r/${r.kod}`, { degistir: true, kaydirma: true });
    } catch (er) {
      btn.disabled = false; btn.textContent = dugme;
      if (er.durum === 409) { delete S.takvim[p.id]; S.secim.dk = null; S.secim.atanan = ''; bildir(er.message, { hata: true, sure: 6000 }); adimGit('saat', true); return; }
      h.textContent = er.message;
    }
  });
}

// ---------------------------------------------------------------- randevu durum sayfası
let durumOnbellek = null;
export async function durumSayfasi(slug, kod) {
  metaRobots(true);
  temizle();
  let v;
  if (durumOnbellek?.kod === kod) { v = durumOnbellek.v; durumOnbellek = null; }
  else {
    if (!KOK().querySelector('.dk-durum-sayfa')) KOK().innerHTML = `<div class="dk">${yukleniyor()}</div>`;
    try { v = await api.durum(kod); } catch (e) {
      KOK().innerHTML = `<div class="dk"><div class="dk-ic dk-dar dk-yok">${ikon('uyari')}<h1>${e.durum === 404 ? 'Randevu bulunamadı' : 'Bağlanılamadı'}</h1><p class="soluk">${esc(e.message)}</p>${e.durum === 404 ? `<a class="dg ana" href="${href('/randevu/' + slug)}" data-git="/randevu/${esc(slug)}">İşletme sayfasına git</a>` : '<button class="dg ana" type="button" onclick="location.reload()">Tekrar dene</button>'}</div>${imza()}</div>`;
      return;
    }
  }
  durumCiz(slug, kod, v);
}
function durumCiz(slug, kod, v) {
  temizle();
  const s = v.isletme, p = v.personel, r = v.randevu, fark = v.simdi - Date.now(), sim = C.trSimdi(Date.now() + fark);
  temaUygula(s.tema);
  document.title = `Randevu · ${s.ad}`;
  randevuGuncelle(kod, { durum: r.durum });
  const gecti = C.trMs(r.tarih, r.bit) < Date.now() + fark;
  const yer = [s.ad, s.iletisim?.adres, s.iletisim?.ilce, s.iletisim?.sehir].filter(Boolean).join(', ');
  let bas;
  if (r.durum === 'odeme') bas = { ikon: 'kum', sinif: 'bekle', h: 'Ödemeyi yapın', p: `${esc(C.ek(p.ad))} hesabına <b>${TL(v.odeme.tutar)}</b> gönderin, sonra “Ödeme yaptım”a basın.` };
  else if (r.durum === 'kontrol') bas = { ikon: 'kum', sinif: 'bekle', h: v.odeme ? 'Ödemeniz kontrol ediliyor' : 'Onay bekleniyor', p: v.odeme ? `${esc(p.ad)} ödemeyi gördüğünde randevunuz kesinleşir. Bu sayfa kendiliğinden güncellenir.` : `${esc(p.ad)} randevunuzu onaylayınca kesinleşir. Bu sayfa kendiliğinden güncellenir.` };
  else if (r.durum === 'onay' && !gecti) bas = { ikon: 'tik', sinif: 'iyi', h: 'Randevunuz onaylandı', p: `${esc(C.gunAdi(r.tarih, sim.tarih))} saat ${C.saatYaz(r.bas)} · ${esc(p.ad)} sizi bekliyor.` };
  else if (r.durum === 'onay') bas = { ikon: 'tik', sinif: 'iyi', h: 'Randevu tamamlandı', p: 'Bizi tercih ettiğiniz için teşekkürler. Yine bekleriz.' };
  else if (r.durum === 'gelmedi') bas = { ikon: 'uyari', sinif: 'hata', h: 'Randevuya gelinmedi', p: 'Bu randevu “gelmedi” olarak kaydedildi.' };
  else {
    const kim = r.iptal?.kim, neden = r.iptal?.neden;
    bas = { ikon: 'carpi', sinif: 'hata', h: 'Randevu iptal edildi', p: kim === 'sistem' ? 'Ödeme süresi dolduğu için saat bırakıldı.' + (v.odeme ? ' Ödeme yaptıysanız aşağıdaki düğmeye basın; saat hâlâ boşsa randevunuz alınır.' : '') : kim === 'musteri' ? 'Randevuyu siz iptal ettiniz.' : `İşletme randevuyu iptal etti${neden ? `: ${esc(neden)}` : '.'}` + (neden === 'Ödeme ulaşmadı' ? ' Ödeme yaptıysanız lütfen işletmeyi arayın.' : '') };
  }
  const odemeVar = v.odeme && (r.durum === 'odeme' || (r.durum === 'iptal' && r.iptal?.kim === 'sistem'));
  const waMetin = `Merhaba ${p.ad}, ${C.tarihYaz(r.tarih, { yil: false })} ${C.saatYaz(r.bas)} randevusu için ${v.odeme ? `${TL(v.odeme.tutar)} ödemeyi “${r.ad}” adıyla gönderdim` : 'randevu talebinde bulundum'}. Randevu no: ${randevuNo(r.id)}`;
  const iletisim = [];
  if (p.tel) iletisim.push(`<a class="dg cizgili" href="${esc(waLink(p.tel, waMetin))}" target="_blank" rel="noopener">${ikon('whatsapp', 'k')}${esc(p.ad)} · WhatsApp</a>`);
  if (s.iletisim?.telefon) iletisim.push(`<a class="dg cizgili" href="tel:${esc(s.iletisim.telefon)}">${ikon('telefon', 'k')}İşletmeyi ara</a>`);
  if (s.iletisim?.harita && (r.durum === 'onay' || r.durum === 'kontrol') && !gecti) iletisim.push(`<a class="dg cizgili" href="${esc(s.iletisim.harita)}" target="_blank" rel="noopener">${ikon('konum', 'k')}Yol tarifi</a>`);
  KOK().innerHTML = `<div class="dk dk-durum-sayfa">
    <header class="dk-ust ad-gorunur"><div class="dk-ust-ic"><a class="dk-ust-d" href="${href('/randevu/' + s.slug)}" data-git="/randevu/${esc(s.slug)}" aria-label="İşletme sayfası">${ikon('sol')}</a>
      <a class="dk-ust-isl" href="${href('/randevu/' + s.slug)}" data-git="/randevu/${esc(s.slug)}">${logo(s, 32)}<span><b>${esc(s.ad)}</b><small>${esc(C.turAd(s.tur))}</small></span></a><span class="dk-ust-bos"></span></div></header>
    <main class="dk-ic dk-dar dk-durum-ic">
      <div class="rv-durum-bas ${bas.sinif}"><span class="rv-durum-ikon">${ikon(bas.ikon)}</span><h1>${bas.h}</h1><p>${bas.p}</p>${r.durum === 'odeme' ? '<p class="rv-sayac" id="rvSayac" aria-live="polite"></p>' : ''}</div>
      ${odemeVar ? odemeKart(v) : ''}
      ${r.durum === 'kontrol' && p.tel && v.odeme ? `<a class="dg ana buyuk tam rv-wa" href="${esc(waLink(p.tel, waMetin))}" target="_blank" rel="noopener">${ikon('whatsapp')}Ödemeyi ${esc(C.ek(p.ad, 'e'))} WhatsApp'tan bildirin</a><p class="kucuk-yazi" style="text-align:center;margin-top:8px">İsteğe bağlı; ödemenizin daha hızlı görülmesini sağlar.</p>` : ''}
      <section class="dk-ozet-kart">
        <div class="dk-ozet-bas">${avatar(p, 44)}<span><b>${esc(p.ad)}</b><small>${esc(p.unvan || C.personelAd(s.tur))}</small></span>${durumRozet(r.durum)}</div>
        <dl class="rv-dl"><div><dt>Gün</dt><dd>${esc(C.tarihYaz(r.tarih, { gun: true }))}</dd></div><div><dt>Saat</dt><dd>${saatAraligi(r)}</dd></div>
        <div><dt>Hizmet</dt><dd>${esc(hizmetYazi(r.hizmetler))}</dd></div><div><dt>Toplam</dt><dd>${r.fiyat ? TL(r.fiyat) : 'Ücretsiz'}</dd></div>
        ${r.kapora > 0 ? `<div><dt>Ön ödeme</dt><dd>${TL(r.kapora)}${r.kapora < r.fiyat ? ` <span class="soluk">· kalan ${TL(r.fiyat - r.kapora)} işletmede</span>` : ''}</dd></div>` : ''}
        <div><dt>Adınız</dt><dd>${esc(r.ad)}</dd></div><div><dt>Randevu no</dt><dd class="mono">${randevuNo(r.id)}</dd></div></dl></section>
      <div class="rv-eylemler">
        ${(r.durum === 'onay' || r.durum === 'kontrol') && !gecti ? `<button class="dg cizgili" type="button" data-takvim>${ikon('takvim', 'k')}Takvime ekle</button>` : ''}
        ${iletisim.join('')}
        ${r.durum === 'iptal' || gecti || r.durum === 'gelmedi' ? `<a class="dg ana" href="${href('/randevu/' + s.slug)}" data-git="/randevu/${esc(s.slug)}">Yeni randevu al</a>` : ''}
      </div>
      ${v.iptalEdilebilir && r.durum !== 'odeme' ? '<button class="rv-iptal-bag" type="button" data-iptal>Randevuyu iptal et</button>' : ''}
      ${r.durum === 'onay' && !gecti && !v.iptalEdilebilir && s.ayar.iptalSaat ? `<p class="kucuk-yazi" style="text-align:center;margin-top:14px">Randevuya ${s.ayar.iptalSaat} saatten az kaldığı için iptal ya da değişiklik için işletmeyi arayın.</p>` : ''}
      ${!gecti && r.durum !== 'iptal' ? `<p class="kucuk-yazi rv-kaydet">${ikon('bilgi', 'kk')}<span>Bu sayfayı kaydedin; randevunuzun durumunu buradan görebilirsiniz. Aynı telefondan ${esc(s.ad)} sayfasına girdiğinizde de üstte görünür.</span></p>` : ''}
    </main>${imza()}</div>`;
  const kok = KOK();
  kok.querySelectorAll('[data-kopya]').forEach((b) => (b.onclick = () => kopyala(b.dataset.kopya, b.parentElement.querySelector('b'))));
  kok.querySelector('[data-takvim]')?.addEventListener('click', () => takvimeEkle({ uid: r.id, baslik: `${s.ad} · ${hizmetYazi(r.hizmetler)}`, aciklama: `${p.ad} ile randevu. Randevu no: ${randevuNo(r.id)}`, yer, tarih: r.tarih, bas: r.bas, bit: r.bit }));
  kok.querySelector('[data-iptal]')?.addEventListener('click', async () => {
    if (!(await onayla({ baslik: 'Randevu iptal edilsin mi?', metin: r.durum === 'onay' || r.durum === 'kontrol' ? (r.kapora ? 'Yaptığınız ön ödemenin iadesi için işletmeyle görüşün.' : '') : '', evet: 'İptal et', hayir: 'Vazgeç', tehlike: true }))) return;
    try { const y = await api.musteriIptal(kod); bildir('Randevu iptal edildi'); durumCiz(slug, kod, y); } catch (e) { bildir(e.message, { hata: true }); }
  });
  kok.querySelector('[data-odedim]')?.addEventListener('click', async (e) => {
    if (!(await onayla({ baslik: 'Ödemeyi gönderdiniz mi?', metin: `${TL(v.odeme.tutar)} tutarındaki ödemeyi açıklamaya “${esc(r.ad)}” yazarak gönderdiyseniz devam edin. Ödeme ulaşmazsa randevu iptal edilebilir.`, evet: 'Evet, gönderdim', hayir: 'Henüz değil' }))) return;
    const b = e.target.closest('button'); b.disabled = true; b.textContent = 'Bildiriliyor…';
    try { const y = await api.odedim(kod); durumCiz(slug, kod, y); scrollTo(0, 0); } catch (er) { b.disabled = false; b.textContent = 'Ödeme yaptım'; bildir(er.message, { hata: true, sure: 7000 }); }
  });
  kok.querySelector('[data-vazgec]')?.addEventListener('click', async () => {
    if (!(await onayla({ baslik: 'Saat bırakılsın mı?', metin: 'Randevu talebiniz iptal edilir ve saat başkalarına açılır.', evet: 'Saati bırak', hayir: 'Vazgeç', tehlike: true }))) return;
    try { const y = await api.musteriIptal(kod, 'Ödeme yapılmadan vazgeçildi'); durumCiz(slug, kod, y); } catch (e) { bildir(e.message, { hata: true }); }
  });
  if (r.durum === 'odeme') {
    const e = $('#rvSayac');
    temizlikler.push(geriSayim(r.son, fark, (k) => {
      if (!e.isConnected) return;
      e.innerHTML = k > 0 ? `${ikon('saat', 'kk')}<span>Saatiniz <b>${dkSn(k)}</b> boyunca sizin için ayrıldı</span>` : `${ikon('uyari', 'kk')}<span>Süre doldu. Ödeme yaptıysanız yine de “Ödeme yaptım”a basın.</span>`;
      e.classList.toggle('az', k < 120e3);
    }));
  }
  if (r.durum === 'kontrol' || r.durum === 'odeme') {
    const t = setInterval(async () => {
      if (document.hidden) return;
      try { const y = await api.durum(kod); if (y.randevu.durum !== r.durum) { if (y.randevu.durum === 'onay') bildir('Randevunuz onaylandı'); durumCiz(slug, kod, y); } } catch { /* sonra yine denenir */ }
    }, r.durum === 'kontrol' ? 15e3 : 30e3);
    temizlikler.push(() => clearInterval(t));
  }
}
function odemeKart(v) {
  const o = v.odeme, r = v.randevu;
  if (o.yok) return `<div class="uyari-kutu">${ikon('uyari', 'k')}<span>Ödeme bilgisi henüz eklenmemiş. Lütfen işletmeyi arayın.</span></div>`;
  const satir = (ad, deger, kopya, cls = '') => `<div class="rv-iban-satir ${cls}"><span>${ad}</span><b>${esc(deger)}</b>${kopya ? `<button class="dg ikon-d kucuk" type="button" data-kopya="${esc(kopya)}" aria-label="${esc(ad)} kopyala">${ikon('kopya', 'k')}</button>` : ''}</div>`;
  return `<section class="rv-iban">
    ${o.ornek ? `<p class="rv-ornek">${ikon('uyari', 'kk')}<span>Bu bir örnek işletmedir; IBAN gerçek değildir, ödeme yapmayın.</span></p>` : ''}
    <div class="rv-iban-tutar"><span>Gönderilecek tutar</span><b>${TL(o.tutar)}</b><button class="dg ikon-d kucuk" type="button" data-kopya="${o.tutar}" aria-label="Tutarı kopyala">${ikon('kopya', 'k')}</button></div>
    ${satir('Alıcı', o.alici, o.alici)}${satir('IBAN', o.iban, o.iban.replace(/\s/g, ''), 'iban-no')}${o.banka ? satir('Banka', o.banka, '') : ''}${satir('Açıklama', o.aciklama, o.aciklama, 'vurgu')}
    <p class="rv-iban-not">${ikon('bilgi', 'kk')}<span>Açıklamaya mutlaka <b>adınızı ve soyadınızı</b> yazın; ödemeniz bu adla bulunur.</span></p>
    <button class="dg ana buyuk tam" type="button" data-odedim>${ikon('tik', 'k')}Ödeme yaptım</button>
    ${r.durum === 'odeme' ? '<button class="dg sade tam" type="button" data-vazgec>Vazgeç, saati bırak</button>' : ''}
    <ol class="rv-yol"><li>Banka uygulamanızdan IBAN'a ${TL(o.tutar)} gönderin.</li><li>Açıklamaya adınızı ve soyadınızı yazın.</li><li>“Ödeme yaptım”a basın: saatiniz sizin için tutulur.</li><li>${esc(v.personel.ad)} ödemeyi görünce randevunuz kesinleşir.</li></ol>
  </section>`;
}
