// Oyunların ekran yönü: her oyun dikey ya da yatay oynanır.
// Telefonda yanlış yönde tutuluyorsa oyunun üstüne "çevirin" uyarısı gelir; telefon çevrilince kendiliğinden kalkar.
// Android'de (tam ekran + Screen Orientation API) "Tam ekran aç ve çevir" düğmesi ekranı o yöne kilitler.
// iPhone kilitlemeye izin vermez: orada yalnızca uyarı ve döndürme kilidi ipucu çıkar. Tablet ve bilgisayarda uyarı yok.

// Yatay oynanan oyunlar (birinci şahıs görüş ve iki elle kontrol). Geri kalan her oyun dikey.
export const YATAY = new Set(['catisma', 'blok-adasi']);
export const yonu = (id) => (YATAY.has(id) ? 'yatay' : 'dikey');

const CSS = `
#yon-uyari{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:rgba(18,14,34,.84);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:yuGir .25s ease both}
@keyframes yuGir{from{opacity:0}to{opacity:1}}
#yon-uyari .yu-kart{width:min(340px,100%);max-height:100%;overflow:auto;text-align:center;background:rgb(var(--c-ortu,255 246 233));color:rgb(var(--c-murekkep,18 14 34));border:4px solid rgb(var(--c-murekkep,18 14 34));border-radius:28px;box-shadow:6px 6px 0 0 rgb(var(--c-murekkep,18 14 34));padding:22px 20px 16px}
#yon-uyari .yu-tel{width:96px;height:96px;margin:0 auto 6px;display:grid;place-items:center}
#yon-uyari .yu-tel svg{width:44px;height:76px;animation:yuDon 2.6s cubic-bezier(.6,0,.3,1) infinite}
#yon-uyari .yu-tel.dikey svg{animation-name:yuDik}
@keyframes yuDon{0%,18%{transform:rotate(0)}48%,82%{transform:rotate(-90deg)}100%{transform:rotate(0)}}
@keyframes yuDik{0%,18%{transform:rotate(-90deg)}48%,82%{transform:rotate(0)}100%{transform:rotate(-90deg)}}
#yon-uyari .yu-oyun{font-size:13px;font-weight:800;opacity:.7}
#yon-uyari h2{margin-top:4px;font-size:26px;font-weight:800;line-height:1.1;letter-spacing:-.01em}
#yon-uyari .yu-acik{margin-top:8px;font-size:15px;font-weight:600;line-height:1.35}
#yon-uyari .yu-btn{margin-top:14px;width:100%;padding:12px 16px;border-radius:16px;border:4px solid rgb(var(--c-murekkep,18 14 34));background:rgb(var(--c-limon,255 210 63));box-shadow:4px 4px 0 0 rgb(var(--c-murekkep,18 14 34));font-size:16px;font-weight:800}
#yon-uyari .yu-btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 0 rgb(var(--c-murekkep,18 14 34))}
#yon-uyari .yu-ipucu{margin-top:12px;font-size:12.5px;font-weight:600;line-height:1.4;opacity:.7}
#yon-uyari .yu-gec{margin-top:10px;padding:8px 12px;font-size:13px;font-weight:700;text-decoration:underline;text-underline-offset:4px;opacity:.75}
@media (max-height:500px){#yon-uyari .yu-kart{width:min(520px,100%);display:grid;grid-template-columns:96px 1fr;column-gap:14px;text-align:left;padding:16px 18px 10px;align-items:center}
#yon-uyari .yu-tel{grid-row:span 6;margin:0}#yon-uyari h2{font-size:22px}#yon-uyari .yu-acik{font-size:14px;margin-top:4px}#yon-uyari .yu-btn{margin-top:10px;padding:9px 14px;font-size:15px}#yon-uyari .yu-ipucu{margin-top:8px}#yon-uyari .yu-gec{justify-self:start;padding:6px 0}}
@media (prefers-reduced-motion:reduce){#yon-uyari,#yon-uyari .yu-tel svg{animation:none}#yon-uyari .yu-tel.yatay svg{transform:rotate(-90deg)}}
.gyon{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:1px 7px;border:2px solid rgb(var(--c-murekkep,18 14 34));border-radius:999px;background:rgba(255,255,255,.55);font-size:11px;font-weight:800;vertical-align:1px;white-space:nowrap}
.gyon svg{width:13px;height:13px}
`;

const TEL = '<svg viewBox="0 0 44 76" aria-hidden="true"><rect x="2.5" y="2.5" width="39" height="71" rx="9" fill="rgb(var(--c-limon,255 210 63))" stroke="currentColor" stroke-width="4"/><rect x="9" y="11" width="26" height="50" rx="3" fill="currentColor" opacity=".16"/><circle cx="22" cy="67" r="2.6" fill="currentColor"/></svg>';
export const YON_IKON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4.5" width="13" height="7.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="8.25" r="1" fill="currentColor"/></svg>';

let stil = false, aktif = null, kilitledik = false, bekle = 0;

function stilKur() {
  if (stil) return; stil = true;
  const s = document.createElement('style'); s.id = 'yon-stil'; s.textContent = CSS; document.head.appendChild(s);
  const tetik = () => { cancelAnimationFrame(bekle); bekle = requestAnimationFrame(guncelle); };
  try { screen.orientation && screen.orientation.addEventListener('change', tetik); } catch { /* eski tarayıcı */ }
  addEventListener('orientationchange', tetik); addEventListener('resize', tetik);
  document.addEventListener('focusin', tetik); document.addEventListener('focusout', () => setTimeout(tetik, 350));
}

