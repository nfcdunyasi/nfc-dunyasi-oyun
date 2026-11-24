// Düğün Planla — misafirin gördüğü sayfa: davetiye, katılım bildirimi (LCV) ve düğün günü masa bulucu
import * as C from './cekirdek.js?v=2026-11-22-c';
import { api, depoYerel } from './api.js?v=2026-11-22-c';
import { $, esc, ikon, temaUygula, href, indir } from './ui.js?v=2026-11-22-c';
import { harita } from './harita.js?v=2026-11-22-c';

let Z = null;
const TUR = Object.fromEntries(C.TURLER);
export function logoHtml(salon) {
  const t = salon?.tema || {};
  if (t.logo) return `<div class="davet-logo${t.logoZemin === 'acik' ? ' plaka' : t.logoZemin === 'koyu' ? ' plaka-koyu' : ''}"><img src="${esc(t.logo)}" alt="${esc(salon.ad)}"></div>`;
  return salon ? `<div class="davet-logo"><span class="yazi-logo">${esc(t.kisaAd || salon.ad)}</span></div>` : '';
}
export const imza = () => `<p class="alt-imza"><b>Düğün Planla</b> · Bir NFC Dünyası ürünüdür.</p>`;
export function hataSayfasi(kok, baslik, metin) {
  kok.innerHTML = `<div class="giris-sayfa"><div class="giris-kart"><span class="giris-ikon bos-i">${ikon('bilgi')}</span><h1>${esc(baslik)}</h1><p class="soluk">${esc(metin)}</p>${imza()}</div></div>`;
}

export async function davetliAc(kok, kod) {
  Z?.harita?.kapat(); clearInterval(Z?.sayac);
  kok.innerHTML = '<div class="yukleniyor"><i></i></div>';
  let r;
  try { r = await api.dugun(kod); } catch (e) {
    if (e.durum === 404) return hataSayfasi(kok, 'Davet bulunamadı', 'Bağlantıyı kontrol edin ya da davet sahibinden yeni bir bağlantı isteyin.');
    if (e.durum === 403) return hataSayfasi(kok, 'Bu sayfa şu anda kapalı', 'Davet sayfasına şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');
    return hataSayfasi(kok, 'Bağlanılamadı', e.message);
  }
  Z = { kod, d: r.dugun, salon: r.salon, kok, liste: null, sonuc: null };
  temaUygula(r.salon?.tema, { tam: true });
  document.title = `${C.ciftAdi(Z.d.bilgi)} · ${TUR[Z.d.bilgi.tur] || 'Davet'}`;
  if (!depoYerel.al('dp:z:' + kod)) { depoYerel.koy('dp:z:' + kod, '1'); api.sayac(kod, 'ziyaret'); }
  ciz();
  if (Z.d.bulucuAcik) bulucuYukle();
  Z.sayac = setInterval(() => { const g = $('#geriSayim'); if (g) g.innerHTML = geriSayimHtml(); }, 30000);
}

