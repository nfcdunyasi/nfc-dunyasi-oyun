// Kelime Avı — 3D harf küpleri (NFC Dünyası Oyun)
// Herkes aynı 5 harfli gizli kelimeyi 6 denemede bulmaya çalışır. Kendi tahtan ekranın önünde duran ahşap bir tepside:
// yazdığın harfler küplerin üstünde belirir, "GİR"e basınca küpler tek tek yuvarlanıp rengini gösterir (yeşil = doğru
// yer, sarı = başka yerde, gri = yok). Masadakilerin önünde birer harf rafı durur: harflerini göremezsin, yalnızca son
// denemelerinin renklerini ve kaçıncı denemede olduklarını görürsün. Kelime bitince cevabın küpleri masanın ortasından
// yükselip açılır. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-21-c';
import * as sfx from '../sfx.js?v=2026-11-21-c';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, makeTexture } = E;
void sfx;

const ALPHA = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
const KB = [['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'], ['⏎', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '⌫']];
const FACE = ['#a9a5b8', '#ffd23f', '#3ccf6e'];        // gri, sarı, yeşil
const CREAM = '#fbf3e0', EMPTY = '#e8dfcb';
const rgb3 = (hex) => { const h = String(hex).replace('#', ''); return new Float32Array([parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]); };
const FACE3 = FACE.map(rgb3), CREAM3 = rgb3(CREAM), EMPTY3 = rgb3(EMPTY), INK3 = rgb3('#1c1633');
const ROLL_S = 0.34, STAG_S = 0.28;                    // küp yuvarlanma süresi ve harfler arası gecikme
const BOARD_D = 2;                                     // ön tahtanın kameraya uzaklığı (dünya birimi)
const FONT = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const POST_PLAY = { bloom: 0.32, th: 0.9, tilt: [0.5, 0.33, 0], vig: 0.6 };
const EMO_SQ = ['⬛', '🟨', '🟩'];

const STYLE = `
#ky.kav .msg{top:30%}
#ky.kav .ka-kb{width:min(560px,98vw);border-radius:20px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:6px 5px 7px;user-select:none;-webkit-user-select:none}
#ky.kav .ka-line{display:flex;align-items:center;gap:8px;padding:0 4px 5px;min-height:24px}
#ky.kav .ka-line .t{flex:1;min-width:0;font-weight:900;font-size:14px;line-height:1.2;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.kav .ka-line .t.bad{color:#e0322f}
#ky.kav .ka-line .t.ok{color:#1f9e4f}
#ky.kav .ka-line .bar{flex:0 0 22%;height:7px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden}
#ky.kav .ka-line .bar i{display:block;height:100%;background:#3ccf6e;border-radius:9px;transform-origin:left center;transition:transform .2s linear}
#ky.kav .ka-line .bar i.hot{background:#ff5a36}
#ky.kav .ka-line b{font-size:14px;font-weight:900;min-width:38px;text-align:right;font-variant-numeric:tabular-nums}
#ky.kav .ka-sk{flex:0 0 auto;border:2px solid #1c1633;border-radius:10px;background:#fff;color:#1c1633;font-size:14px;line-height:1;padding:6px 11px;min-height:32px;min-width:38px;-webkit-tap-highlight-color:transparent}
#ky.kav .ka-row{display:flex;gap:4px;justify-content:center;margin-top:4px}
#ky.kav .ka-k{flex:1 1 0;min-width:0;max-width:46px;height:clamp(40px,6.2vh,50px);border:2.5px solid #1c1633;border-radius:9px;background:#fff;color:#1c1633;font-weight:900;font-size:clamp(15px,4.4vw,19px);padding:0;box-shadow:0 2px 0 #1c1633;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:background .25s,color .25s}
#ky.kav .ka-k.w{flex:1.55 1 0;max-width:70px;font-size:clamp(13px,3.6vw,16px);background:#1c1633;color:#fff}
#ky.kav .ka-k.s0{background:#a9a5b8;color:#fff}
#ky.kav .ka-k.s1{background:#ffd23f}
#ky.kav .ka-k.s2{background:#3ccf6e;color:#fff}
#ky.kav .ka-k:active{transform:translateY(2px);box-shadow:none}
#ky.kav .ka-k[disabled]{opacity:.45}
#ky.kav .ka-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:8px 10px 9px;text-align:center}
#ky.kav .ka-box.okb{background:#d6f5e0}
#ky.kav .ka-box.dark{background:#1d2430;color:#fff}
#ky.kav .ka-hd{font-size:clamp(15px,4.4vw,19px);font-weight:900;line-height:1.25;display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap}
#ky.kav .ka-hd b{background:#3ccf6e;color:#fff;border:2px solid #1c1633;border-radius:9px;padding:0 9px;letter-spacing:.12em}
#ky.kav .ka-hd em{font-style:normal;font-size:13px;font-weight:800;opacity:.78}
#ky.kav .ka-s{font-size:12.5px;font-weight:700;opacity:.76;line-height:1.3;margin-top:4px}
#ky.kav .ka-res{display:grid;gap:4px;margin-top:7px;max-height:min(26vh,210px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.kav .ka-res div{display:flex;align-items:center;gap:8px;border:2px solid #1c1633;border-radius:11px;padding:3px 9px;background:#fff;font-weight:800;font-size:13.5px;color:#1c1633}
#ky.kav .ka-res div.me{background:#fff4c2}
#ky.kav .ka-res div i{flex:0 0 auto;width:11px;height:11px;border-radius:50%;background:var(--pc);border:2px solid #1c1633}
#ky.kav .ka-res div span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky.kav .ka-res div em{font-style:normal;font-size:11px;letter-spacing:-1px;white-space:nowrap}
#ky.kav .ka-res div b{white-space:nowrap}
#ky.kav .ka-tm{display:flex;align-items:center;gap:8px;margin-top:7px}
#ky.kav .ka-tm .bar{flex:1;height:7px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden}
#ky.kav .ka-tm .bar i{display:block;height:100%;background:#3ccf6e;border-radius:9px;transform-origin:left center}
#ky.kav .ka-tm b{font-size:14px;font-weight:900;min-width:40px;text-align:right}
#ky.kav .ka-fd{position:absolute;left:0;top:0;z-index:4;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;width:min(520px,94vw)}
#ky.kav .ka-fd div{display:flex;align-items:center;gap:6px;font-weight:800;font-size:14px;line-height:1.2;background:rgba(255,253,246,.96);color:#1c1633;border:2px solid #1c1633;border-radius:12px;padding:3px 10px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:2px 2px 0 rgba(28,22,51,.55);animation:kaf 4.2s ease-out forwards}
#ky.kav .ka-fd div i{flex:0 0 auto;width:11px;height:11px;border-radius:50%;background:var(--pc);border:2px solid #1c1633}
#ky.kav .ka-fd div.ok{background:#3ccf6e;color:#fff}
#ky.kav .ka-fd div.no{background:#ece8f4}
@keyframes kaf{0%{opacity:0;transform:translateY(-8px)}6%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0}}
#ky.kav .lbl .ka-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.kav .lbl .ka-x:empty{display:none}
#ky.kav .lbl .ka-sq{display:inline-flex;gap:1px}
#ky.kav .lbl .ka-sq i{display:block;width:6px;height:6px;border-radius:2px;background:#e8dfcb;border:1px solid rgba(28,22,51,.55)}
#ky.kav .lbl .ka-sq i.s0{background:#a9a5b8}
#ky.kav .lbl .ka-sq i.s1{background:#ffd23f}
#ky.kav .lbl .ka-sq i.s2{background:#3ccf6e}
#ky.kav .lbl .ka-n{font-weight:900;font-size:.82em;opacity:.85}
#ky.kav .lbl .ka-p{display:inline-block;min-width:16px;padding:0 4px;border-radius:9px;background:#3ccf6e;color:#fff;font-weight:900;font-size:.85em;line-height:1.35;text-align:center}
#ky.kav .lbl.ka-ok{box-shadow:0 0 0 3px #3ccf6e,0 0 14px rgba(60,207,110,.7)}
#ky.kav .lbl.ka-no{opacity:.75}
#ky.kav .card .ka-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.kav .card .ka-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.kav .card .ka-seg button.on{background:var(--ink);color:#fff}
#ky.kav .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.kav .card .ka-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.kav .card .ka-ru div{border:3px solid var(--ink);border-radius:14px;padding:5px 3px 6px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.15;color:var(--ink)}
#ky.kav .card .ka-ru div b{display:flex;justify-content:center;gap:2px;margin-bottom:3px}
#ky.kav .card .ka-ru div b i{display:grid;place-items:center;width:20px;height:20px;border-radius:5px;border:2px solid var(--ink);font-style:normal;font-size:12px;font-weight:900}
#ky.kav .card .ka-tb{display:grid;gap:5px;margin-top:10px;max-height:min(30vh,250px);overflow:auto;text-align:left}
#ky.kav .card .ka-tb div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:4px 10px;background:#fff;font-weight:800;font-size:14px;color:var(--ink)}
#ky.kav .card .ka-tb div.me{background:#fff4c2}
#ky.kav .card .ka-tb div i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.kav .card .ka-tb div span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.kav .card .ka-tb div em{font-style:normal;font-size:11.5px;opacity:.7;font-weight:700;white-space:nowrap}
#ky.kav .card .ka-tb div b{font-weight:900;white-space:nowrap}
#ky.kav .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.kav .card .row2 .kb.alt{flex:0 0 auto}
@media (min-aspect-ratio:11/10){
#ky.kav .mz-bar{align-items:flex-start}
#ky.kav .ka-kb,#ky.kav .ka-box{width:min(500px,58vw)}
#ky.kav .ka-k{height:clamp(30px,10vh,42px);font-size:15px}
#ky.kav .ka-res{max-height:34vh}
#ky.kav .msg{left:0;right:42%;top:26%}
}
@media (orientation:landscape) and (max-height:520px){
#ky.kav .card .ka-tb{max-height:24vh;margin-top:6px}
#ky.kav .card .ka-ru{margin-top:6px}#ky.kav .card .ka-ru div{font-size:10.5px;padding:2px 3px 3px}
#ky.kav .card .ka-seg{margin-top:6px}#ky.kav .card .ka-seg button{padding:6px 4px}
}
`;

