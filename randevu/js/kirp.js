// Randevu Vaktim — fotoğraf ayarlama: seçilen fotoğraf çerçeveye sürüklenir, yakınlaştırılır (kaydırma, iki parmak,
// sürgü), 90° döndürülür; istenirse oran seçilir (kare, dikey, yatay…). Çıktı, çerçevedeki kısım; en fazla "max" piksel.
import { esc, bildir, cekmece, ikon } from '/dugun/js/ui.js?v=2026-11-22-c';

export const ORANLAR = { kare: [1, 'Kare'], dikey: [4 / 5, 'Dikey'], yatay: [4 / 3, 'Yatay'], genis: [2, 'Geniş'], tamami: [0, 'Tamamı'] };

function ac(dosya) {
  return new Promise((ok, no) => {
    if (dosya.size > 25e6) return no(new Error('Fotoğraf çok büyük (25 MB üstü). Daha küçük bir fotoğraf seçin.'));
    const u = URL.createObjectURL(dosya), im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error(/hei[cf]/i.test(dosya.type + dosya.name) ? 'HEIC biçimi bu tarayıcıda açılamıyor. Telefonda fotoğrafı JPEG olarak paylaşın ya da ekran görüntüsünü seçin.' : 'Bu dosya açılamadı. JPEG, PNG ya da WEBP fotoğraf seçin.')); };
    im.src = u;
  });
}

/** Birden çok fotoğraf seçtirir, her birini sırayla ayarlatır → data: URL dizisi (vazgeçilenler atlanır). en: en fazla kaç tane */
export function fotolarSec(o = {}, en = 30) {
  return new Promise((ok) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true;
    i.onchange = async () => {
      const F = [...(i.files || [])], L = [];
      if (F.length > en) bildir(`En fazla ${en} fotoğraf daha ekleyebilirsiniz; ilk ${en} tanesi alındı.`, { sure: 6000 });
      const S = F.slice(0, en);
      for (let n = 0; n < S.length; n++) {
        try { const v = await kirp(S[n], { ...o, baslik: S.length > 1 ? `${o.baslik || 'Fotoğrafı ayarla'} (${n + 1}/${S.length})` : o.baslik }); if (v) L.push(v); }
        catch (e) { bildir(e.message, { hata: true, sure: 7000 }); }
      }
      ok(L);
    };
    i.click();
  });
}
/** Fotoğraf seçtirir ve ayarlatır → data: URL (vazgeçilirse null).
 *  oran: genişlik/yükseklik (0 = fotoğrafın kendi oranı); oranlar: ['kare','dikey',…] verilirse kullanıcı seçer. */
export function fotoSec(o = {}) {
  return new Promise((ok) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async () => {
      const f = i.files?.[0]; if (!f) return ok(null);
      try { ok(await kirp(f, o)); } catch (e) { bildir(e.message, { hata: true, sure: 7000 }); ok(null); }
    };
    i.click();
  });
}