function geriSayimHtml() {
  const z = C.dugunZamani(Z.d.bilgi); if (!z) return '';
  const k = z - Date.now(); if (k <= 0) return '';
  const g = Math.floor(k / 864e5), s = Math.floor((k % 864e5) / 36e5), d = Math.floor((k % 36e5) / 6e4);
  return g >= 2 ? `${g} gün kaldı` : g === 1 ? `1 gün ${s} saat kaldı` : s ? `${s} saat ${d} dakika kaldı` : `${d} dakika kaldı`;
}
function davetKart(kucuk = false) {
  const b = Z.d.bilgi, s = Z.salon, adres = s?.iletisim?.adres || '';
  const yer = [s?.ad, Z.d.alanAd].filter(Boolean).join(' · ');
  const harita2 = s?.iletisim?.harita || (adres || s?.ad ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s?.ad, adres].filter(Boolean).join(' '))}` : '');
  const gecti = C.kalanGun(b) < -1;
  return `<section class="davet-kart"${kucuk ? ' style="padding:26px 20px 24px;gap:12px"' : ''}>
    <p class="etiket">${gecti ? 'Bu güzel günü birlikte kutladık' : esc(b.aile || (TUR[b.tur] === 'Düğün' ? 'Düğünümüze davetlisiniz' : (TUR[b.tur] || 'Davet') + ' davetimize buyurun'))}</p>
    <h1 class="isimler"${kucuk ? ' style="font-size:clamp(34px,10vw,46px)"' : ''}>${esc(b.gelin || 'Gelin')}<span>&amp;</span>${esc(b.damat || 'Damat')}</h1>
    <div class="tarih">${esc(C.tarihYaz(b.tarih, { gun: false }))}<small>${esc(C.GUNLER[new Date(b.tarih + 'T12:00:00Z').getUTCDay()] || '')}${b.saat ? ' · ' + esc(C.saatYaz(b.saat)) : ''}</small></div>
    ${yer ? `<div class="yer"><b>${esc(yer)}</b>${esc(adres)}</div>` : ''}
    ${!kucuk && Z.d.ayar.mesaj ? `<p class="mesaj">${esc(Z.d.ayar.mesaj)}</p>` : ''}
    ${!kucuk && !gecti ? `<p class="geri-sayim" id="geriSayim">${geriSayimHtml()}</p>` : ''}
    <div class="dg-grup">${harita2 ? `<a class="dg cizgili kucuk" href="${esc(harita2)}" target="_blank" rel="noopener">${ikon('konum', 'kk')} Yol tarifi</a>` : ''}${!gecti && b.tarih ? `<button class="dg cizgili kucuk" type="button" data-act="takvim">${ikon('takvim', 'kk')} Takvime ekle</button>` : ''}${s?.iletisim?.telefon ? `<a class="dg sade kucuk" href="tel:${esc(s.iletisim.telefon.replace(/[^\d+]/g, ''))}">${ikon('telefon', 'kk')} Salonu ara</a>` : ''}</div></section>`;
}
function ciz() {
  const d = Z.d, kayit = lcvKayit();
  const gunu = d.bulucuAcik && C.kalanGun(d.bilgi) <= 0;
  const lcv = d.lcvAcik && !gunu ? lcvKart(kayit) : C.kalanGun(d.bilgi) >= 0 && !d.bulucuAcik ? `<section class="lcv-kart"><h2>Katılım bildirimi kapandı</h2><p class="soluk">${kayit ? `Yanıtınız: ${kayit.durum === 'gelmiyor' ? 'katılamayacaksınız' : kayit.kisi + ' kişi katılıyorsunuz'}. Değişiklik için davet sahipleriyle görüşün.` : 'Katılım durumunuzu davet sahiplerine doğrudan iletebilirsiniz.'}</p></section>` : '';
  Z.kok.innerHTML = `<div class="davet"><div class="davet-ic">${logoHtml(Z.salon)}
    ${d.bulucuAcik ? `<section class="bul-kart" id="bul"><p class="etiket">Hoş geldiniz</p><h2>Masanızı bulun</h2><label class="arama">${ikon('ara', 'k')}<input class="girdi" id="bulAra" type="search" placeholder="Adınızı ve soyadınızı yazın" autocomplete="off" autocapitalize="words" enterkeyhint="search"></label><div class="bul-sonuclar" id="bulSonuc"><p class="kucuk-yazi" style="text-align:center">Davetiyede yazan adla arayın, örneğin “Ayşe Yılmaz”.</p></div><div id="bulMasa"></div></section>` : ''}
    ${davetKart(d.bulucuAcik)}
    ${lcv}
    <p class="alt-imza"><a href="${href('/d/' + Z.kod + '/plan')}" data-git="/d/${Z.kod}/plan">Düğün sahibi misiniz? Planlamaya giriş</a></p>${imza()}</div></div>`;
  Z.kok.onclick = tik;
  const a = $('#bulAra'); if (a) { a.addEventListener('input', () => ara(a.value)); const son = depoYerel.al('dp:bm:' + Z.kod); if (son && Z.liste) { a.value = son; ara(son, true); } }
  lcvBagla();
}
function lcvKayit() { try { return JSON.parse(depoYerel.al('dp:l:' + Z.kod) || 'null'); } catch { return null; } }
function lcvKart(k, duzenle = false) {
  const d = Z.d;
  if (k && !duzenle) return `<section class="lcv-kart" id="lcv"><div class="lcv-yanit"><span class="tik-i">${ikon('tik')}</span><h2>${k.durum === 'gelmiyor' ? 'Yanıtınız iletildi' : 'Sizi bekliyoruz'}</h2><b>${esc(k.ad)}</b><p class="soluk">${k.durum === 'gelmiyor' ? 'Katılamayacağınızı bildirdiniz. İlginiz için teşekkür ederiz.' : `${k.kisi} kişi olarak katılacağınızı bildirdiniz. Teşekkür ederiz!`}</p></div><button class="dg cizgili" type="button" data-act="lcv-degis" style="justify-self:center">Yanıtımı değiştir</button></section>`;
  const v = k || { durum: '', ad: '', kisi: 1, not: '', tel: '' };
  return `<section class="lcv-kart" id="lcv"><h2>Katılabilecek misiniz?</h2>${d.ayar.lcvSon ? `<p class="kucuk-yazi" style="margin-top:-8px">Lütfen ${esc(C.tarihYaz(d.ayar.lcvSon, { yil: false }))} tarihine kadar yanıtlayın.</p>` : ''}
    <form id="lcvF" class="yigin" autocomplete="on" novalidate>
      <div class="lcv-sec"><button type="button" data-d="geliyor" class="${v.durum === 'geliyor' ? 'on' : ''}">Katılacağım</button><button type="button" data-d="gelmiyor" class="${v.durum === 'gelmiyor' ? 'on' : ''}">Katılamayacağım</button></div>
      <div id="lcvAlan" class="yigin"${v.durum ? '' : ' hidden'}>
        <label class="alan"><span>Adınız soyadınız</span><input class="girdi" name="ad" value="${esc(v.ad)}" maxlength="80" autocomplete="name" autocapitalize="words" placeholder="Davetiyede yazan adınız" required></label>
        <div class="alan" id="lcvKisi"${v.durum === 'gelmiyor' ? ' hidden' : ''}><span>Kaç kişi katılacaksınız?</span><div class="sayac" data-min="1" data-max="20"><button type="button" data-k="-1" aria-label="Azalt">−</button><output>${v.kisi || 1}</output><button type="button" data-k="1" aria-label="Artır">+</button></div></div>
        ${d.ayar.telSor ? `<label class="alan"><span>Telefon</span><input class="girdi" name="tel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(v.tel || '')}" placeholder="05xx xxx xx xx"></label>` : ''}
        <label class="alan"><span>Bir notunuz var mı? <span class="ipucu">(isteğe bağlı)</span></span><textarea class="girdi" name="not" rows="2" maxlength="400" placeholder="Tebrik mesajınız ya da bir isteğiniz">${esc(v.not || '')}</textarea></label>
        <input type="text" name="web" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px" aria-hidden="true">
        <p class="hata-yazi" id="lcvHata"></p>
        <button class="dg ana tam buyuk" type="submit">Yanıtı gönder</button></div></form></section>`;
}
function lcvBagla() {
  const f = $('#lcvF'); if (!f) return;
  let durum = f.querySelector('.lcv-sec .on')?.dataset.d || '';
  f.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (b) { durum = b.dataset.d; f.querySelectorAll('.lcv-sec button').forEach((x) => x.classList.toggle('on', x === b)); $('#lcvAlan').hidden = false; $('#lcvKisi').hidden = durum === 'gelmiyor'; const ad = f.querySelector('[name=ad]'); if (!ad.value) setTimeout(() => ad.focus(), 30); return; }
    const k = e.target.closest('[data-k]');
    if (k) { const o = k.parentElement.querySelector('output'); o.textContent = Math.min(20, Math.max(1, +o.textContent + +k.dataset.k)); }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f), ad = String(fd.get('ad') || '').trim(), h = $('#lcvHata');
    if (!durum) { h.textContent = 'Katılıp katılmayacağınızı seçin.'; return; }
    if (C.trNorm(ad).replace(/ /g, '').length < 3) { h.textContent = 'Lütfen adınızı ve soyadınızı yazın.'; f.querySelector('[name=ad]').focus(); return; }
    const eski = lcvKayit(), kisi = +f.querySelector('#lcvKisi output').textContent || 1;
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Gönderiliyor…'; h.textContent = '';
    try {
      const r = await api.lcv(Z.kod, { ad, kisi, durum, not: String(fd.get('not') || ''), tel: String(fd.get('tel') || ''), web: String(fd.get('web') || ''), ...(eski?.id ? { id: eski.id, anahtar: eski.anahtar } : {}) });
      depoYerel.koy('dp:l:' + Z.kod, JSON.stringify({ id: r.id || eski?.id, anahtar: r.anahtar || eski?.anahtar, ad, kisi, durum, not: String(fd.get('not') || ''), tel: String(fd.get('tel') || ''), t: Date.now() }));
      $('#lcv').outerHTML = lcvKart(lcvKayit());
      $('#lcv').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (er) { h.textContent = er.message; btn.disabled = false; btn.textContent = 'Yanıtı gönder'; }
  });
}
function tik(e) {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'lcv-degis') { $('#lcv').outerHTML = lcvKart(lcvKayit(), true); lcvBagla(); }
  else if (a.dataset.act === 'takvim') takvim();
  else if (a.dataset.act === 'bul-sec') masaGoster(+a.dataset.i);
  else if (a.dataset.act === 'bul-temizle') { depoYerel.sil('dp:bm:' + Z.kod); $('#bulMasa').innerHTML = ''; const i = $('#bulAra'); i.value = ''; i.focus(); ara(''); }
}
function takvim() {
  const b = Z.d.bilgi, z = C.dugunZamani(b), s = Z.salon;
  let son = b.bitis ? Date.parse(b.tarih + 'T' + b.bitis + ':00+03:00') : z + 5 * 3600e3; if (son <= z) son += 864e5;
  const u = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const k = (x) => String(x || '').replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NFC Dunyasi//Dugun Planla//TR', 'BEGIN:VEVENT', `UID:${Z.kod}@nfcdunyasi.com`, `DTSTAMP:${u(Date.now())}`, `DTSTART:${u(z)}`, `DTEND:${u(son)}`, `SUMMARY:${k(C.ciftAdi(b) + ' · ' + (TUR[b.tur] || 'Davet'))}`, `LOCATION:${k([s?.ad, Z.d.alanAd, s?.iletisim?.adres].filter(Boolean).join(', '))}`, `URL:https://nfcdunyasi.com/d/${Z.kod}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  indir(`${Z.kod}.ics`, ics, 'text/calendar;charset=utf-8');
}
async function bulucuYukle() {
  try { const r = await api.bulucu(Z.kod); Z.liste = r.liste; Z.plan = r.plan; } catch (e) { const s = $('#bulSonuc'); if (s) s.innerHTML = `<p class="hata-yazi">${e.durum === 403 ? 'Masa bulucu şu an kapalı.' : 'Liste yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.'}</p>`; return; }
  const a = $('#bulAra'), son = depoYerel.al('dp:bm:' + Z.kod);
  if (a && son && !a.value) { a.value = son; ara(son, true); } else if (a?.value) ara(a.value);
}
function ara(q, otomatik = false) {
  const el = $('#bulSonuc'); if (!el) return;
  if (!Z.liste) { el.innerHTML = '<p class="kucuk-yazi" style="text-align:center">Liste yükleniyor…</p>'; return; }
  const n = C.trNorm(q);
  if (n.replace(/ /g, '').length < 2) { el.innerHTML = '<p class="kucuk-yazi" style="text-align:center">Davetiyede yazan adla arayın, örneğin “Ayşe Yılmaz”.</p>'; $('#bulMasa').innerHTML = ''; return; }
  const L = Z.liste.map((x, i) => [x, i]).filter(([x]) => C.araEslesir(x[0], q)).slice(0, 8);
  const M = new Map(Z.plan.masalar.map((m) => [m.id, m]));
  el.innerHTML = L.length ? L.map(([x, i]) => { const m = x[1] && M.get(x[1]); return `<button class="bul-sonuc" type="button" data-act="bul-sec" data-i="${i}"><b>${esc(x[0])}</b><span>${m ? (m.ozel === 'gelin-damat' ? 'Gelin & Damat' : 'Masa ' + m.no) : '—'}</span></button>`; }).join('') : '<p class="soluk" style="text-align:center">Bu adla bir davetli bulamadık. Soyadınızla ya da davetiyedeki adla deneyin; bulamazsanız karşılama görevlisine sorun.</p>';
  if (L.length === 1 && (otomatik || C.trNorm(L[0][0][0]) === n || (n.split(' ').length >= 2 && n.replace(/ /g, '').length >= 5))) masaGoster(L[0][1], true);
  else if (!otomatik) $('#bulMasa').innerHTML = '';
}
function masaGoster(i, otomatik = false) {
  const x = Z.liste[i]; if (!x) return;
  const m = x[1] && Z.plan.masalar.find((z) => z.id === x[1]);
  depoYerel.koy('dp:bm:' + Z.kod, x[0]);
  if (!depoYerel.al('dp:b:' + Z.kod)) { depoYerel.koy('dp:b:' + Z.kod, '1'); api.sayac(Z.kod, 'bul'); }
  $('#bulSonuc').innerHTML = '';
  const el = $('#bulMasa');
  if (!m) { el.innerHTML = `<div class="masa-sonuc"><p class="kimin">${esc(x[0])}</p><p class="soluk" style="margin-top:6px">Masanız henüz belirlenmedi. Lütfen girişteki karşılama görevlisine adınızı söyleyin.</p><button class="dg sade kucuk" type="button" data-act="bul-temizle" style="margin-top:8px">Başka bir isim ara</button></div>`; return; }
  const komsu = Z.d.ayar.komsu ? Z.liste.filter((y, j) => j !== i && y[1] === m.id).map((y) => y[0]) : [];
  const gd = m.ozel === 'gelin-damat';
  el.innerHTML = `<div class="masa-sonuc"><p class="kimin">${esc(x[0])}</p><p class="masa-y">${gd ? 'Masanız' : 'Masa numaranız'}</p><div class="buyuk${gd ? ' kelime' : ''}">${gd ? 'Gelin &amp; Damat' : m.no}</div>${m.ad && !gd ? `<p class="masa-ad">${esc(m.ad)}</p>` : ''}<p class="yer">${esc(C.masaYeri(Z.plan, m))}</p></div>
    <div id="bulHarita" class="bul-harita" style="aspect-ratio:${(Z.plan.en + 1.6).toFixed(1)} / ${(Z.plan.boy + 1.6).toFixed(1)};max-height:64vh;margin-top:4px"></div>
    ${komsu.length ? `<div><p class="grup-baslik">Sizinle aynı masada</p><p class="soluk" style="font-size:15px">${komsu.slice(0, 14).map(esc).join(' · ')}${komsu.length > 14 ? ` ve ${komsu.length - 14} davetiye daha` : ''}</p></div>` : ''}
    <div style="text-align:center"><button class="dg sade kucuk" type="button" data-act="bul-temizle">Başka bir isim ara</button></div>`;
  Z.harita?.kapat();
  const giris = Z.plan.ogeler.find((o) => o.tur === 'giris');
  Z.harita = harita($('#bulHarita'), { plan: Z.plan, mod: 'goster', izgara: false, olcu: false, isimler: false, kenarPay: 0.8, vurgu: () => m.id, bilgi: (t) => ({ sinif: t.id === m.id ? '' : 'soluk', alt: '', sandalye: t.kap, dolu: [] }) });
  setTimeout(() => { Z.harita?.sigdir(false); if (giris) { const g = Z.harita.svg.querySelector(`[data-oge="${giris.id}"] text`); if (g) g.textContent = 'GİRİŞ · BURADASINIZ'; } }, 60);
  if (!otomatik) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
