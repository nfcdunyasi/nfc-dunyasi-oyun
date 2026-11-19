// Mini Golf — 3D mini golf oyunu (NFC Dünyası Oyun)
// Kurye Yarışı'nın küçük WebGL motorunu yeniden kullanır. Herkes aynı anda vurur; sonucu sunucu hesaplar,
// telefon aynı fizik çekirdeğiyle animasyonu oynatır.
import { _eng } from './kuryeYarisi.js?v=2026-11-19-c';
const { ctx2d, podiumHTML, EmoteUI, aoOn, drawToon, detailOn, KIT, postFX, shadowBegin, shadowCast, shadowEnd, emitSoft, autoRes, sfx, clamp, lerp, damp, esc, hexRGB, C, shade, M, makeGL, MB, freeMesh, drawMesh, IDENT, drawSky, drawDynamic, useProg, TOD, norm3, brandInfo, Res, Snd, pcol, vibrate, medal, ONE3, injectStyle } = _eng();

// Ortak çekirdek (sunucudaki botlar ve fizik de birebir aynı kodu kullanır)
const MG = (() => {
  // Mini Golf çekirdeği: 2D top-down fizik, 6 çukur, bot zekâsı.
  // Sunucu (gerçek sonuç) ve telefon (animasyon) AYNI kodu çalıştırır; hareketli engeller çukur süresinin saf fonksiyonudur.
  const DT = 1 / 120;
  const BR = 0.25;                // top yarıçapı (m)
  const CUP_R = 0.42;             // delik yarıçapı
  const VMAX = 13.5, VMIN = 1.4;  // vuruş hızı aralığı (m/sn)
  const DRAG = 0.3, FRIC = 1.2;   // sürtünme: v' = -DRAG*v - FRIC
  const VSTOP = 0.14;
  const REST_W = 0.8, REST_P = 0.88;
  const MAXS = 6;                 // en çok vuruş
  const SIM_MAX = 26;             // bir vuruşun en uzun süresi (sn)
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const TAU = Math.PI * 2;

  const HOLES = [
    {
      name: 'Düz Yol', emoji: '📏', par: 2, sub: 'Isınma turu: sağdaki sos birikintisine dikkat!',
      tee: [0, 5], cup: [0, -7.6], logo: [0, 1.8],
      poly: [[-2, 6.6], [2, 6.6], [2, -9.2], [-2, -9.2]],
      pegs: [[-0.85, -0.5, 0.38], [0.9, -3.4, 0.38]],
      pits: [[1.15, -2.0, 2, -0.8]],
    },
    {
      name: 'Dirsek', emoji: '↪️', par: 3, sub: 'Köşeyi duvardan sektirerek dön, sosa düşme.',
      tee: [-3.2, 5.2], cup: [5.2, -4], logo: [-3.2, 0.2],
      poly: [[-5, 6.6], [-1.4, 6.6], [-1.4, -1.8], [6.6, -1.8], [6.6, -6.2], [-5, -6.2]],
      pegs: [[2.6, -3.9, 0.4]],
      pits: [[0.3, -6.2, 1.7, -4.9]],
    },
    {
      name: 'Yel Değirmeni', emoji: '🌀', par: 3, sub: 'Kanatlar dönerken aralıktan geç, sosa dikkat.',
      tee: [0, 5], cup: [0, -8.7], logo: [0, -1.4],
      poly: [[-2.7, 6.6], [2.7, 6.6], [2.7, -10.2], [-2.7, -10.2]],
      pegs: [[-1.8, 1.2, 0.4], [1.8, 1.2, 0.4]],
      spin: [{ x: 0, y: -4.6, len: 1.95, k: 2, w: 1.5, ph: 0 }],
      pits: [[-2.7, -7.4, -1.8, -6.4]],
    },
    {
      name: 'Sos Gölü', emoji: '🍅', par: 3, sub: 'Sosa düşersen +1 ceza! Köprüden geç.',
      tee: [0, 5.2], cup: [0, -9.2], logo: [0, -0.9],
      poly: [[-3, 6.6], [3, 6.6], [3, -10.8], [-3, -10.8]],
      pits: [[-3, -6.2, -0.62, -2.8], [0.62, -6.2, 3, -2.8]],
      pegs: [[0, 1.4, 0.4]],
    },
    {
      name: 'Kayan Kapılar', emoji: '🚪', par: 3, sub: 'Kapıların açıldığı anı kolla.',
      tee: [0, 5], cup: [0, -10.6], logo: [0, -4.5],
      poly: [[-2.5, 6.6], [2.5, 6.6], [2.5, -12.2], [-2.5, -12.2]],
      slide: [{ x: 0, y: -2.4, hl: 1.25, amp: 1.25, per: 3.2, ph: 0, v: 0 }, { x: 0, y: -6.6, hl: 1.25, amp: 1.25, per: 3.2, ph: Math.PI, v: 0 }],
      pegs: [[0, 1.8, 0.4]],
    },
    {
      name: 'Büyük Final', emoji: '🏆', par: 4, sub: 'Zikzak yol, hız şeridi ve değirmen!',
      tee: [-5, 5], cup: [-4.5, -9.4], logo: [4, -5],
      poly: [[-6, 7], [6, 7], [6, -7], [-3, -7], [-3, -11], [-6, -11], [-6, -3], [3, -3], [3, 3], [-6, 3]],
      pegs: [[0, 5, 0.42], [-1.2, -5, 0.01]],
      boosts: [{ x: 4.5, y: 0, r: 1.05, dx: 0, dy: -1 }],
      spin: [{ x: -0.5, y: -5, len: 1.55, k: 2, w: -1.7, ph: 0.6 }],
      pits: [[-6, -11, -5.1, -9.6]],
    },
  ];
  // sıfır yarıçaplı kazığı temizle (yazım kolaylığı)
  HOLES.forEach((h) => { h.pegs = (h.pegs || []).filter((p) => p[2] > 0.05); });

  /* ---------------- hazırlık ---------------- */
  const prepped = [];
  function prep(hi) {
    if (prepped[hi]) return prepped[hi];
    const h = HOLES[hi];
    const segs = [];
    const P = h.poly;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; segs.push([a[0], a[1], b[0], b[1]]); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    P.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const o = { h, segs, bbox: [x0, y0, x1, y1], spin: h.spin || [], slide: h.slide || [], pits: h.pits || [], boosts: h.boosts || [], pegs: h.pegs || [] };
    prepped[hi] = o;
    return o;
  }

  /* ---------------- hareketli engeller ---------------- */
  // pervane: bıçak i'nin açısı
  const bladeAng = (s, i, t) => s.ph + s.w * t + (i * TAU) / s.k;
  function slideC(s, t) { return Math.sin((TAU * t) / s.per + s.ph) * s.amp; }
  function slideSeg(s, t) {
    const c = slideC(s, t);
    return s.v ? [s.x, s.y + c - s.hl, s.x, s.y + c + s.hl] : [s.x + c - s.hl, s.y, s.x + c + s.hl, s.y];
  }
  function slideVel(s, t) {
    const d = Math.cos((TAU * t) / s.per + s.ph) * s.amp * (TAU / s.per);
    return s.v ? [0, d] : [d, 0];
  }

  const EV = { s: 0, k: 0 };
  function hitSeg(b, ax, ay, bx, by, rad, res, ox, oy, w, svx, svy, k) {
    const ex = bx - ax, ey = by - ay;
    const l2 = ex * ex + ey * ey;
    let u = l2 > 1e-9 ? ((b.x - ax) * ex + (b.y - ay) * ey) / l2 : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = ax + ex * u, cy = ay + ey * u;
    let dx = b.x - cx, dy = b.y - cy;
    let d = Math.sqrt(dx * dx + dy * dy);
    const R = BR + rad;
    if (d >= R) return false;
    let nx, ny;
    if (d < 1e-6) { const l = Math.sqrt(l2) || 1; nx = -ey / l; ny = ex / l; d = 0; } else { nx = dx / d; ny = dy / d; }
    b.x += nx * (R - d); b.y += ny * (R - d);
    const wx = svx - w * (cy - oy), wy = svy + w * (cx - ox);
    const rvx = b.vx - wx, rvy = b.vy - wy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const j = -(1 + res) * vn;
      b.vx += nx * j; b.vy += ny * j;
      if (-vn > EV.s) { EV.s = -vn; EV.k = k; }
    }
    return true;
  }
  function hitPeg(b, px, py, pr, k) {
    const dx = b.x - px, dy = b.y - py;
    const R = BR + pr;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d, ny = dy / d;
    b.x += nx * (R - d); b.y += ny * (R - d);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + REST_P) * vn * nx; b.vy -= (1 + REST_P) * vn * ny;
      if (-vn > EV.s) { EV.s = -vn; EV.k = k; }
    }
  }

  /* ---------------- bir adım ---------------- */
  // b: {x,y,vx,vy,st}  st: 0 yolda/duruyor, 1 deliğe girdi, 2 sosa düştü.  Dönen: olay gücü (EV içinde k: 1 duvar, 2 kazık, 3 değirmen, 4 kapı)
  function step(o, b, t) {
    const h = o.h;
    EV.s = 0; EV.k = 0;
    let sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > 0) {
      let kd = DRAG, c = FRIC;
      const ns = Math.max(0, sp - (kd * sp + c) * DT);
      const f = ns / sp;
      b.vx *= f; b.vy *= f;
    }
    for (let i = 0; i < o.boosts.length; i++) {
      const z = o.boosts[i];
      if ((b.x - z.x) * (b.x - z.x) + (b.y - z.y) * (b.y - z.y) < z.r * z.r) { b.vx += z.dx * 26 * DT; b.vy += z.dy * 26 * DT; }
    }
    b.x += b.vx * DT; b.y += b.vy * DT;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < o.segs.length; i++) { const s = o.segs[i]; hitSeg(b, s[0], s[1], s[2], s[3], 0, REST_W, 0, 0, 0, 0, 0, 1); }
      for (let i = 0; i < o.pegs.length; i++) { const p = o.pegs[i]; hitPeg(b, p[0], p[1], p[2], 2); }
      for (let i = 0; i < o.spin.length; i++) {
        const s = o.spin[i];
        for (let j = 0; j < s.k; j++) {
          const a = bladeAng(s, j, t);
          hitSeg(b, s.x, s.y, s.x + Math.cos(a) * s.len, s.y + Math.sin(a) * s.len, 0.1, REST_W, s.x, s.y, s.w, 0, 0, 3);
        }
        hitPeg(b, s.x, s.y, 0.2, 2);
      }
      for (let i = 0; i < o.slide.length; i++) {
        const s = o.slide[i];
        const g = slideSeg(s, t), v = slideVel(s, t);
        hitSeg(b, g[0], g[1], g[2], g[3], 0.1, REST_W, 0, 0, 0, v[0], v[1], 4);
      }
    }
    for (let i = 0; i < o.pits.length; i++) {
      const r = o.pits[i];
      if (b.x > r[0] + 0.05 && b.x < r[2] - 0.05 && b.y > r[1] + 0.05 && b.y < r[3] - 0.05) { b.st = 2; return EV.s; }
    }
    const dx = b.x - h.cup[0], dy = b.y - h.cup[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (d < CUP_R * 1.6 && sp < 3.6 && d > 0.02) { b.vx -= (dx / d) * 7 * DT; b.vy -= (dy / d) * 7 * DT; }
    if (d < CUP_R && sp < 4.4) { b.st = 1; b.x = h.cup[0]; b.y = h.cup[1]; b.vx = b.vy = 0; }
    return EV.s;
  }

  // hareketli engelin vuruş alanındaysa top dinlenemez (engel onu itene kadar sim sürer)
  function danger(o, b) {
    for (let i = 0; i < o.spin.length; i++) { const s = o.spin[i]; if (Math.hypot(b.x - s.x, b.y - s.y) < s.len + BR + 0.12) return true; }
    for (let i = 0; i < o.slide.length; i++) {
      const s = o.slide[i];
      if (s.v) { if (Math.abs(b.x - s.x) < BR + 0.14 && Math.abs(b.y - s.y) < s.amp + s.hl + BR + 0.1) return true; }
      else if (Math.abs(b.y - s.y) < BR + 0.14 && Math.abs(b.x - s.x) < s.amp + s.hl + BR + 0.1) return true;
    }
    return false;
  }

  // Bir adım + durma kararı. true: hâlâ oynuyor. b.idle: durdu ama tehlike bölgesinde bekliyor.
  function tick(o, b, t) {
    const e = step(o, b, t);
    if (b.st) return { live: false, e };
    const sp2 = b.vx * b.vx + b.vy * b.vy;
    if (sp2 < VSTOP * VSTOP) {
      b.vx = b.vy = 0;
      if (!danger(o, b)) return { live: false, e };
      b.idle = (b.idle || 0) + DT;
      if (b.idle > 9) return { live: false, e };
    } else b.idle = 0;
    return { live: true, e };
  }

  const speedOf = (p) => VMIN + (VMAX - VMIN) * clamp(p, 0, 1);

  // Tam vuruşu hesapla (sunucu ve bot). t0: çukur başladığından beri geçen sn.
  function shoot(hi, x, y, a, p, t0) {
    const o = prep(hi);
    const v = speedOf(p);
    const b = { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, st: 0, idle: 0 };
    let t = t0, n = 0;
    const max = Math.round(SIM_MAX / DT);
    let live = true;
    let bounces = 0;
    while (live && n < max) {
      const r = tick(o, b, t);
      live = r.live;
      if (r.e > 1.2) bounces += 1;
      t += DT; n += 1;
    }
    return { x: b.x, y: b.y, dur: n * DT, holed: b.st === 1, pit: b.st === 2, bounces };
  }

  /* ---------------- yol haritası (bot için) ---------------- */
  const CELL = 0.3;
  const fields = [];
  function inPoly(P, x, y) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i], b = P[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function field(hi) {
    if (fields[hi]) return fields[hi];
    const o = prep(hi);
    const [x0, y0, x1, y1] = o.bbox;
    const W = Math.ceil((x1 - x0) / CELL) + 1, H = Math.ceil((y1 - y0) / CELL) + 1;
    const ok = new Uint8Array(W * H);
    const cx = (i) => x0 + i * CELL, cy = (j) => y0 + j * CELL;
    const clear = (x, y) => {
      if (!inPoly(o.h.poly, x, y)) return false;
      for (const s of o.segs) { const ex = s[2] - s[0], ey = s[3] - s[1]; const l2 = ex * ex + ey * ey; const u = clamp(((x - s[0]) * ex + (y - s[1]) * ey) / l2, 0, 1); if (Math.hypot(x - (s[0] + ex * u), y - (s[1] + ey * u)) < BR + 0.05) return false; }
      for (const p of o.pegs) if (Math.hypot(x - p[0], y - p[1]) < p[2] + BR + 0.05) return false;
      for (const r of o.pits) if (x > r[0] - 0.2 && x < r[2] + 0.2 && y > r[1] - 0.2 && y < r[3] + 0.2) return false;
      return true;
    };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) ok[j * W + i] = clear(cx(i), cy(j)) ? 1 : 0;
    const dist = new Float32Array(W * H).fill(1e6);
    const ci = clamp(Math.round((o.h.cup[0] - x0) / CELL), 0, W - 1), cj = clamp(Math.round((o.h.cup[1] - y0) / CELL), 0, H - 1);
    dist[cj * W + ci] = 0; ok[cj * W + ci] = 1;
    // küçük ızgara: değişim kalmayana dek süpür
    for (let sweep = 0, ch = true; ch && sweep < 400; sweep++) {
      ch = false;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (!ok[k]) continue;
        let d = dist[k];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
          const nk = nj * W + ni;
          if (!ok[nk]) continue;
          const nd = dist[nk] + (di && dj ? 1.414 : 1) * CELL;
          if (nd < d) d = nd;
        }
        if (d < dist[k]) { dist[k] = d; ch = true; }
      }
    }
    const F = { x0, y0, W, H, dist, at(x, y) { const i = clamp(Math.round((x - x0) / CELL), 0, W - 1), j = clamp(Math.round((y - y0) / CELL), 0, H - 1); let d = dist[j * W + i]; if (d >= 1e6) { let best = 1e6; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; best = Math.min(best, dist[nj * W + ni] + Math.hypot(di, dj) * CELL); } d = best; } return d; } };
    fields[hi] = F;
    return F;
  }

  // Botun vuruşu: yol haritası + kaba arama; becerisi düşükse sapma ekler.
  function botShot(hi, x, y, t0, sk, rnd) {
    const o = prep(hi), F = field(hi), h = o.h;
    const base = F.at(x, y);
    let best = null;
    const score = (r) => (r.holed ? -50 : r.pit ? 400 : F.at(r.x, r.y) + (r.bounces > 3 ? 0.6 : 0));
    const tryShot = (a, p) => { const r = shoot(hi, x, y, a, p, t0); const s = score(r); if (!best || s < best.s) best = { s, a, p, r }; };
    // doğrudan nişan ve komşu açılar
    const direct = Math.atan2(h.cup[1] - y, h.cup[0] - x);
    const N = 30;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      for (const p of [0.35, 0.55, 0.75, 0.95]) tryShot(a, p);
    }
    for (const p of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) tryShot(direct, p);
    // en iyinin çevresinde incelt
    if (best) {
      const c = { a: best.a, p: best.p };
      for (let i = 0; i < 28; i++) tryShot(c.a + (rnd() - 0.5) * 0.28, clamp(c.p + (rnd() - 0.5) * 0.3, 0.12, 1));
    }
    if (!best) return { a: direct, p: 0.5, exp: base };
    const na = 0.07 + (1 - sk) * 0.2, np = 0.05 + (1 - sk) * 0.2;
    const a = best.a + (rnd() + rnd() - 1) * na;
    const p = clamp(best.p * (1 + (rnd() + rnd() - 1) * np), 0.1, 1);
    return { a, p, exp: best.s };
  }

  return { DT, BR, CUP_R, VMAX, VMIN, MAXS, HOLES, prep, step, tick, shoot, speedOf, bladeAng, slideSeg, danger, field, botShot, clamp, EV, inPoly };
})();

