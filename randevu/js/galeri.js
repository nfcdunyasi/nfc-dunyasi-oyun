// Randevu Vaktim — fotoğraf görüntüleyici: tam ekran, kaydırarak / oklarla gezinme, alt yazı ve eylem düğmesi.
import { ikon } from './rui.js?v=2026-11-22-c';

/** L: [{foto, ...}], i: başlangıç; alt(x) → fotoğrafın altındaki HTML; bagla(el, x, kapat) → alt kısımdaki düğmeler */
export function galeriAc(L, i = 0, { alt = () => '', bagla = null } = {}) {
  if (!L.length) return;
  const dl = document.createElement('dialog'); dl.className = 'galeri';
  dl.innerHTML = `<div class="gl-ust"><span class="gl-sayac" aria-live="polite"></span><button class="gl-d" type="button" data-kapat aria-label="Kapat">${ikon('carpi')}</button></div>
    <div class="gl-sahne"><img alt="" draggable="false"><button class="gl-d gl-onceki" type="button" aria-label="Önceki">${ikon('sol')}</button><button class="gl-d gl-sonraki" type="button" aria-label="Sonraki">${ikon('sag')}</button></div>
    <div class="gl-alt"></div>`;
  document.body.appendChild(dl);
  const img = dl.querySelector('img'), altEl = dl.querySelector('.gl-alt'), sayac = dl.querySelector('.gl-sayac');
  const kapat = () => { try { dl.close(); } catch { /* */ } dl.remove(); document.documentElement.classList.remove('gl-acik'); };
  const goster = (n) => {
    i = (n + L.length) % L.length; const x = L[i];
    img.classList.remove('gel'); void img.offsetWidth; img.src = x.foto; img.classList.add('gel');
    sayac.textContent = L.length > 1 ? `${i + 1} / ${L.length}` : '';
    altEl.innerHTML = alt(x) || ''; bagla && bagla(altEl, x, kapat);
    dl.querySelector('.gl-onceki').hidden = dl.querySelector('.gl-sonraki').hidden = L.length < 2;
    // komşu fotoğrafları önceden yükle
    for (const k of [i + 1, i - 1]) { const y = L[(k + L.length) % L.length]; if (y) new Image().src = y.foto; }
  };
  dl.querySelector('.gl-onceki').onclick = () => goster(i - 1);
  dl.querySelector('.gl-sonraki').onclick = () => goster(i + 1);
  dl.addEventListener('click', (e) => { if (e.target.closest('[data-kapat]') || e.target === dl || e.target.classList.contains('gl-sahne')) kapat(); });
  dl.addEventListener('cancel', (e) => { e.preventDefault(); kapat(); });
  dl.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') goster(i - 1); else if (e.key === 'ArrowRight') goster(i + 1); });
  // kaydırma: yatay → önceki/sonraki, aşağı → kapat
  let bas = null;
  const sahne = dl.querySelector('.gl-sahne');
  sahne.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; bas = { x: e.clientX, y: e.clientY }; });
  sahne.addEventListener('pointermove', (e) => { if (!bas) return; const dx = e.clientX - bas.x, dy = e.clientY - bas.y; img.style.transform = Math.abs(dx) > Math.abs(dy) ? `translateX(${dx}px)` : dy > 0 ? `translateY(${dy}px)` : ''; });
  const birak = (e) => {
    if (!bas) return; const dx = e.clientX - bas.x, dy = e.clientY - bas.y; bas = null; img.style.transform = '';
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) goster(i + (dx < 0 ? 1 : -1));
    else if (dy > 90 && dy > Math.abs(dx)) kapat();
  };
  sahne.addEventListener('pointerup', birak); sahne.addEventListener('pointercancel', () => { bas = null; img.style.transform = ''; });
  document.documentElement.classList.add('gl-acik');
  try { dl.showModal(); } catch { dl.setAttribute('open', ''); }
  goster(i);
  return { kapat };
}
