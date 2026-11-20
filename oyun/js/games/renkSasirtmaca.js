// Renk Şaşırtmaca — 3D neon oyun salonu (NFC Dünyası Oyun)
// Masanın ortasında ışıklı bir tabela durur: bir renk adı başka bir renkle yazılır. Herkesin önünde dört renkli atari
// düğmesi var. Normal turda yazının RENGİNE, ters turda YAZIYA basılır; turda tek basış. Önce "hazır" anı (kural görünür,
// ampuller üç kez yanıp söner), sonra kelime çıkar. Basanın konsolundaki lamba yanar (rengi açılışa kadar gizli).
// Açılışta herkesin bastığı düğme renkli yanar, doğrular yeşil, yanlışlar kırmızı halkayla parlar; tabelanın ampulleri
// doğru renkte yanıp söner. Masa kiti (masa3d.js) ile çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-20-a';
import * as sfx from '../sfx.js?v=2026-11-20-a';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, drawMesh, makeTexture, updateTexture } = E;
void sfx;

// renkler (sunucuyla aynı sıra): ad, renk, tabelada yazılışı
const COLS = [['Kırmızı', '#FF4D4D', 'KIRMIZI'], ['Mavi', '#4D8DFF', 'MAVİ'], ['Yeşil', '#3DDC97', 'YEŞİL'], ['Sarı', '#FFD23F', 'SARI']];
const hex3 = (h) => new Float32Array([parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]);
const COL3 = COLS.map((c) => hex3(c[1]));
const WHITE3 = new Float32Array([1, 1, 1]), OFF3 = new Float32Array([0.16, 0.14, 0.22]), DIM3 = new Float32Array([0.42, 0.4, 0.5]);
const GREEN3 = new Float32Array([0.3, 1, 0.55]), RED3 = new Float32Array([1, 0.22, 0.25]), GOLD3 = new Float32Array([1, 0.82, 0.3]), PINK3 = new Float32Array([1, 0.3, 0.7]);
const INK = '#1c1633', FELT = '#1e1a33', TRIM = '#2e2850', PINK = '#ff3fa4';
const KEYS = { 1: 0, 2: 1, 3: 2, 4: 3, k: 0, m: 1, y: 2, s: 3 };
// tabela uzayı: kürsü (masa ortası, kameraya dönük) içinde; tabela geriye yaslı, x sağ, y yukarı (yaslı düzlemde), k dışarı
const SIGN_TILT = 0.8, SY = 0.3, SZ = 0.02;                           // yaslılık; tabela merkezinin yüksekliği ve yeri
const CT = Math.cos(SIGN_TILT), ST = Math.sin(SIGN_TILT);
const S_UP = [0, CT, -ST], S_N = [0, ST, CT];
const FW = 0.585, FH = 0.2925;                                         // ön yüzün yarı genişliği/yüksekliği (2:1)
const STRIP = [0.48, 0.375, 0.495];                                    // şerit: yarı genişlik, alt, üst (y)
// konsol (koltuk uzayı: +z masanın ortasına, +x oyuncunun solu): düğmeler oyuncunun gözünden soldan sağa K, M, Y, S
const CZ = 0.5, DOME_X = [0.18, 0.06, -0.06, -0.18], DOME_Y = 0.068;
const EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const NEON_L = { sunC: [0.42, 0.38, 0.55], sky: [0.36, 0.32, 0.5], gnd: [0.14, 0.11, 0.2], night: 1, warm: [0.9, 0.84, 1], lampC: [1.5, 1.38, 1.62], fogR: [30, 90], stars: 0, glowS: 0.45 };