/* ============================ modeller ============================ */

const FLOOR_COLS = ['#52b24e', '#49a746'];
const GREEN_Y = 0, WALL_H = 0.42, WALL_OUT = 0.45, BOARD_M = 1.5, TABLE_Y = -0.58;
const SAUCE = ['#c43a1f', '#b53219', '#d24a2a'];

// Kulak kesme: basit (delikli olmayan) çokgeni üçgenlere ayırır
function earClip(P) {
  const n = P.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const idx = [...Array(n).keys()];
  if (area < 0) idx.reverse();
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => cross(a, b, p) >= -1e-9 && cross(b, c, p) >= -1e-9 && cross(c, a, p) >= -1e-9;
  const tris = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 400) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const a = P[idx[(i + idx.length - 1) % idx.length]], b = P[idx[i]], c = P[idx[(i + 1) % idx.length]];
      if (cross(a, b, c) <= 1e-9) continue;
      let ok = true;
      for (const j of idx) { const p = P[j]; if (p === a || p === b || p === c) continue; if (inside(p, a, b, c)) { ok = false; break; } }
      if (!ok) continue;
      tris.push([a, b, c]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push(idx.map((i) => P[i]));
  return tris;
}

// Dışbükey çokgeni y >= lo (dir=1) ya da y <= hi (dir=-1) yarım düzlemine göre kırp
function clipY(poly, lim, dir) {
  const out = [];
  const inside = (p) => (dir > 0 ? p[1] >= lim : p[1] <= lim);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (lim - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, lim]); }
  }
  return out;
}

// Çimen: çokgeni üçgenle, her üçgeni 1.2 m'lik biçme şeritlerine kırp
function floorModel(mb, poly, y = GREEN_Y) {
  const W = 1.2;
  const cols = FLOOR_COLS.map((h) => C(h));
  earClip(poly).forEach((tri) => {
    const y0 = Math.min(tri[0][1], tri[1][1], tri[2][1]), y1 = Math.max(tri[0][1], tri[1][1], tri[2][1]);
    for (let k = Math.floor(y0 / W); k * W < y1; k++) {
      let p = clipY(tri, k * W, 1);
      p = clipY(p, (k + 1) * W, -1);
      if (p.length < 3) continue;
      const col = cols[((k % 2) + 2) % 2];
      for (let i = 1; i < p.length - 1; i++) mb.tri([p[0][0], y, p[0][1]], [p[i][0], y, p[i][1]], [p[i + 1][0], y, p[i + 1][1]], col, [p[0][0], y - 1, p[0][1]]);
    }
  });
}

// Duvarlar: çokgenin her kenarı için yatay prizma. Köşeler dışbükeyse dışarı uzatılır.
function wallsModel(mb, poly, inPoly, accent) {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area >= 0 ? 1 : -1;
  const top = C('#f2e8d0', -0.35), inner = shade(C(accent, -0.3), 0.95), outer = shade(C(accent, -0.25), 0.55), stripe = C('#fbf8f0', -0.3);
  for (let i = 0; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n], Z = poly[(i + n - 1) % n], Y = poly[(i + 2) % n];
    let dx = B[0] - A[0], dy = B[1] - A[1];
    const L = Math.hypot(dx, dy);
    dx /= L; dy /= L;
    let ox = dy, oy = -dx; // dışa (varsayılan)
    if (inPoly([(A[0] + B[0]) / 2 + ox * 0.15, (A[1] + B[1]) / 2 + oy * 0.15])) { ox = -ox; oy = -oy; }
    const cx = (v, w, p, q) => (v[0] - w[0]) * (q[1] - p[1]) - (v[1] - w[1]) * (q[0] - p[0]);
    const convexA = sgn * ((A[0] - Z[0]) * (B[1] - A[1]) - (A[1] - Z[1]) * (B[0] - A[0])) > 0;
    const convexB = sgn * ((B[0] - A[0]) * (Y[1] - B[1]) - (B[1] - A[1]) * (Y[0] - B[0])) > 0;
    void cx;
    const e0 = convexA ? WALL_OUT : 0, e1 = convexB ? WALL_OUT : 0;
    const a0 = [A[0] - dx * e0, A[1] - dy * e0], b0 = [B[0] + dx * e1, B[1] + dy * e1];
    const H = WALL_H;
    const pi = (p, h) => [p[0], h, p[1]];
    const po = (p, h) => [p[0] + ox * WALL_OUT, h, p[1] + oy * WALL_OUT];
    const cen = [(A[0] + B[0]) / 2 + ox * WALL_OUT * 0.5, H / 2, (A[1] + B[1]) / 2 + oy * WALL_OUT * 0.5];
    mb.quad(pi(a0, H), pi(b0, H), po(b0, H), po(a0, H), top, cen);
    mb.quad(pi(a0, 0), pi(b0, 0), pi(b0, H), pi(a0, H), inner, cen);
    mb.quad(po(a0, 0), po(b0, 0), po(b0, H), po(a0, H), outer, cen);
    if (e0) mb.quad(pi(a0, 0), po(a0, 0), po(a0, H), pi(a0, H), outer, cen);
    if (e1) mb.quad(pi(b0, 0), po(b0, 0), po(b0, H), pi(b0, H), outer, cen);
    // iç yüzde ince beyaz şerit (klasik mini golf bandı)
    const sIn = (p, h) => [p[0] - ox * 0.004, h, p[1] - oy * 0.004];
    mb.quad(sIn(a0, H - 0.11), sIn(b0, H - 0.11), sIn(b0, H - 0.065), sIn(a0, H - 0.065), stripe, [cen[0] + ox, cen[1], cen[2] + oy]);
    // üstte yuvarlak kapak (yastık): dıştan içe yarım silindir
    const rr = WALL_OUT / 2, NS = 8;
    const ring = (p, k) => {
      const th = (k / NS) * Math.PI, c0 = Math.cos(th), s0 = Math.sin(th);
      const cxp = p[0] + ox * rr, czp = p[1] + oy * rr;
      return { p: [cxp + ox * c0 * rr, H + s0 * rr * 0.55, czp + oy * c0 * rr], n: [ox * c0, s0 / 0.55, oy * c0] };
    };
    for (let k = 0; k < NS; k++) {
      const A0 = ring(a0, k), A1 = ring(a0, k + 1), B0 = ring(b0, k), B1 = ring(b0, k + 1);
      mb.quadN(A0.p, B0.p, B1.p, A1.p, A0.n, B0.n, B1.n, A1.n, top);
    }
  }
}

// Ahşap tabla (parkurun altı): akçaağaç dokulu ('tex')
function boardTexModel(mb, bb) {
  const m = BOARD_M;
  KIT.woodBox(mb, bb[0] - m, -0.55, bb[1] - m, bb[2] + m, -0.03, bb[3] + m);
}
function boardModel(mb, bb) {
  const m = BOARD_M;
  const x0 = bb[0] - m, y0 = bb[1] - m, x1 = bb[2] + m, y1 = bb[3] + m;
  const wood = { top: C('#c28d52'), side: C('#8a5a2c'), bot: C('#6e4620') };
  mb.box(x0, -0.55, y0, x1, -0.03, y1, wood);
  // yüzey şeritleri
  for (let x = x0 + 0.9; x < x1 - 0.2; x += 0.9) mb.quad([x, -0.025, y0], [x + 0.04, -0.025, y0], [x + 0.04, -0.025, y1], [x, -0.025, y1], C('#a8723c'), [x, -1, (y0 + y1) / 2]);
}

// Gingham masa örtüsü
function clothModel(mb, accent) {
  const a = C(accent);
  const red = [a[0] * 0.78 + 0.1, a[1] * 0.52 + 0.06, a[2] * 0.5 + 0.06, 0];
  const pink = [a[0] * 0.35 + 0.62, a[1] * 0.3 + 0.62, a[2] * 0.3 + 0.62, 0];
  const white = C('#f6f1e7');
  const N = 18, S = 2.2, Y = -0.58;
  for (let j = -N; j < N; j++) for (let i = -N; i < N; i++) {
    const a1 = ((i % 2) + 2) % 2 === 0, b1 = ((j % 2) + 2) % 2 === 0;
    const col = a1 && b1 ? red : a1 || b1 ? pink : white;
    mb.quad([i * S, Y, j * S], [(i + 1) * S, Y, j * S], [(i + 1) * S, Y, (j + 1) * S], [i * S, Y, (j + 1) * S], col, [i * S, Y - 1, j * S]);
  }
}

// Kazık: tuzluk / ketçap şişesi (birim yarıçap, ~1.8 yükseklik)
function pegModel(mb, accent) {
  // cam tuzluk + krom kapak (birim yarıçap, ~1.8 yükseklik)
  mb.lathe(0, 0, 0, [[0, 0], [0.9, 0], [0.98, 0.07], [1.0, 0.3], [0.94, 0.82], [0.9, 1.0], [0, 1.0]], 24, (i) => (i <= 1 ? C('#cfe0ef', -0.85) : C('#eef5ff', -0.9)));
  mb.lathe(0, 0.36, 0, [[1.005, 0], [1.02, 0.02], [1.02, 0.28], [1.005, 0.3]], 24, C(accent, 0.4));
  mb.lathe(0, 0.98, 0, [[0.92, 0], [0.95, 0.05], [0.92, 0.24], [0.72, 0.42], [0.36, 0.52], [0, 0.54]], 24, C('#c8ccd2', -0.9));
  mb.lathe(0, 1.5, 0, [[0.12, 0], [0.12, 0.18], [0.08, 0.22], [0, 0.23]], 10, C('#fff3c4', -0.4));
}

// Yel değirmeni kanadı: x=0..1 birim uzunluk, şeritli
function bladeModel(mb, accent) {
  // parlak plastik, yuvarlak kenarlı şeritli kanat + ucunda kapak
  const cols = [C(accent, -0.45), C('#ffffff', -0.45)];
  for (let i = 0; i < 5; i++) mb.rbox(i * 0.2 - (i ? 0.002 : 0), 0, -0.1, (i + 1) * 0.2, 0.4, 0.1, 0.04, cols[i % 2], 2);
  mb.push().T(1.0, 0.2, 0, 0, 0, Math.PI / 2);
  mb.lathe(0, -0.01, 0, [[0.11, 0], [0.125, 0.03], [0.125, 0.06], [0.08, 0.09], [0, 0.1]], 14, C('#2a2a30', -0.6));
  mb.pop();
}
function hubModel(mb, accent) {
  mb.lathe(0, 0, 0, [[0.32, 0], [0.32, 0.5], [0.3, 0.55], [0, 0.55]], 18, (i) => (i >= 2 ? C('#f2e8d0', -0.3) : shade(C(accent, -0.3), 0.7)));
  mb.sphereS(0, 0.58, 0, 0.2, 0.14, 0.2, C('#d4432c', -0.7), 14, 8);
}
// Kayan kapı: x=-1..1, şeritli
function slideModel(mb, accent) {
  // kayan kapı: yuvarlak kenarlı şeritli plastik + uçlarda koyu tampon
  const cols = [C(accent, -0.45), C('#ffffff', -0.45)];
  for (let i = 0; i < 8; i++) mb.rbox(-1 + i * 0.25 - 0.002, 0, -0.1, -1 + (i + 1) * 0.25 + 0.002, 0.46, 0.1, 0.035, cols[i % 2], 2);
  for (const sx of [-1, 1]) mb.rbox(sx * 1.0 - 0.04, 0.0, -0.115, sx * 1.0 + 0.04, 0.48, 0.115, 0.03, C('#2a2a30', -0.6), 2);
}

