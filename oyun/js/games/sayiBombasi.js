// Sayı Bombası — 3D restoran masası (NFC Dünyası Oyun)
// Masanın ortasında, fitili yanan kocaman bir bomba var; içinde gizli bir sayı. Sıra masada döner, bomba kafasını
// sırası gelene çevirir. Söylenen sayı tablanın kenarındaki sayı halkasına uçar, aralık daralır, fitil kısalır.
// Bombanın sayısını söyleyen patlar: davul, şişen bomba, patlama, is kara yüz, kahkahalar. Masa kiti (masa3d.js)
// ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-24-a';
import * as sfx from '../sfx.js?v=2026-11-24-a';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, vn, mix3, rgbA, sst } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, makeTexture, updateTexture, drawMesh, limb } = E;

const MAT_H = 0.035;
// söyleme zaman çizelgesi (sn, last.at'ten): sayı halkaya uçar, iner, aralık daralır
const FLY = 0.55, NARROW = 0.45;
// patlama zaman çizelgesi (sn, boom.at'ten): uçuş, şişme (davul), patlama, sonuç kartı
const EXPL = 1.8, RCARD = 2.9;
const BOMB_R = 0.3;

const STYLE = `
#ky.sbm .sb-top{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 56px);display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;z-index:4}
#ky.sbm .sb-rng{display:flex;align-items:center;gap:8px;background:rgba(12,10,26,.72);border:3px solid rgba(255,255,255,.4);border-radius:18px;padding:3px 14px 4px;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.35)}
#ky.sbm .sb-rng small{font-size:11px;font-weight:800;opacity:.7;letter-spacing:.04em;text-transform:uppercase;line-height:1.1;text-align:center}
#ky.sbm .sb-rng b{font-size:30px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.05;letter-spacing:-.01em;white-space:nowrap}
#ky.sbm .sb-rng b i{font-style:normal;opacity:.55;margin:0 5px}
#ky.sbm .sb-rng.hot{border-color:#ff6b4a;box-shadow:0 0 0 3px rgba(255,107,74,.3),0 6px 24px rgba(255,80,40,.45)}
#ky.sbm .sb-rng.hot b{color:#ffd0c0}
#ky.sbm .sb-rng.one b{color:#ff8a6a;animation:sbp .5s ease-in-out infinite alternate}
@keyframes sbp{to{transform:scale(1.08)}}
#ky.sbm .sb-hist{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;max-width:92vw}
#ky.sbm .sb-hist span{display:inline-flex;align-items:center;gap:2px;font-weight:800;font-size:12px;color:#fff;background:rgba(12,10,26,.6);border:2px solid var(--c,#fff);border-radius:99px;padding:0 7px;font-variant-numeric:tabular-nums}
#ky.sbm .sb-hist span i{font-style:normal;font-size:10px;opacity:.85}
#ky.sbm .sb-hist span.new{animation:sbn .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes sbn{from{transform:scale(.2)}to{transform:none}}
#ky.sbm .sb-fly{position:absolute;left:0;top:0;z-index:4;pointer-events:none;font-weight:900;font-size:34px;color:#fff;-webkit-text-stroke:2px var(--ink);text-shadow:0 4px 0 var(--ink);will-change:transform;display:none}
#ky.sbm .sb-kp{width:100%;max-width:400px;display:flex;flex-direction:column;gap:7px;pointer-events:auto}
#ky.sbm .sb-in{display:flex;align-items:center;gap:8px;background:var(--ort);color:var(--ink);border:4px solid var(--ink);border-radius:20px;box-shadow:4px 4px 0 var(--ink);padding:4px 6px 4px 14px;min-height:56px}
#ky.sbm .sb-in .sb-d{font-size:34px;font-weight:900;font-variant-numeric:tabular-nums;min-width:2.2em;letter-spacing:.02em}
#ky.sbm .sb-in .sb-d.bad{color:#d4321c}
#ky.sbm .sb-in .sb-d.ph{opacity:.3}
#ky.sbm .sb-in small{flex:1;font-size:13px;font-weight:800;opacity:.65;line-height:1.15}
#ky.sbm .sb-in small.bad{color:#d4321c;opacity:1}
#ky.sbm .sb-in button{width:52px;height:42px;border-radius:14px;border:3px solid var(--ink);background:#fff;font-size:20px;font-weight:900;color:var(--ink)}
#ky.sbm .sb-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
#ky.sbm .sb-keys button{height:46px;border-radius:14px;border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink);background:#fff;color:var(--ink);font-size:22px;font-weight:900;font-variant-numeric:tabular-nums;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.sbm .sb-keys button:active,#ky.sbm .sb-row button:active,#ky.sbm .sb-in button:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.sbm .sb-row{display:flex;gap:6px}
#ky.sbm .sb-row button{height:54px;border-radius:18px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);font-weight:900;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.sbm .sb-row .sb-rnd{width:64px;background:#fff;font-size:24px}
#ky.sbm .sb-row .sb-go{flex:1;background:#ff7a4a;font-size:21px}
#ky.sbm .sb-row .sb-go[disabled]{opacity:.5;filter:grayscale(.5)}
#ky.sbm .sb-row .sb-go.ready{animation:mzp 1.1s ease-in-out infinite}
#ky.sbm .sb-st{display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:15px;color:#fff;background:rgba(12,10,26,.7);border-radius:99px;padding:7px 16px;max-width:94%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#ky.sbm .sb-st b{font-variant-numeric:tabular-nums;font-size:18px}
#ky.sbm .sb-st b.hot{color:#ff6b5a}
#ky.sbm .sb-st.me{background:#d4321c;animation:mzs .45s ease-in-out infinite alternate}
#ky.sbm .sb-skip{pointer-events:auto;border:0;background:transparent;color:rgba(255,255,255,.75);font-weight:700;font-size:13px;text-decoration:underline;text-underline-offset:3px}
#ky.sbm .lbl .sb-x{display:inline-flex;align-items:center;gap:3px}
#ky.sbm .lbl .sb-x:empty{display:none}
#ky.sbm .lbl .sb-b{font-size:11px;background:rgba(255,90,40,.28);border-radius:99px;padding:0 5px}
#ky.sbm .lbl.me .sb-b{background:rgba(212,50,28,.18)}
#ky.sbm .lbl.turn{background:#ff7a4a;color:#1c1633;border-color:#1c1633;box-shadow:0 0 0 3px rgba(255,122,74,.45),0 0 18px rgba(255,122,74,.8)}
#ky.sbm .lbl.boom{background:#2a2228;color:#fff;border-color:#ff7a4a}
#ky.sbm .card .sb-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.sbm .card .sb-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.sbm .card .sb-seg button.on{background:var(--ink);color:#fff}
#ky.sbm .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.sbm .card .sb-big{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;font-weight:900}
#ky.sbm .card .sb-big b{font-size:44px;line-height:1;font-variant-numeric:tabular-nums;color:#d4321c}
#ky.sbm .card .sb-big span{font-size:14px;opacity:.7;line-height:1.2;text-align:left}
#ky.sbm .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.sbm .card .row2 .kb.alt{flex:0 0 auto}
#ky.sbm .card.sb-bc .res li .p{min-width:44px}
@media (orientation:landscape) and (max-height:520px){
#ky.sbm .sb-top{left:auto;right:calc(env(safe-area-inset-right,0px) + 12px);transform:none;top:calc(env(safe-area-inset-top,0px) + 52px);align-items:flex-end}
#ky.sbm .sb-rng b{font-size:24px}
#ky.sbm .sb-kp{max-width:330px}
#ky.sbm .sb-in{min-height:46px}#ky.sbm .sb-in .sb-d{font-size:26px}
#ky.sbm .sb-keys button{height:38px;font-size:18px}
#ky.sbm .sb-row button{height:44px;font-size:17px}
#ky.sbm .sb-hist{display:none}
#ky.sbm .card.sb-bc .res li:nth-child(n+4){display:none}
#ky.sbm .card .sb-big{margin-top:4px}#ky.sbm .card .sb-big b{font-size:32px}
#ky.sbm .card.sb-bc .tt{font-size:22px}
#ky.sbm .card .sb-seg{margin-top:8px}
}
@media (max-width:379px){#ky.sbm .card .row2 .kb{font-size:15px;padding-left:8px;padding-right:8px}#ky.sbm .card .sb-seg button{font-size:12px}}
`;

