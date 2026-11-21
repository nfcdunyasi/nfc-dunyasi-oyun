// Taş Kağıt Makas — 3D restoran masası (NFC Dünyası Oyun)
// Herkes yuvarlak masada oturur ve elini gizlice seçer. Herkes hazır olunca masa hep bir ağızdan "Taş! Kağıt! Makas!" der,
// yumruklar üç kez iner ve eller aynı anda açılır. Masanın ortasındaki tablada taş, kâğıt ve makas maketleri turu canlandırır:
// taş makası ezer, makas kâğıdı keser, kâğıt taşı sarar. Puan modunda 5 tur oynanır; eleme modunda en az kişiyi yenenler
// elenir, son kalan kazanır. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-c';
import * as sfx from '../sfx.js?v=2026-11-21-c';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, vn, mix3, rgbA, sst } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, makeTexture, updateTexture, drawMesh, limb, psurf, loft, medal, podiumHTML } = E;

const CH = ['tas', 'kagit', 'makas'];
const BEATS = { tas: 'makas', makas: 'kagit', kagit: 'tas' };
const HAND = { tas: 'fist', kagit: 'open', makas: 'scissors' };
const EMO = { tas: '✊', kagit: '✋', makas: '✌️' };
const NAME = { tas: 'Taş', kagit: 'Kağıt', makas: 'Makas' };
const VERB = { tas: 'makası kırar', makas: 'kâğıdı keser', kagit: 'taşı sarar' };
const SHAPE_RGB = { tas: [0.62, 0.7, 0.86], kagit: [1, 0.9, 0.62], makas: [1, 0.48, 0.34] };
const MEDAL_RGB = { tas: [0.42, 0.49, 0.62], kagit: [0.8, 0.66, 0.36], makas: [0.82, 0.38, 0.28] };
// zaman çizelgesi (sn, rev.at'ten): üç vuruş (Taş! Kağıt! Makas!), eller açılır, sonuçlar, eleme damgası
const B0 = 0.3, BEAT = 0.42, SHOW = B0 + 2 * BEAT + 0.04, RES = 1.75, OUT_T = 3.05;
const WORDS = ['TAŞ!', 'KAĞIT!', 'MAKAS!'];
// tabladaki yerler: taş uzakta (üstte), makas sol önde, kâğıt sağ önde; oklar taş → makas → kâğıt → taş
const PROP_A = { tas: -Math.PI / 2, makas: (5 * Math.PI) / 6, kagit: Math.PI / 6 };
const PROP_YAW = { tas: 0.4, makas: 0.52, kagit: -0.42 };
const ARENA_H = 0.055;

const STYLE = `
#ky.tkm .tk-pick{display:flex;gap:10px;justify-content:center;width:100%;max-width:440px}
#ky.tkm .tk-h{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);padding:8px 4px 7px;font-weight:900;font-size:17px;color:var(--ink);-webkit-tap-highlight-color:transparent;transition:transform .12s,opacity .25s,filter .25s,box-shadow .12s;position:relative;touch-action:manipulation}
#ky.tkm .tk-h .em{font-size:40px;line-height:1.08;filter:drop-shadow(0 2px 0 rgba(0,0,0,.16))}
#ky.tkm .tk-h.tas{background:linear-gradient(#e3e9f2,#c3cfdf)}
#ky.tkm .tk-h.kagit{background:linear-gradient(#fffaf0,#fde9bd)}
#ky.tkm .tk-h.makas{background:linear-gradient(#ffd9cd,#ffb39e)}
#ky.tkm .tk-h:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.tkm .tk-h.on{transform:translateY(-7px);box-shadow:4px 11px 0 var(--ink);outline:4px solid var(--lim);outline-offset:2px}
#ky.tkm .tk-h.on::after{content:'✓';position:absolute;top:-13px;right:-11px;width:28px;height:28px;border-radius:99px;background:#2fbf5a;color:#fff;border:3px solid var(--ink);display:grid;place-items:center;font-size:15px;line-height:1}
#ky.tkm .tk-h.off{opacity:.34;filter:grayscale(.6)}
#ky.tkm .tk-h[disabled]{pointer-events:none}
#ky.tkm .tk-h.wake{animation:tkw 1.1s ease-in-out infinite}
#ky.tkm .tk-h.wake:nth-child(2){animation-delay:.12s}#ky.tkm .tk-h.wake:nth-child(3){animation-delay:.24s}
@keyframes tkw{0%,100%{transform:none}45%{transform:translateY(-4px)}}
#ky.tkm .tk-st{display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:14px;color:#fff;background:rgba(12,10,26,.66);border-radius:99px;padding:5px 14px;pointer-events:none;max-width:94%;white-space:nowrap}
#ky.tkm .tk-st b{font-variant-numeric:tabular-nums;font-size:18px;min-width:1.1em;text-align:center}
#ky.tkm .tk-st b.hot{color:#ff6b5a}
#ky.tkm .tk-st i{font-style:normal;opacity:.75}
#ky.tkm .tk-res{width:min(400px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:10px 16px 11px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none}
#ky.tkm .tk-res.win{background:#dff7e4}
#ky.tkm .tk-res.lose{background:#ffe3da}
#ky.tkm .tk-res.out{background:#e9e4ee}
#ky.tkm .tk-res .lb{font-size:12px;font-weight:800;opacity:.6;letter-spacing:.05em;text-transform:uppercase}
#ky.tkm .tk-res .big{display:flex;align-items:center;justify-content:center;gap:10px;font-size:30px;font-weight:900;line-height:1.08;margin-top:2px}
#ky.tkm .tk-res .big .e{font-size:38px}
#ky.tkm .tk-res .q{margin-top:4px;font-size:15px;font-weight:700;line-height:1.3}
#ky.tkm .tk-res .cn{margin-top:7px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
#ky.tkm .tk-res .cn span{display:inline-flex;align-items:center;gap:3px;border:2px solid var(--ink);border-radius:99px;padding:0 9px 0 6px;font-weight:800;font-size:14px;background:#fff}
#ky.tkm .tk-res .cn span.w{background:var(--lim)}
#ky.tkm .tk-res .cn span.z{opacity:.4}
#ky.tkm .tk-res .nx{margin-top:6px;font-size:12px;font-weight:700;opacity:.55}
#ky.tkm .lbl .tk-x{display:inline-flex;align-items:center;gap:4px}
#ky.tkm .lbl .tk-x:empty{display:none}
#ky.tkm .lbl .tk-sc{background:rgba(255,255,255,.22);border-radius:99px;padding:0 6px;font-size:11px;font-variant-numeric:tabular-nums}
#ky.tkm .lbl.me .tk-sc{background:rgba(28,22,51,.14)}
#ky.tkm .lbl .tk-ok{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:99px;background:#2fbf5a;color:#fff;font-size:10px;line-height:1}
#ky.tkm .lbl .tk-th{opacity:.7;font-size:11px;letter-spacing:1px}
#ky.tkm .lbl .tk-e{font-size:16px;line-height:1;animation:tkg .45s cubic-bezier(.2,1.7,.4,1)}
#ky.tkm .lbl .tk-g{font-weight:900;color:#5cf08a;animation:tkg .5s cubic-bezier(.2,1.7,.4,1)}
#ky.tkm .lbl .tk-g.z{color:rgba(255,255,255,.55)}
#ky.tkm .lbl.me .tk-g{color:#157a37}#ky.tkm .lbl.me .tk-g.z{color:rgba(28,22,51,.45)}
@keyframes tkg{from{transform:scale(.2)}to{transform:none}}
#ky.tkm .lbl.out{opacity:.5;filter:grayscale(1)}
#ky.tkm .lbl .tk-dw{color:#ffd23f;letter-spacing:1px;font-size:12px}
#ky.tkm .lbl.me .tk-dw{color:#b2560e}
#ky.tkm .lbl.best{box-shadow:0 0 0 3px #ffd23f,0 0 16px rgba(255,210,63,.9)}
#ky.tkm .msg span.tkw{font-size:66px}
#ky.tkm .tk-cnts{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden}
#ky.tkm .tk-cnt{position:absolute;left:0;top:0;font-weight:900;font-size:16px;color:var(--ink);background:#fff;border:3px solid var(--ink);border-radius:99px;padding:0 10px 0 6px;display:flex;align-items:center;gap:4px;box-shadow:2px 3px 0 var(--ink);will-change:transform;opacity:0;transition:opacity .25s}
#ky.tkm .tk-cnt span{font-size:18px}
#ky.tkm .tk-cnt.on{opacity:1}
#ky.tkm .tk-cnt.win{background:var(--lim)}
#ky.tkm .tk-cnt.lose{background:#e6e1ea}
#ky.tkm .tk-cnt.zero{opacity:.45}
#ky.tkm .card .tk-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.tkm .card .tk-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;line-height:1.15;white-space:nowrap}
#ky.tkm .card .tk-seg button.on{background:var(--ink);color:#fff}
#ky.tkm .card .tk-md{margin-top:8px;font-size:13.5px;font-weight:700;opacity:.72;line-height:1.3;text-align:center}
#ky.tkm .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.tkm .card .tk-rest{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px}
#ky.tkm .card .tk-rest span{border:2px solid var(--ink);border-radius:99px;padding:1px 9px;font-weight:800;font-size:12.5px;background:#fff;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky.tkm .card .tk-rest span b{font-variant-numeric:tabular-nums;opacity:.7}
#ky.tkm .card .tk-rest span.me{background:var(--lim)}
#ky.tkm .card .tk-top3{display:none}
@media (max-height:560px){#ky.tkm .card .tk-top3{display:flex}}
#ky.tkm .card.tk-fin .tk-seg{margin-top:10px}
#ky.tkm .card.tk-fin .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.tkm .card.tk-fin .row2 .kb.alt{flex:0 0 auto}
@media (max-width:379px){#ky.tkm .card.tk-fin .row2 .kb{font-size:15px;padding-left:8px;padding-right:8px}#ky.tkm .card .tk-seg button{font-size:12px}}
#ky.tkm .card .tk-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.tkm .card .tk-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.tkm .card .tk-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.tkm .card.tk-in .tt{font-size:26px}
#ky.tkm .card.tk-in .sub{font-size:14px}
#ky.tkm .card.tk-in .kb{margin-top:10px}
#ky.tkm .card .tk-ru .tas{background:#d9e1ec}#ky.tkm .card .tk-ru .kagit{background:#fff2d2}#ky.tkm .card .tk-ru .makas{background:#ffcfc1}
@media (orientation:landscape) and (max-height:520px){
#ky.tkm .tk-pick{max-width:330px;gap:8px}
#ky.tkm .tk-h{padding:5px 4px 4px;font-size:14px;border-radius:18px}
#ky.tkm .tk-h .em{font-size:30px}
#ky.tkm .tk-res{width:min(340px,44vw);padding:7px 12px}
#ky.tkm .tk-res .big{font-size:24px}#ky.tkm .tk-res .big .e{font-size:28px}
#ky.tkm .tk-res .q{font-size:13px}
#ky.tkm .tk-res .nx{display:none}
#ky.tkm .msg span.tkw{font-size:50px}
#ky.tkm .card .tk-ru{display:none}
}
@media (max-height:690px) and (orientation:portrait){#ky.tkm .tk-res .cn{display:none}#ky.tkm .card .tk-ru{display:none}}
`;

