// Randevu Vaktim — işletme düzenleyicileri: hizmetler ve fiyatlar, ürünler, bilgiler, görünüm.
// İşletme yöneticisi kendi panelinden, NFC Dünyası yöneticisi yönetim panelinden aynı ekranları kullanır.
// Her düzenleyici taslağı (E) yerinde değiştirir ve her değişiklikte degisti() çağırır; kaydetmek çağıranın işidir.
import * as C from './cekirdek.js?v=2026-11-22-c';
import { esc, TL, ikon, cekmece, onayla, bildir, gorselSec, logo, kapakStil, avatar } from './rui.js?v=2026-11-22-c';
import { fotolarSec } from './kirp.js?v=2026-11-22-c';

const alan = (ad, ic, ek = '') => `<label class="alan"><span>${ad}</span>${ic}${ek}</label>`;
const fiyatGirdi = (v, ek = '') => `<span class="rv-tl-girdi"><input class="girdi" type="number" inputmode="numeric" min="0" step="1" value="${+v || ''}" placeholder="0" ${ek}><i>₺</i></span>`;
const sureSec = (v) => `<select class="girdi" name="sure">${[...new Set([...C.SURELER, v])].sort((a, b) => a - b).map((d) => `<option value="${d}" ${d === v ? 'selected' : ''}>${C.sureYaz(d)}</option>`).join('')}</select>`;
const fiyatYaz = (n) => (n ? TL(n) : 'Ücretsiz');
const tamSayi = (v) => Math.max(0, Math.min(1e6, Math.round(+v || 0)));
const kartBas = (baslik, aciklama = '', sag = '') => `<div class="dz-bas"><div><h2>${baslik}</h2>${aciklama ? `<p>${aciklama}</p>` : ''}</div>${sag ? `<div class="dz-bas-d">${sag}</div>` : ''}</div>`;

