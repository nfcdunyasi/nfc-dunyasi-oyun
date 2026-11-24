// Blok Adası — bloklardan bir ada: kaz, topla, inşa et (NFC Dünyası Oyun)
// Herkes aynı dünyada. Dünya tohumdan üretilir (sunucuyla birebir aynı üretici), değişiklikler sunucudan akar.
// Kendi küçük blok çizicisi (doku atlası, köşe gölgesi, su, bitkiler) + Kurye Yarışı motorunun karakter/gökyüzü araçları.
import { _eng } from './kuryeYarisi.js?v=2026-11-22-c';
import { _masa } from './masa3d.js?v=2026-11-22-c';
import * as sfx from '../sfx.js?v=2026-11-22-c';
const { EmoteUI, Snd, esc, pcol, vibrate, medal, injectStyle, clamp, lerp, damp, hexRGB, C, shade, M, makeGL, MB, freeMesh, drawMesh, drawSky, useProg, norm3, brandInfo, ONE3, autoRes, podiumHTML } = _eng();
const { styleOf } = _masa();

// ==GEN== (w/blok_gen.js'ten kopyalanır: sunucu ve istemcide birebir aynı olmalı; yalnızca + - * / floor kullanılır)
const BA_W = 64, BA_D = 64, BA_H = 40, BA_SEA = 12;
// bloklar: 0 hava, 1 çimen, 2 toprak, 3 taş, 4 kum, 5 kütük, 6 yaprak, 7 altın, 8 elmas, 9 ana kaya, 10 su,
// 11 kırmızı çiçek, 12 sarı çiçek, 13 uzun ot, 14 sandık, 15 tuğla, 16 tahta, 17 kömür, 18 demir, 19 zümrüt,
// 20..31 renkli blok (oyuncu rengi), 33 dinamit, 34 kar, 35 buz, 36 kumtaşı, 37 kaktüs, 38 magma, 39 obsidyen, 40 bazalt
// haritalar: [simge, ad, kısa tanım]
const BA_MAPS = [
  ['🌳', 'Yeşil Ada', 'Ormanlı tepeler, mağaralar ve kıyıda kumsal'],
  ['🏜️', 'Çöl Vahası', 'Kum tepeleri, vaha ve içi hazine dolu bir piramit'],
  ['🏔️', 'Karlı Dağ', 'Dev bir dağ, donmuş göl ve dağın içinde zümrütler'],
  ['🌋', 'Volkan Adası', 'Lav nehirleri, magma gölleri ve bol elmas'],
  ['🏝️', 'Takımadalar', 'Küçük adalar, aralarında batık bir gemi']
];
function baGen(seed, map) {
  map = map | 0;
  if (map < 0 || map >= BA_MAPS.length) map = 0;
  const W = BA_W, D = BA_D, H = BA_H, SEA = BA_SEA;
  const b = new Uint8Array(W * D * H);
  const hs = (x, y, z) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(seed | 0, 362437);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const vn = (x, z, k) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = hs(xi, k, zi), b1 = hs(xi + 1, k, zi), c = hs(xi, k, zi + 1), d = hs(xi + 1, k, zi + 1);
    return a + (b1 - a) * sx + (c - a) * sz + (a - b1 - c + d) * sx * sz;
  };
  // üç boyutlu gürültü (mağaralar)
  const vn3 = (x, y, z, k) => {
    const yi = Math.floor(y), fy = y - yi, sy = fy * fy * (3 - 2 * fy);
    const a = vn(x, z, k * 131 + yi), c = vn(x, z, k * 131 + yi + 1);
    return a + (c - a) * sy;
  };
  const I = (x, y, z) => (y * D + z) * W + x;
  const hgt = new Int16Array(W * D);
  const CX = W / 2 - 0.5, CZ = D / 2 - 0.5;
  const ox = (vn(seed * 0.001, 3.3, 7) - 0.5) * 4, oz = (vn(5.1, seed * 0.001, 8) - 0.5) * 4;
  // harita öğelerinin yerleri (tohuma göre): A merkeze yakın (vaha, dağ, volkan), B karşı köşe (piramit, göl), C yan köşe (kaya kulesi)
  const d2 = (x, z, c) => (x - c[0]) * (x - c[0]) + (z - c[1]) * (z - c[1]);
  const A = [CX + (hs(1, 601, 3) - 0.5) * 14, CZ + (hs(1, 602, 3) - 0.5) * 14];
  const B = [A[0] < CX ? CX + 12.5 : CX - 12.5, A[1] < CZ ? CZ + 11.5 : CZ - 11.5];
  const Cq = [A[0] < CX ? CX - 14 : CX + 14, A[1] < CZ ? CZ + 13 : CZ - 13];
  const ISL = [];
  if (map === 4) {
    ISL.push([CX + (hs(9, 610, 1) - 0.5) * 6, CZ + (hs(9, 611, 1) - 0.5) * 6, 11]);
    for (let k = 0; k < 80 && ISL.length < 6; k++) {
      const c = [7 + hs(k, 612, 1) * (W - 14), 7 + hs(k, 613, 1) * (D - 14), 6 + hs(k, 614, 1) * 3.5];
      let ok = true;
      for (const q of ISL) if (d2(c[0], c[1], q) < (c[2] + q[2] + 4) * (c[2] + q[2] + 4)) { ok = false; break; }
      if (ok) ISL.push(c);
    }
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const dx = (x - CX - ox) / 27.5, dz = (z - CZ - oz) / 27.5;
    const r2 = dx * dx + dz * dz;
    const n = vn(x * 0.085, z * 0.085, 1) * 2 - 1, n2 = vn(x * 0.24, z * 0.24, 2) * 2 - 1, hill = vn(x * 0.055 + 2, z * 0.055 + 2, 3);
    const edge = 1 - r2 * (1 + 0.38 * n);
    let h;
    if (map === 1) {
      // çöl: sırtlı kum tepeleri, ortada vaha çukuru, köşede kaya kulesi, piramidin tabanı düz
      const rd = vn((x + z * 0.4) * 0.12, (z - x * 0.25) * 0.05, 4) * 2 - 1, ridge = 1 - (rd < 0 ? -rd : rd);
      const e1 = edge > 0 ? (edge < 0.5 ? edge * 2 : 1) : 0;
      h = SEA - 1 + edge * 6.5 + n * 1.2 + n2 * 0.5 + ridge * ridge * 5 * e1;
      const od = d2(x, z, A);
      if (od < 26) h = SEA - 2 - (od < 9 ? 1 : 0);
      else if (od < 90) { const t = SEA + 1 + (od - 26) * 0.06; if (h > t) h = t; }
      const md = d2(x, z, Cq);
      if (md < 22) h = SEA + 14 + n2 * 0.6;
      else if (md < 34 && h < SEA + 9) h = SEA + 9;
      if ((x - B[0] < 0 ? B[0] - x : x - B[0]) <= 9 && (z - B[1] < 0 ? B[1] - z : z - B[1]) <= 9) h = SEA + 3;
    } else if (map === 2) {
      // karlı dağ: ortada sivri dağ, karşı köşede donmuş göl
      const md = d2(x, z, A), mt = md < 400 ? 1 - md / 400 : 0;
      const rg = vn(x * 0.16, z * 0.16, 5) - 0.5;
      h = SEA - 1 + edge * 6 + n * 1.8 + n2 * 0.6 + mt * mt * 15 + mt * rg * 7 + (mt > 0.62 ? (mt - 0.62) * 10 : 0);
      const ld = d2(x, z, B);
      if (ld < 28) h = SEA - 2 - (ld < 10 ? 1 : 0);
      else if (ld < 70) { const t = SEA + 1 + (ld - 28) * 0.05; if (h > t) h = t; }
    } else if (map === 3) {
      // volkan: koni ve tepesinde krater
      const vd = d2(x, z, A), cone = vd < 330 ? 1 - vd / 330 : 0;
      h = SEA - 1 + edge * 6 + n * 1.6 + n2 * 0.6 + cone * 16.5 + cone * (vn(x * 0.21, z * 0.21, 6) - 0.5) * 3;
      if (vd < 21) h = SEA + 14 - (vd < 8 ? 1 : 0);
    } else if (map === 4) {
      // takımadalar: aralarında derin su olan küçük adalar
      let best = -9;
      for (const c of ISL) { const e = 1 - d2(x, z, c) / (c[2] * c[2]); if (e > best) best = e; }
      if (best > 0) h = SEA - 3 + best * (7 + hill * 7) + n * 1.4 + n2 * 0.7;
      else h = SEA - 5 + (best < -1.5 ? -1.5 : best) * 2 + n * 1.2;
    } else h = SEA - 1 + edge * 7.5 + n * 2.4 + n2 * 0.9 + (hill > 0.5 ? (hill - 0.5) * 30 * (edge > 0 ? edge : 0) : 0);
    h = Math.floor(h);
    if (h < 2) h = 2;
    const top = map === 2 || map === 3 ? H - 5 : H - 10;
    if (h > top) h = top;
    hgt[z * W + x] = h;
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = hgt[z * W + x];
    const beach = h <= SEA + 1;
    if (map === 1) {
      const green = d2(x, z, A) < 110 && h > SEA && h <= SEA + 3, mesa = d2(x, z, Cq) < 34;
      for (let y = 0; y <= h; y++) {
        let t = 3;
        if (y === 0) t = 9;
        else if (green && y === h) t = 1;
        else if (green && y > h - 3) t = 2;
        else if (mesa && y > SEA) t = y % 4 === 0 ? 4 : 36;
        else if (y > h - 3) t = 4;
        else if (y > h - 8 && y >= SEA - 2) t = 36;
        b[I(x, y, z)] = t;
      }
    } else if (map === 2) {
      let lo = h;
      if (x > 0 && hgt[z * W + x - 1] < lo) lo = hgt[z * W + x - 1];
      if (x < W - 1 && hgt[z * W + x + 1] < lo) lo = hgt[z * W + x + 1];
      if (z > 0 && hgt[(z - 1) * W + x] < lo) lo = hgt[(z - 1) * W + x];
      if (z < D - 1 && hgt[(z + 1) * W + x] < lo) lo = hgt[(z + 1) * W + x];
      const steep = h > SEA + 6 && h - lo >= 3;
      for (let y = 0; y <= h; y++) {
        let t = 3;
        if (y === 0) t = 9;
        else if (y === h) t = beach ? 4 : steep ? 3 : 34;
        else if (h < SEA + 12 && y > h - 4) t = beach && y > h - 3 ? 4 : 2;
        b[I(x, y, z)] = t;
      }
    } else if (map === 3) {
      const vd = d2(x, z, A), rock = vd < 330 && 1 - vd / 330 > 0.32;
      for (let y = 0; y <= h; y++) {
        let t = 3;
        if (y === 0) t = 9;
        else if (rock) { if (y > h - 5) t = y === h && vd < 64 && hs(x, 91, z) < 0.3 ? 39 : 40; }
        else if (y === h) t = beach ? 4 : 1;
        else if (y > h - 4) t = beach && y > h - 3 ? 4 : 2;
        b[I(x, y, z)] = t;
      }
      if (vd < 21) { b[I(x, h, z)] = 38; b[I(x, h - 1, z)] = 38; }
    } else {
      for (let y = 0; y <= h; y++) {
        let t = 3;
        if (y === 0) t = 9;
        else if (y === h) t = beach ? 4 : 1;
        else if (y > h - 4) t = beach && y > h - 3 ? 4 : 2;
        b[I(x, y, z)] = t;
      }
    }
    for (let y = h + 1; y <= SEA; y++) b[I(x, y, z)] = 10;
    if (map === 2 && h < SEA && d2(x, z, B) < 70) b[I(x, SEA, z)] = 35;   // donmuş göl
  }
  // çöl: kumtaşından piramit; içinde hazine odası, tepesinde altın
  if (map === 1) {
    const px = Math.floor(B[0]), pz = Math.floor(B[1]), y0 = SEA + 4;
    for (let k = 0; k <= 7; k++) for (let dz = k - 7; dz <= 7 - k; dz++) for (let dx = k - 7; dx <= 7 - k; dx++) b[I(px + dx, y0 + k, pz + dz)] = 36;
    for (let y = y0 + 1; y <= y0 + 3; y++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) b[I(px + dx, y, pz + dz)] = 0;
    for (let dz = -7; dz < -2; dz++) { b[I(px, y0 + 1, pz + dz)] = 0; b[I(px, y0 + 2, pz + dz)] = 0; }
    b[I(px, y0 + 1, pz + 1)] = 14;
    b[I(px - 2, y0 + 1, pz + 2)] = 7; b[I(px + 2, y0 + 1, pz + 2)] = 7; b[I(px - 2, y0 + 1, pz - 1)] = 7; b[I(px + 2, y0 + 1, pz - 1)] = 7;
    b[I(px, y0 + 7, pz)] = 7;
  }
  // maden damarları: derine indikçe değerlisi çıkar (haritaya göre bolluk değişir)
  const vein = (t, count, y0, y1, len) => {
    for (let k = 0; k < count; k++) {
      let x = Math.floor(hs(k, t, 101) * W), z = Math.floor(hs(k, t, 102) * D), y = y0 + Math.floor(hs(k, t, 103) * (y1 - y0 + 1));
      for (let s = 0; s < len; s++) {
        if (x >= 0 && z >= 0 && x < W && z < D && y >= 1 && y < H && b[I(x, y, z)] === 3) b[I(x, y, z)] = t;
        const dir = Math.floor(hs(k * 31 + s, t, 104) * 6);
        if (dir === 0) x += 1; else if (dir === 1) x -= 1; else if (dir === 2) z += 1; else if (dir === 3) z -= 1; else if (dir === 4) y += 1; else y -= 1;
        if (y < y0) y = y0;
        if (y > y1) y = y1;
      }
    }
  };
  const OR = map === 1 ? [200, 140, 140, 54, 40] : map === 2 ? [220, 200, 90, 70, 44] : map === 3 ? [170, 140, 130, 54, 70] : [230, 150, 95, 54, 44];
  vein(17, OR[0], 4, SEA + 12, 6);
  vein(18, OR[1], 2, SEA + 4, 5);
  vein(7, OR[2], 1, SEA - 2, 4);
  vein(19, OR[3], 1, SEA - 5, 3);
  vein(8, OR[4], 1, 4, 3);
  if (map === 2) vein(19, 34, SEA + 6, SEA + 18, 3);   // dağın içinde zümrüt
  if (map === 3) vein(7, 36, SEA, SEA + 9, 4);          // volkanın içinde altın
  // mağaralar: yalnızca karanın altında (denize komşu sütunlara dokunmaz)
  const land = (x, z) => x >= 1 && z >= 1 && x < W - 1 && z < D - 1 && hgt[z * W + x] > SEA + 1 && hgt[z * W + x - 1] > SEA && hgt[z * W + x + 1] > SEA && hgt[(z - 1) * W + x] > SEA && hgt[(z + 1) * W + x] > SEA;
  for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (!land(x, z)) continue;
    const h = hgt[z * W + x];
    for (let y = 2; y < h - 4; y++) {
      const c = vn3(x * 0.115, y * 0.19, z * 0.115, 21), c2 = vn3(x * 0.085 + 5, y * 0.13, z * 0.085 + 5, 22), c3 = vn3(x * 0.06, y * 0.1 + 3, z * 0.06, 23);
      const tun = c - 0.5, tunA = tun < 0 ? -tun : tun;
      if ((tunA < 0.05 && c2 > 0.42) || c3 > 0.73) b[I(x, y, z)] = 0;
    }
  }
  const near = (got, x, z, gap) => { for (const t of got) if ((t[0] - x) * (t[0] - x) + (t[1] - z) * (t[1] - z) < gap) return true; return false; };
  if (map === 3) {
    // lav nehirleri: kraterden üç yöne, yamaç boyunca kıvrılarak; kenarları soğuyup obsidyen olmuş
    const DIRS = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
    const used = [];
    for (let r = 0; r < 3; r++) {
      let k = Math.floor(hs(r, 620, 5) * 8);
      while (used.includes(k)) k = (k + 3) % 8;
      used.push(k);
      const d = DIRS[k];
      for (let s = 5; s < 25; s++) {
        const w = (vn(s * 0.3, r * 7.1, 9) - 0.5) * 4;
        const x = Math.floor(A[0] + d[0] * s - d[1] * w), z = Math.floor(A[1] + d[1] * s + d[0] * w);
        if (x < 2 || z < 2 || x >= W - 2 || z >= D - 2) break;
        const h = hgt[z * W + x];
        if (h <= SEA + 1) break;
        b[I(x, h, z)] = 38;
        b[I(x, h - 1, z)] = 38;
        const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let q = 0; q < 4; q++) {
          const xx = x + sides[q][0], zz = z + sides[q][1], hh = hgt[zz * W + xx];
          if (b[I(xx, hh, zz)] !== 38) b[I(xx, hh, zz)] = 39;
        }
      }
    }
    // en derindeki mağaraların tabanında magma gölleri
    for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) for (let y = 2; y <= 3; y++) if (b[I(x, y, z)] === 0 && b[I(x, y - 1, z)] !== 0) b[I(x, y, z)] = 38;
  }
  if (map === 1) {
    // vahanın çevresinde palmiyeler, kumda kaktüsler
    const got = [];
    for (let z = 5; z < D - 5; z++) for (let x = 5; x < W - 5; x++) {
      const h = hgt[z * W + x], t0 = b[I(x, h, z)];
      if (h > H - 12 || b[I(x, h + 1, z)] !== 0) continue;
      const od = d2(x, z, A);
      if (t0 === 1 && od > 26 && hs(x, 77, z) < 0.1) {
        if (near(got, x, z, 13)) continue;
        got.push([x, z]);
        const th = 5 + (hs(x, 78, z) < 0.5 ? 1 : 0), lx = hs(x, 79, z) < 0.5 ? 1 : -1;
        let cx = x;
        for (let k = 1; k <= th; k++) { if (k === th - 1) cx += lx; b[I(cx, h + k, z)] = 5; }
        const ty = h + th;
        const leaf = (xx, yy, zz) => { if (b[I(xx, yy, zz)] === 0) b[I(xx, yy, zz)] = 6; };
        leaf(cx, ty + 1, z);
        const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let q = 0; q < 4; q++) {
          const ax = arms[q][0], az = arms[q][1];
          leaf(cx + ax, ty + 1, z + az); leaf(cx + ax * 2, ty + 1, z + az * 2); leaf(cx + ax * 3, ty, z + az * 3);
          leaf(cx + ax + az, ty, z + az - ax);
        }
      } else if (t0 === 4 && h > SEA + 1 && hs(x, 76, z) < 0.016) {
        if (near(got, x, z, 9)) continue;
        got.push([x, z]);
        const ch = 2 + (hs(x, 75, z) < 0.4 ? 1 : 0);
        for (let k = 1; k <= ch; k++) b[I(x, h + k, z)] = 37;
      }
    }
  } else if (map === 2) {
    // karlı çam ağaçları (konik), tepelerinde kar
    const got = [];
    for (let z = 3; z < D - 3; z++) for (let x = 3; x < W - 3; x++) {
      const h = hgt[z * W + x];
      if (b[I(x, h, z)] !== 34 || h > SEA + 11 || b[I(x, h + 1, z)] !== 0) continue;
      if (hs(x, 77, z) > 0.05 || near(got, x, z, 12)) continue;
      got.push([x, z]);
      const th = 5 + (hs(x, 78, z) > 0.5 ? 1 : 0), top = h + th;
      for (let k = 1; k <= th; k++) b[I(x, h + k, z)] = 5;
      const lay = [[top + 1, 0], [top, 1], [top - 1, 2], [top - 2, 1], [top - 3, 2], [top - 4, 1]];
      for (let q = 0; q < lay.length; q++) {
        const yy = lay[q][0], R = lay[q][1];
        if (yy <= h + 1) continue;
        for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
          if (R === 2 && (dx < 0 ? -dx : dx) + (dz < 0 ? -dz : dz) > 2) continue;
          if (R === 1 && yy === top && dx !== 0 && dz !== 0) continue;
          if (b[I(x + dx, yy, z + dz)] === 0) b[I(x + dx, yy, z + dz)] = 6;
        }
      }
      if (b[I(x, top + 2, z)] === 0) b[I(x, top + 2, z)] = 34;
    }
  } else {
    // ağaçlar (aralarında en az 4 blok)
    const trees = [];
    const dens = map === 3 ? 0.06 : map === 4 ? 0.07 : 0.045;
    for (let z = 3; z < D - 3; z++) for (let x = 3; x < W - 3; x++) {
      const h = hgt[z * W + x];
      if (b[I(x, h, z)] !== 1 || h > H - 11) continue;
      if (hs(x, 77, z) > dens) continue;
      let nearT = false;
      for (const t of trees) if ((t[0] - x) * (t[0] - x) + (t[1] - z) * (t[1] - z) < 17) { nearT = true; break; }
      if (nearT) continue;
      trees.push([x, z]);
      const th = 4 + (hs(x, 78, z) > 0.5 ? 1 : 0);
      for (let k = 1; k <= th; k++) b[I(x, h + k, z)] = 5;
      const top = h + th;
      for (let dy = -2; dy <= 1; dy++) {
        const R = dy >= 0 ? 1 : 2;
        for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
          if (R === 2 && (dx === -2 || dx === 2) && (dz === -2 || dz === 2) && hs(x + dx, top + dy, z + dz) < 0.6) continue;
          if (dy === 1 && dx !== 0 && dz !== 0) continue;
          const xx = x + dx, yy = top + dy, zz = z + dz;
          if (xx < 0 || zz < 0 || xx >= W || zz >= D || yy >= H) continue;
          if (b[I(xx, yy, zz)] === 0) b[I(xx, yy, zz)] = 6;
        }
      }
    }
  }
  // takımadalar: adaların arasındaki derin suda batık gemi (iki sandık, altın)
  if (map === 4) {
    let wr = null;
    for (let k = 0; k < 500 && !wr; k++) {
      const x = 8 + Math.floor(hs(k, 630, 2) * (W - 16)), z = 8 + Math.floor(hs(k, 631, 2) * (D - 16));
      let ok = true;
      for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -6; dx <= 6 && ok; dx++) if (hgt[(z + dz) * W + x + dx] > SEA - 4) ok = false;
      if (ok) wr = [x, z];
    }
    if (wr) {
      const sx = wr[0], sz = wr[1];
      let y0 = 0;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -5; dx <= 5; dx++) { const hh = hgt[(sz + dz) * W + sx + dx]; if (hh > y0) y0 = hh; }
      y0 += 1;
      for (let dx = -5; dx <= 5; dx++) {
        const w = dx < -3 || dx > 3 ? 1 : 2;
        for (let dz = -w; dz <= w; dz++) {
          b[I(sx + dx, y0, sz + dz)] = 16;
          if (dz === -w || dz === w || dx === -5 || dx === 5) {
            b[I(sx + dx, y0 + 1, sz + dz)] = 16;
            if ((dx + dz + 9) % 3 !== 0) b[I(sx + dx, y0 + 2, sz + dz)] = 16;
          }
        }
      }
      for (let k = 1; k <= 6; k++) b[I(sx - 1, y0 + k, sz)] = 5;
      b[I(sx + 2, y0 + 1, sz)] = 14; b[I(sx - 3, y0 + 1, sz)] = 14;
      b[I(sx + 3, y0 + 1, sz + 1)] = 7; b[I(sx + 1, y0 + 1, sz - 1)] = 7;
    }
  }
  // sandıklar: yüzeyde 6, mağaralarda 10 (birbirinden uzak)
  const place = (cand, n, gap) => {
    cand.sort((p, q) => q[0] - p[0]);
    const got = [];
    for (const c of cand) {
      if (got.length >= n) break;
      let nr = false;
      for (const k of got) if ((k[0] - c[1]) * (k[0] - c[1]) + (k[1] - c[2]) * (k[1] - c[2]) < gap) { nr = true; break; }
      if (nr) continue;
      got.push([c[1], c[2]]);
      b[I(c[1], c[3], c[2])] = 14;
    }
  };
  const surf = (t) => (map === 0 ? t === 1 : map === 2 ? t === 34 : map === 3 ? t === 1 || t === 40 : t === 1 || t === 4);
  const c1 = [], c2 = [];
  for (let z = 4; z < D - 4; z++) for (let x = 4; x < W - 4; x++) {
    const h = hgt[z * W + x];
    if (surf(b[I(x, h, z)]) && b[I(x, h + 1, z)] === 0) c1.push([hs(x, 99, z), x, z, h + 1]);
    for (let y = 2; y < h - 6; y++) if (b[I(x, y, z)] === 0 && b[I(x, y - 1, z)] === 3 && b[I(x, y + 1, z)] === 0) { c2.push([hs(x, 98 + y, z), x, z, y]); break; }
  }
  place(c1, 6, 100);
  place(c2, 10, 64);
  // çiçekler ve otlar
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = hgt[z * W + x];
    if (b[I(x, h, z)] !== 1 || b[I(x, h + 1, z)] !== 0) continue;
    const r = hs(x, 88, z);
    if (r < 0.04) b[I(x, h + 1, z)] = 11;
    else if (r < 0.075) b[I(x, h + 1, z)] = 12;
    else if (r < 0.2) b[I(x, h + 1, z)] = 13;
  }
  return { W, D, H, SEA, b, hgt, map };
}
// ==/GEN==

