// Düğün Planla — giriş noktası: yönlendirme, tanıtım sayfası, salon sayfası, çift girişi, demo
import * as C from './cekirdek.js?v=2026-11-21-f';
import { api, depoYerel, TK } from './api.js?v=2026-11-21-f';
import { $, $$, esc, ikon, markaIkon, bildir, yol, git, href, demoYol, temaUygula, temaSifirla, cekmeceKapatHepsi, ayrilmaKoy, onayla, ONIZLEME } from './ui.js?v=2026-11-21-f';
import { davetliAc, logoHtml, imza, hataSayfasi } from './davetli.js?v=2026-11-21-f';
import { planSvg } from './harita.js?v=2026-11-21-f';

const kok = document.getElementById('uygulama');
const WA = 'https://wa.me/905432250512?text=' + encodeURIComponent('Merhaba, salonumuz için Düğün Planla hakkında bilgi almak istiyorum.');
let aktifPlan = null, sonYol = null;
function robots(acik) { let m = document.querySelector('meta[name=robots]'); if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); } m.content = acik ? 'index, follow' : 'noindex, nofollow'; }
const yukleniyor = () => { kok.innerHTML = '<div class="yukleniyor"><i></i></div>'; };
const marka = (alt = '') => `<a class="marka" href="${href('/dugun')}" data-git="/dugun">${markaIkon(28)}<span>Düğün Planla${alt}</span></a>`;
const altBilgi = (baglar = true) => `<footer class="sayfa-alt"><span>Düğün Planla, bir NFC Dünyası ürünüdür.</span>${baglar ? `<span class="dg-grup"><a href="${href('/dugun/giris?salon')}" data-git="/dugun/giris?salon">Salon girişi</a><a href="/">nfcdunyasi.com</a><a href="/oyun/">Okut ve Oyna</a></span>` : ''}</footer>`;

async function yonlendir(zorla = false) {
  let p = (yol().split('?')[0].replace(/\/+$/, '') || '/');
  if (p === sonYol && !zorla) return;
  sonYol = p;
  cekmeceKapatHepsi();
  let demo = false;
  if (p === '/dugun/demo' || p.startsWith('/dugun/demo/')) { demo = true; p = p.slice(11) || '/'; }
  else if (p.startsWith('/dugun/yonetim')) p = p.slice(6);
  demoYol(demo);
  try { await api.kur({ demo }); } catch (e) { hataSayfasi(kok, 'Demo açılamadı', e.message); return; }
  const P = p.split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  robots(!demo && P.length === 1 && P[0] === 'dugun');
  if (P[0] === 'd' && P[1] && P[2] === 'plan') return planAc(P[1].toLowerCase(), P[3] || 'ozet');
  if (aktifPlan) { aktifPlan.ctl.kapat(); aktifPlan = null; }
  ayrilmaKoy(null); window.scrollTo(0, 0); document.title = 'Düğün Planla · NFC Dünyası';
  if (P[0] === 'd' && P[1]) { temaSifirla(); return davetliAc(kok, P[1].toLowerCase()); }
  if (P[0] === 'salon' && P[1] && P[2] === 'yonetim') { const { yonetimAc } = await import('./yonetim.js?v=2026-11-21-f'); return yonetimAc(kok, { rol: 'salon', slug: P[1].toLowerCase(), alt: P.slice(3).join('/') }); }
  if (P[0] === 'salon' && P[1]) return salonSayfasi(P[1].toLowerCase());
  if (P[0] === 'yonetim') { const { yonetimAc } = await import('./yonetim.js?v=2026-11-21-f'); return yonetimAc(kok, { rol: 'yonetici', alt: P.slice(1).join('/') }); }
  temaSifirla();
  if (P[0] === 'dugun' && P[1] === 'giris' && !demo) return girisSayfasi();
  if (demo) return demoMerkez();
  return acilis();
}
window.addEventListener('dp-yol', () => yonlendir());
window.addEventListener('popstate', () => yonlendir());
if (ONIZLEME) window.addEventListener('hashchange', () => yonlendir());