/* ============================ müzik ve sesler ============================ */
// Bekleme: La minör casus grubu (Am – F – Dm – E): yürüyen bas, fırça, ride, kısık gitar tıngırtısı, vibrafon.
// Oyun: gerilim — saatin tik-takı, nabız gibi bas, fitil cızırtısı; aralık daraldıkça hızlanır, kalp atışı girer.
class SbSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.1; }
  tempo() { return this.mode === 'race' ? 96 + 54 * (this.int || 0) : this.mode === 'idle' ? 100 : 92; }
  swing() { return this.mode === 'race' ? 0 : 0.14; }
  beat(t, s, bar, spb, st = spb / 4) {
    const I = this.int || 0;
    const CH = [[45, [57, 60, 64]], [41, [57, 60, 65]], [38, [57, 62, 65]], [40, [56, 59, 64]]];
    const [root, ch] = CH[bar % 4];
    if (this.mode === 'race') {
      if (s === 0 || s === 8) this.iWood(t, 0.07, 820);
      if (s === 4 || s === 12) this.iWood(t, 0.055, 1240);
      if (I > 0.45 && (s === 2 || s === 6 || s === 10 || s === 14)) this.iWood(t, 0.035, 1240);
      if (s % 8 === 0) this.iTaiko(t, 0.1 + 0.16 * I, 56);
      if (I > 0.5 && (s === 0 || s === 3)) this.iKick(t, 0.16 + 0.12 * I, 90, 40, 0.16);
      if (s % 2 === 1) this.iHat(t, 0.008 + 0.02 * I);
      if (s % 4 === 0) this.iBass(t, root - 12, spb * 0.9, 0.11, 'sub');
      const arp = [0, 1, 2, 1];
      if (s % 2 === 0 && I > 0.15) this.iPizz(t, ch[arp[(s >> 1) % 4]] + (I > 0.65 ? 12 : 0), 0.025 + 0.025 * I, st * 1.3);
      if (s === 0) this.iStr(t, ch.map((m) => m - 12), spb * 3.8, 0.008 + 0.012 * I, 0.25, 1500 + 1000 * I, 0.25);
      // fitil cızırtısı
      this.noise(t, st * 0.9, 0.006 + 0.014 * I, { type: 'highpass', freq: 5200 + 2000 * Math.random(), attack: 0.005 }, 0, this._md());
      return;
    }
    const soft = this.mode !== 'idle';
    if (s % 4 === 0) {
      const nx = CH[(bar + 1) % 4][0];
      const walk = [root, root + 3, root + 7, nx + (nx > root + 7 ? -1 : 1)][s >> 2];
      this.iBass(t, walk - 12, spb * 0.9, soft ? 0.09 : 0.12, 'up');
    }
    if (s === 0 || s === 4 || s === 8 || s === 12) this.iHat(t, soft ? 0.016 : 0.022, true);
    if (s === 7 || s === 15) this.iHat(t, soft ? 0.01 : 0.016);
    if (s === 4 || s === 12) this.iBrush(t, soft ? 0.045 : 0.06, 0.2);
    if (!soft && (s === 2 || s === 10)) this.iPluck(t, ch[0] - 12, 0.024, st * 0.8, 'square', 1400);
    if (!soft && (s === 6 || s === 14)) this.iPluck(t, ch[2] - 12, 0.02, st * 0.8, 'square', 1400);
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, soft ? 0.011 : 0.011, 900);
    if (s % 2 === 0) this.iShk(t, soft ? 0.006 : 0.009);
    if (s === 10 && bar % 2 === 0) ch.forEach((m, i) => this.iVibe(t + i * 0.008, m + 12, (soft ? 0.012 : 0.016) * (i ? 0.8 : 1), spb * 1.3, 0.3));
    if (!soft && bar % 4 === 3) { const mel = { 0: 76, 3: 74, 6: 72, 8: 71, 12: 69 }; if (mel[s] !== undefined) this.iVibe(t, mel[s], 0.03, spb * 0.9, 0.35); }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'key': this.tone(1500 + (a || 0) * 60, t, 0.025, 'triangle', 0.06, null, 0.001); this.noise(t, 0.015, 0.05, { type: 'bandpass', freq: 3200, q: 3, attack: 0.001 }); break;
      case 'del': this.tone(700, t, 0.04, 'triangle', 0.06, 500, 0.001); break;
      case 'say': // sayı fırlatılır
        this.noise(t, 0.4, 0.15, { type: 'bandpass', freq: 500, to: 2600, q: 1, attack: 0.03 });
        this.tone(330, t, 0.25, 'triangle', 0.08, 660, 0.01);
        break;
      case 'land': // halkaya iner: tok tık
        this.tone(220, t, 0.12, 'sine', 0.3, 120, 0.002);
        this.noise(t, 0.05, 0.16, { type: 'bandpass', freq: 1800, q: 2, attack: 0.001 });
        this.tone(1200, t, 0.05, 'triangle', 0.05, 900, 0.001);
        break;
      case 'safe': // kurtuldu: nefes + çan
        this.noise(t, 0.5, 0.08, { type: 'bandpass', freq: 900, to: 500, q: 0.7, attack: 0.08 });
        [784, 988, 1175].forEach((f, i) => this.tone(f, t + 0.05 + i * 0.07, 0.35, 'sine', 0.07));
        break;
      case 'narrow': this.noise(t, 0.35, 0.1, { type: 'bandpass', freq: 2400, to: 900, q: 1.2, attack: 0.02 }); break;
      case 'turn': // sıra sende
        this.duck(0.4, 0.9);
        [880, 1175].forEach((f, i) => { this.tone(f, t + i * 0.13, 0.16, 'square', 0.06); this.tone(f, t + i * 0.13, 0.3, 'sine', 0.08); });
        break;
      case 'clock': this.tone(a ? 1560 : 1040, t, 0.035, 'square', a ? 0.07 : 0.05, null, 0.001); this.noise(t, 0.02, 0.08, { type: 'bandpass', freq: a ? 4200 : 3000, q: 3, attack: 0.001 }); break;
      case 'swell': // patlamadan önce: yükselen gerilim + davul
        this.duck(0.15, 2.4);
        this.noise(t, 1.2, 0.14, { type: 'bandpass', freq: 300, to: 3000, q: 1.5, attack: 0.9 });
        this.tone(110, t, 1.2, 'sawtooth', 0.05, 220, 0.6);
        break;
      case 'boom': // patlama
        this.duck(0.05, 3.2);
        this.tone(70, t, 1.2, 'sine', 0.85, 28, 0.003);
        this.tone(140, t, 0.5, 'triangle', 0.4, 50, 0.002);
        this.noise(t, 1.6, 0.85, { freq: 2400, to: 120, q: 0.6, attack: 0.004 });
        this.noise(t, 0.4, 0.5, { type: 'highpass', freq: 3000, attack: 0.002 });
        for (let i = 0; i < 16; i++) this.noise(t + 0.15 + Math.random() * 1.2, 0.02 + Math.random() * 0.05, 0.12 + Math.random() * 0.2, { type: 'bandpass', freq: 1500 + Math.random() * 4000, q: 2, attack: 0.001 });
        this.noise(t + 0.3, 2.4, 0.18, { type: 'lowpass', freq: 400, to: 120, q: 0.5, attack: 0.3 });
        break;
      case 'cough': for (let i = 0; i < 3; i++) this.noise(t + i * 0.22, 0.12, 0.12, { type: 'bandpass', freq: 700 + i * 120, q: 1.4, attack: 0.01 }); break;
      case 'new': // yeni bomba masaya konur
        this.tone(160, t + 0.05, 0.18, 'sine', 0.35, 70, 0.003); this.noise(t + 0.05, 0.08, 0.2, { freq: 500 });
        this.noise(t, 0.6, 0.06, { type: 'highpass', freq: 5500, attack: 0.2 });
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// Bombanın altındaki mat: ceviz kaide + pirinç kenar (üst yüz doku: sayı halkası)
function matBase(mb, RA) {
  const W = C('#3b2416', -0.55), Wl = C('#5a3a22', -0.55);
  mb.lathe(0, 0, 0, [[0, 0], [RA + 0.045, 0], [RA + 0.075, 0.01], [RA + 0.08, 0.026], [RA + 0.062, MAT_H], [RA + 0.02, MAT_H], [0, MAT_H - 0.002]], 96, (i) => (i >= 3 ? Wl : W));
  mb.torusN(0, MAT_H + 0.003, 0, RA + 0.03, 0.017, 0.013, 96, 6, C('#d6a64a', -0.92));
}
function matTop(tb, RA) {
  const N = 112, y = MAT_H + 0.001;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    tb.tw([0, y, 0], [Math.cos(a1) * RA, y, Math.sin(a1) * RA], [Math.cos(a0) * RA, y, Math.sin(a0) * RA], null, [0, y - 1, 0], [0.5, 0.5, 0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1), 0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)]);
  }
}
// sayı halkası şeridi: her sayı bir dilim (6 köşe); [lo, hi] aralığı alt dizi olarak çizilir
const TRACK_IN = 0.74, TRACK_OUT = 0.915;
const numAngle = (k, max) => -Math.PI / 2 + ((k - 0.5) / max) * TAU;
function trackModel(mb, RA, max, y) {
  for (let k = 1; k <= max; k++) {
    const a0 = -Math.PI / 2 + ((k - 1) / max) * TAU + 0.004, a1 = -Math.PI / 2 + (k / max) * TAU - 0.004;
    const P = (rr, a) => [Math.cos(a) * rr * RA, y, Math.sin(a) * rr * RA];
    const ci = [1, 1, 1, 0.85], co = [1, 1, 1, 1];
    mb.d.push(...P(TRACK_IN, a0), ...ci, ...P(TRACK_OUT, a0), ...co, ...P(TRACK_OUT, a1), ...co, ...P(TRACK_IN, a0), ...ci, ...P(TRACK_OUT, a1), ...co, ...P(TRACK_IN, a1), ...ci);
  }
}
// söylenen sayının iğnesi (beyaz çizilir, oyuncu rengiyle boyanır)
function pegModel(mb) {
  const W = [1, 1, 1, -0.6];
  mb.lathe(0, 0, 0, [[0, 0], [0.018, 0], [0.012, 0.006], [0.007, 0.012], [0.007, 0.05]], 10, C('#d9dde4', -0.9));
  mb.sphereS(0, 0.068, 0, 0.026, 0.026, 0.026, W, 12, 8);
}
// Bomba: parlak siyah gövde, çelik boyun, kemer ve önde LED gösterge kutusu (ekranı ayrı doku). Yerel +Z öne bakar.
function bombModel(mb) {
  const R = BOMB_R, cy = R;
  const B = C('#1a1a21', -0.86), Bd = C('#121218', -0.8), ST = C('#33363d', -0.6), STl = C('#4c5058', -0.65), LE = C('#4a3424', -0.35), RV = C('#c9a04e', -0.92);
  mb.sphereS(0, cy, 0, R, R * 0.98, R, B, 32, 22, (x, y) => (y < -0.7 ? Bd : B));
  // boyun (fitil yuvası)
  mb.lathe(0, cy + R * 0.86, 0, [[0, 0], [0.105, 0], [0.11, 0.012], [0.11, 0.075], [0.122, 0.082], [0.122, 0.1], [0.07, 0.105], [0, 0.102]], 24, (i) => (i >= 4 ? STl : ST));
  // iki deri kemer (yanlardan geçer) ve perçinler
  for (const s of [-1, 1]) {
    // kemer: gövdeyi dikey sarar (simit ekseni x)
    const x = s * R * 0.46, rr = Math.sqrt(R * R - x * x) + 0.004;
    mb.push().T(x, cy, 0, 0, 0, Math.PI / 2);
    mb.torusN(0, 0, 0, rr, 0.011, 0.024, 44, 6, LE);
    mb.pop();
  }
  // LED kutusu (önde)
  mb.rbox(-0.14, cy - 0.075, R * 0.86, 0.14, cy + 0.075, R * 0.86 + 0.07, 0.016, C('#2b2d33', -0.7), 2);
  mb.rbox(-0.125, cy - 0.06, R * 0.86 + 0.066, 0.125, cy + 0.06, R * 0.86 + 0.074, 0.006, C('#0b0b0d', -0.85), 1);
  for (const [x, y] of [[-0.124, 0.062], [0.124, 0.062], [-0.124, -0.062], [0.124, -0.062]]) mb.sphereS(x, cy + y, R * 0.86 + 0.072, 0.009, 0.009, 0.006, RV, 8, 5);
  // kablolar (kutudan gövdeye)
  limb(mb, [-0.13, cy + 0.07, R * 0.86 + 0.04], [-0.2, cy + 0.16, R * 0.7], [0.008, 0.008], C('#c8261c', -0.5), 6);
  limb(mb, [0.13, cy + 0.07, R * 0.86 + 0.04], [0.21, cy + 0.15, R * 0.68], [0.008, 0.008], C('#2f6fd6', -0.5), 6);
}
// LED ekranı (doku): kutunun ön yüzü
function screenQuad(tb) {
  const cy = BOMB_R, z = BOMB_R * 0.86 + 0.0745;
  tb.tquad([-0.118, cy - 0.054, z], [0.118, cy - 0.054, z], [0.118, cy + 0.054, z], [-0.118, cy + 0.054, z], 0, 0, 1, 1, [0, cy, z - 1]);
}
// Fitil: boyundan kıvrılarak yükselen halat; parça parça kurulur, yanan kısım kısalır (ilk n parça çizilir)
const FUSE_N = 14;
function fusePts() {
  const top = BOMB_R * 1.86 + 0.1;
  const pts = [];
  for (let k = 0; k <= FUSE_N; k++) {
    const u = k / FUSE_N;
    pts.push([Math.sin(u * 2.3) * 0.14 * u + 0.02 * u, top + Math.sin(u * Math.PI * 0.9) * 0.16 + u * 0.04, -Math.cos(u * 2.3) * 0.05 * u + 0.03 * u]);
  }
  return pts;
}
function fuseModel(mb, ends) {
  const pts = fusePts();
  const R = C('#c9a46a', -0.15), Rd = C('#9c7a46', -0.1);
  for (let k = 0; k < FUSE_N; k++) {
    limb(mb, pts[k], pts[k + 1], [0.013, 0.012], k % 2 ? R : Rd, 7, null, 2);
    ends.push(mb.d.length / 10);
  }
}
// Ahşap kaide (bomba üstünde oturur)
function standModel(mb) {
  const W = C('#5a3a22', -0.5), Wd = C('#3b2416', -0.5), G = C('#d6a64a', -0.9);
  mb.lathe(0, 0, 0, [[0, 0], [0.26, 0], [0.27, 0.02], [0.22, 0.05], [0.19, 0.12], [0.23, 0.14], [0.235, 0.155], [0.17, 0.16], [0, 0.16]], 32, (i) => (i <= 2 ? Wd : W));
  mb.torusN(0, 0.148, 0, 0.215, 0.012, 0.01, 32, 6, G);
}
// İs lekesi (patlamadan sonra matta): koyu düzensiz leke
function scorchModel(mb) {
  for (let i = 0; i < 26; i++) {
    const a0 = (i / 26) * TAU, a1 = ((i + 1) / 26) * TAU, r0 = 0.5 + 0.18 * hs(i, 3), r1 = 0.5 + 0.18 * hs(i + 1, 3);
    mb.d.push(0, 0, 0, 0.06, 0.05, 0.05, 0.85, Math.cos(a0) * r0, 0, Math.sin(a0) * r0, 0.1, 0.08, 0.07, 0, Math.cos(a1) * r1, 0, Math.sin(a1) * r1, 0.1, 0.08, 0.07, 0);
  }
}

