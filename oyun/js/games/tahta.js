// Masa oyunları — Satranç, Tavla, Okey ve 101 Okey (NFC Dünyası Oyun)
// Kurallar sunucuyla ortak (GEN blokları): istemci hamleleri önceden gösterir, sunucu yine de her hamleyi denetler.
import * as sfx from '../sfx.js?v=2026-11-21-c';

// ==GEN== (w/sc_gen.js'ten kopyalanır: sunucu ve istemcide aynı satranç kuralları)
// Tahta: 64 kare, 0 = a8 … 63 = h1. Taşlar: beyaz 'PNBRQK', siyah 'pnbrqk', boş ''.
const SC_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function scFen(fen) {
  const [bd, t, c, ep, h, n] = fen.split(' ');
  const b = [];
  for (const ch of bd) { if (ch === '/') continue; if (ch >= '1' && ch <= '8') for (let k = 0; k < +ch; k++) b.push(''); else b.push(ch); }
  return { b, t, c: c === '-' ? '' : c, ep: ep === '-' ? -1 : (8 - +ep[1]) * 8 + (ep.charCodeAt(0) - 97), h: +h || 0, n: +n || 1 };
}
const scW = (p) => p !== '' && p < 'a';
const scSide = (p) => (p === '' ? '' : p < 'a' ? 'w' : 'b');
const SC_N = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SC_K = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const SC_B = [[-1, -1], [-1, 1], [1, -1], [1, 1]], SC_R = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// kare, 'by' tarafınca tehdit ediliyor mu?
function scAtt(b, sq, by) {
  const r = sq >> 3, c = sq & 7, w = by === 'w';
  const pr = r + (w ? 1 : -1);
  if (pr >= 0 && pr < 8) for (const dc of [-1, 1]) { const cc = c + dc; if (cc >= 0 && cc < 8 && b[pr * 8 + cc] === (w ? 'P' : 'p')) return true; }
  for (const [dr, dc] of SC_N) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (w ? 'N' : 'n')) return true; }
  for (const [dr, dc] of SC_K) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (w ? 'K' : 'k')) return true; }
  for (const [D, a, q] of [[SC_B, w ? 'B' : 'b', w ? 'Q' : 'q'], [SC_R, w ? 'R' : 'r', w ? 'Q' : 'q']]) for (const [dr, dc] of D) {
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (p === a || p === q) return true; break; } rr += dr; cc += dc; }
  }
  return false;
}
function scKing(b, side) { return b.indexOf(side === 'w' ? 'K' : 'k'); }
function scCheck(st) { return scAtt(st.b, scKing(st.b, st.t), st.t === 'w' ? 'b' : 'w'); }
function scApply(st, m) {
  const b = st.b.slice(), p = b[m.f], w = st.t === 'w', cap = b[m.t];
  let c = st.c, ep = -1;
  b[m.f] = '';
  if ((p === 'P' || p === 'p') && m.t === st.ep && !cap) b[m.t + (w ? 8 : -8)] = '';          // geçerken alma
  b[m.t] = m.p ? (w ? m.p.toUpperCase() : m.p.toLowerCase()) : p;
  if ((p === 'P' || p === 'p') && Math.abs(m.t - m.f) === 16) ep = (m.f + m.t) >> 1;
  if (p === 'K' || p === 'k') {
    if (m.t - m.f === 2) { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = ''; }                          // kısa rok
    if (m.f - m.t === 2) { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = ''; }                          // uzun rok
    c = c.replace(w ? /[KQ]/g : /[kq]/g, '');
  }
  for (const [sq, fl] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.f === sq || m.t === sq) c = c.replace(fl, '');
  return { b, t: w ? 'b' : 'w', c, ep, h: p === 'P' || p === 'p' || cap ? 0 : st.h + 1, n: st.n + (w ? 0 : 1) };
}
// sözde-yasal hamleler (şah güvenliği sonra süzülür)
function scPseudo(st) {
  const { b, t } = st, w = t === 'w', L = [];
  for (let f = 0; f < 64; f++) {
    const p = b[f];
    if (!p || scW(p) !== w) continue;
    const r = f >> 3, c = f & 7, k = p.toUpperCase();
    if (k === 'P') {
      const d = w ? -1 : 1, r1 = r + d;
      if (r1 < 0 || r1 > 7) continue;
      const add = (to) => { if (r1 === (w ? 0 : 7)) for (const q of 'qrbn') L.push({ f, t: to, p: q }); else L.push({ f, t: to }); };
      if (!b[r1 * 8 + c]) { add(r1 * 8 + c); if (r === (w ? 6 : 1) && !b[(r + 2 * d) * 8 + c]) L.push({ f, t: (r + 2 * d) * 8 + c }); }
      for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc > 7) continue; const to = r1 * 8 + cc, q = b[to]; if ((q && scW(q) !== w) || to === st.ep) add(to); }
    } else if (k === 'N' || k === 'K') {
      for (const [dr, dc] of k === 'N' ? SC_N : SC_K) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const q = b[rr * 8 + cc]; if (!q || scW(q) !== w) L.push({ f, t: rr * 8 + cc }); }
      if (k === 'K' && f === (w ? 60 : 4)) {
        const o = w ? 'b' : 'w';
        if (st.c.includes(w ? 'K' : 'k') && !b[f + 1] && !b[f + 2] && b[f + 3] === (w ? 'R' : 'r') && !scAtt(b, f, o) && !scAtt(b, f + 1, o) && !scAtt(b, f + 2, o)) L.push({ f, t: f + 2 });
        if (st.c.includes(w ? 'Q' : 'q') && !b[f - 1] && !b[f - 2] && !b[f - 3] && b[f - 4] === (w ? 'R' : 'r') && !scAtt(b, f, o) && !scAtt(b, f - 1, o) && !scAtt(b, f - 2, o)) L.push({ f, t: f - 2 });
      }
    } else {
      for (const [dr, dc] of k === 'B' ? SC_B : k === 'R' ? SC_R : SC_K) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const q = b[rr * 8 + cc]; if (!q) L.push({ f, t: rr * 8 + cc }); else { if (scW(q) !== w) L.push({ f, t: rr * 8 + cc }); break; } rr += dr; cc += dc; }
      }
    }
  }
  return L;
}
function scMoves(st) {
  const o = st.t === 'w' ? 'b' : 'w';
  return scPseudo(st).filter((m) => { const n = scApply(st, m); return !scAtt(n.b, scKing(n.b, st.t), o); });
}
const scKey = (st) => st.b.map((p) => p || '.').join('') + st.t + st.c + (st.ep >= 0 ? st.ep : '');
function scDead(b) {
  // yetersiz malzeme: şah-şah, tek at ya da tek fil, aynı renk karede filler
  const L = [];
  for (let i = 0; i < 64; i++) { const p = b[i]; if (p && p !== 'K' && p !== 'k') L.push([p.toUpperCase(), ((i >> 3) + (i & 7)) & 1]); }
  if (!L.length) return true;
  if (L.length === 1) return L[0][0] === 'N' || L[0][0] === 'B';
  return L.every((x) => x[0] === 'B' && x[1] === L[0][1]);
}
const scSq = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
// cebirsel gösterim (Türkçe taş harfleri: Ş V K F A)
function scSan(st, m, legal) {
  const p = st.b[m.f], k = p.toUpperCase(), cap = !!st.b[m.t] || (k === 'P' && m.t === st.ep);
  const TR = { K: 'Ş', Q: 'V', R: 'K', B: 'F', N: 'A' };
  let s;
  if (k === 'K' && Math.abs(m.t - m.f) === 2) s = m.t > m.f ? 'O-O' : 'O-O-O';
  else if (k === 'P') s = (cap ? 'abcdefgh'[m.f & 7] + 'x' : '') + scSq(m.t) + (m.p ? '=' + TR[m.p.toUpperCase()] : '');
  else {
    const same = legal.filter((x) => x.t === m.t && x.f !== m.f && st.b[x.f] === p);
    let dis = '';
    if (same.length) dis = same.every((x) => (x.f & 7) !== (m.f & 7)) ? 'abcdefgh'[m.f & 7] : same.every((x) => (x.f >> 3) !== (m.f >> 3)) ? String(8 - (m.f >> 3)) : scSq(m.f);
    s = TR[k] + dis + (cap ? 'x' : '') + scSq(m.t);
  }
  const n = scApply(st, m);
  if (scCheck(n)) s += scMoves(n).length ? '+' : '#';
  return s;
}
// ==/GEN==
// ==GEN== (w/tv_gen.js'ten kopyalanır: sunucu ve istemcide aynı tavla kuralları)
// Haneler 0..23. Taraf 0 (açık pullar) 23'ten 0'a yürür, evi 0..5. Taraf 1 (koyu pullar) 0'dan 23'e yürür, evi 18..23.
// p[i] > 0: taraf 0'ın pulları, p[i] < 0: taraf 1'in pulları. bar: kırık pullar, off: toplanan pullar.
function tvStart() {
  const p = new Array(24).fill(0);
  p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5;
  p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5;
  return { p, bar: [0, 0], off: [0, 0] };
}
const tvOwn = (st, side, i) => (side === 0 ? Math.max(0, st.p[i]) : Math.max(0, -st.p[i]));
function tvAllHome(st, side) {
  if (st.bar[side]) return false;
  if (side === 0) { for (let i = 6; i < 24; i++) if (st.p[i] > 0) return false; } else { for (let i = 0; i < 18; i++) if (st.p[i] < 0) return false; }
  return true;
}
// Bir zarla oynanabilecek tek adımlar: { f: kaynak hane (-1 = kırık), t: hedef hane (24 = toplama), d: zar }
function tvSteps(st, side, d) {
  const L = [], opp = (i) => (side === 0 ? -st.p[i] : st.p[i]);
  if (st.bar[side] > 0) { const t = side === 0 ? 24 - d : d - 1; if (opp(t) < 2) L.push({ f: -1, t, d }); return L; }
  const home = tvAllHome(st, side);
  for (let i = 0; i < 24; i++) {
    if (tvOwn(st, side, i) < 1) continue;
    const t = side === 0 ? i - d : i + d;
    if (t >= 0 && t < 24) { if (opp(t) < 2) L.push({ f: i, t, d }); continue; }
    if (!home) continue;
    if (side === 0 ? t === -1 : t === 24) { L.push({ f: i, t: 24, d }); continue; }
    // büyük zarla toplama: daha geride pul yoksa
    let behind = false;
    if (side === 0) { for (let j = i + 1; j < 6; j++) if (st.p[j] > 0) behind = true; } else { for (let j = 18; j < i; j++) if (st.p[j] < 0) behind = true; }
    if (!behind) L.push({ f: i, t: 24, d });
  }
  return L;
}
function tvApply(st, side, m) {
  const n = { p: st.p.slice(), bar: st.bar.slice(), off: st.off.slice() }, s = side === 0 ? 1 : -1;
  if (m.f < 0) n.bar[side] -= 1; else n.p[m.f] -= s;
  if (m.t === 24) { n.off[side] += 1; return n; }
  if (n.p[m.t] === -s) { n.p[m.t] = 0; n.bar[1 - side] += 1; }      // kırma
  n.p[m.t] += s;
  return n;
}
// Kalan zarlarla en çok kaç adım oynanabilir?
function tvMax(st, side, dice) {
  if (!dice.length) return 0;
  let best = 0;
  const seen = [];
  for (let k = 0; k < dice.length; k++) {
    const d = dice[k];
    if (seen.includes(d)) continue;
    seen.push(d);
    const rest = dice.slice(0, k).concat(dice.slice(k + 1));
    for (const m of tvSteps(st, side, d)) {
      const r = 1 + tvMax(tvApply(st, side, m), side, rest);
      if (r > best) best = r;
      if (best === dice.length) return best;
    }
  }
  return best;
}
// Kurala uygun ilk adımlar: en çok zarı oynatan dizilerin ilk adımı; tek zar oynanabiliyorsa büyük olan.
function tvLegal(st, side, dice) {
  const max = tvMax(st, side, dice);
  if (!max) return [];
  let L = [];
  const seen = [];
  for (let k = 0; k < dice.length; k++) {
    const d = dice[k];
    if (seen.includes(d)) continue;
    seen.push(d);
    const rest = dice.slice(0, k).concat(dice.slice(k + 1));
    for (const m of tvSteps(st, side, d)) if (1 + tvMax(tvApply(st, side, m), side, rest) === max) L.push(m);
  }
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) { const big = Math.max(dice[0], dice[1]); if (L.some((m) => m.d === big)) L = L.filter((m) => m.d === big); }
  return L;
}
function tvPip(st, side) {
  let s = st.bar[side] * 25;
  for (let i = 0; i < 24; i++) s += tvOwn(st, side, i) * (side === 0 ? i + 1 : 24 - i);
  return s;
}
// Oyun bitti mi? Dönen: 0 (sürüyor), 1 (tek oyun), 2 (mars: rakip hiç pul toplayamadı)
function tvWin(st, side) { return st.off[side] < 15 ? 0 : st.off[1 - side] === 0 ? 2 : 1; }
// ==/GEN==
// ==GEN== (w/ok_gen.js'ten kopyalanır: sunucu ve istemcide aynı okey kuralları)
// Taş kimliği 0..105. 0..103: renk = ⌊id/26⌋ (0 kırmızı, 1 siyah, 2 mavi, 3 sarı), sayı = id%13 + 1 (her taştan iki tane). 104, 105: sahte okey.
// okey = [renk, sayı]: göstergenin bir üstü. O taş "joker"dir; sahte okey ise okey taşının kendi değeriyle oynanır.
const okC = (id) => (id >= 104 ? -1 : Math.floor(id / 26));
const okN = (id) => (id >= 104 ? 0 : (id % 13) + 1);
const okWild = (id, ok) => id < 104 && okC(id) === ok[0] && okN(id) === ok[1];
// taşın oyundaki değeri: [renk, sayı] (joker için null)
const okFace = (id, ok) => (id >= 104 ? [ok[0], ok[1]] : okWild(id, ok) ? null : [okC(id), okN(id)]);
const okOf = (ind) => [okC(ind), (okN(ind) % 13) + 1];        // göstergeden okey
// Sıralı dizilmiş bir grup geçerli per mi? Dönen: null ya da { t: 'g' (aynı sayı) | 'r' (sıralı), val, n | (c, s), ids (küçükten büyüğe) }
function okMeld(ids, ok) {
  const m = ids.length;
  if (m < 3) return null;
  const F = ids.map((id) => okFace(id, ok)), R = F.filter(Boolean);
  if (!R.length) return null;
  let best = null;
  if (m <= 4 && R.every((f) => f[1] === R[0][1]) && new Set(R.map((f) => f[0])).size === R.length) best = { t: 'g', n: R[0][1], val: R[0][1] * m, ids: ids.slice() };
  if (R.every((f) => f[0] === R[0][0])) {
    for (const rev of [false, true]) {
      const A = rev ? F.slice().reverse() : F, i0 = A.findIndex(Boolean), n0 = A[i0][1];
      for (const s of n0 === 1 ? [1 - i0, 14 - i0] : [n0 - i0]) {
        if (s < 1 || s + m - 1 > 14 || (s === 1 && m >= 14)) continue;
        if (!A.every((f, i) => !f || f[1] === s + i || (f[1] === 1 && s + i === 14))) continue;
        let val = 0;
        for (let i = 0; i < m; i++) val += s + i === 14 ? 1 : s + i;
        if (!best || val > best.val) best = { t: 'r', c: R[0][0], s, val, ids: rev ? ids.slice().reverse() : ids.slice() };
      }
    }
  }
  return best;
}
// İki taş çift mi? (aynı renk ve sayı; joker her taşla çift olur)
function okPair(a, b, ok) { const x = okFace(a, ok), y = okFace(b, ok); return !x || !y || (x[0] === y[0] && x[1] === y[1]); }
function okCount(ids, ok) {
  const cnt = [0, 1, 2, 3].map(() => new Array(15).fill(0)); let w = 0;
  for (const id of ids) { const f = okFace(id, ok); if (!f) w++; else cnt[f[0]][f[1]]++; }
  return { cnt, w };
}
// Çiftler: dönen { pairs: [[id, id]…], rest: [id…] }
function okPairs(ids, ok) {
  const by = new Map(), W = [], pairs = [], rest = [];
  for (const id of ids) { const f = okFace(id, ok); if (!f) W.push(id); else { const k = f[0] * 20 + f[1]; if (!by.has(k)) by.set(k, []); by.get(k).push(id); } }
  for (const L of by.values()) { while (L.length >= 2) pairs.push([L.pop(), L.pop()]); if (L.length) rest.push(L[0]); }
  rest.sort((a, b) => (okFace(b, ok)[1] - okFace(a, ok)[1]));
  while (W.length && rest.length) pairs.push([rest.shift(), W.pop()]);
  while (W.length >= 2) pairs.push([W.pop(), W.pop()]);
  return { pairs, rest: rest.concat(W) };
}
// Bir taşı içeren tüm per seçenekleri (cnt üzerinde); cb(öğeler) — öğe: [renk, sayı] ya da null (joker), sıralı perlerde küçükten büyüğe
function okOptions(cnt, w, c, n, cb) {
  // aynı sayı grubu
  const A = [0, 1, 2, 3].filter((x) => x !== c && cnt[x][n] > 0);
  for (let mask = 0; mask < 1 << A.length; mask++) {
    const S = A.filter((_, i) => mask & (1 << i));
    for (let k = 0; k <= w; k++) { const sz = 1 + S.length + k; if (sz < 3 || sz > 4) continue; cb([[c, n]].concat(S.map((x) => [x, n]), new Array(k).fill(null)), 'g'); }
  }
  // sıralı per
  for (const p of n === 1 ? [1, 14] : [n]) {
    for (let s = Math.max(1, p - (p === 14 ? 13 : 2)); s <= p; s++) {
      for (let e = Math.max(p, s + 2); e <= 14; e++) {
        if (s === 1 && e === 14) continue;
        const pos = [];
        let forced = 0, bad = false;
        for (let q = s; q <= e; q++) { if (q === p) continue; const nn = q === 14 ? 1 : q; const has = cnt[c][nn] - (nn === n ? 1 : 0) > 0; if (!has) forced++; pos.push([q, has]); }
        if (forced > w) { if (pos.length && !pos[pos.length - 1][1] && forced > w) { /* daha uzunu da olmaz */ } continue; }
        const opt = pos.filter((x) => x[1]).map((x) => x[0]), free = w - forced;
        const emit = (wildSet) => { const it = []; for (let q = s; q <= e; q++) { const nn = q === 14 ? 1 : q; if (q === p) it.push([c, n]); else { const o = pos.find((x) => x[0] === q); it.push(o[1] && !wildSet.includes(q) ? [c, nn] : null); } } cb(it, 'r', s); };
        emit([]);
        if (free >= 1) for (let i = 0; i < opt.length; i++) { emit([opt[i]]); if (free >= 2) for (let j = i + 1; j < opt.length; j++) emit([opt[i], opt[j]]); }
        void bad;
      }
    }
  }
}
function okFirst(cnt) { for (let n = 1; n <= 13; n++) for (let c = 0; c < 4; c++) if (cnt[c][n] > 0) return [c, n]; return null; }
function okTake(cnt, it, d) { let w = 0; for (const x of it) { if (!x) w++; else cnt[x[0]][x[1]] -= d; } return w * d; }
// El tamamen perlere ayrılabiliyor mu? (düz okeyde bitiş: 14 taş)
function okAll(cnt, w) {
  const f = okFirst(cnt);
  if (!f) return w === 0;
  let ok = false;
  okOptions(cnt, w, f[0], f[1], (it) => {
    if (ok) return;
    const used = okTake(cnt, it, 1);
    if (cnt.every((r) => r.every((x) => x >= 0)) && okAll(cnt, w - used)) ok = true;
    okTake(cnt, it, -1);
  });
  return ok;
}
// 14 taşla bitiş: 0 (bitmez), 1 (per), 2 (yedi çift)
function okWin(ids, ok) {
  if (ids.length !== 14) return 0;
  if (okPairs(ids, ok).pairs.length === 7) return 2;
  const { cnt, w } = okCount(ids, ok);
  return okAll(cnt, w) ? 1 : 0;
}
// En iyi dizilim: mode 's' en yüksek toplam (101 açılışı), 'c' en çok taş. Dönen { val, melds: [öğeler…] }
function okBestRaw(cnt, w, mode) {
  const memo = new Map();
  let nodes = 0;
  const rec = (w) => {
    const f = okFirst(cnt);
    if (!f) return { v: 0, m: null };
    const key = cnt[0].join('') + cnt[1].join('') + cnt[2].join('') + cnt[3].join('') + w;
    const hit = memo.get(key);
    if (hit) return hit;
    nodes++;
    const [c, n] = f;
    cnt[c][n]--;
    const sk = rec(w);
    cnt[c][n]++;
    let best = { v: sk.v, m: sk.m };
    if (nodes < 60000) okOptions(cnt, w, c, n, (it, t, s) => {
      const used = okTake(cnt, it, 1);
      if (cnt.every((r) => r.every((x) => x >= 0))) {
        let v = 0;
        if (mode === 'c') v = it.length; else if (t === 'g') v = n * it.length; else for (let i = 0; i < it.length; i++) v += s + i === 14 ? 1 : s + i;
        const r = rec(w - used);
        if (v + r.v > best.v) best = { v: v + r.v, m: { it, next: r.m } };
      }
      okTake(cnt, it, -1);
    });
    memo.set(key, best);
    return best;
  };
  const r = rec(w), melds = [];
  for (let x = r.m; x; x = x.next) melds.push(x.it);
  return { val: r.v, melds };
}
// Taş kimlikleriyle en iyi dizilim: { val, melds: [[id…]…], rest: [id…] }
function okBest(ids, ok, mode) {
  const { cnt, w } = okCount(ids, ok);
  const r = okBestRaw(cnt, w, mode || 's');
  const pool = ids.slice(), take = (pred) => { const i = pool.findIndex(pred); return i < 0 ? -1 : pool.splice(i, 1)[0]; };
  const melds = r.melds.map((it) => it.map((x) => (x ? -2 : -1)).map((_, i) => it[i]));
  const out = [];
  // önce gerçek taşlar (sahte okey en sona: asıl taş varsa o kullanılsın), sonra jokerler
  for (const it of melds) out.push(it.map((x) => { if (!x) return null; let id = take((t) => t < 104 && !okWild(t, ok) && okC(t) === x[0] && okN(t) === x[1]); if (id < 0) id = take((t) => t >= 104); return id; }));
  for (const L of out) for (let i = 0; i < L.length; i++) if (L[i] === null) L[i] = take((t) => okWild(t, ok));
  return { val: r.val, melds: out, rest: pool };
}
// Masadaki pere taş işleme (101). Per: { t: 'g', n, ids } | { t: 'r', c, s, ids } | { t: 'p', ids }. Dönen: yeni per ya da null
function okAdd(m, id, ok) {
  const f = okFace(id, ok), len = m.ids.length;
  if (m.t === 'p') return null;
  if (m.t === 'g') {
    if (len >= 4) return null;
    if (f) { if (f[1] !== m.n) return null; for (const x of m.ids) { const g = okFace(x, ok); if (g && g[0] === f[0]) return null; } }
    return Object.assign({}, m, { ids: m.ids.concat([id]) });
  }
  const e = m.s + len - 1;
  const hi = e < 14 && !(m.s === 1 && e === 13), lo = m.s > 1 && !(e === 14 && m.s === 2);
  const up = () => Object.assign({}, m, { ids: m.ids.concat([id]) }), down = () => Object.assign({}, m, { s: m.s - 1, ids: [id].concat(m.ids) });
  if (!f) return hi ? up() : lo ? down() : null;
  if (f[0] !== m.c) return null;
  if (hi && (f[1] === e + 1 || (f[1] === 1 && e === 13))) return up();
  if (lo && f[1] === m.s - 1) return down();
  return null;
}
// Perdeki okeyi, yerine geçtiği gerçek taşla değiştirme. Dönen: { m: yeni per, wild: alınan okey } ya da null
function okSwap(m, id, ok) {
  const f = okFace(id, ok);
  if (!f || m.t === 'p') return null;
  for (let i = 0; i < m.ids.length; i++) {
    if (!okWild(m.ids[i], ok)) continue;
    if (m.t === 'g') { if (f[1] !== m.n || m.ids.some((x) => { const g = okFace(x, ok); return g && g[0] === f[0]; })) return null; }
    else { const pos = m.s + i; if (f[0] !== m.c || f[1] !== (pos === 14 ? 1 : pos)) continue; }
    const ids = m.ids.slice(); ids[i] = id;
    return { m: Object.assign({}, m, { ids }), wild: m.ids[i] };
  }
  return null;
}
// Taşın ceza değeri (101): okey 101, sahte okey okeyin sayısı
const okPen = (id, ok) => (okWild(id, ok) ? 101 : id >= 104 ? ok[1] : okN(id));
// ==/GEN==

const thEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thFace = (c) => { try { return window.__pb && window.__pb.buddy ? window.__pb.buddy(c | 0, 'th-face') : ''; } catch { return ''; } };
const TH_CSS = [];
TH_CSS.push(`
.th { --ink: rgb(var(--c-murekkep,18 14 34)); --paper: rgb(var(--c-ortu,255 246 233)); --pop: rgb(var(--c-limon,255 210 63)); --deep: rgb(var(--c-morarti,78 44 200)); position: relative; color: var(--paper); font-weight: 600; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.th *, .th *::before, .th *::after { box-sizing: border-box; }
.th-face { width: 100%; height: 100%; display: block; }
.th-av { width: 38px; height: 38px; flex: none; border-radius: 999px; background: var(--paper); border: 3px solid var(--ink); overflow: hidden; position: relative; }
.th-card { background: var(--paper); color: var(--ink); border: 4px solid var(--ink); border-radius: 22px; box-shadow: 5px 5px 0 0 var(--ink); padding: 14px; }
.th-h { font-size: 20px; font-weight: 800; line-height: 1.15; margin: 0 0 4px; }
.th-sub { font-size: 13px; line-height: 1.4; opacity: .8; margin: 0; }
.th-seats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.th-seat { display: flex; align-items: center; gap: 8px; min-height: 58px; padding: 8px 10px; border: 3px solid var(--ink); border-radius: 16px; background: #fff; color: var(--ink); text-align: left; font: inherit; font-weight: 700; cursor: pointer; min-width: 0; }
.th-seat.empty { border-style: dashed; background: transparent; }
.th-seat.me { background: var(--pop); }
.th-seat small { display: block; font-size: 11px; font-weight: 700; opacity: .65; text-transform: uppercase; letter-spacing: .04em; }
.th-seat b { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.th-seat > span { min-width: 0; flex: 1; }
@media (max-width: 380px) { .th-seat { padding: 7px 8px; gap: 6px; } .th-seat .th-av { width: 30px; height: 30px; border-width: 2px; } .th-seat b { white-space: normal; overflow-wrap: anywhere; line-height: 1.15; font-size: 13px; } .th-seat small { font-size: 10px; } }
.th-opt { margin-top: 12px; display: grid; gap: 8px; }
.th-opt .r { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.th-opt .r > span { width: 100%; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }
.th-chip { border: 3px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); font: inherit; font-weight: 800; font-size: 14px; padding: 6px 13px; cursor: pointer; }
.th-chip.on { background: var(--ink); color: var(--pop); }
.th-chip:disabled { opacity: .55; cursor: default; }
.th-btn { display: block; width: 100%; border: 4px solid var(--ink); border-radius: 18px; background: var(--pop); color: var(--ink); font: inherit; font-size: 18px; font-weight: 800; padding: 12px 16px; box-shadow: 4px 4px 0 0 var(--ink); cursor: pointer; margin-top: 12px; }
.th-btn.alt { background: #fff; font-size: 15px; padding: 9px 14px; }
.th-btn:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 0 var(--ink); }
.th-mini { border: 3px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); font: inherit; font-size: 13px; font-weight: 800; padding: 6px 12px; cursor: pointer; box-shadow: 2px 2px 0 0 var(--ink); white-space: nowrap; }
.th-mini.hot { background: var(--pop); }
.th-mini.go { background: #35c46a; color: #06260f; }
.th-mini:disabled { opacity: .45; box-shadow: none; cursor: default; }
.th-mini:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 0 0 0 0 var(--ink); }
.th-hint { font-size: 13px; text-align: center; margin: 12px 0 0; opacity: .75; }
.th-rules { margin-top: 12px; font-size: 13px; line-height: 1.45; }
.th-rules summary { font-weight: 800; cursor: pointer; }
.th-rules ul { margin: 6px 0 0; padding-left: 18px; }
.th-pl { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 16px; background: rgb(0 0 0 / .22); min-width: 0; transition: background .2s, box-shadow .2s; }
.th-pl.turn { background: var(--paper); color: var(--ink); box-shadow: 0 0 0 3px var(--pop); }
.th-pl .nm { flex: 1; min-width: 0; }
.th-pl .nm b { display: block; font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.th-pl .nm small { display: block; font-size: 12px; font-weight: 700; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 15px; }
.th-pl.off .th-av { filter: grayscale(1); opacity: .6; }
.th-clk { font-variant-numeric: tabular-nums; font-size: 18px; font-weight: 800; padding: 4px 10px; border-radius: 10px; background: rgb(0 0 0 / .28); color: #fff; min-width: 66px; text-align: center; }
.th-pl.turn .th-clk { background: var(--ink); color: var(--pop); }
.th-clk.low { background: #d7263d !important; color: #fff !important; }
.th-bar { height: 6px; border-radius: 99px; background: rgb(0 0 0 / .25); overflow: hidden; }
.th-bar i { display: block; height: 100%; width: 100%; background: var(--pop); border-radius: 99px; transform-origin: left; }
.th-msg { min-height: 22px; text-align: center; font-size: 14px; font-weight: 800; margin: 8px 0; }
.th-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
.th-toast { position: fixed; left: 50%; bottom: 22px; transform: translate(-50%, 20px); background: var(--ink); color: #fff; font-size: 14px; font-weight: 700; padding: 10px 16px; border-radius: 14px; border: 2px solid var(--pop); opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; z-index: 60; max-width: 88vw; text-align: center; }
.th-toast.on { opacity: 1; transform: translate(-50%, 0); }
.th-final { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgb(10 6 24 / .62); animation: thFade .25s both; overflow: auto; }
.th-final .th-card { width: 100%; max-width: 400px; text-align: center; animation: thPop .35s cubic-bezier(.2, 1.4, .4, 1) both; margin: auto; }
.th-final .big { font-size: 46px; line-height: 1; margin-bottom: 6px; }
.th-rank { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; text-align: left; }
.th-rank li { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 3px solid var(--ink); border-radius: 14px; background: #fff; font-weight: 800; font-size: 14px; }
.th-rank li.w { background: var(--pop); }
.th-rank li span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.th-rank li .th-av { width: 30px; height: 30px; border-width: 2px; }
.th-spec { text-align: center; font-size: 12px; font-weight: 700; opacity: .8; margin-top: 8px; }
.th-emo { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.th-emo button { width: 38px; height: 38px; border-radius: 999px; border: 2px solid rgb(255 255 255 / .35); background: rgb(0 0 0 / .25); font-size: 19px; line-height: 1; cursor: pointer; padding: 0; }
.th-emo button:active { transform: scale(.88); }
.th-fly { position: fixed; left: 50%; top: 30%; z-index: 55; pointer-events: none; display: flex; align-items: center; gap: 6px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--paper); color: var(--ink); border: 3px solid var(--ink); font-weight: 800; font-size: 14px; white-space: nowrap; animation: thFly 2.6s ease-out forwards; }
.th-fly i { font-style: normal; font-size: 26px; line-height: 1; }
@keyframes thFly { 0% { opacity: 0; transform: translate(var(--fx), 30px) scale(.6); } 12% { opacity: 1; transform: translate(var(--fx), 0) scale(1.1); } 80% { opacity: 1; transform: translate(var(--fx), -70px) scale(1); } 100% { opacity: 0; transform: translate(var(--fx), -110px) scale(.95); } }
@keyframes thFade { from { opacity: 0; } }
@keyframes thPop { from { opacity: 0; transform: scale(.85); } }
@keyframes thShake { 0%, 100% { transform: none; } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
`);

// ---- ses: tahta taşı, zar, okey taşı ----
const ThSnd = {
  kit() { try { if (sfx.isMuted && sfx.isMuted()) return null; return sfx.audioKit ? sfx.audioKit() : null; } catch { return null; } },
  knock(f = 190, g = 0.5, d = 0.07) {
    const k = this.kit(); if (!k) return;
    const c = k.ctx, t = c.currentTime;
    const o = c.createOscillator(), a = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.9, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(a); a.connect(k.bus); o.start(t); o.stop(t + d + 0.02);
    if (k.noise) { const n = c.createBufferSource(), fl = c.createBiquadFilter(), b = c.createGain(); n.buffer = k.noise; fl.type = 'bandpass'; fl.frequency.value = f * 9; fl.Q.value = 1.2; b.gain.setValueAtTime(g * 0.5, t); b.gain.exponentialRampToValueAtTime(0.001, t + 0.03); n.connect(fl); fl.connect(b); b.connect(k.bus); n.start(t); n.stop(t + 0.05); }
  },
  move() { this.knock(170, 0.5, 0.08); },
  capture() { this.knock(240, 0.55, 0.06); setTimeout(() => this.knock(130, 0.6, 0.1), 70); },
  tile() { this.knock(520, 0.32, 0.045); },
  tile2() { this.knock(390, 0.4, 0.06); },
  dice() { for (let i = 0; i < 7; i++) setTimeout(() => this.knock(600 + Math.random() * 500, 0.16 + Math.random() * 0.14, 0.03), i * 55 + Math.random() * 25); },
  play(n) { try { sfx.play && sfx.play(n); } catch { /* yok say */ } }
};
const thVib = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* yok say */ } };
const thTime = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// oyuncu şeridi
function thPlayer(seat, cls = '') {
  return `<div class="th-pl ${cls}"><div class="th-av">${seat ? thFace(seat.c) : ''}</div><div class="nm"><b></b><small></small></div></div>`;
}


