// Bu mu Şu mu? — 3D dev terazi masası (NFC Dünyası Oyun)
// Masanın ortasında pirinçten dev bir terazi duruyor; iki kefesinin önünde iki seçeneğin tabelası var (turuncu A, mavi B).
// Herkes gizlice birini seçer (seçen karakterin bilyesi önüne konur, rengi belli ama tarafı belli değil). Herkes seçince
// bilyeler tek tek seçilen kefeye uçar, terazi her bilyede biraz daha o tarafa yatar ve sallanarak durur. Çoğunluk
// sevinir, azınlık omuz silker; masa tek yürek olursa konfeti patlar. Sonda "ruh ikizleri", "aykırı ruh" ve "masanın
// sesi" ilan edilir. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-f';
import * as sfx from '../sfx.js?v=2026-11-21-f';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

const PH = 1.3;                         // direğin boyu (masadan mafsala)
const BL = 1.08;                         // kolun yarı boyu (mafsaldan kefe askısına)
const CHN = 0.62;                         // askıdan kefeye zincir boyu
const PR = 0.36, PD = 0.09;              // kefe yarıçapı, derinliği
const BR = 0.072;                        // bilye yarıçapı
const SIGN_Z = 0.78, SIGN_W = 0.98, SIGN_H = 0.52, SIGN_TILT = 0.9;
const FLY_T0 = 0.5, FLY_GAP = 0.16, FLY_S = 0.62, SETTLE_S = 0.9;
const SIDEC = ['#ff9f1c', '#3a86ff'];
const SIDE3 = SIDEC.map((h) => { const n = parseInt(h.slice(1), 16); return new Float32Array([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]); });
const GOLD3 = new Float32Array([1, 0.84, 0.36]), PINK3 = new Float32Array([1, 0.45, 0.65]);
const PAN3 = SIDE3.map((c) => new Float32Array([0.55 + c[0] * 0.45, 0.55 + c[1] * 0.45, 0.55 + c[2] * 0.45]));
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const LBL = ['A', 'B'];

