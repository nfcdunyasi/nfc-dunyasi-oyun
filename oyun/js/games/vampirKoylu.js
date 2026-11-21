// Vampir Köylü — 3D köy meyhanesi (NFC Dünyası Oyun)
// Gece çökünce ışıklar söner, ay ışığı ve mumlar kalır; köylüler başını masaya koyup uyur. Uyanık olanları yalnız kendisi
// (ve vampir takımı birbirini, kırmızı gözlerle) görür. Şafakta kurban hayalete döner ve masanın üstünde süzülür.
// Gündüz herkes şüphelendiğini parmağıyla gösterir (oklar masaya düşer), kısa sözler balon olur. Oylamada kovulan da
// hayalete döner ve rolü açılır. Sonda vampirlerin yakası kalkar, gözleri parlar. Masa kiti (masa3d.js) ve Kurye Yarışı
// motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-g';
import * as sfx from '../sfx.js?v=2026-11-21-g';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, HC, HR } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, psurf } = E;

const ROLE = {
  vampir: { name: 'Vampir', you: 'Sen bir vampirsin', emoji: '🧛', team: 'vampir', text: 'Her gece takımınla bir köylüyü avla. Gündüz masum görün, şüpheyi başkasına çek.', bg: '#3a1020', fg: '#fff' },
  doktor: { name: 'Doktor', you: 'Sen doktorsun', emoji: '🩺', team: 'koy', text: 'Her gece birini koru; vampir onu seçerse kurtulur. Kendini de koruyabilirsin.', bg: '#d6f5e0', fg: '#1c1633' },
  gozcu: { name: 'Gözcü', you: 'Sen gözcüsün', emoji: '🔮', team: 'koy', text: 'Her gece birine bak: vampir mi değil mi öğren. Bilgini akıllıca kullan.', bg: '#e3dcff', fg: '#1c1633' },
  koylu: { name: 'Köylü', you: 'Sen köylüsün', emoji: '🧑‍🌾', team: 'koy', text: 'Özel gücün yok ama oyun senin: gündüz vampirleri bul, doğru kişiyi kov.', bg: '#fff4c2', fg: '#1c1633' }
};
const CLAIM_TXT = { koylu: '🙋 Ben köylüyüm!', doktor: '🩺 Ben doktorum!', gozcu: '🔮 Ben gözcüyüm!' };
const CANDLES = [[0, 0.075], [-0.065, -0.038], [0.065, -0.038]];   // şamdandaki mumlar (x, z)
const CAND_Y = 0.2;                                                 // mumların tabanı (şamdan üstü)
// ışık ayarları: gündüz (sıcak) ve gece (ay ışığı) arasında yumuşak geçiş
const DAY_L = { sunC: [0.86, 0.8, 0.72], sky: [0.66, 0.6, 0.55], gnd: [0.33, 0.27, 0.22], night: 1, warm: [1, 0.84, 0.6], lampC: [1.5, 1.24, 0.92], fogR: [30, 90], stars: 0, glowS: 0.3 };
const NIGHT_L = { sunC: [0.3, 0.36, 0.62], sky: [0.21, 0.25, 0.42], gnd: [0.08, 0.08, 0.14], night: 1, warm: [0.75, 0.75, 1], lampC: [1.1, 0.75, 0.42], fogR: [30, 90], stars: 0, glowS: 0.3 };
const FOG_DAY = [1, 0.89, 0.94], FOG_NIGHT = [0.07, 0.09, 0.26];
const RED3 = [1, 0.12, 0.1], MOON3 = [0.55, 0.65, 1], FLAME3 = [1, 0.66, 0.3];

