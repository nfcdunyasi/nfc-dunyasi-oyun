// Doğru mu Yanlış mı — 3D manşet masası (NFC Dünyası Oyun)
// Masanın ortasında eğik bir kürsüde gazete manşeti gibi basılmış bir cümle durur; kürsünün iki yanında iki kocaman lastik
// damga süzülür: solda yeşil DOĞRU ✓, sağda kırmızı YANLIŞ ✗. Kürsünün çevresindeki ışık halkası süreyi gösterir. Herkes
// cevabını gizlice verir (elleri kenetli bekler). Açılışta önce herkes aynı anda başparmağını kaldırır: 👍 doğru dedi, 👎 yanlış
// dedi. Sonra doğru damga havalanıp manşetin üstüne iner, kâğıda kocaman mürekkeple DOĞRU ya da YANLIŞ basılır; bilenler
// sevinir, bilemeyenler başını tutar, başlarında puan çıkar. Üst üste bilenin başında alev yanar (seri bonusu).
// Masa kiti (masa3d.js) ile çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-20-c';
import * as sfx from '../sfx.js?v=2026-11-20-c';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

const OPTC = ['#2fbf71', '#ff4f5e'];          // Doğru, Yanlış
const OPTD = ['#1f9d55', '#d7263d'];          // mürekkep
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const OPT3 = OPTC.map((h) => new Float32Array(rgb3(h)));
const GOLD3 = new Float32Array([1, 0.82, 0.3]), WHITE3 = new Float32Array([1, 1, 1]), RED3 = new Float32Array([1, 0.3, 0.32]), AMBER3 = new Float32Array([1, 0.71, 0.15]);
const OFF3 = new Float32Array([0.16, 0.12, 0.1]), DIM3 = new Float32Array([0.55, 0.55, 0.58]), FIRE3 = new Float32Array([1, 0.55, 0.15]);
const MEDALC = ['#ffd23f', '#dfe3f0', '#f0b88a'];
// ortadaki öğelerin ölçüleri (ölçek 1'de; this.ss ile birlikte büyür/küçülür)
const BASE_W = 1.0, BASE_D = 0.56, BASE_H = 0.07;   // kürsü tabanı
const PAPER_W = 0.92, PAPER_H = 0.575;                // manşet kâğıdı (doku 1024×640)
const BOARD_PAD = 0.035;                              // kâğıdın çevresindeki tahta payı
const STAMP_X = 0.8, STAMP_Y = 0.4, STAMP_Z = 0.06;   // damgaların yeri (kürsü uzayında)
const RING_N = 24, RING_R = 0.74;                     // süre halkası
const FLIP_T = 0.8, VERD_T = 1.6;                     // açılış: başparmaklar, damga (sn)
const EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', 'DejaVu Serif', serif";
const NEWS_L = { sunC: [0.5, 0.46, 0.42], sky: [0.44, 0.4, 0.38], gnd: [0.2, 0.16, 0.14], night: 1, warm: [1, 0.84, 0.62], lampC: [1.46, 1.24, 0.96], fogR: [30, 90], stars: 0, glowS: 0.3 };

