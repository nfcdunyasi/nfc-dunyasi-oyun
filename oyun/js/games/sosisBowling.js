// Sosis Bowling — 3D bowling (NFC Dünyası Oyun)
// Kurye Yarışı'nın küçük WebGL motorunu yeniden kullanır. Herkes kendi kulvarında atış yapar; fizik telefonda döner,
// sunucu her atışta devrilen şişe sayısını doğrular ve sıralamayı tutar.
import { _eng } from './kuryeYarisi.js?v=2026-11-20-b';
const { ctx2d, podiumHTML, EmoteUI, detailOn, postFX, shadowBegin, shadowCast, shadowEnd, shadowSet, emitSoft, autoRes, sfx, clamp, lerp, damp, esc, hexRGB, C, shade, M, makeGL, MB, freeMesh, makeTexture, updateTexture, drawMesh, drawDynamic, useProg, TOD, norm3, brandInfo, Res, Snd, pcol, vibrate, medal, ONE3, injectStyle } = _eng();

/* ============================ fizik ============================ */
const BW = (() => {
  const LW = 0.62;            // kulvar yarı genişliği
  const PIN_F = 9.0;          // ilk şişenin uzaklığı
  const F_END = 10.6;         // şişe alanı sonu (çukur)
  const BR = 0.26, PR = 0.13; // sosis topu / şişe yarıçapı
  const AIM_MAX = 0.095;
  const ORIGIN = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) ORIGIN.push({ x: (i - r / 2) * 0.4, f: PIN_F + r * 0.36 });
  const tri = (u) => { const k = ((u % 2) + 2) % 2; return k < 1 ? k : 2 - k; };   // 0..1..0
  const aimAt = (t) => (tri(t * 0.55 + 0.5) * 2 - 1) * AIM_MAX;
  const powAt = (t) => tri(t * 0.95);
  // opt: { x0: başlangıç konumu, curve: oyuncunun verdiği kavis } (kaydırarak atış). Yoksa kulvar yağı rastgele saptırır.
  function newSim(standing, aim, power, opt = null) {
    const sp = 6.2 + power * 5.6;
    const curve = opt && Number.isFinite(opt.curve) ? opt.curve + (Math.random() - 0.5) * 0.16 : (Math.random() - 0.5) * 0.9;
    let a = aim;
    if (power > 0.84) a += (Math.random() - 0.5) * 0.05;   // fazla güç: sosis savrulur
    const x0 = opt && Number.isFinite(opt.x0) ? Math.max(-0.42, Math.min(0.42, opt.x0)) : 0;
    const S = {
      t: 0, aim: a, power,
      ball: { cv: curve, x: x0, f: 0, vx: sp * Math.sin(a), vf: sp * Math.cos(a), g: 0, roll: 0, done: false },
      pins: [],
      ev: [],
      finished: false,
    };
    ORIGIN.forEach((o, i) => { if (standing[i]) S.pins.push({ i, x: o.x, f: o.f, vx: 0, vf: 0, hit: false, gone: false, ht: 0, dx: 0, df: 1 }); });
    return S;
  }
  const pinHit = (S, p, nx, nf, sp) => {
    if (p.hit) return;
    p.hit = true; p.ht = 0;
    const l = Math.hypot(nx, nf) || 1;
    p.dx = nx / l; p.df = nf / l;
    S.ev.push(['hit', sp]);
  };
  function step(S, dt) {
    if (S.finished) return;
    S.t += dt;
    const b = S.ball;
    if (!b.done) {
      b.vx += b.cv * dt * Math.min(1, b.f / 4);
      b.x += b.vx * dt; b.f += b.vf * dt;
      b.roll += (b.vf / BR) * dt;
      if (!b.g && Math.abs(b.x) > LW - 0.02 && b.f < PIN_F - 0.9) { b.g = Math.sign(b.x) || 1; S.ev.push(['gutter']); }
      if (b.g) { b.x = b.g * (LW + 0.23); b.vx = 0; }
      // şişe alanında top durmaz ya da geri dönmez: en az 1,9 m/sn ile çukura yuvarlanır
      if (b.f > PIN_F - 0.6 && b.vf < 1.9) b.vf += (1.9 - b.vf) * Math.min(1, dt * 6);
      if (b.f > F_END + 0.8 || Math.abs(b.x) > LW + 0.4) b.done = true;
    }
    const P = S.pins;
    for (const p of P) {
      if (p.gone) continue;
      if (p.hit) {
        p.ht += dt;
        const sp = Math.hypot(p.vx, p.vf);
        if (sp > 0) { const k = Math.max(0, sp - 5.5 * dt) / sp; p.vx *= k; p.vf *= k; }
        p.x += p.vx * dt; p.f += p.vf * dt;
        if (p.f > F_END || Math.abs(p.x) > LW + 0.3) { p.gone = true; p.vx = p.vf = 0; }
      }
    }
    // top - şişe
    if (!b.g && !b.done) {
      for (const p of P) {
        if (p.gone) continue;
        const dx = p.x - b.x, df = p.f - b.f;
        const d = Math.hypot(dx, df);
        const R = BR + PR;
        if (d < R && d > 1e-6) {
          const nx = dx / d, nf = df / d;
          const vn = (b.vx - p.vx) * nx + (b.vf - p.vf) * nf;
          const o = R - d;
          p.x += nx * o * 0.85; p.f += nf * o * 0.85; b.x -= nx * o * 0.15; b.f -= nf * o * 0.15;
          if (vn > 0) {
            const e = 0.38, mb = 3.2, mp = 1;     // gerçek top şişeden ~4 kat ağır: şişelerin arasından geçip çukura gider
            const j = (1 + e) * vn / (1 / mb + 1 / mp);
            b.vx -= j / mb * nx; b.vf -= j / mb * nf;
            p.vx += j / mp * nx; p.vf += j / mp * nf;
            pinHit(S, p, p.vx, p.vf, vn);
          } else pinHit(S, p, nx, nf, 1);
        }
      }
    }
    // şişe - şişe
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      if (a.gone) continue;
      for (let k = i + 1; k < P.length; k++) {
        const c = P[k];
        if (c.gone || (!a.hit && !c.hit)) continue;
        const dx = c.x - a.x, df = c.f - a.f;
        const d = Math.hypot(dx, df);
        const R = PR * 2;
        if (d < R && d > 1e-6) {
          const nx = dx / d, nf = df / d;
          const o = (R - d) * 0.5;
          a.x -= nx * o; a.f -= nf * o; c.x += nx * o; c.f += nf * o;
          const vn = (a.vx - c.vx) * nx + (a.vf - c.vf) * nf;
          if (vn > 0) {
            const j = (1 + 0.42) * vn / 2;
            a.vx -= j * nx; a.vf -= j * nf; c.vx += j * nx; c.vf += j * nf;
            if (vn > 0.8) { pinHit(S, a, -nx, -nf, vn); pinHit(S, c, nx, nf, vn); }
          }
        }
      }
    }
    // bitiş
    if (b.done || b.f > PIN_F + 2.2 || S.t > 9) {
      const moving = P.some((p) => p.hit && !p.gone && Math.hypot(p.vx, p.vf) > 0.06);
      if (!moving || S.t > 9) S.finished = true;
    }
  }
  const downCount = (S) => S.pins.filter((p) => p.hit).length;
  return { LW, PIN_F, F_END, BR, PR, AIM_MAX, ORIGIN, tri, aimAt, powAt, newSim, step, downCount };
})();

/* ============================ ses ============================ */
const mtofB = (m) => 440 * 2 ** ((m - 69) / 12);

class BowlSnd extends Snd {
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'lock': this.tone(900, t, 0.07, 'square', 0.1, 1300, 0.002); this.tone(450, t, 0.08, 'sine', 0.2, null, 0.002); break;
      case 'roll': this.noise(t, 1.5, 0.22, { type: 'lowpass', freq: 380, to: 240, q: 0.7, attack: 0.06 }); this.tone(70, t, 1.3, 'sine', 0.12, 55, 0.05); break;
      case 'pin': {
        const n = 2 + Math.min(4, Math.round(a * 4));
        for (let i = 0; i < n; i++) {
          this.tone(1400 + Math.random() * 1800, t + i * 0.025, 0.08, 'triangle', 0.1 + 0.05 * Math.random(), 700, 0.001);
          this.noise(t + i * 0.025, 0.05, 0.16, { type: 'bandpass', freq: 2400, q: 2 });
        }
        this.tone(160, t, 0.12, 'sine', 0.22, 80, 0.002);
        break;
      }
      case 'strike':
        this.duck(0.35, 1.8);
        [57, 60, 64, 69].forEach((m) => { this.tone(mtofB(m), t + 0.02, 0.42, 'sawtooth', 0.045, null, 0.008); this.tone(mtofB(m) * 1.004, t + 0.02, 0.42, 'sawtooth', 0.03, null, 0.008); });
        this.noise(t, 0.7, 0.45, { type: 'bandpass', freq: 2200, to: 500, q: 0.8 });
        this.tone(110, t, 0.6, 'sine', 0.5, 40, 0.002);
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + 0.1 + i * 0.08, 0.3, 'triangle', 0.22));
        this.cheer(t + 0.2, 1.6);
        break;
      case 'spare': [659, 784, 988].forEach((f, i) => this.tone(f, t + i * 0.08, 0.26, 'triangle', 0.22)); break;
      case 'gutter': this.tone(260, t, 0.5, 'sawtooth', 0.12, 80, 0.01); this.noise(t, 0.5, 0.18, { type: 'lowpass', freq: 500, to: 150 }); break;
      case 'tick': this.tone(1500, t, 0.03, 'square', 0.04); break;
      case 'lose':
        this.duck(0.5, 1.2);
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, t + i * 0.16, 0.24, 'sawtooth', 0.1, f * 0.94));
        break;
      default: super._fx(name, a);
    }
  }
  tempo() { return this.mode === 'race' ? 116 : this.mode === 'idle' ? 104 : 94; }
  // Sosis Bowling: retro disko (La m7 – Re9 – Fa maj7 – Mi7): dört vuruş bas davul, açık zil, oktav zıplayan bas,
  // yaylı vuruşları, wah gitar, nefesli cümle ve inek çanı
  beat(t, s, bar, spb, st = spb / 4) {
    const CH = [[45, [60, 64, 67]], [50, [57, 60, 64, 66]], [41, [57, 60, 64]], [40, [56, 59, 62]]];
    const [root, ch] = CH[bar % 4];
    if (this.mode === 'race') {
      if (s % 4 === 0) this.iKick(t, 0.34, 120, 45);
      if (s === 4 || s === 12) this.iClap(t, 0.12);
      if (s % 4 === 2) this.iHat(t, 0.055, true); else if (s % 2 === 1) this.iHat(t, 0.024);
      if (s % 2 === 0) this.iBass(t, root - 12 + (s % 4 === 2 ? 12 : 0), st * 1.6, 0.15, 'disco', 1600);
      if ((s === 3 || s === 11) && bar % 2 === 0) this.iStr(t, ch.map((m) => m + 12), st * 1.2, 0.02, 0.005, 4200, 0.12);
      if ([2, 6, 10, 14].includes(s)) this.iWah(t, ch[(s >> 2) % ch.length] + 12, st * 1.6, 0.028);
      if (bar % 4 === 3 && (s === 7 || s === 15)) this.iCowbell(t, 0.042);
      if (bar % 4 === 3 && [8, 10, 12].includes(s)) this.iBrass(t, [76, 79, 81][(s - 8) / 2], st * 1.6, 0.032);
      if (bar % 8 === 7 && s === 12) this.iRiser(t, st * 4, 0.035);
    } else if (this.mode === 'idle') {
      if (s % 2 === 0) this.iBass(t, root - 12 + (s % 4 === 2 ? 12 : 0), st * 1.4, 0.1, 'disco', 1100);
      if (s % 4 === 2) this.iHat(t, 0.032, true);
      if (s === 0) ch.forEach((m) => this.iEP(t, m + 12, 0.022, spb * 2));
    } else {
      if (s === 0) { this.iStr(t, ch.map((m) => m + 12), spb * 4, 0.015, 0.4, 2000, 0.3); this.iBass(t, root - 12, spb * 2, 0.09, 'sub'); }
      if (s === 8) ch.forEach((m, i) => this.iEP(t + i * 0.05, m + 12, 0.022, spb * 2));
    }
  }
}

