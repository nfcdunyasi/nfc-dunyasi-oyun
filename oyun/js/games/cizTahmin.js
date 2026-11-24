// Çiz Tahmin — 3D çizim tahtası (NFC Dünyası Oyun)
// Masanın ortasında ayaklı bir kâğıt tahtası (flip chart) durur. Sırası gelen üç kelimeden birini seçer ve parmağıyla
// doğrudan tahtaya çizer; masadakiler tahminini yazar. Çizgiler herkesin ekranında kalemle çiziliyormuş gibi akarak
// belirir, çizen karakter elindeki kalemle tahtayı gösterir. Süre ilerledikçe birkaç harf açılır; çok yaklaşan tahmine
// "çok yakın" denir. Tur bitince kelime damga gibi sayfaya basılır ve sayfa tahtanın üstünden arkaya çevrilir.
// Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünümde aynı tahtaya çizilir.
import { _masa } from './masa3d.js?v=2026-11-24-b';
import * as sfx from '../sfx.js?v=2026-11-24-b';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel, xfP } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture } = E;
void sfx;

const BX = 1000, BY = 700;                 // tahta koordinatları (sunucuyla aynı)
const HW = 0.8, HH = HW * 0.7;             // kâğıdın yarı eni / yarı boyu (dünya birimi)
const CY = 0.82;                           // kâğıt merkezinin masadan yüksekliği
const TILT = 0.16;                         // tahta hafif geriye yatık
const PZ = 0.014;                          // kâğıdın yüzü (gövdenin önünde)
const TS = 1.2;                            // doku ölçeği: 1000×700 → 1200×840 piksel
const FLIP_S = 0.85;                       // sayfa çevirme süresi (sn)
const COLS0 = ['#1C1633', '#FF3B30', '#0A84FF', '#30D158', '#FFD60A', '#FFFFFF', '#FF9F0A', '#8E5A2B'];
const SIZES = [5, 11, 24];
const COL_N = { '#1C1633': 'Siyah', '#FF3B30': 'Kırmızı', '#0A84FF': 'Mavi', '#30D158': 'Yeşil', '#FFD60A': 'Sarı', '#FFFFFF': 'Silgi', '#FF9F0A': 'Turuncu', '#8E5A2B': 'Kahverengi' };
const GREEN3 = [0.3, 0.9, 0.45], GOLD3 = [1, 0.84, 0.36];
const FONT = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const POST_BOARD = { bloom: 0.3, th: 0.92, tilt: [0.5, 0.33, 0], vig: 0.55 };

const STYLE = `
#ky.czt canvas.mz-cv{touch-action:none}
#ky.czt .lbls,#ky.czt .lbls *{pointer-events:none}
#ky.czt .msg{top:50%}
#ky.czt .ct-tag{position:absolute;left:0;top:0;z-index:4;pointer-events:none;display:flex;align-items:center;gap:.45em;white-space:nowrap;border:3px solid #1c1633;border-radius:16px;background:#fffdf6;color:#1c1633;box-shadow:3px 3px 0 #1c1633;padding:.18em .6em;font-weight:900;font-size:22px;line-height:1.15;transition:opacity .25s}
#ky.czt .ct-tag:empty{display:none}
#ky.czt .ct-tag.word{background:#ffd23f}
#ky.czt .ct-tag.ok{background:#3ccf6e;color:#fff}
#ky.czt .ct-tag.dark{background:#1d2430;color:#fff}
#ky.czt .ct-tag .mk{display:inline-flex;gap:.12em;font-family:ui-monospace,Menlo,Consolas,monospace}
#ky.czt .ct-tag .mk i{font-style:normal;display:inline-block;min-width:.72em;text-align:center;border-bottom:.12em solid currentColor;line-height:1.05}
#ky.czt .ct-tag .mk i.h{color:#e0322f}
#ky.czt .ct-tag .mk i.new{animation:ctpop .55s cubic-bezier(.2,1.6,.4,1)}
#ky.czt .ct-tag .mk i.sp{border-bottom:0;min-width:.35em}
#ky.czt .ct-tag em{font-style:normal;font-size:max(11.5px,.58em);font-weight:800;opacity:.75;font-family:system-ui,sans-serif}
#ky.czt .ct-tag .tm{font-size:.62em;background:#1c1633;color:#fff;border-radius:99px;padding:.08em .55em;font-variant-numeric:tabular-nums;font-family:system-ui,sans-serif}
#ky.czt .ct-tag.dark .tm{background:#fff;color:#1c1633}
#ky.czt .ct-tag .tm.hot{background:#e0322f;color:#fff;animation:ctbl .5s ease-in-out infinite alternate}
@keyframes ctpop{0%{transform:scale(.2) translateY(-.4em)}100%{transform:none}}
@keyframes ctbl{to{transform:scale(1.14)}}
#ky.czt .ct-fd{position:absolute;left:0;top:0;z-index:4;pointer-events:none;display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:min(560px,92vw)}
#ky.czt .ct-fd div{display:flex;align-items:center;gap:6px;font-weight:800;font-size:15px;line-height:1.2;background:rgba(255,253,246,.95);color:#1c1633;border:2px solid #1c1633;border-radius:12px;padding:4px 10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-shadow:2px 2px 0 rgba(28,22,51,.55);animation:ctf 6s ease-out forwards}
#ky.czt .ct-fd div i{flex:0 0 auto;width:11px;height:11px;border-radius:50%;background:var(--pc);border:2px solid #1c1633}
#ky.czt .ct-fd div b{font-weight:900}
#ky.czt .ct-fd div.ok{background:#3ccf6e;color:#fff}
#ky.czt .ct-fd div.mine{background:#ffe1d6}
#ky.czt .ct-pl{position:absolute;left:0;top:0;z-index:4;pointer-events:none;display:flex;flex-wrap:wrap;justify-content:center;gap:5px;width:min(560px,94vw)}
#ky.czt .ct-pl:empty{display:none}
#ky.czt .ct-pl span{display:inline-flex;align-items:center;gap:4px;font-weight:800;font-size:12.5px;background:rgba(12,10,26,.62);color:#fff;border:2px solid rgba(255,255,255,.28);border-radius:99px;padding:2px 9px 2px 5px;white-space:nowrap}
#ky.czt .ct-pl span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #fff}
#ky.czt .ct-pl span.d{background:#ffd23f;color:#1c1633;border-color:#1c1633}
#ky.czt .ct-pl span.ok{background:#3ccf6e;border-color:#1c1633}
#ky.czt .ct-pl span.me{outline:2px solid #fff}
#ky.czt .ct-pl span.off{opacity:.45}
#ky.czt .ct-pl span em{font-style:normal;font-weight:900;font-size:11px;opacity:.85;margin-left:2px}
@keyframes ctf{0%{opacity:0;transform:translateY(8px)}5%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
#ky.czt .ct-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:8px 10px 9px;text-align:center}
#ky.czt .ct-box.dark{background:#1d2430;color:#fff}
#ky.czt .ct-box.okb{background:#d6f5e0}
#ky.czt .ct-hd{font-size:clamp(15px,4.4vw,19px);font-weight:900;line-height:1.25;display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap}
#ky.czt .ct-hd b{background:#ffd23f;color:#1c1633;border:2px solid #1c1633;border-radius:9px;padding:0 8px;letter-spacing:.03em}
#ky.czt .ct-hd em{font-style:normal;font-size:13px;font-weight:800;opacity:.78}
#ky.czt .ct-s{font-size:12.5px;font-weight:700;opacity:.76;line-height:1.3;margin-top:4px}
#ky.czt .ct-cols{display:flex;gap:6px;justify-content:center;margin-top:7px;flex-wrap:nowrap}
#ky.czt .ct-c{flex:0 0 auto;width:min(36px,9.2vw);height:min(36px,9.2vw);border-radius:50%;border:3px solid #1c1633;background:var(--c);box-shadow:2px 2px 0 #1c1633;-webkit-tap-highlight-color:transparent;touch-action:manipulation;padding:0;position:relative;transition:transform .12s}
#ky.czt .ct-c.on{transform:scale(1.16);box-shadow:0 0 0 3px #ffd23f,2px 2px 0 #1c1633}
#ky.czt .ct-c.er::after{content:"🧽";position:absolute;inset:0;display:grid;place-items:center;font-size:15px}
#ky.czt .ct-row{display:flex;gap:6px;justify-content:center;align-items:center;margin-top:7px;flex-wrap:wrap}
#ky.czt .ct-w{width:42px;height:38px;border-radius:12px;border:3px solid #1c1633;background:#fff;display:grid;place-items:center;box-shadow:2px 2px 0 #1c1633;padding:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.czt .ct-w i{display:block;border-radius:50%;background:#1c1633}
#ky.czt .ct-w.on{background:#ffd23f}
#ky.czt .ct-b{border:3px solid #1c1633;border-radius:12px;box-shadow:2px 2px 0 #1c1633;padding:7px 12px;font-weight:900;font-size:14px;background:#fff;color:#1c1633;-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.czt .ct-b.warn{background:#e0322f;color:#fff}
#ky.czt .ct-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:12.5px;padding:4px 9px;border-width:2px}
#ky.czt .ct-b[disabled]{opacity:.45}
#ky.czt .ct-picks{display:grid;gap:7px;margin-top:8px}
#ky.czt .ct-pk{border:4px solid #1c1633;border-radius:16px;box-shadow:4px 4px 0 #1c1633;background:#ffd23f;color:#1c1633;font-weight:900;font-size:clamp(19px,5.6vw,24px);letter-spacing:.03em;padding:10px 8px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.czt .ct-pk:nth-child(2){background:#9fe3ff}
#ky.czt .ct-pk:nth-child(3){background:#ffc2d1}
#ky.czt .ct-pk:active,#ky.czt .ct-b:active,#ky.czt .ct-w:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1c1633}
#ky.czt .ct-form{display:flex;gap:6px}
#ky.czt .ct-form input{flex:1;min-width:0;border:3px solid #1c1633;border-radius:13px;padding:10px 12px;font-size:17px;font-weight:800;background:#fff;color:#1c1633}
#ky.czt .ct-form button{border:3px solid #1c1633;border-radius:13px;box-shadow:3px 3px 0 #1c1633;padding:0 15px;font-weight:900;font-size:16px;background:#3ccf6e;color:#fff;-webkit-tap-highlight-color:transparent}
#ky.czt .ct-note{font-size:13px;font-weight:900;min-height:17px;margin-top:5px;line-height:1.3}
#ky.czt .ct-note .hot{color:#e0322f}
#ky.czt .ct-note .no{opacity:.7}
#ky.czt .ct-tm{display:flex;align-items:center;gap:8px;margin-top:7px}
#ky.czt .ct-tm .bar{flex:1;height:7px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden}
#ky.czt .ct-tm .bar i{display:block;height:100%;background:#3ccf6e;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.czt .ct-tm .bar i.hot{background:#ff5a36}
#ky.czt .ct-tm b{font-size:15px;font-weight:900;min-width:42px;text-align:right;font-variant-numeric:tabular-nums}
#ky.czt .ct-res{display:grid;gap:4px;margin-top:7px;max-height:min(25vh,200px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.czt .ct-res div{display:flex;align-items:center;gap:8px;border:2px solid #1c1633;border-radius:11px;padding:3px 9px;background:#fff;font-weight:800;font-size:13.5px;color:#1c1633}
#ky.czt .ct-res div i{flex:0 0 auto;width:11px;height:11px;border-radius:50%;background:var(--pc);border:2px solid #1c1633}
#ky.czt .ct-res div span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky.czt .ct-res div b{white-space:nowrap}
#ky.czt .ct-res div.dr{background:#fff4c2}
#ky.czt .lbl .ct-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.czt .lbl .ct-x:empty{display:none}
#ky.czt .lbl .ct-p{display:inline-block;min-width:16px;padding:0 4px;border-radius:9px;background:#3ccf6e;color:#fff;font-weight:900;font-size:.85em;line-height:1.35;text-align:center}
#ky.czt .lbl.ct-on{box-shadow:0 0 0 3px #ffd23f,0 0 16px rgba(255,210,63,.8)}
#ky.czt .lbl.ct-ok{box-shadow:0 0 0 3px #3ccf6e,0 0 14px rgba(60,207,110,.7)}
#ky.czt .ct-bub{position:absolute;left:0;top:0;pointer-events:none;z-index:4;white-space:nowrap;max-width:46vw;overflow:hidden;text-overflow:ellipsis;border:3px solid #1c1633;border-radius:14px;background:#fff;color:#1c1633;font-weight:900;font-size:14px;padding:3px 10px;box-shadow:2px 2px 0 #1c1633;transition:opacity .25s}
#ky.czt .ct-bub:after{content:"";position:absolute;left:calc(50% + var(--tx,0px));bottom:-9px;margin-left:-6px;border:6px solid transparent;border-top-color:#1c1633}
#ky.czt .ct-bub.ok{background:#3ccf6e;color:#fff}
#ky.czt .ct-pop{position:absolute;left:0;top:0;pointer-events:none;z-index:4;font-weight:900;font-size:24px;color:#3ccf6e;-webkit-text-stroke:1.5px #1c1633;text-shadow:2px 2px 0 #1c1633}
#ky.czt .card .ct-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.czt .card .ct-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.czt .card .ct-seg button.on{background:var(--ink);color:#fff}
#ky.czt .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.czt .card .ct-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.czt .card .ct-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.czt .card .ct-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.czt .card .ct-tb{display:grid;gap:5px;margin-top:10px;max-height:min(30vh,250px);overflow:auto;text-align:left}
#ky.czt .card .ct-tb div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:4px 10px;background:#fff;font-weight:800;font-size:14px;color:var(--ink)}
#ky.czt .card .ct-tb div.me{background:#fff4c2}
#ky.czt .card .ct-tb div i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.czt .card .ct-tb div span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.czt .card .ct-tb div em{font-style:normal;font-size:11.5px;opacity:.7;font-weight:700;white-space:nowrap}
#ky.czt .card .ct-tb div b{font-weight:900;white-space:nowrap}
#ky.czt .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.czt .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.czt .ct-box{width:min(420px,44vw);padding:6px 9px 7px;max-height:calc(100vh - 64px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.czt .ct-c{width:30px;height:30px}
#ky.czt .ct-cols{gap:5px;flex-wrap:wrap}
#ky.czt .ct-w{width:36px;height:32px}
#ky.czt .ct-pk{padding:6px 8px;font-size:18px}
#ky.czt .ct-form input{padding:7px 10px;font-size:16px}
#ky.czt .ct-tm{margin-top:5px}
#ky.czt .ct-res{max-height:30vh}
#ky.czt .card .ct-tb{max-height:24vh;margin-top:6px}
#ky.czt .card .ct-ru{margin-top:6px}#ky.czt .card .ct-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.czt .card .ct-ru div b{font-size:17px}
#ky.czt .card .ct-seg{margin-top:6px}#ky.czt .card .ct-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.czt .mz-bar{align-items:flex-end}#ky.czt .msg{left:48%;top:38%}}
`;

