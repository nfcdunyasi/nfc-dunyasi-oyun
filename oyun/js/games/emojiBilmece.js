// Emoji Bilmece — 3D emoji bilmecesi masası (NFC Dünyası Oyun)
// Masanın ortasında kocaman sarı bir emoji yüzü yatıyor; çevresindeki ışık halkası süreyi gösterir. Bilmecenin emojileri
// yüzün üstünde balon balon, 2 saniyede bir belirir. Cevabını kilitleyen, önündeki cevap kartını alıp göğsüne tutar (kartın
// "?" yazan arkası masaya dönük, seçim gizli). Açılışta herkes kartını aynı anda kaldırıp çevirir: harfler (A B C D)
// görünür, doğru cevap büyük bir afişte çıkar, emoji yüzü sevinir ya da şaşırır, bilenlerin başında puan çıkar. Sonda ilk
// üç kişi madalya kartını kaldırır, birincinin önünde kupa. Masa kiti (masa3d.js) ile çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-21-a';
import * as sfx from '../sfx.js?v=2026-11-21-a';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

const OPT = [
  { hex: '#ff5ea8', l: 'A' },
  { hex: '#ffb627', l: 'B' },
  { hex: '#2ec4ff', l: 'C' },
  { hex: '#7ed957', l: 'D' },
];
const CAT = { Film: '🎬', Dizi: '📺', 'Atasözü': '📜', Deyim: '💬', Oyun: '🎮', Marka: '🏷️', Yer: '📍', 'Ünlü': '⭐', Yemek: '🍽️', Nesne: '🧸', Spor: '⚽', Masal: '📖' };
const catIcon = (h) => CAT[h] || '🤔';
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const OPTC = OPT.map((o) => o.hex);
const OPT3 = OPTC.map((h) => new Float32Array(rgb3(h)));
const GOLD3 = new Float32Array([1, 0.82, 0.3]), SILV3 = new Float32Array([0.84, 0.87, 0.95]), BRNZ3 = new Float32Array([0.86, 0.55, 0.3]);
const GREEN3 = new Float32Array([0.24, 0.9, 0.45]), RED3 = new Float32Array([1, 0.3, 0.32]), WHITE3 = new Float32Array([1, 1, 1]);
const OFF3 = new Float32Array([0.2, 0.16, 0.3]), DIMW3 = new Float32Array([0.62, 0.6, 0.68]);
const MEDAL = [GOLD3, SILV3, BRNZ3], DIMT3 = new Float32Array([0.72, 0.72, 0.76]);
const MEDALC = ['#ffd23f', '#dfe3f0', '#f0b88a'];
// ortadaki öğelerin ölçüleri (ölçek 1'de; masa küçükse ya da yatay ekranda birlikte küçülür: this.ss)
const PK_R = 0.6, PK_H = 0.075;          // emoji yüzünün yarıçapı, kalınlığı
const RING_N = 24, RING_R = 0.705;      // süre halkası
const BUB_Y = 0.86, BUB_R = 0.2;        // emoji balonları: yükseklik, yarıçap
const CARD_W = 1.34, CARD_H = 0.67, CARD_Y = 0.95;
const PAD_R = 0.21, PAD_Y = 0.42;       // cevap kartı: yarıçap, sapın dibinden kartın merkezine
const FLIP_T = 1.0, FLIP_S = 0.38, VERD_T = 1.55;
const EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const DEMO = ['🎬', '🍿', '🤔'];
const STUDIO_L = { sunC: [0.5, 0.44, 0.56], sky: [0.44, 0.38, 0.52], gnd: [0.2, 0.16, 0.24], night: 1, warm: [1, 0.86, 0.9], lampC: [1.42, 1.2, 1.12], fogR: [30, 90], stars: 0, glowS: 0.3 };

