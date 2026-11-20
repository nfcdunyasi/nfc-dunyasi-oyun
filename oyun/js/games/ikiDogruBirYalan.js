// İki Doğru Bir Yalan — 3D yalan makinesi masası (NFC Dünyası Oyun)
// Herkes kendisi hakkında 3 cümle yazar ve birini yalan olarak işaretler (masada herkesin önünde bir not defteri, kalemle
// yazıyorlar). Sonra sırayla her yazarın cümleleri masanın ortasındaki üç karta basılır; yazar spot ışığı altında oturur,
// masanın önündeki yalan makinesinin iğnesi titrer. Diğerleri gizlice yalanı seçer; oy verenin fişi önüne konur. Açılışta
// fişler seçilen kartların önüne uçar, yalan kartına kırmızı "YALAN" damgası basılır, makinenin lambası yanar. Yalanı bulan
// puan alır, yazar kandırdığı her kişi için puan alır. Masa kiti (masa3d.js) ve Kurye Yarışı motoruyla çizilir; WebGL
// yoksa 2D görünüm gösterilir.
import { _masa } from './masa3d.js?v=2026-11-21-a';
import * as sfx from '../sfx.js?v=2026-11-21-a';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

const CW = 0.86, CH = 0.6, CT = 0.028;       // kart: genişlik, yükseklik, kalınlık
const CARD_GAP = 0.95, CARD_Z = 0.02;         // kart merkezleri arası, kartın alt kenarının masadaki yeri
const CARD_TILT = 0.95;                       // kartın geriye yatışı (radyan): kürsüde kameraya bakar
const CARD_Y = TABLE_Y + 0.03;               // kartın alt kenarının yüksekliği (kürsünün dudağı)
const MX = 0, MZ = 0.8, MS = 1.9;           // yalan makinesi (kartların önünde) ve ölçeği
const CHIP_R = 0.07, CHIP_H = 0.02;        // fiş
const CHIP_T0 = 0.55, CHIP_GAP = 0.13, CHIP_FLY = 0.55, STAMP_DT = 0.5;
const NUMC = ['#2a9d8f', '#e9a23b', '#7b5cd6']; // kart numaralarının renkleri (DOM'da da aynı)
const NUM3 = NUMC.map((h) => { const n = parseInt(h.slice(1), 16); return new Float32Array([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]); });
const RED3 = new Float32Array([1, 0.25, 0.22]), GREEN3 = new Float32Array([0.3, 0.9, 0.45]), GOLD3 = new Float32Array([1, 0.84, 0.36]);
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
// "Fikir ver" düğmesinin önerileri (oyuncunun kendi cümlesini yazmasına yardım için; istediği gibi değiştirebilir)
const IDEAS = ['Hiç uçağa binmedim', 'Üç dil konuşabiliyorum', 'Çocukken bir yarışma kazandım', 'Pizzaya ananas koyarım', 'Hiç kemiğim kırılmadı', 'Yüzme bilmem', 'Bir ünlüyle fotoğrafım var', 'Gece yarısından önce uyuyamam', 'Çayı şekersiz içerim', 'Hiç sushi yemedim', 'Bir kez yanlış otobüse binip kayboldum', 'Islık çalamam', 'Örümceklerden korkarım', 'Sol elimle de yazabilirim', 'Hiç kamp yapmadım', 'Bir kez sahnede şarkı söyledim', 'Evde bir saksı bitkim var', 'Hiç kar görmedim', 'Satranç oynamayı bilirim', 'Kahvaltıyı hiç atlamam', 'Bir kez bir yunus gördüm', 'Hiç dövme yaptırmadım', 'Bir kez asansörde mahsur kaldım', 'Rüyalarımı hep hatırlarım', 'İlkokulda sınıf başkanıydım', 'Hiç ehliyetim olmadı', 'Kulaklarımı oynatabiliyorum', 'Bir yarışma programına katıldım', 'Kedileri köpeklerden çok severim', 'Hiç sinemada uyumadım'];