// ======================= Satranç =======================
TH_CSS.push(`
.sc { display: grid; gap: 8px; }
.sc-bd { position: relative; width: 100%; aspect-ratio: 1; border: 5px solid #3a2416; border-radius: 12px; box-shadow: 0 6px 0 0 #1f120a, 0 10px 22px rgb(0 0 0 / .35); overflow: hidden; touch-action: none; background: #b9825a; }
@supports not (aspect-ratio: 1) { .sc-bd::before { content: ""; display: block; padding-top: 100%; } .sc-promo button { height: 0; padding-bottom: 20%; } .ok-t i { height: 0; padding-bottom: 22%; } }
.sc-grid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); }
.sc-sq { position: relative; background: #f1e0bf; }
.sc-sq.d { background: #b9825a; }
.sc-sq.lm::before { content: ""; position: absolute; inset: 0; background: rgb(255 214 64 / .5); }
.sc-sq.sel::before { content: ""; position: absolute; inset: 0; background: rgb(64 196 120 / .6); }
.sc-sq.chk::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle, rgb(230 30 40 / .95) 0%, rgb(230 30 40 / .5) 45%, transparent 75%); }
.sc-sq.tg::after { content: ""; position: absolute; left: 34%; top: 34%; width: 32%; height: 32%; border-radius: 50%; background: rgb(20 60 30 / .38); }
.sc-sq.tc::after { content: ""; position: absolute; inset: 5%; border-radius: 50%; border: 5px solid rgb(20 60 30 / .42); }
.sc-sq i { position: absolute; font-style: normal; font-size: 9.5px; font-weight: 800; opacity: .7; color: #6b4526; line-height: 1; }
.sc-sq.d i { color: #f6e7c8; }
.sc-sq i.f { right: 3px; bottom: 2px; }
.sc-sq i.r { left: 3px; top: 2px; }
.sc-layer { position: absolute; inset: 0; pointer-events: none; }
.sc-p { position: absolute; left: 0; top: 0; width: 12.5%; height: 12.5%; transition: transform .2s cubic-bezier(.3, .9, .4, 1), opacity .18s; will-change: transform; }
.sc-p svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 2px 1.5px rgb(0 0 0 / .35)); }
.sc-p.drag { transition: none; z-index: 5; }
.sc-p.drag svg { transform: scale(1.25); filter: drop-shadow(0 7px 5px rgb(0 0 0 / .4)); }
.sc-p.gone { opacity: 0; }
.sc-promo { position: absolute; inset: 0; background: rgb(20 12 6 / .6); display: flex; align-items: center; justify-content: center; gap: 8px; z-index: 8; }
.sc-promo button { width: 20%; aspect-ratio: 1; border: 4px solid #1f120a; border-radius: 16px; background: #f6ead0; padding: 2px; cursor: pointer; box-shadow: 3px 3px 0 0 #1f120a; }
.sc-promo button svg { width: 100%; height: 100%; }
.sc-moves { display: flex; gap: 4px; overflow-x: auto; padding: 6px 8px; border-radius: 12px; background: rgb(0 0 0 / .22); font-size: 13px; font-weight: 700; white-space: nowrap; min-height: 32px; scrollbar-width: none; font-variant-numeric: tabular-nums; }
.sc-moves::-webkit-scrollbar { display: none; }
.sc-moves span { opacity: .6; margin-left: 4px; }
.sc-moves b { font-weight: 800; padding: 0 3px; border-radius: 5px; }
.sc-moves b:last-child { background: var(--pop); color: var(--ink); }
.sc-cap { font-size: 15px; letter-spacing: -1px; line-height: 1; }
`);
const SC_SHAPE = {
  P: '<circle cx="22.5" cy="12.5" r="5.6"/><path d="M22.5 18.5c-5.2 0-8.3 4.8-8.3 9.8 0 3 1.6 5.2 3.7 6.7h-4.4a3 3 0 0 0-3 3V39.5h24V38a3 3 0 0 0-3-3h-4.4c2.1-1.5 3.7-3.700 3.700-6.700 0-5-3.100-9.800-8.300-9.800z"/>',
  R: '<path d="M11 9.500h5v3.500h4V9.500h5v3.500h4V9.500h5V19l-3 2.500v9.500l2.500 3H11.500l2.500-3v-9.500L11 19z"/><path d="M9.500 34h26v5.500h-26z"/><path d="M14 21.500h17M14 31h17" fill="none"/>',
  N: '<path d="M13.500 39.500h22c.500-11-1-20.500-9-27l-.500-5-4.200 3.200C15.500 12 9.500 19 8.500 25.500c-.300 2.300 1.300 4.200 3.600 4.200 3 0 4.900-2.700 8.400-3.700-2.300 4.300-7.500 6.500-7 13.500z"/><circle cx="18.500" cy="18.500" r="1.500" class="e"/><path d="M26.500 13.500c4.500 5 5.500 11.500 5.500 19" fill="none" class="l"/>',
  B: '<circle cx="22.5" cy="7.500" r="2.800"/><path d="M22.5 10.500c-6 5-8.800 9.200-8.800 13.800 0 3.600 2 6.200 4.600 7.700h8.400c2.600-1.500 4.600-4.100 4.600-7.700 0-4.600-2.800-8.800-8.800-13.800z"/><path d="M10 39.500v-1.500c0-2.300 2-4 4.300-4h16.400c2.300 0 4.300 1.700 4.300 4v1.500z"/><path d="M19.500 18.500l6 6M17.500 32h10" fill="none" class="l"/>',
  Q: '<path d="M8 15l4.500 15h20L37 15l-6.500 7.500-3-11.500-5 10.500-5-10.500-3 11.500z"/><circle cx="8" cy="13.500" r="2.600"/><circle cx="17.500" cy="9.500" r="2.600"/><circle cx="27.500" cy="9.500" r="2.600"/><circle cx="37" cy="13.500" r="2.600"/><circle cx="22.5" cy="7" r="0" /><path d="M12.500 30h20v4.500h-20z"/><path d="M10 39.500V38c0-2 1.600-3.500 3.600-3.500h17.800c2 0 3.600 1.500 3.600 3.500v1.500z"/>',
  K: '<path d="M20.800 3.500h3.400v3.300h3.400v3.200h-3.400V14h-3.400v-4h-3.400V6.800h3.400z"/><path d="M22.5 14c-3.600 0-5.600 2.700-5.600 5.500 0 1.800.800 3.300 1.900 4.500C13.500 20.500 7 22.500 7 28.500c0 3.500 3.300 5.200 5.500 6h20c2.200-.800 5.500-2.500 5.500-6 0-6-6.500-8-11.800-4.500 1.100-1.200 1.900-2.700 1.900-4.500 0-2.800-2-5.500-5.600-5.500z"/><path d="M10 39.500V38c0-2 1.600-3.500 3.600-3.500h17.800c2 0 3.600 1.500 3.600 3.500v1.500z"/><path d="M22.5 24v10" fill="none" class="l"/>'
};
function scSvg(p) {
  const w = p < 'a', k = p.toUpperCase();
  const fill = w ? '#fff8ea' : '#33303b', ink = w ? '#2a2018' : '#0c0b10', line = w ? '#2a2018' : '#8c8799';
  return `<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="${fill}" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${SC_SHAPE[k].replace(/class="e"/g, `fill="${line}" stroke="none"`).replace(/class="l"/g, `stroke="${line}" stroke-width="1.5"`)}</g></svg>`;
}
const SC_GLYPH = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛' };
const SC_WHY = { mat: 'Şah mat', pat: 'Pat — oynayacak hamle yok', yetersiz: 'Mat edecek taş kalmadı', elli: '50 hamle kuralı', tekrar: 'Konum üç kez tekrarlandı', anlasma: 'Anlaşmalı beraberlik', sure: 'Süre doldu', 'sure-yetersiz': 'Süre doldu ama rakibin mat edecek taşı yok', terk: 'Terk' };
class ScView {
  constructor(el, table) {
    this.t = table; this.el = el; this.flip = null; this.pcs = new Map(); this.st = null; this.ply = -1; this.sel = -1; this.legal = []; this.pend = 0; this.drag = null; this.resignAt = 0; this.last = null;
    el.innerHTML = `<div class="sc"><div class="sc-top"></div><div class="sc-bd"><div class="sc-grid"></div><div class="sc-layer"></div></div><div class="sc-bot"></div><div class="th-msg"></div><div class="sc-moves"></div><div class="th-row sc-btns"></div><div class="th-spec"></div></div>`;
    this.bd = el.querySelector('.sc-bd'); this.grid = el.querySelector('.sc-grid'); this.layer = el.querySelector('.sc-layer');
    this.bd.addEventListener('pointerdown', (e) => this.down(e));
    this.bd.addEventListener('pointermove', (e) => this.moveEv(e));
    this.bd.addEventListener('pointerup', (e) => this.up(e));
    this.bd.addEventListener('pointercancel', () => { if (this.drag) { this.place(this.drag.pc, this.drag.sq); this.drag.pc.el.classList.remove('drag'); this.drag = null; } });
    el.querySelector('.sc-btns').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sc]');
      if (!b) return;
      if (b.dataset.sc === 'resign') { if (performance.now() - this.resignAt < 3500) { this.resignAt = 0; this.t.ctx.send('resign'); } else { this.resignAt = performance.now(); this.buttons(); setTimeout(() => this.buttons(), 3600); } }
    });
    this.tick = setInterval(() => this.clocks(), 250);
  }
  dispose() { clearInterval(this.tick); }
  xy(sq) { const c = sq & 7, r = sq >> 3; return this.flip ? [7 - c, 7 - r] : [c, r]; }
  place(pc, sq) { const [x, y] = this.xy(sq); pc.el.style.transform = `translate(${x * 100}%, ${y * 100}%)`; }
  build() {
    let h = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = this.flip ? (7 - y) * 8 + (7 - x) : y * 8 + x;
      h += `<div class="sc-sq ${((sq >> 3) + (sq & 7)) & 1 ? 'd' : ''}" data-sq="${sq}">${y === 7 ? `<i class="f">${'abcdefgh'[sq & 7]}</i>` : ''}${x === 0 ? `<i class="r">${8 - (sq >> 3)}</i>` : ''}</div>`;
    }
    this.grid.innerHTML = h;
    this.sqs = []; this.grid.querySelectorAll('.sc-sq').forEach((d) => { this.sqs[+d.dataset.sq] = d; });
    for (const [sq, pc] of this.pcs) this.place(pc, sq);
  }
  mk(p, sq) { const el = document.createElement('div'); el.className = 'sc-p'; el.innerHTML = scSvg(p); this.layer.appendChild(el); const pc = { el, p }; this.place(pc, sq); this.pcs.set(sq, pc); return pc; }
  rm(sq) { const pc = this.pcs.get(sq); if (!pc) return; this.pcs.delete(sq); pc.el.classList.add('gone'); setTimeout(() => pc.el.remove(), 200); }
  setState(st, last, ply) {
    const prev = this.st, step = prev && ply === this.ply + 1 && last;
    if (step && this.pcs.has(last[0])) {
      const cap = this.pcs.size;
      const mv = this.pcs.get(last[0]);
      this.pcs.delete(last[0]);
      if (this.pcs.has(last[1])) this.rm(last[1]);
      this.pcs.set(last[1], mv); this.place(mv, last[1]);
      if (mv.p.toUpperCase() === 'K' && Math.abs(last[1] - last[0]) === 2) {
        const rf = last[1] > last[0] ? last[1] + 1 : last[1] - 2, rt = last[1] > last[0] ? last[1] - 1 : last[1] + 1, rk = this.pcs.get(rf);
        if (rk) { this.pcs.delete(rf); this.pcs.set(rt, rk); this.place(rk, rt); }
      }
      let n = 0; for (const p of st.b) if (p) n++;
      if (n < cap) ThSnd.capture(); else ThSnd.move();
    }
    for (let sq = 0; sq < 64; sq++) {
      const want = st.b[sq], have = this.pcs.get(sq);
      if (have && have.p !== want) { if (want && step) { have.p = want; have.el.innerHTML = scSvg(want); continue; } this.rm(sq); }
      if (want && !this.pcs.has(sq)) this.mk(want, sq);
    }
    this.st = st; this.ply = ply; this.last = last;
    this.sel = -1;
    this.marks();
  }
  myTurn() { const v = this.t.ctx.view; return v.phase === 'play' && v.me >= 0 && this.st && (this.st.t === 'w' ? 0 : 1) === v.me && !this.pend; }
  marks() {
    if (!this.sqs) return;
    const tg = new Map();
    if (this.sel >= 0) for (const m of this.legal) if (m.f === this.sel) tg.set(m.t, this.st.b[m.t] || (this.st.b[m.f].toUpperCase() === 'P' && m.t === this.st.ep) ? 'tc' : 'tg');
    const k = this.st && scCheck(this.st) ? scKing(this.st.b, this.st.t) : -1;
    for (let sq = 0; sq < 64; sq++) {
      const d = this.sqs[sq];
      d.className = 'sc-sq' + (((sq >> 3) + (sq & 7)) & 1 ? ' d' : '') + (this.last && (this.last[0] === sq || this.last[1] === sq) ? ' lm' : '') + (sq === this.sel ? ' sel' : '') + (sq === k ? ' chk' : '') + (tg.has(sq) ? ' ' + tg.get(sq) : '');
    }
  }
  sqAt(e) { const r = this.bd.getBoundingClientRect(), b = this.bd.clientLeft; const x = Math.floor(((e.clientX - r.left - b) / (r.width - 2 * b)) * 8), y = Math.floor(((e.clientY - r.top - b) / (r.height - 2 * b)) * 8); if (x < 0 || x > 7 || y < 0 || y > 7) return -1; return this.flip ? (7 - y) * 8 + (7 - x) : y * 8 + x; }
  down(e) {
    if (this.promo) return;
    const sq = this.sqAt(e);
    if (sq < 0 || !this.st) return;
    if (!this.myTurn()) return;
    if (this.sel >= 0 && this.legal.some((m) => m.f === this.sel && m.t === sq)) { this.tryMove(this.sel, sq); return; }
    const p = this.st.b[sq];
    if (p && scSide(p) === this.st.t) {
      this.sel = sq; this.marks();
      const pc = this.pcs.get(sq);
      if (pc) { this.drag = { sq, pc, x: e.clientX, y: e.clientY, on: false, id: e.pointerId }; try { this.bd.setPointerCapture(e.pointerId); } catch { /* yok say */ } }
    } else { this.sel = -1; this.marks(); }
  }
  moveEv(e) {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    if (!d.on && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 7) return;
    d.on = true;
    d.pc.el.classList.add('drag');
    const r = this.bd.getBoundingClientRect(), b = this.bd.clientLeft, s = (r.width - 2 * b) / 8;
    d.pc.el.style.transform = `translate(${e.clientX - r.left - b - s / 2}px, ${e.clientY - r.top - b - s * 0.75}px)`;
  }
  up(e) {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    d.pc.el.classList.remove('drag');
    if (!d.on) return;
    const sq = this.sqAt(e);
    if (sq >= 0 && this.legal.some((m) => m.f === d.sq && m.t === sq)) { this.place(d.pc, d.sq); d.pc.el.style.transition = 'none'; this.place(d.pc, sq); requestAnimationFrame(() => { d.pc.el.style.transition = ''; }); this.tryMove(d.sq, sq, true); }
    else this.place(d.pc, d.sq);
  }
  tryMove(f, t) {
    const L = this.legal.filter((m) => m.f === f && m.t === t);
    if (!L.length) return;
    if (L.length === 1) { this.doMove(L[0]); return; }
    const w = this.st.t === 'w';
    const box = document.createElement('div');
    box.className = 'sc-promo';
    box.innerHTML = 'qrbn'.split('').map((k) => `<button data-p="${k}" aria-label="Terfi">${scSvg(w ? k.toUpperCase() : k)}</button>`).join('');
    box.addEventListener('pointerdown', (e) => { e.stopPropagation(); const b = e.target.closest('[data-p]'); box.remove(); this.promo = null; if (b) this.doMove(L.find((m) => m.p === b.dataset.p)); else { this.sel = -1; this.marks(); } });
    this.bd.appendChild(box); this.promo = box;
  }
  doMove(m) {
    const st = scApply(this.st, m);
    this.pend = this.ply + 1; this.pendAt = performance.now();
    this.setState(st, [m.f, m.t], this.ply + 1);
    this.legal = [];
    this.t.ctx.send('mv', { f: m.f, t: m.t, p: m.p || '' });
    thVib(8);
  }
  clocks() {
    const ctx = this.t.ctx, v = ctx && ctx.view;
    if (!v || !this.bars) return;
    for (const [i, bar] of this.bars) {
      const c = bar.querySelector('.th-clk');
      if (!v.time) { if (c) c.hidden = true; continue; }
      const run = v.phase === 'play' && (v.t === 'w' ? 0 : 1) === i;
      const ms = v.clk[i] - (run ? Math.max(0, ctx.serverNow() - v.turnAt) : 0);
      c.hidden = false; c.textContent = thTime(ms); c.classList.toggle('low', ms < 20000);
      if (run && ms < 10000 && ms > 0 && v.me === i) { const s = Math.ceil(ms / 1000); if (s !== this.lastTick) { this.lastTick = s; ThSnd.play('tick'); } }
    }
  }
  buttons() {
    const v = this.t.ctx.view, el = this.el.querySelector('.sc-btns');
    if (v.me < 0 || v.phase !== 'play') { el.innerHTML = ''; return; }
    const sure = performance.now() - this.resignAt < 3500;
    let h = '';
    if (v.offer === 1 - v.me) h += `<button class="th-mini go" data-game-action="draw">Beraberliği kabul et</button><button class="th-mini" data-game-action="nodraw">Reddet</button>`;
    else h += `<button class="th-mini" data-game-action="draw" ${v.offer === v.me || v.ply < 2 ? 'disabled' : ''}>${v.offer === v.me ? 'Teklif gönderildi…' : '½ Beraberlik teklif et'}</button>`;
    h += `<button class="th-mini ${sure ? 'hot' : ''}" data-sc="resign">${sure ? 'Emin misin? Evet, terk et' : '🏳 Terk et'}</button>`;
    if (el.dataset.k !== h) { el.dataset.k = h; el.innerHTML = h; }
  }
  update(ctx) {
    const v = ctx.view, flip = v.me === 1;
    if (flip !== this.flip) { this.flip = flip; this.build(); }
    const top = flip ? 0 : 1, bot = 1 - top;
    const key = v.seats.map((s) => s.id + s.n + s.c + s.on).join('|') + flip;
    if (key !== this.barKey) {
      this.barKey = key;
      this.el.querySelector('.sc-top').innerHTML = thPlayer(v.seats[top]).replace('</div></div>', '</div><div class="th-clk"></div></div>');
      this.el.querySelector('.sc-bot').innerHTML = thPlayer(v.seats[bot]).replace('</div></div>', '</div><div class="th-clk"></div></div>');
      this.bars = [[top, this.el.querySelector('.sc-top .th-pl')], [bot, this.el.querySelector('.sc-bot .th-pl')]];
    }
    const stale = this.pend && v.ply < this.pend && performance.now() - this.pendAt < 3000;
    if (!stale) {
      const st = { b: v.b.split('').map((c) => (c === '.' ? '' : c)), t: v.t, c: v.cs, ep: v.ep, h: v.hm, n: v.fm };
      const same = this.st && this.ply === v.ply && this.st.b.join() === st.b.join();
      this.pend = 0;
      if (!same) this.setState(st, v.last, v.ply); else { this.st = st; }
      this.legal = this.myTurn() ? scMoves(this.st) : [];
      if (!same) this.marks();
    }
    // şeritler: ad, alınan taşlar
    const cnt = {}; for (const p of this.st.b) if (p) cnt[p] = (cnt[p] || 0) + 1;
    const lost = (w) => { let s = '', val = 0; for (const [k, n0] of [['Q', 1], ['R', 2], ['B', 2], ['N', 2], ['P', 8]]) { const have = cnt[w ? k : k.toLowerCase()] || 0; for (let i = have; i < n0; i++) { s += SC_GLYPH[k] + '︎'; } val += (have) * (SC_VAL_C[k]); } return [s, val]; };
    const [lw, vw] = lost(true), [lb, vb] = lost(false);
    for (const [i, bar] of this.bars) {
      const s = v.seats[i], turn = v.phase === 'play' && (v.t === 'w' ? 0 : 1) === i;
      bar.classList.toggle('turn', turn); bar.classList.toggle('off', !s.on);
      bar.querySelector('b').textContent = (i === 0 ? '⚪ ' : '⚫ ') + s.n + (v.me === i ? ' (sen)' : '');
      const diff = i === 0 ? vw - vb : vb - vw;
      bar.querySelector('small').innerHTML = `<span class="sc-cap">${i === 0 ? lb : lw}</span>${diff > 0 ? ' +' + diff : ''}${s.on ? '' : ' · bağlantı koptu'}`;
    }
    this.clocks();
    // durum satırı
    const turnSeat = v.t === 'w' ? 0 : 1, msg = this.el.querySelector('.th-msg');
    let m = '';
    if (v.phase === 'play') {
      if (v.note && v.note.k === 'red' && v.offer < 0) m = 'Beraberlik teklifi reddedildi';
      else if (v.offer >= 0 && v.offer === 1 - v.me) m = `${thEsc(v.seats[v.offer].n)} beraberlik teklif ediyor`;
      else if (v.chk) m = v.me === turnSeat ? 'Şah! Şahını kurtar' : 'Şah!';
      else if (v.me === turnSeat) m = 'Sıra sende';
      else if (v.me >= 0) m = `${thEsc(v.seats[turnSeat].n)} düşünüyor…`;
      else m = `Sıra: ${turnSeat === 0 ? 'Beyaz' : 'Siyah'} (${thEsc(v.seats[turnSeat].n)})`;
    }
    msg.textContent = m;
    if (v.phase === 'play' && v.me === turnSeat && this.turnPly !== v.ply) { this.turnPly = v.ply; if (v.ply > 0) thVib(15); }
    // hamle listesi
    const ml = this.el.querySelector('.sc-moves'), start = v.ply - v.sans.length;
    const mk = v.ply + ':' + (v.sans[v.sans.length - 1] || '');
    if (mk !== this.mk) {
      this.mk = mk;
      let h = '';
      v.sans.forEach((s, k) => { const n = start + k; if (n % 2 === 0) h += `<span>${n / 2 + 1}.</span>`; h += `<b>${thEsc(s)}</b>`; });
      ml.innerHTML = h || '<span>Hamleler burada görünür</span>';
      ml.scrollLeft = ml.scrollWidth;
    }
    this.buttons();
    this.el.querySelector('.th-spec').textContent = v.me < 0 ? '👀 İzliyorsun' + (v.seats.some((s) => s.cpu) && v.phase === 'play' ? ' — bilgisayarın yerine oturmak için oyuncu şeridine dokun' : '') : '';
  }
}
const SC_VAL_C = { P: 1, N: 3, B: 3, R: 5, Q: 9 };


