// Mutfak Kaosu — 3D ortak mutfak oyunu (NFC Dünyası Oyun)
// Kurye Yarışı'nın küçük WebGL motorunu yeniden kullanır. Sim sunucuda döner (30 Hz); telefon girdi + tek tuş gönderir,
// kendi karakterini tahmin eder, diğerlerini yumuşatarak gösterir.
import { _eng } from './kuryeYarisi.js?v=2026-11-24-a';
import { _masa } from './masa3d.js?v=2026-11-24-a';
const { ctx2d, podiumHTML, placeLabels, EmoteUI, aoOn, detailOn, KIT, drawToon, postFX, shadowBegin, shadowCast, shadowEnd, autoRes, sfx, clamp, lerp, damp, esc, hexRGB, C, shade, mixc, M, makeGL, MB, freeMesh, makeTexture, updateTexture, drawMesh, drawSky, drawDynamic, useProg, TOD, norm3, brandInfo, Res, Snd, pcol, vibrate, medal, ONE3, injectStyle, FOOD_EMOJI, FOOD_NAME, fmtSec, DES, limb } = _eng();
let MA = null;
const AV_K = 1.1;   // aşçıların ölçeği (mutfak ve karakter yarıçapına göre)
const masa = () => MA || (MA = _masa());   // masa karakterleri: oyuncu her oyunda aynı görünür (burada aşçı kılığında)

const KK = (() => {
  // Mutfak Kaosu çekirdeği: mutfak yerleşimi, hareket, istasyonlar, tarifler ve bot zekâsı.
  // Sunucu (gerçek durum) ve telefon (kendi karakterinin tahmini + hedef gösterimi) AYNI kodu çalıştırır.
  const DT = 1 / 30;
  const PR = 0.45;               // karakter yarıçapı
  const SPD = 4.6, ACC = 38;     // hız (m/sn), ivme
  const REACH = PR + 0.8;        // istasyona erişim mesafesi (merkezden dikdörtgene)
  const CHOP_T = 3.0, COOK_T = 5.0, BURN_T = 11.0; // sn (yerleştirmeden itibaren)
  const ROOM = { x0: -4.6, x1: 4.6, y0: -6.6, y1: 6.6 };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // eşya kodları
  const I = { NONE: 0, BREAD: 1, RAW: 2, TOM: 3, LET: 4, COOK: 5, BURN: 6, STOM: 7, SLET: 8, KE: 10, BU: 11, SA: 12, SU: 13 };
  const NAMES = { 1: 'Ekmek', 2: 'Çiğ köfte', 3: 'Domates', 4: 'Marul', 5: 'Köfte', 6: 'Yanık köfte', 7: 'Dilimli domates', 8: 'Dilimli marul', 10: 'Köfte Ekmek', 11: 'Burger', 12: 'Salata', 13: 'Süper Burger' };
  const EMOJI = { 1: '🍞', 2: '🥩', 3: '🍅', 4: '🥬', 5: '🍖', 6: '⬛', 7: '🍅', 8: '🥬', 10: '🥪', 11: '🍔', 12: '🥗', 13: '🍔' };
  // tarifler: malzeme listesi (işlenmiş halleriyle)
  const RECIPES = {
    10: { n: 'Köfte Ekmek', ing: [1, 5], w: 1.0 },
    11: { n: 'Burger', ing: [1, 5, 7], w: 1.5 },
    12: { n: 'Salata', ing: [7, 8], w: 1.2 },
    13: { n: 'Süper Burger', ing: [1, 5, 7, 8], w: 2.0 },
  };
  const BIT = { 1: 1, 5: 2, 7: 4, 8: 8 };
  const MASK_RECIPE = { 3: 10, 7: 11, 12: 12, 15: 13 };
  const RAW_OF = { 1: 1, 5: 2, 7: 3, 8: 4 }; // işlenmiş -> kasa/ham
  const isDish = (it) => it >= 10;

  const LEVELS = [
    { name: 'Mini Mutfak', emoji: '🥪', sub: 'Köfte Ekmek ve Burger', time: 90, recipes: [10, 10, 11], every: 13, open: 3, pat: 62, island: 0, grills: 1, boards: 1, plates: 1, crates: [1, 2, 3] },
    { name: 'Kalabalık Saat', emoji: '🥗', sub: 'Menüde salata da var!', time: 100, recipes: [10, 11, 11, 12], every: 11, open: 4, pat: 56, island: 1, grills: 2, boards: 2, plates: 2, crates: [1, 2, 3, 4] },
    { name: 'Öğle Yoğunluğu', emoji: '🔥', sub: 'Süper Burger geldi!', time: 110, recipes: [11, 11, 12, 13, 13], every: 9, open: 5, pat: 50, island: 1, grills: 2, boards: 2, plates: 2, crates: [1, 2, 3, 4] },
  ];

  const cache = [];
  // Mutfağı kur: istasyon tanımları (sabit sıra!) + sadece engel olan tezgâhlar
  function makeLevel(li) {
    if (cache[li]) return cache[li];
    const L = LEVELS[li];
    const st = [], solid = [];
    const add = (o) => { o.i = st.length; st.push(o); };
    // kullanılmayan yuvalar boş tezgâh olur: elindekini oraya da bırakabilirsin
    const tableAt = (x, y, w, h, fx, fy) => add({ k: 'table', x, y, w, h, fx, fy, item: 0, t0: 0 });
    [[-3.45, 1], [-1.15, 2], [1.15, 3], [3.45, 4]].forEach(([x, it]) => {
      if (L.crates.includes(it)) add({ k: 'crate', x, y: -6.0, w: 2.0, h: 1.2, fx: x, fy: -4.5, item: it });
      else tableAt(x, -6.0, 2.0, 1.2, x, -4.5);
    });
    [-2.6, -0.6].forEach((y, j) => {
      if (j < L.grills) add({ k: 'grill', x: -4.0, y, w: 1.2, h: 1.8, fx: -2.7, fy: y, item: 0, t0: 0 });
      else tableAt(-4.0, y, 1.2, 1.8, -2.7, y);
      if (j < L.boards) add({ k: 'board', x: 4.0, y, w: 1.2, h: 1.8, fx: 2.7, fy: y, item: 0, t0: 0 });
      else tableAt(4.0, y, 1.2, 1.8, 2.7, y);
    });
    add({ k: 'table', x: -4.0, y: 1.6, w: 1.2, h: 1.8, fx: -2.7, fy: 1.6, item: 0, t0: 0 });
    add({ k: 'table', x: 4.0, y: 1.6, w: 1.2, h: 1.8, fx: 2.7, fy: 1.6, item: 0, t0: 0 });
    [-3.2, -1.0].forEach((x, j) => {
      if (j < L.plates) add({ k: 'plate', x, y: 6.0, w: 1.8, h: 1.2, fx: x, fy: 4.5, plate: [], item: 0, t0: 0 });
      else tableAt(x, 6.0, 1.8, 1.2, x, 4.5);
    });
    add({ k: 'serve', x: 1.6, y: 6.0, w: 2.2, h: 1.2, fx: 1.6, fy: 4.5 });
    add({ k: 'trash', x: 3.7, y: 6.0, w: 1.2, h: 1.2, fx: 3.7, fy: 4.5 });
    if (L.island) add({ k: 'table', x: 0, y: 0.4, w: 3.0, h: 1.0, fx: 0, fy: 1.7, item: 0, t0: 0, island: 1 });
    const rects = st.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })).concat(solid);
    const grid = buildGrid(rects);
    const lv = { L, st, solid, rects, grid, li };
    cache[li] = lv;
    return lv;
  }

  // dinamik durumun boş kopyası (istasyonlar için)
  function freshStations(lv) {
    return lv.st.map((s) => ({ item: 0, t0: 0, plate: s.k === 'plate' ? [] : null }));
  }

  /* ---------------- hareket ---------------- */
  function pushOut(p, r) {
    const hx = r.w / 2, hy = r.h / 2;
    const cx = clamp(p.x, r.x - hx, r.x + hx), cy = clamp(p.y, r.y - hy, r.y + hy);
    let dx = p.x - cx, dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= PR * PR) return;
    if (d2 < 1e-8) {
      const ox = hx - Math.abs(p.x - r.x), oy = hy - Math.abs(p.y - r.y);
      if (ox < oy) p.x += (p.x >= r.x ? 1 : -1) * (ox + PR); else p.y += (p.y >= r.y ? 1 : -1) * (oy + PR);
      return;
    }
    const d = Math.sqrt(d2);
    p.x += (dx / d) * (PR - d); p.y += (dy / d) * (PR - d);
    const vn = p.vx * (dx / d) + p.vy * (dy / d);
    if (vn < 0) { p.vx -= vn * (dx / d); p.vy -= vn * (dy / d); }
  }
  function stepMove(p, ix, iy, dt, lv) {
    let m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; m = 1; }
    const tx = ix * SPD, ty = iy * SPD;
    const dx = tx - p.vx, dy = ty - p.vy;
    const dl = Math.hypot(dx, dy);
    const a = ACC * dt;
    if (dl <= a) { p.vx = tx; p.vy = ty; } else { p.vx += (dx / dl) * a; p.vy += (dy / dl) * a; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    for (let k = 0; k < 2; k++) for (let i = 0; i < lv.rects.length; i++) pushOut(p, lv.rects[i]);
    p.x = clamp(p.x, ROOM.x0 + PR, ROOM.x1 - PR);
    p.y = clamp(p.y, ROOM.y0 + PR, ROOM.y1 - PR);
    if (p.vx * p.vx + p.vy * p.vy > 0.5) p.ang = Math.atan2(p.vy, p.vx);
  }
  function spawn(i, n) {
    // alt-orta bölgede yarım daire
    const a = Math.PI * (0.15 + 0.7 * (n > 1 ? i / (n - 1) : 0.5));
    return { x: Math.cos(a + Math.PI) * 1.9 * (n > 1 ? 1 : 0), y: 3.0 - Math.sin(a) * 0.9, vx: 0, vy: 0, ang: -Math.PI / 2, hold: 0 };
  }

  /* ---------------- istasyonlar ---------------- */
  const rectDist = (p, s) => {
    const cx = clamp(p.x, s.x - s.w / 2, s.x + s.w / 2), cy = clamp(p.y, s.y - s.h / 2, s.y + s.h / 2);
    return Math.hypot(p.x - cx, p.y - cy);
  };
  // grill/tahta: şu anki etkin eşya kodu
  function eff(def, ss, now) {
    if (!ss.item) return 0;
    const e = (now - ss.t0) / 1000;
    if (def.k === 'board') return e >= CHOP_T ? (ss.item === 3 ? 7 : 8) : ss.item;
    if (def.k === 'grill') return e >= BURN_T ? 6 : e >= COOK_T ? 5 : 2;
    return ss.item;
  }
  const plateMask = (ss) => ss.plate.reduce((m, it) => m | (BIT[it] || 0), 0);
  // bu istasyonda elindekiyle ne yapılır? null = hiçbir şey
  function can(def, ss, hold, now) {
    switch (def.k) {
      case 'crate': return hold === 0 ? 'take' : hold === def.item ? 'back' : null;
      case 'board': {
        if (hold === 0) return ss.item ? 'pick' : null;
        return (hold === 3 || hold === 4) && !ss.item ? 'put' : null;
      }
      case 'grill': {
        if (hold === 0) return ss.item ? 'pick' : null;
        return hold === 2 && !ss.item ? 'put' : null;
      }
      case 'plate': {
        if (hold === 0) { const m = plateMask(ss); return MASK_RECIPE[m] ? 'dish' : ss.plate.length ? 'undo' : null; }
        return BIT[hold] && !(plateMask(ss) & BIT[hold]) ? 'put' : null;
      }
      case 'table': return hold ? (ss.item ? null : 'put') : ss.item ? 'pick' : null;
      case 'serve': return isDish(hold) ? 'serve' : null;
      case 'trash': return hold ? 'trash' : null;
      default: return null;
    }
  }
  // oyuncunun şu an etkileşeceği istasyon: {i, a}
  function target(lv, S, p, now) {
    let best = null, bd = 1e9;
    for (let i = 0; i < lv.st.length; i++) {
      const d = rectDist(p, lv.st[i]);
      if (d > REACH || d >= bd) continue;
      const a = can(lv.st[i], S[i], p.hold, now);
      if (a) { best = { i, a }; bd = d; }
    }
    return best;
  }
  // etkileşimi uygula; olay döner: {k, i, it}
  function act(lv, S, p, now) {
    const t = target(lv, S, p, now);
    if (!t) return null;
    const def = lv.st[t.i], ss = S[t.i];
    switch (t.a) {
      case 'take': p.hold = def.item; return { k: 'take', i: t.i, it: p.hold };
      case 'pick': {
        const it = def.k === 'table' ? ss.item : eff(def, ss, now);
        p.hold = it; ss.item = 0; ss.t0 = 0;
        return { k: 'pick', i: t.i, it };
      }
      case 'put': {
        const it = p.hold;
        if (def.k === 'plate') ss.plate.push(it); else { ss.item = it; ss.t0 = now; }
        p.hold = 0;
        return { k: 'put', i: t.i, it };
      }
      case 'dish': { const r = MASK_RECIPE[plateMask(ss)]; ss.plate = []; p.hold = r; return { k: 'dish', i: t.i, it: r }; }
      case 'undo': { const it = ss.plate.pop(); p.hold = it; return { k: 'pick', i: t.i, it }; }
      case 'trash': { const it = p.hold; p.hold = 0; return { k: 'trash', i: t.i, it }; }
      case 'back': { const it = p.hold; p.hold = 0; return { k: 'back', i: t.i, it }; }
      case 'serve': { const it = p.hold; return { k: 'serve', i: t.i, it }; }
      default: return null;
    }
  }

  /* ---------------- bot zekâsı ---------------- */
  const CELL = 0.4;
  function buildGrid(rects) {
    const W = Math.ceil((ROOM.x1 - ROOM.x0) / CELL), H = Math.ceil((ROOM.y1 - ROOM.y0) / CELL);
    const blocked = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = { x: ROOM.x0 + (i + 0.5) * CELL, y: ROOM.y0 + (j + 0.5) * CELL };
      let b = p.x < ROOM.x0 + PR - 0.05 || p.x > ROOM.x1 - PR + 0.05 || p.y < ROOM.y0 + PR - 0.05 || p.y > ROOM.y1 - PR + 0.05;
      for (const r of rects) { if (rectDist(p, r) < PR + 0.02) { b = true; break; } }
      blocked[j * W + i] = b ? 1 : 0;
    }
    return { W, H, blocked };
  }
  const cellOf = (g, x, y) => [clamp(Math.floor((x - ROOM.x0) / CELL), 0, g.W - 1), clamp(Math.floor((y - ROOM.y0) / CELL), 0, g.H - 1)];
  // BFS: hedefe giden yolun bir sonraki noktası
  function nextWay(g, x, y, tx, ty) {
    const [si, sj] = cellOf(g, x, y);
    let [ti, tj] = cellOf(g, tx, ty);
    const W = g.W, H = g.H;
    if (g.blocked[tj * W + ti]) {
      let best = null, bd = 1e9;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const a = ti + di, b = tj + dj; if (a < 0 || b < 0 || a >= W || b >= H || g.blocked[b * W + a]) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, b]; } }
      if (best) [ti, tj] = best;
    }
    const prev = new Int32Array(W * H).fill(-1);
    const q = [tj * W + ti];
    prev[q[0]] = q[0];
    const s = sj * W + si;
    let found = s === q[0];
    for (let qi = 0; qi < q.length && !found; qi++) {
      const k = q[qi], i = k % W, j = (k / W) | 0;
      for (let d = 0; d < 8; d++) {
        const di = [1, -1, 0, 0, 1, 1, -1, -1][d], dj = [0, 0, 1, -1, 1, -1, 1, -1][d];
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const nk = b * W + a;
        if (prev[nk] >= 0 || g.blocked[nk]) continue;
        if (di && dj && (g.blocked[j * W + a] || g.blocked[b * W + i])) continue;
        prev[nk] = k; q.push(nk);
        if (nk === s) { found = true; break; }
      }
    }
    if (!found || prev[s] < 0) return [tx, ty];
    let k = s;
    for (let n = 0; n < 2 && k !== q[0]; n++) k = prev[k];
    return [ROOM.x0 + ((k % W) + 0.5) * CELL, ROOM.y0 + (((k / W) | 0) + 0.5) * CELL];
  }

  // Açık siparişler için eksik malzemeyi bul: ham eşya kodu (kasa) döner ya da 0
  function missingRaw(lv, S, players, orders, selfIdx, now) {
    const supply = { 1: 0, 5: 0, 7: 0, 8: 0 };
    const add = (it) => {
      const f = { 1: 1, 2: 5, 3: 7, 4: 8, 5: 5, 7: 7, 8: 8 }[it];
      if (f) supply[f] += 1;
    };
    lv.st.forEach((def, i) => {
      const ss = S[i];
      if (def.k === 'plate') ss.plate.forEach(add);
      else if (def.k === 'grill') { if (ss.item && eff(def, ss, now) !== 6) add(2); }
      else if (def.k === 'board' || def.k === 'table') { if (ss.item) add(def.k === 'board' ? ss.item : ss.item); }
    });
    players.forEach((p, i) => { if (i !== selfIdx && p.hold) { if (isDish(p.hold)) RECIPES[p.hold].ing.forEach((x) => { /* teslim yolunda */ void x; }); else add(p.hold); } });
    // tabaklardaki hazır yemekler/ellerdeki yemekler siparişleri karşılar
    const covered = {};
    lv.st.forEach((def, i) => { if (def.k === 'plate') { const r = MASK_RECIPE[plateMask(S[i])]; if (r) covered[r] = (covered[r] || 0) + 1; } });
    players.forEach((p, i) => { if (i !== selfIdx && isDish(p.hold)) covered[p.hold] = (covered[p.hold] || 0) + 1; });
    const sorted = orders.slice().sort((a, b) => a.ex - b.ex);
    for (const o of sorted) {
      if (covered[o.r] > 0) { covered[o.r] -= 1; continue; }
      for (const ing of RECIPES[o.r].ing) {
        if (supply[ing] > 0) supply[ing] -= 1;
        else return RAW_OF[ing];
      }
    }
    return 0;
  }

  const stIdx = (lv, k, pred) => lv.st.map((d, i) => [d, i]).filter(([d]) => d.k === k && (!pred || pred(d))).map(([, i]) => i);
  const dist2 = (a, b) => (a.x - b.fx) * (a.x - b.fx) + (a.y - b.fy) * (a.y - b.fy);

  // Bot hedefi seç: {i} istasyon ya da null
  // Bu malzeme (1/5/7/8) için en uygun tabak: siparişlere uyan, yakın olan. Yoksa null.
  function plateFor(lv, S, orders, me, it) {
    let best = null, bs = -1;
    for (const i of stIdx(lv, 'plate')) {
      const m = plateMask(S[i]);
      if (m & BIT[it]) continue;
      const nm = m | BIT[it];
      let sc = -1;
      for (const o of orders) {
        const om = RECIPES[o.r].ing.reduce((a, x) => a | BIT[x], 0);
        if ((om & nm) === nm) sc = Math.max(sc, popcount(nm) * 4 + (om === nm ? 3 : 0));
      }
      if (sc < 0) sc = m === 0 ? 0 : -1;
      sc -= Math.sqrt(dist2(me, lv.st[i])) * 0.1;
      if (sc > bs) { bs = sc; best = i; }
    }
    return best !== null && bs > -0.5 ? best : null;
  }
  function chooseGoal(lv, S, players, orders, me, idx, now, taken) {
    const hold = me.hold;
    const near = (list) => list.slice().sort((a, b) => dist2(me, lv.st[a]) - dist2(me, lv.st[b]));
    const free = (i) => !taken.has(i);
    if (hold === 0) {
      // 1) hazır yemek tabağı
      for (const i of near(stIdx(lv, 'plate'))) {
        const r = MASK_RECIPE[plateMask(S[i])];
        if (r && orders.some((o) => o.r === r) && free(i)) return i;
      }
      // 2) pişmiş / işlenmiş şeyler
      for (const i of near(stIdx(lv, 'grill'))) { const e = eff(lv.st[i], S[i], now); if ((e === 5 || e === 6) && free(i)) return i; }
      for (const i of near(stIdx(lv, 'board'))) { if (S[i].item && (now - S[i].t0) / 1000 >= CHOP_T && free(i)) return i; }
      // 2b) tezgâhta bekleyen ve şu an işe yarayacak eşya (park edilmiş malzeme/yemek) ya da yanık köfte
      for (const i of near(stIdx(lv, 'table'))) {
        const it = S[i].item;
        if (!it || !free(i)) continue;
        const use = it === 6 ? true
          : isDish(it) ? orders.some((o) => o.r === it)
          : it === 2 ? stIdx(lv, 'grill').some((g) => !S[g].item)
          : it === 3 || it === 4 ? stIdx(lv, 'board').some((b) => !S[b].item)
          : BIT[it] ? plateFor(lv, S, orders, me, it) !== null : false;
        if (use) return i;
      }
      // 3) eksik malzemeyi kasadan al
      const raw = missingRaw(lv, S, players, orders, idx, now);
      if (raw) {
        const c = near(stIdx(lv, 'crate', (d) => d.item === raw))[0];
        if (c !== undefined) return c;
      }
      // 4) çıkmaz tabakları boşalt (geri al)
      for (const i of near(stIdx(lv, 'plate'))) {
        const m = plateMask(S[i]);
        if (S[i].plate.length && !MASK_RECIPE[m] && !orders.some((o) => RECIPES[o.r].ing.some((x) => BIT[x] & m) && (RECIPES[o.r].ing.reduce((a, x) => a | BIT[x], 0) & m) === m) && free(i)) return i;
      }
      return null;
    }
    const okAt = (i) => !!can(lv.st[i], S[i], hold, now);
    const trash = near(stIdx(lv, 'trash'))[0];
    const crateOf = (it) => near(stIdx(lv, 'crate', (d) => d.item === it))[0];
    const tbl = () => near(stIdx(lv, 'table', (d) => !d.island)).find((i) => !S[i].item) ?? near(stIdx(lv, 'table')).find((i) => !S[i].item);
    if (hold === 6) return trash;
    if (isDish(hold)) {
      if (orders.some((o) => o.r === hold)) return stIdx(lv, 'serve')[0];
      return tbl() ?? trash;
    }
    if (hold === 2 || hold === 3 || hold === 4) {
      const g = near(stIdx(lv, hold === 2 ? 'grill' : 'board')).filter(okAt);
      if (g.length) return g[0];
      // doluysa en yakın boş tezgâha bırak; o da yoksa kasasına geri koy
      return tbl() ?? crateOf(hold) ?? trash;
    }
    if (BIT[hold]) {
      const best = plateFor(lv, S, orders, me, hold);
      if (best !== null) return best;
      return (hold === 1 ? crateOf(1) : undefined) ?? tbl() ?? trash;
    }
    return null;
  }
  const popcount = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };

  // Bot adımı: mem (kalıcı), sk 0..1 beceri. {x,y,act}
  function bot(lv, S, players, orders, idx, mem, sk, now, rnd) {
    const me = players[idx];
    const out = { x: 0, y: 0, act: 0 };
    if (!mem.think || now >= mem.think) {
      mem.think = now + 160 + (1 - sk) * 500 + rnd() * 200;
      const taken = new Set();
      players.forEach((p, i) => { if (i !== idx && p.goal !== undefined && p.goal >= 0) taken.add(p.goal); });
      const g = chooseGoal(lv, S, players, orders, me, idx, now, taken);
      mem.goal = g === undefined ? null : g;
      me.goal = mem.goal ?? -1;
    }
    const gi = mem.goal;
    if (gi === null || gi === undefined) {
      // boşta: ortada bekle
      const wx = ((idx * 0.618) % 1 - 0.5) * 6 + Math.sin(now / 1900 + idx) * 0.4, wy = 3.0 + (idx % 3) * 0.6 + Math.cos(now / 2300 + idx * 2) * 0.3;
      out.x = clamp((wx - me.x) * 0.6, -0.5, 0.5); out.y = clamp((wy - me.y) * 0.6, -0.5, 0.5);
      return out;
    }
    const def = lv.st[gi];
    const t = target(lv, S, me, now);
    if (t && t.i === gi) {
      if (!mem.actAt || now >= mem.actAt) { out.act = 1; mem.actAt = now + 280 + (1 - sk) * 500 + rnd() * 250; mem.think = 0; }
      return out;
    }
    const d = rectDist(me, def);
    if (d <= REACH - 0.05 && t && t.i !== gi) {
      // yakında başka istasyon da var: hedefe biraz daha yaklaş
    }
    const [wx, wy] = nextWay(lv.grid, me.x, me.y, def.fx, def.fy);
    let dx = wx - me.x, dy = wy - me.y;
    const l = Math.hypot(dx, dy) || 1;
    const sp = 0.7 + 0.3 * sk;
    out.x = (dx / l) * sp; out.y = (dy / l) * sp;
    return out;
  }

  return { DT, PR, SPD, ACC, REACH, CHOP_T, COOK_T, BURN_T, ROOM, I, NAMES, EMOJI, RECIPES, LEVELS, BIT, MASK_RECIPE, makeLevel, freshStations, stepMove, spawn, eff, plateMask, can, target, act, rectDist, bot, isDish, clamp };
})();