const W = BA_W, D = BA_D, H = BA_H, SEA = BA_SEA, TAU = Math.PI * 2;
const CH = 8, NCX = W / CH, NCZ = D / CH;
const REACH = 6.3;
const HARD = { 1: 0.5, 2: 0.45, 3: 0.9, 4: 0.4, 5: 0.75, 6: 0.15, 7: 1.15, 8: 1.5, 11: 0.05, 12: 0.05, 13: 0.05, 14: 0.6, 15: 1.0, 16: 0.7, 17: 0.9, 18: 1.05, 19: 1.3, 34: 0.3, 35: 0.5, 36: 0.75, 37: 0.35, 39: 2.4, 40: 1.05 };
const NAME = { 1: 'Çimen', 2: 'Toprak', 3: 'Taş', 4: 'Kum', 5: 'Kütük', 6: 'Yaprak', 7: 'Altın', 8: 'Elmas', 17: 'Kömür', 18: 'Demir', 19: 'Zümrüt', 33: 'Dinamit', 14: 'Sandık', 15: 'Tuğla', 16: 'Tahta', 34: 'Kar', 35: 'Buz', 36: 'Kumtaşı', 37: 'Kaktüs', 38: 'Magma 🔥', 39: 'Obsidyen', 40: 'Bazalt' };
const PTS = { 17: 1, 18: 2, 7: 4, 19: 7, 8: 12, 14: 5 };
const ORE_LBL = { 17: ['⚫', 'Kömür'], 18: ['🟠', 'Demir'], 7: ['🪙', 'Altın'], 19: ['🟢', 'Zümrüt'], 8: ['💎', 'Elmas'], 14: ['🎁', 'Sandık'] };
const ORE_RGB = { 17: '#5b5b66', 18: '#e2a074', 7: '#ffd23f', 19: '#3fe07a', 8: '#7df9ff', 14: '#ffb347' };
const isSolid = (t) => (t >= 1 && t <= 9) || (t >= 14 && t <= 19) || t >= 20;
const isPlant = (t) => t >= 11 && t <= 13;
const isCube = (t) => isSolid(t);                       // tam küp (yaprak dahil)
const hides = (t) => isSolid(t) && t !== 6;             // arkasındaki yüzü tamamen kapatır
const mat = (t) => (t === 3 || t === 7 || t === 8 || t === 9 || t === 15 || t === 17 || t === 18 || t === 19 || t === 35 || t === 36 || t === 38 || t === 39 || t === 40 ? 'stone' : t === 5 || t === 14 || t === 16 ? 'wood' : t === 6 || t === 37 || isPlant(t) ? 'leaf' : t === 4 || t === 34 ? 'sand' : t >= 20 ? 'block' : 'dirt');
const I = (x, y, z) => (y * D + z) * W + x;

/* ============================ stil ============================ */
const STYLE = `
#ky.ba{background:#8fd0ff;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
#ky.ba canvas.ba-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#ky.ba .hud{z-index:6;pointer-events:none}
#ky.ba .hud .ib,#ky.ba .hud .ex{pointer-events:auto}
#ky.ba .msg{z-index:7;pointer-events:none}
#ky.ba .panel{z-index:9}
#ky.ba .ba-x{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;pointer-events:none;z-index:3;opacity:.9}
#ky.ba .ba-x:before,#ky.ba .ba-x:after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1.5px rgba(0,0,0,.45);border-radius:2px}
#ky.ba .ba-x:before{left:10px;top:2px;width:2px;height:18px}
#ky.ba .ba-x:after{top:10px;left:2px;height:2px;width:18px}
#ky.ba .ba-x.on:before,#ky.ba .ba-x.on:after{background:#ffd23f}
#ky.ba .ba-tgt{position:absolute;left:50%;top:calc(50% + 18px);transform:translateX(-50%);font-weight:800;font-size:12px;color:#fff;background:rgba(12,10,26,.5);border-radius:99px;padding:2px 9px;pointer-events:none;z-index:3;white-space:nowrap}
#ky.ba .ba-tgt:empty{display:none}
#ky.ba .ba-bar{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);display:flex;gap:5px;z-index:5;padding:5px;border-radius:16px;background:rgba(12,10,26,.45)}
#ky.ba .ba-slot{position:relative;width:46px;height:46px;border-radius:11px;border:3px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);padding:5px;cursor:pointer;-webkit-tap-highlight-color:transparent}
#ky.ba .ba-slot .ic{width:100%;height:100%;border-radius:4px;image-rendering:pixelated;background-size:800% 800%;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
#ky.ba .ba-slot b{position:absolute;right:2px;bottom:0;font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 0 #000,0 0 3px #000}
#ky.ba .ba-slot.on{border-color:#ffd23f;background:rgba(255,210,63,.3);transform:translateY(-3px)}
#ky.ba .ba-slot.no{opacity:.38}
#ky.ba .ba-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 78px);display:grid;grid-template-columns:auto auto;gap:10px;z-index:5;align-items:end}
#ky.ba .ba-b{width:64px;height:64px;border-radius:99px;border:4px solid rgba(255,255,255,.75);background:rgba(12,10,26,.42);color:#fff;font-size:28px;line-height:1;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;box-shadow:0 4px 0 rgba(0,0,0,.25)}
#ky.ba .ba-b.big{width:78px;height:78px;font-size:34px}
#ky.ba .ba-b.on{background:rgba(255,210,63,.75);border-color:#fff;transform:scale(.94)}
#ky.ba .ba-b small{display:block;font-size:10px;font-weight:800;margin-top:-6px}
#ky.ba .ba-view{position:absolute;right:calc(env(safe-area-inset-right,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 62px);z-index:5;width:44px;height:44px;border-radius:99px;border:3px solid rgba(255,255,255,.7);background:rgba(12,10,26,.42);color:#fff;font-size:20px;cursor:pointer}
#ky.ba .ba-joy{position:absolute;left:0;top:0;width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:99px;background:rgba(255,255,255,.14);border:3px solid rgba(255,255,255,.55);pointer-events:none;display:none;z-index:4}
#ky.ba .ba-joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:99px;background:rgba(255,255,255,.72);border:3px solid rgba(12,10,26,.55)}
#ky.ba .ba-joyhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 26px);bottom:calc(env(safe-area-inset-bottom,0px) + 90px);width:96px;height:96px;border-radius:99px;border:3px dashed rgba(255,255,255,.5);display:grid;place-items:center;color:#fff;font-size:12px;font-weight:800;text-align:center;pointer-events:none;z-index:3;text-shadow:0 1px 2px #000}
#ky.ba .ba-lb{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);top:calc(env(safe-area-inset-top,0px) + 62px);display:grid;gap:3px;z-index:4;pointer-events:none}
#ky.ba .ba-lb div{display:flex;align-items:center;gap:6px;font-weight:800;font-size:12px;color:#fff;background:rgba(12,10,26,.5);border-radius:99px;padding:2px 9px 2px 4px;width:max-content}
#ky.ba .ba-lb div i{width:12px;height:12px;border-radius:99px;border:2px solid #fff}
#ky.ba .ba-lb div.me{background:rgba(255,210,63,.88);color:#1c1633}
#ky.ba .ba-tags{position:absolute;inset:0;pointer-events:none;z-index:2}
#ky.ba .ba-tag{position:absolute;left:0;top:0;font-weight:800;font-size:12px;color:#fff;background:rgba(12,10,26,.55);border-radius:99px;padding:2px 8px;white-space:nowrap;will-change:transform;display:flex;gap:5px;align-items:center}
#ky.ba .ba-tag i{width:9px;height:9px;border-radius:99px}
#ky.ba .ba-feed{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);bottom:calc(env(safe-area-inset-bottom,0px) + 190px);display:grid;gap:4px;pointer-events:none;z-index:3;max-width:62%}
#ky.ba .ba-feed div{font-weight:700;font-size:12.5px;background:rgba(12,10,26,.6);color:#fff;border-radius:10px;padding:3px 9px;width:max-content;max-width:100%;animation:baf 4.5s ease-out forwards}
@keyframes baf{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
#ky.ba .ba-pop{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-weight:900;font-size:34px;color:#ffd23f;text-shadow:0 3px 0 #1c1633,0 0 18px rgba(255,210,63,.7);pointer-events:none;z-index:6;animation:bap 1.4s ease-out forwards;white-space:nowrap}
#ky.ba .ba-got{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);bottom:calc(env(safe-area-inset-bottom,0px) + 180px);font:900 12.5px system-ui,sans-serif;color:#fff;background:rgba(12,10,26,.55);border-radius:10px;padding:4px 8px;pointer-events:none;z-index:4;white-space:nowrap}
#ky.ba .ba-got:empty{display:none}
#ky.ba .ba-pop.emer{color:#5dffa0;text-shadow:0 3px 0 #0e3320,0 0 18px rgba(93,255,160,.8)}
#ky.ba .ba-pop.sm{font-size:22px;top:44%}
#ky.ba .ba-det{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 58px);transform:translateX(-50%);font-weight:900;font-size:13px;letter-spacing:.02em;background:rgba(12,10,26,.62);border-radius:99px;padding:4px 12px;pointer-events:none;z-index:4;white-space:nowrap;opacity:0;transition:opacity .2s}
#ky.ba .ba-det.on{opacity:1}
#ky.ba .ba-det.l3{animation:bdet .5s ease-in-out infinite alternate;box-shadow:0 0 0 2px currentColor}
@keyframes bdet{to{transform:translateX(-50%) scale(1.12)}}
#ky.ba .ba-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:3}
#ky.ba .ba-b[data-b="tnt"]{position:relative}
#ky.ba .ba-b[data-b="tnt"] u{position:absolute;right:-4px;top:-6px;min-width:20px;height:20px;border-radius:99px;background:#ffd23f;color:#1c1633;font:900 12px system-ui,sans-serif;display:grid;place-items:center;text-decoration:none;border:2px solid #1c1633}
#ky.ba .ba-b[data-b="tnt"].no{opacity:.45}
#ky.ba .ba-tool{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);bottom:calc(env(safe-area-inset-bottom,0px) + 150px);font:900 12px system-ui,sans-serif;color:#fff;background:rgba(12,10,26,.55);border-radius:10px;padding:4px 8px;pointer-events:none;z-index:4}
#ky.ba .ba-pop.gem{color:#7df9ff;text-shadow:0 3px 0 #10224a,0 0 18px rgba(125,249,255,.8)}
@keyframes bap{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}70%{opacity:1;transform:translate(-50%,-70%) scale(1)}100%{opacity:0;transform:translate(-50%,-95%) scale(.95)}}
#ky.ba .ba-hint{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 112px);font-weight:800;font-size:13px;color:#fff;background:rgba(12,10,26,.6);border-radius:99px;padding:5px 14px;pointer-events:none;z-index:4;text-align:center;max-width:90%;transition:opacity .6s}
#ky.ba .ba-hint:empty{display:none}
#ky.ba .ba-dur{display:flex;gap:6px;justify-content:center;margin:8px 0 2px}
#ky.ba .ba-dur button{border-radius:99px;border:3px solid #1c1633;background:#fff;color:#1c1633;font-weight:800;padding:4px 12px;font-size:13px}
#ky.ba .ba-dur button.on{background:#ffd23f}
#ky.ba .ba-dur span{font-weight:800;font-size:13px;opacity:.75}
#ky.ba .ba-map{gap:5px;align-items:center;flex-wrap:wrap}
#ky.ba .ba-map button{padding:1px 7px;font-size:18px;line-height:1.25}
@media (max-width:400px){#ky.ba .ba-map span{display:none}#ky.ba .ba-map{gap:4px}#ky.ba .ba-map button{padding:1px 5px;font-size:17px}}
#ky.ba .panel.low .card{max-height:62vh;overflow:auto}
#ky.ba .panel .card{max-height:calc(100% - 12px);overflow:auto;overscroll-behavior:contain}
@media (max-height:660px){#ky.ba .panel .how>div small,#ky.ba .panel .card .sub{display:none}#ky.ba .panel .card{padding-top:10px;padding-bottom:10px}}
#ky.ba .panel.low .how>div small{font-size:11.5px}
#ky.ba .panel.low .how{gap:4px}
@media (min-aspect-ratio:5/4){#ky.ba .panel.low{justify-content:center;align-items:flex-start;background:linear-gradient(rgba(10,8,24,.45),transparent 60%)}#ky.ba .panel.low .card{max-width:min(380px,60vw);max-height:calc(100% - 100px)}}
@media (min-aspect-ratio:5/4) and (max-height:500px){#ky.ba .panel.low .how{display:none}}
@media (max-aspect-ratio:5/4){#ky.ba .panel.low{align-items:flex-start;padding-top:calc(env(safe-area-inset-top,0px) + 58px);background:linear-gradient(rgba(10,8,24,.45),transparent 55%)}#ky.ba .panel.low .card{max-height:calc(100% - 230px)}}
@media (max-aspect-ratio:5/4) and (max-height:700px){#ky.ba .panel.low .how{display:none}}
#ky.ba table.ba-res{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
#ky.ba table.ba-res td,#ky.ba table.ba-res th{padding:3px 4px;text-align:center;white-space:nowrap}
#ky.ba table.ba-res td.n{text-align:left;font-weight:800;max-width:110px;overflow:hidden;text-overflow:ellipsis}
#ky.ba table.ba-res tr.me td{background:rgba(255,210,63,.35)}
#ky.ba table.ba-res td.t{font-weight:900}
#ky.ba table.ba-res i{display:inline-block;width:10px;height:10px;border-radius:99px;margin-right:4px;vertical-align:-1px}
#ky.ba.play .panel.on{display:none}
@media (orientation:landscape) and (max-height:520px){
  #ky.ba .ba-btns{bottom:calc(env(safe-area-inset-bottom,0px) + 14px)}
  #ky.ba .ba-bar{bottom:calc(env(safe-area-inset-bottom,0px) + 6px)}
  #ky.ba .ba-slot{width:40px;height:40px}
  #ky.ba .ba-feed{bottom:calc(env(safe-area-inset-bottom,0px) + 128px)}
  #ky.ba .ba-joyhint{bottom:calc(env(safe-area-inset-bottom,0px) + 20px)}
  #ky.ba .ba-hint{top:calc(env(safe-area-inset-top,0px) + 94px)}
}
#ky.ba.flat .ba-btns,#ky.ba.flat .ba-bar,#ky.ba.flat .ba-x,#ky.ba.flat .ba-view,#ky.ba.flat .ba-joyhint{display:none}
`;
function styleBA() {
  if (document.getElementById('ba-style')) return;
  const st = document.createElement('style');
  st.id = 'ba-style';
  st.textContent = STYLE;
  document.head.appendChild(st);
}

