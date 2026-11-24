// Kim Yapar? — 3D sandık oylaması (NFC Dünyası Oyun)
// Masanın ortasında şeffaf bir oy sandığı. Her turda bir "Kim ...?" sorusu gelir; herkes gizlice birine oy verir ve oy
// pusulası oyuncunun önünden uçup sandığa düşer. Herkes oy verince sandığın kapağı açılır, pusulalar tek tek sayılıp
// oy verilen kişinin önüne yığılır. En çok oyu alana yukarıdan bir madalya iner, masa ona döner ve hep birlikte onu
// gösterir. Kimin kime oy verdiği hiçbir zaman görünmez. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir;
// WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-24-b';
import * as sfx from '../sfx.js?v=2026-11-24-b';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, makeTexture, updateTexture } = E;
void sfx;

const BX = 0.4, BZ = 0.29, BH = 0.52, LID_H = 0.04;   // sandık: yarı en, yarı derinlik, yükseklik, kapak kalınlığı
const BY = TABLE_Y + 0.004;                            // sandığın tabanı
const SLOT = [0, BY + BH + LID_H + 0.03, 0];           // pusulanın girdiği yarık
const PW = 0.075, PD = 0.052, PT = 0.009;              // katlanmış pusula (yarı en/derinlik, kalınlık)
const PILE_Z = 0.86;                                   // sayılan pusulaların yığıldığı yer (oyuncunun önünde)
const FLY_S = 0.72;                                    // pusulanın sandığa uçuşu (sn)
const OUT_S = 0.48;                                    // sayımda sandıktan yığına uçuş (sn)
const GOLD3 = [1, 0.84, 0.36], SPOT3 = [1, 0.93, 0.72];

