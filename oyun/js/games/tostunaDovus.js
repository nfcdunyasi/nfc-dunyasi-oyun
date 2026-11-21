// Tostuna Dövüş — 3D restoran masası (NFC Dünyası Oyun)
// Masanın ortasında kaşarlı tost pişiren bir tost makinesi var; herkesin önünde bir zil. Makinenin lambası kırmızıyken
// herkes eli zilin üstünde bekler. Lamba yeşile dönüp kapak açılınca tost havaya fırlar: zile en hızlı vuran tostu kapar
// ve afiyetle yer. Yeşilden önce vuran o turu yakar. Tepki süresini bu cihaz ölçer (yeşilin çizildiği an → dokunuş).
// Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-e';
import * as sfx from '../sfx.js?v=2026-11-21-e';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, sst, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb } = E;

// makine ölçüleri (ölçek 1; masaya göre büyütülür)
const MW = 0.62, MD = 0.46, MB = 0.1, GAP = 0.074, LH = 0.075, LID_OPEN = 1.85;
const BUZ_Z = 0.47;           // zilin koltuktan uzaklığı (koltuk uzayı; masa kenarı 0,36'da)
const DOME_TOP = 0.08;        // zil kubbesinin tepesi (masa üstünden)
const RED3 = [1, 0.16, 0.1], GREEN3 = [0.2, 1, 0.42], GOLD3 = [1, 0.8, 0.3], OFF3 = [0.32, 0.3, 0.3], WHITE3 = [1, 1, 1];

const STYLE = `
#ky.tdv .msg{top:13%}
#ky.tdv .td-st{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:#fff;background:rgba(12,10,26,.7);border-radius:99px;padding:6px 15px;max-width:94%;white-space:nowrap;pointer-events:none}
#ky.tdv .td-st:empty{display:none}
#ky.tdv .td-hit{width:100%;max-width:520px;height:clamp(118px,23vh,200px);border-radius:30px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-weight:900;color:#fff;background:#d83a2e;-webkit-tap-highlight-color:transparent;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;padding:6px 12px;text-align:center}
#ky.tdv .td-hit .e{font-size:42px;line-height:1}
#ky.tdv .td-hit .t{font-size:34px;line-height:1.05;letter-spacing:.5px}
#ky.tdv .td-hit .t small{font-size:18px;margin-left:3px}
#ky.tdv .td-hit .s{font-size:14px;font-weight:700;opacity:.88}
#ky.tdv .td-hit.wait{background:#d83a2e}
#ky.tdv .td-hit.go{background:#1fd462;color:#08260f}
#ky.tdv .td-hit.done{background:#1f1b33}
#ky.tdv .td-hit.early{background:#7c4dbe}
#ky.tdv .td-hit:active{transform:translate(2px,2px);box-shadow:3px 3px 0 var(--ink)}
#ky.tdv .td-res{width:min(420px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:10px 14px 11px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none}
#ky.tdv .td-res.win{background:#fff3c4}#ky.tdv .td-res.none{background:#ece6f0}
#ky.tdv .td-res .big{font-size:22px;font-weight:900;line-height:1.15}
#ky.tdv .td-res .big b{font-variant-numeric:tabular-nums}
#ky.tdv .td-res .rk{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:7px}
#ky.tdv .td-res .rk span{border:2px solid var(--ink);border-radius:99px;padding:1px 9px;font-weight:800;font-size:12.5px;background:#fff;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
#ky.tdv .td-res .rk span.me{background:var(--lim)}
#ky.tdv .td-res .rk span b{font-variant-numeric:tabular-nums;opacity:.75}
#ky.tdv .td-res .q{margin-top:6px;font-size:13px;font-weight:700;opacity:.8}
#ky.tdv .lbl .td-x{display:inline-flex;align-items:center;gap:3px}
#ky.tdv .lbl .td-x:empty{display:none}
#ky.tdv .lbl .td-ms{font-size:11px;font-variant-numeric:tabular-nums;background:rgba(255,255,255,.22);border-radius:99px;padding:0 6px}
#ky.tdv .lbl.me .td-ms{background:rgba(28,22,51,.14)}
#ky.tdv .lbl .td-ms.w{background:#ffd23f;color:#1c1633}
#ky.tdv .lbl .td-sc{font-size:11px;font-variant-numeric:tabular-nums}
#ky.tdv .lbl.early{background:#7c4dbe;color:#fff}
#ky.tdv .card .td-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.tdv .card .td-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.tdv .card .td-seg button.on{background:var(--ink);color:#fff}
#ky.tdv .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.tdv .card.td-in .tt{font-size:26px}
#ky.tdv .card.td-in .sub{font-size:14px}
#ky.tdv .card.td-in .kb{margin-top:10px}
#ky.tdv .card .td-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.tdv .card .td-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.tdv .card .td-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.tdv .card .td-ru .r{background:#ffd9d4}#ky.tdv .card .td-ru .g{background:#d6f5e0}#ky.tdv .card .td-ru .y{background:#fff0c2}
#ky.tdv .card .td-rest{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px}
#ky.tdv .card .td-rest span{border:2px solid var(--ink);border-radius:99px;padding:1px 9px;font-weight:800;font-size:12.5px;background:#fff;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
#ky.tdv .card .td-rest span.me{background:var(--lim)}
#ky.tdv .card .td-top3{display:none}
@media (max-height:560px){#ky.tdv .card .td-top3{display:flex}}
#ky.tdv .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.tdv .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.tdv .msg{top:15%}
#ky.tdv .td-hit{max-width:min(360px,42vw);height:clamp(104px,40vh,170px)}
#ky.tdv .td-hit .e{font-size:34px}#ky.tdv .td-hit .t{font-size:28px}
#ky.tdv .td-res{width:min(360px,46vw);padding:7px 12px}#ky.tdv .td-res .big{font-size:19px}
}
@media (max-width:379px){#ky.tdv .card .row2 .kb{font-size:15px;padding-left:8px;padding-right:8px}#ky.tdv .card .td-seg button{font-size:12px}}
@media (min-aspect-ratio:11/10){#ky.tdv .mz-bar{align-items:flex-end}#ky.tdv .td-hit{max-width:min(380px,40vw)}}
`;