const STYLE = `
#ky.rnk .msg{top:12%}
#ky.rnk .rs-box{width:min(520px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fffaf0;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.rnk .rs-q{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:900;letter-spacing:.05em}
#ky.rnk .rs-q .st{background:#2a2540;color:#fff;border-radius:99px;padding:1px 9px}
#ky.rnk .rs-q .rl{border-radius:99px;padding:1px 10px;font-size:13px;letter-spacing:.02em;background:#e9e4ff;color:#2a2540}
#ky.rnk .rs-q .rl.y{background:#ff3fa4;color:#fff}
#ky.rnk .rs-q .rl.y.bl{animation:rsbl .45s steps(2) 4}
@keyframes rsbl{50%{background:#1c1633}}
#ky.rnk .rs-w{position:relative;margin-top:8px;border-radius:16px;background:#0d0b16;border:3px solid #1c1633;height:clamp(60px,9.5vh,86px);display:grid;place-items:center;padding:4px 8px;box-shadow:inset 0 0 0 3px #2a2540;overflow:hidden}
#ky.rnk .rs-w b{font:900 clamp(36px,11vw,58px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;letter-spacing:.05em;text-shadow:0 0 16px currentColor}
#ky.rnk .rs-w b.pop{animation:rspop .22s ease-out}
@keyframes rspop{0%{transform:scale(.6);opacity:.2}100%{transform:scale(1);opacity:1}}
#ky.rnk .rs-w .rd{color:#fff;font:900 clamp(19px,5.4vw,26px)/1.1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;letter-spacing:.03em}
#ky.rnk .rs-w .rd small{display:block;font-size:11px;opacity:.6;letter-spacing:.16em;margin-bottom:4px}
#ky.rnk .rs-w.y .rd{color:#ff8fcf}
#ky.rnk .rs-w.rv{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
#ky.rnk .rs-w.rv b{font-size:clamp(26px,8vw,40px)}
#ky.rnk .rs-w .ok{display:inline-flex;align-items:center;gap:5px;font:900 13px/1 system-ui,sans-serif;color:#fff;letter-spacing:.04em}
#ky.rnk .rs-w .ok u{text-decoration:none;font:900 clamp(15px,4.4vw,19px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#1c1633;background:var(--cc);border:2px solid #fff;border-radius:10px;padding:4px 9px;letter-spacing:.03em}
#ky.rnk .rs-bs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
#ky.rnk .rs-bt{position:relative;border:3px solid #1c1633;border-radius:16px;box-shadow:0 5px 0 #1c1633;padding:0;height:clamp(50px,8.4vh,70px);background:var(--bc);color:#1c1633;font:900 clamp(17px,4.9vw,21px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;letter-spacing:.03em;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none;transition:opacity .15s,filter .15s}
#ky.rnk .rs-bt:active:not([disabled]){transform:translateY(4px);box-shadow:0 1px 0 #1c1633}
#ky.rnk .rs-bt i{position:absolute;left:9px;top:6px;font-style:normal;font-size:11px;font-weight:800;opacity:.5}
#ky.rnk .rs-bt[disabled]{cursor:default}
#ky.rnk .rs-bt.wait{opacity:.45;filter:saturate(.55)}
#ky.rnk .rs-bt.off{opacity:.3;filter:saturate(.35)}
#ky.rnk .rs-bt.me{transform:translateY(4px);box-shadow:0 1px 0 #1c1633,0 0 0 4px #fff,0 0 0 7px #1c1633}
#ky.rnk .rs-bt.ok{box-shadow:0 5px 0 #1c1633,0 0 0 4px #fff,0 0 0 7px #0d9a52;opacity:1;filter:none}
#ky.rnk .rs-bt.bad{box-shadow:0 1px 0 #1c1633,0 0 0 4px #fff,0 0 0 7px #e0263c;transform:translateY(4px)}
#ky.rnk .rs-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:9px;font-size:12.5px;font-weight:800;min-height:22px}
#ky.rnk .rs-ft .n{background:#1c1633;color:#fff;border-radius:99px;padding:2px 9px}
#ky.rnk .rs-ft .z{opacity:.85}
#ky.rnk .rs-ft .z.g{color:#0d7a3e;opacity:1}
#ky.rnk .rs-ft .z.r{color:#c21f33;opacity:1}
#ky.rnk .rs-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.rnk .rs-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:background .3s}
#ky.rnk .rs-res{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:8px;font-weight:900;font-size:clamp(15px,4.4vw,19px)}
#ky.rnk .rs-res .mi{font-size:13.5px;font-weight:800;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
#ky.rnk .rs-res .mi em{font-style:normal;font-weight:900;border-radius:99px;padding:1px 9px;background:#ecebf5}
#ky.rnk .rs-res .mi em.g{background:#c9f5dc;color:#0d6b3a}
#ky.rnk .rs-res .mi em.r{background:#ffe1df;color:#a11426}
#ky.rnk .rs-res .why{font-size:12px;font-weight:800;opacity:.78}
#ky.rnk .rs-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:7px;font-size:12px;font-weight:800;min-height:20px}
#ky.rnk .rs-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.rnk .rs-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.rnk .rs-rk span.me{background:#fff4c2}
#ky.rnk .lbl .rs-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.rnk .lbl .rs-x:empty{display:none}
#ky.rnk .lbl .rs-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#1c1633;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.rnk .lbl .rs-sc.neg{background:#a11426}
#ky.rnk .rs-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.rnk .rs-pt.f{color:#ffd23f}
#ky.rnk .rs-pt.r{color:#ff6b78}
#ky.rnk .rs-pt.go{animation:rspt 2.2s ease-out forwards}
@keyframes rspt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.rnk .card .rs-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.rnk .card .rs-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.rnk .card .rs-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.rnk .card .rs-demo{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;border-radius:14px;background:#0d0b16;border:3px solid var(--ink);padding:8px 10px;color:#fff;font-weight:800;font-size:12.5px}
#ky.rnk .card .rs-demo b{font:900 26px/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;letter-spacing:.05em;color:#4D8DFF;text-shadow:0 0 10px currentColor}
#ky.rnk .card .rs-demo span{text-align:left;line-height:1.3}
#ky.rnk .card .rs-demo em{font-style:normal;font-weight:900;border-radius:7px;padding:0 5px;color:#1c1633}
#ky.rnk .card .rs-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.rnk .card .rs-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.rnk .card .rs-seg button.on{background:var(--ink);color:#fff}
#ky.rnk .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.rnk .card .rs-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.rnk .card .rs-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.rnk .card .rs-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.rnk .card .rs-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.rnk .card .rs-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.rnk .card .rs-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.rnk .card .rs-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.rnk .card .rs-aw div:only-child{grid-column:1/-1}
#ky.rnk .card .rs-aw div b{font-size:18px;flex:0 0 auto}
#ky.rnk .card .rs-aw div span{flex:1;min-width:0;font-size:12px}
#ky.rnk .card .rs-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.rnk .card .rs-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.rnk .card .rs-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.rnk .card .rs-tb>div.me{background:#fff4c2}
#ky.rnk .card .rs-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.rnk .card .rs-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.rnk .card .rs-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.rnk .card .rs-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.rnk .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.rnk .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.rnk .rs-box{width:min(440px,52vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.rnk .rs-w{height:62px;margin-top:6px}
#ky.rnk .rs-w b{font-size:40px}
#ky.rnk .rs-bs{margin-top:7px;gap:6px}
#ky.rnk .rs-bt{height:50px;font-size:17px}
#ky.rnk .rs-ft{margin-top:6px}
#ky.rnk .rs-tm{margin-top:5px}
#ky.rnk .card .rs-ru{margin-top:6px}#ky.rnk .card .rs-ru div{font-size:11px;padding:2px 3px 3px}#ky.rnk .card .rs-ru div b{font-size:17px}
#ky.rnk .card .rs-demo{margin-top:6px;padding:3px 8px;gap:8px;font-size:11.5px}#ky.rnk .card .rs-demo b{font-size:21px}#ky.rnk .card .rs-demo span{line-height:1.22}
#ky.rnk .card.rs-intro{max-height:calc(100vh - 60px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.rnk .panel.low .card.rs-intro{max-width:min(440px,56vw)}
#ky.rnk .card.rs-intro{padding:10px 13px}#ky.rnk .card.rs-intro .sub{line-height:1.3}#ky.rnk .card.rs-intro .rs-seg button{padding:5px 4px}
#ky.rnk .card .rs-ru div{display:flex;align-items:center;justify-content:center;gap:5px;padding:4px 5px;text-align:left}#ky.rnk .card .rs-ru div b{flex:0 0 auto;font-size:17px}
#ky.rnk .card .rs-demo br{display:none}
#ky.rnk .card.rs-intro .hint{margin-top:5px;font-size:11.5px;line-height:1.3}
#ky.rnk .card .rs-seg{margin-top:6px}#ky.rnk .card .rs-seg button{padding:6px 4px}
#ky.rnk .card .rs-pod{display:none}
#ky.rnk .card .rs-aw{margin-top:6px}
#ky.rnk .card .rs-tb{max-height:24vh}
#ky.rnk .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.rnk .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, final): atari salonu funk'ı (La dorian, 116 bpm): dörtlük davul, el çırpma, slap bas, elektrik piyano,
// parlak marimba nakaratı. 'race' (oyun): hızlı ve gergin (La minör, 128 bpm): nabız gibi oktav bas, on altılık zil,
// kısa synth vuruşları, alçak dem.
class RsSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.2; }
  tempo() { return this.mode === 'race' ? 128 : 116; }
  swing() { return this.mode === 'race' ? 0.02 : 0.14; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const on = s % 2 === 0;
    if (this.mode === 'race') {
      if (s % 4 === 0) this.iKick(t, 0.07, 140, 46, 0.18);
      if (s === 4 || s === 12) this.iClap(t, 0.04);
      if (s % 2 === 1) this.iHat(t, 0.016);
      if (s % 4 === 2) this.iHat(t, 0.02, true);
      // nabız gibi oktav bas: A A A G | F F G G
      const BS = [45, 45, 45, 43, 41, 41, 43, 43];
      const root = BS[(bar % 4) * 2 + (s >= 8 ? 1 : 0)];
      if (on) this.iBass(t, s % 4 === 2 ? root + 12 : root, st * 1.6, 0.06, 'saw', 520);
      if (s === 0) this.iPad(t, [root + 12, root + 19, root + 24], spb * 5, 0.018, 1100, 0.3);
      // kısa synth vuruşları (iki ölçüde bir)
      if (bar % 2 === 1 && (s === 6 || s === 14)) [69, 72, 76].forEach((m, k) => this.iPluck(t + k * 0.004, m, 0.022, 0.18, 'square', 2200, 0.2));
      if (bar % 4 === 3 && s >= 12) this.iTick(t, 0.012 + (s - 12) * 0.004);
      return;
    }
    if (s % 4 === 0) this.iKick(t, 0.08, 150, 48, 0.2);
    if (s === 4 || s === 12) this.iClap(t, 0.055);
    if (s % 4 === 2) this.iHat(t, 0.024, true);
    else if (!on) this.iHat(t, 0.012);
    // akorlar: Am7 – D7 – Am7 – Em7
    const CH = [[45, [57, 60, 64, 67]], [50, [57, 60, 62, 66]], [45, [57, 60, 64, 67]], [40, [55, 59, 62, 64]]];
    const [root, ch] = CH[bar % 4];
    // slap bas
    const BL = [0, null, 12, null, null, 0, null, 10, 0, null, 12, 7, null, 0, 3, null];
    if (BL[s] != null) this.iBass(t, root - 12 + BL[s], st * 0.9, 0.07, 'saw', 900);
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 5, 0.014, 1000, 0.3);
    if (s === 2 || s === 7 || s === 10) ch.forEach((m, k) => this.iEP(t + k * 0.003, m, 0.016, st * 1.6, 0.18));
    // marimba nakaratı
    const MEL = [[76, null, 79, 81, null, 79, 76, null], [74, null, 76, 78, null, 76, 74, 72], [76, null, 79, 81, 84, null, 81, null], [79, 76, null, 74, 71, null, 74, null]];
    const m = MEL[bar % 4][s >> 1];
    if (on && m != null) { if (bar % 8 < 4) this.iMarimba(t, m, 0.05, 0.15); else this.iVibe(t, m, 0.03, 0.9, 0.25); }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    const beep = (tt, f, d = 0.09, v = 0.06, type = 'square') => this.tone(f, tt, d, type, v, null, 0.003);
    switch (name) {
      case 'ready': beep(t, 660, 0.08, 0.05); break;                       // hazır: kısa bip
      case 'go': beep(t, 1320, 0.16, 0.06); beep(t, 1320 * 1.5, 0.12, 0.03, 'triangle'); break;
      case 'press': // atari düğmesi: tok tık
        this.iWood(t, 0.12, 900); this.tone(180, t, 0.05, 'sine', 0.08, 90, 0.002);
        break;
      case 'peer': this.iWood(t, 0.04, 700 + Math.random() * 200); break;
      case 'right': [[76, 0], [83, 0.07]].forEach(([m, d]) => this.iBell(t + d, m, 0.05, 0.6, 0.25)); break;
      case 'wrong': this.tone(140, t, 0.32, 'sawtooth', 0.05, 110, 0.005); this.tone(147, t, 0.32, 'square', 0.03, 116, 0.005); break;
      case 'miss': this.tone(392, t, 0.14, 'triangle', 0.05, 370, 0.01); this.tone(330, t + 0.15, 0.3, 'triangle', 0.05, 262, 0.01); break;
      case 'first': super._fx('kaching'); this.cheer(t + 0.1, 1.1); break;
      case 'streak': [72, 76, 79, 84, 88].forEach((m, k) => this.iPluck(t + k * 0.045, m, 0.035, 0.25, 'triangle', 4000, 0.3)); break;
      case 'flip': this.noise(t, 0.16, 0.035, { type: 'bandpass', freq: 1800, to: 5200, q: 1.1, attack: 0.01 }); break;
      case 'timeup': this.tone(220, t, 0.35, 'square', 0.045, null, 0.004); this.tone(277, t, 0.35, 'square', 0.03, null, 0.004); break;
      case 'champ':
        this.duck(0.15, 3);
        [[69, 0, 0.14], [73, 0.15, 0.14], [76, 0.3, 0.14], [81, 0.45, 0.8]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.07, 0.15); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.045); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
const CHROME = () => C('#2a2738', -0.82), CHROME_L = () => C('#4a4562', -0.85), BLACK = () => C('#08070d', 0);
// kürsü (kürsü uzayı): yuvarlak taban ve tabelanın arkasına uzanan ayak
function pedestalModel(mb) {
  mb.cyl(0, 0, 0, 0.24, 0.028, 0.22, 28, CHROME(), CHROME_L());
  mb.cyl(0, 0.028, -0.02, 0.06, 0.05, 0.05, 18, CHROME_L(), CHROME_L());
  // tabelanın sırtına giden kol (tabela uzayında sırt merkezi: k = -0.06)
  const by = SY - 0.06 * ST - 0.02, bz = SZ - 0.06 * CT;
  mb.cyl(0, 0.05, bz, 0.026, by, 0.026, 12, CHROME(), CHROME());
}
// tabela (tabela uzayı: merkez orijin, ön yüz k = 0)
function signModel(mb) {
  mb.rbox(-0.68, -0.34, -0.06, 0.68, 0.34, 0, 0.035, CHROME(), 2);
  mb.rbox(-FW - 0.01, -FH - 0.01, -0.012, FW + 0.01, FH + 0.01, 0.003, 0.01, BLACK(), 1);
  // şerit ve ona giden iki kol
  mb.rbox(-STRIP[0] - 0.025, STRIP[1] - 0.025, -0.05, STRIP[0] + 0.025, STRIP[2] + 0.025, 0, 0.02, CHROME(), 1);
  mb.rbox(-STRIP[0] - 0.006, STRIP[1] - 0.006, -0.012, STRIP[0] + 0.006, STRIP[2] + 0.006, 0.003, 0.006, BLACK(), 1);
  for (const x of [-0.32, 0.32]) mb.rbox(x - 0.025, 0.32, -0.045, x + 0.025, STRIP[1], -0.015, 0.008, CHROME_L(), 1);
  // arka kapak ve kol bağlantısı
  mb.rbox(-0.1, -0.12, -0.085, 0.1, 0.06, -0.055, 0.015, CHROME_L(), 1);
}
// ampul (yayan: çizim rengiyle boyanır)
function bulbModel(mb) { mb.sphereS(0, 0, 0, 0.017, 0.017, 0.012, C('#ffffff', 0.95), 10, 6); }
// atari konsolu (koltuk uzayı): gövde, üst plaka, dört düğme, arka lamba yuvası
function consoleModel(mb) {
  const body = C('#2b2642', -0.55), top = C('#3d3660', -0.72), rim = C('#121018', -0.3);
  mb.rbox(-0.26, 0, -0.085, 0.26, 0.05, 0.085, 0.024, body, 2);
  mb.rbox(-0.245, 0.05, -0.072, 0.245, 0.057, 0.072, 0.01, top, 1);
  DOME_X.forEach((x, k) => {
    mb.cyl(x, 0.055, 0, 0.05, 0.066, 0.05, 18, rim, rim);
    mb.sphereS(x, 0.064, 0, 0.041, 0.03, 0.041, C(COLS[k][1], -0.75), 16, 8);
  });
  mb.cyl(0, 0.05, 0.062, 0.017, 0.06, 0.017, 10, rim, rim);
}
// yanan düğme ve lamba (yayan)
function domeLitModel(mb) { mb.sphereS(0, 0.064, 0, 0.043, 0.033, 0.043, C('#ffffff', 0.92), 16, 8); }
function lampLitModel(mb) { mb.sphereS(0, 0.064, 0, 0.016, 0.014, 0.016, C('#ffffff', 0.95), 10, 6); }

/* ============================ tabela dokusu ============================ */
// 1024×640: üstte şerit (0–128), altta ön yüz (128–640). Karanlık LED zemin, ışıltılı yazı.
let dotPat = null;
function dotsFill(g, x, y, w, h) {
  if (!dotPat) {
    const c = document.createElement('canvas'); c.width = c.height = 10;
    const q = c.getContext('2d');
    q.fillStyle = 'rgba(255,255,255,0.045)'; q.beginPath(); q.arc(5, 5, 2.2, 0, TAU); q.fill();
    dotPat = g.createPattern(c, 'repeat');
  }
  g.fillStyle = dotPat; g.fillRect(x, y, w, h);
}
function glowText(g, text, cx, cy, maxW, size, col, glow = 26) {
  g.font = `900 ${size}px ${F}`;
  const w = g.measureText(text).width;
  const s = w > maxW ? maxW / w : 1;
  g.save();
  g.translate(cx, cy); g.scale(s, s);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (glow) { g.shadowColor = col; g.shadowBlur = glow; g.fillStyle = col; g.fillText(text, 0, 0); g.shadowBlur = glow * 0.4; g.fillText(text, 0, 0); }
  g.shadowBlur = 0; g.fillStyle = col; g.fillText(text, 0, 0);
  g.restore();
}
function rainbowText(g, text, cx, cy, maxW, size, off = 0) {
  g.font = `900 ${size}px ${F}`;
  const L = [...text];
  const ws = L.map((ch) => g.measureText(ch).width);
  const tw = ws.reduce((a, b) => a + b, 0) + (L.length - 1) * size * 0.04;
  const s = tw > maxW ? maxW / tw : 1;
  g.save(); g.translate(cx, cy); g.scale(s, s);
  let x = -tw / 2;
  L.forEach((ch, k) => {
    if (ch !== ' ') { const col = COLS[(k + off) % 4][1]; g.textAlign = 'left'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 22; g.fillStyle = col; g.fillText(ch, x, 0); g.shadowBlur = 0; g.fillText(ch, x, 0); }
    x += ws[k] + size * 0.04;
  });
  g.restore();
}
function drawSign(cv, S) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 1024, 640);
  g.fillStyle = S.stripBg || '#0b0a12'; g.fillRect(0, 0, 1024, 128);
  dotsFill(g, 0, 0, 1024, 128);
  if (S.strip) glowText(g, S.strip, 512, 68, 960, 76, S.stripCol || '#ffffff', 16);
  g.fillStyle = '#07060c'; g.fillRect(0, 128, 1024, 512);
  dotsFill(g, 0, 128, 1024, 512);
  if (S.rainbow) S.rainbow.forEach(([t, y, size], k) => rainbowText(g, t, 512, 128 + y, 960, size, k * 2));
  if (S.lines) S.lines.forEach(([t, col, size, y, glow]) => glowText(g, t, 512, 128 + y, 950, size, col, glow ?? 34));
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const sgn = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
const sec = (ms) => (ms / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };
const MEDAL = ['🥇', '🥈', '🥉'];
const ruleTxt = (rule) => (rule === 'yazi' ? 'YAZIYA BAS' : 'RENGİNE BAS');

/* ============================ oyun ============================ */
class ColorGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'rnk', cls: 'rnk', title: 'Renk Şaşırtmaca', sub: 'Oyun salonu', emoji: '🌈', css: STYLE, snd: new RsSnd(), amb: 'diner', ambVol: 0.32, botPx: 260, botPxL: 34, cloth: FELT, trim: TRIM, tea: false, place: false, chairPad: '#5b2a86', lampHex: '#2a2340', light: NEON_L, fog: '#0c0916', roomStyle: { wall: '#2a1d45', wood: '#1d1729', curtain: '#5b2a86' } });
    this.ptEl = [];
    this.sYaw = 0;
    this.sM = M.make(); this.sA = M.make(); this.sB = M.make(); this.sC = M.make();
    this.pressT = new Map();     // oyuncu kimliği → bastığı an (animasyon)
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.rsPed = this.mk(pedestalModel);
    W.rsSign = this.mk(signModel);
    W.rsBulb = this.mk(bulbModel);
    W.rsCon = this.mk(consoleModel);
    W.rsDome = this.mk(domeLitModel);
    W.rsLamp = this.mk(lampLitModel);
    W.rsFace = this.mk((tb) => tb.tquad([-FW, -FH, 0.0045], [FW, -FH, 0.0045], [FW, FH, 0.0045], [-FW, FH, 0.0045], 0, 128 / 640, 1, 1, [0, 0, -1]), 'tex');
    W.rsStrip = this.mk((tb) => tb.tquad([-STRIP[0], STRIP[1], 0.0045], [STRIP[0], STRIP[1], 0.0045], [STRIP[0], STRIP[2], 0.0045], [-STRIP[0], STRIP[2], 0.0045], 0, 0, 1, 128 / 640, [0, 0, -1]), 'tex');
    W.trophy = this.mk(K.trophyModel);
    // ampuller: çevre boyunca saat yönünde (üst sol → üst sağ → sağ → alt → sol)
    const B = [];
    const NX = 12, NY = 5, xs = 0.62, yr = 0.318, xr = 0.636;
    for (let k = 0; k < NX; k++) B.push([-xs + (2 * xs * k) / (NX - 1), yr]);
    for (let k = 1; k <= NY; k++) B.push([xr, yr - (2 * yr * k) / (NY + 1)]);
    for (let k = NX - 1; k >= 0; k--) B.push([-xs + (2 * xs * k) / (NX - 1), -yr]);
    for (let k = NY; k >= 1; k--) B.push([-xr, yr - (2 * yr * k) / (NY + 1)]);
    this.bulbs = B;
    const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
    this.signCv = c; this.signKey = ''; drawSign(c, this.signState()); this.signTex = makeTexture(this.X, c);
    this.fontOk = false;
    try { document.fonts?.ready?.then(() => { if (!this.dead) { this.fontOk = true; this.signKey = ''; } }); } catch { /* yok */ }
  }
  freeTex() {
    const gl = this.X && this.X.gl;
    if (gl && this.signTex) gl.deleteTexture(this.signTex);
    this.signTex = null;
  }
  onDispose() {
    this.ptEl.forEach((e) => e && e.remove()); this.ptEl = [];
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
  }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  inRound() { const v = this.view; return !!v && (v.phase === 'ready' || v.phase === 'question' || v.phase === 'reveal'); }
  phT() { const v = this.view; return v ? (this.sNow() - (v.phase === 'question' ? v.goAt || v.at : v.at || 0)) / 1000 : 0; }
  revT() { const v = this.view; return v && v.phase === 'reveal' ? (this.sNow() - (v.at || 0)) / 1000 : -1; }
  land() { return (this.vw || 1) > (this.vh || 1) * 1.1; }
  get ss() { return this.ssV || 1; }

  /* ---------- basış ---------- */
  // turda tek basış: sunucudan gelen basışım ya da bu tura ait yerel dokunuşum varsa kapalı (yavaş cihazda oyun saati
  // kısıtlı ilerlediği için zaman sınırına bağlı değil)
  canPress() { const v = this.view; return !!v && v.phase === 'question' && v.amIn && !v.closing && v.myPick == null && !this.myTapOk() && this.sNow() < (v.endsAt || 0); }
  press(i) {
    if (!this.canPress() || !(i >= 0 && i < 4)) return;
    const v = this.view;
    this.myTap = { key: `${v.game}|${v.r}`, i, ms: this.sNow() - (v.goAt || 0) };
    this.ctx.send('pick', { i });
    const me = v.seats && v.seats[v.me];
    if (me) this.pressT.set(me.id, this.time);
    this.fx('press'); vibrate(12);
    this.bar(true);
  }
  myPick() {
    const v = this.view;
    if (!v) return null;
    if (v.myPick != null) return v.myPick;
    const T = this.myTap;
    return T && T.key === `${v.game}|${v.r}` && v.phase === 'question' ? T.i : null;
  }
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'rs-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'rs-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'rs-pick') this.press(+b.dataset.i);
    };
    // dokunmatikte basışı parmak değdiği an al (click'in gecikmesini bekleme)
    const onDown = (e) => {
      const b = e.target.closest('[data-act=rs-pick]');
      if (!b || b.disabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      this.press(+b.dataset.i);
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.bar.addEventListener('pointerdown', onDown);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const tg = e.target && e.target.tagName;
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg)) return;
      const k = String(e.key || '').toLocaleLowerCase('tr-TR');
      if (k in KEYS && this.canPress()) { e.preventDefault(); this.press(KEYS[k]); }
    };
    window.addEventListener('keydown', this.onKey);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.rnk !== '1') { root.dataset.rnk = '1'; root.innerHTML = '<p class="py-16 text-center">🌈</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.r || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'question' && prev && prev.phase === 'question' && prev.r === v.r && Array.isArray(prev.answered)) {
      (v.seats || []).forEach((p, i) => {
        if (!(v.answered || [])[i] || (prev.answered || [])[i] || this.pressT.has(p.id)) return;
        this.pressT.set(p.id, this.time);
        if (i !== v.me) this.fx('peer');
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const mus = (m) => { try { this.snd.music(m); } catch { /* yok */ } };
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'ready') {
      mus('race');
      this.pressT = new Map();
      this.myTap = null;
      const fresh = this.sNow() - (v.at || 0) < 600;
      this.beeps = fresh ? 0 : 9;
      if (fresh && v.rule === 'yazi') this.msg('🔄 TERS TUR: YAZIYA BAS!', 'big');
      else if (fresh && v.r === 1) this.msg('🎨 YAZININ RENGİNE BAS', 'mid');
    }
    if (v.phase === 'question') {
      mus('race');
      if (!prev || prev.phase !== 'question') this.pressT = new Map((v.seats || []).filter((p, i) => (v.answered || [])[i]).map((p) => [p.id, -9]));
      if (this.sNow() - (v.goAt || 0) < 700) { this.fx('go'); this.fx('flip'); }
      this.upSeen = false;
      this.wordPop = true;
    }
    if (v.phase === 'reveal') {
      mus('race');
      const late = this.sNow() - (v.at || 0) > 900;
      this.revAt = this.time - (late ? 9 : 0);
      if (!late) this.onReveal(v);
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.champFx = late;
      if (!late) this.msg('🏁 OYUN BİTTİ', 'big');
    }
  }
  onReveal(v) {
    const me = v.me, inR = me >= 0 && (v.inRound || [])[me];
    const g = me >= 0 ? (v.gains || [])[me] || 0 : 0, pk = me >= 0 ? (v.picks || [])[me] : null;
    const later = (n, ms) => setTimeout(() => { if (!this.dead) this.fx(n); }, ms);
    this.fx('flip');
    if (inR) {
      if (pk == null) { later('miss', 120); }
      else if (g > 0) {
        this.fx('right'); vibrate(15);
        if (v.first === me) { later('first', 200); this.msg('⚡ EN HIZLI SENSİN!', 'mid'); }
        const st = (v.streak || [])[me] || 0;
        if (st >= 3) { later('streak', 420); if (v.first !== me) this.msg(`🔥 ${st} DOĞRU ÜST ÜSTE!`, 'mid'); }
      } else { this.fx('wrong'); vibrate([30, 40, 30]); }
    }
    (v.gains || []).forEach((gn, i) => {
      if (!(v.inRound || [])[i] || (v.picks || [])[i] == null) return;
      const e = this.ptBox(i);
      e.className = gn < 0 ? 'rs-pt r' : v.first === i ? 'rs-pt f' : 'rs-pt';
      e.textContent = `${sgn(gn)}${v.first === i ? ' ⚡' : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
    });
    if (this.X) {
      const c = this.signW(0, 0, 0.05);
      this.burst(c[0], c[1], c[2], 24, [Array.from(COL3[v.c]), [1, 1, 1]], 1.4, 0.03, false, 1.2, 2.2);
    }
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'rs-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- kürsü ve tabela uzayı ---------- */
  stepStand(dt) {
    const c = this.cam;
    const yaw = Math.atan2(c.ex - c.tx, c.ez - c.tz);
    this.sYaw += angDiff(yaw, this.sYaw) * (1 - Math.exp(-4 * dt));
  }
  standW(x, y, z) {
    const s = this.ss, c = Math.cos(this.sYaw), sn = Math.sin(this.sYaw);
    return [(x * c + z * sn) * s, TABLE_Y + y * s, (-x * sn + z * c) * s];
  }
  // tabela yüzündeki nokta (x, y yaslı düzlemde, k dışarı) → dünya
  signW(x, y, k = 0) { return this.standW(x, SY + S_UP[1] * y + S_N[1] * k, SZ + S_UP[2] * y + S_N[2] * k); }
  standMat() { return M.set(this.sM, 0, TABLE_Y + 0.002, 0, this.sYaw, 0, 0, this.ss); }
  signMat(out) { M.set(this.sA, 0, SY, SZ, 0, -SIGN_TILT, 0, 1); return M.mul(out, this.standMat(), this.sA); }
  // koltuk uzayındaki nokta → dünya
  seatW(a, x, y, z) {
    const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
    return [a.pos[0] + x * c + z * s, TABLE_Y + y, a.pos[2] - x * s + z * c];
  }
  conMat(a, out, x = 0, z = 0) { const p = this.seatW(a, x, 0.002, CZ + z); return M.set(out, p[0], p[1], p[2], a.yaw, 0, 0, 1); }

  /* ---------- karakterler ---------- */
  // düğmelerin üstünde bekleyen eller (gergin); down: basış (0–1), x: basılan düğme
  hoverPose(a, t, i, down = 0, x = null) {
    a.pose('rest', { t });
    a.k = down > 0 ? 24 : 12;
    const j = Math.sin(t * 8.5 + i * 1.3) * 0.006;
    const zH = CZ - 0.04, yH = 0.9 + j;
    a.tgt.hand[1] = [0.13, yH, zH];
    a.tgt.hand[0] = [-0.13, yH + Math.sin(t * 7.1 + i) * 0.005, zH];
    if (x != null) {
      const h = x > 0 ? 1 : 0;
      a.tgt.hand[h] = [x, lerp(yH, TABLE_Y + 0.105, down), lerp(zH, CZ - 0.01, down)];
    }
    a.tgt.fdir[0] = [0.05, -0.55, 1]; a.tgt.fdir[1] = [-0.05, -0.55, 1];
    a.tgt.palm[0] = [0, -1, 0]; a.tgt.palm[1] = [0, -1, 0];
    a.tgt.fw[0] = a.tgt.fw[1] = 1;
    a.tgt.pole[1] = [0.9, -0.5, -0.2]; a.tgt.pole[0] = [-0.9, -0.5, -0.2];
    a.shape = [x != null && x <= 0 && down > 0.3 ? 'fist' : 'relax', x != null && x > 0 && down > 0.3 ? 'fist' : 'relax'];
  }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const mid = this.signW(0, 0, 0);
    const champ = v.phase === 'final' ? v.champ || [] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.handK = null;
      const idle = a.rsI || (a.rsI = { lt: 0, look: null });
      const idleLook = (pC = 0.25) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const L = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = L.length && Math.random() > pC ? L[Math.floor(Math.random() * L.length)] : mid;
        }
        return idle.look;
      };
      const inR = (v.inRound || [])[i];
      if ((v.phase === 'ready' || v.phase === 'question') && inR) {
        const pT = this.pressT.get(p.id);
        if (pT != null) {
          const u = t - pT;
          const x = i === v.me && this.myPick() != null ? DOME_X[this.myPick()] : 0.0;
          if (u < 0.5) { this.hoverPose(a, t, i, u < 0.12 ? u / 0.12 : Math.max(0, 1 - (u - 0.25) / 0.25), x); a.expr = 'tense'; }
          else { a.pose(hs(i, v.r) < 0.5 ? 'clasp' : 'chin', { t }); a.expr = 'smile'; }
          a.look = u < 0.6 ? mid : idleLook(0.5);
          return;
        }
        this.hoverPose(a, t, i);
        a.expr = v.phase === 'ready' ? 'tense' : 'o';
        a.look = mid;
        return;
      }
      if (v.phase === 'reveal' && inR) {
        const u = t - (this.revAt ?? t), g = (v.gains || [])[i] || 0, pk = (v.picks || [])[i];
        if (pk == null) { a.pose(u < 1.6 ? 'shrug' : 'rest', { t }); a.expr = 'sad'; }
        else if (g > 0 && v.first === i) { a.pose('cheer', { t }); a.expr = 'laugh'; }
        else if (g > 0) { a.pose(u < 1.2 ? 'clap' : 'lean', { t }); a.expr = 'grin'; }
        else { a.pose(u < 1.5 ? (hs(i, v.r) < 0.5 ? 'facepalm' : 'headgrab') : 'slump', { t }); a.expr = u < 1.5 ? 'wince' : 'sad'; }
        a.look = u < 0.9 ? mid : idleLook(0.35);
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
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = this.land();
    const t = this.time, now = this.sNow();
    const ssT = clamp((this.R * Math.min(1, this.kz) - 0.6) / 0.8, 0.75, 1.35);
    this.ssV = this.ssV ? damp(this.ssV, ssT, 3, dt) : ssT;
    this.stepStand(dt);
    // hazır: üç bip (tabelanın ampulleriyle birlikte)
    if (v.phase === 'ready' && this.beeps < 3) {
      const rt = this.phT();
      while (this.beeps < 3 && rt >= this.beeps * 0.45) { this.beeps++; this.fx('ready'); }
    }
    if (v.phase === 'question') {
      const left = (v.endsAt || 0) - now;
      if (v.amIn && v.myPick == null && !this.myTapOk() && left <= 0 && !this.upSeen) { this.upSeen = true; this.fx('timeup'); }
    }
    if (v.phase === 'final' && !this.champFx && t - (this.finT || 0) >= 1.1) {
      this.champFx = true;
      if ((v.champ || []).length) {
        this.fx('champ');
        const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
        this.msg(`🏆 ${nm}`, 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, [[1, 0.85, 0.3], [1, 1, 1], ...COL3.map((x) => Array.from(x))], 2.6, 0.04, false, 2.2, 2.4); });
      }
    }
    // tabela dokusu: içerik değişince yeniden çiz
    if (this.X && this.signTex) {
      const S = this.signState();
      if (S.key !== this.signKey) { this.signKey = S.key; try { drawSign(this.signCv, S); updateTexture(this.X, this.signTex, this.signCv); } catch { /* yok */ } }
    }
    // kamera: oyunda tabela ekranın boş kısmına sığar; açılışta biraz geniş (konsollar görünsün)
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 260, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (this.inRound()) {
      pa = land ? -0.02 : -0.06; bp = 300;
      H = this.signW(0, 0.05, 0);
      const wide = v.phase === 'reveal' && this.revT() > 0.5;
      const vw = this.vw || 390, vh = this.vh || 844, asp = vw / vh, fov = land ? 0.7 : 0.78, top = land ? 56 : 100;
      const fit = (x0, x1, y0, y1) => ({ px: Math.min((x1 - x0) * 0.72, ((y1 - y0) * 0.72) / 0.62, Math.max(300, vh * 0.55), 560), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
      let Fr = fit(0, vw, top, Math.max(top + 120, vh - 300));
      if (land) { const A = fit(0, Math.max(160, this.barL || vw * 0.45), top, vh - 8); if (A.px > Fr.px * 0.92) Fr = A; }
      const px = Fr.px * (wide ? 0.66 : 1);
      const Dw = (1.36 * this.ss) / ((px / vw) * 2 * Math.tan(fov / 2) * asp);
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
    this.placePts();
  }
  myTapOk() { const T = this.myTap, v = this.view; return !!T && !!v && T.key === `${v.game}|${v.r}`; }
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
    const rev = !!v && v.phase === 'reveal' && !this.flat;
    for (let i = 0; i < this.ptEl.length; i++) {
      const e = this.ptEl[i];
      if (!e) continue;
      if (!rev) { if (e.classList.contains('go')) e.className = 'rs-pt'; continue; }
      if (!e.classList.contains('go')) continue;
      const a = this.avatarAt(i);
      if (!a || !a.headW) continue;
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
    }
  }
  // tabelada ne yazacak
  signState() {
    const v = this.view;
    const ph = v ? v.phase : 'intro';
    const fk = this.fontOk ? 1 : 0;
    if (!v || ph === 'intro') return { key: `i|${fk}`, rainbow: [['RENK', 180, 190], ['ŞAŞIRTMACA', 380, 150]], strip: 'HAZIR MISIN?', stripCol: '#ffffff' };
    if (ph === 'final') {
      const ch = (v.champ || []).map((i) => nm0(v.seats[i]?.n).toLocaleUpperCase('tr-TR')).join(' & ');
      return { key: `f|${v.game}|${ch}|${fk}`, rainbow: [['OYUN', 180, 190], ['BİTTİ', 380, 190]], strip: ch ? `ŞAMPİYON: ${ch}` : 'OYUN BİTTİ', stripCol: '#ffd23f' };
    }
    const yz = v.rule === 'yazi';
    const stripBg = yz ? '#7a0f4c' : '#0b0a12', strip = yz ? 'TERS TUR · YAZIYA BAS' : 'YAZININ RENGİNE BAS';
    if (ph === 'ready') return { key: `r|${v.game}|${v.r}|${v.rule}|${fk}`, stripBg, strip, lines: [['HAZIR', '#9a93c4', 72, 120, 0], [yz ? 'YAZIYA BAS!' : 'RENGİNE BAS!', yz ? '#ff6fc0' : '#ffffff', 150, 300]] };
    const w = COLS[v.word] ? COLS[v.word][2] : '?', ink = COLS[v.ink] ? COLS[v.ink][1] : '#fff';
    if (ph === 'reveal' && COLS[v.c]) return { key: `v|${v.game}|${v.r}|${v.word}|${v.ink}|${v.c}|${fk}`, stripBg: '#0b0a12', strip: `DOĞRU: ${COLS[v.c][2]}`, stripCol: COLS[v.c][1], lines: [[w, ink, 250, 256]] };
    return { key: `q|${v.game}|${v.r}|${v.word}|${v.ink}|${v.rule}|${fk}`, stripBg, strip, lines: [[w, ink, 250, 256]] };
  }

  /* ---------- çizim ---------- */
  bulbTint(k, n) {
    const v = this.view, t = this.time;
    const ph = v ? v.phase : 'intro';
    if (ph === 'ready') return Math.floor(this.phT() / 0.225) % 2 === 0 ? WHITE3 : OFF3;
    if (ph === 'question') {
      const left = ((v.endsAt || 0) - this.sNow()) / 1000;
      if (left < 1.2) return Math.floor(t * 7) % 2 ? RED3 : OFF3;
      const head = (t * 22) % n, d = (k - head + n) % n;
      return d < 5 ? (v.rule === 'yazi' ? PINK3 : WHITE3) : OFF3;
    }
    if (ph === 'reveal' && COL3[v.c]) { const u = this.revT(); return u < 1.4 && Math.floor(u * 6 + (k % 2)) % 2 ? OFF3 : COL3[v.c]; }
    return COL3[(k + Math.floor(t * 5)) % 4];
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.rsSign || !v) return;
    const m = this.mats.b, T = this.T, t = this.time;
    D(Wd.rsPed, this.standMat(), T.obj);
    const SM = this.signMat(this.sC);
    D(Wd.rsSign, SM, T.obj);
    // konsollar
    this.seats.forEach((p) => {
      const a = this.av.get(p.id);
      if (!a) return;
      D(Wd.rsCon, this.conMat(a, m), T.obj);
    });
    if (shadow) return;
    // ampuller
    const n = this.bulbs.length;
    this.bulbs.forEach(([x, y], k) => {
      M.set(this.sA, x, y, 0.006, 0, 0, 0, 1);
      M.mul(m, SM, this.sA);
      D(Wd.rsBulb, m, this.bulbTint(k, n), 1, 1.4);
    });
    // yanan düğmeler ve lambalar
    if (this.inRound()) {
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a || !(v.inRound || [])[i]) return;
        if (v.phase === 'reveal') {
          const pk = (v.picks || [])[i];
          if (pk != null) { const u = this.revT(); D(Wd.rsDome, this.conMat(a, m, DOME_X[pk]), COL3[pk], 1, 1.2 + 0.5 * Math.max(0, 1 - u)); }
          return;
        }
        if (i === v.me && this.myPick() != null) D(Wd.rsDome, this.conMat(a, m, DOME_X[this.myPick()]), COL3[this.myPick()], 1, 1.4);
        if ((v.answered || [])[i] || (i === v.me && this.myPick() != null)) D(Wd.rsLamp, this.conMat(a, m, 0, 0.062), WHITE3, 1, 1.6);
      });
    }
    // final: birincinin önünde kupa
    if (v.phase === 'final') {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, -0.36, 0.004, CZ - 0.04);
        const u = clamp((t - (this.finT || 0) - 0.9) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.1 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  // dokulu: tabela yüzü ve şerit
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.rsFace || !this.signTex) return;
    const m = this.signMat(this.sC);
    gl.bindTexture(gl.TEXTURE_2D, this.signTex);
    gl.uniform1f(X.tex.u.uSelf, 1);
    drawMesh(X, Wd.rsFace, m, WHITE3);
    drawMesh(X, Wd.rsStrip, m, WHITE3);
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
    // tabelanın ışıltısı: soruda yazının rengi, açılışta doğru renk
    if (v.phase === 'question' && COL3[v.ink]) this.glow(m, this.signW(0, 0, 0.12), 1.5 * ss, COL3[v.ink], 0.13);
    if (v.phase === 'reveal' && COL3[v.c]) this.glow(m, this.signW(0, 0, 0.12), 1.7 * ss, COL3[v.c], 0.2 * Math.max(0.4, 1 - this.revT() / 2));
    if (v.phase === 'ready') this.glow(m, this.signW(0, 0, 0.12), 1.4 * ss, v.rule === 'yazi' ? PINK3 : WHITE3, 0.07 + 0.05 * (Math.floor(this.phT() / 0.225) % 2 === 0 ? 1 : 0));
    if (!this.inRound()) return;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a || !(v.inRound || [])[i]) return;
      if (v.phase === 'reveal') {
        const pk = (v.picks || [])[i];
        if (pk == null) return;
        const g = (v.gains || [])[i] || 0;
        this.glow(m, this.seatW(a, DOME_X[pk], 0.1, CZ), 0.22, COL3[pk], 0.45);
        this.glow(m, this.seatW(a, 0, 0.06, CZ), 0.75, g > 0 ? GREEN3 : RED3, 0.32 + 0.1 * Math.sin(t * 6 + i));
        return;
      }
      if (i === v.me && this.myPick() != null) this.glow(m, this.seatW(a, DOME_X[this.myPick()], 0.1, CZ), 0.24, COL3[this.myPick()], 0.5);
      if ((v.answered || [])[i] || (i === v.me && this.myPick() != null)) this.glow(m, this.seatW(a, 0, 0.08, CZ + 0.062), 0.16, WHITE3, 0.6);
    });
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="rs-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="rs-seg" role="group" aria-label="Tur sayısı"><button data-act="rs-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 12 tur</button><button data-act="rs-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🏆 Uzun · 20 tur</button></div>`; }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  head(v) {
    const yz = v.rule === 'yazi';
    return `<div class="rs-q"><span class="st">🎨 TUR ${v.r}/${v.rs}</span><span class="rl${yz ? ' y' : ''}${yz && v.phase === 'ready' ? ' bl' : ''}">${yz ? '🔄 YAZIYA BAS' : '🎨 RENGİNE BAS'}</span></div>`;
  }
  btns(v, mode) {
    // mode: 'wait' (hazır), 'go' (basılabilir), 'done' (bastım), 'rev' (açılış)
    const mp = this.myPick();
    return `<div class="rs-bs">${COLS.map((c, i) => {
      let cls = '';
      if (mode === 'wait') cls = 'wait';
      else if (mode === 'done') cls = i === mp ? 'me' : 'off';
      else if (mode === 'rev') cls = i === v.c ? 'ok' : i === mp ? 'bad' : 'off';
      return `<button class="rs-bt ${cls}" style="--bc:${c[1]}" data-act="rs-pick" data-i="${i}" ${mode === 'go' ? '' : 'disabled'}><i>${i + 1}</i>${c[2]}</button>`;
    }).join('')}</div>`;
  }
  bar(force) {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const now = this.sNow();
    if (v.phase === 'ready' || v.phase === 'question') {
      const watch = !v.amIn;
      const mp = this.myPick();
      const st = v.phase === 'ready' ? 'r' : watch ? 'w' : mp != null ? 'd' : now >= (v.endsAt || 0) ? 't' : 'q';
      const yz = v.rule === 'yazi';
      const w = v.phase === 'question' && COLS[v.word] ? `<b class="${this.wordPop ? 'pop' : ''}" style="color:${COLS[v.ink][1]}">${COLS[v.word][2]}</b>` : `<span class="rd"><small>HAZIR OL</small>${yz ? '🔄 Bu tur YAZIYA bas!' : 'Yazının RENGİNE bas'}</span>`;
      key = `q|${v.game}|${v.r}|${st}|${mp}`;
      html = `<div class="rs-box">${this.head(v)}<div class="rs-w${yz ? ' y' : ''}">${w}</div>
        ${this.btns(v, st === 'q' ? 'go' : st === 'd' ? 'done' : 'wait')}
        <div class="rs-ft"></div>
        ${this.timerBar()}</div>`;
      if (this.setBar(key, html) !== false || force) { this.ftKey = ''; this.wordPop = false; }
      const myMs = v.myMs != null ? v.myMs : this.myTapOk() ? this.myTap.ms : null;
      const z = st === 'r' ? '<span class="z">Kelime birazdan çıkacak…</span>'
        : st === 'w' ? '<span class="z">👀 Bu turu izliyorsun</span>'
        : st === 'd' ? `<span class="z g">✓ Bastın${myMs != null ? ` · ${sec(Math.max(0, myMs))} sn` : ''}</span>`
        : st === 't' ? '<span class="z r">⏱ Süre bitti</span>'
        : `<span class="z">${yz ? 'Kelime ne diyorsa ona bas' : 'Kelimeyi değil, RENGİNİ seç'}</span>`;
      const fk = `${v.nAns}|${v.total}|${z}`;
      if (fk !== this.ftKey) { const ft = this.el.bar.querySelector('.rs-ft'); if (ft) { this.ftKey = fk; ft.innerHTML = `<span class="n">✋ ${v.nAns}/${v.total} bastı</span>${z}`; } }
      return;
    }
    if (v.phase === 'reveal') {
      const me = v.me, inR = me >= 0 && (v.inRound || [])[me];
      const pk = me >= 0 ? (v.picks || [])[me] : null, g = me >= 0 ? (v.gains || [])[me] || 0 : 0;
      const yz = v.rule === 'yazi';
      const w = COLS[v.word] ? `<b style="color:${COLS[v.ink][1]}">${COLS[v.word][2]}</b><span class="ok" style="--cc:${COLS[v.c][1]}">→ DOĞRU <u>${COLS[v.c][2]}</u></span>` : '';
      let mi, why = '';
      if (inR && pk != null && g > 0) {
        const stk = (v.streak || [])[me] || 0;
        mi = `<em class="g">✅ ${sec(v.ms[me] || 0)} sn</em><em class="g">${sgn(g)}</em>${v.first === me ? '<em>⚡ En hızlı</em>' : ''}${stk >= 3 ? `<em>🔥 ${stk} seri</em>` : ''}`;
      } else if (inR && pk != null) {
        mi = `<em class="r">✗ Yanlış</em><em class="r">${sgn(g)}</em>`;
        const trap = yz ? v.ink : v.word;
        why = pk === trap ? (yz ? `Ters turdu: yazı ${COLS[v.word][2]} diyordu, rengine bastın.` : `Yazı ${COLS[v.word][2]} diyordu ama rengi ${COLS[v.ink][2]}.`) : `Doğrusu ${COLS[v.c][2]} idi.`;
      } else if (inR) mi = '<em>⏱ Basmadın</em>';
      else { const f = v.first; mi = f >= 0 ? `<span>⚡ En hızlı: ${esc(nm0(v.seats[f]?.n || ''))}</span>` : '<span>Kimse doğru basamadı</span>'; }
      key = `v|${v.game}|${v.r}|${pk}|${g}`;
      html = `<div class="rs-box">${this.head(v)}<div class="rs-w rv${yz ? ' y' : ''}">${w}</div>
        ${this.btns(v, 'rev')}
        <div class="rs-res"><span class="mi">${mi}</span>${why ? `<span class="why">${why}</span>` : ''}</div>
        <div class="rs-rk">${this.rankLine(v)}</div>
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
      html = `<div class="card rs-intro">
        <div class="tt">🌈 Renk Şaşırtmaca</div>
        <div class="sub">Tabelada bir renk adı başka bir renkle yazılır. Kelimeyi değil, yazının RENGİNE bas!</div>
        <div class="rs-demo"><b>KIRMIZI</b><span>Yazı “kırmızı” diyor ama rengi mavi: <br>doğru düğme <em style="background:#4D8DFF">MAVİ</em></span></div>
        <div class="rs-ru"><div style="background:#e9e4ff"><b>🎨</b>Yazının rengine bas</div><div style="background:#ffd6ec"><b>🔄</b>Ters turda yazıya bas</div><div style="background:#fff3c4"><b>⚡</b>Hızlı doğru çok puan, yanlış −200</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="rs-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Her turda tek basış hakkın var. En hızlı doğru +150, üst üste 3 doğrudan sonra her doğru +100. Süre turlar ilerledikçe kısalır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.fast) aw.push(`<div><b>⚡</b><span>En hızlı refleks<em>${nm(v.fast.i)} · ${sec(v.fast.ms)} sn</em></span></div>`);
      if (v.streak) aw.push(`<div><b>🔥</b><span>En uzun seri<em>${nm(v.streak.i)} · ${v.streak.n} doğru</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤷</b><span>Bu sefer kimse artıda bitiremedi!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>✅ ${S[i]?.ok ?? 0} · ❌ ${S[i]?.bad ?? 0} · 🔥 ${S[i]?.best ?? 0} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Oyun bitti!</div>
        <div class="sub">${v.rs} turda gözler mi kazandı, beyin mi?</div>
        <div class="rs-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="rs-aw">${aw.join('')}</div>` : ''}
        <div class="rs-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="rs-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const TOP = { ready: `${v.r}/${v.rs} · ${v.rule === 'yazi' ? '🔄 YAZIYA BAS' : '🎨 RENGİNE BAS'}`, question: `${v.r}/${v.rs} · ✋ ${v.nAns ?? 0}/${v.total ?? 0}`, reveal: `${v.r}/${v.rs} · ${COLS[v.c] ? `DOĞRU: ${COLS[v.c][2]}` : ''}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.rs-tm i');
    if (tm) {
      let u = 0, col = '#2fbf71';
      if (v.phase === 'ready') { u = clamp(1 - (now - (v.at || 0)) / (v.readyMs || 1400), 0, 1); col = '#9a93c4'; }
      else if (v.phase === 'question') { const left = (v.endsAt || 0) - now; u = clamp(left / (v.T || 4000), 0, 1); col = left > 2000 ? '#2fbf71' : left > 1000 ? '#f2b200' : '#ff4f5e'; }
      else if (v.phase === 'reveal') { u = clamp(((v.endsAt || 0) - now) / (v.revealMs || 3200), 0, 1); col = '#5b2a86'; }
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      tm.style.setProperty('--tc', col);
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
      if (v.phase !== 'intro') { const sc = (v.scores || [])[i] || 0; x += `<span class="rs-sc${sc < 0 ? ' neg' : ''}">${fmt(sc)}</span>`; }
      const stk = (v.streak || [])[i] || 0;
      if (this.inRound() && stk >= 2) x += `<span>🔥${stk}</span>`;
      if (v.phase === 'question' && (v.answered || [])[i]) x += '<span>✋</span>';
      if (v.phase === 'reveal' && (v.inRound || [])[i]) { const pk = (v.picks || [])[i]; x += pk == null ? '<span>⏱</span>' : (v.gains || [])[i] > 0 ? `<span>✅${v.first === i ? '⚡' : ''}</span>` : '<span>❌</span>'; }
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${MEDAL[pl - 1]}</span>`; }
      if (o.rsK !== x) {
        o.rsK = x;
        let el = o.lbl.querySelector('.rs-x');
        if (!el) { el = document.createElement('span'); el.className = 'rs-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.rs-x')) o.rsK = '';
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
    g.fillStyle = '#0c0916'; g.fillRect(0, 0, w, h);
    g.fillStyle = FELT;
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.86, L.r * 0.68, 0, 0, TAU); g.fill();
    g.lineWidth = 5; g.strokeStyle = TRIM; g.stroke();
    this.draw2dSign(g, L);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const v = this.view;
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = (v.scores || [])[i] < 0 ? '#ff8a95' : '#e6defc'; g.fillText(fmt((v.scores || [])[i]), x, y + 45); }
      // basış: soruda beyaz lamba, açılışta bastığı renk
      if (v && this.inRound() && (v.inRound || [])[i]) {
        let col = null;
        if (v.phase === 'reveal') { const pk = (v.picks || [])[i]; if (pk != null) col = COLS[pk][1]; }
        else if ((v.answered || [])[i] || (i === v.me && this.myPick() != null)) col = i === v.me && this.myPick() != null ? COLS[this.myPick()][1] : '#ffffff';
        if (col) { g.fillStyle = col; g.beginPath(); g.arc(x + 17, y - 15, 7, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = '#1c1633'; g.stroke(); }
        if (v.phase === 'reveal' && (v.picks || [])[i] != null) { g.font = `16px ${EMO_FONT}`; g.fillText((v.gains || [])[i] > 0 ? '✅' : '❌', x, y); }
      }
      if (v && v.phase === 'reveal' && this.revAt != null) {
        const gn = (v.gains || [])[i];
        const u = (this.time - this.revAt) / 2.2;
        if (gn && u < 1) { g.globalAlpha = 1 - u * u; g.fillStyle = gn < 0 ? '#ff6b78' : v.first === i ? '#ffd23f' : '#7dffb0'; g.font = '900 15px system-ui'; g.fillText(sgn(gn), x, y - 44 - u * 22); g.globalAlpha = 1; }
      }
    });
  }
  draw2dSign(g, L) {
    const v = this.view;
    const S = this.signState();
    const sw = Math.min(L.r * 1.3, L.w * 0.7), sh = sw * 0.42, x0 = L.cx - sw / 2, y0 = L.cy - sh / 2;
    g.fillStyle = '#2a2738'; g.beginPath(); g.roundRect ? g.roundRect(x0 - 8, y0 - 26, sw + 16, sh + 34, 12) : g.rect(x0 - 8, y0 - 26, sw + 16, sh + 34); g.fill();
    g.fillStyle = S.stripBg || '#0b0a12'; g.fillRect(x0, y0 - 20, sw, 16);
    g.fillStyle = '#07060c'; g.fillRect(x0, y0, sw, sh);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (S.strip) { g.font = `900 11px ${F}`; g.fillStyle = S.stripCol || '#fff'; g.fillText(S.strip, L.cx, y0 - 12, sw - 8); }
    const lines = S.lines || (S.rainbow || []).map(([t]) => [t, null, 0, 0]);
    const n = lines.length;
    lines.forEach(([t, col], k) => {
      const fs = Math.min(sh * (n > 1 ? 0.36 : 0.62), (sw * 0.9) / Math.max(3, t.length * 0.68));
      g.font = `900 ${fs}px ${F}`;
      const y = y0 + sh * ((k + 0.5) / n);
      if (col) { g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col; g.fillText(t, L.cx, y); g.shadowBlur = 0; g.fillText(t, L.cx, y); }
      else {
        const L2 = [...t], ws = L2.map((ch) => g.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0);
        let x = L.cx - tw / 2;
        g.textAlign = 'left';
        L2.forEach((ch, j) => { g.fillStyle = COLS[(j + k * 2 + Math.floor(this.time * 3)) % 4][1]; g.fillText(ch, x, y); x += ws[j]; });
        g.textAlign = 'center';
      }
    });
    // ampuller
    const nB = 24;
    for (let k = 0; k < nB; k++) {
      const u = k / nB, per = 2 * (sw + sh);
      let d = u * per, bx, by;
      if (d < sw) { bx = x0 + d; by = y0 - 23; } else if ((d -= sw) < sh) { bx = x0 + sw + 4; by = y0 + d; } else if ((d -= sh) < sw) { bx = x0 + sw - d; by = y0 + sh + 4; } else { d -= sw; bx = x0 - 4; by = y0 + sh - d; }
      const c3 = this.bulbTint(k, nB);
      g.fillStyle = `rgb(${Math.round(c3[0] * 255)},${Math.round(c3[1] * 255)},${Math.round(c3[2] * 255)})`;
      g.beginPath(); g.arc(bx, by, 2.6, 0, TAU); g.fill();
    }
    void v;
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new ColorGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[rnk]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