const STYLE = `
#ky.kyp .msg{top:13%}
#ky.kyp .ky-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 11px 10px;text-align:center}
#ky.kyp .ky-box.dark{background:#16213d;color:#fff}
#ky.kyp .ky-q{border-radius:16px;background:#1f3a6b;color:#fff;padding:7px 12px 9px;border:3px solid var(--ink)}
#ky.kyp .ky-q small{display:block;font-size:11.5px;font-weight:900;letter-spacing:.08em;opacity:.8}
#ky.kyp .ky-q b{display:block;font-size:clamp(17px,4.9vw,22px);font-weight:900;line-height:1.2;margin-top:2px;overflow-wrap:anywhere;text-wrap:balance}
#ky.kyp .ky-box.dark .ky-q{background:#0d1530;border-color:rgba(255,255,255,.35)}
#ky.kyp .ky-grid{display:grid;gap:6px;margin-top:8px}
#ky.kyp .ky-c{position:relative;display:flex;align-items:center;justify-content:center;gap:5px;min-width:0;border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:8px 6px;font-weight:900;font-size:14.5px;background:#fff;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.kyp .ky-c i{flex:0 0 auto;width:11px;height:11px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.kyp .ky-c span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.kyp .ky-c.on{background:#ffd23f}
#ky.kyp .ky-grid.c4{gap:5px}
#ky.kyp .ky-grid.c4 .ky-c{font-size:13px;padding:7px 3px;gap:3px;border-width:2px;box-shadow:2px 2px 0 var(--ink)}
#ky.kyp .ky-grid.c4 .ky-c i{width:9px;height:9px;border-width:1.5px}
#ky.kyp .ky-c.off{opacity:.45}
#ky.kyp .ky-c:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.kyp .ky-ft{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800}
#ky.kyp .ky-ft .n{background:#1f3a6b;color:#fff;border-radius:99px;padding:2px 9px}
#ky.kyp .ky-ft .z{opacity:.7}
#ky.kyp .ky-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:7px 13px;font-weight:900;font-size:14.5px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.kyp .ky-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:12.5px;padding:4px 9px;border-width:2px}
#ky.kyp .ky-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.kyp .ky-h{font-size:clamp(17px,4.8vw,21px);font-weight:900;line-height:1.2;margin-top:8px}
#ky.kyp .ky-s{font-size:12.5px;font-weight:700;opacity:.75;margin-top:3px}
#ky.kyp .ky-cnt{font-size:22px;font-weight:900;margin-top:7px;letter-spacing:.02em}
#ky.kyp .ky-res{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:7px}
#ky.kyp .ky-res span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:2px 9px 2px 6px;font-weight:800;font-size:13px;background:#fff}
#ky.kyp .ky-res span.w{background:#ffd23f}
#ky.kyp .ky-res span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.kyp .ky-row{display:flex;gap:8px;justify-content:center;margin-top:8px}
#ky.kyp .ky-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:8px}
#ky.kyp .ky-tm i{display:block;height:100%;background:#ff5a36;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.kyp .lbl .ky-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.kyp .lbl .ky-x:empty{display:none}
#ky.kyp .lbl .ky-v{display:inline-block;min-width:16px;padding:0 4px;border-radius:9px;background:#1f3a6b;color:#fff;font-weight:900;font-size:.85em;line-height:1.35;text-align:center}
#ky.kyp .lbl .ky-m{display:inline-block;padding:0 4px;border-radius:9px;background:#ffd23f;color:#1c1633;font-weight:900;font-size:.85em;line-height:1.35}
#ky.kyp .lbl.ky-on{box-shadow:0 0 0 3px #ffd23f,0 0 18px rgba(255,210,63,.85)}
#ky.kyp .card .ky-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.kyp .card .ky-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.kyp .card .ky-seg button.on{background:var(--ink);color:#fff}
#ky.kyp .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.kyp .card .ky-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.kyp .card .ky-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.kyp .card .ky-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.kyp .card .ky-tb{display:grid;gap:5px;margin-top:10px;max-height:min(34vh,280px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.kyp .card .ky-tb>div{border:2px solid var(--ink);border-radius:12px;padding:5px 10px;background:#fff;color:var(--ink)}
#ky.kyp .card .ky-tb>div.me{background:#fff4c2}
#ky.kyp .card .ky-tb .r{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px}
#ky.kyp .card .ky-tb .r i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.kyp .card .ky-tb .r span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.kyp .card .ky-tb .r b{font-weight:900;white-space:nowrap}
#ky.kyp .card .ky-tb .q{font-size:11.5px;font-weight:700;opacity:.72;line-height:1.3;margin-top:2px}
#ky.kyp .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.kyp .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.kyp .ky-box{width:min(450px,52vw);padding:6px 9px 8px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.kyp .ky-q{padding:5px 10px 6px}#ky.kyp .ky-q b{font-size:16px}
#ky.kyp .ky-grid{gap:5px;margin-top:6px}
#ky.kyp .ky-c{padding:5px 5px;font-size:13px}
#ky.kyp .ky-ft{margin-top:5px}
#ky.kyp .ky-h{font-size:16px;margin-top:5px}
#ky.kyp .ky-tm{margin-top:5px}
#ky.kyp .card .ky-tb{max-height:24vh;margin-top:6px}
#ky.kyp .card .ky-ru{margin-top:6px}#ky.kyp .card .ky-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.kyp .card .ky-ru div b{font-size:17px}
#ky.kyp .card .ky-seg{margin-top:6px}#ky.kyp .card .ky-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.kyp .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, sonuç, final): yarışma programı havası, salıncaklı caz (Fa majör, 112 bpm): yürüyen kontrbas, fırça,
// vibrafon akorları. 'race' (oylama): düşünme müziği (Re minör, 100 bpm): pizzicato ostinato, saat tıkırtısı, yumuşak pad.
// 'count' (sayım): müzik susar, davul gümbürtüsü çalar.
class KySnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 100 : 112; }
  swing() { return this.mode === 'race' ? 0.02 : 0.16; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute' || this.mode === 'count') return;
    if (this.mode === 'race') {
      const CH = [[50, [62, 65, 69]], [48, [60, 64, 69]], [46, [58, 62, 65]], [45, [57, 61, 64]]];
      const [root, ch] = CH[bar % 4];
      if (s === 0 || s === 8) this.iKick(t, 0.07, 95, 45, 0.18);
      if (s % 2 === 0) this.iTick(t, s % 4 === 0 ? 0.022 : 0.012);
      const ARP = [0, 1, 2, 1];
      if (s % 2 === 0) this.iPizz(t, ch[ARP[(s >> 1) % 4]], 0.05, 0.16, 0.15);
      if (s === 0) this.iBass(t, root - 12, spb * 1.8, 0.07, 'up');
      if (s === 8) this.iBass(t, root - 12 + 7, spb * 1.5, 0.05, 'up');
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((m) => m - 12), spb * 8, 0.012, 1000, 0.3);
      if (s === 14 && bar % 4 === 3) this.iBell(t, 81, 0.012, spb, 0.3);
      return;
    }
    // F6 – Dm7 – Gm7 – C7
    const CH = [[41, [57, 60, 62, 65]], [38, [57, 60, 62, 65]], [43, [58, 62, 65, 67]], [36, [58, 62, 64, 67]]];
    const WALK = [[41, 45, 48, 50], [38, 41, 45, 48], [43, 46, 50, 52], [36, 40, 43, 46]];
    const [, ch] = CH[bar % 4];
    if (s % 4 === 0) this.iBass(t, WALK[bar % 4][s >> 2], spb * 0.9, 0.12, 'up');
    if (s % 2 === 0) this.iBrush(t, s % 8 === 4 ? 0.05 : 0.026, 0.14);
    if (s === 4 || s === 12) this.iRim(t, 0.03);
    if (s === 0 || s === 6) ch.forEach((m, k) => this.iVibe(t + k * 0.006, m, 0.022 * (k ? 0.8 : 1), s ? 0.5 : 0.9, 0.3));
    const MEL = [[72, null, 74, null, 77, null, 76, 74], [72, null, null, 69, null, 72, null, null], [70, null, 74, null, 77, null, 79, 77], [76, null, 74, null, 72, null, null, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null && Math.floor(bar / 4) % 2 === 0) this.iPluck(t, m, 0.028, st * 1.8, 'triangle', 3000, 0.25);
    if (s % 2 === 0 && m != null && Math.floor(bar / 4) % 2 === 1) this.iBell(t, m + 12, 0.014, st * 2, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'stamp': // mühür: tok bir vuruş
        this.tone(95, t, 0.11, 'sine', 0.26, 55, 0.002);
        this.noise(t, 0.05, 0.14, { type: 'lowpass', freq: 600, q: 0.8 });
        break;
      case 'drop': // pusula sandığa düştü: kâğıt hışırtısı + plastik tok
        this.noise(t, 0.12, 0.07, { type: 'bandpass', freq: 2400, to: 900, q: 1.2, attack: 0.01 });
        this.tone(190, t + 0.09, 0.07, 'sine', 0.12, 120, 0.002);
        this.tone(760, t + 0.09, 0.03, 'triangle', 0.03, null, 0.001);
        break;
      case 'open': // sandık açılıyor
        this.duck(0.5, 1.2);
        this.tone(980, t, 0.025, 'square', 0.05, null, 0.001);
        this.tone(1240, t + 0.05, 0.025, 'square', 0.05, null, 0.001);
        this.noise(t + 0.08, 0.35, 0.06, { type: 'bandpass', freq: 1200, to: 3200, q: 0.8, attack: 0.04 });
        break;
      case 'count': { // sayılan pusula yığına kondu (a: o kişinin oy sayısı → ses yükselir)
        const n = Math.max(1, a || 1);
        this.noise(t, 0.05, 0.06, { type: 'bandpass', freq: 3200, q: 1.5 });
        this.tone(523 * Math.pow(2, Math.min(12, (n - 1) * 2) / 12), t + 0.02, 0.2, 'triangle', 0.08, null, 0.002);
        break;
      }
      case 'win':
        this.duck(0.15, 3);
        [[67, 0, 0.12], [67, 0.13, 0.12], [72, 0.26, 0.55]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.075, 0.18); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.045); });
        this.cheer(t + 0.25, 1.6);
        this.tone(330, t + 0.3, 0.9, 'sine', 0.03, 250, 0.08);
        break;
      case 'me': // masa beni seçti
        this.duck(0.2, 2);
        [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, d]) => this.tone(f, t + d, d > 0.3 ? 0.5 : 0.16, 'square', 0.055, null, 0.003));
        break;
      case 'tie': [[784, 0], [784, 0.18]].forEach(([f, d]) => this.tone(f, t + d, 0.3, 'triangle', 0.09, null, 0.003)); this.cheer(t + 0.3, 1.2); break;
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
// sandığın iskeleti (beyaz plastik köşe çubukları, mavi üst çerçeve) ve taban
function boxFrame(mb) {
  const Wh = C('#f2f4fa', -0.45), Bl = C('#2a5bd7', -0.5), r = 0.017;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.rbox(sx * BX - r, 0, sz * BZ - r, sx * BX + r, BH, sz * BZ + r, 0.006, Wh, 1);
  for (const y of [0, BH - 2 * r]) {
    const c = y ? Bl : Wh;
    mb.rbox(-BX - r, y, -BZ - r, BX + r, y + 2 * r, -BZ + r, 0.006, c, 1);
    mb.rbox(-BX - r, y, BZ - r, BX + r, y + 2 * r, BZ + r, 0.006, c, 1);
    mb.rbox(-BX - r, y, -BZ - r, -BX + r, y + 2 * r, BZ + r, 0.006, c, 1);
    mb.rbox(BX - r, y, -BZ - r, BX + r, y + 2 * r, BZ + r, 0.006, c, 1);
  }
  mb.rbox(-BX, 0, -BZ, BX, 0.004, BZ, 0.002, C('#dfe6f2', -0.2), 1);
  // etiketlerin arkalığı (önde ve arkada)
  for (const sz of [-1, 1]) mb.rbox(-0.29, BH * 0.4, sz > 0 ? BZ : -BZ - 0.002, 0.29, BH * 0.4 + 0.17, sz > 0 ? BZ + 0.002 : -BZ, 0.005, C('#ffffff', -0.2), 1);
}
// kapak: arka kenarındaki menteşeden açılır (orijin menteşe); üstünde yarık, kenarında kırmızı mühür
function lidModel(mb) {
  const Wh = C('#f6f7fb', -0.45), Bl = C('#2a5bd7', -0.5), Dk = C('#1a1d29', -0.3), Rd = C('#d7263d', -0.5);
  const e = 0.014;
  mb.rbox(-BX - e, 0, -e, BX + e, LID_H, 2 * BZ + e, 0.008, Wh, 1);
  mb.rbox(-BX - e - 0.002, 0.004, -e - 0.002, BX + e + 0.002, 0.016, 2 * BZ + e + 0.002, 0.004, Bl, 1);
  mb.rbox(-0.15, LID_H - 0.002, BZ - 0.018, 0.15, LID_H + 0.004, BZ + 0.018, 0.005, Dk, 1);
  mb.rbox(-0.17, LID_H - 0.003, BZ - 0.033, 0.17, LID_H + 0.001, BZ + 0.033, 0.008, Bl, 1);
  // mühür (ön kenarda sarkan kırmızı plastik)
  mb.rbox(BX * 0.55, -0.05, 2 * BZ + e, BX * 0.55 + 0.03, 0.008, 2 * BZ + e + 0.006, 0.003, Rd, 1);
  mb.sphereS(BX * 0.55 + 0.015, -0.06, 2 * BZ + e + 0.004, 0.018, 0.018, 0.008, Rd, 10, 6);
}
// şeffaf camlar (ışıksız, yarı saydam): dikeyde hafif renk geçişi ve çapraz parıltı şeritleri
function glassModel(mb) {
  const push = (p, c) => mb.d.push(p[0], p[1], p[2], c[0], c[1], c[2], c[3]);
  const quad = (a, b, c, d, ca, cb, cc, cd) => { push(a, ca); push(b, cb); push(c, cc); push(a, ca); push(c, cc); push(d, cd); };
  const lo = [0.6, 0.78, 1, 0.26], hi = [0.82, 0.92, 1, 0.13];
  const sides = [
    [[-BX, 0, BZ], [BX, 0, BZ], [BX, BH, BZ], [-BX, BH, BZ]],
    [[BX, 0, -BZ], [-BX, 0, -BZ], [-BX, BH, -BZ], [BX, BH, -BZ]],
    [[BX, 0, BZ], [BX, 0, -BZ], [BX, BH, -BZ], [BX, BH, BZ]],
    [[-BX, 0, -BZ], [-BX, 0, BZ], [-BX, BH, BZ], [-BX, BH, -BZ]],
  ];
  sides.forEach(([a, b, c, d]) => quad(a, b, c, d, lo, lo, hi, hi));
  // parıltı şeritleri (ön ve sağ yüzde)
  const S = [1, 1, 1, 0.32], S0 = [1, 1, 1, 0.02];
  const strip = (u0, w, face) => {
    const P = (u, y) => (face === 0 ? [lerp(-BX, BX, u), y, BZ + 0.0015] : [BX + 0.0015, y, lerp(BZ, -BZ, u)]);
    const k = 0.22;
    quad(P(u0, BH * 0.08), P(u0 + w, BH * 0.08), P(u0 + w + k, BH * 0.92), P(u0 + k, BH * 0.92), S0, S0, S, S);
  };
  strip(0.08, 0.05, 0); strip(0.17, 0.02, 0); strip(0.6, 0.04, 1);
}
// sandık etiketi ("KİM YAPAR?"): dokulu, önde ve arkada
function labelModel(tb) {
  const y0 = BH * 0.4 + 0.007, y1 = BH * 0.4 + 0.163, x0 = -0.283, x1 = 0.283;
  tb.tquad([x0, y0, BZ + 0.0035], [x1, y0, BZ + 0.0035], [x1, y1, BZ + 0.0035], [x0, y1, BZ + 0.0035], 0, 0, 1, 1, [0, 0, 0]);
  tb.tquad([x1, y0, -BZ - 0.0035], [x0, y0, -BZ - 0.0035], [x0, y1, -BZ - 0.0035], [x1, y1, -BZ - 0.0035], 0, 0, 1, 1, [0, 0, 0]);
}
// katlanmış oy pusulası (üstünde kırmızı mühür izi)
function ballotModel(mb) {
  mb.rbox(-PW, 0, -PD, PW, PT, PD, 0.002, C('#fbf8ef', -0.25), 1);
  mb.rbox(-PW + 0.003, PT * 0.5, -0.001, PW - 0.003, PT + 0.0006, 0.001, 0.0005, C('#d9d2bf', -0.2), 1);
  mb.sphereS(PW * 0.42, PT + 0.0005, PD * 0.4, 0.011, 0.0012, 0.011, C('#d7263d', -0.4), 10, 3);
}
// madalya: altın disk ve yıldız, boyuna uzanan kırmızı-beyaz kurdele (orijin madalyanın ortası; ön yüz +z)
function medalModel(mb) {
  const Au = C('#f0c04e', -0.9), Rim = C('#8a5a12', -0.6), St = C('#fff1a8', 0.9), Rd = C('#d7263d', -0.35), Wh = C('#ffffff', -0.3);
  mb.push().T(0, 0, 0, 0, Math.PI / 2, 0, 1);
  mb.lathe(0, 0, 0, [[0, 0.01], [0.072, 0.01], [0.076, 0.011], [0.083, 0.007], [0.086, 0], [0.083, -0.007], [0.074, -0.01], [0, -0.01]], 24, (i) => (i >= 2 && i <= 4 ? Rim : Au));
  mb.pop();
  const st = [];
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU, r = k % 2 ? 0.023 : 0.056; st.push([Math.sin(a) * r, Math.cos(a) * r, 0.0115]); }
  for (let k = 0; k < 10; k += 2) mb.quad([0, 0, 0.0115], st[(k + 9) % 10], st[k], st[k + 1], St, [0, 0, -1]);
  mb.sphereS(0, 0.088, 0.002, 0.016, 0.016, 0.008, Au, 8, 5);
  for (const s of [-1, 1]) {
    const a = [s * 0.006, 0.092, 0.003], b = [s * 0.042, 0.092, 0.002], c = [s * 0.092, 0.17, -0.06], d = [s * 0.05, 0.178, -0.05];
    mb.quad(a, b, c, d, Rd, [0, 0.1, -0.4]);
    mb.quad(lerp3(a, b, 0.38), lerp3(a, b, 0.62), lerp3(d, c, 0.62), lerp3(d, c, 0.38), Wh, [0, 0.1, -0.45]);
  }
}
function lerp3(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) + 0.0008]; }
// kazananın üstüne düşen spot ışığı (ışıksız, toplamalı): tepede ince, aşağıda geniş koni
function spotModel(mb) {
  const push = (p, c) => mb.d.push(p[0], p[1], p[2], c[0], c[1], c[2], c[3]);
  const N = 24, H = 2.6, R0 = 0.05, R1 = 0.5;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const t0 = [Math.sin(a0) * R0, H, Math.cos(a0) * R0], t1 = [Math.sin(a1) * R0, H, Math.cos(a1) * R0];
    const b0 = [Math.sin(a0) * R1, 0, Math.cos(a0) * R1], b1 = [Math.sin(a1) * R1, 0, Math.cos(a1) * R1];
    const ct = [0, 0, 0, 0], cb = [0.3, 0.28, 0.2, 1];
    push(t0, ct); push(b0, cb); push(b1, cb); push(t0, ct); push(b1, cb); push(t1, ct);
  }
}
// sandık etiketi dokusu
function drawLabel(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#2a5bd7'; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = '#d7263d';
  // küçük mühür yıldızı
  const star = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  star(62, H / 2, 30); star(W - 62, H / 2, 30);
  g.fillStyle = '#1f3a6b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 76; g.font = `800 ${fs}px ${F}`;
  while (fs > 30 && g.measureText('KİM YAPAR?').width > W - 170) { fs -= 2; g.font = `800 ${fs}px ${F}`; }
  g.fillText('KİM YAPAR?', W / 2, H / 2 + 4);
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
// Türkçe belirtme hâli eki: "Zeynep'i", "Ali'yi", "Derya'yı"; harfle bitmeyen adlarda null
function acc(name) {
  const s = String(name || '').trim();
  const low = s.toLocaleLowerCase('tr');
  if (!/[a-zçğıöşüâîû]$/.test(low)) return null;
  let last = null;
  for (let i = low.length - 1; i >= 0; i--) if ('aeıioöuüâîû'.includes(low[i])) { last = low[i]; break; }
  const h = last == null ? 'i' : 'aıâ'.includes(last) ? 'ı' : 'eiî'.includes(last) ? 'i' : 'ouû'.includes(last) ? 'u' : 'ü';
  return `${s}'${'aeıioöuüâîû'.includes(low[low.length - 1]) ? 'y' : ''}${h}`;
}

