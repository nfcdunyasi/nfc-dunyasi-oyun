// Hafıza Sırası — 3D restoran masası (NFC Dünyası Oyun)
// Masanın ortasında dört renkli, ışıklı bir hafıza cihazı var. Cihaz bir renk dizisi çalar (her rengin kendi notası);
// herkes önündeki küçük tuş takımında aynı diziyi tekrar eder, karakterler tuşlara basar. Her tur dizi bir renk uzar,
// yanlış basan ya da süresinde bitiremeyen elenir; son kalan kazanır. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla
// çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-22-c';
import * as sfx from '../sfx.js?v=2026-11-22-c';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, mix3, rgbA, sst, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, makeTexture, updateTexture, drawMesh, limb, psurf, medal } = E;

// renkler: 0 kırmızı (sol üst), 1 mavi (sağ üst), 2 yeşil (sol alt), 3 sarı (sağ alt) — ekrandaki tuşlarla aynı düzen
const COLS = ['#ff3b30', '#0a84ff', '#30d158', '#ffd60a'];
const DIM = ['#360c0a', '#0a1d40', '#08331c', '#3d3207'];
const NAMES = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'];
const FLAT_DIM = ['#7a1d17', '#0d3f7a', '#17652e', '#7d6a08'];     // 2D yedek görünümde sönük renkler
const COLS_RGB = COLS.map((c) => hexRGB(c)), DIM_RGB = DIM.map((c) => hexRGB(c)), OFF_RGB = hexRGB('#3a3a40'), WHITE3 = [1, 1, 1], GREY3 = [0.55, 0.55, 0.6];
const NOTE = [523.25, 659.25, 783.99, 1046.5];
const PAD_A = [-0.75 * Math.PI, -0.25 * Math.PI, 0.75 * Math.PI, 0.25 * Math.PI];
const DEV_H = 0.075;
const MINI_Z = 0.48;        // küçük tuş takımının koltuktan uzaklığı (koltuk uzayı; masa kenarı 0,36'da)
const MINI_D = 0.048;       // tuş merkezlerinin takım merkezine uzaklığı
const KEY_TOP = 0.046;      // tuşun üst yüzü (takım tabanından)
// karakterin işaret parmağı ucu bilekten ~0,19 ileride; parmak yönü F boyunca
const FING = 0.19, FDIR = [0, -0.7, 1], FDN = (() => { const l = Math.hypot(...FDIR); return FDIR.map((x) => x / l); })();

const STYLE = `
#ky.hfz .msg{top:13%}
#ky.hfz .hz-pad{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:420px}
#ky.hfz .hz-pad button{height:84px;border-radius:24px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:var(--c);opacity:.62;filter:saturate(.75) brightness(.85);transition:opacity .08s,filter .08s,transform .06s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;position:relative}
#ky.hfz .hz-pad.on button{opacity:1;filter:none}
#ky.hfz .hz-pad button.lit{opacity:1;filter:brightness(1.45) saturate(1.2);box-shadow:0 0 0 4px #fff,0 0 30px var(--c),4px 4px 0 var(--ink);transform:scale(1.03)}
#ky.hfz .hz-pad.on button:active{transform:translate(2px,2px) scale(.98);box-shadow:2px 2px 0 var(--ink)}
#ky.hfz .hz-pad[aria-disabled="true"] button{pointer-events:none}
#ky.hfz .hz-st{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:#fff;background:rgba(12,10,26,.7);border-radius:99px;padding:6px 15px;max-width:94%;white-space:nowrap;pointer-events:none}
#ky.hfz .hz-st b{font-variant-numeric:tabular-nums;font-size:18px}
#ky.hfz .hz-st b.hot{color:#ff6b5a}
#ky.hfz .hz-st .dots{letter-spacing:2px;font-size:14px}
#ky.hfz .hz-st.ok{background:#1f8a4a}
#ky.hfz .hz-st.bad{background:#b3261e}
#ky.hfz .hz-st.watch{background:rgba(12,10,26,.82)}
#ky.hfz .hz-res{width:min(400px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:10px 16px 11px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none}
#ky.hfz .hz-res.win{background:#dff7e4}#ky.hfz .hz-res.out{background:#ece6f0}
#ky.hfz .hz-res .big{font-size:28px;font-weight:900;line-height:1.1}
#ky.hfz .hz-res .q{margin-top:4px;font-size:14.5px;font-weight:700;line-height:1.3;opacity:.85}
#ky.hfz .lbl .hz-x{display:inline-flex;align-items:center;gap:3px}
#ky.hfz .lbl .hz-x:empty{display:none}
#ky.hfz .lbl .hz-p{font-size:11px;font-variant-numeric:tabular-nums;background:rgba(255,255,255,.2);border-radius:99px;padding:0 6px}
#ky.hfz .lbl.me .hz-p{background:rgba(28,22,51,.14)}
#ky.hfz .lbl .hz-ok{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:99px;background:#2fbf5a;color:#fff;font-size:10px}
#ky.hfz .lbl .hz-no{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:99px;background:#e0362a;color:#fff;font-size:10px}
#ky.hfz .lbl.out{opacity:.5;filter:grayscale(1)}
#ky.hfz .card .hz-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.hfz .card .hz-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.hfz .card .hz-seg button.on{background:var(--ink);color:#fff}
#ky.hfz .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.hfz .card .hz-rest{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px}
#ky.hfz .card .hz-rest span{border:2px solid var(--ink);border-radius:99px;padding:1px 9px;font-weight:800;font-size:12.5px;background:#fff;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
#ky.hfz .card .hz-rest span.me{background:var(--lim)}
#ky.hfz .card .hz-top3{display:none}
@media (max-height:560px){#ky.hfz .card .hz-top3{display:flex}}
#ky.hfz .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.hfz .card .row2 .kb.alt{flex:0 0 auto}
#ky.hfz .card.hz-in .tt{font-size:26px}
#ky.hfz .card.hz-in .sub{font-size:14px}
#ky.hfz .card.hz-in .kb{margin-top:10px}
#ky.hfz .card .hz-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.hfz .card .hz-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.hfz .card .hz-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.hfz .card .hz-ru .r{background:#ffd9d4}#ky.hfz .card .hz-ru .b{background:#d6e6ff}#ky.hfz .card .hz-ru .g{background:#d6f5e0}
@media (orientation:landscape) and (max-height:520px){
#ky.hfz .msg{top:15%}
#ky.hfz .hz-pad{max-width:300px;gap:7px}
#ky.hfz .hz-pad button{height:58px;border-radius:18px}
#ky.hfz .hz-res{width:min(340px,44vw);padding:7px 12px}#ky.hfz .hz-res .big{font-size:22px}
}
@media (max-width:379px){#ky.hfz .card .row2 .kb{font-size:15px;padding-left:8px;padding-right:8px}#ky.hfz .card .hz-seg button{font-size:12px}}
@media (max-height:700px) and (orientation:portrait){#ky.hfz .hz-pad button{height:68px;border-radius:20px}#ky.hfz .hz-pad{gap:8px}}
@media (min-aspect-ratio:11/10){#ky.hfz .mz-bar{align-items:flex-end}#ky.hfz .hz-pad{max-width:min(380px,40vw)}}
`;

