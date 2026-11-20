// Doğruluk mu Cesaret mi — 3D şişe çevirmece (NFC Dünyası Oyun)
// Parti masası: masanın ortasında yatan yeşil cam şişe, çevresinde renkli ampullerden bir halka. Sırası gelen şişeyi
// çevirir; şişe dönerken her koltuğun önünden geçişinde tıkırdar, ampuller onun ucunu izler, yavaşlayıp birini gösterir.
// O kişi doğruluk ya da cesaret seçer; masanın ortasından bir kart uçup önüne dikilir (mavi doğruluk, kırmızı cesaret).
// Yaptı mı? Konfeti ve alkış; pas mı? Hüzünlü trombon. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir;
// WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-20-c';
import * as sfx from '../sfx.js?v=2026-11-20-c';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

const BR = 0.047, BS = 2.1;      // şişenin yarıçapı (model) ve ölçeği
const SPIN_TURNS = 3;             // en az kaç tam tur döner
const CW = 0.2, CL = 0.28;        // kartın yarı eni / yarı boyu
const RING_R = 0.8, NB = 20;      // ampul halkası
const BULB_C = ['#ff4d6d', '#ffd23f', '#3ccf6e', '#4aa8ff', '#c77dff', '#ff8a3d'].map(hexRGB);
const BULB_CSS = BULB_C.map((c) => `rgb(${c.map((x) => Math.round(x * 255)).join(',')})`);
const TRUTH3 = [0.3, 0.62, 1], DARE3 = [1, 0.36, 0.24], GOLD3 = [1, 0.85, 0.35];
// parti ışığı: sıcak lamba, mora çalan ortam
const PARTY_L = { sunC: [0.5, 0.43, 0.56], sky: [0.45, 0.37, 0.5], gnd: [0.22, 0.16, 0.22], night: 1, warm: [1, 0.8, 0.64], lampC: [1.45, 1.14, 0.98], fogR: [30, 90], stars: 0, glowS: 0.3 };

