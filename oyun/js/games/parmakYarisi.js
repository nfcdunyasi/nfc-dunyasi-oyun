// Parmak Yarışı — 3D restoran masası (NFC Dünyası Oyun)
// Masanın ortasında oyuncak bir drag pisti var; herkesin önünde kocaman bir yarış düğmesi. Işıklar sarı-sarı-sarı yanıp
// yeşile dönünce düğmeye durmadan basılır: her basış arabayı biraz ileri iter, 50. basışta araba bitiş çizgisini geçer ve
// paraşütünü açar. Bitiş süresini bu cihaz ölçer (yeşilin çizildiği an → son basış). Basışlar toplu gönderilir.
// Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-a';
import * as sfx from '../sfx.js?v=2026-11-21-a';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, sst, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, makeTexture, updateTexture, drawMesh, limb } = E;

const GOAL0 = 50;
const BH = 0.022;                 // pist tabanının kalınlığı
const BTN_Z = 0.47;               // düğmenin koltuktan uzaklığı (koltuk uzayı; masa kenarı 0,36'da)
const BTN_TOP = 0.079;            // düğme kapağının tepesi (masa üstünden, basılmamışken)
const BTN_DIP = 0.011;            // basınca kapağın inişi
const AMB = [1000, 1800, 2600];   // sarı ışıkların yanma anları (hazır evresinin başından, ms)
// karakterin işaret parmağının ucu bilekten ~0,19 ileride; parmak yönü FDIR
const FING = 0.19, FDIR = [0, -0.7, 1], FDN = (() => { const l = Math.hypot(...FDIR); return FDIR.map((x) => x / l); })();
// drag arabası (ölçek 1): orijin arka aksın altında yerde, burun −z yönünde
const NOSE = 0.28, RR = 0.05, RF = 0.022, FZ = -0.236;
const AMBER3 = [1, 0.62, 0.08], GREEN3 = [0.2, 1, 0.38], RED3 = [1, 0.16, 0.12], WHITE3 = [1, 0.96, 0.86], GOLD3 = [1, 0.8, 0.3];

const STYLE = `
#ky.pry .msg{top:14%}
#ky.pry .pr-st{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:#fff;background:rgba(12,10,26,.7);border-radius:99px;padding:6px 15px;max-width:94%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#ky.pry .pr-st:empty{display:none}
#ky.pry .pr-hit{position:relative;overflow:hidden;width:100%;max-width:520px;height:clamp(110px,20vh,180px);border-radius:30px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-weight:900;color:#1c1633;background:#ffb21e;-webkit-tap-highlight-color:transparent;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer;padding:6px 12px;text-align:center}
#ky.pry .pr-hit>*{position:relative;pointer-events:none}
#ky.pry .pr-hit .pg{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.28);transition:width .08s linear}
#ky.pry .pr-hit .e{font-size:30px;line-height:1}
#ky.pry .pr-hit .e:empty{display:none}
#ky.pry .pr-hit .t{font-size:40px;line-height:1.02;letter-spacing:.5px;font-variant-numeric:tabular-nums}
#ky.pry .pr-hit .t small{font-size:20px;opacity:.75;margin-left:2px}
#ky.pry .pr-hit .s{font-size:14px;font-weight:800;opacity:.85}
#ky.pry .pr-hit .s:empty{display:none}
#ky.pry .pr-hit.ready{background:#ffb21e}
#ky.pry .pr-hit.go{background:#1fd462;color:#062610}
#ky.pry .pr-hit.done{background:#ffd23f;color:#1c1633}
#ky.pry .pr-hit.tap{transform:translate(2px,2px);box-shadow:3px 3px 0 var(--ink)}
#ky.pry .pr-res{width:min(430px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:10px 14px 11px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none}
#ky.pry .pr-res.win{background:#fff3c4}#ky.pry .pr-res.none{background:#ece6f0}
#ky.pry .pr-res .big{font-size:21px;font-weight:900;line-height:1.15}
#ky.pry .pr-res .big b{font-variant-numeric:tabular-nums}
#ky.pry .pr-res .rk{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:7px}
#ky.pry .pr-res .rk span{border:2px solid var(--ink);border-radius:99px;padding:1px 9px;font-weight:800;font-size:12.5px;background:#fff;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
#ky.pry .pr-res .rk span.me{background:var(--lim)}
#ky.pry .pr-res .rk span.dnf{opacity:.7}
#ky.pry .pr-res .rk span b{font-variant-numeric:tabular-nums;opacity:.75}
#ky.pry .pr-res .q{margin-top:6px;font-size:13px;font-weight:700;opacity:.8}
#ky.pry .pr-me{position:absolute;left:0;top:0;z-index:4;pointer-events:none;font-weight:900;font-size:12px;color:#1c1633;background:#ffd23f;border:2px solid #1c1633;border-radius:99px;padding:1px 8px;white-space:nowrap;display:none;will-change:transform}
#ky.pry .pr-me::after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-5px;border:5px solid transparent;border-top-color:#1c1633}
#ky.pry .lbl .pr-x{display:inline-flex;align-items:center;gap:3px}
#ky.pry .lbl .pr-x:empty{display:none}
#ky.pry .lbl .pr-k{font-size:11px;font-variant-numeric:tabular-nums;background:rgba(255,255,255,.22);border-radius:99px;padding:0 6px}
#ky.pry .lbl.me .pr-k{background:rgba(28,22,51,.14)}
#ky.pry .lbl .pr-k.f{background:#ffd23f;color:#1c1633}
#ky.pry .lbl .pr-sc{font-size:11px;font-variant-numeric:tabular-nums}
#ky.pry .card .pr-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.pry .card .pr-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.pry .card .pr-seg button.on{background:var(--ink);color:#fff}
#ky.pry .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.pry .card.pr-in .tt{font-size:26px}
#ky.pry .card.pr-in .sub{font-size:14px}
#ky.pry .card.pr-in .kb{margin-top:10px}
#ky.pry .card .pr-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.pry .card .pr-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.pry .card .pr-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.pry .card .pr-ru .a{background:#ffe2b0}#ky.pry .card .pr-ru .g{background:#d6f5e0}#ky.pry .card .pr-ru .y{background:#fff0c2}
#ky.pry .card .pr-rest{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px}
#ky.pry .card .pr-rest span{border:2px solid var(--ink);border-radius:99px;padding:1px 9px;font-weight:800;font-size:12.5px;background:#fff;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
#ky.pry .card .pr-rest span.me{background:var(--lim)}
#ky.pry .card .pr-top3{display:none}
@media (max-height:560px){#ky.pry .card .pr-top3{display:flex}}
#ky.pry .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.pry .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.pry .msg{top:15%}
#ky.pry .pr-hit{max-width:min(340px,40vw);height:clamp(100px,40vh,160px)}
#ky.pry .pr-hit .e{font-size:24px}#ky.pry .pr-hit .t{font-size:32px}
#ky.pry .pr-res{width:min(360px,46vw);padding:7px 12px}#ky.pry .pr-res .big{font-size:18px}
}
@media (max-width:379px){#ky.pry .card .row2 .kb{font-size:15px;padding-left:8px;padding-right:8px}#ky.pry .card .pr-seg button{font-size:12px}}
@media (min-aspect-ratio:11/10){#ky.pry .mz-bar{align-items:flex-end}#ky.pry .pr-hit{max-width:min(360px,38vw)}}
`;

