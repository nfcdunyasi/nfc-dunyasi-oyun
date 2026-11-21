// Sumo Tepsisi — 3D itişme oyunu (NFC Dünyası Oyun)
// Kurye Yarışı'nın küçük WebGL motorunu yeniden kullanır. Fizik sunucuda döner (30 Hz); telefon girdi gönderir,
// kendi karakterini tahmin eder, rakipleri yumuşatarak gösterir.
import { _eng } from './kuryeYarisi.js?v=2026-11-21-f';
import { _masa } from './masa3d.js?v=2026-11-21-f';
const { ctx2d, podiumHTML, placeLabels, EmoteUI, aoOn, detailOn, drawToon, postFX, KIT, shadowBegin, shadowCast, shadowEnd, emitSoft, autoRes, sfx, clamp, lerp, damp, esc, hexRGB, C, shade, M, makeGL, MB, freeMesh, drawMesh, drawSky, drawDynamic, useProg, TOD, norm3, brandInfo, Res, Snd, pcol, vibrate, medal, ONE3, injectStyle } = _eng();
let MA = null;
const masa = () => MA || (MA = _masa());   // masa karakterleri: oyuncu her oyunda aynı görünür (burada aşçı kılığında)

// Ortak çekirdek (sunucudaki botlar ve fizik de birebir aynı kodu kullanır)
const SU = (() => {
  // Sumo Tepsisi çekirdeği: yuvarlak tepsi, itişme fiziği, küçülen platform, bot zekâsı.
  // Sunucu (gerçek simülasyon) ve telefon (kendi karakterinin tahmini) AYNI kodu çalıştırır.
  const DT = 1 / 30;            // sunucu fizik adımı (sn)
  const BR = 0.62;              // karakter yarıçapı (m)
  const BUMP_R = 0.85;          // bumper yarıçapı
  const DASH_V = 12.5, DASH_T = 0.26, DASH_CD = 1.9, RAM = 11;
  const REST = 0.9;             // çarpışma sekmesi
  const RMIN = 2.4;             // tepsinin en küçük hali
  const SHR_T = 0.55, WARN = 2.6;  // küçülme süresi, uyarı süresi
  const FALL_G = 24, FALL_END = -7;
  const KO_WINDOW = 3.5;        // son vurandan bu kadar sn içinde düşerse "devirme" sayılır
  const STEPS = [9, 16.5, 23, 29, 34, 38.5, 42.5, 46, 49, 52];
  const VARIANTS = [
    { id: 0, name: 'Klasik tepsi', emoji: '🍽️', sub: 'Kenardan uzak dur, rakibi dışarı it!', acc: 30, drag: 3.0, vmax: 6.4, bump: 0, speed: 1 },
    { id: 1, name: 'Yağlı tepsi', emoji: '🧈', sub: 'Zemin kaygan: kayarsın, durmak zor!', acc: 15, drag: 0.85, vmax: 8.2, bump: 0, speed: 0.92 },
    { id: 2, name: 'Fırlatıcı tepsi', emoji: '🎯', sub: 'Tuzluk bumperlar seni fırlatır!', acc: 30, drag: 3.0, vmax: 6.4, bump: 3, speed: 0.85 },
  ];
  const ZERO = { x: 0, y: 0, d: 0 };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (k) => k * k * (3 - 2 * k);

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Tepsi: yarıçap dizisi (her adımda 0,8 ile çarpılır), küçülme zamanları, bumperlar
  function makeArena(n, variant, seed) {
    const V = VARIANTS[variant % VARIANTS.length];
    const r0 = clamp(5.8 + 0.45 * n, 7, 10.5);
    const radii = [r0];
    while (radii[radii.length - 1] > RMIN + 0.05) radii.push(Math.max(RMIN, radii[radii.length - 1] * 0.8));
    const f = (n <= 3 ? 0.78 : n <= 5 ? 0.9 : 1) * V.speed;
    const times = STEPS.slice(0, radii.length - 1).map((s) => Math.round(s * f * 10) / 10);
    const last = times.length ? times[times.length - 1] : 5;
    const sd = Math.max(times.length ? last + 12 : 20, 40 * f + 10);
    const rnd = rng(seed * 7 + 3);
    const bumpers = [];
    if (V.bump) {
      const a0 = rnd() * Math.PI * 2;
      for (let i = 0; i < V.bump; i++) {
        const a = a0 + (i / V.bump) * Math.PI * 2;
        const d = r0 * 0.5;
        bumpers.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: BUMP_R, d });
      }
    }
    return { n, variant: V.id, seed, r0, radii, times, sd, bumpers };
  }

  // t anındaki tepsi yarıçapı (deterministik: sunucu ve istemci aynı değeri bulur)
  function radiusAt(A, t) {
    let R = A.radii[0];
    for (let k = 0; k < A.times.length; k++) {
      const tk = A.times[k];
      if (t >= tk + SHR_T) R = A.radii[k + 1];
      else if (t >= tk) { R = A.radii[k] + (A.radii[k + 1] - A.radii[k]) * ease((t - tk) / SHR_T); break; }
      else break;
    }
    if (t > A.sd) R = Math.max(0.15, R - 0.32 * (t - A.sd));
    return R;
  }
  // Yaklaşan küçülme: {k, left, to} (left = küçülmeye kalan sn), yoksa null
  function warnAt(A, t) {
    for (let k = 0; k < A.times.length; k++) {
      const tk = A.times[k];
      if (t < tk) return t >= tk - WARN ? { k, left: tk - t, to: A.radii[k + 1] } : null;
      if (t < tk + SHR_T) return { k, left: 0, to: A.radii[k + 1], going: (t - tk) / SHR_T };
    }
    return null;
  }
  const bumperOn = (A, b, t) => radiusAt(A, t) > b.d + 0.55;

  // Başlangıç dizilişi: tepsinin kenarına yakın bir çemberde, merkeze bakar
  function spawn(A, i, n, rnd) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const d = A.r0 * 0.66;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, fx: -Math.cos(a), fy: -Math.sin(a) };
  }

  function body(p) {
    return { x: p.x, y: p.y, vx: 0, vy: 0, fx: p.fx, fy: p.fy, dt: 0, cd: 2.2, st: 0, z: 0, vz: 0, fall: 0, alive: 1, lh: -1, lt: -99, ko: 0, out: -1, pend: 0 };
  }

  // Tek karakterin hareketi (çarpışmasız): oyuncunun telefonunda tahmin için de kullanılır
  function stepBody(b, dt, inp, V, ev, idx) {
    if (b.fall) {
      b.vz -= FALL_G * dt;
      b.z += b.vz * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const k = Math.exp(-0.6 * dt);
      b.vx *= k; b.vy *= k;
      if (b.z < FALL_END) b.alive = 0;
      return;
    }
    let ix = Number(inp.x) || 0, iy = Number(inp.y) || 0;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const ctl = b.st > 0 ? 0.35 : 1;
    b.vx += ix * V.acc * ctl * dt;
    b.vy += iy * V.acc * ctl * dt;
    if (m > 0.15) {
      const L = Math.hypot(ix, iy) || 1;
      const tx = ix / L, ty = iy / L;
      const k = 1 - Math.exp(-14 * dt);
      b.fx += (tx - b.fx) * k; b.fy += (ty - b.fy) * k;
      const fl = Math.hypot(b.fx, b.fy) || 1;
      b.fx /= fl; b.fy /= fl;
    }
    // atılma isteği kısa süre bekletilir (gecikmeye tolerans)
    if (inp.d) b.pend = 0.22;
    if (b.pend > 0 && b.cd <= 0 && b.st < 0.2) {
      let dx = b.fx, dy = b.fy;
      if (m > 0.15) { dx = ix / m; dy = iy / m; }
      b.vx = dx * DASH_V + b.vx * 0.2;
      b.vy = dy * DASH_V + b.vy * 0.2;
      b.fx = dx; b.fy = dy;
      b.dt = DASH_T; b.cd = DASH_CD; b.pend = 0;
      if (ev) ev.push(['d', idx, b.x, b.y]);
    }
    b.pend = Math.max(0, b.pend - dt);
    b.cd = Math.max(0, b.cd - dt);
    b.dt = Math.max(0, b.dt - dt);
    b.st = Math.max(0, b.st - dt);
    const k = Math.exp(-V.drag * (b.dt > 0 ? 0.25 : 1) * dt);
    b.vx *= k; b.vy *= k;
    const sp = Math.hypot(b.vx, b.vy);
    const cap = b.dt > 0 ? DASH_V * 1.2 : V.vmax;
    if (sp > cap) {
      const f = Math.max(cap / sp, Math.exp(-2.4 * dt));
      b.vx *= f; b.vy *= f;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
  }

  function collide(S) {
    const B = S.bodies;
    const ev = S.ev;
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      if (!a.alive || a.fall) continue;
      for (let j = i + 1; j < B.length; j++) {
        const c = B[j];
        if (!c.alive || c.fall) continue;
        let dx = c.x - a.x, dy = c.y - a.y;
        const min = BR * 2;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-4) { dx = 1; dy = 0; d = 1e-4; }
        const nx = dx / d, ny = dy / d;
        const ov = (min - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; c.x += nx * ov; c.y += ny * ov;
        const rvn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        let power = 0;
        if (rvn < 0) {
          const jn = -(1 + REST) * rvn / 2;
          a.vx -= jn * nx; a.vy -= jn * ny; c.vx += jn * nx; c.vy += jn * ny;
          power = -rvn;
        }
        // atılış (dash) vuruşu: karşıyı fırlatır
        let ram = 0;
        const ad = a.dt > 0 && (a.vx * nx + a.vy * ny) > 3;
        const cd = c.dt > 0 && -(c.vx * nx + c.vy * ny) > 3;
        if (ad && !cd) { c.vx += nx * RAM; c.vy += ny * RAM; a.vx -= nx * RAM * 0.2; a.vy -= ny * RAM * 0.2; c.st = 0.4; ram = 1; }
        else if (cd && !ad) { a.vx -= nx * RAM; a.vy -= ny * RAM; c.vx += nx * RAM * 0.2; c.vy += ny * RAM * 0.2; a.st = 0.4; ram = 1; }
        else if (ad && cd) { a.st = 0.25; c.st = 0.25; ram = 1; }
        if (power > 0.6 || ram) {
          a.lh = j; a.lt = S.t; c.lh = i; c.lt = S.t;
          ev.push(['h', (a.x + c.x) / 2, (a.y + c.y) / 2, Math.round((power + ram * 6) * 10) / 10, i, j]);
        }
      }
    }
  }

  function bump(S) {
    const A = S.arena;
    if (!A.bumpers.length) return;
    A.bumpers.forEach((p, bi) => {
      if (!bumperOn(A, p, S.t)) return;
      S.bodies.forEach((b, i) => {
        if (!b.alive || b.fall) return;
        const dx = b.x - p.x, dy = b.y - p.y;
        const min = BR + p.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) return;
        const d = Math.sqrt(d2) || 1e-4;
        const nx = dx / d, ny = dy / d;
        b.x = p.x + nx * min; b.y = p.y + ny * min;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 2.4 * vn * nx; b.vy -= 2.4 * vn * ny; }
        const sp = b.vx * nx + b.vy * ny;
        if (sp < 7.5) { b.vx += (7.5 - sp) * nx; b.vy += (7.5 - sp) * ny; }
        b.st = Math.max(b.st, 0.3);
        b.lh = -1;
        S.ev.push(['b', p.x, p.y, bi, i]);
      });
    });
  }

  function create(n, variant, seed) {
    const A = makeArena(n, variant, seed);
    const V = VARIANTS[A.variant];
    const bodies = [];
    for (let i = 0; i < n; i++) bodies.push(body(spawn(A, i, n)));
    return { n, V, arena: A, t: 0, R: A.r0, bodies, ev: [], out: 0, over: false, overT: 0 };
  }

  function drop(S, i) {
    const b = S.bodies[i];
    if (!b || b.fall || !b.alive) return;
    b.fall = 1; b.vz = 0; b.out = S.t; b.dt = 0;
    S.out += 1;
    let ko = -1;
    if (b.lh >= 0 && S.t - b.lt <= KO_WINDOW && b.lh !== i) { ko = b.lh; S.bodies[ko].ko += 1; }
    S.ev.push(['f', i, ko, b.x, b.y]);
  }

  // Bir sunucu adımı. inputs[i] = {x, y, d} (d: atılma isteği, tüketilir)
  function tick(S, inputs) {
    const dt = DT;
    const R = radiusAt(S.arena, S.t);
    S.R = R;
    S.bodies.forEach((b, i) => {
      if (!b.alive) return;
      const inp = inputs[i] || ZERO;
      stepBody(b, dt, inp, S.V, S.ev, i);
      if (inp.d) inp.d = 0;
    });
    collide(S);
    bump(S);
    S.bodies.forEach((b, i) => {
      if (b.alive && !b.fall && Math.hypot(b.x, b.y) > R) drop(S, i);
    });
    S.t += dt;
    if (!S.over) {
      const st = S.bodies.filter((b) => b.alive && !b.fall).length;
      if (S.n >= 2 ? st <= 1 : st === 0) { S.over = true; S.overT = S.t; }
    }
  }

  // Sıralama: ayakta kalanlar (merkeze yakın olan önde), sonra daha geç düşenler
  function ranking(S) {
    const idx = S.bodies.map((_, i) => i);
    idx.sort((i, j) => {
      const a = S.bodies[i], b = S.bodies[j];
      const sa = a.fall ? 0 : 1, sb = b.fall ? 0 : 1;
      if (sa !== sb) return sb - sa;
      if (sa) return Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y);
      return b.out - a.out;
    });
    return idx;
  }

  // ---------------- bot zekâsı ----------------
  // me/others: {x,y,vx,vy,cd,dt,st}; A: {R, Rt, warn, bumpers}; sk: 0-1 beceri
  function bot(me, others, A, mem, sk, rnd, t) {
    if (me.fall) return { x: 0, y: 0, d: 0 };
    const dist = Math.hypot(me.x, me.y) || 1e-3;
    const Rt = A.warn ? Math.min(A.R, A.Rt) : A.R;
    const cx = -me.x / dist, cy = -me.y / dist;
    const lead = 0.38 + sk * 0.2;
    const px = me.x + me.vx * lead, py = me.y + me.vy * lead;
    const pd = Math.hypot(px, py);
    const margin = 1.15 + (1 - sk) * 0.55 + (A.warn ? 0.5 : 0);
    let ix = 0, iy = 0, dash = 0;
    if (pd > Rt - margin || dist > Rt - 0.95) {
      // kenar tehlikesi: merkeze dön, kaymayı söndür
      ix = cx - me.vx * 0.09; iy = cy - me.vy * 0.09;
      if (dist > Rt - 0.45 && me.cd <= 0 && sk > 0.4 && rnd() < 0.5) dash = 1;
      mem.mode = 'save';
    } else if (t < (mem.t0 === undefined ? (mem.t0 = t) : mem.t0) + (mem.dly === undefined ? (mem.dly = 1.4 + rnd() * 1.3) : mem.dly)) {
      // tur başında insanlara düşünme payı: bot önce sakin kalır
      ix = cx * 0.25; iy = cy * 0.25;
      mem.mode = 'wait';
    } else {
      // hedef seç: yakın ve kenara yakın olanı tercih et
      if (!mem.tgt || t > mem.until || !others.some((o) => o.i === mem.tgt.i)) {
        let best = null, bs = 1e9;
        others.forEach((o) => {
          const d = Math.hypot(o.x - me.x, o.y - me.y);
          const ed = Math.hypot(o.x, o.y);
          const s = d * (1 + (1 - sk) * rnd() * 0.5) - Math.max(0, ed - Rt * 0.45) * (0.5 + sk * 0.6);
          if (s < bs) { bs = s; best = o; }
        });
        mem.tgt = best;
        mem.until = t + 1.1 + rnd() * 1.2;
      }
      const o = others.find((q) => mem.tgt && q.i === mem.tgt.i);
      if (!o) {
        ix = cx * 0.4; iy = cy * 0.4;
      } else {
        const odist = Math.hypot(o.x, o.y) || 1e-3;
        const tdx = o.x - me.x, tdy = o.y - me.y;
        const td = Math.hypot(tdx, tdy) || 1e-3;
        const tx = tdx / td, ty = tdy / td;
        // merkez tarafında mıyım? (rakibi dışarı itmek için)
        const ocx = -o.x / odist, ocy = -o.y / odist;
        const centreSide = (me.x - o.x) * ocx + (me.y - o.y) * ocy;
        if (centreSide > 0.2 || td < 2.1) { ix = tx; iy = ty; }
        else {
          const ax = o.x + ocx * 1.5, ay = o.y + ocy * 1.5;
          const adx = ax - me.x, ady = ay - me.y, ad = Math.hypot(adx, ady) || 1e-3;
          ix = adx / ad; iy = ady / ad;
        }
        if (me.cd <= 0 && td < 2.7 && td > 0.9) {
          const sp = Math.hypot(me.vx, me.vy);
          const hx = sp > 0.5 ? me.vx / sp : tx, hy = sp > 0.5 ? me.vy / sp : ty;
          const aligned = hx * tx + hy * ty;
          if (aligned > 0.62 && rnd() < 0.18 + sk * 0.5) { dash = 1; ix = tx; iy = ty; }
        }
        // üzerime atılan rakipten kaç (yan adım)
        if (sk > 0.45 && o.dt > 0 && td < 3.2) {
          const ovx = o.vx / (Math.hypot(o.vx, o.vy) || 1), ovy = o.vy / (Math.hypot(o.vx, o.vy) || 1);
          if (ovx * -tx + ovy * -ty > 0.6) { ix = -ty * (rnd() < 0.5 ? 1 : -1) + cx * 0.4; iy = tx * (rnd() < 0.5 ? 1 : -1) + cy * 0.4; }
        }
      }
      // bumpera çarpma: kaçın
      (A.bumpers || []).forEach((p) => {
        const bx = p.x - me.x, by = p.y - me.y, bd = Math.hypot(bx, by);
        if (bd < p.r + 1.5 && bd > 0.01 && (ix * bx + iy * by) / bd > 0.2) { ix -= bx / bd * 1.2; iy -= by / bd * 1.2; }
      });
      mem.mode = 'hunt';
    }
    // beceriye göre titreme
    const noise = (1 - sk) * 0.7;
    const a = (rnd() - 0.5) * noise;
    const ca = Math.cos(a), sa = Math.sin(a);
    const nx = ix * ca - iy * sa, ny = ix * sa + iy * ca;
    const m = Math.hypot(nx, ny) || 1;
    return { x: nx / m, y: ny / m, d: dash };
  }

  return { DT, BR, BUMP_R, DASH_V, DASH_T, DASH_CD, RMIN, SHR_T, WARN, FALL_G, FALL_END, VARIANTS, ZERO, rng, makeArena, radiusAt, warnAt, bumperOn, spawn, body, stepBody, collide, create, drop, tick, ranking, bot, clamp };
})();

/* ============================ modeller ============================ */

const TRAY_TOP = 0, TRAY_LIP = 0.13, TRAY_BOT = -0.5, LAKE_Y = -1.7;
const TRAY_COLS = [['#f3ead4', '#d3dae3'], ['#f7e9b0', '#e9d08a'], ['#f3dccf', '#d6e0d0']];
const LAKE_COLS = ['#c43a1f', '#6b3f22', '#4d8f2e'];
const UP = [0, -6, 0];

