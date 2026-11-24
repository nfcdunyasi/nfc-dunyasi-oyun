// Düğün Planla — çift paneli: özet, davetliler, oturma planı, görevler ve akış, paylaş/yazdır, ayarlar
import * as C from './cekirdek.js?v=2026-11-24-b';
import { api, Senkron, depoYerel, TK } from './api.js?v=2026-11-24-b';
import { $, $$, esc, ikon, bildir, cekmece, onayla, temaUygula, qrSvg, kopyala, indir, href, git, SITE, paylasLink, zamanOnce, gecikmeli, waLink, ONIZLEME, sayiYaz } from './ui.js?v=2026-11-24-b';
import { harita } from './harita.js?v=2026-11-24-b';
import { yazdir, davetliCsv, csvOku, qrPng } from './yazdir.js?v=2026-11-24-b';

let S = null, SURUKLE = false;
const D = () => S.sen.d;
const SEKMELER = [['ozet', 'ozet', 'Özet'], ['davetliler', 'davetli', 'Davetliler'], ['oturma', 'masa', 'Masalar'], ['gorevler', 'gorev', 'Görevler'], ['paylas', 'paylas', 'Paylaş']];
const DURUM_KISA = { geliyor: 'Geliyor', bekliyor: 'Bekliyor', gelmiyor: 'Gelmiyor' };
const TARAF_AD = Object.fromEntries(C.TARAFLAR), DURUM_AD = Object.fromEntries(C.DURUMLAR), ETIKET_AD = Object.fromEntries(C.ETIKETLER);
const masaMap = () => S._mm || (S._mm = new Map(D().plan.masalar.map((m) => [m.id, m])));
const kisiYaz = (n, c = 0) => `${n} kişi${c ? ` (${c} çocuk)` : ''}`;
const yolu = (s) => `/d/${S.kod}/plan${s && s !== 'ozet' ? '/' + s : ''}`;
const segment = (ad, L, v, renkli = false) => `<div class="segment${renkli ? ' renkli' : ''}" data-seg="${ad}">${L.map(([k, a]) => `<button type="button" data-v="${esc(k)}" class="${k === v ? 'on' : ''}">${esc(a)}</button>`).join('')}</div>`;
const segDeger = (el, ad) => el.querySelector(`[data-seg="${ad}"] .on`)?.dataset.v;
function segBagla(el) { el.addEventListener('click', (e) => { const b = e.target.closest('.segment button'); if (!b) return; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); b.parentElement.dispatchEvent(new CustomEvent('seg', { bubbles: true, detail: b.dataset.v })); }); }
const anahtar = (ad, etiket, acik, alt = '') => `<label class="anahtar"><span><b style="font-weight:500">${esc(etiket)}</b>${alt ? `<br><small class="soluk">${esc(alt)}</small>` : ''}</span><input type="checkbox" data-k="${ad}" ${acik ? 'checked' : ''}><i></i></label>`;
const sayac = (ad, v, min, max) => `<div class="sayac" data-sayac="${ad}" data-min="${min}" data-max="${max}"><button type="button" data-d="-1" aria-label="Azalt">−</button><output>${v}</output><button type="button" data-d="1" aria-label="Artır">+</button></div>`;
function sayacBagla(el, onDegis) { el.addEventListener('click', (e) => { const b = e.target.closest('.sayac button'); if (!b) return; const s = b.parentElement, o = s.querySelector('output'); const v = Math.min(+s.dataset.max, Math.max(+s.dataset.min, (+o.textContent || 0) + +b.dataset.d)); o.textContent = v; onDegis && onDegis(s.dataset.sayac, v); }); }
const sayacDeger = (el, ad) => +el.querySelector(`[data-sayac="${ad}"] output`).textContent;

// ---------------------------------------------------------------- giriş noktası
export function planlayiciAc(kok, { kod, token, rol, veri, sekme = 'ozet', cikis }) {
  if (S) S.sen.kapat();
  S = { kod, rol, salon: veri.salon, pin: veri.girisKodu || '', kok, sekme, cikis, f: { q: '', durum: 'hepsi', grupla: 'grup', secim: null }, gf: 'hazirlik', secili: null, harita: null };
  S.sen = new Senkron({
    kod, token, dugun: C.belgeDuzelt(veri.dugun), rol,
    onDegisim: () => ciz(true),
    onDurum: durumGoster,
    onOturum: () => { bildir('Oturumun süresi doldu. Lütfen yeniden giriş yapın.', { hata: true }); setTimeout(() => cikis && cikis(true), 1200); },
  });
  if (S.salon?.tema) temaUygula(S.salon.tema, { tam: false });
  iskelet();
  goster(sekme);
  window.addEventListener('keydown', kisayol);
  return { goster, kapat: () => { S?.sen.kapat(); window.removeEventListener('keydown', kisayol); S?.harita?.kapat(); S = null; } };
}
function kisayol(e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.target.closest('input,textarea')) { e.preventDefault(); geriAl(); } }
function uygula(ops, etiket = '', geri = true) { const t = S.sen.uygula(ops, { etiket, geri }); ciz(); return t; }
function geriAl() { const e = S.sen.geriAl(); if (e) { bildir('Geri alındı: ' + e); ciz(); } else bildir('Geri alınacak değişiklik yok'); }

function iskelet() {
  const b = D().bilgi, alt = [C.tarihYaz(b.tarih), D().alanAd].filter(Boolean).join(' · ');
  const nav = (cls) => SEKMELER.map(([k, i, a]) => `<a href="${href(yolu(k))}" data-git="${yolu(k)}" data-sekme="${k}">${ikon(i)}<span>${a}</span><em hidden></em></a>`).join('');
  S.kok.innerHTML = `<div class="kabuk yanli">
    <aside class="yan-menu"><a class="kimlik" href="${href(yolu('ozet'))}" data-git="${yolu('ozet')}"><b>${esc(C.ciftAdi(b))}</b><small>${esc(alt)}</small></a>${nav()}
      <div class="alt"><span class="durum-n" data-durum><i></i><span>Kaydedildi</span></span><div class="dg-grup"><button class="dg cizgili kucuk" data-act="geri">${ikon('geri', 'k')} Geri al</button><button class="dg cizgili kucuk" data-act="ayarlar">${ikon('ayar', 'k')} Ayarlar</button></div>${S.rol !== 'cift' ? `<span class="rozet vurgu">${S.rol === 'yonetici' ? 'Yönetici görünümü' : 'Salon görünümü'}</span>` : ''}</div></aside>
    <header class="ust"><a class="kimlik" href="${href(yolu('ozet'))}" data-git="${yolu('ozet')}"><div style="min-width:0"><b>${esc(C.ciftAdi(b))}</b><small>${esc(alt)}</small></div></a><span class="durum-n" data-durum><i></i><span>Kaydedildi</span></span><button class="dg ikon-d" data-act="geri" aria-label="Geri al">${ikon('geri')}</button><button class="dg ikon-d" data-act="ayarlar" aria-label="Ayarlar">${ikon('ayar')}</button></header>
    <main class="icerik" id="gorunum"></main>
    <nav class="alt-menu">${nav()}</nav></div>`;
  S.kok.addEventListener('click', kabukTik);
  durumGoster(S.sen.durum, S.sen.mesaj);
}
function kabukTik(e) {
  const a = e.target.closest('[data-act]'); if (!a || !S) return;
  if (a.dataset.act === 'geri') geriAl();
  else if (a.dataset.act === 'ayarlar') ayarlar();
}
function durumGoster(d, m) {
  const yazi = { kaydedildi: 'Kaydedildi', kaydediliyor: 'Kaydediliyor…', cevrimdisi: 'Çevrimdışı', hata: 'Kaydedilemedi', oturum: 'Oturum kapandı' }[d] || d;
  $$('[data-durum]').forEach((el) => { el.className = 'durum-n ' + d; el.querySelector('span').textContent = yazi; el.title = m || ''; });
  if (d === 'hata' && m) bildir(m, { hata: true });
}
export function goster(sekme) {
  if (!S) return;
  if (!SEKMELER.some((s) => s[0] === sekme)) sekme = 'ozet';
  if (S.sekme !== sekme) { S.secili = null; window.scrollTo(0, 0); }
  S.sekme = sekme;
  $$('[data-sekme]', S.kok).forEach((a) => a.classList.toggle('on', a.dataset.sekme === sekme));
  if (sekme !== 'oturma' && S.harita) { S.harita.kapat(); S.harita = null; }
  ciz();
}
function ciz(uzak = false) {
  if (!S) return;
  const el = $('#gorunum'); if (!el) return;
  S._mm = null;
  const s = C.sayilar(D());
  $$('[data-sekme="davetliler"] em', S.kok).forEach((x) => { x.hidden = !s.yeni; x.textContent = s.yeni; });
  const y = window.scrollY;
  if (S.sekme === 'ozet') el.innerHTML = ozetHtml(s);
  else if (S.sekme === 'davetliler') davetlilerCiz(el, s);
  else if (S.sekme === 'oturma') oturmaCiz(el, s);
  else if (S.sekme === 'gorevler') el.innerHTML = gorevlerHtml();
  else if (S.sekme === 'paylas') paylasCiz(el);
  if (y) window.scrollTo(0, y);
  $$('[data-act="geri"]', S.kok).forEach((b) => b.toggleAttribute('disabled', !S.sen.geriAlinabilir()));
  if (!el._bagli) { el._bagli = true; segBagla(el); el.addEventListener('click', gorunumTik); el.addEventListener('change', gorunumDegis); el.addEventListener('input', gorunumGirdi); }
}

// ---------------------------------------------------------------- özet
function ozetHtml(s) {
  const d = D(), b = d.bilgi, kalan = C.kalanGun(b);
  const tur = Object.fromEntries(C.TURLER)[b.tur] || 'Düğün';
  const kalanYazi = kalan == null ? '' : kalan > 1 ? `${kalan} gün kaldı` : kalan === 1 ? 'Yarın' : kalan === 0 ? 'Bugün düğün günü' : `${-kalan} gün önceydi`;
  const toplam = s.geliyor + s.bekliyor, yuzde = toplam ? Math.round((s.yerlesen / toplam) * 100) : 0;
  const U = C.uyarilar(d).slice(0, 5);
  const lcv = d.davetliler.filter((x) => x.lcv).sort((a, b2) => b2.lcv.t - a.lcv.t).slice(0, 4);
  const bugun = C.trBugun();
  const gorev = d.gorevler.filter((g) => !g.bitti).sort((a, b2) => (a.tarih || '9').localeCompare(b2.tarih || '9') || a.eklenme - b2.eklenme).slice(0, 4);
  const zaman = [C.tarihYaz(b.tarih, { gun: true }), b.saat ? C.saatYaz(b.saat) + (b.bitis ? '–' + C.saatYaz(b.bitis) : '') : ''].filter(Boolean).join(' · ');
  const yer = [S.salon?.ad, d.alanAd].filter(Boolean).join(' · ');
  const git2 = (k) => `href="${href(yolu(k))}" data-git="${yolu(k)}"`;
  const uyariSatir = (u, i) => `<button class="adim-satir" type="button" data-act="uyari" data-i="${i}"><span class="adim-i ${u.tur === 'hata' ? 'hata' : u.tur === 'uyari' ? 'uyari' : 'bilgi'}">${ikon(u.tur === 'bilgi' ? 'bilgi' : 'uyari', 'k')}</span><span class="ana">${esc(u.metin)}</span>${ikon('sag', 'k')}</button>`;
  S._uyari = U;
  return `<section class="karsilama"><p class="ust-yazi">${esc(tur)} planı</p>
    <h1 class="isimler">${esc(b.gelin || 'Gelin')}<span>&amp;</span>${esc(b.damat || 'Damat')}</h1>
    <p class="bilgi">${esc(zaman)}${yer ? `<br>${esc(yer)}` : ''}</p>${kalanYazi ? `<p class="kalan-y">${esc(kalanYazi)}</p>` : ''}</section>
  <div class="sayilar uc">
    <a class="sayi" ${git2('davetliler')}><span class="bas">Davetli</span><b>${s.kisi}</b><span>${s.davet} davetiye</span></a>
    <a class="sayi" ${git2('davetliler')}><span class="bas">Geliyor</span><b>${s.geliyor}</b><span>${s.bekliyor} bekliyor</span></a>
    <a class="sayi" ${git2('oturma')}><span class="bas">Masada</span><b>%${yuzde}</b><span>${s.yerlesen} / ${toplam} kişi</span><div class="ilerleme"><i style="width:${yuzde}%"></i></div></a>
  </div>
  <div class="ozet-izgara" style="margin-top:14px"><div class="yigin-b">
    ${U.length ? `<section class="kart"><div class="kart-bas"><h2>Dikkat</h2></div><div class="liste">${U.map(uyariSatir).join('')}</div></section>` : ''}
    <section class="kart"><div class="kart-bas"><h2>Son yanıtlar</h2><span class="bosluk"></span><a class="dg sade kucuk" ${git2('paylas')}>Davet bağlantısı</a></div>
      ${lcv.length ? `<div class="liste">${lcv.map((x) => `<button class="satir" type="button" data-act="davetli" data-id="${x.id}"><span class="nokta ${x.lcv.durum}"></span><span class="ana"><b>${esc(x.lcv.ad || x.ad)}${x.yeni ? '<span class="yeni-isaret" title="Yeni yanıt"></span>' : ''}</b><small>${x.lcv.durum === 'gelmiyor' ? 'Katılamayacak' : esc(kisiYaz(x.lcv.kisi))}${x.lcv.not ? ' · “' + esc(x.lcv.not) + '”' : ''}</small></span><span class="kucuk-yazi">${esc(zamanOnce(x.lcv.t))}</span></button>`).join('')}</div>` : `<p class="soluk">Davet bağlantınızı paylaştığınızda misafirlerin yanıtları burada görünür.</p>`}</section>
  </div><div class="yigin-b">
    <section class="kart"><div class="kart-bas"><h2>Sıradaki görevler</h2><span class="bosluk"></span><a class="dg sade kucuk" ${git2('gorevler')}>Tümü</a></div>${gorev.length ? gorev.map((g) => gorevSatir(g, bugun)).join('') : '<p class="soluk">Bekleyen görev yok.</p>'}</section>
  </div></div>`;
}