/* ============================ müzik ve sesler ============================ */
// Çizim defteri havası: Fa majör, marimba melodisi, pizzicato bas, ukulele gibi akor vuruşları, fırça ve çıngırak
// (96 bpm). Çizim sırasında melodi seyrelir, tik-tak eden bir saat tahta tokmağı girer (104 bpm).
class CtSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.2; }
  tempo() { return this.mode === 'race' ? 104 : 96; }
  swing() { return this.mode === 'race' ? 0.06 : 0.14; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const race = this.mode === 'race';
    const CH = [[41, [65, 69, 72]], [38, [62, 65, 69]], [34, [62, 65, 70]], [36, [64, 67, 70]]];
    const alt = Math.floor(bar / 4) % 2 === 1;
    const [root, ch] = alt && bar % 4 === 1 ? [45, [64, 69, 72]] : CH[bar % 4];
    // yumuşak akor dolgusu (boşlukları doldurur)
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 3.8, race ? 0.016 : 0.02, 1300, 0.25);
    // pizzicato bas: kök, beşli, yürüyüş notaları
    if (s === 0) this.iPizz(t, root + 12, 0.15, 0.36, 0.08);
    if (s === 8) this.iPizz(t, root + 19, 0.12, 0.3, 0.08);
    if (s === 6 || s === 14) this.iPizz(t, root + (s === 6 ? 16 : 17), 0.07, 0.18, 0.08);
    // ukulele gibi akor vuruşları
    if (s === 4 || s === 12 || (!race && s === 10)) ch.forEach((m, k) => this.iPluck(t + k * 0.012, m, race ? 0.03 : 0.036, 0.34, 'triangle', 2600, 0.12));
    if (s === 4 || s === 12) this.iBrush(t, race ? 0.04 : 0.05, 0.15);
    if (s % 2 === 0) this.iShk(t, s % 4 === 0 ? 0.015 : 0.022);
    if (race && s % 4 === 0) this.iWood(t, 0.055, s % 8 === 0 ? 1250 : 940);
    const MEL = [
      [72, null, 69, 72, 74, null, 72, null, 69, null, 65, null, 67, 69, null, null],
      [74, null, 72, 74, 77, null, 74, null, 72, null, 69, null, 70, 72, null, null],
      [70, null, 74, null, 77, null, 74, 72, 70, null, 69, null, 67, null, null, null],
      [67, 69, 70, 72, 74, null, 72, null, 76, null, 77, null, null, null, null, null]];
    const m = MEL[bar % 4][s];
    if (m != null) this.iMarimba(t, m + (alt && !race ? 12 : 0), race ? 0.06 : 0.09, 0.14);
    if (s === 0 && bar % 4 === 0) this.iBell(t, 89, race ? 0.016 : 0.022, spb * 2, 0.3);
    if (s === 0 || (!race && s === 8 && bar % 2 === 1)) this.iKick(t, race ? 0.07 : 0.09, 110, 50, 0.16);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'squeak': { // keçeli kalem gıcırtısı
        const f = 3300 + Math.random() * 1700, v = 0.024 * (a || 1);
        this.noise(t, 0.06 + Math.random() * 0.06, v, { type: 'bandpass', freq: f, to: f * 0.78, q: 7, attack: 0.008 });
        this.tone(f * 1.3, t, 0.04, 'sine', v * 0.15, f * 1.1, 0.004);
        break;
      }
      case 'uncap': this.tone(1500, t, 0.03, 'square', 0.03, 900, 0.001); this.noise(t + 0.01, 0.05, 0.05, { type: 'bandpass', freq: 2400, q: 1.5, attack: 0.002 }); break;
      case 'flip': // sayfa çevrilir
        this.noise(t, 0.38, 0.07, { type: 'bandpass', freq: 1500, to: 4200, q: 0.7, attack: 0.07 });
        this.noise(t + 0.28, 0.2, 0.05, { type: 'bandpass', freq: 1100, to: 600, q: 0.8, attack: 0.01 });
        this.tone(150, t + 0.46, 0.08, 'sine', 0.07, 95, 0.003);
        break;
      case 'myturn': this.duck(0.3, 0.8); [[784, 0], [1047, 0.1], [1319, 0.2]].forEach(([f, d]) => this.tone(f, t + d, 0.18, 'square', 0.035, null, 0.004)); break;
      case 'ok': this.tone(1047, t, 0.25, 'triangle', 0.08, null, 0.003); this.tone(1568, t + 0.08, 0.32, 'triangle', 0.07, null, 0.003); break;
      case 'mine':
        this.duck(0.25, 1.4);
        [[1047, 0], [1319, 0.07], [1568, 0.14], [2093, 0.21]].forEach(([f, d]) => this.tone(f, t + d, 0.3, 'triangle', 0.08, null, 0.003));
        this.cheer(t + 0.1, 0.9);
        break;
      case 'close': this.tone(523, t, 0.16, 'sine', 0.075, 660, 0.01); this.tone(784, t + 0.13, 0.3, 'sine', 0.075, 740, 0.01); this.tone(1568, t + 0.15, 0.2, 'triangle', 0.025, null, 0.004); break;
      case 'nope': this.tone(320, t, 0.1, 'square', 0.03, 240, 0.004); break;
      case 'feed': this.tone(1320, t, 0.035, 'triangle', 0.02, null, 0.002); break;
      case 'hint': this.tone(2093, t, 0.3, 'sine', 0.045, null, 0.002); this.tone(2794, t + 0.07, 0.35, 'sine', 0.035, null, 0.002); this.tone(3136, t + 0.14, 0.4, 'sine', 0.025, null, 0.002); break;
      case 'timeup': this.duck(0.3, 1.2); this.tone(392, t, 0.16, 'square', 0.05, null, 0.004); this.tone(262, t + 0.18, 0.5, 'square', 0.05, 250, 0.004); break;
      case 'all': this.duck(0.3, 1.6); [[1568, 0], [2093, 0.12]].forEach(([f, d]) => this.tone(f, t + d, 0.5, 'sine', 0.07, null, 0.002)); this.cheer(t, 1.5); break;
      case 'reveal': // kısa trampet + açılış
        this.duck(0.25, 1.4);
        for (let k = 0; k < 10; k++) this.noise(t + k * 0.045, 0.04, 0.03 + k * 0.004, { type: 'bandpass', freq: 1800, q: 0.9 });
        this.tone(1175, t + 0.5, 0.5, 'triangle', 0.07, null, 0.003);
        this.tone(1568, t + 0.5, 0.6, 'triangle', 0.05, null, 0.003);
        break;
      case 'stamp': this.tone(110, t, 0.12, 'sine', 0.12, 70, 0.002); this.noise(t, 0.06, 0.08, { type: 'lowpass', freq: 900 }); break;
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
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// Kâğıt tahtasının gövdesi (tahta uzayı: kâğıt merkezi orijinde, +Z izleyiciye): arka pano, kâğıt destesi, üst kıskaç,
// alttaki kalem rafı ve rafta duran kalemler
function boardModel(mb) {
  const Fr = C('#343a44', -0.6), Fr2 = C('#262a31', -0.55), Bk = C('#eeebe3', -0.2), Pad = C('#e4dfd3', -0.15), Knob = C('#c9ccd2', -0.85);
  mb.rbox(-HW - 0.07, -HH - 0.08, -0.04, HW + 0.07, HH + 0.05, -0.006, 0.022, Fr, 2);
  mb.rbox(-HW - 0.035, -HH - 0.045, -0.012, HW + 0.035, HH + 0.02, 0.0, 0.01, Bk, 1);
  mb.rbox(-HW, -HH, 0.0, HW, HH, PZ - 0.003, 0.003, Pad, 1);
  // üst kıskaç ve vidaları
  mb.rbox(-HW - 0.09, HH - 0.012, -0.034, HW + 0.09, HH + 0.08, PZ + 0.032, 0.026, Fr2, 2);
  for (const x of [-HW * 0.62, HW * 0.62]) mb.sphereS(x, HH + 0.034, PZ + 0.034, 0.026, 0.026, 0.014, Knob, 10, 6);
  // kalem rafı
  mb.rbox(-HW + 0.02, -HH - 0.13, -0.035, HW - 0.02, -HH - 0.085, 0.11, 0.012, Fr, 2);
  mb.rbox(-HW + 0.02, -HH - 0.13, 0.095, HW - 0.02, -HH - 0.06, 0.112, 0.008, Fr2, 1);
  [['#FF3B30', -0.46], ['#0A84FF', -0.2], ['#30D158', 0.3], ['#1C1633', 0.52]].forEach(([col, x], k) => {
    const y = -HH - 0.07, z = 0.035 + (k % 2) * 0.03;
    limb(mb, [x - 0.075, y, z], [x + 0.05, y, z], [0.014, 0.014], C('#f4f4f0', -0.4), 10);
    limb(mb, [x + 0.05, y, z], [x + 0.088, y, z], [0.0145, 0.0145], C(col, -0.5), 10);
    limb(mb, [x - 0.075, y, z], [x - 0.092, y, z], [0.01, 0.006], C(col, -0.5), 8);
  });
}
// Sehpa ayakları (sehpa uzayı: masa yüzeyi orijinde, tahtayla aynı yöne bakar)
function legsModel(mb) {
  const Wd = C('#8a5a34', -0.5), Wd2 = C('#6b4226', -0.45), Rub = C('#2a2220', -0.3);
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const Cc = [0, CY, 0], ay = [0, ct, -st], az = [0, st, ct];
  const s = (CY - 0.05 * st) / ct;
  for (const sx of [-1, 1]) {
    const top = vadd(vadd(vadd(Cc, [sx * 0.56, 0, 0]), vmul(ay, HH + 0.17)), vmul(az, -0.05));
    const foot = vadd(vadd(vadd(Cc, [sx * 0.64, 0, 0]), vmul(ay, -s)), vmul(az, -0.05));
    foot[1] = 0;
    limb(mb, foot, top, [0.026, 0.021], Wd, 8);
    mb.sphereS(foot[0], 0.008, foot[2], 0.034, 0.012, 0.034, Rub, 8, 4);
  }
  const topB = vadd(vadd(Cc, vmul(ay, HH + 0.11)), vmul(az, -0.06));
  const footB = [0, 0, -0.8];
  limb(mb, footB, topB, [0.024, 0.019], Wd2, 8);
  mb.sphereS(0, 0.008, -0.8, 0.032, 0.012, 0.032, Rub, 8, 4);
  // ön ayakları bağlayan çubuk
  const ya = 0.16;
  const pA = vadd(vadd(vadd(Cc, [-0.6, 0, 0]), vmul(ay, -(s - ya / ct))), vmul(az, -0.05)), pB = [-pA[0], pA[1], pA[2]];
  limb(mb, pA, pB, [0.014, 0.014], Wd2, 6);
}
function paperQuad(tb) { tb.tquad([-HW, -HH, PZ], [HW, -HH, PZ], [HW, HH, PZ], [-HW, HH, PZ], 0, 0, 1, 1, [0, 0, -1]); }
// çevrilen sayfa: menteşe (üst kenar) orijinde, aşağı sarkar
function pageFront(tb) { tb.tquad([-HW, -2 * HH, 0], [HW, -2 * HH, 0], [HW, 0, 0], [-HW, 0, 0], 0, 0, 1, 1, [0, -HH, -1]); }
function pageBack(mb) { mb.quad([-HW, -2 * HH, -0.002], [HW, -2 * HH, -0.002], [HW, 0, -0.002], [-HW, 0, -0.002], C('#f3f0e8', -0.15), [0, -HH, 1]); }
// elde tutulan kalem (el uzayı: parmaklar -Y yönünde) ve ucu (o anki renkle boyanır)
function markerModel(mb) {
  limb(mb, [0.006, 0.02, 0.034], [0.006, -0.19, 0.034], [0.017, 0.017], C('#f4f4f0', -0.4), 10);
  limb(mb, [0.006, 0.02, 0.034], [0.006, 0.06, 0.034], [0.0175, 0.0175], C('#1C1633', -0.5), 10);
}
function markerTip(mb) { limb(mb, [0.006, -0.19, 0.034], [0.006, -0.232, 0.034], [0.012, 0.004], C('#ffffff', -0.3), 8); }