/* ============================ müzik ve sesler ============================ */
// Bekleme/sonuç: Sol majör "diner" ezgisi (G – Em – C – D): yürüyen bas, fırça, elektrikli piyano, marimba.
// Kırmızı lamba (bekleme): kalp atışı, tiz tik-tak, tost makinesinin cızırtısı ve gerilen yaylılar; bekledikçe hızlanır.
// Yeşilde müzik susar (zil sesi net duyulsun).
class TdSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.0; }
  tempo() { return this.mode === 'race' ? 96 + 36 * (this.int || 0) : this.mode === 'idle' ? 112 : 100; }
  swing() { return this.mode === 'race' ? 0 : 0.14; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const I = this.int || 0;
    const CH = [[43, [59, 62, 67, 71]], [40, [59, 64, 67, 71]], [36, [60, 64, 67, 72]], [38, [62, 66, 69, 74]]];
    const [root, ch] = CH[bar % 4];
    if (this.mode === 'race') {
      // kalp atışı: "güm-güm" (ölçüde iki kez)
      if (s === 0 || s === 8) this.iKick(t, 0.24 + 0.1 * I, 92, 40, 0.2);
      if (s === 2 || s === 10) this.iKick(t, 0.14 + 0.07 * I, 84, 38, 0.16);
      if (s % 2 === 0) this.iTick(t, 0.02 + 0.025 * I);
      if (s % 2 === 1 && I > 0.35) this.iHat(t, 0.008 + 0.014 * I);
      // tost makinesinin cızırtısı
      this.noise(t, st * 1.4, 0.006 + 0.006 * Math.random() + 0.004 * I, { type: 'bandpass', freq: 4200 + Math.random() * 2600, q: 0.6, attack: 0.01 }, 0, this._md());
      if (s === 0) { this.iStr(t, [root + 12, root + 19, root + 24], spb * 4, 0.011 + 0.01 * I, 0.4, 1600 + 1400 * I, 0.25); this.iBass(t, root - 12, spb * 3.6, 0.07 + 0.03 * I, 'sub'); }
      if (s % 4 === 3 && I > 0.5) this.iPizz(t, ch[(s >> 2) % 4] + 12, 0.018 + 0.02 * I);
      return;
    }
    const soft = this.mode !== 'idle';
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, soft ? 0.008 : 0.009, 1000);
    if (s % 4 === 0) this.iBass(t, root + [0, 7, 12, 7][(s >> 2) % 4], spb * 0.85, soft ? 0.07 : 0.085, 'up');
    if (s === 0 || s === 8) this.iKick(t, soft ? 0.08 : 0.11, 100, 48, 0.16);
    if (s === 4 || s === 12) this.iBrush(t, soft ? 0.04 : 0.06, 0.18);
    if (s % 2 === 0) this.iHat(t, soft ? 0.008 : 0.012);
    if (s % 2 === 1) this.iShk(t, soft ? 0.006 : 0.009);
    if (s === 2 || s === 10) ch.forEach((m, i) => this.iEP(t + i * 0.005, m, (soft ? 0.011 : 0.013) * (i ? 0.75 : 1), spb * 0.8, 0.2));
    const mel = [ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12];
    if (!soft && (s === 6 || s === 14)) this.iMarimba(t, mel[(bar + (s >> 3)) % 4], 0.024, 0.1);
    if (soft && s === 14) this.iVibe(t, ch[3] + 12, 0.016, spb, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'ding': // yeşil: servis zili + kapak
        this.duck(0.2, 1.0);
        [[1568, 0.2, 1.1], [3136, 0.07, 0.7], [4700, 0.03, 0.45]].forEach(([f, v, d]) => this.tone(f, t, d, 'sine', v, null, 0.002));
        this.tone(2093, t + 0.004, 0.5, 'triangle', 0.05, null, 0.002);
        this.noise(t, 0.05, 0.16, { type: 'bandpass', freq: 1800, q: 1.5 });
        break;
      case 'jump': // tost havaya fırlar
        this.tone(260, t + 0.03, 0.26, 'triangle', 0.12, 880, 0.01);
        this.noise(t + 0.02, 0.32, 0.09, { type: 'bandpass', freq: 600, to: 2400, q: 1 });
        break;
      case 'shut': // kapak kapanır, yeni tost cızırdar
        this.noise(t, 0.05, 0.16, { type: 'bandpass', freq: 1200, q: 1.2 });
        this.tone(220, t, 0.07, 'square', 0.05, 140, 0.002);
        this.noise(t + 0.05, 0.7, 0.07, { type: 'bandpass', freq: 5200, q: 0.6, attack: 0.03 });
        break;
      case 'buzz': // benim zilim
        [0, 0.011].forEach((d) => this.tone(880, t + d, 0.17, 'square', 0.065, null, 0.002));
        this.tone(440, t, 0.19, 'sawtooth', 0.05, null, 0.002);
        this.noise(t, 0.03, 0.12, { type: 'bandpass', freq: 3000, q: 1 });
        break;
      case 'buzzO': // başkasının zili (kısık)
        this.tone(620 + (a || 0) * 45, t, 0.11, 'square', 0.03, null, 0.002);
        this.noise(t, 0.02, 0.05, { type: 'bandpass', freq: 2600, q: 1 });
        break;
      case 'early': // erken vurdum
        this.duck(0.3, 1.0);
        this.tone(140, t, 0.38, 'sawtooth', 0.12, 100, 0.004);
        this.tone(147, t, 0.38, 'square', 0.06, 104, 0.004);
        this.tone(980, t + 0.05, 0.28, 'sine', 0.05, 520, 0.01);
        break;
      case 'earlyO': this.tone(210, t, 0.16, 'triangle', 0.06, 140, 0.004); break;
      case 'fly': this.noise(t, 0.55, 0.15, { type: 'bandpass', freq: 500, to: 2600, q: 0.9, attack: 0.05 }); break;
      case 'catch': this.tone(520, t, 0.09, 'sine', 0.18, 1100, 0.002); this.noise(t, 0.05, 0.1, { type: 'bandpass', freq: 2200, q: 1 }); break;
      case 'bite': // çıtır çıtır
        for (let i = 0; i < 6; i++) this.noise(t + i * 0.021 + Math.random() * 0.01, 0.03, 0.15 * (1 - i * 0.1), { type: 'bandpass', freq: 2400 + Math.random() * 2600, q: 1.6, attack: 0.001 });
        this.tone(170, t, 0.06, 'sine', 0.07, 120, 0.002);
        break;
      case 'mine': // tostu ben kaptım
        this.duck(0.3, 1.6);
        [[784, 0], [988, 0.08], [1175, 0.16], [1568, 0.26]].forEach(([f, d]) => { this.tone(f, t + d, 0.22, 'square', 0.05); this.tone(f, t + d, 0.3, 'triangle', 0.08); });
        this.cheer(t + 0.2, 1.4);
        break;
      case 'miss': this.tone(392, t, 0.25, 'triangle', 0.08, 330, 0.01); this.tone(330, t + 0.22, 0.4, 'triangle', 0.07, 262, 0.01); break;
      case 'champ':
        this.duck(0.15, 3);
        [[523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [659, 0.45, 0.5], [784, 0.62, 0.9]].forEach(([f, d, L]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), L, 0.06, 0.15); this.tone(f, t + d, L, 'triangle', 0.06); });
        this.noise(t + 0.62, 1.4, 0.16, { type: 'highpass', freq: 4400 });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
