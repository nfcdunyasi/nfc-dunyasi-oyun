// Anlat Bakalım / Sessiz Sinema — 3D oyun gecesi masası (NFC Dünyası Oyun)
// Masanın ortasında kum saati: her turda ters çevrilir, kum akar. Anlatıcı kartını tutar (masadakiler kartın arkasını, "?"
// görür); Anlat Bakalım'da konuşarak anlatır, Sessiz Sinema'da spot ışığı altında hiç konuşmadan canlandırır. Doğru bilene
// anlatıcı dokununca bilen ayağa fırlar, kart anlatıcının önündeki yığına uçar. Gözcü kural ihlalinde kırmızı kart kaldırır.
// Anlatıcı bir botsa ipuçları balonlarda belirir, masadakiler tahminini yazar. Masa kiti (masa3d.js) ve Kurye Yarışı
// motoruyla çizilir; WebGL yoksa 2D görünüm gösterilir. Sessiz Sinema bu dosyayı kullanır (view.kind = 'mime').
import { _masa } from './masa3d.js?v=2026-11-21-g';
import * as sfx from '../sfx.js?v=2026-11-21-g';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs, trophyModel } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

const HY = TABLE_Y + 0.004;            // kum saatinin tabanı
const HC = 0.2675;                     // kum saatinin belli (dönme merkezi, tabana göre)
const HS = 1.55;                       // kum saatinin ölçeği (masada iri dursun)
const CW = 0.15, CL = 0.21;            // kartın yarı eni / yarı boyu
const DECK = [-0.55, 0.08], DISC = [0.55, 0.1];   // deste ve atılan kartlar (masa ortasında)
const FLIP_S = 0.7;                    // kum saatinin dönüşü (sn)
const RED3 = [1, 0.25, 0.2], GOLD3 = [1, 0.84, 0.36], SPOT3 = [1, 0.93, 0.72];
// kum saati camının iç profili [r, y] (tabana göre)
const GLASS = [[0.06, 0.04], [0.1, 0.06], [0.115, 0.1], [0.11, 0.15], [0.09, 0.2], [0.05, 0.24], [0.016, 0.262], [0.013, HC], [0.016, 0.273], [0.05, 0.295], [0.09, 0.335], [0.11, 0.385], [0.115, 0.435], [0.1, 0.475], [0.06, 0.495]];

const TXT = {
  talk: { icon: '🗣️', name: 'Anlat Bakalım', role: '🎤', verb: 'anlat', doing: 'anlatıyor', will: 'anlatacak', did: 'anlattı', foul: '🚫 Yasak kelime söyledi!', foulS: 'YASAK!', foulNote: 'Yasak kelimeyi duyarsan bas.', rule: 'Yasak kelimeleri söylemeden anlat', start: 'Telefonunu kimseye gösterme. Başla\'ya basınca kum saati döner; kartı yasak kelimeleri söylemeden anlat.' },
  mime: { icon: '🎬', name: 'Sessiz Sinema', role: '🎬', verb: 'canlandır', doing: 'canlandırıyor', will: 'canlandıracak', did: 'canlandırdı', foul: '🤐 Konuştu!', foulS: 'KONUŞTU!', foulNote: 'Konuşur ya da ses çıkarırsa bas.', rule: 'Hiç konuşmadan canlandır', start: 'Telefonunu kimseye gösterme. Başla\'ya basınca kum saati döner; kartı hiç konuşmadan, sadece hareketle canlandır.' },
};