/* ============================ kâğıt (2D tuval) ============================ */
function paintPaper(cv) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, W, H);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,108,88,${0.02 + rnd() * 0.03})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 1); }
  g.fillStyle = 'rgba(70,110,170,.13)';
  for (let y = 60; y < H; y += 60) for (let x = 60; x < W; x += 60) { g.beginPath(); g.arc(x, y, 1.7, 0, TAU); g.fill(); }
  const gr = g.createLinearGradient(0, 0, 0, 46);
  gr.addColorStop(0, 'rgba(0,0,0,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, 46);
}
// el çizimi gibi titrek çizgi
function wobble(g, pts, col, w, seed = 1) {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5) * 3;
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + r(), y + r()) : g.moveTo(x, y)));
  g.stroke();
}
function circlePts(cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 28) { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return P; }
function fitFont(g, text, max, w0, weight = 900) { let fs = w0; g.font = `${weight} ${fs}px ${FONT}`; while (g.measureText(text).width > max && fs > 20) { fs -= 3; g.font = `${weight} ${fs}px ${FONT}`; } return fs; }
function paintTitle(g, W, H) {
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.translate(W / 2, H * 0.4); g.rotate(-0.045);
  fitFont(g, 'Çiz Tahmin', W * 0.8, 150);
  g.fillStyle = '#1C1633'; g.fillText('Çiz Tahmin', 0, 0);
  g.restore();
  wobble(g, [[W * 0.22, H * 0.56], [W * 0.4, H * 0.545], [W * 0.6, H * 0.552], [W * 0.78, H * 0.535]], '#FF3B30', 12, 3);
  // kalem
  g.save(); g.translate(W * 0.16, H * 0.2); g.rotate(0.7);
  wobble(g, [[-70, -14], [60, -14], [86, 0], [60, 14], [-70, 14], [-70, -14]], '#0A84FF', 9, 5);
  wobble(g, [[60, -14], [60, 14]], '#0A84FF', 7, 6);
  g.restore();
  // ampul / soru işareti
  wobble(g, circlePts(W * 0.85, H * 0.2, 46, 52, Math.PI * 0.75, Math.PI * 2.25), '#FFD60A', 10, 7);
  wobble(g, [[W * 0.83, H * 0.29], [W * 0.83, H * 0.33], [W * 0.87, H * 0.33], [W * 0.87, H * 0.29]], '#8E5A2B', 8, 8);
  g.font = `900 64px ${FONT}`; g.fillStyle = '#FF9F0A'; g.textAlign = 'center'; g.fillText('?', W * 0.85, H * 0.205);
  // ev, kalp, yıldız
  wobble(g, [[W * 0.13, H * 0.86], [W * 0.13, H * 0.74], [W * 0.2, H * 0.66], [W * 0.27, H * 0.74], [W * 0.27, H * 0.86], [W * 0.13, H * 0.86]], '#8E5A2B', 9, 9);
  wobble(g, [[W * 0.18, H * 0.86], [W * 0.18, H * 0.79], [W * 0.22, H * 0.79], [W * 0.22, H * 0.86]], '#FF3B30', 8, 10);
  const hp = []; for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); hp.push([W * 0.5 + x * 3.2, H * 0.78 + y * 3.2]); }
  wobble(g, hp, '#FF3B30', 9, 11);
  const sp = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 26 : 60; sp.push([W * 0.82 + Math.cos(a) * r, H * 0.78 + Math.sin(a) * r]); }
  wobble(g, sp, '#30D158', 9, 12);
}
function paintFinal(g, W, H, names) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // kupa
  const cx = W / 2, cy = H * 0.36;
  wobble(g, [[cx - 110, cy - 95], [cx + 110, cy - 95], [cx + 96, cy - 10], [cx + 50, cy + 40], [cx - 50, cy + 40], [cx - 96, cy - 10], [cx - 110, cy - 95]], '#FF9F0A', 12, 21);
  wobble(g, circlePts(cx - 120, cy - 52, 40, 38, Math.PI * 0.5, Math.PI * 1.5, 16), '#FF9F0A', 10, 22);
  wobble(g, circlePts(cx + 120, cy - 52, 40, 38, -Math.PI * 0.5, Math.PI * 0.5, 16), '#FF9F0A', 10, 23);
  wobble(g, [[cx - 18, cy + 40], [cx - 18, cy + 88], [cx + 18, cy + 88], [cx + 18, cy + 40]], '#FF9F0A', 10, 24);
  wobble(g, [[cx - 80, cy + 90], [cx + 80, cy + 90], [cx + 80, cy + 122], [cx - 80, cy + 122], [cx - 80, cy + 90]], '#8E5A2B', 10, 25);
  g.font = `900 70px ${FONT}`; g.fillStyle = '#FFD60A'; g.fillText('1', cx, cy - 40);
  const txt = names.length ? names.join(' & ') : 'Oyun bitti!';
  fitFont(g, txt, W * 0.86, 104);
  g.fillStyle = '#1C1633'; g.fillText(txt, cx, H * 0.78);
  if (names.length) { g.font = `800 44px ${FONT}`; g.fillStyle = '#FF3B30'; g.fillText('ŞAMPİYON', cx, H * 0.91); }
  let s = 5;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  COLS0.slice(1, 5).concat(['#FF9F0A']).forEach((col) => { for (let i = 0; i < 9; i++) { g.fillStyle = col; const x = r() * W, y = r() * H * 0.62; if (Math.abs(x - cx) < 200 && y > H * 0.12) continue; g.beginPath(); g.arc(x, y, 6 + r() * 7, 0, TAU); g.fill(); } });
}
function paintStamp(g, W, H, word, ok) {
  g.save();
  const x = W * 0.72, y = H * 0.86;
  g.translate(x, y); g.rotate(-0.12);
  const fs = fitFont(g, word, W * 0.4, 70);
  const tw = g.measureText(word).width;
  const bw = tw + 70, bh = fs + 40;
  g.globalAlpha = 0.86;
  g.strokeStyle = ok ? '#1f9e4f' : '#d8322a'; g.lineWidth = 9;
  g.beginPath(); g.roundRect ? g.roundRect(-bw / 2, -bh / 2, bw, bh, 18) : g.rect(-bw / 2, -bh / 2, bw, bh); g.stroke();
  g.fillStyle = ok ? '#1f9e4f' : '#d8322a';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(word, 0, 3);
  g.restore();
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
const rgb3 = (hex) => { const h = String(hex).replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
// birim kareyi (0,0)-(1,0)-(1,1)-(0,1) dörtgene götüren izdüşüm dönüşümü ve tersi (ekran → tahta)
function quadH(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, c, d, e, f, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) { a = x1 - x0; b = x3 - x0; c = x0; d = y1 - y0; e = y3 - y0; f = y0; g = 0; h = 0; }
  else {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; c = x0; d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0;
  }
  // ters matris
  const A = e - f * h, B = c * h - b, Cc = b * f - c * e, D = f * g - d, Ee = a - c * g, F = c * d - a * f, G = d * h - e * g, Hh = b * g - a * h, I = a * e - b * d;
  return (x, y) => { const w = G * x + Hh * y + I; if (Math.abs(w) < 1e-9) return null; return [(A * x + B * y + Cc) / w, (D * x + Ee * y + F) / w]; };
}

/* ============================ oyun ============================ */
class DrawGame extends TableGame {
  constructor(ctx) {
    const snd = new CtSnd();
    super(ctx, { tag: 'czt', cls: 'czt', title: 'Çiz Tahmin', sub: 'Biri çizer, diğerleri bilmeye çalışır', emoji: '🎨', css: STYLE, snd, amb: 'diner', ambVol: 0.4, botPx: 300, botPxL: 34, tea: false, place: false, cloth: '#2f4f6f', trim: '#ffd23f', chairPad: '#e8743b', fog: '#0f1218', roomStyle: { wall: '#1f2633', curtain: '#3b5b8a' } });
    this.bub = new Map();
    this.pops = [];
    this.rend = [];               // tahtaya çizilen (sunucudan gelen) çizgiler { id, color, w, pts, drawn }
    this.mine = [];               // çizerken benim çizgilerim
    this.cur = null;              // şu an çizdiğim çizgi
    this.color = COLS0[0];
    this.size = SIZES[1];
    this.idTag = Math.random().toString(36).slice(2, 5);
    this.sk = 0;
    this.feedSeen = 0;
    this.hintSeen = 0;
    this.closeSeen = 0;
    this.page = '';
    this.flipT = -9;
    this.bq = null;
    this.pen = null;
    this.el.posS.textContent = '';
    this.initPaper();
    this.dAll = true; this.dR = null; this.oldDirty = false;
    this.tagEl = document.createElement('div'); this.tagEl.className = 'ct-tag'; this.el.wrap.appendChild(this.tagEl);
    this.fdEl = document.createElement('div'); this.fdEl.className = 'ct-fd'; this.el.wrap.appendChild(this.fdEl);
    this.plEl = document.createElement('div'); this.plEl.className = 'ct-pl'; this.el.wrap.appendChild(this.plEl);
    this.mB = M.make(); this.mL = M.make(); this.mP = M.make(); this.mTmp = M.make();
    this.bindUi();
    this.bindDraw();
    this.bindKb();
    try { document.fonts?.ready?.then(() => { if (this.dead) return; if (this.page === 'title') this.paintPage('title'); else if (this.page.startsWith('final')) this.paintPage('final'); }); } catch { /* yok */ }
  }

  // kâğıt tuvali (çizgiler burada çizilir; doku olarak tahtaya yapışır). world() üst sınıfın kurucusunda çağrılır,
  // bu yüzden tuvaller ilk ihtiyaçta kurulur
  initPaper() {
    if (this.bCv) return;
    this.bCv = document.createElement('canvas'); this.bCv.width = BX * TS; this.bCv.height = BY * TS;
    this.bg = this.bCv.getContext('2d', { willReadFrequently: true }) || this.bCv.getContext('2d');
    this.paperCv = document.createElement('canvas'); this.paperCv.width = this.bCv.width; this.paperCv.height = this.bCv.height;
    paintPaper(this.paperCv);
    this.oldCv = document.createElement('canvas'); this.oldCv.width = this.bCv.width; this.oldCv.height = this.bCv.height;
    this.og = this.oldCv.getContext('2d');
    this.bg.drawImage(this.paperCv, 0, 0);
  }

  /* ---------- dünya ---------- */
  world(W) {
    this.initPaper();
    W.board = this.mk(boardModel);
    W.legs = this.mk(legsModel);
    W.paper = this.mk(paperQuad, 'tex');
    W.pageF = this.mk(pageFront, 'tex');
    W.pageB = this.mk(pageBack);
    W.mk = this.mk(markerModel);
    W.tip = this.mk(markerTip);
    W.trophy = this.mk(trophyModel);
    this.bTex = makeTexture(this.X, this.bCv);
    this.oldTex = makeTexture(this.X, this.oldCv);
    this.dAll = true;
    this.oldDirty = true;
  }
  freeTex() { const gl = this.X && this.X.gl; if (gl) { if (this.bTex) gl.deleteTexture(this.bTex); if (this.oldTex) gl.deleteTexture(this.oldTex); } this.bTex = this.oldTex = null; }
  onDispose() {
    for (const b of this.bub.values()) b.el.remove();
    this.bub.clear(); this.pops.forEach((p) => p.el.remove()); this.pops = [];
    try { window.visualViewport?.removeEventListener('resize', this.onVV); window.visualViewport?.removeEventListener('scroll', this.onVV); } catch { /* yok */ }
  }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  idOf(i) { return this.view?.seats?.[i]?.id; }

  /* ---------- kâğıt ---------- */
  dirty(x0, y0, x1, y1) {
    const r = this.dR;
    if (!r) this.dR = [x0, y0, x1, y1];
    else { r[0] = Math.min(r[0], x0); r[1] = Math.min(r[1], y0); r[2] = Math.max(r[2], x1); r[3] = Math.max(r[3], y1); }
  }
  blank() { this.bg.drawImage(this.paperCv, 0, 0); this.dAll = true; this.stampW = null; }
  // st.pts[i0..i1] (i0'dan önceki noktadan başlayarak) kâğıda çiz
  seg(st, i0, i1) {
    const P = st.pts;
    if (!P || !P.length || i1 < i0) return;
    const g = this.bg, w = st.w * TS;
    g.strokeStyle = st.color; g.fillStyle = st.color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const ext = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
    if (i1 === 0) {
      const x = P[0][0] * TS, y = P[0][1] * TS;
      g.beginPath(); g.arc(x, y, w / 2, 0, TAU); g.fill(); ext(x, y);
    } else {
      const a = Math.max(0, i0 - 1);
      g.beginPath();
      g.moveTo(P[a][0] * TS, P[a][1] * TS); ext(P[a][0] * TS, P[a][1] * TS);
      for (let i = a + 1; i <= i1; i++) { const x = P[i][0] * TS, y = P[i][1] * TS; g.lineTo(x, y); ext(x, y); }
      g.stroke();
    }
    this.dirty(x0 - w, y0 - w, x1 + w, y1 + w);
  }
  repaint() {
    this.bg.drawImage(this.paperCv, 0, 0);
    const L = this.drawerMode() ? this.mine : this.rend;
    for (const s of L) { const n = s.drawn != null ? s.drawn : s.pts.length; if (n > 0) this.seg(s, 0, n - 1); }
    if (this.stampW) paintStamp(this.bg, this.bCv.width, this.bCv.height, this.stampW.word, this.stampW.ok);
    this.dAll = true;
  }
  paintPage(kind) {
    const W = this.bCv.width, H = this.bCv.height;
    this.bg.drawImage(this.paperCv, 0, 0);
    this.stampW = null;
    if (kind === 'title') paintTitle(this.bg, W, H);
    else if (kind === 'final') { const v = this.view; paintFinal(this.bg, W, H, (v?.champ || []).map((i) => nm0(v.seats[i]?.n || ''))); }
    this.dAll = true;
  }
  // sayfayı çevir: eski sayfa üstten arkaya döner, alttan yenisi görünür
  turnPage(kind, page, anim = true) {
    if (anim && this.page) { this.og.drawImage(this.bCv, 0, 0); this.oldDirty = true; this.flipT = this.time; this.fx('flip'); }
    this.page = page;
    this.rend = []; this.mine = []; this.cur = null; this.ptr = null;
    this.paintPage(kind);
  }
  flipU() { const u = (this.time - this.flipT) / FLIP_S; return u >= 0 && u < 1 ? u : null; }
  flushTex() {
    const X = this.X;
    if (!X || !this.bTex) return;
    const gl = X.gl;
    if (this.oldDirty && this.oldTex) {
      gl.bindTexture(gl.TEXTURE_2D, this.oldTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.oldCv);
      this.oldDirty = false;
    }
    if (this.dAll) {
      gl.bindTexture(gl.TEXTURE_2D, this.bTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.bCv);
      this.dAll = false; this.dR = null;
    } else if (this.dR) {
      const W = this.bCv.width, H = this.bCv.height, r = this.dR;
      const x = clamp(Math.floor(r[0]), 0, W - 1), y = clamp(Math.floor(r[1]), 0, H - 1);
      const w = clamp(Math.ceil(r[2]) - x, 1, W - x), h = clamp(Math.ceil(r[3]) - y, 1, H - y);
      this.dR = null;
      try {
        const img = this.bg.getImageData(x, y, w, h);
        gl.bindTexture(gl.TEXTURE_2D, this.bTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } catch { gl.bindTexture(gl.TEXTURE_2D, this.bTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.bCv); }
    }
  }

  /* ---------- çizgiler ---------- */
  drawerMode() { const v = this.view; return !!v && v.isDrawer && (v.phase === 'draw' || v.phase === 'reveal'); }
  canDraw() { const v = this.view; return !!v && v.phase === 'draw' && v.isDrawer && this.flipU() == null; }
  syncStrokes(v) {
    if (v.phase !== 'draw' && v.phase !== 'reveal') return;
    const list = v.strokes || [];
    if (this.drawerMode()) {
      // çizen kendi çizgilerini yerelde tutar; sayfayı yenilediyse sunucudakileri alır
      if (this.fresh && list.length && !this.mine.length) {
        this.mine = list.map((s) => ({ id: s.id, color: s.color, w: s.w, pts: s.pts.slice() }));
        this.sk = list.length + 1;
        this.repaint();
      }
      this.fresh = false;
      return;
    }
    const R = this.rend;
    let ok = R.length <= list.length;
    for (let i = 0; ok && i < R.length; i++) { const a = R[i], b = list[i]; if (a.id !== b.id || b.pts.length < a.pts.length || a.color !== b.color || a.w !== b.w) ok = false; }
    if (!ok) {
      // geri alındı ya da temizlendi: kalanları beklemeden yeniden çiz
      this.rend = list.map((s) => ({ id: s.id, color: s.color, w: s.w, pts: s.pts, drawn: s.pts.length }));
      this.repaint();
      this.fresh = false;
      return;
    }
    for (let i = 0; i < R.length; i++) R[i].pts = list[i].pts;
    const n0 = R.length;
    const instant = this.fresh || v.phase === 'reveal';
    for (let i = R.length; i < list.length; i++) {
      const s = list[i];
      const r = { id: s.id, color: s.color, w: s.w, pts: s.pts, drawn: instant ? s.pts.length : 0 };
      R.push(r);
      if (instant) this.seg(r, 0, s.pts.length - 1);
    }
    let late = false;
    if (instant) for (const r of R) if (r.drawn < r.pts.length) { this.seg(r, r.drawn, r.pts.length - 1); r.drawn = r.pts.length; late = true; }
    if ((late || R.length > n0) && this.stampW) this.repaint();
    this.fresh = false;
  }
  // gelen çizgiler kalemle çiziliyormuş gibi akar
  animate(dt) {
    if (this.drawerMode()) return;
    let left = 0;
    for (const r of this.rend) for (let i = Math.max(1, r.drawn); i < r.pts.length; i++) left += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
    const pend = this.rend.some((r) => r.drawn < r.pts.length);
    if (!pend) return;
    let budget = dt * Math.max(1500, left / 0.9);
    for (const r of this.rend) {
      if (r.drawn >= r.pts.length) continue;
      if (r.drawn === 0) { this.seg(r, 0, 0); r.drawn = 1; if (r.pts.length > 1) this.fx('squeak', 0.6); }
      let j = r.drawn;
      while (j < r.pts.length && budget > 0) { budget -= Math.hypot(r.pts[j][0] - r.pts[j - 1][0], r.pts[j][1] - r.pts[j - 1][1]); j++; }
      if (j > r.drawn) { this.seg(r, r.drawn, j - 1); r.drawn = j; }
      this.pen = { p: r.pts[r.drawn - 1], col: r.color, t: this.time };
      if (budget <= 0) break;
    }
  }
  toBoard(cx, cy) {
    if (!this.bqInv) return null;
    const rc = this.el.wrap.getBoundingClientRect();
    const q = this.bqInv(cx - rc.left, cy - rc.top);
    if (!q) return null;
    return [clamp(q[0] * BX, -20, BX + 20), clamp(q[1] * BY, -20, BY + 20)];
  }
  bindDraw() {
    const cv = this.el.cv;
    this.onPD = (e) => {
      if (!this.canDraw() || this.ptr != null) return;
      if (e.button != null && e.button > 0) return;
      const q = this.toBoard(e.clientX, e.clientY);
      if (!q || q[0] < -12 || q[0] > BX + 12 || q[1] < -12 || q[1] > BY + 12) return;
      if (this.mine.length >= 218) { this.msg('Çizgi sınırı doldu: geri al ya da temizle', 'mid'); return; }
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch { /* yok */ }
      this.ptr = e.pointerId;
      const st = { id: this.idTag + (this.sk++), color: this.color, w: this.size, pts: [[Math.round(q[0]), Math.round(q[1])]] };
      this.mine.push(st);
      this.cur = st; this.curSent = this.time; this.curSentN = 0; this.sqT = this.time;
      this.seg(st, 0, 0);
      this.pen = { p: st.pts[0], col: st.color, t: this.time };
      this.fx('squeak', 0.8);
    };
    this.onPM = (e) => {
      if (e.pointerId !== this.ptr || !this.cur) return;
      e.preventDefault();
      if (!this.canDraw()) { this.endStroke(); return; }
      const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      for (const ev of evs && evs.length ? evs : [e]) {
        const q = this.toBoard(ev.clientX, ev.clientY);
        if (!q) continue;
        const st = this.cur, P = st.pts, L = P[P.length - 1];
        const x = Math.round(q[0]), y = Math.round(q[1]);
        if (Math.hypot(x - L[0], y - L[1]) < 2.5) continue;
        P.push([x, y]);
        this.seg(st, P.length - 1, P.length - 1);
        this.pen = { p: P[P.length - 1], col: st.color, t: this.time };
        if (P.length >= 470) { this.endStroke(); const n = { id: this.idTag + (this.sk++), color: st.color, w: st.w, pts: [[x, y]] }; this.mine.push(n); this.cur = n; this.curSent = this.time; this.curSentN = 0; }
      }
      // uzun çizgiyi yolda da gönder (başkaları çizilirken görsün)
      const st = this.cur;
      if (st && this.time - this.curSent > 0.9 && st.pts.length - this.curSentN >= 3) { this.sendStroke(st); this.curSent = this.time; this.curSentN = st.pts.length; }
      if (this.time - (this.sqT || 0) > 0.22) { this.sqT = this.time; this.fx('squeak', 0.5); }
    };
    this.onPU = (e) => { if (e.pointerId !== this.ptr) return; this.ptr = null; this.endStroke(); };
    cv.addEventListener('pointerdown', this.onPD);
    cv.addEventListener('pointermove', this.onPM);
    cv.addEventListener('pointerup', this.onPU);
    cv.addEventListener('pointercancel', this.onPU);
    cv.addEventListener('lostpointercapture', this.onPU);
  }
  sendStroke(st) {
    const p = { id: st.id, pts: st.pts.slice(), color: st.color, w: st.w };
    try { this.ctx.sendQuiet ? this.ctx.sendQuiet('stroke', p) : this.ctx.send('stroke', p); } catch { /* yok */ }
  }
  endStroke() {
    const st = this.cur;
    this.cur = null;
    if (!st) return;
    this.sendStroke(st);
  }
  // klavye açılınca alt çubuk görünür kalsın (iOS: görünür alan küçülür, sayfa küçülmez)
  bindKb() {
    const vv = window.visualViewport;
    if (!vv) return;
    this.onVV = () => {
      if (this.dead) return;
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      this.kbH = kb > 60 ? kb : 0;
      this.el.bar.style.transform = this.kbH ? `translateY(-${this.kbH}px)` : '';
    };
    vv.addEventListener('resize', this.onVV);
    vv.addEventListener('scroll', this.onVV);
  }

  /* ---------- balonlar ve puanlar ---------- */
  inBoard(x, y, pad = 0) { const r = this.bRect; return !!r && x > r.l - pad && x < r.r + pad && y > r.t - pad && y < r.b + pad; }
  say(i, text, cls = '', ms = 2400) {
    const id = this.idOf(i);
    if (!id || this.flat) return;
    let b = this.bub.get(id);
    if (!b) { const el = document.createElement('div'); el.className = 'ct-bub'; this.el.lbls.appendChild(el); b = { el }; this.bub.set(id, b); }
    b.el.textContent = text;
    b.el.className = 'ct-bub' + (cls ? ' ' + cls : '');
    b.until = this.time + ms / 1000;
    b.t0 = this.time;
  }
  pop(i, text) {
    const id = this.idOf(i);
    if (!id || this.flat) return;
    const el = document.createElement('div');
    el.className = 'ct-pop';
    el.textContent = text;
    this.el.lbls.appendChild(el);
    this.pops.push({ id, el, t0: this.time });
  }
  placeLbls() {
    // tahtayı izdüşür: köşeler (ekran → tahta dönüşümü ve DOM parçaları için)
    if (!this.flat && this.X && this.mB) {
      const Q = [[-HW, HH], [HW, HH], [HW, -HH], [-HW, -HH]].map(([x, y]) => { const w = xfP(this.mB, [x, y, PZ]); return this.project(w[0], w[1], w[2]); });
      if (Q.every(Boolean)) this.setBQ(Q.map((q) => [q[0], q[1]]));
    }
    const v = this.view;
    const hide = v && ['pick', 'draw', 'reveal'].includes(v.phase);
    // tahtanın arkasında kalan oyuncuların etiketleri silikleşir
    for (const p of this.seats) {
      const a = this.av.get(p.id), o = this.lbl.get(p.id);
      if (!a || !o) continue;
      let op = 1;
      if (hide && p === this.seats[this.me] && this.hideMe()) op = 0;
      else if (hide && this.bRect) { const q = this.project(a.headW[0], a.headW[1] + 0.12, a.headW[2]); if (q && this.inBoard(q[0], q[1], 6)) op = 0.08; }
      o.op = op;
    }
    super.placeLbls();
    for (const [id, b] of this.bub) {
      const a = this.av.get(id);
      const left = b.until - this.time;
      if (!a || !a.headW || left <= 0) { b.el.style.opacity = '0'; if (left < -1) { b.el.remove(); this.bub.delete(id); } continue; }
      const q = this.project(a.headW[0], a.headW[1] + 0.62, a.headW[2]);
      if (!q || (hide && this.inBoard(q[0], q[1], 20))) { b.el.style.opacity = '0'; continue; }
      const k = clamp((this.time - b.t0) / 0.18, 0, 1);
      b.el.style.opacity = String(Math.min(1, left / 0.3));
      // ekran kenarındaki karakterin balonu taşmasın: balon içeri kayar, kuyruğu karaktere bakmaya devam eder
      if (b.wT !== b.el.textContent) { b.wT = b.el.textContent; b.w = b.el.offsetWidth || 100; b.h = b.el.offsetHeight || 34; }
      const W = this.vw || this.el.wrap.clientWidth || 390, H = this.vh || this.el.wrap.clientHeight || 844, half = b.w / 2;
      const x = clamp(q[0], half + 6, Math.max(half + 6, W - half - 6)), y = clamp(q[1], b.h + 8, Math.max(b.h + 8, H - 8));
      b.el.style.setProperty('--tx', `${Math.round(clamp(q[0] - x, -half + 14, half - 14))}px`);
      b.el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%) scale(${(0.7 + 0.3 * easeOut(k)).toFixed(3)})`;
    }
    this.pops = this.pops.filter((p) => {
      const u = (this.time - p.t0) / 1.3, a = this.av.get(p.id);
      if (u >= 1 || !a || !a.headW) { p.el.remove(); return false; }
      const q = this.project(a.headW[0], a.headW[1] + 0.3 + u * 0.5, a.headW[2]);
      if (!q || (hide && this.inBoard(q[0], q[1], 10))) { p.el.style.opacity = '0'; return true; }
      p.el.style.opacity = String(u < 0.75 ? 1 : (1 - u) / 0.25);
      p.el.style.transform = `translate(${Math.round(q[0])}px,${Math.round(q[1])}px) translate(-50%,-50%) scale(${(1 + 0.25 * Math.sin(Math.min(1, u * 4) * Math.PI)).toFixed(3)})`;
      return true;
    });
    this.placeBoardUi();
  }
  // köşeler: sol üst, sağ üst, sağ alt, sol alt (ekran pikseli)
  setBQ(Q) {
    this.bq = Q;
    // tahta (0..1, 0..1): (0,0) sol üst, (1,0) sağ üst, (1,1) sağ alt, (0,1) sol alt
    this.bqInv = quadH(Q);
    const xs = Q.map((q) => q[0]), ys = Q.map((q) => q[1]);
    this.bRect = { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
  }
  placeBoardUi() {
    const r = this.bRect, v = this.view;
    if (!r || !v) { this.tagEl.style.opacity = '0'; return; }
    const bw = r.r - r.l;
    const fs = clamp(bw * 0.058, 15, 34);
    if (this.tagFs !== Math.round(fs)) { this.tagFs = Math.round(fs); this.tagEl.style.fontSize = this.tagFs + 'px'; }
    const top = Math.min(this.bq[0][1], this.bq[1][1]);
    this.tagEl.style.transform = `translate(${Math.round((r.l + r.r) / 2)}px,${Math.round(top)}px) translate(-50%,-64%)`;
    this.tagEl.style.opacity = this.tagEl.innerHTML ? '1' : '0';
    const bot = Math.max(this.bq[2][1], this.bq[3][1]);
    const vw = this.vw || 1, land = vw > (this.vh || 1) * 1.1;
    const on = ['pick', 'draw', 'reveal'].includes(v.phase);
    this.fdEl.style.display = this.plEl.style.display = on ? '' : 'none';
    if (!on) return;
    const barTop = this.barTop || (this.vh || 800) - 200;
    const plH = this.plEl.offsetHeight || 0;
    if (land) {
      const x0 = r.r + 14, w = Math.max(160, vw - x0 - 14);
      this.fdEl.style.width = this.plEl.style.width = `${Math.round(w)}px`;
      this.plEl.style.transform = `translate(${Math.round(x0)}px,${Math.round(r.t + 30)}px)`;
      this.fdEl.style.transform = `translate(${Math.round(x0)}px,${Math.round(r.t + 38 + plH)}px)`;
      this.fdMax = 3;
    } else {
      this.fdEl.style.width = this.plEl.style.width = '';
      const mid = Math.round(vw / 2);
      this.plEl.style.transform = `translate(${mid}px,${Math.round(barTop - 10)}px) translate(-50%,-100%)`;
      this.fdEl.style.transform = `translate(${mid}px,${Math.round(bot + 16)}px) translate(-50%,0)`;
      const room = barTop - 10 - plH - (bot + 16) - 8;
      this.fdMax = clamp(Math.floor(room / 32), 1, 5);
    }
    while (this.fdEl.children.length > (this.fdMax || 4)) this.fdEl.firstChild.remove();
  }
  emoAnchor(pid) {
    const q = super.emoAnchor(pid);
    const v = this.view;
    if (!q || !v || !['pick', 'draw', 'reveal'].includes(v.phase) || !this.inBoard(q[0], q[1], 12)) return q;
    const r = this.bRect;
    return [clamp(q[0], r.l + 30, r.r - 30), r.t - 34];
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'ct-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'ct-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'ct-pick') { vibrate(20); this.fx('uncap'); this.ctx.send('pick', { i: +b.dataset.i }); }
      else if (act === 'ct-rand') { this.fx('pop'); this.ctx.send('pick', { i: Math.floor(Math.random() * 3) }); }
      else if (act === 'ct-skip') { this.fx('pop'); this.ctx.send('skip', {}); }
      else if (act === 'ct-col') { this.color = b.dataset.c; this.fx('pop'); this.toolSync(); }
      else if (act === 'ct-sz') { this.size = +b.dataset.w; this.fx('pop'); this.toolSync(); }
      else if (act === 'ct-undo') {
        if (!this.canDraw() || !this.mine.length) return;
        if (this.cur) this.endStroke();
        this.mine.pop();
        this.repaint();
        vibrate(10);
        this.ctx.send('undo', {});
      } else if (act === 'ct-clear') {
        if (!this.canDraw() || !this.mine.length) return;
        if (!this.clearArm || this.time - this.clearArm > 2.2) { this.clearArm = this.time; b.classList.add('warn'); b.textContent = 'Emin misin?'; return; }
        this.clearArm = 0;
        this.cur = null;
        this.mine = [];
        this.repaint();
        vibrate([15, 30, 15]);
        this.fx('flip');
        this.ctx.send('clear', {});
      }
    };
    const onSubmit = (e) => {
      const f = e.target.closest('form[data-form=ct-guess]');
      if (!f) return;
      e.preventDefault();
      const inp = f.querySelector('input');
      const text = (inp?.value || '').trim();
      if (!text) return;
      this.myGuess = { text, t: this.time };
      this.ctx.send('guess', { text });
      inp.value = '';
      try { inp.focus(); } catch { /* yok */ }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.bar.addEventListener('submit', onSubmit);
    this.el.panel.addEventListener('click', onClick);
  }
  toolSync() {
    this.el.bar.querySelectorAll('[data-act=ct-col]').forEach((b) => b.classList.toggle('on', b.dataset.c === this.color));
    this.el.bar.querySelectorAll('[data-act=ct-sz]').forEach((b) => b.classList.toggle('on', +b.dataset.w === this.size));
    const cl = this.el.bar.querySelector('[data-act=ct-clear]');
    if (cl && this.clearArm && this.time - this.clearArm > 2.2) { this.clearArm = 0; cl.classList.remove('warn'); cl.textContent = '🗑 Temizle'; }
    const n = this.mine.length;
    const u = this.el.bar.querySelector('[data-act=ct-undo]'); if (u) u.disabled = !n;
    if (cl) cl.disabled = !n;
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.czt !== '1') { root.dataset.czt = '1'; root.innerHTML = '<p class="py-16 text-center">🎨</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.seq || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    this.syncStrokes(v);
    this.onEvents(prev, v);
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    const first = !prev;
    if (v.phase === 'intro') {
      mus('idle');
      if (this.page !== 'title') this.turnPage('title', 'title', !first);
    }
    if (v.phase === 'pick' || v.phase === 'draw' || v.phase === 'reveal') {
      const pg = `turn:${v.game}:${v.seq}`;
      if (this.page !== pg) { this.turnPage('blank', pg, !first); this.fresh = true; this.feedSeen = this.sNow(); this.hintSeen = v.hints || 0; this.closeSeen = v.myClose ? v.myClose.at : 0; this.maskPrev = ''; }
    }
    if (v.phase === 'pick') {
      mus('idle');
      if (fresh && v.isDrawer) { this.msg('✏️ SIRA SENDE!', 'mid'); this.fx('myturn'); vibrate([30, 40, 30]); }
    }
    if (v.phase === 'draw') {
      mus('race');
      if (fresh) { this.fx(v.isDrawer ? 'uncap' : 'pop'); if (!v.isDrawer && v.me >= 0) this.msg('🤔 NE ÇİZİYOR?', 'mid'); }
      if (v.isDrawer && fresh) this.msg('✏️ ÇİZ!', 'mid');
    }
    if (v.phase === 'reveal') {
      mus('idle');
      // kalan çizgileri bitir, kelimeyi damga gibi bas
      for (const r of this.rend) if (r.drawn < r.pts.length) { this.seg(r, Math.max(0, r.drawn), r.pts.length - 1); r.drawn = r.pts.length; }
      if (v.word) {
        this.stampW = { word: v.word, ok: (v.results || []).length > 0 };
        paintStamp(this.bg, this.bCv.width, this.bCv.height, v.word, this.stampW.ok);
        this.dAll = true;
      }
      this.revT = this.time - (fresh ? 0 : 9);
      if (fresh) {
        const nOk = (v.results || []).length, all = v.guessers > 0 && nOk >= v.guessers;
        this.fx(all ? 'all' : nOk ? 'reveal' : 'timeup');
        setTimeout(() => { if (!this.dead) this.fx('stamp'); }, 520);
        this.msg(all ? '🎉 HERKES BİLDİ!' : (v.results || []).length ? `⏰ ${v.word}` : `😅 ${v.word}`, 'mid');
        if (all) this.flash('rgba(60,207,110,.4)', true);
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!this.page.startsWith('final')) this.turnPage('final', `final:${v.game}`, !first && !late);
      if (!late) {
        this.fx('champ');
        const c = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n || '')));
        this.msg(c.length ? `🏆 ${c.join(' & ')}` : 'OYUN BİTTİ', 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, [[1, 0.85, 0.3], [0.3, 0.85, 0.45], [0.3, 0.55, 1], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.2); });
      }
    }
  }
  // tahminler, bilenler, ipuçları
  onEvents(prev, v) {
    if (v.phase !== 'draw' && v.phase !== 'reveal') return;
    const nm = (i) => nm0(v.seats[i]?.n || '');
    (v.feed || []).forEach((f) => {
      if (f.at <= this.feedSeen) return;
      this.feedSeen = f.at;
      const mine = f.i === v.me;
      if (f.ok) {
        this.chip(`<span>✓ <b>${mine ? 'Bildin' : esc(nm(f.i)) + ' bildi'}!</b> +${f.pts}</span>`, 'ok', f.i);
        if (v.phase !== 'draw') { this.say(f.i, '✓ Bildim!', 'ok', 2000); this.pop(f.i, `+${f.pts}`); }
        if (!mine) this.fx('ok');
        const a = this.avatarAt(f.i);
        if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.3, a.headW[2], 18, [[0.3, 0.85, 0.45], [1, 0.85, 0.3], [1, 1, 1]], 1.5, 0.03, false, 1.3, 2.6);
        this.okT = this.time;
      } else {
        const tx = String(f.text || '').replace(/[?!.]+$/, '');
        this.chip(`<span><b>${mine ? 'Sen' : esc(nm(f.i))}:</b> ${esc(tx)}${mine ? ' ✗' : '?'}</span>`, mine ? 'mine' : '', f.i);
        if (mine) this.fx('nope'); else this.fx('feed');
      }
    });
    if (v.phase !== 'draw') return;
    // ben bildim
    if (v.solvedMe && this.mySolvedSeq !== v.seq) {
      if (prev && !(prev.solvedMe && prev.seq === v.seq)) { this.fx('mine'); vibrate([25, 30, 25]); this.flash('rgba(60,207,110,.45)', true); }
      this.mySolvedSeq = v.seq;
    }
    // yeni harf açıldı
    if ((v.hints || 0) > this.hintSeen) { if (!v.isDrawer && !v.solvedMe) this.fx('hint'); this.hintSeen = v.hints; }
    // çok yakın (yalnızca bana)
    if (v.myClose && v.myClose.at > this.closeSeen) { this.closeSeen = v.myClose.at; this.closeT = this.time; this.closeTxt = v.myClose.text; this.fx('close'); vibrate(30); }
  }
  chip(html, cls = '', i = -1) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    const p = this.view?.seats?.[i];
    d.innerHTML = (p ? `<i style="--pc:${pcol(p.c)}"></i>` : '') + html;
    this.fdEl.appendChild(d);
    while (this.fdEl.children.length > (this.fdMax || 4)) this.fdEl.firstChild.remove();
    setTimeout(() => d.remove(), 6100);
  }

  /* ---------- karakterler ---------- */
  boardW(bx, by) { return xfP(this.mB, [(bx / BX - 0.5) * 2 * HW, (0.5 - by / BY) * 2 * HH, PZ + 0.01]); }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const center = xfP(this.mB, [0, 0, 0]);
    const dI = v.drawer != null && v.drawer >= 0 ? v.drawer : -1;
    const champA = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
    const solved = new Set(v.solved || []);
    const okAt = new Map();
    (v.feed || []).forEach((f) => { if (f.ok) okAt.set(f.i, f.at); });
    const wrongAt = new Map();
    (v.feed || []).forEach((f) => { if (!f.ok) wrongAt.set(f.i, f.at); });
    const now = this.sNow();
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.ctI || (a.ctI = { lt: 0, look: null });
      const idleLook = (pc = 0.2) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.2 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > pc ? P[Math.floor(Math.random() * P.length)] : center;
        }
        return idle.look;
      };
      const isD = i === dI;
      if (v.phase === 'pick') {
        if (isD) { a.pose(Math.floor(t / 2.2) % 2 ? 'chin' : 'bite', { t }); a.expr = 'o'; a.look = center; return; }
        a.pose(hs(i, v.seq || 0) < 0.5 ? 'lean' : 'rest', { t }); a.expr = 'smile';
        a.look = this.avatarAt(dI)?.headW || center;
        return;
      }
      if (v.phase === 'draw') {
        if (isD) {
          const pen = this.pen && t - this.pen.t < 0.5 ? this.pen : null;
          if (pen) {
            a.pose('rest', { t });
            const w = this.boardW(pen.p[0], pen.p[1]);
            a.pointAt(w, 1);
            a.shape[1] = 'grip';
            a.expr = 'tense';
            a.look = w;
          } else {
            a.pose('chin', { t }); a.shape[1] = 'grip'; a.expr = 'o'; a.look = center;
          }
          return;
        }
        const okT = okAt.has(i) ? (now - okAt.get(i)) / 1000 : 99;
        if (solved.has(i)) {
          if (okT < 1.6) { a.pose('cheer', { t }); a.expr = 'laugh'; a.look = center; return; }
          a.pose(Math.floor(t / 3 + i) % 3 === 0 ? 'clap' : 'lean', { t }); a.expr = 'grin'; a.look = idleLook(0.5);
          return;
        }
        const wT = wrongAt.has(i) ? (now - wrongAt.get(i)) / 1000 : 99;
        if (wT < 1.3) { a.pose('wave', { t }); a.expr = 'o'; a.look = center; return; }
        const el = clamp((now - (v.at || now)) / (v.drawMs || 75e3), 0, 1);
        const ph = Math.floor(t / 2.1 + hs(i, 5) * 9) % 4;
        a.pose(el > 0.7 && ph === 0 ? 'headgrab' : ph === 1 ? 'chin' : ph === 2 ? 'lean' : 'clasp', { t });
        a.expr = el > 0.7 ? 'tense' : ph === 1 ? 'o' : 'smile';
        a.look = center;
        return;
      }
      if (v.phase === 'reveal') {
        const u = t - (this.revT || 0);
        const res = v.results || [];
        if (isD) { const good = res.length && res.length >= (v.guessers || 1) / 2; a.pose(good ? (u < 2.5 ? 'cheer' : 'wave') : 'shrug', { t }); a.expr = good ? 'laugh' : 'smile'; a.look = idleLook(); return; }
        if (solved.has(i)) { a.pose(u < 2.5 ? 'clap' : 'rest', { t }); a.expr = 'grin'; a.look = this.avatarAt(dI)?.headW || center; return; }
        a.pose(u < 2 ? 'facepalm' : 'shrug', { t }); a.expr = u < 2 ? 'wince' : 'smile'; a.look = center;
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

  /* ---------- kamera ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const vw = this.vw || 1, vh = this.vh || 1, land = vw > vh * 1.1, asp = vw / vh;
    const t = this.time;
    // tahtanın matrisi (kameraya yüzünü döner)
    M.set(this.mB, 0, TABLE_Y + CY, 0, c.yaw, -TILT, 0);
    M.set(this.mL, 0, TABLE_Y, 0, c.yaw);
    let zoom = 1, pa = -0.32, yawC = 0, H = null, sx = 0.5, sy = 0.4;
    const onBoard = ['pick', 'draw', 'reveal'].includes(v.phase);
    if (onBoard && !this.flat) {
      pa = land ? -0.5 : -0.56;
      const p = (land ? 0.78 : 0.98) + c.pitchAdd;
      const topPx = land ? 70 : 132;
      const botPx = land ? 18 : (this.barH || 220) + 34 + (this.kbH || 0);
      const availH = Math.max(120, vh - topPx - botPx);
      const fw = land ? 0.5 : 0.94;
      const tanV = Math.tan(c.fov / 2), tanH = tanV * asp;
      const TW = 2 * (HW + 0.09), TH = 2 * HH * Math.cos(p - TILT) + 0.22;
      const kr = v.phase === 'reveal' ? 1.16 : 1;
      const Dw = TW / (fw * 2 * tanH), Dh = TH / ((availH / vh) * 2 * tanV);
      const Dwant = Math.max(Dw, Dh) * kr;
      zoom = Dwant / Math.max(0.5, this.fitVal || Dwant);
      const bwF = TW / (Dwant * 2 * tanH), bhPx = (TH / (Dwant * 2 * tanV)) * vh;
      sx = land ? Math.min(0.5, 0.025 + bwF / 2 + 0.02) : 0.5;
      sy = clamp((topPx + bhPx / 2) / vh, 0.2, 0.6);
      H = xfP(this.mB, [0, -0.04, 0]);
      if (Math.abs(300 - this.cfg.botPx) > 12) { this.cfg.botPx = 300; this.fitKey = ''; }
    } else if (v.phase === 'final') { zoom = 0.95; yawC = Math.sin(t * 0.15) * 0.12; if (Math.abs(200 - this.cfg.botPx) > 12) { this.cfg.botPx = 200; this.fitKey = ''; } }
    else { zoom = land ? 0.92 : 0.84; yawC = Math.sin(t * 0.13) * 0.08; if (Math.abs(300 - this.cfg.botPx) > 12) { this.cfg.botPx = 300; this.fitKey = ''; } }
    // tahta varken parlama ve kenar bulanıklığı az (çizgiler net görünsün)
    this.cfg.post = onBoard ? POST_BOARD : null;
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, onBoard ? 3 : 2.2, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.6, dt);
    if (H) {
      const [fx, fy, fz] = this.aimAt(H, sx, sy, c.yaw, c.pitchAdd);
      c.fx = damp(c.fx, fx, 3, dt); c.fz = damp(c.fz, fz, 3, dt); c.fy = damp(c.fy, fy, 3, dt);
    } else { c.fx = damp(c.fx, 0, 2.2, dt); c.fz = damp(c.fz, 0, 2.2, dt); c.fy = damp(c.fy, 0.15, 2.2, dt); }
    this.animate(dt);
    // son 10 saniye: tıkırtı
    const left = (v.endsAt || 0) - this.sNow();
    if (v.phase === 'draw' && left > 0 && left < 10500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', sec <= 5 ? 0.8 : 0.5); } }
    if (v.phase === 'pick' && v.isDrawer && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
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
  // tahta varken kendi karakterim (kameranın hemen önünde, tahtayı kapatır) ve sandalyem çizilmez
  hideMe() { const v = this.view; return !!v && !this.flat && this.me >= 0 && ['pick', 'draw', 'reveal'].includes(v.phase); }
  scene(D, shadow) {
    if (!this.hideMe()) return super.scene(D, shadow);
    const all = this.seats;
    this.seatsAll = all;
    this.seats = all.filter((_, i) => i !== this.me);
    try { super.scene(D, shadow); } finally { this.seats = all; this.seatsAll = null; }
  }
  drawAvatars(F, shadow) {
    if (!this.hideMe()) return super.drawAvatars(F, shadow);
    const all = this.seats;
    this.seats = all.filter((_, i) => i !== this.me);
    try { super.drawAvatars(F, shadow); } finally { this.seats = all; }
  }
  // çevrilen sayfa: tahtanın üst kenarındaki menteşe etrafında döner
  pageMat(m, th) {
    M.set(this.mTmp, 0, HH, PZ + 0.004 + Math.sin(Math.min(th, Math.PI)) * 0.02, 0, -th, 0);
    M.mul(m, this.mB, this.mTmp);
    return m;
  }
  sceneGame(D, shadow) {
    const s1 = this.seats;
    if (this.seatsAll) this.seats = this.seatsAll;
    try { this.sceneGame0(D, shadow); } finally { this.seats = s1; }
  }
  sceneGame0(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.board || !v) return;
    const T = this.T, m = this.mats.b;
    D(Wd.board, this.mB, T.obj);
    D(Wd.legs, this.mL, T.obj);
    const u = this.flipU();
    if (u != null) { const th = easeIO(u) * (Math.PI + 0.3); if (th >= Math.PI / 2) D(Wd.pageB, this.pageMat(m, th), T.obj); }
    // çizenin elindeki kalem
    if (v.phase === 'draw' && v.drawer >= 0 && !(v.drawer === this.me && this.hideMe())) {
      const a = this.avatarAt(v.drawer);
      if (a && a.M && a.M.hd) {
        D(Wd.mk, a.M.hd[1], T.obj);
        const col = (this.pen && this.pen.col) || (v.isDrawer ? this.color : '#1C1633');
        if (col !== this.tipHex) { this.tipHex = col; this.tipC = new Float32Array(rgb3(col === '#FFFFFF' ? '#e6e6e6' : col)); }
        D(Wd.tip, a.M.hd[1], this.tipC);
      }
    }
    // final: şampiyonun önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
        const q = [a.pos[0] + 0.62 * s, TABLE_Y + 0.004, a.pos[2] + 0.62 * c];
        const k = clamp((this.time - (this.finT || 0) - 0.8) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - k) * 0.4, q[2], this.time * 0.8, 0, 0, 1.35 * k + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  drawShadowsExtra(m) {
    if (!this.res || !this.res.shadow) return;
    const c = Math.cos(this.cam.yaw), s = Math.sin(this.cam.yaw);
    M.set(m, -0.25 * s, TABLE_Y + 0.008, -0.25 * c, this.cam.yaw, 0, 0, 0.95, 1, 0.6);
    drawMesh(this.X, this.res.shadow, m, ONE3, 0.42);
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.paper || !this.bTex) return;
    this.flushTex();
    gl.uniform1f(X.tex.u.uSelf, 0.8);
    gl.bindTexture(gl.TEXTURE_2D, this.bTex);
    drawMesh(X, Wd.paper, this.mB, ONE3);
    const u = this.flipU();
    if (u != null && this.oldTex) {
      const th = easeIO(u) * (Math.PI + 0.3);
      if (th < Math.PI / 2) { gl.bindTexture(gl.TEXTURE_2D, this.oldTex); drawMesh(X, Wd.pageF, this.pageMat(this.mats.c, th), ONE3); }
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
    const t = this.time;
    const back = xfP(this.mB, [0, 0, -0.3]);
    // biri bildi: tahtanın arkasından yeşil parıltı; açılışta altın
    if (this.okT != null && t - this.okT < 1.1) this.glow(m, back, 1.6, GREEN3, 0.32 * (1 - (t - this.okT) / 1.1));
    if (v.phase === 'reveal') { const u = t - (this.revT || 0); if (u < 3) this.glow(m, back, 1.8, GOLD3, 0.22 * (1 - u / 3) + 0.04); }
  }

  /* ---------- arayüz ---------- */
  hotAt() { const v = this.view; return v && v.phase === 'draw' ? 10500 : 4500; }
  timer(left, total) {
    const k = clamp(left / Math.max(1, total), 0, 1);
    return `<div class="ct-tm"><div class="bar"><i class="${left < this.hotAt() ? 'hot' : ''}" style="transform:scaleX(${k.toFixed(3)})"></i></div><b>${secs(left)} sn</b></div>`;
  }
  maskHTML(v) {
    const prev = this.maskPrev || '';
    const cur = String(v.mask || '');
    const P = [...prev], Cs = [...cur];
    const h = Cs.map((ch, k) => {
      if (ch === ' ') return '<i class="sp"> </i>';
      if (ch === '_') return '<i>&nbsp;</i>';
      if (!/\p{L}/u.test(ch)) return `<i class="sp">${esc(ch)}</i>`;
      return `<i class="h${P.length === Cs.length && P[k] === '_' ? ' new' : ''}">${esc(ch)}</i>`;
    }).join('');
    this.maskPrev = cur;
    return h;
  }
  // tahtanın üstündeki etiket: yapı değişince yeniden kurulur; süre ui() içinde güncellenir
  tagKey(v) {
    if (v.phase === 'pick') return v.isDrawer ? 'pick|d' : 'pick|o';
    if (v.phase === 'draw') return v.isDrawer ? `draw|d|${v.word}` : v.solvedMe ? `draw|s|${v.word}` : `draw|g|${v.mask}|${v.len}`;
    if (v.phase === 'reveal') return `rev|${v.word}|${(v.results || []).length}|${v.guessers}`;
    return '';
  }
  tagHTML(v) {
    const tm = '<span class="tm"></span>';
    if (v.phase === 'pick') {
      if (v.isDrawer) return { cls: 'word', h: `✏️ Ne çizeceksin? ${tm}` };
      return { cls: 'dark', h: `🤔 Kelime seçiliyor… ${tm}` };
    }
    if (v.phase === 'draw') {
      if (v.isDrawer) return { cls: 'word', h: `✏️ ${esc(v.word || '')} ${tm}` };
      if (v.solvedMe) return { cls: 'ok', h: `✓ ${esc(v.word || '')} ${tm}` };
      return { cls: '', h: `<span class="mk">${this.maskHTML(v)}</span><em>${v.len} harf</em> ${tm}` };
    }
    if (v.phase === 'reveal') {
      const n = (v.results || []).length;
      return { cls: n ? 'ok' : 'word', h: `${esc(v.word || '')} <em>${n ? `✓ ${n}/${v.guessers} bildi` : 'kimse bilemedi'}</em>` };
    }
    return { cls: '', h: '' };
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const host = this.ctx.isHost;
    const D = v.drawer;
    if (v.phase === 'pick') {
      if (v.isDrawer && v.options) {
        key = `pick|d|${v.game}|${v.seq}`;
        html = `<div class="ct-box"><div class="ct-hd">✏️ Sıra sende! Ne çizeceksin?</div><div class="ct-picks">${v.options.map((w, i) => `<button class="ct-pk" data-act="ct-pick" data-i="${i}">${esc(w)}</button>`).join('')}</div><div class="ct-s">Seçmezsen biri rastgele seçilir. Yazı yazmak yok, sadece çizim! 😉</div>${this.timer(left, v.pickMs || 12e3)}</div>`;
      } else {
        const off = !v.seats[D]?.on;
        key = `pick|o|${v.game}|${v.seq}|${host}|${off}`;
        html = `<div class="ct-box dark"><div class="ct-hd">🤔 ${v.bot ? '🤖 ' : ''}${nm(D)} kelime seçiyor…</div><div class="ct-s">Birazdan tahtaya çizecek: ne çizdiğini ilk sen bil!</div>${host ? `<div class="ct-row">${off ? '<button class="ct-b ghost" data-act="ct-rand">Onun yerine seç</button>' : ''}<button class="ct-b ghost" data-act="ct-skip">Turu geç ⏭</button></div>` : ''}${this.timer(left, v.pickMs || 12e3)}</div>`;
      }
    } else if (v.phase === 'draw') {
      const tm = this.timer(left, v.drawMs || 75e3);
      if (v.isDrawer) {
        key = `draw|d|${v.game}|${v.seq}`;
        const cols = (v.colors || COLS0).map((c) => `<button class="ct-c ${c === '#FFFFFF' ? 'er' : ''} ${c === this.color ? 'on' : ''}" data-act="ct-col" data-c="${c}" style="--c:${c}" aria-label="${COL_N[c] || 'Renk'}"></button>`).join('');
        const sz = SIZES.map((w) => `<button class="ct-w ${w === this.size ? 'on' : ''}" data-act="ct-sz" data-w="${w}" aria-label="Kalınlık ${w}"><i style="width:${Math.round(4 + w * 0.7)}px;height:${Math.round(4 + w * 0.7)}px"></i></button>`).join('');
        html = `<div class="ct-box"><div class="ct-hd">✏️ Çiz: <b>${esc(v.word || '')}</b><em class="ct-cnt">✓ ${(v.solved || []).length}/${v.guessers}</em></div>
          <div class="ct-cols">${cols}</div><div class="ct-row">${sz}<button class="ct-b" data-act="ct-undo">↶ Geri al</button><button class="ct-b" data-act="ct-clear">🗑 Temizle</button></div>${tm}</div>`;
      } else if (v.me < 0) {
        key = `draw|w|${v.game}|${v.seq}`;
        html = `<div class="ct-box dark"><div class="ct-hd">👀 ${nm(D)} çiziyor</div>${tm}</div>`;
      } else if (v.solvedMe) {
        key = `draw|s|${v.game}|${v.seq}|${v.myPts}`;
        html = `<div class="ct-box okb"><div class="ct-hd">✓ Bildin! <b>${esc(v.word || '')}</b><em>+${v.myPts} puan</em></div><div class="ct-s ct-wait"></div>${tm}</div>`;
      } else {
        key = `draw|g|${v.game}|${v.seq}|${host}`;
        html = `<div class="ct-box"><form class="ct-form" data-form="ct-guess" autocomplete="off"><input name="g" maxlength="30" placeholder="Ne çiziyor? Tahminini yaz…" enterkeyhint="send" autocapitalize="off" autocomplete="off" spellcheck="false"><button type="submit">Gönder</button></form>
          <div class="ct-note"></div>${tm}${host ? '<div class="ct-row" style="margin-top:4px"><button class="ct-b ghost" data-act="ct-skip">Turu geç ⏭</button></div>' : ''}</div>`;
      }
    } else if (v.phase === 'reveal') {
      const res = (v.results || []).slice().sort((x, y) => y.pts - x.pts);
      const rows = res.map((r) => { const p = v.seats[r.i]; return p ? `<div style="--pc:${pcol(p.c)}"><i></i><span>✓ ${esc(nm0(p.n))}${r.i === v.me ? ' (sen)' : ''}</span><b>+${r.pts}</b></div>` : ''; }).join('');
      const dp = v.seats[D];
      const drow = dp ? `<div class="dr" style="--pc:${pcol(dp.c)}"><i></i><span>✏️ ${esc(nm0(dp.n))}${D === v.me ? ' (sen)' : ''} çizdi</span><b>+${v.gain || 0}</b></div>` : '';
      key = `rev|${v.game}|${v.seq}|${res.length}`;
      const last = v.turnNo >= v.turns;
      html = `<div class="ct-box"><div class="ct-hd">Kelime: <b>${esc(v.word || '')}</b><em>${res.length ? `${res.length}/${v.guessers} kişi bildi` : 'Kimse bilemedi 😅'}</em></div><div class="ct-res">${drow}${rows}</div><div class="ct-s">${last ? 'Son turdu, sonuçlar geliyor…' : 'Sıradaki çizer birazdan…'}</div>${this.timer(left, v.revealMs || 6500)}</div>`;
    }
    if (this.setBar(key, html)) {
      this.myGuess = null;
      if (key.startsWith('draw|g') && window.matchMedia?.('(pointer: fine)').matches) { const inp = this.el.bar.querySelector('input'); try { inp?.focus({ preventScroll: true }); } catch { /* yok */ } }
      if (key.startsWith('draw|d')) this.toolSync();
    }
  }
  modeSeg(v) {
    const n = (v.seats || []).filter((p) => p.on).length || (v.seats || []).length;
    const k1 = Math.min(6, Math.max(3, n)), k2 = Math.min(12, Math.max(6, n * 2));
    return `<div class="ct-seg" role="group" aria-label="Tur sayısı"><button data-act="ct-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · ${k1} tur</button><button data-act="ct-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🎉 Uzun · ${k2} tur</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card ct-intro">
        <div class="tt">🎨 Çiz Tahmin</div>
        <div class="sub">Sıran gelince üç kelimeden birini seç ve parmağınla tahtaya çiz. Masadakiler ne çizdiğini yazarak bilmeye çalışır.</div>
        <div class="ct-ru"><div style="background:#fff4c2"><b>✏️</b>Sıran gelince çiz</div><div style="background:#dbe8ff"><b>⌨️</b>Tahminini yaz</div><div style="background:#d6f5e0"><b>⚡</b>Çabuk bilen çok kazanır</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="ct-start" ${n < 3 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 3 ? 'En az 3 kişi lazım: masadakileri çağır!' : 'Süre ilerledikçe birkaç harf açılır. Senin çizimini bilen her kişi sana da puan kazandırır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= 2400) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const rows = v.seats.map((p, i) => ({ p, i, st: (v.stats || [])[i] || {} })).sort((x, y) => y.p.sc - x.p.sc)
        .map(({ p, i, st }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><em>🎯${st.solved || 0} 🎨${st.drawn || 0}</em><b>${p.sc} puan</b></div>`).join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏆 Kazandın!' : champ.length ? `🏆 ${champ.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">🎯 bildiği kelime · 🎨 çizimini bilen kişi</div>
        <div class="ct-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="ct-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const nm = (i) => esc(nm0(v.seats?.[i]?.n || ''));
    const TOP = { pick: `${v.turnNo}/${v.turns}. tur · ✏️ ${nm(v.drawer)}`, draw: `${v.turnNo}/${v.turns}. tur · ✏️ ${nm(v.drawer)} · ✓ ${(v.solved || []).length}/${v.guessers}`, reveal: `${v.turnNo}/${v.turns}. tur bitti` };
    this.top(TOP[v.phase] || '');
    // tahtanın üstündeki etiket (maske, kelime, süre)
    const tk = `${v.game}|${v.seq}|${this.tagKey(v)}`;
    if (tk !== this.tagK) {
      this.tagK = tk;
      if (v.phase !== 'draw') this.maskPrev = '';
      const tg = this.tagHTML(v);
      this.tagEl.className = 'ct-tag' + (tg.cls ? ' ' + tg.cls : '');
      this.tagEl.innerHTML = tg.h;
      this.tagTm = this.tagEl.querySelector('.tm');
    }
    if (this.tagTm) {
      const s0 = String(secs(left)), hot = (v.phase === 'draw' && left < 10500) || (v.phase === 'pick' && v.isDrawer && left < 5500);
      if (this.tagTm.textContent !== s0) this.tagTm.textContent = s0;
      this.tagTm.classList.toggle('hot', hot);
    }
    // süre çubuğu
    const tm = this.el.bar.querySelector('.ct-tm');
    if (tm) {
      const tot = v.phase === 'pick' ? v.pickMs || 12e3 : v.phase === 'draw' ? v.drawMs || 75e3 : v.phase === 'reveal' ? v.revealMs || 6500 : 1;
      const i = tm.querySelector('i'), b = tm.querySelector('b');
      if (i) { i.style.transform = `scaleX(${clamp(left / tot, 0, 1).toFixed(3)})`; i.classList.toggle('hot', left < this.hotAt()); }
      if (b) b.textContent = `${secs(left)} sn`;
    }
    // çizen: bilen sayısı ve araçlar
    const cnt = this.el.bar.querySelector('.ct-cnt');
    if (cnt) cnt.textContent = `✓ ${(v.solved || []).length}/${v.guessers}`;
    if (v.phase === 'draw' && v.isDrawer) this.toolSync();
    // tahmin eden: çok yakın / son yanlışım
    const note = this.el.bar.querySelector('.ct-note');
    if (note) {
      let h = '';
      if (this.closeT != null && this.time - this.closeT < 3.5) h = `<span class="hot">🔥 Çok yakın! “${esc(this.closeTxt || '')}”</span>`;
      else if (this.myGuess && this.time - this.myGuess.t < 2.5) h = `<span class="no">✗ “${esc(this.myGuess.text)}” değil</span>`;
      else if ((v.hints || 0) > 0) h = `<span class="no">💡 ${v.hints} harf açıldı</span>`;
      if (note.dataset.h !== h) { note.dataset.h = h; note.innerHTML = h; }
    }
    const wt = this.el.bar.querySelector('.ct-wait');
    if (wt) { const h = `Diğerleri bekleniyor… ${(v.solved || []).length}/${v.guessers} bildi`; if (wt.textContent !== h) wt.textContent = h; }
    // alt çubuğun yüksekliği: tahta onun üstüne sığsın
    const bx = this.el.bar.firstElementChild;
    const br = bx ? bx.getBoundingClientRect() : null;
    const bh = br ? Math.round(br.height) : 0;
    if (Math.abs(bh - (this.barH || 0)) > 8) this.barH = bh;
    this.barTop = br && br.height ? br.top - this.el.wrap.getBoundingClientRect().top : (this.vh || 800) - 40;
    // etiketler: çizen ✏️, bilen ✓, puan
    const act = ['pick', 'draw', 'reveal'].includes(v.phase);
    // oyuncu şeridi: kim çiziyor, kim bildi
    const pk = act ? `${v.drawer}|${(v.solved || []).join(',')}|${this.seats.map((p) => p.id + p.on + ':' + p.sc).join(',')}|${v.me}` : '';
    if (pk !== this.plK) {
      this.plK = pk;
      this.plEl.innerHTML = act ? this.seats.map((p, i) => `<span class="${i === v.drawer ? 'd' : (v.solved || []).includes(i) ? 'ok' : ''} ${i === v.me ? 'me' : ''} ${p.on ? '' : 'off'}" style="--pc:${pcol(p.c)}"><i></i>${i === v.drawer ? '✏️ ' : (v.solved || []).includes(i) ? '✓ ' : ''}${esc(nm0(p.n).slice(0, 11))}${p.sc ? `<em>${p.sc}</em>` : ''}</span>`).join('') : '';
    }
    const solved = new Set(v.solved || []);
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (act && i === v.drawer) x += '<span>✏️</span>';
      if (act && solved.has(i)) x += '<span>✓</span>';
      if (p.sc) x += `<span class="ct-p">${p.sc}</span>`;
      if (o.ctK !== x) {
        o.ctK = x;
        let el = o.lbl.querySelector('.ct-x');
        if (!el) { el = document.createElement('span'); el.className = 'ct-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('ct-on', act && i === v.drawer);
      o.lbl.classList.toggle('ct-ok', act && solved.has(i));
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.ct-x')) o.ctK = '';
  }

  /* ---------- 2D yedek ---------- */
  flatBoard() {
    const w = this.vw || 360, h = this.vh || 640, land = w > h * 1.1;
    const bot = land ? 20 : (this.barH || 200) + 90 + (this.kbH || 0);
    const top = land ? 70 : 132;
    let bw = land ? w * 0.52 : w * 0.92;
    bw = Math.min(bw, (h - top - bot) / 0.7);
    const bh = bw * 0.7;
    return { x: land ? w * 0.03 : (w - bw) / 2, y: top, w: bw, h: bh };
  }
  flatPos(i) {
    const w = this.vw || 360, R = this.flatBoard();
    const n = Math.max(1, this.seats.length);
    const span = Math.min(w - 30, R.w + 20);
    const x0 = R.x + R.w / 2 - span / 2;
    return [x0 + (span * (i + 0.5)) / n, R.y + R.h + 34];
  }
  draw2d() {
    const g = this.g2;
    if (!g) return;
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#161b24'; g.fillRect(0, 0, w, h);
    const R = this.flatBoard();
    g.fillStyle = '#343a44';
    g.fillRect(R.x - 7, R.y - 7, R.w + 14, R.h + 14);
    g.drawImage(this.bCv, R.x, R.y, R.w, R.h);
    const u = this.flipU();
    if (u != null) { const k = Math.cos(easeIO(u) * Math.PI * 0.5); if (k > 0.02) g.drawImage(this.oldCv, R.x, R.y, R.w, R.h * k); }
    this.setBQ([[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w, R.y + R.h], [R.x, R.y + R.h]]);
    // masa dışındaki evrelerde oyuncular tahtanın altında (oyunda üstteki DOM şeridi gösterir)
    const v = this.view;
    if (v && !['pick', 'draw', 'reveal'].includes(v.phase)) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const n = Math.max(1, this.seats.length), span = Math.min(w - 30, R.w + 20), x0 = R.x + R.w / 2 - span / 2;
      this.seats.forEach((p, i) => {
        const x = x0 + (span * (i + 0.5)) / n, y = R.y + R.h + 34;
        g.fillStyle = pcol(p.c); g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill();
        g.lineWidth = i === this.me ? 3 : 2; g.strokeStyle = i === this.me ? '#fff' : '#1c1633'; g.stroke();
        g.fillStyle = '#fff'; g.font = '800 10px system-ui'; g.fillText(String(nm0(p.n)).slice(0, 7), x, y + 22);
        if (p.sc) { g.font = '900 10px system-ui'; g.fillStyle = '#3ccf6e'; g.fillText(String(p.sc), x, y - 21); }
      });
    }
    this.placeBoardUi();
  }
  draw2dGame() { /* draw2d tamamen burada */ }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new DrawGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[czt]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
