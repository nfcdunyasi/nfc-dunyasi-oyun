// Hesabı Kim Öder? — 3D restoran masası (NFC Dünyası Oyun)
// Herkes yuvarlak masada oturur; masanın ortasındaki çarkın oku döner, mandal çivilere çarptıkça tıkırdar.
// Ok kimin dilimine durursa hesap kılıfı ona uçar, üstüne para yağar. Eleme modunda ok kimi gösterirse o kurtulur,
// en son kalan öder. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D çark gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-f';
import * as sfx from '../sfx.js?v=2026-11-21-f';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, mix3, rgbA, sst } = K;
const { M, C, hexRGB, shade, clamp, lerp, damp, esc, pcol, vibrate, ONE3, makeTexture, updateTexture, drawMesh, limb, KIT, shadowCast } = E;

const STYLE = `
#ky.hk .hk-res{width:min(400px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:12px 16px 12px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1);pointer-events:auto}
#ky.hk .hk-res.me{background:#ffe1d6}
#ky.hk .hk-res .lb{font-size:13px;font-weight:800;opacity:.65;letter-spacing:.04em;text-transform:uppercase}
#ky.hk .hk-res .nm{display:inline-flex;align-items:center;gap:8px;font-size:34px;font-weight:900;line-height:1.05;margin-top:2px;max-width:100%}
#ky.hk .hk-res .nm i{width:18px;height:18px;border-radius:99px;border:3px solid var(--ink);flex:none}
#ky.hk .hk-res .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky.hk .hk-res .q{margin-top:6px;font-size:16px;font-weight:700;line-height:1.3}
#ky.hk .hk-res .st{margin-top:6px;font-size:13px;font-weight:700;opacity:.7}
#ky.hk .hk-res .hs{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;justify-content:center}
#ky.hk .hk-res .hs span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;font-size:12px;font-weight:700;background:#fff}
#ky.hk .hk-res .hs span i{width:10px;height:10px;border-radius:99px;border:2px solid var(--ink)}
#ky.hk .hk-hint{font-size:13px;font-weight:700;color:#fff;background:rgba(12,10,26,.55);border-radius:12px;padding:5px 11px;text-align:center;max-width:92%}
@media (orientation:landscape) and (max-height:520px){#ky.hk .hk-res{width:min(360px,46vw);padding:8px 12px}#ky.hk .hk-res .nm{font-size:26px}#ky.hk .hk-res .q{font-size:14px}#ky.hk .hk-res .hs{display:none}#ky.hk .hk-hint{display:none}#ky.hk .mz-bar{flex-direction:column;align-items:flex-end}}
@media (max-height:700px) and (orientation:portrait){#ky.hk .hk-res .hs{display:none}#ky.hk .hk-res .nm{font-size:28px}}
`;

/* ============================ müzik ve sesler ============================ */
// Bekleme: Do majör lounge swing (Dm7 – G7 – Cmaj7 – A7): yürüyen kontrbas, fırçalı trampet, ride zili, vibrafon.
// Dönüş: gerilim (timpani nabzı, titreyen yaylılar, hızlanan tıkırtı). Sonuç sonrası: yumuşak, ağır swing.
class HesapSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.1; }
  tempo() { return this.mode === 'race' ? 92 + 46 * (this.int || 0) : this.mode === 'idle' ? 116 : 98; }
  swing() { return this.mode === 'race' ? 0 : 0.17; }
  beat(t, s, bar, spb, st = spb / 4) {
    const CH = [[50, [65, 69, 72, 76]], [43, [65, 69, 71, 74]], [48, [64, 67, 71, 74]], [45, [64, 67, 70, 73]]];
    const [root, ch] = CH[bar % 4];
    const I = this.int || 0;
    if (this.mode === 'race') {
      const dim = [[45, [57, 60, 63, 66]], [46, [58, 61, 64, 67]]][bar % 2];
      if (s % 4 === 0) this.iTaiko(t, 0.12 + 0.18 * I, 58 + (bar % 2) * 4);
      if (s % 2 === 0) this.iStr(t, dim[1].slice(0, 2 + (I > 0.5 ? 2 : 0)).map((m) => m + 12), st * 1.6, 0.012 + 0.012 * I, 0.01, 2400, 0.12);
      if (I > 0.35) this.iHat(t, 0.012 + 0.03 * I);
      if (s === 0) this.iBass(t, dim[0] - 12, spb * 3.8, 0.12, 'sub');
      return;
    }
    const soft = this.mode !== 'idle';
    // yürüyen bas (çeyrekler): kök, üçlü, beşli, bir sonraki köke yarım ses yaklaşma
    if (s % 4 === 0) {
      const nx = CH[(bar + 1) % 4][0];
      const walk = [root, root + 4 - (bar % 4 === 0 || bar % 4 === 1 ? 1 : 0), root + 7, nx + (nx > root + 7 ? -1 : 1)][s >> 2];
      this.iBass(t, walk - 12, spb * 0.92, soft ? 0.1 : 0.13, 'up');
    }
    // ride: ding, ding-a ding (açık zil, kısa) + fırçalı trampet
    if (s === 0 || s === 4 || s === 8 || s === 12) this.iHat(t, soft ? 0.018 : 0.026, true);
    if (s === 7 || s === 15) this.iHat(t, soft ? 0.012 : 0.018, false);
    if (s === 4 || s === 12) this.iBrush(t, soft ? 0.045 : 0.06, 0.2);
    if (s % 2 === 0) this.iShk(t, soft ? 0.006 : 0.009);
    if (!soft && (s === 6 || s === 14) && bar % 2 === 1) this.iRim(t, 0.035);
    // elektrikli piyano: swing'de "ve" vuruşlarında akor (Charleston ritmi)
    if (s === 0 || s === 6) ch.forEach((m, i) => this.iEP(t + i * 0.006, m - 12, (soft ? 0.014 : 0.018) * (i ? 0.75 : 1), spb * (s ? 1.6 : 0.9), 0.2));
    // vibrafon akorları: senkoplu
    if (s === 10 && bar % 2 === 0) ch.forEach((m, i) => this.iVibe(t + i * 0.008, m, (soft ? 0.014 : 0.018) * (i ? 0.8 : 1), spb * 1.4, 0.3));
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, soft ? 0.01 : 0.008, soft ? 900 : 1100);
    // kısa vibrafon ezgisi (her 4 ölçüde bir)
    if (!soft && bar % 4 === 3) {
      const mel = { 0: 79, 3: 77, 6: 76, 8: 74, 11: 72 };
      if (mel[s] !== undefined) this.iVibe(t, mel[s], 0.03, spb * 0.9, 0.35);
    }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    if (name === 'whirr') { // çok hızlı dönerken mandalın vızıltısı (a: hız 0..1)
      this.noise(t, 0.09, 0.03 + 0.07 * a, { type: 'bandpass', freq: 1800 + 1600 * a, q: 2.2, attack: 0.01 });
      return;
    }
    super._fx(name, a);
  }
}