const STYLE = `
#ky.vkl .msg{top:13%}
#ky.vkl .vk-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 12px 11px;text-align:center}
#ky.vkl .vk-box.dark{background:#1b1730;color:#fff}
#ky.vkl .vk-box .h{font-size:clamp(16px,4.4vw,20px);font-weight:900;line-height:1.18}
#ky.vkl .vk-box .s{font-size:12.5px;font-weight:700;opacity:.75;line-height:1.3;margin-top:3px}
#ky.vkl .vk-row{display:flex;gap:7px;align-items:stretch;justify-content:center;margin-top:8px;flex-wrap:wrap}
#ky.vkl .vk-b{border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);padding:8px 13px;font-weight:900;font-size:14.5px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.vkl .vk-b.alt{background:#fff}
#ky.vkl .vk-b.on{background:#3ccf6e;color:#fff}
#ky.vkl .vk-b.sm{font-size:12.5px;padding:6px 9px}
#ky.vkl .vk-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:13px;padding:6px 10px}
#ky.vkl .vk-b:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.vkl .vk-b[disabled]{opacity:.5}
#ky.vkl .vk-card{display:block;width:100%;margin-top:8px;border:4px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);background:repeating-linear-gradient(45deg,#2b2350 0 10px,#342b5e 10px 20px);color:#fff;padding:16px 10px;font-weight:900;font-size:18px;-webkit-tap-highlight-color:transparent}
#ky.vkl .vk-card small{display:block;font-size:12px;font-weight:700;opacity:.85;margin-top:4px}
#ky.vkl .vk-role{margin-top:8px;border:4px solid var(--ink);border-radius:18px;padding:10px 12px 12px;background:var(--rb);color:var(--rf);animation:kyin .3s cubic-bezier(.2,1.5,.4,1)}
#ky.vkl .vk-role .e{font-size:42px;line-height:1}
#ky.vkl .vk-role b{display:block;font-size:24px;font-weight:900;margin-top:2px}
#ky.vkl .vk-role p{font-size:13px;font-weight:700;opacity:.85;margin:4px 0 0;line-height:1.3}
#ky.vkl .vk-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(132px,42vw),1fr));gap:7px;margin-top:8px;max-height:min(30vh,240px);overflow:auto;overscroll-behavior:contain}
#ky.vkl .vk-chips button{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);background:#fff;color:var(--ink);padding:6px 8px 7px 28px;text-align:left;font-weight:900;font-size:14px;line-height:1.15;min-width:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.vkl .vk-chips button i{position:absolute;left:7px;top:8px;width:14px;height:14px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.vkl .vk-chips button span{display:block;max-width:100%;font-size:11px;font-weight:700;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.vkl .vk-chips button.on{background:#ff5a36;color:#fff}
#ky.vkl .vk-chips button.sv{background:#3ccf6e;color:#fff}
#ky.vkl .vk-chips button.ck{background:#8b6bff;color:#fff}
#ky.vkl .vk-chips button[disabled]:not(.on):not(.sv):not(.ck){opacity:.5}
#ky.vkl .vk-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:8px}
#ky.vkl .vk-tm i{display:block;height:100%;background:#ff5a36;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.vkl .vk-seer{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:7px}
#ky.vkl .vk-seer span{font-size:12px;font-weight:800;border-radius:99px;padding:2px 9px;background:rgba(139,107,255,.18)}
#ky.vkl .vk-seer span.v{background:#d7263d;color:#fff}
#ky.vkl .vk-res{background:#fbf7ef}
#ky.vkl .vk-res.vamp{background:#3a1020;color:#fff}
#ky.vkl .vk-res.ok{background:#d6f5e0}
#ky.vkl .vk-bub{position:absolute;left:0;top:0;z-index:5;pointer-events:none;max-width:min(52vw,240px);font-weight:900;font-size:14.5px;line-height:1.15;background:#fff;color:#1c1633;border:3px solid #1c1633;border-radius:16px;padding:5px 10px;display:none;will-change:transform;box-shadow:2px 2px 0 #1c1633;text-align:center;white-space:normal;overflow-wrap:anywhere}
#ky.vkl .vk-bub::after{content:"";position:absolute;left:calc(50% + var(--tx,0px));bottom:-10px;margin-left:-7px;border:7px solid transparent;border-top-color:#1c1633}
#ky.vkl .vk-bub.seer{background:#e3dcff}
#ky.vkl .vk-bub.sus{background:#ffe1d6}
#ky.vkl .lbl .vk-x{display:inline-flex;align-items:center;gap:3px}
#ky.vkl .lbl .vk-x:empty{display:none}
#ky.vkl .lbl .vk-r{display:inline-block;font-weight:900;font-size:11.5px;border-radius:99px;padding:0 6px;background:#fff;color:#1c1633;margin-left:2px}
#ky.vkl .lbl .vk-r.v{background:#d7263d;color:#fff}
#ky.vkl .lbl.vk-dead{opacity:.62;filter:grayscale(.5)}
#ky.vkl .card .vk-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.vkl .card .vk-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.vkl .card .vk-seg button.on{background:var(--ink);color:#fff}
#ky.vkl .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.vkl .card .vk-ru{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:5px;margin-top:10px}
#ky.vkl .card .vk-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 2px 5px;text-align:center;font-weight:800;font-size:11px;line-height:1.12}
#ky.vkl .card .vk-ru div b{display:block;font-size:21px;line-height:1.15}
#ky.vkl .card .vk-tb{display:grid;gap:5px;margin-top:10px;max-height:min(32vh,260px);overflow:auto;text-align:left}
#ky.vkl .card .vk-tb div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:4px 10px;background:#fff;font-weight:800;font-size:14px}
#ky.vkl .card .vk-tb div.w{background:#d6f5e0}
#ky.vkl .card .vk-tb div.me{box-shadow:0 0 0 3px #ffd23f}
#ky.vkl .card .vk-tb div i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.vkl .card .vk-tb div span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.vkl .card .vk-tb div em{font-style:normal;font-size:12px;font-weight:800;white-space:nowrap}
#ky.vkl .card .vk-tb div b{font-weight:900;white-space:nowrap;font-size:12px;opacity:.7}
#ky.vkl .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.vkl .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.vkl .vk-box{width:min(460px,52vw);padding:6px 10px 8px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.vkl .vk-box .h{font-size:16px}
#ky.vkl .vk-box .s{font-size:11.5px;line-height:1.25}
#ky.vkl .vk-row{margin-top:5px;gap:5px}
#ky.vkl .vk-b{padding:5px 10px;font-size:13px}
#ky.vkl .vk-chips{max-height:40vh;gap:5px;margin-top:5px}
#ky.vkl .vk-chips button{padding:4px 7px 5px 26px;font-size:13px}
#ky.vkl .vk-chips button i{top:6px}
#ky.vkl .vk-chips button span{font-size:11px}
#ky.vkl .vk-card{padding:10px}
#ky.vkl .vk-role .e{font-size:30px}#ky.vkl .vk-role b{font-size:19px}
#ky.vkl .card .vk-tb{max-height:24vh;margin-top:6px}
#ky.vkl .card .vk-ru{margin-top:6px}#ky.vkl .card .vk-ru div{font-size:11px;padding:2px 2px 3px}#ky.vkl .card .vk-ru div b{font-size:16px}
#ky.vkl .card .vk-seg{margin-top:6px}#ky.vkl .card .vk-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.vkl .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// Giriş/final: köy meyhanesi havası (akordeon + mandolin, Re dorian). Gündüz: neşeli ama hafif. Gece: alçak yaylı
// pedal, klavsen benzeri ürpertici arpej, arada baykuş. Oylama: davul ve gerilim.
class VkSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 108 : this.mode === 'calm' ? 64 : this.mode === 'vote' ? 88 : 120; }
  swing() { return this.mode === 'idle' ? 0.14 : this.mode === 'race' ? 0.08 : 0; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'calm') {
      // gece: Re minör pedal, ürpertici arpej, seyrek baykuş
      const P = [[38, [62, 65, 69, 74]], [36, [60, 63, 67, 72]], [34, [58, 62, 65, 70]], [33, [57, 61, 64, 69]]];
      const [root, ch] = P[bar % 4];
      if (s === 0) this.iStr(t, [root, root + 7, root + 12], spb * 4, 0.012, 0.6, 700, 0.35);
      if (s % 2 === 0) this.iPluck(t, ch[(s >> 1) % 4] + (s >= 8 ? 12 : 0), 0.018, 0.35, 'triangle', 2200, 0.35);
      if (s === 8 && bar % 4 === 3) { this.tone(415, t, 0.32, 'sine', 0.035, 392, 0.04); this.tone(392, t + 0.42, 0.5, 'sine', 0.03, 370, 0.05); }
      return;
    }
    if (this.mode === 'vote') {
      // oylama: davul ve alçak telli
      if (s === 0 || s === 6 || s === 10) this.iTaiko(t, s ? 0.18 : 0.26, 70);
      if (s % 4 === 2) this.iTick(t, 0.025);
      if (s === 0) this.iStr(t, [38, 45, 50], spb * 4, 0.012, 0.3, 900, 0.3);
      if (s === 12 && bar % 2 === 1) this.iPizz(t, 57, 0.04);
      return;
    }
    // köy havası: Re dorian (Dm – C – Dm – Am / G – C – Dm – Dm)
    const PROG = [[38, [62, 65, 69]], [36, [60, 64, 67]], [38, [62, 65, 69]], [33, [57, 60, 64]], [43, [62, 67, 71]], [36, [60, 64, 67]], [38, [62, 65, 69]], [38, [62, 65, 69]]];
    const [root, ch] = PROG[bar % 8];
    const soft = this.mode === 'race';
    if (s === 0 || s === 8) this.iBass(t, root, spb * 0.9, soft ? 0.06 : 0.08, 'tuba');
    if (s === 4 || s === 12) this.iBass(t, root + 7, spb * 0.8, soft ? 0.05 : 0.065, 'tuba');
    if (s === 4 || s === 12) ch.forEach((m, k) => this.iAcc(t + k * 0.004, m, spb * 0.45, (soft ? 0.012 : 0.017) * (k ? 0.8 : 1), 0.15));
    if (s % 4 === 2) this.iTamb(t, soft ? 0.025 : 0.04);
    const MEL = [74, 72, 74, 76, 77, 76, 74, 72, 69, 72, 74, 74, 76, 74, 72, 69];
    if (!soft && s % 2 === 0) { const m = MEL[(bar * 8 + (s >> 1)) % 16]; if (s % 4 === 0 || bar % 2 === 0) this.iMand(t, m, st * 1.6, 0.022, 0.15); }
    if (soft && s % 4 === 0 && bar % 2 === 0) this.iMand(t, ch[(s >> 2) % 3] + 12, st * 1.5, 0.016, 0.15);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'dusk': // gece çöküyor: baykuş + rüzgar
        this.duck(0.3, 2);
        this.noise(t, 1.6, 0.05, { type: 'bandpass', freq: 500, to: 280, q: 0.6, attack: 0.5 });
        this.tone(415, t + 0.3, 0.3, 'sine', 0.07, 392, 0.04); this.tone(392, t + 0.75, 0.55, 'sine', 0.06, 370, 0.05);
        break;
      case 'role': this.noise(t, 0.12, 0.09, { type: 'bandpass', freq: 2200, to: 900, q: 1.1, attack: 0.01 }); this.tone(523, t + 0.12, 0.2, 'triangle', 0.05, 659, 0.01); break;
      case 'bat': // vampir seçimi: kanat çırpışı
        for (let i = 0; i < 6; i++) this.noise(t + i * 0.055, 0.04, 0.08, { type: 'bandpass', freq: 1500, q: 2 });
        this.tone(1800, t, 0.12, 'sine', 0.02, 2600, 0.005);
        break;
      case 'save': [784, 988, 1175].forEach((f, i) => this.tone(f, t + i * 0.07, 0.3, 'sine', 0.05, null, 0.004)); break;
      case 'check': [1319, 1568, 1976, 2637].forEach((f, i) => this.tone(f, t + i * 0.06, 0.4, 'sine', 0.035, null, 0.003)); break;
      case 'sleep': this.tone(392, t, 0.45, 'sine', 0.05, 262, 0.05); break;
      case 'dawn': // horoz + çan
        this.duck(0.3, 2);
        [[523, 0, 0.12], [784, 0.12, 0.12], [698, 0.25, 0.1], [1047, 0.36, 0.5]].forEach(([f, d, L]) => this.tone(f, t + d, L, 'sawtooth', 0.025, f * (d > 0.3 ? 0.85 : 1), 0.01));
        this.iBell(t + 0.9, 79, 0.04, 1.8, 0.4);
        break;
      case 'ghost': // hayalet: titreşen "uuuu"
        this.duck(0.35, 1.8);
        { const o = this.k.ctx.createOscillator(), g = this.k.ctx.createGain(), lf = this.k.ctx.createOscillator(), lg = this.k.ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(330, t + 1.4);
          lf.frequency.value = 6; lg.gain.value = 18; lf.connect(lg).connect(o.frequency);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
          o.connect(g).connect(this.out(0)); o.start(t); lf.start(t); o.stop(t + 1.6); lf.stop(t + 1.6); }
        this.iGong(t + 0.05, 0.1, 82);
        break;
      case 'saved': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.05, 0.4, 'triangle', 0.045, null, 0.003)); break;
      case 'point': this.tone(900, t, 0.05, 'sine', 0.04, 1200, 0.002); break;
      case 'say': this.tone(1100, t, 0.05, 'sine', 0.06, 1500, 0.002); this.noise(t, 0.04, 0.04, { type: 'bandpass', freq: 3200, q: 2 }); break;
      case 'vote': this.tone(140, t, 0.12, 'sine', 0.26, 70, 0.002); this.noise(t, 0.06, 0.16, { type: 'lowpass', freq: 900 }); break;
      case 'tick': this.tone(1760, t, 0.03, 'square', 0.035, null, 0.001); break;
      case 'lynch': // tokmak + trampet
        this.duck(0.3, 2.4);
        for (let i = 0; i < 16; i++) this.noise(t + i * 0.05, 0.04, 0.03 + i * 0.004, { type: 'bandpass', freq: 2400, q: 0.9 });
        this.tone(160, t + 0.9, 0.18, 'sine', 0.3, 80, 0.002); this.noise(t + 0.9, 0.08, 0.2, { type: 'lowpass', freq: 1200 });
        break;
      case 'vampwin': // org akoru + sinsi kahkaha
        this.duck(0.2, 3);
        this.iStr(t, [50, 53, 57, 62], 2.4, 0.04, 0.05, 1800, 0.3);
        [[523, 0.6], [494, 0.75], [466, 0.9], [440, 1.05], [415, 1.2]].forEach(([f, d]) => this.tone(f, t + d, 0.12, 'triangle', 0.05, null, 0.004));
        break;
      case 'koywin':
        this.duck(0.15, 3);
        [[523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [659, 0.45, 0.5], [784, 0.62, 0.9]].forEach(([f, d, L]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), L, 0.06, 0.15); this.tone(f, t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// pirinç şamdan: ayak + gövde + üç kol (mumlar ayrı)
function candelabraModel(mb) {
  const Br = C('#c9a34a', -0.75), Bd = C('#8a6a2a', -0.6);
  mb.lathe(0, 0, 0, [[0, 0], [0.085, 0], [0.088, 0.006], [0.06, 0.016], [0.022, 0.03], [0.018, 0.1], [0.026, 0.12], [0.014, 0.14], [0.016, 0.17], [0, 0.17]], 24, Br);
  CANDLES.forEach(([x, z]) => {
    limb(mb, [0, 0.16, 0], [x * 0.98, CAND_Y - 0.012, z * 0.98], [0.007, 0.006], Bd, 8);
    mb.lathe(x, CAND_Y - 0.02, z, [[0, 0], [0.022, 0], [0.026, 0.012], [0.02, 0.02], [0, 0.02]], 16, Br);
  });
}
// mum (gövde, 0..0.11) ve alev
function candleBody(mb) {
  mb.lathe(0, 0, 0, [[0, 0], [0.014, 0], [0.014, 0.1], [0.012, 0.104], [0.002, 0.102], [0, 0.102]], 14, C('#f3ead6', -0.25));
  limb(mb, [0, 0.1, 0], [0, 0.112, 0], [0.0015, 0.0015], C('#2b2118'), 4);
}
function flameModel(mb) {
  mb.sphereS(0, 0.128, 0, 0.007, 0.017, 0.007, C('#ff9f2e', 1), 10, 8);
  mb.sphereS(0, 0.124, 0, 0.004, 0.009, 0.004, C('#fff3b8', 1), 8, 6);
}
// hayalet ('un'): çarşaf gövde (tepeden aşağı saydamlaşır), dalgalı etek, gözler ve ağız; yüzü +z'ye bakar
function ghostModel(mb) {
  const NU = 14, NV = 28, H = 0.46, push = (p, c) => mb.d.push(p[0], p[1], p[2], c[0], c[1], c[2], c[3]);
  const L = [0.35, 0.7, 0.62];
  const prof = (u) => {
    // u: 0 (tepe) → 1 (etek); yarıçap ve yükseklik
    if (u < 0.35) { const a = (u / 0.35) * Math.PI / 2; return [Math.sin(a) * 0.15, H - (1 - Math.cos(a)) * 0.15]; }
    return [0.15 + (u - 0.35) * 0.09, H - 0.15 - (u - 0.35) / 0.65 * (H - 0.15)];
  };
  const P = (u, v) => {
    const [r, y] = prof(u), a = v * TAU;
    const hem = u > 0.85 ? Math.sin(a * 5) * 0.025 * ((u - 0.85) / 0.15) : 0;
    return [Math.sin(a) * r, y + hem, Math.cos(a) * r];
  };
  const shade = (u, v) => {
    const a = v * TAU, nr = [Math.sin(a), 0.4 * (1 - u), Math.cos(a)];
    const l = Math.max(0, (nr[0] * L[0] + nr[1] * L[1] + nr[2] * L[2]) / Math.hypot(...nr));
    const k = 0.72 + 0.28 * l;
    return [0.92 * k, 0.95 * k, 1 * k, 0.92 - 0.62 * u * u];
  };
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const u0 = i / NU, u1 = (i + 1) / NU, v0 = j / NV, v1 = (j + 1) / NV;
      const A = P(u0, v0), B = P(u0, v1), Cc = P(u1, v1), D = P(u1, v0);
      push(A, shade(u0, v0)); push(B, shade(u0, v1)); push(Cc, shade(u1, v1));
      push(A, shade(u0, v0)); push(Cc, shade(u1, v1)); push(D, shade(u1, v0));
    }
  }
  // gözler ve ağız (yüzeyin hemen önünde koyu oval)
  const oval = (cx, cy, rx, ry, z) => {
    const N = 16, c = [0.08, 0.06, 0.14, 0.95];
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * TAU, a1 = ((k + 1) / N) * TAU;
      push([cx, cy, z], c); push([cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, z], c); push([cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, z], c);
    }
  };
  oval(-0.05, H - 0.12, 0.022, 0.032, 0.148);
  oval(0.05, H - 0.12, 0.022, 0.032, 0.148);
  oval(0, H - 0.2, 0.024, 0.018, 0.152);
}
// vampir yakası (gövde matrisinde): başın arkasında yükselen siyah, içi kırmızı yaka
function collarModel(mb) {
  const Bk = C('#121016', -0.6), Rd = C('#b0122f', -0.55);
  const P = (r0, r1) => (u, v) => { const a = (v - 0.5) * 4.4, r = lerp(r0, r1, u); return [Math.sin(a) * r, 0.93 + u * 0.36, -Math.cos(a) * r * 0.85 + 0.02]; };
  psurf(mb, 6, 22, P(0.2, 0.36), () => Bk, { cen: [0, 1.05, 0.2] });
  psurf(mb, 6, 22, P(0.192, 0.35), () => Rd, { cen: [0, 1.05, -0.4] });
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const lerp3 = (o, a, b, k) => { o[0] = lerp(a[0], b[0], k); o[1] = lerp(a[1], b[1], k); o[2] = lerp(a[2], b[2], k); return o; };

/* ============================ oyun ============================ */
class VampGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'vkl', cls: 'vkl', title: 'Vampir Köylü', sub: 'Gece vampirler, gündüz köy!', emoji: '🧛', css: STYLE, snd: new VkSnd(), amb: 'diner', ambVol: 0.35, botPx: 240, botPxL: 34, cloth: '#5a1e2a', trim: '#c9a34a', tea: false, lampHex: '#2b2b33', chairPad: '#3a1d4a' });
    this.nightK = 0;            // 0 gündüz … 1 gece (ışık geçişi)
    this.lampK = 1;
    this.ghostT = new Map();    // koltuk → hayaletin belirdiği an
    this.bubs = new Map();      // koltuk → { k, txt, at, el }
    this.saidSeq = 0;
    this.peek = { key: '', on: false, until: 0 };
    this.Lmix = { sunC: [0, 0, 0], sky: [0, 0, 0], gnd: [0, 0, 0], night: 1, warm: [0, 0, 0], lampC: [0, 0, 0], fogR: [30, 90], stars: 0, glowS: 0.3 };
    this.fogC = new Float32Array(FOG_DAY);
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.cdl = this.mk(candelabraModel);
    W.cbody = this.mk(candleBody);
    W.cflame = this.mk(flameModel);
    W.ghost = this.mk(ghostModel, 'un');
    W.collar = this.mk(collarModel);
  }
  light() { return this.Lmix; }
  rkey() { const v = this.view; return v ? `${v.game}` : ''; }
  // hayalet mi (öldü ve açılış anı geçti)
  isGhost(i) { const v = this.view; if (!v || !v.seats[i] || v.seats[i].alive) return false; return this.time >= (this.ghostT.get(i) ?? -1e9); }
  // gece kimler uyanık görünür (yalnız bu ekranda): ben (gece rolüm varsa) ve vampirsem vampir takımım
  awake(i) {
    const v = this.view;
    if (!v || v.phase !== 'night' || !v.seats[i]?.alive) return true;
    if (i === v.me) return v.myRole && v.myRole !== 'koylu' && v.myAlive;
    return v.myRole === 'vampir' && v.myAlive && (v.vampTeam || []).includes(i);
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      const pop = () => { try { this.snd.fx('pop'); } catch { /* yok */ } };
      const fx = (n) => { try { this.snd.fx(n); } catch { /* yok */ } };
      if (act === 'vk-mode') { const m = b.dataset.m; if (v && v.mode !== m) { pop(); this.ctx.send('mode', { m }); } }
      else if (act === 'vk-start') { pop(); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'vk-flip') { this.peek = { key: this.rkey(), on: true, until: 0 }; fx('role'); vibrate(20); this.bar(); }
      else if (act === 'vk-seen') { this.peek.on = false; fx('sleep'); this.ctx.send('seen', {}); this.bar(); }
      else if (act === 'vk-peek') { this.peek = { key: this.rkey(), on: true, until: performance.now() + 3200 }; fx('role'); this.bar(); }
      else if (act === 'vk-night') {
        const t = +b.dataset.t, r = v?.myRole;
        if (r === 'vampir') { fx('bat'); this.ctx.send('vamp', { t }); }
        else if (r === 'doktor') { fx('save'); this.ctx.send('save', { t }); }
        else if (r === 'gozcu') { fx('check'); this.ctx.send('check', { t }); }
        vibrate(15);
      }
      else if (act === 'vk-sleep') { fx('sleep'); this.ctx.send('sleep', {}); }
      else if (act === 'vk-sus') { const t = +b.dataset.t; fx('point'); this.ctx.send('sus', { t: v && v.sus && v.sus[v.me] === t ? -1 : t }); }
      else if (act === 'vk-say') { fx('say'); this.ctx.send('say', b.dataset.k === 'seer' ? { k: 'seer', t: +b.dataset.t, r: b.dataset.r } : { k: b.dataset.k }); }
      else if (act === 'vk-ready') { pop(); this.ctx.send('ready', {}); }
      else if (act === 'vk-tovote') { pop(); this.ctx.send('toVote', {}); }
      else if (act === 'vk-vote') { fx('vote'); vibrate(15); this.ctx.send('vote', { t: b.dataset.t === 'skip' ? 'skip' : +b.dataset.t }); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }
  peekOn() {
    const p = this.peek;
    if (!p.on || p.key !== this.rkey()) return false;
    if (p.until && performance.now() > p.until) { p.on = false; return false; }
    return true;
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.vkl !== '1') { root.dataset.vkl = '1'; root.innerHTML = '<p class="py-16 text-center">🧛</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.day}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // ölümler: hayalet açılış anında belirir (şafakta biraz sonra, kovulmada oklardan sonra)
    const same = prev && prev.game === v.game && prev.seats && prev.seats.length === v.seats.length;
    v.seats.forEach((p, i) => {
      if (p.alive) { this.ghostT.delete(i); return; }
      if (this.ghostT.has(i)) return;
      const wasAlive = same && prev.seats[i] && prev.seats[i].alive;
      const dl = this.lyFrom(v) ? 2.4 : 1.2;
      this.ghostT.set(i, wasAlive ? this.time + dl : this.time - 10);
      if (wasAlive) setTimeout(() => { if (!this.dead) { try { this.snd.fx('ghost'); } catch { /* yok */ } const a = this.avatarAt(i); if (this.X && a) this.burst(a.headW[0], a.headW[1] - 0.2, a.headW[2], 30, [[0.85, 0.9, 1], [0.6, 0.7, 1], [1, 1, 1]], 0.8, 0.03, true, 1.4, -0.4); } }, dl * 1000);
    });
    // söz balonları
    if (v.said && v.said.seq !== this.saidSeq) {
      this.saidSeq = v.said.seq;
      if (ctx.serverNow() - v.said.at < 3000) {
        const s = v.said, tn = s.t >= 0 ? esc(nm0(v.seats[s.t]?.n || '')) : '';
        const txt = s.k === 'sus' ? `🤔 ${tn} şüpheli!` : s.k === 'seer' ? (s.r === 'vamp' ? `🔮 ${tn} vampir!` : `🔮 ${tn} temiz`) : CLAIM_TXT[s.k] || '';
        const old = this.bubs.get(s.i);
        if (old && old.el) old.el.remove();
        this.bubs.set(s.i, { k: s.k, txt, at: this.time, el: null });
        try { this.snd.fx('say'); } catch { /* yok */ }
      }
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n) => { try { S.fx(n); } catch { /* yok */ } };
    const sNow = this.ctx.serverNow();
    const fresh = (ms) => sNow - ((v.endsAt || 0) - ms) < 1500;
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } }
    if (v.phase === 'role') {
      try { S.music('calm'); } catch { /* yok */ }
      this.ghostT.clear();
      this.bubs.forEach((b) => b.el && b.el.remove()); this.bubs.clear();
      if (this.peek.key !== this.rkey()) this.peek = { key: this.rkey(), on: false, until: 0 };
      if (fresh(v.roleMs || 3e4)) { this.msg('🃏 ROLÜNE BAK', 'mid'); fx('role'); }
    }
    if (v.phase === 'night') {
      try { S.music('calm'); } catch { /* yok */ }
      this.bubs.forEach((b) => b.el && b.el.remove()); this.bubs.clear();
      if (fresh(v.nightMs || 4e4)) { this.msg(`🌙 ${v.day}. GECE`, 'mid'); fx('dusk'); }
    }
    if (v.phase === 'dawn') {
      try { S.music('race'); } catch { /* yok */ }
      this.dawnT = this.time;
      if (fresh(7e3)) {
        fx('dawn');
        const L = v.lastNight;
        setTimeout(() => {
          if (this.dead || !this.view || this.view.phase !== 'dawn') return;
          if (L && L.killed >= 0) this.msg(`👻 ${esc(nm0(v.seats[L.killed]?.n || ''))}`, 'mid');
          else if (L && L.saved) { this.msg('🩺 KURTARILDI!', 'mid'); fx('saved'); }
          else this.msg('☀️ KİMSE ÖLMEDİ', 'mid');
        }, 1100);
      }
    }
    if (v.phase === 'day') {
      try { S.music('race'); } catch { /* yok */ }
      if (fresh(v.dayMs || 9e4)) this.msg(`☀️ ${v.day}. GÜN`, 'mid');
    }
    if (v.phase === 'vote') {
      try { S.music('vote'); } catch { /* yok */ }
      if (fresh(v.voteMs || 45e3)) this.msg('🗳️ OYLAMA', 'mid');
    }
    const lynchShow = () => {
      fx('lynch');
      const L = v.lynch;
      setTimeout(() => {
        if (this.dead || !this.view) return;
        if (L && L.t >= 0) { this.msg(L.role === 'vampir' ? '🧛 VAMPİRDİ!' : '😇 MASUMDU…', 'mid'); if (L.role === 'vampir') this.flash('rgba(255,40,40,.35)', true); }
        else this.msg(L && L.reason === 'tie' ? '⚖️ BERABERE' : '🤷 KİMSE KOVULMADI', 'mid');
      }, 2400);
    };
    if (v.phase === 'lynch') {
      try { S.music('vote'); } catch { /* yok */ }
      this.lynchT = this.time;
      if (fresh(8e3)) lynchShow();
    }
    if (v.phase === 'final') {
      try { S.music('idle'); } catch { /* yok */ }
      const late = sNow - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 9 : 0);
      this.lynchT = this.finT;
      if (!late && v.endedFrom === 'lynch') lynchShow();
      if (!late && v.endedFrom === 'night' && v.lastNight && v.lastNight.killed >= 0) { fx('dawn'); setTimeout(() => { if (!this.dead && this.view && this.view.phase === 'final') this.msg(`👻 ${esc(nm0(v.seats[v.lastNight.killed]?.n || ''))}`, 'mid'); }, 1100); }
      if (!late) {
        setTimeout(() => {
          if (this.dead || !this.view || this.view.phase !== 'final') return;
          const w = this.view;
          fx(w.winner === 'vampir' ? 'vampwin' : 'koywin');
          this.msg(w.winner === 'vampir' ? '🧛 VAMPİRLER KAZANDI' : '🧑‍🌾 KÖY KAZANDI', 'big');
          if (w.winner === 'vampir') this.flash('rgba(180,0,30,.4)', true);
          (w.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && !this.isGhost(i)) this.burst(a.headW[0], a.headW[1] + 0.4, a.headW[2], 26, w.winner === 'vampir' ? [[0.7, 0.05, 0.1], [0.1, 0.05, 0.1], [1, 0.3, 0.3]] : [[1, 0.85, 0.3], [0.3, 0.85, 0.5], [1, 1, 1]], 2, 0.035, false, 2, 2.2); });
        }, v.endedFrom === 'lynch' ? 4300 : 2600);
      }
    }
  }
  // kovulma açılışı mı oynuyor: kovma fazı ya da kovmayla biten oyunun ilk saniyeleri
  lyFrom(v) { return v.phase === 'lynch' || (v.phase === 'final' && v.endedFrom === 'lynch'); }
  lyU() {
    const v = this.view;
    if (!v || !this.lyFrom(v)) return null;
    const u = this.time - (this.lynchT || 0);
    return v.phase === 'final' && u > 4.3 ? null : u;
  }

  /* ---------- karakterler ---------- */
  pointTo(a, w) { const L = a.toSeat(w); a.pointAt(w, L[0] > 0 ? 1 : 0); }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const center = [0, TABLE_Y + 0.35, 0];
    const heads = (i) => this.seats.map((_, k) => (k !== i && !this.isGhost(k) ? this.avatarAt(k)?.headW : null)).filter(Boolean);
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { lt: 0, look: null };
      const idleLook = (pool) => { a.idle.lt -= dt; if (a.idle.lt <= 0 || !a.idle.look) { a.idle.lt = 1.3 + Math.random() * 2.6; a.idle.look = pool.length ? pool[Math.floor(Math.random() * pool.length)] : center; } return a.idle.look; };
      if (this.isGhost(i)) { a.pose('rest', { t }); a.look = center; return; }
      const mine = i === v.me;
      // rol kartına bakıyor (yalnız ben)
      if (mine && this.peekOn()) { a.pose('chin', { t }); a.expr = 'tense'; a.look = center; return; }
      if (v.phase === 'role') { a.pose(v.seen && v.seen[i] ? 'clasp' : 'rest', { t }); a.expr = 'smile'; a.look = idleLook(heads(i)); return; }
      if (v.phase === 'night') {
        if (!this.awake(i)) { a.pose('slump', { t }); a.expr = 'smile'; a.look = [a.pos[0] * 0.5, TABLE_Y, a.pos[2] * 0.5]; return; }
        // uyanık: vampirler seçtiğini gösterir; benim seçimim
        let tg = -1;
        if (v.myRole === 'vampir') { const pk = (v.teamPicks || []).find((x) => x.by === i); tg = pk ? pk.t : -1; }
        else if (mine) tg = v.myRole === 'doktor' ? v.mySave : v.myRole === 'gozcu' ? v.myCheck : -1;
        const ta = tg >= 0 ? this.avatarAt(tg) : null;
        a.pose('lean', { t }); a.expr = v.myRole === 'vampir' ? 'grin' : 'tense';
        if (ta) { this.pointTo(a, ta.headW); a.look = ta.headW; } else a.look = idleLook(heads(i));
        return;
      }
      if (v.phase === 'dawn') {
        const u = t - (this.dawnT || 0);
        a.pose(u < 1.6 ? 'cheer' : 'rest', { t }); a.expr = u < 1.6 ? 'o' : 'tense';
        const L = v.lastNight, ka = L && L.killed >= 0 ? this.avatarAt(L.killed) : null;
        a.look = ka ? ka.headW : center;
        if (u >= 1.6 && L && L.killed >= 0 && u < 5) a.pose(hs(i, v.day) < 0.5 ? 'headgrab' : 'facepalm', { t });
        return;
      }
      if (v.phase === 'day' || v.phase === 'vote') {
        const tg = v.sus ? v.sus[i] : -1;
        const ta = tg >= 0 ? this.avatarAt(tg) : null;
        if (ta && !this.isGhost(tg)) { a.pose('rest', { t }); this.pointTo(a, ta.headW); a.expr = 'tense'; a.look = ta.headW; return; }
        if (v.phase === 'vote') { a.pose(v.voted && v.voted[i] ? 'clasp' : 'chin', { t }); a.expr = 'tense'; a.look = idleLook(heads(i)); return; }
        a.pose(Math.floor(t / 5 + i) % 3 === 0 ? 'chin' : 'rest', { t });
        a.expr = Math.floor(t * 6 + i) % 9 === 0 ? 'o' : 'smile';
        a.look = idleLook(heads(i));
        return;
      }
      const ly = this.lyU();
      if (ly != null) {
        const u = ly, L = v.lynch;
        const tg = L && L.votes ? L.votes[i] : -1;
        const ta = tg >= 0 ? this.avatarAt(tg) : null;
        if (u < 2.4 && ta) { a.pose('rest', { t }); this.pointTo(a, ta.headW); a.expr = 'tense'; a.look = ta.headW; return; }
        if (u < 2.4 && tg === -2) { a.pose('shrug', { t }); a.expr = 'tense'; a.look = center; return; }
        const la = L && L.t >= 0 ? this.avatarAt(L.t) : null;
        if (L && L.t >= 0) {
          const good = L.role === 'vampir';
          a.pose(good ? (hs(i, 7) < 0.5 ? 'cheer' : 'clap') : (hs(i, 8) < 0.5 ? 'facepalm' : 'headgrab'), { t });
          a.expr = good ? 'laugh' : 'sad';
        } else { a.pose('shrug', { t }); a.expr = 'grin'; }
        a.look = la ? la.headW : center;
        return;
      }
      if (v.phase === 'final') {
        const won = (v.champ || []).includes(i), u = t - (this.finT || 0);
        if (won) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; }
        else { a.pose(Math.floor(u / 3 + i) % 2 === 0 ? 'slump' : 'facepalm', { t }); a.expr = 'sad'; }
        a.look = idleLook(heads(i));
        return;
      }
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = idleLook(heads(i));
    });
  }

  /* ---------- kamera + ışık ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time;
    // gece/gündüz ışığı
    let nk = 0;
    if (v.phase === 'night') nk = 1;
    else if (v.phase === 'role') nk = 0.55;
    else if (v.phase === 'dawn') nk = clamp(1 - (t - (this.dawnT || 0)) / 3, 0, 1);
    else if (v.phase === 'final') nk = v.winner === 'vampir' ? 0.75 : 0;
    this.nightK = damp(this.nightK, nk, v.phase === 'dawn' ? 6 : 1.4, dt);
    const k = this.nightK, L = this.Lmix;
    lerp3(L.sunC, DAY_L.sunC, NIGHT_L.sunC, k); lerp3(L.sky, DAY_L.sky, NIGHT_L.sky, k); lerp3(L.gnd, DAY_L.gnd, NIGHT_L.gnd, k);
    lerp3(L.warm, DAY_L.warm, NIGHT_L.warm, k); lerp3(L.lampC, DAY_L.lampC, NIGHT_L.lampC, k);
    lerp3(this.fogC, FOG_DAY, FOG_NIGHT, k);
    this.lampK = lerp(1, 0.28, k);
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = 240, H = [0, TABLE_Y + 0.3, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.38;
    const n = this.seats.length;
    const focus = (i, u0, u1, u) => {
      const a = i >= 0 ? this.avatarAt(i) : null;
      if (!a || u < u0 || u > u1) return false;
      zoom = 0.6; sy = land ? 0.45 : 0.33; H = [a.headW[0] * 0.8, a.headW[1] - 0.15, a.headW[2] * 0.8]; yawC = Math.atan2(-a.pos[0], -a.pos[2]);
      return true;
    };
    if (v.phase === 'role') { zoom = 0.95; bp = 300; }
    else if (v.phase === 'night') { zoom = 0.9; bp = v.myAlive && v.myRole !== 'koylu' ? 280 : 200; pa = 0.06; }
    else if (v.phase === 'dawn') { bp = 200; focus(v.lastNight ? v.lastNight.killed : -1, 0.6, 6, t - (this.dawnT || 0)); }
    else if (v.phase === 'day') { zoom = 1; bp = n > 7 ? 320 : 290; }
    else if (v.phase === 'vote') { zoom = 1; bp = n > 7 ? 320 : 280; }
    else if (this.lyU() != null) { bp = 220; if (!focus(v.lynch ? v.lynch.t : -1, 1.8, v.phase === 'final' ? 4.3 : 7, this.lyU())) zoom = 1; }
    else if (v.phase === 'final' && v.endedFrom === 'night' && t - (this.finT || 0) < 3.2 && v.lastNight && v.lastNight.killed >= 0) { bp = 200; focus(v.lastNight.killed, 0.4, 3.2, t - (this.finT || 0)); }
    else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // son saniyeler: tıkırtı (benden bir hamle bekleniyorsa)
    const left = (v.endsAt || 0) - this.ctx.serverNow();
    const urgent = v.myAlive && ((v.phase === 'night' && !v.myDone) || (v.phase === 'vote' && v.myVote == null));
    if (urgent && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; try { this.snd.fx('tick'); } catch { /* yok */ } } }
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
  // ölüler (hayaletler) avatar olarak çizilmez
  drawAvatars(F, shadow) {
    const v = this.view;
    if (!v) return super.drawAvatars(F, shadow);
    const all = this.seats;
    const keep = all.filter((p, i) => !this.isGhost(i));
    if (keep.length === all.length) return super.drawAvatars(F, shadow);
    this.seats = keep;
    try { super.drawAvatars(F, shadow); } finally { this.seats = all; }
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.cdl || !v) return;
    const m = this.mats.b, T = this.T;
    M.set(m, 0, TABLE_Y + 0.004, 0);
    D(Wd.cdl, m, T.obj);
    CANDLES.forEach(([x, z], k) => {
      M.set(m, x, TABLE_Y + 0.004 + CAND_Y, z);
      D(Wd.cbody, m, T.obj);
      if (!shadow) {
        const fl = 1 + 0.14 * Math.sin(this.time * 17 + k * 2) * Math.sin(this.time * 6.3 + k);
        M.set(m, x, TABLE_Y + 0.004 + CAND_Y, z, 0, Math.sin(this.time * 3 + k) * 0.08, 0, fl, fl * (1 + 0.1 * Math.sin(this.time * 11 + k)), fl);
        D(Wd.cflame, m, T.obj);
      }
    });
    // vampir yakası: finalde (herkes görür) ya da gece vampir takımı birbirini görürken
    const showCollar = (i) => {
      if (this.isGhost(i)) return false;
      if (v.phase === 'final') return (v.roles || [])[i] === 'vampir' && this.time - (this.finT || 0) > 1.2;
      return v.myRole === 'vampir' && (v.vampTeam || []).includes(i) && v.phase === 'night';
    };
    this.seats.forEach((p, i) => { const a = this.av.get(p.id); if (a && showCollar(i)) D(Wd.collar, a.M.body, T.obj); });
  }
  // uyuyanların gözleri kapalı (göz kapakları sürekli)
  drawLit2() {
    const v = this.view, Wd = this.W, X = this.X;
    if (!v || !Wd || !Wd.lids || v.phase !== 'night') return;
    const tH = this.lidT || (this.lidT = new Float32Array(3));
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a || this.awake(i) || this.isGhost(i)) return;
      const k = (p.on === 0 ? 0.55 : 1) * this.T.av;
      tH[0] = a.skinT[0] * k; tH[1] = a.skinT[1] * k; tH[2] = a.skinT[2] * k;
      drawMesh(X, Wd.lids, a.M.head, tH);
    });
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  ghostPos(i) {
    const a = this.avatarAt(i);
    if (!a) return null;
    const u = this.time - (this.ghostT.get(i) ?? 0);
    const rise = clamp(u / 1.4, 0, 1);
    const bob = Math.sin(this.time * 1.8 + i) * 0.03;
    return { p: [a.pos[0] - Math.cos(a.ang) * 0.02, 0.62 + rise * 0.45 + bob, a.pos[2] - Math.sin(a.ang) * 0.02], s: 0.35 + 0.65 * (1 - Math.pow(1 - rise, 3)), yaw: a.yaw + Math.sin(this.time * 0.9 + i) * 0.25 };
  }
  drawFx(F, m) {
    const X = this.X, v = this.view, Wd = this.W;
    if (!v || !Wd || !Wd.ghost) return;
    const gl = X.gl, t = this.time;
    // mum alevlerinin hâlesi (gece daha belirgin)
    const nk = this.nightK;
    CANDLES.forEach(([x, z], k) => {
      const fl = 0.85 + 0.15 * Math.sin(t * 13 + k) * Math.sin(t * 7.3 + k);
      this.glow(m, [x, TABLE_Y + 0.004 + CAND_Y + 0.128, z], 0.06 * fl, FLAME3, 0.55 + 0.35 * nk);
    });
    M.set(m, 0, TABLE_Y + 0.008, 0, 0, 0, 0, 0.7 + 0.5 * nk, 1, 0.7 + 0.5 * nk);
    drawMesh(X, this.res.glow, m, FLAME3, 0.12 + 0.3 * nk);
    // ay ışığı (gece, masanın bir yanına vuran soğuk ışık)
    if (nk > 0.05) { M.set(m, 0.6, TABLE_Y + 0.01, -0.5, 0.4, 0, 0, 1.6, 1, 1.1); drawMesh(X, this.res.glow, m, MOON3, 0.12 * nk); }
    // vampir takımının kırmızı gözleri (gece, yalnız vampirlere) ve finalde herkese
    const redEyes = (i) => {
      if (this.isGhost(i)) return false;
      if (v.phase === 'final') return (v.roles || [])[i] === 'vampir' && t - (this.finT || 0) > 1.2;
      return v.phase === 'night' && v.myRole === 'vampir' && (v.vampTeam || []).includes(i);
    };
    this.seats.forEach((p, i) => {
      if (!redEyes(i)) return;
      const a = this.av.get(p.id);
      if (!a) return;
      const h = a.M.head;
      for (const sx of [-1, 1]) {
        const lx = HC[0] + sx * HR * 0.32, ly = HC[1] + HR * 0.12, lz = HC[2] + HR * 0.95;
        const w = [h[0] * lx + h[4] * ly + h[8] * lz + h[12], h[1] * lx + h[5] * ly + h[9] * lz + h[13], h[2] * lx + h[6] * ly + h[10] * lz + h[14]];
        this.glow(m, w, 0.05 + 0.01 * Math.sin(t * 6), RED3, 0.9);
      }
    });
    // günün şüphe okları (herkese açık): işaret edenden işaret edilene, oy verenin renginde
    const arrows = [];
    if ((v.phase === 'day' || v.phase === 'vote') && v.sus) v.sus.forEach((tg, i) => { if (tg >= 0 && !this.isGhost(i) && !this.isGhost(tg)) arrows.push([i, tg, 0.5]); });
    const ly = this.lyU();
    if (ly != null && v.lynch && v.lynch.votes) { const k2 = clamp((ly - 0.2) / 0.5, 0, 1) * clamp(1 - (ly - (v.phase === 'final' ? 3 : 5)) / 1.3, 0, 1); if (k2 > 0) v.lynch.votes.forEach((tg, i) => { if (tg >= 0) arrows.push([i, tg, 0.85 * k2]); }); }
    if (v.phase === 'night' && v.myRole === 'vampir' && v.teamPicks) v.teamPicks.forEach((x) => { if (x.t >= 0) arrows.push([x.by, x.t, 0.7, RED3]); });
    const tc = this.aT || (this.aT = new Float32Array(3));
    arrows.forEach(([i, tg, al, col]) => {
      const a = this.avatarAt(i), b = this.avatarAt(tg);
      if (!a || !b) return;
      const p0 = this.seatW(a, 0, TABLE_Y + 0.01, 0.5), p1 = this.seatW(b, 0, TABLE_Y + 0.01, 0.55);
      const dx = p1[0] - p0[0], dz = p1[2] - p0[2], L = Math.hypot(dx, dz);
      const cc = col || hexRGB(pcol(this.seats[i].c));
      tc[0] = cc[0]; tc[1] = cc[1]; tc[2] = cc[2];
      // ok: ince parıltı şeridi + uçta parlak benek
      const n = Math.max(2, Math.round(L / 0.12));
      for (let k = 1; k < n; k++) {
        const f = k / n;
        M.set(m, p0[0] + dx * f, p0[1], p0[2] + dz * f, 0, 0, 0, 0.05, 1, 0.05);
        drawMesh(X, this.res.glow, m, tc, al * (0.35 + 0.65 * f));
      }
      M.set(m, p1[0] - dx / L * 0.05, p1[1], p1[2] - dz / L * 0.05, 0, 0, 0, 0.11, 1, 0.11);
      drawMesh(X, this.res.glow, m, tc, al * 1.2);
    });
    // hayaletler (normal karışım, yarı saydam) + soğuk hâle
    const ghosts = [];
    this.seats.forEach((p, i) => { if (this.isGhost(i)) { const g = this.ghostPos(i); if (g) ghosts.push(g); } });
    if (ghosts.length) {
      ghosts.forEach((g) => this.glow(m, [g.p[0], g.p[1] + 0.22 * g.s, g.p[2]], 0.38 * g.s, MOON3, 0.22));
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(X.un.u.uAdd, 0);
      ghosts.forEach((g) => { M.set(m, g.p[0], g.p[1], g.p[2], g.yaw, 0, 0, g.s); drawMesh(X, Wd.ghost, m, ONE3, 0.88); });
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1f(X.un.u.uAdd, 1);
    }
  }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }

  /* ---------- arayüz ---------- */
  timerBar(left, total) { return `<div class="vk-tm"><i style="transform:scaleX(${clamp(left / Math.max(1, total), 0, 1).toFixed(3)})"></i></div>`; }
  roleBox(v) {
    const r = ROLE[v.myRole];
    if (!r) return '';
    const team = v.myRole === 'vampir' && (v.vampTeam || []).length > 1 ? `<p>Takımın: <b style="display:inline;font-size:13px">${v.vampTeam.filter((i) => i !== v.me).map((i) => esc(nm0(v.seats[i]?.n || ''))).join(', ')}</b></p>` : '';
    return `<div class="vk-role" style="--rb:${r.bg};--rf:${r.fg}"><div class="e">${r.emoji}</div><b>${r.you}</b><p>${r.text}</p>${team}</div>`;
  }
  seerLine(v) {
    if (v.myRole !== 'gozcu' || !(v.seer || []).length) return '';
    return `<div class="vk-seer">${v.seer.map((r) => `<span class="${r.vamp ? 'v' : ''}">${esc(nm0(v.seats[r.t]?.n || ''))}: ${r.vamp ? '🧛 vampir' : '✓ temiz'}</span>`).join('')}</div>`;
  }
  chips(v, act, opt) {
    return v.seats.map((p, i) => {
      if (!opt.show(i, p)) return '';
      const cls = opt.cls ? opt.cls(i) : '';
      return `<button data-act="${act}" data-t="${i}" style="--pc:${pcol(p.c)}" class="${cls}" ${opt.dis && opt.dis(i, p) ? 'disabled' : ''}><i></i>${esc(nm0(p.n))}${i === v.me ? ' (sen)' : ''}<span>${opt.sub ? opt.sub(i, p) : ''}</span></button>`;
    }).join('');
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
    const peek = this.peekOn();
    const playing = v.inGame && v.me >= 0 && v.myRole;
    const peekBtn = playing && !peek ? '<button class="vk-b ghost" data-act="vk-peek">👁 Rolüm</button>' : '';
    const roleTxt = peek ? this.roleBox(v) : '';
    const left = (v.endsAt || 0) - this.ctx.serverNow();
    if (v.phase === 'role') {
      if (!playing) { key = 'role|watch'; html = '<div class="vk-box dark"><div class="h">👀 Bu oyunu izliyorsun</div><div class="s">Yeni oyunda sen de varsın.</div></div>'; }
      else {
        const seen = v.seen && v.seen[v.me];
        const cnt = (v.seen || []).filter(Boolean).length;
        key = `role|${v.game}|${seen}|${peek}|${cnt}`;
        if (peek) html = `<div class="vk-box">${this.roleBox(v)}${seen ? '' : '<div class="vk-row"><button class="vk-b" data-act="vk-seen">Gördüm, kapat ✓</button></div>'}<div class="s">Rolünü kimseye gösterme 🤫</div></div>`;
        else if (!seen) html = '<div class="vk-box"><div class="h">🃏 Rolün belli oldu</div><button class="vk-card" data-act="vk-flip">Rolüne bakmak için dokun<small>Ekranı yanındakilere gösterme 🤫</small></button></div>';
        else html = `<div class="vk-box dark"><div class="h">✓ Rolünü gördün</div><div class="s">Gece çökmek üzere… (${cnt}/${v.seats.length})</div><div class="vk-row">${peekBtn}</div></div>`;
      }
    } else if (v.phase === 'night') {
      const tb = this.timerBar(left, v.nightMs || 4e4);
      if (!playing) { key = 'night|watch'; html = `<div class="vk-box dark"><div class="h">🌙 Köy uyuyor…</div><div class="s">İzliyorsun.</div>${tb}</div>`; }
      else if (!v.myAlive) { key = 'night|dead'; html = `<div class="vk-box dark"><div class="h">👻 Hayaletsin</div><div class="s">Gecenin sırlarını sessizce izle. Rolünü kimseye söyleme!</div>${tb}</div>`; }
      else if (v.myRole === 'koylu') {
        key = `night|k|${v.day}|${v.myDone}|${peek}`;
        html = v.myDone ? `<div class="vk-box dark"><div class="h">💤 İyi geceler</div><div class="s">Sabahı bekle… (${v.doneCount}/${v.total})</div><div class="vk-row">${peekBtn}</div>${roleTxt}${tb}</div>`
          : `<div class="vk-box dark"><div class="h">🌙 ${v.day}. gece · köy uyuyor</div><div class="s">Gözlerini kapat ve uyu. Herkes bir şeye dokunur ki kimse kimin uyanık olduğunu anlamasın.</div><div class="vk-row"><button class="vk-b" data-act="vk-sleep">😴 Uyu</button>${peekBtn}</div>${roleTxt}${tb}</div>`;
      } else {
        const r = v.myRole;
        const cur = r === 'vampir' ? v.myPick : r === 'doktor' ? v.mySave : v.myCheck;
        const team = v.vampTeam || [];
        const head = r === 'vampir' ? '🧛 Kurbanını seç' : r === 'doktor' ? '🩺 Bu gece kimi koruyacaksın?' : '🔮 Kime bakacaksın?';
        const sub = r === 'vampir' ? (team.length > 1 ? 'Takımınla aynı kişiyi seçin; eşitlikte biri rastgele seçilir.' : 'Seçimin sabah belli olur.') : r === 'doktor' ? 'Vampir onu seçerse kurtulur. Kendini de seçebilirsin.' : (v.myCheck >= 0 ? 'Bu gecelik baktın.' : 'Her gece bir kişiye bakabilirsin.');
        const picks = (i) => (v.teamPicks || []).filter((x) => x.t === i && x.by !== v.me).map((x) => nm(x.by));
        const chips = this.chips(v, 'vk-night', {
          show: (i, p) => p.alive && (r === 'doktor' || i !== v.me) && !(r === 'vampir' && team.includes(i)),
          cls: (i) => (cur === i ? (r === 'vampir' ? 'on' : r === 'doktor' ? 'sv' : 'ck') : ''),
          dis: () => r === 'gozcu' && v.myCheck >= 0,
          sub: (i) => (r === 'vampir' && picks(i).length ? `👉 ${picks(i).join(', ')}` : r === 'gozcu' && (v.seer || []).find((x) => x.t === i) ? ((v.seer.find((x) => x.t === i).vamp) ? '🧛 vampir!' : '✓ temiz') : '')
        });
        const res = r === 'gozcu' && v.myCheck >= 0 ? (() => { const x = (v.seer || []).find((q) => q.t === v.myCheck); return x ? `<div class="h" style="margin-top:6px">${nm(v.myCheck)} ${x.vamp ? '<span style="color:#ff6b6b">VAMPİR! 🧛</span>' : 'vampir değil ✓'}</div>` : ''; })() : '';
        key = `night|${r}|${v.day}|${cur}|${JSON.stringify(v.teamPicks || [])}|${peek}|${(v.seer || []).length}`;
        html = `<div class="vk-box dark"><div class="h">${head}</div><div class="s">${sub}</div>${res}<div class="vk-chips">${chips}</div>${this.seerLine(v)}<div class="vk-row">${peekBtn}</div>${roleTxt}${tb}</div>`;
      }
    } else if (v.phase === 'dawn') {
      const L = v.lastNight;
      key = `dawn|${v.day}`;
      const txt = L && L.killed >= 0 ? `Gece <b>${nm(L.killed)}</b> vampirlerin kurbanı oldu 👻 · ${ROLE[L.role]?.emoji || ''} ${ROLE[L.role]?.name || ''}` : L && L.saved ? '🩺 Doktor birini son anda kurtardı! Bu gece kimse ölmedi.' : 'Bu gece kimse ölmedi.';
      html = `<div class="vk-box"><div class="h">☀️ Sabah oldu</div><div class="s" style="font-size:14px;opacity:.9">${txt}</div></div>`;
    } else if (v.phase === 'day') {
      const tb = this.timerBar(left, v.dayMs || 9e4);
      const canAct = playing && v.myAlive;
      const myT = v.sus ? v.sus[v.me] : -1;
      const pointers = (i) => (v.sus || []).map((t, k) => (t === i ? k : -1)).filter((k) => k >= 0);
      const chips = this.chips(v, 'vk-sus', {
        show: (i, p) => p.alive && i !== v.me,
        cls: (i) => (myT === i ? 'on' : ''),
        dis: () => !canAct,
        sub: (i) => { const ps = pointers(i); return ps.length ? `🤔 ${ps.length} kişi şüpheleniyor` : ''; }
      });
      const rd = (v.ready || [])[v.me];
      const seerBtns = v.myRole === 'gozcu' && canAct ? (v.seer || []).filter((r) => v.seats[r.t]?.alive).map((r) => `<button class="vk-b sm alt" data-act="vk-say" data-k="seer" data-t="${r.t}" data-r="${r.vamp ? 'vamp' : 'clean'}">🔮 ${nm(r.t)}: ${r.vamp ? 'vampir!' : 'temiz'}</button>`).join('') : '';
      const claims = canAct ? `<button class="vk-b sm alt" data-act="vk-say" data-k="koylu">🙋 Köylüyüm</button><button class="vk-b sm alt" data-act="vk-say" data-k="doktor">🩺 Doktorum</button><button class="vk-b sm alt" data-act="vk-say" data-k="gozcu">🔮 Gözcüyüm</button>` : '';
      const rc = (v.ready || []).filter(Boolean).length, ac = v.seats.filter((p) => p.alive && p.on).length;
      key = `day|${v.day}|${myT}|${rd}|${peek}|${canAct}|${JSON.stringify(v.sus)}|${rc}|${this.ctx.isHost}`;
      html = `<div class="vk-box"><div class="h">☀️ ${v.day}. gün · vampir kim?</div><div class="s">${canAct ? 'Konuşun! Şüphelendiğine dokun, parmağınla göster (tekrar dokunursan geri alırsın).' : v.myAlive ? 'İzliyorsun.' : '👻 Hayaletsin: konuşamazsın ama izleyebilirsin.'}</div>
        <div class="vk-chips">${chips}</div><div class="vk-row">${claims}${seerBtns}</div>
        <div class="vk-row">${canAct ? `<button class="vk-b ${rd ? 'on' : ''}" data-act="vk-ready">${rd ? '✓ Oylamaya hazırım' : '✋ Oylamaya hazırım'} (${rc}/${ac})</button>` : ''}${this.ctx.isHost ? '<button class="vk-b ghost" data-act="vk-tovote">Oylamaya geç ▶</button>' : ''}${peekBtn}</div>${roleTxt}${tb}</div>`;
    } else if (v.phase === 'vote') {
      const tb = this.timerBar(left, v.voteMs || 45e3);
      const canAct = playing && v.myAlive;
      const chips = this.chips(v, 'vk-vote', {
        show: (i, p) => p.alive && i !== v.me,
        cls: (i) => (v.myVote === i ? 'on' : ''),
        dis: () => !canAct,
        sub: (i) => { const n2 = (v.sus || []).filter((t) => t === i).length; return n2 ? `🤔 ${n2} şüphe` : ''; }
      });
      key = `vote|${v.day}|${v.myVote}|${v.votedCount}|${canAct}|${peek}`;
      html = `<div class="vk-box"><div class="h">🗳️ Kimi köyden kovalım?</div><div class="s">${canAct ? (v.myVote != null ? `Oyun: <b>${v.myVote === 'skip' ? 'pas' : nm(v.myVote)}</b> · değiştirebilirsin` : 'Oyunu ver; eşitlikte ya da pas çoğunluktaysa kimse kovulmaz') : 'Oylamayı izliyorsun'} · ${v.votedCount}/${v.total}</div>
        <div class="vk-chips">${chips}</div><div class="vk-row">${canAct ? `<button class="vk-b alt ${v.myVote === 'skip' ? 'on' : ''}" data-act="vk-vote" data-t="skip">🤷 Pas</button>` : ''}${peekBtn}</div>${roleTxt}${tb}</div>`;
    } else if (v.phase === 'lynch') {
      const L = v.lynch;
      const u = this.time - (this.lynchT || 0);
      if (u >= 2.4 || this.ctx.serverNow() - ((v.endsAt || 0) - 8e3) > 2500) {
        key = `lynch|${v.day}`;
        if (L && L.t >= 0) html = `<div class="vk-box vk-res ${L.role === 'vampir' ? 'ok' : 'vamp'}"><div class="h">⚖️ ${nm(L.t)} köyden kovuldu</div><div class="s" style="font-size:14px;opacity:.95">${L.role === 'vampir' ? '🧛 Vampirdi! Köy bir nefes aldı.' : `${ROLE[L.role]?.emoji || ''} ${ROLE[L.role]?.name || ''}… masumdu 😢`}</div></div>`;
        else html = `<div class="vk-box"><div class="h">${L && L.reason === 'tie' ? '⚖️ Oylar eşit' : '🤷 Pas çoğunlukta'}</div><div class="s">Bugün kimse kovulmadı. Gece yaklaşıyor…</div></div>`;
      } else key = 'lynch|wait';
    }
    this.setBar(key, html);
  }
  modeSeg(v) {
    return `<div class="vk-seg" role="group" aria-label="Gündüz süresi"><button data-act="vk-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Gündüz 1,5 dk</button><button data-act="vk-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🗣️ Gündüz 3 dk</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card vk-intro">
        <div class="tt">🧛 Vampir Köylü</div>
        <div class="sub">Gece vampirler avlanır, gündüz köy suçluyu arar. Kim kimdir?</div>
        <div class="vk-ru"><div style="background:#3a1020;color:#fff"><b>🧛</b>Vampir</div><div style="background:#d6f5e0"><b>🩺</b>Doktor</div><div style="background:#e3dcff"><b>🔮</b>Gözcü</div><div style="background:#fff4c2"><b>🧑‍🌾</b>Köylü</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="vk-start" ${n < 5 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 5 ? `Vampir Köylü için masada en az 5 kişi lazım (şu an ${n}).` : 'Herkes gizlice rolüne bakar. Vampirlerin hepsi kovulursa köy, köylüler azalıp vampirlere yetişirse vampirler kazanır.'}</div>
      </div>`;
    } else if (v.phase === 'final') {
      const u = this.ctx.serverNow() - (v.finAt || 0);
      if (u >= (v.endedFrom === 'lynch' ? 5600 : 3800)) {
        const wait = u < (v.minMs || 3000);
        const champ = v.champ || [];
        const mine = champ.includes(v.me);
        const rows = v.seats.map((p, i) => ({ p, i })).sort((x, y) => (champ.includes(y.i) - champ.includes(x.i)) || y.p.sc - x.p.sc)
          .map(({ p, i }) => { const r = ROLE[(v.roles || [])[i]]; return `<div class="${champ.includes(i) ? 'w' : ''} ${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${p.alive ? '' : '👻 '}${esc(nm0(p.n))}</span><em>${r ? `${r.emoji} ${r.name}` : ''}</em><b>🏆 ${p.sc}</b></div>`; }).join('');
        key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
        html = `<div class="card">
          <div class="tt">${v.winner === 'vampir' ? '🧛 Vampirler kazandı!' : '🧑‍🌾 Köy kazandı!'}${v.me >= 0 && v.inGame ? (mine ? ' 🎉' : ' 😢') : ''}</div>
          <div class="sub">${v.winner === 'vampir' ? 'Vampirler köylülere yetişti.' : 'Bütün vampirler köyden kovuldu.'} · 🏆 toplam galibiyet</div>
          <div class="vk-tb">${rows}</div>
          ${this.modeSeg(v)}
          <div class="row2"><button class="kb" data-act="vk-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
        </div>`;
      }
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const left = mmss((v.endsAt || 0) - this.ctx.serverNow());
    const TOP = { role: `🃏 roller · ⏱ ${left}`, night: `🌙 ${v.day}. gece · ⏱ ${left}`, dawn: `☀️ ${v.day}. sabah`, day: `☀️ ${v.day}. gün · ⏱ ${left}`, vote: `🗳️ ${v.day}. gün oylama · ⏱ ${left}`, lynch: `⚖️ ${v.day}. gün` };
    this.top(TOP[v.phase] || '');
    // süre çubuğu
    const tm = this.el.bar.querySelector('.vk-tm i');
    const tot = v.phase === 'night' ? v.nightMs : v.phase === 'day' ? v.dayMs : v.phase === 'vote' ? v.voteMs : 0;
    if (tm && tot) tm.style.transform = `scaleX(${clamp(((v.endsAt || 0) - this.ctx.serverNow()) / tot, 0, 1).toFixed(3)})`;
    // etiketler: ölü 👻, rolüm (yalnız bende), hazır/oy, kovulmada aldığı oy, finalde roller
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      const dead = !p.alive && this.isGhost(i);
      if (dead) x += '<span>👻</span>';
      if (v.phase === 'role' && v.seen) x += v.seen[i] ? '<span>✓</span>' : '<span>🃏</span>';
      if (v.phase === 'day' && v.ready && v.ready[i]) x += '<span>✋</span>';
      if (v.phase === 'vote' && v.voted && p.alive) x += v.voted[i] ? '<span>🗳️</span>' : '<span>🤔</span>';
      if (v.phase === 'lynch' && v.lynch && v.lynch.tally && v.lynch.tally[i]) x += `<span>${v.lynch.tally[i]}🗳️</span>`;
      let role = null;
      if (v.phase === 'final') role = (v.roles || [])[i];
      else if (i === v.me && v.myRole) role = v.myRole;
      else if (v.myRole === 'vampir' && (v.vampTeam || []).includes(i)) role = 'vampir';
      else if (dead && v.lastNight && v.lastNight.killed === i) role = v.lastNight.role;
      else if (dead && v.lynch && v.lynch.t === i) role = v.lynch.role;
      if (role && ROLE[role]) x += `<b class="vk-r ${role === 'vampir' ? 'v' : ''}">${ROLE[role].emoji}${v.phase === 'final' || dead ? ' ' + ROLE[role].name : ''}</b>`;
      if (o.vkK !== x) {
        o.vkK = x;
        let el = o.lbl.querySelector('.vk-x');
        if (!el) { el = document.createElement('span'); el.className = 'vk-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('vk-dead', dead);
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.vk-x')) o.vkK = '';
  }
  placeLbls() {
    super.placeLbls();
    const v = this.view;
    if (!v) return;
    // hayaletlerin etiketi biraz daha yukarıda (süzülen hayaletin üstünde)
    const now = this.time;
    for (const [i, b] of this.bubs) {
      const a = this.avatarAt(i);
      const age = now - b.at;
      if (!a || age > 4.5 || this.flat || (v.phase !== 'day' && v.phase !== 'vote')) { if (b.el) b.el.style.display = 'none'; if (age > 4.5) { b.el && b.el.remove(); this.bubs.delete(i); } continue; }
      if (!b.el) {
        b.el = document.createElement('div');
        b.el.className = 'vk-bub' + (b.k === 'seer' ? ' seer' : b.k === 'sus' ? ' sus' : '');
        b.el.innerHTML = b.txt;
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
    // gece: lacivert örtü ve ay
    if (this.nightK > 0.05) { g.fillStyle = `rgba(10,14,40,${(0.55 * this.nightK).toFixed(3)})`; g.fillRect(0, 0, w, h); g.font = '30px system-ui'; g.fillText('🌙', w - 40, 70); }
    g.font = '26px system-ui';
    g.fillText(v.phase === 'night' ? '🕯️' : '☀️', cx, cy);
    if ((v.phase === 'day' || v.phase === 'vote') && v.sus) v.sus.forEach((t, i) => {
      if (t < 0) return;
      const [x0, y0] = this.flatPos(i), [x1, y1] = this.flatPos(t);
      g.strokeStyle = pcol(v.seats[i]?.c ?? 0); g.lineWidth = 3;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, 0.82), lerp(y0, y1, 0.82)); g.stroke();
    });
    v.seats.forEach((p, i) => { if (!p.alive) { const [x, y] = this.flatPos(i); g.font = '26px system-ui'; g.fillText('👻', x, y - 32); } });
    g.restore();
  }
  onDispose() { this.bubs.forEach((b) => b.el && b.el.remove()); this.bubs.clear(); }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new VampGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[vkl]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