const STYLE = `
#ky.idy .msg{top:13%}
#ky.idy .id-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 11px 10px;text-align:center}
#ky.idy .id-box.dark{background:#13262c;color:#fff}
#ky.idy .id-q{border-radius:16px;background:#1f4e5a;color:#fff;padding:7px 12px 9px;border:3px solid var(--ink)}
#ky.idy .id-q small{display:block;font-size:11.5px;font-weight:900;letter-spacing:.08em;opacity:.82}
#ky.idy .id-q b{display:block;font-size:clamp(16px,4.6vw,21px);font-weight:900;line-height:1.2;margin-top:2px;overflow-wrap:anywhere;text-wrap:balance}
#ky.idy .id-box.dark .id-q{background:#0b1a1e;border-color:rgba(255,255,255,.35)}
#ky.idy .id-opts{display:grid;gap:6px;margin-top:8px;text-align:left}
#ky.idy .id-o{position:relative;display:flex;align-items:center;gap:9px;min-width:0;width:100%;border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);padding:7px 10px 7px 7px;font-weight:800;font-size:14.5px;line-height:1.25;background:#fff;color:var(--ink);text-align:left;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.idy .id-o .nb{flex:0 0 auto;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--nc);color:#fff;font-weight:900;font-size:15px;border:2px solid var(--ink)}
#ky.idy .id-o span{flex:1;min-width:0;overflow-wrap:anywhere}
#ky.idy .id-o em{flex:0 0 auto;font-style:normal;font-weight:900;font-size:12px;border-radius:99px;padding:2px 8px;background:#1c1633;color:#fff;white-space:nowrap}
#ky.idy .id-o.on{background:#ffd23f}
#ky.idy .id-o:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.idy .id-o[disabled]{opacity:1}
#ky.idy .id-o.lie{background:#ffe0dc}
#ky.idy .id-o.lie em{background:#e63946}
#ky.idy .id-o.tru em{background:#2a9d6f}
#ky.idy .id-o.dim{opacity:.62}
#ky.idy .id-o .dots{display:flex;flex-wrap:wrap;gap:2px;justify-content:flex-end;max-width:64px}
#ky.idy .id-o .dots i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid var(--ink)}
#ky.idy .id-box.dark .id-o{background:#203a41;color:#fff;border-color:#0b1a1e;box-shadow:3px 3px 0 #0b1a1e}
#ky.idy .id-box.dark .id-o.lie{background:#5a1e24}
#ky.idy .id-ft{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800}
#ky.idy .id-ft .n{background:#1f4e5a;color:#fff;border-radius:99px;padding:2px 9px}
#ky.idy .id-ft .z{opacity:.72}
#ky.idy .id-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:7px 13px;font-weight:900;font-size:14.5px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.idy .id-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:12.5px;padding:4px 9px;border-width:2px}
#ky.idy .id-b.mint{background:#b8f2e6}
#ky.idy .id-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.idy .id-b[disabled]{opacity:.5}
#ky.idy .id-h{font-size:clamp(17px,4.8vw,21px);font-weight:900;line-height:1.2;margin-top:7px;text-wrap:balance}
#ky.idy .id-s{font-size:12.5px;font-weight:700;opacity:.76;margin-top:3px;text-wrap:balance}
#ky.idy .id-row{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:8px}
#ky.idy .id-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:8px}
#ky.idy .id-tm i{display:block;height:100%;background:#ff5a36;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.idy .id-hd{display:flex;align-items:center;justify-content:space-between;gap:8px}
#ky.idy .id-hd b{font-size:16px;font-weight:900}
#ky.idy .id-hd .tm{font-weight:900;font-variant-numeric:tabular-nums;font-size:15px}
#ky.idy form.id-f{display:grid;gap:6px;margin-top:7px}
#ky.idy .id-f{grid-template-columns:minmax(0,1fr)}
#ky.idy .id-in{display:flex;align-items:center;gap:6px;min-width:0}
#ky.idy .id-in .nb{flex:0 0 auto;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--nc);color:#fff;font-weight:900;font-size:14px;border:2px solid var(--ink)}
#ky.idy .id-in input{flex:1;min-width:0;border:3px solid var(--ink);border-radius:12px;padding:8px 10px;font:700 15px/1.2 system-ui,sans-serif;background:#fff;color:var(--ink);outline:none}
#ky.idy .id-in input:focus{box-shadow:0 0 0 3px #b8f2e6}
#ky.idy .id-in.lie input{background:#ffe9e6;border-color:#e63946}
#ky.idy .id-in .lt{flex:0 0 auto;border:3px solid var(--ink);border-radius:12px;padding:6px 7px;font-weight:900;font-size:12.5px;background:#eee8dc;color:var(--ink);white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.idy .id-in.lie .lt{background:#e63946;color:#fff}
#ky.idy .id-err{min-height:16px;font-size:12.5px;font-weight:800;color:#d62839}
#ky.idy .id-err:empty{min-height:0;display:none}
#ky.idy .id-mine{display:grid;gap:4px;margin-top:7px;text-align:left}
#ky.idy .id-mine div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 8px;background:#fff;font-weight:800;font-size:13.5px}
#ky.idy .id-mine div.lie{background:#ffe0dc}
#ky.idy .id-mine div .nb{flex:0 0 auto;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--nc);color:#fff;font-size:11.5px;font-weight:900}
#ky.idy .id-mine div span{flex:1;min-width:0;overflow-wrap:anywhere}
#ky.idy .shake{animation:idShake .38s}
@keyframes idShake{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
#ky.idy .lbl .id-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.idy .lbl .id-x:empty{display:none}
#ky.idy .lbl .id-v{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:50%;background:var(--nc);color:#fff;font-weight:900;font-size:.82em;line-height:1}
#ky.idy .lbl .id-g{display:inline-block;padding:0 5px;border-radius:9px;background:#2a9d6f;color:#fff;font-weight:900;font-size:.85em;line-height:1.35}
#ky.idy .lbl .id-g.r{background:#e63946}
#ky.idy .lbl .id-m{display:inline-block;padding:0 4px;border-radius:9px;background:#ffd23f;color:#1c1633;font-weight:900;font-size:.85em;line-height:1.35}
#ky.idy .lbl.id-au{box-shadow:0 0 0 3px #ffd23f,0 0 16px rgba(255,210,63,.8)}
#ky.idy .card .id-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.idy .card .id-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.idy .card .id-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.idy .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.idy .card .id-tb{display:grid;gap:5px;margin-top:10px;max-height:min(34vh,280px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.idy .card .id-tb>div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:5px 10px;background:#fff;color:var(--ink);font-weight:800;font-size:14px}
#ky.idy .card .id-tb>div.me{background:#fff4c2}
#ky.idy .card .id-tb i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.idy .card .id-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.idy .card .id-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.75;white-space:nowrap}
#ky.idy .card .id-tb b{font-weight:900;white-space:nowrap}
#ky.idy .card .id-aw{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}
#ky.idy .card .id-aw span{border:2px solid var(--ink);border-radius:99px;padding:3px 10px;font-weight:800;font-size:12.5px;background:#fff}
#ky.idy .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.idy .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.idy .id-box{width:min(460px,54vw);padding:6px 9px 8px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.idy .id-q{padding:5px 10px 6px}#ky.idy .id-q b{font-size:15px}
#ky.idy .id-opts{gap:5px;margin-top:6px}
#ky.idy .id-o{padding:5px 8px 5px 5px;font-size:13px}
#ky.idy .id-o .nb{width:24px;height:24px;font-size:13px}
#ky.idy .id-in input{padding:6px 8px;font-size:14px}
#ky.idy .id-ft{margin-top:5px}
#ky.idy .id-h{font-size:16px;margin-top:5px}
#ky.idy .id-tm{margin-top:5px}
#ky.idy .card .id-tb{max-height:24vh;margin-top:6px}
#ky.idy .card .id-ru{margin-top:6px}#ky.idy .card .id-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.idy .card .id-ru div b{font-size:17px}
}
@media (min-aspect-ratio:11/10){#ky.idy .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, yazma, sonuç, final): sinsi dedektif cazı (Mi minör, 96 bpm, salıncaklı): yürüyen kontrbas, fırça, parmak
// şıklatma, vibrafon akorları, arada boğuk trompet cevabı. 'race' (oylama): gerilim (Mi minör, 108 bpm): pizzicato
// ostinato, saat tıkırtısı, kalp atışı gibi tok vuruş, alçak pad. 'mute' (açılış): müzik susar, davul gümbürtüsü çalar.
class IdSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 108 : 96; }
  swing() { return this.mode === 'race' ? 0.02 : 0.17; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // Em – Cmaj7 – Am – B7
      const CH = [[40, [64, 67, 71]], [36, [64, 67, 71]], [45, [64, 69, 72]], [47, [63, 66, 71]]];
      const [root, ch] = CH[bar % 4];
      if (s === 0 || s === 3) this.iKick(t, s ? 0.05 : 0.08, 90, 42, 0.2);
      if (s % 2 === 0) this.iTick(t, s % 4 === 0 ? 0.024 : 0.012);
      const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
      if (s % 2 === 0) this.iPizz(t, ch[ARP[(s >> 1) % 8]] - (s % 8 === 6 ? 12 : 0), 0.05, 0.16, 0.15);
      if (s === 0) this.iBass(t, root - 12, spb * 1.7, 0.075, 'up');
      if (s === 8) this.iBass(t, root - 12 + 7, spb * 1.4, 0.05, 'up');
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch.map((m) => m - 12), spb * 8, 0.013, 950, 0.3);
      if (s === 12 && bar % 4 === 3) this.iBell(t, 83, 0.012, spb, 0.3);
      if (s === 14 && bar % 2 === 1) this.iWood(t, 0.03, 1300);
      return;
    }
    // Em9 – Cmaj7 – Am7 – B7 (sinsi caz)
    const CH = [[40, [55, 59, 62, 66]], [36, [55, 59, 64, 67]], [45, [55, 60, 64, 67]], [47, [57, 61, 63, 66]]];
    const WALK = [[40, 43, 45, 37], [36, 40, 43, 44], [45, 48, 52, 50], [47, 45, 42, 39]];
    const [, ch] = CH[bar % 4];
    if (s % 4 === 0) this.iBass(t, WALK[bar % 4][s >> 2], spb * 0.85, 0.12, 'up');
    if (s % 2 === 0) this.iBrush(t, s % 8 === 4 ? 0.05 : 0.025, 0.14);
    if (s === 4 || s === 12) this.iClap(t, 0.028);
    if (s === 2 || s === 10) ch.forEach((m, k) => this.iVibe(t + k * 0.007, m + 12, 0.019 * (k ? 0.8 : 1), 1.1, 0.32));
    // alttan yumuşak pad ve hafif ride: boşlukları doldurur
    if (s === 0) this.iPad(t, ch, spb * 4, 0.012, 1000, 0.3);
    if (s % 4 === 0 || s % 4 === 3) this.iHat(t, s % 4 === 0 ? 0.012 : 0.008);
    // sinsi melodi (2 ölçüde bir), yanıtı boğuk trompet
    const MEL = [[64, null, 67, null, 70, 69, null, 67], [null, null, 64, null, 62, null, 64, null], [69, null, 72, null, 75, 74, null, 72], [null, 71, null, 69, 66, null, null, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null && Math.floor(bar / 4) % 2 === 0) this.iPluck(t, m, 0.03, st * 1.7, 'triangle', 2600, 0.25);
    if (s % 2 === 0 && m != null && Math.floor(bar / 4) % 2 === 1 && bar % 2 === 1) this.iBrass(t, m - 12, st * 1.6, 0.026, 0.2);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'lie': // yalan işareti
        this.tone(330, t, 0.07, 'square', 0.04, 220, 0.002);
        this.tone(440, t + 0.06, 0.08, 'triangle', 0.05, null, 0.002);
        break;
      case 'idea': // fikir: küçük ışıltı
        [988, 1319, 1568].forEach((f, k) => this.tone(f, t + k * 0.05, 0.12, 'triangle', 0.035, null, 0.002));
        break;
      case 'send': // cümleler gönderildi: kâğıt + mühür
        this.noise(t, 0.16, 0.08, { type: 'bandpass', freq: 2600, to: 900, q: 1.2, attack: 0.01 });
        this.tone(110, t + 0.12, 0.12, 'sine', 0.22, 60, 0.002);
        this.noise(t + 0.12, 0.05, 0.1, { type: 'lowpass', freq: 700, q: 0.8 });
        break;
      case 'wrote': // başkası yazdı: hafif kâğıt
        this.noise(t, 0.09, 0.035, { type: 'bandpass', freq: 3000, to: 1500, q: 1.4, attack: 0.008 });
        break;
      case 'allin': // herkes yazdı
        [[784, 0], [988, 0.1], [1175, 0.2]].forEach(([f, d]) => this.tone(f, t + d, 0.22, 'triangle', 0.06, null, 0.002));
        break;
      case 'card': // kartlar dizildi
        for (let k = 0; k < 3; k++) { this.noise(t + k * 0.11, 0.06, 0.06, { type: 'bandpass', freq: 2200, q: 1.3 }); this.tone(520 + k * 120, t + k * 0.11 + 0.02, 0.06, 'triangle', 0.035, null, 0.002); }
        break;
      case 'chip': // fiş masaya kondu (a: 0..1 → hafif tını farkı)
        this.tone(1700 + (a || 0) * 400, t, 0.03, 'triangle', 0.05, null, 0.001);
        this.tone(2600 + (a || 0) * 500, t + 0.012, 0.025, 'sine', 0.03, null, 0.001);
        this.noise(t, 0.03, 0.03, { type: 'highpass', freq: 4000, q: 0.7 });
        break;
      case 'stamp': // YALAN damgası: tok vuruş + vızıltı
        this.duck(0.25, 1.4);
        this.tone(80, t, 0.16, 'sine', 0.3, 45, 0.002);
        this.noise(t, 0.07, 0.16, { type: 'lowpass', freq: 650, q: 0.8 });
        this.tone(155, t + 0.12, 0.42, 'sawtooth', 0.05, 150, 0.004);
        this.tone(160, t + 0.12, 0.42, 'square', 0.03, 158, 0.004);
        break;
      case 'found': // yalanı buldum
        this.duck(0.3, 1.6);
        [[659, 0], [784, 0.08], [988, 0.16], [1319, 0.26]].forEach(([f, d]) => this.tone(f, t + d, d > 0.2 ? 0.4 : 0.12, 'triangle', 0.07, null, 0.002));
        break;
      case 'fooled': // kandırıldım: "vah vah"
        this.duck(0.35, 1.6);
        [[392, 0, 0.22], [370, 0.24, 0.22], [349, 0.48, 0.22], [330, 0.72, 0.6]].forEach(([f, d, L]) => this.tone(f, t + d, L, 'sawtooth', 0.04, f * 0.97, 0.02));
        break;
      case 'liar': // yazarken masayı kandırdım
        this.duck(0.2, 2);
        [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.3]].forEach(([f, d]) => this.tone(f, t + d, d > 0.25 ? 0.5 : 0.14, 'square', 0.05, null, 0.003));
        this.cheer(t + 0.3, 1.1);
        break;
      case 'caught': // yazarken herkes buldu
        this.tone(220, t, 0.25, 'triangle', 0.08, 180, 0.01);
        this.tone(196, t + 0.26, 0.45, 'triangle', 0.08, 150, 0.01);
        break;
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
// kart gövdesi (orijin alt kenarın ortası, ön yüz +z): krem kart, koyu çerçeve
function cardModel(mb) {
  mb.rbox(-CW / 2 - 0.014, -0.014, -CT / 2 - 0.004, CW / 2 + 0.014, CH + 0.014, -CT / 2 + 0.006, 0.01, C('#13262c', -0.4), 1);
  mb.rbox(-CW / 2, 0, -CT / 2, CW / 2, CH, CT / 2, 0.012, C('#fbf3e0', -0.25), 1);
}
// kart standı: ahşap taban ve arkada destek
function standModel(mb) {
  const Wd = C('#8a5a33', -0.5), Dk = C('#5e3b20', -0.5);
  const zb = -CH * Math.sin(CARD_TILT), yb = CH * Math.cos(CARD_TILT);
  mb.rbox(-CW / 2 + 0.02, 0, -0.02, CW / 2 - 0.02, 0.034, 0.035, 0.01, Wd, 1);
  mb.rbox(-CW / 2 + 0.07, 0, zb - 0.03, CW / 2 - 0.07, yb - 0.02, zb + 0.05, 0.012, Dk, 1);
  mb.rbox(-CW / 2 + 0.02, 0, zb - 0.04, CW / 2 - 0.02, 0.02, 0.035, 0.008, Wd, 1);
}
// kartın ön yüzü (dokulu)
function faceModel(tb) {
  const x0 = -CW / 2 + 0.012, x1 = CW / 2 - 0.012, y0 = 0.012, y1 = CH - 0.012, z = CT / 2 + 0.0012;
  tb.tquad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], 0, 0, 1, 1, [0, 0, 0]);
}
// damga (YALAN / DOĞRU), atlasın üst yarısındaki iki hücreden biri
function stampModel(k) {
  return (tb) => {
    const w = 0.62, h = 0.31;
    tb.tquad([-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], k * 0.5, 0, k * 0.5 + 0.5, 0.5, [0, 0, 0]);
  };
}
// fiş: kenarı yuvarlatılmış silindir (beyaz; oyuncu rengiyle boyanır) ve üstünde beyaz halka
function chipModel(mb) {
  const r = CHIP_R, h = CHIP_H;
  mb.lathe(0, 0, 0, [[0, 0], [r * 0.9, 0], [r, h * 0.25], [r, h * 0.75], [r * 0.9, h], [0, h]], 22, () => C('#ffffff', -0.35));
}
function ringModel(mb) {
  const r = CHIP_R, h = CHIP_H + 0.0007;
  mb.lathe(0, 0, 0, [[r * 0.72, h], [r * 0.5, h]], 22, () => C('#ffffff', 0.2));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU, c = Math.cos(a), s = Math.sin(a);
    mb.rbox(c * r * 0.93 - 0.004, h * 0.2, s * r * 0.93 - 0.004, c * r * 0.93 + 0.004, h * 0.8, s * r * 0.93 + 0.004, 0.001, C('#ffffff', 0.1), 1);
  }
}
// yalan makinesi: koyu metal gövde, kâğıt rulosu, düğmeler, kırmızı lamba yuvası (orijin taban ortası, ön +z)
function machineModel(mb) {
  const Bd = C('#33474d', -0.55), Tp = C('#26363b', -0.5), Rl = C('#f1ead8', -0.3), Kn = C('#c9b27a', -0.6), Ch = C('#9aa4a8', -0.6);
  mb.rbox(-0.22, 0, -0.11, 0.22, 0.085, 0.11, 0.018, Bd, 1);
  mb.rbox(-0.2, 0.084, -0.095, 0.2, 0.09, 0.095, 0.006, Tp, 1);
  // kâğıt rulosu (sağda, x yönünde dönen)
  mb.push().T(0.185, 0.105, 0, 0, 0, Math.PI / 2, 1);
  mb.lathe(0, 0, 0, [[0, -0.075], [0.022, -0.075], [0.024, -0.07], [0.024, 0.07], [0.022, 0.075], [0, 0.075]], 16, () => Rl);
  mb.pop();
  // ön yüzde düğmeler
  for (const x of [-0.13, -0.07]) mb.sphereS(x, 0.045, 0.112, 0.014, 0.014, 0.008, Kn, 10, 6);
  mb.rbox(0.02, 0.025, 0.108, 0.17, 0.065, 0.116, 0.004, Ch, 1);
  // lamba yuvası (solda arkada)
  mb.lathe(-0.17, 0.09, -0.07, [[0, 0], [0.026, 0], [0.026, 0.022], [0, 0.022]], 14, () => Ch);
}
function lampModel(mb) { mb.sphereS(0, 0, 0, 0.022, 0.024, 0.022, C('#ff3b30', 0.3), 12, 8); }
// iğne kolu (orijin mafsal; kol +x yönünde, ucu kâğıda değer)
function needleModel(mb) {
  const Ch = C('#dfe5e8', -0.4), Dk = C('#1c1633', -0.4);
  mb.lathe(0, -0.006, 0, [[0, 0], [0.013, 0], [0.013, 0.026], [0, 0.026]], 12, () => Ch);
  mb.rbox(0, 0.012, -0.003, 0.122, 0.018, 0.003, 0.0012, Ch, 1);
  mb.rbox(0.114, -0.0035, -0.0022, 0.122, 0.018, 0.0022, 0.001, Dk, 1);
}
// makinenin kâğıt şeridi (dokulu; üstte, rulodan sola doğru akar)
function paperModel(tb) {
  const x0 = -0.16, x1 = 0.165, z0 = -0.07, z1 = 0.07, y = 0.0915;
  tb.tquad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0, 0, 1, 1, [0, 0, 0]);
}
// makinenin ön etiketi (atlasın alt sol hücresi)
function plateModel(tb) {
  const x0 = 0.024, x1 = 0.166, y0 = 0.029, y1 = 0.061, z = 0.1172;
  tb.tquad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], 0, 0.5, 0.5, 0.75, [0, 0, 0]);
}
// not defteri (yazma): kâğıt destesi ve karton arka; yüzü dokulu
function padModel(mb) {
  mb.rbox(-0.085, 0, -0.06, 0.085, 0.006, 0.06, 0.004, C('#6b4a2b', -0.5), 1);
  mb.rbox(-0.08, 0.006, -0.056, 0.08, 0.014, 0.056, 0.002, C('#fbf8ef', -0.25), 1);
}
function padFaceModel(k) {
  return (tb) => {
    const x0 = -0.078, x1 = 0.078, z0 = -0.054, z1 = 0.054, y = 0.0146;
    tb.tquad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0.5 + k * 0.25, 0.5, 0.75 + k * 0.25, 1, [0, 0, 0]);
  };
}
// kurşun kalem (eldeki konum: işaretleyici gibi −y boyunca)
function pencilModel(mb) {
  limb(mb, [0.006, 0.05, 0.034], [0.006, -0.12, 0.034], [0.0075, 0.0075], C('#f2c230', -0.4), 6);
  limb(mb, [0.006, -0.12, 0.034], [0.006, -0.15, 0.034], [0.0075, 0.0015], C('#e9cfa2', -0.3), 6);
  limb(mb, [0.006, 0.05, 0.034], [0.006, 0.068, 0.034], [0.0078, 0.0078], C('#ef8aa0', -0.4), 6);
}
// yazarın üstüne düşen spot ışığı (ışıksız, toplamalı)
function spotModel(mb) {
  const push = (p, c) => mb.d.push(p[0], p[1], p[2], c[0], c[1], c[2], c[3]);
  const N = 24, H = 2.6, R0 = 0.05, R1 = 0.55;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const t0 = [Math.sin(a0) * R0, H, Math.cos(a0) * R0], t1 = [Math.sin(a1) * R0, H, Math.cos(a1) * R0];
    const b0 = [Math.sin(a0) * R1, 0, Math.cos(a0) * R1], b1 = [Math.sin(a1) * R1, 0, Math.cos(a1) * R1];
    const ct = [0, 0, 0, 0], cb = [0.32, 0.3, 0.22, 1];
    push(t0, ct); push(b0, cb); push(b1, cb); push(t0, ct); push(b1, cb); push(t1, ct);
  }
}

/* ============================ dokular ============================ */
// damga/etiket/defter atlası (1024×512): üst sol YALAN, üst sağ DOĞRU, alt sol makine etiketi, alt sağ iki defter yüzü
function drawAtlas(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const stamp = (x0, col, text, icon) => {
    const cx = x0 + W / 4, cy = H / 4;
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = 18;
    const w = W / 2 - 46, h = H / 2 - 46;
    g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 26); g.stroke();
    g.lineWidth = 6;
    g.beginPath(); g.roundRect(-w / 2 + 18, -h / 2 + 18, w - 36, h - 36, 14); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 128; g.font = `900 ${fs}px ${F}`;
    while (fs > 40 && g.measureText(icon + text).width > w - 70) { fs -= 4; g.font = `900 ${fs}px ${F}`; }
    g.fillText(icon + text, 0, 8);
    // eskimiş mürekkep: rastgele delikler
    g.globalCompositeOperation = 'destination-out';
    let seed = x0 + 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { g.globalAlpha = 0.25 + rnd() * 0.5; g.beginPath(); g.arc((rnd() - 0.5) * w, (rnd() - 0.5) * h, 1 + rnd() * 4, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.restore();
  };
  stamp(0, '#e63946', 'YALAN', '');
  stamp(W / 2, '#22a06b', 'DOĞRU', '✓ ');
  // makine etiketi (alt sol: 512×128)
  g.fillStyle = '#1c1633'; g.fillRect(0, H / 2, W / 2, H / 4);
  g.fillStyle = '#e8eef0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 72; g.font = `900 ${fs}px ${F}`;
  while (fs > 30 && g.measureText('YALAN MAKİNESİ').width > W / 2 - 40) { fs -= 2; g.font = `900 ${fs}px ${F}`; }
  g.fillText('YALAN MAKİNESİ', W / 4, H / 2 + H / 8 + 4);
  // defter yüzleri (alt sağ: iki hücre 256×256): çizgili kâğıt + karalama, ikincisinde ✓ damgası
  for (let k = 0; k < 2; k++) {
    const x0 = W / 2 + k * (W / 4), y0 = H / 2, w = W / 4, h = H / 2;
    g.fillStyle = '#fbf8ef'; g.fillRect(x0, y0, w, h);
    g.strokeStyle = 'rgba(70,120,200,.35)'; g.lineWidth = 3;
    for (let y = y0 + 40; y < y0 + h - 10; y += 30) { g.beginPath(); g.moveTo(x0 + 8, y); g.lineTo(x0 + w - 8, y); g.stroke(); }
    g.strokeStyle = 'rgba(230,57,70,.45)'; g.beginPath(); g.moveTo(x0 + 40, y0 + 6); g.lineTo(x0 + 40, y0 + h - 6); g.stroke();
    g.strokeStyle = '#2b2b3a'; g.lineWidth = 4; g.lineCap = 'round';
    let seed = 31 + k;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let r = 0; r < 3; r++) {
      const y = y0 + 64 + r * 60;
      g.beginPath(); g.moveTo(x0 + 52, y);
      for (let x = x0 + 52; x < x0 + w - 24 - rnd() * 60; x += 8) g.lineTo(x, y - 6 + rnd() * 10);
      g.stroke();
    }
    if (k === 1) {
      g.strokeStyle = '#22a06b'; g.lineWidth = 16;
      g.beginPath(); g.moveTo(x0 + 70, y0 + 140); g.lineTo(x0 + 115, y0 + 190); g.lineTo(x0 + 200, y0 + 80); g.stroke();
    }
  }
}
// kart yüzü (512×368): renkli numara rozeti ve cümle; yazar kendi ekranında yalanı köşedeki kırmızı şeritte görür
function drawCard(cv, k, text, mineLie) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.fillStyle = '#fbf3e0'; g.fillRect(0, 0, W, H);
  g.strokeStyle = NUMC[k]; g.lineWidth = 12; g.strokeRect(12, 12, W - 24, H - 24);
  // numara rozeti (büyük; uzaktan da okunur)
  g.fillStyle = NUMC[k];
  g.beginPath(); g.arc(82, 82, 58, 0, TAU); g.fill();
  g.lineWidth = 7; g.strokeStyle = '#1c1633'; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 74px ${F}`;
  g.fillText(String(k + 1), 82, 87);
  // cümle: sığana kadar küçült (en fazla 4 satır), sığmazsa sonu "…"
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const fit = (fs, x0, w) => {
    g.font = `800 ${fs}px ${F}`;
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (g.measureText(t).width <= w || !cur) cur = t; else { lines.push(cur); cur = wd; }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  // ilk satır rozetin yanında başlar: basitlik için metin rozetin altına ve sağına yayılan iki bölgeye bölünmez,
  // rozetin sağında başlık gibi ilk satırlar, altında devamı
  let fs = 60, lines = [];
  for (; fs >= 30; fs -= 2) { lines = fit(fs, 36, W - 72); if (lines.length * fs * 1.14 <= H - 170 && lines.length <= 4) break; }
  if (lines.length * fs * 1.14 > H - 170) { lines = lines.slice(0, Math.max(1, Math.floor((H - 170) / (fs * 1.14)))); lines[lines.length - 1] += '…'; }
  g.fillStyle = '#1c1633'; g.textAlign = 'left'; g.textBaseline = 'top';
  const lh = fs * 1.14, y0 = 156 + Math.max(0, (H - 176 - lines.length * lh) / 2);
  lines.forEach((L, i) => g.fillText(L, 36, y0 + i * lh));
  // yazarın kendi ekranı: yalanın köşesinde kırmızı şerit
  if (mineLie) {
    g.save(); g.translate(W - 96, 74); g.rotate(0.6);
    g.fillStyle = '#e63946'; g.fillRect(-160, -30, 320, 60);
    g.fillStyle = '#fff'; g.font = `900 36px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('YALAN', 0, 2);
    g.restore();
  }
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const cleanT = (t) => String(t ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const keyT = (t) => cleanT(t).toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, '');

/* ============================ oyun ============================ */
class LieGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'idy', cls: 'idy', title: 'İki Doğru Bir Yalan', sub: 'Yalanı bul, masayı kandır', emoji: '🤥', css: STYLE, snd: new IdSnd(), amb: 'diner', ambVol: 0.38, botPx: 300, botPxL: 34, cloth: '#1f4e5a', trim: '#b8f2e6', tea: false, place: false, chairPad: '#e85d75', fog: '#0e1a20', roomStyle: { wall: '#1b2b33', curtain: '#a33b4c' } });
    this.draft = { s: ['', '', ''], lie: -1 };
    this.editing = false;
    this.chipSeen = new Map();   // oy veren → fişin masaya konduğu an (oyun zamanı)
    this.wroteSeen = new Set();
    this.cardKey = '';
    this.needleV = 0; this.needleKick = 0; this.paperT = 0;
    this.mT = M.make(); this.mT2 = M.make(); this.mT3 = M.make();
    this.tint = new Float32Array(3);
    this.el.posS.textContent = '';
    this.bindUi();
    this.bindKb();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.idCard = this.mk(cardModel);
    W.idStand = this.mk(standModel);
    W.idFace = this.mk(faceModel, 'tex');
    W.idStampL = this.mk(stampModel(0), 'tex');
    W.idStampT = this.mk(stampModel(1), 'tex');
    W.idChip = this.mk(chipModel);
    W.idRing = this.mk(ringModel);
    W.idMachine = this.mk(machineModel);
    W.idLamp = this.mk(lampModel);
    W.idNeedle = this.mk(needleModel);
    W.idPaper = this.mk(paperModel, 'tex');
    W.idPlate = this.mk(plateModel, 'tex');
    W.idPad = this.mk(padModel);
    W.idPadF = [this.mk(padFaceModel(0), 'tex'), this.mk(padFaceModel(1), 'tex')];
    W.idPencil = this.mk(pencilModel);
    W.idSpot = this.mk(spotModel, 'un');
    W.trophy = this.mk(trophyModel);
    this.atCv = document.createElement('canvas'); this.atCv.width = 1024; this.atCv.height = 512;
    try { drawAtlas(this.atCv); } catch { /* yok */ }
    this.atTex = makeTexture(this.X, this.atCv);
    this.cardCv = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 356; return c; });
    this.cardTex = this.cardCv.map((c) => makeTexture(this.X, c));
    this.cardKey = '';
    this.papCv = document.createElement('canvas'); this.papCv.width = 256; this.papCv.height = 128;
    this.papG = this.papCv.getContext('2d');
    this.papG.fillStyle = '#f4efe2'; this.papG.fillRect(0, 0, 256, 128);
    this.papTex = makeTexture(this.X, this.papCv);
    try {
      document.fonts?.ready?.then(() => {
        if (this.dead || !this.atTex || !this.X || this.X.gl.isContextLost()) return;
        drawAtlas(this.atCv); updateTexture(this.X, this.atTex, this.atCv); this.cardKey = '';
      });
    } catch { /* yok */ }
  }
  freeTex() {
    const gl = this.X && this.X.gl;
    if (!gl) return;
    [this.atTex, this.papTex, ...(this.cardTex || [])].forEach((t) => { if (t) gl.deleteTexture(t); });
    this.atTex = this.papTex = null; this.cardTex = null;
  }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  // açılışın zaman çizelgesi (sunucu saatine göre, ms)
  voterList() { const v = this.view; return (v.votes || []).map((x, i) => ({ x, i })).filter((o) => o.x >= 0); }
  stampAt() { const v = this.view; return (v.at || 0) + (CHIP_T0 + this.voterList().length * CHIP_GAP + CHIP_FLY + STAMP_DT) * 1000; }
  shown() { const v = this.view; return !!v && v.phase === 'reveal' && this.sNow() >= this.stampAt(); }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'id-start') { this.fx('pop'); this.ctx.send('start', {}); }
      else if (act === 'id-lie') { this.readForm(); const i = +b.dataset.i; this.draft.lie = this.draft.lie === i ? -1 : i; this.fx('lie'); this.markLie(); }
      else if (act === 'id-idea') { this.idea(); }
      else if (act === 'id-edit') { this.fx('pop'); this.editing = true; const m = v && v.mine; if (m) this.draft = { s: m.s.slice(), lie: m.lie }; this.bar(); }
      else if (act === 'id-go') { this.fx('pop'); this.ctx.send('go', {}); }
      else if (act === 'id-vote') {
        if (!v || v.phase !== 'vote' || !v.amIn) return;
        const i = +b.dataset.i;
        if (v.myVote === i) return;
        this.fx(v.myVote >= 0 ? 'paper' : 'chip', i / 2); vibrate(15);
        this.ctx.send('vote', { idx: i });
      }
      else if (act === 'id-reveal') { this.fx('pop'); this.ctx.send('reveal', {}); }
      else if (act === 'id-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
    this.el.bar.addEventListener('submit', (e) => {
      const f = e.target.closest('form[data-form=id-w]');
      if (!f) return;
      e.preventDefault();
      this.submit();
    });
    this.el.bar.addEventListener('input', (e) => { if (e.target.closest('form[data-form=id-w]')) this.readForm(); });
    // Enter: sonraki kutuya geç, sonuncuda gönder
    this.el.bar.addEventListener('keydown', (e) => {
      const inp = e.target.closest('form[data-form=id-w] input');
      if (!inp || e.key !== 'Enter') return;
      e.preventDefault();
      const i = +inp.dataset.i;
      const next = this.el.bar.querySelector(`form[data-form=id-w] input[data-i="${i + 1}"]`);
      if (next) next.focus(); else this.submit();
    });
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
  readForm() {
    const f = this.el.bar.querySelector('form[data-form=id-w]');
    if (!f) return;
    f.querySelectorAll('input[data-i]').forEach((el) => { this.draft.s[+el.dataset.i] = el.value; });
  }
  markLie() {
    const f = this.el.bar.querySelector('form[data-form=id-w]');
    if (!f) return;
    f.querySelectorAll('.id-in').forEach((el) => {
      const on = +el.dataset.i === this.draft.lie;
      el.classList.toggle('lie', on);
      const b = el.querySelector('.lt');
      if (b) b.textContent = on ? '🤥 Yalan' : 'Yalan?';
    });
    const err = this.el.bar.querySelector('.id-err');
    if (err && this.draft.lie >= 0 && /yalan/i.test(err.textContent)) err.textContent = '';
  }
  idea() {
    this.readForm();
    const used = new Set(this.draft.s.map(keyT));
    const free = IDEAS.filter((x) => !used.has(keyT(x)));
    const i = this.draft.s.findIndex((x) => !cleanT(x));
    if (i < 0 || !free.length) { this.fx('pop'); return; }
    this.draft.s[i] = free[Math.floor(Math.random() * free.length)];
    const el = this.el.bar.querySelector(`form[data-form=id-w] input[data-i="${i}"]`);
    if (el) el.value = this.draft.s[i];
    this.fx('idea');
  }
  formErr(text) {
    const err = this.el.bar.querySelector('.id-err');
    if (err) err.textContent = text;
    const f = this.el.bar.querySelector('form[data-form=id-w]');
    if (f) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
    this.fx('beep'); vibrate([20, 30, 20]);
  }
  submit() {
    const v = this.view;
    if (!v || v.phase !== 'write' || v.me < 0) return;
    this.readForm();
    const s = this.draft.s.map(cleanT);
    if (s.some((x) => [...x].length < 3)) { this.formErr('Üç cümleyi de yaz (en az 3 harf).'); return; }
    if (new Set(s.map(keyT)).size < 3) { this.formErr('Üç cümle birbirinden farklı olmalı.'); return; }
    if (!(this.draft.lie >= 0)) { this.formErr('Hangisi yalan? 🤥 ile işaretle.'); return; }
    this.fx('send'); vibrate(20);
    this.editing = false;
    this.sentAt = this.time;
    try { document.activeElement?.blur?.(); } catch { /* yok */ }
    this.ctx.send('submit', { s, lie: this.draft.lie });
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.idy !== '1') { root.dataset.idy = '1'; root.innerHTML = '<p class="py-16 text-center">🤥</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.turn || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'write') {
      // başkası yazdı: kâğıt sesi; herkes yazdı: çan
      (v.seats || []).forEach((p, i) => {
        if (!(v.wrote || [])[i] || this.wroteSeen.has(p.id)) return;
        this.wroteSeen.add(p.id);
        if (prev && prev.phase === 'write' && i !== v.me) this.fx('wrote');
      });
      if (v.allIn && !(prev && prev.allIn)) this.fx('allin');
      if (v.submitted && this.editing && prev && !prev.submitted) this.editing = false;
    }
    if (v.phase === 'vote') {
      (v.seats || []).forEach((p, i) => {
        if (!(v.voted || [])[i] || this.chipSeen.has(p.id)) return;
        this.chipSeen.set(p.id, this.time);
        this.needleKick = Math.min(1.4, this.needleKick + 0.7);
        if (prev && prev.phase === 'vote' && i !== v.me) this.fx('chip', (i % 3) / 2);
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'write') {
      mus('idle');
      if (this.gameK !== v.game) {
        this.gameK = v.game;
        this.wroteSeen = new Set((v.seats || []).filter((p, i) => (v.wrote || [])[i]).map((p) => p.id));
        this.editing = false;
        if (!v.submitted) this.draft = { s: ['', '', ''], lie: -1 };
      }
      if (fresh) { this.msg('✍️ YAZMA ZAMANI', 'mid'); this.fx('go'); }
    }
    if (v.phase === 'vote') {
      mus('race');
      this.chipSeen = new Map((v.seats || []).filter((p, i) => (v.voted || [])[i]).map((p) => [p.id, -9]));
      this.cardsT = this.time - (fresh ? 0 : 9);
      this.stampFx = false;
      this.cardKey = '';
      if (fresh) {
        this.fx('card');
        if (v.isAuthor) { this.msg('🎤 SIRA SENDE', 'mid'); vibrate([20, 40, 20]); }
        else this.msg(`🕵️ ${esc(nm0(v.authorName))}`, 'mid');
      }
    }
    if (v.phase === 'reveal') {
      mus('mute');
      this.cardKey = '';
      const now = this.sNow();
      this.stampFx = now >= this.stampAt() + 400;
      this.chipFx = this.voterList().filter((o, k) => now >= (v.at || 0) + (CHIP_T0 + k * CHIP_GAP + CHIP_FLY) * 1000).length;
      if (fresh) {
        const d = Math.max(0.8, (this.stampAt() - (v.at || 0)) / 1000 - 0.25);
        const pk = this.phKey;
        setTimeout(() => { if (!this.dead && this.phKey === pk) this.fx('drumroll', d); }, 250);
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
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 50, [[1, 0.85, 0.3], [0.72, 0.95, 0.9], [0.9, 0.36, 0.46], [1, 1, 1]], 2.6, 0.04, false, 2.2, 2.2); });
      }
    }
  }
  // damga anı: sesler, mesaj, parıltı
  onStamp() {
    const v = this.view;
    const k = v.lieIdx;
    this.fx('stamp');
    this.needleKick = 2.2;
    const cx = (k - 1) * CARD_GAP;
    if (this.X) this.burst(cx, CARD_Y + CH * 0.5 * Math.cos(CARD_TILT) + 0.05, CARD_Z - CH * 0.5 * Math.sin(CARD_TILT) + 0.08, 26, [[1, 0.3, 0.25], [1, 0.8, 0.3], [1, 1, 1]], 1.6, 0.03, false, 1.4, 2.5);
    const pk = this.phKey;
    setTimeout(() => {
      if (this.dead || this.phKey !== pk) return;
      const me = v.me;
      if (v.isAuthor) { if (v.fooled > 0) { this.fx('liar'); this.msg(`😏 ${v.fooled} KİŞİ KANDI!`, 'big'); } else { this.fx('caught'); this.msg('🙈 YAKALANDIN', 'mid'); } }
      else if (me >= 0 && v.myVote >= 0) { if (v.myVote === v.lieIdx) { this.fx('found'); this.msg('🕵️ BULDUN! +100', 'big'); vibrate([25, 30, 25]); } else { this.fx('fooled'); this.msg('😵 KANDIN!', 'mid'); } }
      else this.msg(`🤥 YALAN: ${k + 1}`, 'mid');
      try { this.snd.music('idle'); } catch { /* yok */ }
    }, 380);
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const cards = [0, CARD_Y + CH * 0.4, CARD_Z - 0.2];
    const au = v.author >= 0 ? this.avatarAt(v.author) : null;
    const shown = this.shown();
    const su = shown ? (now - this.stampAt()) / 1000 : 0;
    const champA = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.idI || (a.idI = { lt: 0, look: null });
      const idleLook = (pC = 0.2) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > pC ? P[Math.floor(Math.random() * P.length)] : cards;
        }
        return idle.look;
      };
      if (v.phase === 'write') {
        if (!(v.wrote || [])[i]) {
          // not defterine yazıyor: sağ el defterde gezinir
          a.pose('rest', { t, k: 12 });
          const w = t * 6 + i * 1.7;
          a.tgt.hand[1] = [0.13 + Math.sin(w) * 0.05, TABLE_Y + 0.05 + Math.abs(Math.sin(w * 2.1)) * 0.012, 0.7 + Math.sin(w * 0.47) * 0.03];
          a.tgt.palm[1] = [-0.3, -1, 0]; a.tgt.fdir[1] = [0, -0.5, 1];
          a.shape[1] = 'pinch';
          a.expr = Math.floor(t / 2.5 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = this.seatW(a, 0.12, TABLE_Y, 0.74);
        } else {
          a.pose(hs(i, v.game) < 0.5 ? 'clasp' : 'rest', { t });
          a.expr = 'grin';
          a.look = idleLook(0.5);
        }
        return;
      }
      if (v.phase === 'vote') {
        if (i === v.author) {
          // sıcak koltuk: poker yüzü, ellerini kenetler, arada masaya göz atar
          a.pose(Math.floor(t / 3.2) % 3 === 2 ? 'bite' : 'clasp', { t });
          a.expr = ['smile', 'tense', 'grin', 'smile'][Math.floor(t / 1.7) % 4];
          a.look = idleLook(0.15);
          return;
        }
        const did = !!(v.voted || [])[i];
        const ct = this.chipSeen.get(p.id);
        if (did && ct != null && t - ct < 0.45) {
          // fişi önüne koyuyor
          a.pose('rest', { t, k: 14 });
          a.tgt.hand[1] = [0.05, TABLE_Y + 0.06, 0.62];
          a.tgt.palm[1] = [0, -1, 0.2]; a.tgt.fdir[1] = [0, -0.2, 1];
          a.shape[1] = 'open';
          a.expr = 'grin';
          a.look = this.seatW(a, 0.05, TABLE_Y, 0.62);
          return;
        }
        if (!did) {
          a.pose(Math.floor(t / 4 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = Math.floor(t / 3 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = Math.floor(t / 2.2 + i) % 3 === 0 && au && au !== a ? au.headW : cards;
        } else {
          a.pose('rest', { t });
          a.expr = 'grin';
          a.look = au && au !== a && Math.floor(t / 3 + i) % 2 ? au.headW : idleLook(0.4);
        }
        return;
      }
      if (v.phase === 'reveal') {
        if (!shown) {
          a.pose(hs(i, v.turn + 3) < 0.5 ? 'bite' : 'clasp', { t });
          a.expr = i === v.author ? 'grin' : 'tense';
          a.look = cards;
          return;
        }
        if (i === v.author) {
          const ok = v.fooled > 0 && v.fooled * 2 >= this.voterList().length;
          if (ok) { a.pose(su < 2 ? 'cheer' : Math.floor(su / 1.5) % 2 ? 'wave' : 'rest', { t }); a.expr = 'laugh'; }
          else if (v.fooled > 0) { a.pose(su < 1.6 ? 'shrug' : 'rest', { t }); a.expr = 'grin'; }
          else { a.pose(su < 2 ? 'facepalm' : 'slump', { t }); a.expr = 'wince'; }
          a.look = idleLook(0.3);
          return;
        }
        const vote = (v.votes || [])[i];
        if (vote == null || vote < 0) { a.pose('shrug', { t }); a.expr = 'smile'; a.look = au ? au.headW : cards; return; }
        if (vote === v.lieIdx) { a.pose(su < 1.8 ? 'cheer' : Math.floor(su / 1.4 + i) % 2 ? 'clap' : 'rest', { t }); a.expr = 'laugh'; a.look = au && au !== a ? au.headW : cards; }
        else { a.pose(su < 1.8 ? (hs(i, 9) < 0.5 ? 'facepalm' : 'headgrab') : 'rest', { t }); a.expr = su < 1.8 ? 'wince' : 'sad'; a.look = au && au !== a ? au.headW : cards; }
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

  /* ---------- kamera, iğne, sesler ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time, now = this.sNow();
    // açılış: fişler kartlara konunca tıkırtı, sonra damga
    if (v.phase === 'reveal') {
      const L = this.voterList();
      const n = L.filter((o, k) => now >= (v.at || 0) + (CHIP_T0 + k * CHIP_GAP + CHIP_FLY) * 1000).length;
      if (n > (this.chipFx || 0)) { this.chipFx = n; this.fx('chip', ((L[n - 1]?.x) ?? 0) / 2); }
      if (!this.stampFx && now >= this.stampAt()) { this.stampFx = true; this.onStamp(); }
    }
    // yalan makinesinin iğnesi: gerilim arttıkça titrer, oy geldikçe sıçrar
    let amp = 0.18;
    if (v.phase === 'vote') {
      const left = (v.endsAt || 0) - now;
      amp = 0.3 + 0.45 * ((v.answered || 0) / Math.max(1, v.voters || 1)) + (left < 1e4 ? 0.35 : 0);
    } else if (v.phase === 'reveal') amp = this.shown() ? 0.25 + Math.max(0, 1 - (now - this.stampAt()) / 2500) * 1.2 : 0.75;
    this.needleKick = Math.max(0, this.needleKick - dt * 1.6);
    const target = (Math.sin(t * 9.3) * 0.5 + Math.sin(t * 23.7 + 1) * 0.3 + Math.sin(t * 4.1 + 2) * 0.2) * (amp + this.needleKick) + (Math.random() - 0.5) * 0.12 * (amp + this.needleKick);
    this.needleV = damp(this.needleV, clamp(target, -1, 1), 22, dt);
    this.paperT += dt;
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.25, -0.05], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'vote' || v.phase === 'reveal') {
      zoom = land ? 0.95 : 0.6; pa = 0.06; bp = Math.max(170, this.barH || 300); sy = land ? 0.5 : 0.45; sx = land ? 0.23 : 0.5;
      H = [0, TABLE_Y + 0.2, -0.08];
    } else if (v.phase === 'write') { zoom = land ? 0.95 : 0.9; pa = 0.05; bp = Math.max(170, this.barH || 300); sy = land ? 0.5 : 0.4; sx = land ? 0.25 : 0.5; }
    else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (Math.abs(bp - this.cfg.botPx) > 12) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    // son saniyeler: henüz oy vermediysem / yazmadıysam tıkırtı
    const left = (v.endsAt || 0) - now;
    const late = (v.phase === 'vote' && v.amIn && v.myVote < 0) || (v.phase === 'write' && v.me >= 0 && !v.submitted && !v.allIn);
    if (late && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.6); } }
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
  cardsOn() { const v = this.view; return !!v && (v.phase === 'vote' || v.phase === 'reveal') && Array.isArray(v.items); }
  // k. kartın matrisi (yükselerek dizilir)
  cardMat(m, k) {
    const u = easeOut((this.time - (this.cardsT ?? -9) - k * 0.11) / 0.5);
    const x = (k - 1) * CARD_GAP;
    M.set(m, x, CARD_Y - (1 - u) * 0.3, CARD_Z, (1 - u) * 0.6 * (k - 1), -CARD_TILT, 0, Math.max(0.001, u));
    return m;
  }
  // k. kartın önündeki fiş yığınında j. fişin yeri
  trayAt(k, j) {
    const x = (k - 1) * CARD_GAP + ((j % 3) - 1) * 0.155;
    return [x, TABLE_Y + 0.004 + Math.floor(j / 3) * (CHIP_H + 0.002), CARD_Z + 0.17 + (Math.floor(j / 3) % 2) * 0.016];
  }
  chipSpot(a) { return this.seatW(a, 0.04, TABLE_Y + 0.004, 0.66); }
  drawChip(D, m, p, col, lift = 0, spin = 0) {
    M.set(m, p[0], p[1] + lift, p[2], spin, 0, 0);
    D(this.W.idChip, m, col);
    D(this.W.idRing, m, ONE3);
  }
  colOf(i) { const p = this.seats[i]; const c = rgb3(pcol(p ? p.c : 0)); this.tint[0] = c[0]; this.tint[1] = c[1]; this.tint[2] = c[2]; return this.tint; }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.idCard || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T, t = this.time, now = this.sNow();
    // yalan makinesi (her zaman masada)
    const mm = this.machMat();
    D(Wd.idMachine, mm, T.obj);
    M.set(this.mT, -0.19, 0.095, 0, this.needleV * 0.45);
    D(Wd.idNeedle, M.mul(mc, mm, this.mT), T.obj);
    const lamp = this.alarmK();
    M.set(this.mT, -0.17, 0.112, -0.07);
    D(Wd.idLamp, M.mul(mc, mm, this.mT), lamp > 0.05 ? ONE3 : this.lampOff || (this.lampOff = new Float32Array([0.45, 0.35, 0.35])));
    // yazma: herkesin önünde not defteri; yazanın elinde kalem
    if (v.phase === 'write') {
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        const q = this.seatW(a, 0.12, TABLE_Y + 0.003, 0.74);
        M.set(m, q[0], q[1], q[2], a.yaw + 0.12, 0, 0, 2.1);
        D(Wd.idPad, m, T.obj);
        if (!(v.wrote || [])[i] && a.M && a.M.hd) D(Wd.idPencil, a.M.hd[1], T.obj);
      });
    }
    if (this.cardsOn()) {
      // kartlar ve standları
      for (let k = 0; k < 3; k++) {
        const x = (k - 1) * CARD_GAP;
        M.set(m, x, TABLE_Y + 0.002, CARD_Z);
        D(Wd.idStand, m, T.obj);
        D(Wd.idCard, this.cardMat(mc, k), T.obj);
      }
      // oylama: oy verenlerin fişleri önlerinde (ters, hangi kart olduğu görünmez)
      if (v.phase === 'vote') {
        this.seats.forEach((p, i) => {
          if (!(v.voted || [])[i] || i === v.author) return;
          const a = this.av.get(p.id);
          if (!a) return;
          const ct = this.chipSeen.get(p.id) ?? -9;
          const u = clamp((t - ct - 0.25) / 0.3, 0, 1);
          this.drawChip(D, m, this.chipSpot(a), this.colOf(i), (1 - easeOut(u)) * 0.16, a.yaw);
        });
      }
      // açılış: fişler seçilen kartın önüne uçar
      if (v.phase === 'reveal') {
        const L = this.voterList();
        const stack = [0, 0, 0];
        L.forEach((o, k) => {
          const a = this.avatarAt(o.i);
          if (!a) return;
          const j = stack[o.x]++;
          const p0 = this.chipSpot(a), p1 = this.trayAt(o.x, j);
          const u = clamp((now - (v.at || 0) - (CHIP_T0 + k * CHIP_GAP) * 1000) / (CHIP_FLY * 1000), 0, 1);
          const e = easeOut(u);
          const p = [lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e) + Math.sin(u * Math.PI) * 0.32, lerp(p0[2], p1[2], e)];
          this.drawChip(D, m, p, this.colOf(o.i), 0, lerp(a.yaw, 0, e) + u * TAU);
        });
      }
    }
    // final: şampiyonun önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, 0, TABLE_Y + 0.004, 0.62);
        const u = clamp((t - (this.finT || 0) - 0.8) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.35 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  machMat() { const m = this.mMach || (this.mMach = M.make()); M.set(m, MX, TABLE_Y + 0.002, MZ, 0, 0, 0, MS); return m; }
  lampW() { return [MX - 0.17 * MS, TABLE_Y + 0.002 + 0.115 * MS, MZ - 0.07 * MS]; }
  // makinenin lambası: son saniyelerde yanıp söner, damgada parlar
  alarmK() {
    const v = this.view, now = this.sNow(), t = this.time;
    if (!v) return 0;
    if (v.phase === 'reveal') { if (this.shown()) return Math.max(0, 1 - (now - this.stampAt()) / 3000) * (0.6 + 0.4 * Math.sin(t * 18)); return 0.25 + 0.25 * Math.sin(t * 10); }
    if (v.phase === 'vote') { const left = (v.endsAt || 0) - now; if (left < 1e4 && left > 0) return Math.sin(t * 8) > 0 ? 0.8 : 0; return (v.answered || 0) > 0 && Math.sin(t * 3) > 0.6 ? 0.3 : 0; }
    return 0;
  }
  drawShadowsExtra(m) {
    if (!this.res || !this.res.shadow) return;
    M.set(m, MX, TABLE_Y + 0.008, MZ, 0, 0, 0, 0.5 * MS, 1, 0.3 * MS);
    drawMesh(this.X, this.res.shadow, m, ONE3, 0.45);
    if (this.cardsOn()) for (let k = 0; k < 3; k++) { M.set(m, (k - 1) * CARD_GAP, TABLE_Y + 0.008, CARD_Z - 0.18, 0, 0, 0, 0.75, 1, 0.42); drawMesh(this.X, this.res.shadow, m, ONE3, 0.4); }
  }
  // kart dokuları: cümleler ya da yazarın kendi yalan işareti değişince yeniden çizilir
  syncCards() {
    const v = this.view;
    if (!this.cardTex || !this.cardsOn()) return;
    const mine = v.isAuthor && v.phase === 'vote' ? v.lieIdx : -1;
    const key = `${v.game}|${v.turn}|${mine}|${v.items.join('|')}`;
    if (key === this.cardKey) return;
    this.cardKey = key;
    for (let k = 0; k < 3; k++) { try { drawCard(this.cardCv[k], k, v.items[k], mine === k); updateTexture(this.X, this.cardTex[k], this.cardCv[k]); } catch { /* yok */ } }
  }
  // makinenin kâğıdı: kâğıt iğnenin altından sağdaki toplama rulosuna akar; iz iğnenin ucundan başlar
  syncPaper() {
    if (!this.papTex) return;
    const g = this.papG;
    if (this.time - (this.papAt || 0) < 0.05) return;
    this.papAt = this.time;
    const W = 256, H = 128, sh = 3;
    // kâğıt şeridi: x0..x1 = -0.16..0.165, z0..z1 = -0.07..0.07 (makinenin yerel ölçüsü)
    const th = this.needleV * 0.45;
    const tx = ((-0.19 + 0.118 * Math.cos(th)) + 0.16) / 0.325 * W;
    const ty = ((-0.118 * Math.sin(th)) + 0.07) / 0.14 * H;
    g.drawImage(this.papCv, 0, 0, W - sh, H, sh, 0, W - sh, H);
    g.fillStyle = '#f4efe2'; g.fillRect(0, 0, sh, H);
    g.fillStyle = 'rgba(42,157,143,.45)';
    for (let y = 16; y < H; y += 24) g.fillRect(0, y, sh, 2);
    if (Math.floor(this.paperT * 6) % 4 === 0) { g.fillStyle = 'rgba(230,57,70,.35)'; g.fillRect(0, 0, 2, H); }
    const y0 = this.papY ?? ty, x0 = (this.papX ?? tx) + sh;
    g.strokeStyle = '#1c1633'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(tx, ty); g.stroke();
    this.papY = ty; this.papX = tx;
    updateTexture(this.X, this.papTex, this.papCv);
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.idFace || !v || !this.atTex) return;
    const m = this.mats.b, mc = this.mats.c, now = this.sNow(), t = this.time;
    gl.uniform1f(X.tex.u.uSelf, 0.35);
    // makine: kâğıt ve etiket
    this.syncPaper();
    gl.bindTexture(gl.TEXTURE_2D, this.papTex);
    const mm = this.machMat();
    drawMesh(X, Wd.idPaper, mm, ONE3);
    gl.bindTexture(gl.TEXTURE_2D, this.atTex);
    drawMesh(X, Wd.idPlate, mm, ONE3);
    // defter yüzleri
    if (v.phase === 'write') {
      this.seats.forEach((p, i) => {
        const a = this.av.get(p.id);
        if (!a) return;
        const q = this.seatW(a, 0.12, TABLE_Y + 0.003, 0.74);
        M.set(m, q[0], q[1], q[2], a.yaw + 0.12, 0, 0, 2.1);
        drawMesh(X, Wd.idPadF[(v.wrote || [])[i] ? 1 : 0], m, ONE3);
      });
    }
    if (this.cardsOn()) {
      this.syncCards();
      gl.uniform1f(X.tex.u.uSelf, 0.55);
      for (let k = 0; k < 3; k++) {
        if (!this.cardTex[k]) continue;
        gl.bindTexture(gl.TEXTURE_2D, this.cardTex[k]);
        drawMesh(X, Wd.idFace, this.cardMat(mc, k), ONE3);
      }
      // damgalar: yalan kartına YALAN iner, diğerlerine DOĞRU
      if (v.phase === 'reveal' && v.lieIdx >= 0) {
        gl.bindTexture(gl.TEXTURE_2D, this.atTex);
        gl.uniform1f(X.tex.u.uSelf, 0.8);
        for (let k = 0; k < 3; k++) {
          const lie = k === v.lieIdx;
          const at = this.stampAt() + (lie ? 0 : 350 + (k > v.lieIdx ? 1 : 0) * 120);
          const u = clamp((now - at + 160) / 160, 0, 1);
          if (u <= 0) continue;
          const s = lerp(1.9, lie ? 1.05 : 0.72, easeOut(u));
          this.cardMat(mc, k);
          M.set(this.mT, lie ? 0.02 : 0.1, CH * (lie ? 0.42 : 0.26), CT / 2 + 0.004 + (1 - u) * 0.05, 0, 0, lie ? -0.16 : 0.1, s, s, 1);
          M.mul(this.mT2, mc, this.mT);
          drawMesh(X, lie ? Wd.idStampL : Wd.idStampT, this.mT2, ONE3, u);
        }
      }
    }
    gl.uniform1f(X.tex.u.uSelf, 0);
    void t;
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const X = this.X, v = this.view, Wd = this.W;
    if (!v || !Wd || !Wd.idSpot || !this.res) return;
    const t = this.time, now = this.sNow();
    // yazarın üstüne spot ışığı
    if ((v.phase === 'vote' || v.phase === 'reveal') && v.author >= 0) {
      const a = this.avatarAt(v.author);
      if (a) {
        const k = clamp((t - (this.cardsT ?? -9)) / 0.6, 0, 1);
        M.set(m, a.pos[0], 0, a.pos[2]);
        drawMesh(X, Wd.idSpot, m, ONE3, k * (0.8 + 0.12 * Math.sin(t * 2.3)));
      }
    }
    // oylamada kendi seçtiğim kartın arkasında hafif altın ışık (yalnızca benim ekranımda)
    if (v.phase === 'vote' && v.amIn && v.myVote >= 0 && this.cardsOn()) {
      const k = v.myVote;
      this.glow(m, [(k - 1) * CARD_GAP, CARD_Y + CH * 0.5 * Math.cos(CARD_TILT), CARD_Z - CH * 0.5 * Math.sin(CARD_TILT) - 0.02], 1.15, GOLD3, 0.16 + 0.04 * Math.sin(t * 3));
    }
    // makinenin lambası
    const lk = this.alarmK();
    if (lk > 0.02) this.glow(m, this.lampW(), 0.42, RED3, 0.5 * lk);
    // damgadan sonra: yalan kartında kırmızı, bulanların fişlerinde yeşil parıltı
    if (v.phase === 'reveal' && this.shown()) {
      const u = (now - this.stampAt()) / 1000;
      const k = v.lieIdx;
      if (k >= 0) this.glow(m, [(k - 1) * CARD_GAP, CARD_Y + CH * 0.5 * Math.cos(CARD_TILT), CARD_Z - CH * 0.5 * Math.sin(CARD_TILT) + 0.05], 1.25, RED3, 0.32 * Math.max(0, 1 - u / 3));
      const L = this.voterList(), stack = [0, 0, 0];
      L.forEach((o) => {
        const j = stack[o.x]++;
        if (o.x !== k) return;
        const p = this.trayAt(o.x, j);
        this.glow(m, [p[0], p[1] + 0.03, p[2]], 0.16, GREEN3, 0.4 * (0.7 + 0.3 * Math.sin(t * 5 + j)));
      });
    }
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="id-tm"><i></i></div>'; }
  writeForm(v) {
    const d = this.draft;
    const ph = ['Örn. Hiç uçağa binmedim', 'Örn. Üç kardeşim var', 'Örn. Bir kez yarışma kazandım'];
    const rows = [0, 1, 2].map((i) => `<div class="id-in${d.lie === i ? ' lie' : ''}" data-i="${i}" style="--nc:${NUMC[i]}"><span class="nb">${i + 1}</span><input data-i="${i}" maxlength="80" placeholder="${ph[i]}" value="${esc(d.s[i] || '')}" enterkeyhint="${i < 2 ? 'next' : 'send'}" autocomplete="off" autocapitalize="sentences" spellcheck="false"><button type="button" class="lt" data-act="id-lie" data-i="${i}">${d.lie === i ? '🤥 Yalan' : 'Yalan?'}</button></div>`).join('');
    return `<div class="id-box"><div class="id-hd"><b>✍️ Kendin hakkında 3 cümle</b><span class="tm"></span></div>
      <div class="id-s" style="margin-top:1px">2'si doğru, 1'i yalan olsun. Yalanı işaretle.</div>
      <form class="id-f" data-form="id-w" autocomplete="off">${rows}<div class="id-err"></div>
        <div class="id-row" style="margin-top:2px"><button type="button" class="id-b ghost" data-act="id-idea">🎲 Fikir ver</button><button type="submit" class="id-b">${v.submitted ? 'Güncelle ✓' : 'Gönder ✓'}</button></div></form>
      <div class="id-ft"><span class="n wc"></span><span class="z gz"></span></div>${this.timerBar()}</div>`;
  }
  opt(v, i, extra = '', cls = '') {
    return `<button class="id-o${cls}" data-act="id-vote" data-i="${i}" style="--nc:${NUMC[i]}" ${extra}><span class="nb">${i + 1}</span><span>${esc(v.items[i] || '')}</span>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost;
    const now = this.sNow();
    if (v.phase === 'write') {
      if (v.me < 0) {
        key = `write|watch|${v.game}`;
        html = `<div class="id-box dark"><div class="id-h">👀 Herkes cümlelerini yazıyor</div><div class="id-s">Sıradaki oyunda sen de yazarsın; şimdilik oylamaya katılabilirsin.</div><div class="id-ft"><span class="n wc"></span></div>${this.timerBar()}</div>`;
      } else if (!v.submitted || this.editing) {
        key = `write|form|${v.game}|${v.submitted ? 1 : 0}`;
      } else {
        const m = v.mine || { s: [], lie: -1 };
        key = `write|sent|${v.game}|${m.s.join('|')}|${m.lie}|${v.allIn}`;
        const list = m.s.map((x, i) => `<div class="${i === m.lie ? 'lie' : ''}" style="--nc:${NUMC[i]}"><span class="nb">${i + 1}</span><span>${esc(x)}</span>${i === m.lie ? '<b>🤥</b>' : ''}</div>`).join('');
        html = `<div class="id-box"><div class="id-h">${v.allIn ? '🎬 Herkes yazdı, başlıyoruz!' : '✅ Cümlelerin hazır'}</div><div class="id-s">${v.allIn ? 'Kartlar masaya diziliyor…' : 'Herkes yazınca oyun başlar. Yalanını kimseye söyleme 🤫'}</div>
          <div class="id-mine">${list}</div>
          ${v.allIn ? '' : `<div class="id-row"><button class="id-b ghost" data-act="id-edit">✏️ Düzelt</button><span class="gob"></span></div>`}
          <div class="id-ft"><span class="n wc"></span></div>${this.timerBar()}</div>`;
      }
      if (key.startsWith('write|form')) {
        const was = !!this.el.bar.querySelector('form[data-form=id-w]');
        if (was && this.barKey === key) { this.writeUi(v); return; }
        // yeniden çizmeden önce yazılanı sakla
        if (was) this.readForm();
        html = this.writeForm(v);
      }
    } else if (v.phase === 'vote') {
      const tag = `🕵️ ${v.turn}/${v.turns} · ${esc(nm0(v.authorName))}`;
      if (v.isAuthor) {
        key = `vote|au|${v.game}|${v.turn}|${v.answered}|${v.voters}|${v.closing}`;
        const opts = v.items.map((x, i) => `<div class="id-o${i === v.lieIdx ? ' lie' : ''}" style="--nc:${NUMC[i]}"><span class="nb">${i + 1}</span><span>${esc(x)}</span>${i === v.lieIdx ? '<em>🤥 YALAN</em>' : ''}</div>`).join('');
        html = `<div class="id-box dark"><div class="id-q"><small>🎤 SIRA SENDE · ${v.turn}/${v.turns}</small><b>Masa yalanını arıyor… poker yüzünü tak 😐</b></div><div class="id-opts">${opts}</div>
          <div class="id-ft"><span class="n">🗳️ ${v.answered}/${v.voters} oy</span><span class="z">${v.closing ? 'Oylama kapanıyor…' : 'Kimse kimin neyi seçtiğini görmüyor'}</span></div>${this.timerBar()}</div>`;
      } else if (!v.amIn) {
        key = `vote|watch|${v.game}|${v.turn}|${v.answered}|${v.voters}`;
        const opts = v.items.map((x, i) => `<div class="id-o" style="--nc:${NUMC[i]}"><span class="nb">${i + 1}</span><span>${esc(x)}</span></div>`).join('');
        html = `<div class="id-box dark"><div class="id-q"><small>${tag}</small><b>${esc(nm0(v.authorName))} hakkında hangisi yalan?</b></div><div class="id-opts">${opts}</div><div class="id-ft"><span class="n">🗳️ ${v.answered}/${v.voters} oy</span><span class="z">👀 İzliyorsun</span></div>${this.timerBar()}</div>`;
      } else {
        const mine = v.myVote >= 0;
        key = `vote|in|${v.game}|${v.turn}|${v.myVote}|${v.answered}|${v.voters}|${v.closing}|${host}`;
        const opts = [0, 1, 2].map((i) => `${this.opt(v, i, '', v.myVote === i ? ' on' : '')}${v.myVote === i ? '<em>👉 Seçimin</em>' : ''}</button>`).join('');
        html = `<div class="id-box"><div class="id-q"><small>${tag}</small><b>${esc(nm0(v.authorName))} hakkında hangisi yalan?</b></div><div class="id-opts">${opts}</div>
          <div class="id-ft"><span class="n">🗳️ ${v.answered}/${v.voters} oy</span><span class="z">${mine ? (v.closing ? 'Oylama kapanıyor…' : 'Fişin masada · değiştirebilirsin') : '🤫 Oylar gizli'}</span>${host && v.answered > 0 && !v.closing ? '<button class="id-b ghost" data-act="id-reveal">Beklemeden aç</button>' : ''}</div>
          ${this.timerBar()}</div>`;
      }
    } else if (v.phase === 'reveal') {
      const L = this.voterList();
      if (!this.shown()) {
        const n = L.filter((o, k) => now >= (v.at || 0) + (CHIP_T0 + k * CHIP_GAP + CHIP_FLY) * 1000).length;
        key = `rev|c|${v.game}|${v.turn}|${n}`;
        const cnt = [0, 0, 0];
        L.slice(0, n).forEach((o) => { cnt[o.x]++; });
        const opts = v.items.map((x, i) => `<div class="id-o" style="--nc:${NUMC[i]}"><span class="nb">${i + 1}</span><span>${esc(x)}</span><em>🪙 ${cnt[i]}</em></div>`).join('');
        html = `<div class="id-box dark"><div class="id-q"><small>🥁 FİŞLER KARTLARA</small><b>${esc(nm0(v.authorName))} hangisinde yalan söyledi?</b></div><div class="id-opts">${opts}</div></div>`;
      } else {
        const canNext = host && now - (v.at || 0) >= (v.nextMinMs || 3500);
        const last = v.turn >= v.turns;
        key = `rev|w|${v.game}|${v.turn}|${canNext}`;
        let head;
        if (v.isAuthor) head = v.fooled > 0 ? `😏 ${v.fooled} kişiyi kandırdın! +${v.fooled * 100}` : '🙈 Herkes yalanını buldu!';
        else if (v.me >= 0 && v.myVote >= 0) head = v.myVote === v.lieIdx ? '🕵️ Yalanı buldun! +100' : '😵 Kandırıldın!';
        else if (v.me >= 0) head = '⏰ Oy vermedin';
        else head = `🤥 Yalan: ${v.lieIdx + 1}. kart`;
        const dots = [[], [], []];
        L.forEach((o) => { dots[o.x].push(o.i); });
        const opts = v.items.map((x, i) => {
          const lie = i === v.lieIdx;
          const d = dots[i].map((s) => `<i style="--pc:${pcol(v.seats[s]?.c ?? 0)}" title="${esc(nm0(v.seats[s]?.n || ''))}"></i>`).join('');
          return `<div class="id-o ${lie ? 'lie' : 'tru dim'}" style="--nc:${NUMC[i]}"><span class="nb">${i + 1}</span><span>${esc(x)}</span><span class="dots">${d}</span><em>${lie ? '🤥 YALAN' : '✓ DOĞRU'}</em></div>`;
        }).join('');
        const who = (v.correct || []).map((i) => esc(nm0(v.seats[i]?.n || ''))).join(', ');
        const sub = (v.correct || []).length ? `🕵️ Bulanlar: ${who} (+100)` : '🕵️ Kimse bulamadı!';
        const sub2 = v.isAuthor ? '' : ` · 🤥 ${esc(nm0(v.authorName))}: +${v.fooled * 100}`;
        html = `<div class="id-box"><div class="id-q"><small>🤥 YALAN AÇIKLANDI · ${v.turn}/${v.turns}</small><b>${head}</b></div><div class="id-opts">${opts}</div><div class="id-s">${sub}${sub2}</div>
          ${canNext ? `<div class="id-row"><button class="id-b" data-act="id-next">${last ? 'Sonuçlara geç 🏆' : 'Sıradaki ▶'}</button></div>` : `<div class="id-s">${last ? 'Son yazardı, sonuçlar geliyor…' : 'Sıradaki birazdan…'}</div>`}
          ${this.timerBar()}</div>`;
      }
    }
    if (this.setBar(key, html)) {
      this.barKey = key;
      if (key.startsWith('write|form')) { this.markLie(); this.writeUi(v); }
    }
  }
  // yazma çubuğunun değişen parçaları (çubuğu yeniden çizmeden; yazılanlar kaybolmasın)
  writeUi(v) {
    const b = this.el.bar;
    const wc = b.querySelector('.wc');
    if (wc) wc.textContent = `✍️ ${v.count ?? 0}/${v.total ?? 0} yazdı`;
    const gz = b.querySelector('.gz');
    if (gz) gz.textContent = v.submitted ? 'Gönderdin · istersen düzelt' : '🤫 Yalanını kimse görmez';
    const gob = b.querySelector('.gob');
    if (gob) {
      const want = this.ctx.isHost && v.canGo && !v.allIn && (v.count ?? 0) < (v.total ?? 0);
      const has = !!gob.querySelector('button');
      if (want !== has) gob.innerHTML = want ? '<button class="id-b mint" data-act="id-go">Beklemeden başla</button>' : '';
    }
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${n}`;
      html = `<div class="card id-intro">
        <div class="tt">🤥 İki Doğru Bir Yalan</div>
        <div class="sub">Kendin hakkında 3 cümle yaz: 2'si doğru, 1'i yalan. Masa yalanı bulmaya çalışsın!</div>
        <div class="id-ru"><div style="background:#dff6ef"><b>✍️</b>2 doğru 1 yalan yaz</div><div style="background:#fff4c2"><b>🕵️</b>Yalanı bul: +100</div><div style="background:#ffe1dc"><b>🤥</b>Kandırdığın her kişi +100</div></div>
        <button class="kb" data-act="id-start" ${n < 3 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 3 ? 'En az 3 kişi lazım: masadakileri çağır!' : 'Oylar gizli; herkes oyunu verince fişler kartlara uçar ve yalan damgalanır.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= 2400) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const S = v.stats || [];
      const rows = v.seats.map((p, i) => ({ p, i, s: S[i] || { fooled: 0, found: 0 } })).sort((x, y) => y.p.sc - x.p.sc || y.s.fooled - x.s.fooled)
        .map(({ p, i, s }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><em>🤥 ${s.fooled} · 🕵️ ${s.found}</em><b>${p.sc}</b></div>`).join('');
      const nm = (L) => L.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ');
      const aw = [(v.liar || []).length ? `<span>🤥 Usta yalancı: ${nm(v.liar)}</span>` : '', (v.det || []).length ? `<span>🕵️ Baş dedektif: ${nm(v.det)}</span>` : ''].join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏆 Masanın en iyisi sensin!' : champ.length ? `🏆 Kazanan: ${nm(champ)}` : 'Oyun bitti!'}</div>
        <div class="sub">🤥 kandırdığı kişi · 🕵️ bulduğu yalan</div>
        ${aw ? `<div class="id-aw">${aw}</div>` : ''}
        <div class="id-tb">${rows}</div>
        <div class="row2"><button class="kb" data-act="id-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = mmss((v.endsAt || 0) - now);
    const TOP = {
      write: `✍️ ${v.count ?? 0}/${v.total ?? 0} yazdı · ⏱ ${left}`,
      vote: `${v.turn}/${v.turns} · 🗳️ ${v.answered ?? 0}/${v.voters ?? 0} · ⏱ ${left}`,
      reveal: `${v.turn}/${v.turns} · 🤥 açılış`,
    };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.id-tm i');
    const tot = v.phase === 'vote' ? v.voteMs || 4e4 : v.phase === 'reveal' ? v.revealMs || 9500 : v.phase === 'write' ? (v.allIn ? Math.max(1, (v.endsAt || 0) - (v.at || 0)) : v.writeMs || 15e4) : 0;
    if (tm && tot) tm.style.transform = `scaleX(${clamp(((v.endsAt || 0) - now) / tot, 0, 1).toFixed(3)})`;
    const tmT = this.el.bar.querySelector('.id-hd .tm');
    if (tmT) tmT.textContent = `⏱ ${left}`;
    if (v.phase === 'write') this.writeUi(v);
    // alt çubuğun yüksekliği: masa onun üstüne sığsın
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const shown = this.shown();
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase === 'write' && (v.wrote || [])[i]) x += '<span>✓</span>';
      if (v.phase === 'vote' && i === v.author) x += '<span>🎤</span>';
      if (v.phase === 'vote' && (v.voted || [])[i]) x += '<span>✓</span>';
      if (v.phase === 'reveal' && shown) {
        const g = (v.gain || [])[i] || 0, vt = (v.votes || [])[i];
        if (i === v.author) x += `<span class="id-g${g ? '' : ' r'}">🤥 +${g}</span>`;
        else if (vt != null && vt >= 0) x += `<span class="id-v" style="--nc:${NUMC[vt]}">${vt + 1}</span>${g ? `<span class="id-g">+${g}</span>` : ''}`;
      }
      if (v.phase === 'final') { if ((v.liar || []).includes(i)) x += '<span class="id-m">🤥</span>'; if ((v.det || []).includes(i)) x += '<span class="id-m">🕵️</span>'; }
      if (o.idK !== x) {
        o.idK = x;
        let el = o.lbl.querySelector('.id-x');
        if (!el) { el = document.createElement('span'); el.className = 'id-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('id-au', (v.phase === 'vote' || v.phase === 'reveal') && i === v.author);
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.id-x')) o.idK = '';
  }

  /* ---------- 2D yedek ---------- */
  // masayı alt çubuğun üstündeki boş alana sığdır (yatayda çubuk sağda)
  flat2() {
    const w = this.vw || 360, h = this.vh || 640, land = w > h * 1.1;
    const top = land ? 70 : 96, bot = land ? h - 12 : Math.max(top + 200, h - (this.barH || 300) - 6);
    const aw = land ? w * 0.46 : w;
    const r = Math.max(60, Math.min(aw * 0.4, ((bot - top) / 2 - 40) / 0.8));
    return { cx: land ? aw / 2 : w / 2, cy: (top + bot) / 2 - 8, r, w, h };
  }
  flatPos(i) {
    const L = this.flat2();
    const a = this.seatAngle(i);
    return [L.cx + Math.cos(a) * L.r, L.cy + Math.sin(a) * L.r * 0.8];
  }
  draw2d() {
    const g = this.g2;
    if (!g) return;
    const cv = this.el.cv;
    const L = this.flat2(), w = L.w, h = L.h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#10191d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f4e5a';
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.78, L.r * 0.62, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#b8f2e6'; g.stroke();
    this.draw2dGame(g, w, h, L.r);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
    });
  }
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const F2 = this.flat2(), cx = F2.cx, cy = F2.cy;
    const shown = this.shown();
    // oyuncuların durum işaretleri (2D'de etiket yok): yazdı/yazıyor, oy verdi, yazar, kazanç
    (v.seats || []).forEach((p, i) => {
      const [x0, y0] = this.flatPos(i);
      const mark = v.phase === 'write' ? ((v.wrote || [])[i] ? '✓' : '✍️') : v.phase === 'vote' ? (i === v.author ? '🎤' : (v.voted || [])[i] ? '✓' : '') : v.phase === 'reveal' && shown ? (i === v.author ? `+${(v.gain || [])[i] || 0}` : (v.gain || [])[i] ? '+100' : '') : v.phase === 'final' ? ((v.champ || []).includes(i) ? '🏆' : '') : '';
      if (mark) { g.font = '900 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23f'; g.fillText(mark, x0, y0 - 29); }
    });
    // yalan makinesi
    g.fillStyle = '#33474d'; g.fillRect(cx - 34, cy + r * 0.3, 68, 22);
    g.fillStyle = '#f4efe2'; g.fillRect(cx - 28, cy + r * 0.3 + 4, 56, 10);
    g.strokeStyle = '#1c1633'; g.lineWidth = 1.5; g.beginPath();
    for (let x = 0; x <= 56; x += 4) g.lineTo(cx - 28 + x, cy + r * 0.3 + 9 + Math.sin(this.time * 9 + x * 0.4) * 3 * (0.3 + Math.abs(this.needleV)));
    g.stroke();
    if (this.alarmK() > 0.05) { g.fillStyle = '#ff4a3d'; g.beginPath(); g.arc(cx - 28, cy + r * 0.3 - 3, 5, 0, TAU); g.fill(); }
    if (!this.cardsOn()) return;
    const cw = Math.min(70, r * 0.36), chh = cw * 0.72;
    const L = this.voterList();
    const now = this.sNow();
    for (let k = 0; k < 3; k++) {
      const x = cx + (k - 1) * (cw + 10), y = cy - chh * 0.75;
      g.fillStyle = '#fbf3e0'; g.strokeStyle = '#13262c'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(x - cw / 2, y - chh / 2, cw, chh, 8); g.fill(); g.stroke();
      g.fillStyle = NUMC[k]; g.beginPath(); g.arc(x, y - 2, 13, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k + 1), x, y - 1);
      if (v.phase === 'vote' && v.isAuthor && k === v.lieIdx) { g.fillStyle = '#e63946'; g.font = '900 10px system-ui'; g.fillText('YALAN', x, y + chh / 2 - 9); }
      if (shown) {
        const lie = k === v.lieIdx;
        g.save(); g.translate(x, y); g.rotate(lie ? -0.2 : 0.12);
        g.strokeStyle = lie ? '#e63946' : '#22a06b'; g.fillStyle = g.strokeStyle; g.lineWidth = 3;
        g.strokeRect(-cw * 0.42, -11, cw * 0.84, 22);
        g.font = `900 ${lie ? 12 : 10}px system-ui`; g.fillText(lie ? 'YALAN' : '✓ DOĞRU', 0, 1);
        g.restore();
      }
    }
    // fişler: oylamada oy verenin önünde, açılışta kartların altında
    (v.seats || []).forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      if (v.phase === 'vote' && (v.voted || [])[i] && i !== v.author) { g.fillStyle = pcol(p.c); g.beginPath(); g.arc(x + (cx - x) * 0.3, y + (cy - y) * 0.3, 6, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
      if ((v.phase === 'vote' || v.phase === 'reveal') && i === v.author) { g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 29, 0, TAU); g.stroke(); }
    });
    if (v.phase === 'reveal') {
      const stack = [0, 0, 0];
      L.forEach((o, k) => {
        const u = clamp((now - (v.at || 0) - (CHIP_T0 + k * CHIP_GAP) * 1000) / (CHIP_FLY * 1000), 0, 1);
        const [sx0, sy0] = this.flatPos(o.i);
        const j = stack[o.x]++;
        const tx = cx + (o.x - 1) * (cw + 10) + ((j % 4) - 1.5) * 11, ty = cy + 4 + Math.floor(j / 4) * 11;
        const e = easeOut(u);
        g.fillStyle = pcol(v.seats[o.i]?.c ?? 0);
        g.beginPath(); g.arc(lerp(sx0, tx, e), lerp(sy0, ty, e), 5.5, 0, TAU); g.fill();
        g.strokeStyle = shown && o.x === v.lieIdx ? '#3ad07a' : '#fff'; g.lineWidth = 2; g.stroke();
      });
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new LieGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[idy]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