/* ============================ doku atlası (16 piksellik karolar, 8×8) ============================ */
const T = { grassTop: 0, grassSide: 1, dirt: 2, stone: 3, sand: 4, logSide: 5, logTop: 6, leaves: 7, gold: 8, gem: 9, bedrock: 10, water: 11, rose: 12, daisy: 13, tall: 14, chestSide: 15, chestTop: 16, chestFront: 17, brick: 18, planks: 19, color0: 20, crack0: 32, white: 42, coal: 43, iron: 44, emer: 45, tnt: 46, tntTop: 47, snowTop: 48, snowSide: 49, ice: 50, sandstone: 51, sandstoneTop: 52, cactus: 53, cactusTop: 54, magma: 55, obsidian: 56, basalt: 57, basaltTop: 58 };
const FACE_T = (t, f) => {
  // yüz sırası: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
  switch (t) {
    case 1: return f === 2 ? T.grassTop : f === 3 ? T.dirt : T.grassSide;
    case 2: return T.dirt;
    case 3: return T.stone;
    case 4: return T.sand;
    case 5: return f === 2 || f === 3 ? T.logTop : T.logSide;
    case 6: return T.leaves;
    case 7: return T.gold;
    case 8: return T.gem;
    case 9: return T.bedrock;
    case 10: return T.water;
    case 11: return T.rose;
    case 12: return T.daisy;
    case 13: return T.tall;
    case 14: return f === 2 || f === 3 ? T.chestTop : f === 4 ? T.chestFront : T.chestSide;
    case 15: return T.brick;
    case 16: return T.planks;
    case 17: return T.coal;
    case 18: return T.iron;
    case 19: return T.emer;
    case 33: return f === 2 || f === 3 ? T.tntTop : T.tnt;
    case 34: return f === 2 ? T.snowTop : T.snowSide;
    case 35: return T.ice;
    case 36: return f === 2 || f === 3 ? T.sandstoneTop : T.sandstone;
    case 37: return f === 2 || f === 3 ? T.cactusTop : T.cactus;
    case 38: return T.magma;
    case 39: return T.obsidian;
    case 40: return f === 2 ? T.basaltTop : T.basalt;
    default: return t >= 20 ? T.color0 + (t - 20) : T.stone;
  }
};
function drawAtlas() {
  const S = 16, cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  const img = g.createImageData(128, 128);
  const d = img.data;
  const hsh = (a, b, c) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const tile = (n, fn) => {
    const ox = (n % 8) * S, oy = Math.floor(n / 8) * S;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const c = fn(x, y, hsh(x, y, n * 7 + 3), hsh(x >> 1, y >> 1, n * 11 + 5));
      const o = ((oy + y) * 128 + ox + x) * 4;
      d[o] = clamp(c[0], 0, 255); d[o + 1] = clamp(c[1], 0, 255); d[o + 2] = clamp(c[2], 0, 255); d[o + 3] = c.length > 3 ? c[3] : 255;
    }
  };
  const vary = (c, r, k) => [c[0] + (r - 0.5) * k, c[1] + (r - 0.5) * k, c[2] + (r - 0.5) * k];
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const GR = [96, 178, 62], DI = [134, 96, 66], ST = [128, 128, 132];
  const grassPx = (x, y, r, r2) => { let c = vary(GR, r, 34); if (r2 < 0.18) c = mul(c, 0.82); else if (r > 0.93) c = mul(c, 1.16); return c; };
  const dirtPx = (x, y, r, r2) => { let c = vary(DI, r, 30); if (r < 0.1) c = [104, 72, 48]; else if (r > 0.92) c = [160, 118, 84]; if (r2 > 0.85) c = mul(c, 0.9); return c; };
  const stonePx = (x, y, r, r2) => { let c = vary(ST, r, 16); c = mul(c, 0.9 + r2 * 0.18); if (hsh(x + 1, y, 91) < 0.08 || (r2 < 0.08)) c = [98, 98, 104]; return c; };
  tile(T.grassTop, grassPx);
  tile(T.grassSide, (x, y, r, r2) => { const edge = 3 + (hsh(x, 0, 51) > 0.5 ? 1 : 0) + (hsh(x, 1, 52) > 0.75 ? 1 : 0); return y < edge ? mul(grassPx(x, y, r, r2), y === edge - 1 ? 0.85 : 1) : dirtPx(x, y, r, r2); });
  tile(T.dirt, dirtPx);
  tile(T.stone, stonePx);
  tile(T.sand, (x, y, r) => { let c = vary([222, 208, 160], r, 18); if (r < 0.08) c = [200, 186, 140]; if (r > 0.95) c = [238, 228, 190]; return c; });
  tile(T.logSide, (x, y, r) => { const s = (x % 4 === 0 || (x + (y >> 2)) % 7 === 0); let c = s ? [80, 58, 36] : [112, 84, 52]; return vary(c, r, 16); });
  tile(T.logTop, (x, y, r) => { const dd = Math.hypot(x - 7.5, y - 7.5); if (dd > 6.6) return vary([96, 70, 42], r, 14); return vary(Math.floor(dd) % 2 ? [186, 146, 96] : [166, 126, 80], r, 10); });
  tile(T.leaves, (x, y, r, r2) => { if (r < 0.16) return [0, 0, 0, 0]; let c = vary([62, 146, 48], r, 40); if (r2 < 0.25) c = mul(c, 0.78); return c; });
  const ore = (a, b, n, big) => (x, y, r, r2) => {
    const cl = [[3, 3], [11, 4], [5, 11], [12, 12], [8, 7], [2, 13], [13, 8]];
    for (let k = 0; k < cl.length; k++) {
      const cx = cl[k][0], cy = cl[k][1];
      if (hsh(cx, cy, n) < 0.12) continue;
      const dd = Math.abs(x - cx) + Math.abs(y - cy), R = big && k % 2 === 0 ? 2 : 1;
      if (dd <= R) return dd === 0 ? b : dd === R && R === 2 ? mul(a, 0.72) : vary(a, r, 18);
    }
    return mul(stonePx(x, y, r, r2), 0.92);
  };
  tile(T.gold, ore([250, 204, 52], [255, 246, 176], 1, true));
  tile(T.gem, ore([92, 226, 255], [236, 255, 255], 2, true));
  tile(T.coal, ore([36, 36, 42], [86, 86, 96], 3, true));
  tile(T.iron, ore([214, 150, 108], [255, 214, 178], 4, false));
  tile(T.emer, ore([38, 206, 98], [196, 255, 214], 5, true));
  tile(T.tnt, (x, y, r) => (y >= 6 && y <= 10 ? ((x + 1) % 5 < 3 && y >= 7 && y <= 9 ? [40, 30, 30] : [244, 238, 226]) : vary(x % 4 === 3 ? [150, 24, 24] : [214, 44, 40], r, 16)));
  tile(T.tntTop, (x, y, r) => { const dd = Math.hypot(x - 7.5, y - 7.5); return dd < 1.6 ? [40, 30, 30] : dd < 3 ? [240, 232, 214] : vary([200, 40, 38], r, 16); });
  tile(T.bedrock, (x, y, r, r2) => vary(r2 < 0.33 ? [44, 44, 48] : r2 < 0.66 ? [70, 70, 74] : [96, 96, 100], r, 14));
  tile(T.water, (x, y, r) => { const s = ((x + y * 2) % 9 === 0) || ((x * 3 + y) % 13 === 0); return vary(s ? [92, 160, 232] : [52, 118, 206], r, 12); });
  const flower = (pet, mid) => (x, y, r) => {
    if (x >= 7 && x <= 8 && y >= 7) return vary([58, 140, 46], r, 20);
    if ((y === 11 || y === 12) && (x === 6 || x === 9) && r > 0.3) return [72, 160, 56];
    const dd = Math.hypot(x - 7.5, y - 4.5);
    if (dd < 1.3) return mid;
    if (dd < 3.3 && Math.abs(Math.atan2(y - 4.5, x - 7.5) % 1.257) > 0.2) return vary(pet, r, 30);
    return [0, 0, 0, 0];
  };
  tile(T.rose, flower([226, 46, 62], [255, 214, 80]));
  tile(T.daisy, flower([255, 214, 52], [228, 120, 30]));
  tile(T.tall, (x, y, r) => { const bl = [[2, 6, -1], [5, 3, 0], [8, 1, 1], [11, 4, 0], [13, 7, 1]]; for (const [bx, top, lean] of bl) { const xx = bx + Math.round(((15 - y) / 15) * lean * 1.5); if (y >= top && x === xx) return vary([70, 160, 54], r, 36); } return [0, 0, 0, 0]; });
  const plank = (x, y, r) => { const row = y >> 2; const edge = y % 4 === 3 || (x + row * 5) % 16 === 0; return vary(edge ? [112, 76, 40] : [168, 118, 64], r, 18); };
  tile(T.chestSide, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15 ? [84, 54, 26] : plank(x, y, r)));
  tile(T.chestTop, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15 || y === 7 ? [84, 54, 26] : plank(x, y, r)));
  tile(T.chestFront, (x, y, r) => { if (x >= 6 && x <= 9 && y >= 5 && y <= 10) return x === 6 || x === 9 || y === 5 || y === 10 ? [150, 110, 20] : [252, 210, 70]; return x === 0 || x === 15 || y === 0 || y === 15 || y === 6 ? [84, 54, 26] : plank(x, y, r); });
  tile(T.brick, (x, y, r) => { const row = y >> 2, off = row % 2 ? 4 : 0; return y % 4 === 3 || (x + off) % 8 === 7 ? vary([206, 196, 182], r, 10) : vary([176, 76, 58], r, 26); });
  tile(T.planks, plank);
  for (let c = 0; c < 12; c++) {
    const base = hexRGB(pcol(c)).map((v) => v * 255);
    tile(T.color0 + c, (x, y, r) => {
      const e = Math.min(x, y, 15 - x, 15 - y);
      if (e === 0) return mul(base, 0.62);
      if (e === 1) return x <= y && x + y < 15 ? mul(base, 1.18) : x + y >= 15 && x >= y ? mul(base, 0.78) : mul(base, 1.0);
      const dd = Math.hypot(x - 7.5, y - 7.5);
      if (dd < 3.2) return mul(base, y < 7.5 ? 1.16 : 0.88);
      if (dd < 4.2) return mul(base, 0.8);
      return vary(base, r, 8);
    });
  }
  // çatlak aşamaları: rastgele yürüyen çizgiler, aşama arttıkça uzar
  const cracks = [];
  for (let k = 0; k < 7; k++) {
    let x = 8, y = 8, a = (k / 7) * TAU;
    const pts = [];
    for (let s = 0; s < 14; s++) { pts.push([Math.round(x), Math.round(y)]); a += (hsh(k, s, 77) - 0.5) * 1.3; x += Math.cos(a) * 0.9; y += Math.sin(a) * 0.9; }
    cracks.push(pts);
  }
  for (let st = 0; st < 10; st++) {
    const on = new Set();
    const len = 2 + st * 1.3;
    cracks.forEach((pts, k) => { if (k > 2 + st * 0.6) return; pts.slice(0, Math.floor(len)).forEach(([x, y]) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) on.add(y * 16 + x); }); });
    tile(T.crack0 + st, (x, y) => (on.has(y * 16 + x) ? [20, 16, 14, 190] : [0, 0, 0, 0]));
  }
  // yeni haritaların blokları
  tile(T.snowTop, (x, y, r, r2) => { let c = vary([240, 246, 252], r, 10); if (r2 < 0.12) c = [222, 232, 246]; if (r > 0.97) c = [255, 255, 255]; return c; });
  tile(T.snowSide, (x, y, r, r2) => { let c = vary([228, 236, 246], r, 12); if (r2 < 0.15) c = [206, 220, 238]; if (y > 11 && hsh(x, y, 61) < 0.3) c = [212, 224, 240]; return c; });
  tile(T.ice, (x, y, r) => { const s = (x - y + 16) % 11 === 0 || (x * 2 + y) % 17 === 0; let c = vary(s ? [214, 238, 255] : [150, 200, 244], r, 10); if (x === 0 || y === 0) c = [190, 224, 252]; return c; });
  tile(T.sandstone, (x, y, r) => mul(vary([216, 192, 132], r, 14), y % 5 === 4 ? 0.86 : y % 5 === 0 ? 1.06 : 1));
  tile(T.sandstoneTop, (x, y, r) => { const e = Math.min(x, y, 15 - x, 15 - y); return mul(vary([222, 200, 142], r, 12), e === 0 ? 0.86 : e === 1 ? 1.05 : 1); });
  tile(T.cactus, (x, y, r) => { const rib = x % 4 === 1; let c = vary(rib ? [92, 170, 74] : [52, 128, 50], r, 18); if (rib && y % 4 === 2) c = [236, 226, 180]; if (x === 0 || x === 15) c = mul(c, 0.7); return c; });
  tile(T.cactusTop, (x, y, r) => { const dd = Math.abs(x - 7.5) + Math.abs(y - 7.5); return vary(dd < 3 ? [110, 182, 86] : dd < 6 ? [70, 148, 60] : [44, 112, 44], r, 16); });
  tile(T.magma, (x, y, r, r2) => { const crack = (x + y * 3) % 7 === 0 || (x * 3 - y + 32) % 9 === 0 || hsh(x >> 1, y >> 1, 71) < 0.18; return crack ? vary([255, 226, 120], r, 30) : vary(r2 < 0.5 ? [232, 92, 22] : [196, 60, 14], r, 26); });
  tile(T.obsidian, (x, y, r, r2) => { let c = vary([30, 22, 46], r, 10); if (r2 > 0.82) c = [62, 44, 96]; if (hsh(x, y, 73) > 0.95) c = [120, 96, 168]; return c; });
  tile(T.basalt, (x, y, r) => vary(x % 5 === 0 ? [52, 52, 58] : [78, 78, 86], r, 14));
  tile(T.basaltTop, (x, y, r, r2) => vary(x % 5 === 0 || y % 5 === 0 ? [56, 56, 62] : r2 < 0.5 ? [84, 84, 92] : [74, 74, 82], r, 12));
  tile(T.white, () => [255, 255, 255]);
  g.putImageData(img, 0, 0);
  return cv;
}
const UV = (n) => { const e = 0.0012; const u0 = (n % 8) / 8, v0 = Math.floor(n / 8) / 8; return [u0 + e, v0 + e, u0 + 1 / 8 - e, v0 + 1 / 8 - e]; };

/* ============================ blok gölgelendiricisi ============================ */
const VOX_V = `attribute vec3 aP;attribute vec2 aT;attribute vec2 aL;
uniform mat4 uVP;uniform mat4 uM;uniform vec3 uCam;uniform float uTime;
varying vec2 vT;varying float vL;varying float vD;varying vec3 vP;varying float vG;varying float vW;
void main(){vec3 p=(uM*vec4(aP,1.0)).xyz;
if(aL.y>0.5&&aL.y<1.5){p.y+=sin(uTime*1.7+p.x*0.9+p.z*0.7)*0.035-0.03;}
else if(aL.y>1.5&&aL.y<3.5){float k=aL.y-2.0;p.x+=sin(uTime*1.9+p.z*1.3+p.x)*0.07*k;p.z+=cos(uTime*1.6+p.x*1.1)*0.06*k;}
vT=aT;vL=aL.x;vP=p;vG=aL.y>5.5?0.0:aL.y>4.5?1.05+0.18*sin(uTime*2.1+dot(p,vec3(1.7,2.3,1.9))):aL.y>3.5?0.4+0.24*sin(uTime*3.2+dot(p,vec3(5.7,7.3,6.1))):0.0;vW=aL.y>5.5?(aL.y-6.0)*(0.75+0.15*sin(uTime*2.3+p.x+p.z)):0.0;vD=length(p-uCam);gl_Position=uVP*vec4(p,1.0);}`;
const VOX_F = `precision mediump float;
varying vec2 vT;varying float vL;varying float vD;varying vec3 vP;varying float vG;varying float vW;
uniform sampler2D uTex;uniform vec3 uFog;uniform vec2 uFogR;uniform vec3 uLight;uniform float uAlpha;uniform float uCut;uniform vec3 uTint;uniform vec4 uLamp;
void main(){vec4 t=texture2D(uTex,vT);if(t.a<uCut)discard;
float lf=clamp(1.0-distance(vP,uLamp.xyz)/9.0,0.0,1.0);lf=lf*lf*uLamp.w*(1.0-smoothstep(0.4,0.85,vL));
vec3 lit=max(vL*uLight+vec3(1.0,0.82,0.55)*lf+vec3(1.0,0.42,0.1)*vW,vec3(vG));
vec3 c=t.rgb*uTint*lit;
float f=clamp((vD-uFogR.x)/(uFogR.y-uFogR.x),0.0,1.0);
gl_FragColor=vec4(mix(c,uFog,f*f*(3.0-2.0*f)),t.a*uAlpha);}`;
const VS7 = 7;
function voxProg(X) {
  if (X.vox) return X.vox;
  X.vox = X.mkProg(VOX_V, VOX_F, ['aP', 'aT', 'aL']);
  return X.vox;
}
function voxBuf(X, arr) {
  if (!arr || !arr.length) return null;
  const gl = X.gl, b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  const f = arr instanceof Float32Array ? arr : new Float32Array(arr);
  gl.bufferData(gl.ARRAY_BUFFER, f, gl.STATIC_DRAW);
  return { b, n: f.length / VS7 };
}
function voxFree(X, m) { if (m && m.b) X.gl.deleteBuffer(m.b); }
function voxDraw(X, m, m16) {
  if (!m || !m.n) return;
  const gl = X.gl, p = X.vox;
  if (X.lastBuf !== m.b) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 28, 20);
    X.lastBuf = m.b;
  }
  gl.uniformMatrix4fv(p.u.uM, false, m16 || IDM);
  gl.drawArrays(gl.TRIANGLES, 0, m.n);
}
const IDM = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/* ============================ yüz tanımları ============================ */
// her yüz: normal, 4 köşe (dışarıdan bakınca saat yönünün tersine), yüz gölgesi
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], k: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], k: 0.72 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], k: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], k: 0.52 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], k: 0.9 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], k: 0.66 },
];
// köşe sırası tutarlı olsun: dışarıdan bakınca saat yönünün tersine (çapraz çarpım normal yönünde)
FACES.forEach((F) => {
  const [a, b, c] = F.c, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (cr[0] * F.n[0] + cr[1] * F.n[1] + cr[2] * F.n[2] < 0) F.c.reverse();
  // köşe başına doku koordinatı: yan yüzlerde v = 1 - y; üst/alt yüzlerde x, z
  F.uv = F.c.map((q) => (F.n[1] !== 0 ? [q[0], q[2]] : [F.n[0] !== 0 ? (F.n[0] > 0 ? 1 - q[2] : q[2]) : (F.n[2] > 0 ? q[0] : 1 - q[0]), 1 - q[1]]));
  // köşe gölgesi için teğet eksenler
  F.t = [0, 1, 2].filter((k) => F.n[k] === 0);
});
const AO_K = [0.45, 0.64, 0.82, 1];

/* ============================ dünya örgüsü ============================ */
// magma ışığı: her hücreye en yakın magmaya göre 0..1 (dünya kurulurken bir kez; magma kazılmaz, değişmez)
let MAGL = null;
function magLight(wb) {
  let any = false;
  for (let i = 0; i < wb.length; i++) if (wb[i] === 38) { any = true; break; }
  if (!any) return null;
  const L = new Float32Array(W * D * H);
  for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    if (wb[I(x, y, z)] !== 38) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy, zz = z + dz;
      if (xx < 0 || zz < 0 || yy < 0 || xx >= W || zz >= D || yy >= H) continue;
      const v = 1 - Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 4, k = I(xx, yy, zz);
      if (v > L[k]) L[k] = v;
    }
  }
  return L;
}
function meshChunk(wb, cx, cz) {
  const op = [], wa = [], pl = [];
  const get = (x, y, z) => (x < 0 || z < 0 || x >= W || z >= D || y >= H ? 0 : y < 0 ? 9 : wb[I(x, y, z)]);
  const occ = (x, y, z) => (isCube(get(x, y, z)) ? 1 : 0);
  const x0 = cx * CH, z0 = cz * CH;
  const tops = new Map();
  const topOf = (x, z) => {
    if (x < 0 || z < 0 || x >= W || z >= D) return 0;
    const k = z * W + x;
    let v = tops.get(k);
    if (v === undefined) { v = 0; for (let y = H - 1; y >= 0; y--) { const q = wb[I(x, y, z)]; if (q && q !== 6 && q !== 10 && !isPlant(q)) { v = y + 1; break; } } tops.set(k, v); }
    return v;
  };
  for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CH; z++) for (let x = x0; x < x0 + CH; x++) {
    const t = wb[I(x, y, z)];
    if (!t) continue;
    if (isCube(t)) {
      for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
        const nt = get(nx, ny, nz);
        if (hides(nt) || (t === 6 && nt === 6)) continue;
        if (f === 3 && y === 0) continue;
        const uv = UV(FACE_T(t, f));
        const ao = [0, 0, 0, 0];
        for (let k = 0; k < 4; k++) {
          const q = F.c[k];
          const [a, b] = F.t;
          const da = q[a] ? 1 : -1, db = q[b] ? 1 : -1;
          const p1 = [nx, ny, nz], p2 = [nx, ny, nz], p3 = [nx, ny, nz];
          p1[a] += da; p2[b] += db; p3[a] += da; p3[b] += db;
          const s1 = occ(p1[0], p1[1], p1[2]), s2 = occ(p2[0], p2[1], p2[2]), c3 = occ(p3[0], p3[1], p3[2]);
          ao[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + c3);
        }
        const cov = topOf(nx, nz) - ny, sky = cov <= 0 ? 1 : Math.max(0.17, 0.72 - cov * 0.085);
        const L = ao.map((a) => AO_K[a] * F.k * sky);
        const ml = MAGL && ny >= 0 && ny < H && nx >= 0 && nz >= 0 && nx < W && nz < D ? MAGL[I(nx, ny, nz)] : 0;
        const glow = t === 38 ? 5 : t === 7 || t === 8 || t === 19 ? 4 : ml > 0 ? 6 + ml * 0.95 : 0;
        const V = F.c.map((q, k) => [x + q[0], y + q[1], z + q[2], uv[0] + (uv[2] - uv[0]) * F.uv[k][0], uv[1] + (uv[3] - uv[1]) * F.uv[k][1], L[k]]);
        const flip = ao[0] + ao[2] < ao[1] + ao[3];
        const ord = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
        for (const k of ord) { const v = V[k]; op.push(v[0], v[1], v[2], v[3], v[4], v[5], glow); }
      }
    } else if (t === 10) {
      const up = get(x, y + 1, z);
      const top = up === 10 ? 1 : 0.88;
      for (let f = 0; f < 6; f++) {
        if (f === 3) continue;
        const F = FACES[f];
        const nt = get(x + F.n[0], y + F.n[1], z + F.n[2]);
        if (nt === 10 || hides(nt)) continue;
        if (f === 2 && up === 10) continue;
        const uv = UV(T.water);
        const V = F.c.map((q, k) => [x + q[0], y + (q[1] ? top : 0), z + q[2], uv[0] + (uv[2] - uv[0]) * F.uv[k][0], uv[1] + (uv[3] - uv[1]) * F.uv[k][1], F.k, f === 2 || q[1] ? 1 : 0]);
        for (const k of [0, 1, 2, 0, 2, 3]) { const v = V[k]; wa.push(v[0], v[1], v[2], v[3], v[4], v[5], f === 2 ? 1 : 0); }
      }
    } else if (isPlant(t)) {
      const uv = UV(FACE_T(t, 0));
      const h = t === 13 ? 0.85 : 0.95;
      const quads = [[[0.15, 0.15], [0.85, 0.85]], [[0.85, 0.15], [0.15, 0.85]]];
      for (const [a, b] of quads) {
        const V = [[x + a[0], y, z + a[1], uv[0], uv[3], 0.92, 2], [x + b[0], y, z + b[1], uv[2], uv[3], 0.92, 2], [x + b[0], y + h, z + b[1], uv[2], uv[1], 1, 3], [x + a[0], y + h, z + a[1], uv[0], uv[1], 1, 3]];
        for (const k of [0, 1, 2, 0, 2, 3]) pl.push(...V[k]);
      }
    }
  }
  return { op, wa, pl };
}
// Tek blok küpü (parçacık, eldeki blok, çatlak katmanı): merkez (0,0,0), kenar 1
function cubeArr(tileOf, light = 1) {
  const a = [];
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], uv = UV(tileOf(f));
    const V = F.c.map((q, k) => [q[0] - 0.5, q[1] - 0.5, q[2] - 0.5, uv[0] + (uv[2] - uv[0]) * F.uv[k][0], uv[1] + (uv[3] - uv[1]) * F.uv[k][1], F.k * light]);
    for (const k of [0, 1, 2, 0, 2, 3]) { const v = V[k]; a.push(v[0], v[1], v[2], v[3], v[4], v[5], 0); }
  }
  return a;
}