// Tepsinin bir halkası (r0..r1). r0 = 0 ise merkez diski.
function ringPiece(mb, r0, r1, col, rim, seg = 36) {
  const lipW = 0.34;
  const ri = Math.max(r0, r1 - lipW);
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    const am = (a0 + a1) / 2, cm = Math.cos(am), sm = Math.sin(am);
    const tc = shade(col, i % 2 ? 0.93 : 1.02);
    if (r0 > 0.01) mb.quad([c0 * r0, TRAY_TOP, s0 * r0], [c0 * ri, TRAY_TOP, s0 * ri], [c1 * ri, TRAY_TOP, s1 * ri], [c1 * r0, TRAY_TOP, s1 * r0], tc, UP);
    else mb.tri([0, TRAY_TOP, 0], [c0 * ri, TRAY_TOP, s0 * ri], [c1 * ri, TRAY_TOP, s1 * ri], tc, UP);
    // kenar dudağı
    mb.quad([c0 * ri, TRAY_LIP, s0 * ri], [c0 * r1, TRAY_LIP, s0 * r1], [c1 * r1, TRAY_LIP, s1 * r1], [c1 * ri, TRAY_LIP, s1 * ri], rim, UP);
    mb.quad([c0 * ri, TRAY_TOP, s0 * ri], [c1 * ri, TRAY_TOP, s1 * ri], [c1 * ri, TRAY_LIP, s1 * ri], [c0 * ri, TRAY_LIP, s0 * ri], shade(rim, 0.8), [cm * (r1 + 2), 0, sm * (r1 + 2)]);
    mb.quad([c0 * r1, TRAY_BOT, s0 * r1], [c1 * r1, TRAY_BOT, s1 * r1], [c1 * r1, TRAY_LIP, s1 * r1], [c0 * r1, TRAY_LIP, s0 * r1], shade(col, 0.72), [0, -0.2, 0]);
    mb.quad([c0 * r0, TRAY_BOT, s0 * r0], [c1 * r0, TRAY_BOT, s1 * r0], [c1 * r1, TRAY_BOT, s1 * r1], [c0 * r1, TRAY_BOT, s0 * r1], shade(col, 0.5), [0, 6, 0]);
    if (r0 > 0.01) mb.quad([c0 * r0, TRAY_BOT, s0 * r0], [c1 * r0, TRAY_BOT, s1 * r0], [c1 * r0, TRAY_TOP, s1 * r0], [c0 * r0, TRAY_TOP, s0 * r0], shade(col, 0.6), [cm * (r0 + 2), 0, sm * (r0 + 2)]);
    // gece parlayan çivi
    if (i % 3 === 0) {
      // yuvarlak başlı perçin (gece hafif parlar)
      mb.lathe(cm * (r1 - 0.17), TRAY_LIP, sm * (r1 - 0.17), [[0, 0], [0.085, 0], [0.085, 0.015], [0.07, 0.05], [0.04, 0.072], [0, 0.078]], 12, (k) => (k <= 2 ? shade(rim, 0.75) : C('#fff2b0', 0.5)));
    }
  }
}

// Uyarı halkası (kırmızı, parlak): un türü
function warnRing(mb, r1, seg = 40) {
  const r0 = Math.max(0.2, r1 - 0.62);
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    mb.quad([c0 * r0, 0.2, s0 * r0], [c0 * r1, 0.2, s0 * r1], [c1 * r1, 0.2, s1 * r1], [c1 * r0, 0.2, s1 * r0], [1, 0.22, 0.12, 1]);
  }
}

// Birim yarıçaplı ince halka (dalga / halka efekti): un türü
function thinRing(mb, seg = 36, w = 0.12) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    mb.quad([c0 * (1 - w), 0, s0 * (1 - w)], [c0, 0, s0], [c1, 0, s1], [c1 * (1 - w), 0, s1 * (1 - w)], [1, 1, 1, 1]);
  }
}

// Logo diski (dokulu): merkezde, yuvarlak kırpılmış
function logoDisc(mb, r, y, seg = 28) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [Math.cos(a0) * r, y, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, y, Math.sin(a1) * r];
    mb.tw([0, y, 0], p0, p1, null, [0, y - 1, 0], [0.5, 0.5, 0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5, 0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5]);
  }
}

// Dev çorba kâsesi: sos gölü kâsenin içinde, kâse ahşap bir sofrada (minik aşçılar, dev mutfak)
const BOWL_Y = -3.4;          // kâse dibi / sofra yüksekliği
const bowlRadius = (A) => A.r0 * 1.25 + 3.6;
const LAKE_PAL = [
  ['#b62e17', '#d4471f', '#e8742c'],   // domates çorbası / ketçap: koyu kırmızı + turuncu girdaplar
  ['#5e3519', '#7a4a26', '#c99a5e'],   // çikolata / sos: kahve + kremalı girdap
  ['#3f7f27', '#5a9a33', '#c9d26a'],   // pesto: yeşil + zeytinyağı parıltısı
];
function swirl(x, z, ph) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  return 0.5 + 0.5 * Math.sin(a * 3 + r * 0.55 + ph + 1.6 * Math.sin(r * 0.21 - ph));
}
const lakeH = (seed) => { const ph = seed * 1.7; return (x, z) => LAKE_Y + 0.05 * Math.sin(x * 0.35 + ph) * Math.sin(z * 0.31 - ph) + 0.03 * Math.sin((x + z) * 0.9 + ph * 2); };
function lakeModel(mb, variant, seed, maxR) {
  const pal = LAKE_PAL[variant % 3].map(hexRGB);
  const ph = seed * 1.7;
  const h = lakeH(seed);
  const nrm = (x, z) => { const e = 0.2; return [h(x - e, z) - h(x + e, z), 2 * e, h(x, z - e) - h(x, z + e)]; };
  const col = (x, z) => {
    const s = swirl(x, z, ph), s2 = swirl(z * 1.7, x * 1.7, ph * 2 + 1);
    let c = mix3s(pal[0], pal[1], s);
    c = mix3s(c, pal[2], Math.pow(Math.max(0, s2 - 0.55) / 0.45, 2) * 0.75);
    return [c[0], c[1], c[2], -0.7];
  };
  const rings = [];
  for (let r = 0; r < maxR + 0.6; r += r < 6 ? 0.75 : 0.6) rings.push(r);
  rings.push(maxR + 0.6);
  const seg = 72;
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const r0 = rings[k], r1 = rings[k + 1];
      const P = (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r];
      const v = [P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1)].map((p) => [p[0], h(p[0], p[2]), p[2]]);
      mb.quadN(v[0], v[1], v[2], v[3], nrm(v[0][0], v[0][2]), nrm(v[1][0], v[1][2]), nrm(v[2][0], v[2][2]), nrm(v[3][0], v[3][2]), col(v[0][0], v[0][2]), col(v[1][0], v[1][2]), col(v[2][0], v[2][2]), col(v[3][0], v[3][2]));
    }
  }
}
const mix3s = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// Kâse: içte sırlı beyaz duvar, ağızda yuvarlak kalın kenar; kenarda işletme rengi şerit ve çini deseni
function bowlModel(mb, R, accentHex) {
  const ac = C(accentHex, -0.7);
  const white = C('#f6f3ec', -0.75), cream = C('#ebe4d6', -0.6), blue = C('#2f5ea8', -0.75);
  // iç yüzey (sos seviyesinin altından ağza kadar), dışa doğru açılır
  const top = 0.9, rim = R + 1.6;
  mb.lathe(0, 0, 0, [[R - 0.6, LAKE_Y - 0.6], [R, LAKE_Y + 0.1], [R + 0.5, -0.4], [R + 1.15, top - 0.2], [rim - 0.05, top]].map(([r, y]) => [r, y]).reverse().map(([r, y]) => [r, y]), 72, (i, a) => {
    // ağza yakın bantta çini deseni
    if (i === 0) return ac;
    if (i === 1) return Math.sin(a * 24) > 0.55 ? blue : white;
    return white;
  });
  // kalın yuvarlak ağız
  mb.torusN(0, top + 0.12, 0, rim + 0.18, 0.28, 0.2, 96, 10, null, (a, b) => (Math.sin(b) < -0.2 ? cream : white));
  // dış yüzey: ağızdan sofraya iner
  mb.lathe(0, 0, 0, [[R - 0.4, BOWL_Y], [R + 0.4, BOWL_Y + 0.25], [rim - 0.2, top - 1.4], [rim + 0.35, top + 0.05]], 72, (i, a) => (i >= 2 ? (Math.sin(a * 12) > 0.86 ? ac : cream) : cream));
}

/* ==================== Göldeki garnitürler: sosa yarı gömülü, ayrıntılı yiyecekler ====================
   Her model orijinde kurulur; y = 0 sos yüzeyidir (altı sosun içinde kalır). Birim ≈ aşçı boyunun yarısı.
   Yüzeyler parametrik ızgaralardan (surf) üretilir: köşe normalleri sonlu farkla, renkler köşe başına. */
const TAU = Math.PI * 2;
const hs2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const sst = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mx = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * t];
// dikişsiz pürüz: u, v ∈ [0,1] ve tam sayı frekanslar (kapalı yüzeylerde dikiş oluşmaz). Değer ≈ [-1, 1]
const pn = (u, v, s = 0) => Math.sin(TAU * (u * 7 + v * 2) + s * 1.7) * 0.5 + Math.sin(TAU * (u * 13 - v * 5) + s * 3.1) * 0.3 + Math.sin(TAU * (u * 23 + v * 9) + s * 5.3) * 0.2;
// periyodik kafes gürültüsü (hücre başına rastgele): i mod n ile kapalı yüzeyde dikişsiz
const cell = (u, v, nu, nv, s = 0) => hs2(((Math.floor(u * nu) % nu) + nu) % nu + s * 17, ((Math.floor(v * nv) % nv) + nv) % nv + s * 29);

// Parametrik yüzey. us / vs: parametre dizileri ya da bölüm sayısı. P(u, v) → [x, y, z], Cf(u, v) → renk.
// o.wu / o.wv: o yönde kapalı (son satır ilkine eşit). o.up: normaller yukarı; o.cen: nokta ya da (u, v) → nokta, normaller ondan dışa.
function surf(mb, us, vs, P, Cf, o = {}) {
  if (typeof us === 'number') us = Array.from({ length: us + 1 }, (_, i) => i / us);
  if (typeof vs === 'number') vs = Array.from({ length: vs + 1 }, (_, i) => i / vs);
  const nu = us.length - 1, nv = vs.length - 1;
  const G = us.map((u) => vs.map((v) => P(u, v)));
  const K = us.map((u) => vs.map((v) => Cf(u, v)));
  const at = (i, j) => {
    i = o.wu ? ((i % nu) + nu) % nu : Math.max(0, Math.min(nu, i));
    j = o.wv ? ((j % nv) + nv) % nv : Math.max(0, Math.min(nv, j));
    return G[i][j];
  };
  const N = [];
  for (let i = 0; i <= nu; i++) {
    const row = [];
    for (let j = 0; j <= nv; j++) {
      const a = at(i + 1, j), b = at(i - 1, j), c = at(i, j + 1), d = at(i, j - 1);
      const du0 = a[0] - b[0], du1 = a[1] - b[1], du2 = a[2] - b[2], dv0 = c[0] - d[0], dv1 = c[1] - d[1], dv2 = c[2] - d[2];
      const n = [du1 * dv2 - du2 * dv1, du2 * dv0 - du0 * dv2, du0 * dv1 - du1 * dv0];
      const L = Math.hypot(n[0], n[1], n[2]);
      row.push(L < 1e-12 ? null : [n[0] / L, n[1] / L, n[2] / L]);
    }
    N.push(row);
  }
  // kutuplar (bütün satır/sütun aynı noktada): komşu satırın ortalaması
  const avg = (list) => { let x = 0, y = 0, z = 0; list.forEach((n) => { if (n) { x += n[0]; y += n[1]; z += n[2]; } }); const l = Math.hypot(x, y, z); return l > 1e-9 ? [x / l, y / l, z / l] : null; };
  const rowBad = N.map((row) => row.every((q) => !q));
  for (let i = 0; i <= nu; i++) {
    if (!rowBad[i]) continue;
    const ii = i === 0 ? 1 : i - 1;
    const a = avg(N[ii]) || [0, 1, 0];
    for (let j = 0; j <= nv; j++) N[i][j] = a.slice();
  }
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      if (N[i][j]) continue;
      N[i][j] = avg([N[Math.max(0, i - 1)][j], N[Math.min(nu, i + 1)][j], N[i][Math.max(0, j - 1)], N[i][Math.min(nv, j + 1)]]) || [0, 1, 0];
    }
  }
  // yön: tek bir işaret (yüzey boyunca tutarlı)
  let sg = 0;
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const n = N[i][j];
      if (o.up) sg += n[1];
      else if (o.cen) { const c = typeof o.cen === 'function' ? o.cen(us[i], vs[j]) : o.cen, p = G[i][j]; sg += n[0] * (p[0] - c[0]) + n[1] * (p[1] - c[1]) + n[2] * (p[2] - c[2]); }
    }
  }
  if (sg < 0) N.forEach((row) => row.forEach((n) => { n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]; }));
  // köşegen yönü dama tahtası gibi değişir (kutupsal ızgaralarda fırıldak deseni oluşmasın)
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      if ((i + j) & 1) mb.quadN(G[i][j + 1], G[i][j], G[i + 1][j], G[i + 1][j + 1], N[i][j + 1], N[i][j], N[i + 1][j], N[i + 1][j + 1], K[i][j + 1], K[i][j], K[i + 1][j], K[i + 1][j + 1]);
      else mb.quadN(G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1], N[i][j], N[i + 1][j], N[i + 1][j + 1], N[i][j + 1], K[i][j], K[i + 1][j], K[i + 1][j + 1], K[i][j + 1]);
    }
  }
  return mb;
}

// Dilim: kutupsal üst yüzey (top(u,v) yükseklik, col(u,v) renk, edge(v) yarıçap çarpanı) + y0'a inen yan duvar
function slice(mb, R, us, vs, top, col, edge, y0, side) {
  const E = edge || (() => 1);
  surf(mb, us, vs, (u, v) => { const r = R * u * E(v); return [Math.cos(TAU * v) * r, top(u, v), Math.sin(TAU * v) * r]; }, col, { wv: true, up: true });
  if (y0 !== undefined) {
    surf(mb, 2, vs, (w, v) => { const r = R * E(v) * (1 - 0.04 * w); const yt = top(1, v); return [Math.cos(TAU * v) * r, yt + (y0 - yt) * w, Math.sin(TAU * v) * r]; }, (w, v) => side(v, w), { wv: true, cen: [0, y0, 0] });
  }
  return mb;
}
// Açısal örnekler: n bölmenin her birinde verilen konumlar (0..1), kaydırma off; ilk ve son eşleşir (kapalı)
function vsPer(n, ts, off = 0) {
  const a = [];
  for (let k = 0; k < n; k++) for (const t of ts) a.push((((k + t) / n + off) % 1 + 1) % 1);
  a.sort((x, y) => x - y);
  const out = a.filter((x, i) => i === 0 || x - a[i - 1] > 1e-6);
  out.push(out[0] + 1);
  return out;
}
// Çokgen profil üzerinde yay uzunluğuyla nokta (t ∈ [0,1]) — [r, y] çiftleri
function polyAt(pts, t) {
  if (!pts.cum) { let L = 0; pts.cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); pts.cum.push(L); } pts.len = L; }
  const d = Math.max(0, Math.min(1, t)) * pts.len;
  let i = 1;
  while (i < pts.length - 1 && pts.cum[i] < d) i++;
  const k = (d - pts.cum[i - 1]) / (pts.cum[i] - pts.cum[i - 1] || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
}
// Sosa gömülen kısmı ıslat: y0 altında tam sos rengi (parlak), y1'e doğru incelir (modelin kendi koordinatlarında)
function coat(mb, sc, y0 = -0.03, y1 = 0.06, k = 0.82) {
  const d = mb.d;
  for (let i = 0; i < d.length; i += 10) {
    const t = sst(y1, y0, d[i + 1]) * k;
    if (t <= 0) continue;
    d[i + 6] += (sc[0] - d[i + 6]) * t; d[i + 7] += (sc[1] - d[i + 7]) * t; d[i + 8] += (sc[2] - d[i + 8]) * t;
    d[i + 9] += (-0.92 - d[i + 9]) * t;
  }
  return mb;
}

/* ---------- dilimler ---------- */
// Domates dilimi: koyu kabuk, lifli et duvarı, 4 parlak jöle bölmesi ve içlerinde tohumlar, açık renk göbek
function gTomato(mb, seed = 1, R = 0.8) {
  const L = 4, off = hs2(seed, 3) * 0.25;
  const skin = C('#9e130b', -0.9), wall = C('#d42a18', -0.55), wall2 = C('#e8452b', -0.55), core = C('#f07c5c', -0.45), sep = C('#e0402a', -0.5);
  const gelA = C('#f8ae6c', -0.95), gelB = C('#ec6f3c', -0.95);
  const TOP = 0.085;
  const inG = (u, v) => {
    const t = (((v - off) * L) % 1 + 1) % 1;
    const s = Math.min(t, 1 - t), m = 1 - 2 * s;
    const rin = 0.22 + 0.06 * m, rout = 0.74 - 0.14 * m * m;
    return sst(rin - 0.03, rin + 0.03, u) * (1 - sst(rout - 0.035, rout + 0.025, u)) * sst(0.05, 0.12, s);
  };
  const top = (u, v) => TOP - 0.03 * inG(u, v) - Math.max(0, u - 0.9) * 0.6 + 0.004 * Math.sin(TAU * (v * 9) + u * 31);
  const col = (u, v) => {
    const g = inG(u, v);
    let c;
    if (u > 0.955) c = skin;
    else if (u > 0.78) c = mx(wall, wall2, 0.5 + 0.5 * Math.sin(TAU * v * 29 + u * 11));
    else if (u < 0.22) c = mx(core, sep, sst(0.12, 0.22, u));
    else c = sep;
    if (u > 0.92 && u <= 0.955) c = mx(wall, skin, (u - 0.92) / 0.035);
    const gc = mx(gelA, gelB, sst(0.3, 0.72, u) * 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(TAU * v * L * 2)));
    return mx(c, gc, g);
  };
  const us = [0, 0.1, 0.18, 0.22, 0.27, 0.34, 0.44, 0.54, 0.62, 0.69, 0.74, 0.79, 0.86, 0.92, 0.955, 0.985, 1];
  const vs = vsPer(L, [0, 0.045, 0.09, 0.15, 0.25, 0.37, 0.5, 0.63, 0.75, 0.85, 0.91, 0.955], off);
  slice(mb, R, us, vs, top, col, (v) => 1 + 0.025 * Math.sin(TAU * v * 3 + seed) + 0.012 * Math.sin(TAU * v * 7), -0.1, () => skin);
  const sd = C('#f4e3a2', -0.6), sd2 = C('#e8cf80', -0.6);
  for (let k = 0; k < L; k++) {
    for (let q = 0; q < 5; q++) {
      const t = (q - 2) * 0.17 + (hs2(k, q + seed) - 0.5) * 0.06;
      const a = TAU * (off + (k + 0.5 + t) / L);
      const r = R * (0.4 + 0.1 * (1 - Math.abs(t) * 2.6) + 0.03 * hs2(q, k));
      mb.push().T(Math.cos(a) * r, TOP - 0.024, Math.sin(a) * r, -a + (hs2(q, k + 5) - 0.5) * 0.5);
      mb.sphereS(0, 0, 0, 0.048 * R / 0.8, 0.016, 0.03 * R / 0.8, q % 2 ? sd : sd2, 6, 3);
      mb.pop();
    }
  }
  return mb;
}

// Tırtıklı turşu dilimi: dalgalı kenar, koyu yeşil kabuk, açık zeytin yeşili et, ortada üç tohum yuvası
function gPickleChip(mb, seed = 1, R = 0.48) {
  const W = 9;
  const skin = C('#2c5216', -0.88), skin2 = C('#4c7d24', -0.88), rim = C('#8ea43f', -0.85), flesh = C('#b3bf5e', -0.88), flesh2 = C('#cbd178', -0.9), seedz = C('#dad99c', -0.95), cav = C('#ebe7bb', -0.95);
  const edge = (v) => 1 + 0.05 * Math.cos(TAU * v * W);
  const top = (u, v) => 0.055 + 0.012 * (1 - u * u) - Math.max(0, u - 0.9) * 0.3 + 0.014 * Math.cos(TAU * v * W) * u * u;
  const ph = hs2(seed, 9) * TAU;
  const lobes = (u, v) => sst(0.1, 0.18, u) * (1 - sst(0.34, 0.42, u)) * sst(0.3, 0.7, 0.5 + 0.5 * Math.cos(TAU * v * 3 + ph));
  const col = (u, v) => {
    let c;
    if (u > 0.9) c = mx(skin, skin2, 0.5 + 0.5 * Math.cos(TAU * v * W));
    else if (u > 0.8) c = mx(rim, skin2, sst(0.82, 0.9, u));
    else c = mx(flesh2, flesh, sst(0.44, 0.8, u));
    if (u < 0.46) c = mx(c, seedz, sst(0.46, 0.36, u) * 0.75);
    return mx(c, cav, lobes(u, v));
  };
  slice(mb, R, [0, 0.14, 0.26, 0.36, 0.46, 0.62, 0.8, 0.86, 0.9, 0.95, 1], 36, top, col, edge, -0.07, (v) => mx(skin, skin2, 0.5 + 0.5 * Math.cos(TAU * v * W)));
  for (let k = 0; k < 3; k++) {
    for (let q = 0; q < 2; q++) {
      const a = (k * TAU - ph) / 3 + (q - 0.5) * 0.5;
      const r = R * (0.27 + 0.03 * q);
      mb.push().T(Math.cos(a) * r, 0.064, Math.sin(a) * r, -a);
      mb.sphereS(0, 0, 0, 0.04, 0.011, 0.024, C('#f4efcc', -0.5), 6, 3);
      mb.pop();
    }
  }
  return mb;
}
// Üç turşu dilimi yelpaze gibi üst üste
function gPickles(mb, seed = 1) {
  const Rr = SU.rng(seed * 41 + 3);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Rr() * 0.8;
    const d = i === 0 ? 0 : 0.42 + Rr() * 0.1;
    mb.push().T(Math.cos(a) * d, i * 0.035, Math.sin(a) * d, Rr() * TAU, (Rr() - 0.5) * 0.12, (Rr() - 0.5) * 0.12, 0.92 + Rr() * 0.18);
    gPickleChip(mb, seed * 3 + i, 0.48);
    mb.pop();
  }
  return mb;
}