// Telefon mu? Dokunmatik ve kısa kenarı 600 pikselden küçük ekran. iPad ve bilgisayar uyarı görmez.
export function telefonMu() {
  try { return matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600; } catch { return false; }
}

// Cihazın tutuluş yönü. Klavye açılınca daralan görünüm alanına değil ekranın kendisine bakar.
export function simdikiYon() {
  try { const t = screen.orientation && screen.orientation.type; if (t) return t.indexOf('landscape') === 0 ? 'yatay' : 'dikey'; } catch { /* */ }
  if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90 ? 'yatay' : 'dikey';
  return innerWidth > innerHeight ? 'yatay' : 'dikey';
}

const yaziyor = () => { const e = document.activeElement; return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.isContentEditable); };
const kilitVar = () => { try { const d = document.documentElement; return !!(screen.orientation && screen.orientation.lock && (d.requestFullscreen || d.webkitRequestFullscreen)); } catch { return false; } };
const tamEkranda = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

function kilitle(h) {
  try {
    if (!tamEkranda() || !screen.orientation || !screen.orientation.lock) return Promise.reject(new Error('kilit yok'));
    return screen.orientation.lock(h === 'yatay' ? 'landscape' : 'portrait').then(() => { kilitledik = true; });
  } catch (e) { return Promise.reject(e); }
}
function kilidiAc() {
  if (!kilitledik && !tamEkranda()) return;
  try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch { /* */ }
  kilitledik = false;
}

function gizle() { const u = document.getElementById('yon-uyari'); if (u) u.remove(); }

function goster(h) {
  let u = document.getElementById('yon-uyari');
  if (u && u.dataset.h === h && u.dataset.id === aktif.id) return;
  if (u) u.remove();
  const yatay = h === 'yatay';
  u = document.createElement('div');
  u.id = 'yon-uyari'; u.dataset.h = h; u.dataset.id = aktif.id;
  u.setAttribute('role', 'dialog'); u.setAttribute('aria-modal', 'true'); u.setAttribute('aria-labelledby', 'yu-baslik');
  const ad = aktif.ad ? `${aktif.emoji ? aktif.emoji + ' ' : ''}${aktif.ad}` : '';
  u.innerHTML = `<div class="yu-kart">
    <div class="yu-tel ${h}">${TEL}</div>
    ${ad ? `<p class="yu-oyun"></p>` : ''}
    <h2 id="yu-baslik">${yatay ? 'Telefonu yan çevirin' : 'Telefonu dik tutun'}</h2>
    <p class="yu-acik">${yatay ? 'Bu oyun yatay ekranda oynanır.' : 'Bu oyun dik ekranda oynanır.'} Çevirdiğiniz anda oyun devam eder.</p>
    ${kilitVar() ? `<button type="button" class="yu-btn" data-yu="kilit">Tam ekran aç ve ${yatay ? 'yan çevir' : 'dik çevir'}</button>` : ''}
    <p class="yu-ipucu">Ekran dönmüyorsa telefonunuzun döndürme kilidini kapatın${/iPhone|iPod/.test(navigator.userAgent) ? ' (Denetim Merkezi’ndeki kilit simgesi)' : ''}.</p>
    <button type="button" class="yu-gec" data-yu="gec">Böyle devam et</button></div>`;
  if (ad) u.querySelector('.yu-oyun').textContent = ad;
  u.addEventListener('click', (e) => {
    const b = e.target.closest('[data-yu]'); if (!b) return;
    if (b.dataset.yu === 'gec') { if (aktif) aktif.gec = true; gizle(); return; }
    const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen;
    b.disabled = true;
    Promise.resolve(tamEkranda() ? null : f.call(d, { navigationUI: 'hide' }))
      .then(() => kilitle(h))
      .then(() => guncelle())
      .catch(() => { b.remove(); const p = u.querySelector('.yu-ipucu'); if (p) p.textContent = 'Bu telefon ekranı kendisi çeviremedi. Lütfen telefonu elle çevirin; ekran dönmüyorsa döndürme kilidini kapatın.'; });
  });
  document.body.appendChild(u);
}

function guncelle() {
  if (!aktif || aktif.gec || !telefonMu()) return gizle();
  const h = yonu(aktif.id);
  if (simdikiYon() === h) return gizle();
  if (h === 'dikey' && yaziyor()) return gizle(); // klavye açıkken bazı telefonlarda görünüm yataylaşır; yazarken uyarma
  goster(h);
}

// app.js her ekran çiziminde çağırır: oyundaysa oyunun kimliği ve bilgisi, değilse null.
export function yonOyun(id, meta) {
  stilKur();
  if (!id) { aktif = null; gizle(); kilidiAc(); return; }
  if (!aktif || aktif.id !== id) {
    aktif = { id, ad: meta && meta.name, emoji: meta && meta.emoji, gec: false };
    if (telefonMu() && tamEkranda()) kilitle(yonu(id)).catch(() => {}); // tam ekrandaysak (Android) yeni oyunun yönüne kilitle
  } else if (meta && !aktif.ad) { aktif.ad = meta.name; aktif.emoji = meta.emoji; }
  guncelle();
}