/* ============================ arayüz stili ============================ */
const STYLE2 = `
#ky.bw{touch-action:none;user-select:none;-webkit-user-select:none}
#ky .bw-scrim{position:absolute;left:0;right:0;top:0;height:calc(env(safe-area-inset-top,0px) + 230px);background:linear-gradient(rgba(8,6,20,.62),rgba(8,6,20,.34) 55%,rgba(8,6,20,0));pointer-events:none}
#ky .bw-h{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);top:calc(env(safe-area-inset-top,0px) + 62px);text-align:center;pointer-events:none;z-index:3;text-shadow:0 3px 0 rgba(0,0,0,.4);background:rgba(12,10,26,.45);border-radius:14px;padding:6px 10px 8px}
#ky .bw-h b{display:block;font-size:40px;line-height:1;font-weight:900;font-variant-numeric:tabular-nums;transition:transform .12s}
#ky .bw-h b.pop{transform:scale(1.25)}
#ky .bw-h small{display:block;font-size:12px;font-weight:800;letter-spacing:.1em;opacity:.9;margin-top:2px;white-space:nowrap}
#ky .bw-pins{display:grid;gap:2px;justify-items:center;margin:6px auto 0;width:max-content}
#ky .bw-pins div{display:flex;gap:3px}
#ky .bw-pins i{width:10px;height:14px;border-radius:5px 5px 3px 3px;background:#ffd23f;box-shadow:0 1px 0 rgba(0,0,0,.4)}
#ky .bw-pins i.dn{background:rgba(255,255,255,.18);box-shadow:none}
#ky .bw-lb{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);top:calc(env(safe-area-inset-top,0px) + 56px);display:grid;gap:3px;pointer-events:none;z-index:3;max-width:34%}
#ky .bw-lb div{display:flex;align-items:center;gap:5px;font-weight:800;font-size:12px;background:rgba(12,10,26,.58);border-radius:9px;padding:2px 7px 2px 5px;width:max-content;max-width:100%}
#ky .bw-lb div.me{background:rgba(255,210,63,.35);outline:2px solid rgba(255,210,63,.75)}
#ky .bw-lb div.out{opacity:.6}
#ky .bw-lb i{width:9px;height:9px;border-radius:99px;flex:none}
#ky .bw-lb em{font-style:normal;opacity:.75;width:14px;text-align:right;flex:none}
#ky .bw-lb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px}
#ky .bw-lb b{margin-left:4px;font-variant-numeric:tabular-nums}
#ky .bw-pw{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 158px);width:min(260px,70vw);height:18px;border-radius:99px;background:rgba(12,10,26,.6);border:2px solid rgba(255,255,255,.6);overflow:hidden;z-index:3;pointer-events:none;transition:opacity .2s}
#ky .bw-pw.off{opacity:0}
#ky .bw-pw u{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,#3fb950,#ffd23f 70%,#ef4444);opacity:.9;width:0}
#ky .bw-pw s{position:absolute;top:0;bottom:0;left:0;width:4px;background:#fff;box-shadow:0 0 6px #fff}
#ky .bw-pw q{position:absolute;top:0;bottom:0;left:74%;right:16%;border:2px solid rgba(63,185,80,.9);border-radius:6px;box-sizing:border-box}
#ky .bw-tap{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 34px);width:112px;height:112px;border-radius:99px;border:4px solid rgba(255,255,255,.65);background:radial-gradient(circle,rgba(255,210,63,.55),rgba(194,85,43,.6));color:#fff;font-weight:900;font-size:16px;letter-spacing:.05em;display:grid;place-items:center;align-content:center;line-height:1;box-shadow:0 0 0 5px rgba(255,210,63,.25),0 0 24px rgba(255,160,50,.6);transition:opacity .3s,transform .08s;z-index:4;-webkit-tap-highlight-color:transparent;padding:0}
#ky .bw-tap span{display:block;font-size:36px;margin-bottom:4px}
#ky .bw-tap.off{opacity:0!important;pointer-events:none}
#ky .bw-tap.on{transform:translateX(-50%) scale(.9)}
#ky.bw .note{top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 22px)!important}
#ky.bw .note.up{bottom:calc(env(safe-area-inset-bottom,0px) + 36vh)!important}
#ky .bw-menu{display:grid;gap:4px;margin:8px 0;text-align:left}
#ky .bw-menu div{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.12);border-radius:10px;padding:4px 9px;font-size:13px;font-weight:700}
#ky .bw-menu b{font-size:22px;line-height:1}
@media (max-height:640px){#ky .bw-pins{display:none}}
@media (max-width:360px){#ky .bw-lb span{max-width:56px}#ky .bw-lb div{font-size:11px}#ky .bw-h b{font-size:34px}}
@media (orientation:landscape) and (max-height:520px){
#ky .bw-h{top:calc(env(safe-area-inset-top,0px) + 58px)}
#ky .bw-h b{font-size:42px}
#ky .bw-lb{top:calc(env(safe-area-inset-top,0px) + 50px)}
#ky .bw-pw{bottom:calc(env(safe-area-inset-bottom,0px) + 112px)}
#ky .bw-tap{width:92px;height:92px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);left:auto;right:calc(env(safe-area-inset-right,0px) + 24px);transform:none}
#ky .bw-tap.on{transform:scale(.9)}
#ky.bw .note.up{bottom:calc(env(safe-area-inset-bottom,0px) + 22px)!important}
}
`;
function injectStyle2() {
  if (document.getElementById('bw-style')) return;
  const st = document.createElement('style');
  st.id = 'bw-style';
  st.textContent = STYLE2;
  document.head.appendChild(st);
}

/* ============================ görsel modeller ============================ */
// Görsel kulvar ölçüleri (fizik BW içinde). Görsel kulvar biraz daha geniş: köşe şişeleri kenara taşmasın.
const VLW = 0.68, GR = 0.17, GX = VLW + GR, CAPW = 0.06, LANE_DX = 2 * (VLW + 2 * GR) + CAPW;
const SUN = new Float32Array(norm3([0.45, 0.85, 0.28]));
const LIGHT = { sunC: [0.58, 0.55, 0.64], sky: [0.36, 0.31, 0.48], gnd: [0.15, 0.12, 0.19], night: 0, warm: [1, 0.85, 0.6], lampC: [1.15, 1.02, 0.86], fogR: [26, 75] };
const FOG = new Float32Array(hexRGB('#120c22'));
const LAMP = [0, 2.3, -(BW.PIN_F - 1.6)];
const UPN = [0, 1, 0];
const PIN_RB = 0.128;                          // şişe devrilirken taban kenarı etrafında döner
const PIN_ORDER = [0, 1, 2, 4, 3, 5, 7, 8, 6, 9];
const MIR_T = new Float32Array([0.8, 0.78, 0.84]);
const mirY = (o, m) => { o.set(m); o[1] = -m[1]; o[5] = -m[5]; o[9] = -m[9]; o[13] = -m[13]; return o; };
const ease = (t) => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };

// Ketçap (kind 0) ve hardal (kind 1) şişesi: döner profil, pürüzsüz yüzey, etiket ve amblem
function bottleModel(mb, kind) {
  const body = kind ? C('#f2b90f', -0.55) : C('#c4140b', -0.62);
  const bodyD = kind ? C('#d39605', -0.5) : C('#930d06', -0.55);
  const label = C('#f6efdc', -0.12);
  const stripe = kind ? C('#c62a1d', -0.25) : C('#2f8a3a', -0.25);
  const emblem = kind ? C('#b0261b', -0.15) : C('#d93222', -0.15);
  const leaf = C('#3f9b3a', -0.15);
  const cap = kind ? C('#c62a1d', -0.5) : C('#f2f1ec', -0.5);
  const P = [];
  const add = (r, y, k) => P.push([r, y, k]);
  add(0, 0, 'd'); add(0.072, 0, 'd'); add(0.098, 0.006, 'd'); add(0.115, 0.026, 'b'); add(0.123, 0.06, 'b');
  add(0.127, 0.095, 'b'); add(0.127, 0.095, 's');
  add(0.128, 0.11, 's'); add(0.128, 0.11, 'L');
  for (let y = 0.125; y < 0.236; y += 0.0185) add(0.128, y, 'L');
  add(0.128, 0.24, 'L'); add(0.128, 0.24, 's');
  add(0.127, 0.255, 's'); add(0.127, 0.255, 'b');
  add(0.121, 0.3, 'b'); add(0.106, 0.352, 'b'); add(0.086, 0.396, 'b'); add(0.066, 0.432, 'b'); add(0.056, 0.455, 'b');
  add(0.056, 0.455, 'c');
  if (kind) { add(0.062, 0.458, 'c'); add(0.062, 0.495, 'c'); add(0.05, 0.506, 'c'); add(0.03, 0.522, 'c'); add(0.016, 0.575, 'c'); add(0.01, 0.6, 'c'); add(0, 0.602, 'c'); }
  else { add(0.064, 0.458, 'c'); add(0.066, 0.5, 'c'); add(0.064, 0.53, 'c'); add(0.05, 0.548, 'c'); add(0.03, 0.556, 'c'); add(0, 0.558, 'c'); }
  mb.lathe(0, 0, 0, P.map((q) => [q[0], q[1]]), 20, (i, a) => {
    const k = P[i][2];
    if (k === 'd') return bodyD;
    if (k === 'b') return body;
    if (k === 's') return stripe;
    if (k === 'c') return cap;
    // etiketin önünde (kameraya bakan yüz, +z) oval amblem; ketçapta üstünde yaprak
    const da = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
    const dy = (P[i][1] - 0.172) / 0.042;
    if ((da / 0.6) ** 2 + dy * dy < 1) return emblem;
    if (!kind && Math.abs(da) < 0.22 && P[i][1] > 0.212 && P[i][1] < 0.232) return leaf;
    return label;
  }, '');
}