/* ============================ dokular ============================ */
function drawMat(cv, max) {
  const g = cv.getContext('2d');
  const S = cv.width, c = S / 2, R = S / 2;
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  g.clearRect(0, 0, S, S);
  // koyu keçe zemin
  const bg = g.createRadialGradient(c, c, R * 0.1, c, c, R);
  bg.addColorStop(0, '#34343c'); bg.addColorStop(1, '#202026');
  g.fillStyle = bg; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  for (let i = 0; i < 4200; i++) { const a = hs(i, 1) * TAU, r = Math.sqrt(hs(i, 2)) * R * 0.99; g.fillStyle = hs(i, 4) < 0.5 ? `rgba(255,255,255,${0.015 + hs(i, 3) * 0.03})` : `rgba(0,0,0,${0.04 + hs(i, 3) * 0.06})`; g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 2); }
  // dış kenar: sarı-siyah tehlike şeridi
  g.save();
  g.beginPath(); g.arc(c, c, R * 0.995, 0, TAU); g.arc(c, c, R * 0.935, 0, TAU, true); g.clip();
  g.fillStyle = '#f2c230'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#18181c';
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * TAU, a2 = a + TAU / 128;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * R * 0.93, c + Math.sin(a) * R * 0.93);
    g.lineTo(c + Math.cos(a + 0.05) * R, c + Math.sin(a + 0.05) * R);
    g.lineTo(c + Math.cos(a2 + 0.05) * R, c + Math.sin(a2 + 0.05) * R);
    g.lineTo(c + Math.cos(a2) * R * 0.93, c + Math.sin(a2) * R * 0.93);
    g.closePath(); g.fill();
  }
  g.restore();
  // sayı şeridi: krem bant, her sayıya çentik, 5'lerde uzun, 10'larda (hızlıda 5'lerde) rakam
  g.fillStyle = '#d8c9a4';
  g.beginPath(); g.arc(c, c, R * TRACK_OUT, 0, TAU); g.arc(c, c, R * TRACK_IN, 0, TAU, true); g.fill();
  g.strokeStyle = 'rgba(28,22,51,.85)'; g.lineWidth = 3;
  g.beginPath(); g.arc(c, c, R * TRACK_OUT, 0, TAU); g.stroke();
  g.beginPath(); g.arc(c, c, R * TRACK_IN, 0, TAU); g.stroke();
  const step = max > 60 ? 10 : 5;
  for (let k = 0; k <= max; k++) {
    const a = -Math.PI / 2 + (k / max) * TAU;
    const big = k % 5 === 0, L = k % step === 0 ? 0.05 : big ? 0.032 : 0.018;
    g.strokeStyle = 'rgba(28,22,51,.8)'; g.lineWidth = k % step === 0 ? 4 : 2;
    g.beginPath(); g.moveTo(c + Math.cos(a) * R * TRACK_OUT, c + Math.sin(a) * R * TRACK_OUT); g.lineTo(c + Math.cos(a) * R * (TRACK_OUT - L), c + Math.sin(a) * R * (TRACK_OUT - L)); g.stroke();
  }
  g.font = `900 ${max > 60 ? 40 : 44}px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1c1633';
  for (let k = step; k <= max; k += step) {
    const a = numAngle(k, max), rr = R * (TRACK_IN + 0.06);
    g.fillText(String(k), c + Math.cos(a) * rr, c + Math.sin(a) * rr);
  }
  g.font = `900 30px ${F}`; g.fillStyle = '#7a1f12';
  { const a = numAngle(1, max), rr = R * (TRACK_IN + 0.06); g.fillText('1', c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
  // iç halka
  g.strokeStyle = '#d6a64a'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, R * 0.6, 0, TAU); g.stroke();
}
// LED ekran: kırmızı 7 segment benzeri rakamlar
function drawScreen(cv, txt, sub, hot) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.fillStyle = '#0a0606'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,40,20,.06)';
  for (let x = 0; x < W; x += 6) g.fillRect(x, 0, 1, H);
  g.font = `900 ${sub ? 120 : 150}px 'Courier New', ui-monospace, monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = hot ? '#ffd040' : '#ff3010'; g.shadowBlur = 28;
  g.fillStyle = hot ? '#ffd86a' : '#ff4a2a';
  g.fillText(txt, W / 2, sub ? H * 0.42 : H / 2 + 6);
  if (sub) { g.font = "800 42px 'Courier New', ui-monospace, monospace"; g.shadowBlur = 12; g.fillText(sub, W / 2, H * 0.82); }
  g.shadowBlur = 0;
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