// Bütün kornişon turşu: kavisli, uçları ince, yumrulu kabuk (yumru tepeleri açık), boyuna açık çizgiler
function gGherkin(mb, seed = 1) {
  const L = 0.95, Rm = 0.27;
  const Rr = SU.rng(seed * 31 + 7);
  const bumps = [];
  for (let i = 0; i < 30; i++) bumps.push([0.07 + Rr() * 0.86, Rr(), 0.7 + Rr() * 0.6]);
  const bf = (u, v) => {
    let b = 0;
    for (const [bu, bv, s] of bumps) {
      let dv = Math.abs(v - bv); dv = Math.min(dv, 1 - dv);
      const d2 = ((u - bu) * 11) ** 2 + (dv * 9) ** 2;
      if (d2 < 1) b = Math.max(b, (1 - d2) * (1 - d2) * s);
    }
    return b;
  };
  const rad = (u) => Rm * Math.pow(Math.sin(Math.PI * u), 0.45) * (1 - 0.14 * sst(0.55, 1, u));
  const cen = (u) => [(u - 0.5) * 2 * L, 0, -0.13 * Math.sin(Math.PI * u)];
  surf(mb, 30, 20, (u, v) => {
    const c = cen(u), a = TAU * v, r = rad(u) * (1 + 0.085 * bf(u, v));
    return [c[0], Math.sin(a) * r * 0.94, c[2] + Math.cos(a) * r];
  }, (u, v) => {
    const b = bf(u, v);
    const st = 0.5 + 0.5 * Math.sin(TAU * v * 6 + Math.sin(TAU * u) * 1.3);
    let c = mx(C('#2a4f15', -0.9), C('#4a7b25', -0.9), st * 0.75);
    c = mx(c, C('#a2c05a', -0.8), b * 0.85);
    c = mx(c, C('#76792b', -0.75), Math.max(sst(0.1, 0, u), sst(0.9, 1, u)) * 0.75);
    return c;
  }, { wv: true, cen: (u) => cen(u) });
  // sap ucu: küçük kahverengi düğme
  mb.sphereS(-L - 0.005, 0, 0, 0.035, 0.03, 0.03, C('#6a5a2a', -0.4), 8, 5);
  return mb;
}

/* ---------- kızartmalar ---------- */
// Patates kızartması yığını: kare kesitli, yuvarlatılmış uçlu çubuklar; üstü açık altın, uçları ve kenarları kızarmış
function gFries(mb, seed = 1) {
  const Rr = SU.rng(seed * 13 + 5);
  const N = 7;
  for (let i = 0; i < N; i++) {
    const L = 0.5 + Rr() * 0.22, w = 0.092 + Rr() * 0.018;
    const layer = i < 4 ? 0 : 1;
    const x = (Rr() - 0.5) * 0.62, z = (Rr() - 0.5) * 0.5;
    const y = 0.035 + layer * 0.115 + Rr() * 0.02;
    const bend = (Rr() - 0.5) * 0.07, dark = Rr();
    const dip = (Rr() - 0.5) * (layer ? 0.3 : 0.14);
    mb.push().T(x, y, z, Rr() * Math.PI, dip, (Rr() - 0.5) * 0.25);
    surf(mb, [0, 0.015, 0.05, 0.14, 0.3, 0.5, 0.7, 0.86, 0.95, 0.985, 1], 12, (u, v) => {
      const e = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 6)), 0.25);
      const a = TAU * v, ca = Math.cos(a), sa = Math.sin(a);
      const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 0.35), sy = Math.sign(sa) * Math.pow(Math.abs(sa), 0.35);
      return [sx * w * e, sy * w * e * 0.92 + bend * (1 - (2 * u - 1) ** 2), (u - 0.5) * 2 * L];
    }, (u, v) => {
      const a = TAU * v, topF = Math.max(0, Math.sin(a)), corner = Math.abs(Math.sin(2 * a));
      const end = sst(0.14, 0.0, Math.min(u, 1 - u));
      const n = cell(u, v, 10, 12, i + seed * 7);
      let c = mx(C('#efb23a', -0.42), C('#ffdc72', -0.42), 0.3 + 0.55 * topF + 0.15 * n);
      c = mx(c, C('#c27a26', -0.35), Math.max(end * 0.8, corner * 0.18, dark * 0.2));
      if (n > 0.94) c = mx(c, C('#cf8a2e', -0.35), 0.6);
      return c;
    }, { wv: true, cen: (u) => [0, 0, (u - 0.5) * 2 * L] });
    mb.pop();
  }
  return mb;
}
// Soğan halkası: kızarmış pane, gözenekli kabarık yüzey, açık ve koyu kırıntılar
function gOnionRing(mb, seed = 1, R0 = 0.42, r0 = 0.135) {
  const P = (u, v) => {
    const a = TAU * u, b = TAU * v;
    const n = pn(u * 3, v, seed) * 0.6 + pn(u * 5, v * 2, seed + 2) * 0.4;
    const r = r0 * (1 + 0.15 * n);
    const rr = R0 + Math.cos(b) * r;
    return [Math.cos(a) * rr, Math.sin(b) * r * 0.82, Math.sin(a) * rr];
  };
  surf(mb, 44, 12, P, (u, v) => {
    const n = pn(u * 3, v, seed + 4);
    const k = cell(u, v, 44, 12, seed);
    let c = mx(C('#c27f31', -0.38), C('#e6b058', -0.38), 0.5 + 0.5 * n);
    if (k > 0.86) c = mx(c, C('#f4d486', -0.3), 0.7);
    if (k < 0.08) c = mx(c, C('#93541b', -0.3), 0.6);
    return c;
  }, { wu: true, wv: true, cen: (u) => [Math.cos(TAU * u) * R0, 0, Math.sin(TAU * u) * R0] });
  return mb;
}
function gOnions(mb, seed = 1) {
  mb.push().T(-0.2, 0.0, 0.05, 0.3, 0.05, -0.04); gOnionRing(mb, seed, 0.42, 0.135); mb.pop();
  mb.push().T(0.38, 0.1, -0.22, 1.1, -0.18, 0.12, 0.82); gOnionRing(mb, seed + 5, 0.42, 0.135); mb.pop();
  return mb;
}
// Kıtır ekmek küpleri: yuvarlatılmış küp, kızarmış kenarlar, içi açık, arada kekik
function gCroutons(mb, seed = 1) {
  const Rr = SU.rng(seed * 19 + 1);
  const pos = [[0, 0], [0.3, 0.18], [-0.12, 0.33], [0.22, -0.2]];
  pos.forEach(([x, z], i) => {
    const s = 0.13 + Rr() * 0.05;
    mb.push().T(x, 0.06 + Rr() * 0.02, z, Rr() * TAU, (Rr() - 0.5) * 0.6, (Rr() - 0.5) * 0.6);
    mb.superS(0, 0, 0, s, s * 0.88, s * 1.1, 0.34, 0.34, null, 10, 8, (nx, ny, nz, px, py, pz) => {
      const a = [Math.abs(px), Math.abs(py), Math.abs(pz)].sort((p, q) => q - p);
      const e = sst(0.55, 0.95, a[1]);
      const n = hs2(Math.floor((px + 1) * 3) + i * 9, Math.floor((py + 1) * 3) * 5 + Math.floor((pz + 1) * 3));
      let c = mx(C('#e9bc6a', -0.12), C('#d39945', -0.12), n);
      c = mx(c, C('#985619', -0.22), e * 0.85);
      if (n > 0.9) c = mx(c, C('#3e6e25', -0.2), 0.75);
      return c;
    });
    mb.pop();
  });
  return mb;
}

/* ---------- küçük süsler ---------- */
// Zeytin: biber dolgulu yeşil zeytin + iki siyah zeytin halkası
function gOlives(mb, seed = 1) {
  mb.push().T(0, 0.06, 0, 0.6 + seed);
  mb.sphereS(0, 0, 0, 0.26, 0.22, 0.33, null, 18, 12, (ux, uy, uz) => mx(C('#5f7a23', -0.92), C('#86a03c', -0.92), hs2(Math.floor((ux + 1) * 4), Math.floor((uz + 1) * 5) + Math.floor((uy + 1) * 3) * 7) * 0.45 + Math.max(0, uy) * 0.25));
  mb.sphereS(0, 0.01, 0.305, 0.1, 0.085, 0.06, C('#d32a18', -0.85), 10, 6);
  mb.pop();
  for (const [x, z, s] of [[0.42, 0.22, 1], [0.1, -0.42, 0.9]]) {
    mb.push().T(x, 0.01, z, seed, 0.06, -0.04, s);
    mb.torusN(0, 0, 0, 0.17, 0.075, 0.05, 20, 8, null, (a, b) => {
      const cb = Math.cos(b);
      if (cb > 0.35) return C('#151115', -0.95);
      if (cb < -0.35) return C('#5b4652', -0.6);
      return C('#43323b', -0.55);
    });
    mb.pop();
  }
  return mb;
}
// Fesleğen dalı: kaşık gibi kıvrık, ortası açık damarlı parlak yapraklar
function gBasil(mb, seed = 1) {
  const Rr = SU.rng(seed * 17 + 3);
  const n = 5;
  const g1 = C('#23742a', -0.6), g2 = C('#3c9a38', -0.6), vein = C('#88d06c', -0.5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Rr() * 0.6;
    const Ll = (i === 0 ? 0.8 : 0.55 + Rr() * 0.22), W = Ll * 0.55;
    const curl = 0.12 + Rr() * 0.08;
    mb.push().T(Math.cos(a) * 0.04, 0.02 + i * 0.012, Math.sin(a) * 0.04, Math.PI / 2 - a, -0.08);
    surf(mb, 9, 8, (u, v) => {
      const s = 2 * v - 1;
      const hw = W * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85);
      const y = 0.06 * Math.sin(Math.PI * u) + curl * s * s * (hw / (W * 0.5)) * 0.55 - 0.05 * u * u * u;
      return [s * hw, y, u * Ll];
    }, (u, v) => {
      const s = Math.abs(2 * v - 1);
      let c = mx(g2, g1, s * 0.55 + u * 0.25);
      if (s < 0.1) c = mx(c, vein, 0.75 * (1 - u * 0.6));
      return c;
    }, { up: true });
    mb.pop();
  }
  mb.sphereS(0, 0.03, 0, 0.05, 0.03, 0.05, C('#2f6a1f', -0.4), 8, 4);
  return mb;
}
// Sucuk/pepperoni dilimi: kenarları kalkık, yumuşak alacalı kırmızı, üstünde kabarık yağ benekleri, koyu kenar
function gPepperoni(mb, seed = 1) {
  const Rr = SU.rng(seed * 23 + 9);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Rr();
    const d = i === 0 ? 0 : 0.36 + Rr() * 0.08;
    mb.push().T(Math.cos(a) * d, i * 0.03, Math.sin(a) * d, Rr() * TAU, (Rr() - 0.5) * 0.12, (Rr() - 0.5) * 0.12);
    const sd = seed * 7 + i;
    const top = (u) => 0.035 + 0.05 * u * u - Math.max(0, u - 0.9) * 0.3;
    slice(mb, 0.4, [0, 0.2, 0.36, 0.52, 0.68, 0.8, 0.88, 0.94, 1], 28, top, (u, v) => {
      let c = mx(C('#9e2318', -0.6), C('#bd3426', -0.6), 0.5 + 0.35 * pn(v, u * 0.5, sd));
      if (u > 0.86) c = mx(c, C('#6a130d', -0.5), (u - 0.86) / 0.14);
      return c;
    }, (v) => 1 + 0.02 * Math.sin(TAU * v * 5), -0.06, () => C('#6e1610', -0.5));
    for (let k = 0; k < 10; k++) {
      const aa = Rr() * TAU, rr = 0.06 + Math.sqrt(Rr()) * 0.27, sz = 0.025 + Rr() * 0.025;
      mb.sphereS(Math.cos(aa) * rr, top(rr / 0.4) + 0.002, Math.sin(aa) * rr, sz * 1.3, 0.008, sz, C(k % 3 ? '#f1b49c' : '#f7cdb8', -0.55), 7, 3);
    }
    mb.pop();
  }
  return mb;
}
// Acı biber: kavisli, ucuna doğru incelen parlak kırmızı gövde, yeşil çanak ve sap
function gChili(mb, seed = 1) {
  const bend = 1.1 + hs2(seed, 2) * 0.4;
  const curve = (u) => { const g = u * bend; return [Math.sin(g) * 0.9 - 0.45, 0.02, (1 - Math.cos(g)) * 0.9 - 0.22]; };
  const rad = (u) => 0.13 * Math.pow(Math.min(1, u * 9), 0.45) * Math.pow(1 - u, 0.55) + 0.004;
  const frame = (u) => {
    const a = curve(Math.max(0, u - 0.002)), b = curve(Math.min(1, u + 0.002));
    let tx = b[0] - a[0], tz = b[2] - a[2]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    return [-tz, tx];
  };
  surf(mb, 24, 12, (u, v) => {
    const c = curve(u), [nx, nz] = frame(u), a = TAU * v;
    const r = rad(u) * (1 + 0.04 * Math.sin(a * 3 + u * 9));
    return [c[0] + nx * Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.92, c[2] + nz * Math.cos(a) * r];
  }, (u, v) => {
    const t = Math.max(0, Math.sin(TAU * v));
    return mx(C('#a8120a', -0.95), C('#e8281a', -0.95), 0.35 + 0.65 * t);
  }, { wv: true, cen: (u) => curve(u) });
  const c0 = curve(0), c1 = curve(0.04);
  const dx = c0[0] - c1[0], dz = c0[2] - c1[2];
  const ry = Math.atan2(dx, dz);
  mb.push().T(c0[0], c0[1], c0[2], ry);
  const G = C('#3d7a22', -0.6), G2 = C('#5c9a33', -0.6);
  mb.sphereS(0, 0, -0.01, 0.12, 0.11, 0.05, G, 12, 6);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    mb.push().T(Math.cos(a) * 0.075, Math.sin(a) * 0.07, -0.04, 0, 0, a);
    mb.sphereS(0, 0, 0, 0.07, 0.03, 0.06, G2, 6, 3);
    mb.pop();
  }
  surf(mb, 6, 6, (u, v) => {
    const a = TAU * v, r = 0.028 * (1 - 0.3 * u);
    return [Math.cos(a) * r, Math.sin(a) * r + 0.1 * u * u, 0.02 + u * 0.2];
  }, () => G, { wv: true, cen: (u) => [0, 0.1 * u * u, 0.02 + u * 0.2] });
  mb.pop();
  return mb;
}
// Limon dilimi: sarı kabuk, beyaz zar, dokuz sulu dilim
function gLemon(mb, seed = 1, R = 0.62) {
  const S = 9, off = hs2(seed, 4) * 0.1;
  const tt = (v) => ((((v - off) * S) % 1) + 1) % 1, mm = (v) => Math.min(tt(v), 1 - tt(v));
  const top = (u, v) => 0.06 - 0.014 * sst(0.03, 0.09, mm(v)) * sst(0.12, 0.2, u) * (1 - sst(0.82, 0.87, u)) - Math.max(0, u - 0.93) * 0.45;
  const col = (u, v) => {
    if (u > 0.955) return mx(C('#ffd20a', -0.5), C('#eeb800', -0.5), sst(0.955, 1, u));
    if (u > 0.87) return C('#fbf5d6', -0.25);
    if (u < 0.11) return C('#faf4d4', -0.3);
    const mem = 1 - sst(0.02, 0.07, mm(v));
    const ves = 0.5 + 0.5 * Math.sin(u * 47 + TAU * v * S * 3);
    return mx(mx(C('#f8d81c', -0.6), C('#ffeb6a', -0.6), ves * 0.6 + u * 0.2), C('#fcf6dc', -0.3), mem);
  };
  slice(mb, R, [0, 0.07, 0.11, 0.18, 0.36, 0.56, 0.74, 0.82, 0.87, 0.91, 0.955, 0.985, 1], vsPer(S, [0, 0.06, 0.25, 0.5, 0.75, 0.94], off), top, col, null, -0.07, () => C('#f2c200', -0.5));
  return mb;
}
// Mozzarella topları: parlak beyaz, hafif basık, yarısı sosta
function gMozz(mb, seed = 1) {
  const Rr = SU.rng(seed * 29 + 2);
  [[0, 0, 0.17], [0.33, 0.12, 0.14], [-0.08, 0.34, 0.15], [0.28, -0.24, 0.12]].forEach(([x, z, r], i) => {
    mb.sphereS(x, 0.025 + r * 0.25, z, r, r * 0.86, r, null, 16, 10, (ux, uy, uz) => mx(C('#ece6d6', -0.75), C('#fffdf6', -0.75), 0.45 + 0.55 * Math.max(0, uy) + 0.05 * hs2(i, Math.floor((ux + 1) * 3))));
    void Rr;
  });
  return mb;
}
// Kaşar küpleri
function gCheese(mb, seed = 1) {
  const Rr = SU.rng(seed * 37 + 5);
  [[0, 0], [0.3, 0.15], [-0.05, 0.32]].forEach(([x, z], i) => {
    const s = 0.14 + Rr() * 0.03;
    mb.push().T(x, 0.07, z, Rr() * TAU, (Rr() - 0.5) * 0.4, (Rr() - 0.5) * 0.4);
    mb.superS(0, 0, 0, s, s, s, 0.3, 0.3, null, 10, 8, (nx, ny, nz, px, py, pz) => mx(C('#f7b52a', -0.55), C('#ffd257', -0.55), 0.35 + 0.4 * Math.max(0, ny) + 0.25 * hs2(Math.floor((px + 1) * 3) + i, Math.floor((pz + 1) * 3))));
    mb.pop();
  });
  return mb;
}