/* ============================ müzik ve sesler ============================ */
// Bulmaca kafesi havası: Re majör, elektrikli piyano akorları, vibrafon ezgisi, yumuşak fırça ve bas (88 bpm).
// Son 30 saniyede (race) tempo artar, tıkırtılar ve çalkalayıcı girer.
class KaSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.2; }
  tempo() { return this.mode === 'race' ? 104 : 88; }
  swing() { return this.mode === 'race' ? 0.04 : 0.16; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const race = this.mode === 'race';
    const CH = [[38, [62, 66, 69, 73]], [35, [59, 62, 66, 69]], [31, [62, 67, 71, 74]], [33, [61, 64, 69, 73]]];   // Dmaj7 Bm7 Gmaj7 A
    const [root, ch] = CH[bar % 4];
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 3.8, race ? 0.016 : 0.02, 1500, 0.25);
    if (s === 0 || s === 8) ch.forEach((m, k) => this.iEP(t + k * 0.008, m, race ? 0.026 : 0.034, spb * (s === 0 ? 1.6 : 1.2), 0.2));
    if (!race && s === 11) ch.slice(1).forEach((m, k) => this.iEP(t + k * 0.008, m, 0.018, spb * 0.6, 0.2));
    if (s === 0) this.iBass(t, root + 12, spb * 1.4, 0.11, 'sub', 600);
    if (s === 10) this.iBass(t, root + 19, spb * 0.5, 0.08, 'sub', 600);
    if (s === 14 && bar % 2) this.iBass(t, root + 16, spb * 0.45, 0.06, 'sub', 600);
    if (s === 0 || (s === 9 && bar % 2 === 0)) this.iKick(t, race ? 0.09 : 0.075, 100, 48, 0.18);
    if (s === 4 || s === 12) this.iBrush(t, race ? 0.05 : 0.042, 0.16);
    if (s === 12 && bar % 2 === 1) this.iRim(t, 0.025);
    if (race) { if (s % 2 === 0) this.iTick(t, s % 4 === 0 ? 0.02 : 0.012); if (s % 4 === 2) this.iShk(t, 0.02); }
    else if (s % 4 === 2) this.iShk(t, 0.012);
    const MEL = [
      [78, null, null, 76, null, 73, null, null, 74, null, 76, null, null, null, null, null],
      [74, null, null, 73, null, 71, null, null, 69, null, null, null, 71, null, 73, null],
      [74, null, null, null, 71, null, 74, null, 79, null, 78, null, 76, null, null, null],
      [76, null, 73, null, 69, null, null, null, 71, null, 73, null, 76, null, null, null]];
    const m = MEL[bar % 4][s];
    if (m != null && (!race || s < 8 || bar % 2 === 0)) this.iVibe(t, m, race ? 0.045 : 0.06, spb * 1.1, 0.3);
    if (s === 0 && bar % 8 === 0) this.iBell(t, 86, 0.016, spb * 2, 0.35);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'key': this.iWood(t, 0.05, 1900 + Math.random() * 300); break;
      case 'del': this.iWood(t, 0.04, 1200); break;
      case 'bad': this.tone(190, t, 0.12, 'square', 0.04, 160, 0.004); this.tone(150, t + 0.11, 0.16, 'square', 0.04, 130, 0.004); break;
      case 'roll': { // a: 0 gri, 1 sarı, 2 yeşil
        this.noise(t, 0.05, 0.03, { type: 'bandpass', freq: 1600, q: 1.2 });
        this.tone(140, t + 0.02, 0.06, 'sine', 0.06, 90, 0.002);
        if (a === 2) this.tone(1319, t + 0.05, 0.22, 'triangle', 0.06, null, 0.003);
        else if (a === 1) this.tone(988, t + 0.05, 0.2, 'triangle', 0.05, null, 0.003);
        else this.tone(330, t + 0.05, 0.14, 'triangle', 0.035, 300, 0.003);
        break;
      }
      case 'rack': this.iWood(t, 0.022, 1500 + Math.random() * 400); break;
      case 'solve':
        this.duck(0.25, 1.6);
        [[1175, 0], [1480, 0.08], [1760, 0.16], [2349, 0.26]].forEach(([f, d]) => this.tone(f, t + d, 0.32, 'triangle', 0.08, null, 0.003));
        this.cheer(t + 0.15, 1.1);
        break;
      case 'other': this.tone(1047, t, 0.25, 'triangle', 0.06, null, 0.003); this.tone(1568, t + 0.09, 0.3, 'triangle', 0.05, null, 0.003); break;
      case 'fail': super._fx('trombone'); break;
      case 'rise': this.noise(t, 0.7, 0.05, { type: 'bandpass', freq: 500, to: 2400, q: 0.8, attack: 0.3 }); break;
      case 'reveal':
        this.duck(0.25, 1.6);
        for (let k = 0; k < 12; k++) this.noise(t + k * 0.04, 0.035, 0.025 + k * 0.004, { type: 'bandpass', freq: 1800, q: 0.9 });
        this.tone(1175, t + 0.52, 0.5, 'triangle', 0.07, null, 0.003);
        this.tone(1760, t + 0.52, 0.6, 'triangle', 0.05, null, 0.003);
        break;
      case 'champ':
        this.duck(0.15, 3);
        [[62, 0, 0.14], [62, 0.15, 0.14], [62, 0.3, 0.14], [66, 0.45, 0.5], [69, 0.62, 0.9]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.07, 0.15); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// harf küpü (birim): yuvarlatılmış kenarlı küp; rengi çizerken verilir