// ---------------------------------------------------------------- davetliler
function davetliFiltre(x) {
  const f = S.f, m = f.durum;
  if (m === 'geliyor' || m === 'bekliyor' || m === 'gelmiyor') { if (x.durum !== m) return false; }
  else if (m === 'masasiz') { if (!C.aktifMi(x) || (x.masa && masaMap().has(x.masa))) return false; }
  else if (m === 'yeni') { if (!x.yeni) return false; }
  else if (m === 'gelin' || m === 'damat') { if (x.taraf !== m) return false; }
  return !f.q || C.araEslesir(x.ad + ' ' + (x.grup || '') + ' ' + (x.tel || ''), f.q);
}
function davetlilerCiz(el, s) {
  const d = D(), MM = masaMap(), f = S.f;
  const kisiSay = (k) => { const o = f.durum, q = f.q; f.durum = k; f.q = ''; const n = d.davetliler.filter((x) => davetliFiltre(x)).reduce((t, x) => t + x.kisi, 0); f.durum = o; f.q = q; return n; };
  const L = d.davetliler.filter(davetliFiltre);
  const ad = (a, b) => a.ad.localeCompare(b.ad, 'tr');
  let gruplar;
  if (f.grupla === 'masa') {
    const sira = [...MM.values()].sort((a, b) => (a.ozel === 'gelin-damat' ? -1 : 0) - (b.ozel === 'gelin-damat' ? -1 : 0) || a.no - b.no);
    gruplar = sira.map((m) => [C.masaEtiket(d, m) + (C.masaAdi(d, m) && m.ozel !== 'gelin-damat' ? ' · ' + C.masaAdi(d, m) : ''), L.filter((x) => x.masa === m.id).sort(ad)]);
    gruplar.push(['Masası olmayanlar', L.filter((x) => !x.masa || !MM.has(x.masa)).sort(ad)]);
  } else if (f.grupla === 'taraf') gruplar = C.TARAFLAR.map(([k, a]) => [a, L.filter((x) => x.taraf === k).sort(ad)]);
  else if (f.grupla === 'az') gruplar = [['', [...L].sort(ad)]];
  else {
    const G = [...d.gruplar]; for (const x of L) if (x.grup && !G.some((g) => C.trNorm(g) === C.trNorm(x.grup))) G.push(x.grup);
    gruplar = G.map((g) => [g, L.filter((x) => C.trNorm(x.grup) === C.trNorm(g)).sort(ad)]);
    gruplar.push(['Grupsuz', L.filter((x) => !x.grup).sort(ad)]);
  }
  gruplar = gruplar.filter((g) => g[1].length);
  const secim = f.secim;
  const satir = (x) => {
    const m = x.masa && MM.get(x.masa);
    const masa = m ? esc(C.masaEtiket(d, m)) : C.aktifMi(x) ? '<span style="color:var(--uyari)">Masası yok</span>' : '';
    const alt = [`<span class="renk-yazi ${x.durum}">${esc(DURUM_KISA[x.durum])}</span>`, masa, f.grupla !== 'grup' && x.grup ? esc(x.grup) : ''].filter(Boolean).join(' · ');
    return `<button class="davetli-satir${secim ? ' secimli' : ''}" type="button" data-act="${secim ? 'sec' : 'davetli'}" data-id="${x.id}">${secim ? `<span class="secim-kutu${secim.has(x.id) ? ' on' : ''}">${ikon('tik', 'kk')}</span>` : ''}<span style="min-width:0"><span class="ad">${esc(x.ad)}${x.yeni ? '<span class="yeni-isaret" title="Yeni yanıt"></span>' : ''}</span><span class="alt">${alt}</span></span><span class="kisi">${x.kisi} kişi</span></button>`;
  };
  const ekFiltre = [['masasiz', 'Masası yok'], ['yeni', 'Yeni yanıt']].map(([k, a]) => [k, a, kisiSay(k)]).filter(([k, , n]) => n || f.durum === k);
  const durumSeg = ['hepsi', 'geliyor', 'bekliyor', 'gelmiyor'].includes(f.durum) ? f.durum : '';
  el.innerHTML = `<div class="bolum-bas"><h1>Davetliler</h1><span class="bosluk"></span>${secim ? `<button class="dg sade" data-act="secim-kapat">Bitti</button>` : `<button class="dg ikon-d cizgili" data-act="davetli-menu" aria-label="Diğer işlemler">${ikon('menu')}</button><button class="dg ana kucuk" data-act="davetli-yeni">${ikon('arti', 'k')} Ekle</button>`}</div>
    <p class="bolum-alt">${s.davet} davetiye · ${s.kisi} kişi · ${s.geliyor} geliyor · ${s.bekliyor} bekliyor</p>
    <div class="filtre-cubuk"><label class="arama">${ikon('ara', 'k')}<input class="girdi" id="dAra" type="search" placeholder="Ara" value="${esc(f.q)}" autocomplete="off"></label>
      <select class="girdi" data-k="grupla" aria-label="Gruplama"><option value="grup"${f.grupla === 'grup' ? ' selected' : ''}>Gruba göre</option><option value="taraf"${f.grupla === 'taraf' ? ' selected' : ''}>Tarafa göre</option><option value="masa"${f.grupla === 'masa' ? ' selected' : ''}>Masaya göre</option><option value="az"${f.grupla === 'az' ? ' selected' : ''}>A–Z</option></select></div>
    <div class="segment" style="margin-bottom:12px">${[['hepsi', 'Tümü'], ['geliyor', 'Geliyor'], ['bekliyor', 'Bekliyor'], ['gelmiyor', 'Gelmiyor']].map(([k, a]) => `<button type="button" data-act="filtre" data-v="${k}" class="${durumSeg === k ? 'on' : ''}">${a}</button>`).join('')}</div>
    ${ekFiltre.length ? `<div class="kaydir-x">${ekFiltre.map(([k, a, n]) => `<button class="cip${f.durum === k ? ' on' : ''}" data-act="filtre" data-v="${f.durum === k ? 'hepsi' : k}">${a} <b>${n}</b></button>`).join('')}</div>` : ''}
    ${secim ? `<div class="secim-bant" style="margin-bottom:12px"><span><b>${secim.size}</b> davetiye seçildi</span><button class="dg kucuk" data-act="secim-hepsi">Tümünü seç</button><button class="dg kucuk" data-act="secim-islem">İşlem</button></div>` : ''}
    <section class="kart liste-k">${gruplar.length ? gruplar.map(([g, L2]) => `${g ? `<div class="grup-bas"><h3>${esc(g)}</h3><span>${L2.reduce((n, x) => n + x.kisi, 0)} kişi</span></div>` : ''}${L2.map(satir).join('')}`).join('') : d.davetliler.length ? `<div class="bos"><span class="serif">Sonuç yok</span>Aramanızı ya da filtreyi değiştirin.</div>` : `<div class="bos"><span class="serif">Davetli listeniz boş</span>Davetlileri tek tek ekleyin ya da bir listeyi yapıştırarak hepsini birden ekleyin.<br><button class="dg ana" data-act="toplu">Listeyi yapıştır</button></div>`}</section>`;
}
function davetliMenu() {
  const c = cekmece({ baslik: 'Davetli listesi', govde: `<div class="belge-sec">
    <button data-m="toplu">${ikon('dosya')}<span><b>Listeyi yapıştır</b><small>Her satıra bir davetiye; Excel’den kopyalayabilirsiniz.</small></span>${ikon('sag', 'k')}</button>
    <button data-m="csv-al">${ikon('yukle')}<span><b>CSV dosyasından al</b><small>Ad, kişi, taraf, grup ve telefon sütunları tanınır.</small></span>${ikon('sag', 'k')}</button>
    <button data-m="sec">${ikon('tik')}<span><b>Birden fazla seç</b><small>Grubu, tarafı ya da katılımı topluca değiştirin.</small></span>${ikon('sag', 'k')}</button>
    <button data-m="csv">${ikon('indir')}<span><b>Excel’e aktar</b><small>Tüm davetliler masa numaralarıyla.</small></span>${ikon('sag', 'k')}</button>
    <button data-m="yazdir">${ikon('yazdir')}<span><b>Yazdır</b><small>Masa listesi, giriş listesi ve diğerleri.</small></span>${ikon('sag', 'k')}</button></div>` });
  c.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return; c.kapat();
    if (b.dataset.m === 'sec') { S.f.secim = new Set(); ciz(); }
    else if (b.dataset.m === 'toplu') topluEkle();
    else if (b.dataset.m === 'csv') indir(`davetliler-${S.kod}.csv`, davetliCsv(D()), 'text/csv;charset=utf-8');
    else if (b.dataset.m === 'csv-al') csvAl();
    else if (b.dataset.m === 'yazdir') { git(yolu('paylas')); }
  });
}
function secimIslem() {
  const sec = S.f.secim; if (!sec?.size) return bildir('Önce davetli seçin');
  const d = D();
  const c = cekmece({ baslik: `${sec.size} davetiye`, govde: `<div class="yigin">
    <div class="alan"><span>Katılım</span>${segment('durum', C.DURUMLAR.map(([k, a]) => [k, a.replace('Yanıt bekleniyor', 'Bekliyor')]), '', true)}</div>
    <div class="alan"><span>Taraf</span>${segment('taraf', C.TARAFLAR.map(([k, a]) => [k, a.replace(' tarafı', '')]), '', true)}</div>
    <label class="alan"><span>Grup</span><select class="girdi" data-k="grup"><option value="">Değiştirme</option>${d.gruplar.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label>
    <div class="dg-grup"><button class="dg cizgili" data-m="cikar">Masadan çıkar</button><button class="dg tehlike" data-m="sil">${ikon('cop', 'k')} Sil</button></div></div>`,
  alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" data-m="uygula">Uygula</button>` });
  segBagla(c.el);
  c.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const ids = [...sec];
    if (b.dataset.m === 'sil') { if (!(await onayla({ baslik: `${ids.length} davetiye silinsin mi?`, metin: 'Bu davetliler listeden ve masalardan kaldırılır. Hemen ardından geri alabilirsiniz.', evet: 'Sil', tehlike: true }))) return; uygula([...d.iliskiler.filter((r) => sec.has(r.a) || sec.has(r.b)).map((r) => ({ t: 'sil', k: 'iliskiler', id: r.id })), ...ids.map((id) => ({ t: 'sil', k: 'davetliler', id }))], `${ids.length} davetiye silindi`); }
    else if (b.dataset.m === 'cikar') uygula(ids.map((id) => ({ t: 'guncelle', k: 'davetliler', id, v: { masa: null } })), 'Masadan çıkarıldı');
    else { const v = {}; const du = segDeger(c.el, 'durum'), ta = segDeger(c.el, 'taraf'), gr = c.el.querySelector('[data-k=grup]').value; if (du) v.durum = du; if (ta) v.taraf = ta; if (gr) v.grup = gr; if (!Object.keys(v).length) return bildir('Değiştirilecek bir şey seçin'); uygula(ids.map((id) => ({ t: 'guncelle', k: 'davetliler', id, v })), 'Toplu değişiklik'); }
    S.f.secim = null; c.kapat(); ciz(); bildir('Uygulandı', { eylem: geriAl });
  });
}
function masaSecenekleri(d, secili, kisi) {
  const dol = C.doluluk(d);
  return `<option value="">Masası yok</option>` + [...d.plan.masalar].sort((a, b) => (a.ozel === 'gelin-damat' ? -1 : 0) - (b.ozel === 'gelin-damat' ? -1 : 0) || a.no - b.no).map((m) => {
    const t = dol.get(m.id), bos = m.kap - (t?.kisi || 0);
    return `<option value="${m.id}"${m.id === secili ? ' selected' : ''}>${esc(C.masaEtiket(d, m))}${C.masaAdi(d, m) && m.ozel !== 'gelin-damat' ? ' · ' + esc(C.masaAdi(d, m)) : ''} — ${m.id === secili ? 'şu an burada' : bos >= kisi ? `${bos} boş yer` : bos > 0 ? `${bos} boş yer (yetmez)` : 'dolu'}</option>`;
  }).join('');
}
function davetliSayfasi(id, ilk = {}) {
  const d = D(), x = id ? d.davetliler.find((z) => z.id === id) : null;
  if (id && !x) return;
  const v = x ? { ...x } : { ad: '', kisi: 1, cocuk: 0, taraf: ilk.taraf || 'gelin', grup: ilk.grup || '', durum: 'bekliyor', tel: '', not: '', etiket: [], masa: null };
  if (x?.yeni) S.sen.uygula([{ t: 'guncelle', k: 'davetliler', id, v: { yeni: false } }], { geri: false });
  const iliski = x ? d.iliskiler.filter((r) => r.a === id || r.b === id) : [];
  const adOf = (i) => d.davetliler.find((z) => z.id === i)?.ad || 'Silinmiş davetli';
  const c = cekmece({
    baslik: x ? 'Davetliyi düzenle' : 'Yeni davetli',
    govde: `<form class="yigin" id="dForm" autocomplete="off">
      <label class="alan"><span>Ad soyad</span><input class="girdi" name="ad" value="${esc(v.ad)}" placeholder="Örn. Ahmet ve Ayşe Yılmaz" maxlength="80" required></label>
      <div class="izgara2"><div class="alan"><span>Kişi sayısı</span>${sayac('kisi', v.kisi, 1, 30)}</div><div class="alan"><span>Bunlardan çocuk</span>${sayac('cocuk', v.cocuk, 0, 29)}</div></div>
      <div class="alan"><span>Taraf</span>${segment('taraf', C.TARAFLAR.map(([k, a]) => [k, a.replace(' tarafı', '')]), v.taraf, true)}</div>
      <div class="alan"><span>Grup</span><div class="cipler" data-grup>${d.gruplar.map((g) => `<button type="button" class="cip${C.trNorm(g) === C.trNorm(v.grup) ? ' on' : ''}" data-g="${esc(g)}">${esc(g)}</button>`).join('')}<button type="button" class="cip" data-g="+">${ikon('arti', 'kk')} Yeni grup</button></div></div>
      <div class="alan"><span>Katılım</span>${segment('durum', C.DURUMLAR.map(([k, a]) => [k, a.replace('Yanıt bekleniyor', 'Bekliyor')]), v.durum, true)}</div>
      <label class="alan"><span>Masa</span><select class="girdi" name="masa">${masaSecenekleri(d, v.masa, v.kisi)}</select></label>
      <label class="alan"><span>Telefon <span class="ipucu">(isteğe bağlı)</span></span><input class="girdi" name="tel" type="tel" inputmode="tel" value="${esc(v.tel)}" placeholder="05xx xxx xx xx"></label>
      <div class="alan"><span>Özel durumlar</span><div class="cipler" data-etiket>${C.ETIKETLER.map(([k, a]) => `<button type="button" class="cip${v.etiket.includes(k) ? ' on' : ''}" data-e="${k}">${esc(a)}</button>`).join('')}</div></div>
      <label class="alan"><span>Not</span><textarea class="girdi" name="not" rows="2" maxlength="400" placeholder="Örn. tekerlekli sandalye kullanıyor">${esc(v.not)}</textarea></label>
      ${x?.lcv ? `<div class="uyari-kutu bilgi">${ikon('mesaj', 'k')}<span><b style="font-weight:600">Davetli yanıtı, ${esc(zamanOnce(x.lcv.t))}:</b> ${x.lcv.durum === 'gelmiyor' ? 'Katılamayacak' : esc(kisiYaz(x.lcv.kisi)) + ' katılacak'}${x.lcv.ad && x.lcv.ad !== x.ad ? ` (“${esc(x.lcv.ad)}” adıyla)` : ''}${x.lcv.not ? `<br>“${esc(x.lcv.not)}”` : ''}</span></div>` : ''}
      ${x ? `<div class="alan"><span>Oturma tercihleri</span>${iliski.length ? `<div class="liste">${iliski.map((r) => `<div class="satir"><span class="rozet ${r.tur === 'ayri' ? 'hata' : 'iyi'}">${r.tur === 'ayri' ? 'Ayrı otursun' : 'Birlikte otursun'}</span><span class="ana"><b>${esc(adOf(r.a === id ? r.b : r.a))}</b></span><button type="button" class="dg ikon-d" data-sil-iliski="${r.id}" aria-label="Kaldır">${ikon('carpi', 'k')}</button></div>`).join('')}</div>` : ''}<div class="dg-grup"><button type="button" class="dg cizgili kucuk" data-iliski="birlikte">${ikon('arti', 'kk')} Birlikte otursun</button><button type="button" class="dg cizgili kucuk" data-iliski="ayri">${ikon('arti', 'kk')} Ayrı otursun</button></div></div>` : ''}
      ${x?.tel ? `<a class="dg cizgili" target="_blank" rel="noopener" href="${esc(waLink(x.tel, davetMetni(x.ad)))}">${ikon('mesaj', 'k')} WhatsApp ile davet bağlantısı gönder</a>` : ''}
    </form>`,
    alt: `${x ? `<button class="dg tehlike" type="button" data-act2="sil">${ikon('cop', 'k')}</button>` : ''}<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="button" data-act2="kaydet">${x ? 'Kaydet' : 'Ekle'}</button>${x ? '' : `<button class="dg cizgili" type="button" data-act2="kaydet-yeni" title="Ekle ve yenisini aç">Ekle +</button>`}`,
  });
  const el = c.el, form = $('#dForm', el);
  segBagla(el);
  sayacBagla(el, (k, n) => { if (k === 'kisi') { const ck = el.querySelector('[data-sayac=cocuk]'); ck.dataset.max = Math.max(0, n - 1); const o = ck.querySelector('output'); if (+o.textContent > n - 1) o.textContent = Math.max(0, n - 1); } });
  const topla = () => {
    const f = new FormData(form);
    return { ad: String(f.get('ad') || '').trim(), kisi: sayacDeger(el, 'kisi'), cocuk: sayacDeger(el, 'cocuk'), taraf: segDeger(el, 'taraf') || 'ortak', durum: segDeger(el, 'durum') || 'bekliyor', grup: el.querySelector('[data-grup] .on')?.dataset.g || '', masa: f.get('masa') || null, tel: String(f.get('tel') || ''), not: String(f.get('not') || ''), etiket: $$('[data-etiket] .on', el).map((b) => b.dataset.e) };
  };
  el.addEventListener('click', async (e) => {
    const g = e.target.closest('[data-g]');
    if (g) {
      if (g.dataset.g === '+') { const ad = prompt2('Yeni grup adı'); ad.then((a) => { a = C.str(a, 30); if (!a) return; if (!d.gruplar.some((z) => C.trNorm(z) === C.trNorm(a))) uygula([{ t: 'gruplar', v: [...d.gruplar, a] }], 'Grup eklendi'); const b = document.createElement('button'); b.type = 'button'; b.className = 'cip on'; b.dataset.g = a; b.textContent = a; $$('[data-grup] .cip', el).forEach((z) => z.classList.remove('on')); g.before(b); }); return; }
      const on = g.classList.contains('on'); $$('[data-grup] .cip', el).forEach((z) => z.classList.remove('on')); if (!on) g.classList.add('on'); return;
    }
    const et = e.target.closest('[data-e]'); if (et) { et.classList.toggle('on'); return; }
    const si = e.target.closest('[data-sil-iliski]'); if (si) { uygula([{ t: 'sil', k: 'iliskiler', id: si.dataset.silIliski }], 'Oturma tercihi kaldırıldı'); c.kapat(); davetliSayfasi(id); return; }
    const il = e.target.closest('[data-iliski]'); if (il) { const sec = await davetliSec({ baslik: il.dataset.iliski === 'ayri' ? 'Kimden ayrı otursun?' : 'Kiminle birlikte otursun?', haric: new Set([id]) }); if (sec) { uygula([{ t: 'ekle', k: 'iliskiler', v: { id: C.rastgele(8), a: id, b: sec, tur: il.dataset.iliski } }], 'Oturma tercihi eklendi'); c.kapat(); davetliSayfasi(id); } return; }
    const a = e.target.closest('[data-act2]'); if (!a) return;
    if (a.dataset.act2 === 'sil') {
      c.kapat();
      uygula([...d.iliskiler.filter((r) => r.a === id || r.b === id).map((r) => ({ t: 'sil', k: 'iliskiler', id: r.id })), { t: 'sil', k: 'davetliler', id }], x.ad + ' silindi');
      bildir(`${x.ad} silindi`, { eylem: geriAl }); return;
    }
    const y = topla();
    if (!y.ad) { form.querySelector('[name=ad]').focus(); return bildir('Lütfen bir ad yazın', { hata: true }); }
    if (x) uygula([{ t: 'guncelle', k: 'davetliler', id, v: y }], y.ad + ' güncellendi');
    else uygula([{ t: 'ekle', k: 'davetliler', v: { ...y, id: C.rastgele(8), eklenme: Date.now() } }], y.ad + ' eklendi');
    c.kapat();
    if (!x) bildir(`${y.ad} eklendi`);
    if (a.dataset.act2 === 'kaydet-yeni') davetliSayfasi(null, { taraf: y.taraf, grup: y.grup });
  });
}
const davetMetni = (ad) => { const b = D().bilgi; return `${ad ? 'Sayın ' + ad + ', ' : ''}${C.ciftAdi(b)} ${Object.fromEntries(C.TURLER)[b.tur]?.toLocaleLowerCase('tr') || 'düğün'} davetimize sizi de bekliyoruz${b.tarih ? ` (${C.tarihYaz(b.tarih, { gun: true })}${b.saat ? ', ' + C.saatYaz(b.saat) : ''})` : ''}. Katılım durumunuzu buradan bildirebilirsiniz: ${paylasLink('/d/' + S.kod)}`; };
function prompt2(baslik, deger = '') {
  return new Promise((ok) => {
    const c = cekmece({ baslik: esc(baslik), govde: `<input class="girdi" id="p2" value="${esc(deger)}" maxlength="40">`, alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" id="p2ok">Tamam</button>`, onKapat: (v) => ok(typeof v === 'string' ? v : '') });
    const i = $('#p2', c.el); setTimeout(() => i.focus(), 50);
    $('#p2ok', c.el).onclick = () => c.kapat(i.value);
    i.onkeydown = (e) => { if (e.key === 'Enter') c.kapat(i.value); };
  });
}
/** Davetli seçici (arama + liste). sigan: masa için boş yer, yalnızMasasiz */
function davetliSec({ baslik = 'Davetli seçin', haric = new Set(), yalnizMasasiz = false, bos = null } = {}) {
  return new Promise((ok) => {
    const d = D(), MM = masaMap();
    let q = '';
    const liste = () => d.davetliler.filter((x) => !haric.has(x.id) && (!yalnizMasasiz || (C.aktifMi(x) && (!x.masa || !MM.has(x.masa)))) && (!q || C.araEslesir(x.ad, q))).sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).slice(0, 200);
    const satirlar = () => { const L = liste(); return L.length ? L.map((x) => `<button class="parti" type="button" data-id="${x.id}"><i class="serit ${x.taraf}"></i><span class="ad">${esc(x.ad)}<small>${esc(x.grup || 'Grupsuz')} · ${esc(TARAF_AD[x.taraf])}${bos != null && x.kisi > bos ? ' · sığmaz' : ''}</small></span><span class="k">${x.kisi}</span></button>`).join('') : `<p class="soluk" style="text-align:center;padding:20px">${yalnizMasasiz ? 'Masası olmayan davetli kalmadı.' : 'Davetli bulunamadı.'}</p>`; };
    const c = cekmece({ baslik: esc(baslik), govde: `<label class="arama" style="display:block;margin-bottom:12px">${ikon('ara', 'k')}<input class="girdi" id="dsAra" type="search" placeholder="İsim ara" autocomplete="off"></label><div id="dsL">${satirlar()}</div>`, onKapat: (v) => ok(typeof v === 'string' ? v : null) });
    $('#dsAra', c.el).addEventListener('input', (e) => { q = e.target.value; $('#dsL', c.el).innerHTML = satirlar(); });
    c.el.addEventListener('click', (e) => { const b = e.target.closest('.parti'); if (b) c.kapat(b.dataset.id); });
  });
}
function satirCoz(satir, v) {
  let p = satir.split('\t').map((s) => s.trim());
  if (p.length === 1) p = [satir.trim()];
  let ad = p[0], kisi = null;
  if (p.length > 1 && /^\d{1,2}$/.test(p[1])) kisi = +p[1];
  if (kisi == null) { const m = /^(.*?)[\s,;:–-]+(\d{1,2})\s*(kişi|kisi|k)?\.?$/i.exec(ad); if (m && m[1].trim().length >= 2) { ad = m[1].trim(); kisi = +m[2]; } else { const m2 = /^(\d{1,2})\s*(kişi|kisi)?[\s,;:–-]+(.+)$/i.exec(ad); if (m2) { kisi = +m2[1]; ad = m2[3].trim(); } } }
  ad = ad.replace(/^[\s•\-*·\d.)]+(?=\D)/, '').trim();
  if (!ad) return null;
  if (kisi == null) kisi = /\bailesi\b/i.test(ad) ? 4 : /\bve\b|&|\bile\b/i.test(ad) ? 2 : 1;
  return { id: C.rastgele(8), ad: ad.slice(0, 80), kisi: Math.min(30, Math.max(1, kisi)), taraf: v.taraf, grup: v.grup, durum: v.durum, eklenme: Date.now(), tel: p[2] && /\d{7,}/.test(p[2].replace(/\D/g, '')) ? p[2] : '' };
}
function topluEkle() {
  const d = D();
  const c = cekmece({ baslik: 'Toplu davetli ekle', genis: true, govde: `<div class="yigin">
    <p class="soluk">Her satıra bir davetiye yazın. Kişi sayısını adın sonuna ekleyebilirsiniz; Excel'den kopyalayıp da yapıştırabilirsiniz.</p>
    <textarea class="girdi" id="tTx" rows="9" placeholder="Ahmet ve Ayşe Yılmaz 2&#10;Kaya ailesi 5&#10;Mehmet Demir&#10;Zeynep Arslan, 3"></textarea>
    <div class="izgara2"><div class="alan"><span>Taraf</span>${segment('taraf', C.TARAFLAR.map(([k, a]) => [k, a.replace(' tarafı', '')]), 'gelin', true)}</div><label class="alan"><span>Grup</span><select class="girdi" id="tGr"><option value="">Grupsuz</option>${d.gruplar.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label></div>
    <div class="alan"><span>Katılım</span>${segment('durum', C.DURUMLAR.map(([k, a]) => [k, a.replace('Yanıt bekleniyor', 'Bekliyor')]), 'bekliyor', true)}</div>
    <p class="kucuk-yazi" id="tOn">Henüz satır yok.</p></div>`,
  alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" id="tEk" disabled>Ekle</button>` });
  segBagla(c.el);
  const cozumle = () => { const v = { taraf: segDeger(c.el, 'taraf'), grup: $('#tGr', c.el).value, durum: segDeger(c.el, 'durum') }; return $('#tTx', c.el).value.split(/\n/).map((s) => s.trim()).filter((s) => s && !/^(ad|isim|ad soyad|name)\b/i.test(s)).map((s) => satirCoz(s, v)).filter(Boolean); };
  const onizle = () => { const L = cozumle(); $('#tOn', c.el).textContent = L.length ? `${L.length} davetiye, toplam ${L.reduce((n, x) => n + x.kisi, 0)} kişi eklenecek. İlk satır: ${L[0].ad} (${L[0].kisi} kişi)` : 'Henüz satır yok.'; $('#tEk', c.el).disabled = !L.length; };
  $('#tTx', c.el).addEventListener('input', onizle);
  $('#tEk', c.el).onclick = () => { const L = cozumle(); if (!L.length) return; if (d.davetliler.length + L.length > 2500) return bildir('Bir düğüne en fazla 2500 davetiye eklenebilir', { hata: true }); uygula(L.map((v) => ({ t: 'ekle', k: 'davetliler', v })), `${L.length} davetiye eklendi`); c.kapat(); bildir(`${L.length} davetiye eklendi`, { eylem: geriAl }); };
}
function csvAl() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.txt,text/csv,text/plain';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    let L; try { L = csvOku(await f.text()); } catch (e) { return bildir(e.message, { hata: true }); }
    if (!L.length) return bildir('Dosyada davetli bulunamadı', { hata: true });
    if (!(await onayla({ baslik: `${L.length} davetiye eklensin mi?`, metin: `Toplam ${L.reduce((n, x) => n + x.kisi, 0)} kişi. İlk satır: <b>${esc(L[0].ad)}</b>`, evet: 'Ekle' }))) return;
    uygula(L.map((v) => ({ t: 'ekle', k: 'davetliler', v: { ...v, id: C.rastgele(8), eklenme: Date.now() } })), `${L.length} davetiye eklendi`);
    bildir(`${L.length} davetiye eklendi`, { eylem: geriAl });
  };
  inp.click();
}