/* ============================ oyun ============================ */
class BombGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'sbm', cls: 'sbm', title: 'Sayı Bombası', sub: 'Sırayla sayı söyle, bomba kimde patlayacak?', emoji: '💣', css: STYLE, snd: new SbSnd(), amb: 'diner', ambVol: 0.55, botPx: 120, botPxL: 40, cloth: '#3b3f4a', trim: '#f2c230', place: false });
    this.lampK = 0.85;
    this.typed = '';
    this.flyEl = document.createElement('div');
    this.flyEl.className = 'sb-fly';
    this.el.wrap.appendChild(this.flyEl);
    this.topEl = document.createElement('div');
    this.topEl.className = 'sb-top';
    this.el.wrap.appendChild(this.topEl);
    this.bombYaw = 0;
    this.seenSeq = 0;
    this.landSeq = 0;
    this.rngA = [1, 100];     // çizilen aralık (yumuşak geçiş)
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    const ends = [];
    W.bomb = this.mk(bombModel);
    W.fuse = this.mk((mb) => fuseModel(mb, ends));
    this.fuseEnds = ends;
    W.stand = this.mk(standModel);
    W.peg = this.mk(pegModel);
    W.scorch = this.mk(scorchModel, 'un');
    W.screen = this.mk(screenQuad, 'tex');
    this.matCv = document.createElement('canvas');
    this.matCv.width = 1024; this.matCv.height = 1024;
    this.matMax = 0;
    this.matTex = makeTexture(this.X, this.matCv);
    this.scrCv = document.createElement('canvas');
    this.scrCv.width = 512; this.scrCv.height = 232;
    this.scrKey = '';
    this.scrTex = makeTexture(this.X, this.scrCv);
    this.matKey = '';
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.matTex || !this.X || this.X.gl.isContextLost()) return; this.matMax = 0; }); } catch { /* yok say */ }
  }
  freeTex() {
    if (this.X) { if (this.matTex) this.X.gl.deleteTexture(this.matTex); if (this.scrTex) this.X.gl.deleteTexture(this.scrTex); }
    this.matTex = null; this.scrTex = null;
  }
  get RA() {
    const n = Math.max(1, this.seats.length);
    let minR = 9;
    for (let i = 0; i < n; i++) minR = Math.min(minR, this.rAt(this.seatAngle(i), this.R));
    return clamp(Math.min(this.R * Math.min(1, this.kz) * 0.58, minR - 0.6), 0.72, 1.5);
  }
  get bombS() { return clamp(this.RA / 0.72, 1.1, 2); }
  get maxN() { return this.view?.max || (this.view?.mode === 'hizli' ? 50 : 100); }
  ensureMat() {
    if (!this.W) return;
    const RA = this.RA, max = this.maxN;
    const key = RA.toFixed(3) + '|' + max;
    if (key !== this.matKey) {
      this.matKey = key;
      ['mBase', 'mTop', 'track'].forEach((k) => { if (this.W[k]) E.freeMesh(this.X, this.W[k]); });
      this.W.mBase = this.mk((mb) => matBase(mb, RA));
      this.W.mTop = this.mk((tb) => matTop(tb, RA), 'tex');
      this.W.track = this.mk((mb) => trackModel(mb, RA, max, MAT_H + 0.004), 'un');
    }
    if (this.matMax !== max && this.matTex) { this.matMax = max; drawMat(this.matCv, max); updateTexture(this.X, this.matTex, this.matCv); }
  }
  numPos(k, lift = 0) {
    const a = numAngle(k, this.maxN), rr = this.RA * (TRACK_IN + TRACK_OUT) / 2;
    return [Math.cos(a) * rr, TABLE_Y + MAT_H + lift, Math.sin(a) * rr];
  }

  /* ---------- girdi: sayı tuş takımı ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-k],[data-act]');
      if (!b) return;
      if (b.dataset.k != null) { this.key(b.dataset.k); return; }
      const act = b.dataset.act;
      if (act === 'sb-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'sb-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send(this.view?.phase === 'boom' ? 'again' : 'start', { m: this.view?.mode || 'klasik' }); }
      else if (act === 'sb-skip') this.ctx.send('skip', {});
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      const v = this.view;
      if (!v || !v.myTurn || this.dead) return;
      if (e.target && /input|textarea/i.test(e.target.tagName || '')) return;
      if (/^[0-9]$/.test(e.key)) { this.key(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { this.key('del'); e.preventDefault(); }
      else if (e.key === 'Enter') { this.key('go'); e.preventDefault(); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  canSay() { const v = this.view; return !!v && v.phase === 'play' && v.myTurn && this.ctx.serverNow() >= v.turnAt - 200 && this.sentSeq !== (v.last ? v.last.seq : 0) + ':' + v.game; }
  key(k) {
    const v = this.view;
    if (!v || v.phase !== 'play' || !v.myTurn) return;
    const fx = (n, a) => { try { this.snd.fx(n, a); } catch { /* yok */ } };
    if (k === 'del') { this.typed = this.typed.slice(0, -1); fx('del'); vibrate(6); }
    else if (k === 'rnd') { this.typed = String(v.lo + Math.floor(Math.random() * (v.hi - v.lo + 1))); fx('key', 5); vibrate(8); }
    else if (k === 'go') { this.say(); return; }
    else if (/^[0-9]$/.test(k)) {
      const next = (this.typed === '0' ? '' : this.typed) + k;
      if (next.length > String(v.max).length) return;
      this.typed = next; fx('key', +k); vibrate(6);
    }
    this.kpSync();
  }
  say() {
    const v = this.view;
    const n = Number(this.typed);
    if (!this.canSay() || !Number.isInteger(n) || n < v.lo || n > v.hi) { try { this.snd.fx('beep'); } catch { /* yok */ } vibrate([20, 30, 20]); return; }
    this.sentSeq = (v.last ? v.last.seq : 0) + ':' + v.game;
    vibrate(20);
    try { this.snd.fx('say'); } catch { /* yok */ }
    this.ctx.send('guess', { n });
    this.kpSync();
  }
  // tuş takımının göstergesini güncelle (tüm çubuğu yeniden çizmeden)
  kpSync() {
    const v = this.view, b = this.el.bar;
    const d = b.querySelector('[data-d]');
    if (!d || !v) return;
    const n = Number(this.typed);
    const ok = this.typed !== '' && n >= v.lo && n <= v.hi;
    d.textContent = this.typed || '?';
    d.classList.toggle('ph', !this.typed);
    d.classList.toggle('bad', !!this.typed && !ok);
    const hint = b.querySelector('[data-h]');
    if (hint) { hint.textContent = this.typed && !ok ? `${v.lo}–${v.hi} arası olmalı` : v.lo === v.hi ? 'Tek sayı kaldı 😱' : `${v.lo}–${v.hi} arası bir sayı`; hint.classList.toggle('bad', !!this.typed && !ok); }
    const go = b.querySelector('[data-k="go"]');
    if (go) { const can = ok && this.canSay(); go.disabled = !can; go.classList.toggle('ready', can); }
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.sbm !== '1') { root.dataset.sbm = '1'; root.innerHTML = '<p class="py-16 text-center">💣</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // yeni söyleme
    const seq = v.last ? v.last.seq : 0;
    if (seq && seq !== this.seenSeq) {
      const fresh = this.ctx.serverNow() - v.last.at < 900;
      this.seenSeq = seq;
      this.onSay(v.last, fresh);
    }
    // sıra bana geldi
    const turnKey = v.phase === 'play' && v.myTurn ? `${v.game}:${seq}` : '';
    if (turnKey && turnKey !== this.turnKey) {
      this.turnKey = turnKey;
      this.typed = v.lo === v.hi ? String(v.lo) : '';
      const delay = Math.max(0, v.turnAt - this.ctx.serverNow());
      clearTimeout(this.turnT);
      this.turnT = setTimeout(() => { if (this.dead || !this.view?.myTurn) return; try { this.snd.fx('turn'); } catch { /* yok */ } vibrate([40, 60, 40]); this.kpSync(); }, delay);
    }
    if (!turnKey) this.turnKey = '';
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } this.boomFx = null; }
    if (v.phase === 'play') {
      this.boomFx = null;
      this.lastTickS = 0;
      this.rngA = [1, v.max || 100];
      this.landSeq = v.last ? v.last.seq : 0;
      try { S.music('race'); } catch { /* yok */ }
      if (this.ctx.serverNow() < v.turnAt + 500) { fx('new'); this.msg('💣 BOMBA KURULDU', 'mid'); this.dropT = this.time; }
      else this.dropT = -9;
    }
    if (v.phase === 'boom' && v.boom) {
      const late = this.ctx.serverNow() - v.boom.at > 2500;
      this.boomFx = { at: v.boom.at, i: v.boom.i, late, done: {} };
      if (late) { try { S.music('calm'); } catch { /* yok */ } }
    }
  }
  // sayı söylendi: uçuş + iniş + aralık daralması
  onSay(r, fresh) {
    this.fly = { r, at: r.at, fresh };
    if (!fresh) { this.landSeq = r.seq; this.fly = null; }
  }
  bt() { const b = this.view?.boom; return b ? (this.ctx.serverNow() - b.at) / 1000 : null; }

  /* ---------- zaman çizelgesi ---------- */
  stepFly() {
    const F = this.fly, v = this.view;
    const el = this.flyEl;
    if (!F || !v) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    const t = (this.ctx.serverNow() - F.at) / 1000;
    const a = this.avatarAt(F.r.i);
    const p0 = a ? this.project(a.headW[0], a.headW[1] + 0.25, a.headW[2]) : null;
    const tp = this.numPos(F.r.n, 0.02);
    const p1 = this.project(tp[0], tp[1], tp[2]);
    if (t >= FLY) {
      el.style.display = 'none';
      if (this.landSeq !== F.r.seq) {
        this.landSeq = F.r.seq;
        const S = this.snd, fx = (n, x) => { try { S.fx(n, x); } catch { /* yok */ } };
        if (F.fresh) {
          fx('land');
          const col = hexRGB(pcol(v.seats[F.r.i]?.c ?? 0));
          this.burst(tp[0], tp[1] + 0.02, tp[2], 14, [col, [1, 1, 1]], 1.2, 0.03, true, 0.5, 4);
          if (F.r.d !== 0) {
            setTimeout(() => { if (this.dead) return; fx(F.r.i === this.view?.me ? 'safe' : 'narrow'); }, 120);
            this.cam.shake = Math.max(this.cam.shake, 0.08);
          }
        }
        this.narrowT = this.time;
      }
      if (t > FLY + 0.1) this.fly = null;
      return;
    }
    if (!p0 || !p1) { el.style.display = 'none'; return; }
    const k = clamp(t / FLY, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const x = lerp(p0[0], p1[0], e), y = lerp(p0[1], p1[1], e) - Math.sin(Math.PI * k) * 70;
    const s = 0.6 + 0.6 * Math.sin(Math.PI * Math.min(1, k * 1.2)) + (1 - k) * 0.2;
    if (el.dataset.n !== String(F.r.n)) { el.dataset.n = String(F.r.n); el.textContent = String(F.r.n); }
    el.style.display = 'block';
    el.style.color = pcol(v.seats[F.r.i]?.c ?? 0);
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(3)})`;
  }
  stepBoom() {
    const B = this.boomFx, v = this.view;
    if (!B || !v || v.phase !== 'boom') return;
    const t = this.bt();
    const S = this.snd, fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const once = (k, at, f) => { if (!B.done[k] && t >= at) { B.done[k] = 1; if (!B.late && t - at < 0.8) f(); } };
    once('swell', FLY, () => { fx('swell'); fx('drumroll', EXPL - FLY - 0.05); this.msg('😱', 'big'); });
    once('ex', EXPL, () => {
      fx('boom');
      vibrate(v.boom.i === v.me ? [200, 60, 300] : [120, 40, 120]);
      this.flash('rgba(255,240,200,.95)', true);
      this.cam.shake = 1.1;
      this.msg('💥 BUM!', 'big gold');
      const p = [0, TABLE_Y + MAT_H + 0.16 + BOMB_R * this.bombS, 0];
      const s = this.bombS;
      this.burst(p[0], p[1], p[2], 90, [[1, 0.85, 0.3], [1, 0.55, 0.15], [1, 0.95, 0.7]], 4.2 * s, 0.09 * s, true, 0.9, 2);
      this.burst(p[0], p[1], p[2], 40, [[0.25, 0.24, 0.26], [0.4, 0.38, 0.38], [0.14, 0.13, 0.14]], 2.2 * s, 0.16 * s, false, 2.6, -0.5);
      this.burst(p[0], p[1], p[2], 50, [[0.12, 0.1, 0.1], [0.3, 0.2, 0.12]], 3.5 * s, 0.03, false, 1.6, 7);
    });
    once('soot', EXPL + 0.9, () => { fx('cough'); setTimeout(() => { if (!this.dead) fx('laugh'); }, 500); if (v.boom.i === v.me) setTimeout(() => { if (!this.dead) fx('trombone'); }, 900); });
    once('calm', EXPL + 1.4, () => { try { S.music('calm'); } catch { /* yok */ } });
    // patlayanın başından tüten duman
    if (t > EXPL && t < EXPL + 7 && Math.random() < 0.35) {
      const a = this.avatarAt(v.boom.i);
      if (a) this.burst(a.headW[0] + (Math.random() - 0.5) * 0.2, a.headW[1] + 0.1, a.headW[2] + (Math.random() - 0.5) * 0.2, 1, [[0.3, 0.29, 0.31], [0.45, 0.43, 0.44]], 0.25, 0.09, false, 1.6, -0.35);
    }
    if (t > EXPL && t < EXPL + 4 && Math.random() < 0.5) this.burst((Math.random() - 0.5) * 0.4, TABLE_Y + MAT_H + 0.2, (Math.random() - 0.5) * 0.4, 1, [[0.22, 0.21, 0.23], [0.35, 0.33, 0.34]], 0.3, 0.14, false, 2.4, -0.4);
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, n = Math.max(1, this.seats.length);
    const cam = [this.cam.ex, this.cam.ey, this.cam.ez];
    const bombC = [0, TABLE_Y + 0.5 * this.bombS, 0];
    const bt = this.bt();
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null };
      const S = a.idle;
      if (v.phase === 'play') {
        const cur = v.cur === i;
        const curA = this.avatarAt(v.cur);
        const F = this.fly;
        if (F && F.r.i === i && (this.ctx.serverNow() - F.at) / 1000 < FLY + 0.6) {
          // sayıyı söyleyen: kolunu uzatıp atar, sonra nefes alır
          const u = (this.ctx.serverNow() - F.at) / 1000;
          if (u < 0.5) { a.pose('rest', { t }); a.pointAt(this.numPos(F.r.n, 0.05), 1); a.expr = 'tense'; }
          else { a.pose('lean', { t }); a.expr = 'grin'; }
          a.look = this.numPos(F.r.n);
          return;
        }
        if (cur) {
          // sırası gelen: gergin, tırnak yer, bombaya bakar
          const hot = clamp(1 - (v.hi - v.lo + 1) / (v.max || 100), 0, 1);
          a.pose(hot > 0.6 || Math.floor(t / 2.2 + i) % 2 === 0 ? 'bite' : 'clasp', { t });
          a.expr = hot > 0.75 ? 'wince' : 'tense';
          a.look = Math.floor(t / 1.6) % 3 === 2 ? cam : bombC;
          return;
        }
        // diğerleri: sırası gelene bakar; az önce kurtulan rahatlar
        const relaxed = v.last && v.last.i === i && this.ctx.serverNow() - v.last.at < 5000;
        a.pose(relaxed ? 'lean' : S.mood === 'chin' ? 'chin' : 'rest', { t });
        a.expr = relaxed ? 'smile' : 'tense';
        a.look = curA && Math.floor(t / 2.7 + i) % 4 !== 3 ? curA.headW : bombC;
        S.mt -= dt;
        if (S.mt <= 0) { S.mood = Math.random() < 0.55 ? 'rest' : 'chin'; S.mt = 4 + Math.random() * 6; }
        return;
      }
      if (v.phase === 'boom' && v.boom && bt != null) {
        const lose = v.boom.i === i;
        const loser = this.avatarAt(v.boom.i);
        if (bt < EXPL) {
          a.pose(lose ? 'headgrab' : 'clasp', { t, k: 12 }); a.expr = lose ? 'o' : 'tense'; a.look = bombC;
          return;
        }
        const u = bt - EXPL;
        if (lose) {
          const ph = u < 1.6 ? 0 : u < 3.6 ? 1 : 2 + (Math.floor((u - 3.6) / 3) % 2);
          if (ph === 0) { a.pose('lean', { t, k: 14 }); a.tgt.lean = -0.25; a.expr = 'o'; a.look = null; a.tgt.hy = 0; a.tgt.hp = -0.2; }
          else if (ph === 1) { a.pose('shrug', { t }); a.expr = 'wince'; a.look = cam; }
          else if (ph === 2) { a.pose('facepalm', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.25; }
          else { a.pose('slump', { t }); a.expr = 'sad'; a.look = bombC; }
          return;
        }
        if (u < 0.5) { a.pose('lean', { t, k: 14 }); a.tgt.lean = -0.2; a.expr = 'o'; a.look = bombC; return; }
        const mode = (i + Math.floor(u / 2.4)) % 3;
        if (u < 5) {
          if (mode === 0 && loser) { a.pose('rest', { t }); a.pointAt(loser.headW, a.toSeat(loser.headW)[0] > 0 ? 1 : 0); }
          else a.pose(mode === 1 ? 'clap' : 'cheer', { t });
          a.expr = 'laugh';
        } else { a.pose(S.mood, { t }); a.expr = 'grin'; }
        a.look = loser ? loser.headW : bombC;
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
        S.look = r < 0.65 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? bombC : cam;
        a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
      }
      if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = cam; }
      else { a.pose(S.mood, { t }); a.look = S.look; }
    });
  }
  // patlayanın yüzü is karası
  avTint(a, i) {
    const v = this.view;
    let want = 1;
    if (v?.phase === 'boom' && v.boom && v.boom.i === i) { const t = this.bt(); if (t != null && t >= EXPL) want = 0.36; }
    a.dimK = damp(a.dimK ?? 1, want, want < 1 ? 14 : 3, 0.016);
    return a.dimK;
  }

  /* ---------- kamera ---------- */
  tick(dt) {
    if (this.X && this.W) this.ensureMat();
    this.stepFly();
    this.stepBoom();
    const v = this.view, c = this.cam;
    if (!v) return;
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0;
    const sNow = this.ctx.serverNow();
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const danger = v.phase === 'play' ? clamp(1 - (v.hi - v.lo + 1) / (v.max || 100), 0, 1) : 0;
    if (this.snd) this.snd.int = v.phase === 'play' ? danger : 0;
    // alttaki arayüzün yeri
    let bp = 120;
    if (v.phase === 'play') bp = v.myTurn ? 300 : 100;
    else if (v.phase === 'intro') bp = 290;
    else if (v.phase === 'boom') bp = 120;
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    if (v.phase === 'play') {
      zoom = lerp(0.98, 0.84, danger); pa = 0.02 + 0.06 * danger;
      // söyleme anında halkaya doğru hafif yaklaş
      if (this.fly) { const k = clamp((sNow - this.fly.at) / 1000 / FLY, 0, 1); zoom *= 1 - 0.05 * Math.sin(Math.PI * k); }
    } else if (v.phase === 'boom' && v.boom) {
      const t = this.bt();
      if (t < EXPL) { const k = sst(FLY - 0.2, EXPL - 0.1, t); zoom = lerp(0.92, 0.62, k); pa = lerp(0.04, 0.12, k); }
      else {
        // patlamadan sonra kamera patlayana döner (yüzü bize dönük, is karası)
        const a = this.avatarAt(v.boom.i);
        const k = sst(EXPL + 0.6, EXPL + 1.8, t);
        if (a && k > 0) {
          yaw = (-Math.PI / 2 - this.seatAngle(v.boom.i)) * 1;
          zoom = lerp(0.7, 0.6, k); pa = -0.3;
          const card = t >= RCARD;
          const f = this.aimAt(a.headW, land && card ? 0.3 : 0.5, land ? 0.42 : card ? 0.22 : 0.4, yaw, pa);
          fx = f[0] * k; fy = f[1] * k; fz = f[2] * k;
          if (k < 1) yaw = angDiff(yaw, 0) * k;
        } else { zoom = 0.7; pa = 0.1; }
      }
    } else yaw = Math.sin(this.time * 0.13) * 0.06;
    if (land && v.phase !== 'boom') {
      const bpl = 34;
      if (bpl !== this.cfg.botPxL) { this.cfg.botPxL = bpl; this.fitKey = ''; }
      const ui = v.phase === 'intro' || (v.phase === 'play' && v.myTurn);
      const f = this.aimAt([0, 0.7, 0], ui ? 0.38 : 0.5, 0.5, yaw, pa); fx = f[0]; fy = f[1]; fz = f[2];
    }
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, v.phase === 'boom' ? 3 : 2, dt);
    c.fx = fx; c.fz = fz; c.fy = fy;
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // bomba sırası gelene döner (LED ekranı ona bakar)
    if (v.phase === 'play' && v.cur >= 0) {
      const ang = this.seatAngle(v.cur);
      const want = Math.atan2(Math.cos(ang), Math.sin(ang));
      this.bombYaw += angDiff(want, this.bombYaw) * (1 - Math.exp(-3.2 * dt));
    } else if (v.phase !== 'boom') this.bombYaw += angDiff(0, this.bombYaw) * (1 - Math.exp(-1.5 * dt));
    // aralığın yumuşak daralması
    if (v.phase === 'play' && !this.fly) {
      this.rngA[0] = damp(this.rngA[0], v.lo, 9, dt);
      this.rngA[1] = damp(this.rngA[1], v.hi, 9, dt);
    }
  }
  // H noktası ekranda (sx, sy) konumunda görünsün diye kameranın bakacağı yer
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }

  /* ---------- çizim ---------- */
  bombState() {
    const v = this.view;
    const s = this.bombS;
    const o = { s, y: TABLE_Y + MAT_H + 0.155 * s, yaw: this.bombYaw, sw: 0, hide: 0, tint: 1, glow: 0 };
    const danger = v?.phase === 'play' ? clamp(1 - (v.hi - v.lo + 1) / (v.max || 100), 0, 1) : 0;
    o.pulse = 1 + 0.018 * danger * Math.sin(this.time * (6 + 14 * danger));
    if (v?.phase === 'play' && this.dropT > -1) {
      const u = this.time - this.dropT;
      if (u < 0.7) { const k = clamp(u / 0.7, 0, 1); o.y += (1 - k * k) * 1.4 + Math.max(0, Math.sin(k * 9) * 0.04 * (1 - k)); }
    }
    if (v?.phase === 'boom') {
      const t = this.bt();
      if (t >= EXPL) o.hide = 1;
      else if (t >= FLY) { const k = clamp((t - FLY) / (EXPL - FLY), 0, 1); o.sw = k; o.pulse = 1 + 0.18 * k * k + 0.04 * k * Math.sin(t * 40); o.tint = 1 + 2.2 * k * k; o.glow = k; }
    }
    return o;
  }
  sceneGame(D, shadow) {
    const Wd = this.W;
    if (!Wd || !Wd.mBase) return;
    const m = this.mats.b, T = this.T, v = this.view;
    M.set(m, 0, TABLE_Y, 0);
    D(Wd.mBase, m, T.obj);
    const bs = this.bombState();
    const s = bs.s;
    M.set(m, 0, TABLE_Y + MAT_H, 0, bs.yaw, 0, 0, s);
    D(Wd.stand, m, T.obj);
    if (!bs.hide) {
      const k = s * bs.pulse;
      const shake = bs.sw ? 0.03 * bs.sw : 0;
      M.set(m, Math.sin(this.time * 47) * shake, bs.y, Math.cos(this.time * 53) * shake, bs.yaw, Math.sin(this.time * 31) * shake * 2, 0, k);
      const tint = this.bTint || (this.bTint = new Float32Array(3));
      tint[0] = bs.tint; tint[1] = 1 + (bs.tint - 1) * 0.25; tint[2] = 1 + (bs.tint - 1) * 0.15;
      D(Wd.bomb, m, tint);
      // fitil: yandıkça kısalır
      const fl = this.fuseLeft();
      const cnt = Math.max(1, Math.ceil(fl * FUSE_N));
      const part = this.fusePart || (this.fusePart = { b: null, n: 0, kind: 'lit' });
      part.b = Wd.fuse.b; part.n = this.fuseEnds[cnt - 1] || Wd.fuse.n;
      D(part, m, T.obj);
      this.bombM = this.bombM || M.make();
      for (let q = 0; q < 16; q++) this.bombM[q] = m[q];
    }
    // söylenen sayıların iğneleri
    if (v && (v.phase === 'play' || v.phase === 'boom') && !shadow) {
      const tint = this.pTint || (this.pTint = new Float32Array(3));
      for (const h of v.history || []) {
        if (h.seq > this.landSeq) continue;
        const p = this.numPos(h.n);
        const c = hexRGB(pcol(v.seats[h.i]?.c ?? 0));
        tint[0] = c[0]; tint[1] = c[1]; tint[2] = c[2];
        const pop = h.seq === this.landSeq && this.narrowT != null ? 1 + 0.6 * Math.exp(-(this.time - this.narrowT) * 7) : 1;
        M.set(m, p[0], p[1], p[2], 0, 0, 0, 1.15 * pop * Math.min(1.3, this.RA / 0.9));
        D(Wd.peg, m, tint);
      }
    }
  }
  // fitilin kalan payı: aralık daraldıkça kısalır
  fuseLeft() {
    const v = this.view;
    if (!v || v.phase === 'intro') return 1;
    if (v.phase === 'boom') { const t = this.bt(); return t != null && t >= FLY ? Math.max(0.05, 0.18 * (1 - (t - FLY) / (EXPL - FLY))) : 0.18; }
    const span = (this.rngA[1] - this.rngA[0] + 1) / (v.max || 100);
    return clamp(0.2 + 0.8 * span, 0.2, 1);
  }
  fuseTip() {
    if (!this.bombM || !this.fuseEnds) return null;
    const pts = fusePts();
    const cnt = Math.max(1, Math.ceil(this.fuseLeft() * FUSE_N));
    const p = pts[Math.min(FUSE_N, cnt)];
    const m = this.bombM;
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  }
  drawTex(F, L) {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.mTop || !this.matTex) return;
    const m = this.mats.b;
    gl.uniform1f(X.tex.u.uSelf, 0.08);
    gl.bindTexture(gl.TEXTURE_2D, this.matTex);
    M.set(m, 0, TABLE_Y, 0);
    drawMesh(X, Wd.mTop, m, ONE3);
    // LED ekran
    const bs = this.bombState();
    if (!bs.hide && this.scrTex && this.bombM) {
      let txt = '- -', sub = '', hot = false;
      if (v && v.phase === 'play') { txt = v.lo === v.hi ? String(v.lo) : `${v.lo}-${v.hi}`; hot = v.hi - v.lo < 10; }
      else if (v && v.phase === 'boom') { const t = this.bt(); txt = t != null && t >= FLY && Math.floor(t * 6) % 2 ? String(v.boom.n) : '!!!'; hot = true; }
      else txt = v?.mode === 'hizli' ? '1-50' : '1-100';
      const key = txt + '|' + sub + '|' + hot;
      if (key !== this.scrKey) { this.scrKey = key; drawScreen(this.scrCv, txt, sub, hot); updateTexture(X, this.scrTex, this.scrCv); }
      gl.uniform1f(X.tex.u.uSelf, 1);
      gl.bindTexture(gl.TEXTURE_2D, this.scrTex);
      drawMesh(X, Wd.screen, this.bombM, ONE3);
    }
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  drawShadowsExtra(m) {
    const X = this.X, Wd = this.W, v = this.view;
    if (!Wd || !Wd.track || !v || (v.phase !== 'play' && v.phase !== 'boom')) return;
    // aralık dışındaki sayılar kararır
    const max = v.max || 100;
    const lo = Math.round(this.rngA[0]), hi = Math.round(this.rngA[1]);
    M.set(m, 0, TABLE_Y, 0);
    const part = this.trkPart || (this.trkPart = { b: null, n: 0, o: 0, kind: 'un' });
    part.b = Wd.track.b;
    if (v.phase === 'play') {
      if (lo > 1) { part.o = 0; part.n = (lo - 1) * 6; drawMesh(X, part, m, [0.05, 0.04, 0.06], 0.62); }
      if (hi < max) { part.o = hi * 6; part.n = (max - hi) * 6; drawMesh(X, part, m, [0.05, 0.04, 0.06], 0.62); }
    }
    // patlamadan sonra is lekesi
    if (v.phase === 'boom') {
      const t = this.bt();
      if (t != null && t >= EXPL) { const s = this.bombS * 0.9; M.set(m, 0, TABLE_Y + MAT_H + 0.003, 0, 0.4, 0, 0, s, 1, s); drawMesh(X, Wd.scorch, m, ONE3, 0.85 * Math.min(1, (t - EXPL) * 3)); }
    }
  }
  drawFx(F, m) {
    const X = this.X, Wd = this.W, v = this.view;
    if (!Wd || !Wd.track || !v) return;
    const sNow = this.ctx.serverNow();
    if (v.phase === 'play') {
      // geçerli aralık parlar: geniş yeşil, daraldıkça turuncu-kırmızı
      const max = v.max || 100;
      const lo = Math.round(this.rngA[0]), hi = Math.round(this.rngA[1]);
      const span = (hi - lo + 1) / max;
      const col = span > 0.5 ? [0.3, 1, 0.55] : span > 0.2 ? [1, 0.82, 0.25] : [1, 0.32, 0.18];
      const pulse = 0.55 + 0.25 * Math.sin(this.time * (3 + 8 * (1 - span)));
      const part = this.trkPart2 || (this.trkPart2 = { b: null, n: 0, o: 0, kind: 'un' });
      part.b = Wd.track.b; part.o = (lo - 1) * 6; part.n = Math.max(1, hi - lo + 1) * 6;
      M.set(m, 0, TABLE_Y, 0);
      drawMesh(X, part, m, col, pulse * 0.55);
      // sırası gelenin koltuğu
      const a = this.avatarAt(v.cur);
      if (a) {
        const wait = sNow < v.turnAt;
        M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 1.05, 1, 1.05);
        drawMesh(X, this.res.glow, m, [1, 0.5, 0.25], (wait ? 0.35 : 0.6) + 0.2 * Math.sin(this.time * 6));
      }
    }
    // fitil kıvılcımı ve bombanın kırmızı lambası
    const bs = this.bombState();
    if (!bs.hide && (v.phase === 'play' || v.phase === 'boom')) {
      const tip = this.fuseTip();
      if (tip) {
        const fl = 0.7 + 0.3 * Math.sin(this.time * 37) * Math.sin(this.time * 23);
        M.set(m, tip[0], tip[1], tip[2], 0, Math.PI / 2, 0, 0.16 * this.bombS * (1 + bs.sw), 1, 0.16 * this.bombS * (1 + bs.sw));
        drawMesh(X, this.res.glow, m, [1, 0.7, 0.25], 0.85 * fl);
        if (Math.random() < 0.7) this.burst(tip[0], tip[1], tip[2], 1 + (bs.sw > 0 ? 2 : 0), [[1, 0.85, 0.35], [1, 0.6, 0.2], [1, 1, 0.8]], 0.9, 0.018, true, 0.35, 3);
      }
      if (bs.glow > 0) { M.set(m, 0, bs.y + BOMB_R * bs.s, 0, 0, 0, 0, 1.4 * bs.s * bs.glow, 1, 1.4 * bs.s * bs.glow); drawMesh(X, this.res.glow, m, [1, 0.35, 0.15], 0.5 * bs.glow); }
    }
    // patlama parlaması
    if (v.phase === 'boom') {
      const t = this.bt();
      if (t != null && t >= EXPL && t < EXPL + 0.6) {
        const k = 1 - (t - EXPL) / 0.6;
        M.set(m, 0, TABLE_Y + 0.4, 0, 0, 0, 0, 3.2 * this.bombS * (1.4 - k * 0.4), 1, 3.2 * this.bombS * (1.4 - k * 0.4));
        drawMesh(X, this.res.glow, m, [1, 0.75, 0.4], k);
      }
    }
  }
  placeLbls() {
    super.placeLbls();
  }

  /* ---------- arayüz ---------- */
  bar() {
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    let key = `${v.phase}|${v.game}|${v.last ? v.last.seq : 0}|${v.cur}|${v.myTurn}`, html = '';
    if (v.phase === 'play') {
      const wait = sNow < v.turnAt;
      key += '|' + wait;
      if (v.myTurn && !wait) {
        html = `<div class="sb-st me">💣 Sıra sende! <i>·</i> ⏱ <b data-cd>${Math.max(0, Math.ceil((v.endsAt - sNow) / 1000))}</b></div>
          <div class="sb-kp" role="group" aria-label="Sayı yaz">
            <div class="sb-in"><span class="sb-d ph" data-d>?</span><small data-h>${v.lo}–${v.hi} arası bir sayı</small><button data-k="del" aria-label="Sil">⌫</button></div>
            <div class="sb-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>
            <div class="sb-row"><button class="sb-rnd" data-k="rnd" aria-label="Rastgele sayı">🎲</button><button class="sb-go" data-k="go" disabled>💣 Söyle</button></div>
          </div>`;
      } else {
        const nm = esc(v.seats[v.cur]?.n || v.currentName || '');
        const off = v.seats[v.cur] && !v.seats[v.cur].on;
        html = `<div class="sb-st">${wait ? `➡️ Sıra: ${v.myTurn ? 'sende!' : nm}` : `😬 ${nm} düşünüyor… <i>·</i> ⏱ <b data-cd>${Math.max(0, Math.ceil((v.endsAt - sNow) / 1000))}</b>`}</div>
          ${off && this.ctx.isHost ? '<button class="sb-skip" data-act="sb-skip">Bağlantısı koptu, sırayı geç</button>' : ''}`;
      }
    }
    if (this.setBar(key, html)) { this.cdB = this.el.bar.querySelector('[data-cd]'); this.kpSync(); }
  }
  modeSeg(v) {
    return `<div class="sb-seg" role="group" aria-label="Bomba aralığı"><button data-act="sb-mode" data-m="klasik" class="${v.mode !== 'hizli' ? 'on' : ''}">💣 Klasik · 1–100</button><button data-act="sb-mode" data-m="hizli" class="${v.mode === 'hizli' ? 'on' : ''}">⚡ Hızlı · 1–50</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n >= 2}`;
      html = `<div class="card sb-in-card">
        <div class="tt">💣 Sayı Bombası</div>
        <div class="sub">Bombanın içinde ${v.mode === 'hizli' ? '1–50' : '1–100'} arası gizli bir sayı var!</div>
        <div class="how">
          <div><span class="k">🔢</span><span><b>Sıra sana gelince bir sayı söyle</b><small>Bomba o sayıda değilse aralık daralır</small></span></div>
          <div><span class="k">💥</span><span><b>Bombanın sayısını söyleyen patlar</b><small>En az patlayan masanın kahramanı olur</small></span></div>
        </div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="sb-start" ${n < 2 ? 'disabled' : ''}>Bombayı kur 💣</button>
        <div class="hint">${n < 2 ? 'Oynamak için masada en az 2 kişi lazım. Oda kodunu paylaş!' : 'Masadaki herkes başlatabilir.'}</div>
      </div>`;
    } else if (v.phase === 'boom' && v.boom) {
      const t = this.bt();
      if (t != null && t >= RCARD) {
        const wait = this.ctx.serverNow() - v.boom.at < (v.minMs || 4500);
        const mine = v.boom.i === v.me;
        const sb = (v.scoreboard || []).slice().sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'tr'));
        const meId = v.seats[v.me]?.id;
        key = `boom|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}|${sb.map((s) => s.id + s.score).join(',')}`;
        const guesses = (v.history || []).length;
        html = `<div class="card sb-bc">
          <div class="tt">💥 ${mine ? 'Bomba sende patladı!' : `${esc(v.loserName)} patladı!`}</div>
          <div class="sb-big"><b>${v.secret}</b><span>bombanın sayısıydı<br>${guesses} sayı söylendi</span></div>
          <ol class="res">${sb.slice(0, 6).map((s) => `<li class="${s.id === meId ? 'me' : ''}"><i style="background:${pcol(s.c)}"></i><span class="nm">${esc(s.nickname)}</span><span class="p">${s.score ? `💥 ${s.score}` : '😇 0'}</span></li>`).join('')}</ol>
          ${this.modeSeg(v)}
          <div class="row2"><button class="kb" data-act="sb-start" ${wait ? 'disabled' : ''}>💣 Yeni bomba</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
        </div>`;
      } else key = 'boom-wait';
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    if (v.phase === 'play') {
      const left = Math.max(0, Math.ceil((v.endsAt - sNow) / 1000));
      if (this.cdB) { const s = String(left); if (this.cdB.textContent !== s) this.cdB.textContent = s; this.cdB.classList.toggle('hot', left <= 5); }
      if (v.myTurn && sNow >= v.turnAt && left <= 5 && left >= 1 && left !== this.lastTickS) { this.lastTickS = left; try { this.snd.fx('clock', left === 1 ? 1 : 0); } catch { /* yok */ } }
    }
    // üstte büyük aralık + son söylenenler
    let top = '';
    if (v.phase === 'play' || (v.phase === 'boom' && v.boom)) {
      const lo = v.phase === 'play' ? v.lo : v.boom.n, hi = v.phase === 'play' ? v.hi : v.boom.n;
      const span = (hi - lo + 1) / (v.max || 100);
      const hist = (v.history || []).filter((h) => h.seq <= this.landSeq).slice(-5).reverse();
      top = `<div class="sb-rng ${v.phase === 'boom' ? 'hot' : lo === hi ? 'one' : span < 0.2 ? 'hot' : ''}"><small>${v.phase === 'boom' ? 'Bomba<br>buradaydı' : 'Bomba bu<br>aralıkta'}</small><b>${lo === hi ? lo : `${lo}<i>–</i>${hi}`}</b></div>
        <div class="sb-hist">${hist.map((h, k) => `<span class="${k === 0 && h.seq === this.landSeq && this.time - (this.narrowT || 0) < 1 ? 'new' : ''}" style="--c:${pcol(v.seats[h.i]?.c ?? 0)}">${h.n}<i>${h.d > 0 ? '⬆' : h.d < 0 ? '⬇' : '💥'}</i></span>`).join('')}</div>`;
    }
    if (top !== this.topHtml) { this.topHtml = top; this.topEl.innerHTML = top; }
    // etiketler: sıra kimde, kaç kez patladı
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (p.b) x += `<span class="sb-b">💥${p.b}</span>`;
      const turn = v.phase === 'play' && v.cur === i;
      const boom = v.phase === 'boom' && v.boom && v.boom.i === i && (this.bt() ?? 0) >= EXPL;
      if (turn) x += '<span>🤔</span>';
      const k = x + '|' + turn + '|' + boom;
      if (o.sbK !== k) {
        o.sbK = k;
        let el = o.lbl.querySelector('.sb-x');
        if (!el) { el = document.createElement('span'); el.className = 'sb-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lbl.classList.toggle('turn', turn);
        o.lbl.classList.toggle('boom', boom);
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
    this.kpSync();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.sb-x')) o.sbK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    const cx = w / 2, cy = h * 0.46, R = r * 0.42;
    const max = v?.max || 100;
    g.fillStyle = '#26262c'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.lineWidth = R * 0.16;
    g.strokeStyle = '#4a4a52'; g.beginPath(); g.arc(cx, cy, R * 0.83, 0, TAU); g.stroke();
    if (v && v.phase === 'play') {
      const a0 = numAngle(v.lo, max) - Math.PI / max, a1 = numAngle(v.hi, max) + Math.PI / max;
      g.strokeStyle = '#ffb030'; g.beginPath(); g.arc(cx, cy, R * 0.83, a0, a1); g.stroke();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(R * 0.7)}px system-ui`;
    g.fillText(v?.phase === 'boom' && (this.bt() ?? 0) >= EXPL ? '💥' : '💣', cx, cy);
    if (v && v.phase === 'play') {
      g.font = '800 15px system-ui'; g.fillStyle = '#fff';
      g.fillText(v.lo === v.hi ? String(v.lo) : `${v.lo}–${v.hi}`, cx, cy + R * 0.55);
      const [x, y] = this.flatPos(v.cur);
      g.strokeStyle = '#ff7a4a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.stroke();
    }
  }
  onDispose() { this.freeTex(); clearTimeout(this.turnT); window.removeEventListener('keydown', this.onKey); }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new BombGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[sbm]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