/* ============================ müzik ve sesler ============================ */
// Bekleme: Re majör yumuşak bulmaca ezgisi (D – Bm – G – A): vibrafon, elektrikli piyano, fırça, şeyker.
// Giriş: hafif tik-tak, nabız gibi bas; süre azaldıkça hızlanır. Gösterimde müzik susar (notalar net duyulsun).
class HzSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.0; }
  tempo() { return this.mode === 'race' ? 104 + 36 * (this.int || 0) : this.mode === 'idle' ? 96 : 90; }
  swing() { return this.mode === 'race' ? 0 : 0.12; }
  beat(t, s, bar, spb, st = spb / 4) {
    const I = this.int || 0;
    const CH = [[50, [62, 66, 69, 74]], [47, [62, 66, 71, 74]], [43, [62, 67, 71, 74]], [45, [61, 64, 69, 73]]];
    const [root, ch] = CH[bar % 4];
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // giriş: tik-tak, nabız gibi bas, gergin arpej; süre azaldıkça hızlanır ve dolar
      if (s % 4 === 0) this.iKick(t, 0.2 + 0.12 * I, 110, 44, 0.2);
      if (s === 4 || s === 12) this.iRim(t, 0.03 + 0.03 * I);
      if (s % 2 === 0) this.iWood(t, 0.034, s % 4 === 0 ? 1350 : 950);
      if (s % 2 === 1) this.iHat(t, 0.008 + 0.02 * I);
      if (s % 2 === 0) this.iBass(t, root - 12 + (s % 8 === 4 ? 7 : 0), spb * 0.45, 0.075 + 0.03 * I, 'sub');
      if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, 0.009 + 0.006 * I, 900);
      const arp = [0, 2, 1, 3];
      if (s % 2 === 0) this.iMarimba(t, ch[arp[(s >> 1) % 4]] + 12, 0.014 + 0.016 * I, 0.12);
      return;
    }
    const soft = this.mode !== 'idle';
    if (s === 0) { this.iPad(t, ch.map((m) => m - 12), spb * 4, soft ? 0.011 : 0.01, 1000); this.iBass(t, root - 12, spb * 1.8, soft ? 0.08 : 0.1, 'up'); }
    if (s === 8) this.iBass(t, root - 5, spb * 1.4, soft ? 0.06 : 0.08, 'up');
    if (s === 4 || s === 12) this.iBrush(t, soft ? 0.04 : 0.05, 0.2);
    if (s % 2 === 1) this.iShk(t, soft ? 0.006 : 0.009);
    if (s % 4 === 2 && !soft) this.iHat(t, 0.014);
    const arp = [0, 1, 2, 3, 2, 1, 2, 3];
    if (s % 2 === 0) this.iVibe(t, ch[arp[(s >> 1) % 8]] + 12, soft ? 0.016 : 0.022, spb * 0.8, 0.3);
    if (s === 0 || s === 10) ch.forEach((m, i) => this.iEP(t + i * 0.006, m, (soft ? 0.01 : 0.012) * (i ? 0.75 : 1), spb * 1.2, 0.2));
  }
  // renk notası (t: ses saati, c: renk, d: süre)
  note(t, c, d = 0.32, v = 1) {
    const f = NOTE[c];
    this.tone(f, t, d, 'square', 0.05 * v, null, 0.006);
    this.tone(f, t, d * 1.2, 'sine', 0.16 * v, null, 0.006);
    this.tone(f * 2, t, d * 0.5, 'sine', 0.04 * v, null, 0.004);
    this.tone(f / 2, t, d, 'triangle', 0.05 * v, null, 0.01);
  }
  // gösterim dizisini ses saatine göre zamanla (ds: şimdiden saniye, cs: renkler)
  playSeq(ds, cs, per) {
    if (!this.on()) return;
    const t0 = this.k.ctx.currentTime;
    cs.forEach((c, k) => { if (ds[k] >= -0.05) this.note(t0 + Math.max(0, ds[k]) + 0.01, c, Math.min(0.42, per * 0.62)); });
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'tap': this.note(t, a | 0, 0.22, 0.9); break;
      case 'lead': // dikkat: gösterim başlıyor
        [880, 1318].forEach((f, i) => { this.tone(f, t + i * 0.12, 0.18, 'sine', 0.1); this.tone(f * 2, t + i * 0.12, 0.08, 'sine', 0.03); });
        break;
      case 'go': this.duck(0.4, 0.8); [659, 988].forEach((f, i) => this.tone(f, t + i * 0.08, 0.2, 'square', 0.06)); break;
      case 'ok': // diziyi bitirdim
        [523, 659, 784, 1047].forEach((f, i) => { this.tone(f, t + i * 0.07, 0.2, 'triangle', 0.12); this.tone(f * 2, t + i * 0.07, 0.12, 'sine', 0.04); });
        break;
      case 'bad': // yanlış renk
        this.duck(0.3, 1.2);
        this.tone(150, t, 0.42, 'sawtooth', 0.12, 110, 0.004); this.tone(156, t, 0.42, 'square', 0.06, 116, 0.004);
        this.noise(t, 0.2, 0.1, { type: 'bandpass', freq: 500, q: 1.4 });
        break;
      case 'otherok': this.tone(1568, t, 0.12, 'sine', 0.05); break;
      case 'otherbad': this.tone(220, t, 0.14, 'triangle', 0.06, 160, 0.004); break;
      case 'pass': [784, 988, 1175].forEach((f, i) => this.tone(f, t + i * 0.08, 0.3, 'sine', 0.08)); break;
      case 'champ':
        this.duck(0.15, 3);
        [[523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [659, 0.45, 0.5], [784, 0.62, 0.9]].forEach(([f, d, L]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), L, 0.06, 0.15); this.tone(f, t + d, L, 'triangle', 0.06); });
        this.noise(t + 0.62, 1.4, 0.16, { type: 'highpass', freq: 4400 });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// Hafıza cihazı: parlak siyah gövde (üstte dört dilim yuvası), ortada göbek (ekran ayrı doku)