// Bowling topu. hex verilmezse "sosis top": kızarmış kabuk + ızgara izleri; verilirse oyuncu renginde mermer desen.
function ballModel(mb, hex) {
  const R = BW.BR;
  if (hex) {
    const c = hexRGB(hex), d = c.map((x) => x * 0.42);
    mb.sphereS(0, 0, 0, R, R, R, null, 26, 16, (x, y, z) => {
      const s = 0.5 + 0.5 * Math.sin(x * 5.1 + Math.sin(y * 4.3 + z * 2.1) * 2.2 + z * 3.3);
      const k = s * s;
      return [lerp(d[0], c[0], k), lerp(d[1], c[1], k), lerp(d[2], c[2], k), -0.92];
    });
  } else {
    mb.sphereS(0, 0, 0, R, R, R, null, 30, 20, (x, y, z) => {
      const g = Math.sin((x * 0.7 + y * 0.72) * 19);
      const n = 0.5 + 0.5 * Math.sin(x * 7.3 + z * 5.9 + y * 3.1) * Math.sin(z * 4.1 - y * 6.7);
      const c = g > 0.84 ? [0.22, 0.075, 0.035] : [0.56 + 0.13 * n, 0.2 + 0.08 * n, 0.09 + 0.035 * n];
      return [c[0], c[1], c[2], -0.9];
    });
  }
  // parmak delikleri
  [[0.24, 0.93, 0.27, 0.026], [-0.24, 0.93, 0.27, 0.026], [0, 0.88, -0.47, 0.031]].forEach(([hx, hy, hz, hr]) => {
    const l = Math.hypot(hx, hy, hz);
    const dx = hx / l, dy = hy / l, dz = hz / l;
    mb.push().T(dx * R * 0.985, dy * R * 0.985, dz * R * 0.985, Math.atan2(dx, dz), Math.acos(clamp(dy, -1, 1)), 0);
    mb.lathe(0, 0, 0, [[hr * 1.14, 0.0035], [hr, 0.006], [hr * 0.72, -0.004], [0, -0.004]], 16, (i) => (i >= 2 ? C('#0a0504', 0) : C('#2a1a12', -0.6)));
    mb.pop();
  });
}

// Parlak kulvar yüzeyi (3 parça: yakın / orta / uzak — uzak kısım daha çok yansıtır). Üç kulvar birden.
function laneTopModel(mb, part) {
  const F0 = [-3.6, 3.0, 7.0][part], F1 = [3.0, 7.0, BW.F_END][part];
  const NB = 16, bw = (2 * VLW) / NB;
  const woods = ['#d6a35c', '#c8944f', '#dcae68', '#cf9b55', '#d9a862', '#c48d48'].map(hexRGB);
  const deck = hexRGB('#e2bd7c');
  for (const k of [-1, 0, 1]) {
    const ox = k * LANE_DX;
    for (let i = 0; i < NB; i++) {
      const base = woods[(i * 5 + k * 2 + 6) % woods.length];
      const x0 = ox - VLW + i * bw, x1 = x0 + bw;
      const xm0 = x0 + bw * 0.1, xm1 = x1 - bw * 0.1;
      const col = (f, e) => {
        const c = f > BW.PIN_F - 0.55 ? deck : base;
        const g = 0.97 + 0.018 * Math.sin(f * 0.9 + i * 2.7 + k) + 0.012 * Math.sin(f * 7.1 + i * 4.3) - (e ? 0.08 : 0);
        return [c[0] * g, c[1] * g, c[2] * g, -0.45];
      };
      for (let f = F0; f < F1 - 1e-6; f += 0.5) {
        const fb = Math.min(F1, f + 0.5);
        mb.quadN([x0, 0, -f], [xm0, 0, -f], [xm0, 0, -fb], [x0, 0, -fb], UPN, UPN, UPN, UPN, col(f, 1), col(f, 0), col(fb, 0), col(fb, 1));
        mb.quadN([xm0, 0, -f], [xm1, 0, -f], [xm1, 0, -fb], [xm0, 0, -fb], UPN, UPN, UPN, UPN, col(f, 0), col(f, 0), col(fb, 0), col(fb, 0));
        mb.quadN([xm1, 0, -f], [x1, 0, -f], [x1, 0, -fb], [xm1, 0, -fb], UPN, UPN, UPN, UPN, col(f, 0), col(f, 1), col(fb, 1), col(fb, 0));
      }
    }
    if (part === 0) {
      const ap = [0.8, 0.62, 0.41, -0.45];
      for (const s of [-1, 1]) {
        const xa = ox + s * VLW, xb = ox + s * (VLW + 2 * GR + CAPW / 2);
        const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
        mb.quadN([lo, 0, 3.6], [hi, 0, 3.6], [hi, 0, 0], [lo, 0, 0], UPN, UPN, UPN, UPN, ap);
      }
    }
    const dark = [0.16, 0.1, 0.06, -0.3];
    const Y = 0.0015;
    const dot = (x, f, r) => {
      for (let t = 0; t < 10; t++) {
        const a0 = (t / 10) * Math.PI * 2, a1 = ((t + 1) / 10) * Math.PI * 2;
        mb.triN([x, Y, -f], [x + Math.cos(a0) * r, Y, -f + Math.sin(a0) * r], [x + Math.cos(a1) * r, Y, -f + Math.sin(a1) * r], UPN, UPN, UPN, dark);
      }
    };
    if (part === 0) {
      const hw = VLW + 2 * GR;
      mb.quadN([ox - hw, Y, 0.022], [ox + hw, Y, 0.022], [ox + hw, Y, -0.022], [ox - hw, Y, -0.022], UPN, UPN, UPN, UPN, dark);
      for (let j = 0; j < 7; j++) { dot(ox + (j - 3) * 0.17, -1.0, 0.016); dot(ox + (j - 3) * 0.17, -2.5, 0.016); }
      for (let j = 0; j < 10; j++) dot(ox + (j - 4.5) * 0.12, 2.1, 0.013);
    }
    if (part === 1) {
      for (let j = 0; j < 7; j++) {
        const x = ox + (j - 3) * 0.17, f0 = 4.4 + (3 - Math.abs(j - 3)) * 0.1;
        mb.triN([x - 0.03, Y, -f0], [x + 0.03, Y, -f0], [x, Y, -(f0 + 0.17)], UPN, UPN, UPN, dark);
      }
    }
    if (part === 2) BW.ORIGIN.forEach((o) => dot(ox + o.x, o.f, 0.02));
  }
}

// Kulvar seviyesinin altı (opak): oluklar, ayırıcılar, çukur, yansımaların arkasındaki derin zemin
function belowModel(mb) {
  const FE = BW.F_END;
  mb.quadN([-9, -3.4, 4], [9, -3.4, 4], [9, -3.4, -(FE + 3)], [-9, -3.4, -(FE + 3)], UPN, UPN, UPN, UPN, [0.42, 0.29, 0.18, 0]);
  const gut = [0.25, 0.22, 0.32, -0.45];
  const capc = C('#241a35', -0.35);
  for (const k of [-1, 0, 1]) {
    const ox = k * LANE_DX;
    const hw = VLW + 2 * GR;
    for (const s of [-1, 1]) {
      const cx = ox + s * GX;
      const N = 10;
      for (let j = 0; j < N; j++) {
        const a0 = (Math.PI * j) / N, a1 = (Math.PI * (j + 1)) / N;
        const p0 = [cx + GR * Math.cos(a0), -GR * Math.sin(a0)], p1 = [cx + GR * Math.cos(a1), -GR * Math.sin(a1)];
        const n0 = [-Math.cos(a0), Math.sin(a0), 0], n1 = [-Math.cos(a1), Math.sin(a1), 0];
        mb.quadN([p0[0], p0[1], 0], [p1[0], p1[1], 0], [p1[0], p1[1], -(FE + 0.3)], [p0[0], p0[1], -(FE + 0.3)], n0, n1, n1, n0, gut);
      }
      const xa = ox + s * hw, xb = ox + s * (hw + CAPW / 2);
      mb.box(Math.min(xa, xb), -0.2, -(FE + 0.78), Math.max(xa, xb), 0.02, 0, capc);
    }
    mb.box(ox - VLW, -0.46, -FE - 0.02, ox + VLW, -0.001, -FE, C('#3a2718'));
    mb.box(ox - hw, -0.5, -(FE + 0.8), ox + hw, -0.45, -FE, C('#07040c'));
  }
  const cp = [0.13, 0.09, 0.2, 0];
  const XO = 1.5 * LANE_DX;
  for (const s of [-1, 1]) {
    const lo = Math.min(s * XO, s * 12), hi = Math.max(s * XO, s * 12);
    mb.quadN([lo, -0.003, 3.6], [hi, -0.003, 3.6], [hi, -0.003, -(FE + 1)], [lo, -0.003, -(FE + 1)], UPN, UPN, UPN, UPN, cp);
  }
}