/* ============================ modeller ============================ */

const TOP = 0.95;                 // tezgâh üst yüksekliği
const FLOOR_COLS = [['#f2e4c6', '#e3cba2'], ['#e6f1f0', '#a9cfcb'], ['#e8d9c3', '#c98a5b']];
const WOOD = '#b98450', WOOD_D = '#8a5a33', STEEL = '#cfd6dd', STEEL_D = '#8e99a5';
const CRATE_COL = { 1: '#e9b872', 2: '#e0605a', 3: '#e0382a', 4: '#6cbf4b' };
const ORDER_ING = [1, 5, 7, 8];
const ING_H = { 1: 0.13, 5: 0.1, 7: 0.09, 8: 0.07 };

// Zemin: dama karolar + dış alan + alçak kenar şeridi
function floorModel(mb, li, accentHex) {
  const [a, b] = FLOOR_COLS[li % 3].map((h) => C(h));
  const UPN = [0, -6, 0];
  const T = 0.92;
  const x0 = KK.ROOM.x0, x1 = KK.ROOM.x1, y0 = KK.ROOM.y0, y1 = KK.ROOM.y1;
  // derz (karoların arası) + hafif parlak, tek tek tonu değişen karolar
  mb.quad([x0, -0.004, y0], [x0, -0.004, y1], [x1, -0.004, y1], [x1, -0.004, y0], shade(b, 0.78), UPN);
  const g = 0.022;
  for (let j = 0, y = y0; y < y1 - 0.01; j++, y += T) {
    for (let i = 0, x = x0; x < x1 - 0.01; i++, x += T) {
      const xe = Math.min(x + T, x1), ye = Math.min(y + T, y1);
      const v = 0.96 + 0.07 * hash2k(i * 7 + 3, j * 13 + li);
      const c = shade((i + j) % 2 ? a : b, v);
      c[3] = -0.18;
      mb.quad([x + g, 0, y + g], [x + g, 0, ye - g], [xe - g, 0, ye - g], [xe - g, 0, y + g], c, UPN);
    }
  }
  const out = C('#3b2f2a');
  mb.quad([-60, -0.03, -60], [-60, -0.03, 60], [60, -0.03, 60], [60, -0.03, -60], out, UPN);
  const ac = C(accentHex);
  const cs = shade(ac, 0.9);
  mb.box(x0 - 0.35, -0.02, y0 - 0.35, x1 + 0.35, 0.16, y0, { top: cs, side: shade(ac, 0.7) }, 'b');
  mb.box(x0 - 0.35, -0.02, y1, x1 + 0.35, 0.16, y1 + 0.35, { top: cs, side: shade(ac, 0.7) }, 'b');
  mb.box(x0 - 0.35, -0.02, y0, x0, 0.16, y1, { top: cs, side: shade(ac, 0.7) }, 'b');
  mb.box(x1, -0.02, y0, x1 + 0.35, 0.16, y1, { top: cs, side: shade(ac, 0.7) }, 'b');
  // arka duvar
  mb.box(x0 - 0.35, 0, y0 - 0.8, x1 + 0.35, 3.0, y0 - 0.35, { top: C('#f7efe0'), side: C('#efe3cb'), front: C('#f3e9d2') });
  mb.box(x0 - 0.35, 1.9, y0 - 0.36, x1 + 0.35, 2.15, y0 - 0.3, ac);
}