// Sos çukuru (dikdörtgen)
function pitModel(mb, r, seed) {
  // ketçap havuzu: yuvarlatılmış, hafif dalgalı kenar; kenarda koyu kabuk, kenardan ortaya açılan parlak sos,
  // boyalı parıltı, kabarcıklar ve çimde birkaç damla (fizik alanı yine dikdörtgen; görüntü onun içinde kalır)
  const [x0, y0, x1, y1] = r;
  const cx = (x0 + x1) / 2, cz = (y0 + y1) / 2, hw = (x1 - x0) / 2 - 0.03, hh = (y1 - y0) / 2 - 0.03;
  const N = 72, ph = seed * 1.7 + 0.3, E = 2 / 5;
  let rs = (seed + 1) * 9301 + 49297;
  const R = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
  const sp = (v) => Math.sign(v) * Math.pow(Math.abs(v), E);
  const wob = Array.from({ length: N }, (_, k) => { const t = (k / N) * Math.PI * 2; return 1 - 0.045 * (0.5 + 0.5 * Math.sin(3 * t + ph)) - 0.03 * (0.5 + 0.5 * Math.sin(7 * t - ph * 2)); });
  const pt = (k, s, y, grow = 0) => {
    const t = (k / N) * Math.PI * 2, w = wob[k % N];
    return [cx + sp(Math.cos(t)) * hw * w * s + Math.cos(t) * grow, y, cz + sp(Math.sin(t)) * hh * w * s + Math.sin(t) * grow];
  };
  const up = [0, 1, 0];
  const nrm = (p) => { const dx = 0.1 * Math.sin(p[0] * 4.1 + ph) * Math.cos(p[2] * 3.3 - ph), dz = 0.1 * Math.cos(p[0] * 3.7 - ph) * Math.sin(p[2] * 4.4 + ph); const l = Math.hypot(dx, 1, dz); return [dx / l, 1 / l, dz / l]; };
  // kabuk / ıslak çim bandı
  const cr0 = C('#6a1d0f', 0), cr1 = C('#2c4f1f', 0);
  for (let k = 0; k < N; k++) mb.quadN(pt(k, 1, 0.012), pt(k + 1, 1, 0.012), pt(k + 1, 1, 0.006, 0.1), pt(k, 1, 0.006, 0.1), up, up, up, up, cr0, cr0, cr1, cr1);
  // sos yüzeyi: kenarda koyu (derinlik), ortada açık ve çok parlak
  const S = [1, 0.93, 0.8, 0.6, 0.36, 0.13];
  const SC = ['#8f2613', '#b3321a', '#c43a1f', '#cd4025', '#d5482b', '#db5032'].map((h) => C(h, -0.88));
  const Y = (s) => 0.026 + (1 - s) * 0.006;
  // sarmal ketçap damarları (hafif açık/koyu bantlar): sıvı gibi görünsün
  const sw = (p, c) => {
    const dx = (p[0] - cx) / Math.max(0.3, hw), dz = (p[2] - cz) / Math.max(0.3, hh), d = Math.hypot(dx, dz);
    const g = 1 + 0.085 * Math.sin(d * 7.5 + Math.atan2(dz, dx) * 2 + ph) * Math.min(1, d * 2.5);
    return [Math.min(1, c[0] * g), Math.min(1, c[1] * g), Math.min(1, c[2] * g), c[3]];
  };
  for (let i = 0; i < S.length - 1; i++) {
    for (let k = 0; k < N; k++) {
      const a = pt(k, S[i], Y(S[i])), b = pt(k + 1, S[i], Y(S[i])), c = pt(k + 1, S[i + 1], Y(S[i + 1])), d = pt(k, S[i + 1], Y(S[i + 1]));
      mb.quadN(a, b, c, d, nrm(a), nrm(b), nrm(c), nrm(d), sw(a, SC[i]), sw(b, SC[i]), sw(c, SC[i + 1]), sw(d, SC[i + 1]));
    }
  }
  const cen = [cx, Y(0), cz];
  for (let k = 0; k < N; k++) { const a = pt(k, S[S.length - 1], Y(S[S.length - 1])), b = pt(k + 1, S[S.length - 1], Y(S[S.length - 1])); mb.triN(cen, b, a, up, nrm(b), nrm(a), SC[SC.length - 1]); }
  // boyalı parıltı: sol üstte hilal + küçük nokta
  const hl = C('#ffd3c4', -0.95);
  const k0 = Math.round(N * 0.56), k1 = Math.round(N * 0.7);
  for (let k = k0; k < k1; k++) {
    const f0 = Math.sin(((k - k0) / (k1 - k0)) * Math.PI), f1 = Math.sin(((k + 1 - k0) / (k1 - k0)) * Math.PI);
    mb.quadN(pt(k, 0.8, 0.034), pt(k + 1, 0.8, 0.034), pt(k + 1, 0.8 - 0.07 * f1, 0.034), pt(k, 0.8 - 0.07 * f0, 0.034), up, up, up, up, hl);
  }
  mb.disc(cx - hw * 0.38, 0.035, cz - hh * 0.5, Math.min(0.07, hw * 0.12), Math.min(0.05, hh * 0.1), 10, C('#fff1ea', -0.95));
  // kabarcıklar
  const nb = 3 + (seed % 3);
  for (let q = 0; q < nb; q++) {
    const bx = cx + (R() - 0.5) * hw * 1.1, bz = cz + (R() - 0.5) * hh * 1.1, rb = 0.035 + R() * 0.045;
    mb.sphereS(bx, 0.03, bz, rb, rb * 0.6, rb, C('#d54a30', -0.92), 10, 6);
    mb.sphereS(bx - rb * 0.35, 0.03 + rb * 0.42, bz - rb * 0.35, rb * 0.24, rb * 0.1, rb * 0.24, C('#fff4ee', -0.95), 6, 4);
  }
  // çime sıçramış birkaç damla
  for (let q = 0; q < 5; q++) {
    const k = Math.floor(R() * N), p = pt(k, 1, 0.009, 0.16 + R() * 0.16), rr = 0.035 + R() * 0.05;
    mb.disc(p[0], 0.009, p[2], rr, rr * (0.7 + R() * 0.3), 9, C('#c03a1f', -0.8), C('#9c2a14', -0.8));
  }
}

// Hız şeridi: birim yarıçaplı disk + oklar (yön: -z)
function boostModel(mb) {
  mb.disc(0, 0.03, 0, 1, 1, 18, C('#ffd23f'), C('#ffb300'));
  for (let i = 0; i < 3; i++) {
    const z = 0.5 - i * 0.45;
    mb.quad([-0.5, 0.06, z + 0.3], [0, 0.06, z - 0.1], [0, 0.06, z + 0.06], [-0.5, 0.06, z + 0.46], C('#fff6c4'), [0, -1, z]);
    mb.quad([0.5, 0.06, z + 0.3], [0, 0.06, z - 0.1], [0, 0.06, z + 0.06], [0.5, 0.06, z + 0.46], C('#fff6c4'), [0, -1, z]);
  }
}

// Delik + kenar halkası
function cupModel(mb, r) {
  // çim kenarı, beyaz astar, derin karanlık delik
  mb.disc(0, 0.012, 0, r * 1.35, r * 1.35, 24, C('#2a6b2c'), C('#2f7a31'));
  mb.lathe(0, 0, 0, [[r * 1.22, 0.03], [r * 1.2, 0.036], [r * 1.02, 0.034], [r, 0.02], [r, -0.03]], 28, C('#f4f4f4', -0.6));
  mb.lathe(0, 0, 0, [[r, -0.03], [r, -0.4], [0, -0.4]], 24, (i) => (i === 0 ? C('#2c2c2c') : C('#0a0a0a')));
}
function flagModel(mb, accent) {
  mb.lathe(0, 0, 0, [[0.04, 0], [0.035, 2.3], [0, 2.3]], 10, C('#eef0f2', -0.8));
  mb.sphereS(0, 2.33, 0, 0.07, 0.07, 0.07, C('#ffd23f', -0.8), 10, 8);
  // dalgalanan bayrak
  const col = hexRGB(accent);
  const nu = 8, nv = 3;
  const P = (u, v) => [u * 0.82, 2.28 - v * 0.4 - u * 0.16 * (1 - v * 0.5), 0.07 * Math.sin(u * 5.5) * u];
  const N = (u) => { const d = 0.07 * (5.5 * Math.cos(u * 5.5) * u + Math.sin(u * 5.5)); const l = Math.hypot(d, 1); return [-d / l, 0, 1 / l]; };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
      const c0 = [col[0] * (0.9 + 0.1 * Math.sin(u0 * 5.5)), col[1] * (0.9 + 0.1 * Math.sin(u0 * 5.5)), col[2] * (0.9 + 0.1 * Math.sin(u0 * 5.5)), -0.15];
      const c1 = [col[0] * (0.9 + 0.1 * Math.sin(u1 * 5.5)), col[1] * (0.9 + 0.1 * Math.sin(u1 * 5.5)), col[2] * (0.9 + 0.1 * Math.sin(u1 * 5.5)), -0.15];
      mb.quadN(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), N(u0), N(u1), N(u1), N(u0), c0, c1, c1, c0);
    }
  }
}
function teeModel(mb, accent) {
  mb.lathe(0, 0, 0, [[0.62, 0], [0.62, 0.03], [0.5, 0.035], [0.5, 0.045], [0.36, 0.048], [0.36, 0.056], [0, 0.056]], 28, (i) => (i === 3 || i === 4 ? C(accent, -0.4) : C('#f6f1e7', -0.4)));
}

// Logo diski (dokulu)
function logoDisc(mb, r, y, seg = 28) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [Math.cos(a0) * r, y, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, y, Math.sin(a1) * r];
    mb.tw([0, y, 0], p0, p1, null, [0, y - 1, 0], [0.5, 0.5, 0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5, 0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5]);
  }
}

// Top
function ballModel(mb, hex) {
  // parlak golf topu: oyuncu renginde, gamzeler hafif koyu benek
  const col = hexRGB(hex);
  // merkez orijinde: yuvarlanma dönüşü topun merkezi etrafında olur (alt noktası etrafında dönerse top zemine gömülüp çıkar)
  mb.sphereS(0, 0, 0, BALL_R, BALL_R, BALL_R, null, 24, 16, (x, y, z) => {
    const d = Math.sin(x * 23) * Math.sin(y * 23) * Math.sin(z * 23);
    const k = d > 0.35 ? 0.86 : 1;
    return [col[0] * k, col[1] * k, col[2] * k, -0.75];
  });
}

// Süs: domates dilimi, turşu, patates, zeytin, fesleğen
function decorModel(mb, kind) {
  if (kind === 'tomato') {
    mb.lathe(0, 0, 0, [[0, 0], [0.86, 0], [0.92, 0.12], [0.88, 0.26], [0.74, 0.3], [0.74, 0.3], [0, 0.3]], 30, (i, a) => {
      if (i <= 3) return C('#d4301c', -0.6);
      const sd = i === 5 && Math.sin(a * 3) > 0.35;
      return sd ? C('#f4d27a', -0.45) : C('#ef5a3e', -0.55);
    });
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; mb.sphereS(Math.cos(a) * 0.36, 0.31, Math.sin(a) * 0.36, 0.13, 0.025, 0.08, C('#ffe9a8', -0.4), 8, 4); }
  } else if (kind === 'pickle') {
    mb.push().T(0, 0.33, 0, 0.4, 0, Math.PI / 2);
    mb.lathe(0, -1.05, 0, [[0, 0], [0.18, 0.04], [0.28, 0.16], [0.33, 0.4], [0.34, 1.05], [0.33, 1.7], [0.28, 1.94], [0.18, 2.06], [0, 2.1]], 16, (i, a) => (Math.sin(a * 5 + i * 1.7) > 0.6 ? C('#7fb13d', -0.6) : C('#5b8c2a', -0.6)));
    mb.pop();
  } else if (kind === 'fry') {
    for (let i = 0; i < 7; i++) {
      mb.push().T((i - 3) * 0.16, 0.2, (i % 3 - 1) * 0.13, i * 0.5, 0.15 * (i % 2 ? 1 : -1), 0.1 * i - 0.3);
      mb.box(-0.07, -0.1, -0.7, 0.07, 0.1, 0.7, { top: C('#f6c744', -0.35), side: C('#e0a824', -0.35), back: C('#c98a1c', -0.3), front: C('#c98a1c', -0.3) });
      mb.pop();
    }
  } else if (kind === 'olive') {
    mb.sphereS(0, 0.36, 0, 0.5, 0.42, 0.5, C('#3b5226', -0.8), 20, 14);
    mb.lathe(0, 0.7, 0, [[0.2, 0], [0.2, 0.05], [0.16, 0.08], [0, 0.08]], 12, C('#d9482f', -0.5));
  } else if (kind === 'basil') {
    const leaf = (x, z, rx, rz, a, c1, c2) => {
      mb.push().T(x, 0.05, z, a, 0, 0);
      mb.sphereS(0, 0, 0, rx, 0.06, rz, null, 16, 6, (ux, uy, uz) => { const t = Math.abs(uz) < 0.12 ? 1 : 0; const A = hexRGB(c1), B = hexRGB(c2); return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), -0.4]; });
      mb.pop();
    };
    leaf(0, 0, 0.8, 0.5, 0.3, '#2f8a33', '#5cbf55');
    leaf(0.35, 0.25, 0.5, 0.32, 1.2, '#3a9a3c', '#6acb60');
  }
}

function arrowModel(mb) {
  mb.cyl(0, 0, 0, 0.0001, 0.42, 0.34, 6, C('#ffffff', 1), C('#ffffff', 1), 't');
  mb.box(-0.1, 0.4, -0.1, 0.1, 0.78, 0.1, C('#ffffff', 1));
}

/* ============================ ses ============================ */

const mtofG = (m) => 440 * 2 ** ((m - 69) / 12);