/* ============================ oyun ============================ */
class VoteGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'kyp', cls: 'kyp', title: 'Kim Yapar?', sub: 'Gizli oy, açık sayım', emoji: '🗳️', css: STYLE, snd: new KySnd(), amb: 'diner', ambVol: 0.4, botPx: 300, botPxL: 34, cloth: '#1c3566', trim: '#f4f6fb', tea: false, place: false, chairPad: '#d7263d', fog: '#0f1424', roomStyle: { wall: '#1c2a4a', curtain: '#b8323f' } });
    this.fl = [];               // sandığa uçan pusulalar { id, t0 }
    this.boxN = 0;              // sandıktaki pusula sayısı (oylama)
    this.votedIds = new Set();  // bu turda oy veren (görülen) oyuncular
    this.lidA = 0;              // kapağın açıklığı (radyan)
    this.landN = 0;             // sayımda yığına konan pusula sayısı (ses için)
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.frame = this.mk(boxFrame);
    W.lid = this.mk(lidModel);
    W.glass = this.mk(glassModel, 'un');
    W.label = this.mk(labelModel, 'tex');
    W.ballot = this.mk(ballotModel);
    W.medal = this.mk(medalModel);
    W.spot = this.mk(spotModel, 'un');
    W.trophy = this.mk(trophyModel);
    this.labCv = document.createElement('canvas');
    this.labCv.width = 512; this.labCv.height = 154;
    try { drawLabel(this.labCv); } catch { /* yok */ }
    this.labTex = makeTexture(this.X, this.labCv);
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.labTex || !this.X || this.X.gl.isContextLost()) return; drawLabel(this.labCv); updateTexture(this.X, this.labTex, this.labCv); }); } catch { /* yok */ }
  }
  freeTex() { if (this.labTex && this.X) this.X.gl.deleteTexture(this.labTex); this.labTex = null; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  // sayım zaman çizelgesi (sunucu saatine göre): k. pusulanın sandıktan çıkışı ve yığına konuşu
  depAt(k) { const v = this.view; return (v.at || 0) + (v.openMs || 1400) - 500 + k * (v.gapMs || 560); }
  countEnd() { const v = this.view; return (v.at || 0) + (v.countMs || 0); }
  shownWin() { const v = this.view; return v && v.phase === 'reveal' && this.sNow() >= this.countEnd(); }
  // şu ana kadar sayılan oylar (kişi başına)
  tallyNow() {
    const v = this.view, out = (v.seats || []).map(() => 0);
    if (!v || v.phase !== 'reveal') return out;
    const now = this.sNow();
    (v.order || []).forEach((i, k) => { if (i >= 0 && i < out.length && now >= this.depAt(k) + OUT_S * 1000) out[i]++; });
    return out;
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'ky-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'ky-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'ky-vote') {
        const id = b.dataset.id;
        if (!v || v.phase !== 'vote') return;
        const cur = v.myVote >= 0 ? v.seats[v.myVote]?.id : null;
        if (cur === id) return;
        this.fx(cur ? 'paper' : 'stamp'); vibrate(15);
        this.ctx.send('vote', { targetId: id });
      }
      else if (act === 'ky-reveal') { this.fx('pop'); this.ctx.send('reveal', {}); }
      else if (act === 'ky-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.kyp !== '1') { root.dataset.kyp = '1'; root.innerHTML = '<p class="py-16 text-center">🗳️</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // oylama: yeni oy veren her oyuncunun pusulası sandığa uçar
    if (v.phase === 'vote') {
      (v.seats || []).forEach((p, i) => {
        if (!(v.voted || [])[i] || this.votedIds.has(p.id)) return;
        this.votedIds.add(p.id);
        this.fl.push({ id: p.id, t0: this.time });
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'vote') {
      mus('race');
      // turun başı: önceki pusulalar temizlenir; geç gelen için zaten verilmiş oylar sandıkta durur
      this.fl = [];
      this.votedIds = new Set((v.seats || []).filter((p, i) => (v.voted || [])[i]).map((p) => p.id));
      this.boxN = this.votedIds.size;
      this.winFx = false;
      if (fresh) { this.fx('ding'); if (v.amIn) vibrate(15); }
    }
    if (v.phase === 'reveal') {
      mus('count');
      this.fl = [];
      this.boxN = (v.order || []).length;
      const now = this.sNow();
      this.landN = (v.order || []).filter((i, k) => now >= this.depAt(k) + OUT_S * 1000).length;
      this.winFx = now >= this.countEnd() + 1500;
      if (fresh) {
        this.fx('open');
        const d = Math.max(0.6, ((v.countMs || 0) - 1200) / 1000);
        const pk = this.phKey;
        if ((v.order || []).length) setTimeout(() => { if (!this.dead && this.phKey === pk) this.fx('drumroll', d); }, 900);
        this.msg(`📦 SAYIM`, 'mid');
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!late) {
        this.fx('champ');
        const c = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n || '')));
        this.msg(c.length ? `🏅 ${c.join(' & ')}` : 'OYUN BİTTİ', 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, [[1, 0.85, 0.3], [0.95, 0.25, 0.3], [0.3, 0.55, 1], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.2); });
      }
    }
  }
  // sayım bitti: kazanan(lar) belli olur
  onWin() {
    const v = this.view;
    const W = v.winners || [];
    if (!W.length) { this.fx('trombone'); this.msg('🤷 OY YOK', 'mid'); return; }
    this.fx(v.iWon ? 'me' : W.length > 1 ? 'tie' : 'win');
    if (v.iWon) { this.msg(W.length > 1 ? '🏅 SEN DE!' : '🏅 SEN!', 'big'); vibrate([30, 40, 30]); }
    else this.msg(`🏅 ${W.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')}`, 'big');
    try { this.snd.music('idle'); } catch { /* yok */ }
    W.forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.4, a.headW[2], 40, [[1, 0.85, 0.3], [0.95, 0.25, 0.3], [0.3, 0.55, 1], [1, 1, 1]], 2.2, 0.035, false, 2, 2.2); });
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const box = [0, BY + BH * 0.6, 0];
    const W = v.winners || [];
    const shown = this.shownWin();
    const wu = shown ? (now - this.countEnd()) / 1000 : 0;
    // sayımda en son pusulanın konduğu kişi
    let lastI = -1;
    if (v.phase === 'reveal' && !shown) (v.order || []).forEach((i, k) => { if (now >= this.depAt(k) + 200) lastI = i; });
    const winA = W.length ? this.avatarAt(W[0]) : null;
    const champA = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.kyI || (a.kyI = { lt: 0, look: null });
      const idleLook = (pBox = 0.15) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > pBox ? P[Math.floor(Math.random() * P.length)] : box;
        }
        return idle.look;
      };
      if (v.phase === 'vote') {
        const f = this.fl.find((x) => x.id === p.id);
        const fu = f ? (t - f.t0) / FLY_S : 9;
        if (fu < 0.5) {
          // pusulayı sandığa atar gibi: el masanın ortasına uzanır
          a.pose('rest', { t, k: 14 });
          a.tgt.hand[0] = [-0.08, TABLE_Y + 0.16 + fu * 0.1, 0.62 + fu * 0.1];
          a.tgt.palm[0] = [0, -1, 0.2]; a.tgt.fdir[0] = [0, -0.2, 1];
          a.shape[0] = 'open';
          a.expr = 'grin'; a.look = box;
          return;
        }
        const did = !!(v.voted || [])[i];
        if (!did && (v.inRound || [])[i]) {
          // düşünüyor: kim yapar? masadakilere tek tek bakar
          a.pose(Math.floor(t / 4 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = Math.floor(t / 3 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = idleLook(0.1);
        } else {
          a.pose(hs(i, v.round) < 0.5 ? 'clasp' : 'rest', { t });
          a.expr = 'grin';
          a.look = idleLook(0.2);
        }
        return;
      }
      if (v.phase === 'reveal') {
        if (!shown) {
          a.pose(hs(i, v.round + 2) < 0.5 ? 'clasp' : 'bite', { t });
          a.expr = lastI === i ? 'o' : 'tense';
          const la = lastI >= 0 ? this.avatarAt(lastI) : null;
          a.look = la && la !== a ? la.headW : box;
          return;
        }
        const won = W.includes(i);
        if (won) {
          a.pose(wu < 1.6 ? 'facepalm' : Math.floor(wu / 2) % 2 ? 'shrug' : 'cheer', { t });
          a.expr = wu < 1.6 ? 'wince' : 'laugh';
          a.look = idleLook(0);
          return;
        }
        if (!W.length) { a.pose('shrug', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        // herkes kazananı gösterir, sonra alkışlar
        if (wu < 2.6 && winA && winA !== a) { a.pose('rest', { t }); a.pointAt(winA.headW, 0); a.shape[0] = 'point'; a.expr = 'laugh'; a.look = winA.headW; return; }
        a.pose(Math.floor(wu / 1.5 + i) % 2 ? 'clap' : 'rest', { t }); a.expr = 'laugh';
        a.look = winA && winA !== a ? winA.headW : idleLook();
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

  /* ---------- kamera, sandık, sesler ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time, now = this.sNow();
    // uçuşu biten pusulalar sandığa düşer
    if (v.phase === 'vote') {
      this.fl = this.fl.filter((f) => {
        if (t - f.t0 < FLY_S) return true;
        this.boxN++;
        this.fx('drop');
        return false;
      });
    }
    // kapak: sayımda açılır, oylamada kapanır
    const lidT = v.phase === 'reveal' && now >= (v.at || 0) + 200 ? 1.95 : 0;
    this.lidA = damp(this.lidA, lidT, lidT ? 5 : 8, dt);
    // sayım: her pusula yığına konunca ses (o kişinin oyu arttıkça yükselir)
    if (v.phase === 'reveal') {
      const ord = v.order || [];
      let n = 0;
      ord.forEach((i, k) => { if (now >= this.depAt(k) + OUT_S * 1000) n++; });
      if (n > this.landN) {
        const k = n - 1, i = ord[k];
        const cnt = ord.slice(0, n).filter((x) => x === i).length;
        this.fx('count', cnt);
        this.landN = n;
      }
      if (!this.winFx && now >= this.countEnd()) { this.winFx = true; this.onWin(); }
    }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.3, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    const focus = (i, z = 0.6) => {
      const a = i >= 0 ? this.avatarAt(i) : null;
      if (!a || !a.headW) return false;
      zoom = z; sy = land ? 0.45 : 0.32; H = [a.headW[0] * 0.75, a.headW[1] - 0.2, a.headW[2] * 0.75]; yawC = Math.atan2(-a.pos[0], -a.pos[2]);
      return true;
    };
    if (v.phase === 'vote') { zoom = land ? 0.92 : 0.88; pa = 0.05; bp = Math.max(160, this.barH || 300); sy = land ? 0.5 : 0.4; }
    else if (v.phase === 'reveal') {
      bp = Math.max(150, this.barH || 220);
      if (this.shownWin() && (v.winners || []).length === 1) focus(v.winners[0], 0.58);
      else { zoom = land ? 0.85 : 0.8; pa = 0.08; sy = land ? 0.5 : 0.42; }
    } else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (Math.abs(bp - this.cfg.botPx) > 12) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // son saniyeler: henüz oy vermediysem tıkırtı
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'vote' && v.amIn && v.myVote < 0 && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.6); } }
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
  // sandıktaki k. pusulanın yeri (tabanda gelişigüzel yığılır)
  inBox(m, k) {
    const x = (hs(k, 11) - 0.5) * (2 * BX - 0.12), z = (hs(k, 12) - 0.5) * (2 * BZ - 0.1);
    M.set(m, x, BY + 0.005 + Math.floor(k / 3) * PT * 0.9 + (k % 3) * 0.0012, z, hs(k, 13) * TAU, (hs(k, 14) - 0.5) * 0.25, (hs(k, 15) - 0.5) * 0.25);
  }
  // i. oyuncunun önündeki yığının j. pusulası
  pileAt(i, j) {
    const a = this.avatarAt(i);
    if (!a) return null;
    const p = this.seatW(a, (hs(i * 7 + j, 3) - 0.5) * 0.05, TABLE_Y + 0.006 + j * (PT + 0.0008), PILE_Z);
    return { p, yaw: a.yaw + (hs(i * 7 + j, 4) - 0.5) * 0.7 };
  }
  // bir pusulayı a'dan b'ye kavisle uçur (u: 0..1)
  flyMat(m, a, b, u, yaw0, yaw1, lift) {
    const e = easeOut(u);
    const y = lerp(a[1], b[1], e) + Math.sin(u * Math.PI) * lift;
    M.set(m, lerp(a[0], b[0], e), y, lerp(a[2], b[2], e), lerp(yaw0, yaw1, e) + u * 3.5, Math.sin(u * Math.PI) * 0.6, 0);
  }
  medalMat(o, a, off, s) {
    const L = this.mL || (this.mL = M.make());
    M.set(L, 0, 0.76 + off, 0.262, 0, -0.18, 0, s);
    return M.mul(o, a.M.body, L);
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.frame || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T, t = this.time, now = this.sNow();
    // sandık
    M.set(m, 0, BY, 0);
    D(Wd.frame, m, T.obj);
    M.set(m, 0, BY + BH, -BZ, 0, -this.lidA, 0);
    D(Wd.lid, m, T.obj);
    // oylama: sandığa uçan ve içindeki pusulalar
    if (v.phase === 'vote') {
      for (let k = 0; k < Math.min(this.boxN, 24); k++) { this.inBox(m, k); D(Wd.ballot, m, T.obj); }
      this.fl.forEach((f) => {
        const i = (v.seats || []).findIndex((p) => p.id === f.id), a = this.avatarAt(i);
        if (!a) return;
        const u = clamp((t - f.t0) / FLY_S, 0, 1);
        const p0 = this.seatW(a, -0.1, TABLE_Y + 0.2, 0.66);
        this.flyMat(m, p0, SLOT, u, a.yaw, Math.PI / 2, 0.35);
        D(Wd.ballot, m, T.obj);
      });
    }
    // sayım: sandıktan çıkıp kişilerin önüne yığılan pusulalar
    if (v.phase === 'reveal') {
      const ord = v.order || [];
      const stack = (v.seats || []).map(() => 0);
      let inside = 0;
      ord.forEach((i, k) => {
        const d0 = this.depAt(k), u = (now - d0) / (OUT_S * 1000);
        if (u < 0) { this.inBox(m, inside++); D(Wd.ballot, m, T.obj); return; }
        if (i < 0 || i >= stack.length) return;
        const j = stack[i]++;
        const P = this.pileAt(i, j);
        if (!P) return;
        if (u >= 1) M.set(m, P.p[0], P.p[1], P.p[2], P.yaw);
        else this.flyMat(m, [0, BY + BH + 0.06, 0], P.p, u, 0, P.yaw, 0.32);
        D(Wd.ballot, m, T.obj);
      });
    }
    // madalyalar: rozeti olan herkes takar; yeni kazananınki yukarıdan iner
    const W = v.phase === 'reveal' && this.shownWin() ? v.winners || [] : [];
    const wu = W.length ? (now - this.countEnd()) / 700 : 1;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a || !a.M || !a.M.body) return;
      const nb = p.b || 0;
      const isW = W.includes(i);
      if (!nb && !isW) return;
      const off = isW ? (1 - easeOut(wu)) * 0.9 : 0;
      const s = Math.min(1.45, 1.15 + 0.07 * Math.max(0, nb - 1));
      D(Wd.medal, this.medalMat(mc, a, off, s), T.obj);
    });
    // final: şampiyonun önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, 0, TABLE_Y + 0.004, 0.62);
        const u = clamp((t - (this.finT || 0) - 0.8) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.35 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  drawShadowsExtra(m) {
    if (!this.res || !this.res.shadow) return;
    M.set(m, 0, TABLE_Y + 0.008, 0, 0, 0, 0, BX * 1.55, 1, BZ * 1.7);
    drawMesh(this.X, this.res.shadow, m, ONE3, 0.5);
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.label || !this.labTex) return;
    const m = this.mats.b;
    gl.uniform1f(X.tex.u.uSelf, 0.22);
    gl.bindTexture(gl.TEXTURE_2D, this.labTex);
    M.set(m, 0, BY, 0);
    drawMesh(X, Wd.label, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const X = this.X, gl = X.gl, v = this.view, Wd = this.W;
    if (!v || !Wd || !Wd.glass) return;
    const t = this.time;
    // kazananın üstüne spot ışığı ve altın hâle
    if (this.shownWin()) {
      const k = clamp((this.sNow() - this.countEnd()) / 400, 0, 1);
      (v.winners || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a || !a.headW) return;
        M.set(m, a.pos[0], 0, a.pos[2]);
        drawMesh(X, Wd.spot, m, ONE3, k * (0.85 + 0.15 * Math.sin(t * 3)));
        this.glow(m, [a.headW[0], a.headW[1] - 0.3, a.headW[2]], 0.9, GOLD3, 0.2 * k);
      });
    }
    // sandığın camları (normal karışım, yarı saydam)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(X.un.u.uAdd, 0);
    M.set(m, 0, BY, 0);
    drawMesh(X, Wd.glass, m, ONE3, 1);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
  }

  /* ---------- arayüz ---------- */
  timerBar(left, total) { return `<div class="ky-tm"><i style="transform:scaleX(${clamp(left / Math.max(1, total), 0, 1).toFixed(3)})"></i></div>`; }
  qBox(v, tag, dark) { return `<div class="ky-q"><small>${tag}</small><b>${esc(v.question || '')}</b></div>`; }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
    const now = this.sNow();
    const host = this.ctx.isHost;
    if (v.phase === 'vote') {
      const tag = `🗳️ SORU ${v.round}/${v.total}`;
      if (!v.amIn) {
        key = `vote|watch|${v.game}|${v.round}|${v.answered}|${v.voters}`;
        html = `<div class="ky-box">${this.qBox(v, tag)}<div class="ky-s" style="margin-top:7px">👀 Bu soruda izliyorsun, sonrakinde sen de oy vereceksin.</div><div class="ky-ft"><span class="n">🗳️ ${v.answered}/${v.voters} oy</span></div>${this.timerBar(v.endsAt - now, v.voteMs || 35e3)}</div>`;
      } else {
        const cand = v.candidates || [];
        const cols = cand.length <= 4 ? 2 : cand.length <= 9 ? 3 : 4;
        const btns = cand.map((i) => {
          const p = v.seats[i];
          if (!p) return '';
          const on = v.myVote === i;
          const label = i === v.me ? (cols >= 3 ? 'Sen' : `${esc(nm0(p.n))} (sen)`) : esc(nm0(p.n));
          return `<button class="ky-c${on ? ' on' : ''}${p.on ? '' : ' off'}" data-act="ky-vote" data-id="${esc(p.id)}" style="--pc:${pcol(p.c)}"><i></i><span>${on ? '👉 ' : ''}${label}</span></button>`;
        }).join('');
        const mine = v.myVote >= 0;
        key = `vote|in|${v.game}|${v.round}|${v.myVote}|${v.answered}|${v.voters}|${host}|${v.closing}|${cand.join(',')}`;
        html = `<div class="ky-box">${this.qBox(v, tag)}<div class="ky-grid c${cols}" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${btns}</div>
          <div class="ky-ft"><span class="n">🗳️ ${v.answered}/${v.voters} oy</span><span class="z">${mine ? (v.closing ? 'Sandık kapanıyor…' : 'Oyun sandıkta · değiştirebilirsin') : '🤫 Oylar gizli'}</span>${host && v.answered > 0 && v.answered < v.voters ? '<button class="ky-b ghost" data-act="ky-reveal">Beklemeden aç</button>' : ''}</div>
          ${this.timerBar(v.endsAt - now, v.voteMs || 35e3)}</div>`;
      }
    } else if (v.phase === 'reveal') {
      if (!this.shownWin()) {
        const n = this.tallyNow().reduce((x, y) => x + y, 0);
        key = `rev|c|${v.game}|${v.round}|${n}`;
        html = `<div class="ky-box dark">${this.qBox(v, '📦 SANDIK AÇILDI')}<div class="ky-cnt">🗳️ ${n} / ${(v.order || []).length}</div><div class="ky-s">Pusulalar sayılıyor… kimse kimin oy verdiğini bilmiyor 🤫</div></div>`;
      } else {
        const W = v.winners || [];
        let head;
        if (!W.length) head = '🤷 Kimse oy vermedi';
        else if (v.iWon && W.length === 1) head = '🏅 Masa seni seçti!';
        else if (W.length === 1) { const a = acc(nm0(v.seats[W[0]]?.n || '')); head = a ? `🏅 Masa ${esc(a)} seçti!` : `🏅 Masanın seçimi: ${nm(W[0])}`; }
        else head = `🏅 Berabere: ${W.map(nm).join(' ve ')}`;
        const sub = W.length > 1 ? 'Hepsi rozeti alıyor!' : '';
        const res = (v.results || []).map((r) => `<span class="${W.includes(r.i) ? 'w' : ''}" style="--pc:${pcol(v.seats[r.i]?.c ?? 0)}"><i></i>${nm(r.i)} ${r.votes}</span>`).join('');
        const canNext = host && now >= this.countEnd() + (v.nextMinMs || 1200);
        const last = v.round >= v.total;
        key = `rev|w|${v.game}|${v.round}|${canNext}`;
        html = `<div class="ky-box">${this.qBox(v, `🏅 SORU ${v.round}/${v.total}`)}<div class="ky-h">${head}</div>${sub ? `<div class="ky-s">${sub}</div>` : ''}${res ? `<div class="ky-res">${res}</div>` : ''}
          ${canNext ? `<div class="ky-row"><button class="ky-b" data-act="ky-next">${last ? 'Sonuçlara geç 🏆' : 'Sıradaki soru ▶'}</button></div>` : `<div class="ky-s">${last ? 'Son soruydu, sonuçlar geliyor…' : 'Sıradaki soru birazdan…'}</div>`}
          ${this.timerBar(v.endsAt - now, v.holdMs || 5200)}</div>`;
      }
    }
    this.setBar(key, html);
  }
  modeSeg(v) {
    return `<div class="ky-seg" role="group" aria-label="Soru sayısı"><button data-act="ky-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ 6 soru</button><button data-act="ky-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🎉 12 soru</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card ky-intro">
        <div class="tt">🗳️ Kim Yapar?</div>
        <div class="sub">Gizli oylama, herkesin önünde ifşa. Kimse kimin oy verdiğini bilmez.</div>
        <div class="ky-ru"><div style="background:#dbe8ff"><b>🤫</b>Gizlice oy ver</div><div style="background:#fff4c2"><b>📦</b>Sandık açılır</div><div style="background:#ffe1d6"><b>🏅</b>Rozeti kap</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="ky-start" ${n < 3 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 3 ? 'En az 3 kişi lazım: masadakileri çağır!' : 'Her soruda masadan birini seç, kendine de oy verebilirsin. En çok rozeti toplayan masanın yıldızı olur.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= 2400) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const B = v.badges || [];
      const rows = v.seats.map((p, i) => ({ p, i, L: B[i] || [] })).sort((x, y) => y.L.length - x.L.length)
        .map(({ p, i, L }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><div class="r"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><b>🏅 ${L.length}</b></div>${L.length ? `<div class="q">${L.map((q) => `“${esc(q)}”`).join(' · ')}</div>` : ''}</div>`).join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏅 Masanın yıldızı sensin!' : champ.length ? `🏅 Masanın yıldızı: ${champ.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')}` : 'Oyun bitti!'}</div>
        <div class="sub">Kim hangi rozeti kaptı?</div>
        <div class="ky-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="ky-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = mmss((v.endsAt || 0) - now);
    const TOP = { vote: `${v.round}/${v.total}. soru · 🗳️ ${v.answered ?? 0}/${v.voters ?? 0} · ⏱ ${left}`, reveal: `${v.round}/${v.total}. soru · 📦 sayım` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.ky-tm i');
    const tot = v.phase === 'vote' ? v.voteMs || 35e3 : v.phase === 'reveal' ? v.holdMs || 5200 : 0;
    if (tm && tot) tm.style.transform = `scaleX(${clamp(((v.endsAt || 0) - now) / tot, 0, 1).toFixed(3)})`;
    // alt çubuğun yüksekliği: masa onun üstüne sığsın
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const T = this.tallyNow();
    const W = this.shownWin() ? v.winners || [] : [];
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase === 'vote' && (v.voted || [])[i]) x += '<span>✓</span>';
      if (v.phase === 'reveal' && T[i]) x += `<span class="ky-v">🗳️${T[i]}</span>`;
      if (p.b) x += `<span class="ky-m">🏅${p.b > 1 ? p.b : ''}</span>`;
      if (o.kyK !== x) {
        o.kyK = x;
        let el = o.lbl.querySelector('.ky-x');
        if (!el) { el = document.createElement('span'); el.className = 'ky-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('ky-on', W.includes(i));
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.ky-x')) o.kyK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const cx = w / 2, cy = h * 0.46;
    // sandık
    g.fillStyle = 'rgba(180,215,255,.35)'; g.strokeStyle = '#f2f4fa'; g.lineWidth = 3;
    g.fillRect(cx - 34, cy - 26, 68, 52); g.strokeRect(cx - 34, cy - 26, 68, 52);
    g.fillStyle = '#2a5bd7'; g.fillRect(cx - 36, cy - 30, 72, 8);
    const n = v.phase === 'vote' ? this.boxN : v.phase === 'reveal' ? (v.order || []).length - this.tallyNow().reduce((x, y) => x + y, 0) : 0;
    g.fillStyle = '#fbf8ef';
    for (let k = 0; k < Math.min(n, 12); k++) g.fillRect(cx - 28 + (k % 4) * 14, cy + 14 - Math.floor(k / 4) * 7, 12, 5);
    // sayılan pusulalar ve kazanan
    const T = this.tallyNow();
    const W = this.shownWin() ? v.winners || [] : [];
    (v.seats || []).forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      if (T[i]) { g.font = '900 13px system-ui'; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.fillText(`🗳️${T[i]}`, x + (cx - x) * 0.35, y + (cy - y) * 0.35); }
      if (W.includes(i)) { g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 29, 0, TAU); g.stroke(); }
    });
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new VoteGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[kyp]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