const STYLE = `
#ky.dcs .msg{top:13%}
#ky.dcs .dc-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 12px 11px;text-align:center}
#ky.dcs .dc-box.dark{background:#22192d;color:#fff}
#ky.dcs .dc-box .h{font-size:clamp(16px,4.4vw,20px);font-weight:900;line-height:1.18}
#ky.dcs .dc-box .s{font-size:12.5px;font-weight:700;opacity:.75;line-height:1.3;margin-top:3px}
#ky.dcs .dc-row{display:flex;gap:8px;align-items:stretch;justify-content:center;margin-top:8px;flex-wrap:wrap}
#ky.dcs .dc-b{border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);padding:8px 14px;font-weight:900;font-size:15px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.dcs .dc-b.alt{background:#fff}
#ky.dcs .dc-b.ok{background:#3ccf6e;color:#fff}
#ky.dcs .dc-b.no{background:#ff5a36;color:#fff}
#ky.dcs .dc-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:13px;padding:6px 10px}
#ky.dcs .dc-b:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.dcs .dc-b[disabled]{opacity:.5}
#ky.dcs .dc-spin{display:block;width:100%;margin-top:8px;border:4px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);background:linear-gradient(135deg,#1e8a4a,#2fbf6a);color:#fff;padding:14px 10px;font-weight:900;font-size:20px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.dcs .dc-spin small{display:block;font-size:12px;font-weight:700;opacity:.9;margin-top:3px}
#ky.dcs .dc-spin:active:not([disabled]){transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.dcs .dc-spin[disabled]{opacity:.6}
#ky.dcs .dc-pick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
#ky.dcs .dc-pick button{border:4px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);padding:12px 6px 10px;font-weight:900;font-size:18px;color:#fff;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.dcs .dc-pick button span{display:block;font-size:30px;line-height:1.1}
#ky.dcs .dc-pick button small{display:block;font-size:12px;opacity:.9;margin-top:2px}
#ky.dcs .dc-pick button:active:not([disabled]){transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.dcs .dc-pick button[disabled]{opacity:.6}
#ky.dcs .dc-pick .t{background:#3d8bff}
#ky.dcs .dc-pick .d{background:#ff4d3d}
#ky.dcs .dc-card{margin-top:2px;border:4px solid var(--ink);border-radius:18px;padding:9px 12px 11px;color:#fff;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1)}
#ky.dcs .dc-card.truth{background:linear-gradient(160deg,#2f6fe0,#4aa8ff)}
#ky.dcs .dc-card.dare{background:linear-gradient(160deg,#e0322f,#ff7a3d)}
#ky.dcs .dc-card small{display:block;font-size:12px;font-weight:900;letter-spacing:.08em;opacity:.92}
#ky.dcs .dc-card b{display:block;font-size:clamp(17px,4.8vw,21px);font-weight:900;line-height:1.25;margin-top:4px;overflow-wrap:anywhere}
#ky.dcs .dc-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:8px}
#ky.dcs .dc-tm i{display:block;height:100%;background:#ff5a36;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.dcs .dc-res.done{background:#d6f5e0}
#ky.dcs .dc-res.pass{background:#ffe1d6}
#ky.dcs .lbl .dc-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.dcs .lbl .dc-x:empty{display:none}
#ky.dcs .lbl .dc-p{display:inline-block;min-width:16px;padding:0 4px;border-radius:9px;background:#3ccf6e;color:#fff;font-weight:900;font-size:.85em;line-height:1.35;text-align:center}
#ky.dcs .lbl.dc-on{box-shadow:0 0 0 3px #ffd23f,0 0 16px rgba(255,210,63,.8)}
#ky.dcs .card .dc-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.dcs .card .dc-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.dcs .card .dc-seg button.on{background:var(--ink);color:#fff}
#ky.dcs .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.dcs .card .dc-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.dcs .card .dc-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.dcs .card .dc-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.dcs .card .dc-tb{display:grid;gap:5px;margin-top:10px;max-height:min(30vh,250px);overflow:auto;text-align:left}
#ky.dcs .card .dc-tb div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:4px 10px;background:#fff;font-weight:800;font-size:14px;color:var(--ink)}
#ky.dcs .card .dc-tb div.me{background:#fff4c2}
#ky.dcs .card .dc-tb div i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.dcs .card .dc-tb div span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.dcs .card .dc-tb div em{font-style:normal;font-size:11.5px;opacity:.7;font-weight:700;white-space:nowrap}
#ky.dcs .card .dc-tb div b{font-weight:900;white-space:nowrap}
#ky.dcs .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.dcs .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.dcs .dc-box{width:min(450px,52vw);padding:6px 10px 8px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.dcs .dc-box .h{font-size:16px}
#ky.dcs .dc-row{margin-top:5px}
#ky.dcs .dc-b{padding:6px 11px;font-size:14px}
#ky.dcs .dc-pick{margin-top:5px}
#ky.dcs .dc-pick button{padding:6px 6px 5px;font-size:15px}#ky.dcs .dc-pick button span{font-size:21px}
#ky.dcs .dc-card{padding:6px 10px 7px}#ky.dcs .dc-card b{font-size:15px}
#ky.dcs .dc-spin{padding:9px 8px;font-size:17px}
#ky.dcs .dc-tm{margin-top:5px}
#ky.dcs .card .dc-tb{max-height:24vh;margin-top:6px}
#ky.dcs .card .dc-ru{margin-top:6px}#ky.dcs .card .dc-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.dcs .card .dc-ru div b{font-size:17px}
#ky.dcs .card .dc-seg{margin-top:6px}#ky.dcs .card .dc-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.dcs .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// Parti popu (Do majör, 118 bpm): dörtlük kick, el çırpma, zıplayan bas, ara vuruşta akor, parlak melodi.
// Seçim ve kart sırasında daha hafif bir groove (melodi yok); giriş ve final tam parti.
class DcSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.2; }
  tempo() { return this.mode === 'race' ? 104 : 118; }
  swing() { return 0.03; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    // C – Am – F – G
    const CH = [[36, [60, 64, 67]], [33, [57, 60, 64]], [41, [57, 60, 65]], [43, [59, 62, 67]]];
    const [root, ch] = CH[bar % 4];
    const soft = this.mode === 'race';
    if (s % 4 === 0) this.iKick(t, soft ? 0.09 : 0.13, 120, 45, 0.2);
    if (s === 4 || s === 12) this.iClap(t, soft ? 0.035 : 0.06);
    if (s % 2 === 1) this.iHat(t, soft ? 0.006 : 0.009);
    if (!soft && s % 4 === 2) this.iHat(t, 0.016, true);
    const BL = [0, null, 12, null, 0, null, 12, 7, 0, null, 12, null, 0, 12, 7, null];
    if (BL[s] != null) this.iBass(t, root + BL[s], st * 1.6, soft ? 0.075 : 0.1, 'saw', soft ? 650 : 1000);
    if (s % 4 === 2) ch.forEach((m, k) => this.iPluck(t + k * 0.004, m + 12, (soft ? 0.016 : 0.022) * (k ? 0.8 : 1), 0.2, 'square', soft ? 1800 : 2600, 0.18));
    if (!soft) {
      const MEL = [79, null, 76, 79, 81, null, 79, 76, 74, null, 72, 74, 76, null, null, null];
      const m = MEL[(bar % 2) * 8 + (s >> 1)];
      if (s % 2 === 0 && m != null && bar % 4 !== 3) this.iPluck(t, m, 0.032, st * 1.7, 'square', 3200, 0.22);
      if (s === 0 && bar % 4 === 3) this.iBell(t, 84, 0.022, spb * 1.5, 0.3);
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((x) => x - 12), spb * 4, 0.012, 1400, 0.3);
    }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'spin': // şişeye fiske + camın masada dönüşü (yavaşlayarak)
        this.duck(0.45, 3.6);
        this.noise(t, 0.05, 0.2, { type: 'bandpass', freq: 2600, q: 2 });
        this.tone(330, t, 0.05, 'triangle', 0.08, 220, 0.001);
        this.noise(t + 0.02, 3.3, 0.08, { type: 'bandpass', freq: 950, to: 260, q: 0.9, attack: 0.06 });
        this.tone(150, t + 0.02, 3.2, 'triangle', 0.025, 70, 0.08);
        break;
      case 'stop': // şişe durdu
        this.tone(200, t, 0.14, 'sine', 0.22, 100, 0.002);
        [[784, 0.06], [1047, 0.16]].forEach(([f, d]) => this.tone(f, t + d, 0.3, 'triangle', 0.08, null, 0.003));
        break;
      case 'you': // şişe beni gösterdi
        this.duck(0.3, 1.4);
        [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]].forEach(([f, d]) => this.tone(f, t + d, d > 0.2 ? 0.4 : 0.14, 'square', 0.06, null, 0.003));
        break;
      case 'truth': [1047, 1319, 1568].forEach((f, i) => this.tone(f, t + i * 0.07, 0.45, 'sine', 0.09, null, 0.003)); break;
      case 'dare':
        this.iBrass(t, 60, 0.16, 0.08, 0.15); this.iBrass(t + 0.17, 67, 0.45, 0.08, 0.15);
        this.noise(t + 0.17, 0.4, 0.07, { type: 'highpass', freq: 4200 });
        break;
      case 'done':
        this.duck(0.2, 2.2);
        [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.55]].forEach(([f, d, L]) => this.tone(f, t + d, L, 'triangle', 0.1));
        this.cheer(t + 0.1, 1.8);
        break;
      case 'champ':
        this.duck(0.15, 3);
        [[60, 0, 0.14], [60, 0.15, 0.14], [60, 0.3, 0.14], [64, 0.45, 0.5], [67, 0.62, 0.9]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.07, 0.15); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// yeşil cam şişe: yatay, boynu +z'de; orijin şişenin ortası, masaya değen alt yüzü y=0
function bottleModel(mb) {
  const Gl = C('#25a35a', -0.92), Lb = C('#f4ead2', -0.3), Rd = C('#d7263d', -0.4), Au = C('#e2b552', -0.85);
  const P = [[0, 0], [0.042, 0], [0.046, 0.006], [0.047, 0.02], [0.047, 0.07], [0.047, 0.095], [0.047, 0.115], [0.047, 0.14], [0.047, 0.17], [0.044, 0.2], [0.03, 0.235], [0.016, 0.26], [0.015, 0.3], [0.0172, 0.303], [0.0172, 0.322], [0.012, 0.326], [0, 0.326]];
  const col = (i) => (i === 4 || i === 6 ? Lb : i === 5 ? Rd : i >= 13 ? Au : Gl);
  mb.push().T(0, BR, 0, 0, Math.PI / 2, 0, 1);
  mb.lathe(0, -0.165, 0, P, 22, col);
  mb.pop();
}
// kart (XY düzleminde): yüzü +z (dokulu ayrı çizilir), sırtı -z (pembe, sarı benekli)
function cardBack(mb) {
  const W = C('#ffffff', -0.3), Pk = C('#ff4d9d', -0.5), Yl = C('#ffd23f', -0.6);
  mb.rbox(-CW, -CL, -0.002, CW, CL, 0.002, 0.004, W, 1);
  mb.rbox(-CW + 0.012, -CL + 0.012, -0.0027, CW - 0.012, CL - 0.012, -0.0012, 0.002, Pk, 1);
  mb.sphereS(0, 0, -0.003, 0.046, 0.046, 0.0016, Yl, 16, 4);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.sphereS(sx * (CW - 0.036), sy * (CL - 0.036), -0.003, 0.016, 0.016, 0.0014, Yl, 10, 3);
}
function cardFace(tb, u0, u1) {
  const z = 0.0026, x0 = -CW + 0.006, x1 = CW - 0.006, y0 = -CL + 0.006, y1 = CL - 0.006;
  tb.tquad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], u0, 0, u1, 1, [0, 0, -1]);
}
function bulbModel(mb) { mb.sphereS(0, 0.046, 0, 0.026, 0.036, 0.026, C('#ffffff', 1), 12, 8); }
function socketModel(mb) { mb.lathe(0, 0, 0, [[0, 0], [0.018, 0], [0.018, 0.016], [0.014, 0.022], [0, 0.022]], 10, C('#1d3b25', -0.3)); }
function cableModel(mb) {
  const K2 = C('#1d3b25', -0.25), pts = [], n = NB * 4;
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, r = RING_R + Math.sin(a * NB * 2) * 0.012; pts.push([Math.sin(a) * r, 0.004, Math.cos(a) * r]); }
  for (let i = 0; i + 1 < pts.length; i++) limb(mb, pts[i], pts[i + 1], [0.005, 0.005], K2, 5);
}
// kart yüzü dokusu: sol yarı doğruluk (konuşma balonu), sağ yarı cesaret (alev)
function drawFaces(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, hw = W / 2;
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  [['DOĞRULUK', '+1 puan', '#2456c8', '#4aa8ff'], ['CESARET', '+2 puan', '#c8261c', '#ff7a3d']].forEach(([txt, pts, c0, c1], k) => {
    const x0 = k * hw, cx = x0 + hw / 2;
    const gr = g.createLinearGradient(x0, 0, x0 + hw, H);
    gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.fillRect(x0, 0, hw, H);
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 9; g.strokeRect(x0 + 14, 14, hw - 28, H - 28);
    g.fillStyle = '#fff';
    const iy = H * 0.38;
    if (!k) {
      // konuşma balonu ve soru işareti
      const bw = 150, bh = 104, bx = cx - bw / 2, by = iy - bh / 2 - 8, r = 30;
      g.beginPath();
      g.moveTo(bx + r, by); g.arcTo(bx + bw, by, bx + bw, by + bh, r); g.arcTo(bx + bw, by + bh, bx, by + bh, r);
      g.lineTo(cx - 6, by + bh); g.lineTo(cx - 36, by + bh + 34); g.lineTo(cx - 34, by + bh);
      g.arcTo(bx, by + bh, bx, by, r); g.arcTo(bx, by, bx + bw, by, r); g.closePath(); g.fill();
      g.fillStyle = c0; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 84px ${F}`;
      g.fillText('?', cx, by + bh / 2 + 4);
    } else {
      // alev
      const s = 1.15;
      g.beginPath();
      g.moveTo(cx, iy + 62 * s);
      g.bezierCurveTo(cx - 62 * s, iy + 60 * s, cx - 64 * s, iy - 4 * s, cx - 30 * s, iy - 40 * s);
      g.bezierCurveTo(cx - 26 * s, iy - 14 * s, cx - 14 * s, iy - 6 * s, cx - 8 * s, iy - 12 * s);
      g.bezierCurveTo(cx - 20 * s, iy - 48 * s, cx + 4 * s, iy - 76 * s, cx + 14 * s, iy - 88 * s);
      g.bezierCurveTo(cx + 18 * s, iy - 50 * s, cx + 58 * s, iy - 30 * s, cx + 56 * s, iy + 14 * s);
      g.bezierCurveTo(cx + 56 * s, iy + 44 * s, cx + 36 * s, iy + 62 * s, cx, iy + 62 * s);
      g.closePath(); g.fill();
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.moveTo(cx, iy + 56 * s);
      g.bezierCurveTo(cx - 28 * s, iy + 54 * s, cx - 30 * s, iy + 22 * s, cx - 12 * s, iy + 4 * s);
      g.bezierCurveTo(cx - 8 * s, iy + 18 * s, cx + 2 * s, iy + 20 * s, cx + 4 * s, iy + 10 * s);
      g.bezierCurveTo(cx + 22 * s, iy + 20 * s, cx + 28 * s, iy + 54 * s, cx, iy + 56 * s);
      g.closePath(); g.fill();
    }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 52; g.font = `800 ${fs}px ${F}`;
    while (fs > 26 && g.measureText(txt).width > hw - 48) { fs -= 2; g.font = `800 ${fs}px ${F}`; }
    g.fillText(txt, cx, H * 0.74);
    g.font = `700 30px ${F}`;
    g.fillText(pts, cx, H * 0.86);
  });
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeSpin = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3.2);