/* ============================ karakter (bloklu genç) ============================ */
const HEAD = 0.5;
function charParts(ci) {
  const st = styleOf(ci);
  const top = C(st.hex, -0.15), topD = shade(C(st.hex, -0.15), 0.78), skin = C(st.skin, -0.1), hair = C(st.hairC, -0.25), pants = C(st.pants, -0.05), shoe = C(st.shoe, -0.2), ink = C('#1b1520', 0), wh = C('#ffffff', -0.3);
  const body = new MB('lit'), head = new MB('lit'), arm = new MB('lit'), leg = new MB('lit');
  // gövde: kalça 0.74, omuz 1.34
  body.rbox(-0.27, 0.72, -0.15, 0.27, 1.36, 0.15, 0.05, top, 2);
  body.rbox(-0.275, 0.72, -0.155, 0.275, 0.8, 0.155, 0.02, topD, 1);
  body.rbox(-0.1, 1.26, 0.14, 0.1, 1.33, 0.165, 0.02, topD, 1);
  if (ci % 3 === 0) body.rbox(-0.276, 1.02, -0.156, 0.276, 1.1, 0.156, 0.01, C('#ffffff', -0.1), 1);
  if (ci % 3 === 1) body.rbox(-0.09, 0.84, 0.145, 0.09, 1.0, 0.17, 0.02, shade(top, 1.25), 1);
  // baş: 0.5 küp, boyun üstünde
  const hy = 1.38;
  head.rbox(-HEAD / 2, hy, -HEAD / 2, HEAD / 2, hy + HEAD, HEAD / 2, 0.07, skin, 2);
  const fz = HEAD / 2 + 0.004;
  for (const s of [-1, 1]) {
    head.rbox(s * 0.11 - 0.05, hy + 0.2, fz - 0.01, s * 0.11 + 0.05, hy + 0.3, fz + 0.012, 0.015, wh, 1);
    head.rbox(s * 0.11 - 0.028 + s * 0.012, hy + 0.205, fz, s * 0.11 + 0.028 + s * 0.012, hy + 0.285, fz + 0.02, 0.012, ink, 1);
    head.rbox(s * 0.11 - 0.055, hy + 0.335, fz - 0.01, s * 0.11 + 0.055, hy + 0.36, fz + 0.016, 0.008, shade(hair, 0.9), 1);
    head.rbox(s * 0.15 - 0.035, hy + 0.13, fz - 0.01, s * 0.15 + 0.035, hy + 0.165, fz + 0.006, 0.01, C('#ff8f9a', 0), 1);
  }
  head.rbox(-0.06, hy + 0.1, fz - 0.01, 0.06, hy + 0.125, fz + 0.016, 0.008, C('#7a2a2a', 0), 1);
  // saç
  const hs = st.hairS, R = HEAD / 2;
  const capTop = (col, h = 0.09) => head.rbox(-R - 0.025, hy + HEAD - 0.02, -R - 0.025, R + 0.025, hy + HEAD + h, R + 0.025, 0.05, col, 2);
  if (hs === 'cap') {
    capTop(top, 0.1);
    head.rbox(-R - 0.02, hy + HEAD - 0.06, R - 0.05, R + 0.02, hy + HEAD - 0.01, R + 0.2, 0.02, topD, 1);
    head.rbox(-R - 0.02, hy + 0.12, -R - 0.03, R + 0.02, hy + HEAD - 0.02, -R + 0.06, 0.03, hair, 1);
  } else if (hs === 'beanie') {
    capTop(top, 0.14);
    head.rbox(-R - 0.035, hy + HEAD - 0.08, -R - 0.035, R + 0.035, hy + HEAD + 0.0, R + 0.035, 0.03, topD, 1);
    head.rbox(-0.06, hy + HEAD + 0.12, -0.06, 0.06, hy + HEAD + 0.22, 0.06, 0.05, C('#f5f0e6', 0), 1);
    head.rbox(-R - 0.02, hy + 0.12, -R - 0.03, R + 0.02, hy + HEAD - 0.06, -R + 0.06, 0.03, hair, 1);
  } else {
    capTop(hair, hs === 'spiky' ? 0.07 : 0.09);
    head.rbox(-R - 0.03, hy + (hs === 'long' ? -0.22 : hs === 'bob' ? 0.05 : 0.14), -R - 0.03, R + 0.03, hy + HEAD + 0.02, -R + 0.1, 0.04, hair, 1);
    for (const s of [-1, 1]) head.rbox(s > 0 ? R - 0.06 : -R - 0.03, hy + (hs === 'bob' || hs === 'long' ? (hs === 'long' ? -0.18 : 0.06) : 0.26), -R - 0.03, s > 0 ? R + 0.03 : -R + 0.06, hy + HEAD, R - (hs === 'bob' || hs === 'long' ? 0.12 : 0.24), 0.03, hair, 1);
    head.rbox(-R - 0.02, hy + HEAD - 0.12, R - 0.08, R + 0.02, hy + HEAD + 0.02, R + 0.03, 0.03, hair, 1);
    if (hs === 'bun') head.rbox(-0.09, hy + HEAD + 0.06, -0.15, 0.09, hy + HEAD + 0.22, 0.03, 0.06, hair, 2);
    if (hs === 'spiky') for (let k = 0; k < 5; k++) head.rbox(-0.22 + k * 0.11 - 0.04, hy + HEAD + 0.05, -0.1 + (k % 2) * 0.12, -0.22 + k * 0.11 + 0.04, hy + HEAD + 0.15 + (k % 2) * 0.04, 0.02 + (k % 2) * 0.12, 0.02, hair, 1);
    if (hs === 'curly') for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; head.rbox(Math.cos(a) * 0.2 - 0.07, hy + HEAD + 0.03, Math.sin(a) * 0.2 - 0.07, Math.cos(a) * 0.2 + 0.07, hy + HEAD + 0.15, Math.sin(a) * 0.2 + 0.07, 0.05, hair, 2); }
  }
  // aksesuarlar
  const acc = st.acc || [];
  if (acc.includes('glasses')) for (const s of [-1, 1]) { head.rbox(s * 0.11 - 0.075, hy + 0.18, fz + 0.005, s * 0.11 + 0.075, hy + 0.32, fz + 0.03, 0.02, ink, 1); head.rbox(s * 0.11 - 0.055, hy + 0.2, fz + 0.02, s * 0.11 + 0.055, hy + 0.3, fz + 0.034, 0.01, C('#bfe6ff', 0.6), 1); }
  if (acc.includes('glasses')) head.rbox(-0.04, hy + 0.27, fz + 0.01, 0.04, hy + 0.29, fz + 0.03, 0.005, ink, 1);
  if (acc.includes('shades')) head.rbox(-0.2, hy + 0.19, fz + 0.004, 0.2, hy + 0.31, fz + 0.035, 0.03, C('#141018', -0.8), 1);
  if (acc.includes('headphones')) {
    head.rbox(-R - 0.05, hy + HEAD + 0.05, -0.04, R + 0.05, hy + HEAD + 0.1, 0.04, 0.02, C('#23222b', -0.5), 1);
    for (const s of [-1, 1]) { head.rbox(s * (R + 0.02) - 0.035, hy + 0.2, -0.04, s * (R + 0.02) + 0.035, hy + HEAD + 0.08, 0.04, 0.01, C('#23222b', -0.5), 1); head.rbox(s * (R + 0.04) - 0.05, hy + 0.12, -0.1, s * (R + 0.04) + 0.05, hy + 0.32, 0.1, 0.04, top, 2); }
  }
  // kol: omuzdan aşağı (0,0,0) → (0,-0.62,0)
  arm.rbox(-0.1, -0.34, -0.1, 0.1, 0.04, 0.1, 0.04, top, 2);
  arm.rbox(-0.09, -0.62, -0.09, 0.09, -0.32, 0.09, 0.04, skin, 2);
  // bacak: kalçadan aşağı
  leg.rbox(-0.12, -0.6, -0.13, 0.12, 0.02, 0.13, 0.04, pants, 2);
  leg.rbox(-0.125, -0.74, -0.15, 0.125, -0.6, 0.17, 0.04, shoe, 2);
  leg.rbox(-0.13, -0.75, -0.16, 0.13, -0.71, 0.18, 0.02, C('#f2efe8', 0), 1);
  return { body, head, arm, leg };
}
function pickaxeMB() {
  const mb = new MB('lit');
  mb.rbox(-0.025, -0.05, -0.025, 0.025, 0.55, 0.025, 0.01, C('#8a5a30', 0), 1);
  mb.rbox(-0.2, 0.47, -0.035, 0.2, 0.56, 0.035, 0.02, C('#9aa3ad', -0.6), 1);
  mb.rbox(-0.26, 0.44, -0.03, -0.18, 0.52, 0.03, 0.02, C('#b8c2cc', -0.6), 1);
  mb.rbox(0.18, 0.44, -0.03, 0.26, 0.52, 0.03, 0.02, C('#b8c2cc', -0.6), 1);
  return mb;
}
function cloudMB(mb, x, y, z, w, d, k) {
  const h = 1.2;
  mb.rbox(x, y, z, x + w, y + h, z + d, 0.3, C('#ffffff', 0), 1);
  if (k % 2) mb.rbox(x + w * 0.2, y + h * 0.7, z + d * 0.25, x + w * 0.7, y + h * 1.5, z + d * 0.75, 0.3, C('#ffffff', 0), 1);
}