// ---------------------------------------------------------------- çift paneli girişi
async function planAc(kod, sekme) {
  if (aktifPlan && aktifPlan.kod === kod) { aktifPlan.ctl.goster(sekme); return; }
  if (aktifPlan) { aktifPlan.ctl.kapat(); aktifPlan = null; }
  temaSifirla(); yukleniyor();
  let genel;
  try { genel = await api.dugun(kod); } catch (e) {
    if (e.durum === 404) return hataSayfasi(kok, 'Düğün kodu bulunamadı', 'Kodu kontrol edin. Kodunuzu ve PIN’inizi düğün salonunuz verir.');
    if (e.durum === 403) return hataSayfasi(kok, 'Bu sayfa şu anda kapalı', 'Salonunuzun Düğün Planla hesabı şu an kapalı görünüyor. Lütfen salonla görüşün.');
    return hataSayfasi(kok, 'Bağlanılamadı', e.message);
  }
  const adaylar = [depoYerel.al(TK.cift(kod)), genel.salon ? depoYerel.al(TK.salon(genel.salon.slug)) : '', depoYerel.al(TK.yonetici)].filter(Boolean);
  for (const t of adaylar) {
    try { const r = await api.tam(kod, '', t); return planBaslat(kod, t, r, sekme, genel); }
    catch (e) { if (e.durum !== 401 && e.durum !== 403) return hataSayfasi(kok, 'Bağlanılamadı', e.message); if (t === depoYerel.al(TK.cift(kod))) depoYerel.sil(TK.cift(kod)); }
  }
  pinEkrani(kod, genel, sekme);
}
async function planBaslat(kod, token, r, sekme, genel) {
  const { planlayiciAc } = await import('./planlayici.js?v=2026-11-21-f');
  document.title = `${C.ciftAdi(r.dugun.bilgi)} · Düğün Planla`;
  aktifPlan = {
    kod, ctl: planlayiciAc(kok, {
      kod, token, rol: r.rol, veri: r, sekme,
      cikis: (sure) => { const rol = r.rol; aktifPlan?.ctl.kapat(); aktifPlan = null; sonYol = null; if (rol === 'cift') { depoYerel.sil(TK.cift(kod)); pinEkrani(kod, genel, 'ozet', sure ? 'Oturumun süresi doldu, PIN ile yeniden girin.' : ''); } else git(rol === 'salon' ? `/salon/${genel.salon.slug}/yonetim` : '/yonetim/dugunler'); },
    }),
  };
}
function pinEkrani(kod, genel, sekme, mesaj = '') {
  const b = genel.dugun.bilgi, s = genel.salon;
  temaUygula(s?.tema, { tam: false });
  const tel = s?.iletisim?.telefon;
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">${s?.tema?.logo ? logoHtml(s) : ''}
    <div><h1>${esc(C.ciftAdi(b))}</h1><p class="soluk" style="margin-top:6px">Düğün planınıza giriş${b.tarih ? ' · ' + esc(C.tarihYaz(b.tarih)) : ''}</p></div>
    <form id="pinF" autocomplete="off"><div class="pin-girdi">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" pattern="[0-9]*" aria-label="PIN ${i + 1}. hane"${i === 0 ? ' autocomplete="one-time-code"' : ''}>`).join('')}</div>
      <p class="hata-yazi" id="pinH">${esc(mesaj)}</p><button class="dg ana tam buyuk" type="submit">Giriş yap</button></form>
    <p class="kucuk-yazi">6 haneli PIN’i düğün salonunuz verir.${tel ? ` Bilmiyorsanız salonu arayın: <a href="tel:${esc(tel.replace(/[^\d+]/g, ''))}">${esc(tel)}</a>` : ''}</p>
    ${api.demo ? '<p class="rozet vurgu">Demo PIN: 123456</p>' : ''}
    <a class="dg sade kucuk" href="${href('/d/' + kod)}" data-git="/d/${kod}">Davetli sayfasına git</a>${imza()}</div></div>`;
  const I = $$('.pin-girdi input');
  const gonder = async () => {
    const pin = I.map((i) => i.value).join(''); if (pin.length !== 6) { $('#pinH').textContent = 'PIN 6 haneli olmalı.'; return; }
    const btn = $('#pinF button'); btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
    try { const r = await api.giris(kod, pin); depoYerel.koy(TK.cift(kod), r.token); const t = await api.tam(kod, '', r.token); planBaslat(kod, r.token, t, sekme, genel); }
    catch (e) { $('#pinH').textContent = e.message; btn.disabled = false; btn.textContent = 'Giriş yap'; I.forEach((i) => { i.value = ''; }); I[0].focus(); }
  };
  I.forEach((inp, i) => {
    inp.addEventListener('input', () => { const v = inp.value.replace(/\D/g, ''); if (v.length > 1) { v.slice(0, 6).split('').forEach((c, j) => { if (I[i + j]) I[i + j].value = c; }); I[Math.min(5, i + v.length)].focus(); } else { inp.value = v; if (v && I[i + 1]) I[i + 1].focus(); } if (I.every((x) => x.value)) gonder(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && I[i - 1]) { I[i - 1].focus(); I[i - 1].value = ''; } });
    inp.addEventListener('paste', (e) => { const v = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (v.length) { e.preventDefault(); v.split('').forEach((c, j) => { if (I[j]) I[j].value = c; }); I[Math.min(5, v.length)].focus(); if (v.length === 6) gonder(); } });
  });
  $('#pinF').addEventListener('submit', (e) => { e.preventDefault(); gonder(); });
  if (!matchMedia('(pointer:coarse)').matches) I[0].focus();
}

// ---------------------------------------------------------------- salonun kalıcı QR sayfası
async function salonSayfasi(slug) {
  temaSifirla(); yukleniyor();
  let r; try { r = await api.salon(slug); } catch (e) { return hataSayfasi(kok, e.durum === 404 ? 'Salon bulunamadı' : 'Bağlanılamadı', e.durum === 404 ? 'Bu bağlantıda bir salon yok ya da sayfası kapalı.' : e.message); }
  const s = r.salon, t = s.tema || {}, i = s.iletisim || {};
  temaUygula(t, { tam: true });
  document.title = s.ad;
  if (r.bugun.length === 1 && !sessionStorage.getItem('dp:sk:' + slug)) { sessionStorage.setItem('dp:sk:' + slug, '1'); git('/d/' + r.bugun[0].kod, { degistir: true }); return; }
  const yolTarifi = i.harita || (i.adres ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.ad + ' ' + i.adres)}` : '');
  const iletisim = [yolTarifi ? `<a class="dg cizgili kucuk" href="${esc(yolTarifi)}" target="_blank" rel="noopener">${ikon('konum', 'kk')} Yol tarifi</a>` : '', i.telefon ? `<a class="dg cizgili kucuk" href="tel:${esc(i.telefon.replace(/[^\d+]/g, ''))}">${ikon('telefon', 'kk')} ${esc(i.telefon)}</a>` : '', i.instagram ? `<a class="dg cizgili kucuk" href="https://instagram.com/${esc(i.instagram)}" target="_blank" rel="noopener">@${esc(i.instagram)}</a>` : '', i.web ? `<a class="dg sade kucuk" href="${esc(i.web)}" target="_blank" rel="noopener">Web sitesi</a>` : ''].filter(Boolean).join('');
  kok.innerHTML = `<div class="davet"><div class="davet-ic">
    ${t.kapak ? `<div class="kapak"><img src="${esc(t.kapak)}" alt=""><div class="ust-yazi">${esc(s.ad)}</div></div>${t.logo ? logoHtml(s) : ''}${t.slogan ? `<p class="soluk" style="text-align:center">${esc(t.slogan)}</p>` : ''}`
      : `${t.logo ? logoHtml(s) : ''}<div class="salon-bas"><h1>${esc(s.ad)}</h1>${t.slogan ? `<p class="soluk">${esc(t.slogan)}</p>` : ''}</div>`}
    ${r.bugun.length ? `<section class="bul-kart"><p class="etiket">Bugün salonumuzda</p><h2>Hangi davetteyiz?</h2><div class="bul-sonuclar">${r.bugun.map((d) => `<a class="bul-sonuc" href="${href('/d/' + d.kod)}" data-git="/d/${d.kod}"><b>${esc(C.ciftAdi(d))}</b><span>${esc([d.alanAd, C.saatYaz(d.saat)].filter(Boolean).join(' · '))}</span>${ikon('sag', 'k')}</a>`).join('')}</div></section>`
      : `<section class="bul-kart"><h2>Hoş geldiniz</h2><p class="soluk" style="text-align:center">Bugün salonumuzda planlanmış bir davet görünmüyor. Davetiyenizdeki QR kodla ya da bağlantıyla davet sayfasına ulaşabilirsiniz.</p></section>`}
    <section class="lcv-kart"><h2>Düğün sahibi misiniz?</h2><p class="soluk">Salonumuzun verdiği kodla davetli listenizi ve oturma planınızı hazırlayın.</p>
      <form id="kodF" class="yigin" style="gap:10px" autocomplete="off"><input class="girdi" name="kod" placeholder="Düğün kodunuz" autocapitalize="none" spellcheck="false" required><button class="dg ana tam" type="submit">Devam</button></form></section>
    ${i.adres || iletisim ? `<section class="kart" style="display:grid;gap:12px;text-align:center;justify-items:center">${i.adres ? `<p class="soluk">${esc(i.adres)}</p>` : ''}${iletisim ? `<div class="dg-grup" style="justify-content:center">${iletisim}</div>` : ''}</section>` : ''}
    ${s.giris ? `<p class="alt-imza"><a href="${href('/salon/' + slug + '/yonetim')}" data-git="/salon/${slug}/yonetim">Salon girişi</a></p>` : ''}${imza()}</div></div>`;
  $('#kodF').addEventListener('submit', (e) => { e.preventDefault(); const k = kodTemizle(new FormData(e.target).get('kod')); if (k) git('/d/' + k + '/plan'); else bildir('Kodu kontrol edin', { hata: true }); });
}
function kodTemizle(v) { const s = String(v || '').trim().toLowerCase(); const m = /\/d\/([a-z0-9-]+)/.exec(s); const k = (m ? m[1] : s).replace(/[^a-z0-9-]/g, ''); return C.KOD_RE.test(k) ? k : ''; }