/* ============================ oyun ============================ */
class DareGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'dcs', cls: 'dcs', title: 'Doğruluk mu Cesaret mi?', sub: 'Şişeyi çevir!', emoji: '🍾', css: STYLE, snd: new DcSnd(), amb: 'diner', ambVol: 0.4, botPx: 240, botPxL: 34, cloth: '#33306e', trim: '#ffd23f', tea: false, chairPad: '#e0457b', light: PARTY_L, fog: '#170d1f', roomStyle: { wall: '#2a1f45', curtain: '#b83a6e' } });
    this.bYaw = 0.6;            // şişenin yönü (dünya)
    this.spin = null;           // { seq, a0, a1, at (sunucu), ms, target, done }
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.bottle = this.mk(bottleModel);
    W.cardB = this.mk(cardBack);
    W.faceT = this.mk((tb) => cardFace(tb, 0, 0.5), 'tex');
    W.faceD = this.mk((tb) => cardFace(tb, 0.5, 1), 'tex');
    W.bulb = this.mk(bulbModel);
    W.socket = this.mk(socketModel);
    W.cable = this.mk(cableModel);
    W.trophy = this.mk(trophyModel);
    this.bulbs = Array.from({ length: NB }, (_, i) => { const a = ((i + 0.5) / NB) * TAU; return { a, p: [Math.sin(a) * RING_R, TABLE_Y + 0.004, Math.cos(a) * RING_R], c: BULB_C[i % BULB_C.length], ph: hs(i, 7) * TAU, k: 0.5 }; });
    this.faceCv = document.createElement('canvas');
    this.faceCv.width = 512; this.faceCv.height = 354;
    try { drawFaces(this.faceCv); } catch { /* yok */ }
    this.faceTex = makeTexture(this.X, this.faceCv);
    // yazı tipi geç yüklenirse yüzleri bir kez daha çiz
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.faceTex || !this.X || this.X.gl.isContextLost()) return; drawFaces(this.faceCv); updateTexture(this.X, this.faceTex, this.faceCv); }); } catch { /* yok */ }
  }
  freeTex() { if (this.faceTex && this.X) this.X.gl.deleteTexture(this.faceTex); this.faceTex = null; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  yawTo(i) { const a = this.avatarAt(i); return a ? Math.atan2(a.pos[0], a.pos[2]) : this.bYaw; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'dc-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'dc-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'dc-spin') { vibrate(25); b.disabled = true; this.ctx.send('spin', {}); setTimeout(() => { b.disabled = false; }, 1500); }
      else if (act === 'dc-choose') { this.fx('pop'); vibrate(15); this.ctx.send('choose', { type: b.dataset.t }); }
      else if (act === 'dc-swap') { this.fx('paper'); b.disabled = true; this.ctx.send('swap', {}); }
      else if (act === 'dc-done' || act === 'dc-pass') { this.fx('pop'); this.ctx.send(act === 'dc-done' ? 'done' : 'pass', {}); }
      else if (act === 'dc-skip') { this.fx('pop'); this.ctx.send('skip', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.dcs !== '1') { root.dataset.dcs = '1'; root.innerHTML = '<p class="py-16 text-center">🍾</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    // şişe çevrildi: hedefin yönüne en az 3 tur dönerek gider (sunucu saatine göre, herkeste aynı anda durur)
    if (v.spinAt && v.target >= 0 && (!this.spin || this.spin.seq !== v.spinSeq)) {
      const end = this.yawTo(v.target), a0 = this.bYaw, ms = v.spinMs || 3400;
      let d = (end - a0) % TAU;
      if (d < 0) d += TAU;
      this.spin = { seq: v.spinSeq, a0, a1: a0 + d + SPIN_TURNS * TAU, at: v.spinAt, ms, target: v.target, done: false };
      if (ctx.serverNow() - v.spinAt > ms - 150) { this.spin.done = true; this.bYaw = this.spin.a1; }
      else if (v.phase === 'spin') this.fx('spin');
    }
    const key = `${v.game}:${v.turn}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.ctx.serverNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'spin') {
      mus('idle');
      if (fresh && v.isSpinner && !v.spinAt) { this.msg('🍾 ŞİŞEYİ ÇEVİR', 'mid'); vibrate(20); }
    }
    if (v.phase === 'choose') {
      mus('race');
      this.chooseT = this.time;
      if (fresh) {
        this.fx(v.isTarget ? 'you' : 'stop');
        if (v.isTarget) { this.msg('🎯 SIRA SENDE!', 'mid'); vibrate([30, 40, 30]); }
        else this.msg(`🎯 ${esc(nm0(v.seats[v.target]?.n || ''))}`, 'mid');
      }
    }
    if (v.phase === 'card') {
      mus('race');
      this.cardT = this.time - (fresh ? 0 : 9);
      if (fresh) { this.fx(v.type === 'dare' ? 'dare' : 'truth'); this.fx('paper'); }
    }
    if (v.phase === 'outcome') {
      mus('idle');
      this.outT = this.time - (fresh ? 0 : 9);
      if (this.cardT == null) this.cardT = this.time - 9;
      if (fresh) {
        if (v.outcome === 'done') {
          this.fx('done');
          this.msg(`✓ +${v.pts}`, 'big');
          const a = this.avatarAt(v.target);
          if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.35, a.headW[2], v.type === 'dare' ? 60 : 36, [[1, 0.3, 0.5], [1, 0.85, 0.25], [0.3, 0.85, 0.5], [0.35, 0.6, 1], [1, 1, 1]], 2.2, 0.03, false, 2, 2.4);
          if (v.isTarget) vibrate([30, 40, 30]);
        } else if (v.outcome === 'pass') { this.fx('trombone'); this.msg('✗ PAS', 'mid'); }
        else this.msg(v.outcome === 'skip' ? '⏭ GEÇİLDİ' : '👋 AYRILDI', 'mid');
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.ctx.serverNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!late) {
        this.fx('champ');
        const c = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n || '')));
        this.msg(c.length ? `🏆 ${c.join(' & ')}` : 'OYUN BİTTİ', 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, [[1, 0.85, 0.3], [1, 0.4, 0.5], [0.3, 0.8, 1], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.2); });
      }
    }
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const neck = [Math.sin(this.bYaw) * 0.3, TABLE_Y + 0.08, Math.cos(this.bYaw) * 0.3];
    const center = [0, TABLE_Y + 0.12, 0];
    const tgA = v.target >= 0 ? this.avatarAt(v.target) : null;
    const spinning = !!(this.spin && !this.spin.done);
    const su = this.spin ? (this.ctx.serverNow() - this.spin.at) / this.spin.ms : 1;
    const champA = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
    const cardP = this.cardPos();
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.dcI || (a.dcI = { lt: 0, look: null });
      const idleLook = () => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.3 + Math.random() * 2.6;
          idle.look = P.length && Math.random() < 0.8 ? P[Math.floor(Math.random() * P.length)] : center;
        }
        return idle.look;
      };
      const isT = i === v.target, isS = i === v.spinner;
      if (v.phase === 'spin') {
        if (v.spinAt && spinning) {
          if (isS && su < 0.3) {
            // fiske: el masanın üstünde hızla yana süpürülür
            const w = clamp(su / 0.2, 0, 1);
            a.pose('rest', { t, k: 18 });
            a.tgt.hand[0] = [lerp(-0.32, 0.1, w), TABLE_Y + 0.1, 0.64];
            a.tgt.palm[0] = [1, -0.2, 0]; a.tgt.fdir[0] = [0.15, -0.1, 1];
            a.shape[0] = 'open';
            a.expr = 'grin';
          } else { a.pose(hs(i, v.turn) < 0.55 ? 'clasp' : 'bite', { t }); a.expr = hs(i, v.turn + 1) < 0.5 ? 'tense' : 'o'; }
          a.look = neck;
          return;
        }
        if (v.spinAt) { a.pose('rest', { t }); a.look = tgA && !isT ? tgA.headW : neck; a.expr = 'o'; return; }
        if (isS) { a.pose('rest', { t }); a.pointAt(center, 0); a.shape[0] = 'point'; a.expr = 'grin'; a.look = neck; return; }
        a.pose(Math.floor(t / 5 + i) % 3 === 0 ? 'chin' : 'rest', { t }); a.expr = 'smile';
        const sA = this.avatarAt(v.spinner);
        a.look = Math.floor(t / 2.2 + i) % 2 && sA ? sA.headW : neck;
        return;
      }
      if (v.phase === 'choose') {
        if (isT) { const u = t - (this.chooseT ?? t); a.pose(u < 1.6 ? 'headgrab' : 'chin', { t }); a.expr = u < 1.6 ? 'o' : 'tense'; a.look = u < 1.6 ? neck : idleLook(); return; }
        a.pose(hs(i, v.turn + 3) < 0.5 ? 'lean' : 'clasp', { t }); a.expr = 'grin';
        a.look = tgA ? tgA.headW : center;
        return;
      }
      if (v.phase === 'card') {
        if (isT) {
          const u = t - (this.cardT ?? t);
          if (u < 2.4) { a.pose(u < 1.2 ? 'rest' : 'chin', { t }); a.expr = 'o'; a.look = cardP || center; return; }
          if (v.type === 'dare') {
            // cesaret: oynar gibi hareketler
            const k = Math.floor(t * 1.7 + i) % 4;
            a.pose(['cheer', 'wave', 'clap', 'shrug'][k], { t }); a.expr = k % 2 ? 'laugh' : 'grin';
          } else {
            // doğruluk: anlatır (el hareketleri, ağız açılıp kapanır)
            a.pose('rest', { t });
            const w = Math.sin(t * 5.2), w2 = Math.sin(t * 3.1);
            a.tgt.hand[1] = [0.13 + w * 0.05, 0.98 + w2 * 0.05, 0.36];
            a.tgt.fdir[1] = [-0.2, 0.6, 0.8]; a.tgt.palm[1] = [-0.3, 0.6, 0.6]; a.tgt.fw[1] = 0.6; a.tgt.pole[1] = [0.9, -0.5, -0.1];
            a.shape[1] = 'open';
            a.expr = Math.floor(t * 7) % 2 ? 'o' : 'smile';
          }
          a.look = idleLook();
          return;
        }
        a.pose(Math.floor(t / 3 + i) % 3 === 0 ? 'clap' : isS ? 'lean' : 'rest', { t }); a.expr = Math.floor(t / 2 + i) % 2 ? 'laugh' : 'grin';
        a.look = tgA ? tgA.headW : center;
        return;
      }
      if (v.phase === 'outcome') {
        const ok = v.outcome === 'done';
        if (isT) { a.pose(ok ? 'cheer' : v.outcome === 'pass' ? 'facepalm' : 'rest', { t }); a.expr = ok ? 'laugh' : 'wince'; a.look = center; return; }
        a.pose(ok ? 'clap' : hs(i, v.turn) < 0.5 ? 'lean' : 'shrug', { t }); a.expr = ok ? 'laugh' : 'grin';
        a.look = tgA ? tgA.headW : center;
        return;
      }
      if (v.phase === 'final') {
        const champ = (v.champ || []).includes(i), u = t - (this.finT || 0);
        if (champ) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'wave', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; a.look = champA ? champA.headW : idleLook(); }
        return;
      }
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = idleLook();
    });
  }

  /* ---------- kamera + şişe ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time;
    // şişe
    if (this.spin && !this.spin.done) {
      const S2 = this.spin;
      const u = (this.ctx.serverNow() - S2.at) / S2.ms;
      const prevA = this.bYaw;
      this.bYaw = lerp(S2.a0, S2.a1, easeSpin(u));
      // boyun her koltuğun önünden geçince çark gibi tıkırdar (yavaşladıkça seyrekleşir ve belirginleşir)
      if (v.phase === 'spin') this.seats.forEach((p, i) => {
        const sy = this.yawTo(i), d0 = angDiff(prevA, sy), d1 = angDiff(this.bYaw, sy);
        if (d0 < 0 && d1 >= 0 && d1 - d0 < Math.PI) this.fx('tick', clamp(1 - u, 0, 1));
      });
      if (u >= 1) { S2.done = true; this.bYaw = S2.a1; }
    } else if (this.spin && v.target >= 0 && (v.phase === 'choose' || v.phase === 'card' || v.phase === 'outcome')) {
      // yerleşim değişirse (biri gelir/gider, ekran döner) şişe hedefi göstermeye devam etsin
      this.bYaw += angDiff(this.yawTo(v.target), this.bYaw) * (1 - Math.exp(-4 * dt));
    } else if (v.phase === 'intro' || v.phase === 'final') this.bYaw += dt * 0.35;
    // ampuller: şişenin ucunu izler; girişte ve finalde dönen ışık, yapıldığında yanıp söner
    if (this.bulbs) {
      const sp = !!(this.spin && !this.spin.done);
      const aim = v.target >= 0 && !sp && (v.phase === 'choose' || v.phase === 'card' || v.phase === 'outcome' || (v.phase === 'spin' && v.spinAt));
      this.bulbs.forEach((b, i) => {
        const tw = 0.5 + 0.18 * Math.sin(t * 2.6 + b.ph);
        const near = Math.pow(Math.max(0, Math.cos(angDiff(b.a, this.bYaw))), 26);
        let k = tw;
        if (v.phase === 'intro' || v.phase === 'final') k = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(b.a - t * 2.4), 5);
        else if (v.phase === 'outcome' && v.outcome === 'done') k = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 13 + i * 1.1));
        else if (v.phase === 'outcome') k = 0.28;
        else if (sp) k = 0.32 + 0.68 * near;
        else if (aim) k = tw * 0.75 + near * (0.75 + 0.25 * Math.sin(t * 8));
        b.k = damp(b.k, clamp(k, 0, 1.2), sp ? 30 : 9, dt);
      });
    }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = 240, H = [0, TABLE_Y + 0.3, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.38;
    const focus = (i, z = 0.62) => {
      const a = i >= 0 ? this.avatarAt(i) : null;
      if (!a || !a.headW) return false;
      zoom = z; sy = land ? 0.45 : 0.32; H = [a.headW[0] * 0.75, a.headW[1] - 0.2, a.headW[2] * 0.75]; yawC = Math.atan2(-a.pos[0], -a.pos[2]);
      return true;
    };
    if (v.phase === 'spin') { zoom = 0.86; bp = v.spinAt ? 180 : 250; pa = 0.1; sy = land ? 0.5 : 0.4; }
    else if (v.phase === 'choose') { bp = 300; if (!focus(v.target, 0.44)) zoom = 0.9; }
    else if (v.phase === 'card') { bp = 330; if (!focus(v.target, 0.46)) zoom = 0.9; }
    else if (v.phase === 'outcome') { bp = 200; if (!focus(v.target, 0.52)) zoom = 0.9; }
    else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // son saniyeler: tıkırtı (benden bir hamle bekleniyorsa)
    const left = (v.endsAt || 0) - this.ctx.serverNow();
    const urgent = (v.phase === 'spin' && v.isSpinner && !v.spinAt) || (v.phase === 'choose' && v.isTarget);
    if (urgent && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.6); } }
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
  // kart: masanın ortasından kalkıp hedefin önüne uçar, kameraya dönük dikilir; sonuçta havalanıp kaybolur
  cardState() {
    const v = this.view;
    if (!v || !(v.phase === 'card' || v.phase === 'outcome') || v.target < 0) return null;
    const a = this.avatarAt(v.target);
    if (!a) return null;
    const u = clamp((this.time - (this.cardT ?? this.time - 9)) / 0.75, 0, 1), e = 1 - Math.pow(1 - u, 3);
    const phi = Math.atan2(-a.pos[0], -a.pos[2]);
    const q = this.seatW(a, 0, 0, 1.0);
    const tilt = 0.3;
    const yStand = TABLE_Y + 0.004 + CL * Math.cos(tilt), yFlat = TABLE_Y + 0.005;
    const x = lerp(q[0] * 0.15, q[0], e), z = lerp(q[2] * 0.15, q[2], e);
    let y = lerp(yFlat, yStand, e) + Math.sin(u * Math.PI) * 0.3;
    const rx = lerp(Math.PI / 2, -tilt, e);
    let s = 1;
    if (v.phase === 'outcome') {
      const o = clamp((this.time - (this.outT ?? this.time - 9)) / 0.7, 0, 1);
      y += o * 0.3; s = 1 - o * o;
      if (s < 0.02) return null;
    }
    return { x, y, z, phi, rx, s };
  }
  cardMat(m) { const c = this.cardState(); if (!c) return false; M.set(m, c.x, c.y, c.z, c.phi, c.rx, 0, c.s); return true; }
  cardPos() { const c = this.cardState(); return c ? [c.x, c.y, c.z] : null; }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.bottle || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T;
    // şişe (dönerken hafif sallanır)
    const sp = this.spin && !this.spin.done;
    const hop = sp ? Math.abs(Math.sin(this.time * 19)) * 0.003 : 0;
    M.set(m, 0, TABLE_Y + 0.003 + hop, 0, this.bYaw, 0, sp ? Math.sin(this.time * 9) * 0.05 : 0, BS);
    D(Wd.bottle, m, T.obj);
    // kart
    if (this.cardMat(mc)) D(Wd.cardB, mc, T.obj);
    if (shadow) return;
    // ampul halkası
    M.set(m, 0, TABLE_Y, 0);
    D(Wd.cable, m, T.obj);
    const tc = this.bT || (this.bT = new Float32Array(3));
    (this.bulbs || []).forEach((b) => {
      M.set(m, b.p[0], b.p[1], b.p[2]);
      D(Wd.socket, m, T.obj);
      const k = 0.25 + 0.95 * b.k;
      tc[0] = Math.min(1.4, b.c[0] * k + 0.25 * b.k); tc[1] = Math.min(1.4, b.c[1] * k + 0.25 * b.k); tc[2] = Math.min(1.4, b.c[2] * k + 0.25 * b.k);
      D(Wd.bulb, m, tc, 1, 1);
    });
    // final: şampiyonun önünde kupa
    if (v.phase === 'final') {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, 0, TABLE_Y + 0.004, 0.62);
        const u = clamp((this.time - (this.finT || 0) - 0.8) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], this.time * 0.8, 0, 0, 1.35 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.faceT || !this.faceTex || !v) return;
    const mc = this.mats.c;
    if (!this.cardMat(mc)) return;
    gl.uniform1f(X.tex.u.uSelf, 0.32);
    gl.bindTexture(gl.TEXTURE_2D, this.faceTex);
    drawMesh(X, v.type === 'dare' ? Wd.faceD : Wd.faceT, mc, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const X = this.X, v = this.view;
    if (!v || !this.W) return;
    const t = this.time;
    const sp = this.spin && !this.spin.done;
    // dönerken boynun ucunda parıltı
    if (sp) this.glow(m, [Math.sin(this.bYaw) * 0.17 * BS, TABLE_Y + 0.05 * BS, Math.cos(this.bYaw) * 0.17 * BS], 0.16, [1, 1, 0.85], 0.5);
    // şişeden hedefe uzanan ışık izi ve hedefin çevresinde renkli hâle
    if (!sp && v.target >= 0 && (v.phase === 'choose' || v.phase === 'card' || v.phase === 'outcome' || (v.phase === 'spin' && v.spinAt))) {
      const a = this.avatarAt(v.target);
      if (a && a.headW) {
        const n = 8, run = (t * 1.6) % 1;
        for (let k = 0; k < n; k++) {
          const f = 0.3 + ((k + run) / n) * 0.62;
          M.set(m, a.pos[0] * f * 0.8, TABLE_Y + 0.009, a.pos[2] * f * 0.8, 0, 0, 0, 0.07, 1, 0.07);
          drawMesh(X, this.res.glow, m, GOLD3, 0.2 + 0.45 * ((k + run) / n));
        }
        const col = v.type === 'dare' ? DARE3 : v.type === 'truth' ? TRUTH3 : GOLD3;
        this.glow(m, [a.headW[0], a.headW[1] - 0.25, a.headW[2]], 0.8, col, 0.14 + 0.04 * Math.sin(t * 4));
      }
    }
    // kartın çevresinde renkli hâle
    const cs = this.cardState();
    if (cs) this.glow(m, [cs.x, cs.y, cs.z], 0.42 * cs.s, v.type === 'dare' ? DARE3 : TRUTH3, 0.2);
  }
  // ampullerin hâlesi: tek seferde yumuşak parçacık olarak
  extraParts(V, emit) {
    (this.bulbs || []).forEach((b) => {
      const k = b.k;
      emit(b.p[0], b.p[1] + 0.046, b.p[2], 0.05 + 0.08 * k, b.c[0], b.c[1], b.c[2], 0.15 + 0.5 * k, true);
    });
  }

  /* ---------- arayüz ---------- */
  timerBar(left, total) { return `<div class="dc-tm"><i style="transform:scaleX(${clamp(left / Math.max(1, total), 0, 1).toFixed(3)})"></i></div>`; }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
    const left = (v.endsAt || 0) - this.ctx.serverNow();
    const host = this.ctx.isHost;
    if (v.phase === 'spin') {
      if (v.spinAt) { key = `spin|go|${v.game}|${v.turn}`; html = `<div class="dc-box dark"><div class="h">🌀 Şişe dönüyor…</div><div class="s">${v.isSpinner ? 'Sen çevirdin' : `${nm(v.spinner)} çevirdi`} · kimi gösterecek? 👀</div></div>`; }
      else if (v.isSpinner) { key = `spin|me|${v.game}|${v.turn}`; html = `<div class="dc-box"><div class="h">🍾 Şişeyi çevirme sırası sende!</div><button class="dc-spin" data-act="dc-spin">Şişeyi çevir 🍾<small>Kimi gösterirse o seçer: doğruluk mu, cesaret mi?</small></button>${this.timerBar(left, 12e3)}</div>`; }
      else {
        const off = !v.seats[v.spinner]?.on;
        key = `spin|o|${v.game}|${v.turn}|${v.spinner}|${host && off}`;
        html = `<div class="dc-box dark"><div class="h">🍾 ${nm(v.spinner)} şişeyi çeviriyor…</div><div class="s">${v.turn}/${v.total}. tur · şişe kimi gösterecek?</div>${host && off ? '<div class="dc-row"><button class="dc-b ghost" data-act="dc-spin">Onun yerine çevir</button></div>' : ''}${this.timerBar(left, 12e3)}</div>`;
      }
    } else if (v.phase === 'choose') {
      const forHost = host && !v.isTarget && !v.seats[v.target]?.on;
      if (v.isTarget || forHost) {
        key = `choose|me|${v.game}|${v.turn}|${forHost}`;
        html = `<div class="dc-box"><div class="h">🎯 ${v.isTarget ? 'Şişe seni gösterdi!' : `${nm(v.target)} bağlı değil, onun yerine seç`}</div><div class="s">Doğruluk mu, cesaret mi?</div>
          <div class="dc-pick"><button class="t" data-act="dc-choose" data-t="truth"><span>💬</span>Doğruluk<small>+1 puan</small></button><button class="d" data-act="dc-choose" data-t="dare"><span>🔥</span>Cesaret<small>+2 puan</small></button></div>
          <div class="dc-row"><button class="dc-b alt" data-act="dc-choose" data-t="random">🎲 Kader seçsin</button></div>${this.timerBar(left, v.chooseMs || 3e4)}</div>`;
      } else { key = `choose|o|${v.game}|${v.turn}`; html = `<div class="dc-box dark"><div class="h">🎯 Şişe ${nm(v.target)} kişisini gösterdi!</div><div class="s">Seçiyor: doğruluk mu, cesaret mi? 🤔</div>${this.timerBar(left, v.chooseMs || 3e4)}</div>`; }
    } else if (v.phase === 'card') {
      const tp = v.type === 'dare' ? 'dare' : 'truth';
      const forHost = host && !v.isTarget && !v.seats[v.target]?.on;
      const ctrl = v.isTarget || forHost;
      const asker = v.isSpinner && !v.isTarget;
      const btns = ctrl || asker
        ? `<div class="dc-row"><button class="dc-b ok" data-act="dc-done">✓ ${v.isTarget ? 'Yaptım' : 'Yaptı'}</button><button class="dc-b no" data-act="dc-pass">✗ Pas</button>${ctrl && !v.swapped ? '<button class="dc-b alt" data-act="dc-swap">🔄 Değiştir</button>' : ''}</div>`
        : '';
      const who = v.isTarget ? (tp === 'dare' ? 'Görevin bu! Yapınca “Yaptım”a bas.' : 'Dürüstçe cevapla, sonra “Yaptım”a bas.') : asker ? `Sen sordun: ${nm(v.target)} yaptıysa onayla.` : `${nm(v.target)} için ${tp === 'dare' ? 'görev' : 'soru'} · ${nm(v.spinner)} soruyor`;
      key = `card|${v.game}|${v.turn}|${v.card}|${v.swapped}|${ctrl}|${asker}`;
      html = `<div class="dc-box"><div class="dc-card ${tp}"><small>${tp === 'dare' ? '🔥 CESARET · +2' : '💬 DOĞRULUK · +1'}</small><b>${esc(v.card || '')}</b></div>
        <div class="s">${who}</div>${btns}${host && !ctrl && !asker ? '<div class="dc-row"><button class="dc-b ghost" data-act="dc-skip">Turu geç ⏭</button></div>' : ''}${this.timerBar(left, v.cardMs || 15e4)}</div>`;
    } else if (v.phase === 'outcome') {
      key = `out|${v.game}|${v.turn}`;
      const ok = v.outcome === 'done';
      const last = v.turn >= v.total;
      const nextS = v.seats[v.target]?.on ? v.target : v.spinner;
      html = `<div class="dc-box dc-res ${ok ? 'done' : 'pass'}"><div class="h">${ok ? `✓ ${nm(v.target)} yaptı! +${v.pts}` : v.outcome === 'pass' ? `✗ ${nm(v.target)} pas geçti` : v.outcome === 'skip' ? `⏭ Tur geçildi` : `👋 ${nm(v.target)} masadan ayrıldı`}</div><div class="s">${last ? 'Son turdu, sonuçlar geliyor… 🏆' : `Şişeyi şimdi ${nextS === v.me ? 'sen' : nm(nextS)} çevirecek`}</div></div>`;
    }
    this.setBar(key, html);
  }
  modeSeg(v) {
    return `<div class="dc-seg" role="group" aria-label="Tur sayısı"><button data-act="dc-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kişi başı 2 tur</button><button data-act="dc-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🎉 Kişi başı 4 tur</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card dc-intro">
        <div class="tt">🍾 Doğruluk mu Cesaret mi?</div>
        <div class="sub">Şişeyi çevir! Kimi gösterirse o seçer: dürüst bir cevap mı, küçük bir görev mi?</div>
        <div class="dc-ru"><div style="background:#d6f5e0"><b>🍾</b>Şişeyi çevir</div><div style="background:#dbe8ff"><b>💬</b>Doğruluk +1</div><div style="background:#ffe1d6"><b>🔥</b>Cesaret +2</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="dc-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Kartı yapınca kendin ya da şişeyi çeviren onaylar. Kartı bir kez değiştirebilirsin.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.ctx.serverNow() - (v.finAt || 0) >= 2400) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const rows = v.seats.map((p, i) => ({ p, i, st: (v.stats || [])[i] || {} })).sort((x, y) => y.p.sc - x.p.sc)
        .map(({ p, i, st }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><em>💬${st.truth || 0} 🔥${st.dare || 0}${st.pass ? ` ✗${st.pass}` : ''}</em><b>${p.sc} puan</b></div>`).join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏆 Kazandın!' : champ.length ? `🏆 ${champ.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">💬 doğruluk · 🔥 cesaret · ✗ pas</div>
        <div class="dc-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="dc-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const left = mmss((v.endsAt || 0) - this.ctx.serverNow());
    const TOP = { spin: `${v.turn}/${v.total}. tur · 🍾 şişe`, choose: `${v.turn}/${v.total}. tur · 🎯 seçim · ⏱ ${left}`, card: `${v.turn}/${v.total}. tur · ${v.type === 'dare' ? '🔥 cesaret' : '💬 doğruluk'} · ⏱ ${left}`, outcome: `${v.turn}/${v.total}. tur` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.dc-tm i');
    const tot = v.phase === 'spin' ? 12e3 : v.phase === 'choose' ? v.chooseMs : v.phase === 'card' ? v.cardMs : 0;
    if (tm && tot) tm.style.transform = `scaleX(${clamp(((v.endsAt || 0) - this.ctx.serverNow()) / tot, 0, 1).toFixed(3)})`;
    const spinning = !!(this.spin && !this.spin.done);
    const act = ['spin', 'choose', 'card', 'outcome'].includes(v.phase);
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (act && i === v.spinner) x += '<span>🍾</span>';
      if (act && i === v.target && v.phase !== 'spin') x += `<span>${v.type === 'dare' ? '🔥' : v.type === 'truth' ? '💬' : '🎯'}</span>`;
      if (p.sc) x += `<span class="dc-p">${p.sc}</span>`;
      if (o.dcK !== x) {
        o.dcK = x;
        let el = o.lbl.querySelector('.dc-x');
        if (!el) { el = document.createElement('span'); el.className = 'dc-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('dc-on', act && v.phase !== 'spin' && !spinning && i === v.target);
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.dc-x')) o.dcK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const cx = w / 2, cy = h * 0.46;
    // ampul halkası
    for (let i = 0; i < NB; i++) {
      const a = ((i + 0.5) / NB) * TAU, k = this.bulbs ? this.bulbs[i].k : 0.5;
      g.globalAlpha = 0.35 + 0.65 * clamp(k, 0, 1);
      g.fillStyle = BULB_CSS[i % BULB_CSS.length];
      g.beginPath(); g.arc(cx + Math.sin(a) * r * 0.3, cy + Math.cos(a) * r * 0.3 * 0.8, 4, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // şişe: 3B'deki yönüyle (dünya x → ekran x, dünya z → ekran y)
    const ang = Math.atan2(0.8 * Math.cos(this.bYaw), Math.sin(this.bYaw));
    g.save();
    g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = '#1f8a4c'; g.strokeStyle = '#0d4a28'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(-8, 0, 28, 12, 0, 0, TAU); g.fill(); g.stroke();
    g.fillRect(16, -5, 24, 10); g.strokeRect(16, -5, 24, 10);
    g.fillStyle = '#e2b552'; g.fillRect(38, -6, 7, 12);
    g.restore();
    if (v.target >= 0 && !(this.spin && !this.spin.done) && v.phase !== 'intro' && v.phase !== 'final') {
      const [x, y] = this.flatPos(v.target);
      g.strokeStyle = v.type === 'dare' ? '#ff4d3d' : v.type === 'truth' ? '#3d8bff' : '#ffd23f'; g.lineWidth = 5;
      g.beginPath(); g.arc(x, y, 29, 0, TAU); g.stroke();
    }
    if ((v.phase === 'card' || v.phase === 'outcome') && v.type) { g.font = '900 15px system-ui'; g.textAlign = 'center'; g.fillStyle = v.type === 'dare' ? '#ff4d3d' : '#3d8bff'; g.fillText(v.type === 'dare' ? 'CESARET' : 'DOĞRULUK', cx, cy + r * 0.42); }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new DareGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[dcs]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