// Kulvar seviyesinin üstü (opak, yansıması da çizilir): yan duvarlar, tabela kutuları, perde, arka duvar, neonlar
function aboveModel(mb) {
  const FE = BW.F_END, PF = BW.PIN_F;
  const hw = VLW + 2 * GR;
  const kick = { top: C('#3a2d58'), side: C('#251c3b'), back: C('#3a2d58') };
  const xs = new Set();
  for (const k of [-1, 0, 1]) for (const s of [-1, 1]) xs.add(Math.round((k * LANE_DX + s * (hw + CAPW / 2)) * 1000) / 1000);
  xs.forEach((xb) => {
    mb.box(xb - 0.035, 0, -(FE + 0.8), xb + 0.035, 0.95, -(PF - 0.95), kick);
    mb.box(xb - 0.037, 0.925, -(FE + 0.8), xb + 0.037, 0.955, -(PF - 0.95), C('#ff4fb0', 1));
  });
  for (const k of [-1, 0, 1]) {
    const ox = k * LANE_DX;
    mb.box(ox - hw, 1.08, -(FE + 0.45), ox + hw, 1.94, -(FE - 0.12), { top: C('#221a38'), side: C('#151024'), back: C('#151024') });
    mb.box(ox - hw, 1.05, -(FE - 0.1), ox + hw, 1.085, -(FE - 0.14), C('#49e3ff', 1));
    mb.box(ox - hw + 0.05, 1.03, -(FE + 0.3), ox + hw - 0.05, 1.06, -(FE - 0.05), C('#fff1d8', 1));
    mb.box(ox - hw, -0.45, -(FE + 0.8), ox + hw, 1.1, -(FE + 0.76), C('#120c1c'));
  }
  mb.box(-14, -0.5, -(FE + 1.1), 14, 7, -(FE + 0.95), { top: C('#1a1230'), side: C('#1a1230'), back: C('#1d1436') });
  mb.box(-14, 3.16, -(FE + 0.95), 14, 3.21, -(FE + 0.9), C('#ff4fb0', 1));
  mb.box(-14, 3.42, -(FE + 0.95), 14, 3.46, -(FE + 0.9), C('#49e3ff', 1));
  mb.box(-0.56, 2.0, -(FE + 0.95), 0.56, 3.12, -(FE + 0.945), C('#ffd23f', 1));
}

// Süpürme çubuğu (sarı-siyah ikaz şeritli) ve kolları
function sweepModel(mb) {
  const hw = VLW + 0.06;
  mb.box(-hw, 0, -0.035, hw, 0.075, 0.035, C('#2c2a35', -0.4));
  for (let i = 0; i < 12; i++) {
    const x0 = -hw + (i * 2 * hw) / 12, x1 = x0 + (2 * hw) / 12;
    mb.box(x0, 0.014, 0.035, x1, 0.061, 0.041, C(i % 2 ? '#1c1a20' : '#f4c20d', -0.2));
  }
  for (const s of [-1, 1]) mb.box(s * hw - 0.03, 0.075, -0.025, s * hw + 0.03, 1.15, 0.025, C('#3a3846', -0.3));
}

/* ============================ oyun ============================ */
const FRAMES_DEF = 4;
const PLAY_SEC = 100;
const LBL_CAP = 6;
const D_STEP = 1 / 120;

