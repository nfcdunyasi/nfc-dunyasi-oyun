// Pizza Kulesi — 3D pizza istifleme yarışı (NFC Dünyası Oyun)
// Kurye Yarışı'nın küçük WebGL motorunu yeniden kullanır. Kule telefonda simüle edilir (herkes aynı tohumla aynı hızları görür);
// sunucu her katı sayar ve sıralamayı tutar.
import { _eng } from './kuryeYarisi.js?v=2026-11-21-a';
const { ctx2d, podiumHTML, EmoteUI, aoOn, detailOn, postFX, shadowBegin, shadowCast, shadowEnd, emitSoft, autoRes, sfx, clamp, lerp, damp, esc, hexRGB, C, shade, M, makeGL, MB, freeMesh, drawMesh, drawDynamic, drawSky, useProg, TOD, norm3, brandInfo, Res, Snd, pcol, vibrate, medal, ONE3, injectStyle, makeTexture, updateTexture } = _eng();

/* ============================ kurallar ============================ */
const PZ = (() => {
  const R = 1.55;            // kayma yarıçapı
  const BASE = 1.0;          // ilk kat boyu
  const LH = 0.24;           // kat yüksekliği
  const PERF = 0.07;         // mükemmel toleransı
  const MINW = 0.05;
  const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const speedOf = (k) => Math.min(3.3, 1.45 + 0.085 * k);
  const mover = (seed, k) => ({ k, axis: k % 2 ? 'x' : 'z', phase: rng(seed * 31 + k * 977)() * 4 * R, speed: speedOf(k), t: 0 });
  const posOf = (c) => { const P4 = 4 * R; const u = (((c.phase + c.speed * c.t) % P4) + P4) % P4; return u < 2 * R ? u - R : 3 * R - u; };
  // Bir kat bırak: { kind: 'perfect' | 'cut' | 'miss', layer, piece }
  function place(top, c, pos, combo) {
    const ax = c.axis;
    const tc = ax === 'x' ? top.x : top.z;
    const tw = ax === 'x' ? top.w : top.d;
    const delta = pos - tc;
    const mk = (cen, w) => (ax === 'x' ? { x: cen, z: top.z, w, d: top.d } : { x: top.x, z: cen, w: top.w, d: w });
    // ilk kat geniş tahtaya bırakılır: nereye düşerse orada tam boyuyla durur, hiç kesilmez
    if (top.base) return { kind: 'land', layer: mk(pos, tw), piece: null };
    if (Math.abs(delta) < PERF) {
      let w = tw;
      if (combo + 1 >= 4) w = Math.min(BASE, tw + 0.07);
      const L = mk(tc, w);
      return { kind: 'perfect', layer: L, piece: null };
    }
    const ov = tw - Math.abs(delta);
    if (ov <= MINW) {
      return { kind: 'miss', layer: null, piece: mk(pos, tw) };
    }
    const sg = delta > 0 ? 1 : -1;
    return { kind: 'cut', layer: mk((tc + pos) / 2, ov), piece: mk((tc + pos) / 2 + sg * tw / 2, Math.abs(delta)) };
  }
  return { R, BASE, LH, PERF, rng, speedOf, mover, posOf, place };
})();

/* ============================ ses ============================ */
const mtofP = (m) => 440 * 2 ** ((m - 69) / 12);

class PizzaSnd extends Snd {
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'drop': this.tone(190, t, 0.12, 'sine', 0.42, 90, 0.002, a); this.noise(t, 0.06, 0.2, { type: 'bandpass', freq: 700, q: 1 }, a); break;
      case 'perfect': {
        const sc = [69, 71, 72, 74, 76, 77, 80, 81, 83, 84, 86, 88];
        const m = sc[clamp(a | 0, 0, sc.length - 1)];
        this.tone(190, t, 0.1, 'sine', 0.3, 100, 0.002);
        this.tone(mtofP(m), t, 0.22, 'triangle', 0.26, null, 0.004);
        this.tone(mtofP(m + 7), t + 0.06, 0.3, 'sine', 0.18, null, 0.004);
        this.tone(mtofP(m + 12), t + 0.12, 0.4, 'sine', 0.12, null, 0.004);
        break;
      }
      case 'cut': this.tone(200, t, 0.1, 'sine', 0.36, 100, 0.002); this.noise(t, 0.2, 0.22, { type: 'bandpass', freq: 2200, to: 500, q: 1.2, attack: 0.01 }); break;
      case 'fall': this.noise(t, 0.5, 0.24, { type: 'bandpass', freq: 1800, to: 240, q: 0.9 }); this.tone(400, t, 0.5, 'triangle', 0.14, 90); break;
      case 'out':
        this.duck(0.4, 1.4);
        [392, 370, 349, 330].forEach((f, i) => this.tone(f, t + i * 0.2, 0.34, 'sawtooth', 0.11, f * 0.93));
        break;
      case 'tick': this.tone(1500, t, 0.03, 'square', 0.04); break;
      case 'lose':
        this.duck(0.5, 1.2);
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, t + i * 0.16, 0.24, 'sawtooth', 0.1, f * 0.94));
        break;
      default: super._fx(name, a);
    }
  }
  steps() { return 12; }
  tempo() { return this.mode === 'race' ? 124 + 18 * (this.int || 0) : this.mode === 'idle' ? 100 : 84; }
  // Pizza Kulesi: 12/8 tarantella (La m – Re m – Mi7 – La m): "bum-çık-çık" tuba ve mandolin, tef, akordeon ezgisi;
  // kule yükseldikçe tempo hızlanır, ezgi bir oktav yükselir
  beat(t, s, bar, spb, st = spb / 3) {
    const CH = [[45, [57, 60, 64]], [50, [57, 62, 65]], [40, [56, 59, 62, 64]], [45, [57, 60, 64]]];
    const [root, ch] = CH[bar % 4];
    const MEL = [
      [76, 76, 76, 72, 74, 76, 77, 76, 74, 72, 71, 69],
      [74, 74, 74, 77, 76, 74, 81, 79, 77, 76, 74, 72],
      [71, 71, 71, 68, 69, 71, 74, 72, 71, 68, 71, 76],
      [72, 71, 69, 76, 74, 72, 71, 72, 71, 69, null, null],
    ];
    const I = this.int || 0;
    const on = s % 3 === 0;
    if (this.mode === 'race') {
      if (s === 0 || s === 6) this.iBass(t, root, spb * 0.8, 0.16, 'tuba');
      if (s === 3 || s === 9) this.iBass(t, root + 7, spb * 0.6, 0.11, 'tuba');
      if (!on) ch.forEach((m) => this.iPizz(t, m, 0.02, 0.12, 0.05));
      this.iTamb(t, on ? 0.05 : 0.026);
      if (s === 0 && bar % 2 === 0) this.iKick(t, 0.17, 110, 50, 0.15);
      if (bar % 8 >= 1) { const n = MEL[bar % 4][s]; if (n) this.iAcc(t, n + (I > 0.65 ? 12 : 0), st * 0.9, 0.026, 0.12); }
      if (bar % 8 === 0 && on) this.iMand(t, ch[2] + 12, spb * 0.9, 0.024);
    } else if (this.mode === 'idle') {
      if (s === 0 || s === 6) this.iBass(t, root, spb * 1.2, 0.11, 'tuba');
      if (on) this.iMand(t, ch[(s / 3) % ch.length] + 12, spb * 0.85, 0.02);
      if (s % 3 === 1) this.iTamb(t, 0.018);
    } else {
      if (s === 0) { ch.forEach((m) => this.iAcc(t, m + 12, spb * 3, 0.011, 0.25)); this.iBass(t, root, spb * 2, 0.09, 'tuba'); }
      if (on) this.iPizz(t, ch[(s / 3) % ch.length] + 12, 0.034, 0.3, 0.25);
    }
  }
}

/* ============================ arayüz stili ============================ */
const STYLE2 = `
#ky.pz{touch-action:none;user-select:none;-webkit-user-select:none}
#ky .pz-h{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 52px);text-align:center;pointer-events:none;z-index:3;text-shadow:0 3px 0 rgba(0,0,0,.4)}
#ky .pz-h b{display:block;font-size:64px;line-height:1;font-weight:900;font-variant-numeric:tabular-nums;transition:transform .12s}
#ky .pz-h b.pop{transform:scale(1.25)}
#ky .pz-h small{display:block;font-size:12px;font-weight:800;letter-spacing:.14em;opacity:.85;margin-top:2px}
#ky .pz-cb{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 158px);font-weight:900;font-size:16px;color:#ffe27a;text-shadow:0 2px 0 rgba(0,0,0,.45);pointer-events:none;z-index:3;white-space:nowrap;opacity:0;transition:opacity .2s}
#ky .pz-cb.on{opacity:1}
#ky .pz-lb{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);top:calc(env(safe-area-inset-top,0px) + 56px);display:grid;gap:3px;pointer-events:none;z-index:3;max-width:44%}
#ky .pz-lb div{display:flex;align-items:center;gap:5px;font-weight:800;font-size:12px;background:rgba(12,10,26,.58);border-radius:9px;padding:2px 7px 2px 5px;width:max-content;max-width:100%}
#ky .pz-lb div.me{background:rgba(255,210,63,.35);outline:2px solid rgba(255,210,63,.75)}
#ky .pz-lb div.out{opacity:.55}
#ky .pz-lb i{width:9px;height:9px;border-radius:99px;flex:none}
#ky .pz-lb em{font-style:normal;opacity:.75;width:14px;text-align:right;flex:none}
#ky .pz-lb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:84px}
#ky .pz-lb b{margin-left:4px;font-variant-numeric:tabular-nums}
#ky .pz-tap{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 34px);width:112px;height:112px;border-radius:99px;border:4px solid rgba(255,255,255,.65);background:radial-gradient(circle,rgba(255,210,63,.55),rgba(228,87,46,.55));color:#fff;font-weight:900;font-size:17px;letter-spacing:.06em;display:grid;place-items:center;align-content:center;line-height:1;box-shadow:0 0 0 5px rgba(255,210,63,.25),0 0 24px rgba(255,160,50,.6);transition:opacity .3s,transform .08s;z-index:4;-webkit-tap-highlight-color:transparent;padding:0}
#ky .pz-tap span{display:block;font-size:38px;margin-bottom:4px}
#ky .pz-tap.off{opacity:0!important;pointer-events:none}
#ky.pz .note{top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 22px)!important}
#ky .pz-tap.on{transform:translateX(-50%) scale(.9)}
#ky .pz-tap.min{opacity:.5;width:84px;height:84px;font-size:13px}
#ky .pz-tap.min span{font-size:28px}
#ky .pz-menu{display:grid;gap:4px;margin:8px 0;text-align:left}
#ky .pz-menu div{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.12);border-radius:10px;padding:4px 9px;font-size:13px;font-weight:700}
#ky .pz-menu b{font-size:22px;line-height:1}
@media (max-width:360px){#ky .pz-lb span{max-width:56px}#ky .pz-lb div{font-size:11px}#ky .pz-h b{font-size:54px}}
@media (orientation:landscape) and (max-height:520px){
#ky .pz-h{top:calc(env(safe-area-inset-top,0px) + 44px)}
#ky .pz-h b{font-size:48px}
#ky .pz-cb{bottom:calc(env(safe-area-inset-bottom,0px) + 112px)}
#ky .pz-lb{top:calc(env(safe-area-inset-top,0px) + 50px)}
#ky .pz-tap{width:92px;height:92px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);left:auto;right:calc(env(safe-area-inset-right,0px) + 24px);transform:none}
#ky .pz-tap.on{transform:scale(.9)}
}
`;
function injectStyle2() {
  if (document.getElementById('pz-style')) return;
  const st = document.createElement('style');
  st.id = 'pz-style';
  st.textContent = STYLE2;
  document.head.appendChild(st);
}

/* ============================ pizza modelleri ============================ */
// Katman kalınlıkları: hamur 0–0.15, sos 0.15–0.17, peynir 0.17–0.20, fırın kenarı (kabuk) tepesi 0.236
const PH = { DOUGH: 0.15, SAUCE: 0.17, CHEESE: 0.2 };
const hash2 = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const PC = {
  bottom: hexRGB('#7c4219'), side: hexRGB('#c27831'), side2: hexRGB('#d8913f'), rim: hexRGB('#dfa04f'), char: hexRGB('#6b3712'), inner: hexRGB('#d9963f'),
  crumb: hexRGB('#efd39c'), pore: hexRGB('#c9a061'), sauce: hexRGB('#b8331b'), cheese: hexRGB('#f2d27c'), cheeseL: hexRGB('#fae7ae'), browned: hexRGB('#cf9142'),
};
// Fırın kenarı kesiti [o, y]: o = kenar çizgisinden dışa kayma (eksi = içeri). İnce dilimlerde o küçülür.
const CRUST = [[-0.035, 0], [-0.012, 0.004], [-0.002, 0.02], [0, 0.045], [0, 0.13], [-0.004, 0.17], [-0.016, 0.205], [-0.034, 0.228], [-0.056, 0.236], [-0.078, 0.229], [-0.094, 0.213], [-0.104, 0.2]];
const CRUST_N = CRUST.map((p, i) => {
  const a = CRUST[Math.max(0, i - 1)], b = CRUST[Math.min(CRUST.length - 1, i + 1)];
  const dr = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dr, dy) || 1;
  return [dy / l, -dr / l];
});
const crustCol = (k, u, v) => {
  let c;
  if (k <= 2) c = mix3(PC.bottom, PC.side, k / 3);
  else if (k <= 5) c = mix3(PC.side, PC.side2, (k - 3) / 3);
  else if (k <= 9) c = PC.rim;
  else c = mix3(PC.rim, PC.inner, (k - 9) / 2);
  const n = vnoise(u * 9 + k * 0.7, v * 9);
  const g = 0.9 + 0.2 * vnoise(u * 23 + 3, v * 23 - k);
  if (k >= 5 && k <= 9) c = mix3(c, PC.char, sstep(0.68, 0.9, n) * 0.85);
  return [c[0] * g, c[1] * g, c[2] * g, k >= 6 && k <= 9 ? -0.18 : 0];
};
const cheeseBump = (x, z) => 0.004 * vnoise(x * 6.5, z * 6.5) + 0.007 * sstep(0.62, 0.9, vnoise(x * 19 + 7, z * 19 - 3));
const cheeseCol = (x, z) => {
  const n1 = vnoise(x * 4.2 + 11, z * 4.2 + 5), n2 = vnoise(x * 19 + 7, z * 19 - 3), n3 = vnoise(x * 37, z * 37);
  let c = mix3(PC.cheese, PC.cheeseL, n2 * 0.8);
  c = mix3(c, PC.sauce, sstep(0.36, 0.18, n1) * 0.9);
  c = mix3(c, PC.browned, sstep(0.78, 0.95, n2) * 0.85);
  const g = 0.94 + 0.1 * n3;
  return [c[0] * g, c[1] * g, c[2] * g, -0.3];
};