const STEEL = () => C('#9aa0a8', -0.7), STEEL_D = () => C('#70757e', -0.75), BLACK = () => C('#1a1a1f', -0.55), IRON = () => C('#2a2a30', -0.25), IRON_R = () => C('#3b3b44', -0.3);
let BODY_HEX = '#c8261c';
const BODY = () => C(BODY_HEX, -0.8), BODY_D = () => C(BODY_HEX, -0.5);
// Tost makinesi gövdesi (orijin masada, ön yüz +z): ayaklar, paslanmaz gövde, alt ızgara plakası ve olukları, ön panel, menteşeler
function machineBase(mb) {
  const S = STEEL(), Sd = STEEL_D(), B = BLACK(), I = IRON(), Ir = IRON_R();
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.rbox(x * (MW / 2 - 0.05) - 0.025, 0, z * (MD / 2 - 0.05) - 0.025, x * (MW / 2 - 0.05) + 0.025, 0.018, z * (MD / 2 - 0.05) + 0.025, 0.008, B, 2);
  mb.rbox(-MW / 2, 0.014, -MD / 2, MW / 2, MB, MD / 2, 0.03, BODY(), 3);
  mb.rbox(-MW / 2 + 0.006, 0.016, -MD / 2 + 0.006, MW / 2 - 0.006, 0.034, MD / 2 - 0.006, 0.012, B, 2);
  mb.rbox(-MW / 2 + 0.03, MB - 0.006, -MD / 2 + 0.03, MW / 2 - 0.03, MB + 0.004, MD / 2 - 0.03, 0.01, I, 2);
  for (let k = 0; k < 9; k++) { const z = -MD / 2 + 0.06 + k * (MD - 0.12) / 8; mb.rbox(-MW / 2 + 0.045, MB + 0.001, z - 0.0065, MW / 2 - 0.045, MB + 0.009, z + 0.0065, 0.003, Ir, 1); }
  // ön panel: siyah şerit + ayar düğmesi + lamba yuvası
  mb.rbox(-MW / 2 + 0.05, MB * 0.34, MD / 2 - 0.004, -MW / 2 + 0.25, MB * 0.7, MD / 2 + 0.006, 0.006, B, 1);
  mb.push().T(MW / 2 - 0.15, MB * 0.52, MD / 2, 0, Math.PI / 2, 0);
  mb.lathe(0, 0, 0, [[0.024, 0], [0.024, 0.012], [0.02, 0.018], [0, 0.019]], 18, B, 'b');
  mb.pop();
  mb.push().T(MW / 2 - 0.07, MB * 0.52, MD / 2 + 0.002, 0, Math.PI / 2, 0);
  mb.torusN(0, 0, 0, 0.025, 0.006, 0.006, 20, 6, Sd);
  mb.pop();
  // menteşeler (arkada)
  for (const x of [-MW * 0.3, MW * 0.3]) limb(mb, [x - 0.045, MB + GAP * 0.55, -MD / 2 - 0.006], [x + 0.045, MB + GAP * 0.55, -MD / 2 - 0.006], [0.014, 0.014], Sd, 10);
}
// kapak: menteşe ekseninde orijin, +z yönünde uzanır; alt yüzde ızgara plakası, önde sap
function machineLid(mb) {
  const S = STEEL(), Sd = STEEL_D(), B = BLACK(), I = IRON(), Ir = IRON_R();
  mb.rbox(-MW / 2 + 0.004, 0.006, 0, MW / 2 - 0.004, LH, MD, 0.03, BODY(), 3);
  mb.rbox(-MW / 2 + 0.002, 0.004, 0.002, MW / 2 - 0.002, 0.024, MD - 0.002, 0.012, B, 2);
  mb.rbox(-MW / 2 + 0.03, -0.004, 0.03, MW / 2 - 0.03, 0.008, MD - 0.03, 0.01, I, 2);
  for (let k = 0; k < 9; k++) { const z = 0.06 + k * (MD - 0.12) / 8; mb.rbox(-MW / 2 + 0.045, -0.009, z - 0.0065, MW / 2 - 0.045, -0.001, z + 0.0065, 0.003, Ir, 1); }
  mb.rbox(-MW / 2 + 0.05, LH - 0.004, MD * 0.22, MW / 2 - 0.05, LH + 0.003, MD * 0.22 + 0.014, 0.004, Sd, 1);
  mb.rbox(-MW / 2 + 0.05, LH - 0.004, MD * 0.78, MW / 2 - 0.05, LH + 0.003, MD * 0.78 + 0.014, 0.004, Sd, 1);
  for (const x of [-0.2, 0.2]) limb(mb, [x, LH * 0.55, MD - 0.012], [x, LH * 0.55, MD + 0.055], [0.013, 0.013], B, 8);
  limb(mb, [-0.235, LH * 0.55, MD + 0.055], [0.235, LH * 0.55, MD + 0.055], [0.019, 0.019], B, 12);
}
function lampModel(mb, lit) { mb.sphereS(0, 0, 0, 0.034, 0.034, 0.034, lit ? [1, 1, 1, 0.95] : [1, 1, 1, -0.8], 16, 10); }
const LAMP = [MW / 2 + 0.035, MB + 0.15, MD / 2 - 0.02];
function lampPost(mb) {
  const B = BLACK(), Sd = STEEL_D();
  mb.lathe(LAMP[0], 0.0, LAMP[2], [[0.03, 0], [0.03, 0.012], [0.012, 0.02], [0.01, 0.02]], 16, B, 'b');
  limb(mb, [LAMP[0], 0.012, LAMP[2]], [LAMP[0], LAMP[1] - 0.03, LAMP[2]], [0.009, 0.009], Sd, 8);
  mb.lathe(LAMP[0], LAMP[1] - 0.042, LAMP[2], [[0.012, 0], [0.026, 0.014], [0.03, 0.02]], 16, B);
}
// kaşarlı tost (orijin altın ortası): iki dilim ekmek, ortada eriyen kaşar, ızgara izleri
function tostModel(mb) {
  const CR = C('#c9873a', -0.25), CRS = C('#e2ae62', -0.18), CH = C('#ffc53a', -0.55), GR = C('#4a280e', -0.1);
  mb.superS(0, 0.034, 0, 0.15, 0.034, 0.13, 0.32, 0.22, CR, 30, 14, (nx, ny, nz, px, py) => (Math.abs(py) < 0.26 ? CH : Math.abs(py) < 0.55 ? CRS : CR));
  // ızgara izleri: makinenin oluklarıyla aynı yönde dört koyu çizgi (üstte ve altta)
  for (let k = 0; k < 4; k++) {
    const z = -0.0825 + k * 0.055, hw = 0.112;
    mb.rbox(-hw, 0.066, z - 0.0095, hw, 0.0702, z + 0.0095, 0.004, GR, 1);
    mb.rbox(-hw, -0.0022, z - 0.0095, hw, 0.0018, z + 0.0095, 0.004, GR, 1);
  }
  // kenarlardan taşan eriyik kaşar
  for (const [x, z, k] of [[0.146, 0.03, 1.15], [-0.07, 0.127, 1], [0.05, -0.127, 1.05], [-0.147, -0.055, 0.9], [0.1, 0.116, 0.8], [-0.12, 0.09, 0.7]]) mb.sphereS(x, 0.03, z, 0.02 * k, 0.03 * k, 0.02 * k, CH, 10, 6);
}
// oyuncunun zili: siyah gövde + krom halka; kubbe ayrı ağ (oyuncunun rengine boyanır)
function buzzerBase(mb) {
  const B = C('#1c1c22', -0.7), Mt = C('#c9ccd3', -0.9);
  mb.lathe(0, 0, 0, [[0, 0], [0.076, 0], [0.08, 0.006], [0.078, 0.026], [0.07, 0.033], [0.058, 0.034], [0, 0.034]], 32, B);
  mb.torusN(0, 0.034, 0, 0.058, 0.005, 0.004, 32, 6, Mt);
}
function buzzerDome(mb, lit) {
  const W = lit ? [1, 1, 1, 0.9] : [1, 1, 1, -0.75];
  mb.lathe(0, 0, 0, [[0.052, 0], [0.052, 0.012], [0.048, 0.026], [0.037, 0.038], [0.02, 0.045], [0, 0.047]], 28, W);
}
// tahta servis altlığı (makinenin altında)
function boardModel(mb) {
  const W = C('#8a5a32', -0.25), Wd = C('#6e4524', -0.2);
  mb.rbox(-MW / 2 - 0.06, 0, -MD / 2 - 0.05, MW / 2 + 0.06, 0.02, MD / 2 + 0.09, 0.012, W, 2);
  for (let k = 0; k < 5; k++) { const x = -MW / 2 - 0.02 + k * ((MW + 0.04) / 4); mb.rbox(x - 0.002, 0.019, -MD / 2 - 0.03, x + 0.002, 0.0205, MD / 2 + 0.07, 0.001, Wd, 1); }
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
// dokunuş zamanı (olay zaman damgası performance.now ile aynı eksendeyse onu kullan)
const evTime = (e) => { const n = performance.now(); const ts = e && e.timeStamp; return ts && ts > 0 && Math.abs(ts - n) < 4000 ? Math.min(ts, n) : n; };
const easeOut = (x) => 1 - (1 - x) * (1 - x);

/* ============================ oyun ============================ */
class ToastGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'tdv', cls: 'tdv', title: 'Tostuna Dövüş', sub: 'Lamba yeşile dönünce zile vur!', emoji: '⚡', css: STYLE, snd: new TdSnd(), amb: 'diner', ambVol: 0.5, botPx: 260, botPxL: 40, cloth: '#2f4a3f', trim: '#ffd27a', place: false });
    this.lampK = 0.82;
    this.lidA = 0;              // kapak açısı (0 kapalı)
    this.slap = new Map();      // koltuk → vuruş anı (sahne saati)
    this.seenT = new Map();     // koltuk → bu turda görülen süre/erken durumu
    this.toast = null;          // { mode: 'in'|'up'|'fly'|'held'|'drop', t0, ... }
    this.local = null;          // bu turdaki kendi dokunuşum { key, ms | early }
    this.goStart = null; this.goFor = -1; this.goPending = false;
    this.trophies = [];
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    BODY_HEX = this.accHex || '#c8261c';
    W.base = this.mk(machineBase);
    W.lid = this.mk(machineLid);
    W.lamp = this.mk((mb) => lampModel(mb, false));
    W.post = this.mk(lampPost);
    W.lampE = this.mk((mb) => lampModel(mb, true));
    W.tost = this.mk(tostModel);
    W.board = this.mk(boardModel);
    W.bBase = this.mk(buzzerBase);
    W.dome = this.mk((mb) => buzzerDome(mb, false));
    W.domeE = this.mk((mb) => buzzerDome(mb, true));
    W.trophy = this.mk(trophyModel);
  }
  // makine ölçeği: masa büyüdükçe büyür
  get TS() { return clamp(this.R * Math.min(1, this.kz) * 0.95, 1.3, 2.4); }
  mPos(x, y, z) { const s = this.TS; return [x * s, TABLE_Y + 0.02 * s + y * s, z * s]; }
  lidMat(m) {
    const s = this.TS, a = this.lidMA || (this.lidMA = M.make()), b = this.lidMB || (this.lidMB = M.make());
    const jit = this.view?.phase === 'wait' ? Math.sin(this.time * 61) * 0.0016 * clamp(this.waitK(), 0, 1) : 0;
    M.set(a, 0, TABLE_Y + 0.02 * s, 0, 0, 0, 0, s);
    M.set(b, 0, MB + GAP + jit, -MD / 2, 0, -this.lidA, 0, 1);
    return M.mul(m, a, b);
  }
  // koltuk uzayındaki nokta → dünya
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  buzzerW(a) { return this.seatW(a, 0, TABLE_Y + 0.002, BUZ_Z); }
  waitK() { const v = this.view; return v && v.phase === 'wait' ? (this.ctx.serverNow() - (v.waitAt || 0)) / 6000 : 0; }
  rkey() { const v = this.view; return v ? `${v.game}:${v.round}` : ''; }

  /* ---------- girdi ---------- */
  bindUi() {
    this.el.bar.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('[data-hit]')) return;
      e.preventDefault();
      this.hit(e);
    });
    // sahnenin herhangi bir yerine dokunmak da sayılır (büyük hedef)
    this.el.cv.addEventListener('pointerdown', (e) => { const v = this.view; if (v && (v.phase === 'wait' || v.phase === 'go')) { e.preventDefault(); this.hit(e); } });
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'td-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'td-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('start', { m: this.view?.mode || 'kisa' }); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (this.dead || e.repeat || (e.target && /input|textarea|select/i.test(e.target.tagName || ''))) return;
      if (e.key === ' ' || e.key === 'Enter') { const v = this.view; if (v && (v.phase === 'wait' || v.phase === 'go')) { e.preventDefault(); this.hit(e); } }
    };
    window.addEventListener('keydown', this.onKey);
  }
  hit(e) {
    const v = this.view;
    if (!v || !v.amIn || (v.phase !== 'wait' && v.phase !== 'go') || v.myEarly || v.myTime != null) return;
    const key = this.rkey();
    if (this.local && this.local.key === key) return;
    const ts = evTime(e);
    const S = this.snd, fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    // yeşil henüz ekrana çizilmediyse (ya da kırmızıdaysa) erken sayılır
    if (v.phase === 'wait' || this.goFor !== v.goId || this.goStart == null) {
      this.local = { key, early: true, at: this.time };
      fx('early'); vibrate([70, 40, 90]);
      this.flash('rgba(150,80,220,.55)');
      this.ctx.send('tap', { ms: null });
    } else {
      const ms = Math.max(1, Math.round(ts - this.goStart));
      this.local = { key, ms, at: this.time };
      fx('buzz'); vibrate(28);
      this.ctx.send('tap', { ms });
    }
    if (v.me >= 0) this.slap.set(v.me, this.time);
    this.bar();
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.tdv !== '1') { root.dataset.tdv = '1'; root.innerHTML = '<p class="py-16 text-center">⚡</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // başkalarının vuruşları ve erken vuranlar
    if (v.phase === 'wait' || v.phase === 'go' || v.phase === 'result') {
      v.seats.forEach((p, i) => {
        const k = p.t != null ? 't' + p.t : p.e ? 'e' : '';
        const was = this.seenT.get(i) || '';
        if (k && k !== was) {
          this.seenT.set(i, k);
          if (i !== v.me && v.phase !== 'result') {
            this.slap.set(i, this.time);
            try { this.snd.fx(p.e ? 'earlyO' : 'buzzO', i % 6); } catch { /* yok */ }
          }
        }
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const sNow = this.ctx.serverNow();
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } this.trophies = []; this.toast = { mode: 'in', t0: this.time }; this.lidTo = 0; }
    if (v.phase === 'wait') {
      try { S.music('race'); } catch { /* yok */ }
      this.seenT = new Map(); this.slap = new Map(); this.local = null; this.goStart = null; this.goFor = -1;
      this.trophies = [];
      const fresh = sNow - (v.waitAt || 0) < 900;
      if (this.toast && this.toast.mode !== 'in') { if (fresh) fx('shut'); }
      this.toast = { mode: 'in', t0: this.time };
      this.lidTo = 0;
      if (fresh) this.msg(`${v.round}. TUR`, 'mid');
    }
    if (v.phase === 'go') {
      try { S.music('mute'); } catch { /* yok */ }
      const late = sNow - (v.goAt || 0) > 1500;
      this.lidTo = 1;
      this.toast = { mode: 'up', t0: this.time - (late ? 1 : 0), from: this.toastPos() };
      // yeşil bir sonraki karede çizilir; tepki süresi o karenin başladığı andan ölçülür
      if (v.amIn && !v.myEarly && v.myTime == null) { this.goPending = true; this.goFor = -1; }
      if (!late) { fx('ding'); setTimeout(() => { try { if (!this.dead) this.snd.fx('jump'); } catch { /* yok */ } }, 40); this.flash('rgba(60,230,110,.35)'); }
    }
    if (v.phase === 'result') {
      try { S.music('calm'); } catch { /* yok */ }
      this.goPending = false;
      this.lidTo = 1;
      const fresh = sNow - (v.resAt || 0) < 1200;
      this.resT = this.time - (fresh ? 0 : 3);
      if (v.winner >= 0) {
        this.toast = { mode: 'fly', t0: this.time - (fresh ? 0 : 3), from: this.toastPos(), k: v.winner };
        if (fresh) {
          fx('fly');
          if (v.winner === v.me) setTimeout(() => { try { if (!this.dead) { this.snd.fx('mine'); vibrate([40, 30, 40, 30, 120]); } } catch { /* yok */ } }, 520);
          else if (v.me >= 0 && (v.early || []).includes(v.me)) setTimeout(() => { try { if (!this.dead) this.snd.fx('trombone'); } catch { /* yok */ } }, 400);
          else setTimeout(() => { try { if (!this.dead) this.snd.fx('catch'); } catch { /* yok */ } }, 560);
        }
      } else {
        this.toast = { mode: 'drop', t0: this.time - (fresh ? 0 : 3), from: this.toastPos() };
        if (fresh) fx('miss');
      }
    }
    if (v.phase === 'final') {
      try { S.music('idle'); } catch { /* yok */ }
      const late = sNow - (v.finAt || 0) > 2500;
      const ch = v.champ || [];
      this.champK = ch.length ? ch[0] : -1;
      this.trophies = ch.map((w, n) => {
        const a = this.seatAngle(w), r = this.rAt(a, this.R) - 0.32;
        return { k: w, t: late ? 9 : -0.35 * n, x: Math.cos(a) * r + Math.sin(a) * 0.3, z: Math.sin(a) * r - Math.cos(a) * 0.3, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), landed: late };
      });
      this.lidTo = 0;
      this.toast = { mode: 'in', t0: this.time };
      if (!late) {
        const mine = ch.includes(v.me);
        fx('champ');
        if (mine) { this.flash('rgba(255,215,90,.6)', true); vibrate([60, 40, 60, 40, 160]); }
        const nm = ch.length ? v.seats[ch[0]]?.n || '' : '';
        this.msg(mine ? '👑 KAZANDIN!' : `👑 ${esc(nm.replace(/ 🤖$/, '').toLocaleUpperCase('tr'))}`, 'mid gold');
      }
      this.finT = this.time;
    }
  }

  /* ---------- tost ---------- */
  // tostun şu anki dünya konumu, dönüşü ve ölçeği
  toastState() {
    const T = this.toast, s = this.TS;
    const inPos = this.mPos(0, MB + 0.006, 0);
    const upPos = this.mPos(0, MB + GAP + 0.44, 0.05);
    if (!T || T.mode === 'in') return { p: inPos, ry: 0, rx: 0, sc: s, vis: true };
    const u = this.time - T.t0;
    if (T.mode === 'up') {
      const k = clamp(u / 0.38, 0, 1), e = easeOut(k);
      const from = T.from || inPos;
      const bob = Math.sin(this.time * 3.1) * 0.018 * s * k;
      return { p: [lerp(from[0], upPos[0], e), lerp(from[1], upPos[1], e) + bob, lerp(from[2], upPos[2], e)], ry: u * 1.9, rx: (-0.42 + Math.sin(this.time * 2.3) * 0.12) * e, sc: s, vis: true };
    }
    if (T.mode === 'drop') {
      const k = clamp(u / 0.5, 0, 1), e = k * k;
      const from = T.from || upPos;
      return { p: [lerp(from[0], inPos[0], e), lerp(from[1], inPos[1], e), lerp(from[2], inPos[2], e)], ry: 0, rx: 0, sc: s, vis: true };
    }
    if (T.mode === 'fly') {
      const a = this.avatarAt(T.k);
      if (!a) return { p: upPos, ry: 0, rx: 0, sc: s, vis: false };
      const hp = this.heldPos(a, u);
      const k = clamp(u / 0.62, 0, 1);
      if (k < 1) {
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const from = T.from || upPos;
        const arc = Math.sin(Math.PI * k) * 0.45;
        return { p: [lerp(from[0], hp.p[0], e), lerp(from[1], hp.p[1], e) + arc, lerp(from[2], hp.p[2], e)], ry: lerp(0, hp.ry, e) + (1 - e) * 9, rx: lerp(0, hp.rx, e), sc: lerp(s, hp.sc, e), vis: true };
      }
      return hp;
    }
    return { p: inPos, ry: 0, rx: 0, sc: s, vis: true };
  }
  // kazananın elindeki tost: ağzına götürüp ısırır (u: uçuşun başından beri)
  heldPos(a, u) {
    const bites = [1.05, 1.75, 2.45];
    let bite = 0, done = 0;
    for (const b of bites) { const d = u - b; if (d >= 0) done += 1; if (d > -0.22 && d < 0.18) bite = Math.max(bite, d < 0 ? (0.22 + d) / 0.22 : 1 - d / 0.18); }
    const y = 1.15 + 0.03 * bite, z = 0.47 - 0.1 * bite;
    const p = this.seatW(a, 0, y, z);
    return { p, ry: a.yaw, rx: -1.15 + 0.15 * bite, sc: 0.78 * Math.pow(0.86, done), vis: true, bite, done };
  }
  toastPos() { return this.toastState().p; }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, n = Math.max(1, this.seats.length);
    const cam = [this.cam.ex, this.cam.ey, this.cam.ez];
    const mach = this.mPos(0, MB + 0.1, 0);
    const tp = this.toastPos();
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null };
      const S = a.idle;
      const live = v.phase === 'wait' || v.phase === 'go';
      if (live) {
        if (!p.in) { a.pose('lean', { t }); a.expr = 'smile'; a.look = mach; return; }
        const sl = this.slap.get(i);
        const u = sl != null ? t - sl : -1;
        const early = p.e || (i === v.me && this.local && this.local.early);
        if (early && u > 0.55) { a.pose('facepalm', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
        // el zilin üstünde: vuruşta avuç zile iner
        a.pose('rest', { t });
        a.tgt.lean = 0.16;
        a.k = 26;
        const down = u >= 0 && u < 0.32;
        const tr = v.phase === 'wait' ? Math.sin(t * 31 + i) * 0.004 * (0.4 + clamp(this.waitK(), 0, 1)) : 0;
        a.tgt.hand[0] = down ? [0.0, TABLE_Y + DOME_TOP + 0.042, BUZ_Z - 0.05] : u >= 0.32 ? [0.0, TABLE_Y + DOME_TOP + 0.075, BUZ_Z - 0.06] : [0.0 + tr, TABLE_Y + DOME_TOP + 0.13 + tr, BUZ_Z - 0.075];
        a.tgt.fdir[0] = [0.05, -0.3, 1]; a.tgt.palm[0] = [0, -1, 0.05]; a.tgt.fw[0] = 1; a.tgt.pole[0] = [-0.85, -0.45, -0.25];
        a.shape[0] = 'open';
        if (down) a.k = 60;
        a.expr = v.phase === 'go' ? (u >= 0 ? 'grin' : 'o') : 'tense';
        a.look = v.phase === 'go' ? tp : mach;
        return;
      }
      if (v.phase === 'result') {
        const u = this.time - (this.resT || 0);
        const win = v.winner === i;
        const early = (v.early || []).includes(i);
        if (win) {
          const T = this.toast;
          const fu = T && T.mode === 'fly' ? this.time - T.t0 : 0;
          if (fu < 0.45) { a.pose('cheer', { t }); a.tgt.lean = 0.05; a.expr = 'o'; a.look = tp; return; }
          // iki elle tutar, ağzına götürür
          const hp = this.heldPos(a, fu);
          const y = 1.15 + 0.03 * hp.bite, z = 0.47 - 0.1 * hp.bite;
          a.pose('rest', { t });
          a.tgt.lean = 0.04;
          a.k = 18;
          a.tgt.hand[0] = [-0.12, y - 0.03, z - 0.06]; a.tgt.hand[1] = [0.12, y - 0.03, z - 0.06];
          a.tgt.fdir[0] = [0.55, 0.25, 1]; a.tgt.fdir[1] = [-0.55, 0.25, 1];
          a.tgt.palm[0] = [1, 0.2, 0.1]; a.tgt.palm[1] = [-1, 0.2, 0.1];
          a.tgt.pole[0] = [-0.8, -0.6, 0]; a.tgt.pole[1] = [0.8, -0.6, 0];
          a.tgt.fw[0] = a.tgt.fw[1] = 0.85;
          a.shape[0] = a.shape[1] = 'grip';
          a.expr = hp.bite > 0.3 ? 'laugh' : 'grin';
          a.look = null; a.tgt.hy = 0; a.tgt.hp = -0.05;
          return;
        }
        if (early) { a.pose(u < 2 ? 'facepalm' : 'slump', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
        const w = v.winner >= 0 ? this.avatarAt(v.winner) : null;
        if (u < 0.7 || !w) { a.pose('lean', { t }); a.expr = 'o'; a.look = tp; return; }
        const r = hs(i, v.round);
        a.pose(r < 0.45 ? 'clap' : r < 0.75 ? 'shrug' : 'rest', { t });
        a.expr = r < 0.45 ? 'smile' : 'sad';
        a.look = w.headW;
        return;
      }
      if (v.phase === 'final') {
        const win = (v.champ || []).includes(i);
        const u = this.time - (this.finT || 0);
        const w = this.champK >= 0 ? this.avatarAt(this.champK) : null;
        if (win) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = cam; }
        else { a.pose(Math.floor(u / 2.6 + i) % 3 === 0 ? 'rest' : 'clap', { t }); a.expr = 'grin'; a.look = w ? w.headW : mach; }
        return;
      }
      // giriş
      S.mt -= dt;
      if (S.mt <= 0) { S.mood = Math.random() < 0.55 ? 'rest' : 'chin'; S.mt = 5 + Math.random() * 7; }
      S.lt -= dt;
      if (S.lt <= 0) {
        S.lt = 1.8 + Math.random() * 3.5;
        const r = Math.random();
        const nb = this.avatarAt((i + (r < 0.5 ? 1 : n - 1)) % n);
        S.look = r < 0.6 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? mach : cam;
        a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
      }
      if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = cam; }
      else { a.pose(S.mood, { t }); a.look = S.look; }
    });
  }
  avTint(a, i) {
    const v = this.view, p = v?.seats?.[i];
    const want = p && (v.phase === 'wait' || v.phase === 'go') && !p.in ? 0.7 : 1;
    a.dimK = damp(a.dimK ?? 1, want, 3, 0.016);
    return a.dimK;
  }

  /* ---------- kamera, kapak, buhar ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    // yeşil bu karede çiziliyor: tepki saati başlar
    if (this.goPending && v.phase === 'go') { this.goPending = false; this.goStart = performance.now(); this.goFor = v.goId; vibrate(35); }
    const sNow = this.ctx.serverNow();
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    // kapak
    const lt = this.lidTo || 0;
    this.lidA = lt > 0 ? Math.min(LID_OPEN, this.lidA + dt * 14) : damp(this.lidA, 0, 9, dt);
    // buhar: beklerken kapağın kenarlarından, havadaki tosttan
    this.steamT = (this.steamT || 0) - dt;
    if (this.steamT <= 0 && this.X) {
      const s = this.TS;
      if (v.phase === 'wait' || v.phase === 'intro') {
        this.steamT = v.phase === 'wait' ? 0.07 : 0.22;
        const side = Math.random() < 0.5 ? -1 : 1;
        const q = Math.random() < 0.6 ? this.mPos((Math.random() - 0.5) * MW * 0.9, MB + GAP * 0.6, side * MD * 0.48) : this.mPos(side * MW * 0.49, MB + GAP * 0.6, (Math.random() - 0.5) * MD * 0.9);
        this.burst(q[0], q[1], q[2], 1, [[0.92, 0.92, 0.95], [0.82, 0.83, 0.86]], 0.18 * s, 0.05 * s, false, 1.3, -0.25);
      } else if (v.phase === 'go') {
        this.steamT = 0.1;
        const p = this.toastPos();
        this.burst(p[0], p[1] + 0.05 * s, p[2], 1, [[0.95, 0.95, 0.97]], 0.12 * s, 0.04 * s, false, 0.9, -0.3);
      } else this.steamT = 0.3;
    }
    // ısırık kırıntıları
    const T = this.toast;
    if (T && T.mode === 'fly' && v.phase === 'result') {
      const a = this.avatarAt(T.k);
      if (a) {
        const hp = this.heldPos(a, this.time - T.t0);
        if (hp.done > (T.crumbs || 0)) {
          T.crumbs = hp.done;
          try { this.snd.fx('bite'); } catch { /* yok */ }
          this.burst(hp.p[0], hp.p[1] + 0.03, hp.p[2], 14, [[0.86, 0.6, 0.27], [0.95, 0.75, 0.4], [1, 0.82, 0.25]], 0.9, 0.022, false, 0.8, 5);
        }
        if (!T.caught && this.time - T.t0 >= 0.62) { T.caught = true; this.burst(hp.p[0], hp.p[1], hp.p[2], 10, [[1, 0.9, 0.5], [1, 1, 1]], 1.1, 0.03, true, 0.5, 2); }
      }
    }
    // kamera
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0, bp = 260;
    const hitH = Math.round(clamp(0.23 * (this.vh || 800), 118, 200));
    if (v.phase === 'wait') { const k = clamp((sNow - (v.waitAt || 0)) / 5000, 0, 1); zoom = lerp(0.96, 0.8, sst(0, 1, k)); pa = 0.06 + 0.06 * k; bp = hitH + 54; }
    else if (v.phase === 'go') { zoom = 0.78; pa = 0.12; bp = hitH + 54; }
    else if (v.phase === 'result') {
      bp = 150; zoom = 0.86; pa = 0.06;
      const a = v.winner >= 0 ? this.avatarAt(v.winner) : null;
      if (a && this.time - (this.resT || 0) > 0.35) {
        // kazanana yaklaş; sırtı kameraya dönükse (masanın bu yanındaysa) yüzünü görecek şekilde dön
        const ang = this.seatAngle(v.winner);
        const near = Math.sin(ang) > 0.35;
        yaw = near ? angDiff(-Math.PI / 2 - ang, 0) : 0;
        zoom = 0.4; pa = near ? -0.26 : -0.16;
        const H = a.headW;
        const f = this.aimAt(H, land ? 0.4 : 0.5, land ? 0.45 : 0.36, yaw, pa);
        fx = f[0]; fy = f[1]; fz = f[2];
      }
    } else if (v.phase === 'final' && this.champK >= 0) {
      const a = this.avatarAt(this.champK);
      bp = 120;
      if (a) {
        const card = this.finCard();
        yaw = -Math.PI / 2 - this.seatAngle(this.champK);
        zoom = card ? 0.62 : 0.52; pa = -0.34;
        const f = this.aimAt(a.headW, land && card ? 0.3 : 0.5, land ? 0.4 : card ? 0.2 : 0.4, yaw, pa);
        fx = f[0]; fy = f[1]; fz = f[2];
      }
    } else { yaw = Math.sin(this.time * 0.13) * 0.06; bp = 300; }
    if (this.snd) this.snd.int = v.phase === 'wait' ? clamp(this.waitK(), 0, 1) : 0;
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    if (land && v.phase !== 'final' && v.phase !== 'result') {
      if (this.cfg.botPxL !== 34) { this.cfg.botPxL = 34; this.fitKey = ''; }
      const f = this.aimAt([0, 0.7, 0], 0.38, 0.5, yaw, pa); fx = f[0]; fy = f[1]; fz = f[2];
    }
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, v.phase === 'go' ? 6 : 2.4, dt);
    c.fx = damp(c.fx, fx, 3, dt); c.fz = damp(c.fz, fz, 3, dt); c.fy = damp(c.fy, fy, 3, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    this.stepTrophy(dt);
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  finCard() { const v = this.view; return !!v && v.phase === 'final' && this.ctx.serverNow() - (v.finAt || 0) >= 2600; }
  stepTrophy(dt) {
    for (const T of this.trophies || []) {
      T.t += dt;
      if (!T.landed && T.t >= 0.9) {
        T.landed = true;
        try { this.snd.fx('thud'); } catch { /* yok */ }
        this.cam.shake = Math.max(this.cam.shake, 0.22);
        const a = this.avatarAt(T.k);
        const CF = [[1, 0.82, 0.25], [1, 0.35, 0.4], [0.3, 0.86, 0.45], [0.3, 0.66, 1], [0.78, 0.5, 1]];
        if (a) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, CF, 2.6, 0.04, false, 2.2, 2.2);
      }
    }
  }

  /* ---------- çizim ---------- */
  lampCol() {
    const v = this.view;
    if (!v || v.phase === 'intro') return null;
    if (v.phase === 'wait') return RED3;
    if (v.phase === 'final') return GOLD3;
    return GREEN3;
  }
  sceneGame(D, shadow) {
    const Wd = this.W;
    if (!Wd || !Wd.base) return;
    const m = this.mats.b, T = this.T, v = this.view, s = this.TS;
    M.set(m, 0, TABLE_Y, 0, 0, 0, 0, s);
    D(Wd.board, m, T.obj);
    M.set(m, 0, TABLE_Y + 0.02 * s, 0, 0, 0, 0, s);
    D(Wd.base, m, T.obj);
    D(Wd.lid, this.lidMat(this.mats.c), T.obj);
    M.set(m, 0, TABLE_Y + 0.02 * s, 0, 0, 0, 0, s);
    D(Wd.post, m, T.obj);
    // lamba
    const lc = this.lampCol();
    const lp = this.mPos(LAMP[0], LAMP[1], LAMP[2]);
    M.set(m, lp[0], lp[1], lp[2], 0, 0, 0, s);
    if (lc && !shadow) {
      const tint = this.lT || (this.lT = new Float32Array(3));
      const pul = v.phase === 'wait' ? 0.75 + 0.25 * Math.sin(this.time * 6) : 1;
      tint[0] = lc[0] * 1.3 * pul; tint[1] = lc[1] * 1.3 * pul; tint[2] = lc[2] * 1.3 * pul;
      D(Wd.lampE, m, tint, 1, 1);
    } else D(Wd.lamp, m, OFF3);
    // tost
    const ts = this.toastState();
    if (ts.vis) {
      M.set(m, ts.p[0], ts.p[1], ts.p[2], ts.ry, ts.rx, 0, ts.sc);
      D(Wd.tost, m, T.obj);
    }
    // oyuncuların zilleri
    if (!shadow && v && (v.game || v.phase !== 'intro')) {
      const mm = this.mats.c, tint = this.bT || (this.bT = new Float32Array(3));
      const live = v.phase === 'wait' || v.phase === 'go' || v.phase === 'result';
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        const b = this.buzzerW(a);
        M.set(mm, b[0], b[1], b[2], a.yaw, 0, 0, 1);
        D(Wd.bBase, mm, T.obj);
        const col = hexRGB(pcol(p.c));
        const sl = this.slap.get(i), u = sl != null ? this.time - sl : -1;
        const pressed = u >= 0 && u < 0.3;
        const early = live && (p.e || (i === v.me && this.local && this.local.early && this.local.key === this.rkey()));
        const tapped = live && (p.t != null || (i === v.me && this.local && this.local.ms != null && this.local.key === this.rkey()));
        const win = v.phase === 'result' && v.winner === i;
        let lit = 0, c3 = col;
        if (early) { lit = u >= 0 && u < 0.9 ? 0.6 + 0.4 * Math.sin(u * 30) : 0.45; c3 = RED3; }
        else if (win) { lit = 0.75 + 0.25 * Math.sin(this.time * 8); c3 = GOLD3; }
        else if (pressed) lit = 1;
        else if (tapped) lit = 0.55;
        M.set(mm, b[0], b[1] + 0.032 - (pressed ? 0.012 : 0), b[2], a.yaw, 0, 0, 1);
        if (lit > 0) { tint[0] = c3[0] * (0.4 + 1.1 * lit); tint[1] = c3[1] * (0.4 + 1.1 * lit); tint[2] = c3[2] * (0.4 + 1.1 * lit); D(Wd.domeE, mm, tint, 1, 1); }
        else { tint[0] = col[0] * 0.75; tint[1] = col[1] * 0.75; tint[2] = col[2] * 0.75; D(Wd.dome, mm, p.in || !live ? tint : OFF3); }
      });
    }
    // şampiyon kupaları
    for (const Tr of this.trophies || []) {
      if (Tr.t < 0) continue;
      const k = clamp(Tr.t / 0.9, 0, 1);
      const y = TABLE_Y + 0.004 + (Tr.landed ? Math.max(0, Math.sin((Tr.t - 0.9) * 14) * 0.03 * Math.exp(-(Tr.t - 0.9) * 6)) : (1 - k * k) * 1.6);
      M.set(m, Tr.x, y, Tr.z, Tr.yaw + (Tr.landed ? 0 : (1 - k) * 4), 0, 0, 1.15);
      D(Wd.trophy, m, T.obj);
    }
  }
  drawFx(F, m) {
    const X = this.X, v = this.view;
    if (!v || !this.W) return;
    const s = this.TS;
    // lambanın ışığı ve yeşilde masaya vuran parıltı
    const lc = this.lampCol();
    if (lc) {
      const lp = this.mPos(LAMP[0], LAMP[1], LAMP[2]);
      // lambanın çevresindeki hale (kameraya dönük) + masaya düşen ışık
      const cv = [this.cam.ex - lp[0], this.cam.ey - lp[1], this.cam.ez - lp[2]];
      const yaw = Math.atan2(cv[0], cv[2]), pit = Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]);
      M.set(m, lp[0], lp[1], lp[2], yaw, pit, 0, 0.2 * s, 1, 0.2 * s);
      drawMesh(X, this.res.glow, m, lc, v.phase === 'wait' ? 0.6 + 0.25 * Math.sin(this.time * 6) : 0.9);
      M.set(m, lp[0], TABLE_Y + 0.025 * s, lp[2], 0, 0, 0, 0.55 * s, 1, 0.55 * s);
      drawMesh(X, this.res.glow, m, lc, 0.32);
    }
    // havadaki tostun altında sıcak parıltı
    const T = this.toast;
    if (T && (T.mode === 'up' || (T.mode === 'fly' && this.time - T.t0 < 0.62))) {
      const p = this.toastPos();
      M.set(m, p[0], TABLE_Y + 0.03, p[2], 0, 0, 0, 0.55 * s, 1, 0.55 * s);
      drawMesh(X, this.res.glow, m, [1, 0.7, 0.3], 0.3);
    }
    // vuranın / kazananın koltuğu
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      let al = 0, col = GREEN3;
      if (v.phase === 'result' && v.winner === i) { al = 0.65 + 0.2 * Math.sin(this.time * 5); col = GOLD3; }
      else if (v.phase === 'final' && (v.champ || []).includes(i)) { al = 0.7 + 0.2 * Math.sin(this.time * 5); col = GOLD3; }
      else if ((v.phase === 'wait' || v.phase === 'go') && p.e) { al = 0.4; col = [0.6, 0.3, 1]; }
      if (al <= 0) return;
      M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 0.95, 1, 0.95);
      drawMesh(X, this.res.glow, m, col, al * 0.6);
    });
  }

  /* ---------- arayüz ---------- */
  // Alt çubuk: durum satırı + büyük vuruş düğmesi (tur boyunca aynı öğe; yalnız görünümü değişir) ya da tur sonucu kartı
  bar() {
    const v = this.view;
    if (!v) return;
    const live = v.phase === 'wait' || v.phase === 'go';
    let mode = 'none', res = '';
    if (live) mode = v.amIn ? 'hit' : 'watch';
    else if (v.phase === 'result') {
      const rk = v.rank || [];
      const meId = v.seats[v.me]?.id;
      const nm = (i) => esc(v.seats[i]?.n || '');
      let cls = '', big = '';
      if (v.winner >= 0) {
        const w = rk[0];
        cls = 'win';
        big = v.winner === v.me ? `🥪 Tostu sen kaptın! <b>${w.ms} ms</b>` : `🥪 ${nm(v.winner)} kaptı! <b>${w.ms} ms</b>`;
      } else { cls = 'none'; big = (v.early || []).length ? '🙈 Herkes erken vurdu!' : '😴 Kimse zile vurmadı'; }
      const chips = rk.slice(0, 5).map((r, k) => `<span class="${v.seats[r.i]?.id === meId ? 'me' : ''}">${k + 1}. ${nm(r.i)} <b>${r.ms}</b></span>`).join('');
      const ear = (v.early || []).map(nm);
      const tgt = v.target || 3;
      const q = v.last ? '🏆 Oyunu kazandı!' : ear.length ? `🙈 Erken: ${ear.join(', ')}` : `İlk ${tgt} tostu kapan kazanır`;
      res = `<div class="td-res ${cls}"><div class="big">${big}</div>${chips ? `<div class="rk">${chips}</div>` : ''}<div class="q">${q}</div></div>`;
      mode = 'res';
    }
    const key = `${v.game}|${v.round}|${mode}|${res}`;
    if (this.setBar(key, mode === 'hit' ? '<div class="td-st" data-st></div><button class="td-hit wait" data-hit aria-label="Zile vur"><span class="e"></span><span class="t"></span><span class="s"></span></button>' : mode === 'watch' ? '<div class="td-st" data-st></div>' : res)) {
      this.stEl = this.el.bar.querySelector('[data-st]');
      this.hitEl = this.el.bar.querySelector('[data-hit]');
      this.hitK = '';
      this.stK = null;
    }
    if (mode === 'hit' && this.hitEl) {
      const mine = this.local && this.local.key === this.rkey() ? this.local : null;
      let st = 'wait', e = '✋', tx = 'BEKLE…', sub = 'Lamba yeşile dönünce vur!';
      if (v.myEarly || (mine && mine.early)) { st = 'early'; e = '🙈'; tx = 'Erken vurdun!'; sub = 'Bu tur yandın, sonraki turu bekle'; }
      else if (v.myTime != null || (mine && mine.ms != null)) { st = 'done'; e = '⚡'; tx = `${v.myTime ?? mine.ms}<small>ms</small>`; sub = 'Diğerleri bekleniyor…'; }
      else if (v.phase === 'go') { st = 'go'; e = '👊'; tx = 'VUR!'; sub = ''; }
      const hk = st + tx;
      if (hk !== this.hitK) {
        this.hitK = hk;
        this.hitEl.className = `td-hit ${st}`;
        this.hitEl.children[0].textContent = e;
        this.hitEl.children[1].innerHTML = tx;
        this.hitEl.children[2].textContent = sub;
      }
    }
    if (this.stEl) {
      const tgt = v.target || 3;
      const st = mode === 'watch' ? '👀 Bu turu izliyorsun, sonraki turda sen de varsın' : `${v.round}. tur <i>·</i> ilk ${tgt} tostu kapan kazanır`;
      if (st !== this.stK) { this.stK = st; this.stEl.innerHTML = st; }
    }
  }
  modeSeg(v) {
    return `<div class="td-seg" role="group" aria-label="Oyun uzunluğu"><button data-act="td-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">🥪 İlk 3 tost</button><button data-act="td-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🔥 İlk 5 tost</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n >= 2}`;
      html = `<div class="card td-in">
        <div class="tt">⚡ Tostuna Dövüş</div>
        <div class="sub">Tost pişti mi, zile en hızlı vuran kapar!</div>
        <div class="td-ru"><div class="r"><b>🔴</b>Lamba kırmızıyken bekle</div><div class="g"><b>🟢</b>Yeşile dönünce zile vur</div><div class="y"><b>🥪</b>En hızlı vuran tostu kapar</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="td-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'Oynamak için masada en az 2 kişi lazım. Oda kodunu paylaş!' : 'Erken vuran o turu yakar. Masadaki herkes başlatabilir.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.finCard()) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const sb = v.scoreboard || [];
      const meId = v.seats[v.me]?.id;
      const ch = (v.champ || []).map((i) => v.seats[i]).filter(Boolean);
      const mine = ch.some((p) => p.id === meId);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}|${sb.map((s) => s.id + s.score).join(',')}`;
      const tt = !ch.length ? 'Oyun bitti!' : `🏆 ${mine ? 'Tostların kralı sensin!' : `${esc(ch[0].n)} kazandı!`}`;
      const best = sb.filter((s) => s.best != null).sort((a, b) => a.best - b.best)[0];
      const list = sb.map((s) => ({ id: s.id, nickname: s.nickname, c: s.c, tag: `${s.score} tost` }));
      const rest = list.slice(3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${k + 4}. ${esc(s.nickname)} <b>${esc(s.tag)}</b></span>`).join('');
      const top3 = list.slice(0, 3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${['🥇', '🥈', '🥉'][k]} ${esc(s.nickname)} <b>${esc(s.tag)}</b></span>`).join('');
      html = `<div class="card">
        <div class="tt">${tt}</div>
        <div class="sub">${best ? `⚡ En hızlı el: ${esc(best.nickname)} · ${best.best} ms` : `İlk ${v.target || 3} tostu kapan kazanır`}</div>
        ${podium(list, meId)}
        <div class="td-rest td-top3">${top3}</div>
        ${rest ? `<div class="td-rest">${rest}</div>` : ''}
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="td-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    let top = '';
    if (v.phase === 'wait' || v.phase === 'go' || v.phase === 'result') top = `${v.round}. tur · ilk ${v.target || 3} tost kazanır`;
    this.top(top);
    // etiketler: tost sayısı, bu turdaki süre / erken / kazanan
    const live = v.phase === 'wait' || v.phase === 'go' || v.phase === 'result';
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = p.sc ? `<span class="td-sc">🥪${p.sc}</span>` : '';
      const mine = i === v.me && this.local && this.local.key === this.rkey() ? this.local : null;
      const ms = live ? (p.t != null ? p.t : mine && mine.ms != null ? mine.ms : null) : null;
      const early = live && (p.e || (mine && mine.early));
      const win = v.phase === 'result' && v.winner === i;
      if (early) x += '<span>🙈</span>';
      else if (ms != null) x += `<span class="td-ms ${win ? 'w' : ''}">${win ? '🏆 ' : ''}${ms}</span>`;
      if (v.phase === 'final' && (v.champ || []).includes(i)) x += '👑';
      const k = x + '|' + !!early;
      if (o.tdK !== k) {
        o.tdK = k;
        let el = o.lbl.querySelector('.td-x');
        if (!el) { el = document.createElement('span'); el.className = 'td-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lbl.classList.toggle('early', !!early);
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.td-x')) o.tdK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    const cx = w / 2, cy = h * 0.46, bw = r * 0.62, bh = r * 0.4;
    g.fillStyle = '#b9bdc6'; g.beginPath(); g.roundRect ? g.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 12) : g.rect(cx - bw / 2, cy - bh / 2, bw, bh); g.fill();
    g.fillStyle = '#2a2a30'; g.fillRect(cx - bw * 0.42, cy - bh * 0.36, bw * 0.84, bh * 0.6);
    const lc = this.lampCol();
    g.fillStyle = lc ? `rgb(${lc.map((x) => Math.round(Math.min(1, x) * 255)).join(',')})` : '#555';
    g.beginPath(); g.arc(cx + bw * 0.38, cy + bh * 0.36, Math.max(6, r * 0.05), 0, TAU); g.fill();
    // tost
    const up = v && (v.phase === 'go' || (v.phase === 'result' && v.winner < 0));
    g.fillStyle = '#d8963f';
    const ty = up ? cy - bh * 0.9 : cy - bh * 0.08;
    g.fillRect(cx - bw * 0.22, ty - bh * 0.14, bw * 0.44, bh * 0.28);
    g.fillStyle = '#ffc63a'; g.fillRect(cx - bw * 0.22, ty - bh * 0.02, bw * 0.44, bh * 0.05);
    if (v && (v.phase === 'wait' || v.phase === 'go' || v.phase === 'result')) this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.font = '800 12px system-ui'; g.textAlign = 'center';
      const win = v.phase === 'result' && v.winner === i;
      g.fillStyle = p.e ? '#c9a2ff' : win ? '#ffd23f' : '#fff';
      const t = p.e ? '🙈' : p.t != null ? `${win ? '🏆 ' : ''}${p.t} ms` : '';
      if (t) g.fillText(t, x, y - 34);
    });
  }
  onDispose() { window.removeEventListener('keydown', this.onKey); }
}

// podyum (ilk üç; alt yazı serbest)
function podium(list, meId) {
  const top = list.slice(0, 3);
  if (top.length < 2) return '';
  const H = [84, 60, 44];
  const cols = [1, 0, 2].filter((i) => top[i]).map((i) => {
    const s = top[i];
    const ini = esc((Array.from(String(s.nickname || '?').trim())[0] || '?').toLocaleUpperCase('tr'));
    return `<div class="pd-c p${i + 1}${s.id === meId ? ' me' : ''}" style="--c:${pcol(s.c)}">${i === 0 ? '<div class="pd-crown">👑</div>' : ''}<div class="pd-av">${ini}</div><div class="pd-nm">${esc(s.nickname)}</div><div class="pd-b" style="height:${H[i]}px"><b>${i + 1}</b><span>${esc(String(s.tag))}</span></div></div>`;
  }).join('');
  const CF = ['#ffd23f', '#ff5a6e', '#3fdc6a', '#4aa8ff', '#c77dff', '#ff9f1c'];
  const conf = Array.from({ length: 26 }, (_, k) => `<i style="--x:${(k * 37 + 5) % 100}%;--d:${((k % 7) * 0.31).toFixed(2)}s;--t:${(2.4 + (k % 5) * 0.35).toFixed(2)}s;--r:${(k * 47) % 360}deg;--h:${CF[k % 6]}"></i>`).join('');
  return `<div class="pd"><div class="pd-cf">${conf}</div>${cols}</div>`;
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new ToastGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[tdv]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