/* ============================ müzik ve sesler ============================ */
// Bekleme / sonuç: Sol majör oyunbaz sokak grubu (G – Em – C – D): alkış, şeyker, zıplayan kontrbas, marimba arpeji,
// "taş-kağıt-ma-kas" pizzicato ezgisi. Seçim: saatin tik-takı, nabız gibi bas, süre azaldıkça sıklaşan ostinato.
class TkmSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.1; }
  tempo() { return this.mode === 'race' ? 108 + 30 * (this.int || 0) : this.mode === 'idle' ? 106 : 98; }
  swing() { return this.mode === 'race' ? 0 : 0.11; }
  beat(t, s, bar, spb, st = spb / 4) {
    const I = this.int || 0;
    if (this.mode === 'race') {
      const RC = [[40, [64, 67, 71]], [36, [64, 67, 72]], [45, [64, 69, 72]], [47, [63, 66, 71]]];
      const [root, ch] = RC[bar % 4];
      if (s % 4 === 0) this.iKick(t, 0.2 + 0.12 * I, 112, 42);
      // tik-tak (tahta bloklar): ikinci yarıda sıklaşır
      if (s === 0 || s === 8) this.iWood(t, 0.075, 820);
      if (s === 4 || s === 12) this.iWood(t, 0.06, 1240);
      if (I > 0.55 && s % 4 === 2) this.iWood(t, 0.04, 1240);
      if (s % 2 === 1 && I > 0.25) this.iHat(t, 0.01 + 0.022 * I);
      if (s % 2 === 0) this.iBass(t, root - 12 + (s % 8 === 6 ? 7 : 0), st * 1.5, 0.1 + 0.03 * I, 'sub');
      const arp = [0, 1, 2, 1];
      if (s % 2 === 0) this.iPizz(t, ch[arp[(s >> 1) % 4]] + (I > 0.62 ? 12 : 0), 0.03 + 0.022 * I, st * 1.4);
      if (I > 0.78 && s % 2 === 1) this.iSnare(t, 0.018 + 0.08 * (I - 0.78), 0.05);
      if (s === 0 && bar % 2 === 0) this.iStr(t, ch.map((m) => m - 12), spb * 7.6, 0.007 + 0.01 * I, 0.3, 1700, 0.25);
      return;
    }
    const soft = this.mode !== 'idle';
    const GC = [[43, [59, 62, 67, 71]], [40, [59, 64, 67, 71]], [48, [60, 64, 67, 72]], [50, [62, 66, 69, 74]]];
    const [root, ch] = GC[bar % 4];
    if (s === 0 || s === 10 || (!soft && s === 7 && bar % 2 === 1)) this.iKick(t, soft ? 0.19 : 0.26, 118, 44);
    if (s === 4 || s === 12) { if (soft) this.iBrush(t, 0.05, 0.18); else this.iClap(t, 0.085); }
    if (s % 2 === 1) this.iShk(t, soft ? 0.008 : 0.012);
    if (!soft && s % 4 === 2) this.iHat(t, 0.018);
    if ([0, 3, 6, 8, 11, 14].includes(s)) this.iBass(t, root - 12 + (s === 6 || s === 14 ? 12 : s === 11 ? 7 : 0), st * 1.3, soft ? 0.085 : 0.115, 'up');
    if (s % 2 === 0) { const ar = [0, 2, 1, 3, 2, 1, 3, 2]; this.iMarimba(t, ch[ar[(s >> 1) % 8]] + 12, soft ? 0.022 : 0.034, 0.15); }
    if (s === 0 || s === 6 || (!soft && s === 10)) ch.forEach((m, i) => this.iEP(t + i * 0.005, m, (soft ? 0.011 : 0.015) * (i ? 0.75 : 1), spb * 0.9, 0.2));
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, soft ? 0.009 : 0.009, 950);
    if (!soft && bar % 4 === 3) { const mel = { 0: 74, 2: 74, 4: 76, 6: 79, 8: 78, 12: 74 }; if (mel[s] !== undefined) this.iPizz(t, mel[s], 0.045, st * 1.8); }
  }
  // "Taş! Kağıt! Makas!" vuruşları ses saatine göre zamanlanır (d: şimdiden saniye)
  chant(ds) {
    if (!this.on()) return;
    const t0 = this.k.ctx.currentTime;
    const last = Math.max(...ds);
    if (last < -0.05) return;
    this.duck(0.2, Math.max(0.2, last) + 0.5);
    ds.forEach((d, k) => { if (d >= -0.04) this._hit(t0 + Math.max(0, d) + 0.01, k); });
    if (ds[0] > 0.22) this.iRiser(t0, ds[0], 0.05);
  }
  _hit(t, k) {
    const f = [60, 68, 78][k];
    this.tone(f * 1.9, t, 0.42, 'sine', 0.4, f, 0.002);
    this.noise(t, 0.14, 0.3, { type: 'lowpass', freq: 360 });
    this.tone(f * 3.2, t, 0.06, 'triangle', 0.08, f * 1.6, 0.001);
    for (let i = 0; i < 3; i++) this.noise(t + i * 0.011, 0.02, 0.15 * (1 - i * 0.15), { type: 'bandpass', freq: 1500, q: 1.2 });
    this.noise(t + 0.033, 0.11, 0.11, { type: 'bandpass', freq: 1700, q: 1 });
    const w = [440, 494, 587][k];
    this.tone(w, t, 0.12, 'square', 0.035, w * 1.06, 0.004);
    if (k === 2) {
      this.noise(t + 0.02, 1.2, 0.2, { type: 'highpass', freq: 4400 });
      this.tone(52, t + 0.01, 0.5, 'sine', 0.42, 34, 0.003);
      [392, 494, 587, 784].forEach((fq) => { this.tone(fq, t + 0.02, 0.32, 'sawtooth', 0.035, null, 0.01); this.tone(fq, t + 0.02, 0.45, 'triangle', 0.05); });
      this.noise(t, 0.3, 0.18, { type: 'bandpass', freq: 700, to: 3200, q: 0.8, attack: 0.01 });
    }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'pick': // kendi seçimim: tok tık + çan
        this.noise(t, 0.035, 0.16, { type: 'bandpass', freq: 2300, q: 2, attack: 0.001 });
        this.tone(620, t, 0.05, 'triangle', 0.12, 900, 0.002);
        this.tone(1318, t + 0.045, 0.22, 'sine', 0.1); this.tone(1976, t + 0.07, 0.18, 'sine', 0.05);
        break;
      case 'ready': { // başkası seçti: yumuşak tahta tık
        const f = 1150 + Math.random() * 300;
        this.tone(f, t, 0.035, 'triangle', 0.05, f * 0.9, 0.001);
        this.noise(t, 0.018, 0.05, { type: 'bandpass', freq: 3200, q: 3, attack: 0.001 });
        break;
      }
      case 'clock': // son saniyeler: tik-tak (a: 1 = son)
        this.tone(a ? 1560 : 1040, t, 0.035, 'square', a ? 0.07 : 0.05, null, 0.001);
        this.noise(t, 0.02, 0.08, { type: 'bandpass', freq: a ? 4200 : 3000, q: 3, attack: 0.001 });
        break;
      case 'round': // yeni tur
        this.noise(t, 0.35, 0.12, { type: 'bandpass', freq: 500, to: 2600, q: 0.9, attack: 0.06 });
        [659, 880].forEach((f, i) => this.tone(f, t + i * 0.07, 0.14, 'triangle', 0.08));
        break;
      case 'duel': // final düellosu
        this.duck(0.3, 1.6);
        this.iGong(t, 0.13, 92);
        [[330, 0], [392, 0.16], [494, 0.32]].forEach(([f, d]) => { this.tone(f, t + d, 0.3, 'sawtooth', 0.04, null, 0.02); this.tone(f / 2, t + d, 0.35, 'triangle', 0.08); });
        break;
      case 'clank': // taş makası ezer: metal çınlaması + tok darbe
        [1, 2.76, 5.4, 8.93].forEach((r, i) => this.tone(560 * r, t, 0.55 - i * 0.1, 'sine', 0.12 / (i + 1), 560 * r * 0.995, 0.001));
        this.noise(t, 0.12, 0.3, { type: 'highpass', freq: 2600 });
        this.tone(110, t, 0.2, 'sine', 0.36, 48, 0.002);
        this.noise(t, 0.08, 0.2, { freq: 500 });
        break;
      case 'snip': // makas: iki hızlı kesik
        for (let i = 0; i < 2; i++) { this.noise(t + i * 0.045, 0.03, 0.2, { type: 'bandpass', freq: 5200 - i * 600, q: 3, attack: 0.001 }); this.tone(3300 - i * 300, t + i * 0.045, 0.02, 'square', 0.025, null, 0.001); }
        break;
      case 'tear': this.noise(t, 0.28, 0.16, { type: 'bandpass', freq: 2200, to: 4800, q: 0.8, attack: 0.01 }); break;
      case 'rustle': // kâğıt sarar
        this.noise(t, 0.45, 0.16, { type: 'bandpass', freq: 2400, to: 4400, q: 0.7, attack: 0.04 });
        this.noise(t + 0.12, 0.35, 0.11, { type: 'bandpass', freq: 1700, to: 1200, q: 0.9, attack: 0.03 });
        for (let i = 0; i < 6; i++) this.noise(t + 0.05 + i * 0.06 + Math.random() * 0.03, 0.025, 0.08, { type: 'highpass', freq: 3600 });
        break;
      case 'whirl': // üçü birden: döne döne kovalamaca
        this.noise(t, 1.2, 0.15, { type: 'bandpass', freq: 300, to: 2400, q: 1.3, attack: 0.3 });
        this.tone(220, t, 1.1, 'triangle', 0.05, 660, 0.1);
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + 0.25 + i * 0.18, 0.18, 'sine', 0.06));
        break;
      case 'boing': { // herkes aynı: yay sesi
        const o = this.tone(170, t, 0.55, 'sine', 0.2, 420, 0.004);
        if (o) { try { const c = this.k.ctx, l = c.createOscillator(), g = c.createGain(); l.frequency.value = 14; g.gain.value = 26; l.connect(g).connect(o.frequency); l.start(t); l.stop(t + 0.6); } catch { /* eski tarayıcı */ } }
        break;
      }
      case 'win': // turu kazandım
        [784, 988, 1175, 1568].forEach((f, i) => { this.tone(f, t + i * 0.07, 0.18, 'square', 0.045); this.tone(f, t + i * 0.07, 0.3, 'sine', 0.08); });
        for (let i = 0; i < 6; i++) this.tone(2600 + Math.random() * 2200, t + 0.25 + Math.random() * 0.35, 0.07, 'sine', 0.03);
        break;
      case 'lose': // yenildim: "vah vah"
        [[392, 0, 0.22], [349, 0.24, 0.42]].forEach(([f, d, L]) => { this.tone(f, t + d, L, 'sawtooth', 0.07, f * 0.94, 0.02); this.tone(f / 2, t + d, L, 'triangle', 0.06, null, 0.02); });
        break;
      case 'tie': [587, 587].forEach((f, i) => this.tone(f, t + i * 0.16, 0.13, 'triangle', 0.09)); break;
      case 'out': // elendim
        this.duck(0.2, 1.4);
        this.tone(150, t, 0.5, 'sawtooth', 0.11, 120, 0.004); this.tone(156, t, 0.5, 'square', 0.06, 124, 0.004);
        this.noise(t, 0.4, 0.12, { type: 'bandpass', freq: 400, q: 1.5 });
        break;
      case 'gone': this.tone(300, t, 0.18, 'triangle', 0.1, 150, 0.004); this.noise(t, 0.08, 0.08, { freq: 700 }); break;
      case 'champ': // şampiyon: bando fanfarı + alkış
        this.duck(0.15, 3);
        [[523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [659, 0.45, 0.5], [784, 0.62, 0.9]].forEach(([f, d, L]) => { this.iBrass(t + d, Math.round(69 + 12 * Math.log2(f / 440)), L, 0.06, 0.15); this.tone(f, t + d, L, 'triangle', 0.06); });
        this.noise(t + 0.62, 1.4, 0.16, { type: 'highpass', freq: 4400 });
        this.cheer(t + 0.4, 2.2);
        break;
      case 'start': this.duck(0.3, 0.9); this.noise(t, 0.4, 0.14, { type: 'bandpass', freq: 400, to: 3000, q: 0.9, attack: 0.08 }); this.tone(988, t + 0.18, 0.3, 'square', 0.07); this.tone(1318, t + 0.18, 0.35, 'sine', 0.08); break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// Ortadaki tabla: ceviz kaide + pirinç kenar (üst yüz doku: kurallar)
function arenaBase(mb, RA) {
  const W = C('#3b2416', -0.55), Wl = C('#5a3a22', -0.55);
  mb.lathe(0, 0, 0, [[0, 0], [RA + 0.045, 0], [RA + 0.075, 0.012], [RA + 0.082, 0.038], [RA + 0.066, ARENA_H], [RA + 0.02, ARENA_H], [0, ARENA_H - 0.002]], 80, (i) => (i >= 3 ? Wl : W));
  mb.torusN(0, ARENA_H + 0.004, 0, RA + 0.03, 0.019, 0.015, 80, 6, C('#d6a64a', -0.92));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; mb.lathe(Math.cos(a) * RA * 0.7, -0.012, Math.sin(a) * RA * 0.7, [[0, 0], [0.07, 0], [0.07, 0.014], [0, 0.014]], 10, C('#2a2320')); }
}
function arenaTop(tb, RA) {
  const N = 96, y = ARENA_H + 0.001;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    tb.tw([0, y, 0], [Math.cos(a1) * RA, y, Math.sin(a1) * RA], [Math.cos(a0) * RA, y, Math.sin(a0) * RA], null, [0, y - 1, 0], [0.5, 0.5, 0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1), 0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)]);
  }
}
// göbekteki logo diski
function hubLogo(tb, r) {
  const N = 40, y = ARENA_H + 0.0025;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    tb.tw([0, y, 0], [Math.cos(a1) * r, y, Math.sin(a1) * r], [Math.cos(a0) * r, y, Math.sin(a0) * r], null, [0, y - 1, 0], [0.5, 0.5, 0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1), 0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)]);
  }
}
// süre halkası (katkılı): saat yönünde 60 dilim; ilk k dilim çizilerek kalan süre gösterilir
const RING_N = 60;
function ringModel(mb, r, w) {
  const y = ARENA_H + 0.006;
  for (let i = 0; i < RING_N; i++) {
    const a0 = -Math.PI / 2 + (i / RING_N) * TAU + 0.012, a1 = -Math.PI / 2 + ((i + 1) / RING_N) * TAU - 0.012;
    const P = (rr, a) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
    const ci = [1, 1, 1, 0.75], co = [1, 1, 1, 1];
    mb.d.push(...P(r - w, a0), ...ci, ...P(r, a0), ...co, ...P(r, a1), ...co, ...P(r - w, a0), ...ci, ...P(r, a1), ...co, ...P(r - w, a1), ...ci);
  }
}
// Taş: yumru yumru granit (alt yüzü düz), açık-koyu benekli
const ROCK_R = 0.15;
function rockModel(mb) {
  const R0 = ROCK_R, cy = R0 * 0.68;
  const nz = (x, y, z) => 0.16 * (vn(x * 2.6 + 3.1, z * 2.6 + y * 1.7) - 0.5) * 2 + 0.07 * (vn(x * 6.1 + y * 4.3, z * 6.1 - 2) - 0.5) * 2;
  const P = (u, v) => {
    const th = u * Math.PI, ph = v * TAU;
    const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const r = R0 * (1 + nz(d[0], d[1], d[2]));
    let y = cy + d[1] * r * 0.8;
    y = Math.max(0.004, y);
    return [d[0] * r * 1.05, y, d[2] * r * 0.95];
  };
  const G = C('#70757e'), Gl = C('#8f949c'), Gd = C('#4c515a');
  const Cf = (u, v) => {
    const th = u * Math.PI, ph = v * TAU;
    const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const n = nz(d[0], d[1], d[2]);
    let c = mix3(n > 0 ? Gl : Gd, G, 1 - Math.min(1, Math.abs(n) * 5.5));
    c = mix3(c, [0.8, 0.78, 0.75], 0.06 * Math.max(0, d[1]));
    const h = hs(Math.floor(u * 44), Math.floor(v * 70));
    if (h > 0.9) c = mix3(c, [0.85, 0.84, 0.82], 0.3); else if (h < 0.1) c = mix3(c, [0.16, 0.16, 0.18], 0.4);
    return rgbA(c, -0.12);
  };
  psurf(mb, 20, 32, P, Cf, { wv: true, cen: [0, cy, 0] });
}
// Kâğıt: hafif kıvrık çizgili defter yaprağı; makas kesince ikiye ayrılır (sx: -1 sol yarı, 1 sağ yarı)
const PW = 0.32, PD = 0.24;
const paperY = (x, z) => 0.004 + 0.02 * sst(0.42, 1, Math.abs(x) / (PW / 2)) + 0.011 * sst(0.55, 1, Math.abs(z) / (PD / 2)) + 0.0025 * Math.sin(x * 31 + z * 17);
function paperHalf(mb, sx) {
  const hw = PW / 2, hd = PD / 2;
  const x0 = sx < 0 ? -hw : 0.0015, x1 = sx < 0 ? -0.0015 : hw;
  const top = C('#fbf8ef', -0.05), bot = C('#ece6d6', -0.05);
  psurf(mb, 12, 14, (u, v) => { const x = lerp(x0, x1, u), z = lerp(-hd, hd, v); return [x, paperY(x, z), z]; }, () => top, { cen: [0, -1, 0] });
  psurf(mb, 12, 14, (u, v) => { const x = lerp(x0, x1, u), z = lerp(-hd, hd, v); return [x, paperY(x, z) - 0.0022, z]; }, () => bot, { cen: [0, 1, 0] });
  // mavi satır çizgileri ve kırmızı kenar boşluğu çizgisi (yüzeyi izleyen ince şeritler)
  const Lc = C('#8fb7e3', -0.05), Rc = C('#e06a6a', -0.05);
  const strip = (pts, w, col) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * w, nzz = (dx / L) * w;
      const Y = (x, z) => paperY(x, z) + 0.0016;
      const A = [ax - nx, Y(ax, az), az - nzz], B = [ax + nx, Y(ax, az), az + nzz], Cc = [bx + nx, Y(bx, bz), bz + nzz], D = [bx - nx, Y(bx, bz), bz - nzz];
      mb.quadN(A, B, Cc, D, [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], col);
    }
  };
  for (let k = 0; k < 9; k++) {
    const z = -hd + 0.036 + k * 0.024;
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([lerp(x0 + (sx < 0 ? 0.006 : 0), x1 - (sx > 0 ? 0.006 : 0), i / 8), z]);
    strip(pts, 0.0012, Lc);
  }
  if (sx < 0) { const x = -hw + 0.045, pts = []; for (let i = 0; i <= 8; i++) pts.push([x, lerp(-hd + 0.006, hd - 0.006, i / 8)]); strip(pts, 0.0014, Rc); }
}
// Taşı saran buruşuk kâğıt (sarma anında görünür)
function wrapModel(mb) {
  const R0 = ROCK_R * 1.24, cy = ROCK_R * 0.7;
  const cr = (x, y, z) => 0.1 * (vn(x * 4.2 + 1, z * 4.2 + y * 3) - 0.5) * 2 + 0.05 * Math.abs(Math.sin(x * 13 + y * 7 + z * 11));
  psurf(mb, 16, 26, (u, v) => {
    const th = u * Math.PI, ph = v * TAU;
    const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const r = R0 * (1 + cr(d[0], d[1], d[2]));
    return [d[0] * r, Math.max(0.003, cy + d[1] * r * 0.82), d[2] * r];
  }, (u, v) => {
    const th = u * Math.PI, ph = v * TAU;
    const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const k = cr(d[0], d[1], d[2]);
    return rgbA(mix3([0.86, 0.84, 0.78], [0.6, 0.56, 0.5], clamp(0.5 - k * 4, 0, 1) * 0.8), -0.05);
  }, { wv: true, cen: [0, cy, 0] });
}
// Makas yarısı: pivot orijinde, bıçak +X boyunca; sap halkası arkada, karşı tarafta (sg: +1 üst yarı, -1 alt yarı).
// Oyuncak abartısında: geniş parlak bıçak, kalın renkli sap, pirinç vida.
function scissorHalf(mb, sg) {
  const yb = sg > 0 ? 0.024 : 0.012;
  const ST = C('#e4e9ef', -0.94), STd = C('#b4bcc7', -0.93), ED = C('#f8fbff', -0.95), PL = C('#f25a38', -0.62), PLd = C('#c8432a', -0.6), BR = C('#e8bd62', -0.93);
  const rings = [];
  const L = 0.24;
  const Wd = (x) => (x < 0.05 ? lerp(0.058, 0.054, x / 0.05) : x < 0.15 ? lerp(0.054, 0.036, (x - 0.05) / 0.1) : lerp(0.036, 0.004, Math.pow((x - 0.15) / (L - 0.15), 1.25)));
  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * L;
    const w = Wd(x);
    // kesici kenar eksene yakın düz, sırt dışa kavisli
    rings.push({ c: [x, yb, sg * (w / 2 - 0.006)], a: w / 2, b: 0.0058, e: 0.42 });
  }
  loft(mb, rings, (i, k, cu) => (i > 13 ? STd : cu * sg < -0.6 ? ED : ST), 14, 'e', [0, 0, 1]);
  // pivot plakası ve sapın gövdesi
  mb.lathe(0, yb - 0.0058, 0, [[0, 0], [0.03, 0], [0.03, 0.0116], [0, 0.0116]], 20, ST);
  limb(mb, [0, yb, 0], [-0.07, yb, -sg * 0.036], [0.013, 0.012], ST, 10);
  // plastik sap halkası (oval, kalın)
  mb.push().T(-0.122, yb, -sg * 0.058, 0, 0, 0, 1, 1, 0.8);
  mb.torusN(0, 0, 0, 0.05, 0.017, 0.0135, 26, 10, PL, (u, v) => (Math.sin(v) < -0.3 ? PLd : PL));
  mb.pop();
  if (sg > 0) mb.lathe(0, yb + 0.0058, 0, [[0.013, 0], [0.012, 0.003], [0.007, 0.0055], [0, 0.006]], 14, BR);
}
// Kupa: ceviz kaide, altın gövde, iki kulp
function trophyModel(mb) {
  const G = C('#f2c14e', -0.94), Gd = C('#c99a3e', -0.92), Wd = C('#3b2416', -0.5);
  mb.rbox(-0.085, 0, -0.085, 0.085, 0.05, 0.085, 0.012, Wd, 2);
  mb.rbox(-0.06, 0.05, -0.06, 0.06, 0.058, 0.06, 0.004, Gd, 1);
  mb.lathe(0, 0.058, 0, [[0, 0], [0.05, 0], [0.052, 0.006], [0.03, 0.02], [0.018, 0.05], [0.016, 0.085], [0.03, 0.095], [0.02, 0.105], [0.05, 0.115], [0.09, 0.15], [0.105, 0.2], [0.108, 0.245], [0.1, 0.25], [0.094, 0.24], [0, 0.205]], 32, (i) => (i === 6 ? Gd : G));
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; pts.push([s * (0.098 + Math.sin(a) * 0.055), 0.29 - 0.03 - (0.5 - 0.5 * Math.cos(a)) * 0.1 - 0.0, 0]); }
    for (let k = 0; k < pts.length - 1; k++) limb(mb, pts[k], pts[k + 1], [0.011, 0.011], G, 8);
  }
}
// gölge altı için yumuşak halka (kendi koltuğum)
function seatRingModel(mb) { mb.torusN(0, 0, 0, 0.58, 0.035, 0.012, 40, 5, C('#ffffff', 1)); }