/* ---------- işletme yemekleri (sosta yüzen büyük parçalar) ---------- */
// Burger: yarısı sosa batmış alt ekmek, kıvırcık marul, domates, ızgara köfte, akan cheddar, susamlı parlak üst ekmek
function gBurger(mb, seed = 1) {
  const crust = C('#bf7a36', -0.45), crust2 = C('#d79446', -0.5), crumb = C('#f0d6a0', -0.1);
  mb.lathe(0, -0.2, 0, [[0, 0], [0.6, 0], [0.79, 0.05], [0.87, 0.16], [0.87, 0.24], [0.83, 0.3], [0, 0.3]], 30, (i) => (i >= 5 ? crumb : i >= 3 ? crust2 : crust));
  // marul: dalgalı, kenarı sarkan
  const Wf = 11;
  surf(mb, [0.55, 0.75, 0.87, 0.94, 1], 66, (u, v) => {
    const a = TAU * v, e = 1 + 0.07 * Math.sin(a * Wf) + 0.04 * Math.sin(a * 17 + 1.3);
    const r = 1.06 * u * e, fr = u * u * u;
    const y = 0.12 + 0.06 * Math.sin(a * Wf + 0.6) * fr - 0.11 * Math.pow(Math.max(0, u - 0.8) / 0.2, 2);
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  }, (u, v) => {
    const k = 0.5 + 0.5 * Math.sin(TAU * v * Wf + 0.6);
    let c = mx(C('#4aa22f', -0.45), C('#92d65c', -0.45), u * 0.55 + k * 0.3);
    if (u > 0.92) c = mx(c, C('#bfe882', -0.4), 0.4);
    return c;
  }, { wv: true, up: true });
  for (const [x, z] of [[0.42, 0.33], [-0.45, -0.27]]) mb.lathe(x, 0.115, z, [[0, 0], [0.5, 0], [0.52, 0.02], [0.5, 0.045], [0, 0.045]], 20, (i) => (i >= 3 ? C('#f25c3c', -0.75) : C('#cc2716', -0.85)));
  // köfte: yanık izli, yağlı, kenarı pürüzlü
  const PT = [[0, 0.16], [0.66, 0.16], [0.84, 0.18], [0.91, 0.23], [0.925, 0.28], [0.895, 0.34], [0.8, 0.375], [0.5, 0.385], [0, 0.39]];
  surf(mb, 12, 40, (u, v) => {
    const [r, y] = polyAt(PT, u), a = TAU * v;
    const n = pn(v * 3, u, seed) * 0.6 + pn(v * 7, u * 2, seed + 1) * 0.4;
    const rr = r * (1 + 0.028 * n * sst(0.4, 0.8, r));
    return [Math.cos(a) * rr, y + 0.008 * n, Math.sin(a) * rr];
  }, (u, v) => {
    const n = cell(v, u, 40, 12, seed);
    let c = mx(C('#4a2410', -0.45), C('#74401f', -0.45), 0.5 + 0.5 * pn(v * 4, u, seed + 3));
    if (n > 0.85) c = mx(c, C('#25120a', -0.4), 0.7);
    if (n < 0.08) c = mx(c, C('#8f5228', -0.4), 0.6);
    return c;
  }, { wv: true, cen: [0, 0.27, 0] });
  // cheddar: köşeleri köftenin üstünden sarkan kare dilim
  const ch = C('#ffbb1a', -0.8), ch2 = C('#f39a0c', -0.8);
  surf(mb, 14, 14, (u, v) => {
    const sx = (u - 0.5) * 1.64, sz = (v - 0.5) * 1.64;
    const x = (sx - sz) * Math.SQRT1_2, z = (sx + sz) * Math.SQRT1_2;
    const d = Math.hypot(x, z), o = Math.max(0, d - 0.8);
    return [x, 0.398 - 2.2 * o * o - 0.3 * o, z];
  }, (u, v) => mx(ch, ch2, sst(0.85, 1.12, Math.hypot((u - 0.5) * 1.64, (v - 0.5) * 1.64))), { up: true });
  // susamlı üst ekmek
  const BT = [[0, 0], [0.78, 0], [0.84, 0.04], [0.86, 0.1], [0.82, 0.2], [0.71, 0.33], [0.52, 0.44], [0.28, 0.5], [0, 0.52]];
  mb.lathe(0, 0.41, 0, BT, 34, (i) => (i <= 1 ? crumb : i === 2 ? C('#e7b46c', -0.45) : i === 3 ? C('#d9974a', -0.6) : mx(C('#c9843a', -0.65), C('#ab6327', -0.65), (i - 4) / 4)));
  const bunY = (r) => { for (let i = 1; i < BT.length - 1; i++) { const p = BT[BT.length - i], q = BT[BT.length - i - 1]; if (r <= q[0]) { const k = (r - p[0]) / (q[0] - p[0] || 1); return 0.41 + p[1] + (q[1] - p[1]) * k; } } return 0.41; };
  for (let k = 0; k < 30; k++) {
    const a = k * 2.39996 + seed, rr = 0.75 * Math.sqrt((k + 0.5) / 30);
    const y = bunY(rr), slope = Math.atan2(bunY(rr + 0.02) - y, 0.02);
    mb.push().T(Math.cos(a) * rr, y - 0.004, Math.sin(a) * rr, -a + (hs2(k, 1) - 0.5) * 1.2, 0, slope);
    mb.sphereS(0, 0, 0, 0.045, 0.014, 0.026, C('#fbf0cf', -0.35), 5, 3);
    mb.pop();
  }
  return mb;
}
// Çıtır tavuk budu: pürüzlü, kıtır kaplama (tepeler açık, oyuklar koyu) ve fildişi kemik
function gDrum(mb, seed = 1) {
  const MP = [[-0.34, 0.075], [-0.2, 0.17], [0.0, 0.29], [0.22, 0.34], [0.42, 0.31], [0.56, 0.22], [0.63, 0.1], [0.65, 0.0]];
  surf(mb, 28, 18, (u, v) => {
    const [x, r] = polyAt(MP, u), a = TAU * v;
    const n = pn(v * 2, u * 3, seed) * 0.55 + pn(v * 5, u * 6, seed + 3) * 0.45;
    const rr = r * (1 + 0.1 * n * sst(0.0, 0.15, u));
    return [x, Math.sin(a) * rr * 0.9, Math.cos(a) * rr];
  }, (u, v) => {
    const n = pn(v * 2, u * 3, seed) * 0.55 + pn(v * 5, u * 6, seed + 3) * 0.45;
    const k = cell(u, v, 28, 18, seed);
    let c = mx(C('#9b5418', -0.42), C('#e6a84e', -0.42), 0.5 + 0.5 * n);
    if (k > 0.88) c = mx(c, C('#f3cf7e', -0.35), 0.6);
    return c;
  }, { wv: true, cen: (u) => [polyAt(MP, u)[0], 0, 0] });
  const BP = [[-0.3, 0.06], [-0.4, 0.05], [-0.62, 0.048], [-0.72, 0.062], [-0.79, 0.082], [-0.84, 0.07], [-0.86, 0.0]];
  surf(mb, 10, 10, (u, v) => { const [x, r] = polyAt(BP, u), a = TAU * v; return [x, Math.sin(a) * r * (1 + 0.25 * sst(0.7, 0.9, u) * Math.cos(2 * a)), Math.cos(a) * r]; },
    (u) => mx(C('#e9dcc0', -0.25), C('#f7f0e2', -0.25), sst(0.1, 0.5, u)), { wv: true, cen: (u) => [polyAt(BP, u)[0], 0, 0] });
  return mb;
}
// Dürüm: ızgara izli lavaş rulo, yarısı işletme renginde kâğıda sarılı, açık ucunda iç malzeme
function gWrap(mb, seed = 1, paperHex = '#ffd23f') {
  const R = 0.3, x0 = -0.62, x1 = 0.62;
  surf(mb, 16, 22, (u, v) => {
    const a = TAU * v, x = x0 + (x1 - x0) * u;
    const r = R * (1 + 0.03 * Math.sin(TAU * v * 5 + u * 8)) * (u > 0.94 ? 1 - (u - 0.94) * 0.8 : 1);
    return [x, Math.sin(a) * r * 0.9, Math.cos(a) * r];
  }, (u, v) => {
    const x = x0 + (x1 - x0) * u;
    const g = Math.abs(((x * 4 + v * 2.2) % 1 + 1) % 1 - 0.5) < 0.09;
    const k = cell(u, v, 16, 22, seed);
    let c = mx(C('#e6c27c', -0.18), C('#f4dfa8', -0.18), k * 0.5 + 0.3 * Math.max(0, Math.sin(TAU * v)));
    if (g) c = mx(c, C('#9a5e2a', -0.2), 0.7);
    if (k > 0.9) c = mx(c, C('#b47a3a', -0.2), 0.5);
    return c;
  }, { wv: true, cen: (u) => [x0 + (x1 - x0) * u, 0, 0] });
  // açık uç: malzeme diski (et, domates, marul, soğan, sos)
  mb.push().T(x1 - 0.03, 0, 0, Math.PI / 2);
  const FC = [C('#7a3a1a', -0.4), C('#8c4a22', -0.4), C('#d7301c', -0.8), C('#58a832', -0.5), C('#f1ece0', -0.6), C('#9a4c86', -0.5)];
  surf(mb, [0, 0.3, 0.55, 0.75, 0.88, 1], 24, (u, v) => {
    const a = TAU * v, r = R * 0.98 * u;
    const bump = u < 0.85 ? 0.025 * cell(u, v, 5, 12, seed) : 0;
    return [Math.cos(a) * r, Math.sin(a) * r * 0.9, -0.03 + bump + (u > 0.88 ? (u - 0.88) * 0.25 : 0)];
  }, (u, v) => (u > 0.86 ? C('#efdcaa', -0.15) : FC[Math.floor(cell(u, v, 4, 9, seed + 2) * FC.length) % FC.length]), { cen: [0, 0, -0.2] });
  mb.pop();
  // kâğıt sargı: zikzak kenarlı, kapalı arka uç
  const pc = C(paperHex, -0.3), pw = C('#ffffff', -0.3);
  surf(mb, [0, 0.42, 0.44, 0.58, 0.6, 1], 24, (u, v) => {
    const a = TAU * v, xe = 0.02 + 0.06 * Math.abs(Math.sin(TAU * v * 4));
    const x = x0 - 0.02 + (xe - x0 + 0.02) * u;
    return [x, Math.sin(a) * (R + 0.018) * 0.9, Math.cos(a) * (R + 0.018)];
  }, (u) => (u > 0.42 && u < 0.6 ? pw : pc), { wv: true, cen: (u) => [x0 + (0.02 - x0) * u, 0, 0] });
  mb.push().T(x0 - 0.02, 0, 0, -Math.PI / 2);
  surf(mb, 2, 24, (u, v) => { const a = TAU * v, r = (R + 0.018) * u; return [Math.cos(a) * r, Math.sin(a) * r * 0.9, 0.0]; }, () => pc, { cen: [0, 0, -0.3] });
  mb.pop();
  return mb;
}
// Pilav kasesi: yüzen beyaz seramik kase (işletme renginde şerit), tane tane pilav kubbesi, çıtır tavuk, yeşil soğan, susam
function gRiceBowl(mb, seed = 1, bandHex = '#d33a2c') {
  const W = C('#f8f6f0', -0.85), band = C(bandHex, -0.7);
  mb.lathe(0, -0.28, 0, [[0, 0], [0.26, 0], [0.3, 0.03], [0.5, 0.25], [0.6, 0.4], [0.64, 0.46], [0.64, 0.46], [0.6, 0.48], [0.56, 0.44]], 32, (i) => (i === 4 ? band : W));
  mb.sphereS(0, 0.1, 0, 0.56, 0.33, 0.56, null, 30, 14, (ux, uy, uz) => {
    const k = hs2(Math.floor((ux + 1) * 22), Math.floor((uz + 1) * 22) + Math.floor((uy + 1) * 6) * 50);
    const g = 0.84 + 0.16 * k;
    return k < 0.12 ? [0.8, 0.74, 0.62, -0.15] : [g, g * 0.975, g * 0.91, -0.2];
  });
  const Rr = SU.rng(seed * 43 + 1);
  // tek tek pirinç taneleri (kubbenin yüzeyine yatık)
  for (let k = 0; k < 80; k++) {
    const a = k * 2.39996 + Rr() * 0.3, r = 0.53 * Math.sqrt((k + 0.5) / 80);
    const y = 0.1 + 0.33 * Math.sqrt(Math.max(0, 1 - (r / 0.56) ** 2));
    const sl = -Math.atan2(0.33 * (r / 0.56) / 0.56, Math.sqrt(Math.max(0.02, 1 - (r / 0.56) ** 2)));
    const g = 0.93 + Rr() * 0.07;
    mb.push().T(Math.cos(a) * r, y - 0.004, Math.sin(a) * r, -a, 0, sl * 0.9);
    mb.push().T(0, 0, 0, Rr() * TAU);
    mb.sphereS(0, 0, 0, 0.052, 0.016, 0.02, [g, g * 0.985, g * 0.94, -0.3], 6, 3);
    mb.pop(); mb.pop();
  }
  [[-0.14, 0.12, 0.4], [0.16, 0.08, 1.3], [0.02, -0.18, 2.2], [0.2, -0.12, 0.9]].forEach(([x, z, r]) => {
    mb.push().T(x, 0.38, z, r, 0.2, 0.1);
    mb.superS(0, 0, 0, 0.13, 0.08, 0.1, 0.5, 0.5, null, 10, 6, (nx, ny, nz, px, py, pz) => mx(C('#b8681f', -0.35), C('#e7a44c', -0.35), 0.5 + 0.5 * Math.sin(px * 9 + pz * 7 + r) * Math.max(0.2, ny)));
    mb.pop();
  });
  for (let k = 0; k < 6; k++) {
    const a = Rr() * TAU, r = 0.1 + Rr() * 0.32;
    mb.torusN(Math.cos(a) * r, 0.1 + 0.33 * Math.sqrt(Math.max(0, 1 - (r / 0.56) ** 2)) + 0.012, Math.sin(a) * r, 0.04, 0.014, 0.012, 10, 4, C('#5cbf45', -0.4));
  }
  for (let k = 0; k < 10; k++) {
    const a = Rr() * TAU, r = Rr() * 0.4;
    mb.push().T(Math.cos(a) * r, 0.1 + 0.33 * Math.sqrt(Math.max(0, 1 - (r / 0.56) ** 2)) + 0.006, Math.sin(a) * r, Rr() * TAU);
    mb.sphereS(0, 0, 0, 0.03, 0.01, 0.018, C('#fbf1d2', -0.3), 5, 3);
    mb.pop();
  }
  return mb;
}

// Garnitür türleri: kur(mb, seed) ve sosdaki kapladığı yarıçap (birim)
const GARN = {
  tomato: { fn: gTomato, fp: 0.82, s: [1.05, 1.35], v: 2 },
  pickles: { fn: gPickles, fp: 0.95, s: [1.0, 1.2], v: 2 },
  gherkin: { fn: gGherkin, fp: 1.0, s: [0.95, 1.15], v: 1, y: 0.06 },
  fries: { fn: gFries, fp: 0.8, s: [1.0, 1.25], v: 2 },
  onions: { fn: gOnions, fp: 0.9, s: [1.0, 1.2], v: 1 },
  croutons: { fn: gCroutons, fp: 0.55, s: [1.0, 1.3], v: 1 },
  olives: { fn: gOlives, fp: 0.62, s: [1.0, 1.3], v: 1 },
  basil: { fn: gBasil, fp: 0.75, s: [1.0, 1.35], v: 2 },
  pepperoni: { fn: gPepperoni, fp: 0.75, s: [1.0, 1.2], v: 1 },
  chili: { fn: gChili, fp: 0.75, s: [1.0, 1.25], v: 1 },
  lemon: { fn: gLemon, fp: 0.64, s: [1.0, 1.3], v: 1 },
  mozz: { fn: gMozz, fp: 0.55, s: [1.0, 1.3], v: 1 },
  cheese: { fn: gCheese, fp: 0.5, s: [1.0, 1.25], v: 1 },
};
// Sos türüne göre ağırlıklar: 0 domates çorbası, 1 koyu sos, 2 pesto
const GARN_W = [
  { tomato: 3, pickles: 2, gherkin: 1, fries: 2, onions: 1, croutons: 2, olives: 1, basil: 3, pepperoni: 2, chili: 1 },
  { tomato: 1, pickles: 3, gherkin: 2, fries: 3, onions: 3, croutons: 1, olives: 1, basil: 1, chili: 2, cheese: 2 },
  { tomato: 2, pickles: 1, gherkin: 1, croutons: 2, olives: 3, basil: 4, chili: 1, lemon: 2, mozz: 3, cheese: 1 },
];
const HERO = { burger: { fp: 1.0, y: 0.0 }, drum: { fp: 0.95, y: 0.1 }, wrap: { fp: 0.75, y: 0.08 }, rice: { fp: 0.68, y: 0.05 } };

// Sos yüzeyi serpintileri (gölle birlikte döner): kuru yeşillik, karabiber, yağ damlaları, krema girdapları
function sprinkleModel(mb, variant, seed, rIn, rOut, H) {
  const Rr = SU.rng(seed * 5 + 77);
  const pal = LAKE_PAL[variant % 3].map(hexRGB);
  const UP = [0, 1, 0];
  const pt = (r0, r1) => { const a = Rr() * TAU, r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * Rr()); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const flake = (x, z, s, col) => {
    const rot = Rr() * TAU, y = H(x, z) + 0.014;
    const p = [0, 1, 2, 3].map((i) => { const a = rot + i * Math.PI / 2 + (Rr() - 0.5) * 0.5, k = s * (0.6 + Rr() * 0.6); return [x + Math.cos(a) * k, y, z + Math.sin(a) * k]; });
    mb.quadN(p[0], p[1], p[2], p[3], UP, UP, UP, UP, col);
  };
  const herb = [C('#2d6a22', -0.3), C('#3f8a2a', -0.3), C('#55702a', -0.3)];
  for (let i = 0; i < 170; i++) { const [x, z] = pt(2.0, rOut); flake(x, z, 0.05 + Rr() * 0.06, herb[i % 3]); }
  const pep = C('#1c1410', -0.2);
  for (let i = 0; i < 110; i++) { const [x, z] = pt(2.0, rOut); flake(x, z, 0.028 + Rr() * 0.03, pep); }
  if (variant % 3 === 2) { const pm = C('#f1e6b8', -0.2); for (let i = 0; i < 70; i++) { const [x, z] = pt(2.0, rOut); flake(x, z, 0.04 + Rr() * 0.05, pm); } }
  // yağ damlaları: hafif kubbeli, çok parlak
  const oil = mx(C([...pal[2]], -0.95), C(variant % 3 === 2 ? '#e6e070' : '#ffb35a', -0.95), 0.5);
  for (let i = 0; i < 46; i++) {
    const [x, z] = pt(rIn - 0.5, rOut), r = 0.07 + Rr() * Rr() * 0.22, y = H(x, z) + 0.016;
    const c0 = mx(oil, C('#fff2c8', -0.95), 0.25);
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * TAU, a1 = ((k + 1) / 10) * TAU;
      mb.triN([x, y + r * 0.12, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], UP, [Math.cos(a0) * 0.4, 1, Math.sin(a0) * 0.4], [Math.cos(a1) * 0.4, 1, Math.sin(a1) * 0.4], c0, oil, oil);
    }
  }
  // krema girdapları (domates ve koyu sosta): bir buçuk tur dönen, uçlara doğru incelen kıvrım; kenarları sosa karışır
  if (variant % 3 !== 2) {
    const cream = variant % 3 === 0 ? C('#f8eee0', -0.6) : C('#efdcc0', -0.6);
    const sauce = C([...pal[1]], -0.7);
    const ce = mx(cream, sauce, 0.72), cm = mx(cream, sauce, 0.18);
    for (let q = 0; q < 3; q++) {
      const [cx, cz] = pt(rIn + 0.8, rOut - 1.0);
      const turns = 1.0 + Rr() * 0.45, R1 = 0.9 + Rr() * 0.5, ph = Rr() * TAU, dir = Rr() < 0.5 ? 1 : -1;
      const P = (t) => { const a = ph + dir * t * turns * TAU, r = 0.12 + R1 * t; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
      const n = 56;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const A0 = P(t0), A1 = P(t1), A2 = P(Math.min(1, t1 + 0.5 / n)), Am = P(Math.max(0, t0 - 0.5 / n));
        const wid = (t) => 0.06 + 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7);
        const nrm = (B, Cc, t) => { const dx = Cc[0] - B[0], dz = Cc[1] - B[1], l = Math.hypot(dx, dz) || 1, w = wid(t); return [-dz / l * w, dx / l * w]; };
        const s0 = nrm(Am, A1, t0), s1 = nrm(A0, A2, t1);
        const V = (Pp, o, sgn, lift) => { const x = Pp[0] + o[0] * sgn, z = Pp[1] + o[1] * sgn; return [x, H(x, z) + lift, z]; };
        const L0 = V(A0, s0, 1, 0.012), R0 = V(A0, s0, -1, 0.012), L1 = V(A1, s1, 1, 0.012), R1v = V(A1, s1, -1, 0.012);
        const M0 = V(A0, s0, 0, 0.024), M1 = V(A1, s1, 0, 0.024);
        mb.quadN(L0, M0, M1, L1, UP, UP, UP, UP, ce, cm, cm, ce);
        mb.quadN(M0, R0, R1v, M1, UP, UP, UP, UP, cm, ce, ce, cm);
      }
    }
  }
  return mb;
}

// Bumper: cam tuzluk + krom kapak
function bumperModel(mb, accent) {
  mb.lathe(0, 0, 0, [[0, 0], [0.74, 0], [0.82, 0.06], [0.84, 0.3], [0.78, 0.8], [0.74, 0.98], [0, 0.98]], 24, (i) => (i <= 1 ? C('#cfe0ef', -0.85) : C('#e8f2ff', -0.9)));
  mb.lathe(0, 0.36, 0, [[0.845, 0], [0.86, 0.02], [0.86, 0.13], [0.845, 0.15]], 24, C(accent, 0.5));
  mb.lathe(0, 0.96, 0, [[0.76, 0], [0.78, 0.04], [0.76, 0.2], [0.6, 0.36], [0.3, 0.44], [0, 0.46]], 24, C('#c8ccd2', -0.9));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mb.sphereS(Math.cos(a) * 0.22, 1.39, Math.sin(a) * 0.22, 0.04, 0.012, 0.04, C('#3a3d44', -0.3), 6, 3); }
}

