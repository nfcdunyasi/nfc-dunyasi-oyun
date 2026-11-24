// Düğün Planla — giriş noktası: yönlendirme, tanıtım sayfası, salon sayfası, çift girişi, demo
import * as C from './cekirdek.js?v=2026-11-24-b';
import { api, depoYerel, TK } from './api.js?v=2026-11-24-b';
import { $, $$, esc, ikon, markaIkon, bildir, yol, git, href, demoYol, temaUygula, temaSifirla, cekmeceKapatHepsi, ayrilmaKoy, onayla, ONIZLEME } from './ui.js?v=2026-11-24-b';
import { davetliAc, logoHtml, imza, hataSayfasi } from './davetli.js?v=2026-11-24-b';
import { planSvg } from './harita.js?v=2026-11-24-b';

const kok = document.getElementById('uygulama');
const WA = 'https://wa.me/905432250512?text=' + encodeURIComponent('Merhaba, salonumuz için Düğün Planla hakkında bilgi almak istiyorum.');
let aktifPlan = null, sonYol = null;
function robots(acik) { let m = document.querySelector('meta[name=robots]'); if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); } m.content = acik ? 'index, follow' : 'noindex, nofollow'; }
const yukleniyor = () => { kok.innerHTML = '<div class="yukleniyor"><i></i></div>'; };
const marka = (alt = '') => `<a class="marka" href="${href('/dugun')}" data-git="/dugun">${markaIkon(28)}<span>Düğün Planla${alt}</span></a>`;
const altBilgi = (baglar = true) => `<footer class="sayfa-alt"><span>Düğün Planla, bir NFC Dünyası ürünüdür.</span>${baglar ? `<span class="dg-grup"><a href="/">nfcdunyasi.com</a><a href="/oyun/">Okut ve Oyna</a><a href="/panel/" rel="nofollow">Yönetici girişi</a></span>` : ''}</footer>`;

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
  if (P[0] === 'salon' && P[1] && P[2] === 'yonetim') { const { yonetimAc } = await import('./yonetim.js?v=2026-11-24-b'); return yonetimAc(kok, { rol: 'salon', slug: P[1].toLowerCase(), alt: P.slice(3).join('/') }); }
  if (P[0] === 'salon' && P[1]) return salonSayfasi(P[1].toLowerCase());
  if (P[0] === 'yonetim') { const { yonetimAc } = await import('./yonetim.js?v=2026-11-24-b'); return yonetimAc(kok, { rol: 'yonetici', alt: P.slice(1).join('/') }); }
  temaSifirla();
  if (demo) return demoMerkez();
  return acilis({ isletme: P[1] === 'giris' && /[?&](salon|isletme)\b/.test(location.search + location.hash) });
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
    if (e.durum === 404) return hataSayfasi(kok, 'Bu düğün bulunamadı', 'Bağlantı eski ya da hatalı olabilir. nfcdunyasi.com/dugun adresinde salonunuzun verdiği giriş koduyla girin.');
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
  const { planlayiciAc } = await import('./planlayici.js?v=2026-11-24-b');
  document.title = `${C.ciftAdi(r.dugun.bilgi)} · Düğün Planla`;
  aktifPlan = {
    kod, ctl: planlayiciAc(kok, {
      kod, token, rol: r.rol, veri: r, sekme,
      cikis: (sure) => { const rol = r.rol; aktifPlan?.ctl.kapat(); aktifPlan = null; sonYol = null; if (rol === 'cift') { depoYerel.sil(TK.cift(kod)); if (sure) pinEkrani(kod, genel, 'ozet', 'Oturumun süresi doldu, giriş kodunuzla yeniden girin.'); else git(api.demo ? '/dugun/demo' : '/dugun'); } else git(rol === 'salon' ? `/salon/${genel.salon.slug}/yonetim` : '/yonetim/dugunler'); },
    }),
  };
}
function pinEkrani(kod, genel, sekme, mesaj = '') {
  const b = genel.dugun.bilgi, s = genel.salon;
  temaUygula(s?.tema, { tam: false });
  const tel = s?.iletisim?.telefon;
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">${s?.tema?.logo ? logoHtml(s) : ''}
    <div><h1>${esc(C.ciftAdi(b))}</h1><p class="soluk" style="margin-top:6px">Düğün planınıza giriş${b.tarih ? ' · ' + esc(C.tarihYaz(b.tarih)) : ''}</p></div>
    <form id="pinF" autocomplete="off"><label class="alan"><span>Giriş kodu</span>${kodGirdi('pinG')}</label>
      <p class="hata-yazi" id="pinH">${esc(mesaj)}</p><button class="dg ana tam buyuk" type="submit">Giriş yap</button></form>
    <p class="kucuk-yazi">Giriş kodunu düğün salonunuz verir.${tel ? ` Bilmiyorsanız salonu arayın: <a href="tel:${esc(tel.replace(/[^\d+]/g, ''))}">${esc(tel)}</a>` : ''}</p>
    ${api.demo ? '<p class="rozet vurgu">Demo kodu: DEMO-2026</p>' : ''}
    <a class="dg sade kucuk" href="${href('/d/' + kod)}" data-git="/d/${kod}">Davetli sayfasına git</a>${imza()}</div></div>`;
  kodBicimle($('#pinG'));
  $('#pinF').addEventListener('submit', async (e) => {
    e.preventDefault(); const v = $('#pinG').value, btn = $('#pinF button');
    if (C.girisKoduNorm(v).length < 6) { $('#pinH').textContent = 'Giriş kodunu yazın, örneğin KRTM-4825.'; return; }
    btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
    try { const r = await api.giris(kod, v); depoYerel.koy(TK.cift(kod), r.token); const t = await api.tam(kod, '', r.token); planBaslat(kod, r.token, t, sekme, genel); }
    catch (er) { $('#pinH').textContent = er.message; btn.disabled = false; btn.textContent = 'Giriş yap'; $('#pinG').select(); }
  });
  if (!matchMedia('(pointer:coarse)').matches) $('#pinG').focus();
}
/** Giriş kodu alanı: büyük harf, 4+4 biçiminde tire */
const kodGirdi = (id) => `<input class="girdi kod-girdi" id="${id}" name="kod" placeholder="KRTM-4825" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="40" required>`;
function kodBicimle(inp) {
  inp.addEventListener('input', () => {
    const ham = inp.value; if (/[a-z]{3,}-|\/d\//.test(ham)) return; // eski düğün bağlantısı/kodu yapıştırıldıysa dokunma
    const n = C.girisKoduNorm(ham).slice(0, 8), v = n.length > 4 ? n.slice(0, 4) + '-' + n.slice(4) : n;
    if (v !== ham) inp.value = v;
  });
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
    <section class="lcv-kart"><h2>Düğün sahibi misiniz?</h2><p class="soluk">Salonumuzun verdiği giriş koduyla davetli listenizi ve oturma planınızı hazırlayın.</p>
      <form id="kodF" class="yigin" style="gap:10px" autocomplete="off">${kodGirdi('kodG')}<button class="dg ana tam" type="submit">Giriş yap</button><p class="hata-yazi" id="kodH"></p></form></section>
    ${i.adres || iletisim ? `<section class="kart" style="display:grid;gap:12px;text-align:center;justify-items:center">${i.adres ? `<p class="soluk">${esc(i.adres)}</p>` : ''}${iletisim ? `<div class="dg-grup" style="justify-content:center">${iletisim}</div>` : ''}</section>` : ''}
    ${s.giris ? `<p class="alt-imza"><a href="${href('/salon/' + slug + '/yonetim')}" data-git="/salon/${slug}/yonetim">Salon girişi</a></p>` : ''}${imza()}</div></div>`;
  kodBicimle($('#kodG'));
  $('#kodF').addEventListener('submit', (e) => { e.preventDefault(); kodIleGir($('#kodG').value, $('#kodF button'), $('#kodH')); });
}
/** Tek kodla çift girişi; eski düğün bağlantısı yapıştırılırsa o düğünün giriş ekranına gider */
async function kodIleGir(v, btn, H) {
  const n = C.girisKoduNorm(v), eski = kodTemizle(v);
  H.textContent = '';
  if (n.length !== 8) { if (eski && (/[-/]/.test(v) && /[a-z]/.test(v))) return git('/d/' + eski + '/plan'); H.textContent = 'Giriş kodu 8 karakterdir, örneğin KRTM-4825.'; return; }
  const yazi = btn.textContent; btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
  try { const r = await api.kodGiris(n); depoYerel.koy(TK.cift(r.kod), r.token); git('/d/' + r.kod + '/plan'); }
  catch (er) { if (er.durum === 401 && eski && /[a-z]/.test(v)) return git('/d/' + eski + '/plan'); H.textContent = er.message; btn.disabled = false; btn.textContent = yazi; }
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
/** Bu cihazda açık kalan oturumlar (süresi geçmemiş anahtarlar) */
function acikOturumlar() {
  const gecerli = (t) => { try { const p = JSON.parse(atob(String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))); return !p.exp || p.exp > Date.now(); } catch { return false; } };
  const L = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), v = localStorage.getItem(k);
      if (!v || !gecerli(v)) continue;
      if (k.startsWith('dp:c:')) L.push({ tur: 'cift', ad: 'Düğün planınıza devam edin', yol: `/d/${k.slice(5)}/plan` });
      else if (k.startsWith('dp:s:')) L.push({ tur: 'salon', ad: 'İşletme panelinize devam edin', yol: `/salon/${k.slice(5)}/yonetim` });
    }
    const y = localStorage.getItem(TK.yonetici); if (y && gecerli(y)) L.push({ tur: 'yonetici', ad: 'Yönetici paneline devam edin', yol: '/panel/', dis: true });
  } catch { /* gizli sekme */ }
  return L.slice(0, 3);
}
function acilis({ isletme = false } = {}) {
  document.title = 'Düğün Planla · Davetli listesi, oturma planı ve masa bulucu | NFC Dünyası';
  let sek = isletme ? 'isletme' : 'cift'; try { if (!isletme && localStorage.getItem('dp:gsek') === 'isletme') sek = 'isletme'; } catch { /* */ }
  const acik = acikOturumlar();
  kok.innerHTML = `<div class="acilis"><div class="acilis-ust">${marka()}<span class="bosluk"></span><a class="dg sade kucuk" href="${href('/dugun/demo')}" data-git="/dugun/demo">Demo</a></div>
    <div class="sayfa">
    <section class="giris-bas">
      <div class="giris-panel" id="giris">
        <h1>Giriş yapın</h1>
        <div class="segment tam-g" id="gT" role="tablist"><button type="button" data-v="cift">Etkinlik sahibi</button><button type="button" data-v="isletme">İşletme</button></div>
        <p class="soluk" id="gAc"></p>
        <form id="gC" autocomplete="off"><label class="alan"><span>Giriş kodu</span>${kodGirdi('gKod')}</label><button class="dg ana tam buyuk" type="submit">Giriş yap</button><p class="hata-yazi" id="gCH"></p></form>
        <form id="gS" autocomplete="on"><label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="k" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></label><label class="alan"><span>Şifre</span><input class="girdi" name="s" type="password" autocomplete="current-password" required></label><button class="dg ana tam buyuk" type="submit">Giriş yap</button><p class="hata-yazi" id="gSH"></p></form>
        ${acik.length ? `<div class="devam">${acik.map((o) => `<a href="${o.dis ? o.yol : href(o.yol)}"${o.dis ? '' : ` data-git="${o.yol}"`}>${ikon(o.tur === 'cift' ? 'kalp' : o.tur === 'salon' ? 'salon' : 'ayar', 'k')}<span>${o.ad}</span>${ikon('sag', 'kk')}</a>`).join('')}</div>` : ''}
      </div>
      <div class="giris-metin"><p class="ust-yazi">Düğün Planla</p><h2>Oturma planı artık dert değil.</h2>
        <p class="lead">Davetli listesini, katılım yanıtlarını ve salonun gerçek planı üzerindeki masaları tek yerden yönetin. Düğün günü misafirleriniz masalarını telefonlarından bulsun.</p>
        <div class="dg-grup"><a class="dg cizgili" href="${href('/dugun/demo')}" data-git="/dugun/demo">Demoyu deneyin</a><a class="dg sade" href="#nasil" data-act="nasil">Nasıl çalışır? ${ikon('sag', 'kk')}</a></div></div>
    </section>
    ${urunGorseli()}
    <section class="ozellikler">
      <div class="ozellik">${ikon('davetli')}<h3>Davetliler ve katılım</h3><p>Listeyi Excel’den yapıştırın. Davetiye bağlantısıyla gelen “katılacağım” yanıtları listeye kendiliğinden düşer.</p></div>
      <div class="ozellik">${ikon('masa')}<h3>Salonun gerçek planı</h3><p>Masa sayısı, masa başına kişi ve sahneye uzaklık salondaki gibi. Sürükleyip bırakın ya da tek dokunuşla yerleştirin.</p></div>
      <div class="ozellik">${ikon('gorev')}<h3>Kim ne yapacak</h3><p>Hazırlık listesi, düğün günü görevleri ve saat saat akış. Herkese kendi listesini WhatsApp’tan gönderin.</p></div>
      <div class="ozellik">${ikon('ara')}<h3>Masa bulucu</h3><p>Misafir girişteki QR’ı okutur, adını yazar; masası salon planında görünür. Kapıda liste aramak yok.</p></div></section>
    <section class="bolum-b" id="nasil"><h2>Nasıl çalışır?</h2><div class="adimlar">
      <div><span>1</span><b>Salon düğününüzü açar</b><p>Size 8 karakterlik bir giriş kodu verilir. Bu sayfada “Etkinlik sahibi” sekmesine yazıp girersiniz.</p></div>
      <div><span>2</span><b>Davetiyeyi paylaşırsınız</b><p>Bağlantıyı ya da QR’ı gönderin; yanıtlar listenize düşer.</p></div>
      <div><span>3</span><b>Masaları yerleştirirsiniz</b><p>Sürükleyin ya da otomatik yerleştirin. Eşinizle aynı kodla aynı anda çalışabilirsiniz.</p></div>
      <div><span>4</span><b>Misafir masasını bulur</b><p>Düğün günü girişteki QR ya da NFC standıyla.</p></div></div></section>
    <section class="bolum-b"><div class="salon-bant"><p class="ust-yazi">Düğün salonları için</p><h2>Salonunuzun logosu, rengi ve kendi planlarıyla.</h2><p>Her alanınız gerçek ölçüleriyle çizilir. İşletme panelinizden düğün açar, çiftlere giriş kodu verir, düğünlerinizin istatistiklerini görürsünüz. Girişteki kalıcı QR ya da NFC standı her düğünde o günün masa bulucusunu açar.</p>
      <div class="dg-grup"><a class="dg ana buyuk" href="${WA}" target="_blank" rel="noopener">WhatsApp’tan yazın</a><a class="dg sade" href="${href('/dugun/demo')}" data-git="/dugun/demo">Demoyu inceleyin ${ikon('sag', 'kk')}</a></div></div></section>
    ${altBilgi()}</div></div>`;
  const aciklama = { cift: 'Düğün salonunuzun verdiği giriş kodunu yazın.', isletme: 'İşletmenize verilen kullanıcı adı ve şifreyle girin.' };
  const sec = (v, odak) => {
    sek = v; $$('#gT button').forEach((b) => { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-selected', b.dataset.v === v); });
    $('#gC').hidden = v !== 'cift'; $('#gS').hidden = v !== 'isletme'; $('#gAc').textContent = aciklama[v];
    try { localStorage.setItem('dp:gsek', v); } catch { /* */ }
    if (odak && !matchMedia('(pointer:coarse)').matches) (v === 'cift' ? $('#gKod') : $('#gS [name=k]')).focus();
  };
  sec(sek, false);
  $('#gT').onclick = (e) => { const b = e.target.closest('button'); if (b) sec(b.dataset.v, true); };
  kodBicimle($('#gKod'));
  $('#gC').addEventListener('submit', (e) => { e.preventDefault(); kodIleGir($('#gKod').value, $('#gC button'), $('#gCH')); });
  $('#gS').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector('button'), H = $('#gSH');
    const k = String(f.get('k') || '').trim().toLowerCase(), sf = String(f.get('s') || '');
    H.textContent = ''; b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try {
      if (k === 'admin') { const r = await api.adminGiris(k, sf); depoYerel.koy(TK.yonetici, r.token); location.href = '/panel/'; return; }
      const slug = C.slugla(k); if (!C.SLUG_RE.test(slug)) throw new Error('Kullanıcı adı ya da şifre hatalı.');
      let r; try { r = await api.salonGiris(slug, sf); } catch (er) { if (er.durum === 404 || er.durum === 401) throw new Error('Kullanıcı adı ya da şifre hatalı.'); throw er; }
      depoYerel.koy(TK.salon(slug), r.token); git('/salon/' + slug + '/yonetim');
    } catch (er) { H.textContent = er.message; b.disabled = false; b.textContent = 'Giriş yap'; }
  });
  kok.onclick = (e) => { if (e.target.closest('[data-act=nasil]')) { e.preventDefault(); $('#nasil').scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  if (!matchMedia('(pointer:coarse)').matches) (sek === 'cift' ? $('#gKod') : $('#gS [name=k]')).focus({ preventScroll: true });
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
      ${kart('salonPanel', 'salon', 'İşletme', 'İşletme paneli', 'Düğünlerin özeti ve istatistikleri, düğün açma, çifte giriş kodu verme.')}
      ${kart('yonetim', 'ayar', 'Yönetici', 'Yönetici paneli', 'Salonlar, düğün başı ücret ve gelir, salon planı düzenleyici, istatistik.')}</div>
    <div class="dg-grup" style="margin-top:20px"><button class="dg sade kucuk" data-demo="sifirla">${ikon('yenile', 'kk')} Demoyu baştan başlat</button></div>
    ${altBilgi(false)}</div></div>`;
  kok.onclick = async (e) => {
    const a = e.target.closest('[data-demo]'); if (!a) return; e.preventDefault();
    const k = a.dataset.demo;
    try {
      if (k === 'cift') { const r = await api.kodGiris('DEMO-2026'); depoYerel.koy(TK.cift(r.kod), r.token); git('/d/' + r.kod + '/plan'); }
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
