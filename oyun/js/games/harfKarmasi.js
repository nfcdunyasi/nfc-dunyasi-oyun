// Harf Karması — 3D kahvehane okey masası (NFC Dünyası Oyun)
// Masanın ortasında büyük bir ıstaka durur. Her turda kırmızı kadife keseden harf taşları dökülür ve ıstakaya karışık
// dizilir; kategori ipucu baştan görünür. Herkes kendi ekranında taşları sırayla dizerek kelimeyi bulmaya çalışır (yanlış
// diziliş ceza getirmez). Süre ilerleyince ilk harf, uzun kelimelerde son harf ıstakada yerine kayıp yeşile döner.
// Bulanın önündeki küçük ıstaka yeşil yanar. Açılışta ortadaki taşlar zıplayarak doğru sıraya geçer, kelime parlar,
// herkesin taşları masaya açılır. Bulan 500 + hızına göre 500'e kadar puan alır.
// Masa kiti (masa3d.js) ile çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-21-a';
import * as sfx from '../sfx.js?v=2026-11-21-a';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, makeTexture, updateTexture } = E;
void sfx;

const INK = '#1c1633', IVORY = '#f4ead2', FELT = '#1f6b45', WOODC = '#6b4226', REDV = '#a3122a', GOLDC = '#ffd23f';
const GOLD3 = new Float32Array([1, 0.82, 0.3]), GREEN3 = new Float32Array([0.35, 0.95, 0.55]), WHITE3 = new Float32Array([1, 1, 1]);
const HINT3 = new Float32Array([0.72, 1, 0.78]), FOUND3 = new Float32Array([0.8, 1, 0.82]), DIM3 = new Float32Array([0.62, 0.6, 0.56]);
const ABC = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
// Türkçe harf taşı puanları (taşın köşesindeki küçük sayı)
const TP = { A: 1, B: 3, C: 4, Ç: 4, D: 3, E: 1, F: 7, G: 5, Ğ: 8, H: 5, I: 2, İ: 1, J: 10, K: 1, L: 1, M: 2, N: 1, O: 2, Ö: 7, P: 5, R: 1, S: 2, Ş: 4, T: 1, U: 2, Ü: 3, V: 7, Y: 3, Z: 4 };
// ölçüler (ölçek 1'de; this.ss ile). Istaka uzayı: x sağ, y yukarı (yaslı), z kameraya doğru
const TW = 0.15, TH = 0.2, TD = 0.05, TG = 0.012, STEP = TW + TG;   // taş genişliği, yüksekliği, kalınlığı, aralık
const RL = 8 * STEP + 0.14;                                           // ıstaka uzunluğu (8 taş sığar)
const R_TILT = 0.36, R_Z = -0.05, R_Y = 0.07;                         // ıstaka yaslılığı; yeri; kaide yüksekliği
const LEDGE = 0.03, TY0 = LEDGE + TH / 2 + 0.002, TK0 = -0.012 + TD / 2 + 0.002;   // taşların durduğu raf; taş merkezi
const BAG = [-0.5, 0, R_Z + 0.42], BAG_RY = -2.45;                    // kese: ıstakanın sol önünde; dökerken ıstakaya eğilir
const MOUTH = [BAG[0] + 0.16, 0.16, BAG[2] - 0.13];                   // kesenin ağzı (dökerken)
const S_TW = 0.062, S_TH = 0.082, S_TD = 0.022, S_STEP = 0.068, S_Z = 0.66, S_ZT = S_Z - 0.012;   // oyuncunun küçük ıstakası (koltuk uzayı)
const T_POUR = 0.15, POUR_DT = 0.07, POUR_D = 0.38;                   // taşlar keseden dökülür
const T_SORT = 0.25, SORT_DT = 0.07, SORT_D = 0.5, T_WORD = 1.35, T_FLIP = 1.5;   // açılış
const CRT = Math.cos(R_TILT), SRT = Math.sin(R_TILT);
const R_UP = [0, CRT, -SRT], R_N = [0, SRT, CRT];
const EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const CAFE_L = { sunC: [0.5, 0.45, 0.38], sky: [0.42, 0.38, 0.33], gnd: [0.2, 0.16, 0.12], night: 1, warm: [1, 0.84, 0.58], lampC: [1.55, 1.28, 0.92], fogR: [30, 90], stars: 0, glowS: 0.3 };

