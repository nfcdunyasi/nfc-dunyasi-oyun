// Aramızdaki Casus — 3D casus avı masası (NFC Dünyası Oyun)
// Loş bir restoran masası; ortada sorgu lambası. Herkesin önünde kapalı bir kart var: kelimeler aynı, yalnız birininki
// farklı ve o kişi casus olduğunu bilmiyor. Kartlara gizlice bakılır; sonra sırayla ipucu verilir: lamba konuşana döner,
// başının üstünde ipucu balonu çıkar. Oylamada herkes casus sandığını seçer; açılışta herkes oy verdiğini gösterir, oklar
// masaya düşer, lamba casusa döner ve casus güneş gözlüklerini takar. Yakalanan casus masanın kelimesini bilirse kazanır.
// Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-g';
import * as sfx from '../sfx.js?v=2026-11-21-g';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, HC, HR, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;

const CARD_Z = 0.58;           // kartın koltuktan uzaklığı (masada, koltuk uzayı)
const CARD_X = -0.06;          // kart oyuncunun önünde, biraz sağında (koltuk uzayında +x oyuncunun solu)
const CW = 0.075, CL = 0.108;  // kartın yarı eni / yarı boyu
const LS = 1.5;                // sorgu lambasının ölçeği
const LAMP_J = [0, TABLE_Y + 0.004 + 0.34 * LS, 0];   // lamba başlığının mafsalı (dünya)
const RED3 = [1, 0.22, 0.2], BLUE3 = [0.25, 0.45, 1], WARM3 = [1, 0.82, 0.55];
const REASON = {
  tie: 'Oylar bölündü, casus aradan sıvıştı.',
  novote: 'Kimse oy vermedi, casus rahatça kaçtı.',
  wrong: '{a} masumdu! Yanlış kişiyi seçtiniz.',
  guessed: 'Casus yakalandı ama masanın kelimesini bildi.',
  caught: 'Casus yakalandı ve kelimeyi bilemedi.',
  timeout: 'Casus yakalandı, süresinde tahmin edemedi.',
  spyLeft: 'Casus masayı terk etti. Tur sizin!'
};

