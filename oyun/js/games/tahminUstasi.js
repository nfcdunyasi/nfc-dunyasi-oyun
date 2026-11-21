// Tahmin Ustası — 3D usta atölyesi (NFC Dünyası Oyun)
// Masanın ortasında ustanın tahmin makinesi durur: emaye ön yüzde soru yazar, altında yedi tamburlu mekanik sayaç "???"
// gösterir, tepesindeki ampuller süreyi sayar. Herkes tuş takımıyla bir sayı tahmin eder (süre bitene kadar değiştirebilir;
// kimin ne dediği açılışa kadar görünmez). Açılışta herkes elindeki tahtayı kaldırıp tahminini gösterir; makinenin önündeki
// şerit metre açılır, tahminler renkli toplu iğneler olarak şeride dizilir. Sonra kırmızı işaret şerit boyunca kayar,
// makinenin kolu döner, tamburlar tek tek gerçek cevapta durur. En yakın iğne parlar: 1000 / 600 / 300 puan, tam isabete +500.
// Masa kiti (masa3d.js) ile çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-21-f';
import * as sfx from '../sfx.js?v=2026-11-21-f';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, makeTexture, updateTexture } = E;
void sfx;

const INK = '#1c1633', TEAL = '#1f6f6a', TEAL_D = '#14504c', BRASS = '#c9a14a', TAPEC = '#ffcf1f', REDC = '#e2363b', MINT = '#8ee3d8';
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const GOLD3 = new Float32Array([1, 0.82, 0.3]), WHITE3 = new Float32Array([1, 1, 1]), RED3 = new Float32Array([1, 0.22, 0.24]), AMBER3 = new Float32Array([1, 0.71, 0.15]);
const GREEN3 = new Float32Array([0.32, 0.92, 0.52]), OFF3 = new Float32Array([0.2, 0.16, 0.12]), MINT3 = new Float32Array(rgb3(MINT));
const MEDAL = ['🥇', '🥈', '🥉'];
// makine (ölçek 1'de; this.ss ile birlikte büyür/küçülür). Kürsü uzayı: x sağ, y yukarı, z kameraya doğru; orijin masa ortası
const FW = 1.0, FH = 0.625;                   // ön yüz (doku 1024×640)
const M_TILT = 0.3, M_Z = -0.32;              // ön yüz arkaya yaslı; ön yüz merkezinin z'si
const PED_H = 0.06, BODY_D = 0.3;             // kaide yüksekliği, gövde derinliği
const HB = FH / 2 + 0.04, HT = FH / 2 + 0.07; // yüz merkezinden gövdenin alt ve üst kenarına (yüz düzleminde)
const SYM = '0123456789., ?', NSYM = 14, NDR = 7;
const DR = 0.2, DW = 0.108, DSTEP = 0.117, DP = 0.024;   // tambur yarıçapı, genişliği, aralığı, yüzden öne taşma
const WIN_Y = (0.5 - 440 / 640) * FH, BEZ = 0.058;      // tambur penceresinin merkezi (yüz uzayı) ve yarı yüksekliği
const BULB_N = 12, BULB_Y = FH / 2 + 0.013;
const TAPE_L = 1.4, TAPE_W = 0.12, TAPE_X0 = -0.66, TAPE_Z = 0.34;   // şerit metre
const TX0 = TAPE_X0 + 0.08, TX1 = TAPE_X0 + TAPE_L - 0.07;          // ölçeğin kullanılan aralığı
const CASE_X = -0.76, CASE_W = 0.2, CASE_H = 0.19, CASE_D = 0.15;
const PIN_H = 0.15;
const T_BOARD = 0.2, T_ZIP = 0.75, ZIP_D = 0.4, T_PIN = 1.25, T_ROLL = 2.45, T_LAND = 4.45;   // açılış zaman çizelgesi (sn)
const CE = Math.cos(M_TILT), SE = Math.sin(M_TILT);
const F_UP = [0, CE, -SE], F_N = [0, SE, CE];
const F_CEN = [0, PED_H + HB * CE, M_Z];
const Z_FB = M_Z + HB * SE, Z_FT = M_Z - HT * SE, Y_TOP = PED_H + (HB + HT) * CE, Z_BACK = Z_FT - BODY_D;
const CRANK = [FW / 2 + 0.065, PED_H + 0.3, (Z_BACK + Z_FB) / 2 + 0.02];
const drumX = (k) => (k - (NDR - 1) / 2) * DSTEP;
const bulbX = (k) => (k - (BULB_N - 1) / 2) * 0.078;
const EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const WORK_L = { sunC: [0.52, 0.47, 0.4], sky: [0.44, 0.41, 0.37], gnd: [0.2, 0.17, 0.13], night: 1, warm: [1, 0.85, 0.6], lampC: [1.5, 1.27, 0.95], fogR: [30, 90], stars: 0, glowS: 0.3 };