// Malzemeler (dilimin yerel koordinatında). Kenarlardan 0.1 içeride, birbirine değmeden yerleşir.
function genToppings(w, d, seed) {
  const R = PZ.rng(seed);
  const area = w * d;
  const want = [['sucuk', Math.round(6 * area), 0.055], ['olive', Math.round(4 * area), 0.03], ['pepper', Math.round(2.5 * area), 0.045], ['mush', Math.round(2.5 * area), 0.045], ['corn', Math.round(6 * area), 0.016], ['basil', R() < 0.6 ? 1 : 0, 0.05]];
  const out = [];
  let id = 0;
  for (const [k, n, r0] of want) {
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 14; tries++) {
        const r = k === 'sucuk' ? r0 * (0.85 + R() * 0.3) : r0;
        const sx = w - 0.22 - 2 * r, sz = d - 0.22 - 2 * r;
        if (sx <= 0 || sz <= 0) break;
        const x = (R() - 0.5) * sx, z = (R() - 0.5) * sz;
        if (out.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r + 0.006)) { out.push({ k, x, z, r, a: R() * 6.283, id: id++, c: R() < 0.5 }); break; }
      }
    }
  }
  return out;
}
function toppingModel(mb, t, H) {
  const y = H(t.x, t.z);
  if (t.k === 'sucuk') {
    const r = t.r;
    const base = t.c ? hexRGB('#9e2116') : hexRGB('#b0291b');
    const edge = mix3(base, hexRGB('#5e140c'), 0.55);
    mb.push().T(t.x, y - 0.002, t.z, t.a, 0, 0);
    mb.lathe(0, 0, 0, [[r * 0.95, 0], [r * 1.01, 0.005], [r, 0.0115], [r * 0.86, 0.0135], [r * 0.55, 0.0125], [0, 0.012]], 11, (i, a) => {
      const sp = i > 2 && hash2(Math.floor(a * 2.2) + t.id * 7, i * 3 + t.id) > 0.78;
      const c = i <= 2 ? edge : sp ? hexRGB('#d98a70') : base;
      return [c[0], c[1], c[2], -0.42];
    });
    mb.pop();
  } else if (t.k === 'olive') {
    mb.torusN(t.x, y + 0.006, t.z, 0.021, 0.0085, 0.0065, 10, 5, C('#1d1817', -0.75));
  } else if (t.k === 'pepper') {
    mb.push().T(t.x, y + 0.004, t.z, t.a, 0, 0, 1.25, 1, 0.85);
    mb.torusN(0, 0, 0, 0.034, 0.0045, 0.0055, 14, 4, C('#3c9a33', -0.6));
    mb.pop();
  } else if (t.k === 'corn') {
    mb.sphereS(t.x, y + 0.006, t.z, 0.014, 0.01, 0.012, C('#f2c12e', -0.5), 7, 4);
  } else if (t.k === 'mush') {
    mb.push().T(t.x, y + 0.001, t.z, t.a, 0, 0);
    const pts = [];
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); pts.push([Math.cos(a) * 0.042, -0.006 - Math.sin(a) * 0.034]); }
    pts.push([-0.013, 0], [-0.013, 0.03], [0.013, 0.03], [0.013, 0]);
    const top = [0.91, 0.86, 0.76, -0.25], rim = [0.62, 0.48, 0.32, -0.25];
    const UP = [0, 1, 0];
    const cy = 0.0075;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      mb.triN([0, cy, -0.004], [a[0], cy, a[1]], [b[0], cy, b[1]], UP, UP, UP, top, rim, rim);
      const nx = b[1] - a[1], nz = -(b[0] - a[0]);
      const l = Math.hypot(nx, nz) || 1;
      const N = [nx / l, 0, nz / l];
      mb.quadN([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], cy, b[1]], [a[0], cy, a[1]], N, N, N, N, rim);
    }
    mb.pop();
  } else if (t.k === 'basil') {
    mb.push().T(t.x, y + 0.002, t.z, t.a, 0, 0);
    const L = 0.06, n = 7;
    const edgeC = [0.18, 0.47, 0.19, -0.35], midC = [0.31, 0.62, 0.29, -0.35];
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n, u1 = -1 + (2 * (i + 1)) / n;
      const w0 = 0.024 * Math.pow(Math.max(0, 1 - u0 * u0), 0.7), w1 = 0.024 * Math.pow(Math.max(0, 1 - u1 * u1), 0.7);
      const x0 = u0 * L * 0.5, x1 = u1 * L * 0.5;
      const UP = [0, 1, 0];
      for (const s of [-1, 1]) {
        mb.quadN([x0, 0.004, 0], [x1, 0.004, 0], [x1, 0.0015, s * w1], [x0, 0.0015, s * w0], [0, 1, -s * 0.2], [0, 1, -s * 0.2], UP, UP, midC, midC, edgeC, edgeC);
      }
    }
    mb.pop();
  }
}
// Kesilen dilimde malzemeleri bıçak çizgisinden kes (üçgen kırpma): yarım sucuklar gerçek gibi kalır
function clipTris(src, dst, x0, x1, z0, z1) {
  const S = 10;
  const planes = [[0, 1, x0], [0, -1, x1], [2, 1, z0], [2, -1, z1]];
  for (let i = 0; i + 3 * S <= src.length; i += 3 * S) {
    let poly = [src.slice(i, i + S), src.slice(i + S, i + 2 * S), src.slice(i + 2 * S, i + 3 * S)];
    if (poly.every((v) => v[0] >= x0 && v[0] <= x1 && v[2] >= z0 && v[2] <= z1)) { for (const v of poly) for (let k = 0; k < S; k++) dst.push(v[k]); continue; }
    for (const [ax, sg, val] of planes) {
      const out = [];
      for (let j = 0; j < poly.length; j++) {
        const a = poly[j], b = poly[(j + 1) % poly.length];
        const da = sg * (a[ax] - val), db = sg * (b[ax] - val);
        if (da >= 0) out.push(a);
        if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push(a.map((x, k) => x + (b[k] - x) * t)); }
      }
      poly = out;
      if (poly.length < 3) break;
    }
    if (poly.length < 3) continue;
    for (let j = 1; j < poly.length - 1; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) for (let k = 0; k < S; k++) dst.push(v[k]);
  }
}

// Dikdörtgen pizza dilimi (al taglio). Yerel: merkez (0,0), taban y=0.
// e = { xn, xp, zn, zp }: true = fırın kenarı, false = bıçak kesiği. po = desen kayması (kesilince desen yerinde kalsın).
// tops: dilimin bağlı olduğu kayan katın malzemeleri (onun yerel koordinatında) -> po ile bu dilime taşınır ve kırpılır.
function slabModel(mb, w, d, e, po, tops, opt = {}) {
  const hw = w / 2, hd = d / 2;
  const s = clamp(Math.min(w, d) / 0.45, 0.12, 1);
  const rc = 0.11 * s;
  const px = po[0], pz = po[1];
  const ins = (c) => (c ? 0.104 * s : 0);
  const iXn = ins(e.xn), iXp = ins(e.xp), iZn = ins(e.zn), iZp = ins(e.zp);
  const H = (x, z) => {
    const dx = Math.min(e.xn ? x - (-hw + iXn) : 1, e.xp ? (hw - iXp) - x : 1);
    const dz = Math.min(e.zn ? z - (-hd + iZn) : 1, e.zp ? (hd - iZp) - z : 1);
    return PH.CHEESE + cheeseBump(x + px, z + pz) * sstep(0, 0.05, Math.min(dx, dz));
  };
  const UP = [0, 1, 0], DN = [0, -1, 0];
  const step = opt.lite ? 0.12 : 0.07;
  // üst yüzey: eriyen peynir, sos, kızarmış kabarcıklar
  const x0 = -hw + iXn, x1 = hw - iXp, z0 = -hd + iZn, z1 = hd - iZp;
  if (x1 - x0 > 0.002 && z1 - z0 > 0.002) {
    mb.gridN(x0, z0, x1, z1, clamp(Math.ceil((x1 - x0) / step), 1, 20), clamp(Math.ceil((z1 - z0) / step), 1, 20), H, (x, z) => cheeseCol(x + px, z + pz));
  }
  // taban
  const bi = (c) => (c ? 0.035 * s : 0);
  const bc = [...PC.bottom, 0];
  mb.quadN([-hw + bi(e.xn), 0, -hd + bi(e.zn)], [hw - bi(e.xp), 0, -hd + bi(e.zn)], [hw - bi(e.xp), 0, hd - bi(e.zp)], [-hw + bi(e.xn), 0, hd - bi(e.zp)], DN, DN, DN, DN, bc);
  // kenarlar (saat yönünün tersine)
  const E = [
    { k: 'zn', A: [-hw, -hd], B: [hw, -hd], n: [0, -1] },
    { k: 'xp', A: [hw, -hd], B: [hw, hd], n: [1, 0] },
    { k: 'zp', A: [hw, hd], B: [-hw, hd], n: [0, 1] },
    { k: 'xn', A: [-hw, hd], B: [-hw, -hd], n: [-1, 0] },
  ];
  const round = (i) => e[E[i].k] && e[E[(i + 1) % 4].k];
  const NK = CRUST.length;
  const sweepPt = (P, n, k) => [P[0] + n[0] * CRUST[k][0] * s, CRUST[k][1], P[1] + n[1] * CRUST[k][0] * s];
  const sweepN = (n, k) => [n[0] * CRUST_N[k][0], CRUST_N[k][1], n[1] * CRUST_N[k][0]];
  const cstep = opt.lite ? 0.16 : 0.1;
  E.forEach((ed, i) => {
    const len = Math.hypot(ed.B[0] - ed.A[0], ed.B[1] - ed.A[1]);
    const t = [(ed.B[0] - ed.A[0]) / len, (ed.B[1] - ed.A[1]) / len];
    const prevCrust = e[E[(i + 3) % 4].k], nextCrust = e[E[(i + 1) % 4].k];
    if (e[ed.k]) {
      // fırın kenarı: kesit profili kenar boyunca süpürülür
      const a = round((i + 3) % 4) ? rc : 0, b = round(i) ? rc : 0;
      const L2 = Math.max(0, len - a - b);
      const nseg = Math.max(1, Math.ceil(L2 / cstep));
      const pts = [];
      for (let j = 0; j <= nseg; j++) { const u = a + (L2 * j) / nseg; pts.push([ed.A[0] + t[0] * u, ed.A[1] + t[1] * u]); }
      for (let j = 0; j < nseg; j++) {
        for (let k = 0; k < NK - 1; k++) {
          const P0 = pts[j], P1 = pts[j + 1];
          mb.quadN(sweepPt(P0, ed.n, k), sweepPt(P1, ed.n, k), sweepPt(P1, ed.n, k + 1), sweepPt(P0, ed.n, k + 1), sweepN(ed.n, k), sweepN(ed.n, k), sweepN(ed.n, k + 1), sweepN(ed.n, k + 1),
            crustCol(k, P0[0] + px, P0[1] + pz), crustCol(k, P1[0] + px, P1[1] + pz), crustCol(k + 1, P1[0] + px, P1[1] + pz), crustCol(k + 1, P0[0] + px, P0[1] + pz));
        }
      }
      // köşe: iki kenar da fırın kenarıysa yuvarlak
      if (round(i)) {
        const n2 = E[(i + 1) % 4].n;
        const K = [ed.B[0] - ed.n[0] * rc - n2[0] * rc, ed.B[1] - ed.n[1] * rc - n2[1] * rc];
        const th0 = Math.atan2(ed.n[1], ed.n[0]);
        let th1 = Math.atan2(n2[1], n2[0]);
        while (th1 - th0 > Math.PI) th1 -= Math.PI * 2;
        while (th1 - th0 < -Math.PI) th1 += Math.PI * 2;
        const ns = opt.lite ? 3 : 5;
        for (let j = 0; j < ns; j++) {
          const ta = th0 + ((th1 - th0) * j) / ns, tb = th0 + ((th1 - th0) * (j + 1)) / ns;
          const da = [Math.cos(ta), Math.sin(ta)], db = [Math.cos(tb), Math.sin(tb)];
          for (let k = 0; k < NK - 1; k++) {
            const pA = (dd, kk) => [K[0] + dd[0] * (rc + CRUST[kk][0] * s), CRUST[kk][1], K[1] + dd[1] * (rc + CRUST[kk][0] * s)];
            mb.quadN(pA(da, k), pA(db, k), pA(db, k + 1), pA(da, k + 1), sweepN(da, k), sweepN(db, k), sweepN(db, k + 1), sweepN(da, k + 1),
              crustCol(k, K[0] + px, K[1] + pz), crustCol(k, K[0] + px + 0.02, K[1] + pz), crustCol(k + 1, K[0] + px + 0.02, K[1] + pz), crustCol(k + 1, K[0] + px, K[1] + pz));
          }
        }
      }
      return;
    }
    // bıçak kesiği: iç hamur (gözenekli), sos çizgisi, peynir; uçlarda komşu kenarın kesiti
    const N = [ed.n[0], 0, ed.n[1]];
    const sA = prevCrust, sB = nextCrust;
    const topA = CRUST.slice(4).map((p) => [-p[0] * s, p[1]]);          // u, y (A ucundan)
    const botA = CRUST.slice(0, 4).map((p) => [-p[0] * s, p[1]]).reverse();
    const interp = (arr, u) => {
      for (let j = 0; j < arr.length - 1; j++) {
        const a = arr[j], b = arr[j + 1];
        if (u >= a[0] && u <= b[0]) return a[1] + ((b[1] - a[1]) * (u - a[0])) / Math.max(1e-9, b[0] - a[0]);
      }
      return arr[arr.length - 1][1];
    };
    const at = (u) => [ed.A[0] + t[0] * u, ed.A[1] + t[1] * u];
    const yTop = (u) => {
      if (sA && u <= 0.104 * s) return interp(topA, u);
      if (sB && u >= len - 0.104 * s) return interp(topA, len - u);
      const p = at(u);
      return H(p[0], p[1]);
    };
    const yBot = (u) => {
      if (sA && u < 0.035 * s) return interp(botA, u);
      if (sB && u > len - 0.035 * s) return interp(botA, len - u);
      return 0;
    };
    const U = new Set([0, len]);
    for (let u = 0; u < len; u += opt.lite ? 0.08 : 0.045) U.add(u);
    if (sA) topA.concat(botA).forEach((p) => U.add(clamp(p[0], 0, len)));
    if (sB) topA.concat(botA).forEach((p) => U.add(clamp(len - p[0], 0, len)));
    const us = [...U].sort((a, b) => a - b).filter((u, j, arr) => j === 0 || u - arr[j - 1] > 1e-5);
    const LV = [null, 0.06, 0.11, 0.148, 0.15, 0.168, 0.17, null];
    const colAt = (lv, u, y) => {
      let c;
      if (lv === 0) c = mix3(PC.bottom, PC.crumb, 0.45);
      else if (lv <= 3) c = mix3(PC.crumb, PC.pore, sstep(0.55, 0.85, vnoise((u + px + pz) * 34, y * 40)));
      else if (lv <= 5) c = PC.sauce;
      else c = PC.cheeseL;
      return [c[0], c[1], c[2], lv >= 6 ? -0.2 : 0];
    };
    const col = us.map((u) => {
      const yb = yBot(u), yt = Math.max(yBot(u), yTop(u));
      return LV.map((v, lv) => (lv === 0 ? yb : lv === LV.length - 1 ? yt : clamp(v, yb, yt)));
    });
    for (let j = 0; j < us.length - 1; j++) {
      const ua = us[j], ub = us[j + 1];
      const pa = at(ua), pb = at(ub);
      for (let lv = 0; lv < LV.length - 1; lv++) {
        const ya0 = col[j][lv], ya1 = col[j][lv + 1], yb0 = col[j + 1][lv], yb1 = col[j + 1][lv + 1];
        if (ya1 - ya0 < 1e-5 && yb1 - yb0 < 1e-5) continue;
        mb.quadN([pa[0], ya0, pa[1]], [pb[0], yb0, pb[1]], [pb[0], yb1, pb[1]], [pa[0], ya1, pa[1]], N, N, N, N,
          colAt(lv, ua, ya0), colAt(lv, ub, yb0), colAt(lv + 1 === 7 ? 7 : lv + 1, ub, yb1), colAt(lv + 1 === 7 ? 7 : lv + 1, ua, ya1));
      }
    }
  });
  // malzemeler: dilimin içinde kalan parçalar (kesik kenarda yarım kalanlar kırpılır)
  if (tops && tops.length && !opt.noTops) {
    const tm = new MB();
    tops.forEach((tp) => {
      const lx = tp.x - px, lz = tp.z - pz;
      if (lx + tp.r < -hw || lx - tp.r > hw || lz + tp.r < -hd || lz - tp.r > hd) return;
      toppingModel(tm, Object.assign({}, tp, { x: lx, z: lz }), H);
    });
    clipTris(tm.d, mb.d, -hw, hw, -hd, hd);
  }
}
// Uzak katlar ve gölge için basit kutu
function slabLod(mb, w, d) {
  const hw = w / 2, hd = d / 2;
  mb.box(-hw, 0, -hd, hw, PH.CHEESE + 0.02, hd, { top: C(PC.cheese), side: C(PC.side), bot: C(PC.bottom) });
}

