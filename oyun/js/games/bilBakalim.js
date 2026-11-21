// Bil Bakalım — 3D bilgi yarışması stüdyosu (NFC Dünyası Oyun)
// Masanın ortasında ışıklı bir sahne var: dört kürsünün üstünde dört şık döner (kırmızı ▲, sarı ●, yeşil ■, mavi ◆),
// ortada altın bir soru işareti süzülür, sahnenin kenarındaki 15 lamba saniye saniye söner. Herkes cevabını kilitleyince
// önündeki zil yanar ve üstünde rengi kendisine ait bir ışık topu belirir (seçimi gizli). Açılışta toplar en hızlıdan
// başlayarak seçilen şıkka uçar, doğru şık parlar, yanlışlar söner, bilenlerin başında puan çıkar. Sonda sahneden puan
// kuleleri yükselir, birincinin kulesinde kupa. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D.
import { _masa } from './masa3d.js?v=2026-11-21-g';
import * as sfx from '../sfx.js?v=2026-11-21-g';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb } = E;
void sfx;

const OPT = [
  { hex: '#ff4f5e', sh: '▲' },
  { hex: '#ffc531', sh: '●' },
  { hex: '#2fbf71', sh: '■' },
  { hex: '#3a86ff', sh: '◆' },
];
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const OPTC = OPT.map((o) => o.hex);
const OPT3 = OPTC.map((h) => new Float32Array(rgb3(h)));
const DIM3 = OPT3.map((c) => new Float32Array([0.22 + c[0] * 0.22, 0.22 + c[1] * 0.22, 0.26 + c[2] * 0.22]));
const GRID = [[-1, -1], [1, -1], [-1, 1], [1, 1]];   // A sol arka, B sağ arka, C sol ön, D sağ ön (alttaki düğmelerle aynı düzen)
// sahne ölçüleri (ölçek 1'de; masa küçükse ya da yatay ekranda sahne birlikte küçülür: this.ss)
const GX = 0.56, GZ = 0.44;                           // kürsülerin merkezden uzaklığı
const STG_R = 1.05, STG_H = 0.045;                    // sahne yarıçapı, yüksekliği
const PED_H = 0.2, SHP_Y = 0.29, SHP_S = 0.25;       // kürsü boyu, şeklin kürsüden yüksekliği, şekil ölçeği
const LED_N = 15, LED_R = 0.985;
const ORB_R = 0.062, RING_R = 0.34;
const FLY_T0 = 0.35, FLY_GAP = 0.09, FLY_S = 0.6, VERD_PAD = 0.25;
const GOLD3 = new Float32Array([1, 0.82, 0.3]), SILV3 = new Float32Array([0.84, 0.87, 0.95]), BRNZ3 = new Float32Array([0.86, 0.55, 0.3]);
const GREEN3 = new Float32Array([0.24, 0.9, 0.45]), RED3 = new Float32Array([1, 0.3, 0.32]), GREY3 = new Float32Array([0.42, 0.43, 0.5]);
const WHITE3 = new Float32Array([1, 1, 1]), OFF3 = new Float32Array([0.16, 0.17, 0.26]);
const MEDAL = [GOLD3, SILV3, BRNZ3];
const STUDIO_L = { sunC: [0.46, 0.46, 0.58], sky: [0.4, 0.4, 0.55], gnd: [0.18, 0.17, 0.25], night: 1, warm: [0.96, 0.9, 1], lampC: [1.42, 1.26, 1.16], fogR: [30, 90], stars: 0, glowS: 0.32 };