const STYLE = `
#ky.tus .msg{top:12%}
#ky.tus .tu-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fffaf0;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.tus .tu-q{border-radius:14px;background:#fffdf6;color:#1c1633;padding:6px 10px 8px;border:3px solid var(--ink);box-shadow:inset 0 0 0 3px #e3f1ec}
#ky.tus .tu-q small{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;font-weight:900;letter-spacing:.07em}
#ky.tus .tu-q small .st{background:#1f6f6a;color:#fff;border-radius:99px;padding:0 8px;letter-spacing:.05em}
#ky.tus .tu-q small .un{background:#ffcf1f;color:#1c1633;border-radius:99px;padding:0 8px;letter-spacing:.02em;text-transform:none}
#ky.tus .tu-q .tx{margin-top:4px;font:800 clamp(17px,4.9vw,22px)/1.22 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;overflow-wrap:anywhere;text-wrap:balance}
#ky.tus .tu-in{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px;align-items:stretch}
#ky.tus .tu-disp{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-height:52px;border:3px solid var(--ink);border-radius:14px;background:#14504c;color:#ffe9a8;padding:2px 40px 2px 10px;box-shadow:inset 0 3px 0 rgba(0,0,0,.28);overflow:hidden}
#ky.tus .tu-disp b{font:900 clamp(25px,7.4vw,32px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:.02em;white-space:nowrap}
#ky.tus .tu-disp .u{font-weight:800;font-size:14px;color:#8ee3d8;white-space:nowrap}
#ky.tus .tu-disp .ph{font-weight:800;font-size:15px;color:#8ee3d8;opacity:.9}
#ky.tus .tu-disp.sent b{color:#9cf0c0}
#ky.tus .tu-disp .x{position:absolute;right:3px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-weight:900;font-size:13px;padding:0;-webkit-tap-highlight-color:transparent}
#ky.tus .tu-disp.shake{animation:tush .35s}
@keyframes tush{20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
#ky.tus .tu-send{border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);padding:4px 14px;font:900 17px/1.05 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;background:#ffcf1f;color:var(--ink);touch-action:manipulation;-webkit-tap-highlight-color:transparent;white-space:nowrap;min-width:94px}
#ky.tus .tu-send small{display:block;font:800 10.5px/1.15 system-ui,sans-serif;opacity:.75}
#ky.tus .tu-send[disabled]{filter:grayscale(.65);opacity:.55}
#ky.tus .tu-send:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.tus .tu-pad{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:7px}
#ky.tus .tu-pad button{height:44px;border:3px solid var(--ink);border-radius:12px;box-shadow:2px 2px 0 var(--ink);background:#fff;color:var(--ink);font:900 20px/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent;padding:0;min-width:0}
#ky.tus .tu-pad button.w2{grid-column:span 2}
#ky.tus .tu-pad button.op{background:#e3f1ec;font-size:17px}
@media (max-width:360px){#ky.tus .tu-pad button{padding:0}#ky.tus .tu-pad button.op{font-size:14px;letter-spacing:-.04em}}
#ky.tus .tu-pad button.bk{background:#ffe1df}
#ky.tus .tu-pad button:active:not([disabled]){transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
#ky.tus .tu-pad button[disabled]{opacity:.45}
#ky.tus .tu-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800;min-height:24px}
#ky.tus .tu-ft .n{background:#1c1633;color:#fff;border-radius:99px;padding:2px 9px}
#ky.tus .tu-ft .z{opacity:.85}
#ky.tus .tu-ft .z b{color:#14504c}
#ky.tus .tu-ft .z.w{color:#c21f33;opacity:1}
#ky.tus .tu-watch{margin-top:8px;border:3px dashed rgba(28,22,51,.35);border-radius:14px;padding:12px 8px;font-weight:800;font-size:14px}
#ky.tus .tu-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:6px 12px;font-weight:900;font-size:14px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.tus .tu-b.sm{padding:4px 11px;min-height:32px;font-size:12.5px;border-width:2px;box-shadow:2px 2px 0 var(--ink);border-radius:10px;background:#e3f1ec}
#ky.tus .tu-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.tus .tu-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.tus .tu-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:transform .15s linear,background .3s}
#ky.tus .tu-res{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;margin-top:7px;min-height:28px;font-weight:900;font-size:clamp(16px,4.6vw,20px)}
#ky.tus .tu-res .a b{display:inline-block;background:#e2363b;color:#fff;border:3px solid #1c1633;border-radius:11px;padding:0 9px;box-shadow:2px 2px 0 #1c1633;font-variant-numeric:tabular-nums}
#ky.tus .tu-res .mi{font-size:13.5px;font-weight:800;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
#ky.tus .tu-res .mi em{font-style:normal;font-weight:900;border-radius:99px;padding:1px 9px;background:#e3f1ec}
#ky.tus .tu-res .mi em.g{background:#c9f5dc;color:#0d6b3a}
#ky.tus .tu-res .mi em.r{background:#ffe1df;color:#a11426}
#ky.tus .tu-res .m{opacity:.7}
#ky.tus .tu-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;font-weight:800;min-height:20px}
#ky.tus .tu-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.tus .tu-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.tus .tu-rk span.me{background:#fff4c2}
#ky.tus .tu-row{display:flex;gap:8px;justify-content:center;margin-top:7px}
#ky.tus .lbl .tu-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.tus .lbl .tu-x:empty{display:none}
#ky.tus .lbl .tu-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#1c1633;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.tus .tu-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.tus .tu-pt.ex{color:#ffd23f}
#ky.tus .tu-pt.go{animation:tupt 2.4s ease-out forwards}
@keyframes tupt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.tus .tu-chips{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:3;overflow:hidden}
#ky.tus .tu-chip{position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:inline-flex;align-items:center;gap:3px;padding:1px 7px 1px 4px;border:2px solid #1c1633;border-radius:99px;background:#fff;color:#1c1633;font:900 12px/1.3 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums;box-shadow:0 2px 0 rgba(28,22,51,.55);opacity:0;transition:opacity .2s}
#ky.tus .tu-chip i{width:9px;height:9px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633;flex:0 0 auto}
#ky.tus .tu-chip.on{opacity:1}
#ky.tus .tu-chip.best{background:#ffd23f}
#ky.tus .tu-chip.me{box-shadow:0 0 0 2px #ffd23f,0 2px 0 rgba(28,22,51,.55)}
#ky.tus .tu-chip.tiny span{display:none}
#ky.tus .tu-chip.tiny{padding:1px 3px}
#ky.tus .tu-ans{position:absolute;left:0;top:0;transform:translate(-50%,0);padding:2px 10px;border:3px solid #1c1633;border-radius:12px;background:#e2363b;color:#fff;font:900 clamp(15px,4.4vw,19px)/1.15 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;white-space:nowrap;box-shadow:3px 3px 0 #1c1633;opacity:0;transition:opacity .25s;pointer-events:none;z-index:4;font-variant-numeric:tabular-nums}
#ky.tus .tu-ans.on{opacity:1}
#ky.tus .card .tu-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.tus .card .tu-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.tus .card .tu-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.tus .card .tu-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.tus .card .tu-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.tus .card .tu-seg button.on{background:var(--ink);color:#fff}
#ky.tus .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.tus .card .tu-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.tus .card .tu-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.tus .card .tu-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.tus .card .tu-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.tus .card .tu-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.tus .card .tu-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.tus .card .tu-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.tus .card .tu-aw div:only-child{grid-column:1/-1}
#ky.tus .card .tu-aw div b{font-size:18px;flex:0 0 auto}
#ky.tus .card .tu-aw div span{flex:1;min-width:0;font-size:12px}
#ky.tus .card .tu-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.tus .card .tu-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.tus .card .tu-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.tus .card .tu-tb>div.me{background:#fff4c2}
#ky.tus .card .tu-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.tus .card .tu-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.tus .card .tu-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.tus .card .tu-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.tus .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.tus .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.tus .tu-box{width:min(470px,54vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.tus .tu-q{padding:4px 10px 6px}#ky.tus .tu-q .tx{font-size:17px}
#ky.tus .tu-in{margin-top:6px}
#ky.tus .tu-disp{min-height:42px}#ky.tus .tu-disp b{font-size:25px}
#ky.tus .tu-send{font-size:15px;min-width:84px}
#ky.tus .tu-pad{margin-top:5px;gap:4px}
#ky.tus .tu-pad button{height:36px;font-size:18px}
#ky.tus .tu-ft{margin-top:5px}
#ky.tus .tu-res{margin-top:5px;font-size:16px;min-height:22px}
#ky.tus .tu-tm{margin-top:5px}
#ky.tus .card .tu-ru{margin-top:6px}#ky.tus .card .tu-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.tus .card .tu-ru div b{font-size:17px}
#ky.tus .card .tu-seg{margin-top:6px}#ky.tus .card .tu-seg button{padding:6px 4px}
#ky.tus .card .tu-pod{display:none}
#ky.tus .card .tu-aw{margin-top:6px}
#ky.tus .card .tu-tb{max-height:24vh}
#ky.tus .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.tus .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, final): atölye svingi (Sol majör, 108 bpm): yürüyen bas, fırça davul, marimba ezgisi, elektrikli piyano.
// 'race' (soru ve sonuç): saat tik-taklı düşünme müziği (La minör, 96 bpm): tik-tak, pizzicato bas, marimba arpeji, yaylılar.
// 'mute' (sayaç dönerken): müzik susar, davul gümbürtüsü çalar.
class TuSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 96 : 108; }
  swing() { return this.mode === 'race' ? 0.04 : 0.17; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // Am – F – Dm – E7
      const CH = [[33, [57, 60, 64]], [29, [57, 60, 65]], [26, [57, 62, 65]], [28, [56, 59, 64]]];
      const [root, ch] = CH[bar % 4];
      if (s % 4 === 0) this.iWood(t, 0.05, s % 8 === 0 ? 1250 : 980);          // saat: tik ... tak
      if (s % 2 === 1) this.iTick(t, 0.016);
      if (s === 0 || s === 8) this.iKick(t, s === 0 ? 0.06 : 0.045, 105, 46, 0.12);
      if (s % 2 === 0) this.iPizz(t, s % 8 === 6 ? root + 7 : s % 8 === 4 ? root + 12 : root, 0.065, 0.28, 0.12);
      if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 5, 0.024, 1250, 0.3);   // bir sonraki ölçüye taşar: boşluk kalmaz
      const AR = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12];
      if (s % 2 === 0 && (s >= 8 || bar % 2 === 1)) this.iMarimba(t, AR[(s >> 1) % 4], 0.034, 0.12);
      if (s % 4 === 2) this.iShk(t, 0.012);
      if (bar % 4 === 3 && s === 12) this.iBell(t, 76, 0.02, 0.8, 0.3);
      return;
    }
    // Gmaj7 – Em7 – Am7 – D7
    const CH = [[43, [59, 62, 66]], [40, [59, 62, 67]], [45, [60, 64, 67]], [38, [60, 66, 69]]];
    const NX = [40, 45, 38, 43];
    const [root, ch] = CH[bar % 4];
    if (s % 4 === 0) { const k = s >> 2; const m = [root, root + 7, root + 12, NX[bar % 4] + 11][k]; this.iBass(t, m - 12, spb * 0.95, 0.075, 'up'); }
    if (s === 4 || s === 12) this.iBrush(t, 0.045, 0.18);
    if (s % 2 === 0) this.iHat(t, s % 4 === 0 ? 0.014 : 0.01);
    if (s % 4 === 2) this.iBrush(t, 0.016, 0.12);
    if (s === 2 || s === 10) ch.forEach((m, k) => this.iEP(t + k * 0.005, m, 0.018, st * 3, 0.2));
    if (s === 0) this.iPad(t, ch, spb * 5, 0.018, 1200, 0.3);
    const MEL = [[79, null, 78, 74, null, null, 71, null], [74, null, null, 76, 79, null, null, null], [81, null, 79, 76, null, 72, null, null], [74, null, 76, 78, null, 81, null, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null) { if (bar % 8 < 4) this.iMarimba(t, m, 0.045, 0.15); else this.iVibe(t, m - 12, 0.026, st * 2.2, 0.3); }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'q': // yeni soru: makinenin kolu "şak şak", sonra zil
        this.noise(t, 0.05, 0.12, { type: 'bandpass', freq: 1800, q: 1.5 });
        this.tone(220, t, 0.06, 'square', 0.04, 140, 0.002);
        this.noise(t + 0.09, 0.05, 0.1, { type: 'bandpass', freq: 1200, q: 1.5 });
        this.tone(180, t + 0.09, 0.07, 'square', 0.04, 110, 0.002);
        this.iBell(t + 0.22, 91, 0.04, 0.9, 0.3);
        break;
      case 'key': this.iWood(t, 0.06, 1300 + Math.random() * 300); this.noise(t, 0.012, 0.03, { type: 'highpass', freq: 5000 }); break;
      case 'del': this.iWood(t, 0.05, 700 + Math.random() * 100); break;
      case 'bad': this.tone(196, t, 0.12, 'square', 0.04, 175, 0.004); break;
      case 'send': // tahmin gönderildi: tok tık ve yükselen iki nota
        this.iWood(t, 0.1, 560);
        this.noise(t + 0.01, 0.1, 0.05, { type: 'bandpass', freq: 1400, to: 3200, q: 0.8, attack: 0.01 });
        this.tone(659, t + 0.04, 0.09, 'triangle', 0.045, null, 0.003);
        this.tone(988, t + 0.12, 0.14, 'triangle', 0.045, null, 0.003);
        break;
      case 'peer': this.iWood(t, 0.04, 900 + Math.random() * 300); break;
      case 'boards': // tahtalar kalkar
        this.noise(t, 0.32, 0.08, { type: 'bandpass', freq: 500, to: 2400, q: 0.8, attack: 0.04 });
        for (let i = 0; i < 5; i++) this.iWood(t + 0.1 + i * 0.035 + Math.random() * 0.02, 0.04, 500 + Math.random() * 300);
        break;
      case 'zip': // şerit metre açılır: tırtıklı sürtünme ve "tak"
        this.noise(t, 0.42, 0.1, { type: 'bandpass', freq: 1600, to: 4200, q: 1.6, attack: 0.01 });
        for (let i = 0; i < 14; i++) this.noise(t + i * 0.028, 0.008, 0.06, { type: 'bandpass', freq: 3600, q: 3 });
        this.iWood(t + 0.43, 0.08, 820);
        break;
      case 'zipback':
        this.noise(t, 0.3, 0.08, { type: 'bandpass', freq: 4000, to: 1400, q: 1.6 });
        for (let i = 0; i < 10; i++) this.noise(t + i * 0.024, 0.008, 0.05, { type: 'bandpass', freq: 3200, q: 3 });
        this.iWood(t + 0.3, 0.1, 380);
        break;
      case 'pin': { const f = 520 + (a || 0) * 700; this.tone(f, t, 0.07, 'sine', 0.1, f * 1.9, 0.002); this.iWood(t, 0.04, 1800); break; }
      case 'tk': this.noise(t, 0.008, 0.035 + (a || 0) * 0.04, { type: 'bandpass', freq: 2800 + Math.random() * 600, q: 3 }); break;
      case 'clunk': // tambur durdu
        this.tone(160 + (a || 0) * 60, t, 0.09, 'sine', 0.14, 70, 0.002);
        this.noise(t, 0.03, 0.08, { type: 'bandpass', freq: 1500, q: 1.4 });
        this.iBell(t + 0.005, 84 + Math.round((a || 0) * 7), 0.012, 0.25, 0.2);
        break;
      case 'land': // işaret cevaba oturdu
        this.duck(0.3, 1.2);
        this.tone(1568, t, 0.7, 'sine', 0.1, null, 0.002);
        this.tone(2349, t, 0.4, 'sine', 0.05, null, 0.002);
        this.tone(130, t, 0.2, 'sine', 0.22, 55, 0.002);
        this.noise(t, 0.06, 0.12, { type: 'lowpass', freq: 1400 });
        break;
      case 'exact': // tam isabet: yazar kasa, çanlar, alkış
        super._fx('kaching');
        [[72, 0], [76, 0.08], [79, 0.16], [84, 0.24]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.05, 1, 0.3));
        this.cheer(t + 0.2, 1.6);
        break;
      case 'win': [[76, 0], [79, 0.07], [84, 0.14]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.045, 0.9, 0.3)); this.cheer(t + 0.15, 1.2); break;
      case 'near': [[72, 0], [76, 0.08]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.035, 0.7, 0.3)); break;
      case 'far':
        this.tone(392, t, 0.16, 'triangle', 0.055, 370, 0.01);
        this.tone(311, t + 0.17, 0.36, 'triangle', 0.055, 262, 0.01);
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
const WOOD = () => C('#3a2a20', -0.35), BRASSC = () => C(BRASS, -0.85), ENAMEL = () => C(TEAL, -0.55), ENAMEL_D = () => C(TEAL_D, -0.4);
const STEEL = () => C('#c9ced6', -0.9), RUBBER = () => C('#2a2a2e', -0.2), REDP = () => C(REDC, -0.55);
const faceT = (mb) => mb.push().T(F_CEN[0], F_CEN[1], F_CEN[2], 0, -M_TILT, 0);
// kaide (kürsü uzayı)
function pedModel(mb) {
  const x = FW / 2 + 0.1;
  mb.rbox(-x, 0, Z_BACK - 0.05, x, PED_H, Z_FB + 0.07, 0.02, WOOD(), 2);
  mb.rbox(-x - 0.012, 0, Z_BACK - 0.062, x + 0.012, 0.016, Z_FB + 0.082, 0.008, BRASSC(), 1);
}
// gövde: önü eğik emaye kutu, pirinç süsler; ön yüzün çerçevesi, tambur penceresi, ampul yuvaları
function bodyModel(mb) {
  const x = FW / 2 + 0.05;
  mb.frustum(-x, x, Z_BACK, Z_FB, PED_H, -x, x, Z_BACK, Z_FT, Y_TOP, ENAMEL(), ENAMEL_D());
  mb.rbox(-x - 0.008, Y_TOP - 0.006, Z_FT - 0.03, x + 0.008, Y_TOP + 0.012, Z_FT + 0.01, 0.006, BRASSC(), 1);    // ön üst kenar
  mb.rbox(-x - 0.008, Y_TOP - 0.006, Z_BACK - 0.008, x + 0.008, Y_TOP + 0.012, Z_BACK + 0.03, 0.006, BRASSC(), 1); // arka üst kenar
  [-1, 1].forEach((sd) => { const zc = (Z_BACK + Z_FT) / 2 - 0.02, yc = PED_H + 0.33; mb.rbox(sd > 0 ? x - 0.004 : -x - 0.01, yc - 0.1, zc - 0.1, sd > 0 ? x + 0.01 : -x + 0.004, yc + 0.1, zc + 0.1, 0.02, BRASSC(), 2); });
  faceT(mb);
  const fw = FW / 2, fh = FH / 2, b = 0.026;
  mb.rbox(-fw - b, fh, -0.006, fw + b, fh + b, 0.014, 0.008, BRASSC(), 1);
  mb.rbox(-fw - b, -fh - b, -0.006, fw + b, -fh, 0.014, 0.008, BRASSC(), 1);
  mb.rbox(-fw - b, -fh, -0.006, -fw, fh, 0.014, 0.008, BRASSC(), 1);
  mb.rbox(fw, -fh, -0.006, fw + b, fh, 0.014, 0.008, BRASSC(), 1);
  const wx = 0.43, y0 = WIN_Y - BEZ, y1 = WIN_Y + BEZ, z1 = DP + 0.016;
  mb.rbox(-wx - 0.02, y1, -0.004, wx + 0.02, y1 + 0.032, z1, 0.008, BRASSC(), 1);
  mb.rbox(-wx - 0.02, y0 - 0.032, -0.004, wx + 0.02, y0, z1, 0.008, BRASSC(), 1);
  mb.rbox(-wx - 0.02, y0, -0.004, -wx, y1, z1, 0.006, BRASSC(), 1);
  mb.rbox(wx, y0, -0.004, wx + 0.02, y1, z1, 0.006, BRASSC(), 1);
  for (let k = 0; k < BULB_N; k++) { mb.push().T(bulbX(k), BULB_Y, 0.012, 0, Math.PI / 2, 0); mb.cyl(0, 0, 0, 0.019, 0.006, 0.019, 10, C('#6b5426', -0.6)); mb.pop(); }
  mb.pop();
}
function faceQuad(tb) { faceT(tb); const w = FW / 2, h = FH / 2; tb.tquad([-w, -h, 0.003], [w, -h, 0.003], [w, h, 0.003], [-w, h, 0.003], 0, 0, 1, 1, [0, 0, -1]); tb.pop(); }
// sayaç tamburu: x ekseni çevresinde silindir; doku şeridi 14 hücre (0-9 . , boşluk ?), dönüş 0'da öndeki hücre "0"
function drumModel(tb) {
  const n = 56, x0 = -DW / 2, x1 = DW / 2, ts = (TAU * 0.5) / NSYM, dt = TAU / n;
  for (let j = 0; j < n; j++) {
    const ta = ts - j * dt, tb2 = ts - (j + 1) * dt;
    const ya = DR * Math.sin(ta), za = DR * Math.cos(ta), yb = DR * Math.sin(tb2), zb = DR * Math.cos(tb2);
    tb.tquad([x0, yb, zb], [x1, yb, zb], [x1, ya, za], [x0, ya, za], 0, j / n, 1, (j + 1) / n, [0, 0, 0]);
  }
}
function bulbModel(mb, e) { mb.sphereS(0, 0, 0, 0.014, 0.014, 0.014, C('#ffffff', e), 10, 8); }
// makinenin yanındaki kol (x ekseni çevresinde döner)
function crankModel(mb) {
  mb.push().T(0, 0, 0, 0, 0, -Math.PI / 2); mb.cyl(0, -0.012, 0, 0.032, 0.03, 0.032, 14, BRASSC()); mb.pop();
  mb.rbox(0.018, -0.014, -0.15, 0.036, 0.014, 0.012, 0.007, BRASSC(), 1);
  mb.push().T(0.036, 0, -0.145, 0, 0, -Math.PI / 2); mb.cyl(0, 0, 0, 0.016, 0.07, 0.018, 10, REDP()); mb.pop();
  mb.sphereS(0.11, 0, -0.145, 0.024, 0.024, 0.024, REDP(), 12, 8);
}
// şerit metre kutusu (orijin kutunun altı, ortası)
function caseModel(mb) {
  const w = CASE_W / 2, d = CASE_D / 2, Y = C(TAPEC, -0.45), Ch = C('#d6dbe2', -0.9);
  mb.rbox(-w, 0, -d, w, CASE_H, d, 0.05, Y, 3);
  mb.rbox(-w - 0.008, 0.012, -d + 0.02, w + 0.008, CASE_H + 0.008, d - 0.02, 0.05, RUBBER(), 3);
  mb.push().T(0, CASE_H * 0.52, d - 0.002, 0, Math.PI / 2, 0); mb.cyl(0, 0, 0, 0.052, 0.01, 0.052, 18, Ch); mb.pop();
  mb.push().T(0, CASE_H * 0.52, d + 0.008, 0, Math.PI / 2, 0); mb.cyl(0, 0, 0, 0.028, 0.005, 0.028, 14, REDP()); mb.pop();
  mb.rbox(-0.03, CASE_H - 0.004, -0.022, 0.03, CASE_H + 0.022, 0.022, 0.008, REDP(), 1);
  mb.rbox(w - 0.004, 0, -TAPE_W / 2 - 0.012, w + 0.03, 0.03, TAPE_W / 2 + 0.012, 0.008, RUBBER(), 1);
}
// şerit gövdesi: x yönünde birim uzunluk (çizimde boyuna ölçeklenir)
function bladeModel(mb) { mb.rbox(0, 0, -TAPE_W / 2, 1, 0.006, TAPE_W / 2, 0.002, C(TAPEC, -0.35), 1); }
function tapeQuad(tb) { const y = 0.0066, x0 = TAPE_X0, x1 = TAPE_X0 + TAPE_L, h = TAPE_W / 2, z = TAPE_Z; tb.tquad([x0, y, z + h], [x1, y, z + h], [x1, y, z - h], [x0, y, z - h], 0, 0, 1, 1, [(x0 + x1) / 2, -1, z]); }
function hookModel(mb) { mb.rbox(0, 0, -TAPE_W / 2 - 0.006, 0.012, 0.05, TAPE_W / 2 + 0.006, 0.004, BRASSC(), 1); mb.sphereS(0.012, 0.022, 0, 0.008, 0.008, 0.008, BRASSC(), 8, 6); }
function shaftModel(mb) { mb.cyl(0, 0, 0, 0.0055, PIN_H, 0.0055, 8, STEEL()); }
function pinHeadModel(mb) { mb.sphereS(0, PIN_H + 0.018, 0, 0.026, 0.026, 0.026, C('#ffffff', -0.6), 14, 10); }
// kırmızı işaret: şeridin önünde yatan, ucu şeride bakan koni (orijin uç)
function coneModel(mb) { mb.push().T(0, 0, 0, 0, Math.PI / 2, 0); mb.cyl(0, 0, 0, 0, 0.13, 0.05, 16, REDP(), REDP(), 't'); mb.pop(); mb.sphereS(0, 0, 0.135, 0.03, 0.03, 0.03, C('#ffffff', -0.6), 10, 8); }
function laserModel(mb) { mb.rbox(-0.0045, 0, -TAPE_W / 2 - 0.01, 0.0045, 0.0035, TAPE_W / 2 + 0.01, 0.001, C('#ffffff', 0.9), 1); }
function goldModel(mb) { mb.rbox(0, 0, -0.011, 1, 0.003, 0.011, 0.001, C('#ffffff', 0.9), 1); }
// oyuncunun tahtası (yerel: yüz +z, merkez orijin) ve dokulu yüzü (4×3 hücreli atlas)
function boardModel(mb) { mb.rbox(-0.155, -0.105, -0.014, 0.155, 0.105, 0, 0.012, C('#2a2433', -0.3), 2); }
function boardQuad(tb, i) {
  const c = i % 4, r = Math.floor(i / 4), u0 = c * 0.25, v0 = (r * 170) / 512, u1 = u0 + 0.25, v1 = v0 + 170 / 512;
  tb.tquad([-0.145, -0.096, 0.002], [0.145, -0.096, 0.002], [0.145, 0.096, 0.002], [-0.145, 0.096, 0.002], u0, v0, u1, v1, [0, 0, -1]);
}

/* ============================ sayılar ============================ */
const grp = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// Türkçe sayı: binlik nokta (yıllarda yok), ondalık virgül
function numStr(x, unit) {
  if (x == null || !Number.isFinite(+x)) return '–';
  const neg = +x < 0, a = Math.round(Math.abs(+x) * 1000) / 1000;
  let [ip, dp] = String(a).split('.');
  if (/e/i.test(ip)) { ip = Math.round(a).toLocaleString('en-US', { useGrouping: false }); dp = ''; }
  if (unit !== 'yılı') ip = grp(ip);
  return (neg ? '−' : '') + ip + (dp ? ',' + dp : '');
}
const unitLabel = (u) => (u === 'yılı' ? 'yıl' : u === 'yüzde' ? 'yüzde (%)' : String(u || '').replace(/^\.\s*/, '').trim());
const unitShort = (u) => (u === 'yılı' ? 'yıl' : u === 'yüzde' ? '%' : String(u || '').replace(/^\.\s*/, '').trim());
function withUnit(x, unit) {
  const n = numStr(x, unit);
  if (unit === 'yüzde') return '%' + n;
  if (!unit || unit === 'yılı') return n;
  if (unit.startsWith('.')) return n + unit;
  return n + ' ' + unit;
}
function diffStr(d, unit) {
  const n = numStr(d, '');
  if (unit === 'yılı') return `${n} yıl`;
  if (unit === 'yüzde') return `${n} puan`;
  if (!unit) return n;
  if (unit.startsWith('.')) return `${n} sıra`;
  return `${n} ${unit}`;
}
// sayaç tamburlarına yazılacak 7 karakter (ortalanmış); sığmazsa null
function drumStr(x, unit) {
  const s = numStr(x, unit).replace('−', '');
  if (s.length > NDR || s === '–') return null;
  const l = Math.floor((NDR - s.length) / 2);
  return ' '.repeat(l) + s + ' '.repeat(NDR - s.length - l);
}
const niceStep = (x) => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9)))); const m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
// şerit ölçeği: cevap ve "makul" tahminler sığar; çok uzaktakiler uçlarda okla gösterilir
function scaleOf(A, G, unit) {
  const ds = G.map((g) => Math.abs(g - A)).sort((a, b) => a - b);
  const med = ds.length ? ds[Math.floor(ds.length / 2)] : 0;
  const cap = Math.max(med * 3, Math.abs(A) * 0.04, 2, ds.length ? ds[0] * 1.5 : 0);
  let lo = A, hi = A;
  G.forEach((g) => { if (Math.abs(g - A) <= cap) { lo = Math.min(lo, g); hi = Math.max(hi, g); } });
  const minSpan = Math.max(Math.abs(A) * 0.02, unit === 'yılı' ? 6 : 4);
  if (hi - lo < minSpan) { const c = (lo + hi) / 2; lo = c - minSpan / 2; hi = c + minSpan / 2; }
  const pad = (hi - lo) * 0.1;
  lo -= pad; hi += pad;
  if (lo < 0 && A >= 0 && G.every((g) => g >= 0)) lo = 0;
  let step = niceStep((hi - lo) / 4.5);
  if (unit === 'yılı') step = Math.max(1, step);
  return { lo, hi, step };
}
const xOf = (sc, val) => clamp(TX0 + ((val - sc.lo) / (sc.hi - sc.lo)) * (TX1 - TX0), TX0, TX1);
const outOf = (sc, val) => (val < sc.lo ? -1 : val > sc.hi ? 1 : 0);

/* ============================ dokular ============================ */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
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
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  let s = 4242;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < d.data.length; i += 4) { const v = 200 + rnd() * 55; d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.9; d.data[i + 3] = 16; }
  g.putImageData(d, 0, 0);
  GRAIN = c;
  return c;
}
// makinenin ön yüzü (1024×640): başlık bandı, soru, tambur penceresi (tamburlar 3D olarak önünde), birim
function drawFace(cv, st) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fbf4e0'); bg.addColorStop(1, '#ecdfbd');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gr = grain();
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) g.drawImage(gr, x, y);
  g.fillStyle = TEAL; g.fillRect(0, 0, W, 88);
  g.fillStyle = BRASS; g.fillRect(0, 88, W, 7);
  g.fillStyle = '#ffffff'; g.font = `900 40px ${F}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('TAHMİN USTASI', 36, 46);
  g.textAlign = 'right'; g.fillStyle = '#ffe9a8'; g.font = `800 36px ${F}`;
  g.fillText(st.kind === 'q' ? `SORU ${st.q}/${st.qs}` : st.kind === 'f' ? 'SONUÇ' : 'ATÖLYE', W - 36, 48);
  const box = { x: 56, y: 108, w: W - 112, h: 228 };
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (st.kind === 'q' && st.text) {
    const L = wrapFit(g, st.text, box.w, box.h, 66, 30, (fs) => `800 ${fs}px ${F}`, 4);
    g.font = `800 ${L.fs}px ${F}`;
    const lh = L.fs * 1.18, y0 = box.y + box.h / 2 - ((L.lines.length - 1) * lh) / 2;
    L.lines.forEach((ln, i) => g.fillText(ln, W / 2, y0 + i * lh, box.w));
  } else {
    g.font = `900 60px ${F}`;
    g.fillText(st.kind === 'f' ? 'Şampiyonun puanı' : 'En yakın tahmin kazanır!', W / 2, box.y + 86, box.w);
    g.font = `700 32px ${F}`; g.fillStyle = '#5c4a3a';
    g.fillText(st.kind === 'f' ? 'sayaçta yazıyor' : 'Sorular birazdan makinede…', W / 2, box.y + 158, box.w);
  }
  g.fillStyle = '#121212'; rr(g, 80, 350, W - 160, 180, 16); g.fill();
  const sh = g.createLinearGradient(0, 350, 0, 530); sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(0.5, 'rgba(40,40,40,0)'); sh.addColorStop(1, 'rgba(0,0,0,.7)');
  g.fillStyle = sh; rr(g, 80, 350, W - 160, 180, 16); g.fill();
  const un = st.kind === 'q' ? unitLabel(st.unit) : st.kind === 'f' ? 'puan' : '';
  if (un) {
    g.font = `800 34px ${F}`;
    const tw = Math.min(W - 220, g.measureText(un).width + 60);
    g.fillStyle = TEAL; rr(g, W / 2 - tw / 2, 548, tw, 60, 30); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText(un, W / 2, 580, tw - 30);
  }
  g.fillStyle = BRASS;
  [[24, 122], [W - 24, 122], [24, H - 26], [W - 24, H - 26]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); });
}
// tambur şeridi (160×1792): 14 hücre, üstten alta 0-9 . , boşluk ?
function drawDrums(cv) {
  const g = cv.getContext('2d'), W = cv.width, CH = cv.height / NSYM;
  g.clearRect(0, 0, W, cv.height);
  for (let k = 0; k < NSYM; k++) {
    const y = k * CH;
    const bg = g.createLinearGradient(0, y, 0, y + CH); bg.addColorStop(0, '#e6dbbd'); bg.addColorStop(0.5, '#fbf6e8'); bg.addColorStop(1, '#e6dbbd');
    g.fillStyle = bg; g.fillRect(0, y, W, CH);
    g.fillStyle = 'rgba(28,22,51,.25)'; g.fillRect(0, y, W, 2); g.fillRect(0, y + CH - 2, W, 2);
    g.fillStyle = '#b8913f'; g.fillRect(0, y, 9, CH); g.fillRect(W - 9, y, 9, CH);
    const ch = SYM[k];
    if (ch === ' ') continue;
    g.fillStyle = ch === '?' ? TEAL : INK;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${ch === '.' || ch === ',' ? 120 : 108}px ${F}`;
    g.save(); g.translate(W / 2, y + CH / 2 + 6); g.scale(0.8, 1); g.fillText(ch, 0, 0); g.restore();
  }
}
// şerit metre yüzü (2048×160): sarı, uzak kenardan inen çentikler, ana çentiklerde sayılar
function drawTape(cv, sc, unit) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.fillStyle = TAPEC; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(120,80,0,.3)'); gr.addColorStop(0.2, 'rgba(255,255,255,.14)'); gr.addColorStop(0.8, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(120,80,0,.32)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = INK; g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3);
  const ux = (val) => ((xOf(sc, val) - TAPE_X0) / TAPE_L) * W;
  const lead = Number(String(sc.step / Math.pow(10, Math.floor(Math.log10(sc.step)))).slice(0, 1));
  const minor = sc.step / (lead === 2 ? 4 : 5);
  const first = Math.ceil(sc.lo / minor) * minor;
  // büyük sayılarda kısa yazım (300 bin, 1,2 mn); sığmayan yazı atlanır
  const lab = (val) => { const a = Math.abs(val); if (unit !== 'yılı' && a >= 1e6) return numStr(Math.round(val / 1e5) / 10, '') + ' mn'; if (unit !== 'yılı' && a >= 1e4) return numStr(Math.round(val / 100) / 10, '') + ' bin'; return numStr(Math.round(val * 1000) / 1000, unit); };
  let lastR = -1e9;
  g.fillStyle = INK;
  for (let k = 0, val = first; val <= sc.hi + 1e-9 && k < 400; k++, val = first + k * minor) {
    const x = ux(val), q = val / sc.step, major = Math.abs(q - Math.round(q)) < 1e-6, half = !major && Math.abs(q * 2 - Math.round(q * 2)) < 1e-6;
    g.fillRect(x - (major ? 2.5 : 1.5), 0, major ? 5 : 3, major ? 56 : half ? 36 : 24);
    if (major && x > 90 && x < W - 70) {
      g.font = `900 64px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const s = lab(val), w = g.measureText(s).width;
      if (x - w / 2 > lastR + 28 && x + w / 2 < W - 8) { g.fillText(s, x, 108); lastR = x + w / 2; }
    }
  }
}
// oyuncu tahtaları (1024×512): 4×3 hücre; beyaz tahtada kocaman sayı, altta oyuncunun rengi
function drawBoards(cv, v) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  (v.seats || []).forEach((p, i) => {
    if (i >= 12) return;
    const c = i % 4, r = Math.floor(i / 4), x = c * 256, y = r * 170;
    g.fillStyle = '#fbfbf6'; g.fillRect(x, y, 256, 170);
    g.fillStyle = pcol(p.c); g.fillRect(x, y + 150, 256, 20);
    const gv = (v.guesses || [])[i];
    const s = gv == null ? '?' : numStr(gv, v.unit);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 96;
    g.font = `900 ${fs}px ${F}`;
    while (fs > 28 && g.measureText(s).width > 226) { fs -= 4; g.font = `900 ${fs}px ${F}`; }
    g.save(); g.translate(x + 128, y + 76); g.rotate(hs(i, 7) * 0.08 - 0.04); g.fillText(s, 0, 0); g.restore();
  });
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
const backOut = (u) => { const x = clamp(u, 0, 1) - 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; };
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };
const rgbS = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