const STYLE = `
#ky.anb .msg{top:13%}
#ky.anb .an-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#fbf7ef;color:var(--ink);padding:9px 11px 10px;text-align:center}
#ky.anb .an-box.dark{background:#1d2430;color:#fff}
#ky.anb .an-h{font-size:clamp(16px,4.5vw,20px);font-weight:900;line-height:1.2}
#ky.anb .an-s{font-size:12.5px;font-weight:700;opacity:.75;line-height:1.3;margin-top:3px}
#ky.anb .an-card{border:4px solid var(--ink);border-radius:18px;background:#fffdf6;color:var(--ink);padding:8px 10px 10px;animation:kyin .3s cubic-bezier(.2,1.5,.4,1)}
#ky.anb .an-card small{display:block;font-size:11.5px;font-weight:900;letter-spacing:.08em;opacity:.65}
#ky.anb .an-card b{display:block;font-size:clamp(26px,8vw,36px);font-weight:900;line-height:1.08;margin-top:2px;overflow-wrap:anywhere}
#ky.anb .an-tab{margin-top:7px;border-radius:13px;background:#e0322f;color:#fff;padding:5px 8px 7px}
#ky.anb .an-tab small{display:block;font-size:11px;font-weight:900;letter-spacing:.06em;opacity:.85}
#ky.anb .an-tab div{font-size:clamp(15px,4.3vw,18px);font-weight:900;line-height:1.25}
#ky.anb .an-lbl{font-size:13px;font-weight:900;margin-top:7px}
#ky.anb .an-grid{display:grid;gap:6px;margin-top:5px}
#ky.anb .an-g{display:flex;align-items:center;justify-content:center;gap:5px;min-width:0;border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:9px 6px;font-weight:900;font-size:14.5px;background:#3ccf6e;color:#fff;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.anb .an-g i{flex:0 0 auto;width:11px;height:11px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.anb .an-g span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.anb .an-g:active,#ky.anb .an-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.anb .an-row{display:flex;gap:8px;justify-content:center;align-items:center;margin-top:8px;flex-wrap:wrap}
#ky.anb .an-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:8px 14px;font-weight:900;font-size:15px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.anb .an-b.alt{background:#fff}
#ky.anb .an-b.big{display:block;width:100%;padding:14px 10px;font-size:20px;border-width:4px;box-shadow:4px 4px 0 var(--ink)}
#ky.anb .an-b.red{background:#e0322f;color:#fff}
#ky.anb .an-b.ghost{background:transparent;color:inherit;border-color:currentColor;box-shadow:none;font-size:12.5px;padding:4px 9px;border-width:2px}
#ky.anb .an-b[disabled]{opacity:.5}
#ky.anb .an-foul{display:block;width:100%;margin-top:8px;border:4px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);background:#e0322f;color:#fff;padding:16px 10px;font-weight:900;font-size:21px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#ky.anb .an-foul:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.anb .an-tm{display:flex;align-items:center;gap:8px;margin-top:8px}
#ky.anb .an-tm .bar{flex:1;height:8px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden}
#ky.anb .an-tm .bar i{display:block;height:100%;background:#3ccf6e;border-radius:9px;transform-origin:left center;transition:transform .15s linear}
#ky.anb .an-tm .bar i.hot{background:#ff5a36}
#ky.anb .an-tm b{font-size:16px;font-weight:900;min-width:44px;text-align:right;font-variant-numeric:tabular-nums}
#ky.anb .an-big{font-size:34px;font-weight:900;line-height:1.05;margin-top:4px}
#ky.anb .an-clue{margin-top:6px}
#ky.anb .an-clue .hint{display:inline-block;border-radius:99px;background:#ffd23f;color:#1c1633;font-weight:900;font-size:13px;padding:2px 10px}
#ky.anb .an-clue .ws{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:6px}
#ky.anb .an-clue .ws span{border:2px solid var(--ink);border-radius:99px;background:#fff;color:var(--ink);font-weight:900;font-size:14px;padding:2px 10px;animation:kyin .3s cubic-bezier(.2,1.5,.4,1)}
#ky.anb .an-clue .mk{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:clamp(22px,6.5vw,28px);font-weight:900;letter-spacing:.18em;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere}
#ky.anb .an-clue .wait{font-size:13px;font-weight:800;opacity:.75;margin-top:6px}
#ky.anb .an-form{display:flex;gap:6px;margin-top:8px}
#ky.anb .an-form input{flex:1;min-width:0;border:3px solid var(--ink);border-radius:13px;padding:9px 11px;font-size:16px;font-weight:800;background:#fff;color:#1c1633}
#ky.anb .an-form button{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:0 14px;font-weight:900;font-size:15px;background:#3ccf6e;color:#fff}
#ky.anb .an-feed{font-size:12px;font-weight:700;opacity:.8;margin-top:5px;min-height:15px}
#ky.anb .an-log{display:grid;gap:4px;margin-top:7px;max-height:min(26vh,200px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.anb .an-log div{display:flex;justify-content:space-between;gap:8px;border:2px solid var(--ink);border-radius:11px;padding:3px 9px;background:#fff;font-weight:800;font-size:13.5px;color:var(--ink)}
#ky.anb .an-log div span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky.anb .an-log div em{font-style:normal;font-size:12px;opacity:.75;white-space:nowrap}
#ky.anb .an-log div.got{background:#d6f5e0}
#ky.anb .an-log div.taboo{background:#ffe1d6}
#ky.anb .lbl .an-x{display:inline-flex;align-items:center;gap:3px;margin-left:3px}
#ky.anb .lbl .an-x:empty{display:none}
#ky.anb .lbl .an-p{display:inline-block;min-width:16px;padding:0 4px;border-radius:9px;background:#3ccf6e;color:#fff;font-weight:900;font-size:.85em;line-height:1.35;text-align:center}
#ky.anb .lbl .an-p.neg{background:#e0322f}
#ky.anb .lbl.an-on{box-shadow:0 0 0 3px #ffd23f,0 0 16px rgba(255,210,63,.8)}
#ky.anb .an-bub{position:absolute;left:0;top:0;pointer-events:none;z-index:4;white-space:nowrap;max-width:46vw;overflow:hidden;text-overflow:ellipsis;border:3px solid #1c1633;border-radius:14px;background:#fff;color:#1c1633;font-weight:900;font-size:14px;padding:3px 10px;box-shadow:2px 2px 0 #1c1633;transition:opacity .25s}
#ky.anb .an-bub:after{content:"";position:absolute;left:calc(50% + var(--tx,0px));bottom:-9px;margin-left:-6px;border:6px solid transparent;border-top-color:#1c1633}
#ky.anb .an-bub.got{background:#3ccf6e;color:#fff}
#ky.anb .an-bub.bad{background:#e0322f;color:#fff}
#ky.anb .an-bub.clue{background:#ffd23f}
#ky.anb .an-pop{position:absolute;left:0;top:0;pointer-events:none;z-index:4;font-weight:900;font-size:24px;color:#3ccf6e;-webkit-text-stroke:1.5px #1c1633;text-shadow:2px 2px 0 #1c1633}
#ky.anb .an-pop.neg{color:#ff5a36}
#ky.anb .card .an-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.anb .card .an-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.anb .card .an-seg button.on{background:var(--ink);color:#fff}
#ky.anb .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.anb .card .an-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.anb .card .an-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.anb .card .an-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.anb .card .an-tb{display:grid;gap:5px;margin-top:10px;max-height:min(30vh,250px);overflow:auto;text-align:left}
#ky.anb .card .an-tb div{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);border-radius:12px;padding:4px 10px;background:#fff;font-weight:800;font-size:14px;color:var(--ink)}
#ky.anb .card .an-tb div.me{background:#fff4c2}
#ky.anb .card .an-tb div i{flex:0 0 auto;width:13px;height:13px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.anb .card .an-tb div span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.anb .card .an-tb div em{font-style:normal;font-size:11.5px;opacity:.7;font-weight:700;white-space:nowrap}
#ky.anb .card .an-tb div b{font-weight:900;white-space:nowrap}
#ky.anb .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.anb .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.anb .an-box{width:min(450px,52vw);padding:6px 9px 8px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.anb .an-card{padding:5px 8px 7px}#ky.anb .an-card b{font-size:22px}
#ky.anb .an-tab{margin-top:5px;padding:3px 7px 5px}#ky.anb .an-tab div{font-size:14px}
#ky.anb .an-g{padding:6px 5px;font-size:13px}
#ky.anb .an-foul{padding:9px 8px;font-size:17px}
#ky.anb .an-b.big{padding:9px 8px;font-size:17px}
#ky.anb .an-tm{margin-top:5px}
#ky.anb .an-log{max-height:22vh}
#ky.anb .card .an-tb{max-height:24vh;margin-top:6px}
#ky.anb .card .an-ru{margin-top:6px}#ky.anb .card .an-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.anb .card .an-ru div b{font-size:17px}
#ky.anb .card .an-seg{margin-top:6px}#ky.anb .card .an-seg button{padding:6px 4px}
}
@media (min-aspect-ratio:11/10){#ky.anb .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// Anlat Bakalım: yarışma programı funk'ı (Mi minör; giriş 118 bpm, tur sırasında 132 bpm, saat tıkırtısı).
// Sessiz Sinema: sessiz film ragtime piyanosu (Do majör; giriş 104 bpm, turda kovalamaca 138 bpm).
class AnSnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; this.kind = 'talk'; }
  tempo() { const r = this.mode === 'race'; return this.kind === 'mime' ? (r ? 138 : 104) : (r ? 132 : 118); }
  swing() { return this.kind === 'mime' ? 0.1 : 0.04; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    const race = this.mode === 'race';
    if (this.kind === 'mime') {
      // ragtime: sol el (bas notası 1 ve 3'te, akor 2 ve 4'te), sağ el senkoplu melodi
      const CH = [[36, [64, 67, 72]], [43, [62, 65, 71]], [36, [64, 67, 72]], [41, [65, 69, 72]], [36, [64, 67, 72]], [38, [62, 66, 69]], [43, [62, 65, 67]], [36, [60, 64, 67]]];
      const [root, ch] = CH[bar % 8];
      const pv = (m, v, d) => { this.iPluck(t, m, v, d, 'triangle', 2600, 0.12); this.iPluck(t, m + 12, v * 0.35, d * 0.8, 'square', 1200, 0.1); };
      if (s === 0) pv(root, 0.15, race ? 0.36 : 0.5);
      if (s === 8) pv(root + 7, 0.13, race ? 0.34 : 0.48);
      if (s === 4 || s === 12) ch.forEach((m, k) => this.iPluck(t + k * 0.004, m - 12, 0.045, race ? 0.22 : 0.34, 'square', 1700, 0.14));
      const MEL = race
        ? [76, 79, 84, 79, 76, 72, 74, 76, 77, 76, 74, 72, 71, 72, 74, 76]
        : [76, null, 74, 76, null, 79, null, 76, 77, null, 76, 74, null, 72, 71, 72];
      const m = MEL[s];
      if (m != null && (race || s % 2 === 0 || m === 79)) { const mm = m + (bar % 4 === 3 ? -2 : 0), v0 = race ? 0.05 : 0.065, d0 = st * (race ? 1.1 : 1.8); this.iPluck(t, mm, v0, d0, 'square', 2600, 0.18); this.iPluck(t + 0.012, mm, v0 * 0.5, d0, 'triangle', 3400, 0.18); }
      if (race && s % 4 === 2) this.iBrush(t, 0.04, 0.08);
      if (race && s % 8 === 0) this.iKick(t, 0.07, 100, 50, 0.15);
      return;
    }
    // funk: kick, el çırpma, synth bas, elektrik piyano akorları
    const CH = [[40, [64, 67, 71]], [43, [67, 71, 74]], [45, [69, 72, 76]], [47, [66, 71, 74]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0 || s === 10 || (race && s === 8)) this.iKick(t, race ? 0.17 : 0.16, 115, 45, 0.18);
    if (s === 4 || s === 12) this.iClap(t, 0.075);
    if (s % 2 === 1 || race) this.iHat(t, race ? (s % 2 ? 0.018 : 0.01) : 0.015, s === 14);
    const BL = [0, null, null, 12, null, null, 10, null, 0, null, 7, null, null, 10, 12, null];
    if (BL[s] != null) this.iBass(t, root + BL[s] - 12, st * 1.4, 0.13, 'saw', 900);
    if (s === 2 || s === 7 || s === 10) ch.forEach((m, k) => this.iEP(t + k * 0.005, m, 0.038, st * 1.5, 0.2));
    const LEAD = [79, null, 76, null, 74, 76, null, 71, 72, null, 74, null, 76, null, 71, null];
    if (!race && bar % 2 === 1 && LEAD[s] != null) this.iPluck(t, LEAD[s], 0.03, st * 1.6, 'square', 2800, 0.2);
    if (race && s % 4 === 0) this.iTick(t, 0.02);
    if (!race && s === 0 && bar % 4 === 0) this.iBell(t, 83, 0.02, spb * 2, 0.3);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'flip': // kum saati ters çevrildi: tahta tok + kum hışırtısı
        this.tone(170, t, 0.08, 'sine', 0.2, 110, 0.002);
        this.tone(170, t + 0.55, 0.08, 'sine', 0.22, 100, 0.002);
        this.noise(t + 0.05, 0.6, 0.05, { type: 'bandpass', freq: 3800, to: 1600, q: 0.8, attack: 0.05 });
        break;
      case 'got':
        this.duck(0.3, 1.2);
        [[784, 0], [1175, 0.09]].forEach(([f, d]) => this.tone(f, t + d, 0.28, 'triangle', 0.1, null, 0.003));
        this.cheer(t + 0.05, 0.9);
        break;
      case 'pass':
        this.noise(t, 0.16, 0.08, { type: 'bandpass', freq: 2200, to: 700, q: 1, attack: 0.01 });
        this.tone(220, t + 0.05, 0.25, 'square', 0.04, 150, 0.01);
        break;
      case 'taboo': // hakem düdüğü + kısa uyarı
        this.duck(0.25, 1.4);
        for (const d of [0, 0.22]) { const o = this.k.ctx.createOscillator(), g = this.k.ctx.createGain(), lf = this.k.ctx.createOscillator(), lg = this.k.ctx.createGain(); o.type = 'sine'; o.frequency.value = 2900; lf.frequency.value = 38; lg.gain.value = 140; lf.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.09, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + (d ? 0.38 : 0.16)); o.connect(g); g.connect(this.out(0)); o.start(t + d); lf.start(t + d); o.stop(t + d + 0.45); lf.stop(t + d + 0.45); }
        this.tone(150, t + 0.62, 0.3, 'sawtooth', 0.05, 120, 0.005);
        break;
      case 'card': this.noise(t, 0.1, 0.07, { type: 'bandpass', freq: 3000, to: 1400, q: 1.2, attack: 0.005 }); break;
      case 'clue': this.tone(1320, t, 0.12, 'triangle', 0.05, null, 0.002); this.tone(1760, t + 0.07, 0.12, 'triangle', 0.04, null, 0.002); break;
      case 'nope': this.tone(330, t, 0.1, 'square', 0.035, 260, 0.004); break;
      case 'end': // süre bitti: zil
        this.duck(0.3, 1.6);
        [0, 0.12, 0.24].forEach((d) => this.tone(1568, t + d, 0.5, 'sine', 0.07, null, 0.002));
        this.tone(392, t, 0.6, 'square', 0.04, 380, 0.005);
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
// kum saatinin tahta çerçevesi (alt-üst disk, üç direk) ve kum (birim şekiller; doluluk ölçekle verilir)
function hgFrame(mb) {
  const Wd = C('#8a5a34', -0.55), Wd2 = C('#6b4226', -0.5);
  const disc = (y0, r) => mb.lathe(0, y0, 0, [[0, 0], [r - 0.012, 0], [r, 0.008], [r, 0.027], [r - 0.012, 0.035], [0, 0.035]], 24, (i) => (i === 2 || i === 3 ? Wd2 : Wd));
  disc(0, 0.172); disc(0.5, 0.078);
  // üst kapaktan direklere uzanan kollar (kapak küçük: kum yukarıdan görünsün)
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + Math.PI / 2; limb(mb, [Math.cos(a) * 0.07, 0.517, Math.sin(a) * 0.07], [Math.cos(a) * 0.14, 0.517, Math.sin(a) * 0.14], [0.012, 0.012], Wd, 8); }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + Math.PI / 2, x = Math.cos(a) * 0.14, z = Math.sin(a) * 0.14;
    limb(mb, [x, 0.035, z], [x, 0.5, z], [0.013, 0.013], Wd, 8);
    for (const y of [0.07, 0.2675, 0.517]) mb.sphereS(x, y, z, 0.02, 0.016, 0.02, Wd2, 10, 6);
  }
}
const SAND = C('#e8be6c', -0.2);
// üst haznedeki kum (tam dolu): belden yukarı camın içini izler; ölçek belin etrafında
function sandTop(mb) { mb.lathe(0, 0, 0, [[0, 0], [0.011, 0], [0.04, 0.022], [0.075, 0.06], [0.095, 0.105], [0.101, 0.145], [0.08, 0.152], [0, 0.155]], 18, SAND); }
// alt haznedeki kum yığını (tam): tabandan yükselen tümsek
function sandBot(mb) { mb.lathe(0, 0, 0, [[0, 0], [0.104, 0], [0.104, 0.03], [0.09, 0.07], [0.06, 0.11], [0.025, 0.14], [0, 0.15]], 18, SAND); }
function sandStream(mb) { limb(mb, [0, 0, 0], [0, -1, 0], [0.004, 0.004], SAND, 6); }
// cam (ışıksız, yarı saydam): profil boyunca halka şeritler
function hgGlass(mb) {
  const push = (p, c) => mb.d.push(p[0], p[1], p[2], c[0], c[1], c[2], c[3]);
  const N = 22;
  for (let j = 0; j + 1 < GLASS.length; j++) {
    const [r0, y0] = GLASS[j], [r1, y1] = GLASS[j + 1];
    const c0 = [0.75, 0.88, 1, 0.13 + 0.06 * Math.abs(y0 - HC) / 0.23], c1 = [0.75, 0.88, 1, 0.13 + 0.06 * Math.abs(y1 - HC) / 0.23];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
      const P = (r, y, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
      const A = P(r0, y0, a0), B = P(r0, y0, a1), Cc = P(r1, y1, a1), D = P(r1, y1, a0);
      push(A, c0); push(B, c0); push(Cc, c1); push(A, c0); push(Cc, c1); push(D, c1);
    }
  }
  // parıltı şeridi
  const S = [1, 1, 1, 0.3];
  for (let j = 0; j + 1 < GLASS.length; j++) {
    const [r0, y0] = GLASS[j], [r1, y1] = GLASS[j + 1], a = 2.3, w = 0.16;
    const P = (r, y, aa) => [Math.cos(aa) * (r + 0.001), y, Math.sin(aa) * (r + 0.001)];
    push(P(r0, y0, a), S); push(P(r0, y0, a + w), S); push(P(r1, y1, a + w), S); push(P(r0, y0, a), S); push(P(r1, y1, a + w), S); push(P(r1, y1, a), S);
  }
}
// kart: XY düzleminde; ön yüz +z, arka yüz -z (ikisi de dokulu ayrı çizilir); kenar beyaz
function cardBody(mb) { mb.rbox(-CW, -CL, -0.002, CW, CL, 0.002, 0.006, C('#ffffff', -0.3), 1); }
function cardFaces(tb) {
  const x0 = -CW + 0.008, x1 = CW - 0.008, y0 = -CL + 0.008, y1 = CL - 0.008;
  // arka (masadakilerin gördüğü "?" yüzü): dokunun sol yarısı; ön (anlatıcının yüzü): sağ yarısı
  tb.tquad([x1, y0, -0.0026], [x0, y0, -0.0026], [x0, y1, -0.0026], [x1, y1, -0.0026], 0, 0, 0.5, 1, [0, 0, 1]);
  tb.tquad([x0, y0, 0.0026], [x1, y0, 0.0026], [x1, y1, 0.0026], [x0, y1, 0.0026], 0.5, 0, 1, 1, [0, 0, -1]);
}
// masada duran kart (yatay): arka yüzü yukarıda
function cardFlat(mb) {
  mb.rbox(-CW, 0, -CL, CW, 0.004, CL, 0.006, C('#ffffff', -0.3), 1);
  mb.rbox(-CW + 0.01, 0.0035, -CL + 0.01, CW - 0.01, 0.0048, CL - 0.01, 0.004, C('#5b2a86', -0.5), 1);
  mb.sphereS(0, 0.0052, 0, 0.04, 0.0012, 0.04, C('#ffd23f', -0.6), 14, 3);
}
// gözcünün kırmızı kartı (el koordinatında: parmak uçlarının ötesinde)
function redCard(mb) { mb.rbox(-0.05, -0.25, -0.004, 0.05, -0.11, 0.004, 0.004, C('#e0322f', -0.45), 1); }
// anlatıcının üstüne düşen spot ışığı (ışıksız, toplamalı koni)
function spotModel(mb) {
  const push = (p, c) => mb.d.push(p[0], p[1], p[2], c[0], c[1], c[2], c[3]);
  const N = 24, H = 2.6, R0 = 0.05, R1 = 0.55;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const t0 = [Math.sin(a0) * R0, H, Math.cos(a0) * R0], t1 = [Math.sin(a1) * R0, H, Math.cos(a1) * R0];
    const b0 = [Math.sin(a0) * R1, 0, Math.cos(a0) * R1], b1 = [Math.sin(a1) * R1, 0, Math.cos(a1) * R1];
    const ct = [0, 0, 0, 0], cb = [0.3, 0.28, 0.2, 1];
    push(t0, ct); push(b0, cb); push(b1, cb); push(t0, ct); push(b1, cb); push(t1, ct);
  }
}
// kart yüzleri dokusu: sol yarı arka yüz ("?"), sağ yarı ön yüz (oyun adı)
function drawCardTex(cv, kind) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, hw = W / 2;
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  // arka
  let gr = g.createLinearGradient(0, 0, hw, H);
  gr.addColorStop(0, '#3d1d63'); gr.addColorStop(1, '#6a2fa0');
  g.fillStyle = gr; g.fillRect(0, 0, hw, H);
  g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(14, 14, hw - 28, H - 28);
  g.fillStyle = 'rgba(255,255,255,.08)';
  for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(30 + (k % 3) * 98, 40 + Math.floor(k / 3) * 140, 16, 0, TAU); g.fill(); }
  g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 210px ${F}`;
  g.fillText('?', hw / 2, H * 0.53);
  // ön
  gr = g.createLinearGradient(hw, 0, W, H);
  gr.addColorStop(0, kind === 'mime' ? '#fff4c2' : '#e9ffd0'); gr.addColorStop(1, '#ffffff');
  g.fillStyle = gr; g.fillRect(hw, 0, hw, H);
  g.strokeStyle = kind === 'mime' ? '#e0a400' : '#3a9b3a'; g.lineWidth = 8; g.strokeRect(hw + 14, 14, hw - 28, H - 28);
  g.fillStyle = '#1c1633';
  let fs = 46; g.font = `800 ${fs}px ${F}`;
  const t = kind === 'mime' ? 'SESSİZ SİNEMA' : 'ANLAT BAKALIM';
  const [l1, l2] = t.split(' ');
  while (fs > 22 && g.measureText(l2).width > hw - 60) { fs -= 2; g.font = `800 ${fs}px ${F}`; }
  g.fillText(l1, hw + hw / 2, H * 0.44); g.fillText(l2, hw + hw / 2, H * 0.56);
}

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));

