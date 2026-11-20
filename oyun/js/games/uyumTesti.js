// Ne Kadar Uyumluyuz? — 3D romantik akşam yemeği (NFC Dünyası Oyun)
// İki kişilik küçük bir masa: mum, gül, tabaklar. Ortada kalp biçimli cam bir "aşk iksiri" şişesi var; her eşleşmede
// pembe iksir biraz daha yükselir ve parlar. Her soruda iki kişi de seçimini yapar; seçen kartını masaya kapalı bırakır.
// Açılışta ikisi de kartını kaldırır: renkler aynıysa eşleşme. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D.
import { _masa } from './masa3d.js?v=2026-11-20-b';
import * as sfx from '../sfx.js?v=2026-11-20-b';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, psurf, KIT } = E;

const OPT_HEX = ['#ff5a7a', '#4aa8ff', '#3fd07a', '#ffb21e'];
const OPT_L = ['A', 'B', 'C', 'D'];
const OPT3 = OPT_HEX.map((h) => hexRGB(h));
const PINK3 = [1, 0.32, 0.5];
const CARD_Z = 0.5;            // kartın koltuktan uzaklığı (masada, koltuk uzayı)
const CARD_S = 1.35;           // kart ölçeği (model 12×17 cm → ~16×23 cm)
// kalp şişe: birim kalp (ucu y=0, üstü ≈1.70, genişliği ≈±0.94) HS ile metreye ölçeklenir
const HS = 0.25;               // ölçek
const HD = 0.2;                // şişenin yarı kalınlığı (birim)
const HB = 0.026;              // kaidenin üstü (şişenin ucu burada, masadan)
const LIQ_IN = 0.86, LIQ_CY = 0.8, LIQ_D = 0.16;   // iksir: dış hattın (0, 0.8)'e doğru %86'sı; yarı kalınlık

