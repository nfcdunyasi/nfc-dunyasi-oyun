// Randevu Vaktim — giriş noktası: yönlendirme ve personel girişi.
//   /randevu                      vitrin: işletmeler, arama, kategoriler   /randevu/giris   usta, işletme ve NFC Dünyası girişi
//   /randevu/<işletme>            randevu al (temalı)        /randevu/<işletme>/r/<kod> randevu durumu (ödeme, onay)
//   /randevu/panel/...            usta / işletme paneli      /randevu/yonetim/...      NFC Dünyası yönetici paneli
import { api, yerel, TK, ONIZLEME } from './api.js?v=2026-11-24-b';
import { $, markaIkon, git, href, yol, cizKur, temaUygula, URUN_TEMA, metaRobots } from './rui.js?v=2026-11-24-b';
import * as M from './musteri.js?v=2026-11-24-b';
import * as VT from './vitrin.js?v=2026-11-24-b';

const KOK = $('#uygulama');
let panelM = null, yonetimM = null;

async function ciz() {
  M.temizle(); VT.temizle(); panelM?.temizle(); yonetimM?.temizle();
  const P = yol().split('/').filter(Boolean);
  if (P[0] !== 'randevu') { if (ONIZLEME) return git('/randevu', { degistir: true }); location.replace('/randevu'); return; }
  const [, a, b, c] = P;
  if (!a) return VT.vitrin();
  if (a === 'giris') return girisSayfasi();
  if (a === 'panel') { panelM = await import('./panel.js?v=2026-11-24-b'); return panelM.panel(P.slice(2)); }
  if (a === 'yonetim') { yonetimM = await import('./yonetim.js?v=2026-11-24-b'); return yonetimM.yonetim(P.slice(2)); }
  if (b === 'r' && c) return M.durumSayfasi(a.toLowerCase(), c);
  return M.isletmeSayfasi(a.toLowerCase());
}
cizKur(ciz);

// ---------------------------------------------------------------- giriş
async function girisYap(k, s) {
  k = String(k || '').trim();
  if (k.toLocaleLowerCase('tr') === 'admin') { const t = await api.adminGiris('admin', s); yerel.koy(TK.yonetici, t); git('/randevu/yonetim'); return; }
  const r = await api.giris(k, s); yerel.koy(TK.personel, r.token); git('/randevu/panel');
}
function girisFormu(id = 'gF') {
  return `<form class="rv-giris-form" id="${id}" autocomplete="on">
    <label class="alan"><span>Kullanıcı adı</span><input class="girdi" name="k" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required placeholder="ör. harun"></label>
    <label class="alan"><span>Şifre</span><input class="girdi" name="s" type="password" autocomplete="current-password" required></label>
    <button class="dg ana tam buyuk" type="submit">Giriş yap</button><p class="hata-yazi" role="alert"></p></form>`;
}
function girisBagla(f) {
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); const b = f.querySelector('button'), h = f.querySelector('.hata-yazi');
    h.textContent = ''; b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try { await girisYap(f.k.value, f.s.value); } catch (er) { h.textContent = er.message; b.disabled = false; b.textContent = 'Giriş yap'; }
  });
}
function girisSayfasi() {
  metaRobots(true);
  temaUygula(URUN_TEMA);
  if (yerel.al(TK.personel)) return git('/randevu/panel', { degistir: true });
  document.title = 'Giriş · Randevu Vaktim';
  KOK.innerHTML = `<div class="giris-sayfa"><div class="giris-kart">
    <a href="${href('/randevu')}" data-git="/randevu" class="rv-giris-ikon" aria-label="Randevu Vaktim">${markaIkon(64)}</a>
    <div><h1>Yönetici girişi</h1><p class="soluk" style="margin-top:6px">Usta, işletme ve NFC Dünyası yöneticileri buradan girer. Kullanıcı adınızı ve şifrenizi işletmenizden ya da NFC Dünyası'ndan alırsınız.</p></div>
    ${girisFormu()}${ONIZLEME ? onizlemeHesaplar() : ''}
    <a class="dg sade kucuk" href="${href('/randevu')}" data-git="/randevu">‹ İşletmelere dön</a></div></div>`;
  girisBagla($('#gF'));
  bagHesaplar();
}
function onizlemeHesaplar() {
  return `<div class="rv-demo-hesap"><p><b>Önizleme hesapları</b> (dokunun, otomatik dolar)</p>
    <button type="button" data-h="harun|harun123">Usta: <b>harun</b> / harun123</button>
    <button type="button" data-h="huseyin|huseyin123">İşletme yöneticisi: <b>huseyin</b> / huseyin123</button>
    <button type="button" data-h="admin|demo">NFC Dünyası yönetici: <b>admin</b> / demo</button></div>`;
}
function bagHesaplar() {
  document.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => { const [k, s] = b.dataset.h.split('|'), f = b.closest('.giris-kart').querySelector('form'); f.k.value = k; f.s.value = s; f.requestSubmit(); }));
}

ciz();