/* ============================ sesler ============================ */
class BaSnd extends Snd {
  constructor() { super(); this.musVol = 2.4; }
  tempo() { return this.mode === 'race' ? 96 : 76; }
  beat(t, s, bar, spb) {
    // Fa majör pentatonik, sakin ve aydınlık: marimba kalıbı + yumuşak bas + hafif vuruş
    const CHS = [[53, [65, 69, 72]], [50, [62, 65, 69]], [46, [65, 70, 74]], [48, [64, 67, 72]]];
    const [root, ch] = CHS[bar % 4];
    const PEN = [65, 67, 69, 72, 74, 77, 79, 81];
    const r = (k) => { let h = Math.imul(bar * 16 + s + k, 2654435761); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
    if (this.mode === 'race') {
      if (s === 0 || s === 8) this.iKick(t, 0.13, 110, 46, 0.18);
      if (s === 4 || s === 12) this.iRim(t, 0.035);
      if (s % 2 === 1) this.iShk(t, 0.012);
      if (s % 2 === 0 && r(1) > 0.35) this.iMarimba(t, PEN[Math.floor(r(2) * PEN.length)], 0.045, 0.2);
      if (s === 0) this.iBass(t, root - 12, spb * 1.8, 0.09, 'sub');
      if (s === 10) this.iBass(t, root - 12 + 7, spb * 0.9, 0.06, 'sub');
      if (s === 0 && bar % 2 === 0) this.iPad(t, ch, spb * 8, 0.012, 900);
    } else {
      if (s === 0) { this.iPad(t, ch, spb * 4, 0.016, 800); this.iBass(t, root - 12, spb * 3, 0.07, 'sub'); }
      if (s % 4 === 0 && r(3) > 0.25) this.iVibe(t, PEN[Math.floor(r(4) * PEN.length)], 0.03, 1.4, 0.35);
      if (s === 6 && r(5) > 0.5) this.iBell(t, PEN[Math.floor(r(6) * PEN.length)] + 12, 0.018, 1.6, 0.4);
    }
  }
  play(name, m = 'dirt', vol = 1, pan = 0) {
    if (!this.on() || vol < 0.03) return;
    try {
      const t = this.k.ctx.currentTime, v = vol;
      const hit = (k) => {
        if (m === 'stone') { this.noise(t, 0.05, 0.22 * k * v, { type: 'bandpass', freq: 2300, q: 1.4 }, pan); this.tone(320 + Math.random() * 80, t, 0.05, 'triangle', 0.08 * k * v, 220, 0.002, pan); }
        else if (m === 'wood') { this.tone(210 + Math.random() * 40, t, 0.07, 'triangle', 0.16 * k * v, 160, 0.002, pan); this.noise(t, 0.05, 0.12 * k * v, { type: 'bandpass', freq: 900, q: 1.2 }, pan); }
        else if (m === 'leaf') this.noise(t, 0.09, 0.16 * k * v, { type: 'highpass', freq: 2600, attack: 0.01 }, pan);
        else if (m === 'sand') this.noise(t, 0.08, 0.16 * k * v, { type: 'bandpass', freq: 3400, q: 0.6, attack: 0.01 }, pan);
        else if (m === 'block') { this.tone(520, t, 0.05, 'square', 0.04 * k * v, 380, 0.002, pan); this.noise(t, 0.04, 0.1 * k * v, { type: 'bandpass', freq: 1600, q: 1 }, pan); }
        else { this.noise(t, 0.07, 0.22 * k * v, { type: 'lowpass', freq: 700, q: 0.7 }, pan); this.tone(130, t, 0.06, 'sine', 0.1 * k * v, 80, 0.002, pan); }
      };
      switch (name) {
        case 'hit': hit(0.8); break;
        case 'break': hit(1.4); this.noise(t + 0.02, 0.16, 0.12 * v, { type: 'lowpass', freq: m === 'stone' ? 1800 : 900, to: 300 }, pan); break;
        case 'place': this.tone(140, t, 0.08, 'sine', 0.3 * v, 90, 0.002, pan); hit(0.9); break;
        case 'step': hit(0.32); break;
        case 'jump': this.tone(300, t, 0.12, 'sine', 0.07 * v, 480, 0.01, pan); break;
        case 'land': this.tone(120, t, 0.08, 'sine', 0.14 * v, 70, 0.003, pan); hit(0.45); break;
        case 'splash': this.noise(t, 0.4, 0.25 * v, { type: 'lowpass', freq: 2400, to: 400, attack: 0.01 }, pan); this.noise(t + 0.05, 0.25, 0.12 * v, { type: 'highpass', freq: 3500 }, pan); break;
        case 'gold': [0, 4, 7, 12].forEach((n, k) => this.tone(659 * Math.pow(2, n / 12), t + k * 0.07, 0.35, 'sine', 0.16 * v, null, 0.004, pan)); this.tone(2637, t + 0.28, 0.5, 'sine', 0.05 * v, null, 0.01, pan); break;
        case 'gem': [0, 7, 12, 16, 19, 24].forEach((n, k) => this.tone(784 * Math.pow(2, n / 12), t + k * 0.06, 0.5, 'triangle', 0.12 * v, null, 0.004, pan)); this.noise(t + 0.3, 0.6, 0.05 * v, { type: 'highpass', freq: 7000 }, pan); break;
        case 'chest': this.tone(180, t, 0.12, 'triangle', 0.2 * v, 120, 0.004, pan); [0, 4, 7, 12, 16].forEach((n, k) => this.tone(523 * Math.pow(2, n / 12), t + 0.12 + k * 0.08, 0.4, 'square', 0.05 * v, null, 0.004, pan)); break;
        case 'deny': this.tone(180, t, 0.12, 'square', 0.05 * v, 140, 0.004, pan); break;
        case 'hot': this.noise(t, 0.4, 0.16 * v, { type: 'highpass', freq: 2400 }, pan); this.tone(300, t, 0.2, 'sawtooth', 0.06 * v, 110, 0.004, pan); break;
        case 'fuse': this.noise(t, 1.6, 0.07 * v, { type: 'highpass', freq: 5200 }, pan); for (let k = 0; k < 6; k++) this.tone(900 + k * 90, t + k * 0.27, 0.05, 'square', 0.04 * v, null, 0.002, pan); break;
        case 'boom': this.noise(t, 0.9, 0.6 * v, { type: 'lowpass', freq: 900, to: 90, attack: 0.004 }, pan); this.tone(92, t, 0.5, 'sine', 0.5 * v, 34, 0.004, pan); this.noise(t + 0.02, 0.25, 0.3 * v, { type: 'bandpass', freq: 1800, q: 0.8 }, pan); break;
        case 'tick': this.tone(1200, t, 0.04, 'sine', 0.08 * v, null, 0.002, pan); break;
        case 'go': [0, 4, 7, 12].forEach((n, k) => this.tone(523 * Math.pow(2, n / 12), t + k * 0.09, 0.3, 'triangle', 0.14 * v, null, 0.004, pan)); break;
        case 'end': this.cheer(t, 1.6); [12, 7, 4, 0].forEach((n, k) => this.tone(523 * Math.pow(2, n / 12), t + k * 0.12, 0.4, 'triangle', 0.12 * v, null, 0.004, pan)); break;
        case 'emote': this.tone(880, t, 0.08, 'sine', 0.08 * v, 1200, 0.004, pan); break;
        default: break;
      }
    } catch (e) { /* yok say */ }
  }
}

/* ============================ oyun ============================ */
const HOT = [-1, 2, 3, 4, 5, 6];   // -1: kendi renkli bloğun
// haritaya göre alttaki çubuk (o haritada en çok kazılan bloklar)
const HOTS = [[-1, 2, 3, 4, 5, 6], [-1, 4, 36, 3, 5, 2], [-1, 34, 3, 35, 5, 2], [-1, 40, 3, 39, 4, 2], [-1, 4, 2, 3, 5, 6]];
const MAP_HINT = [
  'Elmas 💎 en dipte, zümrüt ve altın orta derinlikte. Mağaraları ara, 🧨 ile patlat!',
  'Piramidin içinde hazine odası var 🏺 Altın bu çölde bol 🪙',
  'Dağın içi zümrüt dolu 🟢 Donmuş gölde buz kaydırır ❄️',
  'Magmaya basma 🔥 Lavın yakınında elmas bol 💎',
  'Adaların arasında batık gemi var ⚓ Karşıya geçmek için blok koy'
];
const DAY = { sunC: [1.2, 1.12, 1.0], sky: [0.62, 0.68, 0.8], gnd: [0.34, 0.32, 0.28], night: 0, warm: [1, 0.8, 0.5], lampC: [0, 0, 0], fogR: [38, 74], stars: 0, glowS: 1 };
const SUN = new Float32Array(norm3([0.45, 0.8, 0.35]));
const SKY_TOP = hexRGB('#4aa3f5'), SKY_HOR = hexRGB('#cfeaff'), FOG = new Float32Array(hexRGB('#bfe2ff'));
// haritaya göre gök, sis, güneş, blok ışığı, bulut tonu
const ENV = [
  { top: SKY_TOP, hor: SKY_HOR, fog: FOG, sunC: [1.2, 1.12, 1.0], light: [1.04, 1.02, 0.97], cloud: [1, 1, 1] },
  { top: hexRGB('#3d8be0'), hor: hexRGB('#ffe2b0'), fog: new Float32Array(hexRGB('#f1d9aa')), sunC: [1.32, 1.16, 0.92], light: [1.1, 1.03, 0.9], cloud: [1, 0.97, 0.9] },
  { top: hexRGB('#7aa6d8'), hor: hexRGB('#e8f0fa'), fog: new Float32Array(hexRGB('#e1eaf4')), sunC: [1.08, 1.12, 1.22], light: [0.98, 1.02, 1.1], cloud: [0.96, 0.98, 1.02] },
  { top: hexRGB('#3a2838'), hor: hexRGB('#e57a48'), fog: new Float32Array(hexRGB('#7e4c40')), sunC: [1.25, 0.86, 0.66], light: [1.08, 0.93, 0.84], cloud: [0.42, 0.36, 0.36] },
  { top: hexRGB('#2c9cf2'), hor: hexRGB('#c4f4ff'), fog: new Float32Array(hexRGB('#bdf1ff')), sunC: [1.22, 1.14, 1.0], light: [1.05, 1.03, 0.97], cloud: [1, 1, 1] }
];
ENV.forEach((e) => { e.cloudT = new Float32Array(e.cloud); e.day = Object.assign({}, DAY, { sunC: e.sunC }); });
const PW = 0.3, PH = 1.78, EYE = 1.6;

class Game {
  constructor(ctx) {
    injectStyle();
    styleBA();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.seed = 0;
    this.wb = null;
    this.chunks = [];
    this.dirty = new Set();
    this.applied = 0;
    this.pend = new Map();
    this.evSeen = 0;
    this.evFirst = true;
    this.panelKey = '';
    this.R = [];
    this.me = null;
    this.cam = { yaw: Math.PI, pitch: -0.36, fp: false, ex: 0, ey: 10, ez: 0, dist: 5.2 };
    this.keys = new Set();
    this.joy = null;
    this.look = null;
    this.digging = false;
    this.digT = 0;
    this.digI = -1;
    this.sel = 0;
    this.inv = {};
    this.parts = [];
    this.fuses = [];
    this.booms = [];
    this.time = 0;
    this.scale = 1;
    this.mats = { V: M.make(), P: M.make(), VP: M.make(), a: M.make(), b: M.make(), c: M.make(), e: M.make() };
    this.build();
    this.snd = new BaSnd();
    try { this.snd.amb('wind', 0.45); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd.play('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[blok] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.initGL(); } catch (e) { console.warn('[blok] kaynak', e); this.X = null; }
    }
    if (!this.X) {
      this.flat = true;
      this.el.wrap.classList.add('flat');
      this.el.cv.style.display = 'none';
    } else {
      this.el.cv.addEventListener('webglcontextlost', this.onLost = (e) => { e.preventDefault(); this.lost = true; }, false);
      this.el.cv.addEventListener('webglcontextrestored', this.onRestore = () => { try { this.X = makeGL(this.el.cv); this.initGL(); this.lost = false; if (this.wb) this.remeshAll(); } catch (e) { console.warn('[blok] geri yükleme', e); } }, false);
    }
    this.lastT = performance.now();
    this.uiT = 0;
    this.sendT = 0;
    this.stepT = 0;
    this.frameB = (t) => this.loop(t);
    this.raf = requestAnimationFrame(this.frameB);
  }

  initGL() {
    const X = this.X, gl = X.gl;
    voxProg(X);
    this.atlasCv = this.atlasCv || drawAtlas();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlasCv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.tex = tex;
    this.cubes = {};
    this.chars = {};
    this.pick = pickaxeMB().build(X);
    const cl = new MB('lit');
    [[-30, 34, -20, 9, 6], [10, 36, -28, 12, 7], [36, 33, 2, 8, 5], [-14, 35, 30, 11, 6], [24, 37, 40, 10, 8], [50, 34, 22, 9, 6], [-36, 36, 8, 10, 7], [4, 35, 56, 9, 5], [62, 36, -12, 10, 6]].forEach(([x, y, z, w, d], k) => cloudMB(cl, x, y, z, w, d, k));
    this.clouds = cl.build(X);
    // adanın dışındaki deniz (dünyanın sınırından ufka)
    const sea = [], uv = UV(T.water), cu = (uv[0] + uv[2]) / 2, cvv = (uv[1] + uv[3]) / 2, Y = SEA + 0.86, F = 140;
    const q = (x0, z0, x1, z1) => { const V = [[x0, Y, z0], [x1, Y, z0], [x1, Y, z1], [x0, Y, z1]]; for (const k of [0, 2, 1, 0, 3, 2]) sea.push(V[k][0], V[k][1], V[k][2], cu, cvv, 0.95, 1); };
    q(-F, -F, W + F, 0); q(-F, D, W + F, D + F); q(-F, 0, 0, D); q(W, 0, W + F, D);
    this.sea = voxBuf(X, sea);
    // deniz tabanı (koyu kum): suyun altı boş görünmesin
    const fl = [], u2 = UV(T.sand), c2u = (u2[0] + u2[2]) / 2, c2v = (u2[1] + u2[3]) / 2, Y2 = 1.5;
    const q2 = (x0, z0, x1, z1) => { const V = [[x0, Y2, z0], [x1, Y2, z0], [x1, Y2, z1], [x0, Y2, z1]]; for (const k of [0, 2, 1, 0, 3, 2]) fl.push(V[k][0], V[k][1], V[k][2], c2u, c2v, 0.45, 0); };
    q2(-F, -F, W + F, 0); q2(-F, D, W + F, D + F); q2(-F, 0, 0, D); q2(W, 0, W + F, D);
    this.floor = voxBuf(X, fl);
    this.crack = [];
    for (let k = 0; k < 10; k++) this.crack.push(voxBuf(X, cubeArr(() => T.crack0 + k, 1)));
    // seçili blok çerçevesi: 12 ince kenar
    const ol = [], ou = UV(T.white), ocu = (ou[0] + ou[2]) / 2, ocv = (ou[1] + ou[3]) / 2;
    const bar = (a, b) => {
      const th = 0.022;
      const mn = [Math.min(a[0], b[0]) - th, Math.min(a[1], b[1]) - th, Math.min(a[2], b[2]) - th], mx = [Math.max(a[0], b[0]) + th, Math.max(a[1], b[1]) + th, Math.max(a[2], b[2]) + th];
      for (let f = 0; f < 6; f++) { const F2 = FACES[f]; const V = F2.c.map((c) => [c[0] ? mx[0] : mn[0], c[1] ? mx[1] : mn[1], c[2] ? mx[2] : mn[2]]); for (const k of [0, 1, 2, 0, 2, 3]) ol.push(V[k][0] - 0.5, V[k][1] - 0.5, V[k][2] - 0.5, ocu, ocv, 0.12, 0); }
    };
    for (const a of [0, 1]) for (const b of [0, 1]) { bar([0, a, b], [1, a, b]); bar([a, 0, b], [a, 1, b]); bar([a, b, 0], [a, b, 1]); }
    this.outline = voxBuf(X, ol);
    if (this.wb) this.remeshAll();
  }
  cube(t) {
    if (!this.cubes[t]) this.cubes[t] = voxBuf(this.X, cubeArr((f) => FACE_T(t, f), 1));
    return this.cubes[t];
  }
  char(ci) {
    if (!this.chars[ci]) {
      const p = charParts(ci);
      this.chars[ci] = { body: p.body.build(this.X), head: p.head.build(this.X), arm: p.arm.build(this.X), leg: p.leg.build(this.X) };
    }
    return this.chars[ci];
  }

  build() {
    const w = document.createElement('div');
    w.id = 'ky';
    w.className = 'ba';
    w.innerHTML = `
      <canvas class="ba-cv" aria-label="Blok Adası 3D dünyası"></canvas>
      <div class="ba-tags"></div>
      <div class="ba-x"></div>
      <div class="ba-tgt"></div>
      <div class="ba-lb"></div>
      <div class="ba-feed"></div>
      <div class="ba-hint"></div>
      <div class="ba-det"></div>
      <div class="ba-tool"></div>
      <div class="ba-got"></div>
      <div class="ba-flash"></div>
      <div class="ba-joyhint">Yürümek için<br>sürükle</div>
      <div class="ba-joy"><i></i></div>
      <button class="ba-view" aria-label="Kamera: birinci / üçüncü kişi">👁️</button>
      <div class="ba-btns">
        <button class="ba-b" data-b="put" aria-label="Blok koy">🧱</button>
        <button class="ba-b big" data-b="dig" aria-label="Kaz (basılı tut)">⛏️</button>
        <button class="ba-b" data-b="tnt" aria-label="Dinamit koy">🧨<u>0</u></button>
        <button class="ba-b" data-b="jump" aria-label="Zıpla">⤒</button>
      </div>
      <div class="ba-bar"></div>
      <div class="hud"><div class="r1">
        <div class="pos"><b>0</b><small> puan</small></div>
        <div class="sp"></div>
        <div class="tm">⛏️</div>
        <button class="ib mu ${sfx.isMusicOn && sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
        <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted && sfx.isMuted() ? '🔇' : '🔊'}</button>
        <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
      </div></div>
      <div class="vig"></div>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = { wrap: w, cv: q('canvas'), tags: q('.ba-tags'), x: q('.ba-x'), tgt: q('.ba-tgt'), lb: q('.ba-lb'), feed: q('.ba-feed'), hint: q('.ba-hint'), det: q('.ba-det'), got: q('.ba-got'), tool: q('.ba-tool'), flashEl: q('.ba-flash'), tntB: q('[data-b="tnt"]'), joyhint: q('.ba-joyhint'), joy: q('.ba-joy'), knob: q('.ba-joy i'), view: q('.ba-view'), btns: q('.ba-btns'), bar: q('.ba-bar'), posB: q('.pos b'), tm: q('.tm'), ex: q('.ex'), msg: q('.msg'), panel: q('.panel') };
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
    this.el.view.addEventListener('click', () => { this.cam.fp = !this.cam.fp; this.el.view.textContent = this.cam.fp ? '🧍' : '👁️'; });
    // düğmeler
    this.el.btns.querySelectorAll('[data-b]').forEach((b) => {
      const k = b.dataset.b;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch { /* yok */ }
        b.classList.add('on');
        if (k === 'dig') this.digging = true;
        else if (k === 'put') this.tryPut();
        else if (k === 'tnt') this.tryTnt();
        else if (k === 'jump') this.jumpHeld = true;
      });
      const up = (e) => { b.classList.remove('on'); if (k === 'dig') this.digging = false; if (k === 'jump') this.jumpHeld = false; e.preventDefault(); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', () => { b.classList.remove('on'); if (k === 'dig') this.digging = false; if (k === 'jump') this.jumpHeld = false; });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    this.el.bar.addEventListener('pointerdown', (e) => {
      const s = e.target.closest('.ba-slot');
      if (!s) return;
      e.preventDefault();
      this.sel = +s.dataset.k;
      this.renderBar(true);
      try { sfx.play('tap'); } catch { /* yok */ }
    });
    // dokunma: sol alt yarım = yürüme kolu, gerisi = bakış
    const cv = this.el.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      if (!this.playing()) { if (!this.look) this.look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, mouse: e.pointerType === 'mouse', t: performance.now() }; return; }
      const r = this.el.wrap.getBoundingClientRect();
      const lx = e.clientX - r.left, ly = e.clientY - r.top;
      try { cv.setPointerCapture(e.pointerId); } catch { /* yok */ }
      if (e.pointerType !== 'mouse' && lx < r.width * 0.42 && ly > r.height * 0.35 && !this.joy) {
        this.joy = { id: e.pointerId, bx: e.clientX, by: e.clientY, x: 0, y: 0 };
        this.el.joy.style.display = 'block';
        this.el.joy.style.transform = `translate(${lx}px, ${ly}px)`;
        this.el.knob.style.transform = '';
        this.el.joyhint.style.display = 'none';
        this.joyOrg = [lx, ly];
        return;
      }
      if (e.pointerType === 'mouse' && e.button === 2) { this.tryPut(); return; }
      if (!this.look) {
        this.look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, mouse: e.pointerType === 'mouse', t: performance.now() };
        if (e.pointerType === 'mouse' && e.button === 0) { this.mouseDig = true; }
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const j = this.joy;
      if (j && j.id === e.pointerId) {
        let dx = e.clientX - j.bx, dy = e.clientY - j.by;
        const R = 46, len = Math.hypot(dx, dy);
        if (len > R) { dx *= R / len; dy *= R / len; }
        j.x = dx / R; j.y = dy / R;
        this.el.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        return;
      }
      const L = this.look;
      if (L && L.id === e.pointerId) {
        const dx = e.clientX - L.x, dy = e.clientY - L.y;
        L.x = e.clientX; L.y = e.clientY;
        if (Math.hypot(e.clientX - L.sx, e.clientY - L.sy) > 7) this.mouseDig = false;
        const k = L.mouse ? 0.0055 : 0.0072;
        this.cam.yaw -= dx * k;
        this.cam.pitch = clamp(this.cam.pitch - dy * k * 0.85, -1.35, 1.25);
      }
    });
    const end = (e) => {
      if (this.joy && this.joy.id === e.pointerId) { this.joy = null; this.el.joy.style.display = 'none'; }
      if (this.look && this.look.id === e.pointerId) {
        const L = this.look;
        this.look = null;
        // ekrana dokunmak yalnızca bakış içindir: blok yalnızca 🧱 düğmesiyle konur
        this.mouseDig = false;
      }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    this.onKey = (e) => {
      if (this.dead) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (e.type === 'keydown') {
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
        this.keys.add(k);
        if (k >= '1' && k <= '6') { this.sel = +k - 1; this.renderBar(true); }
        if (k === 'v') this.el.view.click();
        if (k === 'f' || k === 'e') this.tryPut();
        if (k === 'g' || k === 'q') this.tryTnt();
      } else this.keys.delete(k);
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    this.onBlur = () => { this.keys.clear(); this.digging = false; this.jumpHeld = false; this.joy = null; this.el.joy.style.display = 'none'; };
    window.addEventListener('blur', this.onBlur);
    this.onWheel = (e) => { if (!this.playing()) return; this.sel = (this.sel + (e.deltaY > 0 ? 1 : 5)) % 6; this.renderBar(true); };
    cv.addEventListener('wheel', this.onWheel, { passive: true });
  }
  playing() { const v = this.view; return !!(v && (v.phase === 'play' || v.phase === 'ready') && this.me && this.wb); }

  /* ---------- sunucudan gelen görünüm ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.ba !== '1') { root.dataset.ba = '1'; root.innerHTML = '<p class="py-16 text-center">⛏️</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.el.wrap.classList.toggle('play', v.phase === 'play');
    if (v.seed && (v.seed !== this.seed || (v.map | 0) !== (this.map | 0)) && v.phase !== 'final') this.newWorld(v);
    if (v.es && this.wb) this.applyEdits(v);
    if (v.inv) this.inv = v.inv;
    if (v.players) this.syncPlayers(v);
    if (v.ev) this.onEvents(v);
    if (!prev || prev.phase !== v.phase) this.onPhase(prev, v);
    this.panel();
    this.renderBar();
  }
  newWorld(v) {
    this.seed = v.seed;
    this.map = v.map | 0;
    const g = baGen(v.seed, this.map);
    MAGL = magLight(g.b);
    this.magTop = [];
    if (MAGL) for (let i = 0; i < g.b.length; i++) if (g.b[i] === 38 && i + W * D < g.b.length && g.b[i + W * D] === 0) this.magTop.push(i);
    this.amb = [];
    this.wb = g.b;
    this.hgt = g.hgt;
    this.applied = 0;
    this.pend.clear();
    this.evSeen = 0;
    this.evFirst = true;
    this.me = null;
    this.R = [];
    if (this.X) this.remeshAll();
  }
  remeshAll() {
    this.chunks.forEach((c) => c && ['op', 'wa', 'pl'].forEach((k) => voxFree(this.X, c[k])));
    this.chunks = [];
    for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) this.dirty.add(cz * NCX + cx);
    this.flushMesh(99);
  }
  markDirty(i) {
    const x = i % W, z = Math.floor(i / W) % D;
    const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const ax = Math.floor((x + dx) / CH), az = Math.floor((z + dz) / CH);
      if (ax < 0 || az < 0 || ax >= NCX || az >= NCZ) continue;
      if (ax !== cx || az !== cz || (dx === 0 && dz === 0)) this.dirty.add(az * NCX + ax);
    }
  }
  flushMesh(max = 3) {
    if (!this.X || !this.wb) return;
    let n = 0;
    for (const k of this.dirty) {
      if (n >= max) break;
      this.dirty.delete(k);
      const cx = k % NCX, cz = Math.floor(k / NCX);
      const m = meshChunk(this.wb, cx, cz);
      const old = this.chunks[k];
      if (old) ['op', 'wa', 'pl'].forEach((q) => voxFree(this.X, old[q]));
      this.chunks[k] = { op: voxBuf(this.X, m.op), wa: voxBuf(this.X, m.wa), pl: voxBuf(this.X, m.pl) };
      n += 1;
    }
  }
  setLocal(i, t) {
    if (!this.wb || this.wb[i] === t) return;
    this.wb[i] = t;
    this.markDirty(i);
  }
  applyEdits(v) {
    const e0 = v.e0 | 0, es = v.es;
    if (e0 > this.applied) {
      const now = performance.now();
      if (now - (this.syncAt || 0) > 1500) { this.syncAt = now; try { this.ctx.sendQuiet ? this.ctx.sendQuiet('sync', {}) : this.ctx.send('sync', {}); } catch { /* yok */ } }
      return;
    }
    const n = es.length / 2;
    for (let k = this.applied - e0; k < n; k++) {
      const i = es[k * 2], t = es[k * 2 + 1];
      const old = this.wb[i];
      const pd = this.pend.get(i);
      if (pd) this.pend.delete(i);
      if (old !== t) {
        this.setLocal(i, t);
        // başkasının kazdığı/koyduğu blok: parçacık + ses (uzaklığa göre)
        if (!pd && !this.evFirstEdits) {
          const x = i % W, z = Math.floor(i / W) % D, y = Math.floor(i / (W * D));
          const dist = this.me ? Math.hypot(x + 0.5 - this.me.x, y + 0.5 - this.me.y, z + 0.5 - this.me.z) : 99;
          const vol = clamp(1 - dist / 22, 0, 1) * 0.7;
          if ((t === 0 || t === 10) && old) { this.burst(x, y, z, old, 8); this.snd.play('break', mat(old), vol); }
          else if (t === 10 && !old && dist < 9 && performance.now() - (this.flowSnd || 0) > 650) { this.flowSnd = performance.now(); this.snd.play('splash', 'dirt', 0.25 + vol * 0.3); }
          else if (t && t !== 10) this.snd.play('place', mat(t), vol);
        }
      }
    }
    this.applied = Math.max(this.applied, e0 + n);
    this.evFirstEdits = false;
  }
  syncPlayers(v) {
    const ps = v.ps || [];
    v.players.forEach((p, i) => {
      const s = ps[i] || [0, 0, 0, 0, 0];
      let r = this.R[i];
      if (!r || r.id !== p.id) {
        r = this.R[i] = { id: p.id, c: p.c, n: p.n, x: s[0], y: s[1], z: s[2], r: s[3], tx: s[0], ty: s[1], tz: s[2], tr: s[3], f: s[4], ph: 0, sw: 0, tag: null };
      }
      r.c = p.c; r.n = p.n; r.on = p.on;
      r.tx = s[0]; r.ty = s[1]; r.tz = s[2]; r.tr = s[3]; r.f = s[4];
    });
    this.R.length = v.players.length;
    if (v.me >= 0 && !this.me && this.wb && ps[v.me]) {
      const s = ps[v.me];
      this.me = { x: s[0], y: s[1], z: s[2], vx: 0, vy: 0, vz: 0, ground: false, water: false, ph: 0, sw: 0, placeT: 0 };
      this.cam.yaw = s[3];
      this.cam.pitch = -0.36;
    }
  }
  onEvents(v) {
    for (const e of v.ev) {
      if (e[0] <= this.evSeen) continue;
      this.evSeen = e[0];
      if (this.evFirst) continue;
      if (e[1] === 'o') {
        const who = v.players[e[2]], t = e[3], L = ORE_LBL[t] || ['', ''];
        const x = e[4] % W, z = Math.floor(e[4] / W) % D, y = Math.floor(e[4] / (W * D));
        if (e[2] === v.me) {
          this.pop(`+${PTS[t]} ${L[0]} ${L[1]}!`, t === 8 ? 'gem' : t === 19 ? 'emer' : t === 17 || t === 18 ? 'sm' : '');
          this.snd.play(t === 8 || t === 19 ? 'gem' : t === 14 ? 'chest' : 'gold', 'stone', t === 17 ? 0.45 : t === 18 ? 0.7 : 1);
          vibrate(t === 8 ? [20, 40, 30] : 18);
          this.sparkle(x, y, z, t);
          if (t === 8) this.flash = 0.45;
          if (t === 14) this.hint('Sandıktan 2 dinamit çıktı 🧨', 2600);
        } else if (who) {
          if (PTS[t] >= 4) this.feed(`<b style="color:${pcol(who.c)}">${esc(who.n)}</b> ${L[0]} ${L[1].toLowerCase()} buldu (+${PTS[t]})`);
          if (t === 8) this.snd.play('gem', 'stone', 0.3);
        }
      } else if (e[1] === 't') {
        const who = v.players[e[2]];
        if (e[2] === v.me) { this.pop(e[3] === 2 ? '💎 Elmas kazma!' : '⚒️ Demir kazma!', e[3] === 2 ? 'gem' : ''); this.hint('Kazman gelişti: artık daha hızlı kazıyorsun', 3600); this.snd.play('chest'); this.pick = null; }
        else if (who) this.feed(`<b style="color:${pcol(who.c)}">${esc(who.n)}</b> ${e[3] === 2 ? 'elmas' : 'demir'} kazmaya geçti`);
      } else if (e[1] === 'f') {
        const i = e[3], x = i % W, z = Math.floor(i / W) % D, y = Math.floor(i / (W * D));
        this.fuses.push({ x, y, z, t: this.time });
        this.snd.play('fuse', 'stone', this.volAt(x, y, z));
      } else if (e[1] === 'x') this.explode(e[3]);
    }
    this.evFirst = false;
  }
  onPhase(prev, v) {
    try { this.snd.music(v.phase === 'play' ? 'race' : v.phase === 'ready' || v.phase === 'final' ? 'idle' : null); } catch { /* yok */ }
    if (v.phase === 'play' && prev && prev.phase === 'ready') {
      this.snd.play('go');
      this.el.msg.innerHTML = '<span class="big">KAZ! ⛏️</span>';
      setTimeout(() => { if (!this.dead && this.el.msg.textContent.includes('KAZ')) this.el.msg.innerHTML = ''; }, 1300);
      this.hint(MAP_HINT[this.map | 0] || MAP_HINT[0], 7000);
    }
    if (v.phase === 'final') { this.snd.play('end'); this.digging = false; }
    if (v.phase === 'ready') this.hint('', 0);
  }
  hint(t, ms) {
    this.el.hint.textContent = t;
    clearTimeout(this.hintT);
    if (ms) this.hintT = setTimeout(() => { if (!this.dead) this.el.hint.textContent = ''; }, ms);
  }
  volAt(x, y, z) { return this.me ? clamp(1.15 - Math.hypot(x + 0.5 - this.me.x, y + 0.5 - this.me.y, z + 0.5 - this.me.z) / 26, 0, 1) : 0.5; }
  // maden toplandı: parlak kıvılcımlar yukarı saçılır
  sparkle(x, y, z, t) {
    const n = t === 8 ? 26 : t === 19 ? 20 : t === 17 ? 8 : 14;
    for (let k = 0; k < n && this.parts.length < 260; k++) {
      const a = Math.random() * TAU, sp = 1 + Math.random() * 2.6;
      this.parts.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, vx: Math.cos(a) * sp, vy: 2.5 + Math.random() * 4, vz: Math.sin(a) * sp, t, life: 0.7 + Math.random() * 0.6, s: 0.05 + Math.random() * 0.05, r: Math.random() * 6, glow: 1 });
    }
  }
  explode(i) {
    const x = i % W, z = Math.floor(i / W) % D, y = Math.floor(i / (W * D));
    this.fuses = this.fuses.filter((f) => !(f.x === x && f.y === y && f.z === z));
    const vol = this.volAt(x, y, z);
    this.snd.play('boom', 'stone', vol);
    for (let k = 0; k < 46 && this.parts.length < 300; k++) {
      const a = Math.random() * TAU, e = (Math.random() - 0.3) * 1.5, sp = 3 + Math.random() * 7;
      this.parts.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 3, vz: Math.sin(a) * Math.cos(e) * sp, t: k % 5 === 0 ? 33 : k % 3 === 0 ? 2 : 3, life: 0.8 + Math.random() * 0.8, s: 0.08 + Math.random() * 0.12, r: Math.random() * 6 });
    }
    this.booms.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, t: this.time });
    if (vol > 0.25) { this.shake = Math.max(this.shake || 0, vol * 0.55); this.flash = Math.max(this.flash || 0, vol * 0.4); vibrate([30, 30, 60]); }
    // yakındaysam savrulurum
    const p = this.me;
    if (p) { const dx = p.x - x - 0.5, dy = p.y + 0.9 - y - 0.5, dz = p.z - z - 0.5, d = Math.hypot(dx, dy, dz); if (d < 5) { const k = (5 - d) * 2.2 / Math.max(0.4, d); p.vx = (p.vx || 0) + dx * k; p.vz = (p.vz || 0) + dz * k; p.vy = Math.max(p.vy || 0, 4 + (5 - d) * 1.4); p.ground = false; p.kb = 0.5; } }
  }
  tryTnt() {
    const v = this.view, h = this.hit, p = this.me;
    if (!v || v.phase !== 'play' || !p) return;
    if (!(v.tnt > 0)) { this.snd.play('deny'); this.hint('Dinamitin yok — sandıklardan çıkar 🎁', 2000); return; }
    if (!h) { this.snd.play('deny'); this.hint('Dinamiti koymak için bir bloğa bak', 1800); return; }
    if (performance.now() - (this.tntAt || 0) < 600) return;
    const pl = isPlant(h.b), tx = pl ? h.x : h.x + h.n[0], ty = pl ? h.y : h.y + h.n[1], tz = pl ? h.z : h.z + h.n[2];
    if (tx < 0 || tz < 0 || tx >= W || tz >= D || ty < 1 || ty >= H - 1) return;
    const cur = this.blk(tx, ty, tz);
    if (!(cur === 0 || isPlant(cur)) || !this.reachOk(tx, ty, tz)) { this.snd.play('deny'); return; }
    const inside = (q) => Math.abs(q.x - (tx + 0.5)) < 0.5 + PW - 0.02 && Math.abs(q.z - (tz + 0.5)) < 0.5 + PW - 0.02 && q.y < ty + 1 - 0.02 && q.y + PH > ty;
    if (inside(p)) { this.snd.play('deny'); this.hint('Çok yakınsın — bir adım geri çekil, sonra koy 🧨', 1800); return; }
    for (let k = 0; k < this.R.length; k++) { if (k === v.me) continue; const r = this.R[k]; if (r && inside(r)) { this.snd.play('deny'); return; } }
    this.tntAt = performance.now();
    const i = I(tx, ty, tz);
    this.pend.set(i, { old: cur, t: performance.now() });
    this.setLocal(i, 33);
    this.snd.play('place', 'wood', 1);
    vibrate(12);
    this.hint('Uzaklaş! 🧨', 1500);
    try { this.ctx.send('tnt', { i }); } catch { /* yok */ }
  }
  // maden dedektörü: yakındaki en değerli maden
  detect() {
    const p = this.me, el = this.el.det;
    if (!p || !this.wb || !this.view || this.view.phase !== 'play') { if (el.textContent) { el.textContent = ''; el.className = 'ba-det'; } return; }
    const px = Math.floor(p.x), py = Math.floor(p.y + 1), pz = Math.floor(p.z), R = 7;
    let best = 0, bd = 99, bv = 0;
    for (let y = Math.max(1, py - R); y <= Math.min(H - 1, py + R); y++) for (let z = Math.max(0, pz - R); z <= Math.min(D - 1, pz + R); z++) for (let x = Math.max(0, px - R); x <= Math.min(W - 1, px + R); x++) {
      const t = this.wb[I(x, y, z)];
      if (!PTS[t] || t === 17) continue;
      const d = Math.hypot(x - px, y - py, z - pz);
      if (d > R) continue;
      const val = PTS[t] * (1.3 - d / R);
      if (val > bv) { bv = val; best = t; bd = d; }
    }
    const lv = best ? (bd < 2.5 ? 3 : bd < 4.5 ? 2 : 1) : 0;
    const txt = best ? `${ORE_LBL[best][0]} ${ORE_LBL[best][1]} ${'▮'.repeat(lv)}${'▯'.repeat(3 - lv)}` : '';
    if (el.textContent !== txt) { el.textContent = txt; el.className = 'ba-det' + (best ? ' on l' + lv : ''); el.style.color = best ? ORE_RGB[best] : ''; if (lv === 3 && this.detLv !== 3) this.snd.play('tick', 'stone', 0.6); }
    this.detLv = lv;
  }
  pop(text, gem) {
    const d = document.createElement('div');
    d.className = 'ba-pop' + (gem ? ' ' + gem : '');
    d.textContent = text;
    this.el.wrap.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }
  feed(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    this.el.feed.appendChild(d);
    while (this.el.feed.children.length > 4) this.el.feed.firstChild.remove();
    setTimeout(() => d.remove(), 4600);
  }

  /* ---------- envanter çubuğu ---------- */
  myColor() { const v = this.view; return v && v.me >= 0 && v.players[v.me] ? v.players[v.me].c : 0; }
  slotT(k) { const hb = HOTS[this.map | 0] || HOT; return hb[k] < 0 ? 20 + this.myColor() : hb[k]; }
  renderBar(force) {
    const inv = this.inv || {};
    const key = HOT.map((_, k) => inv[this.slotT(k)] || 0).join(',') + '|' + this.sel + '|' + this.myColor() + '|' + (this.map | 0);
    if (!force && key === this.barKey) return;
    this.barKey = key;
    if (!this.atlasUrl) { try { this.atlasUrl = (this.atlasCv || (this.atlasCv = drawAtlas())).toDataURL(); } catch { this.atlasUrl = ''; } }
    this.el.bar.innerHTML = HOT.map((_, k) => {
      const t = this.slotT(k), n = inv[t] || 0, tl = FACE_T(t, 4);
      const px = (tl % 8) * (100 / 7), py = Math.floor(tl / 8) * (100 / 7);
      return `<div class="ba-slot ${k === this.sel ? 'on' : ''} ${n ? '' : 'no'}" data-k="${k}" title="${esc(t >= 20 ? 'Renkli blok' : NAME[t] || '')}"><div class="ic" style="background-image:url(${this.atlasUrl});background-position:${px}% ${py}%"></div><b>${n}</b></div>`;
    }).join('');
  }

  /* ---------- fizik ---------- */
  blk(x, y, z) { if (x < 0 || z < 0 || x >= W || z >= D) return 0; if (y < 0) return 9; if (y >= H) return 0; return this.wb[I(x, y, z)]; }
  // gövde bloğun içinde kaldıysa (biri dibime blok koydu vb.) en yakın boş yere çık: önce bir blok yukarı, sonra yanlar
  unstick() {
    const p = this.me;
    if (!this.hitsAt(p.x, p.y, p.z)) return true;
    const fx = Math.floor(p.x) + 0.5, fz = Math.floor(p.z) + 0.5, fy = Math.floor(p.y + 0.001);
    const C = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1], [0, 2, 0], [0, -1, 0]];
    for (let k = 0; k < C.length; k++) {
      const x = C[k][0] ? fx + C[k][0] : p.x, z = C[k][2] ? fz + C[k][2] : p.z, y = fy + C[k][1];
      if (y < 1 || y > H - 2 || x < PW || z < PW || x > W - PW || z > D - PW) continue;
      if (!this.hitsAt(x, y, z)) { p.x = x; p.y = y; p.z = z; if (p.vy < 0) p.vy = 0; return true; }
    }
    return false;
  }
  hitsAt(x, y, z) {
    const x0 = Math.floor(x - PW), x1 = Math.floor(x + PW), y0 = Math.floor(y), y1 = Math.floor(y + PH - 0.01), z0 = Math.floor(z - PW), z1 = Math.floor(z + PW);
    for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (isSolid(this.blk(xx, yy, zz))) return true;
    return false;
  }
  stepMe(dt) {
    const p = this.me;
    if (!p) return;
    const k = this.keys;
    let fx = 0, fz = 0;
    if (this.joy) { fx = this.joy.x; fz = -this.joy.y; }
    if (k.has('w') || k.has('arrowup')) fz += 1;
    if (k.has('s') || k.has('arrowdown')) fz -= 1;
    if (k.has('a') || k.has('arrowleft')) fx -= 1;
    if (k.has('d') || k.has('arrowright')) fx += 1;
    const ln = Math.hypot(fx, fz);
    if (ln > 1) { fx /= ln; fz /= ln; }
    const yaw = this.cam.yaw, sy = Math.sin(yaw), cy = Math.cos(yaw);
    const wx = sy * fz - cy * fx, wz = cy * fz + sy * fx;
    const bx = Math.floor(p.x), bz = Math.floor(p.z);
    const inW = this.blk(bx, Math.floor(p.y + 0.15), bz) === 10 || this.blk(bx, Math.floor(p.y + 0.95), bz) === 10;
    if (inW && !p.water && p.vy < -4) this.snd.play('splash', 'dirt', 0.8);
    if (inW && !p.water && !this.swimHint && this.view && this.view.phase === 'play') { this.swimHint = true; this.hint('Suda 🏊 kendiliğinden yüzeye çıkarsın. Kıyıya doğru yürü, kenara gelince tırmanırsın. ⤒ yukarı, aşağı bakıp ilerle: dal.', 5200); }
    p.water = inW;
    p.jumpCd = Math.max(0, (p.jumpCd || 0) - dt);
    const run = !inW && !this.digging && ((this.joy && ln > 0.94) || k.has('shift')) && ln > 0.5;
    const spd = (inW ? 2.6 : run ? 5.7 : 4.3) * (this.digging && p.ground ? 0.55 : 1);
    const onIce = p.ground && this.blk(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z)) === 35;
    const fr = onIce ? 2.2 : p.ground || inW ? 14 : 4;
    p.vx = damp(p.vx, wx * spd, fr, dt);
    p.vz = damp(p.vz, wz * spd, fr, dt);
    const jump = this.jumpHeld || k.has(' ');
    if (p.hopT > 0) {
      // sudan çıkış: kenarın üstüne doğru küçük sıçrayış (su direnci yok)
      p.hopT -= dt;
      p.vy -= 27 * dt;
    } else if (inW) {
      // yüzme: kendiliğinden yüzeye çıkar (göğüs hizasında süzülür); ⤒ yukarı; aşağı bakıp ileri gitmek dalıştır; kazarken olduğu yerde kalır
      let sy = Math.floor(p.y + 0.15);
      while (sy < H && this.blk(bx, sy, bz) === 10) sy++;
      // dalış/çıkış yalnızca kamera belirgin şekilde aşağı (ya da yukarı) bakarken ileri gidince: normal bakışta yüzeyde kalır
      const pit = this.cam.pitch, pk = pit < -0.62 ? (pit + 0.62) / 0.55 : pit > 0.2 ? (pit - 0.2) / 0.55 : 0;
      const dive = clamp(pk, -1, 1) * Math.max(0, fz) * 3.4;
      const floatT = clamp((sy - 1.2 - p.y) * 2.4, -1.6, 2.4);
      const vT = jump ? 3.8 : this.digging ? 0 : Math.abs(dive) > 0.45 ? dive : floatT;
      p.vy = damp(p.vy, vT, 4.5, dt);
    } else {
      p.vy -= 27 * dt;
      if (p.vy < -30) p.vy = -30;
      // kenardan düşerken kısa bir süre daha zıplanabilir (coyote), arka arkaya çift zıplama olmaz
      p.coy = p.ground ? 0.12 : Math.max(0, (p.coy || 0) - dt);
      if (jump && (p.ground || p.coy > 0) && !(p.jumpCd > 0)) { p.vy = 8.6; p.ground = false; p.coy = 0; p.jumpCd = 0.22; this.snd.play('jump', 'dirt', 0.6); }
    }
    // kendiliğinden zıplama: önünde tek blokluk basamak varsa
    if (p.ground && !inW && Math.hypot(p.vx, p.vz) > 1) {
      const ax = p.x + Math.sign(p.vx) * (PW + 0.12) * (Math.abs(p.vx) > 0.3 ? 1 : 0), az = p.z + Math.sign(p.vz) * (PW + 0.12) * (Math.abs(p.vz) > 0.3 ? 1 : 0);
      if (this.hitsAt(ax, p.y + 0.05, az) && !this.hitsAt(ax, p.y + 1.05, az) && !this.hitsAt(p.x, p.y + 1.05, p.z)) { p.vy = 8.0; p.ground = false; }
    }
    if (inW && !p.climb && ln > 0.25 && !(p.hopT > 0)) {
      const dl = Math.hypot(wx, wz) || 1, dx = wx / dl, dz = wz / dl;
      const ax = p.x + dx * (PW + 0.22), az = p.z + dz * (PW + 0.22);
      if (this.hitsAt(ax, p.y + 0.05, az) || this.hitsAt(ax, p.y + 0.8, az)) {
        for (let ty = Math.floor(p.y) + 1; ty <= Math.floor(p.y) + 3; ty++) {
          if (ty - p.y > 2.6) break;
          if (!isSolid(this.blk(Math.floor(ax), ty - 1, Math.floor(az)))) continue;
          if (this.hitsAt(ax, ty + 0.02, az)) continue;
          if (this.hitsAt(p.x, Math.min(ty + 0.02, p.y + 2.5), p.z) && ty - p.y > 0.3) break;
          p.climb = { top: ty + 0.02, dx, dz, t: 0 };
          break;
        }
      }
    }
    if (p.climb) {
      const c = p.climb;
      c.t += dt;
      p.vy = 5.4;
      p.vx = c.dx * 0.9; p.vz = c.dz * 0.9;
      if (p.y >= c.top || c.t > 0.85) { p.climb = null; p.vy = 3.2; p.vx = c.dx * 3.4; p.vz = c.dz * 3.4; p.hopT = 0.3; this.snd.play('step', 'dirt', 0.5); }
    }
    const was = p.ground, vyWas = p.vy;
    p.ground = false;
    // içinde kaldıysak önce çık; çıkamadıysak yalnızca yatay yürüyerek kurtul (düşme, yukarı fırlama yok)
    const ghost = !this.unstick();
    if (ghost) { p.vy = 0; p.ground = true; }
    const mv = (ax, d) => {
      if (ghost) { if (ax === 0) p.x += d; else if (ax === 2) p.z += d; return; }
      if (!d) return;
      const n = Math.ceil(Math.abs(d) / 0.3);
      for (let s = 0; s < n; s++) {
        const st = d / n;
        if (ax === 0) { p.x += st; if (this.hitsAt(p.x, p.y, p.z)) { p.x -= st; p.vx = 0; break; } }
        else if (ax === 2) { p.z += st; if (this.hitsAt(p.x, p.y, p.z)) { p.z -= st; p.vz = 0; break; } }
        else {
          p.y += st;
          if (this.hitsAt(p.x, p.y, p.z)) {
            p.y -= st;
            if (st < 0) { p.ground = true; const sy = Math.floor(p.y + 0.001); if (!this.hitsAt(p.x, sy, p.z)) p.y = sy; }
            p.vy = 0;
            break;
          }
        }
      }
    };
    mv(0, p.vx * dt);
    mv(2, p.vz * dt);
    mv(1, p.vy * dt);
    p.x = clamp(p.x, PW + 0.01, W - PW - 0.01);
    p.z = clamp(p.z, PW + 0.01, D - PW - 0.01);
    // magma: basınca yakar ve havaya fırlatır
    if (p.ground && this.blk(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z)) === 38) {
      p.vy = 9.8; p.ground = false;
      const a = Math.random() * TAU;
      p.vx += Math.cos(a) * 3; p.vz += Math.sin(a) * 3;
      this.shake = Math.max(this.shake || 0, 0.15);
      this.snd.play('hot', 'stone', 1);
      vibrate(30);
      if (performance.now() - (this.hotAt || 0) > 4000) { this.hotAt = performance.now(); this.hint('Sıcak! 🔥 Magmaya basma', 1800); }
      for (let k = 0; k < 8 && this.parts.length < 280; k++) this.parts.push({ x: p.x + (Math.random() - 0.5) * 0.6, y: p.y + 0.1, z: p.z + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 2, t: 38, life: 0.5 + Math.random() * 0.4, s: 0.05, r: Math.random() * 6, glow: 1 });
    }
    if (!was && p.ground && vyWas < -7) { const bt = this.blk(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z)); if (bt && bt !== 10) this.burst(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z), bt, vyWas < -13 ? 9 : 5, [0, 1, 0]); this.landK = Math.min(1, -vyWas / 16); if (vyWas < -15) this.shake = Math.max(this.shake || 0, 0.12); }
    if (!was && p.ground && vyWas < -9) this.snd.play('land', mat(this.blk(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z))), 0.8);
    // biri ayağımın dibine blok koyduysa: yukarı it
    if (!ghost) this.unstick();
    if (p.y < -4) { p.y = this.hgt ? this.hgt[Math.floor(p.z) * W + Math.floor(p.x)] + 2 : H; p.vy = 0; }
    // yürüme sesi ve animasyonu
    const hs = Math.hypot(p.vx, p.vz);
    p.ph += hs * dt * 2.6;
    if (p.ground && hs > 1.2) {
      this.stepT += dt * hs;
      if (this.stepT > 1.55) { this.stepT = 0; if (run) { const bt = this.blk(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z)); if (bt && bt !== 10) this.burst(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z), bt, 2, [0, 1, 0]); } this.snd.play('step', mat(this.blk(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z))), 0.5); }
    }
    p.walk = hs > 0.6;
    { // karakter yürüdüğü yöne döner; kazarken ve blok koyarken baktığı yöne
      const busy = this.digging || this.mouseDig || performance.now() - p.placeT < 500 || this.cam.fp;
      const tgt = p.walk && !busy ? Math.atan2(p.vx, p.vz) : this.cam.yaw;
      if (p.face == null) p.face = tgt;
      let df = tgt - p.face; df = Math.atan2(Math.sin(df), Math.cos(df));
      p.face += df * Math.min(1, dt * 11);
    }
    p.run = run;
    p.f = (p.walk ? 1 : 0) | (this.digging || this.mouseDig ? 2 : 0) | (performance.now() - p.placeT < 300 ? 4 : 0) | (inW ? 8 : 0);
  }

  /* ---------- kamera + hedef ---------- */
  camDir() { const c = this.cam; return [Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)]; }
  stepCam(dt) {
    const c = this.cam, p = this.me;
    const asp = (this.vw || 1) / (this.vh || 1);
    this.fovK = damp(this.fovK || 0, p && p.run && p.walk ? 1 : 0, 6, dt);
    this.fov = (asp < 0.8 ? 1.24 : 1.1) + (c.fp ? 0.08 : 0) + this.fovK * 0.07;
    const d = this.camDir();
    if (!p) {
      // izleyici: adanın üstünde yavaşça döner
      c.yaw += dt * 0.08;
      const r = 46;
      c.ex = W / 2 + Math.sin(c.yaw) * -r; c.ez = D / 2 + Math.cos(c.yaw) * -r; c.ey = 36;
      c.tx = W / 2; c.ty = SEA + 2; c.tz = D / 2;
      return;
    }
    // göz yüksekliği yumuşar: basamak çıkarken kamera zıplamaz
    if (this.eyeY == null || Math.abs(this.eyeY - p.y) > 2.5) this.eyeY = p.y;
    this.eyeY = damp(this.eyeY, p.y, p.ground ? 14 : 30, dt);
    this.landK = Math.max(0, (this.landK || 0) - dt * 4.5);
    const fpBob = c.fp && p.walk && p.ground ? Math.sin(p.ph * 2) * 0.04 : 0;
    const eye = [p.x, this.eyeY + EYE + fpBob - this.landK * 0.14, p.z];
    if (c.fp) {
      c.ex = eye[0]; c.ey = eye[1]; c.ez = eye[2];
    } else {
      const right = [-Math.cos(c.yaw), 0, Math.sin(c.yaw)];
      const want = c.dist;
      const sh = asp < 0.8 ? 0.35 : 0.55;
      let best = want;
      for (let s = 0.3; s <= want; s += 0.15) {
        const qx = eye[0] - d[0] * s + right[0] * sh * (s / want), qy = eye[1] - d[1] * s + 0.25 * (s / want), qz = eye[2] - d[2] * s + right[2] * sh * (s / want);
        if (hides(this.blk(Math.floor(qx), Math.floor(qy), Math.floor(qz))) || hides(this.blk(Math.floor(qx), Math.floor(qy - 0.15), Math.floor(qz)))) { best = Math.max(0.3, s - 0.3); break; }
      }
      c.cur = c.cur == null ? best : best < c.cur ? best : damp(c.cur, best, 5, dt);
      const s = c.cur;
      // dar yerde (tünel, kuyu) kamera omuzda sıkışmasın: kendiliğinden göz hizasına geçer
      const tight = clamp((1.7 - s) / 0.6, 0, 1), sk = (1 - tight) * (s / want), sb = s * (1 - tight);
      c.ex = eye[0] - d[0] * sb + right[0] * sh * sk;
      c.ey = eye[1] - d[1] * sb + 0.25 * sk;
      c.ez = eye[2] - d[2] * sb + right[2] * sh * sk;
    }
    c.tx = c.ex + d[0]; c.ty = c.ey + d[1]; c.tz = c.ez + d[2];
  }
  // ekran merkezinden ışın: ilk dolu blok + yüz normali (DDA)
  ray() {
    const c = this.cam, d = this.camDir();
    let x = Math.floor(c.ex), y = Math.floor(c.ey), z = Math.floor(c.ez);
    const sx = Math.sign(d[0]) || 1, sy = Math.sign(d[1]) || 1, sz = Math.sign(d[2]) || 1;
    const tdx = Math.abs(1 / (d[0] || 1e-9)), tdy = Math.abs(1 / (d[1] || 1e-9)), tdz = Math.abs(1 / (d[2] || 1e-9));
    let tx = (sx > 0 ? x + 1 - c.ex : c.ex - x) * tdx, ty = (sy > 0 ? y + 1 - c.ey : c.ey - y) * tdy, tz = (sz > 0 ? z + 1 - c.ez : c.ez - z) * tdz;
    let n = [0, 0, 0], t = 0;
    const maxT = (this.cam.fp ? 0 : (this.cam.cur || 0)) + REACH + 0.5;
    // üçüncü kişide kamera ile karakter arasındaki blokları (ot, yaprak) hedefleme
    const minT = this.cam.fp ? 0 : Math.max(0, (this.cam.cur || 0) - 0.9);
    while (t < maxT) {
      const b = this.blk(x, y, z);
      if (b && b !== 10 && t >= minT) return { x, y, z, n, t, b };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; n = [-sx, 0, 0]; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tz; tz += tdz; n = [0, 0, -sz]; }
      if (y < -1 || y > H + 2) break;
    }
    return null;
  }
  reachOk(x, y, z) { const p = this.me; if (!p) return false; return Math.hypot(x + 0.5 - p.x, y + 0.5 - (p.y + 1.5), z + 0.5 - p.z) <= REACH; }
  stepTarget(dt) {
    let h = null;
    if (this.me && this.view && (this.view.phase === 'play' || this.view.phase === 'ready')) {
      h = this.ray();
      if (h && (!this.reachOk(h.x, h.y, h.z) || h.b === 9 || h.b === 38)) h = h && (h.b === 9 || h.b === 38) && this.reachOk(h.x, h.y, h.z) ? Object.assign(h, { bed: true }) : null;
    }
    this.hit = h;
    this.el.x.classList.toggle('on', !!h);
    const lab = h && (!h.bed || h.b === 38) ? (NAME[h.b] || (h.b >= 20 ? 'Renkli blok' : '')) : '';
    if (lab !== this.lastLab) { this.lastLab = lab; this.el.tgt.textContent = lab; }
    // kazma
    const can = this.view && this.view.phase === 'play';
    const want = (this.digging || this.mouseDig) && can && h && !h.bed;
    if (!want) { this.digT = Math.max(0, this.digT - dt * 3); if (!h || I(h.x, h.y, h.z) !== this.digI) { this.digT = 0; } this.swing = (this.digging || this.mouseDig) ? (this.swing || 0) + dt : 0; return; }
    const i = I(h.x, h.y, h.z);
    if (i !== this.digI) { this.digI = i; this.digT = 0; this.hitT = 0; }
    const hard = (HARD[h.b] || 0.6) / (1 + 0.4 * ((this.view && this.view.tool) || 0));
    this.digT += dt / hard;
    this.swing = (this.swing || 0) + dt;
    this.hitT = (this.hitT || 0) + dt;
    if (this.hitT > 0.23) { this.hitT = 0; this.snd.play('hit', mat(h.b), 0.8); this.burst(h.x, h.y, h.z, h.b, 2, h.n); }
    if (this.digT >= 1) {
      this.digT = 0;
      this.digI = -1;
      const old = h.b;
      const wet = h.y <= SEA && [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, b, c]) => this.blk(h.x + a, h.y + b, h.z + c) === 10);
      this.pend.set(i, { old, t: performance.now() });
      this.setLocal(i, wet ? 10 : 0);
      if (h.y + 1 < H && isPlant(this.blk(h.x, h.y + 1, h.z))) this.setLocal(I(h.x, h.y + 1, h.z), 0);
      this.burst(h.x, h.y, h.z, old, 12);
      this.snd.play('break', mat(old), 1);
      vibrate(10);
      try { this.ctx.send('dig', { i }); } catch { /* yok */ }
      if (!this.dugOnce) { this.dugOnce = true; this.hint('Derine in: değerli madenler aşağıda! Çıkmak için 🧱 ile basamak koy.', 5500); }
    }
  }
  tryPut() {
    const v = this.view, h = this.hit, p = this.me;
    if (!v || v.phase !== 'play' || !h || !p) return;
    if (performance.now() - (this.putAt || 0) < 170) return;
    const t = this.slotT(this.sel);
    if (!((this.inv || {})[t] > 0)) { this.snd.play('deny'); this.hint(t >= 20 ? 'Renkli bloğun bitti.' : `Hiç ${NAME[t] || 'blok'} yok — önce kaz!`, 1800); return; }
    const x = h.x + h.n[0], y = h.y + h.n[1], z = h.z + h.n[2];
    if (isPlant(h.b) && !(h.n[0] || h.n[1] || h.n[2])) return;
    const tx = isPlant(h.b) ? h.x : x, ty = isPlant(h.b) ? h.y : y, tz = isPlant(h.b) ? h.z : z;
    if (tx < 0 || tz < 0 || tx >= W || tz >= D || ty < 1 || ty >= H - 1) return;
    const cur = this.blk(tx, ty, tz);
    if (!(cur === 0 || cur === 10 || isPlant(cur))) return;
    if (!this.reachOk(tx, ty, tz)) return;
    // kendimin ya da bir başkasının içine koyma
    const inside = (q) => Math.abs(q.x - (tx + 0.5)) < 0.5 + PW - 0.02 && Math.abs(q.z - (tz + 0.5)) < 0.5 + PW - 0.02 && q.y < ty + 1 - 0.02 && q.y + PH > ty;
    if (inside(p)) { this.snd.play('deny'); return; }
    for (let k = 0; k < this.R.length; k++) { if (k === v.me) continue; const r = this.R[k]; if (r && inside(r)) { this.snd.play('deny'); return; } }
    this.putAt = performance.now();
    const i = I(tx, ty, tz);
    this.pend.set(i, { old: cur, t: performance.now() });
    this.setLocal(i, t);
    this.inv = Object.assign({}, this.inv, { [t]: this.inv[t] - 1 });
    this.renderBar();
    p.placeT = performance.now();
    this.snd.play('place', mat(t), 1);
    vibrate(8);
    try { this.ctx.send('put', { i, b: t }); } catch { /* yok */ }
  }
  // sunucu onaylamadıysa tahmini geri al
  stepPending() {
    const now = performance.now();
    for (const [i, pd] of this.pend) if (now - pd.t > 3500) { this.pend.delete(i); this.setLocal(i, pd.old); }
  }

  /* ---------- parçacıklar ---------- */
  burst(x, y, z, t, n, nrm) {
    if (!this.X || this.parts.length > 160) return;
    for (let k = 0; k < n; k++) {
      const o = nrm ? [x + 0.5 + nrm[0] * 0.52 + (nrm[0] ? 0 : Math.random() - 0.5), y + 0.5 + nrm[1] * 0.52 + (nrm[1] ? 0 : Math.random() - 0.5), z + 0.5 + nrm[2] * 0.52 + (nrm[2] ? 0 : Math.random() - 0.5)] : [x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6];
      this.parts.push({ x: o[0], y: o[1], z: o[2], vx: (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, t: isPlant(t) ? 6 : t, life: 0.6 + Math.random() * 0.5, s: 0.09 + Math.random() * 0.07, r: Math.random() * TAU });
    }
  }
  // Karlı Dağ'da kar yağar, Volkan Adası'nda magmadan közler yükselir (kameranın çevresinde)
  ambient(dt) {
    const m = this.map | 0, c = this.cam, A = this.amb || (this.amb = []);
    if (!this.X || !this.wb || (m !== 2 && m !== 3)) { if (A.length) this.amb = []; return; }
    if (m === 2) {
      this.ambT = (this.ambT || 0) + dt * 34;
      while (this.ambT > 1) {
        this.ambT -= 1;
        if (A.length >= 150) continue;
        A.push({ x: c.ex + (Math.random() - 0.5) * 30, y: c.ey + 5 + Math.random() * 7, z: c.ez + (Math.random() - 0.5) * 30, vx: 0.45, vy: -1.5 - Math.random() * 0.8, life: 12, s: 0.03 + Math.random() * 0.025, t: 34, ph: Math.random() * 6 });
      }
    } else if (this.magTop && this.magTop.length) {
      this.ambT = (this.ambT || 0) + dt * 14;
      for (let k = 0; this.ambT > 1 && k < 30; k++) {
        const i = this.magTop[Math.floor(Math.random() * this.magTop.length)];
        const x = i % W, z = Math.floor(i / W) % D, y = Math.floor(i / (W * D));
        if ((x - c.ex) * (x - c.ex) + (z - c.ez) * (z - c.ez) > 900 || A.length >= 60) continue;
        this.ambT -= 1;
        A.push({ x: x + Math.random(), y: y + 1.05, z: z + Math.random(), vx: (Math.random() - 0.5) * 0.5, vy: 1.1 + Math.random() * 1.4, life: 1.6 + Math.random() * 1.4, s: 0.03 + Math.random() * 0.035, t: 38, ph: Math.random() * 6 });
      }
      if (this.ambT > 3) this.ambT = 3;
    }
    for (const q of A) {
      q.x += (q.vx + Math.sin(this.time * 1.3 + q.ph) * 0.35) * dt;
      q.y += q.vy * dt;
      q.z += Math.cos(this.time * 1.1 + q.ph) * 0.3 * dt;
      q.life -= dt;
      if (q.t === 34 && isSolid(this.blk(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)))) q.life = 0;
    }
    this.amb = A.filter((q) => q.life > 0 && q.y > -2);
  }
  stepParts(dt) {
    for (const q of this.parts) {
      q.vy -= 18 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.vy < 0 && isSolid(this.blk(Math.floor(q.x), Math.floor(q.y - q.s), Math.floor(q.z)))) { q.y = Math.floor(q.y - q.s) + 1 + q.s; q.vy *= -0.25; q.vx *= 0.6; q.vz *= 0.6; }
      q.life -= dt;
    }
    this.parts = this.parts.filter((q) => q.life > 0);
  }

  /* ---------- oyuncular ---------- */
  stepRemote(dt) {
    const v = this.view;
    this.R.forEach((r, i) => {
      if (!r) return;
      if (v && i === v.me && this.me) { r.x = this.me.x; r.y = this.me.y; r.z = this.me.z; r.r = this.me.face == null ? this.cam.yaw : this.me.face; r.f = this.me.f; r.ph = this.me.ph; r.walk = this.me.walk; r.air = !this.me.ground && !this.me.water; return; }
      const jump = Math.hypot(r.tx - r.x, r.tz - r.z) > 6;
      const k = jump ? 1 : 1 - Math.exp(-dt * 9);
      const ox = r.x, oz = r.z;
      r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k;
      let dr = r.tr - r.r; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      r.r += dr * Math.min(1, dt * 10);
      const sp = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 0.001);
      r.ph += Math.min(sp, 6) * dt * 2.6;
      r.walk = (r.f & 1) || sp > 0.6;
    });
  }
  drawChar(X, r, i, isMe) {
    if (!r || (isMe && (this.cam.fp || (this.cam.cur || 9) < 1.75))) return;
    if (!isMe && Math.hypot(r.x - this.cam.ex, r.y + 1.2 - this.cam.ey, r.z - this.cam.ez) < 1.1) return;
    const ch = this.char(r.c);
    const mt = this.mats, base = mt.a, tmp = mt.b, out = mt.c;
    const bob = r.walk ? Math.abs(Math.sin(r.ph * 2)) * 0.05 : 0;
    const swim = r.f & 8 ? Math.sin(this.time * 3 + i) * 0.06 - 0.25 : 0;
    M.set(base, r.x, r.y + bob + swim, r.z, r.r, r.walk && !r.air ? 0.07 : 0);
    drawMesh(X, ch.body, base);
    // baş: bakış yönüne hafif eğilir (yalnızca ben)
    const pitch = isMe ? clamp(-this.cam.pitch * 0.5, -0.4, 0.4) : 0;
    M.set(tmp, 0, 1.38, 0, 0, pitch);
    M.mul(out, base, tmp);
    M.set(tmp, 0, -1.38, 0);
    M.mul(out, out, tmp);
    drawMesh(X, ch.head, out);
    const wk = r.walk ? Math.sin(r.ph * 2) : 0;
    const dig = r.f & 2, put = r.f & 4;
    for (const s of [-1, 1]) {
      // bacak
      M.set(tmp, s * 0.13, 0.74, 0, 0, r.air ? 0.35 * s : wk * 0.65 * s);
      M.mul(out, base, tmp);
      drawMesh(X, ch.leg, out);
      // kol: kazarken sağ kol iner kalkar
      let ax = -wk * 0.55 * s, az = s * 0.06;
      if (r.air) { ax = -0.5; az = s * 0.55; }
      if (s > 0 && dig) ax = -1.25 + Math.sin(this.time * 15 + i) * 0.7;
      else if (s > 0 && put) ax = -1.1;
      M.set(tmp, s * 0.37, 1.32, 0, 0, ax, az);
      M.mul(out, base, tmp);
      drawMesh(X, ch.arm, out);
      if (s > 0 && dig && this.pick) {
        M.set(tmp, 0, -0.56, 0.04, 0, -1.5);
        M.mul(mt.e, out, tmp);
        drawMesh(X, this.pick, mt.e);
      }
    }
  }

  /* ---------- çizim ---------- */
  resize() {
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    const Wp = Math.max(2, Math.round(w * dpr)), Hp = Math.max(2, Math.round(h * dpr));
    if (cv.width !== Wp || cv.height !== Hp) { cv.width = Wp; cv.height = Hp; }
    return [Wp, Hp, w / h];
  }
  draw() {
    const X = this.X;
    if (!X || this.lost || !this.wb) return;
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const c = this.cam, mt = this.mats;
    M.persp(mt.P, this.fov || 1, asp, 0.06, 220);
    // üstü kapalı yerde (mağara, kuyu) ortam kararır, baş lambası yanar
    let cov = 0;
    { const hx = Math.floor(this.me ? this.me.x : c.ex), hy = Math.floor(this.me ? this.me.y + 1.6 : c.ey), hz = Math.floor(this.me ? this.me.z : c.ez); for (let y = hy + 1; y < H && cov < 6; y++) { const q = this.blk(hx, y, hz); if (isSolid(q) && q !== 6) cov += 1; } }
    this.dark = damp(this.dark || 0, clamp(cov / 3, 0, 1), 3, 0.016);
    const dk = this.dark;
    if (this.shake > 0.004) { const k = this.shake; c.ex += (Math.random() - 0.5) * k; c.ey += (Math.random() - 0.5) * k; c.tx += (Math.random() - 0.5) * k; c.ty += (Math.random() - 0.5) * k; this.shake *= 0.86; }
    M.look(mt.V, c.ex, c.ey, c.ez, c.tx, c.ty, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const E = ENV[this.map | 0] || ENV[0];
    const F = { VP: mt.VP, V: mt.V, fov: this.fov || 1, asp, shift: 0, cx: c.ex, cy: c.ey, cz: c.ez, sun: SUN, fog: E.fog, top: E.top, hor: E.hor, sunVis: SUN, lx: 0, ly: -200, lz: 0, lampC: [0, 0, 0] };
    const under = this.blk(Math.floor(c.ex), Math.floor(c.ey), Math.floor(c.ez)) === 10;
    gl.viewport(0, 0, Wp, Hp);
    const FOGD = [E.fog[0] * (1 - dk) + 0.03 * dk, E.fog[1] * (1 - dk) + 0.03 * dk, E.fog[2] * (1 - dk) + 0.05 * dk];
    gl.clearColor(FOGD[0], FOGD[1], FOGD[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    drawSky(X, F, E.day);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    // bulutlar + karakterler (ışıklı)
    useProg(X, X.lit, F, E.day);
    M.set(mt.a, ((this.time * 0.6) % 90) - 20, 0, 0);
    drawMesh(X, this.clouds, mt.a, E.cloudT, 1, 1);
    const v = this.view;
    this.R.forEach((r, i) => this.drawChar(X, r, i, v && i === v.me));
    // bloklar
    const P = X.vox, u = P.u;
    gl.useProgram(P.p);
    X.cur = P;
    X.lastBuf = null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(u.uTex, 0);
    gl.uniformMatrix4fv(u.uVP, false, mt.VP);
    gl.uniform3f(u.uCam, c.ex, c.ey, c.ez);
    gl.uniform1f(u.uTime, this.time);
    const fogC = under ? [0.12, 0.3, 0.55] : FOGD;
    gl.uniform3fv(u.uFog, fogC);
    gl.uniform2f(u.uFogR, under ? 1 : 40 - 34 * dk, under ? 14 : 92 - 62 * dk);
    { const lp = this.me || { x: c.ex, y: c.ey - 1.4, z: c.ez }; gl.uniform4f(u.uLamp, lp.x, lp.y + 1.5, lp.z, 0.35 + 0.65 * dk); }
    gl.uniform3f(u.uLight, under ? 0.7 : E.light[0], under ? 0.85 : E.light[1], under ? 1.05 : E.light[2]);
    gl.uniform3f(u.uTint, 1, 1, 1);
    gl.uniform1f(u.uAlpha, 1);
    gl.uniform1f(u.uCut, 0.5);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    for (const ch of this.chunks) if (ch) voxDraw(X, ch.op);
    gl.disable(gl.CULL_FACE);
    voxDraw(X, this.floor);
    for (const ch of this.chunks) if (ch) voxDraw(X, ch.pl);
    // parçacıklar
    for (const q of this.parts) {
      if (q.glow) continue;
      M.set(mt.a, q.x, q.y, q.z, q.r, q.r * 0.7, 0, q.s * 2);
      voxDraw(X, this.cube(q.t), mt.a);
    }
    for (const q of this.amb || []) {
      if (q.t !== 34) continue;
      M.set(mt.a, q.x, q.y, q.z, q.ph, q.ph * 0.7, 0, q.s * 2);
      voxDraw(X, this.cube(34), mt.a);
    }
    // parlak kıvılcımlar, yanan fitil ve patlama (ışıktan bağımsız, kendi rengiyle)
    gl.uniform3f(u.uLight, 3, 3, 3);
    for (const q of this.amb || []) {
      if (q.t !== 38) continue;
      M.set(mt.a, q.x, q.y, q.z, q.ph, q.ph * 0.7, 0, q.s * 2 * Math.min(1, q.life * 1.5));
      voxDraw(X, this.cube(38), mt.a);
    }
    for (const q of this.parts) {
      if (!q.glow) continue;
      M.set(mt.a, q.x, q.y, q.z, q.r, q.r * 0.7, 0, q.s * 2 * Math.min(1, q.life * 2.5));
      voxDraw(X, this.cube(q.t), mt.a);
    }
    for (const f of this.fuses) {
      const k = (this.time - f.t) / 1.7, on = Math.sin(k * k * 60) > 0;
      if (on) { gl.uniform3f(u.uTint, 2.2, 2.2, 2.2); M.set(mt.a, f.x + 0.5, f.y + 0.5, f.z + 0.5, 0, 0, 0, 1.03 + k * 0.12); voxDraw(X, this.cube(33), mt.a); gl.uniform3f(u.uTint, 1, 1, 1); }
    }
    this.fuses = this.fuses.filter((f) => this.time - f.t < 2.6);
    if (this.booms.length) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); gl.uniform1f(u.uCut, 0);
      for (const b of this.booms) {
        const k = (this.time - b.t) / 0.45;
        gl.uniform1f(u.uAlpha, Math.max(0, 1 - k) * 0.85);
        gl.uniform3f(u.uTint, 1, 0.75 - k * 0.4, 0.3 - k * 0.25);
        M.set(mt.a, b.x, b.y, b.z, k * 2, k * 3, 0, 1 + k * 6.5);
        voxDraw(X, this.cube(42), mt.a);
      }
      gl.uniform3f(u.uTint, 1, 1, 1); gl.uniform1f(u.uAlpha, 1); gl.uniform1f(u.uCut, 0.5); gl.depthMask(true); gl.disable(gl.BLEND);
      this.booms = this.booms.filter((b) => this.time - b.t < 0.45);
    }
    gl.uniform3f(u.uLight, under ? 0.7 : E.light[0], under ? 0.85 : E.light[1], under ? 1.05 : E.light[2]);
    // eldeki blok (üçüncü kişide sağ elde; birinci kişide ekranın sağ altında)
    const me = this.me, hold = this.slotT(this.sel);
    const holdOk = me && v && (v.phase === 'play' || v.phase === 'ready') && (this.inv || {})[hold] > 0 && !(me.f & 2);
    if (holdOk && !c.fp) {
      const sw = performance.now() - me.placeT < 300 ? -1.1 : -Math.sin(me.ph * 2) * 0.55 * (me.walk ? 1 : 0);
      M.set(mt.a, me.x, me.y, me.z, this.cam.yaw);
      M.set(mt.b, 0.37, 1.32, 0, 0, sw, 0.06);
      M.mul(mt.c, mt.a, mt.b);
      M.set(mt.b, 0, -0.66, 0.1, 0.5, 0, 0, 0.24);
      M.mul(mt.e, mt.c, mt.b);
      voxDraw(X, this.cube(hold), mt.e);
    }
    // seçili blok: çerçeve + çatlak
    const h = this.hit;
    if (h && v && v.phase === 'play') {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(u.uCut, 0.01);
      gl.uniform1f(u.uAlpha, 0.55);
      M.set(mt.a, h.x + 0.5, h.y + 0.5, h.z + 0.5, 0, 0, 0, 1.004);
      voxDraw(X, this.outline, mt.a);
      if (this.digT > 0.02 && I(h.x, h.y, h.z) === this.digI) {
        gl.uniform1f(u.uAlpha, 1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1, -1);
        M.set(mt.a, h.x + 0.5, h.y + 0.5, h.z + 0.5, 0, 0, 0, 1.002);
        voxDraw(X, this.crack[clamp(Math.floor(this.digT * 10), 0, 9)], mt.a);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }
      gl.disable(gl.BLEND);
    }
    // su (saydam, en son)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.uniform1f(u.uCut, 0);
    gl.uniform1f(u.uAlpha, under ? 0.5 : 0.76);
    voxDraw(X, this.sea);
    for (const ch of this.chunks) if (ch) voxDraw(X, ch.wa);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    // birinci kişide el + blok (ayrı yakın izdüşüm)
    if (c.fp && me && v && (v.phase === 'play' || v.phase === 'ready')) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      M.persp(mt.P, 1.0, asp, 0.02, 10);
      gl.uniformMatrix4fv(u.uVP, false, mt.P);
      gl.uniform3f(u.uCam, 0, 0, 0);
      gl.uniform1f(u.uAlpha, 1);
      gl.uniform1f(u.uCut, 0.5);
      gl.uniform2f(u.uFogR, 50, 60);
      gl.uniform4f(u.uLamp, 0, 0, 0, 0);
      const dig = me.f & 2;
      const sw = dig ? Math.sin(this.time * 15) : 0;
      const bob = me.walk ? Math.sin(me.ph * 2) * 0.02 : 0;
      if (dig && this.pick) {
        useProg(X, X.lit, Object.assign({}, F, { VP: mt.P, cx: 0, cy: 0, cz: 0 }), DAY);
        M.set(mt.a, 0.38, -0.42 + bob + sw * 0.06, -0.75, -0.3, -0.5 + sw * 0.5, 0.2);
        drawMesh(X, this.pick, mt.a);
      } else if (holdOk) {
        M.set(mt.a, 0.42, -0.4 + bob - (performance.now() - me.placeT < 200 ? 0.08 : 0), -0.8, 0.6, 0.2, 0, 0.3);
        voxDraw(X, this.cube(hold), mt.a);
      }
    }
  }
  placeTags() {
    const v = this.view;
    if (!v || !this.R) return;
    const Wv = this.vw || 1, Hv = this.vh || 1, m = this.mats.VP;
    if (!this.tagEls) this.tagEls = [];
    this.R.forEach((r, i) => {
      let el = this.tagEls[i];
      if (!el) { el = document.createElement('div'); el.className = 'ba-tag'; this.el.tags.appendChild(el); this.tagEls[i] = el; }
      const k = `${r.n}|${r.c}`;
      if (el.dataset.k !== k) { el.dataset.k = k; el.innerHTML = `<i style="background:${pcol(r.c)}"></i>${esc(r.n)}`; }
      const isMe = i === v.me;
      const y = r.y + 2.15;
      const cx = m[0] * r.x + m[4] * y + m[8] * r.z + m[12], cy = m[1] * r.x + m[5] * y + m[9] * r.z + m[13], cw = m[3] * r.x + m[7] * y + m[11] * r.z + m[15];
      if ((isMe && (this.cam.fp || this.me)) || cw < 0.3 || cw > 34 || this.flat) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.opacity = String(clamp(1.4 - cw / 26, 0.35, 1));
      el.style.transform = `translate(${((cx / cw) * 0.5 + 0.5) * Wv}px, ${(1 - ((cy / cw) * 0.5 + 0.5)) * Hv}px) translate(-50%, -100%)`;
    });
    for (let i = this.R.length; i < this.tagEls.length; i++) this.tagEls[i].style.display = 'none';
  }

  /* ---------- arayüz ---------- */
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.ctx.serverNow();
    if (this.cdEl) {
      const s = Math.max(0, Math.ceil((v.startAt - now) / 1000));
      if (this.cdEl.textContent !== String(s)) this.cdEl.textContent = String(s);
    }
    if (this.goBtn) this.goBtn.style.visibility = v.phase === 'ready' && v.startAt - now > 3900 ? 'visible' : 'hidden';
    if (v.phase === 'ready' && v.startAt - now <= 3000 && v.startAt - now > 0) {
      const n = Math.ceil((v.startAt - now) / 1000);
      if (n !== this.lastN) { this.lastN = n; this.el.msg.innerHTML = `<span class="big">${n}</span>`; this.snd.play('tick'); }
    } else if (v.phase === 'ready' && this.lastN) { this.lastN = 0; this.el.msg.innerHTML = ''; }
    if (v.phase === 'play') {
      const s = Math.max(0, Math.ceil((v.endsAt - now) / 1000));
      const t = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (this.el.tm.textContent !== t) this.el.tm.textContent = t;
      this.el.tm.classList.toggle('warn', s <= 20);
      if (s <= 10 && s > 0 && s !== this.lastS) { this.lastS = s; this.snd.play('tick'); }
      if (s === 30 && !this.warned) { this.warned = true; this.hint('Son 30 saniye! Son madenleri topla ⛏️', 4000); }
    } else if (v.phase === 'ready') { if (this.el.tm.textContent !== '⛏️') this.el.tm.textContent = '⛏️'; this.warned = false; }
    { const g = v.got || [], ic = ['💎', '🟢', '🪙', '🟠', '⚫', '🎁'], s = v.phase === 'play' ? g.map((n, k) => (n ? ic[k] + n : '')).filter(Boolean).join('  ') : ''; if (this.el.got.textContent !== s) this.el.got.textContent = s; }
    { const n = v.tnt || 0, u = this.el.tntB.querySelector('u'); if (u.textContent !== String(n)) { u.textContent = String(n); this.el.tntB.classList.toggle('no', !n); } const tl = v.phase === 'play' ? ['⛏️ Taş kazma', '⚒️ Demir kazma · hızlı', '💎 Elmas kazma · çok hızlı'][v.tool || 0] : ''; if (this.el.tool.textContent !== tl) this.el.tool.textContent = tl; }
    if (v.players) {
      const me = v.players[v.me];
      const sc = me ? String(me.s) : '–';
      if (this.el.posB.textContent !== sc) this.el.posB.textContent = sc;
      const top = v.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.s - a.p.s).slice(0, 4);
      const key = top.map((o) => o.p.id + o.p.s).join(',') + v.me;
      if (key !== this.lbKey) {
        this.lbKey = key;
        this.el.lb.innerHTML = v.phase === 'play' ? top.map((o, k) => `<div class="${o.i === v.me ? 'me' : ''}"><i style="background:${pcol(o.p.c)}"></i>${medal(k + 1)} ${esc(o.p.n)} · ${o.p.s}</div>`).join('') : '';
      }
    }
  }
  panel() {
    const v = this.view;
    if (!v) return;
    const ctx = this.ctx;
    let key = v.phase, html = '';
    if (v.phase === 'loading') html = '<div class="card"><div class="tt">⛏️ Ada yükleniyor…</div></div>';
    else if (v.phase === 'ready') {
      key = `ready|${v.dur}|${v.map}|${v.mapOpt}|${(v.players || []).map((p) => p.id + p.n).join(',')}|${ctx.isHost}`;
      const MS = v.maps || BA_MAPS, mp = MS[v.map | 0] || MS[0];
      html = `<div class="card">
        <div class="tt">${mp[0]} ${esc(mp[1])}</div>
        <div class="sub">${esc(mp[2])} · ${(v.players || []).length} oyuncu · ${v.dur} dakika</div>
        <div class="how">
          <div><span class="k">⛏️</span><span><b>Basılı tut, kaz</b><small>Derine in, mağaraları gez. Üstteki gösterge yakındaki madeni haber verir</small></span></div>
          <div><span class="k">💎</span><span><b>En değerli madenleri topla</b><small>⚫ Kömür 1 · 🟠 Demir 2 · 🪙 Altın 4 · 🟢 Zümrüt 7 · 💎 Elmas 12 (en dipte) · 🎁 Sandık 5</small></span></div>
          <div><span class="k">🧨</span><span><b>Dinamit ve kazma</b><small>Dinamit çevresini patlatır, madenler sana yazılır. 3 demir → demir kazma, 2 elmas → elmas kazma</small></span></div>
        </div>
        ${ctx.isHost ? `<div class="ba-dur ba-map"><span>Harita:</span>${MS.map((m, k) => `<button class="${k === v.mapOpt ? 'on' : ''}" data-game-action="map" data-payload='{"m":${k}}' title="${esc(m[1])}" aria-label="${esc(m[1])}">${m[0]}</button>`).join('')}<button class="${v.mapOpt === -1 ? 'on' : ''}" data-game-action="map" data-payload='{"m":-1}' title="Sırayla" aria-label="Sırayla">🔀</button></div>` : ''}
        ${ctx.isHost ? `<div class="ba-dur"><span>Süre:</span>${(v.durs || [3, 5, 8]).map((m) => `<button class="${m === v.dur ? 'on' : ''}" data-game-action="dur" data-payload='{"m":${m}}'>${m} dk</button>`).join('')}</div>` : ''}
        <div class="cd"><span>Ada açılıyor — şimdiden dolaşabilirsin</span><b data-cd></b></div>
        ${ctx.isHost ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}
      </div>`;
    } else if (v.phase === 'play') key = 'play';
    else if (v.phase === 'final') {
      const rs = v.results || [];
      const sb = rs.map((r) => ({ id: r.id, nickname: r.nickname, score: r.total, c: r.c }));
      key = `final|${rs.map((r) => r.id + r.total).join(',')}|${ctx.isHost}`;
      const top = rs[0];
      html = `<div class="card">
        <div class="tt">🏆 ${top ? `${esc(top.nickname)} kazandı!` : 'Süre bitti!'}</div>
        <div class="sub">${((v.maps || BA_MAPS)[v.map | 0] || BA_MAPS[0]).slice(0, 2).join(' ')} · toplanan madenlerin puanı</div>
        ${podiumHTML(sb, ctx.me)}
        <div style="overflow-x:auto"><table class="ba-res"><tr><th></th><th style="text-align:left">Oyuncu</th><th>💎</th><th>🟢</th><th>🪙</th><th>🟠</th><th>⚫</th><th>🎁</th><th>Puan</th></tr>
        ${rs.map((r) => `<tr class="${r.id === ctx.me ? 'me' : ''}"><td>${medal(r.place)}</td><td class="n"><i style="background:${pcol(r.c)}"></i>${esc(r.nickname)}</td><td>${r.dia}</td><td>${r.emer}</td><td>${r.gold}</td><td>${r.iron}</td><td>${r.coal}</td><td>${r.chest}</td><td class="t">${r.total}</td></tr>`).join('')}</table></div>
        ${v.most ? `<div class="best">⛏️ En çok kazan: <b>${esc(v.most.n)}</b> · ${v.most.v} blok</div>` : ''}
        ${ctx.isHost ? '<button class="kb btn" data-game-action="restart">Yeni ada 🔁</button><button class="kb alt btn" data-act="exit-game">← Oyunlara dön</button>' : `<p class="hint">Yeni adayı ${esc(ctx.hostName)} açacak.</p>`}
      </div>`;
    }
    if (key !== this.panelKey) {
      this.panelKey = key;
      const p = this.el.panel;
      p.innerHTML = html;
      p.classList.toggle('on', !!html);
      p.classList.toggle('low', key.startsWith('ready'));
      this.cdEl = p.querySelector('[data-cd]');
      this.goBtn = p.querySelector('[data-game-action="go"]');
    }
  }

  emoAnchor(pid) {
    const v = this.view;
    if (!v || !v.players) return null;
    const i = v.players.findIndex((p) => p.id === pid), r = this.R[i];
    if (!r) return null;
    const m = this.mats.VP, y = r.y + 2.5;
    const cx = m[0] * r.x + m[4] * y + m[8] * r.z + m[12], cy = m[1] * r.x + m[5] * y + m[9] * r.z + m[13], cw = m[3] * r.x + m[7] * y + m[11] * r.z + m[15];
    if (cw <= 0.2) return null;
    return [((cx / cw) * 0.5 + 0.5) * (this.vw || 1), (1 - ((cy / cw) * 0.5 + 0.5)) * (this.vh || 1)];
  }
  emoName(pid) { const v = this.view || {}; const p = (v.players || []).find((x) => x.id === pid); return p ? p.n : ''; }

  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.frameB);
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!(dt > 0)) dt = 0.016;
    const raw = dt;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    try {
      this.vw = this.el.wrap.clientWidth;
      this.vh = this.el.wrap.clientHeight;
      this.uiT += dt;
      if (this.uiT > 0.12) { this.uiT = 0; this.ui(); }
      this.detT = (this.detT || 0) + dt;
      if (this.detT > 0.35) { this.detT = 0; this.detect(); }
      if (this.flash > 0.003) { this.flash *= 0.88; this.el.flashEl.style.opacity = this.flash.toFixed(3); } else if (this.flash) { this.flash = 0; this.el.flashEl.style.opacity = '0'; }
      if (this.flat) return;
      const v = this.view;
      if (this.me && v && (v.phase === 'play' || v.phase === 'ready')) this.stepMe(dt);
      this.stepCam(dt);
      this.stepTarget(dt);
      this.stepPending();
      this.stepParts(dt);
      this.ambient(dt);
      this.stepRemote(dt);
      this.flushMesh(3);
      this.draw();
      this.placeTags();
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      // konumu saniyede ~8 kez bildir
      this.sendT += dt;
      if (this.me && v && (v.phase === 'play' || v.phase === 'ready') && this.sendT > 0.125) {
        this.sendT = 0;
        const p = this.me, r2 = (x) => Math.round(x * 100) / 100;
        const k = `${r2(p.x)},${r2(p.y)},${r2(p.z)},${r2(p.face == null ? this.cam.yaw : p.face)},${p.f}`;
        if (k !== this.lastPos || performance.now() - (this.posAt || 0) > 1500) {
          this.lastPos = k;
          this.posAt = performance.now();
          const pl = { x: r2(p.x), y: r2(p.y), z: r2(p.z), r: r2(p.face == null ? this.cam.yaw : p.face), f: p.f };
          try { this.ctx.sendQuiet ? this.ctx.sendQuiet('pos', pl) : this.ctx.send('pos', pl); } catch { /* yok */ }
        }
      }
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[blok]', e); }
    }
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    try { this.snd && this.snd.stopAll && this.snd.stopAll(); } catch { /* yok say */ }
    try { this.snd && this.snd.music(null); this.snd && this.snd.amb(null); } catch { /* yok say */ }
    try { this.emo && this.emo.dispose(); } catch { /* yok say */ }
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('blur', this.onBlur);
    try {
      if (this.X && !this.X.gl.isContextLost()) {
        const X = this.X;
        this.chunks.forEach((c) => c && ['op', 'wa', 'pl'].forEach((k) => voxFree(X, c[k])));
        Object.values(this.cubes || {}).forEach((m) => voxFree(X, m));
        (this.crack || []).forEach((m) => voxFree(X, m));
        [this.sea, this.floor, this.outline].forEach((m) => voxFree(X, m));
        Object.values(this.chars || {}).forEach((o) => Object.values(o).forEach((m) => freeMesh(X, m)));
        [this.pick, this.clouds].forEach((m) => m && freeMesh(X, m));
        if (this.tex) X.gl.deleteTexture(this.tex);
        X.gl.getExtension('WEBGL_lose_context')?.loseContext();
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
    console.error('[blok]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