// Oyuncu rengi halka (yerde, karakterin altında): ortası dolu, kenarları yumuşak ('un', birim yarıçap ≈ 0.8)
function ringMarkModel(mb) {
  const N = 40, r0 = 0.6, r1 = 0.7, r2 = 0.8;
  const v = (a, r, al) => mb.d.push(Math.cos(a) * r, 0, Math.sin(a) * r, 1, 1, 1, al);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    v(a0, r0, 0); v(a1, r0, 0); v(a1, r1, 1); v(a0, r0, 0); v(a1, r1, 1); v(a0, r1, 1);
    v(a0, r1, 1); v(a1, r1, 1); v(a1, r2, 0); v(a0, r1, 1); v(a1, r2, 0); v(a0, r2, 0);
  }
}
// Yön oku (yerde, karakterin önünde): uç +Z'de, birim boy ('un')
function chevronModel(mb) {
  const W = [1, 1, 1, 1], E = [1, 1, 1, 0.15];
  const v = (p, c) => mb.d.push(p[0], 0, p[1], c[0], c[1], c[2], c[3]);
  const tip = [0, 0.62], l = [-0.42, 0.04], r = [0.42, 0.04], n = [0, 0.24];
  v(tip, W); v(l, E); v(n, W);
  v(tip, W); v(n, W); v(r, E);
}

// "Sen" oku: aşağı bakan, parlayan koni
function arrowModel(mb) {
  mb.cyl(0, 0, 0, 0.0001, 0.42, 0.34, 6, C('#ffffff', 1), C('#ffffff', 1), 't');
  mb.box(-0.1, 0.4, -0.1, 0.1, 0.78, 0.1, C('#ffffff', 1));
}

// Spot ışığı havuzu / gölge için yuvarlak un disk (tek tek)
function simpleDisc(mb, r, seg, cIn, cOut) { mb.disc(0, 0, 0, r, r, seg, cIn, cOut); }

/* ============================ ses ============================ */

const mtofS = (m) => 440 * 2 ** ((m - 69) / 12);

class SumoSnd extends Snd {
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'hit': {
        const v = clamp(a / 13, 0.15, 1);
        this.tone(135, t, 0.15, 'sine', 0.55 * v, 46, 0.002);
        this.noise(t, 0.09, 0.3 * v, { type: 'bandpass', freq: 950, q: 1.2 });
        if (v > 0.55) { this.tone(1700, t, 0.05, 'square', 0.05); this.noise(t + 0.02, 0.12, 0.18 * v, { type: 'highpass', freq: 2500 }); }
        break;
      }
      case 'dash':
        this.noise(t, 0.28, 0.22, { type: 'bandpass', freq: 450, to: 3000, q: 1, attack: 0.04 }, a);
        this.tone(280, t, 0.22, 'triangle', 0.13, 760, 0.01, a);
        break;
      case 'bump':
        this.tone(250, t, 0.32, 'sine', 0.32, 760, 0.004);
        this.tone(1250, t + 0.05, 0.12, 'square', 0.06);
        this.tone(1650, t + 0.1, 0.1, 'sine', 0.06);
        break;
      case 'fall':
        this.tone(640, t, 0.95, 'triangle', 0.2, 85, 0.01, a);
        this.tone(320, t, 0.95, 'sine', 0.1, 55, 0.01, a);
        break;
      case 'splash':
        this.noise(t, 0.5, 0.45, { freq: 1900, to: 220, q: 0.6 }, a);
        this.tone(160, t, 0.3, 'sine', 0.4, 60, 0.004, a);
        for (let i = 0; i < 6; i++) this.tone(900 + Math.random() * 1700, t + 0.05 + Math.random() * 0.3, 0.05, 'sine', 0.05, null, 0.004, a);
        break;
      case 'warn':
        this.tone(880, t, 0.1, 'square', 0.11);
        this.tone(1320, t, 0.06, 'sine', 0.06);
        break;
      case 'crumble':
        this.duck(0.4, 1.1);
        this.noise(t, 0.9, 0.55, { freq: 1600, to: 110, q: 0.7 });
        this.tone(68, t, 0.8, 'sawtooth', 0.22, 32, 0.004);
        for (let i = 0; i < 7; i++) this.noise(t + 0.05 + Math.random() * 0.5, 0.06, 0.2, { type: 'bandpass', freq: 1800 + Math.random() * 2400, q: 2 });
        break;
      case 'ko':
        this.duck(0.5, 1.2);
        [[98, 2.4, 0.22], [149, 1.9, 0.14], [207, 1.5, 0.1], [268, 1.1, 0.07]].forEach(([f, d, v]) => this.tone(f, t, d, 'sine', v, f * 0.994, 0.012));
        [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.07, 0.2, 'triangle', 0.26));
        this.tone(1047, t + 0.22, 0.4, 'square', 0.07);
        this.cheer(t + 0.1, 1.1);
        break;
      case 'lose':
        this.duck(0.5, 1.2);
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, t + i * 0.16, 0.24, 'sawtooth', 0.1, f * 0.94));
        break;
      case 'tick': this.tone(1500, t, 0.03, 'square', 0.04); break;
      default: super._fx(name, a);
    }
  }
  tempo() { return this.mode === 'race' ? 98 + 18 * (this.int || 0) : this.mode === 'idle' ? 84 : 70; }
  // Sumo Tepsisi: taiko davulları (hirajoshi: Re–Mi–Fa–La–Si♭): ölçü başında büyük davul, kenar vuruşları, zilcikler,
  // şamisen motifi, şakuhaçi flüt ve gong; tepsi küçüldükçe davullar sıklaşır ve tempo artar
  beat(t, s, bar, spb, st = spb / 4) {
    const H = [62, 64, 65, 69, 70];
    const I = this.int || 0;
    const root = [50, 50, 46, 45][bar % 4];
    const RIFF = [0, null, 2, 3, 4, null, 3, 2, 0, null, 1, 2, 3, 2, 1, null];
    if (this.mode === 'race') {
      if (s === 0 || s === 8) this.iTaiko(t, 0.42, 58);
      if (s === 6 || s === 14 || (I > 0.55 && (s === 7 || s === 15))) this.iTaiko(t, 0.22, 84);
      if (I > 0.35 && (s === 3 || s === 11)) this.iTaiko(t, 0.15, 96);
      if (s === 4 || s === 12) this.iKa(t, 0.11);
      if (s % 2 === 1) this.iKa(t, 0.028 + 0.03 * I);
      if (s % 4 === 2) this.iTamb(t, 0.022);
      if (s % 4 === 0) this.iBass(t, root - 12, spb * 0.9, 0.12, 'saw', 600);
      if (bar % 8 >= 2 && bar % 8 < 6) { const k = RIFF[s]; if (k !== null) this.iSham(t, H[k] + (bar % 2 ? 0 : 12), 0.044); }
      if (bar % 8 >= 6 && (s === 0 || s === 8)) this.iFlute(t, H[(bar * 2 + (s >> 3)) % 5] + 12, spb * 1.8, 0.038);
      if (bar % 8 === 0 && s === 0) this.iGong(t, 0.12, 98);
    } else if (this.mode === 'idle') {
      if (s === 0) { this.iTaiko(t, 0.24, 60); this.iPad(t, [root, root + 7, root + 12], spb * 4, 0.015, 800); }
      if (s === 8) this.iTaiko(t, 0.13, 80);
      if (s % 4 === 2) this.iKa(t, 0.035);
      if (s === 0 || s === 10) this.iFlute(t, H[(bar * 3 + (s ? 2 : 0)) % 5] + 12, spb * 2, 0.034);
    } else {
      if (s === 0) { this.iKoto(t, H[bar % 5], 0.05); this.iPad(t, [root, root + 7], spb * 4, 0.013, 700); }
      if ([4, 6, 10].includes(s)) this.iKoto(t, H[(bar + s) % 5] + 12, 0.04, 1.2);
      if (bar % 4 === 0 && s === 0) this.iGong(t, 0.08, 110);
    }
  }
}

/* ============================ arayüz ============================ */

const STYLE2 = `
#ky .su-ko{white-space:nowrap;font-weight:800;font-size:17px;background:rgba(12,10,26,.55);border-radius:12px;padding:5px 9px;font-variant-numeric:tabular-nums}
#ky .su-rnd{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);font-weight:800;font-size:13px;background:rgba(12,10,26,.55);border:2px solid rgba(255,255,255,.35);border-radius:99px;padding:3px 11px;white-space:nowrap;pointer-events:none}
#ky .su-joy{position:absolute;left:0;top:0;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:99px;background:rgba(255,255,255,.14);border:3px solid rgba(255,255,255,.55);pointer-events:none;display:none}
#ky .su-joy i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:99px;background:rgba(255,255,255,.7);border:3px solid rgba(12,10,26,.6);box-shadow:0 3px 8px rgba(0,0,0,.35)}
#ky .su-hint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 26px);bottom:calc(env(safe-area-inset-bottom,0px) + 34px);width:116px;height:116px;border-radius:99px;border:3px dashed rgba(255,255,255,.4);pointer-events:none;display:grid;place-items:center;font-size:12px;font-weight:800;color:rgba(255,255,255,.7);letter-spacing:.04em;transition:opacity .3s}
#ky .su-hint.off,#ky .su-dash.off{opacity:0;pointer-events:none}
#ky .su-dash{position:absolute;right:calc(env(safe-area-inset-right,0px) + 22px);bottom:calc(env(safe-area-inset-bottom,0px) + 30px);width:104px;height:104px;border-radius:99px;border:4px solid rgba(255,255,255,.85);color:#fff;font-weight:800;font-size:15px;letter-spacing:.05em;display:grid;place-items:center;padding:0;line-height:1;background:conic-gradient(rgba(255,255,255,.6) calc(var(--p,1)*1turn),rgba(12,10,26,.5) 0);-webkit-tap-highlight-color:transparent;transition:opacity .3s,transform .1s}
#ky .su-dash span{display:block;font-size:36px;line-height:.95;text-shadow:0 2px 0 rgba(0,0,0,.35)}
#ky .su-dash.rdy{border-color:var(--lim);box-shadow:0 0 0 4px rgba(255,210,63,.35),0 0 24px rgba(255,210,63,.7);background:radial-gradient(circle,rgba(255,210,63,.55),rgba(255,120,40,.5))}
#ky .su-dash.on{transform:scale(.92)}
#ky.su .msg{top:19%}
#ky .su-feed{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 160px);display:grid;gap:4px;pointer-events:none;max-width:70%}
#ky .su-feed div{font-weight:700;font-size:13px;background:rgba(12,10,26,.62);border-radius:10px;padding:3px 9px;width:max-content;max-width:100%;animation:suf 4.2s ease-out forwards}
@keyframes suf{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
#ky .vig.warn{opacity:.9;box-shadow:inset 0 0 120px 40px rgba(255,50,30,.5);animation:suw .35s ease-in-out infinite alternate}
@keyframes suw{from{opacity:.25}to{opacity:.95}}
@media (orientation:landscape) and (max-height:520px){
#ky .su-rnd{top:calc(env(safe-area-inset-top,0px) + 12px);font-size:12px}
#ky .su-feed{top:calc(env(safe-area-inset-top,0px) + 50px)}
#ky.su .msg{top:15%}
#ky .su-dash{width:92px;height:92px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px)}
#ky .su-hint{bottom:calc(env(safe-area-inset-bottom,0px) + 22px);width:104px;height:104px}
}
@media (orientation:portrait) and (max-height:620px){#ky .su-dash{width:92px;height:92px}#ky .su-hint{width:100px;height:100px}}
`;

function injectStyle2() {
  if (document.getElementById('su-style')) return;
  const st = document.createElement('style');
  st.id = 'su-style';
  st.textContent = STYLE2;
  document.head.appendChild(st);
}

/* ============================ oyun ============================ */

const TOD_OF_ROUND = [0, 1, 2];
const H_STEP = 1 / 60;
const AV_S = 1.25;   // aşçıların ölçeği (tepsi ve çarpışma yarıçapına göre)
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