function deviceBase(mb, RD) {
  const B = C('#16161c', -0.85), Bl = C('#2a2a33', -0.85), Bm = C('#101014', -0.15), G = C('#c9a04e', -0.92);
  mb.lathe(0, 0, 0, [[0, 0], [RD + 0.02, 0], [RD + 0.05, 0.015], [RD + 0.055, DEV_H - 0.02], [RD + 0.035, DEV_H], [RD - 0.005, DEV_H], [RD - 0.005, DEV_H], [0, DEV_H - 0.002]], 72, (i) => (i >= 6 ? Bm : i >= 3 ? Bl : B));
  mb.torusN(0, DEV_H - 0.006, 0, RD + 0.045, 0.011, 0.009, 72, 6, G);
  // göbek: yükseltilmiş silindir (üst yüz doku)
  const r = RD * 0.27;
  mb.lathe(0, DEV_H, 0, [[r + 0.02, 0], [r + 0.02, 0.03], [r + 0.005, 0.045], [r, 0.045]], 48, Bl);
  mb.torusN(0, DEV_H + 0.045, 0, r + 0.006, 0.008, 0.006, 48, 6, G);
}
// renkli dilim: kubbeli halka parçası (yuva içinde). Beyaz çizilir, renkle boyanır.
function padModel(mb, RD, a, lit = false) {
  const r0 = RD * 0.33, r1 = RD * 0.93, half = (Math.PI / 4) - 0.075, h = DEV_H + 0.01;
  const W = lit ? [1, 1, 1, 0.9] : [1, 1, 1, -0.6];
  const top = (u, v) => {
    const r = lerp(r0, r1, u), th = a + lerp(-half, half, v);
    const bulge = 0.016 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
    return [Math.cos(th) * r, h + bulge, Math.sin(th) * r];
  };
  const mid = [Math.cos(a) * (r0 + r1) / 2, DEV_H, Math.sin(a) * (r0 + r1) / 2];
  psurf(mb, 10, 14, top, () => W, { cen: [mid[0], h - 1, mid[2]] });
  // dış ve iç kenar duvarları ile iki yan duvar (normaller dilimin ortasından dışa)
  for (const rr of [r0, r1]) psurf(mb, 2, 14, (u, v) => { const th = a + lerp(-half, half, v); return [Math.cos(th) * rr, lerp(DEV_H - 0.004, h, u), Math.sin(th) * rr]; }, () => W, { cen: mid });
  for (const sd of [-1, 1]) {
    const th = a + sd * half;
    psurf(mb, 2, 4, (u, v) => { const r = lerp(r0, r1, v); return [Math.cos(th) * r, lerp(DEV_H - 0.004, h, u), Math.sin(th) * r]; }, () => W, { cen: mid });
  }
}
// ışıma katmanı (katkılı): dilimin üstünde aynı biçim
function padGlow(mb, RD, a) {
  const r0 = RD * 0.33, r1 = RD * 0.93, half = (Math.PI / 4) - 0.075, y = DEV_H + 0.03;
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t0 = a - half + (2 * half * i) / N, t1 = a - half + (2 * half * (i + 1)) / N;
    const P = (r, th) => [Math.cos(th) * r, y, Math.sin(th) * r];
    const ci = [1, 1, 1, 0.75], co = [1, 1, 1, 1];
    mb.d.push(...P(r0, t0), ...ci, ...P(r1, t0), ...co, ...P(r1, t1), ...co, ...P(r0, t0), ...ci, ...P(r1, t1), ...co, ...P(r0, t1), ...ci);
  }
}
function hubTop(tb, RD) {
  const N = 40, y = DEV_H + 0.046, r = RD * 0.27;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    tb.tw([0, y, 0], [Math.cos(a1) * r, y, Math.sin(a1) * r], [Math.cos(a0) * r, y, Math.sin(a0) * r], null, [0, y - 1, 0], [0.5, 0.5, 0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1), 0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)]);
  }
}
// oyuncunun önündeki küçük tuş takımı (koltuk uzayında, oyuncuya dönük): gövde + dört tuş ayrı ağlar
const MINI_OFF = [[1, 1], [-1, 1], [1, -1], [-1, -1]];      // [x, z] (koltuk uzayında; +x oyuncunun solu, +z ileri)
function miniBase(mb) {
  mb.rbox(-0.11, 0, -0.11, 0.11, 0.026, 0.11, 0.016, C('#1c1c22', -0.8), 2);
  mb.rbox(-0.007, 0.024, -0.098, 0.007, 0.03, 0.098, 0.003, C('#0e0e12', -0.6), 1);
  mb.rbox(-0.098, 0.024, -0.007, 0.098, 0.03, 0.007, 0.003, C('#0e0e12', -0.6), 1);
}
function miniKey(mb) { mb.rbox(-0.036, 0, -0.036, 0.036, 0.02, 0.036, 0.009, [1, 1, 1, -0.55], 2); }