/* ---- masa, tepsi, salon ---- */
function trayModel(mb) {
  // yuvarlak ahşap pizza tahtası: yıllık halkalı damar, pahlı kenar, sapı sol arkaya bakar
  const R = 1.72;
  const wood = (r, a) => {
    const ring = 0.5 + 0.5 * Math.sin(r * 26 + 3 * vnoise(Math.cos(a) * 2 + 5, Math.sin(a) * 2));
    const c = mix3(hexRGB('#9a6234'), hexRGB('#c98f55'), ring * 0.75 + 0.25 * vnoise(r * 9, a * 3));
    return [c[0], c[1], c[2], -0.3];
  };
  // alt yüz + pahlı kenar (üst yüz akçaağaç dokulu ayrı ağ: trayTopModel)
  const prof = [[0, -0.05], [R - 0.02, -0.05], [R, -0.035], [R + 0.004, -0.01], [R - 0.02, 0.0], [R - 0.06, 0.0]];
  mb.lathe(0, 0, 0, prof, 64, (i, a) => wood(prof[i][0], a));
  // sap
  mb.push().T(0, -0.025, 0, Math.PI * 0.75 + Math.PI);
  mb.box(-0.16, -0.025, R - 0.08, 0.16, 0.025, R + 0.55, { top: [0.78, 0.53, 0.3, -0.25], side: [0.66, 0.43, 0.24, -0.2] });
  mb.lathe(0, -0.028, R + 0.42, [[0, 0], [0.05, 0], [0.05, 0.056], [0, 0.056]], 14, C('#3a2416'));
  mb.pop();
}
// Pizza tahtasının üst yüzü: tek parça akçaağaç (doku sütunu 0), damar z boyunca
function trayTopModel(mb) {
  const R = 1.72 - 0.06 + 0.001, seg = 64;
  const uv = (x, z) => [0.004 + (x / (2 * R) + 0.5) * 0.242, 0.3 + (z / (2 * R) + 0.5) * 0.32];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [Math.cos(a0) * R, 0.0005, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, 0.0005, Math.sin(a1) * R];
    const u0 = uv(0, 0), u1 = uv(p0[0], p0[2]), u2 = uv(p1[0], p1[2]);
    mb.tw([0, 0.0005, 0], p0, p1, null, [0, -1, 0], [u0[0], u0[1], u1[0], u1[1], u2[0], u2[1]]);
  }
  // kenara yakın ince halka (pah ile birleşsin)
  const R2 = 1.72 - 0.02;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const A = [Math.cos(a0) * R, 0.0005, Math.sin(a0) * R], B = [Math.cos(a1) * R, 0.0005, Math.sin(a1) * R];
    const Cc = [Math.cos(a1) * R2, 0.0002, Math.sin(a1) * R2], D = [Math.cos(a0) * R2, 0.0002, Math.sin(a0) * R2];
    const ua = uv(A[0], A[2]), ub = uv(B[0], B[2]), uc = uv(Cc[0], Cc[2]), ud = uv(D[0], D[2]);
    mb.tw(A, B, Cc, null, [0, -1, 0], [ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]]);
    mb.tw(A, Cc, D, null, [0, -1, 0], [ua[0], ua[1], uc[0], uc[1], ud[0], ud[1]]);
  }
}
/* ---- pizzacı mutfağı: köşe duvarlar, mermer tezgâh, tuğla odun fırını, raflar, kara tahta menü, neon tabela ---- */
// Kamera (+x,+z) köşesinden bakar: solda B duvarı (x = WA), sağda A duvarı (z = WA), köşe tam arkada.
const WA = -4.6, FLR = -1.0, CT = -0.055, CEIL = 7.4;
const UPV = [0, 1, 0];
const brickCol = (u, v, seed = 0, soot = 0) => {
  const BW = 0.34, BH = 0.13;
  const row = Math.floor(v / BH), off = (row & 1) * 0.5;
  const col = Math.floor(u / BW + off);
  const fu = u / BW + off - col, fv = v / BH - row;
  if (fu < 0.07 || fv < 0.13) return [0.5 * (1 - soot * 0.6), 0.46 * (1 - soot * 0.6), 0.41 * (1 - soot * 0.6), 0];
  const h = hash2(col + seed * 131, row);
  let c = mix3(hexRGB('#8a3f26'), hexRGB('#b85c35'), h);
  c = mix3(c, [0.16, 0.12, 0.1], soot);
  return [c[0], c[1], c[2], -0.05];
};
function pzFloor(mb) {
  // koyu meşe parke (uzun tahtalar, hafif parlak)
  const W = 0.32;
  for (let i = -40; i < 34; i++) {
    const x0 = i * W, x1 = x0 + W - 0.012;
    let z = -26 + hash2(i, 3) * 2.5;
    let k = 0;
    while (z < 14) {
      const len = 1.6 + hash2(i, k + 7) * 2.2;
      const z1 = Math.min(14, z + len);
      const c = mix3(hexRGB('#4a2c1a'), hexRGB('#6e4428'), hash2(i * 7 + k, 11));
      mb.quadN([x0, FLR, z + 0.01], [x1, FLR, z + 0.01], [x1, FLR, z1 - 0.01], [x0, FLR, z1 - 0.01], UPV, UPV, UPV, UPV, [c[0], c[1], c[2], -0.3]);
      z = z1;
      k++;
    }
  }
  mb.quadN([-30, FLR - 0.01, -30], [30, FLR - 0.01, -30], [30, FLR - 0.01, 30], [-30, FLR - 0.01, 30], UPV, UPV, UPV, UPV, [0.12, 0.07, 0.04, 0]);
}
function pzCounter(mb, accentHex) {
  const X1 = 2.75, Z1 = 2.75;
  // damarlı beyaz mermer tabla (kenarları pahlı), unlu lekeler
  // koyu granit: yumuşak, düşük frekanslı dalgalanma (köşe renkleri arasında keskin geçiş yok)
  const marble = (x, z) => {
    const n = vnoise(x * 0.9 + 3, z * 0.9) * 0.6 + vnoise(x * 2.3, z * 2.3 + 7) * 0.4;
    const c = mix3([0.17, 0.165, 0.16], [0.29, 0.28, 0.265], n);
    return [c[0], c[1], c[2], -0.45];
  };
  mb.gridN(WA, WA, X1, Z1, 56, 56, () => CT, (x, z) => marble(x, z));
  const TH = 0.09;
  // ön kenarlar (pah + yan yüz)
  mb.quadN([X1, CT, WA], [X1, CT, Z1], [X1 + 0.03, CT - 0.03, Z1 + 0.03], [X1 + 0.03, CT - 0.03, WA], [0.7, 0.7, 0], [0.7, 0.7, 0.2], [0.7, 0.7, 0.2], [0.7, 0.7, 0], [0.3, 0.29, 0.28, -0.6]);
  mb.quadN([WA, CT, Z1], [X1, CT, Z1], [X1 + 0.03, CT - 0.03, Z1 + 0.03], [WA, CT - 0.03, Z1 + 0.03], [0, 0.7, 0.7], [0.2, 0.7, 0.7], [0.2, 0.7, 0.7], [0, 0.7, 0.7], [0.3, 0.29, 0.28, -0.6]);
  mb.box(WA, CT - TH, WA, X1 + 0.03, CT - 0.03, Z1 + 0.03, { top: [0.24, 0.23, 0.22, -0.5], side: [0.22, 0.21, 0.2, -0.5] }, 't');
  // dolaplar: tezgâhın altında, işletme renginde kapaklar + pirinç kulplar
  const ac = C(accentHex);
  const door = [ac[0] * 0.8, ac[1] * 0.8, ac[2] * 0.8, -0.2], frame = C('#3a2416', -0.15);
  const BOT = FLR + 0.12;
  mb.box(WA, FLR, WA, X1 - 0.06, BOT, Z1 - 0.06, C('#1e130c'));
  // x = X1 yüzü (z boyunca)
  const nDz = Math.round((Z1 - WA) / 0.95);
  for (let k = 0; k < nDz; k++) {
    const za = WA + (k * (Z1 - WA)) / nDz + 0.03, zb = WA + ((k + 1) * (Z1 - WA)) / nDz - 0.03;
    mb.box(X1 - 0.06, BOT, za - 0.03, X1 - 0.02, CT - TH, zb + 0.03, frame);
    mb.box(X1 - 0.02, BOT + 0.06, za + 0.03, X1 + 0.01, CT - TH - 0.06, zb - 0.03, door);
    mb.box(X1 + 0.01, BOT + 0.12, za + 0.09, X1 + 0.015, CT - TH - 0.12, zb - 0.09, shade(door, 1.08));
    mb.push().T(X1 + 0.04, CT - TH - 0.2, (za + zb) / 2 + (k & 1 ? -0.25 : 0.25), 0, 0, Math.PI / 2);
    mb.lathe(0, -0.02, 0, [[0.018, 0], [0.018, 0.04], [0, 0.04]], 8, C('#d6a84a', -0.8));
    mb.pop();
  }
  const nDx = Math.round((X1 - WA) / 0.95);
  for (let k = 0; k < nDx; k++) {
    const xa = WA + (k * (X1 - WA)) / nDx + 0.03, xb = WA + ((k + 1) * (X1 - WA)) / nDx - 0.03;
    mb.box(xa - 0.03, BOT, Z1 - 0.06, xb + 0.03, CT - TH, Z1 - 0.02, frame);
    mb.box(xa + 0.03, BOT + 0.06, Z1 - 0.02, xb - 0.03, CT - TH - 0.06, Z1 + 0.01, door);
    mb.box(xa + 0.09, BOT + 0.12, Z1 + 0.01, xb - 0.09, CT - TH - 0.12, Z1 + 0.015, shade(door, 1.08));
    mb.push().T((xa + xb) / 2 + (k & 1 ? -0.25 : 0.25), CT - TH - 0.2, Z1 + 0.04, 0, Math.PI / 2);
    mb.lathe(0, -0.02, 0, [[0.018, 0], [0.018, 0.04], [0, 0.04]], 8, C('#d6a84a', -0.8));
    mb.pop();
  }
  mb.box(X1 - 0.02, FLR, WA, X1 + 0.03, BOT, Z1 + 0.03, C('#140c08'));
  mb.box(WA, FLR, Z1 - 0.02, X1 + 0.03, BOT, Z1 + 0.03, C('#140c08'));
}
// Duvarlar: altta beyaz metro karo, üstte sıcak sıva, üstte ahşap kirişli tavan
function pzWalls(mb) {
  const TIL = CT + 1.55;
  const NA = [0, 0, 1], NB = [1, 0, 0];
  // A duvarı (z = WA), x boyunca; B duvarı (x = WA), z boyunca
  const wall = (along0, along1, P, N) => {
    // sıva
    mb.quadN(P(along0, TIL), P(along1, TIL), P(along1, CEIL), P(along0, CEIL), N, N, N, N, [0.86, 0.76, 0.62, 0]);
    // süpürgelik altı (tezgâh arkası boşluk görünmez ama güvenli)
    mb.quadN(P(along0, FLR), P(along1, FLR), P(along1, CT), P(along0, CT), N, N, N, N, [0.3, 0.2, 0.14, 0]);
    // metro karo: 0.3 x 0.15, derzli, parlak
    const TW = 0.3, TH = 0.15, g = 0.012;
    mb.quadN(P(along0, CT), P(along1, CT), P(along1, TIL), P(along0, TIL), N, N, N, N, [0.72, 0.7, 0.66, 0]);
    for (let r = 0; CT + r * TH < TIL - 0.01; r++) {
      const off = r & 1 ? TW / 2 : 0;
      for (let u = along0 - off; u < along1; u += TW) {
        const ua = Math.max(along0, u + g), ub = Math.min(along1, u + TW - g);
        if (ub - ua < 0.03) continue;
        const ya = CT + r * TH + g, yb = Math.min(TIL, CT + (r + 1) * TH - g);
        const k = 0.94 + 0.06 * hash2(Math.floor(u * 10) + 77, r);
        mb.quadN(P(ua, ya, 0.008), P(ub, ya, 0.008), P(ub, yb, 0.008), P(ua, yb, 0.008), N, N, N, N, [0.97 * k, 0.96 * k, 0.93 * k, -0.75]);
      }
    }
    // karo üstü ahşap pervaz
    mb.quadN(P(along0, TIL, 0.06), P(along1, TIL, 0.06), P(along1, TIL + 0.08, 0.06), P(along0, TIL + 0.08, 0.06), N, N, N, N, [0.42, 0.26, 0.15, -0.2]);
    mb.quadN(P(along0, TIL + 0.08, 0), P(along1, TIL + 0.08, 0), P(along1, TIL + 0.08, 0.06), P(along0, TIL + 0.08, 0.06), UPV, UPV, UPV, UPV, [0.46, 0.29, 0.17, -0.2]);
  };
  wall(WA, 14, (u, y, o = 0) => [u, y, WA + o], NA);
  wall(WA, 14, (u, y, o = 0) => [WA + o, y, u], NB);
  // duvar üstü korniş + duvar kalınlığı (kule yükseldikçe üstten görünür)
  mb.box(WA - 0.35, CEIL, WA - 0.35, 14, CEIL + 0.22, WA + 0.12, { top: C('#5a3a22'), side: C('#6b4428') });
  mb.box(WA - 0.35, CEIL, WA - 0.35, WA + 0.12, CEIL + 0.22, 14, { top: C('#5a3a22'), side: C('#6b4428') });
  mb.box(WA - 0.35, FLR, WA - 0.35, 14, CEIL, WA, C('#6e4a30'), 'k');
  mb.box(WA - 0.35, FLR, WA - 0.35, WA, CEIL, 14, C('#6e4a30'), 'r');
}
// Dışarıdaki gece şehri: pencereleri yanan binalar (kule duvarların üstüne çıkınca görünür)
function pzCity(mb) {
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI * 0.5 - 1.25 + (i / 69) * 2.5 + (hash2(i, 1) - 0.5) * 0.05 + Math.PI * 0.0;
    const dir = a - Math.PI * 0.25;
    const r = 34 + hash2(i, 2) * 26;
    const cx = Math.cos(dir) * r, cz = Math.sin(dir) * r;
    const w = 5 + hash2(i, 3) * 9, d = 5 + hash2(i, 4) * 7, h = 9 + hash2(i, 5) * 34;
    const base = mix3([0.07, 0.07, 0.11], [0.13, 0.12, 0.18], hash2(i, 6));
    mb.push().T(cx, FLR, cz, -dir + Math.PI / 2);
    mb.box(-w / 2, 0, -d / 2, w / 2, h, d / 2, { top: [base[0] * 0.8, base[1] * 0.8, base[2] * 0.8, 0], side: [base[0], base[1], base[2], 0] });
    // pencereler (ön yüz: +z yönü merkeze bakar)
    for (let fy = 2.5; fy < h - 1.5; fy += 2.2) {
      for (let fx = -w / 2 + 1; fx < w / 2 - 0.8; fx += 1.6) {
        const hh = hash2(i * 31 + Math.round(fx * 3), Math.round(fy * 3));
        if (hh < 0.45) continue;
        const col = hh > 0.93 ? [0.75, 0.88, 1, 1] : hh > 0.8 ? [1, 0.72, 0.4, 1] : [1, 0.86, 0.55, 1];
        mb.quad([fx, fy, d / 2 + 0.03], [fx + 0.9, fy, d / 2 + 0.03], [fx + 0.9, fy + 1.2, d / 2 + 0.03], [fx, fy + 1.2, d / 2 + 0.03], col, [fx, fy, 0]);
      }
    }
    if (hash2(i, 9) < 0.18) mb.cyl(0, h, 0, 0.12, h + 4 + hash2(i, 10) * 6, 0.05, 6, [0.2, 0.2, 0.25, 0]);
    if (hash2(i, 11) < 0.18) mb.sphereS(0, h + 0.3, 0, 0.35, 0.35, 0.35, [1, 0.2, 0.15, 1], 8, 6);
    mb.pop();
  }
  // uzak zemin
  mb.quad([-120, FLR - 0.02, -120], [120, FLR - 0.02, -120], [120, FLR - 0.02, 120], [-120, FLR - 0.02, 120], [0.05, 0.05, 0.07, 0], [0, -10, 0]);
}
// Tuğla odun fırını: B duvarında, tezgâhın üstünde; ağzında yanan ateş (ışık saçar)
const OVEN = { x: WA + 1.35, z: -2.15, r: 1.2 };
function pzOven(mb) {
  const { x: ox, z: oz, r } = OVEN;
  // kaide: taş
  mb.box(WA, CT, oz - r - 0.25, ox + r + 0.12, CT + 0.32, oz + r + 0.25, { top: C('#8d8579', -0.1), side: C('#7a7268') });
  const by = CT + 0.32;
  // kubbe: tuğla desenli (dış yüzey), ağız tarafı +x — ağız kemerinin içi açık bırakılır
  const ry = r * 0.95;
  const inMouth = (x, y, z) => x > 0.25 && y > -0.02 && Math.hypot(z, y) < 0.64;
  const dome = (rr, ryy, inner, colFn) => {
    const su = 44, sv = 22;
    const V = [];
    for (let v = 0; v <= sv; v++) {
      const th = (v / sv) * Math.PI, row = [];
      for (let u = 0; u <= su; u++) {
        const ph = (u / su) * Math.PI * 2;
        const ux = Math.sin(th) * Math.cos(ph), uy = Math.cos(th), uz = Math.sin(th) * Math.sin(ph);
        const n = inner ? [-ux / rr, -uy / ryy, -uz / rr] : [ux / rr, uy / ryy, uz / rr];
        row.push({ p: [ox + ux * rr, by + uy * ryy, oz + uz * rr], l: [ux * rr, uy * ryy, uz * rr], n, c: colFn(ux, uy, uz) });
      }
      V.push(row);
    }
    for (let v = 0; v < sv; v++) {
      for (let u = 0; u < su; u++) {
        const a = V[v][u], b = V[v][u + 1], c2 = V[v + 1][u + 1], d = V[v + 1][u];
        const cx = (a.l[0] + c2.l[0]) / 2, cy = (a.l[1] + c2.l[1]) / 2, cz = (a.l[2] + c2.l[2]) / 2;
        if (inMouth(cx, cy, cz) || cy < -0.02) continue;
        mb.triN(a.p, b.p, c2.p, a.n, b.n, c2.n, a.c, b.c, c2.c);
        mb.triN(a.p, c2.p, d.p, a.n, c2.n, d.n, a.c, c2.c, d.c);
      }
    }
  };
  // (dış kubbe: pzOvenDome, tuğla dokulu)
  // iç yüzey: ateşe yakın yerler kor gibi kızıl, uzaklaştıkça isli siyah (ışık saçar: kendi rengiyle)
  dome(r - 0.07, ry - 0.07, true, (ux, uy, uz) => {
    const d = Math.hypot(ux * r - 0.55, uy * ry * 0.9, uz * r + 0.22);
    const k = clamp(1.15 - d * 0.9, 0, 1);
    const c = mix3([0.05, 0.03, 0.025], [0.62, 0.22, 0.05], k * k);
    return [c[0], c[1], c[2], 1];
  });
  // fırın tabanı (içeride, taş): kora yakın kızıl
  for (let k = 0; k < 28; k++) {
    const a0 = (k / 28) * Math.PI * 2, a1 = ((k + 1) / 28) * Math.PI * 2, R2 = r - 0.08;
    const col = (a) => { const kk = clamp(1 - Math.hypot(Math.cos(a) * R2 - 0.55, Math.sin(a) * R2 + 0.22) * 0.75, 0, 1); const c = mix3([0.07, 0.045, 0.035], [0.45, 0.16, 0.05], kk * kk); return [c[0], c[1], c[2], 1]; };
    mb.triN([ox, by + 0.012, oz], [ox + Math.cos(a0) * R2, by + 0.012, oz + Math.sin(a0) * R2], [ox + Math.cos(a1) * R2, by + 0.012, oz + Math.sin(a1) * R2], UPV, UPV, UPV, [0.22, 0.09, 0.04, 1], col(a0), col(a1));
  }
  // ağız kemeri: tuğla çerçeve + koyu iç + kor ve alev
  const mx = ox + r * 0.93;
  mb.push().T(mx, by, oz, Math.PI / 2, 0, 0);
  for (let k = 0; k <= 8; k++) {
    const a0 = (k / 9) * Math.PI, a1 = ((k + 1) / 9) * Math.PI;
    const R0 = 0.62, R1 = 0.8;
    const P = (a, R) => [Math.cos(a) * R, Math.sin(a) * R, 0];
    const c = mix3(hexRGB('#a8502e'), hexRGB('#c86a3c'), hash2(k, 5));
    mb.quadN(P(a0, R0), P(a1, R0), P(a1, R1), P(a0, R1), [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [c[0], c[1], c[2], -0.1]);
    mb.quadN(P(a0, R1), P(a1, R1), [Math.cos(a1) * R1, Math.sin(a1) * R1, -0.12], [Math.cos(a0) * R1, Math.sin(a0) * R1, -0.12], [Math.cos(a0), Math.sin(a0), 0], [Math.cos(a1), Math.sin(a1), 0], [Math.cos(a1), Math.sin(a1), 0], [Math.cos(a0), Math.sin(a0), 0], [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0]);
  }
  // kemerin iç yüzü: ağızdan içeri kısa tünel (dışı tuğla, içi isli)
  for (let k = 0; k < 12; k++) {
    const a0 = (k / 12) * Math.PI, a1 = ((k + 1) / 12) * Math.PI, R0 = 0.62;
    const P = (a, z) => [Math.cos(a) * R0, Math.sin(a) * R0, z];
    const n0 = [-Math.cos(a0), -Math.sin(a0), 0], n1 = [-Math.cos(a1), -Math.sin(a1), 0];
    mb.quadN(P(a0, 0.0), P(a1, 0.0), P(a1, -0.32), P(a0, -0.32), n0, n1, n1, n0, [0.16, 0.09, 0.07, 0], [0.16, 0.09, 0.07, 0], [0.12, 0.06, 0.04, 0], [0.12, 0.06, 0.04, 0]);
  }
  mb.pop();
  // fırının içindeki ateş: kütükler + kor + alev dilleri (ışık saçar)
  const fx = ox + 0.55, fz = oz - 0.22;
  for (let k = 0; k < 3; k++) {
    mb.push().T(fx, by + 0.08, fz + (k - 1) * 0.16, 0.3 * k, 0, Math.PI / 2);
    mb.lathe(0, -0.3, 0, [[0, 0], [0.07, 0], [0.07, 0.6], [0, 0.6]], 8, (i) => (i === 0 || i === 3 ? C('#ff8a2a', 1) : C('#3b2414')));
    mb.pop();
  }
  // kor yatağı
  for (let k = 0; k < 14; k++) {
    const a = k * 2.399, rr = 0.06 + (k % 5) * 0.045;
    mb.sphereS(fx + Math.cos(a) * rr, by + 0.04, fz + Math.sin(a) * rr * 1.6, 0.06, 0.035, 0.06, k % 3 ? [1, 0.36, 0.06, 1] : [1, 0.6, 0.15, 1], 6, 4);
  }
  // baca: tuğla kaplı, tavana kadar
  const chH = CEIL + 0.9 - (by + r * 0.85);
  mb.lathe(ox - 0.3, by + r * 0.85, oz, [[0.34, 0], [0.3, 0.25], [0.3, chH], [0.3, chH]], 14, (i, a) => brickCol(a * 0.3, i * 0.6, 7));
  mb.lathe(ox - 0.3, CEIL + 0.9, oz, [[0, 0], [0.38, 0], [0.4, 0.04], [0.4, 0.1], [0.12, 0.3], [0, 0.32]], 14, C('#2a2a2a', -0.5));
  // fırın önünde odun yığını ve kürek
  for (let k = 0; k < 5; k++) {
    mb.push().T(WA + 0.45 + (k % 2) * 0.05, CT + 0.1 + Math.floor(k / 2) * 0.17, 0.15 + (k % 3) * 0.17, Math.PI / 2, 0, Math.PI / 2);
    mb.lathe(0, -0.35, 0, [[0, 0], [0.085, 0], [0.085, 0.7], [0, 0.7]], 9, (i) => (i === 0 || i === 3 ? C('#c9a074') : C('#5b3a22')));
    mb.pop();
  }
}
// Fırın kubbesinin tuğla dokusu: u = açı (0 = ağız yönü +x), v = tepeden ekvatora. Halka halka tuğla, ağız üstü ve tepe isli.
function drawOvenBricks(cv) {
  const W = 1024, H = 256;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#7d7266'; g.fillRect(0, 0, W, H);
  const rows = 15;
  for (let j = 0; j < rows; j++) {
    const v0 = (j / rows) * H, v1 = ((j + 1) / rows) * H;
    const th = ((j + 0.5) / rows) * (Math.PI / 2);
    const n = Math.max(4, Math.round(24 * Math.sin(th)));
    const off = (j % 2) * 0.5;
    for (let i = 0; i < n; i++) {
      const u0 = ((i + off) / n) * W, u1 = ((i + 1 + off) / n) * W;
      const h = hash2(i * 7 + 3, j * 13 + 1);
      const c = mix3(hexRGB('#94442a'), hexRGB('#c06538'), h);
      const gap = 3;
      const draw = (x0, x1) => {
        const gr = g.createLinearGradient(0, v0, 0, v1);
        const lite = (k) => `rgb(${Math.round(c[0] * 255 * k)},${Math.round(c[1] * 255 * k)},${Math.round(c[2] * 255 * k)})`;
        gr.addColorStop(0, lite(1.08)); gr.addColorStop(0.6, lite(1)); gr.addColorStop(1, lite(0.82));
        g.fillStyle = gr;
        g.fillRect(x0 + gap, v0 + gap, x1 - x0 - gap * 2, v1 - v0 - gap * 2);
      };
      draw(u0, u1);
      if (u1 > W) draw(u0 - W, u1 - W);
      // yüzey benekleri
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(40,15,8,${0.08 + hash2(i + k * 31, j) * 0.12})`; g.fillRect((u0 + hash2(i, k + j * 7) * (u1 - u0)) % W, v0 + gap + hash2(k, i + j) * (v1 - v0 - gap * 2), 3, 2); }
    }
  }
  // is: ağzın üstünde (u ≈ 0 / 1) ve tepede
  const soot = (cx) => {
    const gr = g.createRadialGradient(cx, H * 0.95, 10, cx, H * 0.95, H * 0.9);
    gr.addColorStop(0, 'rgba(20,12,8,0.82)'); gr.addColorStop(0.55, 'rgba(25,14,9,0.45)'); gr.addColorStop(1, 'rgba(25,14,9,0)');
    g.fillStyle = gr; g.fillRect(cx - H, 0, H * 2, H);
  };
  soot(0); soot(W);
  const top = g.createLinearGradient(0, 0, 0, H * 0.35);
  top.addColorStop(0, 'rgba(22,14,10,0.55)'); top.addColorStop(1, 'rgba(22,14,10,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, H * 0.35);
}
// Kubbe dış yüzeyi ('tex'): ağız kemerinin içi boş
function pzOvenDome(mb) {
  const { x: ox, z: oz, r } = OVEN;
  const by = CT + 0.32, ry = r * 0.95;
  const inMouth = (x, y, z) => x > 0.25 && y > -0.02 && Math.hypot(z, y) < 0.64;
  const su = 72, sv = 18;
  const P = (u, v) => {
    const th = (v / sv) * (Math.PI / 2), ph = (u / su) * Math.PI * 2;
    const ux = Math.sin(th) * Math.cos(ph), uy = Math.cos(th), uz = Math.sin(th) * Math.sin(ph);
    return { p: [ox + ux * r, by + uy * ry, oz + uz * r], l: [ux * r, uy * ry, uz * r], uv: [u / su, v / sv] };
  };
  const cen = [ox, by, oz];
  for (let v = 0; v < sv; v++) {
    for (let u = 0; u < su; u++) {
      const a = P(u, v), b = P(u + 1, v), c = P(u + 1, v + 1), d = P(u, v + 1);
      const mx = (a.l[0] + c.l[0]) / 2, my = (a.l[1] + c.l[1]) / 2, mz = (a.l[2] + c.l[2]) / 2;
      if (inMouth(mx, my, mz)) continue;
      if (v > 0) mb.tw(a.p, b.p, c.p, null, cen, [a.uv[0], a.uv[1], b.uv[0], b.uv[1], c.uv[0], c.uv[1]]);
      mb.tw(a.p, c.p, d.p, null, cen, [a.uv[0], a.uv[1], c.uv[0], c.uv[1], d.uv[0], d.uv[1]]);
    }
  }
}
// Fırındaki alev dili (birim yükseklik, orijin tabanda): dış turuncu, iç sarı
function ovenFlame(mb) {
  mb.lathe(0, 0, 0, [[0, 0], [0.11, 0.04], [0.12, 0.2], [0.08, 0.55], [0.03, 0.85], [0, 1]], 10, [1, 0.5, 0.1, 1]);
  mb.lathe(0, 0.02, 0, [[0, 0], [0.065, 0.04], [0.07, 0.18], [0.04, 0.45], [0, 0.66]], 8, [1, 0.88, 0.45, 1]);
}
// Raflar ve üstündekiler (A duvarı) + asılı bakır tavalar + sarımsak/biber dizisi + fesleğen saksıları
function pzShelves(mb) {
  const shelf = (x0, x1, y, z) => {
    mb.box(x0, y - 0.05, z, x1, y, z + 0.38, { top: C('#8a5a33', -0.15), side: C('#6b4428') });
    for (const x of [x0 + 0.25, x1 - 0.25]) {
      mb.box(x - 0.03, y - 0.3, z, x + 0.03, y - 0.05, z + 0.05, C('#2a2a2a', -0.6));
      mb.box(x - 0.03, y - 0.08, z, x + 0.03, y - 0.05, z + 0.3, C('#2a2a2a', -0.6));
    }
  };
  const jar = (x, y, z, h, rr, content, lid = '#c9c2b5') => {
    mb.lathe(x, y, z, [[0, 0], [rr, 0], [rr * 1.04, 0.02], [rr * 1.04, h * 0.85], [rr * 0.8, h * 0.95], [rr * 0.8, h], [0, h]], 16, (i) => (i <= 3 ? C(content, -0.85) : C('#d8e6ea', -0.9)));
    mb.lathe(x, y + h, z, [[0, 0], [rr * 0.85, 0], [rr * 0.85, 0.05], [0, 0.05]], 14, C(lid, -0.6));
  };
  const bottle = (x, y, z, h, col) => {
    mb.lathe(x, y, z, [[0, 0], [0.08, 0], [0.085, 0.03], [0.085, h * 0.62], [0.035, h * 0.8], [0.03, h], [0, h]], 14, C(col, -0.9));
    mb.lathe(x, y + h, z, [[0, 0], [0.033, 0], [0.033, 0.05], [0, 0.05]], 8, C('#7a4a26'));
  };
  const plant = (x, y, z, s = 1) => {
    mb.lathe(x, y, z, [[0, 0], [0.13 * s, 0], [0.17 * s, 0.22 * s], [0.18 * s, 0.24 * s], [0, 0.24 * s]], 14, C('#b8582e', -0.1));
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4, rr = 0.06 + (k % 3) * 0.05;
      mb.sphereS(x + Math.cos(a) * rr * s, y + (0.3 + (k % 4) * 0.06) * s, z + Math.sin(a) * rr * s, 0.075 * s, 0.03 * s, 0.05 * s, C(k % 2 ? '#3f8f2e' : '#5fb446', -0.35), 8, 4);
    }
  };
  const Z = WA + 0.01;
  // A duvarı rafları
  shelf(WA + 0.05, -0.1, CT + 2.05, Z);
  shelf(WA + 0.05, -0.1, CT + 2.85, Z);
  [[WA + 0.35, '#c4302b', 0.34], [WA + 0.62, '#5f8f3a', 0.28], [WA + 0.9, '#e0a63a', 0.3], [WA + 1.2, '#7b3f2a', 0.36], [WA + 1.55, '#c4302b', 0.3], [WA + 2.6, '#f2e6c8', 0.32], [WA + 2.95, '#3f6b2a', 0.28]].forEach(([x, c, h], k) => jar(x, CT + 2.05, Z + 0.19, h, 0.1 + (k % 2) * 0.02, c));
  bottle(WA + 1.95, CT + 2.05, Z + 0.2, 0.55, '#6b7b1e');
  bottle(WA + 2.2, CT + 2.05, Z + 0.2, 0.5, '#3a1a20');
  bottle(WA + 3.35, CT + 2.05, Z + 0.2, 0.55, '#c8a82a');
  // üst raf: tabak yığını, kavanozlar, saksılar
  for (let k = 0; k < 6; k++) mb.lathe(WA + 0.5, CT + 2.85 + k * 0.03, Z + 0.2, [[0, 0], [0.16, 0], [0.19, 0.02], [0.18, 0.026], [0, 0.026]], 18, C('#f7f3ea', -0.7));
  plant(WA + 1.15, CT + 2.85, Z + 0.19);
  jar(WA + 1.65, CT + 2.85, Z + 0.19, 0.4, 0.12, '#e8d9b0', '#8a5a33');
  jar(WA + 2.0, CT + 2.85, Z + 0.19, 0.32, 0.11, '#d0a040', '#8a5a33');
  plant(WA + 2.55, CT + 2.85, Z + 0.19, 0.9);
  jar(WA + 3.1, CT + 2.85, Z + 0.19, 0.36, 0.1, '#8e2b20');
  // asılı bakır tavalar (A duvarı, rafların üstünde)
  mb.box(WA + 0.2, CT + 4.05, Z, WA + 3.6, CT + 4.1, Z + 0.06, C('#3a3a3a', -0.7));
  [[WA + 0.6, 0.22], [WA + 1.25, 0.28], [WA + 2.0, 0.2], [WA + 2.7, 0.25], [WA + 3.3, 0.18]].forEach(([x, rr], k) => {
    const y = CT + 3.95 - rr * 2.4;
    mb.box(x - 0.012, y + rr * 2, Z + 0.03, x + 0.012, CT + 4.05, Z + 0.06, C('#b8763c', -0.85));
    mb.push().T(x, y + rr, Z + 0.1, 0, Math.PI / 2, 0);
    mb.lathe(0, 0, 0, [[0, 0], [rr * 0.8, 0], [rr, 0.06], [rr * 1.05, 0.08], [rr * 0.95, 0.08], [rr * 0.75, 0.015], [0, 0.015]], 22, k % 2 ? C('#c9773d', -0.9) : C('#b0663a', -0.9));
    mb.pop();
  });
  // B duvarında sarımsak ve kuru biber dizileri (fırının iki yanında)
  [[-0.6, '#f3eadb'], [-3.7, '#c4281e']].forEach(([z, col], j) => {
    for (let k = 0; k < 9; k++) {
      const y = CT + 3.4 - k * 0.14;
      mb.sphereS(WA + 0.12, y, z + Math.sin(k * 1.3) * 0.04, j ? 0.045 : 0.07, j ? 0.09 : 0.06, j ? 0.045 : 0.07, C(col, -0.3), 10, 6);
    }
    mb.cyl(WA + 0.12, CT + 2.15, z, 0.006, CT + 3.55, 0.006, 4, C('#8a6a3a'));
  });
  // tezgâh üstü: un çuvalı, oklava, hamur topları, domates kutuları, yağ şişesi, fesleğen
  mb.lathe(-3.6, CT, 1.6, [[0, 0], [0.3, 0], [0.36, 0.08], [0.37, 0.36], [0.3, 0.56], [0.13, 0.66], [0.1, 0.7], [0.14, 0.8], [0.1, 0.84], [0, 0.85]], 20, (i) => (i === 3 ? C('#c4302b') : i >= 6 ? C('#d9cdb4') : C('#efe6d2', -0.05)));
  mb.push().T(1.95, CT + 0.05, -1.6, 0.6, 0, Math.PI / 2);
  mb.lathe(0, -0.42, 0, [[0, 0], [0.025, 0], [0.025, 0.14], [0.045, 0.16], [0.045, 0.68], [0.025, 0.7], [0.025, 0.84], [0, 0.84]], 12, (i) => (i >= 3 && i <= 4 ? C('#d9b07a', -0.2) : C('#8a5a33', -0.2)));
  mb.pop();
  for (let k = 0; k < 4; k++) mb.sphereS(-1.35 + (k % 2) * 0.32, CT + 0.1, -3.75 + Math.floor(k / 2) * 0.32, 0.15, 0.11, 0.15, C('#f3e3c0', -0.3), 14, 8);
  for (let k = 0; k < 3; k++) {
    const x = -3.7 + k * 0.28, z = -3.85;
    mb.lathe(x, CT, z, [[0, 0], [0.12, 0], [0.12, 0.3], [0, 0.3]], 16, (i) => (i === 1 ? C('#c4302b', -0.4) : C('#b9bcc2', -0.85)));
  }
  bottle(-0.4, CT, -3.9, 0.55, '#7a8a1e');
  // A duvarı: gece şehrine bakan pencere (yatay ekranda görünür)
  {
    const x0 = 0.9, x1 = 3.6, y0 = CT + 1.95, y1 = CT + 4.2, z = WA + 0.03;
    mb.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0.08, 0.1, 0.22, 0.5], [0, 0, z - 1]);
    for (let k = 0; k < 40; k++) {
      const wx = x0 + 0.1 + hash2(k, 41) * (x1 - x0 - 0.25), wy = y0 + 0.1 + hash2(k, 42) * (y1 - y0) * 0.55;
      mb.quad([wx, wy, z + 0.005], [wx + 0.05, wy, z + 0.005], [wx + 0.05, wy + 0.07, z + 0.005], [wx, wy + 0.07, z + 0.005], [1, 0.8 + 0.2 * hash2(k, 3), 0.5, 1], [0, 0, z - 1]);
    }
    mb.box(x0 - 0.1, y0 - 0.16, WA, x1 + 0.1, y0, WA + 0.22, { top: C('#8a5a33', -0.15), side: C('#6b4428') });
    mb.box(x0 - 0.1, y1, WA, x1 + 0.1, y1 + 0.1, WA + 0.08, C('#5a3820'));
    mb.box(x0 - 0.1, y0, WA, x0, y1, WA + 0.08, C('#5a3820'));
    mb.box(x1, y0, WA, x1 + 0.1, y1, WA + 0.08, C('#5a3820'));
    mb.box((x0 + x1) / 2 - 0.04, y0, WA, (x0 + x1) / 2 + 0.04, y1, WA + 0.07, C('#5a3820'));
    mb.box(x0, (y0 + y1) / 2 - 0.04, WA, x1, (y0 + y1) / 2 + 0.04, WA + 0.07, C('#5a3820'));
    plant(x0 + 0.4, y0, WA + 0.12, 0.85);
    plant(x1 - 0.45, y0, WA + 0.12, 0.85);
  }
  // B duvarı: çerçeveli eski İtalya afişi (yeşil-beyaz-kırmızı şeritli)
  {
    const z0 = 0.95, z1 = 2.75, y0 = CT + 2.15, y1 = CT + 4.05, x = WA + 0.03;
    mb.box(WA, y0 - 0.08, z0 - 0.08, WA + 0.06, y1 + 0.08, z1 + 0.08, C('#2a1a10'));
    const cols = ['#2f8f4a', '#f4efe2', '#c4302b'];
    for (let k = 0; k < 3; k++) {
      const za = z1 - ((z1 - z0) * k) / 3, zb = z1 - ((z1 - z0) * (k + 1)) / 3;
      mb.quad([x + 0.04, y0, za], [x + 0.04, y0, zb], [x + 0.04, y1, zb], [x + 0.04, y1, za], C(cols[k]), [x - 1, 0, 0]);
    }
    mb.sphereS(x + 0.07, (y0 + y1) / 2, (z0 + z1) / 2, 0.012, 0.5, 0.5, null, 20, 10, (ux, uy, uz) => (Math.hypot(uy, uz) > 0.85 ? C('#d89a4c') : uy > 0.2 && Math.abs(uz) < 0.3 ? C('#4fa83a') : C('#e04a2a')));
  }
  plant(-0.95, CT, -3.75, 1.2);
}
// Sarkıt lambalar: kablo + metal şapka (ampul ve parlaması ayrıca)
// duvara monte demir kollu lambalar: [lamba x, z, duvar: 'A' | 'B']
const LAMPS = [[-3.55, WA + 1.05, 'A'], [-0.4, WA + 1.05, 'A'], [WA + 1.05, -4.0, 'B'], [WA + 1.05, 0.3, 'B']];
const LAMP_Y = 3.75;
function pzLamps(mb) {
  const iron = C('#1d1d1f', -0.5);
  LAMPS.forEach(([x, z, w]) => {
    const wx = w === 'B' ? WA + 0.02 : x, wz = w === 'A' ? WA + 0.02 : z;
    // duvar plakası + kol
    mb.box(wx - (w === 'B' ? 0 : 0.09), LAMP_Y + 0.72, wz - (w === 'A' ? 0 : 0.09), wx + (w === 'B' ? 0.04 : 0.09), LAMP_Y + 0.98, wz + (w === 'A' ? 0.04 : 0.09), iron);
    if (w === 'A') mb.box(x - 0.025, LAMP_Y + 0.83, WA, x + 0.025, LAMP_Y + 0.88, z, iron);
    else mb.box(WA, LAMP_Y + 0.83, z - 0.025, x, LAMP_Y + 0.88, z + 0.025, iron);
    mb.cyl(x, LAMP_Y + 0.38, z, 0.008, LAMP_Y + 0.85, 0.008, 4, C('#111111'));
    mb.lathe(x, LAMP_Y, z, [[0.3, 0], [0.28, 0.03], [0.17, 0.18], [0.07, 0.29], [0.05, 0.36], [0, 0.36]], 22, C('#1f3b2e', -0.6));
    mb.sphereS(x, LAMP_Y + 0.02, z, 0.095, 0.105, 0.095, C('#fff1c8', 1), 12, 8);
  });
}
// Pizza kutuları yığını (kapakta işletme logosu ayrı dokulu çizilir)
const BOXES = [[1.85, -2.75, 0.2], [1.85, -2.75, -0.1]];
function pzBoxes(mb) {
  for (let k = 0; k < 5; k++) {
    const y = CT + k * 0.075, r = (k % 2 ? 0.06 : -0.04);
    mb.push().T(1.95, y, -3.0, r);
    mb.box(-0.42, 0, -0.42, 0.42, 0.072, 0.42, { top: C('#d8b583'), side: C('#c49a62'), bot: C('#b58a55') });
    mb.pop();
  }
}
function pzBoxTop(tb) {
  tb.push().T(1.95, CT + 4 * 0.075 + 0.0725, -3.0, -0.04);
  tb.tquad([-0.3, 0, 0.3], [0.3, 0, 0.3], [0.3, 0, -0.3], [-0.3, 0, -0.3], 0, 0, 1, 1, [0, -1, 0]);
  tb.pop();
}
// Kara tahta menü (A duvarı) ve neon tabela (B duvarı) için doku yüzeyleri
const CHALK = { x0: WA + 0.5, x1: WA + 3.3, y0: CT + 4.5, y1: CT + 6.3 };
// neon arka duvarda, kara tahta menünün hemen üstünde (sol duvardaydı; kamera açısından bacanın arkasında kalıyordu)
const NEON = { x0: WA + 0.4, x1: WA + 3.4, y0: CT + 6.48, y1: CT + 7.23 };
function pzChalkFrame(mb) {
  const { x0, x1, y0, y1 } = CHALK, z = WA + 0.02;
  mb.box(x0 - 0.1, y0 - 0.1, z, x1 + 0.1, y1 + 0.1, z + 0.06, C('#5a3820', -0.2));
}
function pzChalk(tb) {
  const { x0, x1, y0, y1 } = CHALK, z = WA + 0.085;
  tb.tquad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], 0, 0, 1, 1, [0, 0, z - 1]);
}
function pzNeon(tb) {
  const { x0, x1, y0, y1 } = NEON, z = WA + 0.06;
  tb.tquad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], 0, 0, 1, 1, [0, 0, z - 1]);
}
function drawChalk(cv, brand, img) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#24302a'); grd.addColorStop(1, '#1a231f');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // tebeşir lekeleri (tohumlu: her çizimde aynı)
  let sd = 9137;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.015 + rnd() * 0.03})`; g.beginPath(); g.arc(rnd() * W, rnd() * H, 6 + rnd() * 28, 0, Math.PI * 2); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  const fit = (t, maxW, size, wt = 800) => { let fs = size; do { g.font = `${wt} ${fs}px ${F}`; fs -= 2; } while (g.measureText(t).width > maxW && fs > 12); };
  // dilim simgesi (emoji yerine çizim: her cihazda aynı görünür)
  const slice = (cx, cy, s) => {
    g.save(); g.translate(cx, cy);
    g.fillStyle = '#e8a33a'; g.beginPath(); g.moveTo(-s * 0.55, -s * 0.5); g.lineTo(s * 0.55, -s * 0.5); g.lineTo(0, s * 0.6); g.closePath(); g.fill();
    g.fillStyle = '#f6d36a'; g.beginPath(); g.moveTo(-s * 0.45, -s * 0.36); g.lineTo(s * 0.45, -s * 0.36); g.lineTo(0, s * 0.48); g.closePath(); g.fill();
    g.fillStyle = '#c8321f'; [[-0.18, -0.18], [0.16, -0.2], [0, 0.12]].forEach(([x, y]) => { g.beginPath(); g.arc(x * s, y * s, s * 0.09, 0, Math.PI * 2); g.fill(); });
    g.restore();
  };
  g.fillStyle = '#f5f1e6';
  if (img) {
    const r = img.width / img.height;
    if (brand.round) {
      const s2 = 92;
      g.save(); g.beginPath(); g.arc(W / 2, 60, s2 / 2 + 4, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); g.arc(W / 2, 60, s2 / 2, 0, Math.PI * 2); g.clip(); g.drawImage(img, W / 2 - s2 / 2, 60 - s2 / 2, s2, s2); g.restore();
    } else {
      let h = 92, w = h * r;
      if (w > W - 140) { w = W - 140; h = w / r; }
      g.drawImage(img, W / 2 - w / 2, 60 - h / 2, w, h);
    }
  } else {
    fit('PİZZA', W - 180, 54); g.fillText('PİZZA', W / 2, 46);
    const tw = g.measureText('PİZZA').width;
    slice(W / 2 - tw / 2 - 34, 46, 40); slice(W / 2 + tw / 2 + 34, 46, 40);
    fit(brand.name, W - 90, 26, 700); g.fillText(brand.name, W / 2, 94);
  }
  g.strokeStyle = 'rgba(245,241,230,.8)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(60, 122); g.lineTo(W - 60, 122); g.stroke();
  const items = [['Margarita', '★'], ['Sucuklu', '★★'], ['Karışık', '★★'], ['Kule Pizza', '★★★']];
  items.forEach(([n, st], k) => {
    const yy = 152 + k * 36;
    g.font = `700 28px ${F}`;
    g.textAlign = 'left'; g.fillStyle = '#f5f1e6'; g.fillText(n, 56, yy, W - 210);
    // noktalı çizgi (menü düzeni)
    const w0 = 56 + Math.min(W - 210, g.measureText(n).width) + 12, w1 = W - 56 - 22 * st.length - 12;
    g.fillStyle = 'rgba(245,241,230,.35)';
    for (let x = w0; x < w1; x += 12) g.fillRect(x, yy + 8, 5, 3);
    g.textAlign = 'right'; g.fillStyle = '#ffd36b'; g.font = `700 24px ${F}`; g.fillText(st, W - 56, yy);
  });
  g.textAlign = 'center'; g.fillStyle = '#f08a7a';
  fit('Kuleyi en yükseğe sen dik!', W - 70, 26); g.fillText('Kuleyi en yükseğe sen dik!', W / 2, H - 26);
}
function drawNeon(cv, brand) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  const text = brand.slug === 'nfc' ? 'PİZZA KULESİ' : brand.name;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 92;
  g.font = `800 ${fs}px ${F}`;
  while (g.measureText(text).width > W - 70 && fs > 30) { fs -= 4; g.font = `800 ${fs}px ${F}`; }
  // arka plaka
  g.fillStyle = 'rgba(20,12,10,0.92)';
  g.beginPath(); g.roundRect ? g.roundRect(8, 8, W - 16, H - 16, 26) : g.rect(8, 8, W - 16, H - 16); g.fill();
  const col = brand.slug === 'nfc' ? '#ff5a8a' : brand.accentHex;
  g.shadowColor = col; g.shadowBlur = 28;
  g.strokeStyle = col; g.lineWidth = 5;
  g.strokeText(text, W / 2, H / 2 + 4);
  g.shadowBlur = 12;
  g.fillStyle = '#fff6f0';
  g.fillText(text, W / 2, H / 2 + 4);
  g.shadowBlur = 0;
}

const PSUN = new Float32Array(norm3([-0.3, 0.92, 0.25]));
const PLIGHT = { sunC: [0.92, 0.82, 0.66], sky: [0.5, 0.43, 0.37], gnd: [0.26, 0.18, 0.13], night: 0, warm: [1, 0.85, 0.6], lampC: [0.62, 0.46, 0.3], fogR: [30, 120] };
const PFOG = new Float32Array(hexRGB('#2b1d15'));
// duvarların üstündeki gece göğü (ay + yıldızlar)
const PSKY = { sunC: [0.85, 0.88, 1.0], stars: 1, glowS: 0.5, top: new Float32Array(hexRGB('#050817')), hor: new Float32Array(hexRGB('#232650')), fog: new Float32Array(hexRGB('#151830')), sunVis: new Float32Array(norm3([-0.75, 0.42, -0.5])) };
const ZERO3 = new Float32Array([0, 0, 0]);
const delta0 = (pos, top, ax) => pos - (ax === 'x' ? top.x : top.z);

/* ============================ oyun ============================ */
const PAL = [
  ['#e6b26b', '#f3c987'], ['#c8321f', '#e24a30'], ['#f5cf4a', '#ffe486'],
  ['#4f9a3d', '#6cc055'], ['#9b3b2a', '#bd5038'], ['#463c4e', '#625569'],
];
const LBL_CAP = 6;

class Game {
  constructor(ctx) {
    injectStyle();
    injectStyle2();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.key = null;
    this.T = null;
    this.parts = [];
    this.fall = [];
    this.time = 0;
    this.scale = 1;
    this.frameAvg = 16;
    this.slowFor = 0;
    this.fastFor = 0;
    this.fov = 0.9;
    this.cam = { D: 10, ty: 1.2, yaw: 0.8, ex: 0, ey: 5, ez: 9 };
    this.panelKey = '';
    this.lastBeep = 99;
    this.snd = new PizzaSnd();
    this.mats = { a: M.make(), s: M.make(), V: M.make(), P: M.make(), VP: M.make() };
    this.meshes = {};
    this.lbKey = '';
    this.shake = 0;
    this.buildDom();
    try { this.snd.amb('diner+fire', 0.6); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd && this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[pizza] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); } catch (e) {
        console.warn('[pizza] kaynak', e);
        this.X = null;
        const cv = document.createElement('canvas');
        this.el.cv.replaceWith(cv);
        this.el.cv = cv;
      }
    }
    if (this.X) {
      this.pA = new Float32Array(700 * 126);
      this.pB = new Float32Array(700 * 126);
      this.el.cv.addEventListener('webglcontextlost', this.onLost = (e) => { e.preventDefault(); this.lost = true; }, false);
      this.el.cv.addEventListener('webglcontextrestored', this.onRestore = () => this.restore(), false);
      this.buildWorld();
    } else {
      this.g2 = ctx2d(this.el);
    }
    this.bindInput();
    this.lastT = performance.now();
    this.frameB = (t) => this.frame(t);
    this.raf = requestAnimationFrame(this.frameB);
  }

  /* ---------- DOM ---------- */
  buildDom() {
    const w = document.createElement('div');
    w.id = 'ky';
    w.className = 'pz';
    w.innerHTML = `
      <canvas aria-label="Pizza Kulesi 3D sahnesi"></canvas>
      <div class="lbls"></div><div class="fx"></div><div class="vig"></div>
      <div class="hud">
        <div class="r1">
          <div class="pos"><b>1</b><small>/1</small></div>
          <div class="sp"></div>
          <div class="tm">0:00</div>
          <button class="ib mu ${sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
          <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted() ? '🔇' : '🔊'}</button>
          <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
        </div>
      </div>
      <div class="pz-h" style="display:none"><b>0</b><small>KAT</small></div>
      <div class="pz-cb"></div>
      <div class="pz-lb"></div>
      <div class="note"></div>
      <button class="pz-tap off" aria-label="Pizza katını bırak"><span>🍕</span>BIRAK</button>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = {
      wrap: w, cv: q('canvas'), lbls: q('.lbls'), fx: q('.fx'), vig: q('.vig'), posB: q('.pos b'), posS: q('.pos small'), pos: q('.pos'),
      tm: q('.tm'), ex: q('.ex'), note: q('.note'), msg: q('.msg'), panel: q('.panel'), hud: q('.hud'),
      big: q('.pz-h'), bigN: q('.pz-h b'), cb: q('.pz-cb'), lb: q('.pz-lb'), tap: q('.pz-tap'),
    };
    this.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    let armT = 0;
    this.el.ex.addEventListener('click', () => {
      const b = this.el.ex;
      if (b.dataset.act) return;
      b.classList.add('arm');
      b.textContent = 'Çık?';
      setTimeout(() => { if (!this.dead) b.dataset.act = 'exit-game'; }, 0);
      clearTimeout(armT);
      armT = setTimeout(() => { if (this.dead) return; delete b.dataset.act; b.classList.remove('arm'); b.textContent = '✕'; }, 2600);
    });
  }

  /* ---------- giriş ---------- */
  bindInput() {
    const w = this.el.wrap;
    this.onDown = (e) => {
      if (e.target.closest('.panel.on .card, button, a')) return;
      e.preventDefault();
      this.drop();
    };
    this.el.tap.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.drop(); });
    w.addEventListener('pointerdown', this.onDown);
    this.onTouch = (e) => { if (!e.target.closest('.card')) e.preventDefault(); };
    w.addEventListener('touchmove', this.onTouch, { passive: false });
    this.onKey = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); if (!e.repeat) this.drop(); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  simNow() {
    const v = this.view;
    return v && v.startAt ? (this.ctx.serverNow() - v.startAt) / 1000 : -99;
  }
  canCtl() {
    const v = this.view;
    const T = this.T;
    return !!(v && T && T.live && !T.out && v.phase === 'play' && this.simNow() > 0.05 && this.ctx.serverNow() < v.endsAt);
  }

  /* ---------- kule ---------- */
  freshTower(seed, live) {
    this.freeTower(this.T);
    const base = { x: 0, z: 0, w: PZ.BASE, d: PZ.BASE, base: true, ci: 0 };
    const T = { seed, live, layers: [base], h: 0, perf: 0, combo: 0, best: 0, out: false, cur: PZ.mover(seed, 1), outAt: 0, flash: 0, mov: null };
    this.spawnMover(T);
    return T;
  }
  topY(T) { return (T.layers.length) * PZ.LH; }
  meshOf(fn) {
    if (!this.X || this.lost) return null;
    try { return this.mk(fn); } catch (e) { console.warn('[pizza] model', e); return null; }
  }
  spawnMover(T) {
    const top = T.layers[T.layers.length - 1];
    const w = top.w, d = top.d;
    const tops = genToppings(w, d, (T.seed * 31 + T.layers.length * 977) >>> 0);
    const e = { xn: true, xp: true, zn: true, zp: true };
    T.mov = { w, d, tops, e, mesh: this.meshOf((mb) => slabModel(mb, w, d, e, [0, 0], tops)), lod: this.meshOf((mb) => slabLod(mb, w, d)) };
  }
  layerMeshes(L) {
    L.mesh = this.meshOf((mb) => slabModel(mb, L.w, L.d, L.e, L.po, L.tops));
    L.lod = this.meshOf((mb) => slabLod(mb, L.w, L.d));
  }
  freeTower(T) {
    if (!T || !this.X || this.X.gl.isContextLost()) return;
    T.layers.forEach((L) => { if (L.mesh) freeMesh(this.X, L.mesh); if (L.lod) freeMesh(this.X, L.lod); L.mesh = null; L.lod = null; });
    if (T.mov) { if (T.mov.mesh) freeMesh(this.X, T.mov.mesh); if (T.mov.lod) freeMesh(this.X, T.mov.lod); T.mov.mesh = null; T.mov.lod = null; }
  }
  clearFall() {
    if (this.X && !this.X.gl.isContextLost()) this.fall.forEach((f) => { if (f.mesh) freeMesh(this.X, f.mesh); });
    this.fall.length = 0;
  }
  rebuildTower() {
    const T = this.T;
    if (T) {
      T.layers.forEach((L, i) => { if (!L.base) { this.layerMeshes(L); if (T.layers.length - i > 30 && L.mesh) { freeMesh(this.X, L.mesh); L.mesh = null; } } });
      if (T.mov) { const mv = T.mov; mv.mesh = this.meshOf((mb) => slabModel(mb, mv.w, mv.d, mv.e, [0, 0], mv.tops)); mv.lod = this.meshOf((mb) => slabLod(mb, mv.w, mv.d)); }
    }
    this.fall.forEach((f) => { f.mesh = f.spec ? this.meshOf((mb) => slabModel(mb, f.spec.w, f.spec.d, f.spec.e, f.spec.po, f.spec.tops)) : null; });
  }

  drop() {
    if (!this.canCtl()) return;
    const T = this.T;
    const top = T.layers[T.layers.length - 1];
    const c = T.cur;
    const pos = PZ.posOf(c);
    const r = PZ.place(top, c, pos, T.combo);
    const y = (T.layers.length - 1) * PZ.LH;
    const mov = T.mov;
    const ax = c.axis;
    const movX = ax === 'x' ? pos : top.x, movZ = ax === 'z' ? pos : top.z;
    this.el.tap.classList.add('on');
    setTimeout(() => this.el.tap.classList.remove('on'), 100);
    if (r.kind === 'miss') {
      // ıskalayınca kule sarsılır: kaçan katın yönüne doğru büyük bir sallantı, sonra yavaşça durulur
      {
        const S2 = this.sw || (this.sw = { x: 0, z: 0, vx: 0, vz: 0 });
        const dx = movX - top.x, dz = movZ - top.z, dl = Math.hypot(dx, dz) || 1;
        const kk = 0.05 + Math.min(0.05, T.layers.length * 0.003);
        S2.vx += (dx / dl) * kk; S2.vz += (dz / dl) * kk;
        this.wobT = this.time;
      }
      this.addFall({ x: movX, z: movZ, w: mov.w, d: mov.d }, y, mov.mesh, { w: mov.w, d: mov.d, e: mov.e, po: [0, 0], tops: mov.tops });
      if (mov.lod && this.X && !this.X.gl.isContextLost()) freeMesh(this.X, mov.lod);
      T.mov = null;
      T.out = true;
      T.outAt = this.time;
      T.cur = null;
      this.snd.fx('fall');
      setTimeout(() => this.snd.fx('out'), 350);
      vibrate([40, 40, 90]);
      this.flash('hit', 420);
      this.msg('KAÇTI! 😵', 'big', false);
      setTimeout(() => this.msg(''), 1100);
      try { this.ctx.sendQuiet ? this.ctx.sendQuiet('out', {}) : this.ctx.send('out', {}); } catch { /* yok say */ }
      return;
    }
    const L = Object.assign({}, r.layer, { ci: T.layers.length % PAL.length, tops: mov.tops });
    const alive = this.X && !this.X.gl.isContextLost();
    if (r.kind === 'perfect' || r.kind === 'land') {
      L.e = { xn: true, xp: true, zn: true, zp: true };
      L.po = [0, 0];
      if (Math.abs(L.w - mov.w) < 1e-6 && Math.abs(L.d - mov.d) < 1e-6) { L.mesh = mov.mesh; L.lod = mov.lod; }
      else { if (alive) { if (mov.mesh) freeMesh(this.X, mov.mesh); if (mov.lod) freeMesh(this.X, mov.lod); } this.layerMeshes(L); }
    } else {
      const delta = pos - (ax === 'x' ? top.x : top.z);
      const keptE = { xn: true, xp: true, zn: true, zp: true }, pieceE = { xn: true, xp: true, zn: true, zp: true };
      if (ax === 'x') { if (delta > 0) { keptE.xp = false; pieceE.xn = false; } else { keptE.xn = false; pieceE.xp = false; } }
      else if (delta > 0) { keptE.zp = false; pieceE.zn = false; } else { keptE.zn = false; pieceE.zp = false; }
      L.e = keptE;
      L.po = ax === 'x' ? [L.x - movX, 0] : [0, L.z - movZ];
      this.layerMeshes(L);
      const pc = r.piece;
      const spec = { w: pc.w, d: pc.d, e: pieceE, po: ax === 'x' ? [pc.x - movX, 0] : [0, pc.z - movZ], tops: mov.tops };
      this.addFall(pc, y, this.meshOf((mb) => slabModel(mb, spec.w, spec.d, spec.e, spec.po, spec.tops)), spec);
      if (alive) { if (mov.mesh) freeMesh(this.X, mov.mesh); if (mov.lod) freeMesh(this.X, mov.lod); }
    }
    T.layers.push(L);
    T.h += 1;
    if (r.kind === 'perfect') {
      T.combo += 1;
      T.perf += 1;
      this.snd.fx('perfect', Math.min(8, T.combo - 1));
      vibrate(14);
      this.perfectFx(L, y, T.combo);
    } else if (r.kind === 'land') {
      // ilk kat: tahtaya yumuşak iniş (kesik yok, seri başlamaz)
      this.snd.fx('drop');
      vibrate(10);
    } else {
      T.combo = 0;
      this.snd.fx('cut');
      this.cutFx(L, y, ax, delta0(pos, top, ax));
      { const dd = delta0(pos, top, ax), k = clamp(Math.abs(dd) * 0.08 + 0.01, 0, 0.045) * Math.sign(dd || 1); const S2 = this.sw || (this.sw = { x: 0, z: 0, vx: 0, vz: 0 }); if (ax === 'x') S2.vx += k; else S2.vz += k; }
      vibrate(8);
    }
    T.best = Math.max(T.best, T.h);
    T.cur = PZ.mover(T.seed, T.h + 1);
    this.spawnMover(T);
    // derindeki katlar: ayrıntılı modeli bırak (bellek), basit kutu kalsın
    const n = T.layers.length;
    const old = T.layers[n - 31];
    if (old && old.mesh && alive) { freeMesh(this.X, old.mesh); old.mesh = null; }
    this.bump = 1;
    try { const p = { p: r.kind === 'perfect' ? 1 : 0 }; this.ctx.sendQuiet ? this.ctx.sendQuiet('drop', p) : this.ctx.send('drop', p); } catch { /* yok say */ }
  }
  addFall(pc, y, mesh, spec) {
    this.fall.push({ x: pc.x, y, z: pc.z, w: pc.w, d: pc.d, mesh, spec, vy: 0.5, vx: (Math.random() - 0.5) * 1.4, vz: (Math.random() - 0.5) * 1.4, ry: 0, rx: 0, rz: 0, wy: (Math.random() - 0.5) * 3, wx: (Math.random() - 0.5) * 3, ci: 1, life: 2.2 });
    this.shake = Math.max(this.shake, 0.18);
  }
  perfectFx(lay, y, combo) {
    this.flashPerf = 1;
    this.floatLabel(combo >= 2 ? `MÜKEMMEL ×${combo}` : 'MÜKEMMEL!', '#ffe27a');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.parts.push({ x: lay.x + Math.cos(a) * lay.w * 0.5, y: y + 0.12, z: lay.z + Math.sin(a) * lay.d * 0.5, vx: Math.cos(a) * 1.6, vy: 0.6, vz: Math.sin(a) * 1.6, life: 0.55, max: 0.55, s: 0.06, r: 1, g: 0.88, b: 0.4, add: true, grav: 0, drag: 2.2 });
    }
    // un tozu
    for (let i = 0; i < 10; i++) this.parts.push({ x: lay.x + (Math.random() - 0.5) * lay.w, y: y + 0.05, z: lay.z + (Math.random() - 0.5) * lay.d, vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.6, life: 0.9, max: 0.9, s: 0.035, r: 1, g: 0.97, b: 0.9, add: false, grav: -0.2, drag: 2.5 });
  }
  cutFx(lay, y, ax, dl) {
    // bıçak çizgisinde kırıntı ve peynir telleri
    const cx = ax === 'x' ? lay.x + (dl > 0 ? lay.w / 2 : -lay.w / 2) : lay.x;
    const cz = ax === 'z' ? lay.z + (dl > 0 ? lay.d / 2 : -lay.d / 2) : lay.z;
    const span = ax === 'x' ? lay.d : lay.w;
    for (let i = 0; i < 16; i++) {
      const t = (Math.random() - 0.5) * span;
      const crumb = Math.random() < 0.6;
      const c = crumb ? (Math.random() < 0.5 ? PC.crumb : PC.side2) : PC.cheeseL;
      this.parts.push({ x: cx + (ax === 'x' ? 0 : t), y: y + 0.08 + Math.random() * 0.12, z: cz + (ax === 'z' ? 0 : t), vx: (Math.random() - 0.5) * 1.6, vy: 0.6 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.6, life: 0.8, max: 0.8, s: crumb ? 0.022 : 0.016, r: c[0], g: c[1], b: c[2], add: false, grav: 7, drag: 1.2 });
    }
  }
  floatLabel(text, color) {
    const s = document.createElement('span');
    s.className = 'fl';
    s.textContent = text;
    s.style.color = color;
    const W = this.vw || 300, Hh = this.vh || 500;
    s.style.transform = `translate(${W / 2}px, ${Hh * 0.36}px) translate(-50%, -50%)`;
    this.el.fx.appendChild(s);
    setTimeout(() => s.remove(), 850);
  }
  flash(cls, ms = 380) {
    const v = this.el.vig;
    v.classList.add(cls);
    setTimeout(() => v.classList.remove(cls), ms);
  }

  /* ---------- sunucudan gelen durum ---------- */
  emoAnchor(pid) {
    // yalnızca kendi kulem ekranda: diğerleri üstte isimle görünür
    const T = this.T;
    if (pid !== this.ctx.me || !T || !T.layers || !T.layers.length) return null;
    const top = T.layers[T.layers.length - 1];
    return this.emoProj(top.x, this.topY(T) + 0.55, top.z);
  }
  // ekran konumu (tepki baloncuğu için): dünya noktası → piksel
  emoProj(x, y, z) {
    const m = this.mats && this.mats.VP;
    if (!m) return null;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    const W = this.vw || this.el.wrap.clientWidth || 1, H = this.vh || this.el.wrap.clientHeight || 1;
    return [((cx / cw) * 0.5 + 0.5) * W, (1 - ((cy / cw) * 0.5 + 0.5)) * H];
  }
  emoIdx(pid) { const P = this.view && this.view.players; return P ? P.findIndex((p) => p.id === pid) : -1; }
  emoName(pid) {
    const v = this.view || {};
    const L = v.players || v.racers || [];
    const p = L.find((x) => x.id === pid);
    if (p) return p.n;
    const sb = (v.scoreboard || []).find((x) => x.id === pid);
    return sb ? sb.nickname || sb.n || '' : '';
  }
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.pz !== '1') {
      root.dataset.pz = '1';
      root.innerHTML = '<p class="py-16 text-center">🍕</p>';
    }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    if (v.phase === 'ready' && v.startAt) {
      const k = `r|${v.startAt}`;
      if (this.key !== k) { this.key = k; this.T = this.freshTower(7, false); this.lastBeep = 99; this.lbKey = ''; this.el.cb.classList.remove('on'); }
    }
    if (v.phase === 'play' && v.seed) {
      const k = `p|${v.startAt}|${v.seed}`;
      if (this.key !== k) {
        this.key = k;
        this.T = this.freshTower(v.seed, v.me >= 0);
        this.parts.length = 0;
        this.clearFall();
        this.lbKey = '';
      }
    }
    if (!prev || prev.phase !== v.phase || prev.round !== v.round) this.onPhase(prev, v);
    this.panel();
  }

  onPhase(prev, v) {
    const p = v.phase;
    if (p === 'ready') { this.snd.music('idle'); this.msg(''); this.panelKey = ''; }
    else if (p === 'play') { this.snd.music('race'); }
    else if (p === 'result') {
      this.msg('');
      this.snd.music('calm');
      const me = (v.results || []).find((r) => r.id === this.ctx.me);
      if (me && me.place === 1) { setTimeout(() => this.snd.fx('win'), 250); this.confetti(0, 2, 36); } else this.snd.fx('lose');
    } else if (p === 'final') {
      this.msg('');
      this.snd.music('calm');
      try { sfx.play('tada'); } catch { /* yok */ }
    }
  }

  /* ---------- paneller ---------- */
  panel() {
    const v = this.view;
    if (!v) return;
    const ctx = this.ctx;
    const sNow = ctx.serverNow();
    let key = v.phase;
    let html = '';
    let low = false;
    const chips = (list) => list.map((r) => `<span class="chip"><i style="background:${pcol(r.c)}"></i>${esc(r.n)}${r.id === ctx.me ? ' (sen)' : ''}</span>`).join('');
    if (v.phase === 'loading') {
      html = '<div class="card"><div class="tt">🍕 Hazırlanıyor…</div></div>';
    } else if (v.phase === 'ready') {
      const left = v.startAt - sNow;
      if (left > 3300) {
        const first = v.round === 1;
        const canGo = ctx.isHost && first;
        key = `ready|${v.round}|${v.players.map((r) => r.id + r.n).join(',')}|${canGo}`;
        html = `<div class="card">
          <div class="tt">🍕 Pizza Kulesi</div>
          <div class="sub">${v.round}/${v.rounds}. tur · ${v.players.length} pizzacı</div>
          <div class="sub">Herkes kendi kulesini yapar — en yüksek kule turu kazanır!</div>
          ${first ? `<div class="pz-menu">
            <div><b>👆</b><span>Ekrana dokun = kayan pizza katını bırak (bilgisayarda Boşluk)</span></div>
            <div><b>🎯</b><span>Tam üstüne denk getir = MÜKEMMEL, kat geri büyür</span></div>
            <div><b>✂️</b><span>Taşan kısım kesilir, kat küçülür. Tamamen kaçırırsan kule biter</span></div>
            <div><b>⚡</b><span>Kat çıktıkça hızlanır — son kalan kule değil, en yüksek kule kazanır</span></div>
          </div>` : ''}
          <div class="who">${chips(v.players)}</div>
          <div class="cd"><span>${v.playing ? 'Fırın hazırlanıyor' : 'Bu turu izleyeceksin'}</span><b data-cd></b></div>
          ${canGo ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}
        </div>`;
        low = true;
      } else key = 'count';
    } else if (v.phase === 'play') {
      key = 'play';
    } else if (v.phase === 'result') {
      key = `result|${v.round}|${ctx.isHost}`;
      const win = v.results[0];
      html = `<div class="card">
        <div class="tt">🏆 ${esc(win?.nickname || '')} ${win?.h || 0} katla birinci!</div>
        <div class="sub">${v.round}/${v.rounds}. tur sonucu</div>
        <ol class="res">${v.results.map((r, i) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">🍕×${r.h}${r.perf ? ` · 🎯${r.perf}` : ''}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
        <div class="cd"><span>${v.last ? 'Genel sonuçlar' : 'Sonraki tur'}</span><b data-cd></b></div>
        ${ctx.isHost ? `<button class="kb btn" data-game-action="next">${v.last ? 'Sonuçlara geç ▶' : 'Sonraki tur ▶'}</button>` : ''}
      </div>`;
    } else if (v.phase === 'final') {
      const sb = v.scoreboard || [];
      key = `final|${sb.map((s) => s.id + s.score).join(',')}|${ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🍕 Pizza ustası: ${esc(sb[0]?.nickname || '—')}</div>
        <div class="sub">${v.best ? `En yüksek kule: <b>${v.best.h} kat</b> (${esc(v.best.nickname)})` : 'Oyun bitti'}</div>
        ${podiumHTML(sb, ctx.me)}
        <ol class="res">${sb.map((s, i) => `<li class="${s.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(s.c)}"></i><span class="nm">${esc(s.nickname)}</span><span class="p">${s.score}</span></li>`).join('')}</ol>
        ${ctx.isHost ? '<button class="kb btn" data-game-action="restart">Yeniden oyna 🔁</button><button class="kb alt btn" data-act="exit-game">← Oyunlara dön</button>' : `<p class="hint">Yeni oyunu ${esc(ctx.hostName)} başlatacak.</p>`}
      </div>`;
    }
    if (key !== this.panelKey) {
      this.panelKey = key;
      const p = this.el.panel;
      p.innerHTML = html;
      p.classList.toggle('on', !!html);
      p.classList.toggle('low', low);
      this.cdEl = p.querySelector('[data-cd]');
      this.goBtn = p.querySelector('[data-game-action="go"]');
      this.panelLow = low && !!html;
    }
  }
  msg(text, cls = '', stay = false) {
    if (!text) { this.el.msg.innerHTML = ''; return; }
    this.el.msg.innerHTML = `<span class="${cls}${stay ? ' stay' : ''}">${text}</span>`;
  }

  /* ---------- HUD ---------- */
  hud(sNow) {
    const v = this.view;
    if (!v) return;
    const t = this.simNow();
    const T = this.T;
    const live = v.phase === 'ready' || v.phase === 'play';
    const showHud = (live && !!v.startAt) || v.phase === 'result';
    const vis = showHud ? 'visible' : 'hidden';
    if (this.el.hud.style.visibility !== vis) this.el.hud.style.visibility = vis;
    if (v.phase === 'ready' || (v.phase === 'play' && t < 0.6)) {
      const left = -t;
      const n = Math.ceil(left);
      if (left > 0 && left <= 3 && n !== this.lastBeep) { this.lastBeep = n; this.msg(String(n), 'big'); this.snd.fx('beep'); }
      if (left <= 0 && this.lastBeep > 0 && this.lastBeep < 99) { this.lastBeep = 0; this.msg('BAŞLA!', 'big gold'); this.snd.fx('go'); vibrate(40); setTimeout(() => { if (this.view?.phase === 'play') this.msg(''); }, 800); }
    }
    if (this.cdEl) {
      const end = v.phase === 'ready' ? v.startAt : v.endsAt;
      const s = Math.max(0, Math.ceil((end - sNow) / 1000));
      if (this.cdEl.textContent !== String(s)) this.cdEl.textContent = String(s);
    }
    if (this.goBtn) {
      const vv = v.phase === 'ready' && v.startAt - sNow > 3900 ? 'visible' : 'hidden';
      if (this.goBtn.style.visibility !== vv) this.goBtn.style.visibility = vv;
    }
    if (v.phase === 'ready' && (v.startAt - sNow <= 3300) !== (this.panelKey === 'count')) this.panel();
    const playing = v.phase === 'play' && v.me >= 0 && !!T && T.live;
    const ctl = playing && !T.out && !this.panelLow;
    this.el.tap.classList.toggle('off', !ctl);
    const small = playing && T.h >= 3;
    if (small !== this.tapSmall) { this.tapSmall = small; this.el.tap.classList.toggle('min', small); }
    this.el.big.style.display = (v.phase === 'play' || (v.phase === 'ready' && t > -3.3)) && T && v.me >= 0 && !this.panelLow ? '' : 'none';
    if (T) {
      const hs = String(T.h);
      if (this.el.bigN.textContent !== hs) { this.el.bigN.textContent = hs; this.el.bigN.classList.add('pop'); setTimeout(() => this.el.bigN.classList.remove('pop'), 130); }
    }
    const cbOn = !!T && T.combo >= 2 && !T.out && v.phase === 'play';
    this.el.cb.classList.toggle('on', cbOn);
    if (cbOn) { const s = `🎯 Seri ×${T.combo}${T.combo >= 4 ? ' · kat büyüyor!' : ''}`; if (this.el.cb.textContent !== s) this.el.cb.textContent = s; }
    let note = '';
    if (v.phase === 'play' && v.me < 0) note = '👀 Bu turu izliyorsun — sonrakinde sen de varsın!';
    else if (v.phase === 'play' && T && T.out) note = `💥 Kulen ${T.h} katta devrildi! Diğerleri bitirene kadar izle 👀`;
    if (note !== this.noteText) { this.noteText = note; this.el.note.textContent = note; this.el.note.classList.toggle('on', !!note); }
    if (!showHud) return;
    const left = v.phase === 'play' ? Math.max(0, (v.endsAt - sNow) / 1000) : 0;
    const mm = Math.floor(left / 60), ss = Math.floor(left % 60);
    const tt = v.phase === 'result' ? '🏁' : v.phase === 'ready' ? `${Math.floor(PZ_TIME / 60)}:${String(PZ_TIME % 60).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
    if (tt !== this.ttText) { this.ttText = tt; this.el.tm.textContent = tt; }
    if (v.phase === 'play' && left < 10 && left > 0 && Math.ceil(left) !== this.lastTick) { this.lastTick = Math.ceil(left); this.snd.fx('tick'); }
    this.leaderboard();
  }
  leaderboard() {
    const v = this.view;
    if (!v || v.phase !== 'play' || !v.pl) { if (this.lbKey !== 'x') { this.lbKey = 'x'; this.el.lb.innerHTML = ''; } return; }
    const rows = v.players.map((p, i) => ({ i, p, h: v.pl[i][0], pf: v.pl[i][1], out: v.pl[i][2] }));
    // yerel kule daha güncel: kendi satırını yerelden göster
    const T = this.T;
    if (T && v.me >= 0 && rows[v.me]) { rows[v.me].h = Math.max(rows[v.me].h, T.h); rows[v.me].pf = Math.max(rows[v.me].pf, T.perf); rows[v.me].out = T.out ? 1 : rows[v.me].out; }
    rows.sort((a, b) => (b.h * 10 + b.pf * 3) - (a.h * 10 + a.pf * 3));
    let show = rows.slice(0, LBL_CAP);
    const mi = rows.findIndex((r) => r.i === v.me);
    if (mi >= LBL_CAP) show = show.slice(0, LBL_CAP - 1).concat([rows[mi]]);
    const key = show.map((r) => `${r.i}:${r.h}:${r.out}`).join('|') + `#${mi}`;
    if (key === this.lbKey) return;
    this.lbKey = key;
    this.el.lb.innerHTML = show.map((r) => `<div class="${r.i === v.me ? 'me' : ''}${r.out ? ' out' : ''}"><em>${rows.indexOf(r) + 1}</em><i style="background:${pcol(r.p.c)}"></i><span>${esc(r.p.n)}</span><b>${r.out ? '✖ ' : ''}${r.h}</b></div>`).join('');
    if (mi >= 0 && v.me >= 0) {
      this.el.posB.textContent = String(mi + 1);
      this.el.posS.textContent = `/${rows.length}`;
    }
  }

  /* ---------- 3B dünya ---------- */
  mk(fn, kind = 'lit') { const mb = new MB(kind); fn(mb); return mb.build(this.X); }
  buildWorld() {
    const X = this.X;
    if (!X || this.lost) return;
    this.freeWorld();
    const ac = this.brand.slug === 'nfc' ? '#2f6b4f' : this.brand.accentHex;
    this.W = {
      tray: this.mk(trayModel),
      trayTop: this.mk(trayTopModel, 'tex'),
      floor: this.mk(pzFloor),
      counter: this.mk((mb) => pzCounter(mb, ac)),
      walls: this.mk(pzWalls),
      city: this.mk(pzCity),
      oven: this.mk(pzOven),
      dome: this.mk(pzOvenDome, 'tex'),
      flame: this.mk(ovenFlame),
      shelves: this.mk((mb) => { pzShelves(mb); pzBoxes(mb); pzChalkFrame(mb); pzLamps(mb); }),
      chalk: this.mk(pzChalk, 'tex'),
      neon: this.mk(pzNeon, 'tex'),
      boxTop: this.mk(pzBoxTop, 'tex'),
    };
    this.chalkCv = document.createElement('canvas');
    this.chalkCv.width = 512; this.chalkCv.height = 336;
    drawChalk(this.chalkCv, this.brand, this.res.img);
    this.chalkTex = makeTexture(X, this.chalkCv);
    this.chalkImg = !!this.res.img;
    this.brickCv = document.createElement('canvas');
    drawOvenBricks(this.brickCv);
    this.brickTex = makeTexture(X, this.brickCv);
    this.neonCv = document.createElement('canvas');
    this.neonCv.width = 512; this.neonCv.height = 128;
    drawNeon(this.neonCv, this.brand);
    this.neonTex = makeTexture(X, this.neonCv);
    try { document.fonts?.ready?.then(() => { if (this.dead || !this.X || this.X.gl.isContextLost() || !this.neonTex) return; drawNeon(this.neonCv, this.brand); updateTexture(this.X, this.neonTex, this.neonCv); drawChalk(this.chalkCv, this.brand, this.res?.img); updateTexture(this.X, this.chalkTex, this.chalkCv); }); } catch { /* yok say */ }
  }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; return; }
    Object.values(W).forEach((m) => freeMesh(this.X, m));
    [this.chalkTex, this.neonTex, this.brickTex].forEach((t) => { if (t) this.X.gl.deleteTexture(t); });
    this.chalkTex = this.neonTex = this.brickTex = null;
    this.W = null;
  }
  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.W = null;
      this.buildWorld();
      this.rebuildTower();
    } catch (e) { console.warn('[pizza] geri yükleme', e); }
  }

  /* ---------- parçacıklar ---------- */
  confetti(x, z, n) {
    const cols = ['#ff3b30', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#ffffff'].map(hexRGB);
    for (let i = 0; i < n && this.parts.length < 680; i++) {
      const c = cols[i % cols.length];
      this.parts.push({ x: x + (Math.random() - 0.5) * 3, y: 3 + Math.random() * 2, z: z + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 4 + 1, vz: (Math.random() - 0.5) * 5, life: 2 + Math.random() * 1.2, max: 3.2, s: 0.11 + Math.random() * 0.07, r: c[0], g: c[1], b: c[2], add: false, grav: 3.2, drag: 1.2, conf: true });
    }
  }
  stepParts(dt) {
    const P = this.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k;
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    const F = this.fall;
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i];
      f.life -= dt;
      if (f.life <= 0 || f.y < -6) { if (f.mesh && this.X && !this.X.gl.isContextLost()) freeMesh(this.X, f.mesh); F.splice(i, 1); continue; }
      f.vy -= 12 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.rx += f.wx * dt; f.rz += f.wy * dt;
    }
  }
  fillParts(V) {
    const rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    let na = 0, nb = 0;
    const A = this.pA, B = this.pB;
    for (const p of this.parts) {
      const add = p.add;
      const arr = add ? B : A;
      let o = (add ? nb : na) * 7;
      if (o + 126 > arr.length) continue;
      const k = p.life / p.max;
      const a = p.conf ? Math.min(1, k * 2.5) : k;
      const s = p.s;
      const o0 = o;
      if (p.conf || p.streak) {
        // köşeler önceden ayrılmış diziye yazılır: kare başına yüzlerce küçük dizi (çöp toplama takılması) olmasın
        const C = this.qc || (this.qc = new Float32Array(12));
        C[0] = p.x - rx * s - ux * s; C[1] = p.y - ry * s - uy * s; C[2] = p.z - rz * s - uz * s;
        C[3] = p.x + rx * s - ux * s; C[4] = p.y + ry * s - uy * s; C[5] = p.z + rz * s - uz * s;
        C[6] = p.x + rx * s + ux * s; C[7] = p.y + ry * s + uy * s; C[8] = p.z + rz * s + uz * s;
        C[9] = p.x - rx * s + ux * s; C[10] = p.y - ry * s + uy * s; C[11] = p.z - rz * s + uz * s;
        for (let j = 0; j < 6; j++) { const q = (j < 3 ? j : j === 3 ? 0 : j - 2) * 3; arr[o++] = C[q]; arr[o++] = C[q + 1]; arr[o++] = C[q + 2]; arr[o++] = p.r; arr[o++] = p.g; arr[o++] = p.b; arr[o++] = a; }
      }
      else o = emitSoft(arr, o, p.x, p.y, p.z, s, p.r, p.g, p.b, a, rx, ry, rz, ux, uy, uz);
      if (add) nb += (o - o0) / 7; else na += (o - o0) / 7;
    }
    return [na, nb];
  }

  /* ---------- kamera + çizim ---------- */
  // Kulenin sallanması (birim yükseklik başına yatay kayma): yay + yükseldikçe artan hafif salınım
  stepSway(dt) {
    const S2 = this.sw || (this.sw = { x: 0, z: 0, vx: 0, vz: 0 });
    const T = this.T;
    const n = T && T.layers && !T.out ? T.layers.length : 0;
    const wob = this.time - (this.wobT ?? -99) < 2.6;      // ıskalama sarsıntısı sürüyor
    const k = wob ? 4.2 : 5.5, c = wob ? 0.55 : 0.9;
    const drive = Math.min(0.008, n * 0.0002);
    const tx = drive * Math.sin(this.time * 1.25), tz = drive * Math.sin(this.time * 0.95 + 1.3);
    S2.vx += (-(S2.x - tx) * k - S2.vx * c) * dt;
    S2.vz += (-(S2.z - tz) * k - S2.vz * c) * dt;
    S2.x += S2.vx * dt; S2.z += S2.vz * dt;
    if (!n && !wob) { S2.x *= 0.9; S2.z *= 0.9; }
  }
  stepCam(dt) {
    const c = this.cam;
    const vw = this.vw || 1, vh = this.vh || 1;
    const asp = vw / vh;
    const land = asp > 1.1;
    const fovy = land ? 0.8 : 0.9;
    this.fov = fovy;
    const T = this.T;
    const topY = T ? this.topY(T) : 0.4;
    const tV = Math.tan(fovy / 2), tH = tV * Math.min(asp, 2);
    const pitch = land ? 0.44 : 0.52;
    const halfW = 1.75;
    let D = Math.max(halfW / tH, land ? 6.6 : 7.2);
    let ty = Math.max(0.9, topY - (land ? 0.3 : 0.5));
    if (T && T.out) {
      // devrilince tüm kuleyi göster
      ty = Math.max(0.9, topY * 0.5 + 0.2);
      D = Math.max(D, (topY * 0.5 + 2.4) / (tV * 0.85) / Math.cos(pitch) * 0.7);
    }
    c.D = damp(c.D, D, 3, dt);
    c.ty = damp(c.ty, ty, 3.5, dt);
    c.yaw = 0.8 + Math.sin(this.time * 0.35) * 0.05;
    const sh = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    this.shake = Math.max(0, this.shake - dt * 0.9);
    const sx = this.sw ? this.sw.x * c.ty * 0.85 : 0, sz = this.sw ? this.sw.z * c.ty * 0.85 : 0;
    c.ex = sx + Math.sin(c.yaw) * c.D * Math.cos(pitch) + sh;
    c.ey = c.ty + c.D * Math.sin(pitch) + sh * 0.6;
    c.ez = sz + Math.cos(c.yaw) * c.D * Math.cos(pitch);
    c.tx = sx; c.tz = sz;
  }
  resize() {
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    const W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return [W, H, w / h];
  }
  draw() {
    const X = this.X;
    const Wd = this.W;
    if (!X || this.lost || !Wd) { if (!X) this.draw2d(); return; }
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const c = this.cam;
    const mt = this.mats;
    const T = this.T;
    M.persp(mt.P, this.fov, asp, 0.3, 200);
    M.look(mt.V, c.ex, c.ey, c.ez, c.tx, c.ty, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const topY = T ? this.topY(T) : 0.4;
    const F = { VP: mt.VP, V: mt.V, fov: this.fov, asp, shift: 0, cx: c.ex, cy: c.ey, cz: c.ez, sun: PSUN, fog: PFOG, lx: 1.2, ly: topY + 2.4, lz: 1.6, lampC: PLIGHT.lampC };
    const setFog = (p) => { if (p.u.uFogR) gl.uniform2f(p.u.uFogR, c.D * 2.2, c.D * 2.2 + 60); };
    const m = mt.a;
    const LH = PZ.LH;
    let movPos = null;
    if (T && T.cur && !T.out && T.mov) {
      const top = T.layers[T.layers.length - 1];
      const pos = PZ.posOf(T.cur);
      movPos = [T.cur.axis === 'x' ? pos : top.x, (T.layers.length - 1) * LH, T.cur.axis === 'z' ? pos : top.z];
    }
    // kule katları, kayan kat ve düşen parçalar (gölge ve ana çizim ortak)
    const swX = this.sw ? this.sw.x : 0, swZ = this.sw ? this.sw.z : 0;
    const towerDraw = (D, shadow) => {
      if (!T) return;
      const n = T.layers.length;
      for (let i = 1; i < n; i++) {
        const L = T.layers[i];
        const mesh = shadow ? L.lod || L.mesh : n - i > 28 || !L.mesh ? L.lod : L.mesh;
        if (!mesh) continue;
        const yy = (i - 1) * LH;
        M.set(m, L.x + swX * yy, yy, L.z + swZ * yy);
        D(mesh, m);
      }
      if (movPos) { M.set(m, movPos[0] + swX * movPos[1], movPos[1], movPos[2] + swZ * movPos[1]); D(shadow ? T.mov.lod || T.mov.mesh : T.mov.mesh || T.mov.lod, m); }
      this.fall.forEach((f) => {
        if (!f.mesh) return;
        M.set(m, f.x, f.y, f.z, 0, f.rx, f.rz, 1);
        D(f.mesh, m);
      });
    };
    // ---- gerçek gölgeler: kule kendi üstüne ve tezgâha, fırın/raflar tezgâha ----
    if (shadowBegin(X, PSUN, 0, topY * 0.45, 0, 5.2 + topY * 0.32, topY + 16)) {
      const cast = (mesh, mm) => shadowCast(X, mesh, mm);
      M.set(m, 0, 0, 0);
      cast(Wd.counter, m); cast(Wd.oven, m); cast(Wd.dome, m); cast(Wd.shelves, m); cast(Wd.tray, m);
      towerDraw(cast, true);
    }
    shadowEnd(X, Wp, Hp);
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(PFOG[0], PFOG[1], PFOG[2], 1);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.depthMask(false);
    gl.disable(gl.DEPTH_TEST);
    drawSky(X, Object.assign({}, F, { top: PSKY.top, hor: PSKY.hor, fog: PSKY.fog, sunVis: PSKY.sunVis }), PSKY);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    useProg(X, X.lit, F, PLIGHT);
    M.set(m, 0, 0, 0);
    // uzaktaki şehir: kendi sis aralığıyla (yalnızca kule duvarların üstüne çıkınca görünür)
    if (c.ey > CEIL - 1.5) {
      gl.uniform2f(X.lit.u.uFogR, 30, 140);
      gl.uniform3fv(X.lit.u.uFog, PSKY.fog);
      drawMesh(X, Wd.city, m, ONE3);
      gl.uniform3fv(X.lit.u.uFog, PFOG);
    }
    setFog(X.lit);
    aoOn(X, FLR, 0.9, 0.35);
    detailOn(X, 0.18, 0.5);
    drawMesh(X, Wd.floor, m, ONE3);
    drawMesh(X, Wd.walls, m, ONE3);
    drawMesh(X, Wd.counter, m, ONE3);
    detailOn(X, 0);
    drawMesh(X, Wd.oven, m, ONE3);
    drawMesh(X, Wd.shelves, m, ONE3);
    drawMesh(X, Wd.tray, m, ONE3);
    // dokulu yüzeyler: kara tahta menü, neon tabela, pizza kutusundaki logo
    if (!this.chalkImg && this.res.img && this.chalkTex) { this.chalkImg = true; drawChalk(this.chalkCv, this.brand, this.res.img); updateTexture(X, this.chalkTex, this.chalkCv); }
    useProg(X, X.tex, F, PLIGHT);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.res.wood('maple'));
    M.set(m, 0, 0, 0);
    drawMesh(X, Wd.trayTop, m, new Float32Array([0.76, 0.62, 0.47]));
    if (this.brickTex) { gl.bindTexture(gl.TEXTURE_2D, this.brickTex); drawMesh(X, Wd.dome, m, new Float32Array([0.95, 0.9, 0.86])); }
    gl.uniform1f(X.tex.u.uSelf, 0.25);
    gl.bindTexture(gl.TEXTURE_2D, this.chalkTex);
    drawMesh(X, Wd.chalk, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 0.15);
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    drawMesh(X, Wd.boxTop, m, ONE3);
    gl.uniform1f(X.tex.u.uSelf, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.neonTex);
    const nf = 0.92 + 0.08 * Math.sin(this.time * 31) * Math.sin(this.time * 7);
    drawMesh(X, Wd.neon, m, new Float32Array([nf, nf, nf]));
    useProg(X, X.lit, F, PLIGHT);
    setFog(X.lit);
    towerDraw((mesh, mm) => drawMesh(X, mesh, mm, ONE3), false);
    // fırının içindeki canlı ateş
    {
      const by = CT + 0.32, fx0 = OVEN.x + 0.55, t = this.time;
      for (let k = 0; k < 7; k++) {
        const zz = OVEN.z - 0.22 + (k - 3) * 0.085 + Math.sin(t * 3 + k) * 0.02;
        const h = 0.46 + 0.2 * Math.sin(t * (9 + k * 1.7) + k * 2.1) * Math.sin(t * (5.3 + k) + k) + (k === 3 ? 0.14 : 0) - Math.abs(k - 3) * 0.05;
        const w = 1.05 + 0.3 * Math.sin(t * 7 + k);
        M.set(m, fx0 + Math.sin(k * 1.9) * 0.08, by + 0.04, zz, t * 0.5 + k, Math.sin(t * 6 + k) * 0.12, Math.sin(t * 4.3 + k * 1.3) * 0.18, w, h, w);
        drawMesh(X, Wd.flame, m, ONE3, 1, 1.15);
      }
      if (Math.random() < 0.35 && this.parts.length < 600) {
        this.parts.push({ x: fx0 + 0.3, y: by + 0.25, z: OVEN.z - 0.22 + (Math.random() - 0.5) * 0.3, vx: 0.5 + Math.random() * 0.6, vy: 0.6 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.4, life: 0.8, max: 0.8, s: 0.025, r: 1, g: 0.6 + Math.random() * 0.3, b: 0.2, add: true, grav: -0.3, drag: 1.2 });
      }
    }
    // saydam: tepsi gölgesi, hedef parıltısı, parçacıklar
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, PLIGHT);
    setFog(X.un);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    M.set(m, 0, CT + 0.004, 0, 0, 0, 0, 2.15, 1, 2.15);
    drawMesh(X, this.res.shadow, m, ONE3, 0.55);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    {
      // fırın ağzı, sarkıt lambalar ve neon: kameraya dönük yumuşak parlamalar + tezgâhta ışık havuzları
      const fl = 0.85 + 0.15 * Math.sin(this.time * 13) * Math.sin(this.time * 4.1 + 1);
      const face = (x, y, z, s, col, a) => { M.set(m, x, y, z, c.yaw, Math.PI / 2 - 0.5, 0, s); drawMesh(X, this.res.glow, m, col, a); };
      face(OVEN.x + OVEN.r * 0.95, CT + 0.62, OVEN.z, 1.25, [1, 0.5, 0.15], 0.55 * fl);
      M.set(m, OVEN.x + OVEN.r + 0.9, CT + 0.006, OVEN.z, 0, 0, 0, 1.6, 1, 1.9);
      drawMesh(X, this.res.glow, m, [1, 0.45, 0.12], 0.32 * fl);
      LAMPS.forEach(([x, z]) => {
        face(x, LAMP_Y - 0.02, z, 0.5, [1, 0.85, 0.55], 0.6);
        M.set(m, x, CT + 0.006, z, 0, 0, 0, 1.3, 1, 1.3);
        drawMesh(X, this.res.glow, m, [1, 0.82, 0.5], 0.14);
      });
      const nc = hexRGB(this.brand.slug === 'nfc' ? '#ff5a8a' : this.brand.accentHex);
      M.set(m, (NEON.x0 + NEON.x1) / 2, (NEON.y0 + NEON.y1) / 2, WA + 0.12, 0, Math.PI / 2, 0, 2.3, 1, 0.75);
      drawMesh(X, this.res.glow, m, nc, 0.35);
    }
    if (T && T.cur && !T.out && this.view?.phase === 'play') {
      const top = T.layers[T.layers.length - 1];
      const k = 0.16 + 0.07 * Math.sin(this.time * 6) + (this.flashPerf || 0) * 0.5;
      M.set(m, top.x, (T.layers.length - 1) * LH + 0.012, top.z, 0, 0, 0, top.w * 0.85 + 0.2, 1, top.d * 0.85 + 0.2);
      drawMesh(X, this.res.glow, m, [1, 0.85, 0.35], k);
    }
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    postFX(X, Wp, Hp, { bloom: 0.62, th: 0.72, white: 0.15, sat: 1.08, con: 0.14, vig: 0.7 });
  }
  // WebGL yoksa: yandan görünüm
  draw2d() {
    const g = this.g2;
    const cv = this.el.cv;
    if (!g) return;
    const w = this.el.wrap.clientWidth || 1, h = this.el.wrap.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#2c1f1a'; g.fillRect(0, 0, w, h);
    const T = this.T;
    if (!T) return;
    const sc = Math.min(w / 5, h / 9);
    const baseY = h * 0.82 - Math.max(0, T.layers.length - 14) * 0 ;
    const LHp = sc * PZ.LH * 1.5;
    const off = Math.max(0, T.layers.length - 16) * LHp;
    T.layers.forEach((L, i) => {
      g.fillStyle = PAL[L.ci % PAL.length][0];
      g.fillRect(w / 2 + (L.x - L.w / 2) * sc, baseY - (i + 1) * LHp + off, L.w * sc, LHp * 0.95);
    });
    if (T.cur && !T.out) {
      const top = T.layers[T.layers.length - 1];
      const pos = PZ.posOf(T.cur);
      const ax = T.cur.axis;
      const x = ax === 'x' ? pos : top.x;
      g.fillStyle = PAL[T.layers.length % PAL.length][1];
      g.fillRect(w / 2 + (x - top.w / 2) * sc, baseY - (T.layers.length + 1) * LHp + off, top.w * sc, LHp * 0.95);
    }
  }

  /* ---------- ana döngü ---------- */
  frame(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.frameB);
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!(dt > 0)) dt = 0.016;
    const raw = dt;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    try {
      this.vw = this.el.wrap.clientWidth;
      this.vh = this.el.wrap.clientHeight;
      const sNow = this.ctx.serverNow();
      const T = this.T;
      if (this.snd) this.snd.int = T && T.layers ? clamp((T.layers.length - 1) / 24, 0, 1) : 0;
      if (T && T.cur && !T.out) {
        const v = this.view;
        if (v && v.phase === 'play' && T.live) { if (this.simNow() > 0) T.cur.t += dt; } else if (v && v.phase === 'ready') T.cur.t += dt;
      }
      if (this.flashPerf) this.flashPerf = Math.max(0, this.flashPerf - dt * 3);
      this.stepParts(dt);
      this.stepSway(dt);
      this.stepCam(dt);
      this.draw();
      this.hud(sNow);
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[pizza]', e); }
    }
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    try { this.emo && this.emo.dispose(); } catch { /* yok say */ }
    cancelAnimationFrame(this.raf);
    this.snd.stopAll();
    window.removeEventListener('keydown', this.onKey);
    try {
      if (this.X && !this.X.gl.isContextLost()) {
        this.freeTower(this.T);
        this.clearFall();
        this.freeWorld();
        this.res?.dispose();
        this.X.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch { /* yok say */ }
    this.el.wrap.remove();
    document.documentElement.style.overflow = this.prevOverflow || '';
  }
}

const PZ_TIME = 75;
let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new Game(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[pizza]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

// Test ve hata ayıklama için (oyunda kullanılmaz)
export const _dbg = () => ({ G, PZ });