/* ============================ müzik ve sesler ============================ */
// Giriş/final: La minör "garaj funk" (Am7 – D9 – Fmaj7 – E7), slap bas, elektrikli piyano, marimba.
// Hazır: davul vuruşları ve gerilen yaylılar, ışıklar yandıkça yoğunlaşır. Yarış: 168 bpm Mi minör sürüş ritmi
// (oktav sıçrayan bas, güç akorları); lider bitişe yaklaştıkça arpej ve yükselen ses eklenir. Sonuç: sakin fırça ritmi.
class PrSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.0; }
  tempo() { return this.mode === 'race' ? 168 : this.mode === 'ready' ? 120 : this.mode === 'idle' ? 116 : 100; }
  swing() { return this.mode === 'idle' ? 0.1 : this.mode === 'calm' ? 0.15 : 0; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const I = this.int || 0;
    if (this.mode === 'race') {
      const CH = [[40, [52, 55, 59]], [36, [48, 52, 55]], [38, [50, 54, 57]], [35, [47, 51, 54]]];
      const [root, ch] = CH[bar % 4];
      if (s % 4 === 0) this.iKick(t, 0.24, 132, 46, 0.17);
      if (s === 4 || s === 12) this.iClap(t, 0.09);
      if (s % 4 === 2) this.iHat(t, 0.026, true);
      else if (s % 2 === 1 || I > 0.55) this.iHat(t, 0.011 + 0.01 * I);
      if (s % 2 === 0) this.iBass(t, root - 12 + (s % 4 === 2 ? 12 : 0), st * 1.6, 0.1, 'saw', 650 + 700 * I);
      if (s === 0 || s === 6 || s === 10) ch.forEach((m, k) => this.iBrass(t + k * 0.003, m + 12, st * (s === 0 ? 3 : 1.4), 0.016 + 0.01 * I, 0.1));
      if (I > 0.35 && s % 2 === 1) this.iPluck(t, ch[(s >> 1) % 3] + 24, 0.016 + 0.02 * I, 0.11, 'square', 2600);
      if (I > 0.8 && s === 0 && bar % 2 === 0) this.iRiser(t, spb * 4, 0.025);
      return;
    }
    if (this.mode === 'ready') {
      if (s % 4 === 0) this.iTaiko(t, 0.16 + 0.12 * I, 60);
      if (s % 2 === 0) this.iTick(t, 0.02 + 0.03 * I);
      if (I > 0.45 && s % 2 === 1) this.iHat(t, 0.008 + 0.012 * I);
      if (s === 0) { this.iBass(t, 28, spb * 3.8, 0.09, 'sub'); this.iStr(t, [52, 59, 64], spb * 4, 0.011 + 0.012 * I, 0.3, 1400 + 2200 * I, 0.3); }
      return;
    }
    if (this.mode === 'idle') {
      const CH = [[45, [57, 60, 64, 67]], [38, [57, 60, 62, 66]], [41, [57, 60, 64, 65]], [40, [56, 59, 62, 64]]];
      const [root, ch] = CH[bar % 4];
      if (s === 0 || s === 10) this.iKick(t, 0.12, 110, 46, 0.16);
      if (s === 7 && bar % 2 === 1) this.iKick(t, 0.07, 105, 46, 0.12);
      if (s === 4 || s === 12) this.iSnare(t, 0.055, 0.1);
      if (s % 2 === 0) this.iHat(t, s % 4 === 2 ? 0.015 : 0.009, s === 14);
      const BL = [0, null, null, 12, null, null, 7, null, 0, null, 10, null, 12, null, 7, 5];
      const b = BL[s];
      if (b != null) this.iBass(t, root - 12 + b, st * 1.4, 0.07, 'up');
      if (s === 2 || s === 7 || s === 10) ch.forEach((m, k) => this.iEP(t + k * 0.004, m, 0.01 * (k ? 0.8 : 1), st * 1.6, 0.18));
      if (bar % 2 === 1 && (s === 12 || s === 13 || s === 15)) this.iMarimba(t, ch[(s - 12) % 4] + 12, 0.02, 0.1);
      return;
    }
    // sonuç: sakin
    const CH = [[45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]], [40, [56, 59, 64]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, 0.008, 1000);
    if (s % 4 === 0) this.iBass(t, root + [0, 7, 12, 7][(s >> 2) % 4] - 12, spb * 0.85, 0.065, 'up');
    if (s === 0 || s === 8) this.iKick(t, 0.08, 100, 48, 0.16);
    if (s === 4 || s === 12) this.iBrush(t, 0.04, 0.18);
    if (s % 2 === 0) this.iHat(t, 0.008);
    if (s === 14) this.iVibe(t, ch[2] + 12, 0.016, spb, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'amber': // sarı ışık
        this.tone(440, t, 0.15, 'square', 0.07, null, 0.002);
        this.tone(880, t, 0.12, 'sine', 0.05, null, 0.002);
        break;
      case 'green': // yeşil: tiz bip + lastik çığlığı
        this.duck(0.3, 1.0);
        this.tone(880, t, 0.42, 'square', 0.09, null, 0.002);
        this.tone(1760, t, 0.32, 'sine', 0.06, null, 0.002);
        this.noise(t + 0.04, 0.55, 0.12, { type: 'bandpass', freq: 2600, to: 1300, q: 3, attack: 0.02 });
        break;
      case 'tap': { // düğme tıkı (a: hız 0..1)
        const f = 2100 + 900 * (a || 0) + Math.random() * 200;
        this.tone(f, t, 0.012, 'square', 0.022, f * 0.7, 0.0008);
        this.noise(t, 0.014, 0.05, { type: 'bandpass', freq: 3800, q: 2.5, attack: 0.0006 });
        break;
      }
      case 'rev': // beklerken gaza basmak
        this.tone(78, t, 0.22, 'sawtooth', 0.06, 190, 0.01);
        this.noise(t, 0.16, 0.05, { type: 'lowpass', freq: 600, to: 1400, attack: 0.01 });
        break;
      case 'line': // bitiş çizgisi (benim arabam)
        this.duck(0.3, 1.2);
        [[1568, 0], [1568, 0.16]].forEach(([f, d]) => { this.tone(f, t + d, 0.5, 'sine', 0.1, null, 0.002); this.tone(f * 2, t + d, 0.25, 'sine', 0.03, null, 0.002); });
        this.noise(t, 0.4, 0.12, { type: 'bandpass', freq: 600, to: 2400, q: 0.9, attack: 0.04 });
        break;
      case 'lineO': this.noise(t, 0.35, 0.06, { type: 'bandpass', freq: 800, to: 2200, q: 1, attack: 0.05 }); this.tone(1318, t, 0.25, 'sine', 0.025, null, 0.002); break;
      case 'chute': // paraşüt açılır
        this.noise(t, 0.25, 0.14, { type: 'lowpass', freq: 1500, to: 300, q: 0.8, attack: 0.004 });
        for (let i = 0; i < 4; i++) this.noise(t + 0.08 + i * 0.06, 0.05, 0.05 * (1 - i * 0.2), { type: 'bandpass', freq: 700, q: 1.2 });
        break;
      case 'win': // yarışı ben kazandım
        this.duck(0.25, 2.2);
        [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.3]].forEach(([f, d]) => { this.tone(f, t + d, 0.2, 'square', 0.05); this.tone(f, t + d, 0.32, 'triangle', 0.09); });
        [523, 659, 784, 1047].forEach((f) => this.tone(f, t + 0.45, 1.0, 'triangle', 0.05));
        this.cheer(t + 0.2, 1.6);
        break;
      case 'place': // bitirdim ama birinci değilim
        [[784, 0], [988, 0.1]].forEach(([f, d]) => { this.tone(f, t + d, 0.2, 'triangle', 0.08); this.tone(f * 2, t + d, 0.12, 'sine', 0.03); });
        break;
      case 'pass': this.noise(t, 0.3, 0.07, { type: 'bandpass', freq: 500, to: 2200, q: 1.1, attack: 0.06 }); this.tone(1175, t + 0.05, 0.12, 'sine', 0.04, 1568, 0.004); break;
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
const BLACK = () => C('#17171b', -0.3), CHROME = () => C('#d8dce2', -0.95), SILVER = () => C('#aeb4bc', -0.9);
// gövde (oyuncunun rengine boyanır: beyaz parlak boya × renk)
function carBody(mb) {
  const P = C('#ffffff', -0.85);
  mb.superS(0, 0.037, -0.15, 0.026, 0.017, 0.13, 0.5, 0.35, P, 24, 10);        // uzun burun
  mb.superS(0, 0.046, -0.03, 0.043, 0.027, 0.072, 0.45, 0.4, P, 24, 10);       // kokpit gövdesi
  mb.rbox(-0.056, 0.025, -0.282, 0.056, 0.03, -0.252, 0.002, P, 1);            // ön kanat
  mb.rbox(-0.09, 0.121, -0.002, 0.09, 0.128, 0.056, 0.003, P, 1);              // arka kanat
  for (const s of [-1, 1]) mb.rbox(s * 0.09 - 0.003, 0.1, -0.006, s * 0.09 + 0.003, 0.137, 0.06, 0.002, P, 1);
}
// ayrıntılar (boyanmaz): şasi rayları, motor, kompresör, egzoz boruları, kask, kanat dikmeleri, paraşüt çantası, akslar
function carParts(mb) {
  const K = BLACK(), Ch = CHROME(), Sv = SILVER(), Hm = C('#f4f4f4', -0.7), Vz = C('#151c28', -0.95), Sc = C('#202024', -0.5);
  for (const s of [-1, 1]) limb(mb, [s * 0.017, 0.024, -0.27], [s * 0.03, 0.03, 0.0], [0.005, 0.005], K, 6);
  mb.rbox(-0.03, 0.04, -0.126, 0.03, 0.076, -0.058, 0.008, Sv, 2);             // motor bloğu
  mb.rbox(-0.024, 0.075, -0.121, 0.024, 0.097, -0.064, 0.006, Ch, 2);           // kompresör
  for (let k = 0; k < 4; k++) mb.rbox(-0.025, 0.08 + k * 0.004, -0.122, 0.025, 0.0815 + k * 0.004, -0.063, 0.001, Sv, 1);
  mb.rbox(-0.018, 0.097, -0.113, 0.018, 0.118, -0.083, 0.005, Sc, 2);           // hava kepçesi
  mb.rbox(-0.019, 0.112, -0.115, 0.019, 0.119, -0.111, 0.002, Ch, 1);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const z = -0.118 + k * 0.017; limb(mb, [s * 0.029, 0.052, z], [s * 0.052, 0.079, z + 0.013], [0.0042, 0.0042], Ch, 6); }
  mb.sphereS(0, 0.083, -0.018, 0.021, 0.021, 0.023, Hm, 16, 10);              // kask
  mb.rbox(-0.016, 0.077, -0.043, 0.016, 0.091, -0.034, 0.004, Vz, 1);           // vizör
  mb.rbox(-0.012, 0.06, 0.006, 0.012, 0.094, 0.016, 0.004, K, 1);               // koltuk sırtı
  for (const s of [-1, 1]) limb(mb, [s * 0.03, 0.05, 0.028], [s * 0.05, 0.122, 0.03], [0.0035, 0.0035], K, 6);
  mb.rbox(-0.015, 0.045, 0.044, 0.015, 0.068, 0.068, 0.006, Sc, 2);             // paraşüt çantası
  limb(mb, [-0.044, RR, 0], [0.044, RR, 0], [0.006, 0.006], K, 6);
  limb(mb, [-0.044, RF, FZ], [0.044, RF, FZ], [0.003, 0.003], K, 6);
}
// teker: yan yüzler x yönünde (orijin teker merkezi)
function wheel(mb, x, w, r, spokes) {
  const K = C('#18181c', -0.15), Ch = CHROME(), Hb = C('#2a2a30', -0.6);
  mb.push().T(x, 0, 0, 0, 0, Math.PI / 2);
  mb.lathe(0, -w / 2, 0, [[r * 0.6, 0], [r * 0.9, 0], [r, w * 0.14], [r, w * 0.86], [r * 0.9, w], [r * 0.6, w]], 22, K);
  // jant diskleri (normaller dışa bakar)
  mb.lathe(0, w / 2 + 0.0004, 0, [[r * 0.6, 0], [0, 0]], 18, Ch);
  mb.lathe(0, -w / 2 - 0.0004, 0, [[0, 0], [r * 0.6, 0]], 18, Ch);
  mb.pop();
  // jant kolları: dönerken belli olsun
  for (const sx of [-1, 1]) {
    const xx = x + sx * (w / 2 + 0.0012);
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * TAU;
      limb(mb, [xx, Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16], [xx, Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52], [r * 0.06, r * 0.06], Hb, 5);
    }
    mb.sphereS(xx, 0, 0, 0.0016, r * 0.15, r * 0.15, Hb, 10, 6);
  }
}
function wheelsRear(mb) { for (const s of [-1, 1]) wheel(mb, s * 0.0625, 0.045, RR, 5); }
function wheelsFront(mb) { for (const s of [-1, 1]) wheel(mb, s * 0.05, 0.012, RF, 4); }
// paraşüt: bağlantı noktası orijinde, kubbe arkada (+z), ağzı arabaya dönük; 8 dilim (renkli / beyaz sırayla).
// white = false: renkli dilimler (oyuncunun rengine boyanır); true: beyaz dilimler + ipler
const CH_PROF = [[0.105, 0], [0.101, 0.015], [0.088, 0.036], [0.066, 0.055], [0.035, 0.068], [0, 0.072]];
function chuteModel(mb, white) {
  const P = C('#ffffff', -0.35), Cd = C('#e8e2d4', 0);
  const n = CH_PROF.length, G = 8, SG = 3;
  const N = CH_PROF.map((p, i) => { const a = CH_PROF[Math.max(0, i - 1)], b = CH_PROF[Math.min(n - 1, i + 1)]; const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1; return [dy / l, -dr / l]; });
  mb.push().T(0, 0.055, 0.25, 0, Math.PI / 2, 0);
  for (let g = 0; g < G; g++) {
    if ((g % 2 === 1) !== !!white) continue;
    for (let j = 0; j < SG; j++) {
      const a0 = ((g * SG + j) / (G * SG)) * TAU, a1 = ((g * SG + j + 1) / (G * SG)) * TAU;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      for (let i = 0; i < n - 1; i++) {
        const p0 = CH_PROF[i], p1 = CH_PROF[i + 1], n0 = N[i], n1 = N[i + 1];
        mb.quadN([c0 * p0[0], p0[1], s0 * p0[0]], [c1 * p0[0], p0[1], s1 * p0[0]], [c1 * p1[0], p1[1], s1 * p1[0]], [c0 * p1[0], p1[1], s0 * p1[0]],
          [c0 * n0[0], n0[1], s0 * n0[0]], [c1 * n0[0], n0[1], s1 * n0[0]], [c1 * n1[0], n1[1], s1 * n1[0]], [c0 * n1[0], n1[1], s0 * n1[0]], P);
      }
    }
  }
  mb.pop();
  if (white) for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; limb(mb, [0, 0.002, 0], [Math.cos(a) * 0.103, 0.055 + Math.sin(a) * 0.103, 0.25], [0.0011, 0.0011], Cd, 3); }
}
// yarış düğmesi: siyah konsol + krom halka (koltuk uzayında, orijin masada); kapak ayrı (oyuncunun rengi)
function btnBase(mb) {
  const B = C('#1d1d23', -0.7), Mt = C('#c9ccd3', -0.9), Ln = C('#3a3a44', -0.5);
  mb.rbox(-0.085, 0, -0.08, 0.085, 0.034, 0.08, 0.018, B, 3);
  mb.lathe(0, 0.034, 0, [[0.066, 0], [0.068, 0.005], [0.061, 0.011], [0.055, 0.011]], 32, Mt);
  // iki küçük vida + oyuncuya dönük çizgi
  for (const s of [-1, 1]) mb.sphereS(s * 0.07, 0.034, -0.064, 0.005, 0.003, 0.005, Mt, 8, 4);
  mb.rbox(-0.04, 0.0335, -0.077, 0.04, 0.0345, -0.073, 0.0008, Ln, 1);
}
function btnCap(mb, lit) {
  const W = lit ? [1, 1, 1, 0.92] : [1, 1, 1, -0.75];
  mb.lathe(0, 0, 0, [[0.053, 0], [0.053, 0.009], [0.048, 0.021], [0.034, 0.029], [0.017, 0.034], [0, 0.035]], 28, W);
}
// dalgalanan damalı bayrak (direk dibinde orijin)
function flagModel(mb) {
  limb(mb, [0, 0, 0], [0, 0.13, 0], [0.003, 0.003], CHROME(), 6);
  const n = 6, m = 4, w = 0.09, h = 0.06;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const x0 = 0.003 + (i / n) * w, x1 = 0.003 + ((i + 1) / n) * w, y0 = 0.13 - ((j + 1) / m) * h, y1 = 0.13 - (j / m) * h;
    const wv = (x) => Math.sin(x * 38) * 0.008;
    const col = (i + j) % 2 ? C('#16161a', 0) : C('#f4f4f4', 0);
    mb.quad([x0, y0, wv(x0)], [x1, y0, wv(x1)], [x1, y1, wv(x1)], [x0, y1, wv(x0)], col);
  }
}
function trophyMk(mb) { trophyModel(mb); }

