// Randevu Vaktim — vitrin (ana sayfa): listedeki tüm işletmeler. Arama (işletme, hizmet, ürün, semt), kategori sekmeleri,
// şehir ve sıralama. Yönetici girişi sağ üst köşede küçük bir düğme. Veri: /randevu-api/dizin (tek kayıt, önbellekli).
import * as C from './cekirdek.js?v=2026-11-22-c';
import { api, ONIZLEME, demoSifirla } from './api.js?v=2026-11-22-c';
import { $, $$, esc, ikon, markaIkon, href, sorgu, temaUygula, URUN_TEMA, metaRobots, yukleniyor, hataKutu, turIkon, kapakStil, logo, fiyatAralik, gecikmeli } from './rui.js?v=2026-11-22-c';

const KOK = () => $('#uygulama');
let V = null; // { L, fark, t }
let F = { q: '', tur: '', sehir: '', sira: 'oneri' };
export function temizle() { /* vitrinin zamanlayıcısı yok */ }
const simdiTR = () => C.trSimdi(Date.now() + (V?.fark || 0));
const SIRALAR = [['oneri', 'Önerilen'], ['az', 'A\'dan Z\'ye'], ['fiyat', 'Fiyat (düşükten)'], ['yeni', 'En yeni']];

export async function vitrin() {
  metaRobots(false);
  temaUygula(URUN_TEMA);
  document.title = 'Randevu Vaktim · Berber, kuaför ve güzellik randevusu';
  const q = sorgu();
  F = { q: q.get('q') || '', tur: q.get('tur') || '', sehir: q.get('sehir') || '', sira: SIRALAR.some(([k]) => k === q.get('sira')) ? q.get('sira') : 'oneri' };
  if (!KOK().querySelector('.pz')) KOK().innerHTML = kabuk();
  baglaKabuk();
  if (!V || Date.now() - V.t > 60e3) {
    if (!V) $('#pzL').innerHTML = yukleniyor();
    try { const v = await api.dizin(); V = { L: v.isletmeler || [], fark: v.simdi.ms - Date.now(), t: Date.now() }; } catch (e) {
      $('#pzL').innerHTML = hataKutu(e.message); $('#pzL [data-tekrar]').onclick = () => { V = null; vitrin(); }; return;
    }
  }
  if (!$('#pzL')) return;
  ciz();
}

function kabuk() {
  return `<div class="pz">
    <header class="pz-ust"><div class="pz-ust-ic">
      <a class="pz-marka" href="${href('/randevu')}" data-git="/randevu" aria-label="Randevu Vaktim ana sayfa">${markaIkon(30)}<span>Randevu Vaktim</span></a>
      <form class="pz-ara" role="search" id="pzA"><span class="pz-ara-ikon">${ikon('ara', 'k')}</span><input type="search" name="q" placeholder="İşletme, hizmet ya da semt ara" autocomplete="off" enterkeyhint="search" aria-label="İşletme, hizmet ya da semt ara"><button class="pz-ara-sil" type="button" aria-label="Aramayı temizle" hidden>${ikon('carpi', 'kk')}</button></form>
      <a class="pz-giris" href="${href('/randevu/giris')}" data-git="/randevu/giris">${ikon('kilit', 'kk')}<span>Yönetici girişi</span></a>
    </div></header>
    ${ONIZLEME ? `<div class="pz-onizleme"><span>Önizleme: veriler yalnız bu cihazda tutulur.</span><button type="button" data-sifirla>Sıfırla</button></div>` : ''}
    <nav class="pz-kat" aria-label="Kategoriler"><div class="pz-kat-ic" id="pzK"></div></nav>
    <main class="pz-govde">
      <div class="pz-bas"><div><h1 id="pzB">Tüm işletmeler</h1><p id="pzN" class="soluk"></p></div>
        <div class="pz-filtre"><label class="pz-sec" id="pzSehirK" hidden><span class="gizli">Şehir</span><select id="pzSehir"></select></label>
          <label class="pz-sec"><span class="gizli">Sıralama</span><select id="pzSira">${SIRALAR.map(([k, a]) => `<option value="${k}">${a}</option>`).join('')}</select></label></div></div>
      <div class="pz-izgara" id="pzL"></div>
    </main>
    <section class="pz-nasil" aria-labelledby="pzNasil"><div class="pz-nasil-ic">
      <h2 id="pzNasil">Randevu nasıl alınır?</h2>
      <ol>
        <li><span>${ikon('takvim')}</span><div><b>Hizmetini ve saatini seç</b><p>Boş ve dolu saatleri o anda görürsün. Üye olman gerekmez; adın ve telefonun yeterli.</p></div></li>
        <li><span>${ikon('kart')}</span><div><b>Ön ödemeni gönder</b><p>Ekranda çıkan IBAN'a, açıklamaya adını ve soyadını yazarak gönder, “Ödeme yaptım”a bas.</p></div></li>
        <li><span>${ikon('tik')}</span><div><b>Onayı al</b><p>İşletme ödemeni görünce randevun kesinleşir; durumunu aynı sayfadan takip edersin.</p></div></li>
      </ol></div></section>
    <footer class="pz-alt"><div class="pz-alt-ic"><span>${markaIkon(22)}<b>Randevu Vaktim</b> · bir NFC Dünyası ürünüdür</span>${ONIZLEME ? '' : '<a href="/">İşletmenizi eklemek için: nfcdunyasi.com</a>'}</div></footer>
  </div>`;
}