const STYLE = `
#ky.bil .msg{top:13%}
#ky.bil .bb-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#f6f4ff;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.bil .bb-q{border-radius:16px;background:#232a6b;color:#fff;padding:6px 12px 8px;border:3px solid var(--ink)}
#ky.bil .bb-q small{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;font-weight:900;letter-spacing:.07em;opacity:.92}
#ky.bil .bb-q small .x2{background:#ffd23f;color:#1c1633;border-radius:99px;padding:0 8px;letter-spacing:.02em}
#ky.bil .bb-q b{display:block;font-size:clamp(16px,4.5vw,20px);font-weight:900;line-height:1.22;margin-top:2px;text-wrap:balance;overflow-wrap:anywhere}
#ky.bil .bb-four{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
#ky.bil .bb-o{position:relative;display:flex;align-items:center;gap:7px;min-width:0;min-height:52px;border:3px solid var(--ink);border-radius:15px;box-shadow:3px 3px 0 var(--ink);padding:6px 8px;font-weight:900;font-size:clamp(14px,4vw,16.5px);line-height:1.15;background:var(--sc);color:#1c1633;text-align:left;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow-wrap:anywhere;transition:opacity .2s,filter .2s}
#ky.bil .bb-o .sh{flex:0 0 auto;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#1c1633;color:var(--sc);font-size:14px;line-height:1}
#ky.bil .bb-o .tx{flex:1;min-width:0}
#ky.bil .bb-o .tg{position:absolute;right:-5px;top:-10px;background:#1c1633;color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 0 0 2px #fff}
#ky.bil .bb-o .dots{display:flex;flex-wrap:wrap;gap:2px;max-width:46px;justify-content:flex-end;flex:0 0 auto}
#ky.bil .bb-o .dots i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.bil .bb-o:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.bil .bb-o.on{outline:4px solid #1c1633;outline-offset:2px;transform:translateY(-2px)}
#ky.bil .bb-o.off{filter:saturate(.35) brightness(1.08);opacity:.62}
#ky.bil .bb-o.cut{filter:grayscale(1);opacity:.32}
#ky.bil .bb-o.cut .tx{text-decoration:line-through}
#ky.bil .bb-o.ok{outline:4px solid #2fbf71;outline-offset:2px;transform:translateY(-2px)}
#ky.bil .bb-o.ok .tg{background:#2fbf71;color:#1c1633}
#ky.bil .bb-o.no .tg{background:#d7263d}
#ky.bil .bb-o.dim{filter:saturate(.4) brightness(1.05);opacity:.5}
#ky.bil .bb-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800;min-height:26px}
#ky.bil .bb-ft .n{background:#232a6b;color:#fff;border-radius:99px;padding:2px 9px}
#ky.bil .bb-ft .z{opacity:.75}
#ky.bil .bb-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:6px 12px;font-weight:900;font-size:14px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.bil .bb-b.jk{background:#b79cff;padding:3px 10px;min-height:34px;font-size:13px;border-width:2px;box-shadow:2px 2px 0 var(--ink)}
#ky.bil .bb-b[disabled]{opacity:.45;filter:grayscale(.6)}
#ky.bil .bb-b:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.bil .bb-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.bil .bb-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:transform .15s linear,background .3s}
#ky.bil .bb-res{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;min-height:28px;font-weight:900;font-size:clamp(16px,4.6vw,20px)}
#ky.bil .bb-res .g{color:#13894a}
#ky.bil .bb-res .r{color:#c21f33}
#ky.bil .bb-res .m{opacity:.7}
#ky.bil .bb-res em{font-style:normal;font-size:12.5px;font-weight:900;border-radius:99px;padding:1px 8px;background:#ffd23f;color:#1c1633}
#ky.bil .bb-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;font-weight:800}
#ky.bil .bb-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.bil .bb-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.bil .bb-rk span.me{background:#fff4c2}
#ky.bil .bb-row{display:flex;gap:8px;justify-content:center;margin-top:7px}
#ky.bil .bb-s{font-size:12.5px;font-weight:700;opacity:.75;margin-top:6px;text-wrap:balance}
#ky.bil .lbl .bb-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.bil .lbl .bb-x:empty{display:none}
#ky.bil .lbl .bb-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#232a6b;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.bil .lbl.me .bb-sc{background:#1c1633}
#ky.bil .lbl .bb-v{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:50%;color:#fff;font-weight:900;font-size:.8em;line-height:1;border:1.5px solid #1c1633}
#ky.bil .lbl .bb-v.y{background:#2fbf71}
#ky.bil .lbl .bb-v.n{background:#d7263d}
#ky.bil .lbl .bb-f{font-size:.85em;font-weight:900;color:#ff8a1c}
#ky.bil .bb-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.bil .bb-pt.go{animation:bbpt 2.3s ease-out forwards}
#ky.bil .bb-pt.fix{opacity:1;color:#fff;font-size:clamp(12px,3.3vw,16px);-webkit-text-stroke:4px #1c1633}
#ky.bil .bb-pt.fix.g{color:#ffd23f}
@keyframes bbpt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.bil .card .bb-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.bil .card .bb-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.bil .card .bb-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.bil .card .bb-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.bil .card .bb-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.bil .card .bb-seg button.on{background:var(--ink);color:#fff}
#ky.bil .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.bil .card .bb-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.bil .card .bb-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.bil .card .bb-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.bil .card .bb-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.bil .card .bb-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.bil .card .bb-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.bil .card .bb-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.bil .card .bb-aw div:only-child{grid-column:1/-1}
#ky.bil .card .bb-aw div b{font-size:18px;flex:0 0 auto}
#ky.bil .card .bb-aw div span{flex:1;min-width:0;font-size:12px}
#ky.bil .card .bb-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.bil .card .bb-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.bil .card .bb-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.bil .card .bb-tb>div.me{background:#fff4c2}
#ky.bil .card .bb-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.bil .card .bb-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.bil .card .bb-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.bil .card .bb-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.bil .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.bil .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.bil .bb-box{width:min(470px,54vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.bil .bb-q{padding:4px 10px 6px}#ky.bil .bb-q b{font-size:15px}
#ky.bil .bb-o{min-height:44px;padding:5px 7px;font-size:14px}
#ky.bil .bb-four{margin-top:6px;gap:6px}
#ky.bil .bb-ft{margin-top:5px}
#ky.bil .bb-res{margin-top:5px;font-size:16px;min-height:22px}
#ky.bil .bb-tm{margin-top:5px}
#ky.bil .card .bb-tb{max-height:20vh}
#ky.bil .card .bb-ru{margin-top:6px}#ky.bil .card .bb-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.bil .card .bb-ru div b{font-size:17px}
#ky.bil .card .bb-seg{margin-top:6px}#ky.bil .card .bb-seg button{padding:6px 4px}
#ky.bil .card .bb-pod{display:none}
#ky.bil .card .bb-aw{margin-top:6px}
#ky.bil .card .bb-tb{max-height:24vh}
#ky.bil .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.bil .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, sonuç, final): yarışma programı jeneriği (Do majör, 124 bpm): bando vuruşları, el çırpma, vibrafon.
// 'race' (soru): düşünme müziği (La minör, 120 bpm): saat tıkırtısı, kalp atışı gibi davul, 16'lık arpej, alçak pad.
// 'mute' (toplar şıklara uçarken): müzik susar, davul gümbürtüsü çalar.
class BbSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 120 : 124; }
  swing() { return this.mode === 'race' ? 0 : 0.06; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // Am – F – G – E
      const CH = [[45, [69, 72, 76]], [41, [69, 72, 77]], [43, [67, 71, 74]], [40, [68, 71, 76]]];
      const [root, ch] = CH[bar % 4];
      if (s === 0 || s === 8) this.iKick(t, 0.085, 92, 42, 0.18);
      if (s === 3 || s === 11) this.iKick(t, 0.045, 88, 42, 0.12);
      if (s % 4 === 0) this.iTick(t, 0.03); else if (s % 2 === 0) this.iTick(t, 0.011);
      const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
      this.iPluck(t, ch[ARP[s % 8]] - 12 + (s >= 12 && bar % 2 ? 12 : 0), 0.032, st * 0.9, 'square', 1500, 0.1);
      if (s === 0) this.iBass(t, root - 12, spb * 1.9, 0.095, 'saw', 560);
      if (s === 8) this.iBass(t, root - 12 + (bar % 4 === 3 ? 4 : 0), spb * 1.6, 0.075, 'saw', 560);
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((m) => m - 12), spb * 8, 0.017, 1000, 0.3);
      if (s === 14 && bar % 4 === 3) this.iBell(t, 88, 0.012, spb, 0.3);
      return;
    }
    // C – Am – F – G
    const CH = [[36, [64, 67, 72]], [33, [64, 69, 72]], [41, [65, 69, 72]], [43, [65, 67, 71]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0 || s === 8 || s === 10) this.iKick(t, 0.09, 110, 46, 0.16);
    if (s === 4 || s === 12) { this.iClap(t, 0.05); this.iSnare(t, 0.035); }
    if (s % 2 === 1) this.iHat(t, 0.013);
    if ([0, 3, 6, 8, 11, 14].includes(s)) this.iBass(t, (s === 6 || s === 14 ? root + 7 : root) - 12, spb * 0.42, 0.1, 'up');
    if (s === 6 || s === 14) ch.forEach((m, k) => this.iBrass(t + k * 0.004, m, st * 1.3, 0.026, 0.12));
    const MEL = [[76, null, 79, null, 84, null, 79, 81], [79, null, 76, null, 72, null, 76, null], [77, null, 81, null, 84, 86, null, 84], [83, null, 79, null, 77, null, 74, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null) this.iVibe(t, m, 0.045, st * 3, 0.3);
    if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((x) => x - 12), spb * 8, 0.01, 1300, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'q': // yeni soru: "da-ding!"
        this.tone(784, t, 0.12, 'triangle', 0.07, null, 0.002);
        this.iBell(t + 0.11, 91, 0.05, 0.9, 0.3);
        this.tone(1568, t + 0.11, 0.35, 'sine', 0.05, null, 0.002);
        break;
      case 'double': // son soru: çift puan
        this.duck(0.2, 1.6);
        [[67, 0, 0.12], [72, 0.13, 0.12], [76, 0.26, 0.12], [79, 0.39, 0.55]].forEach(([m, d, L]) => this.iBrass(t + d, m, L, 0.06, 0.15));
        break;
      case 'lock': { // cevabım kilitlendi (a: şık 0..3 → ton)
        const f = [523, 587, 659, 784][a | 0] || 523;
        this.tone(140, t, 0.07, 'sine', 0.16, 70, 0.001);
        this.noise(t, 0.03, 0.08, { type: 'bandpass', freq: 1800, q: 1.2 });
        this.tone(f, t + 0.03, 0.1, 'triangle', 0.07, null, 0.002);
        this.tone(f * 1.5, t + 0.09, 0.16, 'triangle', 0.05, null, 0.002);
        break;
      }
      case 'peer': // başkası cevapladı
        this.tone(1250, t, 0.035, 'sine', 0.04, 1500, 0.001);
        this.noise(t, 0.02, 0.02, { type: 'bandpass', freq: 3000, q: 2 });
        break;
      case 'joker': // yarı yarıya: kart savrulur, sihirli çan
        this.noise(t, 0.3, 0.07, { type: 'bandpass', freq: 1200, to: 4200, q: 0.9, attack: 0.03 });
        [[84, 0.12], [88, 0.2], [91, 0.28], [96, 0.36]].forEach(([m, d]) => this.iBell(t + d, m, 0.03, 0.6, 0.4));
        break;
      case 'orb': { // ışık topu şıkka kondu (a: o şıktaki sıra → ses yükselir)
        const f = 880 * Math.pow(2, Math.min(12, (a || 1) - 1) / 12);
        this.tone(f, t, 0.1, 'sine', 0.05, null, 0.002);
        this.tone(f * 2, t + 0.01, 0.06, 'sine', 0.02, null, 0.002);
        break;
      }
      case 'right': // bildim
        this.duck(0.2, 1.8);
        [[72, 0], [76, 0.07], [79, 0.14], [84, 0.21]].forEach(([m, d]) => { this.iBell(t + d, m + 12, 0.045, 0.9, 0.3); this.tone(440 * Math.pow(2, (m - 69) / 12), t + d, 0.16, 'triangle', 0.05, null, 0.002); });
        this.cheer(t + 0.2, 1.3);
        break;
      case 'streak': // seri
        this.noise(t, 0.5, 0.08, { type: 'bandpass', freq: 500, to: 2200, q: 0.7, attack: 0.05 });
        for (let i = 0; i < 7; i++) this.noise(t + 0.08 + Math.random() * 0.4, 0.015, 0.05, { type: 'highpass', freq: 3500 });
        break;
      case 'wrong': // bilemedim: "ıh-ıh"
        this.duck(0.15, 1.2);
        this.tone(165, t, 0.16, 'square', 0.06, 150, 0.004);
        this.tone(147, t + 0.2, 0.32, 'square', 0.06, 130, 0.004);
        break;
      case 'miss': // süre doldu, cevap vermedim
        this.tone(392, t, 0.14, 'triangle', 0.06, 370, 0.01);
        this.tone(330, t + 0.15, 0.32, 'triangle', 0.06, 262, 0.01);
        break;
      case 'reveal': // izleyici: doğru şık açıldı
        this.iBell(t, 84, 0.04, 0.8, 0.3);
        this.tone(1047, t, 0.25, 'sine', 0.05, null, 0.002);
        break;
      case 'nobody': // kimse bilemedi
        this.tone(220, t, 0.5, 'sawtooth', 0.03, 165, 0.03);
        this.noise(t, 0.6, 0.05, { type: 'bandpass', freq: 700, to: 300, q: 1.5, attack: 0.08 });
        break;
      case 'timeup': // süre bitti kornası
        this.tone(220, t, 0.4, 'square', 0.05, null, 0.004);
        this.tone(277, t, 0.4, 'square', 0.035, null, 0.004);
        break;
      case 'tower': // puan kulesi yükseliyor (a: sıra 0..1 → ses yükselir)
        this.tone(220 + 440 * (a || 0), t, 0.5, 'triangle', 0.04, 440 + 660 * (a || 0), 0.05);
        break;
      case 'champ':
        this.duck(0.15, 3);
        [[60, 0, 0.14], [64, 0.15, 0.14], [67, 0.3, 0.14], [72, 0.45, 0.8]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.07, 0.15); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// sahne: masanın ortasında alçak, koyu lacivert yuvarlak platform (kenarı biraz parlak)
function stageModel(mb) {
  const Nv = C('#11143a', 0), Rim = C('#39407e', -0.75);
  mb.lathe(0, 0, 0, [[0, 0], [STG_R, 0], [STG_R + 0.015, 0.012], [STG_R + 0.015, STG_H - 0.01], [STG_R, STG_H], [0, STG_H]], 56, (i) => (i >= 1 && i <= 4 ? Rim : Nv));
  // ortada ince ışıklı halka (ışık saçar)
  mb.lathe(0, STG_H + 0.001, 0, [[0.4, 0], [0.42, 0], [0.42, 0.003], [0.4, 0.003]], 40, () => C('#6f7cf0', 0.9));
}
// kürsü gövdesi (orijin sahnenin üstü): koyu gövde, metal yaka
function pedModel(mb) {
  const Dk = C('#252a52', -0.6), Mt = C('#c8cbe0', -0.92);
  mb.lathe(0, 0, 0, [[0, 0], [0.15, 0], [0.155, 0.018], [0.135, 0.03], [0.105, 0.045], [0.098, PED_H - 0.035], [0.12, PED_H - 0.02], [0.125, PED_H], [0, PED_H]], 28, (i) => (i >= 6 ? Mt : Dk));
}
// kürsünün renkli ışık bandı ve tepe ışığı (beyaz, renkle boyanır; ışık saçar)
function pedLampModel(mb, e) {
  mb.lathe(0, 0, 0, [[0.099, 0.07], [0.104, 0.075], [0.104, 0.112], [0.099, 0.117]], 28, () => C('#ffffff', e));
  mb.lathe(0, PED_H + 0.001, 0, [[0.112, 0], [0.112, 0.004], [0, 0.004]], 28, () => C('#ffffff', e));
}
// dört şık: ▲ dörtyüzlü, ● küre, ■ yuvarlak köşeli küp, ◆ uzun sekizyüzlü (birim boy, orijin merkez)
function shapeModel(mb, k, e) {
  const col = C('#ffffff', e);
  const cen = [0, 0, 0];
  if (k === 0) {
    const R = 0.92, H = R * Math.SQRT2 * 1.05;
    const yb = -H * 0.4, ya = H * 0.6;
    const P = [0, 1, 2].map((j) => { const a = (j / 3) * TAU + Math.PI / 2; return [Math.cos(a) * R, yb, Math.sin(a) * R]; });
    const A = [0, ya, 0];
    mb.tri(P[0], P[1], A, col, cen); mb.tri(P[1], P[2], A, col, cen); mb.tri(P[2], P[0], A, col, cen); mb.tri(P[0], P[2], P[1], col, cen);
  } else if (k === 1) {
    mb.sphereS(0, 0, 0, 0.78, 0.78, 0.78, col, 22, 14);
  } else if (k === 2) {
    mb.rbox(-0.6, -0.6, -0.6, 0.6, 0.6, 0.6, 0.11, col, 2);
  } else {
    const T = [0, 1.02, 0], Bt = [0, -1.02, 0];
    const Q = [0, 1, 2, 3].map((j) => { const a = (j / 4) * TAU; return [Math.cos(a) * 0.66, 0, Math.sin(a) * 0.66]; });
    for (let j = 0; j < 4; j++) { const a = Q[j], b = Q[(j + 1) % 4]; mb.tri(a, b, T, col, cen); mb.tri(b, a, Bt, col, cen); }
  }
}
// altın soru işareti (ışık saçar; orijin noktanın altı, ön yüz +z)
function qmarkModel(mb) {
  const col = C('#ffd23f', 0.9);
  const R0 = 0.2, cy = 0.62, r = 0.055;
  const pts = [];
  for (let j = 0; j <= 16; j++) { const a = Math.PI * 0.95 - (j / 16) * Math.PI * 1.45; pts.push([Math.cos(a) * R0, cy + Math.sin(a) * R0, 0]); }
  pts.push([0, 0.3, 0]);
  for (let j = 0; j < pts.length - 1; j++) limb(mb, pts[j], pts[j + 1], [r, r], col, 10);
  mb.sphereS(0, 0.12, 0, r * 1.3, r * 1.3, r * 1.3, col, 12, 8);
}
function ledModel(mb, e) { mb.sphereS(0, 0, 0, 0.044, 0.024, 0.044, C('#ffffff', e), 12, 6); }
// oyuncunun önündeki zil: koyu gövde, metal yaka (kubbe ayrı çizilir)
function consoleModel(mb) {
  const Dk = C('#23284a', -0.6), Mt = C('#d4d7e8', -0.92);
  mb.rbox(-0.1, 0, -0.068, 0.1, 0.042, 0.068, 0.016, Dk, 2);
  mb.lathe(0, 0.042, 0, [[0.05, 0], [0.058, 0.003], [0.058, 0.01], [0.05, 0.012], [0, 0.012]], 22, () => Mt);
}
function domeModel(mb, e) { mb.sphereS(0, 0.052, 0, 0.044, 0.03, 0.044, C('#ffffff', e), 18, 8); }
function orbModel(mb) { mb.sphereS(0, 0, 0, ORB_R, ORB_R, ORB_R, C('#ffffff', 0.9), 14, 8); }
// puan kulesi (birim boy: y 0..1) ve tepe kapağı
function towerModel(mb) { mb.rbox(-0.072, 0, -0.072, 0.072, 1, 0.072, 0.016, C('#ffffff', -0.6), 1); }
function capModel(mb) { mb.rbox(-0.085, 0, -0.085, 0.085, 0.034, 0.085, 0.012, C('#ffffff', -0.9), 2); }

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const backOut = (u) => { const x = clamp(u, 0, 1) - 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; };
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const sec1 = (ms) => (ms / 1000).toFixed(1).replace('.', ',');
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };

/* ============================ oyun ============================ */
class QuizGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'bil', cls: 'bil', title: 'Bil Bakalım', sub: 'Bilgi yarışması', emoji: '🧠', css: STYLE, snd: new BbSnd(), amb: 'diner', ambVol: 0.36, botPx: 300, botPxL: 34, cloth: '#1b2150', trim: '#ffd23f', tea: false, place: false, chairPad: '#e04e6a', lampHex: '#2b2f6b', light: STUDIO_L, fog: '#0d0f22', roomStyle: { wall: '#161a36', curtain: '#5b3fd1' } });
    this.lockSeen = new Map();   // cevaplayan → zilin yandığı an
    this.ordKey = ''; this.ordL = [];
    this.landN = 0;
    this.tint = new Float32Array(3);
    this.tint2 = new Float32Array(3);
    this.ptEl = [];
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.bbStage = this.mk(stageModel);
    W.bbPed = this.mk(pedModel);
    W.bbPedL = this.mk((mb) => pedLampModel(mb, -0.4));
    W.bbPedL2 = this.mk((mb) => pedLampModel(mb, 0.9));
    W.bbShp = [0, 1, 2, 3].map((k) => this.mk((mb) => shapeModel(mb, k, -0.6)));
    W.bbShpL = [0, 1, 2, 3].map((k) => this.mk((mb) => shapeModel(mb, k, 0.9)));
    W.bbQ = this.mk(qmarkModel);
    W.bbLed = this.mk((mb) => ledModel(mb, -0.6));
    W.bbLedL = this.mk((mb) => ledModel(mb, 0.9));
    W.bbCon = this.mk(consoleModel);
    W.bbDome = this.mk((mb) => domeModel(mb, -0.7));
    W.bbDomeL = this.mk((mb) => domeModel(mb, 0.9));
    W.bbOrb = this.mk(orbModel);
    W.bbTow = this.mk(towerModel);
    W.bbCap = this.mk(capModel);
    W.trophy = this.mk(K.trophyModel);
  }
  onDispose() { this.ptEl.forEach((e) => e && e.remove()); this.ptEl = []; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  // açılış zaman çizelgesi: cevaplayanların topları en hızlıdan başlayarak sırayla şıklara uçar
  order() {
    const v = this.view;
    if (!v || !Array.isArray(v.choices)) return [];
    const key = `${v.game}|${v.q}|${v.choices.join(',')}`;
    if (key !== this.ordKey) {
      this.ordKey = key;
      const cnt = [0, 0, 0, 0];
      this.ordL = v.choices.map((c, i) => ({ i, c, ms: (v.ms || [])[i] ?? 0 })).filter((o) => o.c >= 0 && o.c < 4).sort((a, b) => a.ms - b.ms || a.i - b.i);
      this.ordL.forEach((o) => { o.j = cnt[o.c]++; });
      this.ordL.forEach((o) => { o.n = cnt[o.c]; });
    }
    return this.ordL;
  }
  landAt(n) { return (this.view.at || 0) + (FLY_T0 + n * FLY_GAP + FLY_S) * 1000; }
  verdAt() { const n = this.order().length; return (this.view.at || 0) + (n ? FLY_T0 + (n - 1) * FLY_GAP + FLY_S + VERD_PAD : 0.9) * 1000; }
  shown() { const v = this.view; return !!v && v.phase === 'reveal' && this.sNow() >= this.verdAt(); }
  inPlay() { const v = this.view; return !!v && (v.phase === 'question' || v.phase === 'reveal') && Array.isArray(v.options); }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'bb-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'bb-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'bb-ans') {
        if (!v || v.phase !== 'question' || !v.amIn || v.myChoice >= 0) return;
        const c = +b.dataset.c;
        if ((v.cut || []).includes(c)) return;
        this.fx('lock', c); vibrate(18);
        this.lockSeen.set(v.seats[v.me]?.id, this.time);
        this.ctx.send('answer', { choice: c });
      }
      else if (act === 'bb-joker') {
        if (!v || v.phase !== 'question' || !v.jokerLeft || v.myChoice >= 0 || v.cut) return;
        this.fx('joker'); vibrate(12);
        this.ctx.send('joker', {});
      }
      else if (act === 'bb-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.bil !== '1') { root.dataset.bil = '1'; root.innerHTML = '<p class="py-16 text-center">🧠</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.q || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'question') {
      (v.seats || []).forEach((p, i) => {
        if (!(v.picked || [])[i] || this.lockSeen.has(p.id)) return;
        this.lockSeen.set(p.id, this.time);
        if (prev && prev.phase === 'question' && i !== v.me) this.fx('peer');
      });
      if (prev && prev.phase === 'question' && prev.q === v.q && !prev.cut && v.cut) {
        if (this.X) v.cut.forEach((k) => { const p = this.shpW(k); this.burst(p[0], p[1], p[2], 14, [[0.75, 0.65, 1], [1, 1, 1]], 1.1, 0.03, true, 0.8, 1.5); });
      }
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'question') {
      mus('race');
      this.lockSeen = new Map((v.seats || []).filter((p, i) => (v.picked || [])[i]).map((p) => [p.id, -9]));
      this.qT = this.time - (fresh ? 0 : 9);
      this.tickSec = 0; this.upSeen = false;
      if (fresh) {
        if (v.double) { this.fx('double'); this.msg('⭐ SON SORU · ÇİFT PUAN!', 'big'); }
        else { this.fx('q'); this.msg(`🧠 SORU ${v.q}/${v.qs}`, 'mid'); }
      }
    }
    if (v.phase === 'reveal') {
      mus('mute');
      const now = this.sNow();
      this.landN = this.order().filter((o, n) => now >= this.landAt(n)).length;
      this.vDone = now >= this.verdAt() + 400;
      this.vT = this.vDone ? this.time - 9 : null;
      if (fresh && this.order().length) {
        const d = Math.max(0.5, (this.verdAt() - (v.at || 0)) / 1000 - 0.35);
        const pk = this.phKey;
        setTimeout(() => { if (!this.dead && this.phKey === pk) this.fx('drumroll', d); }, 150);
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.towSeen = late ? 99 : -1;
      this.champFx = late;
      if (!late) this.msg('🏁 YARIŞMA BİTTİ', 'big');
    }
  }
  // doğru şık açıldı: sesler, mesajlar, puan baloncukları
  onVerdict() {
    const v = this.view;
    this.vT = this.time;
    if (!(v.correct >= 0 && v.correct < 4)) return;
    const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1;
    try { this.snd.music('idle'); } catch { /* yok */ }
    const p = this.shpW(v.correct);
    if (this.X) this.burst(p[0], p[1] + 0.05, p[2], 46, [[...OPT3[v.correct]], [1, 1, 1], [1, 0.9, 0.5]], 2.2, 0.035, false, 1.8, 2.4);
    const inR = me >= 0 && (v.inRound || [])[me];
    if (inR && mine === v.correct) {
      this.fx('right'); vibrate([15, 30, 15]);
      if ((v.streak || [])[me] >= 3) setTimeout(() => { if (!this.dead) this.fx('streak'); }, 450);
      this.msg(v.fastest === me ? '⚡ EN HIZLI SENSİN!' : (v.streak || [])[me] >= 3 ? `🔥 ${(v.streak || [])[me]} SERİ!` : '✅ DOĞRU!', 'mid');
    } else if (inR && mine >= 0) { this.fx('wrong'); vibrate(40); this.msg('❌ YANLIŞ', 'mid'); }
    else if (inR) { this.fx('miss'); this.msg('⏰ SÜRE DOLDU', 'mid'); }
    else this.fx('reveal');
    if (!v.right) { setTimeout(() => { if (!this.dead) this.fx('nobody'); }, 500); if (!(inR && mine >= 0)) this.msg('🤯 KİMSE BİLEMEDİ', 'mid'); }
    // puan baloncukları
    (v.gains || []).forEach((g, i) => {
      if (!(g > 0)) return;
      const e = this.ptBox(i);
      e.className = 'bb-pt';
      e.textContent = `+${fmt(g)}${(v.bonus || [])[i] ? ' 🔥' : ''}${v.fastest === i ? ' ⚡' : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
      e.dataset.t = String(this.time);
    });
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'bb-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const mid = [0, TABLE_Y + 0.42, 0];
    const shown = this.shown();
    const su = shown && this.vT != null ? t - this.vT : 0;
    const left = (v.endsAt || 0) - now;
    const champ = v.phase === 'final' ? v.champ || [] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.bbI || (a.bbI = { lt: 0, look: null });
      const idleLook = (pC = 0.25) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > pC ? P[Math.floor(Math.random() * P.length)] : mid;
        }
        return idle.look;
      };
      if (v.phase === 'question') {
        const did = !!(v.picked || [])[i];
        const ct = this.lockSeen.get(p.id);
        if (did && ct != null && t - ct < 0.5) {
          a.pose('rest', { t, k: 16 });
          a.tgt.hand[1] = [0, TABLE_Y + 0.1, 0.58];
          a.tgt.palm[1] = [0, -1, 0.15]; a.tgt.fdir[1] = [0, -0.25, 1];
          a.shape[1] = 'open';
          a.expr = 'grin';
          a.look = this.seatW(a, 0, TABLE_Y, 0.6);
          return;
        }
        if (!did && (v.inRound || [])[i]) {
          const hurry = left < 5000;
          a.pose(hurry ? (hs(i, v.q) < 0.5 ? 'bite' : 'headgrab') : Math.floor(t / 3.2 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = hurry ? 'tense' : Math.floor(t / 2.7 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = Math.floor(t / 1.9 + i) % 4 ? this.shpW(Math.floor(t / 1.3 + i * 3) % 4) : idleLook(0.4);
        } else { a.pose(hs(i, v.q) < 0.5 ? 'clasp' : 'rest', { t }); a.expr = 'smile'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        if (!shown) { a.pose(hs(i, v.q + 3) < 0.5 ? 'bite' : 'clasp', { t }); a.expr = 'tense'; a.look = mid; return; }
        const c = (v.choices || [])[i];
        if (!(v.inRound || [])[i]) { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        if (c === v.correct) {
          const star = v.fastest === i;
          a.pose(su < (star ? 2.6 : 1.8) ? 'cheer' : Math.floor(su / 1.5 + i) % 2 ? 'clap' : 'rest', { t });
          a.expr = 'laugh'; a.look = idleLook();
        } else if (c >= 0) { a.pose(su < 1.8 ? (hs(i, v.q) < 0.5 ? 'facepalm' : 'headgrab') : 'slump', { t }); a.expr = su < 1.8 ? 'wince' : 'sad'; a.look = idleLook(0.2); }
        else { a.pose(su < 1.6 ? 'shrug' : 'rest', { t }); a.expr = 'o'; a.look = mid; }
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const pl = placeOf(v, i);
        if (champ.includes(i)) { a.pose(u < 5 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'wave', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else if (pl <= 3) { a.pose(Math.floor(u / 2.5 + i) % 2 ? 'wave' : 'clap', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; a.look = idleLook(); }
        return;
      }
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = idleLook();
    });
  }

  /* ---------- zamanlama, kamera, sesler ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time, now = this.sNow();
    // sahne ölçeği: sahnenin kenarı ile zillerin arasında boşluk kalsın (küçük masada / yatay ekranda küçülür)
    const ssT = clamp((this.R * Math.min(1, this.kz) - 0.69) / 1.05, 0.62, 1.45);
    this.ssV = this.ssV ? damp(this.ssV, ssT, 3, dt) : ssT;
    if (v.phase === 'reveal') {
      const O = this.order();
      const n = O.filter((o, k) => now >= this.landAt(k)).length;
      if (n > this.landN) { const o = O[n - 1]; this.landN = n; if (o) this.fx('orb', o.j + 1); }
      if (!this.vDone && now >= this.verdAt()) { this.vDone = true; this.onVerdict(); }
    }
    // son saniyeler: henüz cevaplamadıysam tıkırtı, süre dolunca korna
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'question' && v.amIn && v.myChoice < 0) {
      if (left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
      if (left <= 0 && !this.upSeen) { this.upSeen = true; this.fx('timeup'); }
    }
    // final: kuleler sırayla yükselir, en son birincinin kulesi
    if (v.phase === 'final') {
      const R = v.rank || [];
      const N = R.length;
      for (let r = N - 1; r >= 0; r--) {
        const k = N - 1 - r;
        if (k <= this.towSeen) continue;
        if (t - (this.finT || 0) >= 0.7 + k * 0.22) { this.towSeen = k; this.fx('tower', N > 1 ? k / (N - 1) : 1); }
      }
      if (!this.champFx && t - (this.finT || 0) >= 0.7 + Math.max(0, N - 1) * 0.22 + 0.95) {
        this.champFx = true;
        if ((v.champ || []).length) {
          this.fx('champ');
          const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
          this.msg(`🏆 ${nm}`, 'big');
          (v.champ || []).forEach((i) => { const p = this.towTop(i); if (this.X && p) this.burst(p[0], p[1] + 0.25, p[2], 60, [[1, 0.85, 0.3], [1, 1, 1], [0.6, 0.7, 1]], 2.6, 0.04, false, 2.2, 2.4); });
        }
      }
    }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'question' || v.phase === 'reveal') {
      zoom = land ? 0.95 : 0.62; pa = land ? -0.02 : -0.06; bp = Math.max(170, this.barH || 300); sy = land ? 0.5 : 0.42; sx = land ? 0.27 : 0.5;
      H = [0, TABLE_Y + 0.38 * this.ss, 0.1];
    } else if (v.phase === 'final') {
      const card = now - (v.finAt || 0) >= this.cardMs();
      zoom = land ? 1.05 : card ? 0.86 : 0.6; bp = card ? 200 : 300; sy = land ? 0.5 : card ? 0.23 : 0.42; sx = land ? (card ? 0.27 : 0.5) : 0.5; yawC = Math.sin(t * 0.15) * 0.12; H = [0, TABLE_Y + 0.55, 0];
    }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (Math.abs(bp - this.cfg.botPx) > 12) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    this.placePts();
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  // puan baloncukları (açılışta başların üstünde) ve finalde kulelerin üstünde puanlar
  placePts() {
    const v = this.view;
    const fin = !!v && v.phase === 'final' && !this.flat;
    const rev = !!v && v.phase === 'reveal' && this.vDone && !this.flat;
    for (let i = 0; i < Math.max(this.ptEl.length, fin ? this.seats.length : 0); i++) {
      if (fin) {
        const u = this.towU(i);
        if (u < 0.98) { const e0 = this.ptEl[i]; if (e0 && e0.style.opacity !== '0') { e0.className = 'bb-pt'; e0.style.opacity = '0'; } continue; }
        const e = this.ptBox(i);
        const cls = 'bb-pt fix' + ((v.champ || []).includes(i) ? ' g' : '');
        if (e.className !== cls) { e.className = cls; e.style.opacity = ''; }
        const txt = fmt((v.scores || [])[i]);
        if (e.textContent !== txt) e.textContent = txt;
        const p = this.towTop(i);
        const q = p && this.project(p[0], p[1] + ((v.champ || []).includes(i) ? 0.42 : 0.1), p[2]);
        if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
        continue;
      }
      const e = this.ptEl[i];
      if (!e) continue;
      if (!rev) { if (e.classList.contains('go') || e.classList.contains('fix')) { e.className = 'bb-pt'; e.style.opacity = ''; } continue; }
      if (!e.classList.contains('go')) continue;
      const a = this.avatarAt(i);
      if (!a || !a.headW) continue;
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
    }
  }

  /* ---------- konumlar ---------- */
  get ss() { return this.ssV || 1; }
  pedW(k) { const s = this.ss; return [GRID[k][0] * GX * s, TABLE_Y + STG_H * s, GRID[k][1] * GZ * s]; }
  shpW(k) { const p = this.pedW(k), s = this.ss; return [p[0], p[1] + (PED_H + SHP_Y + Math.sin(this.time * 1.6 + k * 1.7) * 0.022) * s, p[2]]; }
  conW(a) { return this.seatW(a, 0, TABLE_Y, 0.6); }
  orbHome(a, i) { const q = this.conW(a); return [q[0], q[1] + 0.17 + Math.sin(this.time * 2.4 + i) * 0.015, q[2]]; }
  // şıkkın çevresinde dönen j. top (n: o şıktaki top sayısı)
  orbRing(k, j, n, spd) {
    const p = this.shpW(k), s = this.ss;
    const a = (j / Math.max(1, n)) * TAU + this.time * spd + k;
    return [p[0] + Math.cos(a) * RING_R * s, p[1] + (-0.03 + Math.sin(a * 2 + k) * 0.02) * s, p[2] + Math.sin(a) * RING_R * 0.85 * s];
  }
  towDir(i) { const a = this.avatarAt(i); if (!a) return null; const L = Math.hypot(a.pos[0], a.pos[2]) || 1; return [a.pos[0] / L, a.pos[2] / L]; }
  towH(i) { const v = this.view, S = (v && v.scores) || []; const mx = Math.max(1, ...S); return 0.06 + 0.9 * clamp((S[i] || 0) / mx, 0, 1); }
  towU(i) {
    const v = this.view;
    if (!v || v.phase !== 'final') return 0;
    const R = v.rank || [], N = R.length, r = R.indexOf(i);
    if (r < 0) return 0;
    const k = N - 1 - r;
    return easeOut((this.time - (this.finT || 0) - 0.7 - k * 0.22) / 0.9);
  }
  towTop(i) { const d = this.towDir(i); if (!d) return null; const s = this.ss, h = this.towH(i) * this.towU(i); return [d[0] * 0.66 * s, TABLE_Y + STG_H * s + h + 0.03, d[1] * 0.66 * s]; }
  colOf(i, out = this.tint) { const p = this.seats[i]; const c = rgb3(pcol(p ? p.c : 0)); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  // şıkların durumu: 1 normal, 'ok' doğru (parlar), 'no' yanlış (söner), 'cut' jokerle elenmiş (yalnızca bende)
  shpState(k) {
    const v = this.view;
    if (!v) return 'n';
    if (v.phase === 'reveal' && this.vDone) return k === v.correct ? 'ok' : 'no';
    if (v.phase === 'question' && (v.cut || []).includes(k)) return 'cut';
    return 'n';
  }
  ledState(k, t, now) {
    const v = this.view;
    // dönüş: { on, col }
    if (!v || v.phase === 'intro' || v.phase === 'final') { const on = (k + Math.floor(t * 7)) % 5 === 0; return [on, OPT3[(Math.floor((k + Math.floor(t * 7)) / 5) + 4) % 4]]; }
    if (v.phase === 'question') {
      if (v.closing) return [Math.floor(t * 8) % 2 === 0, WHITE3];
      const left = Math.max(0, (v.endsAt || 0) - now) / 1000;
      const on = k < Math.ceil(left) && (left > 3 || Math.floor(t * 5) % 2 === 0 || k < Math.ceil(left) - 1);
      return [on, left > 8 ? GREEN3 : left > 4 ? OPT3[1] : RED3];
    }
    if (!this.vDone) return [(k + Math.floor(t * 14)) % 3 === 0, WHITE3];
    return [true, OPT3[v.correct] || WHITE3];
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.bbStage || !v) return;
    const m = this.mats.b, T = this.T, t = this.time, now = this.sNow();
    const fin = v.phase === 'final';
    const sink = fin ? 1 - easeOut((t - (this.finT || 0)) / 0.6) : 1;   // finalde kürsüler sahneye iner
    const ss = this.ss;
    M.set(m, 0, TABLE_Y + 0.002, 0, 0, 0, 0, ss);
    D(Wd.bbStage, m, T.obj);
    // kürsüler ve şıklar
    if (sink > 0.01) {
      const play = this.inPlay();
      const spin = v.phase === 'reveal' && !this.vDone ? 3.2 : 0.8;
      for (let k = 0; k < 4; k++) {
        const p = this.pedW(k), st = this.shpState(k);
        M.set(m, p[0], p[1], p[2], 0, 0, 0, ss, sink * ss, ss);
        D(Wd.bbPed, m, T.obj);
        const lit = st === 'ok' || (play && st === 'n');
        D(lit ? Wd.bbPedL2 : Wd.bbPedL, m, st === 'no' || st === 'cut' ? DIM3[k] : OPT3[k]);
        // şekil
        const q = this.shpW(k);
        let s = SHP_S * ss, y = q[1];
        if (st === 'ok') { const u = (t - (this.vT ?? t)) / 0.6; s *= 1 + 0.38 * backOut(u); y += 0.05 * ss * easeOut(u); }
        else if (st === 'no') { const u = easeOut((t - (this.vT ?? t)) / 0.45); s *= 1 - 0.3 * u; y -= 0.08 * ss * u; }
        else if (st === 'cut') s *= 0.66;
        if (v.phase === 'question') s *= backOut((t - (this.qT ?? -9) - k * 0.08) / 0.45);
        s *= sink;
        if (s < 0.004) continue;
        const yy = lerp(p[1] + 0.02, y, sink);
        const ry = t * spin + k * 1.3 + (k === 3 ? Math.PI / 4 : 0);
        M.set(m, q[0], yy, q[2], ry, k === 0 ? 0 : k === 2 ? 0.35 : 0, k === 2 ? 0.25 : 0, s);
        D(st === 'ok' ? Wd.bbShpL[k] : Wd.bbShp[k], m, st === 'no' || st === 'cut' ? DIM3[k] : OPT3[k]);
      }
    }
    // soru işareti: sorudan önce ve soru sırasında süzülür; açılışta hızla döner, doğru açılınca kaybolur
    if (!shadow && !fin) {
      let qs = 1;
      if (v.phase === 'reveal') qs = this.vDone ? 1 - easeOut((t - (this.vT ?? t)) / 0.35) : 1;
      if (qs > 0.01) {
        const ex = this.cam.ex, ez = this.cam.ez;
        const spinQ = v.phase === 'reveal' ? t * 7 : Math.sin(t * 0.9) * 0.35;
        M.set(m, 0, TABLE_Y + (0.8 + Math.sin(t * 1.3) * 0.03) * ss, 0, Math.atan2(ex, ez) + spinQ, 0, 0, 0.55 * qs * ss);
        D(Wd.bbQ, m, T.obj);
      }
    }
    // sahne kenarındaki 15 lamba (geri sayım)
    if (!shadow) {
      for (let k = 0; k < LED_N; k++) {
        const a = Math.PI / 2 - (k / LED_N) * TAU;
        const [on, col] = this.ledState(k, t, now);
        M.set(m, Math.cos(a) * LED_R * ss, TABLE_Y + (STG_H + 0.004) * ss, Math.sin(a) * LED_R * ss, 0, 0, 0, ss);
        D(on ? Wd.bbLedL : Wd.bbLed, m, on ? col : OFF3);
      }
    }
    // oyuncuların zilleri
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const q = this.conW(a);
      let press = 0;
      const ct = this.lockSeen.get(p.id);
      if (v.phase === 'question' && ct != null) { const u = (t - ct) / 0.35; press = u > 0 && u < 1 ? Math.sin(u * Math.PI) * 0.012 : 0; }
      M.set(m, q[0], q[1] + 0.002, q[2], a.yaw);
      D(Wd.bbCon, m, T.obj);
      M.set(m, q[0], q[1] + 0.002 - press, q[2], a.yaw);
      let lit = false, col = this.colOf(i);
      if (this.inPlay()) {
        const c = (v.choices || [])[i];
        if (v.phase === 'reveal' && this.vDone && (v.inRound || [])[i]) { lit = true; col = c === v.correct ? GREEN3 : c >= 0 ? RED3 : GREY3; if (c < 0) lit = false; }
        else lit = !!(v.picked || [])[i];
      }
      D(lit ? Wd.bbDomeL : Wd.bbDome, m, col);
    });
    // ışık topları: soru sırasında zilin üstünde, açılışta şıklara uçar
    if (!shadow && this.inPlay()) {
      if (v.phase === 'question') {
        this.seats.forEach((p, i) => {
          if (!(v.picked || [])[i]) return;
          const a = this.av.get(p.id);
          if (!a) return;
          const ct = this.lockSeen.get(p.id) ?? -9;
          const u = easeOut((t - ct - 0.15) / 0.35);
          if (u <= 0) return;
          const q = this.orbHome(a, i);
          M.set(m, q[0], q[1] - (1 - u) * 0.12, q[2], 0, 0, 0, u);
          D(Wd.bbOrb, m, this.colOf(i));
        });
      } else {
        const O = this.order();
        O.forEach((o, n) => {
          const a = this.avatarAt(o.i);
          if (!a) return;
          const ok = this.vDone && o.c === v.correct;
          const spd = this.vDone ? (ok ? 2.4 : 0.5) : 1.2;
          const p1 = this.orbRing(o.c, o.j, o.n, spd);
          const u = clamp((now - (v.at || 0) - (FLY_T0 + n * FLY_GAP) * 1000) / (FLY_S * 1000), 0, 1);
          let p = p1;
          if (u < 1) { const p0 = this.orbHome(a, o.i), e = easeOut(u); p = [lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e) + Math.sin(u * Math.PI) * 0.5, lerp(p0[2], p1[2], e)]; }
          let s = 1;
          if (this.vDone && !ok) { const w = easeOut((t - (this.vT ?? t)) / 0.5); s = 1 - 0.35 * w; p = [p[0], p[1] - 0.06 * w, p[2]]; }
          M.set(m, p[0], p[1], p[2], 0, 0, 0, s * ss);
          const col = this.colOf(o.i);
          if (this.vDone && !ok) { col[0] *= 0.5; col[1] *= 0.5; col[2] *= 0.55; }
          D(Wd.bbOrb, m, col);
        });
      }
    }
    // final: puan kuleleri, birincinin kulesinde kupa
    if (fin) {
      const R = v.rank || [];
      R.forEach((i, r) => {
        const d = this.towDir(i);
        if (!d) return;
        const u = this.towU(i);
        if (u <= 0.001) return;
        const h = this.towH(i) * u;
        const x = d[0] * 0.66 * ss, z = d[1] * 0.66 * ss, y0 = TABLE_Y + STG_H * ss;
        const yaw = Math.atan2(d[0], d[1]);
        M.set(m, x, y0, z, yaw, 0, 0, 1, h, 1);
        D(Wd.bbTow, m, this.colOf(i));
        const pl = placeOf(v, i);
        M.set(m, x, y0 + h, z, yaw);
        D(Wd.bbCap, m, pl <= 3 ? MEDAL[pl - 1] : WHITE3);
        if ((v.champ || []).includes(i) && !shadow) {
          const w = clamp((u - 0.98) * 50, 0, 1) * easeOut((this.time - (this.finT || 0) - 0.7 - (R.length - 1) * 0.22 - 0.9) / 0.5);
          if (w > 0.01) { M.set(m, x, y0 + h + 0.03, z, t * 0.9, 0, 0, 1.25 * w); D(Wd.trophy, m, T.obj); }
        }
      });
    }
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const v = this.view;
    if (!v || !this.res) return;
    const t = this.time, now = this.sNow();
    // lambalar
    for (let k = 0; k < LED_N; k++) {
      const [on, col] = this.ledState(k, t, now);
      if (!on) continue;
      const a = Math.PI / 2 - (k / LED_N) * TAU;
      this.glow(m, [Math.cos(a) * LED_R * this.ss, TABLE_Y + (STG_H + 0.02) * this.ss, Math.sin(a) * LED_R * this.ss], 0.15 * this.ss, col, 0.34);
    }
    // soru işareti ışığı
    if (v.phase !== 'final' && !(v.phase === 'reveal' && this.vDone)) this.glow(m, [0, TABLE_Y + 1.02 * this.ss, 0], 0.6 * this.ss, GOLD3, 0.12 + 0.04 * Math.sin(t * 2.2));
    if (this.inPlay()) {
      // doğru şık parlar
      if (v.phase === 'reveal' && this.vDone && v.correct >= 0) {
        const u = t - (this.vT ?? t);
        const p = this.shpW(v.correct);
        this.glow(m, p, (1.15 + 0.1 * Math.sin(t * 4)) * this.ss, OPT3[v.correct], 0.5 * Math.max(0.45, 1 - u / 2.5));
        this.glow(m, [p[0], p[1] + 0.3 * this.ss, p[2]], 0.6 * this.ss, WHITE3, 0.18 * Math.max(0.3, 1 - u / 2));
      }
      // seçtiğim şıkkın arkasında hafif ışık (yalnızca bende, açılışa kadar)
      if (v.phase === 'question' && v.myChoice >= 0) { const p = this.shpW(v.myChoice); this.glow(m, p, 0.75 * this.ss, this.colOf(v.me, this.tint2), 0.2 + 0.06 * Math.sin(t * 3)); }
      // yanan ziller ve toplar
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        if (v.phase === 'question' && (v.picked || [])[i]) { const q = this.orbHome(a, i); this.glow(m, q, 0.17, this.colOf(i, this.tint2), 0.4); const c0 = this.conW(a); this.glow(m, [c0[0], c0[1] + 0.07, c0[2]], 0.16, this.colOf(i, this.tint2), 0.3); }
        if (v.phase === 'reveal' && this.vDone && (v.inRound || [])[i]) {
          const c = (v.choices || [])[i];
          if (c < 0) return;
          const c0 = this.conW(a);
          this.glow(m, [c0[0], c0[1] + 0.07, c0[2]], 0.2, c === v.correct ? GREEN3 : RED3, 0.35);
        }
      });
      if (v.phase === 'reveal') {
        const O = this.order();
        O.forEach((o) => {
          if (this.vDone && o.c !== v.correct) return;
          const p1 = this.orbRing(o.c, o.j, o.n, this.vDone ? 2.4 : 1.2);
          const u = clamp((now - (v.at || 0) - (FLY_T0 + O.indexOf(o) * FLY_GAP) * 1000) / (FLY_S * 1000), 0, 1);
          if (u < 1) return;
          this.glow(m, p1, 0.17 * this.ss, this.colOf(o.i, this.tint2), 0.35);
        });
      }
    }
    if (v.phase === 'final') {
      (v.champ || []).forEach((i) => { const p = this.towTop(i); if (p && this.towU(i) > 0.98) this.glow(m, [p[0], p[1] + 0.2, p[2]], 0.8, GOLD3, 0.25 + 0.06 * Math.sin(t * 3)); });
    }
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="bb-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="bb-seg" role="group" aria-label="Soru sayısı"><button data-act="bb-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 10 soru</button><button data-act="bb-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🏆 Uzun · 20 soru</button></div>`; }
  dotsOf(k) {
    const v = this.view;
    return (v.choices || []).map((c, i) => (c === k ? `<i style="--pc:${pcol(v.seats[i]?.c ?? 0)}" title="${esc(nm0(v.seats[i]?.n || ''))}"></i>` : '')).join('');
  }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost;
    const now = this.sNow();
    if (v.phase === 'question' || v.phase === 'reveal') {
      const opts = v.options || [];
      const tag = `<span>🧠 SORU ${v.q}/${v.qs}</span>${v.double ? '<span class="x2">⭐ ÇİFT PUAN</span>' : ''}`;
      if (v.phase === 'question') {
        const mine = v.myChoice, cut = v.cut || [];
        const opt = (k) => {
          const isCut = cut.includes(k);
          const cls = isCut ? ' cut' : mine === k ? ' on' : mine >= 0 ? ' off' : '';
          const dis = !v.amIn || mine >= 0 || isCut || v.closing;
          return `<button class="bb-o${cls}" data-act="bb-ans" data-c="${k}" style="--sc:${OPTC[k]}" ${dis ? 'disabled' : ''}><span class="sh">${OPT[k].sh}</span><span class="tx">${esc(opts[k] || '')}</span>${mine === k ? '<span class="tg">🔒 Cevabın</span>' : ''}</button>`;
        };
        const z = !v.amIn ? '👀 Bu soruda izliyorsun' : v.closing ? 'Herkes cevapladı!' : mine >= 0 ? '🔒 Cevabın kilitlendi' : 'Erken cevap daha çok puan!';
        const jk = v.amIn && mine < 0 && !v.closing && v.jokerLeft && !v.cut ? '<button class="bb-b jk" data-act="bb-joker">🃏 Yarı yarıya</button>' : '';
        key = `q|${v.game}|${v.q}|${mine}|${v.answered}|${v.total}|${v.closing}|${v.amIn}|${cut.join(',')}|${v.jokerLeft}`;
        html = `<div class="bb-box"><div class="bb-q"><small>${tag}</small><b>${esc(v.question || '')}</b></div>
          <div class="bb-four">${[0, 1, 2, 3].map(opt).join('')}</div>
          <div class="bb-ft"><span class="n">✋ ${v.answered}/${v.total}</span><span class="z">${z}</span>${jk}</div>
          ${this.timerBar()}</div>`;
      } else {
        const sh = this.shown();
        const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1, inR = me >= 0 && (v.inRound || [])[me];
        const canNext = sh && host && now - (v.at || 0) >= (v.nextMinMs || 3000);
        const last = v.q >= v.qs;
        const opt = (k) => {
          let cls = '', tg = '';
          if (sh) { if (k === v.correct) { cls = ' ok'; tg = '<span class="tg">✓ Doğru</span>'; } else if (k === mine) { cls = ' no'; tg = '<span class="tg">✗ Senin</span>'; } else cls = ' dim'; }
          else if (k === mine) { cls = ' on'; tg = '<span class="tg">🔒 Cevabın</span>'; }
          return `<button class="bb-o${cls}" style="--sc:${OPTC[k]}" disabled><span class="sh">${OPT[k].sh}</span><span class="tx">${esc(opts[k] || '')}</span>${sh ? `<span class="dots">${this.dotsOf(k)}</span>` : ''}${tg}</button>`;
        };
        let res;
        if (!sh) res = '<span class="m">🥁 Doğru cevap…</span>';
        else if (!inR) res = `<span class="m">${v.right ? `${v.right} kişi bildi` : 'Kimse bilemedi'}</span>`;
        else if (mine === v.correct) res = `<span class="g">+${fmt(v.gains[me])} puan</span>${v.fastest === me ? '<em>⚡ En hızlı</em>' : ''}${(v.bonus || [])[me] ? `<em>🔥 ${(v.streak || [])[me]} seri +${fmt(v.bonus[me])}</em>` : ''}`;
        else if (mine >= 0) res = `<span class="r">Bilemedin</span><span class="m">· ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        else res = `<span class="m">⏰ Süre doldu · ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        key = `r|${v.game}|${v.q}|${sh}|${canNext}`;
        html = `<div class="bb-box"><div class="bb-q"><small>${tag}<span>· CEVAP</span></small><b>${esc(v.question || '')}</b></div>
          <div class="bb-four">${[0, 1, 2, 3].map(opt).join('')}</div>
          <div class="bb-res">${res}</div>
          <div class="bb-rk">${sh ? this.rankLine(v) : '&nbsp;'}</div>
          ${canNext ? `<div class="bb-row"><button class="bb-b" data-act="bb-next">${last ? 'Sonuçlara geç 🏁' : 'Sıradaki soru ▶'}</button></div>` : ''}
          ${this.timerBar()}</div>`;
      }
    }
    this.setBar(key, html);
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card bb-intro">
        <div class="tt">🧠 Bil Bakalım</div>
        <div class="sub">Bilgi yarışması! Dört şıktan doğruyu seç: hem doğru hem hızlı olan kazanır.</div>
        <div class="bb-ru"><div style="background:#ffd9dd"><b>⏱️</b>15 saniye</div><div style="background:#fff0c2"><b>⚡</b>Hızlıya çok puan</div><div style="background:#e6dcff"><b>🃏</b>Bir kez yarı yarıya</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="bb-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Üst üste 3 doğruda seri bonusu, son soru çift puan!'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.flash) aw.push(`<div><b>⚡</b><span>En hızlı cevap<em>${nm(v.flash.i)} · ${sec1(v.flash.ms)} sn</em></span></div>`);
      if (v.streakTop) aw.push(`<div><b>🔥</b><span>En uzun seri<em>${nm(v.streakTop.i)} · ${v.streakTop.n} soru</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤯</b><span>Bu sefer kimse puan alamadı!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>✅ ${S[i]?.right ?? 0}/${v.qs} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Yarışma bitti!</div>
        <div class="sub">${v.qs} soruda kim ne kadar bildi?</div>
        <div class="bb-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="bb-aw">${aw.join('')}</div>` : ''}
        <div class="bb-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="bb-start" ${wait ? 'disabled' : ''}>🔁 Yeni yarışma</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  // final kartı: kuleler yükselip kupa çıktıktan biraz sonra (geç gelen hemen görür)
  cardMs() { const v = this.view; const N = ((v && v.rank) || []).length; return Math.max(2600, (0.7 + Math.max(0, N - 1) * 0.22 + 0.95 + 1.3) * 1000); }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const TOP = { question: `Soru ${v.q}/${v.qs} · ✋ ${v.answered ?? 0}/${v.total ?? 0} · ⏱ ${mmss(left)}`, reveal: `Soru ${v.q}/${v.qs} · ${this.shown() ? `✅ ${v.right ?? 0} kişi bildi` : '🥁 açılıyor'}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.bb-tm i');
    const tot = v.phase === 'question' ? v.answerMs || 15e3 : v.phase === 'reveal' ? v.revealMs || 6500 : 0;
    if (tm && tot) {
      const u = clamp(left / tot, 0, 1);
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      if (v.phase === 'question') tm.style.setProperty('--tc', left > 8000 ? '#2fbf71' : left > 4000 ? '#f2b200' : '#ff4f5e');
      else tm.style.setProperty('--tc', '#7c8cff');
    }
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const sh = this.shown();
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase !== 'intro') x += `<span class="bb-sc">${fmt((v.scores || [])[i])}</span>`;
      if (v.phase === 'question' && (v.picked || [])[i]) x += '<span>🔒</span>';
      if (v.phase === 'reveal' && sh && (v.inRound || [])[i]) { const c = (v.choices || [])[i]; if (c >= 0) x += `<span class="bb-v ${c === v.correct ? 'y' : 'n'}">${c === v.correct ? '✓' : '✗'}</span>`; }
      if (v.phase !== 'intro' && v.phase !== 'final' && (v.streak || [])[i] >= 3) x += `<span class="bb-f">🔥${v.streak[i]}</span>`;
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${['🥇', '🥈', '🥉'][pl - 1]}</span>`; }
      if (o.bbK !== x) {
        o.bbK = x;
        let el = o.lbl.querySelector('.bb-x');
        if (!el) { el = document.createElement('span'); el.className = 'bb-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.bb-x')) o.bbK = '';
  }

  /* ---------- 2D yedek ---------- */
  flat2() {
    const w = this.vw || 360, h = this.vh || 640, land = w > h * 1.1;
    const top = land ? 70 : 96, bot = land ? h - 12 : Math.max(top + 200, h - (this.barH || 300) - 6);
    const aw = land ? w * 0.46 : w;
    const r = Math.max(60, Math.min(aw * 0.4, ((bot - top) / 2 - 40) / 0.8));
    return { cx: land ? aw / 2 : w / 2, cy: (top + bot) / 2 - 8, r, w, h };
  }
  flatPos(i) { const L = this.flat2(), a = this.seatAngle(i); return [L.cx + Math.cos(a) * L.r, L.cy + Math.sin(a) * L.r * 0.8]; }
  draw2d() {
    const g = this.g2;
    if (!g) return;
    const cv = this.el.cv;
    const L = this.flat2(), w = L.w, h = L.h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0d0f22'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#222a63';
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.78, L.r * 0.62, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
    this.draw2dGame(g, L);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const v = this.view;
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = '#c9d0ff'; g.fillText(fmt((v.scores || [])[i]), x, y + 45); }
    });
  }
  // 2D şekil çizimi (k: şık, s: yarıçap)
  shape2d(g, k, x, y, s) {
    g.beginPath();
    if (k === 0) { g.moveTo(x, y - s); g.lineTo(x + s * 0.95, y + s * 0.7); g.lineTo(x - s * 0.95, y + s * 0.7); g.closePath(); }
    else if (k === 1) g.arc(x, y, s * 0.85, 0, TAU);
    else if (k === 2) g.rect(x - s * 0.78, y - s * 0.78, s * 1.56, s * 1.56);
    else { g.moveTo(x, y - s * 1.05); g.lineTo(x + s * 0.75, y); g.lineTo(x, y + s * 1.05); g.lineTo(x - s * 0.75, y); g.closePath(); }
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v) return;
    const cx = L.cx, cy = L.cy, r = L.r, t = this.time, now = this.sNow();
    const sc = Math.min(1, r / 150);
    const P2 = (k) => [cx + GRID[k][0] * 46 * sc, cy + GRID[k][1] * 32 * sc];
    // sahne ve geri sayım lambaları
    g.fillStyle = '#1a1e3f';
    g.beginPath(); g.ellipse(cx, cy, 92 * sc, 70 * sc, 0, 0, TAU); g.fill();
    g.lineWidth = 2; g.strokeStyle = '#3a4180'; g.stroke();
    for (let k = 0; k < LED_N; k++) {
      const a = -Math.PI / 2 + (k / LED_N) * TAU;
      const [on, col] = this.ledState(k, t, now);
      g.fillStyle = on ? `rgb(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)})` : '#2a2e4a';
      g.beginPath(); g.arc(cx + Math.cos(a) * 84 * sc, cy + Math.sin(a) * 63 * sc, 3.5 * sc + 1, 0, TAU); g.fill();
    }
    const fin = v.phase === 'final';
    if (!fin) {
      for (let k = 0; k < 4; k++) {
        const [x, y] = P2(k), st = this.shpState(k);
        let s = 15 * sc + 3;
        g.save();
        if (st === 'ok') { s *= 1.3; g.shadowColor = OPTC[k]; g.shadowBlur = 22; }
        if (st === 'no' || st === 'cut') { g.globalAlpha = 0.3; s *= 0.8; }
        g.fillStyle = OPTC[k];
        this.shape2d(g, k, x, y + Math.sin(t * 1.6 + k * 1.7) * 2, s);
        g.fill();
        g.lineWidth = 2.5; g.strokeStyle = '#1c1633'; g.stroke();
        if (v.phase === 'question' && v.myChoice === k) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
        g.restore();
      }
      if (!(v.phase === 'reveal' && this.vDone)) { g.fillStyle = '#ffd23f'; g.font = `900 ${Math.round(22 * sc + 6)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, cy + Math.sin(t * 1.3) * 2); }
    }
    // durum işaretleri, toplar
    (v.seats || []).forEach((p, i) => {
      const [x0, y0] = this.flatPos(i);
      let mark = '';
      if (v.phase === 'question' && (v.picked || [])[i]) mark = '🔒';
      if (v.phase === 'reveal' && this.vDone && (v.inRound || [])[i]) { const c = (v.choices || [])[i]; mark = c === v.correct ? '✓' : c >= 0 ? '✗' : ''; }
      if (fin) { const pl = placeOf(v, i); mark = pl <= 3 && (v.scores || [])[i] > 0 ? ['🥇', '🥈', '🥉'][pl - 1] : ''; }
      if (mark) { g.font = '900 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = mark === '✓' ? '#2fbf71' : mark === '✗' ? '#ff4f5e' : '#ffd23f'; g.fillText(mark, x0, y0 - 29); }
      if (v.phase === 'question' && (v.picked || [])[i]) { g.fillStyle = pcol(p.c); g.beginPath(); g.arc(x0 + (cx - x0) * 0.22, y0 + (cy - y0) * 0.22, 6, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    });
    if (v.phase === 'reveal') {
      const O = this.order();
      O.forEach((o, n) => {
        const [x0, y0] = this.flatPos(o.i), [x1, y1] = P2(o.c);
        const a = (o.j / Math.max(1, o.n)) * TAU + t * 1.5;
        const tx = x1 + Math.cos(a) * 24 * sc, ty = y1 + Math.sin(a) * 18 * sc;
        const u = easeOut(clamp((now - (v.at || 0) - (FLY_T0 + n * FLY_GAP) * 1000) / (FLY_S * 1000), 0, 1));
        g.globalAlpha = this.vDone && o.c !== v.correct ? 0.35 : 1;
        g.fillStyle = pcol(v.seats[o.i]?.c ?? 0);
        g.beginPath(); g.arc(lerp(x0 + (cx - x0) * 0.22, tx, u), lerp(y0 + (cy - y0) * 0.22, ty, u) - Math.sin(u * Math.PI) * 30, 5.5, 0, TAU); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
        g.globalAlpha = 1;
      });
      if (this.vDone) {
        (v.gains || []).forEach((gn, i) => {
          if (!(gn > 0) || this.vT == null) return;
          const u = (t - this.vT) / 2.3;
          if (u > 1) return;
          const [x0, y0] = this.flatPos(i);
          g.globalAlpha = 1 - u * u;
          g.fillStyle = '#7dffb0'; g.font = '900 15px system-ui'; g.textAlign = 'center';
          g.fillText(`+${fmt(gn)}`, x0, y0 - 44 - u * 22);
          g.globalAlpha = 1;
        });
      }
    }
    // final: sütun grafiği
    if (fin) {
      const R = (v.rank || []).slice(0, 8);
      const mx = Math.max(1, ...(v.scores || [0]));
      const bw = Math.min(26, (150 * sc) / Math.max(1, R.length)), gap = 5;
      const x0 = cx - (R.length * (bw + gap) - gap) / 2, base = cy + 40 * sc;
      R.forEach((i, k) => {
        const u = this.towU(i);
        const hh = (8 + 72 * sc * ((v.scores || [])[i] || 0) / mx) * u;
        const x = x0 + k * (bw + gap);
        g.fillStyle = pcol(v.seats[i]?.c ?? 0);
        g.fillRect(x, base - hh, bw, hh);
        g.strokeStyle = '#1c1633'; g.lineWidth = 2; g.strokeRect(x, base - hh, bw, hh);
        const pl = placeOf(v, i);
        if (pl <= 3) { g.fillStyle = ['#ffd23f', '#dfe3f0', '#f0b88a'][pl - 1]; g.fillRect(x, base - hh - 5, bw, 5); }
        if (u > 0.98) { g.fillStyle = '#fff'; g.font = '900 10px system-ui'; g.textAlign = 'center'; g.fillText(fmt((v.scores || [])[i]), x + bw / 2, base - hh - 12); }
      });
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new QuizGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[bil]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