class GolfSnd extends Snd {
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'putt': {
        const v = clamp(a, 0.1, 1);
        this.tone(190 + 90 * v, t, 0.07, 'sine', 0.5, 90, 0.002);
        this.noise(t, 0.05, 0.28 * v + 0.08, { type: 'bandpass', freq: 2300, q: 1.4 });
        this.tone(1250, t, 0.035, 'square', 0.04 * v);
        break;
      }
      case 'wall': {
        const v = clamp(a / 10, 0.12, 1);
        this.tone(330, t, 0.06, 'triangle', 0.24 * v, 160, 0.002);
        this.noise(t, 0.04, 0.2 * v, { type: 'bandpass', freq: 1500, q: 1.1 });
        break;
      }
      case 'peg': {
        const v = clamp(a / 10, 0.15, 1);
        this.tone(760, t, 0.18, 'sine', 0.2 * v, 540, 0.002);
        this.tone(1520, t, 0.1, 'sine', 0.07 * v, null, 0.002);
        this.noise(t, 0.03, 0.12 * v, { type: 'highpass', freq: 3000 });
        break;
      }
      case 'bonk':
        this.tone(220, t, 0.12, 'square', 0.12, 150, 0.002);
        this.noise(t, 0.06, 0.2, { type: 'bandpass', freq: 800, q: 1 });
        break;
      case 'cup':
        this.tone(220, t, 0.1, 'sine', 0.4, 90, 0.002);
        this.noise(t + 0.05, 0.06, 0.2, { type: 'lowpass', freq: 600 });
        [784, 1047, 1319].forEach((f, i) => this.tone(f, t + 0.1 + i * 0.07, 0.2, 'triangle', 0.2));
        break;
      case 'ace':
        this.duck(0.35, 2.2);
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.08, 0.3, 'triangle', 0.3));
        [523, 784, 1047].forEach((f) => this.tone(f, t + 0.5, 1.2, 'triangle', 0.18));
        this.cheer(t + 0.2, 2);
        break;
      case 'splash':
        this.noise(t, 0.45, 0.42, { freq: 1700, to: 240, q: 0.6 }, a);
        this.tone(170, t, 0.25, 'sine', 0.36, 60, 0.004, a);
        for (let i = 0; i < 6; i++) this.tone(1100 + Math.random() * 1900, t + 0.04 + Math.random() * 0.3, 0.04, 'sine', 0.05, null, 0.004, a);
        break;
      case 'oops':
        [330, 262].forEach((f, i) => this.tone(f, t + i * 0.14, 0.22, 'sawtooth', 0.1, f * 0.95));
        break;
      case 'tick': this.tone(1500, t, 0.03, 'square', 0.04); break;
      default: super._fx(name, a);
    }
  }
  tempo() { return this.mode === 'race' ? 92 : this.mode === 'idle' ? 84 : 76; }
  swing() { return 0.17; }
  // Mini Golf: bahçede lo-fi bossa (Do maj9 – La7 – Re m9 – Sol7): 3-2 klave tıkırtısı, fırça trampet, kontrbas,
  // senkoplu elektrikli piyano akorları, ara sıra vibrafon ezgisi — sakin, odaklandıran
  beat(t, s, bar, spb, st = spb / 4) {
    const CH = [[36, [64, 67, 71, 74]], [33, [61, 64, 67, 69]], [38, [65, 69, 72, 76]], [43, [65, 67, 71, 74]]];
    const [root, ep] = CH[bar % 4];
    const PENT = [72, 74, 76, 79, 81, 84];
    if (this.mode === 'race') {
      if ([0, 3, 6, 10, 12].includes(s)) this.iRim(t, 0.042);
      if (s === 4 || s === 12) this.iBrush(t, 0.05);
      this.iShk(t, s % 4 === 0 ? 0.018 : 0.01);
      if (s === 0 || s === 8) this.iBass(t, root, spb * 1.4, 0.16, 'up');
      if (s === 6 || s === 14) this.iBass(t, root + 7, spb * 0.5, 0.12, 'up');
      if (s === 2 || s === 7 || s === 10) ep.forEach((m, i) => this.iEP(t + i * 0.008, m, 0.024, spb * (s === 10 ? 1.4 : 0.8), 0.22));
      if (bar % 2 === 1 && s % 4 === 0) this.iVibe(t, PENT[(bar * 3 + (s >> 2) * 2) % PENT.length], 0.034, spb * 1.6);
    } else if (this.mode === 'idle') {
      if (s === 0) { ep.forEach((m, i) => this.iEP(t + i * 0.03, m, 0.026, spb * 3)); this.iBass(t, root, spb * 2.5, 0.13, 'up'); }
      if (s === 10) this.iVibe(t, PENT[(bar * 2) % PENT.length], 0.03, spb * 2);
      if (s % 4 === 2) this.iShk(t, 0.011);
    } else {
      if (s === 0) { ep.forEach((m, i) => this.iEP(t + i * 0.07, m, 0.024, spb * 3.5)); this.iBass(t, root, spb * 3, 0.1, 'up'); }
      if (s === 8) this.iVibe(t, PENT[(bar * 3 + 2) % PENT.length], 0.03, spb * 2.5);
    }
  }
}

/* ============================ arayüz ============================ */

const STYLE2 = `
#ky.mg .pos{position:relative;white-space:nowrap}
#ky .mg-pl{display:block;font-style:normal;font-size:9px;font-weight:900;letter-spacing:.12em;opacity:.7;margin-top:1px}
#ky .mg-ko{white-space:nowrap;font-weight:800;font-size:16px;background:rgba(12,10,26,.55);border-radius:12px;padding:5px 9px;font-variant-numeric:tabular-nums}
#ky .mg-rnd{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);font-weight:800;font-size:13px;background:rgba(12,10,26,.55);border:2px solid rgba(255,255,255,.35);border-radius:99px;padding:3px 11px;white-space:nowrap;pointer-events:none;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
#ky .mg-pow{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 40px);width:min(72vw,330px);height:26px;transform:translateX(-50%);border-radius:99px;background:rgba(12,10,26,.6);border:3px solid rgba(255,255,255,.85);overflow:hidden;display:none;pointer-events:none}
#ky .mg-pow i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#3fdc6a,#ffd23f 60%,#ff4a2b)}
#ky .mg-pow b{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;font-weight:800;text-shadow:0 1px 2px rgba(0,0,0,.6);letter-spacing:.04em}
#ky .mg-hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 38px);transform:translateX(-50%);font-weight:800;font-size:14px;background:rgba(12,10,26,.6);border:2px dashed rgba(255,255,255,.55);border-radius:99px;padding:8px 16px;white-space:nowrap;pointer-events:none;transition:opacity .3s;animation:mgh 1.6s ease-in-out infinite alternate}
@keyframes mgh{from{transform:translateX(-50%) translateY(0)}to{transform:translateX(-50%) translateY(-5px)}}
#ky .mg-hint.off{opacity:0}
#ky.mg .msg{top:19%}
#ky .mg-feed{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 100px);display:grid;gap:4px;pointer-events:none;max-width:72%}
#ky .mg-feed div{font-weight:700;font-size:13px;background:rgba(12,10,26,.62);border-radius:10px;padding:3px 9px;width:max-content;max-width:100%;animation:suf 4.4s ease-out forwards}
@keyframes suf{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
#ky .mg-par{display:inline-block;font-weight:800;font-size:13px;background:rgba(255,255,255,.16);border-radius:99px;padding:2px 10px;margin-left:6px}
#ky .tm.low{color:#ff6b4a;animation:mgl .5s ease-in-out infinite alternate}
@keyframes mgl{from{opacity:1}to{opacity:.45}}
@media (orientation:landscape) and (max-height:520px){
#ky .mg-rnd{top:calc(env(safe-area-inset-top,0px) + 12px);font-size:12px}
#ky .mg-feed{top:calc(env(safe-area-inset-top,0px) + 50px)}
#ky.mg .msg{top:15%}
#ky .mg-pow{bottom:calc(env(safe-area-inset-bottom,0px) + 18px);height:22px}
#ky .mg-hint{bottom:calc(env(safe-area-inset-bottom,0px) + 18px)}
}
`;

function injectStyle2() {
  if (document.getElementById('mg-style')) return;
  const st = document.createElement('style');
  st.id = 'mg-style';
  st.textContent = STYLE2;
  document.head.appendChild(st);
}

/* ============================ oyun ============================ */

const TOD_OF = [0, 0, 1, 0, 1, 2];
// Yuvarlanma: topun yönelimi (3x3, sütun düzeninde) hareket yönüne dik eksen etrafında döner
function rollBall(bl, dt) {
  if (!bl.R) { bl.R = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]); bl.rn = 0; }
  const sp = Math.hypot(bl.vx || 0, bl.vy || 0);
  if (sp < 0.02) return;
  const ax = bl.vy / sp, az = -bl.vx / sp, ang = (sp * dt) / (0.26 * BALL_S);
  const c = Math.cos(ang), sn = Math.sin(ang), t = 1 - c;
  const r00 = t * ax * ax + c, r01 = -sn * az, r02 = t * ax * az;
  const r10 = sn * az, r11 = c, r12 = -sn * ax;
  const r20 = t * ax * az, r21 = sn * ax, r22 = t * az * az + c;
  const R = bl.R;
  for (let k = 0; k < 3; k++) {
    const x = R[k * 3], y = R[k * 3 + 1], z = R[k * 3 + 2];
    R[k * 3] = r00 * x + r01 * y + r02 * z; R[k * 3 + 1] = r10 * x + r11 * y + r12 * z; R[k * 3 + 2] = r20 * x + r21 * y + r22 * z;
  }
  if (++bl.rn % 30 === 0) {
    // kayan sayı hatası birikmesin: sütunları yeniden dikleştir
    let l = Math.hypot(R[0], R[1], R[2]); R[0] /= l; R[1] /= l; R[2] /= l;
    const d = R[0] * R[3] + R[1] * R[4] + R[2] * R[5];
    R[3] -= d * R[0]; R[4] -= d * R[1]; R[5] -= d * R[2];
    l = Math.hypot(R[3], R[4], R[5]); R[3] /= l; R[4] /= l; R[5] /= l;
    R[6] = R[1] * R[5] - R[2] * R[4]; R[7] = R[2] * R[3] - R[0] * R[5]; R[8] = R[0] * R[4] - R[1] * R[3];
  }
}
// Top matrisi: konum + yuvarlanma + dünya ekseninde basılma (sx, sy, sz)
function ballMat(m, bl, x, y, z, sx, sy, sz) {
  const R = bl.R || [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let k = 0; k < 3; k++) { m[k * 4] = R[k * 3] * sx; m[k * 4 + 1] = R[k * 3 + 1] * sy; m[k * 4 + 2] = R[k * 3 + 2] * sz; m[k * 4 + 3] = 0; }
  m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
  return m;
}
const PIT_S = 0.9;
const BALL_S = 1.08;
const BALL_R = 0.26;
const DAY_EXP = [0.74, 0.95, 1.12];
const RESULT_NAMES = { '-3': 'MUHTEŞEM! 🦅', '-2': 'MUHTEŞEM! 🦅', '-1': 'HEDEFİN ALTINDA! 🐦', '0': 'TAM HEDEF 👌', '1': 'BİR FAZLA' };