function urlYaz() {
  const p = new URLSearchParams();
  if (F.q) p.set('q', F.q); if (F.tur) p.set('tur', F.tur); if (F.sehir) p.set('sehir', F.sehir); if (F.sira !== 'oneri') p.set('sira', F.sira);
  const qs = p.toString();
  history.replaceState(null, '', href('/randevu' + (qs ? '?' + qs : '')));
}
function baglaKabuk() {
  const f = $('#pzA'), i = f.q, sil = f.querySelector('.pz-ara-sil');
  if (document.activeElement !== i) i.value = F.q;
  sil.hidden = !F.q;
  const yaz = gecikmeli(() => { F.q = i.value.trim(); urlYaz(); ciz(); }, 160);
  i.oninput = () => { sil.hidden = !i.value; yaz(); };
  f.onsubmit = (e) => { e.preventDefault(); i.blur(); F.q = i.value.trim(); urlYaz(); ciz(); };
  sil.onclick = () => { i.value = ''; sil.hidden = true; F.q = ''; urlYaz(); ciz(); i.focus(); };
  $('#pzSira').value = F.sira;
  $('#pzSira').onchange = (e) => { F.sira = e.target.value; urlYaz(); ciz(); };
  $('#pzSehir').onchange = (e) => { F.sehir = e.target.value; urlYaz(); ciz(); };
  KOK().querySelector('[data-sifirla]')?.addEventListener('click', demoSifirla);
}

// ---------------------------------------------------------------- süzme ve sıralama
const samanlik = (x) => (x._k ||= C.katla([x.ad, C.turAd(x.tur), x.sehir, x.ilce, ...(x.hizmet || []), ...(x.urun || [])].join(' ')));
function suz({ tur = F.tur } = {}) {
  const kel = C.katla(F.q).split(' ').filter(Boolean);
  return V.L.filter((x) => (!tur || x.tur === tur) && (!F.sehir || x.sehir === F.sehir) && kel.every((k) => samanlik(x).includes(k)));
}
function sirala(L) {
  const sim = simdiTR(), ad = (a, b) => a.ad.localeCompare(b.ad, 'tr');
  for (const x of L) x._d = C.acikDurum(x, sim);
  if (F.sira === 'az') return L.sort(ad);
  if (F.sira === 'yeni') return L.sort((a, b) => (b.olusturma || 0) - (a.olusturma || 0) || ad(a, b));
  if (F.sira === 'fiyat') return L.sort((a, b) => (a.min || Infinity) - (b.min || Infinity) || ad(a, b));
  return L.sort((a, b) => (b.one ? 1 : 0) - (a.one ? 1 : 0) || (a.ornek ? 1 : 0) - (b.ornek ? 1 : 0) || (b._d.acik ? 1 : 0) - (a._d.acik ? 1 : 0) || ad(a, b));
}