// ---- pistle birlikte (ölçüye göre) kurulan parçalar; hepsi masa üstü orijinli (y = 0 masa yüzü) ----
function boardBase(mb, L) {
  mb.rbox(-L.hw, 0, -L.hl, L.hw, BH, L.hl, 0.03, C('#25272c', -0.45), 3);
  // kenar şeridi (marka rengi, ince)
  const A = C(L.acc, -0.6);
  mb.rbox(-L.hw - 0.002, BH * 0.35, -L.hl + 0.03, -L.hw + 0.004, BH * 0.75, L.hl - 0.03, 0.002, A, 1);
  mb.rbox(L.hw - 0.004, BH * 0.35, -L.hl + 0.03, L.hw + 0.002, BH * 0.75, L.hl - 0.03, 0.002, A, 1);
}
function boardTop(tb, L) {
  const y = BH + 0.0006, x0 = -L.hw + 0.008, x1 = L.hw - 0.008, z0 = -L.hl + 0.008, z1 = L.hl - 0.008;
  // doku: u soldan sağa (x), v üstten (uzak uç, −z) yakına (+z)
  const u0 = 0.008 / (2 * L.hw), u1 = 1 - u0, v0 = 0.008 / (2 * L.hl), v1 = 1 - v0;
  tb.tquad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], u0, v0, u1, v1, [0, y - 1, 0]);
}
// bordürler: iki yanda kırmızı-beyaz bloklar
function kerbs(mb, L) {
  const R = C('#d2301c', -0.3), W = C('#f1efe8', -0.3);
  const xs = [-(L.ws / 2 + L.side / 2), L.ws / 2 + L.side / 2], z0 = L.zWall + 0.03, z1 = L.hl - 0.035, len = 0.07;
  const n = Math.max(4, Math.round((z1 - z0) / len)), dl = (z1 - z0) / n;
  for (const x of xs) for (let k = 0; k < n; k++) mb.rbox(x - 0.013, BH, z0 + k * dl + 0.002, x + 0.013, BH + 0.018, z0 + (k + 1) * dl - 0.002, 0.005, k % 2 ? R : W, 1);
}
// pistin sonundaki lastik duvarı (iki sıra üst üste)
function tireWall(mb, L) {
  const K = C('#141417', -0.1), Wt = C('#f0eee8', -0.2), Rd = C('#c8261c', -0.2);
  const r = 0.0265, x0 = -(L.ws / 2 + L.side), x1 = -x0, n = Math.max(3, Math.floor((x1 - x0) / (2 * r + 0.001)));
  const dx = (x1 - x0) / n;
  for (let row = 0; row < 2; row++) for (let k = 0; k < n; k++) {
    const x = x0 + dx * (k + 0.5), col = row === 1 && k % 5 === 2 ? Wt : row === 0 && k % 5 === 4 ? Rd : K;
    mb.torusN(x, BH + 0.0095 + row * 0.019, L.zWall - r, 0.017, 0.0095, 0.0095, 12, 6, col);
  }
}
// bitiş kemeri: iki direk + damalı afiş
function gantry(mb, L) {
  const K = BLACK(), Ch = CHROME();
  const xp = L.hw + 0.016, h = 0.3 * L.gs, z = L.zF;
  for (const s of [-1, 1]) {
    mb.lathe(s * xp, 0, z, [[0.022, 0], [0.022, 0.008], [0.009, 0.014], [0.008, 0.014]], 14, K, 'b');
    limb(mb, [s * xp, 0.008, z], [s * xp, h + 0.02, z], [0.0075, 0.0075], Ch, 8);
  }
  // afiş: iki sıra kare (önde ve arkada)
  const y0 = h - 0.045, y1 = h, cols = Math.max(8, Math.round((2 * xp) / 0.024)), dx = (2 * xp) / cols, zz = [z + 0.007, z - 0.007];
  mb.rbox(-xp, y0 - 0.004, z - 0.006, xp, y1 + 0.004, z + 0.006, 0.003, K, 1);
  for (let i = 0; i < cols; i++) for (let j = 0; j < 2; j++) {
    const x0 = -xp + i * dx, x1 = x0 + dx, ya = y0 + (j * (y1 - y0)) / 2, yb = y0 + ((j + 1) * (y1 - y0)) / 2;
    const col = (i + j) % 2 ? C('#141417', 0) : C('#f6f6f6', 0.0);
    for (const zq of zz) mb.quad([x0, ya, zq], [x1, ya, zq], [x1, yb, zq], [x0, yb, zq], col);
  }
}
// başlangıç ışık direği ("Noel ağacı"): direk + iki sütun ampul (beyaz, 3 sarı, yeşil, kırmızı); yanan ampuller ayrıca çizilir
const TREE_ROWS = 6;
function treeY(L, r) { return (0.352 - r * 0.032) * L.ts; }
function treeModel(mb, L) {
  const K = C('#1a1a1f', -0.6), Ch = CHROME();
  const x = L.tx, z = L.tz, s = L.ts;
  mb.lathe(x, 0, z, [[0.026 * s, 0], [0.026 * s, 0.008], [0.01 * s, 0.016], [0.008 * s, 0.016]], 14, K, 'b');
  limb(mb, [x, 0.01, z], [x, treeY(L, TREE_ROWS - 1) - 0.02 * s, z], [0.0075 * s, 0.0075 * s], Ch, 8);
  mb.rbox(x - 0.034 * s, treeY(L, TREE_ROWS - 1) - 0.02 * s, z - 0.012 * s, x + 0.034 * s, treeY(L, 0) + 0.02 * s, z + 0.01 * s, 0.006 * s, K, 2);
  const glass = [C('#5a5650', -0.8), C('#5a3a10', -0.8), C('#5a3a10', -0.8), C('#5a3a10', -0.8), C('#0f4020', -0.8), C('#4a1010', -0.8)];
  for (let r = 0; r < TREE_ROWS; r++) for (const c of [-1, 1]) {
    const bx = x + c * 0.017 * s, by = treeY(L, r), rr = (r === 0 ? 0.0075 : 0.0105) * s;
    mb.push().T(bx, by, z + 0.011 * s, 0, Math.PI / 2, 0);
    mb.torusN(0, 0, 0, rr + 0.002 * s, 0.0022 * s, 0.0022 * s, 12, 4, K);
    mb.pop();
    mb.sphereS(bx, by, z + 0.011 * s, rr, rr, rr * 0.7, glass[r], 10, 6);
  }
}
function bulbE(mb) { mb.sphereS(0, 0, 0, 1, 1, 0.75, [1, 1, 1, 0.95], 12, 8); }
// ışık izi (saydam, toplamalı): z = 0'da parlak, z = 1'e doğru söner; kenarları yumuşak
function trailModel(mb) {
  const X = [-0.5, -0.22, 0.22, 0.5], A = [0, 1, 1, 0], N = 8;
  const v = (x, z, a) => mb.d.push(x, 0, z, 1, 1, 1, a);
  for (let k = 0; k < N; k++) {
    const z0 = k / N, z1 = (k + 1) / N, a0 = Math.pow(1 - z0, 1.7), a1 = Math.pow(1 - z1, 1.7);
    for (let j = 0; j < 3; j++) {
      const xa = X[j], xb = X[j + 1], ea = A[j], eb = A[j + 1];
      v(xa, z0, a0 * ea); v(xb, z0, a0 * eb); v(xb, z1, a1 * eb);
      v(xa, z0, a0 * ea); v(xb, z1, a1 * eb); v(xa, z1, a1 * ea);
    }
  }
}