// ---------------------------------------------------------------- oturma planı
function masaBilgisi(dol, d) {
  return (m) => {
    const t = dol.get(m.id), kisi = t?.kisi || 0, dolu = [];
    for (const tr of ['gelin', 'damat', 'ortak']) for (let i = 0; i < (t?.[tr] || 0); i++) dolu.push(tr);
    const sec = S.secili && d.davetliler.find((x) => x.id === S.secili);
    let sinif = kisi > m.kap + m.ek ? 'tasma' : kisi >= m.kap && m.ozel !== 'gelin-damat' ? 'tam' : '';
    if (d.masaEk[m.id]?.kilit) sinif += ' kilitli';
    if (sec && sec.masa !== m.id && m.kap + m.ek - kisi < sec.kisi) sinif += ' sigmaz';
    return { sinif, alt: m.ozel === 'gelin-damat' ? '' : `${kisi}/${m.kap}`, dolu, sandalye: Math.min(m.kap + m.ek + 6, Math.max(m.kap, kisi)), ad: C.masaAdi(d, m) };
  };
}
function oturmaCiz(el, s) {
  const d = D(), dol = C.doluluk(d), sec = S.secili && d.davetliler.find((x) => x.id === S.secili);
  if (S.secili && !sec) S.secili = null;
  const masasiz = d.davetliler.filter((x) => C.aktifMi(x) && (!x.masa || !masaMap().has(x.masa)));
  const yeniDuzen = !el.querySelector('#hrt') || !S.harita;
  S._bilgi = masaBilgisi(dol, d);
  if (yeniDuzen) {
    el.innerHTML = `<div class="oturma"><div class="oturma-ust"><div class="bilgi" id="oBilgi"></div><label class="arama">${ikon('ara', 'k')}<input class="girdi" id="oAra" type="search" placeholder="Davetli bul" autocomplete="off"></label><button class="dg cizgili kucuk" data-act="oto" style="min-height:40px">${ikon('sihir', 'k')} <span>Otomatik<span class="oto-yazi"> yerleştir</span></span></button><button class="dg sade kucuk" data-act="lejant" aria-label="Renkler">${ikon('bilgi', 'k')}</button></div>
      <div id="oSecim"></div><div id="oAraSonuc"></div><div id="hrt"></div>
      <button class="tepsi" type="button" data-act="tepsi">${ikon('davetli', 'k')}<span>Masası olmayanlar</span><b id="oTepsi"></b><span class="bosluk"></span>${ikon('yukari', 'k')}</button>
      <aside class="yan-panel"><div class="kart sik" id="oOzet"></div><div class="kart sik"><div class="kart-bas" style="margin-bottom:10px"><h3>Masası olmayanlar</h3><span class="bosluk"></span><span class="rozet" id="oSay"></span></div><label class="arama" style="display:block;margin-bottom:10px">${ikon('ara', 'k')}<input class="girdi" id="oYAra" type="search" placeholder="Ara" autocomplete="off" style="min-height:38px"></label><div class="kaydir" id="oListe"></div></div></aside></div>`;
    haritaBoyu();
    S.harita = harita($('#hrt', el), {
      plan: d.plan, mod: 'plan', bilgi: (m) => S._bilgi(m), vurgu: () => S.vurgu, ipucu: '',
      onMasa: (id) => masaDokun(id), onBos: () => { if (S.vurgu) { S.vurgu = null; S.harita.ciz(); } },
    });
    if (!SURUKLE) { SURUKLE = true; surukleBagla(el); }
    $('#oAra', el).addEventListener('input', (e) => araSonuc(e.target.value));
    $('#oYAra', el).addEventListener('input', () => yanListe());
  } else { haritaBoyu(); S.harita.planDegis(d.plan); }
  const kisiM = masasiz.reduce((n, x) => n + x.kisi, 0);
  $('#oBilgi', el).innerHTML = `<b>${s.yerlesen}</b> / ${s.geliyor + s.bekliyor} kişi yerleşti · ${s.masa} masa · ${s.kapasite} kişilik`;
  $('#oTepsi', el).textContent = `${kisiM} kişi`;
  $('#oSay', el).textContent = `${masasiz.length} · ${kisiM} kişi`;
  $('#oSecim', el).innerHTML = sec ? `<div class="secim-bant"><span><b>${esc(sec.ad)}</b> (${sec.kisi} kişi) için bir masaya dokunun</span><button class="dg kucuk" data-act="secim-iptal">Vazgeç</button></div>` : '';
  $('#oOzet', el).innerHTML = `<div class="lejant"><span><i style="background:var(--gelin)"></i>Gelin tarafı</span><span><i style="background:var(--damat)"></i>Damat tarafı</span><span><i style="background:var(--ortak)"></i>Ortak</span></div><p class="kucuk-yazi" style="margin-top:10px">Davetliyi sürükleyip masaya bırakın ya da önce davetliye, sonra masaya tıklayın. Masaya tıklayınca o masadakileri görürsünüz.</p>`;
  yanListe();
}
/** Telefonda harita, planın en/boy oranı kadar yer kaplar; üstte altta boş şerit kalmaz (ekrandan da büyük olmaz) */
let BOYU_DINLE = false;
function haritaBoyu() {
  const h = document.getElementById('hrt'); if (!h || !S) return;
  if (!BOYU_DINLE) { BOYU_DINLE = true; addEventListener('resize', haritaBoyu); }
  if (innerWidth >= 1000) { h.style.height = ''; return; }
  const p = D().plan, oran = (p.boy + 3.2) / (p.en + 3.2);
  h.style.height = Math.round(Math.max(300, h.clientWidth * oran)) + 'px';
}
function yanListe() {
  const el = $('#oListe'); if (!el) return;
  const d = D(), q = $('#oYAra')?.value || '', MM = masaMap();
  const L = d.davetliler.filter((x) => C.aktifMi(x) && (!x.masa || !MM.has(x.masa)) && (!q || C.araEslesir(x.ad, q))).sort((a, b) => C.trNorm(a.grup).localeCompare(C.trNorm(b.grup)) || a.ad.localeCompare(b.ad, 'tr'));
  el.innerHTML = L.length ? L.map((x) => partiHtml(x)).join('') : `<p class="soluk" style="padding:10px 4px">${q ? 'Bulunamadı.' : 'Gelecek herkesin bir masası var.'}</p>`;
}
const partiHtml = (x) => `<button class="parti${S.secili === x.id ? ' secili' : ''}" type="button" data-parti="${x.id}"><i class="serit ${x.taraf}"></i><span class="ad">${esc(x.ad)}<small>${esc(x.grup || 'Grupsuz')}${x.durum === 'bekliyor' ? ' · yanıt bekleniyor' : ''}</small></span><span class="k">${x.kisi}</span></button>`;
function araSonuc(q) {
  const el = $('#oAraSonuc'); if (!el) return;
  if (!q.trim()) { el.innerHTML = ''; return; }
  const d = D(), MM = masaMap(), L = d.davetliler.filter((x) => C.araEslesir(x.ad, q)).slice(0, 6);
  el.innerHTML = `<div class="kart sik" style="padding:6px 12px">${L.length ? L.map((x) => { const m = x.masa && MM.get(x.masa); return `<button class="satir" type="button" data-act="bul-git" data-id="${x.id}"><span class="ana"><b>${esc(x.ad)}</b><small>${m ? esc(C.masaEtiket(d, m)) : 'Masası yok'} · ${x.kisi} kişi</small></span>${ikon('sag', 'k')}</button>`; }).join('') : '<p class="soluk" style="padding:8px 0">Bulunamadı.</p>'}</div>`;
}
async function yerlestir(pid, mid) {
  const d = D(), x = d.davetliler.find((z) => z.id === pid), m = d.plan.masalar.find((z) => z.id === mid); if (!x || !m) return false;
  if (x.masa === mid) { S.secili = null; ciz(); return true; }
  const t = C.doluluk(d).get(mid), bos = m.kap + m.ek - (t?.kisi || 0);
  const ayri = d.iliskiler.filter((r) => r.tur === 'ayri' && (r.a === pid || r.b === pid)).map((r) => (r.a === pid ? r.b : r.a));
  const cakisan = t?.liste.find((y) => ayri.includes(y.id));
  const devam = () => { S.secili = null; uygula([{ t: 'guncelle', k: 'davetliler', id: pid, v: { masa: mid, durum: x.durum === 'gelmiyor' ? 'bekliyor' : x.durum } }], `${x.ad} → ${C.masaEtiket(d, m)}`); bildir(`${x.ad} → ${C.masaEtiket(d, m)}`, { eylem: geriAl }); };
  if (cakisan && !(await onayla({ baslik: 'Ayrı oturmaları istenmişti', metin: `<b>${esc(x.ad)}</b> ile <b>${esc(cakisan.ad)}</b> için “ayrı otursun” tercihi var. Yine de aynı masaya konsun mu?`, evet: 'Yine de koy' }))) return false;
  if (bos < x.kisi && !(await onayla({ baslik: `${C.masaEtiket(d, m)} yetmiyor`, metin: `Bu masada ${Math.max(0, bos)} boş yer var (ek sandalyelerle birlikte), ${esc(x.ad)} ${x.kisi} kişi. Masa taşacak; yine de yerleştirilsin mi?`, evet: 'Yine de yerleştir' }))) return false;
  devam(); return true;
}
function masaDokun(mid) {
  if (S.secili) return yerlestir(S.secili, mid);
  masaSayfasi(mid);
}
function masaSayfasi(mid) {
  const d = D(), m = d.plan.masalar.find((z) => z.id === mid); if (!m) return;
  const t = C.doluluk(d).get(mid), ek = d.masaEk[mid] || {};
  const uz = C.sahneUzaklik(d.plan, m), yer = m.ozel === 'gelin-damat' ? '' : C.masaYeri(d.plan, m);
  const L = (t?.liste || []).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const gelmeyen = d.davetliler.filter((x) => x.masa === mid && !C.aktifMi(x));
  const et = Object.entries(t?.etiket || {}).map(([k, n]) => `${ETIKET_AD[k]} (${n})`).join(' · ');
  const c = cekmece({
    baslik: `<div class="masa-bas"><span class="no">${m.ozel === 'gelin-damat' ? 'G&D' : m.no}</span><div style="min-width:0"><div class="bas-ad">${esc(C.masaEtiket(d, m))}${C.masaAdi(d, m) && m.ozel !== 'gelin-damat' ? ` · ${esc(C.masaAdi(d, m))}` : ''}</div><div class="bas-alt">${t?.kisi || 0}\u00a0/\u00a0${m.kap}\u00a0kişi${m.ek ? ` · +${m.ek}\u00a0ek\u00a0sandalye` : ''}</div></div></div>`,
    govde: `<div class="yigin">${yer || uz != null ? `<p class="kucuk-yazi">${esc([yer, uz != null ? `sahneye ${String(uz.toFixed(1)).replace('.', ',')} m` : ''].filter(Boolean).join(' · '))}${t?.cocuk ? ` · ${t.cocuk} çocuk` : ''}${et ? ' · ' + esc(et) : ''}</p>` : ''}
      ${L.length ? `<div class="liste">${L.map((x) => `<div class="satir"><i class="nokta" style="background:var(--${x.taraf})"></i><button class="ana" type="button" data-m="davetli" data-id="${x.id}" style="background:none;border:0;padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit"><b>${esc(x.ad)}</b><small>${esc(x.grup || 'Grupsuz')} · ${x.kisi} kişi${x.durum === 'bekliyor' ? ' · yanıt bekleniyor' : ''}</small></button><button class="dg sade kucuk" type="button" data-m="tasi" data-id="${x.id}">Taşı</button><button class="dg ikon-d" type="button" data-m="cikar" data-id="${x.id}" aria-label="Masadan çıkar">${ikon('carpi', 'k')}</button></div>`).join('')}</div>` : '<p class="soluk">Bu masa boş.</p>'}
      ${gelmeyen.length ? `<div class="uyari-kutu">${ikon('uyari', 'k')}<span>${gelmeyen.map((x) => esc(x.ad)).join(', ')} gelmeyeceğini bildirdi ama bu masada görünüyor. <button class="dg sade kucuk" data-m="gelmeyen-cikar">Çıkar</button></span></div>` : ''}
      <button class="dg cizgili" type="button" data-m="ekle">${ikon('arti', 'k')} Bu masaya davetli ekle</button>
      <hr class="ayrac" style="margin:4px 0">
      <label class="alan"><span>Masa adı <span class="ipucu">(isteğe bağlı, örn. “Okul arkadaşları”)</span></span><input class="girdi" data-k="ad" value="${esc(ek.ad || '')}" maxlength="40" placeholder="${esc(m.ad || '')}"></label>
      <label class="alan"><span>Not</span><input class="girdi" data-k="not" value="${esc(ek.not || '')}" maxlength="200" placeholder="Örn. yaşlı misafirler, girişe yakın"></label>
      ${anahtar('kilit', 'Masayı kilitle', !!ek.kilit, 'Otomatik yerleştirme bu masaya dokunmaz.')}
      ${m.ozel ? '' : anahtar('rezerve', 'Rezerve masa', !!ek.rezerve, 'Otomatik yerleştirmede boş bırakılır.')}</div>`,
    alt: `<button class="dg ana" data-kapat>Tamam</button>`,
    onKapat: () => {
      const v = { ad: $('[data-k=ad]', c.el)?.value || '', not: $('[data-k=not]', c.el)?.value || '', kilit: !!$('[data-k=kilit]', c.el)?.checked, rezerve: !!$('[data-k=rezerve]', c.el)?.checked };
      const eskiV = { ad: ek.ad || '', not: ek.not || '', kilit: !!ek.kilit, rezerve: !!ek.rezerve };
      if (JSON.stringify(v) !== JSON.stringify(eskiV)) uygula([{ t: 'masaEk', id: mid, v }], C.masaEtiket(d, m) + ' güncellendi');
    },
  });
  c.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const pid = b.dataset.id;
    if (b.dataset.m === 'cikar') { const x = d.davetliler.find((z) => z.id === pid); uygula([{ t: 'guncelle', k: 'davetliler', id: pid, v: { masa: null } }], `${x.ad} masadan çıktı`); c.kapat(); masaSayfasi(mid); }
    else if (b.dataset.m === 'gelmeyen-cikar') { uygula(gelmeyen.map((x) => ({ t: 'guncelle', k: 'davetliler', id: x.id, v: { masa: null } })), 'Gelmeyenler çıkarıldı'); c.kapat(); masaSayfasi(mid); }
    else if (b.dataset.m === 'tasi') { c.kapat(); S.secili = pid; ciz(); bildir('Şimdi yeni masaya dokunun'); }
    else if (b.dataset.m === 'davetli') { c.kapat(); davetliSayfasi(pid); }
    else if (b.dataset.m === 'ekle') {
      const bos = m.kap + m.ek - (C.doluluk(D()).get(mid)?.kisi || 0);
      c.kapat();
      const sec = await davetliSec({ baslik: `${C.masaEtiket(d, m)} · ${Math.max(0, bos)} boş yer`, yalnizMasasiz: true, bos });
      if (sec && (await yerlestir(sec, mid))) masaSayfasi(mid);
    }
  });
}
function tepsi() {
  const d = D(), MM = masaMap();
  let q = '';
  const L = () => d.davetliler.filter((x) => C.aktifMi(x) && (!x.masa || !MM.has(x.masa)) && (!q || C.araEslesir(x.ad, q))).sort((a, b) => C.trNorm(a.grup).localeCompare(C.trNorm(b.grup)) || a.ad.localeCompare(b.ad, 'tr'));
  const c = cekmece({ baslik: 'Masası olmayanlar', govde: `<label class="arama" style="display:block;margin-bottom:12px">${ikon('ara', 'k')}<input class="girdi" id="tAra" type="search" placeholder="Ara" autocomplete="off"></label><p class="kucuk-yazi" style="margin-bottom:10px">Bir davetliye dokunun, ardından planda masasına dokunun.</p><div id="tL"></div>` });
  const doldur = () => { const x = L(); $('#tL', c.el).innerHTML = x.length ? x.map(partiHtml).join('') : '<p class="soluk" style="text-align:center;padding:16px">Gelecek herkesin bir masası var.</p>'; };
  doldur();
  $('#tAra', c.el).addEventListener('input', (e) => { q = e.target.value; doldur(); });
  c.el.addEventListener('click', (e) => { const b = e.target.closest('[data-parti]'); if (!b) return; S.secili = b.dataset.parti; c.kapat(); ciz(); });
}
function surukleBagla(el) {
  let s = null;
  el = document;
  const bitir = () => { if (s?.hayalet) s.hayalet.remove(); S.harita?.hedefGoster(null); clearTimeout(s?.zaman); s = null; };
  el.addEventListener('pointerdown', (e) => {
    const p = e.target.closest && e.target.closest('[data-parti]'); if (!S || !p || e.button > 0 || !document.querySelector('#gorunum .yan-panel')?.contains(p)) return;
    s = { id: p.dataset.parti, x: e.clientX, y: e.clientY, aktif: false, dokunma: e.pointerType !== 'mouse', el: p };
    if (s.dokunma) s.zaman = setTimeout(() => { if (s) baslat(e.clientX, e.clientY); }, 320);
  });
  const baslat = (x, y) => { const pr = D().davetliler.find((z) => z.id === s.id); if (!pr) return bitir(); s.aktif = true; s.hayalet = document.createElement('div'); s.hayalet.className = 'surukle-hayalet'; s.hayalet.textContent = `${pr.ad} · ${pr.kisi}`; document.body.appendChild(s.hayalet); tasi(x, y); };
  const tasi = (x, y) => { s.hayalet.style.left = x + 'px'; s.hayalet.style.top = y + 'px'; s.hedef = S.harita?.masaAt(x, y); S.harita?.hedefGoster(s.hedef); };
  window.addEventListener('pointermove', (e) => {
    if (!s) return;
    if (!s.aktif) { if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) { if (s.dokunma) return bitir(); baslat(e.clientX, e.clientY); } return; }
    e.preventDefault(); tasi(e.clientX, e.clientY);
  }, { passive: false });
  window.addEventListener('pointerup', () => {
    if (!s) return;
    if (s.aktif && s.hedef) { const id = s.id, h = s.hedef; bitir(); yerlestir(id, h); return; }
    if (!s.aktif) { const id = s.id; bitir(); S.secili = S.secili === id ? null : id; ciz(); return; }
    bitir();
  });
  window.addEventListener('pointercancel', bitir);
}
function otomatik() {
  const d = D();
  const c = cekmece({ baslik: 'Otomatik yerleştir', govde: `<div class="yigin">
    <p class="soluk">Gruplar öncelik sırasıyla sahneye en yakın masalardan başlayarak yerleşir; aynı gruptakiler yan yana masalara, aileler tek masaya konur. “Birlikte” ve “ayrı” tercihleri dikkate alınır. Kilitli ve rezerve masalara dokunulmaz.</p>
    <div class="alan"><span>Hangi davetliler?</span>${segment('mod', [['eksik', 'Masası olmayanlar'], ['bastan', 'Herkesi baştan']], 'eksik')}</div>
    ${anahtar('bekleyen', 'Yanıt bekleyenleri de yerleştir', true, 'Kapalıysa sadece “geliyor” diyenler yerleşir.')}
    ${anahtar('taraf', 'Gelin ve damat tarafını ayır', true, 'Taraflar sahnenin iki yanına oturur.')}
    <div class="alan"><span>Gelin tarafı (sahneye bakarken)</span>${segment('yon', [['sol', 'Solda'], ['sag', 'Sağda']], d.ayar.gelinTarafi)}</div>
    <p class="kucuk-yazi">Grup önceliği: ${d.gruplar.map(esc).join(' › ')}. <button class="dg sade kucuk" data-m="gruplar">Sırayı değiştir</button></p></div>`,
  alt: `<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" data-m="calistir">${ikon('sihir', 'k')} Yerleştir</button>` });
  segBagla(c.el);
  c.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    if (b.dataset.m === 'gruplar') { c.kapat(); ayarlar('oturma'); return; }
    const yon = segDeger(c.el, 'yon');
    const ops = [];
    if (yon !== d.ayar.gelinTarafi) ops.push({ t: 'ayar', v: { gelinTarafi: yon } });
    const kopya = JSON.parse(JSON.stringify(d)); kopya.ayar.gelinTarafi = yon;
    const r = C.otomatikYerlestir(kopya, { bastan: segDeger(c.el, 'mod') === 'bastan', bekleyenler: $('[data-k=bekleyen]', c.el).checked, taraflar: $('[data-k=taraf]', c.el).checked });
    c.kapat();
    if (!r.ops.length && !ops.length) return bildir(r.kalanKisi ? `${r.kalanKisi} kişi için uygun yer bulunamadı` : 'Yerleştirilecek davetli yok');
    uygula([...ops, ...r.ops], 'Otomatik yerleştirme');
    bildir(`${r.yerlesen} kişi yerleşti${r.kalanKisi ? ` · ${r.kalanKisi} kişiye yer kalmadı` : ''}`, { eylem: geriAl });
  });
}