/* ============================ oyun ============================ */
class GuessGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'tus', cls: 'tus', title: 'Tahmin Ustası', sub: 'Ustanın atölyesi', emoji: '🔢', css: STYLE, snd: new TuSnd(), amb: 'diner', ambVol: 0.3, botPx: 300, botPxL: 34, cloth: '#2f6b4f', trim: BRASS, tea: false, place: false, chairPad: TEAL, lampHex: '#2b2b2b', light: WORK_L, fog: '#100d0b', roomStyle: { wall: '#2a231d', curtain: TEAL } });
    this.seen = new Map();
    this.ptEl = [];
    this.chipEl = [];
    this.tint = new Float32Array(3);
    this.sYaw = 0;
    this.sM = M.make(); this.sA = M.make(); this.sB = M.make(); this.sC = M.make();
    this.buf = { i: '', d: null };
    this.dLast = new Array(NDR).fill(13);
    this.zipV = 0.05;
    this.el.posS.textContent = '';
    this.chips = document.createElement('div'); this.chips.className = 'tu-chips'; this.el.wrap.appendChild(this.chips);
    this.ansEl = document.createElement('div'); this.ansEl.className = 'tu-ans'; this.el.wrap.appendChild(this.ansEl);
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.tuPed = this.mk(pedModel);
    W.tuBody = this.mk(bodyModel);
    W.tuFace = this.mk(faceQuad, 'tex');
    W.tuDrum = this.mk(drumModel, 'tex');
    W.tuBulb = this.mk((mb) => bulbModel(mb, -0.5));
    W.tuBulbL = this.mk((mb) => bulbModel(mb, 0.9));
    W.tuCrank = this.mk(crankModel);
    W.tuCase = this.mk(caseModel);
    W.tuBlade = this.mk(bladeModel);
    W.tuTape = this.mk(tapeQuad, 'tex');
    W.tuHook = this.mk(hookModel);
    W.tuShaft = this.mk(shaftModel);
    W.tuHead = this.mk(pinHeadModel);
    W.tuCone = this.mk(coneModel);
    W.tuLaser = this.mk(laserModel);
    W.tuGold = this.mk(goldModel);
    W.tuBoard = this.mk(boardModel);
    W.tuBoardQ = Array.from({ length: 12 }, (_, i) => this.mk((tb) => boardQuad(tb, i), 'tex'));
    W.trophy = this.mk(K.trophyModel);
    const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.faceCv = cv(1024, 640); this.faceTex = makeTexture(this.X, this.faceCv);
    this.drumCv = cv(160, 1792); drawDrums(this.drumCv); this.drumTex = makeTexture(this.X, this.drumCv);
    this.tapeCv = cv(2048, 160); this.tapeTex = makeTexture(this.X, this.tapeCv);
    this.boardCv = cv(1024, 512); this.boardTex = makeTexture(this.X, this.boardCv);
    this.faceKey = ''; this.tapeKey = ''; this.boardKey = ''; this.drumOk = true;
    try { document.fonts?.ready?.then(() => { if (!this.dead) { this.faceKey = ''; this.tapeKey = ''; this.boardKey = ''; this.drumOk = false; } }); } catch { /* yok */ }
  }
  freeTex() {
    const gl = this.X && this.X.gl;
    if (gl) [this.faceTex, this.drumTex, this.tapeTex, this.boardTex].forEach((t) => t && gl.deleteTexture(t));
    this.faceTex = this.drumTex = this.tapeTex = this.boardTex = null;
  }
  onDispose() {
    this.ptEl.forEach((e) => e && e.remove()); this.ptEl = [];
    this.chips?.remove(); this.ansEl?.remove();
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
  }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  inPlay() { const v = this.view; return !!v && (v.phase === 'question' || v.phase === 'reveal') && typeof v.text === 'string'; }
  revT() { const v = this.view; return v && v.phase === 'reveal' ? (this.sNow() - (v.at || 0)) / 1000 : -1; }
  landed() { return this.revT() >= T_LAND; }
  land() { return (this.vw || 1) > (this.vh || 1) * 1.1; }
  get ss() { return this.ssV || 1; }
  pc3(i) { const h = pcol(this.view?.seats?.[i]?.c ?? i); const c = rgb3(h); this.tint[0] = c[0]; this.tint[1] = c[1]; this.tint[2] = c[2]; return this.tint; }
  isBest(i) { const v = this.view; return !!v && (v.best || []).includes(i); }
  // ekranda gösterilen puan: açılışta işaret oturana kadar eskisi
  dispScore(i) {
    const v = this.view;
    if (!v) return 0;
    const sc = (v.scores || [])[i] || 0;
    if (v.phase === 'reveal' && !this.landed()) return sc - ((v.gains || [])[i] || 0);
    return sc;
  }

  /* ---------- girdi: tuş takımı ---------- */
  canType() { const v = this.view; return !!v && v.phase === 'question' && v.amIn && !v.closing && this.sNow() < (v.endsAt || 0); }
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'tu-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'tu-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'tu-k') this.key(b.dataset.k);
      else if (act === 'tu-send') this.sendGuess();
      else if (act === 'tu-open') { this.fx('pop'); this.ctx.send('reveal', {}); }
      else if (act === 'tu-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (!this.canType() || e.ctrlKey || e.metaKey || e.altKey) return;
      const tg = e.target && e.target.tagName;
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg)) return;
      let k = null;
      if (/^[0-9]$/.test(e.key)) k = e.key;
      else if (e.key === ',' || e.key === '.' || e.key === 'Decimal') k = ',';
      else if (e.key === 'Backspace') k = 'del';
      else if (e.key === 'Delete' || e.key === 'Escape') k = 'clr';
      else if (e.key === 'Enter') { e.preventDefault(); this.sendGuess(); return; }
      if (k) { e.preventDefault(); this.key(k); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  key(k) {
    if (!this.canType()) return;
    const B = this.buf;
    let ok = true;
    if (k === 'clr') { B.i = ''; B.d = null; }
    else if (k === 'del') { if (B.d != null) { if (B.d.length) B.d = B.d.slice(0, -1); else B.d = null; } else B.i = B.i.slice(0, -1); }
    else if (k === ',') { if (B.d == null) { if (!B.i) B.i = '0'; B.d = ''; } else ok = false; }
    else if (k === '000') { if (B.d != null || !B.i || B.i === '0' || B.i.length > 7) ok = false; else B.i += '000'; }
    else if (/^\d$/.test(k)) {
      if (B.d != null) { if (B.d.length >= 3) ok = false; else B.d += k; }
      else if (B.i === '0') B.i = k;
      else if (B.i.length >= 10) ok = false;
      else B.i += k;
    } else return;
    if (!ok) { this.fx('bad'); this.shake(); return; }
    this.fx(k === 'del' || k === 'clr' ? 'del' : 'key');
    vibrate(6);
    this.paintDisp();
  }
  bufStr() { const B = this.buf, v = this.view; if (!B.i) return ''; return (v && v.unit === 'yılı' ? B.i : grp(B.i)) + (B.d != null ? ',' + B.d : ''); }
  sendGuess(auto = false) {
    const v = this.view;
    if (!this.canType()) return;
    const B = this.buf;
    if (!B.i) { if (!auto) { this.fx('bad'); this.shake(); } return; }
    const val = B.i + (B.d ? '.' + B.d : '');
    if (!Number.isFinite(Number(val))) return;
    if (!auto) { this.fx('send'); vibrate(18); }
    this.seen.set(v.seats[v.me]?.id, this.time);
    this.ctx.send('guess', { value: val });
    this.pend = Number(val);
    B.i = ''; B.d = null;
    this.paintDisp();
  }
  shake() { const d = this.el.bar.querySelector('.tu-disp'); if (!d) return; d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
  paintDisp() {
    const v = this.view, d = this.el.bar.querySelector('.tu-disp');
    if (!d || !v) return;
    const s = this.bufStr(), mine = v.myGuess ?? this.pend ?? null;   // sunucu onaylayana kadar gönderdiğimiz
    const b = d.querySelector('b'), ph = d.querySelector('.ph'), u = d.querySelector('.u');
    const sent = !s && mine != null;
    d.classList.toggle('sent', sent);
    if (b) b.textContent = s || (sent ? numStr(mine, v.unit) : '');
    if (ph) ph.style.display = s || sent ? 'none' : '';
    if (u) u.style.display = s || sent ? '' : 'none';
    const sb = this.el.bar.querySelector('.tu-send');
    if (sb) sb.disabled = !s || !this.canType();
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.tus !== '1') { root.dataset.tus = '1'; root.innerHTML = '<p class="py-16 text-center">🔢</p>'; }
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
        if (!(v.picked || [])[i] || this.seen.has(p.id)) return;
        this.seen.set(p.id, this.time);
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
      this.seen = new Map((v.seats || []).filter((p, i) => (v.picked || [])[i]).map((p) => [p.id, -9]));
      this.buf = { i: '', d: null };
      this.pend = null; this.autoSent = false;
      this.tickSec = 0; this.upSeen = false;
      if (prev && prev.phase === 'reveal') this.zipV = 1;
      if (fresh) { this.fx('q'); if (this.zipV > 0.5) setTimeout(() => { if (!this.dead) this.fx('zipback'); }, 120); this.msg(`🔢 ${v.q}. SORU`, 'mid'); }
    }
    if (v.phase === 'reveal') {
      mus('mute');
      const rt = this.revT();
      this.prepReveal(v);
      // sonradan gelen (ya da sekmesi uyuyan) için geçmiş olaylar sessizce sayılır
      const late = rt > 0.25;
      this.ev = { board: late && rt >= T_BOARD, zip: late && rt >= T_ZIP, pins: late ? (this.pins || []).filter((P) => rt >= this.pinT(P.order)).length : 0, roll: late && rt >= T_ROLL, stop: late ? Array.from({ length: NDR }, (_, k) => k).filter((k) => rt >= this.drumT1(k)).length : 0, land: rt >= T_LAND + 0.4 };
      this.landT = this.ev.land ? this.time - 9 : null;
      if (this.ev.land) mus('race');
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.champFx = late;
      this.finStop = late ? NDR : 0;
      const c0 = (v.champ || [])[0];
      this.finStr = c0 != null ? drumStr((v.scores || [])[c0] || 0, '') : drumStr(0, '');
      if (!late) this.msg('🏁 TAHMİNLER BİTTİ', 'big');
    }
  }
  // açılış verileri: ölçek, iğneler (soldan sağa sıra), sayaç yazısı
  prepReveal(v) {
    const G = (v.guesses || []).map((g, i) => ({ g, i })).filter((o) => o.g != null && (v.inRound || [])[o.i]);
    this.sc = Number.isFinite(v.answer) ? scaleOf(v.answer, G.map((o) => o.g), v.unit) : null;
    this.ansStr = Number.isFinite(v.answer) ? drumStr(v.answer, v.unit) : null;
    const P = this.sc ? G.map((o) => ({ i: o.i, g: o.g, x: xOf(this.sc, o.g), out: outOf(this.sc, o.g), z: 0, order: 0 })) : [];
    P.sort((a, b) => a.x - b.x || a.i - b.i);
    let px = -9, k = 0;
    P.forEach((p, n) => { p.order = n; if (Math.abs(p.x - px) < 0.016) { k += 1; p.z = [0, -0.03, 0.03, -0.015, 0.015][k % 5]; } else { k = 0; px = p.x; } });
    this.pins = P;
    this.tapeKey = ''; this.boardKey = '';
  }
  pinT(order) { const n = (this.pins || []).length; return T_PIN + order * Math.min(0.11, 1.0 / Math.max(1, n)); }
  drumT1(k) { return T_ROLL + 0.75 + k * 0.18; }
  // işaret oturdu: sesler, mesajlar, puan baloncukları
  onLand() {
    const v = this.view;
    this.landT = this.time;
    try { this.snd.music('race'); } catch { /* yok */ }
    this.fx('land');
    this.cam.shake = Math.max(this.cam.shake, 0.25);
    const me = v.me, inR = me >= 0 && (v.inRound || [])[me];
    const g = me >= 0 ? (v.guesses || [])[me] : null, d = me >= 0 ? (v.diffs || [])[me] : null, rk = me >= 0 ? (v.ranks || [])[me] || 0 : 0, gain = me >= 0 ? (v.gains || [])[me] || 0 : 0;
    const anyG = (v.guesses || []).some((x) => x != null);
    const later = (n, ms) => setTimeout(() => { if (!this.dead) this.fx(n); }, ms);
    if (inR && g != null) {
      if (d === 0) { later('exact', 160); vibrate([20, 40, 20, 40, 30]); this.msg('🎯 TAM İSABET!', 'big'); }
      else if (rk === 1) { later('win', 160); vibrate([15, 30, 15]); this.msg('🥇 EN YAKIN SENSİN!', 'mid'); }
      else if (gain > 0) { later('near', 160); this.msg(rk === 2 ? '🥈 İKİNCİ YAKIN' : '🥉 ÜÇÜNCÜ YAKIN', 'mid'); }
      else { later('far', 160); this.msg('📏 Bu sefer uzak kaldın', 'mid'); }
    } else if (inR) { later('miss', 160); this.msg(anyG ? '⏰ Tahmin vermedin' : '🤷 Kimse tahmin etmedi', 'mid'); }
    else if (!anyG) { later('nobody', 300); this.msg('🤷 Kimse tahmin etmedi', 'mid'); }
    if (!(inR && d === 0) && (v.diffs || []).some((x) => x === 0)) later('kaching', 420);
    // tam isabetin iğnesinde ve başında konfeti
    if (this.X) (this.pins || []).forEach((P) => {
      if ((v.diffs || [])[P.i] !== 0) return;
      const w = this.standW(P.x, 0.006 + PIN_H + 0.03, TAPE_Z + P.z);
      this.burst(w[0], w[1], w[2], 36, [[1, 0.85, 0.3], [1, 1, 1], [0.95, 0.25, 0.25]], 1.5, 0.03, false, 1.3, 2.6);
      const a = this.avatarAt(P.i);
      if (a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.45, a.headW[2], 28, [[1, 0.85, 0.3], [0.56, 0.89, 0.85], [1, 1, 1]], 1.8, 0.035, false, 1.6, 2.2);
    });
    (v.gains || []).forEach((gn, i) => {
      if (!(gn > 0)) return;
      const e = this.ptBox(i);
      const ex = (v.diffs || [])[i] === 0;
      e.className = ex ? 'tu-pt ex' : 'tu-pt';
      e.textContent = `+${fmt(gn)}${ex ? ' 🎯' : (v.ranks || [])[i] <= 3 ? ' ' + MEDAL[(v.ranks || [])[i] - 1] : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
    });
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'tu-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- kürsü uzayı ---------- */
  stepStand(dt) {
    const c = this.cam;
    const yaw = Math.atan2(c.ex - c.tx, c.ez - c.tz);
    this.sYaw += angDiff(yaw, this.sYaw) * (1 - Math.exp(-4 * dt));
  }
  standW(x, y, z) {
    const s = this.ss, c = Math.cos(this.sYaw), sn = Math.sin(this.sYaw);
    return [(x * c + z * sn) * s, TABLE_Y + y * s, (-x * sn + z * c) * s];
  }
  // makine ön yüzündeki nokta (yüz uzayı: x sağ, y yukarı, k yüzden dışarı) → dünya
  faceW(x, y, k = 0) { return this.standW(x, F_CEN[1] + F_UP[1] * y + F_N[1] * k, F_CEN[2] + F_UP[2] * y + F_N[2] * k); }
  standMat() { return M.set(this.sM, 0, TABLE_Y + 0.002, 0, this.sYaw, 0, 0, this.ss); }
  // şeridin açıklığı: soruda sarılı, açılışta zaman çizelgesine göre
  zipK() {
    const v = this.view;
    if (v && v.phase === 'reveal') { const rt = this.revT(); return rt < T_ZIP ? 0.05 : rt < T_ZIP + ZIP_D ? lerp(0.05, 1, easeOut((rt - T_ZIP) / ZIP_D)) : 1; }
    return this.zipV ?? 0.05;
  }
  markerX() {
    const v = this.view, rt = this.revT();
    if (!this.sc || !v) return TX0;
    const xa = xOf(this.sc, v.answer), x0 = TAPE_X0 + 0.03;
    const u = clamp((rt - T_ROLL) / (T_LAND - T_ROLL), 0, 1);
    const s = u < 0.85 ? easeIO(u / 0.85) * 1.03 : 1.03 - 0.03 * easeOut((u - 0.85) / 0.15);
    return x0 + (xa - x0) * s;
  }
  // tamburun konumu (hücre cinsinden; tam sayıda öndeki hücre SYM[pos mod 14])
  drumPos(k) {
    const v = this.view, t = this.time;
    if (v && v.phase === 'reveal' && this.ansStr) {
      const rt = this.revT();
      if (rt < T_ROLL) return 13 + (rt > T_ROLL - 0.45 ? Math.sin(rt * 47 + k) * 0.06 : 0);
      const to = SYM.indexOf(this.ansStr[k]), total = 13 + ((((to - 13) % NSYM) + NSYM) % NSYM) + NSYM * (2 + k);
      return 13 + (total - 13) * easeOut((rt - T_ROLL) / (this.drumT1(k) - T_ROLL));
    }
    if (v && v.phase === 'final' && this.finStr) {
      const ft = (this.sNow() - (v.finAt || 0)) / 1000, t0 = 1.0, t1 = 1.0 + 0.7 + 0.15 * k;
      const to = SYM.indexOf(this.finStr[k]), total = 13 + ((((to - 13) % NSYM) + NSYM) % NSYM) + NSYM * (2 + k);
      return ft < t0 ? 13 : 13 + (total - 13) * easeOut((ft - t0) / (t1 - t0));
    }
    const ph = (t + k * 1.3) % 9;
    return 13 + (ph < 0.6 ? easeIO(ph / 0.6) * NSYM : 0);
  }
  crankAng() {
    let s = 0;
    for (let k = 0; k < NDR; k++) s += this.drumPos(k);
    return -(s / NDR - 13) * 0.55 + Math.sin(this.time * 1.3) * 0.05;
  }
  // ampuller: soruda kalan süre, açılışta koşan ışık, sonuçta altın
  bulbState(k, t, now) {
    const v = this.view;
    if (!v || v.phase === 'intro' || v.phase === 'final') { const on = (k + Math.floor(t * 6)) % 4 === 0; return [on, k % 2 ? MINT3 : GOLD3]; }
    if (v.phase === 'question') {
      if (v.closing) return [Math.floor(t * 8) % 2 === 0, WHITE3];
      const left = Math.max(0, (v.endsAt || 0) - now) / (v.answerMs || 25e3);
      const on = k < Math.ceil(left * BULB_N - 0.001) && (left > 0.2 || Math.floor(t * 5) % 2 === 0 || k < Math.ceil(left * BULB_N) - 1);
      return [on, left > 0.55 ? GREEN3 : left > 0.27 ? AMBER3 : RED3];
    }
    if (!this.landed()) return [(k + Math.floor(t * 14)) % 4 === 0, WHITE3];
    return [true, Math.floor(t * 3 + k) % 2 ? GOLD3 : MINT3];
  }
  // oyuncunun tahtası: açılışta kalkar, işaret oturunca iner (0..1)
  boardU(i) {
    const v = this.view;
    if (!v || v.phase !== 'reveal' || (v.guesses || [])[i] == null) return 0;
    const rt = this.revT();
    if (rt < T_BOARD + 0.15 || rt > T_LAND + 0.25) return 0;
    return backOut((rt - T_BOARD - 0.15) / 0.25) * clamp((T_LAND + 0.25 - rt) / 0.15, 0, 1);
  }
  boardMat(m, a, u) {
    const c = [(a.hw[0][0] + a.hw[1][0]) / 2, (a.hw[0][1] + a.hw[1][1]) / 2 + 0.01, (a.hw[0][2] + a.hw[1][2]) / 2];
    const f = 0.025;
    M.set(m, c[0] + Math.sin(a.yaw) * f, c[1], c[2] + Math.cos(a.yaw) * f, a.yaw, -0.12, 0, Math.max(0.001, u));
    return m;
  }

  /* ---------- karakterler ---------- */
  signPose(a, t, rt) {
    a.pose('rest', { t });
    a.k = 9;
    const u = easeOut((rt - T_BOARD) / 0.45);
    // tahta göğüs hizasında, çenenin altında (karakterlerin başı büyük: daha yukarıda başın içine girer)
    const y = lerp(0.86, 0.99, u) + Math.sin(t * 2.4 + a.pos[0]) * 0.008, z = lerp(0.34, 0.43, u);
    a.tgt.hand[1] = [0.165, y, z]; a.tgt.hand[0] = [-0.165, y, z];
    a.tgt.fdir[1] = [0.12, 1, 0.1]; a.tgt.fdir[0] = [-0.12, 1, 0.1];
    a.tgt.palm[1] = [-1, 0, 0.2]; a.tgt.palm[0] = [1, 0, 0.2];
    a.tgt.fw[0] = a.tgt.fw[1] = 1;
    a.tgt.pole[1] = [0.9, -0.4, -0.2]; a.tgt.pole[0] = [-0.9, -0.4, -0.2];
    a.shape = ['grip', 'grip'];
  }
  thumbPose(a, t, bob = 0) {
    a.pose('rest', { t });
    a.k = 10;
    const y = 1.12 + bob;
    a.tgt.hand[1] = [0.24, y, 0.34]; a.tgt.hand[0] = [-0.24, y, 0.34];
    a.tgt.fdir[1] = [0, 0.08, 1]; a.tgt.fdir[0] = [0, 0.08, 1];
    a.tgt.palm[1] = [-1, 0, 0]; a.tgt.palm[0] = [1, 0, 0];
    a.tgt.fw[0] = a.tgt.fw[1] = 1;
    a.tgt.pole[1] = [0.85, -0.5, -0.2]; a.tgt.pole[0] = [-0.85, -0.5, -0.2];
    a.shape = ['thumb', 'thumb'];
    a.handK = [1.45, 1.45];
  }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const mid = this.faceW(0, 0, 0.05), tapeMid = this.standW(0, 0.02, TAPE_Z);
    const rt = this.revT();
    const left = (v.endsAt || 0) - now;
    const champ = v.phase === 'final' ? v.champ || [] : [];
    const mk = rt >= T_ROLL && rt < T_LAND + 0.4 ? this.standW(this.markerX(), 0.05, TAPE_Z) : tapeMid;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.handK = null;
      const idle = a.tuI || (a.tuI = { lt: 0, look: null });
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
          const hurry = left < 5000;
          a.pose(hurry ? (hs(i, v.q) < 0.5 ? 'bite' : 'headgrab') : Math.floor(t / 3.4 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = hurry ? 'tense' : Math.floor(t / 2.7 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = Math.floor(t / 2.1 + i) % 4 ? mid : idleLook(0.4);
        } else { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        const g = (v.guesses || [])[i];
        if (!(v.inRound || [])[i]) { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        if (g == null) { a.pose(rt >= T_BOARD ? 'shrug' : 'clasp', { t }); a.expr = 'o'; a.look = mid; return; }
        if (rt < T_BOARD) { a.pose('clasp', { t }); a.expr = 'tense'; a.look = mid; return; }
        if (rt < T_LAND + 0.15) { this.signPose(a, t, rt); a.expr = rt < T_ROLL ? 'grin' : 'tense'; a.look = rt < T_PIN ? mid : mk; return; }
        const rk = (v.ranks || [])[i] || 0, gain = (v.gains || [])[i] || 0, d = (v.diffs || [])[i], su = rt - T_LAND;
        if (d === 0 || rk === 1) { a.pose(Math.floor(su / 1.1 + i) % 2 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; }
        else if (gain > 0) { a.pose(su < 1.4 ? 'clap' : 'rest', { t }); a.expr = 'smile'; }
        else { a.pose(su < 1.4 ? (hs(i, v.q) < 0.5 ? 'facepalm' : 'headgrab') : 'slump', { t }); a.expr = su < 1.4 ? 'wince' : 'sad'; }
        a.look = su < 1.2 ? tapeMid : idleLook(0.3);
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const pl = placeOf(v, i), medal = pl <= 3 && (v.scores || [])[i] > 0;
        if (champ.includes(i) && u > 0.6) { a.pose('cheer', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else if (medal && u > 0.6) { this.thumbPose(a, t, Math.abs(Math.sin(t * 6 + i)) * 0.04); a.expr = 'laugh'; a.look = idleLook(); }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; a.look = idleLook(); }
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
    if (!Ev.board && rt >= T_BOARD) { Ev.board = true; if ((v.guesses || []).some((g) => g != null)) this.fx('boards'); }
    if (!Ev.zip && rt >= T_ZIP) { Ev.zip = true; this.fx('zip'); }
    const P = this.pins || [];
    while ((Ev.pins || 0) < P.length && rt >= this.pinT(Ev.pins || 0)) { const k = Ev.pins || 0; Ev.pins = k + 1; this.fx('pin', P.length > 1 ? k / (P.length - 1) : 0.5); }
    if (!Ev.roll && rt >= T_ROLL) { Ev.roll = true; this.fx('drumroll', T_LAND - T_ROLL - 0.05); }
    while ((Ev.stop || 0) < NDR && rt >= this.drumT1(Ev.stop || 0)) { Ev.stop = (Ev.stop || 0) + 1; if (this.ansStr && this.ansStr[Ev.stop - 1] !== ' ') this.fx('clunk', Ev.stop / NDR); }
    if (!Ev.land && rt >= T_LAND) { Ev.land = true; this.onLand(); }
  }
  drumSounds() {
    const v = this.view;
    const rolling = v && ((v.phase === 'reveal' && this.revT() >= T_ROLL && this.revT() < T_LAND) || (v.phase === 'final' && this.sNow() - (v.finAt || 0) < 3200));
    let moved = 0;
    for (let k = 0; k < NDR; k++) { const p = Math.round(this.drumPos(k)); if (p !== this.dLast[k]) { moved += Math.min(3, Math.abs(p - this.dLast[k])); this.dLast[k] = p; } }
    if (rolling && moved && this.time - (this.tkT || 0) > 0.045) { this.tkT = this.time; this.fx('tk', Math.min(1, moved / 6)); }
  }
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = this.land();
    const t = this.time, now = this.sNow();
    const ssT = clamp((this.R * Math.min(1, this.kz) - 0.6) / 0.8, 0.75, 1.4);
    this.ssV = this.ssV ? damp(this.ssV, ssT, 3, dt) : ssT;
    this.stepStand(dt);
    if (v.phase === 'reveal') this.revEvents();
    else this.zipV = damp(this.zipV ?? 0.05, 0.05, 7, dt);
    this.drumSounds();
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'question' && v.amIn) {
      if (v.myGuess == null && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
      // yazıp gönder'e basmayı unutan: son anda yazdığı gönderilir
      if (!this.autoSent && left > 0 && left < 700 && this.buf.i && !v.closing) { this.autoSent = true; this.sendGuess(true); }
      if (left <= 0 && !this.upSeen && v.myGuess == null) { this.upSeen = true; this.fx('timeup'); }
    }
    if (v.phase === 'final' && !this.champFx && t - (this.finT || 0) >= 1.1) {
      this.champFx = true;
      if ((v.champ || []).length) {
        this.fx('champ');
        const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
        this.msg(`🏆 ${nm}`, 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, [[1, 0.85, 0.3], [1, 1, 1], [0.56, 0.89, 0.85]], 2.6, 0.04, false, 2.2, 2.4); });
      }
    }
    if (v.phase === 'final') { while ((this.finStop || 0) < NDR && (now - (v.finAt || 0)) / 1000 >= 1.7 + 0.15 * (this.finStop || 0)) { this.finStop = (this.finStop || 0) + 1; this.fx('clunk', this.finStop / NDR); } }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'question' || v.phase === 'reveal') {
      const zk = clamp((this.ss / 1.4) * (2.26 / Math.max(1.5, this.Rs)), 0.68, 1.15);
      pa = land ? -0.02 : -0.08; bp = Math.max(170, this.barH || 300); sx = land ? 0.29 : 0.5;
      const wide = v.phase === 'reveal' && this.revT() > 0.5;
      if (wide) { const A = this.faceW(-0.05, WIN_Y), B = this.standW(-0.06, 0, TAPE_Z); H = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]; }
      else H = this.faceW(0, 0.02);
      if (land) { zoom = (wide ? 0.58 : 0.47) * zk; sy = 0.5; sx = wide ? 0.26 : 0.25; }
      else {
        const vh = this.vh || 844, free = Math.max(160, vh - bp - 100);
        zoom = (wide ? 0.37 : 0.2) * zk * clamp(430 / free, 1, 1.7);
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
    this.placeChips();
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
  // iğne etiketleri (HTML): üst üste binmesinler diye satır satır dizilir
  chip(i) {
    let e = this.chipEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'tu-chip'; e.innerHTML = '<i></i><span></span>'; this.chips.appendChild(e); this.chipEl[i] = e; }
    return e;
  }
  placeChips() {
    const v = this.view;
    const on = !!v && v.phase === 'reveal' && !this.flat && this.zipK() > 0.999 && !!this.sc;
    const rt = this.revT();
    const used = new Set();
    if (on) {
      const L = [];
      (this.pins || []).forEach((P) => {
        if (rt < this.pinT(P.order) + 0.12) return;
        const q = this.project(...this.standW(P.x, 0.006 + PIN_H + 0.06, TAPE_Z + P.z));
        if (!q) return;
        const e = this.chip(P.i);
        const txt = `${P.out < 0 ? '◀ ' : ''}${numStr(P.g, v.unit)}${P.out > 0 ? ' ▶' : ''}`;
        if (e._t !== txt) { e._t = txt; e.lastChild.textContent = txt; e.style.setProperty('--pc', pcol(v.seats[P.i]?.c ?? 0)); e._w = 0; }
        const best = this.landed() && this.isBest(P.i);
        e.classList.toggle('best', best);
        e.classList.toggle('me', P.i === v.me);
        L.push({ e, x: q[0], y: q[1], best, me: P.i === v.me });
        used.add(P.i);
      });
      L.sort((a, b) => (b.best - a.best) || (b.me - a.me) || a.x - b.x);
      const rows = [];
      L.forEach((o) => {
        o.e.classList.remove('tiny');
        if (!o.e._w) o.e._w = o.e.offsetWidth || 60;
        const w = o.e._w + 4;
        let r = 0;
        for (; r < 3; r++) { const R = rows[r] || (rows[r] = []); if (R.every(([a, b]) => o.x + w / 2 < a || o.x - w / 2 > b)) { R.push([o.x - w / 2, o.x + w / 2]); break; } }
        if (r >= 3) { o.e.classList.add('tiny'); r = 0; }   // yer kalmadı: yalnızca renkli nokta
        o.e.style.left = `${o.x.toFixed(1)}px`; o.e.style.top = `${(o.y - r * 21).toFixed(1)}px`;
        o.e.classList.add('on');
      });
    }
    this.chipEl.forEach((e, i) => { if (e && !used.has(i)) e.classList.remove('on'); });
    // cevap etiketi: şeridin önünde, işaretin altında
    const ae = this.ansEl;
    if (on && this.landed() && Number.isFinite(v.answer)) {
      const q = this.project(...this.standW(xOf(this.sc, v.answer), 0, TAPE_Z + TAPE_W / 2 + 0.17));
      if (q) {
        const txt = `🎯 ${withUnit(v.answer, v.unit)}`;
        if (ae._t !== txt) { ae._t = txt; ae.textContent = txt; }
        const w = ae.offsetWidth || 120, vw = this.vw || 400;
        ae.style.left = `${clamp(q[0], w / 2 + 6, vw - w / 2 - 6).toFixed(1)}px`; ae.style.top = `${(q[1] + 4).toFixed(1)}px`;
        ae.classList.add('on');
      }
    } else ae.classList.remove('on');
  }
  placePts() {
    const v = this.view;
    const rev = !!v && v.phase === 'reveal' && this.landed() && !this.flat;
    for (let i = 0; i < this.ptEl.length; i++) {
      const e = this.ptEl[i];
      if (!e) continue;
      if (!rev) { if (e.classList.contains('go')) e.className = 'tu-pt'; continue; }
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
    if (!Wd || !Wd.tuPed || !v) return;
    const m = this.mats.b, T = this.T, t = this.time, now = this.sNow();
    const SM = this.standMat();
    D(Wd.tuPed, SM, T.obj);
    D(Wd.tuBody, SM, T.obj);
    M.set(this.sA, CRANK[0], CRANK[1], CRANK[2], 0, this.crankAng(), 0, 1); M.mul(m, SM, this.sA); D(Wd.tuCrank, m, T.obj);
    if (!shadow) {
      M.set(this.sA, F_CEN[0], F_CEN[1], F_CEN[2], 0, -M_TILT, 0, 1);
      M.mul(this.sC, SM, this.sA);
      for (let k = 0; k < BULB_N; k++) {
        const [on, col] = this.bulbState(k, t, now);
        M.set(this.sB, bulbX(k), BULB_Y, 0.026, 0, 0, 0, 1); M.mul(m, this.sC, this.sB);
        D(on ? Wd.tuBulbL : Wd.tuBulb, m, on ? col : OFF3);
      }
    }
    // şerit metre: kutu, şerit, kanca
    M.set(this.sA, CASE_X, 0, TAPE_Z, 0, 0, 0, 1); M.mul(m, SM, this.sA); D(Wd.tuCase, m, T.obj);
    const zk = this.zipK(), L = TAPE_L * zk;
    M.set(this.sA, TAPE_X0, 0, TAPE_Z, 0, 0, 0, L, 1, 1); M.mul(m, SM, this.sA); D(Wd.tuBlade, m, T.obj);
    M.set(this.sA, TAPE_X0 + L, 0, TAPE_Z, 0, 0, 0, 1); M.mul(m, SM, this.sA); D(Wd.tuHook, m, T.obj);
    // iğneler ve kırmızı işaret
    if (v.phase === 'reveal' && zk > 0.999 && this.sc) {
      const rt = this.revT(), lnd = this.landed();
      (this.pins || []).forEach((P) => {
        const t0 = this.pinT(P.order);
        if (rt < t0) return;
        const u = backOut((rt - t0) / 0.25);
        const wob = lnd && this.isBest(P.i) ? Math.sin(t * 6 + P.i) * 0.08 : 0;
        M.set(this.sA, P.x, 0.006, TAPE_Z + P.z, 0, 0, -P.out * 0.45 + wob, 1, Math.max(0.001, u), 1); M.mul(m, SM, this.sA);
        D(Wd.tuShaft, m, T.obj);
        D(Wd.tuHead, m, this.pc3(P.i));
      });
      if (rt >= T_ROLL) {
        const xm = this.markerX(), bob = lnd ? Math.sin(t * 3) * 0.01 : 0;
        M.set(this.sA, xm, 0.05, TAPE_Z + TAPE_W / 2 + 0.012 + Math.abs(bob), 0, 0, 0, 1); M.mul(m, SM, this.sA); D(Wd.tuCone, m, T.obj);
        if (!shadow) {
          M.set(this.sA, xm, 0.0068, TAPE_Z, 0, 0, 0, 1); M.mul(m, SM, this.sA); D(Wd.tuLaser, m, RED3);
          if (lnd) {
            const xa = xOf(this.sc, v.answer);
            (this.pins || []).forEach((P) => {
              if (!this.isBest(P.i) || Math.abs(P.x - xa) < 0.004) return;
              M.set(this.sA, Math.min(P.x, xa), 0.0069, TAPE_Z + TAPE_W / 2 - 0.016, 0, 0, 0, Math.abs(P.x - xa), 1, 1); M.mul(m, SM, this.sA);
              D(Wd.tuGold, m, GOLD3);
            });
          }
        }
      }
    }
    // oyuncuların tahtaları
    if (v.phase === 'reveal') this.seats.forEach((p, i) => { const u = this.boardU(i), a = this.av.get(p.id); if (u > 0 && a) D(Wd.tuBoard, this.boardMat(m, a, u), T.obj); });
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
  faceState() {
    const v = this.view, inP = this.inPlay();
    return { kind: inP ? 'q' : v && v.phase === 'final' ? 'f' : 'i', q: v?.q || 0, qs: v?.qs || 0, text: inP ? v.text : '', unit: inP ? v.unit : '' };
  }
  faceStateKey() { const s = this.faceState(); return `${s.kind}|${this.view?.game}|${s.q}|${s.qs}|${s.text}|${s.unit}`; }
  // dokulu: makinenin yüzü, tamburlar, şerit metre, tahtalar
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.tuFace || !v || !this.faceTex) return;
    const fk = this.faceStateKey();
    if (fk !== this.faceKey) { this.faceKey = fk; try { drawFace(this.faceCv, this.faceState()); updateTexture(X, this.faceTex, this.faceCv); } catch (e) { console.warn('[tus] yüz', e); } }
    if (!this.drumOk) { this.drumOk = true; try { drawDrums(this.drumCv); updateTexture(X, this.drumTex, this.drumCv); } catch { /* yok */ } }
    const SM = this.standMat();
    gl.uniform1f(X.tex.u.uSelf, 0.42);
    gl.bindTexture(gl.TEXTURE_2D, this.faceTex);
    drawMesh(X, Wd.tuFace, SM, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0.3);
    gl.bindTexture(gl.TEXTURE_2D, this.drumTex);
    M.set(this.sA, F_CEN[0], F_CEN[1], F_CEN[2], 0, -M_TILT, 0, 1);
    M.mul(this.sC, SM, this.sA);
    for (let k = 0; k < NDR; k++) {
      M.set(this.sB, drumX(k), WIN_Y, -(DR - DP), 0, (-this.drumPos(k) * TAU) / NSYM, 0, 1);
      M.mul(this.mats.c, this.sC, this.sB);
      drawMesh(X, Wd.tuDrum, this.mats.c, ONE3);
    }
    if (v.phase === 'reveal' && this.sc && this.zipK() > 0.999) {
      const tk = `${v.game}|${v.q}`;
      if (tk !== this.tapeKey) { this.tapeKey = tk; try { drawTape(this.tapeCv, this.sc, v.unit); updateTexture(X, this.tapeTex, this.tapeCv); } catch (e) { console.warn('[tus] şerit', e); } }
      gl.uniform1f(X.tex.u.uSelf, 0.35);
      gl.bindTexture(gl.TEXTURE_2D, this.tapeTex);
      drawMesh(X, Wd.tuTape, SM, ONE3);
    }
    if (v.phase === 'reveal' && this.seats.some((p, i) => this.boardU(i) > 0)) {
      const bk = `${v.game}|${v.q}`;
      if (bk !== this.boardKey) { this.boardKey = bk; try { drawBoards(this.boardCv, v); updateTexture(X, this.boardTex, this.boardCv); } catch (e) { console.warn('[tus] tahta', e); } }
      gl.uniform1f(X.tex.u.uSelf, 0.5);
      gl.bindTexture(gl.TEXTURE_2D, this.boardTex);
      this.seats.forEach((p, i) => { const u = this.boardU(i), a = this.av.get(p.id); if (u > 0 && a && i < 12) drawMesh(X, Wd.tuBoardQ[i], this.boardMat(this.mats.c, a, u), ONE3); });
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
    const t = this.time, now = this.sNow(), ss = this.ss;
    for (let k = 0; k < BULB_N; k++) { const [on, col] = this.bulbState(k, t, now); if (on) this.glow(m, this.faceW(bulbX(k), BULB_Y, 0.04), 0.075 * ss, col, 0.32); }
    if (v.phase === 'reveal' && this.sc && this.zipK() > 0.999) {
      const rt = this.revT();
      if (rt >= T_ROLL) this.glow(m, this.standW(this.markerX(), 0.05, TAPE_Z + TAPE_W / 2 + 0.07), 0.2 * ss, RED3, 0.35);
      if (this.landed()) {
        const fade = Math.max(0.35, 1 - (t - (this.landT ?? t)) / 2.5);
        (this.pins || []).forEach((P) => { if (this.isBest(P.i)) this.glow(m, this.standW(P.x, 0.006 + PIN_H + 0.018, TAPE_Z + P.z), 0.2 * ss, GOLD3, 0.42 * fade); });
        this.glow(m, this.faceW(0, WIN_Y, 0.08), 0.95 * ss, MINT3, 0.15 * fade);
      }
    }
    if (v.phase === 'final') (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (a && a.headW) this.glow(m, [a.headW[0], a.headW[1] + 0.1, a.headW[2]], 0.9, GOLD3, 0.18 + 0.05 * Math.sin(t * 3)); });
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="tu-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="tu-seg" role="group" aria-label="Soru sayısı"><button data-act="tu-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 8 soru</button><button data-act="tu-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🏆 Uzun · 15 soru</button></div>`; }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  head(v) {
    const un = unitLabel(v.unit);
    return `<small><span class="st">🔢 SORU ${v.q}/${v.qs}</span>${un ? `<span class="un">${esc(un)}</span>` : ''}${v.phase === 'reveal' ? '<span>· SONUÇ</span>' : ''}</small><div class="tx">${esc(v.text || '')}</div>`;
  }
  pad() {
    const k = (x, cls = '', lab = x) => `<button class="${cls}" data-act="tu-k" data-k="${x}">${lab}</button>`;
    return `<div class="tu-pad">${['1', '2', '3', '4', '5', '6', '7'].map((x) => k(x)).join('')}${k('8')}${k('9')}${k('0', 'w2')}${k('000', 'op')}${k(',', 'op')}${k('del', 'bk', '⌫')}</div>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost, now = this.sNow();
    if (v.phase === 'question') {
      const mine = v.myGuess ?? null, left = (v.endsAt || 0) - now;
      const canOpen = host && !v.closing && v.answered > 0 && v.answered < v.total && now - (v.at || 0) > 5000;
      const z = v.closing ? 'Herkes tahmin etti!' : mine != null ? `✓ Tahminin <b>${esc(withUnit(mine, v.unit))}</b> · süre bitene kadar değiştirebilirsin` : '🎯 En yakın tahmin kazanır · tam isabet +500';
      const warn = !v.closing && mine == null && left < 6000;
      key = `q|${v.game}|${v.q}|${mine}|${v.answered}|${v.total}|${v.closing}|${v.amIn}|${canOpen}|${warn}`;
      const inp = v.amIn
        ? `<div class="tu-in"><div class="tu-disp"><span class="ph">Tahminini yaz…</span><b></b><span class="u">${esc(unitShort(v.unit))}</span><button class="x" data-act="tu-k" data-k="clr" aria-label="Temizle">✕</button></div><button class="tu-send" data-act="tu-send" disabled>Gönder ✓<small>${mine == null ? 'tahminim bu' : 'değiştir'}</small></button></div>${this.pad()}`
        : '<div class="tu-watch">👀 Bu soruda izliyorsun; sıradaki soruda sen de tahmin edeceksin.</div>';
      html = `<div class="tu-box"><div class="tu-q">${this.head(v)}</div>${inp}
        <div class="tu-ft"><span class="n">✋ ${v.answered}/${v.total}</span><span class="z${warn && v.amIn ? ' w' : ''}">${warn && v.amIn ? '⏳ Süre bitiyor, tahminini gönder!' : z}</span>${canOpen ? '<button class="tu-b sm" data-act="tu-open">Beklemeden aç ⏩</button>' : ''}</div>
        ${this.timerBar()}</div>`;
      if (this.setBar(key, html) !== false) this.paintDisp();
      return;
    }
    if (v.phase === 'reveal') {
      const rt = this.revT(), lnd = this.landed();
      const me = v.me, inR = me >= 0 && (v.inRound || [])[me];
      const canNext = lnd && host && now - (v.at || 0) >= (v.nextMinMs || 5500);
      const last = v.q >= v.qs;
      const stage = rt < T_PIN ? 0 : rt < T_ROLL ? 1 : !lnd ? 2 : 3;
      let res;
      if (stage === 0) res = '<span class="m">🪧 Herkes tahtasını kaldırıyor…</span>';
      else if (stage === 1) res = '<span class="m">📏 Tahminler şeride diziliyor…</span>';
      else if (stage === 2) res = '<span class="m">🎰 Sayaç dönüyor…</span>';
      else {
        const g = me >= 0 ? (v.guesses || [])[me] : null, d = me >= 0 ? (v.diffs || [])[me] : null, rk = me >= 0 ? (v.ranks || [])[me] || 0 : 0, gain = me >= 0 ? (v.gains || [])[me] || 0 : 0;
        let mi = '';
        if (inR && g != null) mi = `<span>Tahminin ${esc(withUnit(g, v.unit))}</span><em>${d === 0 ? '🎯 tam isabet!' : `${esc(diffStr(d, v.unit))} fark`}</em><em class="${gain > 0 ? 'g' : 'r'}">${rk && rk <= 3 && gain > 0 ? MEDAL[rk - 1] + ' ' : ''}${gain > 0 ? `+${fmt(gain)}` : '0 puan'}</em>`;
        else if (inR) mi = '<em class="r">⏰ Tahmin vermedin</em>';
        else { const b0 = (v.best || [])[0]; mi = b0 != null ? `<span>En yakın: ${esc(nm0(v.seats[b0]?.n || ''))}</span>` : '<span>Kimse tahmin etmedi</span>'; }
        res = `<span class="a">Cevap: <b>${esc(withUnit(v.answer, v.unit))}</b></span><span class="mi">${mi}</span>`;
      }
      key = `r|${v.game}|${v.q}|${stage}|${canNext}`;
      html = `<div class="tu-box"><div class="tu-q">${this.head(v)}</div>
        <div class="tu-res">${res}</div>
        <div class="tu-rk">${lnd ? this.rankLine(v) : '&nbsp;'}</div>
        ${canNext ? `<div class="tu-row"><button class="tu-b" data-act="tu-next">${last ? 'Sonuçlara geç 🏁' : 'Sıradaki soru ▶'}</button></div>` : ''}
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
      html = `<div class="card tu-intro">
        <div class="tt">🔢 Tahmin Ustası</div>
        <div class="sub">Sayısal bir soru gelir: yıl, metre, kilometre… Cevabı bilmek şart değil, en yakın tahmin kazanır!</div>
        <div class="tu-ru"><div style="background:#e3f1ec"><b>⏱️</b>25 saniye</div><div style="background:#fff3c4"><b>📏</b>En yakına 1.000</div><div style="background:#ffe1df"><b>🎯</b>Tam isabet +500</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="tu-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Tahminini tuş takımıyla yaz; süre bitene kadar değiştirebilirsin. 2. yakın 600, 3. yakın 300 puan alır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.sharp) aw.push(`<div><b>🎯</b><span>Tam isabet<em>${nm(v.sharp.i)} · ${v.sharp.n} kez</em></span></div>`);
      if (v.close) aw.push(`<div><b>📏</b><span>Kıl payı<em>${nm(v.close.i)} · ${esc(withUnit(v.close.g, v.close.unit))} dedi, cevap ${esc(withUnit(v.close.a, v.close.unit))}</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤷</b><span>Bu sefer kimse puan alamadı!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>👑 ${S[i]?.wins ?? 0} · 🎯 ${S[i]?.exact ?? 0} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Tahminler bitti!</div>
        <div class="sub">${v.qs} soruda sayıya en çok kim yaklaştı?</div>
        <div class="tu-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="tu-aw">${aw.join('')}</div>` : ''}
        <div class="tu-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="tu-start" ${wait ? 'disabled' : ''}>🔁 Yeni tahminler</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const lnd = this.landed(), rt = this.revT();
    const TOP = { question: `${v.q}/${v.qs} · ✋ ${v.answered ?? 0}/${v.total ?? 0} · ⏱ ${mmss(left)}`, reveal: `${v.q}/${v.qs} · ${lnd ? `🎯 ${withUnit(v.answer, v.unit)}` : rt >= T_ROLL ? '🎰 sayaç dönüyor' : '📏 tahminler'}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.tu-tm i');
    const tot = v.phase === 'question' ? v.answerMs || 25e3 : v.phase === 'reveal' ? v.revealMs || 8500 : 0;
    if (tm && tot) {
      const u = clamp(left / tot, 0, 1);
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      if (v.phase === 'question') tm.style.setProperty('--tc', left > 12000 ? '#2fbf71' : left > 6000 ? '#f2b200' : '#ff4f5e');
      else tm.style.setProperty('--tc', '#1f6f6a');
    }
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase !== 'intro') x += `<span class="tu-sc">${fmt(this.dispScore(i))}</span>`;
      if (v.phase === 'question' && (v.picked || [])[i]) x += '<span>✍️</span>';
      if (v.phase === 'reveal' && lnd) {
        const rk = (v.ranks || [])[i] || 0, gn = (v.gains || [])[i] || 0;
        if ((v.diffs || [])[i] === 0) x += '<span>🎯</span>';
        else if (rk && rk <= 3 && gn > 0) x += `<span>${MEDAL[rk - 1]}</span>`;
      }
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${MEDAL[pl - 1]}</span>`; }
      if (o.tuK !== x) {
        o.tuK = x;
        let el = o.lbl.querySelector('.tu-x');
        if (!el) { el = document.createElement('span'); el.className = 'tu-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.tu-x')) o.tuK = '';
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
    g.fillStyle = '#100d0b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6b4f';
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.86, L.r * 0.68, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = BRASS; g.stroke();
    this.draw2dGame(g, L);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const v = this.view, lnd = this.landed();
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = '#ffe9c7'; g.fillText(fmt(this.dispScore(i)), x, y + 45); }
      if (v && v.phase === 'question' && (v.picked || [])[i]) { g.font = `15px ${EMO_FONT}`; g.fillText('✍️', x, y); }
      if (v && v.phase === 'reveal' && (v.inRound || [])[i]) {
        const gv = (v.guesses || [])[i];
        if (gv != null && this.revT() >= T_BOARD && this.revT() < T_LAND + 0.25) {
          const s = numStr(gv, v.unit);
          g.font = '900 12px system-ui';
          const tw = g.measureText(s).width + 12;
          g.fillStyle = '#fbfbf6'; g.strokeStyle = '#1c1633'; g.lineWidth = 2;
          rr(g, x - tw / 2, y - 9, tw, 18, 4); g.fill(); g.stroke();
          g.fillStyle = INK; g.fillText(s, x, y);
        } else if (lnd) {
          const rk = (v.ranks || [])[i] || 0, gn = (v.gains || [])[i] || 0;
          const e = (v.diffs || [])[i] === 0 ? '🎯' : rk && rk <= 3 && gn > 0 ? MEDAL[rk - 1] : '';
          if (e) { g.font = `20px ${EMO_FONT}`; g.fillText(e, x, y); }
        }
      }
    });
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    // makinenin yüzü
    const pw = Math.min(L.r * 0.94, L.w * 0.56), ph = pw * (FH / FW), px = L.cx - pw / 2, py = L.cy - ph / 2 - L.r * 0.19;
    if (!this.face2) { this.face2 = document.createElement('canvas'); this.face2.width = 1024; this.face2.height = 640; }
    const fk = this.faceStateKey();
    if (fk !== this.face2Key) { this.face2Key = fk; try { drawFace(this.face2, this.faceState()); } catch { /* yok */ } }
    g.save(); g.translate(2, 3); g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, px, py, pw, ph, 6); g.fill(); g.restore();
    g.drawImage(this.face2, px, py, pw, ph);
    g.lineWidth = 3; g.strokeStyle = BRASS; rr(g, px, py, pw, ph, 6); g.stroke();
    // sayaç
    const wx = px + pw * (92 / 1024), ww = pw * (840 / 1024), wy = py + ph * (350 / 640), wh = ph * (180 / 640);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < NDR; k++) {
      const pos = this.drumPos(k), n = Math.round(pos), sym = SYM[((n % NSYM) + NSYM) % NSYM];
      const cx = wx + (ww * (k + 0.5)) / NDR, cw = ww / NDR - 4;
      g.fillStyle = '#f4ecd6'; rr(g, cx - cw / 2, wy + wh * 0.16, cw, wh * 0.68, 4); g.fill();
      g.save(); g.beginPath(); g.rect(cx - cw / 2, wy + wh * 0.16, cw, wh * 0.68); g.clip();
      g.fillStyle = sym === '?' ? TEAL : INK; g.font = `900 ${Math.round(wh * 0.5)}px ${F}`;
      if (sym !== ' ') g.fillText(sym, cx, wy + wh / 2 + (pos - n) * wh * 0.5);
      g.restore();
    }
    for (let k = 0; k < BULB_N; k++) { const [on, col] = this.bulbState(k, t, now); g.fillStyle = on ? rgbS(col) : '#3a2c22'; g.beginPath(); g.arc(px + pw * (0.5 + bulbX(k) / FW), py - 7, 3.2, 0, TAU); g.fill(); }
    // şerit metre
    const ty = py + ph + Math.max(36, L.r * 0.27), tw = pw * 1.14, tx0 = L.cx - tw / 2 + 14, th = 14;
    const zk = this.zipK();
    g.lineWidth = 2; g.strokeStyle = INK;
    g.fillStyle = TAPEC; rr(g, tx0, ty, Math.max(4, tw * zk), th, 3); g.fill(); g.stroke();
    g.fillStyle = TAPEC; rr(g, tx0 - 28, ty - 9, 30, 30, 8); g.fill(); g.stroke();
    g.fillStyle = REDC; g.beginPath(); g.arc(tx0 - 13, ty + 6, 5, 0, TAU); g.fill();
    if (v.phase === 'reveal' && zk > 0.999 && this.sc) {
      const sc = this.sc, X2 = (x) => tx0 + ((x - TAPE_X0) / TAPE_L) * tw, rt = this.revT(), lnd = this.landed();
      const first = Math.ceil(sc.lo / sc.step) * sc.step;
      g.fillStyle = INK; g.font = '800 9px system-ui'; g.textAlign = 'center';
      for (let k = 0, val = first; val <= sc.hi + 1e-9 && k < 40; k++, val = first + k * sc.step) {
        const x = X2(xOf(sc, val));
        g.fillRect(x - 0.75, ty, 1.5, 6);
        g.fillText(numStr(Math.round(val * 1000) / 1000, v.unit), x, ty + 11);
      }
      const rows = [];
      (this.pins || []).forEach((P) => {
        if (rt < this.pinT(P.order)) return;
        const x = X2(P.x), u = backOut((rt - this.pinT(P.order)) / 0.25);
        g.strokeStyle = '#c9ced6'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, ty); g.lineTo(x + P.out * 6, ty - 22 * u); g.stroke();
        g.fillStyle = pcol(v.seats[P.i]?.c ?? 0); g.strokeStyle = INK; g.lineWidth = 1.5;
        g.beginPath(); g.arc(x + P.out * 6, ty - 22 * u, 5, 0, TAU); g.fill(); g.stroke();
        const s = `${P.out < 0 ? '◀' : ''}${numStr(P.g, v.unit)}${P.out > 0 ? '▶' : ''}`;
        g.font = '900 10px system-ui';
        const w = g.measureText(s).width + 10;
        let r = 0;
        for (; r < 2; r++) { const R = rows[r] || (rows[r] = []); if (R.every(([a, b]) => x + w / 2 < a || x - w / 2 > b)) { R.push([x - w / 2, x + w / 2]); break; } }
        if (r < 2) {
          const y = ty - 36 - r * 15, best = lnd && this.isBest(P.i);
          g.fillStyle = best ? '#ffd23f' : '#ffffff'; rr(g, x - w / 2, y - 7, w, 14, 7); g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
          g.fillStyle = INK; g.fillText(s, x, y + 0.5);
        }
      });
      if (rt >= T_ROLL) {
        const x = X2(this.markerX());
        g.fillStyle = REDC; g.fillRect(x - 1.5, ty - 2, 3, th + 4);
        g.beginPath(); g.moveTo(x, ty - 4); g.lineTo(x - 8, ty - 18); g.lineTo(x + 8, ty - 18); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
        if (lnd) {
          const s = `🎯 ${withUnit(v.answer, v.unit)}`;
          g.font = '900 12px system-ui';
          const w = g.measureText(s).width + 14;
          const xx = clamp(x, w / 2 + 4, L.w - w / 2 - 4);
          g.fillStyle = REDC; rr(g, xx - w / 2, ty + th + 3, w, 18, 6); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
          g.fillStyle = '#fff'; g.fillText(s, xx, ty + th + 12.5);
        }
      }
      // puan baloncukları
      if (lnd && this.landT != null) {
        (v.gains || []).forEach((gn, i) => {
          if (!(gn > 0)) return;
          const u = (t - this.landT) / 2.4;
          if (u > 1) return;
          const [x0, y0] = this.flatPos(i);
          g.globalAlpha = 1 - u * u; g.fillStyle = (v.diffs || [])[i] === 0 ? '#ffd23f' : '#7dffb0'; g.font = '900 15px system-ui'; g.textAlign = 'center';
          g.fillText(`+${fmt(gn)}`, x0, y0 - 44 - u * 22); g.globalAlpha = 1;
        });
      }
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new GuessGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[tus]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