/* ============================ modeller ============================ */
// Çark tablası: ahşap kaide, pirinç kenar halkası (üst yüz doku: dilimler ayrı çizilir)
const BOARD_H = 0.07;
function boardBase(mb, RB) {
  const W = C('#3b2416', -0.55), Wl = C('#5a3a22', -0.55);
  mb.lathe(0, 0, 0, [[0, 0], [RB + 0.05, 0], [RB + 0.085, 0.015], [RB + 0.09, 0.045], [RB + 0.07, BOARD_H], [RB + 0.02, BOARD_H], [0, BOARD_H - 0.002]], 72, (i) => (i >= 3 ? Wl : W));
  mb.torusN(0, BOARD_H + 0.004, 0, RB + 0.028, 0.02, 0.016, 72, 6, C('#d6a64a', -0.92));
  // dört ayak (keçe) — masaya otursun
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; mb.lathe(Math.cos(a) * RB * 0.7, -0.012, Math.sin(a) * RB * 0.7, [[0, 0], [0.07, 0], [0.07, 0.014], [0, 0.014]], 10, C('#2a2320')); }
}
// Üst yüz: doku koordinatlı disk (merkez 0,5 / kenar = yarıçap)
function boardTop(tb, RB) {
  const N = 96, y = BOARD_H + 0.001;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const p0 = [Math.cos(a0) * RB, y, Math.sin(a0) * RB], p1 = [Math.cos(a1) * RB, y, Math.sin(a1) * RB];
    tb.tw([0, y, 0], p1, p0, null, [0, y - 1, 0], [0.5, 0.5, 0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1), 0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)]);
  }
}
// Çiviler (dilim sınırlarında büyük, aralarda küçük): pirinç, yuvarlak başlı
function pegsModel(mb, RB, n, sub) {
  const B = C('#e0b45a', -0.92), Bd = C('#b8862f', -0.9);
  const rp = RB - 0.075;
  for (let i = 0; i < n * sub; i++) {
    const u = -0.5 + i / sub, a = (u / n) * TAU;
    const big = i % sub === 0;
    const x = Math.cos(a) * rp, z = Math.sin(a) * rp, r = big ? 0.02 : 0.013, h = big ? 0.075 : 0.055;
    mb.lathe(x, BOARD_H, z, [[0, 0], [r * 1.5, 0], [r, 0.006], [r, h - r], [r * 1.2, h - r * 0.6], [r * 0.9, h], [0, h + r * 0.2]], 10, (k) => (k >= 4 ? B : Bd));
  }
}
// Ok: koyu lacivert lake gövde (her renk dilimde seçilsin), altın kenar ve uç, krem tüyler, pirinç göbek.
// Mandal ayrı (flapModel). Yerel +X'e bakar.
function arrowModel(mb, RB) {
  const D = C('#1c1633', -0.92), Dl = C('#2e2752', -0.9), G = C('#f0c75e', -0.94), Gd = C('#c99a3e', -0.92), Cr = C('#fbf3e2', -0.5), Rd = C('#d83a2a', -0.9);
  const L = RB * 0.9;
  const y = BOARD_H + 0.062;
  // altın alt kontur (gövdeden biraz geniş) + koyu gövde
  mb.rbox(-RB * 0.44, y - 0.024, -0.05, L * 0.7, y + 0.012, 0.05, 0.02, Gd, 2);
  mb.rbox(-RB * 0.42, y - 0.018, -0.038, L * 0.7, y + 0.024, 0.038, 0.02, D, 2);
  mb.rbox(-RB * 0.38, y + 0.023, -0.008, L * 0.66, y + 0.028, 0.008, 0.003, G, 1);
  // elmas uç: altın kenarlı, ortası kırmızı lake
  mb.superS(L * 0.8, y - 0.004, 0, L * 0.21, 0.03, 0.17, 0.55, 2.1, Gd, 26, 8);
  mb.superS(L * 0.8, y + 0.006, 0, L * 0.18, 0.026, 0.135, 0.55, 2.1, null, 26, 8, (nx, ny, nz, px) => (px > 0.62 ? G : ny > 0.3 ? Rd : Dl));
  // tüyler
  for (const sd of [-1, 1]) {
    for (const [x, w] of [[-RB * 0.36, 0.12], [-RB * 0.24, 0.1]]) {
      mb.push().T(x, y + 0.004, sd * 0.07, sd * 0.55);
      mb.superS(0, 0, 0, w, 0.01, 0.05, 0.6, 1.6, Cr, 14, 4);
      mb.pop();
    }
  }
  mb.sphereS(-RB * 0.45, y, 0, 0.045, 0.04, 0.045, G, 12, 8);
  // göbek: pirinç kapak + alt pul
  mb.lathe(0, BOARD_H, 0, [[0, 0], [0.18, 0], [0.185, 0.01], [0.135, 0.022], [0.125, 0.11], [0.105, 0.122], [0, 0.122]], 40, G);
}
function flapModel(mb) {
  // deri mandal: göbekten değil, ok ucundan dışa ve aşağı sarkan dil
  mb.rbox(0, -0.05, -0.006, 0.1, 0.006, 0.006, 0.004, C('#5a3018', -0.35), 1);
}
// göbek üstündeki logo diski (doku)
function hubLogo(tb) {
  const N = 40, y = BOARD_H + 0.123, r = 0.102;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    tb.tw([0, y, 0], [Math.cos(a1) * r, y, Math.sin(a1) * r], [Math.cos(a0) * r, y, Math.sin(a0) * r], null, [0, y - 1, 0], [0.5, 0.5, 0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1), 0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)]);
  }
}
// Dilim parlaması (katkılı): bir dilim genişliğinde halka parçası
function wedgeModel(mb, RB, n) {
  const step = TAU / n, N = 18, r0 = RB * 0.17, r1 = RB * 0.9, y = BOARD_H + 0.004;
  for (let i = 0; i < N; i++) {
    const a0 = -step / 2 + (step * i) / N, a1 = -step / 2 + (step * (i + 1)) / N;
    const P = (r, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const cIn = [1, 1, 1, 0.55], cOut = [1, 1, 1, 0.95];
    mb.d.push(...P(r0, a0), ...cIn, ...P(r1, a0), ...cOut, ...P(r1, a1), ...cOut, ...P(r0, a0), ...cIn, ...P(r1, a1), ...cOut, ...P(r0, a1), ...cIn);
  }
}
// Hesap kılıfı: siyah deri, dikiş çizgisi, altın amblem; kapak ayrı (menteşe arka kenarda, x ekseni boyunca)
const FW = 0.34, FD = 0.22;
function folderBase(mb) {
  const L = C('#221815', -0.55), S = C('#8a6a4a', -0.2);
  mb.rbox(-FW / 2, 0, -FD / 2, FW / 2, 0.016, FD / 2, 0.008, L, 2);
  // fiş (kılıfın içinde, açılınca görünür)
  mb.rbox(-FW * 0.38, 0.016, -FD * 0.36, FW * 0.38, 0.02, FD * 0.42, 0.002, C('#fbf8f1', -0.1), 1);
  for (let k = 0; k < 7; k++) {
    const z = -FD * 0.28 + k * FD * 0.085, w = k === 6 ? FW * 0.3 : FW * (0.22 + 0.12 * hs(k, 3));
    mb.rbox(-FW * 0.3, 0.0205, z, -FW * 0.3 + w, 0.0215, z + 0.008, 0.001, k === 6 ? C('#c8261c') : C('#4a4a50'), 1);
    if (k < 6) mb.rbox(FW * 0.18, 0.0205, z, FW * 0.3, 0.0215, z + 0.008, 0.001, C('#4a4a50'), 1);
  }
  void S;
}
function folderLid(mb) {
  // menteşe orijinde (arka kenar), kapak +z yönünde uzanır
  const L = C('#2a1d18', -0.6), S = C('#b89466', -0.3), G = C('#e8c26a', -0.92);
  mb.rbox(-FW / 2, 0, 0, FW / 2, 0.012, FD, 0.006, L, 2);
  // dikiş
  for (const zz of [0.018, FD - 0.018]) mb.rbox(-FW / 2 + 0.018, 0.0121, zz - 0.0015, FW / 2 - 0.018, 0.0128, zz + 0.0015, 0.001, S, 1);
  for (const xx of [-FW / 2 + 0.018, FW / 2 - 0.018]) mb.rbox(xx - 0.0015, 0.0121, 0.018, xx + 0.0015, 0.0128, FD - 0.018, 0.001, S, 1);
  // altın amblem (₺ biçimli: dikey çizgi + iki eğik)
  mb.rbox(-0.004, 0.0122, FD * 0.36, 0.004, 0.0135, FD * 0.64, 0.002, G, 1);
  for (const zz of [0.47, 0.55]) { mb.push().T(0.004, 0.0128, FD * zz, -0.35); mb.rbox(-0.026, -0.0006, -0.003, 0.026, 0.0006, 0.003, 0.001, G, 1); mb.pop(); }
}
// Banknot (ince, ortası açık oval): renk paleti TL'ye benzer
const NOTE_COLS = ['#d98cb3', '#7aa7d6', '#e8a85b', '#7bb88a'];
function noteModel(mb, hex) {
  const c = hexRGB(hex);
  const base = rgbA(c, -0.1), dark = rgbA(mix3(c, [0, 0, 0], 0.3), -0.1), lite = rgbA(mix3(c, [1, 1, 1], 0.6), -0.1);
  mb.rbox(-0.085, -0.0015, -0.042, 0.085, 0.0015, 0.042, 0.001, base, 1);
  mb.superS(0.025, 0.0016, 0, 0.028, 0.0008, 0.026, 1, 1, lite, 12, 3);
  mb.rbox(-0.07, 0.0016, -0.03, -0.04, 0.0024, 0.03, 0.001, dark, 1);
}
// Kendi koltuğumun önündeki zemin halkası (katkılı değil: renkli işaret)
function ringModel(mb) {
  mb.torusN(0, 0, 0, 0.58, 0.035, 0.012, 40, 5, C('#ffffff', 1));
}

/* ============================ çark dokusu ============================ */
function drawWheel(cv, seats, safe, off, hot, camYaw = 0) {
  const g = cv.getContext('2d');
  const S = cv.width, c = S / 2, R = S / 2;
  const n = Math.max(1, seats.length), step = TAU / n;
  g.clearRect(0, 0, S, S);
  // dış ahşap halka
  g.fillStyle = '#4a2c18';
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  const Rin = R * 0.905, Rhub = R * 0.17;
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  for (let k = 0; k < n; k++) {
    const a0 = (k - 0.5) * step, a1 = (k + 0.5) * step;
    const isSafe = safe.includes(k);
    const base = isSafe ? [0.52, 0.51, 0.5] : hexRGB(pcol(seats[k].c));
    const lite = mix3(base, [1, 1, 1], isSafe ? 0.15 : 0.32), dark = mix3(base, [0, 0, 0], 0.28);
    const gr = g.createRadialGradient(c, c, Rhub, c, c, Rin);
    const css = (v) => `rgb(${Math.round(v[0] * 255)},${Math.round(v[1] * 255)},${Math.round(v[2] * 255)})`;
    gr.addColorStop(0, css(lite)); gr.addColorStop(0.55, css(base)); gr.addColorStop(1, css(dark));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(c, c); g.arc(c, c, Rin, a0, a1); g.closePath(); g.fill();
    // ince parlak iç kenar
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 10;
    g.beginPath(); g.arc(c, c, Rin - 8, a0 + 0.01, a1 - 0.01); g.stroke();
  }
  // ayırıcı çizgiler
  g.strokeStyle = '#fff6e6'; g.lineWidth = Math.max(4, 9 - n * 0.3);
  for (let k = 0; k < n; k++) { const a = (k - 0.5) * step; g.beginPath(); g.moveTo(c + Math.cos(a) * Rhub, c + Math.sin(a) * Rhub); g.lineTo(c + Math.cos(a) * Rin, c + Math.sin(a) * Rin); g.stroke(); }
  // dış kenar çizgileri ve çivi yuvaları
  g.strokeStyle = '#e8c26a'; g.lineWidth = 6;
  g.beginPath(); g.arc(c, c, Rin, 0, TAU); g.stroke();
  // isimler: yarıçap boyunca, ekranda baş aşağı görünmesin diye sol yarıda ters
  for (let k = 0; k < n; k++) {
    const a = k * step, w = a + off;
    const isSafe = safe.includes(k);
    const col = hexRGB(pcol(seats[k].c));
    const light = !isSafe && 0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2] > 0.62;
    const name = String(seats[k].n || '').slice(0, 14);
    g.save();
    g.translate(c, c);
    g.rotate(a);
    const flip = Math.cos(w + camYaw) < 0;
    if (flip) g.rotate(Math.PI);
    const r0 = Rhub + (Rin - Rhub) * 0.08, r1 = Rin - (Rin - Rhub) * 0.06, mid = (r0 + r1) / 2;
    const maxW = r1 - r0;
    const arcW = mid * step * 0.78;
    let fs = Math.min(110, arcW * 0.62);
    g.font = `900 ${fs}px ${F}`;
    while (g.measureText(name).width > maxW && fs > 22) { fs -= 3; g.font = `900 ${fs}px ${F}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const x = flip ? -mid : mid;
    g.lineJoin = 'round';
    if (isSafe) {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillText(name, x, 0);
    } else {
      g.lineWidth = Math.max(5, fs * 0.16);
      g.strokeStyle = light ? 'rgba(255,255,255,.65)' : 'rgba(28,22,51,.75)';
      g.strokeText(name, x, 0);
      g.fillStyle = light ? '#1c1633' : '#ffffff';
      g.fillText(name, x, 0);
    }
    if (isSafe) {
      // kurtuldu damgası
      g.save();
      g.translate(flip ? -(r1 - 40) : r1 - 40, 0);
      g.rotate(flip ? Math.PI / 2 : -Math.PI / 2);
      g.fillStyle = '#2fbf5a';
      g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-15, 2); g.lineTo(-4, 13); g.lineTo(17, -12); g.stroke();
      g.restore();
    }
    g.restore();
    if (hot === k) {
      g.strokeStyle = '#fff'; g.lineWidth = 12;
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, Rin - 6, (k - 0.5) * step, (k + 0.5) * step); g.closePath(); g.stroke();
    }
  }
  // göbek çevresi
  const hg = g.createRadialGradient(c, c, 0, c, c, Rhub);
  hg.addColorStop(0, '#5a3a22'); hg.addColorStop(1, '#2e1c10');
  g.fillStyle = hg; g.beginPath(); g.arc(c, c, Rhub, 0, TAU); g.fill();
  g.strokeStyle = '#e8c26a'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, Rhub, 0, TAU); g.stroke();
}

/* ============================ oyun ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const easeSpin = (p) => 1 - Math.pow(1 - p, 3);

class HesapGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'hesap', cls: 'hk', title: 'Hesabı Kim Öder?', sub: 'Çark döner, hesap birine kalır', emoji: '💸', css: STYLE, snd: new HesapSnd(), amb: 'diner', ambVol: 0.7, botPx: 168, botPxL: 84, cloth: '#2c5646', trim: '#d6a64a' });
    this.u = 0;                // okun konumu (dilim birimi)
    this.uv = 0;               // hız (dilim/sn)
    this.spinId = 0;
    this.pegLast = null;
    this.flap = { a: 0, v: 0 };
    this.folder = null;        // { k, t, x0.., state }
    this.notes = [];
    this.lastTick = 0;
    this.hot = -1;
    this.wedgeA = 0;
    this.bindSwipe();
    this.el.posS.textContent = '';
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.flap = this.mk(flapModel);
    W.hubLogo = this.mk(hubLogo, 'tex');
    W.note = NOTE_COLS.map((h) => this.mk((mb) => noteModel(mb, h)));
    W.fBase = this.mk(folderBase);
    W.fLid = this.mk(folderLid);
    W.ring = this.mk(ringModel);
    this.wheelCv = document.createElement('canvas');
    this.wheelCv.width = 1024; this.wheelCv.height = 1024;
    this.wheelTex = makeTexture(this.X, this.wheelCv);
    this.wheelKey = '';
    this.boardKey = '';
  }
  freeTex() { if (this.wheelTex && this.X) this.X.gl.deleteTexture(this.wheelTex); this.wheelTex = null; }
  get RB() { return clamp(this.R * Math.min(1, this.kz) * 0.56, 0.95, 1.55); }
  get sub() { const n = Math.max(1, this.seats.length); return Math.max(1, Math.round(26 / n)); }
  ensureBoard() {
    if (!this.W) return;
    const n = Math.max(1, this.seats.length);
    const key = `${this.RB.toFixed(3)}|${n}`;
    if (key === this.boardKey) return;
    this.boardKey = key;
    ['bBase', 'bTop', 'pegs', 'arrow', 'wedge'].forEach((k) => { if (this.W[k]) E.freeMesh(this.X, this.W[k]); });
    const RB = this.RB;
    this.W.bBase = this.mk((mb) => boardBase(mb, RB));
    this.W.bTop = this.mk((mb) => boardTop(mb, RB), 'tex');
    this.W.pegs = this.mk((mb) => pegsModel(mb, RB, n, this.sub));
    this.W.arrow = this.mk((mb) => arrowModel(mb, RB));
    this.W.wedge = this.mk((mb) => wedgeModel(mb, RB, n), 'un');
    this.wheelKey = '';
  }
  // ekrana göre dilim açısı kayması: k. dilimin dünya açısı = k·adım + off
  get off() { const n = Math.max(1, this.seats.length); return this.base - (this.me >= 0 ? this.me : 0) * (TAU / n); }
  ensureWheel() {
    if (!this.wheelTex) return;
    const v = this.view;
    const yq = Math.round((this.yawGoal || 0) / (Math.PI / 4));
    const key = `${this.seats.map((p) => p.n + p.c).join(',')}|${(v?.safe || []).join(',')}|${this.me}|${this.hot}|${yq}`;
    if (key === this.wheelKey) return;
    this.wheelKey = key;
    drawWheel(this.wheelCv, this.seats, v?.safe || [], this.off, this.hot, this.yawGoal || 0);
    updateTexture(this.X, this.wheelTex, this.wheelCv);
  }

  /* ---------- girdi: çarkı parmakla çevirme ---------- */
  bindSwipe() {
    const w = this.el.wrap;
    let st = null;
    w.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, .card, .hk-res, .em-pal')) return;
      st = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    w.addEventListener('pointerup', (e) => {
      if (!st) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y, dt = performance.now() - st.t;
      const s0 = st;
      st = null;
      const d = Math.hypot(dx, dy);
      if (d < 55 || dt > 900) return;
      if (!this.canSpin()) return;
      const c = this.project(0, TABLE_Y, 0);
      const r = c ? [s0.x - c[0], s0.y - c[1]] : [1, 0];
      const cross = r[0] * dy - r[1] * dx;
      const pow = clamp((d / Math.max(80, dt)) / 2.2, 0, 1);
      this.spin(cross >= 0 ? 1 : -1, pow);
    });
    w.addEventListener('pointercancel', () => { st = null; });
  }
  canSpin() {
    const v = this.view;
    if (!v) return false;
    if (v.phase === 'spinning') return false;
    if (v.phase !== 'safe' && (v.seats || []).filter((p) => p.on).length < 2) return false;
    return true;
  }
  spin(dir = 0, pow = 0.5, mode = null) {
    if (!this.canSpin()) return;
    const now = performance.now();
    if (now - (this.lastSpinAt || 0) < 900) return;
    this.lastSpinAt = now;
    vibrate(18);
    try { this.snd.fx('ratchet'); } catch { /* yok */ }
    const p = { dir, pow };
    if (mode) p.m = mode;
    this.ctx.send('spin', p);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.hk !== '1') { root.dataset.hk = '1'; root.innerHTML = '<p class="py-16 text-center">💸</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    this.el.posS.textContent = v.mode === 'eleme' ? ' eleme' : '';
    // yeni dönüş
    if (v.spin && v.spin.id !== this.spinId) {
      this.spinId = v.spin.id;
      this.spinS = v.spin;
      this.onSpinStart(v.spin);
    }
    if (!prev || prev.phase !== v.phase) this.onPhase(prev, v);
    this.bar();
  }
  onSpinStart(sp) {
    const now = this.ctx.serverNow();
    this.folderOut();
    this.hot = -1;
    if (now - sp.at < sp.ms - 300) {
      try { this.snd.fx('whoosh'); } catch { /* yok */ }
      try { this.snd.music('race'); } catch { /* yok */ }
      this.drumAt = sp.kind === 'safe' ? 0 : sp.at + sp.ms - 2200;
      this.drummed = false;
    } else this.drummed = true;
    this.pegLast = null;
  }
  onPhase(prev, v) {
    const me = v.me;
    if (v.phase === 'idle') { try { this.snd.music('idle'); } catch { /* yok */ } }
    if (v.phase === 'result' && v.res) {
      const late = !prev || prev.phase !== 'spinning';
      this.hot = v.res.k;
      this.resAt = this.time;
      const mine = v.res.k === me;
      if (!late) {
        try { this.snd.fx('cymbal'); } catch { /* yok */ }
        setTimeout(() => { if (this.dead) return; try { this.snd.fx(mine ? 'trombone' : 'tada'); } catch { /* yok */ } if (!mine) setTimeout(() => { try { if (!this.dead) this.snd.fx('laugh'); } catch { /* yok */ } }, 700); }, 260);
        vibrate(mine ? [120, 60, 120, 60, 300] : 60);
        if (mine) this.flash('rgba(255,60,40,.6)', true); else this.flash('rgba(255,215,90,.5)');
      }
      this.folderIn(v.res.k, late);
      try { this.snd.music('calm'); } catch { /* yok */ }
      this.cam.shake = late ? 0 : 0.5;
    }
    if (v.phase === 'safe' && v.res) {
      this.hot = v.res.k;
      this.resAt = this.time;
      const mine = v.res.k === me;
      if (prev && prev.phase === 'spinning') {
        try { this.snd.fx(mine ? 'tada' : 'relief'); } catch { /* yok */ }
        vibrate(mine ? [40, 40, 80] : 20);
        if (mine) this.flash('rgba(70,220,120,.55)');
        const a = this.avatarAt(v.res.k);
        if (a) this.burst(a.headW[0], a.headW[1] + 0.2, a.headW[2], 26, [[0.3, 1, 0.5], [1, 1, 0.6], [1, 1, 1]], 2.4, 0.05, true, 1.1, 3);
      }
    }
    if (v.phase === 'spinning') this.hot = -1;
  }

  /* ---------- hesap kılıfı ve para yağmuru ---------- */
  placePos(k, q = 0) {
    const a = this.seatAngle(k);
    const r = this.placeR(a) - 0.05 - q;
    return [Math.cos(a) * r, TABLE_Y + 0.004, Math.sin(a) * r, a];
  }
  folderIn(k, late) {
    const [x0, y, z0, a] = this.placePos(k, 0.04);
    // tabağın sağ yanına (oturanın sağı = koltuk uzayında -X)
    const sx = Math.sin(a) * 0.3, sz = -Math.cos(a) * 0.3;
    const x = x0 + sx, z = z0 + sz;
    const fromA = a + Math.PI;
    this.folder = { k, t: late ? 9 : 0, x0: Math.cos(fromA) * 0.4, z0: Math.sin(fromA) * 0.4, x1: x, z1: z, y, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) + 0.35, landed: !!late, open: late ? 1 : 0 };
  }
  folderOut() { if (this.folder) this.folder.out = this.time; }
  stepFolder(dt) {
    const f = this.folder;
    if (!f) return;
    if (f.out) {
      if (this.time - f.out > 0.6) this.folder = null;
      return;
    }
    f.t += dt;
    const T = 0.95;
    const p = clamp(f.t / T, 0, 1);
    if (!f.landed && p >= 1) {
      f.landed = true;
      f.landT = f.t;
      try { this.snd.fx('thud'); } catch { /* yok */ }
      setTimeout(() => { try { if (!this.dead) this.snd.fx('kaching'); } catch { /* yok */ } }, 160);
      this.cam.shake = Math.max(this.cam.shake, 0.25);
      this.moneyBurst(f.x1, f.y + 0.05, f.z1);
    }
    if (f.landed) f.open = damp(f.open, 1, 4.5, dt);
  }
  folderMat(m) {
    const f = this.folder;
    const T = 0.95, p = clamp(f.t / T, 0, 1), e = p * p * (3 - 2 * p);
    const x = lerp(f.x0, f.x1, e), z = lerp(f.z0, f.z1, e);
    const hop = Math.sin(Math.PI * p) * 0.9 * (1 - p * 0.2);
    let y = f.y + (f.landed ? 0 : hop + 0.25 * (1 - p));
    if (f.landed && f.landT != null) { const q = f.t - f.landT; y += Math.max(0, Math.sin(q * 18) * 0.03 * Math.exp(-q * 7)); }
    const spin = f.landed ? 0 : (1 - e) * 5;
    let sc = 1;
    if (f.out) { const q = clamp((this.time - f.out) / 0.5, 0, 1); sc = 1 - q; y += q * 0.3; }
    M.set(m, x, y, z, f.yaw + spin, f.landed ? 0 : Math.sin(p * 9) * 0.3, 0, 1.05 * sc);
    return m;
  }
  moneyBurst(x, y, z) {
    try { this.snd.fx('coins'); this.snd.fx('paper'); } catch { /* yok */ }
    const fa = this.folder ? Math.atan2(this.folder.z1, this.folder.x1) : 0;
    const tx0 = -Math.sin(fa), tz0 = Math.cos(fa);
    for (let i = 0; i < 18; i++) {
      const sd = i % 2 ? 1 : -1, sp = 0.7 + Math.random() * 1.0, back = 0.2 + Math.random() * 0.4;
      this.notes.push({ x, y: y + 0.05, z, vx: (tx0 * sd * sp + Math.cos(fa) * back) * 0.9, vy: 1.1 + Math.random() * 0.9, vz: (tz0 * sd * sp + Math.sin(fa) * back) * 0.9, rx: Math.random() * TAU, ry: Math.random() * TAU, rz: Math.random() * TAU, wr: (Math.random() - 0.5) * 9, ph: Math.random() * TAU, c: i % NOTE_COLS.length, rest: 0, life: 0 });
    }
    // payer'ın üstünden de yağsın
    const a = this.avatarAt(this.folder?.k ?? 0);
    if (a) for (let i = 0; i < 14; i++) {
      const s2 = Math.random() < 0.5 ? -1 : 1, off = 0.5 + Math.random() * 0.6;
      const tx = -Math.sin(a.ang) * s2 * off, tz = Math.cos(a.ang) * s2 * off;
      this.notes.push({ x: a.pos[0] * 0.92 + tx, y: 2.0 + Math.random() * 0.9, z: a.pos[2] * 0.92 + tz, vx: 0, vy: -0.2, vz: 0, rx: Math.random() * TAU, ry: Math.random() * TAU, rz: Math.random() * TAU, wr: (Math.random() - 0.5) * 7, ph: Math.random() * TAU, c: i % NOTE_COLS.length, rest: 0, life: 0 });
    }
    while (this.notes.length > 90) this.notes.shift();
  }
  stepNotes(dt) {
    for (const n of this.notes) {
      n.life += dt;
      if (n.rest) continue;
      // kâğıt para: hava direnci yüksek, sallanarak süzülür
      n.vy -= 3.2 * dt;
      const drag = Math.exp(-2.4 * dt);
      n.vx *= drag; n.vz *= drag;
      if (n.vy < -0.55) n.vy = lerp(n.vy, -0.55, 1 - Math.exp(-6 * dt));
      n.x += (n.vx + Math.sin(n.life * 3.1 + n.ph) * 0.35) * dt;
      n.z += (n.vz + Math.cos(n.life * 2.7 + n.ph) * 0.35) * dt;
      n.y += n.vy * dt;
      n.rx += n.wr * dt * 0.6; n.rz += n.wr * dt * 0.4; n.ry += dt * 1.2;
      const onT = this.onTableAt(n.x, n.z, 0.02);
      const floor = onT ? TABLE_Y + 0.006 : 0.004;
      if (n.y <= floor && n.vy < 0) { n.y = floor; n.rest = 1; n.rx = 0; n.rz = 0; }
    }
    if (this.notes.length && !this.folder && this.view?.phase === 'spinning') {
      for (const n of this.notes) n.fade = (n.fade || 0) + dt;
      this.notes = this.notes.filter((n) => (n.fade || 0) < 0.8);
    }
  }

  /* ---------- ok ---------- */
  arrowU(sNow) {
    const sp = this.spinS;
    if (!sp) return this.view ? this.view.rest || 0 : 0;
    const p = clamp((sNow - sp.at) / sp.ms, 0, 1);
    let u = sp.u0 + (sp.u1 - sp.u0) * easeSpin(p);
    // durduktan sonra mandalın itişiyle hafif geri sekme
    const q = (sNow - sp.at - sp.ms) / 1000;
    if (q > 0 && q < 1.2) u += Math.sign(sp.u1 - sp.u0) * -0.035 * Math.exp(-q * 5) * Math.sin(q * 16);
    return u;
  }
  stepArrow(dt) {
    const sNow = this.ctx.serverNow();
    const prevU = this.u;
    this.u = this.arrowU(sNow);
    const du = this.u - prevU;
    this.uv = dt > 0 ? du / dt : 0;
    const n = Math.max(1, this.seats.length), sub = this.sub;
    const sp = this.spinS;
    const speed = Math.abs(this.uv) / n;                       // tur/sn
    if (this.snd) this.snd.int = sp && this.view?.phase === 'spinning' ? clamp(1 - speed / 1.6, 0, 1) : 0;
    // çivi geçişleri → tık sesi + mandal tepmesi
    const pi = Math.floor((this.u + 0.5) * sub);
    if (this.pegLast === null) this.pegLast = pi;
    if (pi !== this.pegLast) {
      const dir = Math.sign(pi - this.pegLast);
      const nowp = performance.now();
      const sp01 = clamp(speed / 2.5, 0, 1);
      if (nowp - this.lastTick > (sp01 > 0.6 ? 80 : 36)) {
        this.lastTick = nowp;
        try { this.snd.fx(sp01 > 0.7 ? 'whirr' : 'tick', sp01); } catch { /* yok */ }
      }
      this.flap.v += dir * (6 + 8 * (1 - sp01));
      this.pegLast = pi;
    }
    // mandal: yaklaşan çiviye doğru bükülür, geçince geri yaylanır
    const dirS = sp ? Math.sign(sp.u1 - sp.u0) || 1 : 1;
    const f = (this.u + 0.5) * sub - Math.floor((this.u + 0.5) * sub);
    const tgt = -dirS * 0.55 * sst(0.5, 1, dirS > 0 ? f : 1 - f);
    const fl = this.flap;
    fl.v += (-70 * (fl.a - tgt) - 7 * fl.v) * dt;
    fl.a += fl.v * dt;
    fl.a = clamp(fl.a, -0.8, 0.8);
    // davul: tek ya da son çevirişte son 2 sn
    if (sp && !this.drummed && this.drumAt && sNow >= this.drumAt && this.view?.phase === 'spinning') {
      this.drummed = true;
      try { this.snd.fx('drumroll', Math.max(0.4, (sp.at + sp.ms - sNow) / 1000)); } catch { /* yok */ }
    }
  }
  arrowAngle() { const n = Math.max(1, this.seats.length); return (this.u * TAU) / n + this.off; }
  tipPos() {
    const a = this.arrowAngle(), L = this.RB * 0.88;
    return [Math.cos(a) * L, TABLE_Y + BOARD_H + 0.07, Math.sin(a) * L];
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const phase = v.phase;
    const tip = this.tipPos();
    const n = Math.max(1, this.seats.length), step = TAU / n;
    const ang = this.arrowAngle();
    const speed = Math.abs(this.uv) / n;
    const res = v.res;
    const sinceRes = this.time - (this.resAt || 0);
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null };
      const S = a.idle;
      const isSafe = (v.safe || []).includes(i);
      if (phase === 'spinning') {
        const near = Math.abs(angDiff(ang, this.seatAngle(i))) < step * 0.55;
        const slow = speed < 0.55;
        if (near && slow && !isSafe) {
          a.pose('lean', { t, k: 12 });
          a.expr = 'o';
        } else if (isSafe) {
          a.pose('lean', { t });
          a.expr = 'smile';
        } else {
          a.pose(hs(i, 2) < 0.5 ? 'clasp' : 'bite', { t });
          a.expr = speed > 1.4 ? 'grin' : 'tense';
        }
        a.look = tip;
        return;
      }
      if ((phase === 'result' || phase === 'safe') && res) {
        const payer = this.avatarAt(res.k);
        const isHot = i === res.k;
        if (phase === 'result') {
          if (isHot) {
            const ph = sinceRes < 1.7 ? 0 : sinceRes < 3.6 ? 1 : sinceRes < 6.2 ? 2 : 3 + (Math.floor((sinceRes - 6.2) / 4) % 2);
            if (ph === 0) { a.pose('headgrab', { t, k: 10 }); a.expr = 'o'; a.look = null; a.tgt.hp = -0.15; a.tgt.hy = 0; }
            else if (ph === 1 || ph === 4) { a.pose('shrug', { t }); a.expr = 'wince'; a.look = [this.cam.ex, this.cam.ey, this.cam.ez]; }
            else if (ph === 2) { a.pose('facepalm', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.25; }
            else { a.pose('slump', { t }); a.tgt.lean = 0.18; a.expr = 'sad'; a.look = this.folder ? [this.folder.x1, TABLE_Y, this.folder.z1] : null; }
          } else {
            const mode = (i + Math.floor(sinceRes / 2.4)) % 3;
            if (sinceRes < 4.5) {
              if (mode === 0 && payer) { a.pose('rest', { t }); a.pointAt(payer.headW, a.toSeat(payer.headW)[0] > 0 ? 1 : 0); }
              else a.pose(mode === 1 ? 'cheer' : 'clap', { t });
              a.expr = 'laugh';
            } else { a.pose(S.mood, { t }); a.expr = 'grin'; }
            a.look = payer ? payer.headW : null;
          }
        } else {
          if (isHot) { a.pose(sinceRes < 1.6 ? 'cheer' : 'lean', { t }); a.expr = sinceRes < 1.6 ? 'laugh' : 'smile'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.05; }
          else if (isSafe) { a.pose('lean', { t }); a.expr = 'smile'; a.look = payer ? payer.headW : null; }
          else { a.pose('clasp', { t }); a.expr = 'tense'; a.look = [0, TABLE_Y, 0]; }
        }
        return;
      }
      // bekleme: ruh hali değişir, bakış komşulara / ortaya / kameraya kayar
      S.mt -= dt;
      if (S.mt <= 0) { S.mood = Math.random() < 0.55 ? 'rest' : 'chin'; S.mt = 5 + Math.random() * 7; }
      S.lt -= dt;
      if (S.lt <= 0) {
        S.lt = 1.8 + Math.random() * 3.5;
        const r = Math.random();
        const nb = this.avatarAt((i + (r < 0.5 ? 1 : n - 1)) % n);
        S.look = r < 0.7 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? [0, TABLE_Y + 0.1, 0] : [this.cam.ex, this.cam.ey, this.cam.ez];
        a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
      }
      if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = [this.cam.ex, this.cam.ey, this.cam.ez]; return; }
      a.pose(isSafe ? 'lean' : S.mood, { t });
      a.look = S.look;
    });
  }
  // sonuçta ödeyen dışındakiler hafifçe kararır (göz ödeyene gitsin)
  avTint(a, i) {
    const v = this.view;
    const want = v?.phase === 'result' && v.res && v.res.k !== i ? 0.8 : 1;
    a.dimK = damp(a.dimK ?? 1, want, 3, 0.016);
    return a.dimK;
  }

  /* ---------- kamera koreografisi ---------- */
  tick(dt) {
    if (this.X && this.W) { this.ensureBoard(); this.ensureWheel(); }
    this.stepArrow(dt);
    this.stepFolder(dt);
    this.stepNotes(dt);
    const v = this.view, c = this.cam;
    if (!v) return;
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0;
    if (v.phase === 'spinning' && this.spinS) {
      const p = clamp((this.ctx.serverNow() - this.spinS.at) / this.spinS.ms, 0, 1);
      const tip = this.tipPos();
      zoom = lerp(0.86, 0.68, sst(0.05, 0.9, p));
      pa = lerp(0.08, 0.15, sst(0.05, 0.9, p));
      const fk = 0.2 * sst(0.75, 1, p);
      fx = tip[0] * fk; fz = tip[2] * fk + 0.25 * sst(0.05, 0.6, p);
      this.frameOff = 0; this.frameOffX = 0;
    } else if ((v.phase === 'result' || v.phase === 'safe') && v.res) {
      const a = this.avatarAt(v.res.k);
      if (a) {
        // sonuçta kamera masanın çevresinde döner: ödeyen karşıda, yüzü bize dönük olsun (elemede ara sonuçta dönmez)
        yaw = v.phase === 'result' ? -Math.PI / 2 - this.seatAngle(v.res.k) : 0;
        const k = v.phase === 'result' ? 0.62 : 0.3;
        zoom = v.phase === 'result' ? 0.56 : 0.84;
        pa = v.phase === 'result' ? -0.38 : -0.05;
        // ödeyenin başı ekranın üst yarısında kalsın (altta sonuç kartı var): ekrandaki yerine göre odak kayar
        // yatay ekranda kart sağda: ödeyen sol yarıda dursun
        const land = this.vw > this.vh * 1.1;
        const q = this.project(a.headW[0], a.headW[1], a.headW[2]);
        if (q && this.vh && Math.abs(angDiff(c.yaw, yaw)) < 0.35) {
          const err = q[1] / this.vh - (land ? 0.42 : v.phase === 'result' ? 0.34 : 0.4);
          const errX = q[0] / this.vw - (land ? 0.32 : 0.5);
          this.frameOff = clamp((this.frameOff || 0) + err * dt * 4.5, -2.5, 2.5);
          this.frameOffX = clamp((this.frameOffX || 0) + errX * dt * 4.5, -3, 3);
        }
        const fo = this.frameOff || 0, fox = this.frameOffX || 0;
        fx = a.pos[0] * k + Math.sin(c.yaw) * fo + Math.cos(c.yaw) * fox; fz = a.pos[2] * k + Math.cos(c.yaw) * fo - Math.sin(c.yaw) * fox; fy = 0.15;
      }
    } else {
      this.frameOff = 0; this.frameOffX = 0;
      yaw = Math.sin(this.time * 0.13) * 0.06;
    }
    // açıyı en kısa yoldan, yumuşakça çevir
    this.yawGoal = Math.abs(yaw) < 0.2 ? 0 : yaw;
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = fx; c.fz = fz; c.fy = fy;
    c.pitchAdd = damp(c.pitchAdd, pa, 2.2, dt);
    this.wedgeA = damp(this.wedgeA, this.hot >= 0 ? 1 : 0, 6, dt);
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W;
    if (!Wd || !Wd.bBase) return;
    const m = this.mats.b, T = this.T;
    M.set(m, 0, TABLE_Y, 0, -this.off);
    D(Wd.bBase, m, T.obj);
    D(Wd.pegs, m, T.obj);
    // ok + mandal
    const ang = this.arrowAngle();
    M.set(m, 0, TABLE_Y, 0, -ang);
    D(Wd.arrow, m, T.obj);
    if (!shadow) {
      const L = this.RB * 0.9;
      const m2 = this.mats.c;
      M.set(this.tmpM || (this.tmpM = M.make()), L, BOARD_H + 0.06, 0, this.flap.a, 0, 0);
      M.mul(m2, m, this.tmpM);
      D(Wd.flap, m2, T.obj);
    }
    // hesap kılıfı
    if (this.folder) {
      const f = this.folder;
      const fm = this.folderMat(this.mats.c);
      D(Wd.fBase, fm, T.obj);
      const lm = this.lidM || (this.lidM = M.make()), tmp = this.tmpL || (this.tmpL = M.make());
      // kapak: arka kenardan (-FD/2) menteşeli; açılınca arkaya yatar
      M.set(tmp, 0, 0.016, -FD / 2, 0, -f.open * 2.35, 0);
      M.mul(lm, fm, tmp);
      D(Wd.fLid, lm, T.obj);
    }
    // banknotlar
    if (!shadow || this.notes.length < 40) {
      const nm = this.mats.c;
      for (const n of this.notes) {
        const sc = 1 - clamp((n.fade || 0) / 0.8, 0, 1);
        if (sc <= 0) continue;
        M.set(nm, n.x, n.y, n.z, n.ry, n.rx, n.rz, 1.15 * sc);
        D(Wd.note[n.c], nm, T.obj);
      }
    }
  }
  drawTex(F, L) {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.bTop) return;
    const m = this.mats.b;
    gl.uniform1f(X.tex.u.uSelf, 0.28);
    gl.bindTexture(gl.TEXTURE_2D, this.wheelTex);
    M.set(m, 0, TABLE_Y, 0, -this.off);
    drawMesh(X, Wd.bTop, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0.35);
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    M.set(m, 0, TABLE_Y, 0, -this.arrowAngle() + Math.PI / 2);
    drawMesh(X, Wd.hubLogo, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  drawShadowsExtra(m) {
    const X = this.X;
    // banknot ve kılıf altı yumuşak gölgeler
    if (this.folder) {
      const fm = this.folderMat(this.mats.c);
      const h = fm[13] - TABLE_Y;
      M.set(m, fm[12], TABLE_Y + 0.006, fm[14], 0, 0, 0, 0.3 + h * 0.15, 1, 0.24 + h * 0.15);
      drawMesh(X, this.res.shadow, m, ONE3, clamp(0.6 - h * 0.4, 0.15, 0.6));
    }
  }
  drawFx(F, m) {
    const X = this.X, Wd = this.W;
    if (!Wd || !Wd.wedge) return;
    const v = this.view;
    // kazanan / kurtulan dilim parlaması
    if (this.hot >= 0 && this.wedgeA > 0.02) {
      const n = Math.max(1, this.seats.length);
      const ang = (this.hot * TAU) / n + this.off;
      const pulse = 0.55 + 0.35 * Math.sin(this.time * 7);
      const col = v?.phase === 'safe' ? [0.3, 1, 0.55] : hexRGB(pcol(this.seats[this.hot]?.c ?? 0));
      M.set(m, 0, TABLE_Y, 0, -ang);
      drawMesh(X, Wd.wedge, m, col, this.wedgeA * pulse * 0.55);
    }
    // dönen okun ucunda ışık
    if (v?.phase === 'spinning') {
      const tp = this.tipPos();
      M.set(m, tp[0], TABLE_Y + BOARD_H + 0.01, tp[2], 0, 0, 0, 0.22, 1, 0.22);
      drawMesh(X, this.res.glow, m, [1, 0.8, 0.4], 0.5);
    }
    // ödeyenin koltuğunun altında renkli halka; kendi koltuğumda soluk halka
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      let al = 0, col = hexRGB(pcol(p.c));
      if (v?.res && this.hot === i) al = 0.7 + 0.25 * Math.sin(this.time * 6);
      else if (i === this.me && v?.phase !== 'result') al = 0.25;
      if (al <= 0) return;
      M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 0.95, 1, 0.95);
      drawMesh(X, this.res.glow, m, col, al * 0.6);
    });
  }

  /* ---------- arayüz ---------- */
  bar() {
    const v = this.view;
    if (!v) return;
    const ctx = this.ctx;
    const n = (v.seats || []).filter((p) => p.on).length;
    const meIn = v.me >= 0;
    const modeSeg = (dis) => `<div class="mz-seg" role="group" aria-label="Oyun modu">
      <button data-act="hk-mode" data-m="tek" class="${v.mode !== 'eleme' ? 'on' : ''}" ${dis ? 'disabled' : ''}>🎯 Tek çevirme</button>
      <button data-act="hk-mode" data-m="eleme" class="${v.mode === 'eleme' ? 'on' : ''}" ${dis ? 'disabled' : ''}>🔥 Son kalan öder</button></div>`;
    let key = v.phase + '|' + v.mode + '|' + n + '|' + (v.res ? v.res.k + ':' + v.res.cnt : '') + '|' + (v.spin ? v.spin.id : '') + '|' + (v.safe || []).length + '|' + v.me;
    let html = '';
    if (v.phase === 'idle') {
      html = `${n < 2 ? '<div class="hk-hint">Çark için masada en az 2 kişi lazım. Oda kodunu paylaş!</div>' : `<div class="hk-hint">${v.mode === 'eleme' ? 'Ok kimi gösterirse o kurtulur. En son kalan hesabı öder!' : 'Herkes çevirebilir. Ok kimi gösterirse hesap onda!'} <br><small style="opacity:.75;font-size:12px">Çarkı parmağınla da kaydırabilirsin</small></div>`}
        ${modeSeg(false)}
        <button class="mz-btn pulse" data-act="hk-spin" ${n < 2 ? 'disabled' : ''}>🎡 Çarkı çevir</button>`;
    } else if (v.phase === 'spinning') {
      const sp = v.spin;
      const left = (v.seats || []).length - (v.safe || []).length;
      html = `<div class="mz-say">${sp?.kind === 'final' ? '😬 Son kalan belli oldu…' : sp?.kind === 'safe' ? `🔥 Kim kurtulacak? · ${left} kişi kaldı` : `🎡 ${esc(sp?.by || '')} çevirdi, nefesler tutuldu…`}</div>`;
    } else if (v.phase === 'safe' && v.res) {
      const mine = v.res.k === v.me;
      html = `<div class="mz-say ${mine ? '' : ''}">✅ ${mine ? 'Sen kurtuldun!' : `${esc(v.res.n)} kurtuldu!`} · ${v.res.left} kişi kaldı</div>
        <button class="mz-btn alt" data-act="hk-spin" style="min-width:0;font-size:16px;padding:8px 16px">Hemen çevir ▶</button>`;
    } else if (v.phase === 'result' && v.res) {
      const r = v.res, mine = r.k === v.me;
      const top = (v.top || [])[0];
      const cnt = r.cnt > 1 ? `Bu masada ${r.cnt}. kez ödüyor 😅` : (r.mode === 'eleme' ? 'Herkes kurtuldu, bir o kaldı!' : 'Kader konuştu!');
      const spon = top && top.k >= 2 && top.n !== r.n ? ` · 👑 Masanın sponsoru: ${esc(top.n)} (${top.k})` : '';
      const hist = (v.hist || []).slice(1, 5);
      html = `<div class="hk-res ${mine ? 'me' : ''}">
          <div class="lb">${r.mode === 'eleme' ? '🔥 Son kalan öder' : '💸 Hesap'}</div>
          <div class="nm"><i style="background:${pcol(r.c)}"></i><span>${mine ? 'Sende! 😬' : esc(r.n)}</span></div>
          <div class="q">${esc(r.msg)}</div>
          <div class="st">${cnt}${spon}</div>
          ${hist.length ? `<div class="hs">${hist.map((h) => `<span><i style="background:${pcol(h.c)}"></i>${esc(h.n)}</span>`).join('')}</div>` : ''}
        </div>
        ${modeSeg(false)}
        <button class="mz-btn" data-act="hk-spin" ${n < 2 ? 'disabled' : ''}>🔁 Bir daha çevir</button>`;
      key += '|' + (v.hist || []).length;
    }
    if (!meIn && v.phase !== 'spinning') html = `<div class="hk-hint">👀 Bu çevirişte izliyorsun, bir sonrakinde sen de masadasın.</div>` + html;
    if (this.setBar(key, html)) {
      if (!this.barBound) {
        this.barBound = true;
        this.el.bar.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          if (b.dataset.act === 'hk-spin') this.spin(0, 0.5);
          if (b.dataset.act === 'hk-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
        });
      }
    }
    void ctx;
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const left = (v.seats || []).length - (v.safe || []).length;
    this.top(v.mode === 'eleme' && (v.phase === 'spinning' || v.phase === 'safe') ? `🔥 Eleme · ${left} kişi kaldı` : '');
    // etiketler: ödeyen / kurtulan vurgulu, kurtulanlar soluk
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      o.lbl.classList.toggle('hot', !!v.res && this.hot === i);
      o.lbl.classList.toggle('dim', (v.safe || []).includes(i) && v.phase !== 'result');
    });
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const n = Math.max(1, this.seats.length), step = TAU / n;
    const cx = w / 2, cy = h * 0.46, R = r * 0.5;
    const v = this.view;
    for (let k = 0; k < n; k++) {
      const a = (k * step) + this.off;
      g.fillStyle = (v?.safe || []).includes(k) ? '#8d8a86' : pcol(this.seats[k].c);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a - step / 2, a + step / 2); g.closePath(); g.fill();
    }
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    const a = this.arrowAngle();
    g.strokeStyle = '#c8261c'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - Math.cos(a) * R * 0.3, cy - Math.sin(a) * R * 0.3); g.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); g.stroke();
    g.fillStyle = '#e8c26a'; g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill();
  }
  onDispose() { this.freeTex(); }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new HesapGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[hesap]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
