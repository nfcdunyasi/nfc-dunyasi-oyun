// Kurye Yarışı — 3D yarış oyunu (NFC Dünyası Oyun)
// Dış kütüphane yok: kendi küçük WebGL motoru, düşük poligonlu şehir, işletmenin rengi/logosu/yiyecekleri.
// Herkes aynı pistte kendi telefonunda sürer; sunucu ilerlemeleri toplar, rakipler "hayalet" olarak görünür.
import * as sfx from '../sfx.js?v=2026-11-24-a';

// Ortak çekirdek (sunucudaki botlar da birebir aynı kodu kullanır)
const KY = (() => {
  // Kurye Yarışı çekirdeği: pist üretimi + fizik + bot sürücü.
  // Sunucu (botlar, doğrulama) ve telefon (oyuncunun kendi kuryesi) AYNI kodu çalıştırır.
  const LEN = 1000;          // pist uzunluğu (m)
  const LANE_W = 2.3;        // şerit genişliği (m)
  const V0 = 12, ACC = 1.25, VMAX = 24;                // başlangıç hızı, ivme, tavan hız (m/sn)
  const TURBO_MUL = 1.45, TURBO_T = 2.6, PAD_T = 1.8, NEED = 10;  // 10 yiyecek = turbo
  const GRAV = 26, JUMP_V = 8.8, RAMP_V = 12.5, STEER = 15;
  const HALF_L = 0.85, HALF_W = 0.38;                 // motorun yarı boyu / yarı genişliği
  const MIN_TIME = 30;                                // fiziksel olarak mümkün en kısa süre (sn)
  const laneX = (l) => (l - 1) * LANE_W;

  // kind: low = zıplanabilir, heavy = şerit değiştir, puddle = yavaşlatır, ramp = uçurur, pad = turbo
  const SPEC = {
    cone: { l: 0.32, w: 0.36, h: 0.78, kind: 'low' },
    barrier: { l: 0.28, w: 0.98, h: 1.0, kind: 'low' },
    car: { l: 2.1, w: 0.95, h: 1.55, kind: 'heavy' },
    van: { l: 2.5, w: 1.0, h: 2.25, kind: 'heavy' },
    bus: { l: 5.2, w: 1.05, h: 2.9, kind: 'heavy' },
    puddle: { l: 1.5, w: 0.95, h: 0.05, kind: 'puddle' },
    ramp: { l: 1.6, w: 1.0, h: 0.75, kind: 'ramp' },
    pad: { l: 1.3, w: 0.95, h: 0.03, kind: 'pad' },
  };

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

  // ---------------- pist ----------------
  function track(seed) {
    const R = rng(seed);
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const pick = (a) => a[Math.floor(R() * a.length)];
    const obs = [];
    const items = [];
    const O = (k, lane, z) => {
      const s = SPEC[k];
      obs.push({ k, lane, z, x: laneX(lane), l: s.l, w: s.w, h: s.h, v: ri(0, 99) });
    };
    const line = (lane, z, n, gap = 3) => { for (let i = 0; i < n; i++) items.push({ lane, z: z + i * gap, y: 0.95 }); };
    const arc = (lane, z0, z1, n, h, base = 0.95) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        items.push({ lane, z: z0 + (z1 - z0) * t, y: base + Math.sin(t * Math.PI) * h });
      }
    };
    const others = (a) => [0, 1, 2].filter((x) => x !== a);

    const P = {
      single(z, k) {
        const a = ri(0, 2);
        O(pick(k < 0.3 ? ['cone', 'barrier', 'car', 'car'] : ['barrier', 'car', 'van', 'car', 'cone']), a, z);
        line(pick(others(a)), z - 5, 3);
        return 6;
      },
      double(z) {
        const f = ri(0, 2);
        others(f).forEach((l, i) => O(pick(['car', 'car', 'van']), l, z + (i ? ri(-1, 2) : 0)));
        line(f, z - 6, 3);
        return 8;
      },
      wall(z) {
        [0, 1, 2].forEach((l) => O(R() < 0.5 ? 'barrier' : 'cone', l, z));
        arc(ri(0, 2), z - 6, z + 6, 5, 1.25);
        return 6;
      },
      zigzag(z, k) {
        const f1 = ri(0, 2);
        others(f1).forEach((l) => O('car', l, z));
        const f2 = pick(others(f1));
        const gap = k > 0.6 ? 19 : 23;
        others(f2).forEach((l) => O(pick(['car', 'van']), l, z + gap));
        line(f1, z - 5, 3);
        line(f2, z + gap - 9, 3);
        return gap + 4;
      },
      ramp(z) {
        const a = ri(0, 2);
        O('ramp', a, z);
        O('car', a, z + 8.5);
        others(a).forEach((l) => O('cone', l, z + 2));
        arc(a, z + 2, z + 18, 5, 1.9, 1.4);
        return 20;
      },
      puddle(z) {
        const f = ri(0, 2);
        others(f).forEach((l) => O('puddle', l, z + ri(-1, 1)));
        line(f, z - 4, 4, 2.6);
        return 6;
      },
      turbo(z) {
        const a = ri(0, 2);
        O('pad', a, z);
        O('car', pick(others(a)), z + 7);
        line(a, z + 4, 4, 3);
        return 16;
      },
      bus(z) {
        const a = ri(0, 2);
        O('bus', a, z + 5);
        const rest = others(a);
        const b = pick(rest);
        O('barrier', b, z);
        line(rest.find((x) => x !== b), z - 3, 4, 3);
        return 12;
      },
      slalom(z) {
        const order = R() < 0.5 ? [0, 1, 2] : [2, 1, 0];
        order.forEach((l, i) => O(i === 1 ? 'barrier' : 'cone', l, z + i * 11));
        line(order[2], z - 2, 3, 3);
        line(order[0], z + 14, 3, 3);
        return 24;
      },
    };
    const W = (k) => k < 0.18
      ? { single: 4, double: 2, puddle: 2, turbo: 1, wall: k > 0.1 ? 1 : 0 }
      : k < 0.5
        ? { single: 2, double: 3, wall: 2, ramp: 2, puddle: 1, turbo: 1, zigzag: 1, bus: 1, slalom: 1 }
        : { single: 1, double: 2, wall: 2, ramp: 2, zigzag: 3, bus: 2, turbo: 1, puddle: 1, slalom: 1 };
    const choose = (k, last) => {
      const w = W(k);
      for (let tries = 0; tries < 3; tries++) {
        let sum = 0;
        for (const n in w) sum += w[n];
        let x = R() * sum;
        for (const n in w) {
          x -= w[n];
          if (x <= 0) { if (n !== last || tries === 2) return n; break; }
        }
      }
      return 'single';
    };

    line(1, 22, 3, 3.2); // ısınma: ilk yiyecekler
    let z = 58;
    let last = '';
    while (z < LEN - 95) {
      const k = z / LEN;
      const name = choose(k, last);
      last = name;
      z += P[name](z, k) + (30 - 9 * k) + R() * 8;
    }
    // final: turbo pedi + son düzlük
    O('pad', ri(0, 2), LEN - 72);

    obs.sort((a, b) => (a.z - a.l) - (b.z - b.l));
    obs.forEach((o, i) => { o.id = i; });
    items.sort((a, b) => a.z - b.z);
    items.forEach((it, i) => { it.id = i; it.x = laneX(it.lane); });
    return { seed, len: LEN, obs, items };
  }

  // ---------------- fizik ----------------
  // Başlangıç ızgarası: sırayla orta, sol, sağ şerit; her üç kuryede bir sıra geri
  const grid = (i) => ({ lane: [1, 0, 2][i % 3], d: -1.9 * Math.floor(i / 3) });
  function runner(lane = 1, d0 = 0) {
    return {
      d: d0, x: laneX(lane), lane, y: 0, vy: 0, v: 0, t: 0, air: false,
      stun: 0, stunMax: 1, stunK: 1, slow: 0, turbo: 0, meter: 0, inv: 0,
      hits: 0, items: 0, done: false, ft: 0, oi: 0, ii: 0, jumpQ: -1,
      got: new Set(), hit: new Set(), ev: [],
    };
  }

  function stun(r, t, k, name, id) {
    r.stun = t; r.stunMax = t; r.stunK = k; r.inv = t + 0.45; r.hits += 1;
    r.meter = Math.max(0, r.meter - 1);
    r.v *= k;
    r.ev.push(`${name}:${id}`);
  }

  // Ağır engele çarpınca: geri it, en yakın boş şeride kaçır (takılı kalmasın)
  function escapeLane(r, T, o) {
    let best = r.lane;
    let bd = Infinity;
    for (let L = 0; L < 3; L++) {
      let blocked = false;
      for (let i = r.oi; i < T.obs.length; i++) {
        const q = T.obs[i];
        if (q.z - q.l > o.z + o.l + 6) break;
        if (q.z + q.l < r.d - 1) continue;
        if (SPEC[q.k].kind === 'heavy' && Math.abs(q.x - laneX(L)) < q.w + HALF_W) { blocked = true; break; }
      }
      if (blocked) continue;
      const dd = Math.abs(laneX(L) - r.x) + (L === r.lane ? 0 : 0.01);
      if (dd < bd) { bd = dd; best = L; }
    }
    return best;
  }

  function step(r, T, dt, inp) {
    if (r.done) {
      r.v = Math.max(0, r.v - 16 * dt);
      r.d += r.v * dt;
      if (r.air) {
        r.vy -= GRAV * dt; r.y += r.vy * dt;
        if (r.y <= 0) { r.y = 0; r.vy = 0; r.air = false; }
      }
      return;
    }
    r.t += dt;
    if (inp) {
      if (inp.l) { inp.l = 0; if (r.lane > 0) { r.lane -= 1; r.ev.push('lane'); } }
      if (inp.r) { inp.r = 0; if (r.lane < 2) { r.lane += 1; r.ev.push('lane'); } }
      if (inp.j) { inp.j = 0; r.jumpQ = r.t; }
    }
    if (r.jumpQ >= 0) {
      if (!r.air && r.stun < r.stunMax * 0.6) {
        r.vy = JUMP_V; r.air = true; r.y = 0.001; r.jumpQ = -1; r.ev.push('jump');
      } else if (r.t - r.jumpQ > 0.16) r.jumpQ = -1;
    }
    // yana kayma
    const dx = laneX(r.lane) - r.x;
    const mx = STEER * dt;
    r.x += Math.abs(dx) <= mx ? dx : Math.sign(dx) * mx;
    // dikey
    if (r.air) {
      r.vy -= GRAV * dt;
      r.y += r.vy * dt;
      if (r.y <= 0) { r.y = 0; r.vy = 0; r.air = false; r.ev.push('land'); }
    }
    r.stun = Math.max(0, r.stun - dt);
    r.slow = Math.max(0, r.slow - dt);
    r.turbo = Math.max(0, r.turbo - dt);
    r.inv = Math.max(0, r.inv - dt);
    // hız
    const base = Math.min(VMAX, V0 + ACC * r.t);
    let target = base * (r.turbo > 0 ? TURBO_MUL : 1) * (r.slow > 0 ? 0.55 : 1);
    if (r.stun > 0) target *= r.stunK + (1 - r.stunK) * (1 - r.stun / r.stunMax);
    r.v += (target - r.v) * Math.min(1, dt * (target > r.v ? 2.6 : 9));
    r.d += r.v * dt;

    // engeller
    while (r.oi < T.obs.length && T.obs[r.oi].z + T.obs[r.oi].l < r.d - 3) r.oi += 1;
    for (let i = r.oi; i < T.obs.length; i++) {
      const o = T.obs[i];
      if (o.z - o.l > r.d + HALF_L) break;
      if (Math.abs(o.z - r.d) > o.l + HALF_L) continue;
      if (Math.abs(o.x - r.x) > o.w + HALF_W) continue;
      if (r.hit.has(o.id)) continue;
      const kind = SPEC[o.k].kind;
      if (kind === 'ramp') {
        if (r.y < 0.4) { r.hit.add(o.id); r.vy = RAMP_V; r.air = true; r.y = Math.max(r.y, 0.01); r.jumpQ = -1; r.ev.push('ramp'); }
        continue;
      }
      if (kind === 'pad') {
        if (r.y < 0.3) { r.hit.add(o.id); r.turbo = Math.max(r.turbo, PAD_T); r.ev.push('pad'); }
        continue;
      }
      if (kind === 'puddle') {
        if (r.y < 0.15) { r.hit.add(o.id); r.slow = 1.0; r.ev.push('splash'); }
        continue;
      }
      if (r.y >= o.h) continue; // üstünden geçti
      r.hit.add(o.id);
      if (kind === 'low') {
        if (r.turbo > 0) { r.ev.push(`smash:${o.id}`); continue; }
        if (r.inv > 0) continue;
        if (o.k === 'cone') stun(r, 0.9, 0.45, 'cone', o.id);
        else stun(r, 1.2, 0.3, 'bonk', o.id);
        continue;
      }
      // ağır: araba / minibüs / otobüs
      if (r.inv > 0) { r.d = Math.min(r.d, o.z - o.l - HALF_L - 0.05); r.lane = escapeLane(r, T, o); continue; }
      stun(r, 1.6, 0.12, 'crash', o.id);
      r.d = Math.min(r.d, o.z - o.l - HALF_L - 0.05);
      r.lane = escapeLane(r, T, o);
      r.hit.delete(o.id); // kaçamazsa tekrar çarpabilsin
    }

    // yiyecekler
    while (r.ii < T.items.length && T.items[r.ii].z < r.d - 2) r.ii += 1;
    for (let i = r.ii; i < T.items.length; i++) {
      const it = T.items[i];
      if (it.z > r.d + 1.25) break;
      if (r.got.has(i)) continue;
      if (Math.abs(it.z - r.d) < 1.25 && Math.abs(it.x - r.x) < 0.95 && Math.abs(r.y + 0.8 - it.y) < 1.0) {
        r.got.add(i); r.items += 1; r.meter += 1; r.ev.push(`item:${i}`);
        if (r.meter >= NEED) { r.meter = 0; r.turbo = TURBO_T; r.ev.push('turbo'); }
      }
    }

    if (r.d >= T.len) { r.done = true; r.ft = r.t; r.d = T.len; r.ev.push('finish'); }
  }

  // ---------------- bot sürücü ----------------
  // mem: { blind: {} } — botun "göremediği" engeller (beceriye göre)
  function bot(r, T, mem, skill, rnd) {
    const inp = { l: 0, r: 0, j: 0 };
    if (r.done) return inp;
    const v = Math.max(r.v, 9);
    const look = v * (0.45 + 0.6 * skill) + 3;
    const cost = [0, 0, 0];
    for (let L = 0; L < 3; L++) cost[L] += Math.abs(L - r.lane) * 0.6;
    const sees = (o) => {
      if (mem.blind[o.id] === undefined) mem.blind[o.id] = rnd() < (1 - skill) * 0.5;
      return !mem.blind[o.id];
    };
    for (let i = r.oi; i < T.obs.length; i++) {
      const o = T.obs[i];
      const dz = (o.z - o.l) - r.d;
      if (dz > look) break;
      if (o.z + o.l < r.d - HALF_L) continue;
      if (r.hit.has(o.id) || !sees(o)) continue;
      const w = 1 + Math.max(0, 1 - dz / look);
      const kind = SPEC[o.k].kind;
      for (let L = 0; L < 3; L++) {
        if (Math.abs(laneX(L) - o.x) > o.w + HALF_W) continue;
        if (kind === 'ramp') cost[L] -= 2.5;
        else if (kind === 'pad') cost[L] -= 3;
        else if (kind === 'puddle') cost[L] += 2.5 * w;
        else if (kind === 'low') cost[L] += (r.turbo > 0.6 ? 0.1 : 3) * w;
        else cost[L] += 40 * w;
      }
    }
    for (let i = r.ii; i < T.items.length; i++) {
      const it = T.items[i];
      const dz = it.z - r.d;
      if (dz > look) break;
      if (dz < 0 || r.got.has(i) || it.y > 1.7) continue;
      cost[it.lane] -= 0.7 * skill * skill;
    }
    let best = r.lane;
    let bc = Infinity;
    for (let L = 0; L < 3; L++) {
      let c = cost[L];
      if (Math.abs(L - r.lane) === 2) c += Math.max(0, cost[1]) * 0.6;
      if (c < bc - 0.01) { bc = c; best = L; }
    }
    if (best < r.lane) inp.l = 1;
    else if (best > r.lane) inp.r = 1;
    if (!r.air) {
      for (let i = r.oi; i < T.obs.length; i++) {
        const o = T.obs[i];
        const dz = (o.z - o.l) - r.d;
        if (dz > v * 0.6 + 2) break;
        if (dz < 0 || r.hit.has(o.id) || mem.blind[o.id]) continue;
        if (SPEC[o.k].kind !== 'low' || r.turbo > 0.5) continue;
        if (Math.abs(o.x - laneX(best)) > o.w + HALF_W && Math.abs(o.x - r.x) > o.w + HALF_W) continue;
        const lead = HALF_L + v * (0.27 + (rnd() - 0.5) * 0.22 * (1.15 - skill));
        if (dz <= lead) { inp.j = 1; break; }
      }
      // yiyecek kemeri: üstünde zıplanacak sıra varsa
      if (!inp.j && skill > 0.6) {
        for (let i = r.ii; i < T.items.length; i++) {
          const it = T.items[i];
          const dz = it.z - r.d;
          if (dz > v * 0.5) break;
          if (dz < 0 || r.got.has(i) || it.lane !== best || it.y < 1.7 || it.y > 2.4) continue;
          if (dz <= v * 0.3) { inp.j = 1; break; }
        }
      }
    }
    return inp;
  }

  return { LEN, LANE_W, V0, VMAX, TURBO_MUL, NEED, JUMP_V, GRAV, MIN_TIME, SPEC, laneX, grid, rng, track, runner, step, bot };
})();

/* ============================ yardımcılar ============================ */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexRGB = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const C = (h, e = 0) => [...(typeof h === 'string' ? hexRGB(h) : h), e];
const shade = (c, f) => [clamp(c[0] * f, 0, 1), clamp(c[1] * f, 0, 1), clamp(c[2] * f, 0, 1), c[3] ?? 0];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), a[3] ?? 0];
const fmtSec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} sn`;
const PLAYER_COLORS = ['#FF3B30', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9F0A', '#FF6FB5', '#40C8E0', '#A8E10C', '#F2F2F7', '#A0522D', '#5E5CE6'];
const pcol = (i) => PLAYER_COLORS[((i % 12) + 12) % 12];

/* ============================ matris ============================ */

const M = {
  make: () => new Float32Array(16),
  persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2);
    o.fill(0);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f);
    return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
    return o;
  },
  look(o, ex, ey, ez, cx, cy, cz) {
    let fx = cx - ex, fy = cy - ey, fz = cz - ez;
    let l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
    let sx = -fz, sy = 0, sz = fx; // f x (0,1,0)
    l = Math.hypot(sx, sy, sz) || 1; sx /= l; sy /= l; sz /= l;
    const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
    o[0] = sx; o[4] = sy; o[8] = sz;
    o[1] = ux; o[5] = uy; o[9] = uz;
    o[2] = -fx; o[6] = -fy; o[10] = -fz;
    o[3] = 0; o[7] = 0; o[11] = 0;
    o[12] = -(sx * ex + sy * ey + sz * ez);
    o[13] = -(ux * ex + uy * ey + uz * ez);
    o[14] = fx * ex + fy * ey + fz * ez;
    o[15] = 1;
    return o;
  },
  mul(o, a, b) {
    const r = M._t || (M._t = new Float32Array(16));
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        r[i + 4 * j] = a[i] * b[4 * j] + a[i + 4] * b[4 * j + 1] + a[i + 8] * b[4 * j + 2] + a[i + 12] * b[4 * j + 3];
      }
    }
    o.set(r);
    return o;
  },
  // Düzlemsel gölge: o = S(L, h) * m — m modelini y = h düzlemine, ışık yönü L (yüzeyden ışığa) boyunca yansıtır
  shadow(o, m, L, h) {
    const kx = L[0] / L[1], kz = L[2] / L[1];
    for (let c = 0; c < 4; c++) {
      const x = m[c * 4], y = m[c * 4 + 1], z = m[c * 4 + 2], w = m[c * 4 + 3];
      o[c * 4] = x - kx * (y - h * w);
      o[c * 4 + 1] = h * w;
      o[c * 4 + 2] = z - kz * (y - h * w);
      o[c * 4 + 3] = w;
    }
    return o;
  },
  // T * Ry * Rx * Rz * S
  set(o, x, y, z, ry = 0, rx = 0, rz = 0, s = 1, sy2 = s, sz2 = s) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    o[0] = (cy * cz + sy * sx * sz) * s; o[1] = (cx * sz) * s; o[2] = (-sy * cz + cy * sx * sz) * s; o[3] = 0;
    o[4] = (-cy * sz + sy * sx * cz) * sy2; o[5] = (cx * cz) * sy2; o[6] = (sy * sz + cy * sx * cz) * sy2; o[7] = 0;
    o[8] = (sy * cx) * sz2; o[9] = (-sx) * sz2; o[10] = (cy * cx) * sz2; o[11] = 0;
    o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
    return o;
  },
};

/* ============================ WebGL ============================ */

const SH = {
  litV: `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;
uniform mat4 uVP;uniform mat4 uM;uniform vec3 uCam;uniform vec3 uLamp;uniform mat4 uLVP;uniform mediump vec4 uOut;
varying vec3 vN;varying vec4 vC;varying vec3 vR;varying vec3 vL;varying vec4 vS;varying vec3 vW;
void main(){vec4 w=uM*vec4(aP,1.0);vec3 nw=(uM*vec4(aN,0.0)).xyz;
if(uOut.z>0.5){w.xyz+=normalize(nw)*uOut.x;w.xyz+=normalize(w.xyz-uCam)*uOut.y;}
vN=nw;vC=aC;vR=w.xyz-uCam;vL=uLamp-w.xyz;vS=uLVP*w;vW=w.xyz;gl_Position=uVP*w;}`,
  litF: `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN;varying vec4 vC;varying vec3 vR;varying vec3 vL;varying vec3 vW;uniform sampler2D uDet;uniform vec4 uDetK;uniform vec3 uAO;
float det(vec3 n){if(uDetK.w<0.5)return 1.0;vec3 a=abs(n);vec2 uv=(a.y>max(a.x,a.z)?vW.xz:(a.x>a.z?vW.zy:vW.xy))*uDetK.yz;
vec2 q=texture2D(uDet,uv).rg;float g2=texture2D(uDet,uv*0.21+0.37).g;
return 1.0+((q.r-0.5)*0.75+(g2-0.5)*0.55+(q.g-0.5)*0.25)*uDetK.x;}
uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;uniform vec3 uGnd;uniform vec3 uFog;uniform vec3 uLampC;uniform vec3 uWarm;uniform vec3 uTint;
uniform vec2 uFogR;uniform float uNight;uniform float uAlpha;uniform float uGlow;uniform mediump vec4 uOut;uniform vec3 uOutC;uniform vec4 uRim;
uniform sampler2D uShd;uniform vec3 uShdK;varying vec4 vS;uniform float uWet;uniform vec4 uWave;
float unpk(vec4 c){return dot(c,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0));}
float shd(vec3 n){if(uShdK.z<0.5)return 1.0;vec3 p=vS.xyz*0.5+0.5;vec2 e=min(p.xy,1.0-p.xy);
if(e.x<0.0||e.y<0.0||p.z>1.0)return 1.0;
float nl=clamp(dot(n,uSun),0.0,1.0);float d=p.z-uShdK.y*(1.0+2.5*sqrt(1.0-nl*nl)/max(nl,0.2));
float t=uShdK.x;vec2 g=p.xy/t-0.5;vec2 f=fract(g);vec2 b=(floor(g)+0.5)*t;
float a0=step(d,unpk(texture2D(uShd,b)));float a1=step(d,unpk(texture2D(uShd,b+vec2(t,0.0))));
float a2=step(d,unpk(texture2D(uShd,b+vec2(0.0,t))));float a3=step(d,unpk(texture2D(uShd,b+vec2(t,t))));
float s=mix(mix(a0,a1,f.x),mix(a2,a3,f.x),f.y);return mix(1.0,s,smoothstep(0.0,0.06,min(e.x,e.y)));}
void main(){if(uOut.z>0.5){float fo=clamp((length(vR)-uFogR.x)/(uFogR.y-uFogR.x),0.0,1.0);gl_FragColor=vec4(mix(uOutC,uFog,fo*fo*(3.0-2.0*fo)),uAlpha);return;}
vec3 n=normalize(vN);
if(uWave.w>0.0){float t=uWave.x;vec2 q=vW.xz*uWave.z;vec2 g=vec2(cos(q.x*1.7+t*1.9)+0.6*cos(q.x*2.9-q.y*1.3+t*2.7),cos(q.y*1.9-t*1.6)+0.6*cos(q.y*3.1+q.x*1.1-t*2.3));n=normalize(n+vec3(g.x,0.0,g.y)*uWave.y);}
vec3 b=vC.rgb*uTint*det(n);float sh=shd(n);
float wt=uWet*smoothstep(0.82,0.97,n.y)*step(vC.a,0.25)*(1.0-smoothstep(0.35,1.2,vW.y));b*=1.0-0.42*wt;
vec3 c=b*(mix(uGnd,uSky,n.y*0.5+0.5)+uSunC*max(dot(n,uSun),0.0)*sh);
float ld=length(vL);vec3 lv=vL/max(ld,0.001);float la=1.0/(1.0+ld*ld*0.05);c+=b*uLampC*max(dot(n,lv),0.0)*la;
float sp=max(max(-vC.a,0.0),wt*0.92)*min(1.0,uTint.r+uTint.g+uTint.b);
if(sp>0.0){vec3 v=-normalize(vR);float st=0.25+0.75*sp;float sh2=8.0+110.0*sp*sp;
c+=uSunC*pow(max(dot(n,normalize(uSun+v)),0.0),sh2)*st*sh+uLampC*la*pow(max(dot(n,normalize(lv+v)),0.0),sh2)*st*1.6;
float fr=pow(1.0-max(dot(n,v),0.0),4.0);c+=mix(uGnd,uSky,clamp(reflect(-v,n).y*0.5+0.5,0.0,1.0))*fr*st*0.55;}
if(uRim.a>0.0){vec3 vv=-normalize(vR);c+=uRim.rgb*pow(1.0-max(dot(n,vv),0.0),2.2)*uRim.a*(0.55+0.45*sh);}
if(uAO.z>0.0){float ao=mix(1.0-uAO.z,1.0,smoothstep(0.0,uAO.y,vW.y-uAO.x));c*=mix(1.0,ao,1.0-smoothstep(0.55,0.9,abs(n.y)));}
float e=vC.a>0.75?1.0:(vC.a>0.25?uNight:0.0);
vec3 g=vC.a>0.75?b*uGlow:uWarm*(0.7+0.6*vC.r);
c=mix(c,g,e);
float f=clamp((length(vR)-uFogR.x)/(uFogR.y-uFogR.x),0.0,1.0);
gl_FragColor=vec4(mix(c,uFog,f*f*(3.0-2.0*f)),uAlpha);}`,
  texV: `attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;
uniform mat4 uVP;uniform mat4 uM;uniform vec3 uCam;uniform vec3 uLamp;uniform mat4 uLVP;
varying vec3 vN;varying vec2 vT;varying vec3 vR;varying vec3 vL;varying vec4 vS;
void main(){vec4 w=uM*vec4(aP,1.0);vN=(uM*vec4(aN,0.0)).xyz;vT=aT;vR=w.xyz-uCam;vL=uLamp-w.xyz;vS=uLVP*w;gl_Position=uVP*w;}`,
  texF: `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN;varying vec2 vT;varying vec3 vR;varying vec3 vL;
uniform sampler2D uTex;uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;uniform vec3 uGnd;uniform vec3 uFog;uniform vec2 uFogR;uniform float uSelf;uniform vec3 uTint;uniform vec3 uLampC;
uniform sampler2D uShd;uniform vec3 uShdK;varying vec4 vS;
float unpk(vec4 c){return dot(c,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0));}
float shd(vec3 n){if(uShdK.z<0.5)return 1.0;vec3 p=vS.xyz*0.5+0.5;vec2 e=min(p.xy,1.0-p.xy);
if(e.x<0.0||e.y<0.0||p.z>1.0)return 1.0;
float nl=clamp(dot(n,uSun),0.0,1.0);float d=p.z-uShdK.y*(1.0+2.5*sqrt(1.0-nl*nl)/max(nl,0.2));
float t=uShdK.x;vec2 g=p.xy/t-0.5;vec2 f=fract(g);vec2 b=(floor(g)+0.5)*t;
float a0=step(d,unpk(texture2D(uShd,b)));float a1=step(d,unpk(texture2D(uShd,b+vec2(t,0.0))));
float a2=step(d,unpk(texture2D(uShd,b+vec2(0.0,t))));float a3=step(d,unpk(texture2D(uShd,b+vec2(t,t))));
float s=mix(mix(a0,a1,f.x),mix(a2,a3,f.x),f.y);return mix(1.0,s,smoothstep(0.0,0.06,min(e.x,e.y)));}
void main(){vec4 t=texture2D(uTex,vT);if(t.a<0.05)discard;vec3 n=normalize(vN);vec3 b=t.rgb*uTint;
vec3 c=b*(mix(uGnd,uSky,n.y*0.5+0.5)+uSunC*max(dot(n,uSun),0.0)*shd(n));
float ld=length(vL);vec3 lv=vL/max(ld,0.001);c+=b*uLampC*max(dot(n,lv),0.0)/(1.0+ld*ld*0.05);
c=mix(c,b*1.05,uSelf);
float f=clamp((length(vR)-uFogR.x)/(uFogR.y-uFogR.x),0.0,1.0);
gl_FragColor=vec4(mix(c,uFog,f*f*(3.0-2.0*f)),1.0);}`,
  fsV: `attribute vec2 aP;varying vec2 vU;void main(){vU=aP*0.5+0.5;gl_Position=vec4(aP,0.0,1.0);}`,
  brF: `precision mediump float;varying vec2 vU;uniform sampler2D uT;uniform vec2 uPx;uniform vec2 uTh;
void main(){vec3 c=texture2D(uT,vU+uPx*vec2(-1.0,-1.0)).rgb+texture2D(uT,vU+uPx*vec2(1.0,-1.0)).rgb+texture2D(uT,vU+uPx*vec2(-1.0,1.0)).rgb+texture2D(uT,vU+uPx*vec2(1.0,1.0)).rgb;c*=0.25;
float mx=max(c.r,max(c.g,c.b));float mn=min(c.r,min(c.g,c.b));float sat=mx>0.001?(mx-mn)/mx:0.0;
float k=smoothstep(uTh.x,uTh.x+0.2,mx)*(uTh.y+(1.0-uTh.y)*sat);gl_FragColor=vec4(c*k,1.0);}`,
  dsF: `precision mediump float;varying vec2 vU;uniform sampler2D uT;uniform vec2 uPx;
void main(){vec3 c=texture2D(uT,vU+uPx*vec2(-1.0,-1.0)).rgb+texture2D(uT,vU+uPx*vec2(1.0,-1.0)).rgb+texture2D(uT,vU+uPx*vec2(-1.0,1.0)).rgb+texture2D(uT,vU+uPx*vec2(1.0,1.0)).rgb;gl_FragColor=vec4(c*0.25,1.0);}`,
  blF: `precision mediump float;varying vec2 vU;uniform sampler2D uT;uniform vec2 uD;
void main(){vec3 c=texture2D(uT,vU).rgb*0.227;c+=(texture2D(uT,vU+uD*1.385).rgb+texture2D(uT,vU-uD*1.385).rgb)*0.316;c+=(texture2D(uT,vU+uD*3.231).rgb+texture2D(uT,vU-uD*3.231).rgb)*0.07;gl_FragColor=vec4(c,1.0);}`,
  coF: `precision mediump float;varying vec2 vU;uniform sampler2D uT;uniform sampler2D uB;uniform sampler2D uS;uniform vec4 uK;uniform vec3 uTint;uniform vec3 uTilt;uniform vec3 uRad;
void main(){vec3 c=texture2D(uT,vU).rgb;
if(uTilt.z>0.0){float k=smoothstep(uTilt.y,uTilt.y+0.16,abs(vU.y-uTilt.x))*uTilt.z;c=mix(c,texture2D(uS,vU).rgb,k);}
if(uRad.z>0.0){vec2 q=vU-uRad.xy;float k=smoothstep(0.22,0.62,length(q*vec2(1.0,0.8)))*uRad.z;vec3 bl=texture2D(uS,uRad.xy+q*0.94).rgb*0.5+texture2D(uS,uRad.xy+q*0.86).rgb*0.5;c=mix(c,bl,k);}
vec3 b=texture2D(uB,vU).rgb;c+=b*uK.x*(1.0-c*0.45);
float l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,uK.y);c=clamp(c,0.0,1.0);c=mix(c,c*c*(3.0-2.0*c),uK.z);c*=uTint;
vec2 q=vU-0.5;c*=1.0-dot(q,q)*uK.w;gl_FragColor=vec4(c,1.0);}`,
  depV: `attribute vec3 aP;uniform mat4 uLVP;uniform mat4 uM;
void main(){gl_Position=uLVP*(uM*vec4(aP,1.0));}`,
  depF: `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
void main(){vec4 e=fract(vec4(1.0,255.0,65025.0,16581375.0)*gl_FragCoord.z);e-=e.yzww*vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);gl_FragColor=e;}`,
  unV: `attribute vec3 aP;attribute vec4 aC;uniform mat4 uVP;uniform mat4 uM;uniform vec3 uCam;
varying vec4 vC;varying float vD;
void main(){vec4 w=uM*vec4(aP,1.0);vC=aC;vD=length(w.xyz-uCam);gl_Position=uVP*w;}`,
  unF: `precision mediump float;varying vec4 vC;varying float vD;uniform vec3 uFog;uniform vec2 uFogR;uniform float uAdd;uniform float uAlpha;uniform vec3 uTint;
void main(){float f=clamp((vD-uFogR.x)/(uFogR.y-uFogR.x),0.0,1.0);vec3 c=vC.rgb*uTint;
if(uAdd>0.5){gl_FragColor=vec4(c*vC.a*uAlpha*(1.0-f),1.0);}else{gl_FragColor=vec4(mix(c,uFog,f),vC.a*uAlpha);}}`,
  skyV: `attribute vec2 aP;varying vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,0.999,1.0);}`,
  skyF: `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vP;
uniform vec3 uR;uniform vec3 uU;uniform vec3 uF;uniform vec2 uTan;uniform vec3 uTop;uniform vec3 uHor;uniform vec3 uFog;uniform vec3 uSunD;uniform vec3 uSunC;uniform float uStars;uniform float uGlowS;
void main(){vec3 d=normalize(uF+vP.x*uTan.x*uR+vP.y*uTan.y*uU);float h=d.y;
vec3 c=h>0.0?mix(uHor,uTop,pow(clamp(h*1.5,0.0,1.0),0.65)):mix(uHor,uFog,clamp(-h*5.0,0.0,1.0));
vec3 dv=d-uSunD;float ad=length(dv);
if(uStars>0.5){float m=smoothstep(0.037,0.032,ad);vec2 q=vec2(dot(dv,uR),dot(dv,uU))/0.035;
float cr=1.0-0.17*smoothstep(0.36,0.1,length(q-vec2(0.32,0.22)))-0.13*smoothstep(0.26,0.05,length(q-vec2(-0.36,-0.14)))-0.11*smoothstep(0.2,0.04,length(q-vec2(0.06,-0.47)))-0.06*q.x;
c=mix(c,vec3(0.93,0.95,1.0)*cr*1.12,m);c+=uSunC*(smoothstep(0.32,0.04,ad)*0.3+smoothstep(1.0,0.1,ad)*0.08);}
else{float s=max(dot(d,uSunD),0.0);c+=uSunC*(smoothstep(0.9993,0.9996,s)*1.4+pow(s,40.0)*0.35*uGlowS+pow(s,6.0)*0.18*uGlowS);}
if(uStars>0.0&&h>0.04){vec3 q=floor(d*170.0);float r=fract(sin(dot(q,vec3(12.9898,78.233,45.164)))*43758.5453);c+=vec3(step(0.9965,r)*uStars*(0.45+0.55*fract(r*97.0)));}
gl_FragColor=vec4(c,1.0);}`,
};

// 2D yedek görünüm için bağlam: WebGL açılıp shader derlenemediyse aynı tuvalde 2D bağlam alınamaz,
// tuval (özellikleriyle) yenisiyle değiştirilir — yoksa ekran kararır
function ctx2d(el) {
  let g = null;
  try { g = el.cv.getContext('2d'); } catch { g = null; }
  if (!g) {
    const cv = el.cv.cloneNode(false);
    el.cv.replaceWith(cv);
    el.cv = cv;
    try { g = cv.getContext('2d'); } catch { g = null; }
  }
  return g;
}

function makeGL(canvas) {
  const opts = { antialias: true, alpha: false, depth: true, stencil: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  let gl = null;
  try { gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); } catch { gl = null; }
  if (!gl) {
    // bazı eski cihazlar şablon tamponu / kenar yumuşatma ile bağlam açamaz: sade ayarlarla yeniden dene
    const o2 = Object.assign({}, opts, { stencil: false, antialias: false });
    try { gl = canvas.getContext('webgl', o2) || canvas.getContext('experimental-webgl', o2); } catch { gl = null; }
  }
  if (!gl) { console.warn('[3d] WebGL açılamadı: tarayıcı ya da cihaz desteklemiyor (2D görünüme geçildi)'); return null; }
  // cihaz bilgisi (uzaktan hata kaydında hangi ekran kartı olduğu görünsün) + bağlam kaybı bildirimi
  try {
    if (!window.__gpu) {
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      window.__gpu = String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).slice(0, 120);
    }
    // oyundan çıkarken bağlam bilerek kapatılır (loseContext): bu bir hata değil, bildirilmez
    const lx = gl.getExtension('WEBGL_lose_context');
    if (lx && !lx.__wrapped) { const orig = lx.loseContext.bind(lx); lx.loseContext = () => { canvas.__bye = true; orig(); }; lx.__wrapped = true; }
    if (!canvas.__lostHook) { canvas.__lostHook = true; canvas.addEventListener('webglcontextlost', () => { if (!canvas.__bye) console.warn('[3d] WebGL bağlamı kaybedildi (arka plana alma ya da bellek)'); }); }
  } catch { /* yok say */ }
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const prog = (vs, fs, attrs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
    }
    return { p, u, attrs };
  };
  const X = {
    gl,
    lit: prog(SH.litV, SH.litF, ['aP', 'aN', 'aC']),
    tex: prog(SH.texV, SH.texF, ['aP', 'aN', 'aT']),
    un: prog(SH.unV, SH.unF, ['aP', 'aC']),
    sky: prog(SH.skyV, SH.skyF, ['aP']),
    dep: prog(SH.depV, SH.depF, ['aP']),
    mkProg: prog,
    aniso: gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'),
    cur: null,
  };
  X.skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, X.skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  X.dyn = gl.createBuffer();
  X.dyn2 = gl.createBuffer();
  return X;
}

// Mesh türleri: lit = [p3 n3 c4], tex = [p3 n3 t2], un = [p3 c4]
const STRIDE = { lit: 10, tex: 8, un: 7 };
function upload(X, data, kind) {
  if (!data || !data.length) return null;
  const gl = X.gl;
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  const arr = data instanceof Float32Array ? data : new Float32Array(data);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
  return { b, n: arr.length / STRIDE[kind], kind };
}
function freeMesh(X, m) { if (m?.b) X.gl.deleteBuffer(m.b); }

function bindAttrs(X, kind) {
  const gl = X.gl;
  const s = STRIDE[kind] * 4;
  if (kind === 'lit') {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, s, 24);
  } else if (kind === 'tex') {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, s, 24);
  } else {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, s, 12);
    gl.disableVertexAttribArray(2);
  }
}

function makeTexture(X, canvas) {
  const gl = X.gl;
  const t = gl.createTexture();
  updateTexture(X, t, canvas);
  return t;
}
function updateTexture(X, t, canvas) {
  const gl = X.gl;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  const pot = (n) => (n & (n - 1)) === 0;
  if (pot(canvas.width) && pot(canvas.height)) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (X.aniso) gl.texParameterf(gl.TEXTURE_2D, X.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(X.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1));
}

/* ============================ mesh üretici ============================ */

// Düz gölgeli (low-poly) üçgenler. Normaller verilen merkezden dışarı bakacak şekilde çevrilir.
class MB {
  constructor(kind = 'lit') { this.kind = kind; this.d = []; this.m = null; this.st = []; }
  push() { this.st.push(this.m); return this; }
  pop() { this.m = this.st.pop(); return this; }
  T(x, y, z, ry = 0, rx = 0, rz = 0, s = 1, sy = s, sz = s) {
    const t = M.set(new Float32Array(16), x, y, z, ry, rx, rz, s, sy, sz);
    this.m = this.m ? M.mul(new Float32Array(16), this.m, t) : t;
    return this;
  }
  p(x, y, z) {
    const m = this.m;
    if (!m) return [x, y, z];
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  }
  tw(a, b, c, col, cen, uv) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz);
    if (L < 1e-9) return;
    nx /= L; ny /= L; nz /= L;
    if (cen) {
      const mx = (a[0] + b[0] + c[0]) / 3 - cen[0], my = (a[1] + b[1] + c[1]) / 3 - cen[1], mz = (a[2] + b[2] + c[2]) / 3 - cen[2];
      if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    }
    const d = this.d;
    if (this.kind === 'tex') {
      d.push(a[0], a[1], a[2], nx, ny, nz, uv[0], uv[1], b[0], b[1], b[2], nx, ny, nz, uv[2], uv[3], c[0], c[1], c[2], nx, ny, nz, uv[4], uv[5]);
    } else if (this.kind === 'un') {
      d.push(a[0], a[1], a[2], col[0], col[1], col[2], col[3], b[0], b[1], b[2], col[0], col[1], col[2], col[3], c[0], c[1], c[2], col[0], col[1], col[2], col[3]);
    } else {
      const e = col[3] ?? 0;
      d.push(a[0], a[1], a[2], nx, ny, nz, col[0], col[1], col[2], e, b[0], b[1], b[2], nx, ny, nz, col[0], col[1], col[2], e, c[0], c[1], c[2], nx, ny, nz, col[0], col[1], col[2], e);
    }
  }
  tri(a, b, c, col, cen) { this.tw(this.p(...a), this.p(...b), this.p(...c), col, cen ? this.p(...cen) : null); return this; }
  quad(a, b, c, d, col, cen) {
    const A = this.p(...a), B = this.p(...b), Cc = this.p(...c), D = this.p(...d), E = cen ? this.p(...cen) : null;
    this.tw(A, B, Cc, col, E); this.tw(A, Cc, D, col, E);
    return this;
  }
  // Doku koordinatlı dörtgen (u0,v0)-(u1,v1): a=sol alt, b=sağ alt, c=sağ üst, d=sol üst
  tquad(a, b, c, d, u0, v0, u1, v1, cen) {
    const A = this.p(...a), B = this.p(...b), Cc = this.p(...c), D = this.p(...d), E = cen ? this.p(...cen) : null;
    this.tw(A, B, Cc, null, E, [u0, v1, u1, v1, u1, v0]);
    this.tw(A, Cc, D, null, E, [u0, v1, u1, v0, u0, v0]);
    return this;
  }
  // col: renk ya da {top,bot,side,front,back,left,right}
  box(x0, y0, z0, x1, y1, z1, col, skip = '') {
    const c = col.length ? { top: col, bot: col, side: col } : col;
    const sd = c.side || c.top;
    const cen = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    if (!skip.includes('t')) this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], c.top || sd, cen);
    if (!skip.includes('b')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], c.bot || shade(sd, 0.7), cen);
    if (!skip.includes('f')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], c.front || sd, cen);
    if (!skip.includes('k')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], c.back || sd, cen);
    if (!skip.includes('l')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], c.left || sd, cen);
    if (!skip.includes('r')) this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], c.right || sd, cen);
    return this;
  }
  // Tabanı ve tavanı farklı genişlikte kutu (kabin, çatı)
  frustum(bx0, bx1, bz0, bz1, y0, tx0, tx1, tz0, tz1, y1, col, colTop = col) {
    const P = [[bx0, y0, bz0], [bx1, y0, bz0], [bx1, y0, bz1], [bx0, y0, bz1], [tx0, y1, tz0], [tx1, y1, tz0], [tx1, y1, tz1], [tx0, y1, tz1]];
    const cen = [(bx0 + bx1 + tx0 + tx1) / 4, (y0 + y1) / 2, (bz0 + bz1 + tz0 + tz1) / 4];
    const q = (a, b, c, d, cc) => this.quad(P[a], P[b], P[c], P[d], cc, cen);
    q(4, 5, 6, 7, colTop); q(0, 1, 2, 3, shade(col, 0.7)); q(0, 1, 5, 4, col); q(3, 2, 6, 7, col); q(0, 3, 7, 4, col); q(1, 2, 6, 5, col);
    return this;
  }
  // Silindir: eksen y, (cx,cz) merkez
  cyl(cx, y0, cz, r0, y1, r1 = r0, seg = 10, col = [1, 1, 1, 0], colCap = col, caps = 'tb') {
    const cen = [cx, (y0 + y1) / 2, cz];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const A = [cx + c0 * r0, y0, cz + s0 * r0], B = [cx + c1 * r0, y0, cz + s1 * r0];
      const Cc = [cx + c1 * r1, y1, cz + s1 * r1], D = [cx + c0 * r1, y1, cz + s0 * r1];
      if (r1 > 0.0001) this.quad(A, B, Cc, D, col, cen); else this.tri(A, B, [cx, y1, cz], col, cen);
      if (caps.includes('t') && r1 > 0.0001) this.tri([cx, y1, cz], D, Cc, colCap, [cx, y1 - 1, cz]);
      if (caps.includes('b')) this.tri([cx, y0, cz], A, B, shade(colCap, 0.75), [cx, y0 + 1, cz]);
    }
    return this;
  }
  // Küre (ikosahedron, 1 kez bölünmüş): ölçekli elips de olur
  sphere(cx, cy, cz, rx, ry = rx, rz = rx, col = [1, 1, 1, 0], detail = 1, colFn = null) {
    const t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let k = 0; k < detail; k++) {
      const cache = new Map();
      const mid = (a, b) => {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (cache.has(key)) return cache.get(key);
        const m = [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2];
        const l = Math.hypot(...m);
        V.push(m.map((x) => x / l));
        cache.set(key, V.length - 1);
        return V.length - 1;
      };
      const nf = [];
      F.forEach(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); });
      F = nf;
    }
    const P = V.map((v) => [cx + v[0] * rx, cy + v[1] * ry, cz + v[2] * rz]);
    F.forEach(([a, b, c], i) => {
      const cc = colFn ? colFn(V[a], i) : col;
      this.tri(P[a], P[b], P[c], cc, [cx, cy, cz]);
    });
    return this;
  }
  // Rampa: z0'da yükseklik 0, z1'de h (oyuncu +z tarafından gelir, -z'ye gider)
  wedge(x0, x1, z0, z1, h, colTop, colSide) {
    const cen = [(x0 + x1) / 2, h / 3, (z0 + z1) / 2];
    this.quad([x0, 0, z0], [x1, 0, z0], [x1, h, z1], [x0, h, z1], colTop, cen);
    this.quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], colSide, cen);
    this.tri([x0, 0, z0], [x0, 0, z1], [x0, h, z1], colSide, cen);
    this.tri([x1, 0, z0], [x1, 0, z1], [x1, h, z1], colSide, cen);
    return this;
  }
  // Yere yatay disk / çokgen (gölge, su birikintisi, ışık havuzu) — un türünde merkez/kenar rengi ayrı
  disc(cx, y, cz, rx, rz, seg, cIn, cOut = cIn, jitter = null) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const j0 = jitter ? jitter[i % jitter.length] : 1, j1 = jitter ? jitter[(i + 1) % jitter.length] : 1;
      const A = this.p(cx, y, cz), B = this.p(cx + Math.cos(a0) * rx * j0, y, cz + Math.sin(a0) * rz * j0), Cc = this.p(cx + Math.cos(a1) * rx * j1, y, cz + Math.sin(a1) * rz * j1);
      if (this.kind === 'un') {
        this.d.push(A[0], A[1], A[2], ...cIn, B[0], B[1], B[2], ...cOut, Cc[0], Cc[1], Cc[2], ...cOut);
      } else {
        this.tw(A, B, Cc, cIn, [A[0], A[1] - 1, A[2]]);
      }
    }
    return this;
  }
  /* ---- pürüzsüz (smooth) geometri: köşe normalleri ayrı verilir; yalnızca lit türü ----
     Renk alfası: 0 = mat, >0 = ışık saçar, <0 = parlak yüzey (-0.3 peynir, -0.6 plastik, -0.9 cila) */
  nv(n) {
    const m = this.m;
    let x = n[0], y = n[1], z = n[2];
    if (m) { const a = x, b = y, c = z; x = m[0] * a + m[4] * b + m[8] * c; y = m[1] * a + m[5] * b + m[9] * c; z = m[2] * a + m[6] * b + m[10] * c; }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  }
  vtx(p, n, c) {
    const P = this.p(p[0], p[1], p[2]), N = this.nv(n);
    this.d.push(P[0], P[1], P[2], N[0], N[1], N[2], c[0], c[1], c[2], c[3] ?? 0);
    return this;
  }
  triN(a, b, c, na, nb, nc, ca, cb = ca, cc = ca) { this.vtx(a, na, ca); this.vtx(b, nb, cb); this.vtx(c, nc, cc); return this; }
  quadN(a, b, c, d, na, nb, nc, nd, ca, cb = ca, cc = ca, cd = ca) { this.triN(a, b, c, na, nb, nc, ca, cb, cc); this.triN(a, c, d, na, nc, nd, ca, cc, cd); return this; }
  // Döner profil (şişe, top, tabak, kapak): prof = [[r, y], ...] alttan üste. Aynı nokta iki kez verilirse orada keskin köşe olur.
  // col: renk ya da (i, aci) => renk (i = profil noktası). caps: 'b' alt kapak, 't' üst kapak.
  lathe(cx, cy, cz, prof, seg = 24, col = [1, 1, 1, 0], caps = '') {
    const n = prof.length;
    const N = prof.map((p, i) => {
      let a = prof[Math.max(0, i - 1)], b = prof[Math.min(n - 1, i + 1)];
      if (i > 0 && prof[i - 1][0] === p[0] && prof[i - 1][1] === p[1]) a = p;
      if (i < n - 1 && prof[i + 1][0] === p[0] && prof[i + 1][1] === p[1]) b = p;
      const dr = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dr, dy) || 1;
      return [dy / l, -dr / l];
    });
    const cf = typeof col === 'function' ? col : () => col;
    const ring = [];
    for (let j = 0; j <= seg; j++) { const t = (j / seg) * Math.PI * 2; ring.push([Math.cos(t), Math.sin(t), t]); }
    for (let i = 0; i < n - 1; i++) {
      const p0 = prof[i], p1 = prof[i + 1];
      if (p0[0] === p1[0] && p0[1] === p1[1]) continue;
      const n0 = N[i], n1 = N[i + 1];
      for (let j = 0; j < seg; j++) {
        const [c0, s0, t0] = ring[j], [c1, s1, t1] = ring[j + 1];
        this.quadN(
          [cx + c0 * p0[0], cy + p0[1], cz + s0 * p0[0]], [cx + c1 * p0[0], cy + p0[1], cz + s1 * p0[0]],
          [cx + c1 * p1[0], cy + p1[1], cz + s1 * p1[0]], [cx + c0 * p1[0], cy + p1[1], cz + s0 * p1[0]],
          [c0 * n0[0], n0[1], s0 * n0[0]], [c1 * n0[0], n0[1], s1 * n0[0]], [c1 * n1[0], n1[1], s1 * n1[0]], [c0 * n1[0], n1[1], s0 * n1[0]],
          cf(i, t0), cf(i, t1), cf(i + 1, t1), cf(i + 1, t0));
      }
    }
    const cap = (p, i, up) => {
      if (p[0] <= 0.0001) return;
      const nn = [0, up ? 1 : -1, 0];
      for (let j = 0; j < seg; j++) {
        const [c0, s0, t0] = ring[j], [c1, s1, t1] = ring[j + 1];
        this.triN([cx, cy + p[1], cz], [cx + c0 * p[0], cy + p[1], cz + s0 * p[0]], [cx + c1 * p[0], cy + p[1], cz + s1 * p[0]], nn, nn, nn, cf(i, t0), cf(i, t0), cf(i, t1));
      }
    };
    if (caps.includes('b')) cap(prof[0], 0, false);
    if (caps.includes('t')) cap(prof[n - 1], n - 1, true);
    return this;
  }
  // Pürüzsüz elipsoit (UV küre). colFn(nx, ny, nz) => renk (yüzeyde desen için)
  // Süper elipsoit (yuvarlak kenarlı "çakıl taşı" biçimi): e = 1 küre, e < 1 kutuya yaklaşır. ey dikey, exz yatay köşelilik.
  // colFn(nx, ny, nz, px, py, pz) → renk (n: birim küre yönü, p: yerel konum / yarıçap)
  superS(cx, cy, cz, rx, ry, rz, ey = 0.6, exz = 0.6, col = [1, 1, 1, 0], su = 24, sv = 14, colFn = null) {
    const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    const G = [];
    for (let v = 0; v <= sv; v++) {
      const th = (v / sv) * Math.PI;
      const row = [];
      for (let u = 0; u <= su; u++) {
        const ph = (u / su) * Math.PI * 2;
        const ct = sp(Math.cos(th), ey), st = sp(Math.sin(th), ey);
        const x = st * sp(Math.cos(ph), exz), z = st * sp(Math.sin(ph), exz), y = ct;
        row.push({ p: [cx + x * rx, cy + y * ry, cz + z * rz], q: [x, y, z], d: [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)] });
      }
      G.push(row);
    }
    // normaller: örtük yüzeyin gradyanı (|x|^(2/exz) + |z|^(2/exz))^(exz/ey) + |y|^(2/ey) = 1
    const nrm = (q) => {
      const a = 2 / exz, b = 2 / ey;
      const ax = Math.abs(q[0]) + 1e-6, az = Math.abs(q[2]) + 1e-6, ay = Math.abs(q[1]) + 1e-6;
      const sxz = Math.pow(ax, a) + Math.pow(az, a);
      const k = (exz / ey) * Math.pow(sxz, exz / ey - 1);
      let nx = k * a * Math.pow(ax, a - 1) * Math.sign(q[0]) / rx;
      let nz = k * a * Math.pow(az, a - 1) * Math.sign(q[2]) / rz;
      let ny = b * Math.pow(ay, b - 1) * Math.sign(q[1]) / ry;
      const l = Math.hypot(nx, ny, nz) || 1;
      return [nx / l, ny / l, nz / l];
    };
    for (let v = 0; v < sv; v++) {
      for (let u = 0; u < su; u++) {
        const A = G[v][u], Bq = G[v][u + 1], Cq = G[v + 1][u + 1], D = G[v + 1][u];
        const cf = (g) => (colFn ? colFn(g.d[0], g.d[1], g.d[2], g.q[0], g.q[1], g.q[2]) : col);
        const na = v === 0 ? [0, 1, 0] : nrm(A.q), nb = v === 0 ? [0, 1, 0] : nrm(Bq.q);
        const nc = v + 1 === sv ? [0, -1, 0] : nrm(Cq.q), nd = v + 1 === sv ? [0, -1, 0] : nrm(D.q);
        if (v > 0) this.triN(A.p, Bq.p, Cq.p, na, nb, nc, cf(A), cf(Bq), cf(Cq));
        if (v < sv - 1) this.triN(A.p, Cq.p, D.p, na, nc, nd, cf(A), cf(Cq), cf(D));
      }
    }
    return this;
  }
  sphereS(cx, cy, cz, rx, ry = rx, rz = rx, col = [1, 1, 1, 0], su = 20, sv = 12, colFn = null) {
    const V = [];
    for (let v = 0; v <= sv; v++) {
      const th = (v / sv) * Math.PI;
      const row = [];
      for (let u = 0; u <= su; u++) {
        const ph = (u / su) * Math.PI * 2;
        const ux = Math.sin(th) * Math.cos(ph), uy = Math.cos(th), uz = Math.sin(th) * Math.sin(ph);
        row.push({ p: [cx + ux * rx, cy + uy * ry, cz + uz * rz], n: [ux / rx, uy / ry, uz / rz], c: colFn ? colFn(ux, uy, uz) : col });
      }
      V.push(row);
    }
    for (let v = 0; v < sv; v++) {
      for (let u = 0; u < su; u++) {
        const a = V[v][u], b = V[v][u + 1], c = V[v + 1][u + 1], d = V[v + 1][u];
        if (v > 0) this.triN(a.p, b.p, c.p, a.n, b.n, c.n, a.c, b.c, c.c);
        if (v < sv - 1) this.triN(a.p, c.p, d.p, a.n, c.n, d.n, a.c, c.c, d.c);
      }
    }
    return this;
  }
  // Pürüzsüz simit (halka): eksen y. R = merkez yarıçapı, r = boru yarıçapı (ry ile basık olabilir)
  torusN(cx, cy, cz, R, r, ry = r, su = 16, sv = 8, col = [1, 1, 1, 0], colFn = null) {
    const P = (u, v) => {
      const a = (u / su) * Math.PI * 2, b = (v / sv) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      return { p: [cx + ca * (R + cb * r), cy + sb * ry, cz + sa * (R + cb * r)], n: [ca * cb / r, sb / ry, sa * cb / r], c: colFn ? colFn(a, b) : col };
    };
    for (let u = 0; u < su; u++) {
      for (let v = 0; v < sv; v++) {
        const a = P(u, v), b = P(u + 1, v), c = P(u + 1, v + 1), d = P(u, v + 1);
        this.quadN(a.p, b.p, c.p, d.p, a.n, b.n, c.n, d.n, a.c, b.c, c.c, d.c);
      }
    }
    return this;
  }
  // Yuvarlatılmış kutu: kenarlar ve köşeler pürüzsüz yuvarlak (araba gövdesi, kutu, bank...).
  // taper = [tx, tz]: üste doğru x/z daralması (0 = yok). col: renk ya da (nx, ny, nz) => renk
  rbox(x0, y0, z0, x1, y1, z1, r, col = [1, 1, 1, 0], seg = 3, taper = null) {
    r = Math.max(0.0005, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const hx = (x1 - x0) / 2 - r, hy = (y1 - y0) / 2 - r, hz = (z1 - z0) / 2 - r;
    const cf = typeof col === 'function' ? col : null;
    const lon = [];
    for (let q = 0; q < 4; q++) for (let k = 0; k <= seg; k++) { const a = ((q + k / seg) * Math.PI) / 2; lon.push([Math.cos(a), Math.sin(a), q === 0 || q === 3 ? 1 : -1, q < 2 ? 1 : -1]); }
    const lat = [];
    for (let hh = 0; hh < 2; hh++) for (let k = 0; k <= seg; k++) { const t = ((hh + k / seg) * Math.PI) / 2; lat.push([Math.sin(t), Math.cos(t), hh === 0 ? 1 : -1]); }
    const tp = (p) => {
      if (!taper) return p;
      const t = (p[1] - y0) / (y1 - y0);
      return [cx + (p[0] - cx) * (1 - taper[0] * t), p[1], cz + (p[2] - cz) * (1 - taper[1] * t)];
    };
    const P = (L, A) => {
      const n = [L[0] * A[0], L[1], L[0] * A[1]];
      return { p: tp([cx + A[2] * hx + r * n[0], cy + L[2] * hy + r * n[1], cz + A[3] * hz + r * n[2]]), n, c: cf ? cf(n[0], n[1], n[2]) : col };
    };
    for (let i = 0; i < lat.length - 1; i++) {
      for (let j = 0; j < lon.length; j++) {
        const j2 = (j + 1) % lon.length;
        const a = P(lat[i], lon[j]), b = P(lat[i], lon[j2]), c = P(lat[i + 1], lon[j2]), d = P(lat[i + 1], lon[j]);
        this.quadN(a.p, b.p, c.p, d.p, a.n, b.n, c.n, d.n, a.c, b.c, c.c, d.c);
      }
    }
    const up = [0, 1, 0], dn = [0, -1, 0];
    const ct = cf ? cf(0, 1, 0) : col, cb = cf ? cf(0, -1, 0) : col;
    this.quadN(tp([cx + hx, y1, cz + hz]), tp([cx - hx, y1, cz + hz]), tp([cx - hx, y1, cz - hz]), tp([cx + hx, y1, cz - hz]), up, up, up, up, ct);
    this.quadN([cx + hx, y0, cz + hz], [cx - hx, y0, cz + hz], [cx - hx, y0, cz - hz], [cx + hx, y0, cz - hz], dn, dn, dn, dn, cb);
    return this;
  }
  // Yükseklik ızgarası (kumaş, peynir, zemin): h(x, z) => y; col(x, z, y) => renk. Normaller sonlu farkla.
  gridN(x0, z0, x1, z1, nx, nz, h, col) {
    const ex = (x1 - x0) / nx, ez = (z1 - z0) / nz;
    const V = [];
    for (let j = 0; j <= nz; j++) {
      const row = [];
      for (let i = 0; i <= nx; i++) {
        const x = x0 + i * ex, z = z0 + j * ez;
        const y = h(x, z);
        const e = Math.min(ex, ez) * 0.5;
        const n = [h(x - e, z) - h(x + e, z), 2 * e, h(x, z - e) - h(x, z + e)];
        row.push({ p: [x, y, z], n, c: col(x, z, y) });
      }
      V.push(row);
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i];
        this.quadN(a.p, b.p, c.p, d.p, a.n, b.n, c.n, d.n, a.c, b.c, c.c, d.c);
      }
    }
    return this;
  }
  build(X) { return upload(X, this.d, this.kind); }
}

/* ============================ modeller ============================ */
// Kural: ileri = -Z, yukarı = +Y, sağ = +X. Orijin yerde, modelin ortasında.

const DARK = C('#15161c');
const TIRE = C('#121318');
const METAL = C('#b8bcc6', -0.85);
const WHITE = C('#f4f1ea');
const GLASS = C('#2b3d52', -0.9);

function wheel(mb, x, y, z, r, w, hub = METAL, tread = false) {
  // yuvarlatılmış lastik + parlak jant (pürüzsüz); tread: lastik dişleri
  mb.push().T(x, y, z, 0, 0, Math.PI / 2);
  const h = w / 2, e = Math.min(r * 0.18, h * 0.6);
  const T2 = [TIRE[0], TIRE[1], TIRE[2], -0.18];
  mb.lathe(0, 0, 0, [[r * 0.6, -h], [r - e, -h], [r - e * 0.3, -h + e * 0.3], [r, -h + e], [r, h - e], [r - e * 0.3, h - e * 0.3], [r - e, h], [r * 0.6, h]], 18, T2);
  for (const sg of [-1, 1]) {
    const yy = sg * (h + 0.012);
    const prof = [[r * 0.62, sg * h], [r * 0.6, yy], [r * 0.25, yy], [0, yy + sg * 0.01]];
    mb.lathe(0, 0, 0, sg > 0 ? prof : prof.slice().reverse().map((q) => q), 14, hub);
    // jant göbeği + 5 bijon
    mb.lathe(0, yy, 0, sg > 0 ? [[r * 0.2, 0], [r * 0.16, 0.02], [0, 0.025]] : [[0, -0.025], [r * 0.16, -0.02], [r * 0.2, 0]], 10, C('#d9dde4', -0.9));
  }
  if (tread) {
    const N = 26, TD = [0.04, 0.04, 0.05, -0.1];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      mb.push().T(Math.cos(a) * r, 0, Math.sin(a) * r, -a);
      mb.box(-0.004, -h * 0.7, -0.012, 0.007, h * 0.7, 0.012, TD);
      mb.pop();
    }
  }
  mb.pop();
}

// Noktalardan geçen ince, pürüzsüz boru (krom şerit, kablo): pts = [[x,y,z], ...]
function tubePath(mb, pts, r, col, sides = 6) {
  const n = pts.length;
  const rings = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // teğete dik iki eksen
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(ty) > 0.9) { ux = 1; uy = 0; }
    let vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
    const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
    ux = vy * tz - vz * ty; uy = vz * tx - vx * tz; uz = vx * ty - vy * tx;
    const ring = [];
    for (let k = 0; k <= sides; k++) {
      const t = (k / sides) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const nx = ux * c + vx * sn, ny = uy * c + vy * sn, nz = uz * c + vz * sn;
      ring.push([[p[0] + nx * r, p[1] + ny * r, p[2] + nz * r], [nx, ny, nz]]);
    }
    return ring;
  });
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = rings[i][k], b = rings[i][k + 1], c = rings[i + 1][k + 1], d = rings[i + 1][k];
      mb.quadN(a[0], b[0], c[0], d[0], a[1], b[1], c[1], d[1], col);
    }
  }
}

// Eksen x boyunca kavisli kabuk (çamurluk): (cx,cy,cz) merkezli, R yarıçaplı, [a0,a1] yayı, genişlik 2*hw; ortası şişkin
function arcShell(mb, cx, cy, cz, R, hw, a0, a1, seg, col, trim) {
  const prof = [[-hw, -0.012], [-hw * 0.8, 0.012], [0, 0.03], [hw * 0.8, 0.012], [hw, -0.012]];
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + ((a1 - a0) * i) / seg, t1 = a0 + ((a1 - a0) * (i + 1)) / seg;
    for (let j = 0; j < prof.length - 1; j++) {
      const P = (t, q) => [cx + prof[q][0], cy + Math.sin(t) * (R + prof[q][1]), cz + Math.cos(t) * (R + prof[q][1])];
      const N = (t, q) => { const sx = q === 0 ? -0.6 : q === prof.length - 1 ? 0.6 : (prof[q][0] / hw) * 0.35; return [sx, Math.sin(t), Math.cos(t)]; };
      const cc = trim && (j === 0 || j === prof.length - 2) ? trim : col;
      mb.quadN(P(t0, j), P(t1, j), P(t1, j + 1), P(t0, j + 1), N(t0, j), N(t1, j), N(t1, j + 1), N(t0, j + 1), cc);
    }
  }
}

// Kesitlerden örülen pürüzsüz yüzey (gövde paneli, mont, sele): her halka, yolun teğetine dik bir süper elips.
// rings: [{ c: [x,y,z], a, b, b2?, e? }] — a: U ekseni boyunca yarıçap; b: (teğet × U) yönünde, b2: ters yönde (yoksa b); e < 1 köşeli
// col: renk ya da (i, k, cu, sv, p) => renk (cu, sv: kesitteki birim konum, p: yerel nokta). caps: 's' baş, 'e' son kapak
function loft(mb, rings, col, seg = 16, caps = '', U = [1, 0, 0]) {
  const n = rings.length;
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const cf = typeof col === 'function' ? col : () => col;
  const G = rings.map((R, i) => {
    const a = rings[Math.max(0, i - 1)].c, b = rings[Math.min(n - 1, i + 1)].c;
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const d = U[0] * tx + U[1] * ty + U[2] * tz;
    let ux = U[0] - d * tx, uy = U[1] - d * ty, uz = U[2] - d * tz;
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
    const e = R.e ?? 1, pts = [], cs = [];
    for (let k = 0; k <= seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const cu = sp(Math.cos(th), e), sv = sp(Math.sin(th), e);
      const bb = sv < 0 ? R.b2 ?? R.b : R.b;
      const p = [R.c[0] + ux * cu * R.a + vx * sv * bb, R.c[1] + uy * cu * R.a + vy * sv * bb, R.c[2] + uz * cu * R.a + vz * sv * bb];
      pts.push(p); cs.push(cf(i, k, cu, sv, p));
    }
    return { pts, cs, t: [tx, ty, tz], c: R.c };
  });
  // köşe normalleri: kesit boyunca ve halkalar arasında sonlu farkların vektörel çarpımı (dışa çevrili)
  const N = G.map((g, i) => g.pts.map((p, k) => {
    const A = g.pts[k === seg ? 1 : k + 1], Bp = g.pts[k === 0 ? seg - 1 : k - 1];
    const Cp = G[Math.min(n - 1, i + 1)].pts[k], Dp = G[Math.max(0, i - 1)].pts[k];
    const ax = A[0] - Bp[0], ay = A[1] - Bp[1], az = A[2] - Bp[2];
    const bx = Cp[0] - Dp[0], by = Cp[1] - Dp[1], bz = Cp[2] - Dp[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) { const s = i === 0 ? -1 : 1; return [g.t[0] * s, g.t[1] * s, g.t[2] * s]; }
    nx /= l; ny /= l; nz /= l;
    if (nx * (p[0] - g.c[0]) + ny * (p[1] - g.c[1]) + nz * (p[2] - g.c[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    return [nx, ny, nz];
  }));
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < seg; k++) {
      mb.quadN(G[i].pts[k], G[i].pts[k + 1], G[i + 1].pts[k + 1], G[i + 1].pts[k], N[i][k], N[i][k + 1], N[i + 1][k + 1], N[i + 1][k], G[i].cs[k], G[i].cs[k + 1], G[i + 1].cs[k + 1], G[i + 1].cs[k]);
    }
  }
  const cap = (i, s) => {
    const g = G[i], nn = [g.t[0] * s, g.t[1] * s, g.t[2] * s];
    for (let k = 0; k < seg; k++) mb.triN(g.c, g.pts[k], g.pts[k + 1], nn, nn, nn, g.cs[k], g.cs[k], g.cs[k + 1]);
  };
  if (caps.includes('s')) cap(0, -1);
  if (caps.includes('e')) cap(n - 1, 1);
}

// Kapsül uzuv (kol, bacak, boru): a → b, rs: eşit aralıklı yarıçaplar (uçlar yarım küre).
// bands: [[t, genişlik, renk], ...] uzuvu saran ince şerit (reflektör, manşet)
function limb(mb, a, b, rs, col, seg = 12, bands = null, cap = 3) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-6;
  const r0 = rs[0], r1 = rs[rs.length - 1], prof = [];
  for (let k = 0; k <= cap; k++) { const f = -Math.PI / 2 + (k / cap) * (Math.PI / 2); prof.push([r0 * Math.cos(f), r0 * Math.sin(f)]); }
  for (let i = 1; i < rs.length - 1; i++) prof.push([rs[i], (L * i) / (rs.length - 1)]);
  for (let k = 0; k <= cap; k++) { const f = (k / cap) * (Math.PI / 2); prof.push([r1 * Math.cos(f), L + r1 * Math.sin(f)]); }
  mb.push().T(a[0], a[1], a[2], Math.atan2(dx, dz), Math.acos(clamp(dy / L, -1, 1)));
  mb.lathe(0, 0, 0, prof, seg, col);
  if (bands) {
    const rr = (q) => { const f = clamp(q, 0, 1) * (rs.length - 1), j = Math.min(rs.length - 2, Math.floor(f)); return lerp(rs[j], rs[j + 1], f - j); };
    for (const [t, w, bc] of bands) {
      const y0 = L * (t - w / 2), y1 = L * (t + w / 2), ra = rr(t - w / 2) + 0.004, rb = rr(t + w / 2) + 0.004;
      mb.lathe(0, 0, 0, [[ra - 0.004, y0], [ra, y0 + 0.003], [rb, y1 - 0.003], [rb - 0.004, y1]], seg, bc);
    }
  }
  mb.pop();
}

// İki kemikli ters kinematik: S (omuz/kalça) → H (el/ayak), kemik boyları a, b; pole: dirseğin/dizin bakacağı yön
function ik2(S, H, a, b, pole) {
  const d = [H[0] - S[0], H[1] - S[1], H[2] - S[2]];
  const L0 = Math.hypot(d[0], d[1], d[2]) || 1e-6;
  const dn = [d[0] / L0, d[1] / L0, d[2] / L0];
  const L = Math.min(L0, a + b - 1e-4);
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  const pd = pole[0] * dn[0] + pole[1] * dn[1] + pole[2] * dn[2];
  let p = [pole[0] - pd * dn[0], pole[1] - pd * dn[1], pole[2] - pd * dn[2]];
  const pl = Math.hypot(p[0], p[1], p[2]) || 1; p = [p[0] / pl, p[1] / pl, p[2] / pl];
  return [S[0] + dn[0] * x + p[0] * h, S[1] + dn[1] * x + p[1] * h, S[2] + dn[2] * x + p[2] * h];
}

// Elipsoit yüzeyinden bir parça (kask vizörü): th kutup açısı (0 = tepe), ph azimut (x → z); normaller dışa
function ellPatch(mb, cx, cy, cz, rx, ry, rz, th0, th1, ph0, ph1, nu, nv, col) {
  const P = (u, v) => {
    const th = lerp(th0, th1, v / nv), ph = lerp(ph0, ph1, u / nu);
    const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
    return [[cx + x * rx, cy + y * ry, cz + z * rz], [x / rx, y / ry, z / rz]];
  };
  for (let v = 0; v < nv; v++) {
    for (let u = 0; u < nu; u++) {
      const a = P(u, v), b = P(u + 1, v), c = P(u + 1, v + 1), d = P(u, v + 1);
      mb.quadN(a[0], b[0], c[0], d[0], a[1], b[1], c[1], d[1], col);
    }
  }
}

// Parametrik yüzey: us/vs parametre dizileri ya da bölüm sayısı; P(u, v) → nokta, Cf(u, v) → renk.
// o.wv: v yönünde kapalı; o.cen: nokta ya da (u, v) → nokta (normaller ondan dışa); kutup satırları komşu halkanın ortalamasını alır
function psurf(mb, us, vs, P, Cf, o = {}) {
  if (typeof us === 'number') us = Array.from({ length: us + 1 }, (_, i) => i / us);
  if (typeof vs === 'number') vs = Array.from({ length: vs + 1 }, (_, i) => i / vs);
  const nu = us.length - 1, nv = vs.length - 1;
  const G = us.map((u) => vs.map((v) => P(u, v)));
  const K = us.map((u) => vs.map((v) => Cf(u, v)));
  const at = (i, j) => { i = Math.max(0, Math.min(nu, i)); j = o.wv ? ((j % nv) + nv) % nv : Math.max(0, Math.min(nv, j)); return G[i][j]; };
  const N = G.map((row, i) => row.map((_, j) => {
    const a = at(i + 1, j), b = at(i - 1, j), c = at(i, j + 1), d = at(i, j - 1);
    const du = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dv = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    const L = Math.hypot(n[0], n[1], n[2]);
    return L < 1e-12 ? null : [n[0] / L, n[1] / L, n[2] / L];
  }));
  const avg = (l) => { let x = 0, y = 0, z = 0; l.forEach((n) => { if (n) { x += n[0]; y += n[1]; z += n[2]; } }); const q = Math.hypot(x, y, z); return q > 1e-9 ? [x / q, y / q, z / q] : null; };
  const bad = N.map((row) => row.every((q) => !q));
  bad.forEach((b, i) => { if (b) { const a = avg(N[i === 0 ? 1 : i - 1]) || [0, 1, 0]; N[i] = N[i].map(() => a.slice()); } });
  N.forEach((row, i) => row.forEach((n, j) => { if (!n) row[j] = avg([N[Math.max(0, i - 1)][j], N[Math.min(nu, i + 1)][j], row[Math.max(0, j - 1)], row[Math.min(nv, j + 1)]]) || [0, 1, 0]; }));
  if (o.cen) {
    let sg = 0;
    G.forEach((row, i) => row.forEach((p, j) => { const c = typeof o.cen === 'function' ? o.cen(us[i], vs[j]) : o.cen, n = N[i][j]; sg += n[0] * (p[0] - c[0]) + n[1] * (p[1] - c[1]) + n[2] * (p[2] - c[2]); }));
    if (sg < 0) N.forEach((row) => row.forEach((n) => { n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]; }));
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      if ((i + j) & 1) mb.quadN(G[i][j + 1], G[i][j], G[i + 1][j], G[i + 1][j + 1], N[i][j + 1], N[i][j], N[i + 1][j], N[i + 1][j + 1], K[i][j + 1], K[i][j], K[i + 1][j], K[i + 1][j + 1]);
      else mb.quadN(G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1], N[i][j], N[i + 1][j], N[i + 1][j + 1], N[i][j + 1], K[i][j], K[i + 1][j], K[i + 1][j + 1], K[i][j + 1]);
    }
  }
  return mb;
}

// Tam yüz kask (orijin baş merkezi, ileri = -z). Kabuk: yatay kesitleri önde/arkada farklı uzanan yumurta; alt yarıda öne çıkan
// çene koruması; alt kenar arkada ense hizasına iner, yanlarda yükselir. pc: kabuk rengi (parlak). q: ayrıntı
function helmetModel(mb, pc, q = 1) {
  const S = (n) => Math.max(5, Math.round(n * q));
  const hi = q >= 0.75;
  const TAU = Math.PI * 2;
  const P = [pc[0], pc[1], pc[2], -0.92], Pd = [pc[0] * 0.74, pc[1] * 0.74, pc[2] * 0.74, -0.9];
  const WHT = C('#f4f4f2', -0.92), BLK = C('#121317', -0.55), RUB = C('#1a1b1f', -0.2), GSK = C('#0c0c0f', -0.3), DK = C('#24262c', -0.9);
  const YT = 0.152;
  const yB = (t) => { const c = Math.cos(t), s = Math.sin(t); return -0.148 - 0.016 * Math.max(0, s) + 0.012 * c * c - 0.006 * Math.max(0, -s); };
  const sm = (x) => Math.sin(Math.min(1, Math.max(0, x)) * Math.PI / 2);
  const AX = (u) => 0.146 * (u < 0.55 ? Math.pow(sm(u / 0.55), 0.55) : 1 - 0.25 * Math.pow((u - 0.55) / 0.45, 1.6));
  const ZF = (u) => 0.178 * (u < 0.62 ? Math.pow(sm(u / 0.62), 0.5) : 1 - 0.2 * Math.pow((u - 0.62) / 0.38, 1.8));
  const ZB = (u) => 0.172 * (u < 0.46 ? Math.pow(sm(u / 0.46), 0.55) : 1 - 0.32 * Math.pow((u - 0.46) / 0.54, 1.4));
  const EX = (u) => 1 - 0.14 * Math.max(0, u - 0.5) / 0.5;
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const shell = (u, v, k = 1) => {
    const t = TAU * v, c = Math.cos(t), s = Math.sin(t), e = EX(u);
    return [AX(u) * sp(c, e) * k, YT + (yB(t) - YT) * u, (s < 0 ? ZF(u) : ZB(u)) * sp(s, e) * k];
  };
  // göz açıklığı maskesi (önde, yuvarlatılmış dikdörtgen): < 1 içeride
  const UE = 0.47, UH = 0.15, CW = 0.84;
  const port = (u, v) => { const t = TAU * v, c = Math.cos(t), s = Math.sin(t); if (s > -0.25) return 9; return Math.pow(Math.abs(u - UE) / UH, 4) + Math.pow(Math.abs(c) / CW, 4); };
  const us = [0, 0.04, 0.09, 0.15, 0.22, 0.28, 0.3, 0.32, 0.36, 0.42, 0.5, 0.58, 0.62, 0.645, 0.7, 0.78, 0.86, 0.92, 0.95, 1].filter((x, i, a) => hi || i % 2 === 0 || i === a.length - 1);
  psurf(mb, us, hi ? 48 : S(36), (u, v) => shell(u, v), (u, v) => {
    const t = TAU * v, c = Math.cos(t), s = Math.sin(t);
    const m = port(u, v);
    if (m < 1) return [0.07, 0.07, 0.08, -0.2];        // iç ped (vizörün arkasında)
    if (m < 1.55) return GSK;                           // vizör contası
    if (u > 0.94) return RUB;                           // kauçuk alt kenar
    const px = AX(u) * sp(c, EX(u)), pz = (s < 0 ? ZF(u) : ZB(u)) * sp(s, EX(u));
    // iki tonlu grafik: altta koyu antrasit, arada ince beyaz çizgi (arkada yüksek, öne doğru alçalan kavis)
    const lb = 0.7 - 0.08 * Math.max(0, s) + 0.1 * Math.max(0, -s);
    if (u > lb + 0.022) return DK;
    if (u > lb) return WHT;
    if (u < 0.46 && pz > -0.07 && Math.abs(px) < 0.018) return WHT;   // ortadan geçen ince yarış şeridi
    return P;
  }, { wv: true, cen: [0, 0, 0] });
  // vizör: kabuktan 6 mm dışarıda, köşeleri yuvarlak, üstü koyu bantlı füme (mavi-mor yansımalı)
  const V0 = 0.3, V1 = 0.645, DM = 1.12;
  psurf(mb, S(8), S(14), (a, w) => {
    const u = V0 + (V1 - V0) * a;
    const dm = DM * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * a - 1), 5)), 0.2);
    const t = 1.5 * Math.PI + (2 * w - 1) * dm;
    return shell(u, t / TAU, 1.04);
  }, (a) => (a < 0.22 ? [0.035, 0.04, 0.06, -0.97] : [0.07 + 0.05 * a, 0.08 + 0.05 * a, 0.14 + 0.06 * a, -0.97]), { cen: [0, 0, 0] });
  // vizör mekanizması (yanlarda), sol altta açma tırnağı
  for (const sd of [-1, 1]) {
    const pnt = shell(0.47, sd > 0 ? 0.985 : 0.515, 1.015);
    mb.push().T(pnt[0], pnt[1], pnt[2], sd * Math.PI / 2);
    mb.superS(0, 0, 0, 0.022, 0.02, 0.005, 0.6, 0.6, C('#26272c', -0.6), S(12), 5);
    if (hi) mb.sphereS(0, 0, 0.004, 0.006, 0.006, 0.003, C('#8a9099', -0.8), 8, 4);
    mb.pop();
  }
  if (hi) { const tb = shell(0.65, 0.75 - 0.105, 1.05); mb.sphereS(tb[0], tb[1], tb[2] - 0.004, 0.016, 0.008, 0.008, BLK, 8, 4); }
  // çene havalandırması (koyu ızgara + çıtalar) ve iki yan nefes deliği
  {
    const cp = shell(0.755, 0.75, 1.0);
    mb.push().T(cp[0], cp[1], cp[2] + 0.004, 0, -0.25);
    mb.superS(0, 0, 0, 0.042, 0.022, 0.012, 0.5, 0.5, BLK, S(12), 6);
    if (hi) for (let k = 0; k < 3; k++) mb.box(-0.032, -0.012 + k * 0.011, -0.013, 0.032, -0.008 + k * 0.011, -0.009, C('#2b2d33', -0.4));
    mb.pop();
    if (hi) for (const sd of [-1, 1]) { const sp2 = shell(0.8, 0.75 + sd * 0.085, 1.0); mb.push().T(sp2[0], sp2[1], sp2[2], sd * 0.7, -0.2); mb.superS(0, 0, 0, 0.016, 0.01, 0.006, 0.5, 0.5, BLK, 8, 4); mb.pop(); }
  }
  // alın havalandırmaları
  for (const sd of [-1, 1]) {
    const fp = shell(0.17, 0.75 + sd * 0.05, 1.0);
    mb.push().T(fp[0], fp[1], fp[2], 0, -0.8);
    mb.superS(0, 0.002, 0, 0.011, 0.005, 0.028, 0.5, 0.5, C('#2a2c32', -0.6), S(10), 5);
    mb.pop();
  }
  // arka spoyler (iki egzoz deliğiyle) — arkadan bakan kamerada kaskın imzası
  {
    const bp = shell(0.4, 0.25, 1.0);
    mb.push().T(bp[0], bp[1] + 0.004, bp[2] - 0.006, 0, 0.3);
    mb.superS(0, 0, 0, 0.07, 0.014, 0.024, 0.45, 0.5, null, S(16), S(6), (nx, ny) => (ny > -0.2 ? P : Pd));
    mb.pop();
    if (hi) { const rp = shell(0.58, 0.25, 1.004); mb.push().T(rp[0], rp[1], rp[2], 0, 0.12); mb.rbox(-0.022, -0.009, -0.002, 0.022, 0.009, 0.002, 0.003, [0.85, 0.87, 0.9, 0.45], 1); mb.pop(); }
    const tp = shell(0.3, 0.25, 1.0);
    if (hi) { mb.push().T(tp[0], tp[1], tp[2], 0, 0.65); mb.superS(0, 0.003, 0, 0.016, 0.005, 0.022, 0.5, 0.5, C('#2a2c32', -0.6), 10, 4); mb.pop(); }
  }
  // boyun yastığı: alt kenardan içe ve yukarı kıvrılan koyu kumaş
  psurf(mb, [0, 0.5, 1], S(36), (w, v) => {
    const b = shell(1, v, 1 - 0.1 * w);
    return [b[0], b[1] + 0.012 * Math.sin(w * Math.PI) + 0.02 * w, b[2]];
  }, () => C('#2a2a30', -0.05), { wv: true, cen: [0, -0.3, 0] });
  return mb;
}

// Alaşım jantlı scooter tekerleği (aks x ekseninde): yuvarlak omuzlu lastik, parlak jant dudağı, 5 çift kollu jant, göbek.
// disc: sağ yanda fren diski + kaliper
function alloyWheel(mb, x, y, z, r, w, rimC, disc = false, q = 1) {
  const sg = (n) => Math.max(6, Math.round(n * q));
  mb.push().T(x, y, z, 0, 0, Math.PI / 2); // yerel y = aks (dünya -x), yerel x = dünya +y, yerel z = dünya +z
  const h = w / 2, e = Math.min(r * 0.22, h * 0.8), rr = r * 0.64;
  mb.lathe(0, 0, 0, [[rr, -h * 0.78], [r - e * 1.1, -h], [r - e * 0.35, -h + e * 0.3], [r, -h + e], [r, h - e], [r - e * 0.35, h - e * 0.3], [r - e * 1.1, h], [rr, h * 0.78]], sg(22), [TIRE[0], TIRE[1], TIRE[2], -0.12]);
  for (const sd of [-1, 1]) {
    const pr = [[rr, h * 0.78], [rr * 0.995, h * 0.84], [rr * 0.9, h * 0.82], [rr * 0.87, h * 0.62]].map(([qq, yy]) => [qq, yy * sd]);
    mb.lathe(0, 0, 0, sd > 0 ? pr : pr.reverse(), sg(22), rimC);
  }
  mb.lathe(0, 0, 0, [[rr * 0.87, -h * 0.62], [rr * 0.87, h * 0.62]], sg(22), C('#2a2c31', -0.2)); // jant içi
  mb.lathe(0, 0, 0, [[0, 0], [rr * 0.88, 0]], sg(22), C('#1e2025')); // kolların arkasındaki koyu disk
  const bar = (p0, p1, hw, ht) => {
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1], L = Math.hypot(dx, dz);
    mb.push().T(p0[0], 0, p0[1], Math.atan2(-dz, dx));
    mb.box(0, -ht, -hw, L, ht, hw, rimC);
    mb.pop();
  };
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    for (const o of q < 0.75 ? [0] : [-0.17, 0.17]) bar([Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15], [Math.cos(a + o) * rr * 0.9, Math.sin(a + o) * rr * 0.9], 0.011, h * 0.3);
  }
  mb.lathe(0, 0, 0, [[0, -h * 0.52], [r * 0.18, -h * 0.52], [r * 0.2, -h * 0.4], [r * 0.2, h * 0.4], [r * 0.18, h * 0.52], [0, h * 0.52]], sg(12), rimC);
  if (disc) mb.lathe(0, 0, 0, [[r * 0.3, -h * 0.66], [r * 0.56, -h * 0.66], [r * 0.56, -h * 0.58], [r * 0.3, -h * 0.58]], sg(22), C('#a2a8b0', -0.75));
  mb.pop();
}

// Kurye: modern scooter (NMAX/PCX hatları) + gerçek oranlı sürücü.
// pc: oyuncu rengi (gövde + kask), bc: işletme rengi (kutu + mont). İleri = -z, motorun orijini yerde.
// q: ayrıntı (1 = yakın; 0.5 = uzaktaki motorlar için yarı çözünürlük, küçük süsler atlanır)
// Dönen tekerlek (motorun ayrı parçası): orijin aks merkezinde
function scooterWheel(mb, front, q = 1) {
  alloyWheel(mb, 0, 0, 0, 0.27, front ? 0.115 : 0.135, C('#c6cbd3', -0.85), front, q);
  return mb;
}
// wheels = false: tekerlekler ayrı çizilir (oyunda hızla döner). stop: duran motor — sürücünün sol ayağı yerde
function scooterModel(mb, pc, bc, q = 1, wheels = true, stop = false) {
  const S = (n) => Math.max(5, Math.round(n * q));
  const hi = q >= 0.75;
  const P = C(pc, -0.62), Pd = shade(P, 0.7);
  const B = C(bc, -0.25), Bd = shade(B, 0.72);
  const PL = C('#232429', -0.3), PLm = C('#2e3036', -0.1), RUB = C('#1b1c20', -0.1);
  const CHR = C('#e4e8ee', -0.95), ALU = C('#b4bac3', -0.8), RIM = C('#c6cbd3', -0.85);
  const LENS = [0.06, 0.07, 0.09, -0.95];
  const FZ = -0.7, RZ = 0.6, WR = 0.27;
  // ---- tekerlekler, ön çatal, çamurluklar
  if (wheels) {
    alloyWheel(mb, 0, WR, FZ, WR, 0.115, RIM, true, q);
    alloyWheel(mb, 0, WR, RZ, WR, 0.135, RIM, false, q);
  }
  // ön fren kaliperi (diskin arkasında, çatala bağlı; tekerlekle dönmez)
  mb.push().T(0.045, WR + 0.074, FZ + 0.103, 0, 0.95);
  mb.rbox(-0.022, -0.03, -0.045, 0.022, 0.03, 0.045, 0.012, C('#2b2d33', -0.4), 2);
  mb.pop();
  for (const s of [-1, 1]) {
    limb(mb, [s * 0.074, WR, FZ], [s * 0.071, 0.6, FZ + 0.09], [0.031, 0.03], ALU, S(9));
    limb(mb, [s * 0.071, 0.58, FZ + 0.084], [s * 0.066, 0.92, FZ + 0.18], [0.024, 0.024], PL, S(9));
  }
  arcShell(mb, 0, WR, FZ, WR + 0.045, 0.072, 1.0, 2.55, S(10), P, Pd);
  arcShell(mb, 0, WR, RZ, WR + 0.035, 0.074, 0.1, 1.25, S(8), PL, null);
  // ---- ön kalkan: tabandan burna ve gidona uzanan, önü bombeli gövde, arkası (sürücü tarafı) koyu iç panel
  {
    const R = [
      [0.3, -0.42, 0.19, 0.055], [0.36, -0.44, 0.195, 0.065], [0.44, -0.47, 0.205, 0.08], [0.52, -0.5, 0.22, 0.095],
      [0.6, -0.52, 0.24, 0.105], [0.68, -0.535, 0.252, 0.112], [0.76, -0.54, 0.26, 0.118], [0.84, -0.54, 0.262, 0.12],
      [0.92, -0.53, 0.252, 0.112], [0.98, -0.51, 0.23, 0.098], [1.03, -0.49, 0.2, 0.08], [1.07, -0.475, 0.16, 0.06], [1.095, -0.465, 0.1, 0.035],
    ];
    loft(mb, R.map(([y, z, a, b]) => ({ c: [0, y, z], a, b, b2: 0.03, e: 0.74 })), (i, k, cu, sv, p) => (sv < -0.1 ? PL : p[1] < 0.5 ? Pd : P), S(26), 'se');
    // ön panel: ortada koyu korna ızgarası + krom amblem, üst köşelerde sinyaller
    mb.superS(0, 0.66, -0.655, 0.075, 0.12, 0.022, 0.5, 0.55, C('#2a2b30', -0.2), S(12), S(8));
    if (hi) for (let k = 0; k < 4; k++) mb.box(-0.05, 0.59 + k * 0.04, -0.68, 0.05, 0.6 + k * 0.04, -0.672, C('#141519'), 'k');
    mb.superS(0, 0.82, -0.665, 0.034, 0.022, 0.01, 0.6, 0.6, CHR, S(10), 5);
    for (const s of [-1, 1]) {
      mb.push().T(s * 0.215, 0.95, -0.6, s * 0.5);
      mb.superS(0, 0, 0, 0.042, 0.016, 0.016, 0.5, 0.5, [1, 0.56, 0.1, -0.6], S(10), 5);
      mb.pop();
    }
    // far: ön camın hemen altında, krom çerçeveli geniş far (iki projektör + üstte gündüz ışığı şeridi)
    mb.push().T(0, 0.936, -0.636, 0, -0.12);
    mb.superS(0, 0, 0, 0.13, 0.042, 0.02, 0.5, 0.5, CHR, S(16), S(7));
    mb.superS(0, 0, -0.008, 0.116, 0.032, 0.015, 0.5, 0.5, [0.74, 0.79, 0.86, -0.95], S(14), S(6));
    for (const s of [-1, 1]) mb.sphereS(s * 0.055, -0.003, -0.02, 0.03, 0.021, 0.007, C('#fffbea', 1), S(10), 5);
    mb.box(-0.1, 0.022, -0.026, 0.1, 0.027, -0.02, C('#eaf4ff', 1), 'k');
    mb.pop();
    // ön cam (füme), ince koyu çerçeveli
    const NU = 8, NV = 4;
    const Sc = (u, v) => [u * 0.16 * (1 - 0.2 * v), 0.99 + 0.23 * v, -0.598 + 0.115 * v - 0.04 * (1 - u * u)];
    const Nn = (u) => { const g = [u * 0.5, 0.42, -1]; const l = Math.hypot(...g); return g.map((qq) => qq / l); };
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const u0 = -1 + (2 * i) / NU, u1 = -1 + (2 * (i + 1)) / NU, v0 = j / NV, v1 = (j + 1) / NV;
        mb.quadN(Sc(u0, v0), Sc(u1, v0), Sc(u1, v1), Sc(u0, v1), Nn(u0), Nn(u1), Nn(u1), Nn(u0), [0.22, 0.28, 0.34, -0.95]);
      }
    }
    if (hi) {
      const ed = [];
      for (let k = 0; k <= 8; k++) ed.push(Sc(-1 + (2 * k) / 8, 1));
      tubePath(mb, ed, 0.006, PL, 5);
    }
  }
  // ---- gidon: gövde renginde gidon kapağı, gösterge, elcikler, frenler, aynalar
  mb.superS(0, 1.085, -0.44, 0.2, 0.055, 0.085, 0.55, 0.6, null, S(18), S(8), (nx, ny, nz, px, py) => (py < -0.55 ? Pd : P));
  mb.rbox(-0.075, 1.125, -0.47, 0.075, 1.145, -0.4, 0.012, [0.09, 0.1, 0.12, -0.9], 2);

  if (hi) mb.rbox(-0.052, 1.144, -0.462, 0.052, 1.149, -0.415, 0.004, [0.35, 0.72, 0.95, 0.5], 1);
  for (const s of [-1, 1]) {
    limb(mb, [s * 0.19, 1.085, -0.415], [s * 0.335, 1.085, -0.415], [0.021, 0.021], RUB, S(9));
    if (hi) mb.sphereS(s * 0.34, 1.085, -0.415, 0.023, 0.023, 0.023, CHR, 8, 5);
    if (hi) limb(mb, [s * 0.2, 1.105, -0.455], [s * 0.33, 1.1, -0.475], [0.007, 0.006], ALU, 6);
    limb(mb, [s * 0.16, 1.12, -0.5], [s * 0.245, 1.33, -0.55], [0.009, 0.008], PL, S(6));
    mb.push().T(s * 0.265, 1.36, -0.555, -s * 0.18);
    mb.superS(0, 0, 0, 0.066, 0.043, 0.022, 0.6, 0.6, PL, S(10), S(6));
    if (hi) mb.sphereS(0, 0, 0.02, 0.057, 0.035, 0.004, [0.6, 0.7, 0.8, -0.95], 8, 4);
    mb.pop();
  }
  // ---- taban + orta tünel + alt kaporta
  mb.rbox(-0.2, 0.27, -0.47, 0.2, 0.335, 0.04, 0.025, PLm, 2);
  if (hi) for (const xx of [-0.17, -0.12, 0.12, 0.17]) mb.box(xx - 0.012, 0.335, -0.43, xx + 0.012, 0.343, -0.02, RUB, 'b');
  mb.rbox(-0.08, 0.3, -0.47, 0.08, 0.5, 0.08, 0.05, P, hi ? 3 : 2);
  mb.rbox(-0.17, 0.15, -0.45, 0.17, 0.28, 0.12, 0.05, PL, 2);
  // ---- arka gövde: aşağıdan arkaya doğru yükselip incelen yan paneller (altı koyu plastik) + gümüş karakter çizgisi
  {
    const Z = [-0.08, 0.02, 0.14, 0.28, 0.42, 0.56, 0.68, 0.78, 0.86, 0.92, 0.96, 0.985];
    const YB = [0.3, 0.32, 0.36, 0.41, 0.47, 0.53, 0.58, 0.62, 0.66, 0.69, 0.71, 0.73];
    const YT = [0.71, 0.73, 0.75, 0.765, 0.775, 0.785, 0.795, 0.805, 0.81, 0.805, 0.795, 0.78];
    const A = [0.15, 0.19, 0.215, 0.225, 0.222, 0.21, 0.192, 0.17, 0.145, 0.115, 0.085, 0.05];
    loft(mb, Z.map((z, i) => ({ c: [0, (YB[i] + YT[i]) / 2, z], a: A[i], b: (YT[i] - YB[i]) / 2, e: 0.66 })), (i, k, cu, sv) => (sv < -0.55 ? PL : P), S(26), 'se');
    if (hi) {
      for (const s of [-1, 1]) {
        const pts = [];
        for (let i = 1; i < Z.length - 2; i++) {
          const cy = (YB[i] + YT[i]) / 2, b = (YT[i] - YB[i]) / 2;
          pts.push([s * (A[i] * 0.985 + 0.004), cy - 0.3 * b, Z[i]]);
        }
        tubePath(mb, pts, 0.007, ALU, 6);
      }
    }
  }
  // ---- sele (iki kademeli, yanlarda biye)
  {
    const Z = [-0.08, -0.03, 0.06, 0.18, 0.3, 0.4, 0.46, 0.49];
    const YT = [0.775, 0.8, 0.812, 0.806, 0.81, 0.826, 0.832, 0.822];
    const A = [0.1, 0.15, 0.18, 0.195, 0.2, 0.195, 0.18, 0.14];
    const SEAT = C('#1f1c1b', -0.35), PIPE = C('#6b6560', -0.2);
    loft(mb, Z.map((z, i) => ({ c: [0, YT[i] - 0.05, z], a: A[i], b: 0.05, b2: 0.03, e: 0.55 })), (i, k, cu, sv) => (Math.abs(sv) < 0.2 && Math.abs(cu) > 0.9 ? PIPE : SEAT), S(22), 'se');
  }
  // ---- bagaj ızgarası + tutunma kolları + teslimat kutusu (arka yüzüne logo ayrıca çizilir)
  mb.rbox(-0.2, 0.815, 0.44, 0.2, 0.84, 0.9, 0.01, PL, 1);
  for (const s of [-1, 1]) tubePath(mb, [[s * 0.17, 0.79, 0.4], [s * 0.215, 0.825, 0.47], [s * 0.226, 0.836, 0.62], [s * 0.216, 0.836, 0.8], [s * 0.17, 0.826, 0.9]], 0.014, ALU, S(8));
  {
    const BX = 0.24, BY0 = 0.86, BY1 = 1.3, BZ0 = 0.45, BZ1 = 0.91;
    mb.rbox(-BX, BY0, BZ0, BX, BY1 - 0.04, BZ1, 0.04, B, hi ? 3 : 2);
    mb.rbox(-BX - 0.008, BY1 - 0.062, BZ0 - 0.008, BX + 0.008, BY1, BZ1 + 0.008, 0.036, Bd, hi ? 3 : 2);
    mb.rbox(-0.08, BY1 - 0.004, 0.61, 0.08, BY1 + 0.02, 0.73, 0.012, PL, 2);
    for (const s of [-1, 1]) {
      mb.rbox(s * BX - 0.004, 1.0, BZ0 + 0.05, s * BX + 0.004, 1.032, BZ1 - 0.05, 0.003, [0.88, 0.9, 0.92, 0.45], 1);
      mb.rbox(s * 0.2 - 0.022, BY0 - 0.014, BZ0 + 0.02, s * 0.2 + 0.022, BY0 + 0.012, BZ1 - 0.02, 0.006, PL, 1);
      mb.rbox(s * 0.205 - 0.022, 0.874, BZ1 - 0.002, s * 0.205 + 0.022, 0.893, BZ1 + 0.006, 0.004, C('#e0242c', 0.45), 1);
    }
  }
  // ---- stop lambası (füme çerçeveli LED), arka sinyaller, plaka (TR şeritli) ve plaka kolu
  mb.superS(0, 0.758, 0.972, 0.112, 0.04, 0.03, 0.6, 0.6, LENS, S(14), S(6));
  mb.superS(0, 0.758, 0.986, 0.09, 0.025, 0.015, 0.6, 0.6, C('#ff2626', 1), S(12), S(5));
  for (const s of [-1, 1]) mb.sphereS(s * 0.13, 0.73, 0.932, 0.03, 0.017, 0.02, [1, 0.56, 0.1, -0.6], S(8), 4);
  limb(mb, [0, 0.71, 0.9], [0, 0.57, 0.985], [0.022, 0.02], PL, S(8));
  mb.rbox(-0.125, 0.51, 0.968, 0.125, 0.585, 0.996, 0.02, PL, 2);
  mb.rbox(-0.11, 0.42, 0.993, 0.11, 0.55, 1.006, 0.008, C('#f4f4f0', -0.4), 1);
  mb.rbox(-0.108, 0.424, 1.004, -0.086, 0.546, 1.009, 0.003, C('#1f4fbf'), 1);
  if (hi) for (let k = 0; k < 6; k++) mb.box(-0.072 + k * 0.03, 0.462, 1.005, -0.054 + k * 0.03, 0.512, 1.01, C('#1a1a22'), 'b');
  // ---- sol: CVT kartel (gümüş kapaklı) ; sağ: egzoz (koyu susturucu, alüminyum ısı kalkanı, krom uç)
  mb.rbox(-0.19, 0.17, -0.06, -0.085, 0.4, 0.66, 0.07, C('#34373e', -0.35), hi ? 3 : 2);
  mb.rbox(-0.198, 0.21, 0.02, -0.18, 0.37, 0.56, 0.06, ALU, 2);
  if (hi) mb.sphereS(-0.19, WR, RZ, 0.04, 0.04, 0.02, CHR, 10, 6);
  tubePath(mb, [[0.03, 0.2, -0.02], [0.1, 0.19, 0.12], [0.16, 0.23, 0.26], [0.2, 0.3, 0.34]], 0.022, C('#3a3a40', -0.4), S(8));
  limb(mb, [0.205, 0.33, 0.36], [0.215, 0.41, 0.84], [0.05, 0.062, 0.064, 0.062, 0.055], C('#1f2024', -0.5), S(13));
  mb.push().T(0.283, 0.37, 0.6, 0, -0.165);
  mb.superS(0, 0, 0, 0.011, 0.05, 0.2, 0.7, 0.7, ALU, S(10), S(5));
  mb.pop();
  limb(mb, [0.215, 0.41, 0.84], [0.218, 0.414, 0.892], [0.032, 0.032], CHR, S(10));
  mb.sphereS(0.218, 0.414, 0.925, 0.02, 0.02, 0.006, C('#15161a'), S(8), 4);
  // ===== sürücü =====
  const PANT = C('#2a2e38', -0.1), SHOE = C('#17171b', -0.35), SOLE = C('#e8e6e0', -0.2), GLOVE = C('#1a1b1f', -0.3);
  const REFL = [0.86, 0.88, 0.9, 0.45];
  // kalça + bacaklar + spor ayakkabılar
  mb.superS(0, 0.895, 0.235, 0.165, 0.085, 0.14, 0.7, 0.75, PANT, S(14), S(8));
  for (const s of [-1, 1]) {
    const down = stop && s < 0;
    const hip = [s * 0.1, 0.9, 0.2], knee = down ? [-0.2, 0.62, -0.05] : [s * 0.158, 0.94, -0.19], ank = down ? [-0.3, 0.135, -0.085] : [s * 0.152, 0.45, -0.235];
    limb(mb, hip, knee, [0.086, 0.084, 0.075, 0.064], PANT, S(10));
    limb(mb, knee, ank, [0.062, 0.06, 0.052, 0.044], PANT, S(10));
    const fx2 = down ? -0.3 : s * 0.152, fy2 = down ? 0.08 : 0.39, fz2 = down ? -0.14 : -0.29;
    mb.superS(fx2, fy2, fz2, 0.054, 0.045, 0.125, 0.75, 0.6, SHOE, S(12), S(7));
    mb.superS(fx2, fy2 - 0.035, fz2, 0.057, 0.016, 0.128, 0.6, 0.5, SOLE, S(12), 3);
  }
  // mont (işletme renginde): bel bandı, göğüste reflektör bant, koyu omuz boyunduruğu, yaka
  const YK = C('#2b2d34', -0.15);
  {
    const T = [
      [0.905, 0.252, 0.168, 0.13, Bd], [0.93, 0.248, 0.168, 0.13, Bd], [0.94, 0.246, 0.167, 0.129, B], [1.02, 0.232, 0.164, 0.124, B],
      [1.13, 0.204, 0.178, 0.128, B], [1.205, 0.182, 0.192, 0.13, B], [1.212, 0.18, 0.193, 0.13, REFL],
      [1.252, 0.169, 0.2, 0.13, REFL], [1.259, 0.167, 0.201, 0.129, B], [1.33, 0.142, 0.212, 0.122, B],
      [1.355, 0.133, 0.212, 0.118, B], [1.36, 0.131, 0.212, 0.117, YK], [1.4, 0.117, 0.204, 0.107, YK],
      [1.44, 0.1, 0.17, 0.096, YK], [1.448, 0.092, 0.132, 0.088, YK], [1.462, 0.078, 0.098, 0.082, YK], [1.49, 0.07, 0.088, 0.076, YK], [1.5, 0.068, 0.084, 0.072, PL],
    ];
    loft(mb, T.map(([y, z, a, b]) => ({ c: [0, y, z], a, b, e: 0.82 })), (i) => T[i][4], S(24), 's');
    // katlanmış kapüşon: yakanın arkasında yumuşak kabarık rulo (iki tonlu)
    mb.push().T(0, 1.445, 0.17, 0, 0.5);
    mb.superS(0, 0, 0, 0.13, 0.05, 0.06, 0.7, 0.7, null, S(16), S(8), (nx, ny) => (ny > 0.35 ? shade(YK, 1.25) : YK));
    mb.pop();
    if (hi) for (const sd of [-1, 1]) limb(mb, [sd * 0.04, 1.44, -0.03], [sd * 0.045, 1.33, -0.06], [0.006, 0.006], C('#eeeeee', -0.2), 5);
  }
  // kollar: omuz → dirsek → bilek (IK ile gidona), üst kolda reflektör, bilekte manşet, eldivenli eller
  for (const s of [-1, 1]) {
    const Sh = [s * 0.2, 1.385, 0.125], H = [s * 0.3, 1.1, -0.4];
    const E = ik2(Sh, H, 0.32, 0.34, [s * 0.75, -0.55, 0.35]);
    mb.sphereS(Sh[0] - s * 0.016, Sh[1] + 0.002, Sh[2], 0.07, 0.066, 0.074, null, S(10), S(7), (ux, uy) => (uy > -0.1 ? YK : B));
    limb(mb, Sh, E, [0.066, 0.064, 0.058, 0.054], B, S(12), [[0.55, 0.12, REFL]]);
    const W = [lerp(E[0], H[0], 0.8), lerp(E[1], H[1], 0.8), lerp(E[2], H[2], 0.8)];
    limb(mb, E, W, [0.054, 0.052, 0.046, 0.041], B, S(12), [[0.9, 0.16, PL]]);
    mb.superS(H[0], H[1] + 0.006, H[2], 0.052, 0.046, 0.062, 0.7, 0.7, GLOVE, S(10), S(7));
  }
  // boyunluk (koyu): yaka ile kaskın arasında görünen boyun
  limb(mb, [0, 1.43, 0.055], [0, 1.55, 0.02], [0.062, 0.06, 0.058], C('#26272d', -0.05), S(12));
  // tam yüz kask (oyuncu renginde, parlak)
  mb.push().T(0, 1.632, -0.012, 0, -0.06);
  helmetModel(mb, P, q);
  mb.pop();
  return mb;
}

// Teslimat kutusunun arka yüzü (logo dokusu) — dokulu mesh
function boxDecal(tb) {
  tb.tquad([-0.18, 0.9, 0.915], [0.18, 0.9, 0.915], [0.18, 1.24, 0.915], [-0.18, 1.24, 0.915], 0, 0, 1, 1, [0, 1.07, 0]);
  return tb;
}

// Arka plaka: beyaz zemin, solda mavi TR şeridi, koyu karakterler (yüzü +z yönünde; z = plakanın ön yüzü)
function rearPlate(mb, cx, cy, z, w = 0.52, h = 0.12) {
  mb.rbox(cx - w / 2, cy - h / 2, z - 0.012, cx + w / 2, cy + h / 2, z, 0.012, C('#f4f4f0', -0.4), 1);
  mb.box(cx - w / 2 + 0.008, cy - h / 2 + 0.008, z - 0.002, cx - w / 2 + 0.05, cy + h / 2 - 0.008, z + 0.003, C('#1f4fbf'));
  for (let k = 0; k < 7; k++) {
    if (k === 2 || k === 5) continue;
    const x0 = cx - w / 2 + 0.075 + k * ((w - 0.1) / 7);
    mb.box(x0, cy - h * 0.28, z - 0.002, x0 + (w - 0.1) / 7 * 0.62, cy + h * 0.28, z + 0.003, C('#1a1a22'));
  }
}
const CAR_COLORS = ['#d7263d', '#1b4dd8', '#f3f3f3', '#a9b0ba', '#22252b', '#ffcf1f', '#2e8b57', '#f07f13', '#7a3cff'];
// Kabin camları: yuvarlatılmış ve daralan kabinin (rbox + taper) düz yüzlerine oturan koyu parlak camlar.
// hw: kabinin yarı genişliği, y0/y1 ve zf/zb kabinin sınırları, r: kabin köşe yarıçapı, fa/fb: camın yükseklik aralığı (0..1)
function cabinGlass(mb, hw, y0, y1, zf, zb, tx, tz, r, fa = 0.18, fb = 0.84, glass = GLASS) {
  const h = y1 - y0, zc = (zf + zb) / 2, hz = (zb - zf) / 2;
  const at = (y) => { const t = (y - y0) / h; return [hw * (1 - tx * t), zc - hz * (1 - tz * t), zc + hz * (1 - tz * t)]; };
  const ya = y0 + h * fa, yb = y0 + h * fb;
  const A = at(ya), Bq = at(yb);
  const o = 0.012, ix = r + 0.03, iz = r + 0.05;
  const cen = [0, (ya + yb) / 2, zc];
  mb.quad([-(A[0] - ix), ya, A[1] - o], [A[0] - ix, ya, A[1] - o], [Bq[0] - ix, yb, Bq[1] - o], [-(Bq[0] - ix), yb, Bq[1] - o], glass, cen);
  mb.quad([-(A[0] - ix), ya, A[2] + o], [A[0] - ix, ya, A[2] + o], [Bq[0] - ix, yb, Bq[2] + o], [-(Bq[0] - ix), yb, Bq[2] + o], glass, cen);
  for (const s of [-1, 1]) {
    const z0a = A[1] + iz, z1a = A[2] - iz, z0b = Bq[1] + iz, z1b = Bq[2] - iz;
    const ma = (z0a + z1a) / 2, mbz = (z0b + z1b) / 2;
    mb.quad([s * (A[0] + o), ya, z0a], [s * (A[0] + o), ya, ma - 0.05], [s * (Bq[0] + o), yb, mbz - 0.05], [s * (Bq[0] + o), yb, z0b], glass, cen);
    mb.quad([s * (A[0] + o), ya, ma + 0.05], [s * (A[0] + o), ya, z1a], [s * (Bq[0] + o), yb, z1b], [s * (Bq[0] + o), yb, mbz + 0.05], glass, cen);
  }
}
function carModel(mb, color, taxi = false) {
  const K = C(color, -0.62);
  const Kd = shade(K, 0.6);
  // alt gövde (yuvarlak kenarlı) + kaput/bagaj eğimi
  mb.rbox(-0.92, 0.3, -2.1, 0.92, 0.86, 2.1, 0.17, K, 3);
  mb.rbox(-0.9, 0.78, -2.02, 0.9, 0.92, -1.0, 0.1, K, 2, [0.04, 0.0]);
  mb.rbox(-0.9, 0.78, 1.15, 0.9, 0.92, 2.02, 0.1, K, 2);
  // kabin: daralan, yuvarlak tavanlı
  mb.rbox(-0.86, 0.82, -1.08, 0.86, 1.5, 1.08, 0.1, K, 3, [0.16, 0.36]);
  cabinGlass(mb, 0.86, 0.82, 1.5, -1.08, 1.08, 0.16, 0.36, 0.1, 0.2, 0.85);
  // tamponlar, ızgara, farlar, stoplar, plakalar
  mb.rbox(-0.95, 0.28, 1.98, 0.95, 0.5, 2.18, 0.08, C('#1c1d22', -0.3), 2);
  mb.rbox(-0.95, 0.28, -2.18, 0.95, 0.5, -1.98, 0.08, C('#1c1d22', -0.3), 2);
  mb.rbox(-0.42, 0.52, -2.14, 0.42, 0.72, -2.05, 0.04, C('#16171b', -0.6), 2);
  for (const s of [-1, 1]) {
    mb.sphereS(s * 0.66, 0.67, -2.07, 0.2, 0.075, 0.05, C('#fffbe0', 1), 14, 8);
    mb.rbox(s * 0.84 - 0.2, 0.62, 2.06, s * 0.84 + 0.2, 0.78, 2.13, 0.03, C('#ff1e1e', 1), 2);
    // aynalar
    mb.rbox(s * 0.98 - 0.06, 0.95, -0.86, s * 0.98 + 0.06, 1.06, -0.72, 0.03, K, 2);
    // kapı çizgileri + kulplar
    mb.quad([s * 0.925, 0.4, -0.05], [s * 0.925, 0.4, -0.03], [s * 0.925, 0.84, -0.03], [s * 0.925, 0.84, -0.05], Kd, [0, 0.6, 0]);
    mb.rbox(s * 0.925 - 0.01, 0.74, -0.35, s * 0.925 + 0.02, 0.77, -0.2, 0.01, C('#c9ccd4', -0.85), 1);
    mb.rbox(s * 0.925 - 0.01, 0.74, 0.35, s * 0.925 + 0.02, 0.77, 0.5, 0.01, C('#c9ccd4', -0.85), 1);
  }
  rearPlate(mb, 0, 0.615, 2.2, 0.52, 0.12);
  mb.rbox(-0.28, 0.33, -2.2, 0.28, 0.45, -2.17, 0.015, C('#f2f2f2'), 1);
  for (const s of [-1, 1]) mb.rbox(Math.min(s * 0.64, s * 0.73), 0.645, 2.125, Math.max(s * 0.64, s * 0.73), 0.755, 2.14, 0.012, C('#e8e8ea', -0.6), 1);
  limb(mb, [0.52, 0.27, 1.9], [0.52, 0.27, 2.24], [0.035, 0.035], C('#9aa0a8', -0.85), 10);
  mb.sphereS(0.52, 0.27, 2.255, 0.022, 0.022, 0.006, C('#141519'), 8, 4);
  [[-0.84, 1.32], [0.84, 1.32], [-0.84, -1.32], [0.84, -1.32]].forEach(([x, z]) => wheel(mb, x, 0.33, z, 0.33, 0.24, METAL));
  if (taxi) {
    mb.rbox(-0.34, 1.5, -0.12, 0.34, 1.72, 0.22, 0.05, C('#1a1a1a', -0.3), 2);
    mb.rbox(-0.33, 1.56, -0.13, 0.33, 1.68, 0.23, 0.04, C('#fff3a8', 0.5), 2);
    // damalı şerit
    for (let k = 0; k < 10; k++) for (const s of [-1, 1]) {
      const z0 = -1.0 + k * 0.2;
      mb.quad([s * 0.926, 0.58, z0], [s * 0.926, 0.58, z0 + 0.1], [s * 0.926, 0.66, z0 + 0.1], [s * 0.926, 0.66, z0], C(k % 2 ? '#111111' : '#f5f5f5'), [0, 0.6, 0]);
    }
  }
  return mb;
}
function vanModel(mb, color) {
  const K = C(color, -0.5);
  // yük bölümü + eğimli burunlu kabin
  mb.rbox(-0.99, 0.36, -1.45, 0.99, 2.26, 2.52, 0.18, K, 3);
  mb.rbox(-0.97, 0.36, -2.66, 0.97, 1.92, -1.2, 0.12, K, 3, [0.04, 0.42]);
  cabinGlass(mb, 0.97, 0.36, 1.92, -2.66, -1.2, 0.04, 0.42, 0.12, 0.47, 0.9);
  mb.rbox(-1.0, 0.34, 2.45, 1.0, 0.56, 2.62, 0.07, C('#1c1d22', -0.3), 2);
  mb.rbox(-0.99, 0.34, -2.74, 0.99, 0.6, -2.55, 0.08, C('#1c1d22', -0.3), 2);
  mb.quad([-0.015, 0.5, 2.525], [0.015, 0.5, 2.525], [0.015, 2.1, 2.525], [-0.015, 2.1, 2.525], shade(K, 0.6), [0, 1.2, 0]);
  mb.quad([-0.85, 1.45, 2.53], [0.85, 1.45, 2.53], [0.85, 2.0, 2.53], [-0.85, 2.0, 2.53], GLASS, [0, 1.7, 0]);
  rearPlate(mb, 0, 0.66, 2.545, 0.52, 0.12);
  for (const s of [-1, 1]) {
    mb.rbox(s * 0.12 - 0.05, 1.12, 2.52, s * 0.12 + 0.05, 1.16, 2.56, 0.012, C('#c9ccd4', -0.85), 1);
    mb.rbox(s * 0.85 - 0.1, 1.05, 2.505, s * 0.85 + 0.1, 1.12, 2.55, 0.02, C('#eeeeee', -0.6), 1);
    mb.rbox(s * 0.86 - 0.08, 0.42, 2.615, s * 0.86 + 0.08, 0.48, 2.632, 0.01, C('#e0242c', 0.45), 1);
  }
  for (const s of [-1, 1]) {
    mb.rbox(s * 0.85 - 0.12, 0.75, 2.5, s * 0.85 + 0.12, 1.02, 2.56, 0.03, C('#ff1e1e', 1), 2);
    mb.sphereS(s * 0.7, 0.8, -2.66, 0.17, 0.08, 0.05, C('#fffbe0', 1), 12, 8);
    mb.rbox(s * 1.06 - 0.06, 1.3, -1.9, s * 1.06 + 0.06, 1.45, -1.74, 0.03, K, 2);
    // kayar kapı rayı
    mb.quad([s * 0.995, 1.62, -1.0], [s * 0.995, 1.62, 0.6], [s * 0.995, 1.64, 0.6], [s * 0.995, 1.64, -1.0], shade(K, 0.55), [0, 1.2, 0]);
  }
  [[-0.9, 1.6], [0.9, 1.6], [-0.9, -1.75], [0.9, -1.75]].forEach(([x, z]) => wheel(mb, x, 0.36, z, 0.36, 0.26, METAL));
  return mb;
}
function busModel(mb, color) {
  const K = C(color, -0.45);
  const Wt = C('#ecedf1', -0.45);
  mb.rbox(-1.05, 0.38, -5.2, 1.05, 2.95, 5.2, 0.3, (nx, ny) => (ny > 0.55 ? Wt : K), 3);
  // pencere bandı (yanlarda), ön ve arka camlar
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const z0 = -4.0 + k * 1.45, z1 = z0 + 1.3;
      mb.quad([s * 1.056, 1.48, z0], [s * 1.056, 1.48, z1], [s * 1.056, 2.5, z1], [s * 1.056, 2.5, z0], GLASS, [0, 2, (z0 + z1) / 2]);
    }
    mb.quad([s * 1.056, 0.95, -5.0], [s * 1.056, 0.95, 5.0], [s * 1.056, 1.08, 5.0], [s * 1.056, 1.08, -5.0], C('#f4f4f4', -0.3), [0, 1, 0]);
    mb.rbox(s * 0.82 - 0.14, 0.6, 5.18, s * 0.82 + 0.14, 0.95, 5.25, 0.04, C('#ff1e1e', 1), 2);
    mb.sphereS(s * 0.72, 0.75, -5.22, 0.16, 0.09, 0.04, C('#fffbe0', 1), 12, 8);
    mb.rbox(s * 1.12 - 0.05, 2.0, -5.0, s * 1.12 + 0.05, 2.35, -4.86, 0.03, C('#1b1b20', -0.5), 2);
  }
  mb.quad([-0.95, 0.75, -5.215], [0.95, 0.75, -5.215], [0.92, 2.55, -5.215], [-0.92, 2.55, -5.215], GLASS, [0, 1.6, 0]);
  mb.quad([-0.9, 1.9, 5.215], [0.9, 1.9, 5.215], [0.9, 2.6, 5.215], [-0.9, 2.6, 5.215], GLASS, [0, 2.2, 0]);
  mb.rbox(-0.55, 2.6, -5.24, 0.55, 2.82, -5.18, 0.03, C('#ffb21e', 1), 2);
  mb.rbox(-0.5, 2.64, 5.19, 0.5, 2.82, 5.25, 0.03, C('#ffb21e', 1), 2);
  mb.rbox(-0.78, 0.82, 5.2, 0.78, 1.7, 5.235, 0.04, shade(K, 0.72), 2);
  for (let k = 0; k < 8; k++) mb.box(-0.7, 0.9 + k * 0.1, 5.232, 0.7, 0.935 + k * 0.1, 5.25, C('#15161b', -0.3));
  rearPlate(mb, 0, 0.71, 5.222, 0.52, 0.12);
  mb.rbox(-1.0, 1.76, 5.2, 1.0, 1.8, 5.24, 0.01, [0.9, 0.9, 0.92, 0.45], 1);
  mb.rbox(-1.06, 0.36, 5.12, 1.06, 0.58, 5.32, 0.08, C('#1c1d22', -0.3), 2);
  mb.rbox(-1.06, 0.36, -5.32, 1.06, 0.58, -5.12, 0.08, C('#1c1d22', -0.3), 2);
  [[-0.94, 3.4], [0.94, 3.4], [-0.94, -3.3], [0.94, -3.3]].forEach(([x, z]) => wheel(mb, x, 0.42, z, 0.42, 0.3, METAL));
  return mb;
}

function coneModel(mb) {
  const O = C('#ff6a00');
  mb.box(-0.3, 0, -0.3, 0.3, 0.05, 0.3, C('#1c1c1c'));
  mb.lathe(0, 0, 0, [[0.25, 0.05], [0.166, 0.36], [0.166, 0.36], [0.128, 0.5], [0.128, 0.5], [0.036, 0.78], [0, 0.785]], 16, (i) => (i >= 2 && i <= 3 ? C('#f6f6f6', -0.45) : C('#ff6a00', -0.4)));
  return mb;
}
function barrierModel(mb) {
  [-0.82, 0.82].forEach((x) => {
    mb.rbox(x - 0.05, 0, -0.05, x + 0.05, 1.0, 0.05, 0.025, C('#dadada', -0.3), 2);
    mb.rbox(x - 0.2, 0, -0.24, x + 0.2, 0.07, 0.24, 0.03, C('#3a3a3a'), 2);
  });
  mb.rbox(-1.0, 0.52, -0.055, 1.0, 0.92, 0.055, 0.04, (nx, ny, nz) => C('#f5f5f5', -0.3), 2);
  for (let i = 0; i < 6; i += 2) {
    const x0 = -0.98 + i * (1.96 / 6);
    for (const s of [-1, 1]) mb.quad([x0, 0.54, s * 0.057], [x0 + 1.96 / 6, 0.54, s * 0.057], [x0 + 1.96 / 6, 0.9, s * 0.057], [x0, 0.9, s * 0.057], C('#e3262b', -0.3), [x0, 0.7, 0]);
  }
  mb.sphereS(0, 1.0, 0, 0.07, 0.07, 0.07, C('#ffb000', 1), 10, 6);
  return mb;
}
function puddleModel(mb, R) {
  // ıslak asfalt halkası (koyu, hafif parlak) + gökyüzünü yansıtan su (çok parlak) + kenarda ince ışıltı
  const N = 36;
  const p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28;
  const j = Array.from({ length: N }, (_, k) => { const a = (k / N) * Math.PI * 2; return 0.86 + 0.09 * Math.sin(2 * a + p1) + 0.07 * Math.sin(3 * a + p2) + 0.04 * Math.sin(5 * a + p3); });
  const up = [0, 1, 0];
  const ring = (rx, rz, y, col, sc = 1) => {
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
      const j0 = j[k] * sc, j1 = j[(k + 1) % N] * sc;
      mb.triN([0, y, 0], [Math.cos(a0) * rx * j0, y, Math.sin(a0) * rz * j0], [Math.cos(a1) * rx * j1, y, Math.sin(a1) * rz * j1], up, up, up, col);
    }
  };
  ring(1.08, 1.62, 0.012, C('#1c1f26', -0.35));
  ring(0.94, 1.46, 0.02, C('#7fa4c8', -0.6), 0.97);
  ring(0.9, 1.4, 0.024, C('#33506d', -0.97), 0.95);
  // yağmur halkaları
  for (let q = 0; q < 3; q++) {
    const cx = (R() - 0.5) * 0.9, cz = (R() - 0.5) * 1.6, r = 0.12 + R() * 0.12;
    for (let k = 0; k < 14; k++) {
      const a0 = (k / 14) * Math.PI * 2, a1 = ((k + 1) / 14) * Math.PI * 2;
      const P = (a, rr) => [cx + Math.cos(a) * rr, 0.027, cz + Math.sin(a) * rr];
      mb.quadN(P(a0, r), P(a1, r), P(a1, r + 0.022), P(a0, r + 0.022), up, up, up, up, C('#b8d4ee', -0.8));
    }
  }
  return mb;
}
function rampModel(mb) {
  mb.wedge(-0.98, 0.98, 1.6, -1.6, 0.75, C('#ffc21a'), C('#343841'));
  for (let i = 0; i < 4; i++) {
    const z0 = 1.25 - i * 0.8;
    const h0 = ((1.6 - z0) / 3.2) * 0.75 + 0.012;
    const h1 = ((1.6 - (z0 - 0.35)) / 3.2) * 0.75 + 0.012;
    mb.quad([-0.6, h0, z0], [0, h1 + 0.0, z0 - 0.35], [0, h1 + 0.0, z0 - 0.15], [-0.6, h0, z0 + 0.2], C('#1d1d22'), [0, -1, z0]);
    mb.quad([0.6, h0, z0], [0, h1, z0 - 0.35], [0, h1, z0 - 0.15], [0.6, h0, z0 + 0.2], C('#1d1d22'), [0, -1, z0]);
  }
  return mb;
}
function padModel(mb) {
  mb.box(-0.98, 0, -1.3, 0.98, 0.04, 1.3, C('#1a2340'));
  for (let i = 0; i < 3; i++) {
    const z = 0.7 - i * 0.75;
    const G = C('#36e7ff', 1);
    mb.quad([-0.7, 0.05, z + 0.25], [0, 0.05, z - 0.35], [0, 0.05, z - 0.12], [-0.7, 0.05, z + 0.48], G, [0, -1, z]);
    mb.quad([0.7, 0.05, z + 0.25], [0, 0.05, z - 0.35], [0, 0.05, z - 0.12], [0.7, 0.05, z + 0.48], G, [0, -1, z]);
  }
  return mb;
}


/* ============ tatlı parçaları (Eliz temasında hem Kurye/masa sahnelerinde hem Mutfak Kaosu'nda kullanılır) ============ */
const DES = (() => {
  const hs = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const mix = (a, b, t) => { const A = C(a), B = C(b); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t]; };
  // bütün çilek: sivri uç aşağıda, omuzlarda koyu kırmızı; yüzeyde çukurdaki sarı çekirdekler, sarkan çanak yapraklar ve kısa sap
  function straw(mb, x, y, z, s = 1, yaw = 0, tilt = 0) {
    const P = [[0, 0], [0.03, 0.012], [0.068, 0.055], [0.098, 0.11], [0.114, 0.16], [0.116, 0.195], [0.104, 0.225], [0.078, 0.245], [0.04, 0.256], [0, 0.26]];
    const col = ['#f24a2e', '#f04030', '#e8312a', '#dd2524', '#d41d22', '#c9181f', '#c0141d', '#b8121b', '#ad101a', '#a80f19'];
    mb.push().T(x, y, z, yaw, tilt, 0, s);
    mb.lathe(0, 0, 0, P, 22, (i) => C(col[i], -0.62));
    const rAt = (h) => { for (let i = 1; i < P.length; i++) if (P[i][1] >= h) { const t = (h - P[i - 1][1]) / (P[i][1] - P[i - 1][1]); return P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t; } return 0; };
    for (let k = 0; k < 34; k++) {
      const h = 0.03 + (k / 34) * 0.19, a = k * 2.39996, r = rAt(h) * 0.985;
      mb.push().T(Math.cos(a) * r, h, Math.sin(a) * r, -a, 0, Math.PI / 2);
      mb.sphereS(0, 0, 0, 0.007, 0.004, 0.0105, C(k % 3 ? '#ffd65a' : '#f5c040', -0.35), 5, 3);
      mb.pop();
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      mb.push().T(Math.cos(a) * 0.045, 0.252, Math.sin(a) * 0.045, -a, 0, -0.5 - 0.15 * (k % 2));
      mb.sphereS(0.045, 0, 0, 0.055, 0.007, 0.02, null, 10, 4, (ux) => mix('#2f8a2a', '#6cc04a', clamp(ux * 0.5 + 0.5, 0, 1)));
      mb.pop();
    }
    limb(mb, [0, 0.25, 0], [0.012, 0.31, 0.006], [0.009, 0.007], C('#4f7d24', -0.3), 6, null, 1);
    mb.pop();
  }
  // çilek dilimi: yatay yatan, damla biçimli kesit — kırmızı kabuk, pembe et, ortada beyaz öz
  function strawSlice(mb, x, y, z, yaw = 0, s = 1) {
    mb.push().T(x, y, z, yaw, 0, 0, s);
    const cf = (ux, uy, uz) => {
      const d = Math.hypot(ux, uz);
      if (Math.abs(uy) < 0.45 || d > 0.9) return C('#cf1d1f', -0.6);
      if (d > 0.68) return C(hs(Math.floor(ux * 9), Math.floor(uz * 9)) > 0.86 ? '#ffd65a' : '#e9393a', -0.55);
      if (Math.abs(uz) < 0.14 && ux > -0.55 && ux < 0.45) return C('#fff1ec', -0.5);
      return mix('#ff8f86', '#ffc6bd', 1 - d * 1.2);
    };
    mb.sphereS(0, 0.011, 0, 0.078, 0.011, 0.064, null, 18, 6, cf);
    mb.sphereS(0.05, 0.011, 0, 0.05, 0.0102, 0.034, null, 12, 6, (ux, uy) => (Math.abs(uy) < 0.45 ? C('#cf1d1f', -0.6) : C('#e9393a', -0.55)));
    mb.pop();
  }
  // muz: kesitli (köşeli) kavisli gövde; sapa doğru yeşilimsi, uçta kahverengi nokta
  function banana(mb, x, y, z, yaw = 0, s = 1, roll = 0) {
    const R = [], n = 18;
    for (let i = 0; i <= n; i++) {
      const t = i / n, xx = (t - 0.5) * 0.5, yy = 0.2 * (t - 0.5) * (t - 0.5) + 0.05;
      const w = i === 0 ? 0.016 : i === n ? 0.012 : 0.02 + 0.034 * Math.pow(Math.sin(Math.PI * t), 0.55);
      R.push({ c: [xx, yy, 0], a: w, b: w * 0.92, e: 0.82 });
    }
    mb.push().T(x, y, z, yaw, 0, roll, s);
    loft(mb, R, (i, k) => {
      const t = i / n;
      if (t < 0.06) return C('#6f6a2a', -0.3);
      if (t > 0.96) return C('#3a2814', -0.25);
      const g = clamp((0.24 - t) / 0.18, 0, 1), ridge = k % 4 === 0 ? 0.12 : 0;
      const c = mix('#f8d63e', '#b7c43a', g * 0.8);
      return [c[0] * (1 - ridge), c[1] * (1 - ridge), c[2] * (1 - ridge), -0.45];
    }, 16, 'se', [0, 1, 0]);
    limb(mb, [-0.255, 0.1, 0], [-0.3, 0.135, 0], [0.012, 0.01], C('#5e5a24', -0.3), 6, null, 1);
    mb.pop();
  }
  function bananaSlice(mb, x, y, z, s = 1) {
    const r = 0.058 * s, h = 0.02 * s;
    mb.lathe(x, y, z, [[0, 0], [r, 0], [r * 1.03, h * 0.5], [r, h], [r * 0.82, h], [r * 0.42, h * 1.02], [0, h * 1.04]], 18, (i) => C(['#efe0a6', '#efe0a6', '#f3e6b2', '#f6ebbf', '#fff6d8', '#f0e1a8', '#fffaea'][i], -0.42));
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.4; mb.sphereS(x + Math.cos(a) * r * 0.2, y + h * 1.04, z + Math.sin(a) * r * 0.2, r * 0.07, r * 0.03, r * 0.07, C('#6b4a2a', -0.3), 5, 3); }
  }
  // waffle: köşeleri yuvarlak gövde, derin gözler, kızarmış çıtalar ve dış çerçeve. W yarım genişlik, n göz sayısı
  function waffle(mb, x, y, z, W = 0.26, H = 0.075, n = 5, burnt = false, yaw = 0, tilt = 0) {
    const base = burnt ? '#1c1511' : '#b56e2a', rid = burnt ? '#2e231b' : '#eaa94e', top = burnt ? '#3a2c22' : '#f6c870';
    mb.push().T(x, y, z, yaw, tilt, 0);
    mb.rbox(-W, 0, -W, W, H * 0.62, W, W * 0.16, C(base, burnt ? -0.1 : -0.3), 3);
    const step = (2 * W) / n, rw = step * 0.2;
    for (let k = 0; k <= n; k++) {
      const p = -W + k * step, edge = k === 0 || k === n;
      const c1 = C(edge ? top : hs(k, 3) > 0.5 ? rid : top, burnt ? -0.1 : -0.45);
      mb.rbox(p - rw, H * 0.4, -W, p + rw, H, W, rw * 0.7, c1, 2);
      mb.rbox(-W, H * 0.4, p - rw, W, H * 0.985, p + rw, rw * 0.7, C(hs(k, 7) > 0.5 ? rid : top, burnt ? -0.1 : -0.45), 2);
    }
    // gözlerin dibi: koyu, hafif parlak tereyağı
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = -W + (i + 0.5) * step, cz = -W + (j + 0.5) * step;
      mb.box(cx - step * 0.3, H * 0.6, cz - step * 0.3, cx + step * 0.3, H * 0.63, cz + step * 0.3, C(burnt ? '#120d0a' : hs(i, j) > 0.7 ? '#e0a048' : '#9c5a22', burnt ? -0.1 : -0.55));
    }
    mb.pop();
  }
  // çikolata sosu: üstten akıtılmış ince zikzak çizgiler (parlak)
  function drizzle(mb, y, R, lines = 5, seed = 1) {
    const col = C('#3a1a0b', -0.85);
    for (let l = 0; l < lines; l++) {
      const zz = -R * 0.8 + (l / Math.max(1, lines - 1)) * R * 1.6, rings = [];
      const half = Math.sqrt(Math.max(0, R * R - zz * zz)) * 0.95;
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, xx = -half + t * 2 * half;
        rings.push({ c: [xx, y + 0.004 * Math.sin(t * 9 + l), zz + 0.01 * Math.sin(t * 6 + l * 2 + seed)], a: 0.0065, b: 0.005 });
      }
      loft(mb, rings, col, 6, 'se', [0, 1, 0]);
    }
  }
  // tepeden akan çikolata damlası: kenardan aşağı uzayan, ucu şişkin damla
  function drip(mb, x, y, z, len, r = 0.016) {
    const col = C('#3a1a0b', -0.85);
    limb(mb, [x, y, z], [x, y - len, z], [r * 0.8, r * 0.75, r * 1.25], col, 8, null, 2);
  }
  // krem şanti: dişli huni yığını + sivri tepe
  function cream(mb, x, y, z, s = 1) {
    const prof = [[0, 0], [0.07, 0], [0.074, 0.02], [0.062, 0.045], [0.05, 0.06], [0.054, 0.075], [0.038, 0.095], [0.028, 0.11], [0.03, 0.12], [0.014, 0.14], [0, 0.155]].map(([r, h]) => [r * s, h * s]);
    mb.push().T(x, y, z);
    mb.lathe(0, 0, 0, prof, 24, (i, a) => C(Math.cos(a * 8) > 0.3 ? '#fffdf6' : '#f3eadb', -0.35));
    mb.pop();
  }
  function sugar(mb, y, R, n = 40, seed = 3) {
    for (let k = 0; k < n; k++) { const a = k * 2.39996 + seed, r = R * Math.sqrt((k + 0.5) / n); mb.sphereS(Math.cos(a) * r, y + 0.002 * hs(k, seed), Math.sin(a) * r, 0.006, 0.003, 0.006, C('#ffffff', -0.1), 5, 3); }
  }
  // kase: ayaklı, derin; dışı işletme renginde parlak seramik, beyaz dudak, içi açık
  function bowl(mb, y, R, bh, H = R * 0.62) {
    const out = (t) => mix(bh || '#0c96ac', '#0a6f80', t);
    const P = [[0, 0], [R * 0.4, 0], [R * 0.43, H * 0.06], [R * 0.4, H * 0.1], [R * 0.6, H * 0.28], [R * 0.86, H * 0.66], [R * 0.98, H * 0.94], [R, H], [R * 0.95, H * 1.005], [R * 0.86, H * 0.74], [R * 0.6, H * 0.36], [R * 0.3, H * 0.2], [0, H * 0.18]];
    mb.lathe(0, y, 0, P, 30, (i) => (i <= 3 ? C('#0a5f6e', -0.5) : i <= 6 ? (() => { const c = out((6 - i) / 4); return [c[0], c[1], c[2], -0.7]; })() : i <= 8 ? C('#f4fdfe', -0.65) : (() => { const c = mix(bh || '#0c96ac', '#ffffff', i < 10 ? 0.55 : i < 11 ? 0.45 : 0.38); return [c[0], c[1], c[2], -0.6]; })()));
    return y + H * 0.2;
  }
  // tatlı kupu: şeffaf bardakta dalgalı katlar (kek, krema, bisküvi), parlama çizgisi, kakaolu tepe
  function cup(mb, y, s, bh, topping = 'cocoa') {
    const Hc = 0.5 * s, r0 = 0.15 * s, r1 = 0.2 * s, N = 30, P = [[0, 0]];
    for (let i = 0; i <= N; i++) { const t = i / N; P.push([r0 + (r1 - r0) * t, t * Hc]); }
    P.push([0, Hc]);
    const LAY = [[0.2, '#4e2510'], [0.36, '#fff1d6'], [0.46, '#c48644'], [0.64, '#fff3dc'], [0.78, '#6b3418'], [1.01, '#fff6e6']];
    mb.lathe(0, y, 0, P, 44, (i, a) => {
      if (i === 0 || i === P.length - 1) return C('#4e2510', -0.5);
      const t = (i - 1) / N + 0.014 * Math.sin(a * 4);
      let c = (LAY.find((L) => t < L[0]) || LAY[LAY.length - 1])[1];
      let cc = C(c, -0.6);
      if (c === '#c48644' && hs(Math.floor(a * 9), i) > 0.6) cc = C('#8c5426', -0.5);
      const hl = Math.cos(a - 0.9) > 0.94 ? 0.45 : Math.cos(a - 1.1) > 0.85 ? 0.15 : 0;
      return [cc[0] + (1 - cc[0]) * hl, cc[1] + (1 - cc[1]) * hl, cc[2] + (1 - cc[2]) * hl, -0.75];
    });
    mb.torusN(0, y + Hc, 0, r1 + 0.004 * s, 0.009 * s, 0.009 * s, 32, 5, C('#f2fbfc', -0.85));
    if (topping === 'cocoa') {
      mb.sphereS(0, y + Hc, 0, r1 * 0.98, 0.06 * s, r1 * 0.98, null, 26, 8, (ux, uy, uz) => { const n = hs(Math.floor((ux + 1) * 21), Math.floor((uz + 1) * 21)); return uy < 0 ? C('#fff1d6', -0.4) : n > 0.72 ? [0.29, 0.15, 0.07, -0.12] : [0.43, 0.24, 0.12, -0.12]; });
      for (let k = 0; k < 9; k++) { const a = k * 2.39996, r = r1 * 0.7 * Math.sqrt((k + 0.5) / 9); mb.rbox(Math.cos(a) * r - 0.012 * s, y + Hc + 0.045 * s, Math.sin(a) * r - 0.008 * s, Math.cos(a) * r + 0.012 * s, y + Hc + 0.058 * s, Math.sin(a) * r + 0.008 * s, 0.004 * s, C(k % 2 ? '#2a1208' : '#f7ead0', -0.3), 1); }
    } else {
      mb.sphereS(0, y + Hc, 0, r1 * 0.98, 0.05 * s, r1 * 0.98, C('#fffaf0', -0.35), 24, 7);
      cream(mb, 0, y + Hc + 0.02 * s, 0, s * 0.9);
      strawSlice(mb, -r1 * 0.5, y + Hc + 0.04 * s, r1 * 0.2, 0.5, s * 0.9);
      bananaSlice(mb, r1 * 0.48, y + Hc + 0.035 * s, -r1 * 0.25, s * 0.9);
      straw(mb, 0.02 * s, y + Hc + 0.13 * s, 0, s * 0.55, 0.4, 0.3);
    }
    const sp = bh ? C(bh, -0.75) : C('#2aa6c8', -0.75);
    limb(mb, [0.06 * s, y + Hc + 0.03 * s, -0.02 * s], [0.13 * s, y + Hc + 0.3 * s, -0.04 * s], [0.012 * s, 0.014 * s], sp, 8, null, 2);
    mb.push().T(0.05 * s, y + Hc + 0.02 * s, -0.02 * s, 0, 0, 0.3);
    mb.sphereS(0, 0, 0, 0.034 * s, 0.014 * s, 0.026 * s, sp, 10, 6);
    mb.pop();
  }
  return { straw, strawSlice, banana, bananaSlice, waffle, drizzle, drip, cream, sugar, bowl, cup, hs };
})();

// Yiyecekler (merkez orijinde, ~0.7 m): pürüzsüz, parlak; masa üstü sahnelerde tabakta da kullanılır
function foodModel(mb, kind, brand) {
  const hs = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  if (kind === 'drum') {
    // çıtır tavuk budu: damla gövde (benekli kızarmış kabuk) + fildişi kemik
    mb.push().T(0, 0, -0.44, 0, Math.PI / 2);
    mb.lathe(0, 0, 0, [[0, 0], [0.12, 0.012], [0.21, 0.06], [0.27, 0.15], [0.29, 0.26], [0.275, 0.37], [0.215, 0.48], [0.135, 0.57], [0.088, 0.63], [0.078, 0.66]], 24, (i, a) => {
      const n = hs(Math.floor(a * 4.2), i * 3 + 1);
      return n > 0.8 ? C('#9a5216', -0.32) : n > 0.5 ? C('#e3a04a', -0.32) : C('#c9772a', -0.32);
    });
    mb.lathe(0, 0, 0, [[0.072, 0.62], [0.056, 0.72], [0.05, 0.86], [0.058, 0.9]], 12, C('#f6eedd', -0.25));
    mb.pop();
    mb.sphereS(-0.055, 0.0, 0.5, 0.08, 0.075, 0.075, C('#fbf5e8', -0.25), 12, 8);
    mb.sphereS(0.055, 0.0, 0.5, 0.08, 0.075, 0.075, C('#fbf5e8', -0.25), 12, 8);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.39996, zz = -0.36 + (k / 9) * 0.5, rr = 0.26 - Math.abs(zz + 0.15) * 0.4;
      mb.sphereS(Math.cos(a) * rr, Math.sin(a) * rr, zz, 0.045, 0.03, 0.045, C(k % 2 ? '#e8aa55' : '#b8661f', -0.3), 8, 5);
    }
  } else if (kind === 'rice') {
    // seramik kase + tane tane pilav kubbesi + çıtır tavuk parçaları + yeşillik
    mb.lathe(0, -0.26, 0, [[0, 0], [0.17, 0], [0.19, 0.02], [0.32, 0.2], [0.35, 0.27], [0.35, 0.27], [0.32, 0.272], [0.17, 0.06], [0, 0.05]], 26, (i) => (i === 4 || i === 5 ? C('#d33a2c', -0.6) : C('#fbfbf8', -0.65)));
    mb.sphereS(0, 0.0, 0, 0.31, 0.13, 0.31, null, 24, 10, (x, y, z) => { const n = hs(Math.floor((x + 1) * 23), Math.floor((z + 1) * 23)); const g = 0.93 + n * 0.07; return [g, g * 0.985, g * 0.95, -0.2]; });
    [[-0.1, 0.1, -0.05, 0.4], [0.12, 0.09, 0.06, 1.3], [0.0, 0.12, 0.11, 2.2], [0.05, 0.11, -0.13, 0.9]].forEach(([x, y, z, r]) => {
      mb.push().T(x, y, z, r, 0.15);
      mb.rbox(-0.065, -0.035, -0.05, 0.065, 0.04, 0.05, 0.025, C('#d2752b', -0.3), 2);
      mb.pop();
    });
    mb.sphereS(-0.15, 0.14, 0.02, 0.05, 0.015, 0.035, C('#3fae3f', -0.3), 8, 4);
    mb.sphereS(0.1, 0.15, -0.02, 0.045, 0.015, 0.03, C('#5fc04f', -0.3), 8, 4);
  } else if (kind === 'burger') {
    // alt ekmek, köfte, peynir, marul, domates, susamlı kubbe ekmek
    mb.lathe(0, -0.25, 0, [[0, 0], [0.3, 0], [0.33, 0.03], [0.34, 0.07], [0.33, 0.1], [0, 0.1]], 24, (i) => (i >= 4 ? C('#f0cf96', -0.15) : C('#d89a4c', -0.3)));
    mb.lathe(0, -0.155, 0, [[0, 0], [0.33, 0], [0.355, 0.02], [0.362, 0.05], [0.355, 0.08], [0.33, 0.1], [0, 0.1]], 24, (i, a) => (hs(Math.floor(a * 3), i) > 0.7 ? C('#7a4424', -0.35) : C('#5a2f17', -0.35)));
    mb.push().T(0, -0.048, 0, Math.PI / 4);
    mb.rbox(-0.29, -0.012, -0.29, 0.29, 0.012, 0.29, 0.01, C('#ffc928', -0.45), 1);
    mb.pop();
    mb.sphereS(0, -0.025, 0, 0.385, 0.032, 0.385, null, 28, 6, (x, y, z) => { const w = 0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 9); const c = mixc(C('#3f9f32'), C('#86d45e'), w); return [c[0], c[1], c[2], -0.3]; });
    mb.lathe(0, -0.002, 0, [[0, 0], [0.3, 0], [0.312, 0.02], [0.3, 0.04], [0, 0.04]], 22, C('#e23c2c', -0.5));
    mb.lathe(0, 0.035, 0, [[0, 0], [0.33, 0], [0.355, 0.03], [0.35, 0.09], [0.31, 0.17], [0.23, 0.23], [0.12, 0.265], [0, 0.275]], 26, (i) => (i <= 1 ? C('#d08a3c', -0.35) : C('#e6a656', -0.5)));
    for (let k = 0; k < 12; k++) {
      const a = k * 2.39996, r = 0.07 + 0.2 * Math.sqrt((k + 0.5) / 12);
      const y = 0.035 + 0.275 * Math.pow(Math.max(0, 1 - (r / 0.36) * (r / 0.36)), 0.6);
      mb.push().T(Math.cos(a) * r, y, Math.sin(a) * r, a);
      mb.sphereS(0, 0, 0, 0.022, 0.009, 0.012, C('#fff6dc', -0.3), 6, 4);
      mb.pop();
    }
  } else if (kind === 'wrap') {
    // dürüm: lavaş rulo, altı işletme renginde kâğıda sarılı, üstte iç malzeme
    mb.push().T(0, 0, 0, 0, 0.35, 0.15);
    mb.lathe(0, -0.36, 0, [[0, 0], [0.15, 0], [0.175, 0.03], [0.18, 0.6], [0.17, 0.66], [0, 0.66]], 22, (i, a) => (hs(Math.floor(a * 4), i) > 0.8 ? C('#b77a3c', -0.12) : C('#ecd9a8', -0.12)));
    mb.lathe(0, -0.37, 0, [[0.187, 0], [0.192, 0.03], [0.192, 0.3], [0.187, 0.32]], 22, brand ? C(brand, -0.2) : C('#ffffff', -0.2));
    mb.sphereS(0, 0.3, 0, 0.15, 0.05, 0.15, C('#a35a2a', -0.3), 14, 6);
    mb.sphereS(0.06, 0.335, 0.02, 0.05, 0.03, 0.05, C('#e23c2c', -0.45), 8, 5);
    mb.sphereS(-0.05, 0.34, -0.03, 0.06, 0.025, 0.05, C('#4fbf3a', -0.3), 8, 5);
    mb.pop();
  } else if (kind === 'waffle') {
    // Belçika waffle'ı: derin gözlü altın ızgara, üstünde parlak çikolata göleti, kenarlardan akan damlalar,
    // dilim çilek ve muz, krem şanti tepesinde bütün çilek ve pudra şekeri
    DES.waffle(mb, 0, -0.16, 0, 0.3, 0.1, 6, false, 0.35, 0);
    mb.push().T(0, -0.06, 0, 0.35);
    mb.sphereS(0.0, 0.004, 0.0, 0.2, 0.016, 0.18, C('#3a1a0b', -0.85), 24, 6);
    [[0.3, 0.02], [0.3, -0.16], [-0.12, 0.3], [0.1, 0.3], [-0.3, -0.05], [0.04, -0.3]].forEach(([dx, dz], k) => {
      const ex = Math.abs(dx) > Math.abs(dz) ? Math.sign(dx) * 0.305 : dx, ez = Math.abs(dz) >= Math.abs(dx) ? Math.sign(dz) * 0.305 : dz;
      const rings = [{ c: [ex * 0.55, 0.005, ez * 0.55], a: 0.02, b: 0.01 }, { c: [ex * 0.95, 0.004, ez * 0.95], a: 0.018, b: 0.012 }, { c: [ex * 1.02, -0.01, ez * 1.02], a: 0.017, b: 0.014 }];
      loft(mb, rings, C('#3a1a0b', -0.85), 8, 'se', [0, 1, 0]);
      DES.drip(mb, ex * 1.03, -0.01, ez * 1.03, 0.04 + (k % 3) * 0.03, 0.015);
    });
    DES.strawSlice(mb, -0.17, 0.015, 0.12, 0.6, 1.1); DES.strawSlice(mb, 0.16, 0.015, 0.14, 2.2, 1.1);
    DES.bananaSlice(mb, 0.17, 0.008, -0.12, 1.1); DES.bananaSlice(mb, -0.14, 0.008, -0.15, 1.1);
    DES.cream(mb, 0, 0.012, 0, 1.15);
    DES.sugar(mb, 0.03, 0.27, 46, 2);
    mb.pop();
    DES.straw(mb, 0.0, 0.08, 0.0, 0.85, 0.5, 0.15);
  } else if (kind === 'cup') {
    DES.cup(mb, -0.36, 1.25, brand, 'cocoa');
  } else {
    // kargo/sipariş paketi: yuvarlak köşeli kutu, marka renginde bant ve fiyonk
    const K = C('#c99a62', -0.12);
    mb.rbox(-0.3, -0.22, -0.24, 0.3, 0.22, 0.24, 0.035, K, 2);
    const T = brand ? C(brand, -0.3) : C('#ff4d6d', -0.3);
    mb.rbox(-0.31, -0.228, -0.05, 0.31, 0.228, 0.05, 0.012, T, 1);
    mb.rbox(-0.06, 0.205, -0.25, 0.06, 0.229, 0.25, 0.008, T, 1);
    for (const sx of [-1, 1]) { mb.push().T(sx * 0.07, 0.25, 0, 0, 0, sx * 0.5); mb.torusN(0, 0, 0, 0.055, 0.016, 0.03, 12, 5, T); mb.pop(); }
    mb.sphereS(0, 0.245, 0, 0.035, 0.03, 0.035, T, 8, 6);
  }
  return mb;
}

function shadowDisc(mb) { mb.disc(0, 0, 0, 1, 1, 16, [0, 0, 0, 0.42], [0, 0, 0, 0]); return mb; }
function glowDisc(mb) { mb.disc(0, 0, 0, 1, 1, 18, [1, 1, 1, 0.55], [1, 1, 1, 0]); return mb; }
function flameModel(mb) {
  mb.push().T(0, 0, 0, 0, Math.PI / 2);
  mb.cyl(0, 0, 0, 0.11, 0.7, 0.0, 8, C('#ff9a1f', 1));
  mb.cyl(0, 0, 0, 0.06, 0.42, 0.0, 8, C('#fff3a0', 1));
  mb.pop();
  return mb;
}

/* ============================ sofra takımı (masa üstü sahneler için ortak eşyalar) ============================ */
// Mini Golf, Sumo ve diğer masa üstü oyunlarda kullanılır. Birim ≈ 3,6 cm. Orijin masada (y = 0), modelin ortasında;
// "ön yüz" +Z'ye bakar (logolu eşyalar çizilirken kameraya döndürülür).
const KIT = (() => {
  const hsh = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const cc = (rgb, e = 0) => [rgb[0], rgb[1], rgb[2], e];
  const rngK = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // Cilalı ceviz masa dokusu: yan yana 4 farklı tahta (512x1024): damarlar, budak, gözenek, derz
  const WOODS = {
    walnut: { tones: ['#7a4826', '#8b5631', '#6c3f21', '#935f38'], dark: '38,18,6', lite: '255,212,150', seed: 77, knot: 0.85, gap: 0.78 },
    maple: { tones: ['#d8a46a', '#cf985c', '#e2b47c', '#c78f52'], dark: '120,66,24', lite: '255,236,200', seed: 41, knot: 0.35, gap: 0.5 },
  };
  function woodCanvas(kind = 'walnut') {
    const WD = WOODS[kind] || WOODS.walnut;
    const W = 512, H = 1024, N = 4, PW = W / N;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const rnd = rngK(WD.seed);
    const tones = WD.tones;
    for (let k = 0; k < N; k++) {
      const x0 = k * PW;
      g.save();
      g.beginPath(); g.rect(x0, 0, PW, H); g.clip();
      g.fillStyle = tones[k]; g.fillRect(x0, 0, PW, H);
      for (let i = 0; i < 7; i++) {
        const y = rnd() * H, h = 120 + rnd() * 280, a = 0.05 + rnd() * 0.07, lt = rnd() < 0.5;
        const gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, lt ? `rgba(255,214,160,${a})` : `rgba(30,12,4,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x0, y - h / 2, PW, h);
      }
      const side = g.createLinearGradient(x0, 0, x0 + PW, 0);
      side.addColorStop(0, 'rgba(20,8,2,0.16)'); side.addColorStop(0.18, 'rgba(0,0,0,0)'); side.addColorStop(0.82, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(20,8,2,0.18)');
      g.fillStyle = side; g.fillRect(x0, 0, PW, H);
      const nl = 30 + Math.floor(rnd() * 12);
      for (let i = 0; i < nl; i++) {
        const bx = x0 + 2 + rnd() * (PW - 4);
        const amp = 1.5 + rnd() * 6, fq = 0.003 + rnd() * 0.008, ph = rnd() * 6.28, dark = rnd() < 0.72;
        g.strokeStyle = dark ? `rgba(${WD.dark},${0.1 + rnd() * 0.22})` : `rgba(${WD.lite},${0.05 + rnd() * 0.1})`;
        g.lineWidth = 0.6 + rnd() * 2;
        g.beginPath();
        for (let y = -8; y <= H + 8; y += 8) {
          const x = bx + Math.sin(y * fq + ph) * amp + Math.sin(y * fq * 3.3 + ph * 1.7) * amp * 0.35;
          if (y < 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
      if (rnd() < WD.knot) {
        const ky = 140 + rnd() * (H - 280), kx = x0 + PW * (0.3 + rnd() * 0.4);
        for (let r = 26; r > 2; r -= 3) {
          g.strokeStyle = `rgba(42,20,6,${0.08 + (26 - r) * 0.014})`; g.lineWidth = 1.5;
          g.beginPath(); g.ellipse(kx, ky, r * 0.6, r * 1.7, 0, 0, 6.283); g.stroke();
        }
        g.fillStyle = 'rgba(36,16,5,0.6)'; g.beginPath(); g.ellipse(kx, ky, 3.5, 8, 0, 0, 6.283); g.fill();
      }
      for (let i = 0; i < 1100; i++) { g.fillStyle = `rgba(28,12,4,${0.05 + rnd() * 0.12})`; g.fillRect(x0 + rnd() * PW, rnd() * H, 1, 2 + rnd() * 5); }
      g.restore();
      g.fillStyle = `rgba(18,8,3,${WD.gap})`; g.fillRect(x0, 0, 2, H); g.fillRect(x0 + PW - 2, 0, 2, H);
      g.fillStyle = 'rgba(255,226,180,0.13)'; g.fillRect(x0 + 2, 0, 2, H);
    }
    g.fillStyle = `rgba(18,8,3,${WD.gap * 0.92})`; g.fillRect(0, 0, W, 3);
    g.fillStyle = 'rgba(255,226,180,0.1)'; g.fillRect(0, 3, W, 2);
    return cv;
  }

  // Tahta döşeme ('tex'): [x0,x1]x[z0,z1] dikdörtgenine kırpılmış, z boyunca tahtalar, ek yerleri kaydırmalı.
  function planks(mb, x0, z0, x1, z1, y, PW = 3.3, L = 19, seed = 0) {
    const i0 = Math.floor(x0 / PW), i1 = Math.ceil(x1 / PW);
    for (let i = i0; i < i1; i++) {
      const pa = i * PW, pb = pa + PW;
      const xa = Math.max(pa, x0), xb = Math.min(pb, x1);
      if (xb - xa < 1e-4) continue;
      const col = Math.floor(hsh(i + seed, 1) * 4) % 4;
      const cu0 = col / 4 + 0.003, cw = 0.25 - 0.006;
      const ua = cu0 + ((xa - pa) / PW) * cw, ub = cu0 + ((xb - pa) / PW) * cw;
      const off = hsh(i + seed, 5) * L;
      for (let z = z0 - off; z < z1; z += L) {
        const za = Math.max(z, z0), zb = Math.min(z + L, z1);
        if (zb - za < 1e-4) continue;
        const va = (za - z) / L, vb = (zb - z) / L;
        mb.tquad([xa, y, zb], [xb, y, zb], [xb, y, za], [xa, y, za], ua, va, ub, vb, [(xa + xb) / 2, y - 1, za]);
      }
    }
  }
  // Ahşap masa: kameranın göreceği her yeri kaplayan geniş döşeme
  function woodTable(mb, cx, cz, ext, y, PW = 3.3, L = 19) { planks(mb, cx - ext, cz - ext, cx + ext, cz + ext, y, PW, L, 0); }
  // Ahşap tabla (kutu): üst yüz tahtalı, yan yüzler boyuna damarlı ('tex')
  function woodBox(mb, x0, y0, z0, x1, y1, z1, PW = 1.15, L = 19) {
    planks(mb, x0, z0, x1, z1, y1, PW, L, 11);
    const h = y1 - y0;
    const side = (A, B, Cc, D, len, k) => {
      const u0 = (k % 4) / 4 + 0.01, u1 = u0 + 0.25 * Math.min(0.98, h / PW) - 0.004;
      mb.tquad(A, B, Cc, D, u0, 0, u1, Math.min(1, len / L), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
    };
    // tquad(a=sol-alt, b=sağ-alt, c=sağ-üst, d=sol-üst): u yükseklik boyunca, v uzunluk boyunca
    side([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], z1 - z0, 1);
    side([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], z1 - z0, 2);
    side([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], x1 - x0, 3);
    side([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], x1 - x0, 0);
  }

  // Kırılım noktalı ızgara: hücre başına düz renk, yükseklik fonksiyonu ile pürüzsüz normaller
  function bgrid(mb, xs, zs, hf, colf) {
    const e = 0.05;
    const N = (x, z) => [hf(x - e, z) - hf(x + e, z), 2 * e, hf(x, z - e) - hf(x, z + e)];
    for (let j = 0; j < zs.length - 1; j++) {
      for (let i = 0; i < xs.length - 1; i++) {
        const xa = xs[i], xb = xs[i + 1], za = zs[j], zb = zs[j + 1];
        if (xb - xa < 1e-4 || zb - za < 1e-4) continue;
        const c = colf((xa + xb) / 2, (za + zb) / 2, i, j);
        mb.quadN([xa, hf(xa, za), za], [xb, hf(xb, za), za], [xb, hf(xb, zb), zb], [xa, hf(xa, zb), zb], N(xa, za), N(xb, za), N(xb, zb), N(xa, zb), c);
      }
    }
  }
  const breaks = (a, b, cuts, step) => {
    // a..b arası, kenarlardan 'cuts' uzaklıklarında kesin kırılım + ortada eşit adımlar
    const s = new Set([a, b]);
    cuts.forEach((d) => { if (a + d < b - d) { s.add(a + d); s.add(b - d); } });
    const lo = a + (cuts.length ? cuts[cuts.length - 1] : 0), hi = b - (cuts.length ? cuts[cuts.length - 1] : 0);
    const n = Math.max(1, Math.round((hi - lo) / step));
    for (let k = 1; k < n; k++) s.add(lo + ((hi - lo) * k) / n);
    for (let v = a; v < lo; v += step) s.add(v);
    for (let v = b; v > hi; v -= step) s.add(v);
    return [...s].sort((p, q) => p - q);
  };

  // Keten masa koşucusu (runner): marka rengine çalan dokuma, uzun kenarlarda şeritler, kısa uçlarda saçak
  function runner(mb, x0, z0, x1, z1, y, accentHex) {
    const acc = hexRGB(accentHex), cream = hexRGB('#f1e9d8');
    const field = mix(cream, acc, 0.13), stripe = mix(acc, [0.08, 0.06, 0.05], 0.12), stripe2 = mix(cream, acc, 0.42);
    const along = z1 - z0 >= x1 - x0;
    const cuts = [0.5, 0.92, 1.12, 1.28];
    const xs = along ? breaks(x0, x1, cuts, 0.5) : breaks(x0, x1, [], 0.5);
    const zs = along ? breaks(z0, z1, [], 0.5) : breaks(z0, z1, cuts, 0.5);
    bgrid(mb, xs, zs, () => y, (x, z, i, j) => {
      const t = along ? x : z, a = along ? x0 : z0, b = along ? x1 : z1;
      const d = Math.min(t - a, b - t);
      const base = d > 0.5 && d < 0.92 ? stripe : d > 1.12 && d < 1.28 ? stripe2 : field;
      const w = (i + j) & 1 ? 1.012 : 0.988, n = 0.975 + 0.04 * hsh(i, j);
      return cc([base[0] * w * n, base[1] * w * n, base[2] * w * n], 0);
    });
    const up = [0, 1, 0], fr = cc(mix(cream, acc, 0.08), 0);
    const yy = y - 0.006;
    if (along) {
      for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.19) {
        [[z0 - 0.7, z0 + 0.02], [z1 - 0.02, z1 + 0.7]].forEach(([za, zb], s) => {
          const wv = 0.07 * Math.sin(x * 7.3 + s);
          const xa = s ? x : x + wv, xb = s ? x + wv : x;
          mb.quadN([xa - 0.035, yy, za], [xa + 0.035, yy, za], [xb + 0.035, yy, zb], [xb - 0.035, yy, zb], up, up, up, up, fr);
        });
      }
    } else {
      for (let z = z0 + 0.1; z < z1 - 0.05; z += 0.19) {
        [[x0 - 0.7, x0 + 0.02], [x1 - 0.02, x1 + 0.7]].forEach(([xa, xb], s) => {
          const wv = 0.07 * Math.sin(z * 7.3 + s);
          const za = s ? z : z + wv, zb = s ? z + wv : z;
          mb.quadN([xa, yy, za - 0.035], [xa, yy, za + 0.035], [xb, yy, zb + 0.035], [xb, yy, zb - 0.035], up, up, up, up, fr);
        });
      }
    }
  }

  // Yumuşak kenarlı dikdörtgen gölge ('un'): içi a, f kadar dışarıda 0
  function softRect(mb, x0, z0, x1, z1, y, a, f) {
    const I = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], O = [[x0 - f, z0 - f], [x1 + f, z0 - f], [x1 + f, z1 + f], [x0 - f, z1 + f]];
    const v = (p, al) => mb.d.push(p[0], y, p[1], 0, 0, 0, al);
    v(I[0], a); v(I[1], a); v(I[2], a); v(I[0], a); v(I[2], a); v(I[3], a);
    for (let k = 0; k < 4; k++) {
      const a0 = I[k], a1 = I[(k + 1) % 4], b0 = O[k], b1 = O[(k + 1) % 4];
      v(a0, a); v(a1, a); v(b1, 0); v(a0, a); v(b1, 0); v(b0, 0);
    }
  }

  // Porselen servis tabağı (yarıçap 1): kenarda marka renginde ince çizgi
  function plate(mb, accentHex) {
    const W = C('#fbf9f4', -0.8), A = C(accentHex, -0.6);
    const P = [[0, 0], [0.48, 0], [0.5, 0.03], [0.56, 0.045], [0.95, 0.125], [1.0, 0.148], [0.985, 0.166], [0.94, 0.165], [0.94, 0.165], [0.9, 0.16], [0.9, 0.16], [0.74, 0.13], [0.68, 0.09], [0.62, 0.078], [0, 0.078]];
    mb.lathe(0, 0, 0, P, 56, (i) => (i === 8 || i === 9 ? A : W));
  }
  const PLATE_TOP = 0.078;

  // Sos kâsesi (ramekin) + sos
  function ramekin(mb, sauceHex) {
    const W = C('#f7f4ee', -0.8);
    mb.lathe(0, 0, 0, [[0, 0], [0.8, 0], [0.86, 0.06], [0.9, 0.62], [0.95, 0.68], [0.92, 0.72], [0.82, 0.68], [0.8, 0.12], [0, 0.1]], 36, W);
    const s = hexRGB(sauceHex);
    mb.lathe(0, 0.5, 0, [[0.83, 0], [0.62, 0.035], [0.3, 0.055], [0, 0.06]], 36, (i, a) => { const k = 0.93 + 0.07 * Math.sin(a * 3 + i); return [s[0] * k, s[1] * k, s[2] * k, -0.75]; });
  }

  // Karton içecek bardağı + kapak + çizgili pipet (marka rengi). Logo ayrı: cupLogo ('tex')
  const CUP_R = (y) => 0.79 + ((y - 0.55) / 2.45) * 0.165;
  function sodaCup(mb, accentHex) {
    const A = C(accentHex, -0.35), Wt = C('#fbfaf6', -0.35);
    const P = [[0, 0.03], [0.7, 0.03], [0.74, 0], [0.76, 0.08], [0.79, 0.55], [0.79, 0.55], [0.955, 3.0], [0.955, 3.0], [0.99, 3.52], [1.03, 3.56], [1.04, 3.62]];
    mb.lathe(0, 0, 0, P, 40, (i) => (i <= 4 || i >= 7 ? A : Wt));
    mb.lathe(0, 3.6, 0, [[1.06, 0], [1.08, 0.07], [1.02, 0.16], [0.86, 0.2], [0.8, 0.3], [0.55, 0.35], [0, 0.36]], 40, C('#eef2f6', -0.6));
    mb.push().T(0.22, 3.75, 0.12, 0.4, 0.12, -0.16);
    for (let k = 0; k < 9; k++) mb.cyl(0, -0.5 + k * 0.28, 0, 0.09, -0.5 + (k + 1) * 0.28, 0.09, 10, k % 2 ? C('#ffffff', -0.5) : C(accentHex, -0.5), C('#ffffff', -0.5), k === 8 ? 't' : '');
    mb.pop();
  }
  function cupLogo(mb) {
    const r = (y) => CUP_R(y) + 0.012;
    const ya = 1.12, yb = 2.36, A0 = -0.68, A1 = 0.68, nu = 10, nv = 4;
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a0 = A0 + ((A1 - A0) * i) / nu, a1 = A0 + ((A1 - A0) * (i + 1)) / nu;
        const y0 = yb - ((yb - ya) * j) / nv, y1 = yb - ((yb - ya) * (j + 1)) / nv;
        const P = (a, y) => [Math.sin(a) * r(y), y, Math.cos(a) * r(y)];
        mb.tquad(P(a0, y1), P(a1, y1), P(a1, y0), P(a0, y0), i / nu, j / nv, (i + 1) / nu, (j + 1) / nv, [0, (y0 + y1) / 2, 0]);
      }
    }
  }

  // A tipi masa kartı: ön yüz +Z'ye eğik, altta marka şeridi. Logo ayrı: tentLogo ('tex')
  const TENT = { w: 2.5, h: 2.15, d: 0.62 };
  function tent(mb, accentHex) {
    const { w, h, d } = TENT, hw = w / 2, Wt = C('#fbfaf5', -0.15), A = C(accentHex, -0.3);
    const cen = [0, h * 0.35, 0];
    [1, -1].forEach((s) => {
      const P = (x, f) => [x, h * f, s * d * (1 - f)];
      mb.quad(P(-hw, 0), P(hw, 0), P(hw, 0.14), P(-hw, 0.14), A, cen);
      mb.quad(P(-hw, 0.14), P(hw, 0.14), P(hw, 0.93), P(-hw, 0.93), Wt, cen);
      mb.quad(P(-hw, 0.93), P(hw, 0.93), P(hw, 1), P(-hw, 1), A, cen);
      // kenar kalınlığı (yan çizgiler)
      mb.quad(P(-hw, 0), P(-hw - 0.025, 0), P(-hw - 0.025, 1), P(-hw, 1), C('#e2ddd2'), [0, h * 0.35, s * 0.2]);
      mb.quad(P(hw, 0), P(hw + 0.025, 0), P(hw + 0.025, 1), P(hw, 1), C('#e2ddd2'), [0, h * 0.35, s * 0.2]);
    });
    mb.push().T(0, h, 0, 0, 0, Math.PI / 2);
    mb.cyl(0, -hw - 0.02, 0, 0.035, hw + 0.02, 0.035, 8, A);
    mb.pop();
  }
  function tentLogo(mb) {
    const { h, d } = TENT, L = Math.hypot(d, h), n = [0, d / L, h / L];
    const fa = 0.22, fb = 0.88, s = ((fb - fa) * L) / 2;
    const P = (x, f) => [x, h * f + n[1] * 0.012, d * (1 - f) + n[2] * 0.012];
    mb.tquad(P(-s, fa), P(s, fa), P(s, fb), P(-s, fb), 0, 0, 1, 1, [0, h * 0.35, 0]);
  }

  // Sıkma şişe (ketçap / hardal): etiket bandı + kapak ve uç
  function bottle(mb, bodyHex, capHex, bandHex) {
    const B = C(bodyHex, -0.6), Cp = C(capHex, -0.55), Lb = C('#fbf6ea', -0.15), Bd = C(bandHex, -0.3);
    const P = [[0, 0], [0.6, 0], [0.7, 0.08], [0.72, 0.35], [0.72, 1.05], [0.725, 1.05], [0.725, 1.15], [0.725, 1.15], [0.725, 2.25], [0.725, 2.25], [0.725, 2.35], [0.72, 2.35], [0.72, 2.95], [0.64, 3.32], [0.48, 3.55], [0.44, 3.62], [0, 3.62]];
    mb.lathe(0, 0, 0, P, 32, (i) => (i === 5 || i === 6 || i === 9 || i === 10 ? Bd : i === 7 || i === 8 ? Lb : B));
    mb.lathe(0, 3.58, 0, [[0.47, 0], [0.49, 0.05], [0.49, 0.42], [0.42, 0.5], [0.3, 0.56], [0.14, 0.66], [0.09, 1.05], [0.05, 1.12], [0, 1.13]], 28, Cp);
  }

  // Çatal + bıçak (masaya yatık, uçlar -Z)
  function cutlery(mb) {
    const S = C('#d3d8de', -0.92);
    mb.push().T(-0.62, 0, 0);
    mb.rbox(-0.2, 0, 0.2, 0.2, 0.13, 2.8, 0.06, S, 2);
    mb.rbox(-0.1, 0.02, -0.7, 0.1, 0.1, 0.4, 0.04, S, 2);
    mb.rbox(-0.36, 0.02, -1.45, 0.36, 0.1, -0.6, 0.06, S, 2);
    for (let k = 0; k < 4; k++) mb.rbox(-0.355 + k * 0.19, 0.02, -2.6, -0.245 + k * 0.19, 0.09, -1.3, 0.035, S, 2);
    mb.pop();
    mb.push().T(0.62, 0, 0);
    mb.rbox(-0.2, 0, 0.3, 0.2, 0.14, 2.8, 0.07, S, 2);
    mb.rbox(-0.2, 0.01, -2.7, 0.2, 0.055, 0.4, 0.02, S, 2);
    mb.pop();
  }

  // Katlanmış kumaş peçete: beyaz, kenarına yakın marka renginde iki çizgi
  function napkin(mb, accentHex) {
    const A = hexRGB(accentHex), Wt = hexRGB('#faf7f0');
    const S = 1.75;
    const cuts = [0.16, 0.26, 0.34, 0.4];
    const xs = breaks(-S, S, cuts, 0.35), zs = breaks(-S, S, cuts, 0.35);
    const hf = (x, z) => 0.06 + 0.02 * Math.sin(x * 2.1 + z * 0.7) * Math.sin(z * 1.7 + 0.4);
    bgrid(mb, xs, zs, hf, (x, z) => {
      const d = Math.min(S - Math.abs(x), S - Math.abs(z));
      const st = (d > 0.16 && d < 0.26) || (d > 0.34 && d < 0.4);
      return cc(st ? mix(Wt, A, 0.88) : Wt, -0.05);
    });
    // kenar kalınlığı
    const sd = C('#e9e4da');
    mb.quad([-S, 0, -S], [S, 0, -S], [S, hf(S, -S), -S], [-S, hf(-S, -S), -S], sd, [0, 0, 0]);
    mb.quad([-S, 0, S], [S, 0, S], [S, hf(S, S), S], [-S, hf(-S, S), S], sd, [0, 0, 0]);
    mb.quad([-S, 0, -S], [-S, 0, S], [-S, hf(-S, S), S], [-S, hf(-S, -S), -S], sd, [0, 0, 0]);
    mb.quad([S, 0, -S], [S, 0, S], [S, hf(S, S), S], [S, hf(S, -S), -S], sd, [0, 0, 0]);
  }

  // Kavanozda mum (opak kısımlar); cam çeper 'un' (candleGlass), alev ayrı (flame)
  function candle(mb) {
    const wax = C('#f3ead6', -0.25);
    mb.lathe(0, 0.08, 0, [[0, 0], [0.8, 0], [0.8, 1.08], [0.76, 1.14], [0.2, 1.1], [0, 1.1]], 30, wax);
    mb.lathe(0, 0, 0, [[0, 0], [0.92, 0], [0.97, 0.05], [0.97, 0.1], [0.9, 0.12], [0, 0.1]], 30, C('#dfe9ef', -0.9));
    mb.cyl(0, 1.17, 0, 0.026, 1.42, 0.02, 6, C('#2b2118'));
  }
  function candleGlass(mb) {
    const seg = 28, r = 0.97, y0 = 0.1, y1 = 2.05;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const al = (a) => 0.07 + 0.32 * Math.pow(Math.abs(Math.sin(a)), 4);
      const P = (a, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
      const c0 = [0.88, 0.94, 1, al(a0)], c1 = [0.88, 0.94, 1, al(a1)];
      const A = P(a0, y0), B = P(a1, y0), Cc = P(a1, y1), D = P(a0, y1);
      mb.d.push(...A, ...c0, ...B, ...c1, ...Cc, ...c1, ...A, ...c0, ...Cc, ...c1, ...D, ...c0);
      // ağız halkası
      const E = P(a0, y1 + 0.06), F = P(a1, y1 + 0.06), rim0 = [1, 1, 1, 0.5], rim1 = [1, 1, 1, 0.5];
      mb.d.push(...D, ...rim0, ...Cc, ...rim1, ...F, ...rim1, ...D, ...rim0, ...F, ...rim1, ...E, ...rim0);
    }
  }
  function flame(mb) {
    mb.sphereS(0, 0.2, 0, 0.1, 0.24, 0.1, C('#ff9f2e', 1), 10, 8);
    mb.sphereS(0, 0.15, 0, 0.055, 0.13, 0.055, C('#fff3b8', 1), 8, 6);
  }

  // Toprak saksıda fesleğen
  function basilPot(mb) {
    const T = C('#b5623a', -0.12), Td = C('#a0532f', -0.12), soil = C('#3b2a1e');
    mb.lathe(0, 0, 0, [[0, 0], [0.95, 0], [1.0, 0.06], [1.2, 1.42], [1.2, 1.42], [1.3, 1.46], [1.34, 1.84], [1.3, 1.9], [1.17, 1.88], [1.13, 1.5], [0, 1.45]], 32, (i) => (i >= 4 && i <= 7 ? Td : T));
    mb.lathe(0, 1.6, 0, [[1.15, 0], [0.6, 0.06], [0, 0.09]], 24, soil);
    const R = rngK(19);
    const stems = [];
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + R(), r = 0.15 + R() * 0.35; stems.push([Math.cos(a) * r, Math.sin(a) * r, 2.2 + R() * 1.2]); }
    stems.forEach(([x, z, h]) => mb.cyl(x * 0.5, 1.65, z * 0.5, 0.05, h, 0.035, 6, C('#4f7f2f')));
    for (let k = 0; k < 22; k++) {
      const s = stems[k % stems.length];
      const a = k * 2.39996 + R() * 0.5, hgt = 1.95 + (s[2] - 1.95) * (0.35 + 0.65 * R());
      const rr = 0.12 + R() * 0.25;
      const leafC = mix(hexRGB('#2c7a30'), hexRGB('#62b850'), R());
      mb.push().T(s[0] * 0.5 + Math.cos(a) * rr, hgt, s[1] * 0.5 + Math.sin(a) * rr, Math.PI / 2 - a, -(0.25 + R() * 0.5), (R() - 0.5) * 0.4);
      const L = 0.38 + R() * 0.2;
      mb.sphereS(0, 0, L * 0.85, L * 0.55, 0.05, L, null, 12, 6, (nx, ny, nz) => { const vein = Math.abs(nx) < 0.08 ? 0.82 : 1; return cc([leafC[0] * vein, leafC[1] * vein, leafC[2] * vein], -0.5); });
      mb.pop();
    }
  }

  // Kâğıt kayıkta patates kızartması (marka rengi kâğıt)
  function friesBoat(mb, accentHex) {
    const A = C(accentHex, -0.2);
    mb.frustum(-0.95, 0.95, -0.62, 0.62, 0, -1.3, 1.3, -0.9, 0.9, 0.8, A, shade(A, 0.8));
    const R = rngK(5);
    for (let k = 0; k < 26; k++) {
      const x = (R() - 0.5) * 1.0, z = (R() - 0.5) * 1.0;
      const c = mix(hexRGB('#f2c14a'), hexRGB('#e6a530'), R());
      mb.push().T(x, 0.72 + R() * 0.38, z, Math.PI / 2 + (R() - 0.5) * 0.9, (R() - 0.5) * 0.8, (R() - 0.5) * 0.5);
      mb.rbox(-0.09, -0.09, -0.7 - R() * 0.3, 0.09, 0.09, 0.7 + R() * 0.3, 0.04, cc(c, -0.3), 1);
      mb.pop();
    }
  }

  // Hasır ekmek sepeti
  function breadBasket(mb) {
    mb.lathe(0, 0, 0, [[0, 0], [1.6, 0], [2.1, 0.95], [2.22, 1.05], [2.02, 1.05], [1.52, 0.2], [0, 0.2]], 30, (i, a) => (Math.sin(a * 20 + i * 2) > 0 ? C('#b8853f') : C('#9c6a2c')));
    const R = rngK(3);
    for (let k = 0; k < 5; k++) {
      mb.push().T(Math.cos(k * 1.3) * 0.8, 0.8 + (k % 2) * 0.25, Math.sin(k * 1.3) * 0.7, k * 0.8 + R(), 0.2, 0);
      mb.sphereS(0, 0, 0, 0.95, 0.45, 0.55, null, 16, 10, (nx, ny) => (ny > 0.35 ? C('#c4863a', -0.3) : C('#e8b86a', -0.2)));
      mb.pop();
    }
  }

  // Tuzluk / biberlik (cam gövde + krom kapak)
  function shaker(mb, fillHex) {
    const F = C(fillHex, -0.85);
    mb.lathe(0, 0, 0, [[0, 0], [0.5, 0], [0.55, 0.05], [0.56, 0.2], [0.5, 1.0], [0.48, 1.1], [0, 1.1]], 22, F);
    mb.lathe(0, 1.05, 0, [[0.5, 0], [0.52, 0.04], [0.5, 0.24], [0.38, 0.36], [0.18, 0.42], [0, 0.43]], 22, C('#c8ccd2', -0.92));
  }


  // Oyuncu rengine göre aksesuar seti (renk sırası PLAYER_COLORS ile aynı)
  const ACC_SETS = [['mustache'], ['glasses'], [], ['shades'], ['bowtie'], ['glasses', 'mustache'], ['bowtie'], ['shades'], ['mustache'], ['glasses'], ['shades', 'mustache'], ['bowtie', 'glasses']];
  const accOf = (hex) => { const i = PLAYER_COLORS.indexOf(String(hex).toUpperCase()); return ACC_SETS[i >= 0 ? i : 0]; };
  // Baş merkezli (cx,cy,cz, yarıçap r) aksesuarlar; neck: [x,y,z] papyon konumu. Yüz +Z'ye bakar.
  function accessories(mb, list, cx, cy, cz, r, neck) {
    const surf = (x, y) => Math.sqrt(Math.max(0, r * r - x * x - y * y));
    const frame = C('#1c1a22', -0.75), steel = C('#c9ced6', -0.9);
    for (const a of list || []) {
      if (a === 'glasses' || a === 'shades') {
        const shades = a === 'shades';
        for (const s of [-1, 1]) {
          const ex = s * r * 0.37, ey = r * 0.12, ez = cz + surf(ex, ey) + r * 0.04;
          mb.push().T(cx + ex, cy + ey, ez, 0, Math.PI / 2, 0);
          mb.torusN(0, 0, 0, r * 0.235, r * 0.035, r * 0.035, 20, 6, shades ? frame : C('#2a2a33', -0.7));
          mb.pop();
          if (shades) mb.sphereS(cx + ex, cy + ey, ez - r * 0.01, r * 0.235, r * 0.22, r * 0.05, C('#141a24', -0.95), 16, 8);
          // sap: kulağa
          mb.push().T(cx + s * r * 0.6, cy + ey + r * 0.05, cz + r * 0.2, s * 0.25);
          mb.rbox(-r * 0.022, -r * 0.022, -r * 0.55, r * 0.022, r * 0.022, r * 0.05, r * 0.015, shades ? frame : steel, 1);
          mb.pop();
        }
        mb.rbox(cx - r * 0.13, cy + r * 0.13, cz + surf(0, r * 0.13) + r * 0.025, cx + r * 0.13, cy + r * 0.17, cz + surf(0, r * 0.13) + r * 0.06, r * 0.015, shades ? frame : steel, 1);
      } else if (a === 'mustache') {
        for (const s of [-1, 1]) {
          mb.push().T(cx + s * r * 0.17, cy - r * 0.27, cz + surf(r * 0.17, -r * 0.27) + r * 0.02, s * 0.15, 0, s * 0.3);
          mb.sphereS(0, 0, 0, r * 0.26, r * 0.09, r * 0.1, C('#3b2416', -0.25), 12, 6);
          mb.pop();
        }
      } else if (a === 'bowtie' && neck) {
        const [nx, ny, nz] = neck;
        const red = C('#d42b45', -0.45);
        for (const s of [-1, 1]) {
          mb.push().T(nx + s * r * 0.2, ny, nz, s * 0.2, 0, Math.PI / 2 * s);
          mb.cyl(0, -r * 0.18, 0, r * 0.03, r * 0.18, r * 0.16, 10, red);
          mb.pop();
        }
        mb.sphereS(nx, ny, nz + r * 0.02, r * 0.07, r * 0.07, r * 0.06, red, 10, 6);
      }
    }
  }
  // Çizgi film yüzü: (cx,cy,cz) merkezli r yarıçaplı baş, yüz +Z'ye bakar.
  // o: { iris, brow, mouth: 'smile'|'o'|'grin', blush, lash, look:[x,y] }
  // Göz kapakları (kırpma için ayrı ağ): face() ile aynı baş merkezi/yarıçapı; kapalı göz + kirpik çizgisi
  function lids(mb, cx, cy, cz, r, skinHex = '#f2c39a') {
    const surf = (x, y) => Math.sqrt(Math.max(0, r * r - x * x - y * y));
    const sk = C(skinHex, -0.12), lash = C('#3a2418', -0.3);
    for (const s of [-1, 1]) {
      const ex = s * r * 0.37, ey = r * 0.12, ez = surf(ex, ey) - r * 0.06 + r * 0.02;
      const RX = r * 0.245, RY = r * 0.29, RZ = r * 0.178;
      mb.sphereS(cx + ex, cy + ey, cz + ez, RX, RY, RZ, sk, 14, 9);
      const N = 9;
      for (let i = 0; i <= N; i++) {
        const t = i / N, dx = (t - 0.5) * 2 * r * 0.19, dy = -r * 0.02 - Math.sin(t * Math.PI) * r * 0.07;
        const k = 1 - (dx / RX) * (dx / RX) - (dy / RY) * (dy / RY);
        const z = ez + RZ * Math.sqrt(Math.max(0, k)) + r * 0.004;
        mb.sphereS(cx + ex + dx, cy + ey + dy, cz + z, r * 0.034, r * 0.018, r * 0.012, lash, 6, 3);
      }
    }
  }
  // Göz kırpma zamanı (oyuncu başına kayık): true = gözler kapalı
  function blinkAt(i, t) {
    const h = Math.sin(i * 91.7 + 3.1) * 43758.5453, f = h - Math.floor(h);
    const p = (t * (0.9 + f * 0.25) + f * 7) % 4.4;
    return p < 0.12 || (f > 0.55 && p > 0.28 && p < 0.39);
  }
  function face(mb, cx, cy, cz, r, o = {}) {
    const W = C('#ffffff', -0.35), P = C('#14101c', -0.85), HL = C('#ffffff', 1);
    const iris = C(o.iris || '#5a3a24', -0.7), brow = C(o.brow || '#4a2e1c', -0.1);
    const skinD = C(o.skinD || '#e5a77e', -0.12);
    const lx = (o.look && o.look[0]) || 0, ly = (o.look && o.look[1]) || 0;
    const surf = (x, y) => Math.sqrt(Math.max(0, r * r - x * x - y * y));
    for (const s of [-1, 1]) {
      const ex = s * r * 0.37, ey = r * 0.12;
      const ez = surf(ex, ey) - r * 0.06;
      // göz akı
      mb.sphereS(cx + ex, cy + ey, cz + ez, r * 0.215, r * 0.26, r * 0.12, W, 16, 10);
      // iris + bebek + parıltılar (öne doğru, bakışa göre kayık)
      const ix = ex + lx * r * 0.06, iy = ey + ly * r * 0.06 - r * 0.02, iz = ez + r * 0.095;
      mb.sphereS(cx + ix, cy + iy, cz + iz, r * 0.135, r * 0.16, r * 0.05, iris, 14, 8);
      mb.sphereS(cx + ix, cy + iy, cz + iz + r * 0.03, r * 0.085, r * 0.1, r * 0.035, P, 12, 6);
      mb.sphereS(cx + ix + r * 0.05, cy + iy + r * 0.07, cz + iz + r * 0.06, r * 0.04, r * 0.045, r * 0.015, HL, 8, 4);
      mb.sphereS(cx + ix - r * 0.04, cy + iy - r * 0.05, cz + iz + r * 0.055, r * 0.018, r * 0.02, r * 0.01, HL, 6, 3);
      // kaş (hafif eğik)
      mb.push().T(cx + s * r * 0.38, cy + r * 0.47, cz + surf(r * 0.38, r * 0.47) - r * 0.02, 0, 0, -s * (o.angry ? -0.32 : 0.18));
      mb.sphereS(0, 0, 0, r * 0.2, r * 0.055, r * 0.06, brow, 10, 5);
      mb.pop();
      // yanak
      if (o.blush !== false) mb.sphereS(cx + s * r * 0.6, cy - r * 0.2, cz + surf(r * 0.6, -r * 0.2) - r * 0.07, r * 0.17, r * 0.11, r * 0.06, C('#ff8f80', -0.05), 10, 6);
    }
    // burun
    mb.sphereS(cx, cy - r * 0.08, cz + surf(0, -r * 0.08) + r * 0.03, r * 0.13, r * 0.11, r * 0.11, skinD, 12, 8);
    // ağız: gülümseme (küçük kürelerden yay) ya da "o"
    const mz = (x, y) => cz + surf(x, y) - r * 0.015;
    if (o.mouth === 'o') {
      mb.sphereS(cx, cy - r * 0.42, mz(0, -r * 0.42), r * 0.1, r * 0.12, r * 0.05, C('#5a1a1a', -0.3), 10, 6);
    } else {
      const wide = o.mouth === 'grin' ? 0.36 : 0.27;
      const N = 18;
      for (let i = 0; i <= N; i++) {
        const t = i / N, x = (t - 0.5) * 2 * r * wide, y = -r * 0.36 - Math.sin(t * Math.PI) * r * (o.mouth === 'grin' ? 0.13 : 0.09);
        const w = r * (0.03 + 0.018 * Math.sin(t * Math.PI));
        mb.sphereS(cx + x, cy + y, mz(x, y), w * 1.3, w, w * 0.8, C('#7a2a22', -0.3), 6, 4);
      }
      if (o.mouth === 'grin') mb.sphereS(cx, cy - r * 0.44, mz(0, -r * 0.44) - r * 0.01, r * 0.17, r * 0.07, r * 0.035, C('#fbf6ee', -0.3), 10, 5);
    }
  }

  // Yerleştirme: dikdörtgen (parkur) çevresine, birbirine değmeden. tall: yalnızca uzak (-z) ve sol (-x) taraflara.
  function place(rect, items, rnd, taken = []) {
    const [x0, z0, x1, z1] = rect;
    const dRect = (x, z) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
    const out = [];
    items.forEach((it) => {
      for (let t = 0; t < 160; t++) {
        const side = it.tall ? (rnd() < 0.62 ? 0 : 1) : Math.floor(rnd() * 4);
        const gap = it.r + 0.35 + rnd() * (it.spread ?? 2.6);
        let x, z;
        if (side === 0) { x = x0 - 2 + rnd() * (x1 - x0 + 4); z = z0 - gap; }
        else if (side === 1) { z = z0 - 2 + rnd() * (z1 - z0 + 4); x = x0 - gap; }
        else if (side === 2) { x = x0 - 2 + rnd() * (x1 - x0 + 4); z = z1 + gap; }
        else { z = z0 - 2 + rnd() * (z1 - z0 + 4); x = x1 + gap; }
        if (dRect(x, z) < it.r + 0.3) continue;
        if (it.tall && (z > z1 - 0.5 || x > x1 - 0.5)) continue;
        if (out.concat(taken).some((o) => Math.hypot(o.x - x, o.z - z) < o.r + it.r + 0.3)) continue;
        out.push(Object.assign({}, it, { x, z, rot: it.rot ?? rnd() * Math.PI * 2 }));
        break;
      }
    });
    return out;
  }

  return { face, lids, blinkAt, accessories, accOf, woodCanvas, planks, woodBox, woodTable, runner, softRect, plate, PLATE_TOP, ramekin, sodaCup, cupLogo, tent, tentLogo, TENT, bottle, cutlery, napkin, candle, candleGlass, flame, basilPot, friesBoat, breadBasket, shaker, place, rng: rngK, mix };
})();

/* ============================ günün saati ============================ */

const TOD = [
  { name: 'Gündüz', icon: '☀️', top: '#3f7fd6', hor: '#c4e2ff', fog: '#cfe5fa', sunC: [1.0, 0.94, 0.84], sunD: [-0.42, 0.78, 0.46], sky: [0.6, 0.68, 0.82], gnd: [0.44, 0.4, 0.36], night: 0, fogR: [70, 190], stars: 0, glowS: 0.7, lampC: [0, 0, 0], warm: [1, 0.86, 0.56], skyline: '#8fa7c4', clouds: '#ffffff', sunVis: [-0.3, 0.55, -0.78] },
  { name: 'Gün batımı', icon: '🌇', top: '#2d2f72', hor: '#ff9d5c', fog: '#f0a07e', sunC: [1.0, 0.66, 0.42], sunD: [0.25, 0.3, -0.92], sky: [0.56, 0.46, 0.62], gnd: [0.42, 0.3, 0.28], night: 0.5, fogR: [55, 175], stars: 0, glowS: 1.7, lampC: [0.55, 0.4, 0.25], warm: [1, 0.78, 0.46], skyline: '#6d5378', clouds: '#ffb7a1', sunVis: [0.22, 0.09, -0.97] },
  { name: 'Gece', icon: '🌙', top: '#040716', hor: '#1c2856', fog: '#141c3c', sunC: [0.42, 0.5, 0.78], sunD: [-0.35, 0.8, -0.48], sky: [0.17, 0.2, 0.36], gnd: [0.07, 0.07, 0.11], night: 1, fogR: [42, 155], stars: 1, glowS: 0.45, lampC: [1.5, 1.2, 0.8], warm: [1, 0.82, 0.5], skyline: '#141a33', clouds: null, sunVis: [0.07, 0.235, -0.97] },
];
const norm3 = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
// Yağmurlu gece (gece yarışlarının yarısı, tohuma göre): bulutlu gök (ay ve yıldız yok), biraz daha yoğun sis
const RAIN_NIGHT = Object.assign({}, TOD[2], { name: 'Yağmurlu gece', icon: '🌧️', stars: 0, top: '#090c17', hor: '#252a3e', fog: '#1b2032', fogR: [36, 140], glowS: 0, sunVis: [0, -1, 0] });
const isRainy = (tod, seed) => ((tod % 3) + 3) % 3 === 2 && (seed | 0) % 2 === 0;

/* ============================ dokular ============================ */

const SHOPS = [
  ['BAKKAL', '#2e7d32'], ['FIRIN', '#8d4e1a'], ['KUAFÖR', '#ad1457'], ['ECZANE', '#c62828'], ['ÇAY OCAĞI', '#6d4c41'], ['KASAP', '#9a1c1c'],
  ['BÜFE', '#1565c0'], ['TERZİ', '#4527a0'], ['MANAV', '#558b2f'], ['KIRTASİYE', '#00838f'], ['BERBER', '#283593'], ['TATLICI', '#d81b60'],
  ['PASTANE', '#ec407a'], ['KUYUMCU', '#b8860b'], ['ÇİÇEKÇİ', '#e91e63'], ['LOKANTA', '#e65100'], ['KAHVE', '#4e342e'], ['SİMİTÇİ', '#ef6c00'],
  ['DÖNERCİ', '#bf360c'], ['NALBUR', '#455a64'], ['OPTİK', '#0277bd'], ['OTEL', '#37474f'], ['MARKET', '#2962ff'], ['BALIKÇI', '#006064'],
  ['KÖFTECİ', '#8d6e63'], ['PİDECİ', '#e64a19'], ['ŞARKÜTERİ', '#6a1b9a'], ['AYAKKABI', '#5d4037'], ['OYUNCAKÇI', '#f9a825'], ['SAATÇİ', '#3e2723'],
  ['LOSTRA', '#795548'], ['MUHALLEBİCİ', '#c2185b'],
];
const FONT = "'Bricolage Grotesque', 'Arial Black', 'Segoe UI', system-ui, sans-serif";
const BANNER = { start: 0, finish: 1, k750: 2, half: 3, k250: 4, brand: 5, stop: 6, kiosk: 7 };

function fitText(g, text, maxW, size, weight = 800) {
  let s = size;
  do { g.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

// Vitrin içi türleri (dokuda 256×256 hücre): 0 market rafları, 1 fırın/pastane, 2 kafe/lokanta, 3 eczane/optik,
// 4 kuaför/berber, 5 butik/ayakkabı/kuyumcu, 6 manav/çiçekçi, 7 kasap/balıkçı (beyaz fayans + soğuk vitrin)
const SHOP_INT = {
  BAKKAL: 0, MARKET: 0, BÜFE: 0, KIRTASİYE: 0, ŞARKÜTERİ: 0, NALBUR: 0, FIRIN: 1, PASTANE: 1, TATLICI: 1, SİMİTÇİ: 1, MUHALLEBİCİ: 1,
  'ÇAY OCAĞI': 2, LOKANTA: 2, KAHVE: 2, DÖNERCİ: 2, KÖFTECİ: 2, PİDECİ: 2, OTEL: 2, ECZANE: 3, OPTİK: 3, KUAFÖR: 4, BERBER: 4,
  TERZİ: 5, AYAKKABI: 5, KUYUMCU: 5, SAATÇİ: 5, OYUNCAKÇI: 5, LOSTRA: 5, MANAV: 6, ÇİÇEKÇİ: 6, KASAP: 7, BALIKÇI: 7,
};

function drawInteriors(g, Y) {
  const R = KY.rng(4242);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const rrect = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const vgrad = (x, y, w, h, c0, c1) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  const shelf = (x, y, w, c = '#6b6f78') => { g.fillStyle = c; g.fillRect(x, y, w, 4); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y + 4, w, 3); };
  const ceiling = (x, y, warm) => { const gr = g.createLinearGradient(0, y, 0, y + 46); gr.addColorStop(0, warm ? 'rgba(255,226,170,.95)' : 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, 256, 46); };
  const PAL = ['#d8402a', '#f2c230', '#2f7fd6', '#3aa65a', '#f08a24', '#f4f1ea', '#8a3fb5', '#e85d8a', '#1c2a4a', '#9fd3e8'];
  const market = (x, y) => {
    vgrad(x, y, 256, 256, '#f1ece2', '#d6cdb9'); ceiling(x, y, false);
    [70, 124, 178, 232].forEach((sy) => {
      for (let px = x + 6; px < x + 176;) {
        const w = 9 + R() * 11, h = 20 + R() * 22, c = pick(PAL), top = y + sy - h;
        g.fillStyle = c;
        if (R() < 0.3) { rrect(px, top, w, h, w * 0.35); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(px + 2, top + h * 0.38, w - 4, h * 0.22); } else {
          g.fillRect(px, top, w, h); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(px + 1, top + 3, w - 2, 4); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px + w - 2, top, 2, h);
        }
        px += w + 1.5;
      }
      shelf(x + 2, y + sy, 180);
    });
    g.fillStyle = '#c9ced6'; g.fillRect(x + 186, y + 16, 68, 236);
    vgrad(x + 192, y + 22, 56, 224, '#f4fbff', '#cfe6f2');
    for (let r = 0; r < 5; r++) {
      const sy = y + 62 + r * 44;
      for (let k = 0; k < 6; k++) { g.fillStyle = pick(['#d8402a', '#2f7fd6', '#3aa65a', '#f2c230', '#1c2a4a']); rrect(x + 195 + k * 9, sy - 30, 7, 30, 3); g.fill(); }
      g.fillStyle = '#9aa3ad'; g.fillRect(x + 192, sy, 56, 3);
    }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 192, y + 22, 6, 224);
  };
  const bakery = (x, y) => {
    vgrad(x, y, 256, 256, '#ecd3a6', '#c99a62'); ceiling(x, y, true);
    [62, 112, 158].forEach((sy, r) => {
      for (let k = 0; k < 7; k++) {
        const cx = x + 22 + k * 34 + (r % 2) * 10, w = 26 + R() * 6, by = y + sy;
        if (r === 0 && k % 2) {
          g.fillStyle = '#b8702e'; g.beginPath(); g.ellipse(cx, by - 11, 14, 10, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#e9c48a'; g.beginPath(); g.ellipse(cx, by - 12, 6, 4, 0, 0, Math.PI * 2); g.fill();
        } else {
          const gr = g.createLinearGradient(0, by - 22, 0, by); gr.addColorStop(0, '#e2a656'); gr.addColorStop(1, '#9a5a22');
          g.fillStyle = gr; g.beginPath(); g.ellipse(cx, by - 10, w / 2, 11, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(255,235,190,.7)'; g.lineWidth = 1.5;
          for (let q = -1; q <= 1; q++) { g.beginPath(); g.moveTo(cx + q * 6 - 3, by - 16); g.lineTo(cx + q * 6 + 3, by - 6); g.stroke(); }
        }
      }
      shelf(x, y + sy, 256, '#7a4a26');
    });
    g.fillStyle = '#7a4a26'; g.fillRect(x, y + 214, 256, 42);
    vgrad(x + 6, y + 176, 244, 40, 'rgba(220,240,250,.9)', 'rgba(190,220,235,.9)');
    for (let k = 0; k < 9; k++) {
      const cx = x + 22 + k * 27;
      g.fillStyle = pick(['#f6d6e0', '#5a3424', '#fff3d6', '#e85d8a', '#f2c230']); rrect(cx - 10, y + 196, 20, 16, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(cx - 8, y + 197, 16, 3);
      if (k % 3 === 0) { g.fillStyle = '#d8402a'; g.beginPath(); g.arc(cx, y + 194, 3, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 6, y + 176, 244, 3);
  };
  const cafe = (x, y) => {
    vgrad(x, y, 256, 256, '#6a4632', '#3b261b');
    g.fillStyle = '#1f2321'; g.fillRect(x + 30, y + 40, 110, 70); g.strokeStyle = '#a07a4a'; g.lineWidth = 4; g.strokeRect(x + 30, y + 40, 110, 70);
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let k = 0; k < 5; k++) { g.fillRect(x + 40, y + 52 + k * 11, 50 + R() * 30, 3); g.fillRect(x + 118, y + 52 + k * 11, 12, 3); }
    for (let k = 0; k < 3; k++) {
      const cx = x + 50 + k * 78;
      g.strokeStyle = '#222'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + 26); g.stroke();
      const gl2 = g.createRadialGradient(cx, y + 32, 2, cx, y + 32, 42); gl2.addColorStop(0, 'rgba(255,220,150,.9)'); gl2.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gl2; g.fillRect(cx - 42, y - 10, 84, 84);
      g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(cx - 12, y + 34); g.lineTo(cx + 12, y + 34); g.lineTo(cx + 6, y + 24); g.lineTo(cx - 6, y + 24); g.closePath(); g.fill();
    }
    g.fillStyle = '#8a5a3a'; g.fillRect(x + 150, y + 150, 106, 106); g.fillStyle = '#a8744c'; g.fillRect(x + 146, y + 146, 110, 8);
    g.fillStyle = '#c9ced6'; g.fillRect(x + 176, y + 112, 52, 34); g.fillStyle = '#2a2c31'; g.fillRect(x + 182, y + 120, 40, 10);
    for (let k = 0; k < 4; k++) { g.fillStyle = '#f4f1ea'; g.fillRect(x + 160 + k * 22, y + 136, 10, 10); }
    for (let k = 0; k < 2; k++) {
      const cx = x + 40 + k * 64;
      g.fillStyle = '#2a1a12'; g.fillRect(cx - 2, y + 190, 4, 50);
      g.fillStyle = '#c99a62'; g.beginPath(); g.ellipse(cx, y + 188, 26, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a2418'; g.fillRect(cx - 34, y + 176, 5, 64); g.fillRect(cx - 34, y + 206, 18, 5); g.fillRect(cx + 29, y + 176, 5, 64); g.fillRect(cx + 16, y + 206, 18, 5);
      g.fillStyle = '#f4f1ea'; g.fillRect(cx - 6, y + 178, 8, 9);
    }
    vgrad(x, y + 236, 256, 20, '#2a1a12', '#1c120c');
  };
  const pharmacy = (x, y) => {
    vgrad(x, y, 256, 256, '#f7fbfa', '#dfe9e6'); ceiling(x, y, false);
    g.fillStyle = '#18a558'; g.fillRect(x + 108, y + 26, 40, 14); g.fillRect(x + 121, y + 13, 14, 40);
    [86, 136, 186, 236].forEach((sy) => {
      for (let px = x + 8; px < x + 248;) {
        const w = 8 + R() * 9, h = 14 + R() * 16;
        g.fillStyle = pick(['#ffffff', '#e8f1f8', '#2f7fd6', '#3aa65a', '#e85d8a', '#f2c230', '#ffffff']); g.fillRect(px, y + sy - h, w, h);
        g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px + w - 1.5, y + sy - h, 1.5, h);
        px += w + 2;
      }
      shelf(x, y + sy, 256, '#c3ccd2');
    });
  };
  const salon = (x, y) => {
    vgrad(x, y, 256, 256, '#efe3e6', '#cdbfc4'); ceiling(x, y, false);
    for (let k = 0; k < 2; k++) {
      const mx = x + 26 + k * 120;
      g.fillStyle = '#2a2c31'; rrect(mx - 4, y + 44, 92, 112, 10); g.fill();
      const gr = g.createLinearGradient(mx, y + 48, mx + 84, y + 152); gr.addColorStop(0, '#d6e8f2'); gr.addColorStop(0.5, '#9fc2d6'); gr.addColorStop(1, '#c8dde8');
      g.fillStyle = gr; rrect(mx, y + 48, 84, 104, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(mx + 10, y + 52, 8, 96);
      g.fillStyle = '#f4f1ea'; g.fillRect(mx - 8, y + 160, 100, 8); g.fillStyle = '#c9c2b8'; g.fillRect(mx - 8, y + 168, 100, 4);
      for (let q = 0; q < 3; q++) { g.fillStyle = pick(['#2f7fd6', '#f4f1ea', '#e85d8a', '#3aa65a']); rrect(mx + 6 + q * 12, y + 146, 8, 14, 3); g.fill(); }
      g.fillStyle = '#1e1f24'; rrect(mx + 22, y + 176, 40, 34, 7); g.fill(); rrect(mx + 26, y + 150, 32, 30, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(mx + 30, y + 154, 4, 22);
      g.fillStyle = '#9aa0a8'; g.fillRect(mx + 39, y + 210, 6, 28); g.fillRect(mx + 24, y + 236, 36, 5);
    }
    g.fillStyle = '#3f8f3a';
    for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x + 236 + (R() - 0.5) * 14, y + 190 - k * 9, 10, 5, R(), 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#b5523b'; g.fillRect(x + 226, y + 196, 20, 26);
    vgrad(x, y + 238, 256, 18, '#b9b0a8', '#8f877f');
  };
  const boutique = (x, y) => {
    vgrad(x, y, 256, 256, '#f2e6d4', '#d8c4a8'); ceiling(x, y, true);
    g.fillStyle = '#9aa0a8'; g.fillRect(x + 10, y + 58, 150, 4);
    for (let k = 0; k < 9; k++) {
      const cx = x + 20 + k * 16, bot = y + 130 + (k % 3) * 10;
      g.strokeStyle = '#555'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, y + 60); g.lineTo(cx, y + 66); g.stroke();
      g.fillStyle = pick(['#2f3b5c', '#c62828', '#f4f1ea', '#3a8a55', '#d9a43a', '#6a4a8a', '#1c1c22', '#e85d8a']);
      g.beginPath(); g.moveTo(cx - 9, y + 68); g.lineTo(cx + 9, y + 68); g.lineTo(cx + 11, bot); g.lineTo(cx - 11, bot); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(cx - 7, y + 70, 3, 50);
    }
    g.fillStyle = '#e9e4dc'; g.beginPath(); g.ellipse(x + 205, y + 54, 13, 15, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = pick(['#c62828', '#2f3b5c', '#d9a43a']); g.beginPath(); g.moveTo(x + 182, y + 74); g.lineTo(x + 228, y + 74); g.lineTo(x + 238, y + 190); g.lineTo(x + 172, y + 190); g.closePath(); g.fill();
    g.fillStyle = '#5a5f68'; g.fillRect(x + 202, y + 190, 6, 44); g.fillRect(x + 186, y + 232, 38, 5);
    for (const sy of [176, 222]) {
      shelf(x + 10, y + sy, 140, '#b89a74');
      for (let k = 0; k < 6; k++) { g.fillStyle = pick(['#1c1c22', '#7a4a2a', '#f4f1ea', '#c62828', '#2f7fd6']); rrect(x + 16 + k * 22, y + sy - 12, 18, 12, 4); g.fill(); }
    }
  };
  const produce = (x, y) => {
    vgrad(x, y, 256, 256, '#e9efe0', '#c3cfb2'); ceiling(x, y, true);
    for (let k = 0; k < 6; k++) {
      const cx = x + 22 + k * 42;
      g.fillStyle = '#3f8f3a'; for (let q = 0; q < 6; q++) g.fillRect(cx - 8 + q * 3, y + 58, 2, 28);
      for (let q = 0; q < 7; q++) { g.fillStyle = pick(['#e33a5a', '#f2c230', '#ffffff', '#e85d8a', '#8a3fb5', '#f08a24']); g.beginPath(); g.arc(cx - 10 + R() * 20, y + 52 + R() * 12, 5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#5f6b7a'; g.fillRect(cx - 11, y + 84, 22, 20);
    }
    [[124, 0], [172, 1], [220, 2]].forEach(([sy, r]) => {
      for (let k = 0; k < 4; k++) {
        const bx = x + 6 + k * 62, fc = [['#d8402a', '#e85d4a'], ['#f2c230', '#e8a020'], ['#3aa65a', '#7cc05a'], ['#f08a24', '#e86a14'], ['#8a3fb5', '#a85ad0'], ['#e85d8a', '#f4a0c0']][(k + r * 2) % 6];
        g.fillStyle = '#a8743c'; g.fillRect(bx, y + sy - 6, 58, 30); g.fillStyle = '#8a5a2a'; g.fillRect(bx, y + sy + 6, 58, 3);
        for (let q = 0; q < 9; q++) {
          const fx2 = bx + 8 + (q % 5) * 10.5 + (q > 4 ? 5 : 0), fy2 = y + sy - 8 - (q > 4 ? 9 : 0);
          g.fillStyle = fc[q % 2]; g.beginPath(); g.arc(fx2, fy2, 6.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(fx2 - 2, fy2 - 2, 2, 0, Math.PI * 2); g.fill();
        }
      }
    });
  };
  const counter = (x, y) => {
    g.fillStyle = '#f2f4f4'; g.fillRect(x, y, 256, 256);
    g.strokeStyle = 'rgba(120,140,150,.35)'; g.lineWidth = 1;
    for (let k = 0; k <= 256; k += 21) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k, y + 150); g.stroke(); }
    for (let k = 0; k <= 150; k += 21) { g.beginPath(); g.moveTo(x, y + k); g.lineTo(x + 256, y + k); g.stroke(); }
    ceiling(x, y, false);
    g.fillStyle = '#9aa0a8'; g.fillRect(x + 10, y + 40, 236, 4);
    for (let k = 0; k < 10; k++) { const cx = x + 20 + k * 23; g.fillStyle = '#7a1c1c'; rrect(cx - 4, y + 44, 8, 44 + (k % 3) * 8, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(cx - 2, y + 48, 2, 30); }
    g.fillStyle = '#d8dde2'; g.fillRect(x, y + 196, 256, 60);
    vgrad(x + 4, y + 150, 248, 50, 'rgba(225,240,248,.95)', 'rgba(200,225,238,.95)');
    for (let k = 0; k < 8; k++) {
      const cx = x + 22 + k * 30;
      if (k % 3 === 2) {
        g.fillStyle = '#b8c4cc'; g.beginPath(); g.ellipse(cx, y + 186, 13, 5, 0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7a8a96'; g.beginPath(); g.moveTo(cx + 12, y + 186); g.lineTo(cx + 19, y + 181); g.lineTo(cx + 19, y + 191); g.fill();
      } else {
        g.fillStyle = pick(['#c0392b', '#d35454', '#e8a0a0', '#a52a2a']); rrect(cx - 12, y + 178, 24, 14, 5); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(cx - 9, y + 180, 9, 2);
      }
    }
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + 4, y + 150, 248, 3);
  };
  // camdaki yansıma: çapraz açık şeritler + üstte gökyüzü mavisi
  const sheen = (x, y) => {
    const gr = g.createLinearGradient(x, y, x + 256, y + 256);
    [[0, 0], [0.38, 0], [0.46, 0.16], [0.52, 0.04], [0.6, 0.12], [0.66, 0], [1, 0]].forEach(([t, a]) => gr.addColorStop(t, `rgba(255,255,255,${a})`));
    g.fillStyle = gr; g.fillRect(x, y, 256, 256);
    const sk = g.createLinearGradient(0, y, 0, y + 90); sk.addColorStop(0, 'rgba(170,200,230,.22)'); sk.addColorStop(1, 'rgba(170,200,230,0)');
    g.fillStyle = sk; g.fillRect(x, y, 256, 90);
  };
  [market, bakery, cafe, pharmacy, salon, boutique, produce, counter].forEach((fn, i) => {
    const x = (i % 4) * 256, y = Y + Math.floor(i / 4) * 256;
    g.save(); g.beginPath(); g.rect(x, y, 256, 256); g.clip();
    fn(x, y); sheen(x, y);
    g.restore();
  });
}

// Doku atlası (1024×2048): 0-1023 dükkân tabelaları (512×64 ışıklı kutu), 1024-1535 pankartlar (512×128), 1536-2047 vitrin içleri (256×256)
function drawAtlas(cv, brand, logoImg) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 1024, 2048);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lum = (h) => { const c = hexRGB(h); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };
  const tone = (h, f) => `rgb(${hexRGB(h).map((v) => Math.round(clamp(v * f, 0, 1) * 255)).join(',')})`;
  SHOPS.forEach(([name, bg], i) => {
    const x = (i % 2) * 512, y = Math.floor(i / 2) * 64;
    const gr = g.createLinearGradient(0, y, 0, y + 64);
    gr.addColorStop(0, tone(bg, 1.18)); gr.addColorStop(0.5, bg); gr.addColorStop(1, tone(bg, 0.8));
    g.fillStyle = gr; g.fillRect(x, y, 512, 64);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, y + 5, 512, 2);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y + 57, 512, 2);
    fitText(g, name, 206, 40);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillText(name, x + 257.5, y + 35.5);
    g.fillStyle = lum(bg) > 0.62 ? '#1c1633' : '#ffffff'; g.fillText(name, x + 256, y + 34);
  });
  const cell = (i) => [(i % 2) * 512, 1024 + Math.floor(i / 2) * 128];
  const road = (i, top, bottom) => {
    const [x, y] = cell(i);
    g.fillStyle = '#0d6b3a'; g.fillRect(x + 4, y + 4, 504, 120);
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(x + 12, y + 12, 488, 104);
    g.fillStyle = '#ffffff';
    if (bottom) {
      fitText(g, top, 460, 34); g.fillText(top, x + 256, y + 46);
      fitText(g, bottom, 460, 44); g.fillText(bottom, x + 256, y + 88);
    } else { fitText(g, top, 460, 64); g.fillText(top, x + 256, y + 66); }
  };
  {
    const [x, y] = cell(BANNER.start);
    g.fillStyle = '#1c1633'; g.fillRect(x + 4, y + 4, 504, 120);
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#1c1633'; g.fillRect(x + 4 + k * 31.5, y + 4, 31.5, 14); g.fillStyle = k % 2 ? '#1c1633' : '#ffffff'; g.fillRect(x + 4 + k * 31.5, y + 110, 31.5, 14); }
    g.fillStyle = '#3ddc97'; fitText(g, 'BAŞLA', 440, 70); g.fillText('BAŞLA', x + 256, y + 66);
  }
  {
    const [x, y] = cell(BANNER.finish);
    g.fillStyle = brand.css; g.fillRect(x + 4, y + 4, 504, 120);
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#111111'; g.fillRect(x + 4 + k * 31.5, y + 4, 31.5, 16); g.fillRect(x + 4 + ((k + 1) % 16) * 31.5, y + 108, 31.5, 16); }
    g.fillStyle = brand.ink; fitText(g, 'TESLİMAT 🏁', 460, 64); g.fillText('TESLİMAT 🏁', x + 256, y + 66);
  }
  road(BANNER.k750, 'TESLİMATA', '750 m');
  road(BANNER.half, 'YARI YOL', '500 m kaldı');
  road(BANNER.k250, 'SON DÜZLÜK', '250 m');
  {
    const [x, y] = cell(BANNER.brand);
    g.fillStyle = brand.css; g.fillRect(x + 4, y + 4, 504, 120);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.strokeRect(x + 10, y + 10, 492, 108);
    let tx = x + 256, tw = 470;
    if (logoImg) {
      const s = 96, ix = x + 22, iy = y + 16;
      const r = logoImg.width / logoImg.height;
      g.save();
      if (brand.round) { g.beginPath(); g.arc(ix + s / 2, iy + s / 2, s / 2, 0, Math.PI * 2); g.clip(); g.drawImage(logoImg, ix, iy, s, s); } else {
        const w = Math.min(150, s * r), h = w / r; g.drawImage(logoImg, ix, iy + (s - h) / 2, w, h);
      }
      g.restore();
      const used = brand.round ? 120 : Math.min(170, 96 * r + 24);
      tx = x + used + (512 - used) / 2; tw = 512 - used - 26;
    }
    g.fillStyle = brand.ink; fitText(g, brand.name, tw, 52); g.fillText(brand.name, tx, y + 66);
  }
  { const [x, y] = cell(BANNER.stop); g.fillStyle = '#0b57d0'; g.fillRect(x + 4, y + 4, 504, 120); g.fillStyle = '#fff'; fitText(g, '🚏 DURAK', 440, 64); g.fillText('🚏 DURAK', x + 256, y + 66); }
  { const [x, y] = cell(BANNER.kiosk); g.fillStyle = '#d32f2f'; g.fillRect(x + 4, y + 4, 504, 120); g.fillStyle = '#fff'; fitText(g, 'GAZETE · BÜFE', 460, 58); g.fillText('GAZETE · BÜFE', x + 256, y + 66); }
  drawInteriors(g, 1536);
}
// Tabela hücresinden, A = genişlik / yükseklik oranına göre ortalanmış dilim (yazı hiç gerilmez; A ≥ 4 olmalı)
const shopUV = (i, A = 4) => {
  const k = ((i % SHOPS.length) + SHOPS.length) % SHOPS.length, x = (k % 2) * 512, y = Math.floor(k / 2) * 64;
  const hw = Math.min(250, A * 29);
  return [(x + 256 - hw) / 1024, (y + 3) / 2048, (x + 256 + hw) / 1024, (y + 61) / 2048];
};
const bannerUV = (i) => { const x = (i % 2) * 512, y = 1024 + Math.floor(i / 2) * 128; return [(x + 4) / 1024, (y + 4) / 2048, (x + 508) / 1024, (y + 124) / 2048]; };
// Vitrin içi hücresi: A = bölme genişliği / yüksekliği (≤ 1 ise yatayda ortadan kırpılır)
const intUV = (st, A = 1) => {
  const x = (st % 4) * 256, y = 1536 + Math.floor(st / 4) * 256;
  const hw = Math.min(124, 124 * A);
  return [(x + 128 - hw) / 1024, (y + 4) / 2048, (x + 128 + hw) / 1024, (y + 252) / 2048];
};

function drawLogo(cv, brand, img) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = brand.box; g.fillRect(0, 0, 256, 256);
  if (img) {
    g.save();
    if (brand.round) {
      g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); g.arc(128, 128, 106, 0, Math.PI * 2); g.clip();
      g.drawImage(img, 22, 22, 212, 212);
    } else {
      const r = img.width / img.height;
      let w = 228, h = w / r;
      if (h > 200) { h = 200; w = h * r; }
      g.drawImage(img, 128 - w / 2, 128 - h / 2, w, h);
    }
    g.restore();
  } else {
    g.fillStyle = brand.ink;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, 'NFC', 210, 104); g.fillText('NFC', 128, 104);
    fitText(g, 'DÜNYASI', 210, 46); g.fillText('DÜNYASI', 128, 172);
    g.fillRect(48, 206, 160, 8);
  }
}

/* ============================ şehir yerleşimi ============================ */

const CH = 50;
const FACADES = ['#f2d6a2', '#e8b4a0', '#c9dbe8', '#d8e8c8', '#f5e6c8', '#e6c3d3', '#cfd4dc', '#f0c987', '#b8d4d0', '#e3a587', '#d9d2e9', '#f2b880', '#e9e2d0', '#c7b8a6'];
const TREE_COLS = ['#3f8f3a', '#4fa44a', '#2f7a39', '#5c9e45', '#3a8a55'];

function makeLayout(seed, len) {
  const R = KY.rng((seed ^ 0x5bd1e995) >>> 0);
  const L = { side: [[], []], lamps: [], trees: [], cross: [], props: [], bills: [] };
  for (let d = 125 + R() * 60; d < len - 90; d += 150 + R() * 110) {
    if ([250, 500, 750].some((g) => Math.abs(d - g) < 22)) d += 30;
    if (d < len - 90) L.cross.push(d);
  }
  const inCross = (a, b) => L.cross.some((c) => b > c - 7.2 && a < c + 7.2);
  for (let s = 0; s < 2; s++) {
    let d = -70;
    while (d < len + 120) {
      if (s === 1 && d > -24 && d < 12) { d = 12; continue; }
      let w = 6.5 + R() * 8;
      const c = L.cross.find((cc) => d < cc + 7.2 && d + w > cc - 7.2);
      if (c !== undefined) {
        if (d < c - 10.5) w = c - 7.3 - d;
        else { d = c + 7.3; continue; }
      }
      L.side[s].push({ d, w, fl: 2 + Math.floor(R() * 5), dep: 8 + R() * 6, col: Math.floor(R() * 997), shop: R() < 0.62 ? Math.floor(R() * 997) : -1, roof: R(), bal: R() < 0.55, seed: Math.floor(R() * 1e9) });
      d += w + 0.12;
    }
  }
  for (let d = 9, i = 0; d < len + 110; d += 26, i++) if (!inCross(d - 1.5, d + 1.5)) L.lamps.push({ d, s: i % 2 });
  const busy = (s, d, r) => L.lamps.some((l) => l.s === s && Math.abs(l.d - d) < r) || L.bills.some((b) => b.s === s && Math.abs(b.d - d) < r + 2);
  [300, 610, 890].forEach((d, i) => { if (!inCross(d - 4, d + 4)) L.bills.push({ d, s: (i + 1) % 2 }); });
  for (let d = 30; d < len; d += 40 + R() * 55) {
    const s = R() < 0.5 ? 0 : 1;
    if (inCross(d - 3, d + 3) || busy(s, d, 3)) continue;
    L.props.push({ d, s, k: Math.floor(R() * 7) });
  }
  for (let d = -50; d < len + 110; d += 6 + R() * 9) {
    const s = R() < 0.5 ? 0 : 1;
    if (inCross(d - 2.5, d + 2.5) || busy(s, d, 2.8) || L.props.some((p) => p.s === s && Math.abs(p.d - d) < 3.5)) continue;
    if (s === 1 && d > -26 && d < 14) continue;
    L.trees.push({ d, s, h: 0.85 + R() * 0.5, t: Math.floor(R() * 99) });
  }
  return L;
}


/* ============================ emoji tepkileri ============================ */
// Oyuncu 😀 düğmesinden bir tepki seçer; sunucu herkese iletir; baloncuk karakterin başının üstünde yükselir.
const EMOS = ['😂', '😎', '🔥', '👏', '😭', '😡', '🤯', '🎉'];
class EmoteUI {
  constructor(wrap, send, pop) {
    this.wrap = wrap; this.send = send; this.pop = pop;
    this.seen = new Set(); this.live = []; this.open = false; this.lastSend = 0;
    const mu = wrap.querySelector('.ib.mu');
    const btn = document.createElement('button');
    btn.className = 'ib emb';
    btn.setAttribute('aria-label', 'Tepki gönder');
    btn.textContent = '😀';
    if (mu && mu.parentNode) mu.parentNode.insertBefore(btn, mu);
    const pal = document.createElement('div');
    pal.className = 'em-pal';
    pal.innerHTML = EMOS.map((e) => `<button data-e="${e}" aria-label="${e}">${e}</button>`).join('');
    wrap.appendChild(pal);
    const lay = document.createElement('div');
    lay.className = 'em-lay';
    wrap.appendChild(lay);
    this.btn = btn; this.pal = pal; this.lay = lay;
    btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.toggle(); });
    pal.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const b = ev.target.closest('[data-e]');
      if (b) this.fire(b.dataset.e);
    });
    // palet açıkken dışarıya dokunmak yalnızca paleti kapatır (oyunda yanlışlıkla hamle yapılmasın)
    this.onDoc = (ev) => { if (this.open && !ev.target.closest('.em-pal, .emb')) { ev.stopPropagation(); ev.preventDefault(); this.toggle(false); } };
    wrap.addEventListener('pointerdown', this.onDoc, true);
  }
  toggle(v = !this.open) { this.open = v; this.pal.classList.toggle('on', v); }
  fire(e) {
    const now = performance.now();
    if (now - this.lastSend < 950) return;
    this.lastSend = now;
    this.toggle(false);
    vibrate(10);
    try { this.send(e); } catch { /* yok say */ }
  }
  // view.emo: [[oyuncuId, emoji, sunucuZamanı], ...]
  sync(list, serverNow) {
    if (!list || !list.length) return;
    for (const it of list) {
      const [pid, e, t] = it;
      const k = pid + '|' + t;
      if (this.seen.has(k)) continue;
      this.seen.add(k);
      if (!EMOS.includes(e) || serverNow - t > 2500) continue;
      const el = document.createElement('div');
      el.className = 'em-b';
      el.innerHTML = `<b>${e}</b>`;
      el.style.opacity = '0';
      this.lay.appendChild(el);
      this.live.push({ pid, e, el, born: performance.now(), side: false });
      if (this.live.length > 10) { const o = this.live.shift(); o.el.remove(); }
      try { this.pop && this.pop(); } catch { /* yok say */ }
    }
    if (this.seen.size > 300) this.seen = new Set([...this.seen].slice(-120));
  }
  // anchor(pid) → karakterin başının üstü [x, y] (ekran pikseli) ya da null; name(pid) → takma ad
  frame(anchor, name) {
    const now = performance.now();
    const W = this.wrap.clientWidth || 320, H = this.wrap.clientHeight || 640;
    let slot = 0;
    // açık sonuç/bilgi kartı: kenar baloncukları kartın boş tarafına (üstüne ya da altına) dizilir
    let y0 = 152, dir = 1;
    if (this.live.length) {
      if (!this.cardT || now - this.cardT > 250) {
        this.cardT = now;
        const card = this.wrap.querySelector('.panel.on .card');
        this.cardR = card ? card.getBoundingClientRect() : null;
        this.wrapR = card ? this.wrap.getBoundingClientRect() : null;
      }
      const r = this.cardR;
      if (r && r.height > 40) {
        const top = r.top - (this.wrapR?.top || 0), bot = r.bottom - (this.wrapR?.top || 0);
        if (H - bot > 70) { y0 = bot + 36; dir = 1; }            // kartın altı
        else if (top > 118) { y0 = top - 26; dir = -1; }          // kartın üstü (yukarı doğru dizilir)
        else { y0 = H - 40; dir = -1; }                           // yer yok: en alta
      }
    }
    for (let i = 0; i < this.live.length; i++) {
      const q = this.live[i];
      const age = (now - q.born) / 1000;
      if (age > 2.7) { q.el.remove(); this.live.splice(i, 1); i--; continue; }
      let p = null;
      try { p = anchor(q.pid); } catch { p = null; }
      if (p && (p[0] < -40 || p[0] > W + 40 || p[1] < 30)) p = null;
      const fade = age > 2.1 ? 1 - (age - 2.1) / 0.6 : 1;
      const k = Math.min(1, age / 0.22);
      const s = 0.3 + 0.7 * (1 - Math.pow(1 - k, 3)) + (age < 0.36 ? Math.sin((age / 0.36) * Math.PI) * 0.22 : 0);
      let x, y;
      if (p) {
        if (q.side) { q.side = false; q.el.className = 'em-b'; q.el.innerHTML = `<b>${q.e}</b>`; }
        x = Math.max(32, Math.min(W - 32, p[0])); y = p[1] - age * 22;   // ekran kenarındaki karakterin baloncuğu taşmasın
        q.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%) scale(${s.toFixed(3)})`;
      } else {
        if (!q.side) { q.side = true; q.el.className = 'em-b side'; q.el.innerHTML = `<b>${q.e}</b><span>${esc(name(q.pid) || '')}</span>`; }
        // karakteri ekranda olmayan oyuncunun tepkisi: sağ kenarda, üst göstergelerin altında
        x = W - 10; y = y0 + dir * slot * 44 - age * 4; slot++;
        q.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-100%,-50%) scale(${s.toFixed(3)})`;
      }
      q.el.style.opacity = Math.max(0, fade).toFixed(3);
    }
  }
  dispose() {
    this.wrap.removeEventListener('pointerdown', this.onDoc, true);
    this.pal.remove(); this.lay.remove(); this.btn.remove();
    this.live.length = 0;
  }
}

/* ============================ yayalar ============================ */
// Basit, eklemli insan: gövde (baş + saç dahil), bacak (kalçadan aşağı), kol (omuzdan aşağı). Orijin ayakların ortası, yüz +Z.
const PED_TYPES = [
  { shirt: '#d94a3a', pants: '#2f3b55', hair: '#2a1a12', skin: '#f2c39a', bag: '#6b4a2a', short: true },
  { shirt: '#3a7bd5', pants: '#3a3a40', hair: '#5a3a1e', skin: '#e0ac80', bag: null },
  { shirt: '#f2d14a', pants: '#4a5a3a', hair: '#1a1410', skin: '#c98a5e', bag: '#2a2a30', long: true, short: true },
  { shirt: '#2fa86a', pants: '#2b2b33', hair: '#a8652a', skin: '#f5d0ae', bag: null, long: true },
  { shirt: '#f2f2ee', pants: '#2a4a7a', hair: '#3a2416', skin: '#e8b48c', bag: '#c8402e', short: true },
  { shirt: '#8a4ad0', pants: '#33333a', hair: '#d8c08a', skin: '#f2c39a', bag: null, long: true },
  { shirt: '#ff8a3a', pants: '#3a3a44', hair: '#2a1a12', skin: '#a8724a', bag: '#2f6b3a', short: true },
  { shirt: '#55606e', pants: '#1f2430', hair: '#888888', skin: '#f0c8a0', bag: null, hat: '#2a2a30' },
];
// Yaya gövdesi (ön = +z): kalça, belden omuza giysi, boyun, gerçek oranlı baş (kulak, burun, kaş, göz), saç, şapka, sırt çantası
function pedBody(mb, t) {
  const sh = C(t.shirt, -0.12), shD = shade(C(t.shirt, -0.12), 0.78), sk = C(t.skin, -0.1), skD = shade(C(t.skin, -0.1), 0.88);
  const hr = C(t.hair, -0.3), pa = C(t.pants, -0.1), dark = C('#1b1530', -0.6);
  mb.superS(0, 0.89, 0, 0.156, 0.09, 0.104, 0.7, 0.75, pa, 10, 6);
  const T = [[0.87, 0.174, 0.12], [0.95, 0.164, 0.11], [1.06, 0.168, 0.11], [1.18, 0.186, 0.116], [1.29, 0.198, 0.114], [1.37, 0.197, 0.1], [1.42, 0.165, 0.086], [1.455, 0.1, 0.066], [1.47, 0.06, 0.05]];
  loft(mb, T.map(([y, a, b]) => ({ c: [0, y, 0], a, b, e: 0.86 })), (i) => (i === 0 ? shade(sh, 0.9) : sh), 12, 's');
  mb.torusN(0, 1.445, 0.008, 0.07, 0.016, 0.014, 10, 4, shD);
  limb(mb, [0, 1.42, 0], [0, 1.535, 0.006], [0.047, 0.044], sk, 7, null, 1);
  // baş: hafif uzun, önden arkaya derin
  const HY = 1.628, HZ = 0.012;
  mb.sphereS(0, HY, HZ, 0.094, 0.114, 0.104, sk, 12, 9);
  for (const s2 of [-1, 1]) {
    mb.sphereS(s2 * 0.093, HY - 0.006, HZ - 0.008, 0.016, 0.028, 0.02, skD, 5, 3);
    mb.sphereS(s2 * 0.034, HY + 0.012, HZ + 0.088, 0.011, 0.012, 0.007, dark, 4, 3);
    mb.box(s2 * 0.034 - 0.02, HY + 0.034, HZ + 0.083, s2 * 0.034 + 0.02, HY + 0.042, HZ + 0.095, hr);
  }
  mb.sphereS(0, HY - 0.012, HZ + 0.1, 0.015, 0.024, 0.018, skD, 5, 3);
  mb.box(-0.022, HY - 0.052, HZ + 0.088, 0.022, HY - 0.046, HZ + 0.096, C('#8a4a3a', -0.2));
  // saç: tepeyi saran kep + ensede (kulak arkasına kadar) iner
  const hr3 = [0.104, 0.124, 0.114];
  ellPatch(mb, 0, HY + 0.004, HZ - 0.004, ...hr3, 0, 1.08, 0, Math.PI * 2, 12, 3, hr);
  ellPatch(mb, 0, HY + 0.004, HZ - 0.004, ...hr3, 1.08, 1.95, Math.PI + 0.3, Math.PI * 2 - 0.3, 8, 3, hr);
  if (t.long) mb.superS(0, 1.5, -0.062, 0.096, 0.17, 0.05, 0.8, 0.8, hr, 10, 6);
  if (t.hat) mb.lathe(0, HY + 0.07, HZ, [[0.15, 0], [0.15, 0.014], [0.1, 0.02], [0.1, 0.11], [0, 0.11]], 12, C(t.hat, -0.3));
  if (t.bag) {
    const bg = C(t.bag, -0.2);
    mb.rbox(-0.15, 0.98, -0.215, 0.15, 1.36, -0.105, 0.045, bg, 1);
    mb.rbox(-0.11, 1.0, -0.232, 0.11, 1.16, -0.2, 0.03, shade(bg, 0.85), 1);
    for (const s2 of [-1, 1]) tubePath(mb, [[s2 * 0.11, 1.34, -0.115], [s2 * 0.125, 1.43, -0.03], [s2 * 0.12, 1.38, 0.09], [s2 * 0.11, 1.12, 0.112]], 0.014, shade(bg, 0.7), 4);
  }
}
// Bacak (kalçada döner, aşağı uzanır): pantolon (uyluk + baldır) + ayakkabı
function pedLeg(mb, t) {
  const pa = C(t.pants, -0.1);
  limb(mb, [0, -0.02, 0], [0, -0.44, 0.014], [0.077, 0.072, 0.063], pa, 8, null, 1);
  limb(mb, [0, -0.44, 0.014], [0, -0.79, -0.004], [0.059, 0.054, 0.046], pa, 8, null, 1);
  mb.superS(0, -0.818, 0.034, 0.049, 0.04, 0.114, 0.7, 0.6, C('#1e1c22', -0.4), 8, 5);
  mb.superS(0, -0.848, 0.034, 0.051, 0.011, 0.116, 0.6, 0.5, t.short ? C('#e8e6e0', -0.2) : C('#2a2828', -0.2), 8, 2);
}
// Kol (omuzda döner): kol + ön kol (kısa kollularda ten) + el
function pedArm(mb, t) {
  const sh = C(t.shirt, -0.12), sk = C(t.skin, -0.1);
  if (t.short) {
    limb(mb, [0, 0, 0], [0, -0.28, 0], [0.046, 0.045, 0.041], sk, 7, null, 2);
    limb(mb, [0, 0.012, 0], [0, -0.125, 0], [0.057, 0.055], sh, 7, null, 2);
  } else limb(mb, [0, 0, 0], [0, -0.28, 0], [0.052, 0.05, 0.045], sh, 7, null, 2);
  limb(mb, [0, -0.28, 0], [0, -0.52, 0.03], [0.043, 0.04, 0.034], t.short ? sk : sh, 7, null, 1);
  mb.superS(0, -0.575, 0.036, 0.029, 0.05, 0.04, 0.7, 0.7, sk, 6, 5);
}
// Yarış başına yaya listesi: her kaldırımda kameranın çevresindeki pencerede dolaşan kişiler
function makePeds(seed) {
  const R = KY.rng((seed ^ 0x2c1b3c6d) >>> 0);
  const P = [];
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < 13; i++) {
      const stand = R() < 0.18;
      P.push({
        s, d0: (i / 13) * PED_WIN + R() * 6, dir: R() < 0.5 ? 1 : -1, v: stand ? 0 : 1.05 + R() * 0.55,
        x: fx(s) * (stand ? 6.42 : 6.08 + R() * 0.3), t: Math.floor(R() * PED_TYPES.length), ph: R() * 6.28, stand,
      });
    }
  }
  return P;
}
const PED_WIN = 150;

/* ============================ parça (chunk) inşası ============================ */

const ASPH = C('#2b2e36');
const LINE = C('#f2f2ee');
const CURB = C('#9a9a98');
const WALK = C('#c8c3b8');

const fx = (s) => (s ? 1 : -1);
// Bina cephesine (yola bakan) dörtgen
function facadeQuad(mb, s, dA, dB, y0, y1, col, off = 0.03) {
  const x = fx(s) * (6.7 - off);
  mb.quad([x, y0, -dA], [x, y0, -dB], [x, y1, -dB], [x, y1, -dA], col, [fx(s) * 9, (y0 + y1) / 2, -(dA + dB) / 2]);
}
// Cepheden yola doğru çıkıntı yapan kutu
function facadeBox(mb, s, dA, dB, y0, y1, depth, col, off = 0) {
  const sx = fx(s);
  const xa = sx * (6.7 - off), xb = sx * (6.7 - off - depth);
  mb.box(Math.min(xa, xb), y0, -dB, Math.max(xa, xb), y1, -dA, col);
}
// Yazı dokusu: yoldan bakınca soldan sağa okunsun
function facadeSign(tb, s, dA, dB, y0, y1, uv, off) {
  const x = fx(s) * (6.7 - off);
  const cen = [fx(s) * 9, (y0 + y1) / 2, -(dA + dB) / 2];
  if (s === 0) tb.tquad([x, y0, -dA], [x, y0, -dB], [x, y1, -dB], [x, y1, -dA], uv[0], uv[1], uv[2], uv[3], cen);
  else tb.tquad([x, y0, -dB], [x, y0, -dA], [x, y1, -dA], [x, y1, -dB], uv[0], uv[1], uv[2], uv[3], cen);
}

function buildRoad(mb, d0, d1, W) {
  const R = KY.rng(((W.seed * 31) ^ (Math.floor(d0) * 7919)) >>> 0);
  for (let d = d0; d < d1; d += 10) {
    const c = shade(ASPH, 0.93 + R() * 0.12);
    mb.quad([-3.8, 0, -d], [3.8, 0, -d], [3.8, 0, -(d + 10)], [-3.8, 0, -(d + 10)], c, [0, -1, -d]);
    if (R() < 0.35) {
      const x = -3 + R() * 5, dd = d + R() * 7, w = 0.8 + R() * 1.6, l = 1 + R() * 2.5;
      mb.quad([x, 0.004, -dd], [x + w, 0.004, -dd], [x + w, 0.004, -(dd + l)], [x, 0.004, -(dd + l)], shade(ASPH, 0.8 + R() * 0.12), [0, -1, -dd]);
    }
    if (R() < 0.18) mb.disc(-2.3 + Math.floor(R() * 3) * 2.3 + 0.9, 0.006, -(d + R() * 8), 0.32, 0.32, 10, C('#3c3f47'));
  }
  const crossing = (d) => W.L.cross.some((c) => d > c - 9.4 && d < c + 7.2);
  for (let k = Math.ceil(d0 / 7) * 7; k < d1; k += 7) {
    if (crossing(k) || crossing(k + 3) || (k > -2 && k < 6) || (k > W.len - 4 && k < W.len + 3)) continue;
    [-1.15, 1.15].forEach((x) => mb.quad([x - 0.07, 0.012, -k], [x + 0.07, 0.012, -k], [x + 0.07, 0.012, -(k + 3)], [x - 0.07, 0.012, -(k + 3)], LINE, [0, -1, -k]));
  }
  for (let d = d0; d < d1; d += 10) {
    [-3.45, 3.45].forEach((x) => {
      let a = d, b = Math.min(d + 10, d1);
      W.L.cross.forEach((c) => { if (a < c + 7.2 && b > c - 7.2) { if (a >= c - 7.2) a = c + 7.2; else b = c - 7.2; } });
      if (b > a) mb.quad([x - 0.06, 0.011, -a], [x + 0.06, 0.011, -a], [x + 0.06, 0.011, -b], [x - 0.06, 0.011, -b], LINE, [0, -1, -a]);
    });
  }
}

function buildSidewalks(mb, d0, d1, W) {
  const segs = [];
  let a = d0;
  W.L.cross.filter((c) => c + 7.2 > d0 && c - 7.2 < d1).sort((x, y) => x - y).forEach((c) => {
    if (c - 7.2 > a) segs.push([a, c - 7.2]);
    a = Math.max(a, c + 7.2);
  });
  if (a < d1) segs.push([a, d1]);
  const stripe = (d) => d < 40 || (d > W.len - 40 && d < W.len + 30);
  segs.forEach(([p, q]) => {
    for (let s = 0; s < 2; s++) {
      const sx = fx(s);
      for (let d = p; d < q - 0.001; d += 2.5) {
        const e = Math.min(d + 2.5, q);
        const k = Math.floor(d / 2.5);
        const cc = stripe(d) ? (k % 2 ? C('#d7262b') : C('#f4f4f4')) : CURB;
        mb.box(Math.min(sx * 3.8, sx * 3.98), 0, -e, Math.max(sx * 3.8, sx * 3.98), 0.16, -d, { top: cc, side: shade(cc, 0.85) }, 'b');
        const wc = k % 2 ? WALK : shade(WALK, 0.95);
        mb.box(Math.min(sx * 3.98, sx * 6.72), 0, -e, Math.max(sx * 3.98, sx * 6.72), 0.14, -d, { top: wc, side: shade(wc, 0.85) }, 'bf');
      }
    }
  });
}

function buildCrossing(mb, c, W) {
  for (let s = 0; s < 2; s++) {
    const sx = fx(s);
    mb.quad([sx * 3.8, 0.001, -(c - 7.2)], [sx * 46, 0.001, -(c - 7.2)], [sx * 46, 0.001, -(c + 7.2)], [sx * 3.8, 0.001, -(c + 7.2)], shade(ASPH, 1.02), [0, -1, -c]);
    for (let x = 6; x < 46; x += 6) mb.quad([sx * x, 0.012, -(c - 0.08)], [sx * (x + 3), 0.012, -(c - 0.08)], [sx * (x + 3), 0.012, -(c + 0.08)], [sx * x, 0.012, -(c + 0.08)], C('#e8d24a'), [0, -1, -c]);
    // köşe kaldırımları (yan yolun iki yanı)
    [[c - 9.2, c - 7.2], [c + 7.2, c + 9.2]].forEach(([p, q]) => {
      mb.box(Math.min(sx * 6.72, sx * 46), 0, -q, Math.max(sx * 6.72, sx * 46), 0.14, -p, { top: WALK, side: shade(WALK, 0.85) }, 'b');
    });
    // trafik lambası
    const px = sx * 4.25, pd = c - 8.2;
    mb.cyl(px, 0, -pd, 0.07, 3.6, 0.07, 6, C('#3b3f46'));
    mb.box(px - 0.18, 2.6, -pd - 0.15, px + 0.18, 3.6, -pd + 0.15, C('#22252b'));
    mb.box(px - 0.1, 3.3, -pd + 0.15, px + 0.1, 3.48, -pd + 0.18, C('#521414'));
    mb.box(px - 0.1, 3.05, -pd + 0.15, px + 0.1, 3.23, -pd + 0.18, C('#4d3d10'));
    mb.box(px - 0.1, 2.8, -pd + 0.15, px + 0.1, 2.98, -pd + 0.18, C('#3dff7a', 1));
  }
  for (let x = -3.4; x < 3.4; x += 0.95) mb.quad([x, 0.013, -(c - 9.4)], [x + 0.5, 0.013, -(c - 9.4)], [x + 0.5, 0.013, -(c - 7.6)], [x, 0.013, -(c - 7.6)], LINE, [0, -1, -c]);
}

// Dükkân cephesi (sokak boyunca a..e): taş kaide (kapı önü açık) + eşik, koyu alüminyum doğrama, içi görünen vitrin camları
// (en çok 2 m'lik bölmeler) ve cam kapı, çoğunda çizgili tente, üstte koyu çerçeveli ışıklı tabela (yazı oranı korunur)
function shopFront(mb, tb, W, s, a, e, si, R) {
  const sx = fx(s);
  const k = ((si % SHOPS.length) + SHOPS.length) % SHOPS.length;
  const sh = SHOPS[k], sc = C(sh[1]), st = SHOP_INT[sh[0]] ?? 0;
  const dm = (a + e) / 2, d0 = dm - 0.55, d1 = dm + 0.55;
  const FR = C('#2c2f36', -0.5), STONE = C('#9c958b');
  facadeBox(mb, s, a, d0, 0, 0.55, 0.06, STONE);
  facadeBox(mb, s, d1, e, 0, 0.55, 0.06, STONE);
  facadeBox(mb, s, d0 - 0.1, d1 + 0.1, 0, 0.16, 0.3, C('#8f8a82'));
  facadeQuad(mb, s, a + 0.3, e - 0.3, 0.16, 2.74, FR, 0.02);
  const panes = [];
  const run = (z0, z1) => { const L = z1 - z0; if (L < 0.45) return; const n = Math.ceil(L / 2); for (let q = 0; q < n; q++) panes.push([z0 + (L * q) / n, z0 + (L * (q + 1)) / n]); };
  run(a + 0.4, d0 - 0.1); run(d1 + 0.1, e - 0.4);
  for (const [z0, z1] of panes) facadeSign(tb, s, z0 + 0.03, z1 - 0.03, 0.6, 2.62, intUV(st, (z1 - z0 - 0.06) / 2.02), 0.03);
  // cam kapı: içerisi görünür; ortada kayıt, krom kollar, üstte koyu vasistas
  facadeSign(tb, s, d0 + 0.07, d1 - 0.07, 0.18, 2.3, intUV(st, (d1 - d0 - 0.14) / 2.12), 0.03);
  facadeQuad(mb, s, dm - 0.016, dm + 0.016, 0.18, 2.3, FR, 0.034);
  facadeQuad(mb, s, d0 + 0.07, d1 - 0.07, 2.3, 2.36, FR, 0.034);
  facadeQuad(mb, s, d0 + 0.07, d1 - 0.07, 2.36, 2.64, [0.2, 0.26, 0.32, -0.9], 0.03);
  for (const q of [-1, 1]) facadeBox(mb, s, dm + q * 0.085 - 0.012, dm + q * 0.085 + 0.012, 0.95, 1.45, 0.07, C('#d9dde4', -0.9));
  // tente
  if (R() < 0.72) {
    const w = e - a, n = Math.max(3, Math.round((w - 0.6) / 0.6));
    for (let q = 0; q < n; q++) {
      const z0 = a + 0.3 + ((w - 0.6) / n) * q, z1 = z0 + (w - 0.6) / n;
      const cc = q % 2 ? WHITE : sc;
      const x0 = sx * 6.68, x1 = sx * 5.55;
      mb.quad([x0, 2.95, -z0], [x0, 2.95, -z1], [x1, 2.55, -z1], [x1, 2.55, -z0], cc, [sx * 7, 0, -(z0 + z1) / 2]);
      mb.quad([x1, 2.55, -z0], [x1, 2.55, -z1], [x1, 2.3, -(z0 + z1) / 2], [x1, 2.3, -z0], cc, [sx * 7, 2.4, -(z0 + z1) / 2]);
    }
  }
  // ışıklı tabela: A = genişlik / yükseklik en az 4, en çok 8 (dokudaki yazı hiç gerilmez ya da kesilmez)
  const Wf = e - a - 0.6;
  let H = clamp(Wf / 5, 0.6, 0.92);
  if (Wf / H < 4) H = Wf / 4;
  const sw = Math.min(Wf, H * 8), y0 = 3.08, y1 = y0 + H;
  facadeBox(mb, s, dm - sw / 2 - 0.06, dm + sw / 2 + 0.06, y0 - 0.06, y1 + 0.06, 0.16, C('#26292f', -0.5));
  facadeSign(tb, s, dm - sw / 2, dm + sw / 2, y0, y1, shopUV(k, sw / H), 0.165);
  if (W.wb) {
    // yağmurda: vitrin ışığı ıslak kaldırımda yola doğru uzanıp söner
    const zA = -(a + 0.55), zB = -(e - 0.55), Y = 0.146;
    const X0 = sx * 6.66, X1 = sx * 5.5, X2 = sx * 4.25;
    const c0 = [1, 0.84, 0.6, 0.34], c1 = [1, 0.84, 0.6, 0.12], c2 = [1, 0.84, 0.6, 0];
    W.wb.d.push(X0, Y, zA, ...c0, X1, Y, zA, ...c1, X1, Y, zB, ...c1, X0, Y, zA, ...c0, X1, Y, zB, ...c1, X0, Y, zB, ...c0);
    W.wb.d.push(X1, Y, zA, ...c1, X2, Y, zA, ...c2, X2, Y, zB, ...c2, X1, Y, zA, ...c1, X2, Y, zB, ...c2, X1, Y, zB, ...c1);
  }
}

function buildBuilding(mb, tb, b, s, W) {
  const R = KY.rng(b.seed >>> 0);
  const sx = fx(s);
  const dA = b.d, dB = b.d + b.w;
  const fh = 3.1;
  // dükkânlı binalarda zemin kat yüksek: vitrin + tente + ışıklı tabela bandı (üst kat pencereleri/cumba tabelaya binmez)
  const g0 = b.shop >= 0 ? 4.3 : fh;
  const fy = (f) => g0 + (f - 1) * fh;
  const h = fy(b.fl) + 0.9;
  const col = C(FACADES[b.col % FACADES.length]);
  const trim = shade(col, 0.82);
  const xa = sx * 6.7, xb = sx * (6.7 + b.dep);
  mb.box(Math.min(xa, xb), 0, -dB, Math.max(xa, xb), h, -dA, { top: C('#8d8a86'), side: col }, 'b');
  // köşe pilastırları + kat silmeleri + saçak (taş kaide zemin katta, kapıların önü açık)
  facadeBox(mb, s, dA, dA + 0.28, 0.55, h - 0.35, 0.07, trim);
  facadeBox(mb, s, dB - 0.28, dB, 0.55, h - 0.35, 0.07, trim);
  for (let f = 1; f < b.fl; f++) facadeBox(mb, s, dA, dB, fy(f) + 0.05, fy(f) + 0.2, 0.12, trim);
  facadeBox(mb, s, dA - 0.05, dB + 0.05, h - 0.35, h, 0.18, trim);
  facadeBox(mb, s, dA - 0.1, dB + 0.1, h - 0.12, h - 0.02, 0.32, shade(trim, 0.9));
  // pencereler: çerçeve, kayıt (haç), denizlik, lento; bazılarında panjur, çiçeklik, klima
  const n = Math.max(1, Math.floor((b.w - 0.8) / 2.3));
  const gap = b.w / n;
  const shutters = R() < 0.32 ? C(['#2f6b4a', '#3a5f8f', '#7a4a2a', '#5a6b3a'][Math.floor(R() * 4)]) : null;
  // cumba (İstanbul'un çıkma pencereleri): 3+ katlı, yeterince geniş binalarda
  const cumba = b.fl >= 3 && b.w >= 6.2 && R() < 0.42;
  const cA = (dA + dB) / 2 - 1.25, cB = cA + 2.5;
  for (let f = 1; f < b.fl; f++) {
    const y0 = fy(f) + 0.75, y1 = y0 + 1.45;
    const balcony = b.bal && f % 2 === 0 && n >= 2 && !cumba;
    for (let k = 0; k < n; k++) {
      const c0 = dA + gap * k + gap / 2 - 0.55, c1 = c0 + 1.1;
      if (cumba && c1 > cA - 0.15 && c0 < cB + 0.15) continue;
      const lit = R() < 0.55;
      const glass = lit ? [0.32 + R() * 0.2, 0.36 + R() * 0.1, 0.42 + R() * 0.1, 0.5] : [0.2, 0.27, 0.36, -0.9];
      facadeQuad(mb, s, c0 - 0.1, c1 + 0.1, y0 - 0.1, y1 + 0.1, WHITE, 0.02);
      facadeQuad(mb, s, c0, c1, y0, y1, glass, 0.03);
      const cm = (c0 + c1) / 2;
      facadeQuad(mb, s, cm - 0.03, cm + 0.03, y0, y1, WHITE, 0.035);
      facadeQuad(mb, s, c0, c1, y0 + 0.95, y0 + 1.0, WHITE, 0.035);
      facadeBox(mb, s, c0 - 0.14, c1 + 0.14, y0 - 0.2, y0 - 0.06, 0.2, WHITE);
      facadeBox(mb, s, c0 - 0.16, c1 + 0.16, y1 + 0.1, y1 + 0.24, 0.1, trim);
      if (!lit && R() < 0.4) facadeQuad(mb, s, c0 + 0.05, c1 - 0.05, y0 + 1.0, y1 - 0.02, C('#ede0c4'), 0.032); // perde
      if (shutters) {
        facadeBox(mb, s, c0 - 0.62, c0 - 0.14, y0 - 0.02, y1 + 0.02, 0.05, shutters);
        facadeBox(mb, s, c1 + 0.14, c1 + 0.62, y0 - 0.02, y1 + 0.02, 0.05, shutters);
        facadeQuad(mb, s, c0 - 0.6, c0 - 0.16, y0 + 0.7, y0 + 0.74, shade(shutters, 0.7), 0.055);
        facadeQuad(mb, s, c1 + 0.16, c1 + 0.6, y0 + 0.7, y0 + 0.74, shade(shutters, 0.7), 0.055);
      }
      const r2 = R();
      if (f <= 2 && r2 < 0.2) {
        // çiçeklik (sardunya)
        facadeBox(mb, s, c0 - 0.05, c1 + 0.05, y0 - 0.06, y0 + 0.16, 0.24, C('#a0522d'));
        for (let q = 0; q < 4; q++) {
          const z = -(c0 + 0.12 + q * 0.29);
          const xx = sx * (6.7 - 0.12);
          mb.sphereS(xx, y0 + 0.22, z, 0.11, 0.08, 0.11, q % 2 ? C('#e33a5a', -0.2) : C('#3f8f2e'), 6, 4);
        }
      } else if (r2 > 0.86) {
        // klima dış ünitesi
        const z0 = c1 + 0.2;
        facadeBox(mb, s, z0, z0 + 0.75, y0 + 0.1, y0 + 0.62, 0.32, C('#e9e9e6', -0.3));
        facadeQuad(mb, s, z0 + 0.1, z0 + 0.6, y0 + 0.18, y0 + 0.55, C('#9aa0a6'), 0.325);
      }
    }
    if (balcony) {
      const k0 = Math.floor(R() * (n - 1));
      const p0 = dA + gap * k0 + 0.25, p1 = dA + gap * (k0 + 2) - 0.25;
      facadeBox(mb, s, p0, p1, y0 - 0.45, y0 - 0.3, 0.75, C('#d9d6cf'));
      facadeBox(mb, s, p0, p1, y0 + 0.28, y0 + 0.35, 0.05, C('#4a4f57'), 0.7);
      for (let z = p0 + 0.05; z < p1 - 0.05; z += 0.14) facadeBox(mb, s, z, z + 0.025, y0 - 0.3, y0 + 0.3, 0.03, C('#4a4f57'), 0.71);
      facadeBox(mb, s, p0, p0 + 0.05, y0 - 0.3, y0 + 0.35, 0.75, C('#4a4f57'));
      facadeBox(mb, s, p1 - 0.05, p1, y0 - 0.3, y0 + 0.35, 0.75, C('#4a4f57'));
    }
  }
  if (cumba) {
    const y0 = fy(1) + 0.25, y1 = fy(b.fl) - 0.1;
    const D = 0.72;
    const ccol = shade(col, 1.04);
    facadeBox(mb, s, cA, cB, y0, y1, D, ccol);
    facadeBox(mb, s, cA - 0.06, cB + 0.06, y1, y1 + 0.16, D + 0.08, trim);
    facadeBox(mb, s, cA - 0.04, cB + 0.04, y0 - 0.14, y0, D + 0.04, trim);
    // destek konsolları
    [cA + 0.2, cB - 0.3].forEach((z) => facadeBox(mb, s, z, z + 0.1, y0 - 0.55, y0 - 0.14, D * 0.8, trim));
    for (let f = 1; f < b.fl; f++) {
      const wy0 = fy(f) + 0.75, wy1 = wy0 + 1.4;
      if (wy1 > y1) break;
      for (let k = 0; k < 2; k++) {
        const c0 = cA + 0.2 + k * 1.1, c1 = c0 + 0.95;
        facadeQuad(mb, s, c0 - 0.06, c1 + 0.06, wy0 - 0.06, wy1 + 0.06, WHITE, D + 0.01);
        facadeQuad(mb, s, c0, c1, wy0, wy1, R() < 0.5 ? [0.36, 0.38, 0.44, 0.5] : [0.2, 0.27, 0.36, -0.9], D + 0.02);
        facadeQuad(mb, s, c0, c1, wy0 + 0.92, wy0 + 0.97, WHITE, D + 0.025);
      }
      // yan pencereler (yola doğru açılı bakar)
      for (const zz of [cA, cB]) {
        const x0 = sx * (6.7 - 0.12), x1 = sx * (6.7 - D + 0.12);
        const zf = -(zz + (zz === cA ? -0.012 : 0.012));
        mb.quad([x0, wy0 + 0.1, zf], [x1, wy0 + 0.1, zf], [x1, wy1 - 0.1, zf], [x0, wy1 - 0.1, zf], [0.2, 0.27, 0.36, -0.9], [sx * 6.5, wy0, -(cA + cB) / 2]);
      }
    }
  }
  // zemin kat: dükkân(lar) ya da apartman girişi
  if (b.shop >= 0) {
    if (b.w >= 10.5) {
      const dm = (dA + dB) / 2;
      shopFront(mb, tb, W, s, dA, dm, b.shop, R);
      shopFront(mb, tb, W, s, dm, dB, b.shop + 11, R);
      facadeBox(mb, s, dm - 0.14, dm + 0.14, 0, g0 - 0.02, 0.08, trim);
    } else shopFront(mb, tb, W, s, dA, dB, b.shop, R);
  } else {
    const dm = (dA + dB) / 2;
    facadeBox(mb, s, dA, dm - 0.95, 0, 0.55, 0.06, C('#9c958b'));
    facadeBox(mb, s, dm + 0.95, dB, 0, 0.55, 0.06, C('#9c958b'));
    // apartman girişi: basamak, çift kanatlı kapı, saçak, lamba, numara
    facadeBox(mb, s, dm - 0.95, dm + 0.95, 0.14, 0.26, 0.45, C('#b8b2a8'));
    facadeBox(mb, s, dm - 0.75, dm + 0.75, 0.26, 2.45, 0.06, C('#6b4a33'));
    facadeQuad(mb, s, dm - 0.6, dm - 0.04, 1.4, 2.3, [0.3, 0.36, 0.42, -0.85], 0.07);
    facadeQuad(mb, s, dm + 0.04, dm + 0.6, 1.4, 2.3, [0.3, 0.36, 0.42, -0.85], 0.07);
    facadeBox(mb, s, dm - 0.9, dm + 0.9, 2.45, 2.6, 0.7, C('#e7e2d8'));
    facadeBox(mb, s, dm + 0.95, dm + 1.12, 2.0, 2.24, 0.12, C('#ffe2a6', 0.5));
    facadeBox(mb, s, dm - 1.25, dm - 0.98, 2.0, 2.2, 0.03, C('#1c4e9a'));
    for (let k = 0; k < 2; k++) {
      const c0 = k ? dB - 1.6 : dA + 0.5;
      if (c0 + 1.1 > dm - 1.2 && c0 < dm + 1.2) continue;
      facadeQuad(mb, s, c0 - 0.08, c0 + 1.18, 0.82, 2.28, WHITE, 0.02);
      facadeQuad(mb, s, c0, c0 + 1.1, 0.9, 2.2, R() < 0.5 ? [0.36, 0.38, 0.44, 0.5] : [0.25, 0.3, 0.36, -0.85], 0.03);
      for (let q = 0; q < 4; q++) facadeQuad(mb, s, c0 + 0.08 + q * 0.27, c0 + 0.11 + q * 0.27, 0.9, 2.2, C('#2c2f36'), 0.05);
    }
  }
  // çatı: kiremit (sırtlı) ya da düz çatı üstü (su deposu, anten, çanak, baca)
  const xr0 = Math.min(xa, xb), xr1 = Math.max(xa, xb);
  if (b.roof < 0.35) {
    const RC = C(b.roof < 0.17 ? '#b5523b' : '#8f4a3a');
    mb.frustum(xr0 - 0.25, xr1 + 0.25, -dB - 0.25, -dA + 0.25, h, xr0 + b.dep * 0.35, xr1 - b.dep * 0.35, -dB + 0.2, -dA - 0.2, h + 2.2, RC, shade(RC, 1.1));
    // kiremit sıraları (çatının yola bakan eğimi)
    const xe = sx > 0 ? xr0 - 0.25 : xr1 + 0.25, xt = sx > 0 ? xr0 + b.dep * 0.35 : xr1 - b.dep * 0.35;
    for (let q = 1; q < 6; q++) {
      const t = q / 6, xx = lerp(xe, xt, t) - sx * 0.02, yy = h + 2.2 * t + 0.02;
      mb.quad([xx, yy, -dB - 0.25 + 0.45 * t], [xx, yy, -dA + 0.25 - 0.45 * t], [xx - sx * 0.06, yy + 0.07, -dA + 0.25 - 0.45 * t], [xx - sx * 0.06, yy + 0.07, -dB - 0.25 + 0.45 * t], shade(RC, 0.8), [sx * 20, 0, -(dA + dB) / 2]);
    }
    if (R() < 0.5) {
      const zc = -(dA + b.w * (0.3 + R() * 0.4)), xc = (xr0 + xr1) / 2 + sx * 0.6;
      mb.box(xc - 0.3, h + 0.8, zc - 0.3, xc + 0.3, h + 3.1, zc + 0.3, C('#a8584a'));
      mb.box(xc - 0.38, h + 3.1, zc - 0.38, xc + 0.38, h + 3.22, zc + 0.38, C('#6b6b6b'));
    }
  } else {
    // korkuluk duvarı
    mb.box(xr0, h, -dB, xr1, h + 0.5, -dB + 0.12, trim);
    mb.box(xr0, h, -dA - 0.12, xr1, h + 0.5, -dA, trim);
    if (b.roof < 0.7) {
      // su deposu (ayaklı silindir)
      const xc = sx > 0 ? xr0 + 2.6 : xr1 - 2.6, zc = -dA - 1.3;
      [-0.4, 0.4].forEach((ox) => [-0.4, 0.4].forEach((oz) => mb.box(xc + ox - 0.04, h, zc + oz - 0.04, xc + ox + 0.04, h + 0.7, zc + oz + 0.04, C('#5b5f66'))));
      mb.lathe(xc, h + 0.7, zc, [[0, 0], [0.62, 0], [0.62, 1.1], [0.55, 1.2], [0, 1.24]], 14, C('#dcdcdc', -0.4));
    }
    if (b.roof > 0.55) {
      // anten + çanak
      const xc = (xr0 + xr1) / 2, zc = -(dA + b.w * 0.6);
      mb.cyl(xc, h, zc, 0.04, h + 3.2, 0.03, 5, C('#8a8f96'));
      for (let q = 0; q < 3; q++) mb.box(xc - 0.6 + q * 0.1, h + 2.2 + q * 0.35, zc - 0.02, xc + 0.6 - q * 0.1, h + 2.24 + q * 0.35, zc + 0.02, C('#8a8f96'));
      mb.push().T(xc + sx * 0.8, h + 0.9, zc - 0.8, sx * 0.6, 0.5);
      mb.lathe(0, 0, 0, [[0, 0], [0.32, 0.08], [0.42, 0.18], [0.4, 0.19], [0.3, 0.1], [0, 0.03]], 14, C('#f1f1f1', -0.4));
      mb.pop();
      mb.cyl(xc + sx * 0.8, h, zc - 0.8, 0.03, h + 0.95, 0.03, 5, C('#8a8f96'));
    }
  }
}

function buildLamp(mb, gb, l, wb) {
  const sx = fx(l.s);
  const x = sx * 4.25, z = -l.d;
  // kaide + konik direk + kavisli kol + armatür
  mb.lathe(x, 0.14, z, [[0, 0], [0.16, 0], [0.16, 0.25], [0.1, 0.32], [0.08, 0.32], [0.065, 6.0], [0, 6.0]], 10, C('#3b3f46', -0.4));
  for (let k = 0; k < 6; k++) {
    const t0 = k / 6, t1 = (k + 1) / 6;
    const P = (t) => [lerp(x, sx * 2.9, t), 6.0 + Math.sin(t * Math.PI * 0.8) * 0.28, z];
    const a = P(t0), b = P(t1);
    mb.box(Math.min(a[0], b[0]) - 0.03, Math.min(a[1], b[1]) - 0.035, z - 0.035, Math.max(a[0], b[0]) + 0.03, Math.max(a[1], b[1]) + 0.035, z + 0.035, C('#3b3f46', -0.4));
  }
  mb.rbox(sx * 2.75 - 0.34, 5.86, z - 0.2, sx * 2.75 + 0.34, 6.08, z + 0.2, 0.06, C('#2b2e34', -0.4), 2);
  mb.box(sx * 2.75 - 0.26, 5.8, z - 0.15, sx * 2.75 + 0.26, 5.86, z + 0.15, C('#ffe2a6', 0.5));
  gb.disc(sx * 2.75, 0.02, z, 3.6, 4.4, 18, [1, 0.8, 0.5, 0.5], [0, 0, 0, 0]);
  if (wb) {
    // ıslak asfaltta ışığın uzun yansıması: lambanın altından izleyiciye (+z) doğru uzanan, uçlara doğru sönen şerit
    const x0 = sx * 2.75, N = 10, L = 9;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const a0 = Math.pow(1 - t0, 1.6) * 0.75, a1 = Math.pow(1 - t1, 1.6) * 0.75;
      const w0 = 0.22 + t0 * 0.38, w1 = 0.22 + t1 * 0.38;
      const z0 = z + t0 * L, z1 = z + t1 * L;
      const C0 = [1, 0.82, 0.55, a0], C1 = [1, 0.82, 0.55, a1], E = [1, 0.82, 0.55, 0];
      wb.d.push(x0, 0.025, z0, ...C0, x0 - w0, 0.025, z0, ...E, x0 - w1, 0.025, z1, ...E, x0, 0.025, z0, ...C0, x0 - w1, 0.025, z1, ...E, x0, 0.025, z1, ...C1);
      wb.d.push(x0, 0.025, z0, ...C0, x0 + w1, 0.025, z1, ...E, x0 + w0, 0.025, z0, ...E, x0, 0.025, z0, ...C0, x0, 0.025, z1, ...C1, x0 + w1, 0.025, z1, ...E);
    }
  }
}

// Ağaç: demir ızgaralı çukur, hafif eğik gövde, gövdeden çatallanan dallar ve düzensiz yaprak kümeleri
// (her küme altta koyu, üstte açık; kümeler arası ton farkı) — tohumla her ağaç farklı
function buildTree(mb, t) {
  const sx = fx(t.s);
  const x = sx * 5.45, z = -t.d;
  mb.box(x - 0.55, 0.14, z - 0.55, x + 0.55, 0.16, z + 0.55, C('#5b4636'));
  for (let k = -2; k <= 2; k++) mb.box(x - 0.52, 0.16, z + k * 0.2 - 0.02, x + 0.52, 0.18, z + k * 0.2 + 0.02, C('#2e3036', -0.5));
  const R = KY.rng(((t.t + 1) * 7919 + Math.floor(t.d * 13)) >>> 0);
  const S = t.h, H = 2.45 * S + 0.35;
  const BARK = C('#6b4a2e');
  const top = [x + sx * 0.06 * S, 1.75 * S + 0.25, z + (R() - 0.5) * 0.12];
  limb(mb, [x, 0.12, z], top, [0.15, 0.125, 0.105, 0.088], BARK, 8, null, 1);
  const g = C(TREE_COLS[t.t % TREE_COLS.length]);
  const cl = [];
  const N = 7 + (t.t % 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + R() * 0.7;
    const rr = (0.45 + R() * 0.45) * S;
    cl.push([x + Math.cos(a) * rr, H - 0.35 * S + R() * 0.85 * S, z + Math.sin(a) * rr, (0.5 + R() * 0.3) * S]);
  }
  cl.push([x + (R() - 0.5) * 0.3, H + 0.5 * S, z + (R() - 0.5) * 0.3, 0.72 * S]);
  for (let i = 0; i < 4; i++) {
    const c = cl[(i * 2) % N];
    limb(mb, top, [lerp(top[0], c[0], 0.72), lerp(top[1], c[1], 0.72), lerp(top[2], c[2], 0.72)], [0.062, 0.034], BARK, 6, null, 1);
  }
  for (const [bx, by, bz, r] of cl) {
    const tint = 0.88 + R() * 0.24, warm = R() * 0.08;
    mb.sphereS(bx, by, bz, r, r * 0.8, r, null, 10, 7, (nx, ny) => {
      const k = (0.6 + 0.5 * (ny * 0.5 + 0.5)) * tint;
      return [Math.min(1, g[0] * k + warm * 0.5), Math.min(1, g[1] * k + warm * 0.3), g[2] * k * 0.94, -0.12];
    });
  }
}

// Sokak kedisi (oturan): tabby turuncu / siyah / gri-beyaz
function catModel(mb, x, z, yaw, k) {
  const cols = [['#e08a3c', '#f5c27a'], ['#2a2a2e', '#4a4a50'], ['#9a9aa2', '#f2f2f2']][k % 3];
  const A = C(cols[0], -0.15), B = C(cols[1], -0.15);
  mb.push().T(x, 0.14, z, yaw);
  mb.sphereS(0, 0.17, 0, 0.13, 0.17, 0.16, null, 12, 8, (nx, ny, nz) => (nz > 0.5 && ny < 0.3 ? B : A));
  mb.sphereS(0, 0.4, 0.06, 0.1, 0.09, 0.09, A, 12, 8);
  mb.sphereS(0, 0.38, 0.14, 0.05, 0.035, 0.03, B, 8, 5);
  for (const s of [-1, 1]) {
    mb.push().T(s * 0.055, 0.48, 0.05, 0, -0.2, -s * 0.25);
    mb.cyl(0, 0, 0, 0.035, 0.07, 0.0, 6, A);
    mb.pop();
    mb.sphereS(s * 0.035, 0.42, 0.135, 0.014, 0.016, 0.008, C('#a8d84a', 0.5), 6, 4);
    mb.sphereS(s * 0.05, 0.03, 0.12, 0.04, 0.03, 0.05, B, 8, 5);
  }
  // kuyruk (kıvrık)
  for (let q = 0; q < 6; q++) {
    const a = q / 5;
    mb.sphereS(Math.sin(a * 2.2) * 0.14 + 0.05, 0.04 + a * 0.06, -0.12 - Math.cos(a * 2.2) * 0.06, 0.03, 0.03, 0.03, q > 3 ? B : A, 6, 4);
  }
  mb.pop();
}

function buildProp(mb, tb, p) {
  const sx = fx(p.s);
  const x = sx * 5.6, z = -p.d;
  if (p.k === 0) { // bank (yuvarlak hatlı) + bazen üstünde kedi
    [-0.86, 0.86].forEach((dz) => mb.rbox(x - 0.25, 0.14, z + dz - 0.05, x + 0.25, 0.56, z + dz + 0.05, 0.03, C('#3b3f46', -0.4), 2));
    for (let q = 0; q < 3; q++) mb.rbox(x - 0.3 + q * 0.2, 0.54, z - 1.0, x - 0.14 + q * 0.2, 0.6, z + 1.0, 0.02, C('#9c6b3c', -0.2), 2);
    for (let q = 0; q < 2; q++) mb.rbox(sx > 0 ? x + 0.2 : x - 0.3, 0.7 + q * 0.18, z - 1.0, sx > 0 ? x + 0.3 : x - 0.2, 0.84 + q * 0.18, z + 1.0, 0.02, C('#9c6b3c', -0.2), 2);
    if ((p.d | 0) % 3 === 0) catModel(mb, x, z + 0.4, sx > 0 ? -Math.PI / 2 : Math.PI / 2, p.d | 0);
  } else if (p.k === 1) { // çöp kutusu (kapaklı) + yanında kedi
    mb.lathe(x, 0.14, z, [[0, 0], [0.27, 0], [0.3, 0.8], [0.32, 0.86], [0, 0.86]], 12, C('#2f7d4a', -0.3));
    mb.lathe(x, 1.0, z, [[0, 0], [0.33, 0], [0.33, 0.06], [0.2, 0.16], [0, 0.18]], 12, C('#25603a', -0.3));
    catModel(mb, x, z + 0.75, sx > 0 ? -Math.PI / 2.3 : Math.PI / 2.3, (p.d | 0) + 1);
  } else if (p.k === 2) { // büfe
    const xb = sx * 5.2;
    mb.rbox(xb - 1.1, 0.14, z - 1.3, xb + 1.1, 2.3, z + 1.3, 0.08, C('#e9e4da', -0.2), 2);
    mb.box(xb - 1.25, 2.3, z - 1.45, xb + 1.25, 2.5, z + 1.45, C('#d32f2f'));
    const xf = sx > 0 ? xb - 1.11 : xb + 1.11;
    mb.quad([xf, 0.9, z - 0.9], [xf, 0.9, z + 0.9], [xf, 1.9, z + 0.9], [xf, 1.9, z - 0.9], [0.62, 0.56, 0.44, 0.5], [xb, 1.4, z]);
    for (let q = 0; q < 8; q++) mb.box(xf - sx * 0.02, 1.0 + (q % 2) * 0.42, z - 0.85 + Math.floor(q / 2) * 0.43, xf - sx * 0.08, 1.3 + (q % 2) * 0.42, z - 0.5 + Math.floor(q / 2) * 0.43, C(['#e8c33a', '#3a8fd6', '#d8402a', '#f2f2f2'][q % 4]));
    const uv = bannerUV(BANNER.kiosk);
    const xs = sx > 0 ? xb - 1.27 : xb + 1.27;
    if (sx < 0) tb.tquad([xs, 2.3, z + 1.3], [xs, 2.3, z - 1.3], [xs, 2.9, z - 1.3], [xs, 2.9, z + 1.3], uv[0], uv[1], uv[2], uv[3], [xb, 2.6, z]);
    else tb.tquad([xs, 2.3, z - 1.3], [xs, 2.3, z + 1.3], [xs, 2.9, z + 1.3], [xs, 2.9, z - 1.3], uv[0], uv[1], uv[2], uv[3], [xb, 2.6, z]);
    mb.box(xb - 1.25, 2.3, z - 1.45, xb + 1.25, 2.95, z + 1.45, C('#b71c1c'), 'tb');
  } else if (p.k === 3) { // durak
    const xb = sx * 5.5;
    mb.box(xb - 0.75, 0.14, z - 1.9, xb + 0.75, 0.2, z + 1.9, C('#8a8f96'));
    [-1.8, 1.8].forEach((dz) => mb.rbox(xb - 0.05, 0.2, z + dz - 0.05, xb + 0.05, 2.5, z + dz + 0.05, 0.03, C('#3b3f46', -0.4), 2));
    mb.rbox(xb - 0.85, 2.5, z - 2.0, xb + 0.85, 2.64, z + 2.0, 0.04, C('#0b57d0', -0.3), 2);
    const xg = sx > 0 ? xb + 0.7 : xb - 0.7;
    mb.quad([xg, 0.4, z - 1.8], [xg, 0.4, z + 1.8], [xg, 2.4, z + 1.8], [xg, 2.4, z - 1.8], [0.55, 0.7, 0.8, -0.9], [xb, 1.4, z]);
    mb.rbox(xb - 0.3, 0.2, z - 1.2, xb + 0.3, 0.62, z + 1.2, 0.04, C('#9c6b3c', -0.2), 2);
    // durak tabelası: çatının üstünde, yola bakan ışıklı kutu (doku oranında: 1.51 × 0.36)
    const uv = bannerUV(BANNER.stop);
    mb.box(xb - 0.05, 2.64, z - 0.82, xb + 0.05, 3.1, z + 0.82, C('#1f2228'));
    const xs = xb - sx * 0.052;
    if (sx < 0) tb.tquad([xs, 2.7, z + 0.756], [xs, 2.7, z - 0.756], [xs, 3.06, z - 0.756], [xs, 3.06, z + 0.756], uv[0], uv[1], uv[2], uv[3], [xb, 2.88, z]);
    else tb.tquad([xs, 2.7, z - 0.756], [xs, 2.7, z + 0.756], [xs, 3.06, z + 0.756], [xs, 3.06, z - 0.756], uv[0], uv[1], uv[2], uv[3], [xb, 2.88, z]);
  } else if (p.k === 4) { // simit tezgâhı (kırmızı araba, cam vitrin, simitler)
    const xb = sx * 5.4;
    mb.push().T(xb, 0.14, z, Math.PI / 2);
    [[-0.5, 0.42], [0.5, 0.42]].forEach(([dx, r]) => wheel(mb, dx, r, 0, r, 0.08, C('#d8dbe2', -0.8)));
    mb.rbox(-0.7, 0.45, -0.42, 0.7, 1.05, 0.42, 0.06, C('#c62828', -0.4), 2);
    mb.quad([-0.62, 1.05, -0.36], [0.62, 1.05, -0.36], [0.62, 1.55, -0.3], [-0.62, 1.55, -0.3], [0.7, 0.8, 0.85, -0.9], [0, 1.3, 0]);
    mb.quad([-0.62, 1.05, 0.36], [0.62, 1.05, 0.36], [0.62, 1.55, 0.3], [-0.62, 1.55, 0.3], [0.7, 0.8, 0.85, -0.9], [0, 1.3, 0]);
    mb.rbox(-0.72, 1.55, -0.38, 0.72, 1.62, 0.38, 0.03, C('#c62828', -0.4), 2);
    for (let q = 0; q < 9; q++) mb.torusN(-0.45 + (q % 3) * 0.45, 1.1 + Math.floor(q / 3) * 0.12, 0, 0.11, 0.04, 0.035, 12, 6, C('#c27a35', -0.2), (a, bb) => (Math.sin(bb) > 0.3 && Math.sin(a * 7) > 0 ? C('#f0e0b0') : C('#c27a35', -0.2)));
    mb.cyl(0.62, 1.62, 0, 0.02, 2.3, 0.02, 5, C('#8a8f96'));
    mb.lathe(0.62, 2.1, 0, [[0, 0], [0.75, 0.0], [0.7, 0.06], [0, 0.32]], 10, (i, a) => (Math.floor(a * 4) % 2 ? C('#f2f2f2') : C('#c62828')));
    mb.pop();
  } else if (p.k === 5) { // saksılar
    [-0.9, 0.9].forEach((dz) => {
      mb.rbox(x - 0.4, 0.14, z + dz - 0.4, x + 0.4, 0.75, z + dz + 0.4, 0.06, C('#b9b3a8', -0.15), 2);
      for (let q = 0; q < 7; q++) {
        const a = q * 0.9;
        mb.sphereS(x + Math.cos(a) * 0.2, 0.85 + (q % 3) * 0.06, z + dz + Math.sin(a) * 0.2, 0.15, 0.13, 0.15, q % 2 ? C('#3f8f2e') : C('#e33a5a'), 8, 5);
      }
    });
  } else { // kedi + mama kabı
    catModel(mb, x - sx * 0.3, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, p.d | 0);
    mb.lathe(x + sx * 0.05, 0.14, z + 0.35, [[0, 0], [0.1, 0], [0.12, 0.05], [0.09, 0.05], [0, 0.04]], 10, C('#3a8fd6', -0.5));
  }
}

// Kaldırım taşı derzleri, kaldırım kenarı babaları, yağmur ızgaraları
function buildStreetDetails(mb, d0, d1, W) {
  const inCross = (d) => W.L.cross.some((c) => d > c - 9.4 && d < c + 9.4);
  const R = KY.rng(((W.seed * 131) ^ (Math.floor(d0) * 104729)) >>> 0);
  for (let s = 0; s < 2; s++) {
    const sx = fx(s);
    // derzler: 0.6 m'de bir enine çizgi + iki boyuna çizgi
    for (let d = Math.ceil(d0 / 0.6) * 0.6; d < d1; d += 0.6) {
      if (inCross(d)) continue;
      mb.quad([sx * 3.98, 0.143, -d], [sx * 6.7, 0.143, -d], [sx * 6.7, 0.143, -(d + 0.03)], [sx * 3.98, 0.143, -(d + 0.03)], C('#a29d93'), [0, -1, -d]);
    }
    [4.9, 5.8].forEach((xx) => {
      let a = d0;
      while (a < d1) {
        let b = Math.min(d1, a + 10);
        if (inCross(a) || inCross(b)) { a = b; continue; }
        mb.quad([sx * xx, 0.143, -a], [sx * (xx + 0.03), 0.143, -a], [sx * (xx + 0.03), 0.143, -b], [sx * xx, 0.143, -b], C('#a29d93'), [0, -1, -a]);
        a = b;
      }
    });
    // babalar (bazı kesimlerde)
    for (let d = Math.ceil(d0 / 12) * 12; d < d1; d += 12) {
      if (R() < 0.45 || inCross(d) || inCross(d + 10)) continue;
      for (let q = 0; q < 6; q++) {
        const dd = d + q * 1.7;
        mb.lathe(sx * 4.18, 0.14, -dd, [[0, 0], [0.09, 0], [0.09, 0.62], [0.07, 0.72], [0, 0.75]], 8, (i) => (i === 2 ? C('#f2f2f2', -0.3) : C('#2a2c32', -0.4)));
      }
    }
    // yağmur ızgaraları (kaldırım dibinde)
    for (let d = Math.ceil(d0 / 17) * 17 + 5; d < d1; d += 17) {
      if (inCross(d)) continue;
      mb.box(sx * 3.35, 0.004, -(d + 0.9), sx * 3.78 * (sx > 0 ? 1 : 1), 0.012, -d, C('#1d1e22'));
      for (let q = 0; q < 6; q++) mb.box(sx * 3.37 - 0.01, 0.012, -(d + 0.1 + q * 0.13), sx * 3.76 + 0.01, 0.016, -(d + 0.06 + q * 0.13), C('#3a3c42', -0.4));
    }
  }
  // yolda çatlaklar ve yağ lekeleri
  for (let d = d0; d < d1; d += 6) {
    if (R() < 0.3) {
      const x = -3.2 + R() * 6.4, dd = d + R() * 5, L2 = 0.6 + R() * 1.8, a = R() * Math.PI;
      const cx = Math.cos(a) * L2 / 2, cz = Math.sin(a) * L2 / 2;
      mb.quad([x - cx - 0.015, 0.008, -(dd - cz)], [x - cx + 0.015, 0.008, -(dd - cz)], [x + cx + 0.015, 0.008, -(dd + cz)], [x + cx - 0.015, 0.008, -(dd + cz)], C('#1c1d22'), [0, -1, -dd]);
    }
    if (R() < 0.12) mb.disc(-2.4 + R() * 4.8, 0.007, -(d + R() * 5), 0.4 + R() * 0.3, 0.3 + R() * 0.3, 10, C('#25262c', -0.3));
  }
}


function buildBillboard(mb, tb, b) {
  const sx = fx(b.s);
  const x = sx * 5.7, z = -b.d;
  mb.cyl(x, 0.14, z, 0.14, 4.0, 0.12, 8, C('#4a4f57'));
  mb.push().T(x, 4.0, z, sx * 0.55);
  // pano: dokunun oranında (4.2 : 1), yazı gerilmez
  mb.box(-0.12, 0, -2.45, 0.12, 1.34, 2.45, C('#22252b'));
  const uv = bannerUV(BANNER.brand);
  if (sx < 0) tb.push().T(x, 4.0, z, sx * 0.55).tquad([0.125, 0.12, 2.31], [0.125, 0.12, -2.31], [0.125, 1.22, -2.31], [0.125, 1.22, 2.31], uv[0], uv[1], uv[2], uv[3], [-1, 1, 0]).pop();
  else tb.push().T(x, 4.0, z, sx * 0.55).tquad([-0.125, 0.12, -2.31], [-0.125, 0.12, 2.31], [-0.125, 1.22, 2.31], [-0.125, 1.22, -2.31], uv[0], uv[1], uv[2], uv[3], [1, 1, 0]).pop();
  mb.pop();
}

// Yolu kesen tabela köprüsü (BAŞLA / 750 m / yarı yol / son 250 m)
function buildGantry(mb, tb, d, banner, color = '#3b3f46') {
  const z = -d;
  [-1, 1].forEach((s) => {
    mb.box(s * 4.4 - 0.2, 0, z - 0.2, s * 4.4 + 0.2, 5.6, z + 0.2, C(color));
    mb.box(s * 4.4 - 0.35, 0, z - 0.35, s * 4.4 + 0.35, 0.4, z + 0.35, C('#8a8f96'));
  });
  mb.box(-4.6, 5.0, z - 0.25, 4.6, 5.5, z + 0.25, C(color));
  mb.box(-2.82, 5.5, z - 0.12, 2.82, 6.95, z + 0.08, C('#1f2228'));
  const uv = bannerUV(banner);
  tb.tquad([-2.71, 5.58, z + 0.09], [2.71, 5.58, z + 0.09], [2.71, 6.87, z + 0.09], [-2.71, 6.87, z + 0.09], uv[0], uv[1], uv[2], uv[3], [0, 6, z - 1]);
}

function buildStart(mb, tb, W) {
  // başlangıç çizgisi (dama)
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 2; j++) {
      const x0 = -3.8 + i * 0.475, d0 = -0.475 + j * 0.475;
      mb.quad([x0, 0.014, -d0], [x0 + 0.475, 0.014, -d0], [x0 + 0.475, 0.014, -(d0 + 0.475)], [x0, 0.014, -(d0 + 0.475)], (i + j) % 2 ? C('#111111') : C('#f5f5f5'), [0, -1, 0]);
    }
  }
  buildGantry(mb, tb, 5, BANNER.start, '#1c1633');
  [-1.3, 0, 1.3].forEach((x) => mb.box(x - 0.3, 4.15, -5 - 0.22, x + 0.3, 5.0, -5 + 0.22, C('#15161c')));
  // restoran (sağda): işletmenin rengi + tabela
  const dA = -22, dB = 10.5;
  const P = C(W.brand.boxHex);
  mb.box(6.7, 0, -dB, 18, 7.4, -dA, { top: C('#8d8a86'), side: P }, 'b');
  facadeBox(mb, 1, dA, dB, 6.9, 7.4, 0.25, shade(P, 0.8));
  facadeQuad(mb, 1, dA + 1, dB - 1, 0.15, 3.0, [0.32, 0.36, 0.42, 0.5], 0.03);
  for (let k = 0; k < 5; k++) facadeQuad(mb, 1, dA + 1.2 + k * 6.4, dA + 1.3 + k * 6.4, 0.15, 3.0, C('#1f2228'), 0.04);
  for (let k = 0; k < 14; k++) {
    const a = dA + 0.5 + k * 2.25, e = a + 2.25;
    const cc = k % 2 ? WHITE : C(W.brand.accentHex);
    mb.quad([6.68, 3.55, -a], [6.68, 3.55, -e], [5.2, 3.1, -e], [5.2, 3.1, -a], cc, [7, 0, -(a + e) / 2]);
  }
  // iki tabela yan yana: doku oranı korunur (504×120 → genişlik = 4.2 × yükseklik), yazı gerilmez
  for (const z0 of [-12, -1.03]) {
    facadeBox(mb, 1, z0 - 0.15, z0 + 9.18, 4.0, 6.35, 0.2, C('#1f2228'));
    facadeSign(tb, 1, z0, z0 + 9.03, 4.1, 6.25, bannerUV(BANNER.brand), 0.215);
  }
}

function buildFinish(mb, tb, W) {
  const L = W.len, z = -L;
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 2; j++) {
      const x0 = -3.8 + i * 0.475, d0 = L - 0.475 + j * 0.475;
      mb.quad([x0, 0.014, -d0], [x0 + 0.475, 0.014, -d0], [x0 + 0.475, 0.014, -(d0 + 0.475)], [x0, 0.014, -(d0 + 0.475)], (i + j) % 2 ? C('#111111') : C('#f5f5f5'), [0, -1, z]);
    }
  }
  const B = C(W.brand.boxHex);
  [-1, 1].forEach((s) => {
    mb.box(s * 4.5 - 0.35, 0, z - 0.35, s * 4.5 + 0.35, 6.4, z + 0.35, { top: B, side: B });
    for (let k = 0; k < 6; k++) mb.box(s * 4.5 - 0.36, 0.6 + k * 0.9, z - 0.36, s * 4.5 + 0.36, 1.05 + k * 0.9, z + 0.36, k % 2 ? C('#111111') : C('#f5f5f5'));
    // balonlar
    ['#ff3b30', '#ffd60a', '#0a84ff', '#30d158'].forEach((bc, k) => {
      const bx = s * (5.0 + (k % 2) * 0.45), by = 6.6 + k * 0.55, bz = z + (k - 1.5) * 0.4;
      mb.cyl(bx, 6.3, bz, 0.01, by - 0.35, 0.01, 3, C('#dddddd'));
      mb.sphere(bx, by, bz, 0.38, 0.45, 0.38, C(bc), 1, (v) => (v[1] > 0.4 ? shade(C(bc), 1.18) : C(bc)));
    });
  });
  mb.box(-4.9, 5.4, z - 0.4, 4.9, 6.9, z + 0.4, C('#1f2228'));
  // ortada pankart (doku oranında: 5.46 × 1.3), iki yanda dama bayrak deseni
  const uv = bannerUV(BANNER.finish);
  tb.tquad([-2.73, 5.5, z + 0.41], [2.73, 5.5, z + 0.41], [2.73, 6.8, z + 0.41], [-2.73, 6.8, z + 0.41], uv[0], uv[1], uv[2], uv[3], [0, 6, z - 1]);
  tb.tquad([2.73, 5.5, z - 0.41], [-2.73, 5.5, z - 0.41], [-2.73, 6.8, z - 0.41], [2.73, 6.8, z - 0.41], uv[0], uv[1], uv[2], uv[3], [0, 6, z + 1]);
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const xa = sd * (2.85 + i * 0.317), xb = sd * (2.85 + (i + 1) * 0.317), ya = 5.5 + j * 0.433, yb = ya + 0.433;
        const cc = (i + j) % 2 ? C('#111111') : C('#f5f5f5');
        for (const zz of [z + 0.405, z - 0.405]) mb.quad([xa, ya, zz], [xb, ya, zz], [xb, yb, zz], [xa, yb, zz], cc, [0, 6, z]);
      }
    }
  }
}

function buildSkyline(mb, tod, seed) {
  const R = KY.rng((seed * 13 + 7) >>> 0);
  const col = C(tod.skyline);
  for (let i = 0; i < 46; i++) {
    const a = -1.45 + (i / 45) * 2.9 + (R() - 0.5) * 0.04;
    const r = 250 + R() * 60;
    const w = 14 + R() * 26, h = 22 + R() * 70;
    const cx = Math.sin(a) * r, cz = -Math.cos(a) * r;
    mb.push().T(cx, 0, cz, -a);
    mb.box(-w / 2, -5, -6, w / 2, h, 6, { top: shade(col, 1.1), side: col });
    if (tod.night > 0.9) {
      for (let k = 0; k < 10; k++) {
        if (R() < 0.45) continue;
        const wx = -w / 2 + 2 + R() * (w - 4), wy = 4 + R() * (h - 8);
        mb.quad([wx, wy, 6.05], [wx + 1.2, wy, 6.05], [wx + 1.2, wy + 1.6, 6.05], [wx, wy + 1.6, 6.05], [0.5, 0.5, 0.5, 0.5], [wx, wy, 0]);
      }
    }
    if (R() < 0.25) mb.cyl(0, h, 0, 0.6, h + 14 + R() * 18, 0.1, 6, col);
    mb.pop();
  }
  // İstanbul silueti: kubbeli camiler ve minareler, taş kule (sivri külahlı)
  const dark = shade(col, 0.92);
  const mosque = (a, r, s) => {
    const cx = Math.sin(a) * r, cz = -Math.cos(a) * r;
    mb.push().T(cx, 0, cz, -a, 0, 0, s);
    mb.box(-30, -5, -22, 30, 22, 22, dark);
    mb.lathe(0, 22, 0, [[17, 0], [17, 6], [16, 11], [12, 18], [6.5, 21.5], [0, 23]], 18, dark);
    mb.lathe(0, 45, 0, [[1.4, 0], [1.2, 4], [0, 5]], 8, dark);
    [[-22, 1], [22, 1]].forEach(([dx]) => mb.lathe(dx, 22, 0, [[9, 0], [9, 3], [7, 6.5], [3.5, 8.5], [0, 9]], 14, dark));
    [[-30, -22], [30, -22], [-30, 22], [30, 22]].forEach(([mx, mz]) => {
      mb.cyl(mx, -5, mz, 2.1, 62, 1.6, 8, dark);
      mb.lathe(mx, 44, mz, [[2.9, 0], [2.9, 1.2], [1.8, 1.4]], 8, dark);
      mb.lathe(mx, 62, mz, [[1.8, 0], [0.0, 9]], 8, dark);
    });
    mb.pop();
  };
  mosque(-0.62, 300, 1.0);
  mosque(0.78, 330, 0.85);
  // taş kule (Galata benzeri)
  {
    const a = 0.12, r = 285;
    const cx = Math.sin(a) * r, cz = -Math.cos(a) * r;
    mb.lathe(cx, -5, cz, [[9, 0], [8.6, 50], [10, 52], [10, 55], [8.4, 56], [8.4, 63], [9.6, 64], [0, 82]], 14, dark);
  }
  if (tod.clouds) {
    const cc = C(tod.clouds);
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + R() * 2.4, r = 240 + R() * 50, y = 70 + R() * 50;
      const cx = Math.sin(a) * r, cz = -Math.cos(a) * r;
      for (let k = 0; k < 4; k++) mb.sphereS(cx + (k - 1.5) * 9, y + (k % 2) * 3, cz + (R() - 0.5) * 8, 9 + R() * 6, 4 + R() * 2.5, 7, k % 2 ? cc : shade(cc, 0.95), 12, 7);
    }
  }
}

/* ============================ kaynaklar ============================ */

const FOODS = {
  'chicken-rice-crush': ['drum', 'rice'],
  'fried-chiko': ['drum'],
  'los-bravos': ['burger', 'drum'],
  springfield: ['wrap'],
  'durum-max': ['wrap'],
  eliz: ['waffle', 'cup'],
  nfc: ['box'],
};
const FOOD_EMOJI = { drum: '🍗', rice: '🍚', burger: '🍔', wrap: '🌯', box: '📦', waffle: '🧇', cup: '🍨' };
const FOOD_NAME = { drum: 'tavuk', rice: 'pilav', burger: 'burger', wrap: 'dürüm', box: 'paket', waffle: 'waffle', cup: 'kup' };

function brandInfo(ctx) {
  const t = ctx.theme || null;
  let cs = null;
  try { cs = getComputedStyle(document.documentElement); } catch { cs = null; }
  const v = (k, d) => {
    const raw = (cs?.getPropertyValue(`--c-${k}`) || '').trim();
    const a = (raw || d).split(/[\s,]+/).map(Number);
    return a.length >= 3 && a.slice(0, 3).every((x) => Number.isFinite(x)) ? a.slice(0, 3) : d.split(' ').map(Number);
  };
  const hex2 = (a) => `#${a.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
  const gece = t?.vars?.gece ? t.vars.gece.split(' ').map(Number) : v('gece', '28 22 51');
  const limon = t?.vars?.limon ? t.vars.limon.split(' ').map(Number) : v('limon', '255 210 63');
  const lum = (a) => (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255;
  const box = t ? gece : limon;
  return {
    slug: t?.slug || 'nfc',
    name: t?.name || 'NFC DÜNYASI',
    logo: t?.logo || null,
    round: t ? t.shape !== 'wide' : true,
    arena: t?.arena || null, // panelden eklenen temalar: 3D masa ortamının renkleri
    boxHex: hex2(box),
    accentHex: hex2(limon),
    css: hex2(box),
    box: hex2(box),
    ink: lum(box) > 0.6 ? '#1c1633' : '#ffffff',
    foods: FOODS[t?.slug] || FOODS.nfc,
    // tabakta / çorbada süs olacak yiyecekler (paket değil)
    dishes: (FOODS[t?.slug] || []).filter((f) => f !== 'box').length ? (FOODS[t?.slug] || []).filter((f) => f !== 'box') : ['burger', 'drum', 'wrap', 'rice'],
  };
}

class Res {
  constructor(X, brand) {
    this.X = X;
    this.brand = brand;
    this.logoCv = document.createElement('canvas');
    this.logoCv.width = 256; this.logoCv.height = 256;
    this.img = null;
    drawLogo(this.logoCv, brand, null);
    this.logo = makeTexture(X, this.logoCv);
    this.redraw = () => {
      if (!this.X || this.X.gl.isContextLost()) return;
      if (this.atlas) { drawAtlas(this.atlasCv, brand, this.img); updateTexture(X, this.atlas, this.atlasCv); }
      drawLogo(this.logoCv, brand, this.img);
      updateTexture(X, this.logo, this.logoCv);
    };
    if (brand.logo) {
      const im = new Image();
      im.onload = () => { this.img = im; this.redraw(); };
      im.src = brand.logo;
    }
    try { document.fonts?.ready?.then(() => this.redraw()); } catch { /* yok say */ }
    const mk = (fn, kind = 'lit') => { const mb = new MB(kind); fn(mb); return mb.build(X); };
    this.mk = mk;
    this.scoot = [];
    this.food = {};
    ['drum', 'rice', 'burger', 'wrap', 'box', 'waffle', 'cup'].forEach((k) => { this.food[k] = mk((mb) => foodModel(mb, k, brand.boxHex)); });
    this.shadow = mk(shadowDisc, 'un');
    this.glow = mk(glowDisc, 'un');
    this.flame = mk(flameModel);
    this.light = mk((mb) => mb.sphere(0, 0, 0, 0.26, 0.26, 0.12, C('#ffffff', 1), 1));
  }
  // Kurye Yarışı'na özgü kaynaklar (tabela/vitrin dokusu, araçlar, engeller): yalnızca o oyun kurar
  kurye() {
    if (this.atlas) return this;
    const X = this.X, mk = this.mk;
    this.atlasCv = document.createElement('canvas');
    this.atlasCv.width = 1024; this.atlasCv.height = 2048;
    drawAtlas(this.atlasCv, this.brand, this.img);
    this.atlas = makeTexture(X, this.atlasCv);
    this.decal = mk(boxDecal, 'tex');
    this.cars = CAR_COLORS.map((c) => mk((mb) => carModel(mb, c)));
    this.taxi = mk((mb) => carModel(mb, '#ffcf1f', true));
    this.vans = ['#f2f2f2', '#2f6fd6', '#d94a2b'].map((c) => mk((mb) => vanModel(mb, c)));
    this.buses = ['#e8562a', '#1d7bd8'].map((c) => mk((mb) => busModel(mb, c)));
    this.cone = mk(coneModel);
    this.barrier = mk(barrierModel);
    this.puddles = [11, 22, 33].map((sd) => mk((mb) => puddleModel(mb, KY.rng(sd))));
    this.ramp = mk(rampModel);
    this.pad = mk(padModel);
    return this;
  }
  ped(k) {
    this._ped = this._ped || [];
    if (!this._ped[k]) {
      const t = PED_TYPES[k], mk = (fn) => { const mb = new MB(); fn(mb, t); return mb.build(this.X); };
      this._ped[k] = { body: mk(pedBody), leg: mk(pedLeg), arm: mk(pedArm) };
    }
    return this._ped[k];
  }
  // şemsiye (yağmurlu gecede yayalar için): dilimli kubbe, uçlarda hafif sarkma, ince sap ve kıvrık kulp
  umb(k) {
    this._umb = this._umb || [];
    const i = k % 6;
    if (!this._umb[i]) {
      const col = ['#d8402a', '#2f6fb3', '#2a2a30', '#e8b03a', '#3f8a4a', '#7b4ab8'][i];
      const mb = new MB();
      const N = 16, R = 0.58, H = 0.3;
      for (let j = 0; j < N; j++) {
        const a0 = (j / N) * Math.PI * 2, a1 = ((j + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
        const c = C(j % 2 ? col : shade(C(col), 0.86), -0.35);
        // her dilim: tepeden kenara 4 halka, kenar ortası biraz içeri (dilimli şemsiye görünümü)
        const P = (a, t, inset) => { const rr = R * Math.sin(t * Math.PI / 2) * (1 - inset); return [Math.cos(a) * rr, H * Math.cos(t * Math.PI / 2) - (t > 0.95 ? 0.03 : 0), Math.sin(a) * rr]; };
        for (let q = 0; q < 4; q++) {
          const t0 = q / 4, t1 = (q + 1) / 4;
          mb.tri(P(a0, t0, 0), P(am, t1, t1 * 0.07), P(a0, t1, 0), c, [0, -1, 0]);
          mb.tri(P(a0, t0, 0), P(a1, t0, 0), P(am, t1, t1 * 0.07), c, [0, -1, 0]);
          mb.tri(P(a1, t0, 0), P(a1, t1, 0), P(am, t1, t1 * 0.07), c, [0, -1, 0]);
        }
      }
      mb.cyl(0, -0.78, 0, 0.012, H + 0.06, 0.012, 6, C('#3a3a40', -0.5));
      mb.sphereS(0, H + 0.07, 0, 0.022, 0.03, 0.022, C('#d8d8d8', -0.6), 6, 4);
      mb.push().T(0.045, -0.8, 0, 0, 0, Math.PI / 2);
      mb.torusN(0, 0, 0, 0.045, 0.012, 0.012, 10, 4, C('#5a3d2b', -0.3));
      mb.pop();
      this._umb[i] = mb.build(this.X);
    }
    return this._umb[i];
  }
  wood(kind = 'walnut') {
    this._wood = this._wood || {};
    if (!this._wood[kind]) this._wood[kind] = makeTexture(this.X, KIT.woodCanvas(kind));
    return this._wood[kind];
  }
  // far: uzaktaki motorlar için yarı ayrıntılı model (üçgen sayısı yarıya iner)
  scooter(ci, far = false, stop = false) {
    const k = ci * 4 + (far ? 1 : 0) + (stop ? 2 : 0);
    if (!this.scoot[k]) { const mb = new MB(); scooterModel(mb, pcol(ci), this.brand.boxHex, far ? 0.5 : 1, false, stop); this.scoot[k] = mb.build(this.X); }
    return this.scoot[k];
  }
  // motor tekerlekleri (renksiz, tüm motorlarda ortak): 0 ön, 1 arka; +2 uzak (yarı ayrıntı)
  wheel(front, far = false) {
    const k = (front ? 0 : 1) + (far ? 2 : 0);
    this._wheels = this._wheels || [];
    if (!this._wheels[k]) { const mb = new MB(); scooterWheel(mb, front, far ? 0.5 : 1); this._wheels[k] = mb.build(this.X); }
    return this._wheels[k];
  }
  obstacleMesh(o) {
    if (o.k === 'car') return o.v % 6 === 0 ? this.taxi : this.cars[o.v % this.cars.length];
    if (o.k === 'van') return this.vans[o.v % this.vans.length];
    if (o.k === 'bus') return this.buses[o.v % this.buses.length];
    if (o.k === 'puddle') return this.puddles[o.v % 3];
    return this[o.k];
  }
  dispose() {
    const X = this.X;
    if (!X || X.gl.isContextLost()) return;
    const all = [this.decal, ...this.scoot, ...(this._wheels || []), ...(this.cars || []), this.taxi, ...(this.vans || []), ...(this.buses || []), this.cone, this.barrier, ...(this.puddles || []), this.ramp, this.pad, ...Object.values(this.food), this.shadow, this.glow, this.flame, this.light];
    all.forEach((m) => freeMesh(X, m));
    if (this.atlas) X.gl.deleteTexture(this.atlas);
    X.gl.deleteTexture(this.logo);
    Object.values(this._wood || {}).forEach((t) => X.gl.deleteTexture(t));
    (this._ped || []).forEach((q) => q && Object.values(q).forEach((mm) => freeMesh(X, mm)));
    (this._umb || []).forEach((mm) => freeMesh(X, mm));
    shadowFree(X);
  }
}

/* ============================ dünya (bir yarışın şehri) ============================ */

class World {
  constructor(X, res, seed, tod) {
    this.X = X;
    this.res = res;
    this.brand = res.brand;
    this.seed = seed;
    this.len = KY.LEN;
    this.track = KY.track(seed);
    this.L = makeLayout(seed, this.len);
    this.rain = isRainy(tod, seed);
    this.tod = this.rain ? RAIN_NIGHT : TOD[((tod % 3) + 3) % 3];
    this.chunks = new Map();
    this.first = -1;
    this.last = Math.ceil((this.len + 120) / CH);
    const sk = new MB();
    buildSkyline(sk, this.tod, seed);
    this.sky = sk.build(X);
  }
  chunk(i) {
    if (this.chunks.has(i)) return this.chunks.get(i);
    const d0 = i * CH, d1 = d0 + CH;
    const mb = new MB('lit'), tb = new MB('tex'), gb = new MB('un'), wb = this.rain ? new MB('un') : null;
    this.wb = wb;   // ıslak zemin yansımaları (yalnız yağmurda): bina/lamba kurucuları buraya ekler
    buildRoad(mb, d0, d1, this);
    buildSidewalks(mb, d0, d1, this);
    buildStreetDetails(mb, d0, d1, this);
    this.L.cross.forEach((c) => { if (c >= d0 && c < d1) buildCrossing(mb, c, this); });
    this.L.side.forEach((list, s) => list.forEach((b) => { if (b.d >= d0 && b.d < d1) buildBuilding(mb, tb, b, s, this); }));
    this.L.lamps.forEach((l) => { if (l.d >= d0 && l.d < d1) buildLamp(mb, gb, l, wb); });
    this.L.trees.forEach((t) => { if (t.d >= d0 && t.d < d1) buildTree(mb, t); });
    this.L.props.forEach((p) => { if (p.d >= d0 && p.d < d1) buildProp(mb, tb, p); });
    this.L.bills.forEach((b) => { if (b.d >= d0 && b.d < d1) buildBillboard(mb, tb, b); });
    if (d0 <= 0 && d1 > 0) buildStart(mb, tb, this);
    if (d0 <= this.len && d1 > this.len) buildFinish(mb, tb, this);
    [[250, BANNER.k750], [500, BANNER.half], [750, BANNER.k250]].forEach(([d, b]) => { if (d >= d0 && d < d1) buildGantry(mb, tb, d, b); });
    this.wb = null;
    const c = { lit: mb.build(this.X), tex: tb.build(this.X), glow: gb.build(this.X), wet: wb && wb.d.length ? wb.build(this.X) : null, d0, d1, tris: mb.d.length / 30 };
    this.chunks.set(i, c);
    return c;
  }
  // Kare başına en fazla bir parça inşa et (takılma olmasın)
  prebuild(fromD, ahead = 260, budget = 1) {
    let n = 0;
    const a = Math.floor((fromD - 30) / CH), b = Math.floor((fromD + ahead) / CH);
    for (let i = Math.max(this.first, a); i <= Math.min(this.last, b) && n < budget; i++) {
      if (!this.chunks.has(i)) { this.chunk(i); n += 1; }
    }
    return n;
  }
  allBuilt() { for (let i = this.first; i <= this.last; i++) if (!this.chunks.has(i)) return false; return true; }
  dispose() {
    if (this.X.gl.isContextLost()) return;
    this.chunks.forEach((c) => { freeMesh(this.X, c.lit); freeMesh(this.X, c.tex); freeMesh(this.X, c.glow); freeMesh(this.X, c.wet); });
    this.chunks.clear();
    freeMesh(this.X, this.sky);
  }
}

/* ============================ çizim ============================ */

const ONE3 = new Float32Array([1, 1, 1]);
const IDENT = M.set(new Float32Array(16), 0, 0, 0);


/* ============================ gerçek gölgeler (gölge haritası) ============================ */
// Güneş yönünde ortografik derinlik haritası (RGBA'ya paketlenmiş). Kullanım (her karede, ana çizimden önce):
//   if (shadowBegin(X, sunDir, cx, cy, cz, R)) { shadowCast(X, mesh, m16) ...; } shadowEnd(X, w, h);
// Gölge alan nesneler (lit/tex programları) bunu kendiliğinden kullanır.
function shadowInit(X) {
  if (X.shd !== undefined) return X.shd;
  X.shd = null;
  const gl = X.gl;
  try {
    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!hp || hp.precision < 16) return null;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
    // telefon/tablet (dokunmatik): 1024 (bellek ve pil dostu); bilgisayar: 2048
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const size = Math.min(touch ? 1024 : 2048, max);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    if (!ok) { gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(rb); gl.deleteTexture(tex); return null; }
    X.shd = { tex, rb, fb, size, V: new Float32Array(16), P: new Float32Array(16), VP: new Float32Array(16), K: new Float32Array([1 / size, 0.0004, 1]), on: false };
  } catch (e) { console.warn('[3d] gölge haritası açılamadı', e); X.shd = null; }
  return X.shd;
}
function shadowFree(X) {
  const S = X && X.shd;
  if (!S || X.gl.isContextLost()) return;
  X.gl.deleteFramebuffer(S.fb); X.gl.deleteRenderbuffer(S.rb); X.gl.deleteTexture(S.tex);
  X.shd = null;
}
// sun: yüzeyden güneşe doğru birim vektör. (cx,cy,cz) ve R: gölgenin hesaplanacağı bölge (merkez, yarıçap)
// minY: gölgeyi düşüren ışığın en düşük yüksekliği (alçak güneşte gölgeler oyun alanını kaplamasın)
function shadowBegin(X, sun, cx, cy, cz, R, D = R * 2.2 + 10, minY = 0.18) {
  if (X.shd) X.shd.on = false;
  if (X.shdOff) return false;
  const S = shadowInit(X);
  if (!S) return false;
  const gl = X.gl;
  let lx = sun[0], ly = Math.max(minY, sun[1]), lz = sun[2];
  const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
  // ışık uzayı: f = -L bakış, s = f x up, u = s x f
  const fx = -lx, fy = -ly, fz = -lz;
  let ux0 = 0, uy0 = 1, uz0 = 0;
  if (Math.abs(fy) > 0.985) { uy0 = 0; uz0 = 1; }
  let sx = fy * uz0 - fz * uy0, sy = fz * ux0 - fx * uz0, sz = fx * uy0 - fy * ux0;
  let sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
  const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
  // doku hücresine kilitle (kamera kayarken gölge kenarları titremesin)
  const tx = (2 * R) / S.size;
  const cs = sx * cx + sy * cy + sz * cz, cu = ux * cx + uy * cy + uz * cz;
  const ds = cs - Math.round(cs / tx) * tx, du = cu - Math.round(cu / tx) * tx;
  const ccx = cx - sx * ds - ux * du, ccy = cy - sy * ds - uy * du, ccz = cz - sz * ds - uz * du;
  const ex = ccx + lx * D, ey = ccy + ly * D, ez = ccz + lz * D;
  const V = S.V;
  V[0] = sx; V[4] = sy; V[8] = sz;
  V[1] = ux; V[5] = uy; V[9] = uz;
  V[2] = -fx; V[6] = -fy; V[10] = -fz;
  V[3] = 0; V[7] = 0; V[11] = 0;
  V[12] = -(sx * ex + sy * ey + sz * ez);
  V[13] = -(ux * ex + uy * ey + uz * ez);
  V[14] = fx * ex + fy * ey + fz * ez;
  V[15] = 1;
  const far = D * 2;
  M.ortho(S.P, -R, R, -R, R, 0.5, far);
  M.mul(S.VP, S.P, V);
  S.K[0] = 1 / S.size;
  S.K[1] = (tx * 1.25) / (far - 0.5);
  S.K[2] = 1;
  gl.bindFramebuffer(gl.FRAMEBUFFER, S.fb);
  gl.viewport(0, 0, S.size, S.size);
  gl.clearColor(1, 1, 1, 1);
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  gl.colorMask(true, true, true, true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1.6, 4.0);
  gl.useProgram(X.dep.p);
  gl.uniformMatrix4fv(X.dep.u.uLVP, false, S.VP);
  X.cur = X.dep;
  X.lastBuf = null;
  X.shdBusy = true;
  return true;
}
function shadowCast(X, mesh, m16) {
  if (!mesh || !mesh.n || !X.shdBusy) return;
  const gl = X.gl;
  if (X.lastBuf !== mesh.b) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.b);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE[mesh.kind] * 4, 0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    X.lastBuf = mesh.b;
  }
  gl.uniformMatrix4fv(X.dep.u.uM, false, m16 || IDENT);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
}
function shadowEnd(X, w, h) {
  const gl = X.gl;
  if (X.shdBusy) {
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    X.shdBusy = false;
    X.lastBuf = null;
    X.cur = null;
    if (X.shd) X.shd.on = true;
  }
  if (w && h) gl.viewport(0, 0, w, h);
}

// Etkin programda gölgeyi geçici aç/kapat (ör. yansıma çizerken kapalı olmalı)
function shadowSet(X, on) {
  const u = X.cur && X.cur.u;
  if (!u || !u.uShdK) return;
  const S = X.shd;
  if (on && S && S.on && !X.shdOff) X.gl.uniform3fv(u.uShdK, S.K); else X.gl.uniform3f(u.uShdK, 0, 0, 0);
}
/* ============================ son işlem: parlama (bloom), renk ayarı, vinyet ============================ */
// Sahne ekran tamponuna (kenar yumuşatmalı) çizilir, sonra bir dokuya kopyalanır; parlak yerler 1/4 çözünürlükte
// bulanıklaştırılıp sahneye eklenir, renk doygunluğu/kontrast ayarlanır, köşeler hafif kararır.
function postTex(gl, w, h, fmt = gl.RGBA) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function postFbo(gl, t) {
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return ok ? f : null;
}
function postFree(X) {
  const P = X.post;
  if (!P || X.gl.isContextLost()) return;
  const gl = X.gl;
  [P.scene, P.ta, P.tb, P.tc].forEach((t) => t && gl.deleteTexture(t));
  [P.fa, P.fb, P.fc].forEach((f) => f && gl.deleteFramebuffer(f));
  P.scene = P.ta = P.tb = P.tc = P.fa = P.fb = P.fc = null; P.w = P.h = 0;
}
function postInit(X, W, H) {
  if (X.post === false) return null;
  const gl = X.gl;
  try {
    if (!X.post) X.post = { br: X.mkProg(SH.fsV, SH.brF, ['aP']), ds: X.mkProg(SH.fsV, SH.dsF, ['aP']), bl: X.mkProg(SH.fsV, SH.blF, ['aP']), co: X.mkProg(SH.fsV, SH.coF, ['aP']), w: 0, h: 0 };
    const P = X.post;
    if (P.w !== W || P.h !== H) {
      postFree(X);
      const w4 = Math.max(4, W >> 2), h4 = Math.max(4, H >> 2);
      P.scene = postTex(gl, W, H, gl.getContextAttributes()?.alpha ? gl.RGBA : gl.RGB);
      P.ta = postTex(gl, w4, h4); P.tb = postTex(gl, w4, h4); P.tc = postTex(gl, w4, h4);
      P.fa = postFbo(gl, P.ta); P.fb = postFbo(gl, P.tb); P.fc = postFbo(gl, P.tc);
      if (!P.fa || !P.fb || !P.fc) throw new Error('fbo');
      P.w = W; P.h = H; P.w4 = w4; P.h4 = h4;
    }
    return P;
  } catch (e) {
    console.warn('[3d] son işlem kapatıldı', e);
    try { postFree(X); } catch { /* yok say */ }
    X.post = false;
    return null;
  }
}
const POST_DEF = { bloom: 0.55, th: 0.8, white: 0.3, sat: 1.08, con: 0.14, vig: 0.62, tint: [1, 1, 1], tilt: null, rad: null };
// o: { bloom, th (eşik), white (beyazların parlama payı 0..1), sat, con, vig, tint, tilt: [merkez (0 alt..1 üst), net yarı bant, güç] }
function postFX(X, W, H, o = POST_DEF) {
  if (X.postOff || X.gl.isContextLost()) return;
  const P = postInit(X, W, H);
  if (!P) return;
  const gl = X.gl;
  const k = Object.assign({}, POST_DEF, o);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.STENCIL_TEST);
  gl.depthMask(false);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, P.scene);
  if (!P.checked) { while (gl.getError()) { /* önceki hataları temizle */ } }
  gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, W, H);
  if (!P.checked) {
    P.checked = true;
    if (gl.getError()) { console.warn('[3d] son işlem: kopyalama desteklenmiyor'); X.postOff = true; return; }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, X.skyBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  const pass = (prog, fbo, w, h, setup) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    setup(prog.u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const tilt = k.tilt && k.tilt[2] > 0;
  const rad = k.rad && k.rad[2] > 0.01;
  if (tilt || rad) {
    // sahne 1/4 çözünürlükte bulanık (minyatür fotoğraf etkisi: ekranın üst/alt uçları)
    pass(P.ds, P.fc, P.w4, P.h4, (u) => { gl.bindTexture(gl.TEXTURE_2D, P.scene); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uPx, 1 / W, 1 / H); });
    pass(P.bl, P.fb, P.w4, P.h4, (u) => { gl.bindTexture(gl.TEXTURE_2D, P.tc); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uD, 1.6 / P.w4, 0); });
    pass(P.bl, P.fc, P.w4, P.h4, (u) => { gl.bindTexture(gl.TEXTURE_2D, P.tb); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uD, 0, 1.6 / P.h4); });
  }
  if (k.bloom > 0) {
    // parlak kısımlar (küçültülmüş) → yatay/dikey bulanıklık (iki tur: geniş, yumuşak hale)
    pass(P.br, P.fa, P.w4, P.h4, (u) => { gl.bindTexture(gl.TEXTURE_2D, P.scene); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uPx, 1 / W, 1 / H); gl.uniform2f(u.uTh, k.th, k.white); });
    for (let it = 0; it < 2; it++) {
      const sc = it ? 2.2 : 1;
      pass(P.bl, P.fb, P.w4, P.h4, (u) => { gl.bindTexture(gl.TEXTURE_2D, P.ta); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uD, sc / P.w4, 0); });
      pass(P.bl, P.fa, P.w4, P.h4, (u) => { gl.bindTexture(gl.TEXTURE_2D, P.tb); gl.uniform1i(u.uT, 0); gl.uniform2f(u.uD, 0, sc / P.h4); });
    }
  }
  pass(P.co, null, W, H, (u) => {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, P.tc);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, P.ta);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, P.scene);
    gl.uniform1i(u.uT, 0);
    gl.uniform1i(u.uB, 1);
    gl.uniform1i(u.uS, 2);
    gl.uniform4f(u.uK, k.bloom > 0 ? k.bloom : 0, k.sat, k.con, k.vig);
    gl.uniform3fv(u.uTint, k.tint);
    if (tilt) gl.uniform3f(u.uTilt, k.tilt[0], k.tilt[1], k.tilt[2]); else gl.uniform3f(u.uTilt, 0, 0, 0);
    if (rad) gl.uniform3f(u.uRad, k.rad[0], k.rad[1], k.rad[2]); else gl.uniform3f(u.uRad, 0, 0, 0);
  });
  X.lastBuf = null;
  X.cur = null;
  gl.depthMask(true);
}

// Çizgi film karakteri çizimi: önce koyu dış kontur (normal boyunca şişirilmiş, bakış yönünde geri itilmiş kopya),
// sonra kenar ışıklı asıl model. F: kare bilgisi (kamera konumu, görüş açısı). o: { px, line, rim, rimK, h, noLine }
const OUT_C = new Float32Array([0.09, 0.07, 0.14]);
const RIM_C = [0.85, 0.92, 1.0];
function drawToon(X, mesh, m16, tint, F, o = {}) {
  if (!mesh || !mesh.n) return;
  const gl = X.gl, u = X.cur.u;
  const dist = Math.hypot(m16[12] - F.cx, m16[13] - F.cy, m16[14] - F.cz);
  const k = ((2 * Math.tan((F.fov || 0.8) / 2)) / (o.h || 760)) * (o.px ?? 2.2) * dist;
  if (u.uOut && !o.noLine) {
    gl.uniform4f(u.uOut, k, o.push ?? Math.min(0.35, Math.max(0.06, k * 5)), 1, 0);
    gl.uniform3fv(u.uOutC, o.line || OUT_C);
    drawMesh(X, mesh, m16, tint);
    gl.uniform4f(u.uOut, 0, 0, 0, 0);
  }
  const r = o.rim || RIM_C;
  if (u.uRim) gl.uniform4f(u.uRim, r[0], r[1], r[2], o.rimK ?? 0.32);
  drawMesh(X, mesh, m16, tint);
  if (u.uRim) gl.uniform4f(u.uRim, 0, 0, 0, 0);
}

// Yüzey ayrıntısı: tekrarlanan gürültü dokusu (R: ince tane, G: kaba leke). lit programında, çizim başına açılır.
function detailTex(X) {
  if (X.detT !== undefined) return X.detT;
  const gl = X.gl;
  try {
    const N = 256, cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    const img = g.createImageData(N, N);
    // döşenebilir değer gürültüsü (periyodik ızgara)
    const hash = (x, y, k) => { let h = Math.imul((x & 255) + k * 131, 374761393) ^ Math.imul((y & 255) + k * 71, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const vnoise = (x, y, f, k) => {
      const fx = (x / N) * f, fy = (y / N) * f, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const w = (a) => ((a % f) + f) % f;
      const a = hash(w(x0), w(y0), k), b = hash(w(x0 + 1), w(y0), k), c = hash(w(x0), w(y0 + 1), k), d = hash(w(x0 + 1), w(y0 + 1), k);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const fine = vnoise(x, y, 64, 1) * 0.55 + vnoise(x, y, 128, 2) * 0.3 + hash(x, y, 3) * 0.15;
        const coarse = vnoise(x, y, 8, 4) * 0.6 + vnoise(x, y, 16, 5) * 0.4;
        const o = (y * N + x) * 4;
        img.data[o] = Math.round(fine * 255); img.data[o + 1] = Math.round(coarse * 255); img.data[o + 2] = 128; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    X.detT = t;
  } catch (e) { console.warn('[3d] ayrıntı dokusu', e); X.detT = null; }
  return X.detT;
}
// Zemin teması karartması: y0 zemin yüksekliği, h etki yüksekliği, k güç (0 = kapalı)
function aoOn(X, y0, h, k) {
  const u = X.cur && X.cur.u;
  if (!u || !u.uAO) return;
  X.gl.uniform3f(u.uAO, y0, h, k || 0);
}
// k: güç (0..0,5), sc: ölçek (1 / dünya birimi; küçük = iri desen), sz: ikinci eksen ölçeği (verilmezse sc). k = 0 kapatır.
function detailOn(X, k, sc = 0.08, sz = sc) {
  const u = X.cur && X.cur.u;
  if (!u || !u.uDetK) return;
  const gl = X.gl;
  if (!k) { gl.uniform4f(u.uDetK, 0, 0, 0, 0); return; }
  const t = detailTex(X);
  if (!t) return;
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(u.uDet, 2);
  gl.uniform4f(u.uDetK, k, sc, sz, 1);
}

function useProg(X, prog, F, tod) {
  const gl = X.gl;
  const u = prog.u;
  gl.useProgram(prog.p);
  X.cur = prog;
  if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, F.VP);
  if (u.uCam) gl.uniform3f(u.uCam, F.cx, F.cy, F.cz);
  if (u.uSun) gl.uniform3fv(u.uSun, F.sun);
  if (u.uSunC) gl.uniform3fv(u.uSunC, tod.sunC);
  if (u.uSky) gl.uniform3fv(u.uSky, tod.sky);
  if (u.uGnd) gl.uniform3fv(u.uGnd, tod.gnd);
  if (u.uFog) gl.uniform3fv(u.uFog, F.fog);
  if (u.uFogR) gl.uniform2f(u.uFogR, tod.fogR[0], tod.fogR[1]);
  if (u.uNight) gl.uniform1f(u.uNight, tod.night);
  if (u.uLamp) gl.uniform3f(u.uLamp, F.lx, F.ly, F.lz);
  if (u.uLampC) gl.uniform3fv(u.uLampC, F.lampC);
  if (u.uWarm) gl.uniform3fv(u.uWarm, tod.warm);
  if (u.uTint) gl.uniform3fv(u.uTint, ONE3);
  if (u.uAlpha) gl.uniform1f(u.uAlpha, 1);
  if (u.uGlow) gl.uniform1f(u.uGlow, 1);
  if (u.uAdd) gl.uniform1f(u.uAdd, 0);
  if (u.uOut) gl.uniform4f(u.uOut, 0, 0, 0, 0);
  if (u.uRim) gl.uniform4f(u.uRim, 0, 0, 0, 0);
  if (u.uDetK) { gl.uniform4f(u.uDetK, 0, 0, 0, 0); if (u.uDet) gl.uniform1i(u.uDet, 2); }
  if (u.uAO) gl.uniform3f(u.uAO, 0, 1, 0);
  if (u.uWet) gl.uniform1f(u.uWet, F.wet || 0);
  if (u.uWave) gl.uniform4f(u.uWave, 0, 0, 0, 0);
  if (u.uShdK) {
    const S = X.shd;
    if (S && S.on && !X.shdOff) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, S.tex);
      gl.activeTexture(gl.TEXTURE0);
      if (u.uShd) gl.uniform1i(u.uShd, 1);
      if (u.uLVP) gl.uniformMatrix4fv(u.uLVP, false, S.VP);
      gl.uniform3fv(u.uShdK, S.K);
    } else {
      gl.uniform3f(u.uShdK, 0, 0, 0);
      if (u.uShd) gl.uniform1i(u.uShd, 1);
    }
  }
  X.lastBuf = null;
}

function drawMesh(X, mesh, m16, tint = ONE3, alpha = 1, glow = 1) {
  if (!mesh || !mesh.n) return;
  const gl = X.gl;
  const u = X.cur.u;
  if (X.lastBuf !== mesh.b) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.b);
    bindAttrs(X, mesh.kind);
    X.lastBuf = mesh.b;
  }
  gl.uniformMatrix4fv(u.uM, false, m16 || IDENT);
  if (u.uTint) gl.uniform3fv(u.uTint, tint);
  if (u.uAlpha) gl.uniform1f(u.uAlpha, alpha);
  if (u.uGlow) gl.uniform1f(u.uGlow, glow);
  gl.drawArrays(gl.TRIANGLES, mesh.o || 0, mesh.n);
}

function drawSky(X, F, tod) {
  const gl = X.gl;
  const p = X.sky;
  gl.useProgram(p.p);
  X.cur = p;
  const V = F.V;
  gl.uniform3f(p.u.uR, V[0], V[4], V[8]);
  gl.uniform3f(p.u.uU, V[1], V[5], V[9]);
  // görüntü merkezi kaydırılmışsa (F.shift) gökyüzü ışınları da aynı miktarda kayar
  const tX = Math.tan(F.fov / 2) * F.asp, sh = (F.shift || 0) * tX;
  gl.uniform3f(p.u.uF, -V[2] + sh * V[0], -V[6] + sh * V[4], -V[10] + sh * V[8]);
  gl.uniform2f(p.u.uTan, tX, Math.tan(F.fov / 2));
  gl.uniform3fv(p.u.uTop, F.top);
  gl.uniform3fv(p.u.uHor, F.hor);
  gl.uniform3fv(p.u.uFog, F.fog);
  gl.uniform3fv(p.u.uSunD, F.sunVis);
  gl.uniform3fv(p.u.uSunC, tod.sunC);
  if (p.u.uStars) gl.uniform1f(p.u.uStars, tod.stars);
  if (p.u.uGlowS) gl.uniform1f(p.u.uGlowS, tod.glowS);
  gl.bindBuffer(gl.ARRAY_BUFFER, X.skyBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  X.lastBuf = null;
}

// Dörtgen köşe sırası (iki üçgen): 0-1-2, 0-2-3
const QIDX = [0, 1, 2, 0, 2, 3];
// Yumuşak yuvarlak parçacık: ortası dolu, kenarı saydam altıgen (6 üçgen). Yeni yazma konumunu döner.
const RING6 = Array.from({ length: 7 }, (_, k) => [Math.cos((k / 6) * Math.PI * 2), Math.sin((k / 6) * Math.PI * 2)]);
function emitSoft(arr, o, x, y, z, s, r, g, b, a, rx, ry, rz, ux, uy, uz) {
  const S = s * 1.45;
  for (let j = 0; j < 6; j++) {
    const [c0, s0] = RING6[j], [c1, s1] = RING6[j + 1];
    arr[o++] = x; arr[o++] = y; arr[o++] = z; arr[o++] = r; arr[o++] = g; arr[o++] = b; arr[o++] = a;
    arr[o++] = x + (rx * c0 + ux * s0) * S; arr[o++] = y + (ry * c0 + uy * s0) * S; arr[o++] = z + (rz * c0 + uz * s0) * S; arr[o++] = r; arr[o++] = g; arr[o++] = b; arr[o++] = 0;
    arr[o++] = x + (rx * c1 + ux * s1) * S; arr[o++] = y + (ry * c1 + uy * s1) * S; arr[o++] = z + (rz * c1 + uz * s1) * S; arr[o++] = r; arr[o++] = g; arr[o++] = b; arr[o++] = 0;
  }
  return o;
}

// Final kürsüsü (tüm 3D oyunlar): ilk üç 2-1-3 dizilişinde, kazanana taç, arkada CSS konfeti. sb: [{ id, nickname, score, c }]
function podiumHTML(sb, me) {
  const top = (sb || []).slice(0, 3);
  if (top.length < 2 || !(+top[0].score > 0)) return '';
  const H = [84, 60, 44];
  const cols = [1, 0, 2].filter((i) => top[i]).map((i) => {
    const s = top[i];
    const ini = esc((Array.from(String(s.nickname || '?').trim())[0] || '?').toLocaleUpperCase('tr'));
    return `<div class="pd-c p${i + 1}${s.id === me ? ' me' : ''}" style="--c:${pcol(s.c)}">${i === 0 ? '<div class="pd-crown">👑</div>' : ''}<div class="pd-av">${ini}</div><div class="pd-nm">${esc(s.nickname)}</div><div class="pd-b" style="height:${H[i]}px"><b>${i + 1}</b><span>${s.score}</span></div></div>`;
  }).join('');
  const CF = ['#ffd23f', '#ff5a6e', '#3fdc6a', '#4aa8ff', '#c77dff', '#ff9f1c'];
  const conf = Array.from({ length: 26 }, (_, k) => `<i style="--x:${(k * 37 + 5) % 100}%;--d:${((k % 7) * 0.31).toFixed(2)}s;--t:${(2.4 + (k % 5) * 0.35).toFixed(2)}s;--r:${(k * 47) % 360}deg;--h:${CF[k % 6]}"></i>`).join('');
  return `<div class="pd"><div class="pd-cf">${conf}</div>${cols}</div>`;
}

// İsim etiketleri: birbirine binenleri yukarı doğru dizer (kayma yumuşak). L: [{ o, x, y, op }] — o.lbl etiket öğesi
function placeLabels(L, sc) {
  for (const q of L) {
    const o = q.o;
    if (o.lbl.style.display === 'none') o.lbl.style.display = '';
    if (!o.lblW) o.lblW = o.lbl.offsetWidth || 70;
    q.s2 = q.sc ?? sc;           // öğe başına ölçek (uzaktaki etiket küçük)
    q.w = o.lblW * q.s2;
  }
  L.sort((a, b) => b.y - a.y);
  const placed = [];
  for (const q of L) {
    let y = q.y;
    for (let it = 0; it < 6; it++) {
      const hit = placed.find((p) => Math.abs(p.x - q.x) < (p.w + q.w) / 2 + 2 && Math.abs(p.y - y) < 20 * Math.max(p.s2, q.s2));
      if (!hit) break;
      y = hit.y - 20 * Math.max(hit.s2, q.s2);
    }
    placed.push({ x: q.x, y, w: q.w, s2: q.s2 });
    const o = q.o, d = y - q.y;
    o.lblDy = o.lblDy == null ? d : o.lblDy + (d - o.lblDy) * 0.3;
    const op = String(q.op);
    if (o.lbl.style.opacity !== op) o.lbl.style.opacity = op;
    o.lbl.style.transform = `translate(${q.x.toFixed(1)}px, ${(q.y + o.lblDy).toFixed(1)}px) translate(-50%, -100%) scale(${q.s2.toFixed(2)})`;
  }
}

// Dinamik üçgen tamponu (parçacıklar): [p3 c4]
function drawDynamic(X, buf, arr, count, additive) {
  if (!count) return;
  const gl = X.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, arr.subarray(0, count * 7), gl.DYNAMIC_DRAW);
  bindAttrs(X, 'un');
  X.lastBuf = buf;
  gl.uniformMatrix4fv(X.cur.u.uM, false, IDENT);
  if (X.cur.u.uAdd) gl.uniform1f(X.cur.u.uAdd, additive ? 1 : 0);
  if (X.cur.u.uAlpha) gl.uniform1f(X.cur.u.uAlpha, 1);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

// Uyarlanır kalite merdiveni (en iyiden en hafife): [çözünürlük ölçeği, son işlem (parlama/renk), gölge].
// Önce çözünürlük biraz düşer, sonra son işlem, sonra gölge kapanır; keskinlik en sona kadar korunur
// (bulanık görüntü en göze batan kayıp). Her oyun kendi seviyesini hatırlar (Kurye ağır, golf hafif) ve
// bir basamak iyimser başlar; uzun süre akıcıysa basamak basamak geri yükselir.
const QL = [[1, 1, 1], [0.88, 1, 1], [0.88, 0, 1], [0.76, 0, 1], [0.76, 0, 0], [0.64, 0, 0], [0.55, 0, 0]];
const QKEY = 'nfc3d-kalite';
const HAND_KEY = 'ky-el';
const handLoad = () => { try { const h = localStorage.getItem(HAND_KEY); if (h === 'r' || h === 'l' || h === '2') return h; } catch { /* yok say */ } return 'r'; };
const handSave = (h) => { try { localStorage.setItem(HAND_KEY, h); } catch { /* yok say */ } };
const qLoad = (k) => { try { const q = JSON.parse(localStorage.getItem(k) || 'null'); if (q && Number.isInteger(q.lv)) return q; } catch { /* yok say */ } return null; };
const qSave = (k, q) => { try { localStorage.setItem(k, JSON.stringify(q)); } catch { /* yok say */ } };
function qApply(g, lv) {
  g.q.lv = lv;
  g.scale = QL[lv][0];
  g.q.post = QL[lv][1];
  g.q.shd = QL[lv][2];
}
function autoRes(g, raw) {
  const now = performance.now();
  if (!g.q) {
    const key = `${QKEY}-${(g.el?.wrap?.className || '').split(' ')[0] || 'ky'}`;
    const sv = qLoad(key);
    g.q = { key, act: 0, lv: 0, post: 1, shd: 1 };
    qApply(g, sv ? clamp(sv.lv - 1, 0, QL.length - 1) : 0);
  }
  if (typeof window !== 'undefined' && window.__qKilit != null && g.q.lv !== window.__qKilit) qApply(g, window.__qKilit);   // test: kaliteyi sabitle
  if (g.X) { g.X.postOff = !g.q.post; g.X.shdOff = !g.q.shd; }
  if (typeof window !== 'undefined' && window.__qKilit != null) return;
  if (!g.resBorn) g.resBorn = now;
  const ms = raw * 1000;
  if (ms > 250 || now - g.resBorn < 2000) return;          // açılış derlemesi / sekme uykusu: ölçme
  g.frameAvg = lerp(g.frameAvg || 16, ms, 0.06);
  const slowTh = g.capped ? 50 : 27;
  const veryslow = g.frameAvg > 42;
  if (g.frameAvg > slowTh) { g.slowFor = (g.slowFor || 0) + raw; g.fastFor = 0; }
  else if (g.frameAvg < 20.5) { g.fastFor = (g.fastFor || 0) + raw; g.slowFor = 0; }
  else { g.slowFor = 0; g.fastFor = 0; }
  const save = () => qSave(g.q.key, { lv: g.q.lv });
  if (g.slowFor > (veryslow ? 0.8 : 1.5)) {
    // son düşürme işe yaramadıysa (ör. pil tasarrufunda 30 fps sınırı) geri al: boşuna kalite kaybetme
    if (g.q.act && g.avgAtDown && g.frameAvg > g.avgAtDown * 0.9 && !veryslow) {
      qApply(g, Math.max(0, g.q.lv - g.q.act));
      g.q.act = 0; g.capped = true; g.slowFor = 0; save();
      return;
    }
    if (g.q.lv < QL.length - 1) {
      const step = veryslow && g.q.lv < QL.length - 2 ? 2 : 1;
      g.capLv = g.q.lv; g.capT = now;
      qApply(g, g.q.lv + step);
      g.q.act = step; g.avgAtDown = g.frameAvg; g.slowFor = 0; g.frameAvg = 22; g.lastDown = now; save();
    }
    return;
  }
  // akıcıysa bir basamak yukarı (az önce yavaş kalınan seviye 40 sn tekrar denenmez: gidip gelme olmasın)
  if (g.fastFor > 2.5 && g.q.lv > 0) {
    const next = g.q.lv - 1;
    const capOk = g.capLv == null || next > g.capLv || now - (g.capT || 0) > 40000;
    if (capOk && now - (g.lastDown || 0) > 6000) { qApply(g, next); g.fastFor = 0; g.q.act = 0; save(); }
  }
}

/* ============================ ses ============================ */
// Tüm sesler anında üretilir (dosya yok). Sitenin ses motorunun bağlamını ve kanallarını kullanır:
// efekt kapalıysa efekt çalmaz, müzik kapalıysa müzik kanalı zaten sessizdir.

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

class Snd {
  constructor() { this.k = null; this.eng = null; this.mus = null; this.mode = null; this.musVol = 2.0; this.int = 0; }
  kit() {
    if (!this.k) { try { this.k = (sfx.audioKit && sfx.audioKit()) || null; } catch { this.k = null; } }
    return this.k;
  }
  live() { const k = this.kit(); return !!k && k.ctx.state === 'running'; }
  on() { return this.live() && !sfx.isMuted(); }
  out(pan) {
    const k = this.k;
    if (pan && k.ctx.createStereoPanner) {
      const p = k.ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      p.connect(k.bus);
      return p;
    }
    return k.bus;
  }
  env(g, t, a, peak, dur) {
    g.gain.value = 0.0001;   // yeni düğümün varsayılan kazancı 1: zarftan önceki ilk örnek tık yapmasın
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  }
  tone(f, t, dur, type = 'sine', vol = 0.3, slide = null, attack = 0.006, pan = 0, dest = null) {
    const c = this.k.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    this.env(g, t, attack, vol, dur);
    o.connect(g).connect(dest || this.out(pan));
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }
  noise(t, dur, vol, { type = 'lowpass', freq = 1000, to = null, q = 0.8, attack = 0.005 } = {}, pan = 0, dest = null) {
    const c = this.k.ctx;
    const src = c.createBufferSource();
    src.buffer = this.k.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    this.env(g, t, attack, vol, dur);
    src.connect(f).connect(g).connect(dest || this.out(pan));
    src.start(t, Math.random() * 1.2);
    src.stop(t + attack + dur + 0.05);
  }
  duck(amount = 0.35, time = 0.8) {
    const m = this.mus;
    if (!m) return;
    const t = this.k.ctx.currentTime;
    m.g.gain.cancelScheduledValues(t);
    m.g.gain.setValueAtTime(Math.max(0.0001, m.g.gain.value), t);
    m.g.gain.linearRampToValueAtTime(amount * this.musVol, t + 0.04);
    m.g.gain.setTargetAtTime(this.musVol, t + time, 0.35);
  }
  cheer(t, dur) {
    for (let i = 0; i < 46; i++) this.noise(t + Math.random() * dur, 0.05 + Math.random() * 0.08, 0.05 + Math.random() * 0.09, { type: 'bandpass', freq: 700 + Math.random() * 2600, q: 1.6 });
    this.tone(2500, t + 0.2, 0.45, 'sine', 0.12, 2900, 0.02);
    this.tone(2600, t + 0.9, 0.3, 'sine', 0.1, 3000, 0.02);
  }
  fx(name, a = 0) {
    if (!this.on()) return;
    try { this._fx(name, a); } catch (e) { console.warn('[kurye ses]', name, e); }
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'lane': this.noise(t, 0.11, 0.2, { type: 'bandpass', freq: 2400, to: 800, q: 1.3, attack: 0.012 }, a); break;
      case 'jump': this.tone(260, t, 0.2, 'triangle', 0.26, 640); this.noise(t, 0.22, 0.1, { type: 'bandpass', freq: 600, to: 2600, q: 1, attack: 0.03 }); break;
      case 'land': this.tone(150, t, 0.13, 'sine', 0.42, 52, 0.003); this.noise(t, 0.09, 0.16, { freq: 480 }); break;
      case 'ramp': this.tone(170, t, 0.5, 'sawtooth', 0.11, 880, 0.02); this.noise(t, 0.65, 0.24, { type: 'bandpass', freq: 380, to: 3200, q: 1, attack: 0.05 }); this.tone(523, t + 0.15, 0.12, 'square', 0.06); this.tone(784, t + 0.25, 0.2, 'square', 0.06); break;
      case 'item': {
        const sc = [1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093, 2349, 2637, 2794];
        const f = sc[clamp(a | 0, 0, sc.length - 1)];
        this.tone(f, t, 0.1, 'square', 0.055);
        this.tone(f * 2, t, 0.22, 'sine', 0.11);
        this.tone(f * 1.5, t + 0.045, 0.2, 'sine', 0.07);
        break;
      }
      case 'turbo':
        this.duck(0.45, 0.9);
        this.tone(150, t, 0.6, 'sawtooth', 0.15, 980, 0.02);
        this.tone(56, t, 0.55, 'sine', 0.55, 38, 0.004);
        this.noise(t, 0.8, 0.3, { type: 'highpass', freq: 700, to: 6500, attack: 0.1 });
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, t + 0.08 + i * 0.06, 0.16, 'square', 0.045));
        break;
      case 'pad': this.tone(680, t, 0.2, 'square', 0.11, 1900); this.noise(t, 0.42, 0.24, { type: 'bandpass', freq: 500, to: 3600, attack: 0.04 }); break;
      case 'splash':
        this.noise(t, 0.45, 0.42, { freq: 1700, to: 240, q: 0.6 });
        for (let i = 0; i < 6; i++) this.tone(1600 + Math.random() * 1900, t + 0.04 + Math.random() * 0.3, 0.04, 'sine', 0.05);
        break;
      case 'cone': this.tone(580, t, 0.13, 'triangle', 0.32, 230, 0.002); this.noise(t, 0.08, 0.26, { type: 'bandpass', freq: 1500, q: 1.2 }); break;
      case 'bonk': this.tone(330, t, 0.28, 'square', 0.13, 290); this.tone(470, t, 0.22, 'square', 0.08, 430); this.noise(t, 0.16, 0.32, { type: 'bandpass', freq: 2600, q: 2 }); break;
      case 'crash':
        this.duck(0.22, 1.3);
        this.noise(t, 0.75, 0.75, { freq: 2600, to: 90, q: 0.7 });
        this.tone(96, t, 0.6, 'sine', 0.75, 36, 0.002);
        for (let i = 0; i < 8; i++) this.tone(2300 + Math.random() * 2400, t + 0.07 + Math.random() * 0.32, 0.06, 'sine', 0.06);
        [0.5, 0.72].forEach((d, i) => { this.tone(392, t + d, i ? 0.3 : 0.17, 'square', 0.065); this.tone(494, t + d, i ? 0.3 : 0.17, 'square', 0.05); });
        break;
      case 'smash': this.noise(t, 0.28, 0.42, { type: 'highpass', freq: 1400 }); this.tone(210, t, 0.16, 'sine', 0.42, 75); break;
      case 'thunder':
        // uzak gök gürültüsü: çatırtı + uzun, yuvarlanan gürleme
        this.noise(t, 0.25, 0.22 * (0.6 + a), { type: 'bandpass', freq: 1400, to: 300, q: 0.7, attack: 0.005 });
        this.noise(t + 0.05, 2.6, 0.75 * (0.6 + a), { type: 'lowpass', freq: 380, to: 70, q: 0.6, attack: 0.12 });
        this.noise(t + 0.6, 1.8, 0.4 * (0.6 + a), { type: 'lowpass', freq: 220, to: 60, q: 0.5, attack: 0.3 });
        this.tone(48, t + 0.05, 1.6, 'sine', 0.35, 32, 0.08);
        break;
      case 'beep': this.tone(660, t, 0.17, 'square', 0.15); this.tone(1320, t, 0.12, 'sine', 0.06); break;
      case 'go': this.duck(0.3, 0.9); this.tone(1320, t, 0.55, 'square', 0.16); this.tone(1980, t, 0.5, 'sine', 0.09); this.tone(660, t, 0.55, 'sawtooth', 0.06); break;
      case 'up': this.tone(880, t, 0.08, 'sine', 0.2); this.tone(1320, t + 0.07, 0.13, 'sine', 0.2); break;
      case 'emote': this.tone(988, t, 0.07, 'sine', 0.14, 1480, 0.003); this.tone(1480, t + 0.05, 0.1, 'sine', 0.08); this.noise(t, 0.05, 0.05, { type: 'highpass', freq: 3000 }); break;
      case 'down': this.tone(520, t, 0.12, 'sine', 0.09, 390); break;
      case 'pass': this.noise(t, 0.5, 0.2, { type: 'bandpass', freq: 450, to: 1900, q: 1.1, attack: 0.16 }, a); break;
      case 'finish':
        this.duck(0.2, 2.6);
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.09, 0.24, 'triangle', 0.3));
        [523, 659, 784, 1047].forEach((f) => this.tone(f, t + 0.42, 1.3, 'triangle', 0.18));
        this.tone(262, t + 0.42, 1.3, 'sawtooth', 0.06);
        this.cheer(t + 0.1, 2.3);
        break;
      case 'win':
        this.duck(0.25, 2);
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.1, 0.25, 'triangle', 0.32));
        [523, 659, 784, 1047].forEach((f) => this.tone(f, t + 0.45, 1.4, 'triangle', 0.2));
        this.cheer(t + 0.3, 1.8);
        break;
      default: break;
    }
  }
  // ---- motor ----
  engine(on) {
    if (!on) { this.stopEngine(); return; }
    if (this.eng || !this.live()) return;
    const k = this.k;
    const c = k.ctx;
    const out = c.createGain();
    out.gain.value = 0.0001;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 3;
    const sh = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
    sh.curve = curve;
    const am = c.createGain();
    am.gain.value = 0.75;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    const lg = c.createGain();
    lg.gain.value = 0.25;
    lfo.connect(lg).connect(am.gain);
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = 'square';
    const o3 = c.createOscillator(); o3.type = 'sawtooth'; o3.detune.value = 11;
    const g2 = c.createGain(); g2.gain.value = 0.45;
    o1.connect(sh); o3.connect(sh); o2.connect(g2).connect(sh);
    sh.connect(lp).connect(am).connect(out).connect(k.bus);
    [o1, o2, o3, lfo].forEach((o) => { o.frequency.value = 40; o.start(); });
    this.eng = { o1, o2, o3, lfo, lp, out };
  }
  engineSet(v, turbo, air, alive) {
    this.int = alive ? (turbo ? 1 : clamp((v - 12) / 12, 0, 1) * 0.9) : 0.2;
    const e = this.eng;
    if (!e) return;
    const t = this.k.ctx.currentTime;
    const f = 36 + v * 3.2 + (turbo ? 24 : 0) + (air ? 14 : 0);
    e.o1.frequency.setTargetAtTime(f, t, 0.06);
    e.o3.frequency.setTargetAtTime(f * 1.004, t, 0.06);
    e.o2.frequency.setTargetAtTime(f / 2, t, 0.06);
    e.lfo.frequency.setTargetAtTime(f / 3.2, t, 0.06);
    e.lp.frequency.setTargetAtTime(300 + v * 36 + (turbo ? 1100 : 0), t, 0.09);
    const g = sfx.isMuted() || !alive ? 0.0001 : 0.034 + v * 0.0017 + (turbo ? 0.03 : 0);
    e.out.gain.setTargetAtTime(g, t, 0.12);
  }
  stopEngine() {
    const e = this.eng;
    if (!e) return;
    this.eng = null;
    try {
      const t = this.k.ctx.currentTime;
      e.out.gain.cancelScheduledValues(t);
      e.out.gain.setTargetAtTime(0.0001, t, 0.15);
      setTimeout(() => { [e.o1, e.o2, e.o3, e.lfo].forEach((o) => { try { o.stop(); } catch { /* durdu */ } }); try { e.out.disconnect(); } catch { /* yok */ } }, 900);
    } catch { /* yok say */ }
  }
  // ---- müzik çekirdeği (sitenin müzik kanalından) ----
  // Her oyun kendi ritmini tanımlar: tempo() (bpm), steps() (ölçü başına adım: 16 = onaltılık, 12 = 12/8 üçleme),
  // swing() (çift olmayan adımları geciktirir), beat(t, s, bar, spb, st). this.int (0..1): oyunun o anki gerilimi.
  tempo() { return this.mode === 'calm' ? 88 : this.mode === 'idle' ? 100 : 146 + 10 * (this.int || 0); }
  steps() { return 16; }
  swing() { return 0; }
  music(mode) {
    this.mode = mode;
    if (!mode) { this.stopMusic(); return; }
    const k = this.kit();
    if (!k || this.mus) return;
    const c = k.ctx;
    const g = c.createGain();
    g.gain.value = this.musVol;
    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, c.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2);
    // tempoya bağlı noktalı sekizlik yankı (geri beslemeli, tiz kısılmış): ince sesleri dolgunlaştırır
    const send = c.createGain(), dl = c.createDelay(1.5), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
    dl.delayTime.value = 0.3; fb.gain.value = 0.3; lp.type = 'lowpass'; lp.frequency.value = 2400; wet.gain.value = 0.3;
    send.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(g);
    g.connect(bus).connect(k.music);
    this.mus = { g, bus, send, dl, fb, next: 0, step: 0, bar: 0, timer: setInterval(() => this.sched(), 50) };
  }
  stopMusic() {
    const m = this.mus;
    if (!m) return;
    this.mus = null;
    clearInterval(m.timer);
    try {
      const t = this.k.ctx.currentTime;
      m.bus.gain.cancelScheduledValues(t);
      m.bus.gain.setValueAtTime(Math.max(0.0001, m.bus.gain.value), t);
      m.bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      setTimeout(() => { try { m.fb.disconnect(); m.bus.disconnect(); } catch { /* yok */ } }, 1000);
    } catch { /* yok say */ }
  }
  sched() {
    const m = this.mus;
    if (!m || !this.k) return;
    const c = this.k.ctx;
    if (c.state !== 'running' || !sfx.isMusicOn()) { m.next = 0; return; }
    const N = this.steps();
    const spb = 60 / this.tempo();
    const st = (spb * 4) / N;
    try { m.dl.delayTime.setTargetAtTime(Math.min(1.2, spb * 0.75), c.currentTime, 0.3); } catch { /* eski tarayıcı */ }
    if (m.next < c.currentTime) m.next = c.currentTime + 0.06;
    let guard = 0;
    while (m.next < c.currentTime + 0.25 && guard++ < 32) {
      const sw = m.step % 2 === 1 ? this.swing() * st : 0;
      try { this.beat(m.next + sw, m.step, m.bar, spb, st); } catch (e) { console.warn('[müzik]', e); }
      m.next += st;
      m.step += 1;
      if (m.step >= N) { m.step = 0; m.bar += 1; }
    }
  }

  /* ---- enstrümanlar (hepsi anında sentezlenir; m = MIDI nota, v = seviye, d = süre, wet = yankı payı) ---- */
  _out(g, wet) {
    const m = this.mus;
    g.connect(m ? m.g : this.k.bus);
    if (wet && m) { const s = this.k.ctx.createGain(); s.gain.value = wet; g.connect(s).connect(m.send); }
    return g;
  }
  _vox(t, d, v, a = 0.004, wet = 0, hold = 0) {
    const g = this.k.ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    if (hold) g.gain.linearRampToValueAtTime(Math.max(0.0002, v * 0.85), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d);
    return this._out(g, wet);
  }
  _osc(type, f, t, end) { const o = this.k.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; }
  _flt(type, f, q = 0.8) { const x = this.k.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; }
  _md() { return this.mus ? this.mus.g : this.k.bus; }
  iKick(t, v = 0.34, f0 = 125, f1 = 44, d = 0.22) { const D = this._md(); this.tone(f0, t, d, 'sine', v, f1, 0.002, 0, D); this.noise(t, 0.012, v * 0.3, { type: 'highpass', freq: 3000 }, 0, D); }
  iSnare(t, v = 0.14, d = 0.12) { const D = this._md(); this.noise(t, d, v, { type: 'bandpass', freq: 1900, q: 0.9 }, 0, D); this.tone(215, t, 0.07, 'triangle', v * 0.55, 165, 0.002, 0, D); }
  iBrush(t, v = 0.05, d = 0.16) { this.noise(t, d, v, { type: 'bandpass', freq: 2600, q: 0.5, attack: 0.025 }, 0, this._md()); }
  iClap(t, v = 0.13) { const D = this._md(); for (let k = 0; k < 3; k++) this.noise(t + k * 0.011, 0.02, v * (1 - k * 0.15), { type: 'bandpass', freq: 1500, q: 1.2 }, 0, D); this.noise(t + 0.033, 0.11, v * 0.8, { type: 'bandpass', freq: 1700, q: 1 }, 0, D); }
  iHat(t, v = 0.04, open = false) { this.noise(t, open ? 0.2 : 0.03, v, { type: 'highpass', freq: 7600 }, 0, this._md()); }
  iShk(t, v = 0.02) { this.noise(t, 0.05, v, { type: 'bandpass', freq: 6200, q: 1.4, attack: 0.014 }, 0, this._md()); }
  iRim(t, v = 0.06) { const D = this._md(); this.tone(1750, t, 0.022, 'triangle', v, null, 0.001, 0, D); this.noise(t, 0.014, v * 0.8, { type: 'bandpass', freq: 3200, q: 2 }, 0, D); }
  iWood(t, v = 0.08, f = 900) { const D = this._md(); this.tone(f, t, 0.055, 'sine', v, f * 0.97, 0.001, 0, D); this.tone(f * 2.76, t, 0.025, 'sine', v * 0.3, null, 0.001, 0, D); }
  iTick(t, v = 0.05) { const D = this._md(); this.tone(3100, t, 0.008, 'square', v * 0.6, null, 0.0008, 0, D); this.noise(t, 0.012, v, { type: 'bandpass', freq: 5200, q: 3 }, 0, D); }
  iCowbell(t, v = 0.05) {
    const end = t + 0.35, g = this._vox(t, 0.28, v, 0.002), f = this._flt('bandpass', 760, 2.2);
    f.connect(g); this._osc('square', 545, t, end).connect(f); this._osc('square', 815, t, end).connect(f);
  }
  iTamb(t, v = 0.05) { const D = this._md(); for (let k = 0; k < 3; k++) this.noise(t + k * 0.013, 0.045, v * (1 - k * 0.25), { type: 'highpass', freq: 6800, q: 1.5 }, 0, D); this.tone(7200, t, 0.03, 'square', v * 0.05, null, 0.001, 0, D); }
  iTaiko(t, v = 0.4, f = 70) { const D = this._md(); this.tone(f * 1.9, t, 0.5, 'sine', v, f, 0.002, 0, D); this.noise(t, 0.16, v * 0.55, { type: 'lowpass', freq: 320 }, 0, D); this.tone(f * 3.2, t, 0.07, 'triangle', v * 0.16, f * 1.6, 0.001, 0, D); }
  iKa(t, v = 0.1) { const D = this._md(); this.noise(t, 0.03, v, { type: 'bandpass', freq: 2600, q: 3 }, 0, D); this.tone(1150, t, 0.02, 'triangle', v * 0.5, null, 0.001, 0, D); }
  iGong(t, v = 0.16, f = 98) {
    const P = [[1, 1, 3.4], [1.52, 0.6, 2.7], [2.11, 0.42, 2.1], [2.73, 0.3, 1.6], [3.41, 0.2, 1.2]];
    P.forEach(([r, a, d]) => { const o = this._osc('sine', f * r, t, t + d + 0.2); o.frequency.exponentialRampToValueAtTime(f * r * 0.995, t + d); o.connect(this._vox(t, d, v * a, 0.018, 0.35)); });
    this.noise(t, 0.35, v * 0.5, { type: 'lowpass', freq: 900 }, 0, this._md());
  }
  iCrash(t, v = 0.06) { const D = this._md(); this.noise(t, 1.3, v, { type: 'highpass', freq: 4200 }, 0, D); this.noise(t, 0.5, v * 0.6, { type: 'bandpass', freq: 7000, q: 0.8 }, 0, D); }
  iRiser(t, d = 1.6, v = 0.05) {
    const c = this.k.ctx, g = c.createGain();
    g.gain.value = 0.0001;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
    this._out(g, 0.2);
    const src = c.createBufferSource(); src.buffer = this.k.noise; const f = this._flt('bandpass', 400, 2);
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + d);
    src.connect(f).connect(g); src.start(t); src.stop(t + d + 0.1);
  }
  // bas: 'saw' süzgeçli testere, 'sub' alt sinüs, 'up' kontrbas, 'tuba' bando tubası, 'disco' tıngırtılı oktav bas, 'acid' rezonanslı
  iBass(t, m, d, v = 0.16, kind = 'saw', cut = 900) {
    const f = mtof(m), end = t + d + 0.1;
    if (kind === 'sub') { this._osc('sine', f, t, end).connect(this._vox(t, d, v, 0.006)); return; }
    if (kind === 'up') {
      const g = this._vox(t, d, v, 0.014), lp = this._flt('lowpass', 650, 0.7); lp.connect(g);
      const o = this._osc('triangle', f * 1.012, t, end); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); o.connect(lp);
      this._osc('sine', f, t, end).connect(lp);
      return;
    }
    if (kind === 'tuba') {
      const g = this._vox(t, d, v, 0.03), lp = this._flt('lowpass', 420, 0.9); lp.connect(g);
      this._osc('square', f, t, end).connect(lp); this._osc('sine', f, t, end).connect(g);
      return;
    }
    const g = this._vox(t, d, v, 0.004);
    const lp = this._flt('lowpass', cut, kind === 'acid' ? 7 : 1.1);
    lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(kind === 'disco' ? 260 : 200, t + Math.min(d, kind === 'disco' ? 0.14 : d));
    lp.connect(g);
    this._osc('sawtooth', f, t, end).connect(lp);
    if (kind === 'disco') this._osc('square', f / 2, t, end).connect(lp);
  }
  iPluck(t, m, v = 0.05, d = 0.25, type = 'triangle', cut = 4000, wet = 0) {
    const g = this._vox(t, d, v, 0.003, wet), lp = this._flt('lowpass', cut, 0.9);
    lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, cut * 0.18), t + d);
    lp.connect(g); this._osc(type, mtof(m), t, t + d + 0.05).connect(lp);
  }
  // elektrikli piyano (FM): yumuşak çan saldırısı, sıcak gövde
  iEP(t, m, v = 0.05, d = 1.2, wet = 0.2) {
    const c = this.k.ctx, f = mtof(m), end = t + d + 0.1;
    const g = this._vox(t, d, v, 0.004, wet);
    const car = this._osc('sine', f, t, end), mod = this._osc('sine', f, t, end), mg = c.createGain();
    mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.5);
    mod.connect(mg).connect(car.frequency); car.connect(g);
    this._osc('sine', f * 4, t, t + 0.12).connect(this._vox(t, 0.08, v * 0.18, 0.001));
  }
  iMarimba(t, m, v = 0.06, wet = 0.1) {
    const f = mtof(m);
    this._osc('sine', f, t, t + 0.5).connect(this._vox(t, 0.4, v, 0.002, wet));
    this._osc('sine', f * 4, t, t + 0.1).connect(this._vox(t, 0.05, v * 0.28, 0.001));
    this._osc('sine', f * 9.9, t, t + 0.04).connect(this._vox(t, 0.015, v * 0.07, 0.001));
  }
  iVibe(t, m, v = 0.04, d = 1.4, wet = 0.3) {
    const c = this.k.ctx, f = mtof(m), end = t + d + 0.1;
    const g = this._vox(t, d, v, 0.003, wet), tr = c.createGain(); tr.gain.value = 0.75; tr.connect(g);
    const l = this._osc('sine', 5.6, t, end), lg = c.createGain(); lg.gain.value = 0.25; l.connect(lg).connect(tr.gain);
    this._osc('sine', f, t, end).connect(tr);
    this._osc('sine', f * 4, t, t + 0.2).connect(this._vox(t, 0.14, v * 0.12, 0.001));
  }
  iBell(t, m, v = 0.04, d = 1.6, wet = 0.3) {
    const c = this.k.ctx, f = mtof(m), end = t + d + 0.1;
    const g = this._vox(t, d, v, 0.002, wet), car = this._osc('sine', f, t, end), mod = this._osc('sine', f * 3.5, t, end), mg = c.createGain();
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + d);
    mod.connect(mg).connect(car.frequency); car.connect(g);
  }
  // akordeon: iki hafif akortsuz kare dalga + oktav, titreşim (vibrato), dolgun tutuş
  iAcc(t, m, d, v = 0.04, wet = 0.15) {
    const c = this.k.ctx, f = mtof(m), end = t + d + 0.15;
    const g = this._vox(t, 0.07, v, 0.025, wet, Math.max(0.01, d - 0.05)), lp = this._flt('lowpass', 2300, 1); lp.connect(g);
    const vib = this._osc('sine', 5.6, t, end), vg = c.createGain(); vg.gain.value = 7; vib.connect(vg);
    [[f, -7, 'square', 1], [f, 7, 'square', 1], [f * 2, 0, 'sawtooth', 0.35]].forEach(([ff, dt, ty, a]) => {
      const o = this._osc(ty, ff, t, end); o.detune.value = dt; vg.connect(o.detune);
      if (a < 1) { const ag = c.createGain(); ag.gain.value = a; o.connect(ag).connect(lp); } else o.connect(lp);
    });
  }
  // mandolin tremolosu: aynı notaya hızlı tekrar tıngırtılar
  iMand(t, m, d, v = 0.035, wet = 0.15) {
    const n = Math.max(1, Math.floor(d / 0.058));
    for (let k = 0; k < n; k++) this.iPluck(t + k * 0.058, m, v * (1 - 0.35 * (k / n)) * (k % 2 ? 0.75 : 1), 0.075, 'sawtooth', 3600, wet);
  }
  iBrass(t, m, d, v = 0.045, wet = 0.12) {
    const f = mtof(m), end = t + d + 0.12;
    const g = this._vox(t, 0.08, v, 0.022, wet, Math.max(0.01, d - 0.06)), lp = this._flt('lowpass', 500, 1.4);
    lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(2700, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1400, t + d);
    lp.connect(g);
    [0, 5].forEach((dt) => { const o = this._osc('sawtooth', f, t, end); o.detune.setValueAtTime(dt - 40, t); o.detune.linearRampToValueAtTime(dt, t + 0.05); o.connect(lp); });
  }
  iStr(t, notes, d, v = 0.02, a = 0.02, cut = 2800, wet = 0.2) {
    notes.forEach((m) => {
      const f = mtof(m), g = this._vox(t, Math.min(0.3, d * 0.4), v, a, wet, Math.max(0.01, d - a)), lp = this._flt('lowpass', cut, 0.8);
      lp.connect(g);
      [-9, 9].forEach((dt) => { const o = this._osc('sawtooth', f, t, t + a + d + 0.35); o.detune.value = dt; o.connect(lp); });
    });
  }
  iWah(t, m, d = 0.16, v = 0.04) {
    const f = mtof(m), g = this._vox(t, d, v, 0.004), bp = this._flt('bandpass', 500, 5);
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2300, t + d * 0.35); bp.frequency.exponentialRampToValueAtTime(700, t + d);
    bp.connect(g); this._osc('sawtooth', f, t, t + d + 0.05).connect(bp);
  }
  // şamisen: sert mızrap saldırısı, parlak ve kısa, notaya aşağıdan kayış
  iSham(t, m, v = 0.05, d = 0.32, wet = 0.15) {
    const f = mtof(m), end = t + d + 0.05;
    const g = this._vox(t, d, v, 0.0015, wet), hp = this._flt('highpass', 260, 0.7), lp = this._flt('lowpass', 5200, 1.2);
    lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1100, t + d);
    hp.connect(lp).connect(g);
    const o = this._osc('sawtooth', f, t, end); o.detune.setValueAtTime(60, t); o.detune.exponentialRampToValueAtTime(1, t + 0.04); o.connect(hp);
    const o2 = this._osc('square', f * 2, t, end), g2 = this.k.ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(hp);
    this.noise(t, 0.012, v * 0.9, { type: 'bandpass', freq: 3600, q: 2 }, 0, this._md());
  }
  // flüt (şakuhaçi / ney havası): nefes gürültüsü, gecikmeli vibrato
  iFlute(t, m, d, v = 0.04, wet = 0.35) {
    const c = this.k.ctx, f = mtof(m), end = t + d + 0.25;
    const g = this._vox(t, 0.14, v, 0.09, wet, Math.max(0.01, d - 0.1));
    const vib = this._osc('sine', 5.1, t, end), vg = c.createGain();
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(15, t + Math.min(0.45, d * 0.6)); vib.connect(vg);
    const o = this._osc('sine', f, t, end); vg.connect(o.detune); o.connect(g);
    const o2 = this._osc('triangle', f * 2, t, end), g2 = c.createGain(); g2.gain.value = 0.1; vg.connect(o2.detune); o2.connect(g2).connect(g);
    this.noise(t, d * 0.9, v * 0.16, { type: 'bandpass', freq: f * 2, q: 2.5, attack: 0.06 }, 0, this._md());
  }
  iKoto(t, m, v = 0.05, d = 1.1, wet = 0.3) {
    const f = mtof(m), g = this._vox(t, d, v, 0.002, wet), lp = this._flt('lowpass', 3600, 0.9);
    lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(800, t + d);
    lp.connect(g);
    const o = this._osc('triangle', f, t, t + d + 0.05); o.detune.setValueAtTime(30, t); o.detune.exponentialRampToValueAtTime(1, t + 0.06); o.connect(lp);
    const o2 = this._osc('sine', f * 2, t, t + d + 0.05), g2 = this.k.ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2).connect(lp);
  }
  iPizz(t, m, v = 0.05, d = 0.17, wet = 0.15) {
    const f = mtof(m), g = this._vox(t, d, v, 0.002, wet), lp = this._flt('lowpass', 1900, 0.8);
    lp.connect(g); this._osc('triangle', f, t, t + d + 0.05).connect(lp);
    const o = this._osc('sawtooth', f, t, t + d + 0.05), gg = this.k.ctx.createGain(); gg.gain.value = 0.35; o.connect(gg).connect(lp);
  }
  iPad(t, notes, d, v = 0.03, cut = 1100, wet = 0.25) { this.iStr(t, notes, d, v, 0.45, cut, wet); }

  // Kurye Yarışı müziği: hızlı şehir koşusu (La m – Fa – Do – Sol). Yarışta dört vuruş bas davul, açık zil arada,
  // yuvarlanan rezonanslı bas (hız arttıkça süzgeç açılır), ritim dışı akor vuruşları, 4. ölçüden sonra arpej
  beat(t, s, bar, spb, st = spb / 4) {
    const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const ch = CH[bar % 4], r = ch[0] - 24;
    const I = this.int || 0;
    if (this.mode === 'race') {
      if (s % 4 === 0) this.iKick(t, 0.36);
      if (s === 4 || s === 12) this.iClap(t, 0.13);
      if (s % 2 === 1) this.iHat(t, 0.035 + 0.02 * I);
      if (s % 4 === 2) this.iHat(t, 0.06, true);
      const bp = [0, 0, 12, 0, 0, 12, 0, 7][s % 8];
      this.iBass(t, r + bp, st * 0.85, s % 4 === 0 ? 0.15 : 0.11, 'acid', 380 + 1500 * I + (s % 4 === 2 ? 400 : 0));
      if ((s === 3 || s === 11) && bar % 2 === 1) this.iStr(t, ch.map((m) => m + 12), st * 1.5, 0.022, 0.006, 3200, 0.15);
      if (bar % 8 >= 2) { const arp = [0, 1, 2, 1, 2, 0, 1, 2]; this.iPluck(t, ch[arp[s % 8]] + (s % 8 >= 4 ? 24 : 12), 0.03, st * 1.4, 'square', 2600 + 1600 * I, 0.25); }
      if (bar % 8 === 7 && s >= 12) this.iSnare(t, 0.06 + (s - 12) * 0.025);
      if (bar % 8 === 0 && s === 0 && bar > 0) this.iCrash(t, 0.05);
    } else if (this.mode === 'idle') {
      if (s === 0) { this.iPad(t, ch, spb * 4, 0.022, 1000); this.iBass(t, r, spb * 1.6, 0.14, 'sub'); }
      if (s === 0 || s === 10) this.iKick(t, 0.2, 110, 45);
      if (s === 4 || s === 12) this.iRim(t, 0.05);
      if (s % 4 === 2) this.iHat(t, 0.03);
      if ([0, 3, 6, 10].includes(s)) this.iEP(t, ch[[0, 2, 1, 2][[0, 3, 6, 10].indexOf(s)]] + 12, 0.035, spb * 1.2);
    } else {
      if (s === 0) { this.iPad(t, ch.map((m) => m + 12), spb * 4, 0.02, 1200); this.iBass(t, r, spb * 2, 0.1, 'sub'); }
      if ([0, 3, 6, 10].includes(s)) this.iEP(t, ch[[0, 1, 2, 1][[0, 3, 6, 10].indexOf(s)]] + 12, 0.04, spb * 1.6);
      if (s % 4 === 2) this.iShk(t, 0.015);
    }
  }

  // ---- ortam sesleri ----
  // kind: 'fire' | 'diner' | 'city' | 'alley' | 'night' (birden çok: 'diner+fire'); vol: genel seviye
  amb(kind, vol = 1) {
    if (!kind) { this.ambWant = null; this.stopAmb(); return; }
    this.ambWant = { kind, vol };
    if (this.ab && this.ab.kind === kind) { this.ab.vol = vol; return; }
    this.stopAmb();
    if (!this.live()) {
      // ses bağlamı ilk dokunuşta açılır: o zaman başlat
      if (!this.ambWait) this.ambWait = setInterval(() => { if (this.live() && this.ambWant) { clearInterval(this.ambWait); this.ambWait = null; this.amb(this.ambWant.kind, this.ambWant.vol); } }, 500);
      return;
    }
    const k = this.k, c = k.ctx;
    const out = c.createGain();
    out.gain.value = 0.0001;
    out.connect(k.bus);
    const srcs = [], mods = [];
    const bed = (type, freq, q, g, rate = 1) => {
      const src = c.createBufferSource();
      src.buffer = k.noise; src.loop = true; src.playbackRate.value = rate;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const gg = c.createGain(); gg.gain.value = g;
      src.connect(f).connect(gg).connect(out);
      src.start(0, Math.random() * 1.5);
      srcs.push(src);
      return { f, gg, g };
    };
    const parts = kind.split('+');
    if (parts.includes('fire')) { bed('lowpass', 420, 0.7, 0.55, 0.5); mods.push({ b: bed('bandpass', 1100, 0.9, 0.12), k: 'flick' }); }
    if (parts.includes('diner')) { mods.push({ b: bed('bandpass', 520, 1.2, 1.1), k: 'murmur' }); mods.push({ b: bed('bandpass', 1350, 1.6, 0.3), k: 'murmur' }); }
    if (parts.includes('city')) { bed('lowpass', 180, 0.6, 1.2, 0.6); mods.push({ b: bed('bandpass', 700, 0.7, 0.17), k: 'swell' }); }
    if (parts.includes('alley')) { bed('lowpass', 260, 0.8, 0.9, 0.7); mods.push({ b: bed('bandpass', 600, 1.3, 0.34), k: 'murmur' }); }
    if (parts.includes('night')) { bed('lowpass', 300, 0.7, 0.18, 0.6); }
    if (parts.includes('sea')) { mods.push({ b: bed('lowpass', 620, 0.5, 1.0), k: 'swell' }); mods.push({ b: bed('bandpass', 2600, 0.6, 0.2), k: 'swell' }); }
    if (parts.includes('wind')) { mods.push({ b: bed('bandpass', 420, 1.4, 0.7), k: 'swell' }); bed('lowpass', 200, 0.6, 0.3, 0.5); }
    if (parts.includes('rain')) { bed('bandpass', 2400, 0.45, 1.25, 0.9); mods.push({ b: bed('highpass', 5200, 0.6, 0.42), k: 'swell' }); bed('lowpass', 520, 0.6, 0.35, 0.5); }
    const ab = { kind, vol, out, srcs, mods, parts, t: 0 };
    ab.timer = setInterval(() => this.ambTick(), 90);
    this.ab = ab;
  }
  ambTick() {
    const ab = this.ab;
    if (!ab || !this.live()) return;
    const c = this.k.ctx, t = c.currentTime;
    const muted = sfx.isMuted() || (typeof document !== 'undefined' && document.hidden);
    ab.out.gain.setTargetAtTime(muted ? 0.0001 : 0.16 * ab.vol, t, 0.4);
    if (muted) return;
    ab.mods.forEach((m) => {
      const b = m.b;
      if (m.k === 'flick') b.gg.gain.setTargetAtTime(b.g * (0.4 + Math.random() * 1.2), t, 0.05);
      else if (m.k === 'murmur') b.gg.gain.setTargetAtTime(b.g * (0.55 + Math.random() * 0.9), t, 0.35);
      else if (m.k === 'swell') b.gg.gain.setTargetAtTime(b.g * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.25))), t, 0.8);
    });
    const P = ab.parts, R = Math.random();
    const pop = (dur, vol, freq, type = 'highpass') => this.noise(t + Math.random() * 0.08, dur, vol, { type, freq, q: 1.2, attack: 0.001 }, (Math.random() - 0.5) * 0.8, ab.out);
    if (P.includes('fire')) {
      // odun çıtırtısı: kısa tıkırtılar, ara sıra patlama
      if (R < 0.55) pop(0.008 + Math.random() * 0.02, 0.5 + Math.random() * 0.8, 1800 + Math.random() * 3000);
      if (R < 0.05) { pop(0.03, 1.2, 900, 'bandpass'); pop(0.012, 0.9, 3500); }
    }
    if (P.includes('diner')) {
      // tabak-çatal şıngırtısı
      if (R < 0.035) { const f = 2200 + Math.random() * 2400; this.tone(f, t, 0.06, 'sine', 0.08, f * 0.98, 0.001, (Math.random() - 0.5) * 0.9, ab.out); this.tone(f * 1.5, t + 0.012, 0.05, 'sine', 0.05, null, 0.001, 0, ab.out); }
      if (R > 0.985) this.noise(t, 0.12, 0.25, { type: 'bandpass', freq: 3200, q: 2 }, 0, ab.out);
    }
    if (P.includes('city')) {
      // uzaktan korna ya da geçen araç
      if (R < 0.006) { const f = 330 + Math.random() * 120; this.tone(f, t, 0.35, 'square', 0.05, f * 0.98, 0.02, (Math.random() - 0.5), ab.out); this.tone(f * 1.26, t, 0.35, 'square', 0.035, null, 0.02, 0, ab.out); }
      if (R > 0.985) this.noise(t, 1.6, 0.35, { type: 'bandpass', freq: 400, to: 900, q: 0.7, attack: 0.7 }, (Math.random() - 0.5) * 1.4, ab.out);
    }
    if (P.includes('alley')) {
      // uzak kulvarda devrilen şişeler
      if (R < 0.012) { for (let i = 0; i < 4; i++) this.tone(1500 + Math.random() * 1400, t + 0.6 + i * 0.03, 0.06, 'triangle', 0.035, 900, 0.001, 0.6, ab.out); this.noise(t + 0.6, 0.25, 0.25, { type: 'bandpass', freq: 1600, q: 1.2 }, 0.6, ab.out); this.noise(t, 0.7, 0.2, { type: 'lowpass', freq: 260 }, 0.5, ab.out); }
    }
    if (P.includes('rain')) {
      // çatıdan, tenteden, kaporta üstünden damla tıkırtıları
      for (let i = 0; i < 2; i++) if (Math.random() < 0.6) pop(0.003 + Math.random() * 0.006, 0.18 + Math.random() * 0.4, 3500 + Math.random() * 5000);
      if (R < 0.04) this.noise(t, 0.35, 0.22, { type: 'bandpass', freq: 900, q: 0.8, attack: 0.08 }, (Math.random() - 0.5) * 1.2, ab.out);
    }
    if (P.includes('night')) {
      // cırcır böcekleri
      if (R < 0.3) { const f = 4200 + Math.random() * 600, pn = (Math.random() - 0.5) * 1.6; for (let i = 0; i < 3; i++) this.tone(f, t + i * 0.05, 0.025, 'sine', 0.035, null, 0.003, pn, ab.out); }
    }
  }
  stopAmb() {
    const ab = this.ab;
    if (this.ambWait && !this.ambWant) { clearInterval(this.ambWait); this.ambWait = null; }
    if (!ab) return;
    this.ab = null;
    clearInterval(ab.timer);
    try {
      const t = this.k.ctx.currentTime;
      ab.out.gain.cancelScheduledValues(t);
      ab.out.gain.setTargetAtTime(0.0001, t, 0.2);
      setTimeout(() => { ab.srcs.forEach((x) => { try { x.stop(); } catch { /* durdu */ } }); try { ab.out.disconnect(); } catch { /* yok */ } }, 1200);
    } catch { /* yok say */ }
  }
  stopAll() { this.stopEngine(); this.stopMusic(); this.ambWant = null; if (this.ambWait) { clearInterval(this.ambWait); this.ambWait = null; } this.stopAmb(); }
}

/* ============================ arayüz (HUD) ============================ */

const STYLE = `
#ky{position:fixed;inset:0;z-index:50;background:#0d0b1a;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font-family:'Bricolage Grotesque',system-ui,sans-serif;color:#fff;--ink:rgb(var(--c-murekkep,18 14 34));--lim:rgb(var(--c-limon,255 210 63));--ort:rgb(var(--c-ortu,255 246 233))}
#ky canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#ky .lbls,#ky .fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#ky .lbl{position:absolute;left:0;top:0;white-space:nowrap;font-size:12px;font-weight:800;padding:2px 8px 2px 6px;border-radius:99px;background:rgba(12,10,26,.62);border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;gap:5px;will-change:transform}
#ky .lbl .dots{display:inline-flex;align-items:center;gap:2px;margin-left:1px}#ky .lbl .dots:empty{display:none}#ky .lbl .dots b{width:9px;height:9px;border-radius:50%;border:1.5px solid rgba(255,255,255,.85)}#ky .lbl .dots em{font-style:normal;font-size:11px;opacity:.85;margin-left:1px}
#ky .lbl i{width:9px;height:9px;border-radius:99px;display:inline-block;border:1.5px solid #fff}
#ky .fl{position:absolute;left:0;top:0;font-weight:800;font-size:22px;text-shadow:0 2px 0 rgba(0,0,0,.4);animation:kyfl .8s ease-out forwards}
@keyframes kyfl{0%{opacity:0;margin-top:0}15%{opacity:1}100%{opacity:0;margin-top:-56px}}
#ky .vig{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;box-shadow:inset 0 0 120px 40px rgba(64,220,255,.55)}
#ky .vig.on{opacity:1}
#ky .vig.hit{box-shadow:inset 0 0 120px 46px rgba(255,40,40,.55)}
#ky .vig.wet{box-shadow:inset 0 0 120px 46px rgba(60,140,255,.55)}
#ky .vig.tb{opacity:.85;box-shadow:inset 0 0 90px 30px rgba(64,220,255,.5)}
#ky .cb.glow{border-color:var(--lim);box-shadow:0 0 0 4px rgba(255,210,63,.45),0 0 26px rgba(255,210,63,.8);animation:kyhint .5s ease-in-out infinite alternate}
@keyframes kyhint{from{transform:scale(1)}to{transform:scale(1.1)}}
#ky .tip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 150px);font-weight:800;font-size:18px;background:var(--lim);color:var(--ink);border:3px solid var(--ink);border-radius:16px;padding:6px 12px;box-shadow:3px 3px 0 var(--ink);pointer-events:none;white-space:nowrap;display:none}
#ky .tip.on{display:block;animation:kyin .25s ease-out}
#ky .toastk{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 96px);font-weight:800;font-size:16px;background:rgba(12,10,26,.75);border:2px solid rgba(255,255,255,.55);border-radius:14px;padding:6px 12px;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .2s}
#ky .toastk.on{opacity:1}
#ky .hud{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 10px) calc(env(safe-area-inset-right,0px) + 12px) 0 calc(env(safe-area-inset-left,0px) + 12px);pointer-events:none}
#ky .r1{display:flex;align-items:center;gap:7px}
#ky .pos{font-weight:800;line-height:1;background:var(--lim);color:var(--ink);border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink);border-radius:16px;padding:5px 11px 6px;min-width:58px;text-align:center;transition:transform .15s}
#ky .pos b{font-size:30px}#ky .pos small{font-size:15px;opacity:.75}
#ky .pos.pulse{transform:scale(1.18)}
#ky .sp{flex:1}
#ky .tm{font-weight:800;font-size:17px;background:rgba(12,10,26,.55);border-radius:12px;padding:5px 9px;font-variant-numeric:tabular-nums;white-space:nowrap}
#ky .ib{pointer-events:auto;width:38px;height:38px;border-radius:99px;border:2px solid var(--ink);background:rgba(255,255,255,.88);font-size:17px;display:grid;place-items:center;box-shadow:2px 2px 0 var(--ink);color:#111;padding:0}
#ky .ib.arm{background:#ff4d4d;color:#fff;width:auto;padding:0 10px;font-weight:800;font-size:14px}
#ky .bar{position:relative;height:14px;margin:12px 14px 0 4px;border-radius:99px;background:rgba(10,8,24,.5);border:2px solid rgba(255,255,255,.8)}
#ky .bar .fill{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:rgba(255,255,255,.28)}
#ky .dot{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:99px;border:2px solid #111}
#ky .dot.me{width:20px;height:20px;margin:-10px 0 0 -10px;border:3px solid #fff;z-index:3;box-shadow:0 0 0 2px var(--ink)}
#ky .flag{position:absolute;right:-16px;top:-12px;font-size:20px}
#ky .meter{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 104px);display:flex;align-items:center;gap:6px;pointer-events:none;background:rgba(12,10,26,.55);border-radius:99px;padding:4px 10px 4px 6px;border:2px solid rgba(255,255,255,.35)}
#ky .meter .ic{font-size:20px}
#ky .seg{display:flex;gap:3px}
#ky .seg i{width:11px;height:14px;border-radius:4px;background:rgba(255,255,255,.22)}
#ky .seg i.f{background:var(--lim);box-shadow:0 0 6px var(--lim)}
#ky .meter .tb{font-weight:800;font-size:13px;letter-spacing:.06em;opacity:.45}
#ky .meter.hot{border-color:#40dcff;box-shadow:0 0 18px rgba(64,220,255,.7)}
#ky .meter.hot .tb{opacity:1;color:#40dcff}
#ky .meter.hot .seg i{background:#40dcff;box-shadow:0 0 6px #40dcff}
#ky .ctl{position:absolute;left:0;right:0;bottom:0;padding:0 calc(env(safe-area-inset-right,0px) + 14px) calc(env(safe-area-inset-bottom,0px) + 16px) calc(env(safe-area-inset-left,0px) + 14px);display:flex;justify-content:space-between;align-items:flex-end;pointer-events:none;transition:opacity .3s}
#ky .ctl.off{opacity:0}
#ky .cb{pointer-events:auto;width:78px;height:78px;border-radius:26px;background:rgba(12,10,26,.42);border:3px solid rgba(255,255,255,.75);color:#fff;font-size:34px;font-weight:800;display:grid;place-items:center;padding:0;line-height:1;-webkit-tap-highlight-color:transparent}
#ky .cb.j{width:96px;border-radius:30px;font-size:15px;letter-spacing:.05em}
#ky .cb.j span{display:block;font-size:30px;line-height:.9}
#ky .cb.on{background:rgba(255,255,255,.4);transform:scale(.93)}
/* tek el: düğmeler başparmağın döndüğü köşede toplanır (zıpla üstte, ◀ ▶ altta); turbo göstergesi karşı köşeye geçer */
#ky.hand-r .ctl,#ky.hand-l .ctl{left:auto;right:0;display:grid;grid-template-columns:auto auto;grid-template-areas:"j j" "l r";gap:10px;justify-items:stretch;align-items:end}
#ky.hand-l .ctl{left:0;right:auto}
#ky.hand-r .cb.l,#ky.hand-l .cb.l{grid-area:l;order:0}#ky.hand-r .cb.r,#ky.hand-l .cb.r{grid-area:r;order:0}
#ky.hand-r .cb.j,#ky.hand-l .cb.j{grid-area:j;order:0;margin:0;width:auto;height:70px;border-radius:24px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:16px}
#ky.hand-r .cb.j span,#ky.hand-l .cb.j span{display:inline;font-size:28px}
#ky.hand-r .meter,#ky.hand-l .meter{transform:none;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);padding:4px 8px 4px 5px;gap:4px}
#ky.hand-r .meter{left:calc(env(safe-area-inset-left,0px) + 12px)}#ky.hand-l .meter{left:auto;right:calc(env(safe-area-inset-right,0px) + 12px)}
#ky.hand-r .meter .tb,#ky.hand-l .meter .tb{display:none}#ky.hand-r .meter.hot .tb,#ky.hand-l .meter.hot .tb{display:inline}
#ky.hand-r .seg i,#ky.hand-l .seg i{width:8px}#ky.hand-r .seg,#ky.hand-l .seg{gap:2px}
#ky.hand-r .tip,#ky.hand-l .tip{bottom:calc(env(safe-area-inset-bottom,0px) + 196px)}
@media (max-width:350px){#ky.hand-r .cb.l,#ky.hand-r .cb.r,#ky.hand-l .cb.l,#ky.hand-l .cb.r{width:68px;height:68px}#ky.hand-r .cb.j,#ky.hand-l .cb.j{height:62px}}
#ky .elsec{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:10px;font-size:13px;font-weight:700}
#ky .elsec>span{opacity:.7;margin-right:2px}
#ky .elsec button{border:2px solid var(--ink);border-radius:99px;background:#fff;color:var(--ink);font:inherit;font-weight:800;padding:5px 11px;cursor:pointer}
#ky .elsec button.on{background:var(--ink);color:#fff}
#ky .msg{position:absolute;left:0;right:0;top:30%;text-align:center;pointer-events:none}
#ky .msg span{display:inline-block;font-weight:800;font-size:60px;line-height:1;color:#fff;-webkit-text-stroke:3px var(--ink);text-shadow:0 5px 0 var(--ink);animation:kypop 1.1s ease-out forwards;padding:0 12px}
#ky .msg span.big{font-size:110px}
#ky .msg span.mid{font-size:44px}
#ky .msg span.gold{color:var(--lim)}
#ky .msg span.cyan{color:#5ff0ff}
#ky .msg span.red{color:#ff5a5a}
#ky .msg span.stay{animation:kystay .4s ease-out forwards}
@keyframes kypop{0%{transform:scale(.3);opacity:0}18%{transform:scale(1.12);opacity:1}30%{transform:scale(1)}78%{opacity:1}100%{transform:scale(1.04);opacity:0}}
@keyframes kystay{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
#ky .note{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 92px);background:rgba(12,10,26,.72);border:2px solid rgba(255,255,255,.5);border-radius:16px;padding:8px 14px;font-weight:700;font-size:14px;text-align:center;pointer-events:none;max-width:88%;display:none}
#ky .note.on{display:block}
#ky .emb{font-size:19px}
#ky .em-pal{position:absolute;right:calc(env(safe-area-inset-right,0px) + 10px);top:calc(env(safe-area-inset-top,0px) + 58px);display:none;grid-template-columns:repeat(4,46px);gap:6px;padding:8px;border-radius:20px;background:rgba(12,10,26,.84);border:2px solid rgba(255,255,255,.4);z-index:12;pointer-events:auto;box-shadow:0 8px 24px rgba(0,0,0,.4)}
#ky .em-pal.on{display:grid;animation:kyin .18s ease-out}
#ky .em-pal button{width:46px;height:46px;border-radius:14px;border:0;background:rgba(255,255,255,.1);font-size:27px;line-height:1;padding:0;display:grid;place-items:center;-webkit-tap-highlight-color:transparent}
#ky .em-pal button:active{transform:scale(.86);background:rgba(255,255,255,.28)}
#ky .em-lay{position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden}
#ky .em-b{position:absolute;left:0;top:0;will-change:transform,opacity;transform-origin:50% 100%}
#ky .em-b b{display:grid;place-items:center;width:54px;height:54px;border-radius:99px;background:#fff;font-size:33px;line-height:1;box-shadow:0 5px 16px rgba(0,0,0,.35);border:3px solid rgba(0,0,0,.08);position:relative}
#ky .em-b b::after{content:'';position:absolute;left:50%;bottom:-9px;margin-left:-8px;border:8px solid transparent;border-top-color:#fff;border-bottom:0}
#ky .em-b.side{display:flex;align-items:center;gap:7px;background:rgba(12,10,26,.78);border-radius:99px;padding:3px 13px 3px 3px;color:#fff;font-weight:800;font-size:14px;white-space:nowrap;transform-origin:100% 50%}
#ky .em-b.side b{width:38px;height:38px;font-size:23px;box-shadow:none}
#ky .em-b.side b::after{display:none}
#ky .panel{position:absolute;inset:0;z-index:6;display:none;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 14px) calc(env(safe-area-inset-right,0px) + 14px) calc(env(safe-area-inset-bottom,0px) + 14px) calc(env(safe-area-inset-left,0px) + 14px);background:rgba(10,8,24,.38);pointer-events:auto}
#ky .panel.on{display:flex}
#ky .panel.low{align-items:flex-end;background:linear-gradient(transparent 40%,rgba(10,8,24,.55));pointer-events:none}
#ky .panel.low .card{pointer-events:auto}
@media (min-aspect-ratio:5/4){#ky .panel.low{align-items:center;justify-content:flex-end;background:linear-gradient(90deg,transparent 45%,rgba(10,8,24,.55))}#ky .panel.low .card{max-width:400px}}
#ky .card{width:100%;max-width:420px;max-height:100%;overflow:auto;border-radius:28px;border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);background:var(--ort);color:var(--ink);padding:18px 18px 16px;animation:kyin .35s cubic-bezier(.2,1.5,.4,1)}
@keyframes kyin{from{opacity:0;transform:translateY(16px) scale(.96)}}
#ky .tt{font-size:28px;font-weight:800;line-height:1.05}
#ky .sub{margin-top:4px;font-weight:700;opacity:.7;font-size:15px}
#ky .how{margin-top:12px;display:grid;gap:7px}
#ky .how div{display:flex;align-items:center;gap:10px;font-size:15px;line-height:1.2}
#ky .how .k{flex:0 0 46px;height:34px;border-radius:12px;border:3px solid var(--ink);background:var(--lim);display:grid;place-items:center;font-size:18px;font-weight:800}
#ky .how small{display:block;opacity:.65;font-size:13px}
#ky .who{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
#ky .chip{display:inline-flex;align-items:center;gap:5px;border:2px solid var(--ink);border-radius:99px;padding:3px 9px 3px 5px;font-weight:700;font-size:13px;background:#fff}
#ky .chip i{width:12px;height:12px;border-radius:99px;border:2px solid var(--ink)}
#ky .cd{margin-top:12px;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
#ky .cd b{font-size:30px;font-variant-numeric:tabular-nums}
#ky .kb{display:block;width:100%;margin-top:10px;border-radius:18px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:var(--lim);color:var(--ink);font-weight:800;font-size:18px;padding:12px 14px}
#ky .kb.alt{background:#fff}
#ky .res{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:5px}
#ky .res li{display:flex;align-items:center;gap:8px;border-radius:14px;padding:6px 8px;background:rgba(0,0,0,.05);font-weight:700;font-size:15px}
#ky .res li.me{background:var(--lim);border:2px solid var(--ink)}
#ky .pd{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:8px;margin:10px 0 4px;padding-top:16px;overflow:hidden;border-radius:16px;background:radial-gradient(ellipse at 50% 100%,rgba(255,200,40,.28),rgba(255,200,40,0) 72%)}
#ky .pd-c{position:relative;display:flex;flex-direction:column;align-items:center;width:31%;max-width:112px;min-width:0;animation:pdu .65s cubic-bezier(.2,1.35,.4,1) both}
#ky .pd-c.p1{animation-delay:.5s}#ky .pd-c.p2{animation-delay:.25s}#ky .pd-c.p3{animation-delay:.05s}
@keyframes pdu{from{opacity:0;transform:translateY(46px)}to{opacity:1;transform:none}}
#ky .pd-av{width:40px;height:40px;border-radius:50%;background:var(--c);display:grid;place-items:center;font-weight:900;font-size:18px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5);border:3px solid #fff;box-shadow:0 3px 0 var(--ink)}
#ky .pd-c.p1 .pd-av{width:52px;height:52px;font-size:23px}
#ky .pd-c.me .pd-av{outline:3px solid var(--ink);outline-offset:1px}
#ky .pd-crown{font-size:24px;line-height:1;margin-bottom:-5px;animation:pdc 1.3s ease-in-out infinite alternate}
@keyframes pdc{from{transform:translateY(0) rotate(-7deg)}to{transform:translateY(-5px) rotate(7deg)}}
#ky .pd-nm{font-weight:800;font-size:12px;margin:4px 0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky .pd-b{width:100%;border-radius:12px 12px 4px 4px;border:3px solid var(--ink);border-bottom:0;display:flex;flex-direction:column;align-items:center;padding-top:5px;color:#fff;box-shadow:inset 0 -8px 0 rgba(0,0,0,.12),inset 0 4px 0 rgba(255,255,255,.35)}
#ky .pd-c.p1 .pd-b{background:linear-gradient(#ffd54a,#e9a91a)}#ky .pd-c.p2 .pd-b{background:linear-gradient(#e6ebf1,#a9b3be)}#ky .pd-c.p3 .pd-b{background:linear-gradient(#f2a96f,#c46a29)}
#ky .pd-b b{font-size:24px;font-weight:900;line-height:1;text-shadow:0 2px 0 rgba(0,0,0,.22)}
#ky .pd-b span{font-size:12px;font-weight:800;text-shadow:0 1px 1px rgba(0,0,0,.3)}
#ky .pd-cf{position:absolute;inset:0;pointer-events:none}
#ky .pd-cf i{position:absolute;top:-14px;left:var(--x);width:7px;height:11px;background:var(--h);border-radius:2px;opacity:0;animation:pdf var(--t) linear var(--d) infinite}
@keyframes pdf{0%{opacity:0;transform:translateY(0) rotate(var(--r))}10%{opacity:1}100%{opacity:.85;transform:translateY(200px) rotate(calc(var(--r) + 540deg))}}
@media (prefers-reduced-motion:reduce){#ky .pd-cf{display:none}#ky .pd-c,#ky .pd-crown{animation:none}}
@media (max-height:560px){#ky .pd{display:none}}
@media (max-height:700px) and (orientation:portrait){
#ky .card{padding:13px 14px 12px}
#ky .tt{font-size:23px}
#ky .how{margin-top:8px;gap:5px}
#ky .how div{font-size:13.5px;gap:8px}
#ky .how small{display:none}
#ky .how .k{flex-basis:38px;height:28px;font-size:15px;border-radius:10px}
#ky .pd{transform:scale(.86);transform-origin:50% 100%;margin:2px 0 -6px}
}
#ky .r1>.ib{flex:none}
@media (max-width:400px){#ky .ib{width:34px;height:34px;font-size:15px}#ky .r1{gap:5px}}
@media (max-width:370px){#ky .tm{font-size:15px;padding:5px 7px}#ky .ib{width:34px;height:34px;font-size:15px}#ky .r1{gap:5px}}
@media (max-width:340px){#ky .ib{width:31px;height:31px;font-size:14px}#ky .r1{gap:3px}#ky .tm{font-size:14px;padding:4px 6px}#ky .r1>.pos{min-width:44px;padding-left:7px;padding-right:7px}#ky .r1>.mg-ko,#ky .r1>.su-ko,#ky .r1>.kk-sc{padding-left:6px;padding-right:6px;font-size:13px}}
#ky .res .pl{width:28px;text-align:center;font-size:18px}
#ky .res i{width:12px;height:12px;border-radius:99px;border:2px solid var(--ink);flex:0 0 auto}
#ky .res .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ky .res .t{font-variant-numeric:tabular-nums;opacity:.8;font-size:14px}
#ky .res .p{font-weight:800;min-width:38px;text-align:right}
#ky .best{margin-top:10px;font-size:14px;font-weight:700;opacity:.85}
#ky .hint{margin-top:10px;font-size:13px;opacity:.65;text-align:center}
@media (min-width:700px){#ky .cb{width:86px;height:86px}#ky .cb.j{width:108px}}
#ky .how>div:only-child{grid-column:1/-1}
/* kısa dikey ekran (ör. küçük iPhone + tarayıcı çubukları): düğmeler biraz küçülür, gösterge aşağı iner */
@media (orientation:portrait) and (max-height:620px){
#ky .ctl{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
#ky .cb{width:68px;height:68px;border-radius:22px;font-size:30px}
#ky .cb.j{width:88px;border-radius:26px;font-size:14px}
#ky .cb.j span{font-size:26px}
#ky .meter{bottom:calc(env(safe-area-inset-bottom,0px) + 90px)}
#ky .tip{bottom:calc(env(safe-area-inset-bottom,0px) + 134px)}
}
/* yatay telefon (alçak ekran): sol başparmak şerit, sağ başparmak zıplama; orta boş kalır, kartlar kaydırmasız sığar */
@media (orientation:landscape) and (max-height:520px){
#ky .hud{padding-top:calc(env(safe-area-inset-top,0px) + 8px)}
#ky .pos{padding:4px 9px 5px;min-width:50px}#ky .pos b{font-size:24px}#ky .pos small{font-size:13px}
#ky .ib{width:34px;height:34px;font-size:15px}
#ky .bar{margin-top:8px}
#ky .ctl{justify-content:flex-start;gap:12px;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
#ky .cb{width:72px;height:72px;border-radius:24px}
#ky .cb.l{order:1}#ky .cb.r{order:2}
#ky .cb.j{order:3;margin-left:auto;width:104px;height:80px}
#ky .meter{bottom:calc(env(safe-area-inset-bottom,0px) + 16px)}
#ky .tip{top:calc(env(safe-area-inset-top,0px) + 76px);bottom:auto}
#ky .note{top:calc(env(safe-area-inset-top,0px) + 76px)}
#ky .toastk{top:calc(env(safe-area-inset-top,0px) + 118px)}
#ky .msg{top:22%}
#ky .msg span{font-size:48px}#ky .msg span.big{font-size:88px}#ky .msg span.mid{font-size:36px}
#ky .card{padding:12px 14px;border-radius:22px;box-shadow:4px 4px 0 var(--ink)}
#ky .tt{font-size:22px}
#ky .sub{font-size:13px;margin-top:2px}
#ky .how{grid-template-columns:1fr 1fr;gap:6px 10px;margin-top:8px}
#ky .how div{font-size:13px;gap:7px}
#ky .how small{display:none}
#ky .how .k{flex-basis:38px;height:28px;font-size:15px;border-radius:10px}
#ky .who{margin-top:8px;gap:4px}
#ky .chip{font-size:12px;padding:2px 8px 2px 4px}
#ky .cd{margin-top:8px;font-size:14px}#ky .cd b{font-size:24px}
#ky .kb{margin-top:8px;padding:8px 12px;font-size:16px;border-radius:14px;box-shadow:3px 3px 0 var(--ink)}
#ky .res{margin-top:8px;gap:3px}#ky .res li{padding:3px 8px;font-size:14px}
#ky .best{margin-top:6px;font-size:13px}
#ky .panel.low .card{max-width:min(400px,56vw)}
#ky .panel.low{padding-top:calc(env(safe-area-inset-top,0px) + 52px)}
#ky .panel.low .who{display:none}
}
@media (orientation:landscape) and (max-height:520px) and (max-width:700px){#ky .seg i{width:8px}#ky .meter .tb{display:none}}
@media (prefers-reduced-motion:reduce){#ky .msg span,#ky .card,#ky .fl{animation-duration:.01s}}
`;

function injectStyle() {
  if (document.getElementById('ky-style')) return;
  const st = document.createElement('style');
  st.id = 'ky-style';
  st.textContent = STYLE;
  document.head.appendChild(st);
}

const HAZARD_C = [1, 0.58, 0.1];
const LIGHT_OFF = new Float32Array([0.25, 0.25, 0.28]);
const LIGHT_RED = new Float32Array([1, 0.15, 0.1]);
const LIGHT_GO = new Float32Array([0.2, 1, 0.45]);
const HEAD_GLOW = new Float32Array([1, 0.85, 0.6]);
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : `${p}.`);
const vibrate = (p) => {
  try {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // dokunmadan titreşim engellenir
    navigator.vibrate?.(p);
  } catch { /* desteklenmiyor */ }
};
// Dikey görüş açısı: dar ekranda yatay açı sabit (40°), geniş ekranda dikey 58°
const baseFov = (asp) => clamp(asp < 1 ? 2 * Math.atan(Math.tan((20 * Math.PI) / 180) / asp) : (58 * Math.PI) / 180, (54 * Math.PI) / 180, (80 * Math.PI) / 180);

/* ============================ oyun ============================ */

class Game {
  constructor(ctx) {
    injectStyle();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.food = this.brand.foods;
    this.dead = false;
    this.view = null;
    this.seed = null;
    this.world = null;
    this.me = null;
    this.simT = 0;
    this.inp = { l: 0, r: 0, j: 0 };
    this.ghosts = new Map();
    this.parts = [];
    this.knock = new Map();
    this.time = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.scale = 1;
    this.frameAvg = 16;
    this.slowFor = 0;
    this.fastFor = 0;
    this.cam = { x: 0, y: 6, z: 8, tx: 0, ty: 1, tz: -10, mode: '', blend: 1, px: 0, py: 0, pz: 0, ptx: 0, pty: 0, ptz: 0 };
    this.place = 0;
    this.panelKey = '';
    this.lastBeep = 99;
    this.snd = new Snd();
    this.mats = { a: M.make(), b: M.make(), c: M.make(), sky: M.make(), V: M.make(), P: M.make(), VP: M.make() };
    this.buildDom();
    try { this.snd.amb('city', 0.7); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd && this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[kurye] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand).kurye(); } catch (e) {
        console.warn('[kurye] kaynak', e);
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
    this.hand = handLoad();
    w.classList.add('hand-' + this.hand);
    w.innerHTML = `
      <canvas aria-label="Kurye Yarışı 3D sahnesi"></canvas>
      <div class="lbls"></div><div class="fx"></div><div class="vig"></div>
      <div class="hud">
        <div class="r1">
          <div class="pos"><b>–</b><small></small></div>
          <div class="sp"></div>
          <div class="tm">0,0 sn</div>
          <button class="ib mu ${sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
          <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted() ? '🔇' : '🔊'}</button>
          <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
        </div>
        <div class="bar"><div class="fill"></div><span class="flag">🏁</span></div>
      </div>
      <div class="note"></div><div class="toastk"></div><div class="tip"></div>
      <div class="meter" style="display:none"><span class="ic">${FOOD_EMOJI[this.food[0]]}</span><div class="seg">${'<i></i>'.repeat(KY.NEED)}</div><span class="tb">TURBO</span></div>
      <div class="ctl off">
        <button class="cb l" aria-label="Sola">◀</button>
        <button class="cb j" aria-label="Zıpla"><span>⤒</span>ZIPLA</button>
        <button class="cb r" aria-label="Sağa">▶</button>
      </div>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = {
      wrap: w, cv: q('canvas'), lbls: q('.lbls'), fx: q('.fx'), vig: q('.vig'), pos: q('.pos'), posB: q('.pos b'), posS: q('.pos small'),
      tm: q('.tm'), ex: q('.ex'), bar: q('.bar'), fill: q('.bar .fill'), note: q('.note'), meter: q('.meter'), segs: [...w.querySelectorAll('.seg i')],
      ctl: q('.ctl'), bl: q('.cb.l'), bj: q('.cb.j'), br: q('.cb.r'), msg: q('.msg'), panel: q('.panel'), hud: q('.hud'), toastk: q('.toastk'), tip: q('.tip'),
    };
    this.dots = new Map();
    this.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    // ev sahibi çıkışı: iki dokunuşla
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
    const press = (k) => {
      if (!this.canCtl()) return;
      this.inp[k] = 1;
      if (k === 'j') vibrate(8);
    };
    this.press = press;
    const btn = (el, k) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        press(k);
        el.classList.add('on');
        setTimeout(() => el.classList.remove('on'), 120);
      });
    };
    btn(this.el.bl, 'l'); btn(this.el.bj, 'j'); btn(this.el.br, 'r');
    // hazır kartındaki "Düğmeler" seçimi: sağ el / sol el (köşede üçgen) ya da iki el (yanlara yayılmış)
    this.onHand = (e) => {
      const b = e.target.closest('[data-hand]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const h = b.dataset.hand;
      if (h !== 'r' && h !== 'l' && h !== '2') return;
      this.el.wrap.classList.remove('hand-' + this.hand);
      this.hand = h;
      handSave(h);
      this.el.wrap.classList.add('hand-' + h);
      this.panelKey = '';
      this.panel();
    };
    this.el.panel.addEventListener('click', this.onHand);
    const pts = new Map();
    this.onDown = (e) => {
      if (e.target.closest('.panel.on .card, button, a')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, ax: e.clientX, ay: e.clientY, t: performance.now(), moved: false });
    };
    this.onMove = (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.ax, dy = e.clientY - p.ay;
      const th = 26;
      if (Math.abs(dx) > th && Math.abs(dx) > Math.abs(dy) * 1.15) { press(dx < 0 ? 'l' : 'r'); p.ax = e.clientX; p.ay = e.clientY; p.moved = true; }
      else if (dy < -th && Math.abs(dy) > Math.abs(dx) * 1.15) { press('j'); p.ax = e.clientX; p.ay = e.clientY; p.moved = true; }
      else if (Math.abs(e.clientX - p.x) > 12 || Math.abs(e.clientY - p.y) > 12) p.moved = true;
    };
    this.onUp = (e) => {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (!p || p.moved || performance.now() - p.t > 320) return;
      const W = w.clientWidth || 1;
      const fx2 = e.clientX / W;
      press(fx2 < 0.36 ? 'l' : fx2 > 0.64 ? 'r' : 'j');
    };
    this.onCancel = (e) => pts.delete(e.pointerId);
    w.addEventListener('pointerdown', this.onDown);
    w.addEventListener('pointermove', this.onMove);
    w.addEventListener('pointerup', this.onUp);
    w.addEventListener('pointercancel', this.onCancel);
    this.onTouch = (e) => { if (!e.target.closest('.card')) e.preventDefault(); };
    w.addEventListener('touchmove', this.onTouch, { passive: false });
    const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'j', w: 'j', W: 'j', ' ': 'j' };
    this.onKey = (e) => {
      const k = KEYS[e.key];
      if (!k || e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (e.repeat) { e.preventDefault(); return; }
      e.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', this.onKey);
  }
  canCtl() {
    const v = this.view;
    const r = this.me;
    if (!v || !r || r.done || (v.phase !== 'ready' && v.phase !== 'race')) return false;
    return this.ctx.serverNow() >= v.startAt;
  }

  /* ---------- sunucudan gelen durum ---------- */
  emoAnchor(pid) {
    if (pid === this.ctx.me && this.me) { const r = this.me; return this.emoProj(r.x, r.y + 2.0, -r.d); }
    const g = this.ghosts && this.ghosts.get(pid);
    return g ? this.emoProj(g.x, (g.y || 0) + 2.0, -g.d) : null;
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
    if (root && root.dataset.ky !== '1') {
      root.dataset.ky = '1';
      root.innerHTML = '<p class="py-16 text-center">🛵</p>';
    }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    if (v.seed && v.seed !== this.seed && (v.phase === 'ready' || v.phase === 'race' || v.phase === 'result')) this.newRace(v);
    if (!this.world && (v.phase === 'final' || v.phase === 'loading')) this.backdrop();
    if (this.me === null && v.racing && v.seed === this.seed && v.phase === 'ready') { const e = v.racers?.find((x) => x.id === ctx.me); this.me = KY.runner(e?.l ?? 1, Math.min(0, e?.d ?? 0)); }
    if (v.racers) this.sample(v);
    if (!prev || prev.phase !== v.phase || prev.round !== v.round || prev.seed !== v.seed) this.onPhase(prev, v);
    this.panel();
  }

  backdrop() {
    this.seed = 1;
    this.makeWorld(1, 0);
  }

  makeWorld(seed, tod) {
    if (this.world?.dispose) this.world.dispose();
    if (this.X && !this.lost) this.world = new World(this.X, this.res, seed, tod);
    else this.world = { track: KY.track(seed), len: KY.LEN, tod: TOD[((tod % 3) + 3) % 3], prebuild: () => 0, dispose() {} };
    this.track = this.world.track;
  }

  newRace(v) {
    this.seed = v.seed;
    this.tod = v.tod || 0;
    this.makeWorld(v.seed, this.tod);
    this.rainOn = !!this.world?.rain;
    this.drops = null;
    this.ltT = 7 + Math.random() * 6;
    this.ltK = 0;
    try { this.snd.amb(this.rainOn ? 'city+rain' : 'city', this.rainOn ? 0.85 : 0.7); } catch { /* yok say */ }
    this.peds = makePeds(v.seed || 1);
    const mine0 = v.racers?.find((x) => x.id === this.ctx.me);
    this.me = v.racing ? KY.runner(mine0?.l ?? 1, Math.min(0, mine0?.d ?? 0)) : null;
    this.simT = 0;
    this.inp.l = 0; this.inp.r = 0; this.inp.j = 0;
    this.ghosts.forEach((g) => g.lbl?.remove());
    this.ghosts.clear();
    this.dots.forEach((d) => d.remove());
    this.dots.clear();
    this.parts.length = 0;
    this.knock.clear();
    this.finishWall = 0;
    this.finishMs = 0;
    this.lastSend = 0;
    this.place = 0;
    this.lastBeep = 99;
    this.started = false;
    this.myServer = null;
    this.flying = 0;
    this.spin = 0;
    this.wob = 0;
    this.passSide = new Map();
    this.mark = 0;
    this.passI = 0;
    this.tipText = null;
    const mine = v.racers?.find((x) => x.id === this.ctx.me);
    if (this.me && mine && v.phase !== 'ready') {
      if (mine.f != null) { this.me.done = true; this.me.d = KY.LEN; this.me.ft = mine.f / 1000; this.finishMs = mine.f; this.finishWall = -1e9; }
      else if (mine.d > 3) {
        this.me.d = mine.d; this.me.lane = mine.l; this.me.x = KY.laneX(mine.l);
        this.me.t = Math.max(0, (this.ctx.serverNow() - v.startAt) / 1000);
        this.simT = this.me.t;
        this.started = true;
      }
    }
    this.cam.mode = '';
  }

  sample(v) {
    const now = performance.now();
    const seen = new Set();
    v.racers.forEach((x) => {
      if (this.me && x.id === this.ctx.me) { this.myServer = x; return; }
      seen.add(x.id);
      let g = this.ghosts.get(x.id);
      if (!g) {
        g = { id: x.id, d: x.d, sd: x.d, st: now, vEst: 0, x: KY.laneX(x.l), y: 0, vy: 0, a: x.a, h: x.h, spin: 0, l: x.l, off: ((x.c % 3) - 1) * 0.22, lbl: null };
        this.ghosts.set(x.id, g);
      }
      if (g.sd !== x.d) {
        const dt = (now - g.st) / 1000;
        if (dt > 0.03) { const est = clamp((x.d - g.sd) / dt, 0, 45); g.vEst = g.vEst ? lerp(g.vEst, est, 0.55) : est; }
        g.sd = x.d;
        g.st = now;
      }
      if (x.a && !g.a && g.y <= 0.01) g.vy = KY.JUMP_V;
      if (x.h > g.h) g.spin = 1;
      Object.assign(g, { l: x.l, a: x.a, h: x.h, tb: x.tb, f: x.f, n: x.n, c: x.c, on: x.on, it: x.it });
    });
    this.ghosts.forEach((g, id) => { if (!seen.has(id)) { g.lbl?.remove(); this.ghosts.delete(id); } });
  }

  onPhase(prev, v) {
    const p = v.phase;
    if (p === 'ready') {
      this.snd.music('idle');
      if (v.racing) this.snd.engine(true);
      this.msg('');
    } else if (p === 'race') {
      this.snd.music('race');
    } else if (p === 'result') {
      this.msg('');
      this.snd.engine(false);
      this.snd.music('calm');
      const me = v.results?.find((r) => r.id === this.ctx.me);
      if (me?.place === 1 && me.t) setTimeout(() => this.snd.fx('win'), 300);
    } else if (p === 'final') {
      this.msg('');
      this.snd.engine(false);
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
    const tod = TOD[((v.tod || 0) % 3 + 3) % 3];
    const chips = (list) => list.map((r) => `<span class="chip"><i style="background:${pcol(r.c)}"></i>${esc(r.n)}${r.id === ctx.me ? ' (sen)' : ''}</span>`).join('');
    if (v.phase === 'loading') {
      html = '<div class="card"><div class="tt">🛵 Hazırlanıyor…</div></div>';
    } else if (v.phase === 'ready') {
      const left = v.startAt - sNow;
      if (left > 3300) {
        const first = v.round === 1;
        // "Hemen başla" düğmesi son saniyelerde kartı yeniden çizmeden gizlenir (bkz. hud)
        const canGo = ctx.isHost && first;
        const fe = FOOD_EMOJI[this.food[0]];
        key = `ready|${v.round}|${v.racers.map((r) => r.id + r.n).join(',')}|${canGo}|${this.hand}`;
        html = `<div class="card">
          <div class="tt">🛵 Kurye Yarışı</div>
          <div class="sub">${v.round}/${v.rounds}. yarış · ${isRainy(v.tod || 0, v.seed) ? '🌧️ Yağmurlu gece' : `${tod.icon} ${tod.name}`} · ${v.racers.length} kurye</div>
          <div class="sub">${esc(this.brand.slug === 'nfc' ? 'Sipariş yolda' : `${this.brand.name} siparişi yolda`)} — ilk teslim eden kazanır!</div>
          ${first ? `<div class="how">
            <div><span class="k">◀ ▶</span><span><b>Şerit değiştir</b><small>Butonlara bas, kaydır ya da ekranın sağına/soluna dokun</small></span></div>
            <div><span class="k">⤒</span><span><b>Zıpla</b><small>Koni ve bariyerlerin üstünden atla</small></span></div>
            <div><span class="k">${fe}</span><span><b>${KY.NEED} tane topla = TURBO 🔥</b><small>Turbodayken koni ve bariyerleri dağıtırsın</small></span></div>
            <div><span class="k">🚗</span><span><b>Arabalara çarpma</b><small>Çarparsan yavaşlarsın, rampadan üstlerinden uçabilirsin</small></span></div>
          </div>` : `<div class="how"><div><span class="k">◀ ▶</span><span><b>Şerit</b> · <b>⤒ zıpla</b> · <b>${fe}×${KY.NEED} = turbo</b></span></div></div>`}
          <div class="who">${chips(v.racers)}</div>
          ${v.racing ? `<div class="elsec" role="group" aria-label="Düğme yerleşimi"><span>🎮 Düğmeler:</span>${[['r', '✋ Sağ el'], ['l', '🤚 Sol el'], ['2', '👐 İki el']].map(([h, t]) => `<button data-hand="${h}" class="${this.hand === h ? 'on' : ''}">${t}</button>`).join('')}</div>` : ''}
          <div class="cd"><span>${v.racing ? 'Yarış başlıyor' : 'Bu yarışı izleyeceksin'}</span><b data-cd></b></div>
          ${canGo ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}
        </div>`;
        low = true;
      } else key = 'count';
    } else if (v.phase === 'race') {
      key = 'race';
    } else if (v.phase === 'result') {
      const meR = v.results.find((r) => r.id === ctx.me);
      key = `result|${v.round}|${ctx.isHost}`;
      const title = meR?.place === 1 && meR.t ? '🏆 Birincisin!' : meR?.t ? `🏁 ${meR.place}. oldun` : `🏁 ${v.round}. yarış bitti`;
      html = `<div class="card">
        <div class="tt">${title}</div>
        <div class="sub">${v.round}/${v.rounds}. yarışın sonuçları${meR?.t ? ` · ${FOOD_EMOJI[this.food[0]]} ${meR.it} topladın · 💥 ${meR.h} çarpma` : ''}</div>
        <ol class="res">${v.results.map((r) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${r.t ? medal(r.place) : '·'}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">${r.t ? fmtSec(r.t) : 'yolda kaldı'}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
        <div class="cd"><span>${v.last ? 'Genel sonuçlar' : 'Sonraki yarış'}</span><b data-cd></b></div>
        ${ctx.isHost ? `<button class="kb btn" data-game-action="next">${v.last ? 'Sonuçlara geç ▶' : 'Sonraki yarış ▶'}</button>` : ''}
      </div>`;
    } else if (v.phase === 'final') {
      const sb = v.scoreboard || [];
      const top = sb[0];
      key = `final|${sb.map((s) => s.id + s.score).join(',')}|${ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏆 ${top ? `${esc(top.nickname)} kazandı!` : 'Yarış bitti!'}</div>
        <div class="sub">3 yarışın toplam puanı</div>
        ${podiumHTML(sb, ctx.me)}
        <ol class="res">${sb.map((s, i) => `<li class="${s.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(s.c)}"></i><span class="nm">${esc(s.nickname)}</span><span class="p">${s.score}</span></li>`).join('')}</ol>
        ${v.best ? `<div class="best">⚡ En hızlı teslimat: <b>${esc(v.best.nickname)}</b> · ${fmtSec(v.best.t)} (${v.best.round}. yarış)</div>` : ''}
        ${ctx.isHost ? '<button class="kb btn" data-game-action="restart">Yeniden yarış 🔁</button><button class="kb alt btn" data-act="exit-game">← Oyunlara dön</button>' : `<p class="hint">Yeni yarışı ${esc(ctx.hostName)} başlatacak.</p>`}
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
    this.flashT = setTimeout(() => { v.className = 'vig'; this.flashing = false; this.vigTb = false; }, ms);
  }

  // Üstte kısa bilgi (geçişler, kilometre taşları)
  toastK(text, ms = 1300) {
    const t = this.el.toastk;
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('on'), ms);
  }

  /* ---------- simülasyon ---------- */
  sim(sNow) {
    const v = this.view;
    const r = this.me;
    if (!r || !this.world || !v || !v.startAt || (v.phase !== 'ready' && v.phase !== 'race')) return;
    const el = (sNow - v.startAt) / 1000;
    if (el <= 0) return;
    if (!this.started) { this.started = true; this.simT = Math.max(this.simT, 0); }
    if (el - this.simT > 0.6) this.simT = el - 0.6;
    const H = 1 / 120;
    let n = 0;
    while (this.simT + H <= el && n < 150) {
      KY.step(r, this.track, H, this.inp);
      this.simT += H;
      n += 1;
      if (r.ev.length) { const evs = r.ev.splice(0); evs.forEach((e) => this.onEvent(e, sNow)); }
    }
  }

  // Yarış içi anlık olaylar: kilometre taşları, yakın geçişler, yeni başlayan ipuçları
  milestones() {
    const r = this.me;
    const v = this.view;
    if (!r || !this.started || !v) return;
    const marks = [[500, 'YARI YOL! 🔥'], [750, 'SON 250 METRE! 🏁']];
    this.mark = this.mark || 0;
    marks.forEach(([d, text], i) => {
      if (r.d >= d && this.mark <= i && !r.done) { this.mark = i + 1; this.msg(text, 'mid gold'); this.snd.fx(i ? 'ramp' : 'up'); }
    });
    // yakın geçiş vınlaması (yan şeritteki araçlar)
    const T = this.track;
    this.passI = this.passI || 0;
    while (this.passI < T.obs.length && T.obs[this.passI].z < r.d) {
      const o = T.obs[this.passI];
      if (KY.SPEC[o.k].kind === 'heavy' && !r.hit.has(o.id) && Math.abs(o.x - r.x) < 3.2) this.snd.fx('pass', clamp((o.x - r.x) / 2.5, -1, 1));
      this.passI += 1;
    }
    // ipuçları: ilk yarışın ilk yarım dakikası
    let tip = '';
    let hint = '';
    if (v.round === 1 && this.simT < 32 && !r.done && r.stun <= 0) {
      for (let i = r.oi; i < T.obs.length; i++) {
        const o = T.obs[i];
        const dz = o.z - o.l - r.d;
        if (dz > 28) break;
        if (dz < 4 || Math.abs(o.x - KY.laneX(r.lane)) > o.w + 0.4 || r.hit.has(o.id)) continue;
        const kind = KY.SPEC[o.k].kind;
        if (kind === 'low' && !r.air && r.turbo <= 0) { tip = '⤒ ZIPLA!'; hint = 'j'; break; }
        if (kind === 'heavy') {
          const free = [r.lane - 1, r.lane + 1].filter((L) => L >= 0 && L <= 2 && !T.obs.some((q) => KY.SPEC[q.k].kind === 'heavy' && Math.abs(q.z - o.z) < q.l + o.l + 3 && Math.abs(q.x - KY.laneX(L)) < q.w + 0.4));
          hint = free.length ? (free[0] < r.lane ? 'l' : 'r') : (r.lane > 0 ? 'l' : 'r');
          tip = hint === 'l' ? '◀ ŞERİT DEĞİŞTİR' : 'ŞERİT DEĞİŞTİR ▶';
          break;
        }
      }
    }
    if (tip !== this.tipText) {
      this.tipText = tip;
      this.el.tip.textContent = tip;
      this.el.tip.classList.toggle('on', !!tip);
      this.el.bl.classList.toggle('glow', hint === 'l');
      this.el.br.classList.toggle('glow', hint === 'r');
      this.el.bj.classList.toggle('glow', hint === 'j');
    }
  }

  onEvent(e, sNow) {
    const r = this.me;
    const [name, arg] = e.split(':');
    const px = r.x, py = r.y, pz = -r.d;
    switch (name) {
      case 'lane':
        this.snd.fx('lane', (KY.laneX(r.lane) - r.x) * 0.25);
        this.burst(px, 0.15, pz + 0.6, 4, [0.75, 0.72, 0.68], 1.2, 0.12, false, 0.5, 6, -r.v * 0.7);
        break;
      case 'jump': this.snd.fx('jump'); this.burst(px, 0.1, pz + 0.4, 6, [0.8, 0.78, 0.72], 1.5, 0.13, false, 0.45, 6, -r.v * 0.7); break;
      case 'land': this.snd.fx('land'); this.burst(px, 0.1, pz, 8, [0.8, 0.78, 0.72], 2.2, 0.14, false, 0.45, 6, -r.v * 0.7); this.shake = Math.max(this.shake, 0.12); break;
      case 'ramp': this.snd.fx('ramp'); this.msg('UÇUŞ! 🚀', 'mid cyan'); this.fovKick = Math.max(this.fovKick, 6); break;
      case 'item': {
        const it = this.track.items[+arg];
        const kind = this.food[it.id % this.food.length];
        this.snd.fx('item', r.meter);
        this.burst(it.x, it.y, -it.z, 12, hexRGB(this.brand.accentHex), 3.5, 0.09, true, 0.5, 4, -r.v * 0.85);
        this.burst(it.x, it.y, -it.z, 5, [1, 1, 1], 2.5, 0.06, true, 0.35, 4, -r.v * 0.85);
        this.floatText(`+${FOOD_EMOJI[kind]}`, it.x, it.y + 0.6, -it.z);
        break;
      }
      case 'turbo':
        this.snd.fx('turbo'); this.msg('TURBO! 🔥', 'cyan'); this.fovKick = 9; vibrate([20, 30, 20]);
        break;
      case 'pad': this.snd.fx('pad'); this.msg('TURBO!', 'mid cyan'); this.fovKick = Math.max(this.fovKick, 7); break;
      case 'splash':
        this.snd.fx('splash'); this.flash('wet', 500);
        this.burst(px, 0.2, pz, 20, [0.5, 0.75, 1], 4.5, 0.09, false, 0.6, 9, -r.v * 0.7);
        break;
      case 'cone': case 'bonk': case 'smash': {
        const o = this.track.obs[+arg];
        this.knockOut(o, name === 'smash' ? 1.6 : 1);
        if (name === 'smash') { this.snd.fx('smash'); this.burst(o.x, 0.6, -o.z, 16, [1, 0.6, 0.15], 6, 0.1, true, 0.5, 6, -r.v * 0.6); }
        else { this.snd.fx(name); this.shake = Math.max(this.shake, 0.35); vibrate(name === 'cone' ? 35 : 55); this.wob = 1; this.flash('hit'); this.burst(o.x, 0.6, -o.z, 10, o.k === 'cone' ? [1, 0.45, 0.05] : [0.9, 0.2, 0.2], 4, 0.1, false, 0.6, 6, -r.v * 0.5); }
        break;
      }
      case 'crash': {
        const o = this.track.obs[+arg];
        this.snd.fx('crash'); this.shake = 0.9; vibrate([70, 40, 70]); this.spin = 1; this.flash('hit', 600);
        this.msg('ÇARPTIN! 💥', 'red');
        this.burst(px, 0.9, -(o.z - o.l), 26, [1, 0.75, 0.2], 7, 0.08, true, 0.55, 12);
        this.burst(px, 0.6, -(o.z - o.l), 12, [0.5, 0.5, 0.5], 3, 0.18, false, 0.9);
        break;
      }
      case 'finish': {
        const v = this.view;
        this.finishMs = sNow - v.startAt;
        this.finishWall = performance.now();
        this.lastSend = 0;
        this.snd.fx('finish');
        vibrate([40, 50, 40, 50, 120]);
        this.confetti(0, -KY.LEN, 160);
        this.msg('TESLİM EDİLDİ!', 'gold', true);
        break;
      }
      default: break;
    }
  }

  knockOut(o, power) {
    const side = o.x - this.me.x || (Math.random() - 0.5);
    this.knock.set(o.id, { t: 0, x: o.x, y: 0, z: -o.z, vx: Math.sign(side) * (3 + Math.random() * 3) * power, vy: (4 + Math.random() * 2.5) * power, vz: -(6 + Math.random() * 6) * power, rx: 0, rz: 0, wx: (Math.random() * 10 + 6) * power, wz: (Math.random() - 0.5) * 14 });
  }

  /* ---------- parçacıklar ---------- */
  burst(x, y, z, n, col, speed, size, add, life, grav = 6, bvz = 0) {
    for (let i = 0; i < n && this.parts.length < 680; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, z, vx: Math.cos(a) * s * e, vy: Math.random() * s * 0.9 + speed * 0.3, vz: Math.sin(a) * s * e + bvz, life: life * (0.6 + Math.random() * 0.6), max: life, s: size * (0.6 + Math.random() * 0.8), r: col[0], g: col[1], b: col[2], add, grav, drag: 1.5, streak: false });
    }
  }
  confetti(x, z, n) {
    const cols = ['#ff3b30', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#ffffff'].map(hexRGB);
    for (let i = 0; i < n && this.parts.length < 680; i++) {
      const c = cols[i % cols.length];
      this.parts.push({ x: x + (Math.random() - 0.5) * 8, y: 5.5 + Math.random() * 2, z: z + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 5 + 1, vz: (Math.random() - 0.5) * 7 + 2, life: 2.2 + Math.random() * 1.4, max: 3.6, s: 0.09 + Math.random() * 0.06, r: c[0], g: c[1], b: c[2], add: false, grav: 3.2, drag: 1.2, streak: false, conf: true });
    }
  }
  /* ---------- yağmur (yalnız görsel): kameranın çevresinde düşen çizgiler, yolda sıçramalar, ara sıra şimşek ---------- */
  stepRain(dt) {
    const c = this.cam;
    const n = this.scale < 0.7 ? 200 : 340;
    if (!this.drops || this.drops.length !== n * 4) {
      this.drops = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) this.respawnDrop(i, true);
    }
    const D = this.drops, wind = 1.4;
    const fwd = -c.tz >= -c.z ? -1 : 1;           // kamera -z'ye bakıyorsa ileri = -z
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      D[o + 1] -= (9.5 + D[o + 3]) * dt;
      D[o] += wind * dt;
      const ahead = (D[o + 2] - c.z) * fwd;          // kameranın önündeki mesafe
      if (D[o + 1] < 0) {
        if (ahead > 2.5 && ahead < 20 && Math.abs(D[o] - c.x) < 5.5 && Math.random() < 0.4 && this.parts.length < 600)
          this.parts.push({ x: D[o], y: 0.04, z: D[o + 2], vx: 0, vy: 1.1 + Math.random() * 0.8, vz: 0, life: 0.16, max: 0.16, s: 0.045 + Math.random() * 0.03, r: 0.8, g: 0.88, b: 1, add: true, grav: 9, drag: 0 });
        this.respawnDrop(i, false);
      } else if (ahead < -1.5 || ahead > 40) this.respawnDrop(i, true);
    }
    // şimşek: iki hızlı parlama, ardından gecikmeli gök gürültüsü
    this.ltT -= dt;
    if (this.ltT <= 0) {
      this.ltT = 9 + Math.random() * 11;
      this.ltAt = this.time;
      const k = 0.5 + Math.random() * 0.5;
      this.ltPow = k;
      setTimeout(() => { if (!this.dead && this.rainOn) this.snd.fx('thunder', k); }, 500 + Math.random() * 1300);
    }
    const tt = this.time - (this.ltAt ?? -99);
    this.ltK = tt < 0.6 ? (this.ltPow || 1) * (Math.max(0, 1 - Math.abs(tt - 0.05) / 0.07) + 0.75 * Math.max(0, 1 - Math.abs(tt - 0.24) / 0.1) + 0.3 * Math.max(0, 1 - (tt - 0.28) / 0.3) * (tt > 0.28 ? 1 : 0)) : 0;
  }
  respawnDrop(i, anywhere) {
    const c = this.cam, D = this.drops, o = i * 4;
    const fwd = -c.tz >= -c.z ? -1 : 1;
    D[o] = c.x + (Math.random() - 0.5) * 15;
    D[o + 1] = anywhere ? Math.random() * 10 : 8 + Math.random() * 3;
    D[o + 2] = c.z + fwd * (0.5 + Math.random() * 34);
    D[o + 3] = Math.random() * 3;
  }
  // yağmur çizgileri: hız yönünde uzayan ince, kameraya dönük dörtgenler (alfa harmanlı)
  fillRain(V, spd) {
    const D = this.drops;
    if (!D) return 0;
    const A = this.pR || (this.pR = new Float32Array(340 * 42));
    const c = this.cam;
    const n = Math.min(D.length / 4, A.length / 42);
    const night = 1;
    let o = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      const x = D[q], y = D[q + 1], z = D[q + 2];
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 1.4) continue;
      // göreli hız: yağmur aşağı (+rüzgâr), kamera ileri gidiyor → çizgi kameraya doğru eğilir
      const vx = 1.4, vy = -(9.5 + D[q + 3]), vz = spd;
      const vl = Math.hypot(vx, vy, vz);
      const L = 0.38 + spd * 0.012;
      const tx = (vx / vl) * L, ty = (vy / vl) * L, tz = (vz / vl) * L;
      // kenar vektörü: çizgi yönü × bakış yönü
      let sx = ty * dz - tz * dy, sy = tz * dx - tx * dz, sz = tx * dy - ty * dx;
      const sl = Math.hypot(sx, sy, sz) || 1;
      const w = 0.013 + dist * 0.001;
      sx = (sx / sl) * w; sy = (sy / sl) * w; sz = (sz / sl) * w;
      const fade = Math.min(1, (dist - 1.4) / 3) * Math.max(0, 1 - dist / 38);
      const a = 0.4 * fade * night;
      const ax = x - tx, ay = y - ty, az = z - tz;      // (x,y,z) = alt uç (parlak), a = üst kuyruk
      const C = this.rc || (this.rc = new Float32Array(16));
      C[0] = ax - sx; C[1] = ay - sy; C[2] = az - sz; C[3] = 0;
      C[4] = ax + sx; C[5] = ay + sy; C[6] = az + sz; C[7] = 0;
      C[8] = x + sx; C[9] = y + sy; C[10] = z + sz; C[11] = a;
      C[12] = x - sx; C[13] = y - sy; C[14] = z - sz; C[15] = a;
      for (let j = 0; j < 6; j++) { const q = QIDX[j] * 4; A[o++] = C[q]; A[o++] = C[q + 1]; A[o++] = C[q + 2]; A[o++] = 0.78; A[o++] = 0.84; A[o++] = 0.96; A[o++] = C[q + 3]; }
      cnt += 6;
    }
    void V;
    return cnt;
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
      if (p.y < 0.03 && !p.streak) { p.y = 0.03; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
    }
    // turbo hız çizgileri + egzoz dumanı
    const r = this.me;
    if (r && !r.done && this.started) {
      if (r.turbo > 0 && P.length < 660) {
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2, rad = 1.8 + Math.random() * 2.2;
          P.push({ x: r.x + Math.cos(a) * rad, y: 1.6 + Math.sin(a) * rad * 0.7, z: -(r.d + 16 + Math.random() * 8), vx: 0, vy: 0, vz: 34, life: 0.6, max: 0.6, s: 0.025, r: 0.85, g: 0.97, b: 1, add: true, grav: 0, drag: 0, streak: true });
        }
      }
      if (Math.random() < dt * 14 && P.length < 660) P.push({ x: r.x + 0.22, y: r.y + 0.35, z: -r.d + 0.95, vx: (Math.random() - 0.5) * 0.4, vy: 0.6, vz: 1.5, life: 0.55, max: 0.55, s: 0.07, r: r.turbo > 0 ? 1 : 0.7, g: r.turbo > 0 ? 0.6 : 0.7, b: r.turbo > 0 ? 0.2 : 0.72, add: r.turbo > 0, grav: -0.4, drag: 1, streak: false, puff: true });
    }
  }
  fillParts(V) {
    const rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    let na = 0, nb = 0;
    const A = this.pA, B = this.pB;
    const cx = this.cam.x, cy = this.cam.y, cz = this.cam.z;
    for (const p of this.parts) {
      const add = p.add;
      const arr = add ? B : A;
      let o = (add ? nb : na) * 7;
      if (o + 126 > arr.length) continue;
      const dist = Math.hypot(p.x - cx, p.y - cy, p.z - cz);
      if (dist < (p.streak ? 1 : 2.4)) continue;
      const near = p.streak ? 1 : clamp((dist - 2.4) / 5, 0, 1);
      const k = p.life / p.max;
      const a = (p.conf ? Math.min(1, k * 2.5) : p.puff ? k * 0.45 : k) * near;
      const s = p.puff ? p.s * (1 + (1 - k) * 2.5) : p.s;
      const o0 = o;
      if (p.conf || p.streak) {
        // köşeler doğrudan yazılır (kare başına binlerce küçük dizi yaratıp çöp toplayıcıyı yormasın)
        const C = this.qc || (this.qc = new Float32Array(12));
        if (p.streak) {
          const L = 1.6;
          C[0] = p.x - rx * s; C[1] = p.y - ry * s; C[2] = p.z + L; C[3] = p.x + rx * s; C[4] = p.y + ry * s; C[5] = p.z + L;
          C[6] = p.x + rx * s; C[7] = p.y + ry * s; C[8] = p.z - L; C[9] = p.x - rx * s; C[10] = p.y - ry * s; C[11] = p.z - L;
        } else {
          C[0] = p.x - rx * s - ux * s; C[1] = p.y - ry * s - uy * s; C[2] = p.z - rz * s - uz * s;
          C[3] = p.x + rx * s - ux * s; C[4] = p.y + ry * s - uy * s; C[5] = p.z + rz * s - uz * s;
          C[6] = p.x + rx * s + ux * s; C[7] = p.y + ry * s + uy * s; C[8] = p.z + rz * s + uz * s;
          C[9] = p.x - rx * s + ux * s; C[10] = p.y - ry * s + uy * s; C[11] = p.z - rz * s + uz * s;
        }
        for (let j = 0; j < 6; j++) { const q = QIDX[j] * 3; arr[o++] = C[q]; arr[o++] = C[q + 1]; arr[o++] = C[q + 2]; arr[o++] = p.r; arr[o++] = p.g; arr[o++] = p.b; arr[o++] = a; }
      } else o = emitSoft(arr, o, p.x, p.y, p.z, s, p.r, p.g, p.b, a, rx, ry, rz, ux, uy, uz);
      if (add) nb += (o - o0) / 7; else na += (o - o0) / 7;
    }
    return [na, nb];
  }

  /* ---------- rakipler ---------- */
  stepGhosts(dt) {
    const now = performance.now();
    const me = this.me;
    this.ghosts.forEach((g) => {
      let tgt;
      if (g.f != null) tgt = Math.max(g.sd, KY.LEN) + 14;
      else tgt = Math.min(KY.LEN - 0.3, g.sd + g.vEst * Math.min((now - g.st) / 1000, 0.45));
      g.d = Math.abs(tgt - g.d) > 25 ? tgt : damp(g.d, tgt, g.f != null ? 1.4 : 9, dt);
      g.x = damp(g.x, KY.laneX(g.l) + g.off, 11, dt);
      if (g.vy || g.y > 0) { g.vy -= KY.GRAV * dt; g.y += g.vy * dt; if (g.y <= 0) { g.y = 0; g.vy = 0; } }
      g.spin = Math.max(0, g.spin - dt * 1.1);
      if (me && !me.done && g.f == null && this.started) {
        const side = Math.sign(g.d - me.d);
        const prev = this.passSide.get(g.id);
        if (prev !== undefined && side !== prev && side !== 0 && Math.abs(g.d - me.d) < 4) {
          if (Math.abs(g.x - me.x) < 3.5) this.snd.fx('pass', clamp((g.x - me.x) / 3, -1, 1));
          const t2 = performance.now();
          if (side < 0 && t2 - (this.passToastT || 0) > 1800 && this.simT > 3) { this.passToastT = t2; this.toastK(`💨 ${g.n} geride kaldı!`); }
        }
        this.passSide.set(g.id, side);
      }
    });
  }

  standings() {
    const list = [];
    if (this.me) list.push({ id: this.ctx.me, d: this.me.d, f: this.me.done ? (this.myServer?.f ?? this.finishMs) : null, c: this.myServer?.c ?? 0, me: true });
    this.ghosts.forEach((g) => list.push({ id: g.id, d: g.d, f: g.f, c: g.c, me: false }));
    list.sort((a, b) => (a.f != null && b.f != null ? a.f - b.f : a.f != null ? -1 : b.f != null ? 1 : b.d - a.d));
    return list;
  }

  /* ---------- kamera ---------- */
  stepCam(dt, sNow) {
    const v = this.view;
    const W = this.world;
    const c = this.cam;
    if (!v || !W) return;
    const r = this.me;
    const el = v.startAt ? (sNow - v.startAt) / 1000 : 0;
    let mode = 'finish';
    if (v.phase === 'ready' || v.phase === 'race') {
      if (v.phase === 'ready' && el < -3.2) mode = 'intro';
      else if (r && !r.done) mode = 'chase';
      else if (r && r.done && performance.now() - this.finishWall < 3600) mode = 'orbit';
      else if (r && r.done) mode = 'finish';
      else mode = 'spect';
    }
    if (v.phase === 'ready' && !r && el < -3.2) mode = 'intro';
    if (mode !== c.mode) {
      if (c.mode && !(c.mode === 'intro' && (mode === 'chase' || mode === 'spect'))) { c.blend = 0; c.px = c.x; c.py = c.y; c.pz = c.z; c.ptx = c.tx; c.pty = c.ty; c.ptz = c.tz; } else c.blend = 1;
      c.mode = mode;
    }
    let ex, ey, ez, tx, ty, tz;
    const t = this.time;
    const vw = this.vw || 1, vh = this.vh || 1;
    // Kamera eğimi ekran oranına göre: kuryenin tekerleri alttaki düğme/gösterge alanının üstünde kalsın.
    // (uzun telefonlarda varsayılan açı yeter; kısa/geniş ekranlarda kamera biraz daha aşağı bakar)
    const lowL = vw > vh && vh < 520;
    const fT = Math.tan(baseFov(vw / vh) / 2);
    const yb = 1 - (lowL ? 64 : 150) / vh;
    const pitch = clamp(0.553 - Math.atan(Math.max(0, 2 * yb - 1) * fT), 0.1443, 0.28);
    const lookH = 3.3 - 14.8 * Math.tan(pitch);
    const chase = (x, y, d, vel) => {
      const back = 6.3 + clamp((vel - 18) * 0.05, 0, 0.7);
      ex = x * 0.55; ey = 3.3 + y * 0.42; ez = -(d - back);
      tx = x * 0.72; ty = lookH + y * 0.5; tz = -(d + 8.5);
    };
    let lens = 0;
    if (mode === 'intro') {
      // kuryeleri önden gösteren, yavaşça süzülen kamera (arkada restoran ve BAŞLA köprüsü)
      if (vw < vh) {
        // dikey ekranda kuryeler üst kısımda, alttaki bilgi kartının üstünde kalır
        ex = Math.sin(t * 0.3) * 2.2; ey = 5.4; ez = -(9.2 + Math.sin(t * 0.25) * 0.6);
        tx = Math.sin(t * 0.3 + 0.6) * 0.6; ty = 0.1; tz = -4.4;
      } else {
        // yatay ekranda bilgi kartı sağda: kamera köprünün önünden kuryelere bakar, görüntü merkezi
        // kartın solundaki boşluğa kaydırılır (arkada restoranın cephesi ve tabelası görünür)
        ex = Math.sin(t * 0.3) * 1.2; ey = 3.0; ez = -(7.6 + Math.sin(t * 0.25) * 0.5);
        tx = 0.3 + Math.sin(t * 0.3 + 0.6) * 0.3; ty = 0.9; tz = 1.6;
        if (this.panelLow) {
          if (!(this.cardAt > performance.now() - 400)) {
            this.cardAt = performance.now();
            const cd = this.el.panel.querySelector('.card');
            const L = cd ? cd.getBoundingClientRect().left : vw;
            this.cardL = L > vw * 0.3 ? L : vw;
          }
          lens = clamp(1 - (this.cardL || vw) / vw, 0, 0.6);
        }
      }
    } else if (mode === 'chase') {
      chase(r.x, r.y, r.d, r.v);
    } else if (mode === 'spect') {
      let lead = null;
      this.ghosts.forEach((g) => { if (!lead || (g.f == null && (lead.f != null || g.d > lead.d))) lead = g; });
      if (lead) chase(lead.x, lead.y, Math.min(lead.d, KY.LEN + 6), 22);
      else chase(0, 0, 0, 0);
    } else if (mode === 'orbit') {
      const k = (performance.now() - this.finishWall) / 1000;
      const a = k * 0.8;
      ex = clamp(r.x + Math.sin(a) * 3.2, -3.2, 3.2); ey = 2.1 + k * 0.15; ez = -r.d + Math.cos(a) * 6.8;
      tx = r.x; ty = 1.0; tz = -r.d;
    } else {
      const sw = Math.sin(t * 0.25) * 0.8;
      ex = 2.4 + sw; ey = 2.5; ez = -(KY.LEN + 11);
      tx = -0.4; ty = 1.6; tz = -(KY.LEN - 22);
    }
    if (mode === 'chase' && c.blend >= 1) {
      c.x = damp(c.x, ex, 7, dt); c.y = damp(c.y, ey, 5, dt); c.z = ez;
      c.tx = damp(c.tx, tx, 8, dt); c.ty = damp(c.ty, ty, 6, dt); c.tz = tz;
    } else {
      c.blend = Math.min(1, c.blend + dt / 1.3);
      const b = c.blend * c.blend * (3 - 2 * c.blend);
      c.x = lerp(c.px, ex, b); c.y = lerp(c.py, ey, b); c.z = lerp(c.pz, ez, b);
      c.tx = lerp(c.ptx, tx, b); c.ty = lerp(c.pty, ty, b); c.tz = lerp(c.ptz, tz, b);
      if (c.blend >= 1) { c.x = ex; c.y = ey; c.z = ez; c.tx = tx; c.ty = ty; c.tz = tz; }
    }
    this.lens = lens;
    // şerit değiştirirken kamera hafifçe yatar (hız hissi)
    const rollT = mode === 'chase' && r ? clamp((r.x - KY.laneX(r.lane)) * 0.03, -0.045, 0.045) : 0;
    this.camRoll = damp(this.camRoll || 0, rollT, 6, dt);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.fovKick = Math.max(0, this.fovKick - dt * 6);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * this.scale;
    const W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return [W, H, w / h];
  }

  draw(sNow) {
    const X = this.X;
    const Wd = this.world;
    if (!X || this.lost || !Wd || !Wd.chunks) { if (!X && Wd) this.draw2d(); return; }
    const gl = X.gl;
    const [W, H, asp] = this.resize();
    let tod = Wd.tod;
    const c = this.cam;
    const r = this.me;
    const mt = this.mats;
    // perspektif
    let fov = baseFov(asp);
    const spd = r && !r.done ? r.v : 0;
    fov += ((clamp(spd - 12, 0, 22) * 0.18 + this.fovKick) * Math.PI) / 180;
    const sh = this.shake * this.shake;
    const jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    M.persp(mt.P, fov, asp, 0.3, 330);
    // görüntü merkezini yana kaydırma (kart açıkken): perspektif bozulmadan sahne sola kayar
    const shift = this.lens || 0;
    if (shift) mt.P[8] = shift;
    M.look(mt.V, c.x + jx, c.y + jy, c.z, c.tx + jx * 0.5, c.ty + jy * 0.5, c.tz);
    const rl = this.camRoll || 0;
    if (Math.abs(rl) > 1e-4) {
      const cr = Math.cos(rl), sr = Math.sin(rl), V = mt.V;
      for (let i = 0; i < 16; i += 4) { const a = V[i], b = V[i + 1]; V[i] = cr * a - sr * b; V[i + 1] = sr * a + cr * b; }
    }
    M.mul(mt.VP, mt.P, mt.V);
    const lampOn = tod.lampC[0] > 0;
    let lx = 0, ly = -50, lz = 0;
    if (lampOn) {
      if (r && c.mode === 'chase') { lx = r.x; ly = 1.6 + r.y; lz = -(r.d + 6.5); }
      else { lx = c.tx; ly = 3.5; lz = c.tz + 4; }
    }
    if (!Wd.cols) Wd.cols = { sun: new Float32Array(norm3(tod.sunD)), fog: hexRGB(tod.fog), top: hexRGB(tod.top), hor: hexRGB(tod.hor), sunVis: norm3(tod.sunVis), acc: new Float32Array(hexRGB(this.brand.accentHex)) };
    const K = Wd.cols;
    const F = { VP: mt.VP, V: mt.V, fov, asp, shift, cx: c.x, cy: c.y, cz: c.z, sun: K.sun, fog: K.fog, top: K.top, hor: K.hor, sunVis: K.sunVis, lx, ly, lz, lampC: tod.lampC, wet: Wd.rain ? 1 : 0 };
    const lk = Wd.rain ? this.ltK || 0 : 0;
    if (lk > 0.01) {
      // şimşek: gökyüzü ve sahne bir an mavimsi beyaz aydınlanır
      F.top = K.top.map((v) => v + lk * 0.45); F.hor = K.hor.map((v) => v + lk * 0.58);
      tod = Object.assign({}, tod, { sky: tod.sky.map((v) => v + lk * 0.62), gnd: tod.gnd.map((v) => v + lk * 0.2), sunC: tod.sunC.map((v) => v + lk * 0.65) });
    }
    const camD = -c.z;
    const fwd = -c.tz >= camD;
    const far = tod.fogR[1] + 10;
    const dMin = fwd ? camD - 25 : camD - far, dMax = fwd ? camD + far : camD + 25;
    const T = this.track;
    const m = mt.a;
    // hareketli nesnelerin çizim listesi (gölge ve ana geçiş aynı listeyi kullanır)
    const DL = this.dl || (this.dl = []);
    let dn = 0;
    const put = (mm, mesh, tint = ONE3, al = 1, gw = 1, cast = true) => {
      if (!mesh) return;
      const e = DL[dn] || (DL[dn] = { m: new Float32Array(16) });
      e.m.set(mm); e.mesh = mesh; e.tint = tint; e.al = al; e.gw = gw; e.cast = cast;
      dn++;
    };
    // engeller
    const obsVis = [];
    for (const o of T.obs) {
      if (o.z + o.l < dMin || o.z - o.l > dMax) continue;
      const kn = this.knock.get(o.id);
      if (kn) {
        if (kn.t > 1.8) continue;
        M.set(m, kn.x, kn.y, kn.z, kn.rz * 0.3, kn.rx, kn.rz);
      } else {
        M.set(m, o.x, 0, -o.z);
        obsVis.push(o);
      }
      put(m, this.res.obstacleMesh(o), ONE3, 1, o.k === 'pad' ? 0.75 + 0.45 * Math.sin(this.time * 9) : 1, o.k !== 'puddle' && o.k !== 'pad');
    }
    // başlangıç ışıkları
    if (Math.abs(camD) < 120) {
      const v = this.view;
      const left = v?.startAt ? (v.startAt - sNow) / 1000 : 99;
      [-1.3, 0, 1.3].forEach((x, i) => {
        let col = LIGHT_OFF;
        let g = 0.4;
        if (left <= 0 && left > -2.5) { col = LIGHT_GO; g = 1.4; }
        else if (left > 0 && left <= 3 && 3 - Math.ceil(left) >= i) { col = LIGHT_RED; g = 1.4; }
        M.set(m, x, 4.55, -5 + 0.24);
        put(m, this.res.light, col, 1, g, false);
      });
    }
    // yiyecekler
    const foodsVis = [];
    const itemMin = fwd && c.mode === 'chase' ? Math.max(dMin, camD + 4.5) : dMin;
    for (const it of T.items) {
      if (it.z < itemMin || it.z > dMax) continue;
      if (r && r.got.has(it.id)) continue;
      const kind = this.food[it.id % this.food.length];
      const bob = Math.sin(this.time * 3 + it.id) * 0.1;
      M.set(m, it.x, it.y + bob, -it.z, this.time * 2.2 + it.id, 0.25, 0, 1.15);
      put(m, this.res.food[kind]);
      foodsVis.push(it);
    }
    // yayalar: kameranın çevresindeki pencerede kaldırımda yürür (pencere uçlarında, sisin ve kameranın arkasında yer değiştirir)
    if (this.peds) {
      const W0 = camD - 22, mm = mt.b, t = this.time;
      this.peds.forEach((q) => {
        let d = q.d0 + q.dir * q.v * t;
        d = W0 + ((((d - W0) % PED_WIN) + PED_WIN) % PED_WIN);
        if (d > dMax || d < dMin) return;
        const P = this.res.ped(q.t);
        const yaw = q.stand ? (q.s ? -Math.PI / 2 : Math.PI / 2) + Math.sin(t * 0.4 + q.ph) * 0.3 : (q.dir > 0 ? Math.PI : 0);
        const ph = q.stand ? 0 : (d / 0.62) + q.ph;
        const sw = q.stand ? 0 : Math.sin(ph) * 0.5;
        const bob = q.stand ? Math.sin(t * 1.6 + q.ph) * 0.008 : Math.abs(Math.cos(ph)) * 0.035;
        const x = q.x, z = -d, y = 0.14 + bob;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        M.set(m, x, y, z, yaw);
        put(m, P.body);
        for (const k of [-1, 1]) {
          M.set(mm, x + cy * 0.095 * k, y + 0.86, z - sy * 0.095 * k, yaw, sw * k, 0);
          put(mm, P.leg);
          // duranlar yarışı izler: biri el sallar
          const wave = q.stand && k === 1 && (q.t & 1);
          const ax = wave ? -2.5 - 0.25 * Math.sin(t * 7 + q.ph) : -sw * k * 0.75;
          M.set(mm, x + cy * 0.25 * k, y + 1.36, z - sy * 0.25 * k, yaw, ax, k * (wave ? 0.35 + 0.25 * Math.sin(t * 7 + q.ph) : 0.08));
          put(mm, P.arm);
        }
        // yağmurda çoğu yayanın şemsiyesi var (biraz yana ve öne eğik, yürürken hafif sallanır)
        if (Wd.rain && q.t % 3 !== 2) {
          M.set(mm, x - cy * 0.05, y + 2.02, z + sy * 0.05, yaw, 0.1 + Math.sin(t * 1.3 + q.ph) * 0.05, 0.12 * Math.sin(q.ph));
          put(mm, this.res.umb(q.t + (q.ph * 10 | 0)));
        }
      });
    }
    // motorlar
    const scoots = [];
    this.ghosts.forEach((g) => {
      if (g.d < (fwd ? Math.max(dMin, camD + 4.2) : dMin) || g.d > dMax) return;
      // kameramla benim aramda, aynı hizadaki hayalet görüşümü kapatmasın
      if (fwd && r && !r.done && c.mode === 'chase' && g.d < r.d + 1.6 && Math.abs(g.x - r.x) < 1.7) return;
      const yaw = g.spin > 0 ? (1 - g.spin) * Math.PI * 2 : 0;
      const roll = clamp((g.x - KY.laneX(g.l) - g.off) * 0.3, -0.35, 0.35);
      scoots.push({ x: g.x, y: g.y, d: g.d, yaw, pitch: clamp(g.vy * 0.03, -0.25, 0.3), roll, ci: g.c, tb: g.tb, me: false, alpha: g.on ? 1 : 0.5 });
    });
    if (r) {
      const yaw = this.spin > 0 ? (1 - this.spin) * Math.PI * 2 : Math.sin(this.time * 32) * 0.22 * this.wob;
      const roll = clamp((r.x - KY.laneX(r.lane)) * 0.32, -0.38, 0.38);
      scoots.push({ x: r.x, y: r.y, d: r.d, yaw, pitch: clamp(r.vy * 0.032, -0.28, 0.32), roll, ci: this.myServer?.c ?? 0, tb: r.turbo > 0, me: true, alpha: 1 });
    }
    const sm = this.smats || (this.smats = []);
    // başlangıçta beklerken sürücüler sol ayağını yere koyar, motor hafifçe sola yatar
    const stopped = this.view?.phase === 'ready';
    scoots.forEach((s, i) => {
      const mm = sm[i] || (sm[i] = new Float32Array(16));
      M.set(mm, s.x, s.y, -s.d, s.yaw, s.pitch, s.roll + (stopped ? 0.09 : 0));
      s.m = mm;
      const far = !s.me && Math.abs(s.d - camD) > 20;
      put(mm, this.res.scooter(s.ci, far, stopped));
      // tekerlekler gidilen yola göre döner (r = 0.27 m)
      const wa = -((s.d / 0.27) % (Math.PI * 2));
      M.set(mt.b, 0, 0.27, -0.7, 0, wa); M.mul(mt.c, mm, mt.b); put(mt.c, this.res.wheel(true, far));
      M.set(mt.b, 0, 0.27, 0.6, 0, wa); M.mul(mt.c, mm, mt.b); put(mt.c, this.res.wheel(false, far));
      if (s.tb) {
        M.set(mt.b, 0.218, 0.414, 0.93, 0, 0, 0, 0.8 + Math.random() * 0.6);
        M.mul(mt.c, mm, mt.b);
        put(mt.c, this.res.flame, ONE3, 1, 1.2, false);
      }
    });
    // ---- gerçek gölgeler: oyuncunun önündeki bölge (binalar, ağaçlar, araçlar, motorlar) ----
    {
      const sd = r && c.mode === 'chase' ? r.d : camD;
      const ahead = fwd ? 1 : -1;
      if (shadowBegin(X, K.sun, r ? r.x * 0.4 : 0, 0, -(sd + ahead * 19), 33, 90)) {
        const lo = Math.min(sd - 16 * ahead, sd + 54 * ahead), hi = Math.max(sd - 16 * ahead, sd + 54 * ahead);
        for (let i = Math.floor(lo / CH); i <= Math.floor(hi / CH); i++) {
          const ch = Wd.chunks.get(i);
          if (ch) shadowCast(X, ch.lit, IDENT);
        }
        for (let k = 0; k < dn; k++) if (DL[k].cast) shadowCast(X, DL[k].mesh, DL[k].m);
      }
      shadowEnd(X, W, H);
    }
    gl.viewport(0, 0, W, H);
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

    // ---- opak ----
    useProg(X, X.lit, F, tod);
    gl.uniform2f(X.lit.u.uFogR, 140, 560);
    M.set(mt.sky, c.x, 0, c.z);
    drawMesh(X, Wd.sky, mt.sky);
    gl.uniform2f(X.lit.u.uFogR, tod.fogR[0], tod.fogR[1]);
    aoOn(X, 0.05, 1.5, 0.32);
    detailOn(X, 0.22, 0.085);
    for (let i = Math.floor(dMin / CH); i <= Math.floor(dMax / CH); i++) {
      const ch = Wd.chunks.get(i);
      if (ch) drawMesh(X, ch.lit, IDENT);
    }
    detailOn(X, 0);
    for (let k = 0; k < dn; k++) { const e = DL[k]; drawMesh(X, e.mesh, e.m, e.tint, e.al, e.gw); }
    // ---- dokulu ----
    useProg(X, X.tex, F, tod);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, tod.night * 0.85);
    gl.bindTexture(gl.TEXTURE_2D, this.res.atlas);
    for (let i = Math.floor(dMin / CH); i <= Math.floor(dMax / CH); i++) {
      const ch = Wd.chunks.get(i);
      if (ch?.tex) drawMesh(X, ch.tex, IDENT);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    gl.uniform1f(X.tex.u.uSelf, 0.25 + tod.night * 0.5);
    scoots.forEach((s) => drawMesh(X, this.res.decal, s.m));
    // ---- saydam ----
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, tod);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    scoots.forEach((s) => { M.set(m, s.x, 0.02, -s.d, 0, 0, 0, 0.5, 1, 1.05 - Math.min(0.45, s.y * 0.15)); drawMesh(X, this.res.shadow, m, ONE3, clamp(0.75 - s.y * 0.25, 0.2, 0.75)); });
    obsVis.forEach((o) => { if (o.k === 'car' || o.k === 'van' || o.k === 'bus') { M.set(m, o.x, 0.02, -o.z, 0, 0, 0, 1.2, 1, o.l * 1.12); drawMesh(X, this.res.shadow, m, ONE3, 0.6); } });
    foodsVis.forEach((it) => { M.set(m, it.x, 0.02, -it.z, 0, 0, 0, 0.36, 1, 0.36); drawMesh(X, this.res.shadow, m, ONE3, 0.45); });
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // katkı ışıkları
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    if (tod.night > 0.3) {
      for (let i = Math.floor(dMin / CH); i <= Math.floor(dMax / CH); i++) {
        const ch = Wd.chunks.get(i);
        if (ch?.glow) drawMesh(X, ch.glow, IDENT, ONE3, tod.night * 0.8);
        if (ch?.wet) drawMesh(X, ch.wet, IDENT, ONE3, 0.85 + 0.1 * Math.sin(this.time * 7 + i));
      }
    }
    const acc = K.acc;
    foodsVis.forEach((it) => { M.set(m, it.x, 0.03, -it.z, 0, 0, 0, 0.9, 1, 0.9); drawMesh(X, this.res.glow, m, acc, 0.45 + tod.night * 0.4); });
    // yolda duran araçların dörtlü flaşörleri (yanıp söner)
    if ((this.time * 1.4) % 1 < 0.55) {
      obsVis.forEach((o) => {
        if (o.k !== 'car' && o.k !== 'van' && o.k !== 'bus') return;
        const y = o.k === 'bus' ? 0.95 : o.k === 'van' ? 1.0 : 0.82;
        for (const sd of [-1, 1]) {
          M.set(m, o.x + sd * (o.w - 0.14), y, -o.z + o.l + 0.05, 0, Math.PI / 2, 0, 0.3);
          drawMesh(X, this.res.glow, m, HAZARD_C, 0.75 + tod.night * 0.5);
        }
      });
    }
    if (r && lampOn && c.mode === 'chase') {
      M.set(m, r.x, 0.03, -(r.d + 6.2), 0, 0, 0, 2.3, 1, 5.2); drawMesh(X, this.res.glow, m, HEAD_GLOW, 0.42 * tod.night);
    }
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);      // son ışık çiziminin rengi parçacıkları boyamasın
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    if (Wd.rain && this.drops) { const nr = this.fillRain(mt.V, spd); if (nr) drawDynamic(X, X.dyn2, this.pR, nr, false); }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    const turboK = r && !r.done ? (r.turbo > 0 ? 0.7 : clamp((spd - 16) / 30, 0, 0.25)) : 0;
    this.radK = damp(this.radK || 0, turboK, 4, 0.016);
    postFX(X, W, H, Object.assign(tod.night > 0.6 ? { bloom: 0.9, th: 0.6, white: 0.25, sat: 1.1, con: 0.12, vig: 0.7 } : tod.night > 0.2 ? { bloom: 0.62, th: 0.72, white: 0.3, sat: 1.1, con: 0.14, vig: 0.6 } : { bloom: 0.4, th: 0.84, white: 0.22, sat: 1.08, con: 0.14, vig: 0.5 }, { rad: [0.5, 0.42, this.radK] }));
  }

  // WebGL yoksa: üstten görünüm
  draw2d() {
    const g = this.g2;
    const cv = this.el.cv;
    const w = this.el.wrap.clientWidth || 1, h = this.el.wrap.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#5c8f4a'; g.fillRect(0, 0, w, h);
    const rw = Math.min(w * 0.86, 360), x0 = (w - rw) / 2, lw = rw / 3;
    g.fillStyle = '#2b2e36'; g.fillRect(x0, 0, rw, h);
    const r = this.me;
    const base = r ? r.d : (this.ghosts.size ? Math.max(...[...this.ghosts.values()].map((q) => q.d)) : 0);
    const py = h * 0.78, ppm = 9;
    const Y = (d) => py - (d - base) * ppm;
    const X2 = (x) => x0 + rw / 2 + (x / KY.LANE_W) * lw;
    g.fillStyle = '#eee';
    for (let k = Math.floor((base - 30) / 7) * 7; k < base + 120; k += 7) [-1, 1].forEach((s) => g.fillRect(x0 + rw / 2 + s * lw / 2 - 2, Y(k + 3), 4, 3 * ppm));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const EM = { cone: '🔶', barrier: '🚧', car: '🚗', van: '🚐', bus: '🚌', puddle: '💧', ramp: '⛰️', pad: '⚡' };
    g.font = '26px system-ui';
    this.track.obs.forEach((o) => { const y = Y(o.z); if (y < -40 || y > h + 40 || this.knock.has(o.id)) return; g.fillText(EM[o.k] || '■', X2(o.x), y); });
    g.font = '20px system-ui';
    this.track.items.forEach((it) => { if (r && r.got.has(it.id)) return; const y = Y(it.z); if (y < -30 || y > h + 30) return; g.fillText(FOOD_EMOJI[this.food[it.id % this.food.length]], X2(it.x), y); });
    this.ghosts.forEach((q) => { const y = Y(q.d); if (y < -30 || y > h + 30) return; g.fillStyle = pcol(q.c); g.beginPath(); g.arc(X2(q.x), y, 11, 0, 7); g.fill(); });
    if (r) { g.font = '34px system-ui'; g.fillText('🛵', X2(r.x), py - r.y * 8); }
  }

  /* ---------- HUD ---------- */
  hud(sNow) {
    const v = this.view;
    if (!v) return;
    const r = this.me;
    const racing = (v.phase === 'ready' || v.phase === 'race') && !!v.startAt;
    const el = racing ? (sNow - v.startAt) / 1000 : 0;
    const showHud = racing || v.phase === 'result';
    const vis = showHud ? 'visible' : 'hidden';
    if (this.el.hud.style.visibility !== vis) this.el.hud.style.visibility = vis;
    // geri sayım
    if (v.phase === 'ready' || (v.phase === 'race' && el < 0.6)) {
      const left = -el;
      const n = Math.ceil(left);
      if (left > 0 && left <= 3 && n !== this.lastBeep) { this.lastBeep = n; this.msg(String(n), 'big'); this.snd.fx('beep'); }
      if (left <= 0 && this.lastBeep > 0 && this.lastBeep < 99) { this.lastBeep = 0; this.msg('BAŞLA!', 'big gold'); this.snd.fx('go'); vibrate(40); }
    }
    if (this.cdEl) {
      const end = v.phase === 'ready' ? v.startAt : v.endsAt;
      const s = Math.max(0, Math.ceil((end - sNow) / 1000));
      if (this.cdEl.textContent !== String(s)) this.cdEl.textContent = String(s);
    }
    if (this.goBtn) {
      const vis = v.phase === 'ready' && v.startAt - sNow > 3900 ? 'visible' : 'hidden';
      if (this.goBtn.style.visibility !== vis) this.goBtn.style.visibility = vis;
    }
    if (v.phase === 'ready' && (v.startAt - sNow <= 3300) !== (this.panelKey === 'count')) this.panel();
    // kontroller
    const ctlOn = !!r && !r.done && racing && el > -3.2;
    this.el.ctl.classList.toggle('off', !ctlOn);
    this.el.meter.style.display = r && racing && !r.done && !this.panelLow ? '' : 'none';
    // not
    let note = '';
    if (racing && !r && v.phase === 'race') note = '👀 Bu yarışı izliyorsun — sonraki yarışta sen de varsın!';
    if (r && r.done && v.phase === 'race') {
      const st = this.standings();
      const pl = st.findIndex((s) => s.me) + 1;
      note = `✅ ${pl}. sırada teslim ettin · ${fmtSec(this.finishMs)} — diğerleri bekleniyor…`;
    }
    if (note !== this.noteText) { this.noteText = note; this.el.note.textContent = note; this.el.note.classList.toggle('on', !!note); }
    if (!showHud) return;
    // süre
    const raceMs = r && r.done ? this.finishMs : Math.max(0, sNow - v.startAt);
    const tt = v.phase === 'result' ? '' : `${(raceMs / 1000).toFixed(1).replace('.', ',')} sn`;
    if (tt !== this.ttText) { this.ttText = tt; this.el.tm.textContent = tt || '🏁'; }
    // sıra
    const st = this.standings();
    const myIdx = st.findIndex((s) => s.me);
    const pos = myIdx + 1;
    if (r && pos !== this.place) {
      if (this.place && el > 3 && !r.done) { this.snd.fx(pos < this.place ? 'up' : 'down'); this.el.pos.classList.add('pulse'); setTimeout(() => this.el.pos.classList.remove('pulse'), 220); }
      this.place = pos;
    }
    const pb = r ? `${pos}.` : '👀', ps = r ? `/${st.length}` : '';
    if (this.el.posB.textContent !== pb) this.el.posB.textContent = pb;
    if (this.el.posS.textContent !== ps) this.el.posS.textContent = ps;
    // ilerleme çubuğu
    const seen = new Set();
    st.forEach((s) => {
      seen.add(s.id);
      let d = this.dots.get(s.id);
      if (!d) {
        d = document.createElement('span');
        d.className = `dot${s.me ? ' me' : ''}`;
        d.style.background = pcol(s.c);
        this.el.bar.appendChild(d);
        this.dots.set(s.id, d);
      }
      d.style.left = `${clamp((s.f != null ? KY.LEN : s.d) / KY.LEN, 0, 1) * 100}%`;
    });
    this.dots.forEach((d, id) => { if (!seen.has(id)) { d.remove(); this.dots.delete(id); } });
    if (r) this.el.fill.style.width = `${clamp(r.d / KY.LEN, 0, 1) * 100}%`;
    // turbo vinyeti
    const wantTb = !!r && r.turbo > 0 && !r.done;
    if (!this.flashing && wantTb !== !!this.vigTb) { this.vigTb = wantTb; this.el.vig.className = wantTb ? 'vig on tb' : 'vig'; }
    // turbo sayacı
    if (r) {
      const hot = r.turbo > 0;
      const fillN = hot ? Math.ceil((r.turbo / 2.6) * KY.NEED) : r.meter;
      if (fillN !== this.meterN || hot !== this.meterHot) {
        this.meterN = fillN; this.meterHot = hot;
        this.el.meter.classList.toggle('hot', hot);
        this.el.segs.forEach((s, i) => s.classList.toggle('f', i < fillN));
      }
    }
  }

  labels() {
    const vis = new Set();
    const L = [];
    const c = this.cam;
    const camD = -c.z;
    const fwd = -c.tz >= camD;
    this.ghosts.forEach((g) => {
      if (!this.X || (fwd ? g.d < camD + 9 || g.d > camD + 75 : g.d > camD - 3 || g.d < camD - 75)) return;
      const p = this.project(g.x, g.y + 2.25, -g.d);
      if (!p) return;
      vis.add(g.id);
      if (!g.lbl) {
        g.lbl = document.createElement('div');
        g.lbl.className = 'lbl';
        g.lbl.innerHTML = `<i style="background:${pcol(g.c)}"></i>${esc(g.n)}`;
        this.el.lbls.appendChild(g.lbl);
      }
      const dist = Math.abs(g.d - camD);
      L.push({ o: g, x: p[0], y: p[1], op: g.on ? 1 : 0.5, sc: clamp(1.25 - dist / 70, 0.6, 1.1) });
    });
    placeLabels(L, 1);
    this.ghosts.forEach((g) => { if (g.lbl && !vis.has(g.id)) g.lbl.style.display = 'none'; });
  }

  /* ---------- ağ ---------- */
  net(sNow) {
    const v = this.view;
    const r = this.me;
    if (!r || !v || (v.phase !== 'ready' && v.phase !== 'race') || sNow < v.startAt || !this.started) return;
    if (r.done && this.myServer?.f != null) return;
    const t = performance.now();
    const gap = r.done ? 300 : 140;
    if (t - this.lastSend < gap) return;
    this.lastSend = t;
    const p = { d: Math.round(r.d * 10) / 10, l: r.lane, a: r.air ? 1 : 0, tb: r.turbo > 0 ? 1 : 0, h: r.hits, it: r.items };
    if (r.done) { p.f = 1; p.ft = Math.round(this.finishMs); }
    try {
      if (this.ctx.sendQuiet) this.ctx.sendQuiet('progress', p);
      else this.ctx.send('progress', p);
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
      const v = this.view;
      if (this.world?.prebuild) {
        const focus = this.me ? this.me.d : -this.cam.z;
        const all = this.world.allBuilt?.();
        if (!all) this.world.prebuild(focus, v?.phase === 'race' ? 230 : 1200, v?.phase === 'race' ? 1 : 2);
      }
      this.sim(sNow);
      this.milestones();
      this.stepGhosts(dt);
      this.spin = Math.max(0, (this.spin || 0) - dt * 1.1);
      this.wob = Math.max(0, (this.wob || 0) - dt * 2.2);
      this.knock.forEach((k) => { k.t += dt; k.vy -= 18 * dt; k.x += k.vx * dt; k.y = Math.max(0, k.y + k.vy * dt); k.z += k.vz * dt; k.rx += k.wx * dt; k.rz += k.wz * dt; });
      this.stepParts(dt);
      this.stepCam(dt, sNow);
      if (this.rainOn) this.stepRain(dt);
      const r = this.me;
      if (this.snd.eng) {
        const racing = v && (v.phase === 'ready' || v.phase === 'race');
        this.snd.engineSet(r && !r.done && sNow >= (v?.startAt || 0) ? r.v : 4, r?.turbo > 0, r?.air, racing && !!r && !r.done);
      } else if (r && !r.done && v && (v.phase === 'ready' || v.phase === 'race')) this.snd.engine(true);
      if (r?.done && this.snd.eng && performance.now() - this.finishWall > 1500) this.snd.engine(false);
      this.net(sNow);
      this.draw(sNow);
      this.labels();
      this.hud(sNow);
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      // uyarlanır çözünürlük
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[kurye]', e); }
    }
  }

  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand).kurye();
      this.lost = false;
      const seed = this.seed || 1;
      const tod = this.tod || 0;
      const keepTrack = this.track;
      this.world = new World(this.X, this.res, seed, tod);
      if (keepTrack && keepTrack.seed === seed) this.track = keepTrack;
    } catch (e) { console.warn('[kurye] geri yükleme', e); }
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
        this.world?.dispose?.();
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
    console.error('[kurye]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

// Test ve hata ayıklama için (oyunda kullanılmaz)
export const _dbg = () => ({ G, KY });

// Kardeş 3B oyunlar (Sumo Tepsisi) bu motoru yeniden kullanır: aynı WebGL yardımcıları, modeller, sesler.
// Model inceleme (yalnızca geliştirme testleri; oyunda kullanılmaz)
export const _mdl = () => ({ pedBody, pedLeg, pedArm, PED_TYPES, carModel, vanModel, busModel, scooterModel, scooterWheel, coneModel, barrierModel, foodModel, wheel, buildBuilding, buildTree, buildProp, buildLamp, makeLayout, KY });
export const _eng = () => ({ limb, ik2, psurf, loft, ellPatch, ctx2d, podiumHTML, placeLabels, EmoteUI, KIT, drawToon, detailOn, aoOn, postFX, shadowBegin, shadowCast, shadowEnd, shadowSet, emitSoft, autoRes, sfx, clamp, lerp, damp, esc, hexRGB, C, shade, mixc, M, makeGL, MB, freeMesh, makeTexture, updateTexture, useProg, drawMesh, drawSky, drawDynamic, TOD, norm3, brandInfo, Res, Snd, pcol, PLAYER_COLORS, fmtSec, vibrate, medal, ONE3, IDENT, baseFov, injectStyle, FOOD_EMOJI, FOOD_NAME, DES });