const STYLE = `
#ky.hkr .msg{top:12%}
#ky.hkr .hk-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fffaf0;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.hkr .hk-q{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:900;letter-spacing:.05em}
#ky.hkr .hk-q .st{background:#1f6b45;color:#fff;border-radius:99px;padding:1px 9px}
#ky.hkr .hk-q .ct{background:#ffe29a;color:#1c1633;border-radius:99px;padding:1px 9px;letter-spacing:.01em;font-size:13px}
#ky.hkr .hk-q .ln{opacity:.7;letter-spacing:.02em}
#ky.hkr .hk-row1{--tw:min(46px,calc((96vw - 40px - (var(--n) - 1) * 5px) / var(--n)));display:flex;justify-content:center;gap:5px;margin-top:8px;min-height:calc(var(--tw) * 1.2)}
#ky.hkr .hk-t{position:relative;width:var(--tw);height:calc(var(--tw) * 1.2);border-radius:9px;border:2.5px solid #1c1633;background:linear-gradient(#fffaf0,#efe2c4);box-shadow:0 3px 0 #b9a77e,0 3px 0 1.5px #1c1633;color:#1c1633;font:900 calc(var(--tw) * .62)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;display:grid;place-items:center;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
#ky.hkr .hk-t i{position:absolute;right:3px;bottom:1px;font-style:normal;font-size:calc(var(--tw) * .22);color:#c21f33}
#ky.hkr .hk-t:active:not([disabled]){transform:translateY(2px);box-shadow:0 1px 0 #b9a77e,0 1px 0 1.5px #1c1633}
#ky.hkr .hk-t.used{opacity:.14;pointer-events:none;box-shadow:none}
#ky.hkr .hk-t.lock{background:linear-gradient(#d9ffe4,#a8efc0);box-shadow:0 3px 0 #5fbf85,0 3px 0 1.5px #1c1633}
#ky.hkr .hk-t.ok{background:linear-gradient(#d9ffe4,#9ff0bb)}
#ky.hkr .hk-s{width:var(--tw);height:calc(var(--tw) * 1.2);border-radius:9px;border:2.5px dashed rgba(28,22,51,.4);background:rgba(28,22,51,.05)}
#ky.hkr .hk-row1.slots{padding:6px 6px 8px;border-radius:14px;background:#6b4226;box-shadow:inset 0 -6px 0 #4a2c18,inset 0 3px 0 rgba(255,255,255,.18)}
#ky.hkr .hk-row1.slots .hk-s{border-color:rgba(255,236,200,.55);background:rgba(0,0,0,.18)}
#ky.hkr .hk-row1.slots.bad{animation:hksh .4s}
@keyframes hksh{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
#ky.hkr .hk-bt{display:flex;gap:6px;justify-content:center;margin-top:8px}
#ky.hkr .hk-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:6px 12px;font-weight:900;font-size:14px;background:#fff;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.hkr .hk-b.y{background:#ffd23f}
#ky.hkr .hk-b.sm{padding:3px 10px;font-size:13px;border-width:2px;box-shadow:2px 2px 0 var(--ink);border-radius:11px}
#ky.hkr .hk-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.hkr .hk-b[disabled]{opacity:.45}
#ky.hkr .hk-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800;min-height:22px}
#ky.hkr .hk-ft .n{background:#1c1633;color:#fff;border-radius:99px;padding:2px 9px}
#ky.hkr .hk-ft .z{opacity:.85}
#ky.hkr .hk-ft .z.g{color:#0d7a3e;opacity:1}
#ky.hkr .hk-ft .z.r{color:#c21f33;opacity:1}
#ky.hkr .hk-inp.off{opacity:.5;filter:grayscale(.6);pointer-events:none}
#ky.hkr .hk-watch{margin-top:8px;border:3px dashed rgba(28,22,51,.35);border-radius:14px;padding:12px 8px;font-weight:800;font-size:14px}
#ky.hkr .hk-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.hkr .hk-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:transform .15s linear,background .3s}
#ky.hkr .hk-res{display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:6px;font-weight:900;font-size:clamp(15px,4.4vw,19px)}
#ky.hkr .hk-res .mi{font-size:13.5px;font-weight:800;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
#ky.hkr .hk-res .mi em{font-style:normal;font-weight:900;border-radius:99px;padding:1px 9px;background:#e8f3ec}
#ky.hkr .hk-res .mi em.g{background:#c9f5dc;color:#0d6b3a}
#ky.hkr .hk-res .mi em.r{background:#ffe1df;color:#a11426}
#ky.hkr .hk-res .m{opacity:.7}
#ky.hkr .hk-res .al{font-size:12px;font-weight:800;opacity:.75}
#ky.hkr .hk-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;font-weight:800;min-height:20px}
#ky.hkr .hk-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.hkr .hk-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.hkr .hk-rk span.me{background:#fff4c2}
#ky.hkr .lbl .hk-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.hkr .lbl .hk-x:empty{display:none}
#ky.hkr .lbl .hk-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#1c1633;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.hkr .hk-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.hkr .hk-pt.f{color:#ffd23f}
#ky.hkr .hk-pt.go{animation:hkpt 2.4s ease-out forwards}
@keyframes hkpt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.hkr .card .hk-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.hkr .card .hk-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.hkr .card .hk-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.hkr .card .hk-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.hkr .card .hk-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.hkr .card .hk-seg button.on{background:var(--ink);color:#fff}
#ky.hkr .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.hkr .card .hk-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.hkr .card .hk-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.hkr .card .hk-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.hkr .card .hk-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.hkr .card .hk-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.hkr .card .hk-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.hkr .card .hk-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.hkr .card .hk-aw div:only-child{grid-column:1/-1}
#ky.hkr .card .hk-aw div b{font-size:18px;flex:0 0 auto}
#ky.hkr .card .hk-aw div span{flex:1;min-width:0;font-size:12px}
#ky.hkr .card .hk-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.hkr .card .hk-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.hkr .card .hk-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.hkr .card .hk-tb>div.me{background:#fff4c2}
#ky.hkr .card .hk-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.hkr .card .hk-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.hkr .card .hk-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.hkr .card .hk-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.hkr .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.hkr .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.hkr .hk-box{width:min(470px,54vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.hkr .hk-row1{--tw:min(40px,calc((54vw - 40px - (var(--n) - 1) * 5px) / var(--n)));margin-top:6px}
#ky.hkr .hk-bt{margin-top:6px}
#ky.hkr .hk-b{padding:4px 10px;font-size:13px}
#ky.hkr .hk-ft{margin-top:5px}
#ky.hkr .hk-tm{margin-top:5px}
#ky.hkr .card .hk-ru{margin-top:6px}#ky.hkr .card .hk-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.hkr .card .hk-ru div b{font-size:17px}
#ky.hkr .card .hk-seg{margin-top:6px}#ky.hkr .card .hk-seg button{padding:6px 4px}
#ky.hkr .card .hk-pod{display:none}
#ky.hkr .card .hk-aw{margin-top:6px}
#ky.hkr .card .hk-tb{max-height:24vh}
#ky.hkr .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.hkr .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, final): kahvehane çiftetellisi (Re Hicaz, 112 bpm): darbuka (düm-tek), bas, sazımsı tel ve akordeon ezgisi.
// 'race' (kelime ararken): sade ve gergin (Re Hicaz, 100 bpm): hafif darbuka, saat tıkırtısı, alçak dem, ara ara tel motifi.
class HkSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 100 : 112; }
  swing() { return this.mode === 'race' ? 0.06 : 0.12; }
  dum(t, v) { this.iKick(t, v, 165, 78, 0.16); }
  tek(t, v) { this.iRim(t, v); }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    // maksum ritmi: DÜM tek . tek DÜM . tek .
    const M8 = ['D', 'T', '', 'T', 'D', '', 'T', ''];
    const e = M8[s >> 1], on = s % 2 === 0;
    if (this.mode === 'race') {
      if (on && e === 'D') this.dum(t, 0.05);
      if (on && e === 'T') this.tek(t, 0.032);
      if (!on && (s === 5 || s === 13)) this.iKa(t, 0.018);
      if (s % 2 === 1) this.iTick(t, 0.012);
      if (s === 0) this.iPad(t, bar % 4 === 2 ? [43, 50, 55] : [38, 45, 50], spb * 5, 0.026, 900, 0.3);
      if (s === 0 || s === 8) this.iBass(t, bar % 4 === 2 ? 31 : 26, spb * 1.6, 0.06, 'sine');
      // ara ara Hicaz motifi (iki ölçüde bir)
      const MO = [[69, null, 70, null, 69, 67, 66, null], [63, null, 62, null, null, null, null, null]];
      if (bar % 2 === 1 && on) { const m = MO[(bar >> 1) % 2][s >> 1]; if (m != null) this.iPluck(t, m, 0.034, 0.3, 'triangle', 3000, 0.25); }
      if (bar % 4 === 3 && s === 12) this.iBell(t, 74, 0.016, 0.9, 0.3);
      return;
    }
    if (on && e === 'D') this.dum(t, 0.075);
    if (on && e === 'T') this.tek(t, 0.05);
    if (!on && s % 4 === 3) this.iKa(t, 0.024);
    if (s % 4 === 2) this.iTamb(t, 0.014);
    // akorlar: Re – Re – Sol minör – Re
    const CH = [[38, [62, 66, 69]], [38, [62, 66, 69]], [43, [62, 67, 70]], [38, [62, 66, 69]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0) this.iBass(t, root - 12, spb * 0.9, 0.075, 'saw', 700);
    if (s === 6) this.iBass(t, root - 12 + 7, spb * 0.45, 0.06, 'saw', 700);
    if (s === 8) this.iBass(t, root - 12, spb * 0.9, 0.07, 'saw', 700);
    if (s === 12) this.iBass(t, root - 12 + 12, spb * 0.45, 0.06, 'saw', 700);
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 5, 0.02, 1100, 0.3);
    if (s === 4 || s === 12) ch.forEach((m, k) => this.iAcc(t + k * 0.004, m, st * 1.6, 0.012, 0.15));
    const MEL = [[69, 70, 69, 67, 66, null, 67, 69], [70, null, 69, 67, 66, 63, 62, null], [62, 63, 66, 67, 69, null, 70, 72], [70, 69, 67, 66, 63, 66, 62, null]];
    const m = MEL[bar % 4][s >> 1];
    if (on && m != null) { if (bar % 8 < 4) this.iSham(t, m, 0.045, 0.3, 0.15); else this.iMand(t, m, st * 1.8, 0.03, 0.18); }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    const clack = (tt, v = 0.1, f = 1900) => { this.iWood(tt, v, f + Math.random() * 300); this.noise(tt, 0.018, v * 0.6, { type: 'bandpass', freq: 3400, q: 1.6 }); };
    switch (name) {
      case 'tap': clack(t, 0.08, 1700); break;
      case 'undo': clack(t, 0.06, 1100); break;
      case 'place': clack(t, 0.1, 2000); break;
      case 'shuffle': for (let i = 0; i < 6; i++) clack(t + i * 0.045 + Math.random() * 0.02, 0.05, 1500 + Math.random() * 600); break;
      case 'pour': // kadife kesenin hışırtısı (taşların sesi yere indikçe gelir)
        this.noise(t, 0.34, 0.05, { type: 'bandpass', freq: 800, to: 2200, q: 0.8, attack: 0.04 });
        this.noise(t + 0.12, 0.3, 0.03, { type: 'bandpass', freq: 2600, to: 1500, q: 1.2, attack: 0.05 });
        break;
      case 'wrong':
        this.tone(220, t, 0.14, 'square', 0.045, 180, 0.004);
        this.tone(185, t + 0.12, 0.2, 'square', 0.04, 150, 0.004);
        for (let i = 0; i < 4; i++) clack(t + 0.18 + i * 0.04, 0.04, 1300);
        break;
      case 'solve': // buldum: yükselen arpej ve zil
        [[74, 0], [78, 0.07], [81, 0.14], [86, 0.21]].forEach(([m, d]) => this.iBell(t + d, m, 0.05, 0.9, 0.3));
        this.tone(1568, t + 0.28, 0.5, 'sine', 0.05, null, 0.002);
        break;
      case 'peer': this.iBell(t, 86 + Math.floor(Math.random() * 3), 0.022, 0.5, 0.3); break;
      case 'hint': for (let i = 0; i < 6; i++) this.iBell(t + i * 0.04, 84 + i * 2, 0.018, 0.5, 0.35); clack(t + 0.32, 0.08, 1800); break;
      case 'pass': this.tone(392, t, 0.12, 'triangle', 0.045, 370, 0.01); this.tone(330, t + 0.13, 0.22, 'triangle', 0.045, 300, 0.01); break;
      case 'swap': clack(t, 0.07, 1400 + (a || 0) * 900); break;
      case 'word': // kelime tamam: akor ve parıltı
        this.duck(0.3, 1.2);
        [62, 66, 69, 74].forEach((m, k) => this.iBell(t + k * 0.05, m + 12, 0.035, 1.2, 0.3));
        this.noise(t + 0.05, 0.6, 0.03, { type: 'highpass', freq: 6000, attack: 0.1 });
        break;
      case 'flip': for (let i = 0; i < 5; i++) clack(t + i * 0.03, 0.05, 1200 + Math.random() * 500); break;
      case 'first': super._fx('kaching'); this.cheer(t + 0.1, 1.2); break;
      case 'miss':
        this.tone(392, t, 0.14, 'triangle', 0.06, 370, 0.01);
        this.tone(330, t + 0.15, 0.32, 'triangle', 0.06, 262, 0.01);
        break;
      case 'timeup':
        this.tone(220, t, 0.4, 'square', 0.05, null, 0.004);
        this.tone(277, t, 0.4, 'square', 0.035, null, 0.004);
        break;
      case 'champ':
        this.duck(0.15, 3);
        [[62, 0, 0.14], [66, 0.15, 0.14], [69, 0.3, 0.14], [74, 0.45, 0.8]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.07, 0.15); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
const WOOD = () => C(WOODC, -0.45), WOOD_D = () => C('#4a2c18', -0.35), BRASSC = () => C('#c9a14a', -0.85);
// orta ıstaka (ıstaka uzayı: orijin önde, kaidenin üstü; taşlar yaslı düzlemde durur). Kaide + yaslı arkalık + uçlar
function rackModel(mb) {
  const L = RL / 2;
  mb.rbox(-L - 0.04, -R_Y, -0.11, L + 0.04, 0, 0.11, 0.02, WOOD_D(), 2);
  mb.push().T(0, 0, 0, 0, -R_TILT, 0);
  mb.rbox(-L, 0, -0.012, L, LEDGE, 0.07, 0.01, WOOD(), 1);              // raf (taşlar üstünde durur)
  mb.rbox(-L, LEDGE - 0.004, 0.056, L, LEDGE + 0.012, 0.07, 0.005, WOOD_D(), 1);   // ince ön dudak
  mb.rbox(-L, 0, -0.045, L, LEDGE + TH * 0.82, -0.012, 0.012, WOOD(), 2);          // arkalık
  mb.rbox(-L - 0.03, 0, -0.05, -L, LEDGE + TH * 0.92, 0.07, 0.012, WOOD_D(), 1);
  mb.rbox(L, 0, -0.05, L + 0.03, LEDGE + TH * 0.92, 0.07, 0.012, WOOD_D(), 1);
  mb.rbox(-L + 0.02, LEDGE + TH * 0.82 - 0.012, -0.05, L - 0.02, LEDGE + TH * 0.82 + 0.008, -0.008, 0.006, BRASSC(), 1);
  mb.pop();
}
// harf taşı gövdesi (yerel: merkez orijin, yüz +z)
function tileModel(mb, w, h, d) { mb.rbox(-w / 2, -h / 2, -d / 2, w / 2, h / 2, d / 2, Math.min(w, h) * 0.12, C(IVORY, -0.6), 2); }
// harf yüzü (dokulu, atlas hücresi): 8 sütun × 4 satır, 128×160 hücre
function faceQuad(tb, k, w, h, d) {
  const c = k % 8, r = Math.floor(k / 8), u0 = c / 8, u1 = u0 + 1 / 8, v0 = (r * 160) / 640, v1 = v0 + 160 / 640;
  const x = w / 2 * 0.86, y = h / 2 * 0.88, z = d / 2 + 0.0012;
  tb.tquad([-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], u0, v0, u1, v1, [0, 0, -1]);
}
// küçük ıstaka (koltuk önünde; yerel +z oyuncuya bakar, arkalık -z tarafında: masanın ortasına doğru)
function seatRackModel(mb) {
  const L = 4 * S_STEP + 0.02;
  mb.rbox(-L, 0, -0.035, L, 0.018, 0.035, 0.006, WOOD(), 1);
  mb.rbox(-L, 0, -0.03, L, S_TH * 0.75, -0.013, 0.006, WOOD(), 1);
}
// kırmızı kadife kese (yerel: dip orijin)
function bagModel(mb) {
  const V = C(REDV, 0), V2 = C('#86101f', 0), IN = C('#2a040b', 0), G = C('#e8c25a', -0.7);
  mb.sphereS(0, 0.095, 0, 0.125, 0.1, 0.125, V, 18, 12);                       // gövde
  mb.cyl(0, 0.16, 0, 0.07, 0.205, 0.045, 14, V2, V2, '');                      // büzgülü boyun
  mb.cyl(0, 0.2, 0, 0.045, 0.25, 0.085, 14, V, IN, 't');                       // fırfırlı ağız (içi koyu)
  mb.torusN(0, 0.2, 0, 0.05, 0.01, 0.01, 16, 6, G);                             // altın ip
  mb.sphereS(0.055, 0.17, 0.035, 0.014, 0.014, 0.014, G, 8, 6);                // püskül
  mb.sphereS(-0.05, 0.165, 0.04, 0.012, 0.012, 0.012, G, 8, 6);
}
function chipGlowModel(mb) { mb.rbox(-0.5, 0, -0.5, 0.5, 0.004, 0.5, 0.004, C('#ffffff', 0.9), 1); }

/* ============================ dokular ============================ */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// harf atlası (1024×640): her hücrede fildişi zemin, kocaman harf, köşede kırmızı puan
function drawLetters(cv) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  [...ABC, '?'].forEach((ch, k) => {
    const x = (k % 8) * 128, y = Math.floor(k / 8) * 160;
    const bg = g.createLinearGradient(0, y, 0, y + 160); bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#efe2c4');
    g.fillStyle = bg; g.fillRect(x, y, 128, 160);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${ch === 'İ' || ch === 'Ğ' || ch === 'Ü' || ch === 'Ö' ? 104 : 112}px ${F}`;
    g.fillText(ch, x + 64, y + (ch === 'Ç' || ch === 'Ş' ? 76 : 86));
    if (TP[ch]) { g.fillStyle = '#c21f33'; g.font = `900 30px ${F}`; g.textAlign = 'right'; g.fillText(String(TP[ch]), x + 120, y + 142); }
  });
}
const letterIdx = (ch) => { const k = ABC.indexOf(ch); return k >= 0 ? k : ABC.length; };

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const sec = (ms) => (ms / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };
const upTR = (k) => (k === 'i' ? 'İ' : k === 'ı' ? 'I' : String(k).toLocaleUpperCase('tr-TR'));
const MEDAL = ['🥇', '🥈', '🥉'];