function cubeModel(mb) { mb.rbox(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.12, C('#ffffff', -0.45), 2); }
// harf yüzü (birim kare, +Z'ye bakar): harf atlasından bir hücre
function letterQuad(k) { return (tb) => { const u0 = (k % 8) / 8, v0 = Math.floor(k / 8) / 4, e = 0.004; tb.tquad([-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], u0 + e, v0 + e, u0 + 0.125 - e, v0 + 0.25 - e, [0, 0, -1]); }; }
// ön tahtanın tepsisi (birim; x,y -0.5..0.5, ince)
function trayModel(mb) {
  mb.rbox(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.05, C('#e9d6b0', -0.5), 2);
  mb.rbox(-0.47, -0.47, 0.3, 0.47, 0.47, 0.56, 0.03, C('#2a2442', -0.25), 1);
}
// raf: oyuncunun önündeki küçük tahta çubuk (dünya birimi), üstünde 5 minik küp ve 6 deneme çivisi
function rackModel(mb) {
  const Wd = C('#8a5a34', -0.5), Wd2 = C('#6b4226', -0.45);
  mb.rbox(-0.34, 0, -0.06, 0.34, 0.035, 0.06, 0.012, Wd, 2);
  mb.rbox(-0.34, 0.02, -0.07, 0.34, 0.07, -0.045, 0.01, Wd2, 1);
}
function atlas() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = '#1c1633';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  [...ALPHA].forEach((ch, k) => {
    const x = (k % 8) * 128 + 64, y = Math.floor(k / 8) * 128 + 68;
    g.font = `900 ${ch === 'Ğ' || ch === 'İ' || ch === 'Ü' || ch === 'Ö' || ch === 'Ç' || ch === 'Ş' ? 78 : 86}px ${FONT}`;
    g.fillText(ch, x, ch === 'Ç' || ch === 'Ş' ? y - 6 : ch === 'Ğ' || ch === 'İ' || ch === 'Ü' || ch === 'Ö' ? y + 6 : y);
  });
  return cv;
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const up = (t) => String(t || '').toLocaleUpperCase('tr-TR');
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// rengi geçişli küp: önceki renkten yenisine (yuvarlanmanın yarısında)
const mix3 = (a, b, k, o) => { o[0] = a[0] + (b[0] - a[0]) * k; o[1] = a[1] + (b[1] - a[1]) * k; o[2] = a[2] + (b[2] - a[2]) * k; return o; };