/* ============================ tabla dokusu ============================ */
function drawArena(cv) {
  const g = cv.getContext('2d');
  const S = cv.width, c = S / 2, R = S / 2;
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  g.clearRect(0, 0, S, S);
  // şarap rengi oyun keçesi
  const bg = g.createRadialGradient(c, c * 0.92, R * 0.05, c, c, R);
  bg.addColorStop(0, '#7a2a3d'); bg.addColorStop(0.7, '#5c1c2c'); bg.addColorStop(1, '#431220');
  g.fillStyle = bg; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  for (let i = 0; i < 5200; i++) { const a = hs(i, 1) * TAU, r = Math.sqrt(hs(i, 2)) * R * 0.99; g.fillStyle = hs(i, 4) < 0.5 ? `rgba(255,220,220,${0.02 + hs(i, 3) * 0.04})` : `rgba(20,0,6,${0.04 + hs(i, 3) * 0.06})`; g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 2); }
  // çift altın çember
  g.strokeStyle = '#d9ad55';
  g.lineWidth = 10; g.beginPath(); g.arc(c, c, R * 0.955, 0, TAU); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(c, c, R * 0.912, 0, TAU); g.stroke();
  for (let k = 0; k < 48; k++) { const a = (k / 48) * TAU; g.fillStyle = '#d9ad55'; g.beginPath(); g.arc(c + Math.cos(a) * R * 0.934, c + Math.sin(a) * R * 0.934, 4, 0, TAU); g.fill(); }
  // oklar: taş → makas → kâğıt → taş (ekranda saat yönünün tersi)
  const rr = R * 0.56, gap = 0.52;
  const order = ['tas', 'makas', 'kagit'];
  g.lineCap = 'round';
  order.forEach((k, i) => {
    const to = order[(i + 1) % 3];
    const a0 = PROP_A[k], a1 = PROP_A[to];
    let d = a1 - a0; while (d > 0) d -= TAU; while (d <= -TAU) d += TAU;
    const s0 = a0 - gap, s1 = a0 + d + gap;
    g.strokeStyle = 'rgba(255,238,205,.9)'; g.lineWidth = 14;
    g.beginPath(); g.arc(c, c, rr, s0, s1, true); g.stroke();
    const hx = c + Math.cos(s1) * rr, hy = c + Math.sin(s1) * rr;
    const tx = Math.sin(s1), ty = -Math.cos(s1);
    g.fillStyle = 'rgba(255,238,205,.95)';
    g.beginPath();
    g.moveTo(hx + tx * 36, hy + ty * 36);
    g.lineTo(hx - tx * 6 + Math.cos(s1) * 28, hy - ty * 6 + Math.sin(s1) * 28);
    g.lineTo(hx - tx * 6 - Math.cos(s1) * 28, hy - ty * 6 - Math.sin(s1) * 28);
    g.closePath(); g.fill();
    // fiil (kırar / keser / sarar): yayın ortasında, içte
    const am = a0 + d / 2;
    const vx = c + Math.cos(am) * rr * 0.6, vy = c + Math.sin(am) * rr * 0.6;
    g.font = `800 54px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#f0c873';
    g.fillText(k === 'tas' ? 'kırar' : k === 'makas' ? 'keser' : 'sarar', vx, vy);
  });
  // madalyonlar + adlar
  CH.forEach((k) => {
    const a = PROP_A[k], x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    const col = MEDAL_RGB[k], css = (v, m = 1) => `rgb(${Math.round(v[0] * 255 * m)},${Math.round(v[1] * 255 * m)},${Math.round(v[2] * 255 * m)})`;
    const gr = g.createRadialGradient(x, y - 24, 10, x, y, R * 0.25);
    gr.addColorStop(0, css(col, 0.92)); gr.addColorStop(1, css(col, 0.62));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, R * 0.25, 0, TAU); g.fill();
    g.strokeStyle = '#fff1d6'; g.lineWidth = 12; g.beginPath(); g.arc(x, y, R * 0.25 - 6, 0, TAU); g.stroke();
    g.strokeStyle = '#2a0b14'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, R * 0.25, 0, TAU); g.stroke();
    // ad: madalyonun önünde (izleyiciye yakın tarafta), maket onu örtmesin
    const lx = x, ly = y + R * 0.335;
    g.font = `900 54px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 11; g.strokeStyle = '#2a0b14'; g.lineJoin = 'round';
    const t = NAME[k].toLocaleUpperCase('tr');
    g.strokeText(t, lx, ly);
    g.fillStyle = '#fff3dc'; g.fillText(t, lx, ly);
  });
  // göbek halkası
  g.strokeStyle = '#d9ad55'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, R * 0.15, 0, TAU); g.stroke();
}