/* ============================ oyun ============================ */
class LetterGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'hkr', cls: 'hkr', title: 'Harf Karması', sub: 'Okey masası', emoji: '🔤', css: STYLE, snd: new HkSnd(), amb: 'diner', ambVol: 0.4, botPx: 260, botPxL: 34, cloth: FELT, trim: WOODC, tea: true, place: false, chairPad: '#7a1f2b', lampHex: '#3b2a1c', light: CAFE_L, fog: '#120d09', roomStyle: { wall: '#3a2a1c', curtain: '#7a1f2b' } });
    this.ptEl = [];
    this.tint = new Float32Array(3);
    this.sYaw = 0;
    this.sM = M.make(); this.sA = M.make(); this.sB = M.make(); this.sC = M.make(); this.sD = M.make();
    this.tm = [];            // orta taşların matrisleri (her karede)
    this.in = null;          // yerel girdi durumu (havuz, yuvalar)
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.hkRack = this.mk(rackModel);
    W.hkTile = this.mk((mb) => tileModel(mb, TW, TH, TD));
    W.hkFace = Array.from({ length: ABC.length + 1 }, (_, k) => this.mk((tb) => faceQuad(tb, k, TW, TH, TD), 'tex'));
    W.hkSTile = this.mk((mb) => tileModel(mb, S_TW, S_TH, S_TD));
    W.hkSFace = Array.from({ length: ABC.length + 1 }, (_, k) => this.mk((tb) => faceQuad(tb, k, S_TW, S_TH, S_TD), 'tex'));
    W.hkSRack = this.mk(seatRackModel);
    W.hkBag = this.mk(bagModel);
    W.trophy = this.mk(K.trophyModel);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
    this.letCv = c; drawLetters(c); this.letTex = makeTexture(this.X, c);
    this.letOk = true;
    try { document.fonts?.ready?.then(() => { if (!this.dead) this.letOk = false; }); } catch { /* yok */ }
  }
  freeTex() {
    const gl = this.X && this.X.gl;
    if (gl && this.letTex) gl.deleteTexture(this.letTex);
    this.letTex = null;
  }
  onDispose() {
    this.ptEl.forEach((e) => e && e.remove()); this.ptEl = [];
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
  }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  inPlay() { const v = this.view; return !!v && (v.phase === 'question' || v.phase === 'reveal') && Array.isArray(v.mix); }
  qT() { const v = this.view; return v && v.phase === 'question' ? (this.sNow() - (v.qAt || v.at || 0)) / 1000 : -1; }
  revT() { const v = this.view; return v && v.phase === 'reveal' ? (this.sNow() - (v.at || 0)) / 1000 : -1; }
  wordUp() { return this.revT() >= T_WORD; }
  land() { return (this.vw || 1) > (this.vh || 1) * 1.1; }
  get ss() { return this.ssV || 1; }
  dispScore(i) {
    const v = this.view;
    if (!v) return 0;
    const sc = (v.scores || [])[i] || 0;
    if (v.phase === 'reveal' && !this.wordUp()) return sc - ((v.gains || [])[i] || 0);
    return sc;
  }

  /* ---------- girdi: taşları dizme ---------- */
  // havuz: sunucunun karışık dizisi; yuvalar: sıradaki harfler (havuz indisi) ya da boş; ipucu yuvaları kilitli
  resetInput(v) {
    const n = v.mix.length;
    this.in = { key: `${v.game}|${v.r}`, n, pool: v.mix.map((ch, i) => ({ ch, i })), order: v.mix.map((_, i) => i), slot: new Array(n).fill(-1), lock: new Array(n).fill(false), wait: false, tries: v.myTries || 0, hints: 0 };
    this.applyHints(v, true);
  }
  canPlay() { const v = this.view; return !!v && v.phase === 'question' && v.amIn && !v.closing && !v.mySolved && !v.myPassed && this.sNow() < (v.endsAt || 0); }
  applyHints(v, quiet) {
    const I = this.in;
    if (!I || !Array.isArray(v.hints)) return;
    v.hints.forEach((h) => {
      if (I.lock[h.i]) return;
      // yuvadaki taşı geri al, ipucu harfini taşı (boştaysa havuzdan, değilse başka yuvadan)
      // önce yerinde doğru duran, sonra boştaki, en son başka yuvadaki aynı harf
      let pi = -1, from = -1;
      if (I.slot[h.i] >= 0 && I.pool[I.slot[h.i]].ch === h.ch) pi = I.slot[h.i];
      if (pi < 0) pi = I.pool.findIndex((p, k) => p.ch === h.ch && !I.slot.includes(k));
      if (pi < 0) { from = I.slot.findIndex((x, k) => x >= 0 && !I.lock[k] && I.pool[x].ch === h.ch); if (from >= 0) pi = I.slot[from]; }
      if (pi < 0) return;
      if (from >= 0) I.slot[from] = -1;
      if (I.slot[h.i] >= 0) I.slot[h.i] = -1;
      I.slot[h.i] = pi;
      I.lock[h.i] = true;
    });
    I.hints = v.hints.length;
    if (quiet) return;
    this.paintInput();
    // ipucu son boş yuvayı doldurduysa dizilişi kendiliğinden gönder
    if (I.slot.every((x) => x >= 0) && !I.wait && this.canPlay()) this.submit();
  }
  tapPool(k) {
    if (!this.canPlay() || !this.in || this.in.wait) return;
    const I = this.in;
    if (I.slot.includes(k)) return;
    const j = I.slot.findIndex((x, s) => x < 0 && !I.lock[s]);
    if (j < 0) return;
    I.slot[j] = k;
    this.fx('tap'); vibrate(6);
    this.paintInput();
    if (I.slot.every((x) => x >= 0)) this.submit();
  }
  tapSlot(j) {
    if (!this.canPlay() || !this.in || this.in.wait) return;
    const I = this.in;
    if (I.lock[j] || I.slot[j] < 0) return;
    I.slot[j] = -1;
    this.fx('undo'); vibrate(5);
    this.paintInput();
  }
  undo() {
    if (!this.canPlay() || !this.in || this.in.wait) return;
    const I = this.in;
    for (let j = I.n - 1; j >= 0; j--) if (I.slot[j] >= 0 && !I.lock[j]) { I.slot[j] = -1; this.fx('undo'); this.paintInput(); return; }
  }
  clearSlots() { const I = this.in; if (!I) return; for (let j = 0; j < I.n; j++) if (!I.lock[j]) I.slot[j] = -1; }
  reshuffle() {
    if (!this.canPlay() || !this.in) return;
    const I = this.in, o = I.order.slice();
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    I.order = o;
    this.fx('shuffle'); vibrate(8);
    this.paintInput();
  }
  typeKey(ch) {
    if (!this.canPlay() || !this.in) return;
    const I = this.in;
    const k = I.order.find((pi) => I.pool[pi].ch === ch && !I.slot.includes(pi));
    if (k == null) { this.fx('undo'); return; }
    this.tapPool(k);
  }
  submit() {
    const I = this.in;
    if (!I || !this.canPlay()) return;
    const w = I.slot.map((x) => I.pool[x].ch).join('');
    I.wait = true;
    // sunucu iki deneme arasında 0,7 sn bekler: çok hızlı dizilirse gönderimi biraz ertele
    const gap = Math.max(0, 0.85 - (this.time - (I.lastSent ?? -9)));
    const go = () => {
      if (this.dead || this.in !== I || !this.canPlay()) { I.wait = false; return; }
      I.lastSent = I.sentAt = this.time;
      this.ctx.send('try', { w });
    };
    this.fx('place');
    if (gap > 0.02) setTimeout(go, gap * 1000); else go();
  }
  // sunucudan sonuç: bulundu mu, yanlış mı (deneme sayısı arttı)
  checkTry(v) {
    const I = this.in;
    if (!I || I.key !== `${v.game}|${v.r}`) return;
    if (v.mySolved && !I.solved) {
      I.solved = true; I.wait = false;
      this.fx('solve'); vibrate([15, 30, 15]);
      this.msg(`✅ BULDUN! ${sec(v.myMs || 0)} sn`, 'mid');
      return;
    }
    if ((v.myTries || 0) > I.tries) {
      I.tries = v.myTries;
      if (!v.mySolved) {
        this.fx('wrong'); vibrate([30, 40, 30]);
        const row = this.el.bar.querySelector('.hk-row1.slots');
        if (row) { row.classList.remove('bad'); void row.offsetWidth; row.classList.add('bad'); }
        setTimeout(() => { if (this.dead || !this.in || this.in !== I) return; I.wait = false; this.clearSlots(); this.paintInput(); }, 420);
      }
    }
  }
  tileHtml(ch, cls, attr) { return `<button class="hk-t ${cls}" ${attr}>${esc(ch)}${TP[ch] ? `<i>${TP[ch]}</i>` : ''}</button>`; }
  inputHtml() {
    const I = this.in, v = this.view;
    if (!I) return '';
    const solved = !!v.mySolved;
    const slots = Array.from({ length: I.n }, (_, j) => {
      if (solved) return this.tileHtml(this.solvedWord[j] || '', 'ok', 'disabled');
      const x = I.slot[j];
      if (x < 0) return '<span class="hk-s"></span>';
      return this.tileHtml(I.pool[x].ch, I.lock[j] ? 'lock' : '', `data-act="hk-slot" data-j="${j}"`);
    }).join('');
    const pool = solved ? '' : I.order.map((pi) => this.tileHtml(I.pool[pi].ch, I.slot.includes(pi) ? 'used' : '', `data-act="hk-pool" data-k="${pi}"`)).join('');
    return `<div class="hk-row1 slots" style="--n:${I.n}">${slots}</div>${solved ? '' : `<div class="hk-row1 pool" style="--n:${I.n}">${pool}</div>`}`;
  }
  paintInput() {
    const box = this.el.bar.querySelector('.hk-inp');
    if (!box || !this.in) return;
    const v = this.view;
    if (v && v.mySolved) this.solvedWord = v.myW ? [...v.myW] : this.in.slot.map((x) => this.in.pool[x]?.ch || '');
    box.innerHTML = this.inputHtml();
    const ub = this.el.bar.querySelector('[data-act=hk-undo]');
    if (ub) ub.disabled = !this.in.slot.some((x, j) => x >= 0 && !this.in.lock[j]);
  }
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'hk-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'hk-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'hk-pool') this.tapPool(+b.dataset.k);
      else if (act === 'hk-slot') this.tapSlot(+b.dataset.j);
      else if (act === 'hk-undo') this.undo();
      else if (act === 'hk-mix') this.reshuffle();
      else if (act === 'hk-pass') { if (this.canPlay()) { this.fx('pass'); this.ctx.send('pass', {}); } }
      else if (act === 'hk-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (!this.canPlay() || e.ctrlKey || e.metaKey || e.altKey) return;
      const tg = e.target && e.target.tagName;
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg)) return;
      if (e.key === 'Backspace') { e.preventDefault(); this.undo(); return; }
      if (e.key === ' ') { e.preventDefault(); this.reshuffle(); return; }
      if (e.key && e.key.length === 1) { const ch = upTR(e.key); if (ABC.includes(ch)) { e.preventDefault(); this.typeKey(ch); } }
    };
    window.addEventListener('keydown', this.onKey);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.hkr !== '1') { root.dataset.hkr = '1'; root.innerHTML = '<p class="py-16 text-center">🔤</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.r || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'question') {
      if (!this.in || this.in.key !== `${v.game}|${v.r}`) this.resetInput(v);
      if ((v.hints || []).length > (this.in.hints || 0)) { this.applyHints(v); this.onHint(v); }
      this.checkTry(v);
      (v.seats || []).forEach((p, i) => {
        if (!(v.solved || [])[i] || this.found.has(p.id)) return;
        this.found.set(p.id, this.time);
        if (prev && prev.phase === 'question' && i !== v.me) this.fx('peer');
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const mus = (m) => { try { this.snd.music(m); } catch { /* yok */ } };
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'question') {
      mus('race');
      const fresh = this.sNow() - (v.qAt || v.at || 0) < 1500;
      this.found = new Map((v.seats || []).filter((p, i) => (v.solved || [])[i]).map((p) => [p.id, -9]));
      this.solvedWord = null;
      this.resetInput(v);
      this.tickSec = 0; this.upSeen = false;
      this.rack = { key: `${v.game}|${v.r}`, slotOf: v.mix.map((_, i) => i), moves: [], lock: new Array(v.mix.length).fill(false), hints: 0, landed: fresh ? 0 : 99 };
      this.applyRackHints(v, true);
      if (fresh) { this.fx('pour', v.mix.length); this.msg(`🔤 ${v.r}. KELİME`, 'mid'); }
    }
    if (v.phase === 'reveal') {
      mus('race');
      const rt = this.revT();
      this.prepReveal(v);
      this.ev = { sort: rt > 0.25 ? 99 : 0, word: rt >= T_WORD + 0.3, flip: rt >= T_FLIP + 0.3 };
      this.wordT = this.ev.word ? this.time - 9 : null;
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.champFx = late;
      if (!late) this.msg('🏁 KELİMELER BİTTİ', 'big');
    }
  }
  // ortadaki ıstakada ipucu harfi yerine kayar (iki taş yer değiştirir) ve yeşile döner
  applyRackHints(v, quiet) {
    const R = this.rack;
    if (!R || !Array.isArray(v.hints)) return;
    v.hints.forEach((h) => {
      if (R.lock[h.i]) return;
      const at = R.slotOf.findIndex((s) => s === h.i);       // şu an o yuvadaki taş
      let src = -1;
      v.mix.forEach((ch, ti) => { if (src < 0 && ch === h.ch && !R.lock[R.slotOf[ti]]) src = ti; });
      if (at >= 0 && v.mix[at] === h.ch && !R.lock[h.i]) src = at;
      if (src < 0) return;
      if (src !== at && at >= 0) {
        const sA = R.slotOf[src];
        R.slotOf[at] = sA; R.slotOf[src] = h.i;
        if (!quiet) { R.moves.push({ t: src, from: sA, to: h.i, t0: this.time, d: 0.55, h: 0.2 }, { t: at, from: h.i, to: sA, t0: this.time, d: 0.55, h: 0.12 }); }
      }
      R.lock[h.i] = true;
      R.lockT = R.lockT || {};
      R.lockT[src] = quiet ? -9 : this.time + 0.55;
    });
    R.hints = v.hints.length;
  }
  onHint(v) {
    this.applyRackHints(v);
    this.fx('hint');
    this.msg(v.hints.length >= 2 ? '💡 SON HARF AÇILDI' : '💡 İLK HARF AÇILDI', 'mid');
  }
  // açılış: her taşın gideceği yuva (önce yerinde doğru olanlar kalır)
  prepReveal(v) {
    const mix = v.mix || [], word = [...String(v.word || '')];
    const R = this.rack && this.rack.key === `${v.game}|${v.r}` ? this.rack : { slotOf: mix.map((_, i) => i), lock: [] };
    const cur = R.slotOf.slice();
    const dest = new Array(mix.length).fill(-1), used = new Set();
    word.forEach((ch, k) => { const ti = cur.findIndex((s, t) => s === k && mix[t] === ch && !used.has(t)); if (ti >= 0) { dest[ti] = k; used.add(ti); } });
    word.forEach((ch, k) => {
      if (dest.includes(k)) return;
      const ti = mix.findIndex((c, t) => c === ch && !used.has(t));
      if (ti >= 0) { dest[ti] = k; used.add(ti); }
    });
    this.rev = { key: `${v.game}|${v.r}`, from: cur, to: dest.map((d, t) => (d >= 0 ? d : cur[t])), moving: cur.map((s, t) => s !== (dest[t] >= 0 ? dest[t] : s)) };
    let k = 0;
    this.rev.ord = this.rev.moving.map((m) => (m ? k++ : -1));
  }
  sortT(t) { return T_SORT + Math.max(0, this.rev.ord[t]) * SORT_DT; }
  onWord() {
    const v = this.view;
    this.wordT = this.time;
    this.fx('word');
    const me = v.me, inR = me >= 0 && (v.inRound || [])[me];
    const got = me >= 0 && (v.gains || [])[me] > 0;
    const later = (n, ms) => setTimeout(() => { if (!this.dead) this.fx(n); }, ms);
    if (got && v.first === me) { later('first', 250); this.msg('⚡ İLK SEN BULDUN!', 'big'); }
    else if (got) this.msg(`✅ +${fmt(v.gains[me])}`, 'mid');
    else if (inR) { later('miss', 250); this.msg(`🔤 ${v.word}`, 'mid'); }
    if (this.X) {
      const c = this.rackW(0, TH * 0.6, TD);
      this.burst(c[0], c[1], c[2], 30, [[1, 0.85, 0.3], [1, 1, 1], [0.35, 0.95, 0.55]], 1.6, 0.03, false, 1.4, 2.4);
    }
    (v.gains || []).forEach((gn, i) => {
      if (!(gn > 0)) return;
      const e = this.ptBox(i);
      e.className = v.first === i ? 'hk-pt f' : 'hk-pt';
      e.textContent = `+${fmt(gn)}${v.first === i ? ' ⚡' : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
    });
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'hk-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- kürsü ve ıstaka uzayı ---------- */
  stepStand(dt) {
    const c = this.cam;
    const yaw = Math.atan2(c.ex - c.tx, c.ez - c.tz);
    this.sYaw += angDiff(yaw, this.sYaw) * (1 - Math.exp(-4 * dt));
  }
  standW(x, y, z) {
    const s = this.ss, c = Math.cos(this.sYaw), sn = Math.sin(this.sYaw);
    return [(x * c + z * sn) * s, TABLE_Y + y * s, (-x * sn + z * c) * s];
  }
  // ıstaka yüzündeki nokta (x boyunca, y yaslı düzlemde yukarı, k dışarı) → dünya
  rackW(x, y, k = 0) { return this.standW(x, R_Y + R_UP[1] * y + R_N[1] * k, R_Z + R_UP[2] * y + R_N[2] * k); }
  standMat() { return M.set(this.sM, 0, TABLE_Y + 0.002, 0, this.sYaw, 0, 0, this.ss); }
  slotX(s, n) { return (s - (n - 1) / 2) * STEP; }
  // orta taşın ıstaka uzayındaki yeri ve dönüşü: [x, y, k, rx, ry, rz, görünür]
  tilePose(t) {
    const v = this.view, R = this.rack;
    const n = (v.mix || []).length;
    const base = (s) => [this.slotX(s, n), TY0, TK0];
    if (v.phase === 'reveal' && this.rev) {
      const rt = this.revT(), A = base(this.rev.from[t]), B = base(this.rev.to[t]);
      if (!this.rev.moving[t] || rt <= this.sortT(t)) return [...A, 0, 0, 0, 1];
      const u = easeIO((rt - this.sortT(t)) / SORT_D), hgt = Math.sin(Math.PI * clamp(u, 0, 1)) * 0.2;
      return [lerp(A[0], B[0], u), A[1] + hgt, A[2] + hgt * 0.6, 0, 0, Math.sin(Math.PI * u) * 0.25, 1];
    }
    if (!R) return [...base(t), 0, 0, 0, 1];
    const s = R.slotOf[t];
    const P = base(s);
    // keseden dökülme: kesenin ağzından yayla yuvasına
    const qt = this.qT();
    const t0 = T_POUR + t * POUR_DT;
    if (R.landed < 99 && qt >= 0 && qt < t0 + POUR_D) {
      if (qt < t0) return [0, 0, 0, 0, 0, 0, 0];
      const u = easeOut((qt - t0) / POUR_D);
      const dy = MOUTH[1] - R_Y, dz = MOUTH[2] - R_Z;
      const bx = MOUTH[0], by = dy * CRT - dz * SRT, bk = dy * SRT + dz * CRT;
      const x = lerp(bx, P[0], u), y = lerp(by, P[1], u) + Math.sin(Math.PI * u) * 0.24, k = lerp(bk, P[2], u) + Math.sin(Math.PI * u) * 0.06;
      return [x, y, k, (1 - u) * 5, (1 - u) * 3, (1 - u) * 2, 1];
    }
    const mv = R.moves.find((m) => m.t === t && this.time < m.t0 + m.d);
    if (mv) {
      const u = easeIO((this.time - mv.t0) / mv.d), A = base(mv.from);
      return [lerp(A[0], P[0], u), P[1] + Math.sin(Math.PI * u) * mv.h, P[2] + Math.sin(Math.PI * u) * mv.h * 0.8, 0, 0, 0, 1];
    }
    const wob = Math.sin(this.time * 1.7 + t * 1.3) * 0.004;
    return [P[0], P[1] + wob, P[2], 0, 0, 0, 1];
  }
  // tüm orta taşların dünya matrislerini hesapla (sahne ve dokulu geçiş aynı matrisi kullanır)
  calcTiles() {
    const v = this.view;
    this.tm.length = 0;
    if (!v || !this.inPlay()) return;
    const SM = this.standMat();
    M.set(this.sA, 0, R_Y, R_Z, 0, -R_TILT, 0, 1);
    M.mul(this.sC, SM, this.sA);
    const pool = this.tmPool || (this.tmPool = []);
    v.mix.forEach((ch, t) => {
      const P = this.tilePose(t);
      if (!P[6]) { this.tm[t] = null; return; }
      const m = pool[t] || (pool[t] = M.make());
      M.set(this.sB, P[0], P[1], P[2], P[4], P[3], P[5], 1);
      M.mul(m, this.sC, this.sB);
      this.tm[t] = m;
    });
  }
  tileTint(t) {
    const v = this.view, R = this.rack;
    if (v.phase === 'reveal') {
      if (!this.wordUp()) return WHITE3;
      const u = this.time - (this.wordT ?? this.time);
      return u < 1.6 && Math.floor(u * 5 + t) % 2 ? WHITE3 : GOLD3;
    }
    if (R && R.lock && R.lock[R.slotOf[t]] && R.lockT && R.lockT[t] != null && this.time >= R.lockT[t]) return HINT3;
    return WHITE3;
  }
  // koltuk önündeki küçük ıstaka: soruda taşlar sırtı dönük durur (bulunca yeşil); açılışta masaya açılır
  seatRackMats(i, out) {
    const a = this.avatarAt(i);
    if (!a) return null;
    const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
    const W = (x, y, z) => [a.pos[0] + x * c + z * s, TABLE_Y + y, a.pos[2] - x * s + z * c];
    const p = W(0, 0.002, S_Z);
    M.set(out, p[0], p[1], p[2], a.yaw + Math.PI, 0, 0, 1);
    return { W, yaw: a.yaw };
  }

  /* ---------- karakterler ---------- */
  // önündeki küçük ıstakada taşlarla oynar (eller masada, ileri uzanmış)
  arrangePose(a, t, i) {
    a.pose('rest', { t });
    a.k = 10;
    const j = Math.sin(t * 6.5 + i * 1.7), q = Math.max(0, Math.sin(t * 4.1 + i));
    a.tgt.hand[1] = [0.11 + j * 0.05, 0.8 + q * 0.035, 0.56];
    a.tgt.hand[0] = [-0.13 - j * 0.025, 0.79, 0.54];
    a.tgt.fdir[1] = [0, -0.45, 1]; a.tgt.fdir[0] = [0.1, -0.45, 1];
    a.tgt.palm[1] = [0, -1, 0]; a.tgt.palm[0] = [0, -1, 0];
    a.tgt.fw[0] = a.tgt.fw[1] = 1;
    a.tgt.pole[1] = [0.9, -0.5, -0.2]; a.tgt.pole[0] = [-0.9, -0.5, -0.2];
    a.shape = ['relax', 'point'];
  }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const mid = this.rackW(0, TH * 0.5, 0.05);
    const rt = this.revT();
    const left = (v.endsAt || 0) - now;
    const champ = v.phase === 'final' ? v.champ || [] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.handK = null;
      const idle = a.hkI || (a.hkI = { lt: 0, look: null });
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
        const sol = (v.solved || [])[i], pas = (v.passed || [])[i];
        if (sol) { const fT = this.found?.get(p.id) ?? -9; a.pose(t - fT < 1.4 ? 'cheer' : 'lean', { t }); a.expr = 'laugh'; a.look = idleLook(0.5); return; }
        if (pas) { a.pose('slump', { t }); a.expr = 'sad'; a.look = mid; return; }
        if ((v.inRound || [])[i]) {
          const hurry = left < 6000;
          const ph = Math.floor(t / 2.6 + i * 0.7) % 4;
          if (hurry) { a.pose(hs(i, v.r) < 0.5 ? 'bite' : 'headgrab', { t }); a.expr = 'tense'; }
          else if (ph === 1) { this.arrangePose(a, t, i); a.expr = 'o'; }
          else { a.pose(ph === 3 ? 'rest' : 'chin', { t }); a.expr = ph === 3 ? 'smile' : 'o'; }
          a.look = Math.floor(t / 2.1 + i) % 4 ? mid : idleLook(0.4);
        } else { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        if (!(v.inRound || [])[i]) { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        const got = (v.gains || [])[i] > 0;
        if (rt < T_WORD) { a.pose(got ? 'lean' : 'clasp', { t }); a.expr = got ? 'grin' : 'tense'; a.look = mid; return; }
        const su = rt - T_WORD;
        if (got && v.first === i) { a.pose(Math.floor(su / 1.1 + i) % 2 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; }
        else if (got) { a.pose(su < 1.4 ? 'clap' : 'lean', { t }); a.expr = 'smile'; }
        else { a.pose(su < 1.4 ? (hs(i, v.r) < 0.5 ? 'facepalm' : 'headgrab') : 'slump', { t }); a.expr = su < 1.4 ? 'wince' : 'sad'; }
        a.look = su < 1.2 ? mid : idleLook(0.3);
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const pl = placeOf(v, i), medal = pl <= 3 && (v.scores || [])[i] > 0;
        if (champ.includes(i) && u > 0.6) { a.pose('cheer', { t }); a.expr = 'laugh'; }
        else if (medal && u > 0.6) { a.pose(Math.floor(u / 1.4 + i) % 2 ? 'clap' : 'cheer', { t }); a.expr = 'laugh'; }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; }
        a.look = idleLook();
        return;
      }
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = idleLook();
    });
  }

  /* ---------- zamanlama, kamera, sesler ---------- */
  revEvents() {
    const v = this.view, rt = this.revT(), Ev = this.ev || (this.ev = {});
    if (!this.rev) return;
    const n = this.rev.ord.filter((x) => x >= 0).length;
    while ((Ev.sort || 0) < n && rt >= T_SORT + (Ev.sort || 0) * SORT_DT + SORT_D * 0.9) { Ev.sort = (Ev.sort || 0) + 1; this.fx('swap', n > 1 ? (Ev.sort - 1) / (n - 1) : 0.5); }
    if (!Ev.word && rt >= T_WORD) { Ev.word = true; this.onWord(); }
    if (!Ev.flip && rt >= T_FLIP) { Ev.flip = true; this.fx('flip'); }
  }
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = this.land();
    const t = this.time, now = this.sNow();
    const ssT = clamp((this.R * Math.min(1, this.kz) - 0.6) / 0.8, 0.75, 1.4);
    this.ssV = this.ssV ? damp(this.ssV, ssT, 3, dt) : ssT;
    this.stepStand(dt);
    // gönderilen deneme yanıtsız kaldıysa (ör. bağlantı) yuvaları boşalt, yeniden denesin
    const I = this.in;
    if (I && I.wait && !I.solved && I.sentAt != null && this.time - I.sentAt > 2.2) { I.wait = false; I.sentAt = null; this.clearSlots(); this.paintInput(); }
    if (v.phase === 'question' && this.rack) {
      const qt = this.qT(), n = v.mix.length;
      if (this.rack.landed < 99) {
        const k = Math.floor((qt - T_POUR - POUR_D) / POUR_DT) + 1;
        while (this.rack.landed < Math.min(n, k)) { this.rack.landed++; this.fx('place'); }
        if (qt > T_POUR + n * POUR_DT + POUR_D) this.rack.landed = 99;
      }
      const left = (v.endsAt || 0) - now;
      if (this.canPlay() && left > 0 && left < 5500) { const s2 = Math.ceil(left / 1000); if (s2 !== this.tickSec) { this.tickSec = s2; this.fx('tick', 0.5); } }
      if (v.amIn && !v.mySolved && !v.myPassed && left <= 0 && !this.upSeen) { this.upSeen = true; this.fx('timeup'); }
    }
    if (v.phase === 'reveal') this.revEvents();
    if (v.phase === 'final' && !this.champFx && t - (this.finT || 0) >= 1.1) {
      this.champFx = true;
      if ((v.champ || []).length) {
        this.fx('champ');
        const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
        this.msg(`🏆 ${nm}`, 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, [[1, 0.85, 0.3], [1, 1, 1], [0.35, 0.95, 0.55]], 2.6, 0.04, false, 2.2, 2.4); });
      }
    }
    // kamera: soruda ıstakaya yakın, açılışta biraz geniş (küçük ıstakalar da görünür)
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 260, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'question' || v.phase === 'reveal') {
      // ıstaka ekranın boş kısmına (dikeyde alt çubuğun üstü; yatayda çubuğun solu ya da üstü) belli bir genişlikte sığsın.
      // Çubuk yüksekliği duruma göre değişse de çerçeve sabit kalır (290 px pay): kamera zıplamaz.
      pa = land ? -0.02 : -0.06; bp = 290;
      H = this.rackW(0, TH * 0.45, 0);
      const wide = v.phase === 'reveal' && this.revT() > T_FLIP - 0.4;
      const vw = this.vw || 390, vh = this.vh || 844, asp = vw / vh, fov = land ? 0.7 : 0.78, top = land ? 56 : 100;
      const fit = (x0, x1, y0, y1) => ({ px: Math.min((x1 - x0) * 0.86, ((y1 - y0) * 0.8) / 0.3, 600), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
      let Fr = fit(0, vw, top, Math.max(top + 120, vh - 290));
      if (land) { const A = fit(0, Math.max(160, this.barL || vw * 0.45), top, vh - 8); if (A.px > Fr.px * 0.92) Fr = A; }
      const px = Fr.px * (wide ? 0.8 : 1);
      const Dw = ((RL + 0.16) * this.ss) / ((px / vw) * 2 * Math.tan(fov / 2) * asp);
      zoom = Dw / Math.max(0.5, this.fitVal || Dw);
      sx = Fr.cx / vw; sy = Fr.cy / vh;
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
    this.calcTiles();
    this.placePts();
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = this.land();
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  cardMs() { return 3400; }
  placePts() {
    const v = this.view;
    const rev = !!v && v.phase === 'reveal' && this.wordUp() && !this.flat;
    for (let i = 0; i < this.ptEl.length; i++) {
      const e = this.ptEl[i];
      if (!e) continue;
      if (!rev) { if (e.classList.contains('go')) e.className = 'hk-pt'; continue; }
      if (!e.classList.contains('go')) continue;
      const a = this.avatarAt(i);
      if (!a || !a.headW) continue;
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
    }
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.hkRack || !v) return;
    const m = this.mats.b, T = this.T, t = this.time;
    const SM = this.standMat();
    M.set(this.sA, 0, R_Y, R_Z, 0, 0, 0, 1); M.mul(m, SM, this.sA); D(Wd.hkRack, m, T.obj);
    // kese: dökerken eğilir
    const qt = this.qT(), pour = v.phase === 'question' && qt >= 0 && qt < T_POUR + (v.mix || []).length * POUR_DT + 0.3 ? Math.sin(Math.PI * clamp(qt / (T_POUR + (v.mix || []).length * POUR_DT + 0.3), 0, 1)) : 0;
    M.set(this.sA, BAG[0], BAG[1], BAG[2], BAG_RY, 0, pour * 1.05, 1); M.mul(m, SM, this.sA); D(Wd.hkBag, m, T.obj);
    // orta taşlar
    if (this.inPlay()) this.tm.forEach((tm, ti) => { if (tm) D(Wd.hkTile, tm, T.obj); });
    // oyuncuların küçük ıstakaları
    if (this.inPlay()) {
      const n = v.mix.length, rt = this.revT();
      this.seats.forEach((p, i) => {
        if (!(v.inRound || [])[i]) return;
        const S = this.seatRackMats(i, this.sD);
        if (!S) return;
        D(Wd.hkSRack, this.sD, T.obj);
        if (shadow) return;
        for (let k = 0; k < n; k++) this.seatTile(i, k, n, rt, this.sB) && D(Wd.hkSTile, this.sB, T.obj);
      });
    }
    // final: birincinin önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const c = Math.cos(a.yaw), s = Math.sin(a.yaw), x = -0.12, z = 0.55;
        const q = [a.pos[0] + x * c + z * s, TABLE_Y + 0.004, a.pos[2] - x * s + z * c];
        const u = clamp((t - (this.finT || 0) - 0.9) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.1 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  // küçük ıstakadaki k. taşın matrisi: soruda dik (sırtı ortaya), açılışta masaya yüzü yukarı yatar
  seatTile(i, k, n, rt, out) {
    const a = this.avatarAt(i);
    if (!a) return false;
    const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
    const x = -(k - (n - 1) / 2) * S_STEP;           // oyuncunun gözünden soldan sağa
    const flip = rt >= T_FLIP ? easeOut((rt - T_FLIP - k * 0.04) / 0.35) : 0;
    const zL = S_ZT + lerp(0, -0.07, flip), yL = lerp(0.018 + S_TH / 2, S_TD / 2 + 0.003, flip) + Math.sin(Math.PI * flip) * 0.05;
    const p = [a.pos[0] + x * c + zL * s, TABLE_Y + yL, a.pos[2] - x * s + zL * c];
    // yüz oyuncuya bakar (hafif geriye yaslı); açılışta yüzü yukarı yatar, harfin üstü masanın ortasına doğru
    M.set(out, p[0], p[1], p[2], a.yaw + Math.PI, lerp(-0.2, -Math.PI / 2, flip), 0, 1);
    return true;
  }
  // dokulu: taş yüzleri (harfler)
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.hkFace || !v || !this.letTex || !this.inPlay()) return;
    if (!this.letOk) { this.letOk = true; try { drawLetters(this.letCv); updateTexture(X, this.letTex, this.letCv); } catch { /* yok */ } }
    gl.bindTexture(gl.TEXTURE_2D, this.letTex);
    gl.uniform1f(X.tex.u.uSelf, 0.42);
    v.mix.forEach((ch, ti) => { const tm = this.tm[ti]; if (tm) drawMesh(X, Wd.hkFace[letterIdx(ch)], tm, this.tileTint(ti)); });
    // açılışta küçük ıstakalarda kelime
    const rt = this.revT();
    if (v.phase === 'reveal' && rt >= T_FLIP && v.word) {
      const w = [...v.word], n = w.length;
      this.seats.forEach((p, i) => {
        if (!(v.inRound || [])[i]) return;
        const got = (v.gains || [])[i] > 0;
        for (let k = 0; k < n; k++) if (this.seatTile(i, k, n, rt, this.sB)) drawMesh(X, Wd.hkSFace[letterIdx(w[k])], this.sB, got ? FOUND3 : DIM3);
      });
    }
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F2, m) {
    const v = this.view;
    if (!v || !this.res) return;
    const t = this.time, ss = this.ss;
    if (this.inPlay()) {
      const n = v.mix.length;
      // bulanların küçük ıstakası yeşil yanar
      this.seats.forEach((p, i) => {
        if (!(v.solved || [])[i] || !(v.inRound || [])[i]) return;
        const a = this.avatarAt(i);
        if (!a) return;
        const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
        const q = [a.pos[0] + S_Z * s, TABLE_Y + 0.06, a.pos[2] + S_Z * c];
        this.glow(m, q, 0.32 + n * 0.02, GREEN3, 0.3 + 0.08 * Math.sin(t * 5 + i));
      });
      // ipucu taşları
      const R = this.rack;
      if (v.phase === 'question' && R && R.lockT) v.mix.forEach((ch, ti) => { if (R.lockT[ti] != null && this.time >= R.lockT[ti] && this.tm[ti]) { const P = this.tilePose(ti); this.glow(m, this.rackW(P[0], P[1], P[2] + 0.04), 0.22 * ss, GREEN3, 0.3); } });
      if (v.phase === 'reveal' && this.wordUp()) {
        const fade = Math.max(0.3, 1 - (t - (this.wordT ?? t)) / 2.5);
        this.glow(m, this.rackW(0, TH * 0.5, 0.08), (n * STEP + 0.2) * ss, GOLD3, 0.25 * fade);
      }
    }
    if (v.phase === 'final') (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (a && a.headW) this.glow(m, [a.headW[0], a.headW[1] + 0.1, a.headW[2]], 0.9, GOLD3, 0.18 + 0.05 * Math.sin(t * 3)); });
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="hk-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="hk-seg" role="group" aria-label="Kelime sayısı"><button data-act="hk-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 8 kelime</button><button data-act="hk-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🏆 Uzun · 15 kelime</button></div>`; }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  head(v) {
    const cat = v.cat || ['🔤', 'Kelime'];
    return `<div class="hk-q"><span class="st">🔤 KELİME ${v.r}/${v.rs}</span><span class="ct">${esc(cat[0])} ${esc(cat[1])}</span><span class="ln">${v.len} harf${v.phase === 'reveal' ? ' · SONUÇ' : ''}</span></div>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost, now = this.sNow();
    if (v.phase === 'question') {
      const left = (v.endsAt || 0) - now;
      const st = v.mySolved ? 's' : v.myPassed ? 'p' : !v.amIn ? 'w' : 'q';
      const z = st === 's' ? `<span class="z g">✅ Buldun! ${sec(v.myMs || 0)} sn${v.myAlt ? ` (${esc(v.myAlt)})` : ''} · diğerleri bekleniyor</span>`
        : st === 'p' ? '<span class="z">🏳️ Pas dedin · diğerleri bekleniyor</span>'
        : v.closing ? '<span class="z">Herkes bitirdi!</span>'
        : left < 6000 ? '<span class="z r">⏳ Süre bitiyor!</span>'
        : (v.hints || []).length ? '<span class="z">💡 Yeşil taş ipucu: yerinde kilitli</span>' : '<span class="z">Taşlara sırayla dokun · yanlışın cezası yok</span>';
      // girdi alanı yalnızca yapı değişince yeniden kurulur (dokunuş kaybolmasın); alt satır ayrıca güncellenir
      key = `q|${v.game}|${v.r}|${st}`;
      const body = st === 'w' ? '<div class="hk-watch">👀 Bu kelimede izliyorsun; sıradakinde sen de oynayacaksın.</div>'
        : `<div class="hk-inp${st === 'p' ? ' off' : ''}"></div>${st === 'q' ? '<div class="hk-bt"><button class="hk-b" data-act="hk-mix">🔀 Karıştır</button><button class="hk-b" data-act="hk-undo" disabled>⌫ Geri al</button><button class="hk-b" data-act="hk-pass">🏳️ Pas</button></div>' : ''}`;
      html = `<div class="hk-box">${this.head(v)}${body}
        <div class="hk-ft"></div>
        ${this.timerBar()}</div>`;
      if (this.setBar(key, html) !== false) { this.ftKey = ''; this.paintInput(); }
      const fk = `${v.found}|${v.total}|${z}`;
      if (fk !== this.ftKey) { const ft = this.el.bar.querySelector('.hk-ft'); if (ft) { this.ftKey = fk; ft.innerHTML = `<span class="n">✅ ${v.found}/${v.total} buldu</span>${z}`; } }
      return;
    }
    if (v.phase === 'reveal') {
      const lnd = this.wordUp();
      const me = v.me, inR = me >= 0 && (v.inRound || [])[me];
      const canNext = lnd && host && now - (v.at || 0) >= (v.nextMinMs || 3000);
      const last = v.r >= v.rs;
      let res;
      if (!lnd) res = '<span class="m">🔤 Taşlar yerine diziliyor…</span>';
      else {
        const word = [...String(v.word || '')];
        const tiles = `<div class="hk-row1" style="--n:${word.length}">${word.map((ch) => this.tileHtml(ch, 'ok', 'disabled')).join('')}</div>`;
        const g = me >= 0 ? (v.gains || [])[me] : 0, ms = me >= 0 ? (v.ms || [])[me] : null;
        let mi;
        if (inR && g > 0) mi = `<em class="g">✅ ${sec(ms || 0)} sn</em><em class="g">+${fmt(g)}</em>${v.first === me ? '<em>⚡ İlk bulan</em>' : ''}`;
        else if (inR) mi = `<em class="r">${(v.passed || [])[me] ? '🏳️ Pas' : '✗ Bulamadın'}</em>`;
        else { const f = v.first; mi = f >= 0 ? `<span>⚡ İlk bulan: ${esc(nm0(v.seats[f]?.n || ''))}</span>` : '<span>Kimse bulamadı</span>'; }
        const alt = (v.alt || []).length ? `<span class="al">${(v.alt || []).map(esc).join(', ')} da doğru sayıldı</span>` : '';
        res = `${tiles}<span class="mi">${mi}</span>${alt}`;
      }
      key = `r|${v.game}|${v.r}|${lnd}|${canNext}`;
      html = `<div class="hk-box">${this.head(v)}
        <div class="hk-res">${res}</div>
        <div class="hk-rk">${lnd ? this.rankLine(v) : '&nbsp;'}</div>
        ${canNext ? `<div class="hk-bt"><button class="hk-b y" data-act="hk-next">${last ? 'Sonuçlara geç 🏁' : 'Sıradaki kelime ▶'}</button></div>` : ''}
        ${this.timerBar()}</div>`;
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
      html = `<div class="card hk-intro">
        <div class="tt">🔤 Harf Karması</div>
        <div class="sub">Keseden harf taşları dökülür, karışık dizilir. Taşları sırayla dizip kelimeyi herkesten önce bul!</div>
        <div class="hk-ru"><div style="background:#e3f1ec"><b>⏱️</b>30 saniye</div><div style="background:#fff3c4"><b>⚡</b>Hızlıya 1.000'e kadar</div><div style="background:#d9ffe4"><b>💡</b>İpucu harfleri</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="hk-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Kategori ipucu baştan görünür. Yanlış dizilişin cezası yok, istediğin kadar dene. Takılırsan ilk harf, uzun kelimelerde son harf de açılır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.fast) aw.push(`<div><b>⚡</b><span>En hızlı<em>${nm(v.fast.i)} · ${esc(v.fast.w)} ${sec(v.fast.ms)} sn</em></span></div>`);
      if (v.firsts) aw.push(`<div><b>🥇</b><span>En çok ilk bulan<em>${nm(v.firsts.i)} · ${v.firsts.n} kez</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤷</b><span>Bu sefer kimse kelime bulamadı!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>✅ ${S[i]?.solved ?? 0} · ⚡ ${S[i]?.first ?? 0} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Kelimeler bitti!</div>
        <div class="sub">${v.rs} kelimede kim daha hızlı dizdi?</div>
        <div class="hk-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="hk-aw">${aw.join('')}</div>` : ''}
        <div class="hk-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="hk-start" ${wait ? 'disabled' : ''}>🔁 Yeni kelimeler</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const TOP = { question: `${v.r}/${v.rs} · ✅ ${v.found ?? 0}/${v.total ?? 0} · ⏱ ${mmss(left)}`, reveal: `${v.r}/${v.rs} · ${this.wordUp() ? `🔤 ${v.word}` : '🔤 diziliyor'}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.hk-tm i');
    const tot = v.phase === 'question' ? v.answerMs || 3e4 : v.phase === 'reveal' ? v.revealMs || 6500 : 0;
    if (tm && tot) {
      const u = clamp(left / tot, 0, 1);
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      if (v.phase === 'question') tm.style.setProperty('--tc', left > 14000 ? '#2fbf71' : left > 6000 ? '#f2b200' : '#ff4f5e');
      else tm.style.setProperty('--tc', '#1f6b45');
    }
    const bx = this.el.bar.firstElementChild;
    const br = bx ? bx.getBoundingClientRect() : null;
    const bh = br ? Math.round(br.height + 28) : 200;
    if (br && br.width > 0) this.barL = br.left;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase !== 'intro') x += `<span class="hk-sc">${fmt(this.dispScore(i))}</span>`;
      if (v.phase === 'question') { if ((v.solved || [])[i]) x += `<span>✅${(v.ord || [])[i] === 1 ? '⚡' : ''}</span>`; else if ((v.passed || [])[i]) x += '<span>🏳️</span>'; }
      if (v.phase === 'reveal' && this.wordUp()) { if (v.first === i) x += '<span>⚡</span>'; else if ((v.gains || [])[i] > 0) x += '<span>✅</span>'; }
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${MEDAL[pl - 1]}</span>`; }
      if (o.hkK !== x) {
        o.hkK = x;
        let el = o.lbl.querySelector('.hk-x');
        if (!el) { el = document.createElement('span'); el.className = 'hk-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.hk-x')) o.hkK = '';
  }

  /* ---------- 2D yedek ---------- */
  flat2() {
    const w = this.vw || 360, h = this.vh || 640, land = w > h * 1.1;
    const top = land ? 70 : 96, bot = land ? h - 12 : Math.max(top + 200, h - (this.barH || 260) - 6);
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
    g.fillStyle = '#120d09'; g.fillRect(0, 0, w, h);
    g.fillStyle = FELT;
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.86, L.r * 0.68, 0, 0, TAU); g.fill();
    g.lineWidth = 5; g.strokeStyle = WOODC; g.stroke();
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
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = '#ffe9c7'; g.fillText(fmt(this.dispScore(i)), x, y + 45); }
      let e = '';
      if (v && v.phase === 'question') e = (v.solved || [])[i] ? '✅' : (v.passed || [])[i] ? '🏳️' : '';
      if (v && v.phase === 'reveal' && this.wordUp()) e = v.first === i ? '⚡' : (v.gains || [])[i] > 0 ? '✅' : '';
      if (e) { g.font = `18px ${EMO_FONT}`; g.fillText(e, x, y); }
    });
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v || !this.inPlay()) {
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `900 ${Math.round(L.r * 0.16)}px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('🔤 Harf Karması', L.cx, L.cy);
      return;
    }
    const n = v.mix.length, tw = Math.min(L.r * 0.26, (L.w * 0.86) / n - 6), th = tw * 1.25, gap = 5;
    const rw = n * (tw + gap) + 16, rx = L.cx - rw / 2, ry = L.cy - th / 2 - 4;
    g.fillStyle = WOODC; rr(g, rx, ry + th - 4, rw, 16, 6); g.fill();
    g.fillStyle = '#4a2c18'; rr(g, rx, ry - 6, rw, th + 6, 8); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
    v.mix.forEach((ch, ti) => {
      const P = this.tilePose(ti);
      if (!P[6]) return;
      const x = L.cx + (P[0] / STEP) * (tw + gap) - tw / 2, y = ry - (P[1] - TY0) * th * 4;
      const tint = this.tileTint(ti);
      g.fillStyle = tint === HINT3 ? '#c9f5dc' : tint === GOLD3 ? '#ffe9a0' : IVORY;
      g.strokeStyle = INK; g.lineWidth = 2;
      rr(g, x, y, tw, th, 6); g.fill(); g.stroke();
      g.fillStyle = INK; g.font = `900 ${Math.round(tw * 0.62)}px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, x + tw / 2, y + th * 0.52);
      if (TP[ch]) { g.fillStyle = '#c21f33'; g.font = `900 ${Math.round(tw * 0.22)}px ${F}`; g.textAlign = 'right'; g.fillText(String(TP[ch]), x + tw - 3, y + th - 7); }
    });
    // kategori ipucu
    const cat = v.cat || ['🔤', 'Kelime'];
    g.font = `800 13px system-ui`; g.textAlign = 'center'; g.fillStyle = '#ffe9c7';
    g.fillText(`${cat[0]} ${cat[1]} · ${n} harf`, L.cx, ry - 18);
    // puan baloncukları
    if (v.phase === 'reveal' && this.wordUp() && this.wordT != null) {
      (v.gains || []).forEach((gn, i) => {
        if (!(gn > 0)) return;
        const u = (this.time - this.wordT) / 2.4;
        if (u > 1) return;
        const [x0, y0] = this.flatPos(i);
        g.globalAlpha = 1 - u * u; g.fillStyle = v.first === i ? '#ffd23f' : '#7dffb0'; g.font = '900 15px system-ui'; g.textAlign = 'center';
        g.fillText(`+${fmt(gn)}`, x0, y0 - 44 - u * 22); g.globalAlpha = 1;
      });
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new LetterGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[hkr]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