/* ============================ oyun ============================ */
class WordGame extends TableGame {
  constructor(ctx) {
    const snd = new KaSnd();
    super(ctx, { tag: 'kav', cls: 'kav', title: 'Kelime Avı', sub: 'Gizli kelimeyi 6 denemede bul', emoji: '🟩', css: STYLE, snd, amb: 'diner', ambVol: 0.4, botPx: 300, botPxL: 34, tea: true, place: false, cloth: '#2f5d4a', trim: '#ffd23f', chairPad: '#3b6ea8', fog: '#0f1418', roomStyle: { wall: '#1e2a26', curtain: '#2f6b55' } });
    this.typed = [];
    this.rowsSeen = 0;
    this.rollT = [];          // satır → yuvarlanma başlangıcı (oyun zamanı)
    this.racks = new Map();   // oyuncu → { last, rows, st, t0, prev }
    this.kbState = {};
    this.feedSeen = new Map();
    this.shakeT = -9;
    this.note = null;
    this.mB = M.make(); this.mT = M.make(); this.mT2 = M.make(); this.mT3 = M.make();
    this.tint = new Float32Array(3);
    this.fdEl = document.createElement('div'); this.fdEl.className = 'ka-fd'; this.el.wrap.appendChild(this.fdEl);
    this.bindUi();
    this.onKey = (e) => this.keydown(e);
    window.addEventListener('keydown', this.onKey);
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.X || !this.aTex) return; this.aCv = atlas(); this.aDirty = true; }); } catch { /* yok */ }
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.cube = this.mk(cubeModel);
    W.tray = this.mk(trayModel);
    W.rack = this.mk(rackModel);
    W.trophy = this.mk(trophyModel);
    W.L = [...ALPHA].map((_, k) => this.mk(letterQuad(k), 'tex'));
    this.aCv = this.aCv || atlas();
    this.aTex = makeTexture(this.X, this.aCv);
  }
  freeTex() { const gl = this.X && this.X.gl; if (gl && this.aTex) gl.deleteTexture(this.aTex); this.aTex = null; }
  onDispose() { window.removeEventListener('keydown', this.onKey); }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }

  /* ---------- girdi ---------- */
  canType() { const v = this.view; return !!v && v.phase === 'play' && v.inRound && !v.done && v.me >= 0; }
  keydown(e) {
    if (this.dead || !this.canType()) return;
    const tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { e.preventDefault(); this.press('⏎'); return; }
    if (e.key === 'Backspace') { e.preventDefault(); this.press('⌫'); return; }
    if (e.key && e.key.length === 1) { const ch = up(e.key); if (ALPHA.includes(ch)) { e.preventDefault(); this.press(ch); } }
  }
  press(k) {
    if (!this.canType()) return;
    const v = this.view;
    if (this.pend && this.time - this.pend.t < 2) return;
    if (k === '⌫') { if (this.typed.length) { this.typed.pop(); this.fx('del'); } return; }
    if (k === '⏎') {
      if (this.typed.length < 5) { this.bad('Kelime 5 harf olmalı'); return; }
      const w = this.typed.join('');
      if ((v.board || []).some((r) => r.w === w)) { this.bad('Bunu zaten denedin'); return; }
      this.pend = { w, t: this.time, n: (v.board || []).length };
      vibrate(12);
      this.ctx.send('guess', { word: w });
      return;
    }
    if (this.typed.length >= 5 || !ALPHA.includes(k)) return;
    this.typed.push(k);
    this.popT = this.time; this.popI = this.typed.length - 1;
    this.fx('key');
    vibrate(6);
  }
  bad(text) { this.shakeT = this.time; this.note = { text, cls: 'bad', t: this.time }; this.fx('bad'); vibrate([20, 30, 20]); }
  bindUi() {
    const onDown = (e) => {
      const b = e.target.closest('[data-k]');
      if (!b || b.disabled) return;
      e.preventDefault();
      this.press(b.dataset.k);
    };
    this.el.bar.addEventListener('pointerdown', onDown);
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'ka-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'ka-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'ka-skip') { this.fx('pop'); this.ctx.send('skip', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.kav !== '1') { root.dataset.kav = '1'; root.innerHTML = '<p class="py-16 text-center">🟩</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.seq || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    this.onBoard(prev, v);
    this.onOthers(prev, v);
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'play') {
      mus('idle');
      if (this.roundK !== `${v.game}:${v.seq}`) {
        this.roundK = `${v.game}:${v.seq}`;
        this.typed = []; this.pend = null; this.note = null; this.kbState = {};
        this.rowsSeen = (v.board || []).length;
        this.rollT = (v.board || []).map(() => -99);
        this.racks = new Map();
        (v.prog || []).forEach((p, i) => { const id = v.seats[i]?.id; if (id && p) this.racks.set(id, { last: p.last, prev: p.last, rows: p.rows, st: p.st, t0: -99 }); });
        this.kbRecalc(v);
        this.revT = null;
      }
      if (fresh) { this.msg(`🟩 ${v.round}. KELİME`, 'mid'); this.fx('go'); }
    }
    if (v.phase === 'reveal') {
      mus('idle');
      this.revT = this.time - (fresh ? 0 : 9);
      this.revWord = v.word;
      if (fresh) {
        this.fx('rise');
        setTimeout(() => { if (!this.dead) this.fx('reveal'); }, 650);
        const n = (v.results || []).length;
        if (!n) this.msg(`😅 ${esc(v.word)}`, 'mid');
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!late) {
        this.fx('champ');
        const c = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n || '')));
        this.msg(c.length ? `🏆 ${c.join(' & ')}` : 'OYUN BİTTİ', 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, [[1, 0.85, 0.3], [0.3, 0.85, 0.45], [0.3, 0.55, 1], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.2); });
      }
    }
  }
  // kendi tahtam: yeni satır gelince küpler sırayla yuvarlanır; bitince klavye renklenir
  onBoard(prev, v) {
    if (v.phase !== 'play' && v.phase !== 'reveal') return;
    const B = v.board || [];
    if (this.pend && B.length > this.pend.n) { this.pend = null; this.typed = []; }
    if (this.pend && this.time - this.pend.t > 2.2) { this.pend = null; this.note = { text: 'Olmadı, tekrar dene', cls: 'bad', t: this.time }; }
    while (this.rowsSeen < B.length) {
      const r = this.rowsSeen;
      const fresh = prev && prev.seq === v.seq;
      this.rollT[r] = fresh ? this.time : -99;
      if (fresh) {
        const fb = B[r].fb;
        fb.forEach((x, k) => setTimeout(() => { if (!this.dead) this.fx('roll', x); }, (k * STAG_S + ROLL_S * 0.55) * 1000));
        const tEnd = (4 * STAG_S + ROLL_S + 0.1) * 1000;
        const solved = fb.every((x) => x === 2);
        setTimeout(() => {
          if (this.dead) return;
          this.kbRecalc(this.view);
          if (solved) {
            this.fx('solve'); vibrate([25, 30, 25]);
            this.flash('rgba(60,207,110,.4)', true);
            this.note = { text: `Buldun! +${this.view?.myPts || ''}`, cls: 'ok', t: this.time, keep: true };
            this.solveT = this.time;
            const p = this.boardWorld(2, r);
            if (p && this.X) this.burst(p[0], p[1], p[2], 40, [[0.3, 0.85, 0.45], [1, 0.85, 0.3], [1, 1, 1]], 0.9, 0.012, false, 1.4, 1.2);
          } else if (B.length >= (v.maxTry || 6) || this.view?.myStatus === 'failed') {
            this.fx('fail');
            this.note = { text: 'Hakkın bitti, kelime birazdan açılacak', cls: 'bad', t: this.time, keep: true };
          }
        }, tEnd);
      }
      this.rowsSeen += 1;
    }
    if (!prev || prev.seq !== v.seq) this.kbRecalc(v);
  }
  kbRecalc(v) {
    const st = {};
    const B = (v && v.board) || [];
    B.forEach((r, ri) => {
      if (this.rollT[ri] != null && this.time - this.rollT[ri] < 4 * STAG_S + ROLL_S) return;
      [...r.w].forEach((ch, k) => { const x = r.fb[k]; st[ch] = Math.max(st[ch] ?? -1, x); });
    });
    this.kbState = st;
    this.kbK = '';
  }
  // masadakiler: yeni deneme, bulma, hakkı bitme
  onOthers(prev, v) {
    if (v.phase !== 'play' && v.phase !== 'reveal') return;
    const sameRound = prev && prev.seq === v.seq && (prev.phase === 'play' || prev.phase === 'reveal');
    (v.prog || []).forEach((p, i) => {
      const id = v.seats[i]?.id;
      if (!id || !p) return;
      let r = this.racks.get(id);
      if (!r) { r = { last: p.last, prev: p.last, rows: p.rows, st: p.st, t0: -99 }; this.racks.set(id, r); return; }
      if (p.rows > r.rows) {
        r.prev = r.last; r.last = p.last; r.rows = p.rows; r.t0 = sameRound ? this.time : -99;
        if (sameRound && i !== v.me) setTimeout(() => { if (!this.dead) this.fx('rack'); }, 120);
      }
      if (p.st !== r.st) {
        const was = r.st;
        r.st = p.st;
        if (sameRound && !was && i !== v.me && v.phase === 'play') {
          const nm = esc(nm0(v.seats[i].n));
          if (p.st === 'solved') {
            this.chip(`🎉 <b>${nm}</b> buldu! ${p.rows}. denemede · +${p.pts}`, 'ok', i);
            this.fx('other');
            r.hopT = this.time + 4 * 0.12 + 0.4;
            const a = this.avatarAt(i);
            if (this.X && a && a.headW) setTimeout(() => { if (!this.dead) this.burst(a.headW[0], a.headW[1] + 0.3, a.headW[2], 18, [[0.3, 0.85, 0.45], [1, 0.85, 0.3], [1, 1, 1]], 1.4, 0.03, false, 1.3, 2.4); }, 600);
          } else if (p.st === 'failed') this.chip(`😅 <b>${nm}</b>: hakkı bitti`, 'no', i);
        }
      }
    });
  }
  chip(html, cls = '', i = -1) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    const p = this.view?.seats?.[i];
    d.innerHTML = (p ? `<i style="--pc:${pcol(p.c)}"></i>` : '') + `<span>${html}</span>`;
    this.fdEl.appendChild(d);
    while (this.fdEl.children.length > 3) this.fdEl.firstChild.remove();
    setTimeout(() => d.remove(), 4300);
  }

  /* ---------- yerleşim: ön tahta ekranda nerede ---------- */
  layout() {
    const vw = this.vw || 390, vh = this.vh || 844, land = vw > vh * 1.1;
    const kbH = this.kbH || (land ? 160 : 212);
    const ROWS = 6;
    const KW = 5.76, KH = ROWS + 0.5 + 0.36;   // tahtanın eni/boyu (küp boyu cinsinden)
    let s, cx, cy;
    if (!land) {
      const bot = vh - kbH - 12;
      const top = Math.max(vh * 0.33, 236);
      s = Math.min((vw * 0.86) / KW, (bot - top) / KH, 64);
      cx = vw / 2;
      cy = bot - (s * KH) / 2;
    } else {
      const top = 92, bot = vh - 12;
      s = Math.min((bot - top) / KH, (vw * 0.4) / KW, 60);
      cx = vw - 16 - (s * KW) / 2;
      cy = top + (bot - top) / 2;
    }
    s = Math.max(22, s);
    return { s, cx, cy, w: s * KW, h: s * KH, land, kbH };
  }
  // ön tahtanın matrisi: kameraya göre sabit (1 birim = ekranda 1 piksel), BOARD_D derinlikte
  boardMat() {
    const c = this.cam, L = this.layout();
    const vw = this.vw || 1, vh = this.vh || 1;
    const Ee = [c.ex, c.ey, c.ez];
    const f = norm3([c.tx - c.ex, c.ty - c.ey, c.tz - c.ez]);
    const r = norm3(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    const tanV = Math.tan(c.fov / 2), tanH = tanV * (vw / vh);
    const nx = (L.cx / vw) * 2 - 1, ny = 1 - (L.cy / vh) * 2;
    const d = BOARD_D;
    const P = [Ee[0] + f[0] * d + r[0] * nx * d * tanH + u[0] * ny * d * tanV, Ee[1] + f[1] * d + r[1] * nx * d * tanH + u[1] * ny * d * tanV, Ee[2] + f[2] * d + r[2] * nx * d * tanH + u[2] * ny * d * tanV];
    // ön yüz ekran düzlemine paralel kalır (piksel ölçüsü tam), derinlik ekseni ise göze doğru bakış ışınına yatırılır:
    // kenardaki küplerin yanları görünmez, ortadaki gibi dümdüz durur
    const zz = norm3([Ee[0] - P[0], Ee[1] - P[1], Ee[2] - P[2]]);
    const k = (2 * d * tanV) / vh;
    const m = this.mB;
    m[0] = r[0] * k; m[1] = r[1] * k; m[2] = r[2] * k; m[3] = 0;
    m[4] = u[0] * k; m[5] = u[1] * k; m[6] = u[2] * k; m[7] = 0;
    m[8] = zz[0] * k; m[9] = zz[1] * k; m[10] = zz[2] * k; m[11] = 0;
    m[12] = P[0]; m[13] = P[1]; m[14] = P[2]; m[15] = 1;
    this.L = L;
    return m;
  }
  // tahtadaki bir küpün yerel konumu (piksel), satır 0 üstte
  cellXY(col, row) { const s = this.L.s, g = 0.1 * s; return [(col - 2) * (s + g), (2.5 - row) * (s + g)]; }
  boardWorld(col, row) {
    if (!this.L) return null;
    const [x, y] = this.cellXY(col, row);
    const m = this.mB;
    return [m[0] * x + m[4] * y + m[12], m[1] * x + m[5] * y + m[13], m[2] * x + m[6] * y + m[14]];
  }
  showBoard() { const v = this.view; return !!v && (v.phase === 'play' || v.phase === 'reveal') && v.me >= 0 && !this.flat; }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const center = [0, TABLE_Y + 0.3, 0];
    const champA = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.kaI || (a.kaI = { lt: 0, look: null });
      const idleLook = () => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.2 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > 0.3 ? P[Math.floor(Math.random() * P.length)] : center;
        }
        return idle.look;
      };
      const rk = this.racks.get(p.id);
      const pr = (v.prog || [])[i];
      if (v.phase === 'play' && pr) {
        const rackP = this.rackPos(i);
        if (pr.st === 'solved') {
          const u = rk && rk.hopT ? t - rk.hopT + 0.9 : 9;
          a.pose(u < 1.8 ? 'cheer' : Math.floor(t / 3 + i) % 3 === 0 ? 'clap' : 'lean', { t }); a.expr = u < 1.8 ? 'laugh' : 'grin'; a.look = u < 1.8 ? center : idleLook();
          return;
        }
        if (pr.st === 'failed') { a.pose(Math.floor(t / 3 + i) % 2 ? 'slump' : 'shrug', { t }); a.expr = 'sad'; a.look = idleLook(); return; }
        const fresh = rk && t - rk.t0 < 1.4;
        if (fresh) { a.pose('lean', { t }); a.expr = 'o'; a.look = rackP || center; return; }
        const ph = Math.floor(t / 2.3 + hs(i, 3) * 9) % 4;
        const late = pr.rows >= 4;
        a.pose(late && ph === 0 ? 'headgrab' : ph === 1 ? 'chin' : ph === 2 ? 'bite' : 'clasp', { t });
        a.expr = late ? 'tense' : ph === 1 ? 'o' : 'smile';
        a.look = rackP || center;
        return;
      }
      if (v.phase === 'reveal' && pr) {
        const u = t - (this.revT || 0);
        if (pr.st === 'solved') { a.pose(u < 2.5 ? 'clap' : 'rest', { t }); a.expr = 'grin'; }
        else { a.pose(u < 2 ? 'facepalm' : 'shrug', { t }); a.expr = u < 2 ? 'wince' : 'smile'; }
        a.look = [0, TABLE_Y + 0.6, 0];
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
  // oyuncunun önündeki rafın yeri (masada, oyuncuya yakın)
  rackPos(i) {
    const a = this.avatarAt(i);
    if (!a) return null;
    const ang = Math.atan2(a.pos[2], a.pos[0]);
    const r = this.rAt(ang, this.R) - 0.3;
    return [Math.cos(ang) * r, TABLE_Y + 0.004, Math.sin(ang) * r];
  }

  /* ---------- kamera ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const vw = this.vw || 1, vh = this.vh || 1, land = vw > vh * 1.1;
    const t = this.time;
    let zoom = 1, pa = -0.3, yawC = 0, sx = 0.5, sy = 0.5, aim = false;
    const play = (v.phase === 'play' || v.phase === 'reveal') && v.me >= 0 && !this.flat;
    if (play) {
      const L = this.layout();
      aim = true;
      if (!land) {
        const top = v.phase === 'reveal' ? 98 : 86, bot = L.cy - L.h / 2 - 6; // üstteki tur hapı (≈86 px) uzak koltuğun etiketini örtmesin
        sy = clamp((top + bot) / 2 / vh, 0.14, 0.4);
        zoom = clamp(1.12 * 212 / Math.max(120, bot - top), 0.9, 2);
        pa = -0.24;
      } else {
        const right = L.cx - L.w / 2 - 10;
        sx = clamp(right / 2 / vw, 0.2, 0.5);
        sy = clamp((52 + (vh - (this.kbH || 160) - 14)) / 2 / vh, 0.22, 0.5);
        zoom = clamp(1.25 * Math.max(vw / Math.max(200, right) * 0.55, (0.62 * vh) / Math.max(90, vh - (this.kbH || 160) - 70)), 1.1, 2.4);
        pa = -0.16;
      }
      if (v.phase === 'reveal') zoom *= 0.88;
      if (Math.abs(150 - this.cfg.botPx) > 12) { this.cfg.botPx = 150; this.fitKey = ''; }
    } else if (v.phase === 'final') { zoom = 0.95; yawC = Math.sin(t * 0.15) * 0.12; if (Math.abs(200 - this.cfg.botPx) > 12) { this.cfg.botPx = 200; this.fitKey = ''; } }
    else { zoom = land ? 0.95 : 0.9; yawC = Math.sin(t * 0.13) * 0.08; if (Math.abs(300 - this.cfg.botPx) > 12) { this.cfg.botPx = 300; this.fitKey = ''; } }
    this.cfg.post = play ? POST_PLAY : null;
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.4, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    if (aim) {
      const [fx, fy, fz] = this.aimAt([0, TABLE_Y + 0.35, 0], sx, sy, c.yaw, c.pitchAdd);
      c.fx = damp(c.fx, fx, 3, dt); c.fz = damp(c.fz, fz, 3, dt); c.fy = damp(c.fy, fy, 3, dt);
    } else { c.fx = damp(c.fx, 0, 2.2, dt); c.fz = damp(c.fz, 0, 2.2, dt); c.fy = damp(c.fy, 0, 2.2, dt); }
    // müzik: son 30 saniye hızlanır; son 10 saniye tıkırtı
    const left = (v.endsAt || 0) - this.sNow();
    if (v.phase === 'play') {
      const race = left < 30500 && !v.done;
      if (race !== this.raceOn) { this.raceOn = race; try { this.snd.music(race ? 'race' : 'idle'); } catch { /* yok */ } }
      if (left > 0 && left < 10500 && !v.done) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', sec <= 5 ? 0.8 : 0.5); } }
    } else if (this.raceOn) { this.raceOn = false; try { this.snd.music('idle'); } catch { /* yok */ } }
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up3 = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up3[0] * dy + rt[0] * dx, H[1] - up3[1] * dy - 0.7, H[2] - up3[2] * dy + rt[2] * dx];
  }

  /* ---------- çizim ---------- */
  // bir küpün durumu: harf, ön/arka renk, yuvarlanma açısı, zıplama
  cells() {
    const v = this.view;
    const out = [];
    if (!v) return out;
    const B = v.board || [];
    const rows = v.maxTry || 6;
    const t = this.time;
    const cur = !v.done && v.phase === 'play' ? B.length : -1;
    const sh = t - this.shakeT < 0.45 ? Math.sin((t - this.shakeT) * 48) * (1 - (t - this.shakeT) / 0.45) * 0.14 : 0;
    for (let r = 0; r < rows; r++) {
      const g = B[r];
      for (let k = 0; k < 5; k++) {
        const o = { col: k, row: r, ch: null, roll: 0, fb: -1, dx: 0, dy: 0, sc: 1 };
        if (g) {
          o.ch = [...g.w][k];
          o.fb = g.fb[k];
          const t0 = this.rollT[r] ?? -99;
          o.roll = easeIO((t - t0 - k * STAG_S) / ROLL_S);
          // bulunan satır: sırayla zıplama
          if (g.fb.every((x) => x === 2) && this.solveT != null) { const u = t - this.solveT - k * 0.09; if (u > 0 && u < 0.5) o.dy = Math.sin((u / 0.5) * Math.PI) * 0.35; }
        } else if (r === cur) {
          const ch = this.typed[k];
          o.ch = ch || null;
          o.dx = sh;
          if (ch && this.popI === k && t - this.popT < 0.16) o.sc = 1 + 0.14 * Math.sin(((t - this.popT) / 0.16) * Math.PI);
          if (this.pend) o.sc *= 0.96;
        }
        out.push(o);
      }
    }
    return out;
  }
  cellMat(o, m) {
    const s = this.L.s;
    const [x, y] = this.cellXY(o.col, o.row);
    M.set(this.mT, x + o.dx * s, y + o.dy * s, 0, 0, -o.roll * Math.PI / 2, 0, s * o.sc * 0.98, s * o.sc * 0.98, s * o.sc * 0.98);
    M.mul(m, this.mB, this.mT);
    return m;
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.cube || !v) return;
    const T = this.T, m = this.mats.b, t = this.time;
    // masadaki raflar (benim dışımdaki oyuncular)
    if (v.phase === 'play' || v.phase === 'reveal') {
      (v.prog || []).forEach((p, i) => {
        if (!p || i === v.me) return;
        const id = v.seats[i]?.id, q = this.rackPos(i);
        if (!q || !id) return;
        const r = this.racks.get(id) || { last: p.last, prev: p.last, t0: -99, rows: p.rows };
        const yaw = Math.atan2(this.cam.ex - q[0], this.cam.ez - q[2]);
        M.set(m, q[0], q[1], q[2], yaw);
        D(Wd.rack, m, T.obj);
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        for (let k = 0; k < 5; k++) {
          const u = easeIO((t - r.t0 - k * 0.12) / 0.3);
          const hop = r.hopT != null ? Math.max(0, Math.sin(clamp((t - r.hopT - k * 0.08) / 0.4, 0, 1) * Math.PI)) * 0.08 : 0;
          const x = (k - 2) * 0.125;
          const px = q[0] + x * cy, pz = q[2] - x * sy;
          M.set(this.mT, px, q[1] + 0.035 + 0.055 + hop, pz, yaw, -u * Math.PI / 2 - 0.25, 0, 0.105, 0.105, 0.105);
          const a = r.prev, b = r.last;
          const ca = a ? FACE3[a[k]] : CREAM3, cb = b ? FACE3[b[k]] : CREAM3;
          D(Wd.cube, this.mT, mix3(ca, cb, u > 0.5 ? 1 : 0, this.tint));
        }
        // deneme çivileri
        for (let j = 0; j < 6; j++) {
          const x = (j - 2.5) * 0.09;
          M.set(this.mT, q[0] + x * cy + 0.075 * sy, q[1] + 0.03, q[2] - x * sy + 0.075 * cy, 0, 0, 0, 0.022, 0.022, 0.022);
          D(Wd.cube, this.mT, j < p.rows ? (p.st === 'solved' && j === p.rows - 1 ? FACE3[2] : FACE3[1]) : INK3);
        }
      });
    }
    // açılış: cevabın küpleri masanın ortasından yükselir ve açılır
    if (v.phase === 'reveal' && this.revWord) {
      const u0 = t - (this.revT || 0);
      const yaw = Math.atan2(this.cam.ex, this.cam.ez);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      [...this.revWord].forEach((ch, k) => {
        const ur = easeOut((u0 - k * 0.12) / 0.7);
        const roll = easeIO((u0 - 0.9 - k * 0.16) / 0.38);
        const bob = Math.sin(t * 2 + k) * 0.02;
        const x = (k - 2) * 0.62;
        M.set(this.mT, x * cy, TABLE_Y - 0.3 + ur * 1.25 + bob, -x * sy, yaw, -roll * Math.PI / 2, 0, 0.54, 0.54, 0.54);
        D(Wd.cube, this.mT, roll > 0.5 ? FACE3[2] : CREAM3);
      });
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
    // ön tahta (kameraya bağlı; gölge atmaz)
    if (!shadow && this.showBoard()) {
      this.boardMat();
      const L = this.L;
      M.set(this.mT, 0, 0, -L.s * 0.62, 0, 0, 0, L.w, L.h, L.s * 0.22);
      M.mul(m, this.mB, this.mT);
      D(Wd.tray, m, T.obj);
      for (const o of this.cells()) {
        const col = o.fb >= 0 ? (o.roll > 0.5 ? FACE3[o.fb] : CREAM3) : o.ch ? CREAM3 : EMPTY3;
        D(Wd.cube, this.cellMat(o, m), col);
      }
    }
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.L || !this.aTex || !v) return;
    if (this.aDirty) { gl.bindTexture(gl.TEXTURE_2D, this.aTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.aCv); gl.generateMipmap(gl.TEXTURE_2D); this.aDirty = false; }
    gl.bindTexture(gl.TEXTURE_2D, this.aTex);
    gl.uniform1f(X.tex.u.uSelf, 0.6);
    const m = this.mats.c, t = this.time;
    // harf yüzleri: önde (henüz açılmamış) ve altta (renkli; yuvarlanınca öne gelir)
    const face = (base, ch, col, front) => {
      const k = ALPHA.indexOf(ch);
      if (k < 0) return;
      if (front) M.set(this.mT2, 0, 0, 0.503, 0, 0, 0, 0.82, 0.82, 1);
      else M.set(this.mT2, 0, -0.503, 0, 0, Math.PI / 2, 0, 0.82, 0.82, 1);
      M.mul(this.mT3, base, this.mT2);
      drawMesh(X, Wd.L[k], this.mT3, col);
    };
    if (this.showBoard() && this.L) {
      for (const o of this.cells()) {
        if (!o.ch) continue;
        const base = this.cellMat(o, m);
        if (o.roll < 0.98) face(base, o.ch, CREAM3, true);
        if (o.fb >= 0 && o.roll > 0.02) face(base, o.ch, FACE3[o.fb], false);
      }
    }
    if (v.phase === 'reveal' && this.revWord) {
      const u0 = t - (this.revT || 0);
      const yaw = Math.atan2(this.cam.ex, this.cam.ez);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      [...this.revWord].forEach((ch, k) => {
        const ur = easeOut((u0 - k * 0.12) / 0.7);
        const roll = easeIO((u0 - 0.9 - k * 0.16) / 0.38);
        if (roll <= 0.02) return;
        const bob = Math.sin(t * 2 + k) * 0.02;
        const x = (k - 2) * 0.62;
        M.set(this.mT, x * cy, TABLE_Y - 0.3 + ur * 1.25 + bob, -x * sy, yaw, -roll * Math.PI / 2, 0, 0.54, 0.54, 0.54);
        face(this.mT, ch, FACE3[2], false);
      });
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
    if (v.phase === 'reveal') { const u = t - (this.revT || 0); if (u > 0.8 && u < 4) this.glow(m, [0, TABLE_Y + 0.95, 0], 3.2, [0.3, 0.9, 0.45], 0.2 * Math.min(1, (u - 0.8) / 0.4) * (1 - (u - 0.8) / 3.2)); }
  }

  /* ---------- arayüz ---------- */
  keyboard(v) {
    const st = this.kbState || {};
    const dis = !this.canType();
    return KB.map((row) => `<div class="ka-row">${row.map((k) => {
      const w = k === '⏎' || k === '⌫';
      const s = !w && st[k] != null && st[k] >= 0 ? ` s${st[k]}` : '';
      const lab = k === '⏎' ? 'GİR' : k;
      return `<button class="ka-k${w ? ' w' : ''}${s}" data-k="${k}" ${dis ? 'disabled' : ''} aria-label="${k === '⏎' ? 'Gir' : k === '⌫' ? 'Sil' : k}">${lab}</button>`;
    }).join('')}</div>`).join('');
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    if (v.phase === 'play' && v.me >= 0) {
      const kb = JSON.stringify(this.kbState || {});
      key = `play|${v.game}|${v.seq}|${this.canType()}|${kb}|${this.ctx.isHost}`;
      html = `<div class="ka-kb"><div class="ka-line"><span class="t"></span><div class="bar"><i></i></div><b></b>${this.ctx.isHost ? '<button class="ka-sk" data-act="ka-skip" aria-label="Kelimeyi geç">⏭</button>' : ''}</div>${this.keyboard(v)}</div>`;
    } else if (v.phase === 'play') {
      key = `watch|${v.game}|${v.seq}`;
      html = `<div class="ka-box dark"><div class="ka-hd">👀 Bu kelimeyi izliyorsun</div><div class="ka-s">Sıradaki kelimede sen de oynarsın.</div></div>`;
    } else if (v.phase === 'reveal') {
      const res = v.results || [];
      const rows = v.seats.map((p, i) => ({ p, i, pr: (v.prog || [])[i], g: (v.grids || [])[i] })).filter((x) => x.pr)
        .sort((a, b) => (b.pr.st === 'solved') - (a.pr.st === 'solved') || (a.pr.st === 'solved' ? a.pr.ord - b.pr.ord : 0))
        .map(({ p, i, pr, g }) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${pr.st === 'solved' ? '✓' : '✗'} ${esc(nm0(p.n))}${i === v.me ? ' (sen)' : ''}</span><em>${(g || []).map((r) => r.map((x) => EMO_SQ[x]).join('')).slice(-1).join('') || '—'}</em><b>${pr.st === 'solved' ? `${pr.rows}/6 · +${pr.pts}` : '—'}</b></div>`).join('');
      key = `rev|${v.game}|${v.seq}`;
      const last = v.round >= v.rounds;
      html = `<div class="ka-box"><div class="ka-hd">Kelime: <b>${esc(v.word || '')}</b><em>${res.length ? `${res.length} kişi buldu` : 'Kimse bulamadı 😅'}</em></div><div class="ka-res">${rows}</div><div class="ka-s">${last ? 'Son kelimeydi, sonuçlar geliyor…' : 'Sıradaki kelime birazdan…'}</div><div class="ka-tm"><div class="bar"><i></i></div><b></b></div></div>`;
    }
    if (this.setBar(key, html)) this.kbH = 0;
  }
  modeSeg(v) {
    return `<div class="ka-seg" role="group" aria-label="Kelime sayısı"><button data-act="ka-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Kısa · 3 kelime</button><button data-act="ka-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🎉 Uzun · 6 kelime</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    const sq = (ch, c) => `<i style="background:${c}">${ch}</i>`;
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card ka-intro">
        <div class="tt">🟩 Kelime Avı</div>
        <div class="sub">Herkes aynı 5 harfli gizli kelimeyi arar. Yazıp "GİR"e bas, küpler dönsün: renkler seni kelimeye götürür. 6 hakkın var.</div>
        <div class="ka-ru"><div style="background:#d6f5e0"><b>${sq('K', '#3ccf6e')}</b>Yeşil: harf doğru yerde</div><div style="background:#fff4c2"><b>${sq('A', '#ffd23f')}</b>Sarı: kelimede var, yeri yanlış</div><div style="background:#ece8f4"><b>${sq('L', '#a9a5b8')}</b>Gri: kelimede yok</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="ka-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Masadakilerin harflerini göremezsin, sadece renklerini. Az denemede ve önce bulan çok kazanır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= 2400) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const rows = v.seats.map((p, i) => ({ p, i, st: (v.stats || [])[i] || {} })).sort((x, y) => y.p.sc - x.p.sc)
        .map(({ p, i, st }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><em>🟩 ${st.found || 0}/${v.rounds}${st.found ? ` · ort. ${(st.tries / st.found).toFixed(1)}` : ''}</em><b>${p.sc} puan</b></div>`).join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏆 Kazandın!' : champ.length ? `🏆 ${champ.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">🟩 bulduğu kelime · ort. = ortalama deneme</div>
        <div class="ka-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="ka-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const act = v.phase === 'play' || v.phase === 'reveal';
    const nOk = (v.prog || []).filter((p) => p && p.st === 'solved').length, nIn = (v.prog || []).filter(Boolean).length;
    this.top(v.phase === 'play' ? `${v.round}/${v.rounds}. kelime · ⏱ ${mmss(left)} · ✓ ${nOk}/${nIn}` : v.phase === 'reveal' ? `${v.round}/${v.rounds}. kelime bitti` : '');
    // klavye satırı: mesaj, süre
    const line = this.el.bar.querySelector('.ka-line');
    if (line) {
      const tEl = line.querySelector('.t'), i = line.querySelector('i'), b = line.querySelector('b');
      let tx = '', cls = '';
      const nt = this.note;
      if (nt && (nt.keep || this.time - nt.t < 2.4)) { tx = nt.text; cls = nt.cls || ''; }
      else if (v.done) { tx = v.myStatus === 'solved' ? `Buldun! +${v.myPts} · diğerleri bekleniyor` : 'Hakkın bitti, kelime birazdan açılacak'; cls = v.myStatus === 'solved' ? 'ok' : 'bad'; }
      else if (this.pend) tx = 'Bakılıyor…';
      else tx = `${(v.board || []).length + 1}. deneme: 5 harf yaz`;
      if (tEl.textContent !== tx) tEl.textContent = tx;
      tEl.className = 't' + (cls ? ' ' + cls : '');
      if (i) { i.style.transform = `scaleX(${clamp(left / (v.roundMs || 12e4), 0, 1).toFixed(3)})`; i.classList.toggle('hot', left < 30500); }
      if (b) b.textContent = mmss(left);
    }
    const tm = this.el.bar.querySelector('.ka-tm');
    if (tm && v.phase === 'reveal') { const i = tm.querySelector('i'), b = tm.querySelector('b'); if (i) i.style.transform = `scaleX(${clamp(left / (v.revealMs || 7500), 0, 1).toFixed(3)})`; if (b) b.textContent = `${Math.max(0, Math.ceil(left / 1000))} sn`; }
    // klavye renkleri değişince yeniden kur
    const kk = JSON.stringify(this.kbState || {}) + this.canType();
    if (kk !== this.kbK) { this.kbK = kk; this.bar(); }
    // klavye yüksekliği (tahta onun üstüne oturur)
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height) : 0;
    if (bh && Math.abs(bh - (this.kbH || 0)) > 6) this.kbH = bh + 8;
    // akış konumu: tahtanın üst kenarı
    if (this.L && !this.flat) { const top = this.L.cy - this.L.h / 2; this.fdEl.style.transform = `translate(${Math.round(this.L.land ? this.L.cx : (this.vw || 390) / 2)}px,${Math.round(top - 8)}px) translate(-50%,-100%)`; this.fdEl.style.width = this.L.land ? `${Math.round(this.L.w + 40)}px` : ''; }
    this.fdEl.style.display = act ? '' : 'none';
    // etiketler: son renkler, deneme, puan
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      const pr = act ? (v.prog || [])[i] : null;
      let x = '';
      if (pr && i !== v.me) {
        x += `<span class="ka-sq">${[0, 1, 2, 3, 4].map((k) => `<i class="${pr.last ? 's' + pr.last[k] : ''}"></i>`).join('')}</span>`;
        x += `<span class="ka-n">${pr.st === 'solved' ? '✓' : pr.st === 'failed' ? '✗' : `${pr.rows}/6`}</span>`;
      }
      if (p.sc) x += `<span class="ka-p">${p.sc}</span>`;
      if (o.kaK !== x) {
        o.kaK = x;
        let el = o.lbl.querySelector('.ka-x');
        if (!el) { el = document.createElement('span'); el.className = 'ka-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('ka-ok', !!(pr && pr.st === 'solved'));
      o.lbl.classList.toggle('ka-no', !!(pr && pr.st === 'failed'));
    });
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.ka-x')) o.kaK = '';
  }
  placeLbls() {
    // ön tahtanın arkasında kalan etiketler silikleşir
    const v = this.view;
    const L = this.showBoard() ? this.L : null;
    for (const p of this.seats) {
      const a = this.av.get(p.id), o = this.lbl.get(p.id);
      if (!a || !o) continue;
      let op = 1;
      if (L) { const q = this.project(a.headW[0], a.headW[1] + 0.12, a.headW[2]); if (q && q[0] > L.cx - L.w / 2 - 20 && q[0] < L.cx + L.w / 2 + 20 && q[1] > L.cy - L.h / 2 - 10 && q[1] < L.cy + L.h / 2) op = 0.06; }
      o.op = op;
    }
    void v;
    super.placeLbls();
  }

  /* ---------- 2D yedek ---------- */
  draw2d() {
    const g = this.g2;
    if (!g) return;
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#14201b'; g.fillRect(0, 0, w, h);
    const v = this.view;
    if (!v) return;
    const L = this.layout();
    this.L = L;
    const act = v.phase === 'play' || v.phase === 'reveal';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // masadakiler: üstte satırlar halinde (ad + son renkler)
    const others = this.seats.map((p, i) => ({ p, i, pr: act ? (v.prog || [])[i] : null })).filter((x) => x.i !== v.me);
    const top = L.land ? 100 : 112, colW = Math.min(180, (L.land ? L.cx - L.w / 2 - 20 : w - 20) / 2);
    others.forEach(({ p, pr }, k) => {
      const x0 = 10 + (k % 2) * colW, y0 = top + Math.floor(k / 2) * 26;
      g.fillStyle = pcol(p.c); g.beginPath(); g.arc(x0 + 8, y0, 6, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.font = '800 11px system-ui'; g.textAlign = 'left';
      g.fillText(String(nm0(p.n)).slice(0, 9), x0 + 18, y0);
      g.textAlign = 'center';
      for (let j = 0; j < 5; j++) {
        const c = pr && pr.last ? FACE[pr.last[j]] : '#3a4440';
        g.fillStyle = c; g.fillRect(x0 + 84 + j * 13, y0 - 6, 11, 11);
      }
      if (pr) { g.fillStyle = pr.st === 'solved' ? '#3ccf6e' : '#cfd6d2'; g.font = '900 10px system-ui'; g.fillText(pr.st === 'solved' ? '✓' : pr.st === 'failed' ? '✗' : `${pr.rows}/6`, x0 + 160, y0); }
    });
    if (v.phase === 'reveal' && v.word) { g.font = `900 34px ${FONT}`; g.fillStyle = '#3ccf6e'; g.fillText(v.word, L.land ? (L.cx - L.w / 2) / 2 : w / 2, L.cy - L.h / 2 - 30); }
    if (!act || v.me < 0) return;
    // kendi tahtam
    const s = L.s, gp = 0.1 * s;
    for (const o of this.cells()) {
      const x = L.cx + (o.col - 2) * (s + gp) + o.dx * s, y = L.cy - (2.5 - o.row) * (s + gp) - o.dy * s;
      const sc = o.sc * (o.fb >= 0 ? Math.abs(Math.cos(o.roll * Math.PI)) * 0.9 + 0.1 : 1);
      const col = o.fb >= 0 ? (o.roll > 0.5 ? FACE[o.fb] : CREAM) : o.ch ? CREAM : '#3a4440';
      g.fillStyle = col;
      const hw = (s * o.sc) / 2, hh = (s * sc) / 2;
      g.fillRect(x - hw, y - hh, hw * 2, hh * 2);
      if (o.ch) { g.fillStyle = '#1c1633'; g.font = `900 ${Math.round(s * 0.56)}px ${FONT}`; g.fillText(o.ch, x, y + s * 0.03); }
    }
  }
  draw2dGame() { /* draw2d tamamen burada */ }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new WordGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[kav]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