// ---------------------------------------------------------------- görevler ve akış
function gorevSatir(g, bugun = C.trBugun()) {
  const gec = g.tarih && !g.bitti && g.tarih < bugun;
  return `<div class="gorev${g.bitti ? ' bitti' : ''}"><button class="kutu" type="button" data-act="gorev-bitti" data-id="${g.id}" aria-label="${g.bitti ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}">${ikon('tik', 'kk')}</button>
    <div style="min-width:0"><div class="ad" data-act="gorev" data-id="${g.id}">${esc(g.ad)}</div><div class="alt">${g.kim ? `<span class="kim"><i>${esc(C.basHarf(g.kim))}</i>${esc(g.kim)}</span>` : '<span>Kimse atanmadı</span>'}${g.tarih ? `<span${gec ? ' style="color:var(--hata)"' : ''}>${ikon('takvim', 'kk')} ${esc(C.tarihYaz(g.tarih, { yil: false }))}${gec ? ' · gecikti' : ''}</span>` : ''}${g.not ? `<span>${esc(g.not.length > 60 ? g.not.slice(0, 59) + '…' : g.not)}</span>` : ''}</div></div>
    <button class="dg ikon-d" type="button" data-act="gorev" data-id="${g.id}" aria-label="Düzenle">${ikon('kalem', 'k')}</button></div>`;
}
const akisSatir = (p) => `<button class="akis-oge" type="button" data-act="akis" data-id="${p.id}"><span class="saat">${esc(C.saatYaz(p.saat) || '—')}</span><span class="cizgi"></span><span><b>${esc(p.ad)}</b>${p.kim || p.not ? `<small>${[p.kim, p.not].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</span></button>`;
function gorevlerHtml() {
  const d = D(), f = S.gf, bugun = C.trBugun();
  const seg = segment('gf', [['hazirlik', 'Hazırlık'], ['gun', 'Düğün günü'], ['kisi', 'Kişiler'], ['akis', 'Akış']], f);
  const ekle = f === 'akis' ? `<button class="dg ana kucuk" data-act="akis-yeni">${ikon('arti', 'k')} Ekle</button>` : `<button class="dg ana kucuk" data-act="gorev-yeni">${ikon('arti', 'k')} Ekle</button>`;
  let govde = '';
  if (f === 'akis') {
    const L = [...d.program].sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99'));
    govde = `<section class="kart">${L.length ? `<div class="akis">${L.map(akisSatir).join('')}</div><div class="kart-alt"><span class="kucuk-yazi">Saat saat düğün gecesi programı</span><span class="bosluk" style="flex:1"></span><button class="dg sade kucuk" data-act="yazdir" data-v="akis">${ikon('yazdir', 'kk')} Yazdır</button></div>` : `<div class="bos"><span class="serif">Akış boş</span>Düğün gecesinin saat saat programını ekleyin.<br><button class="dg cizgili" data-act="akis-sablon">Hazır akışı ekle</button></div>`}</section>`;
  } else if (f === 'kisi') {
    const G = new Map(); for (const g of d.gorevler) { const k = g.kim || ''; (G.get(k) || G.set(k, []).get(k)).push(g); }
    const P = d.program.filter((p) => p.kim);
    for (const p of P) if (!G.has(p.kim)) G.set(p.kim, []);
    const anahtarlar = [...G.keys()].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b, 'tr'));
    govde = anahtarlar.length ? `<div class="yigin-b">${anahtarlar.map((k) => { const L = G.get(k), pp = P.filter((p) => p.kim === k); return `<section class="kart"><div class="kart-bas"><h3>${esc(k || 'Kimse atanmadı')}</h3><span class="rozet">${L.filter((g) => g.bitti).length}/${L.length}</span><span class="bosluk"></span>${k ? `<button class="dg sade kucuk" data-act="kisi-gonder" data-v="${esc(k)}">${ikon('mesaj', 'kk')} Gönder</button>` : ''}</div>${L.map((g) => gorevSatir(g, bugun)).join('')}${pp.length ? `<div class="akis" style="margin-top:6px">${pp.map(akisSatir).join('')}</div>` : ''}</section>`; }).join('')}</div>` : '<div class="kart bos"><span class="serif">Henüz görev yok</span>Görevlere bir kişi atadığınızda burada kişi kişi listelenir.</div>';
    govde += `<p class="kucuk-yazi" style="margin-top:12px">Her kişinin listesini “Gönder” ile WhatsApp’tan iletebilirsiniz.</p>`;
  } else {
    const L = d.gorevler.filter((g) => g.bolum === f).sort((a, b) => (a.bitti ? 1 : 0) - (b.bitti ? 1 : 0) || (a.tarih || '9').localeCompare(b.tarih || '9') || a.eklenme - b.eklenme);
    const eksik = f === 'hazirlik' ? C.GOREV_HAZIRLIK.filter((ad) => !d.gorevler.some((g) => C.trNorm(g.ad) === C.trNorm(ad))) : C.GOREV_GUN.map((x) => x[0]).filter((ad) => !d.gorevler.some((g) => C.trNorm(g.ad) === C.trNorm(ad)));
    const bitti = L.filter((g) => g.bitti).length;
    govde = `<section class="kart">${L.length ? `<div class="kart-bas"><span class="kucuk-yazi">${bitti} / ${L.length} tamamlandı</span><span class="bosluk"></span><div style="flex:0 0 110px" class="ilerleme"><i style="width:${Math.round((bitti / L.length) * 100)}%"></i></div></div>${L.map((g) => gorevSatir(g, bugun)).join('')}` : `<div class="bos"><span class="serif">${f === 'gun' ? 'Düğün günü görevleri' : 'Hazırlık listesi'}</span>${f === 'gun' ? 'Düğün günü kimin ne yapacağını buraya yazın.' : 'Düğün öncesi yapılacakları ekleyin ya da hazır listeyi kullanın.'}</div>`}
      <div class="kart-alt">${eksik.length ? `<button class="dg sade kucuk" data-act="gorev-sablon">${ikon('arti', 'kk')} Hazır listeden ekle (${eksik.length})</button>` : ''}<span class="bosluk" style="flex:1"></span>${L.length ? `<button class="dg sade kucuk" data-act="yazdir" data-v="gorev">${ikon('yazdir', 'kk')} Yazdır</button>` : ''}</div></section>`;
  }
  return `<div class="bolum-bas"><h1>Görevler</h1><span class="bosluk"></span>${ekle}</div><div style="margin-bottom:14px">${seg}</div>${govde}`;
}
function kisiSecenekleri() { const d = D(), s = new Set(); for (const g of d.gorevler) if (g.kim) s.add(g.kim); for (const p of d.program) if (p.kim) s.add(p.kim); if (d.bilgi.gelin) s.add(d.bilgi.gelin); if (d.bilgi.damat) s.add(d.bilgi.damat); return `<datalist id="kisiler">${[...s].sort((a, b) => a.localeCompare(b, 'tr')).map((k) => `<option value="${esc(k)}">`).join('')}</datalist>`; }
function gorevSayfasi(id, bolum = S.gf === 'gun' ? 'gun' : 'hazirlik') {
  const d = D(), g = id ? d.gorevler.find((x) => x.id === id) : null;
  const v = g || { ad: '', kim: '', tarih: '', bolum, not: '', bitti: false };
  const c = cekmece({ baslik: g ? 'Görevi düzenle' : 'Yeni görev', govde: `<form class="yigin" id="gF" autocomplete="off">
    <label class="alan"><span>Görev</span><input class="girdi" name="ad" value="${esc(v.ad)}" maxlength="140" placeholder="Örn. Gelin arabasını süsletmek" required></label>
    <label class="alan"><span>Kim yapacak?</span><input class="girdi" name="kim" list="kisiler" value="${esc(v.kim)}" maxlength="60" placeholder="Bir isim yazın">${kisiSecenekleri()}</label>
    <div class="izgara2"><label class="alan"><span>Son tarih</span><input class="girdi" name="tarih" type="date" value="${esc(v.tarih)}"></label><div class="alan"><span>Bölüm</span>${segment('bolum', [['hazirlik', 'Hazırlık'], ['gun', 'Düğün günü']], v.bolum)}</div></div>
    <label class="alan"><span>Not</span><textarea class="girdi" name="not" rows="3" maxlength="400">${esc(v.not)}</textarea></label></form>`,
  alt: `${g ? `<button class="dg tehlike" data-m="sil" aria-label="Sil">${ikon('cop', 'k')}</button>` : ''}<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" data-m="kaydet">${g ? 'Kaydet' : 'Ekle'}</button>` });
  segBagla(c.el);
  c.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    if (b.dataset.m === 'sil') { uygula([{ t: 'sil', k: 'gorevler', id }], 'Görev silindi'); c.kapat(); bildir('Görev silindi', { eylem: geriAl }); return; }
    const f = new FormData($('#gF', c.el)); const y = { ad: String(f.get('ad') || '').trim(), kim: String(f.get('kim') || '').trim(), tarih: String(f.get('tarih') || ''), not: String(f.get('not') || ''), bolum: segDeger(c.el, 'bolum') };
    if (!y.ad) return bildir('Görevi yazın', { hata: true });
    uygula([g ? { t: 'guncelle', k: 'gorevler', id, v: y } : { t: 'ekle', k: 'gorevler', v: { ...y, id: C.rastgele(8), bitti: false, eklenme: Date.now() } }], g ? 'Görev güncellendi' : 'Görev eklendi');
    c.kapat();
  });
}
function akisSayfasi(id) {
  const d = D(), p = id ? d.program.find((x) => x.id === id) : null, v = p || { saat: '', ad: '', kim: '', not: '' };
  const c = cekmece({ baslik: p ? 'Akış adımını düzenle' : 'Akışa ekle', govde: `<form class="yigin" id="aF" autocomplete="off">
    <div class="izgara2" style="grid-template-columns:120px minmax(0,1fr)"><label class="alan"><span>Saat</span><input class="girdi" name="saat" type="time" value="${esc(v.saat)}"></label><label class="alan"><span>Ne olacak?</span><input class="girdi" name="ad" value="${esc(v.ad)}" maxlength="120" placeholder="Örn. Pasta kesimi" required></label></div>
    <label class="alan"><span>Sorumlu</span><input class="girdi" name="kim" list="kisiler" value="${esc(v.kim)}" maxlength="60" placeholder="Örn. DJ, Ayşe teyze">${kisiSecenekleri()}</label>
    <label class="alan"><span>Not</span><textarea class="girdi" name="not" rows="2" maxlength="300">${esc(v.not)}</textarea></label></form>`,
  alt: `${p ? `<button class="dg tehlike" data-m="sil" aria-label="Sil">${ikon('cop', 'k')}</button>` : ''}<button class="dg sade" data-kapat>Vazgeç</button><button class="dg ana" data-m="kaydet">${p ? 'Kaydet' : 'Ekle'}</button>` });
  c.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    if (b.dataset.m === 'sil') { uygula([{ t: 'sil', k: 'program', id }], 'Akış adımı silindi'); c.kapat(); bildir('Silindi', { eylem: geriAl }); return; }
    const f = new FormData($('#aF', c.el)); const y = { saat: String(f.get('saat') || ''), ad: String(f.get('ad') || '').trim(), kim: String(f.get('kim') || '').trim(), not: String(f.get('not') || '') };
    if (!y.ad) return bildir('Ne olacağını yazın', { hata: true });
    uygula([p ? { t: 'guncelle', k: 'program', id, v: y } : { t: 'ekle', k: 'program', v: { ...y, id: C.rastgele(8) } }], p ? 'Akış güncellendi' : 'Akışa eklendi');
    c.kapat();
  });
}
function kisiyeGonder(kim) {
  const d = D(), L = d.gorevler.filter((g) => g.kim === kim && !g.bitti), P = d.program.filter((p) => p.kim === kim).sort((a, b) => (a.saat || '').localeCompare(b.saat || ''));
  const m = `Merhaba ${kim}, ${C.ciftAdi(d.bilgi)} düğünü için senden ricalarımız:\n` + L.map((g) => `• ${g.ad}${g.tarih ? ' (' + C.tarihYaz(g.tarih, { yil: false }) + ')' : ''}`).join('\n') + (P.length ? '\n\nDüğün gecesi:\n' + P.map((p) => `• ${C.saatYaz(p.saat)} ${p.ad}`).join('\n') : '') + '\n\nTeşekkürler!';
  window.open(waLink('', m), '_blank', 'noopener');
}