class Game {
  constructor(ctx) {
    injectStyle();
    injectStyle2();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.key = null;
    this.B = null;
    this.parts = [];
    this.time = 0;
    this.scale = 1;
    this.frameAvg = 16;
    this.slowFor = 0;
    this.fastFor = 0;
    this.fov = 0.62;
    this.cam = { ex: 0, ey: 1.5, ez: 2.8, tx: 0, ty: 0.3, tz: -7, shake: 0 };
    this.panelKey = '';
    this.lastBeep = 99;
    this.snd = new BowlSnd();
    this.mats = { a: M.make(), b: M.make(), c: M.make(), V: M.make(), P: M.make(), VP: M.make() };
    this.lbKey = '';
    this.pinKey = '';
    this.buildDom();
    try { this.snd.amb('alley', 0.75); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd && this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[bowling] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); } catch (e) {
        console.warn('[bowling] kaynak', e);
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
    w.className = 'bw';
    w.innerHTML = `
      <canvas aria-label="Sosis Bowling 3D sahnesi"></canvas><div class="bw-scrim"></div>
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
      <div class="bw-h" style="display:none"><b>0</b><small>PUAN</small><div class="bw-pins"></div></div>
      <div class="bw-lb"></div>
      <div class="bw-pw off"><u></u><q></q><s></s></div>
      <div class="note"></div>
      <button class="bw-tap off" aria-label="Dur"><span>🌭</span><em style="font-style:normal">NİŞAN</em></button>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = {
      wrap: w, cv: q('canvas'), lbls: q('.lbls'), fx: q('.fx'), vig: q('.vig'), posB: q('.pos b'), posS: q('.pos small'), pos: q('.pos'),
      tm: q('.tm'), ex: q('.ex'), note: q('.note'), msg: q('.msg'), panel: q('.panel'), hud: q('.hud'),
      big: q('.bw-h'), bigN: q('.bw-h b'), bigS: q('.bw-h small'), pins: q('.bw-pins'), lb: q('.bw-lb'),
      pw: q('.bw-pw'), pwU: q('.bw-pw u'), pwS: q('.bw-pw s'), tap: q('.bw-tap'), tapT: q('.bw-tap em'), tapI: q('.bw-tap span'),
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
    // Ekranda: kısa dokunuş = eski usul (nişan / güç durdur); yukarı kaydırma = doğrudan atış
    this.onDown = (e) => {
      if (e.target.closest('.panel.on .card, button, a')) return;
      e.preventDefault();
      const B = this.B;
      if (!this.canCtl() || !B || B.done) return;
      if (B.phase !== 'aim') { this.press(); return; }
      this.sw = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: performance.now(), aimT: B.aimT, pts: [[e.clientX, e.clientY, performance.now()]], moved: false };
    };
    this.onMove = (e) => {
      const q = this.sw;
      if (!q || q.id !== e.pointerId) return;
      q.pts.push([e.clientX, e.clientY, performance.now()]);
      if (q.pts.length > 60) q.pts.splice(1, 1);
      if (!q.moved && Math.hypot(e.clientX - q.sx, e.clientY - q.sy) > 14) q.moved = true;
      if (q.moved && this.B && !this.B.sim) this.B.x0 = this.swipeX0(q.sx);
    };
    this.onUp = (e) => {
      const q = this.sw;
      if (!q || q.id !== e.pointerId) return;
      this.sw = null;
      const B = this.B;
      if (!B || B.phase !== 'aim' || B.done) return;
      if (!q.moved) {
        // dokunuş: basıldığı andaki nişan konumu kullanılır (gecikme olmasın)
        const keep = B.aimT;
        B.aimT = q.aimT;
        this.press();
        if (B.phase === 'aim') B.aimT = keep;
        return;
      }
      const dx = e.clientX - q.sx, dy = e.clientY - q.sy;
      const dur = (performance.now() - q.t0) / 1000;
      if (dy > -36) { B.x0 = 0; return; }   // yukarı değil (aşağı çekip bırakmak = vazgeçmek)
      this.swipeThrow(q, dx, dy, dur);
    };
    this.onCancel = () => { this.sw = null; if (this.B && !this.B.sim) this.B.x0 = 0; };
    this.el.tap.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.sw = null; this.press(); });
    w.addEventListener('pointerdown', this.onDown);
    w.addEventListener('pointermove', this.onMove);
    w.addEventListener('pointerup', this.onUp);
    w.addEventListener('pointercancel', this.onCancel);
    this.onTouch = (e) => { if (!e.target.closest('.card')) e.preventDefault(); };
    w.addEventListener('touchmove', this.onTouch, { passive: false });
    this.onKey = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); if (!e.repeat) this.press(); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  simNow() {
    const v = this.view;
    return v && v.startAt ? (this.ctx.serverNow() - v.startAt) / 1000 : -99;
  }
  canCtl() {
    const v = this.view;
    const B = this.B;
    return !!(v && B && B.live && v.phase === 'play' && this.simNow() > 0.05 && this.ctx.serverNow() < v.endsAt);
  }

  /* ---------- oyuncu durumu ---------- */
  fresh(live, frames) {
    return { live, frames, f: 0, t: 0, st: new Array(10).fill(true), score: 0, strikes: 0, phase: 'aim', aimT: 0, powT: 0, aim: 0, power: 0, sim: null, acc: 0, wait: 0, done: false, last: '', x0: 0 };
  }
  press() {
    if (!this.canCtl()) return;
    const B = this.B;
    if (B.done) return;
    this.el.tap.classList.add('on');
    setTimeout(() => this.el.tap.classList.remove('on'), 100);
    if (B.phase === 'aim') {
      B.aim = BW.aimAt(B.aimT);
      B.phase = 'power';
      B.powT = 0;
      this.snd.fx('lock');
      vibrate(8);
    } else if (B.phase === 'power') {
      B.power = BW.powAt(B.powT);
      B.sim = BW.newSim(B.st, B.aim, B.power);
      B.acc = 0;
      B.slowT = 0;
      B.slowDone = false;
      B.phase = 'roll';
      B.pinsHit = 0;
      this.snd.fx('roll');
      this.snd.fx('lock');
      vibrate(15);
    }
  }
  swipeX0(sx) {
    const W = this.vw || 1;
    return clamp(((sx - W / 2) / W) * 1.25, -0.42, 0.42);
  }
  // Kaydırarak atış: yön, güç (hız), kavis (çizginin kirişten sapması), başlangıç konumu
  swipeThrow(q, dx, dy, dur) {
    if (!this.canCtl()) return;
    const B = this.B;
    if (!B || B.done || B.phase !== 'aim') return;
    const H = this.vh || 800;
    // son ~0,18 sn'deki hız (parmağın bırakıldığı andaki savurma) ile ortalama hızın karışımı
    const P = q.pts, last = P[P.length - 1];
    let k = P.length - 1;
    while (k > 0 && last[2] - P[k][2] < 180) k--;
    const tail = Math.hypot(last[0] - P[k][0], last[1] - P[k][1]) / Math.max(0.03, (last[2] - P[k][2]) / 1000);
    const avg = Math.hypot(dx, dy) / Math.max(0.05, dur);
    const pxs = Math.max(tail, avg * 0.8);
    const power = clamp(pxs / (Math.max(H, 560) * 2.5), 0.16, 1);
    const ang = Math.atan2(dx, -dy);
    const aim = clamp(ang * 0.3, -BW.AIM_MAX * 1.2, BW.AIM_MAX * 1.2);
    // kavis: çizgi noktalarının kiriş doğrusuna işaretli uzaklığı (sağa şişkin çizgi = sola dönen top)
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    let dev = 0, cnt = 0;
    for (const pt of P) { const ox = pt[0] - q.sx, oy = pt[1] - q.sy; const along = (ox * dx + oy * dy) / (L * L); if (along > 0.15 && along < 0.85) { dev += ox * nx + oy * ny; cnt++; } }
    dev = cnt ? dev / cnt : 0;
    const curve = clamp((dev / L) * 4.2, -1.15, 1.15);
    const x0 = this.swipeX0(q.sx);
    B.aim = aim;
    B.power = power;
    B.x0 = x0;
    B.sim = BW.newSim(B.st, aim, power, { x0, curve });
    B.acc = 0;
    B.slowT = 0;
    B.slowDone = false;
    B.phase = 'roll';
    B.pinsHit = 0;
    this.swUsed = true;
    this.snd.fx('roll');
    this.snd.fx('lock');
    vibrate(15);
    this.el.tap.classList.add('on');
    setTimeout(() => this.el.tap.classList.remove('on'), 100);
  }
  // atış bitti: sonucu işle
  settle() {
    const B = this.B;
    const S = B.sim;
    const n = BW.downCount(S);
    const gutter = !!S.ball.g;
    const strike = B.t === 0 && n === 10;
    const remaining = 10 - S.pins.filter((p) => p.hit).length;
    let bonus = 0;
    let label = '';
    B.score += n;
    if (B.t === 0) {
      if (strike) { bonus = 5; B.strikes += 1; label = 'STRIKE! 🔥'; }
      else label = n === 0 ? (gutter ? 'KANALA GİTTİ 😅' : 'ISKALADIN 😬') : `${n} ŞİŞE`;
    } else if (remaining === 0) { bonus = 3; label = 'SPARE! ⭐'; }
    else label = n === 0 ? (gutter ? 'KANALA GİTTİ 😅' : 'ISKALADIN 😬') : `${n} ŞİŞE`;
    B.score += bonus;
    B.sim.pins.forEach((p) => { if (p.hit) B.st[p.i] = false; });
    B.last = label;
    this.msg(label, strike ? 'big gold' : 'gold', false);
    setTimeout(() => this.msg(''), 1300);
    if (strike) { this.snd.fx('strike'); this.confetti(0, -BW.PIN_F, 26); vibrate([30, 30, 60]); this.cam.shake = 0.5; this.flash('hit', 200); }
    else if (bonus) { this.snd.fx('spare'); this.confetti(0, -BW.PIN_F, 14); vibrate([20, 20, 30]); }
    else if (gutter && !n) this.snd.fx('gutter');
    try { const p = { n }; this.ctx.sendQuiet ? this.ctx.sendQuiet('roll', p) : this.ctx.send('roll', p); } catch { /* yok say */ }
    // sıradaki atış
    if (B.t === 0 && !strike) { B.t = 1; B.next = 'aim'; }
    else { B.f += 1; B.t = 0; B.next = 'aim'; B.clear = true; }
    B.phase = 'settle';
    B.wait = 2.0;
    this.bump = 1;
  }
  afterSettle() {
    const B = this.B;
    if (B.clear) { B.st = new Array(10).fill(true); B.clear = false; }
    B.sim = null;
    if (B.f >= B.frames) { B.done = true; B.phase = 'done'; return; }
    B.phase = 'aim';
    B.aimT = 0;
    B.powT = 0;
  }
  confetti(x, z, n) {
    const cols = ['#ff3b30', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#ffffff'].map(hexRGB);
    for (let i = 0; i < n && this.parts.length < 680; i++) {
      const c = cols[i % cols.length];
      this.parts.push({ x: x + (Math.random() - 0.5) * 2, y: 1 + Math.random() * 1.5, z: z + (Math.random() - 0.5) * 2, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1, vz: (Math.random() - 0.5) * 4, life: 1.6 + Math.random(), max: 2.6, s: 0.03 + Math.random() * 0.03, r: c[0], g: c[1], b: c[2], add: false, grav: 3.2, drag: 1.2, conf: true });
    }
  }
  flash(cls, ms = 380) {
    const v = this.el.vig;
    v.classList.add(cls);
    setTimeout(() => v.classList.remove(cls), ms);
  }

  /* ---------- sunucudan gelen durum ---------- */
  emoAnchor(pid) {
    // kendi kulvarım: topun üstü; diğer oyuncular üstte isimle görünür
    if (pid !== this.ctx.me) return null;
    return this.emoProj(0, 0.95, -0.4);
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
    if (root && root.dataset.bw !== '1') {
      root.dataset.bw = '1';
      root.innerHTML = '<p class="py-16 text-center">🌭</p>';
    }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    if (v.phase === 'ready' && v.startAt) {
      const k = `r|${v.startAt}`;
      if (this.key !== k) { this.key = k; this.B = this.fresh(false, v.frames || FRAMES_DEF); this.lastBeep = 99; this.lbKey = ''; this.pinKey = ''; }
    }
    if (v.phase === 'play') {
      const k = `p|${v.startAt}`;
      if (this.key !== k) {
        this.key = k;
        this.B = this.fresh(v.me >= 0, v.frames || FRAMES_DEF);
        this.parts.length = 0;
        this.lbKey = '';
        this.pinKey = '';
      }
    }
    if (!prev || prev.phase !== v.phase || prev.round !== v.round) this.onPhase(prev, v);
    if (v.players && (v.phase === 'ready' || v.phase === 'play')) this.syncNeighbors(v);
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
      if (me && me.place === 1) { setTimeout(() => this.snd.fx('win'), 250); this.confetti(0, -4, 36); } else this.snd.fx('lose');
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
      html = '<div class="card"><div class="tt">🌭 Hazırlanıyor…</div></div>';
    } else if (v.phase === 'ready') {
      const left = v.startAt - sNow;
      if (left > 3300) {
        const first = v.round === 1;
        const canGo = ctx.isHost && first;
        key = `ready|${v.round}|${v.players.map((r) => r.id + r.n).join(',')}|${canGo}`;
        html = `<div class="card">
          <div class="tt">🌭 Sosis Bowling</div>
          <div class="sub">${v.round}/${v.rounds}. tur · ${v.frames} çerçeve · ${v.players.length} oyuncu</div>
          <div class="sub">Herkes kendi kulvarında atar — en çok puan toplayan turu kazanır!</div>
          ${first ? `<div class="bw-menu">
            <div><b>👆</b><span>Kaydır: topu yukarı fırlat — yön ve hız senin elinde, eğri çizersen top kavis yapar</span></div>
            <div><b>🎯</b><span>Ya da dokun: 1. dokunuş nişanı, 2. dokunuş gücü durdurur</span></div>
            <div><b>🍾</b><span>10 ketçap ve hardal şişesini devir. Çerçeve başına 2 atış</span></div>
            <div><b>🔥</b><span>Strike +5, spare +3 bonus. Kanala giderse puan yok!</span></div>
          </div>` : ''}
          <div class="who">${chips(v.players)}</div>
          <div class="cd"><span>${v.playing ? 'Kulvar hazırlanıyor' : 'Bu turu izleyeceksin'}</span><b data-cd></b></div>
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
        <div class="tt">🏆 ${esc(win?.nickname || '')} ${win?.sc || 0} puanla birinci!</div>
        <div class="sub">${v.round}/${v.rounds}. tur sonucu</div>
        <ol class="res">${v.results.map((r, i) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">${r.sc} puan${r.strikes ? ` · 🔥${r.strikes}` : ''}${r.spares ? ` · ⭐${r.spares}` : ''}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
        <div class="cd"><span>${v.last ? 'Genel sonuçlar' : 'Sonraki tur'}</span><b data-cd></b></div>
        ${ctx.isHost ? `<button class="kb btn" data-game-action="next">${v.last ? 'Sonuçlara geç ▶' : 'Sonraki tur ▶'}</button>` : ''}
      </div>`;
    } else if (v.phase === 'final') {
      const sb = v.scoreboard || [];
      key = `final|${sb.map((s) => s.id + s.score).join(',')}|${ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🌭 Bowling şampiyonu: ${esc(sb[0]?.nickname || '—')}</div>
        <div class="sub">${v.best ? `En yüksek tur: <b>${v.best.sc} puan</b> (${esc(v.best.nickname)})` : 'Oyun bitti'}</div>
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
    const B = this.B;
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
    const playing = v.phase === 'play' && v.me >= 0 && !!B && B.live;
    const ctl = playing && !B.done && !this.panelLow && (B.phase === 'aim' || B.phase === 'power');
    this.el.tap.classList.toggle('off', !ctl);
    if (B) {
      const tt = B.phase === 'power' ? 'GÜÇ' : 'NİŞAN';
      if (this.tapTxt !== tt) { this.tapTxt = tt; this.el.tapT.textContent = tt; }
    }
    const pwOn = playing && !B.done && B.phase === 'power';
    this.el.pw.classList.toggle('off', !pwOn);
    if (pwOn) {
      const p = BW.powAt(B.powT);
      this.el.pwS.style.left = `calc(${(p * 100).toFixed(1)}% - 2px)`;
      this.el.pwU.style.width = `${(p * 100).toFixed(1)}%`;
    }
    const showBig = (v.phase === 'play' || (v.phase === 'ready' && t > -3.3)) && B && v.me >= 0 && !this.panelLow;
    this.el.big.style.display = showBig ? '' : 'none';
    if (B && showBig) {
      const hs = String(B.score);
      if (this.el.bigN.textContent !== hs) { this.el.bigN.textContent = hs; this.el.bigN.classList.add('pop'); setTimeout(() => this.el.bigN.classList.remove('pop'), 130); }
      const fr = B.done ? 'BİTTİ ✓' : `${Math.min(B.f + 1, B.frames)}/${B.frames}. ÇERÇEVE`;
      if (this.frTxt !== fr) { this.frTxt = fr; this.el.bigS.textContent = fr; }
      const pk = B.st.map((x) => (x ? 1 : 0)).join('');
      if (pk !== this.pinKey) {
        this.pinKey = pk;
        const rows = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]];
        this.el.pins.innerHTML = rows.map((r) => `<div>${r.map((i) => `<i class="${B.st[i] ? '' : 'dn'}"></i>`).join('')}</div>`).join('');
      }
    }
    let note = '';
    if (v.phase === 'play' && v.me < 0) note = '👀 Bu turu izliyorsun — sonrakinde sen de varsın!';
    else if (playing && !B.done && B.phase === 'aim' && !this.swUsed && B.f === 0 && B.t === 0) note = '👆 Topu yukarı kaydırarak fırlat ya da 🌭 NİŞAN’a dokun';
    else if (v.phase === 'play' && B && B.done) note = `✅ Atışların bitti: ${B.score} puan! Diğerleri bitirene kadar izle 👀`;
    if (note !== this.noteText) { this.noteText = note; this.el.note.textContent = note; this.el.note.classList.toggle('on', !!note); }
    this.el.note.classList.toggle('up', !!note && ctl);
    if (!showHud) return;
    const left = v.phase === 'play' ? Math.max(0, (v.endsAt - sNow) / 1000) : 0;
    const mm = Math.floor(left / 60), ss = Math.floor(left % 60);
    const tt2 = v.phase === 'result' ? '🏁' : v.phase === 'ready' ? `${Math.floor(PLAY_SEC / 60)}:${String(PLAY_SEC % 60).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
    if (tt2 !== this.ttText) { this.ttText = tt2; this.el.tm.textContent = tt2; }
    if (v.phase === 'play' && left < 10 && left > 0 && Math.ceil(left) !== this.lastTick) { this.lastTick = Math.ceil(left); this.snd.fx('tick'); }
    this.leaderboard();
  }
  leaderboard() {
    const v = this.view;
    if (!v || v.phase !== 'play' || !v.pl) { if (this.lbKey !== 'x') { this.lbKey = 'x'; this.el.lb.innerHTML = ''; } return; }
    const rows = v.players.map((p, i) => ({ i, p, s: v.pl[i][0], done: v.pl[i][2] }));
    const B = this.B;
    if (B && v.me >= 0 && rows[v.me]) { rows[v.me].s = Math.max(rows[v.me].s, B.score); rows[v.me].done = B.done ? 1 : rows[v.me].done; }
    rows.sort((a, b) => b.s - a.s);
    let show = rows.slice(0, LBL_CAP);
    const mi = rows.findIndex((r) => r.i === v.me);
    if (mi >= LBL_CAP) show = show.slice(0, LBL_CAP - 1).concat([rows[mi]]);
    const key = show.map((r) => `${r.i}:${r.s}:${r.done}`).join('|') + `#${mi}`;
    if (key === this.lbKey) return;
    this.lbKey = key;
    this.el.lb.innerHTML = show.map((r) => `<div class="${r.i === v.me ? 'me' : ''}${r.done ? ' out' : ''}"><em>${rows.indexOf(r) + 1}</em><i style="background:${pcol(r.p.c)}"></i><span>${esc(r.p.n)}</span><b>${r.done ? '✓ ' : ''}${r.s}</b></div>`).join('');
    if (mi >= 0 && v.me >= 0) { this.el.posB.textContent = String(mi + 1); this.el.posS.textContent = `/${rows.length}`; }
  }

  /* ---------- 3B dünya ---------- */
  mk(fn, kind = 'lit') { const mb = new MB(kind); fn(mb); return mb.build(this.X); }
  buildWorld() {
    const X = this.X;
    if (!X || this.lost) return;
    this.freeWorld();
    const W = { balls: {} };
    W.pin = [this.mk((mb) => bottleModel(mb, 0)), this.mk((mb) => bottleModel(mb, 1))];
    W.ball = this.mk((mb) => ballModel(mb, null));
    W.lane = [0, 1, 2].map((k) => this.mk((mb) => laneTopModel(mb, k)));
    W.below = this.mk(belowModel);
    W.above = this.mk(aboveModel);
    W.sweep = this.mk(sweepModel);
    W.table = this.mk((mb) => {
      mb.box(-(VLW - 0.03), 0, -(BW.F_END - 0.3), VLW - 0.03, 0.035, -(BW.PIN_F - 0.28), { top: C('#3b3946', -0.3), side: C('#2a2833', -0.3), bot: C('#1c1b22') });
      BW.ORIGIN.forEach((o) => mb.cyl(o.x, -0.012, -o.f, 0.075, 0, 0.075, 12, C('#141318'), C('#141318'), 'b'));
    });
    W.mask = this.mk((mb) => {
      for (const k of [-1, 0, 1]) {
        const ox = k * LANE_DX, z = -(BW.F_END - 0.12) + 0.006, row = k + 1;
        mb.tquad([ox - 0.97, 1.13, z], [ox + 0.97, 1.13, z], [ox + 0.97, 1.89, z], [ox - 0.97, 1.89, z], 0, row / 3, 1, (row + 1) / 3, [ox, 1.5, z - 1]);
      }
    }, 'tex');
    W.logo = this.mk((mb) => { const z = -(BW.F_END + 0.94); mb.tquad([-0.5, 2.06, z], [0.5, 2.06, z], [0.5, 3.06, z], [-0.5, 3.06, z], 0, 0, 1, 1, [0, 2.5, z - 1]); }, 'tex');
    // nişan oku: ileri (-z) bakan kalın "V" (beyaz; renk çizimde verilir) + hedef halkası
    W.chev = this.mk((mb) => {
      const arm = (sx) => { const a = [0, -0.5], b = [sx * 0.5, 0.16], t = 0.17; const nx = -(b[1] - a[1]), nz = b[0] - a[0], l = Math.hypot(nx, nz); const ox = (nx / l) * t * 0.5, oz = (nz / l) * t * 0.5;
        mb.quad([a[0] - ox, 0, a[1] - oz], [b[0] - ox, 0, b[1] - oz], [b[0] + ox, 0, b[1] + oz], [a[0] + ox, 0, a[1] + oz], [1, 1, 1, 1], [0, -1, 0]); };
      arm(-1); arm(1);
      mb.disc(0, 0, -0.5, 0.085, 0.085, 10, [1, 1, 1, 1]);
    }, 'un');
    W.ring = this.mk((mb) => {
      const N = 40;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const P = (a, r) => [Math.cos(a) * r, 0, Math.sin(a) * r];
        mb.quad(P(a0, 0.4), P(a1, 0.4), P(a1, 0.5), P(a0, 0.5), [1, 1, 1, 1], [0, -1, 0]);
      }
    }, 'un');
    this.W = W;
    if (!this.lblCv) { this.lblCv = document.createElement('canvas'); this.lblCv.width = 512; this.lblCv.height = 512; }
    this.lblKey = '';
    this.drawLabels();
    this.lblTex = makeTexture(X, this.lblCv);
  }
  ballMesh(hex) {
    const W = this.W;
    if (!W.balls[hex]) W.balls[hex] = this.mk((mb) => ballModel(mb, hex));
    return W.balls[hex];
  }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; return; }
    [...W.pin, W.ball, ...W.lane, W.below, W.above, W.sweep, W.table, W.mask, W.logo, W.chev, W.ring, ...Object.values(W.balls)].forEach((m) => freeMesh(this.X, m));
    if (this.lblTex) this.X.gl.deleteTexture(this.lblTex);
    this.lblTex = null;
    this.W = null;
  }
  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.W = null;
      this.lblTex = null;
      this.buildWorld();
    } catch (e) { console.warn('[bowling] geri yükleme', e); }
  }

  /* ---------- kulvar tabelaları (oyuncu adı + puan) ---------- */
  laneInfo() {
    const v = this.view;
    const pls = v?.players || [];
    const n = pls.length;
    const me = v && v.me >= 0 ? v.me : 0;
    const idx = { [-1]: n >= 3 ? (me - 1 + n) % n : -1, 0: n ? me : -1, 1: n >= 2 ? (me + 1) % n : -1 };
    const out = {};
    for (const k of [-1, 0, 1]) {
      const j = idx[k];
      const p = j >= 0 ? pls[j] : null;
      let sc = p && v.pl && v.pl[j] ? v.pl[j][0] : 0;
      if (k === 0 && this.B && this.B.live) sc = Math.max(sc, this.B.score);
      out[k] = p ? { j, name: p.n, c: p.c, score: sc } : { j: -1, name: '', c: 0, score: 0 };
    }
    return out;
  }
  drawLabels() {
    const L = this.laneInfo();
    const key = [-1, 0, 1].map((k) => `${L[k].name}|${L[k].score}|${L[k].c}`).join('#');
    if (key === this.lblKey) return false;
    this.lblKey = key;
    const cv = this.lblCv;
    const g = cv.getContext('2d');
    const H = cv.height / 3;
    for (const k of [-1, 0, 1]) {
      const y0 = (k + 1) * H;
      const l = L[k];
      const gr = g.createLinearGradient(0, y0, 0, y0 + H);
      gr.addColorStop(0, '#22163f'); gr.addColorStop(1, '#0c0818');
      g.fillStyle = gr;
      g.fillRect(0, y0, cv.width, H);
      const col = l.j >= 0 ? pcol(l.c) : '#ff4fb0';
      g.save();
      g.strokeStyle = col; g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 16;
      g.strokeRect(10, y0 + 10, cv.width - 20, H - 20);
      g.restore();
      g.textBaseline = 'middle';
      if (l.j < 0) {
        g.fillStyle = '#ffd23f'; g.textAlign = 'center';
        g.font = '800 54px system-ui, sans-serif';
        g.fillText('🌭 SOSİS BOWLING', cv.width / 2, y0 + H / 2 + 2);
        continue;
      }
      let name = String(l.name || '').toLocaleUpperCase('tr-TR');
      if (name.length > 11) name = name.slice(0, 10) + '…';
      g.textAlign = 'left';
      g.fillStyle = '#ffffff';
      g.shadowColor = col; g.shadowBlur = 12;
      g.font = '800 56px system-ui, sans-serif';
      g.fillText(name, 34, y0 + H / 2 + 2, 300);
      g.textAlign = 'right';
      g.fillStyle = '#ffd23f';
      g.font = '900 78px system-ui, sans-serif';
      g.fillText(String(l.score), cv.width - 34, y0 + H / 2 + 4);
      g.shadowBlur = 0;
    }
    return true;
  }

  /* ---------- komşu kulvarlar (diğer oyuncular) ---------- */
  syncNeighbors(v) {
    if (!this.nb) this.nb = {};
    const L = this.laneInfo();
    for (const side of [-1, 1]) {
      const j = L[side].j;
      let s = this.nb[side];
      const row = j >= 0 && v.pl ? v.pl[j] : null;
      if (j < 0) { this.nb[side] = null; continue; }
      const st = row ? row[4] ?? 10 : 10, fr = row ? row[1] : 0, sc = row ? row[0] : 0, th = row ? row[5] ?? 0 : 0;
      const rot = (j * 3) % 10;
      const order = PIN_ORDER.map((_, i) => PIN_ORDER[(i + rot) % 10]);
      if (!s || s.j !== j || s.key !== `${v.startAt}|${v.round}`) {
        const pins = BW.ORIGIN.map(() => ({ up: true, ht: -1, dx: 0, df: 1 }));
        order.slice(0, 10 - st).forEach((i) => { pins[i].up = false; });
        this.nb[side] = { j, key: `${v.startAt}|${v.round}`, pins, order, lastSt: st, lastF: fr, lastSc: sc, lastTh: th, ghost: null, col: pcol(L[side].c) };
        continue;
      }
      s.col = pcol(L[side].c);
      if (fr === s.lastF && st === s.lastSt) continue;
      // bir atış oldu: puan farkından devrilen şişeyi bul
      const d = sc - s.lastSc;
      let n;
      if (fr !== s.lastF && s.lastTh === 0) n = 10;
      else if (fr !== s.lastF) n = d >= 3 && d - 3 === s.lastSt ? s.lastSt : clamp(d, 0, s.lastSt);
      else n = clamp(s.lastSt - st, 0, 10);
      s.ghost = { t: 0, f: -0.5, x: (Math.random() - 0.5) * 0.3, n, reset: fr !== s.lastF, toppled: false };
      s.lastF = fr; s.lastSt = st; s.lastSc = sc; s.lastTh = th;
    }
  }
  stepNeighbors(dt) {
    if (!this.nb) return;
    for (const side of [-1, 1]) {
      const s = this.nb[side];
      if (!s) continue;
      s.pins.forEach((p) => { if (p.ht >= 0) p.ht += dt; });
      const g = s.ghost;
      if (!g) continue;
      g.t += dt;
      g.f = -0.5 + (g.t / 1.0) * (BW.F_END + 1.0);
      if (!g.toppled && g.f > BW.PIN_F - 0.2) {
        g.toppled = true;
        let left = g.n;
        for (const i of s.order) {
          if (left <= 0) break;
          const p = s.pins[i];
          if (!p.up) continue;
          p.up = false; p.ht = 0; p.dx = (Math.random() - 0.5) * 0.9; p.df = 1;
          left -= 1;
        }
        if (g.n >= 3 && side) this.snd.fx('pin', 0.2);
      }
      if (g.t > 2.4) {
        if (g.reset) s.pins.forEach((p) => { p.up = true; p.ht = -1; });
        s.ghost = null;
      }
    }
  }
  nbPins(side) {
    const s = this.nb?.[side];
    const out = [];
    if (!s) { BW.ORIGIN.forEach((o, i) => out.push({ x: o.x, f: o.f, i, tilt: 0 })); return out; }
    s.pins.forEach((p, i) => {
      const o = BW.ORIGIN[i];
      if (p.up) out.push({ x: o.x, f: o.f, i, tilt: 0 });
      else if (p.ht >= 0 && p.ht < 1.1) out.push({ x: o.x + p.dx * p.ht * 0.25, f: o.f + p.ht * 0.35, i, tilt: Math.min(1, p.ht / 0.3) * 1.5, dx: p.dx, df: p.df });
    });
    return out;
  }

  /* ---------- kendi kulvarın: şişe makinesi zamanlaması ---------- */
  sweepState() {
    const B = this.B;
    if (!B || B.phase !== 'settle') return null;
    const s = 2.0 - B.wait;
    const front = BW.PIN_F - 0.55, back = BW.F_END + 0.3;
    let barY = 1.15, barF = front;
    if (s > 0.55 && s <= 0.85) barY = lerp(1.15, 0.015, ease((s - 0.55) / 0.3));
    else if (s > 0.85 && s <= 1.35) { barY = 0.015; barF = lerp(front, back, ease((s - 0.85) / 0.5)); }
    else if (s > 1.35) { barF = back; barY = lerp(0.015, 1.15, ease((s - 1.35) / 0.3)); }
    const lift = B.clear ? 0 : 0.5 * (ease((s - 0.55) / 0.3) - ease((s - 1.4) / 0.3));
    const fresh = B.clear ? 0.55 * (1 - ease((s - 1.45) / 0.4)) : -1;
    // şişe tablası: duran şişeleri kaldırıp geri koyar, yeni çerçevede 10 şişeyi indirir
    const down = B.clear ? ease((s - 1.25) / 0.2) - ease((s - 1.85) / 0.15) : ease((s - 0.4) / 0.2) - ease((s - 1.7) / 0.25);
    const tableY = lerp(1.14, 0.61 + (B.clear ? Math.max(0, fresh) : lift), clamp(down, 0, 1));
    return { s, barY, barF, lift, fresh, clear: B.clear, tableY };
  }
  ownPins() {
    const B = this.B;
    const out = [];
    if (!B) { BW.ORIGIN.forEach((o, i) => out.push({ x: o.x, f: o.f, i, tilt: 0 })); return out; }
    const sw = this.sweepState();
    if (B.sim) {
      B.sim.pins.forEach((p) => {
        if (p.gone) return;
        const swept = p.hit || (sw && sw.clear);
        let f = p.f;
        if (sw && swept && sw.s > 0.85 && sw.barF > f - 0.15) f = sw.barF + 0.15;
        if (f > BW.F_END + 0.3) return;
        if (p.hit) out.push({ x: p.x, f, i: p.i, tilt: Math.min(1, p.ht / 0.3) * 1.5, dx: p.dx, df: p.df });
        else out.push({ x: p.x, f, i: p.i, tilt: 0, lift: sw && !sw.clear ? sw.lift : 0 });
      });
      if (sw && sw.clear && sw.fresh >= 0 && sw.s > 1.4) BW.ORIGIN.forEach((o, i) => out.push({ x: o.x, f: o.f, i, tilt: 0, lift: sw.fresh }));
      return out;
    }
    BW.ORIGIN.forEach((o, i) => { if (B.st[i]) out.push({ x: o.x, f: o.f, i, tilt: 0 }); });
    return out;
  }
  pinMat(m, q, ox) {
    if (!q.tilt) { M.set(m, ox + q.x, q.lift || 0, -q.f, (((q.i * 37) % 7) - 3) * 0.09, 0, 0, 1); return m; }
    const phi = Math.min(q.tilt, 1.52);
    let dx = q.dx || 0, dz = -(q.df ?? 1);
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    const k = PIN_RB * (1 - Math.cos(phi)), up = PIN_RB * Math.sin(phi);
    M.set(m, ox + q.x + dx * k, up, -q.f + dz * k, Math.atan2(dx, dz), phi, 0, 1);
    return m;
  }
  drawObjects(mir, cast = null) {
    const X = this.X, Wd = this.W, m = this.mats.a, mm = this.mats.b;
    const TN = mir ? MIR_T : ONE3;
    const put = cast ? (mesh) => cast(mesh, m) : (mesh) => { if (mir) drawMesh(X, mesh, mirY(mm, m), TN); else drawMesh(X, mesh, m, TN); };
    this.ownPins().forEach((q) => { this.pinMat(m, q, 0); put(Wd.pin[q.i % 2]); });
    const B = this.B;
    if (B && B.sim && !B.sim.ball.done) {
      const b = B.sim.ball;
      M.set(m, b.g ? b.g * GX : b.x, BW.BR - (b.g ? 0.08 : 0), -b.f, 0, -b.roll, 0, 1);
      put(Wd.ball);
    } else if (B && !B.sim && !B.done && B.live) {
      M.set(m, B.x0 || 0, BW.BR, -0.3, 0, 0.6, 0, 1);
      put(Wd.ball);
    }
    const sw = this.sweepState();
    if (sw && sw.barY < 1.12) { M.set(m, 0, sw.barY, -sw.barF, 0, 0, 0, 1); put(Wd.sweep); }
    if (sw && sw.tableY < 1.12) { M.set(m, 0, sw.tableY, 0, 0, 0, 0, 1); put(Wd.table); }
    for (const side of [-1, 1]) {
      if (mir) break;          // komşu kulvarların yansıması çizilmez (hız için)
      const ox = side * LANE_DX;
      this.nbPins(side).forEach((q) => { this.pinMat(m, q, ox); put(Wd.pin[q.i % 2]); });
      const s = this.nb?.[side];
      if (s && s.ghost && s.ghost.f < BW.F_END + 0.4 && s.ghost.f > -0.4) {
        M.set(m, ox + s.ghost.x, BW.BR, -s.ghost.f, 0, -s.ghost.f / BW.BR, 0, 1);
        put(this.ballMesh(s.col));
      }
    }
  }
  drawShadows() {
    const X = this.X, m = this.mats.a;
    const sh = this.res.shadow;
    const blob = (x, f, sx, sz, a, ry = 0) => { M.set(m, x, 0.004, -f, ry, 0, 0, sx, 1, sz); drawMesh(X, sh, m, ONE3, a); };
    const pinBlob = (q, ox) => {
      if (!q.tilt) { blob(ox + q.x, q.f, 0.17, 0.17, 0.5 * clamp(1 - (q.lift || 0) * 1.6, 0, 1)); return; }
      let dx = q.dx || 0, dz = -(q.df ?? 1);
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      const k = Math.sin(Math.min(q.tilt, 1.52)) * 0.26;
      blob(ox + q.x + dx * k, q.f - dz * k, 0.17, 0.17 + k * 0.9, 0.45, Math.atan2(dx, dz));
    };
    this.ownPins().forEach((q) => pinBlob(q, 0));
    for (const side of [-1, 1]) this.nbPins(side).forEach((q) => pinBlob(q, side * LANE_DX));
    const B = this.B;
    if (B && B.sim && !B.sim.ball.done && !B.sim.ball.g) blob(B.sim.ball.x, B.sim.ball.f, 0.28, 0.28, 0.55);
    else if (B && !B.sim && !B.done && B.live) blob(B.x0 || 0, 0.3, 0.28, 0.28, 0.55);
  }

  /* ---------- parçacıklar ---------- */
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
  stepCam(dt) {
    const c = this.cam;
    const vw = this.vw || 1, vh = this.vh || 1;
    const asp = vw / vh;
    const land = asp > 1.1;
    this.fov = land ? 0.62 : 0.74;
    const B = this.B;
    let ef = -3.2, ey = 2.05, tf = BW.PIN_F - 4.4, ty = 0.1, ex = 0;
    if (B && B.sim) {
      const b = B.sim.ball;
      const bf = clamp(b.f, 0, BW.PIN_F);
      ef = clamp(bf - 3.6, -3.2, BW.PIN_F - 4.8);
      ey = 1.7 + 0.4 * (1 - (ef + 3.2) / (BW.PIN_F - 1.6));
      tf = Math.min(bf + 6, BW.PIN_F + 0.6);
      ex = clamp(b.x * 0.35, -0.5, 0.5);
    }
    if (land) { ef -= 0.4; ey += 0.15; }
    const k = B && B.sim ? 5 : 2.4;
    c.ez = damp(c.ez, -ef, k, dt);
    c.ey = damp(c.ey, ey, k, dt);
    c.ex = damp(c.ex, ex, k, dt);
    c.tz = damp(c.tz, -tf, k, dt);
    c.ty = damp(c.ty, ty, k, dt);
    c.tx = damp(c.tx, ex * 0.5, k, dt);
    c.shake = Math.max(0, c.shake - dt * 1.6);
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
    M.persp(mt.P, this.fov, asp, 0.2, 120);
    const sh = c.shake > 0 ? (Math.random() - 0.5) * c.shake * 0.12 : 0;
    M.look(mt.V, c.ex + sh, c.ey + sh * 0.6, c.ez, c.tx, c.ty, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const F = { VP: mt.VP, V: mt.V, fov: this.fov, asp, shift: 0, cx: c.ex, cy: c.ey, cz: c.ez, sun: SUN, fog: FOG, lx: LAMP[0], ly: LAMP[1], lz: LAMP[2], lampC: LIGHT.lampC };
    const setFog = (p) => { if (p.u.uFogR) gl.uniform2f(p.u.uFogR, 26, 75); };
    if (this.drawLabels() && this.lblTex) updateTexture(X, this.lblTex, this.lblCv);
    // gerçek gölgeler: şişeler, top, süpürge, ayırıcı duvarlar kulvara gölge düşürür
    if (shadowBegin(X, SUN, 0, 0.4, -BW.PIN_F * 0.55, BW.PIN_F * 0.55 + 2.5)) {
      const cast = (mesh, mm) => shadowCast(X, mesh, mm);
      const I0 = M.set(mt.c, 0, 0, 0);
      cast(Wd.above, I0);
      this.drawObjects(false, cast);
    }
    shadowEnd(X, Wp, Hp);
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(FOG[0], FOG[1], FOG[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    useProg(X, X.lit, F, LIGHT);
    setFog(X.lit);
    const I = mt.c;
    M.set(I, 0, 0, 0);
    // 1) kulvar altı (oluklar, çukur, derin zemin)
    drawMesh(X, Wd.below, I, ONE3);
    // 2) yansımalar: kulvarın üstündeki her şey y'de aynalanır (yansımada gölge yok)
    shadowSet(X, false);
    drawMesh(X, Wd.above, mirY(mt.b, I), MIR_T);
    this.drawObjects(true);
    shadowSet(X, true);
    // 3) cilalı kulvar: yarı saydam; uzak kısım daha çok yansıtır (bakış açısı yatıklaştıkça)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    detailOn(X, 0.3, 9.0, 0.22);
    const FC = [0, 5, 8.8];
    Wd.lane.forEach((ln, k) => {
      const vx = -c.ex, vy = -c.ey, vz = -FC[k] - c.ez;
      const cs = Math.abs(vy) / (Math.hypot(vx, vy, vz) || 1);
      const R = clamp(0.34 * (1 - cs) * (1 - cs), 0.035, 0.22);
      drawMesh(X, ln, I, ONE3, 1 - R);
    });
    detailOn(X, 0);
    gl.disable(gl.BLEND);
    // 4) gerçek dünya
    drawMesh(X, Wd.above, I, ONE3);
    this.drawObjects(false);
    // 5) tabelalar + logo
    useProg(X, X.tex, F, LIGHT);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 1);
    if (this.lblTex) { gl.bindTexture(gl.TEXTURE_2D, this.lblTex); drawMesh(X, Wd.mask, I); }
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    drawMesh(X, Wd.logo, I);
    // 6) saydam: yumuşak gölgeler, nişan çizgisi, parçacıklar
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, LIGHT);
    setFog(X.un);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    this.drawShadows();
    const B = this.B;
    const m = mt.a;
    // nişan oku: pistin üstünde koyu kenarlı, parlak renkli "V" dizisi (açık renkli ahşapta da net görünür), ileri doğru akar;
    // şişelerin önünde hedef halkası. Güç aşamasında yeşil ve güçle birlikte uzar.
    if (B && B.live && !B.sim && !B.done && (B.phase === 'aim' || B.phase === 'power') && this.view?.phase === 'play' && Wd.chev) {
      const q = this.sw && this.sw.moved ? this.sw : null;
      let a = B.phase === 'aim' ? BW.aimAt(B.aimT) : B.aim;
      if (q) { const lp = q.pts[q.pts.length - 1]; a = clamp(Math.atan2(lp[0] - q.sx, -(lp[1] - q.sy) || -1) * 0.3, -BW.AIM_MAX * 1.2, BW.AIM_MAX * 1.2); }
      const ta = Math.tan(a);
      const x0 = B.x0 || 0;
      const pow = B.phase === 'power' ? clamp(BW.powAt ? BW.powAt(B.powT) : 0.5 + 0.5 * Math.sin(B.powT * 3), 0, 1) : 1;
      const col = B.phase === 'power' ? [0.45, 1, 0.3] : q ? [1, 0.35, 0.85] : [0.1, 0.92, 1];
      const len = (BW.PIN_F - 1.4) * (B.phase === 'power' ? 0.35 + 0.65 * pow : 1);
      const step = 0.62, ph = (this.time * 1.6) % step;
      const OUT = [0.02, 0.02, 0.07];
      for (let pass = 0; pass < 2; pass++) {
        for (let f = 1.1 + ph; f < 1.1 + len; f += step) {
          const fade = clamp((f - 1.1) / 0.5, 0, 1) * clamp((1.1 + len - f) / 0.8, 0, 1);
          const sc = pass ? 0.46 : 0.6;
          M.set(m, x0 + f * ta, pass ? 0.024 : 0.022, -f, -a, 0, 0, sc, 1, sc);
          drawMesh(X, Wd.chev, m, pass ? col : OUT, (pass ? 1 : 0.8) * fade);
        }
      }
      // hedef: okun şişe alanına vardığı yerde halka
      if (B.phase === 'aim') {
        const ff = BW.PIN_F - 0.55, pulse = 1 + 0.08 * Math.sin(this.time * 6);
        M.set(m, x0 + ff * ta, 0.023, -ff, 0, 0, 0, 0.66 * pulse, 1, 0.66 * pulse); drawMesh(X, Wd.ring, m, OUT, 0.75);
        M.set(m, x0 + ff * ta, 0.025, -ff, 0, 0, 0, 0.56 * pulse, 1, 0.56 * pulse); drawMesh(X, Wd.ring, m, col, 1);
      }
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    // top yuvarlanırken kamera pisti yakından izler: parlak cilalı pist göz almasın diye parlama yumuşar
    const ch = this.chaseK = damp(this.chaseK || 0, B && B.sim ? 1 : 0, 3, this.dtDraw || 0.016);
    postFX(X, Wp, Hp, { bloom: 0.95 - 0.3 * ch, th: 0.6 + 0.14 * ch, white: 0.2 + 0.06 * ch, sat: 1.1, con: 0.12, vig: 0.75 });
  }
  // WebGL yoksa: üstten görünüm
  draw2d() {
    const g = this.g2;
    const cv = this.el.cv;
    if (!g) return;
    const w = this.el.wrap.clientWidth || 1, h = this.el.wrap.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#140d26'; g.fillRect(0, 0, w, h);
    const sc = Math.min(w / 2.2, h / 12.5);
    const X0 = w / 2, Y0 = h * 0.9;
    const P = (x, f) => [X0 + x * sc, Y0 - f * sc];
    g.fillStyle = '#d9a965';
    const [lx, ly] = P(-BW.LW, BW.F_END);
    g.fillRect(lx, ly, BW.LW * 2 * sc, (BW.F_END + 0.5) * sc);
    const B = this.B;
    const draw = (o, col) => { const [x, y] = P(o.x, o.f); g.fillStyle = col; g.beginPath(); g.arc(x, y, BW.PR * sc, 0, 7); g.fill(); };
    if (B && B.sim) B.sim.pins.forEach((p) => { if (!p.gone) draw(p, p.hit ? '#888' : '#d92b1e'); });
    else BW.ORIGIN.forEach((o, i) => { if (!B || B.st[i]) draw(o, '#d92b1e'); });
    if (B && B.sim) { const [x, y] = P(B.sim.ball.x, B.sim.ball.f); g.fillStyle = '#a6502d'; g.beginPath(); g.arc(x, y, BW.BR * sc, 0, 7); g.fill(); }
    else if (B && B.live && !B.done) {
      const a = B.phase === 'aim' ? BW.aimAt(B.aimT) : B.aim;
      const [x, y] = P(0, 0.5); g.fillStyle = '#a6502d'; g.beginPath(); g.arc(x, y, BW.BR * sc, 0, 7); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); const [x2, y2] = P(Math.tan(a) * BW.PIN_F, BW.PIN_F); g.lineTo(x2, y2); g.stroke();
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
      const B = this.B;
      const v = this.view;
      if (B) {
        const playing = v && v.phase === 'play' && B.live && this.simNow() > 0;
        if (v && (v.phase === 'ready' || playing) && !B.done && (B.phase === 'aim' || B.phase === 'power')) {
          if (B.phase === 'aim') B.aimT += dt; else B.powT += dt;
        }
        if (B.phase === 'roll' && B.sim) {
          const ts = B.slowT > 0 ? 0.42 : 1;
          if (B.slowT > 0) B.slowT -= dt;
          B.acc += dt * ts;
          let n = 0;
          while (B.acc >= D_STEP && n++ < 40) {
            B.acc -= D_STEP;
            BW.step(B.sim, D_STEP);
            if (B.sim.finished) break;
          }
          const evs = B.sim.ev;
          if (evs.length) {
            let hits = 0, mx = 0;
            evs.forEach((e) => { if (e[0] === 'hit') { hits++; mx = Math.max(mx, e[1]); } else if (e[0] === 'gutter') { this.snd.fx('gutter'); } });
            if (hits && !B.slowDone && B.t === 0) { B.slowDone = true; B.slowT = 0.55; }
            if (hits && this.time - (this.lastPinSnd || 0) > 0.05) { this.lastPinSnd = this.time; this.snd.fx('pin', clamp(mx / 8 + hits / 6, 0, 1)); if (hits >= 2) this.cam.shake = Math.max(this.cam.shake, 0.25); }
            B.sim.ev = [];
          }
          if (B.sim.finished) this.settle();
        } else if (B.phase === 'settle') {
          if (B.sim) B.sim.pins.forEach((p) => { if (p.hit) p.ht += dt; });
          B.wait -= dt;
          if (B.wait <= 0) this.afterSettle();
        }
      }
      this.stepNeighbors(dt);
      this.stepParts(dt);
      this.stepCam(dt);
      this.dtDraw = dt;
      this.draw();
      this.hud(sNow);
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[bowling]', e); }
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
        this.freeWorld();
        this.res?.dispose();
        this.X.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch { /* yok say */ }
    this.el.wrap.remove();
    document.documentElement.style.overflow = this.prevOverflow || '';
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new Game(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[bowling]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

// Test ve hata ayıklama için (oyunda kullanılmaz)
export const _dbg = () => ({ G, BW });