// ---------------------------------------------------------------- tanıtım sayfası (işletme adı yok)
/** Ürün görseli: örnek bir salon planı, masaların çoğu dolu (gelin tarafı solda, damat tarafı sağda) */
function urunGorseli() {
  const plan = C.planOlustur({ en: 34, boy: 26, adet: 40, kap: 10, ek: 1, sahneEn: 10, pistEn: 10, pistDerin: 7 }).plan;
  let tohum = 5; const zar = () => { tohum = (tohum * 16807) % 2147483647; return tohum / 2147483647; };
  let dolu = 0;
  const svg = planSvg(plan, {
    izgara: false, olcu: false, isimler: false,
    bilgi: (m) => {
      const n = zar() < 0.18 ? 0 : Math.min(m.kap, 6 + Math.floor(zar() * 5)); dolu += n;
      const taraf = m.x < plan.en / 2 ? 'gelin' : 'damat';
      return { sinif: n >= m.kap ? 'tam' : '', alt: `${n}/${m.kap}`, dolu: Array.from({ length: n }, () => (zar() < 0.12 ? 'ortak' : taraf)), sandalye: m.kap };
    },
  });
  const o = C.planOzet(plan);
  return `<div class="urun"><div class="ekran"><div class="ekran-ust"><b>Kristal Salon</b><span class="orta">${o.masa} masa · ${o.kisi} kişi</span><span class="bosluk"></span><span>${dolu} / ${o.kisi} kişi yerleşti</span></div>${svg}</div>
    <div class="lejant"><span><i style="background:var(--gelin)"></i>Gelin tarafı</span><span><i style="background:var(--damat)"></i>Damat tarafı</span><span><i style="background:var(--ortak)"></i>Ortak</span></div></div>`;
}
function acilis() {
  document.title = 'Düğün Planla · Davetli listesi, oturma planı ve masa bulucu | NFC Dünyası';
  kok.innerHTML = `<div class="acilis"><div class="acilis-ust">${marka()}<span class="bosluk"></span><a class="dg sade kucuk" href="${href('/dugun/demo')}" data-git="/dugun/demo">Demo</a><a class="dg sade kucuk" href="${href('/dugun/giris')}" data-git="/dugun/giris">Giriş</a></div>
    <div class="sayfa">
    <section class="kahraman"><p class="ust-yazi">Düğün Planla</p><h1>Oturma planı artık dert değil.</h1>
      <p class="lead">Davetli listesini, katılım yanıtlarını ve salonun gerçek planı üzerindeki masaları tek yerden yönetin. Düğün günü misafirleriniz masalarını telefonlarından bulsun.</p>
      <div class="dg-grup"><a class="dg ana buyuk" href="${href('/dugun/demo')}" data-git="/dugun/demo">Demoyu deneyin</a><a class="dg sade" href="#kod" data-act="kod">Düğün sahibi girişi ${ikon('sag', 'kk')}</a></div></section>
    ${urunGorseli()}
    <section class="ozellikler">
      <div class="ozellik">${ikon('davetli')}<h3>Davetliler ve katılım</h3><p>Listeyi Excel’den yapıştırın. Davetiye bağlantısıyla gelen “katılacağım” yanıtları listeye kendiliğinden düşer.</p></div>
      <div class="ozellik">${ikon('masa')}<h3>Salonun gerçek planı</h3><p>Masa sayısı, masa başına kişi ve sahneye uzaklık salondaki gibi. Sürükleyip bırakın ya da tek dokunuşla yerleştirin.</p></div>
      <div class="ozellik">${ikon('gorev')}<h3>Kim ne yapacak</h3><p>Hazırlık listesi, düğün günü görevleri ve saat saat akış. Herkese kendi listesini WhatsApp’tan gönderin.</p></div>
      <div class="ozellik">${ikon('ara')}<h3>Masa bulucu</h3><p>Misafir girişteki QR’ı okutur, adını yazar; masası salon planında görünür. Kapıda liste aramak yok.</p></div></section>
    <section class="bolum-b"><h2>Nasıl çalışır?</h2><div class="adimlar">
      <div><span>1</span><b>Salon düğününüzü açar</b><p>Size bir düğün kodu ve 6 haneli PIN verilir.</p></div>
      <div><span>2</span><b>Davetiyeyi paylaşırsınız</b><p>Bağlantıyı ya da QR’ı gönderin; yanıtlar listenize düşer.</p></div>
      <div><span>3</span><b>Masaları yerleştirirsiniz</b><p>Sürükleyin ya da otomatik yerleştirin. Eşinizle aynı anda çalışabilirsiniz.</p></div>
      <div><span>4</span><b>Misafir masasını bulur</b><p>Düğün günü girişteki QR ya da NFC standıyla.</p></div></div></section>
    <section class="bolum-b" id="kod"><div class="kod-kart"><h2>Planınıza devam edin</h2><p class="soluk">Kodunuzu ve PIN’inizi düğün salonunuz verir.</p><form id="kodF"><input class="girdi" id="kodG" name="kod" placeholder="Düğün kodu, örn. elif-can-4k7" autocapitalize="none" spellcheck="false" autocomplete="off" required><button class="dg ana" type="submit">Devam</button></form></div></section>
    <section class="bolum-b"><div class="salon-bant"><p class="ust-yazi">Düğün salonları için</p><h2>Salonunuzun logosu, rengi ve kendi planlarıyla.</h2><p>Her alanınız gerçek ölçüleriyle çizilir. Çiftlere kod verirsiniz; girişteki kalıcı QR ya da NFC standı her düğünde o günün masa bulucusunu açar.</p>
      <div class="dg-grup"><a class="dg ana buyuk" href="${WA}" target="_blank" rel="noopener">WhatsApp’tan yazın</a><a class="dg sade" href="${href('/dugun/demo')}" data-git="/dugun/demo">Demoyu inceleyin ${ikon('sag', 'kk')}</a></div></div></section>
    ${altBilgi()}</div></div>`;
  kok.onclick = (e) => { if (e.target.closest('[data-act=kod]')) { e.preventDefault(); $('#kod').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#kodG')?.focus({ preventScroll: true }), 350); } };
  $('#kodF').addEventListener('submit', (e) => { e.preventDefault(); const k = kodTemizle(new FormData(e.target).get('kod')); if (k) git('/d/' + k + '/plan'); else bildir('Kodu kontrol edin; örneğin elif-can-4k7', { hata: true }); });
}

// ---------------------------------------------------------------- tek giriş sayfası: çift (kod + PIN), salon (kullanıcı adı + şifre), yönetici (admin)
function girisSayfasi() {
  document.title = 'Giriş · Düğün Planla';
  const salonIlk = /[?&]salon\b/.test(location.search + location.hash);
  const acik = depoYerel.al(TK.yonetici);
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">
    <a href="${href('/dugun')}" data-git="/dugun" aria-label="Düğün Planla">${markaIkon(64, 'giris-ikon')}</a>
    <div><h1>Giriş yapın</h1><p class="soluk" style="margin-top:6px" id="gAc"></p></div>
    <div class="segment tam-g" id="gT" role="tablist"><button type="button" data-v="cift" class="${salonIlk ? '' : 'on'}">Düğün sahibi</button><button type="button" data-v="salon" class="${salonIlk ? 'on' : ''}">Salon ve yönetici</button></div>
    <form id="gC" autocomplete="off"${salonIlk ? ' hidden' : ''}><label class="alan"><span>Düğün kodu</span><input class="girdi" name="kod" placeholder="örn. elif-can-4k7" autocapitalize="none" spellcheck="false" required></label><button class="dg ana tam buyuk" type="submit">Devam</button><p class="hata-yazi" id="gCH"></p></form>
    <form id="gS" autocomplete="on"${salonIlk ? '' : ' hidden'}><label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="k" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label class="alan"><span>Şifre</span><input class="girdi" name="s" type="password" autocomplete="current-password" required></label><button class="dg ana tam buyuk" type="submit">Giriş yap</button><p class="hata-yazi" id="gSH"></p></form>
    ${acik ? `<a class="dg sade kucuk" href="${href('/yonetim')}" data-git="/yonetim">Yönetici paneline devam ${ikon('sag', 'kk')}</a>` : ''}
    ${imza()}</div></div>`;
  const aciklama = { cift: 'Salonunuzun verdiği düğün kodunu yazın, ardından 6 haneli PIN’inizi girin.', salon: 'Salonunuza verilen kullanıcı adı ve şifreyle girin.' };
  const sec = (v) => { $$('#gT button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); $('#gC').hidden = v !== 'cift'; $('#gS').hidden = v !== 'salon'; $('#gAc').textContent = aciklama[v]; };
  sec(salonIlk ? 'salon' : 'cift');
  $('#gT').onclick = (e) => { const b = e.target.closest('button'); if (b) sec(b.dataset.v); };
  $('#gC').addEventListener('submit', (e) => { e.preventDefault(); const k = kodTemizle(new FormData(e.target).get('kod')); if (k) git('/d/' + k + '/plan'); else $('#gCH').textContent = 'Kodu kontrol edin; örneğin elif-can-4k7.'; });
  $('#gS').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector('button'), H = $('#gSH');
    const k = String(f.get('k') || '').trim().toLowerCase(), sf = String(f.get('s') || '');
    H.textContent = ''; b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try {
      if (k === 'admin') { const r = await api.adminGiris(k, sf); depoYerel.koy(TK.yonetici, r.token); git('/yonetim'); return; }
      const slug = C.slugla(k); if (!C.SLUG_RE.test(slug)) throw new Error('Kullanıcı adı ya da şifre hatalı.');
      let r; try { r = await api.salonGiris(slug, sf); } catch (er) { if (er.durum === 404 || er.durum === 401) throw new Error('Kullanıcı adı ya da şifre hatalı.'); throw er; }
      depoYerel.koy(TK.salon(slug), r.token); git('/salon/' + slug + '/yonetim');
    } catch (er) { H.textContent = er.message; b.disabled = false; b.textContent = 'Giriş yap'; }
  });
  if (!matchMedia('(pointer:coarse)').matches) (salonIlk ? $('#gS [name=k]') : $('#gC [name=kod]')).focus();
}

// ---------------------------------------------------------------- demo merkezi
function demoMerkez() {
  document.title = 'Düğün Planla · Demo';
  const kart = (k, i, etk, ad, metin) => `<a href="#" data-demo="${k}">${ikon(i)}<span class="etiket">${etk}</span><b>${ad}</b><p>${metin}</p></a>`;
  kok.innerHTML = `<div class="acilis"><div class="acilis-ust">${marka()}<span class="bosluk"></span>${ONIZLEME ? '' : `<a class="dg sade kucuk" href="/dugun/">Tanıtım</a>`}</div>
    <div class="sayfa"><div class="demo-bas"><h1>Demoyu deneyin</h1><p>Örnek bir salon ve iki düğün hazır: biri iki buçuk ay sonra, biri bugün. Yaptığınız değişiklikler yalnızca bu cihazda saklanır.</p></div>
    <div class="demo-secim">
      ${kart('cift', 'kalp', 'Çift', 'Elif &amp; Can’ın planı', 'Davetliler, otomatik yerleştirme, salon planında sürükle-bırak, görevler ve akış.')}
      ${kart('davet', 'mesaj', 'Misafir', 'Davetiye ve katılım', 'Misafirin gördüğü sayfa; “katılacağım” yanıtı çiftin listesine düşer.')}
      ${kart('bulucu', 'ara', 'Düğün günü', 'Masa bulucu', 'Deniz &amp; Kerem bugün evleniyor. Bir misafir adını yazsın, masası planda görünsün.')}
      ${kart('salon', 'qr', 'Salonun girişi', 'Kalıcı QR sayfası', 'Girişteki stand o günkü düğüne götürür; düğün yoksa salonun sayfası açılır.')}
      ${kart('salonPanel', 'salon', 'Salon çalışanı', 'Salon paneli', 'Düğün açma, çifte PIN verme, düğüne özel masa düzeni.')}
      ${kart('yonetim', 'ayar', 'Yönetici', 'Yönetici paneli', 'Salonlar, görünüm, salon planı düzenleyici, ödemeler ve istatistik.')}</div>
    <div class="dg-grup" style="margin-top:20px"><button class="dg sade kucuk" data-demo="sifirla">${ikon('yenile', 'kk')} Demoyu baştan başlat</button></div>
    ${altBilgi(false)}</div></div>`;
  kok.onclick = async (e) => {
    const a = e.target.closest('[data-demo]'); if (!a) return; e.preventDefault();
    const k = a.dataset.demo;
    try {
      if (k === 'cift') { const r = await api.giris('elif-can-ornek', '123456'); depoYerel.koy(TK.cift('elif-can-ornek'), r.token); git('/d/elif-can-ornek/plan'); }
      else if (k === 'davet') git('/d/elif-can-ornek');
      else if (k === 'bulucu') git('/d/deniz-kerem-ornek');
      else if (k === 'salon') { sessionStorage.removeItem('dp:sk:ornek-salon'); git('/salon/ornek-salon'); }
      else if (k === 'salonPanel') { const r = await api.salonGiris('ornek-salon', 'salon123'); depoYerel.koy(TK.salon('ornek-salon'), r.token); git('/salon/ornek-salon/yonetim'); }
      else if (k === 'yonetim') { depoYerel.koy(TK.yonetici, 'demo-yonetici'); git('/yonetim'); }
      else if (k === 'sifirla') { if (!(await onayla({ baslik: 'Demo baştan başlasın mı?', metin: 'Bu cihazda demoda yaptığınız değişiklikler silinir.', evet: 'Baştan başlat' }))) return; await api.demoSifirla(); bildir('Demo baştan başladı'); }
    } catch (er) { bildir(er.message, { hata: true }); }
  };
}

yonlendir();