// ---------------------------------------------------------------- paylaş
function paylasCiz(el) {
  const d = D(), link = paylasLink('/d/' + S.kod), lcvA = C.lcvAcikMi(d), bulA = C.bulucuAcikMi(d);
  const bul = { otomatik: bulA ? 'Şu an açık (düğün günü)' : `Düğün günü kendiliğinden açılacak${d.bilgi.tarih ? ` (${C.tarihYaz(C.gunEkle(d.bilgi.tarih, -1), { yil: false })} öğleden itibaren)` : ''}`, acik: 'Açık', kapali: 'Kapalı' }[d.ayar.bulucu];
  const belge = (v, i, ad, alt) => `<button data-act="yazdir" data-v="${v}">${ikon(i)}<span><b>${ad}</b><small>${alt}</small></span>${ikon('sag', 'k')}</button>`;
  el.innerHTML = `<div class="bolum-bas"><h1>Paylaş</h1></div>
  <div class="paylas-izgara">
    <section class="kart"><div class="kart-bas"><h2>Davetiye bağlantısı</h2></div><p class="durum-satir"><span class="nokta ${lcvA ? 'geliyor' : ''}"></span>${lcvA ? 'Katılım bildirimi açık' : 'Katılım bildirimi kapalı'}</p>
      <p class="soluk" style="margin-bottom:14px">Misafirleriniz bu bağlantıdan davetiyenizi görür ve katılım durumunu bildirir. Düğün günü aynı bağlantı masa bulucuya dönüşür.</p>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="qr-kutu" id="qr1"></div><div class="yigin" style="flex:1;min-width:200px;gap:10px">
        <div class="baglanti"><code id="l1">${esc(link)}</code><button class="dg kucuk" data-act="kopya" data-v="${esc(link)}">${ikon('kopya', 'kk')} Kopyala</button></div>
        <a class="dg vurgu" target="_blank" rel="noopener" href="${esc(waLink('', davetMetni('')))}">${ikon('mesaj', 'k')} WhatsApp ile gönder</a>
        <div class="dg-grup" style="gap:4px 12px"><button class="dg sade kucuk" data-act="qr-indir">${ikon('indir', 'kk')} QR’ı indir</button><a class="dg sade kucuk" href="${href('/d/' + S.kod)}" data-git="/d/${S.kod}">${ikon('goz', 'kk')} Sayfayı gör</a></div></div></div></section>
    <section class="kart"><div class="kart-bas"><h2>Masa bulucu</h2></div><p class="durum-satir"><span class="nokta ${bulA ? 'geliyor' : ''}"></span>${esc(bul)}</p>
      <p class="soluk" style="margin-bottom:14px">Düğün günü misafir QR kodu okutur, adını yazar ve masasını salon planında görür. Salonun girişi için A4 afiş hazır.</p>
      <div class="dg-grup"><button class="dg ana" data-act="yazdir" data-v="poster">${ikon('yazdir', 'k')} Afişi yazdır</button><button class="dg cizgili" data-act="ayar-bulucu">Ayarlar</button></div></section>
    <section class="kart"><div class="kart-bas"><h2>Yazdır</h2></div><div class="belge-sec">
      ${belge('masalar', 'masa', 'Masa listesi', 'Her masada kimler var; kişi, çocuk ve vejetaryen sayılarıyla.')}
      ${belge('alfabe', 'davetli', 'Giriş listesi', 'Karşılama için isimden masaya, alfabetik.')}
      ${belge('kartlar', 'dosya', 'Masa numara kartları', 'Her masa için büyük numaralı kart.')}
      ${belge('plan', 'duzen', 'Salon planı', 'Masa numaralarıyla kuşbakışı plan.')}
      ${belge('gorev', 'gorev', 'Görev listesi', 'Kim ne yapacak, kişi kişi.')}
      ${belge('akis', 'akis', 'Düğün akışı', 'DJ, sunucu ve salon için saat saat program.')}</div></section>
    <section class="kart"><div class="kart-bas"><h2>Dışa aktar</h2></div><div class="belge-sec">
      <button data-act="csv">${ikon('indir')}<span><b>Davetli listesi</b><small>Excel ve Google E-Tablolar’ın açtığı CSV dosyası.</small></span>${ikon('sag', 'k')}</button>
      <button data-act="yedek">${ikon('dosya')}<span><b>Yedek dosyası</b><small>Tüm planınızın bir kopyası (JSON).</small></span>${ikon('sag', 'k')}</button></div>
      ${ONIZLEME ? '<p class="kucuk-yazi" style="margin-top:10px">Önizlemede yazdırma ve indirme kapalıdır; gerçek sitede çalışır.</p>' : ''}</section>
  </div>`;
  $('#qr1', el).innerHTML = qrSvg(link);
}