// ======================= Tavla =======================
TH_CSS.push(`
.tv { display: grid; gap: 8px; }
.tv-wrap { position: relative; }
.tv-svg { display: block; width: 100%; height: auto; border-radius: 14px; box-shadow: 0 6px 0 0 #2a160b, 0 10px 22px rgb(0 0 0 / .35); touch-action: manipulation; }
.tv-ck { transition: transform .26s cubic-bezier(.3, .9, .4, 1); will-change: transform; }
.tv-ck circle.o { stroke-width: 1.6; }
.tv-ck.s0 circle.o { fill: #f8eed8; stroke: #6d5536; } .tv-ck.s0 circle.i { fill: none; stroke: #c9b48a; stroke-width: 1.4; }
.tv-ck.s1 circle.o { fill: #2d2536; stroke: #0e0a14; } .tv-ck.s1 circle.i { fill: none; stroke: #6b5f7c; stroke-width: 1.4; }
.tv-ck.sel circle.o { stroke: #26d07c; stroke-width: 3.2; }
.tv-ck.can circle.o { stroke: #ffd23f; stroke-width: 2.6; }
.tv-hit { fill: transparent; cursor: pointer; }
.tv-tg { fill: rgb(38 208 124 / .42); stroke: #1aa35f; stroke-width: 1.5; pointer-events: none; animation: tvPulse 1s ease-in-out infinite alternate; }
@keyframes tvPulse { to { fill: rgb(38 208 124 / .72); } }
.tv-die rect { fill: #fffaf0; stroke: #2a160b; stroke-width: 1.6; }
.tv-die circle { fill: #2a160b; }
.tv-die.used { opacity: .35; }
.tv-die.roll { animation: tvRoll .5s ease-out; transform-box: fill-box; transform-origin: center; }
@keyframes tvRoll { 0% { transform: translateY(-26px) rotate(-200deg) scale(.6); opacity: 0; } 60% { transform: translateY(3px) rotate(14deg) scale(1.08); opacity: 1; } 100% { transform: none; } }
.tv-roll { position: absolute; right: 12%; top: 50%; transform: translateY(-50%); z-index: 3; width: auto; margin: 0; padding: 10px 18px; animation: thPop .25s both; }
.tv-off { font: 800 10px system-ui, sans-serif; fill: #f6e7c8; text-anchor: middle; }
`);
const TV_W = 364, TV_H = 420, TV_PW = 26, TV_L = 8, TV_R = 188, TV_TOP = 10, TV_BOT = 410, TV_PH = 165, TV_CR = 12;
const TV_PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
class TvView {
  constructor(el, table) {
    this.t = table; this.el = el; this.side = null; this.m = null; this.rem = []; this.sel = null; this.tg = new Map(); this.seenN = 0; this.gen = 0; this.rollN = -1; this.resignAt = 0; this.pendUntil = 0;
    el.innerHTML = `<div class="tv"><div class="tv-top"></div><div class="tv-wrap"><svg class="tv-svg" viewBox="0 0 ${TV_W} ${TV_H}" role="img" aria-label="Tavla tahtası"></svg></div><div class="th-bar"><i></i></div><div class="tv-bot"></div><div class="th-msg"></div><div class="th-row tv-btns"></div></div>`;
    this.svg = el.querySelector('svg'); this.wrap = el.querySelector('.tv-wrap');
    this.svg.addEventListener('click', (e) => { const h = e.target.closest('[data-pt]'); if (h) this.tap(+h.dataset.pt); });
    this.wrap.addEventListener('click', (e) => { if (e.target.closest('.tv-roll')) { this.t.ctx.send('roll'); thVib(10); } });
    el.querySelector('.tv-btns').addEventListener('click', (e) => {
      if (!e.target.closest('[data-tv="resign"]')) return;
      if (performance.now() - this.resignAt < 3500) { this.resignAt = 0; this.t.ctx.send('resign'); } else { this.resignAt = performance.now(); this.buttons(); setTimeout(() => this.buttons(), 3600); }
    });
    this.tick = setInterval(() => this.timer(), 200);
  }
  dispose() { clearInterval(this.tick); this.gen++; }
  // hane → ekran sütunu
  px(i) { const k = this.side === 1 ? 23 - i : i; return k < 6 ? TV_R + (5 - k) * TV_PW + 13 : k < 12 ? TV_L + (11 - k) * TV_PW + 13 : k < 18 ? TV_L + (k - 12) * TV_PW + 13 : TV_R + (k - 18) * TV_PW + 13; }
  top(i) { return (this.side === 1 ? 23 - i : i) >= 12; }
  build() {
    const tri = (i) => { const x = this.px(i), t = this.top(i), y0 = t ? TV_TOP : TV_BOT, y1 = t ? TV_TOP + TV_PH : TV_BOT - TV_PH; return `${x - 13},${y0} ${x + 13},${y0} ${x},${y1}`; };
    let h = `<defs><linearGradient id="tvw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b3f22"/><stop offset="1" stop-color="#4a2a15"/></linearGradient></defs>
      <rect width="${TV_W}" height="${TV_H}" rx="12" fill="url(#tvw)"/>
      <rect x="${TV_L}" y="${TV_TOP}" width="156" height="${TV_BOT - TV_TOP}" fill="#ecd3a2"/><rect x="${TV_R}" y="${TV_TOP}" width="156" height="${TV_BOT - TV_TOP}" fill="#ecd3a2"/>
      <rect x="346" y="${TV_TOP}" width="14" height="${TV_BOT - TV_TOP}" rx="3" fill="#3a2010"/>`;
    for (let i = 0; i < 24; i++) h += `<polygon points="${tri(i)}" fill="${(this.side === 1 ? 23 - i : i) % 2 ? '#a3391f' : '#3b3432'}" stroke="rgb(0 0 0 / .25)" stroke-width=".6"/>`;
    h += '<g class="tv-tgs"></g><g class="tv-cks"></g><g class="tv-dice"></g><text class="tv-off" x="353" y="222"></text><text class="tv-off" x="353" y="206"></text>';
    for (let i = 0; i < 24; i++) { const x = this.px(i), t = this.top(i); h += `<rect class="tv-hit" data-pt="${i}" x="${x - 13}" y="${t ? TV_TOP : TV_BOT - TV_PH - 20}" width="26" height="${TV_PH + 20}"/>`; }
    h += `<rect class="tv-hit" data-pt="-1" x="164" y="${TV_TOP}" width="24" height="${TV_BOT - TV_TOP}"/><rect class="tv-hit" data-pt="24" x="340" y="${TV_TOP}" width="24" height="${TV_BOT - TV_TOP}"/>`;
    this.svg.innerHTML = h;
    this.gT = this.svg.querySelector('.tv-tgs'); this.gC = this.svg.querySelector('.tv-cks'); this.gD = this.svg.querySelector('.tv-dice');
    this.offT = this.svg.querySelectorAll('.tv-off');
  }
  mk(side) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'tv-ck s' + side); g.innerHTML = `<circle class="o" r="${TV_CR}"/><circle class="i" r="7.5"/>`; this.gC.appendChild(g); return g; }
  rebuild(S) {
    this.gen++;
    this.gC.innerHTML = '';
    this.m = { p: S.p.slice(), bar: S.bar.slice(), off: S.off.slice() };
    this.stk = { p: Array.from({ length: 24 }, () => []), bar: [[], []], off: [[], []] };
    for (let i = 0; i < 24; i++) { const n = Math.abs(S.p[i]), sd = S.p[i] > 0 ? 0 : 1; for (let k = 0; k < n; k++) this.stk.p[i].push(this.mk(sd)); }
    for (const sd of [0, 1]) { for (let k = 0; k < S.bar[sd]; k++) this.stk.bar[sd].push(this.mk(sd)); for (let k = 0; k < S.off[sd]; k++) this.stk.off[sd].push(this.mk(sd)); }
    this.layout();
  }
  pos(kind, i, k, n) {
    // dönen: [x, y, ölçekY]
    if (kind === 'p') { const t = this.top(i), sp = n > 6 ? (TV_PH - 24) / (n - 1) : 23.5; return [this.px(i), t ? TV_TOP + TV_CR + 1 + k * sp : TV_BOT - TV_CR - 1 - k * sp, 1]; }
    const mine = i === (this.side === 1 ? 1 : 0);
    if (kind === 'bar') return [176, mine ? 250 + k * 18 : 170 - k * 18, 1];
    return [353, mine ? TV_BOT - 6 - k * 8.6 : TV_TOP + 6 + k * 8.6, 0.33, 0.55];
  }
  put(el, x, y, sy, sx = 1) { el.style.transform = `translate(${x}px, ${y}px) scale(${sx}, ${sy})`; }
  layout() {
    for (let i = 0; i < 24; i++) this.stk.p[i].forEach((el, k, L) => this.put(el, ...this.pos('p', i, k, L.length)));
    for (const sd of [0, 1]) { this.stk.bar[sd].forEach((el, k, L) => this.put(el, ...this.pos('bar', sd, k, L.length))); this.stk.off[sd].forEach((el, k, L) => this.put(el, ...this.pos('off', sd, k, L.length))); }
  }
  raise(el) { const tr = el.style.transform; this.gC.appendChild(el); el.style.transform = tr; void el.getBoundingClientRect(); }
  // adımları modele hemen, ekrana sırayla uygular
  steps(side, L) {
    const gen = this.gen;
    L.forEach(([f, t, hit], k) => {
      this.m = tvApply(this.m, side, { f, t });
      const run = () => {
        if (gen !== this.gen) return;
        if (hit && t < 24) { const o = this.stk.p[t].pop(); if (o) { this.raise(o); this.stk.bar[1 - side].push(o); } }
        const el = (f < 0 ? this.stk.bar[side] : this.stk.p[f]).pop();
        if (!el) { this.rebuild(this.m); return; }
        this.raise(el);
        (t === 24 ? this.stk.off[side] : this.stk.p[t]).push(el);
        this.layout();
        if (hit) ThSnd.capture(); else ThSnd.move();
      };
      if (k === 0) run(); else setTimeout(run, k * 250);
    });
  }
  myMove() { const v = this.t.ctx.view; return v.phase === 'play' && v.me >= 0 && v.turn === v.me && v.stage === 'move' && !v.nomove && this.rem.length > 0 && performance.now() > this.pendUntil - 1e9; }
  targets(f) {
    const res = new Map(), me = this.t.ctx.view.me, q = [{ st: this.m, rem: this.rem, at: f, seq: [] }];
    while (q.length) {
      const c = q.shift();
      for (const m of tvLegal(c.st, me, c.rem).filter((x) => x.f === c.at)) {
        const hit = m.t < 24 && tvOwn(c.st, 1 - me, m.t) === 1 ? 1 : 0, seq = c.seq.concat([[m.f, m.t, m.d, hit]]);
        if (!res.has(m.t)) res.set(m.t, seq);
        const rem = c.rem.slice(); rem.splice(rem.indexOf(m.d), 1);
        if (m.t < 24 && rem.length && seq.length < 4) q.push({ st: tvApply(c.st, me, m), rem, at: m.t, seq });
      }
    }
    return res;
  }
  tap(pt) {
    if (!this.myMove()) return;
    const me = this.t.ctx.view.me;
    setTimeout(() => { if (this.t.game === this) this.update(this.t.ctx); }, 0);
    if (this.sel !== null && this.tg.has(pt)) {
      const seq = this.tg.get(pt);
      this.sel = null; this.tg = new Map();
      this.steps(me, seq.map((s) => [s[0], s[1], s[3]]));
      for (const s of seq) this.rem.splice(this.rem.indexOf(s[2]), 1);
      this.t.ctx.send('mv', { s: seq.map((s) => [s[0], s[1], s[2]]) });
      thVib(8);
      this.marks();
      return;
    }
    const src = this.m.bar[me] > 0 ? -1 : pt;
    if (pt === 24) { this.sel = null; this.tg = new Map(); this.marks(); return; }
    const T = this.targets(src);
    if (T.size && (src === -1 || tvOwn(this.m, me, src) > 0)) { this.sel = src; this.tg = T; } else { this.sel = null; this.tg = new Map(); }
    this.marks();
  }
  marks() {
    const v = this.t.ctx.view, me = v.me;
    this.svg.querySelectorAll('.tv-ck.sel, .tv-ck.can').forEach((e) => e.classList.remove('sel', 'can'));
    let h = '';
    if (this.myMove()) {
      const L = tvLegal(this.m, me, this.rem);
      for (const f of new Set(L.map((m) => m.f))) { const st = f < 0 ? this.stk.bar[me] : this.stk.p[f]; const el = st[st.length - 1]; if (el) el.classList.add(f === this.sel ? 'sel' : 'can'); }
      for (const pt of this.tg.keys()) {
        if (pt === 24) h += `<rect class="tv-tg" x="344" y="${TV_TOP}" width="18" height="${TV_BOT - TV_TOP}" rx="4"/>`;
        else { const x = this.px(pt), t = this.top(pt), y0 = t ? TV_TOP : TV_BOT, y1 = t ? TV_TOP + TV_PH : TV_BOT - TV_PH; h += `<polygon class="tv-tg" points="${x - 13},${y0} ${x + 13},${y0} ${x},${y1}"/>`; }
      }
    }
    this.gT.innerHTML = h;
  }
  die(n, x, y, cls) { return `<g class="tv-die ${cls}" transform="translate(${x} ${y})"><rect x="-15" y="-15" width="30" height="30" rx="7"/>${(TV_PIPS[n] || []).map(([a, b]) => `<circle cx="${a * 8}" cy="${b * 8}" r="3"/>`).join('')}</g>`; }
  dice(v) {
    const roll = v.rollN !== this.rollN ? 'roll' : '';
    let h = '';
    const mine = (sd) => sd === (this.side === 1 ? 1 : 0);
    if (v.stage === 'open') { if (v.od[0]) { h += this.die(v.od[0], mine(0) ? 266 : 86, 210, roll) + this.die(v.od[1], mine(1) ? 266 : 86, 210, roll); } }
    else if (v.dice && v.dice.length) {
      const cx = mine(v.turn) ? 266 : 86, dbl = v.dice[0] === v.dice[1];
      const rem = this.t.ctx.view.me === v.turn && this.rem ? this.rem : v.rem;
      if (dbl) { const used = 4 - rem.length; for (let k = 0; k < 4; k++) h += this.die(v.dice[0], cx - 51 + k * 34, 210, (k < used ? 'used ' : '') + roll); }
      else { const r = rem.slice(); v.dice.forEach((d, k) => { const i = r.indexOf(d); if (i >= 0) r.splice(i, 1); h += this.die(d, cx - 19 + k * 38, 210, (i < 0 ? 'used ' : '') + roll); }); }
    }
    const key = h.replace(/ roll/g, '');
    if (key !== this.diceKey || roll) { this.diceKey = key; this.gD.innerHTML = h; }
    if (roll && this.rollN !== -1 && (v.dice.length || v.od[0])) ThSnd.dice();
    this.rollN = v.rollN;
  }
  timer() {
    const ctx = this.t.ctx, v = ctx && ctx.view, bar = this.el.querySelector('.th-bar i');
    if (!v || !bar) return;
    const on = v.phase === 'play' && (v.stage === 'roll' || v.stage === 'move') && !v.nomove;
    const left = on ? Math.max(0, v.endsAt - ctx.serverNow()) : 0;
    bar.style.transform = `scaleX(${on ? Math.min(1, left / (v.sec * 1000)) : 0})`;
    bar.style.background = left < 8000 ? '#ff5a5f' : '';
    if (on && v.me === v.turn && left < 6000 && left > 0) { const s = Math.ceil(left / 1000); if (s !== this.lastTick) { this.lastTick = s; ThSnd.play('tick'); } }
  }
  buttons() {
    const v = this.t.ctx.view, el = this.el.querySelector('.tv-btns');
    const sure = performance.now() - this.resignAt < 3500;
    const h = v.me >= 0 && v.phase === 'play' ? `<button class="th-mini ${sure ? 'hot' : ''}" data-tv="resign">${sure ? 'Emin misin? Evet, bırak' : '🏳 Maçı bırak'}</button>` : '';
    if (el.dataset.k !== h) { el.dataset.k = h; el.innerHTML = h; }
  }
  update(ctx) {
    const v = ctx.view, side = v.me === 1 ? 1 : 0;
    if (side !== this.side) { this.side = side; this.build(); this.m = null; this.diceKey = ''; }
    const S = { p: v.p, bar: v.bar, off: v.off }, same = (a, b) => a.p.join() === b.p.join() && a.bar.join() === b.bar.join() && a.off.join() === b.off.join();
    if (!this.m || this.gameNo !== v.gameNo) { this.rebuild(S); this.gameNo = v.gameNo; }
    else if (!same(this.m, S)) {
      let ok = false;
      if (v.mv && v.mv.n > this.seenN) {
        // son hamle öncesi durumdan mı geliyoruz?
        try { let t = this.m; for (const [f, to] of v.mv.steps) t = tvApply(t, v.mv.side, { f, t: to }); ok = same(t, S); } catch { ok = false; }
        if (ok) this.steps(v.mv.side, v.mv.steps);
      }
      if (!ok) { if (v.me === v.turn && v.stage === 'move' && performance.now() < this.pendUntil) { /* kendi hamlem yolda */ } else this.rebuild(S); }
    }
    if (v.mv) this.seenN = v.mv.n;
    // kalan zarlar: yerel hamle yoldaysa sunucunun eski görüntüsü ezmesin
    if (same(this.m, S)) this.rem = v.stage === 'move' ? v.rem.slice() : [];
    const turnKey = v.gameNo + ':' + v.turn + ':' + v.stage + ':' + v.rollN;
    if (turnKey !== this.turnKey) { this.turnKey = turnKey; this.sel = null; this.tg = new Map(); if (v.me === v.turn && v.stage === 'roll' && v.phase === 'play') { ThSnd.play('turn'); thVib(15); } }
    if (this.myMove() && this.sel === null && this.m.bar[v.me] > 0) { const T = this.targets(-1); if (T.size) { this.sel = -1; this.tg = T; } }
    this.offT[0].textContent = this.m.off[side] || ''; this.offT[1].textContent = this.m.off[1 - side] || '';
    this.offT[0].setAttribute('y', 222); this.offT[1].setAttribute('y', 206);
    this.dice(v);
    this.marks();
    // zar at düğmesi
    const canRoll = v.phase === 'play' && v.stage === 'roll' && v.me === v.turn;
    let rb = this.wrap.querySelector('.tv-roll');
    if (canRoll && !rb) { rb = document.createElement('button'); rb.className = 'th-btn tv-roll'; rb.textContent = '🎲 Zar at'; this.wrap.appendChild(rb); } else if (!canRoll && rb) rb.remove();
    // şeritler
    const top = 1 - side, bot = side, key = v.seats.map((s) => s.id + s.n + s.c + s.on).join('|') + side;
    if (key !== this.barKey) { this.barKey = key; this.el.querySelector('.tv-top').innerHTML = thPlayer(v.seats[top]); this.el.querySelector('.tv-bot').innerHTML = thPlayer(v.seats[bot]); }
    for (const [i, q] of [[top, '.tv-top .th-pl'], [bot, '.tv-bot .th-pl']]) {
      const bar = this.el.querySelector(q), s = v.seats[i];
      bar.classList.toggle('turn', v.phase === 'play' && v.turn === i && v.stage !== 'open' && v.stage !== 'gameEnd'); bar.classList.toggle('off', !s.on);
      bar.querySelector('b').textContent = (i === 0 ? '⚪ ' : '⚫ ') + s.n + (v.me === i ? ' (sen)' : '');
      bar.querySelector('small').textContent = `Maç ${v.score[i]}/${v.goal} · Kalan ${v.pip[i]}${s.on ? '' : ' · bağlantı koptu'}`;
    }
    const nm = thEsc(v.seats[v.turn].n), mine = v.me === v.turn;
    let m = '';
    if (v.phase === 'play') {
      if (v.stage === 'open') m = v.od[0] ? (v.od[0] === v.od[1] ? 'Eşit geldi, yeniden atılıyor…' : `${nm} başlıyor`) : 'Açılış zarı atılıyor: büyük atan başlar';
      else if (v.stage === 'gameEnd' && v.win) m = `${thEsc(v.seats[v.win.side].n)} oyunu aldı${v.win.k === 2 ? ' — MARS! 2 puan' : ''}`;
      else if (v.stage === 'roll') m = mine ? 'Sıra sende: zar at' : `${nm} zar atıyor…`;
      else if (v.nomove) m = mine ? 'Oynanacak hamle yok 😕 Sıra geçiyor' : `${nm} oynayamıyor, sıra geçiyor`;
      else m = mine ? (this.m.bar[v.me] > 0 ? 'Önce kırık pulunu sok' : this.sel !== null ? 'Yanan haneye dokun' : 'Oynayacağın pula dokun') : `${nm} oynuyor…`;
    }
    this.el.querySelector('.th-msg').textContent = m;
    if (v.stage === 'gameEnd' && v.win && this.winKey !== v.gameNo) { this.winKey = v.gameNo; ThSnd.play('tada'); }
    this.buttons(); this.timer();
  }
}