const STYLE = `
#ky.acs .msg{top:13%}
#ky.acs .cs-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 12px 11px;text-align:center}
#ky.acs .cs-box.dark{background:#22192d;color:#fff}
#ky.acs .cs-box .h{font-size:clamp(16px,4.4vw,20px);font-weight:900;line-height:1.18}
#ky.acs .cs-box .s{font-size:12.5px;font-weight:700;opacity:.7;line-height:1.3;margin-top:3px}
#ky.acs .cs-row{display:flex;gap:8px;align-items:stretch;justify-content:center;margin-top:8px;flex-wrap:wrap}
#ky.acs .cs-in{flex:1 1 150px;min-width:0;border:3px solid var(--ink);border-radius:14px;padding:9px 12px;font-size:17px;font-weight:800;color:var(--ink);background:#fff;outline:none}
#ky.acs .cs-in:focus{box-shadow:0 0 0 3px #ffd23f}
#ky.acs .cs-b{border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);padding:8px 14px;font-weight:900;font-size:15px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.acs .cs-b.alt{background:#fff}
#ky.acs .cs-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:13px;padding:6px 10px}
#ky.acs .cs-b:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.acs .cs-b[disabled]{opacity:.5}
#ky.acs .cs-card{display:block;width:100%;margin-top:8px;border:4px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);background:repeating-linear-gradient(45deg,#7a1c2c 0 10px,#8d2234 10px 20px);color:#fff;padding:16px 10px;font-weight:900;font-size:18px;-webkit-tap-highlight-color:transparent}
#ky.acs .cs-card small{display:block;font-size:12px;font-weight:700;opacity:.85;margin-top:4px}
#ky.acs .cs-word{margin-top:8px;border:4px solid var(--ink);border-radius:18px;background:#fff;color:var(--ink);padding:10px 10px 12px;animation:kyin .3s cubic-bezier(.2,1.5,.4,1)}
#ky.acs .cs-word small{display:block;font-size:12px;font-weight:800;opacity:.6}
#ky.acs .cs-word b{display:block;font-size:clamp(26px,8vw,36px);font-weight:900;line-height:1.1;margin-top:2px}
#ky.acs .cs-mini{display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-size:13px;font-weight:800;background:rgba(0,0,0,.06);border-radius:99px;padding:4px 10px}
#ky.acs .cs-box.dark .cs-mini{background:rgba(255,255,255,.12)}
#ky.acs .cs-mini b{font-weight:900}
#ky.acs .cs-tm{height:6px;border-radius:9px;background:rgba(0,0,0,.12);overflow:hidden;margin-top:8px}
#ky.acs .cs-tm i{display:block;height:100%;background:#ff5a36;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.acs .cs-vote{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(150px,44vw),1fr));gap:7px;margin-top:8px;max-height:min(34vh,260px);overflow:auto;overscroll-behavior:contain}
#ky.acs .cs-vote button{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);background:#fff;color:var(--ink);padding:6px 9px 7px 30px;text-align:left;font-weight:900;font-size:14.5px;line-height:1.15;min-width:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.acs .cs-vote button i{position:absolute;left:8px;top:8px;width:15px;height:15px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.acs .cs-vote button span{display:block;max-width:100%;font-size:11.5px;font-weight:700;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.acs .cs-vote button.on{background:#ff5a36;color:#fff}
#ky.acs .cs-vote button.on span{opacity:.9}
#ky.acs .cs-vote button[disabled]:not(.on){opacity:.55}
#ky.acs .cs-opts{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
#ky.acs .cs-opts button{border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);background:#fff;color:var(--ink);padding:9px 8px;font-weight:900;font-size:15px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.acs .cs-opts button[disabled]{opacity:.7;box-shadow:none}
#ky.acs .cs-opts button.hit{background:#3ccf6e;color:#fff}
#ky.acs .cs-opts button.miss{background:#ff5a36;color:#fff}
#ky.acs .cs-res .ws{display:flex;gap:7px;justify-content:center;margin-top:8px;flex-wrap:wrap}
#ky.acs .cs-res .ws div{border:3px solid var(--ink);border-radius:14px;padding:4px 10px 6px;background:#fff;min-width:110px}
#ky.acs .cs-res .ws div.spy{background:#2a2033;color:#fff}
#ky.acs .cs-res .ws small{display:block;font-size:11px;font-weight:800;opacity:.65}
#ky.acs .cs-res .ws b{font-size:19px;font-weight:900}
#ky.acs .cs-res.win{background:#d6f5e0}
#ky.acs .cs-res.lose{background:#2a2033;color:#fff}
#ky.acs .cs-res .kb{margin-top:9px}
#ky.acs .cs-res .kb[disabled]{opacity:.55;filter:grayscale(.3)}
#ky.acs .cs-bub{position:absolute;left:0;top:0;z-index:5;pointer-events:none;max-width:min(46vw,220px);font-weight:900;font-size:16px;line-height:1.15;background:#fff;color:#1c1633;border:3px solid #1c1633;border-radius:16px;padding:5px 11px;display:none;will-change:transform;box-shadow:2px 2px 0 #1c1633;text-align:center;white-space:normal;overflow-wrap:anywhere}
#ky.acs .cs-bub::after{content:"";position:absolute;left:calc(50% + var(--tx,0px));bottom:-10px;margin-left:-7px;border:7px solid transparent;border-top-color:#1c1633}
#ky.acs .cs-bub.sp{background:#ffe9a8}
#ky.acs .cs-bub.ps{background:#e3e3e8;color:#555}
#ky.acs .lbl .cs-sp{display:inline-block;font-weight:900;font-size:12px;color:#fff;background:#d7263d;border-radius:99px;padding:1px 7px;margin-left:2px;box-shadow:0 0 10px rgba(255,60,60,.7)}
#ky.acs .lbl .cs-x{display:inline-flex;align-items:center;gap:3px}
#ky.acs .lbl .cs-x:empty{display:none}
#ky.acs .lbl .cs-cl{display:block;max-width:150px;font-size:11px;font-weight:700;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
#ky.acs .lbl .cs-cl:empty{display:none}
#ky.acs .lbl .cs-pt{display:inline-block;font-weight:900;color:#3ccf6e;margin-left:2px}
#ky.acs .lbl.cs-turn{box-shadow:0 0 0 3px #ffd23f,0 0 16px rgba(255,210,63,.8)}
#ky.acs .card .cs-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.acs .card .cs-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.acs .card .cs-seg button.on{background:var(--ink);color:#fff}
#ky.acs .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.acs .card .cs-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.acs .card .cs-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.acs .card .cs-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.acs .card .cs-ru .a{background:#ffe3d6}#ky.acs .card .cs-ru .g{background:#e3dcff}#ky.acs .card .cs-ru .y{background:#d6f5e0}
#ky.acs .card .cs-tb{display:grid;gap:5px;margin-top:10px;max-height:min(30vh,250px);overflow:auto;text-align:left}
#ky.acs .card .cs-tb div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:4px 10px;background:#fff;font-weight:800;font-size:14px}
#ky.acs .card .cs-tb div.me{background:#fff4c2}
#ky.acs .card .cs-tb div i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.acs .card .cs-tb div span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.acs .card .cs-tb div em{font-style:normal;font-size:11.5px;opacity:.65;font-weight:700;white-space:nowrap}
#ky.acs .card .cs-tb div b{font-weight:900;white-space:nowrap}
#ky.acs .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.acs .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.acs .cs-box{width:min(430px,50vw);padding:6px 10px 8px}
#ky.acs .cs-box .h{font-size:16px}
#ky.acs .cs-vote{max-height:44vh}
#ky.acs .cs-card{padding:10px}
#ky.acs .card .cs-tb{max-height:22vh;margin-top:6px}
#ky.acs .card .cs-ru{margin-top:6px}#ky.acs .card .cs-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.acs .card .cs-ru div b{font-size:17px}
#ky.acs .card .cs-seg{margin-top:6px}#ky.acs .card .cs-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.acs .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// Mi minör "casus cazı": yürüyen bas, fırçalı trampet, swing ride, vibrafonda ünlü casus akoru (Em(maj7)).
// İpucu turu: aynı tema seyrek ve kısık, saat tıkırtısıyla. Oylama: alçak yaylı sesler, kalp atışı, tıkırtı.
class CsSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 96 : this.mode === 'calm' ? 84 : 112; }
  swing() { return this.mode === 'calm' ? 0 : 0.16; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    // Em – Em(maj7) – Em7 – Em6 | Am – B7
    const PROG = [[40, [64, 67, 71]], [40, [64, 67, 75]], [40, [64, 67, 74]], [40, [64, 67, 73]], [45, [69, 72, 76]], [45, [69, 72, 76]], [47, [71, 75, 78]], [47, [71, 75, 69]]];
    const [root, ch] = PROG[bar % 8];
    if (this.mode === 'calm') {
      // oylama: alçak yaylı pedal, kalp atışı, tıkırtı
      if (s === 0) this.iStr(t, [root - 12, root - 5, root], spb * 4, 0.014, 0.4, 900, 0.3);
      if (s === 0 || s === 3) this.iKick(t, s ? 0.07 : 0.1, 70, 40, 0.18);
      if (s % 4 === 0) this.iTick(t, 0.03);
      if (s === 8 && bar % 2 === 1) this.iVibe(t, ch[2] + 12, 0.012, spb * 1.5, 0.4);
      return;
    }
    const soft = this.mode === 'race';
    // yürüyen bas (çeyrekler)
    const WALK = [[0, 7, 10, 11], [0, 3, 5, 6], [0, 7, 9, 10], [0, 2, 3, 6]];
    if (s % 4 === 0) this.iBass(t, root + WALK[bar % 4][s >> 2], spb * 0.9, soft ? 0.06 : 0.085, 'up');
    // ride (swing)
    if (s % 4 === 0 || s % 4 === 3) this.iHat(t, soft ? 0.012 : 0.02, s % 8 === 0 && !soft);
    if (s === 4 || s === 12) this.iBrush(t, soft ? 0.03 : 0.05, 0.2);
    if (soft) {
      if (s % 4 === 0) this.iTick(t, 0.022);
      if (s === 6 && bar % 2 === 0) this.iVibe(t, ch[2] + 12, 0.012, spb * 1.2, 0.35);
      return;
    }
    // casus motifi: vibrafon + kısık trompet (Mi minör: E – F# – G – F# ...)
    const MOT = [64, 66, 67, 66, 64, 71, 70, 67];
    if (bar % 2 === 0 && s % 4 === 2) this.iVibe(t, MOT[(s >> 2) + (bar % 4 === 2 ? 4 : 0)] + 12, 0.02, spb * 0.8, 0.3);
    if (s === 0) ch.forEach((m, k) => this.iEP(t + k * 0.006, m, 0.008 * (k ? 0.8 : 1), spb * 1.6, 0.25));
    if (bar % 4 === 3 && s === 10) this.iBrass(t, ch[2] + 12, spb * 0.9, 0.02, 0.2);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'peek': // kart kayar ve çevrilir
        this.noise(t, 0.12, 0.09, { type: 'bandpass', freq: 2200, to: 900, q: 1.1, attack: 0.01 });
        this.noise(t + 0.13, 0.05, 0.12, { type: 'highpass', freq: 3000 });
        break;
      case 'seen': this.tone(660, t, 0.07, 'sine', 0.05, 880, 0.003); break;
      case 'turn': // sıra bende
        this.duck(0.4, 0.8);
        [[784, 0], [1175, 0.1], [1568, 0.2]].forEach(([f, d]) => this.tone(f, t + d, 0.2, 'triangle', 0.08, null, 0.003));
        break;
      case 'turnO': this.tone(523, t, 0.08, 'sine', 0.04, 660, 0.004); break;
      case 'clue': this.tone(1200, t, 0.05, 'sine', 0.07, 1700, 0.002); this.noise(t, 0.04, 0.05, { type: 'bandpass', freq: 3500, q: 2 }); break;
      case 'spoken': this.noise(t, 0.25, 0.07, { type: 'bandpass', freq: 600, to: 2400, q: 0.8, attack: 0.04 }); break;
      case 'pass': this.tone(330, t, 0.18, 'triangle', 0.05, 250, 0.01); break;
      case 'tick': this.tone(1760, t, 0.03, 'square', 0.035, null, 0.001); break;
      case 'vote': // mühür
        this.tone(140, t, 0.12, 'sine', 0.28, 70, 0.002);
        this.noise(t, 0.06, 0.18, { type: 'lowpass', freq: 900 });
        break;
      case 'reveal': // trampet sarışı + "dan dan daan"
        this.duck(0.25, 2.5);
        for (let i = 0; i < 18; i++) this.noise(t + i * 0.045, 0.04, 0.03 + i * 0.004, { type: 'bandpass', freq: 2400, q: 0.9 });
        [[0.85, 330], [1.05, 311], [1.3, 247]].forEach(([d, f]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), d > 1.2 ? 0.9 : 0.18, 0.05, 0.25); this.tone(f / 2, t + d, d > 1.2 ? 0.9 : 0.18, 'sawtooth', 0.025, null, 0.01); });
        break;
      case 'siren': // polis düdüğü: iki ton
        this.duck(0.3, 2.2);
        for (let i = 0; i < 6; i++) this.tone(i % 2 ? 660 : 880, t + i * 0.32, 0.3, 'triangle', 0.06, null, 0.02);
        break;
      case 'caught': // masa kazandı
        this.duck(0.2, 2.6);
        [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.7]].forEach(([f, d, L]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), L, 0.05, 0.15); this.tone(f, t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 1.8);
        break;
      case 'spywin': // casus sıvıştı: sinsi inen ezgi
        this.duck(0.25, 2.4);
        [[659, 0], [622, 0.18], [587, 0.36], [554, 0.54], [523, 0.72], [494, 0.9]].forEach(([f, d]) => this.tone(f, t + d, 0.16, 'triangle', 0.06, null, 0.004));
        this.tone(165, t + 1.1, 0.7, 'sawtooth', 0.04, 110, 0.02);
        break;
      case 'champ':
        this.duck(0.15, 3);
        [[523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [659, 0.45, 0.5], [784, 0.62, 0.9]].forEach(([f, d, L]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), L, 0.06, 0.15); this.tone(f, t + d, L, 'triangle', 0.05); });
        this.noise(t + 0.62, 1.4, 0.16, { type: 'highpass', freq: 4400 });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// kart: krem kenarlı ince karton; üstte (arka yüz) bordo desen ve altın elmas; ön yüz (alt, -y) dokulu dörtgen
function cardModel(mb) {
  const W = C('#f3ead8', -0.3), Bd = C('#7a1c2c', -0.5), G = C('#e2b552', -0.8);
  mb.rbox(-CW, -0.0012, -CL, CW, 0.0012, CL, 0.001, W, 1);
  mb.rbox(-CW + 0.006, 0.0006, -CL + 0.006, CW - 0.006, 0.0016, CL - 0.006, 0.001, Bd, 1);
  // altın elmas + küçük casus şapkası silueti yerine iki iç içe elmas
  const dia = (s, y, col) => { mb.quad([0, y, -s * 1.4], [s, y, 0], [0, y, s * 1.4], [-s, y, 0], col, [0, y - 1, 0]); };
  dia(0.026, 0.0019, G);
  dia(0.017, 0.002, Bd);
  dia(0.008, 0.0021, G);
}
// ön yüz: dokunun yarısı (u0..u1); kartın altında, -y'ye bakar (kart ters çevrilince görünür)
function cardFace(tb, u0, u1) {
  const y = -0.0016, x0 = -CW + 0.003, x1 = CW - 0.003, z0 = -CL + 0.003, z1 = CL - 0.003;
  // alttan bakınca okunur olsun: x ekseni ters (kart z ekseni etrafında çevrildiğinde düzelir)
  tb.tquad([x1, y, z1], [x0, y, z1], [x0, y, z0], [x1, y, z0], u0, 0, u1, 1, [0, y + 1, 0]);
}
// sorgu lambası: ayak + gövde (sabit)
function lampBase(mb) {
  const Mt = C('#2a2a30', -0.85), Br = C('#b8892f', -0.7);
  mb.lathe(0, 0, 0, [[0, 0], [0.085, 0], [0.088, 0.006], [0.07, 0.016], [0.02, 0.022], [0.016, 0.03], [0, 0.03]], 28, Mt);
  limb(mb, [0, 0.025, 0], [0, 0.32, 0], [0.011, 0.009], Mt, 10);
  mb.sphereS(0, 0.34, 0, 0.017, 0.017, 0.017, Br, 12, 8);
}
// başlık (mafsal orijinde, ağzı -y'ye bakar): dışı koyu yeşil emaye, içi beyaz, ampul
function lampShade(mb) {
  const Gr = C('#1f5a3f', -0.85), Wh = C('#f4efe2', -0.4), Br = C('#b8892f', -0.7);
  limb(mb, [0, 0, 0], [0, -0.03, 0], [0.008, 0.008], Br, 8);
  mb.lathe(0, -0.03, 0, [[0.012, 0.004], [0.03, -0.012], [0.058, -0.05], [0.082, -0.092], [0.086, -0.098]], 28, Gr);
  mb.lathe(0, -0.03, 0, [[0.083, -0.094], [0.055, -0.052], [0.028, -0.016], [0.01, -0.004]], 28, Wh);
}
function bulbModel(mb) { mb.sphereS(0, -0.065, 0, 0.026, 0.024, 0.026, C('#fff3c9', 1), 14, 10); }
// ışık konisi ('un'): başlığın ağzından -y boyunca, uca doğru sönen
function coneModel(mb) {
  const N = 28, L = 1.25, r0 = 0.07, r1 = 0.42, y0 = -0.09;
  const v = (p, a) => mb.d.push(p[0], p[1], p[2], 1, 0.9, 0.7, a);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const A = P(a0, r0, y0), B = P(a1, r0, y0), Cc = P(a1, r1, y0 - L), D = P(a0, r1, y0 - L);
    v(A, 0.16); v(B, 0.16); v(Cc, 0); v(A, 0.16); v(Cc, 0); v(D, 0);
  }
}
// güneş gözlüğü (baş matrisinde; yüz +z'ye bakar)
function shadesModel(mb) {
  const [cx, cy, cz] = HC, r = HR;
  const L = C('#0d0c12', -0.95), F = C('#15141a', -0.8);
  for (const s of [-1, 1]) {
    mb.sphereS(cx + s * r * 0.37, cy + r * 0.14, cz + r * 0.93, r * 0.31, r * 0.21, r * 0.06, L, 16, 10);
    limb(mb, [cx + s * r * 0.66, cy + r * 0.2, cz + r * 0.86], [cx + s * r * 0.99, cy + r * 0.18, cz + r * 0.05], [r * 0.035, r * 0.03], F, 6);
  }
  limb(mb, [cx - r * 0.1, cy + r * 0.19, cz + r * 0.98], [cx + r * 0.1, cy + r * 0.19, cz + r * 0.98], [r * 0.03, r * 0.03], F, 6);
}
// oy oku ('un', +z boyunca birim uzunluk): gövde + uç; köşe saydamlığı uca doğru artar
function arrowModel(mb) {
  const v = (x, z, a) => mb.d.push(x, 0, z, 1, 1, 1, a);
  const tri = (a, b, c) => { v(...a); v(...b); v(...c); };
  tri([-0.22, 0, 0.25], [0.22, 0, 0.25], [0.22, 0.8, 0.75]); tri([-0.22, 0, 0.25], [0.22, 0.8, 0.75], [-0.22, 0.8, 0.75]);
  tri([-0.5, 0.8, 0.85], [0.5, 0.8, 0.85], [0, 1, 0.95]);
}

/* ---------- kart yüzü dokusu: sol yarı masanın kelimesi, sağ yarı casusun kelimesi ---------- */
function drawFaces(cv, word, other) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, hw = W / 2;
  g.clearRect(0, 0, W, H);
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  [[word, '#1c1633', '#fbf7ef', 'KELİME'], [other, '#c2185b', '#fff0f3', 'CASUS']].forEach(([w, ink, bg, tag], k) => {
    const x0 = k * hw;
    g.fillStyle = bg; g.fillRect(x0, 0, hw, H);
    g.strokeStyle = ink; g.lineWidth = 10; g.strokeRect(x0 + 12, 12, hw - 24, H - 24);
    g.lineWidth = 3; g.strokeRect(x0 + 26, 26, hw - 52, H - 52);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 30px ${F}`;
    g.fillText(tag, x0 + hw / 2, 66);
    // kelime: genişliğe sığacak boyda, gerekirse iki satır
    const txt = String(w || '?');
    const parts = txt.length > 10 && txt.includes(' ') ? [txt.slice(0, txt.lastIndexOf(' ', 12) > 0 ? txt.lastIndexOf(' ', 12) : txt.indexOf(' ')), txt.slice((txt.lastIndexOf(' ', 12) > 0 ? txt.lastIndexOf(' ', 12) : txt.indexOf(' ')) + 1)] : [txt];
    let fs = 78;
    const maxW = hw - 70;
    g.font = `900 ${fs}px ${F}`;
    while (fs > 30 && Math.max(...parts.map((p) => g.measureText(p).width)) > maxW) { fs -= 4; g.font = `900 ${fs}px ${F}`; }
    parts.forEach((p, i) => g.fillText(p, x0 + hw / 2, H / 2 + 14 + (i - (parts.length - 1) / 2) * fs * 1.05));
    g.font = `700 40px ${F}`;
    g.fillText(k ? '🕶️' : '🃏', x0 + hw / 2, H - 70);
  });
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
// sunucudaki denetimin hafif bir kopyası: anında uyarı için (son karar sunucuda)
const norm = (t) => String(t || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().replace(/[^0-9a-zçğıöşüâîû ]+/g, ' ').replace(/\s+/g, ' ').trim();
const reveals = (clue, word) => {
  const c = norm(clue), w = norm(word);
  if (!c || !w) return false;
  if (c === w || (w.length >= 4 && c.includes(w))) return true;
  const wt = w.split(' ');
  return c.split(' ').some((t) => wt.some((x) => x.length >= 2 && (wt.length === 1 || x.length >= 3) && (t === x || (t.startsWith(x) && (x.length >= 3 || t.length <= x.length + 3)))));
};
const clueTxt = (t) => (t === null ? '🗣️' : t === '' ? '…' : t);

/* ============================ oyun ============================ */
class SpyGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'acs', cls: 'acs', title: 'Aramızdaki Casus', sub: 'Kelimeler aynı… biri hariç!', emoji: '🕶️', css: STYLE, snd: new CsSnd(), amb: 'diner', ambVol: 0.4, botPx: 230, botPxL: 34, cloth: '#2f5a46', trim: '#d6a64a', place: false, tea: false, lampHex: '#203a2e', chairPad: '#5b1f2a' });
    this.peek = { key: '', on: false, until: 0, seen: false };   // yerel: kartıma bakıyor muyum
    this.seenT = new Map();     // koltuk → kartına baktığı an (animasyon)
    this.bubs = new Map();      // koltuk → { t, at, el }
    this.lastSeq = 0;
    this.lampYaw = 0; this.lampPit = 0.6;
    this.lampK = 1;
    this.el.posS.textContent = '';
    this.faceKey = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.card = this.mk(cardModel);
    W.faceL = this.mk((tb) => cardFace(tb, 0, 0.5), 'tex');
    W.faceR = this.mk((tb) => cardFace(tb, 0.5, 1), 'tex');
    W.lampB = this.mk(lampBase);
    W.shade = this.mk(lampShade);
    W.bulb = this.mk(bulbModel);
    W.cone = this.mk(coneModel, 'un');
    W.shades = this.mk(shadesModel);
    W.arrow = this.mk(arrowModel, 'un');
    W.trophy = this.mk(trophyModel);
    this.faceCv = document.createElement('canvas');
    this.faceCv.width = 512; this.faceCv.height = 384;
    this.faceTex = makeTexture(this.X, this.faceCv);
    this.faceKey = '';
  }
  freeTex() { if (this.faceTex && this.X) this.X.gl.deleteTexture(this.faceTex); this.faceTex = null; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  rkey() { const v = this.view; return v ? `${v.game}:${v.round}` : ''; }
  myWord() { return this.view?.myWord || ''; }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      const pop = () => { try { this.snd.fx('pop'); } catch { /* yok */ } };
      if (act === 'cs-mode') { const m = b.dataset.m; if (v && v.mode !== m) { pop(); this.ctx.send('mode', { m }); } }
      else if (act === 'cs-start') { pop(); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'cs-flip') { this.openCard(true); }
      else if (act === 'cs-seen') { this.peek.on = false; this.peek.seen = true; try { this.snd.fx('seen'); } catch { /* yok */ } this.ctx.send('seen', {}); this.bar(); }
      else if (act === 'cs-peek') { this.openCard(false); }
      else if (act === 'cs-send') this.sendClue();
      else if (act === 'cs-spoken') { pop(); this.ctx.send('clue', { spoken: 1 }); }
      else if (act === 'cs-tovote') { pop(); this.ctx.send('toVote', {}); }
      else if (act === 'cs-vote') { const t = +b.dataset.t; if (v && v.myVote !== t) { try { this.snd.fx('vote'); } catch { /* yok */ } vibrate(15); this.ctx.send('vote', { t }); } }
      else if (act === 'cs-guess') { pop(); this.ctx.send('guess', { w: b.dataset.w }); }
      else if (act === 'cs-next') { pop(); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.el.bar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('cs-in')) { e.preventDefault(); this.sendClue(); }
    });
  }
  // kartıma bak: kart fazında "Gördüm"e kadar açık; sonra 3 sn
  openCard(first) {
    const v = this.view;
    if (!v || !v.myWord) return;
    this.peek = { key: this.rkey(), on: true, until: first ? 0 : performance.now() + 3200, seen: this.peek.key === this.rkey() && this.peek.seen };
    this.peekT = this.time;
    try { this.snd.fx('peek'); } catch { /* yok */ }
    vibrate(20);
    this.bar();
  }
  peekOn() {
    const p = this.peek;
    if (!p.on || p.key !== this.rkey()) return false;
    if (p.until && performance.now() > p.until) { p.on = false; return false; }
    return true;
  }
  sendClue() {
    const v = this.view, inp = this.el.bar.querySelector('.cs-in');
    if (!v || v.phase !== 'clue' || v.turn !== v.me || !inp) return;
    const t = inp.value.replace(/\s+/g, ' ').trim();
    if (norm(t).length < 2) { this.msg('Kısa bir ipucu yaz ✍️', 'mid'); inp.focus(); return; }
    if (reveals(t, v.myWord)) { this.msg('Kelimeni söyleyemezsin 🤫', 'mid'); try { this.snd.fx('pass'); } catch { /* yok */ } inp.select(); return; }
    try { this.snd.fx('pop'); } catch { /* yok */ }
    this.ctx.send('clue', { t });
    inp.value = '';
    inp.blur();
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.acs !== '1') { root.dataset.acs = '1'; root.innerHTML = '<p class="py-16 text-center">🕶️</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // kartına bakanlar
    if (v.phase === 'card' && v.seen) v.seen.forEach((x, i) => { if (x && !(prev && prev.phase === 'card' && prev.round === v.round && prev.seen && prev.seen[i])) { this.seenT.set(i, this.time); if (i !== v.me && prev && prev.phase === 'card') { try { this.snd.fx('seen'); } catch { /* yok */ } } } });
    // sıra değişti
    if (v.phase === 'clue' && (!prev || prev.phase !== 'clue' || prev.turn !== v.turn || prev.turnAt !== v.turnAt)) {
      const fresh = ctx.serverNow() - (v.turnAt || 0) < 1500;
      if (fresh) {
        if (v.turn === v.me) { try { this.snd.fx('turn'); } catch { /* yok */ } vibrate([20, 30, 20]); this.msg('🎤 SIRA SENDE', 'mid'); }
        else { try { this.snd.fx('turnO'); } catch { /* yok */ } }
      }
      this.turnT = this.time;
    }
    // yeni ipucu: balon
    if (v.last && v.last.seq !== this.lastSeq) {
      const fresh = ctx.serverNow() - v.last.at < 2500;
      this.lastSeq = v.last.seq;
      if (fresh && (v.phase === 'clue' || v.phase === 'vote')) {
        this.bubs.set(v.last.i, { t: v.last.t, at: this.time, to: v.last.to });
        try { this.snd.fx(v.last.t === null ? 'spoken' : v.last.t === '' ? 'pass' : 'clue'); } catch { /* yok */ }
      }
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const sNow = this.ctx.serverNow();
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } }
    if (v.phase === 'card') {
      try { S.music('race'); } catch { /* yok */ }
      this.bubs.forEach((b) => b.el && b.el.remove());
      this.bubs.clear();
      this.seenT.clear();
      if (this.peek.key !== this.rkey()) this.peek = { key: this.rkey(), on: false, until: 0, seen: false };
      if (sNow - (v.endsAt - (v.cardMs || 25e3)) < 1500) { this.msg(`${v.round}. TUR`, 'mid'); fx('peek'); }
    }
    if (v.phase === 'clue') { try { S.music('race'); } catch { /* yok */ } }
    if (v.phase === 'vote') {
      try { S.music('calm'); } catch { /* yok */ }
      if (sNow - (v.endsAt - (v.voteMs || 45e3)) < 1500) this.msg('🕵️ CASUS KİM?', 'mid');
    }
    if (v.phase === 'guess') {
      try { S.music('calm'); } catch { /* yok */ }
      this.guessT = this.time;
      if (sNow - (v.endsAt - (v.guessMs || 2e4)) < 1500) {
        fx('siren');
        const p = v.seats[v.accused];
        this.msg(v.amSpy ? '🚨 YAKALANDIN!' : `🚨 ${esc(nm0(p?.n || ''))} YAKALANDI!`, 'mid');
        this.flash('rgba(255,40,40,.35)', true);
        if (v.amSpy) vibrate([40, 40, 40]);
      }
    }
    if (v.phase === 'result') {
      try { S.music('idle'); } catch { /* yok */ }
      const fresh = sNow - (v.resAt || 0) < 1500;
      this.resT = this.time - (fresh ? 0 : 6);
      if (fresh) {
        fx('reveal');
        setTimeout(() => {
          if (this.dead || !this.view || this.view.phase !== 'result') return;
          const w = this.view;
          const iSpy = w.spy === w.me;
          const won = w.me >= 0 && (iSpy ? w.spyWon : !w.spyWon);
          fx(w.spyWon ? 'spywin' : 'caught');
          this.msg(w.spyWon ? '🕶️ CASUS KAZANDI' : '🎉 MASA KAZANDI', 'big');
          if (won) vibrate([30, 40, 30]);
          const a = this.avatarAt(w.spy);
          if (this.X && a) {
            const col = w.spyWon ? [[0.15, 0.12, 0.2], [1, 0.35, 0.3], [1, 0.8, 0.3]] : [[1, 0.85, 0.3], [0.3, 0.85, 0.5], [1, 1, 1]];
            this.burst(a.headW[0], a.headW[1] + 0.3, a.headW[2], 40, col, 1.6, 0.03, false, 1.8, 2.2);
          }
        }, 1700);
      }
    }
    if (v.phase === 'final') {
      try { S.music('idle'); } catch { /* yok */ }
      const late = sNow - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      if (!late) {
        fx('champ');
        const c = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n || '')));
        this.msg(c.length ? `🏆 ${c.join(' & ')}` : 'OYUN BİTTİ', 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, [[1, 0.85, 0.3], [1, 0.4, 0.3], [0.3, 0.8, 1], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.2); });
      }
    }
  }

  /* ---------- karakterler ---------- */
  // dünya noktasını göster (hedef koltuk uzayında sağdaysa sağ el)
  pointTo(a, w) { const L = a.toSeat(w); a.pointAt(w, L[0] > 0 ? 1 : 0); }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const sp = v.phase === 'clue' ? this.avatarAt(v.turn) : v.phase === 'guess' ? this.avatarAt(v.accused) : v.phase === 'result' ? this.avatarAt(v.spy) : null;
    const center = [0, TABLE_Y + 0.35, 0];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { lt: 0, look: null, pose: 'rest' };
      const idleLook = (pool) => { a.idle.lt -= dt; if (a.idle.lt <= 0) { a.idle.lt = 1.2 + Math.random() * 2.4; a.idle.look = pool[Math.floor(Math.random() * pool.length)]; } return a.idle.look; };
      // kartına bakma: kartı yüzüne kaldırır (arkası masaya dönük)
      const holdCard = () => {
        a.pose('rest', { t });
        a.k = 9;
        a.tgt.hand[0] = [-0.07, 1.08, 0.3];
        a.tgt.fdir[0] = [0.15, 1, 0.35]; a.tgt.palm[0] = [0.2, 0.2, -1]; a.tgt.fw[0] = 0.75; a.tgt.pole[0] = [-0.9, -0.5, -0.1];
        a.shape[0] = 'grip';
        a.expr = 'tense';
        a.look = this.cardHoldW(a);
      };
      const mine = i === v.me;
      if (v.phase === 'card') {
        const st = this.seenT.get(i);
        const looking = (mine && this.peekOn()) || (st != null && t - st < 1.8);
        if (looking) { holdCard(); return; }
        a.pose(v.seen && v.seen[i] ? 'clasp' : 'rest', { t });
        a.expr = 'smile';
        a.look = idleLook(this.seats.map((_, k) => this.avatarAt(k)?.headW).filter(Boolean));
        return;
      }
      if (mine && this.peekOn()) { holdCard(); return; }
      if (v.phase === 'clue') {
        if (i === v.turn) {
          // konuşuyor: el kol hareketleri, ağız açılıp kapanır
          a.pose('rest', { t });
          const w = Math.sin(t * 5.2 + i), w2 = Math.sin(t * 3.1 + i * 2);
          a.tgt.hand[1] = [0.13 + w * 0.05, 0.98 + w2 * 0.05, 0.36];
          a.tgt.fdir[1] = [-0.2, 0.6, 0.8]; a.tgt.palm[1] = [-0.3, 0.6, 0.6]; a.tgt.fw[1] = 0.6; a.tgt.pole[1] = [0.9, -0.5, -0.1];
          a.shape[1] = 'open';
          a.expr = Math.floor(t * 7) % 2 ? 'o' : 'smile';
          a.look = idleLook(this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean)) || center;
          return;
        }
        a.pose(hs(i, Math.floor(t / 7)) < 0.5 ? 'chin' : 'rest', { t });
        a.expr = 'smile';
        a.look = sp ? sp.headW : center;
        return;
      }
      if (v.phase === 'vote') {
        const voted = v.voted && v.voted[i];
        a.pose(voted ? 'clasp' : hs(i, 3) < 0.5 ? 'chin' : 'bite', { t });
        a.expr = voted ? 'smile' : 'tense';
        a.look = idleLook(this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean)) || center;
        return;
      }
      if (v.phase === 'guess') {
        if (i === v.accused) { a.pose((t - (this.guessT || 0)) < 2 ? 'headgrab' : 'chin', { t }); a.expr = 'wince'; a.look = center; return; }
        a.pose(hs(i, 5) < 0.5 ? 'lean' : 'clasp', { t });
        a.expr = 'grin';
        a.look = sp ? sp.headW : center;
        return;
      }
      if (v.phase === 'result') {
        const u = t - (this.resT || 0);
        const tgt = v.votes ? v.votes[i] : -1;
        const ta = tgt >= 0 ? this.avatarAt(tgt) : null;
        if (u < 1.7 && ta) { a.pose('rest', { t }); this.pointTo(a, ta.headW); a.expr = 'tense'; a.look = ta.headW; return; }
        const iSpy = i === v.spy;
        const happy = iSpy ? v.spyWon : !v.spyWon;
        if (u < 1.7) { a.pose('clasp', { t }); a.expr = 'tense'; a.look = sp ? sp.headW : center; return; }
        if (happy) { a.pose(Math.floor((u - 1.7) / 2.2 + i) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; }
        else { a.pose(iSpy ? 'facepalm' : hs(i, v.round) < 0.5 ? 'headgrab' : 'slump', { t }); a.expr = iSpy ? 'sad' : 'wince'; }
        a.look = sp && !iSpy ? sp.headW : center;
        return;
      }
      if (v.phase === 'final') {
        const champ = (v.champ || []).includes(i);
        const u = t - (this.finT || 0);
        if (champ) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'wave', { t }); a.expr = 'laugh'; }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; }
        const c = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
        a.look = c && !champ ? c.headW : center;
        return;
      }
      // giriş
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = idleLook(this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean)) || center;
    });
  }
  // elde tutulan kartın dünya konumu
  cardHoldW(a) { const h = a.hw[0]; return [h[0], h[1] + 0.08, h[2]]; }

  /* ---------- kamera + lamba ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time;
    // lambanın hedefi
    let tw = null;
    if (v.phase === 'clue') tw = this.avatarAt(v.turn)?.headW;
    else if (v.phase === 'guess') tw = this.avatarAt(v.accused)?.headW;
    else if (v.phase === 'result' && t - (this.resT || 0) > 1.2) tw = this.avatarAt(v.spy)?.headW;
    else if (v.phase === 'final' && (v.champ || []).length) tw = this.avatarAt(v.champ[0])?.headW;
    let yaw, pit;
    if (tw) {
      const dx = tw[0] - LAMP_J[0], dz = tw[2] - LAMP_J[2], dy = tw[1] - 0.18 - LAMP_J[1];
      yaw = Math.atan2(dx, dz); pit = Math.atan2(-dy, Math.hypot(dx, dz));
    } else { yaw = t * (v.phase === 'vote' ? 0.55 : 0.25); pit = 0.42 + Math.sin(t * 0.7) * 0.08; }
    this.lampYaw += angDiff(yaw, this.lampYaw) * (1 - Math.exp(-(tw ? 4 : 1.5) * dt));
    this.lampPit = damp(this.lampPit, pit, 4, dt);
    // sahne ışığı: ipucu ve oylamada loş (lamba öne çıksın)
    const dim = v.phase === 'clue' || v.phase === 'vote' || v.phase === 'guess' || (v.phase === 'result' && t - (this.resT || 0) < 2.5);
    this.lampK = damp(this.lampK, dim ? 0.6 : 0.95, 2, dt);
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = 230, H = [0, TABLE_Y + 0.3, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.4;
    const n = this.seats.length;
    if (v.phase === 'clue') {
      const a = this.avatarAt(v.turn);
      zoom = n <= 6 ? 0.82 : 0.95; bp = v.turn === v.me ? 250 : 200;
      if (a) H = [lerp(0, a.headW[0], 0.4), TABLE_Y + 0.35, lerp(0, a.headW[2], 0.4)];
    } else if (v.phase === 'vote') { zoom = 1; bp = n > 7 ? 330 : 280; sy = land ? 0.5 : 0.36; }
    else if (v.phase === 'guess') {
      // kamera masanın öbür yanına döner: yakalanan casusun yüzü (ve gözlüğü) görünsün
      const a = this.avatarAt(v.accused);
      zoom = 0.6; bp = 260; sy = land ? 0.45 : 0.33;
      if (a) { H = [a.headW[0] * 0.8, a.headW[1] - 0.15, a.headW[2] * 0.8]; yawC = Math.atan2(-a.pos[0], -a.pos[2]); }
    } else if (v.phase === 'result') {
      const a = this.avatarAt(v.spy), u = t - (this.resT || 0);
      bp = 290;
      if (a && u > 1.2 && u < 6.5) { zoom = 0.6; sy = land ? 0.45 : 0.33; H = [a.headW[0] * 0.8, a.headW[1] - 0.15, a.headW[2] * 0.8]; yawC = Math.atan2(-a.pos[0], -a.pos[2]); }
      else { zoom = 0.95; sy = land ? 0.5 : 0.36; }
    } else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else if (v.phase === 'card') { zoom = 0.9; bp = 260; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // son saniyeler: tıkırtı (sıra bendeyse ya da oylamada oy vermediysem)
    const left = (v.endsAt || 0) - this.ctx.serverNow();
    const urgent = (v.phase === 'clue' && v.turn === v.me) || (v.phase === 'vote' && v.me >= 0 && v.myVote < 0 && v.inGame) || (v.phase === 'guess' && v.amSpy);
    if (urgent && left > 0 && left < 5500) {
      const sec = Math.ceil(left / 1000);
      if (sec !== this.tickSec) { this.tickSec = sec; try { this.snd.fx('tick'); } catch { /* yok */ } }
    }
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
  // kartın matrisi: masada (kapalı/açık) ya da elde
  cardMat(m, a, i, up) {
    const v = this.view;
    const looking = v && ((i === v.me && this.peekOn()) || (v.phase === 'card' && this.seenT.has(i) && this.time - this.seenT.get(i) < 1.8));
    if (looking) {
      // elde, yüzü oyuncuya dönük (arkası masaya): kartın +y'si oyuncuya bakar
      const h = this.cardHoldW(a);
      M.set(m, h[0], h[1], h[2], a.yaw + Math.PI, -Math.PI / 2 + 0.25, 0, 1);
      return true;
    }
    const q = this.seatW(a, CARD_X, TABLE_Y + 0.006, CARD_Z);
    const y0 = a.yaw - 0.15;
    if (up > 0) {
      // açılış: kart z ekseni etrafında döner (yüzü yukarı); yazı kameradan okunur olsun diye kameraya doğru çevrilir
      const cy = Math.atan2(this.cam.ex - q[0], this.cam.ez - q[2]);
      M.set(m, q[0], q[1] + Math.sin(up * Math.PI) * 0.08, q[2], y0 + angDiff(cy, y0) * Math.min(1, up * 1.5), 0, up * Math.PI, 1);
    } else M.set(m, q[0], q[1], q[2], y0, 0, 0, 1);
    return false;
  }
  flipK(i) {
    const v = this.view;
    if (!v || v.phase !== 'result') return 0;
    const u = this.time - (this.resT || 0) - (i === v.spy ? 1.6 : 2.2) - (i * 0.05);
    return clamp(u / 0.45, 0, 1);
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.card || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T;
    // lamba
    M.set(m, 0, TABLE_Y + 0.004, 0, 0, 0, 0, LS);
    D(Wd.lampB, m, T.obj);
    M.set(m, LAMP_J[0], LAMP_J[1], LAMP_J[2], this.lampYaw, this.lampPit - Math.PI / 2, 0, LS);
    D(Wd.shade, m, T.obj);
    if (!shadow) D(Wd.bulb, m, T.obj, 1, 1.2);
    // kartlar (giriş ve final dışında)
    if (v.phase !== 'intro' && v.phase !== 'final') {
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        this.cardMat(mc, a, i, this.flipK(i));
        D(Wd.card, mc, T.obj);
      });
    }
    // casusun güneş gözlüğü (yakalandığında ya da açılışta)
    if ((v.phase === 'guess' && v.accused >= 0) || (v.phase === 'result' && this.time - (this.resT || 0) > 1.6)) {
      const a = this.avatarAt(v.phase === 'guess' ? v.accused : v.spy);
      if (a) D(Wd.shades, a.M.head, T.obj);
    }
    // final: şampiyonun önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, 0, TABLE_Y + 0.004, 0.62);
        const u = clamp((this.time - (this.finT || 0) - 0.8) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], this.time * 0.8, 0, 0, 0.9 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  // kart yüzleri (açılışta): dokulu dörtgen
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.faceL || !this.faceTex || !v || v.phase !== 'result') return;
    const fk = `${v.game}:${v.round}:${v.word}:${v.other}`;
    if (fk !== this.faceKey) { this.faceKey = fk; try { drawFaces(this.faceCv, v.word, v.other); updateTexture(X, this.faceTex, this.faceCv); } catch (e) { console.warn('[acs] kart yüzü', e); } }
    gl.uniform1f(X.tex.u.uSelf, 0.25);
    gl.bindTexture(gl.TEXTURE_2D, this.faceTex);
    const mc = this.mats.c;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id), k = this.flipK(i);
      if (!a || k <= 0.5) return;
      this.cardMat(mc, a, i, k);
      drawMesh(X, i === v.spy ? Wd.faceR : Wd.faceL, mc, ONE3);
    });
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const X = this.X, v = this.view, Wd = this.W;
    if (!v || !Wd || !Wd.cone) return;
    const t = this.time;
    // lambanın ışığı: koni + ampul hâlesi + masadaki ışık havuzu
    const siren = v.phase === 'guess';
    const sc = siren ? (Math.floor(t * 4) % 2 ? RED3 : BLUE3) : WARM3;
    M.set(m, LAMP_J[0], LAMP_J[1], LAMP_J[2], this.lampYaw, this.lampPit - Math.PI / 2, 0, LS);
    drawMesh(X, Wd.cone, m, sc, siren ? 1.4 : 1);
    const dir = [Math.sin(this.lampYaw) * Math.cos(this.lampPit), -Math.sin(this.lampPit), Math.cos(this.lampYaw) * Math.cos(this.lampPit)];
    const bulb = [LAMP_J[0] + dir[0] * 0.065 * LS, LAMP_J[1] + dir[1] * 0.065 * LS, LAMP_J[2] + dir[2] * 0.065 * LS];
    this.glow(m, bulb, 0.16, sc, 0.9);
    // ışık havuzu: lambanın baktığı yönde masaya düşen ışık
    const k = (LAMP_J[1] - TABLE_Y - 0.006) / Math.max(0.15, -dir[1]);
    const pd = Math.min(k, 1.6);
    const px = LAMP_J[0] + dir[0] * pd, pz = LAMP_J[2] + dir[2] * pd;
    if (this.onTableAt(px, pz, -0.05)) {
      M.set(m, px, TABLE_Y + 0.008, pz, this.lampYaw, 0, 0, 0.36 + pd * 0.12, 1, 0.48 + pd * 0.2);
      drawMesh(X, this.res.glow, m, sc, 0.42);
    }
    // konuşanın arkasında hafif spot
    const sp = v.phase === 'clue' ? this.avatarAt(v.turn) : (v.phase === 'guess' ? this.avatarAt(v.accused) : v.phase === 'result' && t - (this.resT || 0) > 1.2 ? this.avatarAt(v.spy) : null);
    if (sp) this.glow(m, [sp.headW[0], sp.headW[1] - 0.25, sp.headW[2]], 0.75, sc, 0.18);
    // açılış: oy okları masada (oy verenden hedefe, oy verenin renginde)
    if (v.phase === 'result' && v.votes) {
      const u = t - (this.resT || 0);
      const grow = clamp((u - 0.25) / 0.6, 0, 1) * (u < 7 ? 1 : clamp(1 - (u - 7) / 1.5, 0, 1));
      if (grow > 0) {
        const tc = this.aT || (this.aT = new Float32Array(3));
        v.votes.forEach((tg, i) => {
          if (tg < 0) return;
          const a = this.avatarAt(i), b = this.avatarAt(tg);
          if (!a || !b) return;
          const p0 = this.seatW(a, 0, TABLE_Y + 0.009, CARD_Z + 0.12), p1 = this.seatW(b, 0, TABLE_Y + 0.009, CARD_Z + 0.16);
          const dx = p1[0] - p0[0], dz = p1[2] - p0[2], L = Math.hypot(dx, dz) * grow;
          const col = hexRGB(pcol(this.seats[i].c));
          tc[0] = col[0]; tc[1] = col[1]; tc[2] = col[2];
          M.set(m, p0[0], p0[1], p0[2], Math.atan2(dx, dz), 0, 0, 0.09, 1, L);
          drawMesh(X, Wd.arrow, m, tc, 0.85);
        });
      }
    }
    // yakalanınca: siren ışıkları masanın çevresinde döner
    if (siren) {
      const R = this.R + 0.3;
      for (let k2 = 0; k2 < 2; k2++) {
        const ang = t * 3 + k2 * Math.PI;
        this.glow(m, [Math.cos(ang) * R, 1.9, Math.sin(ang) * R * this.kz], 1.1, k2 ? BLUE3 : RED3, 0.22);
      }
    }
  }

  /* ---------- arayüz ---------- */
  // alt çubuk: giriş kutusunun yazısı ve odağı yeniden çizimde korunur
  setBarKeep(key, html) {
    const old = this.el.bar.querySelector('.cs-in');
    const val = old ? old.value : '', foc = old && document.activeElement === old;
    if (!this.setBar(key, html)) return;
    const inp = this.el.bar.querySelector('.cs-in');
    if (inp && val) inp.value = val;
    if (inp && foc) { try { inp.focus({ preventScroll: true }); } catch { /* yok */ } }
  }
  timerBar(left, total) { return `<div class="cs-tm"><i style="transform:scaleX(${clamp(left / Math.max(1, total), 0, 1).toFixed(3)})"></i></div>`; }
  wordBox(v, first) {
    if (!v.myWord) return '';
    if (this.peekOn()) return `<div class="cs-word"><small>Kartındaki kelime</small><b>${esc(v.myWord)}</b>${first ? '<button class="cs-b" data-act="cs-seen" style="margin-top:8px">Gördüm, kapat ✓</button>' : ''}</div>`;
    return '';
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
    const peek = this.peekOn();
    const peekBtn = v.myWord && !peek ? '<button class="cs-b ghost" data-act="cs-peek">👁 Kartım</button>' : '';
    if (v.phase === 'card') {
      if (!v.inGame || v.me < 0) { key = 'card|watch'; html = '<div class="cs-box"><div class="h">👀 Bu tur izleyicisin</div><div class="s">Yeni turda sen de oyundasın.</div></div>'; }
      else {
        const seen = v.seen && v.seen[v.me];
        const cnt = (v.seen || []).filter(Boolean).length;
        key = `card|${v.game}|${v.round}|${seen}|${peek}|${cnt}`;
        if (peek) html = `<div class="cs-box">${this.wordBox(v, !seen)}${seen ? '<div class="s">Kartını gördün 🤫</div>' : '<div class="s">Ekranı yanındakilere gösterme 🤫</div>'}</div>`;
        else if (!seen) html = '<div class="cs-box"><div class="h">🃏 Kartın masada</div><button class="cs-card" data-act="cs-flip">Kartına bakmak için dokun<small>Kelimeni kimseye gösterme 🤫</small></button></div>';
        else html = `<div class="cs-box"><div class="h">✓ Kartını gördün</div><div class="s">Diğerleri bekleniyor (${cnt}/${v.seats.length})</div><div class="cs-row">${peekBtn}</div></div>`;
      }
    } else if (v.phase === 'clue') {
      const left = (v.endsAt || 0) - this.ctx.serverNow();
      const tb = this.timerBar(left, v.turnMs || 3e4);
      const lapTxt = (v.laps || 1) > 1 ? ` · ${v.lap}. el` : '';
      if (v.turn === v.me && v.me >= 0) {
        key = `clue|me|${v.game}|${v.round}|${v.lap}|${v.turnAt}|${peek}`;
        html = `<div class="cs-box"><div class="h">🎤 Sıra sende!${lapTxt}</div><div class="s">Kelimenle ilgili tek kelimelik bir ipucu ver: yaz ya da sesli söyle.</div>
          <div class="cs-row"><input class="cs-in" maxlength="24" enterkeyhint="send" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="İpucun…"><button class="cs-b" data-act="cs-send">Gönder</button></div>
          <div class="cs-row"><button class="cs-b alt" data-act="cs-spoken">🗣️ Sesli söyledim</button>${peekBtn}</div>${this.wordBox(v, false)}${tb}</div>`;
      } else {
        const ord = v.order || [];
        const k = ord.indexOf(v.turn);
        const nx = ord.slice(k + 1).concat(ord.slice(0, k)).find((i) => v.seats[i]?.on);
        const canVote = this.ctx.isHost && ((v.lap || 1) > 1 || (v.clues || []).every((c, i) => c.length > 0 || !v.seats[i]?.on));
        key = `clue|o|${v.game}|${v.round}|${v.lap}|${v.turn}|${peek}|${canVote}`;
        html = `<div class="cs-box dark"><div class="h">🎤 Sıra: ${nm(v.turn)}${lapTxt}</div><div class="s">${nx != null && nx !== v.turn ? `Sıradaki: ${nx === v.me ? '<b>sen</b>' : nm(nx)}` : 'Dinle, kimin kelimesi farklı?'}</div>
          <div class="cs-row">${peekBtn}${canVote ? '<button class="cs-b ghost" data-act="cs-tovote">Oylamaya geç ▶</button>' : ''}</div>${this.wordBox(v, false)}${tb}</div>`;
      }
    } else if (v.phase === 'vote') {
      const left = (v.endsAt || 0) - this.ctx.serverNow();
      const cnt = (v.voted || []).filter(Boolean).length, tot = v.seats.filter((p) => p.on).length;
      const can = v.inGame && v.me >= 0;
      const chips = v.seats.map((p, i) => {
        if (i === v.me) return '';
        const cl = (v.clues && v.clues[i] || []).map(clueTxt).join(' · ');
        return `<button data-act="cs-vote" data-t="${i}" style="--pc:${pcol(p.c)}" class="${v.myVote === i ? 'on' : ''}" ${can && p.on ? '' : 'disabled'}><i></i>${v.myVote === i ? '👉 ' : ''}${esc(nm0(p.n))}<span>${esc(cl) || '—'}</span></button>`;
      }).join('');
      key = `vote|${v.game}|${v.round}|${v.myVote}|${cnt}|${can}|${peek}|${v.seats.map((p) => p.on).join('')}`;
      html = `<div class="cs-box"><div class="h">🕵️ Casus kim?</div><div class="s">${can ? (v.myVote >= 0 ? `Oyun: <b>${nm(v.myVote)}</b> · fikrini değiştirebilirsin` : 'İpuçlarına bak, şüphelendiğine dokun') : 'Oylamayı izliyorsun'} · ${cnt}/${tot} oy</div>
        <div class="cs-vote">${chips}</div><div class="cs-row">${peekBtn}</div>${this.wordBox(v, false)}${this.timerBar(left, v.voteMs || 45e3)}</div>`;
    } else if (v.phase === 'guess') {
      const left = (v.endsAt || 0) - this.ctx.serverNow();
      const opts = (v.options || []).map((w) => `<button data-act="cs-guess" data-w="${esc(w)}" ${v.amSpy ? '' : 'disabled'}>${esc(w)}</button>`).join('');
      key = `guess|${v.game}|${v.round}|${v.amSpy}`;
      html = v.amSpy
        ? `<div class="cs-box dark"><div class="h">🚨 Yakalandın! Casus sendin 🕶️</div><div class="s">Masanın kelimesini bilirsen yine kazanırsın. Hangisiydi?</div><div class="cs-opts">${opts}</div>${this.timerBar(left, v.guessMs || 2e4)}</div>`
        : `<div class="cs-box dark"><div class="h">🚨 ${nm(v.accused)} yakalandı!</div><div class="s">Ama casus masanın kelimesini bilirse yine kazanır… Tahmin ediyor 👀</div><div class="cs-opts">${opts}</div>${this.timerBar(left, v.guessMs || 2e4)}</div>`;
    } else if (v.phase === 'result') {
      const u = this.ctx.serverNow() - (v.resAt || 0);
      if (u >= 1500) {
        const iSpy = v.spy === v.me;
        const won = v.me >= 0 && v.inGame && (iSpy ? v.spyWon : !v.spyWon);
        const lost = v.me >= 0 && v.inGame && !won;
        const early = u < (v.nextMs || 4000);
        const reason = (REASON[v.reason] || '').replace('{a}', v.accused >= 0 ? nm(v.accused) : 'O');
        const guessTxt = v.guess ? ` (tahmini: <b>${esc(v.guess)}</b>)` : '';
        const myPts = v.me >= 0 ? (v.pts || [])[v.me] || 0 : 0;
        key = `res|${v.game}|${v.round}|${early}|${v.me}`;
        html = `<div class="cs-box cs-res ${won ? 'win' : lost ? 'lose' : ''}"><div class="h">${v.spyWon ? '🕶️ Casus kazandı!' : '🎉 Masa kazandı!'}</div>
          <div class="s">${iSpy ? 'Casus <b>sendin</b>!' : `Casus: <b>${nm(v.spy)}</b>`} · ${reason}${v.reason === 'guessed' || v.reason === 'caught' ? guessTxt : ''}</div>
          <div class="ws"><div><small>Masanın kelimesi</small><b>${esc(v.word || '')}</b></div><div class="spy"><small>Casusun kelimesi</small><b>${esc(v.other || '')}</b></div></div>
          ${v.me >= 0 && v.inGame ? `<div class="cs-mini">Bu tur: <b>+${myPts}</b> puan</div>` : ''}
          <button class="kb" data-act="cs-next" ${early ? 'disabled' : ''}>${v.last ? 'Sonuçlar 🏆' : 'Sıradaki tur ▶'}</button></div>`;
      } else key = 'res|wait';
    }
    this.setBarKeep(key, html);
  }
  modeSeg(v) {
    return `<div class="cs-seg" role="group" aria-label="Tur sayısı"><button data-act="cs-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ 3 tur</button><button data-act="cs-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🕵️ 5 tur</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card cs-intro">
        <div class="tt">🕶️ Aramızdaki Casus</div>
        <div class="sub">Herkesin kelimesi aynı… biri hariç. O kişi casus ama bunu kendisi de bilmiyor!</div>
        <div class="cs-ru"><div class="a"><b>🃏</b>Kartına gizlice bak</div><div class="g"><b>🎤</b>Sırayla tek kelime ipucu ver</div><div class="y"><b>🕵️</b>Farklı olanı oyla</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="cs-start" ${n < 3 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 3 ? 'Casus için masada en az 3 kişi lazım.' : 'İpucunu yazabilir ya da sesli söyleyip "söyledim" diyebilirsin. Kelimeni söyleme!'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.ctx.serverNow() - (v.finAt || 0) >= 2400) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const rows = v.seats.map((p, i) => ({ p, i, b: (v.board || [])[i] || { sc: p.sc, spyWins: 0, caught: 0 } })).sort((x, y) => y.b.sc - x.b.sc)
        .map(({ p, i, b }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><em>${b.spyWins ? `🕶️×${b.spyWins} ` : ''}${b.caught ? `🔎×${b.caught}` : ''}</em><b>${b.sc} puan</b></div>`).join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏆 Kazandın!' : champ.length ? `🏆 ${champ.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">🕶️ casusken kaçtığı tur · 🔎 casusu doğru oyladığı tur</div>
        <div class="cs-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="cs-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    let top = '';
    const left = mmss((v.endsAt || 0) - this.ctx.serverNow());
    if (v.phase === 'card') top = `${v.round}/${v.rounds}. tur · 🃏 kartlar · ⏱ ${left}`;
    else if (v.phase === 'clue') top = `${v.round}/${v.rounds}. tur · 🎤 ipuçları · ⏱ ${left}`;
    else if (v.phase === 'vote') top = `${v.round}/${v.rounds}. tur · 🕵️ oylama · ⏱ ${left}`;
    else if (v.phase === 'guess') top = `🚨 casus tahmin ediyor · ⏱ ${left}`;
    else if (v.phase === 'result') top = `${v.round}/${v.rounds}. tur bitti`;
    this.top(top);
    // süre çubuğu (alt çubuk yeniden çizilmeden akar)
    const tm = this.el.bar.querySelector('.cs-tm i');
    const tot = v.phase === 'clue' ? v.turnMs : v.phase === 'vote' ? v.voteMs : v.phase === 'guess' ? v.guessMs : 0;
    if (tm && tot) tm.style.transform = `scaleX(${clamp(((v.endsAt || 0) - this.ctx.serverNow()) / tot, 0, 1).toFixed(3)})`;
    // etiketler: durum (kartına baktı / konuşuyor / oy verdi / aldığı oy) ve ipuçları
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '', cl = '';
      if (v.phase === 'card') x = v.seen && v.seen[i] ? '<span>✓</span>' : '<span>🃏</span>';
      if (v.phase === 'clue') x = i === v.turn ? '<span>🎤</span>' : '';
      if (v.phase === 'vote') x = v.voted && v.voted[i] ? '<span>🗳️</span>' : '<span>🤔</span>';
      if (v.phase === 'result') {
        const n = (v.tally || [])[i] || 0, pt = (v.pts || [])[i] || 0;
        x = `${n ? `<span>${n}🗳️</span>` : ''}${pt ? `<span class="cs-pt">+${pt}</span>` : ''}`;
      }
      // casus rozeti: yakalanınca ve açılışta (kartı çevrildikten sonra)
      const spyTag = (v.phase === 'guess' && i === v.accused) || (v.phase === 'result' && i === v.spy && this.time - (this.resT || 0) > 1.6);
      if (spyTag) x += `<b class="cs-sp">🕶️ CASUS${v.phase === 'result' && v.other ? ` · ${esc(v.other)}` : ''}</b>`;
      if ((v.phase === 'clue' || v.phase === 'vote' || v.phase === 'guess') && v.clues) cl = esc((v.clues[i] || []).map(clueTxt).join(' · '));
      const k = x + '|' + cl;
      if (o.csK !== k) {
        o.csK = k;
        let ex = o.lbl.querySelector('.cs-x'), ec = o.lbl.querySelector('.cs-cl');
        if (!ex) { ex = document.createElement('span'); ex.className = 'cs-x'; o.lbl.appendChild(ex); }
        if (!ec) { ec = document.createElement('span'); ec.className = 'cs-cl'; o.lbl.appendChild(ec); }
        ex.innerHTML = x;
        ec.innerHTML = cl;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('cs-turn', v.phase === 'clue' && i === v.turn);
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.cs-x')) o.csK = '';
  }
  // ipucu balonları ve casus etiketi
  placeLbls() {
    super.placeLbls();
    const v = this.view;
    if (!v) return;
    const now = this.time;
    for (const [i, b] of this.bubs) {
      const a = this.avatarAt(i);
      const age = now - b.at;
      if (!a || age > 4.5 || this.flat) { if (b.el) b.el.style.display = 'none'; if (age > 4.5) { b.el && b.el.remove(); this.bubs.delete(i); } continue; }
      if (!b.el) {
        b.el = document.createElement('div');
        b.el.className = 'cs-bub' + (b.t === null ? ' sp' : b.t === '' ? ' ps' : '');
        b.el.textContent = b.t === null ? '🗣️ sesli söyledi' : b.t === '' ? '⏳ pas' : b.t;
        this.el.lbls.appendChild(b.el);
      }
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (!q) { b.el.style.display = 'none'; continue; }
      const s = clamp(age / 0.18, 0, 1), sc = 0.6 + 0.4 * s + Math.sin(Math.min(1, age / 0.3) * Math.PI) * 0.08;
      b.el.style.display = 'block';
      b.el.style.opacity = String(clamp((4.5 - age) / 0.5, 0, 1));
      // ekran kenarındaki karakterin balonu taşmasın: balon içeri kayar, kuyruğu karaktere bakmaya devam eder
      const bw = b.el.offsetWidth, bh = b.el.offsetHeight, half = bw / 2;
      const W = this.vw || this.el.wrap.clientWidth || 390, H = this.vh || this.el.wrap.clientHeight || 844;
      const x = clamp(q[0], half + 6, Math.max(half + 6, W - half - 6)), y = clamp(q[1] - 10, bh + 8, Math.max(bh + 8, H - 8));
      b.el.style.setProperty('--tx', `${Math.round(clamp(q[0] - x, -half + 14, half - 14))}px`);
      b.el.style.transform = `translate(${Math.round(x - half)}px,${Math.round(y - bh)}px) scale(${sc.toFixed(3)})`;
    }
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const cx = w / 2, cy = h * 0.46;
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // lamba ve konuşanı gösteren ışık
    const sp = v.phase === 'clue' ? v.turn : v.phase === 'guess' ? v.accused : v.phase === 'result' ? v.spy : -1;
    if (sp >= 0) {
      const [x, y] = this.flatPos(sp);
      const gr = g.createLinearGradient(cx, cy, x, y);
      gr.addColorStop(0, 'rgba(255,220,140,.75)'); gr.addColorStop(1, 'rgba(255,220,140,.05)');
      g.strokeStyle = gr; g.lineWidth = 26; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
    }
    g.fillStyle = '#1f5a3f'; g.beginPath(); g.arc(cx, cy, 14, 0, TAU); g.fill();
    g.fillStyle = '#fff3c9'; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill();
    // oylar (açılış): oklar
    if (v.phase === 'result' && v.votes) {
      v.votes.forEach((t, i) => {
        if (t < 0) return;
        const [x0, y0] = this.flatPos(i), [x1, y1] = this.flatPos(t);
        g.strokeStyle = pcol(v.seats[i]?.c ?? 0); g.lineWidth = 3;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, 0.82), lerp(y0, y1, 0.82)); g.stroke();
      });
    }
    // ipuçları: her koltuğun altında
    if (v.clues) {
      g.font = '700 11px system-ui'; g.fillStyle = '#fff';
      v.clues.forEach((c, i) => { const [x, y] = this.flatPos(i); const tx = c.map(clueTxt).join(' · '); if (tx) g.fillText(tx.slice(0, 26), x, y + 48); });
    }
    if (v.phase === 'result' && v.spy >= 0) { const [x, y] = this.flatPos(v.spy); g.font = '900 20px system-ui'; g.fillText('🕶️', x, y - 30); }
    g.restore();
  }
  onDispose() { this.bubs.forEach((b) => b.el && b.el.remove()); this.bubs.clear(); }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new SpyGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[acs]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