// ---------------------------------------------------------------- ayarlar
function ayarlar(odak = '') {
  const d = D(), a = d.ayar, b = d.bilgi, yetkili = S.rol !== 'cift';
  const c = cekmece({ baslik: 'Ayarlar', genis: true, govde: `<div class="yigin" style="gap:20px">
    <section class="ayar-bolum"><h3>Düğün bilgileri</h3><div class="yigin">
      <div class="izgara2"><label class="alan"><span>Gelin</span><input class="girdi" data-b="gelin" value="${esc(b.gelin)}" maxlength="40"></label><label class="alan"><span>Damat</span><input class="girdi" data-b="damat" value="${esc(b.damat)}" maxlength="40"></label></div>
      <label class="alan"><span>Davetiyede aile adı <span class="ipucu">(isteğe bağlı)</span></span><input class="girdi" data-b="aile" value="${esc(b.aile)}" maxlength="90" placeholder="Örn. Şahin ve Öztürk aileleri"></label>
      ${yetkili ? `<div class="izgara3"><label class="alan"><span>Tarih</span><input class="girdi" type="date" data-m="tarih" value="${esc(b.tarih)}"></label><label class="alan"><span>Başlangıç</span><input class="girdi" type="time" data-m="saat" value="${esc(b.saat)}"></label><label class="alan"><span>Bitiş</span><input class="girdi" type="time" data-m="bitis" value="${esc(b.bitis)}"></label></div>` : `<p class="kucuk-yazi">${ikon('takvim', 'kk')} ${esc(C.tarihYaz(b.tarih, { gun: true }))} · ${esc(C.saatYaz(b.saat))} · ${esc(d.alanAd)}. Tarih ya da saat değişikliği için salonunuzla görüşün.</p>`}</div></section>
    <section class="ayar-bolum" style="gap:4px"><h3 style="margin-bottom:4px">Davet ve katılım</h3>
      ${anahtar('lcv', 'Katılım bildirimi açık', a.lcv === 'acik', 'Misafirler davetiye bağlantısından geleceklerini bildirebilir.')}
      <div class="alan" style="margin-top:6px"><span>Kimler yanıt verebilir?</span>${segment('lcvMod', [['herkes', 'Bağlantıyı açan herkes'], ['liste', 'Sadece listedekiler']], a.lcvMod)}</div>
      <label class="alan" style="margin-top:10px"><span>Son yanıt tarihi <span class="ipucu">(isteğe bağlı)</span></span><input class="girdi" type="date" data-a="lcvSon" value="${esc(a.lcvSon)}"></label>
      ${anahtar('telSor', 'Telefon numarası da iste', a.telSor)}
      <label class="alan" style="margin-top:6px"><span>Davetiye sayfasındaki mesajınız</span><textarea class="girdi" data-a="mesaj" rows="3" maxlength="600" placeholder="Örn. Bu mutlu günümüzde sizleri de aramızda görmekten mutluluk duyarız.">${esc(a.mesaj)}</textarea></label></section>
    <section class="ayar-bolum" id="ayBulucu"><h3>Masa bulucu</h3>${segment('bulucu', [['otomatik', 'Düğün günü otomatik'], ['acik', 'Şimdi aç'], ['kapali', 'Kapalı']], a.bulucu)}
      ${anahtar('komsu', 'Masa arkadaşlarını göster', a.komsu, 'Misafir masasını bulunca aynı masadakilerin adlarını da görür.')}
      <p class="kucuk-yazi">Masa bulucu açıkken davetli adları ve masa numaraları, düğün bağlantınızı açan kişilere görünür.</p></section>
    <section class="ayar-bolum" id="ayOturma" style="gap:8px"><h3>Gruplar ve yerleşim önceliği</h3><p class="kucuk-yazi">Üstteki gruplar otomatik yerleştirmede sahneye daha yakın oturur.</p>
      <div class="liste" id="grL">${d.gruplar.map((g, i) => `<div class="satir"><span class="baslik-harf">${i + 1}</span><span class="ana"><b>${esc(g)}</b><small>${d.davetliler.filter((x) => C.trNorm(x.grup) === C.trNorm(g)).length} davetiye</small></span><button class="dg ikon-d" data-g="yukari" data-i="${i}" aria-label="Yukarı"${i ? '' : ' disabled'}>${ikon('yukari', 'k')}</button><button class="dg ikon-d" data-g="asagi" data-i="${i}" aria-label="Aşağı"${i < d.gruplar.length - 1 ? '' : ' disabled'}>${ikon('asagi', 'k')}</button><button class="dg ikon-d" data-g="ad" data-i="${i}" aria-label="Adını değiştir">${ikon('kalem', 'k')}</button><button class="dg ikon-d" data-g="sil" data-i="${i}" aria-label="Sil">${ikon('cop', 'k')}</button></div>`).join('')}</div>
      <button class="dg cizgili kucuk" data-g="ekle" style="margin-top:8px">${ikon('arti', 'kk')} Grup ekle</button></section>
    <section class="ayar-bolum"><h3>Giriş kodu</h3><div style="display:flex;align-items:center;gap:10px"><b class="pin-goster">${esc(C.girisKoduYaz(S.pin) || '—')}</b>${S.pin ? `<button class="dg ikon-d" type="button" data-p="kopya" aria-label="Kodu kopyala">${ikon('kopya', 'k')}</button>` : ''}</div>
      <p class="kucuk-yazi">${S.rol === 'cift' ? 'Eşiniz de bu kodla <b>nfcdunyasi.com/dugun</b> adresinden “Etkinlik sahibi” sekmesiyle girebilir.' : 'Çift <b>nfcdunyasi.com/dugun</b> adresinde “Etkinlik sahibi” sekmesine bu kodu yazarak girer.'}</p>
      <div class="dg-grup">${S.rol === 'cift' && S.pin ? `<a class="dg cizgili kucuk" target="_blank" rel="noopener" href="${esc(waLink('', `Düğün Planla giriş kodumuz: ${C.girisKoduYaz(S.pin)}\n${paylasLink('/dugun')}`))}">${ikon('mesaj', 'kk')} Eşinizle paylaşın</a>` : ''}<button class="dg cizgili kucuk" data-p="yeni">${ikon('yenile', 'kk')} Yeni kod oluştur</button></div>
      <div><button class="dg tehlike kucuk" data-p="cikis">${ikon('cikis', 'kk')} Bu cihazda çıkış yap</button></div></section></div>`,
  alt: `<button class="dg ana" data-kapat>Bitti</button>`,
  onKapat: () => {
    const ops = [];
    const bv = {}; $$('[data-b]', c.el).forEach((i) => { if (i.value.trim() !== (b[i.dataset.b] || '')) bv[i.dataset.b] = i.value.trim(); });
    if (Object.keys(bv).length) ops.push({ t: 'bilgi', v: bv });
    const av = { lcv: $('[data-k=lcv]', c.el).checked ? 'acik' : 'kapali', telSor: $('[data-k=telSor]', c.el).checked, komsu: $('[data-k=komsu]', c.el).checked, lcvSon: $('[data-a=lcvSon]', c.el).value, mesaj: $('[data-a=mesaj]', c.el).value, lcvMod: segDeger(c.el, 'lcvMod'), bulucu: segDeger(c.el, 'bulucu') };
    const fark = Object.fromEntries(Object.entries(av).filter(([k, v]) => (a[k] ?? '') !== v));
    if (Object.keys(fark).length) ops.push({ t: 'ayar', v: fark });
    if (ops.length) { uygula(ops, 'Ayarlar'); bildir('Ayarlar kaydedildi'); }
    if (yetkili) { const mv = {}; $$('[data-m]', c.el).forEach((i) => { if (i.value !== (b[i.dataset.m] || '')) mv[i.dataset.m] = i.value; }); if (Object.keys(mv).length) metaKaydet(mv); }
  } });
  segBagla(c.el);
  if (odak) setTimeout(() => $(odak === 'oturma' ? '#ayOturma' : '#ayBulucu', c.el)?.scrollIntoView({ block: 'start' }), 60);
  c.el.addEventListener('click', async (e) => {
    const g = e.target.closest('[data-g]');
    if (g) {
      const G = [...D().gruplar], i = +g.dataset.i;
      if (g.dataset.g === 'yukari' && i > 0) [G[i - 1], G[i]] = [G[i], G[i - 1]];
      else if (g.dataset.g === 'asagi' && i < G.length - 1) [G[i + 1], G[i]] = [G[i], G[i + 1]];
      else if (g.dataset.g === 'sil') { if (G.length <= 1) return bildir('En az bir grup kalmalı'); G.splice(i, 1); }
      else if (g.dataset.g === 'ad') { const y = C.str(await prompt2('Grubun yeni adı', G[i]), 30); if (!y || y === G[i]) return; const eski = G[i]; G[i] = y; uygula([{ t: 'gruplar', v: G }, ...D().davetliler.filter((x) => C.trNorm(x.grup) === C.trNorm(eski)).map((x) => ({ t: 'guncelle', k: 'davetliler', id: x.id, v: { grup: y } }))], 'Grup adı değişti'); yenidenAc(); return; }
      else if (g.dataset.g === 'ekle') { const y = C.str(await prompt2('Yeni grup adı'), 30); if (!y) return; if (G.some((z) => C.trNorm(z) === C.trNorm(y))) return bildir('Bu grup zaten var'); G.push(y); }
      else return;
      uygula([{ t: 'gruplar', v: G }], 'Gruplar'); yenidenAc(); return;
    }
    const p = e.target.closest('[data-p]'); if (!p) return;
    if (p.dataset.p === 'cikis') { if (await onayla({ baslik: 'Çıkış yapılsın mı?', metin: 'Tekrar girmek için giriş kodu gerekir. Kaydedilmemiş değişiklik varsa önce gönderilir.', evet: 'Çıkış yap' })) { await S.sen.gonder(); c.kapat(); S.cikis && S.cikis(); } }
    else if (p.dataset.p === 'kopya') kopyala(C.girisKoduYaz(S.pin));
    else if (p.dataset.p === 'yeni') {
      if (!(await onayla({ baslik: 'Yeni giriş kodu oluşturulsun mu?', metin: S.rol === 'cift' ? 'Eski kod çalışmaz; eşinizin ve diğer cihazlardaki oturumlar kapanır. Yeni kodu eşinizle paylaşmanız gerekir.' : 'Eski kod çalışmaz ve çiftin açık oturumları kapanır; yeni kodu çifte iletmeniz gerekir.', evet: 'Oluştur' }))) return;
      try { const r = await api.pin(S.kod, {}, S.sen.token); if (r.token) { S.sen.token = r.token; depoYerel.koy(TK.cift(S.kod), r.token); } S.pin = r.girisKodu; bildir('Yeni giriş kodu: ' + C.girisKoduYaz(r.girisKodu), { sure: 9000 }); c.kapat(); ayarlar(); } catch (er) { bildir(er.message, { hata: true }); }
    }
  });
  const yenidenAc = () => { const st = c.el.querySelector('.cekmece-govde').scrollTop; c.kapat(); ayarlar(); const g2 = $$('dialog.cekmece').at(-1); if (g2) g2.querySelector('.cekmece-govde').scrollTop = st; };
}
async function metaKaydet(v) {
  try { const r = await api.meta(S.kod, { bilgi: v }, S.sen.token); S.sen.belgeAl(r.dugun); ciz(); bildir('Tarih ve saat kaydedildi'); } catch (e) { bildir(e.message, { hata: true }); }
}