/* ============================ dokular ============================ */
// göbek ekranı: büyük sayı/işaret + küçük yazı (big '*' = altın yıldız)
function drawHub(cv, big, small, col) {
  const g = cv.getContext('2d');
  const S = cv.width, c = S / 2;
  g.clearRect(0, 0, S, S);
  const gr = g.createRadialGradient(c, c * 0.8, 10, c, c, c);
  gr.addColorStop(0, '#2c2c36'); gr.addColorStop(1, '#101014');
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
  // ince ızgara (LED paneli dokusu)
  g.globalAlpha = 0.07; g.fillStyle = '#ffffff';
  for (let y = 8; y < S; y += 10) for (let x = 8; x < S; x += 10) if ((x - c) ** 2 + (y - c) ** 2 < (c - 10) ** 2) g.fillRect(x, y, 3, 3);
  g.globalAlpha = 1;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col || '#ffffff';
  g.shadowColor = col || '#ffffff'; g.shadowBlur = 18;
  const y0 = small ? c - 16 : c + 6;
  if (big === '*') {
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 30 : 70; g.lineTo(c + Math.cos(a) * r, y0 + Math.sin(a) * r); }
    g.closePath(); g.fill();
  } else {
    g.font = `900 ${small ? (big.length > 2 ? 96 : 120) : 150}px 'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif`;
    g.fillText(big, c, y0);
  }
  if (small) { g.shadowBlur = 6; g.font = `800 ${small.length > 9 ? 30 : 38}px 'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif`; g.fillStyle = 'rgba(255,255,255,.78)'; g.fillText(small, c, c + 68); }
  g.shadowBlur = 0;
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/* ============================ oyun ============================ */
class MemGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'hfz', cls: 'hfz', title: 'Hafıza Sırası', sub: 'Renkleri izle, aynı sırayla tekrar et', emoji: '🔁', css: STYLE, snd: new HzSnd(), amb: 'diner', ambVol: 0.5, botPx: 230, botPxL: 40, cloth: '#2d2a45', trim: '#ffb3c7', place: false });
    this.lampK = 0.8;
    this.lit = new Float32Array(4);           // cihaz dilimlerinin parlaklığı
    this.miniLit = new Map();                 // koltuk → [4] tuş parlaklığı
    this.taps = [];                           // { i, c, at } karakter basma animasyonları
    this.mySeq = null;                        // gösterimde görülen dizi (kendi anlık geri bildirimim için)
    this.myTaps = 0;
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.miniBase = this.mk(miniBase);
    W.miniKey = this.mk(miniKey);
    W.trophy = this.mk(trophyModel);
    this.hubCv = document.createElement('canvas');
    this.hubCv.width = 256; this.hubCv.height = 256;
    this.hubKey = '';
    this.hubTex = makeTexture(this.X, this.hubCv);
    this.devKey = '';
  }
  freeTex() { if (this.hubTex && this.X) this.X.gl.deleteTexture(this.hubTex); this.hubTex = null; }
  get RD() {
    const n = Math.max(1, this.seats.length);
    let minR = 9;
    for (let i = 0; i < n; i++) minR = Math.min(minR, this.rAt(this.seatAngle(i), this.R));
    return clamp(Math.min(this.R * Math.min(1, this.kz) * 0.62, minR - 0.75), 0.6, 1.5);
  }
  ensureDevice() {
    if (!this.W) return;
    const RD = this.RD;
    const key = RD.toFixed(3);
    if (key === this.devKey) return;
    this.devKey = key;
    ['dBase', 'dHub', 'pads', 'padsE', 'glows'].forEach((k) => { const o = this.W[k]; if (!o) return; if (Array.isArray(o)) o.forEach((x) => E.freeMesh(this.X, x)); else E.freeMesh(this.X, o); });
    this.W.dBase = this.mk((mb) => deviceBase(mb, RD));
    this.W.dHub = this.mk((tb) => hubTop(tb, RD), 'tex');
    this.W.pads = PAD_A.map((a) => this.mk((mb) => padModel(mb, RD, a)));
    this.W.padsE = PAD_A.map((a) => this.mk((mb) => padModel(mb, RD, a, true)));
    this.W.glows = PAD_A.map((a) => this.mk((mb) => padGlow(mb, RD, a), 'un'));
  }
  padPos(c) { const r = this.RD * 0.63; return [Math.cos(PAD_A[c]) * r, TABLE_Y + DEV_H + 0.03, Math.sin(PAD_A[c]) * r]; }
  // koltuktaki küçük tuş takımının dünya dönüşümü
  miniMat(a, m) {
    const p = a.pos, yaw = a.yaw;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    // koltuk uzayı (0, TABLE_Y, MINI_Z) → dünya
    const x = p[0] + s * MINI_Z, z = p[2] + c * MINI_Z;
    M.set(m, x, TABLE_Y + 0.002, z, yaw, 0, 0, 1);
    return m;
  }
  // işaret parmağının ucu tuş takımında (kx, kz) noktasına (tuş yüzünden lift yukarıda) gelsin diye bilek nerede durmalı
  // (koltuk uzayı; j: 0 sağ el, 1 sol el — işaret parmağı bileğin başparmak tarafında ~0,03 kayık)
  wristFor(kx, kz, j, lift) {
    const ix = j ? -0.027 : 0.027;
    return [kx - ix, TABLE_Y + 0.002 + KEY_TOP + lift - FDN[1] * FING + 0.018, kz - FDN[2] * FING];
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onDown = (e) => {
      const b = e.target.closest('[data-c]');
      if (!b || !this.el.bar.contains(b)) return;
      e.preventDefault();
      this.tap(+b.dataset.c);
    };
    this.el.bar.addEventListener('pointerdown', onDown);
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'hz-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'hz-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('start', { m: this.view?.mode || 'normal' }); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.onKey = (e) => {
      if (this.dead || e.repeat || (e.target && /input|textarea|select/i.test(e.target.tagName || ''))) return;
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, q: 0, w: 1, a: 2, s: 3, ArrowUp: 0, ArrowRight: 1, ArrowLeft: 2, ArrowDown: 3 };
      const k = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (k != null && this.canTap()) { e.preventDefault(); this.tap(k); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  canTap() { const v = this.view; return !!v && v.phase === 'input' && v.amAlive && !v.myDone && !v.myFailed && !this.localFail && !this.localDone; }
  tap(c) {
    if (!this.canTap()) return;
    const v = this.view;
    const k = this.myTaps;
    const S = this.snd, fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const seqOk = this.mySeq && this.mySeq.length === v.length;
    const wrong = seqOk && this.mySeq[k] !== c;
    if (wrong) { fx('bad'); vibrate([60, 40, 90]); this.localFail = true; this.flash('rgba(230,40,30,.5)'); }
    else {
      fx('tap', c); vibrate(12);
      this.myTaps = k + 1;
      if (seqOk && this.myTaps === v.length) { this.localDone = true; setTimeout(() => { try { if (!this.dead) this.snd.fx('ok'); } catch { /* yok */ } }, 160); this.flash('rgba(90,240,140,.4)'); }
    }
    this.btnLit(c, 0.22);
    this.devTap = { c, at: this.time, bad: wrong };
    if (v.me >= 0) {
      this.taps.push({ i: v.me, c, at: this.time, mine: true });
      if (wrong) this.taps.push({ i: v.me, c: -2, at: this.time + 0.12 });
    }
    this.ctx.send('tap', { c });
    this.bar();
  }
  // ekrandaki tuşu kısa süre yak
  btnLit(c, d) { this.btnUntil = this.btnUntil || [0, 0, 0, 0]; this.btnUntil[c] = performance.now() + d * 1000; }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.hfz !== '1') { root.dataset.hfz = '1'; root.innerHTML = '<p class="py-16 text-center">🔁</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // başkalarının basışları (ilerleme arttı) ve sonuçları
    if (v.phase === 'input' && prev && prev.phase === 'input' && prev.round === v.round) {
      v.seats.forEach((p, i) => {
        const q = (prev.seats || []).find((x) => x.id === p.id);
        if (!q || i === v.me) return;
        // başkalarının bastığı renk gösterilmez (kopya çekilmesin): rastgele bir tuş beyaz yanar
        for (let k = q.p; k < p.p; k++) this.taps.push({ i, c: -1, at: this.time + (k - q.p) * 0.12, f: Math.floor(Math.random() * 4) });
        if (p.st === 1 && q.st !== 1) { try { this.snd.fx('otherok'); } catch { /* yok */ } }
        if (p.st === 2 && q.st !== 2) {
          try { this.snd.fx('otherbad'); } catch { /* yok */ }
          this.taps.push({ i, c: -1, at: this.time, f: Math.floor(Math.random() * 4) }, { i, c: -2, at: this.time + 0.12 });
        }
      });
    }
    if (v.phase === 'input' && v.myFailed && !this.localFail) { this.localFail = true; try { this.snd.fx('bad'); } catch { /* yok */ } }
    if (v.phase === 'input' && v.myDone && !this.localDone) { this.localDone = true; }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } this.trophies = []; }
    if (v.phase === 'show') {
      this.mySeq = v.sequence ? v.sequence.slice() : null;
      this.myTaps = 0; this.localFail = false; this.localDone = false;
      this.trophies = [];
      try { S.music('mute'); } catch { /* yok */ }
      const now = this.ctx.serverNow();
      const t0 = v.showAt + (v.leadMs || 900);
      if (now < t0 + 300) { fx('lead'); this.msg(`${v.round}. TUR`, 'mid'); }
      try { S.playSeq(v.sequence.map((c, k) => (t0 + k * v.perMs - now) / 1000), v.sequence, v.perMs / 1000); } catch { /* yok */ }
    }
    if (v.phase === 'input') {
      try { S.music('race'); } catch { /* yok */ }
      if (this.ctx.serverNow() < v.endsAt - v.ms + 1500) { fx('go'); if (v.amAlive) { this.msg('SIRA SENDE!', 'mid gold'); vibrate(30); } }
      this.myTaps = v.myProgress || 0;
    }
    if (v.phase === 'result') {
      try { S.music('calm'); } catch { /* yok */ }
      const fresh = !prev || prev.phase === 'input';
      if (fresh) {
        const meOut = (v.out || []).includes(v.me);
        if (meOut) { fx('trombone'); vibrate([80, 50, 160]); }
        else if (v.amAlive && v.me >= 0) fx('pass');
        (v.out || []).forEach((k) => { const a = this.avatarAt(k); if (a) this.burst(a.headW[0], a.headW[1] + 0.1, a.headW[2], 12, [[0.55, 0.52, 0.6], [0.8, 0.78, 0.85]], 1.1, 0.05, false, 0.9, 2); });
      }
      this.resAt = this.time;
    }
    if (v.phase === 'final') {
      try { S.music('idle'); } catch { /* yok */ }
      const late = this.ctx.serverNow() - (v.finAt || 0) > 2500;
      const k = (v.winners || [])[0] ?? -1;
      this.champK = k;
      // her kazananın önüne bir kupa düşer (berabere biterse sırayla)
      this.trophies = (v.winners || []).map((w, n) => {
        const a = this.seatAngle(w), r = this.rAt(a, this.R) - 0.3;
        return { k: w, t: late ? 9 : -0.35 * n, x: Math.cos(a) * r + Math.sin(a) * 0.3, z: Math.sin(a) * r - Math.cos(a) * 0.3, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), landed: late };
      });
      if (!late) {
        const mine = (v.winners || []).includes(v.me);
        fx('champ');
        if (mine) { this.flash('rgba(255,215,90,.6)', true); vibrate([60, 40, 60, 40, 160]); }
        const ws = (v.winners || []).map((i) => v.seats[i]?.n || '');
        this.msg(ws.length === 1 ? (mine ? '👑 KAZANDIN!' : `👑 ${esc(ws[0].replace(/ 🤖$/, '').toLocaleUpperCase('tr'))}`) : '🤝 BERABERE!', 'mid gold');
      }
      this.finT = this.time;
    }
  }

  /* ---------- gösterim zamanı ---------- */
  // şu an cihazda yanan renk (yoksa -1) ve kaçıncı adım
  showNow() {
    const v = this.view;
    if (!v || v.phase !== 'show' || !v.sequence) return [-1, -1, 0];
    const t = this.ctx.serverNow() - v.showAt - (v.leadMs || 900);
    if (t < 0) return [-1, -1, 0];
    const k = Math.floor(t / v.perMs);
    if (k >= v.sequence.length) return [-1, k, 0];
    const u = (t - k * v.perMs) / v.perMs;
    return u < 0.68 ? [v.sequence[k], k, 1 - u / 0.68] : [-1, k, 0];
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, n = Math.max(1, this.seats.length);
    const cam = [this.cam.ex, this.cam.ey, this.cam.ez];
    const dev = [0, TABLE_Y + DEV_H, 0];
    const [lc] = this.showNow();
    const look = lc >= 0 ? this.padPos(lc) : dev;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null };
      const S = a.idle;
      const out = !p.al && v.phase !== 'intro' && v.game;
      if (v.phase === 'show') {
        if (out) { a.pose('lean', { t }); a.expr = 'smile'; a.look = look; return; }
        a.pose(hs(i, 2) < 0.5 ? 'chin' : 'clasp', { t }); a.expr = 'tense'; a.look = look;
        return;
      }
      if (v.phase === 'input') {
        if (out) { a.pose('lean', { t }); a.expr = 'smile'; a.look = this.avatarAt((i + 1) % n)?.headW || dev; return; }
        if (p.st === 1 || (i === v.me && this.localDone)) { a.pose('lean', { t }); a.expr = 'grin'; a.look = cam; return; }
        if (p.st === 2 || (i === v.me && this.localFail)) { a.pose('facepalm', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
        // tuşlara basıyor: iki el tuşların üstünde bekler, basılan tuşa o taraftaki elin işaret parmağı iner
        const tp = this.taps.filter((q) => q.i === i && q.c >= -1 && t - q.at < 0.3 && t >= q.at).pop();
        // gövde fazla eğilmez, baş hafif öne bakar (büyük çizgi film başı ellere girmesin)
        a.pose('rest', { t });
        a.tgt.lean = 0.1;
        a.k = 20;
        for (let j = 0; j < 2; j++) {
          const sx = j ? 1 : -1;
          a.tgt.hand[j] = this.wristFor(sx * MINI_D, MINI_Z - MINI_D * 0.3, j, 0.05);
          a.tgt.fdir[j] = FDIR.slice(); a.tgt.palm[j] = [sx * 0.15, -1, 0.25]; a.tgt.fw[j] = 1;
          a.tgt.pole[j] = [sx * 0.8, -0.6, -0.25];
          a.shape[j] = 'point';
        }
        if (tp) {
          const c = tp.c >= 0 ? tp.c : tp.f;
          const [ox, oz] = MINI_OFF[c];
          const j = ox > 0 ? 1 : 0;
          const u = (t - tp.at) / 0.3, dip = Math.sin(Math.PI * clamp(u * 1.2, 0, 1));
          a.tgt.hand[j] = this.wristFor(ox * MINI_D, MINI_Z + oz * MINI_D, j, 0.035 * (1 - dip) + 0.002 * dip);
          a.tgt.hy = ox > 0 ? 0.12 : -0.12;
        } else a.tgt.hy *= 0.9;
        const left = (v.endsAt - this.ctx.serverNow()) / Math.max(1, v.ms);
        a.expr = left < 0.3 ? 'wince' : 'tense';
        a.look = null;
        a.tgt.hp = 0.3;
        return;
      }
      if (v.phase === 'result') {
        const u = this.time - (this.resAt || 0);
        const gone = (v.out || []).includes(i);
        if (gone) { a.pose(u < 1.5 ? 'headgrab' : 'slump', { t }); a.expr = u < 1.5 ? 'o' : 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
        if (p.al) { a.pose(u < 2 ? 'cheer' : 'rest', { t }); a.expr = u < 2 ? 'laugh' : 'grin'; a.look = cam; return; }
        a.pose('lean', { t }); a.expr = 'smile'; a.look = dev;
        return;
      }
      if (v.phase === 'final') {
        const win = (v.winners || []).includes(i);
        const u = this.time - (this.finT || 0);
        const w = this.champK >= 0 ? this.avatarAt(this.champK) : null;
        if (win) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = cam; }
        else { a.pose(Math.floor(u / 2.6 + i) % 3 === 0 ? 'rest' : 'clap', { t }); a.expr = 'grin'; a.look = w ? w.headW : dev; }
        return;
      }
      // giriş
      S.mt -= dt;
      if (S.mt <= 0) { S.mood = Math.random() < 0.55 ? 'rest' : 'chin'; S.mt = 5 + Math.random() * 7; }
      S.lt -= dt;
      if (S.lt <= 0) {
        S.lt = 1.8 + Math.random() * 3.5;
        const r = Math.random();
        const nb = this.avatarAt((i + (r < 0.5 ? 1 : n - 1)) % n);
        S.look = r < 0.65 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? dev : cam;
        a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
      }
      if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = cam; }
      else { a.pose(S.mood, { t }); a.look = S.look; }
    });
    this.taps = this.taps.filter((q) => t - q.at < 1);
  }
  avTint(a, i) {
    const v = this.view, p = v?.seats?.[i];
    const want = p && v.game && v.phase !== 'intro' && !p.al && !(v.phase === 'final' && (v.winners || []).includes(i)) ? 0.62 : 1;
    a.dimK = damp(a.dimK ?? 1, want, 3, 0.016);
    return a.dimK;
  }

  /* ---------- kamera ve ışıklar ---------- */
  tick(dt) {
    if (this.X && this.W) this.ensureDevice();
    const v = this.view, c = this.cam;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    // cihazın dilimleri: gösterimde sırayla, girişte benim basışlarım
    const [lc, , lk] = this.showNow();
    const dtp = v.phase === 'input' && this.devTap && this.time - this.devTap.at < 0.22 ? this.devTap : null;
    for (let q = 0; q < 4; q++) {
      let want = q === lc ? 0.35 + 0.65 * lk : 0;
      if (v.phase === 'intro' || v.phase === 'final') want = 0.3 + 0.4 * Math.max(0, Math.sin(this.time * 2.2 - q * 1.57)) ** 2;
      // girişte kendi basışım ortadaki cihazda da yanar (yalnız benim ekranımda)
      if (dtp && dtp.c === q && !dtp.bad) want = 0.85;
      this.lit[q] = want > this.lit[q] ? want : damp(this.lit[q], want, 9, dt);
    }
    // ekrandaki tuşlar gösterimle birlikte yanar
    const btns = this.el.bar.querySelectorAll('.hz-pad button');
    if (btns.length) {
      const nowp = performance.now();
      btns.forEach((b, q) => { const on = q === lc || (this.btnUntil && this.btnUntil[q] > nowp); if (b._lit !== on) { b._lit = on; b.classList.toggle('lit', on); } });
    }
    // gösterim adımlarında karakterler başlarıyla takip eder; cihazda kıvılcım
    if (lc >= 0 && lc !== this.lastLc) { const p = this.padPos(lc); this.burst(p[0], p[1] + 0.02, p[2], 8, [hexRGB(COLS[lc]), [1, 1, 1]], 0.8, 0.03, true, 0.35, 2); }
    this.lastLc = lc;
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0;
    let bp = 230;
    if (v.phase === 'show') { zoom = 0.78; pa = 0.16; bp = 230; }
    else if (v.phase === 'input') {
      const left = clamp((v.endsAt - sNow) / Math.max(1, v.ms), 0, 1);
      zoom = lerp(0.92, 0.98, left); pa = 0.04; bp = 230;
      if (this.snd) this.snd.int = 1 - left;
    } else if (v.phase === 'result') { zoom = 0.95; pa = 0.02; bp = 150; }
    else if (v.phase === 'final' && this.champK >= 0) {
      const a = this.avatarAt(this.champK);
      bp = 120;
      if (a) {
        const card = this.finCard();
        yaw = -Math.PI / 2 - this.seatAngle(this.champK);
        zoom = card ? 0.62 : 0.52; pa = -0.34;
        const f = this.aimAt(a.headW, land && card ? 0.3 : 0.5, land ? 0.4 : card ? 0.2 : 0.4, yaw, pa);
        fx = f[0]; fy = f[1]; fz = f[2];
      }
    } else { yaw = Math.sin(this.time * 0.13) * 0.06; bp = 290; }
    if (v.phase !== 'input' && this.snd) this.snd.int = 0;
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    if (land && v.phase !== 'final') {
      if (this.cfg.botPxL !== 34) { this.cfg.botPxL = 34; this.fitKey = ''; }
      const f = this.aimAt([0, 0.7, 0], 0.38, 0.5, yaw, pa); fx = f[0]; fy = f[1]; fz = f[2];
    }
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.4, dt);
    c.fx = fx; c.fz = fz; c.fy = fy;
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    this.stepTrophy(dt);
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  finCard() { const v = this.view; return !!v && v.phase === 'final' && this.ctx.serverNow() - (v.finAt || 0) >= 2600; }
  stepTrophy(dt) {
    for (const T of this.trophies || []) {
      T.t += dt;
      if (!T.landed && T.t >= 0.9) {
        T.landed = true;
        try { this.snd.fx('thud'); } catch { /* yok */ }
        this.cam.shake = Math.max(this.cam.shake, 0.22);
        const a = this.avatarAt(T.k);
        const CF = [[1, 0.82, 0.25], [1, 0.35, 0.4], [0.3, 0.86, 0.45], [0.3, 0.66, 1], [0.78, 0.5, 1]];
        if (a) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, CF, 2.6, 0.04, false, 2.2, 2.2);
      }
    }
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W;
    if (!Wd || !Wd.dBase) return;
    const m = this.mats.b, T = this.T, v = this.view;
    M.set(m, 0, TABLE_Y, 0);
    D(Wd.dBase, m, T.obj);
    const tint = this.pT || (this.pT = new Float32Array(3));
    for (let q = 0; q < 4; q++) {
      const base = DIM_RGB[q], hi = COLS_RGB[q];
      const k = this.lit[q];
      M.set(m, 0, TABLE_Y + (k > 0.5 ? -0.004 : 0), 0);
      if (k > 0.04 && !shadow) {
        // yanan dilim: ışık saçar (gölgelenmez), parlaklığı k ile
        tint[0] = lerp(base[0] * 1.6, hi[0] * 1.25, k); tint[1] = lerp(base[1] * 1.6, hi[1] * 1.25, k); tint[2] = lerp(base[2] * 1.6, hi[2] * 1.25, k);
        D(Wd.padsE[q], m, tint, 1, 1);
      } else {
        tint[0] = base[0]; tint[1] = base[1]; tint[2] = base[2];
        D(Wd.pads[q], m, tint);
      }
    }
    // oyuncuların küçük tuş takımları
    if (v && v.game && !shadow) {
      const mm = this.mats.c, km = this.kM || (this.kM = M.make()), tmp = this.kT || (this.kT = M.make());
      const now = this.time;
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        this.miniMat(a, mm);
        D(Wd.miniBase, mm, p.al ? T.obj : GREY3);
        const taps = this.taps.filter((q) => q.i === i && now - q.at < 0.3 && now >= q.at);
        const bad = this.taps.some((tp) => tp.i === i && tp.c === -2 && now >= tp.at && now - tp.at < 0.7);
        for (let q = 0; q < 4; q++) {
          const [ox, oz] = MINI_OFF[q];
          // kendi basışım gerçek renginde, başkalarınınki beyaz (renk belli olmasın)
          let k = 0, white = false;
          for (const tp of taps) {
            if (tp.c === q) k = 1;
            else if (tp.c === -1 && tp.f === q) { k = 1; white = true; }
          }
          const base = p.al ? DIM_RGB[q] : OFF_RGB, hi = white ? WHITE3 : COLS_RGB[q];
          const pulse = bad ? 0.6 + 0.4 * Math.sin(now * 30) : 0;
          tint[0] = bad ? 0.9 + 0.6 * pulse : lerp(base[0], hi[0] * 1.6, k);
          tint[1] = bad ? 0.16 : lerp(base[1], hi[1] * 1.6, k);
          tint[2] = bad ? 0.12 : lerp(base[2], hi[2] * 1.6, k);
          M.set(tmp, ox * MINI_D, 0.024 - k * 0.007, oz * MINI_D);
          M.mul(km, mm, tmp);
          D(Wd.miniKey, km, tint);
        }
      });
    }
    // şampiyon kupaları (yukarıdan düşüp sekerek oturur)
    for (const Tr of this.trophies || []) {
      if (Tr.t < 0) continue;
      const p = clamp(Tr.t / 0.9, 0, 1);
      const y = TABLE_Y + 0.004 + (Tr.landed ? Math.max(0, Math.sin((Tr.t - 0.9) * 14) * 0.03 * Math.exp(-(Tr.t - 0.9) * 6)) : (1 - p * p) * 1.6);
      M.set(m, Tr.x, y, Tr.z, Tr.yaw + (Tr.landed ? 0 : (1 - p) * 4), 0, 0, 1.15);
      D(Wd.trophy, m, T.obj);
    }
  }
  drawTex(F, L) {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.dHub || !this.hubTex) return;
    let big = '?', small = 'HAFIZA', col = '#ffffff';
    if (v && v.phase === 'show') {
      const [lc, k] = this.showNow();
      // gösterimde: kaçıncı renkteyiz (1/5, 2/5 ...) yanan rengin ışığıyla
      big = k >= 0 && k < v.length ? String(k + 1) : String(v.length);
      small = k >= 0 && k < v.length ? `/ ${v.length}` : 'RENK';
      if (lc >= 0) col = COLS[lc];
    } else if (v && v.phase === 'input') { big = String(v.length); small = 'SIRA SİZDE'; col = '#ffd23f'; }
    else if (v && v.phase === 'result') { big = String(v.aliveCount); small = 'KİŞİ KALDI'; col = '#5cf08a'; }
    else if (v && v.phase === 'final') { big = '*'; small = 'ŞAMPİYON'; col = '#ffd23f'; }
    const key = big + '|' + small + '|' + col;
    if (key !== this.hubKey) { this.hubKey = key; drawHub(this.hubCv, big, small, col); updateTexture(X, this.hubTex, this.hubCv); }
    const m = this.mats.b;
    gl.uniform1f(X.tex.u.uSelf, 0.9);
    gl.bindTexture(gl.TEXTURE_2D, this.hubTex);
    M.set(m, 0, TABLE_Y, 0);
    drawMesh(X, Wd.dHub, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  drawFx(F, m) {
    const X = this.X, Wd = this.W, v = this.view;
    if (!Wd || !Wd.glows) return;
    // yanan dilimlerin ışıması + masaya vuran renkli ışık
    for (let q = 0; q < 4; q++) {
      const k = this.lit[q];
      if (k < 0.02) continue;
      M.set(m, 0, TABLE_Y, 0);
      drawMesh(X, Wd.glows[q], m, COLS_RGB[q], 0.75 * k);
      const p = this.padPos(q);
      M.set(m, p[0] * 1.3, TABLE_Y + 0.006, p[2] * 1.3, 0, 0, 0, 1.3 * this.RD, 1, 1.3 * this.RD);
      drawMesh(X, this.res.glow, m, COLS_RGB[q], 0.32 * k);
    }
    if (!v) return;
    // girişte bitirenin koltuğu yeşil, elenenin kırmızı yanar
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      let al = 0, col = [0.3, 1, 0.5];
      if (v.phase === 'input' && p.st === 1) al = 0.45;
      else if (v.phase === 'input' && p.st === 2) { al = 0.45; col = [1, 0.3, 0.25]; }
      else if (v.phase === 'final' && (v.winners || []).includes(i)) { al = 0.7 + 0.2 * Math.sin(this.time * 5); col = [1, 0.85, 0.35]; }
      else if (i === this.me && v.phase === 'input' && p.al) { al = 0.3; col = [1, 0.85, 0.4]; }
      if (al <= 0) return;
      M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 0.95, 1, 0.95);
      drawMesh(X, this.res.glow, m, col, al * 0.6);
    });
  }

  /* ---------- arayüz ---------- */
  // Alt çubuk iki parçadır: durum satırı (yerinde güncellenir) + renk tuşları. Tuşlar yalnız aç/kapa değişince yeniden kurulur,
  // böylece hızlı basarken parmağın altındaki düğme değişmez.
  bar() {
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    const me = v.me >= 0 ? v.seats[v.me] : null;
    const alive = !!(me && me.al);
    let padMode = 'none', st = '', cls = '', res = '';
    if (v.phase === 'show') {
      padMode = alive ? 'off' : 'none';
      cls = 'watch';
      st = v.me < 0 ? `👀 İzliyorsun <i>·</i> ${v.length} renk` : alive ? `👀 İzle ve aklında tut <i>·</i> ${v.length} renk` : '👀 Elendin, izliyorsun';
    } else if (v.phase === 'input') {
      const prog = Math.max(this.myTaps, v.myProgress || 0);
      const fail = v.myFailed || this.localFail, done = v.myDone || this.localDone;
      if (!v.amAlive) { cls = 'watch'; st = `${v.me < 0 ? '👀 İzliyorsun' : '👀 Elendin, izliyorsun'} <i>·</i> ${v.doneCount}/${v.aliveCount} bitirdi`; }
      else if (fail) { padMode = 'off'; cls = 'bad'; st = '❌ Yanlış renk! Bu turda eleniyorsun'; }
      else if (done) { padMode = 'off'; cls = 'ok'; st = `✅ Tamam! Diğerleri bekleniyor <i>·</i> ${v.doneCount}/${v.aliveCount}`; }
      else {
        padMode = 'on';
        const dots = Array.from({ length: v.length }, (_, k) => (k < prog ? '●' : '○')).join('');
        st = `<span class="dots">${dots}</span> <i>·</i> ⏱ <b data-cd>${Math.max(0, Math.ceil((v.endsAt - sNow) / 1000))}</b>`;
      }
    } else if (v.phase === 'result') {
      const outs = (v.out || []).map((k) => esc(v.seats[k]?.n || ''));
      const meOut = (v.out || []).includes(v.me);
      const tie = v.last && v.aliveCount > 1;
      let rc = '', big = '', q = '';
      if (v.me < 0 || (!v.amAlive && !meOut)) {
        big = v.allFail ? '😵 Herkes yanıldı!' : outs.length ? `💥 ${outs.length} kişi elendi` : '🎯 Herkes geçti!';
        q = v.allFail ? 'En uzağa giden kazanır' : outs.length ? outs.join(', ') : `${v.aliveCount} kişi devam ediyor`;
      } else if (meOut) { rc = 'out'; big = '💥 Elendin'; q = v.allFail ? 'Herkes yanıldı, en uzağa giden kazandı' : `${v.length} renklik dizide takıldın`; }
      else if (v.allFail) { rc = 'win'; big = tie ? '🤝 Berabere!' : '🏆 En uzağa sen gittin!'; q = 'Herkes yanıldı ama sen en çok rengi bildin'; }
      else { rc = 'win'; big = v.last ? '🏆 Son kalan sensin!' : '🎯 Turu geçtin!'; q = outs.length ? `Elenenler: ${outs.join(', ')}` : 'Herkes geçti, dizi uzuyor!'; }
      res = `<div class="hz-res ${rc}"><div class="big">${big}</div><div class="q">${q}</div></div>`;
    }
    const key = `${v.phase}|${v.game}|${v.round}|${padMode}|${res}|${!!st}`;
    if (this.setBar(key, res || `<div class="hz-st" data-st></div>${padMode === 'none' ? '' : `<div class="hz-pad ${padMode === 'on' ? 'on' : ''}" aria-disabled="${padMode === 'on' ? 'false' : 'true'}" role="group" aria-label="Renk tuşları">${COLS.map((c, q) => `<button data-c="${q}" style="--c:${c}" aria-label="${NAMES[q]}"></button>`).join('')}</div>`}`)) {
      this.stEl = this.el.bar.querySelector('[data-st]');
      this.stHtml = null;
      this.cdB = null;
    }
    const sEl = this.stEl;
    if (sEl && !res) {
      if (!st) sEl.style.display = 'none';
      else {
        sEl.style.display = '';
        const sk = st.replace(/<b data-cd>\d+<\/b>/, '<b data-cd></b>') + '|' + cls;
        if (sk !== this.stHtml) {
          this.stHtml = sk;
          sEl.className = `hz-st ${cls}`;
          sEl.innerHTML = st;
          this.cdB = sEl.querySelector('[data-cd]');
        }
      }
    }
  }
  modeSeg(v) {
    return `<div class="hz-seg" role="group" aria-label="Hız"><button data-act="hz-mode" data-m="normal" class="${v.mode !== 'hizli' ? 'on' : ''}">🧠 Normal</button><button data-act="hz-mode" data-m="hizli" class="${v.mode === 'hizli' ? 'on' : ''}">⚡ Hızlı gösterim</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n >= 2}`;
      html = `<div class="card hz-in">
        <div class="tt">🔁 Hafıza Sırası</div>
        <div class="sub">Cihazın çaldığı renkleri aynı sırayla tekrar et!</div>
        <div class="hz-ru"><div class="r"><b>👀</b>Renkler sırayla yanar</div><div class="b"><b>👆</b>Aynı sırayla bas</div><div class="g"><b>➕</b>Her tur dizi uzar (5. turdan sonra iki renk), yanılan elenir</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="hz-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'Oynamak için masada en az 2 kişi lazım. Oda kodunu paylaş!' : 'Masadaki herkes başlatabilir.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.finCard()) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const sb = v.scoreboard || [];
      const meId = v.seats[v.me]?.id;
      const ws = (v.winners || []).map((i) => v.seats[i]).filter(Boolean);
      const mine = ws.some((p) => p.id === meId);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}|${sb.map((s) => s.id + s.score).join(',')}`;
      const tt = !ws.length ? 'Oyun bitti!' : ws.length > 1 ? `🤝 Berabere: ${ws.map((p) => esc(p.n)).join(', ')}` : `🏆 ${mine ? 'Kazandın!' : `${esc(ws[0].n)} kazandı!`}`;
      const list = sb.map((s) => ({ id: s.id, nickname: s.nickname, c: s.c, tag: `${s.score} tur` }));
      const rest = list.slice(3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${k + 4}. ${esc(s.nickname)} <b>${esc(s.tag)}</b></span>`).join('');
      const top3 = list.slice(0, 3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${['🥇', '🥈', '🥉'][k]} ${esc(s.nickname)} <b>${esc(s.tag)}</b></span>`).join('');
      html = `<div class="card">
        <div class="tt">${tt}</div>
        <div class="sub">${v.allFail ? `${v.length || 0} renklik dizide herkes yanıldı, en uzağa giden kazandı` : `Son dizi ${v.length || 0} renkti`}</div>
        ${podium(list, meId)}
        <div class="hz-rest hz-top3">${top3}</div>
        ${rest ? `<div class="hz-rest">${rest}</div>` : ''}
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="hz-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    if (v.phase === 'input' && this.cdB) {
      const left = Math.max(0, Math.ceil((v.endsAt - sNow) / 1000));
      const s = String(left);
      if (this.cdB.textContent !== s) this.cdB.textContent = s;
      this.cdB.classList.toggle('hot', left <= 4);
      if (left <= 3 && left >= 1 && left !== this.lastTickS && this.canTap()) { this.lastTickS = left; try { this.snd.fx('tick', 0.3); } catch { /* yok */ } }
    }
    // üst bilgi
    let top = '';
    if (v.phase === 'show' || v.phase === 'input' || v.phase === 'result') top = `${v.round}. tur · ${v.length} renk · ${v.aliveCount} kişi kaldı`;
    this.top(top);
    // etiketler: girişte ilerleme / bitti / yanıldı; elenenler soluk
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      const out = !!(v.game && !p.al && v.phase !== 'intro' && !(v.phase === 'final' && (v.winners || []).includes(i)));
      if (v.phase === 'input' && p.al) x = p.st === 1 ? '<span class="hz-ok">✓</span>' : p.st === 2 ? '<span class="hz-no">✖</span>' : `<span class="hz-p">${i === v.me ? Math.max(this.myTaps, p.p) : p.p}/${v.length}</span>`;
      else if (out) x = '💀';
      else if (v.phase === 'final' && (v.winners || []).includes(i)) x = '👑';
      const k = x + '|' + out;
      if (o.hzK !== k) {
        o.hzK = k;
        let el = o.lbl.querySelector('.hz-x');
        if (!el) { el = document.createElement('span'); el.className = 'hz-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lbl.classList.toggle('out', out);
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.hz-x')) o.hzK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const cx = w / 2, cy = h * 0.46, R = r * 0.42;
    g.fillStyle = '#16161c'; g.beginPath(); g.arc(cx, cy, R * 1.05, 0, TAU); g.fill();
    for (let q = 0; q < 4; q++) {
      const a = PAD_A[q];
      const k = this.lit[q];
      g.fillStyle = k > 0.3 ? COLS[q] : FLAT_DIM[q];
      g.beginPath(); g.arc(cx, cy, R * 0.93, a - 0.7, a + 0.7); g.arc(cx, cy, R * 0.33, a + 0.7, a - 0.7, true); g.closePath(); g.fill();
    }
    g.fillStyle = '#26262e'; g.beginPath(); g.arc(cx, cy, R * 0.27, 0, TAU); g.fill();
    const v = this.view;
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (v && v.length) {
      const [, k] = this.showNow();
      const txt = v.phase === 'show' && k >= 0 && k < v.length ? `${k + 1}/${v.length}` : String(v.length);
      g.font = `900 ${Math.round(R * (txt.length > 2 ? 0.19 : 0.3))}px system-ui`;
      g.fillText(txt, cx, cy);
    }
    if (v && v.phase === 'input') this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.font = '800 12px system-ui'; g.fillStyle = p.st === 1 ? '#5cf08a' : p.st === 2 ? '#ff6b5a' : '#fff';
      if (p.al) g.fillText(p.st === 1 ? '✓' : p.st === 2 ? '✖' : `${p.p}/${v.length}`, x, y - 34);
    });
  }
  onDispose() { this.freeTex(); window.removeEventListener('keydown', this.onKey); }
}

// podyum (ilk üç; alt yazı serbest)
function podium(list, meId) {
  const top = list.slice(0, 3);
  if (top.length < 2) return '';
  const H = [84, 60, 44];
  const cols = [1, 0, 2].filter((i) => top[i]).map((i) => {
    const s = top[i];
    const ini = esc((Array.from(String(s.nickname || '?').trim())[0] || '?').toLocaleUpperCase('tr'));
    return `<div class="pd-c p${i + 1}${s.id === meId ? ' me' : ''}" style="--c:${pcol(s.c)}">${i === 0 ? '<div class="pd-crown">👑</div>' : ''}<div class="pd-av">${ini}</div><div class="pd-nm">${esc(s.nickname)}</div><div class="pd-b" style="height:${H[i]}px"><b>${i + 1}</b><span>${esc(String(s.tag))}</span></div></div>`;
  }).join('');
  const CF = ['#ffd23f', '#ff5a6e', '#3fdc6a', '#4aa8ff', '#c77dff', '#ff9f1c'];
  const conf = Array.from({ length: 26 }, (_, k) => `<i style="--x:${(k * 37 + 5) % 100}%;--d:${((k % 7) * 0.31).toFixed(2)}s;--t:${(2.4 + (k % 5) * 0.35).toFixed(2)}s;--r:${(k * 47) % 360}deg;--h:${CF[k % 6]}"></i>`).join('');
  return `<div class="pd"><div class="pd-cf">${conf}</div>${cols}</div>`;
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new MemGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[hfz]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