const STYLE = `
#ky.uyt .msg{top:12%}
#ky.uyt .uy-q{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fff6f8;color:var(--ink);padding:8px 14px 10px;text-align:center}
#ky.uyt .uy-q small{display:block;font-size:12.5px;font-weight:800;opacity:.65;line-height:1.25}
#ky.uyt .uy-q b{display:block;font-size:clamp(17px,4.6vw,22px);font-weight:900;line-height:1.18;margin-top:2px}
#ky.uyt .uy-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(560px,96vw)}
#ky.uyt .uy-opts button{position:relative;display:flex;align-items:center;gap:8px;min-height:clamp(52px,7.4vh,66px);border-radius:18px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fff;color:var(--ink);font-weight:800;font-size:clamp(13px,3.6vw,15.5px);line-height:1.15;text-align:left;padding:6px 10px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.uyt .uy-opts button i{flex:0 0 auto;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;font-style:normal;font-weight:900;font-size:15px;color:#fff;background:var(--oc);border:2px solid var(--ink)}
#ky.uyt .uy-opts button.on{background:var(--oc);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.35)}
#ky.uyt .uy-opts button.on i{background:#fff;color:var(--oc)}
#ky.uyt .uy-opts button[disabled]:not(.on){opacity:.5}
#ky.uyt .uy-opts button:active:not([disabled]){transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.uyt .uy-st{display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:14px;color:#fff;background:rgba(12,10,26,.7);border-radius:99px;padding:5px 14px;max-width:94%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#ky.uyt .uy-st:empty{display:none}
#ky.uyt .uy-res{width:min(460px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:10px 14px 12px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1)}
#ky.uyt .uy-res.match{background:#ffe3ec}
#ky.uyt .uy-res .big{font-size:22px;font-weight:900;line-height:1.15}
#ky.uyt .uy-res .qq{font-size:13px;font-weight:700;opacity:.7;margin-top:3px;line-height:1.25}
#ky.uyt .uy-res .pk{display:grid;gap:5px;margin-top:8px;text-align:left}
#ky.uyt .uy-res .pk div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:3px 10px;font-weight:800;font-size:13.5px;background:#fff}
#ky.uyt .uy-res .pk div i{flex:0 0 auto;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-style:normal;font-weight:900;font-size:13px;color:#fff;background:var(--oc);border:2px solid var(--ink)}
#ky.uyt .uy-res .pk div span{opacity:.65;font-weight:700}
#ky.uyt .uy-res .kb{margin-top:10px}
#ky.uyt .uy-res .kb[disabled]{opacity:.55;filter:grayscale(.3)}
#ky.uyt .uy-pct{position:absolute;left:0;top:0;z-index:4;pointer-events:none;font-weight:900;font-size:17px;color:#fff;background:rgba(194,24,91,.88);border:2px solid #fff;border-radius:99px;padding:1px 10px;white-space:nowrap;display:none;will-change:transform;box-shadow:0 2px 10px rgba(194,24,91,.5)}
#ky.uyt .lbl .uy-x{display:inline-flex;align-items:center;gap:3px}
#ky.uyt .lbl .uy-x:empty{display:none}
#ky.uyt .lbl .uy-k{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:50%;font-style:normal;font-weight:900;font-size:11px;color:#fff;background:var(--oc);border:1.5px solid #fff}
#ky.uyt .card .uy-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.uyt .card .uy-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.uyt .card .uy-seg button.on{background:var(--ink);color:#fff}
#ky.uyt .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.uyt .card.uy-in .tt{font-size:25px}
#ky.uyt .card .uy-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.uyt .card .uy-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.uyt .card .uy-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.uyt .card .uy-ru .a{background:#e3dcff}#ky.uyt .card .uy-ru .g{background:#d6f5e0}#ky.uyt .card .uy-ru .y{background:#ffe3ec}
#ky.uyt .card .uy-big{font-size:46px;font-weight:900;line-height:1;color:#c2185b;margin-top:6px}
#ky.uyt .card .uy-hist{margin-top:10px;display:grid;gap:5px;max-height:min(24vh,200px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.uyt .card .uy-hist div{border:2px solid var(--ink);border-radius:12px;padding:4px 9px;font-size:12.5px;line-height:1.3;background:#fff}
#ky.uyt .card .uy-hist div.m{background:#ffe3ec}
#ky.uyt .card .uy-hist b{font-weight:900}
#ky.uyt .card .uy-hist span{display:block;opacity:.7;font-weight:700}
#ky.uyt .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.uyt .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.uyt .uy-q{width:min(420px,48vw);padding:5px 10px 6px}#ky.uyt .uy-q b{font-size:16px}
#ky.uyt .uy-opts{width:min(420px,48vw);gap:6px}#ky.uyt .uy-opts button{min-height:44px;font-size:13px}
#ky.uyt .uy-res{width:min(400px,48vw);padding:7px 12px}#ky.uyt .uy-res .big{font-size:18px}
#ky.uyt .card .tt{font-size:18px}#ky.uyt .card.uy-in .tt{font-size:20px}
#ky.uyt .card .uy-big{font-size:32px;margin-top:2px}
#ky.uyt .card .uy-hist{max-height:19vh;margin-top:6px}
#ky.uyt .card .uy-seg{margin-top:6px}#ky.uyt .card .uy-seg button{padding:6px 4px}
#ky.uyt .card .uy-ru{margin-top:6px}#ky.uyt .card .uy-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.uyt .card .uy-ru div b{font-size:17px}
}
@media (min-aspect-ratio:11/10){#ky.uyt .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// Giriş/final: Re majör bossa nova (Dmaj7 – Bm7 – Em7 – A7): rim tıkırtısı, şeyker, yumuşak bas, elektrikli piyano, vibrafon.
// Soru: aynı ezgi daha sakin ve yavaş (düşünme zamanı). Açılış: pad + vibrafon.
class UySnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 100 : this.mode === 'idle' ? 118 : 92; }
  swing() { return 0.06; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const CH = [[38, [61, 64, 66, 69]], [35, [59, 62, 66, 69]], [40, [59, 62, 64, 67]], [33, [61, 64, 67, 69]]];
    const [root, ch] = CH[bar % 4];
    const soft = this.mode !== 'idle';
    if (this.mode === 'idle' || this.mode === 'race') {
      // bossa rim kalıbı (3-3-2 / 2-2-2-2-2)
      const RIM = bar % 2 === 0 ? [0, 3, 6, 10, 13] : [2, 6, 10, 12];
      if (RIM.includes(s)) this.iRim(t, soft ? 0.03 : 0.045);
      if (s === 0 || s === 8) this.iKick(t, soft ? 0.06 : 0.09, 96, 46, 0.16);
      if (s % 2 === 0) this.iShk(t, soft ? 0.008 : 0.012);
      const BL = [0, null, null, 7, null, null, null, null, 7, null, null, 12, null, null, 7, null];
      const b = BL[s];
      if (b != null) this.iBass(t, root + b, st * 2.2, soft ? 0.055 : 0.07, 'up');
      if (s === 2 || s === 7 || s === 11) ch.forEach((m, k) => this.iEP(t + k * 0.005, m, (soft ? 0.008 : 0.011) * (k ? 0.75 : 1), st * 2.4, 0.22));
      const MEL = [ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 12];
      if (!soft && (s === 4 || s === 14)) this.iVibe(t, MEL[(bar + (s >> 3)) % 4], 0.016, spb * 0.9, 0.3);
      if (soft && s === 14 && bar % 2 === 1) this.iVibe(t, ch[3] + 12, 0.012, spb, 0.3);
      return;
    }
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, 0.009, 1100);
    if (s % 4 === 0) this.iBass(t, root + [0, 7, 12, 7][(s >> 2) % 4], spb * 0.85, 0.055, 'up');
    if (s === 4 || s === 12) this.iBrush(t, 0.035, 0.18);
    if (s === 6 || s === 14) this.iVibe(t, ch[(bar + (s >> 3)) % 4] + 12, 0.015, spb, 0.32);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'pick': // seçim: yumuşak marimba
        this.tone(1047, t, 0.18, 'sine', 0.1, null, 0.002);
        this.tone(1568, t + 0.05, 0.22, 'sine', 0.06, null, 0.002);
        this.noise(t, 0.04, 0.05, { type: 'bandpass', freq: 3000, q: 1.5 });
        break;
      case 'partner': this.tone(880, t, 0.1, 'sine', 0.06, 1175, 0.004); this.tone(1175, t + 0.08, 0.14, 'sine', 0.04, null, 0.004); break;
      case 'flip': this.noise(t, 0.22, 0.12, { type: 'bandpass', freq: 1400, to: 4200, q: 0.9, attack: 0.02 }); break;
      case 'match': // arp sesi + çan + kalp atışı
        this.duck(0.3, 1.8);
        [62, 66, 69, 74, 78, 81, 86].forEach((m, i) => this.tone(440 * Math.pow(2, (m - 69) / 12), t + i * 0.045, 0.5, 'triangle', 0.06, null, 0.003));
        [1568, 2093].forEach((f, i) => this.tone(f, t + 0.36 + i * 0.12, 0.8, 'sine', 0.07, null, 0.002));
        this.tone(70, t + 0.45, 0.16, 'sine', 0.3, 45, 0.003);
        this.tone(70, t + 0.68, 0.16, 'sine', 0.24, 45, 0.003);
        break;
      case 'miss': // tatlı bir "hıh"
        [[659, 0], [587, 0.14], [494, 0.28]].forEach(([f, d]) => this.tone(f, t + d, 0.18, 'triangle', 0.07, f * 0.97, 0.004));
        this.tone(300, t + 0.42, 0.25, 'sine', 0.05, 180, 0.01);
        break;
      case 'heart': this.tone(66, t, 0.14, 'sine', 0.22, 44, 0.003); this.tone(66, t + 0.2, 0.14, 'sine', 0.16, 44, 0.003); break;
      case 'final':
        this.duck(0.2, 3);
        this.iStr(t, [62, 66, 69, 74], 2.6, 0.03, 0.4, 2600, 0.3);
        [74, 78, 81, 86].forEach((m, i) => this.iBell(t + 0.3 + i * 0.16, m, 0.04, 1.6, 0.3));
        this.cheer(t + 0.5, 1.6);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// 3B kalp: yastık gibi şişkin, ön ve arka yüzü olan klasik kalp (orijin kalbin ortası; yükseklik ~1.7, genişlik ~1.9)
function heartModel(mb) {
  const P = C('#ffffff', -0.85);
  const hc = (t) => [16 * Math.pow(Math.sin(t), 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.12];
  psurf(mb, 18, 48, (u, v) => {
    const w = (u - 0.5) * Math.PI, k = Math.pow(Math.max(0, Math.cos(w)), 0.55);
    const [x, y] = hc(v * TAU);
    return [x * k, y * k, Math.sin(w) * 0.42];
  }, () => P, { wv: true, cen: [0, 0, 0] });
}
// gül: ince cam vazo, sap, yapraklar, katmerli çiçek (orijin masada)
function roseModel(mb) {
  const G = [0.86, 0.93, 0.96, -0.95], St = C('#2f7a3a', -0.2), Lf = C('#3a9a48', -0.25), Rd = C('#d81b40', -0.55), Rd2 = C('#b0122f', -0.5);
  mb.lathe(0, 0, 0, [[0, 0], [0.028, 0], [0.03, 0.006], [0.018, 0.03], [0.012, 0.11], [0.016, 0.14], [0.014, 0.142]], 18, G);
  limb(mb, [0, 0.02, 0], [0.006, 0.24, 0.004], [0.0035, 0.003], St, 6);
  for (const [y, s] of [[0.16, 1], [0.2, -1]]) mb.sphereS(s * 0.022, y, 0, 0.022, 0.006, 0.011, Lf, 10, 6);
  // çiçek: iç içe yaprak halkaları
  mb.sphereS(0.006, 0.262, 0.004, 0.022, 0.026, 0.022, Rd2, 14, 10);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU, r = 0.018;
    mb.sphereS(0.006 + Math.cos(a) * r, 0.257, 0.004 + Math.sin(a) * r, 0.016, 0.022, 0.016, Rd, 10, 8);
  }
}
// kart: iki yüzü seçilen şıkkın renginde, beyaz kenarlı (orijin kartın ortası; kart xz düzleminde yatar, +y ön yüz)
function cardModel(mb, hex) {
  const W = C('#ffffff', -0.3), P = C(hex, -0.5);
  mb.rbox(-0.06, -0.0015, -0.085, 0.06, 0.0015, 0.085, 0.0012, W, 1);
  mb.rbox(-0.05, -0.0022, -0.075, 0.05, 0.0022, 0.075, 0.001, P, 1);
}
// kapalı kart: beyaz, arkasında küçük kırmızı kalp
function cardBackModel(mb) {
  const W = C('#fbf6f2', -0.3), Rd = C('#e0245e', -0.5);
  mb.rbox(-0.06, -0.0015, -0.085, 0.06, 0.0015, 0.085, 0.0012, W, 1);
  mb.push().T(0, 0.0018, 0, 0, Math.PI / 2, 0, 0.026, 0.026, 0.004);
  heartModel(mb);
  mb.pop();
}
/* ---------- kalp şişe ---------- */
// birim kalp dış hattı (saat yönünde, üst ortadaki çentikten başlar; ucu y=0)
const HEART_O = (() => {
  const P = [], N = 120;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU;
    P.push([16 * Math.pow(Math.sin(t), 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 1]);
  }
  return P;
})();
const HEART_TOP = Math.max(...HEART_O.map((p) => p[1]));
const LIQ_Y0 = LIQ_CY - LIQ_CY * LIQ_IN, LIQ_Y1 = LIQ_CY + (HEART_TOP - LIQ_CY) * LIQ_IN;
const BOT_Y = TABLE_Y + 0.004 + HB - 0.008;                  // şişenin ucu (kaidenin içine biraz gömülü)
const BOTTLE_TOP = BOT_Y + HEART_TOP * HS;                    // şişenin en üstü (dünya)
const BOTTLE_MID = BOT_Y + 0.9 * HS;                          // şişenin ortası (bakış, parıltı)
const liqY = (f) => BOT_Y + (LIQ_Y0 + f * (LIQ_Y1 - LIQ_Y0)) * HS;   // iksirin yüzeyi (dünya)
// iç hat, Y ≤ L ile kırpılmış (Sutherland–Hodgman; kalp, eksendeki noktalara göre yıldız biçimli)
function liqPoly(L) {
  const P = HEART_O.map(([x, y]) => [x * LIQ_IN, LIQ_CY + (y - LIQ_CY) * LIQ_IN]);
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ia = a[1] <= L, ib = b[1] <= L;
    if (ia) out.push(a);
    if (ia !== ib) { const u = (L - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * u, L]); }
  }
  return out;
}
// kenar normalleri (saat yönündeki çokgen için dışa doğru); 35°'den yumuşak köşelerde ortalanır
function edgeNormals(P) {
  const n = P.length, Ne = [];
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; Ne.push([-dy / l, dx / l]); }
  const sm = (u, w) => { if (u[0] * w[0] + u[1] * w[1] < 0.82) return w; const x = u[0] + w[0], y = u[1] + w[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  return Ne.map((e, i) => [sm(Ne[(i - 1 + n) % n], e), sm(Ne[(i + 1) % n], e)]);
}
// prizma: ön/arka yüz (merkezden yelpaze) + yan bant; P birim, ölçek s, yarı kalınlık d
function prismModel(mb, P, cy, s, d, colF, colS, colT) {
  const n = P.length;
  if (n < 3) return;
  const c = [0, cy * s];
  const NE = edgeNormals(P);
  for (const z of [d, -d]) {
    const nz = [0, 0, Math.sign(z)];
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n];
      mb.triN([c[0], c[1], z], [a[0] * s, a[1] * s, z], [b[0] * s, b[1] * s, z], nz, nz, nz, colF, colF, colF);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], [na, nb] = NE[i];
    const top = a[1] === b[1] && b[0] > a[0];
    const col = top ? colT : colS;
    mb.quadN([a[0] * s, a[1] * s, d], [b[0] * s, b[1] * s, d], [b[0] * s, b[1] * s, -d], [a[0] * s, a[1] * s, -d], [na[0], na[1], 0], [nb[0], nb[1], 0], [nb[0], nb[1], 0], [na[0], na[1], 0], col);
  }
}
// pembe iksir, f (0..1) doluluğunda
function liquidModel(mb, f) {
  const L = LIQ_Y0 + f * (LIQ_Y1 - LIQ_Y0);
  prismModel(mb, liqPoly(L), LIQ_Y0 + (Math.min(L, 1.0) - LIQ_Y0) * 0.5, HS, LIQ_D * HS, C('#ff2a6d', -0.55), C('#f01e5e', -0.55), C('#ff86ad', -0.7));
}
// cam yüzler ('un': köşe başına saydamlık; pembe camın ortası berrak, kenara doğru koyulaşır) + ön yüzde parlama çizgileri
function shellModel(mb) {
  const P = HEART_O, n = P.length, s = HS, d = HD * HS * 0.97, c = [0, 0.6 * s];
  const v = (p, col) => mb.d.push(p[0], p[1], p[2], col[0], col[1], col[2], col[3]);
  const tri = (a, b, cc, ca, cb, ccc) => { v(a, ca); v(b, cb); v(cc, ccc); };
  const cC = [1, 0.9, 0.94, 0.05], cE = [1, 0.78, 0.86, 0.26];
  for (const z of [d, -d]) {
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n];
      tri([c[0], c[1], z], [a[0] * s, a[1] * s, z], [b[0] * s, b[1] * s, z], cC, cE, cE);
    }
  }
  // parlama: sol lobun üstünde kavisli bir şerit + sağ lobda küçük bir benek (ön yüzün az önünde)
  const strip = (t0, t1, k, w, al) => {
    const N = 14;
    for (let i = 0; i < N; i++) {
      const pt = (u, r) => { const t = (t0 + (t1 - t0) * u) * TAU, x = 16 * Math.pow(Math.sin(t), 3) / 17, y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 1; return [x * r * s, (LIQ_CY + (y - LIQ_CY) * r) * s, d + 0.0012]; };
      const u0 = i / N, u1 = (i + 1) / N, e0 = Math.sin(u0 * Math.PI), e1 = Math.sin(u1 * Math.PI);
      const A = pt(u0, k), B = pt(u1, k), Cc = pt(u1, k - w * e1), D = pt(u0, k - w * e0);
      const ca = [1, 1, 1, al * e0], cb = [1, 1, 1, al * e1];
      tri(A, B, Cc, ca, cb, cb); tri(A, Cc, D, ca, cb, ca);
    }
  };
  strip(0.79, 0.93, 0.88, 0.06, 0.55);
  strip(0.1, 0.16, 0.86, 0.05, 0.4);
}
// altın çerçeve: kalbin kenarını saran bant + ön/arka yüzde camı tutan ince dudaklar (orijin şişenin ucu)
function frameModel(mb) {
  const G = C('#e2b552', -0.8), P = HEART_O, n = P.length, s = HS, d = HD * HS;
  const NE = edgeNormals(P);
  const o = 0.012;               // bandın camdan dışarı taşması (birim)
  const at = (p, nn, k) => [(p[0] + nn[0] * k) * s, (p[1] + nn[1] * k) * s];
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], [na, nb] = NE[i];
    const A = at(a, na, o), B = at(b, nb, o);
    // dış bant
    mb.quadN([A[0], A[1], d + 0.004], [B[0], B[1], d + 0.004], [B[0], B[1], -d - 0.004], [A[0], A[1], -d - 0.004], [na[0], na[1], 0], [nb[0], nb[1], 0], [nb[0], nb[1], 0], [na[0], na[1], 0], G);
    // dudaklar (dışa doğru hafif eğimli)
    for (const sz of [1, -1]) {
      const z0 = sz * (d + 0.004), z1 = sz * d * 0.9;
      const Ai = at(a, na, -0.05), Bi = at(b, nb, -0.05);
      const nA = [na[0] * 0.35, na[1] * 0.35, sz], nB = [nb[0] * 0.35, nb[1] * 0.35, sz];
      mb.quadN([A[0], A[1], z0], [B[0], B[1], z0], [Bi[0], Bi[1], z1], [Ai[0], Ai[1], z1], nA, nB, nB, nA, G);
    }
  }
}
// altın kaide (orijin masada)
function baseModel(mb) {
  const G = C('#d9ad4f', -0.75), Gd = C('#b8892f', -0.6);
  mb.lathe(0, 0, 0, [[0, 0], [0.075, 0], [0.077, 0.004], [0.072, 0.009], [0.04, 0.014], [0.026, 0.02], [0.03, HB - 0.002], [0.034, HB], [0, HB]], 32, (i) => (i >= 5 ? G : Gd));
}
function candleMk(mb) { mb.push().T(0, 0, 0, 0, 0, 0, 0.07); KIT.candle(mb); mb.pop(); }
function flameMk(mb) { mb.push().T(0, 0, 0, 0, 0, 0, 0.07); KIT.flame(mb); mb.pop(); }
const CANDLE = [0.3, 0.06];    // mumun masadaki yeri (x, z)
const ROSE = [-0.3, -0.02];    // gülün yeri
const WICK_Y = 0.0994;         // fitilin ucu (mum tabanından)
function glassMk(mb) { KIT.candleGlass(mb); }   // ham köşeler: ölçek (0.07) çizimde verilir

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');

/* ============================ oyun ============================ */
class LoveGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'uyt', cls: 'uyt', title: 'Ne Kadar Uyumluyuz?', sub: 'Aynı şeyi seçin, kalbi doldurun!', emoji: '💞', css: STYLE, snd: new UySnd(), amb: 'diner', ambVol: 0.4, botPx: 200, botPxL: 40, cloth: '#f6e8ea', trim: '#c2185b', tea: false, lampHex: '#5a1f2e' });
    this.fillK = 0;             // şişenin gösterilen doluluğu (0..1; eşleşme / soru sayısı)
    this.holdT = 0;             // bu zamana kadar iksir yükselmez (açılış efektini bekler)
    this.pulseT = -9;
    this.localPick = null;      // { key, c } — sunucu onaylayana kadar kendi seçimim
    this.pctEl = document.createElement('div');
    this.pctEl.className = 'uy-pct';
    this.el.lbls.appendChild(this.pctEl);
    this.el.posS.textContent = '';
    this.bindUi();
  }
  // iki kişilik küçük, samimi masa
  tableR(n) { return n <= 2 ? 1.02 : super.tableR(n); }

  /* ---------- dünya ---------- */
  world(W) {
    W.base = this.mk(baseModel);
    W.shell = this.mk(shellModel, 'un');
    W.frame = this.mk(frameModel);
    W.liq = {};                 // doluluk (%2 adım) → iksir mesh'i; gerektikçe kurulur
    W.rose = this.mk(roseModel);
    W.cards = OPT_HEX.map((h) => this.mk((mb) => cardModel(mb, h)));
    W.cardB = this.mk(cardBackModel);
    W.candle = this.mk(candleMk);
    W.flame = this.mk(flameMk);
    W.glass = this.mk(glassMk, 'un');
    W.trophy = this.mk(trophyModel);
  }
  liqMesh(f) {
    const q = Math.round(clamp(f, 0, 1) * 50);
    if (!q || !this.W) return null;
    return this.W.liq[q] || (this.W.liq[q] = this.mk((mb) => liquidModel(mb, q / 50)));
  }
  // şişenin hedef doluluğu
  fillTarget() {
    const v = this.view;
    if (!v) return 0;
    if (v.phase === 'intro') return 0.3;
    let m = v.matches || 0;
    if (this.time < this.holdT && v.phase === 'reveal' && v.match) m -= 1;
    return clamp(m / Math.max(1, v.rounds || 1), 0, 1);
  }
  rkey() { const v = this.view; return v ? `${v.game}:${v.round}` : ''; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  myPick() {
    const v = this.view;
    if (!v) return null;
    if (v.myChoice != null) return v.myChoice;
    return this.localPick && this.localPick.key === this.rkey() ? this.localPick.c : null;
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const ch = e.target.closest('[data-ch]');
      if (ch) { this.pick(+ch.dataset.ch); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'uy-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'uy-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('start', { m: this.view?.mode || 'uzun' }); }
      else if (act === 'uy-next') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (this.dead || e.repeat || (e.target && /input|textarea|select/i.test(e.target.tagName || ''))) return;
      const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 }[e.key];
      if (k != null && this.view && this.view.phase === 'answer') { e.preventDefault(); this.pick(k); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  pick(c) {
    const v = this.view;
    if (!v || v.phase !== 'answer' || v.role !== 'player' || this.myPick() != null || !(c >= 0 && c < (v.options || []).length)) return;
    this.localPick = { key: this.rkey(), c, at: this.time };
    try { this.snd.fx('pick'); } catch { /* yok */ }
    vibrate(12);
    this.ctx.send('answer', { choice: c });
    this.bar();
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.uyt !== '1') { root.dataset.uyt = '1'; root.innerHTML = '<p class="py-16 text-center">💞</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // eşim seçti
    if (v.phase === 'answer' && prev && prev.phase === 'answer' && prev.round === v.round && v.answered && prev.answered) {
      v.answered.forEach((x, i) => { if (x && !prev.answered[i] && i !== v.me) { try { this.snd.fx('partner'); } catch { /* yok */ } this.placedT = this.placedT || []; this.placedT[i] = this.time; } });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const sNow = this.ctx.serverNow();
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } this.trophies = []; }
    if (v.phase === 'answer') {
      try { S.music('race'); } catch { /* yok */ }
      this.placedT = [];
      this.ansT = this.time;
      if (sNow - (v.endsAt - (v.ansMs || 6e4)) < 1500) this.msg(`${v.round}. SORU`, 'mid');
    }
    if (v.phase === 'reveal') {
      try { S.music('calm'); } catch { /* yok */ }
      const fresh = sNow - (v.revAt || 0) < 1500;
      this.revT = this.time - (fresh ? 0 : 3);
      this.holdT = fresh ? this.time + 0.65 : 0;
      if (fresh) {
        fx('flip');
        setTimeout(() => {
          if (this.dead || !this.view || this.view.phase !== 'reveal') return;
          if (v.match) {
            fx('match');
            this.pulseT = this.time;
            this.flash('rgba(255,90,140,.4)', true);
            this.msg('💞 EŞLEŞTİNİZ!', 'mid');
            vibrate([30, 40, 30]);
            if (this.X) { const c = [[1, 0.3, 0.5], [1, 0.55, 0.7], [1, 0.85, 0.9], [0.95, 0.2, 0.35]]; this.burst(0, BOTTLE_TOP, 0, 46, c, 1.3, 0.024, true, 1.6, 0.5); }
          } else { fx('miss'); this.msg('😅 FARKLI!', 'mid'); }
        }, 650);
      }
    }
    if (v.phase === 'final') {
      try { S.music('idle'); } catch { /* yok */ }
      const late = sNow - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!late) {
        fx('final');
        this.pulseT = this.time;
        this.msg(`💞 %${v.percent}`, 'big');
        if (this.X && v.percent >= 40) { const c = [[1, 0.3, 0.5], [1, 0.55, 0.7], [1, 0.85, 0.9], [1, 0.8, 0.3]]; this.burst(0, BOTTLE_TOP + 0.05, 0, 80, c, 2.2, 0.03, false, 2.4, 1.6); }
      }
    }
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const heart = [0, BOTTLE_MID, 0];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const other = this.avatarAt(1 - i);
      const oh = other ? other.headW : heart;
      a.idle = a.idle || { lt: 0, look: null };
      if (v.phase === 'answer') {
        const done = (v.answered && v.answered[i]) || (i === v.me && this.myPick() != null);
        if (!done) {
          a.pose(hs(i, v.round) < 0.5 ? 'chin' : 'clasp', { t });
          a.expr = 'tense';
          a.idle.lt -= dt;
          if (a.idle.lt <= 0) { a.idle.lt = 1.5 + Math.random() * 2.5; a.idle.look = Math.random() < 0.55 ? oh : heart; }
          a.look = a.idle.look || heart;
        } else { a.pose('rest', { t }); a.expr = 'smile'; a.look = oh; }
        return;
      }
      if (v.phase === 'reveal') {
        const u = t - (this.revT || 0);
        if (u < 2.6) {
          // kartı kaldırıp karşısındakine gösterir
          a.pose('rest', { t });
          a.k = 10;
          const up = clamp(u / 0.35, 0, 1);
          a.tgt.hand[0] = [lerp(-0.1, -0.11, up), lerp(TABLE_Y + 0.03, 1.0, up), lerp(CARD_Z - 0.04, 0.38, up)];
          a.tgt.fdir[0] = [0.1, 1, 0.25]; a.tgt.palm[0] = [0, 0.1, 1]; a.tgt.fw[0] = 0.8; a.tgt.pole[0] = [-0.9, -0.4, -0.2];
          a.shape[0] = 'grip';
          a.expr = u < 0.7 ? 'o' : v.match ? 'laugh' : 'grin';
          a.look = oh;
          return;
        }
        if (v.match) { a.pose(Math.floor((u - 2.6) / 2) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = oh; }
        else { a.pose(hs(i, v.round) < 0.5 ? 'shrug' : 'lean', { t }); a.expr = 'grin'; a.look = oh; }
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const good = (v.percent || 0) >= 60;
        if (good) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'shrug' : 'clap', { t }); a.expr = 'grin'; }
        a.look = u < 3 ? heart : oh;
        return;
      }
      // giriş: birbirlerine bakıp gülümserler, ara sıra el sallar
      a.pose(Math.floor(t / 6 + i) % 2 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = Math.floor(t / 4 + i * 2) % 3 === 0 ? heart : oh;
    });
  }

  /* ---------- kamera ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    // iksir: hedefe yumuşakça yükselir (ya da yeni oyunda boşalır)
    const tgt = this.fillTarget();
    this.fillK = Math.abs(tgt - this.fillK) < 0.004 ? tgt : damp(this.fillK, tgt, tgt > this.fillK ? 1.5 : 2.5, dt);
    // iksirin içinde yükselen kabarcıklar (ön camın hemen arkasında)
    this.sparkT = (this.sparkT || 0) - dt;
    if (this.sparkT <= 0 && this.X && this.fillK > 0.06) {
      this.sparkT = 0.28 - 0.14 * this.fillK;
      const yTop = liqY(this.fillK), y0 = BOT_Y + 0.35 * HS;
      if (yTop - y0 > 0.02) {
        const y = y0 + Math.random() * (yTop - y0) * 0.6;
        const hw = 0.55 * HS * clamp((y - BOT_Y) / (0.9 * HS), 0.2, 1);
        this.burst((Math.random() - 0.5) * 2 * hw, y, LIQ_D * HS + 0.0035, 1, [[1, 0.75, 0.85], [1, 1, 1]], 0.015, 0.006, true, Math.min(1.2, (yTop - y) / 0.05), -0.08);
      }
    }
    let zoom = 1, pa = 0, yaw = 0, bp = 200, H = [0, BOTTLE_MID, 0], sx = 0.5, sy = 0.3;
    const other = this.avatarAt(v.me >= 0 ? 1 - v.me : 1);
    if (v.phase === 'answer' || v.phase === 'reveal') {
      // omuz üstünden: kamera biraz sağa döner, ben sol altta kalırım; şişe ortada, eşim üstte; altta soru ve şıklar
      H = other ? [other.headW[0] * 0.45, (other.headW[1] + BOTTLE_MID) / 2, other.headW[2] * 0.45] : H;
      zoom = land ? 0.56 : 0.42; pa = land ? -0.1 : -0.22; yaw = land ? 0.25 : 0.38; bp = v.phase === 'reveal' ? 270 : 330;
      sx = land ? 0.34 : 0.5; sy = land ? 0.44 : 0.3;
      // açılışın ilk saniyelerinde eşimin kaldırdığı karta yaklaş
      const u = this.time - (this.revT || 0);
      if (v.phase === 'reveal' && u < 3 && other) {
        H = [other.headW[0] * 0.8, other.headW[1] - 0.12, other.headW[2] * 0.8];
        zoom = land ? 0.42 : 0.32; sy = land ? 0.44 : 0.36;
      }
    } else if (v.phase === 'final') {
      // önce kutlama (çift ve dolu şişe ekranın ortasında), sonra sonuç kartı ekranın çoğunu kaplar: üstteki şeritte kalırlar
      const card = this.ctx.serverNow() - (v.finAt || 0) >= 2400;
      pa = land ? -0.1 : -0.24; yaw = (land ? 0.25 : 0.3) + Math.sin(this.time * 0.2) * 0.08; bp = 200;
      H = other ? [other.headW[0] * 0.35, (other.headW[1] + BOTTLE_MID) / 2, other.headW[2] * 0.35] : [0, BOTTLE_MID + 0.12, 0];
      if (land) { zoom = 0.6; sx = card ? 0.27 : 0.4; sy = 0.45; }
      else if (card) { zoom = 0.85; sx = 0.5; sy = 0.21; }
      else { zoom = 0.48; sx = 0.5; sy = 0.4; }
    } else {
      zoom = land ? 0.7 : 0.62; pa = -0.12; yaw = (land ? 0.3 : 0) + Math.sin(this.time * 0.13) * 0.1; bp = 300;
      H = [0, BOTTLE_MID, 0]; sx = land ? 0.38 : 0.5; sy = land ? 0.5 : 0.3;
    }
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    if (land && this.cfg.botPxL !== 34) { this.cfg.botPxL = 34; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yaw, pa);
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.4, dt);
    c.fx = damp(c.fx, fx, 3, dt); c.fz = damp(c.fz, fz, 3, dt); c.fy = damp(c.fy, fy, 3, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }

  /* ---------- çizim ---------- */
  // eşleşmede şişe bir kalp atışı gibi büyüyüp küçülür; doluysa hafifçe atar
  heartPulse() {
    const u = this.time - this.pulseT;
    const pulse = u >= 0 && u < 1.2 ? Math.sin(Math.min(1, u / 0.16) * Math.PI) * 0.12 * Math.exp(-u * 2.5) + Math.max(0, Math.sin(u * 14)) * 0.04 * Math.exp(-u * 3) : 0;
    const beat = Math.pow(Math.max(0, Math.sin(this.time * 4.2)), 12) * 0.025 * this.fillK;
    return 1 + pulse + beat;
  }
  glowK() { const u = this.time - this.pulseT; return 0.25 + 0.55 * this.fillK + (u >= 0 && u < 1.5 ? 0.8 * Math.exp(-u * 2.2) : 0); }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.base || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T;
    // mum ve gül (masanın ortası)
    M.set(m, CANDLE[0], TABLE_Y + 0.004, CANDLE[1]);
    D(Wd.candle, m, T.obj);
    if (!shadow) {
      const fl = 1 + 0.12 * Math.sin(this.time * 17) * Math.sin(this.time * 6.3);
      M.set(m, CANDLE[0], TABLE_Y + 0.004 + WICK_Y, CANDLE[1], 0, Math.sin(this.time * 3) * 0.08, 0, fl, fl * (1 + 0.1 * Math.sin(this.time * 11)), fl);
      D(Wd.flame, m, T.obj);
    }
    M.set(m, ROSE[0], TABLE_Y + 0.004, ROSE[1], 0.4);
    D(Wd.rose, m, T.obj);
    // kalp şişe: altın kaide + pembe iksir (cam, saydam geçişte)
    M.set(m, 0, TABLE_Y + 0.004, 0);
    D(Wd.base, m, T.obj);
    const ps = this.heartPulse();
    M.set(m, 0, BOT_Y, 0, 0, 0, 0, ps);
    D(Wd.frame, m, T.obj);
    const lq = this.liqMesh(this.fillK);
    if (lq) D(lq, m, T.obj, 1, shadow ? 0 : this.glowK());
    // kartlar: seçen kartını masaya kapalı koyar; açılışta kaldırır
    if (v.phase === 'answer' || v.phase === 'reveal') {
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        const picked = v.phase === 'reveal' ? (v.picks || [])[i] : null;
        const done = (v.answered && v.answered[i]) || (i === v.me && this.myPick() != null);
        if (v.phase === 'answer') {
          if (!done) return;
          const pt = (this.placedT && this.placedT[i]) || (i === v.me && this.localPick ? this.localPick.at : this.time - 1);
          const u = clamp((this.time - pt) / 0.3, 0, 1);
          const q = this.seatW(a, -0.1, TABLE_Y + 0.004 + (1 - u) * 0.12, CARD_Z);
          M.set(mc, q[0], q[1], q[2], a.yaw - 0.2, 0, 0, CARD_S);
          D(Wd.cardB, mc, T.obj);
          return;
        }
        // açılış: elde (sağ el) yüzü karşıya dönük
        if (picked == null) return;
        const u = this.time - (this.revT || 0);
        if (u < 2.6) {
          const h = a.hw[0];
          M.set(mc, h[0], h[1] + 0.13, h[2], a.yaw, Math.PI / 2 - 0.15, 0, CARD_S * 1.3);
        } else {
          const q = this.seatW(a, -0.1, TABLE_Y + 0.006, CARD_Z);
          M.set(mc, q[0], q[1], q[2], a.yaw - 0.2, 0, 0, CARD_S);
        }
        D(Wd.cards[picked] || Wd.cards[0], mc, T.obj);
      });
    }
  }
  drawFx(F, m) {
    const X = this.X, v = this.view;
    if (!v || !this.W) return;
    const gl = X.gl;
    // mumun cam fanusu (normal karışım; kenarları daha mat)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(X.un.u.uAdd, 0);
    M.set(m, CANDLE[0], TABLE_Y + 0.004, CANDLE[1], Math.atan2(this.cam.ex - CANDLE[0], this.cam.ez - CANDLE[1]), 0, 0, 0.07);
    drawMesh(X, this.W.glass, m, ONE3, 1);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    // mum ışığı: alevin hâlesi + masadaki sıcak ışık havuzu
    const fl = 0.85 + 0.15 * Math.sin(this.time * 13) * Math.sin(this.time * 7.3);
    const fy = TABLE_Y + 0.004 + WICK_Y + 0.012;
    const cv = [this.cam.ex - CANDLE[0], this.cam.ey - fy, this.cam.ez - CANDLE[1]];
    M.set(m, CANDLE[0], fy, CANDLE[1], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, 0.07 * fl, 1, 0.07 * fl);
    drawMesh(X, this.res.glow, m, [1, 0.7, 0.3], 0.8);
    M.set(m, CANDLE[0], TABLE_Y + 0.006, CANDLE[1], 0, 0, 0, 0.5 * fl, 1, 0.5 * fl);
    drawMesh(X, this.res.glow, m, [1, 0.6, 0.3], 0.2);
    // kalp şişenin camı (normal karışım) + iksirin pembe hâlesi
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(X.un.u.uAdd, 0);
    M.set(m, 0, BOT_Y, 0, 0, 0, 0, this.heartPulse());
    drawMesh(X, this.W.shell, m, ONE3, 1);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    const k = this.fillK, gk = this.glowK();
    const hy = BOT_Y + 0.75 * HS;
    const cv2 = [this.cam.ex, this.cam.ey - hy, this.cam.ez];
    M.set(m, 0, hy, 0, Math.atan2(cv2[0], cv2[2]), Math.atan2(Math.hypot(cv2[0], cv2[2]), cv2[1]), 0, 0.3, 1, 0.3);
    drawMesh(X, this.res.glow, m, PINK3, 0.1 + 0.3 * k * gk);
    M.set(m, 0, TABLE_Y + 0.006, 0, 0, 0, 0, 0.35 + 0.25 * k, 1, 0.35 + 0.25 * k);
    drawMesh(X, this.res.glow, m, PINK3, 0.05 + 0.2 * k * gk);
    // açılışta kartların parıltısı
    if (v.phase === 'reveal' && this.time - (this.revT || 0) < 2.6) {
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id), c = (v.picks || [])[i];
        if (!a || c == null) return;
        const h = a.hw[0];
        const cv3 = [this.cam.ex - h[0], this.cam.ey - h[1], this.cam.ez - h[2]];
        M.set(m, h[0], h[1] + 0.13, h[2], Math.atan2(cv3[0], cv3[2]), Math.atan2(Math.hypot(cv3[0], cv3[2]), cv3[1]), 0, 0.3, 1, 0.3);
        drawMesh(X, this.res.glow, m, OPT3[c], v.match ? 0.55 : 0.3);
      });
    }
  }

  /* ---------- arayüz ---------- */
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const other = v.seats[v.me >= 0 ? 1 - v.me : 1];
    const otherN = esc(nm0(other?.n || ''));
    if (v.phase === 'answer') {
      const mine = this.myPick();
      let who = '';
      if (v.role !== 'player') who = '👀 Çifti izliyorsun';
      else if (v.qmode === 'guess') who = v.subject === v.me ? '🔮 Tahmin turu · sen kendin için seç, o seni tahmin edecek' : `🔮 Tahmin turu · ${otherN} ne seçer? Tahmin et`;
      else who = '🤝 Ortak tur · ikiniz de kendinize göre seçin';
      const opts = (v.options || []).map((o, i) => `<button data-ch="${i}" style="--oc:${OPT_HEX[i]}" class="${mine === i ? 'on' : ''}" ${mine != null || v.role !== 'player' ? 'disabled' : ''}><i>${OPT_L[i]}</i>${esc(o)}</button>`).join('');
      const pd = v.answered && v.me >= 0 ? v.answered[1 - v.me] : 0;
      const st = v.role !== 'player' ? '' : mine != null ? (pd ? '' : `💌 Seçtin · ${otherN} düşünüyor…`) : pd ? `💌 ${otherN} seçti, sıra sende!` : 'Seçimini yap';
      key = `ans|${v.game}|${v.round}|${mine}|${pd}|${v.role}`;
      html = `<div class="uy-q"><small>${who}</small><b>${esc(v.q || '')}</b></div><div class="uy-opts">${opts}</div><div class="uy-st">${st}</div>`;
    } else if (v.phase === 'reveal') {
      const pk = (v.picks || []).map((c, i) => {
        const p = v.seats[i];
        return `<div style="--oc:${c != null ? OPT_HEX[c] : '#999'}"><i>${c != null ? OPT_L[c] : '?'}</i>${esc(nm0(p?.n || ''))}: ${c != null ? esc((v.options || [])[c] || '') : '<span>seçmedi</span>'}</div>`;
      }).join('');
      // sunucu "devam"ı açılıştan 1,5 sn sonra kabul eder: o zamana kadar düğme pasif
      const early = this.ctx.serverNow() - (v.revAt || 0) < 1500;
      key = `rev|${v.game}|${v.round}|${v.role}|${early}`;
      html = `<div class="uy-res ${v.match ? 'match' : ''}"><div class="big">${v.match ? '💞 Eşleştiniz!' : '😅 Bu sefer farklı!'}</div><div class="qq">${esc(v.q || '')}</div><div class="pk">${pk}</div>${v.role === 'player' ? `<button class="kb" data-act="uy-next" ${early ? 'disabled' : ''}>${v.last ? 'Sonucu gör 💞' : 'Devam ▶'}</button>` : ''}</div>`;
    }
    this.setBar(key, html);
  }
  modeSeg(v) {
    return `<div class="uy-seg" role="group" aria-label="Soru sayısı"><button data-act="uy-mode" data-m="kisa" class="${v.mode === 'kisa' ? 'on' : ''}">💬 6 soru</button><button data-act="uy-mode" data-m="uzun" class="${v.mode !== 'kisa' ? 'on' : ''}">💞 12 soru</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}|${v.role}`;
      html = `<div class="card uy-in">
        <div class="tt">💞 Ne Kadar Uyumluyuz?</div>
        <div class="sub">İki kişilik bir akşam yemeği: aynı şeyi seçin, kalbi doldurun!</div>
        <div class="uy-ru"><div class="a"><b>🔮</b>Birbirinizi tahmin edin</div><div class="g"><b>🤝</b>Kendinize göre seçin</div><div class="y"><b>💞</b>Aynı şık = eşleşme</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="uy-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'Bu oyun iki kişilik: eşini masaya çağır!' : 'Seçimler ikiniz de seçince açılır. Masadaki herkes başlatabilir.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.ctx.serverNow() - (v.finAt || 0) >= 2400) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const nms = (v.seats || []).map((p) => esc(nm0(p.n)));
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      const hist = (v.history || []).map((h) => `<div class="${h.match ? 'm' : ''}">${h.match ? '💞' : '😅'} <b>${esc(h.q)}</b><span>${nms[0] || ''}: ${esc(h.a)} · ${nms[1] || ''}: ${esc(h.b)}</span></div>`).join('');
      html = `<div class="card">
        <div class="tt">${esc(v.label || '')}</div>
        <div class="uy-big">%${v.percent}</div>
        <div class="sub">${v.matches}/${v.rounds} soruda aynı şeyi seçtiniz · ${nms.join(' & ')}</div>
        <div class="uy-hist">${hist}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="uy-start" ${wait ? 'disabled' : ''}>🔁 Tekrar oynayalım</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    let top = '';
    if (v.phase === 'answer') top = `${v.round}/${v.rounds}. soru · %${v.percent} uyum · ⏱ ${mmss((v.endsAt || 0) - this.ctx.serverNow())}`;
    else if (v.phase === 'reveal') top = `${v.round}/${v.rounds}. soru · %${v.percent} uyum`;
    this.top(top);
    // etiketler: seçti mi (✓) / açılışta şık harfi
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase === 'answer') { const d = (v.answered && v.answered[i]) || (i === v.me && this.myPick() != null); x = d ? '<span>💌</span>' : '<span>🤔</span>'; }
      if (v.phase === 'reveal') { const c = (v.picks || [])[i]; x = c != null ? `<i class="uy-k" style="--oc:${OPT_HEX[c]}">${OPT_L[c]}</i>` : '<span>—</span>'; }
      if (o.uyK !== x) {
        o.uyK = x;
        let el = o.lbl.querySelector('.uy-x');
        if (!el) { el = document.createElement('span'); el.className = 'uy-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.uy-x')) o.uyK = '';
  }
  // şişenin üstünde: oyun sürerken toplanan kalpler (eşleşme/soru), sonda uyum yüzdesi
  placeLbls() {
    super.placeLbls();
    const v = this.view, el = this.pctEl;
    // soru ve açılışta kendi etiketim şişenin önüne düşüyor: gizle (durumum alttaki çubukta)
    const mine = v && v.me >= 0 ? this.lbl.get(v.seats[v.me]?.id) : null;
    if (mine && (v.phase === 'answer' || v.phase === 'reveal' || v.phase === 'final')) mine.lbl.style.display = 'none';
    if (!el) return;
    let show = false;
    if (v && v.phase !== 'intro' && !this.flat) {
      const q = this.project(0, BOTTLE_TOP + 0.045, 0);
      if (q) {
        show = true;
        const tx = v.phase === 'final' ? `💞 %${v.percent}` : `💞 ${v.matches}/${v.rounds}`;
        if (el.textContent !== tx) el.textContent = tx;
        el.style.transform = `translate(${Math.round(q[0] - el.offsetWidth / 2)}px,${Math.round(q[1] - el.offsetHeight)}px)`;
      }
    }
    el.style.display = show ? 'block' : 'none';
  }

  /* ---------- 2D yedek ---------- */
  // masanın ortasında kalp şişe: alttan doluluk kadar pembe, üstü cam
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const f = this.fillK, s = r * 0.32, cx = w / 2, by = h * 0.46 + s * 0.85;
    g.save();
    g.translate(cx, by);
    const path = () => { g.beginPath(); HEART_O.forEach(([x, y], i) => (i ? g.lineTo(x * s, -y * s) : g.moveTo(x * s, -y * s))); g.closePath(); };
    path();
    g.fillStyle = 'rgba(230,240,255,.28)'; g.fill();
    g.save(); path(); g.clip();
    const ly = -(LIQ_Y0 + f * (LIQ_Y1 - LIQ_Y0)) * s;
    if (f > 0) { g.fillStyle = '#f01e5e'; g.fillRect(-s, ly, 2 * s, -ly + 2); g.fillStyle = 'rgba(255,160,190,.9)'; g.fillRect(-s, ly, 2 * s, 2.5); }
    g.restore();
    path(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
    g.fillStyle = '#fff'; g.font = '900 16px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(v.phase === 'final' ? `%${v.percent || 0}` : v.phase === 'intro' ? '💞' : `${v.matches || 0}/${v.rounds || 0}`, 0, -0.8 * s);
    g.restore();
  }
  onDispose() { window.removeEventListener('keydown', this.onKey); }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new LoveGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[uyt]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