// Arka duvar dokusu: altta metro karo (bir sıra marka renginde bordür), üstte sıva; 1024x256 = 9.9 x 3.0 birim
function drawKitchenWall(cv, accentHex, menu = []) {
  const W = cv.width, H = cv.height, g = cv.getContext('2d');
  const ux = W / 9.9, uy = H / 3.0;
  const Y = (y) => H - y * uy;
  let rs = 7;
  const R = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  // sıva
  g.fillStyle = '#f3e8d4'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = R() < 0.5 ? 'rgba(120,90,50,0.05)' : 'rgba(255,255,255,0.12)'; g.fillRect(R() * W, R() * Y(1.9), 1 + R() * 2, 1 + R() * 2); }
  // karolar
  const yTop = Y(1.9), tw = 0.3 * ux, th = 0.15 * uy;
  g.fillStyle = '#cfc6b6'; g.fillRect(0, yTop, W, H - yTop);
  const ac = accentHex;
  for (let r = 0; ; r++) {
    const yb = H - r * th, ya = yb - th;
    if (yb <= yTop + 0.5) break;
    const off = (r % 2) * tw * 0.5;
    for (let x = -off; x < W; x += tw) {
      const a = Math.max(ya, yTop) + 1.2, b = yb - 1.2;
      if (b - a < 2) continue;
      const v = 0.96 + R() * 0.05;
      const base = r === 9 ? ac : `rgb(${Math.round(247 * v)},${Math.round(244 * v)},${Math.round(236 * v)})`;
      g.fillStyle = base;
      const x0 = x + 1.2, x1 = x + tw - 1.2, rr = 2.2;
      g.beginPath(); g.moveTo(x0 + rr, a); g.lineTo(x1 - rr, a); g.quadraticCurveTo(x1, a, x1, a + rr); g.lineTo(x1, b - rr); g.quadraticCurveTo(x1, b, x1 - rr, b); g.lineTo(x0 + rr, b); g.quadraticCurveTo(x0, b, x0, b - rr); g.lineTo(x0, a + rr); g.quadraticCurveTo(x0, a, x0 + rr, a); g.fill();
      // sır parlaklığı: üstte açık, altta koyu ince kenar
      const gr = g.createLinearGradient(0, a, 0, b);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,40,20,0.16)');
      g.fillStyle = gr; g.fill();
    }
  }
  // bandın altında ve tezgâh arkasında yumuşak gölge
  let gr = g.createLinearGradient(0, yTop, 0, yTop + 16);
  gr.addColorStop(0, 'rgba(50,32,16,0.32)'); gr.addColorStop(1, 'rgba(50,32,16,0)');
  g.fillStyle = gr; g.fillRect(0, yTop, W, 16);
  gr = g.createLinearGradient(0, Y(1.25), 0, Y(0.8));
  gr.addColorStop(0, 'rgba(40,26,12,0)'); gr.addColorStop(1, 'rgba(40,26,12,0.3)');
  g.fillStyle = gr; g.fillRect(0, Y(1.25), W, Y(0.8) - Y(1.25));
  g.fillStyle = 'rgba(40,26,12,0.3)'; g.fillRect(0, Y(0.8), W, H - Y(0.8));
  const X = (x) => (x + 4.95) * ux;
  const drop = (f) => { g.save(); g.shadowColor = 'rgba(40,24,10,0.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3; f(); g.restore(); };
  // tebeşir menü panosu (ortada)
  const bx0 = X(-1.55), bx1 = X(1.55), by0 = Y(2.93), by1 = Y(2.24);
  drop(() => { g.fillStyle = '#8a5a33'; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0); });
  g.fillStyle = '#2e3a35'; g.fillRect(bx0 + 6, by0 + 5, bx1 - bx0 - 12, by1 - by0 - 10);
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.04})`; g.fillRect(bx0 + 8 + R() * (bx1 - bx0 - 16), by0 + 7 + R() * (by1 - by0 - 14), 2 + R() * 9, 1); }
  g.fillStyle = 'rgba(250,246,232,0.95)'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 19px "Trebuchet MS", system-ui, sans-serif';
  g.fillText('MENÜ', (bx0 + bx1) / 2, by0 + 18);
  g.fillStyle = 'rgba(255,216,96,0.9)'; g.fillRect((bx0 + bx1) / 2 - 30, by0 + 29, 60, 2);
  const items = menu.slice(0, 3);
  g.fillStyle = 'rgba(245,242,230,0.9)'; g.font = '700 12px "Trebuchet MS", system-ui, sans-serif';
  if (items.length) g.fillText(items.join('  •  '), (bx0 + bx1) / 2, by0 + 43, bx1 - bx0 - 20);
  // duvar saati (solda, 10:10)
  const cx = X(-3.3), cy = Y(2.58), rr = 0.27 * uy;
  drop(() => { g.fillStyle = accentHex; g.beginPath(); g.arc(cx, cy, rr, 0, 6.283); g.fill(); });
  g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(cx, cy, rr - 4, 0, 6.283); g.fill();
  g.strokeStyle = '#2b2a30'; g.lineCap = 'round';
  for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; g.lineWidth = k % 3 ? 1.2 : 2.2; g.beginPath(); g.moveTo(cx + Math.cos(a) * (rr - 7), cy + Math.sin(a) * (rr - 7)); g.lineTo(cx + Math.cos(a) * (rr - (k % 3 ? 9 : 11)), cy + Math.sin(a) * (rr - (k % 3 ? 9 : 11))); g.stroke(); }
  const hand = (a, l, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * l, cy - Math.cos(a) * l); g.stroke(); };
  hand((10.17 / 12) * 6.283, rr * 0.5, 2.6); hand((10 / 60) * 6.283, rr * 0.72, 1.8);
  g.fillStyle = '#d8402a'; g.beginPath(); g.arc(cx, cy, 2.2, 0, 6.283); g.fill();
  // çerçeveli yıldız plaketi (sağda)
  const px0 = X(2.85), px1 = X(3.75), py0 = Y(2.88), py1 = Y(2.3);
  drop(() => { g.fillStyle = '#c9a24a'; g.fillRect(px0, py0, px1 - px0, py1 - py0); });
  g.fillStyle = '#fff8e6'; g.fillRect(px0 + 4, py0 + 4, px1 - px0 - 8, py1 - py0 - 8);
  g.fillStyle = '#d9a521'; g.font = '900 15px system-ui, sans-serif';
  g.fillText('★ ★ ★', (px0 + px1) / 2, (py0 + py1) / 2 - 5);
  g.fillStyle = '#6b4a2a'; g.font = '800 8px "Trebuchet MS", system-ui, sans-serif';
  g.fillText('USTA MUTFAK', (px0 + px1) / 2, (py0 + py1) / 2 + 11);
}

// Arka duvar süsleri: raflar (kavanoz, kâse, şişe, bakır tencere), ortada asılı mutfak gereçleri
function wallDecoModel(mb, accentHex) {
  const zW = KK.ROOM.y0 - 0.35;           // duvarın ön yüzü
  const wood = C(WOOD, -0.2), woodD = C(WOOD_D, -0.2), steel = C('#c9d1d9', -0.85), steelD = C('#8e99a5', -0.7);
  const glass = C('#d8eef5', -0.9);
  const shelf = (xa, xb, y) => {
    mb.rbox(xa, y, zW - 0.02, xb, y + 0.07, zW + 0.27, 0.02, wood, 2);
    for (const xx of [xa + 0.14, xb - 0.14]) {
      mb.push().T(xx, y, 0);
      mb.wedge(-0.03, 0.03, zW + 0.22, zW, -0.2, woodD, woodD);
      mb.pop();
    }
  };
  const jar = (x, y, z, h, r, fill, lid) => {
    mb.lathe(x, y, z, [[0, 0], [r * 0.85, 0], [r, 0.03], [r, h * 0.82], [r * 0.82, h * 0.9], [r * 0.82, h * 0.95], [0, h * 0.95]], 14, glass);
    mb.lathe(x, y + 0.01, z, [[0, 0], [r * 0.82, 0], [r * 0.86, h * 0.62], [0, h * 0.64]], 12, C(fill, -0.25));
    mb.lathe(x, y + h * 0.93, z, [[0, 0], [r * 0.9, 0], [r * 0.92, h * 0.12], [r * 0.6, h * 0.16], [0, h * 0.16]], 12, C(lid, -0.6));
  };
  // sol raf
  const yL = 1.55, zS = zW + 0.13;
  shelf(-3.9, -2.2, yL);
  jar(-3.68, yL + 0.07, zS, 0.3, 0.085, '#c8341c', '#3b3b44');
  jar(-3.43, yL + 0.07, zS, 0.26, 0.08, '#e9b11f', '#3b3b44');
  jar(-3.18, yL + 0.07, zS, 0.32, 0.085, '#4f8f2f', '#b88a3c');
  for (let k = 0; k < 2; k++) mb.lathe(-2.78, yL + 0.07 + k * 0.06, zS, [[0, 0], [0.09, 0], [0.16, 0.05], [0.17, 0.065], [0.15, 0.06], [0.08, 0.012], [0, 0.012]], 18, C(k ? '#ffffff' : accentHex, -0.6));
  mb.lathe(-2.4, yL + 0.07, zS, [[0, 0], [0.06, 0], [0.065, 0.02], [0.065, 0.2], [0.03, 0.27], [0.022, 0.36], [0.03, 0.37], [0, 0.37]], 12, (i) => (i >= 5 ? C('#2b2a30', -0.6) : C('#e8c33a', -0.88)));
  // sağ raf
  const yR = 1.55;
  shelf(2.2, 3.9, yR);
  for (let k = 0; k < 4; k++) mb.lathe(2.55, yR + 0.07 + k * 0.03, zS, [[0, 0], [0.13, 0], [0.17, 0.012], [0.19, 0.028], [0.18, 0.03], [0.12, 0.012], [0, 0.012]], 20, C('#fbfbf8', -0.7));
  mb.lathe(3.1, yR + 0.07, zS, [[0, 0], [0.15, 0], [0.17, 0.02], [0.17, 0.2], [0.19, 0.21], [0.19, 0.23], [0, 0.23]], 20, C('#c8743a', -0.92));
  mb.cyl(3.1, yR + 0.3, zS, 0.03, yR + 0.33, 0.03, 8, C('#2b2a30', -0.5));
  mb.lathe(3.1, yR + 0.3, zS, [[0, 0], [0.17, 0], [0.12, 0.03], [0, 0.035]], 18, C('#d58a4c', -0.92));
  for (const [xx, cc] of [[3.52, '#f4f1ea'], [3.68, '#2b2a30']]) mb.lathe(xx, yR + 0.07, zS, [[0, 0], [0.045, 0], [0.05, 0.02], [0.05, 0.12], [0.03, 0.15], [0, 0.16]], 10, C(cc, -0.6));
  // asılı gereçler: çelik çubuk + kancalar
  const yRail = 1.92, zR = zW + 0.06;
  mb.push().T(0, yRail, zR, 0, 0, Math.PI / 2);
  mb.lathe(0, -1.95, 0, [[0.022, 0], [0.022, 3.9]], 10, steel);
  mb.pop();
  for (const xx of [-1.95, 1.95]) mb.sphereS(xx, yRail, zR, 0.04, 0.04, 0.04, steelD, 8, 6);
  const hook = (x) => { mb.push().T(x, yRail - 0.045, zR, 0, Math.PI / 2, 0); mb.torusN(0, 0, 0, 0.035, 0.008, 0.008, 10, 4, steelD); mb.pop(); };
  // kepçe
  hook(-1.45);
  mb.cyl(-1.45, yRail - 0.48, zR + 0.01, 0.014, yRail - 0.06, 0.014, 6, steel);
  mb.sphereS(-1.45, yRail - 0.53, zR + 0.05, 0.09, 0.06, 0.09, steel, 14, 8);
  // spatula
  hook(-0.8);
  mb.cyl(-0.8, yRail - 0.34, zR + 0.01, 0.016, yRail - 0.06, 0.016, 6, C('#2b2a30', -0.5));
  mb.rbox(-0.88, yRail - 0.56, zR - 0.006, -0.72, yRail - 0.34, zR + 0.012, 0.012, steel, 1);
  // tava
  hook(-0.1);
  mb.cyl(-0.1, yRail - 0.33, zR + 0.012, 0.02, yRail - 0.06, 0.02, 6, C('#2b2a30', -0.5));
  mb.push().T(-0.1, yRail - 0.52, zR + 0.03, 0, Math.PI / 2, 0);
  mb.lathe(0, -0.02, 0, [[0, 0], [0.17, 0], [0.2, 0.05], [0.21, 0.06], [0.17, 0.02], [0, 0.02]], 22, (i) => (i >= 2 ? C('#3a3d44', -0.7) : C('#c8743a', -0.92)));
  mb.pop();
  // çırpma teli
  hook(0.6);
  mb.cyl(0.6, yRail - 0.3, zR + 0.01, 0.018, yRail - 0.06, 0.018, 6, C(accentHex, -0.5));
  for (let k = 0; k < 4; k++) {
    mb.push().T(0.6, yRail - 0.4, zR + 0.04, (k / 4) * Math.PI, Math.PI / 2, 0, 1, 1, 1.7);
    mb.torusN(0, 0, 0, 0.055, 0.006, 0.006, 14, 3, steel);
    mb.pop();
  }
  // küçük süzgeç
  hook(1.3);
  mb.cyl(1.3, yRail - 0.3, zR + 0.01, 0.014, yRail - 0.06, 0.014, 6, steel);
  mb.push().T(1.3, yRail - 0.42, zR + 0.03, 0, Math.PI / 2, 0);
  mb.torusN(0, 0, 0, 0.1, 0.012, 0.012, 16, 4, steel);
  mb.lathe(0, 0, 0, [[0.1, 0], [0.085, -0.05], [0.05, -0.08], [0, -0.09]], 16, C('#aeb7c0', -0.75));
  mb.pop();
}


// Mutfağın önündeki salon (yatay ekranda sol tarafı, dikeyde alt şeridi doldurur)
const DINE_T = [[-2.7, 9.7, 0.2], [0.9, 9.35, 1.3], [4.2, 10.0, 2.4], [-6.3, 9.0, 0.9]];
// Masadaki müşteriler: masa başına 2 kişi (3 sandalyeden ilk ikisi). Görünüm tipi (0..7) ve masa/koltuk bilgisi.
const DINERS = (() => {
  const out = [];
  DINE_T.forEach(([x, z, a0], ti) => {
    for (let c = 0; c < 2; c++) {
      const a = a0 + Math.PI / 2 + c * (Math.PI * 2 / 3);
      out.push({ ti, x: x + Math.cos(a) * 1.08, z: z + Math.sin(a) * 1.08, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), tx: x + Math.cos(a) * 0.42, tz: z + Math.sin(a) * 0.42, k: (ti * 3 + c * 5) % 8 });
    }
  });
  return out;
})();
// müşterilerin görünümü (masa karakteri stil numaraları: farklı saç, kıyafet, aksesuar)
const DINER_CI = [6, 3, 9, 7, 11, 2, 10, 8];
function diningChair(mb, x, z, ry) {
  mb.push().T(x, 0, z, ry);
  const W = C('#8a5a33', -0.25), Wd = C('#6e4524', -0.2);
  mb.rbox(-0.22, 0.42, -0.22, 0.22, 0.48, 0.22, 0.03, W, 2);
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) mb.rbox(lx - 0.025, 0, lz - 0.025, lx + 0.025, 0.43, lz + 0.025, 0.012, Wd, 1);
  mb.rbox(-0.21, 0.48, 0.17, 0.21, 1.0, 0.22, 0.03, W, 2);
  mb.rbox(-0.16, 0.86, 0.165, 0.16, 0.93, 0.175, 0.01, Wd, 1);
  mb.pop();
}
function diningModel(mb, accentHex) {
  const cloth = C('#fbf7ee', -0.12), clothA = C(accentHex, -0.12);
  DINE_T.forEach(([x, z, a0], k) => {
    // ayak + tabla örtüsü (eteği marka renginde)
    mb.lathe(x, 0, z, [[0, 0], [0.32, 0], [0.34, 0.03], [0.1, 0.06], [0.07, 0.1], [0.07, 0.62], [0, 0.62]], 18, C('#3a2a20', -0.5));
    mb.lathe(x, 0, z, [[0.84, 0.46], [0.86, 0.48], [0.86, 0.48], [0.86, 0.53], [0.86, 0.53], [0.85, 0.72], [0.8, 0.765], [0, 0.765]], 32, (i) => (i <= 2 ? clothA : i <= 4 ? C('#ffffff', -0.1) : cloth));
    // iki tabak + vazoda çiçek
    for (const s2 of [-1, 1]) {
      mb.push().T(x + Math.cos(a0) * 0.42 * s2, 0.766, z + Math.sin(a0) * 0.42 * s2, 0, 0, 0, 0.21);
      KIT.plate(mb, accentHex);
      mb.pop();
    }
    mb.lathe(x, 0.765, z, [[0, 0], [0.06, 0], [0.075, 0.06], [0.045, 0.16], [0.05, 0.2], [0, 0.2]], 14, C('#bfe0ea', -0.85));
    const fl = ['#ff5a6e', '#ffd23f', '#ff8fd0', '#ffffff'][k % 4];
    mb.cyl(x, 0.95, z, 0.012, 1.12, 0.012, 5, C('#3f8a3a'));
    mb.sphereS(x, 1.14, z, 0.07, 0.06, 0.07, C(fl, -0.3), 10, 6);
    mb.sphereS(x + 0.05, 1.05, z, 0.05, 0.02, 0.03, C('#3f8a3a', -0.3), 6, 4);
    // sandalyeler masaya dönük
    for (let c = 0; c < 3; c++) {
      const a = a0 + Math.PI / 2 + c * (Math.PI * 2 / 3);
      diningChair(mb, x + Math.cos(a) * 1.08, z + Math.sin(a) * 1.08, Math.PI / 2 - a);
    }
  });
  // köşelerde büyük saksılar
  [[-5.55, 7.75, 0.42], [5.55, 7.75, 0.42], [-5.55, -6.0, 0.36], [5.55, -6.0, 0.36]].forEach(([x, z, k]) => {
    mb.push().T(x, 0, z, x * 0.7, 0, 0, k);
    KIT.basilPot(mb);
    mb.pop();
  });
}

// Tek istasyonun sabit gövdesi (dünya koordinatlarında)
function stationModel(mb, d, accentHex) {
  const x0 = d.x - d.w / 2, x1 = d.x + d.w / 2, z0 = d.y - d.h / 2, z1 = d.y + d.h / 2;
  const cx = d.x, cz = d.y;
  const steelTop = C('#a9b3bd', -0.32), steelSide = C('#7f8a96', -0.45), steelDark = C('#5c6672', -0.4);
  const body = (top, side) => mb.box(x0, 0, z0, x1, TOP, z1, { top: C(top), side: C(side), bot: C(side) });
  // paslanmaz çelik tezgâh: üst tabla + kenar dudağı + dolap kapakları
  const steelBody = () => {
    mb.box(x0 + 0.03, 0.06, z0 + 0.03, x1 - 0.03, TOP - 0.06, z1 - 0.03, { top: steelSide, side: steelSide });
    mb.box(x0, TOP - 0.06, z0, x1, TOP, z1, { top: steelTop, side: C('#98a2ad', -0.55) });
    mb.box(x0 + 0.05, 0, z0 + 0.05, x1 - 0.05, 0.06, z1 - 0.05, C('#2d3138'));
  };
  switch (d.k) {
    case 'crate': {
      mb.box(x0, 0, z0, x1, TOP, z1, { top: C(WOOD_D), side: C(WOOD) });
      mb.box(x0 + 0.1, TOP - 0.02, z0 + 0.1, x1 - 0.1, TOP + 0.02, z1 - 0.1, C(shade(C(CRATE_COL[d.item]), 0.55)));
      for (let k = 0; k < 3; k++) mb.box(x0 - 0.02, 0.2 + k * 0.28, z1 - 0.01, x1 + 0.02, 0.32 + k * 0.28, z1 + 0.03, C(WOOD_D));
      mb.box(x0 - 0.03, 0.02, z0 - 0.03, x0 + 0.1, TOP + 0.04, z0 + 0.1, C(WOOD_D));
      mb.box(x1 - 0.1, 0.02, z0 - 0.03, x1 + 0.03, TOP + 0.04, z0 + 0.1, C(WOOD_D));
      mb.box(x0 - 0.03, 0.02, z1 - 0.1, x0 + 0.1, TOP + 0.04, z1 + 0.03, C(WOOD_D));
      mb.box(x1 - 0.1, 0.02, z1 - 0.1, x1 + 0.03, TOP + 0.04, z1 + 0.03, C(WOOD_D));
      break;
    }
    case 'grill': {
      mb.box(x0, 0, z0, x1, TOP, z1, { top: C('#2b2f36', -0.4), side: C('#3a3f47', -0.45) });
      mb.box(x0 + 0.06, TOP, z0 + 0.06, x1 - 0.06, TOP + 0.06, z1 - 0.06, C('#121417'));
      // kızgın kömür altlığı
      mb.box(x0 + 0.12, TOP + 0.02, z0 + 0.12, x1 - 0.12, TOP + 0.03, z1 - 0.12, C('#5a1d08', 0.5));
      // yuvarlak döküm ızgara telleri
      for (let k = 0; k < 7; k++) {
        const z = z0 + 0.2 + k * ((d.h - 0.4) / 6);
        mb.push().T(cx, TOP + 0.1, z, 0, 0, Math.PI / 2);
        mb.lathe(0, -(d.w / 2 - 0.1), 0, [[0.025, 0], [0.025, d.w - 0.2]], 8, C('#8b939c', -0.55));
        mb.pop();
      }
      // düğmeler
      for (const zz of [z0 + 0.35, z1 - 0.35]) {
        mb.push().T(x1 + 0.005, 0.45, zz, 0, 0, -Math.PI / 2);
        mb.lathe(0, 0, 0, [[0.11, 0], [0.11, 0.04], [0.08, 0.07], [0, 0.07]], 14, C('#d8402a', -0.5));
        mb.pop();
      }
      break;
    }
    case 'board': {
      steelBody();
      // ahşap kesme tahtası (yuvarlatılmış köşe) + bıçak
      mb.box(cx - 0.44, TOP, cz - 0.72, cx + 0.44, TOP + 0.07, cz + 0.72, { top: C('#e8c98f', -0.1), side: C('#c9a067') });
      mb.box(cx - 0.4, TOP + 0.07, cz - 0.7, cx - 0.33, TOP + 0.1, cz - 0.38, C('#3b2a20', -0.3));
      mb.box(cx - 0.395, TOP + 0.075, cz - 0.38, cx - 0.335, TOP + 0.085, cz + 0.05, C('#dfe6ec', -0.85));
      break;
    }
    case 'plate': {
      body('#fff1c9', '#d9bf7e');
      // üst üste porselen tabaklar
      for (let k = 0; k < 3; k++) {
        const y = TOP + k * 0.035;
        mb.lathe(cx, y, cz, [[0, 0], [0.5, 0], [0.56, 0.008], [0.63, 0.03], [0.62, 0.036], [0.55, 0.018], [0.42, 0.012], [0, 0.012]], 28, (i) => (i >= 3 && i <= 4 ? C('#dfe7f0', -0.65) : C('#fbfbf8', -0.65)));
      }
      break;
    }
    case 'table': {
      if (d.island) {
        body('#e9dfcc', WOOD_D);
        mb.box(x0, TOP, z0, x1, TOP + 0.04, z1, { top: C('#f3ead6', -0.25), side: C('#d9cdb4') });
      } else {
        steelBody();
        // kalın ahşap kasap tablası: dokulu ayrı ağda (W.blocks) çizilir
        // köşede küçük süs: tuz-biber ya da yağ şişesi (malzeme alanını kapatmaz)
        const h = hash2k(Math.round(cx * 10), Math.round(cz * 10));
        const ox = x1 - 0.16, oz = z0 + 0.16;
        if (h < 0.5) {
          mb.lathe(ox, TOP + 0.06, oz, [[0, 0], [0.045, 0], [0.05, 0.02], [0.05, 0.11], [0.03, 0.14], [0, 0.15]], 10, C('#f4f1ea', -0.6));
          mb.lathe(ox - 0.11, TOP + 0.06, oz, [[0, 0], [0.045, 0], [0.05, 0.02], [0.05, 0.11], [0.03, 0.14], [0, 0.15]], 10, C('#2b2a30', -0.6));
        } else {
          mb.lathe(ox, TOP + 0.06, oz, [[0, 0], [0.06, 0], [0.065, 0.02], [0.065, 0.16], [0.03, 0.2], [0.02, 0.28], [0, 0.29]], 12, (i) => (i >= 4 ? C('#2f6b2a', -0.7) : C('#e8c33a', -0.85)));
        }
      }
      break;
    }
    case 'serve': {
      body('#3aa857', '#2a7d40');
      mb.box(x0 + 0.1, TOP, z0 + 0.1, x1 - 0.1, TOP + 0.03, z1 - 0.1, C('#58c474', -0.2));
      // pirinç servis zili
      mb.lathe(cx, TOP + 0.03, cz, [[0, 0], [0.3, 0], [0.31, 0.02], [0.27, 0.03], [0.26, 0.09], [0.21, 0.19], [0.12, 0.25], [0, 0.27]], 24, C('#d9a521', -0.85));
      mb.lathe(cx, TOP + 0.29, cz, [[0, 0], [0.03, 0], [0.03, 0.06], [0.05, 0.07], [0.05, 0.09], [0, 0.1]], 10, C('#e8e8e8', -0.8));
      break;
    }
    case 'trash': {
      body('#515a66', '#3a424c');
      mb.lathe(cx, TOP, cz, [[0, 0], [0.4, 0], [0.45, 0.48], [0.47, 0.5], [0.47, 0.56], [0.2, 0.6], [0.06, 0.6], [0.06, 0.66], [0, 0.66]], 22, (i) => (i <= 2 ? C('#7d8996', -0.55) : C('#a2adb9', -0.65)));
      break;
    }
    default: break;
  }
}

/* ---- işletmeye göre mutfak: tarif adları, emojiler, yiyecek modelleri ---- */
const KITS = {
  burger: {
    base: 'bun', meat: 'beef', cook: 'Köfteyi',
    names: { 1: 'Ekmek', 2: 'Çiğ köfte', 3: 'Domates', 4: 'Marul', 5: 'Köfte', 6: 'Yanık köfte', 7: 'Dilimli domates', 8: 'Dilimli marul', 10: 'Köfte Ekmek', 11: 'Burger', 12: 'Salata', 13: 'Süper Burger' },
    emo: { 1: '🍞', 2: '🥩', 3: '🍅', 4: '🥬', 5: '🍖', 6: '⬛', 7: '🍅', 8: '🥬', 10: '🥪', 11: '🍔', 12: '🥗', 13: '🍔' },
    sup: { 13: '✨' },
    subs: ['Köfte Ekmek ve Burger', 'Menüde salata da var!', 'Süper Burger geldi!'],
  },
  chicken: {
    base: 'bun', meat: 'chicken', cook: 'Tavuğu',
    names: { 1: 'Ekmek', 2: 'Çiğ tavuk', 3: 'Domates', 4: 'Marul', 5: 'Çıtır tavuk', 6: 'Yanık tavuk', 7: 'Dilimli domates', 8: 'Dilimli marul', 10: 'Tavuk Ekmek', 11: 'Tavuk Burger', 12: 'Salata', 13: 'Süper Tavuk Burger' },
    emo: { 1: '🍞', 2: '🍗', 3: '🍅', 4: '🥬', 5: '🍗', 6: '⬛', 7: '🍅', 8: '🥬', 10: '🥪', 11: '🍔', 12: '🥗', 13: '🍔' },
    sup: { 13: '✨' },
    subs: ['Tavuk Ekmek ve Tavuk Burger', 'Menüde salata da var!', 'Süper Tavuk Burger geldi!'],
  },
  rice: {
    base: 'rice', meat: 'chicken', cook: 'Tavuğu',
    names: { 1: 'Pilav', 2: 'Çiğ tavuk', 3: 'Domates', 4: 'Marul', 5: 'Soslu tavuk', 6: 'Yanık tavuk', 7: 'Dilimli domates', 8: 'Dilimli marul', 10: 'Tavuk Pilav', 11: 'Soslu Tavuk Pilav', 12: 'Salata', 13: 'Crush Tabağı' },
    emo: { 1: '🍚', 2: '🍗', 3: '🍅', 4: '🥬', 5: '🍗', 6: '⬛', 7: '🍅', 8: '🥬', 10: '🍛', 11: '🍛', 12: '🥗', 13: '🍱' },
    sup: { 11: '🌶️', 13: '✨' },
    subs: ['Tavuk Pilav ve Soslu Tavuk Pilav', 'Menüde salata da var!', 'Crush Tabağı geldi!'],
  },
  wrap: {
    base: 'wrap', meat: 'doner', cook: 'Döneri',
    names: { 1: 'Lavaş', 2: 'Çiğ et', 3: 'Domates', 4: 'Marul', 5: 'Döner', 6: 'Yanık döner', 7: 'Dilimli domates', 8: 'Dilimli marul', 10: 'Dürüm', 11: 'Acılı Dürüm', 12: 'Salata', 13: 'Süper Dürüm' },
    emo: { 1: '🫓', 2: '🥩', 3: '🍅', 4: '🥬', 5: '🥙', 6: '⬛', 7: '🍅', 8: '🥬', 10: '🌯', 11: '🌯', 12: '🥗', 13: '🌯' },
    sup: { 11: '🌶️', 13: '✨' },
    subs: ['Dürüm ve Acılı Dürüm', 'Menüde salata da var!', 'Süper Dürüm geldi!'],
  },
  // tatlıcı: kase + waffle (ızgarada pişer, yanar) + çilek/muz (tahtada dilimlenir)
  dessert: {
    base: 'bowl', meat: 'waffle', cook: 'Waffle hamurunu', fruit: true, chop: 'Çilek/muz', burnW: 'waffle',
    names: { 1: 'Kase', 2: 'Waffle hamuru', 3: 'Çilek', 4: 'Muz', 5: 'Waffle', 6: 'Yanık waffle', 7: 'Dilimli çilek', 8: 'Dilimli muz', 10: 'Waffle Kase', 11: 'Çilekli Waffle', 12: 'Meyve Kupu', 13: 'Eliz Bowl' },
    emo: { 1: '🥣', 2: '🥛', 3: '🍓', 4: '🍌', 5: '🧇', 6: '⬛', 7: '🍓', 8: '🍌', 10: '🧇', 11: '🧇', 12: '🍨', 13: '🥣' },
    sup: { 11: '🍓', 13: '✨' },
    lemo: { 1: '🍨', 2: '🍓' },
    subs: ['Waffle Kase ve Çilekli Waffle', 'Menüde meyve kupu da var!', 'Eliz Bowl geldi!'],
  },
};
const kitOf = (slug) => (slug === 'chicken-rice-crush' ? KITS.rice : slug === 'los-bravos' || slug === 'fried-chiko' ? KITS.chicken : slug === 'springfield' || slug === 'durum-max' ? KITS.wrap : slug === 'eliz' ? KITS.dessert : KITS.burger);
const mix3k = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* ---- yiyecekler: yerden başlar (y=0), x/z ortalı, yükseklik ~0.3. Pürüzsüz ve parlak. ---- */
function bunBottom(mb, y) {
  mb.lathe(0, y, 0, [[0, 0], [0.25, 0], [0.272, 0.02], [0.282, 0.055], [0.272, 0.09], [0.25, 0.1], [0, 0.1]], 22, (i) => (i >= 5 ? C('#f2d3a0', -0.05) : C('#d99448', -0.25)));
  return y + 0.1;
}
function bunTop(mb, y) {
  mb.lathe(0, y, 0, [[0, 0], [0.29, 0], [0.306, 0.03], [0.302, 0.08], [0.275, 0.13], [0.215, 0.18], [0.12, 0.212], [0, 0.222]], 22, (i) => (i <= 1 ? C('#f0d29a', -0.05) : C('#d58a3c', -0.4)));
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996, rr = 0.06 + 0.17 * Math.sqrt((i + 0.5) / 16);
    const h = 0.222 * Math.sqrt(Math.max(0, 1 - (rr / 0.3) ** 2));
    mb.sphereS(Math.cos(a) * rr, y + h + 0.004, Math.sin(a) * rr, 0.016, 0.006, 0.009, C('#fff3d2', -0.2), 6, 3);
  }
  return y + 0.222;
}
function pattyAt(mb, y, kind) {
  const raw = kind === 2, burnt = kind === 6;
  const base = burnt ? hexRGB('#1f1d1c') : raw ? hexRGB('#d65b55') : hexRGB('#6b381e');
  const fat = burnt ? hexRGB('#2e2a28') : raw ? hexRGB('#f2b3aa') : hexRGB('#8a4f2c');
  mb.lathe(0, y, 0, [[0, 0], [0.255, 0], [0.276, 0.018], [0.285, 0.045], [0.276, 0.072], [0.255, 0.09], [0, 0.09]], 20, (i, a) => {
    const n = hash2k(Math.floor(a * 3.1), i);
    const c = n > 0.72 ? fat : base;
    return [c[0], c[1], c[2], raw ? -0.45 : burnt ? -0.1 : -0.35];
  });
  if (!raw && !burnt) for (let k = -1; k <= 1; k++) mb.box(-0.2, y + 0.089, k * 0.11 - 0.014, 0.2, y + 0.094, k * 0.11 + 0.014, C('#2c160b', -0.2));
  return y + 0.09;
}
// Çıtır tavuk filetosu: çiğken pembe ve pürüzsüz, pişince altın sarısı ve tırtıklı
function chickenAt(mb, y, kind) {
  const raw = kind === 2, burnt = kind === 6;
  const base = burnt ? [0.12, 0.1, 0.09] : raw ? [0.9, 0.52, 0.5] : [0.82, 0.5, 0.17];
  const hi = burnt ? [0.22, 0.19, 0.16] : raw ? [0.99, 0.74, 0.7] : [0.99, 0.76, 0.33];
  mb.sphereS(0, y + 0.05, 0, 0.29, 0.055, 0.2, null, 22, 8, (x, yy, z) => {
    const n = hash2k(Math.floor((x + 1) * 7), Math.floor((z + 1) * 7 + yy * 3));
    const c = mix3k(base, hi, raw ? n * 0.45 : n * 0.9);
    return [c[0], c[1], c[2], raw ? -0.5 : burnt ? -0.08 : -0.28];
  });
  if (!raw) {
    for (let k = 0; k < 14; k++) {
      const a = k * 2.39996, r = 0.05 + 0.19 * Math.sqrt((k + 0.5) / 14);
      const c = mix3k(base, hi, hash2k(k, 5));
      mb.sphereS(Math.cos(a) * r, y + 0.085 + 0.02 * hash2k(k, 9), Math.sin(a) * r * 0.7, 0.045, 0.022, 0.04, [c[0], c[1], c[2], burnt ? -0.05 : -0.25], 8, 4);
    }
  }
  return y + 0.1;
}
// Döner: ince, kıvrık et şeritleri yığını
function donerAt(mb, y, kind) {
  const raw = kind === 2, burnt = kind === 6;
  for (let k = 0; k < 11; k++) {
    const a = k * 2.4, r = 0.04 + (k % 4) * 0.055;
    const c = burnt ? C(k % 2 ? '#1d1a18' : '#2a2420', -0.08) : raw ? C(k % 2 ? '#c8463c' : '#e27064', -0.45) : C(k % 3 ? '#8a4a22' : '#b8692f', -0.32);
    mb.push().T(Math.cos(a) * r, y + 0.035 + (k % 3) * 0.022, Math.sin(a) * r, a, 0.25 * Math.sin(k), 0.15);
    mb.sphereS(0, 0, 0, 0.13, 0.024, 0.065, c, 12, 5);
    mb.pop();
  }
  return y + 0.1;
}
// Pilav kasesi: seramik kase + tane tane pilav
function riceBowl(mb, y, rimHex) {
  const rim = C(rimHex || '#d33a2c', -0.6);
  mb.lathe(0, y, 0, [[0, 0], [0.15, 0], [0.17, 0.012], [0.29, 0.13], [0.315, 0.16], [0.315, 0.16], [0.29, 0.162], [0.15, 0.045], [0, 0.04]], 26, (i) => (i === 3 || i === 4 ? rim : C('#fbfbf8', -0.65)));
  mb.sphereS(0, y + 0.13, 0, 0.27, 0.085, 0.27, null, 22, 8, (x, yy, z) => {
    const n = hash2k(Math.floor((x + 1) * 23), Math.floor((z + 1) * 23));
    const g = 0.93 + n * 0.07;
    return [g, g * 0.985, g * 0.95, -0.2];
  });
  return y + 0.2;
}
// Lavaş: ince, kızarmış benekli yufka (üst üste iki kat)
function lavasAt(mb, y) {
  const col = (i, a) => { const n = hash2k(Math.floor(a * 5), i * 3 + 1); return n > 0.8 ? C('#b77a3c', -0.05) : C('#efd9a6', -0.05); };
  mb.lathe(0, y, 0, [[0, 0], [0.3, 0], [0.316, 0.012], [0.3, 0.024], [0, 0.024]], 26, col);
  mb.push().T(0.03, y + 0.022, -0.02, 0.6);
  mb.lathe(0, 0, 0, [[0, 0], [0.28, 0], [0.295, 0.011], [0.28, 0.022], [0, 0.022]], 24, col);
  mb.pop();
  return y + 0.045;
}
// Dürüm: yatay rulo lavaş, uçlarından iç malzeme görünür, ortası işletme renginde kâğıda sarılı
function wrapDish(mb, code, paperHex) {
  const L = code === 13 ? 0.34 : 0.3, R = code === 13 ? 0.13 : 0.115;
  mb.push().T(0, R + 0.01, 0, 0, 0, Math.PI / 2);
  mb.lathe(0, -L, 0, [[0, 0], [R * 0.9, 0], [R, 0.02], [R, 2 * L - 0.02], [R * 0.9, 2 * L], [0, 2 * L]], 22, (i, a) => {
    if (i === 0 || i === 5) return C('#8a4a22', -0.3);
    const n = hash2k(Math.floor(a * 4), i);
    return n > 0.78 ? C('#b77a3c', -0.05) : C('#efd9a6', -0.08);
  });
  mb.lathe(0, -L * 0.45, 0, [[R + 0.006, 0], [R + 0.006, L * 0.9]], 22, C(paperHex || '#ffffff', -0.15));
  mb.pop();
  for (const s of [-1, 1]) {
    const x = s * (L + 0.005);
    mb.sphereS(x, R + 0.03, 0.02, 0.025, 0.04, 0.05, C('#7a3e1c', -0.3), 8, 5);
    if (code >= 11) mb.sphereS(x, R - 0.02, -0.03, 0.02, 0.035, 0.035, C('#e3321f', -0.5), 8, 5);
    if (code === 13) mb.sphereS(x, R + 0.06, -0.04, 0.02, 0.03, 0.05, C('#5fb446', -0.3), 8, 5);
  }
  if (code >= 11) for (let k = 0; k < 6; k++) mb.sphereS(-0.12 + k * 0.05, 2 * R + 0.012, 0.03 * Math.sin(k * 2), 0.012, 0.006, 0.012, C('#d0201a', -0.3), 5, 3);
}
// Pilav üstü tavuk: kase + dilimlenmiş çıtır tavuk + (sos / domates / marul)
function riceDish(mb, code, rimHex) {
  const y = riceBowl(mb, 0, rimHex);
  for (let k = 0; k < 5; k++) {
    const a = k * 1.2 - 2.4;
    mb.push().T(Math.sin(a) * 0.06, y - 0.02, Math.cos(a) * 0.06 - 0.02, a * 0.3, 0.12);
    mb.sphereS(0, 0.02, 0, 0.075, 0.035, 0.05, null, 10, 5, (x, yy, z) => { const n = hash2k(Math.floor((x + 1) * 9), Math.floor((z + 1) * 9) + k); const c = mix3k([0.82, 0.5, 0.17], [0.99, 0.76, 0.33], n); return [c[0], c[1], c[2], -0.25]; });
    mb.pop();
  }
  if (code >= 11) {
    for (let k = 0; k < 7; k++) { const a = k * 0.9; mb.sphereS(Math.cos(a) * 0.12, y + 0.02, Math.sin(a) * 0.1, 0.03, 0.012, 0.03, C('#d8341f', -0.5), 8, 4); }
    mb.sphereS(0, y + 0.03, 0, 0.13, 0.008, 0.035, C('#b3261b', -0.6), 12, 4);
    mb.sphereS(0, y + 0.032, 0, 0.035, 0.008, 0.13, C('#b3261b', -0.6), 12, 4);
  }
  if (code === 13) for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.5; mb.sphereS(Math.cos(a) * 0.17, y - 0.01, Math.sin(a) * 0.15, 0.08, 0.02, 0.06, C('#6cc152', -0.3), 10, 4); }
}
function tomSlices(mb, y) {
  for (let k = 0; k < 3; k++) {
    const dx = (k - 1) * 0.07;
    mb.lathe(dx, y + k * 0.035, 0, [[0, 0], [0.22, 0], [0.232, 0.02], [0.22, 0.04], [0.14, 0.04], [0.14, 0.04], [0, 0.04]], 20, (i, a) => {
      if (i <= 3) return C('#d8341f', -0.55);
      const seed = Math.sin(a * 3) > 0.45 && i === 5;
      return seed ? C('#f2c45a', -0.4) : i >= 5 ? C('#ff8f75', -0.5) : C('#e8492f', -0.5);
    });
  }
  return y + 0.11;
}
function letSlices(mb, y) {
  const leaf = (dx, dy, dz, rx, ry, rz, c1, c2) => mb.sphereS(dx, y + dy, dz, rx, ry, rz, null, 16, 6, (x, yy, z) => {
    const w = 0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 7 + x * 5);
    const c = mixc(C(c1), C(c2), w * 0.8 + (yy > 0 ? 0 : 0.2));
    return [c[0], c[1], c[2], -0.3];
  });
  leaf(0, 0.03, 0, 0.3, 0.05, 0.28, '#4ea53a', '#86cf63');
  leaf(0.05, 0.07, 0.04, 0.24, 0.04, 0.22, '#5fb446', '#a3e07e');
  leaf(-0.06, 0.1, -0.03, 0.18, 0.035, 0.18, '#6cc152', '#b5ea8f');
  return y + 0.13;
}

/* ---- tatlıcı (Eliz) yiyecekleri: parçalar motordaki DES kitaplığından ---- */
// çiğ waffle hamuru: beyaz karıştırma kasesinde pürüzsüz, kıvrımlı hamur + tel çırpıcı
function batterBowl(mb) {
  mb.lathe(0, 0, 0, [[0, 0], [0.13, 0], [0.15, 0.012], [0.25, 0.1], [0.28, 0.15], [0.285, 0.16], [0.265, 0.16], [0.24, 0.12], [0.13, 0.04], [0, 0.035]], 28, (i) => C(i === 5 ? '#ffffff' : i <= 4 ? '#eef1f3' : '#f7f8f9', -0.7));
  mb.sphereS(0, 0.115, 0, 0.245, 0.03, 0.245, null, 26, 8, (ux, uy, uz) => {
    const a = Math.atan2(uz, ux), d = Math.hypot(ux, uz), w = Math.sin(a * 2 + d * 14);
    return uy < 0 ? C('#e9c070', -0.3) : w > 0.55 ? [0.99, 0.88, 0.6, -0.55] : [0.95, 0.8, 0.49, -0.5];
  });
  // çırpıcı: sap + üç tel halka
  limb(mb, [0.04, 0.13, 0.02], [0.2, 0.36, 0.1], [0.018, 0.02], C('#d8dde2', -0.85), 10, null, 2);
  for (let k = 0; k < 3; k++) { mb.push().T(0.02, 0.15, 0.01, k * 1.05, 0.55, 0); mb.torusN(0, 0, 0, 0.055, 0.004, 0.004, 14, 4, C('#e6eaee', -0.9)); mb.pop(); }
}
function dessertItem(mb, code, bh) {
  switch (code) {
    case 1: DES.bowl(mb, 0, 0.28, bh, 0.17); break;
    case 2: batterBowl(mb); break;
    case 5: DES.waffle(mb, 0, 0, 0, 0.24, 0.08, 5, false, 0.3); DES.sugar(mb, 0.085, 0.2, 22, 1); break;
    case 6: DES.waffle(mb, 0, 0, 0, 0.24, 0.08, 5, true, 0.3); mb.sphereS(0.08, 0.13, 0.04, 0.08, 0.03, 0.07, C('#4a4a4a', -0.1), 10, 5); break;
    case 3: DES.straw(mb, -0.09, 0, 0.04, 1.15, 0.4, 0.2); DES.straw(mb, 0.12, 0, -0.06, 1.0, 2.1, -0.25); DES.straw(mb, 0.04, 0, 0.16, 0.85, 4.0, 0.3); break;
    case 4: DES.banana(mb, 0, 0, 0, 0.15, 1); DES.banana(mb, 0.02, 0.035, 0.07, -0.05, 0.97, 0.15); DES.banana(mb, 0.0, 0.0, 0.14, -0.25, 0.94, 0.25); break;
    case 7: for (let k = 0; k < 6; k++) { const a = k * 1.047; DES.strawSlice(mb, Math.cos(a) * 0.12, (k % 2) * 0.012, Math.sin(a) * 0.12, a, 1.15); } break;
    case 8: for (let k = 0; k < 7; k++) { const a = k * 0.9; DES.bananaSlice(mb, Math.cos(a) * (k ? 0.13 : 0), (k % 2) * 0.012, Math.sin(a) * (k ? 0.13 : 0), 1.15); } break;
    case 10: case 11: case 13: {
      // Eliz kasesi: dipte çikolata göleti, dikine yaslanmış waffle dörtte birleri, ince sos çizgileri, meyveler, krema
      const y = DES.bowl(mb, 0, 0.3, bh, 0.18);
      mb.lathe(0, y - 0.005, 0, [[0, 0], [0.2, 0], [0.205, 0.03], [0, 0.035]], 22, C('#3a1a0b', -0.85));
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.4; DES.waffle(mb, Math.cos(a) * 0.08, y + 0.05, Math.sin(a) * 0.08, 0.09, 0.04, 3, false, -a + Math.PI / 2, 0.6); }
      DES.drizzle(mb, y + 0.12, 0.17, 4, code);
      if (code >= 11) for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.8; DES.strawSlice(mb, Math.cos(a) * 0.19, y + 0.075, Math.sin(a) * 0.19, a, 0.95); }
      if (code === 13) {
        for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.05; DES.bananaSlice(mb, Math.cos(a) * 0.2, y + 0.07, Math.sin(a) * 0.2, 0.95); }
        DES.cream(mb, 0, y + 0.1, 0, 0.9);
        DES.straw(mb, 0.01, y + 0.22, 0, 0.55, 0.3, 0.2);
      }
      DES.sugar(mb, y + 0.13, 0.18, 26, code);
      break;
    }
    case 12: DES.cup(mb, 0, 0.62, bh, 'fruit'); break;
    default: break;
  }
}
function itemModel(mb, code, kit = KITS.burger, bh = '#d33a2c') {
  if (kit.fruit) { dessertItem(mb, code, bh); return; }
  const meatAt = kit.meat === 'chicken' ? chickenAt : kit.meat === 'doner' ? donerAt : pattyAt;
  switch (code) {
    case 1:
      if (kit.base === 'rice') riceBowl(mb, 0, bh);
      else if (kit.base === 'wrap') lavasAt(mb, 0);
      else bunTop(mb, bunBottom(mb, 0) + 0.005);
      break;
    case 2: meatAt(mb, 0, 2); break;
    case 5: meatAt(mb, 0, 5); break;
    case 6: meatAt(mb, 0, 6); mb.sphereS(0.1, 0.1, 0.05, 0.1, 0.035, 0.08, C('#444444', -0.1), 10, 5); break;
    case 3: {
      mb.sphereS(0, 0.21, 0, 0.25, 0.21, 0.25, null, 22, 14, (x, yy) => { const c = mixc(C('#e3321f'), C('#c41d12'), clamp(-yy, 0, 1) * 0.6); return [c[0], c[1], c[2], -0.7]; });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mb.sphereS(Math.cos(a) * 0.06, 0.415, Math.sin(a) * 0.06, 0.065, 0.012, 0.025, C('#3f8f35', -0.3), 8, 3); }
      mb.lathe(0, 0.4, 0, [[0.018, 0], [0.014, 0.07], [0, 0.075]], 8, C('#4c7a2e', -0.2));
      break;
    }
    case 4: {
      const head = (dx, dy, dz, r, c1, c2) => mb.sphereS(dx, dy, dz, r, r * 0.85, r, null, 18, 12, (x, yy, z) => {
        const w = 0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 9 + yy * 6);
        const c = mixc(C(c1), C(c2), w);
        return [c[0], c[1], c[2], -0.3];
      });
      head(0, 0.22, 0, 0.27, '#4f9f3a', '#76c257');
      head(0.03, 0.29, 0.03, 0.21, '#7ccb5c', '#a8e382');
      head(-0.02, 0.35, -0.01, 0.13, '#a3df7d', '#c9f0a8');
      break;
    }
    case 7: tomSlices(mb, 0); break;
    case 8: letSlices(mb, 0); break;
    case 10: case 11: case 13:
      if (kit.base === 'rice') riceDish(mb, code, bh);
      else if (kit.base === 'wrap') wrapDish(mb, code, bh);
      else {
        let y = bunBottom(mb, 0);
        y = meatAt(mb, y, 5);
        if (code >= 11) y = tomSlices(mb, y);
        if (code === 13) y = letSlices(mb, y - 0.02);
        bunTop(mb, y - (code >= 11 ? 0.04 : 0));
      }
      break;
    case 12: {
      mb.lathe(0, 0, 0, [[0, 0], [0.26, 0], [0.4, 0.1], [0.46, 0.17], [0.47, 0.19], [0.44, 0.185], [0.38, 0.12], [0.24, 0.03], [0, 0.03]], 26, (i) => (i === 4 ? C('#2f7fd6', -0.7) : C('#fbfbf8', -0.7)));
      letSlices(mb, 0.06);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.57 + 0.5;
        mb.push().T(Math.cos(a) * 0.17, 0.25, Math.sin(a) * 0.17, a, 0, 0);
        mb.lathe(0, 0, 0, [[0, 0], [0.11, 0], [0.118, 0.018], [0.11, 0.036], [0.05, 0.036], [0, 0.036]], 14, (k) => (k >= 4 ? C('#ff8f75', -0.5) : C('#d8341f', -0.55)));
        mb.pop();
      }
      break;
    }
    default: break;
  }
}
const hash2k = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Aşçı gövdesi (bacaklar ve kollar ayrı çizilir): beyaz önlük, oyuncu renginde ceket, kabarık şapka. Yüzü +z'ye bakar.
function arrowModel(mb) {
  mb.cyl(0, 0, 0, 0.0001, 0.42, 0.34, 6, C('#ffffff', 1), C('#ffffff', 1), 't');
  mb.box(-0.1, 0.4, -0.1, 0.1, 0.78, 0.1, C('#ffffff', 1));
}

/* ============================ ses ============================ */

const mtofS = (m) => 440 * 2 ** ((m - 69) / 12);

class KitchenSnd extends Snd {
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'take': this.tone(520, t, 0.09, 'triangle', 0.22, 880, 0.003, a); this.noise(t, 0.05, 0.1, { type: 'highpass', freq: 2500 }, a); break;
      case 'put': this.tone(210, t, 0.1, 'sine', 0.34, 110, 0.002, a); this.noise(t, 0.05, 0.14, { type: 'bandpass', freq: 900, q: 1 }, a); break;
      case 'chop': this.noise(t, 0.04, 0.3, { type: 'bandpass', freq: 1800, q: 2 }, a); this.tone(180, t, 0.05, 'square', 0.1, 120, 0.001, a); break;
      case 'chopdone': this.tone(988, t, 0.1, 'triangle', 0.2, null, 0.004, a); this.tone(1319, t + 0.07, 0.16, 'triangle', 0.2, null, 0.004, a); break;
      case 'sizzle': this.noise(t, 0.5, 0.2, { type: 'highpass', freq: 3500, attack: 0.02 }, a); break;
      case 'ready': this.tone(784, t, 0.1, 'sine', 0.2, null, 0.004, a); this.tone(1175, t + 0.09, 0.2, 'sine', 0.2, null, 0.004, a); break;
      case 'burn': this.tone(180, t, 0.4, 'sawtooth', 0.14, 90, 0.01, a); this.noise(t, 0.5, 0.25, { type: 'bandpass', freq: 600, q: 0.8 }, a); break;
      case 'trash': this.noise(t, 0.3, 0.3, { type: 'bandpass', freq: 800, to: 200, q: 0.8 }, a); this.tone(260, t, 0.25, 'triangle', 0.16, 70, 0.005, a); break;
      case 'back': this.tone(660, t, 0.08, 'triangle', 0.2, 330, 0.003, a); this.noise(t + 0.03, 0.08, 0.14, { type: 'bandpass', freq: 600, q: 1 }, a); break;
      case 'step': this.noise(t, 0.035, 0.05, { type: 'bandpass', freq: 520 + Math.random() * 300, q: 1.4 }, a); break;
      case 'ding': this.tone(1568, t, 0.5, 'sine', 0.22); this.tone(2093, t + 0.02, 0.6, 'sine', 0.1); break;
      case 'serve':
        this.duck(0.55, 0.7);
        [659, 880, 1319].forEach((f, i) => this.tone(f, t + i * 0.07, 0.22, 'triangle', 0.26, null, 0.004, a));
        this.noise(t + 0.2, 0.2, 0.18, { type: 'highpass', freq: 5000 }, a);
        break;
      case 'miss': this.tone(220, t, 0.32, 'sawtooth', 0.12, 150, 0.01); this.tone(165, t + 0.18, 0.4, 'sawtooth', 0.12, 110, 0.01); break;
      case 'no': this.tone(140, t, 0.08, 'square', 0.09, 110, 0.002); break;
      case 'tick': this.tone(1500, t, 0.03, 'square', 0.04); break;
      case 'lose':
        this.duck(0.5, 1.2);
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, t + i * 0.16, 0.24, 'sawtooth', 0.1, f * 0.94));
        break;
      default: super._fx(name, a);
    }
  }
  tempo() { return this.mode === 'race' ? 164 + 20 * (this.int || 0) : this.mode === 'idle' ? 120 : 100; }
  // Mutfak Kaosu: koşuşturmalı mutfak polkası (Do – Fa – Sol7 – Do): tuba "um", akordeon "pa", tahta kaşık tıkırtısı,
  // hızlı ksilofon ezgisi; sürenin sonuna doğru tempo artar, zil ve tef eklenir
  beat(t, s, bar, spb, st = spb / 4) {
    const CH = [[36, [60, 64, 67]], [41, [60, 65, 69]], [43, [59, 65, 67]], [36, [60, 64, 67]]];
    const [root, ch] = CH[bar % 4];
    const I = this.int || 0;
    const MEL = [
      [72, 76, 79, 76, 72, 76, 79, 84], [81, 77, 72, 77, 81, 84, 81, 77],
      [79, 77, 74, 71, 74, 77, 79, 83], [84, 79, 76, 79, 72, null, 72, null],
    ];
    if (this.mode === 'race') {
      if (s === 0 || s === 8) this.iBass(t, root + (s === 8 ? 7 : 0), spb * 0.9, 0.17, 'tuba');
      if (s === 4 || s === 12) ch.forEach((m) => this.iAcc(t, m, spb * 0.42, 0.015, 0.08));
      if (s % 4 === 0) this.iKick(t, 0.2, 110, 50, 0.12);
      if (s % 2 === 0) this.iWood(t, 0.045, s % 4 === 0 ? 1050 : 820);
      if (bar % 8 >= 1 && s % 2 === 0) { const n = MEL[bar % 4][s >> 1]; if (n) this.iMarimba(t, n, 0.06); }
      if (I > 0.5 && s % 2 === 1) this.iHat(t, 0.032);
      if (I > 0.5 && (s === 6 || s === 14)) this.iTamb(t, 0.045);
      if (bar % 4 === 3 && s === 14) this.iCowbell(t, 0.045);
    } else if (this.mode === 'idle') {
      if (s === 0 || s === 8) this.iBass(t, root + (s === 8 ? 7 : 0), spb * 1.2, 0.12, 'tuba');
      if (s === 4 || s === 12) ch.forEach((m) => this.iAcc(t, m, spb * 0.8, 0.012, 0.12));
      if (s % 4 === 2) this.iWood(t, 0.032, 900);
    } else {
      if (s === 0) { ch.forEach((m) => this.iAcc(t, m, spb * 3, 0.011, 0.25)); this.iBass(t, root, spb * 2, 0.1, 'tuba'); }
      if (s % 4 === 0) { const n = MEL[bar % 4][s >> 1]; if (n) this.iMarimba(t, n, 0.045, 0.2); }
    }
  }
}

/* ============================ arayüz ============================ */

const STYLE2 = `
#ky .kk-sc{white-space:nowrap;font-weight:800;font-size:17px;background:rgba(12,10,26,.55);border-radius:12px;padding:5px 9px;font-variant-numeric:tabular-nums}
#ky .kk-lv{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 56px);font-weight:800;font-size:12px;background:rgba(12,10,26,.55);border:2px solid rgba(255,255,255,.3);border-radius:99px;padding:2px 10px;white-space:nowrap;pointer-events:none;z-index:3}
#ky .kk-ord{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 82px);display:flex;gap:5px;justify-content:center;padding:0 8px;pointer-events:none;z-index:3}
#ky .kk-tk{flex:0 1 66px;min-width:44px;background:#fff8e8;color:#2a1f14;border-radius:8px 8px 4px 4px;padding:3px 3px 0;text-align:center;font-weight:800;box-shadow:0 3px 0 rgba(0,0,0,.28);transform-origin:top center;animation:kkin .35s cubic-bezier(.2,1.4,.4,1);overflow:hidden;position:relative}
#ky .kk-tk .d{font-size:22px;line-height:1.05}
#ky .kk-tk .ig{font-size:12px;line-height:1.15;letter-spacing:-1px;white-space:nowrap}
#ky .kk-tk .bar{height:5px;margin:2px -3px 0;background:rgba(0,0,0,.14)}
#ky .kk-tk .bar i{display:block;height:100%;width:100%;background:#3fb950;transition:background .3s}
#ky .kk-tk.warn{animation:kkw .45s ease-in-out infinite alternate}
#ky .kk-tk.gone{animation:kkout .5s forwards}
@keyframes kkin{from{transform:translateY(-30px) scale(.6);opacity:0}}
@keyframes kkw{from{transform:none}to{transform:translateY(2px) rotate(1.5deg)}}
@keyframes kkout{to{transform:translateY(-20px) scale(.7);opacity:0}}
#ky .kk-lb{position:absolute;left:0;top:0;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;will-change:transform}
#ky .kk-lb .e{font-size:22px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
#ky .kk-lb .br{width:46px;height:7px;border-radius:4px;background:rgba(12,10,26,.65);border:1px solid rgba(255,255,255,.5);overflow:hidden;position:relative;display:none}
#ky .kk-lb .br i{position:absolute;left:0;top:0;bottom:0;width:0;background:#ffd23f}
#ky .kk-lb .br b{position:absolute;top:0;bottom:0;width:2px;background:#fff}
#ky .kk-lb.hot .e{animation:kkhot .3s ease-in-out infinite alternate}
@keyframes kkhot{to{transform:scale(1.3)}}
#ky .kk-hold{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);background:rgba(12,10,26,.65);border:2px solid rgba(255,255,255,.4);border-radius:99px;padding:5px 14px;font-weight:800;font-size:14px;white-space:nowrap;pointer-events:none;transition:opacity .2s}
#ky .kk-hold.off{opacity:0}
#ky .kk-joy{position:absolute;left:0;top:0;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:99px;background:rgba(255,255,255,.14);border:3px solid rgba(255,255,255,.55);pointer-events:none;display:none;z-index:4}
#ky .kk-joy i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:99px;background:rgba(255,255,255,.7);border:3px solid rgba(12,10,26,.6);box-shadow:0 3px 8px rgba(0,0,0,.35)}
#ky .kk-hint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 26px);bottom:calc(env(safe-area-inset-bottom,0px) + 44px);width:116px;height:116px;border-radius:99px;border:3px dashed rgba(255,255,255,.4);pointer-events:none;display:grid;place-items:center;font-size:12px;font-weight:800;color:rgba(255,255,255,.7);letter-spacing:.04em;transition:opacity .3s;z-index:3}
#ky .kk-hint.off,#ky .kk-act.off{opacity:0;pointer-events:none}
#ky .kk-act{position:absolute;right:calc(env(safe-area-inset-right,0px) + 22px);bottom:calc(env(safe-area-inset-bottom,0px) + 40px);width:108px;height:108px;border-radius:99px;border:4px solid rgba(255,255,255,.6);color:#fff;font-weight:800;font-size:14px;letter-spacing:.04em;display:grid;place-items:center;align-content:center;padding:0;line-height:1;background:rgba(12,10,26,.55);-webkit-tap-highlight-color:transparent;transition:opacity .3s,transform .1s,background .15s;z-index:4}
#ky .kk-act span{display:block;font-size:36px;line-height:1;text-shadow:0 2px 0 rgba(0,0,0,.35);margin-bottom:3px}
#ky .kk-act.rdy{border-color:var(--lim);box-shadow:0 0 0 4px rgba(255,210,63,.3),0 0 22px rgba(255,210,63,.65);background:radial-gradient(circle,rgba(255,210,63,.55),rgba(255,120,40,.5))}
#ky .kk-act.on{transform:scale(.92)}
#ky.kk .msg{top:24%}
#ky .kk-feed{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 154px);display:grid;gap:4px;pointer-events:none;max-width:70%}
#ky .kk-feed div{font-weight:700;font-size:13px;background:rgba(12,10,26,.62);border-radius:10px;padding:3px 9px;width:max-content;max-width:100%;animation:kkf 4.2s ease-out forwards}
@keyframes kkf{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
#ky .kk-stars{font-size:34px;letter-spacing:4px;margin:4px 0 2px;text-align:center}
#ky .kk-menu{display:grid;gap:4px;margin:8px 0;text-align:left}
#ky .kk-menu div{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.12);border-radius:10px;padding:4px 9px;font-size:13px;font-weight:700}
#ky .kk-menu b{font-size:22px;line-height:1}
@media (orientation:landscape) and (max-height:520px){
#ky .kk-lv{top:calc(env(safe-area-inset-top,0px) + 58px);left:auto;right:14px;transform:none;font-size:11px}
#ky .kk-ord{top:calc(env(safe-area-inset-top,0px) + 50px);justify-content:flex-start;padding-left:calc(env(safe-area-inset-left,0px) + 10px)}
#ky .kk-tk{flex:0 0 58px}
#ky .kk-feed{top:calc(env(safe-area-inset-top,0px) + 120px)}
#ky.kk .msg{top:18%}
#ky .kk-act{width:92px;height:92px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px)}
#ky .kk-hint{bottom:calc(env(safe-area-inset-bottom,0px) + 22px);width:100px;height:100px}
#ky .kk-hold{bottom:calc(env(safe-area-inset-bottom,0px) + 6px)}
}
@media (orientation:portrait) and (max-height:620px){#ky .kk-act{width:92px;height:92px}#ky .kk-hint{width:100px;height:100px}}
`;

function injectStyle2() {
  if (document.getElementById('kk-style')) return;
  const st = document.createElement('style');
  st.id = 'kk-style';
  st.textContent = STYLE2;
  document.head.appendChild(st);
}

/* ============================ oyun ============================ */

const H_STEP = 1 / 60;
const TOD_OF_LEVEL = [0, 0, 1];
const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return a + d * t; };
const ST_EMOJI = { grill: '🔥', board: '🔪', plate: '🍽️', serve: '🛎️', trash: '🗑️' };
const ACT_TXT = { take: ['🤲', 'AL'], pick: ['🤲', 'AL'], dish: ['🍽️', 'AL'], put: ['⬇️', 'KOY'], undo: ['↩️', 'GERİ AL'], back: ['↩️', 'GERİ KOY'], trash: ['🗑️', 'ÇÖPE AT'], serve: ['🛎️', 'TESLİM'] };
const ACT_SND = { take: 'take', pick: 'take', dish: 'take', put: 'put', back: 'back', trash: 'trash' };

class Game {
  constructor(ctx) {
    injectStyle();
    injectStyle2();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.kit = kitOf(this.brand.slug);
    this.dead = false;
    this.view = null;
    this.key = null;
    this.flights = [];
    this.hideSt = [];
    this.lv = null;
    this.S2 = null;
    this.snaps = [];
    this.bod = [];
    this.mine = null;
    this.my = -1;
    this.parts = [];
    this.time = 0;
    this.scale = 1;
    this.frameAvg = 16;
    this.slowFor = 0;
    this.fastFor = 0;
    this.cam = { D: 30, tx: 0, ty: 0.4, tz: 0.2, yaw: 0, ex: 0, ey: 20, ez: 20 };
    this.fov = 0.9;
    this.panelKey = '';
    this.lastBeep = 99;
    this.snd = new KitchenSnd();
    this.mats = { a: M.make(), b: M.make(), c: M.make(), V: M.make(), P: M.make(), VP: M.make() };
    this.inp = { x: 0, y: 0 };
    this.keys = new Set();
    this.joy = null;
    this.actQ = false;
    this.tickets = new Map();
    this.stPrev = [];
    this.stLbl = [];
    this.tgt = null;
    this.meshes = {};
    this.buildDom();
    try { this.snd.amb('diner', 0.75); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd && this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[mutfak] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); } catch (e) {
        console.warn('[mutfak] kaynak', e);
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
    w.className = 'kk';
    w.innerHTML = `
      <canvas aria-label="Mutfak Kaosu 3D sahnesi"></canvas>
      <div class="lbls"></div><div class="fx"></div><div class="vig"></div>
      <div class="hud">
        <div class="r1">
          <div class="pos"><b>0</b><small>/0</small></div>
          <div class="kk-sc">⭐ 0</div>
          <div class="sp"></div>
          <div class="tm">0:00</div>
          <button class="ib mu ${sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
          <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted() ? '🔇' : '🔊'}</button>
          <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
        </div>
      </div>
      <div class="kk-lv"></div>
      <div class="kk-ord"></div>
      <div class="kk-feed"></div>
      <div class="note"></div><div class="toastk"></div>
      <div class="kk-hold off"></div>
      <div class="kk-hint off">SÜRÜKLE</div>
      <div class="kk-joy"><i></i></div>
      <button class="kk-act off" aria-label="Eylem"><span>🤲</span><em style="font-style:normal">—</em></button>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = {
      wrap: w, cv: q('canvas'), lbls: q('.lbls'), fx: q('.fx'), vig: q('.vig'), posB: q('.pos b'), posS: q('.pos small'), pos: q('.pos'), sc: q('.kk-sc'),
      tm: q('.tm'), ex: q('.ex'), note: q('.note'), msg: q('.msg'), panel: q('.panel'), hud: q('.hud'), toastk: q('.toastk'), lv: q('.kk-lv'),
      ord: q('.kk-ord'), feed: q('.kk-feed'), hold: q('.kk-hold'), hint: q('.kk-hint'), joy: q('.kk-joy'), knob: q('.kk-joy i'), act: q('.kk-act'),
      actI: q('.kk-act span'), actT: q('.kk-act em'),
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
    const press = () => {
      if (!this.canCtl()) return;
      this.actQ = true;
      vibrate(8);
      this.el.act.classList.add('on');
      setTimeout(() => this.el.act.classList.remove('on'), 110);
    };
    this.press = press;
    this.el.act.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); press(); });
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
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') { e.preventDefault(); if (!e.repeat) press(); }
    };
    this.onKeyUp = (e) => { const k = KM[e.key]; if (k) this.keys.delete(k); };
    this.onBlur = () => this.keys.clear();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }
  canCtl() {
    const v = this.view;
    return !!(v && this.mine && v.phase === 'play' && this.simNow() > 0);
  }
  // ekran vektörü -> dünya vektörü (kamera dönüşüne göre)
  toWorld(sx, sy) {
    const a = this.cam.yawT || 0;
    return [sx * Math.cos(a) + sy * Math.sin(a), -sx * Math.sin(a) + sy * Math.cos(a)];
  }
  inputVec() {
    let sx = 0, sy = 0;
    if (this.joy && this.joy.x * this.joy.x + this.joy.y * this.joy.y > 0) { sx = this.joy.x; sy = this.joy.y; }
    else if (this.keys.size) {
      const k = this.keys;
      sx = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0); sy = (k.has('d') ? 1 : 0) - (k.has('u') ? 1 : 0);
      const l = Math.hypot(sx, sy) || 1;
      sx /= l; sy /= l;
    }
    return this.toWorld(sx, sy);
  }
  simNow() {
    const v = this.view;
    return v && v.startAt ? (this.ctx.serverNow() - v.startAt) / 1000 : -99;
  }

  /* ---------- sunucudan gelen durum ---------- */
  emoAnchor(pid) {
    const i = this.emoIdx(pid), s = i >= 0 && this.bod ? this.bod[i] : null;
    return s ? this.emoProj(s.x, 2.75, s.y) : null;
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
    if (root && root.dataset.kk !== '1') {
      root.dataset.kk = '1';
      root.innerHTML = '<p class="py-16 text-center">👨‍🍳</p>';
    }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    if (v.startAt && v.li !== undefined && (this.key !== `${v.startAt}|${v.level}|${v.n}|${v.me}`) && (v.phase === 'ready' || v.phase === 'play' || v.phase === 'result')) this.newLevel(v);
    if (v.phase === 'play' && v.p) this.ingest(v);
    if (!prev || prev.phase !== v.phase || prev.level !== v.level || prev.startAt !== v.startAt) this.onPhase(prev, v);
    this.panel();
  }

  newLevel(v) {
    const sameLevel = this.key && this.key.split('|')[0] === String(v.startAt);
    this.key = `${v.startAt}|${v.level}|${v.n}|${v.me}`;
    this.my = v.me;
    this.li = v.li;
    this.lv = KK.makeLevel(v.li);
    this.todI = TOD_OF_LEVEL[v.li % 3];
    if (!sameLevel || !this.snaps) { this.snaps = []; this.evSeen = 0; this.firstIngest = true; this.S2 = KK.freshStations(this.lv); this.orders = []; this.stPrev = []; }
    this.bod = [];
    for (let i = 0; i < v.n; i++) {
      const sp = KK.spawn(i, v.n);
      this.bod.push({ x: sp.x, y: sp.y, vx: 0, vy: 0, ang: sp.ang, hold: 0, lbl: null });
    }
    this.el.lbls.innerHTML = '';
    this.stLbl = [];
    this.mine = v.me >= 0 ? KK.spawn(v.me, v.n) : null;
    this.simT = 0;
    this.lastSend = 0;
    this.sx = 0; this.sy = 0;
    this.lastBeep = 99;
    this.parts.length = 0;
    this.flights = [];
    this.hideSt = [];
    this.popSt = [];
    this.feedN = 0;
    this.el.feed.innerHTML = '';
    this.el.ord.innerHTML = '';
    this.tickets.clear();
    this.msg('');
    this.buildWorld();
    this.buildStLabels();
  }

  mk(fn, kind = 'lit') { const mb = new MB(kind); fn(mb); return mb.build(this.X); }
  item(code) {
    if (!this.meshes[code]) this.meshes[code] = this.mk((mb) => itemModel(mb, code, this.kit, this.brand.boxHex));
    return this.meshes[code];
  }
  // ayakta masa karakteri ağları (aşçı kılığı): kişiye özel + ortak
  avMesh(ci) { const A = this.avM || (this.avM = {}); return A[ci] || (A[ci] = masa().standMeshes((f) => this.mk(f), ci, { chef: true })); }
  avSh() { const A = this.avM || (this.avM = {}); return A.sh || (A.sh = masa().standShared((f) => this.mk(f))); }
  dinerMesh(ci) { const A = this.avM || (this.avM = {}), k = 'd' + ci; return A[k] || (A[k] = masa().seatMeshes((f) => this.mk(f), ci)); }
  freeAv() {
    const A = this.avM;
    this.avM = null;
    if (!A || !this.X) return;
    Object.keys(A).forEach((k) => {
      const o = A[k];
      const list = k === 'sh' ? [o.upper, o.fore, o.lids, ...o.all()] : Object.values(o);
      list.forEach((mm) => freeMesh(this.X, mm));
    });
  }
  lemo(v) { return v.li === 0 ? this.kit.emo[10] : (this.kit.lemo && this.kit.lemo[v.li]) || v.lemoji; }
  // müşteri tepkisi: kind 'yum' (yemek geldi, sevinir) ya da 'sad' (sipariş kaçtı)
  dinerReact(kind, it) {
    const D = this.diners || (this.diners = DINERS.map(() => ({ t: -9, kind: '', dish: 0, dishT: -9 })));
    const free = D.map((d, i) => i).filter((i) => this.time - D[i].t > 2.5);
    if (!free.length) return;
    const i = free[Math.floor(Math.random() * free.length)];
    const d = D[i], q = DINERS[i];
    d.t = this.time; d.kind = kind;
    if (kind === 'yum' && it) { d.dish = it; d.dishT = this.time; this.floatText('😋', q.x, 2.1, q.z); }
    else if (kind === 'sad') this.floatText('😤', q.x, 2.1, q.z);
  }
  buildWorld() {
    const X = this.X;
    if (!X || this.lost) return;
    this.freeWorld();
    const lv = this.lv;
    const W = {};
    W.floor = this.mk((mb) => floorModel(mb, this.li, this.brand.accentHex));
    W.st = this.mk((mb) => { lv.st.forEach((d) => stationModel(mb, d, this.brand.accentHex)); lv.solid.forEach((d) => stationModel(mb, Object.assign({ k: 'table' }, d), this.brand.accentHex)); });
    W.arrow = this.mk(arrowModel);
    W.rug = this.mk((mb) => { const r = 1.5; mb.tquad([-r, 0.02, r], [r, 0.02, r], [r, 0.02, -r], [-r, 0.02, -r], 0, 0, 1, 1, [0, -1, 0]); }, 'tex');
    // salon: ahşap zemin (mutfak karolarının dışında 4 parça) + masalar
    const R0 = KK.ROOM, e = 0.35, Y = -0.012;
    W.dfloor = this.mk((mb) => {
      KIT.planks(mb, -32, R0.y1 + e, 32, 34, Y, 0.34, 19, 3);
      KIT.planks(mb, -32, -34, 32, R0.y0 - 0.8, Y, 0.34, 19, 7);
      KIT.planks(mb, -32, R0.y0 - 0.8, R0.x0 - e, R0.y1 + e, Y, 0.34, 19, 11);
      KIT.planks(mb, R0.x1 + e, R0.y0 - 0.8, 32, R0.y1 + e, Y, 0.34, 19, 13);
    }, 'tex');
    W.dining = this.mk((mb) => diningModel(mb, this.brand.accentHex));
    W.board = this.mk((mb) => KIT.tent(mb, this.brand.accentHex));
    W.boardLogo = this.mk((mb) => KIT.tentLogo(mb), 'tex');
    W.wallDeco = this.mk((mb) => wallDecoModel(mb, this.brand.accentHex));
    W.blocks = this.mk((mb) => {
      lv.st.filter((d) => d.k === 'table' && !d.island).concat(lv.solid.filter((d) => !d.island)).forEach((d) => {
        KIT.woodBox(mb, d.x - d.w / 2, TOP - 0.004, d.y - d.h / 2, d.x + d.w / 2, TOP + 0.06, d.y + d.h / 2, 0.21, 19);
      });
    }, 'tex');
    const zW = R0.y0 - 0.35 + 0.004;
    W.wall = this.mk((mb) => mb.tquad([-4.95, 0, zW], [4.95, 0, zW], [4.95, 3.0, zW], [-4.95, 3.0, zW], 0, 0, 1, 1, [0, 1.5, zW - 1]), 'tex');
    {
      // (freeWorld eskisini siler; bağlam kaybından sonra eski tutamaç zaten geçersizdir)
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
      const nm = this.kit.names, rc = [...new Set(lv.L.recipes || [])];
      drawKitchenWall(cv, this.brand.accentHex, (rc.length ? rc : [10, 11]).concat([12, 13]).filter((v, i, a) => a.indexOf(v) === i).map((k) => nm[k]).filter(Boolean));
      this.wallTex = makeTexture(X, cv);
    }
    this.W = W;
    const tod = TOD[this.todI];
    this.cols = { sun: new Float32Array(norm3(tod.sunD)), fog: hexRGB('#3b2f2a'), top: hexRGB(tod.top), hor: hexRGB(tod.hor), sunVis: norm3(tod.sunVis) };
  }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; this.wallTex = null; return; }
    Object.values(W).forEach((m) => freeMesh(this.X, m));
    if (this.wallTex) this.X.gl.deleteTexture(this.wallTex);
    this.wallTex = null;
    this.W = null;
  }
  buildStLabels() {
    this.stLbl = [];
    if (!this.lv) return;
    this.lv.st.forEach((d, i) => {
      const e = d.k === 'crate' ? this.kit.emo[d.item] : ST_EMOJI[d.k];
      if (!e) { this.stLbl.push(null); return; }
      const el = document.createElement('div');
      el.className = 'kk-lb';
      el.innerHTML = `<div class="e">${e}</div>${d.k === 'grill' || d.k === 'board' ? '<div class="br"><i></i><b></b></div>' : ''}`;
      this.el.lbls.appendChild(el);
      this.stLbl.push({ el, e: el.querySelector('.e'), br: el.querySelector('.br'), fi: el.querySelector('.br i'), mk: el.querySelector('.br b'), d, i });
    });
  }

  /* ---------- anlık görüntüler ---------- */
  ingest(v) {
    const last = this.snaps[this.snaps.length - 1];
    if (!last || v.t > last.t) {
      this.snaps.push({ t: v.t, p: v.p });
      if (this.snaps.length > 40) this.snaps.shift();
    }
    this.S2 = v.S.map((x, i) => (this.lv.st[i].k === 'plate' ? { item: 0, t0: 0, plate: x[2] } : x ? { item: x[0], t0: x[1], plate: null } : { item: 0, t0: 0, plate: null }));
    this.orders = v.o.map((o) => ({ id: o[0], r: o[1], at: o[2], ex: o[3] }));
    this.syncTickets();
    const first = this.firstIngest;
    this.firstIngest = false;
    (v.ev || []).forEach((e) => {
      if (e[0] <= this.evSeen) return;
      this.evSeen = e[0];
      if (first && this.simNow() > 2) return;
      this.onEv(e);
    });
    if (this.mine) this.reconcile(v);
  }

  reconcile(v) {
    const m = this.mine;
    const sb = v.p[this.my];
    if (!sb || !m) return;
    m.hold = sb[5];
    const age = clamp(this.simNow() - v.t, 0, 0.3);
    const tx = sb[0] + sb[2] * age, ty = sb[1] + sb[3] * age;
    const ex = tx - m.x, ey = ty - m.y;
    const err = Math.hypot(ex, ey);
    if (err > 1.6) { m.x = tx; m.y = ty; m.vx = sb[2]; m.vy = sb[3]; return; }
    m.x += ex * 0.14; m.y += ey * 0.14;
    m.vx += (sb[2] - m.vx) * 0.1; m.vy += (sb[3] - m.vy) * 0.1;
  }

  onEv(e) {
    const k = e[1];
    const lv = this.lv;
    const pan = (x) => clamp(x / 6, -0.8, 0.8);
    const stPos = (i) => { const d = lv.st[i]; return d ? [d.x, d.y] : [0, 0]; };
    if (k === 'a') {
      const [, , kind, i, it, pi] = e;
      const [x, z] = stPos(i);
      const mineEv = pi === this.my;
      this.snd.fx(ACT_SND[kind] || 'put', pan(x));
      if (kind === 'put' && lv.st[i].k === 'board') this.snd.fx('chop', pan(x));
      this.launch(kind, i, it, pi);
      if (mineEv) vibrate(10);
    } else if (k === 'o') {
      this.snd.fx('ding');
    } else if (k === 'x') {
      this.snd.fx('miss');
      this.flash('hit', 360);
      this.feed(`😢 ${esc(this.kit.names[e[2]])} siparişi kaçtı!`);
      this.bod.forEach((q) => { q.sadT = this.time + 1.3; });
      this.dinerReact('sad');
    } else if (k === 'b') {
      const [x, z] = stPos(e[2]);
      this.snd.fx('burn', pan(x));
      this.burst(x, 1.4, z, 14, [0.25, 0.25, 0.25], 2, 0.2, false, 1.1, -1.2);
      this.floatText('🔥', x, 2.2, z);
      this.feed(`🔥 ${esc(this.kit.names[5])} yandı! Çöpe at.`);
      this.bod.forEach((q) => { q.ohT = this.time + 1.0; });
    } else if (k === 's') {
      const [, , it, pts, pi] = e;
      const d = lv.st.find((q) => q.k === 'serve');
      const pl = this.view?.players?.[pi];
      this.launch('serve', lv.st.indexOf(d), it, pi);
      this.snd.fx('serve', pan(d.x));
      this.burst(d.x, 1.6, d.y, 18, [1, 0.85, 0.3], 4, 0.1, true, 0.7, 5);
      this.confetti(d.x, d.y, 18);
      this.floatText(`+${pts}`, d.x, 2.4, d.y, '#ffe27a');
      this.feed(`${this.kit.emo[it] || '🍽️'} ${esc(pl?.n || '')} teslim etti! +${pts}`);
      setTimeout(() => { if (!this.dead) this.dinerReact('yum', it); }, 380);
      if (this.bod[pi]) this.bod[pi].joyT = this.time + 1.1;
      if (pi === this.my) { vibrate([20, 30, 40]); this.msg('TESLİM! 🎉', 'gold', false); setTimeout(() => this.msg(''), 700); }
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
      this.el.ord.innerHTML = '';
      this.tickets.clear();
      if ((v.sum?.stars || 0) > 0) setTimeout(() => this.snd.fx('win'), 250); else this.snd.fx('lose');
      this.confetti(0, 0, 30);
    } else if (p === 'final') {
      this.msg('');
      this.snd.music('calm');
      try { sfx.play('tada'); } catch { /* yok */ }
    }
  }

  /* ---------- sipariş fişleri ---------- */
  syncTickets() {
    const seen = new Set();
    this.orders.forEach((o) => {
      seen.add(o.id);
      if (this.tickets.has(o.id)) return;
      const el = document.createElement('div');
      el.className = 'kk-tk';
      const sup = this.kit.sup[o.r];
      el.innerHTML = `<div class="d">${this.kit.emo[o.r]}${sup ? `<sup>${sup}</sup>` : ''}</div><div class="ig">${KK.RECIPES[o.r].ing.map((x) => this.kit.emo[x]).join('')}</div><div class="bar"><i></i></div>`;
      this.el.ord.appendChild(el);
      this.tickets.set(o.id, { el, bar: el.querySelector('.bar i'), o });
    });
    this.tickets.forEach((t, id) => {
      if (seen.has(id)) return;
      t.el.classList.add('gone');
      setTimeout(() => t.el.remove(), 480);
      this.tickets.delete(id);
    });
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
    const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);
    if (v.phase === 'loading') {
      html = '<div class="card"><div class="tt">👨‍🍳 Hazırlanıyor…</div></div>';
    } else if (v.phase === 'ready') {
      const left = v.startAt - sNow;
      if (left > 3300) {
        const first = v.level === 1;
        const canGo = ctx.isHost && first;
        const L = KK.LEVELS[v.li];
        const K = this.kit;
        const menu = [...new Set(L.recipes)].map((r) => `<div><b>${K.emo[r]}</b><span>${K.names[r]} = ${KK.RECIPES[r].ing.map((x) => K.emo[x] + K.names[x]).join(' + ')}</span></div>`).join('');
        key = `ready|${v.level}|${v.players.map((r) => r.id + r.n).join(',')}|${canGo}`;
        html = `<div class="card">
          <div class="tt">👨‍🍳 Mutfak Kaosu</div>
          <div class="sub">${v.level}/${v.levels}. mutfak · ${this.lemo(v)} ${esc(v.lname)} · ${v.players.length} aşçı</div>
          <div class="sub">${esc(this.kit.subs[v.li] || v.lsub)} — hep birlikte çalışın, siparişler beklemesin!</div>
          ${first ? `<div class="how">
            <div><span class="k">🕹️</span><span><b>Sürükle = yürü</b><small>Ekranın solunda parmağını sürükle (bilgisayarda WASD / ok tuşları)</small></span></div>
            <div><span class="k">🤲</span><span><b>Tek tuş = al / koy / teslim</b><small>Sağdaki butona bas (bilgisayarda Boşluk). Yakındaki istasyonla ne yapılacağını buton söyler</small></span></div>
            <div><span class="k">🔥</span><span><b>${this.kit.cook} ızgarada pişir</b><small>5 sn'de pişer, 11 sn'de YANAR! ${this.kit.chop || 'Domates/marul'} 🔪 tahtada kendiliğinden doğranır</small></span></div>
            <div><span class="k">🍽️</span><span><b>Tabakla, teslim et</b><small>Malzemeleri tabağa koy, hazır yemeği al, 🛎️ teslim et. Gereksizi kasasına ↩️ geri koy ya da boş tezgâha bırak</small></span></div>
          </div>` : ''}
          <div class="kk-menu">${menu}</div>
          <div class="who">${chips(v.players)}</div>
          <div class="cd"><span>${v.playing ? 'Mutfak açılıyor' : 'Bu mutfağı izleyeceksin'}</span><b data-cd></b></div>
          ${canGo ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}
        </div>`;
        low = true;
      } else key = 'count';
    } else if (v.phase === 'play') {
      key = 'play';
    } else if (v.phase === 'result') {
      const s = v.sum || {};
      key = `result|${v.level}|${ctx.isHost}`;
      const title = s.stars >= 3 ? '🏆 Mükemmel mutfak!' : s.stars >= 1 ? '👏 Güzel iş!' : '😅 Bir dahaki sefere!';
      html = `<div class="card">
        <div class="tt">${title}</div>
        <div class="kk-stars">${stars(s.stars || 0)}</div>
        <div class="sub">${v.level}/${v.levels}. mutfak · ${s.delivered}/${s.spawned} sipariş teslim${s.expired ? ` · ${s.expired} kaçtı` : ''}${s.burnt ? ` · ${s.burnt} ${this.kit.burnW || 'köfte'} yandı` : ''}</div>
        <ol class="res">${v.results.map((r, i) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(i + 1)}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">${r.serves ? `🛎️×${r.serves}` : ''}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
        <div class="cd"><span>${v.last ? 'Genel sonuçlar' : 'Sonraki mutfak'}</span><b data-cd></b></div>
        ${ctx.isHost ? `<button class="kb btn" data-game-action="next">${v.last ? 'Sonuçlara geç ▶' : 'Sonraki mutfak ▶'}</button>` : ''}
      </div>`;
    } else if (v.phase === 'final') {
      const sb = v.scoreboard || [];
      const top = sb[0];
      const st = (v.stars || []).reduce((a, b) => a + b, 0);
      key = `final|${sb.map((s) => s.id + s.score).join(',')}|${ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏆 Takım ${st >= 7 ? 'efsane aşçılar!' : st >= 4 ? 'harika çalıştı!' : 'mutfağı bitirdi!'}</div>
        <div class="kk-stars">${stars(Math.min(3, Math.round(st / 3)))}</div>
        <div class="sub">Toplam ${v.total} puan · en çok katkı: <b>${esc(top?.nickname || '—')}</b></div>
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

  /* ---------- simülasyon (kendi karakterim: tahmin) ---------- */
  stepMine() {
    const m = this.mine;
    const v = this.view;
    if (!m || !v || v.phase !== 'play' || !this.lv) return;
    const el = this.simNow();
    if (el <= 0) return;
    if (el - this.simT > 0.5) this.simT = el - 0.5;
    const [ix, iy] = this.inputVec();
    let n = 0;
    while (this.simT + H_STEP <= el && n < 80) {
      KK.stepMove(m, ix, iy, H_STEP, this.lv);
      this.bod.forEach((o, i) => {
        if (i === this.my) return;
        const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy);
        if (d < 0.8 && d > 1e-4) { const k = (0.8 - d) * 0.25 / d; m.x += dx * k; m.y += dy * k; }
      });
      this.simT += H_STEP;
      n += 1;
    }
    if (this.actQ) {
      this.actQ = false;
      const t = KK.target(this.lv, this.S2, m, el * 1000);
      if (t) {
        this.sendAct();
        const s = this.bod[this.my], d = this.lv.st[t.i];
        if (s && d) { s.reachT = this.time + 0.3; s.faceAt = [d.x, d.y]; s.faceT = this.time + 0.42; }
      } else { this.snd.fx('no'); }
    }
  }
  sendAct() {
    try {
      const p = { x: Math.round(this.mine.x * 100) / 100, y: Math.round(this.mine.y * 100) / 100 };
      if (this.ctx.sendQuiet) this.ctx.sendQuiet('act', p); else this.ctx.send('act', p);
    } catch { /* yok say */ }
  }

  // Diğerleri: ~110 ms gerideden, iki görüntü arasında yumuşatılarak
  sampleOthers() {
    const rt = this.simNow() - 0.11;
    const S = this.snaps;
    if (!S.length || this.view?.phase !== 'play') return;
    let a = null, b = null;
    for (let i = S.length - 1; i >= 0; i--) { if (S[i].t <= rt) { a = S[i]; b = S[i + 1] || null; break; } }
    if (!a) { a = S[0]; b = null; }
    this.bod.forEach((s, i) => {
      const pa = a.p[i];
      if (!pa) return;
      let x = pa[0], y = pa[1], ang = pa[4], vx = pa[2], vy = pa[3];
      if (b && b.p[i]) {
        const pb = b.p[i];
        const k = clamp((rt - a.t) / Math.max(0.001, b.t - a.t), 0, 1);
        x = lerp(x, pb[0], k); y = lerp(y, pb[1], k); vx = lerp(vx, pb[2], k); vy = lerp(vy, pb[3], k); ang = angLerp(ang, pb[4], k);
      } else {
        const age = clamp(rt - a.t, 0, 0.25);
        x += vx * age; y += vy * age;
      }
      if (i === this.my && this.mine) {
        s.x = this.mine.x; s.y = this.mine.y; s.vx = this.mine.vx; s.vy = this.mine.vy;
        if (Math.hypot(this.mine.vx, this.mine.vy) > 0.7) s.ang = angLerp(s.ang, Math.atan2(this.mine.vy, this.mine.vx), 0.3);
        s.hold = this.mine.hold;
      } else {
        const d = Math.hypot(x - s.x, y - s.y);
        if (d > 3) { s.x = x; s.y = y; } else { s.x = lerp(s.x, x, 0.5); s.y = lerp(s.y, y, 0.5); }
        s.vx = vx; s.vy = vy;
        s.ang = angLerp(s.ang, ang, 0.35);
        s.hold = pa[5];
      }
    });
  }

  // Aşçıların iskeleti: gövde/bacak/kol matrisleri, taşınan eşyanın yeri, adım tozu
  rigChefs(dt) {
    const play = this.view?.phase === 'play';
    const MAk = masa();
    this.bod.forEach((s, i) => {
      const spd = Math.hypot(s.vx, s.vy);
      s.spdS = damp(s.spdS || 0, play ? spd : 0, 10, dt);
      const walk = clamp(s.spdS / 3.2, 0, 1);
      const prevPh = s.ph || 0;
      s.ph = prevPh + dt * (4 + s.spdS * 2.1) * (walk > 0.05 ? 1 : 0);
      if (walk > 0.05 && Math.floor(s.ph / Math.PI) !== Math.floor(prevPh / Math.PI)) this.step(s, i, walk);
      // yüz: harekete göre; az önce bir istasyonla iş yaptıysa ona döner — ama yürümeye başlayınca bu hemen biter
      // (yoksa istasyona bakarken uzaklaşıp geri geri yürüyormuş gibi görünür)
      if (spd > 1.1) s.faceT = 0;
      let yaw = Math.PI / 2 - s.ang;
      if (s.faceT > this.time && s.faceAt) yaw = Math.atan2(s.faceAt[0] - s.x, s.faceAt[1] - s.y);
      if (s.yawNow === undefined) s.yawNow = yaw;
      let dy = yaw - s.yawNow;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      s.yawNow += dy * (1 - Math.exp(-14 * dt));
      // karakter: masa karakteri ayakta, aşçı kılığında (bacaklar adımla, kollar işe göre)
      const pl = this.view?.players?.[i];
      const ci = (((pl ? pl.c : i) % 12) + 12) % 12;
      let a = s.av;
      if (!a || a.ci !== ci) a = s.av = new MAk.StandAvatar(ci);
      a.base[0] = s.x; a.base[1] = 0; a.base[2] = s.y;
      a.yaw = s.yawNow; a.walk = walk; a.gait = s.ph - Math.PI / 2;
      const carrying = !!s.hold && !(s.hideHold > this.time);
      const reaching = s.reachT > this.time;
      const joy = s.joyT > this.time;
      if (reaching) a.standPose('reach', this.time);
      else if (carrying) a.standPose('carry', this.time);
      else if (joy) a.standPose('cheer', this.time);
      else if (walk > 0.05) a.standPose('walk', this.time, walk);
      else a.standPose('idle', this.time);
      a.tgt.lean += clamp(s.spdS * 0.025, 0, 0.12);
      a.tgt.roll = Math.sin(s.ph) * walk * 0.05;
      a.k = 14;
      a.expr = joy ? 'laugh' : s.sadT > this.time ? 'sad' : s.ohT > this.time ? 'o' : reaching ? 'tense' : carrying ? 'grin' : 'smile';
      a.look = reaching && s.faceAt ? [s.faceAt[0], TOP, s.faceAt[1]] : null;
      a.stepStand(dt, this.time);
      a.setRoot(AV_K);
      s.body = a.M.body;
      // taşınan eşya: iki elin üstünde, göğsün önünde
      const h0 = a.rootP(a.hw[0]), h1 = a.rootP(a.hw[1]), fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
      s.carry = s.carry || [0, 0, 0];
      s.carry[0] = (h0[0] + h1[0]) / 2 + fx * 0.09;
      s.carry[1] = (h0[1] + h1[1]) / 2 - 0.03;
      s.carry[2] = (h0[2] + h1[2]) / 2 + fz * 0.09;
    });
    // uçuşlar
    for (let k = this.flights.length - 1; k >= 0; k--) {
      const f = this.flights[k];
      f.t += dt;
      if (f.t >= f.dur) { this.flights.splice(k, 1); this.land(f); }
    }
  }
  // adım: yerde küçük toz bulutu (+ benim aşçım için yumuşak tıkırtı)
  step(s, i, walk) {
    if (walk < 0.35 || this.parts.length > 600) return;
    const side = Math.floor(s.ph / Math.PI) % 2 ? 1 : -1;
    const cy = Math.cos(s.yawNow || 0), sy = Math.sin(s.yawNow || 0);
    const fx = s.x + cy * side * 0.17 - sy * 0.05, fz = s.y - sy * side * 0.17 - cy * 0.05;
    for (let k = 0; k < 2; k++) this.parts.push({ x: fx + (Math.random() - 0.5) * 0.15, y: 0.06, z: fz + (Math.random() - 0.5) * 0.15, vx: (Math.random() - 0.5) * 0.4 - s.vx * 0.08, vy: 0.25 + Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.4 - s.vy * 0.08, life: 0.45, max: 0.45, s: 0.07, r: 0.9, g: 0.86, b: 0.78, add: false, grav: 0.4, drag: 3, puff: true });
    if (i === this.my) this.snd.fx('step', clamp(s.x / 6, -0.8, 0.8));
  }
  // Eşya uçuşu: istasyon <-> aşçının elleri arasında yay çizerek
  launch(kind, si, it, pi) {
    const d = this.lv?.st[si];
    const s = this.bod[pi];
    if (!d || !s || !it) return;
    s.faceAt = [d.x, d.y];
    s.faceT = this.time + 0.42;
    s.reachT = this.time + 0.3;
    const topY = d.k === 'trash' ? TOP + 0.7 : d.k === 'crate' ? TOP + 0.25 : TOP + 0.12;
    const sp = [d.x, topY, d.y];
    const hand = s.carry ? s.carry.slice() : [s.x, 1.0, s.y];
    const rot = Math.random() * 6;
    if (kind === 'take' || kind === 'pick' || kind === 'dish') {
      // istasyondan ele
      s.hideHold = this.time + 0.22;
      this.flights.push({ code: it, a: sp, chef: pi, t: 0, dur: 0.22, s0: d.k === 'crate' ? 1.1 : 1.25, s1: 1.12, rot, spin: 0.8, kind: 'in', st: si });
    } else {
      // elden istasyona
      const shrink = kind === 'trash' || kind === 'back';
      if (!shrink) this.hideSt[si] = this.time + 0.24;
      const dur = kind === 'serve' ? 0.3 : 0.24;
      this.flights.push({ code: it, a: hand, b: sp, t: 0, dur, s0: 1.12, s1: kind === 'serve' ? 1.4 : 1.25, rot, spin: shrink ? 4 : 0.6, kind: 'out', st: si, shrink, how: kind });
    }
  }
  flyPos(f, k) {
    const e = k * k * (3 - 2 * k);
    const a = f.a;
    let b = f.b;
    if (f.kind === 'in') { const s = this.bod[f.chef]; b = s && s.carry ? s.carry : a; }
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const h = Math.sin(k * Math.PI) * (0.35 + d * 0.18) + (f.shrink ? Math.sin(k * Math.PI) * 0.25 : 0);
    return [lerp(a[0], b[0], e), lerp(a[1], b[1], e) + h, lerp(a[2], b[2], e)];
  }
  land(f) {
    const P = this.flyPos(f, 1);
    if (f.kind === 'in') {
      const s = this.bod[f.chef];
      if (s) s.popT = this.time + 0.18;
      this.burst(P[0], P[1] + 0.1, P[2], 5, [1, 0.95, 0.75], 1.4, 0.05, true, 0.3, 3);
    } else if (f.shrink) {
      const trash = f.how === 'trash';
      this.burst(P[0], P[1], P[2], trash ? 8 : 5, trash ? [0.62, 0.62, 0.62] : [1, 0.92, 0.6], trash ? 1.8 : 1.2, trash ? 0.08 : 0.05, !trash, 0.4, 4);
      if (!trash) this.floatText('↩️', P[0], P[1] + 0.5, P[2]);
    } else {
      (this.popSt || (this.popSt = []))[f.st] = this.time + 0.18;
      this.burst(P[0], P[1] + 0.05, P[2], 6, [1, 0.95, 0.8], 1.5, 0.06, true, 0.35, 4);
    }
  }

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
      if (p.y < 0.03 && !p.conf && p.grav > 0) { P[i] = P[P.length - 1]; P.pop(); }
    }
    // pişen / yanan istasyonlardan duman ve buhar
    if (this.lv && this.S2 && this.view?.phase === 'play' && P.length < 600) {
      const now = this.simNow() * 1000;
      this.lv.st.forEach((d, i) => {
        if (d.k !== 'grill') return;
        const ss = this.S2[i];
        if (!ss.item) return;
        const e = KK.eff(d, ss, now);
        if (Math.random() < dt * (e === 6 ? 14 : e === 5 ? 3 : 1.2)) {
          const c = e === 6 ? 0.22 : 0.9;
          P.push({ x: d.x + (Math.random() - 0.5) * 0.5, y: TOP + 0.3, z: d.y + (Math.random() - 0.5) * 0.9, vx: 0, vy: 0.9, vz: 0, life: 0.9, max: 0.9, s: 0.14, r: c, g: c, b: c, add: false, grav: -1, drag: 1.5, puff: true });
        }
      });
    }
  }
  // Parçacıklar: konfeti kare kâğıt, diğerleri yumuşak kenarlı yuvarlak (ortası dolu, kenarı saydam)
  fillParts(V) {
    const rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    let na = 0, nb = 0;
    const A = this.pA, B = this.pB;
    const RING = this.ring6 || (this.ring6 = Array.from({ length: 7 }, (_, k) => [Math.cos((k / 6) * Math.PI * 2), Math.sin((k / 6) * Math.PI * 2)]));
    for (const p of this.parts) {
      const add = p.add;
      const arr = add ? B : A;
      let o = (add ? nb : na) * 7;
      if (o + 126 > arr.length) continue;
      const k = p.life / p.max;
      const a = p.conf ? Math.min(1, k * 2.5) : p.puff ? k * 0.55 : k;
      if (p.conf) {
        const s = p.s;
        const c0 = [p.x - rx * s - ux * s, p.y - ry * s - uy * s, p.z - rz * s - uz * s];
        const c1 = [p.x + rx * s - ux * s, p.y + ry * s - uy * s, p.z + rz * s - uz * s];
        const c2 = [p.x + rx * s + ux * s, p.y + ry * s + uy * s, p.z + rz * s + uz * s];
        const c3 = [p.x - rx * s + ux * s, p.y - ry * s + uy * s, p.z - rz * s + uz * s];
        for (const q of [c0, c1, c2, c0, c2, c3]) { arr[o++] = q[0]; arr[o++] = q[1]; arr[o++] = q[2]; arr[o++] = p.r; arr[o++] = p.g; arr[o++] = p.b; arr[o++] = a; }
        if (add) nb += 6; else na += 6;
        continue;
      }
      const s = (p.puff ? p.s * (1 + (1 - k) * 2.2) : p.s) * 1.5;
      for (let j = 0; j < 6; j++) {
        const [c0, s0] = RING[j], [c1, s1] = RING[j + 1];
        arr[o++] = p.x; arr[o++] = p.y; arr[o++] = p.z; arr[o++] = p.r; arr[o++] = p.g; arr[o++] = p.b; arr[o++] = a;
        arr[o++] = p.x + (rx * c0 + ux * s0) * s; arr[o++] = p.y + (ry * c0 + uy * s0) * s; arr[o++] = p.z + (rz * c0 + uz * s0) * s; arr[o++] = p.r; arr[o++] = p.g; arr[o++] = p.b; arr[o++] = 0;
        arr[o++] = p.x + (rx * c1 + ux * s1) * s; arr[o++] = p.y + (ry * c1 + uy * s1) * s; arr[o++] = p.z + (rz * c1 + uz * s1) * s; arr[o++] = p.r; arr[o++] = p.g; arr[o++] = p.b; arr[o++] = 0;
      }
      if (add) nb += 18; else na += 18;
    }
    return [na, nb];
  }

  /* ---------- kamera ---------- */
  stepCam(dt) {
    const c = this.cam;
    const vw = this.vw || 1, vh = this.vh || 1;
    const asp = vw / vh;
    const land = asp > 1.1;
    const pitch = land ? 1.1 : 1.0;   // dikeyde daha yatık bakış: tezgâhların önü ve aşçıların gövdesi görünür
    const fovy = land ? 0.8 : 0.9;
    this.fov = fovy;
    const tV = Math.tan(fovy / 2), tH = tV * asp;
    const yawT = land ? Math.PI / 2 : 0;
    c.yawT = yawT;
    const Rw = land ? 6.6 + 0.9 : 4.6 + 0.6;      // ekranda yatay yarı genişlik (dünya)
    const Rd = land ? 4.6 : 6.6;                   // ekranda dikey yarı derinlik
    const Dh = Rw / tH;
    const Dv = (Rd * 2 * Math.sin(pitch) + 2.6) / (2 * tV * (land ? 0.72 : 0.62));
    const Dt = Math.max(Dh, Dv, 12);
    c.D = damp(c.D || Dt, Dt, 3, dt);
    c.yaw = damp(c.yaw, yawT, 3.2, dt);
    c.tx = 0; c.tz = land ? 0.6 : 0.4; c.ty = 0.4;
    c.ex = c.tx + Math.sin(c.yaw) * c.D * Math.cos(pitch);
    c.ey = c.D * Math.sin(pitch);
    c.ez = c.tz + Math.cos(c.yaw) * c.D * Math.cos(pitch);
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

  drawItem(code, x, y, z, s, rot, tint) {
    const m = this.mats.c;
    M.set(m, x, y, z, rot, 0, 0, s);
    if (this.Dcb) this.Dcb(this.item(code), m, tint); else drawMesh(this.X, this.item(code), m, tint);
  }

  // Oturan müşteriler: gövde alçaltılır, bacaklar öne, kollar masaya; tepkide kollar havaya kalkar / baş sallanır
  // Müşteriler: masa karakterleri sandalyede. Bekler, sohbet eder; yemek gelince sevinip yer, sipariş kaçınca söylenir.
  rigDiners(dt) {
    const MAk = masa();
    const A = this.dAv || (this.dAv = DINERS.map((q, i) => { const a = new MAk.Avatar(DINER_CI[i]); a.pos = [q.x, 0.03, q.z]; a.yaw = q.yaw; return a; }));
    const st = this.diners || [];
    A.forEach((a, i) => {
      const r = st[i];
      const age = r ? this.time - r.t : 99;
      const yum = r && r.kind === 'yum' && age < 1.6, sad = r && r.kind === 'sad' && age < 1.4;
      const eating = r && r.dish && this.time - r.dishT < 14;
      const t = this.time + i * 3.1;
      if (yum) { a.pose('cheer', { t: this.time, k: 12 }); a.expr = 'laugh'; }
      else if (sad) { a.pose(i % 2 ? 'facepalm' : 'slump', { t: this.time }); a.expr = 'sad'; }
      else {
        a.pose(!eating && Math.sin(t * 0.21) > 0.55 ? 'chin' : 'rest', { t: this.time, k: 6 });
        a.expr = 'smile';
        if (eating) {
          // tabaktan ağza: sağ el yemeğe uzanır, ağza götürür
          const e = (this.time * 0.55 + i * 0.37) % 1, g = a.tgt;
          if (e < 0.5) {
            g.hand[1] = e < 0.25 ? [0.1, 0.8, 0.55] : [0.05, 1.12, 0.3];
            g.fdir[1] = [-0.2, 0.3, 1]; g.palm[1] = [-0.6, 0.2, 0.4]; g.fw[1] = 0.7; g.pole[1] = [0.7, -0.6, -0.2];
            a.shape[1] = 'grip';
          }
          if (e >= 0.3 && e < 0.62) a.expr = 'grin';
        }
      }
      // bakış: masa arkadaşı ya da mutfak
      const mate = A[i ^ 1];
      a.look = Math.sin(t * 0.33) > 0 ? [mate.pos[0], 1.3, mate.pos[2]] : [0, 1.2, 3];
      a.step(dt, this.time);
    });
  }
  drawDiners(D, T, shadow) {
    const A = this.dAv;
    if (!A) return;
    const MAk = masa(), sh = this.avSh();
    // müşteriler masanın gölgesinde kalır: ayrı gölge çizilmez (telefonda hız)
    if (!shadow) A.forEach((a, i) => {
      const mm = this.dinerMesh(a.ci);
      const tS = a.tS || (a.tS = new Float32Array(3)), tH = a.tH || (a.tH = new Float32Array(3));
      for (let k = 0; k < 3; k++) { tS[k] = a.tint[k] * T[k]; tH[k] = a.skinT[k] * T[k]; }
      MAk.drawSeat(this.X, a, mm, sh, this.Fr, { h: this.vh, rimK: 0.28 }, T, tS, tH, KIT.blinkAt(i + 7, this.time));
    });
    const st = this.diners || [];
    // müşterilerin önüne gelen yemekler (bir süre kalır, sonra biter)
    st.forEach((r, i) => {
      if (!r.dish || this.time - r.dishT > 14) return;
      const q = DINERS[i];
      const k = Math.min(1, (this.time - r.dishT) / 0.25);
      this.drawItem(r.dish, q.tx, 0.79, q.tz, 0.72 * k, q.yaw, T);
    });
  }

  // Opak sahne: gölge geçişi (shadow = true) ve ana çizim ortak. D(mesh, m, tint, alpha, glow)
  litScene(D, shadow, T, nowMs) {
    const Wd = this.W, lv = this.lv, S = this.S2;
    const m = this.mats.a;
    this.Dcb = D;
    M.set(m, 0, 0, 0);
    if (!shadow) { detailOn(this.X, 0.16, 0.22); D(Wd.floor, m, T); }
    D(Wd.dining, m, T);
    M.set(m, -4.3, 0, 8.0, Math.PI / 4, 0, 0, 0.55);
    D(Wd.board, m, T);
    this.drawDiners(D, T, shadow);
    M.set(m, 0, 0, 0);
    D(Wd.wallDeco, m, T);
    if (!shadow) detailOn(this.X, 0.1, 0.3);
    D(Wd.st, m, T);
    if (!shadow) detailOn(this.X, 0);
    // istasyonların üstündeki yiyecekler
    const hop = Math.abs(Math.sin(this.time * 13)) * 0.05;
    lv.st.forEach((d, i) => {
      const ss = S[i];
      if (this.hideSt[i] > this.time && d.k !== 'crate') return;
      const pop = this.popSt?.[i] > this.time ? 1 + 0.22 * Math.sin((this.popSt[i] - this.time) / 0.18 * Math.PI) : 1;
      if (d.k === 'crate') {
        this.drawItem(d.item, d.x - 0.55, TOP + 0.02, d.y + 0.02, 1.1, 0.4, T);
        this.drawItem(d.item, d.x + 0.45, TOP + 0.02, d.y - 0.12, 1.1, 1.6, T);
        this.drawItem(d.item, d.x - 0.05, TOP + 0.02, d.y + 0.1, 1.1, 2.4, T);
        this.drawItem(d.item, d.x + 0.05, TOP + (d.item === 3 || d.item === 4 ? 0.4 : 0.17), d.y + 0.05, 1.05, 0.9, T);
      } else if (d.k === 'grill' && ss.item) {
        const e = KK.eff(d, ss, nowMs);
        this.drawItem(e, d.x, TOP + 0.15, d.y, 1.25 * pop, 0.3, T);
      } else if (d.k === 'board' && ss.item) {
        const e = KK.eff(d, ss, nowMs);
        const chopping = e === ss.item;
        this.drawItem(e, d.x, TOP + 0.12 + (chopping ? hop : 0), d.y, 1.25 * pop, chopping ? Math.sin(this.time * 13) * 0.12 : 0.2, T);
      } else if (d.k === 'table' && ss.item) {
        this.drawItem(ss.item, d.x, TOP + (d.island ? 0.05 : 0.07), d.y, 1.3 * pop, 0.2, T);
      } else if (d.k === 'plate' && ss.plate) {
        const mask = KK.plateMask(ss);
        const dish = KK.MASK_RECIPE[mask];
        if (dish) this.drawItem(dish, d.x, TOP + 0.08, d.y, 1.4 * pop, 0, T);
        else {
          const its = [1, 5, 7, 8].filter((it) => ss.plate.includes(it));
          const OFF = its.length === 1 ? [[0, 0]] : its.length === 2 ? [[-0.17, 0.02], [0.17, -0.02]] : [[-0.19, -0.1], [0.19, -0.1], [0, 0.17]];
          its.forEach((it, k) => this.drawItem(it, d.x + OFF[k][0], TOP + 0.08, d.y + OFF[k][1], 0.95 * pop, 0.3 + k, T));
        }
      }
    });
    // karakterler: masa karakterleri ayakta, aşçı kılığında (poz rigChefs'te)
    const chars = [];
    const MAk = masa(), ash = this.avSh();
    this.bod.forEach((s2, i) => {
      const a = s2.av;
      if (!a) return;
      const ci = a.ci;
      if (shadow) MAk.castStand(this.X, a, this.avMesh(ci), ash);
      else {
        const tS = a.tS || (a.tS = new Float32Array(3)), tH = a.tH || (a.tH = new Float32Array(3));
        for (let k = 0; k < 3; k++) { tS[k] = a.tint[k] * T[k]; tH[k] = a.skinT[k] * T[k]; }
        MAk.drawStand(this.X, a, this.avMesh(ci), ash, this.Fr, { h: this.vh, rimK: 0.28 }, T, tS, tH, KIT.blinkAt(i, this.time));
      }
      chars.push({ s: s2, i, ci, me: i === this.my });
      if (s2.hold && !(s2.hideHold > this.time)) {
        const q = s2.carry;
        const pk = s2.popT > this.time ? 1 + 0.25 * Math.sin((s2.popT - this.time) / 0.18 * Math.PI) : 1;
        this.drawItem(s2.hold, q[0], q[1], q[2], 1.12 * pk, s2.yawNow, T);
      }
    });
    // uçan malzemeler
    this.flights.forEach((f) => {
      const k = clamp(f.t / f.dur, 0, 1);
      const P = this.flyPos(f, k);
      const sc = f.shrink ? lerp(1.1, 0.25, k * k) : lerp(f.s0, f.s1, k) * (1 + 0.18 * Math.sin(k * Math.PI));
      this.drawItem(f.code, P[0], P[1], P[2], sc, f.rot + k * f.spin, T);
    });
    this.Dcb = null;
    return chars;
  }

  draw() {
    const X = this.X;
    const Wd = this.W;
    if (!X || this.lost || !Wd || !this.lv) { if (!X && this.lv) this.draw2d(); return; }
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const tod = TOD[this.todI];
    const c = this.cam;
    const mt = this.mats;
    const lv = this.lv;
    const S = this.S2;
    const nowMs = Math.max(0, this.simNow() * 1000);
    M.persp(mt.P, this.fov, asp, 0.5, 300);
    M.look(mt.V, c.ex, c.ey, c.ez, c.tx, c.ty, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const K = this.cols;
    const F = { VP: mt.VP, V: mt.V, fov: this.fov, asp, shift: 0, cx: c.ex, cy: c.ey, cz: c.ez, sun: K.sun, fog: K.fog, top: K.top, hor: K.hor, sunVis: K.sunVis, lx: 0, ly: 9, lz: 0, lampC: tod.lampC };
    const setFog = (p) => { if (p.u.uFogR) gl.uniform2f(p.u.uFogR, c.D * 2.2, c.D * 2.2 + 120); };
    const m = mt.a;
    const ex = [0.98, 1.0, 1.1][this.todI] * 1.02;
    const T = this.T1 || (this.T1 = new Float32Array(3));
    T.fill(ex);
    this.rigChefs(this.dtDraw || 0.016);
    this.rigDiners(this.dtDraw || 0.016);
    // ---- gerçek gölgeler ----
    if (shadowBegin(X, K.sun, 0, 0.5, 1.4, 11.2, 11.2 * 2.2 + 10, 0.6)) this.litScene((mesh, mm) => shadowCast(X, mesh, mm), true, T, nowMs);
    shadowEnd(X, Wp, Hp);
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(F.fog[0], F.fog[1], F.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);

    // salon zemini (ceviz)
    useProg(X, X.tex, F, tod);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.res.wood());
    M.set(m, 0, 0, 0);
    drawMesh(X, Wd.dfloor, m, T);
    // kasap tablaları (akçaağaç) ve karo duvar
    gl.bindTexture(gl.TEXTURE_2D, this.res.wood('maple'));
    drawMesh(X, Wd.blocks, m, T);
    if (this.wallTex) { gl.bindTexture(gl.TEXTURE_2D, this.wallTex); drawMesh(X, Wd.wall, m, T); }
    useProg(X, X.lit, F, tod);
    setFog(X.lit);
    aoOn(X, 0, 0.55, 0.38);
    this.Fr = F;
    const chars = this.litScene((mesh, mm, tint, al, gw) => drawMesh(X, mesh, mm, tint, al, gw), false, T, nowMs);
    // hedef istasyon oku
    this.tgt = this.mine && this.view?.phase === 'play' ? KK.target(lv, S, this.mine, nowMs) : null;
    if (this.tgt) {
      const d = lv.st[this.tgt.i];
      M.set(m, d.x, TOP + 1.05 + Math.sin(this.time * 6) * 0.12, d.y, this.time * 1.8, Math.PI, 0, 1.0);
      drawMesh(X, Wd.arrow, m, ONE3, 1, 1.0);
    }

    // zemin halısı (logo)
    useProg(X, X.tex, F, tod);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0.3 + tod.night * 0.5);
    gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
    M.set(m, 0, 0, 3.4);
    drawMesh(X, Wd.rug, m);
    gl.uniform1f(X.tex.u.uSelf, 0.15);
    M.set(m, -4.3, 0, 8.0, Math.PI / 4, 0, 0, 0.55);
    drawMesh(X, Wd.boardLogo, m, T);

    // saydam
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, tod);
    setFog(X.un);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    lv.st.forEach((d) => {
      M.set(m, d.x, 0.012, d.y, 0, 0, 0, d.w * 0.7 + 0.22, 1, d.h * 0.7 + 0.22);
      drawMesh(X, this.res.shadow, m, ONE3, 0.38);
    });
    chars.forEach((q) => {
      M.set(m, q.s.x, 0.03, q.s.y, 0, 0, 0, 0.62, 1, 0.62);
      drawMesh(X, this.res.shadow, m, ONE3, 0.45);
    });
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    chars.forEach((q) => {
      const col = hexRGB(pcol(q.ci));
      M.set(m, q.s.x, 0.05, q.s.y, 0, 0, 0, q.me ? 1.35 : 1.0, 1, q.me ? 1.35 : 1.0);
      drawMesh(X, this.res.glow, m, col, q.me ? 0.6 + 0.2 * Math.sin(this.time * 5) : 0.34);
    });
    // tavan lambalarından zemine düşen sıcak ışık
    [[-2.2, -2.6], [2.2, -2.6], [-2.2, 2.6], [2.2, 2.6]].forEach(([x, z], k) => {
      M.set(m, x, 0.02, z, 0, 0, 0, 2.6, 1, 2.6);
      drawMesh(X, this.res.glow, m, [1, 0.86, 0.6], 0.075 + 0.01 * Math.sin(this.time * 1.3 + k));
    });
    DINE_T.forEach(([x, z]) => { M.set(m, x, 0.02, z, 0, 0, 0, 2.1, 1, 2.1); drawMesh(X, this.res.glow, m, [1, 0.78, 0.45], 0.09); });
    // ızgara kömürleri
    lv.st.forEach((d, i) => {
      if (d.k !== 'grill' || !S[i].item) return;
      const e = KK.eff(d, S[i], nowMs);
      M.set(m, d.x, TOP + 0.1, d.y, 0, 0, 0, 1.0, 1, 1.4);
      drawMesh(X, this.res.glow, m, e === 6 ? [1, 0.15, 0.05] : [1, 0.55, 0.15], e === 6 ? 0.5 + 0.3 * Math.sin(this.time * 14) : 0.4);
    });
    // hedef istasyon parlaması
    if (this.tgt) {
      const d = lv.st[this.tgt.i];
      const k = 0.55 + 0.2 * Math.sin(this.time * 6);
      M.set(m, d.x, TOP + 0.12, d.y, 0, 0, 0, d.w * 0.9 + 0.5, 1, d.h * 0.9 + 0.5);
      drawMesh(X, this.res.glow, m, [1, 0.9, 0.35], k);
    }
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    postFX(X, Wp, Hp, { bloom: 0.38, th: 0.86, white: 0.08, sat: 1.1, con: 0.16, vig: 0.5, tilt: asp > 1 ? [0.5, 0.36, 0.7] : [0.52, 0.38, 0.7] });
  }

  // WebGL yoksa: üstten görünüm
  draw2d() {
    const g = this.g2;
    const cv = this.el.cv;
    const w = this.el.wrap.clientWidth || 1, h = this.el.wrap.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#e8d6b0'; g.fillRect(0, 0, w, h);
    const land = w > h * 1.1;
    const sc = land ? Math.min(w / 14.4, h / 10.4) : Math.min(w / 10, h / 14.4);
    const cx = w / 2, cy = h / 2;
    const P = (x, y) => (land ? [cx - y * sc, cy + x * sc] : [cx + x * sc, cy + y * sc]);
    const now = Math.max(0, this.simNow() * 1000);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const rect = (d, col) => {
      const [x, y] = P(d.x, d.y);
      const ww = (land ? d.h : d.w) * sc, hh = (land ? d.w : d.h) * sc;
      g.fillStyle = col; g.fillRect(x - ww / 2, y - hh / 2, ww, hh);
      return [x, y];
    };
    this.lv.solid.forEach((d) => rect(d, '#b98450'));
    const COL = { crate: '#8a5a33', grill: '#3a3f47', board: '#b98450', plate: '#f4f1ea', table: '#cfd6dd', serve: '#3aa857', trash: '#515a66' };
    this.lv.st.forEach((d, i) => {
      const [x, y] = rect(d, COL[d.k] || '#999');
      g.font = `${Math.max(14, sc * 0.7)}px system-ui`;
      const e = d.k === 'crate' ? this.kit.emo[d.item] : ST_EMOJI[d.k];
      if (e) g.fillText(e, x, y);
      const ss = this.S2?.[i];
      if (ss?.item) { g.font = `${sc * 0.6}px system-ui`; g.fillText(this.kit.emo[KK.eff(d, ss, now)] || '•', x, y + sc * 0.5); }
      if (this.tgt && this.tgt.i === i) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(x - 20, y - 20, 40, 40); }
    });
    this.bod.forEach((s, i) => {
      const [x, y] = P(s.x, s.y);
      const pl = this.view?.players?.[i];
      g.fillStyle = pcol(pl ? pl.c : i);
      g.beginPath(); g.arc(x, y, KK.PR * sc, 0, 7); g.fill();
      g.strokeStyle = i === this.my ? '#fff' : '#222'; g.lineWidth = i === this.my ? 4 : 2; g.stroke();
      g.font = `${KK.PR * sc * 1.4}px system-ui`;
      g.fillText('👨‍🍳', x, y);
      if (s.hold) { g.font = `${sc * 0.6}px system-ui`; g.fillText(this.kit.emo[s.hold] || '', x, y - KK.PR * sc * 1.3); }
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
    if (v.phase === 'ready' || (v.phase === 'play' && t < 0.6)) {
      const left = -t;
      const n = Math.ceil(left);
      if (left > 0 && left <= 3 && n !== this.lastBeep) { this.lastBeep = n; this.msg(String(n), 'big'); this.snd.fx('beep'); }
      if (left <= 0 && this.lastBeep > 0 && this.lastBeep < 99) { this.lastBeep = 0; this.msg('BAŞLA! 👨‍🍳', 'big gold'); this.snd.fx('go'); vibrate(40); if (v.level === 1 && v.me >= 0) this.toastK('🕹️ Sola sürükle · 🤲 sağa dokun = al / koy / teslim', 3800); }
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
    const ctlShow = !!m && (v.phase === 'play' || (v.phase === 'ready' && t > -3.3)) && !this.panelLow;
    this.el.hint.classList.toggle('off', !(ctlShow && !this.joy));
    this.el.act.classList.toggle('off', !ctlShow);
    const tg = this.tgt;
    this.el.act.classList.toggle('rdy', !!tg);
    const at = tg ? ACT_TXT[tg.a] : null;
    const ai = at ? at[0] : '🤲', atx = at ? at[1] : '—';
    if (this.el.actI.textContent !== ai) this.el.actI.textContent = ai;
    if (this.el.actT.textContent !== atx) this.el.actT.textContent = atx;
    // elindekini göster
    const hh = m ? m.hold : 0;
    const ht = hh && v.phase === 'play' ? `${this.kit.emo[hh] || ''} ${this.kit.names[hh] || ''}` : '';
    this.el.hold.classList.toggle('off', !ht);
    if (ht && this.el.hold.textContent !== ht) this.el.hold.textContent = ht;
    let note = '';
    if (v.phase === 'play' && !m && v.me < 0) note = '👀 Bu mutfağı izliyorsun — sonrakinde sen de varsın!';
    if (note !== this.noteText) { this.noteText = note; this.el.note.textContent = note; this.el.note.classList.toggle('on', !!note); }
    if (!showHud) return;
    const left = v.phase === 'play' ? Math.max(0, v.ltime - Math.max(0, t)) : 0;
    const mm = Math.floor(left / 60), ss = Math.floor(left % 60);
    const tt = v.phase === 'result' ? '🏁' : `${mm}:${String(ss).padStart(2, '0')}`;
    if (tt !== this.ttText) { this.ttText = tt; this.el.tm.textContent = tt; }
    if (v.phase === 'play' && left < 10 && left > 0 && Math.ceil(left) !== this.lastTick) { this.lastTick = Math.ceil(left); this.snd.fx('tick'); }
    const pb = String(v.dl ?? 0), ps = `/${v.sp ?? 0}`;
    if (this.el.posB.textContent !== pb) { this.el.posB.textContent = pb; this.el.pos.classList.add('pulse'); setTimeout(() => this.el.pos.classList.remove('pulse'), 220); }
    if (this.el.posS.textContent !== ps) this.el.posS.textContent = ps;
    const sc = `⭐ ${v.pts ?? 0}`;
    if (this.el.sc.textContent !== sc) this.el.sc.textContent = sc;
    const lv = `${v.level}/${v.levels} · ${this.lemo(v)} ${v.lname}`;
    if (this.el.lv.textContent !== lv) this.el.lv.textContent = lv;
    // fişlerin sabır çubukları
    this.tickets.forEach((tk) => {
      const o = tk.o;
      const p = clamp((o.ex - Math.max(0, t) * 1000) / (o.ex - o.at), 0, 1);
      tk.bar.style.width = `${(p * 100).toFixed(1)}%`;
      const col = p > 0.5 ? '#3fb950' : p > 0.25 ? '#f0b429' : '#ef4444';
      if (tk.col !== col) { tk.col = col; tk.bar.style.background = col; }
      tk.el.classList.toggle('warn', p < 0.25);
    });
  }

  labels() {
    const pls = this.view?.players || [];
    const now = Math.max(0, this.simNow() * 1000);
    const play = this.view?.phase === 'play';
    // istasyon etiketleri
    this.stLbl.forEach((L) => {
      if (!L) return;
      const d = L.d;
      const ss = this.S2?.[L.i];
      const p = this.project(d.x, d.k === 'crate' ? TOP + 1.2 : TOP + 1.05, d.k === 'crate' ? d.y + 0.2 : d.y);
      if (!p || !this.X) { L.el.style.display = 'none'; return; }
      L.el.style.display = '';
      L.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, -100%)`;
      if (L.br) {
        let show = false, hot = false;
        if (ss?.item && play) {
          const e = (now - ss.t0) / 1000;
          if (d.k === 'grill') {
            show = true;
            const pr = clamp(e / KK.BURN_T, 0, 1);
            L.br.style.background = 'linear-gradient(90deg,#f59e0b 0 45%,#3fb950 45% 82%,#ef4444 82% 100%)';
            L.fi.style.display = 'none';
            L.mk.style.left = `calc(${(pr * 100).toFixed(1)}% - 1px)`;
            hot = e > 9;
            const cur = KK.eff(d, ss, now);
            if (this.stPrev[L.i] === 2 && cur === 5) { this.snd.fx('ready', clamp(d.x / 6, -0.8, 0.8)); this.floatText('✓', d.x, TOP + 0.9, d.y, '#7CFC9A'); }
            this.stPrev[L.i] = cur;
          } else if (d.k === 'board') {
            const cur = KK.eff(d, ss, now);
            const chopping = cur === ss.item;
            show = chopping;
            const pr = clamp(e / KK.CHOP_T, 0, 1);
            L.br.style.background = 'rgba(12,10,26,.65)';
            L.fi.style.display = '';
            L.fi.style.width = `${(pr * 100).toFixed(1)}%`;
            L.mk.style.left = '-5px';
            if (chopping && now - (this.lastChop || 0) > 230) { this.lastChop = now; this.snd.fx('chop', clamp(d.x / 6, -0.8, 0.8)); }
            if (this.stPrev[L.i] === ss.item && !chopping) { this.snd.fx('chopdone', clamp(d.x / 6, -0.8, 0.8)); this.floatText('✓', d.x, TOP + 0.9, d.y, '#7CFC9A'); }
            this.stPrev[L.i] = cur;
          }
        } else this.stPrev[L.i] = 0;
        if (show !== L.shown) { L.shown = show; L.br.style.display = show ? 'block' : 'none'; }
        if (hot !== L.hot) { L.hot = hot; L.el.classList.toggle('hot', hot); }
      }
    });
    // oyuncu isimleri (birbirine binenler yukarı dizilir)
    const vis = new Set();
    const LB = [];
    this.bod.forEach((s, i) => {
      const pl = pls[i];
      if (!this.X || !pl) return;
      const p = this.project(s.x, 2.7, s.y);
      if (!p) return;
      vis.add(i);
      if (!s.lbl) {
        s.lbl = document.createElement('div');
        s.lbl.className = 'lbl';
        s.lbl.innerHTML = `<i style="background:${pcol(pl.c)}"></i>${esc(pl.n)}`;
        this.el.lbls.appendChild(s.lbl);
      }
      LB.push({ o: s, x: p[0], y: p[1], op: pl.on ? 1 : 0.5 });
    });
    placeLabels(LB, clamp(1.25 - this.cam.D / 60, 0.7, 1.0));
    this.bod.forEach((s, i) => { if (s.lbl && !vis.has(i)) s.lbl.style.display = 'none'; });
  }

  /* ---------- ağ ---------- */
  net() {
    const v = this.view;
    if (!v || v.phase !== 'play' || !this.mine || this.simNow() < 0) return;
    const [x, y] = this.inputVec();
    const nx = Math.round(x * 100) / 100, ny = Math.round(y * 100) / 100;
    const now = performance.now();
    const moving = nx !== 0 || ny !== 0;
    const changed = Math.abs(nx - this.sx) > 0.04 || Math.abs(ny - this.sy) > 0.04 || (!moving && (this.sx !== 0 || this.sy !== 0));
    if (!(changed && now - this.lastSend >= 55) && !(moving && now - this.lastSend >= 450)) return;
    this.lastSend = now;
    this.sx = nx; this.sy = ny;
    try {
      if (this.ctx.sendQuiet) this.ctx.sendQuiet('input', { x: nx, y: ny });
      else this.ctx.send('input', { x: nx, y: ny });
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
      if (this.snd) { const vv = this.view; this.snd.int = vv && vv.phase === 'play' && vv.endsAt ? clamp(1 - (vv.endsAt - sNow) / 40000, 0, 1) : 0; }
      this.stepMine();
      this.sampleOthers();
      this.stepParts(dt);
      this.stepCam(dt);
      this.net();
      this.dtDraw = dt;
      this.draw();
      this.labels();
      this.hud(sNow);
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[mutfak]', e); }
    }
  }

  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.meshes = {};
      this.avM = null;
      this.W = null;
      if (this.lv) this.buildWorld();
    } catch (e) { console.warn('[mutfak] geri yükleme', e); }
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
        Object.values(this.meshes || {}).forEach((mm) => freeMesh(this.X, mm));
        this.freeAv();
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
    console.error('[mutfak]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

// Test ve hata ayıklama için (oyunda kullanılmaz)
export const _dbg = () => ({ G, KK });
// Model görüntüleyici için (oyunda kullanılmaz)
export const _mdl = () => ({});
