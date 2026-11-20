// Kör Labirent — 3D restoran masası (NFC Dünyası Oyun)
// Masanın ortasında ahşap bir labirent var. Takımlar ikişer kişi: yürüyenin gözleri bağlı (labirentin duvarlarını görmez,
// yalnız yürüdüğü kareleri ve çarptığı duvarları görür), takım arkadaşları haritayı görüp yol tarif eder — sesle ya da
// ok balonlarıyla. Takımlar aynı labirentte yarışır; piyonlar karelerde zıplar, duvara çarpan geri seker (+2 sn).
// Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-20-c';
import * as sfx from '../sfx.js?v=2026-11-20-c';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, HC, HR, trophyModel } = K;
const { M, C, hexRGB, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb } = E;

const TEAM_COL = ['#ff5a36', '#3aa0ff', '#3ccf6e', '#ffd23f', '#a07bff', '#ff7ac8'];
const DIRV = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const BIT = { n: 1, e: 2, s: 4, w: 8 };
const ARROW = { n: '⬆️', e: '➡️', s: '⬇️', w: '⬅️', stop: '✋', ok: '👍' };
const SAYTXT = { n: 'YUKARI', e: 'SAĞA', s: 'AŞAĞI', w: 'SOLA', stop: 'DUR', ok: 'AFERİN' };
const BASE = 0.024;               // labirent tabanının üstü (masa üstünden)
const PAD_Z = 0.47;               // yürüyenin ok tuşlarının koltuktan uzaklığı (koltuk uzayı)
const KEY_TOP = 0.034;
const FING = 0.19, FDIR = [0, -0.7, 1], FDN = (() => { const l = Math.hypot(...FDIR); return FDIR.map((x) => x / l); })();
const GOLD3 = [1, 0.8, 0.3], GREEN3 = [0.3, 1, 0.5], RED3 = [1, 0.25, 0.18];
const teamRGB = (k) => hexRGB(TEAM_COL[k % TEAM_COL.length]);

const STYLE = `
#ky.krl .msg{top:15%}
#ky.krl .kl-teams{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 88px);display:flex;flex-wrap:wrap;gap:5px;justify-content:center;padding:0 10px;pointer-events:none;z-index:4}
#ky.krl .kl-teams:empty{display:none}
#ky.krl .kl-teams span{display:inline-flex;align-items:center;gap:5px;font-weight:800;font-size:12px;color:#fff;background:rgba(12,10,26,.66);border:2px solid rgba(255,255,255,.3);border-radius:99px;padding:2px 9px 2px 7px;white-space:nowrap}
#ky.krl .kl-teams span.mine{border-color:var(--tc);box-shadow:0 0 0 2px var(--tc)}
#ky.krl .kl-teams span b{display:inline-block;width:34px;height:6px;border-radius:9px;background:rgba(255,255,255,.22);overflow:hidden;position:relative}
#ky.krl .kl-teams span b i{position:absolute;left:0;top:0;bottom:0;background:var(--tc);border-radius:9px}
#ky.krl .kl-teams span.done{background:rgba(30,120,60,.82)}
#ky.krl .kl-st{display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:15px;color:#fff;background:rgba(12,10,26,.72);border-radius:99px;padding:6px 15px;max-width:94%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#ky.krl .kl-st:empty{display:none}
#ky.krl .kl-st.bad{background:#c8341f}
#ky.krl .kl-st.ok{background:#1f8a4c}
#ky.krl .kl-say{display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:20px;color:#1c1633;background:#fff;border:3px solid var(--ink);border-radius:18px;padding:5px 14px;box-shadow:3px 3px 0 var(--ink);pointer-events:none;animation:kyin .3s cubic-bezier(.2,1.5,.4,1)}
#ky.krl .kl-say:empty{display:none}
#ky.krl .kl-say small{font-size:12px;font-weight:800;opacity:.65}
#ky.krl .kl-say.old{opacity:.55}
#ky.krl .kl-pad{display:grid;grid-template-columns:repeat(3,clamp(64px,19vw,88px));grid-template-rows:repeat(3,clamp(54px,8.6vh,76px));gap:8px;justify-content:center}
#ky.krl .kl-pad button{border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:var(--lim);font-size:30px;line-height:1;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#ky.krl .kl-pad button:active,#ky.krl .kl-pad button.hit{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.krl .kl-pad .c{display:grid;place-items:center;font-size:30px}
#ky.krl .kl-says{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}
#ky.krl .kl-says button{width:clamp(52px,15vw,66px);height:clamp(48px,7vh,58px);border-radius:18px;border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink);background:#fff;font-size:24px;line-height:1;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.krl .kl-says button:active,#ky.krl .kl-says button.hit{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink);background:var(--lim)}
#ky.krl .kl-hint{font-size:12px;font-weight:700;color:#fff;opacity:.8;background:rgba(12,10,26,.5);border-radius:99px;padding:2px 10px;pointer-events:none;text-align:center}
#ky.krl .kl-blind{position:absolute;inset:0;pointer-events:none;z-index:2;opacity:0;transition:opacity .6s;background:radial-gradient(ellipse 62% 48% at 50% 46%,transparent 52%,rgba(8,6,18,.82) 100%)}
#ky.krl .kl-blind.on{opacity:1}
#ky.krl .kl-bub{position:absolute;left:0;top:0;z-index:4;pointer-events:none;font-weight:900;font-size:22px;line-height:1;background:#fff;color:#1c1633;border:3px solid #1c1633;border-radius:16px;padding:4px 9px;white-space:nowrap;display:none;will-change:transform;box-shadow:2px 2px 0 #1c1633}
#ky.krl .kl-bub::after{content:"";position:absolute;left:calc(50% + var(--tx,0px));bottom:-9px;margin-left:-6px;border:6px solid transparent;border-top-color:#1c1633}
#ky.krl .kl-bub small{font-size:11px;font-weight:800;margin-left:3px}
#ky.krl .kl-res{width:min(440px,94vw);border-radius:24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);background:var(--ort);color:var(--ink);padding:10px 14px 11px;text-align:center;animation:kyin .35s cubic-bezier(.2,1.5,.4,1);pointer-events:none}
#ky.krl .kl-res.win{background:#fff3c4}
#ky.krl .kl-res .big{font-size:21px;font-weight:900;line-height:1.15}
#ky.krl .kl-res .rk{display:grid;gap:4px;margin-top:8px;text-align:left}
#ky.krl .kl-res .rk div{display:flex;justify-content:space-between;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:2px 10px;font-weight:800;font-size:13px;background:#fff}
#ky.krl .kl-res .rk div.me{background:var(--lim)}
#ky.krl .kl-res .rk div span:last-child{font-variant-numeric:tabular-nums;opacity:.8;white-space:nowrap}
#ky.krl .kl-res .q{margin-top:6px;font-size:13px;font-weight:700;opacity:.8}
#ky.krl .lbl .kl-x{display:inline-flex;align-items:center;gap:3px}
#ky.krl .lbl .kl-x:empty{display:none}
#ky.krl .lbl .kl-t{font-size:12px}
#ky.krl .lbl .kl-sc{font-size:11px;font-variant-numeric:tabular-nums}
#ky.krl .lbl.blind{background:#1c1633;color:#fff}
#ky.krl .card .kl-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.krl .card .kl-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.krl .card .kl-seg button.on{background:var(--ink);color:#fff}
#ky.krl .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.krl .card.kl-in .tt{font-size:26px}
#ky.krl .card.kl-in .sub{font-size:14px}
#ky.krl .card .kl-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.krl .card .kl-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12}
#ky.krl .card .kl-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.krl .card .kl-ru .a{background:#e3dcff}#ky.krl .card .kl-ru .g{background:#d6f5e0}#ky.krl .card .kl-ru .y{background:#fff0c2}
#ky.krl .card .kl-tb{display:grid;gap:5px;margin-top:10px}
#ky.krl .card .kl-tb div{display:flex;justify-content:space-between;gap:8px;align-items:center;border:3px solid var(--ink);border-radius:14px;padding:4px 10px;font-weight:800;font-size:14px;background:#fff}
#ky.krl .card .kl-tb div.me{background:var(--lim)}
#ky.krl .card .kl-tb div em{font-style:normal;font-size:12px;opacity:.7;font-weight:700}
#ky.krl .card .kl-tb div b{font-variant-numeric:tabular-nums}
#ky.krl .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.krl .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.krl .kl-teams{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:calc(env(safe-area-inset-left,0px) + 8px);right:auto;justify-content:flex-start;max-width:44vw}
#ky.krl .kl-pad{grid-template-columns:repeat(3,64px);grid-template-rows:repeat(3,52px);gap:6px}
#ky.krl .kl-pad button{font-size:24px}
#ky.krl .kl-res{width:min(380px,46vw);padding:7px 12px}#ky.krl .kl-res .big{font-size:18px}
}
@media (min-aspect-ratio:11/10){#ky.krl .mz-bar{align-items:flex-end}}
@media (max-width:379px){#ky.krl .card .kl-seg button{font-size:12px}}
`;