class Game {
  constructor(ctx) {
    injectStyle();
    injectStyle2();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.seed = null;
    this.n = 0;
    this.arena = null;
    this.V = SU.VARIANTS[0];
    this.snaps = [];
    this.bod = [];
    this.mine = null;
    this.my = -1;
    this.parts = [];
    this.ripples = [];
    this.bubbles = [];
    this.drops = [];
    this.pulse = [];
    this.time = 0;
    this.shake = 0;
    this.scale = 1;
    this.frameAvg = 16;
    this.slowFor = 0;
    this.fastFor = 0;
    this.cam = { D: 40, tx: 0, ty: 0, tz: 0, yaw: 0, ex: 0, ey: 20, ez: 20 };
    this.fov = 0.8;
    this.curR = 9;
    this.panelKey = '';
    this.lastBeep = 99;
    this.snd = new SumoSnd();
    this.mats = { a: M.make(), b: M.make(), c: M.make(), V: M.make(), P: M.make(), VP: M.make() };
    this.inp = { x: 0, y: 0, d: 0 };
    this.keys = new Set();
    this.joy = null;
    this.dashQ = false;
    this.buildDom();
    try { this.snd.amb('diner', 0.6); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd && this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[sumo] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); } catch (e) {
        console.warn('[sumo] kaynak', e);
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
    w.className = 'su';
    w.innerHTML = `
      <canvas aria-label="Sumo Tepsisi 3D sahnesi"></canvas>
      <div class="lbls"></div><div class="fx"></div><div class="vig"></div>
      <div class="hud">
        <div class="r1">
          <div class="pos"><b>–</b><small></small></div>
          <div class="su-ko">💥 0</div>
          <div class="sp"></div>
          <div class="tm">0:00</div>
          <button class="ib mu ${sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
          <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted() ? '🔇' : '🔊'}</button>
          <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
        </div>
      </div>
      <div class="su-rnd"></div>
      <div class="su-feed"></div>
      <div class="note"></div><div class="toastk"></div>
      <div class="su-hint off">SÜRÜKLE</div>
      <div class="su-joy"><i></i></div>
      <button class="su-dash off" aria-label="Atıl"><span>💨</span>ATIL</button>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = {
      wrap: w, cv: q('canvas'), lbls: q('.lbls'), fx: q('.fx'), vig: q('.vig'), posB: q('.pos b'), posS: q('.pos small'), pos: q('.pos'), ko: q('.su-ko'),
      tm: q('.tm'), ex: q('.ex'), note: q('.note'), msg: q('.msg'), panel: q('.panel'), hud: q('.hud'), toastk: q('.toastk'), rnd: q('.su-rnd'),
      feed: q('.su-feed'), hint: q('.su-hint'), joy: q('.su-joy'), knob: q('.su-joy i'), dash: q('.su-dash'),
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
    const dashBtn = this.el.dash;
    const press = () => {
      if (!this.canCtl() || this.simNow() < 0) return;
      this.dashQ = true;
      this.dashSend = true;
      vibrate(8);
      dashBtn.classList.add('on');
      setTimeout(() => dashBtn.classList.remove('on'), 110);
    };
    this.press = press;
    dashBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); press(); });
    this.onDown = (e) => {
      if (e.target.closest('.panel.on .card, button, a')) return;
      if (!this.canCtl()) return;
      const W = w.clientWidth || 1;
      if (e.clientX < W * 0.58) {
        if (this.joy) return;
        this.joy = { id: e.pointerId, bx: e.clientX, by: e.clientY, x: 0, y: 0 };
        this.el.joy.style.display = 'block';
        this.el.joy.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        this.el.knob.style.transform = 'translate(0px, 0px)';
        try { w.setPointerCapture(e.pointerId); } catch { /* yok say */ }
      } else press();
    };
    this.onMove = (e) => {
      const j = this.joy;
      if (!j || j.id !== e.pointerId) return;
      const R = 52;
      let dx = e.clientX - j.bx, dy = e.clientY - j.by;
      const len = Math.hypot(dx, dy);
      // taban parmağı çok uzaklaşırsa onu da sürükle (parmak hep tabanın yakınında kalır)
      if (len > R * 1.6) { const k = (len - R * 1.6) / len; j.bx += dx * k; j.by += dy * k; dx = e.clientX - j.bx; dy = e.clientY - j.by; this.el.joy.style.transform = `translate(${j.bx}px, ${j.by}px)`; }
      const l2 = Math.hypot(dx, dy);
      const m = l2 < 7 ? 0 : clamp((l2 - 4) / (R * 0.85), 0, 1);
      j.x = l2 ? (dx / l2) * m : 0;
      j.y = l2 ? (dy / l2) * m : 0;
      const kd = Math.min(l2, R);
      this.el.knob.style.transform = `translate(${l2 ? (dx / l2) * kd : 0}px, ${l2 ? (dy / l2) * kd : 0}px)`;
    };
    this.onUp = (e) => {
      if (this.joy && this.joy.id === e.pointerId) { this.joy = null; this.el.joy.style.display = 'none'; }
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
      if (k) { e.preventDefault(); this.keys.add(k); return; }
      if (e.key === ' ' || e.key === 'Shift' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); }
    };
    this.onKeyUp = (e) => { const k = KM[e.key]; if (k) this.keys.delete(k); };
    this.onBlur = () => this.keys.clear();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }
  canCtl() {
    const v = this.view;
    const m = this.mine;
    if (!v || !m || v.over || m.fall || !m.alive) return false;
    return v.phase === 'play' || (v.phase === 'ready' && this.simNow() > -3.2);
  }
  inputVec() {
    if (this.joy && this.joy.x * this.joy.x + this.joy.y * this.joy.y > 0) return [this.joy.x, this.joy.y];
    const k = this.keys;
    if (k.size) {
      const x = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0), y = (k.has('d') ? 1 : 0) - (k.has('u') ? 1 : 0);
      const l = Math.hypot(x, y) || 1;
      return [x / l, y / l];
    }
    return [0, 0];
  }
  simNow() {
    const v = this.view;
    return v && v.startAt ? (this.ctx.serverNow() - v.startAt) / 1000 : -99;
  }

  /* ---------- sunucudan gelen durum ---------- */
  emoAnchor(pid) {
    const i = this.emoIdx(pid), s = i >= 0 && this.bod ? this.bod[i] : null;
    if (!s || s.gone) return null;
    return this.emoProj(s.x, ((s.fl & 2) ? s.z : 0) + 3.15, s.y);
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
    if (root && root.dataset.su !== '1') {
      root.dataset.su = '1';
      root.innerHTML = '<p class="py-16 text-center">🤼</p>';
    }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    if (v.seed && (v.seed !== this.seed || v.n !== this.n || v.me !== this.my) && (v.phase === 'ready' || v.phase === 'play' || v.phase === 'result')) this.newRound(v);
    if (v.phase === 'play' && v.b) this.ingest(v);
    if (!prev || prev.phase !== v.phase || prev.round !== v.round || prev.seed !== v.seed) this.onPhase(prev, v);
    this.panel();
  }

  newRound(v) {
    const sameRound = v.seed === this.seed;
    this.seed = v.seed;
    this.n = v.n;
    this.my = v.me;
    this.round = v.round;
    this.variant = v.variant;
    this.V = SU.VARIANTS[v.variant % SU.VARIANTS.length];
    this.todI = TOD_OF_ROUND[(v.tod || 0) % 3];
    this.arena = SU.makeArena(v.n, v.variant, v.seed);
    if (!sameRound || !this.snaps) { this.snaps = []; this.evSeen = 0; this.firstIngest = true; }
    this.bod = [];
    for (let i = 0; i < v.n; i++) {
      const sp = SU.spawn(this.arena, i, v.n);
      this.bod.push({ x: sp.x, y: sp.y, vx: 0, vy: 0, ang: Math.atan2(sp.fy, sp.fx), fl: 0, cd: 0, ko: 0, z: 0, sq: 0, tum: 0, splashed: false, lbl: null, gone: false });
    }
    this.el.lbls.innerHTML = '';
    this.mine = v.me >= 0 ? SU.body(SU.spawn(this.arena, v.me, v.n)) : null;
    this.simT = 0;
    this.alive = v.n;
    this.myKo = 0;
    this.lastSend = 0;
    this.sx = 0; this.sy = 0;
    this.lastBeep = 99;
    this.warnK = -1;
    this.warnTick = 99;
    this.wasOver = false;
    this.over = false;          // önceki turun "bitti" bayrağı yeni turda yanlış kişiye taç göstermesin
    this.drops = [];
    this.pulse = [];
    this.ripples = [];
    this.bubbles = [];
    this.parts.length = 0;
    this.myOut = false;
    this.feedN = 0;
    this.el.feed.innerHTML = '';
    this.msg('');
    this.buildWorld();
    if (v.phase === 'play' || v.phase === 'result') {
      const t = this.simNow();
      this.arena.times.forEach((tk, k) => { if (t > tk + 1.6) this.drops[k] = { y: -9, vy: 0, rx: 0, rz: 0, done: true }; });
    }
  }

  // Yeni tur için tepsi/göl/süs ağları (oyun başına bir kez, tur başına yeniden)
  buildWorld() {
    const X = this.X;
    if (!X || this.lost) return;
    this.freeWorld();
    const A = this.arena;
    const W = { rings: [], decor: [], bumpers: [] };
    const mk = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
    const tc = TRAY_COLS[A.variant % 3].map((h) => C(h));
    const rim = shade(C(this.brand.accentHex), 0.92);
    const L = A.radii.length;
    for (let k = 0; k < L; k++) {
      const r1 = A.radii[k];
      const r0 = k === L - 1 ? 0 : A.radii[k + 1];
      const col = tc[k % 2];
      W.rings.push({ k, r0, r1, mesh: mk((mb) => ringPiece(mb, r0, r1, col, rim)), warn: k < L - 1 ? mk((mb) => warnRing(mb, r1), 'un') : null });
    }
    const BR = bowlRadius(A);
    W.lake = mk((mb) => lakeModel(mb, A.variant, A.seed, BR));
    // sos kabarcığı: parlak, üstü biraz açık kubbe (göl renginde)
    {
      const pal = LAKE_PAL[A.variant % 3].map(hexRGB);
      W.bub = mk((mb) => mb.sphereS(0, 0, 0, 1, 0.82, 1, null, 14, 8, (ux, uy) => { const k = 0.85 + 0.35 * Math.max(0, uy); return [Math.min(1, pal[1][0] * k), Math.min(1, pal[1][1] * k), Math.min(1, pal[1][2] * k), -0.92]; }));
    }
    W.bowl = mk((mb) => bowlModel(mb, BR, this.brand.slug === 'nfc' ? '#2f5ea8' : this.brand.accentHex));
    W.table = mk((mb) => KIT.woodTable(mb, 0, 0, 85, BOWL_Y), 'tex');
    // kâsenin çevresindeki sofra eşyaları (açı, kenardan uzaklık, ölçek)
    const rimR = BR + 2.1;
    W.props = [
      { k: 'napkin', a: 0.12, d: 4.2, s: 2.6, rot: 0.15 },
      { k: 'cutlery', a: 0.12, d: 4.2, s: 2.5, rot: 0.15, dy: 0.2 },
      { k: 'cup', a: -0.55, d: 3.3, s: 2.5, rot: 0 },
      { k: 'tent', a: -1.72, d: 2.7, s: 2.1, rot: 0 },
      { k: 'ketchup', a: -2.45, d: 2.4, s: 2.4, rot: 0.3 },
      { k: 'basket', a: -2.95, d: 3.6, s: 1.9, rot: 0.8 },
      { k: 'shakers', a: 2.72, d: 2.5, s: 2.2, rot: -0.3 },
      { k: 'ramekin', a: 2.2, d: 2.2, s: 2.2, rot: 0 },
      { k: 'fries', a: 0.92, d: 2.7, s: 2.0, rot: 0.4 },
    ].map((q) => Object.assign(q, { x: Math.cos(q.a) * (rimR + q.d), z: Math.sin(q.a) * (rimR + q.d) }));
    A.bumpers.forEach(() => { W.bumpers.push(mk((mb) => bumperModel(mb, this.brand.accentHex))); });
    // süsler: sosa yarı gömülü garnitürler + işletmenin yemekleri (gölle birlikte yavaşça döner, çakışmaz)
    {
      const pal = LAKE_PAL[A.variant % 3].map(hexRGB);
      const sc = mix3s(pal[0], pal[1], 0.55);
      const dm = {};
      const mkG = (fn, y0 = 0) => mk((mb) => { fn(mb); coat(mb, sc, -0.03 - y0, 0.06 - y0); });
      const R = SU.rng(A.seed * 3 + 11);
      const Wt = GARN_W[A.variant % 3];
      const kinds = Object.keys(Wt);
      kinds.forEach((k) => { for (let i = 0; i < GARN[k].v; i++) dm[k + i] = mkG((mb) => GARN[k].fn(mb, A.seed * 7 + i * 13 + 1), GARN[k].y || 0); });
      const dishes = (this.brand.dishes || ['burger']).filter((f) => HERO[f]);
      const paper = this.brand.boxHex || this.brand.accentHex;
      dishes.forEach((f) => { dm['hero_' + f] = mkG((mb) => (f === 'burger' ? gBurger(mb, A.seed) : f === 'drum' ? gDrum(mb, A.seed) : f === 'wrap' ? gWrap(mb, A.seed, paper) : gRiceBowl(mb, A.seed, this.brand.accentHex)), HERO[f].y); });
      W.dm = dm;
      const H = lakeH(A.seed);
      const rIn = A.r0 + 0.85, rOut = BR - 0.35;
      const tot = kinds.reduce((q, k) => q + Wt[k], 0);
      const pick = () => { let x = R() * tot; for (const k of kinds) { x -= Wt[k]; if (x <= 0) return k; } return kinds[0]; };
      const items = [];
      const put = (key, fp, sz, y0, tries) => {
        const f = fp * sz;
        if (rOut - rIn < 2 * f) return false;
        for (let t = 0; t < tries; t++) {
          const r = rIn + f + R() * (rOut - rIn - 2 * f), a = R() * TAU;
          const x = Math.cos(a) * r, z = Math.sin(a) * r;
          if (items.some((q) => Math.hypot(q.x - x, q.z - z) < q.f + f + 0.22)) continue;
          items.push({ key, hero: key.startsWith('hero_'), x, z, r, a0: a, f, s: sz, y0, hy: H(x, z) - LAKE_Y, ph: R() * TAU, rot: R() * TAU, spin: (R() - 0.5) * 0.08, bf: 0.8 + R() * 0.6, ba: 0.018 + R() * 0.018, tl: 0.02 + R() * 0.02, pb: 1 });
          return true;
        }
        return false;
      };
      const nh = dishes.length ? Math.min(4, Math.max(2, dishes.length * 2)) : 0;
      for (let i = 0; i < nh; i++) { const f = dishes[i % dishes.length]; put('hero_' + f, HERO[f].fp, 1.3 + R() * 0.2, HERO[f].y, 40); }
      let miss = 0;
      while (items.length < 28 && miss < 40) {
        const k = pick(), g = GARN[k];
        if (!put(k + Math.floor(R() * g.v), g.fp, 1.45 * (g.s[0] + R() * (g.s[1] - g.s[0])), g.y || 0, 12)) miss++;
      }
      W.decor = items;
      W.spr = mk((mb) => sprinkleModel(mb, A.variant, A.seed, rIn, BR - 0.15, H));
    }
    W.ring = mk((mb) => thinRing(mb), 'un');
    W.logo = mk((mb) => logoDisc(mb, Math.min(2.1, A.radii[L - 1] * 0.85), 0.012), 'tex');
    W.arrow = mk(arrowModel);
    W.chev = mk(chevronModel, 'un');
    W.rmark = mk(ringMarkModel, 'un');
    this.W = W;
    const tod = TOD[this.todI];
    this.cols = { sun: new Float32Array(norm3(tod.sunD)), fog: hexRGB(tod.fog), top: hexRGB(tod.top), hor: hexRGB(tod.hor), sunVis: norm3(tod.sunVis), acc: new Float32Array(hexRGB(this.brand.accentHex)) };
  }

  initMeshes() {
    const X = this.X;
    this.kitM = null;
    this.chefs = {};
    this.mk2 = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
  }
  kitMeshes() {
    if (this.kitM) return this.kitM;
    const X = this.X, acc = this.brand.accentHex;
    const mk = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
    this.kitM = {
      cup: mk((mb) => KIT.sodaCup(mb, acc)),
      cupLogo: mk((mb) => KIT.cupLogo(mb), 'tex'),
      tent: mk((mb) => KIT.tent(mb, acc)),
      tentLogo: mk((mb) => KIT.tentLogo(mb), 'tex'),
      ketchup: mk((mb) => KIT.bottle(mb, '#c8261c', '#b81f17', acc)),
      cutlery: mk((mb) => KIT.cutlery(mb)),
      napkin: mk((mb) => KIT.napkin(mb, acc)),
      fries: mk((mb) => KIT.friesBoat(mb, acc)),
      basket: mk((mb) => KIT.breadBasket(mb)),
      salt: mk((mb) => KIT.shaker(mb, '#f4f3ef')),
      pepper: mk((mb) => KIT.shaker(mb, '#3b3431')),
      ramekin: mk((mb) => KIT.ramekin(mb, '#c8261c')),
    };
    return this.kitM;
  }
  // ayakta masa karakteri ağları (aşçı kılığı): kişiye özel + ortak
  avMesh(ci) { const k = 'a' + ci; return this.chefs[k] || (this.chefs[k] = masa().standMeshes((f) => this.mk2(f), ci, { chef: true })); }
  avSh() { return this.chefs.sh || (this.chefs.sh = masa().standShared((f) => this.mk2(f))); }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; return; }
    const X = this.X;
    W.rings.forEach((r) => { freeMesh(X, r.mesh); freeMesh(X, r.warn); });
    freeMesh(X, W.lake); freeMesh(X, W.bub); freeMesh(X, W.bowl); freeMesh(X, W.table); freeMesh(X, W.ring); freeMesh(X, W.logo); freeMesh(X, W.arrow); freeMesh(X, W.chev); freeMesh(X, W.rmark);
    W.bumpers.forEach((b) => freeMesh(X, b));
    Object.values(W.dm).forEach((m) => freeMesh(X, m));
    freeMesh(X, W.spr);
    this.W = null;
  }

  /* ---------- anlık görüntüler ---------- */
  ingest(v) {
    const last = this.snaps[this.snaps.length - 1];
    if (!last || v.t > last.t) {
      this.snaps.push({ t: v.t, b: v.b });
      if (this.snaps.length > 40) this.snaps.shift();
    }
    this.alive = v.alive;
    this.over = !!v.over;
    const first = this.firstIngest;
    this.firstIngest = false;
    (v.ev || []).forEach((e) => {
      if (e[0] <= this.evSeen) return;
      this.evSeen = e[0];
      if (first && this.simNow() > 2) return; // sonradan katılana eski olayları çalma
      this.onEv(e);
    });
    if (this.mine) this.reconcile(v);
    if (this.mine) { const sb = v.b[this.my]; if (sb) this.myKo = sb[7]; }
  }

  reconcile(v) {
    const m = this.mine;
    const sb = v.b[this.my];
    if (!sb || !m) return;
    const fl = sb[5];
    m.cd = sb[6];
    m.st = fl & 8 ? Math.max(m.st, 0.2) : 0;
    if (fl & 2) {
      if (!m.fall) { m.fall = 1; m.vz = 0; }
      m.z = sb[8];
      m.x = sb[0]; m.y = sb[1]; m.vx = sb[2]; m.vy = sb[3];
      if (fl & 4) m.alive = 0;
      return;
    }
    const age = clamp(this.simNow() - v.t, 0, 0.3);
    const tx = sb[0] + sb[2] * age, ty = sb[1] + sb[3] * age;
    const ex = tx - m.x, ey = ty - m.y;
    const err = Math.hypot(ex, ey);
    const dvx = sb[2] - m.vx, dvy = sb[3] - m.vy;
    const dv = Math.hypot(dvx, dvy);
    if (err > 2.4) { m.x = tx; m.y = ty; m.vx = sb[2]; m.vy = sb[3]; return; }
    if (dv > 3) { m.vx = sb[2]; m.vy = sb[3]; m.x += ex * 0.55; m.y += ey * 0.55; return; }
    m.x += ex * 0.16; m.y += ey * 0.16;
    m.vx += dvx * 0.1; m.vy += dvy * 0.1;
  }

  onEv(e) {
    const k = e[1];
    const me = this.my;
    const P = this.parts;
    const pan = (x) => clamp(x / 12, -0.8, 0.8);
    if (k === 'h') {
      const [, , x, y, pw, i, j] = e;
      this.snd.fx('hit', pw);
      this.burst(x, 0.9, y, Math.min(14, 4 + pw), [1, 0.9, 0.5], 4 + pw * 0.2, 0.09, true, 0.4, 6);
      this.burst(x, 0.9, y, 4, [1, 1, 1], 3, 0.06, true, 0.3, 4);
      [i, j].forEach((q) => { if (this.bod[q]) this.bod[q].sq = 1; });
      if (i === me || j === me) {
        this.shake = Math.max(this.shake, clamp(pw / 16, 0.2, 0.8));
        vibrate(clamp(pw * 4, 18, 60));
        if (pw > 8) this.flash('hit', 260);
      } else if (pw > 9) this.shake = Math.max(this.shake, 0.12);
      if (pw > 7) this.floatText('💥', x, 1.7, y);
    } else if (k === 'd') {
      const [, , i, x, y] = e;
      if (i === me) return;
      this.snd.fx('dash', pan(x));
      this.burst(x, 0.15, y, 5, [0.85, 0.8, 0.7], 1.6, 0.12, false, 0.4, 5);
    } else if (k === 'b') {
      const [, , x, y, bi] = e;
      this.pulse[bi] = 1;
      this.snd.fx('bump');
      this.burst(x, 1.2, y, 10, [1, 0.8, 0.4], 4, 0.08, true, 0.4, 5);
      this.shake = Math.max(this.shake, 0.1);
    } else if (k === 'f') {
      const [, , i, ko, x, y] = e;
      const pl = this.view?.players?.[i];
      const kp = ko >= 0 ? this.view?.players?.[ko] : null;
      this.snd.fx('fall', pan(x));
      this.feed(kp ? `${esc(kp.n)} ➜ ${esc(pl?.n)} 🍅` : `${esc(pl?.n)} sosa düştü 🍅`);
      if (i === me) {
        this.myOut = true;
        this.msg('SOSA DÜŞTÜN! 🍅', 'red mid');
        this.snd.fx('lose');
        vibrate([60, 40, 90]);
        this.flash('hit', 500);
      } else if (ko === me && me >= 0) {
        this.msg('DEVİRDİN! 💥 +2', 'gold mid');
        this.snd.fx('ko');
        vibrate([30, 30, 50]);
      }
    }
  }

  feed(html) {
    const f = this.el.feed;
    const d = document.createElement('div');
    d.innerHTML = html;
    f.appendChild(d);
    while (f.children.length > 3) f.firstChild.remove();
    setTimeout(() => d.remove(), 4300);
  }

  onPhase(prev, v) {
    const p = v.phase;
    if (p === 'ready') { this.snd.music('idle'); this.msg(''); this.panelKey = ''; }
    else if (p === 'play') { this.snd.music('race'); }
    else if (p === 'result') {
      this.msg('');
      this.snd.music('calm');
      const me = v.results?.find((r) => r.id === this.ctx.me);
      if (me?.place === 1) setTimeout(() => this.snd.fx('win'), 250);
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
      html = '<div class="card"><div class="tt">🤼 Hazırlanıyor…</div></div>';
    } else if (v.phase === 'ready') {
      const left = v.startAt - sNow;
      if (left > 3300) {
        const first = v.round === 1;
        const canGo = ctx.isHost && first;
        const VV = SU.VARIANTS[v.variant % SU.VARIANTS.length];
        key = `ready|${v.round}|${v.players.map((r) => r.id + r.n).join(',')}|${canGo}`;
        html = `<div class="card">
          <div class="tt">🤼 Sumo Tepsisi</div>
          <div class="sub">${v.round}/${v.rounds}. tur · ${VV.emoji} ${VV.name} · ${v.players.length} sumocu</div>
          <div class="sub">${VV.sub}</div>
          ${first ? `<div class="how">
            <div><span class="k">🕹️</span><span><b>Sürükle = yürü</b><small>Ekranın solunda parmağını sürükle (bilgisayarda WASD / ok tuşları)</small></span></div>
            <div><span class="k">💨</span><span><b>Atıl = fırlat</b><small>Sağa dokun ya da butona bas: rakibe hızla çarp, uçsun! 2 sn beklersin</small></span></div>
            <div><span class="k">🍅</span><span><b>Sosa düşme!</b><small>Tepsinin dışına çıkan sosa düşer ve elenir</small></span></div>
            <div><span class="k">⚠️</span><span><b>Tepsi küçülüyor</b><small>Kırmızı yanıp sönen kenar çöker: hemen içeri kaç!</small></span></div>
          </div>` : `<div class="how"><div><span class="k">🕹️</span><span><b>Sürükle</b> · <b>💨 atıl</b> · <b>⚠️ kırmızı kenardan kaç</b></span></div></div>`}
          <div class="who">${chips(v.players)}</div>
          <div class="cd"><span>${v.playing ? 'Tur başlıyor' : 'Bu turu izleyeceksin'}</span><b data-cd></b></div>
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
      const title = meR?.place === 1 ? '🏆 Turu kazandın!' : meR ? `🏁 ${meR.place}. oldun` : `🏁 ${v.round}. tur bitti`;
      html = `<div class="card">
        <div class="tt">${title}</div>
        <div class="sub">${v.round}/${v.rounds}. tur · son ayakta kalan: <b>${esc(win?.nickname || '—')}</b></div>
        <ol class="res">${v.results.map((r) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(r.place)}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">${r.ko ? `💥×${r.ko}` : ''}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
        <div class="cd"><span>${v.last ? 'Genel sonuçlar' : 'Sonraki tur'}</span><b data-cd></b></div>
        ${ctx.isHost ? `<button class="kb btn" data-game-action="next">${v.last ? 'Sonuçlara geç ▶' : 'Sonraki tur ▶'}</button>` : ''}
      </div>`;
    } else if (v.phase === 'final') {
      const sb = v.scoreboard || [];
      const top = sb[0];
      key = `final|${sb.map((s) => s.id + s.score).join(',')}|${ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏆 ${top ? `${esc(top.nickname)} kazandı!` : 'Oyun bitti!'}</div>
        <div class="sub">3 turun toplam puanı</div>
        ${podiumHTML(sb, ctx.me)}
        <ol class="res">${sb.map((s, i) => `<li class="${s.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(s.c)}"></i><span class="nm">${esc(s.nickname)}</span><span class="p">${s.score}</span></li>`).join('')}</ol>
        ${v.best ? `<div class="best">💥 En çok devirme: <b>${esc(v.best.nickname)}</b> · ${v.best.ko} kişi (${v.best.round}. tur)</div>` : ''}
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
    this.flashing = true;
    clearTimeout(this.flashT);
    this.flashT = setTimeout(() => { v.className = 'vig'; this.flashing = false; }, ms);
  }
  toastK(text, ms = 1300) {
    const t = this.el.toastk;
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('on'), ms);
  }

  /* ---------- simülasyon (kendi karakterim: tahmin) ---------- */
  stepMine(sNow) {
    const m = this.mine;
    const v = this.view;
    if (!m || !v || v.phase !== 'play' || !this.arena) return;
    const el = this.simNow();
    if (el <= 0) return;
    if (el - this.simT > 0.5) this.simT = el - 0.5;
    const [ix, iy] = this.inputVec();
    const dead = m.fall || !m.alive || this.over;
    const inp = this.inp;
    inp.x = dead ? 0 : ix; inp.y = dead ? 0 : iy;
    let n = 0;
    const R = SU.radiusAt(this.arena, el);
    const evs = [];
    while (this.simT + H_STEP <= el && n < 80) {
      inp.d = this.dashQ && !dead ? 1 : 0;
      SU.stepBody(m, H_STEP, inp, this.V, evs, this.my);
      this.dashQ = false;
      this.simT += H_STEP;
      n += 1;
      if (!m.fall) {
        // diğer oyuncularla yumuşak ayrışma (gerçek çarpışmayı sunucu çözer)
        this.bod.forEach((o, i) => {
          if (i === this.my || o.gone || o.fl & 6) return;
          const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy);
          if (d < SU.BR * 2 && d > 1e-4) {
            const nx = dx / d, ny = dy / d, ov = SU.BR * 2 - d;
            m.x += nx * ov * 0.5; m.y += ny * ov * 0.5;
            const vn = m.vx * nx + m.vy * ny;
            if (vn < 0) { m.vx -= vn * nx * 0.9; m.vy -= vn * ny * 0.9; }
          }
        });
        const r = Math.hypot(m.x, m.y);
        if (r > R + 0.3) { const k = (R + 0.3) / r; const vr = (m.vx * m.x + m.vy * m.y) / r; m.x *= k; m.y *= k; if (vr > 0) { m.vx -= vr * m.x / (R + 0.3); m.vy -= vr * m.y / (R + 0.3); } }
      }
    }
    if (evs.some((e) => e[0] === 'd')) {
      this.snd.fx('dash', 0);
      this.burst(m.x, 0.15, m.y, 6, [0.85, 0.8, 0.7], 1.8, 0.12, false, 0.4, 5);
    }
  }

  // Diğerleri: ~110 ms gerideden, iki görüntü arasında yumuşatılarak
  sampleOthers(dt) {
    const rt = this.simNow() - 0.11;
    const S = this.snaps;
    const bod = this.bod;
    if (!S.length || this.view?.phase !== 'play') return;
    let a = null, b = null;
    for (let i = S.length - 1; i >= 0; i--) { if (S[i].t <= rt) { a = S[i]; b = S[i + 1] || null; break; } }
    if (!a) { a = S[0]; b = null; }
    const k = b ? clamp((rt - a.t) / Math.max(0.001, b.t - a.t), 0, 1) : 0;
    const ex = !b ? clamp(rt - a.t, 0, 0.18) : 0;
    for (let i = 0; i < bod.length; i++) {
      const s = bod[i];
      const A = a.b[i];
      if (!A) continue;
      const B = b ? b.b[i] : null;
      if (i === this.my && this.mine) continue;
      if (B) {
        s.x = lerp(A[0], B[0], k); s.y = lerp(A[1], B[1], k);
        s.vx = lerp(A[2], B[2], k); s.vy = lerp(A[3], B[3], k);
        s.ang = angLerp(A[4], B[4], k);
        s.z = lerp(A[8], B[8], k);
      } else {
        s.x = A[0] + A[2] * ex; s.y = A[1] + A[3] * ex;
        s.vx = A[2]; s.vy = A[3]; s.ang = A[4]; s.z = A[8];
      }
      const fl = (B && k > 0.5 ? B : A)[5];
      s.fl = fl; s.cd = A[6]; s.ko = A[7];
    }
  }

  stepBodies(dt) {
    const m = this.mine;
    const v = this.view;
    this.bod.forEach((s, i) => {
      if (i === this.my && m) {
        s.x = m.x; s.y = m.y; s.vx = m.vx; s.vy = m.vy;
        const sp = Math.hypot(m.fx, m.fy);
        if (sp > 0.01) s.ang = angLerp(s.ang, Math.atan2(m.fy, m.fx), 1 - Math.exp(-22 * dt));
        s.z = m.fall ? m.z : 0;
        s.fl = (m.dt > 0 ? 1 : 0) | (m.fall ? 2 : 0) | (m.alive ? 0 : 4) | (m.st > 0.01 ? 8 : 0);
        s.cd = m.cd;
      }
      s.sq = Math.max(0, s.sq - dt * 4.5);
      const falling = s.fl & 2;
      if (falling) {
        s.tum += dt;
        if (!s.splashed && s.z < LAKE_Y + 0.3) {
          s.splashed = true;
          this.splash(s.x, s.y, 1);
          this.snd.fx('splash', clamp(s.x / 12, -0.8, 0.8));
        }
      }
      s.gone = !!falling && s.z < -3.2;
    });
    // dalga efektleri
    for (let i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].t += dt; if (this.ripples[i].t > 1.4) this.ripples.splice(i, 1); }
    // sosta inip kalkan garnitürlerin çevresinde ara sıra hafif halka
    if (this.W?.decor) {
      const lr = this.time * 0.025;
      for (const d of this.W.decor) {
        const sb = Math.sin(this.time * d.bf + d.ph) < 0 ? -1 : 1;
        if (sb < 0 && d.pb > 0 && Math.random() < 0.16 && this.ripples.length < 30) {
          const a = d.a0 - lr;
          this.ripples.push({ x: Math.cos(a) * d.r, z: Math.sin(a) * d.r, t: 0.3, r: 1.0, r0: d.f * 0.95, a: 0.3 });
        }
        d.pb = sb;
      }
    }
    void v;
  }

  // ayakta aşçılar: duruma göre poz (yürüyüş, itişmeye hazır, atılma, sersemleme, düşüş, sevinç), bakış ve yüz ifadesi
  stepAvs(dt) {
    const MAk = masa(), v = this.view, t = this.simNow();
    const play = v?.phase === 'play' && t >= 0;
    const bod = this.bod;
    bod.forEach((s, i) => {
      if (s.gone) return;
      const pl = v?.players?.[i];
      const ci = (((pl ? pl.c : i) % 12) + 12) % 12;
      let a = s.av;
      if (!a || a.ci !== ci) a = s.av = new MAk.StandAvatar(ci);
      const fall = s.fl & 2, dash = s.fl & 1, dizzy = (s.fl & 8) && !fall;
      const win = this.over && !(s.fl & 6);
      const spd = Math.hypot(s.vx, s.vy);
      a.base[0] = s.x; a.base[1] = fall ? s.z : 0; a.base[2] = s.y;
      a.yaw = Math.PI / 2 - s.ang + (fall ? s.tum * 3 : 0);
      const wk = fall ? 1 : play && !win ? clamp(spd / 3.2, 0, 1) : 0;
      a.walk += (wk - a.walk) * (1 - Math.exp(-10 * dt));
      if (a.walk > 0.03) a.gait += dt * (fall ? 16 : 4 + spd * 2.4);
      let expr = 'smile';
      if (fall) { a.standPose('flail', this.time); expr = 'o'; }
      else if (dizzy) { a.pose('headgrab', { t: this.time, k: 12 }); a.tgt.roll = Math.sin(this.time * 7 + i) * 0.08; expr = 'wince'; }
      else if (win) { a.standPose('cheer', this.time); expr = 'laugh'; }
      else if (dash) { a.standPose('push', this.time); expr = 'grin'; }
      else if (play) {
        a.standPose('guard', this.time, a.walk);
        a.tgt.lean += clamp(spd * 0.02, 0, 0.12);
        expr = Math.hypot(s.x, s.y) > this.curR - 1.6 ? 'tense' : 'smile';
      } else a.standPose('idle', this.time);
      a.expr = expr;
      a.k = dash || fall ? 18 : 11;
      // bakış: en yakın rakip (yoksa ileri)
      let best = null, bd = 5.5;
      if (!fall && !dizzy && !win) {
        for (let j = 0; j < bod.length; j++) {
          const o = bod[j];
          if (j === i || o.gone || (o.fl & 2)) continue;
          const d = Math.hypot(o.x - s.x, o.y - s.y);
          if (d < bd) { bd = d; best = o; }
        }
      }
      a.look = best ? [best.x, 1.55, best.y] : null;
      a.stepStand(dt, this.time);
      a.setRoot(AV_S, fall ? s.tum * 4 : 0, fall ? Math.sin(s.tum * 5) * 0.5 : 0, s.sq * 0.16);
    });
  }

  splash(x, z, big) {
    const col = hexRGB(LAKE_COLS[this.variant % 3]);
    this.burst(x, LAKE_Y + 0.1, z, 16 * big, col, 5.5, 0.14, false, 0.8, 11);
    this.burst(x, LAKE_Y + 0.2, z, 6, [1, 1, 1], 4, 0.07, false, 0.5, 11);
    this.ripples.push({ x, z, t: 0, r: 4 * big });
  }

  /* ---------- tepsi olayları ---------- */
  stepArena(dt) {
    const A = this.arena;
    const v = this.view;
    if (!A || !v) return;
    const t = this.simNow();
    // düşen halkalar
    A.times.forEach((tk, k) => {
      if (t >= tk && !this.drops[k]) {
        this.drops[k] = { y: 0, vy: 0, rx: 0, rz: 0, ax: (Math.random() - 0.5) * 1.6, az: (Math.random() - 0.5) * 1.6, done: false, sp: false };
        const r = A.radii[k];
        this.snd.fx('crumble');
        this.shake = Math.max(this.shake, 0.55);
        vibrate([40, 30, 60]);
        for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28; this.burst(Math.cos(a) * r, 0.2, Math.sin(a) * r, 1, [0.9, 0.85, 0.75], 3, 0.12, false, 0.7, 7); }
      }
    });
    this.drops.forEach((d, k) => {
      if (!d || d.done) return;
      d.vy -= SU.FALL_G * dt * 0.8;
      d.y += d.vy * dt;
      d.rx += d.ax * dt * (1 + -d.y * 0.1);
      d.rz += d.az * dt * (1 + -d.y * 0.1);
      if (!d.sp && d.y < LAKE_Y + 0.2) {
        d.sp = true;
        const r = (A.radii[k] + (k < A.radii.length - 1 ? A.radii[k + 1] : 0)) / 2;
        for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + Math.random() * 0.5; this.splash(Math.cos(a) * r, Math.sin(a) * r, 1.2); }
        this.snd.fx('splash', 0);
        this.shake = Math.max(this.shake, 0.35);
      }
      if (d.y < -9) d.done = true;
    });
    // uyarı
    if (v.phase === 'play' && t > 0 && !this.over) {
      const w = SU.warnAt(A, t);
      if (w && !w.going) {
        if (this.warnK !== w.k) { this.warnK = w.k; this.warnTick = 99; this.msg('⚠️ KENARLAR ÇÖKÜYOR!', 'mid red'); this.flash('warn', 2400); }
        const n = Math.ceil(w.left);
        if (n !== this.warnTick) { this.warnTick = n; this.snd.fx('warn'); }
      }
    }
    // son ayakta kalan
    if (this.over && !this.wasOver && v.phase !== 'ready') {
      this.wasOver = true;
      const wi = this.bod.findIndex((s) => !(s.fl & 6));
      const pl = wi >= 0 ? v.players[wi] : null;
      if (pl) { this.msg(`👑 ${esc(pl.n)}`, 'gold mid', true); if (wi !== this.my) this.snd.fx('ko'); else { this.snd.fx('win'); vibrate([40, 50, 40, 50, 120]); this.confetti(0, 0, 90); } }
    }
    // sos kabarcıkları: tepsinin dışında, gölde rastgele yerlerde şişip patlar (patlayınca küçük halka ve damlacık)
    if (Math.random() < dt * 1.8 && this.bubbles.length < 14) {
      const a = Math.random() * 6.28, r = A.r0 * 1.15 + Math.random() * Math.max(0.5, bowlRadius(A) - A.r0 * 1.15 - 1.0);
      this.bubbles.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, t: 0, life: 0.8 + Math.random() * 0.9, r: 0.1 + Math.random() * 0.22, ph: Math.random() * 6.28 });
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.t += dt;
      if (b.t >= b.life) {
        this.bubbles.splice(i, 1);
        this.ripples.push({ x: b.x, z: b.z, t: 0.6, r: 0.4 + b.r * 2.6, a: 0.55 });
        if (this.parts.length < 520) this.burst(b.x, LAKE_Y + 0.05, b.z, 3 + Math.round(b.r * 14), hexRGB(LAKE_COLS[this.variant % 3]).map((q) => Math.min(1, q * 1.2)), 1.6, 0.06, false, 0.45, 8);
      }
    }
    // ara sıra sos dalgası
    if (Math.random() < dt * 0.7) this.ripples.push({ x: (Math.random() - 0.5) * A.r0 * 4, z: (Math.random() - 0.5) * A.r0 * 4, t: 0.4, r: 1.8 + Math.random() * 1.5 });
    if (Math.random() < dt * 2.2 && this.parts.length < 500) { const a = Math.random() * 6.28, r = A.r0 * 1.12 + Math.random() * Math.max(0.5, bowlRadius(A) - A.r0 * 1.12 - 0.9); this.burst(Math.cos(a) * r, LAKE_Y + 0.05, Math.sin(a) * r, 1, hexRGB(LAKE_COLS[this.variant % 3]).map((q) => Math.min(1, q * 1.3)), 0.8, 0.12, false, 0.7, 2); }
    // sıcak çorbadan yükselen buhar (yumuşak, yavaş, büyüyerek kaybolan)
    if (Math.random() < dt * 7 && this.parts.length < 560) {
      const a = Math.random() * 6.28, r = A.r0 * 1.08 + Math.random() * Math.max(0.5, bowlRadius(A) - A.r0 * 1.08 - 0.6);
      this.parts.push({ x: Math.cos(a) * r, y: LAKE_Y + 0.15, z: Math.sin(a) * r, vx: (Math.random() - 0.5) * 0.25, vy: 0.45 + Math.random() * 0.35, vz: (Math.random() - 0.5) * 0.25, life: 2.2 + Math.random(), max: 3.0, s: 0.42 + Math.random() * 0.3, r: 1, g: 1, b: 1, add: false, grav: -0.06, drag: 0.5, puff: true, steam: true });
    }
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
      this.parts.push({ x: x + (Math.random() - 0.5) * 6, y: 6 + Math.random() * 3, z: z + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 5 + 1, vz: (Math.random() - 0.5) * 6, life: 2.4 + Math.random() * 1.4, max: 3.8, s: 0.12 + Math.random() * 0.08, r: c[0], g: c[1], b: c[2], add: false, grav: 3.2, drag: 1.2, conf: true });
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
      if (p.steam) continue;
      if (p.y < 0.03 && p.y > LAKE_Y - 0.5 && !p.conf && Math.hypot(p.x, p.z) < this.curR && p.vy < 0 && p.y > -0.3) { p.y = 0.03; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
      if (p.y < LAKE_Y && !p.conf) { P[i] = P[P.length - 1]; P.pop(); }
    }
    // atılan karakterin arkasında toz izi
    this.bod.forEach((s) => {
      if (s.fl & 1 && P.length < 640 && !(s.fl & 2)) {
        if (Math.random() < 0.8) P.push({ x: s.x - s.vx * 0.04, y: 0.3, z: s.y - s.vy * 0.04, vx: -s.vx * 0.1, vy: 0.6, vz: -s.vy * 0.1, life: 0.45, max: 0.45, s: 0.2, r: 1, g: 0.95, b: 0.8, add: true, grav: -0.5, drag: 2, puff: true });
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
      const a = p.conf ? Math.min(1, k * 2.5) : p.steam ? Math.min(1, (1 - k) * 4) * k * 0.22 : p.puff ? k * 0.6 : k;
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
    const A = this.arena;
    const c = this.cam;
    if (!v || !A) return;
    const t = this.simNow();
    const vw = this.vw || 1, vh = this.vh || 1;
    const asp = vw / vh;
    const R = this.curR = Math.max(SU.RMIN, SU.radiusAt(A, Math.max(0, t)) + 0.4);
    if (this.snd) this.snd.int = v.phase === 'play' ? clamp(1 - (R - SU.RMIN - 0.4) / Math.max(1, A.r0 - SU.RMIN), 0, 1) : 0;
    const land = asp > 1;
    const pitch = land ? 0.95 : 1.08;
    const fovy = land ? 0.76 : 0.86;
    this.fov = fovy;
    const tH = Math.tan(fovy / 2) * asp, tV = Math.tan(fovy / 2);
    let Rc = R * 1.16 + 0.5;
    // oyun sırasında kamera ayakta kalan aşçıları çerçeveler (kümelendiklerinde yaklaşır, karakterler büyür)
    let fcx = null, fcz = null;
    if (v.phase === 'play' && t > 0.5 && this.bod) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0;
      this.bod.forEach((b) => { if (b.gone || (b.fl & 2)) return; x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x); z0 = Math.min(z0, b.y); z1 = Math.max(z1, b.y); n++; });
      if (n) {
        const rr = Math.max(Math.hypot(x1 - x0, z1 - z0) / 2 + 2.8, 5.4);
        if (rr < Rc) { Rc = rr; fcx = (x0 + x1) / 2; fcz = (z0 + z1) / 2; }
      }
    }
    this.camRc = damp(this.camRc || Rc, Rc, 1.6, dt);
    const Dh = this.camRc / tH;
    const Dv = (this.camRc * 1.85 * Math.sin(pitch) + 2) / (2 * tV * (land ? 0.8 : 0.68));
    const Dt = Math.max(Math.max(Dh, Dv), 8);
    c.D = damp(c.D || Dt, Dt, 2.2, dt);
    const intro = v.phase === 'ready' && t < -3.2;
    const wantYaw = intro ? Math.sin(this.time * 0.28) * 0.55 : 0;
    c.yaw = damp(c.yaw, wantYaw, intro ? 3 : 2.4, dt);
    // hafif takip: kamera kendi karakterime doğru azıcık kayar
    const m = this.mine;
    let fx = m && !m.fall ? m.x * 0.1 : 0, fz = m && !m.fall ? m.y * 0.1 : 0;
    if (fcx !== null) { fx = fcx * 0.8 + fx * 0.2; fz = fcz * 0.8 + fz * 0.2; }
    c.tx = damp(c.tx, fx, 1.8, dt); c.tz = damp(c.tz, fz, 1.8, dt);
    c.ty = 0;
    const Dd = c.D * (intro ? 0.92 : 1);
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

  // Opak sahne (gölge geçişi ve ana çizim ortak). D(mesh, m, tint, alpha, glow)
  litScene(D, shadow, t, T) {
    const Wd = this.W, A = this.arena;
    const mt = this.mats;
    const m = mt.a, m2 = mt.b, m3 = mt.c;
    const [T_TRAY, T_LAKE, T_OBJ] = T;
    // sofra eşyaları (marka rengi, logolu bardak ve masa kartı)
    const PM = this.kitM;
    if (PM) {
      Wd.props.forEach((p) => {
        if (p.k === 'shakers') {
          M.set(m, p.x - 0.55 * p.s, BOWL_Y, p.z, p.rot, 0, 0, p.s); D(PM.salt, m, T_LAKE);
          M.set(m, p.x + 0.55 * p.s, BOWL_Y, p.z + 0.25 * p.s, p.rot, 0, 0, p.s); D(PM.pepper, m, T_LAKE);
          return;
        }
        const mesh = PM[p.k];
        if (!mesh) return;
        M.set(m, p.x, BOWL_Y + (p.dy || 0), p.z, p.rot, 0, 0, p.s);
        D(mesh, m, T_LAKE);
      });
    }
    M.set(m, 0, 0, 0);
    D(Wd.bowl, m, T_OBJ);
    if (!shadow) {
      // sos: yavaş girdap + yüzeyde dolaşan küçük dalgalar (normal bozulması → kayan parıltılar)
      const gl = this.X.gl, uw = this.X.lit.u.uWave;
      if (uw) gl.uniform4f(uw, this.time % 200, 0.11, 0.85, 1);
      M.set(m, 0, 0, 0, this.time * 0.025);
      D(Wd.lake, m, T_LAKE);
      if (uw) gl.uniform4f(uw, 0, 0, 0, 0);
      if (Wd.spr) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -2); D(Wd.spr, m, T_LAKE); gl.disable(gl.POLYGON_OFFSET_FILL); }
      // kabarcıklar: şişer, titrer, patlar
      for (const b of this.bubbles) {
        const k = b.t / b.life, g = k < 0.8 ? 1 - (1 - k / 0.8) ** 2 : 1 + (k - 0.8) * 1.5;
        const sc = b.r * g * (1 + 0.04 * Math.sin(this.time * 23 + b.ph));
        M.set(m, b.x, LAKE_Y - sc * 0.35, b.z, 0, 0, 0, sc, sc, sc);
        D(Wd.bub, m, T_LAKE);
      }
    }
    // süs: gölle birlikte dönen, sosta hafifçe inip kalkan garnitürler
    const lr = this.time * 0.025;
    Wd.decor.forEach((d) => {
      if (shadow && !d.hero) return;   // yüzeydeki yassı süslerin gölgesi görünmez: gölge geçişinde yalnız büyük yemekler
      const a = d.a0 - lr;
      const bob = Math.sin(this.time * d.bf + d.ph) * d.ba;
      M.set(m, Math.cos(a) * d.r, LAKE_Y + d.hy + d.y0 * d.s + bob, Math.sin(a) * d.r, d.rot + lr + this.time * d.spin, Math.sin(this.time * 0.7 + d.ph) * d.tl, Math.cos(this.time * 0.6 + d.ph) * d.tl, d.s);
      D(Wd.dm[d.key], m, T_LAKE);
    });
    // tepsi halkaları
    const w = t > -90 ? SU.warnAt(A, Math.max(0, t)) : null;
    const flash = 0.5 + 0.5 * Math.sin(this.time * (9 + (w && !w.going ? (SU.WARN - w.left) * 2.5 : 0)));
    const TINT = this.TINT || (this.TINT = new Float32Array(3));
    const lastK = Wd.rings.length - 1;
    const Rcur = SU.radiusAt(A, Math.max(0, t));
    for (const r of Wd.rings) {
      const d = this.drops[r.k];
      if (d?.done) continue;
      let tint = T_TRAY;
      let ox = 0, oz = 0;
      if (!shadow && w && !w.going && w.k === r.k && !d) {
        TINT[0] = T_TRAY[0] * (1 + 0.5 * flash); TINT[1] = T_TRAY[1] * (1 - 0.82 * flash); TINT[2] = T_TRAY[2] * (1 - 0.86 * flash); tint = TINT;
        if (w.left < 1.3) { ox = (Math.random() - 0.5) * 0.06; oz = (Math.random() - 0.5) * 0.06; }
      }
      if (d) M.set(m, 0, d.y, 0, 0, d.rx, d.rz);
      else if (r.k === lastK && Rcur < r.r1) { const s = Math.max(0.05, Rcur / r.r1); M.set(m, 0, 0, 0, 0, 0, 0, s, 1, s); }
      else M.set(m, ox, 0, oz);
      if (!shadow) detailOn(this.X, 0.1, 0.9, 0.9);
      D(r.mesh, m, tint);
    }
    if (!shadow) detailOn(this.X, 0);
    // bumperlar
    A.bumpers.forEach((b, i) => {
      const k = Wd.rings.findIndex((r) => b.d <= r.r1 && b.d >= r.r0);
      const dr = k >= 0 ? this.drops[k] : null;
      if (dr?.done) return;
      if (!dr && !SU.bumperOn(A, b, Math.max(0, t))) return;
      if (!shadow) this.pulse[i] = Math.max(0, (this.pulse[i] || 0) - 0.016 * 4);
      const sc = 1 + 0.28 * (this.pulse[i] || 0);
      if (dr) {
        M.set(m2, 0, dr.y, 0, 0, dr.rx, dr.rz);
        M.set(m3, b.x, 0.0, b.y, this.time * 0.2, 0, 0, sc, 1 / sc, sc);
        M.mul(m, m2, m3);
      } else M.set(m, b.x, 0, b.y, this.time * 0.2, 0, 0, sc, 1 / sc, sc);
      D(Wd.bumpers[i], m, T_OBJ, 1, 1.1 + (this.pulse[i] || 0));
    });
    // karakterler: masa karakterleri ayakta, aşçı kılığında (poz stepAvs'te hesaplanır)
    const chars = [];
    const MAk = masa(), ash = this.avSh(), to = { h: this.vh, rimK: 0.3 + (this.todI === 2 ? 0.1 : 0) };
    this.bod.forEach((s, i) => {
      const a = s.av;
      if (s.gone || !a) return;
      const fall = s.fl & 2;
      if (shadow) { MAk.castStand(this.X, a, this.avMesh(a.ci), ash); return; }
      chars.push({ i, ci: a.ci, s, fall, me: i === this.my, dizzy: (s.fl & 8) && !fall });
      const tS = a.tS || (a.tS = new Float32Array(3)), tH = a.tH || (a.tH = new Float32Array(3));
      for (let k = 0; k < 3; k++) { tS[k] = a.tint[k] * T_OBJ[k]; tH[k] = a.skinT[k] * T_OBJ[k]; }
      MAk.drawStand(this.X, a, this.avMesh(a.ci), ash, this.Fr, to, T_OBJ, tS, tH, !fall && KIT.blinkAt(i, this.time));
    });
    return { chars, w, flash, Rcur };
  }

  draw(sNow) {
    const X = this.X;
    const Wd = this.W;
    if (!X || this.lost || !Wd || !this.arena) { if (!X && this.arena) this.draw2d(); return; }
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const A = this.arena;
    const tod = TOD[this.todI];
    const c = this.cam;
    const mt = this.mats;
    const t = this.simNow();
    const sh = this.shake * this.shake * 0.5;
    const jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    M.persp(mt.P, this.fov, asp, 0.5, 500);
    const shift = this.lens || 0;
    if (shift) mt.P[8] = shift;
    M.look(mt.V, c.ex + jx, c.ey + jy, c.ez, c.tx + jx * 0.4, c.ty + jy * 0.4, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const lampOn = tod.lampC[0] > 0;
    const K = this.cols;
    const F = { VP: mt.VP, V: mt.V, fov: this.fov, asp, shift, cx: c.ex, cy: c.ey, cz: c.ez, sun: K.sun, fog: K.fog, top: K.top, hor: K.hor, sunVis: K.sunVis, lx: 0, ly: lampOn ? 9 : -50, lz: 0, lampC: tod.lampC };
    const fogA = c.D * 1.15, fogB = c.D * 1.15 + 170;
    const setFog = (p) => { if (p.u.uFogR) gl.uniform2f(p.u.uFogR, fogA, fogB); };
    const m = mt.a;
    const ex = [0.74, 0.95, 1.12][this.todI];
    const T = this.T3 || (this.T3 = [new Float32Array(3), new Float32Array(3), new Float32Array(3)]);
    T[0].fill(ex * 0.9); T[1].fill(ex * 0.98); T[2].fill(ex * 1.04);
    const [T_TRAY, T_LAKE, T_OBJ] = T;
    if (!this.kitM) this.kitMeshes();
    // ---- gerçek gölgeler ----
    if (shadowBegin(X, K.sun, 0, 0, 0, bowlRadius(A) + 9, (bowlRadius(A) + 9) * 2.2 + 10, 0.62)) this.litScene((mesh, mm) => shadowCast(X, mesh, mm), true, t, T);
    shadowEnd(X, Wp, Hp);
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
    // ---- ahşap masa (dokulu) ----
    useProg(X, X.tex, F, tod);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.res.wood());
    M.set(m, 0, 0, 0);
    drawMesh(X, Wd.table, m, T_LAKE);
    // ---- opak ----
    useProg(X, X.lit, F, tod);
    setFog(X.lit);
    aoOn(X, BOWL_Y, 1.4, 0.3);
    this.Fr = F;
    const { chars, w, flash, Rcur } = this.litScene((mesh, mm, tint, al, gw) => drawMesh(X, mesh, mm, tint, al, gw), false, t, T);
    // "sen" oku
    if (this.my >= 0) {
      const s = this.bod[this.my];
      if (s && !(s.fl & 6)) {
        M.set(m, s.x, 3.05 + Math.sin(this.time * 4) * 0.14, s.y, this.time * 1.6, Math.PI, 0, 1.1);
        drawMesh(X, Wd.arrow, m, ONE3, 1, 1.0);
      }
    }
    // sersemleme yıldızları
    chars.forEach((q) => {
      if (!q.dizzy) return;
      for (let k = 0; k < 3; k++) {
        const a = this.time * 6 + (k / 3) * 6.28;
        M.set(m, q.s.x + Math.cos(a) * 0.55, 2.98, q.s.y + Math.sin(a) * 0.55, 0, 0, 0, 0.5);
        drawMesh(X, this.res.light, m, [1, 0.9, 0.3], 1, 1.4);
      }
    });
    // ---- dokulu: merkez logosu, masa kartı ve bardak logoları ----
    useProg(X, X.tex, F, tod);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0.3 + tod.night * 0.5);
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    const lk = Math.min(1, Rcur / Math.max(0.01, A.radii[A.radii.length - 1]));
    M.set(m, 0, 0, 0, 0, 0, 0, lk, 1, lk);
    drawMesh(X, Wd.logo, m);
    gl.uniform1f(X.tex.u.uSelf, 0.12 + tod.night * 0.35);
    const PM = this.kitM;
    Wd.props.forEach((p) => {
      if (p.k === 'tent') { M.set(m, p.x, BOWL_Y, p.z, p.rot, 0, 0, p.s); drawMesh(X, PM.tentLogo, m, T_LAKE); }
      else if (p.k === 'cup') { M.set(m, p.x, BOWL_Y, p.z, Math.atan2(c.ex - p.x, c.ez - p.z), 0, 0, p.s); drawMesh(X, PM.cupLogo, m, T_LAKE); }
    });
    // ---- saydam ----
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, tod);
    setFog(X.un);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    chars.forEach((q) => {
      if (q.fall && q.s.z < -0.6) return;
      M.set(m, q.s.x, 0.02, q.s.y, 0, 0, 0, 0.62, 1, 0.62);
      drawMesh(X, this.res.shadow, m, ONE3, 0.42);
    });
    Wd.props.forEach((p) => {
      const r = p.k === 'napkin' || p.k === 'cutlery' ? 0 : (p.k === 'shakers' ? 1.2 : p.k === 'basket' ? 2.2 : p.k === 'tent' ? 1.2 : 0.95) * p.s;
      if (!r) return;
      M.set(m, p.x, BOWL_Y + 0.004, p.z, 0, 0, 0, r, 1, r);
      drawMesh(X, this.res.shadow, m, ONE3, 0.5);
    });
    // oyuncu rengi halkalar (açık renkli tepside de seçilsin diye katkısız) ve kendi yön okum
    chars.forEach((q) => {
      if (q.fall || !Wd.rmark) return;
      const col = hexRGB(pcol(q.ci));
      const sc = q.me ? 1.12 + 0.05 * Math.sin(this.time * 5) : 1.0;
      M.set(m, q.s.x, 0.03, q.s.y, this.time * 0.6, 0, 0, sc);
      drawMesh(X, Wd.rmark, m, col, q.me ? 0.95 : 0.7);
      if (q.me && Wd.chev && this.view?.phase === 'play') {
        const a = q.s.ang, dx = Math.cos(a), dz = Math.sin(a);
        const ready = this.mine && this.mine.cd <= 0;
        const pk = ready ? 1 + 0.1 * Math.sin(this.time * 9) : 0.9;
        // önce derinlik testi kapalı soluk geçiş (aşçının arkasında kalsa da seçilsin), sonra normal
        for (let pass = 0; pass < 2; pass++) {
          if (pass === 0) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST);
          for (let k = 0; k < 2; k++) {
            const dd = 1.6 + k * 0.9 + (ready ? 0.1 * Math.sin(this.time * 9 - k) : 0);
            const sc2 = (1.55 - k * 0.2) * pk, al = (ready ? 0.95 : 0.55) * (1 - k * 0.3) * (pass === 0 ? 0.3 : 1);
            // beyaz kontur (biraz büyük, ağırlık merkezi korunur) + oyuncu rengi dolgu
            const o = -0.3 * sc2 * 0.3;
            M.set(m, q.s.x + dx * (dd + o), 0.155, q.s.y + dz * (dd + o), Math.PI / 2 - a, 0, 0, sc2 * 1.3);
            drawMesh(X, Wd.chev, m, ONE3, al * 0.85);
            M.set(m, q.s.x + dx * dd, 0.16, q.s.y + dz * dd, Math.PI / 2 - a, 0, 0, sc2);
            drawMesh(X, Wd.chev, m, col, al);
          }
        }
      }
    });
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // sos dalgaları
    this.ripples.forEach((r) => {
      const k = r.t / 1.4;
      M.set(m, r.x, LAKE_Y + 0.03, r.z, 0, 0, 0, (r.r0 ?? 0.4) + k * r.r);
      drawMesh(X, Wd.ring, m, [1, 0.9, 0.85], (1 - k) * 0.32 * (r.a ?? 1));
    });
    // katkı: renkli halkalar, uyarı, parçacıklar
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    chars.forEach((q) => {
      if (q.fall) return;
      const col = hexRGB(pcol(q.ci));
      M.set(m, q.s.x, 0.04, q.s.y, 0, 0, 0, q.me ? 1.35 : 1.05, 1, q.me ? 1.35 : 1.05);
      drawMesh(X, this.res.glow, m, col, q.me ? 0.6 + 0.2 * Math.sin(this.time * 5) : 0.38);
    });
    if (w && !w.going) {
      const rr = Wd.rings[w.k];
      if (rr && rr.warn && !this.drops[w.k]) { M.set(m, 0, 0, 0); drawMesh(X, rr.warn, m, ONE3, 0.35 + 0.6 * flash); }
    }
    if (tod.night > 0.3) {
      // gece: tepsi ve bumperlar hafif parlar
      M.set(m, 0, 0.03, 0, 0, 0, 0, Rcur * 1.05, 1, Rcur * 1.05);
      drawMesh(X, this.res.glow, m, [1, 0.8, 0.5], 0.22 * tod.night);
    }
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    const tiltS = asp > 1 ? [0.46, 0.3, 0.8] : [0.5, 0.33, 0.8];
    postFX(X, Wp, Hp, Object.assign(tod.night > 0.6 ? { bloom: 0.8, th: 0.64, white: 0.25, sat: 1.1, con: 0.12, vig: 0.72 } : tod.night > 0.2 ? { bloom: 0.58, th: 0.74, white: 0.3, sat: 1.1, con: 0.14, vig: 0.62 } : { bloom: 0.4, th: 0.85, white: 0.2, sat: 1.08, con: 0.14, vig: 0.55 }, { tilt: tiltS }));
  }

  // WebGL yoksa: üstten görünüm
  draw2d() {
    const g = this.g2;
    const cv = this.el.cv;
    const w = this.el.wrap.clientWidth || 1, h = this.el.wrap.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = LAKE_PAL[this.variant % 3][0]; g.fillRect(0, 0, w, h);
    const A = this.arena;
    const t = Math.max(0, this.simNow());
    const R = SU.radiusAt(A, t);
    const sc = Math.min(w, h * 0.8) / (A.r0 * 2.3);
    const cx = w / 2, cy = h * 0.46;
    g.fillStyle = '#f3ead4'; g.strokeStyle = '#d9a441'; g.lineWidth = 5;
    g.beginPath(); g.arc(cx, cy, R * sc, 0, 7); g.fill(); g.stroke();
    A.bumpers.forEach((b) => { if (SU.bumperOn(A, b, t)) { g.fillStyle = '#d4432c'; g.beginPath(); g.arc(cx + b.x * sc, cy + b.y * sc, b.r * sc, 0, 7); g.fill(); } });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    this.bod.forEach((s, i) => {
      if (s.gone) return;
      const pl = this.view?.players?.[i];
      g.fillStyle = pcol(pl ? pl.c : i);
      g.beginPath(); g.arc(cx + s.x * sc, cy + s.y * sc * 1 + (s.fl & 2 ? 14 : 0), SU.BR * sc, 0, 7); g.fill();
      g.strokeStyle = i === this.my ? '#fff' : '#222'; g.lineWidth = i === this.my ? 4 : 2; g.stroke();
      g.font = `${Math.max(14, SU.BR * sc * 1.2)}px system-ui`;
      g.fillText('🤼', cx + s.x * sc, cy + s.y * sc);
    });
  }

  /* ---------- HUD ---------- */
  hud(sNow) {
    const v = this.view;
    if (!v) return;
    const t = this.simNow();
    const live = v.phase === 'ready' || v.phase === 'play';
    const showHud = (live && !!v.startAt) || v.phase === 'result';
    const vis = showHud ? 'visible' : 'hidden';
    if (this.el.hud.style.visibility !== vis) this.el.hud.style.visibility = vis;
    // geri sayım
    if (v.phase === 'ready' || (v.phase === 'play' && t < 0.6)) {
      const left = -t;
      const n = Math.ceil(left);
      if (left > 0 && left <= 3 && n !== this.lastBeep) { this.lastBeep = n; this.msg(String(n), 'big'); this.snd.fx('beep'); }
      if (left <= 0 && this.lastBeep > 0 && this.lastBeep < 99) { this.lastBeep = 0; this.msg('İTİŞ! 🤼', 'big gold'); this.snd.fx('go'); vibrate(40); if (v.round === 1 && v.me >= 0) this.toastK('🕹️ Sola sürükle · 💨 sağa dokun = atıl', 3600); }
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
    // kontroller
    const m = this.mine;
    const ctlOn = !!m && v.phase === 'play' && !m.fall && m.alive && !this.over && t > -3.2;
    const ctlShow = !!m && (v.phase === 'play' || (v.phase === 'ready' && t > -3.3)) && !m?.fall;
    this.el.hint.classList.toggle('off', !(ctlShow && !this.joy && (v.phase === 'play' || v.phase === 'ready') && !this.panelLow));
    this.el.dash.classList.toggle('off', !ctlShow || this.panelLow);
    const ready = !!m && m.cd <= 0;
    this.el.dash.classList.toggle('rdy', ctlOn && ready);
    this.el.dash.style.setProperty('--p', m ? String(clamp(1 - m.cd / SU.DASH_CD, 0, 1)) : '1');
    void ctlOn;
    // not
    let note = '';
    if (v.phase === 'play' && !m && v.me < 0) note = '👀 Bu turu izliyorsun — sonraki turda sen de varsın!';
    else if (v.phase === 'play' && m && (m.fall || !m.alive) && !this.over) note = '🍅 Sosa düştün — turu izliyorsun';
    if (note !== this.noteText) { this.noteText = note; this.el.note.textContent = note; this.el.note.classList.toggle('on', !!note); }
    if (!showHud) return;
    const rt = v.phase === 'play' ? Math.max(0, t) : 0;
    const mm = Math.floor(rt / 60), ss = Math.floor(rt % 60);
    const tt = v.phase === 'result' ? '🏁' : `${mm}:${String(ss).padStart(2, '0')}`;
    if (tt !== this.ttText) { this.ttText = tt; this.el.tm.textContent = tt; }
    const pb = String(v.phase === 'play' ? (this.alive ?? v.n) : v.n), ps = `/${v.n}`;
    if (this.el.posB.textContent !== pb) { this.el.posB.textContent = pb; if (v.phase === 'play' && t > 1) { this.el.pos.classList.add('pulse'); setTimeout(() => this.el.pos.classList.remove('pulse'), 220); } }
    if (this.el.posS.textContent !== ps) this.el.posS.textContent = ps;
    const ko = `💥 ${this.myKo || 0}`;
    if (this.el.ko.textContent !== ko) this.el.ko.textContent = ko;
    this.el.ko.style.display = v.me >= 0 ? '' : 'none';
    const rn = `${v.round}/${v.rounds} · ${this.V.emoji} ${this.V.name}`;
    if (this.el.rnd.textContent !== rn) this.el.rnd.textContent = rn;
  }

  labels() {
    const vis = new Set();
    const bod = this.bod;
    const pls = this.view?.players || [];
    const sc = clamp(1.25 - this.cam.D / 90, 0.7, 1.05);
    const L = [];
    bod.forEach((s, i) => {
      const pl = pls[i];
      if (!this.X || !pl || s.gone || (s.fl & 2 && s.z < -0.4)) return;
      const p = this.project(s.x, (s.fl & 2 ? s.z : 0) + 2.9, s.y);
      if (!p) return;
      vis.add(i);
      if (!s.lbl) {
        s.lbl = document.createElement('div');
        s.lbl.className = 'lbl';
        s.lbl.innerHTML = `<i style="background:${pcol(pl.c)}"></i>${esc(pl.n)}`;
        this.el.lbls.appendChild(s.lbl);
      }
      L.push({ o: s, x: p[0], y: p[1], op: pl.on ? 1 : 0.5 });
    });
    placeLabels(L, sc);
    bod.forEach((s, i) => { if (s.lbl && !vis.has(i)) s.lbl.style.display = 'none'; });
  }

  /* ---------- ağ ---------- */
  net() {
    const v = this.view;
    if (!v || v.phase !== 'play' || !this.mine || this.simNow() < 0) return;
    const [x, y] = this.inputVec();
    const m = this.mine;
    const dead = m.fall || !m.alive || this.over;
    const nx = dead ? 0 : Math.round(x * 100) / 100, ny = dead ? 0 : Math.round(y * 100) / 100;
    const now = performance.now();
    const changed = Math.abs(nx - this.sx) > 0.04 || Math.abs(ny - this.sy) > 0.04 || ((nx === 0 && ny === 0) && (this.sx !== 0 || this.sy !== 0));
    const dash = this.dashSend;
    if (!dash && !(changed && now - this.lastSend >= 55)) return;
    this.lastSend = now;
    this.sx = nx; this.sy = ny;
    const p = { x: nx, y: ny };
    if (dash) { p.d = 1; this.dashSend = false; }
    try {
      if (this.ctx.sendQuiet) this.ctx.sendQuiet('input', p);
      else this.ctx.send('input', p);
    } catch { /* yok say */ }
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
      this.stepMine(sNow);
      this.sampleOthers(dt);
      this.stepBodies(dt);
      this.stepArena(dt);
      this.stepParts(dt);
      this.stepCam(dt);
      this.stepAvs(dt);
      this.net();
      this.draw(sNow);
      this.labels();
      this.hud(sNow);
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[sumo]', e); }
    }
  }

  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.initMeshes();
      this.W = null;
      if (this.arena) this.buildWorld();
    } catch (e) { console.warn('[sumo] geri yükleme', e); }
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
        Object.values(this.chefs || {}).forEach((mm) => freeMesh(this.X, mm));
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
    console.error('[sumo]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

// Test ve hata ayıklama için (oyunda kullanılmaz)
export const _dbg = () => ({ G, SU });
// Model görüntüleyici için (oyunda kullanılmaz)
export const _mdl = () => ({ gMozz, GARN, GARN_W, HERO, gBurger, gDrum, gWrap, gRiceBowl, coat, sprinkleModel, LAKE_PAL, lakeH, mix3s });