/* ============================ pist dokusu ============================ */
// tuval x → dünya x (−hw..hw), tuval y → dünya z (−hl..hl; üst uzak uç). lanes: [{ x, col, me, on }] şerit sırasıyla
function drawTrack(cv, L, lanes, brand) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const sx = W / (2 * L.hw), sy = H / (2 * L.hl);
  const X = (x) => (x + L.hw) * sx, Y = (z) => (z + L.hl) * sy;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#1e1f23';
  g.fillRect(0, 0, W, H);
  const xa = X(-L.ws / 2 - L.side), xb = X(L.ws / 2 + L.side), ya = Y(L.zWall - 0.055), yb = Y(L.hl - 0.03);
  // asfalt
  g.fillStyle = '#3b3d43';
  g.fillRect(xa, ya, xb - xa, yb - ya);
  let seed = 12345;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14000; i++) {
    const x = xa + rnd() * (xb - xa), y = ya + rnd() * (yb - ya), b = rnd();
    g.fillStyle = b < 0.45 ? `rgba(255,255,255,${(0.025 + rnd() * 0.05).toFixed(3)})` : `rgba(0,0,0,${(0.05 + rnd() * 0.09).toFixed(3)})`;
    g.fillRect(x, y, 1 + rnd() * 1.4, 1 + rnd() * 1.4);
  }
  // yan şeritler (bordür altı): açık beton
  g.fillStyle = '#8d8f95';
  g.fillRect(xa, ya, X(-L.ws / 2) - xa, yb - ya);
  g.fillRect(X(L.ws / 2), ya, xb - X(L.ws / 2), yb - ya);
  // duruş alanı: biraz daha açık asfalt
  g.fillStyle = 'rgba(255,255,255,.045)';
  g.fillRect(X(-L.ws / 2), ya, X(L.ws / 2) - X(-L.ws / 2), Y(L.zF) - ya);
  // şeritler: çıkış kutusu (oyuncunun rengi), şerit ortasında renkli kesik çizgi, çıkışta lastik izleri
  const lw = L.lw * sx;
  lanes.forEach((ln) => {
    const cx = X(ln.x);
    g.globalAlpha = ln.on ? 0.26 : 0.12;
    g.fillStyle = ln.col;
    g.fillRect(cx - lw / 2 + 3, Y(L.zS) + 3, lw - 6, Y(L.hl - 0.035) - Y(L.zS) - 3);
    g.globalAlpha = ln.on ? 0.95 : 0.4;
    g.fillRect(cx - lw / 2 + 3, Y(L.hl - 0.035) - 0.04 * sy, lw - 6, 0.04 * sy);
    g.globalAlpha = 1;
    if (ln.me) {
      g.strokeStyle = '#ffd23f';
      g.lineWidth = Math.max(3, lw * 0.06);
      g.strokeRect(cx - lw / 2 + 3, Y(L.zS) + 3, lw - 6, Y(L.hl - 0.035) - Y(L.zS) - 3);
    }
    // lastik izleri
    for (const s of [-1, 1]) {
      const tx = cx + s * 0.0625 * L.cs * sx, tw = 0.03 * L.cs * sx;
      const gr = g.createLinearGradient(0, Y(L.zS), 0, Y(L.zS - L.Lr * 0.28));
      gr.addColorStop(0, 'rgba(8,8,10,.55)');
      gr.addColorStop(1, 'rgba(8,8,10,0)');
      g.fillStyle = gr;
      g.fillRect(tx - tw / 2, Y(L.zS - L.Lr * 0.28), tw, Y(L.zS) - Y(L.zS - L.Lr * 0.28));
    }
    g.strokeStyle = ln.col;
    g.globalAlpha = ln.on ? 0.55 : 0.2;
    g.lineWidth = Math.max(2, 0.006 * sx);
    g.setLineDash([0.05 * sy, 0.06 * sy]);
    g.beginPath(); g.moveTo(cx, Y(L.zS) - 0.04 * sy); g.lineTo(cx, Y(L.zF) + 0.02 * sy); g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  });
  // şerit ayraçları: aralarda kesik beyaz, dış kenarlarda düz beyaz
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = Math.max(2, 0.007 * sx);
  for (let j = 1; j < L.nl; j++) {
    const x = X(-L.ws / 2 + j * L.lw);
    g.setLineDash([0.07 * sy, 0.05 * sy]);
    g.beginPath(); g.moveTo(x, Y(L.hl - 0.035)); g.lineTo(x, Y(L.zF)); g.stroke();
  }
  g.setLineDash([]);
  g.lineWidth = Math.max(3, 0.01 * sx);
  for (const x of [X(-L.ws / 2), X(L.ws / 2)]) { g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.stroke(); }
  // mesafe çizgileri (çeyrekler)
  g.fillStyle = 'rgba(255,255,255,.16)';
  for (const q of [0.25, 0.5, 0.75]) g.fillRect(X(-L.ws / 2), Y(L.zS - L.Lr * q) - 1.5, X(L.ws / 2) - X(-L.ws / 2), 3);
  g.fillStyle = 'rgba(255,255,255,.9)';
  for (const q of [0.25, 0.5, 0.75]) for (const x of [X(-L.ws / 2 - L.side), X(L.ws / 2)]) g.fillRect(x, Y(L.zS - L.Lr * q) - 2, X(-L.ws / 2) - X(-L.ws / 2 - L.side), 4);
  // çıkış çizgisi
  g.fillStyle = '#ffffff';
  g.fillRect(X(-L.ws / 2), Y(L.zS) - Math.max(3, 0.006 * sy), X(L.ws / 2) - X(-L.ws / 2), Math.max(5, 0.012 * sy));
  // bitiş: damalı bant (bitiş çizgisi bandın yakın kenarı)
  const sq = 0.022, cols = Math.max(4, Math.round(L.ws / sq)), dx = (X(L.ws / 2) - X(-L.ws / 2)) / cols;
  for (let r = 0; r < 3; r++) for (let i = 0; i < cols; i++) {
    g.fillStyle = (i + r) % 2 ? '#141417' : '#f6f6f6';
    g.fillRect(X(-L.ws / 2) + i * dx, Y(L.zF - (r + 1) * sq), Math.ceil(dx), Math.ceil(sq * sy));
  }
  // yazılar (tuval düz olmayan ölçekte; harfler bozulmasın diye y ekseni ters ölçeklenir)
  const txt = (s, x, z, hgt, col, weight = 900, alpha = 1) => {
    g.save();
    g.globalAlpha = alpha;
    g.translate(X(x), Y(z));
    g.scale(1, sy / sx);
    g.font = `${weight} ${Math.round(hgt * sx)}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = col;
    g.fillText(s, 0, 0);
    g.restore();
  };
  const runMid = (L.zWall + L.zF - 3 * sq) / 2;
  const nm = brand.slug === 'nfc' ? 'NFC DÜNYASI' : String(brand.name || '').toLocaleUpperCase('tr');
  const fw = Math.min(0.09, (L.ws * 0.85) / Math.max(6, nm.length * 0.62));
  txt(nm, 0, runMid, fw, '#ffffff', 900, 0.2);
  txt('BİTİŞ', 0, L.zF + 0.045, Math.min(0.05, L.ws * 0.12), '#ffffff', 900, 0.32);
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
// dokunuş zamanı (olay zaman damgası performance.now ile aynı eksendeyse onu kullan)
const evTime = (e) => { const n = performance.now(); const ts = e && e.timeStamp; return ts && ts > 0 && Math.abs(ts - n) < 4000 ? Math.min(ts, n) : n; };
const easeOut = (x) => 1 - (1 - x) * (1 - x);
const sec = (ms) => (ms / 1000).toFixed(2).replace('.', ',');

/* ============================ oyun ============================ */
class RaceGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'pry', cls: 'pry', title: 'Parmak Yarışı', sub: 'Yeşil yanınca durmadan bas!', emoji: '👆', css: STYLE, snd: new PrSnd(), amb: 'diner', ambVol: 0.45, botPx: 260, botPxL: 40, trim: '#ffd27a', place: false, tea: false });
    this.cars = new Map();       // oyuncu → araba durumu
    this.loc = null;             // bu yarıştaki kendi basışlarım
    this.goStart = null; this.goFor = ''; this.goPending = false;
    this.amb = 0;
    this.trophies = [];
    this.tapT = [-9, -9];
    this.tapN = 0;
    this.revK = 0;
    this.finOrder = [];          // bu yarışta (bu ekranda) bitişi geçenler
    this.L = null; this.layKey = ''; this.trackKey = '';
    this.meEl = document.createElement('div');
    this.meEl.className = 'pr-me';
    this.meEl.textContent = 'SEN';
    this.el.lbls.appendChild(this.meEl);
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.body = this.mk(carBody);
    W.parts = this.mk(carParts);
    W.wR = this.mk(wheelsRear);
    W.wF = this.mk(wheelsFront);
    W.chute = this.mk((mb) => chuteModel(mb, false));
    W.chuteW = this.mk((mb) => chuteModel(mb, true));
    W.btnB = this.mk(btnBase);
    W.cap = this.mk((mb) => btnCap(mb, false));
    W.capE = this.mk((mb) => btnCap(mb, true));
    W.bulbE = this.mk(bulbE);
    W.flag = this.mk(flagModel);
    W.trophy = this.mk(trophyMk);
    W.trail = this.mk(trailModel, 'un');
    this.trCv = document.createElement('canvas');
    this.trCv.width = 512; this.trCv.height = 1024;
    this.trTex = makeTexture(this.X, this.trCv);
    this.trackKey = '';
  }
  freeTex() { if (this.trTex && this.X) this.X.gl.deleteTexture(this.trTex); this.trTex = null; }
  // pist ölçüleri ve şerit sırası (oyuncular / masa değişince yeniden)
  lay() {
    const ns = this.seats.length;
    const key = `${this.seats.map((p) => p.id + ':' + p.c + ':' + (p.in ?? 1)).join(',')}|${this.me}|${this.R.toFixed(3)}|${this.kz.toFixed(3)}`;
    if (key === this.layKey && this.L) return this.L;
    this.layKey = key;
    const n = Math.max(2, ns);
    const lw = clamp(0.36 - 0.016 * n, 0.17, 0.32), side = 0.045;
    const ws = n * lw, hw = ws / 2 + side + 0.028;
    const ax = Math.max(0.7, this.R - 0.44), az = Math.max(0.7, this.R * this.kz - 0.44);
    const hl = clamp(az * Math.sqrt(Math.max(0.15, 1 - (hw / ax) ** 2)), 0.9, 2.05);
    const cs = clamp(Math.min(lw / 0.22, hl / 1.25), 0.66, 1.2);
    const CL = (NOSE + 0.075) * cs;
    const zS = hl - 0.035 - CL - 0.05;
    const zWall = -hl + 0.055;
    const zF = zWall + 0.05 + CL + 0.18;
    const zStop = zWall + 0.045;
    // şerit sırası: oyuncular masadaki yerlerine göre soldan sağa (kendi arabam önümde)
    const idx = this.seats.map((p, i) => i).sort((a, b) => {
      const A = this.avatarAt(a), B = this.avatarAt(b);
      return (A ? A.pos[0] : 0) - (B ? B.pos[0] : 0) || (B ? B.pos[2] : 0) - (A ? A.pos[2] : 0);
    });
    const lx = new Array(ns).fill(0);
    idx.forEach((si, j) => { lx[si] = -ws / 2 + lw * (j + 0.5); });
    const ts = clamp(cs * 1.35, 1.0, 1.4), gs = clamp(cs, 0.85, 1.05);
    this.L = { nl: n, lw, side, ws, hw, hl, cs, CL, zS, zF, zWall, zStop, Lr: zS - zF, top: TABLE_Y + BH, lx, idx, ts, gs, tx: hw + 0.075, tz: zS - 0.02, acc: this.accHex || '#c8261c', key };
    this.stripKey = '';
    return this.L;
  }
  ensureTrack() {
    if (!this.W || !this.X) return;
    const L = this.lay();
    if (L.key === this.trackKey) return;
    this.trackKey = L.key;
    ['tb', 'tt', 'kerb', 'tires', 'gantry', 'tree'].forEach((k) => { if (this.W[k]) { E.freeMesh(this.X, this.W[k]); this.W[k] = null; } });
    this.W.tb = this.mk((mb) => boardBase(mb, L));
    this.W.tt = this.mk((tb) => boardTop(tb, L), 'tex');
    this.W.kerb = this.mk((mb) => kerbs(mb, L));
    this.W.tires = this.mk((mb) => tireWall(mb, L));
    this.W.gantry = this.mk((mb) => gantry(mb, L));
    this.W.tree = this.mk((mb) => treeModel(mb, L));
    const lanes = this.seats.map((p, i) => ({ x: L.lx[i], col: pcol(p.c), me: i === this.me, on: p.on !== 0 }));
    try { drawTrack(this.trCv, L, lanes, this.brand); updateTexture(this.X, this.trTex, this.trCv); } catch (e) { console.warn('[pry] pist dokusu', e); }
  }
  onTable() { this.trackKey = ''; }
  rkey() { const v = this.view; return v ? `${v.game}:${v.round}` : ''; }
  goal() { return (this.view && this.view.goal) || GOAL0; }
  carOf(id) {
    let c = this.cars.get(id);
    if (!c) { c = { kS: 0, kAt: 0, rate: 0, disp: 0, nose: null, rot: 0, pitch: 0, fin: false, finT: 0, chute: 0, roll: 1, ph: Math.random() * 6, rk: '', smoke: false, puffT: 0 }; this.cars.set(id, c); }
    return c;
  }
  resetCars(rollIn) {
    for (const c of this.cars.values()) { c.kS = 0; c.kAt = 0; c.rate = 0; c.disp = 0; c.fin = false; c.finT = 0; c.chute = 0; c.roll = rollIn ? 0 : 1; c.smoke = false; c.pitch = 0; }
    this.finOrder = [];
  }
  // koltuk uzayındaki nokta → dünya
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  // işaret parmağının ucu düğmenin üstüne (lift yukarıda) gelsin diye bilek nerede durmalı (koltuk uzayı; j: 0 sağ el, 1 sol el)
  wristFor(kx, j, lift) {
    const ix = j ? -0.027 : 0.027;
    return [kx - ix, TABLE_Y + BTN_TOP + lift - FDN[1] * FING + 0.016, BTN_Z - 0.006 - FDN[2] * FING];
  }

  /* ---------- girdi ---------- */
  bindUi() {
    this.el.bar.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('[data-hit]')) return;
      e.preventDefault();
      this.hit(e);
    });
    // sahnenin herhangi bir yerine dokunmak da sayılır (büyük hedef)
    this.el.cv.addEventListener('pointerdown', (e) => { const v = this.view; if (v && (v.phase === 'ready' || v.phase === 'race')) { e.preventDefault(); this.hit(e); } });
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'pr-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'pr-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('start', { m: this.view?.mode || 'kisa' }); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (this.dead || e.repeat || (e.target && /input|textarea|select/i.test(e.target.tagName || ''))) return;
      if (e.key === ' ' || e.key === 'Enter') { const v = this.view; if (v && (v.phase === 'ready' || v.phase === 'race')) { e.preventDefault(); this.hit(e); } }
    };
    window.addEventListener('keydown', this.onKey);
  }
  hit(e) {
    const v = this.view;
    if (!v || !v.amIn || (v.phase !== 'ready' && v.phase !== 'race')) return;
    const key = this.rkey();
    const S = this.snd;
    // yeşil henüz ekrana çizilmediyse: yalnız gaza basar (sayılmaz)
    if (v.phase === 'ready' || this.goFor !== key || this.goStart == null) {
      this.revK = Math.min(1, this.revK + 0.55);
      try { S.fx('rev'); } catch { /* yok */ }
      this.strike();
      const me = v.seats[v.me];
      if (me) { const c = this.carOf(me.id); c.puffT = this.time; }
      return;
    }
    const L = this.loc;
    if (!L || L.key !== key || L.fin != null) return;
    const ts = evTime(e);
    if (ts - L.lastTs < 30) return;     // aynı dokunuşun ikinci olayı
    L.lastTs = ts;
    L.k = Math.min(this.goal(), L.k + 1);
    L.times.push(ts);
    if (L.times.length > 24) L.times.shift();
    this.strike();
    const rate = this.myRate();
    try { S.fx('tap', clamp(rate / 12, 0, 1)); } catch { /* yok */ }
    vibrate(6);
    const me = v.seats[v.me];
    if (me) { const c = this.carOf(me.id); c.puffT = this.time; }
    if (L.k >= this.goal()) { L.fin = Math.max(1, Math.round(ts - this.goStart)); this.flush(); }
    else if (!this.flushT) this.flushT = setTimeout(() => { this.flushT = 0; this.flush(); }, 70);
    this.hitNow();
  }
  flush() {
    const L = this.loc, v = this.view;
    if (!L || !v || v.phase !== 'race' || L.key !== this.rkey() || L.k <= 0) return;
    if (L.k === L.sentK && L.fin == null) return;
    L.sentK = L.k; L.sentAt = this.time;
    const p = L.fin != null ? { n: L.k, f: L.fin } : { n: L.k };
    try { this.ctx.sendQuiet ? this.ctx.sendQuiet('tap', p) : this.ctx.send('tap', p); } catch { /* bağlantı yok */ }
  }
  myRate() {
    const L = this.loc;
    if (!L || !L.times.length) return 0;
    const n = performance.now(), T = L.times;
    let c = 0;
    for (let i = T.length - 1; i >= 0 && n - T[i] < 700; i--) c++;
    return n - T[T.length - 1] > 500 ? 0 : c / 0.7;
  }
  // kendi karakterimin elleri sırayla düğmeye iner
  strike() { const j = this.tapN++ % 2; this.tapT[j] = this.time; }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.pry !== '1') { root.dataset.pry = '1'; root.innerHTML = '<p class="py-16 text-center">👆</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    this.lay();
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // sunucudan gelen basış sayıları → arabaların hızı
    if (v.phase === 'race' || v.phase === 'result') {
      v.seats.forEach((p, i) => {
        const c = this.carOf(p.id);
        if (i === v.me && this.loc && this.loc.key === this.rkey()) return;
        if (p.k > c.kS) {
          const dt = this.time - c.kAt;
          const smp = c.kAt > 0 && dt > 0.04 ? (p.k - c.kS) / dt : 0;
          c.rate = smp > 0 ? (c.rate > 0 ? lerp(c.rate, smp, 0.55) : smp) : c.rate;
          c.kS = p.k; c.kAt = this.time;
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
    if (v.phase === 'intro') {
      try { S.music('idle'); S.engine(false); } catch { /* yok */ }
      this.trophies = []; this.resetCars(false); this.loc = null;
    }
    if (v.phase === 'ready') {
      try { S.music('ready'); } catch { /* yok */ }
      this.trophies = [];
      const fresh = sNow - (v.readyAt || 0) < 900;
      this.resetCars(fresh);
      this.loc = v.amIn ? { key: this.rkey(), k: 0, fin: null, times: [], sentK: 0, sentAt: 0, lastTs: -1e9 } : null;
      this.goStart = null; this.goFor = ''; this.goPending = false;
      this.amb = AMB.filter((a) => sNow - (v.readyAt || 0) >= a).length;
      this.readyT = this.time;
      if (fresh) this.msg(`${v.round}. YARIŞ`, 'mid');
    }
    if (v.phase === 'race') {
      try { S.music('race'); } catch { /* yok */ }
      const late = sNow - (v.goAt || 0) > 1200;
      this.amb = 3;
      // yeşil bir sonraki karede çizilir; süre o karenin başladığı andan ölçülür
      if (v.amIn && v.myF == null) {
        if (!this.loc || this.loc.key !== this.rkey()) this.loc = { key: this.rkey(), k: v.myK || 0, fin: null, times: [], sentK: v.myK || 0, sentAt: 0, lastTs: -1e9 };
        this.goPending = true; this.goFor = '';
      }
      this.goT = this.time - (late ? 2 : 0);
      if (!late) {
        fx('green');
        this.flash('rgba(60,230,110,.35)');
        if (v.amIn) this.msg('BAS!', 'big gold');
      }
      // çıkış dumanı
      for (const c of this.cars.values()) c.smoke = false;
    }
    if (v.phase === 'result') {
      try { S.music('calm'); } catch { /* yok */ }
      this.goPending = false;
      const fresh = sNow - (v.resAt || 0) < 1200;
      this.resT = this.time - (fresh ? 0 : 3);
      if (fresh && v.me >= 0) {
        const r = (v.res || []).find((x) => x.i === v.me);
        if (r && r.f == null && v.amIn) setTimeout(() => { try { if (!this.dead) this.snd.fx('trombone'); } catch { /* yok */ } }, 300);
      }
    }
    if (v.phase === 'final') {
      try { S.music('idle'); S.engine(false); } catch { /* yok */ }
      const late = sNow - (v.finAt || 0) > 2500;
      const ch = v.champ || [];
      this.champK = ch.length ? ch[0] : -1;
      this.trophies = ch.map((w, n) => {
        const a = this.seatAngle(w), r = this.rAt(a, this.R) - 0.32;
        return { k: w, t: late ? 9 : -0.35 * n, x: Math.cos(a) * r + Math.sin(a) * 0.3, z: Math.sin(a) * r - Math.cos(a) * 0.3, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), landed: late };
      });
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

  /* ---------- arabalar ---------- */
  stepCars(dt) {
    const v = this.view, L = this.L;
    if (!v || !L) return;
    const goal = this.goal(), t = this.time;
    const race = v.phase === 'race', res = v.phase === 'result';
    const S = this.snd;
    this.seats.forEach((p, i) => {
      const c = this.carOf(p.id);
      const x = L.lx[i] ?? 0;
      // hedef basış sayısı
      let tk;
      const mine = i === v.me && this.loc && this.loc.key === this.rkey();
      if (v.phase === 'intro' || v.phase === 'ready' || !p.in) tk = 0;
      else if (mine) tk = Math.max(this.loc.k, p.k || 0);
      else {
        if (t - c.kAt > 0.45) c.rate = damp(c.rate, 0, 5, dt);
        tk = Math.max(c.kS, p.k || 0);
        if (race && p.f == null && c.kAt > 0) tk = Math.min(goal - 0.05, tk + c.rate * Math.min(0.18, t - c.kAt));
        if (p.f != null) tk = goal;
      }
      c.disp = Math.max(c.disp, damp(c.disp, tk, mine ? 22 : 12, dt));
      if (tk >= goal && goal - c.disp < 0.08) c.disp = goal;
      const rate = mine ? this.myRate() : c.rate;
      c.rateV = damp(c.rateV || 0, rate, 6, dt);
      // burnun yeri
      let nose;
      if (c.fin) {
        const u = t - c.finT;
        nose = L.zStop + (L.zF - L.zStop) * Math.exp(-u / 0.3);
        c.chute = clamp((u - 0.08) / 0.22, 0, 1);
      } else {
        nose = L.zS - (c.disp / goal) * L.Lr;
        if (c.roll < 1) { c.roll = Math.min(1, c.roll + dt / 0.7); nose = L.zS + (1 - easeOut(c.roll)) * 0.42 * L.cs; }
        if (p.in && (race || res) && c.disp >= goal - 0.001) {
          c.fin = true; c.finT = t;
          this.finOrder.push(i);
          this.onCross(i, p, c, x);
        }
      }
      const prevNose = c.nose ?? nose;
      c.nose = nose;
      const dz = prevNose - nose;
      c.rot -= dz / (RR * L.cs);
      // şaha kalkma: kalkışta hızlı basana
      const sinceGo = race ? t - (this.goT || t) : 9;
      const wantP = !c.fin && race ? clamp((c.rateV - 3) / 8, 0, 1) * 0.15 * Math.max(0, 1 - sinceGo / 1.4) : 0;
      const rev = mine || i === v.me ? Math.max(0, 1 - (t - (c.puffT || -9)) / 0.25) : 0;
      c.pitch = damp(c.pitch, wantP + (v.phase === 'ready' ? rev * 0.03 : 0), 9, dt);
      // çıkış dumanı (kalkışta)
      if (race && !c.smoke && c.disp > 0.6) {
        c.smoke = true;
        const rz = nose + NOSE * L.cs;
        if (this.X) for (const s of [-1, 1]) this.burst(x + s * 0.0625 * L.cs, L.top + 0.02, rz + 0.03, 9, [[0.62, 0.62, 0.66], [0.78, 0.78, 0.8], [0.5, 0.5, 0.54]], 0.35, 0.05 * L.cs, false, 1.1, -0.5);
      }
      // egzoz alevi (benim her basışımda kıvılcım)
      if (this.X && (mine || i === v.me) && c.puffT && t - c.puffT < 0.02 && !c.fin) {
        const rz = nose + NOSE * L.cs;
        for (const s of [-1, 1]) this.burst(x + s * 0.054 * L.cs, L.top + 0.08 * L.cs, rz - 0.09 * L.cs, 2, [[1, 0.62, 0.2], [1, 0.85, 0.4], [0.55, 0.65, 1]], 0.22, 0.012 * L.cs, true, 0.16, -1.5);
      }
    });
    // geçme sesi: canlı sıram iyileşince
    if (race && v.amIn && v.me >= 0) {
      const myId = v.seats[v.me]?.id, mc = this.cars.get(myId);
      if (mc && !mc.fin) {
        let rk = 1;
        this.seats.forEach((p, i) => { if (i !== v.me && p.in) { const c = this.cars.get(p.id); if (c && (c.fin || c.disp > mc.disp + 0.3)) rk++; } });
        if (this.liveRk && rk < this.liveRk && t - (this.passT || 0) > 0.9 && mc.disp > 4) { this.passT = t; try { S.fx('pass'); } catch { /* yok */ } }
        this.liveRk = rk;
      }
    } else this.liveRk = 0;
  }
  // bir araba bitiş çizgisini geçti (bu ekranda)
  onCross(i, p, c, x) {
    const v = this.view, L = this.L, S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const first = this.finOrder.length === 1;
    const zf = L.zF;
    if (this.X) {
      if (first) {
        const CF = [[1, 0.82, 0.25], [1, 0.35, 0.4], [0.3, 0.86, 0.45], [0.3, 0.66, 1], [0.78, 0.5, 1]];
        this.burst(0, L.top + 0.32 * L.gs, zf, 46, CF, 1.5, 0.022, false, 1.7, 2.6);
      }
      this.burst(x, L.top + 0.04, zf - 0.05, 8, [[1, 1, 1], [0.95, 0.95, 0.9]], 0.4, 0.02, true, 0.4, 0.5);
    }
    setTimeout(() => { try { if (!this.dead) this.snd.fx('chute'); } catch { /* yok */ } }, 120);
    if (i === v.me) {
      fx('line');
      vibrate([30, 30, 60]);
      const place = this.finOrder.length;
      if (first) { setTimeout(() => { try { if (!this.dead) this.snd.fx('win'); } catch { /* yok */ } }, 260); this.flash('rgba(255,215,90,.55)', true); this.msg('🏁 BİRİNCİ!', 'mid gold'); }
      else { setTimeout(() => { try { if (!this.dead) this.snd.fx('place'); } catch { /* yok */ } }, 260); this.msg(`🏁 ${place}.`, 'mid'); }
      try { this.snd.engine(false); } catch { /* yok */ }
    } else fx('lineO');
    void p; void c;
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view, L = this.L;
    if (!v || !L) return;
    const t = this.time, n = Math.max(1, this.seats.length);
    const cam = [this.cam.ex, this.cam.ey, this.cam.ez];
    const mid = [0, L.top, (L.zS + L.zF) / 2];
    const tree = [L.tx, TABLE_Y + treeY(L, 2), L.tz];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null, ph: hs(i, 3) * 6 };
      const S = a.idle;
      const c = this.carOf(p.id);
      const carW = [L.lx[i] ?? 0, L.top + 0.05, c.nose ?? L.zS];
      const live = v.phase === 'ready' || v.phase === 'race';
      if (live) {
        if (!p.in) { a.pose('lean', { t }); a.expr = 'smile'; a.look = mid; return; }
        if (c.fin) {
          const place = this.finOrder.indexOf(i) + 1;
          const u = t - c.finT;
          if (place === 1) { a.pose(u < 3 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = u < 1.2 ? carW : cam; }
          else { a.pose(u < 1.5 ? 'clap' : 'lean', { t }); a.expr = 'grin'; a.look = carW; }
          return;
        }
        // eller düğmenin üstünde: sırayla işaret parmağıyla basar
        a.pose('rest', { t });
        a.k = 42;
        const mine = i === v.me;
        S.ph += Math.PI * (mine ? 0 : c.rateV || 0) * dt;
        const bob = (c.rateV || 0) > 1 ? Math.sin(t * 13 + i) * 0.015 : 0;
        a.tgt.lean = (v.phase === 'race' ? 0.15 : 0.12) + bob;
        for (let j = 0; j < 2; j++) {
          const sx = j ? 1 : -1;
          let down;
          if (mine) { const u = t - this.tapT[j]; down = u >= 0 && u < 0.11 ? Math.sin(Math.PI * u / 0.11) : 0; }
          else down = (c.rateV || 0) > 0.6 ? Math.pow(Math.max(0, Math.sin(S.ph + j * Math.PI)), 3) : 0;
          a.tgt.hand[j] = this.wristFor(sx * (0.03 - 0.016 * down), j, lerp(0.07, -BTN_DIP + 0.002, down));
          a.tgt.fdir[j] = FDIR.slice(); a.tgt.palm[j] = [sx * 0.15, -1, 0.25]; a.tgt.fw[j] = 1;
          a.tgt.pole[j] = [sx * 0.85, -0.55, -0.25];
          a.shape[j] = 'point';
        }
        const ahead = this.finOrder.length === 0 && this.leaderIs(i);
        a.expr = v.phase === 'ready' ? 'tense' : (c.rateV || 0) > 9 ? 'wince' : ahead ? 'grin' : 'tense';
        a.look = v.phase === 'ready' ? tree : carW;
        return;
      }
      if (v.phase === 'result') {
        const u = this.time - (this.resT || 0);
        const res = v.res || [];
        const r = res.find((x) => x.i === i);
        const win = res.length && res[0].i === i && res[0].f != null;
        if (win) { a.pose(u < 2.5 || Math.floor(u / 2.2) % 2 === 0 ? 'cheer' : 'wave', { t }); a.expr = 'laugh'; a.look = cam; return; }
        if (r && r.f == null && p.in) { a.pose(u < 1.8 ? 'facepalm' : 'slump', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
        const w = res.length && res[0].f != null ? this.avatarAt(res[0].i) : null;
        const q = hs(i, v.round);
        a.pose(q < 0.5 ? 'clap' : q < 0.75 ? 'rest' : 'shrug', { t });
        a.expr = q < 0.75 ? 'smile' : 'sad';
        a.look = w ? w.headW : mid;
        return;
      }
      if (v.phase === 'final') {
        const win = (v.champ || []).includes(i);
        const u = this.time - (this.finT || 0);
        const w = this.champK >= 0 ? this.avatarAt(this.champK) : null;
        if (win) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = cam; }
        else { a.pose(Math.floor(u / 2.6 + i) % 3 === 0 ? 'rest' : 'clap', { t }); a.expr = 'grin'; a.look = w ? w.headW : mid; }
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
        S.look = r < 0.5 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? carW : cam;
        a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
      }
      if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = cam; }
      else { a.pose(S.mood, { t }); a.look = S.look; }
    });
  }
  leaderIs(i) {
    const p = this.seats[i];
    const c = p && this.cars.get(p.id);
    if (!c) return false;
    let best = -1;
    this.seats.forEach((q) => { const d = this.cars.get(q.id); if (d && q.in) best = Math.max(best, d.disp); });
    return c.disp > 0.5 && c.disp >= best - 0.01;
  }
  avTint(a, i) {
    const v = this.view, p = v?.seats?.[i];
    const want = p && (v.phase === 'ready' || v.phase === 'race') && !p.in ? 0.7 : 1;
    a.dimK = damp(a.dimK ?? 1, want, 3, 0.016);
    return a.dimK;
  }

  /* ---------- kamera, ışıklar, ses ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const L = this.lay();
    this.ensureTrack();
    // yeşil bu karede çiziliyor: süre başlar
    if (this.goPending && v.phase === 'race') { this.goPending = false; this.goStart = performance.now(); this.goFor = this.rkey(); vibrate(30); }
    const sNow = this.ctx.serverNow();
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    // sarı ışıklar
    if (v.phase === 'ready') {
      const el = sNow - (v.readyAt || 0);
      const nA = AMB.filter((a) => el >= a).length;
      if (nA > this.amb) {
        this.amb = nA;
        try { this.snd.fx('amber'); } catch { /* yok */ }
        if (v.amIn) this.msg(String(4 - nA), 'big');
        vibrate(12);
      }
    }
    // gönderilmemiş basışlar / kaybolan bildirim: yarış boyunca yeniden gönder
    const Lc = this.loc;
    if (Lc && v.phase === 'race' && Lc.key === this.rkey() && Lc.k > (v.myK || 0) && this.time - Lc.sentAt > 0.4) { Lc.sentK = -1; this.flush(); }
    this.stepCars(dt);
    // motor sesi (benim arabam)
    const S = this.snd;
    const myC = v.me >= 0 ? this.cars.get(v.seats[v.me]?.id) : null;
    this.revK = Math.max(0, this.revK - dt * 2.2);
    if (v.amIn && (v.phase === 'ready' || v.phase === 'race') && myC && !myC.fin) {
      try {
        S.engine(true);
        const ve = v.phase === 'ready' ? 2 + 20 * this.revK : 3 + Math.min(28, (myC.rateV || 0) * 2.3) + 6 * this.revK;
        const keep = S.int;
        S.engineSet(ve, false, false, true);
        S.int = keep;
      } catch { /* yok */ }
    } else if (S.eng) { try { S.engine(false); } catch { /* yok */ } }
    // müzik gerilimi
    let lead = 0;
    this.seats.forEach((p) => { const q = this.cars.get(p.id); if (q && p.in) lead = Math.max(lead, q.disp); });
    S.int = v.phase === 'ready' ? clamp((sNow - (v.readyAt || 0)) / (v.readyMs || 3400), 0, 1) : v.phase === 'race' ? clamp(lead / this.goal(), 0, 1) : 0;
    // kamera
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0, bp = 300, D0 = null;
    const hitH = Math.round(clamp(0.2 * (this.vh || 800), 110, 180));
    const stripView = v.phase === 'ready' || v.phase === 'race' || (v.phase === 'result' && this.time - (this.resT || 0) < 1.3);
    if (stripView) {
      const sc = this.stripCam(land, v.amIn ? hitH : 40, v.phase === 'race' || v.phase === 'result');
      pa = sc.pa; D0 = sc.D; fx = sc.T[0]; fy = sc.T[1] - 0.7; fz = sc.T[2]; bp = 150;
    } else if (v.phase === 'result') {
      bp = 150; zoom = 0.86; pa = 0.06;
      const res = v.res || [];
      const w = res.length && res[0].f != null ? res[0].i : -1;
      const a = w >= 0 ? this.avatarAt(w) : null;
      if (a) {
        const ang = this.seatAngle(w);
        const near = Math.sin(ang) > 0.35;
        yaw = near ? angDiff(-Math.PI / 2 - ang, 0) : 0;
        zoom = 0.42; pa = near ? -0.26 : -0.16;
        const f = this.aimAt(a.headW, land ? 0.4 : 0.5, land ? 0.45 : 0.36, yaw, pa);
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
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    if (land && !stripView && v.phase !== 'final' && v.phase !== 'result') {
      if (this.cfg.botPxL !== 34) { this.cfg.botPxL = 34; this.fitKey = ''; }
      const f = this.aimAt([0, 0.7, 0], 0.38, 0.5, yaw, pa); fx = f[0]; fy = f[1]; fz = f[2];
    }
    if (D0 != null && this.fitVal > 0) zoom = D0 / this.fitVal;
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.4, dt);
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
  // pist görünümü: tüm pist (çıkış ışıkları ve bitiş kemeri dahil) HUD ile vuruş düğmesi arasındaki boş alana sığsın
  stripCam(land, hitH, tight) {
    const L = this.L;
    const vw = this.vw || 360, vh = this.vh || 640;
    const key = `${L.key}|${Math.round(vw)}|${Math.round(vh)}|${hitH}|${tight ? 1 : 0}`;
    if (this.stripKey === key && this.stripVal) return this.stripVal;
    this.stripKey = key;
    const pa = land ? 0.02 : -0.02;
    const pitch = (land ? 0.78 : 0.98) + pa, fov = land ? 0.7 : 0.78, asp = vw / vh;
    const yTop = land ? 0.1 : 0.13, yBot = land ? 0.95 : 1 - (hitH + 30) / vh;
    const xL = land ? 0.03 : 0.04, xR = land ? 0.6 : 0.96;
    const sx = (xL + xR) / 2, sy = (yTop + yBot) / 2;
    const H = [0, TABLE_Y, 0];
    const pts = [[-L.hw, TABLE_Y, L.hl], [L.hw, TABLE_Y, L.hl], [-L.hw, TABLE_Y, -L.hl], [L.hw, TABLE_Y, -L.hl], [-L.hw - 0.02, TABLE_Y + 0.31 * L.gs, L.zF], [L.hw + 0.02, TABLE_Y + 0.31 * L.gs, L.zF], [L.tx, TABLE_Y + 0.4 * L.ts, L.tz]];
    // karşı taraftaki oyuncuların başları (ve isim etiketleri) da görünsün
    if (!tight) this.seats.forEach((p, i) => { const a = this.avatarAt(i); if (a && a.pos[2] < -0.35 * this.R * this.kz) pts.push([a.pos[0] * 0.92, 1.62, a.pos[2] * 0.97]); });
    const V = this.mats.TV, P = this.mats.TP, VP = this.mats.TVP;
    M.persp(P, fov, asp, 0.3, 120);
    const up = [0, Math.cos(pitch), -Math.sin(pitch)], rt = [1, 0, 0];
    const tgt = (D) => {
      const t = Math.tan(fov / 2) * D, dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
      return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy, H[2] - up[2] * dy + rt[2] * dx];
    };
    const ok = (D) => {
      const T = tgt(D);
      M.look(V, T[0], T[1] + Math.sin(pitch) * D, T[2] + Math.cos(pitch) * D, T[0], T[1], T[2]);
      M.mul(VP, P, V);
      for (const [x, y, z] of pts) {
        const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
        if (cw <= 0.3) return false;
        const qx = (cx / cw) * 0.5 + 0.5, qy = 1 - ((cy / cw) * 0.5 + 0.5);
        if (qx < xL || qx > xR || qy < yTop || qy > yBot) return false;
      }
      return true;
    };
    let lo = 1.2, hi = 60;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    this.stripVal = { D: hi, T: tgt(hi), pa };
    return this.stripVal;
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
  // ışık direğinde yanan ampuller: [satır, renk, parlaklık]
  bulbs() {
    const v = this.view;
    const out = [];
    if (!v) return out;
    const t = this.time;
    if (v.phase === 'ready') {
      const st = clamp((t - (this.readyT || t)) / 0.6, 0, 1);
      if (st > 0.5) out.push([0, WHITE3, 0.9]);
      for (let k = 0; k < this.amb; k++) out.push([1 + k, AMBER3, 1]);
    } else if (v.phase === 'race') { out.push([0, WHITE3, 0.7]); out.push([4, GREEN3, 1]); }
    else if (v.phase === 'result') out.push([5, RED3, 0.85]);
    else if (v.phase === 'intro') out.push([0, WHITE3, 0.55 + 0.25 * Math.sin(t * 2)]);
    return out;
  }
  sceneGame(D, shadow) {
    const Wd = this.W, L = this.L;
    if (!Wd || !L || !Wd.tb) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T, v = this.view;
    M.set(m, 0, TABLE_Y, 0);
    D(Wd.tb, m, T.obj);
    D(Wd.kerb, m, T.obj);
    D(Wd.tires, m, T.obj);
    D(Wd.gantry, m, T.obj);
    D(Wd.tree, m, T.obj);
    // bayraklar (kemerin tepesinde dalgalanır)
    for (const s of [-1, 1]) {
      M.set(m, s * (L.hw + 0.016), TABLE_Y + 0.3 * L.gs + 0.02, L.zF, Math.sin(this.time * 3.1 + s) * 0.35, 0, 0, s * L.gs, L.gs, L.gs);
      D(Wd.flag, m, T.obj);
    }
    // yanan ampuller
    if (!shadow) {
      const tint = this.bT || (this.bT = new Float32Array(3));
      for (const [r, col, k] of this.bulbs()) for (const cc of [-1, 1]) {
        const rr = (r === 0 ? 0.0082 : 0.0112) * L.ts;
        M.set(m, L.tx + cc * 0.017 * L.ts, TABLE_Y + treeY(L, r), L.tz + 0.0115 * L.ts, 0, 0, 0, rr, rr, rr);
        tint[0] = col[0] * (0.5 + k); tint[1] = col[1] * (0.5 + k); tint[2] = col[2] * (0.5 + k);
        D(Wd.bulbE, m, tint, 1, 1);
      }
    }
    // arabalar
    if (v) {
      const tint = this.cT || (this.cT = new Float32Array(3));
      const tmp = this.tmpM || (this.tmpM = M.make());
      this.seats.forEach((p, i) => {
        const c = this.cars.get(p.id);
        if (!c || c.nose == null) return;
        const live = v.phase === 'ready' || v.phase === 'race' || v.phase === 'result';
        if (live && !p.in) return;
        const x = L.lx[i] ?? 0, cs = L.cs;
        const bob = (c.rateV || 0) > 0.5 && !c.fin ? Math.sin(this.time * 47 + c.ph) * 0.0015 * cs : 0;
        const rz = c.nose + NOSE * cs;
        M.set(mc, x, L.top + bob, rz, 0, c.pitch, 0, cs);
        const col = hexRGB(pcol(p.c));
        const dim = p.on === 0 ? 0.5 : 1;
        tint[0] = col[0] * dim; tint[1] = col[1] * dim; tint[2] = col[2] * dim;
        D(Wd.body, mc, tint);
        D(Wd.parts, mc, T.obj);
        M.set(tmp, 0, RR, 0, 0, c.rot, 0, 1);
        D(Wd.wR, M.mul(this.mats.a, mc, tmp), T.obj);
        M.set(tmp, 0, RF, FZ, 0, c.rot * (RR / RF), 0, 1);
        D(Wd.wF, M.mul(this.mats.a, mc, tmp), T.obj);
        if (c.chute > 0) {
          const k = easeOut(c.chute);
          M.set(tmp, Math.sin(this.time * 4 + c.ph) * 0.01, 0.055, 0.068, Math.sin(this.time * 3 + c.ph) * 0.12, Math.sin(this.time * 2.3 + c.ph) * 0.05, 0, 0.25 + 0.75 * k, 0.25 + 0.75 * k, 0.15 + 0.85 * k);
          const cm = M.mul(this.mats.a, mc, tmp);
          D(Wd.chute, cm, tint);
          D(Wd.chuteW, cm, T.obj);
        }
      });
    }
    // oyuncuların düğmeleri
    if (!shadow && v && (v.game || v.phase !== 'intro')) {
      const tint = this.btT || (this.btT = new Float32Array(3));
      const live = v.phase === 'ready' || v.phase === 'race';
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        const b = this.seatW(a, 0, TABLE_Y + 0.002, BTN_Z);
        M.set(mc, b[0], b[1], b[2], a.yaw, 0, 0, 1);
        D(Wd.btnB, mc, T.obj);
        const col = hexRGB(pcol(p.c));
        const c = this.cars.get(p.id);
        let press = 0;
        if (live && p.in && c && !c.fin) {
          if (i === v.me) { for (let j = 0; j < 2; j++) { const u = this.time - this.tapT[j]; if (u >= 0 && u < 0.11) press = Math.max(press, Math.sin(Math.PI * u / 0.11)); } }
          else { const ph = a.idle ? a.idle.ph : 0; if ((c.rateV || 0) > 0.6) press = Math.max(Math.pow(Math.max(0, Math.sin(ph)), 3), Math.pow(Math.max(0, Math.sin(ph + Math.PI)), 3)); }
        }
        const fin = c && c.fin && (v.phase === 'race' || v.phase === 'result');
        M.set(mc, b[0], b[1] + 0.034 + 0.006 - press * BTN_DIP, b[2], a.yaw, 0, 0, 1);
        if (press > 0.3 || fin) {
          const k = fin ? 0.6 + 0.25 * Math.sin(this.time * 6) : 0.7 + 0.6 * press;
          const c3 = fin && this.finOrder[0] === i ? GOLD3 : col;
          tint[0] = c3[0] * k; tint[1] = c3[1] * k; tint[2] = c3[2] * k;
          D(Wd.capE, mc, tint, 1, 1);
        } else {
          tint[0] = col[0] * 0.8; tint[1] = col[1] * 0.8; tint[2] = col[2] * 0.8;
          D(Wd.cap, mc, live && !p.in ? [0.32, 0.3, 0.3] : tint);
        }
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
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.tt || !this.trTex) return;
    const m = this.mats.b;
    gl.uniform1f(X.tex.u.uSelf, 0.12);
    gl.bindTexture(gl.TEXTURE_2D, this.trTex);
    M.set(m, 0, TABLE_Y, 0);
    drawMesh(X, Wd.tt, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  // kameraya dönük parıltı
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    const yaw = Math.atan2(cv[0], cv[2]), pit = Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]);
    M.set(m, p[0], p[1], p[2], yaw, pit, 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const X = this.X, v = this.view, L = this.L;
    if (!v || !this.W || !L) return;
    // arabaların ışık izi: şerit, çıkış çizgisinden arabaya kadar oyuncunun renginde yanar (kim nerede, bir bakışta)
    if (this.W.trail && v.phase !== 'intro' && v.phase !== 'final') {
      const tc = this.trT || (this.trT = new Float32Array(3));
      this.seats.forEach((p, i) => {
        const c = this.cars.get(p.id);
        if (!c || c.nose == null || !p.in) return;
        const len = L.zS - c.nose;
        if (len < 0.02) return;
        const col = hexRGB(pcol(p.c));
        const k = (c.fin ? 0.7 : 0.95 + 0.6 * clamp((c.rateV || 0) / 10, 0, 1)) * (p.on === 0 ? 0.4 : 1);
        tc[0] = col[0] * k; tc[1] = col[1] * k; tc[2] = col[2] * k;
        M.set(m, L.lx[i] ?? 0, L.top + 0.0025, c.nose, 0, 0, 0, L.lw * 0.86, 1, len);
        drawMesh(X, this.W.trail, m, tc, 0.55);
      });
    }
    // ampullerin parıltısı
    for (const [r, col, k] of this.bulbs()) {
      for (const cc of [-1, 1]) this.glow(m, [L.tx + cc * 0.017 * L.ts, TABLE_Y + treeY(L, r), L.tz + 0.02 * L.ts], (r === 0 ? 0.05 : 0.075) * L.ts, col, 0.75 * k);
      if (r === 4) { M.set(m, L.tx - 0.05, L.top + 0.003, L.tz + 0.04, 0, 0, 0, 0.42, 1, 0.42); drawMesh(X, this.res.glow, m, col, 0.25); }
    }
    // egzoz alevleri: hızla basanların egzozundan
    const t = this.time;
    this.seats.forEach((p, i) => {
      const c = this.cars.get(p.id);
      if (!c || c.nose == null || c.fin) return;
      const rv = c.rateV || 0;
      const rev = i === v.me ? Math.max(0, 1 - (t - (c.puffT || -9)) / 0.18) : 0;
      const k = clamp((rv - 2) / 9, 0, 1) * (v.phase === 'race' ? 1 : 0) + rev * 0.8;
      if (k <= 0.02) return;
      const x = L.lx[i] ?? 0, cs = L.cs, rz = c.nose + NOSE * cs;
      for (const s of [-1, 1]) {
        const fl = 0.7 + 0.3 * Math.sin(t * 53 + c.ph + s);
        const p0 = [x + s * 0.056 * cs, L.top + (0.085 + 0.012 * k) * cs, rz - 0.1 * cs];
        this.glow(m, p0, (0.03 + 0.03 * k) * cs * fl, [1, 0.55, 0.15], 0.55 * k);
        this.glow(m, p0, (0.014 + 0.012 * k) * cs, [0.5, 0.65, 1], 0.6 * k);
      }
    });
    // bitiş çizgisinin parlaması (ilk geçişte)
    if (this.finOrder.length && v.phase !== 'intro') {
      const first = this.seats[this.finOrder[0]];
      const fc = first && this.cars.get(first.id);
      const u = fc ? t - fc.finT : 9;
      if (u < 1.2) { M.set(m, 0, L.top + 0.004, L.zF - 0.03, 0, 0, 0, L.ws * 0.65, 1, 0.22); drawMesh(X, this.res.glow, m, [1, 0.95, 0.75], 0.6 * (1 - u / 1.2)); }
    }
    // kazananın / şampiyonun koltuğu
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      let al = 0;
      const res = v.res || [];
      if (v.phase === 'result' && res.length && res[0].i === i && res[0].f != null) al = 0.65 + 0.2 * Math.sin(t * 5);
      else if (v.phase === 'final' && (v.champ || []).includes(i)) al = 0.7 + 0.2 * Math.sin(t * 5);
      if (al <= 0) return;
      M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 0.95, 1, 0.95);
      drawMesh(X, this.res.glow, m, GOLD3, al * 0.6);
    });
  }

  /* ---------- arayüz ---------- */
  // Alt çubuk: durum satırı + büyük basma düğmesi (yarış boyunca aynı öğe; görünümü değişir) ya da yarış sonucu kartı
  bar() {
    const v = this.view;
    if (!v) return;
    const live = v.phase === 'ready' || v.phase === 'race';
    let mode = 'none', res = '';
    if (live) mode = v.amIn ? 'hit' : 'watch';
    else if (v.phase === 'result') {
      const rk = v.res || [];
      const meId = v.seats[v.me]?.id;
      const nm = (i) => esc(v.seats[i]?.n || '');
      let cls = '', big = '';
      const w = rk[0];
      if (w && w.f != null) {
        cls = 'win';
        big = w.i === v.me ? `🏁 Kazandın! <b>${sec(w.f)} sn</b>` : `🏁 ${nm(w.i)} kazandı! <b>${sec(w.f)} sn</b>`;
      } else { cls = 'none'; big = rk.some((r) => r.k > 0) ? '⏱️ Kimse bitişe ulaşamadı' : '😴 Kimse düğmeye basmadı'; }
      const chips = rk.slice(0, 6).map((r, k) => `<span class="${v.seats[r.i]?.id === meId ? 'me' : ''}${r.f == null ? ' dnf' : ''}">${k + 1}. ${nm(r.i)} <b>${r.f != null ? sec(r.f) : `${r.k}/${v.goal || GOAL0}`}</b></span>`).join('');
      const mine = rk.find((r) => r.i === v.me);
      const q = v.last ? '🏆 Son yarıştı, kupa geliyor!' : mine ? (mine.pts ? `+${mine.pts} puan · sıradaki yarış birazdan` : 'Bu yarış puan yok · sıradaki yarış birazdan') : 'Sıradaki yarış birazdan';
      res = `<div class="pr-res ${cls}"><div class="big">${big}</div>${chips ? `<div class="rk">${chips}</div>` : ''}<div class="q">${q}</div></div>`;
      mode = 'res';
    }
    const key = `${v.game}|${v.round}|${mode}|${res}`;
    if (this.setBar(key, mode === 'hit' ? '<button class="pr-hit ready" data-hit aria-label="Bas"><span class="pg"></span><span class="e"></span><span class="t"></span><span class="s"></span></button>' : mode === 'watch' ? '<div class="pr-st" data-st></div>' : res)) {
      this.stEl = this.el.bar.querySelector('[data-st]');
      this.hitEl = this.el.bar.querySelector('[data-hit]');
      this.hitK = '';
      this.stK = null;
    }
    this.hitNow();
    if (this.stEl) {
      const st = mode === 'watch' ? '👀 Bu yarışı izliyorsun, sonrakinde sen de varsın' : `${v.round}/${v.rounds || 3}. yarış <i>·</i> ${v.goal || GOAL0} basışta bitiş`;
      if (st !== this.stK) { this.stK = st; this.stEl.innerHTML = st; }
    }
  }
  // basma düğmesinin içeriği (her basışta hemen güncellenir)
  hitNow() {
    const v = this.view, el = this.hitEl;
    if (!v || !el || !el.isConnected) return;
    const goal = this.goal();
    const L = this.loc && this.loc.key === this.rkey() ? this.loc : null;
    let st = 'ready', e = '🚦', tx = 'HAZIR', sub = 'Yeşil yanınca durmadan bas!', pg = 0;
    if (v.phase === 'ready') {
      if (this.amb > 0) { e = ''; tx = String(4 - this.amb); }
      sub = 'Yeşil yanınca durmadan bas!';
    } else if (v.phase === 'race') {
      const k = Math.max(L ? L.k : 0, v.myK || 0);
      const fin = (L && L.fin != null) || v.myF != null;
      if (fin) {
        const f = v.myF ?? L.fin;
        const pl = this.finOrder.indexOf(v.me) + 1;
        st = 'done'; e = '🏁'; tx = `${pl > 0 ? pl + '. · ' : ''}${sec(f)}<small>sn</small>`; sub = 'Diğerleri bekleniyor…'; pg = 1;
      } else if (this.goFor !== this.rkey()) { st = 'go'; e = ''; tx = 'BAS!'; sub = ''; }
      else {
        st = 'go'; e = ''; tx = `${k}<small>/${goal}</small>`; pg = k / goal;
        const r = this.myRate();
        sub = k < 3 ? 'BAS! BAS! BAS!' : r > 0.5 ? `⚡ saniyede ${r.toFixed(1).replace('.', ',')} basış` : 'Durma, bas!';
      }
    }
    const hk = st + '|' + e + '|' + tx + '|' + sub;
    if (hk !== this.hitK) {
      this.hitK = hk;
      el.className = `pr-hit ${st}`;
      el.children[1].textContent = e;
      el.children[2].innerHTML = tx;
      el.children[3].textContent = sub;
    }
    el.children[0].style.width = `${Math.round(pg * 100)}%`;
  }
  modeSeg(v) {
    return `<div class="pr-seg" role="group" aria-label="Oyun uzunluğu"><button data-act="pr-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">🏁 3 yarış</button><button data-act="pr-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🔥 5 yarış</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n >= 2}`;
      html = `<div class="card pr-in">
        <div class="tt">👆 Parmak Yarışı</div>
        <div class="sub">Işıklar yeşile dönünce düğmeye durmadan bas!</div>
        <div class="pr-ru"><div class="a"><b>🚦</b>Sarı ışıklarda bekle</div><div class="g"><b>👆</b>Yeşilde durmadan bas</div><div class="y"><b>🏁</b>Bitişe ilk varan kazanır</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="pr-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'Oynamak için masada en az 2 kişi lazım. Oda kodunu paylaş!' : `Her basış arabanı ileri iter, ${v.goal || GOAL0}. basışta bitiş çizgisindesin.`}</div>
      </div>`;
    } else if (v.phase === 'final' && this.finCard()) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const sb = v.scoreboard || [];
      const meId = v.seats[v.me]?.id;
      const ch = (v.champ || []).map((i) => v.seats[i]).filter(Boolean);
      const mine = ch.some((p) => p.id === meId);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}|${sb.map((s) => s.id + s.score).join(',')}`;
      const tt = !ch.length ? 'Oyun bitti!' : `🏆 ${mine ? 'En hızlı parmak sensin!' : `${esc(ch[0].n)} kazandı!`}`;
      const best = sb.filter((s) => s.best != null).sort((a, b) => a.best - b.best)[0];
      const list = sb.map((s) => ({ id: s.id, nickname: s.nickname, c: s.c, tag: `${s.score} puan` }));
      const rest = list.slice(3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${k + 4}. ${esc(s.nickname)} <b>${esc(s.tag)}</b></span>`).join('');
      const top3 = list.slice(0, 3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${['🥇', '🥈', '🥉'][k]} ${esc(s.nickname)} <b>${esc(s.tag)}</b></span>`).join('');
      html = `<div class="card">
        <div class="tt">${tt}</div>
        <div class="sub">${best ? `⚡ En hızlı yarış: ${esc(best.nickname)} · ${sec(best.best)} sn` : 'Bu oyunda kimse bitişe ulaşamadı'}</div>
        ${podium(list, meId)}
        <div class="pr-rest pr-top3">${top3}</div>
        ${rest ? `<div class="pr-rest">${rest}</div>` : ''}
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="pr-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    let top = '';
    if (v.phase === 'race') top = `${v.round}/${v.rounds || 3}. yarış · ${(Math.max(0, this.ctx.serverNow() - (v.goAt || 0)) / 1000).toFixed(1).replace('.', ',')} sn`;
    else if (v.phase === 'ready' || v.phase === 'result') top = `${v.round}/${v.rounds || 3}. yarış`;
    this.top(top);
    // etiketler: toplam puan, yarıştaki basış sayısı ya da bitiş süresi
    const live = v.phase === 'ready' || v.phase === 'race' || v.phase === 'result';
    const goal = this.goal();
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = p.sc ? `<span class="pr-sc">⭐${p.sc}</span>` : '';
      const c = this.cars.get(p.id);
      if (live && p.in && v.phase !== 'ready') {
        const mine = i === v.me && this.loc && this.loc.key === this.rkey() ? this.loc : null;
        const f = p.f != null ? p.f : mine && mine.fin != null ? mine.fin : null;
        if (f != null) { const pl = this.finOrder.indexOf(i) + 1; x += `<span class="pr-k f">${pl === 1 ? '🥇' : pl === 2 ? '🥈' : pl === 3 ? '🥉' : '🏁'} ${sec(f)}</span>`; }
        else { const k = mine ? Math.max(mine.k, p.k || 0) : Math.round(Math.min(goal, c ? c.disp : p.k || 0)); x += `<span class="pr-k">${k}</span>`; }
      }
      if (v.phase === 'final' && (v.champ || []).includes(i)) x += '👑';
      if (o.prK !== x) {
        o.prK = x;
        let el = o.lbl.querySelector('.pr-x');
        if (!el) { el = document.createElement('span'); el.className = 'pr-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.pr-x')) o.prK = '';
  }
  // "SEN" işareti kendi arabamın üstünde
  placeLbls() {
    super.placeLbls();
    const v = this.view, L = this.L, el = this.meEl;
    // yarışta kendi etiketim düğmenin arkasında kalıyor: arabamın üstündeki "SEN" yeter
    const mine = v && v.me >= 0 ? this.lbl.get(v.seats[v.me]?.id) : null;
    if (mine && v.amIn && (v.phase === 'ready' || v.phase === 'race')) mine.lbl.style.display = 'none';
    if (!el) return;
    let show = false;
    if (v && L && v.amIn && v.me >= 0 && (v.phase === 'ready' || v.phase === 'race')) {
      const c = this.cars.get(v.seats[v.me]?.id);
      if (c && c.nose != null) {
        const q = this.project(L.lx[v.me] ?? 0, L.top + 0.2 * L.cs, c.nose + NOSE * L.cs * 0.5);
        if (q) { show = true; el.style.transform = `translate(${Math.round(q[0] - el.offsetWidth / 2)}px,${Math.round(q[1] - el.offsetHeight - 6)}px)`; }
      }
    }
    el.style.display = show ? 'block' : 'none';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view, L = this.L;
    if (!v || !L) return;
    const n = this.seats.length || 1;
    const cx = w / 2, top = h * 0.46 - r * 0.55, bot = h * 0.46 + r * 0.55, sw = Math.min(r * 1.1, n * 26);
    g.fillStyle = '#3b3d43';
    g.fillRect(cx - sw / 2, top, sw, bot - top);
    g.fillStyle = '#fff';
    g.fillRect(cx - sw / 2, bot - 8, sw, 3);
    for (let k = 0; k < Math.ceil(sw / 8); k++) { g.fillStyle = k % 2 ? '#111' : '#eee'; g.fillRect(cx - sw / 2 + k * 8, top + 4, 8, 6); }
    const goal = this.goal();
    L.idx.forEach((si, j) => {
      const p = this.seats[si];
      const c = p && this.cars.get(p.id);
      if (!p) return;
      const x = cx - sw / 2 + (j + 0.5) * (sw / n);
      const pr = c ? (c.fin ? 1.04 : c.disp / goal) : 0;
      const y = bot - 12 - pr * (bot - top - 26);
      g.fillStyle = pcol(p.c);
      g.fillRect(x - 6, y - 10, 12, 20);
    });
  }
  onDispose() {
    this.freeTex();
    clearTimeout(this.flushT);
    window.removeEventListener('keydown', this.onKey);
    try { this.snd.engine(false); } catch { /* yok */ }
  }
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
    if (!G || G.dead) G = new RaceGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[pry]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