const STYLE = `
#ky.dyg .msg{top:12%}
#ky.dyg .dy-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fffaf0;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.dyg .dy-q{border-radius:14px;background:#fffdf6;color:#1c1633;padding:6px 10px 8px;border:3px solid var(--ink);box-shadow:inset 0 0 0 3px #f1e6cf}
#ky.dyg .dy-q small{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;font-weight:900;letter-spacing:.07em}
#ky.dyg .dy-q small .st{background:#c8261c;color:#fff;border-radius:99px;padding:0 8px;letter-spacing:.05em}
#ky.dyg .dy-q small .fr{background:#ffedd5;color:#b4410f;border-radius:99px;padding:0 8px}
#ky.dyg .dy-q .tx{margin-top:4px;font:700 clamp(18px,5.2vw,23px)/1.22 ${SERIF};overflow-wrap:anywhere;text-wrap:balance}
#ky.dyg .dy-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
#ky.dyg .dy-o{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;min-height:58px;border:3px solid var(--ink);border-radius:16px;box-shadow:3px 3px 0 var(--ink);padding:6px 8px;font:900 clamp(19px,5.6vw,24px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;letter-spacing:.02em;background:var(--sc);color:#fff;-webkit-text-stroke:1px rgba(28,22,51,.35);-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:opacity .2s,filter .2s}
#ky.dyg .dy-o .ic{font:400 1.05em/1 ${EMO_FONT};-webkit-text-stroke:0}
#ky.dyg .dy-o .tg{position:absolute;right:-5px;top:-11px;background:#1c1633;color:#fff;border-radius:99px;padding:1px 7px;font:900 11px/1.5 system-ui,sans-serif;-webkit-text-stroke:0;letter-spacing:0;white-space:nowrap;box-shadow:0 0 0 2px #fff}
#ky.dyg .dy-o .dots{position:absolute;left:6px;bottom:4px;display:flex;flex-wrap:wrap;gap:2px;max-width:60%}
#ky.dyg .dy-o .dots i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.dyg .dy-o:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.dyg .dy-o.on{outline:4px solid #1c1633;outline-offset:2px;transform:translateY(-2px)}
#ky.dyg .dy-o.off{filter:saturate(.3) brightness(1.1);opacity:.55}
#ky.dyg .dy-o.ok{outline:4px solid #ffd23f;outline-offset:2px;transform:translateY(-2px)}
#ky.dyg .dy-o.ok .tg{background:#ffd23f;color:#1c1633}
#ky.dyg .dy-o.no .tg{background:#1c1633}
#ky.dyg .dy-o.dim{filter:saturate(.35) brightness(1.08);opacity:.5}
#ky.dyg .dy-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800;min-height:24px}
#ky.dyg .dy-ft .n{background:#1c1633;color:#fff;border-radius:99px;padding:2px 9px}
#ky.dyg .dy-ft .z{opacity:.8}
#ky.dyg .dy-ft .z b{color:#c21f33}
#ky.dyg .dy-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:6px 12px;font-weight:900;font-size:14px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.dyg .dy-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.dyg .dy-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.dyg .dy-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:transform .15s linear,background .3s}
#ky.dyg .dy-res{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;min-height:28px;font-weight:900;font-size:clamp(16px,4.6vw,20px)}
#ky.dyg .dy-res .g{color:#13894a}
#ky.dyg .dy-res .r{color:#c21f33}
#ky.dyg .dy-res .m{opacity:.7}
#ky.dyg .dy-res em{font-style:normal;font-size:12.5px;font-weight:900;border-radius:99px;padding:1px 8px;background:#ffedd5;color:#1c1633}
#ky.dyg .dy-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;font-weight:800;min-height:20px}
#ky.dyg .dy-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.dyg .dy-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.dyg .dy-rk span.me{background:#fff4c2}
#ky.dyg .dy-row{display:flex;gap:8px;justify-content:center;margin-top:7px}
#ky.dyg .lbl .dy-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.dyg .lbl .dy-x:empty{display:none}
#ky.dyg .lbl .dy-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#1c1633;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.dyg .lbl .dy-fr{display:inline-block;padding:0 4px;border-radius:9px;background:#ffedd5;color:#b4410f;font-weight:900;font-size:.8em;line-height:1.4}
#ky.dyg .lbl .dy-v{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:50%;color:#fff;font-weight:900;font-size:.8em;line-height:1;border:1.5px solid #1c1633}
#ky.dyg .lbl .dy-v.y{background:#2fbf71}
#ky.dyg .lbl .dy-v.n{background:#d7263d}
#ky.dyg .dy-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.dyg .dy-pt.neg{color:#ff8f9b}
#ky.dyg .dy-pt.go{animation:dypt 2.3s ease-out forwards}
@keyframes dypt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.dyg .card .dy-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.dyg .card .dy-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.dyg .card .dy-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.dyg .card .dy-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.dyg .card .dy-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.dyg .card .dy-seg button.on{background:var(--ink);color:#fff}
#ky.dyg .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.dyg .card .dy-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.dyg .card .dy-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.dyg .card .dy-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.dyg .card .dy-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.dyg .card .dy-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.dyg .card .dy-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.dyg .card .dy-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.dyg .card .dy-aw div:only-child{grid-column:1/-1}
#ky.dyg .card .dy-aw div b{font-size:18px;flex:0 0 auto}
#ky.dyg .card .dy-aw div span{flex:1;min-width:0;font-size:12px}
#ky.dyg .card .dy-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.dyg .card .dy-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.dyg .card .dy-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.dyg .card .dy-tb>div.me{background:#fff4c2}
#ky.dyg .card .dy-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.dyg .card .dy-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.dyg .card .dy-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.dyg .card .dy-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.dyg .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.dyg .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.dyg .dy-box{width:min(470px,54vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.dyg .dy-q{padding:4px 10px 6px}#ky.dyg .dy-q .tx{font-size:18px}
#ky.dyg .dy-o{min-height:46px;font-size:19px}
#ky.dyg .dy-two{margin-top:6px;gap:6px}
#ky.dyg .dy-ft{margin-top:5px}
#ky.dyg .dy-res{margin-top:5px;font-size:16px;min-height:22px}
#ky.dyg .dy-tm{margin-top:5px}
#ky.dyg .card .dy-ru{margin-top:6px}#ky.dyg .card .dy-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.dyg .card .dy-ru div b{font-size:17px}
#ky.dyg .card .dy-seg{margin-top:6px}#ky.dyg .card .dy-seg button{padding:6px 4px}
#ky.dyg .card .dy-pod{display:none}
#ky.dyg .card .dy-aw{margin-top:6px}
#ky.dyg .card .dy-tb{max-height:24vh}
#ky.dyg .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.dyg .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, final): haber odası caz svingi (Fa majör, 112 bpm): yürüyen bas, fırça davul, elektrikli piyano, vibrafon.
// 'race' (cümle ve sonuç): daktilo tıkırtılı gerilim (Re minör, 120 bpm): saat tikleri, pizzicato bas, alçak yaylılar, bando.
// 'mute' (başparmaklar kalkarken): müzik susar, davul gümbürtüsü çalar.
class DySnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 120 : 112; }
  swing() { return this.mode === 'race' ? 0.03 : 0.17; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // Dm – Bb – Gm – A7
      const CH = [[38, [62, 65, 69]], [34, [62, 65, 70]], [31, [62, 67, 70]], [33, [61, 64, 67]]];
      const [root, ch] = CH[bar % 4];
      this.iTick(t, s % 4 === 0 ? 0.05 : 0.022);
      if (s % 4 === 0) this.iKick(t, s === 0 ? 0.07 : 0.05, 110, 48, 0.12);
      if (s === 4 || s === 12) this.iSnare(t, 0.035, 0.08);
      if (s % 2 === 0) this.iPizz(t, (s % 8 === 4 ? root + 7 : root) + (s % 16 === 14 ? 12 : 0), 0.07, 0.3, 0.12);
      if (s % 2 === 1) this.iShk(t, 0.011);
      if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 5, 0.025, 1300, 0.3);   // bir sonraki ölçüye taşar: boşluk kalmaz
      if (s === 0 || (s === 6 && bar % 2)) ch.forEach((m) => this.iBrass(t, m, st * (s ? 0.8 : 1.2), s ? 0.014 : 0.019, 0.12));
      const MOT = [[74, null, 77, null, 76, null, 74, null], [null, 72, null, 74, null, 69, null, null]];
      if (bar % 4 >= 2 && s % 2 === 0) { const m = MOT[bar % 2][s >> 1]; if (m != null) this.iPluck(t, m, 0.024, st * 1.6, 'triangle', 3200, 0.25); }
      if (bar % 4 === 3 && s >= 12) this.iSnare(t, 0.02 + (s - 12) * 0.008, 0.06);
      return;
    }
    // Fmaj7 – Dm7 – Gm7 – C7
    const CH = [[41, [57, 60, 64]], [38, [57, 60, 65]], [43, [58, 62, 65]], [36, [58, 64, 67]]];
    const NX = [38, 43, 36, 41];
    const [root, ch] = CH[bar % 4];
    if (s % 4 === 0) { const k = s >> 2; const m = [root, root + 7, root + 12, NX[bar % 4] + 11][k]; this.iBass(t, m - 12, spb * 0.95, 0.075, 'up'); }
    if (s === 4 || s === 12) this.iBrush(t, 0.045, 0.18);
    if (s % 2 === 0) this.iHat(t, s % 4 === 0 ? 0.014 : 0.01);
    if (s % 4 === 2) this.iBrush(t, 0.016, 0.12);
    if (s === 2 || s === 10) ch.forEach((m, k) => this.iEP(t + k * 0.005, m, 0.019, st * 3, 0.2));
    if (s === 0) this.iPad(t, ch, spb * 5, 0.019, 1200, 0.3);
    const MEL = [[77, null, 76, 72, null, null, 69, null], [72, null, null, 74, 77, null, null, null], [79, null, 77, 74, null, 70, null, null], [72, null, 74, 76, null, 79, null, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null && bar % 8 < 4) this.iVibe(t, m, 0.03, st * 2.4, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'type': // yeni cümle: daktilo tıkırtısı ve satır çanı
        for (let i = 0; i < 9; i++) { const d = i * 0.055 + Math.random() * 0.02; this.noise(t + d, 0.018, 0.09, { type: 'bandpass', freq: 2600 + Math.random() * 1400, q: 2.5, attack: 0.001 }); this.tone(180 + Math.random() * 40, t + d, 0.02, 'square', 0.03, 120, 0.001); }
        this.iBell(t + 0.55, 96, 0.035, 0.7, 0.3);
        break;
      case 'lock': // cevabımı verdim
        this.iWood(t, 0.1, 640);
        this.noise(t + 0.01, 0.12, 0.05, { type: 'bandpass', freq: 1400, to: 3200, q: 0.8, attack: 0.01 });
        this.tone(523, t + 0.04, 0.1, 'triangle', 0.045, 784, 0.003);
        break;
      case 'peer':
        this.iWood(t, 0.045, 900 + Math.random() * 300);
        break;
      case 'flip': // herkes başparmağını kaldırır
        this.noise(t, 0.3, 0.08, { type: 'bandpass', freq: 500, to: 2600, q: 0.8, attack: 0.04 });
        for (let i = 0; i < Math.min(8, a || 4); i++) this.noise(t + 0.12 + i * 0.03 + Math.random() * 0.02, 0.04, 0.06, { type: 'bandpass', freq: 1800, q: 1.2 });
        break;
      case 'stamp': // damga kâğıda iner: tok gümbürtü ve kâğıt şaplağı
        this.duck(0.25, 1.2);
        this.tone(150, t, 0.25, 'sine', 0.32, 48, 0.002);
        this.noise(t, 0.08, 0.32, { type: 'lowpass', freq: 1500 });
        this.noise(t + 0.005, 0.14, 0.12, { type: 'bandpass', freq: 3600, q: 0.7 });
        this.iWood(t + 0.01, 0.12, 330);
        break;
      case 'right':
        [[76, 0], [79, 0.07], [84, 0.14]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.045, 0.9, 0.3));
        this.cheer(t + 0.15, 1.2);
        break;
      case 'streak': // seri sürüyor: alev "fuşş"
        this.noise(t, 0.6, 0.08, { type: 'bandpass', freq: 400, to: 2400, q: 0.7, attack: 0.05 });
        for (let i = 0; i < 4; i++) this.iBell(t + 0.08 + i * 0.06, 88 + [0, 3, 7, 12][i], 0.02, 0.5, 0.35);
        break;
      case 'wrong':
        this.tone(196, t, 0.18, 'square', 0.05, 175, 0.005);
        this.tone(165, t + 0.2, 0.34, 'square', 0.05, 140, 0.005);
        break;
      case 'miss':
        this.tone(392, t, 0.14, 'triangle', 0.06, 370, 0.01);
        this.tone(330, t + 0.15, 0.32, 'triangle', 0.06, 262, 0.01);
        break;
      case 'nobody':
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
const WOOD = () => C('#8a5a33', -0.45), WOOD_D = () => C('#5e3a1e', -0.45);
// kürsü tabanı (orijin masa üstü, ön +z)
function baseModel(mb) {
  mb.rbox(-BASE_W / 2, 0, -BASE_D / 2, BASE_W / 2, BASE_H, BASE_D / 2, 0.025, WOOD(), 2);
  mb.rbox(-BASE_W / 2 - 0.01, 0, -BASE_D / 2 - 0.01, BASE_W / 2 + 0.01, 0.018, BASE_D / 2 + 0.01, 0.008, WOOD_D(), 1);
}
// eğik tahta (kendi uzayında: kâğıt yüzü +z, merkez orijin); arkasında destek
function boardModel(mb) {
  const w = PAPER_W / 2 + BOARD_PAD, h = PAPER_H / 2 + BOARD_PAD;
  mb.rbox(-w, -h, -0.03, w, h, 0, 0.02, WOOD_D(), 2);
  mb.rbox(-w * 0.9, -h - 0.012, -0.004, w * 0.9, -h + 0.03, 0.035, 0.008, WOOD(), 1);   // kâğıdı tutan çıta
  mb.rbox(-0.03, -h * 0.9, -0.18, 0.03, h * 0.2, -0.03, 0.01, WOOD_D(), 1);              // arka destek
}
function paperQuad(tb) { const w = PAPER_W / 2, h = PAPER_H / 2; tb.tquad([-w, -h, 0.002], [w, -h, 0.002], [w, h, 0.002], [-w, h, 0.002], 0, 0, 1, 1, [0, 0, -1]); }
function segModel(mb, e) { mb.rbox(-0.04, 0, -0.013, 0.04, 0.011, 0.013, 0.005, C('#ffffff', e), 1); }
// lastik damga (orijin lastiğin altı, +y yukarı, ön yüz +z): gövde (renklenir), sap ve topuz (ahşap), lastik, simge
function stampBodyModel(mb) {
  mb.rbox(-0.13, 0.026, -0.09, 0.13, 0.12, 0.09, 0.022, C('#ffffff', -0.5), 2);
  mb.rbox(-0.11, 0.115, -0.07, 0.11, 0.14, 0.07, 0.012, C('#ffffff', -0.5), 1);
}
function stampWoodModel(mb) {
  const Wd = C('#b07a45', -0.75), Dk = C('#3a2a22', -0.3);
  mb.rbox(-0.12, 0, -0.08, 0.12, 0.028, 0.08, 0.01, Dk, 1);                     // lastik
  limb(mb, [0, 0.13, 0], [0, 0.24, 0], [0.028, 0.022], Wd, 10);                 // boyun
  mb.sphereS(0, 0.28, 0, 0.062, 0.05, 0.062, Wd, 16, 10);                        // topuz
}
function glyphModel(mb, kind) {
  const Wt = C('#ffffff', -0.3), z = 0.093;
  if (kind === 'ok') { limb(mb, [-0.058, 0.07, z], [-0.016, 0.035, z], [0.012, 0.012], Wt, 8); limb(mb, [-0.016, 0.035, z], [0.062, 0.11, z], [0.012, 0.012], Wt, 8); }
  else { limb(mb, [-0.045, 0.035, z], [0.045, 0.108, z], [0.012, 0.012], Wt, 8); limb(mb, [-0.045, 0.108, z], [0.045, 0.035, z], [0.012, 0.012], Wt, 8); }
}

/* ============================ dokular ============================ */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// yazıyı kutuya sığdır: en çok 'maxL' satır, yazı tipini küçült
function wrapFit(g, text, w, h, big, small, font, maxL = 4) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let best = null;
  for (let fs = big; fs >= small; fs -= 2) {
    g.font = font(fs);
    const lines = [];
    let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width <= w || !cur) cur = t; else { lines.push(cur); cur = wd; } }
    if (cur) lines.push(cur);
    best = { fs, lines };
    if (lines.length <= maxL && lines.length * fs * 1.18 <= h && lines.every((L) => g.measureText(L).width <= w)) return best;
  }
  return best;
}
// el yapımı hafif "kâğıt" gürültüsü (bir kez üretilir)
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  let s = 12345;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < d.data.length; i += 4) { const v = 200 + rnd() * 55; d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.9; d.data[i + 3] = 18; }
  g.putImageData(d, 0, 0);
  GRAIN = c;
  return c;
}
// mürekkep damgası (döndürülmüş, çift çerçeveli, yer yer boş: gerçek damga gibi)
function inkStamp(g, cx, cy, ok, sc = 1) {
  const W = 470 * sc, H = 150 * sc;
  const c = document.createElement('canvas'); c.width = Math.ceil(W + 20); c.height = Math.ceil(H + 20);
  const k = c.getContext('2d');
  const col = OPTD[ok ? 0 : 1];
  k.strokeStyle = col; k.fillStyle = col;
  k.lineWidth = 12 * sc; rr(k, 10, 10, W, H, 22 * sc); k.stroke();
  k.lineWidth = 4 * sc; rr(k, 24 * sc + 10, 24 * sc + 10, W - 48 * sc, H - 48 * sc, 12 * sc); k.stroke();
  k.font = `900 ${Math.round(92 * sc)}px ${F}`; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.fillText(ok ? 'DOĞRU ✓' : 'YANLIŞ ✗', 10 + W / 2, 10 + H / 2 + 4 * sc, W - 70 * sc);
  // yer yer mürekkep tutmamış: küçük delikler
  k.globalCompositeOperation = 'destination-out';
  let s = ok ? 777 : 999;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < 260; i++) { k.globalAlpha = 0.25 + rnd() * 0.6; k.beginPath(); k.arc(rnd() * c.width, rnd() * c.height, 1 + rnd() * 4 * sc, 0, TAU); k.fill(); }
  k.globalAlpha = 1; k.globalCompositeOperation = 'source-over';
  g.save();
  g.translate(cx, cy); g.rotate(ok ? -0.16 : 0.14);
  g.globalAlpha = 0.9;
  g.drawImage(c, -c.width / 2, -c.height / 2);
  g.restore();
}
// manşet kâğıdı (1024×640): kırmızı başlık bandı, cümle, alt yazı; sonuçta mürekkep damgası
function drawPaper(cv, q, qs, text, verdict) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, W, H);
  const gr = grain();
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) g.drawImage(gr, x, y);
  // başlık
  g.fillStyle = '#c8261c'; g.fillRect(0, 0, W, 104);
  g.fillStyle = '#ffffff'; g.font = `900 52px ${F}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('SON DAKİKA', 40, 54);
  g.textAlign = 'right'; g.font = `800 40px ${F}`;
  g.fillText(q ? `${q}/${qs}` : '', W - 40, 56);
  g.fillStyle = '#1c1633'; g.fillRect(40, 122, W - 80, 4); g.fillRect(40, 132, W - 80, 1.5);
  // cümle
  if (text) {
    const box = { x: 60, y: 150, w: W - 120, h: H - 150 - 96 };
    const L = wrapFit(g, `“${text}”`, box.w, box.h, 96, 36, (fs) => `700 ${fs}px ${SERIF}`);
    g.fillStyle = '#1c1633'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${L.fs}px ${SERIF}`;
    const lh = L.fs * 1.18, y0 = box.y + box.h / 2 - ((L.lines.length - 1) * lh) / 2;
    L.lines.forEach((ln, i) => g.fillText(ln, W / 2, y0 + i * lh, box.w));
  } else {
    g.fillStyle = '#1c1633'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 64px ${SERIF}`; g.fillText('Doğru mu, yanlış mı?', W / 2, H / 2 - 10);
    g.font = `600 34px ${SERIF}`; g.fillStyle = '#5c4a3a'; g.fillText('Manşetler birazdan masada…', W / 2, H / 2 + 52);
  }
  g.fillStyle = '#1c1633'; g.fillRect(40, H - 78, W - 80, 1.5);
  g.fillStyle = '#5c4a3a'; g.font = `800 30px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('DOĞRU MU, YANLIŞ MI?', W / 2, H - 42);
  if (verdict === 0 || verdict === 1) inkStamp(g, W / 2, H / 2 + 34, verdict === 0, 1.25);
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
const easeIO = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
const backOut = (u) => { const x = clamp(u, 0, 1) - 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; };
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const sec1 = (ms) => (ms / 1000).toFixed(1).replace('.', ',');
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };
const signed = (g) => (g > 0 ? `+${fmt(g)}` : g < 0 ? `−${fmt(-g)}` : '0');
const LBL = ['DOĞRU', 'YANLIŞ'], ICON = ['✅', '❌'];

/* ============================ oyun ============================ */
class TruthGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'dyg', cls: 'dyg', title: 'Doğru mu Yanlış mı?', sub: 'Manşet masası', emoji: '✅', css: STYLE, snd: new DySnd(), amb: 'diner', ambVol: 0.34, botPx: 300, botPxL: 34, cloth: '#2f5d50', trim: '#ffd23f', tea: false, place: false, chairPad: '#c8261c', lampHex: '#1f3a33', light: NEWS_L, fog: '#120d0b', roomStyle: { wall: '#2b1f1a', curtain: '#c8261c' } });
    this.lockSeen = new Map();
    this.ptEl = [];
    this.tint = new Float32Array(3);
    this.tint2 = new Float32Array(3);
    this.sYaw = 0; this.sTilt = 0.85;        // kürsünün kameraya dönüşü ve tahta eğimi
    this.sM = M.make(); this.sA = M.make(); this.sB = M.make();
    this.paperKey = '';
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.dyBase = this.mk(baseModel);
    W.dyBoard = this.mk(boardModel);
    W.dyPaper = this.mk(paperQuad, 'tex');
    W.dySeg = this.mk((mb) => segModel(mb, -0.5));
    W.dySegL = this.mk((mb) => segModel(mb, 0.9));
    W.dyBody = this.mk(stampBodyModel);
    W.dyWood = this.mk(stampWoodModel);
    W.dyOk = this.mk((mb) => glyphModel(mb, 'ok'));
    W.dyNo = this.mk((mb) => glyphModel(mb, 'no'));
    W.trophy = this.mk(K.trophyModel);
    this.paperCv = document.createElement('canvas'); this.paperCv.width = 1024; this.paperCv.height = 640;
    this.paperTex = makeTexture(this.X, this.paperCv);
    this.paperKey = '';
    try { document.fonts?.ready?.then(() => { if (!this.dead) this.paperKey = ''; }); } catch { /* yok */ }
  }
  freeTex() { const gl = this.X && this.X.gl; if (gl && this.paperTex) gl.deleteTexture(this.paperTex); this.paperTex = null; }
  onDispose() { this.ptEl.forEach((e) => e && e.remove()); this.ptEl = []; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  inPlay() { const v = this.view; return !!v && (v.phase === 'question' || v.phase === 'reveal') && Array.isArray(v.options); }
  revT() { const v = this.view; return v && v.phase === 'reveal' ? (this.sNow() - (v.at || 0)) / 1000 : -1; }
  flipped() { return this.revT() >= FLIP_T; }
  shown() { return this.revT() >= VERD_T; }
  get ss() { return this.ssV || 1; }
  // ekranda gösterilen puan ve seri: açılışta damga inene kadar eskisi
  dispScore(i) {
    const v = this.view;
    if (!v) return 0;
    const sc = (v.scores || [])[i] || 0;
    if (v.phase === 'reveal' && !this.shown()) return sc - ((v.gains || [])[i] || 0);
    return sc;
  }
  dispStreak(i) {
    const v = this.view;
    if (!v) return 0;
    const st = (v.streaks || [])[i] || 0;
    if (v.phase === 'reveal' && !this.shown()) { const c = (v.choices || [])[i]; return c === v.correct ? Math.max(0, st - 1) : this.prevStreak?.[i] ?? 0; }
    return st;
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'dy-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'dy-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'dy-ans') {
        if (!v || v.phase !== 'question' || !v.amIn || v.myChoice >= 0) return;
        const c = +b.dataset.c;
        this.fx('lock'); vibrate(18);
        this.lockSeen.set(v.seats[v.me]?.id, this.time);
        this.ctx.send('answer', { choice: c });
      }
      else if (act === 'dy-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.dyg !== '1') { root.dataset.dyg = '1'; root.innerHTML = '<p class="py-16 text-center">✅</p>'; }
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
      this.prevStreak = (v.streaks || []).slice();
      (v.seats || []).forEach((p, i) => {
        if (!(v.picked || [])[i] || this.lockSeen.has(p.id)) return;
        this.lockSeen.set(p.id, this.time);
        if (prev && prev.phase === 'question' && i !== v.me) this.fx('peer');
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const mus = (m) => { try { this.snd.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'question') {
      mus('race');
      this.lockSeen = new Map((v.seats || []).filter((p, i) => (v.picked || [])[i]).map((p) => [p.id, -9]));
      this.qT = fresh ? this.time : this.time - 9;
      this.tickSec = 0; this.upSeen = false;
      if (fresh) { this.fx('type'); this.msg(`📰 ${v.q}. MANŞET`, 'mid'); }
    }
    if (v.phase === 'reveal') {
      mus('mute');
      const rt = this.revT();
      this.flipFx = rt >= FLIP_T + 0.3;
      this.vDone = rt >= VERD_T + 0.4;
      this.vT = this.vDone ? this.time - 9 : null;
      if (fresh) { const pk = this.phKey; setTimeout(() => { if (!this.dead && this.phKey === pk) this.fx('drumroll', FLIP_T - 0.1); }, 60); }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.champFx = late;
      if (!late) this.msg('🏁 MANŞETLER BİTTİ', 'big');
    }
  }
  // damga indi: sesler, mürekkep, mesajlar, puan baloncukları
  onVerdict() {
    const v = this.view;
    this.vT = this.time;
    if (!(v.correct === 0 || v.correct === 1)) return;
    try { this.snd.music('race'); } catch { /* yok */ }
    this.fx('stamp');
    this.cam.shake = Math.max(this.cam.shake, 0.35);
    const P = this.paperW(0, 0.02);
    if (this.X) this.burst(P[0], P[1], P[2], 40, [[...OPT3[v.correct]], [0.15, 0.12, 0.2], [1, 1, 1]], 1.6, 0.035, false, 1.2, 3);
    const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1;
    const inR = me >= 0 && (v.inRound || [])[me];
    if (inR && mine === v.correct) {
      setTimeout(() => { if (!this.dead) this.fx('right'); }, 220);
      const st = (v.streaks || [])[me] || 0;
      if (st >= 2) setTimeout(() => { if (!this.dead) this.fx('streak'); }, 420);
      vibrate([15, 30, 15]);
      this.msg(v.fastest === me ? '⚡ EN HIZLI SENSİN!' : st >= 3 ? `🔥 ${st} SERİ!` : '✅ DOĞRU!', 'mid');
    } else if (inR && mine >= 0) { setTimeout(() => { if (!this.dead) this.fx('wrong'); }, 220); vibrate(40); this.msg('❌ YANLIŞ', 'mid'); }
    else if (inR) { setTimeout(() => { if (!this.dead) this.fx('miss'); }, 220); this.msg('⏰ SÜRE DOLDU', 'mid'); }
    if (!v.right) { setTimeout(() => { if (!this.dead) this.fx('nobody'); }, 600); if (!(inR && mine >= 0)) this.msg('🤯 KİMSE BİLEMEDİ', 'mid'); }
    (v.gains || []).forEach((g, i) => {
      if (!g) return;
      const e = this.ptBox(i);
      e.className = g > 0 ? 'dy-pt' : 'dy-pt neg';
      e.textContent = `${signed(g)}${(v.bonus || [])[i] > 0 ? ' 🔥' : ''}${g > 0 && v.fastest === i ? ' ⚡' : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
    });
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'dy-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- kürsü uzayı ---------- */
  // kürsü: masanın ortasında, kameraya dönük; tahta kamera yüksekliğine göre eğik (kâğıt kameraya tam bakar)
  stepStand(dt) {
    // kâğıt görüntü düzlemine paralel dursun (kameranın bakış yönüne dik): ekranın kenarında da eğri görünmez
    const c = this.cam;
    const dx = c.ex - c.tx, dz = c.ez - c.tz, dy = c.ey - c.ty;
    const yaw = Math.atan2(dx, dz), elev = clamp(Math.atan2(dy, Math.hypot(dx, dz)), 0.6, 1.15);
    this.sYaw += angDiff(yaw, this.sYaw) * (1 - Math.exp(-4 * dt));
    this.sTilt = damp(this.sTilt, elev, 3, dt);
  }
  // kürsü uzayındaki noktayı dünyaya çevir (x sağ, y yukarı, z kameraya doğru; orijin masa ortası, masa yüzeyi)
  standW(x, y, z) {
    const s = this.ss, c = Math.cos(this.sYaw), sn = Math.sin(this.sYaw);
    return [(x * c + z * sn) * s, TABLE_Y + y * s, (-x * sn + z * c) * s];
  }
  // tahtanın merkezi ve yönleri (kürsü uzayında): kâğıt yüzü normali n = (0, sin e, cos e)
  boardFrame() {
    const e = this.sTilt, h = PAPER_H / 2 + BOARD_PAD;
    const up = [0, Math.cos(e), -Math.sin(e)], n = [0, Math.sin(e), Math.cos(e)];
    const front = 0.16;
    const cen = [0, BASE_H + h * up[1] + 0.012, front + h * up[2]];
    return { cen, up, n };
  }
  // kâğıt üstündeki nokta (u, v: kâğıt boyutunun yarısına göre -1..1) → dünya; k: normal yönünde pay
  paperW(u, k = 0, v = 0) {
    const B = this.boardFrame();
    const x = u * PAPER_W / 2, y = v * PAPER_H / 2;
    return this.standW(x, B.cen[1] + B.up[1] * y + B.n[1] * k, B.cen[2] + B.up[2] * y + B.n[2] * k);
  }
  boardMat(m) { const B = this.boardFrame(); const p = this.standW(B.cen[0], B.cen[1], B.cen[2]); M.set(m, p[0], p[1], p[2], this.sYaw, -this.sTilt, 0, this.ss); return m; }
  land() { return (this.vw || 1) > (this.vh || 1) * 1.1; }
  // damganın bekleme yeri: yatay ekranda kürsünün iki yanında; dikeyde kâğıdın üst kenarının hemen üstünde yan yana
  stampHome(k) {
    if (this.land()) return [k ? STAMP_X : -STAMP_X, STAMP_Y, STAMP_Z];
    const B = this.boardFrame(), h = PAPER_H / 2 + BOARD_PAD;
    return [k ? 0.29 : -0.29, B.cen[1] + B.up[1] * (h + 0.05) + B.n[1] * 0.12, B.cen[2] + B.up[2] * (h + 0.05) + B.n[2] * 0.12];
  }
  // damganın matrisi ve durumu: k = 0 Doğru (sol), 1 Yanlış (sağ)
  stampPose(k) {
    const v = this.view, t = this.time, ss = this.ss;
    const home = this.stampHome(k);
    home[1] += Math.sin(t * 2.2 + k * 2.1) * 0.022;
    let p = home.slice(), rx = 0, rz = Math.sin(t * 1.4 + k) * 0.06, sq = 1, sink = 0;
    if (v && v.phase === 'question') {
      const left = (v.endsAt || 0) - this.sNow();
      if (left < 3000 && left > 0) rz += Math.sin(t * 18 + k * 1.7) * 0.07;           // sabırsız titreme
    }
    if (v && v.phase === 'reveal' && (v.correct === 0 || v.correct === 1)) {
      const tv = this.revT() - VERD_T;
      if (k === v.correct) {
        const B = this.boardFrame();
        const tilt = Math.PI / 2 - this.sTilt;
        const press = [0, B.cen[1] + B.n[1] * 0.002, B.cen[2] + B.n[2] * 0.002];
        const lift = [0, press[1] + B.n[1] * 0.28, press[2] + B.n[2] * 0.28];
        if (tv >= -0.5 && tv < -0.15) { const u = easeIO((tv + 0.5) / 0.35); p = home.map((x, j) => lerp(x, lift[j], u)); rx = tilt * u; }
        else if (tv >= -0.15 && tv < 0) { const u = easeIn((tv + 0.15) / 0.15); p = lift.map((x, j) => lerp(x, press[j], u)); rx = tilt; }
        else if (tv >= 0 && tv < 0.2) { p = press.slice(); rx = tilt; sq = 1 - 0.12 * Math.sin((tv / 0.2) * Math.PI); }
        else if (tv >= 0.2 && tv < 0.55) { const u = easeOut((tv - 0.2) / 0.35); p = press.map((x, j) => lerp(x, lift[j], u)); rx = tilt; }
        else if (tv >= 0.55 && tv < 1.2) { const u = easeIO((tv - 0.55) / 0.65); p = lift.map((x, j) => lerp(x, home[j], u)); rx = tilt * (1 - u); }
        if (tv >= 1.2) { p[1] += Math.abs(Math.sin(t * 5)) * 0.03; rz += Math.sin(t * 6) * 0.08; }   // sevinçle zıplar
      } else if (tv >= 0) {
        const u = clamp(tv / 0.9, 0, 1);
        rz += Math.sin(tv * 22) * 0.25 * (1 - u);            // "hayır" diye sallanır
        sink = 0.07 * easeOut(u);
      }
    }
    p[1] -= sink;
    return { p, rx, rz, sq };
  }
  stampMat(m, k, part = 'body') {
    const S = this.stampPose(k), ss = this.ss;
    const w = this.standW(S.p[0], S.p[1], S.p[2]);
    M.set(this.sA, w[0], w[1], w[2], this.sYaw, S.rx, S.rz, ss);
    M.set(this.sB, 0, 0, 0, 0, 0, 0, 1, part === 'wood' ? 1 : S.sq, 1);
    M.mul(m, this.sA, this.sB);
    return m;
  }

  /* ---------- karakterler ---------- */
  // başparmak: iki el öne kalkar; yukarı (doğru dedi) ya da aşağı (yanlış dedi)
  thumbPose(a, up, t, bob = 0) {
    a.pose('rest', { t });
    a.k = 10;
    const y = 1.12 + bob;
    a.tgt.hand[1] = [0.24, y, 0.34]; a.tgt.hand[0] = [-0.24, y, 0.34];
    a.tgt.fdir[1] = [0, 0.08, 1]; a.tgt.fdir[0] = [0, 0.08, 1];
    a.tgt.palm[1] = up ? [-1, 0, 0] : [1, 0, 0];
    a.tgt.palm[0] = up ? [1, 0, 0] : [-1, 0, 0];
    a.tgt.fw[0] = a.tgt.fw[1] = 1;
    a.tgt.pole[1] = [0.85, -0.5, -0.2]; a.tgt.pole[0] = [-0.85, -0.5, -0.2];
    a.shape = ['thumb', 'thumb'];
    a.handK = [1.45, 1.45];
  }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const mid = this.paperW(0, 0.05);
    const rt = this.revT(), fl = this.flipped(), sh = this.shown();
    const left = (v.endsAt || 0) - now;
    const champ = v.phase === 'final' ? v.champ || [] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.handK = null;
      const idle = a.dyI || (a.dyI = { lt: 0, look: null });
      const idleLook = (pC = 0.25) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const L = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = L.length && Math.random() > pC ? L[Math.floor(Math.random() * L.length)] : mid;
        }
        return idle.look;
      };
      if (v.phase === 'question') {
        if ((v.picked || [])[i]) { a.pose('clasp', { t }); a.expr = 'grin'; a.look = idleLook(0.45); return; }
        if ((v.inRound || [])[i]) {
          const hurry = left < 3000;
          a.pose(hurry ? (hs(i, v.q) < 0.5 ? 'bite' : 'headgrab') : Math.floor(t / 3.2 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = hurry ? 'tense' : Math.floor(t / 2.7 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = Math.floor(t / 2.1 + i) % 4 ? mid : idleLook(0.4);
        } else { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        const c = (v.choices || [])[i];
        if (!(v.inRound || [])[i]) { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        if (c < 0) { a.pose(fl ? 'shrug' : 'clasp', { t }); a.expr = fl ? 'o' : 'tense'; a.look = mid; return; }
        if (!fl) { a.pose('clasp', { t }); a.expr = 'tense'; a.look = mid; return; }
        const ok = c === v.correct, su = rt - VERD_T;
        if (!sh) { this.thumbPose(a, c === 0, t, 0); a.expr = 'grin'; a.look = mid; return; }
        if (ok) {
          if (su < 1.6) { this.thumbPose(a, c === 0, t, Math.abs(Math.sin(t * 8 + i)) * 0.06); a.expr = 'laugh'; a.look = idleLook(0.3); }
          else { a.pose(Math.floor(su / 1.2 + i) % 2 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = idleLook(0.3); }
        } else { a.pose(su < 1.4 ? (hs(i, v.q) < 0.5 ? 'facepalm' : 'headgrab') : 'slump', { t }); a.expr = su < 1.4 ? 'wince' : 'sad'; a.look = su < 1.4 ? mid : idleLook(0.2); }
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const pl = placeOf(v, i), medal = pl <= 3 && (v.scores || [])[i] > 0;
        if (champ.includes(i) && u > 0.6) { a.pose('cheer', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else if (medal && u > 0.6) { this.thumbPose(a, true, t, Math.abs(Math.sin(t * 6 + i)) * 0.04); a.expr = 'laugh'; a.look = idleLook(); }
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
    this.stepStand(dt);
    if (v.phase === 'reveal') {
      const rt = this.revT();
      if (!this.flipFx && rt >= FLIP_T) { this.flipFx = true; const n = (v.choices || []).filter((x) => x >= 0).length; if (n) this.fx('flip', n); }
      if (!this.vDone && rt >= VERD_T) { this.vDone = true; this.onVerdict(); }
    }
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'question' && v.amIn && v.myChoice < 0) {
      if (left > 0 && left < 3500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
      if (left <= 0 && !this.upSeen) { this.upSeen = true; this.fx('timeup'); }
    }
    if (v.phase === 'final' && !this.champFx && t - (this.finT || 0) >= 1.1) {
      this.champFx = true;
      if ((v.champ || []).length) {
        this.fx('champ');
        const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
        this.msg(`🏆 ${nm}`, 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, [[1, 0.85, 0.3], [1, 1, 1], [0.9, 0.2, 0.2]], 2.6, 0.04, false, 2.2, 2.4); });
      }
    }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'question' || v.phase === 'reveal') {
      const zk = clamp((this.ss / 1.5) * (2.26 / Math.max(1.5, this.Rs)), 0.68, 1.15);
      pa = land ? -0.02 : -0.08; bp = Math.max(170, this.barH || 300); sx = land ? 0.29 : 0.5;
      const wide = v.phase === 'reveal' && this.revT() > 0.15;
      H = this.paperW(0, 0, land ? 0 : 0.3);
      if (land) { zoom = (wide ? 0.74 : 0.62) * zk; sy = 0.5; }
      else {
        const vh = this.vh || 844, free = Math.max(160, vh - bp - 100);
        zoom = (wide ? 0.4 : 0.31) * zk * clamp(430 / free, 1, 1.7);
        sy = clamp((100 + free * 0.55) / vh, 0.2, 0.5);
      }
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
      if (!rev) { if (e.classList.contains('go')) e.className = 'dy-pt'; continue; }
      if (!e.classList.contains('go')) continue;
      const a = this.avatarAt(i);
      if (!a || !a.headW) continue;
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
    }
  }
  ringState(k, t, now) {
    const v = this.view;
    if (!v || v.phase === 'intro' || v.phase === 'final') { const on = (k + Math.floor(t * 8)) % 6 < 2; return [on, k % 2 ? OPT3[1] : OPT3[0]]; }
    if (v.phase === 'question') {
      if (v.closing) return [Math.floor(t * 8) % 2 === 0, WHITE3];
      const left = Math.max(0, (v.endsAt || 0) - now) / (v.answerMs || 8e3);
      const on = k < Math.ceil(left * RING_N - 0.001) && (left > 0.2 || Math.floor(t * 5) % 2 === 0 || k < Math.ceil(left * RING_N) - 1);
      return [on, left > 0.55 ? OPT3[0] : left > 0.27 ? AMBER3 : RED3];
    }
    if (!this.vDone) return [(k + Math.floor(t * 16)) % 4 === 0, WHITE3];
    return [true, OPT3[v.correct] || WHITE3];
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.dyBase || !v) return;
    const m = this.mats.b, T = this.T, t = this.time, now = this.sNow(), ss = this.ss;
    M.set(m, 0, TABLE_Y + 0.002, 0, this.sYaw, 0, 0, ss);
    D(Wd.dyBase, m, T.obj);
    D(Wd.dyBoard, this.boardMat(m), T.obj);
    if (!shadow) {
      for (let k = 0; k < RING_N; k++) {
        const a = Math.PI / 2 - (k / RING_N) * TAU;
        const [on, col] = this.ringState(k, t, now);
        M.set(m, Math.cos(a) * RING_R * ss, TABLE_Y + 0.004, Math.sin(a) * RING_R * ss, -a + Math.PI / 2, 0, 0, ss);
        D(on ? Wd.dySegL : Wd.dySeg, m, on ? col : OFF3);
      }
    }
    // damgalar
    const dimK = (k) => v.phase === 'reveal' && this.shown() && k !== v.correct;
    [0, 1].forEach((k) => {
      D(Wd.dyWood, this.stampMat(m, k, 'wood'), T.obj);
      D(Wd.dyBody, this.stampMat(m, k), dimK(k) ? this.mix(OPT3[k], DIM3, 0.55) : OPT3[k]);
      if (!shadow) D(k ? Wd.dyNo : Wd.dyOk, m, T.obj);
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
  mix(a, b, k) { const o = this.tint2; o[0] = lerp(a[0], b[0], k); o[1] = lerp(a[1], b[1], k); o[2] = lerp(a[2], b[2], k); return o; }
  // dokulu: manşet kâğıdı (cümle; damga indiyse mürekkep)
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.dyPaper || !v || !this.paperTex) return;
    const inP = this.inPlay();
    const verdict = inP && v.phase === 'reveal' && this.vDone && (v.correct === 0 || v.correct === 1) ? v.correct : -1;
    const key = inP ? `${v.game}|${v.q}|${v.text}|${verdict}` : `idle|${v.phase}`;
    if (key !== this.paperKey) {
      this.paperKey = key;
      try { drawPaper(this.paperCv, inP ? v.q : 0, v.qs, inP ? v.text : '', verdict); updateTexture(X, this.paperTex, this.paperCv); } catch (e) { console.warn('[dyg] manşet', e); }
    }
    gl.uniform1f(X.tex.u.uSelf, 0.45);
    gl.bindTexture(gl.TEXTURE_2D, this.paperTex);
    drawMesh(X, Wd.dyPaper, this.boardMat(this.mats.c), ONE3);
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
      this.glow(m, [Math.cos(a) * RING_R * ss, TABLE_Y + 0.02, Math.sin(a) * RING_R * ss], 0.13 * ss, col, 0.3);
    }
    // doğru damganın ışığı
    if (v.phase === 'reveal' && this.vT != null && (v.correct === 0 || v.correct === 1)) {
      const S = this.stampPose(v.correct), w = this.standW(S.p[0], S.p[1] + 0.12, S.p[2]);
      this.glow(m, w, 0.5 * ss, OPT3[v.correct], 0.3 * Math.max(0.35, 1 - (t - this.vT) / 2.5));
      const P = this.paperW(0, 0.03);
      this.glow(m, P, 0.9 * ss, OPT3[v.correct], 0.22 * Math.max(0.3, 1 - (t - this.vT) / 2));
    }
    if (v.phase === 'final') (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (a && a.headW) this.glow(m, [a.headW[0], a.headW[1] + 0.1, a.headW[2]], 0.9, GOLD3, 0.18 + 0.05 * Math.sin(t * 3)); });
  }
  // serisi 3 ve üstü olanın başında alev
  extraParts(V, emit) {
    const v = this.view;
    if (!v || !this.inPlay()) return;
    const t = this.time;
    this.seats.forEach((p, i) => {
      const st = this.dispStreak(i);
      if (st < 3) return;
      const a = this.av.get(p.id);
      if (!a || !a.headW) return;
      const k = Math.min(1, (st - 2) / 4);
      for (let j = 0; j < 7; j++) {
        const u = ((t * 1.6 + j / 7 + i * 0.13) % 1);
        const r = (1 - u) * (0.07 + 0.05 * k);
        const x = a.headW[0] + Math.sin(j * 2.4 + t * 3) * r * 0.5, z = a.headW[2] + Math.cos(j * 1.7 + t * 2.6) * r * 0.5;
        emit(x, a.headW[1] + 0.2 + u * (0.28 + 0.12 * k), z, (0.09 + 0.05 * k) * (1 - u * 0.6), 1, 0.45 + 0.4 * (1 - u), 0.1, (0.55 + 0.25 * k) * (1 - u), true);
      }
    });
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="dy-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="dy-seg" role="group" aria-label="Cümle sayısı"><button data-act="dy-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 12 cümle</button><button data-act="dy-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🏆 Uzun · 24 cümle</button></div>`; }
  dotsOf(k) {
    const v = this.view;
    return (v.choices || []).map((c, i) => (c === k ? `<i style="--pc:${pcol(v.seats[i]?.c ?? 0)}" title="${esc(nm0(v.seats[i]?.n || ''))}"></i>` : '')).join('');
  }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  head(v) {
    const st = v.me >= 0 ? this.dispStreak(v.me) : 0;
    return `<small><span class="st">📰 MANŞET ${v.q}/${v.qs}</span>${st >= 2 ? `<span class="fr">🔥 ${st} seri</span>` : ''}${v.phase === 'reveal' ? '<span>· SONUÇ</span>' : ''}</small><div class="tx">${esc(v.text || '')}</div>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost;
    const now = this.sNow();
    if (v.phase === 'question' || v.phase === 'reveal') {
      if (v.phase === 'question') {
        const mine = v.myChoice;
        const opt = (k) => {
          const cls = mine === k ? ' on' : mine >= 0 ? ' off' : '';
          const dis = !v.amIn || mine >= 0 || v.closing;
          return `<button class="dy-o${cls}" data-act="dy-ans" data-c="${k}" style="--sc:${OPTC[k]}" ${dis ? 'disabled' : ''}><span class="ic">${ICON[k]}</span><span>${LBL[k]}</span>${mine === k ? '<span class="tg">🔒 Cevabın</span>' : ''}</button>`;
        };
        const z = !v.amIn ? '👀 Bu cümlede izliyorsun' : v.closing ? 'Herkes cevapladı!' : mine >= 0 ? '🔒 Cevabın kilitlendi' : '⚡ Hızlıya çok puan · <b>yanlış −200</b>';
        key = `q|${v.game}|${v.q}|${mine}|${v.answered}|${v.total}|${v.closing}|${v.amIn}`;
        html = `<div class="dy-box"><div class="dy-q">${this.head(v)}</div>
          <div class="dy-two">${[0, 1].map(opt).join('')}</div>
          <div class="dy-ft"><span class="n">✋ ${v.answered}/${v.total}</span><span class="z">${z}</span></div>
          ${this.timerBar()}</div>`;
      } else {
        const fl = this.flipped(), sh = this.shown();
        const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1, inR = me >= 0 && (v.inRound || [])[me];
        const canNext = sh && host && now - (v.at || 0) >= (v.nextMinMs || 2600);
        const last = v.q >= v.qs;
        const opt = (k) => {
          let cls = '', tg = '';
          if (sh) { if (k === v.correct) { cls = ' ok'; tg = '<span class="tg">✓ Gerçek</span>'; } else if (k === mine) { cls = ' no'; tg = '<span class="tg">✗ Senin</span>'; } else cls = ' dim'; }
          else if (k === mine) { cls = ' on'; tg = '<span class="tg">🔒 Cevabın</span>'; }
          return `<button class="dy-o${cls}" style="--sc:${OPTC[k]}" disabled><span class="ic">${ICON[k]}</span><span>${LBL[k]}</span>${fl ? `<span class="dots">${this.dotsOf(k)}</span>` : ''}${tg}</button>`;
        };
        let res;
        const g = me >= 0 ? (v.gains || [])[me] || 0 : 0, bn = me >= 0 ? (v.bonus || [])[me] || 0 : 0;
        if (!fl) res = '<span class="m">🥁 Herkes elini kaldırıyor…</span>';
        else if (!sh) res = '<span class="m">🖋️ Damga geliyor…</span>';
        else if (!inR) res = `<span class="m">${v.right ? `${v.right} kişi bildi` : 'Kimse bilemedi'}</span>`;
        else if (mine === v.correct) res = `<span class="g">${signed(g)} puan</span>${bn > 0 ? `<em>🔥 ${(v.streaks || [])[me]} seri +${fmt(bn)}</em>` : ''}${v.fastest === me ? '<em>⚡ En hızlı</em>' : ''}${(v.ms || [])[me] >= 0 ? `<em>⏱ ${sec1(v.ms[me])} sn</em>` : ''}`;
        else if (mine >= 0) res = `<span class="r">${g < 0 ? `${signed(g)} puan` : 'Bilemedin'}</span><span class="m">· ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        else res = `<span class="m">⏰ Süre doldu · ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        key = `r|${v.game}|${v.q}|${fl}|${sh}|${canNext}`;
        html = `<div class="dy-box"><div class="dy-q">${this.head(v)}</div>
          <div class="dy-two">${[0, 1].map(opt).join('')}</div>
          <div class="dy-res">${res}</div>
          <div class="dy-rk">${sh ? this.rankLine(v) : '&nbsp;'}</div>
          ${canNext ? `<div class="dy-row"><button class="dy-b" data-act="dy-next">${last ? 'Sonuçlara geç 🏁' : 'Sıradaki manşet ▶'}</button></div>` : ''}
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
      html = `<div class="card dy-intro">
        <div class="tt">✅ Doğru mu Yanlış mı?</div>
        <div class="sub">Manşet gelir: doğru mu yanlış mı? Hızlı bilene çok puan, üst üste bilene seri bonusu!</div>
        <div class="dy-ru"><div style="background:#dcf7e6"><b>⏱️</b>8 saniye</div><div style="background:#ffedd5"><b>🔥</b>Seri bonusu</div><div style="background:#ffd9de"><b>❌</b>Yanlışa −200</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="dy-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Cevabını gizlice ver; sonuçta herkes aynı anda başparmağını kaldırır, sonra damga iner.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.flash) aw.push(`<div><b>⚡</b><span>En hızlı cevap<em>${nm(v.flash.i)} · ${sec1(v.flash.ms)} sn</em></span></div>`);
      if (v.fire) aw.push(`<div><b>🔥</b><span>En uzun seri<em>${nm(v.fire.i)} · ${v.fire.n} üst üste</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤯</b><span>Bu sefer kimse puan alamadı!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>✅ ${S[i]?.right ?? 0} · ❌ ${S[i]?.wrong ?? 0} · 🔥 ${S[i]?.streak ?? 0} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Manşetler bitti!</div>
        <div class="sub">${v.qs} cümlede kim doğruyu yanlıştan ayırdı?</div>
        <div class="dy-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="dy-aw">${aw.join('')}</div>` : ''}
        <div class="dy-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="dy-start" ${wait ? 'disabled' : ''}>🔁 Yeni manşetler</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const TOP = { question: `${v.q}/${v.qs} · ✋ ${v.answered ?? 0}/${v.total ?? 0} · ⏱ ${mmss(left)}`, reveal: `${v.q}/${v.qs} · ${this.shown() ? `✅ ${v.right ?? 0} kişi bildi` : this.flipped() ? '🖋️ damga geliyor' : '🥁 eller kalkıyor'}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.dy-tm i');
    const tot = v.phase === 'question' ? v.answerMs || 8e3 : v.phase === 'reveal' ? v.revealMs || 5200 : 0;
    if (tm && tot) {
      const u = clamp(left / tot, 0, 1);
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      if (v.phase === 'question') tm.style.setProperty('--tc', left > 4400 ? '#2fbf71' : left > 2200 ? '#f2b200' : '#ff4f5e');
      else tm.style.setProperty('--tc', '#b08a5a');
    }
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const fl = this.flipped(), sh = this.shown();
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase !== 'intro') x += `<span class="dy-sc">${fmt(this.dispScore(i))}</span>`;
      const st = this.inPlay() ? this.dispStreak(i) : 0;
      if (st >= 2) x += `<span class="dy-fr">🔥${st}</span>`;
      if (v.phase === 'question' && (v.picked || [])[i]) x += '<span>🔒</span>';
      if (v.phase === 'reveal' && fl && (v.inRound || [])[i]) {
        const c = (v.choices || [])[i];
        if (c >= 0 && !sh) x += `<span>${c === 0 ? '👍' : '👎'}</span>`;
        if (c >= 0 && sh) x += `<span class="dy-v ${c === v.correct ? 'y' : 'n'}">${c === v.correct ? '✓' : '✗'}</span>`;
      }
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${['🥇', '🥈', '🥉'][pl - 1]}</span>`; }
      if (o.dyK !== x) {
        o.dyK = x;
        let el = o.lbl.querySelector('.dy-x');
        if (!el) { el = document.createElement('span'); el.className = 'dy-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.dy-x')) o.dyK = '';
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
    g.fillStyle = '#120d0b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f5d50';
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.86, L.r * 0.68, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
    this.draw2dGame(g, L);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const v = this.view;
    const fl = this.flipped(), sh = this.shown();
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = '#ffe9c7'; g.fillText(fmt(this.dispScore(i)) + (this.inPlay() && this.dispStreak(i) >= 2 ? ` 🔥${this.dispStreak(i)}` : ''), x, y + 45); }
      // başparmak / sonuç
      if (v && v.phase === 'reveal' && fl && (v.inRound || [])[i]) {
        const c = (v.choices || [])[i];
        if (c >= 0) {
          g.font = `22px ${EMO_FONT}`;
          g.globalAlpha = sh && c !== v.correct ? 0.45 : 1;
          g.fillText(c === 0 ? '👍' : '👎', x, y - 1);
          g.globalAlpha = 1;
        }
      } else if (v && v.phase === 'question' && (v.picked || [])[i]) { g.font = `15px ${EMO_FONT}`; g.fillText('🔒', x, y); }
    });
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    // manşet kâğıdı
    const pw = Math.min(L.r * 1.25, L.w * 0.78), ph = pw * (PAPER_H / PAPER_W), px = L.cx - pw / 2, py = L.cy - ph / 2;
    if (!this.paper2) { this.paper2 = document.createElement('canvas'); this.paper2.width = 1024; this.paper2.height = 640; }
    const inP = this.inPlay();
    const verdict = inP && v.phase === 'reveal' && this.vDone && (v.correct === 0 || v.correct === 1) ? v.correct : -1;
    const key = inP ? `${v.game}|${v.q}|${v.text}|${verdict}` : `idle|${v.phase}`;
    if (key !== this.paper2Key) { this.paper2Key = key; try { drawPaper(this.paper2, inP ? v.q : 0, v.qs, inP ? v.text : '', verdict); } catch { /* yok */ } }
    // süre noktaları
    for (let k = 0; k < RING_N; k++) {
      const a = -Math.PI / 2 + (k / RING_N) * TAU;
      const [on, col] = this.ringState(k, t, now);
      g.fillStyle = on ? `rgb(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)})` : '#3a2c22';
      g.beginPath(); g.arc(L.cx + Math.cos(a) * (pw / 2 + 14), L.cy + Math.sin(a) * (ph / 2 + 14), 3, 0, TAU); g.fill();
    }
    g.save(); g.translate(2, 3); g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, px, py, pw, ph, 6); g.fill(); g.restore();
    g.drawImage(this.paper2, px, py, pw, ph);
    g.lineWidth = 2; g.strokeStyle = '#1c1633'; rr(g, px, py, pw, ph, 6); g.stroke();
    // damgalar (iki yanda)
    [0, 1].forEach((k) => {
      const x = k ? px + pw + 22 : px - 22, y = L.cy - 6 + Math.sin(t * 2.2 + k * 2) * 3;
      let dim = v.phase === 'reveal' && this.shown() && k !== v.correct;
      g.globalAlpha = dim ? 0.45 : 1;
      g.fillStyle = OPTC[k]; g.strokeStyle = '#1c1633'; g.lineWidth = 2;
      rr(g, x - 16, y - 8, 32, 20, 5); g.fill(); g.stroke();
      g.fillStyle = '#b07a45'; g.beginPath(); g.arc(x, y - 16, 7, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = '900 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(k ? '✗' : '✓', x, y + 2);
      g.globalAlpha = 1;
    });
    // puan baloncukları
    if (v.phase === 'reveal' && this.vDone && this.vT != null) {
      (v.gains || []).forEach((gn, i) => {
        if (!gn) return;
        const u = (t - this.vT) / 2.3;
        if (u > 1) return;
        const [x0, y0] = this.flatPos(i);
        g.globalAlpha = 1 - u * u; g.fillStyle = gn > 0 ? '#7dffb0' : '#ff8f9b'; g.font = '900 15px system-ui'; g.textAlign = 'center';
        g.fillText(signed(gn), x0, y0 - 44 - u * 22); g.globalAlpha = 1;
      });
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new TruthGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[dyg]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