class Game {
  constructor(ctx) {
    injectStyle();
    injectStyle2();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.key = '';
    this.hole = -1;
    this.O = null;
    this.H = null;
    this.balls = [];
    this.my = -1;
    this.startAt = 0;
    this.parts = [];
    this.time = 0;
    this.shake = 0;
    this.scale = 1;
    this.frameAvg = 16;
    this.slowFor = 0;
    this.fastFor = 0;
    this.cam = { D: 0, tx: 0, ty: 0, tz: 0, yaw: 0, ex: 0, ey: 20, ez: 20 };
    this.fov = 0.8;
    this.panelKey = '';
    this.lastBeep = 99;
    this.snd = new GolfSnd();
    this.mats = { a: M.make(), b: M.make(), c: M.make(), V: M.make(), P: M.make(), VP: M.make() };
    this.aim = null;
    this.kb = { a: -Math.PI / 2, p: 0.55, until: 0, keys: new Set() };
    this.waitSeq = -1;
    this.waitUntil = 0;
    this.restSince = 0;
    this.sndBudget = 0;
    this.buildDom();
    try { this.snd.amb('diner', 0.55); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd && this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[golf] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); } catch (e) {
        console.warn('[golf] kaynak', e);
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
      this.initMeshes();
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
    w.className = 'mg';
    w.innerHTML = `
      <canvas aria-label="Mini Golf 3D sahnesi"></canvas>
      <div class="lbls"></div><div class="fx"></div><div class="vig"></div>
      <div class="hud">
        <div class="r1">
          <div class="pos" title="Vuruş / hedef"><b>0</b><small></small><i class="mg-pl">VURUŞ</i></div>
          <div class="mg-ko">⛳ 0</div>
          <div class="sp"></div>
          <div class="tm">0:00</div>
          <button class="ib mu ${sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
          <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted() ? '🔇' : '🔊'}</button>
          <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
        </div>
      </div>
      <div class="mg-rnd"></div>
      <div class="mg-feed"></div>
      <div class="note"></div><div class="toastk"></div>
      <div class="mg-hint off">👆 Parmağını geri çek, bırak!</div>
      <div class="mg-pow"><i></i><b>0%</b></div>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = {
      wrap: w, cv: q('canvas'), lbls: q('.lbls'), fx: q('.fx'), vig: q('.vig'), posB: q('.pos b'), posS: q('.pos small'), pos: q('.pos'), ko: q('.mg-ko'),
      tm: q('.tm'), ex: q('.ex'), note: q('.note'), msg: q('.msg'), panel: q('.panel'), hud: q('.hud'), toastk: q('.toastk'), rnd: q('.mg-rnd'),
      feed: q('.mg-feed'), hint: q('.mg-hint'), pow: q('.mg-pow'), powI: q('.mg-pow i'), powT: q('.mg-pow b'),
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

  /* ---------- giriş: parmağı geri çek, bırak ---------- */
  bindInput() {
    const w = this.el.wrap;
    this.onDown = (e) => {
      if (e.target.closest('.panel.on .card, button, a')) return;
      if (!this.canShoot() || this.aim) return;
      this.aim = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, p: 0, a: 0, ok: false };
      try { w.setPointerCapture(e.pointerId); } catch { /* yok say */ }
    };
    this.onMove = (e) => {
      const a = this.aim;
      if (!a || a.id !== e.pointerId) return;
      a.cx = e.clientX; a.cy = e.clientY;
      this.calcAim();
    };
    this.onUp = (e) => {
      const a = this.aim;
      if (!a || a.id !== e.pointerId) return;
      this.aim = null;
      this.el.pow.style.display = 'none';
      if (e.type === 'pointerup' && a.ok && this.canShoot()) this.fire(a.a, a.p);
    };
    w.addEventListener('pointerdown', this.onDown);
    w.addEventListener('pointermove', this.onMove);
    w.addEventListener('pointerup', this.onUp);
    w.addEventListener('pointercancel', this.onUp);
    this.onTouch = (e) => { if (!e.target.closest('.card')) e.preventDefault(); };
    w.addEventListener('touchmove', this.onTouch, { passive: false });
    const KM = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
    this.onKey = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      const k = KM[e.key];
      if (k) { e.preventDefault(); this.kb.keys.add(k); this.kbWake(); return; }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (e.repeat) return;
        if (this.kb.until > performance.now() && this.canShoot()) { this.fire(this.kb.a, this.kb.p); this.kb.until = 0; } else this.kbWake();
      }
    };
    this.onKeyUp = (e) => { const k = KM[e.key]; if (k) this.kb.keys.delete(k); };
    this.onBlur = () => this.kb.keys.clear();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }
  kbWake() {
    const kb = this.kb;
    if (kb.until <= performance.now()) {
      // ilk kez: deliğe doğru nişan al
      const bl = this.balls[this.my], H = this.H;
      if (bl && H) kb.a = Math.atan2(H.cup[1] - bl.y, H.cup[0] - bl.x);
    }
    kb.until = performance.now() + 4000;
  }
  stepKb(dt) {
    const kb = this.kb;
    if (!kb.keys.size || !this.canShoot()) return;
    if (kb.keys.has('l')) kb.a -= 1.5 * dt;
    if (kb.keys.has('r')) kb.a += 1.5 * dt;
    if (kb.keys.has('u')) kb.p = clamp(kb.p + 0.7 * dt, 0.06, 1);
    if (kb.keys.has('d')) kb.p = clamp(kb.p - 0.7 * dt, 0.06, 1);
    kb.until = performance.now() + 4000;
  }
  curAim() {
    if (!this.canShoot()) return null;
    if (this.aim && this.aim.ok) return { a: this.aim.a, p: this.aim.p };
    if (this.kb.until > performance.now()) return { a: this.kb.a, p: this.kb.p };
    return null;
  }

  pullFull() { return clamp(Math.min(this.vw || 360, this.vh || 640) * 0.36, 120, 210); }
  calcAim() {
    const a = this.aim;
    if (!a) return;
    const dx = a.sx - a.cx, dy = a.sy - a.cy;
    const len = Math.hypot(dx, dy);
    if (len < 16) { a.ok = false; a.p = 0; this.el.pow.style.display = 'none'; return; }
    a.p = clamp((len - 16) / (this.pullFull() - 16), 0, 1);
    a.ok = true;
    const g0 = this.ground(a.sx, a.sy), g1 = this.ground(a.cx, a.cy);
    a.a = g0 && g1 ? Math.atan2(g0[1] - g1[1], g0[0] - g1[0]) : Math.atan2(dy, dx);
    const pw = this.el.pow;
    pw.style.display = 'block';
    this.el.powI.style.width = `${Math.round(a.p * 100)}%`;
    this.el.powT.textContent = `${Math.round(a.p * 100)}%`;
  }
  // ekran noktası -> zemin (y=0) üzerindeki dünya noktası
  ground(px, py) {
    const c = this.cam;
    const vw = this.vw || 1, vh = this.vh || 1;
    let fx = c.tx - c.ex, fy = c.ty - c.ey, fz = c.tz - c.ez;
    const l = Math.hypot(fx, fy, fz) || 1;
    fx /= l; fy /= l; fz /= l;
    let sx = -fz, sz = fx;
    const sl = Math.hypot(sx, sz) || 1;
    sx /= sl; sz /= sl;
    const ux = -sz * fy, uy = sz * fx - sx * fz, uz = sx * fy;
    const tV = Math.tan(this.fov / 2), tH = tV * (vw / vh);
    const nx = (px / vw) * 2 - 1 + (this.lens || 0), ny = 1 - (py / vh) * 2;
    const dx = fx + sx * nx * tH + ux * ny * tV, dy = fy + 0 * nx + uy * ny * tV, dz = fz + sz * nx * tH + uz * ny * tV;
    if (dy > -1e-4) return null;
    const t = -c.ey / dy;
    return [c.ex + dx * t, c.ez + dz * t];
  }

  fire(a, p) {
    const bl = this.balls[this.my];
    if (!bl) return;
    this.snd.fx('putt', p);
    vibrate(12 + p * 24);
    bl.sq = 1;
    this.waitSeq = bl.seq;
    this.waitUntil = performance.now() + 1400;
    this.puttAt = performance.now();
    try {
      if (this.ctx.sendQuiet) this.ctx.sendQuiet('shot', { a, p });
      else this.ctx.send('shot', { a, p });
    } catch { /* yok say */ }
  }

  canShoot() {
    const v = this.view;
    const bl = this.balls[this.my];
    if (!v || v.phase !== 'play' || this.my < 0 || !bl) return false;
    if (bl.st >= 2 || bl.state !== 'rest') return false;
    if (this.ctx.serverNow() < this.startAt) return false;
    if (bl.seq === this.waitSeq && performance.now() < this.waitUntil) return false;
    return true;
  }
  simNow() {
    return this.startAt ? (this.ctx.serverNow() - this.startAt) / 1000 : -99;
  }

  /* ---------- sunucudan gelen durum ---------- */
  emoAnchor(pid) {
    const i = this.emoIdx(pid), b = i >= 0 && this.balls ? this.balls[i] : null;
    if (!b || b.state === 'gone' || b.state === 'pitwait') return null;
    return this.emoProj(b.x, 1.15, b.y);
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
    if (root && root.dataset.mg !== '1') {
      root.dataset.mg = '1';
      root.innerHTML = '<p class="py-16 text-center">⛳</p>';
    }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    const key = `${v.startAt}:${v.hole}:${v.n}:${v.me}`;
    if (v.startAt && key !== this.key && (v.phase === 'ready' || v.phase === 'play' || v.phase === 'result')) this.newRound(v, key);
    if (v.phase === 'play' && v.b) this.ingest(v);
    if (!prev || prev.phase !== v.phase || prev.round !== v.round || prev.startAt !== v.startAt) this.onPhase(prev, v);
    this.panel();
  }

  newRound(v, key) {
    const same = this.hole === v.hole && this.startAt === v.startAt;
    this.key = key;
    this.hole = v.hole;
    this.O = MG.prep(v.hole);
    this.H = this.O.h;
    this.startAt = v.startAt;
    this.my = v.me;
    this.todI = TOD_OF[v.hole % TOD_OF.length];
    if (!same || !this.balls.length) this.firstIngest = true;
    this.balls = [];
    for (let i = 0; i < v.n; i++) this.balls.push({ x: this.H.tee[0], y: this.H.tee[1], vx: 0, vy: 0, state: 'rest', seq: 0, strokes: 0, st: 0, sim: null, sq: 0, sink: 0, pop: 0, exp: null, lbl: null, pit: false, holed: false, hx: 0, hy: 0 });
    this.el.lbls.innerHTML = '';
    this.parts.length = 0;
    this.el.feed.innerHTML = '';
    this.lastBeep = 99;
    this.waitSeq = -1;
    this.restSince = 0;
    this.kb.until = 0;
    this.aim = null;
    this.el.pow.style.display = 'none';
    this.myDone = false;
    this.msg('');
    this.buildWorld();
  }

  buildWorld() {
    const X = this.X;
    if (!X || this.lost) return;
    this.freeWorld();
    const O = this.O, H = this.H, bb = O.bbox;
    const acc = this.brand.accentHex;
    const mk = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
    const W = { pits: [], decor: [] };
    const bx0 = bb[0] - BOARD_M, bz0 = bb[1] - BOARD_M, bx1 = bb[2] + BOARD_M, bz1 = bb[3] + BOARD_M;
    const tcx = (bx0 + bx1) / 2, tcz = (bz0 + bz1) / 2;
    W.table = mk((mb) => KIT.woodTable(mb, tcx, tcz, Math.max(bx1 - bx0, bz1 - bz0) / 2 + 46, TABLE_Y), 'tex');
    const RN = [bx0 - 2.3, bz0 - 2.3, bx1 + 2.3, bz1 + 2.3];
    W.runner = mk((mb) => KIT.runner(mb, RN[0], RN[1], RN[2], RN[3], TABLE_Y + 0.02, acc));
    W.bshadow = mk((mb) => KIT.softRect(mb, bx0 + 0.1, bz0 + 0.1, bx1 - 0.1, bz1 - 0.1, TABLE_Y + 0.03, 0.5, 1.15), 'un');
    W.board = mk((mb) => boardTexModel(mb, bb), 'tex');
    W.floor = mk((mb) => floorModel(mb, H.poly));
    W.walls = mk((mb) => wallsModel(mb, H.poly, (p) => MG.inPoly(H.poly, p[0], p[1]), acc));
    O.pits.forEach((r, i) => W.pits.push(mk((mb) => pitModel(mb, r, i))));
    W.cup = mk((mb) => cupModel(mb, MG.CUP_R));
    W.flag = mk((mb) => flagModel(mb, acc));
    W.tee = mk((mb) => teeModel(mb, acc));
    W.peg = mk((mb) => pegModel(mb, acc));
    W.blade = mk((mb) => bladeModel(mb, acc));
    W.hub = mk((mb) => hubModel(mb, acc));
    W.slide = mk((mb) => slideModel(mb, acc));
    W.boost = mk(boostModel);
    W.logo = mk((mb) => logoDisc(mb, 1.05, 0.02), 'tex');
    W.arrow = mk(arrowModel);
    const kinds = ['tomato', 'pickle', 'fry', 'olive', 'basil'];
    const dm = {};
    kinds.forEach((k) => { dm[k] = mk((mb) => decorModel(mb, k)); });
    W.dm = dm;
    // sofra: tabaklarda marka yiyecekleri, logolu bardak ve masa kartı, şişeler, çatal-bıçak, mum, saksı...
    const R = KIT.rng(this.hole * 31 + 7);
    const foods = this.brand.dishes || this.brand.foods;
    const onRun = (x, z) => x > RN[0] && x < RN[2] && z > RN[1] && z < RN[3];
    const TW = bx1 - bx0, TL = bz1 - bz0;
    const tents = [
      { k: 'tent', r: 1.7, x: tcx + TW * 0.22, z: bz0 - 1.75, ry: 0, rot: 0, land: false },
      { k: 'tent', r: 1.7, x: bx0 - 1.75, z: tcz - TL * 0.22, ry: Math.PI / 2, rot: 0, land: true },
    ];
    const items = [
      { k: 'plate', r: 3.5, food: foods[0 % foods.length] },
      { k: 'cup', r: 1.15, tall: true },
      { k: 'ketchup', r: 0.78, tall: true },
      { k: 'fries', r: 1.65 },
      { k: 'mustard', r: 0.78, tall: true },
      { k: 'napkin', r: 2.45, spread: 1.4 },
      { k: 'cutlery', r: 2.8, spread: 1.2 },
      { k: 'basil', r: 1.45, tall: true },
      { k: 'candle', r: 1.02, tall: true },
      { k: 'ramekin', r: 0.98 },
      { k: 'plate', r: 3.5, food: foods[1 % foods.length] },
      { k: 'shakers', r: 1.2, tall: true },
      { k: 'basket', r: 2.3 },
      { k: 'ramekin2', r: 0.98 },
      { k: 'cup', r: 1.15, tall: true },
    ];
    tents.forEach((t) => { t.on = t.land === !!this.camRot; });
    const placed = KIT.place([bx0, bz0, bx1, bz1], items, R, tents);
    placed.forEach((q) => {
      if (q.k === 'cutlery') {
        const side = q.x < bx0 || q.x > bx1;
        q.rot = (side ? 0 : Math.PI / 2) + (R() < 0.5 ? 0 : Math.PI) + (R() - 0.5) * 0.2;
      }
      if (q.k === 'napkin') q.rot = (R() - 0.5) * 0.5;
    });
    W.props = tents.concat(placed);
    W.props.forEach((q) => { q.y = TABLE_Y + (onRun(q.x, q.z) ? 0.02 : 0); });
    // dökülmüş küçük yiyecekler (tabak ve kayık çevresinde)
    const bits = KIT.place([bx0, bz0, bx1, bz1], [0, 1, 2, 3, 4, 5].map((i) => ({ k: ['tomato', 'olive', 'fry', 'fry', 'basil', 'olive'][i], r: 0.7, spread: 4.5 })), R, W.props);
    bits.forEach((b) => {
      const s2 = b.k === 'tomato' ? 1.15 : b.k === 'olive' ? 0.62 : b.k === 'basil' ? 0.85 : 0.75;
      W.decor.push({ x: b.x, z: b.z, y: TABLE_Y + (onRun(b.x, b.z) ? 0.02 : 0), kind: b.k, food: null, s: s2, rot: b.rot });
    });
    this.W = W;
    const tod = TOD[this.todI];
    this.cols = { sun: new Float32Array(norm3(tod.sunD)), fog: hexRGB(tod.fog), top: hexRGB(tod.top), hor: hexRGB(tod.hor), sunVis: norm3(tod.sunVis) };
  }

  initMeshes() {
    const X = this.X;
    this.kitM = null;
    this.ballM = {};
    this.mk2 = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
  }
  // Sofra eşyalarının ağları (oyun başına bir kez; marka rengiyle)
  kitMeshes() {
    if (this.kitM) return this.kitM;
    const X = this.X, acc = this.brand.accentHex;
    const mk = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
    this.kitM = {
      plate: mk((mb) => KIT.plate(mb, acc)),
      cup: mk((mb) => KIT.sodaCup(mb, acc)),
      cupLogo: mk((mb) => KIT.cupLogo(mb), 'tex'),
      tent: mk((mb) => KIT.tent(mb, acc)),
      tentLogo: mk((mb) => KIT.tentLogo(mb), 'tex'),
      ketchup: mk((mb) => KIT.bottle(mb, '#c8261c', '#b81f17', acc)),
      mustard: mk((mb) => KIT.bottle(mb, '#f0b51c', '#e3a314', acc)),
      cutlery: mk((mb) => KIT.cutlery(mb)),
      napkin: mk((mb) => KIT.napkin(mb, acc)),
      candle: mk((mb) => KIT.candle(mb)),
      glass: mk((mb) => KIT.candleGlass(mb), 'un'),
      flame: mk((mb) => KIT.flame(mb)),
      basil: mk((mb) => KIT.basilPot(mb)),
      fries: mk((mb) => KIT.friesBoat(mb, acc)),
      basket: mk((mb) => KIT.breadBasket(mb)),
      salt: mk((mb) => KIT.shaker(mb, '#f4f3ef')),
      pepper: mk((mb) => KIT.shaker(mb, '#3b3431')),
      ramekin: mk((mb) => KIT.ramekin(mb, '#c8261c')),
      ramekin2: mk((mb) => KIT.ramekin(mb, '#f2e6c4')),
    };
    return this.kitM;
  }
  ballMesh(ci) {
    if (!this.ballM[ci]) this.ballM[ci] = this.mk2((mb) => ballModel(mb, pcol(ci)));
    return this.ballM[ci];
  }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; return; }
    const X = this.X;
    ['table', 'runner', 'bshadow', 'board', 'floor', 'walls', 'cup', 'flag', 'tee', 'peg', 'blade', 'hub', 'slide', 'boost', 'logo', 'arrow'].forEach((k) => freeMesh(X, W[k]));
    W.pits.forEach((m) => freeMesh(X, m));
    Object.values(W.dm).forEach((m) => freeMesh(X, m));
    this.W = null;
  }

  /* ---------- anlık görüntüler ---------- */
  ingest(v) {
    const first = this.firstIngest;
    this.firstIngest = false;
    v.b.forEach((e, i) => {
      const bl = this.balls[i];
      if (!bl) return;
      bl.strokes = e[0];
      bl.st = e[1];
      if (e[4] !== bl.seq) this.newShot(i, e, v, first);
    });
    this.holedN = v.b.filter((e) => e[1] === 2).length;
  }

  newShot(i, e, v, first) {
    const bl = this.balls[i];
    bl.seq = e[4];
    bl.exp = [e[9], e[10]];
    bl.pit = !!(e[11] & 1);
    bl.holed = e[1] === 2;
    if (e[4] === 0) { bl.x = e[9]; bl.y = e[10]; bl.state = 'rest'; bl.sim = null; return; }
    const now = this.ctx.serverNow();
    const dur = e[8] * 1000;
    const total = dur + (bl.pit ? PIT_S * 1000 : 0);
    const el = now - e[5];
    if (el > total + 1500 || (first && el > total)) {
      if (bl.holed) { bl.state = 'gone'; bl.x = e[9]; bl.y = e[10]; } else { bl.state = 'rest'; bl.x = e[9]; bl.y = e[10]; }
      bl.sim = null;
      return;
    }
    const v0 = MG.speedOf(e[7]);
    bl.x = e[2]; bl.y = e[3];
    bl.sim = { b: { x: e[2], y: e[3], vx: Math.cos(e[6]) * v0, vy: Math.sin(e[6]) * v0, st: 0, idle: 0 }, t: (e[5] - v.startAt) / 1000, end: e[5] + dur, pitEnd: e[5] + total };
    bl.state = 'move';
    bl.sq = 1;
    bl.hx = e[7];
    if (!first) {
      const mineEcho = i === this.my && performance.now() - (this.puttAt || 0) < 3000;
      if (!mineEcho) this.snd.fx('putt', e[7]);
    }
  }

  onPhase(prev, v) {
    const p = v.phase;
    if (p === 'ready') { this.snd.music('idle'); this.msg(''); this.panelKey = ''; }
    else if (p === 'play') { this.snd.music('race'); }
    else if (p === 'result') {
      this.msg('');
      this.snd.music('calm');
      const me = v.results?.find((r) => r.id === this.ctx.me);
      if (me?.place === 1 && me.holed) setTimeout(() => this.snd.fx('win'), 250);
    } else if (p === 'final') {
      this.msg('');
      this.snd.music('calm');
      try { sfx.play('tada'); } catch { /* yok */ }
    }
  }

  feed(html) {
    const f = this.el.feed;
    const d = document.createElement('div');
    d.innerHTML = html;
    f.appendChild(d);
    while (f.children.length > 3) f.firstChild.remove();
    setTimeout(() => d.remove(), 4500);
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
    const HH = this.H;
    if (v.phase === 'loading') {
      html = '<div class="card"><div class="tt">⛳ Hazırlanıyor…</div></div>';
    } else if (v.phase === 'ready' && HH) {
      const left = v.startAt - sNow;
      if (left > 3300) {
        const first = v.round === 1;
        const canGo = ctx.isHost && first;
        key = `ready|${v.round}|${v.players.map((r) => r.id + r.n).join(',')}|${canGo}`;
        html = `<div class="card">
          <div class="tt">⛳ Mini Golf</div>
          <div class="sub">Çukur ${v.round}/${v.rounds} · ${HH.emoji} ${HH.name}<span class="mg-par">Hedef ${HH.par} vuruş</span></div>
          <div class="sub">${HH.sub}</div>
          ${first ? `<div class="how">
            <div><span class="k">👆</span><span><b>Çek ve bırak</b><small>Parmağını ekranda geriye çek, bırak: top ters yöne gider. Ne kadar çekersen o kadar sert! (Bilgisayarda ok tuşları + Boşluk)</small></span></div>
            <div><span class="k">🎯</span><span><b>Nokta çizgisi</b><small>Topun gideceği yolu ve duvardan sekmeleri gösterir</small></span></div>
            <div><span class="k">🍅</span><span><b>Sosa düşme!</b><small>Sosa giren top başa döner ve +1 ceza vuruşu yazılır</small></span></div>
            <div><span class="k">⏱️</span><span><b>Herkes aynı anda oynar</b><small>Sıra bekleme yok. Biri bitirince diğerlerine 22 sn kalır. Az vuruş = çok puan!</small></span></div>
          </div>` : `<div class="how"><div><span class="k">👆</span><span><b>Geri çek, bırak</b> · <b>🍅 sosa düşme</b> · <b>⏱️ 22 sn kala</b></span></div></div>`}
          <div class="who">${chips(v.players)}</div>
          <div class="cd"><span>${v.playing ? 'Başlıyor' : 'Bu çukuru izleyeceksin'}</span><b data-cd></b></div>
          ${canGo ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}
        </div>`;
        low = true;
      } else key = 'count';
    } else if (v.phase === 'play') {
      key = 'play';
    } else if (v.phase === 'result') {
      const meR = v.results.find((r) => r.id === ctx.me);
      key = `result|${v.round}|${ctx.isHost}`;
      const win = v.results[0];
      const title = meR?.place === 1 && meR.holed ? '🏆 Çukuru kazandın!' : meR ? `⛳ ${meR.place}. oldun` : `⛳ ${v.round}. çukur bitti`;
      const par = win?.par ?? 0;
      html = `<div class="card">
        <div class="tt">${title}</div>
        <div class="sub">${v.round}/${v.rounds}. çukur · ${win?.holed ? `en iyi: <b>${esc(win.nickname)}</b> (${win.strokes} vuruş)` : 'kimse deliğe sokamadı'}</div>
        <ol class="res">${v.results.map((r) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(r.place)}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">${r.holed ? `${r.strokes} vuruş${r.strokes === 1 ? ' 🔥' : ''}` : '❌'}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
        <div class="cd"><span>${v.last ? 'Genel sonuçlar' : 'Sonraki çukur'}</span><b data-cd></b></div>
        ${ctx.isHost ? `<button class="kb btn" data-game-action="next">${v.last ? 'Sonuçlara geç ▶' : 'Sonraki çukur ▶'}</button>` : ''}
      </div>`;
      void par;
    } else if (v.phase === 'final') {
      const sb = v.scoreboard || [];
      const top = sb[0];
      const tot = new Map((v.total || []).map((t) => [t.id, t]));
      key = `final|${sb.map((s) => s.id + s.score).join(',')}|${ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏆 ${top ? `${esc(top.nickname)} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">${v.rounds} çukurun toplam puanı</div>
        ${podiumHTML(sb, ctx.me)}
        <ol class="res">${sb.map((s, i) => `<li class="${s.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(s.c)}"></i><span class="nm">${esc(s.nickname)}</span><span class="t">${tot.get(s.id) ? `${tot.get(s.id).strokes} vuruş` : ''}</span><span class="p">${s.score}</span></li>`).join('')}</ol>
        ${v.best ? `<div class="best">🔥 Hole-in-one: <b>${esc(v.best.nickname)}</b> · ${v.best.aces}×</div>` : ''}
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
      this.cardAt = 0;
    }
  }

  msg(text, cls = '', stay = false) {
    if (!text) { this.el.msg.innerHTML = ''; return; }
    this.el.msg.innerHTML = `<span class="${cls}${stay ? ' stay' : ''}">${text}</span>`;
  }
  floatText(text, x, y, z, color = '#fff') {
    const p = this.project(x, y, z);
    if (!p) return;
    const s = document.createElement('span');
    s.className = 'fl';
    s.textContent = text;
    s.style.color = color;
    s.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -50%)`;
    this.el.fx.appendChild(s);
    setTimeout(() => s.remove(), 850);
  }
  flash(cls, ms = 380) {
    const v = this.el.vig;
    v.className = `vig on ${cls}`;
    clearTimeout(this.flashT);
    this.flashT = setTimeout(() => { v.className = 'vig'; }, ms);
  }
  toastK(text, ms = 1300) {
    const t = this.el.toastk;
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('on'), ms);
  }

  /* ---------- toplar: sunucuyla aynı çekirdekle oynat ---------- */
  stepBalls(dt) {
    const v = this.view;
    if (!v || !this.O) return;
    const sNow = this.ctx.serverNow();
    const th = (sNow - this.startAt) / 1000;
    this.sndBudget = 3;
    this.balls.forEach((bl, i) => {
      bl.sq = Math.max(0, bl.sq - dt * 5);
      bl.pop = Math.max(0, bl.pop - dt * 4);
      if (bl.state === 'move' && bl.sim) {
        const s = bl.sim;
        let n = 0;
        while (s.t + MG.DT <= th && n < 600) {
          const r = MG.tick(this.O, s.b, s.t);
          s.t += MG.DT;
          n += 1;
          if (r.e > 1.0) this.onHit(i, r.e, s.b);
          if (!r.live) { this.endShot(i, false); break; }
        }
        if (bl.state === 'move') {
          bl.x = s.b.x; bl.y = s.b.y; bl.vx = s.b.vx; bl.vy = s.b.vy;
          rollBall(bl, dt);
          if (sNow > s.end + 300) this.endShot(i, true);
        }
      } else if (bl.state === 'sink') {
        bl.sink += dt;
        if (bl.sink > 0.5) bl.state = bl.pit && !bl.holed ? 'pitwait' : 'gone';
      }
      if (bl.state === 'pitwait' && sNow >= (bl.pitEnd || 0)) {
        bl.state = 'rest';
        bl.x = bl.exp[0]; bl.y = bl.exp[1];
        bl.pop = 1;
        bl.vx = bl.vy = 0;
      }
      if (bl.state === 'rest') bl.vx = bl.vy = 0;
    });
    // kendi topum sakinleşti mi
    const mb = this.balls[this.my];
    if (mb && mb.state === 'rest' && mb.st < 2) { if (!this.restSince) this.restSince = performance.now(); } else this.restSince = 0;
  }

  onHit(i, e, b) {
    if (this.sndBudget <= 0) return;
    const k = MG.EV.k;
    this.sndBudget -= 1;
    const pan = clamp(b.x / 8, -0.8, 0.8);
    void pan;
    if (k === 2) this.snd.fx('peg', e);
    else if (k === 3 || k === 4) this.snd.fx('bonk');
    else this.snd.fx('wall', e);
    if (e > 3) this.burst(b.x, 0.3, b.y, Math.min(6, 2 + (e / 4 | 0)), [1, 0.97, 0.85], 1.8, 0.07, true, 0.3, 5);
    if (i === this.my && e > 6) { this.shake = Math.max(this.shake, 0.08); vibrate(8); }
  }

  endShot(i, force) {
    const bl = this.balls[i];
    const s = bl.sim;
    bl.sim = null;
    if (bl.holed) {
      const H = this.H;
      bl.state = 'sink'; bl.sink = 0; bl.x = H.cup[0]; bl.y = H.cup[1]; bl.vx = bl.vy = 0;
      this.onCup(i);
    } else if (bl.pit) {
      bl.state = 'sink'; bl.sink = 0; bl.vx = bl.vy = 0;
      bl.pitEnd = s ? s.pitEnd : 0;
      this.onPit(i);
    } else {
      bl.state = 'rest'; bl.vx = bl.vy = 0;
      if (bl.exp) { bl.x = bl.exp[0]; bl.y = bl.exp[1]; }
    }
    void force;
  }

  onCup(i) {
    const v = this.view;
    const bl = this.balls[i];
    const pl = v?.players?.[i];
    const H = this.H;
    this.snd.fx('cup');
    this.burst(H.cup[0], 0.4, H.cup[1], 14, hexRGB(pcol(pl ? pl.c : i)), 3.5, 0.1, true, 0.7, 7);
    this.burst(H.cup[0], 0.4, H.cup[1], 8, [1, 1, 1], 2.6, 0.07, true, 0.6, 6);
    this.feed(`${esc(pl?.n || '?')} deliğe soktu ⛳ <b>${bl.strokes}</b>`);
    if (i === this.my) {
      this.myDone = true;
      const d = bl.strokes - H.par;
      const ace = bl.strokes === 1;
      this.msg(ace ? 'HOLE IN ONE! 🔥' : (RESULT_NAMES[String(clamp(d, -3, 1))] || `${bl.strokes} vuruş ⛳`), d <= 0 ? 'gold mid' : 'mid', false);
      this.snd.fx(ace ? 'ace' : 'win');
      vibrate([30, 40, 70]);
      if (d <= 0) this.confetti(H.cup[0], H.cup[1], ace ? 120 : 60);
      setTimeout(() => { if (!this.dead && this.view?.phase === 'play') this.msg(''); }, 2200);
    }
  }
  onPit(i) {
    const v = this.view;
    const bl = this.balls[i];
    const pl = v?.players?.[i];
    this.splash(bl.x, bl.y);
    this.snd.fx('splash', clamp(bl.x / 8, -0.8, 0.8));
    this.feed(`🍅 ${esc(pl?.n || '?')} sosa düştü <b>+1</b>`);
    if (i === this.my) {
      this.msg('SOSA DÜŞTÜN! 🍅 +1', 'red mid');
      this.snd.fx('oops');
      this.flash('hit', 400);
      vibrate([40, 40, 60]);
      setTimeout(() => { if (!this.dead && this.view?.phase === 'play') this.msg(''); }, 1800);
    }
  }
  splash(x, z) {
    this.burst(x, 0.15, z, 18, [0.85, 0.2, 0.1], 4.2, 0.13, false, 0.8, 11);
    this.burst(x, 0.2, z, 7, [1, 0.9, 0.8], 3.2, 0.07, false, 0.5, 11);
  }

  /* ---------- parçacıklar ---------- */
  burst(x, y, z, n, col, speed, size, add, life, grav = 6) {
    for (let i = 0; i < n && this.parts.length < 680; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, z, vx: Math.cos(a) * s * e, vy: Math.random() * s * 0.9 + speed * 0.3, vz: Math.sin(a) * s * e, life: life * (0.6 + Math.random() * 0.6), max: life, s: size * (0.6 + Math.random() * 0.8), r: col[0], g: col[1], b: col[2], add, grav, drag: 1.5 });
    }
  }
  confetti(x, z, n) {
    const cols = ['#ff3b30', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#ffffff'].map(hexRGB);
    for (let i = 0; i < n && this.parts.length < 680; i++) {
      const c = cols[i % cols.length];
      this.parts.push({ x: x + (Math.random() - 0.5) * 3, y: 1.5 + Math.random() * 2, z: z + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 6 + 2, vz: (Math.random() - 0.5) * 6, life: 2.2 + Math.random() * 1.4, max: 3.6, s: 0.1 + Math.random() * 0.07, r: c[0], g: c[1], b: c[2], add: false, grav: 4, drag: 1.1, conf: true });
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
      if (p.y < 0.04 && p.vy < 0 && !p.conf) { p.y = 0.04; p.vy *= -0.25; p.vx *= 0.7; p.vz *= 0.7; }
      if (p.conf && p.y < 0.05) { p.y = 0.05; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; }
    }
    // hızlı topun arkasında ince iz
    this.balls.forEach((b) => {
      if (b.state === 'move' && P.length < 640) {
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 5 && Math.random() < 0.7) P.push({ x: b.x, y: 0.14, z: b.y, vx: 0, vy: 0.3, vz: 0, life: 0.35, max: 0.35, s: 0.1, r: 1, g: 1, b: 0.9, add: true, grav: -0.2, drag: 2, puff: true });
      }
    });
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
      const a = p.conf ? Math.min(1, k * 2.5) : p.puff ? k * 0.5 : k;
      const s = p.puff ? p.s * (1 + (1 - k) * 2) : p.s;
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

  /* ---------- kamera ---------- */
  stepCam(dt) {
    const v = this.view;
    const O = this.O;
    const c = this.cam;
    if (!v || !O) return;
    const vw = this.vw || 1, vh = this.vh || 1;
    const asp = vw / vh;
    const land = asp > 1;
    const pitch = land ? 1.0 : 1.12;
    const fovy = land ? 0.78 : 0.88;
    this.fov = fovy;
    const tH = Math.tan(fovy / 2) * asp, tV = Math.tan(fovy / 2);
    const bb = O.bbox;
    const w = bb[2] - bb[0] + 1.6, h = bb[3] - bb[1] + 1.6;
    // yatay ekranda uzun parkurları 90° döndür: tee solda, delik sağda
    const rot = land && h > w * 1.15;
    if (this.W && this.W.props && this.camRot !== rot) this.W.props.forEach((q) => { if (q.k === 'tent') q.on = q.land === rot; });
    this.camRot = rot;
    const sw = rot ? h : w, sh = rot ? w : h;
    const Dh = (sw / 2) / tH + (sh / 2) * Math.cos(pitch) * 1.05;
    const Dv = (sh * Math.sin(pitch) + 1.2) / (2 * tV * (land ? 0.76 : 0.68));
    const Dt = Math.max(Dh, Dv, 8) * 1.07;
    c.D = c.D ? damp(c.D, Dt, 2.4, dt) : Dt;
    const sN = this.simNow();
    const intro = v.phase === 'ready' && sN < -3.2;
    c.yaw = damp(c.yaw, (rot ? Math.PI / 2 : 0) + (intro ? Math.sin(this.time * 0.3) * 0.4 : 0), intro ? 3 : 2.4, dt);
    const cx = (bb[0] + bb[2]) / 2, cz = (bb[1] + bb[3]) / 2;
    // giriş: kamera bayrağın yanından başlayıp tüm parkura doğru açılır (deliği önce gösterir)
    const H2 = this.H;
    const ik = v.phase === 'ready' && H2 ? clamp((sN + 9) / 5.8, 0, 1) : 1;
    const ie = ik * ik * (3 - 2 * ik);
    const gx = H2 ? lerp(H2.cup[0], cx, ie) : cx, gz = H2 ? lerp(H2.cup[1], cz - c.D * 0.03, ie) : cz - c.D * 0.03;
    c.tx = damp(c.tx, gx, ik < 1 ? 6 : 3, dt);
    c.tz = damp(c.tz, gz, ik < 1 ? 6 : 3, dt);
    c.ty = 0;
    const Dd = c.D * (intro ? 0.93 : 1) * lerp(0.42, 1, ie);
    c.ex = c.tx + Math.sin(c.yaw) * Dd * Math.cos(pitch);
    c.ey = Dd * Math.sin(pitch);
    c.ez = c.tz + Math.cos(c.yaw) * Dd * Math.cos(pitch);
    let lens = 0;
    if (intro && land && this.panelLow) {
      if (!(this.cardAt > performance.now() - 400)) {
        this.cardAt = performance.now();
        const cd = this.el.panel.querySelector('.card');
        const L = cd ? cd.getBoundingClientRect().left : vw;
        this.cardL = L > vw * 0.3 ? L : vw;
      }
      lens = clamp(1 - (this.cardL || vw) / vw, 0, 0.6);
    }
    this.lens = lens;
    this.shake = Math.max(0, this.shake - dt * 1.8);
  }

  project(x, y, z) {
    const m = this.mats.VP;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    const W = this.vw || 1, Hh = this.vh || 1;
    return [((cx / cw) * 0.5 + 0.5) * W, (1 - ((cy / cw) * 0.5 + 0.5)) * Hh];
  }

  /* ---------- çizim ---------- */
  resize() {
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    const W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return [W, H, w / h];
  }

  // Nişan: çizgi boyunca noktalar (sekmeleri de gösterir)
  aimDots(a, p) {
    const bl = this.balls[this.my];
    if (!bl || !this.O) return [];
    const v = MG.speedOf(p);
    const b = { x: bl.x, y: bl.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, st: 0, idle: 0 };
    const th = this.simNow();
    const out = [];
    for (let k = 0; k < 120; k++) {
      const r = MG.tick(this.O, b, th + k * MG.DT);
      if (k % 5 === 4) out.push([b.x, b.y, k]);
      if (!r.live) break;
    }
    return out;
  }

  // Gölge ve ana geçişte ortak: gölge düşüren (ve alan) opak nesneler. D(mesh, m, tint) — gölge geçişinde renk yok sayılır.
  litScene(D, m, tObs, shadow) {
    const Wd = this.W, O = this.O, H = this.H;
    const T = this.T3 || [ONE3, ONE3, ONE3];
    const [T_A, T_B, T_C] = T;
    // sofra eşyaları
    const PM = this.kitM;
    if (PM) {
      Wd.props.forEach((p) => {
        const y = p.y;
        switch (p.k) {
          case 'plate': {
            M.set(m, p.x, y, p.z, p.rot, 0, 0, 3.4); D(PM.plate, m, T_A);
            const fm = this.res.food[p.food];
            if (fm) { M.set(m, p.x, y + KIT.PLATE_TOP * 3.4 + 0.25 * 4.2, p.z, p.rot + 0.6, 0, 0, 4.2); D(fm, m, T_A); }
            break;
          }
          case 'shakers':
            M.set(m, p.x - 0.55, y, p.z, p.rot); D(PM.salt, m, T_A);
            M.set(m, p.x + 0.55, y, p.z + 0.2, p.rot); D(PM.pepper, m, T_A);
            break;
          case 'tent': if (p.on) { M.set(m, p.x, y, p.z, p.ry); D(PM.tent, m, T_A); } break;
          default: { const mesh = PM[p.k]; if (mesh) { M.set(m, p.x, y, p.z, p.rot, 0, 0, p.s || 1); D(mesh, m, T_A); } }
        }
      });
    }
    Wd.decor.forEach((d) => {
      const mesh = d.food ? this.res.food[d.food] : Wd.dm[d.kind];
      M.set(m, d.x, d.y + (d.food ? 0.25 * d.s : 0), d.z, d.rot, 0, 0, d.s);
      D(mesh, m, T_A);
    });
    M.set(m, 0, 0, 0);
    if (shadow) D(Wd.board, m, T_B);
    if (!shadow) {
      D(Wd.runner, m, T_A);
      detailOn(this.X, 0.2, 0.32);
      D(Wd.floor, m, T_B);
      detailOn(this.X, 0);
    }
    D(Wd.walls, m, T_C);
    if (!shadow) {
      const ex = this.expo || 1;
      // ketçap havuzu: yüzeyde dolaşan küçük dalgalar (kayan parıltılar)
      const uw = this.X.lit.u.uWave;
      if (uw) this.X.gl.uniform4f(uw, this.time % 200, 0.07, 2.4, 1);
      Wd.pits.forEach((pm) => {
        const f = 1 + 0.07 * Math.sin(this.time * 2.2);
        D(pm, m, new Float32Array([ex * f, ex * (2 - f), ex * (2 - f)]), 1, 1.0 + 0.1 * Math.sin(this.time * 3));
      });
      if (uw) this.X.gl.uniform4f(uw, 0, 0, 0, 0);
      M.set(m, H.cup[0], 0, H.cup[1]);
      D(Wd.cup, m, T_B);
      M.set(m, H.tee[0], 0, H.tee[1]);
      D(Wd.tee, m, T_B);
      O.boosts.forEach((z) => {
        M.set(m, z.x, 0, z.y, Math.atan2(-z.dx, -z.dy), 0, 0, z.r);
        D(Wd.boost, m, T_C, 1, 1.0 + 0.3 * Math.sin(this.time * 6));
      });
    }
    M.set(m, H.cup[0], 0, H.cup[1], Math.sin(this.time * 2) * 0.12, 0, Math.sin(this.time * 1.7) * 0.03);
    D(Wd.flag, m, T_C);
    O.pegs.forEach((p) => {
      M.set(m, p[0], 0, p[1], 0, 0, 0, p[2], p[2] * 1.05, p[2]);
      D(Wd.peg, m, T_C);
    });
    O.spin.forEach((s) => {
      M.set(m, s.x, 0, s.y);
      D(Wd.hub, m, T_C);
      for (let j = 0; j < s.k; j++) {
        const ang = MG.bladeAng(s, j, tObs);
        M.set(m, s.x, 0, s.y, -ang, 0, 0, s.len, 1, 1);
        D(Wd.blade, m, T_C);
      }
    });
    O.slide.forEach((s) => {
      const g = MG.slideSeg(s, tObs);
      M.set(m, (g[0] + g[2]) / 2, 0, (g[1] + g[3]) / 2, s.v ? Math.PI / 2 : 0, 0, 0, s.hl, 1, 1);
      D(Wd.slide, m, T_C);
    });
    // toplar
    const items = [];
    const order = this.balls.map((_, i) => i).sort((a, b) => (a === this.my) - (b === this.my));
    order.forEach((i) => {
      const bl = this.balls[i];
      if (bl.state === 'gone') return;
      const pl = this.view?.players?.[i];
      const ci = pl ? pl.c : i;
      let sc = BALL_S, yy = 0;
      if (bl.state === 'sink') { const k = clamp(bl.sink / 0.45, 0, 1); sc *= 1 - k * 0.85; yy = -k * 0.3; }
      else if (bl.state === 'pitwait') return;
      else if (bl.pop > 0) sc *= 1 - bl.pop * 0.9;
      const squash = bl.sq;
      // top her zaman zeminin üstünde: merkez = taban + yarıçap × dikey ölçek (ezilince de alt noktası yerde kalır)
      const syq = sc * (1 - 0.14 * squash);
      ballMat(m, bl, bl.x, yy + BALL_R * syq, bl.y, sc * (1 + 0.12 * squash), syq, sc * (1 + 0.12 * squash));
      if (shadow) D(this.ballMesh(ci), m, T_C);
      else drawToon(this.X, this.ballMesh(ci), m, T_C, this.Fr, { h: this.vh, px: 1.7, rimK: 0.25 });
      items.push({ bl, i, ci, sc, yy });
    });
    return items;
  }

  draw() {
    const X = this.X;
    const Wd = this.W;
    if (!X || this.lost || !Wd || !this.O) { if (!X && this.O) this.draw2d(); return; }
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const O = this.O, H = this.H;
    const tod = TOD[this.todI];
    const c = this.cam;
    const mt = this.mats;
    const th = this.simNow();
    const tObs = Math.max(0, th);
    const sh = this.shake * this.shake * 0.5;
    const jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    M.persp(mt.P, this.fov, asp, 0.5, 500);
    const shift = this.lens || 0;
    if (shift) mt.P[8] = shift;
    M.look(mt.V, c.ex + jx, c.ey + jy, c.ez, c.tx + jx * 0.4, c.ty + jy * 0.4, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const lampOn = tod.lampC[0] > 0;
    const K = this.cols;
    const F = { VP: mt.VP, V: mt.V, fov: this.fov, asp, shift, cx: c.ex, cy: c.ey, cz: c.ez, sun: K.sun, fog: K.fog, top: K.top, hor: K.hor, sunVis: K.sunVis, lx: c.tx, ly: lampOn ? 9 : -50, lz: c.tz, lampC: tod.lampC };
    const fogA = c.D * 1.3, fogB = c.D * 1.3 + 150;
    const setFog = (p) => { if (p.u.uFogR) gl.uniform2f(p.u.uFogR, fogA, fogB); };
    const m = mt.a;
    const ex = DAY_EXP[this.todI];
    this.expo = ex;
    this.T3 = [new Float32Array([ex * 0.95, ex * 0.95, ex * 0.95]), new Float32Array([ex, ex, ex]), new Float32Array([ex * 1.04, ex * 1.04, ex * 1.04])];
    if (!this.kitM) this.kitMeshes();
    // ---- gerçek gölgeler: güneşten derinlik haritası ----
    {
      const bb = O.bbox;
      const R = Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2 + BOARD_M + 7.5;
      if (shadowBegin(X, K.sun, (bb[0] + bb[2]) / 2, 0, (bb[1] + bb[3]) / 2, R, R * 2.2 + 10, 0.55)) this.litScene((mesh, mm) => shadowCast(X, mesh, mm), m, tObs, true);
      shadowEnd(X, Wp, Hp);
    }
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(F.fog[0], F.fog[1], F.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    drawSky(X, F, tod);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);

    // ahşap masa (dokulu, gölge alır)
    useProg(X, X.tex, F, tod);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.res.wood());
    M.set(m, 0, 0, 0);
    drawMesh(X, Wd.table, m, this.T3[0]);
    gl.bindTexture(gl.TEXTURE_2D, this.res.wood('maple'));
    drawMesh(X, Wd.board, m, this.T3[1]);

    useProg(X, X.lit, F, tod);
    setFog(X.lit);
    aoOn(X, TABLE_Y, 0.7, 0.3);
    this.Fr = F;
    const items = this.litScene((mesh, mm, tint, al, gw) => drawMesh(X, mesh, mm, tint, al, gw), m, tObs, false);
    // mum alevi (titrer)
    const PM = this.kitM;
    Wd.props.forEach((p) => {
      if (p.k !== 'candle') return;
      const fl = 1 + 0.12 * Math.sin(this.time * 17 + p.x) * Math.sin(this.time * 6.3 + p.z);
      M.set(m, p.x, p.y + 1.42, p.z, 0, Math.sin(this.time * 3 + p.x) * 0.08, 0, fl, fl * (1 + 0.1 * Math.sin(this.time * 11)), fl);
      drawMesh(X, PM.flame, m, ONE3);
    });
    // "sen" oku
    const canShoot = this.canShoot();
    const mb = this.balls[this.my];
    if (mb && canShoot && !this.aim) {
      M.set(m, mb.x, 1.55 + Math.sin(this.time * 4) * 0.12, mb.y, this.time * 1.6, Math.PI, 0, 0.9);
      drawMesh(X, Wd.arrow, m, ONE3, 1, 1.0);
    }
    // dokulu: parkurdaki logo, masa kartı ve bardak logoları
    useProg(X, X.tex, F, tod);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0.3 + tod.night * 0.5);
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    const lg = H.logo || [0, 0];
    M.set(m, lg[0], 0, lg[1]);
    drawMesh(X, Wd.logo, m);
    gl.uniform1f(X.tex.u.uSelf, 0.12 + tod.night * 0.35);
    Wd.props.forEach((p) => {
      if (p.k === 'tent' && p.on) { M.set(m, p.x, p.y, p.z, p.ry); drawMesh(X, PM.tentLogo, m, this.T3[0]); }
      else if (p.k === 'cup') { M.set(m, p.x, p.y, p.z, Math.atan2(c.ex - p.x, c.ez - p.z)); drawMesh(X, PM.cupLogo, m, this.T3[0]); }
    });
    // saydam
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, tod);
    setFog(X.un);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    // parkur tablasının yumuşak temas gölgesi + top altı temas gölgeleri
    M.set(m, 0, 0, 0);
    drawMesh(X, Wd.bshadow, m, ONE3, 1);
    items.forEach((q) => {
      M.set(m, q.bl.x + 0.03, 0.025, q.bl.y + 0.04, 0, 0, 0, 0.27 * q.sc, 1, 0.27 * q.sc);
      drawMesh(X, this.res.shadow, m, ONE3, 0.45 * (q.bl.state === 'sink' ? 0.4 : 1));
    });
    Wd.props.forEach((p) => {
      const r = p.k === 'plate' ? 3.3 : p.k === 'basket' ? 2.2 : p.k === 'napkin' || p.k === 'cutlery' ? 0 : p.r * 0.95;
      if (!r || (p.k === 'tent' && !p.on)) return;
      M.set(m, p.x, p.y + 0.004, p.z, 0, 0, 0, r, 1, r);
      drawMesh(X, this.res.shadow, m, ONE3, 0.5);
    });
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // mum camı
    Wd.props.forEach((p) => { if (p.k === 'candle') { M.set(m, p.x, p.y, p.z, Math.atan2(c.ex - p.x, c.ez - p.z)); drawMesh(X, PM.glass, m, ONE3, 1); } });
    // katkı
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    items.forEach((q) => {
      const mine = q.i === this.my;
      if (q.bl.state === 'sink') return;
      const col = hexRGB(pcol(q.ci));
      const big = mine && canShoot;
      M.set(m, q.bl.x, 0.04, q.bl.y, 0, 0, 0, big ? 0.85 : 0.5, 1, big ? 0.85 : 0.5);
      drawMesh(X, this.res.glow, m, col, big ? 0.55 + 0.25 * Math.sin(this.time * 5) : mine ? 0.3 : 0.18);
    });
    // mum ışığı (akşam/gece daha belirgin)
    Wd.props.forEach((p) => {
      if (p.k !== 'candle') return;
      const k = 0.35 + tod.night * 0.65;
      M.set(m, p.x, p.y + 0.02, p.z, 0, 0, 0, 3.2, 1, 3.2);
      drawMesh(X, this.res.glow, m, [1, 0.62, 0.25], 0.22 * k * (1 + 0.1 * Math.sin(this.time * 13)));
    });
    // delik parıltısı (gece ve ilk bitiren için)
    if (tod.night > 0.3) { M.set(m, H.cup[0], 0.04, H.cup[1], 0, 0, 0, 1.2, 1, 1.2); drawMesh(X, this.res.glow, m, [1, 0.85, 0.5], 0.25 * tod.night); }
    // nişan noktaları
    const aimNow = this.curAim();
    if (aimNow) {
      const dots = this.aimDots(aimNow.a, aimNow.p);
      const col = aimNow.p < 0.5 ? [0.3, 1, 0.5] : aimNow.p < 0.82 ? [1, 0.85, 0.25] : [1, 0.4, 0.25];
      dots.forEach((d, k) => {
        const f = 1 - k / (dots.length + 4);
        M.set(m, d[0], 0.12, d[1], 0, 0, 0, 0.17 + 0.07 * f, 1, 0.17 + 0.07 * f);
        drawMesh(X, this.res.glow, m, col, 0.3 + 0.7 * f);
      });
    }
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    const tiltG = asp > 1 ? [0.47, 0.3, 0.85] : [0.5, 0.37, 0.85];
    postFX(X, Wp, Hp, Object.assign(tod.night > 0.6 ? { bloom: 0.85, th: 0.62, white: 0.25, sat: 1.1, con: 0.12, vig: 0.75 } : tod.night > 0.2 ? { bloom: 0.6, th: 0.74, white: 0.3, sat: 1.1, con: 0.14, vig: 0.65 } : { bloom: 0.42, th: 0.84, white: 0.22, sat: 1.08, con: 0.14, vig: 0.55 }, { tilt: tiltG }));
  }

  // WebGL yoksa: üstten basit görünüm
  draw2d() {
    const g = this.g2;
    const cv = this.el.cv;
    const w = this.el.wrap.clientWidth || 1, h = this.el.wrap.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#7a4a28'; g.fillRect(0, 0, w, h);
    const O = this.O, H = this.H, bb = O.bbox;
    const bw = bb[2] - bb[0] + 2, bh = bb[3] - bb[1] + 2;
    const sc = Math.min((w - 20) / bw, (h * 0.72) / bh);
    const ox = w / 2 - ((bb[0] + bb[2]) / 2) * sc, oy = h * 0.46 - ((bb[1] + bb[3]) / 2) * sc;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    g.beginPath();
    H.poly.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
    g.closePath(); g.fillStyle = '#4fae4c'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#f2e8d0'; g.stroke();
    g.fillStyle = '#c43a1f';
    O.pits.forEach((r) => g.fillRect(X(r[0]), Y(r[1]), (r[2] - r[0]) * sc, (r[3] - r[1]) * sc));
    g.fillStyle = '#fff';
    O.pegs.forEach((p) => { g.beginPath(); g.arc(X(p[0]), Y(p[1]), p[2] * sc, 0, 7); g.fill(); });
    const t = Math.max(0, this.simNow());
    g.strokeStyle = '#ffd23f'; g.lineWidth = 5;
    O.spin.forEach((s) => { for (let j = 0; j < s.k; j++) { const a = MG.bladeAng(s, j, t); g.beginPath(); g.moveTo(X(s.x), Y(s.y)); g.lineTo(X(s.x + Math.cos(a) * s.len), Y(s.y + Math.sin(a) * s.len)); g.stroke(); } });
    O.slide.forEach((s) => { const q = MG.slideSeg(s, t); g.beginPath(); g.moveTo(X(q[0]), Y(q[1])); g.lineTo(X(q[2]), Y(q[3])); g.stroke(); });
    g.fillStyle = '#111'; g.beginPath(); g.arc(X(H.cup[0]), Y(H.cup[1]), MG.CUP_R * sc * 1.3, 0, 7); g.fill();
    this.balls.forEach((bl, i) => {
      if (bl.state === 'gone' || bl.state === 'pitwait') return;
      const pl = this.view?.players?.[i];
      g.fillStyle = pcol(pl ? pl.c : i);
      g.beginPath(); g.arc(X(bl.x), Y(bl.y), Math.max(5, MG.BR * sc * 1.2), 0, 7); g.fill();
      g.strokeStyle = i === this.my ? '#fff' : '#222'; g.lineWidth = i === this.my ? 3 : 1.5; g.stroke();
    });
    const aimNow = this.curAim();
    if (aimNow) {
      const dots = this.aimDots(aimNow.a, aimNow.p);
      g.fillStyle = '#ffd23f';
      dots.forEach((d) => { g.beginPath(); g.arc(X(d[0]), Y(d[1]), 3, 0, 7); g.fill(); });
    }
  }

  /* ---------- HUD ---------- */
  hud(sNow) {
    const v = this.view;
    const HH = this.H;
    if (!v || !HH) return;
    const t = this.simNow();
    const live = v.phase === 'ready' || v.phase === 'play';
    const showHud = (live && !!v.startAt) || v.phase === 'result';
    const vis = showHud ? 'visible' : 'hidden';
    if (this.el.hud.style.visibility !== vis) this.el.hud.style.visibility = vis;
    if (v.phase === 'ready' || (v.phase === 'play' && t < 0.6)) {
      const left = -t;
      const n = Math.ceil(left);
      if (left > 0 && left <= 3 && n !== this.lastBeep) { this.lastBeep = n; this.msg(String(n), 'big'); this.snd.fx('beep'); }
      if (left <= 0 && this.lastBeep > 0 && this.lastBeep < 99) { this.lastBeep = 0; this.msg('VUR! ⛳', 'big gold'); this.snd.fx('go'); vibrate(40); }
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
    // ipucu
    const bl = this.balls[this.my];
    const can = this.canShoot();
    const showHint = can && !this.aim && this.kb.until < performance.now() && !this.panelLow && ((v.round === 1 && (bl?.strokes || 0) < 2) || (this.restSince && performance.now() - this.restSince > 8000));
    this.el.hint.classList.toggle('off', !showHint);
    // not
    let note = '';
    if (v.phase === 'play' && v.me < 0) note = '👀 Bu çukuru izliyorsun — sonrakinde sen de varsın!';
    else if (v.phase === 'play' && bl && bl.st === 2) note = '✅ Deliğe soktun! Diğerleri bekleniyor…';
    else if (v.phase === 'play' && bl && bl.st === 3) note = '⛔ Vuruş hakkın bitti — çukuru izliyorsun';
    if (note !== this.noteText) { this.noteText = note; this.el.note.textContent = note; this.el.note.classList.toggle('on', !!note); }
    if (!showHud) return;
    // sayaç
    let tt = '🏁';
    let low = false;
    if (v.phase === 'play') {
      const rem = Math.max(0, Math.ceil(((v.dl || v.startAt) - sNow) / 1000));
      tt = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`;
      low = rem <= 10 && rem > 0;
    } else if (v.phase === 'ready') tt = '⛳';
    if (tt !== this.ttText) { this.ttText = tt; this.el.tm.textContent = tt; }
    this.el.tm.classList.toggle('low', low);
    // vuruş sayısı / hedef (par): "2/3" — dar ekranda alt satıra kaymasın diye kısa
    const pb = String(bl ? bl.strokes : 0), ps = `/${HH.par}`;
    if (this.el.posB.textContent !== pb) { this.el.posB.textContent = pb; this.el.pos.classList.add('pulse'); setTimeout(() => this.el.pos.classList.remove('pulse'), 220); }
    if (this.el.posS.textContent !== ps) this.el.posS.textContent = ps;
    this.el.pos.style.display = v.me >= 0 ? '' : 'none';
    const ko = `⛳ ${this.holedN || 0}/${v.n}`;
    if (this.el.ko.textContent !== ko) this.el.ko.textContent = ko;
    const rn = `Çukur ${v.round}/${v.rounds} · ${HH.emoji} ${HH.name} · Hedef ${HH.par}`;
    if (this.el.rnd.textContent !== rn) this.el.rnd.textContent = rn;
  }

  labels() {
    const vis = new Set();
    const pls = this.view?.players || [];
    // üst üste binen toplar (ör. başlama noktasında) tek etikette toplanır: "Berat ●●●●"
    const groups = [];
    const order = this.balls.map((_, i) => i).sort((a, b) => (b === this.my) - (a === this.my));
    const sc = clamp(1.2 - this.cam.D / 90, 0.7, 1.0);
    order.forEach((i) => {
      const s = this.balls[i];
      const pl = pls[i];
      if (!this.X || !pl || s.state === 'gone' || s.state === 'pitwait') return;
      const p = this.project(s.x, 1.5, s.y);
      if (!p) return;
      vis.add(i);
      if (!s.lbl) {
        s.lbl = document.createElement('div');
        s.lbl.className = 'lbl';
        s.lbl.innerHTML = `<i style="background:${pcol(pl.c)}"></i>${esc(pl.n)}<span class="dots"></span>`;
        this.el.lbls.appendChild(s.lbl);
        s.dk = '';
      }
      const g = groups.find((q) => Math.abs(q.x - p[0]) < 46 * sc && Math.abs(q.y - p[1]) < 20 * sc);
      if (g) { g.mem.push(i); s.lbl.style.display = 'none'; return; }
      groups.push({ x: p[0], y: p[1], lead: i, mem: [] });
      s.lbl.style.display = '';
      s.lbl.style.opacity = pl.on ? '1' : '0.5';
      s.lbl.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, -100%) scale(${sc.toFixed(2)})`;
    });
    groups.forEach((g) => {
      const s = this.balls[g.lead];
      const key = g.mem.join(',');
      if (s.dk === key) return;
      s.dk = key;
      const d = s.lbl.querySelector('.dots');
      if (d) d.innerHTML = g.mem.slice(0, 7).map((j) => `<b style="background:${pcol(pls[j]?.c ?? j)}"></b>`).join('') + (g.mem.length > 7 ? `<em>+${g.mem.length - 7}</em>` : '');
    });
    this.balls.forEach((s, i) => { if (s.lbl && !vis.has(i)) s.lbl.style.display = 'none'; });
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
      this.stepKb(dt);
      this.stepBalls(dt);
      this.stepParts(dt);
      this.stepCam(dt);
      this.draw();
      this.labels();
      this.hud(sNow);
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[golf]', e); }
    }
  }

  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.initMeshes();
      this.W = null;
      if (this.O) this.buildWorld();
    } catch (e) { console.warn('[golf] geri yükleme', e); }
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    try { this.emo && this.emo.dispose(); } catch { /* yok say */ }
    cancelAnimationFrame(this.raf);
    this.snd.stopAll();
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    try {
      if (this.X && !this.X.gl.isContextLost()) {
        this.freeWorld();
        Object.values(this.ballM || {}).forEach((mm) => freeMesh(this.X, mm));
        Object.values(this.kitM || {}).forEach((mm) => freeMesh(this.X, mm));
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
    console.error('[golf]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

// Test ve hata ayıklama için (oyunda kullanılmaz)
export const _dbg = () => ({ G, MG });