/* ============================ podyum ============================ */
// list: [{ id, nickname, c, tag }] ilk üç; tag: basamağın altındaki yazı (puan ya da "son kalan")
function podiumTKM(list, meId) {
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

/* ============================ poz yardımcıları ============================ */
// koltuk uzayı: +Z masaya doğru, +X oturanın solu. El 0: sağ el (−X), el 1: sol el (+X)
const restH = (j) => ({ p: [j ? 0.17 : -0.17, 0.778, 0.41], f: [j ? -0.15 : 0.15, -0.15, 1], pa: [0, -1, 0], s: 'relax' });
function setP(a, o) {
  const g = a.tgt;
  g.lean = o.lean ?? 0.08; g.rise = o.rise || 0; g.roll = o.roll || 0; g.turn = o.turn || 0; g.hroll = o.hroll || 0;
  for (let j = 0; j < 2; j++) {
    const h = o.h[j];
    g.hand[j] = h.p; g.fdir[j] = h.f; g.palm[j] = h.pa;
    g.pole[j] = h.e || (j ? [0.75, -0.55, -0.3] : [-0.75, -0.55, -0.3]);
    g.fw[j] = h.w ?? 1;
    a.shape[j] = h.s;
  }
  a.k = o.k || 9;
}
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (x) => { const t = clamp(x, 0, 1); return 1 - (1 - t) * (1 - t); };
const easeIn = (x) => { const t = clamp(x, 0, 1); return t * t; };
// yumruk yüksekliği (0 aşağıda, 1 yukarıda): vuruşlarda aşağı iner
function pumpH(rt) {
  if (rt <= 0) return 0.5;
  if (rt < B0) return rt < B0 * 0.45 ? lerp(0.5, 1, easeOut(rt / (B0 * 0.45))) : 1 - easeIn((rt - B0 * 0.45) / (B0 * 0.55));
  const k = Math.floor((rt - B0) / BEAT);
  if (k >= 2) return 0;
  const u = (rt - B0 - k * BEAT) / BEAT;
  return u < 0.42 ? easeOut(u / 0.42) : 1 - easeIn((u - 0.42) / 0.58);
}
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/* ============================ oyun ============================ */
class TkmGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'tkm', cls: 'tkm', title: 'Taş Kağıt Makas', sub: 'Taş makası, makas kâğıdı, kâğıt taşı yener', emoji: '✂️', css: STYLE, snd: new TkmSnd(), amb: 'diner', ambVol: 0.6, botPx: 178, botPxL: 96, cloth: '#24365f', trim: '#e9b872', place: false });
    this.cues = new Set();
    this.anim = null;
    this.trophy = null;
    this.localPick = null;
    this.lastTickS = 0;
    this.el.posS.textContent = '';
    this.lampK = 0.82;
    // tabladaki üç elin sayaç rozetleri
    const box = document.createElement('div');
    box.className = 'tk-cnts';
    box.innerHTML = CH.map((c) => `<div class="tk-cnt" data-c="${c}"><span>${EMO[c]}</span><b>0</b></div>`).join('');
    this.el.wrap.appendChild(box);
    this.cntEl = {};
    CH.forEach((c) => { const e = box.querySelector(`[data-c="${c}"]`); this.cntEl[c] = { el: e, b: e.querySelector('b'), k: '' }; });
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.rock = this.mk(rockModel);
    W.wrap = this.mk(wrapModel);
    W.paperL = this.mk((mb) => paperHalf(mb, -1));
    W.paperR = this.mk((mb) => paperHalf(mb, 1));
    W.scA = this.mk((mb) => scissorHalf(mb, 1));
    W.scB = this.mk((mb) => scissorHalf(mb, -1));
    W.trophy = this.mk(trophyModel);
    W.seatRing = this.mk(seatRingModel);
    W.hub = this.mk((tb) => hubLogo(tb, 0.12), 'tex');
    this.arenaCv = document.createElement('canvas');
    this.arenaCv.width = 1024; this.arenaCv.height = 1024;
    drawArena(this.arenaCv);
    this.arenaTex = makeTexture(this.X, this.arenaCv);
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.arenaTex || !this.X || this.X.gl.isContextLost()) return; drawArena(this.arenaCv); updateTexture(this.X, this.arenaTex, this.arenaCv); }); } catch { /* yok say */ }
    this.arenaKey = '';
  }
  freeTex() { if (this.arenaTex && this.X) this.X.gl.deleteTexture(this.arenaTex); this.arenaTex = null; }
  // tabla yarıçapı: masayla büyür; oyuncuların uzattığı ellere değmez
  get RA() {
    const n = Math.max(1, this.seats.length);
    let minR = 9;
    for (let i = 0; i < n; i++) minR = Math.min(minR, this.rAt(this.seatAngle(i), this.R));
    return clamp(Math.min(this.R * Math.min(1, this.kz) * 0.56, minR - 0.58), 0.68, 1.5);
  }
  get propS() { return clamp(this.RA / 0.7, 0.95, 2.1); }
  ensureArena() {
    if (!this.W) return;
    const RA = this.RA;
    const key = RA.toFixed(3);
    if (key === this.arenaKey) return;
    this.arenaKey = key;
    ['aBase', 'aTop', 'ring'].forEach((k) => { if (this.W[k]) E.freeMesh(this.X, this.W[k]); });
    this.W.aBase = this.mk((mb) => arenaBase(mb, RA));
    this.W.aTop = this.mk((tb) => arenaTop(tb, RA), 'tex');
    this.W.ring = this.mk((mb) => ringModel(mb, RA * 0.985, 0.028), 'un');
  }
  propHome(c) { const rp = this.RA * 0.56, a = PROP_A[c]; return [Math.cos(a) * rp, TABLE_Y + ARENA_H, Math.sin(a) * rp]; }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'tk-pick') this.pick(b.dataset.c);
      else if (act === 'tk-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'tk-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('start', { m: this.view?.mode || 'puan' }); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }
  pick(c) {
    const v = this.view;
    if (!v || v.phase !== 'pick' || !v.canPick || !CH.includes(c)) return;
    if (this.localPick && this.localPick.r === v.round && this.localPick.g === v.game) return;
    this.localPick = { r: v.round, g: v.game, c };
    vibrate(16);
    try { this.snd.fx('pick'); } catch { /* yok */ }
    this.ctx.send('pick', { choice: c });
    this.bar();
  }
  myPick() {
    const v = this.view;
    if (!v) return null;
    if (v.myPick) return v.myPick;
    const L = this.localPick;
    return L && L.r === v.round && L.g === v.game ? L.c : null;
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.tkm !== '1') { root.dataset.tkm = '1'; root.innerHTML = '<p class="py-16 text-center">✂️</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    // başkası seçti: tık + etiket
    if (v.phase === 'pick' && prev && prev.phase === 'pick' && prev.round === v.round && prev.game === v.game) {
      let n = 0;
      v.seats.forEach((p, i) => { const q = (prev.seats || []).find((x) => x.id === p.id); if (p.done && q && !q.done && i !== v.me) n++; });
      if (n) { try { this.snd.fx('ready'); } catch { /* yok */ } }
    }
    this.bar();
    this.panel();
  }
  revT() {
    const v = this.view;
    if (!v || v.phase !== 'reveal' || !v.rev) return null;
    return (this.ctx.serverNow() - v.rev.at) / 1000;
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    if (v.phase !== 'reveal') { this.anim = null; this.msgOff(); }
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } this.trophy = null; }
    if (v.phase === 'pick') {
      this.cues = new Set();
      this.trophy = null;
      this.lastTickS = 0;
      try { S.music('race'); S.int = 0; } catch { /* yok */ }
      const fresh = this.ctx.serverNow() < v.endsAt - (v.pickMs || 1e4) + 1500;
      if (fresh) {
        const alive = (v.seats || []).filter((p) => p.el).length;
        if (v.gmode === 'eleme' && alive === 2) { this.msg('⚔️ FİNAL!', 'mid gold'); fx('duel'); }
        else { this.msg(v.gmode === 'eleme' ? `${v.round}. TUR` : `TUR ${v.round}/${v.rounds}`, 'mid'); fx(v.round === 1 ? 'start' : 'round'); }
      }
    }
    if (v.phase === 'reveal' && v.rev) {
      this.cues = new Set();
      const rt = this.revT();
      if (rt != null && rt < B0 + 0.15) {
        try { S.chant([0, 1, 2].map((k) => B0 + k * BEAT - rt)); } catch { /* yok */ }
        vibrate(10);
      }
      this.anim = this.makeAnim(v.rev);
    }
    if (v.phase === 'final' && v.champ) {
      try { S.music('idle'); } catch { /* yok */ }
      const late = this.ctx.serverNow() - (v.finAt || 0) > 2500;
      const ids = v.champ.ids || [];
      const k = ids.length ? v.seats.findIndex((p) => p.id === ids[0]) : -1;
      this.champK = k;
      if (k >= 0) {
        const a = this.seatAngle(k), r = this.placeR(a) - 0.04;
        this.trophy = { k, t: late ? 9 : 0, x: Math.cos(a) * r + Math.sin(a) * 0.32, z: Math.sin(a) * r - Math.cos(a) * 0.32, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), landed: late };
      }
      if (!late) {
        const mine = ids.includes(v.seats[v.me]?.id);
        const nm = ids.length ? (v.seats.find((p) => p.id === ids[0])?.n || '') : '';
        if (ids.length === 1) this.msg(mine ? '👑 KAZANDIN!' : `👑 ${esc(nm.replace(/ 🤖$/, '').toLocaleUpperCase('tr'))}`, 'mid gold');
        else if (ids.length > 1) this.msg('🤝 BERABERE!', 'mid gold');
        fx('champ');
        if (mine) { this.flash('rgba(255,215,90,.6)', true); vibrate([60, 40, 60, 40, 160]); }
        this.resAt = this.time;
      }
    }
  }
  msgOff() { this.el.msg.innerHTML = ''; }
  // tur sonucu → tabladaki canlandırma türü
  makeAnim(r) {
    const has = CH.filter((c) => (r.counts[c] || 0) > 0);
    if (r.kind === 'win' && has.length === 2) { const W = BEATS[has[0]] === has[1] ? has[0] : has[1]; return { kind: 'win', W, L: BEATS[W] }; }
    if (r.kind === 'cycle') return { kind: 'cycle' };
    if (r.kind === 'same' && has.length === 1) return { kind: 'same', c: has[0] };
    return null;
  }

  /* ---------- zaman çizelgesi ipuçları ---------- */
  cue(name, at) {
    if (this.cues.has(name)) return false;
    const rt = this.revT();
    if (rt == null || rt < at) return false;
    this.cues.add(name);
    return rt - at < 0.6 ? 'fresh' : 'late';
  }
  stepCues() {
    const v = this.view;
    if (!v || v.phase !== 'reveal' || !v.rev) return;
    const r = v.rev, S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    for (let k = 0; k < 3; k++) {
      const q = this.cue('b' + k, B0 + k * BEAT);
      if (q === 'fresh' && !this.cues.has('show')) { this.msg(WORDS[k], k === 2 ? 'tkw gold' : 'mid'); this.cam.shake = Math.max(this.cam.shake, 0.16 + k * 0.07); if (k === 2) vibrate(20); }
    }
    const qs = this.cue('show', SHOW);
    if (qs) {
      // eller açıldı: el başına küçük toz bulutu
      this.seats.forEach((p, i) => {
        if (!r.picks[i]) return;
        const a = this.av.get(p.id);
        if (a && qs === 'fresh') this.burst(a.hw[0][0], a.hw[0][1] + 0.04, a.hw[0][2], 5, [[1, 1, 1], SHAPE_RGB[r.picks[i]]], 0.9, 0.035, true, 0.45, 1.5);
      });
      if (qs === 'fresh') this.flash('rgba(255,240,200,.35)');
    }
    const qr = this.cue('res', RES);
    if (qr) {
      try { S.music('calm'); } catch { /* yok */ }
      const i = v.me;
      if (qr === 'fresh' && i >= 0 && r.picks[i]) {
        const w = r.wins[i], l = r.losses[i];
        if (v.gmode === 'eleme' && r.duel) fx(r.point === i ? 'win' : r.point >= 0 ? 'lose' : 'tie');
        else if (v.gmode === 'eleme') { if (!r.out.includes(i) && r.out.length) fx('win'); else if (!r.out.length) fx('tie'); }
        else fx(w > l ? 'win' : w < l ? 'lose' : 'tie');
        if (r.best.includes(i) && w > 0 && v.gmode !== 'eleme') { this.flash('rgba(90,240,140,.45)'); vibrate(40); }
      }
      this.bar();
    }
    // tabla canlandırması
    const A = this.anim;
    if (A) {
      const at = RES;
      if (A.kind === 'win') {
        const hit = A.W === 'tas' ? 0.52 : A.W === 'makas' ? 0.6 : 0.62;
        if (this.cue('a0', at + hit) === 'fresh') {
          if (A.W === 'tas') { fx('clank'); this.cam.shake = Math.max(this.cam.shake, 0.32); const p = this.propHome('makas'); this.burst(p[0], p[1] + 0.06, p[2], 22, [[1, 0.85, 0.4], [1, 1, 0.8]], 1.8, 0.025, true, 0.5, 6); }
          else if (A.W === 'makas') fx('snip');
          else { fx('rustle'); const p = this.propHome('tas'); this.burst(p[0], p[1] + 0.2, p[2], 10, [[1, 1, 0.95]], 0.8, 0.03, false, 0.6, 2); }
        }
        if (A.W === 'makas' && this.cue('a1', at + 0.92) === 'fresh') { fx('snip'); fx('tear'); const p = this.propHome('kagit'); this.burst(p[0], p[1] + 0.03, p[2], 14, [[1, 1, 0.96], [0.9, 0.94, 1]], 1.1, 0.022, false, 0.9, 3); }
      } else if (A.kind === 'cycle') { if (this.cue('a0', at) === 'fresh') fx('whirl'); }
      else if (A.kind === 'same') { if (this.cue('a0', at) === 'fresh') fx('boing'); }
    }
    // eleme damgası
    if (r.out.length) {
      const qo = this.cue('out', OUT_T);
      if (qo === 'fresh') {
        const i = v.me;
        if (r.out.includes(i)) { fx('out'); this.flash('rgba(120,100,140,.6)', true); vibrate([90, 50, 160]); }
        else fx('gone');
        r.out.forEach((k) => { const a = this.avatarAt(k); if (a) this.burst(a.headW[0], a.headW[1] + 0.1, a.headW[2], 14, [[0.55, 0.52, 0.6], [0.8, 0.78, 0.85]], 1.2, 0.05, false, 0.9, 2); });
        this.cam.shake = Math.max(this.cam.shake, 0.2);
      }
    }
  }

  /* ---------- karakterler ---------- */
  outNow(i) {
    const v = this.view, p = v?.seats?.[i];
    if (!p || !p.out) return false;
    if (v.phase === 'reveal' && v.rev && v.rev.out.includes(i)) { const rt = this.revT(); return rt != null && rt >= OUT_T; }
    return true;
  }
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, ph = v.phase, rev = v.rev, rt = this.revT();
    const n = Math.max(1, this.seats.length);
    const ctr = [0, TABLE_Y + 0.12, 0];
    const cam = [this.cam.ex, this.cam.ey, this.cam.ez];
    const champ = this.champK ?? -1;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      if (!a.handK) a.handK = [1, 1];
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null, th: hs(i, 7) * 4 };
      const S = a.idle;
      let hk = 1;
      const out = this.outNow(i);
      if (ph === 'pick') {
        const mine = i === v.me;
        const done = p.done || (mine && !!this.myPick());
        if (out || !p.el) { a.pose('lean', { t }); a.expr = 'smile'; a.look = ctr; }
        else if (done) {
          // hazır: yumruk önde, sabırsız sallanır
          const sh = Math.sin(t * 13 + i * 1.7) * 0.012;
          setP(a, { lean: 0.13, h: [{ p: [-0.15, 0.91 + sh, 0.42], f: [0.1, 0.25, 1], pa: [1, 0, 0], s: 'fist', e: [-0.8, -0.5, -0.2] }, restH(1)] });
          a.expr = 'grin';
          S.lt -= dt;
          if (S.lt <= 0 || !S.look) { S.lt = 1.2 + Math.random() * 2.2; const o = this.seats.findIndex((q, k) => k !== i && q.el && !q.done); const ob = o >= 0 ? this.avatarAt(o) : null; S.look = ob && Math.random() < 0.65 ? ob.headW.slice() : Math.random() < 0.5 ? cam : ctr; }
          a.look = S.look;
        } else {
          // düşünüyor: ya çene elde, ya el masada şekilden şekle geçer
          S.th -= dt;
          if (S.th <= -4) S.th = 2 + Math.random() * 2;
          if (S.th > 0) { a.pose('chin', { t }); a.expr = 'tense'; a.look = ctr; }
          else {
            const sh = HAND[CH[Math.floor((t * 1.8 + i) % 3)]];
            setP(a, { lean: 0.16, h: [{ p: [-0.09, 0.84, 0.44], f: [0.1, -0.12, 1], pa: [0.2, -1, 0], s: sh }, restH(1)] });
            a.expr = 'tense'; a.look = a.hw ? [a.hw[0][0], a.hw[0][1], a.hw[0][2]] : ctr;
          }
        }
      } else if (ph === 'reveal' && rev && rt != null) {
        const pk = rev.picks[i];
        if (!pk) {
          if (out || p.out) { a.pose('lean', { t }); a.expr = 'smile'; }
          else { a.pose('rest', { t }); a.expr = rt > SHOW ? 'o' : 'smile'; }
          a.look = ctr;
        } else if (rt < SHOW) {
          // "Taş! Kağıt! Makas!": yumruk üç kez iner
          const h = pumpH(rt);
          // yumruk başın yanında kalkar, masanın önüne çekiç gibi iner (yüzü örtmez)
          setP(a, { lean: 0.13 + 0.08 * (1 - h), rise: 0.012 * (1 - h), roll: 0.04 * h, k: 30, h: [{ p: [lerp(-0.1, -0.35, h), lerp(0.88, 1.2, h), lerp(0.5, 0.25, h)], f: [lerp(0.1, -0.2, h), lerp(-0.1, 0.75, h), lerp(1, 0.5, h)], pa: [1, 0, 0], s: 'fist', e: [-0.9, -0.35, -0.25] }, restH(1)] });
          a.expr = 'tense'; a.look = ctr;
        } else {
          this.poseThrow(a, i, pk, rev, rt, out);
          hk = 1 + 0.95 * sst(SHOW, SHOW + 0.14, rt);
        }
      } else if (ph === 'final') {
        const win = (v.champ?.ids || []).includes(p.id);
        const u = this.time - (this.resAt || 0);
        if (win) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = cam; }
        else { a.pose(Math.floor(u / 2.6 + i) % 3 === 0 ? 'rest' : 'clap', { t }); a.expr = 'grin'; const w = champ >= 0 ? this.avatarAt(champ) : null; a.look = w ? w.headW : ctr; }
        if (out && !win && Math.floor(u / 3 + i) % 4 === 0) { a.pose('lean', { t }); a.expr = 'smile'; }
      } else {
        // giriş: ruh hali değişir, bakış komşulara / ortaya / kameraya kayar
        S.mt -= dt;
        if (S.mt <= 0) { S.mood = Math.random() < 0.55 ? 'rest' : 'chin'; S.mt = 5 + Math.random() * 7; }
        S.lt -= dt;
        if (S.lt <= 0) {
          S.lt = 1.8 + Math.random() * 3.5;
          const r = Math.random();
          const nb = this.avatarAt((i + (r < 0.5 ? 1 : n - 1)) % n);
          S.look = r < 0.7 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? ctr : cam;
          a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
        }
        if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = cam; }
        else { a.pose(S.mood, { t }); a.look = S.look; }
      }
      a.handK[0] = damp(a.handK[0], hk, 14, dt);
      a.handK[1] = 1;
    });
  }
  // eller açıldıktan sonra: sağ el ortaya uzanır (seçilen şekil), sol el ve yüz sonuca tepki verir
  poseThrow(a, i, pk, rev, rt, out) {
    const t = this.time;
    const w = rev.wins[i], l = rev.losses[i];
    const Rh = { p: [-0.06, 0.9, 0.6], f: [0.04, -0.06, 1], pa: pk === 'tas' ? [0.25, -1, 0] : [0, -1, 0.05], s: HAND[pk], e: [-0.7, -0.6, -0.2] };
    let L = restH(1), lean = 0.25, rise = 0, expr = 'o', look = [0, TABLE_Y + 0.12, 0];
    if (rt >= RES) {
      const u = rt - RES;
      const eleme = this.view?.gmode === 'eleme';
      const good = eleme ? (rev.duel ? rev.point === i : !rev.out.includes(i) && rev.out.length > 0) : w > l;
      const bad = eleme ? (rev.duel ? rev.point >= 0 && rev.point !== i : rev.out.includes(i)) : w < l;
      if (out) { a.pose('slump', { t }); a.expr = rt < OUT_T + 1.4 ? 'wince' : 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
      if (rev.champ === i) { a.pose('cheer', { t }); a.expr = 'laugh'; a.look = [this.cam.ex, this.cam.ey, this.cam.ez]; return; }
      if (good) {
        const b = Math.abs(Math.sin(t * 9 + i));
        L = { p: [0.3, 1.36 + b * 0.05, 0.14], f: [-0.1, 1, 0.1], pa: [-1, 0, 0], s: 'fist', e: [1, 0, -0.3], w: 0.7 };
        lean = 0.14; rise = b * 0.02; expr = u < 2.2 ? 'laugh' : 'grin';
        look = [this.cam.ex, this.cam.ey, this.cam.ez];
      } else if (bad) {
        L = { p: [0.03, 1.27, 0.28], f: [0, 1, 0.2], pa: [0, 0, -1], s: 'open', e: [0.6, -0.9, -0.2], w: 0.8 };
        lean = 0.3; expr = u < 1.5 ? 'wince' : 'sad'; look = null;
      } else {
        L = { p: [0.36, 0.98, 0.24], f: [0.6, 0.2, 0.8], pa: [0, 1, 0], s: 'open', e: [1, -0.6, 0], w: 0.8 };
        rise = 0.018; expr = u < 1.2 ? 'o' : 'smile';
      }
    }
    setP(a, { lean, rise, k: rt < SHOW + 0.25 ? 30 : 10, h: [Rh, L] });
    a.expr = expr;
    a.look = look;
    if (!look) { a.tgt.hy = 0; a.tgt.hp = 0.32; }
  }
  avTint(a, i) {
    const v = this.view;
    let want = 1;
    if (this.outNow(i)) want = 0.62;
    else if (v?.phase === 'final' && this.champK >= 0 && !(v.champ?.ids || []).includes(this.seats[i]?.id)) want = 0.86;
    a.dimK = damp(a.dimK ?? 1, want, 3, 0.016);
    return a.dimK;
  }

  /* ---------- tabla canlandırması ---------- */
  // her elin anlık dönüşümü: konum, dönüş, ölçek, makas açısı, kâğıt yarılma, sarma
  propPose(c, rt) {
    const v = this.view, rev = v?.phase === 'reveal' ? v.rev : null;
    const h = this.propHome(c);
    const o = { x: h[0], y: h[1], z: h[2], yaw: PROP_YAW[c], rx: 0, rz: 0, s: this.propS, blade: 0.42, split: 0, wrap: 0, hide: 0, dim: 1 };
    const t = this.time;
    o.y += 0.006 * (0.5 + 0.5 * Math.sin(t * 1.7 + PROP_A[c] * 3));
    if (v?.phase === 'pick') { const p = clamp(1 - (v.endsAt - this.ctx.serverNow()) / (v.pickMs || 1e4), 0, 1); o.y += 0.015 * p * (0.5 + 0.5 * Math.sin(t * (6 + 10 * p) + PROP_A[c])); }
    if (!rev || rt == null) { if (c === 'makas') o.blade = 0.42 + 0.06 * Math.sin(t * 1.3); return o; }
    const n = rev.counts[c] || 0;
    const kk = sst(SHOW - 0.05, SHOW + 0.3, rt);
    o.s *= lerp(1, n ? 1 + 0.07 * Math.min(4, n) : 0.84, kk);
    if (!n) o.dim = lerp(1, 0.6, kk);
    const A = this.anim, u = rt - RES;
    if (!A || u < 0) return o;
    const S = this.propS;
    if (A.kind === 'cycle') {
      const p = ease(u / 1.5);
      const ph = TAU * p, ca = Math.cos(ph), sa = Math.sin(ph);
      const x = o.x, z = o.z;
      o.x = x * ca - z * sa; o.z = x * sa + z * ca;
      o.y += 0.14 * S * Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p * 0.3);
      o.yaw += ph;
      return o;
    }
    if (A.kind === 'same') {
      if (c === A.c) { const b = Math.abs(Math.sin(u * 8.5)) * Math.exp(-u * 1.3); o.y += 0.12 * S * b; o.s *= 1 + 0.08 * b; }
      return o;
    }
    // iki el: kazanan kaybedene saldırır
    const W = A.W, Lc = A.L;
    if (c !== W && c !== Lc) return o;
    const hW = this.propHome(W), hL = this.propHome(Lc);
    if (W === 'tas') {
      if (c === 'tas') {
        const top = 0.07 * S;
        if (u < 0.38) { const k = easeOut(u / 0.38); o.x = lerp(hW[0], hL[0], k * 0.95); o.z = lerp(hW[2], hL[2], k * 0.95); o.y = hW[1] + 0.4 * S * Math.sin(k * Math.PI / 2); o.rz = -0.6 * k; }
        else if (u < 0.52) { const k = easeIn((u - 0.38) / 0.14); o.x = lerp(hW[0], hL[0], 0.95); o.z = lerp(hW[2], hL[2], 0.95); o.y = lerp(hW[1] + 0.4 * S, hL[1] + top, k); o.rz = -0.6 + 0.6 * k; }
        else if (u < 1.35) { const q = u - 0.52; o.x = lerp(hW[0], hL[0], 0.95); o.z = lerp(hW[2], hL[2], 0.95); o.y = hL[1] + top + Math.abs(Math.sin(q * 11)) * 0.04 * S * Math.exp(-q * 6); o.rz = 0.08 * Math.sin(q * 9) * Math.exp(-q * 2); }
        else if (u < 1.95) { const k = ease((u - 1.35) / 0.6); o.x = lerp(hL[0], hW[0], k * 1.05 - 0.05 * k * k); o.z = lerp(hL[2], hW[2], k); o.y = lerp(hL[1] + top, hW[1], k) + 0.3 * S * Math.sin(k * Math.PI); o.rz = 0.5 * Math.sin(k * Math.PI); }
        o.yaw += u < 1.95 ? Math.min(1, u / 1.95) * 1.2 : 1.2;
      } else {
        // makas: ezilir, bıçaklar açılır, zıplar; sonra toparlanır
        if (u >= 0.52) {
          const q = u - 0.52;
          o.blade = u < 1.6 ? lerp(0.42, 1.15, easeOut(q / 0.12)) : lerp(1.15, 0.42, ease((u - 1.6) / 0.5)) + 0.05 * Math.sin((u - 1.6) * 20) * Math.exp(-(u - 1.6) * 4);
          o.y += Math.abs(Math.sin(q * 13)) * 0.05 * S * Math.exp(-q * 5);
          o.yaw += 0.5 * easeOut(q / 0.2) * (1 - ease((u - 1.7) / 0.6));
          o.rz = 0.12 * Math.sin(q * 17) * Math.exp(-q * 5);
          if (u < 1.35) o.s *= lerp(1, 0.92, easeOut(q / 0.1));
        }
      }
    } else if (W === 'makas') {
      // makas kâğıda kayar, iki kez keser; kâğıt ikiye ayrılır
      const py = PROP_YAW.kagit;
      const cut = [hL[0] + Math.sin(py) * -(PD / 2 + 0.03) * S, hL[2] + Math.cos(py) * -(PD / 2 + 0.03) * S];
      if (c === 'makas') {
        const yawCut = py - Math.PI / 2;
        if (u < 0.4) { const k = ease(u / 0.4); o.x = lerp(hW[0], cut[0], k); o.z = lerp(hW[2], cut[1], k); o.yaw = PROP_YAW.makas + angDiff(yawCut, PROP_YAW.makas) * k; o.y += 0.05 * S * Math.sin(k * Math.PI); o.blade = lerp(0.42, 0.62, k); }
        else if (u < 1.05) {
          o.x = cut[0]; o.z = cut[1]; o.yaw = yawCut; o.y += 0.012 * S;
          const q = u - 0.4;
          const snip = (c0) => Math.exp(-Math.pow((q - c0) / 0.07, 2));
          o.blade = 0.62 - 0.6 * Math.max(snip(0.2), snip(0.52));
          // ikinci kesişte kâğıdın içine ilerler
          const fw = 0.12 * S * sst(0.2, 0.55, q);
          o.x += Math.sin(py) * fw; o.z += Math.cos(py) * fw;
        } else if (u < 1.65) {
          const k = ease((u - 1.05) / 0.6);
          const sx = cut[0] + Math.sin(py) * 0.12 * S, sz = cut[1] + Math.cos(py) * 0.12 * S;
          o.x = lerp(sx, hW[0], k); o.z = lerp(sz, hW[2], k); o.yaw = yawCut + angDiff(PROP_YAW.makas, yawCut) * k; o.y += 0.06 * S * Math.sin(k * Math.PI); o.blade = lerp(0.1, 0.42, k);
        }
      } else {
        const sp = u < 0.92 ? 0 : u < 2.6 ? easeOut((u - 0.92) / 0.3) : 1 - ease((u - 2.6) / 0.6);
        o.split = sp;
      }
    } else {
      // kâğıt uçup taşın üstüne kapanır, onu sarar; sonra açılıp yerine döner
      if (c === 'kagit') {
        if (u < 0.5) { const k = ease(u / 0.5); o.x = lerp(hW[0], hL[0], k); o.z = lerp(hW[2], hL[2], k); o.y = hW[1] + 0.42 * S * Math.sin(k * Math.PI * 0.8) + 0.22 * S * k; o.rx = TAU * k; o.yaw += 1.4 * k; }
        else if (u < 0.66) { const k = easeIn((u - 0.5) / 0.16); o.x = hL[0]; o.z = hL[2]; o.y = lerp(hW[1] + 0.42 * S * Math.sin(Math.PI * 0.8) + 0.22 * S, hL[1] + 0.2 * S, k); o.yaw += 1.4; o.s *= lerp(1, 0.75, k); }
        else if (u < 2.25) { o.hide = 1; o.x = hL[0]; o.z = hL[2]; }
        else if (u < 2.95) { const k = ease((u - 2.25) / 0.7); o.x = lerp(hL[0], hW[0], k); o.z = lerp(hL[2], hW[2], k); o.y = hL[1] + 0.25 * S * (1 - k) + 0.3 * S * Math.sin(k * Math.PI); o.yaw += 1.4 * (1 - k); o.s *= lerp(0.75, 1, k); }
      } else {
        o.wrap = u < 0.62 ? 0 : u < 2.25 ? easeOut((u - 0.62) / 0.14) : 1 - ease((u - 2.25) / 0.2);
        if (u > 0.62 && u < 2.3) { const q = u - 0.62; o.rz = 0.09 * Math.sin(q * 7) * Math.exp(-q * 0.9); o.y += Math.abs(Math.sin(q * 10)) * 0.03 * S * Math.exp(-q * 4); }
      }
    }
    return o;
  }

  /* ---------- kamera koreografisi ---------- */
  tick(dt) {
    if (this.X && this.W) this.ensureArena();
    this.stepCues();
    this.stepTrophy(dt);
    const v = this.view, c = this.cam;
    if (!v) return;
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0;
    const rt = this.revT();
    const sNow = this.ctx.serverNow();
    if (v.phase === 'pick') {
      const p = clamp(1 - (v.endsAt - sNow) / (v.pickMs || 1e4), 0, 1);
      zoom = lerp(1, 0.93, p); pa = 0.03;
      if (this.snd) this.snd.int = p;
      this.frameOff = 0; this.frameOffX = 0;
    } else if (v.phase === 'reveal' && rt != null) {
      // tezahürat: alçak açıdan yumrukların inişi; eller açılınca tepeden şekiller; sonuçta geri çekilir
      if (rt < SHOW) { const k = sst(-0.12, 0.45, rt); pa = lerp(0.02, -0.13, k); zoom = lerp(0.97, 0.74, k); }
      else if (rt < RES + 0.35) { const k = sst(SHOW - 0.08, SHOW + 0.3, rt); pa = lerp(-0.13, 0.17, k); zoom = lerp(0.74, 0.68, k); }
      else { const k = sst(RES + 0.35, RES + 1.35, rt); pa = lerp(0.17, 0.02, k); zoom = lerp(0.68, 0.96, k); }
      if (v.rev.duel) {
        // final düellosu: iki oyuncunun arasına odaklan
        const ids = v.seats.map((p, i) => i).filter((i) => v.rev.picks[i]);
        if (ids.length === 2) { const A = this.avatarAt(ids[0]), B = this.avatarAt(ids[1]); if (A && B) { fx = (A.pos[0] + B.pos[0]) * 0.22; fz = (A.pos[2] + B.pos[2]) * 0.22; zoom *= 0.92; } }
      }
      this.frameOff = 0; this.frameOffX = 0;
    } else if (v.phase === 'final' && this.champK >= 0) {
      const a = this.avatarAt(this.champK);
      if (a) {
        // önce kutlama (kart yok, şampiyon ortada), sonra kart: şampiyon kartın üstünde (yatayda solda) kalır
        const card = this.finCard();
        yaw = -Math.PI / 2 - this.seatAngle(this.champK);
        zoom = card ? 0.62 : 0.52; pa = -0.34;
        const land = this.vw > this.vh * 1.1;
        const f = this.aimAt(a.headW, land && card ? 0.3 : 0.5, land ? 0.4 : card ? 0.2 : 0.4, yaw, pa);
        fx = f[0]; fy = f[1]; fz = f[2];
      }
    } else {
      this.frameOff = 0; this.frameOffX = 0;
      yaw = Math.sin(this.time * 0.13) * 0.06;
    }
    if (v.phase !== 'pick' && this.snd) this.snd.int = 0;
    // alttaki arayüzün kapladığı yer: kamera sahneyi onun üstüne sığdırır
    const bp = v.phase === 'pick' ? 178 : v.phase === 'reveal' ? (rt != null && rt >= RES - 0.2 ? 215 : 44) : v.phase === 'final' ? 120 : 290;
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    // yatay ekranda arayüz sağda: masa dikeyde tüm yüksekliği kullanır, ortası biraz sola kayar
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    if (land) {
      const bpl = v.phase === 'final' ? 40 : 34;
      if (bpl !== this.cfg.botPxL) { this.cfg.botPxL = bpl; this.fitKey = ''; }
      const ui = v.phase === 'pick' || v.phase === 'intro' || (v.phase === 'reveal' && rt != null && rt >= RES - 0.2);
      if (v.phase !== 'final') { const f = this.aimAt([0, 0.7, 0], ui ? 0.4 : 0.5, 0.5, yaw, pa); fx = f[0]; fy = f[1]; fz = f[2]; }
    }
    const rv = v.phase === 'reveal';
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, rv ? 4 : 2.2, dt);
    c.fx = fx; c.fz = fz; c.fy = fy;
    c.pitchAdd = damp(c.pitchAdd, pa, rv ? 4.2 : 2.4, dt);
  }
  // H noktası ekranda (sx, sy) konumunda görünsün diye kameranın bakacağı yer (yaw ve eğim hedefleri için)
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  stepTrophy(dt) {
    const T = this.trophy;
    if (!T) return;
    T.t += dt;
    if (!T.landed && T.t >= 0.9) {
      T.landed = true;
      try { this.snd.fx('thud'); } catch { /* yok */ }
      this.cam.shake = Math.max(this.cam.shake, 0.22);
      const a = this.avatarAt(T.k);
      const CF = [[1, 0.82, 0.25], [1, 0.35, 0.4], [0.3, 0.86, 0.45], [0.3, 0.66, 1], [0.78, 0.5, 1]];
      if (a) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, CF, 2.6, 0.04, false, 2.2, 2.2);
      this.burst(T.x, TABLE_Y + 0.35, T.z, 24, [[1, 0.9, 0.5], [1, 1, 0.85]], 1.4, 0.03, true, 0.8, 1.5);
    }
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W;
    if (!Wd || !Wd.aBase) return;
    const m = this.mats.b, T = this.T;
    M.set(m, 0, TABLE_Y, 0);
    D(Wd.aBase, m, T.obj);
    const rt = this.revT();
    const tint = this.pTint || (this.pTint = new Float32Array(3));
    for (const c of CH) {
      const o = this.propPose(c, rt);
      tint[0] = tint[1] = tint[2] = o.dim;
      if (c === 'tas') {
        M.set(m, o.x, o.y, o.z, o.yaw, o.rx, o.rz, o.s);
        D(Wd.rock, m, tint);
        if (o.wrap > 0.01) { M.set(m, o.x, o.y, o.z, o.yaw + 0.6, o.rx, o.rz, o.s * (0.6 + 0.4 * o.wrap), o.s * o.wrap, o.s * (0.6 + 0.4 * o.wrap)); D(Wd.wrap, m, ONE3); }
      } else if (c === 'kagit') {
        if (o.hide) continue;
        const sp = o.split;
        const m2 = this.mats.c;
        for (const sx of [-1, 1]) {
          const lx = sx * sp * 0.075, ry = sx * sp * 0.3;
          M.set(m, o.x, o.y, o.z, o.yaw, o.rx, o.rz, o.s);
          M.set(this.tmpP || (this.tmpP = M.make()), lx, 0.002 * sp, 0, ry);
          M.mul(m2, m, this.tmpP);
          D(sx < 0 ? Wd.paperL : Wd.paperR, m2, tint);
        }
      } else {
        const m2 = this.mats.c;
        M.set(m, o.x, o.y, o.z, o.yaw, o.rx, o.rz, o.s);
        for (const sg of [1, -1]) {
          M.set(this.tmpP || (this.tmpP = M.make()), 0, 0, 0, -sg * o.blade * 0.5);
          M.mul(m2, m, this.tmpP);
          D(sg > 0 ? Wd.scA : Wd.scB, m2, tint);
        }
      }
    }
    // şampiyon kupası
    const Tr = this.trophy;
    if (Tr) {
      const p = clamp(Tr.t / 0.9, 0, 1);
      const y = TABLE_Y + 0.004 + (Tr.landed ? Math.max(0, Math.sin((Tr.t - 0.9) * 14) * 0.03 * Math.exp(-(Tr.t - 0.9) * 6)) : (1 - p * p) * 1.6);
      M.set(m, Tr.x, y, Tr.z, Tr.yaw + (Tr.landed ? 0 : (1 - p) * 4), 0, 0, 1.15);
      D(Wd.trophy, m, T.obj);
    }
  }
  drawTex(F, L) {
    const X = this.X, gl = X.gl, Wd = this.W;
    if (!Wd || !Wd.aTop || !this.arenaTex) return;
    const m = this.mats.b;
    gl.uniform1f(X.tex.u.uSelf, 0.16);
    gl.bindTexture(gl.TEXTURE_2D, this.arenaTex);
    M.set(m, 0, TABLE_Y, 0);
    drawMesh(X, Wd.aTop, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0.32);
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    const s = this.RA / 0.95;
    M.set(m, 0, TABLE_Y, 0, Math.PI / 2 + Math.sin(this.time * 0.4) * 0.15, 0, 0, s, 1, s);
    drawMesh(X, Wd.hub, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  drawShadowsExtra(m) {
    const X = this.X;
    const rt = this.revT();
    // havadaki ellerin ve kupanın yumuşak gölgesi
    for (const c of CH) {
      const o = this.propPose(c, rt);
      const h = o.y - (TABLE_Y + ARENA_H);
      if (h < 0.03 || o.hide) continue;
      M.set(m, o.x, TABLE_Y + ARENA_H + 0.003, o.z, 0, 0, 0, (0.22 + h * 0.2) * o.s, 1, (0.2 + h * 0.2) * o.s);
      drawMesh(X, this.res.shadow, m, ONE3, clamp(0.55 - h * 0.6, 0.1, 0.55));
    }
    const Tr = this.trophy;
    if (Tr && !Tr.landed) {
      const p = clamp(Tr.t / 0.9, 0, 1), h = (1 - p * p) * 1.6;
      M.set(m, Tr.x, TABLE_Y + 0.006, Tr.z, 0, 0, 0, 0.18 + h * 0.15, 1, 0.18 + h * 0.15);
      drawMesh(X, this.res.shadow, m, ONE3, clamp(0.6 - h * 0.3, 0.1, 0.6));
    }
  }
  drawFx(F, m) {
    const X = this.X, Wd = this.W;
    if (!Wd || !Wd.ring) return;
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    // süre halkası
    if (v.phase === 'pick') {
      const left = clamp((v.endsAt - sNow) / (v.pickMs || 1e4), 0, 1);
      M.set(m, 0, TABLE_Y, 0);
      drawMesh(X, Wd.ring, m, [0.5, 0.45, 0.4], 0.12);
      const k = Math.ceil(left * RING_N);
      if (k > 0) {
        const hot = left < 0.3;
        const col = left > 0.55 ? [0.35, 1, 0.6] : hot ? [1, 0.32, 0.25] : [1, 0.82, 0.3];
        const al = hot ? 0.75 + 0.25 * Math.sin(this.time * 14) : 0.8;
        const part = this.ringPart || (this.ringPart = { b: null, n: 0, kind: 'un' });
        part.b = Wd.ring.b; part.n = k * 6;
        drawMesh(X, part, m, col, al);
      }
    }
    const rt = this.revT();
    // sonuçta kazanan elin altı parlar
    if (v.phase === 'reveal' && v.rev && rt != null && rt > SHOW) {
      const r = v.rev;
      const k = sst(SHOW, SHOW + 0.4, rt);
      for (const c of CH) {
        const n = r.counts[c] || 0;
        if (!n) continue;
        const won = (r.counts[BEATS[c]] || 0) > 0;
        const o = this.propPose(c, rt);
        const pulse = 0.6 + 0.3 * Math.sin(this.time * 6 + PROP_A[c]);
        M.set(m, o.x, TABLE_Y + ARENA_H + 0.004, o.z, 0, 0, 0, 0.36 * o.s, 1, 0.36 * o.s);
        drawMesh(X, this.res.glow, m, SHAPE_RGB[c], k * (won ? 0.75 * pulse : 0.22));
      }
    }
    // atılan ellerin altında şekil rengi parıltı (masa örtüsünde okunaklı olsun)
    if (v.phase === 'reveal' && v.rev && rt != null && rt > SHOW) {
      const k = sst(SHOW, SHOW + 0.3, rt);
      this.seats.forEach((p, i) => {
        const pk = v.rev.picks[i];
        const a = this.av.get(p.id);
        if (!pk || !a || this.outNow(i)) return;
        const h = a.hw[0];
        M.set(m, h[0], TABLE_Y + 0.006, h[2], 0, 0, 0, 0.34, 1, 0.34);
        drawMesh(X, this.res.glow, m, SHAPE_RGB[pk], k * 0.5);
      });
    }
    // koltuk halkaları: seçim yapmadıysam benimki nabız gibi atar; finalde şampiyonun altı parlar
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      let al = 0, col = hexRGB(pcol(p.c));
      if (v.phase === 'final' && i === this.champK) { al = 0.75 + 0.2 * Math.sin(this.time * 5); col = [1, 0.85, 0.35]; }
      else if (i === this.me && v.phase === 'pick' && v.canPick && !this.myPick()) al = 0.35 + 0.25 * Math.sin(this.time * 6);
      else if (i === this.me && v.phase !== 'final') al = 0.2;
      if (al <= 0) return;
      M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 0.95, 1, 0.95);
      drawMesh(X, this.res.glow, m, col, al * 0.6);
    });
  }
  // isim etiketlerinden sonra tabladaki sayaç rozetlerini yerleştir
  placeLbls() {
    super.placeLbls();
    const v = this.view;
    const rt = this.revT();
    const show = v && v.phase === 'reveal' && v.rev && rt != null && rt >= SHOW + 0.1 && !this.flat;
    for (const c of CH) {
      const o = this.cntEl[c];
      if (!show) { if (o.on) { o.on = false; o.el.classList.remove('on'); } continue; }
      const r = v.rev, n = r.counts[c] || 0;
      const won = n && (r.counts[BEATS[c]] || 0) > 0, lost = n && CH.some((q) => BEATS[q] === c && (r.counts[q] || 0) > 0);
      const k = `${n}|${won}|${lost}`;
      if (k !== o.k) { o.k = k; o.b.textContent = String(n); o.el.className = `tk-cnt${won ? ' win' : lost ? ' lose' : ''}${n ? '' : ' zero'}`; }
      if (!o.on) { o.on = true; o.el.classList.add('on'); }
      // rozet maketin önünde, tabladaki adının üstünde (maketi ve elleri örtmesin)
      const h = this.propHome(c);
      const q = this.project(h[0], TABLE_Y + ARENA_H + 0.03, h[2] + this.RA * 0.335);
      if (q) o.el.style.transform = `translate(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px) translate(-50%,-50%)`;
    }
  }

  /* ---------- arayüz ---------- */
  resCard() {
    const v = this.view, r = v.rev, i = v.me;
    const cn = `<div class="cn">${CH.map((c) => { const n = r.counts[c] || 0, won = n && (r.counts[BEATS[c]] || 0) > 0; return `<span class="${won ? 'w' : n ? '' : 'z'}">${EMO[c]} ${n}</span>`; }).join('')}</div>`;
    const eleme = v.gmode === 'eleme';
    const last = eleme ? r.champ >= 0 : v.round >= v.rounds;
    const nx = `<div class="nx">${last ? 'Sonuçlar geliyor…' : eleme && !r.out.length && !(r.duel && r.point >= 0) ? 'Tekrar oynanıyor…' : 'Sıradaki tur geliyor…'}</div>`;
    let cls = '', lb = '', big = '', q = '';
    if (i < 0 || (!r.picks[i] && v.seats[i]?.out && !r.out.includes(i))) {
      lb = eleme ? `${v.round}. tur` : `Tur ${v.round}/${v.rounds}`;
      big = r.kind === 'empty' ? '😴 Kimse seçmedi' : r.kind === 'same' ? '🤝 Herkes aynı!' : r.kind === 'cycle' ? '🌀 Üçü birden!' : `${EMO[this.anim?.W || 'tas']} ${NAME[this.anim?.W || 'tas']} kazandı`;
      q = eleme && r.out.length ? `${r.out.length} kişi elendi` : r.kind === 'win' && this.anim ? `${NAME[this.anim.W]} ${VERB[this.anim.W]}` : '';
      if (eleme && r.duel) {
        const d = this.duelists();
        const sc = d.length === 2 ? this.duelScore(d[0], d[1]) : '';
        if (r.champ >= 0) { big = `👑 ${esc(v.seats[r.champ].n)} şampiyon!`; q = `Final ${sc}`; }
        else if (r.point >= 0) { big = `🎯 ${esc(v.seats[r.point].n)} sayıyı aldı`; q = `Düello: ${d.map((k) => esc(v.seats[k].n)).join(' – ')} · ${sc}`; }
        else { big = '🤝 Berabere, tekrar!'; q = sc ? `Düello: ${sc}` : ''; }
      }
    } else if (!r.picks[i]) {
      cls = eleme ? 'out' : 'lose';
      lb = 'Süre doldu';
      big = '😴 Seçmedin';
      q = eleme ? 'Seçim yapmadığın için elendin' : 'Bu turdan puan alamadın';
    } else {
      const pk = r.picks[i], w = r.wins[i], l = r.losses[i];
      lb = `${EMO[pk]} ${NAME[pk]} seçtin`;
      if (eleme && r.duel) {
        const o = this.duelists().find((k) => k !== i) ?? -1;
        const sc = this.duelScore(i, o);
        if (r.champ === i) { cls = 'win'; big = '👑 Şampiyon sensin!'; q = `Final düellosunu ${sc} kazandın`; }
        else if (r.out.includes(i)) { cls = 'out'; big = '💀 Düelloyu kaybettin'; q = `Final ${sc} bitti`; }
        else if (r.point === i) { cls = 'win'; big = '🎯 Sayı senin!'; q = `Düello: ${sc} · 2 sayı alan kazanır`; }
        else if (r.point >= 0) { cls = 'lose'; big = '😬 Sayı rakibin'; q = `Düello: ${sc} · 2 sayı alan kazanır`; }
        else { big = '🤝 Berabere, tekrar!'; q = `Düello: ${sc} · aynı eli seçtiniz`; }
      } else if (eleme) {
        if (r.champ === i) { cls = 'win'; big = '👑 Şampiyon sensin!'; q = `${w} kişiyi yendin, son kalan sensin`; }
        else if (r.out.includes(i)) { cls = 'out'; big = '💀 Elendin'; q = w ? `${w} kişiyi yendin ama en az yenenlerdendin` : l ? `${l} kişiye yenildin` : 'Kimseyi yenemedin'; }
        else if (!r.out.length) { big = '🤝 Berabere!'; q = r.kind === 'same' ? 'Herkes aynı eli seçti, kimse elenmedi' : 'Herkes eşit, kimse elenmedi'; }
        else { cls = 'win'; big = '✅ Turu geçtin!'; q = `${w} kişiyi yendin${l ? `, ${l} kişiye yenildin` : ''}`; }
      } else {
        const best = r.best.includes(i) && w > 0;
        cls = w > l ? 'win' : w < l ? 'lose' : '';
        big = `<span class="e">${EMO[pk]}</span>+${w} puan${best ? ' 🔥' : ''}`;
        q = w ? `${w} kişiyi yendin${l ? `, ${l} kişiye yenildin` : ''}` : l ? `${l} kişiye yenildin 😬` : r.kind === 'same' ? 'Herkes aynı eli seçti, berabere' : 'Kimseyle karşılaşmadın';
        if (best && r.best.length === 1) q += ' · Turun en iyisi!';
      }
    }
    return `<div class="tk-res ${cls}"><div class="lb">${lb}</div><div class="big">${big}</div>${q ? `<div class="q">${q}</div>` : ''}${cn}${nx}</div>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    const me = v.me, seat = me >= 0 ? v.seats[me] : null;
    let key = `${v.phase}|${v.game}|${v.round}`, html = '';
    if (v.phase === 'pick') {
      const my = this.myPick();
      const ready = v.seats.filter((p) => p.el && p.done).length, tot = v.seats.filter((p) => p.el && (p.on || p.done)).length;
      key += `|${my}|${v.canPick}|${ready}/${tot}|${seat ? seat.el : -1}`;
      if (seat && seat.el) {
        html = `<div class="tk-st">${my ? '🤫 Seçimin gizli' : '🤔 Elini seç!'} <i>·</i> ${ready}/${tot} hazır <i>·</i> ⏱ <b data-cd>${Math.max(0, Math.ceil((v.endsAt - this.ctx.serverNow()) / 1000))}</b></div>
          <div class="tk-pick" role="group" aria-label="Elini seç">${CH.map((c) => `<button class="tk-h ${c} ${my ? (my === c ? 'on' : 'off') : 'wake'}" data-act="tk-pick" data-c="${c}" ${my ? 'disabled' : ''} aria-label="${NAME[c]}"><span class="em">${EMO[c]}</span><b>${NAME[c]}</b></button>`).join('')}</div>`;
      } else {
        html = `<div class="tk-st">${seat ? '💀 Elendin, kalanları izle' : v.gmode === 'eleme' ? '👀 Bu oyunu izliyorsun' : '👀 Bu turu izliyorsun, sonrakinde masadasın'} <i>·</i> ⏱ <b data-cd></b></div>`;
      }
    } else if (v.phase === 'reveal' && v.rev) {
      const rt = this.revT();
      const shown = rt != null && rt >= RES;
      key += '|' + (shown ? 'r' : 'c');
      if (shown) html = this.resCard();
    }
    if (this.setBar(key, html)) this.cdB = this.el.bar.querySelector('[data-cd]');
  }
  // düellodaki iki oyuncu (koltuk sırası) ve skor metni ("1–0"); açılıştan önce bu turun sayısı sayılmaz
  duelists() {
    const v = this.view;
    if (!v) return [];
    // açılışta: turun başında hayatta olanlar (bu tur elenen dahil); seçimde: oynayabilenler
    if (v.phase === 'reveal' && v.rev) return v.seats.map((p, i) => i).filter((i) => !v.seats[i].out || v.rev.out.includes(i)).slice(0, 2);
    return v.seats.map((p, i) => i).filter((i) => v.seats[i].el).slice(0, 2);
  }
  dwNow(i) {
    const v = this.view, p = v?.seats?.[i];
    if (!p) return 0;
    let d = p.dw || 0;
    if (v.phase === 'reveal' && v.rev && v.rev.point === i) { const rt = this.revT(); if (rt == null || rt < RES) d -= 1; }
    return Math.max(0, d);
  }
  duelScore(a, b) { return a >= 0 && b >= 0 ? `${this.dwNow(a)}–${this.dwNow(b)}` : ''; }
  // final kartı kutlamadan sonra açılır
  finCard() { const v = this.view; return !!v && v.phase === 'final' && this.ctx.serverNow() - (v.finAt || 0) >= 2600; }
  modeSeg(v) {
    return `<div class="tk-seg" role="group" aria-label="Oyun modu">
      <button data-act="tk-mode" data-m="puan" class="${v.mode !== 'eleme' ? 'on' : ''}">🏆 5 tur · puan</button>
      <button data-act="tk-mode" data-m="eleme" class="${v.mode === 'eleme' ? 'on' : ''}">🔥 Son kalan kazanır</button></div>
      <div class="tk-md">${v.mode === 'eleme' ? 'Her turda en az kişiyi yenenler elenir. Herkes eşitse tur tekrarlanır. Son kalan kazanır!' : 'Herkes herkese karşı: yendiğin her kişi +1 puan. 5 turun sonunda en çok puanı olan kazanır.'}</div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n >= 2}`;
      html = `<div class="card tk-in">
        <div class="tt">✂️ Taş Kağıt Makas</div>
        <div class="sub">Herkes aynı anda seçer, herkes herkese karşı!</div>
        <div class="tk-ru"><div class="tas"><b>✊</b>Taş makası kırar</div><div class="makas"><b>✌️</b>Makas kâğıdı keser</div><div class="kagit"><b>✋</b>Kâğıt taşı sarar</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="tk-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'Oynamak için masada en az 2 kişi lazım. Oda kodunu paylaş!' : 'Masadaki herkes başlatabilir.'}</div>
      </div>`;
    } else if (v.phase === 'final' && v.champ && this.finCard()) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const sb = v.scoreboard || [];
      const ch = v.champ, ids = ch.ids || [];
      const meId = v.seats[v.me]?.id;
      const nm = (id) => esc(v.seats.find((p) => p.id === id)?.n || sb.find((s) => s.id === id)?.nickname || '');
      const mine = ids.includes(meId);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}|${sb.map((s) => s.id + s.score).join(',')}`;
      const eleme = ch.mode === 'eleme';
      const outOf = (id) => v.seats.find((p) => p.id === id)?.out || 0;
      const tagOf = (s) => (eleme ? (ids.includes(s.id) ? 'son kalan' : `${outOf(s.id)}. tur`) : `${s.score} puan`);
      const list = sb.map((s) => ({ id: s.id, nickname: s.nickname, c: s.c, tag: tagOf(s) }));
      let tt, sub;
      if (eleme) { tt = ids.length ? `👑 ${mine ? 'Şampiyon sensin!' : `Şampiyon: ${nm(ids[0])}`}` : 'Oyun bitti!'; sub = `${ch.rounds} turluk eleme · son kalan kazandı`; }
      else { tt = !ids.length ? 'Kimse puan alamadı!' : ids.length > 1 ? `🤝 Berabere: ${ids.map(nm).join(', ')}` : `🏆 ${mine ? 'Kazandın!' : `${nm(ids[0])} kazandı!`}`; sub = '5 turun toplam puanı · yendiğin her kişi +1'; }
      const rest = list.slice(3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${k + 4}. ${esc(s.nickname)} <b>${esc(eleme ? s.tag : String(sb[k + 3].score))}</b></span>`).join('');
      const top3 = list.slice(0, 3).map((s, k) => `<span class="${s.id === meId ? 'me' : ''}">${['🥇', '🥈', '🥉'][k]} ${esc(s.nickname)} <b>${esc(eleme ? s.tag : String(sb[k].score))}</b></span>`).join('');
      html = `<div class="card tk-fin">
        <div class="tt">${tt}</div>
        <div class="sub">${sub}</div>
        ${podiumTKM(list, meId)}
        <div class="tk-rest tk-top3">${top3}</div>
        ${rest ? `<div class="tk-rest">${rest}</div>` : ''}
        <div class="tk-seg" role="group" aria-label="Oyun modu"><button data-act="tk-mode" data-m="puan" class="${v.mode !== 'eleme' ? 'on' : ''}">🏆 5 tur · puan</button><button data-act="tk-mode" data-m="eleme" class="${v.mode === 'eleme' ? 'on' : ''}">🔥 Son kalan kazanır</button></div>
        <div class="row2"><button class="kb" data-act="tk-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    // geri sayım + son saniyelerde tik-tak
    if (v.phase === 'pick') {
      const left = Math.max(0, Math.ceil((v.endsAt - sNow) / 1000));
      if (this.cdB) { const s = String(left); if (this.cdB.textContent !== s) this.cdB.textContent = s; this.cdB.classList.toggle('hot', left <= 3); }
      if (left <= 3 && left >= 1 && left !== this.lastTickS) { this.lastTickS = left; if (v.canPick && !this.myPick()) { try { this.snd.fx('clock', left === 1 ? 1 : 0); } catch { /* yok */ } } }
    }
    // üst bilgi
    const rt = this.revT();
    const eleme = v.gmode === 'eleme';
    let top = '';
    if (v.phase === 'pick' || v.phase === 'reveal') {
      const aliveNow = v.alive + (v.phase === 'reveal' && v.rev && rt != null && rt < OUT_T ? v.rev.out.length : 0);
      if (eleme && v.duel) { const d = this.duelists(); top = d.length === 2 ? `⚔️ Final · ${v.seats[d[0]].n.replace(/ 🤖$/, '')} ${this.dwNow(d[0])}–${this.dwNow(d[1])} ${v.seats[d[1]].n.replace(/ 🤖$/, '')}` : '⚔️ Final düellosu'; }
      else if (eleme) top = `🔥 Eleme · ${aliveNow} kişi kaldı`;
      else top = `Tur ${v.round}/${v.rounds}`;
    }
    this.top(top);
    // etiketler: seçti mi, ne seçti, kaç puan aldı, toplam puan
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '', cls = '';
      const out = this.outNow(i);
      if (v.phase === 'pick') {
        if (out) x = '<span class="tk-e">💀</span>';
        else if (p.el) x = p.done || (i === v.me && this.myPick()) ? '<span class="tk-ok">✓</span>' : '<span class="tk-th">•••</span>';
        if (!eleme && v.game) x = `<span class="tk-sc">${p.sc}</span>` + x;
      } else if (v.phase === 'reveal' && v.rev) {
        const pk = v.rev.picks[i];
        if (rt != null && rt >= SHOW) {
          if (pk) x = `<span class="tk-e">${EMO[pk]}</span>`;
          else if (!out && !p.out) x = '<span class="tk-e">😴</span>';
          if (pk && rt >= RES && !eleme) { const g = v.rev.gain[i]; x += `<span class="tk-g${g ? '' : ' z'}">+${g}</span>`; }
          if (rt >= RES && v.rev.best.includes(i) && !eleme && v.rev.wins[i] > 0 && v.rev.best.length < v.seats.length) cls = 'best';
        } else if (pk) x = '<span class="tk-ok">✓</span>';
        if (out) x = '<span class="tk-e">💀</span>';
        if (!eleme && v.game) x = `<span class="tk-sc">${rt != null && rt >= RES ? p.sc : p.sc - (v.rev.gain[i] || 0)}</span>` + x;
      } else if (v.phase === 'final') {
        const win = (v.champ?.ids || []).includes(p.id);
        x = win ? '<span class="tk-e">👑</span>' : out ? '<span class="tk-e">💀</span>' : '';
        if (v.champ?.mode !== 'eleme') x = `<span class="tk-sc">${p.sc}</span>` + x;
      }
      if (eleme && v.duel && (v.phase === 'pick' || v.phase === 'reveal') && !out && (p.el || (v.rev && (v.rev.picks[i] || v.rev.point === i)))) {
        const d = this.dwNow(i);
        x += `<span class="tk-dw">${'●'.repeat(Math.min(2, d))}${'○'.repeat(Math.max(0, 2 - d))}</span>`;
      }
      const k = x + '|' + cls + '|' + out;
      if (o.tkK !== k) {
        o.tkK = k;
        let el = o.lbl.querySelector('.tk-x');
        if (!el) { el = document.createElement('span'); el.className = 'tk-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lbl.classList.toggle('out', out);
        o.lbl.classList.toggle('best', cls === 'best');
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    // ad değişince içerik sıfırlanır: ek bilgiyi yeniden yaz
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.tk-x')) o.tkK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const cx = w / 2, cy = h * 0.46, R = r * 0.4;
    const v = this.view;
    g.fillStyle = '#f3e7cb'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.strokeStyle = '#c99a3e'; g.lineWidth = 3; g.stroke();
    const rt = this.revT();
    const rev = v?.phase === 'reveal' ? v.rev : null;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const c of CH) {
      const a = PROP_A[c], x = cx + Math.cos(a) * R * 0.56, y = cy + Math.sin(a) * R * 0.56;
      g.font = '28px system-ui'; g.fillText(EMO[c], x, y);
      if (rev && rt != null && rt >= SHOW) { g.font = '800 14px system-ui'; g.fillStyle = '#1c1633'; g.fillText('×' + (rev.counts[c] || 0), x, y + 22); }
    }
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      let t = '';
      if (v?.phase === 'pick') t = p.done ? '✓' : p.el ? '…' : '💀';
      else if (rev && rt != null) t = rt >= SHOW ? (rev.picks[i] ? EMO[rev.picks[i]] : '😴') : rev.picks[i] ? '✊' : '';
      else if (v?.phase === 'final') t = (v.champ?.ids || []).includes(p.id) ? '👑' : '';
      if (t) { g.font = '22px system-ui'; g.fillText(t, x, y - 36); }
      if (rev && rt != null && rt >= RES && rev.picks[i] && v.gmode !== 'eleme') { g.font = '800 12px system-ui'; g.fillStyle = '#5cf08a'; g.fillText('+' + rev.gain[i], x + 26, y - 18); }
    });
  }
  onDispose() { this.freeTex(); }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new TkmGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[tkm]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