// ======================= Okey (Düz Okey ve 101) =======================
TH_CSS.push(`
.ok { display: grid; gap: 7px; }
.ok-t { width: var(--w, 30px); height: calc(var(--w, 30px) * 1.42); flex: none; border-radius: calc(var(--w, 30px) * .17); background: linear-gradient(#fffdf6, #f1e7d0); border: 1.5px solid #b3a283; box-shadow: 0 2px 0 #948363; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; font-size: calc(var(--w, 30px) * .6); line-height: 1; position: relative; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }
.ok-t b { font-weight: 800; }
.ok-t i { width: 22%; aspect-ratio: 1; border-radius: 50%; background: currentColor; margin-top: 9%; opacity: .85; }
.ok-t.c0 { color: #d5202f; } .ok-t.c1 { color: #16161d; } .ok-t.c2 { color: #1565d8; } .ok-t.c3 { color: #dd9600; }
.ok-t.c1 i { border-radius: 2px; } .ok-t.c2 i { border-radius: 50% 50% 0 0; } .ok-t.c3 i { transform: rotate(45deg); border-radius: 2px; }
.ok-t.fk { color: #1c8f4d; } .ok-t.fk i { display: none; }
.ok-t.w { background: linear-gradient(#fff6c9, #ffe58a); border-color: #c79a12; }
.ok-t.w::after { content: "★"; position: absolute; top: 0; right: 1px; font-size: 42%; color: #b77c00; letter-spacing: 0; }
.ok-t.back { background: repeating-linear-gradient(45deg, #d9c59a 0 4px, #cdb785 4px 8px); }
.ok-t.sel { transform: translateY(-22%); box-shadow: 0 0 0 2.5px #26d07c, 0 6px 8px rgb(0 0 0 / .3); z-index: 2; }
.ok-t.new { animation: okNew .9s ease-out; }
.ok-t.lift { opacity: .25; }
@keyframes okNew { 0% { transform: translateY(-60%) scale(1.15); box-shadow: 0 0 0 3px #ffd23f; } 100% { transform: none; } }
.ok-ghost { position: fixed; z-index: 80; pointer-events: none; transform: translate(-50%, -70%) scale(1.25); box-shadow: 0 10px 14px rgb(0 0 0 / .4); }
.ok-table { position: relative; border-radius: 18px; padding: 8px; background: radial-gradient(ellipse at 50% 40%, #2f9e6e, #1d6f4c 70%, #175a3d); border: 5px solid #5a3520; box-shadow: 0 6px 0 0 #2a160b, 0 10px 22px rgb(0 0 0 / .35); display: grid; gap: 6px; }
.ok-opp { display: flex; align-items: center; gap: 6px; padding: 4px 8px 4px 4px; border-radius: 12px; background: rgb(0 0 0 / .28); color: #fff; min-width: 0; font-size: 12px; font-weight: 800; transition: background .2s; }
.ok-opp .th-av { width: 30px; height: 30px; border-width: 2px; }
.ok-opp span { min-width: 0; flex: 1; }
.ok-opp b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; }
.ok-opp small { display: block; font-size: 11px; font-weight: 700; opacity: .85; white-space: nowrap; }
.ok-opp.turn { background: #fff6dc; color: #1b1408; box-shadow: 0 0 0 3px #ffd23f; }
.ok-opp.off .th-av { filter: grayscale(1); opacity: .6; }
.ok-opp.side { flex-direction: column; text-align: center; padding: 6px 2px; width: 64px; gap: 3px; }
.ok-opp.side small { font-size: 10.5px; white-space: normal; line-height: 1.25; }
.ok-opp.side span { width: 100%; }
.ok-mid { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: stretch; }
.ok-center { display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: 1fr 1fr; gap: 6px 4px; min-height: 124px; align-items: center; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.ok-d { --w: 30px; width: 40px; height: 54px; border-radius: 9px; border: 2px dashed rgb(255 255 255 / .35); display: grid; place-items: center; position: relative; justify-self: center; touch-action: none; }
.ok-d .ok-t { animation: okDrop .22s ease-out; }
@keyframes okDrop { from { transform: scale(1.5); opacity: .3; } }
.ok-d u { position: absolute; right: -5px; bottom: -6px; font: 800 10px system-ui, sans-serif; text-decoration: none; background: rgb(0 0 0 / .55); color: #fff; border-radius: 99px; padding: 1px 5px; }
.ok-d.take { border-color: #ffd23f; border-style: solid; box-shadow: 0 0 0 3px rgb(255 210 63 / .45); cursor: pointer; animation: okGlow 1s ease-in-out infinite alternate; }
.ok-d.mine.can { border-color: #26d07c; border-style: solid; background: rgb(38 208 124 / .22); cursor: pointer; }
.ok-d.mine.can::before { content: "AT"; position: absolute; font: 800 11px system-ui, sans-serif; color: rgb(255 255 255 / .8); }
.ok-d.mine.can .ok-t { opacity: .55; }
@keyframes okGlow { to { box-shadow: 0 0 0 6px rgb(255 210 63 / .2); } }
.ok-pilebox { grid-row: 1 / span 2; grid-column: 2; display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 12px; background: rgb(0 0 0 / .2); }
.ok-pile { --w: 32px; position: relative; cursor: default; touch-action: none; }
.ok-pile .ok-t { box-shadow: 0 2px 0 #948363, 0 4px 0 #a39271, 0 6px 0 #948363; }
.ok-pile u { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font: 800 13px system-ui, sans-serif; text-decoration: none; color: #4a3a1c; background: rgb(255 255 255 / .75); border-radius: 99px; padding: 1px 6px; }
.ok-pile.take { cursor: pointer; border-radius: 7px; animation: okGlow 1s ease-in-out infinite alternate; box-shadow: 0 0 0 3px rgb(255 210 63 / .6); }
.ok-ind { --w: 32px; text-align: center; font: 800 9.5px system-ui, sans-serif; color: #eaffea; letter-spacing: .04em; text-transform: uppercase; display: grid; gap: 3px; justify-items: center; }
.ok-ind .mini { --w: 17px; display: flex; align-items: center; gap: 3px; text-transform: none; font-size: 10px; }
.ok-melds { max-height: 148px; overflow-y: auto; border-radius: 12px; background: rgb(0 0 0 / .22); padding: 6px; display: grid; gap: 5px; -webkit-overflow-scrolling: touch; }
.ok-mrow { display: flex; flex-wrap: wrap; gap: 5px 7px; align-items: center; }
.ok-mrow .who { font: 800 10.5px system-ui, sans-serif; color: #eaffea; width: 100%; opacity: .9; }
.ok-meld { --w: 17px; display: flex; gap: 1px; padding: 2px; border-radius: 6px; background: rgb(0 0 0 / .18); }
.ok-meld .ok-t { border-width: 1px; box-shadow: 0 1px 0 #948363; }
.ok-meld.can { box-shadow: 0 0 0 2.5px #26d07c; cursor: pointer; background: rgb(38 208 124 / .3); }
.ok-empty { font: 700 11.5px system-ui, sans-serif; color: rgb(255 255 255 / .7); text-align: center; padding: 6px; }
.ok-me { display: flex; align-items: center; gap: 8px; }
.ok-me .th-pl { flex: 1; }
.ok-acts { justify-content: flex-start; gap: 6px; min-height: 36px; }
.ok-rack { --tw: 24px; border-radius: 12px; padding: 5px 5px 2px; background: linear-gradient(#a8703f, #8a5527); border: 3px solid #4a2a15; box-shadow: 0 5px 0 0 #2a160b; display: grid; gap: 0; touch-action: none; }
.ok-row { display: grid; gap: 0; padding: 3px 0 4px; border-bottom: 5px solid #6b3f1f; box-shadow: 0 2px 0 rgb(0 0 0 / .25); margin-bottom: 4px; }
.ok-s { min-height: calc(var(--tw) * 1.42 + 6px); display: flex; align-items: flex-end; justify-content: center; position: relative; padding-bottom: 3px; }
.ok-s .ok-t { --w: calc(var(--tw) - 1.5px); cursor: grab; touch-action: none; }
.ok-s.gv::after, .ok-s.gp::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #35e38a; }
.ok-s.gp::after { background: #ffd23f; }
.ok-s.g0::after { border-radius: 3px 0 0 3px; left: 2px; } .ok-s.g1::after { border-radius: 0 3px 3px 0; right: 2px; }
.ok-s.hov { background: rgb(255 255 255 / .28); border-radius: 6px; }
.ok-sum { font-size: 12.5px; font-weight: 800; text-align: center; min-height: 17px; }
.ok-end { position: absolute; inset: 0; z-index: 6; border-radius: 12px; background: rgb(10 30 20 / .9); color: #fff; padding: 12px; overflow: auto; text-align: center; animation: thFade .25s both; display: grid; gap: 8px; align-content: center; }
.ok-end h3 { margin: 0; font-size: 18px; font-weight: 800; }
.ok-end p { margin: 0; font-size: 13px; opacity: .9; }
.ok-end .hand { --w: 19px; display: flex; flex-wrap: wrap; gap: 3px 7px; justify-content: center; }
.ok-end .hand > div { display: flex; gap: 1px; }
.ok-end table { width: 100%; border-collapse: collapse; font-size: 13px; font-weight: 700; }
.ok-end td { padding: 3px 6px; text-align: left; } .ok-end td:nth-child(n+2) { text-align: right; font-variant-numeric: tabular-nums; }
.ok-end tr.w td { color: #ffd23f; }
/* dar telefonlar (360–400 px): masa ekrana sığsın */
@media (max-width: 400px), (orientation: landscape) and (max-height: 520px) {
  .ok-table { padding: 5px; border-width: 4px; gap: 4px; }
  .ok-mid { gap: 4px; }
  .ok-opp.side { width: 52px; padding: 5px 1px; }
  .ok-opp.side .th-av { width: 26px; height: 26px; }
  .ok-opp.side b { font-size: 11px; }
  .ok-opp.side small { font-size: 9.5px; }
  .ok-center { gap: 5px 3px; }
  .ok-d { --w: 26px; width: 34px; height: 46px; }
  .ok-pilebox { gap: 5px; padding: 5px 4px; }
  .ok-pile { --w: 28px; }
  .ok-ind { --w: 28px; font-size: 8px; letter-spacing: 0; }
}
/* çok dar (≤ 340 px) ve küçük yatay telefonlar */
@media (max-width: 340px), (orientation: landscape) and (max-height: 520px) and (max-width: 720px) {
  .ok-opp.side { width: 46px; }
  .ok-opp.side .th-av { width: 22px; height: 22px; }
  .ok-d { --w: 23px; width: 30px; height: 41px; }
  .ok-pile, .ok-ind { --w: 25px; }
  .ok-pilebox { gap: 4px; padding: 4px 3px; }
}
`);
const OK_ERR = { taken: 'Soldan aldığın taşı bu el kullanmalısın — ya da “Geri bırak”', bitmez: 'Bu taşı atınca elin bitmiyor', acmadan: 'Elini açmadan bitiremezsin', 'cift-seri': 'Çift açan oyuncu seri indiremez', 'seri-cift': 'Seri açan oyuncu çift indiremez', gecersiz: 'Geçersiz per var', yuzbir: 'Açmak için perlerin toplamı en az 101 olmalı', bescift: 'Çift açmak için en az 5 çift gerekir', sontas: 'Atmak için elinde bir taş kalmalı', acmadin: 'Önce elini açmalısın', islenmez: 'Bu taş o pere işlenmez' };
const OK_RACKS = new Map();
function okTile(id, ok, cls = '') {
  if (id === -1) return `<div class="ok-t back ${cls}"></div>`;
  const fk = id >= 104, w = ok && okWild(id, ok);
  return `<div class="ok-t ${fk ? 'fk' : 'c' + okC(id)} ${w ? 'w' : ''} ${cls}" data-id="${id}"><b>${fk ? '✿' : okN(id)}</b><i></i></div>`;
}
class OkView {
  constructor(el, table) {
    this.t = table; this.el = el; this.slots = []; this.sel = null; this.handKey = ''; this.evN = 0; this.errN = 0; this.newId = null; this.dropSlot = null; this.keys = {}; this.press = null; this.gone = new Set();
    el.innerHTML = `<div class="ok"><div class="ok-table"><div class="ok-top"></div><div class="ok-mid"><div class="ok-left"></div><div class="ok-center"></div><div class="ok-right"></div></div><div class="ok-meldbox"></div><div class="ok-endbox"></div></div><div class="th-bar"><i></i></div><div class="ok-me"></div><div class="th-msg" style="margin:2px 0"></div><div class="th-row ok-acts"></div><div class="ok-rackbox"></div><div class="ok-sum"></div></div>`;
    this.q = (s) => el.querySelector(s);
    this.onDown = (e) => this.down(e); this.onMove = (e) => this.move(e); this.onUp = (e) => this.up(e);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('click', (e) => this.click(e));
    // Safari: sürükleme sırasında sayfa kaymasın
    el.addEventListener('touchmove', (e) => { if (this.press && this.press.on && e.cancelable) e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => { if (e.target.closest('.ok-rack, .ok-center')) e.preventDefault(); });
    el.addEventListener('dragstart', (e) => e.preventDefault());
    this.tick = setInterval(() => this.timer(), 200);
    this.onRes = () => this.fit();
    window.addEventListener('resize', this.onRes);
  }
  dispose() { clearInterval(this.tick); window.removeEventListener('resize', this.onRes); document.removeEventListener('pointermove', this.onMove); document.removeEventListener('pointerup', this.onUp); document.removeEventListener('pointercancel', this.onUp); if (this.ghost) this.ghost.remove(); }
  get v() { return this.t.ctx.view; }
  cols() { return this.v.mode === '101' ? 15 : 13; }
  myPlay() { const v = this.v; return v.phase === 'play' && v.me >= 0 && v.turn === v.me && v.stage === 'play'; }
  myDraw() { const v = this.v; return v.phase === 'play' && v.me >= 0 && v.turn === v.me && v.stage === 'draw'; }
  hand() { return this.slots.filter((x) => x !== null); }
  fit() { const r = this.q('.ok-rack'); if (r) r.style.setProperty('--tw', ((r.clientWidth - 10) / this.cols()).toFixed(2) + 'px'); }
  // ---- ıstaka ----
  arrange(groups, rest) {
    const C = this.cols(), R = C * 2, ok = this.v.ok;
    const key = (id) => { const f = okFace(id, ok); return f ? f[0] * 20 + f[1] : -1; };
    rest = rest.slice().sort((a, b) => key(a) - key(b));
    const out = new Array(R).fill(null);
    let i = 0, fail = false;
    const putG = (g) => { if (i % C !== 0 && i < R) i++; if (Math.floor(i / C) !== Math.floor((i + g.length - 1) / C) && i < C) i = C; for (const id of g) { if (i >= R) { fail = true; return; } out[i++] = id; } };
    for (const g of groups) putG(g);
    if (rest.length) { if (i % C !== 0) i++; if (i + rest.length > R) i = Math.max(0, R - rest.length); for (const id of rest) { if (i >= R || out[i] !== null) { fail = true; break; } out[i++] = id; } }
    if (fail) { const all = [].concat(...groups, rest); out.fill(null); all.forEach((id, k) => { out[k] = id; }); }
    this.slots = out;
  }
  autoSeri() { const b = okBest(this.hand(), this.v.ok, this.v.mode === '101' ? 's' : 'c'); this.arrange(b.melds, b.rest); this.sel = null; this.rack(); ThSnd.tile(); }
  autoCift() { const p = okPairs(this.hand(), this.v.ok); this.arrange(p.pairs, p.rest); this.sel = null; this.rack(); ThSnd.tile(); }
  sync() {
    const v = this.v, C = this.cols(), R = C * 2, hk = (this.t.ctx.room ? this.t.ctx.room.code : '') + ':' + v.gid + ':' + v.handNo;
    if (!v.hand) { this.slots = []; return; }
    if (hk !== this.handKey) {
      this.handKey = hk; this.sel = null; this.gone = new Set();
      const saved = OK_RACKS.get(hk);
      if (saved && saved.length === R) this.slots = saved.slice(); else { this.slots = new Array(R).fill(null); const b = okBest(v.hand, v.ok, v.mode === '101' ? 's' : 'c'); this.arrange(b.melds, b.rest); }
      for (const k of [...OK_RACKS.keys()]) if (k !== hk) OK_RACKS.delete(k);
    }
    const have = new Set(v.hand);
    for (const id of this.gone) if (!have.has(id)) this.gone.delete(id);
    for (let i = 0; i < R; i++) if (this.slots[i] !== null && !have.has(this.slots[i])) { if (this.sel === this.slots[i]) this.sel = null; this.slots[i] = null; }
    const on = new Set(this.slots.filter((x) => x !== null));
    for (const id of v.hand) {
      if (on.has(id) || this.gone.has(id)) continue;
      let k = this.dropSlot !== null && this.slots[this.dropSlot] === null ? this.dropSlot : -1;
      if (k < 0) for (let i = R - 1; i >= 0; i--) if (this.slots[i] === null) { k = i; break; }
      this.dropSlot = null;
      if (k >= 0) { this.slots[k] = id; this.newId = id; }
    }
    OK_RACKS.set(hk, this.slots.slice());
  }
  groups() {
    // sıra sıra bitişik taş öbekleri: { ids, at, meld, pair }
    const C = this.cols(), out = [], ok = this.v.ok;
    for (let r = 0; r < 2; r++) { let cur = null; for (let c = 0; c <= C; c++) { const id = c < C ? this.slots[r * C + c] : null; if (id === null || id === undefined) { if (cur) out.push(cur); cur = null; } else { if (!cur) cur = { ids: [], at: r * C + c }; cur.ids.push(id); } } }
    for (const g of out) { g.meld = okMeld(g.ids, ok); g.pair = g.ids.length === 2 && okPair(g.ids[0], g.ids[1], ok); }
    return out;
  }
  rack() {
    const v = this.v, box = this.q('.ok-rackbox');
    if (!v.hand || v.me < 0) { if (box.innerHTML) box.innerHTML = ''; this.q('.ok-sum').textContent = ''; return; }
    const C = this.cols(), G = this.groups(), mark = new Map();
    for (const g of G) if (g.meld || g.pair) g.ids.forEach((_, k) => mark.set(g.at + k, (g.meld ? 'gv' : 'gp') + (k === 0 ? ' g0' : '') + (k === g.ids.length - 1 ? ' g1' : '')));
    let h = `<div class="ok-rack">`;
    for (let r = 0; r < 2; r++) { h += `<div class="ok-row" style="grid-template-columns:repeat(${C},1fr)">`; for (let c = 0; c < C; c++) { const i = r * C + c, id = this.slots[i]; h += `<div class="ok-s ${mark.get(i) || ''}" data-slot="${i}">${id !== null && id !== undefined ? okTile(id, v.ok, (id === this.sel ? 'sel ' : '') + (id === this.newId ? 'new' : '')) : ''}</div>`; } h += '</div>'; }
    h += '</div>';
    box.innerHTML = h;
    this.newId = null;
    this.fit();
    const sum = G.reduce((a, g) => a + (g.meld ? g.meld.val : 0), 0), pc = G.filter((g) => g.pair).length;
    this.sums = { sum, pc, melds: G.filter((g) => g.meld).map((g) => g.ids), pairs: G.filter((g) => g.pair).map((g) => g.ids) };
    this.q('.ok-sum').textContent = v.mode === '101' ? (v.opened[v.me] ? (v.opened[v.me] === 2 ? `Çift açtın · dizili çift: ${pc}` : `Elin açık · dizili per toplamı: ${sum}`) : `Dizili perler: ${sum} / 101 · çift: ${pc} / 5`) : '';
    this.acts();
  }
  moveTo(id, to) {
    const C = this.cols(), from = this.slots.indexOf(id);
    if (from < 0 || from === to) return;
    this.slots[from] = null;
    if (this.slots[to] !== null) {
      const r0 = Math.floor(to / C) * C, r1 = r0 + C;
      let e = -1;
      for (let i = to + 1; i < r1; i++) if (this.slots[i] === null) { e = i; break; }
      if (e >= 0) { for (let i = e; i > to; i--) this.slots[i] = this.slots[i - 1]; }
      else { for (let i = to - 1; i >= r0; i--) if (this.slots[i] === null) { e = i; break; } if (e >= 0) { for (let i = e; i < to; i++) this.slots[i] = this.slots[i + 1]; } else { this.slots[from] = this.slots[to]; } }
    }
    this.slots[to] = id;
    OK_RACKS.set(this.handKey, this.slots.slice());
    ThSnd.tile();
  }
  // ---- eylemler ----
  discard(id) {
    const v = this.v;
    if (!this.myPlay()) { this.t.toast(v.turn === v.me ? 'Önce taş çek' : 'Sıra sende değil'); return; }
    if (v.mode === '101' && v.taken !== null && v.taken !== undefined) { this.t.toast(OK_ERR.taken); return; }
    const rest = this.hand().filter((x) => x !== id);
    const fin = v.mode !== '101' && okWin(rest, v.ok) > 0;
    this.t.ctx.send('disc', { id, fin });
    const k = this.slots.indexOf(id);
    if (k >= 0) { this.slots[k] = null; this.gone.add(id); }
    this.sel = null;
    ThSnd.tile2(); thVib(10);
    this.rack(); this.center();
  }
  addTo(id, k) {
    const v = this.v, m = (v.melds || []).find((x) => x.k === k);
    if (!m) return;
    if (!this.myPlay()) { this.t.toast('Sıra sende değil ya da önce taş çekmelisin'); return; }
    if (!v.opened[v.me]) { this.t.toast(OK_ERR.acmadin); return; }
    if (!okSwap(m, id, v.ok) && !okAdd(m, id, v.ok)) { this.t.toast(OK_ERR.islenmez); return; }
    this.t.ctx.send('add', { id, k });
    this.sel = null;
  }
  act(a) {
    const v = this.v, ctx = this.t.ctx, S = this.sums || { melds: [], pairs: [], sum: 0, pc: 0 };
    if (a === 'seri') this.autoSeri();
    else if (a === 'cift') this.autoCift();
    else if (a === 'at' && this.sel !== null) this.discard(this.sel);
    else if (a === 'show') ctx.send('show');
    else if (a === 'back') ctx.send('back');
    else if (a === 'here') ctx.send('show');
    else if (a === 'open') {
      if (!v.opened[v.me] && S.sum < 101) { this.t.toast(OK_ERR.yuzbir + ` (şu an ${S.sum})`); return; }
      if ([].concat(...S.melds).length >= this.hand().length) { this.t.toast(OK_ERR.sontas); return; }
      ctx.send('open', { g: S.melds });
    } else if (a === 'pairs') {
      if (!v.opened[v.me] && S.pc < 5) { this.t.toast(OK_ERR.bescift); return; }
      if (S.pc * 2 >= this.hand().length) { this.t.toast(OK_ERR.sontas); return; }
      ctx.send('pairs', { g: S.pairs });
    }
  }
  click(e) {
    const b = e.target.closest('[data-ok]');
    if (b) { this.act(b.dataset.ok); return; }
    if (this.justDragged) return;
    const v = this.v;
    if (e.target.closest('.ok-pile') && this.myDraw()) { this.t.ctx.send('draw', { src: 'p' }); thVib(8); return; }
    const d = e.target.closest('.ok-d');
    if (d) {
      if (d.classList.contains('take') && this.myDraw()) { this.t.ctx.send('draw', { src: 'd' }); thVib(8); return; }
      if (d.classList.contains('mine') && this.sel !== null) { this.discard(this.sel); return; }
    }
    const m = e.target.closest('.ok-meld');
    if (m && this.sel !== null) { this.addTo(this.sel, +m.dataset.k); return; }
    void v;
  }
  down(e) {
    if (this.press) this.cancelPress();
    const t = e.target.closest('.ok-rack .ok-t'), src = !t && this.myDraw() ? e.target.closest('.ok-pile, .ok-d.take') : null;
    if (!t && !src) { const s = e.target.closest('.ok-s'); if (s && this.sel !== null && this.slots[+s.dataset.slot] === null) { this.moveTo(this.sel, +s.dataset.slot); this.sel = null; this.rack(); } return; }
    this.press = { id: t ? +t.dataset.id : null, src: src ? (src.classList.contains('ok-pile') ? 'p' : 'd') : null, el: t || src, x: e.clientX, y: e.clientY, on: false, pid: e.pointerId };
    document.addEventListener('pointermove', this.onMove); document.addEventListener('pointerup', this.onUp); document.addEventListener('pointercancel', this.onUp);
    if (t) e.preventDefault();
  }
  cancelPress() {
    this.press = null;
    document.removeEventListener('pointermove', this.onMove); document.removeEventListener('pointerup', this.onUp); document.removeEventListener('pointercancel', this.onUp);
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    if (this.hov) { this.hov.classList.remove('hov'); this.hov = null; }
    this.el.querySelectorAll('.lift').forEach((n) => n.classList.remove('lift'));
  }
  move(e) {
    const p = this.press;
    if (!p || p.pid !== e.pointerId) return;
    if (!p.on) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
      p.on = true;
      const g = (p.id !== null ? p.el : p.el.querySelector('.ok-t') || p.el).cloneNode(true);
      g.classList.remove('sel', 'new'); g.classList.add('ok-ghost'); g.style.setProperty('--w', '30px');
      document.body.appendChild(g); this.ghost = g;
      if (p.id !== null) p.el.classList.add('lift');
    }
    this.ghost.style.left = e.clientX + 'px'; this.ghost.style.top = e.clientY + 'px';
    const under = document.elementFromPoint(e.clientX, e.clientY), s = under && under.closest('.ok-s');
    if (this.hov && this.hov !== s) this.hov.classList.remove('hov');
    if (s) s.classList.add('hov');
    this.hov = s || null;
  }
  up(e) {
    const p = this.press;
    if (!p || p.pid !== e.pointerId) return;
    this.press = null;
    document.removeEventListener('pointermove', this.onMove); document.removeEventListener('pointerup', this.onUp); document.removeEventListener('pointercancel', this.onUp);
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    if (this.hov) { this.hov.classList.remove('hov'); this.hov = null; }
    if (!p.on) {
      if (p.id !== null) { this.sel = this.sel === p.id ? null : p.id; this.rack(); this.center(); this.melds(); }
      return;
    }
    this.justDragged = true; setTimeout(() => { this.justDragged = false; }, 60);
    const under = e.type === 'pointercancel' ? null : document.elementFromPoint(e.clientX, e.clientY);
    const s = under && under.closest('.ok-s');
    if (p.src) {
      // desteden / soldan sürükleyip ıstakaya bırakma
      if (s || (under && under.closest('.ok-rack'))) { this.dropSlot = s && this.slots[+s.dataset.slot] === null ? +s.dataset.slot : null; this.t.ctx.send('draw', { src: p.src }); thVib(8); }
      return;
    }
    if (s) this.moveTo(p.id, +s.dataset.slot);
    else if (under && under.closest('.ok-d.mine')) { this.discard(p.id); return; }
    else if (under && under.closest('.ok-meld')) this.addTo(p.id, +under.closest('.ok-meld').dataset.k);
    this.sel = null;
    this.rack();
  }
  // ---- çizim ----
  opp(k, side) {
    const v = this.v, base = v.me >= 0 ? v.me : 0, i = (base + k) % 4, s = v.seats[i];
    const st = v.mode === '101' ? (v.opened[i] === 1 ? ' · açtı' : v.opened[i] === 2 ? ' · çift' : '') : (v.shown[i] ? ' · gösterge' : '');
    return `<div class="ok-opp ${side ? 'side' : ''} ${v.phase === 'play' && v.turn === i && v.stage !== 'handEnd' ? 'turn' : ''} ${s.on ? '' : 'off'}"><div class="th-av">${thFace(s.c)}</div><span><b>${thEsc(s.n)}${i === v.me ? ' (sen)' : ''}</b><small>${v.cnt[i]} taş${side ? '<br>' : ' · '}${v.score[i]}${v.mode === '101' ? ' ceza' : ' p'}${side && st ? '<br>' + st.slice(3) : st}${v.away[i] ? ' · 💤' : ''}</small></span></div>`;
  }
  set(sel, html) { if (this.keys[sel] !== html) { this.keys[sel] = html; this.q(sel).innerHTML = html; return true; } return false; }
  center() {
    const v = this.v, base = v.me >= 0 ? v.me : 0, rel = (k) => (base + k) % 4;
    const dsp = (k, cls) => { const i = rel(k), L = v.disc[i], top = L.length ? L[L.length - 1] : null; const hide = k === 0 && top !== null && false; return `<div class="ok-d ${cls}" data-d="${i}">${top !== null && !hide ? okTile(top, v.ok) : ''}${v.discN[i] > 1 ? `<u>${v.discN[i]}</u>` : ''}</div>`; };
    const take = this.myDraw(), canD = this.myPlay() && this.sel !== null;
    const h = `${dsp(2, '')}<div class="ok-pilebox"><div class="ok-pile ${take && v.pile ? 'take' : ''}">${okTile(-1)}<u>${v.pile}</u></div><div class="ok-ind"><span>Gösterge</span>${okTile(v.ind, null)}<span class="mini">Okey ${okTile(v.ok[0] * 26 + v.ok[1] - 1, v.ok)}</span></div></div>${dsp(1, '')}${dsp(3, take && v.disc[rel(3)].length ? 'take' : '')}${dsp(0, 'mine ' + (canD ? 'can' : ''))}`;
    this.set('.ok-center', h);
  }
  melds() {
    const v = this.v;
    if (v.mode !== '101') { this.set('.ok-meldbox', ''); return; }
    const sel = this.sel, can = (m) => sel !== null && this.myPlay() && v.opened[v.me] && (okSwap(m, sel, v.ok) || okAdd(m, sel, v.ok));
    let h = '';
    for (let i = 0; i < 4; i++) {
      const L = v.melds.filter((m) => m.o === i);
      if (!L.length) continue;
      h += `<div class="ok-mrow"><span class="who">${thEsc(v.seats[i].n)}${i === v.me ? ' (sen)' : ''}</span>${L.map((m) => `<div class="ok-meld ${can(m) ? 'can' : ''}" data-k="${m.k}">${m.ids.map((id) => okTile(id, v.ok)).join('')}</div>`).join('')}</div>`;
    }
    this.set('.ok-meldbox', `<div class="ok-melds">${h || '<div class="ok-empty">Henüz açan yok. Perlerinin toplamı 101 olunca “Aç”a bas.</div>'}</div>`);
  }
  acts() {
    const v = this.v;
    if (v.me < 0 || v.phase !== 'play' || v.stage === 'handEnd') { this.set('.ok-acts', ''); return; }
    const S = this.sums || { sum: 0, pc: 0, melds: [], pairs: [] }, play = this.myPlay();
    let h = `<button class="th-mini" data-ok="seri">Seri diz</button><button class="th-mini" data-ok="cift">Çift diz</button>`;
    if (v.away[v.me]) h += `<button class="th-mini hot" data-ok="here">Geri döndüm</button>`;
    if (v.canShow) h += `<button class="th-mini hot" data-ok="show">Göstergeyi göster</button>`;
    if (v.mode === '101' && play) {
      const op = v.opened[v.me];
      if (v.taken !== null && v.taken !== undefined) h += `<button class="th-mini" data-ok="back">Geri bırak</button>`;
      if (op !== 2) h += `<button class="th-mini ${(!op && S.sum >= 101) || (op === 1 && S.melds.length) ? 'go' : ''}" data-ok="open" ${op === 1 && !S.melds.length ? 'disabled' : ''}>${op ? 'Per indir' : `Aç (${S.sum})`}</button>`;
      if (op !== 1) h += `<button class="th-mini ${(!op && S.pc >= 5) || (op === 2 && S.pc) ? 'go' : ''}" data-ok="pairs" ${op === 2 && !S.pc ? 'disabled' : ''}>${op ? 'Çift indir' : `Çift aç (${S.pc})`}</button>`;
    }
    if (play && this.sel !== null) { const fin = v.mode !== '101' && okWin(this.hand().filter((x) => x !== this.sel), v.ok) > 0; h += `<button class="th-mini ${fin ? 'go' : 'hot'}" data-ok="at">${fin ? 'Bitir 🎉' : 'Taşı at'}</button>`; }
    this.set('.ok-acts', h);
  }
  endBox() {
    const v = this.v, e = v.end;
    if (!e || (v.stage !== 'handEnd' && v.phase !== 'final')) { this.set('.ok-endbox', ''); return; }
    const m101 = v.mode === '101', nm = (i) => thEsc(v.seats[i].n) + (i === v.me ? ' (sen)' : '');
    let title, sub = '', hand = '';
    if (e.seat < 0) { title = 'Deste bitti'; sub = m101 ? 'Kimse bitiremedi; cezalar yazıldı.' : 'Bu el berabere, puan değişmedi.'; }
    else {
      title = `${nm(e.seat)} bitirdi!`;
      const L = [];
      if (e.kind === 2) L.push('çifte bitti'); if (e.okeyFin) L.push('okey atarak'); if (e.elden) L.push('elden');
      sub = (L.length ? L.join(', ') + ' — iki kat' : m101 ? 'Bitiren −101 alır' : 'Normal bitiş');
      if (!m101) { const H = e.hands[e.seat], G = e.kind === 2 ? okPairs(H, v.ok).pairs : okBest(H, v.ok, 'c').melds; hand = `<div class="hand">${G.map((g) => `<div>${g.map((id) => okTile(id, v.ok)).join('')}</div>`).join('')}</div>`; }
    }
    const rows = [0, 1, 2, 3].map((i) => `<tr class="${i === e.seat ? 'w' : ''}"><td>${nm(i)}</td><td>${m101 ? (i === e.seat ? '' : v.opened[i] ? e.hands[i].length + ' taş' : 'açamadı') : ''}</td><td>${e.d[i] > 0 ? '+' : ''}${e.d[i] || '0'}</td><td><b>${v.score[i]}</b></td></tr>`).join('');
    this.set('.ok-endbox', `<div class="ok-end"><h3>${title}</h3><p>${sub}</p>${hand}<table>${rows}</table><p>${e.last ? 'Oyun bitti, sonuçlar geliyor…' : `El ${v.handNo}/${v.hands} bitti. Sıradaki el birazdan başlıyor…`}</p></div>`);
  }
  timer() {
    const ctx = this.t.ctx, v = ctx && ctx.view, bar = this.el.querySelector('.th-bar i');
    if (!v || !bar || !v.sec) return;
    const on = v.phase === 'play' && (v.stage === 'draw' || v.stage === 'play');
    const left = on ? Math.max(0, v.endsAt - ctx.serverNow()) : 0;
    bar.style.transform = `scaleX(${on ? Math.min(1, left / (v.sec * 1000)) : 0})`;
    bar.style.background = left < 7000 ? '#ff5a5f' : '';
    if (on && v.me === v.turn && left < 6000 && left > 0) { const s = Math.ceil(left / 1000); if (s !== this.lastTick) { this.lastTick = s; ThSnd.play('tick'); } }
  }
  update(ctx) {
    const v = ctx.view;
    this.sync();
    this.set('.ok-top', this.opp(2, false));
    this.set('.ok-left', this.opp(3, true));
    this.set('.ok-right', this.opp(1, true));
    this.center(); this.melds(); this.endBox();
    // benim şeridim
    if (v.me >= 0) { const s = v.seats[v.me]; this.set('.ok-me', `<div class="th-pl ${v.turn === v.me && v.stage !== 'handEnd' && v.phase === 'play' ? 'turn' : ''}"><div class="th-av">${thFace(s.c)}</div><div class="nm"><b>${thEsc(s.n)} (sen)</b><small>${v.score[v.me]}${v.mode === '101' ? ' ceza' : ' puan'} · El ${v.handNo}/${v.hands}</small></div></div>`); }
    else this.set('.ok-me', `<div class="th-pl"><div class="th-av">${thFace(v.seats[0].c)}</div><div class="nm"><b>${thEsc(v.seats[0].n)}</b><small>👀 İzliyorsun · El ${v.handNo}/${v.hands}</small></div></div>`);
    const rk = JSON.stringify([this.slots, this.sel, v.opened, v.turn, v.stage, v.taken, v.canShow, v.away, v.me]);
    if (rk !== this.rackKey || !this.q('.ok-rack')) { this.rackKey = rk; this.rack(); this.rackKey = JSON.stringify([this.slots, this.sel, v.opened, v.turn, v.stage, v.taken, v.canShow, v.away, v.me]); } else this.acts();
    // durum satırı
    const nm = thEsc(v.seats[v.turn].n), mine = v.me === v.turn;
    let m = '';
    if (v.phase === 'play' && v.stage !== 'handEnd') {
      if (v.me >= 0 && v.away[v.me]) m = 'Süren doldu: yerine bilgisayar oynuyor';
      else if (v.stage === 'draw') m = mine ? 'Sıra sende: ortadan ya da soldan taş çek' : `${nm} taş çekiyor…`;
      else if (mine) m = v.mode === '101' && v.taken !== null && v.taken !== undefined ? 'Soldan aldığın taşı perde kullan ya da geri bırak' : this.sel !== null ? 'Sağ alttaki yere ya da “Taşı at”a dokun' : 'Bir taş seç ve at (sürükleyebilirsin)';
      else m = `${nm} düşünüyor…`;
    }
    this.q('.th-msg').textContent = m;
    // sesler ve uyarılar
    if (v.ev && v.ev.n !== this.evN) {
      const first = this.evN === 0; this.evN = v.ev.n;
      if (!first) { const k = v.ev.k; if (k === 'draw' || k === 'take') ThSnd.tile(); else if (k === 'disc') { if (v.ev.seat !== v.me) ThSnd.tile2(); } else if (k === 'open') { ThSnd.play('pop'); this.t.toast(`${v.seats[v.ev.seat].n} ${v.ev.pairs ? v.ev.pairs + ' çiftle' : v.ev.val + ' ile'} açtı`, 1800); } else if (k === 'add' || k === 'swap') ThSnd.tile2(); else if (k === 'show') { ThSnd.play('vote'); this.t.toast(`${v.seats[v.ev.seat].n} göstergeyi gösterdi: diğerlerinden 1 puan düştü`, 2200); } else if (k === 'fin') ThSnd.play('tada'); }
    }
    if (v.err && v.err.n !== this.errN) { const first = this.errN === 0 && false; this.errN = v.err.n; if (!first) { this.t.toast(OK_ERR[v.err.k] || 'Bu hamle yapılamıyor'); const r = this.q('.ok-rack'); if (r) { r.style.animation = 'thShake .3s'; setTimeout(() => { r.style.animation = ''; }, 320); } } }
    const tk = v.handNo + ':' + v.turn + ':' + (v.stage === 'handEnd');
    if (tk !== this.turnKey) { this.turnKey = tk; if (mine && v.phase === 'play' && v.stage !== 'handEnd') { ThSnd.play('turn'); thVib(15); } }
    this.timer();
  }
}