export async function kirp(dosya, { oran = 1, oranlar = null, max = 1080, tip = 'image/jpeg', kalite = 0.85, baslik = 'Fotoğrafı ayarla', ipucu = '', yuvarlak = false } = {}) {
  const im = await ac(dosya);
  const nw = im.naturalWidth, nh = im.naturalHeight;
  let rot = 0, z = 1, cx = 0, cy = 0, F = null, s0 = 1, oranK = oranlar?.[0] || null;
  if (oranK) oran = ORANLAR[oranK][0];
  return new Promise((ok) => {
    let bitti = false;
    const sonuc = (v) => { if (bitti) return; bitti = true; URL.revokeObjectURL(im.src); ok(v); };
    const c = cekmece({
      baslik: esc(baslik),
      govde: `<div class="kp">
        <div class="kp-sahne"><canvas aria-label="Fotoğraf önizlemesi"></canvas></div>
        <p class="kp-ipucu">${esc(ipucu || 'Sürükleyerek yerleştirin; yakınlaştırmak için sürgüyü kullanın ya da iki parmakla açın.')}</p>
        <div class="kp-arac">
          <button type="button" class="dg ikon-d" data-z="-1" aria-label="Uzaklaştır">${ikon('eksi')}</button>
          <input type="range" min="1" max="5" step="0.01" value="1" data-zoom aria-label="Yakınlaştırma">
          <button type="button" class="dg ikon-d" data-z="1" aria-label="Yakınlaştır">${ikon('arti')}</button>
          <button type="button" class="dg cizgili kucuk" data-don>${ikon('dondur', 'kk')}Döndür</button>
        </div>
        ${oranlar ? `<div class="kp-oran" role="group" aria-label="Oran">${oranlar.map((k) => `<button type="button" class="cip${k === oranK ? ' on' : ''}" data-oran="${k}" aria-pressed="${k === oranK}">${ORANLAR[k][1]}</button>`).join('')}</div>` : ''}
      </div>`,
      alt: '<button class="dg sade" type="button" data-kapat>Vazgeç</button><button class="dg ana" type="button" data-tamam>Kullan</button>',
      onKapat: () => sonuc(null),
    });
    const sahne = c.el.querySelector('.kp-sahne'), cv = sahne.querySelector('canvas'), ctx = cv.getContext('2d'), sur = c.el.querySelector('[data-zoom]');
    const dondu = () => rot % 2 === 1, iw = () => (dondu() ? nh : nw), ih = () => (dondu() ? nw : nh);
    let W = 0, H = 0;
    const yerlestir = (sifirla) => {
      const r = sahne.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = Math.max(200, r.width); H = Math.max(200, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const a = oran || iw() / ih(), pay = 18;
      let fw = W - pay * 2, fh = fw / a;
      if (fh > H - pay * 2) { fh = H - pay * 2; fw = fh * a; }
      const eskiF = F; F = { x: (W - fw) / 2, y: (H - fh) / 2, w: fw, h: fh };
      s0 = Math.max(F.w / iw(), F.h / ih());
      if (sifirla || !eskiF) { cx = W / 2; cy = H / 2; } else { cx = F.x + ((cx - eskiF.x) / eskiF.w) * F.w; cy = F.y + ((cy - eskiF.y) / eskiF.h) * F.h; }
      sinirla(); ciz();
    };
    const olcek = () => s0 * z;
    const sinirla = () => {
      const s = olcek(), yw = (iw() * s) / 2, yh = (ih() * s) / 2;
      cx = Math.min(F.x + yw, Math.max(F.x + F.w - yw, cx));
      cy = Math.min(F.y + yh, Math.max(F.y + F.h - yh, cy));
    };
    const ciz = () => {
      const s = olcek();
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((rot * Math.PI) / 2); ctx.drawImage(im, (-nw * s) / 2, (-nh * s) / 2, nw * s, nh * s); ctx.restore();
      // çerçeve dışını karart
      ctx.save(); ctx.fillStyle = 'rgba(10,10,12,.66)'; ctx.beginPath(); ctx.rect(0, 0, W, H);
      if (yuvarlak) { ctx.moveTo(F.x + F.w, F.y + F.h / 2); ctx.ellipse(F.x + F.w / 2, F.y + F.h / 2, F.w / 2, F.h / 2, 0, 0, Math.PI * 2); } else ctx.rect(F.x, F.y, F.w, F.h);
      ctx.fill('evenodd'); ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
      if (yuvarlak) { ctx.beginPath(); ctx.ellipse(F.x + F.w / 2, F.y + F.h / 2, F.w / 2 - 0.75, F.h / 2 - 0.75, 0, 0, Math.PI * 2); ctx.stroke(); } else ctx.strokeRect(F.x + 0.75, F.y + 0.75, F.w - 1.5, F.h - 1.5);
      if (surukle.size) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (const k of [1, 2]) { ctx.moveTo(F.x + (F.w * k) / 3, F.y); ctx.lineTo(F.x + (F.w * k) / 3, F.y + F.h); ctx.moveTo(F.x, F.y + (F.h * k) / 3); ctx.lineTo(F.x + F.w, F.y + (F.h * k) / 3); } ctx.stroke(); }
      ctx.restore();
    };
    /** Yakınlaştırmayı (px,py) noktası sabit kalacak şekilde değiştirir */
    const yakinlas = (yeni, px = F.x + F.w / 2, py = F.y + F.h / 2) => {
      yeni = Math.max(1, Math.min(5, yeni)); const k = yeni / z;
      cx = px + (cx - px) * k; cy = py + (cy - py) * k; z = yeni; sur.value = z; sinirla(); ciz();
    };
    // sürükleme ve iki parmakla yakınlaştırma
    const surukle = new Map(); let onceki = null;
    const nokta = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); surukle.set(e.pointerId, nokta(e)); onceki = null; ciz(); });
    cv.addEventListener('pointermove', (e) => {
      if (!surukle.has(e.pointerId)) return;
      const p = nokta(e), eski = surukle.get(e.pointerId); surukle.set(e.pointerId, p);
      if (surukle.size === 1) { cx += p.x - eski.x; cy += p.y - eski.y; sinirla(); ciz(); return; }
      const [a, b] = [...surukle.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (onceki) { cx += m.x - onceki.m.x; cy += m.y - onceki.m.y; yakinlas(z * (d / onceki.d), m.x, m.y); }
      onceki = { d, m };
    });
    const birak = (e) => { surukle.delete(e.pointerId); onceki = null; ciz(); };
    cv.addEventListener('pointerup', birak); cv.addEventListener('pointercancel', birak);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = nokta(e); yakinlas(z * Math.exp(-e.deltaY / 400), p.x, p.y); }, { passive: false });
    sur.oninput = () => yakinlas(+sur.value);
    c.el.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => yakinlas(z + +b.dataset.z * 0.35)));
    c.el.querySelector('[data-don]').onclick = () => { rot = (rot + 1) % 4; z = 1; sur.value = 1; yerlestir(true); };
    c.el.querySelectorAll('[data-oran]').forEach((b) => (b.onclick = () => {
      oranK = b.dataset.oran; oran = ORANLAR[oranK][0];
      c.el.querySelectorAll('[data-oran]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      z = 1; sur.value = 1; yerlestir(true);
    }));
    c.el.addEventListener('keydown', (e) => {
      const adim = e.shiftKey ? 20 : 6, k = { ArrowLeft: [adim, 0], ArrowRight: [-adim, 0], ArrowUp: [0, adim], ArrowDown: [0, -adim] }[e.key];
      if (k && e.target === cv) { e.preventDefault(); cx += k[0]; cy += k[1]; sinirla(); ciz(); }
    });
    cv.tabIndex = 0;
    c.el.querySelector('[data-tamam]').onclick = () => {
      // çerçevenin kaynakta kapladığı piksel kadar, en fazla max (büyütme yok)
      const s = olcek(), kw = F.w / s, kh = F.h / s, k = Math.min(1, max / Math.max(kw, kh));
      const ow = Math.max(1, Math.round(kw * k)), oh = Math.max(1, Math.round(kh * k)), q = ow / F.w;
      const o2 = document.createElement('canvas'); o2.width = ow; o2.height = oh;
      const x = o2.getContext('2d'); x.imageSmoothingQuality = 'high';
      if (tip === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, ow, oh); }
      x.translate((cx - F.x) * q, (cy - F.y) * q); x.rotate((rot * Math.PI) / 2); x.drawImage(im, (-nw * s * q) / 2, (-nh * s * q) / 2, nw * s * q, nh * s * q);
      let v = o2.toDataURL(tip, kalite);
      if (v.length > 1.3e6 && tip !== 'image/jpeg') v = o2.toDataURL('image/jpeg', 0.85);
      if (v.length > 1.3e6) v = o2.toDataURL('image/jpeg', 0.7);
      sonuc(v); c.kapat();
    };
    requestAnimationFrame(() => yerlestir(true));
    const boyut = () => { if (!c.el.isConnected) return removeEventListener('resize', boyut); yerlestir(false); };
    addEventListener('resize', boyut);
  });
}