const STYLE = `
#ky.bms .msg{top:13%}
#ky.bms .bm-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 11px 10px;text-align:center}
#ky.bms .bm-box.dark{background:#231a12;color:#fff}
#ky.bms .bm-q{border-radius:16px;background:#5a3a1a;color:#fff;padding:6px 12px 8px;border:3px solid var(--ink)}
#ky.bms .bm-q small{display:block;font-size:11.5px;font-weight:900;letter-spacing:.08em;opacity:.85}
#ky.bms .bm-q b{display:block;font-size:clamp(16px,4.6vw,20px);font-weight:900;line-height:1.2;margin-top:1px;text-wrap:balance}
#ky.bms .bm-two{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px;align-items:stretch}
#ky.bms .bm-o{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:86px;border:3px solid var(--ink);border-radius:16px;box-shadow:3px 3px 0 var(--ink);padding:8px 8px 9px;font-weight:900;font-size:clamp(14px,4.1vw,17px);line-height:1.2;background:var(--sc);color:#1c1633;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow-wrap:anywhere;text-wrap:balance}
#ky.bms .bm-o .lt{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#1c1633;color:#fff;font-size:14px;font-weight:900;flex:0 0 auto}
#ky.bms .bm-o.on{outline:4px solid #ffd23f;outline-offset:2px;transform:translateY(-2px)}
#ky.bms .bm-o.off{filter:saturate(.45) brightness(1.08);opacity:.78}
#ky.bms .bm-o:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.bms .bm-o em{font-style:normal;font-size:11.5px;font-weight:900;border-radius:99px;padding:1px 8px;background:#1c1633;color:#fff}
#ky.bms .bm-or{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;width:30px;height:30px;border-radius:50%;background:#fbf7ef;border:3px solid var(--ink);display:grid;place-items:center;font-weight:900;font-size:11px;color:var(--ink);pointer-events:none}
#ky.bms .bm-tw{position:relative}
#ky.bms .bm-ft{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800}
#ky.bms .bm-ft .n{background:#5a3a1a;color:#fff;border-radius:99px;padding:2px 9px}
#ky.bms .bm-ft .z{opacity:.72}
#ky.bms .bm-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:7px 13px;font-weight:900;font-size:14.5px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.bms .bm-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:12.5px;padding:4px 9px;border-width:2px}
#ky.bms .bm-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.bms .bm-h{font-size:clamp(17px,4.8vw,21px);font-weight:900;line-height:1.2;margin-top:7px;text-wrap:balance}
#ky.bms .bm-s{font-size:12.5px;font-weight:700;opacity:.78;margin-top:3px;text-wrap:balance}
#ky.bms .bm-row{display:flex;gap:8px;justify-content:center;margin-top:8px}
#ky.bms .bm-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:8px}
#ky.bms .bm-tm i{display:block;height:100%;background:#ff5a36;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.bms .bm-res{display:grid;gap:6px;margin-top:8px;text-align:left}
#ky.bms .bm-r{position:relative;border:3px solid var(--ink);border-radius:14px;overflow:hidden;background:#fff;min-height:44px}
#ky.bms .bm-r .fill{position:absolute;inset:0 auto 0 0;background:var(--sc);opacity:.9;transform-origin:left center}
#ky.bms .bm-r .in{position:relative;display:flex;align-items:center;gap:8px;padding:5px 9px}
#ky.bms .bm-r .lt{flex:0 0 auto;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#1c1633;color:#fff;font-size:13px;font-weight:900}
#ky.bms .bm-r .tx{flex:1;min-width:0;font-weight:900;font-size:14px;line-height:1.2;overflow-wrap:anywhere}
#ky.bms .bm-r .pc{flex:0 0 auto;font-weight:900;font-size:19px;font-variant-numeric:tabular-nums}
#ky.bms .bm-r .dots{display:flex;flex-wrap:wrap;gap:2px;max-width:80px;justify-content:flex-end}
#ky.bms .bm-r .dots i{width:11px;height:11px;border-radius:50%;background:var(--pc);border:1.5px solid var(--ink)}
#ky.bms .bm-r.mine{box-shadow:0 0 0 3px #ffd23f}
#ky.bms .lbl .bm-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.bms .lbl .bm-x:empty{display:none}
#ky.bms .lbl .bm-v{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:50%;background:var(--sc);color:#1c1633;font-weight:900;font-size:.82em;line-height:1;border:1.5px solid #1c1633}
#ky.bms .lbl .bm-m{display:inline-block;padding:0 4px;border-radius:9px;background:#ffd23f;color:#1c1633;font-weight:900;font-size:.85em;line-height:1.35}
#ky.bms .bm-pct{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(18px,5.2vw,26px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#fff;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;transition:opacity .25s}
#ky.bms .bm-pct.on{opacity:1}
#ky.bms .card .bm-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.bms .card .bm-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.bms .card .bm-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.bms .card .bm-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.bms .card .bm-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.bms .card .bm-seg button.on{background:var(--ink);color:#fff}
#ky.bms .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.bms .card .bm-aw{display:grid;gap:5px;margin-top:10px}
#ky.bms .card .bm-aw div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:6px 10px;background:#fff;color:var(--ink);font-weight:800;font-size:13.5px;text-align:left}
#ky.bms .card .bm-aw div b{font-size:20px;flex:0 0 auto}
#ky.bms .card .bm-aw div span{flex:1;min-width:0}
#ky.bms .card .bm-aw div em{font-style:normal;font-weight:900;white-space:nowrap}
#ky.bms .card .bm-tb{display:grid;gap:4px;margin-top:8px;max-height:min(24vh,200px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.bms .card .bm-tb>div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.bms .card .bm-tb>div.me{background:#fff4c2}
#ky.bms .card .bm-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.bms .card .bm-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.bms .card .bm-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.78;white-space:nowrap}
#ky.bms .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.bms .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.bms .bm-box{width:min(460px,54vw);padding:6px 9px 8px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.bms .bm-q{padding:5px 10px 6px}#ky.bms .bm-q b{font-size:15px}
#ky.bms .bm-o{min-height:64px;padding:6px;font-size:14px}
#ky.bms .bm-two{margin-top:6px}
#ky.bms .bm-ft{margin-top:5px}
#ky.bms .bm-h{font-size:16px;margin-top:5px}
#ky.bms .bm-tm{margin-top:5px}
#ky.bms .card .bm-tb{max-height:20vh}
#ky.bms .card .bm-ru{margin-top:6px}#ky.bms .card .bm-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.bms .card .bm-ru div b{font-size:17px}
#ky.bms .card .bm-seg{margin-top:6px}#ky.bms .card .bm-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.bms .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, sonuç, final): neşeli yarışma programı (Sol majör, 116 bpm): marimba, el çırpma, zıplayan bas.
// 'race' (seçim): düşünme müziği (Re majör, 104 bpm): pizzicato, saat tıkırtısı, hafif pad.
// 'mute' (bilyeler kefeye düşerken): müzik susar, davul gümbürtüsü çalar.
class BmSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 104 : 116; }
  swing() { return this.mode === 'race' ? 0.02 : 0.08; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // D – Bm – G – A
      const CH = [[50, [62, 66, 69]], [47, [62, 66, 71]], [43, [62, 67, 71]], [45, [61, 64, 69]]];
      const [root, ch] = CH[bar % 4];
      if (s === 0 || s === 8) this.iKick(t, 0.07, 100, 45, 0.18);
      if (s % 2 === 0) this.iTick(t, s % 4 === 0 ? 0.022 : 0.011);
      const ARP = [0, 1, 2, 1];
      if (s % 2 === 0) this.iPizz(t, ch[ARP[(s >> 1) % 4]] + (s % 8 === 6 ? 12 : 0), 0.05, 0.16, 0.15);
      if (s === 0) this.iBass(t, root - 12, spb * 1.8, 0.07, 'up');
      if (s === 8) this.iBass(t, root - 12 + 7, spb * 1.5, 0.05, 'up');
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((m) => m - 12), spb * 8, 0.012, 1000, 0.3);
      if (s === 14 && bar % 4 === 3) this.iBell(t, 81, 0.012, spb, 0.3);
      return;
    }
    // G – Em – C – D (zıplayan)
    const CH = [[43, [67, 71, 74]], [40, [67, 71, 76]], [36, [67, 72, 76]], [38, [66, 69, 74]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0 || s === 8) this.iKick(t, 0.09, 110, 46, 0.16);
    if (s === 4 || s === 12) this.iClap(t, 0.05);
    if (s % 2 === 1) this.iHat(t, 0.014);
    if (s === 0 || s === 6 || s === 10) this.iBass(t, (s === 6 ? root + 7 : root) - 12, spb * 0.5, 0.11, 'up');
    if (s === 14) this.iBass(t, root - 12 + 12, spb * 0.25, 0.08, 'up');
    const MEL = [[79, null, 76, null, 74, 76, null, 79], [76, null, 74, null, 71, null, 74, null], [72, null, 76, null, 79, 81, null, 79], [78, null, 76, null, 74, null, null, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null) this.iMarimba(t, m, 0.055, 0.2);
    if (s === 2 || s === 10) ch.forEach((x, k) => this.iPluck(t + k * 0.005, x - 12, 0.022, st * 1.6, 'triangle', 2400, 0.2));
    if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((x) => x - 12), spb * 8, 0.01, 1200, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'pickA': case 'pickB': { // seçim: tok bir "tık" ve tarafa göre ton
        const f = name === 'pickA' ? 523 : 659;
        this.tone(f, t, 0.08, 'triangle', 0.07, null, 0.002);
        this.tone(f * 1.5, t + 0.05, 0.1, 'triangle', 0.05, null, 0.002);
        break;
      }
      case 'marble': // bilye masaya kondu
        this.tone(2100, t, 0.03, 'sine', 0.05, null, 0.001);
        this.tone(1400, t + 0.02, 0.04, 'triangle', 0.035, null, 0.001);
        break;
      case 'clink': { // bilye kefeye düştü (a: kefedeki bilye sayısı → ses yükselir)
        const n = Math.max(1, a || 1);
        const f = 1300 * Math.pow(2, Math.min(10, n - 1) / 12);
        this.tone(f, t, 0.12, 'sine', 0.07, null, 0.001);
        this.tone(f * 2.7, t + 0.004, 0.06, 'sine', 0.03, null, 0.001);
        this.noise(t, 0.04, 0.03, { type: 'highpass', freq: 5000, q: 0.7 });
        break;
      }
      case 'creak': // terazi yatıyor
        this.noise(t, 0.28, 0.035, { type: 'bandpass', freq: 600, to: 380, q: 6, attack: 0.03 });
        this.tone(160, t, 0.25, 'sawtooth', 0.012, 130, 0.03);
        break;
      case 'united': // masa tek yürek
        this.duck(0.2, 2.2);
        [[67, 0], [71, 0.1], [74, 0.2], [79, 0.32]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.05, 1.2, 0.3));
        this.cheer(t + 0.2, 1.6);
        break;
      case 'split': // ikiye bölündü / berabere
        this.tone(330, t, 0.18, 'square', 0.04, 300, 0.005);
        this.tone(311, t + 0.2, 0.3, 'square', 0.04, 280, 0.005);
        break;
      case 'major': // çoğunluktayım
        [[784, 0], [988, 0.08], [1175, 0.16]].forEach(([f, d]) => this.tone(f, t + d, 0.18, 'triangle', 0.06, null, 0.002));
        break;
      case 'minor': // azınlıktayım
        this.tone(440, t, 0.16, 'triangle', 0.06, 392, 0.01);
        this.tone(370, t + 0.16, 0.3, 'triangle', 0.06, 330, 0.01);
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
// taban, direk ve tepedeki top (orijin masa üstü)
function standModel(mb) {
  const Au = C('#d8a83a', -0.9), Dk = C('#8a5a12', -0.6), Wd = C('#5e3b20', -0.5);
  mb.lathe(0, 0, 0, [[0, 0], [0.32, 0], [0.33, 0.025], [0.3, 0.055], [0.14, 0.07], [0, 0.07]], 28, () => Wd);
  mb.lathe(0, 0.055, 0, [[0, 0], [0.09, 0], [0.07, 0.05], [0.035, 0.08], [0.035, 0.1]], 20, () => Au);
  limb(mb, [0, 0.12, 0], [0, PH - 0.04, 0], [0.042, 0.036], Au, 12);
  mb.sphereS(0, PH + 0.035, 0, 0.055, 0.055, 0.055, Au, 16, 10);
  mb.sphereS(0, PH + 0.1, 0, 0.03, 0.03, 0.03, Dk, 10, 6);
}
// kol: mafsal orijinde, iki uçta askı halkası (dönmeden önce yatay)
function beamModel(mb) {
  const Au = C('#e2b448', -0.9), Dk = C('#8a5a12', -0.6);
  limb(mb, [-BL - 0.02, 0, 0], [BL + 0.02, 0, 0], [0.032, 0.032], Au, 12);
  mb.sphereS(0, 0, 0, 0.05, 0.05, 0.06, Dk, 12, 8);
  for (const sx of [-1, 1]) {
    mb.sphereS(sx * (BL + 0.03), 0, 0, 0.034, 0.034, 0.034, Au, 10, 6);
    limb(mb, [sx * BL, -0.01, 0], [sx * BL, -0.06, 0], [0.008, 0.008], Dk, 6);
  }
  // kolun ortasında ibre (aşağı bakar)
  limb(mb, [0, -0.02, 0.05], [0, -0.3, 0.05], [0.012, 0.004], Dk, 6);
}
// kefe: askı noktası orijinde; zincirler ve sığ çanak (rengi tarafa göre boyanır: beyaz çanak, renkli kenar ayrı)
function panModel(mb) {
  const Au = C('#d8a83a', -0.9);
  const y = -CHN;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    limb(mb, [0, -0.06, 0], [Math.cos(a) * PR * 0.92, y + PD * 0.9, Math.sin(a) * PR * 0.92], [0.005, 0.005], Au, 5);
  }
  mb.lathe(0, y, 0, [[0, 0], [PR * 0.55, 0.004], [PR * 0.9, PD * 0.5], [PR, PD], [PR * 1.04, PD * 1.05], [PR * 0.97, PD * 1.1], [PR * 0.88, PD * 0.62], [PR * 0.5, PD * 0.18], [0, PD * 0.16]], 26, () => C('#e8c25a', -0.85));
}
function rimModel(mb) {
  const y = -CHN;
  mb.lathe(0, y, 0, [[PR * 1.1, PD * 0.85], [PR * 1.1, PD * 1.25], [PR * 0.97, PD * 1.25], [PR * 0.97, PD * 0.85]], 26, () => C('#ffffff', -0.3));
}
function marbleModel(mb) { mb.sphereS(0, 0, 0, BR, BR, BR, C('#ffffff', 0.25), 16, 10); }
// tabela gövdesi (orijin alt kenar ortası, ön yüz +z)
function signModel(mb) {
  mb.rbox(-SIGN_W / 2 - 0.014, -0.014, -0.018, SIGN_W / 2 + 0.014, SIGN_H + 0.014, 0.004, 0.012, C('#2a1d12', -0.4), 1);
  mb.rbox(-SIGN_W / 2, 0, -0.012, SIGN_W / 2, SIGN_H, 0.012, 0.012, C('#fbf3e0', -0.25), 1);
}
function signFaceModel(tb) {
  const x0 = -SIGN_W / 2 + 0.012, x1 = SIGN_W / 2 - 0.012, y0 = 0.012, y1 = SIGN_H - 0.012, z = 0.0135;
  tb.tquad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], 0, 0, 1, 1, [0, 0, 0]);
}
function signStandModel(mb) {
  const Wd = C('#8a5a33', -0.5), Dk = C('#5e3b20', -0.5);
  const zb = -SIGN_H * Math.sin(SIGN_TILT), yb = SIGN_H * Math.cos(SIGN_TILT);
  mb.rbox(-SIGN_W / 2 + 0.02, 0, -0.02, SIGN_W / 2 - 0.02, 0.034, 0.035, 0.01, Wd, 1);
  mb.rbox(-SIGN_W / 2 + 0.07, 0, zb - 0.03, SIGN_W / 2 - 0.07, yb - 0.02, zb + 0.05, 0.012, Dk, 1);
}
// tabela dokusu (512×274): büyük harf rozeti ve seçenek
function drawSign(cv, k, text) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.fillStyle = '#fbf3e0'; g.fillRect(0, 0, W, H);
  g.fillStyle = SIDEC[k]; g.fillRect(0, 0, W, 16); g.fillRect(0, H - 16, W, 16);
  g.strokeStyle = SIDEC[k]; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = SIDEC[k];
  g.beginPath(); g.arc(78, H / 2, 52, 0, TAU); g.fill();
  g.lineWidth = 7; g.strokeStyle = '#1c1633'; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 64px ${F}`;
  g.fillText(LBL[k], 78, H / 2 + 4);
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const box = { x: 150, w: W - 176, h: H - 56 };
  let fs = 60, lines = [];
  for (; fs >= 26; fs -= 2) {
    g.font = `900 ${fs}px ${F}`;
    lines = [];
    let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width <= box.w || !cur) cur = t; else { lines.push(cur); cur = wd; } }
    if (cur) lines.push(cur);
    if (lines.length * fs * 1.12 <= box.h && lines.every((L) => g.measureText(L).width <= box.w)) break;
  }
  if (lines.length * fs * 1.12 > box.h) { lines = lines.slice(0, Math.max(1, Math.floor(box.h / (fs * 1.12)))); lines[lines.length - 1] += '…'; }
  g.fillStyle = '#1c1633'; g.textAlign = 'left'; g.textBaseline = 'top';
  const lh = fs * 1.12, y0 = (H - lines.length * lh) / 2 + 2;
  lines.forEach((L, i) => g.fillText(L, box.x, y0 + i * lh));
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/* ============================ oyun ============================ */
class ScaleGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'bms', cls: 'bms', title: 'Bu mu Şu mu?', sub: 'İki seçenek, tek karar', emoji: '⚖️', css: STYLE, snd: new BmSnd(), amb: 'diner', ambVol: 0.4, botPx: 300, botPxL: 34, cloth: '#6b3f1f', trim: '#ffd23f', tea: false, place: false, chairPad: '#3a86ff', fog: '#1a120c', roomStyle: { wall: '#2b2118', curtain: '#c0582b' } });
    this.pickSeen = new Map();   // seçen → masaya bilye konduğu an
    this.th = 0; this.thV = 0;   // kolun açısı ve hızı (pozitif: B tarafı aşağı)
    this.sw = [0, 0]; this.swV = [0, 0]; // kefelerin salınımı
    this.landN = 0;
    this.signKey = '';
    this.mT = M.make(); this.mT2 = M.make(); this.mBeam = M.make();
    this.tint = new Float32Array(3);
    this.pctEl = [0, 1].map(() => { const e = document.createElement('div'); e.className = 'bm-pct'; this.el.wrap.appendChild(e); return e; });
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.bmStand = this.mk(standModel);
    W.bmBeam = this.mk(beamModel);
    W.bmPan = this.mk(panModel);
    W.bmRim = this.mk(rimModel);
    W.bmMarble = this.mk(marbleModel);
    W.bmSign = this.mk(signModel);
    W.bmSignF = this.mk(signFaceModel, 'tex');
    W.bmSignS = this.mk(signStandModel);
    W.trophy = this.mk(K.trophyModel);
    this.signCv = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 274; return c; });
    this.signTex = this.signCv.map((c) => makeTexture(this.X, c));
    this.signKey = '';
    try { document.fonts?.ready?.then(() => { if (!this.dead) this.signKey = ''; }); } catch { /* yok */ }
  }
  freeTex() { const gl = this.X && this.X.gl; if (gl && this.signTex) this.signTex.forEach((t) => gl.deleteTexture(t)); this.signTex = null; }
  onDispose() { this.pctEl.forEach((e) => e.remove()); }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  // açılış zaman çizelgesi: seçenlerin bilyeleri sırayla kefeye uçar
  order() { const v = this.view; const L = []; (v.sides || [[], []]).forEach((S, k) => S.forEach((i) => L.push({ i, k }))); L.sort((a, b) => a.i - b.i); return L; }
  landAt(n) { return (this.view.at || 0) + (FLY_T0 + n * FLY_GAP + FLY_S) * 1000; }
  doneAt() { const n = this.order().length; return (this.view.at || 0) + (FLY_T0 + Math.max(0, n - 1) * FLY_GAP + FLY_S + SETTLE_S) * 1000; }
  shown() { const v = this.view; return !!v && v.phase === 'reveal' && this.sNow() >= this.doneAt(); }
  landed() {
    const v = this.view, now = this.sNow(), out = [0, 0];
    if (!v || v.phase !== 'reveal') return out;
    this.order().forEach((o, n) => { if (now >= this.landAt(n)) out[o.k]++; });
    return out;
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'bm-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'bm-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'bm-pick') {
        if (!v || v.phase !== 'answer' || !v.amIn) return;
        const c = +b.dataset.c;
        if (v.myChoice === c) return;
        this.fx(c ? 'pickB' : 'pickA'); vibrate(15);
        this.ctx.send('pick', { choice: c });
      }
      else if (act === 'bm-reveal') { this.fx('pop'); this.ctx.send('reveal', {}); }
      else if (act === 'bm-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.bms !== '1') { root.dataset.bms = '1'; root.innerHTML = '<p class="py-16 text-center">⚖️</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'answer') {
      (v.seats || []).forEach((p, i) => {
        if (!(v.picked || [])[i] || this.pickSeen.has(p.id)) return;
        this.pickSeen.set(p.id, this.time);
        if (prev && prev.phase === 'answer' && i !== v.me) this.fx('marble');
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
    if (v.phase === 'answer') {
      mus('race');
      this.pickSeen = new Map((v.seats || []).filter((p, i) => (v.picked || [])[i]).map((p) => [p.id, -9]));
      this.signsT = this.time - (fresh ? 0 : 9);
      this.signKey = '';
      this.shownFx = false;
      if (fresh) { this.fx('ding'); this.msg(`⚖️ ${v.round}/${v.rounds}`, 'mid'); }
    }
    if (v.phase === 'reveal') {
      mus('mute');
      const now = this.sNow();
      this.landN = this.order().filter((o, n) => now >= this.landAt(n)).length;
      this.shownFx = now >= this.doneAt() + 400;
      if (fresh && this.order().length) {
        const d = Math.max(0.6, (this.doneAt() - (v.at || 0)) / 1000 - SETTLE_S - 0.2);
        const pk = this.phKey;
        setTimeout(() => { if (!this.dead && this.phKey === pk) this.fx('drumroll', d); }, 200);
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!late) {
        this.fx('champ');
        this.msg('⚖️ MASA TARTILDI', 'big');
        const T = v.twins ? [v.twins.a, v.twins.b] : [];
        T.forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 36, [[1, 0.45, 0.65], [1, 0.8, 0.9], [1, 1, 1]], 2.2, 0.035, false, 2, 2.2); });
      }
    }
  }
  // bilyeler bitti: sonuç sesi ve mesajı
  onShown() {
    const v = this.view;
    const n0 = (v.sides || [[]])[0].length, n1 = (v.sides || [[], []])[1].length;
    try { this.snd.music('idle'); } catch { /* yok */ }
    if (v.united) {
      this.fx('united'); this.msg('🤝 MASA TEK YÜREK!', 'big');
      const k = n0 ? 0 : 1, p = this.panW(k);
      if (this.X) this.burst(p[0], p[1] + 0.3, p[2], 60, [[1, 0.85, 0.3], [SIDE3[k][0], SIDE3[k][1], SIDE3[k][2]], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.4);
    } else if (v.maj < 0) { this.fx('split'); this.msg(n0 + n1 ? '⚔️ MASA İKİYE BÖLÜNDÜ' : '🤷 KİMSE SEÇMEDİ', 'mid'); }
    else if (v.myChoice >= 0) { if (v.myChoice === v.maj) { this.fx('major'); this.msg('📣 ÇOĞUNLUKTASIN', 'mid'); } else { this.fx('minor'); this.msg('🦄 AYKIRI RUH', 'mid'); vibrate([20, 30, 20]); } }
    else this.msg(`⚖️ ${esc(LBL[v.maj])} KAZANDI`, 'mid');
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const top = [0, TABLE_Y + PH * 0.75, 0];
    const shown = this.shown();
    const su = shown ? (now - this.doneAt()) / 1000 : 0;
    const side = (i) => { const S = v.sides || [[], []]; return S[0].includes(i) ? 0 : S[1].includes(i) ? 1 : -1; };
    const twins = v.phase === 'final' && v.twins ? [v.twins.a, v.twins.b] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.bmI || (a.bmI = { lt: 0, look: null });
      const idleLook = (pC = 0.25) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > pC ? P[Math.floor(Math.random() * P.length)] : top;
        }
        return idle.look;
      };
      if (v.phase === 'answer') {
        const did = !!(v.picked || [])[i];
        const ct = this.pickSeen.get(p.id);
        if (did && ct != null && t - ct < 0.45) {
          a.pose('rest', { t, k: 14 });
          a.tgt.hand[1] = [0.06, TABLE_Y + 0.07, 0.6];
          a.tgt.palm[1] = [0, -1, 0.2]; a.tgt.fdir[1] = [0, -0.2, 1];
          a.shape[1] = 'open';
          a.expr = 'grin';
          a.look = this.seatW(a, 0.06, TABLE_Y, 0.64);
          return;
        }
        if (!did && (v.inRound || [])[i]) { a.pose(Math.floor(t / 3.5 + i) % 3 === 0 ? 'rest' : 'chin', { t }); a.expr = Math.floor(t / 3 + i) % 3 === 0 ? 'o' : 'smile'; a.look = Math.floor(t / 2 + i) % 3 ? this.signW(Math.floor(t / 2.6 + i) % 2) : idleLook(0.3); }
        else { a.pose(hs(i, v.round) < 0.5 ? 'clasp' : 'rest', { t }); a.expr = 'grin'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        if (!shown) { a.pose(hs(i, v.round + 3) < 0.5 ? 'bite' : 'clasp', { t }); a.expr = 'tense'; a.look = top; return; }
        const k = side(i);
        if (v.united && k >= 0) { a.pose(su < 2 ? 'cheer' : Math.floor(su / 1.4 + i) % 2 ? 'clap' : 'wave', { t }); a.expr = 'laugh'; a.look = idleLook(); return; }
        if (k < 0) { a.pose('shrug', { t }); a.expr = 'smile'; a.look = top; return; }
        if (v.maj < 0) { a.pose(su < 1.6 ? 'shrug' : 'rest', { t }); a.expr = 'grin'; a.look = idleLook(0.1); return; }
        if (k === v.maj) { a.pose(su < 1.8 ? 'cheer' : Math.floor(su / 1.5 + i) % 2 ? 'clap' : 'rest', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else { a.pose(su < 1.8 ? (hs(i, 4) < 0.5 ? 'shrug' : 'facepalm') : 'rest', { t }); a.expr = su < 1.8 ? 'wince' : 'grin'; a.look = idleLook(0.2); }
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        if (twins.includes(i)) { const o = this.avatarAt(twins[0] === i ? twins[1] : twins[0]); a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'wave', { t }); a.expr = 'laugh'; a.look = o && o !== a ? o.headW : idleLook(); }
        else if ((v.rebel || []).includes(i) || (v.voice || []).includes(i)) { a.pose(Math.floor(u / 2.5) % 2 ? 'wave' : 'cheer', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; a.look = idleLook(); }
        return;
      }
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = idleLook();
    });
  }

  /* ---------- terazi fiziği, kamera, sesler ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time, now = this.sNow();
    // açılış: her bilye kefeye düşünce ses, kol biraz daha yatar
    let target = 0;
    if (v.phase === 'reveal') {
      const L = this.landed();
      const n = L[0] + L[1];
      if (n > this.landN) {
        const o = this.order()[n - 1];
        this.landN = n;
        if (o) { this.fx('clink', L[o.k]); this.thV += (o.k ? 1 : -1) * 0.9; this.swV[o.k] += 1.6; if (n % 3 === 1) this.fx('creak'); }
      }
      target = clamp((L[1] - L[0]) * 0.075, -0.34, 0.34);
      if (!this.shownFx && now >= this.doneAt()) { this.shownFx = true; this.onShown(); }
    } else if (v.phase === 'answer') target = Math.sin(t * 0.9) * 0.05;
    else target = Math.sin(t * 0.6) * 0.03;
    // yay-sönüm: kol hedef açıya sallanarak gelir; kefeler kendi salınımlarıyla
    this.thV += (-(this.th - target) * 18 - this.thV * 3.2) * dt;
    this.th += this.thV * dt;
    for (let k = 0; k < 2; k++) { this.swV[k] += (-this.sw[k] * 14 - this.swV[k] * 2.4 - this.thV * 0.6) * dt; this.sw[k] += this.swV[k] * dt; }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.45, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'answer' || v.phase === 'reveal') {
      zoom = land ? 1.15 : 0.72; pa = land ? -0.08 : -0.2; bp = Math.max(170, this.barH || 300); sy = land ? 0.52 : 0.46; sx = land ? 0.25 : 0.5;
      H = [0, TABLE_Y + 0.55, 0.05];
    } else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (Math.abs(bp - this.cfg.botPx) > 12) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // son saniyeler: henüz seçmediysem tıkırtı
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'answer' && v.amIn && v.myChoice < 0 && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.6); } }
    this.placePct();
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  // kefelerin üstünde yüzdeler (bilyeler bitince)
  placePct() {
    const v = this.view;
    const on = !!v && v.phase === 'reveal' && this.shown() && !this.flat;
    const S = (v && v.sides) || [[], []];
    const n = S[0].length + S[1].length;
    for (let k = 0; k < 2; k++) {
      const e = this.pctEl[k];
      if (!on) { if (e.classList.contains('on')) e.classList.remove('on'); continue; }
      const p = this.panW(k);
      const q = this.project(p[0], p[1] + 0.32, p[2]);
      if (!q) continue;
      const txt = `%${n ? Math.round((S[k].length / n) * 100) : 0}`;
      if (e.textContent !== txt) e.textContent = txt;
      e.style.left = `${q[0].toFixed(1)}px`; e.style.top = `${q[1].toFixed(1)}px`;
      e.style.color = SIDEC[k];
      e.classList.add('on');
    }
  }

  /* ---------- çizim ---------- */
  // kolun ucu (askı noktası) ve kefenin dünya konumu
  hangW(k) { const s = k ? 1 : -1, c = Math.cos(this.th), sn = Math.sin(this.th); return [s * BL * c, TABLE_Y + PH - s * BL * sn, 0]; }
  panW(k) { const h = this.hangW(k); return [h[0], h[1] - CHN + PD * 0.5, h[2]]; }
  signW(k) { return [(k ? 1 : -1) * 0.58, TABLE_Y + 0.2, SIGN_Z - 0.12]; }
  // kefedeki j. bilyenin yeri (halka halka, üst üste)
  inPan(k, j) {
    const p = this.panW(k);
    const ring = j < 1 ? 0 : j < 7 ? 1 : 2, idx = j < 1 ? 0 : j < 7 ? j - 1 : j - 7, cnt = ring === 0 ? 1 : ring === 1 ? 6 : 12;
    const r = ring === 0 ? 0 : ring === 1 ? BR * 2.05 : BR * 1.1, a = (idx / cnt) * TAU + ring * 0.4;
    const y = p[1] - PD * 0.35 + BR + (ring === 2 ? BR * 1.4 : ring === 1 ? BR * 0.25 : 0);
    return [p[0] + Math.cos(a) * r, y, p[2] + Math.sin(a) * r];
  }
  marbleSpot(a) { return this.seatW(a, 0.05, TABLE_Y + BR, 0.66); }
  colOf(i) { const p = this.seats[i]; const c = rgb3(pcol(p ? p.c : 0)); this.tint[0] = c[0]; this.tint[1] = c[1]; this.tint[2] = c[2]; return this.tint; }
  signsOn() { const v = this.view; return !!v && (v.phase === 'answer' || v.phase === 'reveal') && Array.isArray(v.options); }
  signMat(m, k) {
    const u = easeOut((this.time - (this.signsT ?? -9) - k * 0.12) / 0.5);
    M.set(m, (k ? 1 : -1) * 0.58, TABLE_Y + 0.03 - (1 - u) * 0.3, SIGN_Z, (k ? -1 : 1) * 0.12, -SIGN_TILT, 0, Math.max(0.001, u));
    return m;
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.bmStand || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T, t = this.time, now = this.sNow();
    // terazi
    M.set(m, 0, TABLE_Y + 0.002, 0);
    D(Wd.bmStand, m, T.obj);
    M.set(this.mBeam, 0, TABLE_Y + PH, 0, 0, 0, -this.th);
    D(Wd.bmBeam, this.mBeam, T.obj);
    for (let k = 0; k < 2; k++) {
      const h = this.hangW(k);
      M.set(mc, h[0], h[1] - 0.06, h[2], 0, this.sw[k] * 0.12, this.sw[k] * 0.08);
      M.set(this.mT, 0, 0.06, 0);
      M.mul(this.mT2, mc, this.mT);
      D(Wd.bmPan, this.mT2, PAN3[k]);
      D(Wd.bmRim, this.mT2, SIDE3[k]);
    }
    // tabelalar
    if (this.signsOn()) {
      for (let k = 0; k < 2; k++) {
        M.set(m, (k ? 1 : -1) * 0.58, TABLE_Y + 0.002, SIGN_Z, (k ? -1 : 1) * 0.12);
        D(Wd.bmSignS, m, T.obj);
        D(Wd.bmSign, this.signMat(mc, k), T.obj);
      }
    }
    // seçim: seçenlerin bilyeleri önlerinde
    if (v.phase === 'answer') {
      this.seats.forEach((p, i) => {
        if (!(v.picked || [])[i]) return;
        const a = this.av.get(p.id);
        if (!a) return;
        const ct = this.pickSeen.get(p.id) ?? -9;
        const u = clamp((t - ct - 0.25) / 0.3, 0, 1);
        const q = this.marbleSpot(a);
        M.set(m, q[0], q[1] + (1 - easeOut(u)) * 0.18, q[2]);
        D(Wd.bmMarble, m, this.colOf(i));
      });
    }
    // açılış: bilyeler kefeye uçar, düşenler kefede durur (kefeyle birlikte iner kalkar)
    if (v.phase === 'reveal') {
      const stack = [0, 0];
      this.order().forEach((o, n) => {
        const a = this.avatarAt(o.i);
        if (!a) return;
        const j = stack[o.k]++;
        const p1 = this.inPan(o.k, j);
        const u = clamp((now - (v.at || 0) - (FLY_T0 + n * FLY_GAP) * 1000) / (FLY_S * 1000), 0, 1);
        let p = p1;
        if (u < 1) { const p0 = this.marbleSpot(a), e = easeOut(u); p = [lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e) + Math.sin(u * Math.PI) * 0.55, lerp(p0[2], p1[2], e)]; }
        M.set(m, p[0], p[1], p[2]);
        D(Wd.bmMarble, m, this.colOf(o.i));
      });
    }
    // final: ruh ikizlerinin önünde kupa
    if (v.phase === 'final' && !shadow && v.twins) {
      [v.twins.a, v.twins.b].forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, 0, TABLE_Y + 0.004, 0.62);
        const u = clamp((t - (this.finT || 0) - 0.8) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.2 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  drawShadowsExtra(m) {
    if (!this.res || !this.res.shadow) return;
    M.set(m, 0, TABLE_Y + 0.008, 0, 0, 0, 0, 0.6, 1, 0.6);
    drawMesh(this.X, this.res.shadow, m, ONE3, 0.5);
    for (let k = 0; k < 2; k++) { const p = this.panW(k); M.set(m, p[0], TABLE_Y + 0.008, p[2], 0, 0, 0, 0.6, 1, 0.6); drawMesh(this.X, this.res.shadow, m, ONE3, 0.32); }
  }
  syncSigns() {
    const v = this.view;
    if (!this.signTex || !this.signsOn()) return;
    const key = `${v.game}|${v.round}|${v.options.join('|')}`;
    if (key === this.signKey) return;
    this.signKey = key;
    for (let k = 0; k < 2; k++) { try { drawSign(this.signCv[k], k, v.options[k]); updateTexture(this.X, this.signTex[k], this.signCv[k]); } catch { /* yok */ } }
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.bmSignF || !this.signTex || !this.signsOn()) return;
    this.syncSigns();
    const mc = this.mats.c;
    gl.uniform1f(X.tex.u.uSelf, 0.55);
    for (let k = 0; k < 2; k++) { gl.bindTexture(gl.TEXTURE_2D, this.signTex[k]); drawMesh(X, Wd.bmSignF, this.signMat(mc, k), ONE3); }
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const v = this.view;
    if (!v || !this.res) return;
    const t = this.time;
    // seçimde kendi seçtiğim tabelanın arkasında hafif ışık (yalnızca benim ekranımda)
    if (v.phase === 'answer' && v.amIn && v.myChoice >= 0 && this.signsOn()) { const k = v.myChoice; this.glow(m, [(k ? 1 : -1) * 0.58, TABLE_Y + 0.24, SIGN_Z - 0.18], 1.1, SIDE3[k], 0.18 + 0.05 * Math.sin(t * 3)); }
    // sonuç: çoğunluğun kefesi parlar; tek yürekte altın
    if (v.phase === 'reveal' && this.shown()) {
      const u = (this.sNow() - this.doneAt()) / 1000;
      const k = v.united ? ((v.sides || [[]])[0].length ? 0 : 1) : v.maj;
      if (k >= 0) { const p = this.panW(k); this.glow(m, [p[0], p[1] + 0.12, p[2]], 1.1, v.united ? GOLD3 : SIDE3[k], 0.28 * Math.max(0.35, 1 - u / 3)); }
    }
    if (v.phase === 'final' && v.twins) {
      [v.twins.a, v.twins.b].forEach((i) => { const a = this.avatarAt(i); if (a && a.headW) this.glow(m, [a.headW[0], a.headW[1] - 0.2, a.headW[2]], 0.9, PINK3, 0.2 + 0.06 * Math.sin(t * 3)); });
    }
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="bm-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="bm-seg" role="group" aria-label="İkilem sayısı"><button data-act="bm-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 8 ikilem</button><button data-act="bm-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🎉 Uzun · 15 ikilem</button></div>`; }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost;
    const now = this.sNow();
    if (v.phase === 'answer') {
      const tag = `⚖️ ${v.round}/${v.rounds}`;
      const mine = v.myChoice;
      const opt = (k) => `<button class="bm-o${mine === k ? ' on' : mine >= 0 ? ' off' : ''}" data-act="bm-pick" data-c="${k}" style="--sc:${SIDEC[k]}" ${v.amIn ? '' : 'disabled'}><span class="lt">${LBL[k]}</span>${esc(v.options[k] || '')}${mine === k ? '<em>👉 Seçimin</em>' : ''}</button>`;
      key = `ans|${v.game}|${v.round}|${mine}|${v.answered}|${v.total}|${v.closing}|${host}|${v.amIn}`;
      html = `<div class="bm-box"><div class="bm-q"><small>${tag}</small><b>${v.amIn ? 'Hangisi? Birini seç!' : '👀 Bu ikilemde izliyorsun'}</b></div>
        <div class="bm-tw"><div class="bm-two">${opt(0)}${opt(1)}</div><span class="bm-or">YA DA</span></div>
        <div class="bm-ft"><span class="n">🗳️ ${v.answered}/${v.total} seçti</span><span class="z">${mine >= 0 ? (v.closing ? 'Terazi kuruluyor…' : 'Bilyen masada · değiştirebilirsin') : '🤫 Seçimler gizli'}</span>${host && v.answered > 0 && !v.closing ? '<button class="bm-b ghost" data-act="bm-reveal">Beklemeden aç</button>' : ''}</div>
        ${this.timerBar()}</div>`;
    } else if (v.phase === 'reveal') {
      const S = v.sides || [[], []];
      if (!this.shown()) {
        const L = this.landed();
        key = `rev|c|${v.game}|${v.round}|${L[0]}|${L[1]}`;
        html = `<div class="bm-box dark"><div class="bm-q"><small>🥁 TERAZİ TARTIYOR</small><b>${esc(v.options[0])} mı, ${esc(v.options[1])} mı?</b></div><div class="bm-ft" style="margin-top:9px;font-size:15px"><span class="n" style="background:${SIDEC[0]};color:#1c1633">A · ${L[0]}</span><span class="n" style="background:${SIDEC[1]};color:#1c1633">B · ${L[1]}</span></div></div>`;
      } else {
        const n = S[0].length + S[1].length;
        const canNext = host && now - (v.at || 0) >= (v.nextMinMs || 2500);
        const last = v.round >= v.rounds;
        key = `rev|w|${v.game}|${v.round}|${canNext}`;
        let head;
        if (!n) head = '🤷 Kimse seçmedi';
        else if (v.united) head = '🤝 Masa tek yürek!';
        else if (v.maj < 0) head = '⚔️ Masa ikiye bölündü!';
        else head = `⚖️ Çoğunluk: ${esc(v.options[v.maj])}`;
        let sub = '';
        if (v.myChoice >= 0 && n && !v.united && v.maj >= 0) sub = v.myChoice === v.maj ? '📣 Çoğunluktasın' : '🦄 Azınlıktasın, aykırı ruh!';
        const row = (k) => {
          const pc = n ? Math.round((S[k].length / n) * 100) : 0;
          const d = S[k].map((i) => `<i style="--pc:${pcol(v.seats[i]?.c ?? 0)}" title="${esc(nm0(v.seats[i]?.n || ''))}"></i>`).join('');
          return `<div class="bm-r${v.myChoice === k ? ' mine' : ''}" style="--sc:${SIDEC[k]}"><div class="fill" style="transform:scaleX(${(pc / 100).toFixed(3)})"></div><div class="in"><span class="lt">${LBL[k]}</span><span class="tx">${esc(v.options[k])}</span><span class="dots">${d}</span><span class="pc">%${pc}</span></div></div>`;
        };
        html = `<div class="bm-box"><div class="bm-q"><small>⚖️ ${v.round}/${v.rounds} · SONUÇ</small><b>${head}</b></div><div class="bm-res">${row(0)}${row(1)}</div>${sub ? `<div class="bm-s">${sub}</div>` : ''}
          ${canNext ? `<div class="bm-row"><button class="bm-b" data-act="bm-next">${last ? 'Sonuçlara geç 🏆' : 'Sıradaki ikilem ▶'}</button></div>` : `<div class="bm-s">${last ? 'Son ikilemdi, sonuçlar geliyor…' : 'Sıradaki ikilem birazdan…'}</div>`}
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
      html = `<div class="card bm-intro">
        <div class="tt">⚖️ Bu mu Şu mu?</div>
        <div class="sub">İki seçenek, tek karar. Herkes gizlice seçer, terazi masayı tartar!</div>
        <div class="bm-ru"><div style="background:#ffe6c7"><b>🤔</b>Birini seç</div><div style="background:#dbe8ff"><b>⚖️</b>Terazi tartsın</div><div style="background:#ffdcec"><b>💞</b>Ruh ikizini bul</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="bm-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Puan yok, sadece eğlence: sonda en uyumlu ikili ve masanın aykırısı ilan edilir.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= 2400) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const nm = (L) => L.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ');
      const S = v.stats || [];
      const aw = [];
      if (v.twins) aw.push(`<div><b>💞</b><span>Ruh ikizleri: ${nm([v.twins.a, v.twins.b])}</span><em>%${v.twins.pct}</em></div>`);
      if ((v.rebel || []).length) aw.push(`<div><b>🦄</b><span>Aykırı ruh: ${nm(v.rebel)}</span><em>${S[v.rebel[0]]?.min ?? 0} kez</em></div>`);
      if ((v.voice || []).length) aw.push(`<div><b>📣</b><span>Masanın sesi: ${nm(v.voice)}</span><em>${S[v.voice[0]]?.maj ?? 0} kez</em></div>`);
      aw.push(`<div><b>🤝</b><span>Tek yürek: ${v.united || 0} kez · ⚔️ Bölünme: ${v.split || 0} kez</span></div>`);
      const rows = v.seats.map((p, i) => ({ p, i, s: S[i] || { maj: 0, min: 0, picks: 0 } })).sort((x, y) => y.s.maj - x.s.maj)
        .map(({ p, i, s }) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${esc(nm0(p.n))}</span><em>📣 ${s.maj} · 🦄 ${s.min}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">⚖️ Masa tartıldı!</div>
        <div class="sub">${v.rounds} ikilemde kim kime benzedi?</div>
        <div class="bm-aw">${aw.join('')}</div>
        <div class="bm-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="bm-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = mmss((v.endsAt || 0) - now);
    const TOP = { answer: `${v.round}/${v.rounds} · 🗳️ ${v.answered ?? 0}/${v.total ?? 0} · ⏱ ${left}`, reveal: `${v.round}/${v.rounds} · ⚖️ tartılıyor` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.bm-tm i');
    const tot = v.phase === 'answer' ? v.answerMs || 3e4 : v.phase === 'reveal' ? v.revealMs || 7500 : 0;
    if (tm && tot) tm.style.transform = `scaleX(${clamp(((v.endsAt || 0) - now) / tot, 0, 1).toFixed(3)})`;
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const shown = this.shown();
    const S = v.sides || [[], []];
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase === 'answer' && (v.picked || [])[i]) x += '<span>✓</span>';
      if (v.phase === 'reveal' && shown) { const k = S[0].includes(i) ? 0 : S[1].includes(i) ? 1 : -1; if (k >= 0) x += `<span class="bm-v" style="--sc:${SIDEC[k]}">${LBL[k]}</span>`; }
      if (v.phase === 'final') {
        if (v.twins && (v.twins.a === i || v.twins.b === i)) x += '<span class="bm-m">💞</span>';
        if ((v.rebel || []).includes(i)) x += '<span class="bm-m">🦄</span>';
        if ((v.voice || []).includes(i)) x += '<span class="bm-m">📣</span>';
      }
      if (o.bmK !== x) {
        o.bmK = x;
        let el = o.lbl.querySelector('.bm-x');
        if (!el) { el = document.createElement('span'); el.className = 'bm-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.bm-x')) o.bmK = '';
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
    g.fillStyle = '#1a120c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6b3f1f';
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.78, L.r * 0.62, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
    this.draw2dGame(g, L);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
    });
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v) return;
    const cx = L.cx, cy = L.cy, r = L.r;
    const shown = this.shown();
    const S = v.sides || [[], []];
    // durum işaretleri
    (v.seats || []).forEach((p, i) => {
      const [x0, y0] = this.flatPos(i);
      let mark = '';
      if (v.phase === 'answer') mark = (v.picked || [])[i] ? '✓' : '';
      if (v.phase === 'reveal' && shown) mark = S[0].includes(i) ? 'A' : S[1].includes(i) ? 'B' : '';
      if (v.phase === 'final') mark = (v.twins && (v.twins.a === i || v.twins.b === i) ? '💞' : '') + ((v.rebel || []).includes(i) ? '🦄' : '') + ((v.voice || []).includes(i) ? '📣' : '');
      if (mark) { g.font = '900 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = mark === 'A' ? SIDEC[0] : mark === 'B' ? SIDEC[1] : '#ffd23f'; g.fillText(mark, x0, y0 - 29); }
    });
    // terazi: direk, kol (açıyla), kefeler
    const s = Math.min(1, r / 150);
    const px = cx, py = cy - 46 * s, bl = 70 * s;
    g.strokeStyle = '#d8a83a'; g.lineWidth = 5 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px, cy + 26 * s); g.lineTo(px, py); g.stroke();
    g.fillStyle = '#5e3b20'; g.fillRect(px - 22 * s, cy + 22 * s, 44 * s, 8 * s);
    const c = Math.cos(this.th), sn = Math.sin(this.th);
    const ends = [[px - bl * c, py + bl * sn], [px + bl * c, py - bl * sn]];
    g.beginPath(); g.moveTo(ends[0][0], ends[0][1]); g.lineTo(ends[1][0], ends[1][1]); g.stroke();
    const landed = v.phase === 'reveal' ? this.landed() : [0, 0];
    ends.forEach(([ex, ey], k) => {
      const pyk = ey + 34 * s;
      g.strokeStyle = 'rgba(216,168,58,.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - 22 * s, pyk); g.moveTo(ex, ey); g.lineTo(ex + 22 * s, pyk); g.stroke();
      g.fillStyle = SIDEC[k];
      g.beginPath(); g.ellipse(ex, pyk, 26 * s, 8 * s, 0, 0, TAU); g.fill();
      g.strokeStyle = '#1c1633'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#1c1633'; g.font = `900 ${Math.round(12 * s + 4)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(LBL[k], ex, pyk + 18 * s);
      // kefedeki bilyeler
      const sideL = this.order().filter((o) => o.k === k);
      sideL.slice(0, landed[k]).forEach((o, j) => { g.fillStyle = pcol(v.seats[o.i]?.c ?? 0); g.beginPath(); g.arc(ex - 16 * s + (j % 5) * 8 * s, pyk - 4 * s - Math.floor(j / 5) * 7 * s, 4 * s + 1, 0, TAU); g.fill(); });
      if (shown) {
        const n = S[0].length + S[1].length;
        g.fillStyle = '#fff'; g.font = `900 ${Math.round(14 * s + 4)}px system-ui`;
        g.fillText(`%${n ? Math.round((S[k].length / n) * 100) : 0}`, ex, ey - 16 * s);
      }
    });
    // seçimde: seçenlerin bilyeleri önlerinde
    if (v.phase === 'answer') {
      (v.seats || []).forEach((p, i) => {
        if (!(v.picked || [])[i]) return;
        const [x, y] = this.flatPos(i);
        g.fillStyle = pcol(p.c); g.beginPath(); g.arc(x + (cx - x) * 0.3, y + (cy - y) * 0.3, 6, 0, TAU); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      });
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new ScaleGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[bms]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