// ======================= ortak masa: koltuklar, seçenekler, final =======================
const TH_SEATS = { satranc: ['⚪ Beyaz', '⚫ Siyah'], tavla: ['Açık pullar', 'Koyu pullar'], okey: ['1. oyuncu', '2. oyuncu', '3. oyuncu', '4. oyuncu'] };
const TH_DIFFS = ['diff', 'Bilgisayar', [[0, 'Kolay'], [1, 'Orta'], [2, 'Zor']]];
const TH_OPTS = {
  satranc: [['time', 'Süre (kişi başı)', [[0, 'Süresiz'], [3, '3 dk'], [5, '5 dk'], [10, '10 dk']]], TH_DIFFS],
  tavla: [['pts', 'Maç', [[1, 'Tek oyun'], [3, '3 puan'], [5, '5 puan']]], ['sec', 'Hamle süresi', [[30, '30 sn'], [45, '45 sn'], [90, '90 sn']]], TH_DIFFS],
  okey: [['mode', 'Oyun türü', [['duz', 'Düz Okey'], ['101', '101 Okey']]], ['hands', 'El sayısı', [[1, '1 el'], [3, '3 el'], [5, '5 el']]], ['sec', 'Hamle süresi', [[20, '20 sn'], [30, '30 sn'], [45, '45 sn'], [60, '60 sn']]], TH_DIFFS]
};
const TH_INFO = {
  satranc: ['♟️ Satranç', 'İki kişi oynar, diğerleri izler. Boş koltuğa bilgisayar oturur.', ['Taşa dokun, gidebileceği kareler işaretlenir; kareye dokun ya da taşı sürükle.', 'Rok, geçerken alma ve piyon terfisi (vezir, kale, fil, at) var.', 'Pat, üç kez tekrar, 50 hamle ve yetersiz taş beraberliktir.', 'Süreli oyunda süresi biten kaybeder.']],
  tavla: ['🎲 Tavla', 'İki kişi oynar, diğerleri izler. Boş koltuğa bilgisayar oturur.', ['Zar at, pula dokun, gidebileceği haneler yanar; haneye dokun.', 'İki zarı da oynamak zorunlu; yalnız biri oynanabiliyorsa büyük olan oynanır.', 'Kırık pulun varsa önce onu sokarsın. Bütün pullar evdeyken toplamaya başlarsın.', 'Rakip hiç pul toplayamadan bitirirsen mars: 2 puan.']],
  okey: ['🀄 Okey', 'Dört kişilik düz okey. Boş koltuklara bilgisayar oturur, fazla oyuncular izler.', ['Sıran gelince ortadan ya da solundakinin attığı taşı çek, sonra bir taş at.', '14 taşını perlere diz (aynı renk sıralı ya da aynı sayı farklı renk, en az 3 taş) ve 15. taşı atarak bitir. Yedi çiftle de bitilir.', 'Göstergenin bir üstü okeydir (joker). Sahte okey, okey taşının yerine geçer.', 'Herkes 20 puanla başlar. Normal bitiş rakiplerden 2, okey atarak ya da çifte bitiş 4 puan düşürür; gösterge 1 puan.']],
  'okey-101': ['🃏 101 Okey', 'Dört kişilik yüzbir. Boş koltuklara bilgisayar oturur, fazla oyuncular izler.', ['Perlerinin toplamı en az 101 olunca el açarsın (ya da en az 5 çiftle).', 'Açtıktan sonra yeni per indirebilir, masadaki perlere taş işleyebilir, perdeki okeyi gerçek taşıyla değiştirip alabilirsin.', 'Soldan taş alırsan o el kullanmak zorundasın; kullanamazsan geri bırakırsın.', 'Son taşını atan bitirir: −101. Açamayan 202, açan elindeki taşların toplamı kadar ceza yer (çift açan iki katı). Okey atarak ya da elden bitiş cezaları ikiye katlar. En az ceza kazanır.']]
};
TH_CSS.push(`
/* kısa ekranlarda oyun başlayınca tahta, sabit süre çubuğunun hemen altına kayar */
#game-root { scroll-margin-top: calc(4rem + env(safe-area-inset-top, 0px)); }
/* bilgisayar/tablet: tahta, altındaki butonlarla birlikte ekrana sığsın */
@media (min-width: 600px) and (min-height: 521px) {
  .sc > .sc-bd { width: min(100%, calc(100vh - 312px)); width: min(100%, calc(100dvh - 312px)); margin-inline: auto; }
  .tv > .tv-wrap { width: min(100%, calc((100vh - 292px) * .867)); width: min(100%, calc((100dvh - 292px) * .867)); margin-inline: auto; }
}
/* yatay telefon: tahta/masa solda ekran yüksekliğine sığar; oyuncular, butonlar ve ıstaka sağda */
@media (orientation: landscape) and (max-height: 520px) {
  #app.th-wide { max-width: none; }
  .sc, .tv, .ok { grid-template-columns: auto minmax(0, 1fr); grid-template-rows: repeat(7, auto) 1fr; column-gap: 14px; align-items: start; align-content: start; }
  .sc > .sc-bd { grid-column: 1; grid-row: 1 / -1; width: min(56vw, calc(100vh - 84px)); width: min(56vw, calc(100dvh - 84px)); }
  .tv > .tv-wrap { grid-column: 1; grid-row: 1 / -1; width: min(56vw, calc((100vh - 84px) * .867)); width: min(56vw, calc((100dvh - 84px) * .867)); }
  .ok { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
  .ok > .ok-table { grid-column: 1; grid-row: 1 / -1; }
  .sc > :not(.sc-bd), .tv > :not(.tv-wrap), .ok > :not(.ok-table) { grid-column: 2; min-width: 0; }
  .ok-melds { max-height: 84px; }
  .th-msg { margin: 4px 0; }
}
`);
class Table {
  constructor(root, ctx) {
    if (!document.getElementById('th-style')) { const st = document.createElement('style'); st.id = 'th-style'; st.textContent = TH_CSS.join('\n'); document.head.appendChild(st); }
    this.root = root; this.ctx = ctx; this.game = null; this.kind = ''; this.key = ''; this.hideFinal = false; this.finalKey = '';
    root.innerHTML = '<div class="th"><div class="th-body"></div><div class="th-extra"></div><div class="th-emo">' + ['😂', '😎', '🔥', '👏', '😭', '😡', '🤯', '🎉'].map((e) => `<button data-game-action="emote" data-payload=\'{"e":"${e}"}\' aria-label="Tepki ${e}">${e}</button>`).join('') + '</div><div class="th-toast" role="status"></div></div>';
    this.emoSeen = new Set(); this.emoFirst = true;
    this.wrap = root.firstElementChild; this.body = this.wrap.querySelector('.th-body'); this.extra = this.wrap.querySelector('.th-extra'); this.toastEl = this.wrap.querySelector('.th-toast');
    this.wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-th]'); if (!b) return; if (b.dataset.th === 'peek') { this.hideFinal = !this.hideFinal; this.final(); } });
  }
  toast(msg, ms = 2600) { this.toastEl.textContent = msg; this.toastEl.classList.add('on'); clearTimeout(this.toastT); this.toastT = setTimeout(() => this.toastEl.classList.remove('on'), ms); }
  dispose() { if (this.game) this.game.dispose(); this.game = null; clearTimeout(this.toastT); try { document.getElementById('app')?.classList.remove('th-wide'); } catch {} }
  update(ctx) {
    this.ctx = ctx;
    const v = ctx.view;
    // tepkiler: gönderenin adıyla ekranda süzülür
    for (const [pid, e, t] of v.emo || []) {
      const k = pid + ':' + t;
      if (this.emoSeen.has(k)) continue;
      this.emoSeen.add(k);
      if (this.emoFirst) continue;
      const who = (v.scoreboard || []).find((x) => x.id === pid);
      const d = document.createElement('div');
      d.className = 'th-fly';
      d.style.setProperty('--fx', (-50 + (Math.random() - 0.5) * 60).toFixed(0) + '%');
      d.innerHTML = `<i>${thEsc(e)}</i>${thEsc(who ? who.nickname : '')}`;
      this.wrap.appendChild(d);
      setTimeout(() => d.remove(), 2700);
      if (pid !== ctx.me) ThSnd.play('pop');
    }
    this.emoFirst = false;
    if (this.emoSeen.size > 200) this.emoSeen = new Set([...this.emoSeen].slice(-60));
    if (v.phase === 'loading' || v.phase === 'ready') {
      if (this.game) { this.game.dispose(); this.game = null; this.kind = ''; }
      this.hideFinal = false; this.finalKey = '';
      try { document.getElementById('app')?.classList.remove('th-wide'); } catch {}
      this.ready();
      return;
    }
    if (!this.game || this.kind !== v.game) {
      if (this.game) this.game.dispose();
      this.body.innerHTML = ''; this.key = '';
      this.kind = v.game;
      this.game = v.game === 'satranc' ? new ScView(this.body, this) : v.game === 'tavla' ? new TvView(this.body, this) : new OkView(this.body, this);
      try { document.getElementById('app')?.classList.add('th-wide'); } catch {}
      if (innerHeight < 800) requestAnimationFrame(() => { try { this.root.scrollIntoView({ block: 'start' }); } catch {} });
    }
    this.game.update(ctx);
    this.final();
  }
  ready() {
    const { ctx } = this, v = ctx.view, gid = v.gid, info = TH_INFO[gid === 'okey' && v.opt.mode === '101' ? 'okey-101' : gid] || ['', '', []], lbl = TH_SEATS[gid] || [], seats = v.seats || [];
    const key = JSON.stringify([v.phase, seats, v.opt, ctx.isHost, v.me, ctx.hostName]);
    if (key === this.key) return;
    this.key = key;
    if (v.phase === 'loading') { this.body.innerHTML = '<p class="th-hint">Masa hazırlanıyor…</p>'; this.extra.innerHTML = ''; return; }
    const seatH = seats.map((s, i) => {
      const mine = s && s.id === ctx.me;
      return `<button class="th-seat ${s ? '' : 'empty'} ${mine ? 'me' : ''}" data-game-action="sit" data-payload='{"i":${i}}' ${s && !(ctx.isHost && s.cpu) ? 'disabled' : ''}>
        ${s ? `<div class="th-av">${thFace(s.c)}</div>` : '<div class="th-av" style="display:grid;place-items:center;font-size:18px">🤖</div>'}
        <span><small>${thEsc(lbl[i] || '')}</small><b>${s ? thEsc(s.n) + (mine ? ' (sen)' : '') : 'Boş · bilgisayar'}</b></span></button>`;
    }).join('');
    const opts = (TH_OPTS[gid] || []).map(([k, name, vals]) => `<div class="r"><span>${name}</span>${vals.map(([val, lab]) => `<button class="th-chip ${v.opt[k] === val ? 'on' : ''}" ${ctx.isHost ? `data-game-action="opt" data-payload='${JSON.stringify({ k, v: val })}'` : 'disabled'}>${lab}</button>`).join('')}</div>`).join('');
    const humans = seats.filter((s) => s && !s.cpu).length;
    this.body.innerHTML = `<div class="th-card">
      <h2 class="th-h">${info[0]}</h2><p class="th-sub">${info[1]}</p>
      <div class="th-seats">${seatH}</div>
      <p class="th-hint" style="margin-top:8px">${v.me >= 0 ? 'Yerin hazır. <button class="th-mini" data-game-action="stand">İzleyici ol</button>' : seats.some((s) => !s) ? 'Oturmak için boş bir koltuğa dokun.' : 'Koltuklar dolu — bu oyunu izleyeceksin.'}</p>
      <div class="th-opt">${opts}</div>
      ${ctx.isHost ? `<button class="th-btn" data-game-action="go">${humans >= seats.length ? 'Başlat ▶' : humans ? 'Bilgisayarla başlat ▶' : 'Bilgisayarları izle ▶'}</button>` : `<p class="th-hint">Oyunu ${thEsc(ctx.hostName)} başlatacak.</p>`}
      <details class="th-rules" ${this.rulesOpen ? 'open' : ''}><summary>Nasıl oynanır?</summary><ul>${info[2].map((x) => `<li>${x}</li>`).join('')}</ul></details>
    </div>`;
    this.extra.innerHTML = '';
  }
  final() {
    const { ctx } = this, v = ctx.view;
    // izleyici: bilgisayarın koltuğuna oturabilir
    let ex = '';
    if (v.phase === 'play' && v.me < 0) {
      const L = v.seats.map((s, i) => [s, i]).filter(([s]) => s.cpu && (!s.id || true));
      if (L.length) ex = `<div class="th-row" style="margin-top:10px"><span style="font-size:12px;font-weight:800;opacity:.8">Yerine otur:</span>${L.map(([s, i]) => `<button class="th-mini" data-game-action="sit" data-payload='{"i":${i}}'>${thEsc(s.n)}</button>`).join('')}</div>`;
    }
    if (v.phase !== 'final' || !v.res) { if (this.finalKey !== ex) { this.finalKey = ex; this.extra.innerHTML = ex; } return; }
    const r = v.res, S = v.seats, nm = (i) => thEsc(S[i] ? S[i].n : '?');
    const key = 'f' + JSON.stringify([r, ctx.isHost, this.hideFinal]);
    if (key === this.finalKey) return;
    const first = !this.finalKey.startsWith('f');
    this.finalKey = key;
    if (this.hideFinal) { this.extra.innerHTML = `<div class="th-row" style="margin-top:12px"><button class="th-mini hot" data-th="peek">Sonucu göster</button></div>`; return; }
    let big = '🏆', title = '', sub = '', list = '';
    if (v.game === 'satranc') {
      if (r.win < 0) { big = '🤝'; title = 'Berabere'; } else { title = `${nm(r.win)} kazandı`; big = v.me >= 0 && v.me !== r.win ? '😔' : '🏆'; }
      sub = SC_WHY[r.why] || '';
    } else if (v.game === 'tavla') {
      title = `${nm(r.win)} maçı kazandı`; big = v.me >= 0 && v.me !== r.win ? '😔' : '🏆';
      sub = r.why === 'terk' ? 'Rakip maçı bıraktı' : `Skor ${r.score[0]} – ${r.score[1]}`;
    } else {
      const m101 = v.mode === '101';
      title = `${nm(r.rank[0])} kazandı`; big = v.me >= 0 && v.me !== r.rank[0] ? '👏' : '🏆';
      sub = m101 ? 'En az ceza puanı kazanır' : 'En çok puanı kalan kazanır';
      list = `<ol class="th-rank">${r.rank.map((i, k) => `<li class="${k === 0 ? 'w' : ''}"><div class="th-av">${thFace(S[i].c)}</div><span>${k + 1}. ${nm(i)}${i === v.me ? ' (sen)' : ''}</span><b>${r.score[i]}${m101 ? ' ceza' : ' puan'}</b></li>`).join('')}</ol>`;
    }
    this.extra.innerHTML = `<div class="th-final"><div class="th-card"><div class="big">${big}</div><h2 class="th-h">${title}</h2><p class="th-sub">${thEsc(sub)}</p>${list}
      ${ctx.isHost ? '<button class="th-btn" data-game-action="restart">Tekrar oyna 🔁</button><button class="th-btn alt" data-act="exit-game">← Oyunlara dön</button>' : `<p class="th-hint">Yeni oyunu ${thEsc(ctx.hostName)} başlatacak.</p>`}
      <button class="th-btn alt" data-th="peek">${v.game === 'okey' ? 'Masaya bak' : 'Tahtaya bak'}</button></div></div>`;
    if (first) { ThSnd.play('tada'); thVib([30, 40, 60]); }
  }
}
let thCur = null;
export function render(root, ctx) {
  if (!thCur || thCur.root !== root || !root.contains(thCur.wrap)) { if (thCur) thCur.dispose(); thCur = new Table(root, ctx); }
  thCur.update(ctx);
}
export function destroy() { if (thCur) { thCur.dispose(); thCur = null; } }
export function _dbg() { return thCur ? { kind: thCur.kind, game: thCur.game, table: thCur } : null; }