// ---------------------------------------------------------------- çizim
function ciz() {
  // kategoriler: sayılar arama ve şehir süzgecine göre
  const tumu = suz({ tur: '' }), say = {};
  for (const x of tumu) say[x.tur] = (say[x.tur] || 0) + 1;
  const turler = C.TURLER.filter(([k]) => V.L.some((x) => x.tur === k));
  if (F.tur && !turler.some(([k]) => k === F.tur)) F.tur = '';
  $('#pzK').innerHTML = [['', 'Tümü', tumu.length, 'tumu'], ...turler.map(([k, a]) => [k, a, say[k] || 0, k])].map(([k, a, n, ik]) =>
    `<button type="button" class="pz-kat-d${F.tur === k ? ' on' : ''}" data-tur="${k}" aria-pressed="${F.tur === k}"><span class="pz-kat-ikon">${turIkon(ik)}</span><b>${esc(a)}</b><small>${n}</small></button>`).join('');
  $$('#pzK [data-tur]').forEach((b) => (b.onclick = () => { F.tur = b.dataset.tur; urlYaz(); ciz(); }));
  const on = $('#pzK .on'); if (on && on.dataset.tur) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  // şehirler
  const sehirler = [...new Set(V.L.map((x) => x.sehir).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  $('#pzSehirK').hidden = sehirler.length < 1;
  if (F.sehir && !sehirler.includes(F.sehir)) F.sehir = '';
  $('#pzSehir').innerHTML = `<option value="">Tüm şehirler</option>${sehirler.map((x) => `<option ${x === F.sehir ? 'selected' : ''}>${esc(x)}</option>`).join('')}`;
  // liste
  const L = sirala(suz());
  $('#pzB').textContent = F.q ? `“${F.q}” için sonuçlar` : F.tur ? C.turAd(F.tur) : 'Tüm işletmeler';
  $('#pzN').textContent = `${L.length} işletme${F.sehir ? ` · ${F.sehir}` : ''}`;
  if (!V.L.length) { $('#pzL').innerHTML = `<div class="pz-bos">${ikon('takvim')}<b>Henüz listede işletme yok</b><p>İşletmeler eklendikçe burada görünecek.</p></div>`; return; }
  if (!L.length) {
    $('#pzL').innerHTML = `<div class="pz-bos">${ikon('ara')}<b>Sonuç bulunamadı</b><p>Farklı bir kelime deneyin ya da süzgeçleri temizleyin.</p><button class="dg cizgili" type="button" data-temizle>Süzgeçleri temizle</button></div>`;
    $('#pzL [data-temizle]').onclick = () => { F = { q: '', tur: '', sehir: '', sira: F.sira }; $('#pzA').q.value = ''; $('#pzA .pz-ara-sil').hidden = true; urlYaz(); ciz(); };
    return;
  }
  const kel = C.katla(F.q).split(' ').filter(Boolean);
  $('#pzL').innerHTML = L.map((x) => kart(x, kel)).join('');
}

function kart(x, kel) {
  const yer = [x.ilce, x.sehir].filter(Boolean).join(', ');
  // aranan kelimeye uyan hizmetler öne
  const H = [...(x.hizmet || [])].sort((a, b) => (kel.length && kel.some((k) => C.katla(b).includes(k)) ? 1 : 0) - (kel.length && kel.some((k) => C.katla(a).includes(k)) ? 1 : 0));
  const rozet = x.one ? '<span class="pz-rozet">Öne çıkan</span>' : x.ornek ? '<span class="pz-rozet gri">Örnek işletme</span>' : '';
  return `<a class="pz-kart" href="${href('/randevu/' + x.slug)}" data-git="/randevu/${esc(x.slug)}">
    <div class="pz-kapak" style="${x.tema.kapak ? '' : esc(kapakStil(x.tema, x.tur))}">${x.tema.kapak ? `<img src="${esc(x.tema.kapak)}" alt="" loading="lazy">` : ''}${rozet}</div>
    <div class="pz-kart-ic">
      ${logo(x, 52, 'pz-logo', true)}
      <h3>${esc(x.ad)}</h3>
      <p class="pz-kart-alt">${esc(C.turAd(x.tur))}${yer ? ` · ${esc(yer)}` : ''}</p>
      <p class="pz-kart-durum${x._d.acik ? ' acik' : ''}"><i></i>${esc(x._d.metin)}</p>
      ${H.length ? `<p class="pz-kart-hz">${H.slice(0, 4).map(esc).join(' · ')}${H.length > 4 ? ` · +${H.length - 4}` : ''}</p>` : ''}
      <div class="pz-kart-alt2"><span>${x.max ? esc(fiyatAralik(x.min, x.max)) : ''}</span><span class="pz-kart-git">Randevu al${ikon('sag', 'kk')}</span></div>
    </div></a>`;
}