/* ============================ müzik ve sesler ============================ */
// Re minör gizem ezgisi: pizzicato yaylılar, marimba, alçak org pedalı ve tik tak eden saat. Süre azaldıkça saat
// hızlanır, yaylılar gerilir. Sonuç: sakin vibrafon. Giriş/final: hafif, oyuncu "keşif" ritmi.
class KlSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.0; }
  tempo() { return this.mode === 'race' ? 100 + 34 * (this.int || 0) : this.mode === 'idle' ? 108 : 92; }
  swing() { return this.mode === 'race' ? 0.08 : 0.12; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const I = this.int || 0;
    const CH = [[38, [62, 65, 69]], [34, [58, 62, 65]], [36, [60, 64, 67]], [33, [57, 61, 64]]];
    const [root, ch] = CH[bar % 4];
    if (this.mode === 'race') {
      if (s % 4 === 0) this.iKick(t, 0.12 + 0.08 * I, 96, 44, 0.18);
      if (s % 2 === 0) this.iWood(t, 0.03 + 0.04 * I, s % 4 === 0 ? 1250 : 980);      // saat: tik-tak
      if (I > 0.55 && s % 2 === 1) this.iTick(t, 0.012 + 0.02 * I);
      if (s === 0) this.iPad(t, [root, root + 7].map((m) => m + 12), spb * 4, 0.008 + 0.006 * I, 700 + 900 * I);
      if (s % 4 === 2) this.iBass(t, root, st * 1.5, 0.07, 'up');
      const PZ = [0, null, 2, null, 1, null, 2, 0, null, 1, null, 2, 1, null, 0, null];
      const q = PZ[s];
      if (q != null) this.iPizz(t, ch[q] + (s >= 8 ? 12 : 0), 0.028 + 0.012 * I);
      if (I > 0.7 && s === 0) this.iStr(t, ch.map((m) => m + 12), spb * 4, 0.01 + 0.012 * I, 0.25, 1800 + 1800 * I, 0.25);
      return;
    }
    if (this.mode === 'idle') {
      if (s === 0 || s === 10) this.iKick(t, 0.1, 104, 46, 0.15);
      if (s === 4 || s === 12) this.iRim(t, 0.05);
      if (s % 2 === 0) this.iShk(t, 0.012);
      if (s % 4 === 0) this.iBass(t, root + [0, 7, 12, 7][(s >> 2) % 4], st * 1.6, 0.07, 'up');
      const ML = [2, null, 1, null, 0, null, 1, 2, null, null, 2, 1, 0, null, null, null];
      const m = ML[s];
      if (m != null) this.iMarimba(t, ch[m] + 12, 0.022, 0.12);
      if (s === 0) this.iPad(t, ch.map((x) => x - 12), spb * 4, 0.006, 900);
      return;
    }
    // sonuç: sakin
    if (s === 0) this.iPad(t, ch.map((m) => m - 12), spb * 4, 0.008, 1000);
    if (s % 4 === 0) this.iBass(t, root + [0, 7, 12, 7][(s >> 2) % 4], spb * 0.85, 0.06, 'up');
    if (s === 0 || s === 8) this.iKick(t, 0.07, 100, 48, 0.16);
    if (s === 4 || s === 12) this.iBrush(t, 0.04, 0.18);
    if (s === 6 || s === 14) this.iVibe(t, ch[(bar + (s >> 3)) % 3] + 12, 0.016, spb, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'step': { // ahşap "tok" (a: perde değişimi)
        const f = 700 + (a || 0) * 60;
        this.tone(f, t, 0.06, 'sine', 0.1, f * 0.82, 0.001);
        this.tone(f * 2.6, t, 0.03, 'sine', 0.03, null, 0.001);
        this.noise(t, 0.02, 0.04, { type: 'bandpass', freq: 2400, q: 2, attack: 0.001 });
        break;
      }
      case 'stepO': this.tone(620 + (a || 0) * 50, t, 0.05, 'sine', 0.035, 520, 0.001); break;
      case 'bump': // duvar: tok bir gümbürtü + "boing"
        this.duck(0.4, 0.6);
        this.tone(120, t, 0.18, 'sine', 0.3, 60, 0.002);
        this.noise(t, 0.08, 0.2, { type: 'lowpass', freq: 700 });
        this.tone(330, t + 0.03, 0.26, 'triangle', 0.08, 180, 0.004);
        break;
      case 'bumpO': this.tone(140, t, 0.12, 'sine', 0.1, 80, 0.002); this.noise(t, 0.05, 0.06, { type: 'lowpass', freq: 600 }); break;
      case 'say': // rehberin balonu
        this.tone(880, t, 0.07, 'sine', 0.09, 1320, 0.003);
        this.tone(1320, t + 0.05, 0.09, 'sine', 0.06, null, 0.003);
        break;
      case 'sayMe': // bana tarif geldi (yürüyen)
        this.tone(988, t, 0.09, 'triangle', 0.12, null, 0.003);
        this.tone(1480, t + 0.07, 0.12, 'triangle', 0.09, null, 0.003);
        break;
      case 'done': // takımımız çıktı
        this.duck(0.25, 1.8);
        [[659, 0], [784, 0.09], [988, 0.18], [1319, 0.3]].forEach(([f, d]) => { this.tone(f, t + d, 0.22, 'square', 0.045); this.tone(f, t + d, 0.32, 'triangle', 0.08); });
        this.cheer(t + 0.2, 1.4);
        break;
      case 'doneO': [[784, 0], [988, 0.1]].forEach(([f, d]) => this.tone(f, t + d, 0.18, 'triangle', 0.06)); break;
      case 'tick': this.tone(1760, t, 0.03, 'square', 0.04, null, 0.001); break;
      case 'reveal': this.noise(t, 0.6, 0.12, { type: 'bandpass', freq: 400, to: 2400, q: 0.9, attack: 0.1 }); this.tone(523, t + 0.25, 0.4, 'triangle', 0.06); this.tone(784, t + 0.32, 0.5, 'triangle', 0.05); break;
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
const WOOD = '#b5824e', WOOD_D = '#8a5a32', WOOD_L = '#d9ad78';
// labirent tablası: koyu ahşap kasa + çerçeve (orijin masa üstünde, merkez)
function trayModel(mb, Z) {
  const h = Z.side / 2, rim = Z.rim;
  mb.rbox(-h - rim, 0, -h - rim, h + rim, BASE, h + rim, 0.03, C(WOOD_D, -0.35), 3);
  const R = C('#6e4524', -0.45);
  const top = BASE + Z.wh * 1.05;
  mb.rbox(-h - rim, BASE - 0.004, -h - rim, h + rim, top, -h, 0.012, R, 2);
  mb.rbox(-h - rim, BASE - 0.004, h, h + rim, top, h + rim, 0.012, R, 2);
  mb.rbox(-h - rim, BASE - 0.004, -h, -h, top, h, 0.012, R, 2);
  mb.rbox(h, BASE - 0.004, -h, h + rim, top, h, 0.012, R, 2);
  // köşelerde pirinç kapaklar
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.lathe(sx * (h + rim / 2), top, sz * (h + rim / 2), [[0.02, 0], [0.02, 0.004], [0.012, 0.009], [0, 0.01]], 14, C('#d6a64a', -0.9));
}
// zemin: iki tonlu ahşap kareler (yerleri belli olsun)
function floorModel(mb, Z) {
  const N = Z.N, c = Z.cell, h = Z.side / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const col = C((x + y) % 2 ? '#2f6a4c' : '#2a6146', 0);
    const x0 = -h + x * c, z0 = -h + y * c;
    const fy = BASE + 0.0015;
    mb.quad([x0, fy, z0], [x0 + c, fy, z0], [x0 + c, fy, z0 + c], [x0, fy, z0 + c], col, [x0 + c / 2, fy - 1, z0 + c / 2]);
  }
}
// köşe direkleri: her ızgara köşesinde yuvarlak başlı küçük kazık (duvar olsun olmasın; yürüyene bilgi vermez)
function postsModel(mb, Z) {
  const N = Z.N, c = Z.cell, h = Z.side / 2, r = Z.wt * 0.62, Pc = C('#8a5a32', -0.5), Cap = C('#d6a64a', -0.9);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = -h + i * c, z = -h + j * c;
    mb.lathe(x, BASE, z, [[r, 0], [r, Z.wh], [r * 0.7, Z.wh + r * 0.45], [0, Z.wh + r * 0.6]], 10, (q) => (q >= 2 ? Cap : Pc));
  }
}
// duvarlar: kapalı kenarlar (labirent verisinden)
function wallsModel(mb, Z, open) {
  const N = Z.N, c = Z.cell, h = Z.side / 2, t = Z.wt / 2, H = Z.wh;
  const col = (x, y, k) => C(hs(x * 7 + y * 13 + k, 5) < 0.5 ? '#e0b47a' : '#d5a66a', -0.35);
  const seg = (x0, z0, x1, z1, cc) => mb.rbox(Math.min(x0, x1) - t, BASE, Math.min(z0, z1) - t, Math.max(x0, x1) + t, BASE + H, Math.max(z0, z1) + t, Math.min(t * 0.9, 0.008), cc, 2);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = open[y][x], X0 = -h + x * c, Z0 = -h + y * c;
    if (!(o & 1)) seg(X0 + t, Z0, X0 + c - t, Z0, col(x, y, 1));
    if (!(o & 8)) seg(X0, Z0 + t, X0, Z0 + c - t, col(x, y, 8));
    if (y === N - 1 && !(o & 4)) seg(X0 + t, Z0 + c, X0 + c - t, Z0 + c, col(x, y, 4));
    if (x === N - 1 && !(o & 2)) seg(X0 + c, Z0 + t, X0 + c, Z0 + c - t, col(x, y, 2));
  }
}
// tek duvar (çarpılan duvarı göstermek için): x yönünde birim uzunluk, ölçekle yerleşir
// yumuşak kenarlı kare (saydam, toplamalı): yürünen kareleri boyamak için
function tileModel(mb) {
  const X = [-0.5, -0.36, 0.36, 0.5], A = [0, 1, 1, 0];
  const v = (x, z, a) => mb.d.push(x, 0, z, 1, 1, 1, a);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x0 = X[i], x1 = X[i + 1], z0 = X[j], z1 = X[j + 1];
    const a00 = A[i] * A[j], a10 = A[i + 1] * A[j], a11 = A[i + 1] * A[j + 1], a01 = A[i] * A[j + 1];
    v(x0, z0, a00); v(x1, z0, a10); v(x1, z1, a11);
    v(x0, z0, a00); v(x1, z1, a11); v(x0, z1, a01);
  }
}
function wallUnit(mb) { mb.rbox(-0.5, 0, -0.5, 0.5, 1, 0.5, 0.08, C('#ffffff', -0.3), 2); }
// piyon (takım rengine boyanır)
function pawnModel(mb) {
  const P = C('#ffffff', -0.8);
  mb.lathe(0, 0, 0, [[0, 0], [0.34, 0], [0.36, 0.05], [0.33, 0.1], [0.24, 0.13], [0.2, 0.17], [0.15, 0.4], [0.2, 0.45], [0.21, 0.5], [0.13, 0.53], [0.1, 0.56]], 24, P);
  mb.sphereS(0, 0.7, 0, 0.19, 0.19, 0.19, P, 20, 14);
}
// gözbağı: başın çevresinde göz hizasında bant + arkada düğüm (baş matrisiyle çizilir; takım rengine boyanır)
function blindModel(mb) {
  const [cx, cy, cz] = HC, r = HR;
  const P = C('#ffffff', -0.35);
  mb.torusN(cx, cy + r * 0.12, cz, r * 1.02, r * 0.1, r * 0.3, 40, 10, P);
  mb.sphereS(cx, cy + r * 0.12, cz - r * 1.1, r * 0.13, r * 0.13, r * 0.1, P, 12, 8);
  for (const s of [-1, 1]) limb(mb, [cx + s * 0.02, cy + r * 0.1, cz - r * 1.12], [cx + s * 0.07, cy - r * 0.32, cz - r * 1.2], [r * 0.08, r * 0.04], P, 6);
}
// yürüyenin ok tuşları: siyah taban + dört tuş (koltuk uzayında; +z masaya doğru, +x oyuncunun solu)
function padBase(mb) {
  mb.rbox(-0.1, 0, -0.1, 0.1, 0.02, 0.1, 0.02, C('#1d1d23', -0.7), 3);
}
const PAD_KEYS = { n: [0, 0.052], s: [0, -0.052], w: [0.052, 0], e: [-0.052, 0] };
function padKey(mb, lit) {
  const W = lit ? [1, 1, 1, 0.9] : [1, 1, 1, -0.6];
  mb.rbox(-0.024, 0, -0.024, 0.024, 0.014, 0.024, 0.008, W, 2);
}
// çıkış kapısı: hedef köşede küçük kemer + bayrak
function exitModel(mb, Z) {
  const h = Z.side / 2, c = Z.cell, H = Z.wh * 2.2;
  const Gd = C('#d6a64a', -0.9), Rd = C('#c8261c', -0.4);
  const x = h - c / 2, z = h;
  for (const s of [-1, 1]) limb(mb, [x + s * c * 0.38, BASE, z + Z.rim * 0.5], [x + s * c * 0.38, BASE + H, z + Z.rim * 0.5], [Z.wt * 0.5, Z.wt * 0.5], Gd, 8);
  mb.rbox(x - c * 0.44, BASE + H - 0.006, z + Z.rim * 0.5 - Z.wt * 0.5, x + c * 0.44, BASE + H + 0.016, z + Z.rim * 0.5 + Z.wt * 0.5, 0.004, Rd, 1);
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const sec1 = (ms) => (ms / 1000).toFixed(1).replace('.', ',');
const mazeHash = (open) => (open ? open.map((r) => r.join('.')).join('|') : '');

/* ============================ oyun ============================ */
class MazeGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'krl', cls: 'krl', title: 'Kör Labirent', sub: 'Gözü bağlı yürü, haritayı gören yol tarif etsin!', emoji: '🧭', css: STYLE, snd: new KlSnd(), amb: 'diner', ambVol: 0.45, botPx: 260, botPxL: 40, trim: '#d6a64a', place: false, tea: false });
    this.pawns = [];            // takım başına: { gx, gy, fx, fy, t0, mode: 'idle'|'hop'|'bump', dir, seq }
    this.flashes = [];          // çarpılan duvar parlamaları { x, y, d, t0, k }
    this.trophies = [];
    this.padHit = new Map();    // koltuk → { d, at } (ok tuşuna basış)
    this.bubs = new Map();      // koltuk → { d, at, el }
    this.Z = null; this.zKey = ''; this.mzKey = '';
    this.el.posS.textContent = '';
    this.teamsEl = document.createElement('div');
    this.teamsEl.className = 'kl-teams';
    this.el.wrap.appendChild(this.teamsEl);
    this.blindEl = document.createElement('div');
    this.blindEl.className = 'kl-blind';
    this.el.wrap.insertBefore(this.blindEl, this.el.wrap.querySelector('.hud'));
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.pawn = this.mk(pawnModel);
    W.blind = this.mk(blindModel);
    W.padB = this.mk(padBase);
    W.key = this.mk((mb) => padKey(mb, false));
    W.keyE = this.mk((mb) => padKey(mb, true));
    W.wallU = this.mk(wallUnit);
    W.tile = this.mk(tileModel, 'un');
    W.trophy = this.mk(trophyModel);
    this.zKey = ''; this.mzKey = '';
  }
  // labirent ölçüleri (masa ve labirent boyuna göre)
  dims() {
    const N = (this.view && this.view.size) || 6;
    const key = `${N}|${this.R.toFixed(3)}|${this.kz.toFixed(3)}`;
    if (key === this.dKey && this.Z) return this.Z;
    this.dKey = key;
    const ax = Math.max(0.6, this.R - 0.47), az = Math.max(0.6, this.R * this.kz - 0.47);
    const half = 0.97 / Math.sqrt(1 / (ax * ax) + 1 / (az * az));
    const side = clamp(2 * half, 1.1, 2.7), cell = side / N;
    this.Z = { N, side, cell, rim: clamp(cell * 0.2, 0.035, 0.06), wh: clamp(cell * 0.3, 0.05, 0.095), wt: clamp(cell * 0.11, 0.02, 0.04), key };
    this.fitK = '';
    return this.Z;
  }
  gx(x) { const Z = this.Z; return -Z.side / 2 + (x + 0.5) * Z.cell; }
  gz(y) { const Z = this.Z; return -Z.side / 2 + (y + 0.5) * Z.cell; }
  ensureMaze() {
    if (!this.W || !this.X) return;
    const Z = this.dims();
    const free = (k) => { if (this.W[k]) { E.freeMesh(this.X, this.W[k]); this.W[k] = null; } };
    if (this.zKey !== Z.key) {
      this.zKey = Z.key;
      ['tray', 'floor', 'posts', 'exit'].forEach(free);
      this.W.tray = this.mk((mb) => trayModel(mb, Z));
      this.W.floor = this.mk((mb) => floorModel(mb, Z));
      this.W.posts = this.mk((mb) => postsModel(mb, Z));
      this.W.exit = this.mk((mb) => exitModel(mb, Z));
      this.mzKey = '';
    }
    const v = this.view, open = v && v.maze && v.maze.length === Z.N ? v.maze : null;
    const mk = Z.key + '|' + mazeHash(open);
    if (this.mzKey !== mk) {
      this.mzKey = mk;
      free('walls');
      if (open) this.W.walls = this.mk((mb) => wallsModel(mb, Z, open));
    }
  }
  onTable() { this.zKey = ''; }
  rkey() { const v = this.view; return v ? `${v.game}:${v.round}` : ''; }
  blind() { const v = this.view; return !!v && v.phase === 'play' && v.role === 'walker'; }
  myTeamDone() { const v = this.view; const t = v && v.myTeam >= 0 ? v.teams[v.myTeam] : null; return !!t && t.done != null; }
  // koltuk uzayındaki nokta → dünya
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  wristFor(kx, kz, j, lift) {
    const ix = j ? -0.027 : 0.027;
    return [kx - ix, TABLE_Y + 0.002 + KEY_TOP + lift - FDN[1] * FING + 0.016, kz - FDN[2] * FING];
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onDown = (e) => {
      const m = e.target.closest('[data-mv]');
      if (m) { e.preventDefault(); this.move(m.dataset.mv, m); return; }
      const s = e.target.closest('[data-say]');
      if (s) { e.preventDefault(); this.say(s.dataset.say, s); }
    };
    this.el.bar.addEventListener('pointerdown', onDown);
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'kl-mode') { const m = b.dataset.m; if (this.view && this.view.mode !== m) { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('mode', { m }); } }
      else if (act === 'kl-start') { try { this.snd.fx('pop'); } catch { /* yok */ } this.ctx.send('start', { m: this.view?.mode || 'kisa' }); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    const KEYS = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e', w: 'n', s: 's', a: 'w', d: 'e', W: 'n', S: 's', A: 'w', D: 'e' };
    this.onKey = (e) => {
      if (this.dead || e.repeat || (e.target && /input|textarea|select/i.test(e.target.tagName || ''))) return;
      const d = KEYS[e.key];
      if (!d) return;
      const v = this.view;
      if (!v || v.phase !== 'play') return;
      e.preventDefault();
      if (v.role === 'walker') this.move(d, this.el.bar.querySelector(`[data-mv="${d}"]`));
      else if (v.role === 'guide') this.say(d, this.el.bar.querySelector(`[data-say="${d}"]`));
    };
    window.addEventListener('keydown', this.onKey);
  }
  move(d, btn) {
    const v = this.view;
    if (!v || v.phase !== 'play' || v.role !== 'walker' || this.myTeamDone() || !DIRV[d]) return;
    if (this.time - (this.mvT || -9) < 0.13) return;
    this.mvT = this.time;
    if (btn) { btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 120); }
    if (v.me >= 0) this.padHit.set(v.me, { d, at: this.time });
    vibrate(8);
    this.ctx.send('move', { dir: d });
  }
  say(d, btn) {
    const v = this.view;
    if (!v || v.phase !== 'play' || v.role !== 'guide' || this.myTeamDone() || !ARROW[d]) return;
    if (this.time - (this.syT || -9) < 0.28) return;
    this.syT = this.time;
    if (btn) { btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 140); }
    try { this.snd.fx('say'); } catch { /* yok */ }
    vibrate(6);
    try { this.ctx.sendQuiet ? this.ctx.sendQuiet('say', { d }) : this.ctx.send('say', { d }); } catch { /* yok */ }
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.krl !== '1') { root.dataset.krl = '1'; root.innerHTML = '<p class="py-16 text-center">🧭</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    this.dims();
    const key = `${v.game}:${v.round}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'play' || v.phase === 'reveal') this.syncPawns(prev, v);
    // rehber balonu
    if (v.say && (!this.lastSay || v.say.seq !== this.lastSay)) {
      const fresh = ctx.serverNow() - v.say.at < 2500;
      this.lastSay = v.say.seq;
      if (fresh && v.phase === 'play') {
        this.bubs.set(v.say.i, { d: v.say.d, at: this.time });
        if (v.say.i !== v.me) { try { this.snd.fx(v.role === 'walker' ? 'sayMe' : 'say'); } catch { /* yok */ } if (v.role === 'walker') vibrate(15); }
        this.sayK = '';
      }
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const fx = (n, a) => { try { S.fx(n, a); } catch { /* yok */ } };
    const sNow = this.ctx.serverNow();
    if (v.phase === 'intro') { try { S.music('idle'); } catch { /* yok */ } this.trophies = []; this.pawns = []; this.flashes = []; }
    if (v.phase === 'play') {
      try { S.music('race'); } catch { /* yok */ }
      this.trophies = []; this.flashes = []; this.bubs = new Map(); this.padHit = new Map();
      this.pawns = (v.teams || []).map((t) => ({ gx: 0, gy: 0, fx: 0, fy: 0, t0: -9, mode: 'idle', dir: null, seq: t.seq || 0, drop: this.time }));
      const fresh = sNow - (v.startAt || 0) < 1500;
      this.lastTick = -1;
      this.playT = this.time;
      if (fresh) {
        this.msg(`${v.round}. TUR`, 'mid');
        if (v.role === 'walker') setTimeout(() => { if (!this.dead && this.blind()) this.msg('🙈 Gözlerin bağlı!', 'mid'); }, 1300);
        else if (v.role === 'guide') { const t = v.teams[v.myTeam], w = t ? v.seats[t.walker] : null; setTimeout(() => { if (!this.dead && this.view.phase === 'play') this.msg(`🗺️ ${esc((w?.n || '').replace(/ 🤖$/, ''))} sana güveniyor!`, 'mid'); }, 1300); }
      }
    }
    if (v.phase === 'reveal') {
      try { S.music('calm'); } catch { /* yok */ }
      const fresh = sNow - (v.revealAt || 0) < 1500;
      this.revT = this.time - (fresh ? 0 : 4);
      if (fresh) {
        fx('reveal');
        const r = (v.res || []).find((x) => x.t === v.myTeam);
        if (r && r.rank === 1 && r.time != null) setTimeout(() => { try { if (!this.dead) this.snd.fx('tada'); } catch { /* yok */ } }, 400);
        else if (r && r.time == null) setTimeout(() => { try { if (!this.dead) this.snd.fx('trombone'); } catch { /* yok */ } }, 400);
      }
    }
    if (v.phase === 'final') {
      try { S.music('idle'); } catch { /* yok */ }
      const late = sNow - (v.finAt || 0) > 2500;
      const ch = v.champ >= 0 && v.teams[v.champ] ? v.teams[v.champ].members : [];
      this.champK = ch.length ? ch[0] : -1;
      this.champs = ch;
      this.trophies = ch.map((w, n) => {
        const a = this.seatAngle(w), r = this.rAt(a, this.R) - 0.32;
        return { k: w, t: late ? 9 : -0.35 * n, x: Math.cos(a) * r + Math.sin(a) * 0.3, z: Math.sin(a) * r - Math.cos(a) * 0.3, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), landed: late };
      });
      if (!late) {
        const mine = v.champ >= 0 && v.champ === v.myTeam;
        fx('champ');
        if (mine) { this.flash('rgba(255,215,90,.6)', true); vibrate([60, 40, 60, 40, 160]); }
        const t = v.champ >= 0 ? v.teams[v.champ] : null;
        this.msg(mine ? '👑 KAZANDINIZ!' : t ? `👑 ${esc(t.e)} ${esc(t.name.toLocaleUpperCase('tr'))}` : 'OYUN BİTTİ', 'mid gold');
      }
      this.finT = this.time;
    }
  }
  // piyonlar: sunucudaki hamle sayacı (seq) değişince zıplama ya da duvara çarpıp geri sekme
  syncPawns(prev, v) {
    const S = this.snd;
    (v.teams || []).forEach((t, k) => {
      let p = this.pawns[k];
      if (!p) { p = this.pawns[k] = { gx: 0, gy: 0, fx: 0, fy: 0, t0: -9, mode: 'idle', dir: null, seq: 0, drop: -9 }; }
      if (!t.pos) { p.hidden = true; return; }
      p.hidden = false;
      const mine = k === v.myTeam;
      if (t.seq !== p.seq) {
        p.seq = t.seq;
        if (t.walker >= 0 && t.walker !== v.me && t.ld) this.padHit.set(t.walker, { d: t.ld, at: this.time });
        const cur = this.pawnPos(p);
        p.fx = cur[0]; p.fy = cur[1];
        p.t0 = this.time;
        p.dir = t.ld;
        if (t.ok === false) {
          p.mode = 'bump';
          p.gx = t.pos[0]; p.gy = t.pos[1];
          if (t.ld) this.flashes.push({ x: t.pos[0], y: t.pos[1], d: t.ld, t0: this.time, k });
          try { S.fx(mine ? 'bump' : 'bumpO'); } catch { /* yok */ }
          if (mine && v.role === 'walker') { vibrate([40, 30, 40]); this.cam.shake = Math.max(this.cam.shake, 0.18); }
        } else {
          p.mode = 'hop';
          p.gx = t.pos[0]; p.gy = t.pos[1];
          try { S.fx(mine ? 'step' : 'stepO', (t.pos[0] + t.pos[1]) % 7); } catch { /* yok */ }
        }
      } else if (p.mode === 'idle') { p.gx = t.pos[0]; p.gy = t.pos[1]; p.fx = p.gx; p.fy = p.gy; }
      // bitiş
      const doneNow = t.done != null;
      if (doneNow && !p.done) {
        p.done = true;
        p.doneT = this.time;
        const N = this.Z ? this.Z.N : v.size;
        if (this.X && this.Z) this.burst(this.gx(N - 1), TABLE_Y + BASE + 0.1, this.gz(N - 1), 40, [teamRGB(k), [1, 0.85, 0.3], [1, 1, 1]], 1.4, 0.022, false, 1.5, 2.6);
        try { S.fx(mine ? 'done' : 'doneO'); } catch { /* yok */ }
        if (mine) { this.flash('rgba(120,240,150,.45)', true); this.msg('🎉 ÇIKTINIZ!', 'mid gold'); vibrate([40, 30, 40, 30, 120]); }
      } else if (!doneNow) p.done = false;
    });
  }
  // piyonun anlık ızgara konumu (kesirli) ve yükseklik
  pawnPos(p) {
    const u = this.time - p.t0;
    if (p.mode === 'hop') {
      const k = clamp(u / 0.24, 0, 1);
      if (k >= 1) { p.mode = 'idle'; return [p.gx, p.gy, 0]; }
      const e = k * k * (3 - 2 * k);
      return [lerp(p.fx, p.gx, e), lerp(p.fy, p.gy, e), Math.sin(Math.PI * k) * 0.55];
    }
    if (p.mode === 'bump') {
      const k = clamp(u / 0.34, 0, 1);
      if (k >= 1) { p.mode = 'idle'; return [p.gx, p.gy, 0]; }
      const dv = DIRV[p.dir] || [0, 0];
      const q = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
      const off = Math.sin(q * Math.PI / 2) * 0.34;
      return [p.gx + dv[0] * off, p.gy + dv[1] * off, Math.sin(Math.PI * Math.min(1, k / 0.4)) * 0.15];
    }
    return [p.gx, p.gy, 0];
  }
  pawnW(k) {
    const p = this.pawns[k], Z = this.Z;
    if (!p || !Z) return null;
    const [x, y, h] = this.pawnPos(p);
    // aynı karedeki piyonlar biraz yana kayar
    let ox = 0, oz = 0;
    const same = this.pawns.filter((q, i) => q && !q.hidden && i !== k && Math.round(q.gx) === Math.round(p.gx) && Math.round(q.gy) === Math.round(p.gy));
    if (same.length) { const a = (k / Math.max(1, this.pawns.length)) * TAU; ox = Math.cos(a) * Z.cell * 0.2; oz = Math.sin(a) * Z.cell * 0.2; }
    return [this.gx(x) + ox, TABLE_Y + BASE + h * Z.cell, this.gz(y) + oz];
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v || !this.Z) return;
    const t = this.time, n = Math.max(1, this.seats.length);
    const cam = [this.cam.ex, this.cam.ey, this.cam.ez];
    const mid = [0, TABLE_Y + 0.05, 0];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      a.idle = a.idle || { mood: hs(i, 4) < 0.5 ? 'rest' : 'chin', mt: 4 + hs(i, 9) * 6, lt: 0, look: null };
      const S = a.idle;
      const team = p.t >= 0 && v.teams ? v.teams[p.t] : null;
      if (v.phase === 'play' && team) {
        const isW = team.walker === i;
        const pw = this.pawnW(p.t) || mid;
        const done = team.done != null;
        if (done) { a.pose(t - (this.pawns[p.t]?.doneT || 0) < 3 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = isW ? cam : pw; return; }
        if (isW) {
          // gözü bağlı: ok tuşlarının üstünde eller, başı hafif yukarıda (kulak kabartmış)
          a.pose('rest', { t });
          a.tgt.lean = 0.1;
          a.k = 22;
          const ph = this.padHit.get(i);
          const u = ph ? t - ph.at : 9;
          for (let j = 0; j < 2; j++) {
            const sx = j ? 1 : -1;
            a.tgt.hand[j] = this.wristFor(sx * 0.052, PAD_Z - 0.01, j, 0.05);
            a.tgt.fdir[j] = FDIR.slice(); a.tgt.palm[j] = [sx * 0.15, -1, 0.25]; a.tgt.fw[j] = 1;
            a.tgt.pole[j] = [sx * 0.8, -0.6, -0.25];
            a.shape[j] = 'point';
          }
          if (ph && u < 0.3) {
            const [kx, kz] = PAD_KEYS[ph.d] || [0, 0];
            const j = kx > 0.01 ? 1 : 0;
            const dip = Math.sin(Math.PI * clamp(u / 0.26, 0, 1));
            a.tgt.hand[j] = this.wristFor(kx, PAD_Z + kz, j, 0.04 * (1 - dip) + 0.002);
          }
          a.expr = team.ok === false && this.pawns[p.t] && t - this.pawns[p.t].t0 < 1 ? 'wince' : 'tense';
          a.look = null; a.tgt.hy = Math.sin(t * 0.9 + i) * 0.25; a.tgt.hp = -0.18;
          return;
        }
        // rehber: labirente eğilir, yürüyenin piyonunu gösterir; konuşunca ağzı açılır
        const bub = this.bubs.get(i);
        const talk = bub && t - bub.at < 1.4;
        a.pose(talk ? 'rest' : hs(i, 7) < 0.5 ? 'chin' : 'rest', { t });
        a.tgt.lean = 0.2;
        if (talk) { a.pointAt(pw, hs(i, 3) < 0.5 ? 1 : 0); a.expr = Math.sin(t * 18) > 0 ? 'o' : 'grin'; }
        else a.expr = 'tense';
        a.look = pw;
        return;
      }
      if (v.phase === 'play') { a.pose('lean', { t }); a.expr = 'smile'; a.look = mid; return; }
      if (v.phase === 'reveal') {
        const u = this.time - (this.revT || 0);
        const r = team ? (v.res || []).find((x) => x.t === p.t) : null;
        if (r && r.rank === 1 && r.time != null) { a.pose(u < 3 || Math.floor(u / 2.4) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = cam; return; }
        if (r && r.time == null) { a.pose(u < 2 ? 'facepalm' : 'slump', { t }); a.expr = 'sad'; a.look = null; a.tgt.hy = 0; a.tgt.hp = 0.3; return; }
        a.pose(hs(i, v.round) < 0.6 ? 'clap' : 'rest', { t }); a.expr = 'smile'; a.look = mid;
        return;
      }
      if (v.phase === 'final') {
        const win = (this.champs || []).includes(i);
        const u = this.time - (this.finT || 0);
        const w = this.champK >= 0 ? this.avatarAt(this.champK) : null;
        if (win) { a.pose(u < 4 || Math.floor(u / 3) % 2 === 0 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = cam; }
        else { a.pose(Math.floor(u / 2.6 + i) % 3 === 0 ? 'rest' : 'clap', { t }); a.expr = 'grin'; a.look = w ? w.headW : mid; }
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
        S.look = r < 0.55 && nb && nb !== a ? nb.headW.slice() : r < 0.85 ? mid : cam;
        a.expr = Math.random() < 0.3 ? 'grin' : 'smile';
      }
      if (a.waveT != null && this.time - a.waveT < 2.2) { a.pose('wave', { t }); a.expr = 'grin'; a.look = cam; }
      else { a.pose(S.mood, { t }); a.look = S.look; }
    });
  }
  avTint(a, i) {
    const v = this.view, p = v?.seats?.[i];
    const want = p && v.phase === 'play' && p.t < 0 ? 0.7 : 1;
    a.dimK = damp(a.dimK ?? 1, want, 3, 0.016);
    return a.dimK;
  }

  /* ---------- kamera, saat ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const Z = this.dims();
    this.ensureMaze();
    const sNow = this.ctx.serverNow();
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    // süre azalınca saat tik tak
    if (v.phase === 'play') {
      const left = (v.endsAt || 0) - sNow;
      const s = Math.ceil(left / 1000);
      if (left > 0 && s <= 10 && s !== this.lastTick && !this.myTeamDone()) { this.lastTick = s; try { this.snd.fx('tick'); } catch { /* yok */ } }
      this.snd.int = clamp(1 - left / Math.max(1, v.roundMs || 9e4), 0, 1);
    } else this.snd.int = 0;
    this.blindEl.classList.toggle('on', this.blind() && !this.myTeamDone());
    // kamera
    let zoom = 1, fx = 0, fz = 0, fy = 0, pa = 0, yaw = 0, bp = 300, D0 = null;
    const playView = v.phase === 'play' || (v.phase === 'reveal' && this.time - (this.revT || 0) < 2.6);
    if (playView) {
      const role = v.phase === 'play' ? v.role : 'watch';
      const vh = this.vh || 800, land2 = land && vh <= 520;
      // alt çubuğun yüksekliği (CSS ölçüleriyle aynı): yürüyende ok tuşları + durum + tarif balonu
      const padH = land2 ? 3 * 52 + 12 : 3 * clamp(0.086 * vh, 54, 76) + 16;
      const botH = role === 'walker' && !this.myTeamDone() ? (land ? 40 : Math.round(padH + 34 + 40 + 34)) : role === 'guide' && !this.myTeamDone() ? (land ? 40 : 158) : 70;
      const sc = this.mazeCam(land, botH);
      pa = sc.pa; D0 = sc.D; fx = sc.T[0]; fy = sc.T[1] - 0.7; fz = sc.T[2]; bp = 150;
    } else if (v.phase === 'reveal') {
      bp = 150; zoom = 0.86; pa = 0.06;
      const r1 = (v.res || [])[0];
      const t = r1 && r1.time != null ? v.teams[r1.t] : null;
      const w = t ? t.members.find((q) => q >= 0) : -1;
      const a = w >= 0 ? this.avatarAt(w) : null;
      if (a) {
        const ang = this.seatAngle(w);
        const near = Math.sin(ang) > 0.35;
        yaw = near ? angDiff(-Math.PI / 2 - ang, 0) : 0;
        zoom = 0.46; pa = near ? -0.26 : -0.16;
        const f = this.aimAt(a.headW, land ? 0.4 : 0.5, land ? 0.45 : 0.36, yaw, pa);
        fx = f[0]; fy = f[1]; fz = f[2];
      }
    } else if (v.phase === 'final' && this.champK >= 0) {
      const a = this.avatarAt(this.champK);
      bp = 120;
      if (a) {
        const card = this.finCard();
        yaw = -Math.PI / 2 - this.seatAngle(this.champK);
        zoom = card ? 0.66 : 0.56; pa = -0.34;
        const f = this.aimAt(a.headW, land && card ? 0.3 : 0.5, land ? 0.4 : card ? 0.2 : 0.4, yaw, pa);
        fx = f[0]; fy = f[1]; fz = f[2];
      }
    } else { yaw = Math.sin(this.time * 0.13) * 0.06; bp = 300; }
    if (bp !== this.cfg.botPx) { this.cfg.botPx = bp; this.fitKey = ''; }
    if (land && !playView && v.phase !== 'final' && v.phase !== 'reveal') {
      if (this.cfg.botPxL !== 34) { this.cfg.botPxL = 34; this.fitKey = ''; }
      const f = this.aimAt([0, 0.7, 0], 0.38, 0.5, yaw, pa); fx = f[0]; fy = f[1]; fz = f[2];
    }
    if (D0 != null && this.fitVal > 0) zoom = D0 / this.fitVal;
    c.yaw += angDiff(yaw, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.4, dt);
    c.fx = damp(c.fx, fx, 3, dt); c.fz = damp(c.fz, fz, 3, dt); c.fy = damp(c.fy, fy, 3, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    this.stepTrophy(dt);
    this.flashes = this.flashes.filter((f) => this.time - f.t0 < 1.2);
    void Z;
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  // labirent görünümü: tabla (çıkış kemeri dahil) HUD/takım şeridi ile alt çubuk arasındaki boş alana sığsın; yukarıdan bakış
  mazeCam(land, botH) {
    const Z = this.Z;
    const vw = this.vw || 360, vh = this.vh || 640;
    const key = `${Z.key}|${Math.round(vw)}|${Math.round(vh)}|${botH}`;
    if (this.fitK === key && this.fitV) return this.fitV;
    this.fitK = key;
    const pa = land ? 0.2 : 0.16;
    const pitch = (land ? 0.78 : 0.98) + pa, fov = land ? 0.7 : 0.78, asp = vw / vh;
    const yTop = land ? 0.12 : (128 / vh), yBot = land ? 0.95 : 1 - (botH + 16) / vh;
    const xL = land ? 0.03 : 0.03, xR = land ? 0.62 : 0.97;
    const sx = (xL + xR) / 2, sy = (yTop + yBot) / 2;
    const h = Z.side / 2 + Z.rim, top = TABLE_Y + BASE + Z.wh * 2.3;
    const H = [0, TABLE_Y, 0];
    const pts = [[-h, TABLE_Y, h], [h, TABLE_Y, h], [-h, top, -h], [h, top, -h], [-h, TABLE_Y, -h], [h, TABLE_Y, -h], [h, top, h]];
    const V = this.mats.TV, P = this.mats.TP, VP = this.mats.TVP;
    M.persp(P, fov, asp, 0.3, 120);
    const up = [0, Math.cos(pitch), -Math.sin(pitch)];
    const tgt = (D) => { const t = Math.tan(fov / 2) * D, dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp; return [H[0] - up[0] * dy + dx, H[1] - up[1] * dy, H[2] - up[2] * dy]; };
    const ok = (D) => {
      const T = tgt(D);
      M.look(V, T[0], T[1] + Math.sin(pitch) * D, T[2] + Math.cos(pitch) * D, T[0], T[1], T[2]);
      M.mul(VP, P, V);
      for (const [x, y, z] of pts) {
        const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
        if (cw <= 0.3) return false;
        const qx = (cx / cw) * 0.5 + 0.5, qy = 1 - ((cy / cw) * 0.5 + 0.5);
        if (qx < xL || qx > xR || qy < yTop || qy > yBot) return false;
      }
      return true;
    };
    let lo = 1.2, hi = 60;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    this.fitV = { D: hi, T: tgt(hi), pa };
    return this.fitV;
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
        if (a) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, CF, 2.6, 0.04, false, 2.2, 2.2);
      }
    }
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W, Z = this.Z, v = this.view;
    if (!Wd || !Z || !Wd.tray || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T;
    const blind = this.blind();
    M.set(m, 0, TABLE_Y, 0);
    D(Wd.tray, m, T.obj);
    D(Wd.floor, m, T.obj);
    D(Wd.posts, m, T.obj);
    D(Wd.exit, m, T.obj);
    // duvarlar: gözü bağlı yürüyen görmez; yalnız çarptığı duvarlar
    const showWalls = !blind && v.phase !== 'intro' && v.phase !== 'final';
    if (showWalls && Wd.walls) D(Wd.walls, m, T.obj);
    if (!shadow && v.phase !== 'intro') {
      const tint = this.wT || (this.wT = new Float32Array(3));
      if (blind) for (const h of v.hits || []) { this.wallAt(mc, h[0], h[1], h[2], 1); tint[0] = 0.95; tint[1] = 0.42; tint[2] = 0.32; D(Wd.wallU, mc, tint); }
      // çarpma parlaması (herkese: çarpılan duvar bir an kırmızı)
      for (const f of this.flashes) {
        const u = this.time - f.t0;
        if (u > 0.9 || (blind && f.k !== v.myTeam)) continue;
        this.wallAt(mc, f.x, f.y, f.d, 1.04 + 0.06 * Math.sin(u * 30));
        const k = 1 - u / 0.9;
        tint[0] = 1; tint[1] = 0.35 + 0.65 * (1 - k); tint[2] = 0.3 + 0.7 * (1 - k);
        D(Wd.wallU, mc, tint, 1, 0.6 * k);
      }
    }
    // piyonlar
    if (v.phase === 'play' || v.phase === 'reveal') {
      const tint = this.pT || (this.pT = new Float32Array(3));
      (v.teams || []).forEach((t, k) => {
        const p = this.pawns[k];
        if (!p || p.hidden || !t.pos) return;
        if (blind && k !== v.myTeam) return;
        const w = this.pawnW(k);
        if (!w) return;
        const u = this.time - p.t0;
        const sq = p.mode === 'hop' ? 1 + 0.12 * Math.sin(clamp(u / 0.24, 0, 1) * Math.PI) : p.mode === 'bump' ? 1 - 0.15 * Math.sin(clamp(u / 0.34, 0, 1) * Math.PI) : 1;
        const s = Z.cell * 0.62;
        M.set(mc, w[0], w[1], w[2], 0, 0, 0, s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq));
        const col = teamRGB(k), dim = t.on === 0 ? 0.5 : 1;
        tint[0] = col[0] * dim; tint[1] = col[1] * dim; tint[2] = col[2] * dim;
        D(Wd.pawn, mc, tint);
      });
    }
    // gözbağı (yürüyenlerin başında) ve ok tuşları
    if (v.phase === 'play') {
      const tint = this.bT || (this.bT = new Float32Array(3));
      (v.teams || []).forEach((t, k) => {
        if (t.done != null || t.walker == null || t.walker < 0) return;
        const p = this.seats[t.walker];
        const a = p && this.av.get(p.id);
        if (!a) return;
        const col = teamRGB(k);
        tint[0] = col[0] * 0.55; tint[1] = col[1] * 0.55; tint[2] = col[2] * 0.55;
        D(Wd.blind, a.M.head, tint);
        if (shadow) return;
        const b = this.seatW(a, 0, TABLE_Y + 0.002, PAD_Z);
        M.set(mc, b[0], b[1], b[2], a.yaw, 0, 0, 1);
        D(Wd.padB, mc, T.obj);
        const ph = this.padHit.get(t.walker);
        for (const d of ['n', 'e', 's', 'w']) {
          const [kx, kz] = PAD_KEYS[d];
          const q = this.seatW(a, kx, TABLE_Y + 0.022, PAD_Z + kz);
          const hit = ph && ph.d === d && this.time - ph.at < 0.25;
          M.set(mc, q[0], q[1] - (hit ? 0.006 : 0), q[2], a.yaw, 0, 0, 1);
          if (hit) { tint[0] = col[0] * 1.3; tint[1] = col[1] * 1.3; tint[2] = col[2] * 1.3; D(Wd.keyE, mc, tint, 1, 1); }
          else { tint[0] = 0.85; tint[1] = 0.85; tint[2] = 0.88; D(Wd.key, mc, tint); }
        }
      });
    }
    // şampiyon kupaları
    for (const Tr of this.trophies || []) {
      if (Tr.t < 0) continue;
      const k = clamp(Tr.t / 0.9, 0, 1);
      const y = TABLE_Y + 0.004 + (Tr.landed ? Math.max(0, Math.sin((Tr.t - 0.9) * 14) * 0.03 * Math.exp(-(Tr.t - 0.9) * 6)) : (1 - k * k) * 1.6);
      M.set(m, Tr.x, y, Tr.z, Tr.yaw + (Tr.landed ? 0 : (1 - k) * 4), 0, 0, 1.15);
      D(Wd.trophy, m, T.obj);
    }
  }
  // (x,y) karesinin d kenarındaki duvarın matrisi
  wallAt(m, x, y, d, sc) {
    const Z = this.Z, c = Z.cell;
    const cx = this.gx(x), cz = this.gz(y);
    const horiz = d === 'n' || d === 's';
    const px = cx + (d === 'e' ? c / 2 : d === 'w' ? -c / 2 : 0), pz = cz + (d === 's' ? c / 2 : d === 'n' ? -c / 2 : 0);
    const L = (c - Z.wt) * sc, Tk = Z.wt * 1.15 * sc, H = Z.wh * 1.05 * sc;
    M.set(m, px, TABLE_Y + BASE, pz, horiz ? 0 : Math.PI / 2, 0, 0, L, H, Tk);
  }
  drawFx(F, m) {
    const X = this.X, v = this.view, Z = this.Z;
    if (!v || !this.W || !Z) return;
    const t = this.time;
    const y0 = TABLE_Y + BASE + 0.003;
    // başlangıç ve çıkış kareleri parlar
    M.set(m, this.gx(0), y0, this.gz(0), 0, 0, 0, Z.cell * 0.55, 1, Z.cell * 0.55);
    drawMesh(X, this.res.glow, m, GREEN3, 0.32 + 0.08 * Math.sin(t * 3));
    M.set(m, this.gx(Z.N - 1), y0, this.gz(Z.N - 1), 0, 0, 0, Z.cell * 0.7, 1, Z.cell * 0.7);
    drawMesh(X, this.res.glow, m, GOLD3, 0.45 + 0.15 * Math.sin(t * 4));
    // izler: kendi takımımın yürüdüğü kareler (gözü bağlıya yolunu hatırlatır); açıklamada tüm takımların yolu
    if (v.phase === 'play' && v.trail && v.myTeam >= 0 && this.W.tile) {
      const col = teamRGB(v.myTeam);
      for (const q of v.trail) { M.set(m, this.gx(q[0]), y0, this.gz(q[1]), 0, 0, 0, Z.cell * 0.9, 1, Z.cell * 0.9); drawMesh(X, this.W.tile, m, col, 0.26); }
    }
    if (v.phase === 'reveal') {
      const tr = v.trails || [], nt = Math.max(1, tr.length);
      tr.forEach((list, k) => {
        const col = teamRGB(k), a = (k / nt) * TAU, ox = nt > 1 ? Math.cos(a) * Z.cell * 0.18 : 0, oz = nt > 1 ? Math.sin(a) * Z.cell * 0.18 : 0;
        for (const q of list) { M.set(m, this.gx(q[0]) + ox, y0, this.gz(q[1]) + oz, 0, 0, 0, Z.cell * 0.22, 1, Z.cell * 0.22); drawMesh(X, this.res.glow, m, col, 0.7); }
      });
    }
    // piyonların altında takım renginde ışık
    if (v.phase === 'play' || v.phase === 'reveal') {
      const blind = this.blind();
      (v.teams || []).forEach((tm, k) => {
        if (!tm.pos || (blind && k !== v.myTeam)) return;
        const w = this.pawnW(k);
        if (!w) return;
        M.set(m, w[0], y0 + 0.001, w[2], 0, 0, 0, Z.cell * 0.55, 1, Z.cell * 0.55);
        drawMesh(X, this.res.glow, m, teamRGB(k), k === v.myTeam ? 0.6 : 0.35);
      });
    }
    // kazanan / şampiyon koltuğu
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      let al = 0;
      const r1 = (v.res || [])[0];
      if (v.phase === 'reveal' && r1 && r1.time != null && p.t === r1.t) al = 0.6 + 0.2 * Math.sin(t * 5);
      else if (v.phase === 'final' && (this.champs || []).includes(i)) al = 0.7 + 0.2 * Math.sin(t * 5);
      if (al <= 0) return;
      M.set(m, a.pos[0], 0.02, a.pos[2], 0, 0, 0, 0.95, 1, 0.95);
      drawMesh(X, this.res.glow, m, GOLD3, al * 0.6);
    });
  }

  /* ---------- arayüz ---------- */
  bar() {
    const v = this.view;
    if (!v) return;
    let mode = 'none', html = '';
    const team = v.myTeam >= 0 ? v.teams[v.myTeam] : null;
    if (v.phase === 'play') {
      if (team && team.done != null) { mode = 'done'; html = `<div class="kl-st ok">🎉 Çıktınız! ${sec1(team.done)} sn · diğer takımlar bekleniyor</div>`; }
      else if (v.role === 'walker') {
        mode = 'walk';
        html = `<div class="kl-say" data-sy></div><div class="kl-st" data-st></div>
          <div class="kl-pad"><span></span><button data-mv="n" aria-label="Yukarı">⬆️</button><span></span><button data-mv="w" aria-label="Sola">⬅️</button><span class="c">🙈</span><button data-mv="e" aria-label="Sağa">➡️</button><span></span><button data-mv="s" aria-label="Aşağı">⬇️</button><span></span></div>`;
      } else if (v.role === 'guide') {
        mode = 'guide';
        html = `<div class="kl-st" data-st></div>
          <div class="kl-says"><button data-say="w" aria-label="Sola de">⬅️</button><button data-say="n" aria-label="Yukarı de">⬆️</button><button data-say="s" aria-label="Aşağı de">⬇️</button><button data-say="e" aria-label="Sağa de">➡️</button><button data-say="stop" aria-label="Dur de">✋</button></div>
          <div class="kl-hint">Sesle tarif et ya da oklara bas, balon olarak gider</div>`;
      } else { mode = 'watch'; html = '<div class="kl-st">👀 Bu oyunu izliyorsun, sonraki oyunda takıma gireceksin</div>'; }
    } else if (v.phase === 'reveal') {
      const res = v.res || [];
      const r1 = res[0];
      const nm = (k) => `${esc(v.teams[k].e)} ${esc(v.teams[k].name)}`;
      const solo = res.length === 1;
      const big = r1 && r1.time != null ? (solo ? `🎉 Labirentten çıktınız! <b>${sec1(r1.time)} sn</b>` : r1.t === v.myTeam ? `🏆 Takımınız birinci! <b>${sec1(r1.time)} sn</b>` : `🏆 ${nm(r1.t)} birinci! <b>${sec1(r1.time)} sn</b>`) : solo ? '⏱️ Süre doldu, çıkamadınız' : '⏱️ Süre doldu, kimse çıkamadı';
      const rows = res.map((r) => `<div class="${r.t === v.myTeam ? 'me' : ''}"><span>${r.rank}. ${nm(r.t)}</span><span>${r.time != null ? `${sec1(r.time)} sn · ${r.bumps} çarpma · +${r.pts}` : `çıkamadı · ${r.left} kare kaldı`}</span></div>`).join('');
      const q = v.last ? '🏆 Son turdu, kupa geliyor!' : 'Sıradaki turda yürüyen değişiyor';
      html = `<div class="kl-res ${r1 && r1.time != null ? 'win' : ''}"><div class="big">${big}</div>${res.length > 1 ? `<div class="rk">${rows}</div>` : ''}<div class="q">${res.length === 1 && r1 && r1.time != null ? `${r1.bumps} çarpma (+${r1.bumps * 2} sn ceza) · ` : ''}${q}</div></div>`;
      mode = 'res';
    }
    const key = `${v.game}|${v.round}|${mode}|${mode === 'res' || mode === 'done' || mode === 'watch' ? html : ''}`;
    if (this.setBar(key, html)) { this.stEl = this.el.bar.querySelector('[data-st]'); this.syEl = this.el.bar.querySelector('[data-sy]'); this.stK = null; this.sayK = ''; }
    this.barNow();
  }
  // durum satırı ve tarif balonu (sık güncellenir)
  barNow() {
    const v = this.view;
    if (!v || v.phase !== 'play') return;
    const team = v.myTeam >= 0 ? v.teams[v.myTeam] : null;
    if (!team) return;
    if (this.stEl && this.stEl.isConnected) {
      let st = '', cls = '';
      if (v.role === 'walker') {
        const p = this.pawns[v.myTeam];
        const recent = p && this.time - p.t0 < 1.6 && team.seq > 0;
        if (recent && team.ok === false) { st = `🧱 Duvar! +2 sn ceza`; cls = 'bad'; }
        else if (recent && team.ok) { st = `✅ İlerledin · ${team.moves} adım`; cls = 'ok'; }
        else st = `🙈 Gözlerin bağlı · ${team.moves} adım · ${team.bumps} çarpma`;
      } else {
        const w = v.seats[team.walker];
        st = `🗺️ Rehbersin: ${esc((w?.n || '').replace(/ 🤖$/, ''))} yürüyor · ${team.bumps} çarpma`;
      }
      const k = st + cls;
      if (k !== this.stK) { this.stK = k; this.stEl.innerHTML = st; this.stEl.className = `kl-st ${cls}`; }
    }
    if (this.syEl && this.syEl.isConnected) {
      // en son tarif (rehberden)
      let h = '';
      const sy = v.say;
      if (sy && sy.i !== v.me) {
        const age = this.ctx.serverNow() - sy.at;
        if (age < 6000) { const g = v.seats[sy.i]; h = `${ARROW[sy.d] || ''} ${SAYTXT[sy.d] || ''} <small>— ${esc((g?.n || '').replace(/ 🤖$/, ''))}</small>`; this.syEl.classList.toggle('old', age > 2500); }
      }
      if (h !== this.sayK) { this.sayK = h; this.syEl.innerHTML = h; }
    }
  }
  modeSeg(v) {
    return `<div class="kl-seg" role="group" aria-label="Labirent boyu"><button data-act="kl-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">🧩 Kolay 6×6</button><button data-act="kl-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🔥 Zor 8×8</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      const tm = n >= 4 ? `${Math.floor(n / 2)} takım kurulacak (ikişer kişi)` : n >= 2 ? 'Hep birlikte tek takımsınız: süreye karşı' : 'Oynamak için masada en az 2 kişi lazım';
      html = `<div class="card kl-in">
        <div class="tt">🧭 Kör Labirent</div>
        <div class="sub">Gözü bağlı yürü, haritayı gören yol tarif etsin!</div>
        <div class="kl-ru"><div class="a"><b>🙈</b>Biri gözü bağlı yürür</div><div class="g"><b>🗺️</b>Takımı haritadan tarif eder</div><div class="y"><b>🏁</b>İlk çıkan takım kazanır</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="kl-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${tm}. Duvara çarpmak 2 sn ceza; herkes bir kez yürür.</div>
      </div>`;
    } else if (v.phase === 'final' && this.finCard()) {
      const wait = this.ctx.serverNow() - (v.finAt || 0) < (v.minMs || 3000);
      const tb = v.teamBoard || [];
      const mine = v.champ >= 0 && v.champ === v.myTeam;
      const ct = v.champ >= 0 ? v.teams[v.champ] : null;
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}|${tb.map((s) => s.t + ':' + s.score).join(',')}`;
      const solo = v.teams.length === 1;
      const tt = solo ? '🧭 Oyun bitti!' : !ct ? 'Oyun bitti!' : `🏆 ${mine ? 'Kazandınız!' : `${esc(ct.e)} ${esc(ct.name)} kazandı!`}`;
      const names = (k) => v.teams[k].members.map((i) => esc((v.seats[i]?.n || '').replace(/ 🤖$/, ''))).join(' & ');
      const rows = tb.map((s, k) => `<div class="${s.t === v.myTeam ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][k] || `${k + 1}.`} ${esc(v.teams[s.t].e)} ${esc(v.teams[s.t].name)} <em>${names(s.t)}</em></span><b>${s.score} puan</b></div>`).join('');
      html = `<div class="card">
        <div class="tt">${tt}</div>
        <div class="sub">${solo ? `${v.teams[0].sc} puan topladınız: ${names(0)}` : ct ? `En iyi takım çalışması: ${names(v.champ)}` : 'Bu oyunda kimse labirentten çıkamadı'}</div>
        <div class="kl-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="kl-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    let top = '';
    if (v.phase === 'play') top = `${v.round}/${v.rounds}. tur · ⏱ ${mmss((v.endsAt || 0) - this.ctx.serverNow())}`;
    else if (v.phase === 'reveal') top = `${v.round}/${v.rounds}. tur bitti`;
    this.top(top);
    // takım şeridi (ilerleme)
    let th = '';
    if ((v.phase === 'play' || v.phase === 'reveal') && v.teams && v.teams.length > 1) {
      th = v.teams.map((t, k) => {
        const mine = k === v.myTeam, done = t.done != null;
        const pr = t.prog != null ? t.prog : null;
        return `<span class="${mine ? 'mine' : ''}${done ? ' done' : ''}" style="--tc:${TEAM_COL[k % 6]}">${esc(t.e)} ${esc(t.name)}${done ? ` 🏁 ${sec1(t.done)}` : pr != null ? `<b><i style="width:${pr}%"></i></b>` : ' 🙈'}</span>`;
      }).join('');
    }
    if (th !== this.thK) { this.thK = th; this.teamsEl.innerHTML = th; }
    // etiketler: takım rozeti, puan; yürüyende gözbağı işareti
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      const t = p.t >= 0 && v.teams ? v.teams[p.t] : null;
      const walker = v.phase === 'play' && t && t.walker === i && t.done == null;
      let x = t ? `<span class="kl-t">${esc(t.e)}</span>` : '';
      if (p.sc) x += `<span class="kl-sc">⭐${p.sc}</span>`;
      if (walker) x += '<span>🙈</span>';
      if (v.phase === 'final' && (this.champs || []).includes(i)) x += '👑';
      const k = x + '|' + walker;
      if (o.klK !== k) {
        o.klK = k;
        let el = o.lbl.querySelector('.kl-x');
        if (!el) { el = document.createElement('span'); el.className = 'kl-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lbl.classList.toggle('blind', !!walker);
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.kl-x')) o.klK = '';
  }
  // rehberlerin ok balonları (başlarının üstünde; yalnız aynı takım görür — sunucu yalnız takıma gönderir)
  placeLbls() {
    super.placeLbls();
    const v = this.view;
    const mineL = v && v.me >= 0 && v.phase === 'play' && v.role !== 'watch' ? this.lbl.get(v.seats[v.me]?.id) : null;
    if (mineL) mineL.lbl.style.display = 'none';
    for (const [i, b] of this.bubs) {
      const u = this.time - b.at;
      const p = this.seats[i];
      const a = p && this.av.get(p.id);
      if (u > 1.9 || !a || !v || v.phase !== 'play') {
        if (b.el) { b.el.remove(); b.el = null; }
        if (u > 1.9) this.bubs.delete(i);
        continue;
      }
      if (!b.el) { b.el = document.createElement('div'); b.el.className = 'kl-bub'; b.el.innerHTML = `${ARROW[b.d] || ''}<small>${SAYTXT[b.d] || ''}</small>`; this.el.lbls.appendChild(b.el); }
      const q = this.project(a.headW[0], a.headW[1] + 0.62, a.headW[2]);
      if (!q) { b.el.style.display = 'none'; continue; }
      const pop = Math.min(1, u / 0.12), sc = 0.7 + 0.3 * pop;
      b.el.style.display = 'block';
      b.el.style.opacity = u > 1.5 ? String(Math.max(0, 1 - (u - 1.5) / 0.4)) : '1';
      // ekran kenarındaki karakterin balonu taşmasın: içeri kayar, kuyruğu karaktere bakar
      if (b.w == null) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
      const W = this.vw || this.el.wrap.clientWidth || 390, H = this.vh || this.el.wrap.clientHeight || 844, half = b.w / 2;
      const x = Math.max(half + 6, Math.min(Math.max(half + 6, W - half - 6), q[0])), y = Math.max(b.h + 8, Math.min(Math.max(b.h + 8, H - 8), q[1]));
      b.el.style.setProperty('--tx', `${Math.round(Math.max(-half + 14, Math.min(half - 14, q[0] - x)))}px`);
      b.el.style.transform = `translate(${Math.round(x - half)}px,${Math.round(y - b.h)}px) scale(${sc.toFixed(2)})`;
    }
    this.barNow();
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const N = v.size || 6, S = Math.min(r * 1.25, w * 0.62), cs = S / N, x0 = w / 2 - S / 2, y0 = h * 0.46 - S / 2;
    g.fillStyle = '#dcb98a'; g.fillRect(x0, y0, S, S);
    g.strokeStyle = '#6e4524'; g.lineWidth = Math.max(2, cs * 0.1); g.lineCap = 'round';
    const open = !this.blind() && v.maze ? v.maze : null;
    if (open) {
      g.beginPath();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const o = open[y][x], X = x0 + x * cs, Y = y0 + y * cs;
        if (!(o & 1)) { g.moveTo(X, Y); g.lineTo(X + cs, Y); }
        if (!(o & 8)) { g.moveTo(X, Y); g.lineTo(X, Y + cs); }
        if (y === N - 1 && !(o & 4)) { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); }
        if (x === N - 1 && !(o & 2)) { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); }
      }
      g.stroke();
    } else { g.strokeRect(x0, y0, S, S); }
    if (this.blind()) for (const hh of v.hits || []) {
      const X = x0 + hh[0] * cs, Y = y0 + hh[1] * cs;
      g.strokeStyle = '#e0503a'; g.beginPath();
      if (hh[2] === 'n') { g.moveTo(X, Y); g.lineTo(X + cs, Y); } else if (hh[2] === 's') { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); } else if (hh[2] === 'w') { g.moveTo(X, Y); g.lineTo(X, Y + cs); } else { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); }
      g.stroke();
    }
    g.fillStyle = 'rgba(60,220,110,.6)'; g.fillRect(x0 + 2, y0 + 2, cs - 4, cs - 4);
    g.fillStyle = 'rgba(255,200,60,.7)'; g.fillRect(x0 + (N - 1) * cs + 2, y0 + (N - 1) * cs + 2, cs - 4, cs - 4);
    (v.teams || []).forEach((t, k) => {
      if (!t.pos || (this.blind() && k !== v.myTeam)) return;
      const p = this.pawns[k];
      const [px, py] = p ? this.pawnPos(p) : t.pos;
      g.fillStyle = TEAM_COL[k % 6];
      g.beginPath(); g.arc(x0 + (px + 0.5) * cs + (k - 1) * 3, y0 + (py + 0.5) * cs, cs * 0.28, 0, TAU); g.fill();
      g.strokeStyle = '#1c1633'; g.lineWidth = 2; g.stroke();
    });
  }
  onDispose() {
    window.removeEventListener('keydown', this.onKey);
    for (const b of this.bubs.values()) if (b.el) b.el.remove();
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new MazeGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[krl]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