const STYLE = `
#ky.emj .msg{top:12%}
#ky.emj .eb-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fff7fd;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.emj .eb-q{border-radius:16px;background:#5b2a86;color:#fff;padding:5px 10px 6px;border:3px solid var(--ink)}
#ky.emj .eb-q small{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;font-weight:900;letter-spacing:.07em;opacity:.95}
#ky.emj .eb-q small .cat{background:#ffd23f;color:#1c1633;border-radius:99px;padding:0 8px;letter-spacing:.03em}
#ky.emj .eb-q .em{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;font:400 clamp(24px,7vw,32px)/1.15 ${EMO_FONT}}
#ky.emj .eb-q .em i{font-style:normal;opacity:.35;font-size:.8em}
#ky.emj .eb-four{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
#ky.emj .eb-four.one{grid-template-columns:1fr;gap:6px}
#ky.emj .eb-o{position:relative;display:flex;align-items:center;gap:7px;min-width:0;min-height:50px;border:3px solid var(--ink);border-radius:15px;box-shadow:3px 3px 0 var(--ink);padding:6px 8px;font-weight:900;font-size:clamp(14px,4vw,16.5px);line-height:1.15;background:var(--sc);color:#1c1633;text-align:left;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow-wrap:anywhere;transition:opacity .2s,filter .2s}
#ky.emj .eb-four.one .eb-o{min-height:40px;font-size:clamp(13.5px,3.8vw,15.5px)}
#ky.emj .eb-o .lt{flex:0 0 auto;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#1c1633;color:#fff;font-size:14px;line-height:1}
#ky.emj .eb-o .tx{flex:1;min-width:0}
#ky.emj .eb-o .tg{position:absolute;right:-5px;top:-10px;background:#1c1633;color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 0 0 2px #fff}
#ky.emj .eb-o .dots{display:flex;flex-wrap:wrap;gap:2px;max-width:46px;justify-content:flex-end;flex:0 0 auto}
#ky.emj .eb-o .dots i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.emj .eb-o:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.emj .eb-o.on{outline:4px solid #1c1633;outline-offset:2px;transform:translateY(-2px)}
#ky.emj .eb-o.off{filter:saturate(.35) brightness(1.08);opacity:.62}
#ky.emj .eb-o.ok{outline:4px solid #2fbf71;outline-offset:2px;transform:translateY(-2px)}
#ky.emj .eb-o.ok .tg{background:#2fbf71;color:#1c1633}
#ky.emj .eb-o.no .tg{background:#d7263d}
#ky.emj .eb-o.dim{filter:saturate(.4) brightness(1.05);opacity:.5}
#ky.emj .eb-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800;min-height:24px}
#ky.emj .eb-ft .n{background:#5b2a86;color:#fff;border-radius:99px;padding:2px 9px}
#ky.emj .eb-ft .z{opacity:.78}
#ky.emj .eb-ft .z b{color:#7a2bd1}
#ky.emj .eb-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:6px 12px;font-weight:900;font-size:14px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.emj .eb-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.emj .eb-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.emj .eb-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:transform .15s linear,background .3s}
#ky.emj .eb-res{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;min-height:28px;font-weight:900;font-size:clamp(16px,4.6vw,20px)}
#ky.emj .eb-res .g{color:#13894a}
#ky.emj .eb-res .r{color:#c21f33}
#ky.emj .eb-res .m{opacity:.7}
#ky.emj .eb-res em{font-style:normal;font-size:12.5px;font-weight:900;border-radius:99px;padding:1px 8px;background:#e9d8ff;color:#1c1633}
#ky.emj .eb-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;font-weight:800;min-height:20px}
#ky.emj .eb-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.emj .eb-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.emj .eb-rk span.me{background:#fff4c2}
#ky.emj .eb-row{display:flex;gap:8px;justify-content:center;margin-top:7px}
#ky.emj .lbl .eb-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.emj .lbl .eb-x:empty{display:none}
#ky.emj .lbl .eb-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#5b2a86;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.emj .lbl.me .eb-sc{background:#1c1633}
#ky.emj .lbl .eb-v{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:50%;color:#fff;font-weight:900;font-size:.8em;line-height:1;border:1.5px solid #1c1633}
#ky.emj .lbl .eb-v.y{background:#2fbf71}
#ky.emj .lbl .eb-v.n{background:#d7263d}
#ky.emj .eb-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.emj .eb-pt.go{animation:ebpt 2.3s ease-out forwards}
@keyframes ebpt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.emj .card .eb-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.emj .card .eb-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.emj .card .eb-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.emj .card .eb-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.emj .card .eb-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.emj .card .eb-seg button.on{background:var(--ink);color:#fff}
@media (max-width:380px){#ky.emj .card .eb-seg button{white-space:normal;line-height:1.15;font-size:12.5px}}
#ky.emj .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.emj .card .eb-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.emj .card .eb-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.emj .card .eb-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.emj .card .eb-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.emj .card .eb-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.emj .card .eb-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.emj .card .eb-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.emj .card .eb-aw div:only-child{grid-column:1/-1}
#ky.emj .card .eb-aw div b{font-size:18px;flex:0 0 auto}
#ky.emj .card .eb-aw div span{flex:1;min-width:0;font-size:12px}
#ky.emj .card .eb-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.emj .card .eb-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.emj .card .eb-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.emj .card .eb-tb>div.me{background:#fff4c2}
#ky.emj .card .eb-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.emj .card .eb-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.emj .card .eb-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.emj .card .eb-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.emj .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.emj .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.emj .eb-box{width:min(470px,54vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.emj .eb-q{padding:4px 10px 5px}#ky.emj .eb-q .em{font-size:22px}
#ky.emj .eb-o{min-height:42px;padding:5px 7px;font-size:14px}
#ky.emj .eb-four{margin-top:6px;gap:6px}
#ky.emj .eb-ft{margin-top:5px}
#ky.emj .eb-res{margin-top:5px;font-size:16px;min-height:22px}
#ky.emj .eb-tm{margin-top:5px}
#ky.emj .card .eb-ru{margin-top:6px}#ky.emj .card .eb-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.emj .card .eb-ru div b{font-size:17px}
#ky.emj .card .eb-seg{margin-top:6px}#ky.emj .card .eb-seg button{padding:6px 4px}
#ky.emj .card .eb-pod{display:none}
#ky.emj .card .eb-aw{margin-top:6px}
#ky.emj .card .eb-tb{max-height:24vh}
#ky.emj .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.emj .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, sonuç, final): balon gibi zıplayan bir pop (Fa majör, 112 bpm): el çırpma, çalkalayıcı, elektrikli piyano.
// 'race' (soru): meraklı düşünme müziği (Re minör, 100 bpm): tahta tık-tak, tuba bas, pizzicato motif.
// 'mute' (kartlar kalkarken): müzik susar, davul gümbürtüsü çalar.
class EbSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 100 : 112; }
  swing() { return this.mode === 'race' ? 0.04 : 0.1; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // Dm – Bb – Gm – A
      const CH = [[38, [62, 65, 69]], [34, [62, 65, 70]], [31, [62, 67, 70]], [33, [61, 64, 69]]];
      const [root, ch] = CH[bar % 4];
      if (s % 4 === 0) this.iWood(t, s % 8 === 0 ? 0.075 : 0.055, s % 8 === 0 ? 980 : 760);
      if (s % 2 === 1) this.iShk(t, 0.012);
      if (s === 0) this.iBass(t, root, spb * 0.9, 0.095, 'tuba');
      if (s === 8) this.iBass(t, root + 7, spb * 0.9, 0.078, 'tuba');
      if (s === 12 && bar % 2) this.iBass(t, root + 5, spb * 0.45, 0.07, 'tuba');
      const MOT = [[0, 2, null, 1, null, 2, 1, null], [2, null, 1, 0, null, 1, null, 0]];
      const k = MOT[bar % 2][s >> 1];
      if (s % 2 === 0 && k != null) this.iPizz(t, ch[k] + 12, 0.05, 0.18, 0.15);
      if (s === 6 && bar % 4 === 3) this.iPizz(t, ch[2] + 24, 0.035, 0.2, 0.3);
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((m) => m - 12), spb * 8, 0.014, 950, 0.3);
      return;
    }
    // F – Dm – Bb – C
    const CH = [[41, [65, 69, 72]], [38, [65, 69, 74]], [34, [65, 70, 74]], [36, [64, 67, 72]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0 || s === 8 || s === 11) this.iKick(t, 0.085, 112, 46, 0.15);
    if (s === 4 || s === 12) this.iClap(t, 0.05);
    this.iShk(t, s % 2 ? 0.01 : 0.016);
    if ([0, 3, 6, 8, 10, 14].includes(s)) this.iBass(t, (s === 6 || s === 14 ? root + 12 : root) - 12, spb * 0.36, 0.1, 'up');
    if (s === 2 || s === 6 || s === 10 || s === 14) ch.forEach((m, k) => this.iEP(t + k * 0.006, m, 0.022, st * 1.8, 0.15));
    const MEL = [[81, null, 84, 81, null, 77, null, 79], [77, null, null, 74, 77, null, 81, null], [82, null, 81, null, 77, 74, null, 77], [76, null, 79, null, 84, null, null, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null) { this.iPluck(t, m, 0.04, st * 2.2, 'sine', 3000, 0.25); if (s === 0) this.iPluck(t + st * 0.5, m + 12, 0.016, st, 'sine', 4000, 0.3); }
    if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((x) => x - 12), spb * 8, 0.01, 1300, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'bub': { // yeni emoji balonu: "blup" (a: kaçıncı emoji → ses yükselir)
        const f0 = 300 * Math.pow(2, Math.min(7, a || 0) / 6);
        this.tone(f0, t, 0.13, 'sine', 0.11, f0 * 3.2, 0.003);
        this.noise(t, 0.02, 0.04, { type: 'bandpass', freq: 2500, q: 2 });
        this.tone(f0 * 4, t + 0.06, 0.08, 'sine', 0.03, null, 0.002);
        break;
      }
      case 'grab': // kartımı aldım
        this.iWood(t, 0.12, 820);
        this.noise(t + 0.01, 0.16, 0.05, { type: 'bandpass', freq: 900, to: 2400, q: 0.9, attack: 0.02 });
        this.tone(660, t + 0.06, 0.12, 'triangle', 0.05, 880, 0.003);
        break;
      case 'peer': // başkası kartını aldı
        this.iWood(t, 0.05, 700 + Math.random() * 200);
        break;
      case 'flip': // herkes kartını kaldırıp çevirir
        this.noise(t, 0.35, 0.09, { type: 'bandpass', freq: 600, to: 3000, q: 0.8, attack: 0.04 });
        for (let i = 0; i < Math.min(8, a || 4); i++) this.iWood(t + 0.18 + i * 0.035 + Math.random() * 0.02, 0.06, 650 + Math.random() * 350);
        break;
      case 'aha': // doğru cevap afişi: "taa-daa!"
        this.duck(0.2, 1.6);
        [[65, 0], [69, 0.08], [72, 0.16]].forEach(([m, d]) => this.iBrass(t + d, m, 0.14, 0.05, 0.15));
        [65, 69, 72, 77].forEach((m) => this.iBrass(t + 0.26, m, 0.6, 0.035, 0.2));
        this.iBell(t + 0.26, 89, 0.03, 1, 0.4);
        break;
      case 'right': // bildim
        [[76, 0], [79, 0.07], [84, 0.14]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.045, 0.9, 0.3));
        this.cheer(t + 0.15, 1.3);
        break;
      case 'oracle': // emojiler bitmeden bildim
        for (let i = 0; i < 6; i++) this.iBell(t + 0.3 + i * 0.05, 84 + [0, 4, 7, 12, 16, 19][i], 0.022, 0.7, 0.4);
        break;
      case 'wrong': // bilemedim
        this.tone(196, t, 0.18, 'square', 0.05, 175, 0.005);
        this.tone(165, t + 0.2, 0.34, 'square', 0.05, 140, 0.005);
        break;
      case 'miss': // süre doldu, cevap vermedim
        this.tone(392, t, 0.14, 'triangle', 0.06, 370, 0.01);
        this.tone(330, t + 0.15, 0.32, 'triangle', 0.06, 262, 0.01);
        break;
      case 'nobody': // kimse bilemedi
        this.tone(220, t, 0.5, 'sawtooth', 0.03, 165, 0.03);
        this.noise(t, 0.6, 0.05, { type: 'bandpass', freq: 700, to: 300, q: 1.5, attack: 0.08 });
        break;
      case 'timeup':
        this.tone(220, t, 0.4, 'square', 0.05, null, 0.004);
        this.tone(277, t, 0.4, 'square', 0.035, null, 0.004);
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
const BRN = () => C('#4a2a12', -0.5);
// emoji yüzü: sarı disk (orijin masa üstü); üstü hafif kubbeli
function puckModel(mb) {
  const Y = C('#ffcc33', -0.45), Yd = C('#eda61b', -0.5);
  mb.lathe(0, 0, 0, [[0, 0], [PK_R * 0.97, 0], [PK_R, 0.012], [PK_R, PK_H - 0.016], [PK_R * 0.975, PK_H], [PK_R * 0.6, PK_H + 0.012], [0, PK_H + 0.014]], 56, (i) => (i <= 3 ? Yd : Y));
}
// süre halkasının koyu tablası
function trayModel(mb) {
  mb.lathe(0, 0, 0, [[PK_R + 0.03, 0], [RING_R + 0.07, 0], [RING_R + 0.075, 0.012], [RING_R + 0.07, 0.022], [PK_R + 0.035, 0.022], [PK_R + 0.03, 0.012]], 56, () => C('#2a1640', -0.4));
}
function segModel(mb, e) { mb.rbox(-0.036, 0, -0.016, 0.036, 0.012, 0.016, 0.006, C('#ffffff', e), 1); }
// yüz parçaları (yüzün üstünde, alnı -z yönünde: herkesin kamerasından dik görünür)
const FY = PK_H + 0.016;
function arc(mb, pts, r, col) { for (let k = 0; k < pts.length - 1; k++) limb(mb, pts[k], pts[k + 1], [r, r], col, 8); }
function faceModel(mb, kind) {
  const Bk = BRN(), Wt = C('#ffffff', 0.9), Pk = C('#ff6f91', -0.3);
  const eyeO = (sc = 1) => [-1, 1].forEach((sx) => { mb.sphereS(sx * 0.19, FY, -0.13, 0.062 * sc, 0.018, 0.09 * sc, Bk, 14, 6); mb.sphereS(sx * 0.19 - 0.022, FY + 0.012, -0.16, 0.018, 0.008, 0.018, Wt, 8, 4); });
  const eyeH = () => [-1, 1].forEach((sx) => { const P = []; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; P.push([sx * 0.19 + Math.cos(a) * 0.07, FY, -0.1 - Math.sin(a) * 0.06]); } arc(mb, P, 0.017, Bk); });
  const eyeX = () => [-1, 1].forEach((sx) => { limb(mb, [sx * 0.19 - 0.06, FY, -0.19], [sx * 0.19 + 0.06, FY, -0.07], [0.017, 0.017], Bk, 8); limb(mb, [sx * 0.19 + 0.06, FY, -0.19], [sx * 0.19 - 0.06, FY, -0.07], [0.017, 0.017], Bk, 8); });
  const smile = (w = 0.24, d = 0.09, z0 = 0.13) => { const P = []; for (let k = 0; k <= 12; k++) { const u = k / 6 - 1; P.push([u * w, FY, z0 + d * (1 - u * u)]); } arc(mb, P, 0.02, Bk); };
  const blush = () => [-1, 1].forEach((sx) => mb.sphereS(sx * 0.34, FY - 0.004, 0.05, 0.07, 0.008, 0.045, Pk, 12, 4));
  if (kind === 'smile') { eyeO(); smile(); }
  else if (kind === 'think') {
    // 🤔: gözler yukarı bakar, bir kaş kalkık, ağız yan yan
    [-1, 1].forEach((sx) => { mb.sphereS(sx * 0.19, FY, -0.14, 0.058, 0.018, 0.085, Bk, 14, 6); mb.sphereS(sx * 0.19 - 0.02, FY + 0.012, -0.19, 0.017, 0.008, 0.017, Wt, 8, 4); });
    const P = []; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; P.push([0.19 + Math.cos(a) * 0.08, FY, -0.27 - Math.sin(a) * 0.035]); } arc(mb, P, 0.016, Bk);
    limb(mb, [-0.27, FY, -0.26], [-0.11, FY, -0.25], [0.016, 0.016], Bk, 8);
    limb(mb, [-0.13, FY, 0.19], [0.15, FY, 0.15], [0.02, 0.02], Bk, 8);
  } else if (kind === 'wow') { eyeO(1.15); mb.sphereS(0, FY, 0.2, 0.075, 0.016, 0.09, Bk, 16, 6); }
  else if (kind === 'happy' || kind === 'party') {
    eyeH();
    // açık ağız: üst kenar düz, alt kenar yay; dil ve dişler
    const top = 0.1, w = 0.26, d = 0.17;
    for (let k = 0; k < 12; k++) {
      const u0 = k / 6 - 1, u1 = (k + 1) / 6 - 1;
      mb.tri([u0 * w, FY - 0.002, top], [u1 * w, FY - 0.002, top], [u1 * w, FY - 0.002, top + d * (1 - u1 * u1)], Bk, [0, -1, top]);
      mb.tri([u0 * w, FY - 0.002, top], [u1 * w, FY - 0.002, top + d * (1 - u1 * u1)], [u0 * w, FY - 0.002, top + d * (1 - u0 * u0)], Bk, [0, -1, top]);
    }
    mb.rbox(-w * 0.82, FY - 0.003, top, w * 0.82, FY + 0.004, top + 0.035, 0.008, C('#ffffff', -0.3), 1);
    mb.sphereS(0, FY - 0.001, top + d * 0.68, 0.1, 0.006, 0.05, C('#ff5a6e', -0.3), 14, 4);
    blush();
  } else if (kind === 'shock') { eyeX(); mb.sphereS(0, FY, 0.2, 0.085, 0.016, 0.1, Bk, 16, 6); }
  else if (kind === 'meh') { eyeO(); smile(0.18, 0.04, 0.17); }
}
// cevap kartı: sap (orijin sapın dibi), beyaz disk ve kenar halkası (renkle boyanır); disk +z'ye bakar
function padHandleModel(mb) { limb(mb, [0, 0, 0], [0, PAD_Y - PAD_R + 0.01, 0], [0.014, 0.013], C('#b07a45', -0.5), 8); }
function padDiscModel(mb) {
  mb.push().T(0, PAD_Y, 0, 0, Math.PI / 2, 0);
  mb.lathe(0, -0.007, 0, [[0, 0], [PAD_R, 0], [PAD_R, 0.014], [0, 0.014]], 36, () => C('#ffffff', -0.5));
  mb.pop();
}
function padRimModel(mb) {
  mb.push().T(0, PAD_Y, 0, 0, Math.PI / 2, 0);
  mb.torusN(0, 0, 0, PAD_R, 0.016, 0.016, 36, 6, C('#ffffff', -0.7));
  mb.pop();
}
// dokulu yüzler: atlas hücresi (sütun, satır; 4×2) → kare dörtgen
function cellUV(k) { const c = k % 4, r = Math.floor(k / 4); return [c / 4, r / 2, (c + 1) / 4, (r + 1) / 2]; }
function padFaceModel(tb, k, back) {
  const r = PAD_R * 0.97, z = back ? -0.0078 : 0.0078, y = PAD_Y;
  const [u0, v0, u1, v1] = cellUV(k);
  if (!back) tb.tquad([-r, y - r, z], [r, y - r, z], [r, y + r, z], [-r, y + r, z], u0, v0, u1, v1, [0, y, 0]);
  else tb.tquad([r, y - r, z], [-r, y - r, z], [-r, y + r, z], [r, y + r, z], u0, v0, u1, v1, [0, y, 0]);
}
function bubbleModel(tb, k) { const r = BUB_R, [u0, v0, u1, v1] = cellUV(k); tb.tquad([-r, -r, 0], [r, -r, 0], [r, r, 0], [-r, r, 0], u0, v0, u1, v1, [0, 0, -1]); }
function cardModel(tb) { const w = CARD_W / 2, h = CARD_H / 2; tb.tquad([-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0], 0, 0, 1, 1, [0, 0, -1]); }

/* ============================ dokular ============================ */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// emoji tek başına bir hücrede: emojiyi ortala (yazı tipinin taban çizgisi farkını ölçerek)
function emojiAt(g, e, cx, cy, size) {
  g.font = `${size}px ${EMO_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const m = g.measureText(e);
  const asc = m.actualBoundingBoxAscent || size * 0.8, des = m.actualBoundingBoxDescent || size * 0.15;
  g.fillStyle = '#1c1633';
  g.fillText(e, cx, cy + (asc - des) / 2);
}
// emoji atlası (1024×512, 4×2): beyaz balon + emoji; henüz açılmamışlar için soluk "?" balonu
function drawEmojiAtlas(cv, list, n) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  for (let k = 0; k < Math.min(8, n); k++) {
    const cx = (k % 4) * 256 + 128, cy = Math.floor(k / 4) * 256 + 128, e = list[k];
    g.fillStyle = 'rgba(28,22,51,.9)'; g.beginPath(); g.arc(cx, cy, 124, 0, TAU); g.fill();
    const gr = g.createRadialGradient(cx - 34, cy - 40, 10, cx, cy, 118);
    gr.addColorStop(0, e ? '#ffffff' : '#9a72d8'); gr.addColorStop(1, e ? '#f1e6ff' : '#6a44b0');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 114, 0, TAU); g.fill();
    if (e) emojiAt(g, e, cx, cy, 150);
    else { g.fillStyle = '#ffffff'; g.font = `900 150px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, cy + 10); }
  }
}
// cevap kartı atlası (1024×512, 4×2): A B C D yüzleri, "?" arkası, 1 2 3 madalyaları
function drawPadAtlas(cv) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const cell = (k, bg, txt, fg, fs) => {
    const cx = (k % 4) * 256 + 128, cy = Math.floor(k / 4) * 256 + 128;
    g.fillStyle = '#1c1633'; g.beginPath(); g.arc(cx, cy, 126, 0, TAU); g.fill();
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, 112, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - 30, cy - 52, 52, 24, -0.4, 0, TAU); g.fill();
    g.fillStyle = fg; g.font = `900 ${fs}px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = '#1c1633'; g.lineJoin = 'round';
    if (fg === '#ffffff') g.strokeText(txt, cx, cy + 10);
    g.fillText(txt, cx, cy + 10);
  };
  OPT.forEach((o, k) => cell(k, o.hex, o.l, '#1c1633', 170));
  cell(4, '#efe7ff', '?', '#7a2bd1', 180);
  MEDALC.forEach((c, k) => cell(5 + k, c, String(k + 1), '#1c1633', 170));
}
// doğru cevap afişi (1024×512): kategori, cevap, emojiler
function drawCard(cv, hint, text, emojis, k) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#1c1633'; rr(g, 6, 6, W - 12, H - 12, 64); g.fill();
  g.fillStyle = OPTC[k] || '#ffd23f'; rr(g, 22, 22, W - 44, H - 44, 52); g.fill();
  g.fillStyle = '#fffaf2'; rr(g, 44, 44, W - 88, H - 88, 40); g.fill();
  g.fillStyle = '#1c1633'; rr(g, W / 2 - 170, 62, 340, 66, 33); g.fill();
  g.fillStyle = '#ffd23f'; g.font = `900 38px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`${(hint || '').toLocaleUpperCase('tr-TR')}`, W / 2 + 22, 97, 280);
  emojiAt(g, catIcon(hint), W / 2 - 128, 95, 40);
  // cevap: sığana kadar küçült, en çok üç satır
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const box = { w: W - 150, h: 230 };
  let fs = 96, lines = [];
  for (; fs >= 34; fs -= 4) {
    g.font = `900 ${fs}px ${F}`;
    lines = [];
    let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width <= box.w || !cur) cur = t; else { lines.push(cur); cur = wd; } }
    if (cur) lines.push(cur);
    if (lines.length <= 3 && lines.length * fs * 1.1 <= box.h && lines.every((L) => g.measureText(L).width <= box.w)) break;
  }
  g.fillStyle = '#1c1633'; g.textBaseline = 'middle';
  const lh = fs * 1.1, y0 = 268 - ((lines.length - 1) * lh) / 2;
  lines.forEach((L, i) => g.fillText(L, W / 2, y0 + i * lh, box.w));
  const em = (emojis || []).slice(0, 8);
  const sz = 46, gap = 58;
  em.forEach((e, i) => emojiAt(g, e, W / 2 + (i - (em.length - 1) / 2) * gap, H - 92, sz));
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
const backOut = (u) => { const x = clamp(u, 0, 1) - 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; };
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const sec1 = (ms) => (ms / 1000).toFixed(1).replace('.', ',');
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };

/* ============================ oyun ============================ */
class EmojiGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'emj', cls: 'emj', title: 'Emoji Bilmece', sub: 'Emojilerden bul bakalım', emoji: '🤔', css: STYLE, snd: new EbSnd(), amb: 'diner', ambVol: 0.36, botPx: 300, botPxL: 34, cloth: '#6a2c8f', trim: '#ffd23f', tea: false, place: false, chairPad: '#2ec4ff', lampHex: '#5b2a86', light: STUDIO_L, fog: '#140b1c', roomStyle: { wall: '#24152f', curtain: '#e0457b' } });
    this.lockSeen = new Map();   // kartını alan → aldığı an
    this.emoSeen = [];           // emoji k'nin belirdiği an (yerel saat)
    this.atlasKey = '';
    this.cardKey = '';
    this.ptEl = [];
    this.tint = new Float32Array(3);
    this.tint2 = new Float32Array(3);
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.ebPuck = this.mk(puckModel);
    W.ebTray = this.mk(trayModel);
    W.ebSeg = this.mk((mb) => segModel(mb, -0.5));
    W.ebSegL = this.mk((mb) => segModel(mb, 0.9));
    W.ebFace = {};
    ['smile', 'think', 'wow', 'happy', 'party', 'shock', 'meh'].forEach((k) => { W.ebFace[k] = this.mk((mb) => faceModel(mb, k)); });
    W.ebPadH = this.mk(padHandleModel);
    W.ebPadD = this.mk(padDiscModel);
    W.ebPadR = this.mk(padRimModel);
    W.ebPadF = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => this.mk((tb) => padFaceModel(tb, k, false), 'tex'));
    W.ebPadB = this.mk((tb) => padFaceModel(tb, 4, true), 'tex');
    W.ebBub = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => this.mk((tb) => bubbleModel(tb, k), 'tex'));
    W.ebCard = this.mk(cardModel, 'tex');
    W.trophy = this.mk(K.trophyModel);
    const mkCv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.emoCv = mkCv(1024, 512); this.padCv = mkCv(1024, 512); this.cardCv = mkCv(1024, 512);
    drawPadAtlas(this.padCv);
    this.emoTex = makeTexture(this.X, this.emoCv);
    this.padTex = makeTexture(this.X, this.padCv);
    this.cardTex = makeTexture(this.X, this.cardCv);
    this.atlasKey = ''; this.cardKey = '';
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.X || this.X.gl.isContextLost()) return; drawPadAtlas(this.padCv); updateTexture(this.X, this.padTex, this.padCv); this.atlasKey = ''; this.cardKey = ''; }); } catch { /* yok */ }
  }
  freeTex() { const gl = this.X && this.X.gl; if (gl) [this.emoTex, this.padTex, this.cardTex].forEach((t) => t && gl.deleteTexture(t)); this.emoTex = this.padTex = this.cardTex = null; }
  onDispose() { this.ptEl.forEach((e) => e && e.remove()); this.ptEl = []; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  inPlay() { const v = this.view; return !!v && (v.phase === 'question' || v.phase === 'reveal') && Array.isArray(v.options); }
  revT() { const v = this.view; return v && v.phase === 'reveal' ? (this.sNow() - (v.at || 0)) / 1000 : -1; }
  flipped() { return this.revT() >= FLIP_T; }
  shown() { return this.revT() >= VERD_T; }
  get ss() { return this.ssV || 1; }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'eb-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'eb-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'eb-ans') {
        if (!v || v.phase !== 'question' || !v.amIn || v.myChoice >= 0) return;
        const c = +b.dataset.c;
        this.fx('grab'); vibrate(18);
        this.lockSeen.set(v.seats[v.me]?.id, this.time);
        this.ctx.send('answer', { choice: c });
      }
      else if (act === 'eb-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.emj !== '1') { root.dataset.emj = '1'; root.innerHTML = '<p class="py-16 text-center">🤔</p>'; }
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
      // yeni emoji belirdi
      const L = (v.emojis || []).length;
      for (let k = this.emoSeen.length; k < L; k++) {
        this.emoSeen[k] = this.time;
        if (prev && prev.phase === 'question' && prev.q === v.q) {
          this.fx('bub', k);
          const p = this.bubW(k, this.emoN());
          if (this.X && p) this.burst(p[0], p[1], p[2], 12, [[1, 1, 1], [1, 0.85, 0.4], [0.9, 0.7, 1]], 1, 0.03, true, 0.7, 1.2);
        }
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
      this.emoSeen = (v.emojis || []).map((_, k) => (fresh && k === 0 ? this.time : this.time - 9));
      this.qT = fresh ? this.time : this.time - 9;
      this.tickSec = 0; this.upSeen = false;
      if (fresh) { this.fx('bub', 0); this.msg(`${catIcon(v.hint)} ${esc((v.hint || '').toLocaleUpperCase('tr-TR'))} · ${v.q}/${v.qs}`, 'mid'); }
    }
    if (v.phase === 'reveal') {
      mus('mute');
      const rt = this.revT();
      this.flipFx = rt >= FLIP_T + 0.3;
      this.vDone = rt >= VERD_T + 0.4;
      this.vT = this.vDone ? this.time - 9 : null;
      this.emoSeen = (v.emojis || []).map((_, k) => this.emoSeen[k] ?? this.time);
      if (fresh) { const pk = this.phKey; setTimeout(() => { if (!this.dead && this.phKey === pk) this.fx('drumroll', FLIP_T - 0.1); }, 80); }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.champFx = late;
      if (!late) this.msg('🏁 BİLMECE BİTTİ', 'big');
    }
  }
  // kartlar çevrildi, doğru cevap açıldı: sesler, mesajlar, puan baloncukları
  onVerdict() {
    const v = this.view;
    this.vT = this.time;
    if (!(v.correct >= 0 && v.correct < 4)) return;
    try { this.snd.music('idle'); } catch { /* yok */ }
    this.fx('aha');
    const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1;
    const p = [0, TABLE_Y + CARD_Y * this.ss, 0];
    if (this.X) this.burst(p[0], p[1], p[2], 50, [[...OPT3[v.correct]], [1, 1, 1], [1, 0.85, 0.35]], 2.3, 0.035, false, 1.8, 2.4);
    const inR = me >= 0 && (v.inRound || [])[me];
    if (inR && mine === v.correct) {
      setTimeout(() => { if (!this.dead) this.fx('right'); }, 250);
      vibrate([15, 30, 15]);
      const hid = (v.hid || [])[me] || 0;
      if (hid > 0) setTimeout(() => { if (!this.dead) this.fx('oracle'); }, 350);
      this.msg(hid > 0 ? `🔮 EMOJİLER BİTMEDEN BİLDİN!` : v.fastest === me ? '⚡ EN HIZLI SENSİN!' : '✅ DOĞRU!', 'mid');
    } else if (inR && mine >= 0) { setTimeout(() => { if (!this.dead) this.fx('wrong'); }, 250); vibrate(40); this.msg('❌ YANLIŞ', 'mid'); }
    else if (inR) { setTimeout(() => { if (!this.dead) this.fx('miss'); }, 250); this.msg('⏰ SÜRE DOLDU', 'mid'); }
    if (!v.right) { setTimeout(() => { if (!this.dead) this.fx('nobody'); }, 600); if (!(inR && mine >= 0)) this.msg('🤯 KİMSE BİLEMEDİ', 'mid'); }
    (v.gains || []).forEach((g, i) => {
      if (!(g > 0)) return;
      const e = this.ptBox(i);
      e.className = 'eb-pt';
      e.textContent = `+${fmt(g)}${(v.bonus || [])[i] ? ' 🔮' : ''}${v.fastest === i ? ' ⚡' : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
    });
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'eb-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- karakterler ---------- */
  // kartı tutma ve kaldırma: sağ el hedefi (koltuk uzayı)
  holdPose(a, up, wave, t) {
    a.pose('rest', { t });
    a.k = 9;
    if (up) {
      a.tgt.hand[1] = [0.42, 1.2 + (wave ? Math.abs(Math.sin(t * 6)) * 0.05 : 0), 0.3];
      a.tgt.fdir[1] = [0.2, 1, 0.1]; a.tgt.palm[1] = [-1, 0, 0.25]; a.tgt.fw[1] = 0.8; a.tgt.pole[1] = [1, -0.4, -0.3];
    } else {
      a.tgt.hand[1] = [0.17, 0.82, 0.42];
      a.tgt.fdir[1] = [0.1, 1, 0.3]; a.tgt.palm[1] = [-0.7, 0.2, -0.6]; a.tgt.fw[1] = 0.7; a.tgt.pole[1] = [0.9, -0.5, -0.1];
    }
    a.shape[1] = 'grip';
  }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const mid = [0, TABLE_Y + BUB_Y * this.ss, 0];
    const rt = this.revT(), sh = this.shown();
    const left = (v.endsAt || 0) - now;
    const champ = v.phase === 'final' ? v.champ || [] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.ebI || (a.ebI = { lt: 0, look: null });
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
        if (did) { this.holdPose(a, false, false, t); a.expr = 'grin'; a.look = idleLook(0.4); return; }
        if ((v.inRound || [])[i]) {
          const hurry = left < 5000;
          a.pose(hurry ? (hs(i, v.q) < 0.5 ? 'bite' : 'headgrab') : Math.floor(t / 3.2 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = hurry ? 'tense' : Math.floor(t / 2.7 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = Math.floor(t / 2.1 + i) % 4 ? mid : idleLook(0.4);
        } else { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        const c = (v.choices || [])[i];
        if (!(v.inRound || [])[i]) { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        if (c < 0) { a.pose(sh ? 'shrug' : 'clasp', { t }); a.expr = sh ? 'o' : 'tense'; a.look = mid; return; }
        if (rt < FLIP_T - 0.25) { this.holdPose(a, false, false, t); a.expr = 'tense'; a.look = mid; return; }
        const ok = c === v.correct, su = rt - VERD_T;
        if (!sh || ok || su < 1.3) {
          this.holdPose(a, true, sh && ok, t);
          if (sh && ok) { a.tgt.hand[0] = [-0.3, 1.3 + Math.abs(Math.sin(t * 7 + i)) * 0.08, 0.2]; a.tgt.fdir[0] = [0, 1, 0.2]; a.tgt.palm[0] = [0, 0, 1]; a.shape[0] = 'open'; }
          a.expr = !sh ? 'grin' : ok ? 'laugh' : 'wince';
          a.look = sh ? idleLook(0.3) : mid;
        } else { this.holdPose(a, false, false, t); a.expr = 'sad'; a.look = idleLook(0.2); }
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const pl = placeOf(v, i), medal = pl <= 3 && (v.scores || [])[i] > 0;
        if (medal && u > 0.6) { this.holdPose(a, true, true, t); a.expr = 'laugh'; a.look = idleLook(); if (champ.includes(i)) { a.tgt.hand[0] = [-0.32, 1.42 + Math.abs(Math.sin(t * 8)) * 0.06, 0.16]; a.shape[0] = 'open'; } }
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
    const ssT = clamp((this.R * Math.min(1, this.kz) - 0.6) / 0.8, 0.75, 1.5);
    this.ssV = this.ssV ? damp(this.ssV, ssT, 3, dt) : ssT;
    if (v.phase === 'reveal') {
      const rt = this.revT();
      if (!this.flipFx && rt >= FLIP_T) { this.flipFx = true; const n = (v.choices || []).filter((x) => x >= 0).length; if (n) this.fx('flip', n); }
      if (!this.vDone && rt >= VERD_T) { this.vDone = true; this.onVerdict(); }
    }
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'question' && v.amIn && v.myChoice < 0) {
      if (left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
      if (left <= 0 && !this.upSeen) { this.upSeen = true; this.fx('timeup'); }
    }
    if (v.phase === 'final' && !this.champFx && t - (this.finT || 0) >= 1.1) {
      this.champFx = true;
      if ((v.champ || []).length) {
        this.fx('champ');
        const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
        this.msg(`🏆 ${nm}`, 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, [[1, 0.85, 0.3], [1, 1, 1], [1, 0.5, 0.75]], 2.6, 0.04, false, 2.2, 2.4); });
      }
    }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'question' || v.phase === 'reveal') {
      zoom = land ? 0.95 : 0.64; pa = land ? -0.02 : -0.08; bp = Math.max(170, this.barH || 300); sy = land ? 0.5 : 0.44; sx = land ? 0.27 : 0.5;
      H = [0, TABLE_Y + 0.5 * this.ss, 0.05];
    } else if (v.phase === 'final') {
      const card = now - (v.finAt || 0) >= this.cardMs();
      zoom = land ? 1.05 : card ? 0.9 : 0.7; bp = card ? 200 : 300; sy = land ? 0.5 : card ? 0.24 : 0.42; sx = land ? (card ? 0.27 : 0.5) : 0.5; yawC = Math.sin(t * 0.15) * 0.12; H = [0, TABLE_Y + 0.5, 0];
    } else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
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
  cardMs() { return 3400; }
  placePts() {
    const v = this.view;
    const rev = !!v && v.phase === 'reveal' && this.vDone && !this.flat;
    for (let i = 0; i < this.ptEl.length; i++) {
      const e = this.ptEl[i];
      if (!e) continue;
      if (!rev) { if (e.classList.contains('go')) e.className = 'eb-pt'; continue; }
      if (!e.classList.contains('go')) continue;
      const a = this.avatarAt(i);
      if (!a || !a.headW) continue;
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
    }
  }

  /* ---------- konumlar ---------- */
  // kameranın sağ yönü (yatay düzlemde): emoji balonları bu yönde sıralanır
  camRight() { const c = this.cam; const dx = c.ex - c.tx, dz = c.ez - c.tz, L = Math.hypot(dx, dz) || 1; return [dz / L, -dx / L]; }
  emoList() { const v = this.view; if (!v) return []; if (this.inPlay()) return v.emojis || []; return v.phase === 'intro' ? DEMO : []; }
  // balon sayısı: bilmecenin toplam emoji sayısı (açılmamışlar "?" balonu); dizilim baştan belli olsun diye
  emoN() { const v = this.view; if (!v) return 0; if (this.inPlay()) return Math.min(8, Math.max(v.emojiN || 0, (v.emojis || []).length)); return v.phase === 'intro' ? DEMO.length : 0; }
  // k. balonun yeri (n balon: 4'e kadar tek sıra, fazlası iki sıra)
  bubW(k, n) {
    const s = this.ss, r = this.camRight();
    const rows = n > 4 ? 2 : 1, per = Math.ceil(n / rows), row = Math.floor(k / per), col = k - row * per, cnt = row === rows - 1 ? n - per * (rows - 1) : per;
    const gap = (n > 4 ? 0.44 : 0.5) * s, x = (col - (cnt - 1) / 2) * gap;
    let y = TABLE_Y + (BUB_Y + (rows > 1 ? (row ? -0.22 : 0.22) : 0) + Math.sin(this.time * 1.8 + k * 1.3) * 0.025) * s;
    const v = this.view;
    if (v && v.phase === 'reveal' && this.vT != null) {
      // açılışta balonlar küçülüp afişin altına, kameraya doğru iner
      const u = easeIO((this.time - this.vT) / 0.5), k2 = 1 - 0.42 * u;
      y = lerp(y, TABLE_Y + (0.34 + (rows > 1 ? (row ? -0.07 : 0.07) : 0)) * s, u);
      return [r[0] * x * k2, y, r[1] * x * k2 + 0.3 * s * u];
    }
    return [r[0] * x, y, r[1] * x];
  }
  bubScale(k) {
    const v = this.view, t0 = this.emoSeen[k];
    const L = this.emoList().length;
    let s;
    if (k >= L) s = this.ss * 0.64 * backOut((this.time - (this.qT ?? -9) - k * 0.06) / 0.35) * (1 + Math.sin(this.time * 3 + k) * 0.03);
    else s = this.ss * (t0 == null || this.time - t0 > 1 ? 1 : lerp(0.64, 1, backOut((this.time - t0) / 0.38)));
    if (v && v.phase === 'reveal' && this.vT != null) s *= 1 - 0.42 * easeIO((this.time - this.vT) / 0.5);
    if (v && v.phase === 'final') s *= 1 - easeOut((this.time - (this.finT || 0)) / 0.5);
    return s;
  }
  // cevap kartının matrisi: masada (bekliyor), elde (kapalı, arkası dışarı), havada (çevrilmiş, yüzü kameraya)
  padMat(m, a, i) {
    const v = this.view;
    const st = this.padState(i);
    if (st === 'rest') {
      // masada yatık: "?" yazan arka yüz yukarıda, disk masanın ortasına doğru
      const q = this.seatW(a, 0.24, TABLE_Y + 0.016, 0.42);
      M.set(m, q[0], q[1], q[2], a.yaw + 0.5, Math.PI / 2, 0, 1);
      return st;
    }
    const h = a.hw[1];
    const px = h[0], py = h[1] - 0.06, pz = h[2];
    const back = a.yaw + Math.PI;   // yüzü kendine dönük (arkası masaya)
    const cam = Math.atan2(this.cam.ex - px, this.cam.ez - pz);
    let yaw = back, tilt = -0.12;
    if (st === 'up') {
      const t0 = v.phase === 'final' ? 0.6 : FLIP_T;
      const tt = v.phase === 'final' ? this.time - (this.finT || 0) : this.revT();
      const u = easeIO((tt - t0 - (i % 5) * 0.03) / FLIP_S);
      yaw = back + angDiff(cam, back) * u + Math.sin(u * Math.PI) * 0.6 * Math.sign(angDiff(cam, back) || 1);
      tilt = lerp(-0.12, -0.22, u);
    }
    M.set(m, px, py, pz, yaw, tilt, 0, 1);
    return st;
  }
  padState(i) {
    const v = this.view;
    if (!v) return 'rest';
    if (v.phase === 'question') return (v.picked || [])[i] ? 'hold' : 'rest';
    if (v.phase === 'reveal') {
      const c = (v.choices || [])[i];
      if (c < 0 || !(v.inRound || [])[i]) return 'rest';
      if (this.revT() < FLIP_T) return 'hold';
      const ok = c === v.correct, su = this.revT() - VERD_T;
      return !this.shown() || ok || su < 1.3 ? 'up' : 'hold';
    }
    if (v.phase === 'final') { const pl = placeOf(v, i); return pl <= 3 && (v.scores || [])[i] > 0 && this.time - (this.finT || 0) > 0.6 ? 'up' : 'rest'; }
    return 'rest';
  }
  // kartın ön yüzündeki atlas hücresi ve kenar rengi
  padFace(i) {
    const v = this.view;
    if (v.phase === 'final') { const pl = placeOf(v, i); return [4 + pl, MEDAL[pl - 1] || WHITE3]; }
    const c = (v.choices || [])[i];
    return c >= 0 && c < 4 ? [c, OPT3[c]] : [4, WHITE3];
  }
  colOf(i, out = this.tint) { const p = this.seats[i]; const c = rgb3(pcol(p ? p.c : 0)); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  faceKind() {
    const v = this.view;
    if (!v || v.phase === 'intro') return 'smile';
    if (v.phase === 'final') return 'party';
    if (v.phase === 'question') return (v.endsAt || 0) - this.sNow() < 4000 && !v.closing ? 'wow' : 'think';
    if (!this.vDone) return 'wow';
    const n = (v.inRound || []).filter(Boolean).length || 1;
    return !v.right ? 'shock' : v.right * 2 >= n ? 'happy' : 'meh';
  }
  ringState(k, t, now) {
    const v = this.view;
    if (!v || v.phase === 'intro' || v.phase === 'final') { const on = (k + Math.floor(t * 8)) % 6 < 2; return [on, OPT3[Math.floor(k / 6) % 4]]; }
    if (v.phase === 'question') {
      if (v.closing) return [Math.floor(t * 8) % 2 === 0, WHITE3];
      const left = Math.max(0, (v.endsAt || 0) - now) / (v.answerMs || 15e3);
      const on = k < Math.ceil(left * RING_N - 0.001) && (left > 0.2 || Math.floor(t * 5) % 2 === 0 || k < Math.ceil(left * RING_N) - 1);
      return [on, left > 0.55 ? GREEN3 : left > 0.27 ? OPT3[1] : RED3];
    }
    if (!this.vDone) return [(k + Math.floor(t * 16)) % 4 === 0, WHITE3];
    return [true, OPT3[v.correct] || WHITE3];
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.ebPuck || !v) return;
    const m = this.mats.b, T = this.T, t = this.time, now = this.sNow();
    const ss = this.ss;
    // emoji yüzü (açılışta zıplar)
    let hop = 0, wob = 0;
    if (v.phase === 'reveal' && this.vT != null) { const u = (t - this.vT) / 0.7; if (u < 1) { hop = Math.sin(u * Math.PI) * 0.09; wob = Math.sin(u * 20) * (1 - u) * 0.08; } }
    if (v.phase === 'final') { hop = Math.abs(Math.sin(t * 3.2)) * 0.03; wob = Math.sin(t * 2.1) * 0.04; }
    M.set(m, 0, TABLE_Y + 0.002, 0, 0, 0, 0, ss);
    D(Wd.ebTray, m, T.obj);
    M.set(m, 0, TABLE_Y + 0.004 + hop * ss, 0, wob * 0.5, wob, 0, ss);
    D(Wd.ebPuck, m, T.obj);
    if (!shadow) D(Wd.ebFace[this.faceKind()], m, T.obj);
    // süre halkası
    if (!shadow) {
      for (let k = 0; k < RING_N; k++) {
        const a = Math.PI / 2 - (k / RING_N) * TAU;
        const [on, col] = this.ringState(k, t, now);
        M.set(m, Math.cos(a) * RING_R * ss, TABLE_Y + 0.02 * ss, Math.sin(a) * RING_R * ss, -a + Math.PI / 2, 0, 0, ss);
        D(on ? Wd.ebSegL : Wd.ebSeg, m, on ? col : OFF3);
      }
    }
    // cevap kartları (sap, disk, kenar)
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const st = this.padMat(m, a, i);
      D(Wd.ebPadH, m, T.obj);
      D(Wd.ebPadD, m, T.obj);
      let rim = WHITE3;
      if (st === 'up') { rim = this.padFace(i)[1]; if (this.shown() && v.phase === 'reveal' && (v.choices || [])[i] !== v.correct) rim = DIMW3; }
      D(Wd.ebPadR, m, rim);
    });
    // final: birincinin önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, -0.12, TABLE_Y + 0.004, 0.55);
        const u = clamp((t - (this.finT || 0) - 0.9) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.1 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  // dokulu yüzler: emoji balonları, kart yüzleri, doğru cevap afişi
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.ebBub || !v || !this.emoTex) return;
    const mc = this.mats.c, t = this.time;
    const list = this.emoList(), n = this.emoN();
    const ak = list.join('|') + '#' + n;
    if (ak !== this.atlasKey) { this.atlasKey = ak; try { drawEmojiAtlas(this.emoCv, list, n); updateTexture(X, this.emoTex, this.emoCv); } catch (e) { console.warn('[emj] emoji', e); } }
    // ekrana paralel (kameranın bakış yönüne dik) panolar: ekranın kenarında da dik ve düz görünür
    const c = this.cam, dx = c.ex - c.tx, dy = c.ey - c.ty, dz = c.ez - c.tz;
    const ry = Math.atan2(dx, dz), rx = -Math.atan2(dy, Math.hypot(dx, dz));
    const bill = (p, s) => { M.set(mc, p[0], p[1], p[2], ry, rx, 0, s); return mc; };
    // emoji balonları
    gl.uniform1f(X.tex.u.uSelf, 0.55);
    gl.bindTexture(gl.TEXTURE_2D, this.emoTex);
    for (let k = 0; k < n; k++) {
      const s = this.bubScale(k);
      if (s < 0.01) continue;
      drawMesh(X, Wd.ebBub[k], bill(this.bubW(k, n), s), ONE3);
    }
    // kart yüzleri
    gl.uniform1f(X.tex.u.uSelf, 0.35);
    gl.bindTexture(gl.TEXTURE_2D, this.padTex);
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const st = this.padMat(mc, a, i);
      drawMesh(X, Wd.ebPadB, mc, ONE3);
      if (st === 'up') { const [cell] = this.padFace(i); const dim = this.shown() && v.phase === 'reveal' && (v.choices || [])[i] !== v.correct; drawMesh(X, Wd.ebPadF[cell], mc, dim ? DIMT3 : ONE3); }
    });
    // doğru cevap afişi
    if (v.phase === 'reveal' && this.vT != null && v.correct >= 0) {
      const ck = `${v.game}|${v.q}|${v.correct}`;
      if (ck !== this.cardKey) { this.cardKey = ck; try { drawCard(this.cardCv, v.hint, v.options[v.correct], v.emojis, v.correct); updateTexture(X, this.cardTex, this.cardCv); } catch (e) { console.warn('[emj] afiş', e); } }
      const u = backOut((t - this.vT) / 0.45);
      if (u > 0.01) {
        const s = this.ss;
        gl.uniform1f(X.tex.u.uSelf, 0.6);
        gl.bindTexture(gl.TEXTURE_2D, this.cardTex);
        drawMesh(X, Wd.ebCard, bill([0, TABLE_Y + (CARD_Y + Math.sin(t * 1.5) * 0.02) * s, 0.2 * s], u * s), ONE3);
      }
    }
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
    const t = this.time, now = this.sNow(), ss = this.ss;
    for (let k = 0; k < RING_N; k++) {
      const [on, col] = this.ringState(k, t, now);
      if (!on) continue;
      const a = Math.PI / 2 - (k / RING_N) * TAU;
      this.glow(m, [Math.cos(a) * RING_R * ss, TABLE_Y + 0.035 * ss, Math.sin(a) * RING_R * ss], 0.13 * ss, col, 0.3);
    }
    // emoji balonlarının arkasında yumuşak ışık
    const nB = this.emoN(), L = this.emoList().length;
    for (let k = 0; k < Math.min(L, nB); k++) { const s = this.bubScale(k); if (s > 0.05) this.glow(m, this.bubW(k, nB), 0.42 * s, WHITE3, 0.1); }
    if (v.phase === 'reveal' && this.vT != null && v.correct >= 0) {
      const u = t - this.vT;
      this.glow(m, [0, TABLE_Y + CARD_Y * ss, 0.2 * ss], 1.35 * ss, OPT3[v.correct], 0.32 * Math.max(0.4, 1 - u / 2.5));
    }
    // kaldırılan doğru kartların ışığı
    if (v.phase === 'reveal' && this.shown()) {
      this.seats.forEach((p, i) => {
        if ((v.choices || [])[i] !== v.correct || this.padState(i) !== 'up') return;
        const a = this.av.get(p.id);
        if (!a) return;
        const h = a.hw[1];
        this.glow(m, [h[0], h[1] - 0.06 + PAD_Y, h[2]], 0.3, GREEN3, 0.22 + 0.06 * Math.sin(t * 5 + i));
      });
    }
    if (v.phase === 'final') (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (a && a.headW) this.glow(m, [a.headW[0], a.headW[1] + 0.1, a.headW[2]], 0.9, GOLD3, 0.18 + 0.05 * Math.sin(t * 3)); });
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="eb-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="eb-seg" role="group" aria-label="Soru sayısı"><button data-act="eb-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 10 bilmece</button><button data-act="eb-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🏆 Uzun · 20 bilmece</button></div>`; }
  dotsOf(k) {
    const v = this.view;
    return (v.choices || []).map((c, i) => (c === k ? `<i style="--pc:${pcol(v.seats[i]?.c ?? 0)}" title="${esc(nm0(v.seats[i]?.n || ''))}"></i>` : '')).join('');
  }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  emoLine(v) {
    const shownL = (v.emojis || []).map((e) => `<span>${esc(e)}</span>`).join('');
    const hid = Math.max(0, (v.emojiN || 0) - (v.emojis || []).length);
    return shownL + '<i>❔</i>'.repeat(hid);
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost;
    const now = this.sNow();
    if (v.phase === 'question' || v.phase === 'reveal') {
      const opts = v.options || [];
      const one = opts.some((o) => String(o).length > 22);
      const head = `<small><span class="cat">${catIcon(v.hint)} ${esc((v.hint || '').toLocaleUpperCase('tr-TR'))}</span><span>${v.q}/${v.qs}</span>${v.phase === 'reveal' ? '<span>· CEVAP</span>' : ''}</small><div class="em">${this.emoLine(v)}</div>`;
      if (v.phase === 'question') {
        const mine = v.myChoice;
        const opt = (k) => {
          const cls = mine === k ? ' on' : mine >= 0 ? ' off' : '';
          const dis = !v.amIn || mine >= 0 || v.closing;
          return `<button class="eb-o${cls}" data-act="eb-ans" data-c="${k}" style="--sc:${OPTC[k]}" ${dis ? 'disabled' : ''}><span class="lt">${OPT[k].l}</span><span class="tx">${esc(opts[k] || '')}</span>${mine === k ? '<span class="tg">🔒 Kartın</span>' : ''}</button>`;
        };
        const hid = Math.max(0, (v.emojiN || 0) - (v.emojis || []).length);
        const z = !v.amIn ? '👀 Bu bilmecede izliyorsun' : v.closing ? 'Herkes cevapladı!' : mine >= 0 ? '🔒 Kartın hazır' : hid > 0 ? `🔮 Şimdi bilirsen <b>+${hid * 100}</b> bonus` : 'Hızlı ol, erken cevap çok puan!';
        key = `q|${v.game}|${v.q}|${mine}|${v.answered}|${v.total}|${v.closing}|${v.amIn}|${(v.emojis || []).length}`;
        html = `<div class="eb-box"><div class="eb-q">${head}</div>
          <div class="eb-four${one ? ' one' : ''}">${[0, 1, 2, 3].map(opt).join('')}</div>
          <div class="eb-ft"><span class="n">✋ ${v.answered}/${v.total}</span><span class="z">${z}</span></div>
          ${this.timerBar()}</div>`;
      } else {
        const sh = this.shown();
        const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1, inR = me >= 0 && (v.inRound || [])[me];
        const canNext = sh && host && now - (v.at || 0) >= (v.nextMinMs || 3000);
        const last = v.q >= v.qs;
        const opt = (k) => {
          let cls = '', tg = '';
          if (sh) { if (k === v.correct) { cls = ' ok'; tg = '<span class="tg">✓ Doğru</span>'; } else if (k === mine) { cls = ' no'; tg = '<span class="tg">✗ Senin</span>'; } else cls = ' dim'; }
          else if (k === mine) { cls = ' on'; tg = '<span class="tg">🔒 Kartın</span>'; }
          return `<button class="eb-o${cls}" style="--sc:${OPTC[k]}" disabled><span class="lt">${OPT[k].l}</span><span class="tx">${esc(opts[k] || '')}</span>${sh ? `<span class="dots">${this.dotsOf(k)}</span>` : ''}${tg}</button>`;
        };
        let res;
        if (!sh) res = '<span class="m">🥁 Kartlar kalkıyor…</span>';
        else if (!inR) res = `<span class="m">${v.right ? `${v.right} kişi bildi` : 'Kimse bilemedi'}</span>`;
        else if (mine === v.correct) res = `<span class="g">+${fmt(v.gains[me])} puan</span>${(v.bonus || [])[me] ? `<em>🔮 +${fmt(v.bonus[me])} erken</em>` : ''}${v.fastest === me ? '<em>⚡ En hızlı</em>' : ''}`;
        else if (mine >= 0) res = `<span class="r">Bilemedin</span><span class="m">· ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        else res = `<span class="m">⏰ Süre doldu · ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        key = `r|${v.game}|${v.q}|${sh}|${canNext}`;
        html = `<div class="eb-box"><div class="eb-q">${head}</div>
          <div class="eb-four${one ? ' one' : ''}">${[0, 1, 2, 3].map(opt).join('')}</div>
          <div class="eb-res">${res}</div>
          <div class="eb-rk">${sh ? this.rankLine(v) : '&nbsp;'}</div>
          ${canNext ? `<div class="eb-row"><button class="eb-b" data-act="eb-next">${last ? 'Sonuçlara geç 🏁' : 'Sıradaki bilmece ▶'}</button></div>` : ''}
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
      html = `<div class="card eb-intro">
        <div class="tt">🤔 Emoji Bilmece</div>
        <div class="sub">Emojiler tek tek geliyor: filmi, diziyi, atasözünü ne kadar erken bulursan o kadar çok puan!</div>
        <div class="eb-ru"><div style="background:#ffe0f0"><b>🧩</b>Emojiler tek tek</div><div style="background:#fff0c2"><b>⚡</b>Hızlıya çok puan</div><div style="background:#e9d8ff"><b>🔮</b>Erken bilene bonus</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="eb-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Cevabını seçince kartını alırsın; açılışta herkes kartını aynı anda kaldırır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.flash) aw.push(`<div><b>⚡</b><span>En hızlı cevap<em>${nm(v.flash.i)} · ${sec1(v.flash.ms)} sn</em></span></div>`);
      if (v.oracle) aw.push(`<div><b>🔮</b><span>Kâhin<em>${nm(v.oracle.i)} · ${v.oracle.n} kez erken</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤯</b><span>Bu sefer kimse bilemedi!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>✅ ${S[i]?.right ?? 0}/${v.qs} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Bilmece bitti!</div>
        <div class="sub">${v.qs} bilmecede kim kaç emojide buldu?</div>
        <div class="eb-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="eb-aw">${aw.join('')}</div>` : ''}
        <div class="eb-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="eb-start" ${wait ? 'disabled' : ''}>🔁 Yeni bilmeceler</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const TOP = { question: `${v.q}/${v.qs} · ✋ ${v.answered ?? 0}/${v.total ?? 0} · ⏱ ${mmss(left)}`, reveal: `${v.q}/${v.qs} · ${this.shown() ? `✅ ${v.right ?? 0} kişi bildi` : '🥁 kartlar kalkıyor'}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.eb-tm i');
    const tot = v.phase === 'question' ? v.answerMs || 15e3 : v.phase === 'reveal' ? v.revealMs || 6500 : 0;
    if (tm && tot) {
      const u = clamp(left / tot, 0, 1);
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      if (v.phase === 'question') tm.style.setProperty('--tc', left > 8000 ? '#2fbf71' : left > 4000 ? '#f2b200' : '#ff4f5e');
      else tm.style.setProperty('--tc', '#b27cff');
    }
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const sh = this.shown();
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase !== 'intro') x += `<span class="eb-sc">${fmt((v.scores || [])[i])}</span>`;
      if (v.phase === 'question' && (v.picked || [])[i]) x += '<span>🔒</span>';
      if (v.phase === 'reveal' && sh && (v.inRound || [])[i]) { const c = (v.choices || [])[i]; if (c >= 0) x += `<span class="eb-v ${c === v.correct ? 'y' : 'n'}">${c === v.correct ? '✓' : '✗'}</span>${c === v.correct && (v.hid || [])[i] > 0 ? '<span>🔮</span>' : ''}`; }
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${['🥇', '🥈', '🥉'][pl - 1]}</span>`; }
      if (o.ebK !== x) {
        o.ebK = x;
        let el = o.lbl.querySelector('.eb-x');
        if (!el) { el = document.createElement('span'); el.className = 'eb-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.eb-x')) o.ebK = '';
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
    g.fillStyle = '#140b1c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a2c8f';
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
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = '#f0d8ff'; g.fillText(fmt((v.scores || [])[i]), x, y + 45); }
    });
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v) return;
    const cx = L.cx, cy = L.cy, r = L.r, t = this.time, now = this.sNow();
    const sc = Math.min(1, r / 150);
    // emoji yüzü ve süre halkası
    const pr = 46 * sc + 6;
    for (let k = 0; k < RING_N; k++) {
      const a = -Math.PI / 2 + (k / RING_N) * TAU;
      const [on, col] = this.ringState(k, t, now);
      g.fillStyle = on ? `rgb(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)})` : '#3a2550';
      g.beginPath(); g.arc(cx + Math.cos(a) * (pr + 9), cy + 34 * sc + Math.sin(a) * (pr + 9) * 0.8, 3 * sc + 1, 0, TAU); g.fill();
    }
    const fy = cy + 34 * sc;
    g.fillStyle = '#ffcc33'; g.beginPath(); g.ellipse(cx, fy, pr, pr * 0.8, 0, 0, TAU); g.fill();
    g.lineWidth = 3; g.strokeStyle = '#4a2a12'; g.stroke();
    const fk = this.faceKind();
    g.fillStyle = '#4a2a12'; g.strokeStyle = '#4a2a12'; g.lineWidth = 3; g.lineCap = 'round';
    [-1, 1].forEach((sx) => {
      const ex = cx + sx * pr * 0.32, ey = fy - pr * 0.2;
      if (fk === 'happy' || fk === 'party') { g.beginPath(); g.arc(ex, ey + 3, pr * 0.12, Math.PI, 0); g.stroke(); }
      else if (fk === 'shock') { g.beginPath(); g.moveTo(ex - 5, ey - 5); g.lineTo(ex + 5, ey + 5); g.moveTo(ex + 5, ey - 5); g.lineTo(ex - 5, ey + 5); g.stroke(); }
      else { g.beginPath(); g.ellipse(ex, ey, pr * 0.08, pr * 0.12, 0, 0, TAU); g.fill(); }
    });
    g.beginPath();
    if (fk === 'wow' || fk === 'shock') { g.ellipse(cx, fy + pr * 0.32, pr * 0.12, pr * 0.15, 0, 0, TAU); g.fill(); }
    else if (fk === 'think') { g.moveTo(cx - pr * 0.22, fy + pr * 0.34); g.lineTo(cx + pr * 0.22, fy + pr * 0.26); g.stroke(); }
    else if (fk === 'happy' || fk === 'party') { g.moveTo(cx - pr * 0.4, fy + pr * 0.15); g.quadraticCurveTo(cx, fy + pr * 0.75, cx + pr * 0.4, fy + pr * 0.15); g.closePath(); g.fill(); }
    else { g.arc(cx, fy + pr * 0.1, pr * 0.36, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    // emojiler (yüzün üstünde)
    const list = this.emoList();
    if (list.length && !(v.phase === 'reveal' && this.vDone)) {
      const fs = Math.round((list.length > 4 ? 26 : 32) * sc + 8);
      g.font = `${fs}px ${EMO_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const gap = fs * 1.25;
      list.forEach((e, k) => { const s = clamp(backOut((t - (this.emoSeen[k] ?? -9)) / 0.38), 0, 1.3); g.save(); g.translate(cx + (k - (list.length - 1) / 2) * gap, cy - 46 * sc + Math.sin(t * 1.8 + k) * 2); g.scale(s, s); g.fillText(e, 0, 0); g.restore(); });
    }
    // doğru cevap afişi
    if (v.phase === 'reveal' && this.vDone && v.correct >= 0) {
      const text = String(v.options[v.correct] || '');
      const fs = text.length > 26 ? 13 : 17;
      g.font = `900 ${fs}px system-ui`;
      const tw = Math.min(r * 1.4, g.measureText(text).width + 24);
      g.fillStyle = OPTC[v.correct]; g.strokeStyle = '#1c1633'; g.lineWidth = 3;
      rr(g, cx - tw / 2, cy - 64 * sc, tw, fs + 16, 10); g.fill(); g.stroke();
      g.fillStyle = '#1c1633'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cx, cy - 64 * sc + (fs + 16) / 2, tw - 12);
    }
    // oyuncuların kartları
    (v.seats || []).forEach((p, i) => {
      const [x0, y0] = this.flatPos(i);
      const st = this.padState(i);
      if (st === 'rest') return;
      const px = x0 + (cx - x0) * 0.26, py = y0 + (cy - y0) * 0.26 - (st === 'up' ? 8 : 0);
      let bg = '#efe7ff', txt = '?';
      if (st === 'up') { const c = (v.choices || [])[i]; if (v.phase === 'final') { const pl = placeOf(v, i); bg = MEDALC[pl - 1] || '#fff'; txt = String(pl); } else if (c >= 0) { bg = OPTC[c]; txt = OPT[c].l; } }
      g.globalAlpha = v.phase === 'reveal' && this.shown() && (v.choices || [])[i] !== v.correct ? 0.45 : 1;
      g.fillStyle = bg; g.beginPath(); g.arc(px, py, 11, 0, TAU); g.fill();
      g.lineWidth = 2; g.strokeStyle = '#1c1633'; g.stroke();
      g.fillStyle = '#1c1633'; g.font = '900 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, px, py + 1);
      g.globalAlpha = 1;
      if (v.phase === 'reveal' && this.vDone && (v.gains || [])[i] > 0 && this.vT != null) {
        const u = (t - this.vT) / 2.3;
        if (u <= 1) { g.globalAlpha = 1 - u * u; g.fillStyle = '#7dffb0'; g.font = '900 15px system-ui'; g.fillText(`+${fmt(v.gains[i])}`, x0, y0 - 44 - u * 22); g.globalAlpha = 1; }
      }
    });
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new EmojiGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[emj]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