// ---------------------------------------------------------------- kategori yardımcıları
/** Kategorilere göre gruplar, ilk görülme sırasıyla (müşteri sayfasıyla aynı) → [[kategori, [sıra, ...]], ...] */
function grupla(L) {
  const g = new Map();
  L.forEach((x, i) => { const k = x.kategori || ''; if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  return [...g];
}
/** i. öğeyi aynı kategorideki bir öncekiyle yer değiştirir */
function yukariTasi(L, i) {
  const k = L[i].kategori || '';
  for (let j = i - 1; j >= 0; j--) if ((L[j].kategori || '') === k) { [L[j], L[i]] = [L[i], L[j]]; return true; }
  return false;
}
/** Kategoriyi bir öncekinin önüne alır */
function kategoriTasi(L, k) {
  const G = grupla(L), n = G.findIndex(([x]) => x === k);
  if (n < 1) return false;
  [G[n - 1], G[n]] = [G[n], G[n - 1]];
  L.splice(0, L.length, ...G.flatMap(([, I]) => I.map((i) => L[i])));
  return true;
}
function kategoriAdi(L, eski, bitti) {
  const c = cekmece({
    baslik: 'Kategori adı',
    govde: `<form id="dzK" class="rv-form-dar">${alan('Yeni ad', `<input class="girdi" name="ad" value="${esc(eski)}" maxlength="30" required autocomplete="off">`)}<p class="kucuk-yazi">“${esc(eski)}” altındaki her şey yeni adla görünür.</p></form>`,
    alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="dzK">Kaydet</button>',
  });
  const f = c.el.querySelector('#dzK');
  f.addEventListener('submit', (e) => { e.preventDefault(); const ad = C.str(f.ad.value, 30); if (!ad) return; for (const x of L) if ((x.kategori || '') === eski) x.kategori = ad; c.kapat(); bitti(); });
}
const grupBas = (k, n, gi) => `<div class="dz-grup-bas"><h3>${esc(k || 'Diğer')}</h3><small>${n}</small><span class="bosluk"></span>
  ${k ? `<button class="dg ikon-d kucuk" type="button" data-kad="${esc(k)}" aria-label="Kategori adını değiştir" title="Adını değiştir">${ikon('kalem', 'kk')}</button>` : ''}
  <button class="dg ikon-d kucuk" type="button" data-kyuk="${esc(k)}" aria-label="Kategoriyi yukarı taşı" title="Kategoriyi yukarı taşı" ${gi ? '' : 'disabled'}>${ikon('yukari', 'kk')}</button></div>`;
const oneriler = (L, ek = []) => [...new Set([...L.map((x) => x.kategori).filter(Boolean), ...ek])].slice(0, 14);
const oneriCipler = (K) => (K.length ? `<span class="dz-oner">${K.map((k) => `<button type="button" class="cip" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</span>` : '');
/** Satır listesi: ad + ayrıntı (dokununca çekmece), satırda hızlı fiyat, yukarı taşı */
function liste(kap, L, { satir, ciz, degisti, duzenle }) {
  const G = grupla(L), baslikli = G.length > 1 || !!L[0]?.kategori;
  const html = G.map(([k, I], gi) => `<div class="dz-grup">${baslikli ? grupBas(k, I.length, gi) : ''}<div class="dz-liste">${I.map((i, n) => `<div class="dz-sat${L[i].aktif === false ? ' pasif' : ''}" data-i="${i}">
      <button class="dz-sat-ana" type="button" data-duz="${i}">${satir(L[i])}</button>
      ${fiyatGirdi(L[i].fiyat, `data-fiyat="${i}" aria-label="${esc(L[i].ad)} fiyatı"`)}
      <button class="dg ikon-d kucuk dz-yuk" type="button" data-yuk="${i}" aria-label="Yukarı taşı" title="Yukarı taşı" ${n ? '' : 'disabled'}>${ikon('yukari', 'kk')}</button></div>`).join('')}</div></div>`).join('');
  const bagla = () => {
    kap.querySelectorAll('[data-fiyat]').forEach((g) => (g.oninput = () => { L[+g.dataset.fiyat].fiyat = tamSayi(g.value); degisti(); }));
    kap.querySelectorAll('[data-duz]').forEach((b) => (b.onclick = () => duzenle(+b.dataset.duz)));
    kap.querySelectorAll('[data-yuk]').forEach((b) => (b.onclick = () => { if (yukariTasi(L, +b.dataset.yuk)) { degisti(); ciz(); } }));
    kap.querySelectorAll('[data-kyuk]').forEach((b) => (b.onclick = () => { if (kategoriTasi(L, b.dataset.kyuk)) { degisti(); ciz(); } }));
    kap.querySelectorAll('[data-kad]').forEach((b) => (b.onclick = () => kategoriAdi(L, b.dataset.kad, () => { degisti(); ciz(); })));
  };
  return { html, bagla };
}

// ---------------------------------------------------------------- hizmetler
export function hizmetDuzenle(kap, E, degisti) {
  const H = (E.hizmetler ||= []);
  const ciz = () => {
    const L = liste(kap, H, {
      ciz, degisti, duzenle: cekmeceAc,
      satir: (h) => `<span class="dz-sat-yazi"><b>${esc(h.ad || 'Adsız hizmet')}</b><small>${esc(C.sureYaz(h.sure))}${h.aktif === false ? ' · <em>Gizli</em>' : ''}${h.aciklama ? ` · ${esc(h.aciklama)}` : ''}</small></span>`,
    });
    kap.innerHTML = `<section class="kart dz">${kartBas('Hizmetler ve fiyatlar', 'Fiyatı satırdan değiştirin; süre, kategori ve açıklama için hizmete dokunun. Müşteri birden fazla hizmet seçebilir, süreler ve fiyatlar toplanır.',
      `<button class="dg cizgili kucuk" type="button" data-sablon>${ikon('sihir', 'kk')}Hazır listeden</button><button class="dg ana kucuk" type="button" data-ekle>${ikon('arti', 'kk')}Hizmet ekle</button>`)}
      ${H.length ? L.html : `<div class="dz-bos">${ikon('makas')}<b>Henüz hizmet yok</b><p>Hazır listeden seçerek hızlıca başlayın ya da kendi hizmetinizi ekleyin.</p></div>`}</section>`;
    L.bagla();
    kap.querySelector('[data-ekle]').onclick = () => cekmeceAc(-1);
    kap.querySelector('[data-sablon]').onclick = sablon;
  };
  function cekmeceAc(i) {
    const yeni = i < 0, h = yeni ? { id: '', ad: '', sure: 30, fiyat: 0, aciklama: '', kategori: H[H.length - 1]?.kategori || '', aktif: true } : H[i];
    const c = cekmece({
      baslik: yeni ? 'Yeni hizmet' : 'Hizmeti düzenle',
      govde: `<form id="dzH" class="rv-form-dar" novalidate>
        ${alan('Hizmet adı', `<input class="girdi" name="ad" value="${esc(h.ad)}" maxlength="60" placeholder="Ör. Saç kesimi" autocomplete="off">`)}
        <div class="izgara2">${alan('Süre', sureSec(h.sure))}${alan('Fiyat', fiyatGirdi(h.fiyat, 'name="fiyat"'))}</div>
        ${alan('Kategori', `<input class="girdi" name="kategori" value="${esc(h.kategori || '')}" maxlength="30" placeholder="Ör. Saç" autocomplete="off">`, oneriCipler(oneriler(H, C.KATEGORI_ONER[E.tur])))}
        ${alan('Açıklama (isteğe bağlı)', `<textarea class="girdi" name="aciklama" rows="2" maxlength="160" placeholder="Ör. Yıkama ve fön dahil">${esc(h.aciklama || '')}</textarea>`)}
        <label class="rv-satir-sec"><input type="checkbox" name="aktif" ${h.aktif !== false ? 'checked' : ''}><span>Müşteri sayfasında göster</span></label></form>`,
      alt: `${yeni ? '' : `<button class="dg sade tehlike-yazi" type="button" data-sil>${ikon('cop', 'kk')}Sil</button><span class="bosluk"></span>`}<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="dzH">${yeni ? 'Ekle' : 'Tamam'}</button>`,
    });
    const f = c.el.querySelector('#dzH');
    if (yeni) setTimeout(() => f.ad.focus(), 60);
    c.el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { f.kategori.value = b.dataset.k; }));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const ad = C.str(f.ad.value, 60);
      if (!ad) { bildir('Hizmetin adını yazın.', { hata: true }); f.ad.focus(); return; }
      Object.assign(h, { ad, sure: +f.sure.value, fiyat: tamSayi(f.fiyat.value), kategori: C.str(f.kategori.value, 30), aciklama: C.str(f.aciklama.value, 160), aktif: f.aktif.checked });
      if (yeni) H.push(h);
      degisti(); c.kapat(); ciz();
    });
    c.el.querySelector('[data-sil]')?.addEventListener('click', async () => {
      c.kapat();
      if (!(await onayla({ baslik: `“${h.ad}” silinsin mi?`, metin: 'Alınmış randevular etkilenmez. Kaydettiğinizde müşteri sayfasından kalkar.', evet: 'Sil', tehlike: true }))) return;
      H.splice(H.indexOf(h), 1); degisti(); ciz();
    });
  }
  function sablon() {
    const var_ = new Set(H.map((h) => C.katla(h.ad)));
    const L = (C.HIZMET_SABLON[E.tur] || C.HIZMET_SABLON.diger).filter(([ad]) => !var_.has(C.katla(ad)));
    if (!L.length) return bildir('Hazır listedeki hizmetlerin hepsi zaten ekli.');
    const hepsi = !H.length;
    const c = cekmece({
      baslik: 'Hazır listeden ekle',
      govde: `<p class="kucuk-yazi" style="margin:0 0 12px">${esc(C.turAd(E.tur))} için sık kullanılan hizmetler. Ekledikten sonra fiyatları kendinize göre değiştirebilirsiniz.</p>
        <form id="dzS" class="dz-sablon">${L.map(([ad, sure, fiyat, kat], n) => `<label class="dz-sablon-sat"><input type="checkbox" name="s" value="${n}" ${hepsi ? 'checked' : ''}><span><b>${esc(ad)}</b><small>${esc([kat, C.sureYaz(sure)].filter(Boolean).join(' · '))}</small></span><em>${fiyatYaz(fiyat)}</em></label>`).join('')}</form>`,
      alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="dzS">Seçilenleri ekle</button>',
    });
    c.el.querySelector('#dzS').addEventListener('submit', (e) => {
      e.preventDefault();
      const S = [...e.target.querySelectorAll('input:checked')].map((x) => L[+x.value]);
      if (!S.length) { bildir('En az bir hizmet seçin.', { hata: true }); return; }
      for (const [ad, sure, fiyat, kategori] of S) H.push({ id: '', ad, sure, fiyat, kategori: kategori || '', aciklama: '', aktif: true });
      degisti(); c.kapat(); ciz(); bildir(`${S.length} hizmet eklendi`);
    });
  }
  ciz();
}

// ---------------------------------------------------------------- ürünler
export function urunDuzenle(kap, E, degisti) {
  const U = (E.urunler ||= []);
  const ciz = () => {
    const L = liste(kap, U, {
      ciz, degisti, duzenle: cekmeceAc,
      satir: (u) => `<span class="dz-foto">${u.foto ? `<img src="${esc(u.foto)}" alt="">` : ikon('urun')}</span><span class="dz-sat-yazi"><b>${esc(u.ad || 'Adsız ürün')}</b><small>${[u.tukendi ? '<em class="uyari-yazi">Tükendi</em>' : '', u.aktif === false ? '<em>Gizli</em>' : '', u.aciklama ? esc(u.aciklama) : ''].filter(Boolean).join(' · ') || 'Açıklama yok'}</small></span>`,
    });
    kap.innerHTML = `<section class="kart dz">${kartBas('Ürünler', 'Sattığınız ürünler (wax, şampuan, bakım yağı…) sayfanızda fotoğrafı ve fiyatıyla görünür. Ürünler işletmede satılır, randevuya eklenmez.',
      `<button class="dg ana kucuk" type="button" data-ekle>${ikon('arti', 'kk')}Ürün ekle</button>`)}
      ${U.length ? L.html : `<div class="dz-bos">${ikon('urun')}<b>Henüz ürün yok</b><p>İlk ürünü eklediğinizde sayfanızda “Ürünler” bölümü açılır.</p></div>`}</section>`;
    L.bagla();
    kap.querySelector('[data-ekle]').onclick = () => cekmeceAc(-1);
  };
  function cekmeceAc(i) {
    const yeni = i < 0, u = yeni ? { id: '', ad: '', fiyat: 0, aciklama: '', kategori: U[U.length - 1]?.kategori || '', tukendi: false, aktif: true, foto: '' } : U[i];
    let foto = u.foto || '';
    const c = cekmece({
      baslik: yeni ? 'Yeni ürün' : 'Ürünü düzenle',
      govde: `<form id="dzU" class="rv-form-dar" novalidate>
        <div class="dz-foto-sec"><span class="dz-foto buyuk" id="dzF"></span><div class="dg-grup"><button class="dg cizgili kucuk" type="button" data-foto>${ikon('yukle', 'kk')}Fotoğraf seç</button><button class="dg sade kucuk" type="button" data-fotosil>Kaldır</button></div></div>
        ${alan('Ürün adı', `<input class="girdi" name="ad" value="${esc(u.ad)}" maxlength="60" placeholder="Ör. Mat wax 100 ml" autocomplete="off">`)}
        <div class="izgara2">${alan('Fiyat', fiyatGirdi(u.fiyat, 'name="fiyat"'))}${alan('Kategori', `<input class="girdi" name="kategori" value="${esc(u.kategori || '')}" maxlength="30" placeholder="Ör. Şekillendirici" autocomplete="off">`)}</div>
        ${oneriCipler(oneriler(U))}
        ${alan('Açıklama (isteğe bağlı)', `<textarea class="girdi" name="aciklama" rows="2" maxlength="160" placeholder="Ör. Güçlü tutuş, parlaklık vermez">${esc(u.aciklama || '')}</textarea>`)}
        <label class="rv-satir-sec"><input type="checkbox" name="aktif" ${u.aktif !== false ? 'checked' : ''}><span>Müşteri sayfasında göster</span></label>
        <label class="rv-satir-sec"><input type="checkbox" name="tukendi" ${u.tukendi ? 'checked' : ''}><span>Tükendi olarak işaretle</span></label></form>`,
      alt: `${yeni ? '' : `<button class="dg sade tehlike-yazi" type="button" data-sil>${ikon('cop', 'kk')}Sil</button><span class="bosluk"></span>`}<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="dzU">${yeni ? 'Ekle' : 'Tamam'}</button>`,
    });
    const f = c.el.querySelector('#dzU');
    const fotoCiz = () => { c.el.querySelector('#dzF').innerHTML = foto ? `<img src="${esc(foto)}" alt="">` : ikon('urun'); c.el.querySelector('[data-fotosil]').hidden = !foto; };
    fotoCiz();
    c.el.querySelector('[data-foto]').onclick = async () => { const d = await gorselSec({ oran: 1, max: 900, kalite: 0.84, baslik: 'Ürün fotoğrafı', ipucu: 'Ürün kare çerçevede görünür. Sürükleyip yakınlaştırarak ortalayın.' }); if (d) { foto = d; fotoCiz(); } };
    c.el.querySelector('[data-fotosil]').onclick = () => { foto = ''; fotoCiz(); };
    c.el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { f.kategori.value = b.dataset.k; }));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const ad = C.str(f.ad.value, 60);
      if (!ad) { bildir('Ürünün adını yazın.', { hata: true }); f.ad.focus(); return; }
      Object.assign(u, { ad, fiyat: tamSayi(f.fiyat.value), kategori: C.str(f.kategori.value, 30), aciklama: C.str(f.aciklama.value, 160), aktif: f.aktif.checked, tukendi: f.tukendi.checked, foto });
      if (yeni) U.push(u);
      degisti(); c.kapat(); ciz();
    });
    c.el.querySelector('[data-sil]')?.addEventListener('click', async () => {
      c.kapat();
      if (!(await onayla({ baslik: `“${u.ad}” silinsin mi?`, metin: 'Ürün ve fotoğrafı kaydettiğinizde sayfanızdan kalkar.', evet: 'Sil', tehlike: true }))) return;
      U.splice(U.indexOf(u), 1); degisti(); ciz();
    });
  }
  ciz();
}

// ---------------------------------------------------------------- bilgiler
const sehirSecenek = (v) => [...(v && !C.SEHIRLER.includes(v) ? [v] : []), ...C.SEHIRLER].map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
/** ad: işletme adı da düzenlensin mi (yönetimde ad "Genel" kartındadır) */
export function bilgiDuzenle(kap, E, degisti, { ad = true } = {}) {
  const i = (E.iletisim ||= {});
  kap.innerHTML = `<section class="kart dz">${kartBas('İşletme', 'Müşteri sayfanızın üstünde ve işletme listesinde görünür.')}<div class="rv-form-dar">
      ${ad ? alan('İşletme adı', `<input class="girdi" data-b="ad" value="${esc(E.ad)}" maxlength="80">`) : ''}
      ${alan('Kısa açıklama', `<textarea class="girdi" data-b="aciklama" rows="3" maxlength="400" placeholder="Ör. Erkek kuaförü. Saç kesimi, sakal tıraşı ve cilt bakımı.">${esc(E.aciklama || '')}</textarea>`, '<small class="dz-sayac" data-sayac></small>')}</div></section>
    <section class="kart dz">${kartBas('İletişim')}<div class="rv-form-dar">
      <div class="izgara2">${alan('Telefon', `<input class="girdi" data-b="iletisim.telefon" type="tel" inputmode="tel" value="${esc(C.telYaz(i.telefon) || i.telefon || '')}" placeholder="0532 000 00 00">`)}${alan('Instagram', `<input class="girdi" data-b="iletisim.instagram" value="${esc(i.instagram || '')}" placeholder="kullaniciadi" autocapitalize="none" spellcheck="false">`)}</div>
      <label class="rv-satir-sec"><input type="checkbox" data-b="iletisim.whatsapp" ${i.whatsapp !== false ? 'checked' : ''}><span>Cep numarasında WhatsApp düğmesi göster</span></label></div></section>
    <section class="kart dz">${kartBas('Adres', 'Şehir ve ilçe, müşterilerin sizi aramada ve şehir süzgecinde bulmasını sağlar.')}<div class="rv-form-dar">
      ${alan('Açık adres', `<input class="girdi" data-b="iletisim.adres" value="${esc(i.adres || '')}" maxlength="200" placeholder="Mahalle, cadde, numara">`)}
      <div class="izgara2">${alan('İlçe', `<input class="girdi" data-b="iletisim.ilce" value="${esc(i.ilce || '')}" maxlength="40" placeholder="Ör. Kadıköy">`)}${alan('Şehir', `<select class="girdi" data-b="iletisim.sehir"><option value="">Seçin</option>${sehirSecenek(i.sehir || '')}</select>`)}</div>
      ${alan('Google Haritalar bağlantısı (isteğe bağlı)', `<input class="girdi" data-b="iletisim.harita" type="url" inputmode="url" value="${esc(i.harita || '')}" placeholder="https://maps.app.goo.gl/…">`, '<small class="kucuk-yazi">Boş bırakırsanız “Yol tarifi” düğmesi adrese göre harita açar.</small>')}</div></section>`;
  const sayac = kap.querySelector('[data-sayac]'), acik = kap.querySelector('[data-b="aciklama"]');
  const say = () => { sayac.textContent = `${acik.value.length} / 400`; };
  say();
  kap.querySelectorAll('[data-b]').forEach((g) => g.addEventListener(g.type === 'checkbox' || g.tagName === 'SELECT' ? 'change' : 'input', () => {
    const k = g.dataset.b, v = g.type === 'checkbox' ? g.checked : g.value;
    if (k.startsWith('iletisim.')) { const a = k.slice(9); E.iletisim[a] = a === 'telefon' ? C.telNorm(v) || v : v; } else E[k] = v;
    if (k === 'aciklama') say();
    degisti();
  }));
}

// ---------------------------------------------------------------- görünüm
export function gorunumDuzenle(kap, E, degisti) {
  E.tema = { ...C.temaTemiz(E.tema, E.tur), logo: E.tema?.logo || '', kapak: E.tema?.kapak || '' };
  const ciz = () => {
    const t = E.tema, d = C.temaDegiskenleri(t), hazir = C.HAZIR_TEMA[E.tur] || C.HAZIR_TEMA.diger;
    kap.innerHTML = `<div class="rv-gorunum"><div class="rv-ayarlar">
      <section class="kart dz">${kartBas('Zemin')}<div class="rv-stiller">${Object.entries(C.STILLER).map(([k, s]) => `<button type="button" class="rv-stil${t.stil === k ? ' on' : ''}" data-stil="${k}" aria-pressed="${t.stil === k}"><i style="background:${s.zemin}"><em style="background:${s.yuzey}"></em><em style="background:${d.degisken.vurgu}"></em></i><span>${s.ad}</span></button>`).join('')}</div></section>
      <section class="kart dz">${kartBas('Renk', 'Düğmeler, seçili sekmeler ve logo zemini bu renkle görünür.')}<div class="rv-renkler">${C.VURGULAR.map(([h, a]) => `<button type="button" class="rv-renk${t.vurgu === h ? ' on' : ''}" data-renk="${h}" style="--r:${h}" title="${a}" aria-label="${a}"></button>`).join('')}
        <label class="rv-renk ozel${C.VURGULAR.some(([h]) => h === t.vurgu) ? '' : ' on'}" title="Özel renk" style="--r:${t.vurgu}"><input type="color" value="${t.vurgu}" data-ozel aria-label="Özel renk"></label></div></section>
      <section class="kart dz">${kartBas('Logo', 'Kare logo en iyi görünür. Logo yoksa adınızın baş harfleri kullanılır.')}<div class="rv-gorsel-sat">${logo(E, 64, '', true)}<div class="dg-grup"><button class="dg cizgili kucuk" type="button" data-logo>${ikon('yukle', 'kk')}Logo seç</button>${t.logo ? '<button class="dg sade kucuk" type="button" data-logosil>Kaldır</button>' : ''}</div></div></section>
      <section class="kart dz">${kartBas('Kapak fotoğrafı', 'İşletmenizden yatay bir fotoğraf; sayfanın en üstünde ve işletme listesindeki kartınızda görünür. Fotoğraf yoksa renginizle desenli bir zemin kullanılır.')}<div class="rv-gorsel-sat">${t.kapak ? `<img class="rv-kapak-kucuk" src="${esc(t.kapak)}" alt="">` : `<span class="rv-kapak-kucuk" style="${esc(kapakStil(t, E.tur))}"></span>`}<div class="dg-grup"><button class="dg cizgili kucuk" type="button" data-kapak>${ikon('yukle', 'kk')}Fotoğraf seç</button>${t.kapak ? '<button class="dg sade kucuk" type="button" data-kapaksil>Kaldır</button>' : ''}</div></div></section>
      ${t.stil !== hazir.stil || t.vurgu !== hazir.vurgu ? `<p><button type="button" class="dg sade kucuk" data-sifirla>${ikon('yenile', 'kk')}${esc(C.turAd(E.tur))} için önerilen renklere dön</button></p>` : ''}</div>
      <div class="rv-onizle-kap"><p class="etiket">Müşterinin gördüğü</p>${onizleme(E)}</div></div>`;
    const yenile = () => { degisti(); ciz(); };
    kap.querySelectorAll('[data-stil]').forEach((b) => (b.onclick = () => { E.tema.stil = b.dataset.stil; yenile(); }));
    kap.querySelectorAll('[data-renk]').forEach((b) => (b.onclick = () => { E.tema.vurgu = b.dataset.renk; yenile(); }));
    kap.querySelector('[data-ozel]').onchange = (e) => { E.tema.vurgu = e.target.value.toLowerCase(); yenile(); };
    kap.querySelector('[data-sifirla]')?.addEventListener('click', () => { E.tema.stil = hazir.stil; E.tema.vurgu = hazir.vurgu; yenile(); });
    kap.querySelector('[data-logo]').onclick = async () => { const v = await gorselSec({ oran: 1, max: 512, tip: 'image/png', baslik: 'Logo', ipucu: 'Logo kare çerçevede, köşeleri yuvarlatılarak gösterilir. Kenarlarda biraz boşluk bırakın.' }); if (v) { E.tema.logo = v; yenile(); } };
    kap.querySelector('[data-logosil]')?.addEventListener('click', () => { E.tema.logo = ''; yenile(); });
    kap.querySelector('[data-kapak]').onclick = async () => { const v = await gorselSec({ oran: 2, max: 1600, kalite: 0.82, baslik: 'Kapak fotoğrafı', ipucu: 'Geniş ekranlarda üstten ve alttan biraz daha kırpılır; önemli kısmı ortada tutun.' }); if (v) { E.tema.kapak = v; yenile(); } };
    kap.querySelector('[data-kapaksil]')?.addEventListener('click', () => { E.tema.kapak = ''; yenile(); });
  };
  ciz();
}
/** Küçük müşteri sayfası önizlemesi (işletme sayfasıyla aynı parçalar) */
export function onizleme(E) {
  const t = E.tema || {}, d = C.temaDegiskenleri(t), i = E.iletisim || {};
  const stil = Object.entries(d.degisken).map(([k, v]) => `--${k}:${v}`).join(';');
  const yer = [i.ilce, i.sehir].filter(Boolean).join(', ');
  const ac = C.acikDurum(E, C.trSimdi());
  const A = (E.hizmetler || []).filter((h) => h.aktif !== false && h.ad);
  const H = (A.length ? A : [{ ad: 'Saç kesimi', sure: 30, fiyat: 400 }, { ad: 'Sakal tıraşı', sure: 20, fiyat: 250 }, { ad: 'Saç + sakal', sure: 45, fiyat: 600 }]).slice(0, 3);
  return `<div class="rv-onizle dz-on${d.koyu ? ' koyu' : ''}" style="${esc(stil)}" aria-label="Önizleme">
    <div class="dz-on-kapak" style="${t.kapak ? `background:center / cover no-repeat url('${esc(t.kapak)}')` : esc(kapakStil(t, E.tur))}"></div>
    <div class="dz-on-kimlik">${logo(E, 60, 'dz-on-logo')}<div class="dz-on-yazi"><b>${esc(E.ad || 'İşletme adı')}</b><small>${esc(C.turAd(E.tur))}${yer ? ` · ${esc(yer)}` : ''}</small><span class="dk-durum${ac.acik ? ' acik' : ''}"><i></i><span>${esc(ac.metin)}</span></span></div></div>
    ${E.aciklama ? `<p class="dz-on-acik">${esc(E.aciklama)}</p>` : ''}
    <div class="dz-on-sekme"><span class="on">Hizmetler</span><span>Ekip</span>${(E.urunler || []).some((u) => u.aktif !== false) ? '<span>Ürünler</span>' : ''}<span>Bilgiler</span></div>
    <div class="dz-on-liste">${H.map((h, n) => `<div class="dk-hz${n ? '' : ' on'}"><span class="dk-hz-ic"><b>${esc(h.ad)}</b><span class="dk-hz-sure">${esc(C.sureYaz(h.sure))}</span></span><span class="dk-hz-sag"><b>${fiyatYaz(h.fiyat)}</b><span class="dk-ekle">${ikon(n ? 'arti' : 'tik')}</span></span></div>`).join('')}</div>
    <div class="dz-on-alt"><span><b>1 hizmet seçildi</b><small>${esc(C.sureYaz(H[0].sure))} · ${fiyatYaz(H[0].fiyat)}</small></span><span class="dg ana">Devam</span></div></div>`;
}

// ---------------------------------------------------------------- usta profili ve çalışmaları
/** Kimlik: fotoğraf, ad, unvan, telefon (p yerinde değişir) */
export function kimlikDuzenle(kap, p, degisti, { tel = true } = {}) {
  const ciz = () => {
    kap.innerHTML = `<section class="kart dz">${kartBas('Kimlik', 'Ad ve unvanınız işletme sayfasında, randevu adımlarında ve müşterinin randevu ekranında görünür.')}<div class="rv-form-dar">
      <div class="rv-gorsel-sat">${avatar(p, 72)}<div class="dg-grup"><button class="dg cizgili kucuk" type="button" data-foto>${ikon('yukle', 'kk')}Fotoğraf seç</button>${p.foto ? '<button class="dg sade kucuk" type="button" data-fotosil>Kaldır</button>' : ''}</div></div>
      <div class="izgara2">${alan('Görünen ad', `<input class="girdi" data-k="ad" value="${esc(p.ad)}" maxlength="40">`)}${alan('Unvan', `<input class="girdi" data-k="unvan" value="${esc(p.unvan || '')}" maxlength="40" placeholder="Ör. Usta berber">`)}</div>
      ${tel ? alan('Telefon (WhatsApp)', `<input class="girdi" data-k="tel" type="tel" inputmode="tel" value="${esc(C.telYaz(p.tel) || p.tel || '')}" placeholder="05xx xxx xx xx">`, '<small class="kucuk-yazi">Ödemeyi yapan müşteri size WhatsApp\'tan haber verebilir.</small>') : ''}</div></section>`;
    kap.querySelectorAll('[data-k]').forEach((g) => (g.oninput = () => { p[g.dataset.k] = g.dataset.k === 'tel' ? C.telNorm(g.value) || g.value : g.value; degisti(); }));
    kap.querySelector('[data-foto]').onclick = async () => { const d = await gorselSec({ oran: 1, max: 512, yuvarlak: true, baslik: 'Profil fotoğrafı', ipucu: 'Yüzünüz dairenin ortasında olsun. Sürükleyip yakınlaştırarak ayarlayın.' }); if (d) { p.foto = d; degisti(); ciz(); } };
    kap.querySelector('[data-fotosil]')?.addEventListener('click', () => { p.foto = ''; degisti(); ciz(); });
  };
  ciz();
}
/** Müşterinin gördüğü profil: hakkında, deneyim, uzmanlıklar ve çalışma fotoğrafları (p yerinde değişir) */
export function profilDuzenle(kap, p, { tur = 'diger', hizmetler = [], degisti }) {
  p.uzmanlik ||= []; p.isler ||= [];
  kap.innerHTML = `<section class="kart dz">${kartBas('Müşterilerin gördüğü', 'İşletme sayfasında adınıza dokunan müşteri bunları görür.')}<div class="rv-form-dar">
      ${alan('Hakkında', `<textarea class="girdi" data-p="hakkinda" rows="4" maxlength="500" placeholder="Ör. 8 yıldır erkek kuaförlüğü yapıyorum; fade ve klasik kesimlerde uzmanım.">${esc(p.hakkinda || '')}</textarea>`, '<small class="dz-sayac" data-sayac></small>')}
      ${alan('Deneyim', `<select class="girdi" data-p="deneyim"><option value="0">Belirtme</option>${Array.from({ length: 45 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${+p.deneyim === n ? 'selected' : ''}>${n} yıl</option>`).join('')}</select>`)}
      <div class="alan"><span>Uzmanlıklar</span><div class="dz-etiketler" id="dzUz"></div>
        <form class="dz-etiket-ekle" id="dzUzF"><input class="girdi" name="u" maxlength="30" placeholder="Ör. ${esc((C.UZMANLIK_ONER[tur] || [])[0] || 'Uzmanlık')}" autocomplete="off" aria-label="Uzmanlık ekle"><button class="dg cizgili" type="submit">Ekle</button></form>
        <span class="dz-oner" id="dzUzO"></span></div></div></section>
    <section class="kart dz">${kartBas('Çalışmalar', 'Yaptığınız işlerin fotoğrafları (en çok 30). Müşteriler ustasını seçerken bakar.', `<button class="dg ana kucuk" type="button" data-isekle>${ikon('arti', 'kk')}Fotoğraf ekle</button>`)}<div id="dzIs"></div></section>`;
  const sayac = kap.querySelector('[data-sayac]'), ta = kap.querySelector('[data-p="hakkinda"]');
  const say = () => { sayac.textContent = `${ta.value.length} / 500`; };
  say();
  ta.oninput = () => { p.hakkinda = ta.value; say(); degisti(); };
  kap.querySelector('[data-p="deneyim"]').onchange = (e) => { p.deneyim = +e.target.value; degisti(); };
  const uzCiz = () => {
    kap.querySelector('#dzUz').innerHTML = p.uzmanlik.length ? p.uzmanlik.map((u, i) => `<span class="dz-etiket">${esc(u)}<button type="button" data-usil="${i}" aria-label="${esc(u)} kaldır">${ikon('carpi', 'kk')}</button></span>`).join('') : '<small class="kucuk-yazi">Henüz uzmanlık eklenmedi.</small>';
    const var_ = new Set(p.uzmanlik.map(C.katla));
    kap.querySelector('#dzUzO').innerHTML = (C.UZMANLIK_ONER[tur] || []).filter((u) => !var_.has(C.katla(u))).map((u) => `<button type="button" class="cip" data-uoner="${esc(u)}">+ ${esc(u)}</button>`).join('');
    kap.querySelectorAll('[data-usil]').forEach((b) => (b.onclick = () => { p.uzmanlik.splice(+b.dataset.usil, 1); degisti(); uzCiz(); }));
    kap.querySelectorAll('[data-uoner]').forEach((b) => (b.onclick = () => ekle(b.dataset.uoner)));
  };
  const ekle = (u) => {
    u = C.str(u, 30); if (!u) return;
    if (p.uzmanlik.some((x) => C.katla(x) === C.katla(u))) return bildir('Bu uzmanlık zaten ekli.');
    if (p.uzmanlik.length >= 12) return bildir('En fazla 12 uzmanlık eklenebilir.', { hata: true });
    p.uzmanlik.push(u); degisti(); uzCiz();
  };
  kap.querySelector('#dzUzF').addEventListener('submit', (e) => { e.preventDefault(); ekle(e.target.u.value); e.target.u.value = ''; e.target.u.focus(); });
  uzCiz();
  const isCiz = () => {
    const el = kap.querySelector('#dzIs');
    el.innerHTML = p.isler.length ? `<div class="dz-isler">${p.isler.map((x, i) => `<button type="button" class="dz-is" data-is="${i}" aria-label="Çalışma ${i + 1}${x.not ? ': ' + esc(x.not) : ''}"><img src="${esc(x.foto)}" alt="">${x.not ? `<span>${esc(x.not)}</span>` : ''}</button>`).join('')}
        ${p.isler.length < 30 ? `<button type="button" class="dz-is ekle" data-isekle2>${ikon('arti')}<small>Ekle</small></button>` : ''}</div>
        <p class="kucuk-yazi dz-is-not">${p.isler.length} / 30 · Açıklama eklemek, sırasını değiştirmek ya da silmek için fotoğrafa dokunun.</p>`
      : `<div class="dz-bos">${ikon('yukle')}<b>Henüz fotoğraf yok</b><p>Kestiğiniz saçların, sakal tasarımlarınızın fotoğraflarını ekleyin. Telefonunuzdan birden çok fotoğraf seçebilirsiniz.</p></div>`;
    el.querySelectorAll('[data-is]').forEach((b) => (b.onclick = () => isCekmece(+b.dataset.is)));
    el.querySelector('[data-isekle2]')?.addEventListener('click', isEkle);
  };
  const isEkle = async () => {
    const kalan = 30 - p.isler.length;
    if (kalan <= 0) return bildir('En fazla 30 fotoğraf eklenebilir. Yenisini eklemek için eskilerden birini silin.', { hata: true });
    const L = await fotolarSec({ oranlar: ['kare', 'dikey', 'yatay', 'tamami'], max: 1280, kalite: 0.84, baslik: 'Çalışma fotoğrafı', ipucu: 'Sayfada kare olarak küçültülür; dokununca tamamı görünür.' }, kalan);
    if (!L.length) return;
    p.isler.unshift(...L.map((foto) => ({ id: '', foto, not: '', hizmet: '', t: 0 })));
    degisti(); isCiz(); bildir(`${L.length} fotoğraf eklendi`);
  };
  kap.querySelector('[data-isekle]').onclick = isEkle;
  const isCekmece = (i) => {
    const x = p.isler[i];
    const c = cekmece({
      baslik: 'Çalışma',
      govde: `<form id="dzIF" class="rv-form-dar"><img class="dz-is-buyuk" src="${esc(x.foto)}" alt="">
        ${alan('Açıklama (isteğe bağlı)', `<input class="girdi" name="not" value="${esc(x.not || '')}" maxlength="120" placeholder="Ör. Skin fade + sakal düzeltme" autocomplete="off">`)}
        ${hizmetler.length ? alan('Hizmet (isteğe bağlı)', `<select class="girdi" name="hizmet"><option value="">Seçilmedi</option>${hizmetler.map((h) => `<option value="${esc(h.id)}" ${x.hizmet === h.id ? 'selected' : ''}>${esc(h.ad)}</option>`).join('')}</select>`) : ''}
        <div class="dg-grup"><button class="dg cizgili kucuk" type="button" data-basa ${i ? '' : 'disabled'}>${ikon('yukari', 'kk')}En başa al</button></div></form>`,
      alt: `<button class="dg sade tehlike-yazi" type="button" data-sil>${ikon('cop', 'kk')}Sil</button><span class="bosluk"></span><button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="submit" form="dzIF">Tamam</button>`,
    });
    const f = c.el.querySelector('#dzIF');
    f.addEventListener('submit', (e) => { e.preventDefault(); x.not = C.str(f.not.value, 120); if (f.hizmet) x.hizmet = f.hizmet.value; degisti(); c.kapat(); isCiz(); });
    c.el.querySelector('[data-basa]').onclick = () => { p.isler.splice(i, 1); p.isler.unshift(x); degisti(); c.kapat(); isCiz(); };
    c.el.querySelector('[data-sil]').onclick = async () => { c.kapat(); if (await onayla({ baslik: 'Fotoğraf silinsin mi?', metin: 'Kaydettiğinizde işletme sayfasından da kalkar.', evet: 'Sil', tehlike: true })) { p.isler.splice(p.isler.indexOf(x), 1); degisti(); isCiz(); } };
  };
  isCiz();
}

// ---------------------------------------------------------------- kaydetmeden önce
/** Taslakta kaydı engelleyecek bir sorun varsa açıklamasını döndürür */
export function dogrula(E) {
  if (!C.str(E.ad, 80)) return 'İşletme adını boş bırakmayın.';
  const tel = E.iletisim?.telefon;
  if (tel && !C.telNorm(tel)) return 'Telefon numarası geçersiz görünüyor. Ör. 0532 000 00 00';
  if (E.iletisim?.harita && !/^https:\/\/\S+$/.test(E.iletisim.harita)) return 'Harita bağlantısı https:// ile başlamalı.';
  if ((E.hizmetler || []).some((h) => !C.str(h.ad, 60))) return 'Adı boş bir hizmet var.';
  if ((E.urunler || []).some((u) => !C.str(u.ad, 60))) return 'Adı boş bir ürün var.';
  return '';
}