/* ============================ oyun ============================ */
class DescGame extends TableGame {
  constructor(ctx) {
    const kind = ctx.view?.kind === 'mime' ? 'mime' : 'talk';
    const snd = new AnSnd();
    snd.kind = kind;
    const look = kind === 'mime'
      ? { world: 'ssn', cloth: '#4f1523', trim: '#e2b552', chairPad: '#2b2b33', fog: '#140c10', roomStyle: { wall: '#1b1418', curtain: '#a31d2b' } }
      : { cloth: '#225a2e', trim: '#f4d35e', chairPad: '#d7263d', fog: '#0f1410', roomStyle: { wall: '#1e2a22', curtain: '#7a1f28' } };
    super(ctx, Object.assign({ tag: 'anb', cls: 'anb', title: TXT[kind].name, sub: kind === 'mime' ? 'Hiç konuşmadan canlandır' : 'Yasak kelimeleri söylemeden anlat', emoji: TXT[kind].icon, css: STYLE, snd, amb: 'diner', ambVol: 0.4, botPx: 300, botPxL: 34, tea: false, place: false }, look));
    this.kind = kind;
    this.T2 = TXT[kind];
    this.fly = [];                 // uçan kartlar { from:[x,y,z], kind:'won'|'disc', t0, j }
    this.bub = new Map();          // konuşma balonları (oyuncu id → { el, text, cls, until })
    this.pops = [];                // yükselen puanlar
    this.evSeen = 0;
    this.clueSeen = -1;
    this.feedSeen = 0;
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.frame = this.mk(hgFrame);
    W.sandT = this.mk(sandTop);
    W.sandB = this.mk(sandBot);
    W.stream = this.mk(sandStream);
    W.glass = this.mk(hgGlass, 'un');
    W.card = this.mk(cardBody);
    W.cardF = this.mk(cardFaces, 'tex');
    W.cardFlat = this.mk(cardFlat);
    W.red = this.mk(redCard);
    W.spot = this.mk(spotModel, 'un');
    W.trophy = this.mk(trophyModel);
    this.cardCv = document.createElement('canvas');
    this.cardCv.width = 512; this.cardCv.height = 362;
    try { drawCardTex(this.cardCv, this.kind); } catch { /* yok */ }
    this.cardTex = makeTexture(this.X, this.cardCv);
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.cardTex || !this.X || this.X.gl.isContextLost()) return; drawCardTex(this.cardCv, this.kind); updateTexture(this.X, this.cardTex, this.cardCv); }); } catch { /* yok */ }
  }
  freeTex() { if (this.cardTex && this.X) this.X.gl.deleteTexture(this.cardTex); this.cardTex = null; }
  onDispose() { for (const b of this.bub.values()) b.el.remove(); this.bub.clear(); this.pops.forEach((p) => p.el.remove()); this.pops = []; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  idOf(i) { return this.view?.seats?.[i]?.id; }

  /* ---------- balonlar ve puanlar ---------- */
  say(i, text, cls = '', ms = 2600) {
    const id = this.idOf(i);
    if (!id || this.flat) return;
    let b = this.bub.get(id);
    if (!b) { const el = document.createElement('div'); el.className = 'an-bub'; this.el.lbls.appendChild(el); b = { el }; this.bub.set(id, b); }
    b.el.textContent = text;
    b.el.className = 'an-bub' + (cls ? ' ' + cls : '');
    b.until = this.time + ms / 1000;
    b.t0 = this.time;
  }
  pop(i, text, neg = false) {
    const id = this.idOf(i);
    if (!id || this.flat) return;
    const el = document.createElement('div');
    el.className = 'an-pop' + (neg ? ' neg' : '');
    el.textContent = text;
    this.el.lbls.appendChild(el);
    this.pops.push({ id, el, t0: this.time });
  }
  placeLbls() {
    super.placeLbls();
    for (const [id, b] of this.bub) {
      const a = this.av.get(id);
      const left = b.until - this.time;
      if (!a || !a.headW || left <= 0) { b.el.style.opacity = '0'; if (left < -1) { b.el.remove(); this.bub.delete(id); } continue; }
      const q = this.project(a.headW[0], a.headW[1] + 0.62, a.headW[2]);
      if (!q) { b.el.style.opacity = '0'; continue; }
      const k = clamp((this.time - b.t0) / 0.18, 0, 1);
      b.el.style.opacity = String(Math.min(1, left / 0.3));
      // ekran kenarındaki karakterin balonu taşmasın: balon içeri kayar, kuyruğu karaktere bakmaya devam eder
      if (b.wT !== b.el.textContent) { b.wT = b.el.textContent; b.w = b.el.offsetWidth || 100; b.h = b.el.offsetHeight || 34; }
      const W = this.vw || this.el.wrap.clientWidth || 390, H = this.vh || this.el.wrap.clientHeight || 844, half = b.w / 2;
      const x = clamp(q[0], half + 6, Math.max(half + 6, W - half - 6)), y = clamp(q[1], b.h + 8, Math.max(b.h + 8, H - 8));
      b.el.style.setProperty('--tx', `${Math.round(clamp(q[0] - x, -half + 14, half - 14))}px`);
      b.el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%) scale(${(0.7 + 0.3 * easeOut(k)).toFixed(3)})`;
    }
    this.pops = this.pops.filter((p) => {
      const u = (this.time - p.t0) / 1.3, a = this.av.get(p.id);
      if (u >= 1 || !a || !a.headW) { p.el.remove(); return false; }
      const q = this.project(a.headW[0], a.headW[1] + 0.3 + u * 0.5, a.headW[2]);
      if (!q) { p.el.style.opacity = '0'; return true; }
      p.el.style.opacity = String(u < 0.75 ? 1 : (1 - u) / 0.25);
      p.el.style.transform = `translate(${Math.round(q[0])}px,${Math.round(q[1])}px) translate(-50%,-50%) scale(${(1 + 0.25 * Math.sin(Math.min(1, u * 4) * Math.PI)).toFixed(3)})`;
      return true;
    });
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'an-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'an-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'an-begin') { vibrate(20); this.ctx.send('begin', {}); }
      else if (act === 'an-skip') { this.fx('pop'); this.ctx.send('skip', {}); }
      else if (act === 'an-got') { vibrate(25); this.ctx.send('got', { guesserId: b.dataset.id }); }
      else if (act === 'an-pass') { this.ctx.send('pass', {}); }
      else if (act === 'an-foul') { vibrate([20, 30, 20]); this.ctx.send('taboo', {}); }
      else if (act === 'an-stop') { this.fx('pop'); this.ctx.send('stop', {}); }
      else if (act === 'an-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    const onSubmit = (e) => {
      const f = e.target.closest('form[data-form=an-guess]');
      if (!f) return;
      e.preventDefault();
      const inp = f.querySelector('input');
      const text = (inp?.value || '').trim();
      if (!text) return;
      this.myGuess = { text, t: this.time };
      this.ctx.send('guess', { text });
      inp.value = '';
      try { inp.focus(); } catch { /* yok */ }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.bar.addEventListener('submit', onSubmit);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.anb !== '1') { root.dataset.anb = '1'; root.innerHTML = `<p class="py-16 text-center">${this.T2.icon}</p>`; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.turnNo}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    this.onEvents(prev, v);
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const S = this.snd;
    const mus = (m) => { try { S.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    if (v.phase === 'intro') mus('idle');
    if (v.phase === 'ready') {
      mus('idle');
      this.fly = [];
      this.evSeen = v.ev ? v.ev.seq : this.evSeen;
      if (fresh && v.isDescriber) { this.msg(`${this.T2.role} SIRA SENDE!`, 'mid'); vibrate([30, 40, 30]); }
      else if (fresh && v.isWatcher) this.msg('🛡️ GÖZCÜ SENSİN', 'mid');
    }
    if (v.phase === 'turn') {
      mus('race');
      this.turnT = this.time - (fresh ? 0 : 9);
      this.clueSeen = -1;
      this.feedSeen = this.sNow();
      if (fresh) { this.fx('flip'); this.fx('card'); }
    }
    if (v.phase === 'summary') {
      mus('idle');
      this.sumT = this.time;
      if (fresh) { this.fx('end'); this.msg(`⏰ ${v.gotCount} KELİME`, 'mid'); }
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
  // bildi / pas / yasak, bot ipuçları ve yazılı tahminler: balon, uçan kart, ses
  onEvents(prev, v) {
    if (v.phase !== 'turn') return;
    const ev = v.ev;
    if (ev && ev.seq !== this.evSeen) {
      this.evSeen = ev.seq;
      const fresh = this.sNow() - (ev.at || 0) < 2500;
      if (fresh) {
        const d = v.describer;
        const a = this.avatarAt(d);
        const from = a ? this.seatW(a, 0, TABLE_Y + 0.32, 0.45) : [0, TABLE_Y + 0.3, 0];
        if (ev.k === 'got') {
          this.fx('got');
          this.say(ev.g, `✓ ${ev.word}!`, 'got', 2200);
          this.pop(ev.g, '+1'); this.pop(d, '+1');
          this.fly.push({ from, kind: 'won', t0: this.time, j: v.gotCount - 1 });
          const g = this.avatarAt(ev.g);
          if (this.X && g && g.headW) this.burst(g.headW[0], g.headW[1] + 0.3, g.headW[2], 22, [[0.3, 0.85, 0.45], [1, 0.85, 0.3], [1, 1, 1]], 1.6, 0.03, false, 1.4, 2.6);
          if (ev.g === v.me) vibrate([25, 30, 25]);
        } else if (ev.k === 'pass') {
          this.fx('pass');
          this.say(d, '⏭ Pas', '', 1200);
          this.fly.push({ from, kind: 'disc', t0: this.time, j: v.passCount + v.tabooCount - 1 });
        } else if (ev.k === 'taboo') {
          this.fx('taboo');
          this.say(ev.g, this.T2.foulS, 'bad', 2000);
          this.pop(d, '-1', true);
          this.redT = this.time;
          this.redI = ev.g;
          this.fly.push({ from, kind: 'disc', t0: this.time, j: v.passCount + v.tabooCount - 1 });
          this.flash?.('rgba(224,50,47,.35)');
        }
        this.fx('card');
      }
    }
    // bot anlatıcı: yeni ipucu balonu
    if (v.bot && v.clues) {
      const c = v.clues;
      const ck = `${v.cardSeq}:${c.n}`;
      if (ck !== this.clueSeen) {
        const first = this.clueSeen === -1 || String(this.clueSeen).split(':')[0] !== String(v.cardSeq);
        this.clueSeen = ck;
        let t = '';
        if (this.kind === 'talk') { if (c.mask && c.n > (c.words || []).length) t = `Harf: ${c.mask}`; else if ((c.words || []).length) t = `“${c.words[c.words.length - 1]}”…`; }
        else t = c.n ? `🤐 ${c.mask}` : `🤐 ${c.hint || ''}`;
        if (t) { this.say(v.describer, t, 'clue', 7000); if (!first || c.n) this.fx('clue'); }
      }
      // başkalarının yanlış tahminleri
      (v.feed || []).forEach((f) => { if (f.at > this.feedSeen) { this.feedSeen = f.at; this.say(f.i, `${f.text}?`, '', 2300); if (f.i !== v.me) this.fx('nope'); } });
    }
  }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time;
    const center = [0, HY + 0.45, 0];
    const dA = v.describer >= 0 ? this.avatarAt(v.describer) : null;
    const champA = (v.champ || []).length ? this.avatarAt(v.champ[0]) : null;
    const ev = v.ev, evAge = ev ? (this.sNow() - (ev.at || 0)) / 1000 : 9;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.anI || (a.anI = { lt: 0, look: null });
      const idleLook = (pc = 0.15) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const P = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.2 + Math.random() * 2.4;
          idle.look = P.length && Math.random() > pc ? P[Math.floor(Math.random() * P.length)] : center;
        }
        return idle.look;
      };
      const isD = i === v.describer, isW = i === v.watcher;
      if (v.phase === 'ready') {
        if (isD) { a.pose(Math.floor(t / 2.5) % 2 ? 'chin' : 'rest', { t }); a.expr = 'o'; a.look = idleLook(0.4); return; }
        a.pose(isW ? 'clasp' : hs(i, v.turnNo) < 0.5 ? 'lean' : 'rest', { t }); a.expr = isW ? 'tense' : 'grin';
        a.look = dA ? dA.headW : center;
        return;
      }
      if (v.phase === 'turn') {
        // olaylara tepkiler
        if (ev && evAge < 1.6) {
          if (ev.k === 'got' && i === ev.g) { a.pose('cheer', { t }); a.expr = 'laugh'; a.look = dA ? dA.headW : center; return; }
          if (ev.k === 'got' && isD) { a.pose('clap', { t }); a.expr = 'laugh'; a.look = this.avatarAt(ev.g)?.headW || center; return; }
          if (ev.k === 'taboo' && isW) { a.pose('cheer', { t }); a.shape[0] = 'grip'; a.expr = 'tense'; a.look = dA ? dA.headW : center; return; }
          if (ev.k === 'taboo' && isD) { a.pose('facepalm', { t }); a.expr = 'wince'; a.look = center; return; }
          if (ev.k === 'pass' && isD) { a.pose('shrug', { t }); a.expr = 'smile'; a.look = center; return; }
        }
        if (isD) {
          if (this.kind === 'mime') {
            // canlandırma: abartılı pandomim, ağız kapalı
            const SEQ = ['cheer', 'wave', 'shrug', 'headgrab', 'lean', 'clap', 'bite', 'chin'];
            const k = Math.floor(t * 1.6 + hs(v.cardSeq || 0, 3) * 8) % SEQ.length;
            a.pose(SEQ[k], { t, k: 12 });
            a.expr = Math.floor(t * 1.6) % 3 === 0 ? 'tense' : 'grin';
            a.look = idleLook(0.3);
          } else {
            // anlatma: iki elle anlatır, ağız açılıp kapanır, masadakilere bakar
            a.pose('rest', { t });
            const w = Math.sin(t * 5.2), w2 = Math.sin(t * 3.4 + 1);
            for (const j of [0, 1]) {
              const sx = j ? 1 : -1, ph = j ? w2 : w;
              a.tgt.hand[j] = [sx * (0.14 + ph * 0.05), 0.98 + ph * 0.06, 0.36];
              a.tgt.fdir[j] = [sx * -0.2, 0.6, 0.8]; a.tgt.palm[j] = [sx * -0.3, 0.6, 0.6]; a.tgt.fw[j] = 0.6; a.tgt.pole[j] = [sx * 0.9, -0.5, -0.1];
              a.shape[j] = 'open';
            }
            a.expr = Math.floor(t * 7) % 2 ? 'o' : 'smile';
            a.look = idleLook(0.2);
          }
          return;
        }
        if (isW) { a.pose('clasp', { t }); a.expr = 'tense'; a.look = dA ? dA.headW : center; return; }
        // tahmin edenler: öne eğilir, düşünür, arada el kaldırıp bağırır
        const ph = Math.floor(t / 1.7 + hs(i, 5) * 9) % 5;
        a.pose(ph === 0 ? 'wave' : ph === 1 ? 'chin' : ph === 2 ? 'lean' : 'rest', { t });
        a.expr = ph === 0 ? 'o' : ph === 3 ? 'tense' : 'smile';
        a.look = dA ? dA.headW : center;
        return;
      }
      if (v.phase === 'summary') {
        const u = t - (this.sumT || 0);
        if (isD) { a.pose(v.gotCount >= 3 ? (u < 2.5 ? 'cheer' : 'wave') : 'shrug', { t }); a.expr = v.gotCount >= 3 ? 'laugh' : 'smile'; a.look = idleLook(); return; }
        a.pose(u < 2.5 ? 'clap' : 'rest', { t }); a.expr = 'smile';
        a.look = dA ? dA.headW : idleLook();
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

  /* ---------- kamera, kum saati ---------- */
  // kum saatinin durumu: f = üst haznedeki kum oranı; flip = dönüş ilerlemesi (0..1, dönmüyorsa null)
  hgState() {
    const v = this.view, now = this.sNow();
    if (!v || v.phase !== 'turn') return { f: 0, flip: null };
    const u = (now - (v.at || 0)) / (FLIP_S * 1000);
    if (u < 1) return { f: 0, flip: Math.max(0, u) };
    return { f: clamp(((v.endsAt || 0) - now) / (v.turnMs || 6e4), 0, 1), flip: null };
  }
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time, now = this.sNow();
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.3, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    const focus = (i, z = 0.6, syP = 0.32) => {
      const a = i >= 0 ? this.avatarAt(i) : null;
      if (!a || !a.headW) return false;
      zoom = z; sy = land ? 0.45 : syP; H = [a.headW[0] * 0.75, a.headW[1] - 0.2, a.headW[2] * 0.75]; yawC = Math.atan2(-a.pos[0], -a.pos[2]);
      return true;
    };
    bp = Math.max(150, this.barH || 260);
    if (v.phase === 'ready') { if (!focus(v.describer, 0.62)) zoom = 0.9; }
    else if (v.phase === 'turn') { if (!focus(v.describer, 0.78, 0.3)) zoom = 0.9; }
    else if (v.phase === 'summary') { if (!focus(v.describer, 0.66)) zoom = 0.9; }
    else if (v.phase === 'final') { zoom = 0.95; bp = 200; sy = land ? 0.5 : 0.22; sx = land ? 0.27 : 0.5; yawC = Math.sin(t * 0.15) * 0.12; }
    else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (Math.abs(bp - this.cfg.botPx) > 12) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    this.fly = this.fly.filter((f) => t - f.t0 < 0.6);
    // son 10 saniye: tıkırtı (anlatıcıya ve gözcüye)
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'turn' && left > 0 && left < 10500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; if (v.isDescriber || v.isWatcher || sec <= 5) this.fx('tick', 0.6); } }
    if (v.phase === 'ready' && v.isDescriber && left > 0 && left < 5500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
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
  // kum saatinin matrisi (dönüşte belin etrafında döner)
  hgMat(m, rx = 0) { M.set(m, 0, HY + HC * HS, 0, 0.5, rx, 0, HS); const L = this.hgL || (this.hgL = M.make()); M.set(L, 0, -HC, 0); M.mul(m, m, L); return m; }
  // anlatıcının elindeki kartın yeri: göğüs hizasında, ona dönük (masadakiler arka yüzü görür)
  heldMat(m, a, s = 1) {
    const p = this.seatW(a, 0, TABLE_Y + 0.36 + Math.sin(this.time * 2.1) * 0.01, 0.43);
    M.set(m, p[0], p[1], p[2], a.yaw + Math.PI, -0.3, Math.sin(this.time * 1.7) * 0.05, s);
  }
  pileAt(a, kind, j) {
    if (kind === 'won') return { p: this.seatW(a, (hs(j, 4) - 0.5) * 0.04, TABLE_Y + 0.004 + j * 0.0045, 0.86), yaw: a.yaw + (hs(j, 5) - 0.5) * 0.5 };
    return { p: [DISC[0] + (hs(j, 6) - 0.5) * 0.05, TABLE_Y + 0.004 + j * 0.0045, DISC[1] + (hs(j, 7) - 0.5) * 0.05], yaw: (hs(j, 8) - 0.5) * 1.2 };
  }
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.frame || !v) return;
    const m = this.mats.b, mc = this.mats.c, T = this.T, t = this.time;
    // kum saati
    const hg = this.hgState();
    const rx = hg.flip != null ? easeOut(hg.flip) * Math.PI : 0;
    this.hgMat(m, rx);
    D(Wd.frame, m, T.obj);
    // kum: dönüşte hepsi alttaydı (birlikte döner); sonra üstten alta akar
    const f = hg.flip != null ? 0 : hg.f;
    const L = this.sL || (this.sL = M.make()), O = this.sO || (this.sO = M.make());
    if (f > 0.004) {
      const k = Math.cbrt(f);
      M.set(L, 0, HC + 0.004, 0, 0, 0, 0, k, k, k);
      M.mul(O, m, L); D(Wd.sandT, O, T.obj);
    }
    const kb = Math.cbrt(clamp(1 - f, 0.02, 1));
    M.set(L, 0, 0.038, 0, 0, 0, 0, kb, kb, kb);
    M.mul(O, m, L); D(Wd.sandB, O, T.obj);
    if (v.phase === 'turn' && hg.flip == null && f > 0.004 && !shadow) {
      const top = 0.038 + 0.15 * kb;
      M.set(L, 0, HC, 0, 0, 0, 0, 1, HC - top, 1);
      M.mul(O, m, L); D(Wd.stream, O, T.obj);
    }
    // deste ve atılan kartlar
    for (let j = 0; j < 10; j++) { M.set(m, DECK[0], TABLE_Y + 0.004 + j * 0.0045, DECK[1], 0.2 + (hs(j, 1) - 0.5) * 0.12); D(Wd.cardFlat, m, T.obj); }
    if (v.phase === 'turn' || v.phase === 'summary') {
      const dA = v.describer >= 0 ? this.avatarAt(v.describer) : null;
      const nDisc = (v.passCount || 0) + (v.tabooCount || 0), nWon = v.gotCount || 0;
      const flying = (kind, j) => this.fly.some((x) => x.kind === kind && x.j === j);
      for (let j = 0; j < Math.min(nDisc, 14); j++) { if (flying('disc', j)) continue; const P = this.pileAt(dA || { pos: [0, 0, 0], yaw: 0 }, 'disc', j); M.set(m, P.p[0], P.p[1], P.p[2], P.yaw); D(Wd.cardFlat, m, T.obj); }
      if (dA) for (let j = 0; j < Math.min(nWon, 16); j++) { if (flying('won', j)) continue; const P = this.pileAt(dA, 'won', j); M.set(m, P.p[0], P.p[1], P.p[2], P.yaw); D(Wd.cardFlat, m, T.obj); }
      // uçan kartlar
      this.fly.forEach((x) => {
        if (!dA) return;
        const u = clamp((t - x.t0) / 0.55, 0, 1), e = easeOut(u);
        const P = this.pileAt(dA, x.kind, Math.max(0, x.j));
        M.set(m, lerp(x.from[0], P.p[0], e), lerp(x.from[1], P.p[1], e) + Math.sin(u * Math.PI) * 0.25, lerp(x.from[2], P.p[2], e), P.yaw + (1 - e) * 4, 0, 0);
        D(Wd.cardFlat, m, T.obj);
      });
      // anlatıcının elindeki kart (kenar)
      if (v.phase === 'turn' && dA && hg.flip == null) { this.heldMat(mc, dA); D(Wd.card, mc, T.obj); }
    }
    // gözcünün kırmızı kartı
    if (v.phase === 'turn' && this.redT != null && t - this.redT < 1.6) {
      const a = this.avatarAt(this.redI);
      if (a && a.M && a.M.hd) D(Wd.red, a.M.hd[0], T.obj);
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
  drawShadowsExtra(m) {
    if (!this.res || !this.res.shadow) return;
    M.set(m, 0, TABLE_Y + 0.008, 0, 0, 0, 0, 0.26 * HS, 1, 0.26 * HS);
    drawMesh(this.X, this.res.shadow, m, ONE3, 0.5);
  }
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.cardF || !this.cardTex || !v || v.phase !== 'turn') return;
    const dA = v.describer >= 0 ? this.avatarAt(v.describer) : null;
    if (!dA || this.hgState().flip != null) return;
    const m = this.mats.c;
    this.heldMat(m, dA);
    gl.uniform1f(X.tex.u.uSelf, 0.25);
    gl.bindTexture(gl.TEXTURE_2D, this.cardTex);
    drawMesh(X, Wd.cardF, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const X = this.X, gl = X.gl, v = this.view, Wd = this.W;
    if (!v || !Wd || !Wd.glass) return;
    const t = this.time;
    const dA = v.describer >= 0 ? this.avatarAt(v.describer) : null;
    // sahne: anlatıcıya spot ışığı (Sessiz Sinema'da belirgin)
    if (dA && (v.phase === 'turn' || v.phase === 'ready')) {
      const k = this.kind === 'mime' ? 1 : 0.45;
      M.set(m, dA.pos[0], 0, dA.pos[2]);
      drawMesh(X, Wd.spot, m, ONE3, k * (v.phase === 'turn' ? 1 : 0.6) * (0.9 + 0.1 * Math.sin(t * 2.3)));
    }
    // son 10 saniye: kum saati kızarır
    const hg = this.hgState();
    if (v.phase === 'turn' && hg.flip == null) {
      const left = ((v.endsAt || 0) - this.sNow()) / 1000;
      const hot = left < 10 ? (0.5 + 0.5 * Math.sin(t * 9)) * (1 - left / 10) : 0;
      this.glow(m, [0, HY + HC * HS, 0], 0.45 * HS, hot ? RED3 : GOLD3, 0.1 + 0.25 * hot);
    }
    // kırmızı kartın parıltısı
    if (v.phase === 'turn' && this.redT != null && t - this.redT < 1.6) {
      const a = this.avatarAt(this.redI);
      if (a && a.hw) this.glow(m, a.hw[0], 0.35, RED3, 0.35 * (1 - (t - this.redT) / 1.6));
    }
    // cam (normal karışım, yarı saydam)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(X.un.u.uAdd, 0);
    this.hgMat(m, hg.flip != null ? easeOut(hg.flip) * Math.PI : 0);
    drawMesh(X, Wd.glass, m, ONE3, 1);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
  }

  /* ---------- arayüz ---------- */
  timer(left, total) {
    const k = clamp(left / Math.max(1, total), 0, 1);
    return `<div class="an-tm"><div class="bar"><i class="${left < 10500 ? 'hot' : ''}" style="transform:scaleX(${k.toFixed(3)})"></i></div><b>${secs(left)} sn</b></div>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const T2 = this.T2;
    const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const host = this.ctx.isHost;
    const D = v.describer;
    if (v.phase === 'ready') {
      if (v.isDescriber) {
        key = `ready|me|${v.game}|${v.turnNo}`;
        html = `<div class="an-box"><div class="an-h">${T2.role} Sıra sende!</div><div class="an-s">${T2.start}</div><button class="an-b big" data-act="an-begin">Başla ⏳</button><div class="an-s">Basmazsan birazdan kendiliğinden başlar.</div>${this.timer(left, v.readyMs || 25e3)}</div>`;
      } else {
        const off = !v.seats[D]?.on;
        key = `ready|o|${v.game}|${v.turnNo}|${v.isWatcher}|${host}|${off}`;
        const head = v.isWatcher ? '🛡️ Gözcü sensin!' : v.bot ? `🤖 ${nm(D)} ${T2.will}` : `👀 ${nm(D)} ${T2.will}`;
        const sub = v.isWatcher ? `${nm(D)} ${T2.doing === 'anlatıyor' ? 'anlatırken yasak kelimeyi duyarsan' : 'canlandırırken konuşursa ya da ses çıkarırsa'} kırmızı düğmeye bas.` : v.bot ? 'Bot ipucu verecek: ipuçlarını izle, tahminini yaz!' : 'Bildiğin anda sesli söyle! Doğru bilen de puan alır.';
        html = `<div class="an-box dark"><div class="an-h">${head}</div><div class="an-s">${sub}</div>${host ? `<div class="an-row">${off ? '<button class="an-b ghost" data-act="an-begin">Onun yerine başlat</button>' : ''}<button class="an-b ghost" data-act="an-skip">Bu turu atla</button></div>` : ''}${this.timer(left, v.readyMs || 25e3)}</div>`;
      }
    } else if (v.phase === 'turn') {
      const tm = this.timer(left, v.turnMs || 6e4);
      if (v.isDescriber && v.card) {
        const g = v.guessers || [];
        const cols = g.length <= 4 ? 2 : g.length <= 9 ? 3 : 4;
        const btns = g.map((i) => { const p = v.seats[i]; return p ? `<button class="an-g" data-act="an-got" data-id="${esc(p.id)}" style="--pc:${pcol(p.c)}"><i></i><span>${esc(nm0(p.n))}</span></button>` : ''; }).join('');
        key = `turn|d|${v.game}|${v.turnNo}|${v.cardSeq}|${g.join(',')}`;
        html = `<div class="an-box"><div class="an-card"><small>${this.kind === 'mime' ? `🎬 CANLANDIR${v.card.hint ? ' · ' + esc(v.card.hint).toLocaleUpperCase('tr') : ''}` : '🗣️ ANLAT'}</small><b>${esc(v.card.word)}</b>${(v.card.taboo || []).length ? `<div class="an-tab"><small>🚫 YASAK KELİMELER</small><div>${v.card.taboo.map(esc).join(' · ')}</div></div>` : ''}</div>
          <div class="an-lbl">✓ Kim bildi? İsmine dokun</div><div class="an-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${btns}</div>
          <div class="an-row"><button class="an-b alt" data-act="an-pass">Pas ⏭</button><span class="an-s" style="margin:0">${v.watcher >= 0 ? `🛡️ Gözcü: ${nm(v.watcher)}` : ''}</span></div>${tm}</div>`;
      } else if (v.isWatcher && v.card) {
        key = `turn|w|${v.game}|${v.turnNo}|${v.cardSeq}`;
        html = `<div class="an-box"><div class="an-card"><small>🛡️ GÖZCÜSÜN · ${nm(D)} ${T2.doing}</small><b>${esc(v.card.word)}</b>${(v.card.taboo || []).length ? `<div class="an-tab"><small>🚫 YASAK KELİMELER</small><div>${v.card.taboo.map(esc).join(' · ')}</div></div>` : ''}</div>
          <button class="an-foul" data-act="an-foul">${T2.foul}</button><div class="an-s">${T2.foulNote} ${nm(D)} -1 puan alır, yeni kart gelir.</div>${tm}</div>`;
      } else if (v.bot && v.clues && v.canGuess) {
        // bot anlatıyor: ipuçları + yazılı tahmin (giriş kutusu kart değişene kadar yerinde kalır)
        key = `turn|g|${v.game}|${v.turnNo}|${v.cardSeq}`;
        html = `<div class="an-box"><div class="an-h">🤖 ${nm(D)} ${T2.doing}</div><div class="an-clue">${this.clueHTML(v)}</div>
          <form class="an-form" data-form="an-guess" autocomplete="off"><input name="g" maxlength="32" placeholder="Tahminini yaz…" enterkeyhint="send" autocapitalize="off" spellcheck="false"><button type="submit">Tahmin</button></form>
          <div class="an-feed">${this.feedHTML(v)}</div>${tm}</div>`;
      } else {
        key = `turn|o|${v.game}|${v.turnNo}|${v.gotCount}|${host}`;
        html = `<div class="an-box dark"><div class="an-h">👂 ${nm(D)} ${T2.doing}</div><div class="an-s">Bildiğin anda sesli söyle! Doğru bileni ${nm(D)} işaretler.</div><div class="an-big">✓ ${v.gotCount}</div>${host ? '<div class="an-row"><button class="an-b ghost" data-act="an-stop">Turu bitir</button></div>' : ''}${tm}</div>`;
      }
    } else if (v.phase === 'summary') {
      const R = { got: ['✓', ''], pass: ['⏭', 'Pas'], taboo: ['🚫', 'Yasak'], time: ['⏰', 'Süre'] };
      const log = (v.log || []).map((l) => `<div class="${l.r}"><span>${R[l.r]?.[0] || ''} ${esc(l.word)}</span><em>${l.r === 'got' ? `bilen: ${nm(l.g)}` : R[l.r]?.[1] || ''}</em></div>`).join('');
      const can = (v.isDescriber || host) && now - (v.at || 0) >= 1500;
      const last = v.turnNo >= v.turnCount;
      key = `sum|${v.game}|${v.turnNo}|${can}`;
      html = `<div class="an-box"><div class="an-h">⏰ Süre doldu! ${v.isDescriber ? 'Bu turda' : nm(D)} ${v.gotCount} kelime ${T2.did}.</div>${log ? `<div class="an-log">${log}</div>` : ''}
        ${can ? `<div class="an-row"><button class="an-b" data-act="an-next">${last ? 'Sonuçları gör 🏆' : 'Sıradaki oyuncu ▶'}</button></div>` : `<div class="an-s">${last ? 'Son turdu, sonuçlar geliyor…' : 'Sıradaki oyuncu birazdan…'}</div>`}${this.timer(left, v.summaryMs || 9e3)}</div>`;
    }
    if (this.setBar(key, html)) this.myGuess = null;
  }
  clueHTML(v) {
    const c = v.clues || {};
    let h = '';
    if (c.hint) h += `<span class="hint">${this.kind === 'mime' ? '🎬 ' : ''}${esc(c.hint)}</span>`;
    if ((c.words || []).length) h += `<div class="ws">${c.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>`;
    if (c.mask) h += `<div class="mk">${esc(c.mask)}</div>`;
    if (!c.n && !(c.words || []).length && !c.mask) h += '<div class="wait">İlk ipucu geliyor…</div>';
    else if (c.n >= c.max) h += '<div class="wait">Bütün ipuçları geldi!</div>';
    return h;
  }
  feedHTML(v) {
    const mine = this.myGuess && this.time - this.myGuess.t < 3 ? `✗ “${esc(this.myGuess.text)}” değil · ` : '';
    const L = (v.feed || []).slice(-3).map((f) => `${esc(nm0(v.seats[f.i]?.n || ''))}: ${esc(f.text)}?`).join(' · ');
    return mine + L;
  }
  modeSeg(v) {
    return `<div class="an-seg" role="group" aria-label="Tur sayısı"><button data-act="an-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">⚡ Herkes 1 kez</button><button data-act="an-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🎉 Herkes 2 kez</button></div>`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    const T2 = this.T2;
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      const ru = this.kind === 'mime'
        ? '<div style="background:#fff4c2"><b>🎬</b>Canlandır</div><div style="background:#ffe1d6"><b>🤐</b>Konuşmak yasak</div><div style="background:#d6f5e0"><b>✓</b>Bilen de +1</div>'
        : '<div style="background:#d6f5e0"><b>🗣️</b>Anlat</div><div style="background:#ffe1d6"><b>🚫</b>Yasak kelime -1</div><div style="background:#dbe8ff"><b>✓</b>Bilen de +1</div>';
      html = `<div class="card an-intro">
        <div class="tt">${T2.icon} ${T2.name}</div>
        <div class="sub">${this.kind === 'mime' ? 'Hiç konuşmadan canlandır: film, dizi, hareket, meslek. Masa tahmin etsin.' : 'Yasak kelimeleri söylemeden anlat, masadakiler bilsin.'}</div>
        <div class="an-ru">${ru}</div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="an-start" ${n < 3 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 3 ? 'En az 3 kişi lazım: masadakileri çağır!' : `Sırayla herkes ${this.kind === 'mime' ? 'canlandırır' : 'anlatır'}; kum saati bitmeden olabildiğince çok kart bildir. Gözcü kuralı bozanı yakalar.`}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= 2400) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const champ = v.champ || [];
      const rows = v.seats.map((p, i) => ({ p, i, st: (v.stats || [])[i] || {} })).sort((x, y) => y.p.sc - x.p.sc)
        .map(({ p, i, st }, k) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(p.c)}"><i></i><span>${champ.includes(i) ? '🏆 ' : `${k + 1}. `}${esc(nm0(p.n))}</span><em>${T2.role}${st.got || 0} 🎯${st.guessed || 0}${st.taboo ? ` 🚫${st.taboo}` : ''}</em><b>${p.sc} puan</b></div>`).join('');
      const mine = champ.includes(v.me);
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">${mine ? '🏆 Kazandın!' : champ.length ? `🏆 ${champ.map((i) => esc(nm0(v.seats[i]?.n || ''))).join(' & ')} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">${T2.role} ${this.kind === 'mime' ? 'canlandırıp bildirdiği' : 'anlatıp bildirdiği'} · 🎯 bildiği · 🚫 ihlal</div>
        <div class="an-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="an-start" ${wait ? 'disabled' : ''}>🔁 Yeniden oyna</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const TOP = { ready: `${v.turnNo}/${v.turnCount}. tur · ${this.T2.role} ${esc(nm0(v.seats?.[v.describer]?.n || ''))}`, turn: `${v.turnNo}/${v.turnCount}. tur · ✓ ${v.gotCount ?? 0} · ⏳ ${secs(left)}`, summary: `${v.turnNo}/${v.turnCount}. tur bitti` };
    this.top(TOP[v.phase] || '');
    // süre çubuğu ve saniye
    const tm = this.el.bar.querySelector('.an-tm');
    if (tm) {
      const tot = v.phase === 'ready' ? v.readyMs || 25e3 : v.phase === 'turn' ? v.turnMs || 6e4 : v.phase === 'summary' ? v.summaryMs || 9e3 : 1;
      const i = tm.querySelector('i'), b = tm.querySelector('b');
      if (i) { i.style.transform = `scaleX(${clamp(left / tot, 0, 1).toFixed(3)})`; i.classList.toggle('hot', v.phase === 'turn' && left < 10500); }
      if (b) b.textContent = `${secs(left)} sn`;
    }
    // bot turunda ipuçları ve tahmin akışı (giriş kutusuna dokunmadan)
    const cl = this.el.bar.querySelector('.an-clue');
    if (cl) { const h = this.clueHTML(v); if (cl.dataset.h !== h) { cl.dataset.h = h; cl.innerHTML = h; } }
    const fd = this.el.bar.querySelector('.an-feed');
    if (fd) { const h = this.feedHTML(v); if (fd.dataset.h !== h) { fd.dataset.h = h; fd.innerHTML = h; } }
    // alt çubuğun yüksekliği: masa onun üstüne sığsın
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const act = ['ready', 'turn', 'summary'].includes(v.phase);
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (act && i === v.describer) x += `<span>${this.T2.role}</span>`;
      if (act && i === v.watcher) x += '<span>🛡️</span>';
      if (p.sc) x += `<span class="an-p${p.sc < 0 ? ' neg' : ''}">${p.sc}</span>`;
      if (o.anK !== x) {
        o.anK = x;
        let el = o.lbl.querySelector('.an-x');
        if (!el) { el = document.createElement('span'); el.className = 'an-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
      o.lbl.classList.toggle('an-on', act && i === v.describer);
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.an-x')) o.anK = '';
  }

  /* ---------- 2D yedek ---------- */
  draw2dGame(g, w, h, r) {
    const v = this.view;
    if (!v) return;
    const cx = w / 2, cy = h * 0.46;
    // kum saati
    const hg = this.hgState(), f = hg.flip != null ? 0 : hg.f;
    g.save(); g.translate(cx, cy);
    if (hg.flip != null) g.rotate(easeOut(hg.flip) * Math.PI);
    g.fillStyle = '#8a5a34'; g.fillRect(-22, -34, 44, 6); g.fillRect(-22, 28, 44, 6);
    g.strokeStyle = 'rgba(200,230,255,.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-16, -28); g.lineTo(16, -28); g.lineTo(2, 0); g.lineTo(16, 28); g.lineTo(-16, 28); g.lineTo(-2, 0); g.closePath(); g.stroke();
    g.fillStyle = '#e8be6c';
    const ht = 24 * f, hb = 24 * (1 - f);
    if (ht > 0.5) { g.beginPath(); g.moveTo(-2 - 14 * (ht / 24), -ht); g.lineTo(2 + 14 * (ht / 24), -ht); g.lineTo(2, 0); g.lineTo(-2, 0); g.closePath(); g.fill(); }
    g.beginPath(); g.moveTo(-15, 28); g.lineTo(15, 28); g.lineTo(0, 28 - hb); g.closePath(); g.fill();
    g.restore();
    if (v.describer >= 0 && ['ready', 'turn', 'summary'].includes(v.phase)) {
      const [x, y] = this.flatPos(v.describer);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 29, 0, TAU); g.stroke();
      if (v.phase === 'turn') { g.font = '900 15px system-ui'; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.fillText(`✓ ${v.gotCount}`, cx, cy + 52); }
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    const kind = ctx.view?.kind === 'mime' ? 'mime' : 'talk';
    if (G && !G.dead && G.kind !== kind) { G.dispose(); G = null; }
    if (!G || G.dead) G = new DescGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[anb]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