// ---------------------------------------------------------------- olay dağıtımı
async function gorunumTik(e) {
  const b = e.target.closest('[data-act]'); if (!b || !S) return;
  const id = b.dataset.id, v = b.dataset.v;
  switch (b.dataset.act) {
    case 'davetli': return davetliSayfasi(id);
    case 'uyari': { const u = S._uyari?.[+b.dataset.i]; if (!u) return; if (u.davetli) return davetliSayfasi(u.davetli); if (u.hedef === 'yeni') { S.f.durum = 'yeni'; return git(yolu('davetliler')); } if (u.masa || u.hedef === 'oturma') { await git(yolu('oturma')); if (u.masa) setTimeout(() => S && masaSayfasi(u.masa), 150); } return; }
    case 'davetli-yeni': return davetliSayfasi(null);
    case 'davetli-menu': return davetliMenu();
    case 'toplu': return topluEkle();
    case 'filtre': S.f.durum = v; return ciz();
    case 'sec': { const s = S.f.secim; s.has(id) ? s.delete(id) : s.add(id); return ciz(); }
    case 'secim-kapat': S.f.secim = null; return ciz();
    case 'secim-hepsi': { const L = D().davetliler.filter(davetliFiltre); if (S.f.secim.size === L.length) S.f.secim.clear(); else L.forEach((x) => S.f.secim.add(x.id)); return ciz(); }
    case 'secim-islem': return secimIslem();
    case 'oto': return otomatik();
    case 'tepsi': return tepsi();
    case 'secim-iptal': S.secili = null; return ciz();
    case 'lejant': return bildir('Dolu sandalyeler: pembe gelin tarafı, mor damat tarafı, gri ortak. Kırmızı çerçeveli masa taşıyor.', { sure: 6000 });
    case 'bul-git': { const x = D().davetliler.find((z) => z.id === id); $('#oAraSonuc').innerHTML = ''; $('#oAra').value = ''; if (x?.masa) { S.vurgu = x.masa; S.harita.ciz(); S.harita.odakla(x.masa); setTimeout(() => { if (S?.vurgu === x.masa) { S.vurgu = null; S.harita?.ciz(); } }, 4000); } else { S.secili = id; ciz(); bildir(`${x.ad} için bir masaya dokunun`); } return; }
    case 'gorev-bitti': { const g = D().gorevler.find((z) => z.id === id); if (g) uygula([{ t: 'guncelle', k: 'gorevler', id, v: { bitti: !g.bitti } }], g.bitti ? 'Görev açıldı' : 'Görev tamamlandı'); return; }
    case 'gorev': return gorevSayfasi(id);
    case 'gorev-yeni': return gorevSayfasi(null);
    case 'gorev-sekme': S.gf = v; git(yolu('gorevler')); return;
    case 'gorev-sablon': { const d = D(), ad = S.gf === 'gun' ? C.GOREV_GUN.map((x) => x[0]) : C.GOREV_HAZIRLIK; const L = ad.filter((a) => !d.gorevler.some((g) => C.trNorm(g.ad) === C.trNorm(a))); uygula(L.map((a, i) => ({ t: 'ekle', k: 'gorevler', v: { id: C.rastgele(8), ad: a, bolum: S.gf === 'gun' ? 'gun' : 'hazirlik', eklenme: Date.now() + i } })), `${L.length} görev eklendi`); return bildir(`${L.length} görev eklendi`, { eylem: geriAl }); }
    case 'akis': return akisSayfasi(id);
    case 'akis-yeni': return akisSayfasi(null);
    case 'akis-sablon': uygula(C.PROGRAM_SABLON.map(([saat, ad]) => ({ t: 'ekle', k: 'program', v: { id: C.rastgele(8), saat, ad } })), 'Hazır akış eklendi'); return;
    case 'kisi-gonder': return kisiyeGonder(v);
    case 'kopya': return kopyala(v, $('#l1'));
    case 'qr-indir': return qrPng(paylasLink('/d/' + S.kod), `davet-qr-${S.kod}.png`, C.ciftAdi(D().bilgi));
    case 'yazdir': return yazdir(v, D(), { salon: S.salon, link: paylasLink('/d/' + S.kod) });
    case 'csv': return indir(`davetliler-${S.kod}.csv`, davetliCsv(D()), 'text/csv;charset=utf-8');
    case 'yedek': return indir(`dugun-yedek-${S.kod}.json`, JSON.stringify(D(), null, 1), 'application/json');
    case 'ayar-bulucu': return ayarlar('bulucu');
    default:
  }
}
function gorunumDegis(e) {
  const t = e.target;
  if (t.dataset.k === 'grupla') { S.f.grupla = t.value; ciz(); }
}
const araGecikmeli = gecikmeli(() => { if (S?.sekme === 'davetliler') { const el = $('#dAra'); const p = el?.selectionStart; ciz(); const y = $('#dAra'); if (y) { y.focus(); try { y.setSelectionRange(p, p); } catch { /* */ } } } }, 160);
function gorunumGirdi(e) { if (e.target.id === 'dAra') { S.f.q = e.target.value; araGecikmeli(); } }
document.addEventListener('seg', (e) => { if (!S || e.target.dataset.seg !== 'gf' || !e.target.closest('#gorunum')) return; S.gf = e.detail; ciz(); });
