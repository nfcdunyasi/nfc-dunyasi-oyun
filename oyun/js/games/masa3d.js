// Masa oyunları ortak 3D kiti (NFC Dünyası Oyun)
// Oturan çizgi film karakterleri (ifadeli yüz, iki kemikli kollar, el işaretleri, bakış takibi), restoran sahnesi
// parçaları (yuvarlak masa ve örtü, sandalye, halı, sarkıt lamba, duvar, çay bardağı...), oturma düzeni, kamera
// sığdırma ve oyun kabuğu (HUD, kartlar, isim etiketleri, emoji tepkileri, WebGL yaşam döngüsü, 2D yedek görünüm).
// Kurye Yarışı'nın küçük WebGL motorunu kullanır.
import { _eng } from './kuryeYarisi.js?v=2026-11-21-g';
import * as sfx from '../sfx.js?v=2026-11-21-g';

const E = _eng();
const { limb, ik2, psurf, ctx2d, podiumHTML, placeLabels, EmoteUI, KIT, drawToon, aoOn, detailOn, postFX, shadowBegin, shadowCast, shadowEnd, emitSoft, autoRes, clamp, lerp, damp, esc, hexRGB, C, shade, M, makeGL, MB, freeMesh, makeTexture, updateTexture, useProg, drawMesh, drawSky, drawDynamic, norm3, brandInfo, Res, Snd, pcol, vibrate, medal, ONE3, injectStyle } = E;

const TAU = Math.PI * 2;
const hs = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hs(xi, yi), b = hs(xi + 1, yi), c = hs(xi, yi + 1), d = hs(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgbA = (rgb, e = 0) => [rgb[0], rgb[1], rgb[2], e];
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lum = (rgb) => 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];

/* ============================ vektör / çerçeve ============================ */
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
const vnorm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const xfP = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const xfD = (m, d) => [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
function frameMat(o, p, X, Y, Z) {
  o[0] = X[0]; o[1] = X[1]; o[2] = X[2]; o[3] = 0;
  o[4] = Y[0]; o[5] = Y[1]; o[6] = Y[2]; o[7] = 0;
  o[8] = Z[0]; o[9] = Z[1]; o[10] = Z[2]; o[11] = 0;
  o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1;
  return o;
}
// Uzuv çerçevesi: yerel -Y ekseni d yönüne bakar, yerel +Z ekseni "hint" yönüne yakın tutulur (avuç içi / dirsek)
function limbMat(o, p, d, hint) {
  const Y = [-d[0], -d[1], -d[2]];
  let Z = vsub(hint, vmul(Y, vdot(hint, Y)));
  if (vlen(Z) < 1e-4) Z = Math.abs(Y[1]) < 0.9 ? vsub([0, 1, 0], vmul(Y, Y[1])) : vsub([0, 0, 1], vmul(Y, Y[2]));
  Z = vnorm(Z);
  return frameMat(o, p, vcross(Y, Z), Y, Z);
}

/* ============================ karakter ölçüleri ============================ */
// Gövde yereli: ayaklar y = 0, yüz +Z. Oturan karakterin kalçası sandalye minderinde (y ≈ 0,42).
const SHO = [0.272, 0.975, 0.0];          // sağ omuz (sol: x ters)
const NECK = [0, 1.115, 0.012];           // boyun eklemi (baş bu noktada döner)
const HC = [0, 0.262, 0.02];            // baş merkezi (boyun eklemine göre)
const HR = 0.243;                       // baş yarıçapı
const UPPER = 0.272, FORE = 0.255;      // üst kol, ön kol
const HIP = [0, 0.42, 0];               // oturan gövdenin eğilme ekseni (kalça)
const TABLE_Y = 0.74;                   // masa üstü
const SEAT_Y = 0.42;
const TOR = { cx: 0, cy: 0.725, cz: 0, rx: 0.282, ry: 0.355, rz: 0.198, ey: 0.66, exz: 0.8 };
// gövde yüzeyinin önündeki z (x, y'de): ayrıntıları yüzeye oturtmak için
function torsoZ(x, y) {
  const a = 2 / TOR.exz, b = 2 / TOR.ey;
  const k = 1 - Math.pow(Math.abs((y - TOR.cy) / TOR.ry), b);
  if (k <= 0) return TOR.cz;
  const s = Math.pow(k, TOR.ey / TOR.exz) - Math.pow(Math.abs(x / TOR.rx), a);
  return s <= 0 ? TOR.cz : TOR.cz + TOR.rz * Math.pow(s, 1 / a);
}

/* ============================ karakter stili ============================ */
const SKINS = ['#f2c39a', '#e6b08a', '#c68a5e', '#f6d3b2', '#a56c46', '#efbd92', '#d79f78', '#ffd9bb', '#8c5a3c', '#ebbb96', '#c48661', '#f3c6a1'];
const HAIR_C = ['#3b2416', '#141011', '#6b3a1f', '#1f1612', '#8a3b1c', '#d8b05a', '#2a1a12', '#8a5a34', '#c9a04e', '#e58fb0', '#141011', '#4a2c1a'];
// genç görünüm: bıyık / papyon yok; gözlük, güneş gözlüğü ve kulaklık var (parti.js'teki ACC ile eş tutulur)
const MASA_ACC = [[], ['glasses'], [], ['shades'], [], ['headphones'], [], ['shades'], ['headphones'], ['glasses'], [], ['glasses']];
const HAIR_S = ['short', 'bob', 'cap', 'curly', 'bun', 'spiky', 'long', 'beanie', 'short', 'bob', 'curly', 'bun'];
const TOP_S = ['sweater', 'hoodie', 'shirt', 'sweater', 'shirt', 'hoodie', 'sweater', 'hoodie', 'shirt', 'sweater', 'hoodie', 'shirt'];
const PANTS_C = ['#2f4a78', '#2a2a33', '#6b5a44', '#33415c', '#3c3f47', '#2f4a78', '#4a3b2f', '#2a2a33', '#33415c', '#5a4a3a', '#2f4a78', '#3c3f47'];
const SHOE_C = ['#f2efe8', '#2a2220', '#3a2a1e', '#f2efe8', '#1e1e24', '#7a3a2a', '#f2efe8', '#2a2220', '#3a2a1e', '#f2efe8', '#1e1e24', '#7a3a2a'];
function styleOf(ci) {
  const i = ((ci % 12) + 12) % 12;
  const hex = pcol(i);
  return { ci: i, hex, skin: SKINS[i], hairS: HAIR_S[i], hairC: HAIR_C[i], top: TOP_S[i], pants: PANTS_C[i], shoe: SHOE_C[i], acc: MASA_ACC[i] };
}

/* ============================ karakter modelleri ============================ */
// Gövde: kalça (pantolon), kazak / kapüşonlu / gömlek (oyuncu rengi), omuz başları, boyun
function torsoModel(mb, st) {
  const pc = hexRGB(st.hex);
  const dark = lum(pc) < 0.25;
  const top = rgbA(pc, -0.1), topD = rgbA(mix3(pc, [0.05, 0.04, 0.08], 0.3), -0.1), topL = rgbA(mix3(pc, [1, 1, 1], 0.38), -0.1);
  const skin = C(st.skin, -0.14);
  mb.superS(0, 0.43, -0.005, 0.255, 0.13, 0.19, 0.8, 0.8, C(st.pants, -0.08), 18, 10);
  const stripe = st.top === 'sweater' && st.ci % 2 === 0;
  mb.superS(TOR.cx, TOR.cy, TOR.cz, TOR.rx, TOR.ry, TOR.rz, TOR.ey, TOR.exz, top, 28, 18, (nx, ny, nz, px, py) => {
    const y = TOR.cy + py * TOR.ry;
    if (stripe && ((y > 0.76 && y < 0.8) || (y > 0.835 && y < 0.86))) return topL;
    if (y < 0.448) return topD;
    return top;
  });
  for (const s of [-1, 1]) mb.sphereS(s * 0.226, 0.975, 0.0, 0.118, 0.11, 0.112, top, 14, 9);
  mb.lathe(0, 1.02, 0.012, [[0.074, 0], [0.068, 0.21]], 14, skin);
  if (st.top === 'hoodie') {
    // kapüşon (ensede toplanmış), ipler, kanguru cep
    mb.push().T(0, 1.085, -0.035, 0, 0.32, 0, 1, 1, 0.86);
    mb.torusN(0, 0, 0, 0.122, 0.052, 0.046, 24, 8, topD);
    mb.pop();
    mb.sphereS(0, 1.1, -0.14, 0.15, 0.1, 0.08, topD, 14, 8);
    for (const s of [-1, 1]) {
      const a = [s * 0.045, 1.04, torsoZ(s * 0.045, 1.04) + 0.006], b = [s * 0.055, 0.87, torsoZ(s * 0.055, 0.87) + 0.008];
      limb(mb, a, b, [0.009, 0.008], C('#f4f1ea', -0.1), 6);
      mb.sphereS(b[0], b[1] - 0.012, b[2], 0.012, 0.022, 0.012, C('#d9dde3', -0.8), 8, 5);
    }
    const pz = torsoZ(0, 0.56);
    mb.superS(0, 0.56, pz - 0.018, 0.148, 0.065, 0.028, 0.4, 0.5, topD, 16, 6);
  } else if (st.top === 'shirt') {
    // gömlek: yaka uçları, düğmeler, göğüs cebi
    const col = dark ? C('#e8e4dc', -0.1) : topD;
    for (const s of [-1, 1]) {
      mb.push().T(s * 0.055, 1.045, torsoZ(s * 0.055, 1.045) + 0.012, s * 0.42, 0.55, s * 0.55);
      mb.superS(0, 0, 0, 0.07, 0.022, 0.05, 0.5, 0.45, col, 12, 6);
      mb.pop();
    }
    mb.push().T(0, 1.085, 0.0, 0, 0.12, 0, 1, 1, 0.86);
    mb.torusN(0, 0, 0, 0.088, 0.03, 0.026, 22, 6, col);
    mb.pop();
    for (let k = 0; k < 4; k++) { const y = 0.99 - k * 0.105; mb.sphereS(0, y, torsoZ(0, y) + 0.004, 0.014, 0.014, 0.007, C('#f6f3ec', -0.6), 8, 4); }
    const cx = -0.125, cy = 0.86, cz = torsoZ(cx, cy);
    mb.push().T(cx, cy, cz + 0.002, -0.32);
    mb.rbox(-0.055, -0.06, -0.006, 0.055, 0.045, 0.008, 0.008, topD, 2);
    mb.pop();
  } else {
    // kazak: örgü yaka
    mb.push().T(0, 1.08, 0.006, 0, 0.1, 0, 1, 1, 0.9);
    mb.torusN(0, 0, 0, 0.1, 0.032, 0.03, 24, 8, topD);
    mb.pop();
  }
  if ((st.acc || []).includes('bowtie')) KIT.accessories(mb, ['bowtie'], 0, 1.29, 0.03, HR, [0, 0.965, torsoZ(0, 0.965) + 0.03]);
}

// Saç başlığı: tepe (u = 0) → saç çizgisi (u = 1); v = başın çevresinde açı (+Z = ön). Saç çizgisi pürüzsüz, kenar içe kıvrılır.
function hairCap(mb, theta, thick, col, nu = 14, nv = 40, R = HR) {
  const [cx, cy, cz] = HC;
  const us = Array.from({ length: nu + 1 }, (_, i) => Math.pow(i / nu, 0.85));
  psurf(mb, us, nv, (u, v) => {
    const ph = TAU * v + Math.PI / 2;            // v = 0 → ön
    const th = u * theta(ph);
    const t = thick(ph, u) * (1 - Math.pow(u, 7)) + 0.012;
    const rr = R * (1 + t);
    return [cx + Math.sin(th) * Math.cos(ph) * rr, cy + Math.cos(th) * rr * 0.985, cz + Math.sin(th) * Math.sin(ph) * rr];
  }, (u, v) => col(u, TAU * v + Math.PI / 2), { wv: true, cen: [cx, cy, cz] });
}
// saç çizgisi (tepeden açı): f = sin(ph) (1 ön, -1 arka)
const hlShort = (ph) => { const f = Math.sin(ph), c = Math.cos(ph); return f > 0 ? lerp(1.42, 0.8, Math.pow(f, 1.3)) + 0.13 * Math.max(0, f) * c + 0.035 * Math.sin(ph * 13) * Math.max(0, f) : lerp(1.42, 2.08, Math.pow(-f, 0.8)); };
const hlBob = (ph) => { const f = Math.sin(ph); return f > 0.62 ? 0.98 + 0.02 * Math.sin(ph * 21) : f > 0 ? lerp(2.02, 0.98, sst(0.25, 0.62, f)) : lerp(2.02, 2.25, Math.pow(-f, 0.7)); };
function hairModel(mb, st) {
  const [cx, cy, cz] = HC, r = HR;
  const hc = hexRGB(st.hairC);
  const strand = (u, ph) => { const k = 0.86 + 0.14 * Math.sin(ph * 26 + u * 2.5) * Math.sin(ph * 7.3) - 0.12 * Math.pow(u, 3); return rgbA([hc[0] * k, hc[1] * k, hc[2] * k], -0.42); };
  const plain = rgbA(hc, -0.42);
  const S = st.hairS;
  if (S === 'bob' || S === 'long') {
    hairCap(mb, hlBob, (ph, u) => 0.1 + 0.07 * u * u + 0.02 * Math.cos(ph * 2), strand, 16, 44);
    if (S === 'long') {
      // arkadan omuzlara inen saç
      mb.superS(cx, cy - r * 0.95, cz - r * 0.62, r * 0.78, r * 0.62, r * 0.32, 0.8, 0.8, null, 18, 10, (nx, ny, nz, px, py) => { const k = 0.85 + 0.12 * Math.sin(px * 30); return rgbA([hc[0] * k, hc[1] * k, hc[2] * k], -0.42); });
    }
  } else if (S === 'curly') {
    hairCap(mb, (ph) => hlShort(ph) + 0.05, (ph, u) => 0.11 + 0.06 * vn(ph * 3.2, u * 5) , strand, 14, 40);
    // kıvırcık topaklar
    for (let k = 0; k < 34; k++) {
      const ph = hs(k, 3) * TAU, th = 0.15 + hs(k, 5) * 1.25;
      if (Math.sin(ph) > 0.35 && th > 0.75) continue;      // alında yığılma olmasın
      const rr = r * (1.1 + 0.05 * hs(k, 7));
      const x = cx + Math.sin(th) * Math.cos(ph) * rr, y = cy + Math.cos(th) * rr, z = cz + Math.sin(th) * Math.sin(ph) * rr;
      const s = r * (0.16 + 0.07 * hs(k, 9));
      mb.sphereS(x, y, z, s, s, s, null, 10, 7, (nx, ny) => { const g = 0.82 + 0.22 * ny; return rgbA([hc[0] * g, hc[1] * g, hc[2] * g], -0.35); });
    }
  } else {
    // kısa saç (bere ve şapkanın altında da)
    hairCap(mb, S === 'cap' || S === 'beanie' ? (ph) => hlShort(ph) + 0.08 : hlShort, (ph, u) => 0.085 + 0.035 * Math.max(0, Math.cos(ph * 1.0 + 1.4)) * (1 - u), strand, 14, 40);
    if (S === 'bun') {
      mb.sphereS(cx, cy + r * 0.92, cz - r * 0.38, r * 0.36, r * 0.33, r * 0.34, null, 16, 10, (nx, ny, nz) => strand(0.3, Math.atan2(nz, nx) * 2 + ny));
      mb.push().T(cx, cy + r * 0.78, cz - r * 0.3, 0, -0.75);
      mb.torusN(0, 0, 0, r * 0.2, r * 0.05, r * 0.05, 18, 6, C(st.hex, -0.3));
      mb.pop();
    }
    if (S === 'spiky') {
      for (let k = 0; k < 9; k++) {
        const ph = Math.PI / 2 + (k - 4) * 0.42 + (hs(k, 2) - 0.5) * 0.2, th = 0.35 + 0.42 * hs(k, 4);
        const b = [cx + Math.sin(th) * Math.cos(ph) * r * 0.95, cy + Math.cos(th) * r * 0.95, cz + Math.sin(th) * Math.sin(ph) * r * 0.95];
        const dir = vnorm([Math.sin(th) * Math.cos(ph) * 0.8, 1.1, Math.sin(th) * Math.sin(ph) * 0.8 - 0.35]);
        const L = r * (0.38 + 0.16 * hs(k, 6));
        limb(mb, b, vadd(b, vmul(dir, L)), [r * 0.13, r * 0.02], plain, 7);
      }
    }
    if (S === 'cap') {
      // beyzbol şapkası: tepe (oyuncu renginin koyusu, ön panel açık), siper, düğme
      const pc = hexRGB(st.hex), capC = rgbA(mix3(pc, [0, 0, 0], 0.2), -0.25), capL = rgbA(mix3(pc, [1, 1, 1], 0.55), -0.25);
      hairCap(mb, (ph) => 1.2 - 0.12 * Math.max(0, Math.sin(ph)) + 0.1 * Math.max(0, -Math.sin(ph)), () => 0.13, (u, ph) => (Math.sin(ph) > 0.8 && u < 0.92 ? capL : (Math.abs(Math.sin(ph * 3)) < 0.04 ? rgbA(mix3(pc, [0, 0, 0], 0.4), -0.25) : capC)), 12, 42, HR * 1.06);
      mb.push().T(cx, cy + r * 0.5, cz + r * 0.84, 0, -0.06);
      mb.superS(0, 0, r * 0.28, r * 0.66, r * 0.045, r * 0.4, 0.35, 0.8, capC, 20, 6);
      mb.pop();
      mb.sphereS(cx, cy + r * 1.12, cz, r * 0.09, r * 0.05, r * 0.09, capC, 8, 5);
    }
    if (S === 'beanie') {
      // örgü bere: dikey örgü çizgileri, kıvrık kenar, ponpon
      const pc = hexRGB(st.hex), bc = mix3(pc, [1, 1, 1], 0.12);
      hairCap(mb, () => 1.32, (ph, u) => 0.15 + 0.012 * Math.sin(ph * 40), (u, ph) => { const k = 0.85 + 0.15 * (Math.sin(ph * 40) > 0 ? 1 : 0); return rgbA([bc[0] * k, bc[1] * k, bc[2] * k], 0); }, 12, 64, HR * 1.04);
      mb.push().T(cx, cy + Math.cos(1.28) * r * 1.13, cz, 0, 0, 0, 1, 1, 1);
      mb.torusN(0, 0, 0, Math.sin(1.28) * r * 1.13, r * 0.11, r * 0.1, 40, 8, null, (a) => { const k = Math.sin(a * 36) > 0 ? 1 : 0.86; return rgbA([bc[0] * 0.8 * k, bc[1] * 0.8 * k, bc[2] * 0.8 * k], 0); });
      mb.pop();
      mb.sphereS(cx, cy + r * 1.28, cz - r * 0.05, r * 0.24, r * 0.22, r * 0.24, null, 14, 10, (nx, ny, nz) => { const k = 0.85 + 0.15 * hs(Math.round(nx * 9), Math.round(nz * 9 + ny * 5)); return rgbA([0.96 * k, 0.95 * k, 0.92 * k], 0); });
    }
  }
}

// Baş (göz/ağız hariç): kafa, kulaklar, burun, yanaklar, saç, gözlük / bıyık. Orijin boyun eklemi.
function headModel(mb, st) {
  const [cx, cy, cz] = HC, r = HR;
  const sk = hexRGB(st.skin);
  const skin = rgbA(sk, -0.14), skinD = rgbA(mix3(sk, [0.55, 0.25, 0.2], 0.22), -0.12);
  mb.sphereS(cx, cy, cz, r, r * 0.97, r * 0.97, skin, 26, 18);
  for (const s of [-1, 1]) {
    mb.sphereS(cx + s * r * 0.95, cy - r * 0.04, cz - r * 0.02, r * 0.15, r * 0.22, r * 0.12, skin, 10, 8);
    mb.sphereS(cx + s * r * 1.0, cy - r * 0.04, cz + r * 0.005, r * 0.075, r * 0.13, r * 0.05, skinD, 8, 6);
  }
  const surf = (x, y) => Math.sqrt(Math.max(0, r * r - x * x - y * y));
  mb.sphereS(cx, cy - r * 0.08, cz + surf(0, -r * 0.08) * 0.97 + r * 0.03, r * 0.13, r * 0.11, r * 0.11, skinD, 12, 8);
  for (const s of [-1, 1]) mb.sphereS(cx + s * r * 0.6, cy - r * 0.2, cz + surf(r * 0.6, -r * 0.2) * 0.97 - r * 0.06, r * 0.13, r * 0.085, r * 0.05, C('#ff9f90', -0.05), 10, 6);
  hairModel(mb, st);
  const acc = (st.acc || []).filter((a) => a !== 'bowtie' && a !== 'headphones');
  if (acc.length) KIT.accessories(mb, acc, cx, cy, cz, r, null);
  if ((st.acc || []).includes('headphones')) {
    // kulaklık: tepeden geçen bant, yastıklı iki kulaklık (dış yüzü oyuncu rengi)
    const band = C('#23222b', -0.5), pad = C('#34323d', -0.2), cap = rgbA(mix3(hexRGB(st.hex), [1, 1, 1], 0.15), -0.6);
    const R = r * 1.2, N = 14;
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const a = -1.12 + (2.24 * i) / N;
      const pt = [cx + Math.sin(a) * R, cy + Math.cos(a) * R * 1.02, cz - r * 0.04];
      if (prev) limb(mb, prev, pt, [r * 0.05, r * 0.05], band, 6);
      prev = pt;
    }
    for (const sgn of [-1, 1]) {
      mb.sphereS(cx + sgn * r * 1.06, cy - r * 0.04, cz - r * 0.03, r * 0.13, r * 0.3, r * 0.26, pad, 12, 8);
      mb.sphereS(cx + sgn * r * 1.15, cy - r * 0.04, cz - r * 0.03, r * 0.09, r * 0.24, r * 0.2, cap, 12, 8);
    }
  }
}

// Yüz ifadesi (gözler, kaşlar, ağız): tüm oyuncularda ortak ağ. kind: smile | grin | o | sad | tense | laugh | wince
const EXPRS = ['smile', 'grin', 'o', 'sad', 'tense', 'laugh', 'wince'];
function exprModel(mb, kind) {
  const [cx, cy, cz] = HC, r = HR;
  const surf = (x, y) => Math.sqrt(Math.max(0, r * r - x * x - y * y)) * 0.97;
  const W = C('#ffffff', -0.35), P = C('#14101c', -0.85), HL = C('#ffffff', 1), iris = C('#4a2f1d', -0.7), brow = C('#3a2416', -0.1);
  const lip = C('#7a2a22', -0.3);
  const eyesOpen = kind !== 'laugh' && kind !== 'wince';
  const big = kind === 'o' ? 1.1 : 1;
  const look = kind === 'sad' ? [0, -0.7] : kind === 'tense' ? [0, 0.35] : [0, 0];
  for (const s of [-1, 1]) {
    const ex = s * r * 0.37, ey = r * 0.12, ez = surf(ex, ey) - r * 0.06;
    if (eyesOpen) {
      mb.sphereS(cx + ex, cy + ey, cz + ez, r * 0.2 * big, r * 0.225 * big, r * 0.12, W, 16, 10);
      const ps = kind === 'o' ? 0.8 : 1;
      const ix = ex + look[0] * r * 0.06, iy = ey + look[1] * r * 0.06 - r * 0.02, iz = ez + r * 0.095;
      mb.sphereS(cx + ix, cy + iy, cz + iz, r * 0.13 * ps, r * 0.145 * ps, r * 0.05, iris, 14, 8);
      mb.sphereS(cx + ix, cy + iy, cz + iz + r * 0.03, r * 0.085 * ps, r * 0.1 * ps, r * 0.035, P, 12, 6);
      mb.sphereS(cx + ix + r * 0.05, cy + iy + r * 0.07, cz + iz + r * 0.06, r * 0.04, r * 0.045, r * 0.015, HL, 8, 4);
      mb.sphereS(cx + ix - r * 0.04, cy + iy - r * 0.05, cz + iz + r * 0.055, r * 0.018, r * 0.02, r * 0.01, HL, 6, 3);
    } else {
      // kapalı / kısılmış göz: gülerken ^ kavisi, yüzünü buruştururken burna bakan > < işareti
      const N = 10;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        let xx, yy;
        if (kind === 'laugh') { xx = ex + (t - 0.5) * 2 * r * 0.2; yy = ey + Math.sin(t * Math.PI) * r * 0.1 - r * 0.03; }
        else { const q = Math.abs(t - 0.5) * 2; xx = ex - s * r * 0.1 + s * q * r * 0.2; yy = ey + (t - 0.5) * 2 * r * 0.1; }
        mb.sphereS(cx + xx, cy + yy, cz + surf(xx, yy) + r * 0.004, r * 0.036, r * 0.032, r * 0.02, C('#2a1810', -0.3), 6, 4);
      }
    }
    // kaşlar
    const bRot = kind === 'sad' || kind === 'tense' ? -0.34 : kind === 'wince' ? -0.42 : kind === 'o' ? 0.06 : kind === 'grin' || kind === 'laugh' ? 0.22 : 0.18;
    const bY = kind === 'o' ? 0.56 : kind === 'sad' || kind === 'tense' ? 0.5 : kind === 'wince' ? 0.43 : 0.47;
    const bx = s * r * 0.38, by = r * bY;
    mb.push().T(cx + bx, cy + by, cz + surf(bx, by) - r * 0.02, 0, 0, -s * bRot);
    mb.sphereS(0, 0, 0, r * 0.2, r * 0.055, r * 0.06, brow, 10, 5);
    mb.pop();
  }
  // gözyaşı (üzgün)
  if (kind === 'sad') {
    const tx = -r * 0.42, ty = -r * 0.12;
    mb.sphereS(cx + tx, cy + ty, cz + surf(tx, ty) + r * 0.03, r * 0.05, r * 0.08, r * 0.04, C('#7fd0ff', -0.95), 8, 6);
  }
  // ağız
  const mz = (x, y) => cz + surf(x, y) - r * 0.012;
  const arc = (wide, y0, k, w0 = 0.03) => {
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = (t - 0.5) * 2 * r * wide, y = y0 + Math.sin(t * Math.PI) * k;
      const w = r * (w0 + 0.018 * Math.sin(t * Math.PI));
      mb.sphereS(cx + x, cy + y, mz(x, y), w * 1.3, w, w * 0.8, lip, 6, 4);
    }
  };
  if (kind === 'o') {
    mb.sphereS(cx, cy - r * 0.43, mz(0, -r * 0.43), r * 0.11, r * 0.14, r * 0.05, C('#4a1414', -0.3), 12, 8);
  } else if (kind === 'sad') {
    arc(0.24, -r * 0.47, r * 0.08);
  } else if (kind === 'tense') {
    const N = 14;
    for (let i = 0; i <= N; i++) { const t = i / N, x = (t - 0.5) * 2 * r * 0.2, y = -r * 0.42 + Math.sin(t * Math.PI * 3) * r * 0.025; mb.sphereS(cx + x, cy + y, mz(x, y), r * 0.034, r * 0.026, r * 0.02, lip, 6, 4); }
  } else if (kind === 'laugh' || kind === 'grin') {
    // açık ağız: koyu iç, üst dişler, dil
    const my = kind === 'laugh' ? -r * 0.44 : -r * 0.42, mw = kind === 'laugh' ? 0.25 : 0.22, mh = kind === 'laugh' ? 0.17 : 0.11;
    mb.sphereS(cx, cy + my, mz(0, my) - r * 0.01, r * mw, r * mh, r * 0.05, C('#4a1414', -0.3), 16, 8);
    mb.sphereS(cx, cy + my + r * mh * 0.55, mz(0, my + r * mh * 0.55) + r * 0.005, r * mw * 0.8, r * 0.05, r * 0.03, C('#fbf6ee', -0.4), 12, 5);
    mb.sphereS(cx, cy + my - r * mh * 0.45, mz(0, my - r * mh * 0.45) + r * 0.003, r * mw * 0.55, r * 0.06, r * 0.03, C('#e86a6a', -0.3), 12, 5);
  } else if (kind === 'wince') {
    // sıkılmış dişler: beyaz şerit, üstte ve altta ince dudak
    const my = -r * 0.43;
    mb.sphereS(cx, cy + my, mz(0, my) + r * 0.004, r * 0.2, r * 0.06, r * 0.03, C('#fbf6ee', -0.4), 14, 6);
    for (const sy of [-1, 1]) for (let i = 0; i <= 12; i++) { const t = i / 12, x = (t - 0.5) * 2 * r * 0.21, y = my + sy * r * 0.065 * (0.6 + 0.4 * Math.sin(t * Math.PI)); mb.sphereS(cx + x, cy + y, mz(x, y) + r * 0.006, r * 0.03, r * 0.022, r * 0.018, lip, 6, 4); }
  } else arc(0.27, -r * 0.36, -r * 0.09);
}

// Kollar (beyaz çizilir, oyuncu rengiyle boyanır): üst kol omuzdan -Y boyunca, ön kol dirsekten -Y boyunca
function upperArmModel(mb) {
  const W = [1, 1, 1, -0.1];
  mb.lathe(0, 0, 0, [[0, -UPPER - 0.06], [0.052, -UPPER - 0.045], [0.075, -UPPER], [0.083, -0.06], [0.085, 0.02], [0.062, 0.065], [0, 0.082]], 14, W);
}
function foreArmModel(mb) {
  const W = [1, 1, 1, -0.1], D = [0.74, 0.74, 0.76, -0.1];
  mb.lathe(0, 0, 0, [[0.0, -FORE + 0.005], [0.062, -FORE], [0.071, -FORE + 0.012], [0.072, -FORE + 0.05], [0.068, -FORE + 0.055], [0.068, -FORE + 0.055], [0.073, 0.0], [0.052, 0.05], [0, 0.062]], 14, (i) => (i >= 1 && i <= 4 ? D : W));
}
// El (beyaz çizilir, ten rengiyle boyanır). Sağ el: bilek orijinde, parmaklar -Y, avuç içi +Z, başparmak +X tarafında.
// shape: open | fist | scissors | point | thumb | grip | relax
const HAND_SHAPES = ['open', 'fist', 'scissors', 'point', 'thumb', 'grip', 'relax'];
function handModel(mb, shape, side = 1) {
  const W = [1, 1, 1, -0.16], K = [0.9, 0.86, 0.85, -0.16], N = [1.0, 0.92, 0.9, -0.5];
  mb.push().T(0, 0, 0, 0, 0, 0, side, 1, 1);
  mb.rbox(-0.05, -0.118, -0.027, 0.048, -0.002, 0.028, 0.024, W, 3);
  // parmak: taban noktası, uzunluklar, kıvrılma (her eklemde +Z'ye), yana açılma
  const finger = (x, len, r, curl, spread) => {
    let p = [x, -0.108, 0.002], d = vnorm([Math.sin(spread), -Math.cos(spread), 0]);
    const L = [0.046 * len, 0.032 * len, 0.026 * len];
    for (let k = 0; k < 3; k++) {
      // eklemde avuç içine (+Z) doğru bükül: X ekseni etrafında dönüş
      const a = curl[k];
      const y = d[1] * Math.cos(a) + d[2] * Math.sin(a), z = -d[1] * Math.sin(a) + d[2] * Math.cos(a);
      d = vnorm([d[0], y, z]);
      const q = vadd(p, vmul(d, L[k]));
      limb(mb, p, q, [r * (1 - k * 0.06), r * (0.94 - k * 0.07)], k === 0 ? K : W, 7);
      p = q;
    }
    // tırnak: parmak ucunun sırtında (-Z yüzü)
    if (curl[0] < 0.6) mb.sphereS(p[0] - d[0] * 0.01, p[1] - d[1] * 0.01, p[2] - r * 0.75, r * 0.62, r * 0.5, r * 0.22, N, 6, 4);
  };
  const C0 = [0.12, 0.12, 0.08], CF = [1.5, 1.6, 1.25], CR = [0.35, 0.4, 0.3], CG = [0.85, 0.95, 0.7];
  const cOf = (i) => {
    if (shape === 'open') return C0;
    if (shape === 'relax') return CR;
    if (shape === 'grip') return CG;
    if (shape === 'scissors') return i < 2 ? C0 : CF;
    if (shape === 'point') return i === 0 ? C0 : CF;
    return CF;
  };
  const spreadOf = (i) => (shape === 'open' ? [0.1, 0.03, -0.04, -0.12][i] : shape === 'scissors' ? [0.2, -0.13, -0.02, -0.06][i] : [0.04, 0.01, -0.01, -0.04][i]);
  [[0.034, 1.0, 0.0175], [0.011, 1.08, 0.0182], [-0.013, 1.0, 0.0172], [-0.036, 0.82, 0.0158]].forEach(([x, len, r], i) => finger(x, len, r, cOf(i), spreadOf(i)));
  // başparmak
  const tb = [0.044, -0.032, 0.012];
  let td;
  if (shape === 'open' || shape === 'relax') td = vnorm([0.62, -0.62, 0.42]);
  else if (shape === 'thumb') td = vnorm([1, 0.12, 0.05]);
  else if (shape === 'grip') td = vnorm([0.15, -0.6, 0.85]);
  else td = vnorm([-0.35, -0.55, 0.8]);
  const t1 = vadd(tb, vmul(td, 0.042));
  let td2 = td;
  if (shape === 'fist' || shape === 'scissors' || shape === 'point') td2 = vnorm([-0.85, -0.25, 0.25]);
  const t2 = vadd(t1, vmul(td2, 0.034));
  limb(mb, tb, t1, [0.021, 0.0195], K, 7);
  limb(mb, t1, t2, [0.0195, 0.017], W, 7);
  mb.sphereS(0.0, -0.11, 0.025, 0.045, 0.02, 0.01, K, 8, 4);
  mb.pop();
}
// Oturan bacaklar: kalçadan öne uyluk, dizden aşağı baldır, ayakkabı (masanın altında; yandan görünür)
function seatedLegsModel(mb, st) {
  const P = C(st.pants, -0.08), S = C(st.shoe, -0.35), sole = C('#efe9de', -0.2);
  for (const s of [-1, 1]) {
    limb(mb, [s * 0.125, 0.43, 0.0], [s * 0.135, 0.435, 0.26], [0.098, 0.088], P, 12);
    limb(mb, [s * 0.135, 0.43, 0.27], [s * 0.14, 0.11, 0.3], [0.08, 0.066], P, 12);
    mb.superS(s * 0.14, 0.06, 0.36, 0.078, 0.055, 0.135, 0.6, 0.75, S, 14, 8);
    mb.superS(s * 0.14, 0.016, 0.36, 0.081, 0.016, 0.14, 0.4, 0.75, sole, 14, 4);
  }
}
// Göz kapakları (beyaz çizilir, ten rengiyle boyanır)
function lidsModel(mb) { KIT.lids(mb, HC[0], HC[1], HC[2], HR, '#ffffff'); }

/* ============================ karakter iskeleti ============================ */
// Hedefler "koltuk uzayında" (yalnız oturuş yönü; gövde eğilmesi hariç) verilir: el konumları, parmak yönü,
// avuç yönü, dirsek yönü. Böylece gövde öne eğilse de masadaki eller yerinde kalır. Gövde kalçadan eğilir.
const POSE0 = () => ({ lean: 0.06, roll: 0, rise: 0, turn: 0, hy: 0, hp: 0.12, hroll: 0, hand: [[-0.17, 0.778, 0.41], [0.17, 0.778, 0.41]], fdir: [[0.12, -0.2, 1], [-0.12, -0.2, 1]], palm: [[0.1, -1, 0.1], [-0.1, -1, 0.1]], pole: [[-0.75, -0.55, -0.3], [0.75, -0.55, -0.3]], fw: [1, 1] });
const HAND_S = 0.9;
class Avatar {
  constructor(ci) {
    this.ci = ci;
    this.st = styleOf(ci);
    this.tint = new Float32Array(hexRGB(pcol(ci)));
    this.skinT = new Float32Array(hexRGB(this.st.skin));
    this.pos = [0, 0, 0];
    this.yaw = 0;
    this.cur = POSE0();
    this.tgt = POSE0();
    this.shape = ['relax', 'relax'];
    this.expr = 'smile';
    this.look = null;          // dünyada bakılacak nokta (verilirse baş oraya döner)
    this.k = 9;                // hedefe yaklaşma hızı
    this.ph = Math.random() * TAU;
    this.M = { body: M.make(), head: M.make(), up: [M.make(), M.make()], fo: [M.make(), M.make()], hd: [M.make(), M.make()] };
    this.tmp = M.make();
    this.R = M.make();
    this.hw = [[0, 0, 0], [0, 0, 0]];   // ellerin dünya konumu
    this.handK = null;                  // el başına ek ölçek [sol, sağ] (çizgi film abartısı; null = 1)
    this.headW = [0, 1.3, 0];
  }
  // dünya noktası → koltuk uzayı
  toSeat(p) {
    const dx = p[0] - this.pos[0], dy = p[1] - this.pos[1], dz = p[2] - this.pos[2];
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    return [dx * c - dz * s, dy, dx * s + dz * c];
  }
  // koltuk uzayı → gövde uzayı (kalça etrafındaki eğilmenin tersi)
  seatToBody(p) {
    const R = this.R, v = [p[0] - HIP[0], p[1] - HIP[1], p[2] - HIP[2]];
    return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2] + HIP[0], R[4] * v[0] + R[5] * v[1] + R[6] * v[2] + HIP[1], R[8] * v[0] + R[9] * v[1] + R[10] * v[2] + HIP[2]];
  }
  seatDirToBody(d) { const R = this.R; return [R[0] * d[0] + R[1] * d[1] + R[2] * d[2], R[4] * d[0] + R[5] * d[1] + R[6] * d[2], R[8] * d[0] + R[9] * d[1] + R[10] * d[2]]; }
  step(dt, t) {
    const c = this.cur, g = this.tgt;
    const k = 1 - Math.exp(-this.k * dt);
    for (const f of ['lean', 'roll', 'rise', 'turn', 'hroll']) c[f] += (g[f] - c[f]) * k;
    for (let j = 0; j < 2; j++) {
      for (const f of ['hand', 'fdir', 'palm', 'pole']) {
        const a = c[f][j], b = g[f][j];
        a[0] += (b[0] - a[0]) * k; a[1] += (b[1] - a[1]) * k; a[2] += (b[2] - a[2]) * k;
      }
      c.fw[j] += (g.fw[j] - c.fw[j]) * k;
    }
    const breath = Math.sin(t * 1.7 + this.ph) * 0.006;
    // gövde: koltuk yönü × (kalça etrafında dönüş + eğilme + yana yatma)
    M.set(this.R, 0, 0, 0, c.turn, c.lean, c.roll, 1);
    const R = this.R;
    // gövde = koltuk × T(kalça − R·kalça) × R   (eğilme kalça ekseninde)
    const B = this.M.body;
    for (let i = 0; i < 16; i++) B[i] = R[i];
    B[12] = HIP[0] - R[4] * HIP[1];
    B[13] = HIP[1] - R[5] * HIP[1] + c.rise + breath;
    B[14] = HIP[2] - R[6] * HIP[1];
    M.set(this.tmp, this.pos[0], this.pos[1], this.pos[2], this.yaw, 0, 0, 1);
    M.mul(B, this.tmp, B);
    // bakış
    let hy = g.hy, hp = g.hp;
    if (this.look) {
      const Lb = this.seatToBody(this.toSeat(this.look));
      const nx = Lb[0] - NECK[0], ny = Lb[1] - (NECK[1] + HC[1]), nz = Lb[2] - NECK[2];
      hy = clamp(Math.atan2(nx, Math.max(0.05, nz)), -1.1, 1.1);
      hp = clamp(-Math.atan2(ny, Math.hypot(nx, nz)), -0.5, 0.8);
    }
    const kh = 1 - Math.exp(-this.k * 0.85 * dt);
    c.hy += (hy - c.hy) * kh;
    c.hp += (hp - c.hp) * kh;
    M.set(this.tmp, NECK[0], NECK[1], NECK[2], c.hy, c.hp, c.hroll);
    M.mul(this.M.head, B, this.tmp);
    this.headW = xfP(this.M.head, [HC[0], HC[1] + HR * 1.05, HC[2]]);
    // kollar: iki kemikli ters kinematik (gövde uzayında)
    for (let j = 0; j < 2; j++) {
      const sx = j ? 1 : -1;
      const S = [SHO[0] * sx, SHO[1], SHO[2]];
      const H = this.seatToBody(c.hand[j]);
      const pole = vnorm(this.seatDirToBody(c.pole[j]));
      const El = ik2(S, H, UPPER, FORE, pole);
      const du = vnorm(vsub(El, S));
      limbMat(this.tmp, S, du, pole);
      M.mul(this.M.up[j], B, this.tmp);
      const dl = vsub(H, El), Ll = vlen(dl);
      const df = Ll > 1e-5 ? vmul(dl, 1 / Ll) : du;
      const palm = vnorm(this.seatDirToBody(c.palm[j]));
      limbMat(this.tmp, El, df, palm);
      M.mul(this.M.fo[j], B, this.tmp);
      const Hp = vadd(El, vmul(df, FORE));
      // el: parmak yönü bilekten bükülebilir (fw: 1 = verilen yön, 0 = ön kolun devamı)
      const fd = vnorm(this.seatDirToBody(c.fdir[j]));
      const hd = vnorm(vadd(vmul(df, 1 - c.fw[j]), vmul(fd, c.fw[j])));
      limbMat(this.tmp, Hp, hd, palm);
      const hk = HAND_S * (this.handK ? this.handK[j] : 1);
      for (let q = 0; q < 12; q++) this.tmp[q] *= hk;
      M.mul(this.M.hd[j], B, this.tmp);
      this.hw[j] = xfP(B, Hp);
    }
  }
  // hazır pozlar (koltuk uzayında). o: { t: zaman, k: hız }
  pose(name, o = {}) {
    const g = this.tgt, t = o.t || 0, ph = this.ph;
    // L/R: el konumu; F: parmak yönü (fw ağırlığıyla); P: avuç yönü; E: dirsek yönü
    const set = (L, R, FL, FR, PL, PR, EL, ER, fw = 1) => {
      g.hand[0] = L; g.hand[1] = R;
      g.fdir[0] = FL || [0, -1, 0.2]; g.fdir[1] = FR || [0, -1, 0.2];
      g.palm[0] = PL || [1, 0, 0]; g.palm[1] = PR || [-1, 0, 0];
      g.pole[0] = EL || [-0.75, -0.55, -0.3]; g.pole[1] = ER || [0.75, -0.55, -0.3];
      g.fw[0] = g.fw[1] = fw;
    };
    g.rise = 0; g.roll = 0; g.turn = 0; g.hroll = 0;
    this.k = o.k || 9;
    switch (name) {
      case 'rest': // eller masada, avuçlar aşağı
        g.lean = 0.07 + Math.sin(t * 0.5 + ph) * 0.02;
        set([-0.17, 0.778, 0.41], [0.17, 0.778, 0.41], [0.15, -0.15, 1], [-0.15, -0.15, 1], [0, -1, 0], [0, -1, 0]);
        this.shape = ['relax', 'relax'];
        break;
      case 'chin': // çene elde, dirsekler masada
        g.lean = 0.2;
        set([-0.07, 1.1, 0.28], [0.06, 1.09, 0.3], [0.2, 1, 0.3], [-0.2, 1, 0.3], [0.3, 0, 1], [-0.3, 0, 1], [-0.3, -1, 0.3], [0.3, -1, 0.3], 0.7);
        this.shape = ['relax', 'fist'];
        break;
      case 'clasp': // eller kenetli (dua / gerilim)
        g.lean = 0.15 + Math.sin(t * 5 + ph) * 0.015;
        set([-0.03, 0.96, 0.34], [0.03, 0.965, 0.34], [0.1, 0.9, 0.4], [-0.1, 0.9, 0.4], [1, 0, 0], [-1, 0, 0], [-0.8, -0.6, 0], [0.8, -0.6, 0], 0.85);
        this.shape = ['grip', 'grip'];
        break;
      case 'bite': // tırnak yeme
        g.lean = 0.17;
        set([-0.17, 0.778, 0.41], [0.04, 1.14, 0.29], [0.15, -0.15, 1], [0, 1, 0.3], [0, -1, 0], [-0.4, 0, 1], null, [0.5, -1, 0.1], 0.8);
        this.shape = ['relax', 'grip'];
        break;
      case 'cheer': { // kollar havada
        const b = Math.abs(Math.sin(t * 9 + ph));
        g.lean = -0.06; g.rise = b * 0.05;
        set([-0.34, 1.5 + b * 0.05, 0.12], [0.34, 1.5 + b * 0.05, 0.12], [-0.2, 1, 0.1], [0.2, 1, 0.1], [0, 0, 1], [0, 0, 1], [-1, 0, -0.3], [1, 0, -0.3], 0.6);
        this.shape = ['open', 'open'];
        break;
      }
      case 'clap': {
        const w = Math.sin(t * 15 + ph);
        g.lean = 0.03;
        set([-0.035 - 0.08 * Math.max(0, w), 1.02, 0.36], [0.035 + 0.08 * Math.max(0, w), 1.02, 0.36], [0, 0.7, 0.7], [0, 0.7, 0.7], [1, 0, 0], [-1, 0, 0], [-0.8, -0.6, 0], [0.8, -0.6, 0], 0.7);
        this.shape = ['open', 'open'];
        break;
      }
      case 'headgrab': // eller başta (şok)
        g.lean = -0.05 + Math.sin(t * 3 + ph) * 0.03;
        set([-0.29, 1.4, 0.1], [0.29, 1.4, 0.1], [0.2, 1, 0], [-0.2, 1, 0], [1, 0, 0], [-1, 0, 0], [-1, 0.2, 0], [1, 0.2, 0], 0.8);
        this.shape = ['open', 'open'];
        break;
      case 'facepalm':
        g.lean = 0.22; g.hroll = 0.08;
        set([-0.17, 0.778, 0.41], [0.03, 1.27, 0.28], [0.15, -0.15, 1], [0, 1, 0.2], [0, -1, 0], [0, 0, -1], null, [0.6, -0.9, -0.2], 0.8);
        this.shape = ['relax', 'open'];
        break;
      case 'slump': // omuzlar düşük, kollar masada
        g.lean = 0.3; g.rise = -0.03;
        set([-0.2, 0.778, 0.4], [0.2, 0.778, 0.4], [0.1, -0.15, 1], [-0.1, -0.15, 1], [0, -1, 0], [0, -1, 0]);
        this.shape = ['relax', 'relax'];
        break;
      case 'shrug':
        g.lean = 0; g.rise = 0.02;
        set([-0.36, 0.98, 0.22], [0.36, 0.98, 0.22], [-0.6, 0.2, 0.8], [0.6, 0.2, 0.8], [0, 1, 0], [0, 1, 0], [-1, -0.6, 0], [1, -0.6, 0], 0.8);
        this.shape = ['open', 'open'];
        break;
      case 'wave': { // el sallama (selam)
        const w = Math.sin(t * 9 + ph);
        g.lean = 0.02;
        set([-0.17, 0.778, 0.41], [0.42 + w * 0.07, 1.42, 0.16], [0.15, -0.15, 1], [0.15 + w * 0.3, 1, 0.05], [0, -1, 0], [0, 0, 1], null, [1, -0.4, -0.2], 0.9);
        this.shape = ['relax', 'open'];
        break;
      }
      case 'lean': // geri yaslan (rahatlama)
        g.lean = -0.14;
        set([-0.3, 0.6, 0.06], [0.3, 0.6, 0.06], [0, -1, 0.2], [0, -1, 0.2], [1, 0, 0], [-1, 0, 0], null, null, 0.3);
        this.shape = ['relax', 'relax'];
        break;
      default: break;
    }
  }
  // bir dünya noktasını kolla göster (hand: 0 sol, 1 sağ)
  pointAt(w, hand = 1) {
    const L = this.toSeat(w);
    const S = [SHO[0] * (hand ? 1 : -1), SHO[1], SHO[2]];
    const d = vnorm(vsub(L, S));
    this.tgt.hand[hand] = vadd(S, vmul(d, (UPPER + FORE) * 0.93));
    this.tgt.fdir[hand] = d;
    this.tgt.fw[hand] = 1;
    this.tgt.palm[hand] = [hand ? -1 : 1, -0.3, 0];
    this.tgt.pole[hand] = [hand ? 0.6 : -0.6, -0.8, 0];
    this.shape[hand] = 'point';
  }
}

/* ============================ ayakta karakter ============================ */
// Eski 3B oyunlar (Sıcak Patates, Sumo Tepsisi, Mutfak Kaosu) masa karakterlerinin aynısını ayakta kullanır: oturan iskelet
// 0,38 m yukarı alınır, oturma bacakları yerine dizden bükülen bacaklar çizilir. Böylece oyuncu her oyunda aynı görünür.
const STAND_LIFT = 0.38, THIGH = 0.37;
function thighModel(mb, st) { limb(mb, [0, 0.03, 0], [0, -THIGH, 0.012], [0.1, 0.086], C(st.pants, -0.08), 12); }
function shinModel(mb, st) {
  const P = C(st.pants, -0.08), S = C(st.shoe, -0.35), sole = C('#efe9de', -0.2);
  limb(mb, [0, 0.012, 0], [0, -0.355, -0.005], [0.086, 0.068], P, 12);
  mb.superS(0, -0.385, 0.06, 0.078, 0.055, 0.135, 0.6, 0.75, S, 14, 8);
  mb.superS(0, -0.424, 0.06, 0.081, 0.016, 0.14, 0.4, 0.75, sole, 14, 4);
}
class StandAvatar extends Avatar {
  constructor(ci) {
    super(ci);
    this.base = [0, 0, 0];     // ayak tabanının dünyadaki yeri
    this.walk = 0;             // 0..1 yürüyüş (bacak salınımı)
    this.gait = Math.random() * TAU;
    this.sit = 0;              // 0..1 yere çöküş (bacaklar öne uzanır)
    this.spread = 0;           // bacak açıklığı (rad; ör. golf duruşu)
    this.legM = [[M.make(), M.make()], [M.make(), M.make()]];
    this.standPose('idle', 0);
  }
  // ayakta hazır pozlar (koltuk uzayında, kalça 0,43): idle, walk, carry (önde taşıma), push (iki elle itme), cheer, sad
  standPose(name, t = 0, amt = 1) {
    const g = this.tgt, ph = this.ph;
    const set = (L, R, FL, FR, PL, PR, EL, ER, fw = 0.5) => {
      g.hand[0] = L; g.hand[1] = R;
      g.fdir[0] = FL || [0, -1, 0.15]; g.fdir[1] = FR || [0, -1, 0.15];
      g.palm[0] = PL || [1, 0, 0.2]; g.palm[1] = PR || [-1, 0, 0.2];
      g.pole[0] = EL || [-0.45, 0, -1]; g.pole[1] = ER || [0.45, 0, -1];
      g.fw[0] = g.fw[1] = fw;
    };
    g.rise = 0; g.roll = 0; g.turn = 0; g.hroll = 0;
    switch (name) {
      case 'walk': {
        const sw = Math.sin(this.gait) * 0.17 * amt;
        g.lean = 0.05 * amt;
        set([-0.31, 0.53, 0.06 + sw], [0.31, 0.53, 0.06 - sw]);
        this.shape = ['relax', 'relax'];
        break;
      }
      case 'carry': // önde iki elle taşıma (avuçlar yukarı, tabak tutar gibi)
        g.lean = 0.03;
        set([-0.25, 0.8, 0.46], [0.25, 0.8, 0.46], [0.35, 0.1, 1], [-0.35, 0.1, 1], [0.35, 1, 0], [-0.35, 1, 0], [-0.8, -0.6, 0], [0.8, -0.6, 0], 0.7);
        this.shape = ['open', 'open'];
        break;
      case 'push':
        g.lean = 0.22;
        set([-0.2, 0.95, 0.5], [0.2, 0.95, 0.5], [0, 0.4, 1], [0, 0.4, 1], [0, 0, 1], [0, 0, 1], [-0.8, -0.5, 0], [0.8, -0.5, 0], 0.8);
        this.shape = ['open', 'open'];
        break;
      case 'cheer': {
        const b = Math.abs(Math.sin(t * 9 + ph));
        g.lean = -0.06; g.rise = b * 0.04;
        set([-0.34, 1.5 + b * 0.05, 0.12], [0.34, 1.5 + b * 0.05, 0.12], [-0.2, 1, 0.1], [0.2, 1, 0.1], [0, 0, 1], [0, 0, 1], [-1, 0, -0.3], [1, 0, -0.3], 0.6);
        this.shape = ['open', 'open'];
        break;
      }
      case 'sad':
        g.lean = 0.2;
        set([-0.27, 0.5, 0.14], [0.27, 0.5, 0.14]);
        this.shape = ['relax', 'relax'];
        break;
      case 'guard': { // itişmeye hazır: eller göğsün önünde, avuçlar öne (adımla hafifçe sallanır)
        const sw = Math.sin(this.gait) * 0.07 * amt;
        g.lean = 0.12;
        set([-0.21, 0.86, 0.3 + sw], [0.21, 0.86, 0.3 - sw], [0, 0.5, 1], [0, 0.5, 1], [0.25, 0, 1], [-0.25, 0, 1], [-0.85, -0.5, -0.1], [0.85, -0.5, -0.1], 0.75);
        this.shape = ['open', 'open'];
        break;
      }
      case 'reach': { // tezgâhta iş: eller öne-aşağı uzanır (doğrama / çevirme ritmi)
        const w = Math.sin(t * 16 + ph) * 0.035;
        g.lean = 0.2;
        set([-0.17, 0.66 + w, 0.44], [0.17, 0.66 - w, 0.46], [0.1, -0.5, 1], [-0.1, -0.5, 1], [0, -1, 0.2], [0, -1, 0.2], [-0.8, -0.4, -0.3], [0.8, -0.4, -0.3], 0.7);
        this.shape = ['grip', 'open'];
        break;
      }
      case 'flail': { // düşerken kollar havada çırpınır
        const a = Math.sin(t * 17 + ph), b = Math.sin(t * 15 + ph + 1.9);
        g.lean = -0.1;
        set([-0.4, 1.3 + a * 0.18, 0.1 + b * 0.1], [0.4, 1.3 - b * 0.18, 0.1 - a * 0.1], [-0.3, 1, 0], [0.3, 1, 0], [0, 0, 1], [0, 0, 1], [-1, 0, -0.2], [1, 0, -0.2], 0.6);
        this.shape = ['open', 'open'];
        break;
      }
      case 'idle':
      default: {
        const s = Math.sin(t * 1.4 + ph) * 0.015;
        g.lean = 0.02;
        set([-0.33, 0.5 + s, 0.05], [0.33, 0.5 - s, 0.05]);
        this.shape = ['relax', 'relax'];
      }
    }
  }
  // gövde + bacak matrisleri (önce base / yaw / walk / sit / hedefler ayarlanır)
  stepStand(dt, t) {
    const sit = this.sit, w = this.walk * (1 - sit), A1 = this.A1 || (this.A1 = [0, 0]), A2 = this.A2 || (this.A2 = [0, 0]);
    // yürüyüş açıları; kalça, basan ayak yere değecek kadar iner (adım başına doğal iniş-çıkış)
    let ext = 0;
    for (let j = 0; j < 2; j++) {
      const ph = this.gait + (j ? Math.PI : 0);
      // diz, ayak öne savrulurken (salınım evresi) bükülür; basan ayak geriye kayarken düz kalır → ileri yürüyüş
      const a1 = -Math.sin(ph) * 0.62 * w, a2 = Math.max(0, Math.sin(ph + 1.9)) * 0.95 * w;
      ext = Math.max(ext, THIGH * Math.cos(a1) + 0.43 * Math.cos(a1 + a2));
      A1[j] = a1 - sit * 1.4; A2[j] = a2 + sit * 0.12;
    }
    this.pos[0] = this.base[0]; this.pos[2] = this.base[2];
    this.pos[1] = this.base[1] + STAND_LIFT - sit * 0.68 - (THIGH + 0.43 - ext);
    this.step(dt, t);
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    for (let j = 0; j < 2; j++) {
      const hx = (j ? 1 : -1) * 0.125;
      M.set(this.legM[j][0], this.pos[0] + hx * c, this.pos[1] + 0.43, this.pos[2] - hx * s, this.yaw, A1[j], (j ? 1 : -1) * this.spread, 1);
      M.set(this.tmp, 0, -THIGH, 0.012, 0, A2[j], 0, 1);
      M.mul(this.legM[j][1], this.legM[j][0], this.tmp);
    }
  }
  // Kök dönüşüm (çizimde tüm parçalara uygulanır): ayak tabanı etrafında ölçek (sc), çarpışma ezilmesi (sq: boy 1−sq, en 1+sq/2),
  // gövde ortası etrafında takla (pitch: öne, roll: yana). Hepsi etkisizse kapalıdır.
  setRoot(sc = 1, pitch = 0, roll = 0, sq = 0) {
    if (sc === 1 && !pitch && !roll && !sq) { this.root = null; return; }
    const R = this.root || (this.root = M.make()), t = this.tmpR || (this.tmpR = M.make());
    const b = this.base, h = 0.95 * sc;
    M.set(R, b[0], b[1] + h, b[2], this.yaw, pitch, roll, 1);
    M.set(t, 0, 0, 0, -this.yaw, 0, 0, 1); M.mul(R, R, t);
    M.set(t, 0, -h, 0, 0, 0, 0, sc * (1 + sq * 0.5), sc * (1 - sq), sc * (1 + sq * 0.5)); M.mul(R, R, t);
    M.set(t, -b[0], -b[1], -b[2], 0, 0, 0, 1); M.mul(R, R, t);
  }
  // çizim matrisleri (kök dönüşüm uygulanmış)
  frames() {
    if (!this.root) return this.F0 || (this.F0 = { legs: this.legM, body: this.M.body, head: this.M.head, up: this.M.up, fo: this.M.fo, hd: this.M.hd });
    const R = this.root, D = this.FD || (this.FD = { legs: [[M.make(), M.make()], [M.make(), M.make()]], body: M.make(), head: M.make(), up: [M.make(), M.make()], fo: [M.make(), M.make()], hd: [M.make(), M.make()] });
    for (let j = 0; j < 2; j++) {
      M.mul(D.legs[j][0], R, this.legM[j][0]); M.mul(D.legs[j][1], R, this.legM[j][1]);
      M.mul(D.up[j], R, this.M.up[j]); M.mul(D.fo[j], R, this.M.fo[j]); M.mul(D.hd[j], R, this.M.hd[j]);
    }
    M.mul(D.body, R, this.M.body); M.mul(D.head, R, this.M.head);
    return D;
  }
  // dünya noktası (kök dönüşümle): ör. ellerin gerçek yeri
  rootP(p) { return this.root ? xfP(this.root, p) : p; }
}
// Aşçı görünümü (Sumo Tepsisi, Mutfak Kaosu): şef şapkası + önlük. Şapkayla çakışan saç / kulaklık sadeleşir.
const CHEF_HAIR = { cap: 'short', beanie: 'short', spiky: 'short', bun: 'bob' };
function chefHatModel(mb) {
  const [cx, cy, cz] = HC, r = HR;
  const W = C('#fbfaf6', -0.12), Wd = C('#ebe8e0', -0.12), Wb = C('#f3f1ea', -0.2);
  mb.push().T(cx, cy + r * 0.4, cz - r * 0.05, 0, -0.14);
  // bant: yukarı doğru hafif genişler, alt kenarı kıvrık
  mb.lathe(0, 0, 0, [[r * 1.0, -r * 0.02], [r * 1.07, r * 0.04], [r * 1.08, r * 0.12], [r * 1.1, r * 0.55], [r * 1.02, r * 0.6], [0, r * 0.6]], 28, Wb);
  // kabarık tepe: ortada büyük, çevrede yedi pofuduk
  mb.sphereS(0, r * 0.98, 0, r * 1.22, r * 0.64, r * 1.18, W, 22, 12);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.3; mb.sphereS(Math.cos(a) * r * 0.78, r * 0.86, Math.sin(a) * r * 0.76, r * 0.5, r * 0.44, r * 0.5, i % 2 ? Wd : W, 12, 8); }
  mb.pop();
}
// önlük: göğüsten bele beyaz yama (gövde yüzeyine oturur, kenarları gövdeye kıvrılır), cep, boyun askısı
function apronModel(mb) {
  const W = C('#f7f5ef', -0.12), S = C('#e2ded4', -0.12);
  const y0 = 0.47, y1 = 0.94;
  const hw = (u) => (u < 0.55 ? 0.17 : lerp(0.17, 0.105, (u - 0.55) / 0.45));
  psurf(mb, 12, 12, (u, v) => {
    const y = y0 + (y1 - y0) * u, x = (v - 0.5) * 2 * hw(u);
    const e = Math.max(0, (Math.abs(v - 0.5) * 2 - 0.78) / 0.22);
    return [x, y, torsoZ(x, y) + 0.004 + 0.018 * (1 - e * e)];
  }, (u, v) => (v < 0.09 || v > 0.91 || u > 0.94 ? S : W), { cen: [0, 0.7, 0] });
  // cep
  mb.superS(0, 0.6, torsoZ(0, 0.6) + 0.024, 0.075, 0.045, 0.01, 0.4, 0.5, S, 12, 5);
  // askı: önlüğün üst köşelerinden boynun arkasına
  for (const s of [-1, 1]) {
    const a = [s * 0.098, y1 - 0.01, torsoZ(s * 0.098, y1 - 0.01) + 0.016], b = [s * 0.085, 1.07, -0.02];
    limb(mb, a, b, [0.014, 0.013], S, 6);
  }
}
// Ayakta karakter ağları: kişiye özel (gövde, baş, uyluk, baldır) + ortak (kollar, göz kapağı, ifade, el). o.chef: aşçı görünümü
function standMeshes(mk, ci, o = {}) {
  let st = styleOf(ci);
  if (o.chef) st = Object.assign({}, st, { hairS: CHEF_HAIR[st.hairS] || st.hairS, acc: (st.acc || []).filter((a) => a !== 'headphones') });
  return {
    torso: mk((mb) => { torsoModel(mb, st); if (o.chef) apronModel(mb); }),
    head: mk((mb) => { headModel(mb, st); if (o.chef) chefHatModel(mb); }),
    thigh: mk((mb) => thighModel(mb, st)), shin: mk((mb) => shinModel(mb, st))
  };
}
function standShared(mk) {
  const ex = {}, hd = {};
  return {
    upper: mk(upperArmModel), fore: mk(foreArmModel), lids: mk(lidsModel),
    expr: (k) => ex[k] || (ex[k] = mk((mb) => exprModel(mb, k))),
    hand: (shape, side) => hd[shape + side] || (hd[shape + side] = mk((mb) => handModel(mb, shape, side ? 1 : -1))),
    all: () => [...Object.values(ex), ...Object.values(hd)]
  };
}
// Çizim. tint: genel ton (ör. yanma), tintS: kol rengi (oyuncu rengi × ton), tintH: ten (el, göz kapağı)
function drawStand(X, a, mm, sh, F, o, tint, tintS, tintH, blink) {
  const f = a.frames();
  for (let j = 0; j < 2; j++) { drawToon(X, mm.thigh, f.legs[j][0], tint, F, o); drawToon(X, mm.shin, f.legs[j][1], tint, F, o); }
  drawToon(X, mm.torso, f.body, tint, F, o);
  drawToon(X, mm.head, f.head, tint, F, o);
  drawMesh(X, sh.expr(a.expr), f.head, tint);
  if (blink && a.expr !== 'laugh' && a.expr !== 'wince') drawMesh(X, sh.lids, f.head, tintH);
  for (let j = 0; j < 2; j++) {
    drawToon(X, sh.upper, f.up[j], tintS, F, o);
    drawToon(X, sh.fore, f.fo[j], tintS, F, o);
    drawToon(X, sh.hand(a.shape[j], j), f.hd[j], tintH, F, o);
  }
}
function castStand(X, a, mm, sh) {
  const f = a.frames();
  for (let j = 0; j < 2; j++) { shadowCast(X, mm.thigh, f.legs[j][0]); shadowCast(X, mm.shin, f.legs[j][1]); }
  shadowCast(X, mm.torso, f.body); shadowCast(X, mm.head, f.head);
  for (let j = 0; j < 2; j++) { shadowCast(X, sh.upper, f.up[j]); shadowCast(X, sh.fore, f.fo[j]); shadowCast(X, sh.hand(a.shape[j], j), f.hd[j]); }
}
// Oturan karakter başka sahnelerde (ör. Mutfak Kaosu müşterileri): kişiye özel ağlar + çizim. Bacaklar koltuğa sabit (eğilmez).
function seatMeshes(mk, ci) {
  const st = styleOf(ci);
  return { torso: mk((mb) => torsoModel(mb, st)), head: mk((mb) => headModel(mb, st)), legs: mk((mb) => seatedLegsModel(mb, st)) };
}
function seatMat(a) { return M.set(a.seatM || (a.seatM = M.make()), a.pos[0], a.pos[1], a.pos[2], a.yaw, 0, 0, 1); }
function drawSeat(X, a, mm, sh, F, o, tint, tintS, tintH, blink) {
  drawToon(X, mm.legs, seatMat(a), tint, F, o);
  drawToon(X, mm.torso, a.M.body, tint, F, o);
  drawToon(X, mm.head, a.M.head, tint, F, o);
  drawMesh(X, sh.expr(a.expr), a.M.head, tint);
  if (blink && a.expr !== 'laugh' && a.expr !== 'wince') drawMesh(X, sh.lids, a.M.head, tintH);
  for (let j = 0; j < 2; j++) {
    drawToon(X, sh.upper, a.M.up[j], tintS, F, o);
    drawToon(X, sh.fore, a.M.fo[j], tintS, F, o);
    drawToon(X, sh.hand(a.shape[j], j), a.M.hd[j], tintH, F, o);
  }
}
function castSeat(X, a, mm, sh) {
  shadowCast(X, mm.legs, seatMat(a)); shadowCast(X, mm.torso, a.M.body); shadowCast(X, mm.head, a.M.head);
  for (let j = 0; j < 2; j++) { shadowCast(X, sh.upper, a.M.up[j]); shadowCast(X, sh.fore, a.M.fo[j]); shadowCast(X, sh.hand(a.shape[j], j), a.M.hd[j]); }
}

/* ============================ sahne parçaları ============================ */
// Bistro sandalyesi (oturan +Z'ye bakar, arkalık -Z'de)
function chairModel(mb, woodHex = '#6b4428', padHex = '#a8322a') {
  const wr = hexRGB(woodHex);
  const W = rgbA(wr, -0.4), Wd = rgbA(mix3(wr, [0, 0, 0], 0.28), -0.4), P = C(padHex, -0.12);
  mb.rbox(-0.25, 0.33, -0.25, 0.25, 0.385, 0.22, 0.022, W, 2);
  mb.rbox(-0.225, 0.372, -0.225, 0.225, 0.43, 0.2, 0.045, P, 3);
  for (const [x, z] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.18], [0.21, 0.18]]) limb(mb, [x * 1.1, 0, z * 1.1], [x, 0.34, z], [0.026, 0.022], W, 8);
  limb(mb, [-0.22, 0.12, 0.19], [0.22, 0.12, 0.19], [0.012, 0.012], Wd, 6);
  limb(mb, [-0.22, 0.12, -0.22], [0.22, 0.12, -0.22], [0.012, 0.012], Wd, 6);
  for (const s of [-1, 1]) limb(mb, [s * 0.21, 0.36, -0.22], [s * 0.205, 0.98, -0.275], [0.026, 0.022], W, 8);
  mb.push().T(0, 0.925, -0.268, 0, -0.08);
  mb.rbox(-0.235, -0.055, -0.022, 0.235, 0.055, 0.022, 0.02, W, 2);
  mb.pop();
  mb.push().T(0, 0.72, -0.252, 0, -0.06);
  mb.rbox(-0.2, -0.018, -0.014, 0.2, 0.018, 0.014, 0.01, Wd, 2);
  mb.pop();
}
// Yuvarlak masa + dökümlü örtü (keten, kenarı marka renginde işlemeli)
function tableModel(mb, R, trimHex, clothHex = '#f3ece0', hem = 0.24) {
  const cl = hexRGB(clothHex), tr = hexRGB(trimHex);
  const weave = (x, z) => 0.95 + 0.05 * vn(x * 9, z * 9);
  // üst yüz (çok hafif kubbeli değil: düz) — halkalar halinde, dokuma lekesiyle
  const rings = 14;
  for (let i = 0; i < rings; i++) {
    const r0 = (R * i) / rings, r1 = (R * (i + 1)) / rings;
    mb.lathe(0, TABLE_Y, 0, [[r1, 0], [r0, 0]], 64, (k, a) => { const rr = k ? r0 : r1; const w = weave(Math.cos(a) * rr, Math.sin(a) * rr); return rgbA([cl[0] * w, cl[1] * w, cl[2] * w], -0.05); });
  }
  // kenardan dökülen kısım: kıvrımlar aşağı doğru derinleşir
  const nf = Math.max(14, Math.round(R * 9));
  const drop = TABLE_Y - hem;
  psurf(mb, [0, 0.04, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.88, 0.94, 1], 160, (u, v) => {
    const ph = TAU * v;
    const fo = Math.sin(ph * nf) * 0.5 + Math.sin(ph * nf * 1.7 + 1.3) * 0.28 + Math.sin(ph * nf * 0.5 + 2.1) * 0.22;
    const edge = Math.sin(Math.min(1, u / 0.1) * Math.PI / 2);
    const rr = R + 0.012 + 0.03 * edge + fo * 0.045 * sst(0.05, 1, u) + 0.02 * u;
    const y = TABLE_Y - (u < 0.1 ? 0.03 * (1 - Math.cos(u / 0.1 * Math.PI / 2)) : 0.03 + (drop - 0.03) * ((u - 0.1) / 0.9));
    return [Math.cos(ph) * rr, y, Math.sin(ph) * rr];
  }, (u, v) => {
    const ph = TAU * v;
    const fo = Math.sin(ph * nf) * 0.5 + Math.sin(ph * nf * 1.7 + 1.3) * 0.28;
    const sh = 0.93 + 0.07 * fo * sst(0.1, 1, u);
    if (u > 0.82 && u < 0.88) return rgbA([tr[0] * sh, tr[1] * sh, tr[2] * sh], -0.1);
    if (u > 0.9 && u < 0.92) return rgbA([tr[0] * sh, tr[1] * sh, tr[2] * sh], -0.1);
    const w = weave(Math.cos(ph) * 3, u * 4) * sh;
    return rgbA([cl[0] * w, cl[1] * w, cl[2] * w], -0.05);
  }, { wv: true, cen: [0, TABLE_Y - 0.4, 0] });
  // tabanın altı koyu (örtünün içi)
  mb.lathe(0, hem + 0.002, 0, [[R + 0.03, 0], [0, 0]], 40, C('#2a2320'));
}
// Yuvarlak halı (masanın altında): halka desenleri, marka rengi süslemeler
function rugModel(mb, R, accentHex) {
  const A = mix3(hexRGB(accentHex), [0.25, 0.18, 0.16], 0.55), base = mix3([0.24, 0.12, 0.1], A, 0.16), cream = [0.58, 0.47, 0.32], dark = [0.12, 0.07, 0.06];
  const bands = [[0, 0.8, base], [0.8, 0.815, cream], [0.815, 0.9, mix3(base, dark, 0.35)], [0.9, 0.915, cream], [0.915, 0.97, base], [0.97, 1.0, dark]];
  bands.forEach(([a, b, col]) => {
    mb.lathe(0, 0.006, 0, [[R * b, 0], [R * a, 0]], 72, (k, ang) => {
      const m = a > 0.85 && a < 0.9 ? (Math.sin(ang * 24) > 0.6 ? 1.18 : 1) : a === 0 ? 0.94 + 0.06 * vn(Math.cos(ang) * 6 * (1 - k), Math.sin(ang) * 6) : 1;
      return rgbA([col[0] * m, col[1] * m, col[2] * m], 0);
    });
  });
  // ortada madalyon: dört yapraklı motif
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    mb.push().T(Math.cos(a) * R * 0.36, 0.0075, Math.sin(a) * R * 0.36, -a);
    mb.superS(0, 0, 0, R * 0.09, 0.002, R * 0.035, 1, 0.6, rgbA(mix3(base, cream, 0.3), 0), 12, 3);
    mb.pop();
  }
}
// Sarkıt lamba (masa üstünde): emaye abajur (dışı koyu yeşil parlak, içi sıcak), ampul, pirinç başlık, kablo
function pendantModel(mb, shadeHex = '#1f4a3a', cord = 3) {
  const S = C(shadeHex, -0.85), I = C('#ffe9c2', 0.6), B = C('#d6a64a', -0.92);
  mb.cyl(0, 0.3, 0, 0.012, 0.3 + cord, 0.012, 6, C('#1a1a1a'));
  mb.lathe(0, 0.22, 0, [[0.05, 0.1], [0.06, 0.02], [0.065, 0]], 16, B);
  mb.lathe(0, 0, 0, [[0.46, 0], [0.45, 0.02], [0.4, 0.07], [0.28, 0.16], [0.12, 0.22], [0.06, 0.24]], 40, S);
  mb.lathe(0, 0.004, 0, [[0.44, 0], [0.38, 0.06], [0.26, 0.145], [0.1, 0.2]], 40, I);
  mb.torusN(0, 0.0, 0, 0.455, 0.012, 0.012, 40, 5, B);
  mb.sphereS(0, 0.06, 0, 0.085, 0.095, 0.085, C('#fff4d6', 1), 14, 10);
}
// İnce belli çay bardağı (çay dolu) + tabak + kaşık; cam ayrı (un): teaGlassShell
function teaGlassModel(mb, rimHex = '#c8261c') {
  const P = C('#fbf8f2', -0.8), Rm = C(rimHex, -0.6);
  mb.lathe(0, 0, 0, [[0, 0], [0.12, 0], [0.135, 0.008], [0.2, 0.02], [0.215, 0.028], [0.2, 0.03], [0.2, 0.03], [0.07, 0.02], [0, 0.02]], 32, (i) => (i === 3 || i === 4 || i === 5 ? Rm : P));
  // çay: belin altında daralan, üstte açılan; yüzeyi parlak koyu kehribar
  const tea = (i) => (i >= 6 ? [0.55, 0.12, 0.04, -0.9] : [0.42, 0.08, 0.02, -0.85]);
  mb.lathe(0, 0.022, 0, [[0, 0], [0.055, 0], [0.062, 0.03], [0.05, 0.12], [0.05, 0.13], [0.064, 0.2], [0.07, 0.235], [0.068, 0.235], [0, 0.235]], 24, tea);
  // kaşık (tabağın üstünde)
  mb.push().T(0.12, 0.034, 0.05, 0.6, 0, 0);
  mb.rbox(-0.008, 0, -0.1, 0.008, 0.006, 0.06, 0.003, C('#cfd4da', -0.92), 1);
  mb.sphereS(0, 0.004, 0.08, 0.022, 0.006, 0.03, C('#cfd4da', -0.92), 8, 4);
  mb.pop();
}
function teaGlassShell(mb) {
  const seg = 24;
  const prof = [[0.058, 0.022], [0.066, 0.05], [0.054, 0.14], [0.054, 0.15], [0.07, 0.24], [0.078, 0.29]];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
    const al = (a) => 0.08 + 0.3 * Math.pow(Math.abs(Math.sin(a)), 4);
    for (let k = 0; k < prof.length - 1; k++) {
      const P = (a, p) => [Math.cos(a) * p[0], p[1], Math.sin(a) * p[0]];
      const A = P(a0, prof[k]), B = P(a1, prof[k]), Cc = P(a1, prof[k + 1]), D = P(a0, prof[k + 1]);
      const c0 = [0.9, 0.95, 1, al(a0)], c1 = [0.9, 0.95, 1, al(a1)];
      mb.d.push(...A, ...c0, ...B, ...c1, ...Cc, ...c1, ...A, ...c0, ...Cc, ...c1, ...D, ...c0);
    }
    const P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const r0 = [1, 1, 1, 0.55];
    mb.d.push(...P(a0, 0.078, 0.29), ...r0, ...P(a1, 0.078, 0.29), ...r0, ...P(a1, 0.073, 0.296), ...r0);
    mb.d.push(...P(a0, 0.078, 0.29), ...r0, ...P(a1, 0.073, 0.296), ...r0, ...P(a0, 0.073, 0.296), ...r0);
  }
}
// Tabak düzeni (oturanın önüne): porselen tabak, çatal bıçak, peçete (birim: sahne metresi)
function placeSetting(mb, accentHex, leftover = 0) {
  mb.push().T(0, 0, 0, 0, 0, 0, 0.27);
  KIT.plate(mb, accentHex);
  mb.pop();
  // tabakta yemek artıkları: birkaç kırıntı / sos lekesi
  if (leftover) {
    const R = KIT.rng(leftover * 7 + 3);
    for (let k = 0; k < 5; k++) {
      const a = R() * TAU, r = R() * 0.13;
      mb.sphereS(Math.cos(a) * r, 0.026, Math.sin(a) * r, 0.018 + R() * 0.02, 0.006, 0.014 + R() * 0.02, k % 2 ? C('#b8452a', -0.6) : C('#d9a85a', -0.2), 8, 3);
    }
  }
  mb.push().T(-0.34, 0.0, 0.02, 0, 0, 0, 0.1);
  KIT.napkin(mb, accentHex);
  mb.pop();
  mb.push().T(-0.34, 0.012, 0.02, Math.PI, 0, 0, 0.085);
  KIT.cutlery(mb);
  mb.pop();
}

/* ============================ restoran odası ============================ */
// Arka duvar (z = -ZB) ve yan duvarlar (x = ±XS): ahşap lambri, sandalye çıtası, çizgili duvar kâğıdı, tavan pervazı,
// iki pencere (gece şehri: ışık bulanıkları), perdeler, aplikler, ortada kara tahta (doku ayrı), köşelerde saksılar,
// arkada iki küçük boş masa. o: { wall, wood, curtain }
const ROOM = { ZB: 7.2, XS: 8.4, H: 5.2 };
function roomModel(mb, o = {}) {
  const { ZB, XS, H } = ROOM;
  const wall = hexRGB(o.wall || '#24453a'), wood = hexRGB(o.wood || '#4b2f20'), cur = hexRGB(o.curtain || '#7a1f28');
  const Wd = rgbA(wood, -0.35), WdL = rgbA(mix3(wood, [1, 0.9, 0.7], 0.18), -0.45), WdD = rgbA(mix3(wood, [0, 0, 0], 0.35), -0.3);
  // duvar yüzeyi: f(u, y) → düzlemde nokta; n: içe bakan normal
  const wallSide = (P, len, nrm, seed) => {
    const up = [0, 1, 0];
    // süpürgelik + lambri zemini
    const q = (u0, y0, u1, y1, col, dz = 0) => { const a = P(u0, y0, dz), b = P(u1, y0, dz), c = P(u1, y1, dz), d = P(u0, y1, dz); mb.quadN(a, b, c, d, nrm, nrm, nrm, nrm, col); };
    q(0, 0, len, 0.14, WdD, 0.03);
    q(0, 0.14, len, 1.18, Wd);
    // lambri panoları (kabarık çerçeveler)
    const pw = 1.15;
    for (let u = 0.25; u + pw < len - 0.1; u += pw + 0.18) {
      q(u, 0.28, u + pw, 0.32, WdL, 0.025); q(u, 1.0, u + pw, 1.04, WdL, 0.025);
      q(u, 0.32, u + 0.04, 1.0, WdL, 0.025); q(u + pw - 0.04, 0.32, u + pw, 1.0, WdL, 0.025);
      q(u + 0.04, 0.32, u + pw - 0.04, 1.0, rgbA(mix3(wood, [0, 0, 0], 0.12), -0.35), 0.012);
    }
    // sandalye çıtası
    q(0, 1.16, len, 1.26, WdL, 0.05);
    // duvar kâğıdı: dikey şeritler + küçük baklava motifleri
    const sw = 0.34;
    for (let u = 0, k = 0; u < len; u += sw, k++) {
      const u1 = Math.min(len, u + sw);
      const sh = k % 2 ? 1 : 0.9;
      q(u, 1.26, u1, H - 0.22, rgbA([wall[0] * sh, wall[1] * sh, wall[2] * sh], 0));
      if (k % 2 === 0) for (let y = 1.6; y < H - 0.5; y += 0.62) {
        const c = P(u + sw / 2, y + (k % 4 ? 0.31 : 0), 0.006);
        const d = 0.045;
        const A = P(u + sw / 2 - d, y + (k % 4 ? 0.31 : 0), 0.006), B = P(u + sw / 2, y + (k % 4 ? 0.31 : 0) - d * 1.4, 0.006), Cc = P(u + sw / 2 + d, y + (k % 4 ? 0.31 : 0), 0.006), D = P(u + sw / 2, y + (k % 4 ? 0.31 : 0) + d * 1.4, 0.006);
        void c;
        mb.quadN(A, B, Cc, D, nrm, nrm, nrm, nrm, rgbA(mix3(wall, [0.9, 0.78, 0.5], 0.35), -0.4));
      }
    }
    // tavan pervazı
    q(0, H - 0.22, len, H - 0.16, WdL, 0.06);
    q(0, H - 0.16, len, H, WdD, 0.04);
    void up; void seed;
  };
  // arka duvar: soldan sağa, normal +z
  wallSide((u, y, dz) => [-XS + u, y, -ZB + dz], XS * 2, [0, 0, 1], 1);
  // yan duvarlar (normal içe)
  wallSide((u, y, dz) => [-XS + dz, y, -ZB + u], ZB + 7, [1, 0, 0], 2);
  wallSide((u, y, dz) => [XS - dz, y, -ZB + u], ZB + 7, [-1, 0, 0], 3);
  // pencereler (arka duvar): çerçeve, kayıt, gece şehri camı, perdeler
  for (const wx of [-4.1, 4.1]) {
    const x0 = wx - 0.95, x1 = wx + 0.95, y0 = 1.55, y1 = 3.95, z = -ZB + 0.02;
    // cam: aşağıdan yukarı koyu laciverte geçen gece, uzak ışıklar ayrı (ışık saçar)
    psurf(mb, 6, 1, (u, v) => [lerp(x0, x1, v), lerp(y0, y1, u), z + 0.01], (u) => rgbA(mix3([0.12, 0.13, 0.26], [0.03, 0.04, 0.1], u), 0.9), { cen: [wx, 2.5, z - 1] });
    for (let k = 0; k < 26; k++) {
      const bx = lerp(x0 + 0.1, x1 - 0.1, hs(k, wx)), by = lerp(y0 + 0.1, y0 + 1.2, Math.pow(hs(k, wx + 3), 1.5));
      const col = [[1, 0.78, 0.4], [1, 0.55, 0.3], [0.7, 0.85, 1], [1, 0.9, 0.7]][k % 4];
      mb.sphereS(bx, by, z + 0.03, 0.03 + 0.04 * hs(k, 7), 0.03 + 0.04 * hs(k, 7), 0.01, rgbA(col, 1), 8, 4);
    }
    mb.rbox(x0 - 0.1, y0 - 0.12, z, x1 + 0.1, y0, z + 0.14, 0.02, WdL, 2);
    mb.rbox(x0 - 0.1, y1, z, x1 + 0.1, y1 + 0.1, z + 0.09, 0.02, Wd, 2);
    mb.rbox(x0 - 0.1, y0, z, x0, y1, z + 0.09, 0.02, Wd, 2);
    mb.rbox(x1, y0, z, x1 + 0.1, y1, z + 0.09, 0.02, Wd, 2);
    mb.rbox(wx - 0.035, y0, z, wx + 0.035, y1, z + 0.07, 0.015, Wd, 2);
    mb.rbox(x0, (y0 + y1) / 2 - 0.03, z, x1, (y0 + y1) / 2 + 0.03, z + 0.07, 0.015, Wd, 2);
    // perdeler: iki yanda dökümlü kumaş, bağcıkla toplanmış
    for (const sd of [-1, 1]) {
      const cx = sd < 0 ? x0 - 0.28 : x1 + 0.28;
      psurf(mb, 14, 8, (u, v) => {
        const y = lerp(4.35, 0.2, u);
        const pinch = 1 - 0.55 * Math.exp(-Math.pow((y - 1.35) / 0.35, 2));
        const w = 0.48 * pinch;
        const x = cx + (v - 0.5) * w + Math.sin(v * Math.PI * 5) * 0.012;
        const zz = z + 0.16 + Math.sin(v * Math.PI * 5 + 0.6) * 0.05 * pinch;
        return [x, y, zz];
      }, (u, v) => { const k = 0.8 + 0.2 * Math.sin(v * Math.PI * 5); return rgbA([cur[0] * k, cur[1] * k, cur[2] * k], -0.15); }, { cen: [cx, 2.4, z - 1] });
      mb.torusN(cx, 1.35, z + 0.18, 0.13, 0.02, 0.02, 16, 5, C('#d6a64a', -0.9));
    }
    mb.cyl(x0 - 0.65, 4.38, z + 0.2, 0.025, 4.42, 0.025, 6, C('#d6a64a', -0.9));
    limb(mb, [x0 - 0.7, 4.4, z + 0.2], [x1 + 0.7, 4.4, z + 0.2], [0.022, 0.022], C('#d6a64a', -0.9), 8);
  }
  // kara tahta çerçevesi (yüzü doku)
  mb.rbox(-1.36, 1.55, -ZB + 0.02, 1.36, 3.42, -ZB + 0.08, 0.03, WdD, 2);
  mb.rbox(-1.3, 1.6, -ZB + 0.05, 1.3, 3.37, -ZB + 0.11, 0.02, Wd, 2);
  mb.rbox(-1.25, 1.5, -ZB + 0.05, 1.25, 1.58, -ZB + 0.2, 0.015, WdL, 2);
  // aplikler: pirinç sırt + lale cam (ışık saçar)
  for (const ax of [-2.35, 2.35]) {
    mb.superS(ax, 2.75, -ZB + 0.03, 0.08, 0.14, 0.03, 0.6, 0.6, C('#c99a3e', -0.9), 12, 6);
    limb(mb, [ax, 2.72, -ZB + 0.05], [ax, 2.85, -ZB + 0.25], [0.014, 0.014], C('#c99a3e', -0.9), 6);
    mb.lathe(ax, 2.86, -ZB + 0.26, [[0.02, 0], [0.09, 0.05], [0.12, 0.16], [0.11, 0.17]], 16, C('#ffd79a', 1));
  }
  // köşe saksıları
  for (const [px, pz] of [[-7.3, -6.3], [7.3, -6.3]]) {
    mb.push().T(px, 0, pz, 0, 0, 0, 0.5);
    KIT.basilPot(mb);
    mb.pop();
  }
  // arkada iki boş masa (örtülü, mumlu, iki sandalye)
  for (const [tx, tz] of [[-5.2, -4.6], [5.2, -4.6]]) {
    mb.push().T(tx, 0, tz);
    tableModel(mb, 0.75, o.trim || '#c8261c', '#efe6d6', 0.18);
    mb.push().T(0, TABLE_Y + 0.004, 0, 0, 0, 0, 0.07); KIT.candle(mb); mb.pop();
    for (const sd of [-1, 1]) { mb.push().T(sd * 1.15, 0, 0, sd > 0 ? -Math.PI / 2 : Math.PI / 2); chairModel(mb, '#5d3b24', '#3f5a4a'); mb.pop(); }
    mb.pop();
  }
}
// Kara tahta: oyun adı (tebeşir yazısı), işletme adı, süs çizgileri
function drawBoard(cv, title, sub, brandName, dy = 0) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
  gr.addColorStop(0, '#2c3a33'); gr.addColorStop(1, '#18201c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // tebeşir tozu
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 1 + Math.random() * 2); }
  const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(255,250,235,.85)'; g.lineWidth = 3;
  g.setLineDash([14, 9]); g.strokeRect(26, 26, W - 52, H - 52); g.setLineDash([]);
  g.fillStyle = 'rgba(255,250,235,.95)';
  let fs = 92;
  g.font = `800 ${fs}px ${F}`;
  while (g.measureText(title).width > W - 120 && fs > 30) { fs -= 4; g.font = `800 ${fs}px ${F}`; }
  g.fillText(title, W / 2, H * (0.4 + dy));
  g.fillStyle = '#ffd23f';
  g.font = `700 40px ${F}`;
  g.fillText(sub || '', W / 2, H * (0.62 + dy * 0.85), W - 120);
  g.fillStyle = 'rgba(255,250,235,.7)';
  g.font = `700 30px ${F}`;
  g.fillText(brandName || 'NFC DÜNYASI', W / 2, H * (0.82 + dy * 0.45), W - 140);
  // köşelerde küçük yıldızlar
  g.strokeStyle = 'rgba(255,250,235,.6)'; g.lineWidth = 3;
  [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]].forEach(([x, y]) => { g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5; const px = x + Math.cos(a) * 16, py = y + Math.sin(a) * 16; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke(); });
}
function boardQuad(tb) {
  const { ZB } = ROOM;
  tb.tquad([-1.22, 1.66, -ZB + 0.115], [1.22, 1.66, -ZB + 0.115], [1.22, 3.31, -ZB + 0.115], [-1.22, 3.31, -ZB + 0.115], 0, 0, 1, 1, [0, 2.4, -ZB - 1]);
}
// yan duvarlarda çerçeveli logo
function frameQuads(tb) {
  const { ZB, XS } = ROOM;
  for (const sd of [-1, 1]) {
    const x = sd * (XS - 0.06), z0 = -3.1, z1 = -1.7;
    if (sd < 0) tb.tquad([x, 2.0, z1], [x, 2.0, z0], [x, 3.4, z0], [x, 3.4, z1], 0, 0, 1, 1, [x - 1, 2.6, -2.4]);
    else tb.tquad([x, 2.0, z0], [x, 2.0, z1], [x, 3.4, z1], [x, 3.4, z0], 0, 0, 1, 1, [x + 1, 2.6, -2.4]);
  }
  void ZB;
}
function framesModel(mb) {
  const { XS } = ROOM;
  for (const sd of [-1, 1]) {
    const x = sd * (XS - 0.02);
    mb.rbox(x - 0.05, 1.9, -3.2, x + 0.05, 3.5, -1.6, 0.03, C('#c99a3e', -0.85), 2);
  }
}

// Şampiyon kupası: ceviz kaide, altın gövde, iki kulp (orijin kaidenin altı)
function trophyModel(mb) {
  const G = C('#f2c14e', -0.94), Gd = C('#c99a3e', -0.92), Wd = C('#3b2416', -0.5);
  mb.rbox(-0.085, 0, -0.085, 0.085, 0.05, 0.085, 0.012, Wd, 2);
  mb.rbox(-0.06, 0.05, -0.06, 0.06, 0.058, 0.06, 0.004, Gd, 1);
  mb.lathe(0, 0.058, 0, [[0, 0], [0.05, 0], [0.052, 0.006], [0.03, 0.02], [0.018, 0.05], [0.016, 0.085], [0.03, 0.095], [0.02, 0.105], [0.05, 0.115], [0.09, 0.15], [0.105, 0.2], [0.108, 0.245], [0.1, 0.25], [0.094, 0.24], [0, 0.205]], 32, (i) => (i === 6 ? Gd : G));
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; pts.push([s * (0.098 + Math.sin(a) * 0.055), 0.26 - (0.5 - 0.5 * Math.cos(a)) * 0.1, 0]); }
    for (let k = 0; k < pts.length - 1; k++) limb(mb, pts[k], pts[k + 1], [0.011, 0.011], G, 8);
  }
}

/* ============================ ses (masa oyunları ortak efektleri) ============================ */
/* ============================ parti arenası ============================
   Loş kafe odasının yerine: gökyüzünde süzülen, şeker renkli yuvarlak sahne. Zemin pastel şeritli, kenarında simit tampon;
   arkada şeritli sütunlu kemer + tabela, balonlar, dönen yıldızlar, flamalar; çevrede bulut denizi. */
const ARENA_R = 10.8;
const rgb2hsl = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-5) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
};
const ARENAS = {
  pembe: { fa: '#ff9dcb', fb: '#ffb8da', rug: '#18b3a7', rugB: '#fff3b0', edge: '#ffd23f', haze: '#ffe4f1', top: '#58c4ff', hor: '#ffd9ee' },
  gok: { fa: '#79cdfc', fb: '#9cdcff', rug: '#ff6f61', rugB: '#fff3b0', edge: '#ffd23f', haze: '#e2f5ff', top: '#3fb2ff', hor: '#d6f1ff' },
  nane: { fa: '#7fe3bd', fb: '#a4efd3', rug: '#8a5cf6', rugB: '#fff3b0', edge: '#ff6fae', haze: '#e3fbf1', top: '#58c4ff', hor: '#dcfff2' },
  lavanta: { fa: '#b6a3ff', fb: '#cbbeff', rug: '#ff5fa2', rugB: '#fff3b0', edge: '#ffd23f', haze: '#ece6ff', top: '#6aa8ff', hor: '#e9e2ff' },
  seftali: { fa: '#ffb78a', fb: '#ffcdab', rug: '#2f9ee6', rugB: '#fff3b0', edge: '#ff5fa2', haze: '#fff0e2', top: '#58c4ff', hor: '#ffe9d6' },
  limon: { fa: '#ffe07a', fb: '#ffeca2', rug: '#8a5cf6', rugB: '#ffffff', edge: '#ff6fae', haze: '#fffbe0', top: '#58c4ff', hor: '#fff6cc' },
};
const CANDY = ['#ff5fa2', '#ffd23f', '#4cc9f0', '#8a5cf6', '#5be3a9', '#ff8a3d'];
// ---- oyuna özel dünyalar: her masa oyununun kendi zemini, dekoru, gökyüzü, süzülen nesneleri ve ortam sesi vardır ----
// floor: rays | checker | rings | swirl | wedge | split   objs: kenar dekorları (çiftler hâlinde yerleşir)
// fl: balloon | heart | lantern | none   star: star | heart | moon | bolt | coin | planet | gem   night: gece gökyüzü (bulut yok)
const WORLDS = {
  hesap: { fa: '#ffd98a', fb: '#fff0c2', rug: '#a3262a', rugB: '#fff3b0', edge: '#e0a11b', haze: '#fff3d9', top: '#ff9d5c', hor: '#ffe2b0', K: ['#e0a11b', '#a3262a', '#ffffff', '#7a4a12', '#ffd23f', '#2b1810'], floor: 'wedge', objs: ['dice', 'gift', 'coins'], star: 'coin', amb: 'diner' },
  acs: { fa: '#3d5873', fb: '#4d6c8a', rug: '#162231', rugB: '#ffd23f', edge: '#ffd23f', haze: '#1c2c44', top: '#0b1430', hor: '#34507a', K: ['#ffd23f', '#22344c', '#e8eef5', '#101a28', '#ff5a4d', '#0a0f18'], floor: 'rings', objs: ['building', 'spot', 'building'], flags: false, fl: 'none', star: 'moon', night: true, amb: 'city+night' },
  dcs: { fa: '#a45cf0', fb: '#c283ff', rug: '#2a1050', rugB: '#ff5fa2', edge: '#ff5fa2', haze: '#3a1a66', top: '#190a3a', hor: '#7a2fb0', K: ['#ff5fa2', '#4cc9f0', '#ffd23f', '#8a5cf6', '#5be3a9', '#ff8a3d'], floor: 'swirl', objs: ['neon', 'gift', 'neon'], star: 'bolt', night: true, amb: 'diner' },
  kyp: { fa: '#79cdfc', fb: '#9cdcff', rug: '#ff6f61', rugB: '#fff3b0', edge: '#ffd23f', haze: '#e2f5ff', top: '#3fb2ff', hor: '#d6f1ff', K: CANDY, floor: 'rays', objs: ['block', 'block', 'gift'], star: 'star', amb: 'diner' },
  tdv: { fa: '#ff8f6b', fb: '#ffe9d6', rug: '#1d2b53', rugB: '#ffffff', edge: '#e63946', haze: '#ffe1cf', top: '#ff7b54', hor: '#ffd6a5', K: ['#e63946', '#1d2b53', '#ffffff', '#ffb703', '#457b9d', '#14213d'], floor: 'wedge', objs: ['spot', 'barrel', 'block'], star: 'bolt', amb: 'diner' },
  bms: { fa: '#4cc9f0', fb: '#ff9f5a', rug: '#ffffff', rugB: '#22223b', edge: '#22223b', haze: '#f1f6ff', top: '#58c4ff', hor: '#ffe9d6', K: ['#4cc9f0', '#ff9f5a', '#ffffff', '#22223b', '#3a86ff', '#fb5607'], floor: 'split', objs: ['column', 'block', 'column'], star: 'star', amb: 'diner' },
  bil: { fa: '#8fb8ff', fb: '#f4f8ff', rug: '#243b7a', rugB: '#ffd23f', edge: '#ffd23f', haze: '#eaf1ff', top: '#3f7cff', hor: '#d9e6ff', K: ['#243b7a', '#ffd23f', '#ffffff', '#c1121f', '#2a9d8f', '#f4a261'], floor: 'checker', objs: ['column', 'books', 'globe'], star: 'star', amb: 'diner' },
  vkl: { fa: '#6f9a66', fb: '#86b07a', rug: '#4a2c1a', rugB: '#d9b35a', edge: '#8d6e63', haze: '#ffe4f0', top: '#58c4ff', hor: '#ffd9ee', K: ['#7b2d8b', '#d9b35a', '#f1e9d2', '#3b2a4a', '#c1121f', '#1b1026'], floor: 'rings', objs: ['tower', 'pine', 'pine', 'tower'], flags: false, fl: 'lantern', star: 'moon', amb: 'fire+night' },
  anb: { fa: '#ffe2a0', fb: '#fff1c9', rug: '#00a6a6', rugB: '#ffffff', edge: '#ff7b54', haze: '#e6fbff', top: '#27b5ff', hor: '#c9f4ff', K: ['#ff7b54', '#00a6a6', '#ffffff', '#ffd23f', '#f15bb5', '#3a86ff'], floor: 'swirl', objs: ['palm', 'ball', 'palm'], star: 'star', amb: 'sea' },
  ssn: { fa: '#2a2a33', fb: '#ece4d2', rug: '#8c1c28', rugB: '#e2b552', edge: '#e2b552', haze: '#241a26', top: '#0d0a14', hor: '#4a2a3a', K: ['#c1121f', '#e2b552', '#f4f0e6', '#2a2a33', '#8c1c28', '#111111'], floor: 'checker', objs: ['spot', 'reel', 'spot'], flags: false, fl: 'none', star: 'star', night: true, amb: 'night' },
  emj: { fa: '#ffe066', fb: '#fff3a8', rug: '#f15bb5', rugB: '#ffffff', edge: '#9b5de5', haze: '#fff9d9', top: '#00bbf9', hor: '#d6fff6', K: ['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4', '#ff8a3d'], floor: 'swirl', objs: ['mushroom', 'ball', 'mushroom'], star: 'heart', amb: 'diner' },
  sbm: { fa: '#8d99ae', fb: '#a9b4c6', rug: '#2b2d42', rugB: '#ffd23f', edge: '#ffd23f', haze: '#d9cfc4', top: '#55606e', hor: '#ffb37a', K: ['#ffd23f', '#1b1b1e', '#d90429', '#2b2d42', '#ef8354', '#0d0d0f'], floor: 'rings', objs: ['barrel', 'crate', 'barrel'], flags: false, star: 'bolt', hazard: true, amb: 'alley' },
  idy: { fa: '#7b6cf6', fb: '#9a8dff', rug: '#1a1446', rugB: '#5be3a9', edge: '#5be3a9', haze: '#2a2060', top: '#0e0a2e', hor: '#5a3fb8', K: ['#5be3a9', '#b388ff', '#ffffff', '#ff5fa2', '#4cc9f0', '#1a1446'], floor: 'rings', objs: ['crystal', 'mushroom', 'crystal'], flags: false, fl: 'lantern', star: 'gem', night: true, amb: 'night' },
  rnk: { fa: '#2d2a55', fb: '#3a3670', rug: '#111126', rugB: '#00f5d4', edge: '#ff2e93', haze: '#221c4a', top: '#090720', hor: '#3d1c6e', K: ['#ff2e93', '#00f5d4', '#ffe600', '#3a86ff', '#8ac926', '#ff6d00'], floor: 'checker', multi: true, objs: ['neon', 'block', 'neon'], flags: false, star: 'bolt', night: true, amb: 'diner' },
  hfz: { fa: '#e63946', fb: '#3a86ff', fc: '#2fbf71', fd: '#ffbe0b', rug: '#14142b', rugB: '#ffffff', edge: '#ffffff', haze: '#161236', top: '#05051a', hor: '#2b1f66', K: ['#e63946', '#3a86ff', '#2fbf71', '#ffbe0b', '#ffffff', '#14142b'], floor: 'wedge', dim: 0.72, objs: ['crystal', 'neon', 'planetObj'], flags: false, fl: 'none', star: 'planet', night: true, amb: 'night' },
  uyt: { fa: '#ff9ebb', fb: '#ffc2d4', rug: '#d81b60', rugB: '#ffffff', edge: '#ffffff', haze: '#ffe5ee', top: '#ff8fab', hor: '#ffe5d9', K: ['#ff4d6d', '#ffffff', '#ff8fab', '#c9184a', '#ffd6e0', '#800f2f'], floor: 'swirl', objs: ['heartObj', 'gift', 'heartObj'], fl: 'heart', star: 'heart', amb: 'diner' },
  krl: { fa: '#e9c98f', fb: '#f5dcab', rug: '#b5651d', rugB: '#fff3b0', edge: '#c8553d', haze: '#ffeccc', top: '#2fa8ff', hor: '#ffe0a8', K: ['#c8553d', '#2a9d8f', '#fff3b0', '#588157', '#e9c46a', '#6b3e1e'], floor: 'rays', objs: ['cactus', 'column', 'cactus', 'rock'], flags: false, fl: 'none', star: 'star', amb: 'wind' },
  tus: { fa: '#c9a37a', fb: '#dcbb95', rug: '#3e5c76', rugB: '#f0c05a', edge: '#b87333', haze: '#f6ead8', top: '#6aa8ff', hor: '#f1e3c8', K: ['#b87333', '#3e5c76', '#f0c05a', '#748cab', '#d9d9d9', '#1d2d44'], floor: 'rings', objs: ['gear', 'pencil', 'gear', 'crate'], star: 'coin', amb: 'diner' },
  tkm: { fa: '#cfeeff', fb: '#f4fbff', rug: '#3a86ff', rugB: '#ffffff', edge: '#8ecae6', haze: '#eef9ff', top: '#5aa9e6', hor: '#e7f5ff', K: ['#3a86ff', '#ffffff', '#8ecae6', '#e63946', '#ffb703', '#023047'], floor: 'rings', objs: ['pineSnow', 'snowman', 'pineSnow', 'crystal'], flags: false, fl: 'none', star: 'gem', amb: 'wind' },
  hkr: { fa: '#58a56b', fb: '#e9f5db', rug: '#7f4f24', rugB: '#ffe8a3', edge: '#b08968', haze: '#eef7e6', top: '#58c4ff', hor: '#e6f7d9', K: ['#d62828', '#f4c430', '#1d3557', '#111111', '#ffffff', '#7f4f24'], floor: 'checker', objs: ['books', 'dice', 'pencil'], star: 'star', amb: 'diner' },
  dyg: { fa: '#d9dee6', fb: '#f6f7fa', rug: '#c1121f', rugB: '#ffffff', edge: '#1d3557', haze: '#eef2f8', top: '#4aa3ff', hor: '#dce9ff', K: ['#c1121f', '#1d3557', '#ffffff', '#2fbf71', '#457b9d', '#0d1b2a'], floor: 'rays', objs: ['building', 'column', 'building'], star: 'star', day: true, amb: 'city' },
  byr: { fa: '#48b8e8', fb: '#7fd0f2', rug: '#f4a261', rugB: '#ffffff', edge: '#ffffff', haze: '#e3f6ff', top: '#1e96fc', hor: '#cdeeff', K: ['#e63946', '#ffffff', '#2a9d8f', '#ffb703', '#3a86ff', '#264653'], floor: 'rings', objs: ['globe', 'palm', 'column', 'globe'], star: 'planet', amb: 'wind' },
  pry: { fa: '#22232b', fb: '#f2f2f2', rug: '#e63946', rugB: '#ffffff', edge: '#ffd23f', haze: '#ffe9d9', top: '#ff6b35', hor: '#ffd6a5', K: ['#e63946', '#ffd23f', '#ffffff', '#22232b', '#2fbf71', '#111111'], floor: 'checker', objs: ['neon', 'barrel', 'spot'], star: 'bolt', amb: 'city' },
  kav: { fa: '#6aaa64', fb: '#c9b458', rug: '#3a3a3c', rugB: '#ffffff', edge: '#ffffff', haze: '#f0f4e4', top: '#58c4ff', hor: '#e9f5d0', K: ['#6aaa64', '#c9b458', '#ffffff', '#787c7e', '#3a3a3c', '#121213'], floor: 'checker', objs: ['books', 'pencil', 'block'], star: 'star', amb: 'diner' },
  czt: { fa: '#fff7e6', fb: '#ffe9c2', rug: '#3a86ff', rugB: '#ffffff', edge: '#ff006e', haze: '#fff8ec', top: '#58c4ff', hor: '#fff0d9', K: ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#2fbf71', '#fb5607'], floor: 'swirl', multi: true, objs: ['pencil', 'paint', 'pencil', 'block'], star: 'star', amb: 'diner' },
};
// İşletmeye özel arena: zemin, halı ve süsler işletmenin renklerinde; kenarda dev yiyecekler döner
const ARENA_BRANDS = {
  'los-bravos': { fa: '#ffc48a', fb: '#ffd9ae', rug: '#b8380a', rugB: '#fff3d6', edge: '#ffde59', haze: '#fff0df', top: '#58c4ff', hor: '#ffe6cc', K: ['#f26a1b', '#ffde59', '#ffffff', '#a83206', '#ffb347', '#2b1810'] },
  'chicken-rice-crush': { fa: '#ffe08a', fb: '#ffecb0', rug: '#b31000', rugB: '#fff6d8', edge: '#ff8c00', haze: '#fff7de', top: '#58c4ff', hor: '#fff0c4', K: ['#e21d0b', '#ff8c00', '#ffffff', '#780a00', '#ffd23f', '#1c0a06'] },
  'fried-chiko': { fa: '#ffb9ad', fb: '#ffd2c9', rug: '#7a1c14', rugB: '#fff1d0', edge: '#ffcd46', haze: '#ffeeea', top: '#58c4ff', hor: '#ffe0d9', K: ['#d92a1c', '#ffcd46', '#ffffff', '#58120c', '#ff8a5c', '#260c08'] },
  springfield: { fa: '#f6d9a6', fb: '#fbe8c6', rug: '#6c1c28', rugB: '#fff0d0', edge: '#f4b240', haze: '#fff5e4', top: '#58c4ff', hor: '#ffeccc', K: ['#8e2436', '#f4b240', '#fff8ec', '#4e121c', '#e8843c', '#22080e'] },
  'durum-max': { fa: '#ffe07a', fb: '#ffeca2', rug: '#1c1810', rugB: '#facc38', edge: '#1c1810', haze: '#fffbe0', top: '#58c4ff', hor: '#fff6cc', K: ['#1c1810', '#facc38', '#ffffff', '#342c18', '#ffe07a', '#0e0c08'] },
  eliz: { fa: '#9fe0e6', fb: '#c8eff2', rug: '#0b8ea4', rugB: '#fff6e4', edge: '#ffcc66', haze: '#eefbfc', top: '#58c4ff', hor: '#dff6f8', K: ['#0c96ac', '#ffcc66', '#ffffff', '#5a2c14', '#f0352a', '#06505e'] },
};
function arenaOf(cfg, brand) {
  const W = WORLDS[cfg.world || cfg.tag] || WORLDS.kyp;
  const A = Object.assign({ floor: 'rays', objs: ['block'], flags: true, fl: 'balloon', star: 'star', night: false }, W);
  // işletme teması: dünyanın biçimi oyundan, renkleri işletmeden
  const AB = brand && (ARENA_BRANDS[brand.slug] || brand.arena); // panelden eklenen temalar renkleri temadan türetir
  if (AB) Object.assign(A, AB, { brand: true, night: false, fc: null, fd: null, multi: false, fl: A.fl === 'none' || A.fl === 'lantern' ? 'balloon' : A.fl });
  if (cfg.venue !== false && VENUES[cfg.world || cfg.tag]) { const V = VENUES[cfg.world || cfg.tag]; A.venue = V; if (V.sky) { A.top = V.sky[0]; A.hor = V.sky[1]; A.haze = V.sky[2]; } }
  return A;
}
// Zemin: merkezden yayılan pastel şeritler (iç ve dış halka yarım dilim kaydırılmış), beyaz çizgi, renkli bordür, simit tampon
function arenaFloorModel(mb, A) {
  const up = [0, 1, 0];
  const fa = C(A.fa, -0.28), fb = C(A.fb, -0.28), wh = C('#fffaf0', -0.28), ed = C(A.edge, -0.3), edD = shade(C(A.edge, 0), 0.72);
  const ring = (r0, r1, y, seg, colOf) => {
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * TAU, a1 = ((k + 1) / seg) * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      mb.quadN([c0 * r0, y, s0 * r0], [c0 * r1, y, s0 * r1], [c1 * r1, y, s1 * r1], [c1 * r0, y, s1 * r0], up, up, up, up, colOf(k));
    }
  };
  const N = 96, W = 4, R1 = ARENA_R - 1.55, Rm = 5.4, pat = A.floor || 'rays';
  const dim = A.dim || 1, pal = (A.multi ? A.K.slice(0, 6) : A.fc ? [A.fa, A.fb, A.fc, A.fd] : [A.fa, A.fb]).map((h) => shade(C(h, -0.28), dim));
  const P = (n) => pal[((n % pal.length) + pal.length) % pal.length];
  const bands = (n, colOf) => { for (let r = 0; r < n; r++) ring(r ? (R1 * r) / n : 0.001, (R1 * (r + 1)) / n, 0, N, (k) => colOf(r, k)); };
  if (pat === 'checker') bands(6, (r, k) => P(Math.floor(k / 6) + r));
  else if (pat === 'rings') bands(7, (r) => P(r));
  else if (pat === 'swirl') bands(10, (r, k) => P(Math.floor((k + r * 3) / 8)));
  else if (pat === 'wedge') bands(1, (r, k) => P(Math.floor(k / (pal.length > 2 ? 24 : 12))));
  else if (pat === 'split') bands(6, (r, k) => shade(k < N / 2 ? fa : fb, r % 2 ? 1 : 0.93));
  else {
    ring(0.001, Rm, 0, N, (k) => (Math.floor(k / W) % 2 ? fa : fb));
    ring(Rm, Rm + 0.16, 0, N, () => wh);
    ring(Rm + 0.16, R1, 0, N, (k) => (Math.floor(k / W) % 2 ? fb : fa));
  }
  const hz = A.hazard ? C('#1b1b1e', -0.3) : wh;
  ring(R1, R1 + 0.2, 0, N, () => wh);
  ring(R1 + 0.2, ARENA_R - 0.25, 0, N, (k) => (Math.floor(k / 2) % 2 ? ed : hz));
  ring(ARENA_R - 0.25, ARENA_R, 0, N, () => wh);
  mb.torusN(0, 0.02, 0, ARENA_R, 0.26, 0.26, 96, 8, ed, (a) => (Math.floor((a / TAU) * 48) % 2 ? C('#ffffff', -0.5) : C(A.edge, -0.5)));
  // sahnenin kalın gövdesi (yandan bakınca havada duran pasta gibi)
  mb.lathe(0, 0, 0, [[ARENA_R + 0.05, -0.1], [ARENA_R - 0.1, -0.9], [ARENA_R - 1.2, -1.7], [ARENA_R - 3.5, -2.2]], 64, (i) => (i < 2 ? edD : shade(fa, 0.8)));
}
function arenaRugModel(mb, R, A, accHex) {
  const base = hexRGB(A.rug), bd = hexRGB(A.rugB), ac = hexRGB(accHex);
  const bands = [[0, 0.78, base], [0.78, 0.8, bd], [0.8, 0.9, mix3(base, [1, 1, 1], 0.16)], [0.9, 0.92, bd], [0.92, 1.0, ac]];
  bands.forEach(([a, b, col]) => {
    mb.lathe(0, 0.006, 0, [[R * b, 0], [R * a, 0]], 72, (k, ang) => {
      const m = a > 0.79 && a < 0.9 ? (Math.sin(ang * 20) > 0 ? 1.12 : 0.94) : 1;
      return rgbA([Math.min(1, col[0] * m), Math.min(1, col[1] * m), Math.min(1, col[2] * m)], 0);
    });
  });
  // kenarda fisto (yarım daireler)
  for (let k = 0; k < 28; k++) { const a = (k / 28) * TAU; mb.disc(Math.cos(a) * R, 0.005, Math.sin(a) * R, R * 0.075, R * 0.075, 14, rgbA(ac, 0)); }
}
// Şeritli şeker sütun
function candyPole(mb, x, z, r, h, hexA, hexB = '#ffffff', bands = 8, ball = '#ffd23f') {
  for (let k = 0; k < bands; k++) mb.cyl(x, (h * k) / bands, z, r, (h * (k + 1)) / bands, r, 18, C(k % 2 ? hexB : hexA, -0.45), C(hexA, -0.45), '');
  mb.sphereS(x, h + r * 0.7, z, r * 1.25, r * 1.25, r * 1.25, C(ball, -0.6), 16, 10);
  mb.lathe(x, 0, z, [[r * 1.7, 0], [r * 1.7, 0.1], [r * 1.05, 0.2]], 18, C(hexA, -0.3), 'b');
}
// Sabit sahne süsleri: kemer + tabela çerçevesi, yan direkler, flamalar, yumuşak bloklar, afiş direkleri
function arenaPropsModel(mb, A, accHex, K = CANDY) {
  const Z = -7.7;
  candyPole(mb, -2.15, Z, 0.3, 3.3, K[0]);
  candyPole(mb, 2.15, Z, 0.3, 3.3, K[0]);
  // üst kiriş + sahne ampulleri
  mb.rbox(-2.7, 3.02, Z - 0.26, 2.7, 3.5, Z + 0.26, 0.2, C(K[3], -0.45), 3);
  for (let k = 0; k < 11; k++) mb.sphereS(-2.3 + k * 0.46, 3.26, Z + 0.28, 0.09, 0.09, 0.09, C(k % 2 ? '#fff6c2' : '#ffffff', 1), 10, 6);
  // tabela çerçevesi (doku ayrı çizilir): beyaz kalın çerçeve + renkli arka
  mb.rbox(-1.72, 0.46, Z - 0.1, 1.72, 2.82, Z - 0.02, 0.06, C('#ffffff', -0.4), 2);
  mb.rbox(-1.8, 0.38, Z - 0.16, 1.8, 2.9, Z - 0.08, 0.1, C(A.edge, -0.4), 2);
  for (const s of [-1, 1]) limb(mb, [s * 1.2, 2.86, Z - 0.08], [s * 1.2, 3.08, Z - 0.08], [0.03, 0.03], C('#ffffff', -0.5), 6);
  // yan direkler + flamalar (dünya istemiyorsa yok)
  const flags = (p0, p1, n, sag, off) => {
    const P = (t) => [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t) - Math.sin(t * Math.PI) * sag, lerp(p0[2], p1[2], t)];
    for (let k = 0; k < 24; k++) limb(mb, P(k / 24), P((k + 1) / 24), [0.012, 0.012], C('#ffffff', 0), 4);
    const dx = p1[0] - p0[0], dz = p1[2] - p0[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    for (let k = 0; k < n; k++) {
      const a = P((k + 0.18) / n), b = P((k + 0.82) / n), c = P((k + 0.5) / n);
      const col = C(K[(k + off) % K.length], 0), nn = [nx, 0.2, nz];
      mb.triN(a, b, [c[0], c[1] - 0.42, c[2]], nn, nn, nn, col);
    }
  };
  // kenar yuvaları: [x, z, ölçek, dönüş] — simetrik çiftler
  const slots = [[-4.7, -7.5, 1.2, 0.3], [4.7, -7.5, 1.2, -0.3], [-7.9, -4.3, 1.1, 0.6], [7.9, -4.3, 1.1, -0.6], [-3.6, -8.6, 0.8, -0.4], [3.6, -8.6, 0.8, 0.4]];
  if (A.flags !== false) {
    [[-6.4, -5.9], [6.4, -5.9]].forEach(([x, z], i) => candyPole(mb, x, z, 0.2, 3.5, i ? K[2] : K[4], '#ffffff', 9));
    flags([-2.15, 3.55, Z], [-6.4, 3.75, -5.9], 9, 0.55, 0);
    flags([2.15, 3.55, Z], [6.4, 3.75, -5.9], 9, 0.55, 3);
    flags([-6.4, 3.75, -5.9], [-9.2, 3.2, -1.2], 8, 0.5, 1);
    flags([6.4, 3.75, -5.9], [9.2, 3.2, -1.2], 8, 0.5, 4);
    candyPole(mb, -9.2, -1.2, 0.18, 2.95, K[1], '#ffffff', 8, K[0]);
    candyPole(mb, 9.2, -1.2, 0.18, 2.95, K[1], '#ffffff', 8, K[0]);
  } else slots.push([-6.3, -6.2, 1.15, 0.45], [6.3, -6.2, 1.15, -0.45], [-9.2, -1.4, 0.95, 1.0], [9.2, -1.4, 0.95, -1.0]);
  const objs = A.objs && A.objs.length ? A.objs : ['block'];
  slots.forEach(([x, z, sc, ry], i) => {
    const fn = DECOR[objs[(i >> 1) % objs.length]] || DECOR.block;
    mb.push().T(x, 0, z, ry, 0, 0, sc, sc, sc); fn(mb, K, (i >> 1) + (i % 2 ? 2 : 0)); mb.pop();
  });
  // yan afişlerin direkleri ve çerçeveleri (logo dokusu ayrı)
  for (const s of [-1, 1]) {
    const x = s * (ROOM.XS - 0.06);
    for (const z of [-3.2, -1.6]) limb(mb, [x, 0, z], [x, 3.55, z], [0.05, 0.05], C('#ffffff', -0.5), 8);
    mb.rbox(x - 0.04, 1.9, -3.2, x + 0.04, 3.5, -1.6, 0.03, C(accHex, -0.4), 2);
    for (const z of [-3.2, -1.6]) mb.sphereS(x, 3.62, z, 0.09, 0.09, 0.09, C(K[1], -0.6), 10, 6);
  }
}
// ---- dekor nesneleri: yerde (0,0,0), yaklaşık 1 birim taban; K = dünyanın renk takımı, i = sıra ----
const DECOR = {
  block(mb, K, i) { mb.rbox(-0.5, 0, -0.5, 0.5, 1, 0.5, 0.16, C(K[i % K.length], -0.35), 3); if (i % 2 === 0) { mb.push().T(0.05, 1, 0, 0.7); mb.rbox(-0.29, 0, -0.29, 0.29, 0.58, 0.29, 0.1, C(K[(i + 1) % K.length], -0.35), 3); mb.pop(); } },
  ball(mb, K, i) { mb.sphereS(0, 0.55, 0, 0.55, 0.55, 0.55, C('#ffffff', -0.55), 18, 12); for (let k = 0; k < 3; k++) { mb.push().T(0, 0.55, 0, (k / 3) * Math.PI, Math.PI / 2); mb.torusN(0, 0, 0, 0.5, 0.075, 0.075, 22, 6, C(K[(i + k) % K.length], -0.5)); mb.pop(); } },
  gift(mb, K, i) { const a = C(K[i % K.length], -0.3), r = C(K[(i + 2) % K.length] === K[i % K.length] ? '#ffffff' : K[(i + 2) % K.length], -0.5); mb.rbox(-0.45, 0, -0.45, 0.45, 0.8, 0.45, 0.05, a, 2); mb.rbox(-0.48, 0.7, -0.48, 0.48, 0.92, 0.48, 0.05, shade(a, 0.86), 2); mb.rbox(-0.09, 0, -0.49, 0.09, 0.94, 0.49, 0.02, r, 1); mb.rbox(-0.49, 0, -0.09, 0.49, 0.94, 0.09, 0.02, r, 1); for (const s of [-1, 1]) mb.sphereS(s * 0.15, 1.02, 0, 0.16, 0.1, 0.09, r, 10, 6); },
  dice(mb, K, i) { const W = C('#fffdf6', -0.5), D = C(K[1] || '#c1121f', -0.4); mb.push().T(0, 0, 0, 0.5 + i); mb.rbox(-0.45, 0, -0.45, 0.45, 0.9, 0.45, 0.14, W, 3); [[0, 0], [-0.22, -0.22], [0.22, 0.22]].forEach(([x, z]) => mb.sphereS(x, 0.9, z, 0.08, 0.025, 0.08, D, 8, 4)); [[-0.2, 0.25], [0.2, 0.65], [-0.2, 0.65], [0.2, 0.25]].forEach(([x, y]) => mb.sphereS(x, y, 0.45, 0.08, 0.08, 0.025, D, 8, 4)); mb.pop(); },
  coins(mb, K) { const G = C('#ffcf3a', -0.8), Gd = C('#d99a12', -0.6); [[0, 0, 7], [0.5, 0.3, 4], [-0.45, 0.35, 5], [0.1, -0.5, 3]].forEach(([x, z, n]) => { for (let k = 0; k < n; k++) mb.cyl(x + Math.sin(k * 2.1) * 0.03, k * 0.085, z + Math.cos(k * 1.7) * 0.03, 0.26, k * 0.085 + 0.07, 0.26, 16, Gd, G); }); },
  column(mb, K) { const W = C('#fbf7ee', -0.3), Wd = C('#e6dfd0', -0.2); mb.rbox(-0.42, 0, -0.42, 0.42, 0.2, 0.42, 0.04, Wd, 2); mb.cyl(0, 0.2, 0, 0.3, 2.5, 0.26, 16, W, W, ''); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; limb(mb, [Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3], [Math.cos(a) * 0.26, 2.5, Math.sin(a) * 0.26], [0.035, 0.03], Wd, 5); } mb.rbox(-0.4, 2.5, -0.4, 0.4, 2.72, 0.4, 0.05, W, 2); mb.torusN(0, 2.5, 0, 0.3, 0.07, 0.07, 16, 6, C(K[1] || '#ffd23f', -0.6)); },
  books(mb, K, i) { let y = 0; for (let k = 0; k < 4; k++) { const h = 0.22 + (k % 2) * 0.06, w = 0.62 - k * 0.05; mb.push().T(0, y, 0, (k * 0.5 + i) % 1.2 - 0.4); mb.rbox(-w, 0, -0.42, w, h, 0.42, 0.03, C(K[(k + i) % K.length], -0.3), 2); mb.rbox(-w + 0.04, 0.03, -0.44, w + 0.02, h - 0.03, 0.4, 0.01, C('#fffdf2', 0), 1); mb.pop(); y += h; } },
  pencil(mb, K, i) { const Y = C(K[i % K.length], -0.4); mb.cyl(0, 0.3, 0, 0.2, 2.2, 0.2, 6, Y, Y, ''); mb.cyl(0, 2.2, 0, 0.2, 2.62, 0.05, 6, C('#f1d3a1', 0), C('#f1d3a1', 0), ''); mb.cyl(0, 2.62, 0, 0.05, 2.76, 0.004, 6, C('#2b2b2b', 0), C('#2b2b2b', 0), ''); mb.cyl(0, 0.12, 0, 0.21, 0.3, 0.21, 12, C('#c9ccd1', -0.8), C('#c9ccd1', -0.8), ''); mb.cyl(0, 0, 0, 0.2, 0.12, 0.2, 12, C('#ff8fab', -0.3), C('#ff8fab', -0.3)); },
  paint(mb, K, i) { const col = K[i % K.length]; mb.cyl(0, 0, 0, 0.42, 0.75, 0.46, 16, C('#d9dce1', -0.8), C('#d9dce1', -0.8), 'b'); mb.disc(0, 0.7, 0, 0.44, 0.44, 16, C(col, -0.7)); mb.torusN(0, 0.75, 0, 0.46, 0.035, 0.035, 18, 6, C('#f1f3f5', -0.8)); mb.sphereS(0.42, 0.45, 0.1, 0.1, 0.3, 0.1, C(col, -0.7), 8, 6); mb.sphereS(0.75, 0.012, 0.25, 0.4, 0.012, 0.3, C(col, -0.7), 12, 4); },
  palm(mb, K, i) { const T = C('#a9744a', -0.1), Td = C('#8a5a36', -0.1), G = C('#2fb36a', -0.25), Gd = C('#1f8f52', -0.25); let p = [0, 0, 0]; for (let k = 0; k < 7; k++) { const q = [0.07 * (k + 1) * (k + 1) / 7, (k + 1) * 0.42, 0]; limb(mb, p, q, [0.17 - k * 0.012, 0.16 - k * 0.012], k % 2 ? T : Td, 8); p = q; } for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + i, c = Math.cos(a), s = Math.sin(a), m = [p[0] + c * 0.75, p[1] + 0.22, p[2] + s * 0.75], e = [p[0] + c * 1.5, p[1] - 0.45, p[2] + s * 1.5], n = [-s * 0.26, 0, c * 0.26], col = k % 2 ? G : Gd, up = [0, 1, 0]; mb.triN(p, [m[0] + n[0], m[1], m[2] + n[2]], [m[0] - n[0], m[1], m[2] - n[2]], up, up, up, col); mb.triN([m[0] + n[0], m[1], m[2] + n[2]], e, [m[0] - n[0], m[1], m[2] - n[2]], up, up, up, col); mb.triN(p, [m[0] - n[0], m[1], m[2] - n[2]], [m[0] + n[0], m[1], m[2] + n[2]], up, up, up, col); mb.triN([m[0] - n[0], m[1], m[2] - n[2]], e, [m[0] + n[0], m[1], m[2] + n[2]], up, up, up, col); } for (let k = 0; k < 3; k++) mb.sphereS(p[0] + Math.cos(k * 2.1) * 0.16, p[1] - 0.12, p[2] + Math.sin(k * 2.1) * 0.16, 0.12, 0.12, 0.12, C('#6b3e1e', -0.3), 8, 6); },
  pine(mb, K, i, snow) { mb.cyl(0, 0, 0, 0.14, 0.6, 0.12, 8, C('#7a4a26', 0), C('#7a4a26', 0), ''); for (let k = 0; k < 3; k++) { const y = 0.45 + k * 0.72, r = 0.85 - k * 0.2; mb.cyl(0, y, 0, r, y + 1.0, 0.02, 12, C(k % 2 ? '#2f8f5b' : '#257a4c', -0.1), C('#1e6a40', 0), 'b'); if (snow) mb.cyl(0, y + 0.52, 0, r * 0.5, y + 1.02, 0.02, 12, C('#ffffff', -0.3), C('#ffffff', 0), ''); } },
  pineSnow(mb, K, i) { DECOR.pine(mb, K, i, true); },
  snowman(mb, K) { const W = C('#ffffff', -0.3); mb.sphereS(0, 0.42, 0, 0.5, 0.45, 0.5, W, 16, 10); mb.sphereS(0, 1.05, 0, 0.36, 0.34, 0.36, W, 16, 10); mb.sphereS(0, 1.55, 0, 0.26, 0.26, 0.26, W, 14, 9); mb.cyl(0, 1.56, 0.24, 0.05, 1.56, 0.05, 6, W, W, ''); limb(mb, [0, 1.56, 0.24], [0, 1.54, 0.5], [0.05, 0.005], C('#ff8a3d', 0), 6); for (const s of [-1, 1]) mb.sphereS(s * 0.1, 1.63, 0.23, 0.03, 0.03, 0.02, C('#1b1b1e', 0), 6, 4); mb.torusN(0, 1.34, 0, 0.27, 0.07, 0.06, 14, 6, C(K[3] || '#e63946', -0.2)); mb.cyl(0, 1.76, 0, 0.3, 1.8, 0.3, 14, C('#1b1b1e', -0.3), C('#1b1b1e', -0.3)); mb.cyl(0, 1.8, 0, 0.19, 2.1, 0.19, 14, C('#1b1b1e', -0.3), C('#1b1b1e', -0.3)); for (const s of [-1, 1]) limb(mb, [s * 0.3, 1.1, 0], [s * 0.75, 1.4, 0.05], [0.025, 0.018], C('#6b3e1e', 0), 5); },
  tower(mb, K) { const St = C('#b9b3c2', -0.05), Sd = C('#8f889c', -0.05); mb.cyl(0, 0, 0, 0.62, 2.5, 0.55, 14, St, St, ''); for (let k = 0; k < 4; k++) mb.torusN(0, 0.5 + k * 0.6, 0, 0.6 - k * 0.015, 0.025, 0.025, 14, 4, Sd); mb.cyl(0, 2.5, 0, 0.7, 2.75, 0.7, 14, Sd, Sd); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; mb.push().T(Math.cos(a) * 0.62, 2.75, Math.sin(a) * 0.62, -a); mb.rbox(-0.1, 0, -0.13, 0.1, 0.24, 0.13, 0.02, St, 1); mb.pop(); } mb.cyl(0, 2.75, 0, 0.56, 3.9, 0.02, 14, C(K[0], -0.3), C(K[0], 0), 'b'); mb.sphereS(0, 3.92, 0, 0.07, 0.07, 0.07, C(K[1], -0.8), 8, 5); mb.rbox(-0.13, 1.5, 0.52, 0.13, 1.95, 0.6, 0.05, C('#ffd76a', 1), 2); mb.rbox(-0.16, 0, 0.55, 0.16, 0.6, 0.63, 0.08, C('#4a2c1a', 0), 2); },
  building(mb, K, i) { const h = 3.2 + (i % 3) * 0.9, w = 0.75, B = C(i % 2 ? '#2b3a55' : '#34466a', -0.2); mb.rbox(-w, 0, -0.55, w, h, 0.55, 0.03, B, 1); mb.rbox(-w - 0.05, h, -0.6, w + 0.05, h + 0.12, 0.6, 0.02, shade(B, 0.75), 1); for (let r = 0; r < Math.floor(h / 0.5) - 1; r++) for (let c = 0; c < 4; c++) { const lit = (r * 7 + c * 3 + i * 5) % 5 !== 0; mb.rbox(-w + 0.17 + c * 0.39 - 0.12, 0.45 + r * 0.5, 0.55, -w + 0.17 + c * 0.39 + 0.12, 0.75 + r * 0.5, 0.57, 0.01, lit ? C(c % 2 ? '#ffe9a8' : '#ffd76a', 1) : C('#18233a', -0.6), 1); } limb(mb, [0.3, h + 0.1, 0], [0.3, h + 0.75, 0], [0.02, 0.01], C('#c9ccd1', -0.5), 5); mb.sphereS(0.3, h + 0.78, 0, 0.04, 0.04, 0.04, C('#ff3b30', 1), 6, 4); },
  spot(mb, K, i) { const M = C('#2b2b33', -0.6); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [0, 1.5, 0], [0.035, 0.03], M, 6); } limb(mb, [0, 1.5, 0], [0, 2.1, 0], [0.04, 0.04], M, 6); mb.push().T(0, 2.25, 0, 0, -0.5); mb.cyl(0, -0.28, 0, 0.2, 0.28, 0.34, 14, M, M); mb.disc(0, 0.285, 0, 0.3, 0.3, 14, C('#fff3c4', 1)); mb.pop(); mb.sphereS(0, 2.25, 0, 0.1, 0.1, 0.1, C(K[0], -0.6), 8, 5); },
  reel(mb, K) { const M = C('#2b2b33', -0.7), S = C('#c9ccd1', -0.8); mb.cyl(0, 0, 0, 0.75, 0.16, 0.75, 20, M, M); mb.cyl(0, 0.16, 0, 0.55, 0.5, 0.55, 20, C('#5a4632', -0.5), C('#5a4632', -0.5), ''); mb.cyl(0, 0.5, 0, 0.75, 0.66, 0.75, 20, M, M); for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; mb.cyl(Math.cos(a) * 0.42, 0.66, Math.sin(a) * 0.42, 0.15, 0.67, 0.15, 10, S, S); } mb.cyl(0, 0.66, 0, 0.09, 0.72, 0.09, 8, S, S); mb.push().T(0.95, 0, 0.5, 0.5); mb.rbox(-0.45, 0, -0.04, 0.45, 0.6, 0.04, 0.02, C('#1b1b1e', -0.5), 1); for (let k = 0; k < 5; k++) mb.rbox(-0.43 + k * 0.18, 0.6, -0.045, -0.34 + k * 0.18, 0.74, 0.045, 0.005, C(k % 2 ? '#1b1b1e' : '#ffffff', -0.4), 1); mb.pop(); },
  neon(mb, K, i) { const a = K[i % K.length], b = K[(i + 1) % K.length]; mb.cyl(0, 0, 0, 0.3, 0.2, 0.26, 14, C('#1b1b2e', -0.6), C('#1b1b2e', -0.6)); mb.cyl(0, 0.2, 0, 0.09, 3.3, 0.09, 10, C('#24243a', -0.6), C('#24243a', -0.6), ''); for (let k = 0; k < 6; k++) mb.torusN(0, 0.55 + k * 0.5, 0, 0.26 - (k % 2) * 0.06, 0.045, 0.045, 18, 6, C(k % 2 ? b : a, 1)); mb.sphereS(0, 3.45, 0, 0.2, 0.2, 0.2, C(a, 1), 12, 8); },
  crystal(mb, K, i) { [[0, 0, 0.34, 2.3, 0], [0.42, 0.15, 0.22, 1.4, 0.35], [-0.38, 0.2, 0.2, 1.1, -0.4], [0.1, -0.42, 0.16, 0.8, 0.2]].forEach(([x, z, r, h, tilt], k) => { const col = C(K[(i + k) % 3], k % 2 ? 0.5 : -0.9); mb.push().T(x, 0, z, k * 1.3, tilt * 0.6, tilt * 0.4); mb.cyl(0, 0, 0, r * 0.8, h * 0.72, r, 6, col, col, ''); mb.cyl(0, h * 0.72, 0, r, h, 0.01, 6, col, col, ''); mb.pop(); }); },
  mushroom(mb, K, i) { const cap = C(K[i % K.length], -0.5); mb.lathe(0, 0, 0, [[0.3, 0], [0.2, 0.5], [0.17, 1.2], [0.24, 1.45]], 14, C('#fff5e1', -0.2)); mb.sphereS(0, 1.42, 0, 0.9, 0.6, 0.9, cap, 20, 10); mb.cyl(0, 1.3, 0, 0.82, 1.42, 0.88, 20, C('#fff5e1', 0), C('#f3e3c3', 0), 'b'); for (let k = 0; k < 7; k++) { const a = k * 2.4, r = 0.25 + (k % 3) * 0.22, y = 1.42 + Math.sqrt(Math.max(0, 1 - (r / 0.9) ** 2)) * 0.6; mb.sphereS(Math.cos(a) * r, y - 0.02, Math.sin(a) * r, 0.11, 0.05, 0.11, C('#ffffff', -0.3), 8, 4); } },
  cactus(mb, K, i) { const G = C('#3f9b5b', -0.15), Gd = C('#2f7f49', -0.15); limb(mb, [0, 0, 0], [0, 2.1, 0], [0.3, 0.26], G, 12); mb.sphereS(0, 2.1, 0, 0.26, 0.24, 0.26, G, 12, 8); for (const s of [-1, 1]) { const y = s > 0 ? 1.0 : 0.7, top = s > 0 ? 1.75 : 1.35; limb(mb, [s * 0.2, y, 0], [s * 0.62, y, 0], [0.15, 0.15], Gd, 10); limb(mb, [s * 0.62, y - 0.02, 0], [s * 0.62, top, 0], [0.16, 0.14], G, 10); mb.sphereS(s * 0.62, top, 0, 0.14, 0.13, 0.14, G, 10, 6); } mb.sphereS(0.05, 2.34, 0.05, 0.11, 0.07, 0.11, C(K[0], -0.3), 8, 5); },
  rock(mb) { [[0, 0.3, 0, 0.6, 0.4, 0.5], [0.5, 0.2, 0.2, 0.35, 0.26, 0.3], [-0.45, 0.16, -0.15, 0.3, 0.2, 0.28]].forEach(([x, y, z, a, b, c], k) => mb.superS(x, y, z, a, b, c, 0.55, 0.6, C(k % 2 ? '#a89984' : '#928374', 0), 10, 6)); },
  barrel(mb, K, i) { const R = C(K[2] || '#d90429', -0.4); mb.lathe(0, 0, 0, [[0.4, 0], [0.47, 0.3], [0.48, 0.65], [0.47, 1.0], [0.4, 1.3]], 16, R, 'tb'); for (const y of [0.22, 1.08]) mb.torusN(0, y, 0, 0.46, 0.03, 0.03, 16, 5, C('#2b2d42', -0.6)); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; mb.push().T(Math.cos(a) * 0.485, 0.5, Math.sin(a) * 0.485, -a + Math.PI / 2); mb.rbox(-0.09, 0, -0.01, 0.09, 0.3, 0.01, 0.005, C(k % 2 ? '#1b1b1e' : '#ffd23f', 0), 1); mb.pop(); } if (i % 2 === 0) { limb(mb, [0, 1.3, 0], [0.12, 1.6, 0.05], [0.02, 0.015], C('#3a3a3c', 0), 5); mb.sphereS(0.13, 1.63, 0.05, 0.06, 0.06, 0.06, C('#ffb703', 1), 8, 5); } },
  crate(mb, K, i) { const Wd = C('#b08455', -0.05), Wk = C('#8a6238', -0.05); mb.push().T(0, 0, 0, 0.3 * i); mb.rbox(-0.5, 0, -0.5, 0.5, 1, 0.5, 0.02, Wd, 1); for (const [a, b] of [[-0.52, -0.38], [0.38, 0.52]]) { mb.rbox(a, 0, -0.52, b, 1.02, 0.52, 0.01, Wk, 1); mb.rbox(-0.52, 0, a, 0.52, 1.02, b, 0.01, Wk, 1); } mb.rbox(-0.3, 0.3, 0.5, 0.3, 0.7, 0.53, 0.02, C(K[0], 0), 1); mb.pop(); },
  gear(mb, K, i) { const Br = C(K[0], -0.8), St = C(K[4] || '#d9d9d9', -0.8); mb.cyl(0, 0, 0, 0.16, 1.1, 0.13, 10, C('#3a3a3c', -0.5), C('#3a3a3c', -0.5), ''); [[1.1, 0.72, Br, 12], [1.42, 0.45, St, 9]].forEach(([y, r, col, n], g) => { mb.cyl(0, y, 0, r, y + 0.2, r, 24, col, col); for (let k = 0; k < n; k++) { const a = (k / n) * TAU + g * 0.2; mb.push().T(Math.cos(a) * (r + 0.07), y, Math.sin(a) * (r + 0.07), -a); mb.rbox(-0.1, 0.01, -0.09, 0.1, 0.19, 0.09, 0.02, col, 1); mb.pop(); } mb.cyl(0, y + 0.2, 0, r * 0.3, y + 0.26, r * 0.3, 12, shade(col, 0.7), shade(col, 0.7)); }); },
  globe(mb, K, i) { mb.cyl(0, 0, 0, 0.42, 0.1, 0.38, 16, C('#7f4f24', -0.4), C('#7f4f24', -0.4)); mb.cyl(0, 0.1, 0, 0.07, 0.5, 0.06, 8, C('#d9a441', -0.8), C('#d9a441', -0.8), ''); mb.sphereS(0, 1.2, 0, 0.72, 0.72, 0.72, C('#2f8fe0', -0.7), 22, 14); [[0.3, 0.35, 0.5, 0.3, 0.26], [-0.45, 0.1, 0.4, 0.28, 0.34], [0.1, -0.3, -0.6, 0.34, 0.22], [-0.2, 0.45, -0.45, 0.24, 0.2], [0.55, -0.15, 0.1, 0.2, 0.3], [-0.6, -0.25, -0.1, 0.18, 0.2]].forEach(([x, y, z, a, b]) => { const l = Math.hypot(x, y, z), k = 0.66 / l; mb.sphereS(x * k, 1.2 + y * k, z * k, a, b, a, C('#58b368', -0.2), 10, 6); }); mb.torusN(0, 1.2, 0, 0.8, 0.03, 0.03, 24, 5, C('#d9a441', -0.8)); },
  planetObj(mb, K, i) { mb.cyl(0, 0, 0, 0.07, 1.2, 0.05, 8, C('#c9ccd1', -0.8), C('#c9ccd1', -0.8), ''); mb.sphereS(0, 1.6, 0, 0.55, 0.55, 0.55, C(K[i % 4], -0.6), 18, 12); mb.torusN(0, 1.6, 0, 0.85, 0.16, 0.025, 28, 4, C('#fff3b0', 0.5)); },
  heartObj(mb, K, i) { mb.cyl(0, 0, 0, 0.3, 0.12, 0.26, 12, C('#ffffff', -0.5), C('#ffffff', -0.5)); mb.cyl(0, 0.12, 0, 0.05, 1.0, 0.05, 8, C('#ffffff', -0.5), C('#ffffff', -0.5), ''); mb.push().T(0, 0.95, 0, 0, 0, 0, 1.25, 1.25, 1.25); heartShape(mb, C(K[i % 2 ? 3 : 0], -0.7)); mb.pop(); },
  candy(mb, K, i) { candyPole(mb, 0, 0, 0.2, 3.2, K[i % K.length], '#ffffff', 8, K[(i + 1) % K.length]); },
};
// Kalp: (0,0,0) alt ucu, yaklaşık 1 birim yüksek
function heartShape(mb, col) {
  mb.push().T(0, 0, 0, 0, 0, 0, 1, 1, 0.55);
  for (const s of [-1, 1]) mb.sphereS(s * 0.23, 0.68, 0, 0.3, 0.3, 0.3, col, 16, 10);
  mb.cyl(0, 0, 0, 0.01, 0.62, 0.5, 20, col, col, '');
  mb.pop();
}
// Dönen simge modelleri (yıldızın yerine): merkez (0,0,0), yaklaşık 0,6 yarıçap
const SPINNERS = {
  heart(mb) { mb.push().T(0, -0.55, 0, 0, 0, 0, 1.15, 1.15, 1.15); heartShape(mb, C('#ff4d6d', -0.7)); mb.pop(); },
  moon(mb) { mb.sphereS(0, 0, 0, 0.6, 0.6, 0.6, C('#fff6d0', 0.5), 22, 14); [[0.2, 0.25, 0.5, 0.14], [-0.25, -0.1, 0.52, 0.1], [0.1, -0.3, 0.5, 0.08], [-0.3, 0.3, -0.42, 0.12], [0.35, 0, -0.48, 0.1]].forEach(([x, y, z, r]) => mb.sphereS(x, y, z, r, r, r * 0.4, C('#e2d6a8', 0.4), 10, 5)); },
  bolt(mb) { const Y = C('#ffe600', 0.5), P = [[0.1, 0.7], [-0.32, -0.05], [-0.04, -0.05], [-0.14, -0.7], [0.34, 0.12], [0.06, 0.12], [0.3, 0.7]]; for (const z of [-0.09, 0.09]) { const n = [0, 0, z > 0 ? 1 : -1]; for (const [a, b, c] of [[0, 1, 5], [0, 5, 6], [1, 2, 5], [2, 4, 5], [2, 3, 4]]) mb.triN([P[a][0], P[a][1], z], [P[b][0], P[b][1], z], [P[c][0], P[c][1], z], n, n, n, Y); } for (let k = 0; k < 7; k++) { const a = P[k], b = P[(k + 1) % 7], e = vnorm([b[1] - a[1], a[0] - b[0], 0]); mb.quadN([a[0], a[1], -0.09], [b[0], b[1], -0.09], [b[0], b[1], 0.09], [a[0], a[1], 0.09], e, e, e, e, C('#ffb703', 0.5)); } },
  coin(mb) { mb.push().T(0, 0, 0, 0, Math.PI / 2); mb.cyl(0, -0.07, 0, 0.6, 0.07, 0.6, 28, C('#d99a12', -0.8), C('#ffcf3a', -0.9)); mb.torusN(0, 0.07, 0, 0.5, 0.04, 0.02, 24, 5, C('#d99a12', -0.8)); mb.torusN(0, -0.07, 0, 0.5, 0.04, 0.02, 24, 5, C('#d99a12', -0.8)); mb.pop(); },
  planet(mb) { mb.sphereS(0, 0, 0, 0.5, 0.5, 0.5, C('#ff9f5a', -0.5), 20, 12); mb.sphereS(0.1, 0.18, 0.4, 0.2, 0.08, 0.12, C('#ffd6a5', -0.3), 8, 5); mb.push().T(0, 0, 0, 0, 0.4, 0.2); mb.torusN(0, 0, 0, 0.82, 0.17, 0.02, 30, 4, C('#fff3b0', 0.5)); mb.pop(); },
  gem(mb) { const col = C('#7df9ff', 0.5), c2 = C('#4cc9f0', -0.9); mb.cyl(0, 0.05, 0, 0.55, 0.3, 0.32, 8, col, col, 't'); mb.cyl(0, -0.65, 0, 0.01, 0.05, 0.55, 8, c2, c2, ''); },
};
function lanternModel(mb) {
  mb.sphereS(0, 1, 0, 0.16, 0.2, 0.16, C('#ffffff', 0.5), 14, 10);
  for (const y of [0.8, 1.2]) mb.cyl(0, y - 0.02, 0, 0.09, y + 0.02, 0.09, 10, C('#3a2a1a', 0), C('#3a2a1a', 0));
  limb(mb, [0, 0.52, 0], [0, 0.8, 0], [0.006, 0.006], C('#ffd76a', 0), 4);
  limb(mb, [0, 1.22, 0], [0, 1.32, 0], [0.004, 0.004], C('#3a2a1a', 0), 4);
}
function heartBalloonModel(mb) {
  mb.push().T(0, 0.78, 0, 0, 0, 0, 0.42, 0.42, 0.42); heartShape(mb, C('#ffffff', -0.7)); mb.pop();
  limb(mb, [0, 0, 0], [0, 0.79, 0], [0.004, 0.004], C('#f4f4f4', 0), 4);
}
// Balon: ipi yerde (0,0,0), balon tepede (0,1,0). Beyaz; renk çizimde verilir.
function balloonModel(mb) {
  mb.sphereS(0, 1, 0, 0.17, 0.205, 0.17, C('#ffffff', -0.7), 18, 12);
  mb.lathe(0, 0.78, 0, [[0.012, 0], [0.03, 0.02], [0.012, 0.03]], 8, C('#ffffff', -0.5));
  limb(mb, [0, 0, 0], [0, 0.79, 0], [0.004, 0.004], C('#f4f4f4', 0), 4);
}
function cloudModel(mb) {
  const W = C('#ffffff', 0);
  [[0, 0, 0, 1, 0.62, 0.8], [0.85, -0.08, 0.1, 0.72, 0.5, 0.62], [-0.9, -0.1, -0.05, 0.68, 0.46, 0.6], [0.3, 0.3, -0.1, 0.62, 0.48, 0.55], [-0.38, 0.22, 0.12, 0.56, 0.42, 0.5], [1.45, -0.2, 0, 0.42, 0.3, 0.4], [-1.45, -0.22, 0.05, 0.4, 0.28, 0.38]]
    .forEach(([x, y, z, rx, ry, rz]) => mb.sphereS(x, y, z, rx, ry, rz, W, 14, 9));
}
function starModel(mb) {
  const Y = C('#ffd23f', -0.55), Yd = C('#ffb703', -0.55), n = 5, R0 = 0.62, R1 = 0.27, t = 0.13;
  const P = (k, z) => { const a = (k / (n * 2)) * TAU + Math.PI / 2, r = k % 2 ? R1 : R0; return [Math.cos(a) * r, Math.sin(a) * r, z]; };
  for (let k = 0; k < n * 2; k++) {
    const a = P(k, 0), b = P(k + 1, 0);
    for (const s of [-1, 1]) { const nn = [0, 0, s]; mb.triN([0, 0, s * t * 1.7], [a[0], a[1], s * t * 0.3], [b[0], b[1], s * t * 0.3], nn, vnorm([a[0], a[1], s * 2]), vnorm([b[0], b[1], s * 2]), k % 2 ? Y : Yd); }
    const en = vnorm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]);
    mb.quadN([a[0], a[1], -t * 0.3], [b[0], b[1], -t * 0.3], [b[0], b[1], t * 0.3], [a[0], a[1], t * 0.3], en, en, en, en, Yd);
  }
}
const ARENA_BALLOONS = [[-3.3, -8.3, 2.3, 0], [-3.0, -8.5, 1.8, 1], [-3.65, -8.55, 2.7, 2], [-2.9, -8.1, 1.45, 4], [3.3, -8.3, 2.3, 3], [3.0, -8.5, 1.8, 5], [3.65, -8.55, 2.7, 1], [2.9, -8.1, 1.45, 2],
  [-8.3, -3.1, 2.4, 3], [-8.6, -3.4, 1.9, 0], [8.3, -3.1, 2.4, 4], [8.6, -3.4, 1.9, 2], [-6.9, -6.6, 2.1, 5], [6.9, -6.6, 2.1, 0]];
const ARENA_CLOUDS = [[-15, -1.6, -14, 3.2], [-4, -2.6, -19, 4.2], [9, -1.2, -17, 3.4], [19, -2.2, -9, 3.8], [-20, -2.8, -4, 4.4], [15, -3, 4, 3.6], [-14, -3.2, 6, 3.4], [1, -0.4, -26, 5], [-11, 0.8, -24, 3.6], [13, 1.2, -25, 3.8], [24, -1, -18, 4.4], [-25, -0.6, -15, 4.6]];
// Tabela: parlak, yuvarlak köşeli oyun tabelası
function drawSign(cv, title, sub, brand, A, logo, dy = 0) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#fffdf5'); gr.addColorStop(1, '#fff0c9');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // köşelerde konfeti
  for (let i = 0; i < 46; i++) {
    const x = hs(i, 3) * W, y = hs(i, 7) * H;
    if (x > W * 0.14 && x < W * 0.86 && y > H * 0.16 && y < H * 0.84) continue;
    g.save(); g.translate(x, y); g.rotate(hs(i, 11) * 6.28); g.fillStyle = CANDY[i % CANDY.length];
    if (i % 3) g.fillRect(-13, -6, 26, 12); else { g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); }
    g.restore();
  }
  const F = "'Fredoka','Bricolage Grotesque','Arial Rounded MT Bold','Trebuchet MS',system-ui,sans-serif";
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const K = A.K || CANDY;
  let lw = 0;
  if (logo && logo.width) {
    // işletme logosu solda, beyaz çerçeveli
    const lh = H * 0.62, r = Math.min(lh / logo.height, (W * 0.34) / logo.width); lw = logo.width * r;
    const x = W * 0.06, y = (H - logo.height * r) / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 18; g.shadowOffsetY = 8; g.drawImage(logo, x, y, lw, logo.height * r); g.restore();
    lw += W * 0.05;
  }
  const cx = W / 2 + lw / 2, aw = W - lw;
  let fs = lw ? 118 : 150;
  g.font = `700 ${fs}px ${F}`;
  const tw = g.measureText(title).width;
  if (tw > aw * 0.84) fs = Math.max(56, Math.floor((fs * aw * 0.84) / tw));
  g.font = `700 ${fs}px ${F}`;
  const ty = (sub ? H * 0.4 : H * 0.46) + dy * H;
  g.lineJoin = 'round';
  g.fillStyle = A.edge; g.fillText(title, cx + 7, ty + 9);
  g.strokeStyle = '#1c1633'; g.lineWidth = 16; g.strokeText(title, cx, ty);
  
  g.fillStyle = K[0]; g.fillText(title, cx, ty);
  if (sub) {
    g.font = `600 52px ${F}`;
    const sw = Math.min(aw * 0.9, g.measureText(sub).width + 70), sy = H * (0.66 + dy * 0.72);
    g.fillStyle = '#1c1633';
    g.beginPath(); g.roundRect ? g.roundRect(cx - sw / 2, sy - 44, sw, 88, 44) : g.rect(cx - sw / 2, sy - 44, sw, 88); g.fill();
    g.fillStyle = '#fff6d8'; g.fillText(sub, cx, sy + 3, sw - 50);
  }
  g.font = `700 40px ${F}`; g.fillStyle = K[3];
  g.fillText(`★  ${brand}  ★`, cx, H * (0.88 + dy * 0.25), aw * 0.8);
}
// Loş salon ışığını gün ışığına çevir: oyunun kendi renk tonu korunur
function partyLight(L, o) {
  // parlaklık tavanı: zaten aydınlık ışık (Vampir Köylü gündüzü) patlamasın, karanlık ışık (gece) karanlık kalsın
  const ks = Math.min(1.2, 0.62 / Math.max(0.05, lum(L.sunC))), ka = Math.min(1.12, 0.37 / Math.max(0.05, lum(L.sky))), kg = Math.min(1.7, 0.32 / Math.max(0.03, lum(L.gnd)));
  for (let i = 0; i < 3; i++) { o.sunC[i] = L.sunC[i] * ks; o.sky[i] = L.sky[i] * ka; o.gnd[i] = L.gnd[i] * kg; o.lampC[i] = L.lampC[i] * 0.38; o.warm[i] = L.warm[i]; }
  o.night = L.night; o.fogR = L.fogR; o.stars = 0; o.glowS = 0.5;
  return o;
}

class MasaSnd extends Snd {
  constructor() { super(); this.musVol = 2.2; }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'tick': { // çark mandalı: kısa tahta-plastik tık (a: hız 0..1)
        const f = 1900 + Math.random() * 500;
        this.tone(f, t, 0.012, 'square', 0.04 + 0.05 * (1 - a), f * 0.7, 0.0008);
        this.noise(t, 0.016, 0.1 + 0.12 * (1 - a), { type: 'bandpass', freq: 2600 + Math.random() * 1200, q: 3, attack: 0.0006 });
        this.tone(420, t, 0.03, 'triangle', 0.05 * (1 - a), 300, 0.001);
        break;
      }
      case 'whoosh': this.noise(t, 0.45, 0.22, { type: 'bandpass', freq: 380, to: 2600, q: 0.9, attack: 0.08 }); this.noise(t + 0.1, 0.5, 0.12, { type: 'bandpass', freq: 2600, to: 600, q: 0.9, attack: 0.1 }); break;
      case 'ratchet': for (let i = 0; i < 6; i++) this.noise(t + i * 0.028, 0.012, 0.16, { type: 'bandpass', freq: 2400, q: 3 }); break;
      case 'drumroll': { // a: süre
        const d = a || 1.6, n = Math.floor(d / 0.032);
        for (let i = 0; i < n; i++) { const k = i / n; this.noise(t + i * 0.032 + Math.random() * 0.006, 0.05, 0.03 + 0.1 * k * k, { type: 'bandpass', freq: 1700 + 400 * k, q: 0.8 }); }
        break;
      }
      case 'cymbal': this.noise(t, 1.6, 0.22, { type: 'highpass', freq: 4200 }); this.noise(t, 0.6, 0.12, { type: 'bandpass', freq: 7000, q: 0.8 }); this.tone(96, t, 0.4, 'sine', 0.3, 50, 0.002); break;
      case 'tada':
        this.duck(0.25, 1.8);
        [[523, 0], [659, 0.09], [784, 0.18]].forEach(([f, d]) => { this.tone(f, t + d, 0.16, 'square', 0.07); this.tone(f * 2, t + d, 0.14, 'sine', 0.06); });
        [523, 659, 784, 1047].forEach((f) => { this.tone(f, t + 0.3, 1.1, 'sawtooth', 0.035); this.tone(f, t + 0.3, 1.2, 'triangle', 0.08); });
        break;
      case 'trombone': // hüzünlü trombon "vah vah vah vaaah"
        this.duck(0.15, 2.6);
        [[311, 0, 0.32], [294, 0.36, 0.32], [277, 0.72, 0.32], [262, 1.08, 1.0]].forEach(([f, d, L], i) => {
          const o = this.tone(f, t + d, L, 'sawtooth', 0.11, i === 3 ? f * 0.94 : null, 0.03);
          if (i === 3 && o) { try { const lfo = this.k.ctx.createOscillator(), lg = this.k.ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg).connect(o.frequency); lfo.start(t + d + 0.2); lfo.stop(t + d + L + 0.1); } catch { /* eski tarayıcı */ } }
          this.tone(f / 2, t + d, L, 'triangle', 0.06, null, 0.03);
        });
        break;
      case 'kaching': // yazar kasa
        this.noise(t, 0.05, 0.25, { type: 'bandpass', freq: 1200, q: 2 });
        this.tone(2093, t + 0.06, 0.5, 'sine', 0.12, null, 0.002); this.tone(2637, t + 0.06, 0.45, 'sine', 0.09, null, 0.002); this.tone(3136, t + 0.09, 0.4, 'sine', 0.06, null, 0.002);
        this.noise(t + 0.06, 0.3, 0.08, { type: 'highpass', freq: 6000 });
        break;
      case 'coins': for (let i = 0; i < 10; i++) { const f = 2400 + Math.random() * 2400; this.tone(f, t + i * 0.05 + Math.random() * 0.03, 0.12, 'sine', 0.04, f * 0.98, 0.001); } break;
      case 'cheer': this.cheer(t, a || 1.6); break;
      case 'laugh': // masada kahkaha
        for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) { const f = 260 + k * 70 + Math.random() * 40; this.tone(f, t + k * 0.08 + i * 0.13, 0.08, 'sawtooth', 0.025, f * 0.85, 0.01); this.noise(t + k * 0.08 + i * 0.13, 0.07, 0.04, { type: 'bandpass', freq: 900 + k * 300, q: 2 }); }
        break;
      case 'thud': this.tone(120, t, 0.16, 'sine', 0.32, 55, 0.002); this.noise(t, 0.08, 0.16, { freq: 600 }); break;
      case 'paper': this.noise(t, 0.25, 0.14, { type: 'bandpass', freq: 3200, to: 1500, q: 0.7, attack: 0.02 }); break;
      case 'slide': this.noise(t, 0.55, 0.12, { type: 'bandpass', freq: 900, to: 400, q: 1.1, attack: 0.04 }); break;
      case 'relief': [784, 988, 1175].forEach((f, i) => this.tone(f, t + i * 0.08, 0.4, 'sine', 0.08)); break;
      case 'pop': this.tone(600, t, 0.08, 'sine', 0.16, 1200, 0.002); break;
      case 'ding': this.tone(1568, t, 0.6, 'sine', 0.12, null, 0.002); this.tone(3136, t, 0.3, 'sine', 0.04, null, 0.002); break;
      case 'beep': this.tone(880, t, 0.12, 'square', 0.08); break;
      case 'go': this.duck(0.3, 0.9); this.tone(1320, t, 0.4, 'square', 0.12); this.tone(1980, t, 0.4, 'sine', 0.07); break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ arayüz (masa oyunları) ============================ */
const STYLE_M = `
#ky.mz{background:#120c0a;touch-action:manipulation}
#ky.mz canvas.mz-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
#ky.mz .hud{z-index:6}
#ky.mz .msg{z-index:7}
#ky.mz .panel{z-index:9}
#ky.mz .lbls{z-index:3}
#ky.mz .lbl.me{background:rgba(255,210,63,.94);color:#1c1633;border-color:#1c1633}
#ky.mz .lbl.hot{background:#fff;color:#1c1633;border-color:var(--lc,#ffd23f);box-shadow:0 0 0 3px var(--lc,#ffd23f),0 0 18px var(--lc,#ffd23f)}
#ky.mz .lbl.dim{opacity:.5}
#ky.mz .lbl.off{opacity:.45;filter:grayscale(1)}
#ky.mz .lbl em{font-style:normal;font-size:11px}
#ky.mz .mz-top{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);font-weight:800;font-size:13px;background:rgba(12,10,26,.6);border:2px solid rgba(255,255,255,.35);border-radius:99px;padding:3px 12px;white-space:nowrap;pointer-events:none;z-index:4;transition:opacity .4s}
#ky.mz .mz-top:empty{display:none}
#ky.mz .mz-feed{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 92px);display:grid;gap:4px;pointer-events:none;max-width:70%;z-index:4}
#ky.mz .mz-feed div{font-weight:700;font-size:13px;background:rgba(12,10,26,.66);color:#fff;border-radius:10px;padding:3px 9px;width:max-content;max-width:100%;animation:mzf 4.2s ease-out forwards}
@keyframes mzf{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
#ky.mz .mz-bar{position:absolute;left:0;right:0;bottom:0;padding:0 calc(env(safe-area-inset-right,0px) + 14px) calc(env(safe-area-inset-bottom,0px) + 16px) calc(env(safe-area-inset-left,0px) + 14px);display:flex;flex-direction:column;align-items:center;gap:9px;z-index:5;pointer-events:none}
#ky.mz .mz-bar>*{pointer-events:auto}
#ky.mz .mz-bar .mz-say{pointer-events:none}
#ky.mz .mz-say{display:inline-block;font-weight:800;font-size:16px;color:#fff;background:rgba(12,10,26,.66);border-radius:99px;padding:7px 16px;max-width:92%;text-align:center}
#ky.mz .mz-say.me{background:#d4321c;animation:mzs .45s ease-in-out infinite alternate;box-shadow:0 0 0 3px rgba(255,255,255,.25),0 8px 30px rgba(212,50,28,.6)}
@keyframes mzs{to{transform:scale(1.06)}}
#ky.mz .mz-btn{min-width:min(330px,86vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:var(--lim);color:var(--ink);font-weight:800;font-size:21px;padding:13px 18px;line-height:1.1;-webkit-tap-highlight-color:transparent;transition:transform .08s}
#ky.mz .mz-btn small{display:block;font-size:12px;font-weight:700;opacity:.7;margin-top:2px}
#ky.mz .mz-btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
#ky.mz .mz-btn[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.mz .mz-btn.alt{background:#fff}
#ky.mz .mz-btn.pulse{animation:mzp 1.1s ease-in-out infinite}
@keyframes mzp{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
#ky.mz .mz-seg{display:flex;gap:6px;background:rgba(12,10,26,.55);border:2px solid rgba(255,255,255,.3);border-radius:99px;padding:4px}
#ky.mz .mz-seg button{border:0;border-radius:99px;padding:6px 12px;font-weight:800;font-size:13px;background:transparent;color:#fff;-webkit-tap-highlight-color:transparent}
#ky.mz .mz-seg button.on{background:var(--lim);color:var(--ink)}
#ky.mz .mz-row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
#ky.mz .card .row2{display:flex;gap:8px;margin-top:10px}
#ky.mz .card .row2 .kb{margin-top:0}
#ky.mz .card .hist{margin-top:10px;font-size:13px;font-weight:700;opacity:.75;line-height:1.35}
#ky.mz .big-n{font-size:40px;font-weight:900;line-height:1.02;margin-top:4px;word-break:break-word}
#ky.mz .quip{margin-top:8px;font-size:17px;font-weight:700;line-height:1.3}
@media (orientation:landscape) and (max-height:520px){
#ky.mz .mz-bar{align-items:flex-end;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 10px)}
#ky.mz .mz-btn{min-width:0;font-size:18px;padding:10px 16px}
#ky.mz .mz-top{left:auto;right:calc(env(safe-area-inset-right,0px) + 12px);transform:none;top:calc(env(safe-area-inset-top,0px) + 54px)}
#ky.mz .big-n{font-size:30px}
}
#ky.mz.flat canvas.mz-cv{background:#1d1412}
`;
function injectStyleM(extra = '', id = 'mz') {
  if (!document.getElementById('mz-style')) {
    const st = document.createElement('style');
    st.id = 'mz-style';
    st.textContent = STYLE_M;
    document.head.appendChild(st);
  }
  if (extra && !document.getElementById(`mz-style-${id}`)) {
    const st = document.createElement('style');
    st.id = `mz-style-${id}`;
    st.textContent = extra;
    document.head.appendChild(st);
  }
}

/* ============================ oyun kabuğu ============================ */
// Gece restoranı ışığı: masanın üstünde sıcak sarkıt lamba (nokta ışık), soluk ay ışığı (gölge yönü), sıcak ortam
const NIGHT_IN = { sunC: [0.46, 0.44, 0.5], sky: [0.4, 0.36, 0.38], gnd: [0.21, 0.17, 0.15], night: 1, warm: [1, 0.82, 0.55], lampC: [1.42, 1.16, 0.86], fogR: [30, 90], stars: 0, glowS: 0.3 };
/*mekan*/
/* ============================ mekânlar: her masa oyununun kendi yeri ============================
   Kamera masaya yukarıdan baktığı için en çok zemin ve masanın çevresi görünür. Yerleşim kuralı:
   arka (z < -6) uzun parçalar ve tabela, yanlar (|x| > 5.5) orta boy, ön (z > 4) yalnız alçak şeyler; masa çevresi (r < 4.4) boş.
   Her mekân: zemin + çevre (tek durağan ağ), masa biçimi, sandalye biçimi (oyuncu rengi minder/kumaş ayrı), yer örtüsü,
   ışık, gök/sis rengi, uçuşan parçacıklar ve dönen parçalar (dönme dolap, disko topu, vantilatör...). */
const UPV = [0, 1, 0];
const VK = {
  quad(mb, x0, z0, x1, z1, col, y = 0) { mb.quadN([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], UPV, UPV, UPV, UPV, col); },
  // gürültülü zemin: köşe renkleri gürültüyle karışır (kum, çim, kar, toprak)
  noise(mb, x0, z0, x1, z1, st, hexA, hexB, sc = 0.35, e = 0, y = 0) {
    const a = hexRGB(hexA), b = hexRGB(hexB);
    const col = (x, z) => { const t = clamp(vn(x * sc + 31, z * sc + 17) * 0.7 + vn(x * sc * 3.1 + 7, z * sc * 3.1 + 3) * 0.3, 0, 1); return rgbA(mix3(a, b, t), e); };
    for (let x = x0; x < x1 - 1e-6; x += st) for (let z = z0; z < z1 - 1e-6; z += st) {
      const xa = x, xb = Math.min(x + st, x1), za = z, zb = Math.min(z + st, z1);
      mb.quadN([xa, y, za], [xa, y, zb], [xb, y, zb], [xb, y, za], UPV, UPV, UPV, UPV, col(xa, za), col(xa, zb), col(xb, zb), col(xb, za));
    }
  },
  // duvara yapışık ön yüz dörtgeni (z+ bakar): karo, tuğla, afiş için ucuz yüz
  fq(mb, x0, y0, x1, y1, z, col) { const n = [0, 0, 1]; mb.quadN([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, n, n, n, col); },
  // açık hava zemini: yakında gürültülü desen, uzakta düz renk (sis zaten örter)
  ground(mb, hexA, hexB, sc = 0.3, st = 1.4) { VK.quad(mb, -220, -220, 220, 220, rgbA(mix3(hexRGB(hexA), hexRGB(hexB), 0.5), 0), -0.02); VK.noise(mb, -26, -28, 26, 16, st, hexA, hexB, sc, 0, -0.01); },
  // tahta döşeme: ax yönünde uzanan, rastgele boylu, aralarında koyu derz olan tahtalar
  planks(mb, x0, z0, x1, z1, w, hexes, ax = 'x', e = -0.08, y = 0, gap = '#3a2716') {
    VK.quad(mb, x0, z0, x1, z1, C(gap, 0), y);
    const A0 = ax === 'x' ? z0 : x0, A1 = ax === 'x' ? z1 : x1, L0 = ax === 'x' ? x0 : z0, L1 = ax === 'x' ? x1 : z1;
    let r = 0;
    for (let a = A0; a < A1 - 1e-6; a += w, r++) {
      let l = L0 - hs(r, 3) * 1.6;
      let k = 0;
      while (l < L1) {
        const len = 1.3 + hs(r, k + 9) * 1.5, la = Math.max(l, L0), lb = Math.min(l + len, L1);
        if (lb - la > 0.05) {
          const col = C(hexes[Math.floor(hs(r * 7 + k, 5) * hexes.length)], e);
          if (ax === 'x') VK.quad(mb, la + 0.012, a + 0.012, lb - 0.012, Math.min(a + w, A1) - 0.012, col, y + 0.002);
          else VK.quad(mb, a + 0.012, la + 0.012, Math.min(a + w, A1) - 0.012, lb - 0.012, col, y + 0.002);
        }
        l += len; k++;
      }
    }
  },
  // kare karo: derz rengi altta, karolar üstte; ab: iki renk dama ya da rastgele
  tiles(mb, x0, z0, x1, z1, s, hexA, hexB, grout, e = -0.2, y = 0, rnd = false) {
    VK.quad(mb, x0, z0, x1, z1, C(grout, 0), y);
    let i = 0;
    for (let x = x0; x < x1 - 1e-6; x += s, i++) { let j = 0; for (let z = z0; z < z1 - 1e-6; z += s, j++) {
      const odd = rnd ? hs(i, j) > 0.5 : (i + j) % 2;
      VK.quad(mb, x + 0.025, z + 0.025, Math.min(x + s, x1) - 0.025, Math.min(z + s, z1) - 0.025, C(odd ? hexB : hexA, e), y + 0.002);
    } }
  },
  // harlequin: 45° dönük kareler (iki iç içe kafes), dikdörtgene sığmayanlar çizilmez (altta koyu derz)
  harlequin(mb, x0, z0, x1, z1, d, hexA, hexB, base = '#2b2522', e = -0.35, y = 0) {
    VK.quad(mb, x0, z0, x1, z1, C(base, 0), y);
    const g = 0.022, A = C(hexA, e), B = C(hexB, e);
    for (const off of [0, 1]) for (let i = Math.floor(x0 / (2 * d)) - 1; i <= Math.ceil(x1 / (2 * d)) + 1; i++) for (let j = Math.floor(z0 / (2 * d)) - 1; j <= Math.ceil(z1 / (2 * d)) + 1; j++) {
      const cx = i * 2 * d + off * d, cz = j * 2 * d + off * d;
      if (cx - d < x0 - 1e-6 || cx + d > x1 + 1e-6 || cz - d < z0 - 1e-6 || cz + d > z1 + 1e-6) continue;
      mb.quadN([cx - d + g, y + 0.002, cz], [cx, y + 0.002, cz + d - g], [cx + d - g, y + 0.002, cz], [cx, y + 0.002, cz - d + g], UPV, UPV, UPV, UPV, off ? B : A);
    }
  },
  // balıksırtı (şevron) parke: W genişliğinde sütunlar, her sütunda 45° eğik tahtalar, sütunlar ters yönde
  chevron(mb, x0, z0, x1, z1, W, p, hexes, e = -0.1, y = 0, gap = '#2a1a10') {
    VK.quad(mb, x0, z0, x1, z1, C(gap, 0), y);
    let c = 0;
    for (let xa = x0; xa < x1 - 1e-6; xa += W, c++) {
      const xb = Math.min(xa + W, x1), dz = (c % 2 ? 1 : -1) * (xb - xa), g = 0.014;
      let k = 0;
      for (let za = z0 - W; za < z1; za += p, k++) {
        const zA0 = Math.max(z0, za), zA1 = Math.min(z1, za + p - g), zB0 = Math.max(z0, za + dz), zB1 = Math.min(z1, za + dz + p - g);
        if (zA1 <= zA0 || zB1 <= zB0) continue;
        mb.quadN([xa + g, y + 0.002, zA0], [xa + g, y + 0.002, zA1], [xb - g, y + 0.002, zB1], [xb - g, y + 0.002, zB0], UPV, UPV, UPV, UPV, C(hexes[Math.floor(hs(c * 31 + k, 4) * hexes.length)], e));
      }
    }
  },
  // ışıklı dans pisti: karelerin bir kısmı renkli yanar, kalanı koyu
  ledFloor(mb, x0, z0, x1, z1, s, cols, dark = '#1c1428', prob = 0.42, y = 0) {
    VK.quad(mb, x0, z0, x1, z1, C('#0b0812', 0), y);
    let i = 0;
    for (let x = x0; x < x1 - 1e-6; x += s, i++) { let j = 0; for (let z = z0; z < z1 - 1e-6; z += s, j++) {
      const on = hs(i * 7 + 3, j * 5 + 1) < prob, col = on ? C(cols[(i * 3 + j * 5) % cols.length], 0.95) : C(dark, -0.6);
      VK.quad(mb, x + 0.035, z + 0.035, Math.min(x + s, x1) - 0.035, Math.min(z + s, z1) - 0.035, col, y + 0.002);
    } }
  },
  // halı / paspas: düz renk + kenar şeridi
  carpet(mb, x0, z0, x1, z1, hex, bord, bw = 0.25, y = 0.004, e = 0) {
    VK.quad(mb, x0, z0, x1, z1, C(bord, e), y);
    VK.quad(mb, x0 + bw, z0 + bw, x1 - bw, z1 - bw, C(hex, e), y + 0.002);
  },
  // duvar parçası (kalın kutu), taban süpürgeliği ve üst pervaz
  wall(mb, x0, z0, x1, z1, h, hex, o = {}) {
    mb.box(x0, 0, z0, x1, h, z1, C(hex, o.e ?? 0));
    if (o.base) mb.box(x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, o.bh || 0.22, z1 + 0.03, C(o.base, 0));
    if (o.top) mb.box(x0 - 0.05, h - 0.14, z0 - 0.05, x1 + 0.05, h, z1 + 0.05, C(o.top, 0));
    if (o.band) mb.box(x0 - 0.015, o.band[0], z0 - 0.015, x1 + 0.015, o.band[1], z1 + 0.015, C(o.band[2], 0));
    if (o.dado) mb.box(x0 - 0.02, 0, z0 - 0.02, x1 + 0.02, o.dado[0], z1 + 0.02, C(o.dado[1], 0));
  },
  // pencere (duvara gömülü, nz: yüzün baktığı z yönü ya da nx): çerçeve, cam (gece yanar), ortada kayıt
  win(mb, cx, cy, w, h, wz, s, frame, glass, ax = 'z') {
    const F = C(frame, 0), G = glass;
    if (ax === 'z') {
      mb.box(cx - w / 2 - 0.08, cy - h / 2 - 0.08, wz, cx + w / 2 + 0.08, cy + h / 2 + 0.08, wz + s * 0.06, F);
      mb.box(cx - w / 2, cy - h / 2, wz + s * 0.06, cx + w / 2, cy + h / 2, wz + s * 0.07, G);
      mb.box(cx - 0.03, cy - h / 2, wz + s * 0.07, cx + 0.03, cy + h / 2, wz + s * 0.09, F);
      mb.box(cx - w / 2, cy - 0.03, wz + s * 0.07, cx + w / 2, cy + 0.03, wz + s * 0.09, F);
      mb.box(cx - w / 2 - 0.12, cy - h / 2 - 0.12, wz, cx + w / 2 + 0.12, cy - h / 2 - 0.06, wz + s * 0.16, F);
    } else {
      mb.box(wz, cy - h / 2 - 0.08, cx - w / 2 - 0.08, wz + s * 0.06, cy + h / 2 + 0.08, cx + w / 2 + 0.08, F);
      mb.box(wz + s * 0.06, cy - h / 2, cx - w / 2, wz + s * 0.07, cy + h / 2, cx + w / 2, G);
      mb.box(wz + s * 0.07, cy - h / 2, cx - 0.03, wz + s * 0.09, cy + h / 2, cx + 0.03, F);
      mb.box(wz + s * 0.07, cy - 0.03, cx - w / 2, wz + s * 0.09, cy + 0.03, cx + w / 2, F);
      mb.box(wz, cy - h / 2 - 0.12, cx - w / 2 - 0.12, wz + s * 0.16, cy - h / 2 - 0.06, cx + w / 2 + 0.12, F);
    }
  },
  // tabela çerçevesi (doku z=-7.69'da): wall duvar çerçevesi, stand iki ayaklı pano, screen ekran çerçevesi, chalk tahta çerçeve, neon ışıklı kenar, bulb ampullü pano
  sign(mb, kind, hex, hex2) {
    const Z = -7.7, x0 = -1.74, x1 = 1.74, y0 = 0.44, y1 = 2.84;
    if (kind === 'stand') { for (const s of [-1, 1]) mb.box(s * 1.5 - 0.07, 0, Z - 0.16, s * 1.5 + 0.07, y1 + 0.2, Z - 0.02, C(hex, 0)); }
    if (kind === 'screen') { mb.rbox(x0 - 0.1, y0 - 0.1, Z - 0.2, x1 + 0.1, y1 + 0.1, Z - 0.03, 0.05, C('#15171c', -0.6), 2); mb.box(-0.3, 0, Z - 0.18, 0.3, y0 - 0.1, Z - 0.06, C('#2a2d35', -0.5)); return; }
    if (kind === 'neon') { mb.rbox(x0 - 0.06, y0 - 0.06, Z - 0.12, x1 + 0.06, y1 + 0.06, Z - 0.03, 0.04, C('#15121f', -0.5), 2); for (const [a0, b0, a1, b1] of [[x0 - 0.1, y1 + 0.04, x1 + 0.1, y1 + 0.1], [x0 - 0.1, y0 - 0.1, x1 + 0.1, y0 - 0.04], [x0 - 0.1, y0 - 0.1, x0 - 0.04, y1 + 0.1], [x1 + 0.04, y0 - 0.1, x1 + 0.1, y1 + 0.1]]) mb.box(a0, b0, Z - 0.02, a1, b1, Z + 0.02, C(hex, 1)); return; }
    mb.rbox(x0, y0, Z - 0.1, x1, y1, Z - 0.02, 0.05, C(hex2 || '#fff8ec', -0.3), 2);
    mb.rbox(x0 - 0.1, y0 - 0.1, Z - 0.16, x1 + 0.1, y1 + 0.1, Z - 0.08, 0.06, C(hex, kind === 'chalk' ? 0 : -0.3), 2);
    if (kind === 'chalk') mb.box(x0, y0 - 0.16, Z - 0.02, x1, y0 - 0.1, Z + 0.1, C(hex, 0));
    if (kind === 'bulb') for (let k = 0; k < 14; k++) { const t = k / 13; for (const yy of [y0 - 0.06, y1 + 0.06]) mb.sphereS(lerp(x0, x1, t), yy, Z - 0.01, 0.05, 0.05, 0.05, C(k % 2 ? '#fff1b8' : '#ffd76a', 1), 6, 4); }
  },
  // yan duvar afişleri (logo dokusu x=±8.34'te): duvarda çerçeve ya da direkli pano
  posters(mb, kind, hex) {
    for (const s of [-1, 1]) {
      const x = s * 8.36;
      if (kind === 'poles') { for (const z of [-3.25, -1.55]) mb.cyl(x + s * 0.06, 0, z, 0.05, 3.6, 0.05, 8, C(hex, -0.3), C(hex, -0.3)); }
      mb.rbox(x - 0.05 + s * 0.03, 1.92, -3.18, x + 0.05 + s * 0.03, 3.48, -1.62, 0.03, C(hex, -0.4), 2);
    }
  },
  // ip üstünde ampuller (p0'dan p1'e sarkan): kablo + ışıklı küreler
  bulbs(mb, p0, p1, n, sag, hexes, r = 0.06) {
    const P = (t) => [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t) - Math.sin(t * Math.PI) * sag, lerp(p0[2], p1[2], t)];
    for (let k = 0; k < 16; k++) limb(mb, P(k / 16), P((k + 1) / 16), [0.01, 0.01], C('#2b2b2b', 0), 3, null, 1);
    for (let k = 0; k < n; k++) { const q = P((k + 0.5) / n); mb.sphereS(q[0], q[1] - r, q[2], r, r * 1.2, r, C(hexes[k % hexes.length], 1), 6, 4); }
  },
  // flama dizisi
  flags(mb, p0, p1, n, sag, hexes) {
    const P = (t) => [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t) - Math.sin(t * Math.PI) * sag, lerp(p0[2], p1[2], t)];
    for (let k = 0; k < 16; k++) limb(mb, P(k / 16), P((k + 1) / 16), [0.01, 0.01], C('#f4f1ea', 0), 3, null, 1);
    const dx = p1[0] - p0[0], dz = p1[2] - p0[2], l = Math.hypot(dx, dz) || 1, nn = [-dz / l, 0.2, dx / l];
    for (let k = 0; k < n; k++) { const a = P((k + 0.15) / n), b = P((k + 0.85) / n), c = P((k + 0.5) / n); mb.triN(a, b, [c[0], c[1] - 0.36, c[2]], nn, nn, nn, C(hexes[k % hexes.length], 0)); }
  },
  // sokak lambası
  lampPost(mb, x, z, h, head, pole = '#2f3338') {
    const P = C(pole, -0.4);
    mb.cyl(x, 0, z, 0.12, 0.3, 0.1, 8, P, P); mb.cyl(x, 0.3, z, 0.06, h, 0.05, 8, P, P);
    mb.cyl(x, h, z, 0.05, h + 0.12, 0.2, 8, P, P, ''); mb.sphereS(x, h + 0.3, z, 0.2, 0.24, 0.2, C(head, 1), 10, 7); mb.cyl(x, h + 0.5, z, 0.22, h + 0.6, 0.05, 8, P, P);
  },
  // yuvarlak ağaç: gövde + üç top yaprak
  tree(mb, x, z, h, leaf, leaf2, trunk = '#6b4a2e') {
    limb(mb, [x, 0, z], [x + 0.1, h * 0.55, z], [0.18, 0.13], C(trunk, 0), 7);
    const L1 = C(leaf, 0), L2 = C(leaf2 || leaf, 0);
    mb.sphereS(x + 0.1, h * 0.72, z, h * 0.3, h * 0.26, h * 0.3, L1, 10, 7);
    mb.sphereS(x - h * 0.16, h * 0.6, z + 0.1, h * 0.2, h * 0.18, h * 0.2, L2, 8, 6);
    mb.sphereS(x + h * 0.22, h * 0.58, z - 0.05, h * 0.19, h * 0.17, h * 0.19, L2, 8, 6);
  },
  bush(mb, x, z, r, hex, hex2) { mb.sphereS(x, r * 0.55, z, r, r * 0.7, r, C(hex, 0), 9, 6); mb.sphereS(x + r * 0.6, r * 0.4, z + 0.1, r * 0.6, r * 0.5, r * 0.6, C(hex2 || hex, 0), 8, 5); },
  // saksı bitkisi
  plant(mb, x, z, s = 1, pot = '#c8693a', leaf = '#3f8f52') {
    mb.cyl(x, 0, z, 0.22 * s, 0.42 * s, 0.28 * s, 10, C(pot, 0), C(pot, 0));
    mb.cyl(x, 0.42 * s, z, 0.29 * s, 0.47 * s, 0.29 * s, 10, C(pot, 0), C('#4a3020', 0));
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + s, l = (0.5 + hs(k, s * 9) * 0.35) * s; limb(mb, [x, 0.45 * s, z], [x + Math.cos(a) * l * 0.55, 0.45 * s + l, z + Math.sin(a) * l * 0.55], [0.05 * s, 0.02 * s], C(k % 2 ? leaf : shade(C(leaf, 0), 0.8), 0), 4, null, 1); mb.sphereS(x + Math.cos(a) * l * 0.62, 0.45 * s + l * 1.02, z + Math.sin(a) * l * 0.62, 0.13 * s, 0.07 * s, 0.13 * s, C(leaf, 0), 6, 4); }
  },
  // kitaplık: raflar ve renkli kitaplar (yerel z+ öne bakar)
  shelf(mb, w, h, d, wood, books = ['#a3262a', '#1d3557', '#2a9d8f', '#e9c46a', '#6d597a', '#f4a261', '#264653']) {
    const W = C(wood, 0), Wd = shade(C(wood, 0), 0.72);
    mb.box(-w / 2, 0, -d / 2, w / 2, h, -d / 2 + 0.04, Wd);
    for (const s of [-1, 1]) mb.box(s * w / 2 - (s > 0 ? 0.05 : 0), 0, -d / 2, s * w / 2 + (s > 0 ? 0 : 0.05), h, d / 2, W);
    const n = Math.max(2, Math.round(h / 0.52));
    for (let r = 0; r <= n; r++) {
      const y = (r * (h - 0.05)) / n;
      mb.box(-w / 2, y, -d / 2, w / 2, y + 0.04, d / 2, W);
      if (r === n) break;
      let x = -w / 2 + 0.07, k = 0;
      while (x < w / 2 - 0.12) {
        const bw = 0.08 + hs(r * 13 + k, 2) * 0.07, bh = (h / n) * (0.62 + hs(r, k + 3) * 0.3), lean = hs(k, r) > 0.92 ? 0.25 : 0;
        if (x + bw > w / 2 - 0.06) break;
        mb.push().T(x + bw / 2, y + 0.04, 0, 0, 0, lean); mb.box(-bw / 2, 0, -d / 2 + 0.06, bw / 2, bh, d / 2 - 0.03, C(books[Math.floor(hs(r * 5 + k, 7) * books.length)], 0), 'bf'); mb.pop();
        x += bw + 0.006 + (lean ? 0.06 : 0); k++;
      }
    }
  },
  // tezgâh (yerel: ön yüz z+), üst parlak
  counter(mb, w, h, d, front, top) { mb.box(-w / 2, 0, -d / 2, w / 2, h - 0.06, d / 2, C(front, 0)); mb.box(-w / 2 - 0.05, h - 0.06, -d / 2 - 0.05, w / 2 + 0.05, h, d / 2 + 0.06, C(top, -0.6)); mb.box(-w / 2 + 0.04, 0, d / 2, w / 2 - 0.04, 0.12, d / 2 + 0.02, shade(C(front, 0), 0.6)); },
  // oyun salonu makinesi (yerel: ekran z+)
  arcade(mb, body, scr, k = 0) {
    const B = C(body, -0.3), D = C('#15151f', -0.4);
    mb.box(-0.36, 0, -0.32, 0.36, 1.85, 0.3, B);
    mb.box(-0.38, 0.9, 0.18, 0.38, 1.0, 0.46, D);
    mb.push().T(0, 1.32, 0.27, 0, -0.18); mb.box(-0.3, -0.24, -0.02, 0.3, 0.24, 0.02, C(scr, 1)); mb.pop();
    mb.box(-0.36, 1.62, 0.22, 0.36, 1.85, 0.32, C(scr, 0.9));
    mb.cyl(-0.15, 1.0, 0.33, 0.025, 1.12, 0.025, 6, D, D); mb.sphereS(-0.15, 1.13, 0.33, 0.045, 0.045, 0.045, C('#ff2e63', -0.6), 6, 4);
    for (let i = 0; i < 3; i++) mb.cyl(0.04 + i * 0.1, 1.0, 0.32, 0.03, 1.02, 0.03, 8, C(['#ffe600', '#00f5d4', '#ff2e93'][(i + k + 3) % 3], 0.9), C(['#ffe600', '#00f5d4', '#ff2e93'][(i + k + 3) % 3], 0.9));
  },
  // ışıklı ekran paneli (yerel: z+ yüz)
  screen(mb, w, h, hex, bez = '#14161b') { mb.rbox(-w / 2 - 0.08, -h / 2 - 0.08, -0.08, w / 2 + 0.08, h / 2 + 0.08, 0, 0.03, C(bez, -0.6), 2); mb.box(-w / 2, -h / 2, 0, w / 2, h / 2, 0.012, C(hex, 1)); },
  // sinema koltuğu sırası (yerel x boyunca, z+ öne)
  seatRow(mb, n, hex) {
    const R1 = C(hex, -0.15), Rd = shade(C(hex, 0), 0.7), M = C('#2b2b30', -0.4);
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.62;
      mb.rbox(x - 0.27, 0.3, -0.25, x + 0.27, 0.46, 0.22, 0.06, R1, 2);
      mb.rbox(x - 0.27, 0.42, -0.3, x + 0.27, 1.05, -0.16, 0.07, R1, 2);
      mb.box(x - 0.27, 0.95, -0.31, x + 0.27, 1.06, -0.15, Rd);
    }
    for (let k = 0; k <= n; k++) { const x = (k - n / 2) * 0.62; mb.box(x - 0.04, 0, -0.3, x + 0.04, 0.66, 0.2, M); }
  },
  // şemsiye (plaj): direk + dilimli kubbe
  umbrella(mb, hexA, hexB, h = 2.3, r = 1.25) {
    const P = C('#f2efe8', -0.3);
    mb.cyl(0, 0, 0, 0.035, h + 0.1, 0.03, 6, P, P);
    for (let k = 0; k < 8; k++) { const a0 = (k / 8) * TAU, a1 = ((k + 1) / 8) * TAU, col = C(k % 2 ? hexA : hexB, 0); mb.triN([0, h + 0.28, 0], [Math.cos(a0) * r, h - 0.12, Math.sin(a0) * r], [Math.cos(a1) * r, h - 0.12, Math.sin(a1) * r], UPV, vnorm([Math.cos(a0), 1.6, Math.sin(a0)]), vnorm([Math.cos(a1), 1.6, Math.sin(a1)]), col); }
    mb.sphereS(0, h + 0.3, 0, 0.05, 0.05, 0.05, P, 6, 4);
  },
  // çadır (yerel: giriş z+)
  tent(mb, w, d, h, hexA, hexB) {
    const A = C(hexA, 0), Bc = C(hexB, 0);
    for (const s of [-1, 1]) { const n = vnorm([s * h, w / 2, 0]); mb.quadN([s * w / 2, 0, -d / 2], [s * w / 2, 0, d / 2], [0, h, d / 2], [0, h, -d / 2], n, n, n, n, s < 0 ? A : Bc); }
    mb.triN([-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [0, h, -d / 2], [0, 0, -1], [0, 0, -1], [0, 0, -1], A);
    mb.triN([-w / 2, 0, d / 2], [-w * 0.12, 0, d / 2], [0, h, d / 2], [0, 0, 1], [0, 0, 1], [0, 0, 1], Bc);
    mb.triN([w * 0.12, 0, d / 2], [w / 2, 0, d / 2], [0, h, d / 2], [0, 0, 1], [0, 0, 1], [0, 0, 1], Bc);
    mb.triN([-w * 0.12, 0, d / 2 - 0.02], [w * 0.12, 0, d / 2 - 0.02], [0, h * 0.82, d / 2 - 0.02], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#2a2018', 0));
  },
  // kamp ateşi: taş halka, odunlar, ışıklı alevler
  fire(mb, s = 1) {
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; mb.sphereS(Math.cos(a) * 0.5 * s, 0.08 * s, Math.sin(a) * 0.5 * s, 0.14 * s, 0.1 * s, 0.12 * s, C(k % 2 ? '#7d7a76' : '#5f5c58', 0), 6, 4); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; limb(mb, [Math.cos(a) * 0.36 * s, 0.05 * s, Math.sin(a) * 0.36 * s], [-Math.cos(a) * 0.1 * s, 0.32 * s, -Math.sin(a) * 0.1 * s], [0.07 * s, 0.06 * s], C('#5b3a22', 0), 6); }
    mb.cyl(0, 0.1 * s, 0, 0.26 * s, 0.85 * s, 0.0, 7, C('#ff8a1f', 1), C('#ff8a1f', 1), '');
    mb.cyl(0.06 * s, 0.1 * s, 0.04 * s, 0.16 * s, 0.62 * s, 0.0, 6, C('#ffd25a', 1), C('#ffd25a', 1), '');
    mb.disc(0, 0.01, 0, 0.55 * s, 0.55 * s, 12, C('#3a2a1e', 0));
  },
  // ahşap çit (yerel x boyunca)
  fence(mb, len, h, hex) { const W = C(hex, 0); for (let x = -len / 2; x <= len / 2 + 1e-6; x += 1.1) mb.box(x - 0.05, 0, -0.05, x + 0.05, h, 0.05, W); for (const y of [h * 0.35, h * 0.8]) mb.box(-len / 2, y, -0.03, len / 2, y + 0.08, 0.03, W); },
  // ev (köy): duvar, beşik çatı, gece yanan pencereler, kapı (yerel: ön z+)
  house(mb, w, d, h, wallHex, roofHex, k = 0) {
    mb.box(-w / 2, 0, -d / 2, w / 2, h, d / 2, C(wallHex, 0));
    const ry = h + d * 0.45, R = C(roofHex, 0), oh = 0.25;
    for (const s of [-1, 1]) { const n = vnorm([0, d / 2 + oh, s * (ry - h)]); mb.quadN([-w / 2 - oh, h - 0.08, s * (d / 2 + oh)], [w / 2 + oh, h - 0.08, s * (d / 2 + oh)], [w / 2 + oh, ry, 0], [-w / 2 - oh, ry, 0], n, n, n, n, R); }
    for (const xe of [-w / 2, w / 2]) { const nn = [Math.sign(xe), 0, 0]; mb.triN([xe, h, -d / 2], [xe, ry - 0.04, 0], [xe, h, d / 2], nn, nn, nn, C(wallHex, 0)); }
    mb.box(-0.32, 0, d / 2, 0.32, 1.5, d / 2 + 0.05, C('#4a2e1c', 0));
    for (const x of [-w * 0.3, w * 0.3]) { const lit = hs(k, x) > 0.25; mb.box(x - 0.3, 1.1, d / 2, x + 0.3, 1.7, d / 2 + 0.04, C(lit ? '#ffd27a' : '#2c3444', lit ? 0.5 : -0.6)); mb.box(x - 0.36, 1.04, d / 2 + 0.03, x + 0.36, 1.1, d / 2 + 0.12, C('#e9e2d0', 0)); }
    mb.box(w * 0.18, ry - 0.5, -0.2, w * 0.18 + 0.4, ry + 0.4, 0.2, C('#7d6f63', 0));
  },
  // devasa ışıklı harf/şekil yerine: neon çerçeve tüp
  neonBar(mb, x0, y0, z0, x1, y1, z1, hex) { mb.box(x0, y0, z0, x1, y1, z1, C(hex, 1)); },
};
// ---------- masalar: tepe her zaman TABLE_Y'de (oyunların taşları/kartları bunun üstüne konur) ----------
// o: { trim, cloth, wood, felt, glow, stone }
function tableTop(mb, R, rings, colOf, e = -0.1) { for (let i = 0; i < rings; i++) { const r0 = (R * i) / rings, r1 = (R * (i + 1)) / rings; mb.lathe(0, TABLE_Y, 0, [[r1, 0], [r0, 0]], 56, (k, a) => rgbA(colOf(i, k ? r0 : r1, a), e)); } }
const TABLES = {
  cloth(mb, R, o) { tableModel(mb, R, o.trim, o.cloth); },
  // ahşap: halka halka damar, kalın kenar, ortada ayak ve çapraz taban
  wood(mb, R, o) {
    const w = hexRGB(o.wood || '#a0703f'), wd = mix3(w, [0, 0, 0], 0.25);
    tableTop(mb, R, 12, (i, r, a) => mix3(w, wd, 0.25 * (0.5 + 0.5 * Math.sin(r * 9 + vn(Math.cos(a) * 2 + 5, Math.sin(a) * 2) * 4))), -0.25);
    mb.cyl(0, TABLE_Y - 0.07, 0, R, TABLE_Y, R, 56, rgbA(wd, -0.3), rgbA(wd, -0.3), '');
    mb.torusN(0, TABLE_Y - 0.004, 0, R - 0.01, 0.018, 0.018, 56, 4, rgbA(mix3(w, [1, 1, 1], 0.1), -0.4));
    const P = rgbA(wd, -0.2);
    mb.cyl(0, 0.06, 0, 0.17, TABLE_Y - 0.07, 0.12, 12, P, P, '');
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; limb(mb, [0, 0.08, 0], [Math.cos(a) * 0.62, 0.03, Math.sin(a) * 0.62], [0.07, 0.05], P, 6); }
  },
  // çuha masa: renkli çuha, ahşap kalın kenar
  felt(mb, R, o) {
    const f = hexRGB(o.felt || '#1f6b47'), w = hexRGB(o.wood || '#5b3a24');
    tableTop(mb, R - 0.13, 6, (i, r, a) => mix3(f, [0, 0, 0], 0.08 * vn(Math.cos(a) * r * 3 + 9, Math.sin(a) * r * 3)), 0);
    mb.lathe(0, TABLE_Y - 0.08, 0, [[R + 0.03, 0], [R + 0.04, 0.07], [R - 0.02, 0.115], [R - 0.13, 0.085], [R - 0.13, 0.08]], 56, rgbA(w, -0.55), '');
    mb.cyl(0, TABLE_Y - 0.12, 0, R - 0.05, TABLE_Y - 0.08, R + 0.03, 40, rgbA(mix3(w, [0, 0, 0], 0.3), -0.3), rgbA(w, -0.3), '');
    const P = rgbA(mix3(w, [0, 0, 0], 0.2), -0.3);
    mb.cyl(0, 0.05, 0, 0.18, TABLE_Y - 0.12, 0.14, 12, P, P, '');
    mb.cyl(0, 0, 0, 0.6, 0.06, 0.55, 20, P, P);
  },
  // kütük: kabuklu gövde, halkalı kesik yüz, kökler
  stump(mb, R, o) {
    const bark = hexRGB('#6b4a31'), barkD = hexRGB('#4b3220'), ring = hexRGB('#d4a66c'), ringD = hexRGB('#bf9058'), edge = hexRGB('#8f6238'), pith = hexRGB('#a87a48');
    // yumuşak yıllık halkalar: ince, düşük karşıtlık, merkezde koyu öz, dışta koyu diri odun
    tableTop(mb, R, 18, (i, r, a) => { const t = r / R, w = vn(Math.cos(a) * 1.6 + 4, Math.sin(a) * 1.6 + 2) * 0.9; let c = mix3(ring, ringD, 0.5 + 0.5 * Math.sin(t * 44 + w * 3)); if (t < 0.07) c = mix3(pith, c, t / 0.07); if (t > 0.9) c = mix3(c, edge, Math.min(1, (t - 0.9) / 0.08)); return c; }, -0.05);
    mb.lathe(0, 0, 0, [[R * 1.12, 0], [R * 1.02, 0.12], [R * 0.98, 0.4], [R, TABLE_Y - 0.02], [R - 0.01, TABLE_Y]], 40, (k, a) => rgbA(mix3(bark, barkD, Math.sin(a * 23) > 0.2 ? 0.7 : 0.1), 0), '');
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; limb(mb, [Math.cos(a) * R * 0.95, 0.2, Math.sin(a) * R * 0.95], [Math.cos(a) * (R + 0.55), 0.02, Math.sin(a) * (R + 0.55)], [0.14, 0.05], rgbA(barkD, 0), 6); }
  },
  // taş: düzensiz kenarlı taş tabla, kaba ayak
  stone(mb, R, o) {
    const s = hexRGB(o.stone || '#b9ab92'), sd = mix3(s, [0, 0, 0], 0.22);
    tableTop(mb, R, 6, (i, r, a) => mix3(s, sd, vn(Math.cos(a) * r * 2 + 3, Math.sin(a) * r * 2) * 0.6), -0.1);
    mb.lathe(0, TABLE_Y - 0.14, 0, [[R - 0.06, 0], [R + 0.02, 0.06], [R, 0.14]], 40, (k, a) => rgbA(mix3(s, sd, 0.3 + 0.3 * Math.sin(a * 7)), 0), '');
    mb.lathe(0, 0, 0, [[0.75, 0], [0.55, 0.15], [0.45, TABLE_Y - 0.14], [0.62, TABLE_Y - 0.14]], 14, rgbA(sd, 0), '');
  },
  // buz: parlak açık mavi tepe, buz blok ayak
  ice(mb, R, o) {
    tableTop(mb, R, 8, (i, r, a) => mix3([0.78, 0.9, 0.98], [0.62, 0.8, 0.94], vn(Math.cos(a) * r * 3, Math.sin(a) * r * 3)), -0.85);
    mb.cyl(0, TABLE_Y - 0.12, 0, R, TABLE_Y, R, 48, C('#a8d4ee', -0.85), C('#a8d4ee', -0.85), '');
    mb.rbox(-0.55, 0, -0.55, 0.55, TABLE_Y - 0.12, 0.55, 0.08, C('#bfe3f5', -0.8), 2);
  },
  // cam + neon kenar (parti, havalimanı)
  glass(mb, R, o) {
    tableTop(mb, R, 4, () => hexRGB(o.top || '#1c1f2a'), -0.92);
    mb.torusN(0, TABLE_Y - 0.03, 0, R, 0.035, 0.03, 64, 5, C(o.glow || '#ff4fd8', 1));
    mb.cyl(0, TABLE_Y - 0.06, 0, R - 0.02, TABLE_Y, R - 0.02, 56, C('#2b2f3a', -0.85), C('#2b2f3a', -0.85), '');
    const Ch = C('#c9ced6', -0.92);
    mb.cyl(0, 0.03, 0, 0.09, TABLE_Y - 0.06, 0.08, 12, Ch, Ch, ''); mb.cyl(0, 0, 0, 0.55, 0.04, 0.55, 24, Ch, Ch);
  },
  // bilim-kurgu konsolu: metal halka, ışıklı dilimler, kapalı gövde
  console(mb, R, o) {
    const M1 = hexRGB(o.metal || '#3a4152'), M2 = mix3(M1, [0, 0, 0], 0.35);
    tableTop(mb, R, 8, (i) => (i === 7 ? mix3(M1, [1, 1, 1], 0.2) : i % 2 ? M1 : M2), -0.7);
    mb.lathe(0, 0, 0, [[R * 0.7, 0], [R * 0.88, 0.25], [R, TABLE_Y - 0.03], [R, TABLE_Y]], 48, rgbA(M2, -0.6), '');
    const g = o.glow || '#4cc9f0';
    mb.cyl(0, 0.24, 0, R * 0.885, 0.3, R * 0.9, 48, C(g, 1), C(g, 1), '');
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; mb.push().T(Math.cos(a) * R * 0.95, 0.5, Math.sin(a) * R * 0.95, -a + Math.PI / 2); mb.box(-0.12, -0.04, -0.01, 0.12, 0.04, 0.03, C(k % 3 ? g : '#ffd23f', 1)); mb.pop(); }
  },
  // stüdyo masası: parlak tepe, yere kadar kapalı etek, LED şerit
  desk(mb, R, o) {
    const t = hexRGB(o.top || '#f4f6fb'), sk = hexRGB(o.skirt || '#1d2b53');
    tableTop(mb, R, 4, () => t, -0.85);
    mb.cyl(0, 0, 0, R - 0.05, TABLE_Y, R, 56, rgbA(sk, -0.7), rgbA(sk, -0.7), '');
    mb.cyl(0, 0.3, 0, R - 0.035, 0.36, R - 0.032, 56, C(o.glow || '#4cc9f0', 1), C(o.glow || '#4cc9f0', 1), '');
    mb.cyl(0, TABLE_Y - 0.05, 0, R + 0.005, TABLE_Y - 0.01, R + 0.005, 56, C(o.glow || '#4cc9f0', 1), C(o.glow || '#4cc9f0', 1), '');
  },
  // kablo makarası (maden): iki ahşap disk + göbek
  spool(mb, R, o) {
    const w = hexRGB('#b98a55'), wd = hexRGB('#8a6238');
    tableTop(mb, R, 8, (i, r, a) => (Math.floor((a / TAU) * 16) % 2 ? w : mix3(w, wd, 0.4)), -0.1);
    mb.cyl(0, TABLE_Y - 0.1, 0, R, TABLE_Y, R, 48, rgbA(wd, 0), rgbA(wd, 0), '');
    mb.cyl(0, 0.1, 0, R * 0.42, TABLE_Y - 0.1, R * 0.42, 24, C('#7a5a3a', 0), C('#7a5a3a', 0), '');
    for (let k = 0; k < 7; k++) mb.torusN(0, 0.18 + k * 0.065, 0, R * 0.42 + 0.03, 0.035, 0.035, 24, 5, C(k % 2 ? '#3a3a3c' : '#c8553d', -0.4));
    mb.cyl(0, 0, 0, R * 0.95, 0.1, R * 0.95, 40, rgbA(wd, 0), rgbA(w, 0));
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; mb.sphereS(Math.cos(a) * R * 0.7, TABLE_Y + 0.002, Math.sin(a) * R * 0.7, 0.03, 0.006, 0.03, C('#5b5f66', -0.8), 6, 3); }
  },
  // lastik kule + cam tepe (yarış pisti)
  tire(mb, R, o) {
    const T = C('#1d1e22', -0.3), Rm = C('#c9ced6', -0.9);
    for (let k = 0; k < 3; k++) { mb.torusN(0, 0.14 + k * 0.22, 0, R * 0.62, 0.13, 0.11, 32, 8, T); mb.cyl(0, 0.07 + k * 0.22, 0, R * 0.5, 0.21 + k * 0.22, R * 0.5, 24, Rm, Rm, ''); }
    tableTop(mb, R, 4, () => hexRGB('#2a2d33'), -0.9);
    mb.torusN(0, TABLE_Y - 0.02, 0, R, 0.03, 0.025, 56, 4, C(o.glow || '#e63946', -0.3));
  },
  // lokanta masası: kırmızı-beyaz kareli örtü (kareler daireye kırpılır), çizgili sarkan etek, ortada ayak
  checker(mb, R, o) {
    const A = C(o.check || '#c8261c', 0), B = C(o.check2 || '#fbf6ec', 0), s = o.cs || 0.27, n = Math.ceil(R / s) + 1;
    const P = (x, z) => { const d = Math.hypot(x, z); return d > R ? [(x * R) / d, (z * R) / d] : [x, z]; };
    for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
      const x0 = i * s, z0 = j * s, x1 = x0 + s, z1 = z0 + s;
      if (Math.min(Math.hypot(x0, z0), Math.hypot(x1, z0), Math.hypot(x0, z1), Math.hypot(x1, z1)) >= R) continue;
      const a = P(x0, z0), b = P(x0, z1), c = P(x1, z1), d = P(x1, z0);
      mb.quadN([a[0], TABLE_Y, a[1]], [b[0], TABLE_Y, b[1]], [c[0], TABLE_Y, c[1]], [d[0], TABLE_Y, d[1]], UPV, UPV, UPV, UPV, (i + j) & 1 ? A : B);
    }
    const ch = o.check || '#c8261c', c2 = o.check2 || '#fbf6ec';
    mb.lathe(0, TABLE_Y - 0.34, 0, [[R + 0.07, 0], [R + 0.03, 0.26], [R + 0.005, 0.335], [R - 0.01, 0.342]], 64, (k, a) => C(Math.floor((a * 32) / TAU) % 2 ? ch : c2, 0), '');
    mb.torusN(0, TABLE_Y - 0.34, 0, R + 0.07, 0.012, 0.012, 64, 4, C(ch, 0));
    const P2 = C('#3b2416', -0.3);
    mb.cyl(0, 0.04, 0, 0.09, TABLE_Y - 0.3, 0.08, 10, P2, P2, ''); mb.cyl(0, 0, 0, 0.42, 0.05, 0.38, 18, P2, P2);
  },
  // bahçe masası: beyaz ferforje, ince desenli tepe, kıvrık bacaklar
  iron(mb, R, o) {
    const W = hexRGB(o.iron || '#f6f3ec'), Wd = mix3(W, [0.62, 0.6, 0.58], 0.5), WC = C(o.iron || '#f6f3ec', -0.5);
    tableTop(mb, R, 15, (i, r, a) => (i === 4 || i === 9 || i === 14 || Math.abs(Math.sin(a * 6)) < 0.07 ? Wd : W), -0.55);
    mb.torusN(0, TABLE_Y - 0.012, 0, R, 0.026, 0.02, 64, 4, WC);
    mb.cyl(0, TABLE_Y - 0.11, 0, R - 0.05, TABLE_Y - 0.03, R - 0.05, 48, WC, WC, '');
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; mb.torusN(Math.cos(a) * (R - 0.05), TABLE_Y - 0.15, Math.sin(a) * (R - 0.05), 0.05, 0.008, 0.008, 10, 3, WC); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a); limb(mb, [ca * 0.16, TABLE_Y - 0.1, sa * 0.16], [ca * 0.42, 0.34, sa * 0.42], [0.022, 0.02], WC, 5); limb(mb, [ca * 0.42, 0.34, sa * 0.42], [ca * 0.6, 0.02, sa * 0.6], [0.02, 0.022], WC, 5); mb.push().T(ca * 0.47, 0.42, sa * 0.47, -a + Math.PI / 2, Math.PI / 2); mb.torusN(0, 0, 0, 0.06, 0.01, 0.01, 12, 3, WC); mb.pop(); mb.sphereS(ca * 0.6, 0.02, sa * 0.6, 0.035, 0.025, 0.035, WC, 6, 3); }
    mb.torusN(0, 0.36, 0, 0.44, 0.012, 0.012, 32, 3, WC);
    mb.cyl(0, 0.05, 0, 0.05, TABLE_Y - 0.1, 0.05, 8, WC, WC, '');
  },
  // mucit masası: ahşap tepe, bakır kenar, altında dışa taşan büyük dişli, dökme demir ayak
  gear(mb, R, o) {
    const w = hexRGB(o.wood || '#b07a48'), wd = mix3(w, [0, 0, 0], 0.22), Cu = C(o.copper || '#b87333', -0.85), Fe = C('#3a3d44', -0.7);
    tableTop(mb, R - 0.06, 10, (i, r, a) => mix3(w, wd, 0.3 * (0.5 + 0.5 * Math.sin(r * 11 + vn(Math.cos(a) * 2 + 1, Math.sin(a) * 2) * 3))), -0.3);
    mb.cyl(0, TABLE_Y - 0.06, 0, R, TABLE_Y + 0.004, R, 56, Cu, Cu, '');
    mb.torusN(0, TABLE_Y, 0, R - 0.035, 0.028, 0.028, 56, 4, Cu);
    // dişli: tepenin altında, dişleri kenardan dışarı taşar
    const G = C(o.gearC || '#8a8f98', -0.85), n = Math.round(R * 14);
    mb.cyl(0, TABLE_Y - 0.17, 0, R * 0.97, TABLE_Y - 0.07, R * 0.97, 48, G, G);
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU; mb.push().T(Math.cos(a) * (R + 0.03), TABLE_Y - 0.12, Math.sin(a) * (R + 0.03), -a); mb.box(-0.09, -0.05, -0.07, 0.09, 0.05, 0.07, G); mb.pop(); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; mb.sphereS(Math.cos(a) * (R - 0.2), TABLE_Y + 0.002, Math.sin(a) * (R - 0.2), 0.035, 0.008, 0.035, Cu, 6, 3); }
    mb.cyl(0, 0.05, 0, 0.16, TABLE_Y - 0.17, 0.13, 12, Fe, Fe, '');
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; limb(mb, [0, 0.3, 0], [Math.cos(a) * 0.62, 0.02, Math.sin(a) * 0.62], [0.07, 0.05], Fe, 6); mb.sphereS(Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62, 0.08, 0.05, 0.08, Fe, 8, 5); }
  },
  // ince metal büfe masası
  metal(mb, R, o) {
    const t = hexRGB(o.top || '#d9dce1');
    tableTop(mb, R, 6, (i) => (i % 2 ? t : mix3(t, [0, 0, 0], 0.06)), -0.85);
    mb.cyl(0, TABLE_Y - 0.045, 0, R, TABLE_Y, R, 56, C(o.trim || '#c8261c', -0.5), C(o.trim || '#c8261c', -0.5), '');
    const P = C('#6b7079', -0.85);
    mb.cyl(0, 0.04, 0, 0.06, TABLE_Y - 0.045, 0.06, 10, P, P, ''); mb.cyl(0, 0, 0, 0.5, 0.05, 0.46, 20, P, P);
  },
};
// ---------- sandalyeler: base boyanmaz, pad oyuncu rengiyle boyanır (beyaz modellenir) ----------
const PADW = '#ffffff';
const CHAIRS = {
  // klasik ahşap sandalye + minder
  wood: { base(mb, o) { chairModel(mb, o.wood || '#6b4428', o.wood || '#6b4428'); }, pad(mb) { mb.rbox(-0.215, 0.43, -0.215, 0.215, 0.47, 0.19, 0.03, C(PADW, -0.1), 2); } },
  stump: { base(mb) { mb.lathe(0, 0, 0, [[0.3, 0], [0.26, 0.06], [0.25, 0.4], [0.235, 0.41]], 14, (k, a) => C(Math.sin(a * 17) > 0 ? '#6b4a31' : '#4f3523', 0), ''); mb.cyl(0, 0.4, 0, 0.235, 0.41, 0.235, 14, C('#d2a56c', 0), C('#c99a5e', 0), 't'); }, pad(mb) { mb.cyl(0, 0.41, 0, 0.2, 0.46, 0.18, 14, C(PADW, -0.1), C(PADW, -0.1)); } },
  beach: {
    base(mb) { const W = C('#c8a06a', -0.3); for (const s of [-1, 1]) { limb(mb, [s * 0.24, 0, 0.26], [s * 0.24, 0.42, -0.05], [0.02, 0.02], W, 5); limb(mb, [s * 0.24, 0, -0.2], [s * 0.24, 0.98, -0.36], [0.02, 0.02], W, 5); limb(mb, [s * 0.24, 0.42, -0.05], [s * 0.24, 0.38, 0.22], [0.02, 0.02], W, 5); } },
    pad(mb) { const n = 6; for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, col = C(k % 2 ? PADW : '#e9e9e9', 0); const P = (t) => [lerp(0.22, -0.05, t), lerp(0.36, 0.42, t)]; const a = P(t0), b = P(t1); mb.quadN([-0.23, a[1], a[0]], [0.23, a[1], a[0]], [0.23, b[1], b[0]], [-0.23, b[1], b[0]], UPV, UPV, UPV, UPV, col); } for (let k = 0; k < n; k++) { const y0 = 0.42 + (k / n) * 0.52, y1 = 0.42 + ((k + 1) / n) * 0.52, z0 = -0.05 - (k / n) * 0.3, z1 = -0.05 - ((k + 1) / n) * 0.3, nn = vnorm([0, 0.5, 1]); mb.quadN([-0.23, y0, z0], [0.23, y0, z0], [0.23, y1, z1], [-0.23, y1, z1], nn, nn, nn, nn, C(k % 2 ? PADW : '#e9e9e9', 0)); } },
  },
  director: {
    base(mb) { const W = C('#2f241b', -0.4); for (const s of [-1, 1]) { limb(mb, [s * 0.25, 0, 0.2], [s * 0.25, 0.42, -0.2], [0.022, 0.022], W, 5); limb(mb, [s * 0.25, 0, -0.2], [s * 0.25, 0.42, 0.2], [0.022, 0.022], W, 5); limb(mb, [s * 0.25, 0.42, -0.22], [s * 0.25, 1.0, -0.24], [0.022, 0.022], W, 5); limb(mb, [s * 0.25, 0.42, 0.2], [s * 0.25, 0.62, 0.2], [0.02, 0.02], W, 5); limb(mb, [s * 0.25, 0.62, 0.22], [s * 0.25, 0.62, -0.24], [0.026, 0.026], W, 5); } },
    pad(mb) { mb.box(-0.24, 0.41, -0.21, 0.24, 0.44, 0.2, C(PADW, -0.05)); mb.box(-0.245, 0.72, -0.255, 0.245, 0.96, -0.235, C(PADW, -0.05)); },
  },
  office: {
    base(mb) { const B = C('#1e2024', -0.6), Ch = C('#b9bec6', -0.9); mb.cyl(0, 0.08, 0, 0.035, 0.36, 0.035, 8, Ch, Ch, ''); for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; limb(mb, [0, 0.08, 0], [Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.28], [0.025, 0.02], B, 5); mb.sphereS(Math.cos(a) * 0.28, 0.035, Math.sin(a) * 0.28, 0.035, 0.035, 0.035, B, 6, 4); } mb.rbox(-0.25, 0.36, -0.24, 0.25, 0.44, 0.22, 0.05, C('#2b2d33', -0.5), 2); mb.push().T(0, 0.72, -0.27, 0, -0.1); mb.rbox(-0.24, -0.28, -0.05, 0.24, 0.3, 0.04, 0.07, C('#2b2d33', -0.5), 2); mb.pop(); },
    pad(mb) { mb.push().T(0, 0.72, -0.27, 0, -0.1); mb.rbox(-0.18, -0.18, 0.035, 0.18, 0.22, 0.05, 0.03, C(PADW, -0.3), 1); mb.pop(); },
  },
  bean: { base(mb) {}, pad(mb) { mb.sphereS(0, 0.24, 0.02, 0.36, 0.25, 0.34, C(PADW, -0.15), 14, 8); mb.sphereS(0, 0.5, -0.24, 0.3, 0.32, 0.14, C(PADW, -0.15), 12, 7); } },
  pod: {
    base(mb) { const W = C('#eef0f4', -0.7); mb.cyl(0, 0, 0, 0.26, 0.04, 0.24, 18, W, W); mb.cyl(0, 0.04, 0, 0.04, 0.3, 0.04, 8, W, W, ''); mb.lathe(0, 0.3, 0, [[0.05, 0], [0.24, 0.02], [0.3, 0.1], [0.28, 0.12]], 18, W, ''); mb.push().T(0, 0.62, -0.22, 0, -0.15); mb.rbox(-0.26, -0.3, -0.05, 0.26, 0.34, 0.03, 0.12, W, 3); mb.pop(); },
    pad(mb) { mb.cyl(0, 0.4, 0, 0.24, 0.45, 0.23, 18, C(PADW, -0.2), C(PADW, -0.2)); mb.push().T(0, 0.64, -0.2, 0, -0.15); mb.rbox(-0.2, -0.22, 0.02, 0.2, 0.26, 0.06, 0.08, C(PADW, -0.2), 2); mb.pop(); },
  },
  school: {
    base(mb) { const M = C('#8a9099', -0.85); for (const [x, z] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.19], [0.21, 0.19]]) mb.cyl(x, 0, z, 0.016, 0.42, 0.016, 6, M, M, ''); for (const s of [-1, 1]) limb(mb, [s * 0.21, 0.42, -0.21], [s * 0.21, 0.92, -0.25], [0.016, 0.016], M, 5); },
    pad(mb) { mb.rbox(-0.235, 0.4, -0.22, 0.235, 0.44, 0.21, 0.03, C(PADW, -0.5), 2); mb.push().T(0, 0.78, -0.255, 0, -0.08); mb.rbox(-0.22, -0.12, -0.02, 0.22, 0.14, 0.02, 0.03, C(PADW, -0.5), 2); mb.pop(); },
  },
  gothic: {
    base(mb) { const W = C('#2a1a1e', -0.5); chairModel(mb, '#2a1a1e', '#2a1a1e'); for (const s of [-1, 1]) mb.sphereS(s * 0.205, 1.02, -0.275, 0.04, 0.05, 0.04, C('#c9a34a', -0.8), 6, 4); mb.push().T(0, 1.01, -0.27, 0, -0.08); mb.cyl(0, -0.02, 0, 0.12, 0.06, 0.0, 8, W, W, ''); mb.pop(); },
    pad(mb) { mb.rbox(-0.215, 0.43, -0.215, 0.215, 0.47, 0.19, 0.03, C(PADW, -0.35), 2); mb.push().T(0, 0.75, -0.255, 0, -0.07); mb.rbox(-0.17, -0.2, 0.0, 0.17, 0.16, 0.03, 0.03, C(PADW, -0.35), 2); mb.pop(); },
  },
  ice: { base(mb) { mb.rbox(-0.24, 0, -0.23, 0.24, 0.4, 0.23, 0.05, C('#bfe3f5', -0.85), 2); }, pad(mb) { mb.rbox(-0.22, 0.39, -0.21, 0.22, 0.46, 0.21, 0.06, C(PADW, 0), 2); for (let k = 0; k < 6; k++) mb.sphereS(-0.18 + k * 0.072, 0.4, 0.21, 0.04, 0.03, 0.03, C(PADW, 0), 5, 3); } },
  crate: { base(mb) { mb.push().T(0, 0, 0, 0, 0, 0, 0.46); DECOR.crate(mb, ['#8a6238'], 0); mb.pop(); }, pad(mb) { mb.rbox(-0.2, 0.455, -0.2, 0.2, 0.49, 0.2, 0.03, C(PADW, -0.05), 2); mb.box(-0.21, 0.36, 0.17, 0.21, 0.47, 0.21, C(PADW, -0.05)); } },
  mushroom: { base(mb) { mb.lathe(0, 0, 0, [[0.16, 0], [0.12, 0.08], [0.11, 0.3], [0.15, 0.36]], 12, C('#fff5e1', -0.2), ''); }, pad(mb) { mb.sphereS(0, 0.38, 0, 0.27, 0.11, 0.27, C(PADW, -0.5), 14, 7); for (let k = 0; k < 5; k++) { const a = k * 1.3, r = 0.1 + (k % 2) * 0.08; mb.sphereS(Math.cos(a) * r, 0.47, Math.sin(a) * r, 0.04, 0.02, 0.04, C('#f6f1e6', 0.3), 6, 3); } } },
  pouf: { base(mb) {}, pad(mb) { mb.lathe(0, 0, 0, [[0.27, 0], [0.31, 0.12], [0.3, 0.32], [0.25, 0.42], [0.0, 0.44]], 16, (k) => C(k === 1 || k === 2 ? PADW : '#eeeeee', -0.1)); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; limb(mb, [Math.cos(a) * 0.08, 0.44, Math.sin(a) * 0.08], [Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3], [0.008, 0.008], C('#c9a34a', -0.5), 3, null, 1); } } },
};
// bükme ahşap kahvehane/lokanta sandalyesi: yuvarlak oturak, çember, ilmek sırtlık
CHAIRS.thonet = {
  base(mb, o) {
    const W = C(o.wood || '#3b2416', -0.35);
    for (const [x, z] of [[-0.17, 0.15], [0.17, 0.15], [-0.15, -0.15], [0.15, -0.15]]) limb(mb, [x * 0.92, 0.42, z * 0.92], [x * 1.18, 0, z * 1.18], [0.022, 0.018], W, 5);
    mb.torusN(0, 0.2, 0, 0.21, 0.012, 0.012, 24, 4, W);
    mb.cyl(0, 0.4, 0, 0.23, 0.43, 0.23, 24, W, W); mb.torusN(0, 0.415, 0, 0.23, 0.02, 0.02, 28, 4, W);
    for (const s of [-1, 1]) limb(mb, [s * 0.15, 0.42, -0.17], [s * 0.17, 0.72, -0.24], [0.02, 0.02], W, 5);
    mb.push().T(0, 0.86, -0.25, 0, Math.PI / 2 - 0.1, 0, 1, 1, 1.25); mb.torusN(0, 0, 0, 0.17, 0.02, 0.02, 28, 5, W); mb.torusN(0, 0.0, 0, 0.11, 0.014, 0.014, 22, 4, W); mb.pop();
  },
  pad(mb) { mb.cyl(0, 0.43, 0, 0.21, 0.47, 0.2, 20, C(PADW, -0.15), C(PADW, -0.15)); },
};
// hasır oturaklı ahşap sandalye: kare bacaklar, örgü oturak, iki çıtalı sırt
CHAIRS.hasir = {
  base(mb, o) {
    const W = C(o.wood || '#6b4428', -0.3), S1 = C('#d9b56c', 0), S2 = C('#c49a52', 0);
    for (const [x, z] of [[-0.2, 0.19], [0.2, 0.19]]) mb.box(x - 0.02, 0, z - 0.02, x + 0.02, 0.43, z + 0.02, W);
    for (const x of [-0.2, 0.2]) mb.box(x - 0.022, 0, -0.21, x + 0.022, 0.98, -0.17, W);
    for (const y of [0.15, 0.27]) { mb.box(-0.2, y, 0.18, 0.2, y + 0.025, 0.2, W); mb.box(-0.2, y, -0.2, 0.2, y + 0.025, -0.18, W); for (const x of [-0.2, 0.2]) mb.box(x - 0.012, y, -0.19, x + 0.012, y + 0.025, 0.19, W); }
    mb.box(-0.22, 0.4, -0.21, 0.22, 0.43, 0.21, W);
    for (let k = 0; k < 9; k++) { const t0 = -0.19 + k * 0.042; mb.box(t0, 0.43, -0.19, t0 + 0.04, 0.445, 0.19, k % 2 ? S1 : S2); }
    for (const y of [0.62, 0.84]) mb.box(-0.2, y, -0.205, 0.2, y + 0.07, -0.185, W);
  },
  pad(mb) { mb.rbox(-0.18, 0.445, -0.17, 0.18, 0.475, 0.17, 0.03, C(PADW, -0.1), 2); },
};
// ferforje bahçe sandalyesi: beyaz demir, yuvarlak oturak, kemerli sırt
CHAIRS.iron = {
  base(mb, o) {
    const WC = C(o.iron || '#f6f3ec', -0.5);
    for (const [x, z] of [[-0.17, 0.16], [0.17, 0.16], [-0.17, -0.17], [0.17, -0.17]]) limb(mb, [x, 0.4, z], [x * 1.2, 0, z * 1.2], [0.014, 0.014], WC, 4);
    mb.torusN(0, 0.41, 0, 0.22, 0.014, 0.014, 26, 4, WC); mb.cyl(0, 0.395, 0, 0.215, 0.41, 0.215, 22, WC, WC);
    mb.torusN(0, 0.16, 0, 0.19, 0.008, 0.008, 22, 3, WC);
    for (const s of [-1, 1]) limb(mb, [s * 0.17, 0.41, -0.18], [s * 0.18, 0.86, -0.25], [0.014, 0.014], WC, 4);
    mb.push().T(0, 0.86, -0.25, 0, Math.PI / 2 - 0.1); mb.torusN(0, 0, 0, 0.18, 0.014, 0.014, 26, 4, WC); for (let k = 0; k < 3; k++) mb.torusN((k - 1) * 0.09, 0, -0.06, 0.05, 0.008, 0.008, 12, 3, WC); mb.pop();
  },
  pad(mb) { mb.cyl(0, 0.41, 0, 0.2, 0.46, 0.19, 18, C(PADW, -0.15), C(PADW, -0.15)); mb.push().T(0, 0.8, -0.235, 0, -0.1); mb.rbox(-0.14, -0.14, -0.02, 0.14, 0.14, 0.03, 0.06, C(PADW, -0.15), 2); mb.pop(); },
};
CHAIRS.stool = {
  base(mb, o) { const L = C(o.leg || '#3a3d44', -0.6); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; limb(mb, [Math.cos(a) * 0.1, 0.38, Math.sin(a) * 0.1], [Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22], [0.02, 0.02], L, 5); } mb.torusN(0, 0.16, 0, 0.16, 0.012, 0.012, 14, 4, L); },
  pad(mb, o) { mb.cyl(0, 0.38, 0, 0.21, 0.45, 0.2, 16, C(PADW, o.gloss ?? -0.5), C(PADW, o.gloss ?? -0.5)); },
};
// ---------- yer örtüleri (masanın altı) ----------
const RUGS = {
  round(mb, R, o) { mb.lathe(0, 0.006, 0, [[R, 0], [R * 0.9, 0]], 64, C(o.rugB || '#f2e6cf', 0)); mb.lathe(0, 0.007, 0, [[R * 0.9, 0], [0, 0]], 64, (k, a) => C(o.rug || '#8c2f2f', 0)); mb.lathe(0, 0.008, 0, [[R * 0.75, 0], [R * 0.72, 0]], 64, C(o.rugB || '#f2e6cf', 0)); },
  straw(mb, R, o) { for (let i = 0; i < 9; i++) mb.lathe(0, 0.006, 0, [[R * (i + 1) / 9, 0], [R * i / 9, 0]], 48, C(i % 2 ? '#d8bf86' : '#c9ab6c', 0)); },
  led(mb, R, o) { mb.lathe(0, 0.006, 0, [[R, 0], [R - 0.08, 0]], 72, C(o.glow || '#4cc9f0', 1)); mb.lathe(0, 0.005, 0, [[R - 0.08, 0], [0, 0]], 64, C(o.rug || '#14161f', -0.85)); },
  patch(mb, R, o) { mb.disc(0, 0.006, 0, R, R, 24, C(o.rug || '#5b4631', 0), C(o.rug || '#5b4631', 0), MK_JIT); },
  // piknik örtüsü: pötikare (koyu/orta/açık üç ton), kare
  gingham(mb, R, o) { const h = R * 0.86, n = 12, s = (2 * h) / n, A = o.rug || '#e05a7a', M = o.rugM || '#f4a9bb', L = o.rugB || '#ffffff'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = (i % 2) + (j % 2); VK.quad(mb, -h + i * s, -h + j * s, -h + (i + 1) * s, -h + (j + 1) * s, C(c === 2 ? A : c === 1 ? M : L, 0), 0.006); } },
  towel(mb, R, o) { const n = 8; for (let k = 0; k < n; k++) { const x0 = -R + (k * 2 * R) / n, x1 = x0 + (2 * R) / n; VK.quad(mb, x0, -R * 0.8, x1, R * 0.8, C(k % 2 ? (o.rugB || '#ffffff') : (o.rug || '#ff6f61'), 0), 0.006); } },
};
const MK_JIT = [1, 0.92, 1.06, 0.96, 1.03, 0.9, 1.05, 0.95, 1.0, 0.93, 1.07, 0.97];
// renk yardımcıları (işletme renklerini yer örtüsüne karıştırmak için)
const vHex = (a) => '#' + a.slice(0, 3).map((x) => Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
const vMixHex = (a, b, t) => vHex(mix3(hexRGB(a), hexRGB(b), t));
// ---------- ışık ve temas gölgesi izleri (mekân kurulurken doldurulur; TableGame çizer) ----------
// VFX: { blobs: [[x,y,z,rx,rz,alfa,ry]], glows: [[x,y,z,r,[r,g,b],alfa,yön('h'|'z'|'x'),titreme,ry,r2]] }; VSH: gölge vermeyen kabuk ağı
let VFX = null, VSH = null;
VK.blob = (x, z, rx, rz = rx, a = 0.45, y = 0.008, ry = 0) => { if (VFX) VFX.blobs.push([x, y, z, rx, rz, a, ry]); };
VK.glow = (x, y, z, r, hex, a = 0.35, o = 'h', fl = 0, ry = 0, r2 = r) => { if (VFX) VFX.glows.push([x, y, z, r, hexRGB(hex), a, o, fl, ry, r2]); };

// ---------- mekân ışıkları (partyLight parlaklığı eşitler; burada renk dengesi ve gece camları seçilir) ----------
const VL = {
  warm: { sunC: [0.56, 0.48, 0.38], sky: [0.44, 0.38, 0.32], gnd: [0.22, 0.17, 0.12], night: 1, warm: [1, 0.84, 0.58], lampC: [1.55, 1.25, 0.9], fogR: [30, 90], stars: 0, glowS: 0.3 },
  day: { sunC: [0.95, 0.9, 0.8], sky: [0.58, 0.64, 0.76], gnd: [0.36, 0.33, 0.28], night: 0, warm: [1, 0.86, 0.6], lampC: [0.7, 0.62, 0.5], fogR: [30, 90], stars: 0, glowS: 0.3 },
  dusk: { sunC: [0.98, 0.66, 0.44], sky: [0.5, 0.42, 0.56], gnd: [0.32, 0.22, 0.2], night: 0.7, warm: [1, 0.78, 0.5], lampC: [1.2, 0.9, 0.6], fogR: [30, 90], stars: 0, glowS: 0.3 },
  night: { sunC: [0.38, 0.44, 0.68], sky: [0.3, 0.32, 0.5], gnd: [0.11, 0.11, 0.17], night: 1, warm: [1, 0.8, 0.52], lampC: [1.3, 1.0, 0.7], fogR: [30, 90], stars: 0, glowS: 0.3 },
  party: { sunC: [0.52, 0.42, 0.6], sky: [0.46, 0.36, 0.54], gnd: [0.22, 0.14, 0.24], night: 1, warm: [1, 0.76, 0.86], lampC: [1.45, 1.1, 1.2], fogR: [30, 90], stars: 0, glowS: 0.3 },
  studio: { sunC: [0.48, 0.47, 0.6], sky: [0.4, 0.4, 0.56], gnd: [0.18, 0.17, 0.26], night: 1, warm: [0.96, 0.9, 1], lampC: [1.42, 1.28, 1.16], fogR: [30, 90], stars: 0, glowS: 0.3 },
  neon: { sunC: [0.42, 0.38, 0.56], sky: [0.36, 0.32, 0.52], gnd: [0.14, 0.11, 0.2], night: 1, warm: [0.9, 0.84, 1], lampC: [1.5, 1.38, 1.62], fogR: [30, 90], stars: 0, glowS: 0.3 },
  space: { sunC: [0.46, 0.52, 0.68], sky: [0.34, 0.4, 0.54], gnd: [0.14, 0.16, 0.22], night: 1, warm: [0.8, 0.9, 1], lampC: [1.1, 1.3, 1.5], fogR: [30, 90], stars: 0, glowS: 0.3 },
  snow: { sunC: [0.88, 0.9, 0.98], sky: [0.62, 0.68, 0.8], gnd: [0.5, 0.52, 0.58], night: 0, warm: [1, 0.86, 0.6], lampC: [0.8, 0.75, 0.7], fogR: [30, 90], stars: 0, glowS: 0.3 },
  forest: { sunC: [0.4, 0.5, 0.62], sky: [0.3, 0.38, 0.46], gnd: [0.12, 0.16, 0.16], night: 1, warm: [0.9, 1, 0.75], lampC: [1.1, 1.25, 0.95], fogR: [30, 90], stars: 0, glowS: 0.3 },
  office: { sunC: [0.5, 0.52, 0.7], sky: [0.4, 0.42, 0.58], gnd: [0.17, 0.16, 0.21], night: 1, warm: [1, 0.84, 0.58], lampC: [1.45, 1.15, 0.8], fogR: [30, 90], stars: 0, glowS: 0.3 },
};
// iç mekân kabuğu: arka duvar z=-7.8 (iç yüz), yan duvarlar x=±8.4 (iç yüz); o.wall, o.wallS, o.dado, o.top, o.base, o.h
function vShell(mb, o) {
  mb = VSH || mb;
  const H = o.h || 5.2, w = { base: o.base, top: o.top, dado: o.dado, band: o.band };
  VK.wall(mb, -8.75, -8.15, 8.75, -7.8, H, o.wall, w);
  for (const s of [-1, 1]) VK.wall(mb, s < 0 ? -8.75 : 8.4, -8.15, s < 0 ? -8.4 : 8.75, 10, H, o.wallS || o.wall, w);
}
// küçük boş masa ve iki sandalye (arka plan süsü)
function vSideTable(mb, x, z, top, wood, k = 0) {
  mb.push().T(x, 0, z, k);
  mb.cyl(0, TABLE_Y - 0.04, 0, 0.62, TABLE_Y, 0.62, 20, C(top, -0.4), C(top, -0.4));
  mb.cyl(0, 0.04, 0, 0.07, TABLE_Y - 0.04, 0.07, 8, C(wood, -0.3), C(wood, -0.3), ''); mb.cyl(0, 0, 0, 0.34, 0.05, 0.3, 14, C(wood, -0.3), C(wood, -0.3));
  for (const s of [-1, 1]) { mb.push().T(s * 0.95, 0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); chairModel(mb, wood, wood); mb.pop(); }
  mb.pop();
}
// gece şehri penceresi: koyu cam, rastgele yanan pencere noktaları (dışarı bakan duvar içinde)
function vCityGlass(mb, x0, y0, x1, y1, z, k = 0) {
  mb.box(x0, y0, z, x1, y1, z + 0.02, C('#0f1830', -0.7));
  for (let i = 0; i < 26; i++) { const x = lerp(x0 + 0.1, x1 - 0.1, hs(i, k + 3)), y = lerp(y0 + 0.1, y0 + (y1 - y0) * 0.75, hs(i, k + 5)), s = 0.04 + hs(i, k) * 0.05; mb.box(x - s, y - s, z + 0.021, x + s, y + s * 1.4, z + 0.025, C(i % 3 ? '#ffd76a' : '#9ad1ff', 1)); }
}
const VENUES = {
  /* ---- Hesabı Kim Öder: akşam lokantası ---- */
  hesap: {
    table: 'checker', tableO: { check: '#b3202a', check2: '#fbf6ec' }, chair: 'thonet', chairO: { wood: '#3b2416' }, rug: 'round', rugO: { rug: '#2f4a3a', rugB: '#e0c08a' },
    L: VL.warm, sky: ['#2a1d16', '#3a281c', '#2a1d16'], posters: 'wall',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#3a2a1e', 0), -0.01);
      VK.harlequin(mb, -8.4, -7.8, 8.4, 12, 0.48, '#efe8dc', '#2f2a28', '#1f1b1a', -0.4);
      vShell(mb, { wall: '#2f5a46', dado: [1.15, '#5b3a24'], top: '#c99a3e', base: '#3b2416' });
      VK.sign(mb, 'wall', '#c99a3e', '#fff8ec');
      // bar tezgâhı, arkasında şişe rafı, önünde tabureler
      mb.push().T(-5.7, 0, -6.75); VK.counter(mb, 3.8, 1.12, 0.8, '#5b3a24', '#2b1a10'); mb.pop();
      for (let r = 0; r < 2; r++) {
        mb.box(-7.9, 1.75 + r * 0.6, -7.8, -3.5, 1.79 + r * 0.6, -7.5, C('#3b2416', 0));
        for (let k = 0; k < 11; k++) { const x = -7.7 + k * 0.4, hh = 0.32 + hs(k, r) * 0.12, col = ['#2f6b3a', '#6b2a1a', '#c8a24a', '#2a4a6b', '#8a2a4a'][(k + r * 2) % 5]; mb.cyl(x, 1.79 + r * 0.6, -7.64, 0.06, 1.79 + r * 0.6 + hh, 0.06, 8, C(col, -0.85), C(col, -0.85)); mb.cyl(x, 1.79 + r * 0.6 + hh, -7.64, 0.025, 1.79 + r * 0.6 + hh + 0.1, 0.02, 6, C(col, -0.85), C(col, -0.85)); }
      }
      for (const x of [-7.1, -5.7, -4.3]) { mb.push().T(x, 0, -5.75); CHAIRS.stool.base(mb, { leg: '#2b1a10' }); mb.cyl(0, 0.38, 0, 0.2, 0.45, 0.2, 14, C('#7a1f24', -0.3), C('#7a1f24', -0.3)); mb.pop(); }
      // mutfak servis penceresi (sıcak ışık) ve zil
      mb.box(3.2, 1.15, -7.79, 7.4, 2.45, -7.77, C('#ffd9a0', 0.95));
      mb.box(3.1, 1.08, -7.8, 7.5, 1.16, -7.4, C('#c99a3e', -0.5));
      mb.cyl(6.6, 1.16, -7.55, 0.1, 1.24, 0.03, 10, C('#d6a64a', -0.9), C('#d6a64a', -0.9));
      for (const [x, y] of [[-3.0, 3.6], [3.0, 3.6]]) { mb.rbox(x - 0.55, y - 0.4, -7.84, x + 0.55, y + 0.4, -7.76, 0.03, C('#c99a3e', -0.6), 2); mb.box(x - 0.45, y - 0.3, -7.77, x + 0.45, y + 0.3, -7.75, C(x < 0 ? '#7a8f6a' : '#a0704a', 0)); }
      // yanlarda boş masalar, köşelerde saksı, duvar aplikleri
      for (const s of [-1, 1]) { vSideTable(mb, s * 6.6, 3.2, '#efe6d6', '#5b3a24', 0.2 * s); VK.plant(mb, s * 7.75, -7.2, 1.3); for (const z of [-4.5, 0.5]) { mb.box(s * 8.38, 2.6, z - 0.1, s * 8.3, 2.95, z + 0.1, C('#c99a3e', -0.7)); mb.sphereS(s * 8.25, 3.02, z, 0.13, 0.15, 0.13, C('#ffe2a8', 1), 8, 6); } }
    },
  },
  /* ---- Aramızdaki Casus: gece ajans bürosu ---- */
  acs: {
    table: 'felt', tableO: { felt: '#2f5a46', wood: '#2b1a10' }, chair: 'office', rug: 'round', rugO: { rug: '#3a1d24', rugB: '#c9a34a' },
    L: VL.office, sky: ['#0b1430', '#1b2a4a', '#121828'], posters: 'wall', parts: 'dust',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#2a221c', 0), -0.01);
      VK.planks(mb, -8.4, -7.8, 8.4, 12, 0.22, ['#6a5240', '#5c4636', '#745a46', '#634c3b'], 'z', -0.12, 0, '#2e221a');
      vShell(mb, { wall: '#3b4350', dado: [1.0, '#2a3039'], top: '#1c2029', base: '#151515' });
      VK.sign(mb, 'wall', '#6b4a2e', '#f4efe2');
      // iki büyük pencere: gece şehri, jaluzi
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -7.2 : 2.6, x1 = s < 0 ? -2.6 : 7.2;
        vCityGlass(mb, x0, 1.2, x1, 4.4, -7.79, s + 5);
        for (let y = 1.3; y < 4.4; y += 0.22) mb.box(x0, y, -7.74, x1, y + 0.05, -7.7, C('#c9c3b5', -0.2));
        mb.box(x0 - 0.1, 1.1, -7.8, x1 + 0.1, 1.2, -7.6, C('#1f232a', 0));
      }
      // sol duvarda mantar pano: kırmızı iplerle bağlı fotoğraflar
      mb.box(-8.39, 1.4, -6.4, -8.36, 3.4, -3.6, C('#b08a5a', 0));
      const pins = [[-6.1, 3.0], [-5.2, 2.0], [-4.4, 2.9], [-3.9, 1.8], [-5.6, 1.6]];
      pins.forEach(([z, y], i) => { mb.box(-8.355, y - 0.2, z - 0.16, -8.34, y + 0.2, z + 0.16, C(i % 2 ? '#f4efe2' : '#e6dcc4', 0)); mb.sphereS(-8.33, y + 0.17, z, 0.035, 0.035, 0.035, C('#e5383b', -0.4), 6, 4); });
      for (let i = 0; i < pins.length - 1; i++) { const a = pins[i], b = pins[i + 1]; limb(mb, [-8.33, a[1] + 0.17, a[0]], [-8.33, b[1] + 0.17, b[0]], [0.008, 0.008], C('#d62828', 0.3), 3, null, 1); }
      // dosya dolapları, kasa, portmanto
      for (let k = 0; k < 3; k++) { const x = 5.6 + k * 0.82; mb.box(x - 0.38, 0, -7.75, x + 0.38, 1.45, -7.05, C('#5d6670', -0.6)); for (let d = 0; d < 3; d++) { mb.box(x - 0.34, 0.12 + d * 0.45, -7.05, x + 0.34, 0.5 + d * 0.45, -7.02, C('#6f7983', -0.6)); mb.box(x - 0.1, 0.38 + d * 0.45, -7.02, x + 0.1, 0.42 + d * 0.45, -6.99, C('#c9ced6', -0.9)); } }
      mb.box(-7.9, 0, -6.6, -6.9, 1.1, -5.7, C('#2b2d33', -0.7)); mb.cyl(-7.4, 0.55, -5.69, 0.14, 0.55, 0.14, 12, C('#c9a34a', -0.9), C('#c9a34a', -0.9)); mb.push().T(-7.4, 0.55, -5.69, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.16, 0.04, 0.16, 14, C('#c9a34a', -0.9), C('#c9a34a', -0.9)); mb.pop();
      const P = C('#2a1d16', -0.3); mb.cyl(7.5, 0, -4.2, 0.25, 0.06, 0.22, 12, P, P); mb.cyl(7.5, 0.06, -4.2, 0.03, 1.9, 0.03, 6, P, P, ''); for (let k = 0; k < 4; k++) { const a = k * 1.57; limb(mb, [7.5, 1.85, -4.2], [7.5 + Math.cos(a) * 0.2, 1.95, -4.2 + Math.sin(a) * 0.2], [0.015, 0.012], P, 4); }
      mb.cyl(7.5, 1.4, -4.2, 0.24, 1.86, 0.17, 12, C('#8a7a5a', 0), C('#8a7a5a', 0), ''); mb.cyl(7.5, 1.96, -4.2, 0.26, 1.99, 0.26, 14, C('#3a3028', 0), C('#3a3028', 0)); mb.cyl(7.5, 1.99, -4.2, 0.15, 2.14, 0.14, 12, C('#3a3028', 0), C('#3a3028', 0));
      // ön bölge (dikey ekranda masanın önü): kırmızı yolluk, yerde dosyalar ve fotoğraflar, evrak çantası, alçak sehpa
      VK.carpet(mb, -1.05, 3.0, 1.05, 10, '#6a1f2a', '#c9a34a', 0.12, 0.0045);
      for (let k = 0; k < 9; k++) { const x = (hs(k, 71) - 0.5) * 6.4, z = 3.9 + hs(k, 72) * 3.2; if (Math.abs(x) < 1.3) continue; mb.push().T(x, 0.006, z, hs(k, 73) * 3); VK.quad(mb, -0.17, -0.12, 0.17, 0.12, C(k % 3 ? '#f4efe2' : '#e6dcc4', 0), 0); if (k % 2) VK.quad(mb, -0.12, -0.08, 0.04, 0.06, C('#5a6670', 0), 0.002); mb.pop(); }
      mb.push().T(2.7, 0, 4.6, -0.5); mb.rbox(-0.38, 0, -0.1, 0.38, 0.5, 0.1, 0.03, C('#3b2a1c', -0.4), 2); mb.box(-0.12, 0.5, -0.03, 0.12, 0.58, 0.03, C('#c9a34a', -0.8)); for (const x of [-0.25, 0.25]) mb.box(x - 0.04, 0.34, 0.1, x + 0.04, 0.42, 0.12, C('#c9a34a', -0.8)); mb.pop();
      mb.push().T(-2.9, 0, 5.0, 0.3); mb.box(-0.6, 0.38, -0.4, 0.6, 0.44, 0.4, C('#2b1a10', -0.5)); for (const [x, z] of [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]]) mb.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.38, z + 0.03, C('#2b1a10', -0.3)); mb.box(-0.4, 0.44, -0.2, 0.05, 0.47, 0.15, C('#c9a34a', 0)); mb.push().T(0.3, 0.45, 0.05); mb.torusN(0, 0, 0, 0.09, 0.015, 0.015, 14, 4, C('#2b2b2b', -0.6)); mb.cyl(0, -0.005, 0, 0.08, 0.005, 0.08, 12, C('#bfe3f5', -0.9), C('#bfe3f5', -0.9)); limb(mb, [0.09, 0, 0], [0.24, 0, 0.06], [0.015, 0.015], C('#2b1a10', 0), 4); mb.pop(); mb.pop();
      for (const s of [-1, 1]) { mb.push().T(s * 6.3, 0, 0.4); mb.cyl(0, TABLE_Y - 0.04, 0, 0.55, TABLE_Y, 0.55, 18, C('#2b1a10', -0.5), C('#2b1a10', -0.5)); mb.cyl(0, 0, 0, 0.08, TABLE_Y, 0.08, 8, C('#2b1a10', 0), C('#2b1a10', 0)); mb.cyl(0.15, TABLE_Y, 0, 0.1, TABLE_Y + 0.03, 0.1, 10, C('#1f4a3a', -0.8), C('#1f4a3a', -0.8)); limb(mb, [0.15, TABLE_Y + 0.03, 0], [0.05, TABLE_Y + 0.35, 0], [0.012, 0.012], C('#c9a34a', -0.9), 4); mb.push().T(0.05, TABLE_Y + 0.38, 0, 0, 0, 0.3); mb.cyl(0, -0.05, 0, 0.16, 0.05, 0.07, 12, C('#1f6b47', -0.85), C('#1f6b47', -0.85), ''); mb.cyl(0, -0.06, 0, 0.12, -0.05, 0.12, 10, C('#fff1c9', 1), C('#fff1c9', 1)); mb.pop(); mb.pop(); }
    },
  },
  /* ---- Doğruluk mu Cesaret mi: ev partisi ---- */
  dcs: {
    table: 'glass', tableO: { glow: '#ff4fd8', top: '#1a1626' }, chair: 'bean', rug: 'round', rugO: { rug: '#2a9d8f', rugB: '#ff5fa2' },
    L: VL.party, sky: ['#190a3a', '#3a1a66', '#1e1030'], posters: 'wall', parts: 'confetti',
    anim: [{ key: 'disco', x: 0, y: 4.3, z: -2.2, ax: 'y', sp: 0.6 }],
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#20142c', 0), -0.01);
      VK.planks(mb, -8.4, -7.8, 8.4, 12, 0.28, ['#4a3528', '#3f2c22', '#54402f'], 'x');
      VK.ledFloor(mb, -6.3, -6.3, 6.3, 8.4, 1.05, ['#ff4fd8', '#4cc9f0', '#ffd23f', '#8a5cf6', '#5be3a9'], '#2a1e3d', 0.34, 0.003);
      vShell(mb, { wall: '#3a1f5c', dado: [0.9, '#2a1545'], top: '#ff5fa2', base: '#150c22' });
      VK.sign(mb, 'neon', '#ff5fa2');
      // kanepe (arka sol), hoparlörler, neon kalp, ışık zinciri
      const SF = C('#ff8a3d', -0.15), SFd = C('#d96a26', -0.15);
      mb.rbox(-7.6, 0.1, -7.75, -3.2, 0.95, -6.75, 0.15, SFd, 3); mb.rbox(-7.5, 0.38, -7.4, -3.3, 0.62, -6.35, 0.14, SF, 3); mb.rbox(-7.75, 0.1, -7.75, -7.35, 0.85, -6.4, 0.12, SFd, 2); mb.rbox(-3.45, 0.1, -7.75, -3.05, 0.85, -6.4, 0.12, SFd, 2);
      for (let k = 0; k < 3; k++) mb.rbox(-7.0 + k * 1.3, 0.62, -7.45, -6.0 + k * 1.3, 1.1, -7.1, 0.12, C(['#4cc9f0', '#ffd23f', '#8a5cf6'][k], -0.2), 2);
      for (const x of [3.6, 7.4]) { mb.box(x - 0.45, 0, -7.6, x + 0.45, 1.9, -6.9, C('#16121e', -0.5)); for (const [y, r] of [[0.55, 0.3], [1.35, 0.2], [1.72, 0.08]]) { mb.cyl(x, y, -6.89, r, y, r, 16, C('#2b2638', -0.8), C('#2b2638', -0.8)); mb.push().T(x, y, -6.9, 0, Math.PI / 2); mb.cyl(0, 0, 0, r, 0.02, r * 0.85, 16, C('#3a3448', -0.8), C('#4cc9f0', 0.6)); mb.pop(); } }
      mb.push().T(5.5, 3.3, -7.78, 0, 0, 0, 1.3, 1.3, 0.2); heartShape(mb, C('#ff3ea5', 1)); mb.pop();
      VK.bulbs(mb, [-8.3, 4.3, -7.6], [8.3, 4.3, -7.6], 22, 0.6, ['#ff5fa2', '#4cc9f0', '#ffd23f', '#5be3a9']);
      for (const s of [-1, 1]) { VK.bulbs(mb, [s * 8.3, 4.2, -7.5], [s * 8.3, 4.0, 6], 16, 0.5, ['#ffd23f', '#ff5fa2', '#4cc9f0']); }
      // lav lambaları, yerde pizza kutusu, balon kümesi
      for (const [x, z, c] of [[-7.6, -4.2, '#ff5fa2'], [7.6, -4.6, '#5be3a9']]) { mb.cyl(x, 0, z, 0.2, 0.12, 0.15, 12, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); mb.lathe(x, 0.12, z, [[0.12, 0], [0.16, 0.25], [0.1, 0.55], [0.06, 0.6]], 12, C(c, 0.6)); mb.cyl(x, 0.72, z, 0.07, 0.8, 0.03, 10, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); }
      mb.box(6.2, 0, 4.6, 6.9, 0.05, 5.3, C('#d9c39a', 0)); mb.box(6.25, 0.05, 4.65, 6.85, 0.055, 5.25, C('#c8453a', 0));
      // ön bölge: yer minderleri, pizza kutusu, bardaklar, yerde konfeti
      for (const [x, z, c] of [[-2.8, 4.7, '#ffd23f'], [2.9, 5.1, '#4cc9f0'], [-1.6, 6.4, '#8a5cf6']]) { mb.sphereS(x, 0.2, z, 0.42, 0.24, 0.4, C(c, -0.15), 12, 7); mb.sphereS(x, 0.36, z - 0.24, 0.34, 0.24, 0.14, C(c, -0.15), 10, 6); }
      mb.push().T(1.2, 0, 5.6, 0.4); mb.box(-0.36, 0, -0.36, 0.36, 0.05, 0.36, C('#d9c39a', 0)); mb.cyl(0, 0.05, 0, 0.3, 0.06, 0.3, 16, C('#e9a23b', 0), C('#c8453a', 0)); for (let k = 0; k < 5; k++) { const a = k * 1.25; mb.sphereS(Math.cos(a) * 0.17, 0.065, Math.sin(a) * 0.17, 0.04, 0.012, 0.04, C('#8a1f1a', 0), 6, 3); } mb.push().T(0, 0.05, -0.36, 0, -1.2); mb.box(-0.36, 0, 0, 0.36, 0.03, 0.72, C('#e2cfa8', 0)); mb.pop(); mb.pop();
      for (const [x, z, c] of [[-3.6, 6.0, '#e63946'], [3.8, 6.4, '#4cc9f0'], [0.2, 7.0, '#5be3a9']]) { mb.cyl(x, 0, z, 0.06, 0.16, 0.08, 10, C(c, -0.5), C('#ffffff', 0)); }
      for (let k = 0; k < 60; k++) { const x = (hs(k, 81) - 0.5) * 9, z = 3.6 + hs(k, 82) * 5; if (Math.abs(x) < 1.1 && z < 4.2) continue; mb.push().T(x, 0.0045, z, hs(k, 83) * 3); VK.quad(mb, -0.035, -0.02, 0.035, 0.02, C(['#ff5fa2', '#4cc9f0', '#ffd23f', '#5be3a9', '#ffffff'][k % 5], 0.3), 0); mb.pop(); }
      for (const [x, z] of [[-7.4, 2.2], [7.5, 1.4]]) for (let k = 0; k < 4; k++) { const bx = x + (hs(k, x) - 0.5) * 0.5, bz = z + (hs(k, z) - 0.5) * 0.5, h = 1.6 + k * 0.35; limb(mb, [x, 0.2, z], [bx, h, bz], [0.004, 0.004], C('#f4f4f4', 0), 3, null, 1); mb.sphereS(bx, h + 0.2, bz, 0.18, 0.22, 0.18, C(['#ff5fa2', '#4cc9f0', '#ffd23f', '#8a5cf6'][k], -0.7), 10, 7); }
    },
  },
  /* ---- Kim Yapar: sınıf (gizli oy sandığı öğretmen masasında) ---- */
  kyp: {
    table: 'wood', tableO: { wood: '#d4b083' }, chair: 'school', rug: null,
    L: VL.day, sky: ['#7fb6ff', '#e6f0ff', '#d9dfe6'], posters: 'wall', board: 'chalk', parts: 'dust',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#8a8478', 0), -0.01);
      VK.tiles(mb, -8.4, -7.8, 8.4, 12, 0.6, '#d8cfb8', '#c4bba3', '#a39a84', -0.35);
      vShell(mb, { wall: '#efe6cf', dado: [1.2, '#6f9a7a'], top: '#d6cbb0', base: '#4a5a4e' });
      VK.sign(mb, 'chalk', '#8a5a34', '#2c3a33');
      // saat, harita, sol duvarda gündüz pencereleri
      mb.cyl(0, 3.6, -7.79, 0.36, 3.6, 0.36, 24, C('#2b2b2b', 0), C('#2b2b2b', 0)); mb.push().T(0, 3.6, -7.79, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.36, 0.05, 0.36, 24, C('#2b2b2b', 0), C('#fbf8f0', 0)); mb.pop(); mb.box(-0.015, 3.6, -7.73, 0.015, 3.86, -7.72, C('#111111', 0)); mb.box(0, 3.585, -7.73, 0.2, 3.615, -7.72, C('#111111', 0));
      mb.box(3.0, 1.5, -7.79, 6.6, 3.6, -7.77, C('#cfe6f5', 0)); for (const [x, y, w, h, c] of [[3.6, 2.4, 0.9, 0.7, '#7fb069'], [4.8, 2.9, 1.1, 0.5, '#e6b86a'], [5.6, 2.1, 0.7, 0.6, '#d9826a'], [3.9, 3.2, 0.6, 0.3, '#7fb069']]) mb.box(x - w / 2, y - h / 2, -7.769, x + w / 2, y + h / 2, -7.765, C(c, 0)); mb.rbox(2.95, 1.45, -7.8, 6.65, 3.65, -7.76, 0.02, C('#8a5a34', 0), 1);
      for (const z of [-5.2, 0.6, 4.4]) { VK.win(mb, z, 2.6, 2.2, 2.0, -8.4, 1, '#f4f1ea', C('#d9f0ff', 1), 'x'); VK.plant(mb, -8.1, z, 0.55, '#c8693a', '#4f9a52'); }
      // sağ duvarda dolaplar
      for (let k = 0; k < 5; k++) { const z = -7.2 + k * 0.62, col = ['#e63946', '#3a86ff', '#ffbe0b', '#2a9d8f'][k % 4]; mb.box(7.95, 0, z, 8.4, 2.0, z + 0.58, C(col, -0.5)); for (let v = 0; v < 3; v++) mb.box(7.93, 1.5 + v * 0.1, z + 0.12, 7.95, 1.54 + v * 0.1, z + 0.46, C('#222222', 0)); mb.box(7.93, 1.0, z + 0.44, 7.95, 1.12, z + 0.5, C('#c9ced6', -0.9)); }
      // öğretmen masası: küre ve gizli oy sandığı
      mb.push().T(-5.4, 0, -6.4); mb.box(-1.2, 0, -0.45, 1.2, 0.76, 0.45, C('#8a5a34', 0)); mb.box(-1.25, 0.76, -0.5, 1.25, 0.8, 0.5, C('#a8743f', -0.3)); mb.push().T(-0.7, 0.8, 0, 0, 0, 0, 0.36); DECOR.globe(mb, ['#ffffff'], 0); mb.pop();
      mb.box(0.15, 0.8, -0.25, 0.85, 1.3, 0.25, C('#f4f6fb', -0.8)); mb.box(0.15, 0.8, -0.25, 0.85, 0.84, 0.25, C('#1d3557', 0)); mb.box(0.3, 1.3, -0.03, 0.7, 1.305, 0.03, C('#111111', 0)); mb.box(0.36, 1.0, 0.251, 0.64, 1.16, 0.255, C('#c1121f', 0)); mb.pop();
      // ön bölge: iki öğrenci sırası (tahtaya dönük), yerde çanta ve top
      for (const s of [-1, 1]) { mb.push().T(s * 2.7, 0, 5.0, 0); mb.box(-0.6, 0.7, -0.3, 0.6, 0.74, 0.3, C('#d4b083', -0.3)); mb.box(-0.6, 0.55, -0.3, 0.6, 0.58, 0.25, C('#b8946a', 0)); for (const [x2, z2] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) mb.cyl(x2, 0, z2, 0.02, 0.7, 0.02, 6, C('#8a9099', -0.8), C('#8a9099', -0.8), ''); mb.box(-0.3, 0.74, -0.15, 0.1, 0.76, 0.12, C(s < 0 ? '#3a86ff' : '#e63946', 0)); mb.box(0.2, 0.74, -0.05, 0.45, 0.75, 0.0, C('#ffbe0b', 0)); mb.push().T(0, 0, 0.55, Math.PI); CHAIRS.school.base(mb, {}); CHAIRS.school.pad(mb); mb.pop(); mb.pop(); }
      mb.push().T(1.0, 0, 4.9, 0.5); mb.rbox(-0.22, 0, -0.12, 0.22, 0.42, 0.12, 0.08, C('#2a9d8f', -0.3), 2); mb.rbox(-0.16, 0.08, 0.1, 0.16, 0.26, 0.17, 0.05, C('#ffbe0b', -0.3), 2); mb.pop();
      mb.push().T(-1.1, 0, 6.3, 0, 0, 0, 0.32); DECOR.ball(mb, ['#ff6f61', '#ffffff', '#3a86ff'], 1); mb.pop();
      // yanlarda sıralar
      for (const s of [-1, 1]) for (const z of [-2.4, 1.2]) { mb.push().T(s * 6.6, 0, z, 0); mb.box(-0.6, 0.7, -0.3, 0.6, 0.74, 0.3, C('#d4b083', -0.3)); for (const [x2, z2] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) mb.cyl(x2, 0, z2, 0.02, 0.7, 0.02, 6, C('#8a9099', -0.8), C('#8a9099', -0.8), ''); mb.push().T(0, 0, 0.55, Math.PI); CHAIRS.school.base(mb, {}); CHAIRS.school.pad(mb); mb.pop(); mb.pop(); }
    },
  },
  /* ---- Tostuna Dövüş: gün batımında tost büfesi ---- */
  tdv: {
    table: 'metal', tableO: { top: '#f2f2f2', trim: '#e63946' }, chair: 'stool', chairO: { leg: '#c9ced6' }, rug: null,
    L: VL.dusk, sky: ['#ff7b54', '#ffd6a5', '#f0b48a'], posters: 'poles',
    build(mb) {
      VK.ground(mb, '#9a8f84', '#857a70', 0.2);
      VK.tiles(mb, -11, -8.2, 11, 12, 0.5, '#8d8a84', '#7b7872', '#5a5752', -0.1, 0.004, true);
      // büfe: cephe, tente, tezgâh penceresi, tost makinesi, buzdolabı
      mb.box(-6.5, 0, -10.2, 6.5, 3.4, -7.86, C('#f2e6d0', 0));
      mb.box(-6.6, 3.4, -10.3, 6.6, 3.65, -7.8, C('#c8261c', 0));
      for (let k = 0; k < 16; k++) { const x0 = -6.5 + k * (13 / 16), x1 = x0 + 13 / 16, n = vnorm([0, 0.8, 1]); mb.quadN([x0, 3.25, -7.86], [x1, 3.25, -7.86], [x1, 2.75, -6.96], [x0, 2.75, -6.96], n, n, n, n, C(k % 2 ? '#ffffff' : '#e63946', 0)); }
      VK.sign(mb, 'wall', '#c8261c', '#fff8ec');
      mb.box(-6.0, 0.95, -7.86, -2.3, 2.55, -7.845, C('#ffe9c2', 0.9)); mb.box(-6.1, 0.9, -7.86, -2.2, 1.0, -7.4, C('#c9ced6', -0.8));
      mb.box(-5.6, 1.0, -7.8, -4.4, 1.22, -7.5, C('#3a3d44', -0.6)); mb.box(-5.62, 1.22, -7.82, -4.38, 1.3, -7.48, C('#5a5f68', -0.7)); mb.box(-5.5, 1.13, -7.5, -4.5, 1.17, -7.48, C('#ff7a1f', 1));
      for (let k = 0; k < 5; k++) mb.cyl(-3.9 + k * 0.28, 1.0, -7.65, 0.09, 1.28, 0.08, 10, C('#f4f6fb', -0.4), C('#2f6db0', -0.4));
      mb.box(2.4, 0, -7.86, 4.4, 2.5, -7.5, C('#d9dce1', -0.6)); mb.box(2.5, 0.2, -7.5, 4.3, 2.3, -7.48, C('#bfe9ff', 0.7)); for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) mb.cyl(2.7 + k * 0.29, 0.35 + r * 0.5, -7.62, 0.08, 0.68 + r * 0.5, 0.08, 8, C(['#e63946', '#ffb703', '#2a9d8f', '#fb8500'][(k + r) % 4], -0.6), C('#ffffff', -0.6));
      // sokak: lambalar, bank, çöp kutusu, saksılar; arkada apartmanlar
      for (const s of [-1, 1]) { VK.lampPost(mb, s * 7.4, -6.2, 3.6, '#fff1c9'); VK.plant(mb, s * 5.4, -7.6, 0.9, '#9a8f84', '#3f8f52'); }
      mb.push().T(-7.6, 0, 1.5, Math.PI / 2); mb.box(-0.9, 0.42, -0.25, 0.9, 0.48, 0.25, C('#8a5a34', 0)); mb.box(-0.9, 0.5, -0.3, 0.9, 0.9, -0.24, C('#8a5a34', 0)); for (const x of [-0.8, 0.8]) mb.box(x - 0.04, 0, -0.28, x + 0.04, 0.48, 0.24, C('#2f3338', -0.5)); mb.pop();
      mb.cyl(7.6, 0, 1.2, 0.28, 0.9, 0.3, 12, C('#3f6b3a', -0.4), C('#3f6b3a', -0.4));
      // yanlarda: kuryenin motoru (sağ), ayakta yeme masası ve iki yüksek tabure (sol)
      mb.push().T(5.5, 0, -3.2, -0.5); const MR = C('#e63946', -0.5), MD = C('#22252b', -0.4); for (const x of [-0.5, 0.52]) { mb.push().T(x, 0.24, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.17, 0.07, 0.07, 16, 6, MD); mb.cyl(0, -0.05, 0, 0.11, 0.05, 0.11, 10, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); mb.pop(); } mb.rbox(-0.6, 0.28, -0.17, 0.42, 0.58, 0.17, 0.08, MR, 2); mb.rbox(-0.5, 0.58, -0.15, 0.02, 0.68, 0.15, 0.05, MD, 2); mb.push().T(0.42, 0.25, 0, 0, 0, -0.25); mb.rbox(-0.06, 0, -0.18, 0.06, 0.72, 0.18, 0.04, MR, 2); mb.pop(); limb(mb, [0.55, 0.9, 0], [0.6, 1.08, 0], [0.025, 0.025], MD, 4); limb(mb, [0.6, 1.08, -0.3], [0.6, 1.08, 0.3], [0.02, 0.02], MD, 4); mb.sphereS(0.66, 0.98, 0, 0.07, 0.07, 0.06, C('#fff1c9', 0.9), 8, 5); mb.box(-0.8, 0.68, -0.25, -0.28, 1.1, 0.25, C('#ffffff', -0.3)); mb.box(-0.81, 0.82, -0.26, -0.27, 0.92, 0.26, C('#e63946', 0)); mb.pop();
      mb.push().T(-5.4, 0, -3.0); const ST = C('#c9ced6', -0.85); mb.cyl(0, 0, 0, 0.32, 0.04, 0.3, 14, ST, ST); mb.cyl(0, 0.04, 0, 0.04, 1.05, 0.04, 8, ST, ST, ''); mb.cyl(0, 1.05, 0, 0.42, 1.09, 0.42, 18, C('#e63946', -0.5), C('#f2f2f2', -0.8)); mb.cyl(0.1, 1.09, -0.05, 0.07, 1.2, 0.06, 10, C('#f4f6fb', -0.4), C('#2f6db0', -0.4)); mb.push().T(-0.12, 1.09, 0.1, 0.5); mb.box(-0.12, 0, -0.08, 0.12, 0.05, 0.08, C('#d9a35a', 0)); mb.pop(); for (const [x, z] of [[-0.7, 0.3], [0.65, 0.45]]) { mb.cyl(x, 0, z, 0.2, 0.03, 0.2, 12, ST, ST); mb.cyl(x, 0.03, z, 0.03, 0.72, 0.03, 6, ST, ST, ''); mb.torusN(x, 0.35, z, 0.14, 0.012, 0.012, 12, 4, ST); mb.cyl(x, 0.72, z, 0.19, 0.78, 0.18, 14, C('#e63946', -0.4), C('#e63946', -0.4)); } mb.pop();
      // ön bölge: kaldırım kenarı, yaya geçidi, menü panosu, çöp kutusu, ekmek kasaları, rögar kapağı
      VK.quad(mb, -12, 6.2, 12, 6.45, C('#c9c4ba', 0), 0.007); VK.quad(mb, -12, 6.45, 12, 12, C('#4a4d52', 0), 0.0065);
      for (let k = 0; k < 6; k++) VK.quad(mb, -2.75 + k * 0.95, 7.0, -2.2 + k * 0.95, 9.5, C('#f2f2f2', 0), 0.008);
      mb.push().T(-2.7, 0, 4.7, 0.35); const MW = C('#8a5a34', 0); for (const s of [-1, 1]) { mb.push().T(0, 0, s * 0.22, 0, s * 0.2); mb.box(-0.36, 0, -0.03, 0.36, 1.0, 0.03, MW); mb.box(-0.3, 0.12, s * 0.035 - 0.005, 0.3, 0.92, s * 0.035 + 0.005, C('#2c3a33', 0)); for (let r = 0; r < 4; r++) mb.box(-0.22, 0.32 + r * 0.15, s * 0.042 - 0.002, -0.22 + 0.22 + hs(r, s + 2) * 0.2, 0.35 + r * 0.15, s * 0.042 + 0.002, C(r ? '#f4efe2' : '#ffd23f', 0)); mb.pop(); } mb.pop();
      mb.cyl(3.0, 0, 5.0, 0.26, 0.85, 0.28, 12, C('#2f6db0', -0.5), C('#2f6db0', -0.5)); mb.cyl(3.0, 0.85, 5.0, 0.3, 0.92, 0.3, 12, C('#1d4f8a', -0.5), C('#1d4f8a', -0.5));
      mb.push().T(1.6, 0, 5.4, 0.2); mb.box(-0.4, 0, -0.3, 0.4, 0.3, 0.3, C('#e9c46a', -0.2)); for (let k = 0; k < 3; k++) mb.rbox(-0.3 + k * 0.22, 0.3, -0.2, -0.12 + k * 0.22, 0.42, 0.2, 0.06, C('#d9a35a', 0), 2); mb.pop();
      mb.cyl(-0.8, 0, 7.6, 0.42, 0.012, 0.42, 18, C('#3a3d44', -0.6), C('#3a3d44', -0.6)); for (let k = -2; k <= 2; k++) mb.box(-0.8 + k * 0.14 - 0.02, 0.012, 7.3, -0.8 + k * 0.14 + 0.02, 0.016, 7.9, C('#22252b', 0));
      for (let k = 0; k < 7; k++) { const x = -15 + k * 5, h = 6 + hs(k, 3) * 6; mb.box(x - 2.2, 0, -16, x + 2.2, h, -12, C(['#e9c9a8', '#d8b08a', '#f0d6b8', '#c99e7a'][k % 4], 0)); for (let y = 1.5; y < h - 0.8; y += 1.6) for (let c = 0; c < 3; c++) { const lit = hs(k * 9 + c, y) > 0.45; mb.box(x - 1.6 + c * 1.25, y, -11.99, x - 1.0 + c * 1.25, y + 0.9, -11.95, C(lit ? '#ffd27a' : '#5a6a80', lit ? 0.5 : -0.6)); } }
    },
  },
  /* ---- Bu mu Şu mu: pazar yeri (iki tezgâh, terazi masada) ---- */
  bms: {
    table: 'wood', tableO: { wood: '#9a6a3f' }, chair: 'stool', chairO: { leg: '#6b4428', gloss: -0.1 }, rug: 'straw',
    L: VL.day, sky: ['#58c4ff', '#ffe9d6', '#f1e6d6'], posters: 'poles',
    build(mb) {
      VK.ground(mb, '#b7a58c', '#a8957a', 0.2);
      VK.tiles(mb, -10, -8.5, 10, 12, 0.42, '#b5653d', '#a65a34', '#7a4a32', -0.1, 0.004, true);
      VK.sign(mb, 'stand', '#6b4428', '#fff8ec');
      // iki tezgâh: mavi ve turuncu tente, kasalarda ürün
      const stall = (cx, awnA, awnB, fruit) => {
        mb.push().T(cx, 0, -6.9);
        const W = C('#8a5a34', 0);
        for (const [x, z] of [[-1.9, -0.7], [1.9, -0.7], [-1.9, 0.7], [1.9, 0.7]]) mb.box(x - 0.06, 0, z - 0.06, x + 0.06, 2.6, z + 0.06, W);
        mb.box(-2.0, 0.85, -0.75, 2.0, 0.95, 0.75, C('#a8743f', 0));
        for (let k = 0; k < 10; k++) { const x0 = -2.1 + k * 0.42, n = vnorm([0, 1, 0.5]); mb.quadN([x0, 2.6, -0.8], [x0 + 0.42, 2.6, -0.8], [x0 + 0.42, 2.25, 1.05], [x0, 2.25, 1.05], n, n, n, n, C(k % 2 ? awnA : awnB, 0)); }
        for (let k = 0; k < 4; k++) { const x = -1.5 + k * 1.0; mb.box(x - 0.44, 0.95, -0.55, x + 0.44, 1.2, 0.55, C('#c8a06a', 0)); for (let j = 0; j < 9; j++) mb.sphereS(x - 0.28 + (j % 3) * 0.28, 1.27, -0.3 + Math.floor(j / 3) * 0.3, 0.13, 0.12, 0.13, C(fruit[(k + j) % fruit.length], -0.3), 6, 4); }
        for (let k = 0; k < 3; k++) { const x = -1.2 + k * 1.2; mb.box(x - 0.45, 0, 0.35, x + 0.45, 0.45, 0.85, C('#b08455', 0)); for (let j = 0; j < 4; j++) mb.sphereS(x - 0.24 + (j % 2) * 0.48, 0.5, 0.48 + Math.floor(j / 2) * 0.22, 0.14, 0.12, 0.13, C(fruit[(k + j + 1) % fruit.length], -0.3), 6, 4); }
        mb.pop();
      };
      stall(-5.6, '#3a86ff', '#ffffff', ['#ff7b2a', '#ffb703', '#e63946', '#7fb069']);
      stall(5.6, '#ff9f5a', '#ffffff', ['#6a3d9a', '#e63946', '#7fb069', '#f4d35e']);
      VK.flags(mb, [-8.5, 3.3, -5.0], [8.5, 3.3, -5.0], 20, 0.7, ['#3a86ff', '#ffffff', '#ff9f5a', '#ffd23f']);
      // çuvallar, karpuz arabası, kasa yığınları
      for (const [x, z, c] of [[-7.6, -2.6, '#d9c39a'], [-7.2, -1.8, '#cbb38a'], [7.6, -2.2, '#d9c39a']]) mb.rbox(x - 0.35, 0, z - 0.3, x + 0.35, 0.8, z + 0.3, 0.25, C(c, 0), 3);
      mb.push().T(7.3, 0, 1.6, 0.4); mb.box(-0.8, 0.5, -0.5, 0.8, 0.8, 0.5, C('#8a5a34', 0)); for (const s of [-1, 1]) { mb.push().T(s * 0.5, 0.32, 0.55, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.3, 0.05, 0.05, 14, 5, C('#3a2a1e', 0)); mb.pop(); } for (let j = 0; j < 5; j++) mb.sphereS(-0.5 + j * 0.25, 0.98, (j % 2) * 0.2 - 0.1, 0.22, 0.2, 0.22, C('#3f8f3a', -0.4), 10, 7); mb.pop();
      for (const [x, z] of [[-7.5, 1.8], [-6.8, 2.6]]) { mb.push().T(x, 0, z, 0.3, 0, 0, 0.7); DECOR.crate(mb, ['#3a86ff'], 1); mb.pop(); }
      for (let k = 0; k < 6; k++) { const x = -16 + k * 6.4; mb.box(x - 2.6, 0, -18, x + 2.6, 5 + hs(k, 1) * 3, -14, C(['#f0d6b8', '#e9c9a8', '#d8b08a'][k % 3], 0)); }
      // ön bölge: meyve kasaları, hasır sepet, karpuz yığını
      const FR = ['#ff7b2a', '#e63946', '#7fb069', '#f4d35e', '#6a3d9a'];
      for (const [x, z, r, k0] of [[-2.7, 4.7, 0.25, 0], [-2.2, 5.5, -0.15, 2], [2.8, 4.9, -0.3, 1]]) { mb.push().T(x, 0, z, r); mb.box(-0.4, 0, -0.3, 0.4, 0.34, 0.3, C('#c8a06a', 0)); for (const zz of [-0.3, 0.3]) mb.box(-0.42, 0.08, zz - 0.015, 0.42, 0.14, zz + 0.015, C('#a8743f', 0)); for (let j = 0; j < 9; j++) mb.sphereS(-0.26 + (j % 3) * 0.26, 0.4, -0.18 + Math.floor(j / 3) * 0.18, 0.12, 0.11, 0.12, C(FR[(k0 + j) % 5], -0.3), 7, 5); mb.pop(); }
      mb.push().T(-0.9, 0, 6.3); mb.lathe(0, 0, 0, [[0.2, 0], [0.3, 0.26], [0.32, 0.28]], 14, (k, a) => C(Math.floor(a * 8 / TAU) % 2 ? '#d8bf86' : '#c9ab6c', 0), ''); for (let j = 0; j < 7; j++) mb.sphereS((hs(j, 1) - 0.5) * 0.32, 0.3 + hs(j, 2) * 0.06, (hs(j, 3) - 0.5) * 0.32, 0.1, 0.09, 0.1, C(j % 2 ? '#ffb703' : '#ff7b2a', -0.3), 7, 5); mb.pop();
      for (const [x, z, y] of [[2.0, 6.2, 0.2], [2.45, 6.3, 0.2], [2.2, 6.6, 0.2], [2.2, 6.35, 0.52]]) mb.sphereS(x, y, z, 0.24, 0.21, 0.24, C('#3f8f3a', -0.4), 12, 8);
    },
  },
  /* ---- Bil Bakalım: TV yarışma stüdyosu ---- */
  bil: {
    table: 'console', tableO: { metal: '#1f2a5c', glow: '#ffd23f' }, chair: 'pod', rug: 'led', rugO: { glow: '#ffd23f', rug: '#101530' },
    L: VL.studio, sky: ['#0d0f22', '#1a1f44', '#0e1024'], posters: false, parts: 'sparkle',
    build(mb) {
      VK.quad(mb, -24, -14, 24, 18, C('#0b0d1c', 0), -0.01);
      VK.tiles(mb, -9, -8.2, 9, 12, 1.5, '#161b3d', '#1b2148', '#0d1028', -0.85);
      for (let k = 0; k < 3; k++) mb.lathe(0, 0.012 + k * 0.001, 0, [[5.2 + k * 1.4, 0], [5.12 + k * 1.4, 0]], 72, C(['#4cc9f0', '#8a5cf6', '#ff5fa2'][k], 1));
      // LED duvar: tabela ortada, yanlarda renkli paneller
      mb.box(-9, 0, -8.6, 9, 5.4, -8.2, C('#0a0c18', -0.4));
      for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) { const x = -8.6 + i * 1.45, y = 0.4 + j * 1.25; if (Math.abs(x + 0.6) < 2.6 && y < 3.2) continue; const t = (i + j) / 14; mb.box(x, y, -8.2, x + 1.38, y + 1.18, -8.18, rgbA(mix3(hexRGB('#3a2fb8'), hexRGB('#ff4fd8'), t), 0.9)); }
      VK.sign(mb, 'screen');
      // ışık kafesi ve projektörler
      for (const z of [-6.8, -1.0]) { mb.box(-8, 5.0, z - 0.18, 8, 5.36, z + 0.18, C('#3a3f4a', -0.7)); for (let k = 0; k < 7; k++) { const x = -6 + k * 2; mb.push().T(x, 4.75, z, 0, z < -3 ? 0.6 : -0.6); mb.cyl(0, -0.2, 0, 0.16, 0.2, 0.22, 10, C('#22252c', -0.6), C('#22252c', -0.6)); mb.cyl(0, -0.21, 0, 0.14, -0.2, 0.14, 10, C(k % 2 ? '#fff3c4' : '#9fd8ff', 1), C(k % 2 ? '#fff3c4' : '#9fd8ff', 1)); mb.pop(); } }
      // yanlarda seyirci tribünleri (renkli ışıklı basamaklar)
      for (const s of [-1, 1]) for (let r = 0; r < 4; r++) { const x = s * (7.2 + r * 0.75); mb.box(Math.min(x, x + s * 0.75), 0, -6, Math.max(x, x + s * 0.75), 0.35 + r * 0.45, 5, C('#1c2048', -0.5)); mb.box(Math.min(x, x + s * 0.75), 0.35 + r * 0.45, -6, Math.max(x, x + s * 0.75), 0.37 + r * 0.45, 5, C(['#4cc9f0', '#ff5fa2', '#ffd23f', '#8a5cf6'][r], 1)); for (let k = 0; k < 9; k++) { const z = -5.4 + k * 1.25; if (hs(k, r + s) > 0.55) continue; mb.sphereS(x + s * 0.38, 0.8 + r * 0.45, z, 0.18, 0.22, 0.16, C(['#e63946', '#3a86ff', '#ffbe0b', '#2fbf71', '#f15bb5'][(k + r) % 5], -0.2), 8, 6); mb.sphereS(x + s * 0.38, 1.12 + r * 0.45, z, 0.12, 0.13, 0.12, C(['#f2c39a', '#c68a5e', '#e6b08a'][(k + r) % 3], 0), 8, 6); } }
      // ön bölge: tekerlekli stüdyo kamerası, yerde bant işaretleri, sahne monitörü, kablolar
      mb.push().T(2.7, 0, 5.3, -2.75); const KM = C('#22252c', -0.6); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42], [0, 0.2, 0], [0.04, 0.035], KM, 5); mb.sphereS(Math.cos(a) * 0.42, 0.05, Math.sin(a) * 0.42, 0.06, 0.05, 0.06, C('#111111', -0.5), 6, 4); } mb.cyl(0, 0.2, 0, 0.06, 1.25, 0.05, 8, KM, KM); mb.box(-0.2, 1.25, -0.35, 0.2, 1.6, 0.25, KM); mb.push().T(0, 1.42, 0.25, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.12, 0.3, 0.13, 12, C('#111111', -0.9), C('#3a4a6a', -0.9)); mb.pop(); mb.box(-0.05, 1.6, -0.2, 0.05, 1.66, -0.1, C('#ff3b30', 1)); mb.box(-0.16, 1.3, -0.37, 0.16, 1.52, -0.35, C('#9fd8ff', 0.9)); mb.pop();
      for (const [x, z, c] of [[-1.6, 4.6, '#ffd23f'], [1.4, 4.4, '#4cc9f0'], [-0.2, 6.2, '#ff5fa2']]) { mb.push().T(x, 0.013, z, 0.785); for (const r of [0, Math.PI / 2]) { mb.push().T(0, 0, 0, r); VK.quad(mb, -0.25, -0.035, 0.25, 0.035, C(c, 0.6), 0); mb.pop(); } mb.pop(); }
      mb.push().T(-2.6, 0, 4.9, 0.4); mb.push().T(0, 0, 0, 0, -0.5); mb.box(-0.45, 0, -0.2, 0.45, 0.42, 0.2, C('#15171c', -0.6)); mb.box(-0.38, 0.06, 0.2, 0.38, 0.36, 0.205, C('#2b3a66', 0.85)); mb.pop(); mb.pop();
      { const pts = []; for (let k = 0; k <= 12; k++) pts.push([2.6 - k * 0.42 + Math.sin(k) * 0.2, 5.5 + k * 0.18 + Math.sin(k * 0.7) * 0.3]); for (let k = 0; k < pts.length - 1; k++) limb(mb, [pts[k][0], 0.02, pts[k][1]], [pts[k + 1][0], 0.02, pts[k + 1][1]], [0.02, 0.02], C('#05060c', -0.3), 4, null, 1); }
      // kamera vinci
      mb.push().T(-6.2, 0, 4.4, 0.6); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [0, 1.3, 0], [0.03, 0.025], C('#22252c', -0.6), 5); } mb.box(-0.3, 1.3, -0.2, 0.3, 1.7, 0.4, C('#22252c', -0.6)); mb.cyl(0, 1.5, 0.4, 0.12, 1.5, 0.12, 10, C('#111111', -0.9), C('#111111', -0.9)); mb.push().T(0, 1.5, 0.4, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.12, 0.28, 0.14, 12, C('#111111', -0.9), C('#3a4a6a', -0.9)); mb.pop(); mb.box(-0.06, 1.62, -0.28, 0.06, 1.7, -0.2, C('#ff3b30', 1)); mb.pop();
    },
  },
  /* ---- Vampir Köylü: gece köy meydanı ---- */
  vkl: {
    table: 'stump', chair: 'stump', rug: 'patch', rugO: { rug: '#4a3a2a' },
    sky: ['#1b2050', '#5a3f7a', '#2a2440'], posters: 'poles', parts: 'fireflies',
    build(mb) {
      VK.ground(mb, '#3f5a36', '#2f4a2c', 0.25);
      mb.disc(0, 0.004, 0, 6.6, 6.6, 36, C('#7d746a', 0), C('#7d746a', 0), MK_JIT);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 10 + r * 7; k++) { const a = (k / (10 + r * 7)) * TAU + r * 0.3, rr = 4.7 + r * 0.5; mb.push().T(Math.cos(a) * rr, 0.006, Math.sin(a) * rr, -a); mb.rbox(-0.2, 0, -0.14, 0.2, 0.02, 0.14, 0.04, C(hs(k, r) > 0.5 ? '#8f877c' : '#6f675d', 0), 1); mb.pop(); }
      VK.sign(mb, 'stand', '#4a2e1c', '#f1e9d2');
      // evler (pencereler gece yanar), saat kulesi, kuyu, çit, çamlar
      const H = [[-6.4, -9.6, 0.15, 4.2, 3.4, 3.0, '#c9b79a', '#6b2a2a'], [6.6, -9.4, -0.2, 4.6, 3.2, 3.2, '#d6c4a4', '#3d4a6b'], [-11.4, -4.2, 1.2, 4.0, 3.6, 2.8, '#bfa98c', '#5a3a2a'], [11.2, -3.6, -1.15, 4.0, 3.4, 3.0, '#cdb894', '#6b2a2a'], [-12, 3.6, 1.6, 3.6, 3.2, 2.6, '#c9b79a', '#3d4a6b'], [12, 4.0, -1.6, 3.6, 3.2, 2.6, '#d6c4a4', '#5a3a2a']];
      H.forEach(([x, z, ry, w, d, h, wc, rc], k) => { mb.push().T(x, 0, z, ry); VK.house(mb, w, d, h, wc, rc, k); mb.pop(); });
      mb.push().T(0, 0, -11.5, 0, 0, 0, 2.2); DECOR.tower(mb, ['#3d4a6b', '#ffd23f'], 0); mb.pop();
      mb.push().T(-6.4, 0, -4.6); mb.cyl(0, 0, 0, 0.75, 0.8, 0.75, 14, C('#8f877c', 0), C('#6f675d', 0), 'b'); mb.cyl(0, 0.7, 0, 0.6, 0.8, 0.6, 14, C('#1b2433', -0.8), C('#1b2433', -0.8)); for (const s of [-1, 1]) mb.box(s * 0.68 - 0.05, 0.8, -0.05, s * 0.68 + 0.05, 2.0, 0.05, C('#4a2e1c', 0)); mb.box(-0.75, 2.0, -0.07, 0.75, 2.1, 0.07, C('#4a2e1c', 0)); mb.cyl(0, 2.0, 0, 0.35, 2.55, 0.0, 6, C('#6b2a2a', 0), C('#6b2a2a', 0), 'b'); mb.pop();
      for (const s of [-1, 1]) { mb.push().T(s * 8.2, 0, 1.2, Math.PI / 2); VK.fence(mb, 6.6, 1.0, '#6b4a2e'); mb.pop(); VK.lampPost(mb, s * 5.2, -6.6, 2.8, '#ffc46b', '#2a1d16'); }
      for (let k = 0; k < 14; k++) { const s = k % 2 ? 1 : -1, x = s * (8.8 + hs(k, 2) * 9), z = -12 + hs(k, 4) * 22; mb.push().T(x, 0, z, 0, 0, 0, 1.6 + hs(k, 6) * 0.9); DECOR.pine(mb, [], k); mb.pop(); }
      mb.sphereS(-8, 8.5, -18, 1.8, 1.8, 0.4, C('#fff6d0', 1), 16, 10);
      // ön bölge: saman balyası, sarımsak örgüleri ve balkabaklı el arabası, yerde yanan iki fener
      mb.push().T(-2.8, 0, 5.0, 0.3); mb.rbox(-0.55, 0, -0.35, 0.55, 0.62, 0.35, 0.1, C('#d9b45a', 0), 2); for (const x of [-0.28, 0.28]) mb.box(x - 0.025, 0, -0.36, x + 0.025, 0.63, 0.36, C('#8a6a2a', 0)); for (let k = 0; k < 10; k++) limb(mb, [-0.5 + k * 0.11, 0.62, (hs(k, 3) - 0.5) * 0.5], [-0.45 + k * 0.11, 0.7, (hs(k, 4) - 0.5) * 0.6], [0.01, 0.005], C('#e9c46a', 0), 3, null, 1); mb.pop();
      mb.push().T(2.8, 0, 5.2, -0.4); mb.box(-0.55, 0.3, -0.35, 0.55, 0.62, 0.35, C('#6b4a2e', 0)); mb.box(-0.58, 0.62, -0.38, 0.58, 0.66, 0.38, C('#4a2e1c', 0)); mb.push().T(0, 0.3, 0.38, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.28, 0.04, 0.04, 14, 5, C('#3a2a1e', 0)); mb.pop(); for (const s2 of [-1, 1]) limb(mb, [s2 * 0.25, 0.45, -0.35], [s2 * 0.3, 0.55, -1.0], [0.03, 0.025], C('#4a2e1c', 0), 4); for (let j = 0; j < 3; j++) { mb.sphereS(-0.3 + j * 0.3, 0.8, 0.05, 0.17, 0.14, 0.17, C('#e07a1f', -0.2), 10, 7); mb.cyl(-0.3 + j * 0.3, 0.92, 0.05, 0.02, 0.98, 0.015, 5, C('#3f5a2a', 0), C('#3f5a2a', 0)); } for (let j = 0; j < 5; j++) mb.sphereS(-0.4 + j * 0.2, 0.7, -0.22, 0.06, 0.07, 0.06, C('#f1e9d2', 0), 6, 4); mb.pop();
      for (const x of [-1.4, 1.5]) { mb.push().T(x, 0, 6.6); mb.box(-0.14, 0, -0.14, 0.14, 0.04, 0.14, C('#2a1d16', -0.4)); mb.box(-0.11, 0.04, -0.11, 0.11, 0.34, 0.11, C('#ffc46b', 0.95)); for (const [a2, b2] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) mb.box(a2 - 0.015, 0.04, b2 - 0.015, a2 + 0.015, 0.36, b2 + 0.015, C('#2a1d16', -0.4)); mb.cyl(0, 0.36, 0, 0.16, 0.44, 0.03, 4, C('#2a1d16', -0.4), C('#2a1d16', -0.4)); mb.pop(); }
    },
  },
  /* ---- Anlat Bakalım: plaj ---- */
  anb: {
    table: 'wood', tableO: { wood: '#b98a55' }, chair: 'beach', rug: 'towel', rugO: { rug: '#00a6a6', rugB: '#ffffff' },
    L: VL.day, sky: ['#27b5ff', '#c9f4ff', '#d6f3ff'], posters: false,
    build(mb) {
      // kuru kum (doygun), ıslak kum şeridi, sığ turkuaz su, derin mavi; kıyıda köpük
      const SH = -6.7;
      VK.quad(mb, -220, SH, 220, 220, C('#ecc583', 0), -0.02); VK.noise(mb, -26, SH, 26, 16, 1.3, '#f3d394', '#dfb46f', 0.3);
      VK.noise(mb, -40, SH - 0.9, 40, SH + 0.02, 1.0, '#c99d62', '#b98d55', 0.5, 0, -0.01);
      VK.quad(mb, -220, SH - 3.4, 220, SH - 0.85, C('#3fc7d6', -0.85), -0.03);
      VK.quad(mb, -220, -260, 220, SH - 3.3, C('#1a8cc7', -0.85), -0.05);
      for (let k = 0; k < 24; k++) { const x0 = -38 + k * 3.2 + hs(k, 7) * 0.8, z = SH - 0.9 + Math.sin(k * 1.7) * 0.05; VK.quad(mb, x0, z - 0.08, x0 + 2.5 + hs(k, 8), z + 0.07, C('#ffffff', 0.4), -0.006); }
      for (let k = 0; k < 7; k++) { const z = SH - 1.8 - k * 0.9 - k * k * 0.18, x0 = -34 + hs(k, 1) * 8; VK.quad(mb, x0, z - 0.05, x0 + 60 - hs(k, 2) * 10, z + 0.05, C('#e8fbff', 0.5), k < 2 ? -0.025 : -0.045); }
      // tabela iskelede: denize uzanan ahşap iskele, babalar, ip korkuluk, can simidi
      const DY = 0.26, Wd = C('#b98a55', -0.2), Wk = C('#8a6238', 0);
      for (let z = -5.4, k = 0; z > -10.6; z -= 0.34, k++) mb.box(-2.3, DY - 0.07, z - 0.3, 2.3, DY, z, C(k % 3 ? '#c49461' : '#b4844f', -0.2));
      for (const x of [-2.15, 2.15]) for (let z = -5.6; z > -10.7; z -= 1.6) mb.cyl(x, -0.6, z, 0.11, DY + 0.55, 0.11, 8, Wk, Wk);
      for (const x of [-2.15, 2.15]) limb(mb, [x, DY + 0.45, -5.6], [x, DY + 0.45, -10.4], [0.03, 0.03], C('#e9dcc0', 0), 4);
      mb.push().T(2.33, DY + 0.3, -7.2, Math.PI / 2, Math.PI / 2); mb.torusN(0, 0, 0, 0.3, 0.08, 0.08, 16, 6, C('#e63946', -0.3), (a) => C(Math.floor(a / (Math.PI / 2) + 0.001) % 2 ? '#ffffff' : '#e63946', -0.3)); mb.pop();
      mb.box(-0.6, 0, -5.4, 0.6, DY - 0.07, -5.1, Wd);
      VK.sign(mb, 'stand', '#a8743f', '#fff8ec');
      for (const [x, z, s] of [[-7.8, -5.2, 1.6], [-9.6, -1.5, 1.6], [9.8, 1.5, 1.4]]) { mb.push().T(x, 0, z, hs(x, z) * 3, 0, 0, s); DECOR.palm(mb, [], Math.round(x)); mb.pop(); }
      for (const [x, z, a, b] of [[-4.9, -4.8, '#ff6f61', '#ffffff'], [5.0, -4.4, '#00a6a6', '#ffffff']]) { mb.push().T(x, 0, z, 0, 0, 0.12); VK.umbrella(mb, a, b); mb.pop(); mb.push().T(x + 0.9, 0, z + 0.4, -0.4); CHAIRS.beach.base(mb); CHAIRS.beach.pad(mb); mb.pop(); }
      // cankurtaran kulesi, can simidi, sörf tahtaları, kumdan kale, top, havlular
      mb.push().T(8.3, 0, -5.4, -0.4); for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) mb.box(x - 0.06, 0, z - 0.06, x + 0.06, 2.4, z + 0.06, C('#f4f1ea', 0)); mb.box(-0.9, 2.4, -0.9, 0.9, 2.5, 0.9, C('#c8a06a', 0)); mb.box(-0.8, 2.5, -0.8, 0.8, 3.5, 0.8, C('#e63946', 0)); mb.box(-0.95, 3.5, -0.95, 0.95, 3.62, 0.95, C('#ffffff', 0)); mb.box(-0.5, 2.8, 0.81, 0.5, 3.3, 0.83, C('#bfe9ff', -0.7)); for (let k = 0; k < 6; k++) mb.box(-0.4, 0.3 + k * 0.38, 0.92, 0.4, 0.34 + k * 0.38, 0.98, C('#c8a06a', 0)); mb.pop();
      for (const [x, z, c, r] of [[-7.6, -3.6, '#ffd23f', 0.2], [-7.1, -3.9, '#3a86ff', -0.2], [7.8, -3.0, '#f15bb5', 0.1]]) { mb.push().T(x, 0, z, r, 0.18); mb.rbox(-0.22, 0, -0.06, 0.22, 2.0, 0.06, 0.2, C(c, -0.5), 3); mb.pop(); }
      mb.push().T(-2.6, 0, 5.0); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU, x = Math.cos(a) * 0.38, z = Math.sin(a) * 0.38; mb.cyl(x, 0, z, 0.18, 0.5, 0.16, 8, C('#e3c78e', 0), C('#d9bb82', 0)); mb.cyl(x, 0.5, z, 0.14, 0.72, 0.0, 6, C('#d9bb82', 0), C('#d9bb82', 0), ''); } mb.cyl(0, 0, 0, 0.3, 0.85, 0.26, 10, C('#e3c78e', 0), C('#d9bb82', 0)); mb.cyl(0, 0.85, 0, 0.22, 1.2, 0.0, 8, C('#d9bb82', 0), C('#d9bb82', 0), ''); mb.box(0, 1.15, -0.01, 0.02, 1.45, 0.01, C('#5a3a2a', 0)); mb.triN([0.02, 1.45, 0], [0.24, 1.38, 0], [0.02, 1.3, 0], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#e63946', 0)); mb.pop();
      mb.push().T(2.7, 0, 4.4, 0, 0, 0, 0.55); DECOR.ball(mb, ['#ff6f61', '#ffd23f', '#00a6a6'], 0); mb.pop();
      mb.push().T(-1.5, 0, 5.5, 0.4); mb.cyl(0, 0, 0, 0.16, 0.3, 0.2, 12, C('#ff6f61', -0.4), C('#ff6f61', -0.4), 'b'); mb.cyl(0, 0.02, 0, 0.15, 0.29, 0.19, 12, C('#e8c487', 0), C('#e8c487', 0), ''); limb(mb, [-0.19, 0.29, 0], [0, 0.42, 0], [0.008, 0.008], C('#ffd23f', 0), 3, null, 1); limb(mb, [0.19, 0.29, 0], [0, 0.42, 0], [0.008, 0.008], C('#ffd23f', 0), 3, null, 1); mb.pop();
      mb.push().T(-1.1, 0.02, 5.9, 1.1, 0.12); mb.box(-0.02, 0, -0.25, 0.02, 0.02, 0.1, C('#3a86ff', -0.3)); mb.box(-0.08, 0, 0.1, 0.08, 0.015, 0.3, C('#3a86ff', -0.3)); mb.pop();
      for (let k = 0; k < 10; k++) { const x = (hs(k, 91) - 0.5) * 7, z = 3.8 + hs(k, 92) * 4; if (Math.abs(x) < 1.2 && z < 4.6) continue; if (k % 3 === 0) { mb.push().T(x, 0.01, z, hs(k, 93) * 6); for (let j = 0; j < 5; j++) { const a = (j / 5) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14], [0.04, 0.012], C('#ff8a5c', -0.2), 3); } mb.pop(); } else mb.sphereS(x, 0.02, z, 0.07, 0.035, 0.06, C(k % 2 ? '#fff1e6' : '#ffd6c9', -0.3), 6, 3); }
      mb.push().T(3.1, 0, 6.2, -0.3); mb.rbox(-0.38, 0, -0.26, 0.38, 0.42, 0.26, 0.06, C('#3a86ff', -0.4), 2); mb.rbox(-0.4, 0.4, -0.28, 0.4, 0.5, 0.28, 0.05, C('#ffffff', -0.4), 2); mb.box(-0.2, 0.5, -0.04, 0.2, 0.56, 0.04, C('#ffffff', -0.4)); mb.pop();
      for (const [x, z, a, b, r] of [[-7.4, 0.6, '#ffd23f', '#ff6f61', 0.3], [7.1, -0.6, '#3a86ff', '#ffffff', -0.25]]) { mb.push().T(x, 0, z, r); for (let k = 0; k < 6; k++) VK.quad(mb, -0.6 + k * 0.2, -1.0, -0.4 + k * 0.2, 1.0, C(k % 2 ? a : b, 0), 0.008); mb.pop(); }
    },
  },
};

Object.assign(VENUES, {
  /* ---- Sessiz Sinema: sinema salonu ---- */
  ssn: {
    table: 'felt', tableO: { felt: '#8c1c28', wood: '#c9a34a' }, chair: 'director', rug: 'round', rugO: { rug: '#5a0f18', rugB: '#e2b552' },
    L: VL.night, sky: ['#0d0a14', '#241a26', '#140d14'], posters: 'wall', parts: 'dust',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#1a0e12', 0), -0.01);
      VK.carpet(mb, -8.4, -7.8, 8.4, 12, '#7a1622', '#4a0c14', 0.35, 0.002);
      for (let i = 0; i < 40; i++) { const x = -8 + hs(i, 1) * 16, z = -7.4 + hs(i, 2) * 18; mb.disc(x, 0.006, z, 0.12, 0.12, 5, C('#c9a34a', 0)); }
      vShell(mb, { wall: '#1f141c', dado: [1.0, '#140c12'], top: '#c9a34a', base: '#0d080b' });
      VK.sign(mb, 'bulb', '#c9a34a', '#fff8ec');
      // perdeler, altın saçak, ışıklı perde alanı
      mb.box(-2.4, 0.2, -7.79, 2.4, 3.3, -7.78, C('#f2ece0', 0.5));
      for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const x = s * (2.0 + k * 0.42); mb.rbox(x - 0.24, 0, -7.76, x + 0.24, 4.7, -7.4 + (k % 2) * 0.12, 0.18, C(k % 2 ? '#a3162a' : '#8c1222', -0.2), 2); }
      mb.box(-8.3, 4.5, -7.75, 8.3, 4.95, -7.35, C('#c9a34a', -0.6)); for (let k = 0; k < 28; k++) mb.box(-8.2 + k * 0.6, 4.3, -7.36, -7.95 + k * 0.6, 4.5, -7.33, C('#e2b552', -0.6));
      // yanlarda koltuk sıraları (perdeye bakar), patlamış mısır makinesi, çıkış tabelaları
      for (const s of [-1, 1]) for (let r = 0; r < 4; r++) { mb.push().T(s * 6.9, 0, -3.2 + r * 1.9, Math.PI); VK.seatRow(mb, 3, '#a3162a'); mb.pop(); }
      mb.push().T(-7.6, 0, -6.4); mb.box(-0.5, 0, -0.4, 0.5, 0.9, 0.4, C('#c8261c', -0.4)); mb.box(-0.46, 0.9, -0.36, 0.46, 1.8, 0.36, C('#fff4d6', -0.85)); for (let k = 0; k < 30; k++) mb.sphereS(-0.35 + hs(k, 1) * 0.7, 0.98 + hs(k, 2) * 0.35, -0.25 + hs(k, 3) * 0.5, 0.06, 0.05, 0.06, C('#ffe27a', 0.3), 5, 3); mb.box(-0.5, 1.8, -0.4, 0.5, 2.0, 0.4, C('#c8261c', -0.4)); mb.box(-0.4, 2.0, -0.12, 0.4, 2.35, 0.12, C('#ffd23f', 0.9)); mb.pop();
      for (const s of [-1, 1]) { mb.box(s * 8.38, 3.0, 5.4, s * 8.32, 3.35, 6.2, C('#2fbf71', 1)); for (const z of [-5.2, 2.4]) { mb.box(s * 8.38, 2.6, z - 0.12, s * 8.3, 3.0, z + 0.12, C('#c9a34a', -0.8)); mb.sphereS(s * 8.26, 3.05, z, 0.12, 0.16, 0.12, C('#ffcf7a', 1), 8, 6); } }
      // perdeye vuran projektör huzmesi yerine yerde ışık izi
      for (const [z, n] of [[5.0, 6], [6.4, 8]]) { mb.push().T(0, 0, z, Math.PI); VK.seatRow(mb, n, '#e0414c'); mb.pop(); mb.box(-n * 0.31, 1.06, z + 0.14, n * 0.31, 1.09, z + 0.32, C('#e2b552', -0.6)); }
      for (const [x, z] of [[-2.6, 4.2], [2.3, 4.3]]) { mb.lathe(x, 0, z, [[0.1, 0], [0.14, 0.26], [0.15, 0.27]], 10, (k, a) => C(Math.floor(a * 6 / TAU) % 2 ? '#ffffff' : '#e63946', -0.2), ''); for (let k = 0; k < 6; k++) mb.sphereS(x + (hs(k, x) - 0.5) * 0.18, 0.29 + hs(k, z) * 0.05, z + (hs(k, x + 1) - 0.5) * 0.18, 0.05, 0.045, 0.05, C('#ffe27a', 0.3), 5, 3); }
      for (let k = 0; k < 18; k++) { const x = (hs(k, 95) - 0.5) * 7, z = 3.7 + hs(k, 96) * 4.5; mb.sphereS(x, 0.02, z, 0.04, 0.03, 0.04, C('#ffe27a', 0.3), 5, 3); }
    },
  },
  /* ---- Emoji Bilmece: lunapark (arkada dönen dönme dolap) ---- */
  emj: {
    table: 'metal', tableO: { top: '#b8f2e6', trim: '#f15bb5' }, chair: 'stool', chairO: { leg: '#ffffff', gloss: -0.6 }, rug: 'round', rugO: { rug: '#ffd6ec', rugB: '#ffffff' },
    L: VL.dusk, sky: ['#6a4cc2', '#ffb3d1', '#f6c6dc'], posters: 'poles', parts: 'confetti',
    anim: [{ key: 'ferris', x: -9.4, y: 3.5, z: -6.6, ry: 0.45, ax: 'z', sp: 0.16 }],
    build(mb) {
      VK.ground(mb, '#b9a3c4', '#a891b5', 0.25);
      VK.tiles(mb, -10, -9, 10, 12, 0.9, '#ff8cc8', '#6fcfff', '#f2e4f2', -0.2, 0.004, true);
      for (let k = 0; k < 26; k++) { const x = -9.5 + hs(k, 41) * 19, z = -8.5 + hs(k, 42) * 20; if (Math.hypot(x, z) < 4.2) continue; const t = -10 + Math.floor((x + 10) / 0.9) * 0.9, u = -9 + Math.floor((z + 9) / 0.9) * 0.9; VK.quad(mb, t + 0.025, u + 0.025, t + 0.875, u + 0.875, C(k % 2 ? '#fff08a' : '#c7a6ff', -0.2), 0.0065); }
      // ön bölge: ördek yakalama havuzu, balon ağırlığı, ödül ayıcıkları
      mb.push().T(-2.8, 0, 5.0); mb.lathe(0, 0, 0, [[0.95, 0], [1.0, 0.36], [0.88, 0.4], [0.86, 0.3]], 24, C('#00bbf9', -0.4), ''); mb.cyl(0, 0.0, 0, 0.87, 0.28, 0.87, 24, C('#7fdcff', -0.9), C('#7fdcff', -0.9), 't'); for (let k = 0; k < 7; k++) { const a = k * 0.9, r = 0.3 + (k % 3) * 0.18, x = Math.cos(a) * r, z = Math.sin(a) * r; mb.sphereS(x, 0.33, z, 0.09, 0.07, 0.1, C('#ffd23f', -0.2), 8, 5); mb.sphereS(x + 0.03, 0.42, z + 0.05, 0.055, 0.055, 0.055, C('#ffd23f', -0.2), 6, 4); mb.sphereS(x + 0.04, 0.41, z + 0.11, 0.02, 0.015, 0.03, C('#ff8a3d', 0), 4, 3); } mb.pop();
      mb.push().T(2.9, 0, 4.9); mb.cyl(0, 0, 0, 0.16, 0.18, 0.12, 10, C('#9b5de5', -0.4), C('#9b5de5', -0.4)); for (let k = 0; k < 5; k++) { const bx = (hs(k, 7) - 0.5) * 0.8, bz = (hs(k, 8) - 0.5) * 0.8, h = 1.8 + k * 0.28; limb(mb, [0, 0.18, 0], [bx, h, bz], [0.004, 0.004], C('#f4f4f4', 0), 3, null, 1); mb.sphereS(bx, h + 0.22, bz, 0.2, 0.24, 0.2, C(['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4'][k], -0.7), 10, 7); } mb.pop();
      for (const [x, z, c] of [[1.4, 6.2, '#c68a5e'], [1.0, 6.5, '#ff8fc7'], [-1.0, 6.6, '#a9e8ff']]) { mb.sphereS(x, 0.16, z, 0.15, 0.17, 0.13, C(c, 0), 8, 6); mb.sphereS(x, 0.4, z, 0.12, 0.11, 0.11, C(c, 0), 8, 6); for (const s2 of [-1, 1]) mb.sphereS(x + s2 * 0.09, 0.5, z, 0.045, 0.045, 0.03, C(c, 0), 6, 4); mb.sphereS(x, 0.39, z + 0.1, 0.04, 0.03, 0.03, C('#3a2a1e', 0), 5, 3); }
      // patlamış mısır arabası (sol, pamuk şekerin karşısında)
      mb.push().T(-7.4, 0, -2.4, 0.9); mb.box(-0.8, 0.3, -0.5, 0.8, 1.1, 0.5, C('#e63946', -0.4)); for (let k = 0; k < 5; k++) mb.box(-0.8 + k * 0.36, 0.3, 0.5, -0.62 + k * 0.36, 1.1, 0.52, C('#ffffff', -0.3)); for (const s of [-1, 1]) { mb.push().T(s * 0.55, 0.3, 0.53, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.26, 0.05, 0.05, 14, 5, C('#ffffff', -0.5)); mb.pop(); } mb.box(-0.7, 1.1, -0.42, 0.7, 1.9, 0.42, C('#e9f6ff', -0.92)); for (let k = 0; k < 22; k++) mb.sphereS(-0.6 + hs(k, 1) * 1.2, 1.18 + hs(k, 2) * 0.3, -0.32 + hs(k, 3) * 0.64, 0.09, 0.08, 0.09, C(k % 3 ? '#fff3c4' : '#ffd166', 0), 6, 4); mb.box(-0.75, 1.9, -0.47, 0.75, 1.96, 0.47, C('#e63946', -0.4)); for (let k = 0; k < 8; k++) { const x0 = -0.85 + k * 0.2125, n = vnorm([0, 1, 0.3]); mb.quadN([x0, 2.32, -0.2], [x0 + 0.2125, 2.32, -0.2], [x0 + 0.2125, 2.08, 0.62], [x0, 2.08, 0.62], n, n, n, n, C(k % 2 ? '#e63946' : '#ffffff', 0)); } for (const x of [-0.75, 0.75]) mb.cyl(x, 1.96, -0.2, 0.025, 2.32, 0.025, 6, C('#ffffff', -0.5), C('#ffffff', -0.5), ''); mb.pop();
      VK.sign(mb, 'bulb', '#f15bb5', '#fff8ec');
      // dönme dolabın ayakları (tekerlek ayrı döner)
      const LG = C('#ffffff', -0.5);
      mb.push().T(-9.4, 0, -6.6, 0.45); for (const s of [-1, 1]) { limb(mb, [s * 2.1, 0, -0.55], [0, 3.5, -0.32], [0.11, 0.08], LG, 8); limb(mb, [s * 2.1, 0, 0.55], [0, 3.5, 0.32], [0.11, 0.08], LG, 8); } mb.box(-2.6, 0, -0.9, 2.6, 0.35, 0.9, C('#f15bb5', -0.3)); mb.pop();
      // atlıkarınca çadırı, pamuk şeker arabası, balon kümeleri, ampul zincirleri
      mb.push().T(6.8, 0, -7.4); mb.cyl(0, 0, 0, 2.2, 0.4, 2.2, 20, C('#fee440', -0.3), C('#fee440', -0.3)); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; mb.cyl(Math.cos(a) * 1.9, 0.4, Math.sin(a) * 1.9, 0.05, 2.6, 0.05, 6, C('#f1d16a', -0.8), C('#f1d16a', -0.8), ''); } for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU, a1 = ((k + 1) / 12) * TAU, col = C(k % 2 ? '#f15bb5' : '#ffffff', 0); mb.triN([0, 3.9, 0], [Math.cos(a0) * 2.4, 2.6, Math.sin(a0) * 2.4], [Math.cos(a1) * 2.4, 2.6, Math.sin(a1) * 2.4], UPV, UPV, UPV, col); } mb.sphereS(0, 3.98, 0, 0.14, 0.14, 0.14, C('#ffd23f', 0.6), 8, 5); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; mb.sphereS(Math.cos(a) * 1.4, 0.95, Math.sin(a) * 1.4, 0.3, 0.26, 0.5, C(['#ffffff', '#00bbf9', '#9b5de5', '#00f5d4'][k], -0.4), 8, 6); } mb.pop();
      mb.push().T(7.6, 0, -2.6, -0.9); mb.box(-0.9, 0.3, -0.5, 0.9, 1.1, 0.5, C('#00bbf9', -0.4)); for (const s of [-1, 1]) { mb.push().T(s * 0.6, 0.3, 0.52, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.26, 0.05, 0.05, 14, 5, C('#ffffff', -0.5)); mb.pop(); } for (let k = 0; k < 4; k++) mb.cyl(-0.7 + k * 0.46, 1.1, 0, 0.03, 1.5, 0.03, 6, C('#ffffff', 0), C('#ffffff', 0), ''); for (let k = 0; k < 4; k++) mb.sphereS(-0.7 + k * 0.46, 1.7, 0, 0.26, 0.24, 0.26, C(k % 2 ? '#ff8fc7' : '#a9e8ff', 0.2), 10, 7); for (const [x, z] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) mb.cyl(x, 1.1, z, 0.03, 2.4, 0.03, 6, C('#ffffff', -0.5), C('#ffffff', -0.5), ''); for (let k = 0; k < 8; k++) { const x0 = -1.0 + k * 0.25, n = vnorm([0, 1, 0.2]); mb.quadN([x0, 2.4, -0.6], [x0 + 0.25, 2.4, -0.6], [x0 + 0.25, 2.25, 0.7], [x0, 2.25, 0.7], n, n, n, n, C(k % 2 ? '#f15bb5' : '#ffffff', 0)); } mb.pop();
      for (const [x, z] of [[-6.4, 1.6], [6.6, 1.4], [-6.2, -9.6], [6.4, -9.8]]) for (let k = 0; k < 5; k++) { const bx = x + (hs(k, x) - 0.5) * 0.6, bz = z + (hs(k, z) - 0.5) * 0.6, h = 2.2 + k * 0.32; limb(mb, [x, 0.25, z], [bx, h, bz], [0.004, 0.004], C('#f4f4f4', 0), 3, null, 1); mb.sphereS(bx, h + 0.22, bz, 0.2, 0.24, 0.2, C(['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4'][k], -0.7), 10, 7); }
      VK.bulbs(mb, [-9, 4.0, -8.6], [9, 4.0, -8.6], 26, 0.9, ['#fff1b8', '#ff8fc7', '#a9e8ff', '#fee440']);
      for (const s of [-1, 1]) VK.bulbs(mb, [s * 2.0, 3.2, -7.8], [s * 9, 3.6, -1.5], 14, 0.6, ['#fff1b8', '#ff8fc7', '#a9e8ff']);
    },
  },
  /* ---- Sayı Bombası: maden ocağı ---- */
  sbm: {
    table: 'spool', chair: 'crate', rug: null,
    L: VL.warm, sky: ['#3a2c22', '#6a4a32', '#3a2c22'], posters: 'poles', parts: 'dust',
    build(mb) {
      VK.ground(mb, '#7a6450', '#5f4c3c', 0.35, 1.2);
      // kaya duvarı ve tünel ağzı
      for (let k = 0; k < 22; k++) { const x = -15 + k * 1.45, y = 0.6 + hs(k, 1) * 3.5, s = 1.4 + hs(k, 2) * 1.2; mb.superS(x, y * 0.6, -10.4 - hs(k, 3) * 1.2, s * 1.1, y + 1.2, s, 0.45, 0.55, C(hs(k, 4) > 0.5 ? '#6f5e4c' : '#5a4a3b', 0), 10, 6); }
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const z = -7 + k * 2.6, h = 1.5 + hs(k, s + 3) * 2.5; mb.superS(s * (11 + hs(k, 5) * 1.5), h * 0.5, z, 1.5, h, 1.6, 0.45, 0.55, C(hs(k, s) > 0.5 ? '#6f5e4c' : '#5a4a3b', 0), 10, 6); }
      mb.box(-2.6, 0, -9.6, 2.6, 4.0, -9.0, C('#1a120d', 0));
      const T = C('#6b4428', 0);
      for (const s of [-1, 1]) mb.box(s * 2.4 - 0.2, 0, -9.1, s * 2.4 + 0.2, 4.2, -8.7, T);
      mb.box(-2.9, 3.9, -9.15, 2.9, 4.35, -8.65, T);
      VK.sign(mb, 'stand', '#6b4428', '#fff8ec');
      // raylar (kıvrımlı), vagonlar, fenerler, dinamit sandıkları, variller
      const rail = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l; for (let k = 0; k < Math.floor(l / 0.6); k++) { const t = (k + 0.5) / Math.floor(l / 0.6), cx = a[0] + dx * t, cz = a[1] + dz * t; mb.push().T(cx, 0, cz, Math.atan2(dx, dz)); mb.box(-0.6, 0, -0.1, 0.6, 0.06, 0.1, C('#5b3a24', 0)); mb.pop(); } for (const o of [-0.42, 0.42]) limb(mb, [a[0] + nx * o, 0.09, a[1] + nz * o], [b[0] + nx * o, 0.09, b[1] + nz * o], [0.03, 0.03], C('#8a9099', -0.8), 4, null, 1); } };
      const PTS = []; for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; PTS.push([Math.cos(a) * 6.2, Math.sin(a) * 5.6 - 1.2]); }
      rail([[-6.2, 8], [-6.2, 2]].concat(PTS.slice(0).map((p) => p)).concat([[6.2, 2], [6.2, 8]]).filter((p, i, A) => i === 0 || Math.hypot(p[0] - A[i - 1][0], p[1] - A[i - 1][1]) > 0.05));
      rail([[0, -9.0], [0, -6.9]]);
      const cart = (x, z, ry, ore) => { mb.push().T(x, 0, z, ry); mb.box(-0.6, 0.3, -0.45, 0.6, 0.95, 0.45, C('#5d6670', -0.6)); mb.box(-0.64, 0.9, -0.49, 0.64, 0.98, 0.49, C('#3d444c', -0.6)); for (const [a, b] of [[-0.4, -0.45], [0.4, -0.45], [-0.4, 0.45], [0.4, 0.45]]) { mb.push().T(a, 0.2, b, 0, 0, Math.PI / 2); mb.cyl(0, -0.04, 0, 0.18, 0.04, 0.18, 12, C('#2b2d33', -0.6), C('#2b2d33', -0.6)); mb.pop(); } for (let k = 0; k < 7; k++) mb.sphereS(-0.4 + hs(k, x) * 0.8, 1.0, -0.3 + hs(k, z) * 0.6, 0.16, 0.12, 0.15, C(ore ? '#ffcf3a' : '#6f6458', ore ? -0.8 : 0), 7, 5); mb.pop(); };
      cart(-6.2, 4.2, 0, true); cart(5.4, -4.0, 2.2, false); cart(-3.6, -5.8, 0.95, true);
      for (const [x, z, h] of [[-2.4, -8.5, 3.3], [2.4, -8.5, 3.3], [-7.6, -2.2, 2.6], [7.6, 0.4, 2.6]]) { mb.box(x - 0.05, h - 0.5, z - 0.05, x + 0.05, h, z + 0.05, C('#2b2b2b', 0)); mb.cyl(x, h - 0.85, z, 0.12, h - 0.5, 0.12, 8, C('#2b2b2b', -0.6), C('#2b2b2b', -0.6), ''); mb.sphereS(x, h - 0.68, z, 0.1, 0.13, 0.1, C('#ffc46b', 1), 8, 6); }
      for (const [x, z, r] of [[7.3, -7.0, 0.3], [-7.4, -7.2, -0.2], [7.8, 3.6, 0.6]]) { mb.push().T(x, 0, z, r); mb.box(-0.55, 0, -0.4, 0.55, 0.6, 0.4, C('#9a6a3f', 0)); mb.box(-0.57, 0.6, -0.42, 0.57, 0.66, 0.42, C('#6b4428', 0)); for (let k = 0; k < 4; k++) mb.cyl(-0.3 + k * 0.2, 0.66, 0, 0.07, 0.98, 0.07, 8, C('#d62828', -0.4), C('#d62828', -0.4)); limb(mb, [0.3, 0.98, 0], [0.5, 1.2, 0.2], [0.012, 0.012], C('#2b2b2b', 0), 3, null, 1); mb.sphereS(0.5, 1.22, 0.2, 0.04, 0.04, 0.04, C('#ffd23f', 1), 6, 4); mb.pop(); }
      for (const [x, z] of [[-7.6, 0.8], [-7.0, 1.5], [6.6, -2.4]]) { mb.push().T(x, 0, z, hs(x, z) * 3, 0, 0, 0.8); DECOR.barrel(mb, ['#ffd23f', '#1b1b1e', '#c8553d'], 1); mb.pop(); }
      // ön bölge: dinamit sandığı, kazma ve kürek, altın cevheri yığını, yerde fener
      mb.push().T(-2.7, 0, 4.8, 0.3); mb.box(-0.5, 0, -0.35, 0.5, 0.55, 0.35, C('#9a6a3f', 0)); mb.box(-0.52, 0.55, -0.37, 0.52, 0.6, 0.37, C('#6b4428', 0)); mb.box(-0.3, 0.2, 0.351, 0.3, 0.4, 0.356, C('#d62828', 0)); for (let k = 0; k < 3; k++) mb.cyl(-0.2 + k * 0.2, 0.6, 0.05, 0.065, 0.92, 0.065, 8, C('#d62828', -0.4), C('#d62828', -0.4)); limb(mb, [0.2, 0.92, 0.05], [0.42, 1.1, 0.2], [0.012, 0.012], C('#2b2b2b', 0), 3, null, 1); mb.pop();
      mb.push().T(-1.8, 0, 5.4, -0.4); limb(mb, [0, 0.02, 0], [0.1, 1.05, -0.32], [0.03, 0.025], C('#8a5a34', 0), 5); mb.push().T(0.1, 1.05, -0.32, 0, 0.3); mb.box(-0.36, -0.04, -0.03, 0.36, 0.04, 0.03, C('#8a9099', -0.8)); mb.pop(); mb.pop();
      mb.push().T(2.8, 0, 5.0); mb.sphereS(0, 0.05, 0, 0.75, 0.42, 0.65, C('#6f6458', 0), 12, 7); mb.sphereS(0.35, 0.05, 0.25, 0.4, 0.26, 0.35, C('#5f554a', 0), 10, 6); for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 0.12 + (k % 3) * 0.17, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85, q = Math.hypot(x / 0.75, z / 0.65); mb.sphereS(x, 0.07 + 0.42 * Math.sqrt(Math.max(0, 1 - q * q)), z, 0.09, 0.07, 0.09, C('#ffcf3a', -0.85), 7, 5); } mb.pop();
      mb.push().T(1.3, 0, 6.3); mb.cyl(0, 0, 0, 0.12, 0.05, 0.12, 8, C('#2b2b2b', -0.6), C('#2b2b2b', -0.6)); mb.cyl(0, 0.05, 0, 0.1, 0.3, 0.1, 8, C('#ffc46b', 1), C('#ffc46b', 1)); mb.cyl(0, 0.3, 0, 0.12, 0.36, 0.04, 8, C('#2b2b2b', -0.6), C('#2b2b2b', -0.6), ''); mb.pop();
    },
  },
  /* ---- İki Doğru Bir Yalan: büyülü gece ormanı ---- */
  idy: {
    table: 'stone', tableO: { stone: '#6f8a86' }, chair: 'mushroom', rug: 'patch', rugO: { rug: '#1f3d36' },
    L: VL.forest, sky: ['#0e0a2e', '#3a2f7a', '#141238'], posters: false, parts: 'fireflies',
    build(mb) {
      VK.ground(mb, '#24453c', '#1a352e', 0.3, 1.3);
      // ışıklı mantar ve kristal adacıkları, dere, dev ağaçlar
      const bigTree = (x, z, h, k) => {
        const BK = C('#3b2f3a', 0), Bd = C('#2c222c', 0);
        let p = [x, 0, z];
        for (let i = 0; i < 5; i++) { const q = [x + Math.sin(i * 1.3 + k) * 0.5, (i + 1) * h / 5, z + Math.cos(i * 1.1 + k) * 0.4]; limb(mb, p, q, [0.55 - i * 0.08, 0.47 - i * 0.08], i % 2 ? BK : Bd, 8); p = q; }
        for (let r = 0; r < 4; r++) { const a = (r / 4) * TAU + k; limb(mb, [x, 0.3, z], [x + Math.cos(a) * 1.1, 0.02, z + Math.sin(a) * 1.1], [0.3, 0.08], Bd, 6); }
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + k, r = h * 0.28; mb.sphereS(p[0] + Math.cos(a) * r, p[1] + 0.4 + hs(i, k) * 0.8, p[2] + Math.sin(a) * r, h * 0.22, h * 0.16, h * 0.22, C(i % 2 ? '#1f5a52' : '#2a6b5f', 0), 8, 5); }
        mb.sphereS(p[0], p[1] + 1.1, p[2], h * 0.24, h * 0.18, h * 0.24, C('#2f7a6b', 0), 10, 7);
        for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + k * 2, bx = p[0] + Math.cos(a) * h * 0.25, bz = p[2] + Math.sin(a) * h * 0.25; limb(mb, [bx, p[1] - 0.2, bz], [bx, p[1] - 1.1, bz], [0.006, 0.006], C('#c9a34a', 0), 3, null, 1); mb.push().T(bx, p[1] - 2.1, bz); lanternModel(mb); mb.pop(); }
      };
      [[-7.4, -7.6, 6.5, 1], [7.6, -7.0, 7.0, 2], [-11.6, 0.5, 6.0, 3], [11.4, 1.8, 6.4, 4], [0.5, -13.5, 7.5, 5], [-4.2, -12.4, 5.5, 6], [5.2, -12.8, 6.0, 7]].forEach(([x, z, h, k]) => bigTree(x, z, h, k));
      VK.sign(mb, 'stand', '#4a3a2a', '#f4efe2');
      for (let k = 0; k < 4; k++) mb.sphereS(-1.6 + k * 1.05, 3.02, -7.72, 0.12, 0.08, 0.06, C('#3f7a4a', 0), 6, 4);
      for (const [x, z, s, c] of [[-5.6, -4.8, 0.9, '#b388ff'], [5.8, -4.2, 0.8, '#5be3a9'], [-6.8, 2.4, 0.7, '#ff5fa2'], [6.9, 3.0, 0.75, '#4cc9f0'], [-3.8, -7.0, 0.55, '#5be3a9'], [3.6, -7.2, 0.6, '#b388ff']]) { mb.push().T(x, 0, z, hs(x, z) * 3, 0, 0, s); DECOR.mushroom(mb, [c, c, c], 0); mb.pop(); mb.disc(x, 0.008, z, s * 1.3, s * 1.3, 14, C(c, 0.5), C('#1a352e', 0)); }
      for (const [x, z, s] of [[-7.8, -2.0, 0.8], [7.9, -1.4, 0.85], [-2.2, -8.8, 0.7], [2.6, -9.2, 0.75]]) { mb.push().T(x, 0, z, hs(x, z) * 5, 0, 0, s); DECOR.crystal(mb, ['#7df9ff', '#b388ff', '#5be3a9'], 0); mb.pop(); }
      // dere ve basamak taşları
      const pts = []; for (let k = 0; k <= 20; k++) { const z = 12 - k * 1.3; pts.push([9.6 + Math.sin(k * 0.6) * 1.2, z]); }
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; mb.quadN([a[0] - 0.8, 0.01, a[1]], [a[0] + 0.8, 0.01, a[1]], [b[0] + 0.8, 0.01, b[1]], [b[0] - 0.8, 0.01, b[1]], UPV, UPV, UPV, UPV, C('#3a6ea8', -0.9)); }
      for (let k = 0; k < 8; k++) { const t = k / 7, p = pts[Math.round(t * (pts.length - 1))]; mb.superS(p[0] + (k % 2 ? 0.3 : -0.3), 0.04, p[1], 0.35, 0.1, 0.3, 0.5, 0.6, C('#7d8a86', 0), 8, 4); }
      for (let k = 0; k < 40; k++) { const s = k % 2 ? 1 : -1, x = s * (5 + hs(k, 7) * 8), z = -9 + hs(k, 8) * 20; if (Math.hypot(x, z) < 5) continue; mb.sphereS(x, 0.06, z, 0.06, 0.06, 0.06, C(['#ffe9a8', '#b388ff', '#5be3a9'][k % 3], 1), 4, 3); }
      // ön bölge: ışıklı mantar öbekleri, yosunlu devrik kütük, eğreltiotları, küçük kristal
      for (const [x, z, c] of [[-2.7, 4.6, '#9b5de5'], [2.6, 5.0, '#2ec4a0'], [-0.6, 6.6, '#ff3e8a'], [3.2, 7.2, '#3aa8e0']]) { for (let j = 0; j < 4; j++) { const mx = x + (hs(j, x) - 0.5) * 0.6, mz = z + (hs(j, z) - 0.5) * 0.5, h = 0.14 + hs(j, x + z) * 0.22, r = 0.08 + h * 0.5; mb.cyl(mx, 0, mz, 0.03, h, 0.025, 6, C('#f4f1ea', 0), C('#f4f1ea', 0), ''); mb.sphereS(mx, h, mz, r, r * 0.55, r, C(c, 0.9), 10, 5); mb.sphereS(mx + r * 0.3, h + r * 0.4, mz, r * 0.18, r * 0.1, r * 0.18, C('#ffffff', 0.9), 6, 3); } }
      mb.push().T(-2.4, 0, 6.0, 0.35); mb.push().T(0, 0.24, 0, 0, 0, Math.PI / 2); mb.cyl(0, -0.9, 0, 0.24, 0.9, 0.22, 12, C('#4a3a3a', 0), C('#8a6a4a', 0)); mb.pop(); for (let k = 0; k < 5; k++) mb.sphereS(-0.7 + k * 0.35, 0.44, (hs(k, 3) - 0.5) * 0.1, 0.16, 0.07, 0.16, C('#3f8f52', 0), 8, 4); mb.pop();
      for (const [x, z] of [[1.4, 4.4], [-3.6, 5.4], [1.2, 7.4]]) for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU + x; limb(mb, [x, 0, z], [x + Math.cos(a) * 0.45, 0.32, z + Math.sin(a) * 0.45], [0.05, 0.01], C(j % 2 ? '#2f7a5a' : '#3f9a6a', 0), 3); }
      mb.push().T(0.6, 0, 5.4, 0.7, 0, 0, 0.45); DECOR.crystal(mb, ['#7df9ff', '#b388ff', '#5be3a9'], 1); mb.pop();
    },
  },
  /* ---- Renk Şaşırtmaca: atari salonu ---- */
  rnk: {
    table: 'glass', tableO: { glow: '#00f5d4', top: '#120f22' }, chair: 'stool', chairO: { leg: '#1d1729' }, rug: 'led', rugO: { glow: '#ff2e93', rug: '#0c0a18' },
    L: VL.neon, sky: ['#090720', '#3d1c6e', '#120c26'], posters: 'wall',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#0c0a18', 0), -0.01);
      VK.quad(mb, -8.4, -7.8, 8.4, 12, C('#141029', 0), 0.002);
      for (let i = 0; i < 90; i++) { const x = -8 + hs(i, 11) * 16, z = -7.4 + hs(i, 12) * 18; if (Math.hypot(x, z) < 3.8) continue; const c = ['#ff2e93', '#00f5d4', '#ffe600', '#3a86ff', '#8ac926'][i % 5], k = i % 3; mb.push().T(x, 0.006, z, hs(i, 13) * 6); if (k === 0) mb.torusN(0, 0, 0, 0.16, 0.025, 0.004, 10, 3, C(c, 0.9)); else if (k === 1) mb.triN([0, 0, 0.18], [0.16, 0, -0.1], [-0.16, 0, -0.1], UPV, UPV, UPV, C(c, 0.9)); else mb.box(-0.15, 0, -0.03, 0.15, 0.004, 0.03, C(c, 0.9)); mb.pop(); }
      vShell(mb, { wall: '#1d1636', dado: [0.8, '#140f26'], top: '#ff2e93', base: '#0a0816' });
      VK.sign(mb, 'neon', '#00f5d4');
      for (const [y, c] of [[3.6, '#ff2e93'], [3.85, '#00f5d4'], [4.1, '#ffe600']]) { mb.box(-8.3, y, -7.79, -2.2, y + 0.06, -7.75, C(c, 1)); mb.box(2.2, y, -7.79, 8.3, y + 0.06, -7.75, C(c, 1)); }
      // makine dizileri (arka ve yanlar), pençe makinesi, ödül tezgâhı
      for (let k = 0; k < 6; k++) { const x = k < 3 ? -7.6 + k * 0.9 : 4.9 + (k - 3) * 0.9; mb.push().T(x + 0.45, 0, -7.25); VK.arcade(mb, ['#3a86ff', '#ff2e93', '#8ac926', '#ffe600', '#ff6d00', '#00f5d4'][k], ['#7df9ff', '#ff8fc7', '#c6ff7a', '#fff28a', '#ffb27a', '#7df9ff'][k], k); mb.pop(); }
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { mb.push().T(s * 7.85, 0, 0.4 + k * 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2); VK.arcade(mb, ['#8a5cf6', '#ff2e93', '#3a86ff'][k], ['#c9b3ff', '#ff8fc7', '#7df9ff'][k], k + s); mb.pop(); }
      mb.push().T(7.3, 0, 3.4, -0.5); mb.box(-0.6, 0, -0.6, 0.6, 1.0, 0.6, C('#ff2e93', -0.5)); mb.box(-0.58, 1.0, -0.58, 0.58, 2.1, 0.58, C('#bfe9ff', -0.95)); for (let k = 0; k < 14; k++) mb.sphereS(-0.4 + hs(k, 1) * 0.8, 1.12 + hs(k, 2) * 0.2, -0.4 + hs(k, 3) * 0.8, 0.12, 0.11, 0.12, C(['#ffe600', '#00f5d4', '#ff8fc7', '#8ac926'][k % 4], -0.3), 7, 5); mb.box(-0.6, 2.1, -0.6, 0.6, 2.35, 0.6, C('#ff2e93', 0.9)); limb(mb, [0, 2.1, 0], [0.1, 1.6, 0.05], [0.01, 0.01], C('#c9ced6', -0.8), 3, null, 1); mb.pop();
      // ön bölge: hava hokeyi masası ve ışıklı dans pedi
      mb.push().T(0.4, 0, 5.9); mb.box(-0.75, 0, -0.5, 0.75, 0.72, 0.5, C('#1d1636', -0.5)); mb.box(-0.8, 0.72, -0.55, 0.8, 0.8, 0.55, C('#ff2e93', 0.9)); mb.box(-0.72, 0.8, -0.47, 0.72, 0.805, 0.47, C('#e9f6ff', -0.9)); mb.box(-0.72, 0.806, -0.01, 0.72, 0.808, 0.01, C('#ff2e93', 1)); mb.torusN(0, 0.807, 0, 0.16, 0.008, 0.002, 18, 3, C('#3a86ff', 1)); for (const s2 of [-1, 1]) { mb.cyl(s2 * 0.55, 0.805, 0, 0.07, 0.84, 0.07, 12, C(s2 < 0 ? '#00f5d4' : '#ffe600', -0.3), C(s2 < 0 ? '#00f5d4' : '#ffe600', -0.3)); mb.box(s2 * 0.72 - 0.02, 0.8, -0.16, s2 * 0.72 + 0.02, 0.83, 0.16, C('#14161f', 0)); } mb.cyl(-0.1, 0.805, 0.15, 0.04, 0.815, 0.04, 10, C('#ff2e93', 0.5), C('#ff2e93', 0.5)); mb.pop();
      mb.push().T(-2.8, 0, 4.8, 0.25); mb.box(-0.9, 0, -0.9, 0.9, 0.08, 0.9, C('#14161f', -0.6)); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = -0.6 + i * 0.6, z = -0.6 + j * 0.6, arrow = (i + j) % 2 === 1, c = ['#ff2e93', '#00f5d4', '#ffe600', '#3a86ff'][(i * 3 + j) % 4]; mb.box(x - 0.26, 0.08, z - 0.26, x + 0.26, 0.09, z + 0.26, C(arrow ? '#22203a' : '#2b2846', -0.5)); if (arrow) { const a = Math.atan2(z, x); mb.push().T(x, 0.092, z, -a + Math.PI / 2); mb.triN([0, 0, 0.18], [0.16, 0, -0.06], [-0.16, 0, -0.06], UPV, UPV, UPV, C(c, 1)); mb.box(-0.06, 0, -0.18, 0.06, 0.001, -0.05, C(c, 1)); mb.pop(); } } limb(mb, [0, 0.08, -0.9], [0, 1.05, -1.0], [0.025, 0.025], C('#3a3d44', -0.7), 4); mb.box(-0.7, 1.0, -1.05, 0.7, 1.1, -0.95, C('#3a3d44', -0.7)); mb.pop();
      mb.push().T(-7.0, 0, 4.4, 0.5); VK.counter(mb, 2.2, 1.0, 0.7, '#3a86ff', '#1d1636'); mb.box(-1.1, 1.0, -0.4, 1.1, 2.2, -0.3, C('#1d1636', 0)); for (let k = 0; k < 8; k++) mb.sphereS(-0.9 + k * 0.26, 1.2 + (k % 2) * 0.55, -0.25, 0.12, 0.13, 0.1, C(['#ff8fc7', '#ffe600', '#7df9ff', '#c6ff7a'][k % 4], -0.2), 8, 5); mb.pop();
    },
  },
  /* ---- Hafıza Sırası: uzay istasyonu ---- */
  hfz: {
    table: 'console', tableO: { metal: '#2d3548', glow: '#4cc9f0' }, chair: 'pod', rug: 'led', rugO: { glow: '#4cc9f0', rug: '#0e1220' },
    L: VL.space, sky: ['#05051a', '#1b1f44', '#0b0d22'], posters: 'wall',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#0b0e18', 0), -0.01);
      VK.tiles(mb, -8.4, -7.8, 8.4, 12, 1.2, '#4a5263', '#424a5a', '#262b36', -0.6);
      for (const r of [5.4, 6.8]) mb.lathe(0, 0.012, 0, [[r, 0], [r - 0.06, 0]], 72, C('#4cc9f0', 1));
      for (const s of [-1, 1]) VK.quad(mb, s * 0.9 - 0.04, 5.4, s * 0.9 + 0.04, 12, C('#4cc9f0', 1), 0.012);
      vShell(mb, { wall: '#3a4152', dado: [0.9, '#2a3040'], top: '#22283a', base: '#1a1f2c' });
      // büyük pencere: yıldızlar (gezegen ayrı döner), metal çerçeve
      mb.box(-7.4, 0.8, -7.79, 7.4, 4.6, -7.77, C('#04040f', -0.8));
      for (let i = 0; i < 90; i++) { const x = -7.2 + hs(i, 21) * 14.4, y = 0.95 + hs(i, 22) * 3.5, s = 0.012 + hs(i, 23) * 0.03; mb.box(x - s, y - s, -7.769, x + s, y + s, -7.765, C(i % 7 ? '#ffffff' : '#ffd6a5', 1)); }
      // pencerede halkalı gezegen ve uydu (camın önünde, yassı)
      mb.sphereS(5.6, 2.7, -7.74, 1.15, 1.15, 0.03, C('#ff9f5a', 0.9), 22, 14);
      for (const [y, h2] of [[2.95, 0.12], [2.5, 0.08], [3.3, 0.06]]) mb.box(5.6 - Math.sqrt(Math.max(0, 1.15 * 1.15 - (y - 2.7) ** 2)) * 0.98, y - h2, -7.715, 5.6 + Math.sqrt(Math.max(0, 1.15 * 1.15 - (y - 2.7) ** 2)) * 0.98, y + h2, -7.712, C('#ffd6a5', 0.9));
      mb.push().T(5.6, 2.7, -7.7, 0, 0, 0.35); mb.box(-2.0, -0.05, 0, 2.0, 0.05, 0.004, C('#fff3b0', 0.9)); mb.pop();
      mb.sphereS(-5.4, 3.6, -7.74, 0.42, 0.42, 0.02, C('#c9d4e8', 0.9), 16, 10);
      for (const x of [-7.5, -3.75, 3.75, 7.5]) mb.box(x - 0.12, 0.7, -7.78, x + 0.12, 4.7, -7.6, C('#5a6378', -0.7));
      mb.box(-7.6, 4.55, -7.8, 7.6, 4.8, -7.5, C('#5a6378', -0.7)); mb.box(-7.6, 0.6, -7.8, 7.6, 0.85, -7.4, C('#5a6378', -0.7));
      VK.sign(mb, 'screen');
      // ön bölge: kargo kutuları (ışıklı şerit) ve yuvarlak zemin kapağı
      for (const [x, z, r, h] of [[2.7, 4.8, 0.3, 0.6], [3.3, 5.6, -0.2, 0.45], [2.5, 5.7, 0.1, 0.4]]) { mb.push().T(x, 0, z, r); mb.rbox(-0.32, 0, -0.32, 0.32, h, 0.32, 0.05, C('#d9dde6', -0.75), 2); mb.box(-0.33, h * 0.45, -0.33, 0.33, h * 0.55, 0.33, C('#ffbe0b', 0.95)); mb.pop(); }
      mb.cyl(-0.9, 0, 7.0, 0.7, 0.014, 0.7, 24, C('#5a6378', -0.8), C('#5a6378', -0.8)); mb.torusN(-0.9, 0.014, 7.0, 0.6, 0.02, 0.004, 24, 3, C('#4cc9f0', 1)); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; mb.box(-0.9 + Math.cos(a) * 0.42 - 0.05, 0.014, 7.0 + Math.sin(a) * 0.42 - 0.05, -0.9 + Math.cos(a) * 0.42 + 0.05, 0.02, 7.0 + Math.sin(a) * 0.42 + 0.05, C('#2a3040', -0.6)); }
      // konsollar, borular, yan duvarda lombozlar, sevimli robot
      for (const s of [-1, 1]) { mb.push().T(s * 5.8, 0, -6.9); mb.box(-1.4, 0, -0.4, 1.4, 0.95, 0.4, C('#2d3548', -0.6)); mb.push().T(0, 0.95, 0.05, 0, -0.5); mb.box(-1.35, 0, -0.3, 1.35, 0.06, 0.3, C('#1a1f2c', -0.6)); for (let k = 0; k < 12; k++) mb.box(-1.2 + (k % 6) * 0.44, 0.06, -0.2 + Math.floor(k / 6) * 0.25, -1.0 + (k % 6) * 0.44, 0.08, -0.05 + Math.floor(k / 6) * 0.25, C(['#e63946', '#3a86ff', '#2fbf71', '#ffbe0b'][k % 4], 1)); mb.pop(); mb.pop(); }
      for (const s of [-1, 1]) { for (const y of [4.2, 4.45]) limb(mb, [s * 8.3, y, -7.6], [s * 8.3, y, 8], [0.08, 0.08], C('#6b7488', -0.8), 8, null, 1); for (const z of [-4.6, 0.8, 4.6]) { mb.push().T(s * 8.38, 2.6, z, Math.PI / 2, Math.PI / 2); mb.torusN(0, 0, 0, 0.55, 0.09, 0.05, 20, 5, C('#6b7488', -0.8)); mb.cyl(0, -0.02, 0, 0.5, 0.0, 0.5, 18, C('#0a0a22', -0.9), C('#0a0a22', -0.9)); mb.pop(); } }
      mb.push().T(-2.7, 0, 4.9, 0.5); mb.cyl(0, 0, 0, 0.3, 0.7, 0.26, 12, C('#e9ecf2', -0.8), C('#e9ecf2', -0.8)); mb.rbox(-0.32, 0.7, -0.26, 0.32, 1.2, 0.26, 0.1, C('#e9ecf2', -0.8), 2); mb.box(-0.24, 0.85, 0.25, 0.24, 1.08, 0.27, C('#14161f', -0.6)); for (const s of [-1, 1]) mb.sphereS(s * 0.1, 0.97, 0.275, 0.05, 0.05, 0.02, C('#4cc9f0', 1), 6, 4); limb(mb, [0, 1.2, 0], [0, 1.42, 0], [0.012, 0.012], C('#c9ced6', -0.8), 4); mb.sphereS(0, 1.45, 0, 0.05, 0.05, 0.05, C('#ff3b30', 1), 6, 4); for (const s of [-1, 1]) limb(mb, [s * 0.32, 0.6, 0], [s * 0.45, 0.35, 0.1], [0.04, 0.035], C('#c9ced6', -0.8), 5); mb.pop();
    },
  },
  /* ---- Uyum Testi: çiçek bahçesi ---- */
  uyt: {
    table: 'iron', tableO: { iron: '#f6f3ec' }, chair: 'iron', chairO: { iron: '#f6f3ec' }, rug: 'gingham', rugO: { rug: '#e8577a', rugM: '#f6b0c1', rugB: '#fff7f9' },
    L: VL.dusk, sky: ['#ff8fab', '#ffe5d9', '#ffe1e6'], posters: false, parts: 'petals',
    build(mb) {
      VK.ground(mb, '#6fbf5e', '#5aa84c', 0.3, 1.3);
      // taş patika, çiçek tarhları
      for (let k = 0; k < 9; k++) { const z = 5.0 + k * 0.85; mb.superS(Math.sin(k * 0.7) * 0.4, 0.02, z, 0.42, 0.05, 0.34, 0.5, 0.7, C('#d9d2c4', 0), 8, 4); }
      const bed = (x, z, w, d, cols) => { mb.rbox(x - w / 2, 0, z - d / 2, x + w / 2, 0.22, z + d / 2, 0.08, C('#7a5a3a', 0), 2); for (let k = 0; k < Math.round(w * d * 5); k++) { const fx = x - w / 2 + 0.1 + hs(k, x) * (w - 0.2), fz = z - d / 2 + 0.1 + hs(k, z) * (d - 0.2); mb.cyl(fx, 0.2, fz, 0.012, 0.42, 0.012, 3, C('#3f8f3a', 0), C('#3f8f3a', 0), ''); mb.sphereS(fx, 0.45, fz, 0.08, 0.07, 0.08, C(cols[k % cols.length], -0.2), 5, 3); } };
      for (const s of [-1, 1]) { bed(s * 6.2, -2.0, 1.4, 3.6, ['#ff4d6d', '#ffffff', '#ff8fab', '#ffd23f']); bed(s * 5.8, 3.4, 2.2, 1.1, ['#c9184a', '#ffd6e0', '#ffffff']); }
      // masanın çevresinde alçak çiçek öbekleri ve kazık fenerler (iki kişilik yakın kamerada da görünür)
      const FC = [['#ff4d6d', '#ffd6e0'], ['#ffffff', '#ffd23f'], ['#c77dff', '#ffffff'], ['#ff8fab', '#ffbe0b']];
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.39, r = 3.55 + hs(k, 51) * 0.55, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.85 + hs(k, 52) * 0.35, cols = FC[k % 4]; mb.sphereS(x, 0.16 * s, z, 0.46 * s, 0.28 * s, 0.4 * s, C(k % 2 ? '#4f9a45' : '#5aa84c', 0), 9, 5); mb.sphereS(x + 0.3 * s, 0.12 * s, z + 0.12, 0.3 * s, 0.2 * s, 0.28 * s, C('#62b356', 0), 8, 4); for (let j = 0; j < 9; j++) { const fa = j * 2.4 + k, fr = (0.1 + hs(j, k) * 0.28) * s; mb.sphereS(x + Math.cos(fa) * fr, 0.36 * s + hs(j, k + 3) * 0.08, z + Math.sin(fa) * fr * 0.9, 0.075, 0.06, 0.075, C(cols[j % 2], -0.2), 5, 3); } }
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.78, x = Math.cos(a) * 4.45, z = Math.sin(a) * 4.45, P = C('#2f3a2a', -0.4); mb.cyl(x, 0, z, 0.025, 0.72, 0.025, 6, P, P, ''); mb.cyl(x, 0.72, z, 0.09, 0.76, 0.09, 8, P, P); mb.sphereS(x, 0.86, z, 0.1, 0.11, 0.1, C('#fff1b8', 1), 8, 6); mb.cyl(x, 0.95, z, 0.1, 0.99, 0.03, 8, P, P, ''); }
      // gül kemeri (tabelanın çevresi), çardak direkleri ve peri ışıkları
      VK.sign(mb, 'wall', '#ffffff', '#fff8ec');
      for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI, x = Math.cos(a) * 2.3, y = 0.3 + Math.sin(a) * 3.3; mb.sphereS(x, y, -7.82, 0.2, 0.2, 0.16, C(k % 3 ? '#3f8f3a' : '#2f7a2f', 0), 7, 5); if (k % 2 === 0) mb.sphereS(x * 1.02, y + 0.05, -7.66, 0.12, 0.12, 0.1, C(k % 4 ? '#ff4d6d' : '#ffd6e0', -0.2), 7, 5); }
      for (const s of [-1, 1]) for (const z of [-7.9, -3.2]) mb.box(s * 5.8 - 0.1, 0, z - 0.1, s * 5.8 + 0.1, 3.4, z + 0.1, C('#ffffff', -0.3));
      for (const s of [-1, 1]) { mb.box(s * 5.8 - 0.12, 3.4, -8.0, s * 5.8 + 0.12, 3.55, -3.1, C('#ffffff', -0.3)); VK.bulbs(mb, [s * 5.8, 3.35, -3.2], [s * 2.0, 3.4, -7.8], 12, 0.5, ['#fff1b8', '#ffd6a5']); VK.bulbs(mb, [s * 5.8, 3.35, -7.9], [s * 5.8, 3.35, -3.2], 10, 0.35, ['#fff1b8']); }
      // fışkiye, bank, yuvarlak ağaçlar
      mb.push().T(-7.6, 0, -6.6); mb.lathe(0, 0, 0, [[1.2, 0], [1.25, 0.4], [1.1, 0.45], [0.2, 0.45]], 20, C('#e9e2d6', -0.2)); mb.cyl(0, 0.4, 0, 1.08, 0.42, 1.08, 20, C('#7fc8f8', -0.9), C('#7fc8f8', -0.9)); mb.cyl(0, 0.45, 0, 0.15, 1.3, 0.12, 10, C('#e9e2d6', -0.2), C('#e9e2d6', -0.2), ''); mb.lathe(0, 1.3, 0, [[0.55, 0], [0.5, 0.12], [0.1, 0.14]], 16, C('#e9e2d6', -0.2)); mb.cyl(0, 1.38, 0, 0.45, 1.4, 0.45, 16, C('#7fc8f8', -0.9), C('#7fc8f8', -0.9)); mb.sphereS(0, 1.62, 0, 0.12, 0.22, 0.12, C('#bfe9ff', 0.5), 8, 6); mb.pop();
      mb.push().T(7.4, 0, -6.6, -0.6); mb.box(-0.9, 0.42, -0.25, 0.9, 0.48, 0.25, C('#ffffff', -0.3)); mb.box(-0.9, 0.55, -0.3, 0.9, 0.95, -0.24, C('#ffffff', -0.3)); for (const x of [-0.8, 0.8]) mb.box(x - 0.04, 0, -0.28, x + 0.04, 0.48, 0.24, C('#d0d0d0', -0.5)); mb.pop();
      for (const [x, z, h] of [[-10.5, -8, 5.5], [10.6, -7.6, 5.0], [-12, 2, 4.8], [12, 3.2, 5.2], [-6, -12, 6], [6.4, -12.4, 5.6]]) VK.tree(mb, x, z, h, '#4f9a45', '#5fb052');
    },
  },
  /* ---- Kör Labirent: çöl vahası ---- */
  krl: {
    table: 'stone', tableO: { stone: '#d8b98a' }, chair: 'pouf', rug: 'round', rugO: { rug: '#a3262a', rugB: '#e9c46a' },
    L: VL.day, sky: ['#2fa8ff', '#ffe0a8', '#f6dcb0'], posters: false,
    build(mb) {
      VK.ground(mb, '#e8bd7e', '#cf9c5c', 0.22);
      // rüzgâr kum dalgaları: ışıklı sırt + gölgeli çukur, hafif kıvrık
      for (let k = 0; k < 30; k++) { const z = -12 + k * 0.82 + hs(k, 3) * 0.3, x0 = -30 + hs(k, 1) * 10; for (let j = 0; j < 14; j++) { if (hs(j, k + 40) < 0.3) continue; const L = 2.2 + hs(j, k) * 1.6, xa = x0 + j * 4.2, za = z + Math.sin(j * 0.9 + k) * 0.16, zb = z + Math.sin(j * 0.9 + k + 0.8) * 0.16, w = 0.04 + hs(k, j) * 0.03; mb.quadN([xa, 0.003, za], [xa, 0.003, za + w], [xa + L, 0.003, zb + w * 0.4], [xa + L, 0.003, zb], UPV, UPV, UPV, UPV, C('#efc98c', 0)); mb.quadN([xa, 0.0032, za + w], [xa, 0.0032, za + w * 2.2], [xa + L, 0.0032, zb + w * 0.9], [xa + L, 0.0032, zb + w * 0.4], UPV, UPV, UPV, UPV, C('#d4a262', 0)); } }
      for (let k = 0; k < 9; k++) { const a = Math.PI * 1.1 + (k / 8) * Math.PI * 0.8, R = 28 + hs(k, 3) * 12; mb.sphereS(Math.cos(a) * R, -1.5, Math.sin(a) * R, 10 + hs(k, 4) * 8, 5 + hs(k, 5) * 4, 7 + hs(k, 6) * 5, C(k % 2 ? '#e3b77a' : '#d8a86a', 0), 14, 8); }
      VK.sign(mb, 'stand', '#8a5a34', '#fff8ec');
      // vaha: gölet, palmiyeler, kayalar; bedevi çadırı, fenerler, kaktüsler
      // vaha (sol arka, masaya yakın): gölet, sazlık, palmiyeler
      mb.disc(-5.6, 0.006, -4.4, 2.5, 1.9, 20, C('#8fae5a', 0), C('#8fae5a', 0), MK_JIT);
      mb.disc(-5.6, 0.01, -4.4, 2.0, 1.45, 20, C('#2a9d8f', -0.9), C('#2a9d8f', -0.9), MK_JIT);
      mb.disc(-5.75, 0.012, -4.5, 1.3, 0.85, 16, C('#48c2b4', -0.9), C('#48c2b4', -0.9), MK_JIT);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, x = -5.6 + Math.cos(a) * 2.15, z = -4.4 + Math.sin(a) * 1.6; if (hs(k, 61) > 0.6) continue; for (let j = 0; j < 4; j++) limb(mb, [x, 0, z], [x + (hs(j, k) - 0.5) * 0.3, 0.5 + hs(k, j) * 0.4, z + (hs(k, j + 2) - 0.5) * 0.3], [0.025, 0.008], C(j % 2 ? '#6a8f3a' : '#7fa64a', 0), 3, null, 1); }
      for (const [x, z, s] of [[-7.6, -5.6, 1.35], [-4.0, -6.2, 1.1], [-7.2, -2.4, 1.0], [-10.4, -7.4, 1.6]]) { mb.push().T(x, 0, z, hs(x, z) * 4, 0, 0, s); DECOR.palm(mb, [], Math.round(x * 3)); mb.pop(); }
      // bedevi çadırı (sağ arka), önünde kilimler, minder ve çaydanlık
      mb.push().T(6.2, 0, -5.0, -0.35); VK.tent(mb, 3.6, 3.0, 2.4, '#c8553d', '#e9c46a'); mb.pop();
      mb.push().T(5.5, 0, -2.6, -0.35); for (let k = 0; k < 5; k++) VK.quad(mb, -1.25 + k * 0.5, -0.55, -0.79 + k * 0.5, 0.55, C(k % 2 ? '#a3262a' : '#2a9d8f', 0), 0.008); VK.quad(mb, -1.3, -0.6, 1.3, -0.55, C('#e9c46a', 0), 0.009); VK.quad(mb, -1.3, 0.55, 1.3, 0.6, C('#e9c46a', 0), 0.009); mb.pop();
      mb.push().T(5.0, 0, -2.4); mb.lathe(0, 0, 0, [[0.16, 0], [0.2, 0.08], [0.17, 0.2], [0.08, 0.26], [0.05, 0.34]], 12, C('#c9a34a', -0.85)); limb(mb, [0.16, 0.16, 0], [0.32, 0.28, 0], [0.025, 0.015], C('#c9a34a', -0.85), 4); mb.pop();
      // fenerler, kaktüsler, kayalar, deve dikeni öbekleri
      // önde alçak ateş kâseleri (masayı kapatmaz)
      for (const [x, z] of [[-5.4, 2.2], [5.6, 2.0]]) { const P = C('#3b2a1c', -0.5); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.3; limb(mb, [x + Math.cos(a) * 0.3, 0, z + Math.sin(a) * 0.3], [x, 0.5, z], [0.025, 0.02], P, 4); } mb.lathe(x, 0.48, z, [[0.06, 0], [0.3, 0.06], [0.36, 0.2], [0.33, 0.22]], 14, C('#c9a34a', -0.85), ''); mb.cyl(x, 0.6, z, 0.3, 0.64, 0.3, 12, C('#3a2418', 0), C('#3a2418', 0)); mb.cyl(x, 0.62, z, 0.2, 1.05, 0.0, 7, C('#ff8a1f', 1), C('#ff8a1f', 1), ''); mb.cyl(x + 0.05, 0.62, z, 0.12, 0.9, 0.0, 6, C('#ffd25a', 1), C('#ffd25a', 1), ''); }
      for (const [x, z] of [[-3.0, -5.4], [3.4, -5.8]]) { const P = C('#3b2a1c', -0.3); mb.cyl(x, 0, z, 0.05, 2.2, 0.04, 6, P, P); mb.cyl(x, 2.0, z, 0.16, 2.25, 0.16, 8, C('#c9a34a', -0.85), C('#c9a34a', -0.85)); mb.cyl(x, 2.25, z, 0.14, 2.55, 0.1, 8, C('#ffb347', 0.9), C('#ffb347', 0.9)); mb.cyl(x, 2.55, z, 0.12, 2.75, 0.0, 8, C('#c9a34a', -0.85), C('#c9a34a', -0.85), ''); }
      for (const [x, z, s] of [[7.9, -2.3, 1.0], [-7.0, 3.6, 0.85], [7.2, 3.8, 0.9], [-8.4, 0.2, 0.75]]) { mb.push().T(x, 0, z, hs(x, z) * 3, 0, 0, s); DECOR.cactus(mb, ['#ff5fa2'], 0); mb.pop(); }
      for (const [x, z, s] of [[-2.7, -6.5, 1.0], [2.8, -6.8, 1.2], [8.8, 0.6, 0.8], [-8.8, -1.6, 0.9], [4.4, 4.8, 0.6]]) { mb.push().T(x, 0, z, hs(x, z) * 6, 0, 0, s); DECOR.rock(mb); mb.pop(); }
      for (const [x, z] of [[-4.2, 3.2], [3.8, 3.6], [0.8, -5.0], [-1.4, 4.9]]) for (let j = 0; j < 7; j++) { const a = j * 0.9; limb(mb, [x, 0, z], [x + Math.cos(a) * 0.28, 0.22 + hs(j, x) * 0.12, z + Math.sin(a) * 0.28], [0.02, 0.006], C('#9a8a4a', 0), 3, null, 1); }
    },
  },
});

Object.assign(VENUES, {
  /* ---- Tahmin Ustası: mucit atölyesi ---- */
  tus: {
    table: 'gear', tableO: { wood: '#b9824e', copper: '#b87333', gearC: '#8a8f98' }, chair: 'stool', chairO: { leg: '#4a5058', gloss: -0.1 }, rug: null,
    L: VL.warm, sky: ['#2a231d', '#4a3a2c', '#2a231d'], posters: 'wall', parts: 'dust',
    anim: [{ key: 'gearBig', x: -5.2, y: 3.3, z: -7.6, ax: 'z', sp: 0.25 }, { key: 'gearSmall', x: -3.62, y: 2.42, z: -7.55, ax: 'z', sp: -0.48 }],
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#2b2018', 0), -0.01);
      VK.noise(mb, -8.4, -7.8, 8.4, 12, 1.2, '#8f8a82', '#7a766f', 0.35, -0.1, 0);
      for (let x = -7.2; x < 8.4; x += 2.4) VK.quad(mb, x - 0.02, -7.8, x + 0.02, 12, C('#5e5a54', 0), 0.003); for (let z = -5.4; z < 12; z += 2.4) VK.quad(mb, -8.4, z - 0.02, 8.4, z + 0.02, C('#5e5a54', 0), 0.003);
      for (let k = 0; k < 34; k++) { const x0 = -8.4 + k * 0.5; mb.quadN([x0, 0.004, -6.25], [x0 + 0.25, 0.004, -6.25], [x0 + 0.5, 0.004, -5.97], [x0 + 0.25, 0.004, -5.97], UPV, UPV, UPV, UPV, C('#ffbe0b', -0.2)); } VK.quad(mb, -8.4, -6.3, 8.4, -5.92, C('#1b1b1e', 0), 0.0035);
      for (let k = 0; k < 14; k++) { const x = -7 + hs(k, 1) * 14, z = -6 + hs(k, 2) * 16; if (Math.hypot(x, z) < 4) continue; mb.disc(x, 0.006, z, 0.25 + hs(k, 3) * 0.3, 0.2 + hs(k, 4) * 0.2, 10, C('#4a3624', 0)); }
      vShell(mb, { wall: '#8a5a3c', dado: [1.3, '#5a3a28'], top: '#3a2418', base: '#2a1a10' });
      for (let r = 0; r < 18; r++) for (let k = 0; k < 30; k++) { if (hs(r, k) > 0.55) continue; const x = -8.4 + k * 0.58 + (r % 2) * 0.29, y = 1.35 + r * 0.2; if (y > 5) continue; VK.fq(mb, x, y, x + 0.5, y + 0.16, -7.788, C(hs(k, r) > 0.3 ? '#7a4a32' : '#9a5e40', 0)); }
      VK.sign(mb, 'wall', '#b87333', '#fff8ec');
      // delikli takım panosu (sağ), raflar ve kavanozlar, tezgâh ve mengene
      mb.box(2.6, 1.4, -7.79, 7.6, 3.6, -7.76, C('#c9a77a', 0));
      for (let i = 0; i < 25; i++) for (let j = 0; j < 9; j++) VK.fq(mb, 2.75 + i * 0.2, 1.5 + j * 0.24, 2.78 + i * 0.2, 1.53 + j * 0.24, -7.757, C('#5a3e28', 0));
      const tool = (x, y, kind) => { const M = C('#9aa3ad', -0.8), H = C('#c8553d', -0.2); if (kind === 0) { mb.box(x - 0.03, y - 0.35, -7.74, x + 0.03, y + 0.2, -7.72, M); mb.box(x - 0.1, y + 0.18, -7.74, x + 0.1, y + 0.3, -7.72, M); } else if (kind === 1) { mb.box(x - 0.035, y - 0.35, -7.74, x + 0.035, y + 0.05, -7.72, H); mb.box(x - 0.16, y + 0.05, -7.75, x + 0.16, y + 0.16, -7.71, M); } else { mb.box(x - 0.025, y - 0.3, -7.74, x + 0.025, y + 0.1, -7.72, C('#ffd23f', -0.2)); mb.box(x - 0.012, y + 0.1, -7.74, x + 0.012, y + 0.32, -7.72, M); } };
      for (let k = 0; k < 9; k++) tool(3.0 + k * 0.52, 2.65 + (k % 2) * 0.2, k % 3);
      for (let r = 0; r < 2; r++) { mb.box(-8.1, 1.6 + r * 0.9, -7.8, -6.3, 1.65 + r * 0.9, -7.45, C('#5a3a28', 0)); for (let k = 0; k < 5; k++) { const x = -7.9 + k * 0.36, h = 0.2 + hs(k, r) * 0.15; mb.cyl(x, 1.65 + r * 0.9, -7.62, 0.12, 1.65 + r * 0.9 + h, 0.12, 10, C('#bfe3d6', -0.9), C('#bfe3d6', -0.9)); mb.cyl(x, 1.65 + r * 0.9 + h, -7.62, 0.125, 1.65 + r * 0.9 + h + 0.05, 0.125, 10, C('#b87333', -0.8), C('#b87333', -0.8)); mb.cyl(x, 1.66 + r * 0.9, -7.62, 0.1, 1.65 + r * 0.9 + h * 0.6, 0.1, 10, C(['#e63946', '#ffb703', '#2a9d8f', '#8338ec'][(k + r) % 4], -0.4), C(['#e63946', '#ffb703', '#2a9d8f', '#8338ec'][(k + r) % 4], -0.4)); } }
      mb.push().T(5.1, 0, -6.95); VK.counter(mb, 5.0, 0.92, 0.9, '#5a3a28', '#8a6a48'); mb.box(1.6, 0.92, -0.2, 1.9, 1.12, 0.2, C('#4a5058', -0.7)); mb.box(1.45, 1.12, -0.25, 2.05, 1.2, 0.25, C('#4a5058', -0.7)); mb.box(-1.8, 0.92, -0.3, -1.0, 1.0, 0.3, C('#c9a34a', -0.8)); mb.pop();
      // duvar saati, dikili matkap, sandıklar, köşede buhar kazanı
      mb.cyl(0, 3.75, -7.79, 0.42, 3.75, 0.42, 24, C('#b87333', -0.85), C('#b87333', -0.85)); mb.push().T(0, 3.75, -7.79, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.42, 0.06, 0.42, 24, C('#b87333', -0.85), C('#f6ead8', 0)); mb.pop(); mb.box(-0.015, 3.75, -7.72, 0.015, 4.05, -7.71, C('#1b1b1e', 0)); mb.box(-0.015, 3.6, -7.72, 0.2, 3.63, -7.71, C('#1b1b1e', 0));
      for (const [x, z, r] of [[-7.5, 2.6, 0.2], [-7.0, 3.5, -0.3], [7.6, 3.0, 0.5]]) { mb.push().T(x, 0, z, r, 0, 0, 0.75); DECOR.crate(mb, ['#b87333'], 0); mb.pop(); }
      mb.push().T(7.4, 0, -3.8); mb.lathe(0, 0, 0, [[0.6, 0], [0.62, 0.2], [0.62, 1.6], [0.4, 1.95], [0.12, 2.05]], 18, C('#b87333', -0.85)); for (const y of [0.5, 1.0, 1.5]) mb.torusN(0, y, 0, 0.63, 0.03, 0.03, 18, 4, C('#7a4a22', -0.8)); mb.cyl(0, 2.05, 0, 0.08, 2.7, 0.08, 8, C('#4a5058', -0.8), C('#4a5058', -0.8)); mb.cyl(0.3, 1.2, 0.55, 0.09, 1.2, 0.09, 10, C('#f6ead8', 0), C('#f6ead8', 0)); mb.push().T(0.3, 1.2, 0.58, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.11, 0.04, 0.11, 12, C('#4a5058', -0.8), C('#f6ead8', 0)); mb.pop(); mb.pop();
      for (const s of [-1, 1]) for (const z of [-4.6, 0.8]) { mb.box(s * 8.38, 2.7, z - 0.1, s * 8.3, 3.0, z + 0.1, C('#b87333', -0.8)); mb.sphereS(s * 8.24, 3.04, z, 0.12, 0.16, 0.12, C('#ffd9a0', 1), 8, 6); }
      // ön bölge: kırmızı alet çantası, yerde mavi çizim kâğıtları, dişli yığını, yaylı icat kutusu
      mb.push().T(2.7, 0, 4.8, -0.4); mb.box(-0.42, 0, -0.22, 0.42, 0.34, 0.22, C('#c8261c', -0.4)); mb.box(-0.44, 0.34, -0.24, 0.44, 0.4, 0.24, C('#a31d15', -0.4)); limb(mb, [-0.2, 0.4, 0], [0, 0.52, 0], [0.015, 0.015], C('#2b2b2b', -0.5), 3); limb(mb, [0.2, 0.4, 0], [0, 0.52, 0], [0.015, 0.015], C('#2b2b2b', -0.5), 3); mb.box(-0.06, 0.26, 0.221, 0.06, 0.32, 0.226, C('#c9ced6', -0.9)); mb.pop();
      for (const [x, z, r] of [[-2.6, 4.9, 0.3], [-2.1, 5.5, -0.25]]) { mb.push().T(x, 0.007 + (r < 0 ? 0.002 : 0), z, r); VK.quad(mb, -0.5, -0.36, 0.5, 0.36, C('#2f6db0', 0), 0); for (let k = 0; k < 4; k++) VK.quad(mb, -0.4, -0.26 + k * 0.16, 0.1 + hs(k, x) * 0.3, -0.25 + k * 0.16, C('#dbe9ff', 0.4), 0.001); mb.torusN(0.22, 0.001, 0.08, 0.1, 0.006, 0.001, 14, 3, C('#dbe9ff', 0.4)); mb.pop(); }
      mb.push().T(1.2, 0, 6.2); for (let k = 0; k < 3; k++) { mb.push().T((hs(k, 3) - 0.5) * 0.12, 0.05 + k * 0.1, (hs(k, 4) - 0.5) * 0.12, k * 0.5, Math.PI / 2); vGear(mb, 0.32 - k * 0.07, 9 - k, k % 2 ? C('#c9ced6', -0.85) : C('#b87333', -0.85)); mb.pop(); } mb.pop();
      mb.push().T(-1.0, 0, 6.6, 0.5); mb.box(-0.3, 0, -0.3, 0.3, 0.55, 0.3, C('#e9c46a', -0.2)); for (let k = 0; k < 6; k++) mb.torusN(0, 0.58 + k * 0.06, 0, 0.12, 0.015, 0.015, 12, 4, C('#c9ced6', -0.9)); mb.sphereS(0, 1.0, 0, 0.16, 0.16, 0.16, C('#ff6f61', -0.2), 10, 7); for (const s2 of [-1, 1]) mb.sphereS(s2 * 0.06, 1.04, 0.13, 0.03, 0.03, 0.02, C('#1b1b1e', 0), 6, 4); mb.pop();
      // fikir ampulü: kaide üstünde dev, yanan ampul (sol arka)
      mb.push().T(-5.9, 0, -3.6); const Cu = C('#b87333', -0.85), Fe = C('#3a3d44', -0.7); mb.cyl(0, 0, 0, 0.5, 0.12, 0.46, 16, Fe, Fe); mb.cyl(0, 0.12, 0, 0.3, 0.9, 0.26, 14, C('#5a3a28', 0), C('#5a3a28', 0)); mb.cyl(0, 0.9, 0, 0.36, 0.98, 0.36, 14, Cu, Cu); for (let k = 0; k < 4; k++) mb.torusN(0, 1.03 + k * 0.07, 0, 0.2 - k * 0.012, 0.03, 0.03, 14, 4, Cu); mb.cyl(0, 0.98, 0, 0.2, 1.3, 0.18, 12, C('#c9ced6', -0.9), C('#c9ced6', -0.9), ''); mb.sphereS(0, 1.82, 0, 0.6, 0.62, 0.6, C('#ffe7a0', 0.92), 18, 12); mb.sphereS(0, 1.82, 0, 0.66, 0.68, 0.66, C('#fff6d8', 0.5), 12, 8); mb.pop();
      // tezgâh (sağ, masaya dönük): mengene, dişliler, masa lambası, tornavidalar
      mb.push().T(6.1, 0, 0.6, -Math.PI / 2); VK.counter(mb, 2.6, 0.9, 0.8, '#6b4428', '#9a7450'); mb.box(0.7, 0.9, -0.15, 1.0, 1.08, 0.15, Fe); mb.box(0.6, 1.08, -0.2, 1.1, 1.15, 0.2, Fe); for (const [x, z, r] of [[-0.6, 0.05, 0.16], [-0.25, -0.15, 0.1], [0.15, 0.1, 0.12]]) { mb.push().T(x, 0.955, z, 0, Math.PI / 2); vGear(mb, r, 8, Cu); mb.pop(); } limb(mb, [-1.0, 0.9, -0.25], [-0.95, 1.4, -0.2], [0.02, 0.02], Fe, 4); limb(mb, [-0.95, 1.4, -0.2], [-0.7, 1.55, -0.05], [0.02, 0.02], Fe, 4); mb.push().T(-0.68, 1.53, -0.04, 0, 0.6); mb.cyl(0, -0.08, 0, 0.13, 0.06, 0.06, 10, C('#2a9d8f', -0.8), C('#2a9d8f', -0.8), ''); mb.cyl(0, -0.085, 0, 0.1, -0.075, 0.1, 10, C('#fff1c9', 1), C('#fff1c9', 1)); mb.pop(); mb.pop();
    },
  },
  /* ---- Taş Kağıt Makas: kayak evi önünde kar ---- */
  tkm: {
    table: 'ice', chair: 'ice', rug: 'round', rugO: { rug: '#ffffff', rugB: '#8ecae6' },
    L: VL.snow, sky: ['#5aa9e6', '#e7f5ff', '#e2eef8'], posters: 'poles', parts: 'snow',
    build(mb) {
      VK.ground(mb, '#f4f8fb', '#dfe9f2', 0.3);
      for (let k = 0; k < 12; k++) { const x = -8 + hs(k, 1) * 16, z = 4.5 + hs(k, 2) * 6; mb.disc(x, 0.006, z, 0.16, 0.24, 8, C('#cfdbe6', 0)); mb.disc(x + 0.3, 0.006, z + 0.6, 0.16, 0.24, 8, C('#cfdbe6', 0)); }
      // kayak evi cephesi: kütük, yanan pencereler, karlı saçak
      const LG = C('#7a5338', 0), LD = C('#5c3d28', 0);
      mb.box(-6.8, 0, -10.6, 6.8, 3.4, -8.0, LG);
      for (let y = 0.25; y < 3.3; y += 0.3) mb.box(-6.82, y, -8.02, 6.82, y + 0.05, -7.98, LD);
      for (const x of [-5.0, -3.1, 3.1, 5.0]) { mb.box(x - 0.55, 1.1, -7.99, x + 0.55, 2.3, -7.95, C('#e9e4d8', 0)); mb.box(x - 0.45, 1.2, -7.95, x + 0.45, 2.2, -7.93, C('#ffd27a', 0.5)); mb.box(x - 0.6, 1.05, -7.97, x + 0.6, 1.12, -7.75, C('#f4f8fb', 0)); }
      for (let k = 0; k < 14; k++) { const x0 = -7.2 + k * 1.03, n = vnorm([0, 1, 0.6]); mb.quadN([x0, 4.4, -9.4], [x0 + 1.03, 4.4, -9.4], [x0 + 1.03, 3.3, -7.6], [x0, 3.3, -7.6], n, n, n, n, C('#f4f8fb', 0)); }
      mb.box(-7.2, 3.15, -7.65, 7.2, 3.32, -7.5, C('#f4f8fb', 0));
      for (let k = 0; k < 18; k++) { const x = -7 + k * 0.8; mb.cyl(x, 2.9 - hs(k, 1) * 0.3, -7.56, 0.0, 3.16, 0.05, 6, C('#dff3ff', -0.9), C('#dff3ff', -0.9)); }
      VK.sign(mb, 'stand', '#5c3d28', '#fff8ec');
      mb.rbox(-1.9, 2.84, -7.9, 1.9, 3.02, -7.5, 0.08, C('#f4f8fb', 0), 2);
      // köknarlar, kardan adamlar, kayak rafı, iglo, kızak
      for (let k = 0; k < 12; k++) { const s = k % 2 ? 1 : -1, x = s * (8 + hs(k, 3) * 6), z = -9 + hs(k, 4) * 16; mb.push().T(x, 0, z, 0, 0, 0, 1.5 + hs(k, 5) * 0.8); DECOR.pineSnow(mb, [], k); mb.pop(); }
      for (const [x, z, r] of [[-6.6, -5.6, 0.4], [6.8, 3.4, -0.5]]) { mb.push().T(x, 0, z, r, 0, 0, 1.1); DECOR.snowman(mb, ['#ffffff', '#ffffff', '#ffffff', '#e63946'], 0); mb.pop(); }
      mb.push().T(-7.4, 0, 1.0, 0.25); mb.box(-1.0, 0, -0.05, 1.0, 1.6, 0.05, C('#5c3d28', 0)); for (let k = 0; k < 4; k++) { const x = -0.7 + k * 0.45; mb.push().T(x, 0, 0.12, 0, -0.12); mb.box(-0.05, 0, -0.01, 0.05, 1.75, 0.03, C(['#e63946', '#3a86ff', '#ffb703', '#2a9d8f'][k], -0.6)); mb.pop(); } mb.pop();
      mb.push().T(6.9, 0, -5.8, -0.6); mb.lathe(0, 0, 0, [[1.5, 0], [1.45, 0.5], [1.25, 1.0], [0.85, 1.35], [0.0, 1.55]], 18, (k, a) => C(Math.floor(a * 4) % 2 ? '#f4f8fb' : '#e6eff6', 0)); mb.push().T(0, 0, 1.4, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.55, 0.5, 0.55, 12, C('#eef4f9', 0), C('#eef4f9', 0), ''); mb.pop(); mb.disc(0, 0.01, 1.62, 0.42, 0.06, 10, C('#33404d', 0)); mb.box(-0.4, 0, 1.4, 0.4, 0.8, 1.42, C('#2a3440', 0)); mb.pop();
      for (let k = 0; k < 9; k++) { const a = k * 2.4, r = k < 6 ? 0.22 : 0.12, y = k < 6 ? 0.12 : 0.32; mb.sphereS(-2.6 + Math.cos(a) * r, y, 4.8 + Math.sin(a) * r, 0.13, 0.12, 0.13, C('#ffffff', 0), 8, 6); }
      mb.push().T(-1.3, 0, 6.6, 0.3, 0, 0, 0.6); DECOR.snowman(mb, ['#ffffff', '#ffffff', '#ffffff', '#3a86ff'], 1); mb.pop();
      mb.push().T(3.2, 0, 6.8, 0.2); for (const s2 of [-1, 1]) { mb.push().T(s2 * 0.14, 0, 0, 0, s2 * 0.06); mb.box(-0.05, 0, -0.02, 0.05, 1.7, 0.02, C(s2 < 0 ? '#e63946' : '#ffb703', -0.6)); mb.pop(); limb(mb, [s2 * 0.42, 0, 0.2], [s2 * 0.48, 1.2, 0.24], [0.012, 0.012], C('#4a5058', -0.7), 4); } mb.pop();
      mb.push().T(2.5, 0, 5.2, 0.4); mb.box(-0.5, 0.18, -0.9, 0.5, 0.26, 0.9, C('#c8553d', 0)); for (const s of [-1, 1]) { mb.box(s * 0.45 - 0.03, 0, -1.0, s * 0.45 + 0.03, 0.05, 1.0, C('#4a5058', -0.7)); limb(mb, [s * 0.45, 0.05, 1.0], [s * 0.45, 0.25, 1.18], [0.025, 0.025], C('#4a5058', -0.7), 4); } mb.pop();
    },
  },
  /* ---- Harf Karması: kahvehane ---- */
  hkr: {
    table: 'felt', tableO: { felt: '#2f7a4f', wood: '#3b2a1c' }, chair: 'hasir', chairO: { wood: '#5a3a24' }, rug: null,
    L: VL.warm, sky: ['#3a2a1c', '#5a4030', '#2a1d14'], posters: 'wall',
    anim: [{ key: 'fan', x: 0, y: 4.75, z: -1.2, ax: 'y', sp: 2.4 }],
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#2a1d14', 0), -0.01);
      VK.tiles(mb, -8.4, -7.8, 8.4, 12, 0.6, '#e8dcc4', '#8c3a2e', '#6a5a48', -0.3);
      vShell(mb, { wall: '#efe2c6', dado: [1.4, '#2f6db0'], top: '#5a3a28', base: '#3b2a1c' });
      for (let i = 0; i < 29; i++) for (let j = 0; j < 7; j++) { const x = -8.4 + i * 0.58, y = j * 0.2; VK.fq(mb, x + 0.02, y + 0.02, x + 0.56, y + 0.18, -7.788, C((i + j) % 3 ? '#f4f8fb' : '#2f6db0', -0.6)); VK.fq(mb, x + 0.22, y + 0.07, x + 0.36, y + 0.13, -7.785, C('#2f6db0', -0.6)); }
      VK.sign(mb, 'wall', '#5a3a28', '#fff8ec');
      // çay ocağı: tezgâh, semaver, bardak rafı; duvarda televizyon, çerçeveli eski fotoğraflar, saat
      mb.push().T(-5.8, 0, -7.0); VK.counter(mb, 3.6, 1.05, 0.8, '#5a3a28', '#c9a34a'); mb.pop();
      mb.push().T(-6.6, 1.05, -7.0); mb.lathe(0, 0, 0, [[0.16, 0], [0.2, 0.05], [0.22, 0.4], [0.16, 0.55], [0.06, 0.6]], 16, C('#d9dce1', -0.92)); mb.lathe(0, 0.6, 0, [[0.14, 0], [0.17, 0.05], [0.16, 0.25], [0.06, 0.3]], 14, C('#c8261c', -0.7)); limb(mb, [0.2, 0.3, 0], [0.32, 0.24, 0], [0.02, 0.015], C('#d9dce1', -0.92), 4); mb.pop();
      for (let k = 0; k < 9; k++) { const x = -7.6 + k * 0.42; mb.lathe(x, 1.05, -7.25, [[0.04, 0], [0.05, 0.02], [0.035, 0.07], [0.05, 0.12]], 10, C('#a33b1e', -0.85)); }
      mb.box(-7.9, 1.9, -7.8, -3.7, 1.94, -7.5, C('#5a3a28', 0)); for (let k = 0; k < 12; k++) mb.lathe(-7.7 + k * 0.34, 1.94, -7.62, [[0.04, 0], [0.05, 0.02], [0.035, 0.07], [0.05, 0.12]], 10, C('#e9f2f8', -0.9));
      mb.push().T(5.2, 3.5, -7.6); mb.box(-1.0, -0.6, -0.08, 1.0, 0.6, 0.02, C('#15171c', -0.6)); mb.box(-0.92, -0.52, 0.021, 0.92, 0.52, 0.025, C('#2f8f4a', 0.9)); mb.box(-0.92, -0.04, 0.026, 0.92, 0.04, 0.028, C('#ffffff', 0.9)); mb.cyl(0, 0, 0.027, 0.18, 0.0, 0.18, 14, C('#ffffff', 0.9), C('#ffffff', 0.9)); mb.pop();
      for (const [x, y] of [[-3.2, 3.4], [3.0, 3.1], [3.0, 2.0]]) { mb.rbox(x - 0.42, y - 0.32, -7.84, x + 0.42, y + 0.32, -7.76, 0.02, C('#3b2a1c', 0), 1); mb.box(x - 0.34, y - 0.24, -7.77, x + 0.34, y + 0.24, -7.755, C(['#b5a48a', '#9c8a70', '#c4b49a'][Math.round(y) % 3], 0)); }
      // diğer okey masaları (köşelerde), portmanto, saksı
      const okey = (x, z, r) => { mb.push().T(x, 0, z, r); mb.box(-0.6, TABLE_Y - 0.05, -0.6, 0.6, TABLE_Y, 0.6, C('#2f7a4f', 0)); mb.box(-0.66, TABLE_Y - 0.08, -0.66, 0.66, TABLE_Y - 0.03, 0.66, C('#3b2a1c', 0)); for (const [a, b] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) mb.box(a - 0.04, 0, b - 0.04, a + 0.04, TABLE_Y - 0.08, b + 0.04, C('#3b2a1c', 0)); for (let k = 0; k < 14; k++) mb.box(-0.4 + (k % 7) * 0.12, TABLE_Y, 0.3 - Math.floor(k / 7) * 0.6, -0.31 + (k % 7) * 0.12, TABLE_Y + 0.13, 0.36 - Math.floor(k / 7) * 0.6, C('#f4efe2', -0.3)); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; mb.push().T(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95, -a - Math.PI / 2); chairModel(mb, '#4a2e1c', '#4a2e1c'); mb.pop(); } mb.pop(); };
      okey(-6.6, 2.2, 0.15); okey(6.6, 1.6, -0.2);
      // ön bölge: tavla sehpası ve iki tabure, minderde uyuyan kedi, yerde gazete
      mb.push().T(-2.7, 0, 5.0, 0.2); mb.box(-0.42, 0.5, -0.32, 0.42, 0.55, 0.32, C('#5a3a28', 0)); for (const [a2, b2] of [[-0.36, -0.26], [0.36, -0.26], [-0.36, 0.26], [0.36, 0.26]]) mb.box(a2 - 0.03, 0, b2 - 0.03, a2 + 0.03, 0.5, b2 + 0.03, C('#3b2a1c', 0)); for (const s2 of [-1, 1]) { mb.box(s2 * 0.01 - 0.36 * (s2 < 0 ? 1 : 0), 0.55, -0.27, s2 * 0.01 + 0.36 * (s2 > 0 ? 1 : 0), 0.6, 0.27, C('#8a5a34', 0)); mb.box(s2 * 0.03 - 0.31 * (s2 < 0 ? 1 : 0), 0.6, -0.22, s2 * 0.03 + 0.31 * (s2 > 0 ? 1 : 0), 0.602, 0.22, C('#e9d6b0', 0)); } for (let k = 0; k < 12; k++) { const x = -0.29 + (k % 6) * 0.1 + (k % 6 > 2 ? 0.06 : 0), z = k < 6 ? -0.2 : 0.2; mb.triN([x - 0.04, 0.603, z], [x + 0.04, 0.603, z], [x, 0.603, z * 0.35], UPV, UPV, UPV, C(k % 2 ? '#8c3a2e' : '#3b2a1c', 0)); } for (let k = 0; k < 5; k++) mb.cyl(-0.2 + k * 0.1, 0.602, (k % 2 ? 0.1 : -0.06), 0.035, 0.62, 0.035, 10, C(k % 2 ? '#f4efe2' : '#2a1d14', -0.3), C(k % 2 ? '#f4efe2' : '#2a1d14', -0.3)); for (const s2 of [-1, 1]) { mb.cyl(s2 * 0.75, 0, 0, 0.17, 0.42, 0.17, 10, C('#4a2e1c', 0), C('#4a2e1c', 0), ''); mb.cyl(s2 * 0.75, 0.42, 0, 0.2, 0.46, 0.2, 12, C('#c9a34a', -0.3), C('#c9a34a', -0.3)); } mb.pop();
      mb.push().T(2.7, 0, 4.9, -0.5); mb.cyl(0, 0, 0, 0.36, 0.1, 0.34, 14, C('#a3262a', -0.2), C('#a3262a', -0.2)); mb.sphereS(0, 0.2, 0, 0.24, 0.13, 0.18, C('#e9a23b', 0), 12, 7); mb.sphereS(0.2, 0.2, 0.06, 0.1, 0.09, 0.1, C('#e9a23b', 0), 10, 6); for (const s2 of [-1, 1]) mb.triN([0.22, 0.27, 0.06 + s2 * 0.06], [0.24, 0.36, 0.06 + s2 * 0.045], [0.2, 0.28, 0.06 + s2 * 0.02], UPV, UPV, UPV, C('#c97f22', 0)); limb(mb, [-0.22, 0.14, 0], [-0.2, 0.12, 0.26], [0.035, 0.03], C('#e9a23b', 0), 5); limb(mb, [-0.2, 0.12, 0.26], [0.05, 0.11, 0.3], [0.03, 0.025], C('#e9a23b', 0), 5); for (let k = 0; k < 3; k++) mb.box(-0.12 + k * 0.1, 0.32, -0.1, -0.08 + k * 0.1, 0.33, 0.1, C('#c97f22', 0)); mb.pop();
      mb.push().T(1.2, 0.006, 6.2, 0.6); VK.quad(mb, -0.3, -0.21, 0.3, 0.21, C('#f2eee4', 0), 0); for (let k = 0; k < 5; k++) VK.quad(mb, -0.25, -0.16 + k * 0.07, 0.25, -0.14 + k * 0.07, C('#8a8478', 0), 0.001); VK.quad(mb, -0.25, -0.18, 0.25, -0.17, C('#2b2b2b', 0), 0.0012); mb.pop();
      VK.plant(mb, 7.6, -7.2, 1.25); VK.plant(mb, -7.8, 5.8, 1.1);
      const P = C('#3b2a1c', -0.3); mb.cyl(7.7, 0, -3.8, 0.25, 0.06, 0.22, 12, P, P); mb.cyl(7.7, 0.06, -3.8, 0.03, 1.9, 0.03, 6, P, P, ''); mb.cyl(7.7, 1.5, -3.8, 0.24, 1.86, 0.18, 12, C('#5a5048', 0), C('#5a5048', 0), '');
      mb.cyl(0, 4.95, -1.2, 0.03, 5.2, 0.03, 6, C('#2b2b2b', 0), C('#2b2b2b', 0));
    },
  },
  /* ---- Doğru mu Yanlış mı: haber merkezi ---- */
  dyg: {
    table: 'desk', tableO: { top: '#f4f6fb', skirt: '#1d3557', glow: '#e63946' }, chair: 'office', rug: 'led', rugO: { glow: '#4aa3ff', rug: '#0f1a2e' },
    L: VL.studio, sky: ['#120d0b', '#2b1f1a', '#141a26'], posters: 'wall',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#0f1420', 0), -0.01);
      VK.tiles(mb, -8.4, -7.8, 8.4, 12, 1.4, '#1c2638', '#212c40', '#121926', -0.85);
      vShell(mb, { wall: '#1d2638', dado: [0.9, '#151c2a'], top: '#e63946', base: '#0d121c' });
      // ekran duvarı: dünya haritası paneli, haber kutuları, kırmızı son dakika bandı
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = s * (2.6 + i * 2.65) + (s < 0 ? -2.5 : 0), y = 1.0 + j * 1.55; mb.box(x - 0.06, y - 0.06, -7.79, x + 2.56, y + 1.46, -7.77, C('#0b0d12', -0.6)); mb.box(x, y, -7.77, x + 2.5, y + 1.4, -7.765, C(['#1e5fa8', '#2f7ad1', '#16467e', '#2a6bb8'][i + j * 2], 0.9)); for (let k = 0; k < 5; k++) mb.box(x + 0.25 + hs(k, i + j * 3 + s) * 1.6, y + 0.2 + hs(k, j + s * 5) * 0.9, -7.764, x + 0.55 + hs(k, i + j * 3 + s) * 1.6, y + 0.34 + hs(k, j + s * 5) * 0.9, -7.762, C(k % 2 ? '#ffffff' : '#9fd3ff', 0.9)); }
      VK.sign(mb, 'screen');
      mb.box(-8.3, 0.55, -7.76, 8.3, 0.85, -7.73, C('#e63946', 1)); for (let k = 0; k < 22; k++) mb.box(-8 + k * 0.75, 0.64, -7.728, -7.6 + k * 0.75, 0.76, -7.725, C('#ffffff', 0.9));
      // yanlarda haber masaları ve monitörler, stüdyo kameraları, spotlar
      for (const s of [-1, 1]) { mb.push().T(s * 6.7, 0, -5.4, s * -0.4); mb.box(-1.1, 0, -0.4, 1.1, 0.74, 0.4, C('#2a3550', -0.6)); mb.box(-1.15, 0.74, -0.45, 1.15, 0.78, 0.45, C('#e9edf4', -0.8)); for (const x of [-0.55, 0.55]) { mb.box(x - 0.42, 0.95, -0.2, x + 0.42, 1.48, -0.16, C('#14161b', -0.6)); mb.box(x - 0.38, 0.99, -0.159, x + 0.38, 1.44, -0.155, C(x < 0 ? '#4aa3ff' : '#e9edf4', 0.85)); mb.box(x - 0.04, 0.78, -0.2, x + 0.04, 0.95, -0.17, C('#14161b', -0.6)); } mb.pop(); }
      const cam = (x, z, ry) => { mb.push().T(x, 0, z, ry); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45], [0, 0.12, 0], [0.04, 0.035], C('#22252c', -0.6), 5); mb.sphereS(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45, 0.06, 0.05, 0.06, C('#111111', -0.4), 6, 4); } mb.cyl(0, 0.1, 0, 0.07, 1.3, 0.07, 8, C('#9aa3ad', -0.85), C('#9aa3ad', -0.85)); mb.box(-0.25, 1.3, -0.45, 0.25, 1.7, 0.35, C('#22252c', -0.6)); mb.push().T(0, 1.5, -0.45, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.14, 0.3, 0.16, 12, C('#111111', -0.9), C('#2a3a5a', -0.9)); mb.pop(); mb.box(-0.06, 1.62, 0.3, 0.06, 1.7, 0.36, C('#ff3b30', 1)); mb.box(-0.2, 1.72, -0.1, 0.2, 1.95, 0.2, C('#14161b', -0.6)); mb.pop(); };
      cam(-6.4, 3.6, 2.5); cam(6.3, 3.8, -2.5); cam(2.7, 5.3, -2.75);
      for (const [x, z, r] of [[-2.7, 4.8, 0.2], [-2.2, 5.4, -0.3]]) { mb.push().T(x, 0, z, r); for (let k = 0; k < 6; k++) { mb.push().T(0, k * 0.05, 0, (hs(k, x) - 0.5) * 0.2); mb.box(-0.3, 0, -0.22, 0.3, 0.048, 0.22, C(k % 2 ? '#f2eee4' : '#e6e1d4', 0)); mb.pop(); } mb.box(-0.26, 0.3, -0.18, 0.26, 0.302, -0.1, C('#e63946', 0)); for (let k = 0; k < 3; k++) mb.box(-0.26, 0.3, -0.05 + k * 0.07, 0.15, 0.302, -0.03 + k * 0.07, C('#8a8478', 0)); mb.pop(); }
      { const pts = []; for (let k = 0; k <= 14; k++) pts.push([2.5 - k * 0.32 + Math.sin(k * 0.9) * 0.25, 5.3 + Math.sin(k * 0.6) * 0.5 + k * 0.12]); for (let k = 0; k < pts.length - 1; k++) limb(mb, [pts[k][0], 0.02, pts[k][1]], [pts[k + 1][0], 0.02, pts[k + 1][1]], [0.02, 0.02], C('#0b0d12', -0.3), 4, null, 1); }
      for (const s of [-1, 1]) { mb.push().T(s * 7.6, 0, -1.8, 0, 0, 0, 0.9); DECOR.spot(mb, ['#4aa3ff'], 0); mb.pop(); }
    },
  },
  /* ---- Başkent Yarışı: havalimanı bekleme salonu ---- */
  byr: {
    table: 'glass', tableO: { glow: '#4cc9f0', top: '#dfe8f0' }, chair: 'pod', rug: 'round', rugO: { rug: '#16485e', rugB: '#ffd23f' },
    L: VL.day, sky: ['#1e96fc', '#cdeeff', '#dde8ef'], posters: 'wall',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#b9c2c8', 0), -0.01);
      VK.tiles(mb, -8.4, -7.8, 8.4, 12, 1.6, '#e8e4dc', '#d8d4cc', '#b8b2a8', -0.85);
      vShell(mb, { wall: '#dfe6ec', top: '#9aa3ad', base: '#7d868f', h: 5.2 });
      // cam cephe: pist, uçak, kule; çerçeveler
      mb.box(-8.4, 0.4, -7.79, 8.4, 4.8, -7.77, C('#bfe0f5', 0.92));
      mb.box(-8.4, 0.4, -7.765, 8.4, 1.25, -7.762, C('#6b7079', 0.9)); for (let k = 0; k < 14; k++) mb.box(-8 + k * 1.2, 0.8, -7.761, -7.5 + k * 1.2, 0.85, -7.758, C('#ffffff', 0.95));
      mb.push().T(4.6, 1.5, -7.755); mb.box(-2.4, -0.18, 0, 1.6, 0.18, 0.004, C('#f4f6fb', 0.95)); mb.box(-1.0, -0.06, 0.004, 1.0, 0.06, 0.008, C('#3a86ff', 0.95)); mb.triN([-0.5, 0.12, 0.006], [0.7, 0.12, 0.006], [-0.1, 0.95, 0.006], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#e63946', 0.95)); mb.triN([-0.4, -0.1, 0.007], [0.9, -0.1, 0.007], [0.2, -0.45, 0.007], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#d9dce1', 0.95)); mb.pop();
      mb.push().T(-6.0, 1.25, -7.755); mb.box(-0.12, 0, 0, 0.12, 2.2, 0.004, C('#d9dce1', 0.95)); mb.box(-0.45, 2.2, 0, 0.45, 2.7, 0.004, C('#6b7079', 0.95)); mb.box(-0.4, 2.3, 0.004, 0.4, 2.55, 0.008, C('#9fd3ff', 0.95)); mb.pop();
      for (let k = 0; k <= 8; k++) mb.box(-8.4 + k * 2.1 - 0.07, 0.3, -7.79, -8.4 + k * 2.1 + 0.07, 4.9, -7.6, C('#7d868f', -0.8));
      mb.box(-8.4, 4.8, -7.8, 8.4, 5.0, -7.5, C('#7d868f', -0.8)); mb.box(-8.4, 0.2, -7.8, 8.4, 0.42, -7.4, C('#7d868f', -0.8));
      VK.sign(mb, 'screen');
      // kalkış panosu, koltuk sıraları, valizler ve bagaj arabası, sütun ve küre
      mb.push().T(-5.6, 3.3, -7.3); mb.box(-1.6, -0.75, -0.1, 1.6, 0.75, 0.05, C('#15171c', -0.6)); for (let r = 0; r < 6; r++) { mb.box(-1.5, 0.55 - r * 0.24, 0.051, -0.3, 0.68 - r * 0.24, 0.055, C('#ffd23f', 0.95)); mb.box(-0.2, 0.55 - r * 0.24, 0.051, 0.6, 0.68 - r * 0.24, 0.055, C('#ffffff', 0.95)); mb.box(0.75, 0.55 - r * 0.24, 0.051, 1.5, 0.68 - r * 0.24, 0.055, C(r === 1 ? '#e63946' : '#2fbf71', 0.95)); } mb.pop();
      for (const s of [-1, 1]) for (const z of [-2.8, 1.4]) { mb.push().T(s * 6.9, 0, z, s * Math.PI / 2); const M = C('#9aa3ad', -0.85); mb.box(-1.4, 0.36, -0.05, 1.4, 0.4, 0.05, M); for (const x of [-1.2, 1.2]) mb.box(x - 0.04, 0, -0.25, x + 0.04, 0.4, 0.25, M); for (let k = 0; k < 4; k++) { const x = -1.05 + k * 0.7; mb.rbox(x - 0.3, 0.4, -0.24, x + 0.3, 0.48, 0.22, 0.04, C('#2a5a7a', -0.5), 2); mb.push().T(x, 0.75, -0.26, 0, -0.1); mb.rbox(-0.28, -0.3, -0.03, 0.28, 0.3, 0.03, 0.05, C('#2a5a7a', -0.5), 2); mb.pop(); } mb.pop(); }
      for (const [x, z, c, r] of [[-2.7, 4.7, '#e63946', 0.3], [-2.1, 5.1, '#3a86ff', -0.2], [-5.2, 4.6, '#2a9d8f', 0.1], [5.4, 4.4, '#ffb703', 0.5]]) { mb.push().T(x, 0, z, r); mb.rbox(-0.25, 0.06, -0.15, 0.25, 0.75, 0.15, 0.06, C(c, -0.5), 2); mb.box(-0.12, 0.75, -0.02, 0.12, 0.85, 0.02, C('#2b2b2b', -0.5)); for (const s of [-1, 1]) mb.sphereS(s * 0.18, 0.04, 0, 0.04, 0.04, 0.04, C('#2b2b2b', -0.5), 6, 4); mb.pop(); }
      for (const s of [-1, 1]) { mb.cyl(s * 4.6, 0, -6.6, 0.32, 5.2, 0.32, 16, C('#f4f6fb', -0.6), C('#f4f6fb', -0.6)); VK.plant(mb, s * 7.7, -7.1, 1.3, '#dfe6ec', '#3f8f52'); }
      mb.push().T(7.6, 0, 4.8, 0, 0, 0, 0.8); DECOR.globe(mb, ['#ffffff'], 0); mb.pop();
      mb.push().T(2.7, 0, 5.0, -0.35); const BM = C('#9aa3ad', -0.85); mb.box(-0.45, 0.2, -0.32, 0.45, 0.24, 0.32, BM); for (const s2 of [-1, 1]) { mb.push().T(s2 * 0.38, 0.12, 0.25, 0, 0, Math.PI / 2); mb.cyl(0, -0.03, 0, 0.11, 0.03, 0.11, 10, C('#2b2b2b', -0.5), C('#2b2b2b', -0.5)); mb.pop(); mb.push().T(s2 * 0.38, 0.12, -0.25, 0, 0, Math.PI / 2); mb.cyl(0, -0.03, 0, 0.11, 0.03, 0.11, 10, C('#2b2b2b', -0.5), C('#2b2b2b', -0.5)); mb.pop(); limb(mb, [s2 * 0.4, 0.24, -0.32], [s2 * 0.4, 1.1, -0.42], [0.02, 0.02], BM, 4); } mb.box(-0.42, 1.08, -0.45, 0.42, 1.12, -0.39, BM); mb.rbox(-0.36, 0.24, -0.26, 0.36, 0.64, 0.22, 0.05, C('#6d597a', -0.5), 2); mb.rbox(-0.3, 0.64, -0.22, 0.24, 0.86, 0.16, 0.04, C('#ffd23f', -0.5), 2); mb.pop();
      VK.quad(mb, -0.12, 3.6, 0.12, 9.5, C('#ffd23f', 0.2), 0.008); for (const z of [5.4, 7.6]) mb.triN([-0.32, 0.009, z], [0.32, 0.009, z], [0, 0.009, z - 0.45], UPV, UPV, UPV, C('#ffd23f', 0.2));
    },
  },
  /* ---- Parmak Yarışı: yarış pisti, başlangıç ışıkları ---- */
  pry: {
    table: 'tire', tableO: { glow: '#e63946' }, chair: 'pod', rug: null,
    L: VL.day, sky: ['#ff6b35', '#ffd6a5', '#efe2d2'], posters: 'poles',
    build(mb) {
      VK.ground(mb, '#4a4d52', '#3e4146', 0.35);
      for (const x of [-4.6, 4.6]) VK.quad(mb, x - 0.08, -40, x + 0.08, 18, C('#f4f4f4', 0), 0.004);
      for (let k = 0; k < 24; k++) for (let j = 0; j < 2; j++) VK.quad(mb, -4.6 + k * 0.383, 5.6 + j * 0.38, -4.217 + k * 0.383, 5.98 + j * 0.38, C((k + j) % 2 ? '#111111' : '#f4f4f4', 0), 0.005);
      for (const s of [-1, 1]) for (let k = 0; k < 28; k++) { const z = -8 + k * 0.7; VK.quad(mb, s * 8.0, z, s * 8.9, z + 0.7, C(k % 2 ? '#e63946' : '#f4f4f4', 0), 0.004); }
      // başlangıç köprüsü ve beşli ışık, tribün, lastik yığınları, damalı bayraklar, pit garajları
      const G = C('#2b2d33', -0.6);
      for (const s of [-1, 1]) mb.box(s * 3.4 - 0.18, 0, -7.95, s * 3.4 + 0.18, 4.4, -7.6, G);
      mb.box(-3.6, 3.7, -7.95, 3.6, 4.3, -7.6, G);
      for (let k = 0; k < 5; k++) { const x = -2.0 + k; mb.box(x - 0.36, 3.1, -7.6, x + 0.36, 3.75, -7.45, C('#14161b', -0.6)); mb.sphereS(x, 3.52, -7.45, 0.14, 0.14, 0.05, C(k < 3 ? '#ff2a2a' : '#2a2a2a', k < 3 ? 1 : -0.6), 10, 6); mb.sphereS(x, 3.25, -7.45, 0.12, 0.12, 0.05, C('#2a2a2a', -0.6), 10, 6); }
      VK.sign(mb, 'stand', '#2b2d33', '#fff8ec');
      for (let r = 0; r < 3; r++) { const z = -10.5 - r * 0.9, y = 0.5 + r * 0.55; mb.box(-9.5, 0, z - 0.45, 9.5, y, z + 0.45, C('#8a9099', -0.4)); for (let k = 0; k < 28; k++) { if (hs(k, r) > 0.7) continue; const x = -9.2 + k * 0.68; mb.sphereS(x, y + 0.25, z, 0.18, 0.22, 0.16, C(['#e63946', '#3a86ff', '#ffbe0b', '#2fbf71', '#ffffff'][(k + r) % 5], -0.2), 6, 4); mb.sphereS(x, y + 0.56, z, 0.12, 0.13, 0.12, C(['#f2c39a', '#c68a5e', '#e6b08a'][(k + r) % 3], 0), 6, 4); } }
      const tires = (x, z, n, c) => { for (let k = 0; k < n; k++) { mb.torusN(x, 0.13 + k * 0.24, z, 0.38, 0.13, 0.12, 18, 6, C('#1d1e22', -0.3)); if (k === n - 1) mb.cyl(x, 0.13 + k * 0.24, z, 0.25, 0.14 + k * 0.24, 0.25, 14, C(c, 0), C(c, 0)); } };
      for (const [x, z, n, c] of [[-7.0, -6.6, 4, '#e63946'], [-6.2, -6.9, 3, '#ffffff'], [7.0, -6.4, 4, '#3a86ff'], [6.2, -6.8, 2, '#ffffff'], [-7.4, 3.0, 3, '#ffbe0b'], [7.5, 2.4, 3, '#e63946']]) tires(x, z, n, c);
      for (const [x, z] of [[-5.0, -7.6], [5.0, -7.6]]) { mb.cyl(x, 0, z, 0.04, 3.0, 0.04, 6, C('#c9ced6', -0.8), C('#c9ced6', -0.8)); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) mb.box(x + 0.04 + i * 0.22, 2.3 + j * 0.22, z - 0.01, x + 0.26 + i * 0.22, 2.52 + j * 0.22, z + 0.01, C((i + j) % 2 ? '#111111' : '#ffffff', 0)); }
      for (const s of [-1, 1]) { mb.box(s * 9.2, 0, -6, s * 12.5, 3.4, 4, C('#e9edf4', 0)); for (const z of [-4.5, -1.5, 1.5]) { mb.box(s * 9.19, 0, z - 1.2, s * 9.17, 2.6, z + 1.2, C('#5a6370', -0.5)); for (let y = 0.2; y < 2.6; y += 0.22) mb.box(s * 9.17, y, z - 1.2, s * 9.15, y + 0.04, z + 1.2, C('#4a525e', -0.5)); } mb.box(s * 9.18, 2.8, -6, s * 9.14, 3.2, 4, C('#e63946', 0)); }
    },
  },
  /* ---- Kelime Avı: kütüphane ---- */
  kav: {
    table: 'wood', tableO: { wood: '#6a4026' }, chair: 'gothic', rug: 'round', rugO: { rug: '#7a1f2b', rugB: '#d9b35a' },
    L: VL.warm, sky: ['#2a1d16', '#3b2a1c', '#1e1610'], posters: 'wall', parts: 'dust',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#24180f', 0), -0.01);
      VK.chevron(mb, -8.4, -7.8, 8.4, 12, 0.62, 0.21, ['#7a4e2c', '#6b4428', '#86593a', '#5f3d24'], -0.15);
      vShell(mb, { wall: '#3b2a1c', top: '#2a1a10', base: '#1e1209' });
      // tavana kadar kitaplıklar (arka ve yanlar), yuvarlak kemerli pencere, tekerlekli merdiven
      for (const x of [-6.6, -3.9, 3.9, 6.6]) { mb.push().T(x, 0, -7.45); VK.shelf(mb, 2.6, 4.6, 0.6, '#5b3a24'); mb.pop(); }
      mb.box(-2.4, 2.95, -7.79, 2.4, 4.9, -7.77, C('#9fc3e6', 0.9)); for (const x of [-0.8, 0.8]) mb.box(x - 0.04, 2.95, -7.77, x + 0.04, 4.9, -7.75, C('#3b2416', 0)); mb.box(-2.4, 3.9, -7.77, 2.4, 3.96, -7.75, C('#3b2416', 0));
      VK.sign(mb, 'wall', '#c9a34a', '#fff8ec');
      for (const s of [-1, 1]) for (const z of [-6.0, 0.6, 3.4]) { mb.push().T(s * 8.05, 0, z, s > 0 ? -Math.PI / 2 : Math.PI / 2); VK.shelf(mb, 2.6, 4.4, 0.6, '#5b3a24'); mb.pop(); }
      mb.push().T(-5.3, 0, -6.9, 0, -0.22); for (const x of [-0.25, 0.25]) mb.box(x - 0.03, 0, -0.03, x + 0.03, 4.2, 0.03, C('#8a5a34', 0)); for (let k = 0; k < 11; k++) mb.box(-0.25, 0.3 + k * 0.36, -0.025, 0.25, 0.34 + k * 0.36, 0.025, C('#8a5a34', 0)); mb.pop();
      // okuma köşesi: koltuk, yeşil masa lambası, küre, yerde kitap yığınları
      for (const s of [-1, 1]) { mb.push().T(s * 6.4, 0, -2.6, s * -0.5); mb.rbox(-0.5, 0.05, -0.45, 0.5, 0.5, 0.45, 0.12, C('#7a1f2b', -0.3), 2); mb.rbox(-0.5, 0.4, -0.5, 0.5, 1.1, -0.25, 0.12, C('#7a1f2b', -0.3), 2); for (const x of [-0.45, 0.45]) mb.rbox(x - 0.1, 0.4, -0.45, x + 0.1, 0.75, 0.45, 0.08, C('#6a1a24', -0.3), 2); mb.pop(); }
      mb.push().T(6.0, 0, 1.8); mb.cyl(0, TABLE_Y - 0.04, 0, 0.45, TABLE_Y, 0.45, 18, C('#3b2416', -0.5), C('#3b2416', -0.5)); mb.cyl(0, 0, 0, 0.06, TABLE_Y, 0.06, 8, C('#3b2416', 0), C('#3b2416', 0)); mb.box(-0.05, TABLE_Y, -0.05, 0.05, TABLE_Y + 0.36, 0.05, C('#c9a34a', -0.9)); mb.push().T(0, TABLE_Y + 0.4, 0.05, 0, 0.0, 0); mb.cyl(0, -0.05, 0, 0.22, 0.05, 0.15, 12, C('#1f6b47', -0.85), C('#1f6b47', -0.85), ''); mb.cyl(0, -0.06, 0, 0.18, -0.05, 0.18, 10, C('#fff1c9', 1), C('#fff1c9', 1)); mb.pop(); mb.pop();
      mb.push().T(-6.2, 0, 2.2, 0, 0, 0, 0.9); DECOR.globe(mb, ['#ffffff'], 0); mb.pop();
      for (const [x, z, k] of [[-2.3, 4.9, 0], [2.4, 5.2, 1], [-7.2, -4.4, 2], [-4.8, 4.8, 3]]) { mb.push().T(x, 0, z, 0, 0, 0, 0.55); DECOR.books(mb, ['#a3262a', '#1d3557', '#e9c46a', '#2a9d8f', '#6d597a'], k); mb.pop(); }
      // ön bölge: tekerlekli kitap arabası, yerde açık kitap ve gözlük
      mb.push().T(0.9, 0, 6.1, -0.25); const KW = C('#5b3a24', 0); mb.box(-0.6, 0.12, -0.25, 0.6, 0.16, 0.25, KW); mb.box(-0.6, 0.5, -0.25, 0.6, 0.54, 0.25, KW); for (const x of [-0.58, 0.58]) mb.box(x - 0.025, 0.12, -0.25, x + 0.025, 0.85, 0.25, KW); for (const [a2, b2] of [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]]) mb.sphereS(a2, 0.06, b2, 0.06, 0.06, 0.06, C('#2b2b2b', -0.5), 6, 4); for (const y of [0.16, 0.54]) { let x = -0.52, k = 0; while (x < 0.45) { const bw = 0.07 + hs(k, y * 9) * 0.06, bh = 0.22 + hs(k, y * 5) * 0.08; mb.box(x, y, -0.16, x + bw, y + bh, 0.16, C(['#a3262a', '#1d3557', '#e9c46a', '#2a9d8f', '#6d597a'][(k + Math.round(y * 10)) % 5], 0)); x += bw + 0.01; k++; } } mb.pop();
      mb.push().T(-1.2, 0.006, 5.5, 0.4); for (const s2 of [-1, 1]) { const n = vnorm([-s2 * 0.15, 1, 0]); mb.quadN([0, 0.03, -0.17], [0, 0.03, 0.17], [s2 * 0.25, 0.012, 0.17], [s2 * 0.25, 0.012, -0.17], n, n, n, n, C('#f4efe2', 0)); for (let k = 0; k < 4; k++) mb.box(s2 * 0.04, 0.024, -0.12 + k * 0.07, s2 * 0.2, 0.026, -0.11 + k * 0.07, C('#9a9284', 0)); } mb.box(-0.27, 0, -0.19, 0.27, 0.012, 0.19, C('#7a1f2b', 0)); mb.push().T(0.42, 0.02, 0.1, 0.3); for (const s2 of [-1, 1]) mb.torusN(s2 * 0.06, 0, 0, 0.045, 0.008, 0.008, 12, 3, C('#2b2b2b', -0.6)); mb.pop(); mb.pop();
    },
  },
  /* ---- Çiz Tahmin: resim atölyesi ---- */
  czt: {
    table: 'wood', tableO: { wood: '#cdb08a' }, chair: 'stool', chairO: { leg: '#9a7a5a', gloss: -0.1 }, rug: 'patch', rugO: { rug: '#d9cdb4' },
    L: VL.day, sky: ['#58c4ff', '#fff0d9', '#f2ece2'], posters: 'wall',
    build(mb) {
      VK.quad(mb, -20, -12, 20, 18, C('#9a958c', 0), -0.01);
      VK.noise(mb, -8.4, -7.8, 8.4, 12, 1.0, '#c9c4ba', '#b8b3a8', 0.4, -0.1, 0.002);
      const PC = ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#2fbf71', '#fb5607'];
      for (let k = 0; k < 46; k++) { const x = -8 + hs(k, 31) * 16, z = -7.5 + hs(k, 32) * 18; if (Math.hypot(x, z) < 3.6) continue; const r = 0.08 + hs(k, 33) * 0.32; mb.disc(x, 0.008, z, r, r * (0.6 + hs(k, 34) * 0.6), 9, C(PC[k % 6], -0.2), C(PC[k % 6], -0.2), MK_JIT); }
      vShell(mb, { wall: '#f4f1ea', top: '#d9d2c4', base: '#b8b0a2' });
      for (let r = 0; r < 24; r++) for (let k = 0; k < 29; k++) { const x = -8.4 + k * 0.58 + (r % 2) * 0.29, y = 0.05 + r * 0.21; if (y > 5) continue; VK.fq(mb, x, y, x + 0.54, y + 0.17, -7.795, C(hs(k, r) > 0.5 ? '#f8f6f0' : '#ebe7de', 0)); }
      mb.box(-4.6, 3.2, -7.789, 4.6, 5.0, -7.78, C('#d9f0ff', 1)); for (let k = 0; k <= 6; k++) mb.box(-4.6 + k * (9.2 / 6) - 0.04, 3.2, -7.78, -4.6 + k * (9.2 / 6) + 0.04, 5.0, -7.76, C('#3a3d44', -0.6));
      VK.sign(mb, 'wall', '#8a6a48', '#fff8ec');
      // duvarda tablolar (soyut lekeler), şövaleler, boya rafı, alçı büst
      const art = (cx, cy, w, h, z, k) => { mb.rbox(cx - w / 2 - 0.06, cy - h / 2 - 0.06, z - 0.05, cx + w / 2 + 0.06, cy + h / 2 + 0.06, z + 0.02, 0.02, C('#3b2a1c', 0), 1); mb.box(cx - w / 2, cy - h / 2, z + 0.02, cx + w / 2, cy + h / 2, z + 0.025, C('#fbf8f0', 0)); for (let i = 0; i < 5; i++) { const x = cx + (hs(i, k) - 0.5) * w * 0.7, y = cy + (hs(i, k + 9) - 0.5) * h * 0.7, r = Math.min(w, h) * (0.12 + hs(i, k + 3) * 0.2); mb.sphereS(x, y, z + 0.03, r, r * (0.7 + hs(i, k) * 0.6), 0.004, C(PC[(i + k) % 6], -0.3), 10, 4); } };
      art(-6.4, 2.1, 1.6, 1.2, -7.78, 1); art(-3.4, 1.8, 1.0, 1.4, -7.78, 2); art(3.4, 2.0, 1.2, 0.9, -7.78, 3); art(6.4, 2.1, 1.6, 1.2, -7.78, 4);
      const easel = (x, z, ry, k) => { mb.push().T(x, 0, z, ry); const W = C('#8a6a48', 0); limb(mb, [-0.42, 0, 0.25], [0, 2.0, 0], [0.03, 0.025], W, 5); limb(mb, [0.42, 0, 0.25], [0, 2.0, 0], [0.03, 0.025], W, 5); limb(mb, [0, 0, -0.5], [0, 1.9, -0.05], [0.03, 0.025], W, 5); mb.box(-0.5, 0.82, 0.18, 0.5, 0.86, 0.3, W); mb.push().T(0, 1.4, 0.2, 0, -0.08); mb.box(-0.5, -0.55, -0.02, 0.5, 0.55, 0.02, C('#fbf8f0', 0)); for (let i = 0; i < 4; i++) mb.sphereS((hs(i, k) - 0.5) * 0.6, (hs(i, k + 5) - 0.5) * 0.7, 0.025, 0.14 + hs(i, k) * 0.1, 0.1 + hs(i, k + 2) * 0.12, 0.004, C(PC[(i + k) % 6], -0.3), 8, 4); mb.pop(); mb.pop(); };
      easel(-6.6, -5.4, 0.5, 1); easel(6.7, -5.0, -0.5, 2); easel(-7.4, 2.4, 1.2, 3);
      mb.box(4.4, 0, -7.75, 7.8, 0.06, -7.2, C('#8a6a48', 0)); for (let r = 0; r < 3; r++) { mb.box(4.4, 0.6 + r * 0.6, -7.75, 7.8, 0.64 + r * 0.6, -7.25, C('#8a6a48', 0)); if (r > 0) for (let k = 0; k < 8; k++) mb.cyl(4.65 + k * 0.42, 0.64 + (r - 1) * 0.6, -7.5, 0.14, 0.64 + (r - 1) * 0.6 + 0.24, 0.14, 10, C('#d9dce1', -0.8), C(PC[(k + r) % 6], -0.6)); }
      mb.push().T(7.4, 0, 2.6); mb.box(-0.3, 0, -0.3, 0.3, 1.1, 0.3, C('#e9e4d8', 0)); mb.sphereS(0, 1.32, 0, 0.18, 0.24, 0.2, C('#f4f1ea', 0), 12, 8); mb.lathe(0, 1.1, 0, [[0.26, 0], [0.22, 0.12], [0.1, 0.18]], 12, C('#f4f1ea', 0)); mb.pop();
      for (const [x, z, k] of [[-2.7, 4.8, 0], [2.7, 5.0, 3], [-5.6, 4.6, 1]]) { mb.push().T(x, 0, z, hs(x, z) * 3, 0, 0, 0.6); DECOR.paint(mb, PC, k); mb.pop(); }
      // ön bölge: boya lekeli örtü, yerde palet, fırça kavanozu
      VK.quad(mb, -1.6, 5.6, 1.6, 7.6, C('#e9e0cc', 0), 0.0075); for (let k = 0; k < 14; k++) { const x = -1.4 + hs(k, 61) * 2.8, z = 5.75 + hs(k, 62) * 1.7, r = 0.05 + hs(k, 63) * 0.14; mb.disc(x, 0.0095, z, r, r * (0.6 + hs(k, 64) * 0.7), 8, C(PC[k % 6], -0.2), C(PC[k % 6], -0.2), MK_JIT); }
      mb.push().T(-0.9, 0.012, 6.3, 0.5); mb.disc(0, 0, 0, 0.32, 0.24, 14, C('#c9a46a', 0), C('#c9a46a', 0)); for (let k = 0; k < 6; k++) { const a = 0.6 + k * 0.62; mb.sphereS(Math.cos(a) * 0.2, 0.01, Math.sin(a) * 0.14, 0.045, 0.015, 0.045, C(PC[k], -0.3), 6, 3); } mb.disc(0.17, 0.002, -0.05, 0.05, 0.05, 8, C('#e9e0cc', 0), C('#e9e0cc', 0)); mb.pop();
      mb.push().T(1.0, 0, 6.6); mb.cyl(0, 0, 0, 0.09, 0.2, 0.1, 10, C('#bfe3f5', -0.9), C('#bfe3f5', -0.9), 'b'); for (let k = 0; k < 4; k++) { const a = k * 1.6; limb(mb, [Math.cos(a) * 0.03, 0.05, Math.sin(a) * 0.03], [Math.cos(a) * 0.12, 0.45, Math.sin(a) * 0.12], [0.012, 0.01], C('#8a6a48', 0), 3); mb.sphereS(Math.cos(a) * 0.125, 0.47, Math.sin(a) * 0.125, 0.02, 0.04, 0.02, C(PC[k + 1], -0.2), 5, 3); } mb.pop();
    },
  },
});
// ---------- dönen parçalar ----------
const VANIM = {
  disco(mb) { const R = 0.42; for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) { const a0 = ((i + 0.5) / 8 - 0.5) * Math.PI, b0 = (j / 16) * TAU, x = Math.cos(a0) * Math.cos(b0) * R, y = Math.sin(a0) * R, z = Math.cos(a0) * Math.sin(b0) * R, s = 0.07 * Math.cos(a0) + 0.02; mb.push().T(x, y, z, -b0 + Math.PI / 2, -a0); mb.box(-s, -0.04, 0, s, 0.04, 0.012, C((i + j) % 5 ? '#d9e2f0' : '#ffffff', (i * 3 + j) % 7 ? -0.95 : 0.9)); mb.pop(); } mb.sphereS(0, 0, 0, R * 0.97, R * 0.97, R * 0.97, C('#8a93a3', -0.9), 12, 8); mb.cyl(0, R, 0, 0.015, R + 2.0, 0.015, 4, C('#2b2b2b', 0), C('#2b2b2b', 0)); },
  ferris(mb) { const R = 2.9, W = C('#ffffff', -0.5); mb.torusN(0, 0, 0, R, 0.07, 0.07, 48, 5, W); mb.torusN(0, 0, 0, R * 0.55, 0.05, 0.05, 32, 4, W); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, x = Math.cos(a) * R, y = Math.sin(a) * R; limb(mb, [0, 0, 0], [x, y, 0], [0.03, 0.03], W, 4, null, 1); mb.sphereS(x, y, 0, 0.09, 0.09, 0.09, C(k % 2 ? '#fff1b8' : '#ff8fc7', 1), 6, 4); mb.sphereS(x, y, 0, 0.36, 0.36, 0.3, C(['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4', '#ff8a3d'][k % 6], -0.4), 12, 8); mb.torusN(x, y, 0, 0.36, 0.04, 0.04, 14, 4, C('#ffffff', -0.5)); } mb.sphereS(0, 0, 0, 0.3, 0.3, 0.3, C('#fee440', -0.4), 10, 7); },
  fan(mb) { const W = C('#5a3a28', -0.3); mb.cyl(0, 0, 0, 0.16, 0.2, 0.12, 12, C('#c9a34a', -0.85), C('#c9a34a', -0.85)); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; mb.push().T(0, 0.02, 0, a); mb.rbox(0.12, -0.012, -0.12, 1.25, 0.012, 0.12, 0.03, W, 1); mb.pop(); } },
  gearBig(mb) { vGear(mb, 0.9, 14, C('#b87333', -0.85)); },
  gearSmall(mb) { vGear(mb, 0.5, 9, C('#c9ced6', -0.85)); },
};
// duvara yaslı dişli (x-y düzleminde, z+ öne): disk, dişler, göbek, kollar
function vGear(mb, r, n, col) {
  mb.push().T(0, 0, 0, 0, Math.PI / 2);
  mb.cyl(0, -0.05, 0, r, 0.05, r, 28, col, col);
  for (let k = 0; k < n; k++) { const a = (k / n) * TAU; mb.push().T(Math.cos(a) * (r + 0.07), 0, Math.sin(a) * (r + 0.07), -a); mb.box(-0.09, -0.05, -0.08, 0.09, 0.05, 0.08, col); mb.pop(); }
  mb.cyl(0, 0.05, 0, r * 0.28, 0.1, r * 0.28, 14, shade(col, 0.7), shade(col, 0.7));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; mb.push().T(Math.cos(a) * r * 0.55, 0.052, Math.sin(a) * r * 0.55, -a); mb.box(-0.12, 0, -0.12, 0.12, 0.012, 0.12, shade(col, 0.6)); mb.pop(); }
  mb.pop();
}

/* ====================== v2 mekân kiti: 360° oda, açıklıklı duvar, pencere, ayrıntılı eşyalar ======================
   Kamera masanın çevresinde döndüğü için oda her yönden görünür. Dört kenar (0 arka z-, 1 sağ x+, 2 ön z+, 3 sol x-)
   ayrı ağlarda kurulur; kameranın bulunduğu taraftaki kenar (duvar ve duvara asılı her şey) alçalarak görüşü açar. */
const RW = 7.8; // odanın iç yarı genişliği (duvarların iç yüzü)
let VSEC = null; // kurulum sırasında 4 kenar ağı
const W_RY = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
// duvar yerel çerçevesi: u duvar boyunca (odadan duvara bakınca sağa doğru), v duvardan odaya doğru
const wXZ = (k, u, v) => (k === 0 ? [u, -RW + v] : k === 1 ? [RW - v, u] : k === 2 ? [-u, RW - v] : [-RW + v, -u]);
function wAt(mb, k, u, v = 0, y = 0, ry = 0, s = 1) { const p = wXZ(k, u, v); return mb.push().T(p[0], y, p[1], W_RY[k] + ry, 0, 0, s); }
const SEC = (k, mb) => (VSEC ? VSEC[k] : mb);
// ışık izleri: [x, y, z, r, rgb, alfa, yön ('h' yatay, 'z'/'x' dikey, 'b' kameraya dönük), titreme, ry, r2, kenar]
let VSK = -1; // uzun eşya kurulurken bağlı olduğu kenar
VK.glow = (x, y, z, r, hex, a = 0.35, o = 'h', fl = 0, ry = 0, r2 = r, sec = -1) => { if (VFX) VFX.glows.push([x, y, z, r, hexRGB(hex), a, o, fl, ry, r2, sec < 0 ? VSK : sec]); };
VK.halo = (p, r, hex, a = 0.4, fl = 0, sec = -1) => { if (VFX) VFX.glows.push([p[0], p[1], p[2], r, hexRGB(hex), a, 'b', fl, 0, r, sec < 0 ? VSK : sec]); };
VK.pool = (p, r, hex, a = 0.2, r2 = r) => { if (VFX) VFX.glows.push([p[0], 0.014, p[2], r, hexRGB(hex), a, 'h', 0, 0, r2, VSK]); };
// uzun eşya: (x, z) noktasının kenarına kurulur; kamera o taraftayken yere iner. fn(mb) yerel kurar (konum ayarlanmış)
// 8 yön: 0 arka, 1 sağ, 2 ön, 3 sol, 4 arka-sağ, 5 ön-sağ, 6 ön-sol, 7 arka-sol
const SECN = [[0, -1], [1, 0], [0, 1], [-1, 0], [0.7071, -0.7071], [0.7071, 0.7071], [-0.7071, 0.7071], [-0.7071, -0.7071]];
const vSecOf = (x, z) => { let b = 0, bd = -1e9; for (let k = 0; k < 8; k++) { const d = SECN[k][0] * x + SECN[k][1] * z; if (d > bd + 1e-6) { bd = d; b = k; } } return b; };
VK.inSec = (k, fn) => { const mb = SEC(k); if (!mb) return; VSK = k; try { fn(mb); } finally { VSK = -1; } };
VK.tall = (x, z, fn, ry = 0, s = 1) => { const k = vSecOf(x, z), mb = SEC(k); if (!mb) return; VSK = k; try { mb.push().T(x, 0, z, ry, 0, 0, s); fn(mb); mb.pop(); } finally { VSK = -1; } };
VK.wglow = (k, u, v, y, r, hex, a = 0.3, r2 = r, fl = 0) => { if (VFX) { const p = wXZ(k, u, v); VFX.glows.push([p[0], y, p[1], r, hexRGB(hex), a, k % 2 ? 'x' : 'z', fl, 0, r2, k]); } };
// o anki dönüşümle yerel (x, z) noktasına temas gölgesi
VK.sh = (mb, x, z, rx, rz = rx, a = 0.42) => { const p = mb.p(x, 0, z), q = mb.p(x + 1, 0, z); VK.blob(p[0], p[2], rx, rz, a, 0.009, -Math.atan2(q[2] - p[2], q[0] - p[0])); };
const vDark = (h, t) => vMixHex(h, '#000000', t), vLight = (h, t) => vMixHex(h, '#ffffff', t);

// dikdörtgenden delikleri çıkar: [u0, y0, u1, y1] parçaları
function rectsMinus(u0, u1, y0, y1, holes) {
  const us = [u0, u1];
  for (const h of holes) if (h.u1 > u0 && h.u0 < u1) us.push(clamp(h.u0, u0, u1), clamp(h.u1, u0, u1));
  us.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < us.length - 1; i++) {
    const a = us[i], b = us[i + 1];
    if (b - a < 1e-4) continue;
    const m = (a + b) / 2;
    let ys = [[y0, y1]];
    for (const h of holes) {
      if (!(h.u0 < m && h.u1 > m)) continue;
      const n = [];
      for (const [p, q] of ys) { if (h.y1 <= p || h.y0 >= q) { n.push([p, q]); continue; } if (h.y0 > p) n.push([p, h.y0]); if (h.y1 < q) n.push([h.y1, q]); }
      ys = n;
    }
    for (const [p, q] of ys) if (q - p > 1e-4) out.push([a, p, b, q]);
  }
  return out;
}
const hitHole = (a, p, b, q, holes) => holes.some((h) => h.u0 < b && h.u1 > a && h.y0 < q && h.y1 > p);

/* ---------- duvar: k kenarı, o: { wall, H, dado, dadoH, panel, rail, base, crown, pat, pc (desen rengi/renkleri), ps (desen ölçüsü), e } ---------- */
function vWall(k, o, holes = []) {
  const mb = SEC(k);
  wAt(mb, k, 0, 0);
  const H = o.H || 5.2, L = RW + 0.32, dh = o.dado ? o.dadoH ?? 1.05 : 0, T = 0.32, We = o.e ?? 0;
  for (const [a, p, b, q] of rectsMinus(-L, L, 0, H, holes)) {
    if (o.dado && p < dh) { mb.box(a, p, -T, b, Math.min(q, dh), 0, C(o.dado, o.dadoE ?? -0.1)); if (q > dh) mb.box(a, dh, -T, b, q, 0, C(o.wall, We)); }
    else mb.box(a, p, -T, b, q, 0, C(o.wall, We));
  }
  const y0 = o.dado ? dh + 0.06 : 0.17, y1 = H - (o.crown ? 0.22 : 0), pat = o.pat, ps = o.ps || 0.3;
  if (pat === 'stripe') {
    for (let u = -RW; u < RW - 1e-6; u += ps * 2) for (const r of rectsMinus(u, Math.min(u + ps, RW), y0, y1, holes)) VK.fq(mb, r[0], r[1], r[2], r[3], 0.004, C(o.pc, We));
  } else if (pat === 'pin') {
    for (let u = -RW + ps / 2; u < RW; u += ps) for (const r of rectsMinus(u - 0.012, u + 0.012, y0, y1, holes)) VK.fq(mb, r[0], r[1], r[2], r[3], 0.004, C(o.pc, We));
  } else if (pat === 'dots') {
    let j = 0;
    for (let y = y0 + ps / 2; y < y1 - ps / 3; y += ps * 0.8, j++) for (let u = -RW + ps / 2 + (j % 2) * ps / 2; u < RW - ps / 3; u += ps) {
      const d = ps * 0.14;
      if (hitHole(u - d, y - d, u + d, y + d, holes)) continue;
      const n = [0, 0, 1];
      mb.quadN([u, y - d, 0.004], [u + d, y, 0.004], [u, y + d, 0.004], [u - d, y, 0.004], n, n, n, n, C(o.pc, We));
    }
  } else if (pat === 'brick') {
    const bw = ps * 1.6, bh = ps * 0.55, gap = 0.018, cols = Array.isArray(o.pc) ? o.pc : [o.pc];
    let j = 0;
    for (let y = y0; y < y1 - 1e-6; y += bh, j++) for (let u = -RW - (j % 2) * bw / 2; u < RW; u += bw) {
      const a = Math.max(-RW, u + gap), b = Math.min(RW, u + bw - gap), p = y + gap, q = Math.min(y1, y + bh - gap);
      if (b - a < 0.05 || q - p < 0.02 || hitHole(a, p, b, q, holes)) continue;
      mb.box(a, p, 0, b, q, 0.012, C(cols[Math.floor(hs(j * 37 + Math.round(u * 7), 5) * cols.length)], We));
    }
  } else if (pat === 'boards') {
    const cols = Array.isArray(o.pc) ? o.pc : [o.pc];
    let i = 0;
    for (let u = -RW; u < RW - 1e-6; u += ps, i++) for (const r of rectsMinus(u + 0.012, Math.min(u + ps, RW) - 0.012, y0, y1, holes)) VK.fq(mb, r[0], r[1], r[2], r[3], 0.004, C(cols[Math.floor(hs(i, 9) * cols.length)], We));
  } else if (pat === 'tile') {
    const cols = Array.isArray(o.pc) ? o.pc : [o.pc];
    let j = 0;
    for (let y = y0; y < y1 - 1e-6; y += ps, j++) { let i = 0; for (let u = -RW; u < RW - 1e-6; u += ps, i++) {
      const a = u + 0.012, b = Math.min(u + ps, RW) - 0.012, p = y + 0.012, q = Math.min(y + ps, y1) - 0.012;
      if (hitHole(a, p, b, q, holes)) continue;
      VK.fq(mb, a, p, b, q, 0.004, C(cols[(i + j) % cols.length], o.tileE ?? -0.35));
    } }
  }
  if (o.panel && o.dado) {
    const pw = o.panelW || 0.86, g = 0.14;
    for (let u = -RW + g; u + pw <= RW - g + 1e-6; u += pw + g) {
      if (hitHole(u, 0, u + pw, dh, holes)) continue;
      mb.box(u, 0.26, 0, u + pw, dh - 0.13, 0.02, C(o.panel, -0.15));
      mb.box(u + 0.055, 0.315, 0.02, u + pw - 0.055, dh - 0.185, 0.03, C(o.dado, -0.15));
    }
  }
  const low = holes.filter((h) => h.y0 < Math.max(dh, 0.2) + 0.05);
  if (o.rail && o.dado) for (const r of rectsMinus(-RW, RW, dh - 0.035, dh + 0.06, low)) mb.box(r[0], r[1], 0, r[2], r[3], 0.05, C(o.rail, -0.2));
  if (o.base !== null) for (const r of rectsMinus(-RW, RW, 0, 0.17, low)) mb.box(r[0], r[1], 0, r[2], r[3], 0.04, C(o.base || vDark(o.dado || o.wall, 0.35), -0.2));
  if (o.crown) { mb.box(-RW, H - 0.22, 0, RW, H - 0.08, 0.05, C(o.crown, -0.1)); mb.box(-RW, H - 0.08, 0, RW, H, 0.11, C(o.crown, -0.1)); }
  mb.pop();
}
// odanın köşe pervazları (dört köşede dikey kolon)
function vCorners(hex, H = 5.2) { for (let k = 0; k < 4; k++) { const mb = SEC(k); wAt(mb, k, RW - 0.06, 0); mb.box(-0.08, 0, -0.02, 0.08, H, 0.1, C(hex, -0.15)); mb.pop(); } }

/* ---------- pencere dışı manzara (parlayan arka panel) ---------- */
function vView(mb, x0, y0, x1, y1, z, kind, seed = 1) {
  const n = [0, 0, 1], E = (h) => C(h, 1);
  const SK = { sky: ['#6fc3f7', '#dff3ff'], city: ['#79b4ec', '#dcecff'], night: ['#0a1430', '#2a3f78'], garden: ['#86cff5', '#effaff'], snow: ['#a9c6e2', '#f3f8fc'], sea: ['#66bdf0', '#e2f5ff'], dusk: ['#f0884f', '#ffd9a0'], space: ['#04050d', '#121836'], forest: ['#5f8f9f', '#c9e3e0'] }[kind] || ['#6fc3f7', '#dff3ff'];
  mb.quadN([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, n, n, n, E(SK[1]), E(SK[1]), E(SK[0]), E(SK[0]));
  const W = x1 - x0, Hh = y1 - y0, z2 = z + 0.03;
  if (kind === 'city' || kind === 'night' || kind === 'dusk') {
    for (let i = 0; i < 10; i++) {
      const a = x0 + (W * i) / 10, b = a + (W / 10) * (0.72 + hs(i, seed) * 0.28), h = y0 + Hh * (0.22 + hs(i, seed + 1) * 0.42);
      const bc = kind === 'night' ? '#142040' : kind === 'dusk' ? '#8a4a5a' : i % 2 ? '#a9c0d8' : '#93adc9';
      mb.box(a, y0, z2, b, h, z2 + 0.02, E(bc));
      if (kind !== 'city') for (let j = 0; j < 5; j++) { const wx = lerp(a + 0.05, b - 0.08, hs(i * 5 + j, seed + 2)), wy = lerp(y0 + 0.1, h - 0.1, hs(i * 5 + j, seed + 3)); mb.box(wx, wy, z2 + 0.021, wx + 0.05, wy + 0.07, z2 + 0.025, E(hs(j, i) > 0.4 ? '#ffd98a' : '#f6b25a')); }
    }
  }
  if (kind === 'garden' || kind === 'sky') {
    mb.sphereS(x0 + W * 0.3, y0 - Hh * 0.05, z2, W * 0.55, Hh * 0.3, 0.01, E('#8fd17a'), 18, 8);
    mb.sphereS(x0 + W * 0.85, y0 - Hh * 0.08, z2 + 0.01, W * 0.5, Hh * 0.36, 0.01, E('#74c06a'), 18, 8);
    for (let i = 0; i < 4; i++) { const x = x0 + W * (0.1 + 0.27 * i + hs(i, seed) * 0.08), y = y0 + Hh * (0.22 + hs(i, seed + 3) * 0.12), r = Hh * (0.1 + hs(i, seed + 4) * 0.06); mb.sphereS(x, y + r, z2 + 0.02, r * 0.9, r * 1.1, 0.01, E(i % 2 ? '#4f9f55' : '#5fb35f'), 12, 8); mb.box(x - 0.015, y0, z2 + 0.015, x + 0.015, y + r * 0.3, z2 + 0.018, E('#6b4a2e')); }
    for (let i = 0; i < 2; i++) mb.sphereS(x0 + W * (0.25 + i * 0.45), y0 + Hh * (0.78 - i * 0.08), z2 + 0.03, W * 0.09, Hh * 0.04, 0.01, E('#ffffff'), 12, 6);
  }
  if (kind === 'sea') {
    mb.quadN([x0, y0, z2], [x1, y0, z2], [x1, y0 + Hh * 0.42, z2], [x0, y0 + Hh * 0.42, z2], n, n, n, n, E('#1d86c4'), E('#1d86c4'), E('#4cb3e6'), E('#4cb3e6'));
    mb.triN([x0 + W * 0.55, y0 + Hh * 0.43, z2 + 0.01], [x0 + W * 0.68, y0 + Hh * 0.43, z2 + 0.01], [x0 + W * 0.6, y0 + Hh * 0.62, z2 + 0.01], n, n, n, E('#ffffff'));
  }
  if (kind === 'snow' || kind === 'forest') {
    mb.sphereS(x0 + W * 0.4, y0 - Hh * 0.1, z2, W * 0.7, Hh * 0.36, 0.01, E(kind === 'snow' ? '#ffffff' : '#9ab8a8'), 18, 8);
    for (let i = 0; i < 7; i++) { const x = x0 + W * (0.06 + 0.15 * i), y = y0 + Hh * (0.12 + hs(i, seed) * 0.12), h = Hh * (0.3 + hs(i, seed + 1) * 0.18); mb.triN([x - h * 0.28, y, z2 + 0.02], [x + h * 0.28, y, z2 + 0.02], [x, y + h, z2 + 0.02], n, n, n, E(kind === 'snow' ? '#3f6f5f' : '#355f52')); if (kind === 'snow') mb.triN([x - h * 0.1, y + h * 0.66, z2 + 0.03], [x + h * 0.1, y + h * 0.66, z2 + 0.03], [x, y + h, z2 + 0.03], n, n, n, E('#ffffff')); }
  }
  if (kind === 'space') for (let i = 0; i < 40; i++) { const x = lerp(x0, x1, hs(i, seed)), y = lerp(y0, y1, hs(i, seed + 1)), s = 0.01 + hs(i, seed + 2) * 0.02; mb.box(x - s, y - s, z2, x + s, y + s, z2 + 0.01, E('#ffffff')); }
}

/* ---------- pencere: h { u0, u1, y0, y1 } (duvardaki delik), o: { frame, view, curtain, rod, nx, ny, sun, sunHex, sunA, sill } ---------- */
function vWindow(k, h, o = {}) {
  const mb = SEC(k);
  wAt(mb, k, 0, 0);
  const { u0, u1, y0, y1 } = h, Fr = C(o.frame || '#f4efe6', -0.3), w = u1 - u0, hh = y1 - y0, t = 0.08;
  mb.box(u0 - t, y0 - t, 0, u1 + t, y0, 0.05, Fr); mb.box(u0 - t, y1, 0, u1 + t, y1 + t, 0.05, Fr);
  mb.box(u0 - t, y0, 0, u0, y1, 0.05, Fr); mb.box(u1, y0, 0, u1 + t, y1, 0.05, Fr);
  if (o.sill !== false) mb.box(u0 - 0.16, y0 - 0.1, 0, u1 + 0.16, y0 - 0.03, 0.2, Fr);
  const zg = -0.17, mt = 0.03, nx = o.nx ?? Math.max(1, Math.round(w / 0.7)), ny = o.ny ?? (hh > 1.4 ? 2 : 1);
  mb.box(u0, y0, zg - 0.025, u1, y0 + 0.05, zg + 0.025, Fr); mb.box(u0, y1 - 0.05, zg - 0.025, u1, y1, zg + 0.025, Fr);
  mb.box(u0, y0, zg - 0.025, u0 + 0.05, y1, zg + 0.025, Fr); mb.box(u1 - 0.05, y0, zg - 0.025, u1, y1, zg + 0.025, Fr);
  for (let i = 1; i < nx; i++) { const u = u0 + (w * i) / nx; mb.box(u - mt, y0, zg - 0.02, u + mt, y1, zg + 0.02, Fr); }
  for (let j = 1; j < ny; j++) { const y = y0 + (hh * j) / ny; mb.box(u0, y - mt, zg - 0.02, u1, y + mt, zg + 0.02, Fr); }
  vView(mb, u0 - 0.7, y0 - 0.6, u1 + 0.7, y1 + 0.6, -1.0, o.view || 'sky', o.seed ?? Math.round(k * 7 + u0 * 3));
  if (o.curtain) {
    const cc = o.curtain, cd = vDark(cc, 0.16);
    for (const s of [-1, 1]) {
      const ua = s < 0 ? u0 - 0.42 : u1 + 0.02, ub = s < 0 ? u0 - 0.02 : u1 + 0.42;
      for (let f = 0; f < 5; f++) { const a = ua + ((ub - ua) * f) / 5, b = a + (ub - ua) / 5 + 0.01; mb.box(a, y0 - 0.32, 0.07 + (f % 2) * 0.045, b, y1 + 0.24, 0.1 + (f % 2) * 0.045, C(f % 2 ? cc : cd, 0)); }
      mb.box(ua - 0.01, y0 + hh * 0.38, 0.05, ub + 0.01, y0 + hh * 0.38 + 0.06, 0.16, C(o.tie || vDark(cc, 0.3), 0));
    }
    const Rd = C(o.rod || '#3b2a1c', -0.6);
    mb.push().T((u0 + u1) / 2, y1 + 0.3, 0.12, 0, 0, Math.PI / 2); mb.cyl(0, -(w / 2 + 0.55), 0, 0.022, w / 2 + 0.55, 0.022, 8, Rd, Rd); mb.pop();
    for (const u of [u0 - 0.55, u1 + 0.55]) mb.sphereS(u, y1 + 0.3, 0.12, 0.045, 0.045, 0.045, Rd, 8, 5);
  }
  mb.pop();
  if (o.sun !== false) { const p = wXZ(k, (u0 + u1) / 2, 1.5); VK.glow(p[0], 0.013, p[1], w * 0.66, o.sunHex || '#fff0c4', o.sunA ?? 0.12, 'h', 0, W_RY[k], 1.4, -1); }
  VK.wglow(k, (u0 + u1) / 2, 0.06, (y0 + y1) / 2, w * 0.8, o.sunHex || '#fff0c4', (o.sunA ?? 0.12) * 0.7, hh * 0.75);
}
// kapı: delik { u - w/2 .. u + w/2, 0 .. h }; o: { w, h, frame, door, door2, knob, open, glass, sign }
function vDoor(k, u, o = {}) {
  const mb = SEC(k);
  wAt(mb, k, u, 0);
  const w = o.w || 1.1, h = o.h || 2.3, Fr = C(o.frame || '#f4efe6', -0.3);
  mb.box(-w / 2 - 0.11, 0, 0, -w / 2, h + 0.11, 0.06, Fr); mb.box(w / 2, 0, 0, w / 2 + 0.11, h + 0.11, 0.06, Fr); mb.box(-w / 2 - 0.15, h + 0.08, 0, w / 2 + 0.15, h + 0.2, 0.08, Fr);
  if (o.open) {
    mb.box(-w / 2, 0, -1.4, w / 2, h, -1.38, C(o.inside || '#2a2230', 0));
    mb.box(-w / 2, 0, -1.4, w / 2, 0.01, 0, C(vDark(o.inside || '#2a2230', 0.2), 0));
    VK.wglow(k, u, 0.05, h * 0.5, w * 0.5, '#ffd9a0', 0.1, h * 0.5);
  } else {
    const D = o.door || '#7a4a2a', D2 = o.door2 || vLight(D, 0.12);
    mb.box(-w / 2, 0, -0.2, w / 2, h, -0.13, C(D, -0.3));
    if (o.glass) { mb.box(-w / 2 + 0.12, h * 0.48, -0.13, w / 2 - 0.12, h - 0.14, -0.125, C(o.glass, 1)); mb.box(-w / 2 + 0.12, 0.2, -0.13, w / 2 - 0.12, h * 0.42, -0.11, C(D2, -0.3)); }
    else for (const [ya, yb] of [[0.22, h * 0.45], [h * 0.52, h - 0.18]]) for (const s of [-1, 1]) mb.box(s < 0 ? -w / 2 + 0.11 : 0.045, ya, -0.13, s < 0 ? -0.045 : w / 2 - 0.11, yb, -0.11, C(D2, -0.3));
    mb.sphereS(w / 2 - 0.13, 1.02, -0.09, 0.038, 0.038, 0.04, C(o.knob || '#e2b552', -0.85), 8, 5);
    mb.box(w / 2 - 0.16, 0.98, -0.12, w / 2 - 0.1, 1.06, -0.1, C(o.knob || '#e2b552', -0.85));
  }
  mb.pop();
}
// tabela (oyun adı yazısı arka duvarın ortasında, z = -7.69): çerçeve ve süsleri 0. kenara kurar
function vSign(kind, hex, hex2, o = {}) {
  const mb = SEC(0);
  const F = C(hex, -0.35), I = C(hex2 || '#fff8ec', 0);
  if (kind === 'frame') {
    mb.rbox(-1.84, 0.34, -7.8, 1.84, 2.94, -7.72, 0.04, F, 2);
    mb.box(-1.72, 0.46, -7.72, 1.72, 2.82, -7.7, I);
    mb.box(-1.92, 2.94, -7.8, 1.92, 3.04, -7.62, F); mb.box(-1.92, 0.24, -7.8, 1.92, 0.34, -7.62, F);
    if (o.lamps !== false) for (const x of [-1.2, 0, 1.2]) { mb.box(x - 0.02, 3.04, -7.74, x + 0.02, 3.22, -7.7, C('#2b2b2b', -0.6)); mb.push().T(x, 3.22, -7.62, 0, -0.5); mb.cyl(0, -0.05, 0, 0.1, 0.06, 0.06, 10, C(o.lampC || '#2b2b2b', -0.7), C(o.lampC || '#2b2b2b', -0.7), ''); mb.cyl(0, -0.055, 0, 0.085, -0.045, 0.085, 10, C('#fff2c9', 1), C('#fff2c9', 1)); mb.pop(); VK.wglow(0, x, 0.1, 2.35, 0.75, '#ffe4b0', 0.16, 0.85); }
  } else if (kind === 'chalk') {
    mb.rbox(-1.86, 0.36, -7.8, 1.86, 2.92, -7.73, 0.03, F, 2);
    mb.box(-1.74, 0.48, -7.73, 1.74, 2.8, -7.71, C('#2f4a3c', 0));
    mb.box(-1.9, 0.3, -7.8, 1.9, 0.38, -7.55, F);
  } else if (kind === 'neon') {
    mb.rbox(-1.8, 0.38, -7.8, 1.8, 2.9, -7.72, 0.06, C('#14101f', -0.6), 2);
    for (const [a, b, c, d] of [[-1.76, 2.84, 1.76, 2.9], [-1.76, 0.4, 1.76, 0.46], [-1.8, 0.4, -1.74, 2.9], [1.74, 0.4, 1.8, 2.9]]) mb.box(a, b, -7.72, c, d, -7.68, C(hex2 || '#ff4fd8', 1));
    VK.wglow(0, 0, 0.12, 1.65, 2.3, hex2 || '#ff4fd8', 0.22, 1.7);
  } else if (kind === 'screen') {
    mb.rbox(-1.86, 0.3, -7.82, 1.86, 2.98, -7.7, 0.05, C('#15171c', -0.6), 2);
    VK.wglow(0, 0, 0.12, 1.65, 2.4, hex2 || '#9fd8ff', 0.18, 1.6);
  }
}

/* ---------- zeminler ---------- */
// kenarlı tahta zemin: ortada şerit tahtalar, duvar dibinde koyu bordür
function vFloorWood(mb, hexes, o = {}) {
  VK.planks(mb, -RW, -RW, RW, RW, o.w || 0.26, hexes, o.ax || 'x', o.e ?? -0.12, 0, o.gap || vDark(hexes[0], 0.45));
  if (o.border) { const b = o.bw || 0.34; for (const [a, c, d, e] of [[-RW, -RW, RW, -RW + b], [-RW, RW - b, RW, RW], [-RW, -RW, -RW + b, RW], [RW - b, -RW, RW, RW]]) VK.quad(mb, a, c, d, e, C(o.border, -0.15), 0.003); }
}
// karo zemin (iki renk dama ya da düz), isteğe bağlı bordür
function vFloorTile(mb, s, hexA, hexB, grout, o = {}) {
  VK.quad(mb, -RW, -RW, RW, RW, C(grout, 0), 0);
  let i = 0;
  for (let x = -RW; x < RW - 1e-6; x += s, i++) { let j = 0; for (let z = -RW; z < RW - 1e-6; z += s, j++) { const c = (i + j) % 2 ? hexB : hexA; VK.quad(mb, x + 0.016, z + 0.016, Math.min(x + s, RW) - 0.016, Math.min(z + s, RW) - 0.016, C(o.jit ? vMixHex(c, '#000000', hs(i, j) * o.jit) : c, o.e ?? -0.3), 0.002); } }
  if (o.border) { const b = o.bw || 0.4; for (const [a, c, d, e] of [[-RW, -RW, RW, -RW + b], [-RW, RW - b, RW, RW], [-RW, -RW, -RW + b, RW], [RW - b, -RW, RW, RW]]) VK.quad(mb, a, c, d, e, C(o.border, -0.25), 0.004); }
}
// Diorama kaidesi: oda kalın bir bloğun üstünde durur. Yakın duvarlar inince bloğun pervazlı ön yüzü görünür;
// blok koyu, tonlu bir zemine (yumuşak ışık halkası + temas gölgesi) oturur. Oda içinde duvar diplerine yumuşak gölge.
// hex: blok yüzü; o.lip: üst pervaz; o.fade: en dış zemin rengi; o.glow: bloğa yakın zemin; o.band: yüzde ince çizgi.
// o.flat: eski düz geçişli önlük (dışarısı olan mekânlar için; zemin rengine yumuşakça kaybolur)
function vApron(mb, hex, o = {}) {
  const d = mb.d, R = RW + 0.02;
  const V = (p, n, c) => d.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3] || 0);
  const Q = (A, B, Cc, D, n, ca, cb, cc, cd) => { V(A, n, ca); V(B, n, cb); V(Cc, n, cc); V(A, n, ca); V(Cc, n, cc); V(D, n, cd); };
  const rot = (k, x, z) => (k === 0 ? [x, z] : k === 1 ? [-z, x] : k === 2 ? [-x, -z] : [z, -x]);
  const UP = [0, 1, 0];
  if (o.flat) {
    const W = o.w ?? 6.5, y = o.y ?? -0.003, S = R + W, ci = C(hex, 0), co = C(o.fade || vDark(hex, 0.7), 0);
    for (let k = 0; k < 4; k++) { const P = (x, z) => { const r = rot(k, x, z); return [r[0], y, r[1]]; }; Q(P(-R, -R), P(R, -R), P(S, -S), P(-S, -S), UP, ci, ci, co, co); }
    return;
  }
  const BH = o.bh ?? 0.62, E = RW + (o.m ?? 0.5), y0 = -0.003, yb = -BH, lipH = o.lipH ?? 0.075;
  const bg = o.fade || '#08070a', glowH = o.glow || vMixHex(bg, o.lip || hex, 0.42);
  const faceT = C(hex, o.e ?? 0), faceB = C(vDark(hex, 0.45), o.e ?? 0), lip = C(o.lip || vLight(hex, 0.2), o.lipE ?? -0.2), top = C(o.top || o.lip || vLight(hex, 0.2), o.lipE ?? -0.2);
  // 1) duvarların dışında kalan üst şerit
  for (let k = 0; k < 4; k++) { const P = (x, z) => { const r = rot(k, x, z); return [r[0], y0, r[1]]; }; Q(P(-R, -R), P(R, -R), P(E, -E), P(-E, -E), UP, top, top, top, top); }
  // 2) dört yan yüz: üstte pervaz, altta koyulaşan gövde (+ isteğe bağlı ince çizgi)
  for (let k = 0; k < 4; k++) {
    // normaller hafifçe yukarı eğik: pervaz pahlı kenar gibi ışığı yakalar, yüz de karanlığa gömülmez
    const P = (x, y, z) => { const r = rot(k, x, z); return [r[0], y, r[1]]; }, rn = rot(k, 0, -1), nn = [rn[0], 0, rn[1]], nl = [rn[0] * 0.6, 0.8, rn[1] * 0.6], nf = [rn[0] * 0.92, 0.38, rn[1] * 0.92];
    Q(P(-E, y0, -E), P(E, y0, -E), P(E, y0 - lipH, -E), P(-E, y0 - lipH, -E), nl, lip, lip, lip, lip);
    Q(P(-E, y0 - lipH, -E), P(E, y0 - lipH, -E), P(E, yb, -E), P(-E, yb, -E), nf, faceT, faceT, faceB, faceB);
    if (o.band) { const bc = C(o.band, o.bandE ?? -0.2), e2 = E + 0.006; for (const yy of o.bandY || [y0 - lipH - (BH - lipH) * 0.34]) Q(P(-e2, yy, -e2), P(e2, yy, -e2), P(e2, yy - (o.bandH ?? 0.03), -e2), P(-e2, yy - (o.bandH ?? 0.03), -e2), nn, bc, bc, bc, bc); }
  }
  // 3) zemin: bloğun çevresinde tonlu ışık halkası, dışa doğru koyulaşır
  const RG = E + (o.w ?? 7.5), N = 12, prof = [], cols = [], cg = hexRGB(glowH), cb = hexRGB(bg);
  for (let i = 0; i <= N; i++) { const t = 1 - i / N, r = E * 0.97 + (RG - E * 0.97) * Math.pow(t, 1.7); prof.push([r, 0]); const f = Math.pow(Math.min(1, Math.max(0, (r - E) / (RG - E))), 0.75); cols.push(rgbA(mix3(cg, cb, f), 0)); }
  mb.lathe(0, yb - 0.001, 0, prof, 72, (i) => cols[i]);
  VK.quad(mb, -60, -60, 60, 60, C(bg, 0), yb - 0.004);
  // 4) bloğun dibinde temas gölgesi
  for (let k = 0; k < 4; k++) { const r = rot(k, 0, -E); VK.blob(r[0], r[1], k % 2 ? 0.95 : E * 1.1, k % 2 ? E * 1.1 : 0.95, o.sa ?? 1.1, yb + 0.004); }
  // 5) oda içinde duvar diplerinde yumuşak gölge (çadır toplamı: aralık = yarıçap → düz şerit)
  if (o.wallSh !== false) { const s = 3.4, a = o.wa ?? 0.62; for (let k = 0; k < 4; k++) for (let i = -2; i <= 2; i++) { const r = rot(k, i * s, -RW); VK.blob(r[0], r[1], k % 2 ? 0.78 : s, k % 2 ? s : 0.78, a, 0.0085); } }
}
// dış mekân zemini (geniş, gürültülü)
function vGround(mb, hexA, hexB, o = {}) { VK.ground(mb, hexA, hexB, o.sc ?? 0.3, o.st ?? 1.4); }

/* ---------- halılar (masa altı ve oda halıları) ---------- */
const RUG2 = {
  // dikdörtgen İran halısı: dış bordür, iç bordür motifleri, zemin, ortada madalyon
  persian(mb, w, d, o = {}) {
    const A = o.a || '#8c1f28', B = o.b || '#f0dcae', N = o.n || '#1f3a5a', y = o.y ?? 0.006;
    VK.quad(mb, -w, -d, w, d, C(N, 0), y);
    VK.quad(mb, -w + 0.12, -d + 0.12, w - 0.12, d - 0.12, C(B, 0), y + 0.0005);
    VK.quad(mb, -w + 0.2, -d + 0.2, w - 0.2, d - 0.2, C(A, 0), y + 0.001);
    const step = 0.3;
    for (let x = -w + 0.35; x < w - 0.3; x += step) for (const z of [-d + 0.16, d - 0.16]) { const n = UPV; mb.quadN([x, y + 0.0012, z - 0.03], [x + 0.06, y + 0.0012, z], [x, y + 0.0012, z + 0.03], [x - 0.06, y + 0.0012, z], n, n, n, n, C(N, 0)); }
    for (let z = -d + 0.35; z < d - 0.3; z += step) for (const x of [-w + 0.16, w - 0.16]) { const n = UPV; mb.quadN([x, y + 0.0012, z - 0.06], [x + 0.03, y + 0.0012, z], [x, y + 0.0012, z + 0.06], [x - 0.03, y + 0.0012, z], n, n, n, n, C(N, 0)); }
    const m = Math.min(w, d) * 0.55;
    mb.quadN([0, y + 0.0015, -m * 1.25], [m, y + 0.0015, 0], [0, y + 0.0015, m * 1.25], [-m, y + 0.0015, 0], UPV, UPV, UPV, UPV, C(N, 0));
    mb.quadN([0, y + 0.002, -m * 0.95], [m * 0.72, y + 0.002, 0], [0, y + 0.002, m * 0.95], [-m * 0.72, y + 0.002, 0], UPV, UPV, UPV, UPV, C(B, 0));
    mb.disc(0, y + 0.0025, 0, m * 0.36, m * 0.36, 18, C(A, 0), C(A, 0));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.quadN([sx * (w - 0.2), y + 0.0015, sz * (d - 0.2)], [sx * (w - 0.2 - m * 0.5), y + 0.0015, sz * (d - 0.2)], [sx * (w - 0.2), y + 0.0015, sz * (d - 0.2 - m * 0.5)], [sx * (w - 0.2), y + 0.0015, sz * (d - 0.2)], UPV, UPV, UPV, UPV, C(N, 0));
    if (o.fringe !== false) for (const s of [-1, 1]) for (let z = -d + 0.04; z < d; z += 0.08) VK.quad(mb, s * w, z, s * (w + 0.09), z + 0.035, C('#efe6d2', 0), y);
  },
  // kilim: enine şeritler ve baklavalar
  kilim(mb, w, d, o = {}) {
    const K = o.k || ['#b3352b', '#e9b949', '#2f5d62', '#f2e4c9', '#5a2e2a'], y = o.y ?? 0.006;
    VK.quad(mb, -w, -d, w, d, C(K[3], 0), y);
    const n = o.bands || 9;
    for (let i = 0; i < n; i++) {
      const z0 = -d + ((2 * d) * i) / n, z1 = z0 + (2 * d) / n, c = K[i % 2 ? 0 : i % 4 === 0 ? 2 : 4];
      if (i % 2) { VK.quad(mb, -w, z0 + 0.03, w, z1 - 0.03, C(c, 0), y + 0.0005); continue; }
      const zm = (z0 + z1) / 2, hz = (z1 - z0) * 0.42;
      for (let x = -w + hz; x < w - hz * 0.5; x += hz * 2.1) mb.quadN([x, y + 0.001, zm - hz], [x + hz, y + 0.001, zm], [x, y + 0.001, zm + hz], [x - hz, y + 0.001, zm], UPV, UPV, UPV, UPV, C(c, 0));
    }
    VK.quad(mb, -w, -d, -w + 0.1, d, C(K[4], 0), y + 0.0012); VK.quad(mb, w - 0.1, -d, w, d, C(K[4], 0), y + 0.0012);
  },
  // yuvarlak örgü halı: iç içe renk halkaları
  braid(mb, R, o = {}) {
    const K = o.k || ['#c8553d', '#f2cc8f', '#81b29a', '#3d405b', '#f4f1de'], y = o.y ?? 0.006, n = o.rings || 11;
    for (let i = 0; i < n; i++) { const r1 = R * (1 - i / n), r0 = R * (1 - (i + 1) / n); mb.lathe(0, y, 0, [[r1, 0], [r0, 0]], 64, (j, a) => C(K[(i + (Math.floor(a * 18 / TAU) % 2 ? 1 : 0)) % K.length], 0)); }
  },
  // yuvarlak: kenar bordürlü, ortada yıldız/çiçek motifi
  medal(mb, R, o = {}) {
    const A = o.a || '#2f4a3a', B = o.b || '#e0c08a', Cc = o.c || '#8c1f28', y = o.y ?? 0.006;
    mb.lathe(0, y, 0, [[R, 0], [R * 0.93, 0]], 72, C(B, 0));
    mb.lathe(0, y, 0, [[R * 0.93, 0], [R * 0.86, 0]], 72, (j, a) => C(Math.floor(a * 24 / TAU) % 2 ? Cc : A, 0));
    mb.lathe(0, y, 0, [[R * 0.86, 0], [R * 0.82, 0]], 72, C(B, 0));
    mb.lathe(0, y, 0, [[R * 0.82, 0], [0, 0]], 72, C(A, 0));
    const n = o.petals || 8;
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU, ca = Math.cos(a), sa = Math.sin(a), r = R * 0.62; mb.quadN([0, y + 0.001, 0], [Math.cos(a - 0.22) * r * 0.55, y + 0.001, Math.sin(a - 0.22) * r * 0.55], [ca * r, y + 0.001, sa * r], [Math.cos(a + 0.22) * r * 0.55, y + 0.001, Math.sin(a + 0.22) * r * 0.55], UPV, UPV, UPV, UPV, C(k % 2 ? B : Cc, 0)); }
    mb.disc(0, y + 0.0015, 0, R * 0.16, R * 0.16, 18, C(B, 0), C(B, 0));
  },
  // yolluk (koridor halısı)
  runner(mb, x0, z0, x1, z1, o = {}) {
    const A = o.a || '#7a1f2b', B = o.b || '#d9b35a', y = o.y ?? 0.005;
    VK.quad(mb, x0, z0, x1, z1, C(B, 0), y); VK.quad(mb, x0 + 0.08, z0 + 0.08, x1 - 0.08, z1 - 0.08, C(A, 0), y + 0.0005);
    const along = x1 - x0 > z1 - z0, L = along ? x1 - x0 : z1 - z0;
    for (let t = 0.4; t < L - 0.3; t += 0.6) { const cx = along ? x0 + t : (x0 + x1) / 2, cz = along ? (z0 + z1) / 2 : z0 + t, r = Math.min(x1 - x0, z1 - z0) * 0.26; mb.quadN([cx, y + 0.001, cz - r], [cx + r, y + 0.001, cz], [cx, y + 0.001, cz + r], [cx - r, y + 0.001, cz], UPV, UPV, UPV, UPV, C(B, 0)); }
  },
};
// masa altı halı türleri (RUGS'a eklenir: R yarıçap)
RUGS.medal = (mb, R, o) => RUG2.medal(mb, R, o || {});
RUGS.braid = (mb, R, o) => RUG2.braid(mb, R, o || {});
RUGS.persian = (mb, R, o) => RUG2.persian(mb, R * 1.05, R * 0.86, o || {});
RUGS.kilim = (mb, R, o) => RUG2.kilim(mb, R * 1.05, R * 0.86, o || {});

/* ====================== eşyalar ====================== */
const P = {};
// ---- oturma ----
P.sofa = (mb, w = 1.9, col = '#3f6e8c', o = {}) => {
  const B = C(col, o.e ?? 0), Bd = C(vDark(col, 0.14), o.e ?? 0), L = C(o.leg || '#3b2a1c', -0.3), d = o.d || 0.9, n = o.n || (w > 1.6 ? 3 : w > 1.1 ? 2 : 1);
  mb.rbox(-w / 2, 0.13, -d / 2, w / 2, 0.42, d / 2, 0.06, Bd, 2);
  mb.rbox(-w / 2, 0.36, -d / 2, w / 2, 0.94, -d / 2 + 0.22, 0.09, B, 2);
  for (const s of [-1, 1]) mb.rbox(s < 0 ? -w / 2 : w / 2 - 0.2, 0.28, -d / 2, s < 0 ? -w / 2 + 0.2 : w / 2, 0.68, d / 2, 0.09, B, 2);
  const cw = (w - 0.4) / n;
  for (let i = 0; i < n; i++) { const x0 = -w / 2 + 0.2 + i * cw; mb.rbox(x0 + 0.012, 0.42, -d / 2 + 0.2, x0 + cw - 0.012, 0.57, d / 2 - 0.02, 0.06, B, 2); mb.push().T(x0 + cw / 2, 0.72, -d / 2 + 0.29, 0, -0.12); mb.rbox(-cw / 2 + 0.03, -0.16, -0.08, cw / 2 - 0.03, 0.16, 0.08, 0.07, B, 2); mb.pop(); }
  for (const [x, z] of [[-w / 2 + 0.09, -d / 2 + 0.09], [w / 2 - 0.09, -d / 2 + 0.09], [-w / 2 + 0.09, d / 2 - 0.09], [w / 2 - 0.09, d / 2 - 0.09]]) mb.cyl(x, 0, z, 0.028, 0.14, 0.04, 8, L, L);
  if (o.pillow) for (const s of [-1, 1]) { if (n === 1 && s > 0) continue; mb.push().T(s * (w / 2 - 0.38), 0.7, -d / 2 + 0.42, s * 0.3, -0.3); mb.rbox(-0.17, -0.17, -0.06, 0.17, 0.17, 0.06, 0.07, C(o.pillow, 0), 2); mb.pop(); }
  if (o.throw) { mb.box(w / 2 - 0.55, 0.57, -d / 2 + 0.22, w / 2 - 0.2, 0.585, d / 2 + 0.02, C(o.throw, 0)); mb.box(w / 2 - 0.55, 0.2, d / 2 + 0.01, w / 2 - 0.2, 0.585, d / 2 + 0.025, C(o.throw, 0)); }
  VK.sh(mb, 0, 0, w * 0.62, d * 0.72, 0.38);
};
P.armchair = (mb, col = '#c8553d', o = {}) => P.sofa(mb, 0.98, col, Object.assign({ n: 1 }, o));
P.pouf = (mb, r = 0.3, col = '#e9c46a', o = {}) => { mb.rbox(-r, 0.02, -r, r, 0.42, r, 0.14, C(col, 0), 3); mb.torusN(0, 0.42, 0, r * 0.62, 0.012, 0.012, 20, 3, C(vDark(col, 0.2), 0)); VK.sh(mb, 0, 0, r * 1.25, r * 1.25, 0.4); };
P.stool = (mb, h = 0.76, seat = '#c8553d', leg = '#2f3338', o = {}) => {
  const L = C(leg, -0.75);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; limb(mb, [Math.cos(a) * 0.12, h - 0.04, Math.sin(a) * 0.12], [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], [0.018, 0.016], L, 6); }
  mb.torusN(0, h * 0.36, 0, 0.17, 0.012, 0.012, 18, 3, L);
  mb.cyl(0, h - 0.05, 0, 0.19, h, 0.2, 18, L, L);
  mb.cyl(0, h, 0, 0.2, h + 0.07, 0.19, 18, C(seat, o.gloss ?? -0.3), C(seat, o.gloss ?? -0.3));
  VK.sh(mb, 0, 0, 0.26, 0.26, 0.35);
};
P.bench = (mb, w = 1.7, wood = '#9a6a3f', iron = '#2f3338', o = {}) => {
  const Wd = C(wood, -0.1), Fe = C(iron, -0.7);
  for (let i = 0; i < 4; i++) mb.rbox(-w / 2, 0.42, -0.24 + i * 0.12, w / 2, 0.46, -0.15 + i * 0.12, 0.012, Wd, 1);
  for (let i = 0; i < 3; i++) { mb.push().T(0, 0.62 + i * 0.13, -0.3 - i * 0.02, 0, -0.18); mb.rbox(-w / 2, -0.04, -0.02, w / 2, 0.04, 0.02, 0.012, Wd, 1); mb.pop(); }
  for (const s of [-1, 1]) { const x = s * (w / 2 - 0.12); mb.box(x - 0.03, 0, -0.26, x + 0.03, 0.42, -0.2, Fe); mb.box(x - 0.03, 0, 0.18, x + 0.03, 0.42, 0.24, Fe); mb.box(x - 0.03, 0.38, -0.3, x + 0.03, 0.44, 0.26, Fe); limb(mb, [x, 0.42, -0.26], [x, 1.0, -0.38], [0.03, 0.03], Fe, 6); limb(mb, [x, 0.6, 0.22], [x, 0.66, -0.1], [0.025, 0.025], Fe, 6); }
  VK.sh(mb, 0, 0, w * 0.55, 0.38, 0.32);
};
// ---- masalar ----
P.sideTable = (mb, r = 0.3, h = 0.56, top = '#8a5a34', leg = '#3b2a1c') => {
  const T = C(top, -0.35), L = C(leg, -0.4);
  mb.cyl(0, h - 0.035, 0, r, h, r, 20, T, T); mb.torusN(0, h - 0.018, 0, r, 0.018, 0.018, 24, 4, T);
  mb.cyl(0, 0.035, 0, 0.032, h - 0.035, 0.032, 8, L, L); mb.cyl(0, 0, 0, r * 0.62, 0.035, r * 0.55, 16, L, L);
  VK.sh(mb, 0, 0, r * 1.05, r * 1.05, 0.34);
};
P.coffeeTable = (mb, w = 1.1, d = 0.6, h = 0.42, top = '#8a5a34', leg = '#3b2a1c', o = {}) => {
  const T = C(top, -0.3), L = C(leg, -0.35);
  mb.rbox(-w / 2, h - 0.05, -d / 2, w / 2, h, d / 2, 0.02, T, 2);
  for (const [x, z] of [[-w / 2 + 0.06, -d / 2 + 0.06], [w / 2 - 0.06, -d / 2 + 0.06], [-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06]]) mb.box(x - 0.03, 0, z - 0.03, x + 0.03, h - 0.05, z + 0.03, L);
  mb.box(-w / 2 + 0.06, 0.1, -d / 2 + 0.06, w / 2 - 0.06, 0.13, d / 2 - 0.06, L);
  if (o.books !== false) { mb.box(-w / 2 + 0.1, 0.13, -0.15, -w / 2 + 0.42, 0.17, 0.1, C('#2a9d8f', 0)); mb.box(-w / 2 + 0.12, 0.17, -0.13, -w / 2 + 0.4, 0.2, 0.08, C('#e9c46a', 0)); }
  VK.sh(mb, 0, 0, w * 0.62, d * 0.7, 0.34);
};
P.desk = (mb, w = 1.4, d = 0.7, top = '#a77a4f', body = '#8a5a34') => {
  const T = C(top, -0.3), B = C(body, -0.2);
  mb.rbox(-w / 2, 0.72, -d / 2, w / 2, 0.77, d / 2, 0.015, T, 2);
  mb.box(-w / 2 + 0.02, 0, -d / 2 + 0.02, -w / 2 + 0.46, 0.72, d / 2 - 0.02, B);
  for (let i = 0; i < 3; i++) { mb.box(-w / 2 + 0.05, 0.06 + i * 0.22, d / 2 - 0.02, -w / 2 + 0.43, 0.25 + i * 0.22, d / 2, C(vLight(body, 0.1), -0.2)); mb.box(-w / 2 + 0.2, 0.15 + i * 0.22, d / 2, -w / 2 + 0.28, 0.17 + i * 0.22, d / 2 + 0.02, C('#e2b552', -0.85)); }
  mb.box(w / 2 - 0.06, 0, -d / 2 + 0.04, w / 2 - 0.02, 0.72, d / 2 - 0.04, B);
  mb.box(-w / 2 + 0.46, 0.5, -d / 2 + 0.04, w / 2 - 0.06, 0.53, -d / 2 + 0.08, B);
  VK.sh(mb, 0, 0, w * 0.6, d * 0.7, 0.34);
};
// ---- depolama ----
P.cabinet = (mb, w = 1.6, h = 0.9, d = 0.45, col = '#7a4a2a', o = {}) => {
  const B = C(col, o.e ?? -0.2), Bl = C(o.face || vLight(col, 0.1), o.e ?? -0.2), Tp = C(o.top || vDark(col, 0.12), -0.35), K = C(o.knob || '#e2b552', -0.85);
  const leg = o.legs ? 0.14 : 0.08;
  if (o.legs) for (const [x, z] of [[-w / 2 + 0.06, -d / 2 + 0.06], [w / 2 - 0.06, -d / 2 + 0.06], [-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06]]) limb(mb, [x, leg, z], [x * 1.02, 0, z * 1.05], [0.025, 0.02], C(vDark(col, 0.2), -0.3), 6);
  else mb.box(-w / 2 + 0.03, 0, -d / 2 + 0.03, w / 2 - 0.03, leg, d / 2 - 0.04, C(vDark(col, 0.35), 0));
  mb.box(-w / 2, leg, -d / 2, w / 2, h - 0.04, d / 2, B);
  mb.rbox(-w / 2 - 0.025, h - 0.045, -d / 2 - 0.02, w / 2 + 0.025, h, d / 2 + 0.03, 0.012, Tp, 1);
  const n = o.n || Math.max(1, Math.round(w / 0.5)), cw = (w - 0.06) / n;
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + 0.03 + i * cw, x1 = x0 + cw - 0.02;
    if (o.drawers) { const m = o.drawers; for (let j = 0; j < m; j++) { const ya = leg + 0.03 + ((h - leg - 0.1) * j) / m, yb = ya + (h - leg - 0.1) / m - 0.025; mb.box(x0 + 0.01, ya, d / 2, x1 - 0.01, yb, d / 2 + 0.02, Bl); mb.box((x0 + x1) / 2 - 0.06, (ya + yb) / 2 - 0.012, d / 2 + 0.02, (x0 + x1) / 2 + 0.06, (ya + yb) / 2 + 0.012, d / 2 + 0.04, K); } }
    else { mb.box(x0 + 0.01, leg + 0.03, d / 2, x1 - 0.01, h - 0.08, d / 2 + 0.02, Bl); mb.box(x0 + 0.06, leg + 0.09, d / 2 + 0.02, x1 - 0.06, h - 0.14, d / 2 + 0.026, B); mb.sphereS(i % 2 ? x0 + 0.08 : x1 - 0.08, (leg + h) / 2, d / 2 + 0.045, 0.02, 0.02, 0.02, K, 6, 4); }
  }
  VK.sh(mb, 0, 0, w * 0.6, d * 0.85, 0.36);
};
// kitaplık: raflarda farklı boy ve renkte kitaplar, yer yer devrik kitap ve küçük süs
const BOOKC = ['#a3262a', '#1d3557', '#2a9d8f', '#e9c46a', '#6d597a', '#f4a261', '#264653', '#8a5a44', '#3f7d58', '#c97c5d', '#e5e5e5', '#5c3d6e'];
P.books = (mb, x0, x1, y, d, seed, cols = BOOKC, lean = true) => {
  let x = x0, k = 0;
  while (x < x1 - 0.05) {
    const bw = 0.035 + hs(k, seed) * 0.035, bh = 0.18 + hs(k, seed + 1) * 0.12, bd = d * (0.72 + hs(k, seed + 2) * 0.22);
    if (x + bw > x1) break;
    if (hs(k, seed + 3) < 0.08 && x + 0.28 < x1) { for (let j = 0; j < 3; j++) mb.box(x, y + j * 0.04, -bd / 2, x + 0.26, y + j * 0.04 + 0.038, bd / 2, C(cols[(k + j) % cols.length], 0)); x += 0.3; k++; continue; }
    if (lean && hs(k, seed + 4) < 0.06 && x + 0.12 < x1) { mb.push().T(x + 0.06, y, 0, 0, 0, -0.38); mb.box(0, 0, -bd / 2, bw, bh, bd / 2, C(cols[k % cols.length], 0)); mb.pop(); x += 0.14; k++; continue; }
    const c = cols[Math.floor(hs(k, seed + 5) * cols.length)];
    mb.box(x, y, -bd / 2, x + bw, y + bh, bd / 2, C(c, 0));
    if (bw > 0.05) mb.box(x + 0.002, y + bh * 0.7, bd / 2, x + bw - 0.002, y + bh * 0.76, bd / 2 + 0.002, C(vLight(c, 0.5), 0));
    x += bw + 0.004; k++;
  }
};
P.bookcase = (mb, w = 1.2, h = 2.1, col = '#6b4428', seed = 1, o = {}) => {
  const B = C(col, -0.2), Bd = C(vDark(col, 0.32), 0), d = o.d || 0.36, n = o.rows || Math.max(3, Math.round((h - 0.2) / 0.4));
  mb.box(-w / 2, 0, -d / 2, w / 2, 0.1, d / 2, B); mb.box(-w / 2, h - 0.05, -d / 2 - 0.01, w / 2, h, d / 2 + 0.03, B);
  mb.box(-w / 2, 0, -d / 2, -w / 2 + 0.04, h, d / 2, B); mb.box(w / 2 - 0.04, 0, -d / 2, w / 2, h, d / 2, B);
  mb.box(-w / 2, 0.1, -d / 2, w / 2, h - 0.05, -d / 2 + 0.02, Bd);
  const sh = (h - 0.15) / n;
  for (let i = 0; i < n; i++) {
    const y = 0.1 + i * sh;
    if (i > 0) mb.box(-w / 2 + 0.04, y - 0.025, -d / 2, w / 2 - 0.04, y, d / 2, B);
    const z = 0.02;
    mb.push().T(0, 0, z);
    if (o.deco && i === 1 + (seed % 2)) { P.books(mb, -w / 2 + 0.05, 0.05, y, d * 0.9, seed * 11 + i); mb.sphereS(w / 4, y + 0.11, 0, 0.09, 0.11, 0.09, C(o.deco, -0.6), 10, 7); }
    else P.books(mb, -w / 2 + 0.05, w / 2 - 0.05, y, d * 0.9, seed * 11 + i);
    mb.pop();
  }
  VK.sh(mb, 0, 0, w * 0.6, d * 1.1, 0.36);
};
// duvar rafı (duvara asılı, arkası yerel z = 0): eşyalar dizi: 'b' kitap, 'j' kavanoz, 'p' saksı, 'o' şişe, 'c' fincan, 'f' çerçeve
P.wallShelf = (mb, w, col, items, seed = 1, o = {}) => {
  const B = C(col, -0.25), d = o.d || 0.26;
  mb.box(-w / 2, -0.04, 0, w / 2, 0, d, B);
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) { mb.box(x - 0.02, -0.2, 0, x + 0.02, -0.04, 0.03, C(o.bracket || '#2b2b2b', -0.6)); mb.box(x - 0.02, -0.06, 0, x + 0.02, -0.04, d * 0.8, C(o.bracket || '#2b2b2b', -0.6)); }
  const n = items.length, sw = (w - 0.12) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.06 + sw * (i + 0.5), it = items[i], h = hs(i, seed);
    if (it === 'b') { mb.push().T(0, 0, d / 2); P.books(mb, x - sw / 2 + 0.02, x + sw / 2 - 0.02, 0, d * 0.8, seed * 7 + i, BOOKC, false); mb.pop(); }
    else if (it === 'j') { const c = ['#e9c46a', '#c8553d', '#7fb069', '#f4a261'][i % 4]; mb.cyl(x, 0, d / 2, 0.06, 0.16, 0.06, 12, C('#dff1f7', -0.85), C('#dff1f7', -0.85)); mb.cyl(x, 0.005, d / 2, 0.052, 0.12, 0.052, 10, C(c, 0), C(c, 0)); mb.cyl(x, 0.16, d / 2, 0.064, 0.19, 0.064, 12, C('#3a3d44', -0.6), C('#3a3d44', -0.6)); }
    else if (it === 'p') { mb.lathe(x, 0, d / 2, [[0.06, 0], [0.085, 0.13], [0.09, 0.14]], 12, C(['#c8693a', '#e9e3d6', '#2a6f97'][i % 3], -0.2), 'b'); for (let j = 0; j < 6; j++) { const a = j * 1.1; limb(mb, [x, 0.12, d / 2], [x + Math.cos(a) * 0.14, 0.12 - 0.12 * (j % 2), d / 2 + Math.sin(a) * 0.08 + 0.06], [0.02, 0.012], C(j % 2 ? '#3f8f52' : '#5aa86a', 0), 4); } mb.sphereS(x, 0.17, d / 2, 0.08, 0.07, 0.07, C('#4f9a55', 0), 10, 6); }
    else if (it === 'o') { const c = ['#2f6b3a', '#7a2a1d', '#c9a34a', '#3a5a8a'][Math.floor(h * 4)]; mb.lathe(x, 0, d / 2, [[0.045, 0], [0.045, 0.16], [0.015, 0.22], [0.014, 0.28]], 10, C(c, -0.8)); }
    else if (it === 'c') { for (let j = 0; j < 2; j++) { const xx = x + (j - 0.5) * 0.1; mb.lathe(xx, 0, d / 2, [[0.03, 0], [0.04, 0.07], [0.042, 0.075]], 10, C('#f4efe6', -0.4)); } }
    else if (it === 'f') { mb.push().T(x, 0, d * 0.4, 0, -0.18); mb.box(-0.1, 0, -0.01, 0.1, 0.24, 0.01, C('#3b2a1c', -0.3)); mb.box(-0.08, 0.02, 0.01, 0.08, 0.22, 0.012, C(['#7fc4e8', '#f2c14e', '#e76f51'][i % 3], 0)); mb.pop(); }
    else if (it === 'v') { mb.lathe(x, 0, d / 2, [[0.04, 0], [0.08, 0.08], [0.05, 0.2], [0.035, 0.26], [0.045, 0.28]], 14, C(['#2a6f97', '#e9e3d6', '#c8553d'][i % 3], -0.6)); for (let j = 0; j < 3; j++) mb.sphereS(x + (j - 1) * 0.05, 0.36 + (j % 2) * 0.05, d / 2, 0.04, 0.04, 0.04, C(['#ff6f91', '#ffd166', '#ffffff'][j], 0), 8, 5); }
  }
};
// tezgâh / bar: gövde dikey pano, üstte parlak tabla, ayak dayama borusu (önü yerel +z)
P.counter = (mb, w = 2.4, h = 1.05, d = 0.62, front = '#6b4428', top = '#2b2b2b', o = {}) => {
  const F = C(front, -0.15), Fd = C(vDark(front, 0.2), -0.15), T = C(top, o.topE ?? -0.6);
  mb.box(-w / 2, 0, -d / 2, w / 2, 0.1, d / 2 - 0.05, C(vDark(front, 0.45), 0));
  mb.box(-w / 2, 0.1, -d / 2, w / 2, h - 0.05, d / 2, F);
  const n = Math.max(2, Math.round(w / 0.32));
  for (let i = 0; i < n; i++) { const x = -w / 2 + (w * (i + 0.5)) / n; mb.box(x - 0.01, 0.12, d / 2, x + 0.01, h - 0.08, d / 2 + 0.012, Fd); }
  mb.rbox(-w / 2 - 0.05, h - 0.06, -d / 2 - 0.04, w / 2 + 0.05, h, d / 2 + 0.08, 0.015, T, 1);
  if (o.rail !== false) { const R = C(o.railC || '#c9a34a', -0.85); mb.push().T(0, 0.24, d / 2 + 0.14, 0, 0, Math.PI / 2); mb.cyl(0, -w / 2 + 0.1, 0, 0.022, w / 2 - 0.1, 0.022, 10, R, R); mb.pop(); for (const x of [-w / 2 + 0.2, 0, w / 2 - 0.2]) mb.box(x - 0.015, 0.2, d / 2, x + 0.015, 0.25, d / 2 + 0.14, R); }
  VK.sh(mb, 0, 0, w * 0.56, d * 0.9, 0.4);
};
// arka bar rafı: duvara asılı iki kat raf, şişeler ve bardaklar, alttan ışık
P.backBar = (mb, w = 2.4, col = '#3b2416', seed = 3, glowHex = '#ffd59e', sec = -1) => {
  const B = C(col, -0.3);
  for (const y of [1.45, 1.95]) {
    mb.box(-w / 2, y - 0.04, 0, w / 2, y, 0.26, B);
    let x = -w / 2 + 0.08, k = 0;
    while (x < w / 2 - 0.1) { const kind = hs(k, seed + y * 10); const c = ['#2f6b3a', '#7a2a1d', '#c9a34a', '#3a5a8a', '#e8e1d0', '#9b2226'][Math.floor(hs(k, seed + 1) * 6)];
      if (kind < 0.7) { const hh = 0.24 + hs(k, seed + 2) * 0.1; mb.lathe(x, y, 0.13, [[0.04, 0], [0.04, hh * 0.62], [0.014, hh * 0.85], [0.013, hh]], 10, C(c, -0.85)); x += 0.11; }
      else { mb.lathe(x + 0.03, y, 0.13, [[0.03, 0], [0.04, 0.1], [0.042, 0.11]], 10, C('#dff1f7', -0.9)); x += 0.1; }
      k++; }
    const p = mb.p(0, y - 0.05, 0.18); VK.glow(p[0], p[1], p[2], w * 0.55, glowHex, 0.08, 'h', 0, 0, 0.3, sec);
  }
  mb.box(-w / 2 - 0.05, 1.2, -0.02, w / 2 + 0.05, 2.3, 0.0, C(vDark(col, 0.3), -0.2));
};
// ---- ışıklar ----
// sarkıt lamba: yerel (0, y, 0) noktasında şapka, ip yukarı; kind: 'dome' | 'cone' | 'globe' | 'drum'
P.pendant = (mb, y = 2.7, shade = '#1f4a3a', o = {}) => {
  const S = C(shade, o.e ?? -0.6), Cd = C('#1b1b1e', -0.4), kind = o.kind || 'dome', top = o.top ?? y + 0.95;
  limb(mb, [0, y + 0.18, 0], [0, top, 0], [0.008, 0.008], Cd, 4, null, 1);
  if (kind === 'dome') { mb.lathe(0, y, 0, [[0.3, 0], [0.28, 0.06], [0.2, 0.16], [0.06, 0.2], [0.03, 0.22]], 18, S); mb.lathe(0, y + 0.005, 0, [[0.29, 0], [0.0, 0.01]], 18, C('#fff1c9', 1)); }
  else if (kind === 'cone') { mb.lathe(0, y, 0, [[0.2, 0], [0.05, 0.28], [0.03, 0.3]], 16, S); mb.lathe(0, y + 0.005, 0, [[0.19, 0], [0, 0.01]], 16, C('#fff1c9', 1)); }
  else if (kind === 'globe') { mb.sphereS(0, y + 0.1, 0, 0.18, 0.18, 0.18, C(o.glass || '#fff3d6', 1), 16, 10); mb.cyl(0, y + 0.27, 0, 0.05, 0.32, 0.03, 10, Cd, Cd); }
  else if (kind === 'drum') { mb.cyl(0, y, 0, 0.32, y + 0.26, 0.32, 24, S, S, ''); mb.cyl(0, y + 0.004, 0, 0.31, y + 0.006, 0.31, 24, C('#fff1c9', 1), C('#fff1c9', 1)); }
  else if (kind === 'bulb') { mb.sphereS(0, y + 0.08, 0, 0.075, 0.1, 0.075, C('#ffe9b0', 1), 12, 8); mb.cyl(0, y + 0.17, 0, 0.03, 0.22, 0.03, 8, Cd, Cd); }
  const p = mb.p(0, y + 0.02, 0);
  VK.halo(p, o.halo ?? 0.65, o.light || '#ffd9a0', o.haloA ?? 0.3, 0, o.sec ?? -1);
  if (o.pool !== false) VK.pool([p[0], 0, p[2]], o.poolR ?? 1.5, o.light || '#ffd9a0', o.poolA ?? 0.16);
};
// duvar apliği (yerel z = 0 duvar): kol + şapka + duvarda ışık lekesi
P.sconce = (mb, k, u, y, shade = '#f3e3c3', metal = '#c9a34a', o = {}) => {
  wAt(mb, k, u, 0, y);
  const M2 = C(metal, -0.85);
  mb.rbox(-0.06, -0.1, 0, 0.06, 0.1, 0.03, 0.02, M2, 2);
  limb(mb, [0, 0, 0.02], [0, 0.06, 0.2], [0.012, 0.012], M2, 5);
  mb.lathe(0, 0.04, 0.2, [[0.12, 0], [0.08, 0.17], [0.075, 0.18]], 14, C(shade, 0.9));
  mb.pop();
  VK.wglow(k, u, 0.06, y + 0.3, 0.75, o.light || '#ffd9a0', o.a ?? 0.26, 0.95);
  const p = wXZ(k, u, 0.22); VK.halo([p[0], y + 0.12, p[1]], 0.38, o.light || '#ffd9a0', 0.3, 0, k);
};
P.floorLamp = (mb, shade = '#f3e3c3', metal = '#2b2b2b', o = {}) => {
  const M2 = C(metal, -0.7);
  mb.cyl(0, 0, 0, 0.2, 0.035, 0.18, 16, M2, M2); mb.cyl(0, 0.035, 0, 0.018, 1.45, 0.018, 8, M2, M2, '');
  mb.lathe(0, 1.38, 0, [[0.27, 0], [0.18, 0.32], [0.17, 0.33]], 18, C(shade, 0.85), '');
  mb.lathe(0, 1.385, 0, [[0.26, 0], [0, 0.005]], 18, C('#fff1c9', 1));
  const p = mb.p(0, 1.5, 0); VK.halo(p, 0.75, o.light || '#ffd9a0', 0.3); VK.pool([p[0], 0, p[2]], 1.2, o.light || '#ffd9a0', 0.17);
  VK.sh(mb, 0, 0, 0.24, 0.24, 0.4);
};
P.tableLamp = (mb, shade = '#f3e3c3', base = '#2a6f97', o = {}) => {
  mb.lathe(0, 0, 0, [[0.08, 0], [0.11, 0.06], [0.1, 0.18], [0.04, 0.26], [0.025, 0.3]], 14, C(base, -0.6));
  mb.lathe(0, 0.28, 0, [[0.17, 0], [0.11, 0.2], [0.105, 0.21]], 16, C(shade, 0.85), '');
  const p = mb.p(0, 0.36, 0); VK.halo(p, 0.5, o.light || '#ffd9a0', 0.32); VK.pool([p[0], 0, p[2]], 0.9, o.light || '#ffd9a0', 0.12);
};
P.candle = (mb, h = 0.16, col = '#f4efe6', o = {}) => {
  mb.cyl(0, 0, 0, 0.03, h, 0.028, 10, C(col, 0), C(col, 0));
  mb.sphereS(0, h + 0.035, 0, 0.016, 0.034, 0.016, C('#ffcf5a', 1), 8, 5);
  const p = mb.p(0, h + 0.04, 0); VK.halo(p, o.r ?? 0.32, '#ffb84d', o.a ?? 0.32, 1, o.sec ?? -1);
};
P.lantern = (mb, col = '#2b2b2b', glass = '#ffcf7a', o = {}) => {
  const M2 = C(col, -0.7);
  mb.cyl(0, 0, 0, 0.13, 0.04, 0.13, 8, M2, M2);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; mb.box(Math.cos(a) * 0.1 - 0.012, 0.04, Math.sin(a) * 0.1 - 0.012, Math.cos(a) * 0.1 + 0.012, 0.32, Math.sin(a) * 0.1 + 0.012, M2); }
  mb.cyl(0, 0.04, 0, 0.09, 0.32, 0.09, 8, C(glass, 1), C(glass, 1));
  mb.cyl(0, 0.32, 0, 0.14, 0.38, 0.03, 8, M2, M2); mb.torusN(0, 0.42, 0, 0.04, 0.01, 0.01, 10, 3, M2);
  const p = mb.p(0, 0.2, 0); VK.halo(p, o.r ?? 0.55, glass, o.a ?? 0.32, 0.5, o.sec ?? -1); if (o.pool) VK.pool([p[0], 0, p[2]], 1.0, glass, 0.14);
};
// ip ışıkları: noktalar (dünya koordinatı) arasında sarkan kablo + ampuller (halesiyle)
P.stringLights = (mb, pts, cols, per = 7, sag = 0.35, r = 0.05, sec = -1) => {
  const K = C('#2b2b2b', 0);
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s], b = pts[s + 1], Pt = (t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * sag, lerp(a[2], b[2], t)];
    for (let k = 0; k < 12; k++) limb(mb, Pt(k / 12), Pt((k + 1) / 12), [0.008, 0.008], K, 3, null, 1);
    for (let k = 0; k < per; k++) { const q = Pt((k + 0.5) / per), c = cols[(s * per + k) % cols.length]; mb.sphereS(q[0], q[1] - r * 1.2, q[2], r, r * 1.25, r, C(c, 1), 8, 5); if (k % 2 === 0) VK.halo([q[0], q[1] - r * 1.2, q[2]], 0.28, c, 0.22, 0, sec); }
  }
};
// ---- bitkiler ----
P.pot = (mb, r = 0.24, h = 0.42, col = '#c8693a', o = {}) => {
  const kind = o.kind || 'taper';
  if (kind === 'taper') mb.lathe(0, 0, 0, [[r * 0.72, 0], [r, h * 0.92], [r * 1.06, h * 0.93], [r * 1.06, h], [r * 0.95, h]], 16, C(col, o.e ?? -0.25), 'b');
  else if (kind === 'round') mb.lathe(0, 0, 0, [[r * 0.6, 0], [r * 1.02, h * 0.45], [r * 0.9, h * 0.92], [r * 0.95, h], [r * 0.85, h]], 18, C(col, o.e ?? -0.45), 'b');
  else if (kind === 'box') { mb.rbox(-r, 0, -r, r, h, r, 0.03, C(col, o.e ?? -0.2), 2); }
  else if (kind === 'basket') mb.lathe(0, 0, 0, [[r * 0.85, 0], [r, h], [r * 0.94, h]], 16, (i, a) => C(Math.floor(a * 16 / TAU) % 2 ? col : vDark(col, 0.15), 0), 'b');
  mb.cyl(0, h - 0.05, 0, r * 0.9, h - 0.03, r * 0.9, 14, C('#4a3426', 0), C('#4a3426', 0));
  VK.sh(mb, 0, 0, r * 1.3, r * 1.3, 0.42);
  return h - 0.03;
};
// devetabanı: büyük yarık yapraklar
P.monstera = (mb, s = 1, potCol = '#e9e3d6', o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  const y = P.pot(mb, 0.24, 0.42, potCol, { kind: o.pk || 'round' }), G = o.leaf || '#2f7d4a', G2 = vLight(G, 0.16);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.399 + 0.3, el = 0.55 + (k % 3) * 0.32, L = 0.62 + hs(k, 3) * 0.38, ca = Math.cos(a), sa = Math.sin(a);
    const tip = [ca * L * Math.cos(el) * 0.9, y + 0.15 + L * Math.sin(el), sa * L * Math.cos(el) * 0.9];
    limb(mb, [0, y, 0], tip, [0.014, 0.01], C('#4f8a3c', 0), 4);
    mb.push().T(tip[0], tip[1], tip[2], -a + Math.PI / 2, -(el - 0.35) + 0.6, 0);
    mb.sphereS(0, 0, 0.18, 0.2, 0.012, 0.24, C(k % 2 ? G : G2, 0), 12, 4);
    mb.pop();
  }
  mb.pop();
};
// paşa kılıcı: dik, sivri, iki tonlu yapraklar
P.snake = (mb, s = 1, potCol = '#2a6f97', o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  const y = P.pot(mb, 0.2, 0.36, potCol, { kind: o.pk || 'box' });
  for (let k = 0; k < 11; k++) { const a = k * 2.2, r = 0.04 + (k % 3) * 0.045, h = 0.55 + hs(k, 7) * 0.45, x = Math.cos(a) * r, z = Math.sin(a) * r, lx = Math.cos(a) * (0.06 + r * 0.6), lz = Math.sin(a) * (0.06 + r * 0.6);
    limb(mb, [x, y - 0.02, z], [x + lx, y + h, z + lz], [0.035, 0.004], C(k % 2 ? '#3a6b3f' : '#5c8f45', 0), 5);
    limb(mb, [x * 1.02, y + 0.05, z * 1.02], [x + lx * 1.02, y + h * 0.75, z + lz * 1.02], [0.012, 0.003], C('#c9c46a', 0), 4); }
  mb.pop();
};
// eğrelti: kavisli yapraklar (sap + küçük yaprakçıklar)
P.fern = (mb, s = 1, potCol = '#c8693a', o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  const y = P.pot(mb, 0.22, 0.34, potCol, { kind: o.pk || 'taper' }), G = o.leaf || '#4f9a3c';
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU + hs(k, 1) * 0.4, ca = Math.cos(a), sa = Math.sin(a);
    let pp = [0, y, 0];
    for (let j = 1; j <= 5; j++) { const t = j / 5, r = 0.62 * t, yy = y + Math.sin(t * Math.PI * 0.8) * 0.42 - t * t * 0.18; const q = [ca * r, yy, sa * r]; limb(mb, pp, q, [0.012, 0.008], C('#5a8f3a', 0), 3); for (const sd of [-1, 1]) { const lx = -sa * sd * 0.09 * (1.1 - t), lz = ca * sd * 0.09 * (1.1 - t); mb.sphereS(q[0] + lx, q[1] - 0.01, q[2] + lz, 0.06 * (1.15 - t), 0.012, 0.03, C(j % 2 ? G : vLight(G, 0.12), 0), 6, 3); } pp = q; }
  }
  mb.pop();
};
// ağaççık (kauçuk/ficus): saksıda gövde ve yuvarlak tepe öbekleri
P.ficus = (mb, s = 1, potCol = '#e9e3d6', o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  const y = P.pot(mb, 0.3, 0.5, potCol, { kind: o.pk || 'round' }), G = o.leaf || '#3f8f4a';
  limb(mb, [0, y, 0], [0.05, y + 1.0, 0.02], [0.05, 0.035], C('#7a5a3a', 0), 6); limb(mb, [0.03, y + 0.55, 0.01], [-0.25, y + 1.1, 0.05], [0.03, 0.02], C('#7a5a3a', 0), 5);
  for (const [x, yy, z, r] of [[0.05, 1.35, 0, 0.42], [-0.28, 1.2, 0.08, 0.32], [0.3, 1.15, -0.1, 0.3], [0, 1.6, -0.05, 0.3], [-0.1, 1.15, -0.25, 0.28]]) mb.sphereS(x, y + yy, z, r, r * 0.85, r, C(G, 0), 14, 9, (ux, uy) => C(uy > 0.3 ? vLight(G, 0.16) : G, 0));
  mb.pop();
};
// saksıda çiçek
P.flowers = (mb, s = 1, potCol = '#c8693a', cols = ['#ff6f91', '#ffd166', '#ffffff'], o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  const y = P.pot(mb, o.r || 0.2, o.h || 0.3, potCol, { kind: o.pk || 'taper' });
  mb.sphereS(0, y + 0.08, 0, 0.2, 0.12, 0.2, C('#4f9a3c', 0), 12, 6);
  for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 0.05 + (k % 3) * 0.06, x = Math.cos(a) * r, z = Math.sin(a) * r, h = y + 0.18 + hs(k, 5) * 0.2; limb(mb, [x * 0.5, y, z * 0.5], [x, h, z], [0.008, 0.008], C('#4f8a3c', 0), 3); const c = cols[k % cols.length]; for (let j = 0; j < 5; j++) { const b = (j / 5) * TAU; mb.sphereS(x + Math.cos(b) * 0.035, h, z + Math.sin(b) * 0.035, 0.028, 0.014, 0.028, C(c, 0), 6, 3); } mb.sphereS(x, h + 0.008, z, 0.018, 0.014, 0.018, C('#f4b400', 0), 6, 3); }
  mb.pop();
};
// tavandan sarkan saksı (yerel y = asılı nokta yüksekliği)
P.hangPlant = (mb, y = 2.6, potCol = '#e9e3d6', o = {}) => {
  limb(mb, [0, y + 0.28, 0], [0, o.top ?? 6.5, 0], [0.006, 0.006], C('#8a6a48', 0), 3, null, 1);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.16, y + 0.02, Math.sin(a) * 0.16], [0, y + 0.28, 0], [0.005, 0.005], C('#8a6a48', 0), 3, null, 1); }
  mb.lathe(0, y - 0.2, 0, [[0.1, 0], [0.17, 0.12], [0.18, 0.22]], 14, C(potCol, -0.3), 'b');
  for (let k = 0; k < 9; k++) { const a = k * 0.7, ca = Math.cos(a) * 0.17, sa = Math.sin(a) * 0.17, L = 0.4 + hs(k, 3) * 0.6; let pp = [ca, y, sa]; for (let j = 1; j <= 5; j++) { const q = [ca * (1 + j * 0.1), y - (L * j) / 5, sa * (1 + j * 0.1)]; limb(mb, pp, q, [0.006, 0.006], C('#4f8a3c', 0), 3, null, 1); mb.sphereS(q[0], q[1], q[2], 0.04, 0.025, 0.04, C(j % 2 ? '#4f9a55' : '#6ab45f', 0), 6, 3); pp = q; } }
  mb.sphereS(0, y + 0.03, 0, 0.18, 0.08, 0.18, C('#4f9a55', 0), 10, 6);
};
// ---- duvar süsleri (duvar yerel çerçevesinde, z = 0 duvar yüzü) ----
P.frame = (mb, w, h, art = 'land', frame = '#3b2a1c', seed = 1, o = {}) => {
  const F = C(frame, o.fe ?? -0.4), z1 = 0.05;
  mb.box(-w / 2, -h / 2, 0, w / 2, h / 2, 0.02, F);
  mb.box(-w / 2, -h / 2, 0.02, w / 2, -h / 2 + 0.05, z1, F); mb.box(-w / 2, h / 2 - 0.05, 0.02, w / 2, h / 2, z1, F);
  mb.box(-w / 2, -h / 2, 0.02, -w / 2 + 0.05, h / 2, z1, F); mb.box(w / 2 - 0.05, -h / 2, 0.02, w / 2, h / 2, z1, F);
  const mat = o.mat ?? 0.06, x0 = -w / 2 + 0.05 + mat, x1 = w / 2 - 0.05 - mat, y0 = -h / 2 + 0.05 + mat, y1 = h / 2 - 0.05 - mat, z = 0.024;
  if (mat > 0) VK.fq(mb, -w / 2 + 0.05, -h / 2 + 0.05, w / 2 - 0.05, h / 2 - 0.05, 0.021, C(o.matC || '#f4efe6', 0));
  vArt(mb, x0, y0, x1, y1, z, art, seed);
};
function vArt(mb, x0, y0, x1, y1, z, art, seed = 1) {
  const n = [0, 0, 1], W = x1 - x0, H = y1 - y0, A = (h) => C(h, 0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const flat = (x, y, rx, ry, col, zz = z + 0.002, seg = 16) => mb.sphereS(x, y, zz, rx, ry, 0.002, col, seg, 6);
  const PAL = [['#f6d6a8', '#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'], ['#cde7f0', '#2a6f97', '#f4a261', '#e9c46a', '#264653'], ['#fde2e4', '#ff6f91', '#6a4c93', '#ffd166', '#06d6a0']][seed % 3];
  if (art === 'land') {
    mb.quadN([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, n, n, n, A('#f9d6a5'), A('#f9d6a5'), A('#8ec9e8'), A('#8ec9e8'));
    flat(x0 + W * 0.72, y0 + H * 0.66, W * 0.1, W * 0.1, A('#ffd166'));
    flat(x0 + W * 0.25, y0 - H * 0.02, W * 0.48, H * 0.4, A('#6a994e'), z + 0.003);
    flat(x0 + W * 0.8, y0 - H * 0.08, W * 0.45, H * 0.42, A('#386641'), z + 0.004);
  } else if (art === 'sea') {
    mb.quadN([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, n, n, n, A('#2a6f97'), A('#2a6f97'), A('#bde0fe'), A('#bde0fe'));
    VK.fq(mb, x0, y0 + H * 0.38, x1, y0 + H * 0.4, z + 0.002, A('#ffffff'));
    mb.triN([cx - W * 0.1, y0 + H * 0.4, z + 0.003], [cx + W * 0.12, y0 + H * 0.4, z + 0.003], [cx, y0 + H * 0.8, z + 0.003], n, n, n, A('#ffffff'));
    VK.fq(mb, cx - W * 0.16, y0 + H * 0.34, cx + W * 0.16, y0 + H * 0.4, z + 0.003, A('#8a5a34'));
  } else if (art === 'abstract') {
    VK.fq(mb, x0, y0, x1, y1, z, A(PAL[0]));
    flat(x0 + W * 0.35, y0 + H * 0.6, W * 0.24, W * 0.24, A(PAL[1]));
    VK.fq(mb, x0 + W * 0.45, y0 + H * 0.12, x0 + W * 0.85, y0 + H * 0.5, z + 0.003, A(PAL[2]));
    VK.fq(mb, x0 + W * 0.1, y0 + H * 0.1, x0 + W * 0.3, y0 + H * 0.28, z + 0.004, A(PAL[3]));
  } else if (art === 'flower') {
    VK.fq(mb, x0, y0, x1, y1, z, A('#2b3a55'));
    mb.quadN([cx - W * 0.14, y0 + H * 0.05, z + 0.002], [cx + W * 0.14, y0 + H * 0.05, z + 0.002], [cx + W * 0.1, y0 + H * 0.38, z + 0.002], [cx - W * 0.1, y0 + H * 0.38, z + 0.002], n, n, n, n, A('#e9c46a'));
    for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3, x = cx + Math.sin(a) * W * 0.28, y = y0 + H * (0.62 + Math.cos(a) * 0.18); VK.fq(mb, (cx + x) / 2 - 0.004, y0 + H * 0.38, (cx + x) / 2 + 0.004, y, z + 0.002, A('#6a994e')); flat(x, y, W * 0.08, W * 0.08, A(['#ff6f91', '#ffd166', '#ffffff', '#f4a261'][k % 4]), z + 0.004, 10); }
  } else if (art === 'portrait') {
    VK.fq(mb, x0, y0, x1, y1, z, A(PAL[0]));
    flat(cx, y0 + H * 0.05, W * 0.38, H * 0.3, A(PAL[1]), z + 0.002);
    flat(cx, y0 + H * 0.55, W * 0.18, H * 0.2, A('#f1c27d'), z + 0.003);
    flat(cx, y0 + H * 0.68, W * 0.2, H * 0.12, A('#3b2a1c'), z + 0.004);
  } else if (art === 'mountain') {
    mb.quadN([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, n, n, n, A('#cfe8f5'), A('#cfe8f5'), A('#7fb5d9'), A('#7fb5d9'));
    for (const [a, b, h, c] of [[0, 0.62, 0.72, '#5c6b7a'], [0.35, 1, 0.58, '#46525e']]) { mb.triN([x0 + W * a, y0, z + 0.002], [x0 + W * b, y0, z + 0.002], [x0 + W * (a + b) / 2, y0 + H * h, z + 0.002], n, n, n, A(c)); mb.triN([x0 + W * ((a + b) / 2 - 0.08), y0 + H * h * 0.78, z + 0.003], [x0 + W * ((a + b) / 2 + 0.08), y0 + H * h * 0.78, z + 0.003], [x0 + W * (a + b) / 2, y0 + H * h, z + 0.003], n, n, n, A('#ffffff')); }
  } else if (art === 'poster') {
    VK.fq(mb, x0, y0, x1, y1, z, A(PAL[1]));
    flat(cx, cy + H * 0.08, W * 0.3, W * 0.3, A(PAL[3]), z + 0.002);
    VK.fq(mb, x0 + W * 0.12, y0 + H * 0.1, x1 - W * 0.12, y0 + H * 0.18, z + 0.003, A('#ffffff'));
    VK.fq(mb, x0 + W * 0.2, y0 + H * 0.22, x1 - W * 0.2, y0 + H * 0.26, z + 0.003, A(PAL[2]));
  } else if (art === 'map') {
    VK.fq(mb, x0, y0, x1, y1, z, A('#e9dcb5'));
    for (let k = 0; k < 6; k++) flat(x0 + W * (0.15 + hs(k, seed) * 0.7), y0 + H * (0.2 + hs(k, seed + 1) * 0.6), W * (0.08 + hs(k, seed + 2) * 0.12), H * (0.06 + hs(k, seed + 3) * 0.1), A('#9cb380'), z + 0.002, 10);
    VK.fq(mb, x0 + W * 0.1, y0 + H * 0.48, x1 - W * 0.1, y0 + H * 0.49, z + 0.004, A('#c8553d'));
  } else VK.fq(mb, x0, y0, x1, y1, z, A(PAL[1]));
}
P.clock = (mb, r = 0.32, rim = '#3b2a1c', face = '#fbf6ec') => {
  mb.push().T(0, 0, 0, 0, Math.PI / 2);
  mb.cyl(0, 0, 0, r, 0.06, r, 28, C(rim, -0.5), C(rim, -0.5)); mb.cyl(0, 0.06, 0, r * 0.88, 0.065, r * 0.88, 28, C(face, 0), C(face, 0));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; mb.box(Math.cos(a) * r * 0.75 - 0.012, 0.065, Math.sin(a) * r * 0.75 - 0.012, Math.cos(a) * r * 0.75 + 0.012, 0.07, Math.sin(a) * r * 0.75 + 0.012, C('#2b2b2b', 0)); }
  mb.pop();
  mb.push().T(0, 0, 0.07, 0, 0, 0.6); mb.box(-0.012, 0, 0, 0.012, r * 0.5, 0.01, C('#2b2b2b', 0)); mb.pop();
  mb.push().T(0, 0, 0.075, 0, 0, -1.9); mb.box(-0.008, 0, 0, 0.008, r * 0.7, 0.01, C('#2b2b2b', 0)); mb.pop();
};
// ---- kutu, fıçı, çuval, sepet ----
P.crate = (mb, s = 0.5, col = '#b08455', o = {}) => {
  const Wd = C(col, -0.05), Wk = C(vDark(col, 0.25), -0.05), h = s * (o.hk || 0.8);
  mb.box(-s / 2, 0, -s / 2, s / 2, h, s / 2, Wk);
  for (const z of [-s / 2 - 0.004, s / 2 + 0.004]) for (let j = 0; j < 3; j++) mb.box(-s / 2, 0.02 + (j * (h - 0.04)) / 3, z - 0.006, s / 2, (j * (h - 0.04)) / 3 + (h - 0.04) / 3 - 0.01, z + 0.006, Wd);
  for (const x of [-s / 2 - 0.004, s / 2 + 0.004]) for (let j = 0; j < 3; j++) mb.box(x - 0.006, 0.02 + (j * (h - 0.04)) / 3, -s / 2, x + 0.006, (j * (h - 0.04)) / 3 + (h - 0.04) / 3 - 0.01, s / 2, Wd);
  if (o.fill) { const K = o.fill; for (let i = 0; i < 9; i++) mb.sphereS(-s * 0.3 + (i % 3) * s * 0.3, h - 0.02, -s * 0.3 + Math.floor(i / 3) * s * 0.3, s * 0.15, s * 0.13, s * 0.15, C(K[i % K.length], -0.25), 8, 5); }
  VK.sh(mb, 0, 0, s * 0.65, s * 0.65, 0.4);
};
P.barrel = (mb, r = 0.36, h = 0.95, col = '#8a5a34', band = '#3a3d44') => {
  const n = 14;
  mb.lathe(0, 0, 0, [[r * 0.86, 0], [r, h * 0.5], [r * 0.86, h]], n, (i, a) => C(Math.floor(a * n / TAU) % 2 ? col : vDark(col, 0.1), 0), 'tb');
  for (const t of [0.12, 0.36, 0.64, 0.88]) { const rr = r * (0.86 + 0.14 * Math.sin(t * Math.PI)); mb.torusN(0, h * t, 0, rr + 0.004, 0.012, 0.016, 22, 3, C(band, -0.7)); }
  mb.cyl(0, h - 0.002, 0, r * 0.8, h + 0.004, r * 0.8, 16, C(vDark(col, 0.2), 0), C(vDark(col, 0.2), 0));
  VK.sh(mb, 0, 0, r * 1.15, r * 1.15, 0.42);
};
P.sack = (mb, s = 1, col = '#d9c39a', o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  mb.sphereS(0, 0.26, 0, 0.3, 0.3, 0.26, C(col, 0), 14, 9, (ux, uy) => C(uy < -0.6 ? vDark(col, 0.1) : col, 0));
  mb.lathe(0, 0.46, 0, [[0.12, 0], [0.08, 0.08], [0.14, 0.16]], 12, C(col, 0));
  mb.torusN(0, 0.53, 0, 0.085, 0.014, 0.014, 12, 3, C('#8a6a48', 0));
  if (o.fill) for (let i = 0; i < 6; i++) mb.sphereS((hs(i, 1) - 0.5) * 0.14, 0.6 + hs(i, 2) * 0.03, (hs(i, 3) - 0.5) * 0.14, 0.05, 0.04, 0.05, C(o.fill, -0.2), 6, 4);
  mb.pop();
  VK.sh(mb, 0, 0, 0.34 * s, 0.3 * s, 0.4);
};
P.basket = (mb, r = 0.26, h = 0.22, col = '#c9a46a', fill = null) => {
  mb.lathe(0, 0, 0, [[r * 0.8, 0], [r, h], [r * 1.04, h + 0.01], [r * 0.98, h + 0.02]], 18, (i, a) => C(Math.floor(a * 20 / TAU) % 2 ? col : vDark(col, 0.14), 0), 'b');
  if (fill) for (let i = 0; i < 8; i++) { const a = i * 2.4, rr = (i % 3) * r * 0.3; mb.sphereS(Math.cos(a) * rr, h + 0.02 + (i % 2) * 0.03, Math.sin(a) * rr, r * 0.28, r * 0.25, r * 0.28, C(fill[i % fill.length], -0.25), 8, 5); }
  VK.sh(mb, 0, 0, r * 1.2, r * 1.2, 0.38);
};
// ---- ağaç ve çalı (dış mekân) ----
P.tree = (mb, s = 1, leaf = '#4f9a3c', o = {}) => {
  mb.push().T(0, 0, 0, 0, 0, 0, s);
  const T = C(o.trunk || '#7a5a3a', 0), kind = o.kind || 'round';
  if (kind === 'round') {
    limb(mb, [0, 0, 0], [0.05, 1.6, 0], [0.18, 0.1], T, 8); limb(mb, [0.03, 1.0, 0], [0.55, 1.75, 0.1], [0.08, 0.05], T, 6); limb(mb, [0.03, 1.1, 0], [-0.45, 1.8, -0.15], [0.07, 0.04], T, 6);
    for (const [x, y, z, r] of [[0, 2.35, 0, 1.0], [0.7, 2.0, 0.2, 0.7], [-0.65, 2.05, -0.2, 0.68], [0.15, 2.0, -0.7, 0.62], [-0.2, 1.95, 0.7, 0.6], [0.1, 2.9, 0.1, 0.62]]) mb.sphereS(x, y, z, r, r * 0.86, r, C(leaf, 0), 16, 10, (ux, uy) => C(uy > 0.35 ? vLight(leaf, 0.15) : uy < -0.4 ? vDark(leaf, 0.18) : leaf, 0));
  } else if (kind === 'pine') {
    limb(mb, [0, 0, 0], [0, 0.8, 0], [0.16, 0.12], T, 8);
    for (let i = 0; i < 4; i++) { const y = 0.6 + i * 0.62, r = 1.15 - i * 0.24; mb.lathe(0, y, 0, [[r, 0], [r * 0.55, 0.25], [0.05, 0.95]], 14, (j, a) => C(j === 0 ? vDark(leaf, 0.15) : leaf, 0), 'b'); if (o.snow) mb.lathe(0, y + 0.55, 0, [[r * 0.4, 0], [0.04, 0.42]], 14, C('#ffffff', 0)); }
  } else if (kind === 'birch') {
    limb(mb, [0, 0, 0], [0.08, 2.6, 0], [0.1, 0.07], C('#ece8df', 0), 8); for (let k = 0; k < 6; k++) mb.box(-0.1, 0.3 + k * 0.38, -0.02, 0.0, 0.34 + k * 0.38, 0.105, C('#2b2b2b', 0));
    for (const [x, y, z, r] of [[0.1, 2.8, 0, 0.75], [0.45, 2.45, 0.15, 0.5], [-0.35, 2.5, -0.1, 0.5]]) mb.sphereS(x, y, z, r, r * 1.15, r, C(leaf, 0), 14, 9);
  }
  mb.pop();
  VK.sh(mb, 0, 0, 1.1 * s, 1.1 * s, 0.32);
};
P.bush = (mb, r = 0.55, col = '#4f9a3c', flowers = null) => {
  for (const [x, y, z, k] of [[0, 0.6, 0, 1], [0.55, 0.45, 0.1, 0.72], [-0.5, 0.42, -0.08, 0.7], [0.1, 0.4, 0.5, 0.62], [-0.1, 0.42, -0.5, 0.6]]) mb.sphereS(x * r, y * r, z * r, r * k, r * k * 0.82, r * k, C(col, 0), 12, 8, (ux, uy) => C(uy > 0.3 ? vLight(col, 0.14) : col, 0));
  if (flowers) for (let i = 0; i < 12; i++) { const a = i * 2.4, el = 0.3 + (i % 4) * 0.25; mb.sphereS(Math.cos(a) * Math.cos(el) * r * 0.95, r * (0.6 + Math.sin(el) * 0.62), Math.sin(a) * Math.cos(el) * r * 0.95, 0.05, 0.05, 0.05, C(flowers[i % flowers.length], 0), 6, 4); }
  VK.sh(mb, 0, 0, r * 1.25, r * 1.25, 0.34);
};
// armut koltuk: geniş taban, arkada tümsek, oturma yerinde çukur, dikiş izi
P.beanbag = (mb, col = '#ff4fd8', o = {}) => {
  const B = C(col, o.e ?? -0.12), Bd = C(vDark(col, 0.18), o.e ?? -0.12);
  mb.sphereS(0, 0.2, 0.02, 0.44, 0.22, 0.42, B, 18, 10);
  mb.sphereS(0, 0.38, -0.18, 0.36, 0.3, 0.22, B, 16, 10);
  mb.sphereS(0, 0.36, 0.07, 0.27, 0.06, 0.22, Bd, 14, 6);
  mb.torusN(0, 0.2, 0.02, 0.43, 0.008, 0.012, 32, 3, Bd);
  VK.sh(mb, 0, 0.02, 0.5, 0.48, 0.42);
};
// dikdörtgen sınıf halısı: renkli kareler (her birinde küçük daire), kenarda bordür
RUGS.grid = (mb, R, o = {}) => {
  const w = R * 1.08, d = R * 0.9, y = 0.006, K = o.k || ['#3a86ff', '#ffbe0b', '#e63946', '#06d6a0', '#9b5de5', '#f77f00'], nx = 6, nz = 5;
  VK.quad(mb, -w, -d, w, d, C(o.b || '#1d3557', 0), y);
  const sx = (2 * w - 0.3) / nx, sz = (2 * d - 0.3) / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x0 = -w + 0.15 + i * sx, z0 = -d + 0.15 + j * sz; VK.quad(mb, x0 + 0.03, z0 + 0.03, x0 + sx - 0.03, z0 + sz - 0.03, C(K[(i + j * 2) % K.length], 0), y + 0.001); if (o.dots) mb.disc(x0 + sx / 2, y + 0.0015, z0 + sz / 2, Math.min(sx, sz) * 0.24, Math.min(sx, sz) * 0.24, 14, C('#ffffff', 0), C('#ffffff', 0)); }
};
// tüylü yuvarlak halı: tek renk, hafif dalgalı tonlar, açık kenar
RUGS.shag = (mb, R, o = {}) => {
  const A = hexRGB(o.a || '#7b2d8b'), B = hexRGB(o.b || '#c77dff'), y = 0.006, n = 9;
  for (let i = 0; i < n; i++) { const r1 = R * (1 - i / n), r0 = R * (1 - (i + 1) / n); mb.lathe(0, y, 0, [[r1, 0], [r0, 0]], 64, (j, a) => rgbA(i === 0 ? B : mix3(A, B, 0.05 + 0.1 * (0.5 + 0.5 * Math.sin(a * 7 + i * 1.9))), 0)); }
};

/* ====================== v2 mekânlar 1: Hesabı Kim Öder ====================== */
// ham ışık ayarları (partyLight uygulanmaz): sunC anahtar ışık, sky üst dolgu, gnd alt dolgu, lampC masa lambası
const VL2 = {
  bistro: { raw: 1, sunC: [0.6, 0.53, 0.46], sky: [0.33, 0.32, 0.35], gnd: [0.21, 0.18, 0.16], night: 1, warm: [1, 0.82, 0.56], lampC: [1.05, 0.8, 0.52], fogR: [40, 110], stars: 0, glowS: 0.5 },
};
// hafif bükme sandalye (arka plan masaları için az üçgenli)
function v2ChairLite(mb, wood = '#3b2416', seat = '#7a1f24') {
  const W = C(wood, -0.35);
  for (const [x, z] of [[-0.17, 0.15], [0.17, 0.15], [-0.15, -0.15], [0.15, -0.15]]) limb(mb, [x * 0.92, 0.42, z * 0.92], [x * 1.16, 0, z * 1.16], [0.02, 0.017], W, 4, null, 1);
  mb.cyl(0, 0.4, 0, 0.22, 0.47, 0.21, 12, C(seat, -0.15), C(seat, -0.15));
  for (const sd of [-1, 1]) limb(mb, [sd * 0.15, 0.44, -0.17], [sd * 0.17, 0.8, -0.24], [0.018, 0.018], W, 4, null, 1);
  mb.push().T(0, 0.86, -0.25, 0, Math.PI / 2 - 0.1, 0, 1, 1, 1.2); mb.torusN(0, 0, 0, 0.17, 0.018, 0.018, 14, 3, W); mb.pop();
}
// lokanta masası takımı: kare masa, beyaz örtü üstünde renkli yolluk, n sandalye (2 ya da 4), tabak, bardak, mum, vazo
function v2DinerSet(mb, n = 2, run = '#7a1f24', o = {}) {
  const w = o.w || 0.44, Cl = C('#f7f2e8', 0), W = C('#2e1a0f', -0.35);
  mb.box(-w, 0.74, -w, w, 0.765, w, Cl);
  for (const s of [-1, 1]) { mb.box(-w - 0.012, 0.5, s * w - 0.012, w + 0.012, 0.765, s * w + 0.012, Cl); mb.box(s * w - 0.012, 0.5, -w, s * w + 0.012, 0.765, w, Cl); }
  mb.box(-0.13, 0.766, -w - 0.014, 0.13, 0.772, w + 0.014, C(run, 0)); mb.box(-0.13, 0.48, w + 0.004, 0.13, 0.772, w + 0.016, C(run, 0)); mb.box(-0.13, 0.48, -w - 0.016, 0.13, 0.772, -w - 0.004, C(run, 0));
  mb.cyl(0, 0.03, 0, 0.05, 0.5, 0.05, 8, W, W); mb.cyl(0, 0, 0, 0.28, 0.04, 0.25, 14, W, W);
  const seats = n === 4 ? [0, 1, 2, 3] : [0, 2];
  for (const q of seats) {
    const a = (q * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
    mb.push().T(ca * 0.27, 0.772, sa * 0.27); mb.cyl(0, 0, 0, 0.13, 0.012, 0.13, 16, C('#ffffff', -0.55), C('#ffffff', -0.55)); mb.cyl(0, 0.012, 0, 0.085, 0.018, 0.085, 14, C(o.plate || '#e9c46a', -0.4), C(o.plate || '#e9c46a', -0.4)); mb.pop();
    mb.lathe(ca * 0.26 - sa * 0.17, 0.772, sa * 0.26 + ca * 0.17, [[0.025, 0], [0.012, 0.03], [0.01, 0.09], [0.033, 0.12], [0.038, 0.18]], 7, C('#e8f4f8', -0.9));
    mb.box(ca * 0.27 + sa * 0.17 - 0.012, 0.772, sa * 0.27 - ca * 0.17 - 0.07, ca * 0.27 + sa * 0.17 + 0.012, 0.778, sa * 0.27 - ca * 0.17 + 0.07, C('#c9ced6', -0.9));
    mb.push().T(ca * 0.74, 0, sa * 0.74, -a - Math.PI / 2); v2ChairLite(mb, '#3b2416', o.seat || '#7a1f24'); mb.pop();
  }
  mb.push().T(0, 0.772, 0); P.candle(mb, 0.1, '#f4efe6', { r: 0.26, a: 0.26 }); mb.pop();
  mb.push().T(0.06, 0.772, 0.11); mb.lathe(0, 0, 0, [[0.028, 0], [0.036, 0.05], [0.018, 0.11], [0.02, 0.13]], 10, C('#2a6f97', -0.7)); for (let j = 0; j < 3; j++) mb.sphereS((j - 1) * 0.025, 0.16 + (j % 2) * 0.02, 0, 0.022, 0.022, 0.022, C(['#ff6f61', '#ffffff', '#ffd166'][j], 0), 6, 4); mb.pop();
  VK.sh(mb, 0, 0, n === 4 ? 0.95 : 0.6, n === 4 ? 0.95 : 0.95, 0.36);
}
// küçük iki kişilik masa (örtülü, tabak ve mumla): yerel merkezde
function v2DinerTable(mb, cloth = '#fbf6ec', wood = '#3b2416', o = {}) {
  const W = C(wood, -0.35), Cl = C(cloth, 0), w = o.w || 0.42;
  mb.box(-w, 0.74, -w, w, 0.76, w, Cl);
  for (const [a, b, c, d] of [[-w - 0.01, -w - 0.01, w + 0.01, -w + 0.01], [-w - 0.01, w - 0.01, w + 0.01, w + 0.01]]) mb.box(a, 0.55, b, c, 0.76, d, Cl);
  for (const [a, b, c, d] of [[-w - 0.01, -w, -w + 0.01, w], [w - 0.01, -w, w + 0.01, w]]) mb.box(a, 0.55, b, c, 0.76, d, Cl);
  mb.cyl(0, 0.03, 0, 0.05, 0.55, 0.05, 8, W, W); mb.cyl(0, 0, 0, 0.26, 0.04, 0.24, 14, W, W);
  for (const s of [-1, 1]) { mb.cyl(0, 0.76, s * 0.22, 0.13, 0.775, 0.13, 16, C('#ffffff', -0.5), C('#ffffff', -0.5)); mb.cyl(0, 0.775, s * 0.22, 0.08, 0.78, 0.08, 14, C(o.plate || '#c8553d', -0.4), C(o.plate || '#c8553d', -0.4)); mb.lathe(0.2, 0.76, s * 0.18, [[0.025, 0], [0.03, 0.02], [0.012, 0.03], [0.01, 0.1], [0.035, 0.13], [0.04, 0.19]], 10, C('#e8f4f8', -0.9)); }
  mb.push().T(-0.12, 0.76, 0); P.candle(mb, 0.12, '#f4efe6', { r: 0.28, a: 0.3 }); mb.pop();
  mb.push().T(0.08, 0.76, 0.02); mb.lathe(0, 0, 0, [[0.03, 0], [0.04, 0.05], [0.02, 0.12], [0.022, 0.14]], 10, C('#2a6f97', -0.7)); mb.sphereS(0, 0.17, 0, 0.03, 0.03, 0.03, C('#ff6f61', 0), 6, 4); mb.pop();
  VK.sh(mb, 0, 0, 0.55, 0.55, 0.4);
}
Object.assign(VENUES, {
  /* ---- Hesabı Kim Öder: akşam bistrosu (bar, cam kapı, pencere önünde yemek yiyen masalar) ---- */
  hesap: {
    room: 1, raw: 1, wallH: 5.2,
    table: 'checker', tableO: { check: '#b3202a', check2: '#fbf6ec' }, chair: 'thonet', chairO: { wood: '#3b2416' },
    rug: 'medal', rugO: { a: '#2c4a3c', b: '#c9a85a', c: '#2c4a3c', petals: 12 },
    L: VL2.bistro, sky: ['#141018', '#2a1f22', '#1d1714'], sun: [0.4, 0.86, 0.32], shR: 8.4, parts: 'dust',
    post: { bloom: 0.5, th: 0.8, sat: 1.04, con: 0.1, vig: 0.38, tint: [1.02, 1.0, 0.97] },
    det: 0.11, detS: 0.5,
    logos: [[3, 0, 1.75, 0.95, 0.95]],
    build(mb) {
      vApron(mb, '#5a3a24', { lip: '#8a5a3a', fade: '#120d0a' });
      VK.planks(mb, -RW, -RW, RW, RW, 0.24, ['#6a4630', '#634129', '#714c33', '#5d3d26', '#684530'], 'z', -0.16, 0, '#2a1a10');
      for (const [a, b, c, d] of [[-RW, -RW, RW, -RW + 0.42], [-RW, RW - 0.42, RW, RW], [-RW, -RW, -RW + 0.42, RW], [RW - 0.42, -RW, RW, RW]]) VK.quad(mb, a, b, c, d, C('#4a2c18', -0.2), 0.003);
      const WALL = { wall: '#e7d6b4', dado: '#4a2a18', dadoH: 1.15, panel: '#5c3620', rail: '#2e1a0f', base: '#24140b', crown: '#f3e9d2', pat: 'pin', pc: '#d2bd94', ps: 0.24 };
      // ---- 0: arka duvar — tabela, aplikler, kara tahta menü, yaldızlı ayna ----
      vWall(0, WALL, []);
      vSign('frame', '#3b2416', '#fbf3df', { lampC: '#c9a34a' });
      for (const u of [-2.55, 2.55]) P.sconce(SEC(0), 0, u, 2.05, '#f6e3bd', '#c9a34a');
      { const s0 = SEC(0); wAt(s0, 0, -4.7, 0, 2.05);
        s0.rbox(-0.86, -0.66, 0, 0.86, 0.66, 0.05, 0.02, C('#6b4428', -0.3), 2); s0.box(-0.76, -0.56, 0.05, 0.76, 0.56, 0.06, C('#24342c', 0));
        const ch = C('#f2efe6', 0.15);
        s0.box(-0.42, 0.36, 0.061, 0.42, 0.42, 0.064, ch);
        for (let i = 0; i < 6; i++) { const y = 0.2 - i * 0.13, w = 0.28 + hs(i, 3) * 0.22; s0.box(-0.62, y, 0.061, -0.62 + w, y + 0.025, 0.064, ch); s0.box(0.62 - 0.12, y, 0.061, 0.62, y + 0.025, 0.064, ch); for (let k = 0; k < 6; k++) s0.box(-0.62 + w + 0.04 + k * 0.08, y + 0.005, 0.061, -0.62 + w + 0.06 + k * 0.08, y + 0.02, 0.064, ch); }
        s0.pop(); }
      { const s0 = SEC(0); wAt(s0, 0, 4.7, 0, 2.15);
        s0.push().T(0, 0, 0.02, 0, Math.PI / 2, 0, 1, 1, 1.35); s0.torusN(0, 0, 0, 0.58, 0.06, 0.05, 32, 6, C('#c9a34a', -0.85)); s0.cyl(0, -0.02, 0, 0.56, 0.0, 0.56, 32, C('#9fb6c2', -0.95), C('#9fb6c2', -0.95)); s0.pop();
        s0.pop(); }
      // arka duvar önü: büfe (tabaklar, vazo), sağda konsol ve sürahi
      wAt(mb, 0, -4.7, 0.25); P.cabinet(mb, 1.9, 0.92, 0.46, '#4a2a18', { n: 3, face: '#5c3620', top: '#2e1a0f' });
      for (let i = 0; i < 5; i++) mb.cyl(-0.7 + i * 0.07, 0.92, 0.0, 0.13, 0.925 + i * 0.004, 0.13, 16, C('#fbf6ec', -0.5), C('#fbf6ec', -0.5));
      mb.push().T(0.55, 0.92, 0); P.flowers(mb, 0.8, '#2a6f97', ['#ffffff', '#ffd166', '#ff6f91'], { pk: 'round' }); mb.pop();
      mb.pop();
      wAt(mb, 0, 4.7, 0.25); P.cabinet(mb, 1.5, 0.86, 0.42, '#4a2a18', { n: 2, drawers: 2, face: '#5c3620', top: '#2e1a0f' });
      mb.push().T(-0.4, 0.86, 0); mb.lathe(0, 0, 0, [[0.08, 0], [0.11, 0.08], [0.06, 0.22], [0.05, 0.3], [0.07, 0.32]], 14, C('#e8f4f8', -0.9)); mb.cyl(0, 0.01, 0, 0.09, 0.14, 0.07, 12, C('#e9b949', 0), C('#e9b949', 0)); mb.pop();
      mb.push().T(0.35, 0.86, 0.02); P.tableLamp(mb, '#f6e3bd', '#2f4a3a'); mb.pop();
      mb.pop();
      // ---- 1: sağ duvar — bar: arka raf, tezgâh, taburelер, sarkıt lambalar ----
      vWall(1, WALL, []);
      wAt(SEC(1), 1, 0, 0, 0); P.backBar(SEC(1), 4.4, '#2e1a0f', 5, '#ffd59e', 1); SEC(1).pop();
      { const s1 = SEC(1); wAt(s1, 1, 0, 0, 2.55); s1.rbox(-1.2, -0.28, 0, 1.2, 0.28, 0.05, 0.03, C('#2e1a0f', -0.3), 2); s1.box(-1.1, -0.2, 0.05, 1.1, 0.2, 0.06, C('#1f3a2f', 0)); for (let i = 0; i < 7; i++) s1.box(-0.95 + i * 0.29, -0.06, 0.061, -0.95 + i * 0.29 + 0.2, 0.06, 0.064, C('#e9c46a', 0.6)); s1.pop(); VK.wglow(1, 0, 0.08, 2.55, 1.4, '#ffd59e', 0.12, 0.45); }
      wAt(mb, 1, 0, 1.25); P.counter(mb, 4.6, 1.05, 0.66, '#4a2a18', '#1d1a18', { railC: '#c9a34a' });
      mb.push().T(-1.55, 1.05, 0); mb.rbox(-0.24, 0, -0.18, 0.24, 0.36, 0.18, 0.04, C('#c8261c', -0.6), 2); mb.box(-0.2, 0.08, 0.18, 0.2, 0.3, 0.19, C('#2b2b2b', -0.6)); for (const x of [-0.1, 0.1]) { mb.cyl(x, 0.07, 0.22, 0.012, 0.12, 0.012, 6, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); mb.cyl(x, 0.0, 0.26, 0.04, 0.05, 0.035, 10, C('#fbf6ec', -0.4), C('#fbf6ec', -0.4)); } mb.cyl(0, 0.36, 0, 0.12, 0.42, 0.12, 12, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); mb.pop();
      mb.push().T(0.0, 1.05, 0.05); mb.cyl(0, 0, 0, 0.2, 0.03, 0.2, 18, C('#c9a34a', -0.85), C('#c9a34a', -0.85)); mb.cyl(0, 0.03, 0, 0.03, 0.12, 0.03, 8, C('#c9a34a', -0.85), C('#c9a34a', -0.85)); mb.cyl(0, 0.12, 0, 0.22, 0.14, 0.22, 18, C('#fbf6ec', -0.4), C('#fbf6ec', -0.4)); mb.cyl(0, 0.14, 0, 0.16, 0.3, 0.16, 18, C('#f2c6a0', 0), C('#7a3e22', 0)); mb.cyl(0, 0.3, 0, 0.165, 0.33, 0.165, 18, C('#fff1f4', 0), C('#fff1f4', 0)); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; mb.sphereS(Math.cos(a) * 0.12, 0.35, Math.sin(a) * 0.12, 0.025, 0.025, 0.025, C('#c8261c', -0.3), 6, 4); } mb.sphereS(0, 0.34, 0, 0.21, 0.24, 0.21, C('#e8f4f8', -0.95), 16, 10, (ux, uy) => C('#e8f4f8', uy < -0.2 ? -0.95 : -0.95)); mb.pop();
      mb.push().T(1.25, 1.05, 0); P.basket(mb, 0.17, 0.08, '#c9a46a', ['#f4d35e', '#f9e07f', '#e9c46a']); mb.pop();
      mb.push().T(1.85, 1.05, 0.05); mb.rbox(-0.2, 0, -0.14, 0.2, 0.18, 0.14, 0.03, C('#c9a34a', -0.85), 2); mb.push().T(0, 0.18, -0.02, 0, -0.5); mb.rbox(-0.18, 0, -0.08, 0.18, 0.14, 0.02, 0.02, C('#c9a34a', -0.85), 2); mb.pop(); for (let i = 0; i < 8; i++) mb.box(-0.15 + (i % 4) * 0.08, 0.181, -0.02 + Math.floor(i / 4) * 0.07, -0.1 + (i % 4) * 0.08, 0.19, 0.03 + Math.floor(i / 4) * 0.07, C('#fbf6ec', -0.3)); mb.pop();
      mb.pop();
      for (const u of [-1.7, -0.55, 0.6, 1.75]) { wAt(mb, 1, u, 2.05); P.stool(mb, 0.78, '#7a1f24', '#2e1a0f'); mb.pop(); }
      for (const u of [-1.4, 0, 1.4]) { wAt(mb, 1, u, 1.25); P.pendant(mb, 2.45, '#1f3a2f', { kind: 'dome', poolR: 1.1, poolA: 0.07, halo: 0.5, haloA: 0.22 }); mb.pop(); }
      // ---- 2: ön duvar — cam giriş kapısı, perdeli pencereler, vestiyer, karşılama kürsüsü ----
      const HW2 = [{ u0: -0.6, u1: 0.6, y0: 0, y1: 2.35 }, { u0: -4.6, u1: -2.6, y0: 1.15, y1: 2.85 }, { u0: 2.6, u1: 4.6, y0: 1.15, y1: 2.85 }];
      vWall(2, WALL, HW2);
      vDoor(2, 0, { w: 1.2, h: 2.35, frame: '#2e1a0f', door: '#2e1a0f', glass: '#1f3555', knob: '#c9a34a' });
      for (const h of HW2.slice(1)) vWindow(2, h, { frame: '#2e1a0f', view: 'night', curtain: '#7a1f24', rod: '#c9a34a', sun: false, sunHex: '#9fb8ff', sunA: 0.05 });
      { const s2 = SEC(2); wAt(s2, 2, 0, 0, 2.62); s2.rbox(-0.75, -0.14, 0, 0.75, 0.14, 0.06, 0.03, C('#c9a34a', -0.85), 2); s2.box(-0.66, -0.08, 0.06, 0.66, 0.08, 0.065, C('#2e1a0f', 0)); s2.pop(); }
      { const mb = SEC(2); wAt(mb, 2, 1.55, 0.45);
      mb.cyl(0, 0, 0, 0.22, 0.04, 0.2, 14, C('#2e1a0f', -0.4), C('#2e1a0f', -0.4)); mb.cyl(0, 0.04, 0, 0.025, 1.85, 0.022, 8, C('#2e1a0f', -0.4), C('#2e1a0f', -0.4));
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; limb(mb, [0, 1.72, 0], [Math.cos(a) * 0.2, 1.84, Math.sin(a) * 0.2], [0.012, 0.012], C('#2e1a0f', -0.4), 4); }
      mb.push().T(0.16, 1.18, 0.05, 0.3); mb.rbox(-0.18, 0, -0.08, 0.18, 0.64, 0.08, 0.06, C('#3a5a8a', 0), 2); mb.pop();
      mb.push().T(-0.14, 1.26, -0.06, -0.5); mb.rbox(-0.16, 0, -0.07, 0.16, 0.56, 0.07, 0.06, C('#c9a46a', 0), 2); mb.pop();
      mb.push().T(0, 1.9, 0); mb.cyl(0, 0, 0, 0.17, 0.02, 0.17, 16, C('#2b2b2b', -0.3), C('#2b2b2b', -0.3)); mb.cyl(0, 0.02, 0, 0.1, 0.14, 0.095, 14, C('#2b2b2b', -0.3), C('#2b2b2b', -0.3)); mb.cyl(0, 0.02, 0, 0.102, 0.05, 0.102, 14, C('#7a1f24', 0), C('#7a1f24', 0)); mb.pop();
      VK.sh(mb, 0, 0, 0.28, 0.28, 0.35); mb.pop(); }
      wAt(mb, 2, -1.65, 0.95, 0, 0.25);
      mb.frustum(-0.32, 0.32, -0.22, 0.22, 0, -0.26, 0.26, -0.18, 0.18, 1.05, C('#4a2a18', -0.2));
      mb.push().T(0, 1.05, 0, 0, 0.25); mb.box(-0.34, 0, -0.26, 0.34, 0.04, 0.24, C('#2e1a0f', -0.3)); mb.box(-0.22, 0.04, -0.16, 0.2, 0.07, 0.14, C('#fbf6ec', 0)); mb.box(-0.01, 0.04, -0.16, 0.01, 0.075, 0.14, C('#7a1f24', 0)); mb.pop();
      mb.push().T(0.22, 1.09, -0.12); P.tableLamp(mb, '#f6e3bd', '#c9a34a'); mb.pop();
      VK.sh(mb, 0, 0, 0.42, 0.32, 0.38); mb.pop();
      // ---- 3: sol duvar — iki büyük pencere, önünde sedir ve iki kişilik masalar ----
      const HW3 = [{ u0: -4.15, u1: -1.85, y0: 1.2, y1: 2.9 }, { u0: 1.85, u1: 4.15, y0: 1.2, y1: 2.9 }];
      vWall(3, WALL, HW3);
      for (const h of HW3) vWindow(3, h, { frame: '#2e1a0f', view: 'night', curtain: '#7a1f24', rod: '#c9a34a', sun: false });
      wAt(mb, 3, 0, 0);
      mb.box(-5.6, 0, 0.02, 5.6, 0.42, 0.62, C('#2e1a0f', -0.2));
      for (let i = 0; i < 7; i++) { const x0 = -5.55 + i * 1.6; mb.rbox(x0, 0.42, 0.04, x0 + 1.56, 0.56, 0.62, 0.05, C('#2f4a3a', -0.25), 2); mb.rbox(x0 + 0.02, 0.56, 0.02, x0 + 1.54, 1.08, 0.16, 0.06, C('#2f4a3a', -0.25), 2); for (let j = 0; j < 3; j++) mb.sphereS(x0 + 0.4 + j * 0.4, 0.86, 0.17, 0.02, 0.02, 0.012, C('#1f3a2f', 0), 6, 3); }
      mb.box(-5.62, 1.06, 0.0, 5.62, 1.14, 0.2, C('#2e1a0f', -0.3));
      VK.sh(mb, 0, 0.32, 5.6, 0.45, 0.32);
      mb.pop();
      for (const u of [-3.0, 3.0]) { wAt(mb, 3, u, 1.12); v2DinerTable(mb, '#fbf6ec', '#2e1a0f', { plate: u < 0 ? '#2a6f97' : '#c8553d' }); mb.pop(); wAt(mb, 3, u, 1.92, 0, Math.PI); CHAIRS.thonet.base(mb, { wood: '#3b2416' }); mb.cyl(0, 0.43, 0, 0.21, 0.47, 0.2, 20, C('#7a1f24', -0.15), C('#7a1f24', -0.15)); mb.pop(); wAt(mb, 3, u, 1.12); P.pendant(mb, 2.05, '#c9a34a', { kind: 'globe', glass: '#ffe7b8', poolR: 0.9, poolA: 0.08, halo: 0.5, haloA: 0.22, top: 2.75 }); mb.pop(); }
      { const s3 = SEC(3); wAt(s3, 3, 0, 0, 2.225); s3.rbox(-0.6, -0.6, 0, 0.6, 0.6, 0.05, 0.03, C('#c9a34a', -0.85), 2); s3.box(-0.52, -0.52, 0.05, 0.52, 0.52, 0.055, C('#fbf3df', 0)); s3.pop(); }
      { const s0 = SEC(0); for (const [u, art] of [[-6.6, 'portrait'], [6.6, 'land']]) { wAt(s0, 0, u, 0, 2.35); P.frame(s0, 0.74, 0.92, art, '#c9a34a', 3, { fe: -0.85 }); s0.pop(); } }
      // ---- salon: çevrede örtülü masalar, her birinin üstünde sarkıt lamba ----
      for (const [x, z, n, ry, run, pl] of [[-3.9, -4.5, 4, 0.2, '#7a1f24', '#e9c46a'], [-0.4, -5.6, 2, 0, '#2f4a3a', '#c8553d'], [2.9, -5.0, 4, -0.25, '#7a1f24', '#2a6f97'], [4.4, 4.0, 2, 0.6, '#2f4a3a', '#e9c46a'], [0.9, 5.5, 4, 0.1, '#7a1f24', '#c8553d'], [-2.8, 5.3, 2, -0.3, '#2f4a3a', '#2a6f97']]) {
        mb.push().T(x, 0, z, ry); v2DinerSet(mb, n, run, { plate: pl, seat: run === '#7a1f24' ? '#2f4a3a' : '#7a1f24' }); mb.pop(); VK.pool([x, 0, z], 1.15, '#ffc27a', 0.07);
      }
      // ---- köşeler: büyük bitkiler, ayaklı lamba, şemsiyelik ----
      for (const [x, z, s, kind, pot] of [[-6.9, -6.9, 1.2, 'ficus', '#e9e3d6'], [6.9, -6.9, 1.05, 'snake', '#2f4a3a'], [6.95, 6.9, 1.15, 'monstera', '#c9a34a'], [-6.95, 6.95, 1.0, 'fern', '#7a1f24']]) { mb.push().T(x, 0, z, hs(x, z) * 3); P[kind](mb, s, pot); mb.pop(); }
      VK.tall(-6.4, 5.4, (m) => P.floorLamp(m, '#f6e3bd', '#2e1a0f'));
      VK.tall(5.6, -3.9, (m) => P.floorLamp(m, '#f6e3bd', '#2e1a0f'), 0.4);
      // tatlı arabası (barın yanında)
      mb.push().T(6.2, 0, 2.9, -1.2);
      const BM = C('#c9a34a', -0.85);
      for (const [x, z] of [[-0.38, -0.24], [0.38, -0.24], [-0.38, 0.24], [0.38, 0.24]]) { mb.cyl(x, 0.08, z, 0.015, 0.92, 0.015, 6, BM, BM, ''); mb.push().T(x, 0.06, z, 0, 0, Math.PI / 2); mb.cyl(0, -0.02, 0, 0.06, 0.02, 0.06, 10, C('#2b2b2b', -0.4), C('#2b2b2b', -0.4)); mb.pop(); }
      for (const y of [0.3, 0.9]) mb.box(-0.42, y, -0.28, 0.42, y + 0.03, 0.28, C('#2e1a0f', -0.4));
      for (const [x, c] of [[-0.2, '#f2c6a0'], [0.2, '#5a2e1a']]) { mb.cyl(x, 0.93, 0, 0.13, 0.94, 0.13, 14, C('#fbf6ec', -0.4), C('#fbf6ec', -0.4)); mb.cyl(x, 0.94, 0, 0.11, 1.06, 0.11, 14, C(c, 0), C(c, 0)); mb.cyl(x, 1.06, 0, 0.112, 1.08, 0.112, 14, C('#fff1f4', 0), C('#fff1f4', 0)); }
      for (let i = 0; i < 6; i++) mb.cyl(-0.28 + i * 0.11, 0.33, 0.05, 0.045, 0.37, 0.045, 10, C(['#ff9fb2', '#ffd166', '#9be7c4'][i % 3], 0), C(['#ff9fb2', '#ffd166', '#9be7c4'][i % 3], 0));
      VK.sh(mb, 0, 0, 0.5, 0.36, 0.38); mb.pop();
    },
  },
});

/* ====================== v2 mekânlar 2: Aramızdaki Casus, Doğruluk Cesaret, Kim Yapar, Tostuna Dövüş ====================== */
Object.assign(VL2, {
  spy: { raw: 1, sunC: [0.5, 0.53, 0.62], sky: [0.31, 0.34, 0.42], gnd: [0.18, 0.18, 0.22], night: 1, warm: [0.95, 0.85, 0.6], lampC: [1.2, 1.05, 0.8], fogR: [40, 110], stars: 0, glowS: 0.5 },
  party: { raw: 1, sunC: [0.5, 0.42, 0.58], sky: [0.32, 0.27, 0.4], gnd: [0.2, 0.15, 0.24], night: 1, warm: [1, 0.75, 0.9], lampC: [1.1, 0.75, 1.0], fogR: [40, 110], stars: 0, glowS: 0.5 },
  school: { raw: 1, sunC: [0.8, 0.72, 0.6], sky: [0.42, 0.43, 0.48], gnd: [0.28, 0.25, 0.21], night: 0, warm: [1, 0.9, 0.7], lampC: [0.5, 0.45, 0.38], fogR: [40, 110], stars: 0, glowS: 0.3 },
  dusk: { raw: 1, sunC: [0.72, 0.52, 0.42], sky: [0.34, 0.33, 0.44], gnd: [0.22, 0.19, 0.2], night: 1, warm: [1, 0.82, 0.55], lampC: [1.1, 0.85, 0.55], fogR: [40, 120], stars: 0, glowS: 0.5 },
});
// yeşil camlı banker lambası
function v2Banker(mb, o = {}) {
  const B = C('#c9a34a', -0.85);
  mb.cyl(0, 0, 0, 0.1, 0.025, 0.09, 12, B, B); mb.cyl(0, 0.025, 0, 0.012, 0.3, 0.012, 6, B, B, '');
  mb.push().T(0, 0.33, 0, 0, 0, Math.PI / 2); mb.cyl(0, -0.17, 0, 0.075, 0.17, 0.075, 12, C('#1f7a4a', -0.8), C('#1f7a4a', -0.8), ''); mb.pop();
  mb.box(-0.16, 0.27, -0.06, 0.16, 0.28, 0.06, C('#fff1c9', 1));
  const p = mb.p(0, 0.25, 0); VK.halo(p, 0.4, '#ffe2a0', 0.28); VK.pool([p[0], 0, p[2]], 0.95, '#ffe2a0', 0.12);
}
// daktilo
function v2Typewriter(mb) {
  mb.frustum(-0.2, 0.2, -0.16, 0.12, 0, -0.18, 0.18, -0.1, 0.06, 0.12, C('#2b2b2e', -0.6));
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) mb.cyl(-0.15 + i * 0.037, 0.06 + r * 0.025, 0.08 - r * 0.045, 0.012, 0.075 + r * 0.025, 0.012, 6, C('#e9e3d6', -0.4), C('#e9e3d6', -0.4));
  mb.push().T(0, 0.15, -0.1, 0, 0, Math.PI / 2); mb.cyl(0, -0.24, 0, 0.035, 0.24, 0.035, 10, C('#1b1b1e', -0.5), C('#1b1b1e', -0.5)); mb.pop();
  mb.push().T(0, 0.17, -0.13, 0, -0.35); mb.box(-0.12, 0, -0.005, 0.12, 0.26, 0.005, C('#fbf6ec', 0)); mb.pop();
}
// çalışma masası takımı: masa, ofis sandalyesi, banker lambası, daktilo/dosyalar
function v2OfficeDesk(mb, o = {}) {
  P.desk(mb, 1.5, 0.75, '#5a3a24', '#3b2416');
  mb.push().T(-0.45, 0.77, -0.12); v2Banker(mb); mb.pop();
  mb.push().T(0.12, 0.77, 0.02, 0.1); if (o.pc) { mb.rbox(-0.24, 0.0, -0.12, 0.24, 0.02, 0.12, 0.01, C('#2b2b2e', -0.6), 1); mb.push().T(0, 0.02, -0.1, 0, -0.25); mb.rbox(-0.24, 0, -0.01, 0.24, 0.32, 0.02, 0.01, C('#2b2b2e', -0.6), 1); mb.box(-0.21, 0.03, 0.02, 0.21, 0.29, 0.025, C('#4cc9f0', 1)); mb.pop(); } else v2Typewriter(mb); mb.pop();
  mb.push().T(0.55, 0.77, 0.05, -0.2); for (let i = 0; i < 4; i++) mb.box(-0.16, i * 0.022, -0.11, 0.16, i * 0.022 + 0.02, 0.11, C(['#e9c46a', '#d9c39a', '#c9a46a', '#e63946'][i], 0)); mb.box(-0.16, 0.088, -0.02, 0.16, 0.092, 0.02, C('#a3262a', 0)); mb.pop();
  mb.push().T(0.05, 0, 0.72, Math.PI); CHAIRS.office.base(mb, {}); CHAIRS.office.pad(mb); mb.pop();
}
// mantar pano: kâğıtlar, fotoğraflar, iğneler ve kırmızı ipler (duvar yerel)
function v2Cork(mb, w, h, seed = 1) {
  mb.rbox(-w / 2, -h / 2, 0, w / 2, h / 2, 0.05, 0.02, C('#5a3a24', -0.3), 2);
  mb.box(-w / 2 + 0.06, -h / 2 + 0.06, 0.05, w / 2 - 0.06, h / 2 - 0.06, 0.055, C('#c49a6c', 0));
  const pins = [];
  for (let i = 0; i < 11; i++) {
    const x = (hs(i, seed) - 0.5) * (w - 0.5), y = (hs(i, seed + 1) - 0.5) * (h - 0.4), r = (hs(i, seed + 2) - 0.5) * 0.25, ph = i % 3 === 0;
    mb.push().T(x, y, 0.057, 0, 0, r);
    mb.box(-0.16, -0.12, 0, 0.16, 0.12, 0.004, C(ph ? '#f4f1ea' : ['#fff3a8', '#fbf6ec', '#ffd6d6'][i % 3], 0));
    if (ph) { mb.box(-0.13, -0.06, 0.004, 0.13, 0.1, 0.006, C(['#6b7f99', '#8a6a5a', '#5a7a6a'][i % 3], 0)); mb.sphereS(0, 0.03, 0.007, 0.04, 0.045, 0.002, C('#2b2b2b', 0), 8, 4); }
    else for (let j = 0; j < 3; j++) mb.box(-0.12, 0.05 - j * 0.05, 0.004, 0.06 + hs(j, i) * 0.06, 0.06 - j * 0.05, 0.006, C('#5c6670', 0));
    mb.pop();
    mb.sphereS(x, y + 0.1, 0.07, 0.018, 0.018, 0.018, C('#e63946', -0.4), 6, 4);
    pins.push([x, y + 0.1]);
  }
  for (const [a, b] of [[0, 3], [3, 6], [6, 1], [1, 9], [9, 4], [4, 7], [2, 5], [5, 8]]) limb(mb, [pins[a][0], pins[a][1], 0.075], [pins[b][0], pins[b][1], 0.075], [0.006, 0.006], C('#d62828', 0), 3, null, 1);
}
// parlayan ekran duvarı (duvar yerel): radar, grafik, harita
function v2Screens(mb, cols = 3, rows = 2, w = 0.8, h = 0.5) {
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = (i - (cols - 1) / 2) * (w + 0.06), y = (j - (rows - 1) / 2) * (h + 0.06);
    mb.rbox(x - w / 2, y - h / 2, 0, x + w / 2, y + h / 2, 0.08, 0.02, C('#14161b', -0.6), 2);
    const k = (i + j * cols) % 3, G = C('#0b2a3a', 1), L = C('#4cc9f0', 1), L2 = C('#5be3a9', 1), z = 0.082;
    mb.box(x - w / 2 + 0.04, y - h / 2 + 0.04, z, x + w / 2 - 0.04, y + h / 2 - 0.04, z + 0.002, G);
    if (k === 0) { for (let r = 1; r <= 3; r++) mb.torusN(x, y, z + 0.004, h * 0.13 * r, 0.004, 0.001, 24, 3, L, null); mb.push().T(x, y, z + 0.006, 0, 0, 0.7); mb.box(0, -0.004, 0, h * 0.4, 0.004, 0.002, L2); mb.pop(); mb.sphereS(x + h * 0.15, y + h * 0.1, z + 0.006, 0.018, 0.018, 0.002, C('#ff4d4d', 1), 6, 3); }
    else if (k === 1) { for (let q = 0; q < 6; q++) { const hh = (0.15 + hs(q, i + j) * 0.65) * (h - 0.12); mb.box(x - w / 2 + 0.08 + q * (w - 0.16) / 6, y - h / 2 + 0.06, z + 0.003, x - w / 2 + 0.08 + q * (w - 0.16) / 6 + (w - 0.16) / 9, y - h / 2 + 0.06 + hh, z + 0.005, q % 2 ? L : L2); } }
    else { for (let q = 0; q < 5; q++) mb.sphereS(x + (hs(q, j) - 0.5) * w * 0.7, y + (hs(q, i) - 0.5) * h * 0.6, z + 0.004, w * 0.09, h * 0.08, 0.002, C('#1f6f5a', 1), 8, 4); mb.sphereS(x + w * 0.12, y + h * 0.05, z + 0.006, 0.022, 0.022, 0.002, C('#ff4d4d', 1), 6, 3); }
  }
}
// balon salkımı: ağırlık + ipler + balonlar
function v2Balloons(mb, cols, n = 5, h = 1.9) {
  mb.cyl(0, 0, 0, 0.09, 0.12, 0.07, 10, C('#c9a34a', -0.85), C('#c9a34a', -0.85));
  for (let k = 0; k < n; k++) { const a = k * 2.4, r = 0.18 + (k % 2) * 0.16, x = Math.cos(a) * r, z = Math.sin(a) * r, y = h + (k % 3) * 0.28; limb(mb, [0, 0.12, 0], [x, y - 0.2, z], [0.004, 0.004], C('#f4f4f4', 0), 3, null, 1); mb.sphereS(x, y, z, 0.2, 0.25, 0.2, C(cols[k % cols.length], -0.75), 12, 9); mb.cyl(x, y - 0.26, z, 0.02, y - 0.22, 0.03, 6, C(cols[k % cols.length], -0.75), C(cols[k % cols.length], -0.75)); }
}
// pizza kutusu (açık), gazlı içecek kutuları
function v2Pizza(mb) {
  mb.box(-0.24, 0, -0.24, 0.24, 0.04, 0.24, C('#d9c39a', 0)); mb.cyl(0, 0.04, 0, 0.21, 0.05, 0.21, 18, C('#e9a23b', 0), C('#d14b2a', 0));
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3; mb.sphereS(Math.cos(a) * 0.12, 0.055, Math.sin(a) * 0.12, 0.035, 0.012, 0.035, C('#8a1f1a', 0), 6, 3); }
  mb.push().T(0, 0.04, -0.24, 0, -1.25); mb.box(-0.24, 0, 0, 0.24, 0.02, 0.48, C('#e2cfa8', 0)); mb.pop();
}
function v2Cans(mb, cols) { cols.forEach((c, i) => { const a = i * 2.1; mb.cyl(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09, 0.033, 0.12, 0.033, 10, C(c, -0.7), C('#c9ced6', -0.85)); }); }
// DJ masası: iki pikap, mikser, dizüstü, yanlarda ışıklı hoparlörler
function v2DJ(mb) {
  mb.rbox(-0.9, 0, -0.35, 0.9, 0.95, 0.35, 0.04, C('#1b1b22', -0.4), 2);
  mb.box(-0.88, 0.3, 0.351, 0.88, 0.5, 0.356, C('#ff4fd8', 1));
  for (const s of [-1, 1]) { mb.cyl(s * 0.5, 0.95, 0, 0.2, 0.98, 0.2, 20, C('#2b2b33', -0.6), C('#2b2b33', -0.6)); mb.cyl(s * 0.5, 0.98, 0, 0.17, 0.99, 0.17, 20, C('#101014', -0.4), C('#101014', -0.4)); mb.cyl(s * 0.5, 0.99, 0, 0.04, 1.0, 0.04, 10, C(s < 0 ? '#4cc9f0' : '#ffd23f', 1), C(s < 0 ? '#4cc9f0' : '#ffd23f', 1)); }
  mb.box(-0.15, 0.95, -0.15, 0.15, 1.0, 0.15, C('#2b2b33', -0.6)); for (let i = 0; i < 3; i++) mb.box(-0.1 + i * 0.08, 1.0, -0.05, -0.08 + i * 0.08, 1.02, 0.08, C('#e9e3d6', -0.3));
  mb.push().T(0, 0.95, -0.25, 0); mb.box(-0.2, 0, -0.08, 0.2, 0.015, 0.08, C('#c9ced6', -0.85)); mb.push().T(0, 0.015, -0.08, 0, -0.35); mb.box(-0.2, 0, -0.005, 0.2, 0.26, 0.005, C('#c9ced6', -0.85)); mb.box(-0.18, 0.02, 0.006, 0.18, 0.24, 0.008, C('#7b5cff', 1)); mb.pop(); mb.pop();
  for (const s of [-1, 1]) { mb.push().T(s * 1.32, 0, 0, s * 0.25); mb.rbox(-0.3, 0, -0.28, 0.3, 1.25, 0.28, 0.04, C('#16161c', -0.5), 2); for (const [y, r] of [[0.38, 0.2], [0.92, 0.12]]) { mb.push().T(0, y, 0.281, 0, Math.PI / 2); mb.torusN(0, 0, 0, r, 0.025, 0.015, 20, 4, C('#4cc9f0', 1)); mb.cyl(0, -0.01, 0, r - 0.02, 0.0, r - 0.02, 18, C('#25252e', -0.4), C('#25252e', -0.4)); mb.pop(); const p = mb.p(0, y, 0.4); VK.halo(p, 0.45, '#4cc9f0', 0.18); } mb.pop(); }
  VK.sh(mb, 0, 0, 1.6, 0.55, 0.4);
  const p = mb.p(0, 0, 0.6); VK.pool(p, 1.6, '#ff4fd8', 0.1);
}
// öğrenci sırası (iki kişilik) ve iki sandalye (tahtaya dönük = yerel -z)
function v2SchoolDesk(mb, seed = 1, o = {}) {
  const T = C('#d8b07c', -0.3), M = C(o.metal || '#2a6f97', -0.7);
  mb.rbox(-0.62, 0.7, -0.3, 0.62, 0.74, 0.3, 0.015, T, 1);
  mb.box(-0.6, 0.58, -0.28, 0.6, 0.6, 0.22, C('#8a9099', -0.7));
  for (const [x, z] of [[-0.56, -0.25], [0.56, -0.25], [-0.56, 0.25], [0.56, 0.25]]) mb.box(x - 0.02, 0, z - 0.02, x + 0.02, 0.7, z + 0.02, M);
  for (const s of [-1, 1]) { mb.push().T(s * 0.3, 0, 0.55, Math.PI); CHAIRS.school.base(mb, { metal: o.metal }); mb.rbox(-0.18, 0.43, -0.17, 0.18, 0.47, 0.17, 0.03, C(o.seat || ['#e63946', '#ffbe0b', '#3a86ff', '#06d6a0'][seed % 4], -0.2), 2); mb.pop(); }
  const B = ['#e63946', '#3a86ff', '#ffbe0b', '#06d6a0', '#9b5de5'];
  mb.box(-0.45, 0.74, -0.15, -0.15, 0.76, 0.06, C(B[seed % 5], 0)); mb.box(-0.44, 0.76, -0.14, -0.16, 0.775, 0.05, C(B[(seed + 2) % 5], 0));
  mb.push().T(0.3, 0.74, -0.05, 0.4); mb.box(-0.12, 0, -0.08, 0.12, 0.004, 0.08, C('#fbf6ec', 0)); for (let i = 0; i < 4; i++) mb.box(-0.1, 0.004, -0.06 + i * 0.035, 0.08, 0.006, -0.055 + i * 0.035, C('#8ab6d6', 0)); mb.pop();
  mb.push().T(0.12, 0.745, 0.0, 0, 0, Math.PI / 2); mb.cyl(0, -0.09, 0, 0.007, 0.09, 0.007, 6, C('#ffbe0b', 0), C('#2b2b2b', 0)); mb.pop();
  if (seed % 3 === 0) mb.sphereS(-0.05, 0.79, 0.12, 0.045, 0.042, 0.045, C('#e63946', -0.4), 10, 6);
  VK.sh(mb, 0, 0.1, 0.8, 0.7, 0.34);
}
// renkli dolap kutuları ve sırt çantaları (duvar dibi, yerel)
function v2Cubbies(mb, w = 3.2, h = 1.2, seed = 1) {
  const W = C('#f4efe6', -0.3), n = Math.round(w / 0.4), m = 3;
  mb.box(-w / 2, 0, -0.2, w / 2, h, 0.2, W);
  const K = ['#e63946', '#ffbe0b', '#3a86ff', '#06d6a0', '#9b5de5', '#f77f00'];
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const x0 = -w / 2 + 0.04 + (i * (w - 0.08)) / n, x1 = x0 + (w - 0.08) / n - 0.04, y0 = 0.06 + (j * (h - 0.1)) / m, y1 = y0 + (h - 0.1) / m - 0.04;
    mb.box(x0, y0, 0.12, x1, y1, 0.2, C('#3b2a1c', 0.0));
    const c = K[(i + j * 2 + seed) % K.length];
    if (hs(i, j + seed) < 0.6) mb.rbox(x0 + 0.03, y0, 0.0, x1 - 0.03, y1 - 0.05, 0.24, 0.04, C(c, -0.1), 2);
  }
  VK.sh(mb, 0, 0, w * 0.55, 0.35, 0.34);
}
// sokak lambası (yerel tabanda)
function v2StreetLamp(mb, h = 3.6, col = '#2f3338', o = {}) {
  const M2 = C(col, -0.7);
  mb.cyl(0, 0, 0, 0.14, 0.3, 0.1, 10, M2, M2); mb.cyl(0, 0.3, 0, 0.055, h - 0.3, 0.045, 10, M2, M2, '');
  for (let k = 0; k < 2; k++) mb.torusN(0, 0.6 + k * 0.06, 0, 0.06, 0.012, 0.012, 12, 3, M2);
  mb.cyl(0, h - 0.3, 0, 0.12, h - 0.25, 0.12, 10, M2, M2);
  mb.cyl(0, h - 0.25, 0, 0.12, h + 0.1, 0.16, 8, C(o.glass || '#ffe2a0', 1), C(o.glass || '#ffe2a0', 1), '');
  mb.cyl(0, h + 0.1, 0, 0.2, h + 0.2, 0.05, 8, M2, M2); mb.sphereS(0, h + 0.24, 0, 0.04, 0.04, 0.04, M2, 6, 4);
  const p = mb.p(0, h - 0.05, 0); VK.halo(p, 0.9, o.light || '#ffd38a', 0.34, 0, o.sec ?? -1); VK.pool([p[0], 0, p[2]], o.poolR || 2.4, o.light || '#ffd38a', o.poolA ?? 0.17);
  VK.sh(mb, 0, 0, 0.22, 0.22, 0.4);
}
// tente (duvar yerel): çizgili, öne eğik, saçaklı
function v2Awning(mb, w, y, d, a = '#e63946', b = '#ffffff', n = 10) {
  for (let i = 0; i < n; i++) { const x0 = -w / 2 + (w * i) / n, x1 = x0 + w / n, nn = vnorm([0, 1, 0.55]); mb.quadN([x0, y, 0], [x1, y, 0], [x1, y - 0.5, d], [x0, y - 0.5, d], nn, nn, nn, nn, C(i % 2 ? a : b, 0)); mb.box(x0, y - 0.72, d - 0.02, x1, y - 0.5, d, C(i % 2 ? a : b, 0)); for (const xx of [x0 + 0.02, x1 - 0.02]) mb.box(xx - 0.008, y - 0.78, d - 0.01, xx + 0.008, y - 0.72, d, C(i % 2 ? a : b, 0)); }
}
Object.assign(VENUES, {
  /* ---- Aramızdaki Casus: gizli ajans karargâhı ---- */
  acs: {
    room: 1, raw: 1, wallH: 5.2,
    table: 'felt', tableO: { felt: '#203a4f', wood: '#2b1a10' }, chair: 'office',
    rug: 'medal', rugO: { a: '#18283a', b: '#c9a34a', c: '#18283a', petals: 8 },
    L: VL2.spy, sky: ['#070a12', '#121a2a', '#0e131c'], sun: [-0.35, 0.88, 0.3], shR: 8.4, parts: 'dust',
    post: { bloom: 0.6, th: 0.76, sat: 1.02, con: 0.16, vig: 0.5, tint: [0.96, 1.0, 1.06] },
    det: 0.1, detS: 0.45,
    logos: [[1, 2.6, 1.8, 0.85, 0.85]],
    build(mb) {
      vApron(mb, '#2c3650', { lip: '#5a4430', fade: '#090b10', band: '#c9a34a', bandE: -0.8 });
      VK.planks(mb, -RW, -RW, RW, RW, 0.2, ['#3a2a1e', '#33251b', '#402e21', '#2e2118'], 'x', -0.3, 0, '#140d08');
      // masanın çevresinde pirinç kakmalı mühür dairesi ve pusula kolları
      mb.lathe(0, 0.004, 0, [[4.05, 0], [3.92, 0]], 96, C('#c9a34a', -0.85));
      mb.lathe(0, 0.0042, 0, [[3.92, 0], [3.7, 0]], 96, C('#18283a', -0.2));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, ca = Math.cos(a), sa = Math.sin(a), L = k % 2 ? 4.7 : 5.6, w = k % 2 ? 0.14 : 0.22; mb.quadN([ca * 4.05 - sa * w, 0.0045, sa * 4.05 + ca * w], [ca * L, 0.0045, sa * L], [ca * 4.05 + sa * w, 0.0045, sa * 4.05 - ca * w], [ca * 4.0, 0.0045, sa * 4.0], UPV, UPV, UPV, UPV, C('#c9a34a', -0.85)); }
      const WALL = { wall: '#2b3a4f', dado: '#2e2118', dadoH: 1.1, panel: '#3a2a1e', rail: '#c9a34a', base: '#140d08', crown: '#1b2433', pat: 'pin', pc: '#334560', ps: 0.32 };
      // 0: arka — dünya haritası, ekranlar, tabela
      vWall(0, WALL, []);
      vSign('screen', '#15171c', '#5fb8ff');
      { const s0 = SEC(0); wAt(s0, 0, -4.8, 0, 2.15);
        s0.rbox(-1.25, -0.8, 0, 1.25, 0.8, 0.06, 0.03, C('#c9a34a', -0.85), 2); s0.box(-1.17, -0.72, 0.06, 1.17, 0.72, 0.065, C('#1d3b55', 0.0));
        for (let i = 0; i < 9; i++) s0.sphereS(-0.85 + hs(i, 1) * 1.7, -0.45 + hs(i, 2) * 0.9, 0.067, 0.12 + hs(i, 3) * 0.2, 0.07 + hs(i, 4) * 0.14, 0.002, C('#3f6f5a', 0), 10, 5);
        for (let i = 0; i < 7; i++) { const x = -0.95 + hs(i, 7) * 1.9, y = -0.55 + hs(i, 8) * 1.1; s0.sphereS(x, y, 0.072, 0.025, 0.025, 0.004, C(i % 3 ? '#ff4d4d' : '#ffd23f', 1), 6, 3); VK.wglow(0, -4.8 + x, 0.09, 2.15 + y, 0.16, i % 3 ? '#ff4d4d' : '#ffd23f', 0.3); }
        s0.pop(); }
      { const s0 = SEC(0); wAt(s0, 0, 4.75, 0, 2.0); v2Screens(s0, 3, 2, 0.74, 0.48); s0.pop(); VK.wglow(0, 4.75, 0.12, 2.0, 1.5, '#4cc9f0', 0.14, 0.75); }
      wAt(mb, 0, 4.75, 0.45); P.counter(mb, 2.6, 0.82, 0.7, '#1b2433', '#2b2b30', { rail: false });
      for (let i = 0; i < 12; i++) mb.cyl(-1.1 + (i % 6) * 0.42, 0.82, -0.15 + Math.floor(i / 6) * 0.2, 0.018, 0.84, 0.018, 8, C(['#ff4d4d', '#5be3a9', '#ffd23f'][i % 3], 1), C(['#ff4d4d', '#5be3a9', '#ffd23f'][i % 3], 1));
      mb.pop();
      // 1: sağ — dosya dolapları, kasa kapısı
      vWall(1, WALL, []);
      for (const u of [-5.2, -4.55, -3.9, 3.9, 4.55, 5.2]) { wAt(mb, 1, u, 0.3); P.cabinet(mb, 0.6, 1.32, 0.55, '#59636e', { n: 1, drawers: 4, face: '#6b7680', top: '#3e464f', knob: '#c9ced6' }); mb.pop(); }
      { const s1 = SEC(1); wAt(s1, 1, 0, 0, 1.25); const St = C('#8a939c', -0.85), St2 = C('#5c656e', -0.85);
        s1.box(-1.35, -1.25, 0, 1.35, 1.35, 0.08, St2);
        s1.push().T(0, 0, 0.08, 0, Math.PI / 2); s1.cyl(0, 0, 0, 1.05, 0.16, 1.05, 32, St, St); s1.torusN(0, 0.16, 0, 0.92, 0.04, 0.03, 32, 5, St2); s1.cyl(0, 0.16, 0, 0.2, 0.3, 0.2, 18, St2, St2); s1.pop();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; s1.push().T(0, 0, 0.32, 0, 0, a); s1.box(-0.03, 0.2, -0.03, 0.03, 0.62, 0.03, St); s1.sphereS(0, 0.64, 0, 0.05, 0.05, 0.05, St2, 8, 5); s1.pop(); }
        for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; s1.sphereS(Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0.2, 0.04, 0.04, 0.03, St2, 6, 4); }
        s1.pop(); }
      { const s1 = SEC(1); wAt(s1, 1, 2.6, 0, 2.225); s1.rbox(-0.52, -0.52, 0, 0.52, 0.52, 0.05, 0.03, C('#c9a34a', -0.85), 2); s1.box(-0.46, -0.46, 0.05, 0.46, 0.46, 0.055, C('#1b2433', 0)); s1.pop(); for (const u of [-2.2]) { wAt(s1, 1, u, 0, 2.55); s1.rbox(-0.34, -0.22, 0, 0.34, 0.22, 0.04, 0.02, C('#a3262a', -0.2), 2); s1.box(-0.26, -0.05, 0.04, 0.26, 0.05, 0.044, C('#fbf6ec', 0)); s1.pop(); } }
      // 2: ön — buzlu camlı kapı, askılıkta trençkot ve fötr, bitkiler
      const HD2 = [{ u0: -0.6, u1: 0.6, y0: 0, y1: 2.35 }];
      vWall(2, WALL, HD2);
      vDoor(2, 0, { w: 1.2, h: 2.35, frame: '#2e2118', door: '#2e2118', glass: '#7f93a8', knob: '#c9a34a' });
      { const s2 = SEC(2); wAt(s2, 2, 0, 0, 1.9); s2.box(-0.3, -0.07, 0.0, 0.3, 0.07, 0.02, C('#c9a34a', -0.85)); s2.pop(); }
      wAt(mb, 2, 1.6, 0.45);
      mb.cyl(0, 0, 0, 0.22, 0.04, 0.2, 14, C('#2e2118', -0.4), C('#2e2118', -0.4)); mb.cyl(0, 0.04, 0, 0.025, 1.85, 0.022, 8, C('#2e2118', -0.4), C('#2e2118', -0.4));
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; limb(mb, [0, 1.72, 0], [Math.cos(a) * 0.2, 1.84, Math.sin(a) * 0.2], [0.012, 0.012], C('#2e2118', -0.4), 4); }
      mb.push().T(0.05, 0.62, 0.08); mb.frustum(-0.2, 0.2, -0.1, 0.1, 0, -0.16, 0.16, -0.08, 0.08, 1.15, C('#c9a46a', 0)); mb.box(-0.21, 0.95, -0.11, 0.21, 1.0, 0.11, C('#a8844e', 0)); mb.pop();
      mb.push().T(0, 1.9, 0); mb.cyl(0, 0, 0, 0.19, 0.02, 0.19, 16, C('#3b3b40', -0.3), C('#3b3b40', -0.3)); mb.cyl(0, 0.02, 0, 0.11, 0.15, 0.1, 14, C('#3b3b40', -0.3), C('#3b3b40', -0.3)); mb.cyl(0, 0.02, 0, 0.112, 0.05, 0.112, 14, C('#1b1b1e', 0), C('#1b1b1e', 0)); mb.pop();
      VK.sh(mb, 0, 0, 0.28, 0.28, 0.35); mb.pop();
      for (const u of [-1.6, -3.2]) { wAt(mb, 2, u, 0.4); P.snake(mb, 1.1, '#1b2433'); mb.pop(); }
      // 3: sol — delil panosu, kitaplık
      vWall(3, WALL, []);
      { const s3 = SEC(3); wAt(s3, 3, 0.4, 0, 2.05); v2Cork(s3, 2.8, 1.5, 4); s3.pop(); VK.wglow(3, 0.4, 0.1, 2.05, 1.6, '#ffe2a0', 0.1, 0.9); }
      for (const u of [-3.6, 4.4]) VK.inSec(3, (s) => { wAt(s, 3, u, 0.22); P.bookcase(s, 1.3, 2.2, '#2e2118', Math.round(u * 3) + 9, { deco: '#c9a34a' }); s.pop(); });
      wAt(mb, 3, 0.4, 0.9, 0, 0); P.coffeeTable(mb, 1.4, 0.6, 0.72, '#2e2118', '#1b120c', { books: false });
      for (let i = 0; i < 5; i++) mb.box(-0.6 + i * 0.26, 0.72, -0.18 + (i % 2) * 0.1, -0.42 + i * 0.26, 0.725, 0.05 + (i % 2) * 0.1, C(['#f4f1ea', '#fff3a8', '#e9c46a'][i % 3], 0));
      mb.pop();
      // salon: çalışma masaları, küre, misyon masası
      mb.push().T(-4.2, 0, -4.3, 0.55); v2OfficeDesk(mb, {}); mb.pop();
      mb.push().T(4.6, 0, 3.8, -2.4); v2OfficeDesk(mb, { pc: 1 }); mb.pop();
      mb.push().T(4.4, 0, -4.4, 0.3, 0, 0, 0.95); DECOR.globe(mb, ['#ffffff'], 0); mb.pop(); VK.blob(4.4, -4.4, 0.45, 0.45, 0.4);
      mb.push().T(-5.4, 0, 0.6, Math.PI / 2 + 0.2); v2OfficeDesk(mb, { pc: 1 }); mb.pop();
      mb.push().T(1.2, 0, -5.6, 0.05); v2OfficeDesk(mb, {}); mb.pop();
      // tekerlekli pano: fotoğraflar ve haritalar
      mb.push().T(5.4, 0, 0.4, -Math.PI / 2 - 0.25);
      const PF = C('#c9ced6', -0.85);
      for (const x of [-0.75, 0.75]) { mb.box(x - 0.025, 0.1, -0.025, x + 0.025, 1.9, 0.025, PF); mb.box(x - 0.25, 0.08, -0.03, x + 0.25, 0.12, 0.03, PF); for (const z of [-0.22, 0.22]) mb.sphereS(x + z, 0.05, 0, 0.045, 0.045, 0.045, C('#2b2b2b', -0.4), 6, 4); }
      mb.box(-0.72, 0.7, -0.02, 0.72, 1.75, 0.02, C('#f4f6fb', -0.2));
      for (let i = 0; i < 6; i++) { mb.push().T(-0.45 + (i % 3) * 0.45, 1.45 - Math.floor(i / 3) * 0.42, 0.025, 0, 0, (hs(i, 3) - 0.5) * 0.2); mb.box(-0.16, -0.12, 0, 0.16, 0.12, 0.004, C(['#f4f1ea', '#fff3a8'][i % 2], 0)); mb.box(-0.12, -0.06, 0.004, 0.12, 0.09, 0.006, C(['#6b7f99', '#8a6a5a', '#5a7a6a'][i % 3], 0)); mb.pop(); }
      limb(mb, [-0.45, 1.5, 0.03], [0.45, 1.08, 0.03], [0.005, 0.005], C('#d62828', 0), 3, null, 1); limb(mb, [0.0, 1.5, 0.03], [0.0, 1.08, 0.03], [0.005, 0.005], C('#d62828', 0), 3, null, 1);
      VK.sh(mb, 0, 0, 0.85, 0.3, 0.34); mb.pop();
      for (const [x, z, ry] of [[6.3, -2.4, 0.2], [6.5, 2.6, -0.3]]) { mb.push().T(x, 0, z, ry); for (let i = 0; i < 3; i++) { mb.push().T((i % 2) * 0.1, i * 0.32, 0, i * 0.15); P.crate(mb, 0.5, '#c9b28a', { hk: 0.62 }); mb.pop(); } mb.pop(); }
      mb.push().T(-4.4, 0, 4.2, 0.4);
      mb.cyl(0, 0.04, 0, 0.12, 0.85, 0.12, 12, C('#2e2118', -0.3), C('#2e2118', -0.3)); mb.cyl(0, 0, 0, 0.42, 0.05, 0.38, 16, C('#2e2118', -0.3), C('#2e2118', -0.3));
      mb.rbox(-0.75, 0.85, -0.5, 0.75, 0.9, 0.5, 0.02, C('#2e2118', -0.4), 1); mb.box(-0.68, 0.9, -0.43, 0.68, 0.905, 0.43, C('#d9c99f', 0));
      for (let i = 0; i < 5; i++) mb.sphereS(-0.5 + hs(i, 5) * 1.0, 0.906, -0.3 + hs(i, 6) * 0.6, 0.12, 0.002, 0.08, C('#9cb380', 0), 8, 3);
      for (let i = 0; i < 4; i++) { const x = -0.45 + i * 0.3, z = -0.2 + (i % 2) * 0.3; mb.cyl(x, 0.905, z, 0.025, 0.95, 0.0, 8, C(['#e63946', '#3a86ff', '#ffd23f', '#06d6a0'][i], -0.3), C('#000000', 0)); }
      mb.push().T(0.45, 0.905, 0.25); mb.cyl(0, 0, 0, 0.06, 0.012, 0.06, 12, C('#c9a34a', -0.85), C('#c9a34a', -0.85)); mb.push().T(0, 0.04, 0, 0, Math.PI / 2 - 0.3); mb.torusN(0, 0, 0, 0.045, 0.012, 0.012, 12, 3, C('#c9a34a', -0.85)); mb.cyl(0, -0.006, 0, 0.04, 0.006, 0.04, 12, C('#cde7f0', -0.95), C('#cde7f0', -0.95)); mb.pop(); mb.pop();
      VK.sh(mb, 0, 0, 0.85, 0.6, 0.38); mb.pop();
      VK.pool([0, 0, 0], 3.6, '#bcd6ff', 0.06);
      for (const [x, z, s, kind, pot] of [[-6.9, -6.9, 1.1, 'ficus', '#1b2433'], [6.9, 6.9, 1.0, 'fern', '#1b2433'], [-6.9, 6.9, 1.15, 'monstera', '#2e2118']]) { mb.push().T(x, 0, z, hs(x, z) * 3); P[kind](mb, s, pot); mb.pop(); }
      VK.tall(6.6, -6.6, (m) => P.floorLamp(m, '#f6e3bd', '#1b1b1e'));
    },
  },
  /* ---- Doğruluk mu Cesaret mi: ev partisi (salon) ---- */
  dcs: {
    room: 1, raw: 1, wallH: 5.2,
    table: 'glass', tableO: { glow: '#ff4fd8', top: '#1a1626' }, chair: 'bean',
    rug: 'shag', rugO: { a: '#3b1f5e', b: '#ff7ad9' },
    L: VL2.party, sky: ['#0d0716', '#1e1030', '#140b20'], sun: [0.3, 0.9, 0.3], shR: 8.4, parts: 'confetti',
    post: { bloom: 0.75, th: 0.72, sat: 1.12, con: 0.12, vig: 0.45, tint: [1.02, 0.97, 1.06] },
    det: 0.1, detS: 0.45,
    anim: [{ key: 'disco', x: -3.6, y: 3.3, z: -3.6, ax: 'y', sp: 0.9 }],
    logos: [[3, -2.2, 1.8, 0.85, 0.85]],
    build(mb) {
      vApron(mb, '#40275f', { lip: '#8a5a44', fade: '#0a0812', band: '#ff4fd8', bandE: 0.85, bandH: 0.05 });
      vFloorWood(mb, ['#6e4a34', '#674530', '#76503a', '#60402c'], { w: 0.22, e: -0.25, gap: '#24160d' });
      VK.ledFloor(mb, 2.2, 2.6, 6.4, 6.6, 0.8, ['#ff4fd8', '#4cc9f0', '#ffd23f', '#8a5cf6', '#5be3a9'], '#241a36', 0.42, 0.004);
      VK.glow(4.3, 0.02, 4.6, 2.6, '#c77dff', 0.09, 'h', 0, 0, 2.4);
      const WALL = { wall: '#2b1d3d', dado: '#1f1530', dadoH: 0.9, rail: '#ff4fd8', base: '#120b1c', crown: '#1f1530', pat: 'stripe', pc: '#30214a', ps: 0.42 };
      // 0: arka — tabela (neon), TV duvarı, plak rafı, ip ışıklar
      vWall(0, WALL, []);
      vSign('neon', '#14101f', '#ff4fd8');
      { const s0 = SEC(0); wAt(s0, 0, -4.7, 0, 1.75); s0.rbox(-1.1, -0.64, 0, 1.1, 0.64, 0.07, 0.03, C('#101014', -0.6), 2); s0.box(-1.04, -0.58, 0.07, 1.04, 0.58, 0.072, C('#3b2a6e', 1)); for (let i = 0; i < 5; i++) s0.sphereS(-0.6 + i * 0.3, -0.1 + Math.sin(i) * 0.2, 0.074, 0.12, 0.12, 0.002, C(['#ff4fd8', '#4cc9f0', '#ffd23f', '#5be3a9', '#ff9e00'][i], 1), 10, 4); s0.pop(); VK.wglow(0, -4.7, 0.12, 1.75, 1.4, '#7b5cff', 0.16, 0.9); }
      wAt(mb, 0, -4.7, 0.3); P.cabinet(mb, 2.4, 0.55, 0.45, '#1b1b22', { n: 4, face: '#24242e', top: '#101014', knob: '#c9ced6' }); mb.pop();
      { const s0 = SEC(0); wAt(s0, 0, 4.6, 0, 1.2); for (let r = 0; r < 3; r++) { s0.box(-1.0, r * 0.42 - 0.02, 0, 1.0, r * 0.42, 0.3, C('#3b2a1c', -0.2)); for (let i = 0; i < 18; i++) s0.box(-0.95 + i * 0.105, r * 0.42, 0.04, -0.95 + i * 0.105 + 0.02, r * 0.42 + 0.32, 0.28, C(['#e63946', '#1d3557', '#ffd23f', '#2a9d8f', '#f4a261', '#9b5de5'][(i + r * 2) % 6], 0)); } s0.pop(); }
      P.stringLights(SEC(0), [[-7.7, 3.4, -7.65], [-2.2, 3.3, -7.65], [2.2, 3.3, -7.65], [7.7, 3.4, -7.65]], ['#ff4fd8', '#ffd23f', '#4cc9f0', '#5be3a9'], 8, 0.3, 0.05, 0);
      // 1: sağ — perdeli pencereler (gece şehir), DJ masası önünde
      const HW1 = [{ u0: -4.6, u1: -2.4, y0: 1.1, y1: 2.85 }, { u0: 2.4, u1: 4.6, y0: 1.1, y1: 2.85 }];
      vWall(1, WALL, HW1);
      for (const h of HW1) vWindow(1, h, { frame: '#1f1530', view: 'night', curtain: '#7b2d8b', rod: '#c9ced6', sun: false });
      wAt(mb, 1, 0, 1.0); v2DJ(mb); mb.pop();
      { const s1 = SEC(1); wAt(s1, 1, 0, 0, 2.55); s1.rbox(-1.15, -0.3, 0, 1.15, 0.3, 0.06, 0.04, C('#101014', -0.6), 2); for (let i = 0; i < 9; i++) s1.box(-1.0 + i * 0.235, -0.15, 0.06, -1.0 + i * 0.235 + 0.12, 0.15, 0.064, C(['#ff4fd8', '#4cc9f0', '#ffd23f'][i % 3], 1)); s1.pop(); VK.wglow(1, 0, 0.1, 2.55, 1.5, '#ff4fd8', 0.16, 0.55); }
      // 2: ön — kapı, poster çerçeveleri, balonlar
      const HD2 = [{ u0: -0.6, u1: 0.6, y0: 0, y1: 2.3 }];
      vWall(2, WALL, HD2);
      vDoor(2, 0, { w: 1.2, h: 2.3, frame: '#1f1530', door: '#3b2a6e', knob: '#c9ced6' });
      { const s2 = SEC(2); for (const [u, art, sd] of [[-2.6, 'poster', 2], [2.6, 'abstract', 5]]) { wAt(s2, 2, u, 0, 2.0); P.frame(s2, 0.9, 1.2, art, '#ff4fd8', sd, { fe: 0.95, mat: 0 }); s2.pop(); VK.wglow(2, u, 0.08, 2.0, 0.8, '#ff4fd8', 0.12, 0.9); } }
      for (const u of [-4.6, 4.6]) VK.inSec(2, (s) => { wAt(s, 2, u, 0.6); v2Balloons(s, ['#ff4fd8', '#4cc9f0', '#ffd23f', '#ffffff', '#8a5cf6'], 7, 1.8); s.pop(); });
      // 3: sol — kanepe köşesi, sehpa, ayaklı lamba
      vWall(3, WALL, []);
      { const s3 = SEC(3); for (const [u, art, sd] of [[1.6, 'abstract', 3], [4.6, 'poster', 4]]) { wAt(s3, 3, u, 0, 2.15); P.frame(s3, 1.1, 0.8, art, '#1b1b22', sd, { mat: 0.04 }); s3.pop(); } wAt(s3, 3, -2.2, 0, 2.225); s3.rbox(-0.55, -0.55, 0, 0.55, 0.55, 0.05, 0.03, C('#ff4fd8', 0.95), 2); s3.box(-0.48, -0.48, 0.05, 0.48, 0.48, 0.055, C('#14101f', 0)); s3.pop(); VK.wglow(3, -2.2, 0.08, 2.225, 0.8, '#ff4fd8', 0.14, 0.8); }
      wAt(mb, 3, 1.6, 0.6); P.sofa(mb, 2.6, '#5a3d8a', { pillow: '#ffd23f', throw: '#4cc9f0', leg: '#1b1b22' }); mb.pop();
      wAt(mb, 3, 1.6, 1.75); P.coffeeTable(mb, 1.3, 0.65, 0.4, '#1b1b22', '#101014', { books: false });
      mb.push().T(-0.25, 0.4, 0, 0.3, 0, 0, 0.9); v2Pizza(mb); mb.pop(); mb.push().T(0.38, 0.4, 0.05); v2Cans(mb, ['#e63946', '#3a86ff', '#ffd23f']); mb.pop();
      mb.pop();
      VK.inSec(3, (s) => { wAt(s, 3, 3.6, 0.5); P.floorLamp(s, '#ff9fe0', '#1b1b22', { light: '#ff8ad8' }); s.pop(); });
      wAt(mb, 3, -1.3, 0.55); P.armchair(mb, '#2a9d8f', { pillow: '#ff4fd8', leg: '#1b1b22' }); mb.pop();
      // salon: puflar, atıştırmalık masası, bitki, balonlar
      for (const [x, z, c, ry] of [[-4.4, 3.8, '#ffd23f', 2.4], [-3.3, 4.9, '#4cc9f0', 2.9], [3.9, -4.6, '#ff4fd8', -0.6], [4.9, -3.5, '#5be3a9', -1.1]]) { mb.push().T(x, 0, z, ry); P.beanbag(mb, c); mb.pop(); }
      mb.push().T(-1.2, 0, -5.4, 0.08);
      P.coffeeTable(mb, 1.8, 0.7, 0.78, '#f4efe6', '#c9ced6', { books: false });
      for (let i = 0; i < 3; i++) { const x = -0.6 + i * 0.6; mb.lathe(x, 0.78, 0, [[0.06, 0], [0.16, 0.06], [0.17, 0.08]], 14, C(['#e63946', '#ffd23f', '#3a86ff'][i], -0.5)); for (let j = 0; j < 6; j++) mb.sphereS(x + (hs(j, i) - 0.5) * 0.18, 0.86, (hs(j, i + 3) - 0.5) * 0.14, 0.04, 0.012, 0.035, C(['#f4c95d', '#e9a23b', '#ffe8a3'][j % 3], 0), 6, 3); }
      for (let i = 0; i < 8; i++) mb.cyl(-0.78 + (i % 4) * 0.08, 0.78, 0.22 + Math.floor(i / 4) * 0.08, 0.035, 0.9, 0.04, 10, C(['#ff4fd8', '#4cc9f0'][i % 2], -0.5), C('#ffffff', 0));
      mb.push().T(0.7, 0.78, 0.15); mb.cyl(0, 0, 0, 0.2, 0.02, 0.2, 16, C('#c9ced6', -0.85), C('#c9ced6', -0.85)); mb.cyl(0, 0.02, 0, 0.16, 0.2, 0.16, 16, C('#ff9fe0', 0), C('#ffffff', 0)); for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; mb.push().T(Math.cos(a) * 0.09, 0.2, Math.sin(a) * 0.09); P.candle(mb, 0.07, ['#ffd23f', '#4cc9f0', '#5be3a9', '#ff4fd8', '#ffffff'][k], { r: 0.18, a: 0.25 }); mb.pop(); } mb.pop();
      mb.pop();
      VK.tall(-6.8, -6.8, (m) => P.monstera(m, 1.25, '#1b1b22'));
      VK.tall(6.9, -6.9, (m) => P.snake(m, 1.15, '#ff4fd8'));
      VK.pool([-3.6, 0, -3.6], 2.2, '#7b5cff', 0.08);
    },
  },
  /* ---- Kim Yapar: aydınlık sınıf ---- */
  kyp: {
    room: 1, raw: 1, wallH: 5.2, board: 'chalk',
    table: 'wood', tableO: { wood: '#d9b583' }, chair: 'school',
    rug: 'grid', rugO: { b: '#4f7fb0', k: ['#a8d1f0', '#f9e3a1', '#f6c1b8', '#b8e3c9', '#d9ccf2', '#fbd8ad'] },
    L: VL2.school, sky: ['#8fd3ff', '#dff3ff', '#cfe6f2'], sun: [-0.55, 0.78, 0.25], shR: 8.4, parts: 'dust',
    post: { bloom: 0.3, th: 0.88, sat: 1.1, con: 0.15, vig: 0.3, tint: [1.02, 1.0, 0.97] },
    det: 0.1, detS: 0.5,
    logos: [[1, 2.8, 2.25, 0.8, 0.8]],
    logoFrame: '#3a86ff',
    build(mb) {
      VK.quad(mb, -40, -40, 40, 40, C('#6e8a5a', 0), -0.006);
      vFloorWood(mb, ['#b98a58', '#b0814f', '#c29262', '#a87a4a', '#b5865a'], { w: 0.17, e: -0.3, gap: '#6a4a2c', border: '#6fa391', bw: 0.6 });
      const WALL = { wall: '#f6ebcf', dado: '#8fc9a9', dadoH: 1.1, rail: '#5e9f86', base: '#4f8a72', crown: '#ffffff', pat: 'stripe', pc: '#f1e3c0', ps: 0.5 };
      // 0: arka — yeşil kara tahta (tabela), iki mantar pano, alfabe bayrakları, saat
      vWall(0, WALL, []);
      vSign('chalk', '#8a5a34');
      { const s0 = SEC(0); for (const u of [-4.4, 4.4]) { wAt(s0, 0, u, 0, 2.0); s0.rbox(-1.0, -0.7, 0, 1.0, 0.7, 0.05, 0.02, C('#8a5a34', -0.3), 2); s0.box(-0.92, -0.62, 0.05, 0.92, 0.62, 0.055, C('#d9a96a', 0)); for (let i = 0; i < 6; i++) { const x = -0.6 + (i % 3) * 0.6, y = 0.25 - Math.floor(i / 3) * 0.55; s0.push().T(x, y, 0.057, 0, 0, (hs(i, u) - 0.5) * 0.3); s0.box(-0.22, -0.18, 0, 0.22, 0.18, 0.004, C(['#ffffff', '#fff3a8', '#cde7f0'][i % 3], 0)); s0.sphereS(-0.05, 0.02, 0.006, 0.08, 0.08, 0.002, C(['#ffbe0b', '#e63946', '#3a86ff', '#06d6a0'][(i + 1) % 4], 0), 8, 4); s0.box(-0.16, -0.12, 0.006, 0.12, -0.1, 0.008, C('#06d6a0', 0)); s0.pop(); } s0.pop(); } }
      VK.flags(SEC(0), [-7.7, 3.55, -7.7], [7.7, 3.55, -7.7], 26, 0.25, ['#e63946', '#ffbe0b', '#3a86ff', '#06d6a0', '#9b5de5']);
      { const s0 = SEC(0); wAt(s0, 0, 0, 0, 3.55); P.clock(s0, 0.3); s0.pop(); }
      // 1: sağ — renkli dolap kutuları, dünya haritası
      vWall(1, WALL, []);
      wAt(mb, 1, 0, 0.22); v2Cubbies(mb, 4.4, 1.2, 2); mb.pop();
      { const s1 = SEC(1); wAt(s1, 1, -4.2, 0, 2.1); P.frame(s1, 1.6, 1.0, 'map', '#3a86ff', 2, { mat: 0 }); s1.pop(); wAt(s1, 1, 0, 0, 2.15); P.frame(s1, 1.3, 0.9, 'abstract', '#ffbe0b', 2, { mat: 0 }); s1.pop(); }
      for (const u of [-4.6, 4.6]) { wAt(mb, 1, u, 0.3); P.flowers(mb, 1.2, '#e63946', ['#ffbe0b', '#ffffff', '#ff6f91']); mb.pop(); }
      // 2: ön — kapı, askıda sırt çantaları, kitaplık, öğretmen masası
      const HD2 = [{ u0: 2.4, u1: 3.6, y0: 0, y1: 2.3 }];
      vWall(2, WALL, HD2);
      vDoor(2, 3.0, { w: 1.2, h: 2.3, frame: '#4f8a72', door: '#f4a261', glass: '#bfe3f5', knob: '#c9ced6' });
      { const s2 = SEC(2); wAt(s2, 2, -1.2, 0, 1.55); s2.box(-1.6, -0.06, 0, 1.6, 0.06, 0.04, C('#8a5a34', -0.3)); for (let i = 0; i < 7; i++) { const x = -1.4 + i * 0.47; s2.box(x - 0.015, -0.03, 0.04, x + 0.015, 0.03, 0.1, C('#c9ced6', -0.85)); s2.push().T(x, -0.02, 0.1, 0, 0.15); s2.rbox(-0.17, -0.45, -0.08, 0.17, 0, 0.1, 0.06, C(['#e63946', '#3a86ff', '#ffbe0b', '#06d6a0', '#9b5de5', '#f77f00', '#ff6f91'][i], -0.1), 2); s2.rbox(-0.11, -0.4, 0.1, 0.11, -0.2, 0.14, 0.04, C(['#ffbe0b', '#e63946', '#3a86ff', '#ffffff'][i % 4], -0.1), 2); s2.pop(); } s2.pop(); }
      VK.inSec(2, (s) => { wAt(s, 2, -4.8, 0.22); P.bookcase(s, 1.6, 1.5, '#d9b583', 21, { rows: 3 }); s.pop(); });
      wAt(mb, 2, -0.6, 1.4, 0, 0); P.desk(mb, 1.7, 0.8, '#a77a4f', '#8a5a34'); mb.push().T(0.5, 0.77, 0.05, 0, 0, 0, 0.3); DECOR.globe(mb, ['#ffffff'], 0); mb.pop(); mb.push().T(-0.4, 0.77, 0.0, 0.4); mb.box(-0.15, 0, -0.1, 0.15, 0.06, 0.1, C('#e63946', 0)); mb.sphereS(0.25, 0.04, 0.1, 0.05, 0.048, 0.05, C('#e63946', -0.4), 10, 6); mb.cyl(0.25, 0.088, 0.1, 0.006, 0.11, 0.006, 4, C('#5a3a24', 0), C('#5a3a24', 0)); mb.pop(); mb.pop();
      wAt(mb, 2, -0.6, 2.1, 0, Math.PI); CHAIRS.office.base(mb, {}); mb.cyl(0, 0.43, 0, 0.22, 0.49, 0.22, 16, C('#3a86ff', -0.2), C('#3a86ff', -0.2)); mb.pop();
      // 3: sol — üç büyük pencere (bahçe), altında saksı rafı
      const HW3 = [{ u0: -5.2, u1: -3.0, y0: 1.2, y1: 3.0 }, { u0: -1.1, u1: 1.1, y0: 1.2, y1: 3.0 }, { u0: 3.0, u1: 5.2, y0: 1.2, y1: 3.0 }];
      vWall(3, WALL, HW3);
      for (const h of HW3) vWindow(3, h, { frame: '#ffffff', view: 'garden', sunA: 0.16, sunHex: '#fff3c9' });
      wAt(mb, 3, 0, 0.28); P.cabinet(mb, 11.2, 0.95, 0.5, '#f4efe6', { n: 14, face: '#ffffff', top: '#d9b583', knob: '#3a86ff' }); mb.pop();
      for (let i = 0; i < 8; i++) { const u = -5.0 + i * 1.42; wAt(mb, 3, u, 0.3, 0.95); P.flowers(mb, 0.55, ['#e63946', '#ffbe0b', '#3a86ff', '#06d6a0'][i % 4], ['#ffffff', '#ffd166', '#ff6f91']); mb.pop(); }
      // salon: tahtaya dönük öğrenci sıraları, okuma köşesi, çöp kutuları
      let sd = 0;
      for (const [x, z] of [[-4.6, -3.4], [4.6, -3.4], [-5.2, 0.6], [5.0, 0.4], [-4.4, 4.4], [4.4, 4.6]]) { mb.push().T(x, 0, z); v2SchoolDesk(mb, sd++); mb.pop(); }
      mb.push().T(-0.2, 0, -5.3); RUG2.kilim(mb, 1.5, 0.9, { k: ['#3a86ff', '#ffbe0b', '#06d6a0', '#f4efe6', '#e63946'], bands: 7 }); mb.pop();
      for (const [x, z, c, ry] of [[-1.3, -5.2, '#e63946', 0.5], [0.9, -5.4, '#3a86ff', -0.4]]) { mb.push().T(x, 0, z, ry, 0, 0, 0.85); P.beanbag(mb, c); mb.pop(); }
      mb.push().T(-0.2, 0, -5.4); P.basket(mb, 0.25, 0.3, '#c9a46a'); mb.push().T(0, 0.3, 0); P.books(mb, -0.18, 0.18, 0, 0.3, 7); mb.pop(); mb.pop();
      for (const [x, z, c] of [[6.8, -6.8, '#3a86ff'], [-6.9, 6.0, '#06d6a0']]) { mb.push().T(x, 0, z); mb.lathe(0, 0, 0, [[0.2, 0], [0.24, 0.55], [0.25, 0.56]], 16, C(c, -0.3), 'b'); mb.cyl(0, 0.5, 0, 0.22, 0.52, 0.22, 14, C('#2b2b2b', 0), C('#2b2b2b', 0)); VK.sh(mb, 0, 0, 0.3, 0.3, 0.38); mb.pop(); }
      VK.tall(-6.8, -6.8, (m) => P.ficus(m, 1.15, '#f4a261'));
      VK.tall(6.9, 6.9, (m) => P.monstera(m, 1.1, '#ffffff'));
    },
  },
  /* ---- Tostuna Dövüş: akşamüstü sokak büfesi ---- */
  tdv: {
    room: 1, raw: 1, wallH: 5.2, secShadow: 1,
    table: 'metal', tableO: { top: '#f4efe2', trim: '#e63946', deco: 'diner' }, chair: 'stool', chairO: { leg: '#c9ced6' },
    rug: null,
    L: VL2.dusk, sky: ['#3b2a5a', '#f08a5d', '#3a2c3a'], sun: [0.45, 0.76, 0.36], shR: 8.6, parts: 'dust',
    post: { bloom: 0.62, th: 0.76, sat: 1.12, con: 0.1, vig: 0.36, tint: [1.04, 0.98, 0.96] },
    det: 0.16, detS: 0.6,
    logos: [[3, 3.6, 1.7, 0.85, 0.85]],
    build(mb) {
      // zemin: arnavut kaldırımı meydan, kenarda kaldırım, ön tarafta asfalt yol ve yaya geçidi
      VK.quad(mb, -40, -40, 40, 40, C('#2f3238', 0), -0.006);
      VK.quad(mb, -RW, -RW, RW, RW, C('#5a544e', 0), 0);
      for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const x = -RW + i * 0.39, z = -RW + j * 0.39 + (i % 2) * 0.19; if (z + 0.37 > 6.1) continue; const c = ['#8f877c', '#857d73', '#9a9186', '#7e776e', '#a39a8e'][Math.floor(hs(i, j) * 5)]; VK.quad(mb, x + 0.025, z + 0.025, x + 0.365, z + 0.365, C(c, -0.12), 0.003); }
      for (const [a, b, c, d] of [[-RW, -RW, RW, -RW + 0.5], [-RW, -RW, -RW + 0.5, RW], [RW - 0.5, -RW, RW, RW]]) mb.box(a, 0, b, c, 0.06, d, C('#b8b2a8', -0.2));
      VK.quad(mb, -RW, 6.3, RW, RW, C('#3a3d44', -0.1), 0.04);
      mb.box(-RW, 0, 6.1, RW, 0.09, 6.3, C('#c9c4ba', -0.2));
      for (let k = 0; k < 7; k++) VK.quad(mb, -3.2 + k * 0.95, 6.5, -2.65 + k * 0.95, RW, C('#f2f2f2', 0), 0.045);
      // 0: büfe cephesi — servis penceresi (sol), tabela (orta), menü panoları, tente, neon tost
      const H0 = [{ u0: -6.2, u1: -2.6, y0: 0.95, y1: 2.45 }];
      vWall(0, { wall: '#f2e2c4', dado: '#c0392b', dadoH: 0.95, base: '#7a1f1a', crown: '#c0392b', pat: 'tile', pc: ['#fbf3df', '#f4e6c8'], ps: 0.3 }, H0);
      { const s0 = SEC(0); wAt(s0, 0, -4.4, 0, 0);
        s0.box(-1.8, 0.0, -1.6, 1.8, 0.95, -1.58, C('#3a2a22', 0)); s0.box(-1.8, 0.95, -1.62, 1.8, 2.45, -1.6, C('#f4e6c8', 0.4));
        s0.box(-1.9, 0.95, -0.35, 1.9, 1.0, 0.32, C('#c9ced6', -0.85));
        for (const [x, c] of [[-1.1, '#c9ced6'], [-0.2, '#c9ced6'], [0.75, '#c9ced6']]) { s0.rbox(x - 0.34, 1.0, -0.9, x + 0.34, 1.14, -0.5, 0.02, C('#2b2b2e', -0.7), 2); s0.push().T(x, 1.14, -0.9, 0, -0.35); s0.rbox(-0.34, 0, -0.01, 0.34, 0.12, 0.4, 0.02, C(c, -0.85), 2); s0.pop(); s0.box(x - 0.3, 1.1, -0.55, x + 0.3, 1.12, -0.52, C('#ff8a3d', 1)); }
        s0.box(-1.7, 1.75, -1.55, 1.7, 1.78, -1.2, C('#c9ced6', -0.8)); for (let i = 0; i < 10; i++) s0.lathe(-1.5 + i * 0.32, 1.78, -1.38, [[0.05, 0], [0.05, 0.18], [0.02, 0.24]], 8, C(['#e63946', '#ffbe0b', '#3a86ff', '#06d6a0', '#f4f1ea'][i % 5], -0.6));
        s0.pop(); VK.wglow(0, -4.4, 0.05, 1.7, 2.0, '#ffd59e', 0.18, 0.8); }
      vSign('frame', '#c0392b', '#fff8ec', { lampC: '#2b2b2b' });
      { const s0 = SEC(0); wAt(s0, 0, -4.4, 0, 3.05); v2Awning(s0, 4.6, 0.0, 0.95, '#c0392b', '#fff4e0', 12); s0.pop(); wAt(s0, 0, 0, 0, 3.6); v2Awning(s0, 4.4, 0.0, 0.6, '#ffbe0b', '#fff4e0', 11); s0.pop(); }
      { const s0 = SEC(0); wAt(s0, 0, 4.4, 0, 1.95); for (let i = 0; i < 2; i++) { s0.rbox(-1.5 + i * 1.6, -0.55, 0, -0.1 + i * 1.6, 0.55, 0.06, 0.03, C('#1b1b1e', -0.5), 2); s0.box(-1.42 + i * 1.6, -0.47, 0.06, -0.18 + i * 1.6, 0.47, 0.065, C('#2a2a30', 0.8)); for (let r = 0; r < 5; r++) { s0.box(-1.3 + i * 1.6, 0.32 - r * 0.17, 0.067, -0.75 + i * 1.6, 0.36 - r * 0.17, 0.07, C('#f4e6c8', 1)); s0.box(-0.55 + i * 1.6, 0.32 - r * 0.17, 0.067, -0.3 + i * 1.6, 0.36 - r * 0.17, 0.07, C('#ffbe0b', 1)); } } s0.pop(); VK.wglow(0, 4.4, 0.1, 1.95, 1.8, '#ffe2b0', 0.14, 0.7); }
      { const s0 = SEC(0); wAt(s0, 0, 4.4, 0, 3.25); s0.rbox(-0.5, -0.28, 0.02, 0.5, 0.3, 0.12, 0.2, C('#e9a23b', 0.95), 3); s0.rbox(-0.38, -0.18, 0.12, 0.38, 0.2, 0.15, 0.14, C('#ffd59e', 1), 3); s0.pop(); VK.wglow(0, 4.4, 0.2, 3.25, 1.0, '#ffb347', 0.2, 0.7); }
      for (const u of [-5.6, -4.4, -3.2]) { wAt(mb, 0, u, 0.9); P.stool(mb, 0.82, '#c0392b', '#2b2b2e'); mb.pop(); }
      // 1: sağ — otobüs durağı, gazete bayii
      vWall(1, { wall: '#6b4f6a', dado: '#4a3550', dadoH: 0.6, base: '#2b1f2e', crown: '#3b2a40', pat: 'brick', pc: ['#7a5a6e', '#6e5064', '#83627a'], ps: 0.3 }, [{ u0: -5.4, u1: -3.0, y0: 1.0, y1: 2.6 }, { u0: 3.0, u1: 5.4, y0: 1.0, y1: 2.6 }]);
      for (const h of [{ u0: -5.4, u1: -3.0, y0: 1.0, y1: 2.6 }, { u0: 3.0, u1: 5.4, y0: 1.0, y1: 2.6 }]) vWindow(1, h, { frame: '#2b1f2e', view: 'dusk', sun: false });
      { const mb = SEC(1); VSK = 1; wAt(mb, 1, 0, 1.0);
      const Gl = C('#9fc6d8', -0.9), Fr = C('#3a3d44', -0.7);
      for (const x of [-1.3, 1.3]) mb.box(x - 0.04, 0, -0.5, x + 0.04, 2.4, -0.42, Fr);
      mb.box(-1.4, 2.4, -0.6, 1.4, 2.5, 0.5, Fr); mb.box(-1.3, 0.3, -0.52, 1.3, 2.35, -0.5, Gl); mb.box(-1.25, 0.9, -0.49, -0.1, 2.0, -0.47, C('#ffbe0b', 0.85)); for (let i = 0; i < 3; i++) mb.box(-1.1, 1.7 - i * 0.25, -0.465, -0.3, 1.76 - i * 0.25, -0.46, C('#c0392b', 0.85));
      mb.push().T(0.55, 0, -0.05); P.bench(mb, 1.4, '#c9a46a', '#3a3d44'); mb.pop();
      mb.pop();
      wAt(mb, 1, 4.6, 0.8);
      mb.rbox(-0.7, 0, -0.45, 0.7, 1.8, 0.45, 0.04, C('#2a6f97', -0.3), 2); mb.box(-0.6, 0.9, 0.45, 0.6, 1.5, 0.47, C('#ffe8b8', 0.8));
      for (let i = 0; i < 6; i++) mb.box(-0.55 + i * 0.19, 0.95, 0.47, -0.4 + i * 0.19, 1.2, 0.49, C(['#e63946', '#f4f1ea', '#3a86ff', '#ffbe0b'][i % 4], 0));
      mb.box(-0.8, 1.8, -0.55, 0.8, 1.9, 0.6, C('#ffbe0b', -0.3)); VK.sh(mb, 0, 0, 0.8, 0.55, 0.4);
      mb.pop(); VSK = -1; }
      // 2: ön — yolun karşısındaki fırın cephesi (vitrin)
      vWall(2, { wall: '#e9c9a0', dado: '#8a5a34', dadoH: 0.7, base: '#4a2e1c', crown: '#8a5a34', pat: 'brick', pc: ['#d9a77a', '#cf9a6c', '#e0b285'], ps: 0.28 }, [{ u0: -4.2, u1: -1.2, y0: 0.8, y1: 2.5 }, { u0: 1.2, u1: 4.2, y0: 0.8, y1: 2.5 }]);
      for (const h of [{ u0: -4.2, u1: -1.2, y0: 0.8, y1: 2.5 }, { u0: 1.2, u1: 4.2, y0: 0.8, y1: 2.5 }]) vWindow(2, h, { frame: '#4a2e1c', view: 'dusk', sun: false, nx: 3 });
      { const s2 = SEC(2); for (const u of [-2.7, 2.7]) { wAt(s2, 2, u, 0, 2.85); v2Awning(s2, 3.4, 0.0, 0.7, '#2a9d8f', '#fff4e0', 9); s2.pop(); } }
      // 3: sol — manav: kasalarda meyve, tente
      vWall(3, { wall: '#d6e2c4', dado: '#3f7d58', dadoH: 0.8, base: '#244a34', crown: '#3f7d58', pat: 'boards', pc: ['#cddbb8', '#c6d5b0', '#d3dfbf'], ps: 0.22 }, []);
      { const s3 = SEC(3); wAt(s3, 3, -2.6, 0, 2.9); v2Awning(s3, 4.6, 0.0, 1.0, '#3f7d58', '#fff4e0', 12); s3.pop(); wAt(s3, 3, 3.6, 0, 2.125); s3.rbox(-0.52, -0.52, 0, 0.52, 0.52, 0.05, 0.03, C('#3f7d58', -0.3), 2); s3.box(-0.46, -0.46, 0.05, 0.46, 0.46, 0.055, C('#fff8ec', 0)); s3.pop(); }
      for (let i = 0; i < 4; i++) { wAt(mb, 3, -4.4 + i * 1.2, 0.55, 0, 0.0); P.crate(mb, 0.62, '#b08455', { hk: 0.55, fill: [['#e63946', '#c1121f'], ['#f4a261', '#ffb703'], ['#7fb069', '#a7c957'], ['#ffd166', '#f9c74f']][i] }); mb.pop(); wAt(mb, 3, -4.4 + i * 1.2, 0.35, 0.34); P.crate(mb, 0.52, '#c49461', { hk: 0.5, fill: [['#9b5de5', '#7b2cbf'], ['#e63946'], ['#06d6a0', '#2a9d8f'], ['#f77f00']][i] }); mb.pop(); }
      // meydan: sokak lambaları, ayaklı masalar, saksılı ağaçlar, bisiklet, çöp kutusu, motor
      for (const [x, z] of [[-5.6, -3.0], [5.6, -3.2], [-5.4, 4.6], [5.4, 4.6]]) VK.tall(x, z, (m) => v2StreetLamp(m, 3.5));
      { const LP = [[-5.6, 3.25, -3.0], [5.6, 3.25, -3.2], [5.4, 3.25, 4.6], [-5.4, 3.25, 4.6], [-5.6, 3.25, -3.0]]; for (let i = 0; i < 4; i++) { const a = LP[i], b = LP[i + 1], k = vSecOf((a[0] + b[0]) / 2, (a[2] + b[2]) / 2); VSK = k; P.stringLights(SEC(k), [a, b], ['#ffd38a', '#ffe9b0', '#ff9e5e'], 9, 0.55, 0.045, k); VSK = -1; } }
      // A tipi menü panosu ve çiçek saksıları
      mb.push().T(-1.9, 0, -5.9, 0.35); for (const s of [-1, 1]) { mb.push().T(0, 0, s * 0.16, 0, s * 0.22); mb.box(-0.32, 0, -0.025, 0.32, 0.95, 0.025, C('#5a3a24', -0.2)); mb.box(-0.27, 0.1, s * 0.026, 0.27, 0.88, s * 0.03, C('#24342c', 0)); for (let i = 0; i < 4; i++) mb.box(-0.2, 0.72 - i * 0.16, s * 0.031, 0.1 + hs(i, s + 3) * 0.1, 0.75 - i * 0.16, s * 0.034, C('#f2efe6', 0.15)); mb.pop(); } VK.sh(mb, 0, 0, 0.36, 0.28, 0.36); mb.pop();
      for (const [x, z] of [[-1.6, -7.0], [1.6, -7.0]]) { mb.push().T(x, 0, z); P.flowers(mb, 1.1, '#c0392b', ['#ffbe0b', '#ffffff', '#ff6f91'], { pk: 'box', r: 0.26, h: 0.36 }); mb.pop(); }
      for (const [x, z] of [[-3.6, -5.2], [3.4, -5.0]]) { mb.push().T(x, 0, z); const ST = C('#c9ced6', -0.85); mb.cyl(0, 0, 0, 0.3, 0.04, 0.28, 14, ST, ST); mb.cyl(0, 0.04, 0, 0.04, 1.05, 0.04, 8, ST, ST, ''); mb.cyl(0, 1.05, 0, 0.42, 1.09, 0.42, 18, C('#c0392b', -0.5), C('#f2f2f2', -0.8)); mb.cyl(0.12, 1.09, -0.05, 0.07, 1.2, 0.06, 10, C('#f4f6fb', -0.4), C('#ffbe0b', -0.4)); mb.push().T(-0.12, 1.09, 0.1, 0.5); mb.box(-0.12, 0, -0.08, 0.12, 0.05, 0.08, C('#d9a35a', 0)); mb.box(-0.12, 0.05, -0.08, 0.12, 0.06, 0.08, C('#f4d35e', 0)); mb.box(-0.12, 0.06, -0.08, 0.12, 0.1, 0.08, C('#d9a35a', 0)); mb.pop(); VK.sh(mb, 0, 0, 0.45, 0.45, 0.38); mb.pop(); for (const [dx, dz] of [[-0.75, 0.3], [0.7, 0.35]]) { mb.push().T(x + dx, 0, z + dz); P.stool(mb, 0.72, '#c0392b', '#c9ced6'); mb.pop(); } }
      for (const [x, z] of [[-6.6, 1.0], [6.6, 1.2]]) { mb.push().T(x, 0, z); mb.box(-0.5, 0, -0.5, 0.5, 0.5, 0.5, C('#8a8478', -0.2)); mb.box(-0.45, 0.5, -0.45, 0.45, 0.52, 0.45, C('#4a3426', 0)); mb.pop(); VK.tall(x, z, (m) => { m.push().T(0, 0.5, 0, 0, 0, 0, 0.75); P.tree(m, 1, '#5a9a3c'); m.pop(); }); }
      mb.push().T(2.6, 0, 5.4, -0.25);
      const MR = C('#e63946', -0.5), MD = C('#22252b', -0.4);
      for (const x of [-0.5, 0.52]) { mb.push().T(x, 0.24, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.17, 0.07, 0.07, 16, 6, MD); mb.cyl(0, -0.05, 0, 0.11, 0.05, 0.11, 10, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); mb.pop(); }
      mb.rbox(-0.6, 0.28, -0.17, 0.42, 0.58, 0.17, 0.08, MR, 2); mb.rbox(-0.5, 0.58, -0.15, 0.02, 0.68, 0.15, 0.05, MD, 2);
      mb.push().T(0.42, 0.25, 0, 0, 0, -0.25); mb.rbox(-0.06, 0, -0.18, 0.06, 0.72, 0.18, 0.04, MR, 2); mb.pop();
      limb(mb, [0.6, 1.08, -0.3], [0.6, 1.08, 0.3], [0.02, 0.02], MD, 4); mb.sphereS(0.66, 0.98, 0, 0.07, 0.07, 0.06, C('#fff1c9', 0.9), 8, 5);
      mb.box(-0.82, 0.68, -0.26, -0.26, 1.12, 0.26, C('#ffffff', -0.3)); mb.box(-0.83, 0.84, -0.27, -0.25, 0.94, 0.27, C('#e63946', 0));
      VK.sh(mb, 0, 0, 0.8, 0.35, 0.4); mb.pop();
      mb.push().T(-2.8, 0, 5.5, 0.15);
      const BK = C('#3a86ff', -0.6);
      for (const x of [-0.5, 0.5]) { mb.push().T(x, 0.33, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.3, 0.02, 0.02, 20, 4, C('#22252b', -0.4)); mb.pop(); }
      limb(mb, [-0.5, 0.33, 0], [0, 0.35, 0], [0.018, 0.018], BK, 4); limb(mb, [0, 0.35, 0], [0.5, 0.33, 0], [0.018, 0.018], BK, 4); limb(mb, [-0.5, 0.33, 0], [-0.1, 0.75, 0], [0.018, 0.018], BK, 4); limb(mb, [0, 0.35, 0], [-0.12, 0.78, 0], [0.018, 0.018], BK, 4); limb(mb, [-0.12, 0.78, 0], [0.38, 0.8, 0], [0.018, 0.018], BK, 4); limb(mb, [0.38, 0.8, 0], [0.5, 0.33, 0], [0.018, 0.018], BK, 4); limb(mb, [0.38, 0.8, 0], [0.42, 0.95, 0], [0.016, 0.016], BK, 4);
      limb(mb, [0.42, 0.95, -0.2], [0.42, 0.95, 0.2], [0.014, 0.014], C('#22252b', 0), 4); mb.rbox(-0.22, 0.8, -0.06, -0.02, 0.84, 0.06, 0.02, C('#22252b', 0), 2);
      mb.box(0.36, 0.7, -0.12, 0.58, 0.9, 0.12, C('#c9a46a', 0)); VK.sh(mb, 0, 0, 0.75, 0.2, 0.36); mb.pop();
      mb.push().T(6.4, 0, -5.4); mb.lathe(0, 0, 0, [[0.24, 0], [0.26, 0.85], [0.27, 0.86]], 16, C('#2f6b3a', -0.5), 'b'); mb.cyl(0, 0.86, 0, 0.28, 0.92, 0.26, 16, C('#2f6b3a', -0.5), C('#2f6b3a', -0.5)); VK.sh(mb, 0, 0, 0.32, 0.32, 0.38); mb.pop();
    },
  },
});

/* ====================== v2 mekânlar 3: Bu mu Şu mu, Bil Bakalım, Vampir Köylü, Anlat Bakalım, Emoji Bilmece ====================== */
Object.assign(VL2, {
  sunny: { raw: 1, sunC: [0.88, 0.78, 0.64], sky: [0.41, 0.43, 0.5], gnd: [0.3, 0.27, 0.22], night: 0, warm: [1, 0.9, 0.7], lampC: [0.4, 0.36, 0.3], fogR: [40, 130], stars: 0, glowS: 0.3 },
  studio: { raw: 1, sunC: [0.52, 0.5, 0.64], sky: [0.31, 0.3, 0.42], gnd: [0.17, 0.15, 0.24], night: 1, warm: [1, 0.85, 0.7], lampC: [1.35, 1.2, 1.05], fogR: [40, 110], stars: 0, glowS: 0.5 },
  beach: { raw: 1, sunC: [0.97, 0.8, 0.64], sky: [0.39, 0.39, 0.52], gnd: [0.31, 0.25, 0.21], night: 0.55, warm: [1, 0.8, 0.56], lampC: [0.85, 0.66, 0.48], fogR: [50, 150], stars: 0, glowS: 0.5 },
  fair: { raw: 1, sunC: [0.64, 0.5, 0.56], sky: [0.36, 0.32, 0.46], gnd: [0.24, 0.19, 0.25], night: 1, warm: [1, 0.82, 0.7], lampC: [1.0, 0.8, 0.7], fogR: [45, 130], stars: 0, glowS: 0.5 },
});
// cam görünüşlü pencere içi (dışarıdan bakılan bina camı)
const _vViewOld = vView;
vView = function (mb, x0, y0, x1, y1, z, kind, seed = 1) {
  if (kind !== 'glass' && kind !== 'lit') return _vViewOld(mb, x0, y0, x1, y1, z, kind, seed);
  const n = [0, 0, 1], E = (h) => C(h, kind === 'lit' ? 1 : 0.0);
  const a = kind === 'lit' ? '#ffd38a' : '#2b4a66', b = kind === 'lit' ? '#ffb85c' : '#8fb3cc';
  mb.quadN([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], n, n, n, n, E(a), E(a), E(b), E(b));
};
// pazar tezgâhı: örtülü masa, direkler, çizgili tente, ürünler (yerel: önü +z)
function v2Stall(mb, w, kind, ca, cb, seed = 1) {
  const d = 0.9, Wd = C('#8a5a34', -0.15), Cl = C(cb, 0);
  mb.box(-w / 2, 0.82, -d / 2, w / 2, 0.86, d / 2, C('#b08455', -0.1));
  mb.box(-w / 2 - 0.01, 0.3, d / 2, w / 2 + 0.01, 0.86, d / 2 + 0.012, C(ca, 0));
  for (let i = 0; i < Math.round(w / 0.3); i++) { const x0 = -w / 2 + i * 0.3; mb.box(x0, 0.3, d / 2 + 0.012, x0 + 0.15, 0.86, d / 2 + 0.016, Cl); }
  for (const [x, z] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) mb.box(x - 0.025, 0, z - 0.025, x + 0.025, 0.82, z + 0.025, Wd);
  for (const x of [-w / 2, w / 2]) { mb.box(x - 0.03, 0, -d / 2 - 0.1, x + 0.03, 2.35, -d / 2 - 0.04, Wd); mb.box(x - 0.03, 0, d / 2 + 0.35, x + 0.03, 2.05, d / 2 + 0.41, Wd); }
  const n = Math.round(w / 0.32);
  for (let i = 0; i < n; i++) { const x0 = -w / 2 - 0.1 + ((w + 0.2) * i) / n, x1 = x0 + (w + 0.2) / n, nn = vnorm([0, 1, 0.4]); mb.quadN([x0, 2.38, -d / 2 - 0.15], [x1, 2.38, -d / 2 - 0.15], [x1, 2.06, d / 2 + 0.55], [x0, 2.06, d / 2 + 0.55], nn, nn, nn, nn, C(i % 2 ? ca : cb, 0)); mb.box(x0, 1.86, d / 2 + 0.53, x1, 2.06, d / 2 + 0.56, C(i % 2 ? ca : cb, 0)); }
  const y = 0.86;
  const pile = (x, z, cols, r = 0.07, nn = 16, sx = 0.3, sz = 0.2) => { for (let k = 0; k < nn; k++) { const a = k * 2.399, rr = Math.sqrt(k / nn); mb.sphereS(x + Math.cos(a) * rr * sx, y + r + (1 - rr) * r * 2.2, z + Math.sin(a) * rr * sz, r, r * 0.92, r, C(cols[k % cols.length], -0.25), 8, 5); } };
  const crate = (x, z) => { mb.box(x - 0.24, y, z - 0.17, x + 0.24, y + 0.12, z + 0.17, C('#c49461', 0)); };
  if (kind === 'fruit') { const F = [['#e63946', '#c1121f'], ['#f4a261', '#ffb703'], ['#ffd166', '#f9c74f'], ['#7fb069', '#a7c957'], ['#9b5de5', '#7b2cbf']]; for (let i = 0; i < 4; i++) { const x = -w / 2 + 0.32 + i * ((w - 0.6) / 3); crate(x, 0.05); pile(x, 0.05, F[(i + seed) % 5], 0.065, 14, 0.18, 0.12); } }
  else if (kind === 'veg') { for (let i = 0; i < 4; i++) { const x = -w / 2 + 0.32 + i * ((w - 0.6) / 3); crate(x, 0.05); if (i % 2) for (let k = 0; k < 7; k++) limb(mb, [x - 0.18 + k * 0.06, y + 0.12, 0.05], [x - 0.2 + k * 0.06, y + 0.16, -0.12], [0.03, 0.015], C('#f77f00', -0.2), 5); else pile(x, 0.05, ['#3f8f3a', '#5aa84c', '#2f7d32'], 0.08, 12, 0.18, 0.12); } }
  else if (kind === 'spice') { const K = ['#c1121f', '#f4a261', '#ffb703', '#6a994e', '#8a5a34', '#e9c46a']; for (let i = 0; i < 6; i++) { const x = -w / 2 + 0.25 + (i % 3) * ((w - 0.5) / 2), z = i < 3 ? -0.15 : 0.18; mb.cyl(x, y, z, 0.15, y + 0.1, 0.15, 14, C('#d9c39a', 0), C('#d9c39a', 0)); mb.lathe(x, y + 0.1, z, [[0.14, 0], [0.08, 0.1], [0.0, 0.17]], 14, C(K[i], 0)); } }
  else if (kind === 'flower') { const K = ['#ff6f91', '#ffd166', '#ffffff', '#c77dff', '#ff8a3d']; for (let i = 0; i < 5; i++) { const x = -w / 2 + 0.25 + i * ((w - 0.5) / 4); mb.lathe(x, y, 0, [[0.1, 0], [0.12, 0.22], [0.13, 0.23]], 12, C('#6c757d', -0.8), 'b'); for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 0.03 + (k % 3) * 0.035, hh = y + 0.35 + hs(k, i) * 0.15; limb(mb, [x, y + 0.2, 0], [x + Math.cos(a) * r, hh, Math.sin(a) * r], [0.006, 0.006], C('#4f8a3c', 0), 3, null, 1); mb.sphereS(x + Math.cos(a) * r, hh, Math.sin(a) * r, 0.04, 0.035, 0.04, C(K[(i + k) % K.length], 0), 6, 4); } } }
  else if (kind === 'bread') { for (let i = 0; i < 8; i++) { const x = -w / 2 + 0.22 + (i % 4) * ((w - 0.45) / 3), z = i < 4 ? -0.14 : 0.16; mb.push().T(x, y + 0.03, z); mb.torusN(0, 0, 0, 0.1, 0.035, 0.03, 16, 6, C('#c7893f', -0.1)); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; mb.sphereS(Math.cos(a) * 0.1, 0.03, Math.sin(a) * 0.1, 0.008, 0.004, 0.008, C('#f4efe6', 0), 4, 2); } mb.pop(); } }
  else if (kind === 'cheese') { for (let i = 0; i < 3; i++) { const x = -w / 2 + 0.35 + i * ((w - 0.7) / 2); mb.cyl(x, y, 0, 0.22, y + 0.15, 0.22, 18, C('#f2c14e', -0.2), C('#f6d77e', -0.2)); mb.push().T(x, y + 0.15, 0); mb.box(-0.02, 0, -0.22, 0.02, 0.002, 0.0, C('#e0a82e', 0)); mb.pop(); } for (let i = 0; i < 2; i++) { const x = -w / 2 + 0.6 + i * (w - 1.2); mb.cyl(x, y, 0.3, 0.1, y + 0.08, 0.1, 12, C('#2b2b2b', -0.4), C('#2b2b2b', -0.4)); for (let k = 0; k < 6; k++) mb.sphereS(x + (hs(k, i) - 0.5) * 0.1, y + 0.1, 0.3 + (hs(k, i + 1) - 0.5) * 0.1, 0.025, 0.02, 0.025, C('#3a5a2a', -0.4), 6, 3); } }
  // fiyat kartları ve terazi
  for (let i = 0; i < 3; i++) { const x = -w / 2 + 0.3 + i * ((w - 0.6) / 2); mb.box(x - 0.08, y, 0.4, x + 0.08, y + 0.1, 0.405, C('#fbf6ec', 0)); mb.box(x - 0.05, y + 0.03, 0.406, x + 0.05, y + 0.06, 0.408, C('#c1121f', 0)); }
  mb.push().T(w / 2 - 0.25, y, 0.28); mb.box(-0.12, 0, -0.08, 0.12, 0.1, 0.08, C('#e9e3d6', -0.5)); mb.cyl(0, 0.1, 0, 0.13, 0.115, 0.13, 14, C('#c9ced6', -0.85), C('#c9ced6', -0.85)); mb.pop();
  VK.sh(mb, 0, 0.1, w * 0.62, 0.85, 0.36);
}
// köy evi (yerel: cephe +z'ye bakar): taş temel, sıva, ahşap kirişler, ışıklı pencereler, kapı, kiremit çatı, baca
function v2House(mb, w, h, wall, roof, seed = 1, o = {}) {
  const d = o.d || 3.2, Wl = C(wall, 0), Rf = C(roof, -0.1), Tm = C(o.timber || '#4a2e1c', 0);
  mb.box(-w / 2, 0, -d, w / 2, 0.45, 0, C('#6f6a62', -0.1));
  mb.box(-w / 2 + 0.04, 0.45, -d + 0.04, w / 2 - 0.04, h, -0.04, Wl);
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) mb.box(x - 0.08, 0.45, -0.07, x + 0.08, h, 0.0, Tm);
  mb.box(-w / 2, h - 0.12, -0.08, w / 2, h, 0.0, Tm); mb.box(-w / 2, 1.5, -0.07, w / 2, 1.6, 0.0, Tm);
  const nw = Math.max(1, Math.round((w - 1.4) / 1.3));
  for (let i = 0; i < nw; i++) { const x = -w / 2 + 0.7 + ((w - 1.4) * (i + 0.5)) / nw + (i >= nw / 2 ? 0.45 : -0.45) * (nw % 2 ? 0 : 1) * 0; const lit = hs(i, seed) > 0.25;
    mb.box(x - 0.36, 1.85, -0.06, x + 0.36, 2.65, 0.0, Tm); mb.box(x - 0.3, 1.9, -0.05, x + 0.3, 2.6, 0.005, C(lit ? '#ffcf7a' : '#2b3a55', lit ? 0.9 : -0.6)); mb.box(x - 0.015, 1.9, 0.005, x + 0.015, 2.6, 0.015, Tm); mb.box(x - 0.3, 2.24, 0.005, x + 0.3, 2.27, 0.015, Tm); mb.box(x - 0.42, 1.8, 0.0, x + 0.42, 1.86, 0.12, Tm);
    if (lit && o.glows !== false) { const p = mb.p(x, 2.25, 0.3); VK.halo(p, 0.55, '#ffc46b', 0.2, 0, o.sec ?? -1); }
    if (o.flowers) { mb.box(x - 0.38, 1.7, 0.0, x + 0.38, 1.8, 0.2, C('#8a5a34', 0)); for (let k = 0; k < 5; k++) mb.sphereS(x - 0.3 + k * 0.15, 1.85, 0.1, 0.07, 0.06, 0.07, C(['#ff6f91', '#ffd166', '#ffffff', '#e63946'][k % 4], 0), 6, 4); } }
  const dx = o.doorX ?? 0;
  mb.box(dx - 0.5, 0.45, -0.07, dx + 0.5, 1.45, 0.0, Tm); mb.box(dx - 0.42, 0.45, -0.06, dx + 0.42, 1.38, 0.01, C(o.door || '#7a4a2a', -0.2)); mb.sphereS(dx + 0.3, 0.92, 0.03, 0.03, 0.03, 0.03, C('#c9a34a', -0.85), 6, 4);
  mb.box(dx - 0.6, 0.0, 0.0, dx + 0.6, 0.12, 0.45, C('#7a756c', 0));
  // çatı: iki eğik düzlem ve alınlık üçgenleri
  const ov = 0.35, top = h + w * 0.42;
  const nL = vnorm([0, 1, 0]);
  mb.quadN([-w / 2 - ov, h - 0.1, ov], [w / 2 + ov, h - 0.1, ov], [w / 2 + ov, top, -d / 2], [-w / 2 - ov, top, -d / 2], nL, nL, nL, nL, Rf);
  mb.quadN([-w / 2 - ov, h - 0.1, -d - ov], [w / 2 + ov, h - 0.1, -d - ov], [w / 2 + ov, top, -d / 2], [-w / 2 - ov, top, -d / 2], nL, nL, nL, nL, C(vDark(roof, 0.15), -0.1));
  for (let k = 0; k < 6; k++) { const t = (k + 1) / 7, yy = h - 0.1 + (top - h + 0.1) * t, zz = ov + (-d / 2 - ov) * t; mb.box(-w / 2 - ov, yy - 0.015, zz - 0.02, w / 2 + ov, yy + 0.015, zz + 0.03, C(vDark(roof, 0.25), 0)); }
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) mb.triN([x, h, -0.04], [x, h, -d + 0.04], [x, top - 0.05, -d / 2], [1, 0, 0], [1, 0, 0], [1, 0, 0], Wl);
  if (o.chimney !== false) { const cx = w / 2 - 0.7; mb.box(cx - 0.22, h + 0.4, -d / 2 - 0.5, cx + 0.22, top + 0.5, -d / 2 - 0.06, C('#8a7f72', 0)); mb.box(cx - 0.26, top + 0.5, -d / 2 - 0.54, cx + 0.26, top + 0.6, -d / 2 - 0.02, C('#6f6a62', 0)); }
}
// şezlong ve havlu (yerel: baş tarafı -z)
function v2Lounger(mb, col = '#00a6a6') {
  const W = C('#f4efe6', -0.3);
  for (const s of [-1, 1]) { mb.box(s * 0.3 - 0.02, 0.18, -0.85, s * 0.3 + 0.02, 0.22, 0.85, W); for (const z of [-0.75, 0.75]) mb.box(s * 0.3 - 0.02, 0, z - 0.02, s * 0.3 + 0.02, 0.2, z + 0.02, W); }
  for (let i = 0; i < 9; i++) mb.box(-0.3, 0.22, 0.85 - i * 0.12 - 0.1, 0.3, 0.24, 0.85 - i * 0.12, C(i % 2 ? col : '#ffffff', 0));
  mb.push().T(0, 0.24, -0.25, 0, 0.6); for (let i = 0; i < 5; i++) mb.box(-0.3, 0, -i * 0.12 - 0.1, 0.3, 0.02, -i * 0.12, C(i % 2 ? col : '#ffffff', 0)); mb.pop();
  VK.sh(mb, 0, 0, 0.42, 0.95, 0.3);
}
// kum kalesi
function v2SandCastle(mb, s = 1) {
  mb.push().T(0, 0, 0, 0, 0, 0, s); const S1 = C('#e3c27e', 0), S2 = C('#d8b46e', 0);
  mb.box(-0.42, 0, -0.42, 0.42, 0.28, 0.42, S2);
  for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) { mb.cyl(x, 0, z, 0.15, 0.46, 0.14, 10, S1, S1); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; mb.box(x + Math.cos(a) * 0.11 - 0.03, 0.46, z + Math.sin(a) * 0.11 - 0.03, x + Math.cos(a) * 0.11 + 0.03, 0.52, z + Math.sin(a) * 0.11 + 0.03, S1); } }
  mb.cyl(0, 0.28, 0, 0.22, 0.62, 0.18, 12, S1, S1); mb.lathe(0, 0.62, 0, [[0.2, 0], [0.0, 0.22]], 12, S2);
  mb.box(-0.003, 0.84, 0, 0.003, 1.05, 0.003, C('#5a3a24', 0)); mb.triN([0, 1.05, 0], [0, 0.96, 0], [0.13, 1.0, 0], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#e63946', 0));
  mb.box(-0.12, 0, 0.42, 0.12, 0.18, 0.44, C('#b89458', 0));
  mb.pop(); VK.sh(mb, 0, 0, 0.6 * s, 0.6 * s, 0.3);
}
// stüdyo kamerası (tekerlekli ayak): yerel +z'ye bakar
// plaj şemsiyesi: 12 dilim, iki kademeli kubbe, fırfırlı etek, eklem ve tepe topuzu
function v2BeachUmb(mb, a, b, r = 1.05, h = 2.05) {
  const P = C('#f2efe8', -0.4), J = C('#c9ced6', -0.8), N = 12, r1 = r * 0.56, y0 = h + 0.36, y1 = h + 0.15, y2 = h - 0.06;
  mb.cyl(0, 0, 0, 0.028, h + 0.14, 0.024, 8, P, P); mb.cyl(0, h * 0.55, 0, 0.042, h * 0.55 + 0.1, 0.042, 8, J, J);
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * TAU, a1 = ((k + 1) / N) * TAU, am = (a0 + a1) / 2, col = C(k % 2 ? a : b, 0), c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), cm = Math.cos(am), sm = Math.sin(am);
    const n0 = vnorm([c0, 2.4, s0]), n1 = vnorm([c1, 2.4, s1]), m0 = vnorm([c0, 1.1, s0]), m1 = vnorm([c1, 1.1, s1]);
    mb.triN([0, y0, 0], [c0 * r1, y1, s0 * r1], [c1 * r1, y1, s1 * r1], UPV, n0, n1, col);
    mb.quadN([c0 * r1, y1, s0 * r1], [c0 * r, y2, s0 * r], [c1 * r, y2, s1 * r], [c1 * r1, y1, s1 * r1], n0, m0, m1, n1, col);
    const nf = vnorm([cm, 0.2, sm]); mb.triN([c0 * r, y2, s0 * r], [cm * r * 1.01, y2 - 0.12, sm * r * 1.01], [c1 * r, y2, s1 * r], nf, nf, nf, C(k % 2 ? b : a, 0));
    limb(mb, [0, h * 0.84, 0], [c0 * r * 0.62, y1 - 0.06, s0 * r * 0.62], [0.008, 0.008], J, 3, null, 1);
  }
  mb.sphereS(0, y0 + 0.03, 0, 0.05, 0.05, 0.05, P, 8, 5);
}
function v2Cooler(mb, col = '#2a6f97') {
  mb.rbox(-0.3, 0, -0.2, 0.3, 0.34, 0.2, 0.04, C(col, -0.3), 2); mb.rbox(-0.31, 0.34, -0.21, 0.31, 0.42, 0.21, 0.04, C('#f4efe6', -0.3), 2);
  limb(mb, [-0.2, 0.42, 0], [0, 0.5, 0], [0.012, 0.012], C('#2b2b2b', -0.3), 3); limb(mb, [0, 0.5, 0], [0.2, 0.42, 0], [0.012, 0.012], C('#2b2b2b', -0.3), 3);
}
function v2StudioCam(mb, col = '#22252c') {
  const K = C(col, -0.6);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.3; limb(mb, [Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45], [0, 0.25, 0], [0.04, 0.035], K, 5); mb.sphereS(Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45, 0.07, 0.06, 0.07, C('#111111', -0.4), 6, 4); }
  mb.cyl(0, 0.25, 0, 0.07, 1.25, 0.06, 10, K, K); mb.rbox(-0.22, 1.25, -0.4, 0.22, 1.62, 0.28, 0.04, K, 2);
  mb.push().T(0, 1.44, 0.28, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.14, 0.36, 0.15, 14, C('#111111', -0.9), C('#2a3a5a', -0.95)); mb.pop();
  mb.box(-0.06, 1.62, -0.25, 0.06, 1.68, -0.15, C('#ff3b30', 1)); mb.box(-0.18, 1.3, -0.42, 0.18, 1.56, -0.4, C('#9fd8ff', 0.9));
  for (const s of [-1, 1]) limb(mb, [s * 0.15, 1.3, -0.4], [s * 0.3, 1.15, -0.75], [0.015, 0.015], K, 4);
  VK.sh(mb, 0, 0, 0.5, 0.5, 0.36);
}
// sahne ışığı ayakta: tripod, kafa, ışık konisi yere havuz
function v2SpotStand(mb, col = '#ff4fd8', aim = 0.6) {
  const K = C('#22252c', -0.7);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], [0, 1.2, 0], [0.025, 0.02], K, 4); }
  mb.cyl(0, 1.2, 0, 0.025, 1.9, 0.025, 6, K, K);
  mb.push().T(0, 1.95, 0, 0, aim); mb.cyl(0, -0.22, 0, 0.18, 0.18, 0.14, 12, K, K); mb.cyl(0, 0.18, 0, 0.15, 0.2, 0.15, 12, C(col, 1), C(col, 1)); mb.pop();
  const p = mb.p(0, 1.95, 0), q = mb.p(0, 0, 2.2); VK.halo([p[0], p[1], p[2]], 0.5, col, 0.3); VK.pool([q[0], 0, q[2]], 1.6, col, 0.14);
  VK.sh(mb, 0, 0, 0.45, 0.45, 0.3);
}
// tribün: 3 sıra koltuk, sevimli izleyiciler (yerel: önü +z)
function v2Bleachers(mb, w = 5.0, seed = 1) {
  for (let r = 0; r < 3; r++) {
    const y = r * 0.42, z = -r * 0.62;
    mb.box(-w / 2, 0, z - 0.62, w / 2, y + 0.2, z, C('#1b1d2a', -0.3));
    mb.box(-w / 2, y + 0.2, z - 0.6, w / 2, y + 0.24, z - 0.02, C('#ffd23f', 0.9));
    const n = Math.round(w / 0.55);
    for (let i = 0; i < n; i++) { const x = -w / 2 + 0.28 + i * ((w - 0.56) / (n - 1)); mb.rbox(x - 0.2, y + 0.24, z - 0.4, x + 0.2, y + 0.4, z - 0.08, 0.04, C('#b3202a', -0.3), 2); mb.rbox(x - 0.2, y + 0.4, z - 0.42, x + 0.2, y + 0.78, z - 0.34, 0.04, C('#b3202a', -0.3), 2);
      if (hs(i, r + seed) < 0.72) { const c = ['#3a86ff', '#ffbe0b', '#06d6a0', '#ff6f91', '#9b5de5', '#f77f00'][Math.floor(hs(i, r * 5 + seed) * 6)], sk = ['#f1c27d', '#c68642', '#8d5524', '#ffdbac'][Math.floor(hs(r, i * 3 + seed) * 4)]; mb.sphereS(x, y + 0.62, z - 0.2, 0.17, 0.24, 0.14, C(c, 0), 10, 7); mb.sphereS(x, y + 0.98, z - 0.2, 0.13, 0.14, 0.13, C(sk, 0), 10, 7); mb.sphereS(x, y + 1.06, z - 0.23, 0.135, 0.09, 0.13, C(['#2b1a10', '#3b2a1c', '#c9a34a', '#1b1b1e'][Math.floor(hs(i, r + 7) * 4)], 0), 10, 6); if (hs(i, r + 11) < 0.4) for (const s of [-1, 1]) limb(mb, [x + s * 0.14, y + 0.76, z - 0.2], [x + s * 0.26, y + 1.22, z - 0.16], [0.045, 0.04], C(c, 0), 5); } }
  }
  VK.sh(mb, 0, -0.9, w * 0.55, 1.1, 0.3);
}
// atlıkarınca (dönen parça): VANIM'e eklenir
VANIM.carousel = (mb) => {
  const R = 2.0, K = ['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4', '#ff8a3d'];
  mb.cyl(0, 0, 0, R + 0.1, 0.25, R + 0.1, 32, C('#fbf6ec', -0.3), C('#e9c46a', -0.3));
  mb.cyl(0, 0.25, 0, 0.25, 2.6, 0.25, 16, C('#e9c46a', -0.85), C('#e9c46a', -0.85));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, x = Math.cos(a) * (R - 0.45), z = Math.sin(a) * (R - 0.45), y = 0.95 + (k % 2) * 0.25;
    mb.cyl(x, 0.25, z, 0.03, 2.6, 0.03, 6, C('#e9c46a', -0.9), C('#e9c46a', -0.9), '');
    mb.push().T(x, y, z, -a); mb.rbox(-0.16, 0, -0.42, 0.16, 0.36, 0.38, 0.12, C(K[k % 6], -0.3), 2); mb.push().T(0, 0.3, 0.38, 0, -0.5); mb.rbox(-0.1, 0, -0.08, 0.1, 0.42, 0.12, 0.06, C(K[k % 6], -0.3), 2); mb.pop(); mb.sphereS(0, 0.68, 0.52, 0.11, 0.13, 0.16, C(K[k % 6], -0.3), 10, 7); for (const s of [-1, 1]) for (const zz of [-0.3, 0.28]) limb(mb, [s * 0.1, 0.05, zz], [s * 0.12, -0.38, zz + (zz > 0 ? 0.1 : -0.1)], [0.04, 0.03], C(K[k % 6], -0.3), 4); mb.rbox(-0.15, 0.34, -0.15, 0.15, 0.4, 0.15, 0.03, C('#ffffff', -0.4), 2); mb.pop(); }
  mb.lathe(0, 2.6, 0, [[R + 0.25, 0], [R + 0.2, 0.15], [0.6, 0.9], [0.1, 1.1], [0, 1.15]], 24, (i, a) => C(Math.floor(a * 16 / TAU) % 2 ? '#f15bb5' : '#fbf6ec', -0.2));
  for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; mb.sphereS(Math.cos(a) * (R + 0.25), 2.6, Math.sin(a) * (R + 0.25), 0.06, 0.06, 0.06, C(k % 2 ? '#fff1b8' : '#ffd23f', 1), 6, 4); }
  mb.sphereS(0, 3.8, 0, 0.16, 0.16, 0.16, C('#fee440', -0.6), 10, 7);
};
Object.assign(VENUES, {
  /* ---- Bu mu Şu mu: güneşli semt pazarı ---- */
  bms: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'wood', tableO: { wood: '#a8743f' }, chair: 'stool', chairO: { leg: '#6b4428', gloss: -0.1 },
    rug: 'kilim', rugO: { k: ['#9a4a35', '#d9b46a', '#4f6b55', '#efe2c6', '#5a3226'], bands: 9 },
    L: VL2.sunny, sky: ['#7fc8f8', '#e8f6ff', '#d9ecf5'], sun: [0.5, 0.78, 0.35], shR: 9.0, parts: 'petals',
    post: { bloom: 0.3, th: 0.9, sat: 1.12, con: 0.15, vig: 0.3, tint: [1.02, 1.0, 0.97] },
    det: 0.16, detS: 0.55,
    logos: [[3, 0, 3.25, 0.9, 0.9]],
    build(mb) {
      VK.quad(mb, -40, -40, 40, 40, C('#9c9488', 0), -0.006);
      vFloorTile(mb, 0.78, '#c4b29a', '#b9a78f', '#958570', { e: -0.12, jit: 0.08 });
      for (const [x0, z0, x1, z1] of [[-RW - 5.46, -RW - 5.46, RW + 5.46, -RW], [-RW - 5.46, RW, RW + 5.46, RW + 5.46], [-RW - 5.46, -RW, -RW, RW], [RW, -RW, RW + 5.46, RW]]) VK.tiles(mb, x0, z0, x1, z1, 0.78, '#b6a690', '#ab9b85', '#9d9586', -0.14, -0.002, true);
      // arka plan: dört yanda alçak binalar (cam vitrinler), kamera tarafındaki iner
      const FAC = [['#f2d8b5', '#c0392b'], ['#cfe3d8', '#2f6b5a'], ['#f4e3a1', '#8a5a34'], ['#e8cfe0', '#6d597a']];
      for (let k = 0; k < 4; k++) {
        const F = FAC[k], holes = [];
        for (let i = 0; i < 4; i++) { const u = -5.4 + i * 3.6; if (k === 0 && Math.abs(u) < 2.4) continue; holes.push({ u0: u - 0.9, u1: u + 0.9, y0: 0.4, y1: 2.4 }, { u0: u - 0.6, u1: u + 0.6, y0: 3.4, y1: 4.6 }); }
        vWall(k, { wall: F[0], H: 6.0, dado: vDark(F[0], 0.25), dadoH: 0.4, base: vDark(F[0], 0.45), crown: '#ffffff', pat: 'pin', pc: vDark(F[0], 0.06), ps: 0.6 }, holes);
        for (const h of holes) vWindow(k, h, { frame: '#ffffff', view: h.y0 < 1 ? 'glass' : 'glass', sun: false, sill: h.y0 > 1 });
        { const s = SEC(k); for (let i = 0; i < 4; i++) { const u = -5.4 + i * 3.6; if (k === 0 && Math.abs(u) < 2.4) continue; wAt(s, k, u, 0, 2.95); v2Awning(s, 2.2, 0, 0.7, F[1], '#fff8ec', 7); s.pop(); } }
      }
      // tabela: iki direk arasında pazar pankartı
      vSign('frame', '#8a5a34', '#fff8ec', { lamps: false });
      { const s0 = SEC(0); for (const x of [-1.95, 1.95]) s0.box(x - 0.06, 0, -7.82, x + 0.06, 3.1, -7.7, C('#8a5a34', -0.2)); }
      VK.flags(SEC(0), [-7.7, 4.2, -7.6], [7.7, 4.2, -7.6], 30, 0.3, ['#e63946', '#ffbe0b', '#2f6b5a', '#3a86ff', '#ffffff']);
      // tezgâhlar: masanın çevresinde, ortaya dönük
      const ST = [[-4.9, -4.6, 'fruit', '#c0392b'], [4.9, -4.6, 'spice', '#8a5a34'], [-6.1, 0.4, 'veg', '#2f6b5a'], [6.1, 0.2, 'flower', '#c2185b'], [-4.4, 4.9, 'bread', '#d68c45'], [4.5, 4.8, 'cheese', '#2a6f97']];
      ST.forEach(([x, z, kind, ca], i) => VK.tall(x, z, (m) => v2Stall(m, 2.3, kind, ca, '#fff8ec', i), Math.atan2(-x, -z)));
      // aradaki kasalar, çuvallar, sepetler, el arabası
      for (const [x, z, s, f] of [[-2.9, -5.9, 0.55, ['#e63946', '#ffb703']], [2.9, -6.0, 0.55, ['#7fb069', '#a7c957']], [-6.7, -2.6, 0.5, ['#f4a261']], [6.8, -2.4, 0.5, ['#9b5de5', '#c77dff']], [-6.6, 3.0, 0.5, ['#ffd166']], [6.7, 2.8, 0.5, ['#e63946']]]) { mb.push().T(x, 0, z, hs(x, z) * 2); P.crate(mb, s, '#b08455', { hk: 0.6, fill: f }); mb.pop(); }
      for (const [x, z, c, f] of [[-2.2, 6.4, '#d9c39a', '#e9c46a'], [2.3, 6.5, '#cdb48a', '#8a5a34'], [-7.0, -5.8, '#d9c39a', '#f4efe6']]) { mb.push().T(x, 0, z, hs(x, z) * 3); P.sack(mb, 1, c, { fill: f }); mb.pop(); }
      for (const [x, z, f] of [[0.0, 6.3, ['#e63946', '#ffb703', '#7fb069']], [-1.0, -6.6, ['#9b5de5', '#c77dff']], [1.0, -6.6, ['#ffd166', '#f9c74f']]]) { mb.push().T(x, 0, z); P.basket(mb, 0.28, 0.22, '#c9a46a', f); mb.pop(); }
      mb.push().T(-3.7, 0, 6.6, 0.3); mb.disc(0, 0.01, 0, 0.75, 0.55, 18, C('#d9b45a', 0), C('#c9a24a', 0)); for (let i = 0; i < 9; i++) { const a = (i / 6) * TAU, r = i < 6 ? 0.34 : 0.14, y = i < 6 ? 0.17 : 0.42; mb.sphereS(Math.cos(a) * r, y, Math.sin(a) * r * 0.8, 0.19, 0.17, 0.17, C('#5f8f3a', -0.2), 10, 7, (ux, uy, uz) => C(Math.floor((Math.atan2(uz, ux) + 3.2) * 2.2) % 2 ? '#5f8f3a' : '#3f6b2a', -0.2)); } mb.pop(); VK.blob(-3.7, 6.6, 0.8, 0.6, 0.3);
      for (const [x, z, c] of [[3.2, 6.5, '#ff6f91'], [3.75, 6.75, '#ffd166'], [3.5, 7.15, '#ffffff'], [4.1, 6.4, '#c77dff']]) { mb.push().T(x, 0, z); mb.lathe(0, 0, 0, [[0.15, 0], [0.18, 0.34], [0.19, 0.35]], 12, C('#9aa3ad', -0.7)); for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; limb(mb, [Math.cos(a) * 0.06, 0.3, Math.sin(a) * 0.06], [Math.cos(a) * 0.14, 0.62, Math.sin(a) * 0.14], [0.012, 0.01], C('#3f7d3a', 0), 3); mb.sphereS(Math.cos(a) * 0.15, 0.64, Math.sin(a) * 0.15, 0.06, 0.05, 0.06, C(c, -0.1), 6, 4); } mb.pop(); VK.blob(x, z, 0.24, 0.24, 0.3); }
      mb.push().T(6.9, 0, 5.9, -0.7); const HW = C('#2a6f97', -0.4); mb.box(-0.5, 0.35, -0.35, 0.5, 0.6, 0.35, HW); for (const s of [-1, 1]) { mb.push().T(0.3, 0.25, s * 0.38, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.22, 0.04, 0.04, 14, 4, C('#2b2b2b', -0.4)); mb.pop(); limb(mb, [-0.5, 0.55, s * 0.3], [-1.1, 0.75, s * 0.3], [0.02, 0.02], C('#8a5a34', 0), 4); } for (let k = 0; k < 8; k++) mb.sphereS(-0.3 + (k % 4) * 0.2, 0.68, -0.15 + Math.floor(k / 4) * 0.3, 0.1, 0.09, 0.1, C(['#e63946', '#7fb069', '#ffb703'][k % 3], -0.25), 8, 5); VK.sh(mb, 0, 0, 0.75, 0.5, 0.36); mb.pop();
      // tepede bayraklar ve şemsiyeler
      for (let k = 1; k < 4; k++) { const a = wXZ(k, -7.7, 0.2), b = wXZ(k, 7.7, 0.2); VK.flags(SEC(k), [a[0], 4.2, a[1]], [b[0], 4.2, b[1]], 30, 0.3, ['#e63946', '#ffbe0b', '#2f6b5a', '#3a86ff', '#ffffff']); }
      for (const [x, z] of [[-7.2, -7.2], [7.2, -7.2], [7.2, 7.2], [-7.2, 7.2]]) VK.tall(x, z, (m) => P.tree(m, 0.9, '#5a9a3c'));
    },
  },
  /* ---- Bil Bakalım: TV yarışma stüdyosu ---- */
  bil: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'console', tableO: { metal: '#1f2a5c', glow: '#ffd23f' }, chair: 'pod',
    rug: 'led', rugO: { glow: '#ffd23f', rug: '#101530' },
    L: VL2.studio, sky: ['#05060d', '#11142a', '#0a0c18'], sun: [0.2, 0.92, 0.3], shR: 8.6, parts: 'sparkle',
    post: { bloom: 0.75, th: 0.72, sat: 1.1, con: 0.14, vig: 0.46, tint: [0.98, 0.98, 1.05] },
    det: 0.06, detS: 0.4,
    logos: [[3, 0, 3.0, 1.0, 1.0]],
    build(mb) {
      VK.quad(mb, -40, -40, 40, 40, C('#06070d', 0), -0.006);
      VK.quad(mb, -RW - 7, -RW - 7, RW + 7, RW + 7, C('#121626', -0.85), 0);
      for (let i = -13; i <= 13; i++) { VK.quad(mb, i * 1.1 - 0.008, -RW - 7, i * 1.1 + 0.008, RW + 7, C('#1f2540', -0.6), 0.002); VK.quad(mb, -RW - 7, i * 1.1 - 0.008, RW + 7, i * 1.1 + 0.008, C('#1f2540', -0.6), 0.002); }
      // yuvarlak sahne: iki ışık halkası, ışın çizgileri
      mb.cyl(0, 0, 0, 4.3, 0.12, 4.3, 64, C('#1a1f38', -0.85), C('#1a1f38', -0.85));
      mb.lathe(0, 0.121, 0, [[4.3, 0], [4.18, 0]], 72, C('#4cc9f0', 1)); mb.lathe(0, 0.122, 0, [[3.65, 0], [3.58, 0]], 72, C('#ff4fd8', 1));
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, ca = Math.cos(a), sa = Math.sin(a); mb.quadN([ca * 3.66 - sa * 0.03, 0.123, sa * 3.66 + ca * 0.03], [ca * 4.17 - sa * 0.03, 0.123, sa * 4.17 + ca * 0.03], [ca * 4.17 + sa * 0.03, 0.123, sa * 4.17 - ca * 0.03], [ca * 3.66 + sa * 0.03, 0.123, sa * 3.66 - ca * 0.03], UPV, UPV, UPV, UPV, C(k % 2 ? '#ffd23f' : '#7b5cff', 1)); }
      VK.glow(0, 0.13, 0, 4.6, '#7b5cff', 0.08, 'h');
      mb.cyl(0, 0.03, 0, 4.305, 0.095, 4.305, 72, C('#4cc9f0', 1), C('#4cc9f0', 1), '');
      // sahne çevresi: ışıklı halkalar, ışın çizgileri, renkli spot havuzları, dikey ışık sütunları
      mb.lathe(0, 0.004, 0, [[5.22, 0], [5.14, 0]], 96, C('#ff4fd8', 1)); mb.lathe(0, 0.004, 0, [[6.42, 0], [6.37, 0]], 96, C('#3b6cff', 1));
      for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU + 0.13, ca = Math.cos(a), sa = Math.sin(a), r0 = 4.55, r1 = k % 2 ? 5.0 : 6.3, w = 0.022; mb.quadN([ca * r0 - sa * w, 0.0042, sa * r0 + ca * w], [ca * r1 - sa * w, 0.0042, sa * r1 + ca * w], [ca * r1 + sa * w, 0.0042, sa * r1 - ca * w], [ca * r0 + sa * w, 0.0042, sa * r0 - ca * w], UPV, UPV, UPV, UPV, C(k % 2 ? '#3b2f7a' : '#4a3a9a', 1)); }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.39, c = ['#4cc9f0', '#ff4fd8', '#ffd23f', '#7b5cff'][k % 4]; VK.pool([Math.cos(a) * 5.7, 0, Math.sin(a) * 5.7], 1.5, c, 0.17); }
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4, x = Math.cos(a) * 5.9, z = Math.sin(a) * 5.9, c = ['#4cc9f0', '#ff4fd8', '#ffd23f', '#7b5cff'][k], sk = vSecOf(x, z); VK.glow(x, 2.1, z, 0.5, c, 0.06, 'z', 0, 0, 2.4, sk); VK.glow(x, 2.1, z, 0.5, c, 0.06, 'x', 0, 0, 2.4, sk); }
      const WALL = { wall: '#151a2e', H: 6.0, dado: '#0e1120', dadoH: 0.6, base: '#06070d', crown: '#0e1120', pat: 'tile', pc: ['#1b2140', '#181d38'], ps: 0.6, tileE: -0.5 };
      // 0: arka — LED ekran duvarı, tabela, sunucu kürsüsü
      vWall(0, WALL, []);
      vSign('screen', '#15171c', '#ff4fd8');
      { const s0 = SEC(0); for (let i = 0; i < 10; i++) for (let j = 0; j < 5; j++) { const x = -7.2 + i * 1.6, y = 0.9 + j * 0.9; if (Math.abs(x + 0.8) < 2.6 && y < 3.3) continue; const c = ['#3a1f7a', '#1f3a7a', '#7a1f5a', '#1f5a7a'][(i + j * 3) % 4]; s0.box(x + 0.04, y, -7.79, x + 1.56, y + 0.86, -7.74, C(c, 1)); if ((i + j) % 3 === 0) s0.sphereS(x + 0.8, y + 0.43, -7.73, 0.25, 0.25, 0.002, C(['#ffd23f', '#4cc9f0', '#ff4fd8'][(i + j) % 3], 1), 12, 4); } }
      VK.wglow(0, 0, 0.3, 2.2, 7, '#6a5cff', 0.1, 2.5);
      { const s0 = SEC(0); s0.box(-7.8, 5.2, -7.6, 7.8, 5.4, -7.4, C('#2b2f3a', -0.8)); for (let i = 0; i < 9; i++) { const x = -6.4 + i * 1.6; s0.push().T(x, 5.1, -7.3, 0, -0.9); s0.cyl(0, -0.22, 0, 0.16, 0.1, 0.12, 10, C('#22252c', -0.7), C('#22252c', -0.7)); s0.cyl(0, -0.225, 0, 0.14, -0.215, 0.14, 10, C(['#ff4fd8', '#4cc9f0', '#ffd23f'][i % 3], 1), C(['#ff4fd8', '#4cc9f0', '#ffd23f'][i % 3], 1)); s0.pop(); } }
      wAt(mb, 0, 4.9, 1.6, 0, -0.35);
      mb.frustum(-0.55, 0.55, -0.35, 0.35, 0, -0.42, 0.42, -0.25, 0.25, 1.1, C('#1f2a5c', -0.6)); mb.box(-0.5, 0.35, 0.29, 0.5, 0.75, 0.31, C('#ffd23f', 1)); mb.rbox(-0.6, 1.1, -0.38, 0.6, 1.16, 0.38, 0.02, C('#c9ced6', -0.85), 1);
      mb.push().T(0.2, 1.16, 0); mb.cyl(0, 0, 0, 0.012, 0.3, 0.012, 6, C('#2b2b2b', -0.6), C('#2b2b2b', -0.6)); mb.sphereS(0, 0.34, 0, 0.045, 0.06, 0.045, C('#2b2b2b', -0.6), 8, 5); mb.pop();
      VK.sh(mb, 0, 0, 0.7, 0.45, 0.4); mb.pop();
      // 3: sol — tribün
      vWall(3, WALL, []);
      VK.inSec(3, (s) => { wAt(s, 3, 0, 2.4); v2Bleachers(s, 7.5, 3); s.pop(); });
      // 1: sağ — ödül kürsüsü, hediye paketleri, kamera vinci
      vWall(1, WALL, []);
      { const mb = SEC(1); VSK = 1; wAt(mb, 1, 0, 1.2);
      mb.cyl(0, 0, 0, 0.75, 0.3, 0.75, 24, C('#1f2a5c', -0.7), C('#c9a34a', -0.85)); mb.cyl(0, 0.3, 0, 0.5, 0.9, 0.5, 20, C('#ffffff', -0.5), C('#ffffff', -0.5));
      mb.push().T(0, 0.9, 0); mb.cyl(0, 0, 0, 0.2, 0.1, 0.18, 14, C('#c9a34a', -0.9), C('#c9a34a', -0.9)); mb.cyl(0, 0.1, 0, 0.05, 0.3, 0.05, 10, C('#c9a34a', -0.9), C('#c9a34a', -0.9)); mb.lathe(0, 0.3, 0, [[0.05, 0], [0.24, 0.12], [0.26, 0.42], [0.22, 0.44]], 18, C('#ffd23f', -0.92)); for (const s of [-1, 1]) { mb.push().T(s * 0.27, 0.58, 0, 0, 0, s * 0.4); mb.torusN(0, 0, 0, 0.09, 0.02, 0.02, 12, 4, C('#ffd23f', -0.92)); mb.pop(); } mb.pop();
      const pv = mb.p(0, 1.6, 0); VK.halo(pv, 0.9, '#ffe9a0', 0.25); VK.pool([pv[0], 0, pv[2]], 1.6, '#ffe9a0', 0.12);
      for (const [x, z, s, c, r] of [[-1.3, 0.2, 0.42, '#e63946', '#ffd23f'], [-1.0, -0.4, 0.32, '#3a86ff', '#ffffff'], [1.2, 0.1, 0.4, '#06d6a0', '#ff4fd8'], [1.4, -0.5, 0.3, '#9b5de5', '#ffd23f']]) { mb.push().T(x, 0, z, x); mb.rbox(-s / 2, 0, -s / 2, s / 2, s, s / 2, 0.03, C(c, -0.3), 2); mb.box(-s / 2 - 0.005, 0, -0.04, s / 2 + 0.005, s + 0.005, 0.04, C(r, -0.5)); mb.box(-0.04, 0, -s / 2 - 0.005, 0.04, s + 0.005, s / 2 + 0.005, C(r, -0.5)); mb.torusN(0, s + 0.04, 0, 0.07, 0.025, 0.02, 10, 3, C(r, -0.5)); mb.pop(); }
      VK.sh(mb, 0, 0, 1.0, 1.0, 0.38); mb.pop(); VSK = -1; }
      // 2: ön — yönetmen masası ve monitörler
      vWall(2, WALL, [{ u0: -0.6, u1: 0.6, y0: 0, y1: 2.4 }]);
      vDoor(2, 0, { w: 1.2, h: 2.4, frame: '#2b2f3a', door: '#1f2540', knob: '#c9ced6' });
      { const s2 = SEC(2); wAt(s2, 2, 0, 0, 2.7); s2.rbox(-0.7, -0.14, 0, 0.7, 0.14, 0.06, 0.04, C('#1b1b1e', -0.5), 2); s2.box(-0.6, -0.08, 0.06, 0.6, 0.08, 0.064, C('#ff3b30', 1)); s2.pop(); VK.wglow(2, 0, 0.1, 2.7, 0.9, '#ff3b30', 0.2, 0.4); }
      wAt(mb, 2, -3.6, 1.0); P.counter(mb, 3.0, 0.82, 0.8, '#1b1d2a', '#2b2f3a', { rail: false }); for (let i = 0; i < 4; i++) { mb.push().T(-1.05 + i * 0.7, 0.82, -0.2, 0, -0.2); mb.rbox(-0.3, 0, -0.03, 0.3, 0.38, 0.03, 0.02, C('#14161b', -0.6), 2); mb.box(-0.27, 0.03, 0.03, 0.27, 0.35, 0.034, C(['#4cc9f0', '#ff4fd8', '#5be3a9', '#ffd23f'][i], 1)); mb.pop(); } for (let i = 0; i < 12; i++) mb.cyl(-1.3 + i * 0.22, 0.82, 0.2, 0.03, 0.85, 0.03, 8, C(['#ff3b30', '#5be3a9', '#ffd23f'][i % 3], 1), C(['#ff3b30', '#5be3a9', '#ffd23f'][i % 3], 1)); mb.pop();
      // stüdyo kameraları ve ışıkları
      for (const [x, z] of [[-2.6, 5.4], [2.8, 5.2], [5.6, -2.2]]) VK.tall(x, z, (m) => v2StudioCam(m), Math.atan2(-x, -z));
      for (const [x, z, c] of [[-5.6, -5.6, '#ff4fd8'], [5.6, -5.4, '#4cc9f0'], [-6.2, 5.6, '#ffd23f'], [6.0, 5.6, '#ff4fd8']]) VK.tall(x, z, (m) => v2SpotStand(m, c, 0.75), Math.atan2(-x, -z));
    },
  },
  /* ---- Vampir Köylü: gece köy meydanı (ışığı oyun yönetir) ---- */
  vkl: {
    room: 1, raw: 0, wallH: 6.0, secShadow: 1,
    table: 'stump', chair: 'stump', rug: 'patch', rugO: { rug: '#4a3a2a' },
    L: VL.night, sky: ['#0b1430', '#1b2a4a', '#121828'], shR: 9.0, parts: 'fireflies',
    post: { bloom: 0.6, th: 0.75, sat: 1.06, con: 0.12, vig: 0.42 },
    det: 0.16, detS: 0.55,
    logos: [[3, 0, 2.6, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#2f4a2a', '#253d22', 0.3);
      // arnavut kaldırımı meydan (daire) ve toprak kenar
      mb.disc(0, 0.004, 0, 7.4, 7.4, 48, C('#5c5248', 0), C('#4a4038', 0));
      for (let r = 0; r < 8; r++) { const R0 = 1.0 + r * 0.82, n = Math.round((TAU * R0) / 0.45); for (let i = 0; i < n; i++) { const a = (i / n) * TAU + r * 0.3, a1 = ((i + 1) / n) * TAU + r * 0.3 - 0.02, R1 = R0 + 0.74; const c = C(['#7a7268', '#6f675e', '#857c72', '#686056'][Math.floor(hs(i, r) * 4)], -0.1); mb.quadN([Math.cos(a) * R0, 0.008, Math.sin(a) * R0], [Math.cos(a1) * R0, 0.008, Math.sin(a1) * R0], [Math.cos(a1) * R1, 0.008, Math.sin(a1) * R1], [Math.cos(a) * R1, 0.008, Math.sin(a) * R1], UPV, UPV, UPV, UPV, c); } }
      // çevredeki evler (kenarlara bağlı, kamera tarafındaki iner)
      const HS = [['#e8d8b8', '#8c3b2a'], ['#d9c6a3', '#5a3a2a'], ['#efe2c6', '#a0522d'], ['#d2b48c', '#6b3a2a']];
      for (let k = 0; k < 4; k++) { const s = SEC(k); for (const [u, w, h] of [[-4.6, 4.0, 3.2], [0.6, 3.4, 3.6], [5.2, 3.6, 3.0]]) { if (k === 0 && Math.abs(u) < 2.5) continue; wAt(s, k, u, 0.0); v2House(s, w, h, HS[(k + Math.round(u)) & 3][0], HS[(k + Math.round(u)) & 3][1], k * 5 + Math.round(u), { flowers: (k + Math.round(u)) % 2 === 0, sec: k, doorX: (u > 0 ? -0.6 : 0.6) }); s.pop(); } }
      // tabela: iki direkli ahşap duyuru panosu
      vSign('frame', '#4a2e1c', '#efe2c6', { lamps: false });
      { const s0 = SEC(0); for (const x of [-1.95, 1.95]) s0.box(x - 0.07, 0, -7.84, x + 0.07, 3.3, -7.7, C('#4a2e1c', 0)); s0.box(-2.2, 3.0, -7.86, 2.2, 3.12, -7.6, C('#4a2e1c', 0)); s0.push().T(0, 3.12, -7.73); s0.lathe(0, 0, 0, [[2.3, 0], [0, 0.5]], 4, C('#5a3a2a', 0)); s0.pop(); }
      // kuyu, saman, el arabası, fıçılar, kabaklar, fenerler, kamp ateşi, ağaçlar
      { const kW = vSecOf(-4.6, -4.2), mb = SEC(kW); VSK = kW; mb.push().T(-4.6, 0, -4.2);
      mb.lathe(0, 0, 0, [[0.85, 0], [0.88, 0.8], [0.72, 0.82], [0.7, 0.2]], 20, (i, a) => C(Math.floor(a * 10 / TAU + i) % 2 ? '#8a8174' : '#7a7266', 0));
      mb.cyl(0, 0.2, 0, 0.7, 0.22, 0.7, 18, C('#1b2a3a', -0.9), C('#1b2a3a', -0.9));
      for (const s of [-1, 1]) mb.box(s * 0.78 - 0.06, 0.8, -0.06, s * 0.78 + 0.06, 2.2, 0.06, C('#4a2e1c', 0));
      mb.push().T(0, 1.75, 0, 0, 0, Math.PI / 2); mb.cyl(0, -0.8, 0, 0.06, 0.8, 0.06, 8, C('#5a3a2a', 0), C('#5a3a2a', 0)); mb.pop();
      mb.push().T(0, 2.2, 0); mb.lathe(0, 0, 0, [[1.1, 0], [0.0, 0.7]], 4, C('#6b3a2a', -0.1)); mb.pop();
      limb(mb, [0, 1.75, 0], [0, 1.05, 0], [0.01, 0.01], C('#c9a46a', 0), 3, null, 1); mb.cyl(0, 0.85, 0, 0.13, 1.05, 0.15, 10, C('#6b4a2e', 0), C('#6b4a2e', 0));
      VK.sh(mb, 0, 0, 1.0, 1.0, 0.42); mb.pop(); VSK = -1; }
      for (const [x, z, ry] of [[4.8, -4.0, 0.4], [-5.6, 2.2, 1.2]]) { mb.push().T(x, 0, z, ry); mb.rbox(-0.6, 0, -0.38, 0.6, 0.7, 0.38, 0.12, C('#d9b45a', 0), 2); for (const xx of [-0.3, 0.3]) mb.box(xx - 0.025, 0, -0.39, xx + 0.025, 0.71, 0.39, C('#8a6a2a', 0)); VK.sh(mb, 0, 0, 0.75, 0.5, 0.4); mb.pop(); }
      mb.push().T(5.2, 0, 3.4, -0.6); mb.box(-0.9, 0.45, -0.55, 0.9, 0.85, 0.55, C('#6b4a2e', 0)); for (const s of [-1, 1]) { mb.push().T(0.35, 0.45, s * 0.6, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.42, 0.05, 0.05, 16, 4, C('#3a2a1e', 0)); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], [0.025, 0.025], C('#3a2a1e', 0), 3, null, 1); } mb.pop(); } limb(mb, [-0.9, 0.7, 0], [-1.8, 0.4, 0], [0.04, 0.04], C('#4a2e1c', 0), 4); mb.rbox(-0.8, 0.85, -0.5, 0.8, 1.35, 0.5, 0.2, C('#d9b45a', 0), 2); for (let k = 0; k < 3; k++) mb.sphereS(-0.4 + k * 0.4, 1.4, 0.15, 0.2, 0.17, 0.2, C('#e07a1f', -0.2), 10, 7); VK.sh(mb, 0, 0, 1.1, 0.7, 0.4); mb.pop();
      for (const [x, z] of [[-3.0, 5.6], [-2.4, 6.0], [3.4, -6.0], [-6.2, -1.6]]) { mb.push().T(x, 0, z); mb.sphereS(0, 0.2, 0, 0.26, 0.2, 0.26, C('#e07a1f', -0.2), 12, 8, (ux, uy, uz) => C(Math.floor((Math.atan2(uz, ux) + 3.2) * 1.6) % 2 ? '#e07a1f' : '#c8661a', -0.2)); mb.cyl(0, 0.38, 0, 0.03, 0.47, 0.025, 6, C('#3f5a2a', 0), C('#3f5a2a', 0)); mb.pop(); VK.blob(x, z, 0.3, 0.3, 0.38); }
      for (const [x, z] of [[-6.4, -4.4], [6.3, -1.0], [-1.8, -6.6]]) { mb.push().T(x, 0, z, hs(x, z) * 3); P.barrel(mb, 0.34, 0.85, '#6b4a2e', '#2b2b2b'); mb.pop(); }
      for (const [x, z] of [[-3.6, -6.2], [3.8, -6.2], [-6.4, 3.4], [6.4, 3.6], [-0.6, 6.6], [3.0, 6.4]]) VK.tall(x, z, (m) => { m.box(-0.05, 0, -0.05, 0.05, 2.0, 0.05, C('#3a2a1e', 0)); m.box(-0.05, 1.95, -0.05, 0.45, 2.02, 0.05, C('#3a2a1e', 0)); m.push().T(0.4, 1.5, 0); P.lantern(m, '#2b2b2b', '#ffc46b', { r: 0.7, a: 0.34, pool: 1 }); m.pop(); });
      mb.push().T(-4.4, 0, 4.6); VK.fire(mb, 1.2); mb.pop(); VK.glow(-4.4, 0.02, 4.6, 2.4, '#ff9a3c', 0.2, 'h', 1); VK.halo([-4.4, 0.6, 4.6], 1.0, '#ff9a3c', 0.3, 1);
      for (const [x, z, ry] of [[-5.6, 5.2, 0.8], [-3.4, 3.6, 0.3]]) { mb.push().T(x, 0.2, z, ry, 0, Math.PI / 2); mb.cyl(0, -0.7, 0, 0.2, 0.7, 0.2, 10, C('#5a3a2a', 0), C('#c49a6c', 0)); mb.pop(); }
      for (const [x, z, s] of [[-7.4, -7.4, 1.2], [7.4, -7.4, 1.0], [7.4, 7.4, 1.1], [-7.4, 7.4, 1.0]]) VK.tall(x, z, (m) => P.tree(m, s, '#2f5a3a', { kind: 'pine' }));
    },
  },
  /* ---- Anlat Bakalım: güneşli plaj ---- */
  anb: {
    room: 1, raw: 1, wallH: 7.2, secShadow: 1,
    table: 'wood', tableO: { wood: '#c9a37a' }, chair: 'beach', rug: 'towel', rugO: { rug: '#00a6a6', rugB: '#ffffff' },
    L: VL2.beach, sky: ['#2f3a78', '#f2885a', '#f9c79a'], sun: [0.62, 0.55, 0.35], shR: 9.0, parts: null,
    post: { bloom: 0.4, th: 0.85, sat: 1.06, con: 0.15, vig: 0.34, tint: [1.02, 0.99, 0.97] },
    det: 0.2, detS: 0.7,
    logos: [[1, 2.2, 1.6, 0.8, 0.8]],
    build(mb) {
      const SH = -5.9;
      VK.quad(mb, -60, SH, 60, 60, C('#d9bf94', 0), -0.02); VK.noise(mb, -14, SH, 14, 14, 1.0, '#dfc59a', '#cfb487', 0.3);
      for (let k = 0; k < 18; k++) { const z = SH + 0.6 + k * 0.75, x0 = -14 + hs(k, 1) * 4; for (let j = 0; j < 7; j++) { const xa = x0 + j * 4, L = 2.4 + hs(j, k) * 1.2; VK.quad(mb, xa, z, xa + L, z + 0.045, C('#d6b483', 0), -0.018); } }
      VK.noise(mb, -40, SH - 0.9, 40, SH + 0.02, 1.0, '#b48a58', '#a47b4b', 0.5, -0.3, -0.012);
      { const n = UPV, d = mb.d, Q4 = (x0, z0, x1, z1, y, c0, c1) => mb.quadN([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], n, n, n, n, c0, c0, c1, c1); Q4(-60, SH - 3.4, 60, SH - 0.85, -0.03, C('#2f9fb8', -0.85), C('#43c3cf', -0.85)); Q4(-60, SH - 9, 60, SH - 3.3, -0.05, C('#1d6e9a', -0.85), C('#2a95b6', -0.85)); Q4(-60, -80, 60, SH - 8.9, -0.05, C('#243f72', -0.85), C('#1d6e9a', -0.85)); }
      for (const [x, z, r, a] of [[3.2, -11.5, 1.3, 0.2], [3.9, -15.5, 1.5, 0.18], [4.7, -20.5, 1.7, 0.15], [5.6, -27, 2.0, 0.12]]) VK.pool([x, 0, z], r, '#ffb070', a, r * 2.4);
      for (let k = 0; k < 26; k++) { const x0 = -40 + k * 3.2 + hs(k, 7) * 0.8, z = SH - 0.9 + Math.sin(k * 1.7) * 0.05; VK.quad(mb, x0, z - 0.08, x0 + 2.5 + hs(k, 8), z + 0.07, C('#fff4e6', 0.4), -0.006); }
      for (let k = 0; k < 8; k++) { const z = SH - 1.8 - k * 0.9 - k * k * 0.18, x0 = -34 + hs(k, 1) * 8; VK.quad(mb, x0, z - 0.05, x0 + 60 - hs(k, 2) * 10, z + 0.05, C('#e8fbff', 0.5), k < 2 ? -0.025 : -0.045); }
      // iskele ve tabela
      const DY = 0.26, Wk = C('#8a6238', 0);
      for (let z = -5.2, k = 0; z > -10.6; z -= 0.34, k++) mb.box(-2.3, DY - 0.07, z - 0.3, 2.3, DY, z, C(k % 3 ? '#c49461' : '#b4844f', -0.2));
      for (const x of [-2.15, 2.15]) for (let z = -5.4; z > -10.7; z -= 1.6) mb.cyl(x, -0.6, z, 0.11, DY + 0.55, 0.11, 8, Wk, Wk);
      for (const x of [-2.15, 2.15]) limb(mb, [x, DY + 0.45, -5.4], [x, DY + 0.45, -10.4], [0.03, 0.03], C('#e9dcc0', 0), 4);
      for (const x of [-2.15, 2.15]) { mb.cyl(x, DY, -5.4, 0.045, 1.25, 0.04, 8, Wk, Wk); P.stringLights(mb, [[x, 1.2, -5.4], [x * 0.9, 2.75, -7.78]], ['#ffd38a', '#ff9e5e', '#ffe9b0', '#ff7ab8'], 7, 0.18, 0.04); P.stringLights(mb, [[x, 1.2, -5.4], [x, 1.15, -10.4]], ['#ffe9b0', '#ffd38a', '#ff9e5e'], 9, 0.22, 0.035); }
      mb.push().T(2.33, DY + 0.3, -7.2, Math.PI / 2, Math.PI / 2); mb.torusN(0, 0, 0, 0.3, 0.08, 0.08, 16, 6, C('#e63946', -0.3), (a) => C(Math.floor(a / (Math.PI / 2) + 0.001) % 2 ? '#ffffff' : '#e63946', -0.3)); mb.pop();
      vSign('frame', '#a8743f', '#fff8ec', { lamps: false });
      { const s0 = SEC(0); for (const x of [-1.95, 1.95]) s0.box(x - 0.07, DY - 0.1, -7.86, x + 0.07, 3.1, -7.72, C('#a8743f', 0)); }
      // sol: renkli kulübeler (kenar 3)
      { const s3 = SEC(3); for (const [u, c] of [[-4.4, '#e63946'], [-1.4, '#2a9d8f'], [1.6, '#ffbe0b'], [4.6, '#3a86ff']]) { wAt(s3, 3, u, 0.2);
        for (let i = 0; i < 8; i++) s3.box(-1.1 + i * 0.275, 0.1, -1.4, -1.1 + i * 0.275 + 0.26, 2.2, 0, C(i % 2 ? c : '#ffffff', 0));
        s3.box(-0.4, 0.1, 0.0, 0.4, 1.9, 0.02, C('#3a2a1e', 0)); s3.box(-1.25, 0.0, -1.5, 1.25, 0.12, 0.4, C('#c49461', 0));
        const nL = vnorm([0, 1, 0.5]); s3.quadN([-1.3, 2.2, 0.25], [1.3, 2.2, 0.25], [1.3, 2.9, -0.7], [-1.3, 2.9, -0.7], nL, nL, nL, nL, C(c, -0.1)); s3.quadN([-1.3, 2.2, -1.65], [1.3, 2.2, -1.65], [1.3, 2.9, -0.7], [-1.3, 2.9, -0.7], nL, nL, nL, nL, C(vDark(c, 0.15), -0.1));
        s3.pop(); } }
      // sağ: cankurtaran kulesi, kayalar, deniz feneri uzakta
      { const kT = vSecOf(6.4, -2.6), mb = SEC(kT); VSK = kT; mb.push().T(6.4, 0, -2.6, -Math.PI / 2 + 0.3);
      for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) limb(mb, [x, 0, z], [x * 0.7, 1.8, z * 0.7], [0.07, 0.06], C('#f4efe6', -0.2), 6);
      mb.box(-0.75, 1.8, -0.75, 0.75, 1.9, 0.75, C('#e63946', -0.3)); mb.box(-0.7, 1.9, -0.7, 0.7, 2.4, -0.62, C('#ffffff', -0.2)); for (const s of [-1, 1]) mb.box(s * 0.7 - 0.04, 1.9, -0.7, s * 0.7 + 0.04, 2.9, 0.7, C('#ffffff', -0.2));
      mb.push().T(0, 2.9, 0); mb.lathe(0, 0, 0, [[1.05, 0], [0, 0.6]], 4, C('#e63946', -0.2)); mb.pop();
      for (let i = 0; i < 6; i++) mb.box(-0.4, 0.3 * i, 0.72, 0.4, 0.3 * i + 0.05, 0.82, C('#f4efe6', -0.2));
      mb.push().T(0.9, 1.4, 0.9, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.28, 0.08, 0.08, 16, 6, C('#ff8a3d', -0.3)); mb.pop();
      VK.sh(mb, 0, 0, 1.0, 1.0, 0.3); mb.pop(); VSK = -1; }
      for (const [x, z, s] of [[7.2, 1.2, 1.3], [6.6, 2.4, 0.8], [7.4, -5.0, 1.0]]) VK.tall(x, z, (m) => DECOR.rock(m), hs(x, z) * 6, s);
      // ön: hasır çatılı plaj barı, tabureler, sörf tahtaları
      { const mb = SEC(2); VSK = 2; mb.push().T(0, 0, 6.6, Math.PI);
      P.counter(mb, 3.6, 1.05, 0.7, '#a8743f', '#e9d6b0', { rail: false });
      for (const x of [-1.7, 1.7]) mb.box(x - 0.07, 0, -0.4, x + 0.07, 2.6, -0.26, C('#8a5a34', 0));
      { const W2 = 2.15, D2 = 1.2, yE = 2.5, yR = 3.0, a = yR - yE, nF = vnorm([0, D2, a]), nB = vnorm([0, D2, -a]), n = 10; mb.push().T(0, 0, -0.1);
        for (let i = 0; i < n; i++) { const x0 = -W2 + (i * 2 * W2) / n, x1 = x0 + (2 * W2) / n, c = C(i % 2 ? '#d9b45a' : '#c9a24a', 0); mb.quadN([x0, yE, D2], [x1, yE, D2], [x1, yR, 0], [x0, yR, 0], nF, nF, nF, nF, c); mb.quadN([x0, yE, -D2], [x1, yE, -D2], [x1, yR, 0], [x0, yR, 0], nB, nB, nB, nB, c); }
        for (const s of [-1, 1]) { const nS = vnorm([s, 0.3, 0]); mb.triN([s * W2, yE, D2], [s * W2, yE, -D2], [s * W2, yR, 0], nS, nS, nS, C('#b8913f', 0)); }
        for (let i = 0; i < 24; i++) { const x = -W2 + ((i + 0.5) * 2 * W2) / 24; for (const s of [-1, 1]) { const nf = vnorm([0, 0.2, s]); mb.triN([x - 0.1, yE + 0.01, s * D2], [x + 0.1, yE + 0.01, s * D2], [x + (hs(i, s) - 0.5) * 0.06, yE - 0.17, s * (D2 + 0.04)], nf, nf, nf, C(i % 2 ? '#c9a24a' : '#b8913f', 0)); } }
        mb.box(-W2 - 0.06, yR - 0.05, -0.06, W2 + 0.06, yR + 0.05, 0.06, C('#8a5a34', 0)); mb.pop(); }
      mb.box(-1.2, 1.55, -0.12, 1.2, 1.9, -0.06, C('#2a9d8f', -0.2)); mb.box(-1.1, 1.6, -0.13, 1.1, 1.85, -0.125, C('#fff8ec', 0.4));
      for (let i = 0; i < 6; i++) mb.lathe(-1.3 + i * 0.5, 1.05, 0.05, [[0.04, 0], [0.045, 0.14], [0.02, 0.2]], 8, C(['#ff6f91', '#ffd166', '#06d6a0'][i % 3], -0.6));
      mb.pop();
      for (const x of [-1.2, 0, 1.2]) { mb.push().T(x, 0, 5.6); P.stool(mb, 0.78, '#2a9d8f', '#a8743f'); mb.pop(); }
      VSK = -1; }
      VK.tall(3.6, 6.9, (mb) => { for (let i = 0; i < 3; i++) { mb.push().T(i * 0.45, 0, 0, 0, 0, -0.12); mb.rbox(-0.22, 0, -0.06, 0.22, 2.0, 0.06, 0.2, C(['#ff6f61', '#00a6a6', '#ffd166'][i], -0.4), 3); mb.box(-0.025, 0.1, 0.061, 0.025, 1.9, 0.065, C('#ffffff', -0.4)); mb.pop(); } VK.sh(mb, 0.45, 0, 0.8, 0.3, 0.3); }, 0.2);
      // salon: şemsiyeler, şezlonglar, havlular, kale, top, palmiyeler, voleybol filesi
      for (const [x, z, a, b, ry] of [[-5.2, -3.6, '#ff6f61', '#ffffff', 0.5], [5.0, 4.2, '#00a6a6', '#ffffff', -2.2], [-5.0, 4.4, '#ffd166', '#ff6f91', 2.4], [4.6, -4.4, '#ff8fc7', '#ffffff', -0.7]]) { VK.tall(x, z, (m) => { m.push().T(0, 0, 0, 0, 0, 0.12); v2BeachUmb(m, a, b); m.pop(); }); VK.blob(x + 0.12, z, 1.0, 1.0, 0.18); mb.push().T(x + Math.cos(ry) * 0.9, 0, z + Math.sin(ry) * 0.9, -ry + Math.PI / 2); v2Lounger(mb, a); mb.pop(); }
      for (const [x, z, ry, c] of [[-2.6, -5.0, 0.3, '#3a86ff'], [3.2, -4.8, -0.4, '#ff6f91']]) { mb.push().T(x, 0, z, ry); for (let i = 0; i < 6; i++) VK.quad(mb, -0.45, -0.85 + i * 0.28, 0.45, -0.57 + i * 0.28, C(i % 2 ? c : '#ffffff', 0), 0.004); mb.pop(); }
      mb.push().T(-2.4, 0, 5.6); v2SandCastle(mb, 1.1); mb.pop();
      mb.push().T(-1.3, 0, 6.0, 0.4); mb.cyl(0, 0, 0, 0.16, 0.3, 0.2, 12, C('#ff6f61', -0.4), C('#ff6f61', -0.4), 'b'); mb.pop();
      // alçak ayrıntılar: buzluk, plaj çantası ve terlikler, simit, frizbi, havlu ve kitap, ayak izleri, kumul otları, şamandıralar, yelkenli
      for (const [x, z, ry, c] of [[-4.1, -5.7, 0.4, '#2a6f97'], [5.9, 2.9, -0.8, '#e63946']]) { mb.push().T(x, 0, z, ry); v2Cooler(mb, c); mb.pop(); VK.blob(x, z, 0.42, 0.32, 0.34); }
      mb.push().T(4.0, 0, -5.5, -0.5); mb.lathe(0, 0, 0, [[0.22, 0], [0.26, 0.32], [0.2, 0.36]], 10, C('#ffd166', -0.1)); limb(mb, [-0.18, 0.34, 0], [0, 0.56, 0], [0.012, 0.012], C('#8a5a34', 0), 3); limb(mb, [0, 0.56, 0], [0.18, 0.34, 0], [0.012, 0.012], C('#8a5a34', 0), 3); mb.pop(); VK.blob(4.0, -5.5, 0.3, 0.3, 0.3);
      for (const [x, z, ry] of [[2.4, -5.7, 0.3], [2.62, -5.62, 0.42]]) { mb.push().T(x, 0.006, z, ry); mb.sphereS(0, 0, 0, 0.06, 0.012, 0.14, C('#ff6f91', -0.3), 8, 3); limb(mb, [0, 0.012, -0.06], [0.04, 0.03, 0.02], [0.008, 0.008], C('#ffffff', -0.3), 3); limb(mb, [0, 0.012, -0.06], [-0.04, 0.03, 0.02], [0.008, 0.008], C('#ffffff', -0.3), 3); mb.pop(); }
      mb.push().T(1.5, 0.08, -6.5, 0.3); mb.torusN(0, 0, 0, 0.32, 0.11, 0.08, 18, 8, C('#ff6f91', -0.5), (a2) => C(Math.floor(a2 / (TAU / 8)) % 2 ? '#ffffff' : '#ff6f91', -0.5)); mb.pop(); VK.blob(1.5, -6.5, 0.45, 0.45, 0.25);
      mb.push().T(4.5, 0.01, 1.9); mb.cyl(0, 0, 0, 0.17, 0.025, 0.17, 16, C('#06d6a0', -0.4), C('#06d6a0', -0.4)); mb.pop();
      mb.push().T(-4.9, 0, 1.3, 1.35); for (let i = 0; i < 6; i++) VK.quad(mb, -0.45, -0.85 + i * 0.28, 0.45, -0.57 + i * 0.28, C(i % 2 ? '#ffbe0b' : '#ffffff', 0), 0.004); mb.box(-0.14, 0.004, 0.25, 0.14, 0.03, 0.45, C('#3a86ff', 0)); mb.box(-0.13, 0.004, 0.26, 0.13, 0.031, 0.44, C('#f4efe6', 0)); mb.pop();
      for (let i = 0; i < 14; i++) { const t = i / 13, x = 0.6 + Math.sin(t * 2.4) * 1.4 + (i % 2 ? 0.13 : -0.13), z = -7.0 + t * 2.4; mb.sphereS(x, 0.004, z, 0.05, 0.004, 0.09, C('#d9ad6a', 0), 6, 2); }
      for (const [x, z, n] of [[-6.6, -2.0, 7], [-6.9, 3.0, 6], [6.9, -0.4, 6], [-2.0, 7.2, 5], [6.2, 6.6, 6]]) for (let i = 0; i < n; i++) { const a2 = hs(i, x) * TAU, rr = hs(i, z) * 0.35; limb(mb, [x + Math.cos(a2) * rr, 0, z + Math.sin(a2) * rr], [x + Math.cos(a2) * (rr + 0.18), 0.32 + hs(i, 3) * 0.2, z + Math.sin(a2) * (rr + 0.18)], [0.018, 0.004], C(i % 3 ? '#9aa85a' : '#b8b06a', 0), 3); }
      for (const [x, z] of [[-5.0, -10.4], [3.0, -11.2], [9.0, -10.0]]) { mb.sphereS(x, 0.0, z, 0.22, 0.26, 0.22, C('#ffffff', -0.4), 10, 6, (ux, uy) => C(uy > 0.2 ? '#e63946' : '#ffffff', -0.4)); }
      mb.push().T(-9.0, 0, -17.0, 0.4); mb.box(-1.1, -0.1, -0.35, 1.1, 0.3, 0.35, C('#ffffff', -0.3)); mb.box(-1.12, 0.22, -0.37, 1.12, 0.3, 0.37, C('#2a6f97', -0.3)); mb.cyl(0, 0.3, 0, 0.04, 3.0, 0.04, 6, C('#c9a46a', 0), C('#c9a46a', 0)); { const nS = vnorm([0, 0, 1]); mb.triN([0.05, 0.6, 0], [0.05, 2.9, 0], [1.2, 0.6, 0], nS, nS, nS, C('#fff8ec', 0)); mb.triN([-0.05, 0.8, 0], [-0.05, 2.6, 0], [-0.9, 0.8, 0], nS, nS, nS, C('#ff6f61', 0)); } mb.pop();
      mb.push().T(3.5, 0, 5.4, -0.35); for (let i = 0; i < 9; i++) VK.quad(mb, -0.5, -0.95 + i * 0.21, 0.5, -0.76 + i * 0.21, C(i % 2 ? '#d9b45a' : '#c9a24a', 0), 0.004); mb.sphereS(0.18, 0.05, -0.4, 0.13, 0.06, 0.13, C('#f4e3b1', 0), 10, 5); mb.cyl(0.18, 0.004, -0.4, 0.27, 0.014, 0.27, 16, C('#e9d39a', 0), C('#e9d39a', 0)); mb.cyl(0.18, 0.04, -0.4, 0.135, 0.06, 0.135, 14, C('#e63946', 0), C('#e63946', 0)); mb.box(-0.3, 0.004, 0.2, -0.02, 0.03, 0.55, C('#3a86ff', 0)); mb.pop();
      mb.push().T(-4.3, 0.01, 6.3, 0.6); { const nU = UPV, k1 = C('#e63946', 0), k2 = C('#ffd166', 0); mb.triN([0, 0, -0.55], [0.38, 0, 0], [0, 0, 0.2], nU, nU, nU, k1); mb.triN([0, 0, -0.55], [-0.38, 0, 0], [0, 0, 0.2], nU, nU, nU, k2); mb.triN([0, 0.001, 0.2], [0.38, 0.001, 0], [0, 0.001, 0.75], nU, nU, nU, k2); mb.triN([0, 0.001, 0.2], [-0.38, 0.001, 0], [0, 0.001, 0.75], nU, nU, nU, k1); limb(mb, [0, 0.002, 0.75], [0.3, 0.002, 1.6], [0.008, 0.008], C('#ffffff', 0), 4); for (let i = 0; i < 3; i++) mb.sphereS(0.1 + i * 0.09, 0.006, 1.0 + i * 0.2, 0.06, 0.006, 0.03, C(['#3a86ff', '#e63946', '#06d6a0'][i], 0), 6, 2); } mb.pop();
      for (let j = 0; j < 14; j++) { const z0 = -4.6 + j * 0.86 + hs(j, 4) * 0.2; for (let x = -7.6; x < 7.6; x += 0.5) { const za = z0 + Math.sin(x * 0.8 + j * 1.3) * 0.14, zb = z0 + Math.sin((x + 0.5) * 0.8 + j * 1.3) * 0.14; if (Math.hypot(x + 0.25, (za + zb) / 2) < 3.9 || Math.abs((za + zb) / 2 - 6.6) < 1.4 && Math.abs(x) < 2.4) continue; mb.quadN([x, 0.003, za - 0.02], [x + 0.5, 0.003, zb - 0.02], [x + 0.5, 0.003, zb + 0.02], [x, 0.003, za + 0.02], UPV, UPV, UPV, UPV, C('#e0b675', 0)); } }
      mb.push().T(2.6, 0, 4.6, 0, 0, 0, 0.55); DECOR.ball(mb, ['#ff6f61', '#ffd23f', '#00a6a6'], 0); mb.pop(); VK.blob(2.6, 4.6, 0.32, 0.32, 0.35);
      for (const [x, z, s] of [[-7.0, -4.6, 1.5], [7.2, 4.8, 1.4], [-6.8, 6.6, 1.5], [6.0, -6.6, 1.3], [-7.4, 0.8, 1.2]]) { VK.tall(x, z, (m) => DECOR.palm(m, [], Math.round(x)), hs(x, z) * 3, s); VK.blob(x, z, 0.9 * s, 0.9 * s, 0.3); }
      for (const [x, z] of [[-4.1, -2.5], [4.0, -2.1], [-4.3, 2.7], [3.9, 2.9], [-1.5, -5.6], [1.7, -5.4]]) VK.tall(x, z, (m) => v8Torch(m, 1.55 + hs(x, z) * 0.3));
      VK.tall(5.4, 0.4, (mb) => { for (const s of [-1, 1]) mb.cyl(s * 1.8, 0, 0, 0.04, 2.3, 0.04, 8, C('#f4efe6', -0.3), C('#f4efe6', -0.3)); for (let i = 0; i < 6; i++) mb.box(-1.8, 1.5 + i * 0.13, -0.006, 1.8, 1.51 + i * 0.13, 0.006, C('#ffffff', 0)); for (let i = 0; i < 18; i++) mb.box(-1.8 + i * 0.2, 1.5, -0.006, -1.79 + i * 0.2, 2.16, 0.006, C('#ffffff', 0)); mb.box(-1.8, 2.16, -0.02, 1.8, 2.22, 0.02, C('#ffffff', 0)); }, Math.PI / 2 - 0.2);
      for (let k = 0; k < 14; k++) { const x = (hs(k, 91) - 0.5) * 12, z = -4.5 + hs(k, 92) * 10; if (Math.hypot(x, z) < 3.9) continue; if (k % 3 === 0) { mb.push().T(x, 0.01, z, hs(k, 93) * 6); for (let j = 0; j < 5; j++) { const a = (j / 5) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14], [0.04, 0.012], C('#ff8a5c', -0.2), 3); } mb.pop(); } else mb.sphereS(x, 0.02, z, 0.07, 0.035, 0.06, C(k % 2 ? '#fff1e6' : '#ffd6c9', -0.3), 6, 3); }
    },
  },
  /* ---- Emoji Bilmece: akşam lunaparkı ---- */
  emj: {
    room: 1, raw: 1, wallH: 7.4,
    table: 'metal', tableO: { top: '#b8f2e6', trim: '#f15bb5' }, chair: 'stool', chairO: { leg: '#ffffff', gloss: -0.6 },
    rug: 'medal', rugO: { a: '#7b2d8b', b: '#fee440', c: '#f15bb5', petals: 10 },
    L: VL2.fair, sky: ['#2b2350', '#ff9a8b', '#3a2c50'], sun: [0.4, 0.8, 0.4], shR: 9.0, parts: 'confetti',
    post: { bloom: 0.58, th: 0.78, sat: 1.12, con: 0.13, vig: 0.38, tint: [1.02, 0.98, 1.03] },
    det: 0.1, detS: 0.5,
    anim: [{ key: 'ferris', x: -5.4, y: 3.6, z: -6.6, ry: 0.3, ax: 'z', sp: 0.25 }, { key: 'carousel', x: 5.3, y: 0, z: -4.6, ax: 'y', sp: 0.5 }],
    logos: [[3, 2.4, 2.6, 0.8, 0.8]],
    build(mb) {
      VK.quad(mb, -40, -40, 40, 40, C('#3a2c4a', 0), -0.006);
      VK.tiles(mb, -RW - 4.5, -RW - 4.5, RW + 4.5, RW + 4.5, 0.9, '#4a4f72', '#434868', '#2a2d44', -0.3, 0.002, true);
      // atlıkarınca zemini: masanın çevresinde pembe-krem dilimli halka, sarı ince halka, dağınık konfeti
      mb.lathe(0, 0.0058, 0, [[5.1, 0], [4.55, 0]], 48, (i, a) => C(Math.floor((a * 24) / TAU) % 2 ? '#c8458f' : '#d9c79a', -0.3));
      mb.lathe(0, 0.0058, 0, [[5.4, 0], [5.31, 0]], 72, C('#e8c838', -0.3));
      for (let i = 0; i < 170; i++) { const a = hs(i, 61) * TAU, r = 4.2 + Math.sqrt(hs(i, 62)) * 6.6, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) > RW - 0.2 || Math.abs(z) > RW - 0.2) continue; mb.push().T(x, 0.0065, z, hs(i, 63) * 6); VK.quad(mb, -0.045, -0.025, 0.045, 0.025, C(['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4', '#ff8a3d', '#ffffff'][i % 7], -0.2), 0); mb.pop(); }
      for (const [x, z, c, r] of [[-5.6, -1.4, '#ff8fc7', 2.4], [5.8, 1.0, '#7cf9ff', 2.4], [-1.8, 6.0, '#fee440', 2.2], [3.4, 5.6, '#c77dff', 2.0], [0.6, -6.4, '#ff8fc7', 2.2], [-5.4, 5.0, '#7cf9ff', 1.8]]) VK.pool([x, 0, z], r, c, 0.1);
      // dönme dolap ayakları ve atlıkarınca platformu
      VK.tall(-5.4, -6.6, (mb) => { for (const s of [-1, 1]) { limb(mb, [-1.6, 0, s * 0.5], [0, 3.6, s * 0.18], [0.12, 0.08], C('#ffffff', -0.5), 6); limb(mb, [1.6, 0, s * 0.5], [0, 3.6, s * 0.18], [0.12, 0.08], C('#ffffff', -0.5), 6); } mb.box(-1.9, 0, -0.9, 1.9, 0.25, 0.9, C('#c77dff', -0.3)); VK.sh(mb, 0, 0, 2.0, 1.0, 0.36); VK.halo([-5.4, 3.6, -6.4], 2.4, '#ff8fc7', 0.12); }, 0.3);
      VK.tall(5.3, -4.6, () => VK.pool([5.3, 0, -4.6], 2.6, '#fee440', 0.12));
      // çevre: ışıklı tezgâh cepheleri (kenarlarda, iner)
      for (let k = 1; k < 4; k++) {
        const holes = [{ u0: -4.6, u1: -2.0, y0: 0.9, y1: 2.2 }, { u0: 2.0, u1: 4.6, y0: 0.9, y1: 2.2 }];
        vWall(k, { wall: ['#2b2350', '#ffd6ec', '#d6f5ff', '#fff3c4'][k], H: 4.2, dado: '#7b2d8b', dadoH: 0.9, base: '#4a1f5a', crown: '#fee440', pat: 'stripe', pc: ['#2b2350', '#ffc2e0', '#c2ecff', '#ffe9a8'][k], ps: 0.4 }, holes);
        for (const h of holes) vWindow(k, h, { frame: '#fee440', view: 'lit', sun: false, sill: false, nx: 1, ny: 1 });
        { const s = SEC(k); for (const u of [-3.3, 3.3]) { wAt(s, k, u, 0, 2.75); v2Awning(s, 3.2, 0, 0.8, ['#f15bb5', '#00bbf9', '#9b5de5', '#f77f00'][k], '#ffffff', 9); s.pop(); } P.stringLights(s, [wXZ(k, -7.6, 0.3).concat([]).map((v, i) => v), wXZ(k, 7.6, 0.3)].map((p) => [p[0], 3.9, p[1]]), ['#fee440', '#ff8fc7', '#7cf9ff', '#ffffff'], 18, 0.25, 0.05, k); }
      }
      // tabela: ışıklı kemer
      vSign('neon', '#2b2350', '#fee440');
      { const s0 = SEC(0); for (const x of [-2.05, 2.05]) s0.cyl(x, 0, -7.76, 0.12, 3.6, 0.1, 10, C('#f15bb5', -0.4), C('#f15bb5', -0.4)); for (let k = 0; k <= 16; k++) { const a = Math.PI * (k / 16), x = Math.cos(a) * 2.05, y = 3.4 + Math.sin(a) * 0.8; s0.sphereS(x, y, -7.7, 0.07, 0.07, 0.07, C(k % 2 ? '#fee440' : '#ff8fc7', 1), 6, 4); } for (let k = 0; k < 16; k++) { const a0 = Math.PI * (k / 16), a1 = Math.PI * ((k + 1) / 16); limb(s0, [Math.cos(a0) * 2.05, 3.4 + Math.sin(a0) * 0.8, -7.76], [Math.cos(a1) * 2.05, 3.4 + Math.sin(a1) * 0.8, -7.76], [0.06, 0.06], C('#f15bb5', -0.4), 5, null, 1); } }
      // salon: patlamış mısır, pamuk şeker, halka atma, bilet kulübesi, balon satıcısı, banklar, lambalar
      VK.tall(-6.0, 1.2, (mb) => { mb.box(-0.8, 0.3, -0.5, 0.8, 1.1, 0.5, C('#e63946', -0.4)); for (let k = 0; k < 5; k++) mb.box(-0.8 + k * 0.36, 0.3, 0.5, -0.62 + k * 0.36, 1.1, 0.52, C('#ffffff', -0.3)); for (const s of [-1, 1]) { mb.push().T(s * 0.55, 0.3, 0.53, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.26, 0.05, 0.05, 14, 5, C('#ffffff', -0.5)); mb.pop(); } mb.box(-0.7, 1.1, -0.42, 0.7, 1.9, 0.42, C('#e9f6ff', -0.92)); for (let k = 0; k < 22; k++) mb.sphereS(-0.6 + hs(k, 1) * 1.2, 1.18 + hs(k, 2) * 0.3, -0.32 + hs(k, 3) * 0.64, 0.09, 0.08, 0.09, C(k % 3 ? '#fff3c4' : '#ffd166', 0), 6, 4); mb.box(-0.75, 1.9, -0.47, 0.75, 1.96, 0.47, C('#e63946', -0.4)); for (let k = 0; k < 8; k++) { const x0 = -0.85 + k * 0.2125, n = vnorm([0, 1, 0.3]); mb.quadN([x0, 2.32, -0.2], [x0 + 0.2125, 2.32, -0.2], [x0 + 0.2125, 2.08, 0.62], [x0, 2.08, 0.62], n, n, n, n, C(k % 2 ? '#e63946' : '#ffffff', 0)); } for (const x of [-0.75, 0.75]) mb.cyl(x, 1.96, -0.2, 0.025, 2.32, 0.025, 6, C('#ffffff', -0.5), C('#ffffff', -0.5), ''); VK.sh(mb, 0, 0, 0.9, 0.6, 0.38); }, Math.PI / 2 + 0.3);
      VK.tall(6.0, 2.0, (mb) => { mb.cyl(0, 0, 0, 0.55, 0.9, 0.6, 18, C('#ffffff', -0.3), C('#f15bb5', -0.3)); mb.cyl(0, 0.9, 0, 0.45, 1.0, 0.45, 18, C('#c9ced6', -0.85), C('#c9ced6', -0.85)); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; mb.cyl(Math.cos(a) * 0.3, 1.0, Math.sin(a) * 0.3, 0.012, 1.5, 0.012, 6, C('#ffffff', -0.3), C('#ffffff', -0.3)); mb.sphereS(Math.cos(a) * 0.3, 1.68, Math.sin(a) * 0.3, 0.2, 0.24, 0.2, C(['#ffb3d9', '#b3e5ff', '#d9b3ff', '#ffffff'][k], 0), 12, 8); } mb.lathe(0, 1.0, 0, [[0.15, 0], [0.3, 0.3], [0.28, 0.32]], 14, C('#ff8fc7', 0)); VK.sh(mb, 0, 0, 0.7, 0.7, 0.38); }, -Math.PI / 2 - 0.2);
      VK.tall(-3.4, 5.6, (mb) => { P.counter(mb, 2.4, 0.95, 0.7, '#00bbf9', '#fee440', { rail: false }); for (let i = 0; i < 9; i++) { const x = -0.8 + (i % 3) * 0.8, z = -0.15 + Math.floor(i / 3) * 0.0; mb.cyl(x, 0.95, z - 0.1 + Math.floor(i / 3) * 0.1, 0.05, 1.25, 0.04, 10, C(['#e63946', '#3a86ff', '#06d6a0'][i % 3], -0.7), C(['#e63946', '#3a86ff', '#06d6a0'][i % 3], -0.7)); } for (const x of [-1.15, 1.15]) mb.cyl(x, 0.95, 0.2, 0.03, 2.4, 0.03, 6, C('#fee440', -0.4), C('#fee440', -0.4)); mb.box(-1.25, 2.3, 0.15, 1.25, 2.6, 0.25, C('#f15bb5', 0.9)); for (let i = 0; i < 7; i++) mb.sphereS(-1.0 + i * 0.33, 2.45, 0.26, 0.06, 0.06, 0.04, C('#ffffff', 1), 6, 4); }, Math.PI - 0.4);
      VK.tall(3.6, 5.8, (mb) => { mb.rbox(-0.7, 0, -0.6, 0.7, 2.2, 0.6, 0.05, C('#9b5de5', -0.3), 2); mb.box(-0.5, 0.95, 0.6, 0.5, 1.75, 0.62, C('#fff3c4', 0.9)); mb.box(-0.6, 0.9, 0.6, 0.6, 0.96, 0.85, C('#fee440', -0.3)); mb.push().T(0, 2.2, 0); mb.lathe(0, 0, 0, [[1.0, 0], [0, 0.7]], 4, C('#f15bb5', -0.2)); mb.pop(); mb.sphereS(0, 3.0, 0, 0.1, 0.1, 0.1, C('#fee440', 1), 8, 5); VK.sh(mb, 0, 0, 0.8, 0.7, 0.4); }, Math.PI + 0.3);
      VK.tall(-1.6, -6.2, (m) => v2Balloons(m, ['#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4', '#ff8a3d'], 9, 2.0));
      for (const [x, z, ry] of [[1.8, -6.6, 0], [-6.6, -2.2, Math.PI / 2]]) { mb.push().T(x, 0, z, ry); P.bench(mb, 1.6, '#f15bb5', '#2b2350'); mb.pop(); }
      for (const [x, z] of [[-6.4, 4.4], [6.4, 4.6], [-6.8, -4.6], [2.0, -5.0]]) VK.tall(x, z, (m) => v2StreetLamp(m, 3.3, '#2b2350', { glass: '#fff1f9', light: '#ffc2e6', poolR: 2.0, poolA: 0.12 }));
    },
  },
});

/* ---- 3. paket ışıkları ---- */
Object.assign(VL2, {
  cinema: { raw: 1, sunC: [0.44, 0.34, 0.36], sky: [0.27, 0.2, 0.24], gnd: [0.16, 0.1, 0.11], night: 1, warm: [1, 0.8, 0.6], lampC: [1.15, 0.84, 0.6], fogR: [40, 110], stars: 0, glowS: 0.55 },
  bunker: { raw: 1, sunC: [0.62, 0.64, 0.68], sky: [0.37, 0.39, 0.43], gnd: [0.21, 0.21, 0.22], night: 1, warm: [0.96, 0.98, 1.0], lampC: [1.0, 0.98, 0.94], fogR: [40, 110], stars: 0, glowS: 0.45 },
  lounge: { raw: 1, sunC: [0.52, 0.42, 0.33], sky: [0.29, 0.25, 0.21], gnd: [0.17, 0.13, 0.09], night: 1, warm: [1, 0.8, 0.55], lampC: [1.15, 0.86, 0.56], fogR: [40, 110], stars: 0, glowS: 0.5 },
  atelier: { raw: 1, sunC: [0.82, 0.76, 0.68], sky: [0.43, 0.44, 0.48], gnd: [0.3, 0.28, 0.25], night: 0, warm: [1, 0.95, 0.88], lampC: [0.5, 0.46, 0.4], fogR: [40, 130], stars: 0, glowS: 0.3 },
  arcade: { raw: 1, sunC: [0.36, 0.3, 0.52], sky: [0.22, 0.2, 0.34], gnd: [0.12, 0.1, 0.18], night: 1, warm: [1, 0.85, 0.8], lampC: [1.2, 1.0, 1.15], fogR: [40, 110], stars: 0, glowS: 0.62 },
});

/* ---- ortak: ince şerit, düzensiz leke, 7 parçalı rakam ---- */
const v4Seg = (mb, x0, z0, x1, z1, hw, col, y) => { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * hw, nz = (dx / L) * hw; mb.quadN([x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz], UPV, UPV, UPV, UPV, col); };
// yere düzensiz leke (boya, yağ): yelpaze üçgenler + çevresine damlacıklar
function v4Blot(mb, x, y, z, s, col, seed = 1, drops = 5) {
  const n = 14, c = C(col, 0), P0 = [x, y, z];
  for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, r0 = s * (0.72 + hs(k, seed) * 0.42), r1 = s * (0.72 + hs((k + 1) % n, seed) * 0.42); mb.triN(P0, [x + Math.cos(a0) * r0, y, z + Math.sin(a0) * r0], [x + Math.cos(a1) * r1, y, z + Math.sin(a1) * r1], UPV, UPV, UPV, c); }
  for (let i = 0; i < drops; i++) { const a = hs(i, seed + 7) * TAU, r = s * (1.25 + hs(i, seed + 8) * 0.9), d = s * (0.08 + hs(i, seed + 9) * 0.14); mb.disc(x + Math.cos(a) * r, y + 0.0004, z + Math.sin(a) * r, d, d, 7, c, c); }
}
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function v4Digits(mb, str, cx, cy, z, w, h, on, off) {
  const t = w * 0.17, gap = w * 0.32, ch = [...str], wd = ch.map((c) => (c === ':' ? w * 0.36 : w)), tot = wd.reduce((a, b) => a + b, 0) + gap * (ch.length - 1);
  let x = cx - tot / 2;
  ch.forEach((c, i) => {
    const W2 = wd[i];
    if (c === ':') for (const yy of [cy - h * 0.2, cy + h * 0.2]) mb.box(x + W2 / 2 - t / 2, yy - t / 2, z, x + W2 / 2 + t / 2, yy + t / 2, z + 0.02, C(on, 1));
    else {
      const S = SEG7[c] || '', x0 = x, x1 = x + W2, y0 = cy - h / 2, y1 = cy + h / 2, ym = cy;
      const R = { a: [x0 + t, y1 - t, x1 - t, y1], b: [x1 - t, ym + t / 2, x1, y1 - t], c: [x1 - t, y0 + t, x1, ym - t / 2], d: [x0 + t, y0, x1 - t, y0 + t], e: [x0, y0 + t, x0 + t, ym - t / 2], f: [x0, ym + t / 2, x0 + t, y1 - t], g: [x0 + t, ym - t / 2, x1 - t, ym + t / 2] };
      for (const k of 'abcdefg') { const r = R[k], lit = S.includes(k); mb.box(r[0] + 0.012, r[1] + 0.012, z, r[2] - 0.012, r[3] - 0.012, z + (lit ? 0.022 : 0.012), C(lit ? on : off, lit ? 1 : 0)); }
    }
    x += W2 + gap;
  });
}
// duvarda sarı-siyah çapraz şerit bandı
function v4HazBand(k, y0, y1, z = 0.02, s = 0.34) {
  const mb = SEC(k), n = [0, 0, 1], h = y1 - y0; wAt(mb, k, 0, 0);
  for (let u = -RW - h, i = 0; u < RW; u += s / 2, i++) { const a = Math.max(-RW, u), b = Math.min(RW, u + s / 2); if (b <= a + 0.01) continue; const col = C(i % 2 ? '#1b1b1e' : '#f2c230', -0.2); mb.quadN([Math.max(-RW, u), y0, z], [Math.min(RW, u + s / 2), y0, z], [Math.min(RW, u + s / 2 + h), y1, z], [Math.max(-RW, u + h), y1, z], n, n, n, n, col); }
  mb.pop();
}

/* ---- zeminler ---- */
// art deco halı: bordo zemin, dama gibi iki tonlu baklava hücreleri, altın kafes, kesişimde baklava, siyah bordür
function vDecoCarpet(mb, base, base2, line, gem, border) {
  const B = RW - 0.6, s = 1.3, Lc = C(line, 0), Gc = C(gem, 0);
  VK.quad(mb, -RW, -RW, RW, RW, C(base, 0), 0);
  let i = 0;
  for (let a = -2 * B; a <= 2 * B + 1e-6; a += s, i++) { let j = 0; for (let b = -2 * B; b <= 2 * B + 1e-6; b += s, j++) {
    const x = (a + b) / 2 + s / 2, z = (b - a) / 2, d = s / 2;
    if ((i + j) % 2 === 0 && Math.abs(x) < B - d && Math.abs(z) < B - d) mb.quadN([x, 0.004, z - d], [x + d, 0.004, z], [x, 0.004, z + d], [x - d, 0.004, z], UPV, UPV, UPV, UPV, C(base2, 0));
    const gx = (a + b) / 2, gz = (b - a) / 2, g = 0.1;
    if (Math.abs(gx) < B - 0.1 && Math.abs(gz) < B - 0.1) mb.quadN([gx, 0.012, gz - g], [gx + g, 0.012, gz], [gx, 0.012, gz + g], [gx - g, 0.012, gz], UPV, UPV, UPV, UPV, Gc);
  } }
  for (let c = -2 * B; c <= 2 * B + 1e-6; c += s) {
    { const t0 = Math.max(-B, -B + c), t1 = Math.min(B, B + c); if (t1 > t0 + 0.05) v4Seg(mb, t0, t0 - c, t1, t1 - c, 0.016, Lc, 0.008); }
    { const t0 = Math.max(-B, c - B), t1 = Math.min(B, c + B); if (t1 > t0 + 0.05) v4Seg(mb, t0, c - t0, t1, c - t1, 0.016, Lc, 0.008); }
  }
  const Bc = C(border, 0);
  for (const [x0, z0, x1, z1] of [[-RW, -RW, RW, -B], [-RW, B, RW, RW], [-RW, -B, -B, B], [B, -B, RW, B]]) VK.quad(mb, x0, z0, x1, z1, Bc, 0.006);
  for (const q of [0.12, 0.42]) { const e = B + q, t = 0.022; for (const [x0, z0, x1, z1] of [[-e - t, -e - t, e + t, -e + t], [-e - t, e - t, e + t, e + t], [-e - t, -e + t, -e + t, e - t], [e - t, -e + t, e + t, e - t]]) VK.quad(mb, x0, z0, x1, z1, Lc, 0.01); }
}
// beton plakalar + yağ lekeleri + sarı güvenlik çizgisi
function vConcrete(mb, s, a, b, grout, o = {}) {
  vFloorTile(mb, s, a, b, grout, { e: o.e ?? -0.15, jit: o.jit ?? 0.05 });
  for (let i = 0; i < (o.stains ?? 10); i++) { const x = (hs(i, 41) - 0.5) * 13, z = (hs(i, 42) - 0.5) * 13; if (Math.hypot(x, z) < 4.0) continue; VK.blob(x, z, 0.3 + hs(i, 43) * 0.5, 0.2 + hs(i, 44) * 0.4, 0.16 + hs(i, 45) * 0.12, 0.009, hs(i, 46) * 3); }
  if (o.line) { const L = C(o.line, 0), B = RW - (o.lineIn ?? 1.2), w = 0.06; for (const [x0, z0, x1, z1] of [[-B - w, -B - w, B + w, -B + w], [-B - w, B - w, B + w, B + w], [-B - w, -B, -B + w, B], [B - w, -B, B + w, B]]) VK.quad(mb, x0, z0, x1, z1, L, 0.006); }
}

/* ---- masa altı halılar ---- */
// art deco güneş halısı: kalın gövde, altın halkalar, bordo alan, altın ışınlar, ortada madalyon
RUGS.deco = (mb, R, o = {}) => {
  const A = C(o.a || '#140a0e', 0), G = C(o.b || '#c9a34a', 0), F = C(o.c || '#5a0f1c', 0), y = o.y ?? 0.03;
  mb.cyl(0, 0, 0, R, y, R, 64, A, A);
  mb.lathe(0, y + 0.002, 0, [[R - 0.08, 0], [R - 0.15, 0]], 72, G);
  mb.lathe(0, y + 0.002, 0, [[R - 0.24, 0], [0, 0]], 72, F);
  mb.lathe(0, y + 0.004, 0, [[R - 0.3, 0], [R - 0.34, 0]], 72, G);
  for (let k = 0; k < 32; k++) { const a = (k / 32) * TAU, d = k % 2 ? 0.045 : 0.08, r0 = R * 0.36, r1 = R - (k % 2 ? 0.62 : 0.4); mb.triN([Math.cos(a - d) * r0, y + 0.005, Math.sin(a - d) * r0], [Math.cos(a) * r1, y + 0.005, Math.sin(a) * r1], [Math.cos(a + d) * r0, y + 0.005, Math.sin(a + d) * r0], UPV, UPV, UPV, G); }
  mb.lathe(0, y + 0.006, 0, [[R * 0.36, 0], [R * 0.3, 0]], 64, G); mb.lathe(0, y + 0.006, 0, [[R * 0.3, 0], [0, 0]], 64, A);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; mb.disc(Math.cos(a) * R * 0.24, y + 0.008, Math.sin(a) * R * 0.24, 0.07, 0.07, 8, G, G); }
};
// sarı-siyah tehlike şeritli beton halka (bomba sığınağı)
RUGS.hazard = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, Y = C('#f2c230', -0.15), K = C('#1b1b1e', -0.15), G = C(o.base || '#55595e', -0.3), n = 40, r0 = R - 0.5, r1 = R - 0.08, sh = (0.6 / n) * TAU;
  mb.cyl(0, 0, 0, R, y, R, 64, G, G);
  for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU; mb.quadN([Math.cos(a0) * r0, y + 0.003, Math.sin(a0) * r0], [Math.cos(a0 + sh) * r1, y + 0.003, Math.sin(a0 + sh) * r1], [Math.cos(a1 + sh) * r1, y + 0.003, Math.sin(a1 + sh) * r1], [Math.cos(a1) * r0, y + 0.003, Math.sin(a1) * r0], UPV, UPV, UPV, UPV, k % 2 ? Y : K); }
  mb.lathe(0, y + 0.003, 0, [[r0 - 0.1, 0], [r0 - 0.16, 0]], 64, C('#e9e9e9', -0.2));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; v4Seg(mb, Math.cos(a) * (r0 - 0.5), Math.sin(a) * (r0 - 0.5), Math.cos(a) * (r0 - 0.2), Math.sin(a) * (r0 - 0.2), 0.03, C('#e9e9e9', -0.2), y + 0.003); }
};

/* ---- Sessiz Sinema eşyaları ---- */
// kadife perde (arka duvar, dünya koordinatı): kıvrımlar, bağ, püskül
function v4Curtain(mb, xa, xb, y0, y1, z, cA, cB, n, side) {
  const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), w = (x1 - x0) / n;
  for (let f = 0; f < n; f++) { const a = x0 + f * w, b = a + w + 0.01, dz = f % 2 ? 0.1 : 0.04; mb.box(a, y0, z, b, y1, z + dz, C(f % 2 ? cA : cB, 0)); }
  const tie = side < 0 ? x0 + 0.1 : x1 - 0.1;
  mb.box(x0 - 0.01, 1.25, z, x1 + 0.01, 1.36, z + 0.15, C('#c9a34a', -0.85));
  mb.sphereS(tie, 1.12, z + 0.16, 0.07, 0.09, 0.07, C('#c9a34a', -0.85), 8, 5); mb.cyl(tie, 0.82, z + 0.16, 0.09, 1.06, 0.03, 10, C('#c9a34a', -0.85), C('#c9a34a', -0.85));
}
// perde üstü saçak: düz bant, aşağı sarkan yarım daireler, altın püsküller
function v4Valance(mb, x0, x1, y, z, col, trim, n = 5) {
  const V = C(col, 0), G = C(trim, -0.85), w = (x1 - x0) / n;
  mb.box(x0, y - 0.1, z, x1, y + 0.45, z + 0.14, V); mb.box(x0, y + 0.42, z, x1, y + 0.5, z + 0.17, G);
  for (let i = 0; i < n; i++) { const cx = x0 + (i + 0.5) * w; mb.sphereS(cx, y - 0.1, z + 0.1, w / 2, 0.3, 0.06, V, 14, 6); mb.sphereS(cx, y - 0.4, z + 0.16, 0.05, 0.08, 0.05, G, 6, 4); }
  for (let i = 0; i <= n; i++) { const x = x0 + i * w; mb.cyl(x, y - 0.45, z + 0.17, 0.05, y - 0.15, 0.02, 8, G, G); }
}
function v4CinemaSeat(mb, col = '#8c1424') {
  const F = C('#1b1416', -0.45), V = C(col, -0.05), Vd = C(vDark(col, 0.22), -0.05), G = C('#c9a34a', -0.85);
  for (const s of [-1, 1]) { mb.box(s * 0.3 - 0.03, 0, -0.26, s * 0.3 + 0.03, 0.6, 0.16, F); mb.rbox(s * 0.3 - 0.045, 0.58, -0.24, s * 0.3 + 0.045, 0.65, 0.2, 0.02, F, 1); }
  mb.rbox(-0.26, 0.34, -0.14, 0.26, 0.46, 0.2, 0.04, V, 2);
  mb.push().T(0, 0.42, -0.2, 0, -0.14); mb.rbox(-0.26, 0, -0.07, 0.26, 0.6, 0.04, 0.06, Vd, 2); mb.rbox(-0.22, 0.06, 0.03, 0.22, 0.54, 0.075, 0.05, V, 2); mb.box(-0.27, 0.6, -0.08, 0.27, 0.63, 0.05, G); mb.pop();
}
function v4Projector(mb) {
  const M = C('#2b2d31', -0.75), M2 = C('#53575f', -0.8), Wd = C('#4a2a18', -0.2), Gl = C('#fff4d6', 1);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; limb(mb, [0, 0.98, 0], [Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44], [0.026, 0.02], Wd, 5); }
  mb.cyl(0, 0.96, 0, 0.2, 1.03, 0.2, 14, Wd, Wd);
  mb.rbox(-0.15, 1.03, -0.3, 0.15, 1.36, 0.2, 0.03, M, 2); mb.box(-0.16, 1.12, -0.12, 0.16, 1.2, 0.0, M2);
  mb.push().T(0, 1.2, 0.2, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.07, 0.24, 0.06, 14, M2, M2); mb.cyl(0, 0.24, 0, 0.055, 0.25, 0.055, 14, Gl, Gl); mb.pop();
  for (const [zz, yy, r] of [[-0.2, 1.64, 0.27], [0.15, 1.56, 0.22]]) {
    limb(mb, [0, 1.34, zz * 0.6], [0, yy, zz], [0.02, 0.02], M2, 4);
    mb.push().T(0, yy, zz, 0, 0, Math.PI / 2); mb.cyl(0, -0.035, 0, r, 0.035, r, 24, M, M2); for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; mb.cyl(Math.cos(a) * r * 0.5, 0.036, Math.sin(a) * r * 0.5, r * 0.2, 0.04, r * 0.2, 10, C('#15161a', -0.5), C('#15161a', -0.5)); } mb.cyl(0, 0.036, 0, 0.04, 0.05, 0.04, 8, M2, M2); mb.pop();
  }
  VK.halo(mb.p(0, 1.2, 0.47), 0.4, '#fff1d0', 0.42, 0.25);
  VK.sh(mb, 0, 0, 0.5, 0.5, 0.36);
}
function v4MovieCam(mb) {
  const Wd = C('#6b4428', -0.25), Bk = C('#1d1d20', -0.6), Br = C('#c9a34a', -0.85);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.2; limb(mb, [0, 1.18, 0], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [0.024, 0.018], Wd, 5); }
  mb.cyl(0, 1.16, 0, 0.1, 1.22, 0.1, 10, Bk, Bk);
  mb.rbox(-0.16, 1.22, -0.26, 0.16, 1.6, 0.18, 0.03, Bk, 2); mb.box(-0.165, 1.3, -0.2, 0.165, 1.33, 0.12, Br);
  mb.push().T(0, 1.42, 0.18, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.06, 0.18, 0.075, 14, Bk, Bk); mb.cyl(0, 0.18, 0, 0.065, 0.19, 0.065, 14, C('#9fc6ff', 0.9), C('#9fc6ff', 0.9)); mb.pop();
  for (const zz of [-0.15, 0.1]) { mb.push().T(0, 1.78, zz, 0, 0, Math.PI / 2); mb.cyl(0, -0.03, 0, 0.17, 0.03, 0.17, 20, Bk, C('#3a3d44', -0.7)); mb.pop(); }
  limb(mb, [0.17, 1.42, -0.05], [0.3, 1.36, -0.05], [0.012, 0.012], Br, 3); limb(mb, [0.3, 1.36, -0.05], [0.3, 1.24, 0.02], [0.012, 0.012], Br, 3); mb.sphereS(0.3, 1.22, 0.04, 0.025, 0.025, 0.025, Wd, 6, 4);
  VK.sh(mb, 0, 0, 0.55, 0.55, 0.34);
}
function v4Spot(mb, light = '#ffe9c0') {
  const M = C('#1d1d20', -0.6), M2 = C('#3a3d44', -0.75);
  mb.cyl(0, 0, 0, 0.3, 0.05, 0.28, 14, M, M); mb.cyl(0, 0.05, 0, 0.03, 1.55, 0.03, 8, M2, M2);
  mb.push().T(0, 1.62, 0); limb(mb, [-0.2, -0.08, 0], [0.2, -0.08, 0], [0.018, 0.018], M2, 4); for (const s of [-1, 1]) limb(mb, [s * 0.2, -0.08, 0], [s * 0.2, 0.08, 0], [0.018, 0.018], M2, 4);
  mb.push().T(0, 0.06, 0, 0, 1.25); mb.cyl(0, -0.3, 0, 0.15, 0.22, 0.17, 16, M, M); mb.cyl(0, 0.22, 0, 0.15, 0.23, 0.15, 16, C('#fff3d6', 1), C('#fff3d6', 1)); mb.pop();
  const p = mb.p(0, 0.15, 0.3); mb.pop();
  VK.halo(p, 0.45, light, 0.4); const q = mb.p(0, 0, 3.0); VK.pool([q[0], 0, q[2]], 1.5, light, 0.12, 1.2);
  VK.sh(mb, 0, 0, 0.34, 0.34, 0.36);
}
// ışıklı afiş kutusu (duvar yerel): altın çerçeve, afiş, çevresinde ampuller
function v4PosterBox(mb, w, h, seed) {
  P.frame(mb, w, h, 'poster', '#c9a34a', seed, { fe: -0.85, mat: 0.03, matC: '#1b1416' });
  const B = C('#fff1c9', 1), nW = Math.max(2, Math.round(w / 0.2)), nH = Math.max(2, Math.round(h / 0.2));
  for (let i = 0; i <= nW; i++) { const x = -w / 2 - 0.07 + (i * (w + 0.14)) / nW; for (const y of [-h / 2 - 0.07, h / 2 + 0.07]) mb.sphereS(x, y, 0.04, 0.026, 0.026, 0.02, B, 5, 3); }
  for (let j = 1; j < nH; j++) { const y = -h / 2 - 0.07 + (j * (h + 0.14)) / nH; for (const x of [-w / 2 - 0.07, w / 2 + 0.07]) mb.sphereS(x, y, 0.04, 0.026, 0.026, 0.02, B, 5, 3); }
}
function v4PopcornMachine(mb) {
  const R = C('#c8102e', -0.4), Y = C('#ffd23f', 1), Gs = C('#e8f4f8', -0.92), M = C('#c9ced6', -0.9);
  mb.rbox(-0.32, 0, -0.24, 0.32, 0.26, 0.24, 0.03, R, 2);
  for (const [x, z] of [[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]) mb.box(x - 0.015, 0.26, z - 0.015, x + 0.015, 0.86, z + 0.015, M);
  mb.box(-0.3, 0.26, -0.22, 0.3, 0.27, 0.22, Gs);
  for (let k = 0; k < 30; k++) mb.sphereS(-0.25 + hs(k, 1) * 0.5, 0.3 + hs(k, 2) * 0.22, -0.18 + hs(k, 3) * 0.36, 0.045, 0.04, 0.045, C(k % 4 ? '#fff3c4' : '#ffd166', 0.2), 6, 4);
  mb.cyl(0, 0.62, 0, 0.11, 0.74, 0.13, 12, M, M); limb(mb, [0, 0.74, 0], [0, 0.86, 0], [0.012, 0.012], M, 3);
  mb.rbox(-0.34, 0.86, -0.26, 0.34, 0.96, 0.26, 0.03, R, 2); mb.box(-0.26, 0.97, 0.0, 0.26, 1.15, 0.04, Y); mb.box(-0.28, 0.96, -0.02, 0.28, 1.17, 0.0, R);
  VK.halo(mb.p(0, 0.55, 0.1), 0.45, '#ffe08a', 0.3);
}
function v4MenuBoard(mb, w, h) {
  mb.box(-w / 2 - 0.06, -h / 2 - 0.06, 0, w / 2 + 0.06, h / 2 + 0.06, 0.04, C('#c9a34a', -0.85)); mb.box(-w / 2, -h / 2, 0.04, w / 2, h / 2, 0.05, C('#15101a', 0));
  const IC = ['#e63946', '#ffd166', '#4cc9f0', '#f4a261'];
  for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) { const x = -w / 2 + 0.2 + c * (w / 3), y = h / 2 - 0.2 - r * (h - 0.25) / 4; mb.box(x, y - 0.05, 0.05, x + 0.1, y + 0.05, 0.06, C(IC[(c + r) % 4], 0.9)); mb.box(x + 0.16, y - 0.02, 0.05, x + w / 3 - 0.32, y + 0.02, 0.058, C('#f4ecd8', 0.7)); mb.box(x + w / 3 - 0.26, y - 0.025, 0.05, x + w / 3 - 0.14, y + 0.025, 0.058, C('#ffd23f', 0.8)); }
}
function v4TicketBooth(mb) {
  const B = C('#5a1420', -0.2), G = C('#c9a34a', -0.85), Dk = C('#1b0e12', -0.3), Gl = C('#ffd9a0', 0.92);
  mb.box(-0.85, 0, -0.55, 0.85, 0.16, 0.55, Dk);
  mb.box(-0.8, 0.16, -0.5, 0.8, 2.2, 0.5, B);
  for (const s of [-1, 1]) { mb.box(s * 0.8 - 0.05, 0.16, 0.45, s * 0.8 + 0.05, 2.2, 0.55, G); }
  mb.box(-0.5, 1.0, 0.5, 0.5, 1.85, 0.52, Gl); mb.sphereS(0, 1.85, 0.51, 0.5, 0.3, 0.012, Gl, 16, 6);
  mb.box(-0.56, 0.96, 0.5, 0.56, 1.0, 0.72, G); for (let i = 0; i < 7; i++) mb.box(-0.42 + i * 0.14 - 0.008, 1.0, 0.53, -0.42 + i * 0.14 + 0.008, 1.5, 0.545, G);
  mb.box(-0.9, 2.2, -0.6, 0.9, 2.32, 0.6, G); mb.box(-0.7, 2.32, -0.45, 0.7, 2.5, 0.45, B); mb.box(-0.5, 2.5, -0.3, 0.5, 2.62, 0.3, G);
  { const n = [0, 0, 1]; for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU + Math.PI / 2, a1 = ((k + 1) / 10) * TAU + Math.PI / 2, r0 = k % 2 ? 0.1 : 0.24, r1 = k % 2 ? 0.24 : 0.1; mb.triN([0, 2.95, 0.31], [Math.cos(a0) * r0, 2.95 + Math.sin(a0) * r0, 0.31], [Math.cos(a1) * r1, 2.95 + Math.sin(a1) * r1, 0.31], n, n, n, C('#ffd23f', 1)); } }
  mb.box(-0.32, 1.62, 0.52, 0.32, 1.72, 0.53, C('#c8102e', 0.6));
  VK.halo(mb.p(0, 1.45, 0.75), 0.6, '#ffd9a0', 0.3); VK.pool(mb.p(0, 0, 1.3), 1.3, '#ffd9a0', 0.12);
}
function v4Stanchions(mb, pts, post = '#c9a34a', rope = '#8c1424') {
  const G = C(post, -0.88), R = C(rope, -0.1);
  for (const [x, z] of pts) { mb.cyl(x, 0, z, 0.16, 0.035, 0.15, 14, G, G); mb.cyl(x, 0.035, z, 0.025, 0.92, 0.025, 8, G, G); mb.sphereS(x, 0.96, z, 0.05, 0.05, 0.05, G, 8, 5); VK.blob(x, z, 0.2, 0.2, 0.3); }
  for (let i = 0; i + 1 < pts.length; i++) { const [xa, za] = pts[i], [xb, zb] = pts[i + 1], n = 6; for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, y0 = 0.86 - Math.sin(t0 * Math.PI) * 0.18, y1 = 0.86 - Math.sin(t1 * Math.PI) * 0.18; limb(mb, [xa + (xb - xa) * t0, y0, za + (zb - za) * t0], [xa + (xb - xa) * t1, y1, za + (zb - za) * t1], [0.022, 0.022], R, 5); } }
}
function v4PopcornBucket(mb) {
  mb.lathe(0, 0, 0, [[0.1, 0], [0.15, 0.3], [0.155, 0.31]], 14, (i, a) => C(Math.floor(a * 7 / TAU) % 2 ? '#ffffff' : '#c8102e', -0.2), 'b');
  for (let k = 0; k < 12; k++) mb.sphereS((hs(k, 1) - 0.5) * 0.2, 0.3 + hs(k, 2) * 0.06, (hs(k, 3) - 0.5) * 0.2, 0.035, 0.03, 0.035, C('#fff3c4', 0.1), 6, 4);
  for (let k = 0; k < 9; k++) { const a = hs(k, 9) * TAU, r = 0.25 + hs(k, 8) * 0.35; mb.sphereS(Math.cos(a) * r, 0.02, Math.sin(a) * r, 0.03, 0.025, 0.03, C('#fff3c4', 0.1), 6, 4); }
  VK.sh(mb, 0, 0, 0.2, 0.2, 0.36);
}
function v4Clapper(mb) {
  const Bk = C('#16161a', -0.3), Wh = C('#f4f4f4', 0);
  mb.box(-0.17, 0, -0.012, 0.17, 0.22, 0.012, Bk); for (let i = 0; i < 3; i++) mb.box(-0.15, 0.04 + i * 0.05, 0.012, 0.15, 0.048 + i * 0.05, 0.014, Wh);
  mb.push().T(-0.17, 0.225, 0, 0, 0, 0.32); mb.box(0, 0, -0.012, 0.34, 0.05, 0.012, Bk); for (let i = 0; i < 4; i++) { const x = 0.03 + i * 0.08, n = [0, 0, 1]; mb.quadN([x, 0, 0.013], [x + 0.04, 0, 0.013], [x + 0.06, 0.05, 0.013], [x + 0.02, 0.05, 0.013], n, n, n, n, Wh); } mb.pop();
}

/* ---- Sayı Bombası eşyaları ---- */
function v4Bomb(mb, s = 1, lit = true) {
  const r = 0.22 * s;
  mb.sphereS(0, r, 0, r, r, r, C('#18181c', -0.88), 16, 10); mb.cyl(0, r * 1.75, 0, r * 0.3, r * 2.05, r * 0.3, 10, C('#3a3d44', -0.8), C('#3a3d44', -0.8));
  limb(mb, [0, r * 2.05, 0], [r * 0.25, r * 2.5, 0], [0.012 * s, 0.012 * s], C('#d9c39a', 0), 3); limb(mb, [r * 0.25, r * 2.5, 0], [r * 0.55, r * 2.6, 0.02], [0.012 * s, 0.01 * s], C('#d9c39a', 0), 3);
  mb.sphereS(-r * 0.4, r * 1.45, r * 0.55, r * 0.18, r * 0.12, r * 0.08, C('#ffffff', 0.3), 8, 4);
  if (lit) { mb.sphereS(r * 0.57, r * 2.62, 0.02, 0.03 * s, 0.03 * s, 0.03 * s, C('#ffe14f', 1), 6, 4); VK.halo(mb.p(r * 0.57, r * 2.62, 0.02), 0.22 * s, '#ffb02e', 0.45, 1); }
  VK.sh(mb, 0, 0, r * 1.1, r * 1.1, 0.38);
}
function v4Cone(mb) {
  const O = C('#ff6a13', -0.2), W = C('#f4f4f4', 0.2);
  mb.box(-0.2, 0, -0.2, 0.2, 0.04, 0.2, C('#c94f0c', -0.2));
  mb.lathe(0, 0.04, 0, [[0.15, 0], [0.12, 0.16], [0.105, 0.2], [0.08, 0.32], [0.065, 0.36], [0.03, 0.56], [0.02, 0.58]], 14, (i) => (i === 1 || i === 3 ? W : O));
  VK.sh(mb, 0, 0, 0.24, 0.24, 0.35);
}
function v4Drum(mb, col = '#c8102e') {
  const D = C(col, -0.55), Dd = C(vDark(col, 0.25), -0.55);
  mb.cyl(0, 0, 0, 0.29, 0.88, 0.29, 20, D, D); mb.cyl(0, 0.88, 0, 0.27, 0.885, 0.27, 20, Dd, Dd);
  for (const y of [0.02, 0.3, 0.58, 0.86]) mb.torusN(0, y, 0, 0.292, 0.012, 0.012, 22, 3, Dd);
  mb.box(-0.12, 0.38, 0.27, 0.12, 0.54, 0.296, C('#f2c230', 0)); mb.triN([-0.06, 0.41, 0.297], [0.06, 0.41, 0.297], [0, 0.51, 0.297], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#1b1b1e', 0));
  mb.cyl(0.14, 0.885, 0.06, 0.035, 0.9, 0.035, 8, Dd, Dd);
  VK.sh(mb, 0, 0, 0.34, 0.34, 0.4);
}
function v4Beacon(mb, col = '#ff3b30') {
  mb.cyl(0, 0, 0, 0.1, 0.06, 0.1, 12, C('#2b2d30', -0.6), C('#2b2d30', -0.6));
  mb.lathe(0, 0.06, 0, [[0.085, 0], [0.085, 0.1], [0.06, 0.16], [0, 0.18]], 12, C(col, 1));
  VK.halo(mb.p(0, 0.12, 0.05), 0.5, col, 0.45, 1);
}
function v4Warn(mb, s = 0.5) {
  const n = [0, 0, 1], K = C('#1b1b1e', 0), Y = C('#f2c230', 0.2), h = s * 0.866;
  mb.triN([-s / 2, -h / 3, 0.02], [s / 2, -h / 3, 0.02], [0, (2 * h) / 3, 0.02], n, n, n, K);
  const q = s * 0.78, hq = q * 0.866; mb.triN([-q / 2, -hq / 3, 0.026], [q / 2, -hq / 3, 0.026], [0, (2 * hq) / 3, 0.026], n, n, n, Y);
  mb.box(-s * 0.035, -h * 0.02, 0.026, s * 0.035, h * 0.36, 0.034, K); mb.box(-s * 0.035, -h * 0.16, 0.026, s * 0.035, -h * 0.08, 0.034, K);
}
function v4Shelf(mb, w, h, d, n, col = '#5a6068') {
  const M = C(col, -0.7), Sh = C(vLight(col, 0.1), -0.6);
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) mb.box(x - 0.025, 0, z - 0.025, x + 0.025, h, z + 0.025, M);
  for (let i = 0; i < n; i++) { const y = 0.12 + (i * (h - 0.2)) / (n - 1); mb.box(-w / 2, y, -d / 2, w / 2, y + 0.03, d / 2, Sh); }
  limb(mb, [-w / 2, 0.1, -d / 2], [w / 2, h - 0.1, -d / 2], [0.01, 0.01], M, 3); limb(mb, [w / 2, 0.1, -d / 2], [-w / 2, h - 0.1, -d / 2], [0.01, 0.01], M, 3);
}
function v4Lockers(mb, n, col = '#5c7a8c') {
  const B = C(col, -0.5), Bd = C(vDark(col, 0.25), -0.5), K = C('#1b1b1e', -0.3);
  for (let i = 0; i < n; i++) { const x = -((n - 1) * 0.52) / 2 + i * 0.52; mb.box(x - 0.25, 0.1, -0.22, x + 0.25, 1.9, 0.2, Bd); mb.box(x - 0.23, 0.14, 0.2, x + 0.23, 1.86, 0.215, B); for (let v = 0; v < 4; v++) mb.box(x - 0.12, 1.55 + v * 0.06, 0.215, x + 0.12, 1.575 + v * 0.06, 0.22, K); mb.box(x + 0.14, 0.9, 0.215, x + 0.18, 1.1, 0.235, C('#c9ced6', -0.85)); }
  mb.box(-(n * 0.52) / 2, 0, -0.22, (n * 0.52) / 2, 0.1, 0.2, K);
}
function v4VaultDoor(mb) {
  const M = C('#7d848c', -0.82), Md = C('#59606a', -0.8), Br = C('#c9ced6', -0.9);
  mb.box(-1.55, 0, 0, 1.55, 2.9, 0.06, C('#3a3d42', -0.5));
  for (let i = 0; i < 18; i++) { const n = [0, 0, 1], t = i / 18, u0 = -1.55 + t * 3.1, u1 = u0 + 3.1 / 18; mb.quadN([u0, 2.9, 0.065], [u1, 2.9, 0.065], [u1 + 0.0, 2.75, 0.065], [u0, 2.75, 0.065], n, n, n, n, C(i % 2 ? '#1b1b1e' : '#f2c230', -0.2)); }
  mb.push().T(0, 1.35, 0.06, 0, Math.PI / 2);
  mb.cyl(0, 0, 0, 1.25, 0.12, 1.25, 40, Md, Md); mb.cyl(0, 0.12, 0, 1.08, 0.3, 1.05, 40, M, M); mb.cyl(0, 0.3, 0, 0.75, 0.33, 0.75, 32, Md, Md);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; mb.cyl(Math.cos(a) * 0.93, 0.3, Math.sin(a) * 0.93, 0.05, 0.36, 0.05, 8, Br, Br); }
  mb.cyl(0, 0.33, 0, 0.16, 0.45, 0.16, 16, Br, Br); mb.torusN(0, 0.55, 0, 0.42, 0.035, 0.035, 28, 5, Br);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [0, 0.47, 0], [Math.cos(a) * 0.42, 0.55, Math.sin(a) * 0.42], [0.025, 0.025], Br, 4); }
  mb.pop();
  for (const y of [0.6, 2.1]) mb.box(-1.4, y - 0.12, 0.06, -1.1, y + 0.12, 0.3, Md);
}
function v4Sandbags(mb, w, rows = 3, seed = 1) {
  for (let r = 0; r < rows; r++) { const n = Math.max(1, Math.round(w / 0.52) - (r % 2)); for (let i = 0; i < n; i++) { const x = -((n - 1) * 0.52) / 2 + i * 0.52 + (hs(i, r + seed) - 0.5) * 0.04, c = ['#b8a57a', '#a9966c', '#c2b087'][Math.floor(hs(i * 3 + r, seed) * 3)]; mb.sphereS(x, 0.09 + r * 0.16, (hs(i, r + 9) - 0.5) * 0.05, 0.27, 0.1, 0.17, C(c, 0), 12, 6); } }
  VK.sh(mb, 0, 0, w * 0.55, 0.3, 0.32);
}
function v4Robot(mb) {
  const Y = C('#f2a20c', -0.4), K = C('#1d1d20', -0.4), M = C('#c9ced6', -0.85);
  for (const s of [-1, 1]) { mb.rbox(s * 0.3 - 0.09, 0, -0.42, s * 0.3 + 0.09, 0.2, 0.42, 0.09, K, 2); for (const z of [-0.3, 0, 0.3]) { mb.push().T(s * 0.4, 0.1, z, 0, 0, Math.PI / 2); mb.cyl(0, -0.012, 0, 0.07, 0.012, 0.07, 10, M, M); mb.pop(); } }
  mb.rbox(-0.25, 0.18, -0.34, 0.25, 0.52, 0.3, 0.05, Y, 2); mb.box(-0.2, 0.3, 0.3, 0.2, 0.42, 0.31, K);
  limb(mb, [0, 0.52, 0.05], [0, 0.95, 0.18], [0.04, 0.035], M, 6); limb(mb, [0, 0.95, 0.18], [0, 0.8, 0.55], [0.035, 0.03], M, 6);
  for (const s of [-1, 1]) mb.box(s * 0.05 - 0.015, 0.7, 0.55, s * 0.05 + 0.015, 0.8, 0.66, K);
  mb.rbox(-0.12, 0.95, -0.02, 0.12, 1.12, 0.2, 0.03, Y, 2); mb.cyl(0, 1.03, 0.2, 0.04, 1.03, 0.04, 8, K, K);
  mb.push().T(0, 1.035, 0.2, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.04, 0.03, 0.04, 10, K, K); mb.cyl(0, 0.03, 0, 0.032, 0.035, 0.032, 10, C('#5be3ff', 1), C('#5be3ff', 1)); mb.pop();
  limb(mb, [0.08, 1.12, 0.0], [0.1, 1.38, -0.04], [0.008, 0.006], K, 3); mb.sphereS(0.1, 1.39, -0.04, 0.02, 0.02, 0.02, C('#ff3b30', 1), 6, 4);
  VK.sh(mb, 0, 0, 0.5, 0.55, 0.38);
}
function v4Vessel(mb) {
  const M = C('#8a9098', -0.85), Md = C('#5a6068', -0.8), K = C('#1d1d20', -0.4);
  mb.box(-0.7, 0.32, -0.6, 0.7, 0.4, 0.6, Md); limb(mb, [0, 0.36, 0.6], [0, 0.42, 1.3], [0.035, 0.035], Md, 4); mb.torusN(0, 0.42, 1.34, 0.05, 0.015, 0.015, 10, 3, Md);
  for (const s of [-1, 1]) { mb.push().T(s * 0.74, 0.3, 0, 0, 0, Math.PI / 2); mb.cyl(0, -0.06, 0, 0.3, 0.06, 0.3, 18, K, K); mb.cyl(0, 0.06, 0, 0.12, 0.08, 0.12, 12, M, M); mb.pop(); }
  mb.sphereS(0, 1.12, 0, 0.72, 0.72, 0.72, M, 24, 14);
  mb.push().T(0, 1.12, 0.66, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.36, 0.1, 0.36, 24, Md, Md); mb.torusN(0, 0.14, 0, 0.2, 0.025, 0.025, 18, 4, C('#c9ced6', -0.9)); mb.pop();
  v4HazDecal(mb, 0, 1.6, 0.4);
  VK.sh(mb, 0, 0, 0.95, 0.8, 0.4);
}
function v4HazDecal(mb, x, y, z) { const n = vnorm([0, 0.6, 0.8]); for (let i = 0; i < 6; i++) mb.quadN([x - 0.3 + i * 0.1, y, z], [x - 0.25 + i * 0.1, y, z], [x - 0.2 + i * 0.1, y + 0.1, z - 0.07], [x - 0.25 + i * 0.1, y + 0.1, z - 0.07], n, n, n, n, C(i % 2 ? '#1b1b1e' : '#f2c230', -0.2)); }
function v4Workbench(mb, w = 2.4) {
  const Wd = C('#a77a4f', -0.15), M = C('#3a3d44', -0.7), R = C('#c8102e', -0.4);
  mb.box(-w / 2, 0.88, -0.35, w / 2, 0.95, 0.35, Wd);
  for (const [x, z] of [[-w / 2 + 0.06, -0.3], [w / 2 - 0.06, -0.3], [-w / 2 + 0.06, 0.3], [w / 2 - 0.06, 0.3]]) mb.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.88, z + 0.03, M);
  mb.box(-w / 2 + 0.06, 0.2, -0.3, w / 2 - 0.06, 0.23, 0.3, M);
  mb.box(-w / 2 + 0.15, 0.95, -0.12, -w / 2 + 0.38, 1.08, 0.12, M); mb.box(-w / 2 + 0.12, 1.08, -0.1, -w / 2 + 0.41, 1.12, 0.1, M);
  mb.rbox(0.3, 0.95, -0.2, 0.85, 1.18, 0.12, 0.02, R, 2); limb(mb, [0.42, 1.18, -0.04], [0.73, 1.18, -0.04], [0.015, 0.015], M, 3); limb(mb, [0.42, 1.18, -0.04], [0.42, 1.26, -0.04], [0.015, 0.015], M, 3); limb(mb, [0.73, 1.18, -0.04], [0.73, 1.26, -0.04], [0.015, 0.015], M, 3); limb(mb, [0.42, 1.26, -0.04], [0.73, 1.26, -0.04], [0.015, 0.015], M, 3);
  for (const [x, c] of [[-0.4, '#e63946'], [-0.15, '#3a86ff'], [0.08, '#f2c230']]) { mb.push().T(x, 1.03, 0.18, 0, 0, Math.PI / 2); mb.cyl(0, -0.05, 0, 0.08, 0.05, 0.08, 12, C(c, -0.2), C(c, -0.2)); mb.cyl(0, -0.06, 0, 0.03, 0.06, 0.03, 8, M, M); mb.pop(); }
  mb.push().T(-0.05, 0.95, -0.05); v4Bomb(mb, 0.55, false); mb.pop();
  for (let i = 0; i < 3; i++) limb(mb, [-0.1 + i * 0.03, 1.05, 0.02], [0.25 - i * 0.05, 0.955, 0.28], [0.006, 0.006], C(['#e63946', '#3a86ff', '#06d6a0'][i], -0.2), 4);
  VK.sh(mb, 0, 0, w * 0.55, 0.45, 0.36);
}
function v4Pegboard(mb, w, h) {
  mb.box(-w / 2, -h / 2, 0, w / 2, h / 2, 0.03, C('#b08455', -0.1));
  for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) { const x = -w / 2 + 0.1 + (i * (w - 0.2)) / 11, y = -h / 2 + 0.1 + (j * (h - 0.2)) / 4; mb.box(x - 0.008, y - 0.008, 0.03, x + 0.008, y + 0.008, 0.032, C('#4a3020', 0)); }
  const M = C('#9aa3ad', -0.85), R = C('#c8102e', -0.3), Y = C('#f2a20c', -0.3);
  for (let i = 0; i < 4; i++) { const x = -w / 2 + 0.3 + i * 0.22; mb.box(x - 0.02, -0.25, 0.035, x + 0.02, 0.2, 0.05, M); mb.torusN(x, 0.24, 0.045, 0.045, 0.014, 0.01, 10, 3, M); }
  mb.box(0.0, -0.05, 0.035, 0.05, 0.32, 0.06, C('#6b4428', 0)); mb.box(-0.08, 0.28, 0.035, 0.13, 0.36, 0.07, M);
  for (let i = 0; i < 3; i++) { const x = 0.35 + i * 0.16; mb.cyl(x, -0.1, 0.05, 0.022, 0.1, 0.022, 8, i % 2 ? R : Y, i % 2 ? R : Y); mb.cyl(x, 0.1, 0.05, 0.007, 0.32, 0.007, 6, M, M); }
  mb.push().T(w / 2 - 0.35, 0.05, 0.05, 0, 0, 0.4); mb.box(-0.02, -0.25, -0.01, 0.02, 0.05, 0.01, R); mb.box(-0.02, 0.05, -0.01, 0.06, 0.28, 0.01, M); mb.pop();
  mb.push().T(w / 2 - 0.25, 0.05, 0.05, 0, 0, -0.4); mb.box(-0.02, -0.25, -0.01, 0.02, 0.05, 0.01, R); mb.box(-0.06, 0.05, -0.01, 0.02, 0.28, 0.01, M); mb.pop();
}
function v4Tube(mb, len = 1.4) { mb.box(-len / 2, -0.05, 0, len / 2, 0.05, 0.14, C('#d9dde2', -0.6)); mb.box(-len / 2 + 0.05, -0.035, 0.14, len / 2 - 0.05, 0.035, 0.16, C('#f4fbff', 1)); }
function v4Extinguisher(mb) {
  const R = C('#c8102e', -0.6); mb.box(-0.1, 0.62, 0, 0.1, 0.72, 0.06, C('#3a3d44', -0.6));
  mb.cyl(0, 0.0, 0.16, 0.09, 0.55, 0.09, 14, R, R); mb.sphereS(0, 0.55, 0.16, 0.09, 0.05, 0.09, R, 12, 5); mb.cyl(0, 0.58, 0.16, 0.025, 0.66, 0.025, 8, C('#1b1b1e', -0.4), C('#1b1b1e', -0.4));
  limb(mb, [0, 0.64, 0.16], [0.08, 0.5, 0.25], [0.012, 0.012], C('#1b1b1e', -0.3), 4); limb(mb, [0.08, 0.5, 0.25], [0.07, 0.2, 0.26], [0.012, 0.014], C('#1b1b1e', -0.3), 4);
}
function v4Blueprint(mb, w, h) {
  mb.box(-w / 2 - 0.04, -h / 2 - 0.04, 0, w / 2 + 0.04, h / 2 + 0.04, 0.03, C('#3a3d44', -0.6)); mb.box(-w / 2, -h / 2, 0.03, w / 2, h / 2, 0.035, C('#1f4e8c', 0.2));
  const L = C('#cfe6ff', 0.6);
  for (let i = 1; i < 8; i++) { mb.box(-w / 2 + (i * w) / 8 - 0.003, -h / 2, 0.035, -w / 2 + (i * w) / 8 + 0.003, h / 2, 0.037, C('#3f6fae', 0.3)); }
  for (let j = 1; j < 5; j++) mb.box(-w / 2, -h / 2 + (j * h) / 5 - 0.003, 0.035, w / 2, -h / 2 + (j * h) / 5 + 0.003, 0.037, C('#3f6fae', 0.3));
  mb.torusN(-w * 0.18, 0, 0.04, h * 0.26, 0.012, 0.004, 28, 3, L); mb.box(-w * 0.18 - 0.008, h * 0.26, 0.038, -w * 0.18 + 0.008, h * 0.4, 0.042, L);
  for (const [a, b, c, d] of [[0.05, -0.3, 0.42, -0.28], [0.05, -0.3, 0.07, 0.3], [0.05, 0.28, 0.42, 0.3], [0.4, -0.3, 0.42, 0.3], [0.12, -0.1, 0.35, -0.08], [0.12, 0.08, 0.3, 0.1]]) mb.box(a * w, b * h, 0.038, c * w, d * h, 0.042, L);
}

/* ====================== mekânlar ====================== */
Object.assign(VENUES, {
  /* ---- Sessiz Sinema: art deco sinema sarayı ---- */
  ssn: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'felt', tableO: { felt: '#6e1020', wood: '#c9a34a' }, chair: 'director',
    rug: 'deco', rugO: { a: '#140a0e', b: '#c9a34a', c: '#5a0f1c' },
    L: VL2.cinema, sky: ['#0b080e', '#1f141a', '#120a0e'], sun: [0.3, 0.92, 0.25], shR: 8.6, parts: 'dust',
    post: { bloom: 0.62, th: 0.74, sat: 1.06, con: 0.14, vig: 0.46, tint: [1.03, 0.98, 0.95] },
    det: 0.1, detS: 0.45,
    logos: [[3, 0.9, 3.55, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#5e1626', { lip: '#d4ad55', lipE: -0.8, top: '#4a0f1a', fade: '#0a0507', band: '#d4ad55', bandE: -0.8 });
      vDecoCarpet(mb, '#4a0f1a', '#55121f', '#a8843a', '#d4ad55', '#140a0e');
      const WALL = { wall: '#341620', H: 6.0, dado: '#1c0a10', dadoH: 1.1, panel: '#2a1018', rail: '#c9a34a', base: '#0e0608', crown: '#c9a34a', pat: 'pin', pc: '#5a3424', ps: 0.9 };
      const G = C('#c9a34a', -0.85), Gd = C('#8a6a2a', -0.7);
      // 0: sahne, perdeler, ekran (oyun tabelası ekranda)
      vWall(0, WALL, []);
      vSign('screen', '#15101a', '#d6e4ff');
      { const s0 = SEC(0);
        for (const sx of [-1, 1]) { s0.box(sx * 2.15 - 0.2, 0, -7.8, sx * 2.15 + 0.2, 3.9, -7.6, G); for (let f = -1; f <= 1; f++) s0.box(sx * 2.15 + f * 0.11 - 0.025, 0.35, -7.6, sx * 2.15 + f * 0.11 + 0.025, 3.7, -7.58, Gd); }
        s0.box(-2.4, 3.5, -7.8, 2.4, 3.95, -7.58, G); s0.box(-2.2, 3.58, -7.58, 2.2, 3.62, -7.56, Gd);
        { const n = [0, 0, 1]; for (let k = 0; k < 12; k++) { const a0 = (k / 12) * Math.PI, a1 = ((k + 1) / 12) * Math.PI, r = 0.85; s0.triN([0, 3.95, -7.6], [Math.cos(a0) * r, 3.95 + Math.sin(a0) * r, -7.6], [Math.cos(a1) * r, 3.95 + Math.sin(a1) * r, -7.6], n, n, n, k % 2 ? G : Gd); } s0.sphereS(0, 3.95, -7.58, 0.22, 0.22, 0.03, C('#ffe9a8', 0.9), 12, 4); }
        s0.box(-3.5, 0, -7.8, 3.5, 0.3, -6.9, C('#2a1018', -0.2)); s0.box(-3.52, 0.28, -6.93, 3.52, 0.32, -6.88, G);
        for (let i = 0; i < 12; i++) s0.sphereS(-3.25 + i * 0.59, 0.18, -6.87, 0.04, 0.04, 0.03, C('#fff1c9', 1), 6, 4);
        for (const sx of [-1, 1]) v4Curtain(s0, sx * 2.42, sx * 4.5, 0, 5.2, -7.58, '#8c1424', '#6a0e1a', 9, sx);
        v4Valance(s0, -4.7, 4.7, 5.25, -7.56, '#8c1424', '#c9a34a', 5);
      }
      VK.glow(0, 0.02, -6.0, 3.0, '#9fb8ff', 0.07, 'h', 0.3, 0, 1.6, 0);
      for (const u of [-6.2, 6.2]) P.sconce(SEC(0), 0, u, 2.9, '#ffe2b0', '#c9a34a');
      // 1: sağ — büfe: tezgâh, cam vitrin, mısır makinesi, menü panosu, ışıklı afişler
      vWall(1, WALL, []);
      VK.inSec(1, (s) => {
        wAt(s, 1, -2.0, 0.42); P.counter(s, 3.4, 1.0, 0.7, '#5a1420', '#1b1b1e', { railC: '#c9a34a' });
        s.box(-1.62, 1.0, -0.26, 0.15, 1.38, 0.24, C('#d6ecf4', -0.92)); s.box(-1.6, 1.38, -0.24, 0.13, 1.4, 0.22, G);
        for (let i = 0; i < 14; i++) { const x = -1.5 + (i % 7) * 0.24, z = -0.12 + Math.floor(i / 7) * 0.2; s.box(x, 1.0, z, x + 0.16, 1.14 + hs(i, 3) * 0.08, z + 0.1, C(['#e63946', '#ffd166', '#3a86ff', '#06d6a0', '#ff8fc7', '#f4a261'][i % 6], 0.2)); }
        s.pop();
        wAt(s, 1, -0.6, 0.42, 1.0); v4PopcornMachine(s); s.pop();
        wAt(s, 1, -2.0, 0, 2.95); v4MenuBoard(s, 2.6, 1.1); s.pop();
        for (const u of [2.3, 4.6]) { wAt(s, 1, u, 0, 2.35); v4PosterBox(s, 1.1, 1.6, Math.round(u * 3)); s.pop(); VK.wglow(1, u, 0.06, 2.35, 1.0, '#ffe2b0', 0.12, 1.2); }
      });
      P.sconce(SEC(1), 1, -5.6, 2.9, '#ffe2b0', '#c9a34a'); P.sconce(SEC(1), 1, 6.6, 2.9, '#ffe2b0', '#c9a34a');
      // 2: ön — giriş kapıları, yelpaze vasistas, ışıklı afişler
      vWall(2, WALL, [{ u0: -1.32, u1: 1.32, y0: 0, y1: 2.6 }]);
      for (const u of [-0.66, 0.66]) vDoor(2, u, { w: 1.3, h: 2.6, frame: '#c9a34a', door: '#3a1820', glass: '#ffcf8a', knob: '#c9a34a' });
      VK.inSec(2, (s) => {
        wAt(s, 2, 0, 0, 2.86); { const n = [0, 0, 1]; for (let k = 0; k < 9; k++) { const a0 = (k / 9) * Math.PI, a1 = ((k + 1) / 9) * Math.PI; s.triN([0, 0, 0.03], [Math.cos(a0) * 1.15, Math.sin(a0) * 1.15, 0.03], [Math.cos(a1) * 1.15, Math.sin(a1) * 1.15, 0.03], n, n, n, C(k % 2 ? '#ffcf8a' : '#ffe2b0', 0.9)); } s.box(-1.25, -0.06, 0, 1.25, 0.02, 0.06, G); s.torusN(0, 0, 0.03, 1.18, 0.04, 0.03, 24, 3, G); } s.pop();
        for (const u of [-3.4, -5.6, 3.4, 5.6]) { wAt(s, 2, u, 0, 2.35); v4PosterBox(s, 1.1, 1.6, Math.round(u * 5) + 40); s.pop(); VK.wglow(2, u, 0.06, 2.35, 1.0, '#ffe2b0', 0.12, 1.2); }
      });
      VK.wglow(2, 0, 0.08, 1.5, 1.6, '#ffcf8a', 0.14, 1.4);
      // 3: sol — bilet gişesi, logo çerçevesi, ışıklı afişler
      vWall(3, WALL, []);
      VK.inSec(3, (s) => {
        wAt(s, 3, -2.6, 0.72); v4TicketBooth(s); s.pop();
        wAt(s, 3, 0.9, 0, 3.55); s.box(-0.52, -0.52, 0, 0.52, 0.52, 0.04, G); s.box(-0.47, -0.47, 0.04, 0.47, 0.47, 0.05, C('#15101a', 0)); s.pop();
        for (const u of [3.1, 5.4]) { wAt(s, 3, u, 0, 2.35); v4PosterBox(s, 1.1, 1.6, Math.round(u * 7) + 11); s.pop(); VK.wglow(3, u, 0.06, 2.35, 1.0, '#ffe2b0', 0.12, 1.2); }
        for (let i = 0; i < 5; i++) { wAt(s, 3, -5.0 + (i % 3) * 0.04, 0.42 + (i % 2) * 0.04); s.cyl(0, i * 0.075, 0, 0.32, i * 0.075 + 0.07, 0.32, 20, C('#5a6068', -0.85), C('#7d848c', -0.85)); s.pop(); }
      });
      P.sconce(SEC(3), 3, -5.9, 2.9, '#ffe2b0', '#c9a34a'); P.sconce(SEC(3), 3, 1.9, 2.9, '#ffe2b0', '#c9a34a');
      // salon: koltuk sıraları (ekrana dönük), kadife kordonlar, projektör, kamera, spot ışıkları, palmiyeler
      for (const [z, n] of [[4.7, 8], [5.85, 9]]) for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.62; mb.push().T(x, 0, z, Math.PI); v4CinemaSeat(mb, '#8c1424'); mb.pop(); }
      VK.blob(0, 4.7, 2.6, 0.36, 0.3); VK.blob(0, 5.85, 2.9, 0.36, 0.3);
      v4Stanchions(mb, [[5.9, -3.8], [5.9, -2.4], [5.9, -1.0]]);
      v4Stanchions(mb, [[-5.95, 1.0], [-5.95, 2.3], [-5.95, 3.6]]);
      VK.tall(-4.9, 5.0, (m) => v4Projector(m), Math.PI + 0.35);
      VK.tall(4.9, 4.9, (m) => v4MovieCam(m), Math.PI - 0.55);
      for (const [x, z] of [[-5.7, -4.9], [5.7, -4.8]]) VK.tall(x, z, (m) => v4Spot(m, '#ffe9c0'), Math.atan2(-x, -6.8 - z));
      for (const [x, z] of [[-6.95, -6.95], [6.95, -6.95], [6.95, 6.95], [-6.95, 6.95]]) VK.tall(x, z, (m) => P.ficus(m, 1.0, '#c9a34a'));
      mb.push().T(-3.2, 0, 3.9, 0.4); v4PopcornBucket(mb); mb.pop();
      mb.push().T(3.5, 0, 3.7, -0.5); P.stool(mb, 0.62, '#1b1416', '#c9a34a'); mb.push().T(0, 0.62, 0, 0.3); v4Clapper(mb); mb.pop(); mb.pop();
    },
  },
  /* ---- Sayı Bombası: bomba imha sığınağı ---- */
  sbm: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'spool', chair: 'crate', rug: 'hazard', rugO: {},
    L: VL2.bunker, sky: ['#14161a', '#2a2e34', '#1a1c20'], sun: [0.25, 0.92, 0.3], shR: 8.6, parts: 'dust',
    post: { bloom: 0.5, th: 0.78, sat: 1.04, con: 0.14, vig: 0.4, tint: [0.98, 1.0, 1.03] },
    det: 0.22, detS: 0.6,
    logos: [[1, 5.6, 3.2, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#62666c', { lip: '#9a9da1', fade: '#141518', band: '#e0b020', bandE: -0.1 });
      vConcrete(mb, 1.95, '#7e8185', '#777a7e', '#5c5f63', { line: '#d9a820', lineIn: 1.25 });
      const WALL = { wall: '#8e9296', H: 6.0, dado: '#50555a', dadoH: 0.9, base: '#2b2d30', pat: 'brick', pc: ['#979b9f', '#8a8e92', '#a0a4a8'], ps: 0.56 };
      for (let k = 0; k < 4; k++) { vWall(k, WALL, k === 2 ? [] : []); v4HazBand(k, 0.9, 1.14); }
      for (let k = 0; k < 4; k++) for (const u of [-4.2, 0, 4.2]) { if (k === 0 && u === 0) continue; VK.inSec(k, (s) => { wAt(s, k, u, 0, 4.7); v4Tube(s, 1.5); s.pop(); }); VK.wglow(k, u, 0.1, 4.3, 1.4, '#e8f4ff', 0.16, 1.0); const p = wXZ(k, u, 1.4); VK.glow(p[0], 0.014, p[1], 1.6, '#e8f4ff', 0.07, 'h', 0, W_RY[k], 1.1, k); }
      // 0: tabela, geri sayım saati, döner lambalar, uyarı levhaları, raflar
      vSign('frame', '#3a3d42', '#f4f1ea', { lampC: '#2b2b2b' });
      { const s0 = SEC(0); s0.rbox(-1.9, 3.3, -7.8, 1.9, 4.45, -7.62, 0.04, C('#16161a', -0.5), 2); s0.box(-1.8, 3.38, -7.62, 1.8, 4.37, -7.6, C('#0e0c0c', 0)); v4Digits(s0, '00:10', 0, 3.875, -7.6, 0.42, 0.72, '#ff2a2a', '#2a0b0b'); }
      VK.wglow(0, 0, 0.14, 3.9, 2.0, '#ff3b30', 0.2, 0.75);
      VK.inSec(0, (s) => { for (const u of [-2.4, 2.4]) { wAt(s, 0, u, 0, 4.0); s.box(-0.08, -0.06, 0, 0.08, 0.0, 0.16, C('#2b2d30', -0.5)); s.push().T(0, 0, 0.1); v4Beacon(s, '#ff3b30'); s.pop(); s.pop(); } for (const u of [-4.4, 4.4]) { wAt(s, 0, u, 0, 2.5); v4Warn(s, 0.7); s.pop(); } for (const u of [-6.3, 6.3]) { wAt(s, 0, u, 0.32); v4Shelf(s, 1.5, 2.3, 0.55, 4, '#5a6068'); for (let i = 0; i < 6; i++) { s.push().T(-0.5 + (i % 3) * 0.5, 0.15 + Math.floor(i / 3) * 0.7, 0); i % 2 ? P.crate(s, 0.42, '#8a6238') : v4Bomb(s, 0.7, false); s.pop(); } s.push().T(0, 1.55, 0); for (const x of [-0.45, 0.05]) { s.push().T(x, 0, 0); s.sphereS(0, 0.1, 0, 0.17, 0.12, 0.2, C('#f2c230', -0.4), 12, 6); s.cyl(0, 0.0, 0, 0.22, 0.02, 0.24, 14, C('#f2c230', -0.4), C('#f2c230', -0.4)); s.pop(); } s.pop(); s.pop(); } });
      // 1: sağ — tezgâh ve takım panosu, dolaplar, logo
      VK.inSec(1, (s) => { wAt(s, 1, -2.0, 0.4); v4Workbench(s, 2.6); s.pop(); wAt(s, 1, -2.0, 0, 2.05); v4Pegboard(s, 2.6, 1.0); s.pop(); wAt(s, 1, 3.2, 0.24); v4Lockers(s, 4, '#5c7a8c'); s.pop(); wAt(s, 1, 5.6, 0, 3.2); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#3a3d42', -0.6)); s.pop(); wAt(s, 1, 0.6, 0, 1.25); v4Extinguisher(s); s.pop(); });
      { const p = wXZ(1, -2.0, 0.7); VK.halo([p[0], 1.6, p[1]], 0.6, '#fff1d0', 0.22); }
      // 2: ön — çelik sığınak kapısı, kum torbaları, yangın tüpü, ilk yardım dolabı
      VK.inSec(2, (s) => { wAt(s, 2, 0, 0); v4VaultDoor(s); s.pop(); for (const u of [-2.5, 2.5]) { wAt(s, 2, u, 0.4); v4Sandbags(s, 1.6, 4, Math.round(u + 7)); s.pop(); } wAt(s, 2, 4.4, 0, 1.0); v4Extinguisher(s); s.pop(); wAt(s, 2, -4.4, 0, 1.6); s.box(-0.3, -0.25, 0, 0.3, 0.25, 0.14, C('#f4f4f4', -0.3)); s.box(-0.05, -0.15, 0.14, 0.05, 0.15, 0.15, C('#e63946', 0.3)); s.box(-0.15, -0.05, 0.14, 0.15, 0.05, 0.15, C('#e63946', 0.3)); s.pop(); for (const u of [-1.8, 1.8]) { wAt(s, 2, u, 0, 3.3); s.box(-0.08, -0.06, 0, 0.08, 0.0, 0.16, C('#2b2d30', -0.5)); s.push().T(0, 0, 0.1); v4Beacon(s, '#ff8a00'); s.pop(); s.pop(); } });
      // 3: sol — bomba rafları, plan panosu
      VK.inSec(3, (s) => { for (const u of [-3.6, -1.6]) { wAt(s, 3, u, 0.34); v4Shelf(s, 1.7, 2.2, 0.55, 4, '#4e555e'); for (let i = 0; i < 9; i++) { s.push().T(-0.55 + (i % 3) * 0.55, 0.15 + Math.floor(i / 3) * (2.0 / 3), 0); (i + Math.round(u)) % 3 === 0 ? P.crate(s, 0.4, '#8a6238') : v4Bomb(s, 0.62, false); s.pop(); } s.pop(); } wAt(s, 3, 1.6, 0, 2.3); v4Blueprint(s, 2.0, 1.3); s.pop(); wAt(s, 3, 4.4, 0, 2.5); v4Warn(s, 0.8); s.pop(); });
      // salon: variller, koniler, kum torbası öbekleri, kablo makarası, imha robotu, imha küresi, sandıklar
      for (const [x, z, c] of [[-4.6, -5.6, '#c8102e'], [-3.9, -6.2, '#f2a20c'], [5.5, 4.9, '#2a6f97'], [6.1, 4.3, '#c8102e']]) { mb.push().T(x, 0, z, hs(x, z) * 3); v4Drum(mb, c); mb.pop(); }
      for (const [x, z] of [[2.9, 4.6], [-2.7, 4.9], [5.3, -3.0], [-5.2, 2.6], [1.2, -5.4]]) { mb.push().T(x, 0, z); v4Cone(mb); mb.pop(); }
      for (const [x, z, w, r] of [[4.3, -5.4, 1.6, 3], [-6.2, 4.9, 1.1, 2]]) { mb.push().T(x, 0, z, Math.atan2(-x, -z)); v4Sandbags(mb, w, r, Math.round(x)); mb.pop(); }
      mb.push().T(-6.0, 0, -1.4, 0.4); mb.cyl(0, 0, 0, 0.5, 0.08, 0.5, 18, C('#8a6238', 0), C('#8a6238', 0)); mb.cyl(0, 0.08, 0, 0.2, 0.62, 0.2, 14, C('#e63946', -0.2), C('#e63946', -0.2)); mb.cyl(0, 0.62, 0, 0.5, 0.7, 0.5, 18, C('#8a6238', 0), C('#8a6238', 0)); VK.sh(mb, 0, 0, 0.55, 0.55, 0.38); mb.pop();
      VK.tall(5.6, 1.6, (m) => v4Robot(m), -Math.PI / 2 - 0.5);
      VK.tall(-5.6, -3.8, (m) => v4Vessel(m), 0.9);
      for (const [x, z, s] of [[6.2, -4.4, 0.6], [5.6, -5.1, 0.55], [5.95, -4.75, 0.5]]) { mb.push().T(x, z === -4.75 ? 0.46 : 0, z, hs(x, z)); P.crate(mb, s, '#8a6238'); mb.box(-s / 2 - 0.005, s * 0.25, s / 2, s / 2 + 0.005, s * 0.4, s / 2 + 0.008, C('#c8102e', 0)); mb.pop(); }
      mb.push().T(-1.6, 0, 5.7, 0.2); v4Bomb(mb, 1.5, true); mb.pop();
      mb.push().T(3.8, 0, 5.8, -0.3); mb.box(-0.4, 0.0, -0.25, 0.4, 0.1, 0.25, C('#2b2d30', -0.5)); mb.rbox(-0.38, 0.1, -0.24, 0.38, 0.22, 0.24, 0.02, C('#1d1d20', -0.5), 2); mb.box(-0.3, 0.22, -0.18, 0.3, 0.23, 0.18, C('#3a3d44', -0.4)); mb.box(-0.12, 0.23, -0.1, 0.12, 0.3, 0.02, C('#0e0c0c', 0)); v4Digits(mb, '07', 0, 0.265, 0.021, 0.034, 0.055, '#ff2a2a', '#2a0b0b'); for (let i = 0; i < 4; i++) limb(mb, [-0.2 + i * 0.12, 0.235, 0.05], [-0.15 + i * 0.1, 0.24, 0.16], [0.008, 0.008], C(['#e63946', '#3a86ff', '#06d6a0', '#ffd166'][i], -0.2), 3); VK.sh(mb, 0, 0, 0.45, 0.3, 0.36); mb.pop();
    },
  },
});

/* ---- 3. paket (devam): kulüp salonu, boya atölyesi, atari salonu ---- */
// sepet örgüsü parke: 0.6 m karelerde üçer tahta, komşu kareler dik; duvar dibinde boyuna bordür
function vFloorBasket(mb, cols, gap, o = {}) {
  const s = o.s ?? 0.6, B = RW - (o.border ? o.bw ?? 0.45 : 0), e = o.e ?? -0.25;
  VK.quad(mb, -RW, -RW, RW, RW, C(gap, 0), 0);
  let i = 0;
  for (let x = -B; x < B - 1e-6; x += s, i++) { let j = 0; for (let z = -B; z < B - 1e-6; z += s, j++) {
    const x1 = Math.min(x + s, B), z1 = Math.min(z + s, B);
    for (let k = 0; k < 3; k++) { const c = C(cols[Math.floor(hs(i * 31 + j * 7, k + 3) * cols.length)], e);
      if ((i + j) % 2) { const za = z + (k * s) / 3, zb = Math.min(z + ((k + 1) * s) / 3, z1); if (zb - za > 0.03) VK.quad(mb, x + 0.01, za + 0.008, x1 - 0.01, zb - 0.008, c, 0.003); }
      else { const xa = x + (k * s) / 3, xb = Math.min(x + ((k + 1) * s) / 3, x1); if (xb - xa > 0.03) VK.quad(mb, xa + 0.008, z + 0.01, xb - 0.008, z1 - 0.01, c, 0.003); }
    }
  } }
  if (o.border) { const c2 = C(o.border, e); for (const [a, b, c, d] of [[-RW, -RW, RW, -B - 0.012], [-RW, B + 0.012, RW, RW], [-RW, -B, -B - 0.012, B], [B + 0.012, -B, RW, B]]) VK.quad(mb, a, b, c, d, c2, 0.003); }
}
// sanat atölyesi zemini: açık beton + boya lekeleri + örtüler
const PAINT = ['#e63946', '#f3722c', '#f9c74f', '#90be6d', '#2a9d8f', '#277da1', '#4361ee', '#7209b7', '#f72585', '#ff8fc7', '#06d6a0', '#ffd166'];
// atari halısı: koyu zemin, gece parlayan neon şekiller (halka, üçgen, dalga, zikzak, artı, nokta)
function vArcadeCarpet(mb, base, cols, o = {}) {
  VK.quad(mb, -RW, -RW, RW, RW, C(base, 0), 0);
  const s = 0.95, e = o.e ?? 0.5, y = 0.004; let i = 0;
  for (let x = -RW + s / 2; x < RW; x += s) for (let z = -RW + s / 2; z < RW; z += s, i++) {
    const px = x + (hs(i, 1) - 0.5) * s * 0.55, pz = z + (hs(i, 2) - 0.5) * s * 0.55; if (Math.hypot(px, pz) < 3.7) continue;
    const c = C(cols[Math.floor(hs(i, 3) * cols.length)], e), t = Math.floor(hs(i, 4) * 5), a = hs(i, 5) * TAU;
    const R2 = (u, v) => [px + Math.cos(a) * u - Math.sin(a) * v, pz + Math.sin(a) * u + Math.cos(a) * v];
    if (t === 0) mb.lathe(px, y, pz, [[0.14, 0], [0.095, 0]], 14, c);
    else if (t === 1) { const P3 = [0, 1, 2].map((k) => R2(Math.cos((k / 3) * TAU) * 0.17, Math.sin((k / 3) * TAU) * 0.17)); for (let k = 0; k < 3; k++) v4Seg(mb, P3[k][0], P3[k][1], P3[(k + 1) % 3][0], P3[(k + 1) % 3][1], 0.022, c, y); }
    else if (t === 2) { let p = R2(-0.3, 0); for (let k = 1; k <= 6; k++) { const q = R2(-0.3 + k * 0.1, Math.sin(k * 1.6) * 0.06); v4Seg(mb, p[0], p[1], q[0], q[1], 0.02, c, y); p = q; } }
    else if (t === 3) { let p = R2(-0.24, -0.05); for (let k = 1; k <= 4; k++) { const q = R2(-0.24 + k * 0.12, k % 2 ? 0.06 : -0.06); v4Seg(mb, p[0], p[1], q[0], q[1], 0.022, c, y); p = q; } }
    else if (hs(i, 6) > 0.5) { const A = R2(-0.12, 0), B2 = R2(0.12, 0), Cc = R2(0, -0.12), D = R2(0, 0.12); v4Seg(mb, A[0], A[1], B2[0], B2[1], 0.026, c, y); v4Seg(mb, Cc[0], Cc[1], D[0], D[1], 0.026, c, y); }
    else for (let k = 0; k < 3; k++) { const q = R2(Math.cos(k * 2.1) * 0.09, Math.sin(k * 2.1) * 0.09); mb.disc(q[0], y, q[1], 0.045, 0.045, 8, c, c); }
  }
}
// boya damlası halısı: düzensiz kenarlı tuval örtü, üstünde renkli lekeler
RUGS.splat = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, n = 30, Cl = C(o.cloth || '#ece3d0', 0), Cd = C('#d9cfba', 0);
  mb.cyl(0, 0, 0, R * 0.96, y - 0.004, R * 0.96, 36, Cd, Cd, 'b');
  for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, r0 = R * (0.94 + hs(k, 3) * 0.08), r1 = R * (0.94 + hs((k + 1) % n, 3) * 0.08); mb.triN([0, y, 0], [Math.cos(a0) * r0, y, Math.sin(a0) * r0], [Math.cos(a1) * r1, y, Math.sin(a1) * r1], UPV, UPV, UPV, Cl); }
  for (let i = 0; i < 26; i++) { const a = hs(i, 5) * TAU, r = (0.35 + 0.6 * Math.sqrt(hs(i, 6))) * (R - 0.35); v4Blot(mb, Math.cos(a) * r, y + 0.003 + (i % 3) * 0.0015, Math.sin(a) * r, 0.1 + hs(i, 7) * 0.2, PAINT[i % PAINT.length], i + 3, 4); }
};

/* ---- Kulüp salonu eşyaları ---- */
function v5Wingback(mb, col = '#2f4a3a') {
  const B = C(col, -0.15), Bd = C(vDark(col, 0.18), -0.15), L = C('#2a140a', -0.3), K = C(vDark(col, 0.4), -0.2);
  mb.rbox(-0.42, 0.14, -0.4, 0.42, 0.44, 0.42, 0.06, Bd, 2);
  mb.rbox(-0.33, 0.42, -0.28, 0.33, 0.56, 0.42, 0.06, B, 2);
  mb.rbox(-0.42, 0.4, -0.42, 0.42, 1.22, -0.24, 0.08, B, 2);
  for (const s of [-1, 1]) { mb.rbox(s > 0 ? 0.3 : -0.44, 0.4, -0.4, s > 0 ? 0.44 : -0.3, 0.72, 0.42, 0.07, B, 2); mb.rbox(s > 0 ? 0.32 : -0.44, 0.7, -0.42, s > 0 ? 0.44 : -0.32, 1.18, -0.06, 0.07, B, 2); }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) mb.sphereS(-0.2 + c * 0.2, 0.62 + r * 0.18, -0.235, 0.018, 0.018, 0.01, K, 6, 3);
  for (const [x, z] of [[-0.36, -0.34], [0.36, -0.34], [-0.36, 0.36], [0.36, 0.36]]) mb.cyl(x, 0, z, 0.025, 0.15, 0.035, 8, L, L);
  VK.sh(mb, 0, 0, 0.52, 0.52, 0.4);
}
function v5Fireplace(mb) {
  const Mb = C('#d9d0c0', -0.4), Md = C('#bfb5a3', -0.4), Bk = C('#120d0b', 0), Br = C('#c9a34a', -0.88), Lg = C('#5a3a24', 0);
  mb.box(-1.3, 0, 0, 1.3, 0.08, 0.75, Md);
  for (const s of [-1, 1]) { mb.box(s * 0.98 - 0.2, 0.08, 0, s * 0.98 + 0.2, 1.25, 0.32, Mb); mb.box(s * 0.98 - 0.24, 0.08, 0, s * 0.98 + 0.24, 0.26, 0.36, Md); for (let f = -1; f <= 1; f++) mb.box(s * 0.98 + f * 0.1 - 0.02, 0.3, 0.32, s * 0.98 + f * 0.1 + 0.02, 1.0, 0.335, Md); }
  mb.box(-1.18, 1.0, 0, 1.18, 1.25, 0.34, Mb); mb.box(-1.4, 1.25, 0, 1.4, 1.33, 0.44, Md);
  mb.box(-0.78, 0.08, 0, 0.78, 1.0, 0.06, Bk); mb.box(-0.78, 0.08, 0.06, -0.72, 1.0, 0.3, Bk); mb.box(0.72, 0.08, 0.06, 0.78, 1.0, 0.3, Bk);
  for (let i = 0; i < 4; i++) mb.box(-0.5 + i * 0.33, 0.1, 0.12, -0.48 + i * 0.33, 0.2, 0.42, C('#2b2b2e', -0.6));
  limb(mb, [-0.45, 0.24, 0.2], [0.42, 0.22, 0.3], [0.07, 0.065], Lg, 6); limb(mb, [-0.36, 0.22, 0.36], [0.46, 0.27, 0.18], [0.065, 0.06], Lg, 6); limb(mb, [-0.1, 0.32, 0.18], [0.2, 0.34, 0.34], [0.05, 0.05], C('#3a2416', 0), 5);
  for (const [x, z, r, h, c] of [[-0.15, 0.27, 0.16, 0.62, '#ff8a1f'], [0.18, 0.25, 0.13, 0.5, '#ff8a1f'], [0.02, 0.28, 0.1, 0.42, '#ffd25a'], [-0.32, 0.27, 0.08, 0.32, '#ffd25a']]) mb.cyl(x, 0.26, z, r, 0.26 + h, 0, 7, C(c, 1), C(c, 1), '');
  limb(mb, [-0.85, 0.14, 0.66], [0.85, 0.14, 0.66], [0.018, 0.018], Br, 4); for (const x of [-0.85, 0.85]) mb.sphereS(x, 0.14, 0.66, 0.04, 0.04, 0.04, Br, 8, 5);
  for (const x of [-1.05, 1.05]) { mb.push().T(x, 1.33, 0.2); mb.lathe(0, 0, 0, [[0.06, 0], [0.02, 0.06], [0.02, 0.22], [0.04, 0.24]], 10, Br); mb.push().T(0, 0.24, 0); P.candle(mb, 0.14, '#f4efe6', { r: 0.4, a: 0.25 }); mb.pop(); mb.pop(); }
  mb.push().T(0, 1.33, 0.22); mb.rbox(-0.2, 0, -0.08, 0.2, 0.3, 0.08, 0.05, C('#4a2614', -0.4), 2); mb.push().T(0, 0.16, 0.08, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.09, 0.01, 0.09, 16, C('#f4ecd8', 0), C('#f4ecd8', 0)); mb.pop(); mb.pop();
  VK.halo(mb.p(0, 0.5, 0.3), 0.75, '#ff9a3c', 0.45, 1); const f = mb.p(0, 0, 1.5); VK.glow(f[0], 0.015, f[2], 2.0, '#ff9a3c', 0.17, 'h', 1);
}
function v5GrandClock(mb) {
  const W = C('#4a2614', -0.4), Wd = C('#2e1608', -0.4), Br = C('#c9a34a', -0.88);
  mb.box(-0.33, 0, -0.2, 0.33, 0.42, 0.2, Wd); mb.box(-0.27, 0.42, -0.16, 0.27, 1.55, 0.16, W); mb.box(-0.33, 1.55, -0.2, 0.33, 2.15, 0.2, Wd);
  mb.box(-0.16, 0.6, 0.16, 0.16, 1.45, 0.168, C('#1a120c', 0)); limb(mb, [0, 1.42, 0.172], [0, 0.86, 0.172], [0.006, 0.006], Br, 3);
  mb.push().T(0, 0.82, 0.174, 0, Math.PI / 2); mb.cyl(0, -0.008, 0, 0.08, 0.008, 0.08, 16, Br, Br); mb.pop();
  mb.push().T(0, 1.86, 0.2); P.clock(mb, 0.22, '#c9a34a', '#f4ecd8'); mb.pop();
  mb.box(-0.37, 2.15, -0.22, 0.37, 2.22, 0.22, W); mb.box(-0.2, 2.22, -0.14, 0.2, 2.34, 0.14, Wd); for (const x of [-0.3, 0, 0.3]) mb.sphereS(x, x ? 2.27 : 2.4, 0.1, 0.04, 0.05, 0.04, Br, 8, 5);
  VK.sh(mb, 0, 0, 0.4, 0.3, 0.4);
}
function v5GlobeBar(mb) {
  const W = C('#4a2614', -0.4), Br = C('#c9a34a', -0.88);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; limb(mb, [Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38], [Math.cos(a) * 0.33, 0.62, Math.sin(a) * 0.33], [0.03, 0.026], W, 5); }
  mb.torusN(0, 0.62, 0, 0.38, 0.04, 0.03, 28, 4, W); mb.torusN(0, 0.2, 0, 0.33, 0.02, 0.02, 20, 3, W);
  mb.push().T(0, 0.9, 0, 0, 0, 0.41);
  mb.push().T(0, 0, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.37, 0.016, 0.012, 32, 3, Br); mb.pop();
  mb.sphereS(0, 0, 0, 0.34, 0.34, 0.34, C('#2f5a6a', -0.4), 22, 14, (ux, uy, uz) => { const v = Math.sin(ux * 5.1 + uy * 2.3) * Math.cos(uz * 4.7 - uy * 1.9) + Math.sin(uy * 7.3 + ux * 1.1) * 0.5; return C(v > 0.3 ? '#cbb27a' : '#2f5a6a', -0.4); });
  mb.pop();
  VK.sh(mb, 0, 0, 0.46, 0.46, 0.4);
}
function v5Gramophone(mb) {
  const Br = C('#c9a34a', -0.9);
  P.sideTable(mb, 0.32, 0.62, '#4a2614', '#2e1608');
  mb.push().T(0, 0.62, 0);
  mb.box(-0.2, 0, -0.2, 0.2, 0.14, 0.2, C('#5a3018', -0.35)); mb.cyl(0, 0.14, 0, 0.17, 0.16, 0.17, 20, C('#1a1a1c', -0.6), C('#1a1a1c', -0.6)); mb.cyl(0, 0.16, 0, 0.045, 0.165, 0.045, 10, C('#c8102e', 0), C('#c8102e', 0));
  limb(mb, [0.15, 0.14, -0.14], [0.13, 0.32, -0.12], [0.014, 0.012], Br, 3);
  mb.push().T(0.13, 0.32, -0.12, 0, 0.85); mb.lathe(0, 0, 0, [[0.02, 0], [0.035, 0.12], [0.08, 0.26], [0.19, 0.38], [0.27, 0.43]], 18, Br, ''); mb.pop();
  limb(mb, [0.15, 0.17, 0.1], [0.02, 0.18, 0.03], [0.006, 0.006], Br, 3);
  mb.pop();
}
function v5ChessTable(mb) {
  const W = C('#4a2614', -0.4);
  mb.cyl(0, 0, 0, 0.3, 0.05, 0.28, 16, W, W); mb.lathe(0, 0.05, 0, [[0.06, 0], [0.09, 0.1], [0.05, 0.3], [0.07, 0.55], [0.05, 0.62]], 12, W);
  mb.box(-0.36, 0.62, -0.36, 0.36, 0.68, 0.36, W);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = -0.28 + i * 0.07, z = -0.28 + j * 0.07; mb.box(x, 0.68, z, x + 0.07, 0.686, z + 0.07, C((i + j) % 2 ? '#2e1608' : '#e9d6b0', -0.45)); }
  for (let k = 0; k < 12; k++) { const i = [0, 1, 2, 4, 6, 7, 3, 5, 1, 6, 4, 2][k], j = k < 6 ? (k % 2 ? 1 : 0) : (k % 2 ? 6 : 7), x = -0.245 + i * 0.07, z = -0.245 + j * 0.07, c = j < 4 ? '#f4ecd8' : '#1b1416', h = k % 5 === 0 ? 0.08 : 0.05; mb.lathe(x, 0.686, z, [[0.02, 0], [0.014, h * 0.45], [0.009, h * 0.8], [0.013, h]], 10, C(c, -0.6)); mb.sphereS(x, 0.686 + h + 0.008, z, 0.011, 0.011, 0.011, C(c, -0.6), 6, 4); }
  VK.sh(mb, 0, 0, 0.42, 0.42, 0.38);
}
function v5BankerLamp(mb) {
  const Br = C('#c9a34a', -0.88);
  mb.lathe(0, 0, 0, [[0.09, 0], [0.07, 0.03], [0.02, 0.05]], 14, Br); limb(mb, [0, 0.04, 0], [0, 0.32, 0], [0.012, 0.012], Br, 3);
  mb.push().T(0, 0.36, 0, 0, 0, Math.PI / 2); mb.cyl(0, -0.16, 0, 0.075, 0.16, 0.075, 14, C('#1f6b47', 0.85), C('#1f6b47', 0.85), ''); mb.pop();
  mb.box(-0.16, 0.29, -0.06, 0.16, 0.3, 0.06, C('#fff1c9', 1));
  const p = mb.p(0, 0.3, 0); VK.halo(p, 0.45, '#d8ffd0', 0.22); VK.pool([p[0], 0, p[2]], 0.9, '#ffe0a8', 0.12);
}
function v5Decanter(mb) {
  const Br = C('#c9a34a', -0.88), Gl = C('#d9ecf2', -0.92);
  mb.box(-0.22, 0, -0.14, 0.22, 0.02, 0.14, Br);
  mb.lathe(-0.06, 0.02, 0, [[0.07, 0], [0.075, 0.1], [0.04, 0.16], [0.022, 0.22], [0.025, 0.24]], 14, C('#c9822a', -0.9)); mb.sphereS(-0.06, 0.29, 0, 0.03, 0.035, 0.03, Gl, 8, 5);
  for (const x of [0.08, 0.16]) mb.lathe(x, 0.02, 0.04, [[0.032, 0], [0.036, 0.08]], 12, Gl, 'b');
}
function v5CardTable(mb) {
  const W = C('#3a1e10', -0.4), F = C('#1f5a3e', 0);
  for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) mb.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.7, z + 0.03, W);
  mb.box(-0.45, 0.7, -0.45, 0.45, 0.75, 0.45, W); mb.box(-0.4, 0.75, -0.4, 0.4, 0.755, 0.4, F);
  for (let i = 0; i < 5; i++) { mb.push().T(-0.12, 0.756 + i * 0.002, 0.08, -0.5 + i * 0.22); mb.box(-0.04, 0, -0.06, 0.04, 0.002, 0.06, C('#fbf6ec', 0)); mb.box(-0.025, 0.002, 0.03, -0.01, 0.0025, 0.045, C(i % 2 ? '#c8102e' : '#16161a', 0)); mb.pop(); }
  for (const [x, z, c, n] of [[0.18, -0.12, '#c8102e', 6], [0.24, 0.04, '#2a6fdb', 4], [0.08, -0.2, '#16161a', 8], [0.26, -0.24, '#f4efe6', 5]]) for (let i = 0; i < n; i++) mb.cyl(x, 0.756 + i * 0.012, z, 0.028, 0.766 + i * 0.012, 0.028, 12, C(c, -0.3), C(i === n - 1 ? '#f4efe6' : c, -0.3), i === n - 1 ? undefined : '');
  VK.sh(mb, 0, 0, 0.55, 0.55, 0.38);
}

/* ---- Boya atölyesi eşyaları ---- */
const HUES = ['#e63946', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#2a9d8f', '#277da1', '#4361ee', '#7209b7', '#b5179e', '#f72585'];
function v5ColorWheel(mb, r = 1.2) {
  const n = [0, 0, 1];
  for (let k = 0; k < 24; k++) { const a0 = (k / 24) * TAU, a1 = ((k + 1) / 24) * TAU; mb.triN([0, 0, 0.02], [Math.cos(a0) * r, Math.sin(a0) * r, 0.02], [Math.cos(a1) * r, Math.sin(a1) * r, 0.02], n, n, n, C('#2b2b2e', 0)); }
  for (let k = 0; k < 12; k++) { const a0 = (k / 12) * TAU + Math.PI / 2 + 0.02, a1 = ((k + 1) / 12) * TAU + Math.PI / 2 - 0.02, q = (rr, a) => [Math.cos(a) * rr, Math.sin(a) * rr];
    for (const [ra, rb, col, z] of [[0.62, 0.95, HUES[k], 0.03], [0.36, 0.6, vLight(HUES[k], 0.45), 0.034]]) { const A = q(r * ra, a0), B2 = q(r * rb, a0), Cc = q(r * rb, a1), D = q(r * ra, a1); mb.quadN([A[0], A[1], z], [B2[0], B2[1], z], [Cc[0], Cc[1], z], [D[0], D[1], z], n, n, n, n, C(col, 0)); } }
  for (let k = 0; k < 20; k++) { const a0 = (k / 20) * TAU, a1 = ((k + 1) / 20) * TAU; mb.triN([0, 0, 0.036], [Math.cos(a0) * r * 0.33, Math.sin(a0) * r * 0.33, 0.036], [Math.cos(a1) * r * 0.33, Math.sin(a1) * r * 0.33, 0.036], n, n, n, C('#f8f6f1', 0)); }
}
function v5Chips(mb, nc, nr, s) {
  mb.box(-(nc * s) / 2 - 0.08, -(nr * s) / 2 - 0.08, 0, (nc * s) / 2 + 0.08, (nr * s) / 2 + 0.08, 0.02, C('#ffffff', 0));
  for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) { const x = -(nc * s) / 2 + c * s, y = (nr * s) / 2 - (r + 1) * s, h = HUES[(c * 2) % 12], col = vMixHex(h, r < nr / 2 ? '#ffffff' : '#000000', Math.abs(r - (nr - 1) / 2) / nr * 0.9); mb.box(x + 0.02, y + 0.02, 0.02, x + s - 0.02, y + s - 0.02, 0.03, C(col, 0)); }
}
// duvar tepesinden akan boya damlaları
function v5Drips(k, H, seed = 1) {
  const mb = SEC(k); wAt(mb, k, 0, 0);
  let u = -RW, i = 0;
  while (u < RW - 0.05) { const w = Math.min(0.18 + hs(i, seed) * 0.45, RW - u), col = C(PAINT[Math.floor(hs(i, seed + 1) * PAINT.length)], 0); mb.box(u, H - 0.32, 0.018, u + w, H - 0.02, 0.03, col);
    const nd = 1 + Math.floor(hs(i, seed + 2) * 2); for (let d = 0; d < nd; d++) { const x = u + ((d + 0.5) * w) / nd, L = 0.2 + hs(i * 3 + d, seed + 3) * 1.2, dw = 0.035 + hs(i + d, seed + 4) * 0.05; mb.box(x - dw / 2, H - 0.32 - L, 0.018, x + dw / 2, H - 0.3, 0.03, col); mb.sphereS(x, H - 0.32 - L, 0.026, dw * 0.68, dw * 0.85, 0.012, col, 6, 3); }
    u += w; i++; }
  mb.pop();
}
function v5Can(mb, col, s = 1, open = false) {
  const M = C('#c9ced6', -0.85), P2 = C(col, 0);
  mb.cyl(0, 0, 0, 0.11 * s, 0.2 * s, 0.11 * s, 14, M, M); mb.cyl(0, 0.045 * s, 0, 0.113 * s, 0.15 * s, 0.113 * s, 14, P2, P2, '');
  if (open) mb.cyl(0, 0.2 * s, 0, 0.1 * s, 0.202 * s, 0.1 * s, 14, P2, P2); else mb.cyl(0, 0.2 * s, 0, 0.106 * s, 0.21 * s, 0.106 * s, 14, M, M);
  for (const a of [0.7, 2.3]) { const x = Math.cos(a) * 0.113 * s, z = Math.sin(a) * 0.113 * s; mb.box(x - 0.008 * s, 0.13 * s, z - 0.008 * s, x + 0.008 * s, 0.205 * s, z + 0.008 * s, P2); }
}
function v5Bucket(mb, col, tipped = false) {
  const Wt = C('#f2f2ee', -0.2), P2 = C(col, 0);
  if (tipped) { mb.push().T(0, 0.17, 0, 0, Math.PI / 2 - 0.12); mb.lathe(0, -0.2, 0, [[0.14, 0], [0.17, 0.4]], 16, Wt, 'b'); mb.cyl(0, 0.2, 0, 0.155, 0.201, 0.155, 16, P2, P2); mb.pop(); v4Blot(mb, 0, 0.008, 0.62, 0.42, col, 9, 6); VK.sh(mb, 0, 0.1, 0.25, 0.3, 0.3); return; }
  mb.lathe(0, 0, 0, [[0.14, 0], [0.17, 0.4]], 16, Wt, 'b'); mb.cyl(0, 0.36, 0, 0.158, 0.362, 0.158, 16, P2, P2);
  for (const a of [0.4, 1.7, 3.6]) { const x = Math.cos(a) * 0.168, z = Math.sin(a) * 0.168; mb.box(x - 0.012, 0.18 + hs(a, 2) * 0.1, z - 0.012, x + 0.012, 0.4, z + 0.012, P2); }
  limb(mb, [-0.16, 0.38, 0], [0, 0.52, 0], [0.006, 0.006], C('#3a3d44', -0.6), 3); limb(mb, [0, 0.52, 0], [0.16, 0.38, 0], [0.006, 0.006], C('#3a3d44', -0.6), 3);
  VK.sh(mb, 0, 0, 0.22, 0.22, 0.38);
}
function v5Easel(mb, art = 'abstract', seed = 1) {
  const Wd = C('#b08455', -0.15), Wk = C('#8a6238', -0.15);
  for (const s of [-1, 1]) limb(mb, [s * 0.36, 0, 0.24], [s * 0.07, 1.92, 0.0], [0.024, 0.02], Wd, 5);
  limb(mb, [0, 0, -0.56], [0, 1.74, -0.02], [0.022, 0.02], Wk, 5);
  mb.box(-0.42, 0.7, 0.08, 0.42, 0.74, 0.24, Wd);
  mb.push().T(0, 0.74, 0.14, 0, -0.1); mb.box(-0.44, 0, -0.03, 0.44, 1.04, 0.0, C('#e9e1d0', 0)); vArt(mb, -0.42, 0.02, 0.42, 1.02, 0.002, art, seed); mb.pop();
  mb.box(-0.1, 1.76, 0.02, 0.1, 1.84, 0.1, Wd);
  for (let i = 0; i < 4; i++) mb.sphereS(-0.3 + i * 0.18, 0.745, 0.17, 0.03, 0.012, 0.025, C(PAINT[(i + seed) % PAINT.length], 0), 6, 3);
  limb(mb, [-0.25, 0.75, 0.2], [0.15, 0.75, 0.22], [0.008, 0.006], C('#c8693a', 0), 3);
  VK.sh(mb, 0, 0, 0.46, 0.46, 0.36);
}
function v5StepLadder(mb) {
  const A = C('#c9ced6', -0.85), Ad = C('#9aa3ad', -0.85);
  for (const s of [-1, 1]) { limb(mb, [s * 0.27, 0, 0.34], [s * 0.2, 1.75, 0.0], [0.022, 0.02], A, 4); limb(mb, [s * 0.27, 0, -0.44], [s * 0.2, 1.7, -0.04], [0.02, 0.02], Ad, 4); limb(mb, [s * 0.24, 0.9, 0.17], [s * 0.24, 0.9, -0.22], [0.008, 0.008], Ad, 3); }
  for (let i = 0; i < 5; i++) { const t = (i + 1) / 6, y = t * 1.75, z = 0.34 * (1 - t); mb.box(-0.25 + t * 0.05, y - 0.02, z - 0.07, 0.25 - t * 0.05, y + 0.02, z + 0.07, Ad); mb.disc(-0.1 + hs(i, 3) * 0.2, y + 0.022, z, 0.035, 0.035, 7, C(PAINT[(i * 5) % PAINT.length], 0), C(PAINT[(i * 5) % PAINT.length], 0)); }
  mb.box(-0.25, 1.73, -0.13, 0.25, 1.78, 0.13, C('#f2c230', -0.2));
  mb.push().T(0.05, 1.78, 0); v5Can(mb, '#277da1', 0.8, true); mb.pop();
  VK.sh(mb, 0, -0.05, 0.4, 0.5, 0.35);
}
function v5Palette(mb, seed = 1) {
  mb.sphereS(0, 0.004, 0, 0.2, 0.006, 0.14, C('#c9a46a', -0.1), 14, 4);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 1.3 - 0.4; mb.sphereS(Math.cos(a) * 0.12, 0.011, Math.sin(a) * 0.08, 0.025, 0.008, 0.022, C(PAINT[(i + seed) % PAINT.length], 0), 6, 3); }
}
function v5WorkTable(mb, w = 4.0) {
  const Wd = C('#c9a46a', -0.15), M = C('#3a3d44', -0.7);
  mb.box(-w / 2, 0.86, -0.42, w / 2, 0.92, 0.42, Wd); for (const [x, z] of [[-w / 2 + 0.08, -0.36], [w / 2 - 0.08, -0.36], [-w / 2 + 0.08, 0.36], [w / 2 - 0.08, 0.36], [0, -0.36], [0, 0.36]]) mb.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.86, z + 0.03, M);
  mb.box(-w / 2 + 0.1, 0.18, -0.36, w / 2 - 0.1, 0.21, 0.36, M);
  for (let i = 0; i < 10; i++) v4Blot(mb, -w / 2 + 0.3 + hs(i, 7) * (w - 0.6), 0.922, -0.3 + hs(i, 8) * 0.6, 0.04 + hs(i, 9) * 0.06, PAINT[i % PAINT.length], i, 2);
  for (let j = 0; j < 4; j++) { const x = -w / 2 + 0.4 + j * 0.3; mb.cyl(x, 0.92, -0.2, 0.06, 1.08, 0.06, 12, C('#d6ecf4', -0.9), C('#d6ecf4', -0.9), 'b'); for (let b = 0; b < 4; b++) { const a = (b / 4) * TAU + j; limb(mb, [x + Math.cos(a) * 0.02, 0.95, -0.2 + Math.sin(a) * 0.02], [x + Math.cos(a) * 0.06, 1.3, -0.2 + Math.sin(a) * 0.06], [0.007, 0.005], C('#c8693a', 0), 3); mb.sphereS(x + Math.cos(a) * 0.062, 1.32, -0.2 + Math.sin(a) * 0.062, 0.012, 0.03, 0.012, C(PAINT[(b + j * 3) % PAINT.length], 0), 6, 4); } }
  for (let i = 0; i < 9; i++) { mb.push().T(0.2 + i * 0.12, 0.935, 0.12 + (i % 2) * 0.08, 0.3 * (i % 3), 0, Math.PI / 2); mb.cyl(0, -0.06, 0, 0.016, 0.05, 0.016, 8, C(PAINT[(i * 4) % PAINT.length], 0), C('#e9e9e9', -0.6)); mb.pop(); }
  for (const x of [w / 2 - 0.6, w / 2 - 1.1]) { mb.push().T(x, 0.92, 0.0, x); v5Palette(mb, Math.round(x * 3)); mb.pop(); }
  mb.box(-0.4, 0.92, 0.05, 0.1, 0.95, 0.38, C('#f8f6f1', 0)); mb.box(-0.38, 0.95, 0.07, 0.08, 0.97, 0.36, C('#ece6da', 0));
  for (const [x, c] of [[-w / 2 + 0.5, '#e63946'], [w / 2 - 0.7, '#277da1']]) { mb.push().T(x, 0.21, 0); v5Bucket(mb, c); mb.pop(); }
  VK.sh(mb, 0, 0, w * 0.55, 0.5, 0.36);
}

/* ---- Atari salonu eşyaları ---- */
function v5Arcade(mb, col = '#ff4fd8', seed = 1) {
  const Bk = C('#121018', -0.5), Sd = C(col, 0.55), Bd = C('#1d1a26', -0.4);
  for (const s of [-1, 1]) { const x = s * 0.33; mb.box(x - 0.025, 0, -0.36, x + 0.025, 0.95, 0.3, Bd); mb.box(x - 0.025, 0.95, -0.36, x + 0.025, 1.62, 0.08, Bd); mb.box(x - 0.025, 1.62, -0.36, x + 0.025, 1.9, 0.15, Bd); mb.box(x + s * 0.028 - 0.004, 0.18, -0.3, x + s * 0.028 + 0.004, 1.72, -0.2, Sd); mb.box(x + s * 0.028 - 0.004, 0.18, -0.12, x + s * 0.028 + 0.004, 0.9, -0.06, Sd); }
  mb.box(-0.31, 0, -0.34, 0.31, 0.92, 0.27, Bk);
  mb.push().T(0, 0.95, 0.18, 0, 0.35); mb.box(-0.31, -0.05, -0.16, 0.31, 0.02, 0.16, C('#24202f', -0.4));
  mb.cyl(-0.12, 0.02, 0, 0.012, 0.11, 0.012, 6, C('#c9ced6', -0.8), C('#c9ced6', -0.8)); mb.sphereS(-0.12, 0.12, 0, 0.03, 0.03, 0.03, C('#e63946', -0.3), 8, 5);
  for (let i = 0; i < 3; i++) { const bc = C(['#ffe14f', '#4cc9f0', '#5bff9a'][i], 0.7); mb.cyl(0.04 + i * 0.075, 0.02, 0.02 - (i % 2) * 0.04, 0.022, 0.036, 0.022, 10, bc, bc); }
  mb.pop();
  mb.push().T(0, 1.32, -0.05, 0, -0.22); mb.box(-0.29, -0.27, -0.04, 0.29, 0.27, 0.0, Bk); mb.box(-0.25, -0.23, 0.0, 0.25, 0.23, 0.004, C('#0d1430', 1));
  const PX = 0.042, PC = [col, '#ffffff', '#ffe14f', '#5bff9a'][seed % 4];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { if (hs(r * 4 + c, seed) < 0.42) continue; for (const sx of [-1, 1]) { const x = sx * (c + 0.5) * PX, y = 0.1 - r * PX; mb.box(x - PX / 2 + 0.005, y - PX / 2 + 0.005, 0.004, x + PX / 2 - 0.005, y + PX / 2 - 0.005, 0.008, C(r < 2 ? PC : col, 1)); } }
  for (let i = 0; i < 6; i++) mb.box(-0.2 + i * 0.03, 0.19, 0.004, -0.185 + i * 0.03, 0.21, 0.008, C('#ffffff', 1));
  mb.box(-0.22, -0.2, 0.004, 0.22, -0.185, 0.008, C('#5bff9a', 1));
  mb.pop();
  mb.box(-0.31, 1.62, 0.1, 0.31, 1.86, 0.15, C(col, 1)); mb.box(-0.24, 1.7, 0.151, 0.24, 1.78, 0.155, C('#ffffff', 1));
  mb.box(-0.34, 1.88, -0.37, 0.34, 1.92, 0.16, Bd);
  mb.box(-0.12, 0.35, 0.27, 0.12, 0.6, 0.29, C('#2b2833', -0.6)); for (const x of [-0.05, 0.05]) mb.box(x - 0.015, 0.47, 0.29, x + 0.015, 0.54, 0.295, C('#ff3b30', 1));
  VK.halo(mb.p(0, 1.32, 0.3), 0.55, col, 0.28); VK.pool(mb.p(0, 0, 0.95), 0.9, col, 0.1);
  VK.sh(mb, 0, 0, 0.42, 0.45, 0.4);
}
// pelüş ayıcık; q: ayrıntı (0 düşük, 1 orta, 2 yüksek)
function v5Plush(mb, col, s = 1, q = 1) {
  const B = C(col, -0.05), Bl = C(vLight(col, 0.4), -0.05), K = C('#16161a', -0.5), A = [[7, 4], [10, 6], [12, 8]][q], D = [[5, 3], [6, 4], [8, 5]][q], E = [[4, 2], [5, 3], [6, 4]][q];
  mb.sphereS(0, 0.16 * s, 0, 0.15 * s, 0.16 * s, 0.13 * s, B, A[0], A[1]); mb.sphereS(0, 0.38 * s, 0.01 * s, 0.12 * s, 0.11 * s, 0.11 * s, B, A[0], A[1]);
  for (const sx of [-1, 1]) { mb.sphereS(sx * 0.09 * s, 0.47 * s, 0, 0.045 * s, 0.045 * s, 0.03 * s, B, D[0], D[1]); mb.sphereS(sx * 0.038 * s, 0.405 * s, 0.1 * s, 0.015 * s, 0.015 * s, 0.01 * s, K, E[0], E[1]); mb.sphereS(sx * 0.13 * s, 0.2 * s, 0.05 * s, 0.05 * s, 0.075 * s, 0.05 * s, B, D[0], D[1]); if (q) mb.sphereS(sx * 0.07 * s, 0.04 * s, 0.08 * s, 0.05 * s, 0.04 * s, 0.06 * s, B, D[0], D[1]); }
  mb.sphereS(0, 0.36 * s, 0.1 * s, 0.045 * s, 0.035 * s, 0.03 * s, Bl, D[0], D[1]); mb.sphereS(0, 0.372 * s, 0.13 * s, 0.015 * s, 0.011 * s, 0.01 * s, K, E[0], E[1]); if (q) mb.sphereS(0, 0.15 * s, 0.1 * s, 0.08 * s, 0.09 * s, 0.03 * s, Bl, D[0], D[1]);
}
const PLC = ['#ff8fc7', '#8ecae6', '#ffd166', '#b5e48c', '#c77dff', '#f4a261', '#ffffff'];
function v5Claw(mb, col = '#4cc9f0', seed = 1) {
  const B = C(col, -0.3), M = C('#c9ced6', -0.9), Bk = C('#121018', -0.5);
  mb.rbox(-0.42, 0, -0.42, 0.42, 0.85, 0.42, 0.03, B, 2); mb.box(-0.3, 0.28, 0.42, -0.05, 0.52, 0.44, Bk);
  mb.box(0.02, 0.85, 0.42, 0.4, 0.95, 0.56, C('#24202f', -0.4)); mb.cyl(0.12, 0.95, 0.49, 0.012, 1.05, 0.012, 6, M, M); mb.sphereS(0.12, 1.06, 0.49, 0.028, 0.028, 0.028, C('#e63946', -0.3), 8, 5); mb.cyl(0.28, 0.95, 0.49, 0.03, 0.97, 0.03, 10, C('#ffe14f', 0.8), C('#ffe14f', 0.8));
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) mb.box(x - 0.02, 0.85, z - 0.02, x + 0.02, 1.76, z + 0.02, M);
  mb.box(-0.4, 0.85, -0.4, 0.4, 0.86, 0.4, C('#2b1d3a', 0)); for (const z of [-0.4, 0.4]) mb.box(-0.4, 1.3, z - 0.005, 0.4, 1.31, z + 0.005, M);
  for (let i = 0; i < 9; i++) { const x = -0.26 + (i % 3) * 0.26 + (hs(i, seed) - 0.5) * 0.06, z = -0.26 + Math.floor(i / 3) * 0.26, y = 0.86 + (i % 2) * 0.04; mb.push().T(x, y, z, hs(i, seed + 2) * 6); v5Plush(mb, PLC[(i + seed) % PLC.length], 0.4, 0); mb.pop(); }
  mb.box(-0.42, 1.76, -0.42, 0.42, 1.98, 0.42, B); mb.box(-0.36, 1.81, 0.421, 0.36, 1.93, 0.43, C('#ffffff', 1));
  limb(mb, [0.08, 1.76, 0.05], [0.08, 1.42, 0.05], [0.008, 0.008], M, 3); mb.cyl(0.08, 1.38, 0.05, 0.04, 1.44, 0.04, 10, M, M); for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [0.08 + Math.cos(a) * 0.03, 1.38, 0.05 + Math.sin(a) * 0.03], [0.08 + Math.cos(a) * 0.08, 1.27, 0.05 + Math.sin(a) * 0.08], [0.008, 0.006], M, 3); }
  VK.halo(mb.p(0, 1.35, 0.1), 0.6, col, 0.22); VK.sh(mb, 0, 0, 0.52, 0.52, 0.4);
}
function v5Pinball(mb) {
  const W = C('#8a5cf6', -0.3), Bk = C('#121018', -0.5);
  for (const [x, z] of [[-0.3, -0.55], [0.3, -0.55], [-0.3, 0.55], [0.3, 0.55]]) mb.box(x - 0.025, 0, z - 0.025, x + 0.025, 0.8, z + 0.025, C('#c9ced6', -0.88));
  mb.push().T(0, 0.82, 0, 0, -0.1); mb.box(-0.34, -0.06, -0.64, 0.34, 0.1, 0.64, W); mb.box(-0.3, 0.1, -0.6, 0.3, 0.104, 0.6, C('#1b1440', 0.55));
  for (const [x, z, c] of [[-0.12, -0.25, '#ff4fd8'], [0.12, -0.3, '#4cc9f0'], [0, -0.05, '#ffe14f']]) { mb.cyl(x, 0.104, z, 0.06, 0.15, 0.06, 14, C(c, 1), C(c, 1)); mb.cyl(x, 0.15, z, 0.045, 0.16, 0.045, 14, C('#ffffff', 1), C('#ffffff', 1)); }
  for (const s of [-1, 1]) { mb.push().T(s * 0.09, 0.11, 0.42, s * 0.45); mb.box(-0.07, 0, -0.012, 0.07, 0.025, 0.012, C('#ffffff', 0.4)); mb.pop(); v4Seg(mb, s * 0.27, 0.0, s * 0.18, 0.36, 0.008, C('#5bff9a', 1), 0.106); }
  mb.sphereS(0.05, 0.125, 0.15, 0.02, 0.02, 0.02, C('#c9ced6', -0.92), 8, 5);
  mb.pop();
  mb.box(-0.34, 0.86, -0.72, 0.34, 1.55, -0.56, W); mb.box(-0.3, 0.92, -0.56, 0.3, 1.5, -0.555, C('#2b1450', 0.9)); mb.sphereS(0, 1.21, -0.553, 0.16, 0.16, 0.004, C('#ffe14f', 1), 14, 5); for (let i = 0; i < 5; i++) mb.box(-0.25 + i * 0.1, 1.42, -0.553, -0.2 + i * 0.1, 1.46, -0.55, C('#ff4fd8', 1));
  VK.halo(mb.p(0, 1.25, -0.4), 0.5, '#c77dff', 0.3); VK.sh(mb, 0, 0, 0.45, 0.75, 0.38);
}
function v5AirHockey(mb) {
  const F = C('#2a6fdb', -0.45), Wt = C('#eef6ff', 0.3), Cy = C('#4cc9f0', 1);
  for (const [x, z] of [[-0.5, -0.9], [0.5, -0.9], [-0.5, 0.9], [0.5, 0.9]]) mb.box(x - 0.05, 0, z - 0.05, x + 0.05, 0.72, z + 0.05, C('#1b1d2a', -0.5));
  mb.box(-0.62, 0.72, -1.06, 0.62, 0.82, 1.06, F); mb.box(-0.55, 0.82, -0.99, 0.55, 0.826, 0.99, Wt);
  for (const s of [-1, 1]) { mb.box(s * 0.62 - 0.04, 0.82, -1.06, s * 0.62 + 0.0 * s, 0.87, 1.06, Cy); mb.box(-0.62, 0.82, s * 1.06 - 0.04, 0.62, 0.87, s * 1.06, Cy); mb.box(-0.18, 0.826, s * 0.99 - 0.02, 0.18, 0.83, s * 0.99, C('#16161a', 0)); }
  mb.box(-0.55, 0.827, -0.012, 0.55, 0.829, 0.012, C('#ff3b30', 0.6)); mb.lathe(0, 0.828, 0, [[0.22, 0], [0.2, 0]], 28, C('#ff3b30', 0.6));
  for (const [z, c] of [[0.62, '#ff3b30'], [-0.6, '#2a9d8f']]) { mb.cyl(0.05, 0.826, z, 0.07, 0.86, 0.07, 16, C(c, -0.3), C(c, -0.3)); mb.cyl(0.05, 0.86, z, 0.03, 0.92, 0.03, 10, C(c, -0.3), C(c, -0.3)); }
  mb.cyl(-0.15, 0.826, 0.2, 0.045, 0.836, 0.045, 14, C('#16161a', -0.5), C('#16161a', -0.5));
  VK.halo(mb.p(0, 0.95, 0), 0.9, '#4cc9f0', 0.16); VK.pool(mb.p(0, 0, 0), 1.4, '#4cc9f0', 0.1, 1.8); VK.sh(mb, 0, 0, 0.75, 1.2, 0.4);
}
function v5PrizeCounter(mb, w = 3.2) {
  const B = C('#8a5cf6', -0.3), M = C('#c9ced6', -0.9);
  mb.box(-w / 2, 0, -0.3, w / 2, 0.14, 0.3, C('#121018', -0.4)); mb.box(-w / 2, 0.14, -0.3, w / 2, 0.42, 0.3, B); mb.box(-w / 2, 0.11, 0.3, w / 2, 0.14, 0.31, C('#4cc9f0', 1));
  mb.box(-w / 2 + 0.04, 0.42, -0.26, w / 2 - 0.04, 0.44, 0.26, C('#2b1d4a', 0.3));
  for (let x = -w / 2; x <= w / 2 + 1e-6; x += w / 4) for (const z of [-0.29, 0.29]) mb.box(x - 0.015, 0.42, z - 0.015, x + 0.015, 1.0, z + 0.015, M);
  mb.box(-w / 2, 1.0, -0.3, w / 2, 1.03, 0.3, C('#e6f6ff', -0.92));
  for (let i = 0; i < 9; i++) { const x = -w / 2 + 0.25 + i * ((w - 0.5) / 8); mb.push().T(x, 0.44, (i % 2) * 0.08 - 0.04, (hs(i, 4) - 0.5) * 0.8); v5Plush(mb, PLC[i % PLC.length], 0.5, 0); mb.pop(); }
  VK.halo(mb.p(0, 0.75, 0.3), 0.9, '#ff8fd8', 0.18); VK.sh(mb, 0, 0, w * 0.55, 0.4, 0.38);
}
function v5DanceMachine(mb) {
  const Bk = C('#121018', -0.5), M = C('#c9ced6', -0.9);
  mb.box(-0.72, 0, -0.55, 0.72, 0.12, 0.9, C('#2b2833', -0.5));
  const AC = { u: '#ff4fd8', d: '#4cc9f0', l: '#5bff9a', r: '#ffe14f' };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = -0.38 + i * 0.38, z = -0.18 + j * 0.38, key = i === 1 && j === 0 ? 'u' : i === 1 && j === 2 ? 'd' : i === 0 && j === 1 ? 'l' : i === 2 && j === 1 ? 'r' : null; mb.box(x - 0.17, 0.12, z - 0.17, x + 0.17, 0.135, z + 0.17, key ? C(AC[key], 0.85) : C('#3a3646', -0.4)); if (key) { const dir = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[key], A = [x + dir[0] * 0.1, z + dir[1] * 0.1], Bq = [x - dir[1] * 0.08 - dir[0] * 0.05, z + dir[0] * 0.08 - dir[1] * 0.05], Cq = [x + dir[1] * 0.08 - dir[0] * 0.05, z - dir[0] * 0.08 - dir[1] * 0.05]; mb.triN([A[0], 0.137, A[1]], [Bq[0], 0.137, Bq[1]], [Cq[0], 0.137, Cq[1]], UPV, UPV, UPV, C('#ffffff', 1)); } }
  limb(mb, [-0.62, 0.12, -0.45], [-0.62, 1.0, -0.45], [0.02, 0.02], M, 4); limb(mb, [0.62, 0.12, -0.45], [0.62, 1.0, -0.45], [0.02, 0.02], M, 4); limb(mb, [-0.62, 1.0, -0.45], [0.62, 1.0, -0.45], [0.02, 0.02], M, 4);
  mb.box(-0.62, 0, -1.02, 0.62, 2.1, -0.58, Bk); mb.box(-0.48, 1.1, -0.58, 0.48, 1.68, -0.575, C('#0d1430', 1));
  for (let i = 0; i < 4; i++) mb.box(-0.38 + i * 0.22, 1.2 + (i % 2) * 0.2, -0.574, -0.24 + i * 0.22, 1.34 + (i % 2) * 0.2, -0.57, C(Object.values(AC)[i], 1));
  for (const s of [-1, 1]) { mb.push().T(s * 0.42, 0.65, -0.58, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.14, 0.02, 0.14, 16, C('#2b2833', -0.6), C('#2b2833', -0.6)); mb.cyl(0, 0.02, 0, 0.06, 0.03, 0.06, 12, C('#4cc9f0', 0.8), C('#4cc9f0', 0.8)); mb.pop(); }
  mb.box(-0.62, 1.84, -0.58, 0.62, 2.06, -0.55, C('#ff4fd8', 1));
  VK.halo(mb.p(0, 1.4, -0.4), 0.7, '#ff4fd8', 0.24); VK.pool(mb.p(0, 0, 0.2), 1.1, '#4cc9f0', 0.12); VK.sh(mb, 0, -0.1, 0.8, 0.95, 0.38);
}
function v5PhotoBooth(mb) {
  const B = C('#ff4fd8', -0.3), Bk = C('#121018', -0.5);
  mb.box(-0.55, 0, -0.5, 0.55, 2.15, 0.5, B); mb.box(-0.56, 2.15, -0.51, 0.56, 2.25, 0.51, Bk);
  for (let f = 0; f < 6; f++) { const a = 0.0 + f * 0.09; mb.box(a, 0.15, 0.5, a + 0.1, 1.95, 0.52 + (f % 2) * 0.03, C(f % 2 ? '#5a1f6a' : '#4a1858', 0)); }
  mb.box(-0.45, 1.2, 0.5, -0.1, 1.55, 0.515, C('#0d1430', 1)); mb.box(-0.4, 0.5, 0.5, -0.15, 0.58, 0.52, C('#16161a', 0));
  mb.box(-0.4, 1.92, 0.51, 0.4, 2.1, 0.52, C('#ffffff', 1)); mb.box(-0.1, 1.95, 0.52, 0.1, 2.07, 0.53, C('#121018', 0)); mb.cyl(0, 2.01, 0.53, 0.04, 2.01, 0.04, 10, C('#4cc9f0', 1), C('#4cc9f0', 1));
  VK.halo(mb.p(0, 1.7, 0.6), 0.6, '#ff8fd8', 0.25); VK.sh(mb, 0, 0, 0.62, 0.58, 0.4);
}
function v5TokenMachine(mb) {
  const B = C('#2a6fdb', -0.35), Bk = C('#121018', -0.5);
  mb.rbox(-0.32, 0, -0.24, 0.32, 1.65, 0.24, 0.04, B, 2); mb.box(-0.26, 1.2, 0.24, 0.26, 1.55, 0.25, C('#0d1430', 1));
  mb.push().T(0, 1.37, 0.252, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.13, 0.008, 0.13, 20, C('#ffd23f', 1), C('#ffd23f', 1)); mb.cyl(0, 0.008, 0, 0.09, 0.012, 0.09, 20, C('#f2a20c', 1), C('#f2a20c', 1)); mb.pop();
  mb.box(-0.2, 0.95, 0.24, 0.0, 1.05, 0.26, Bk); mb.box(0.06, 0.97, 0.24, 0.2, 1.03, 0.262, C('#5bff9a', 1)); mb.box(-0.16, 0.28, 0.24, 0.16, 0.45, 0.3, Bk);
  VK.halo(mb.p(0, 1.35, 0.4), 0.45, '#ffd23f', 0.25); VK.sh(mb, 0, 0, 0.4, 0.32, 0.4);
}
function v5BarTable(mb) {
  const M = C('#c9ced6', -0.88);
  mb.cyl(0, 0, 0, 0.26, 0.03, 0.24, 18, M, M); mb.cyl(0, 0.03, 0, 0.035, 1.0, 0.035, 10, M, M); mb.cyl(0, 1.0, 0, 0.36, 1.04, 0.36, 24, C('#1b1d2a', -0.6), C('#1b1d2a', -0.6)); mb.torusN(0, 1.02, 0, 0.36, 0.015, 0.02, 28, 3, C('#ff4fd8', 1));
  for (const [x, z, c] of [[-0.1, 0.05, '#ff8fc7'], [0.12, -0.08, '#8ecae6']]) { mb.lathe(x, 1.04, z, [[0.035, 0], [0.05, 0.16], [0.052, 0.17]], 12, C(c, 0)); mb.sphereS(x, 1.22, z, 0.05, 0.035, 0.05, C('#fff8ec', 0), 10, 5); mb.sphereS(x, 1.26, z, 0.018, 0.018, 0.018, C('#e63946', -0.4), 6, 4); limb(mb, [x + 0.01, 1.2, z], [x + 0.03, 1.36, z - 0.02], [0.006, 0.006], C('#ffffff', 0), 3); }
  VK.sh(mb, 0, 0, 0.32, 0.32, 0.38);
}
function v5Checker(k, y0, y1, s = 0.25) {
  const mb = SEC(k), n = [0, 0, 1]; wAt(mb, k, 0, 0);
  let j = 0; for (let y = y0; y < y1 - 1e-6; y += s, j++) { let i = 0; for (let u = -RW; u < RW - 1e-6; u += s, i++) { const b = Math.min(RW, u + s); mb.quadN([u, y, 0.006], [b, y, 0.006], [b, Math.min(y1, y + s), 0.006], [u, Math.min(y1, y + s), 0.006], n, n, n, n, C((i + j) % 2 ? '#e9e9f2' : '#0c0a14', (i + j) % 2 ? 0.3 : 0)); } }
  mb.pop();
}
function v5Neon(k, y, hex) {
  const mb = SEC(k); wAt(mb, k, 0, 0); mb.box(-RW, y - 0.025, 0.02, RW, y + 0.025, 0.06, C(hex, 1)); mb.pop();
  for (const u of [-5.85, -1.95, 1.95, 5.85]) VK.wglow(k, u, 0.08, y, 2.3, hex, 0.12, 0.55);
}

/* ====================== mekânlar ====================== */
Object.assign(VENUES, {
  /* ---- İki Doğru Bir Yalan: kulüp salonu (şömine, kütüphane, deri koltuklar) ---- */
  idy: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'felt', tableO: { felt: '#1f5a3e', wood: '#3a1e10' }, chair: 'gothic',
    rug: 'persian', rugO: { a: '#6e1a22', b: '#d9c08a', n: '#1f3a4a', y: 0.03 },
    L: VL2.lounge, sky: ['#0d0907', '#241a12', '#120c08'], sun: [0.3, 0.9, 0.3], shR: 8.6, parts: 'dust',
    post: { bloom: 0.5, th: 0.8, sat: 1.05, con: 0.12, vig: 0.44, tint: [1.03, 1.0, 0.95] },
    det: 0.12, detS: 0.45,
    logos: [[2, 4.4, 2.6, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#4e301c', { lip: '#7a5030', fade: '#0b0704', band: '#c9a34a', bandE: -0.8 });
      vFloorBasket(mb, ['#5a3820', '#63402a', '#4e301c', '#6a4630', '#55361f'], '#24150c', { border: '#3e2614', bw: 0.45 });
      const WALL = { wall: '#1f3a2c', H: 6.0, dado: '#3a1e10', dadoH: 1.15, panel: '#4a2614', rail: '#c9a34a', base: '#1b0e08', crown: '#4a2614', pat: 'dots', pc: '#2c4c3a', ps: 0.42 };
      const G = C('#c9a34a', -0.88);
      // 0: kütüphane duvarı, yaldızlı tabela, sürgülü merdiven; önünde chesterfield kanepe
      vWall(0, WALL, []);
      vSign('frame', '#c9a34a', '#fff8ec', { lampC: '#c9a34a' });
      VK.inSec(0, (s) => {
        for (const [u, sd] of [[-5.6, 3], [-3.35, 5], [3.35, 7], [5.6, 9]]) { wAt(s, 0, u, 0.24); P.bookcase(s, 2.1, 3.2, '#3a1e10', sd, { deco: '#c9a34a', d: 0.42, rows: 5 }); s.pop(); }
        s.push().T(0, 3.32, -7.5, 0, 0, Math.PI / 2); s.cyl(0, -6.7, 0, 0.018, 6.7, 0.018, 8, G, G); s.pop();
        wAt(s, 0, -4.5, 0.25); for (const x of [-0.26, 0.26]) limb(s, [x, 0, 0.62], [x, 3.3, 0.04], [0.02, 0.02], C('#5a3018', -0.3), 4); for (let i = 1; i < 10; i++) { const t = i / 10; s.box(-0.26, t * 3.3 - 0.015, 0.62 * (1 - t) + 0.02, 0.26, t * 3.3 + 0.015, 0.62 * (1 - t) + 0.07, C('#5a3018', -0.3)); } s.pop();
      });
      mb.push().T(0, 0, -5.45); P.sofa(mb, 2.5, '#5a2416', { leg: '#2a140a', d: 0.95 }); for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) mb.sphereS(-1.0 + c * 0.33, 0.62 + r * 0.17, -0.25, 0.016, 0.016, 0.01, C('#2e1208', -0.2), 6, 3); mb.pop();
      for (const x of [-1.75, 1.75]) { mb.push().T(x, 0, -5.4); P.sideTable(mb, 0.28, 0.62, '#4a2614', '#2e1608'); mb.push().T(0, 0.62, 0, x > 0 ? 0.4 : -0.4); v5BankerLamp(mb); mb.pop(); mb.pop(); }
      // 1: sağ — perdeli iki pencere, ayaklı saat, dünya küresi bar, gramofon
      const HW1 = [{ u0: -4.7, u1: -2.7, y0: 0.95, y1: 3.75 }, { u0: 2.7, u1: 4.7, y0: 0.95, y1: 3.75 }];
      vWall(1, WALL, HW1);
      for (const h of HW1) vWindow(1, h, { frame: '#2a140a', view: 'night', curtain: '#6e1a22', rod: '#c9a34a', sun: false, sunHex: '#9fb8ff', sunA: 0.05 });
      VK.inSec(1, (s) => { wAt(s, 1, 0, 0.24); v5GrandClock(s); s.pop(); wAt(s, 1, -1.45, 0.75); v5GlobeBar(s); s.pop(); wAt(s, 1, 1.5, 0.55); v5Gramophone(s); s.pop(); });
      for (const u of [-6.3, 6.3]) P.sconce(SEC(1), 1, u, 2.7, '#f3e3c3', '#c9a34a');
      // 2: ön — çift kanatlı kapı, tablolar (biri logo), konsol ve sürahi, portmanto
      vWall(2, WALL, [{ u0: -1.05, u1: 1.05, y0: 0, y1: 2.7 }]);
      for (const u of [-0.52, 0.52]) vDoor(2, u, { w: 1.02, h: 2.7, frame: '#3a1e10', door: '#4a2614', knob: '#c9a34a' });
      VK.inSec(2, (s) => {
        wAt(s, 2, 4.4, 0, 2.6); s.box(-0.62, -0.62, 0, 0.62, 0.62, 0.05, G); s.box(-0.54, -0.54, 0.05, 0.54, 0.54, 0.055, C('#2a1810', 0)); s.pop();
        wAt(s, 2, -4.4, 0, 2.7); P.frame(s, 1.2, 1.5, 'portrait', '#c9a34a', 5, { fe: -0.88, mat: 0 }); s.pop();
        for (const u of [4.4, -4.4]) { wAt(s, 2, u, 0, 3.55); s.box(-0.3, -0.03, 0, 0.3, 0.03, 0.14, G); s.pop(); VK.wglow(2, u, 0.06, 2.9, 1.0, '#ffe2b0', 0.16, 1.1); }
        wAt(s, 2, -4.4, 0.28); s.box(-0.75, 0.82, -0.22, 0.75, 0.88, 0.22, C('#4a2614', -0.4)); for (const x of [-0.65, 0.65]) s.lathe(x, 0, 0, [[0.04, 0], [0.025, 0.4], [0.04, 0.82]], 10, C('#3a1e10', -0.4)); s.push().T(0, 0.88, 0); v5Decanter(s); s.pop(); s.pop();
        wAt(s, 2, 2.2, 0.45); s.cyl(0, 0, 0, 0.22, 0.04, 0.2, 14, C('#3a1e10', -0.4), C('#3a1e10', -0.4)); s.cyl(0, 0.04, 0, 0.025, 1.8, 0.025, 8, C('#3a1e10', -0.4), C('#3a1e10', -0.4)); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; limb(s, [0, 1.68, 0], [Math.cos(a) * 0.2, 1.8, Math.sin(a) * 0.2], [0.012, 0.012], G, 4); } s.push().T(0.12, 1.2, 0.05); s.rbox(-0.16, 0, -0.08, 0.16, 0.62, 0.08, 0.06, C('#2f3a4a', 0), 2); s.pop(); s.sphereS(-0.12, 1.66, 0.06, 0.13, 0.06, 0.13, C('#16161a', -0.3), 12, 5); s.cyl(-0.12, 1.66, 0.06, 0.08, 1.76, 0.08, 12, C('#16161a', -0.3), C('#16161a', -0.3)); s.pop();
      });
      VK.wglow(2, 0, 0.08, 1.6, 1.4, '#ffd9a0', 0.08, 1.4);
      // 3: sol — şömine, üstünde yağlı boya tablo, aplikler; önünde iki berjer ve küçük halı
      vWall(3, WALL, []);
      VK.inSec(3, (s) => { wAt(s, 3, 0, 0); v5Fireplace(s); s.pop(); wAt(s, 3, 0, 0, 3.05); P.frame(s, 1.9, 1.25, 'land', '#c9a34a', 2, { fe: -0.88, mat: 0 }); s.pop(); wAt(s, 3, 0, 0, 3.8); s.box(-0.4, -0.03, 0, 0.4, 0.03, 0.15, G); s.pop(); });
      VK.wglow(3, 0, 0.06, 3.0, 1.4, '#ffe2b0', 0.14, 1.0);
      for (const u of [-2.6, 2.6, -6.2, 6.2]) P.sconce(SEC(3), 3, u, 2.7, '#f3e3c3', '#c9a34a');
      mb.push().T(-6.0, 0, 0, Math.PI / 2); RUG2.persian(mb, 1.25, 0.8, { a: '#1f3a4a', b: '#d9c08a', n: '#6e1a22', y: 0.012 }); mb.pop();
      for (const [x, z] of [[-5.0, -1.9], [-5.0, 1.9]]) { mb.push().T(x, 0, z, Math.atan2(-7.2 - x, -z)); v5Wingback(mb, '#2f4a3a'); mb.pop(); }
      mb.push().T(-5.4, 0, 0); P.sideTable(mb, 0.26, 0.55, '#4a2614', '#2e1608'); mb.push().T(0, 0.55, 0); P.candle(mb, 0.14, '#f4efe6', { r: 0.4, a: 0.22 }); mb.pop(); mb.pop();
      // salon: satranç masası, kart masası, ayaklı lambalar, köşelerde palmiyeler
      mb.push().T(4.6, 0, 4.5, 0.3); v5ChessTable(mb); for (const s of [-1, 1]) { mb.push().T(s * 0.75, 0, 0, s * -Math.PI / 2); CHAIRS.gothic.base(mb, {}); CHAIRS.gothic.pad(mb, {}); mb.pop(); } mb.pop();
      mb.push().T(-4.4, 0, 4.9, -0.4); v5CardTable(mb); mb.push().T(0, 0, 0.75, Math.PI); CHAIRS.gothic.base(mb, {}); CHAIRS.gothic.pad(mb, {}); mb.pop(); mb.pop();
      mb.push().T(5.2, 0, -3.2, -0.9); v5Wingback(mb, '#5a2416'); mb.pop();
      mb.push().T(5.9, 0, -2.1); P.sideTable(mb, 0.26, 0.6, '#4a2614', '#2e1608'); mb.push().T(0, 0.6, 0); v5Decanter(mb); mb.pop(); mb.pop();
      for (const [x, z] of [[6.0, -5.4], [-5.9, -5.3], [5.9, 1.6]]) VK.tall(x, z, (m) => P.floorLamp(m, '#e9d6b0', '#c9a34a'));
      for (const [x, z, k] of [[-6.95, -6.95, 0], [6.95, -6.95, 1], [6.95, 6.95, 0], [-6.95, 6.95, 1]]) VK.tall(x, z, (m) => (k ? P.fern(m, 1.15, '#c9a34a') : P.ficus(m, 1.05, '#3a1e10')));
    },
  },
  /* ---- Renk Şaşırtmaca: boya atölyesi ---- */
  rnk: {
    room: 1, raw: 1, wallH: 5.6,
    table: 'wood', tableO: { wood: '#d9b98a' }, chair: 'stool', chairO: { leg: '#2b2b2b' },
    rug: 'splat', rugO: {},
    L: VL2.atelier, sky: ['#9cc9ea', '#eef6fb', '#dbe7ef'], sun: [0.55, 0.78, 0.3], shR: 8.6, parts: 'confetti',
    post: { bloom: 0.26, th: 0.9, sat: 1.12, con: 0.15, vig: 0.3, tint: [1.02, 1.0, 0.98] },
    det: 0.14, detS: 0.5,
    logos: [[3, 4.6, 3.2, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#7a6650', { lip: '#a88a68', fade: '#4a4038', glow: '#6e6052' });
      vFloorWood(mb, ['#b08a62', '#a78158', '#ba946a', '#9e7a52', '#ad8860'], { w: 0.24, e: -0.25, gap: '#6a5038' });
      for (let i = 0; i < 64; i++) { const x = (hs(i, 51) - 0.5) * 14.6, z = (hs(i, 52) - 0.5) * 14.6; if (Math.hypot(x, z) < 3.8) continue; v4Blot(mb, x, 0.006 + (i % 4) * 0.0015, z, 0.06 + hs(i, 53) * 0.2, PAINT[i % PAINT.length], i + 1, 3 + (i % 4)); }
      for (const [x, z, ry, w, d] of [[-5.1, -4.3, 0.4, 0.95, 0.8], [5.5, -0.5, -0.2, 0.8, 1.3], [-5.5, 2.6, 0.9, 0.9, 0.75]]) { mb.push().T(x, 0, z, ry); VK.quad(mb, -w, -d, w, d, C('#e9dfc9', 0), 0.012); for (const s2 of [-1, 1]) VK.quad(mb, -w, s2 * d - 0.03, w, s2 * d + 0.03, C('#d6cab0', 0), 0.0125); for (let i = 0; i < 6; i++) v4Blot(mb, (hs(i, x) - 0.5) * w * 1.6, 0.014, (hs(i, z) - 0.5) * d * 1.6, 0.05 + hs(i, 3) * 0.1, PAINT[(i + Math.round(x)) & 7], i, 3); mb.pop(); }
      const WALL = { wall: '#f2efe9', H: 5.6, pat: 'brick', pc: ['#f5f2ec', '#ece8e1', '#f8f6f1'], ps: 0.42, base: '#d9d4cc' };
      for (let k = 0; k < 4; k++) { if (k !== 1 && k !== 2) vWall(k, WALL, []); }
      // 0: tabela, renk çemberi, renk kartelası, duvara yaslı tuvaller
      vSign('frame', '#c9a46a', '#fff8ec', { lampC: '#2b2b2b' });
      VK.inSec(0, (s) => { wAt(s, 0, -4.9, 0, 2.9); v5ColorWheel(s, 1.25); s.pop(); wAt(s, 0, 4.9, 0, 2.9); v5Chips(s, 6, 6, 0.3); s.pop(); for (const [u, a, sd] of [[-2.8, 'abstract', 4], [2.9, 'flower', 6]]) for (let i = 0; i < 2; i++) { wAt(s, 0, u + i * 0.25, 0.25 + i * 0.14, 0, 0.04 * i); s.push().T(0, 0, 0, 0, -0.2); s.box(-0.5 + i * 0.1, 0, -0.03, 0.5 - i * 0.1, 1.1 - i * 0.2, 0.0, C('#e9e1d0', 0)); vArt(s, -0.48 + i * 0.1, 0.02, 0.48 - i * 0.1, 1.08 - i * 0.2, 0.002, a, sd + i); s.pop(); s.pop(); } });
      // 1: sağ — büyük çelik pencere (gün ışığı)
      const HW1 = [{ u0: -5.2, u1: 5.2, y0: 0.9, y1: 4.4 }];
      vWall(1, WALL, HW1); vWindow(1, HW1[0], { frame: '#2b2b2b', view: 'city', sun: true, sunHex: '#fff4d6', sunA: 0.16, nx: 8, ny: 3, sill: false });
      // 2: ön — boya kutusu rafı, sprey rafı, kapı
      vWall(2, WALL, [{ u0: 4.2, u1: 5.4, y0: 0, y1: 2.4 }]);
      vDoor(2, 4.8, { w: 1.1, h: 2.4, frame: '#2b2b2b', door: '#277da1', knob: '#c9ced6' });
      VK.inSec(2, (s) => { wAt(s, 2, -3.0, 0.3); v4Shelf(s, 3.4, 2.2, 0.5, 4, '#3a3d44'); for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { s.push().T(-1.45 + i * 0.36, 0.15 + r * (2.0 / 3), (hs(i, r) - 0.5) * 0.1); v5Can(s, HUES[(i + r * 4) % 12], 1.25, (i + r) % 4 === 0); s.pop(); } s.pop();
        wAt(s, 2, 1.3, 0, 1.75); s.box(-0.85, -0.6, 0, 0.85, 0.6, 0.03, C('#3a3d44', -0.6)); for (let r = 0; r < 3; r++) { s.box(-0.8, -0.52 + r * 0.4, 0.03, 0.8, -0.49 + r * 0.4, 0.14, C('#5a6068', -0.7)); for (let i = 0; i < 8; i++) { const x = -0.7 + i * 0.2, c = PAINT[(i + r * 3) % PAINT.length]; s.cyl(x, -0.49 + r * 0.4, 0.09, 0.04, -0.27 + r * 0.4, 0.04, 10, C('#c9ced6', -0.8), C(c, 0)); s.cyl(x, -0.27 + r * 0.4, 0.09, 0.03, -0.22 + r * 0.4, 0.03, 10, C(c, 0), C(c, 0)); } } s.pop(); });
      // 3: sol — uzun çalışma masası, kâğıt şeritli ip, sarkıt lambalar, logo
      VK.inSec(3, (s) => { wAt(s, 3, -0.6, 0.55); v5WorkTable(s, 4.2); s.pop();
        wAt(s, 3, -0.6, 0.06, 2.55); limb(s, [-2.4, 0, 0.04], [2.4, 0, 0.04], [0.006, 0.006], C('#8a8f96', -0.6), 4); for (let i = 0; i < 10; i++) { const x = -2.2 + i * 0.48; s.box(x - 0.12, -0.5 - hs(i, 2) * 0.15, 0.05, x + 0.12, -0.02, 0.055, C(PAINT[(i * 5) % PAINT.length], 0)); s.box(x - 0.02, -0.05, 0.05, x + 0.02, 0.04, 0.07, C('#c9a46a', 0)); } s.pop();
        for (const u of [-2.0, 0.8]) { wAt(s, 3, u, 0.75); P.pendant(s, 2.45, '#2b2b2e', { kind: 'cone', top: 5.6, poolR: 1.2, poolA: 0.1, halo: 0.45, haloA: 0.25 }); s.pop(); }
        wAt(s, 3, 4.6, 0, 3.2); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.03, C('#ffffff', 0)); s.pop(); });
      for (let k = 0; k < 4; k++) v5Drips(k, 5.6, k * 13 + 3);
      // salon: şövaleler, merdiven, kovalar, rulo, tabure ve palet, bitkiler
      for (const [x, z, a, sd] of [[-5.2, -4.4, 'abstract', 1], [5.3, -2.4, 'land', 2], [5.6, 1.6, 'abstract', 7], [-5.5, 2.6, 'flower', 4]]) VK.tall(x, z, (m) => v5Easel(m, a, sd), Math.atan2(-x, -z));
      VK.tall(-6.1, -1.0, (m) => v5StepLadder(m), 1.2);
      for (const [x, z, c, t] of [[3.6, -5.6, '#277da1', 0], [-3.4, 5.6, '#e63946', 0], [4.6, 5.0, '#f9c74f', 1], [2.2, 6.2, '#43aa8b', 0]]) { mb.push().T(x, 0, z, hs(x, z) * 4); v5Bucket(mb, c, !!t); mb.pop(); }
      mb.push().T(-1.6, 0, 5.9, 0.3); mb.box(-0.2, 0.0, -0.25, 0.2, 0.05, 0.25, C('#3a3d44', -0.6)); mb.box(-0.17, 0.05, -0.2, 0.17, 0.052, 0.1, C('#4361ee', 0)); mb.push().T(0.05, 0.06, 0.15, 0, 0, Math.PI / 2); mb.cyl(0, -0.12, 0, 0.045, 0.12, 0.045, 12, C('#4361ee', 0), C('#4361ee', 0)); mb.pop(); limb(mb, [0.05, 0.06, 0.15], [0.05, 0.1, 0.5], [0.01, 0.01], C('#3a3d44', -0.6), 3); mb.pop();
      mb.push().T(-4.2, 0, -5.8, 0.4); P.stool(mb, 0.7, '#f9c74f', '#2b2b2b'); mb.push().T(0, 0.7, 0, 0.5); v5Palette(mb, 3); mb.pop(); mb.pop();
      for (const [x, z] of [[0.8, -6.4], [-0.6, -6.5], [6.4, 3.8]]) { mb.push().T(x, 0, z, hs(x, z) * 5); v5Can(mb, PAINT[Math.round(x * 3 + 20) % PAINT.length], 1.3, true); mb.pop(); }
      for (const [x, z, k] of [[-6.95, 6.95, 0], [6.95, 6.95, 1], [6.95, -6.95, 0]]) VK.tall(x, z, (m) => (k ? P.monstera(m, 1.15, '#f2efe9') : P.fern(m, 1.1, '#e63946')));
    },
  },
  /* ---- Hafıza Sırası: retro atari salonu ---- */
  hfz: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'console', tableO: { metal: '#2a2340', glow: '#ff4fd8' }, chair: 'stool', chairO: { leg: '#1b1b22' },
    rug: 'led', rugO: { glow: '#4cc9f0', rug: '#120c22' },
    L: VL2.arcade, sky: ['#07050f', '#1a1430', '#0c0a18'], sun: [0.25, 0.92, 0.3], shR: 8.6, parts: 'sparkle',
    post: { bloom: 0.8, th: 0.7, sat: 1.15, con: 0.12, vig: 0.45, tint: [1.0, 0.98, 1.05] },
    det: 0.08, detS: 0.4,
    logos: [[2, -1.2, 3.4, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#221a48', { lip: '#2e2560', fade: '#06050b', band: '#22c8ff', bandE: 0.85, bandH: 0.05 });
      vArcadeCarpet(mb, '#120e26', ['#22c8ff', '#ff3fb4', '#ffd21f', '#33e88a', '#ff8a2a', '#9a7bff'], { e: 0.12 });
      const WALL = { wall: '#1a1430', H: 6.0, dado: '#0f0c1c', dadoH: 0.9, base: '#08070e', pat: 'stripe', pc: '#1f1838', ps: 0.5 };
      for (let k = 0; k < 4; k++) { if (k !== 2) vWall(k, WALL, []); }
      vWall(2, WALL, [{ u0: 2.8, u1: 4.2, y0: 0, y1: 2.5 }]);
      for (let k = 0; k < 4; k++) { v5Checker(k, 0.2, 0.7, 0.25); v5Neon(k, 3.3, '#ff4fd8'); v5Neon(k, 3.5, '#38e1ff'); }
      const CC = ['#ff4fd8', '#38e1ff', '#ffe14f', '#5bff9a', '#ff8a3d', '#a78bfa'];
      // 0: neon tabela, iki yanda oyun makineleri, şimşek
      vSign('neon', '#1a1430', '#ff4fd8');
      VK.inSec(0, (s) => { [-4.3, -3.1, 3.1, 4.3].forEach((u, i) => { wAt(s, 0, u, 0.42); v5Arcade(s, CC[i], i + 1); s.pop(); }); wAt(s, 0, 0, 0, 4.35); const n = [0, 0, 1]; for (const [a, b] of [[[-0.5, 0.5], [0.15, 0.05]], [[0.15, 0.05], [-0.1, -0.05]], [[-0.1, -0.05], [0.5, -0.55]]]) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = (-dy / L) * 0.07, ny = (dx / L) * 0.07; s.quadN([a[0] + nx, a[1] + ny, 0.04], [b[0] + nx, b[1] + ny, 0.04], [b[0] - nx, b[1] - ny, 0.04], [a[0] - nx, a[1] - ny, 0.04], n, n, n, n, C('#ffe14f', 1)); } s.pop(); });
      VK.wglow(0, 0, 0.1, 4.35, 1.2, '#ffe14f', 0.18, 0.9);
      // 1: sağ — oyun makinesi sırası, langırt, jeton makinesi
      VK.inSec(1, (s) => { [-4.7, -3.55, -2.4, -1.25].forEach((u, i) => { wAt(s, 1, u, 0.42); v5Arcade(s, CC[(i + 2) % 6], i + 5); s.pop(); }); wAt(s, 1, 1.6, 0.85); v5Pinball(s); s.pop(); wAt(s, 1, 3.4, 0.85, 0, 0); v5Pinball(s); s.pop(); wAt(s, 1, 5.6, 0.32); v5TokenMachine(s); s.pop(); });
      // 2: ön — ödül tezgâhı ve raflar, neon kemerli giriş, fotoğraf kabini, logo
      VK.inSec(2, (s) => { wAt(s, 2, -3.4, 0.62); v5PrizeCounter(s, 3.3); s.pop(); for (const y of [1.55, 2.35]) { wAt(s, 2, -3.4, 0, y); s.box(-1.7, 0, 0, 1.7, 0.04, 0.34, C('#2b2440', -0.5)); for (let i = 0; i < 5; i++) { s.push().T(-1.35 + i * 0.68, 0.04, 0.17, (hs(i, y) - 0.5) * 0.6); v5Plush(s, PLC[(i + Math.round(y * 3)) % PLC.length], 1.2, 1); s.pop(); } s.pop(); }
        wAt(s, 2, 3.5, 0, 0); for (let k = 0; k <= 12; k++) { const a = Math.PI * (k / 12), x = Math.cos(a) * 0.95, y = 2.55 + Math.sin(a) * 0.55; s.sphereS(x, y, 0.06, 0.05, 0.05, 0.04, C(k % 2 ? '#38e1ff' : '#ff4fd8', 1), 6, 4); } s.box(-0.95, 0, 0.0, -0.85, 2.55, 0.08, C('#ff4fd8', 1)); s.box(0.85, 0, 0.0, 0.95, 2.55, 0.08, C('#ff4fd8', 1)); s.pop();
        wAt(s, 2, 5.9, 0.55); v5PhotoBooth(s); s.pop();
        wAt(s, 2, -1.2, 0, 3.4); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#38e1ff', 1)); s.box(-0.46, -0.46, 0.04, 0.46, 0.46, 0.05, C('#120e26', 0)); s.pop(); });
      vDoor(2, 3.5, { w: 1.4, h: 2.5, frame: '#1a1430', door: '#24203a', glass: '#ff8fd8', knob: '#c9ced6' });
      VK.wglow(2, 3.5, 0.08, 1.4, 1.3, '#ff8fd8', 0.14, 1.3);
      // 3: sol — iki pençe makinesi, dans makinesi
      VK.inSec(3, (s) => { [-4.4, -3.3].forEach((u, i) => { wAt(s, 3, u, 0.55); v5Claw(s, ['#38e1ff', '#ff8a3d'][i], i + 2); s.pop(); }); wAt(s, 3, 0.6, 1.1); v5DanceMachine(s); s.pop(); wAt(s, 3, 4.2, 0.45); v5Arcade(s, '#a78bfa', 11); s.pop(); wAt(s, 3, 5.35, 0.45); v5Arcade(s, '#5bff9a', 12); s.pop(); });
      // salon: hava hokeyi, yüksek bar masaları
      mb.push().T(-4.7, 0, 4.8, 0.65); v5AirHockey(mb); mb.pop();
      for (const [x, z] of [[4.9, 4.6], [5.4, -4.2], [-4.9, -4.6]]) VK.tall(x, z, (m) => { v5BarTable(m); for (let i = 0; i < 2; i++) { const a = i * 2.6 + 0.9; m.push().T(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62); P.stool(m, 0.74, CC[((i + Math.round(x)) & 3) + 1], '#1b1b22'); m.pop(); } }, hs(x, z) * 3);
    },
  },
});

/* ---- 4. paket: gül bahçesi terası, antik labirent, mucit atölyesi, kış şenliği, eski matbaa ---- */
Object.assign(VL2, {
  sunset: { raw: 1, sunC: [0.88, 0.74, 0.64], sky: [0.4, 0.41, 0.51], gnd: [0.27, 0.25, 0.25], night: 1, warm: [1, 0.82, 0.66], lampC: [0.78, 0.64, 0.5], fogR: [45, 140], stars: 0, glowS: 0.38 },
  antique: { raw: 1, sunC: [0.98, 0.8, 0.58], sky: [0.43, 0.43, 0.51], gnd: [0.32, 0.27, 0.22], night: 0, warm: [1, 0.88, 0.68], lampC: [0.6, 0.48, 0.34], fogR: [50, 150], stars: 0, glowS: 0.35 },
  workshop: { raw: 1, sunC: [0.62, 0.52, 0.42], sky: [0.33, 0.29, 0.25], gnd: [0.2, 0.16, 0.12], night: 1, warm: [1, 0.82, 0.58], lampC: [1.1, 0.85, 0.55], fogR: [40, 110], stars: 0, glowS: 0.5 },
  snowday: { raw: 1, sunC: [0.42, 0.48, 0.74], sky: [0.32, 0.38, 0.58], gnd: [0.19, 0.22, 0.34], night: 1, warm: [1, 0.78, 0.52], lampC: [1.2, 0.88, 0.56], fogR: [40, 120], stars: 0, glowS: 0.62 },
  printshop: { raw: 1, sunC: [0.7, 0.6, 0.48], sky: [0.36, 0.34, 0.33], gnd: [0.22, 0.18, 0.15], night: 0.6, warm: [1, 0.84, 0.6], lampC: [1.05, 0.8, 0.52], fogR: [40, 120], stars: 0, glowS: 0.5 },
});

// altıgen pişmiş toprak karo (düz üst): krem derz üstünde hafif renk oynamalı altıgenler
function vHexTiles(mb, r, cols, grout, o = {}) {
  VK.quad(mb, -RW, -RW, RW, RW, C(grout, 0), 0.0012);
  const w = Math.sqrt(3) * r, h = 1.5 * r, g = o.g ?? 0.03, e = o.e ?? -0.2; let j = 0;
  for (let z = -RW - r; z < RW + r; z += h, j++) for (let x = -RW - w + (j % 2) * (w / 2); x < RW + w; x += w) {
    if (Math.abs(x) > RW - r * 0.7 || Math.abs(z) > RW - r * 0.7) continue; if (o.skip && Math.hypot(x, z) < o.skip) continue;
    const fc = o.colFn && o.colFn(x, z), c = C(fc || cols[Math.floor(hs(Math.round(x * 10), Math.round(z * 10)) * cols.length)], e), rr = r - g, P0 = [x, 0.003, z];
    for (let k = 0; k < 6; k++) { const a0 = (k / 6) * TAU + Math.PI / 6, a1 = ((k + 1) / 6) * TAU + Math.PI / 6; mb.triN(P0, [x + Math.cos(a0) * rr, 0.003, z + Math.sin(a0) * rr], [x + Math.cos(a1) * rr, 0.003, z + Math.sin(a1) * rr], UPV, UPV, UPV, c); }
  }
}
/* ---- masa altı halılar ---- */
// taş mozaik: halkalar, dış dişli şerit, ortada çiçek
RUGS.mosaic = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, A = o.a || '#efe3d2', B = o.b || '#b0603e', Cc = o.c || '#7d9a6a';
  mb.cyl(0, 0, 0, R, y, R, 56, C(A, -0.2), C(A, -0.2));
  for (const [r0, r1, n, c1, c2] of [[R - 0.06, R - 0.2, 40, B, o.d || '#e3d3bb'], [R - 0.3, R - 0.42, 36, Cc, o.d || '#e3d3bb'], [R * 0.55, R * 0.48, 24, B, Cc]]) for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU + 0.01, a1 = ((k + 1) / n) * TAU - 0.01; mb.quadN([Math.cos(a0) * r1, y + 0.002, Math.sin(a0) * r1], [Math.cos(a0) * r0, y + 0.002, Math.sin(a0) * r0], [Math.cos(a1) * r0, y + 0.002, Math.sin(a1) * r0], [Math.cos(a1) * r1, y + 0.002, Math.sin(a1) * r1], UPV, UPV, UPV, UPV, C(k % 2 ? c1 : c2, -0.2)); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, r = R * 0.45; mb.quadN([0, y + 0.003, 0], [Math.cos(a - 0.3) * r * 0.5, y + 0.003, Math.sin(a - 0.3) * r * 0.5], [Math.cos(a) * r, y + 0.003, Math.sin(a) * r], [Math.cos(a + 0.3) * r * 0.5, y + 0.003, Math.sin(a + 0.3) * r * 0.5], UPV, UPV, UPV, UPV, C(k % 2 ? B : '#e9b44c', -0.2)); }
};
// labirent mozaiği: iç içe halkalar, dört yönde geçit
RUGS.laby = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, A = C(o.a || '#ecdcbc', -0.2), B = C(o.b || '#8c3b2a', -0.2);
  mb.cyl(0, 0, 0, R, y, R, 64, A, A);
  for (let i = 0; i < 6; i++) { const r0 = R - 0.12 - i * 0.36, r1 = r0 - 0.11, n = 48, gap = i % 2 ? 0 : Math.PI / 4; for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, am = (a0 + a1) / 2; if (((am + gap) % (Math.PI / 2)) < 0.16) continue; mb.quadN([Math.cos(a0) * r1, y + 0.002, Math.sin(a0) * r1], [Math.cos(a0) * r0, y + 0.002, Math.sin(a0) * r0], [Math.cos(a1) * r0, y + 0.002, Math.sin(a1) * r0], [Math.cos(a1) * r1, y + 0.002, Math.sin(a1) * r1], UPV, UPV, UPV, UPV, B); } }
};
// dişli halı (mucit atölyesi)
RUGS.cog = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, A = C(o.a || '#6e1a22', -0.1), G = C(o.b || '#c9a34a', -0.1), n = 22, r0 = R - 0.32;
  mb.cyl(0, 0, 0, r0, y, r0, 64, A, A);
  for (let k = 0; k < n; k++) { const a = (k / n) * TAU, w = (TAU / n) * 0.26; mb.quadN([Math.cos(a - w) * (r0 - 0.02), y, Math.sin(a - w) * (r0 - 0.02)], [Math.cos(a - w * 0.75) * R, y, Math.sin(a - w * 0.75) * R], [Math.cos(a + w * 0.75) * R, y, Math.sin(a + w * 0.75) * R], [Math.cos(a + w) * (r0 - 0.02), y, Math.sin(a + w) * (r0 - 0.02)], UPV, UPV, UPV, UPV, A); }
  mb.lathe(0, y + 0.002, 0, [[r0 - 0.12, 0], [r0 - 0.2, 0]], 64, G); mb.lathe(0, y + 0.002, 0, [[r0 * 0.5, 0], [r0 * 0.45, 0]], 48, G);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; v4Seg(mb, Math.cos(a) * r0 * 0.5, Math.sin(a) * r0 * 0.5, Math.cos(a) * (r0 - 0.2), Math.sin(a) * (r0 - 0.2), 0.035, G, y + 0.002); }
};
// kar tanesi halısı
RUGS.flake = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, A = C(o.a || '#cfe8f7', -0.3), W = C('#ffffff', 0.1);
  mb.cyl(0, 0, 0, R, y, R, 64, A, A); mb.lathe(0, y + 0.002, 0, [[R - 0.08, 0], [R - 0.16, 0]], 64, W);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, ca = Math.cos(a), sa = Math.sin(a), L = R - 0.3; v4Seg(mb, 0, 0, ca * L, sa * L, 0.05, W, y + 0.003); for (const t of [0.45, 0.7]) for (const s of [-1, 1]) { const b = a + s * 0.7, px = ca * L * t, pz = sa * L * t, l = L * (0.95 - t) * 0.6; v4Seg(mb, px, pz, px + Math.cos(b) * l, pz + Math.sin(b) * l, 0.035, W, y + 0.003); } }
};
// bulmaca ızgarası halısı (matbaa): krem kareler, simetrik siyah kareler, koyu kenar
RUGS.cross = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, N = 9, s = (R * 1.5) / N, h = (N * s) / 2, K = C('#1b1b1e', -0.2), W = C('#f4ecd8', -0.2), Fr = C('#3a2a1c', -0.2);
  mb.box(-h - 0.12, 0, -h - 0.12, h + 0.12, y, h + 0.12, Fr);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = Math.min(i, N - 1 - i), b = Math.min(j, N - 1 - j), blk = (a === 1 && b === 1) || (i === 4 && (j === 0 || j === 8)) || (j === 4 && (i === 0 || i === 8)) || (a === 3 && b === 2) || (a === 2 && b === 3); const x0 = -h + i * s, z0 = -h + j * s; VK.quad(mb, x0 + 0.02, z0 + 0.02, x0 + s - 0.02, z0 + s - 0.02, blk ? K : W, y + 0.002); }
};

/* ---- Gül bahçesi eşyaları ---- */
function v6RoseBush(mb, r = 0.55, cols = ['#e63946', '#ff8fab', '#ffc2d1'], seed = 1) {
  mb.sphereS(0, r * 0.75, 0, r, r * 0.8, r, C('#3f7d3a', -0.1), 12, 8);
  for (let i = 0; i < 9; i++) { const a = hs(i, seed) * TAU, b = 0.3 + hs(i, seed + 1) * 1.0, x = Math.cos(a) * Math.cos(b) * r * 0.95, y = r * 0.75 + Math.sin(b) * r * 0.78, z = Math.sin(a) * Math.cos(b) * r * 0.95; mb.sphereS(x, y, z, 0.08, 0.07, 0.08, C(cols[i % cols.length], 0), 7, 5); }
  VK.sh(mb, 0, 0, r * 1.15, r * 1.15, 0.36);
}
function v6Fountain(mb) {
  const S = C('#e3dccd', -0.3), Sd = C('#cfc6b4', -0.3), W = C('#7cc6e8', 0.35), Wl = C('#c8ecfa', 0.6);
  mb.lathe(0, 0, 0, [[1.05, 0], [1.05, 0.42], [0.95, 0.46], [0.92, 0.12]], 28, S); mb.cyl(0, 0.1, 0, 0.92, 0.36, 0.92, 28, W, W, '');
  mb.lathe(0, 0.36, 0, [[0.16, 0], [0.12, 0.5], [0.2, 0.62]], 14, Sd);
  mb.lathe(0, 0.96, 0, [[0.2, 0], [0.55, 0.06], [0.58, 0.16], [0.5, 0.18], [0.14, 0.12]], 22, S); mb.cyl(0, 1.06, 0, 0.5, 1.1, 0.5, 22, W, W, '');
  mb.lathe(0, 1.1, 0, [[0.08, 0], [0.06, 0.3], [0.12, 0.4]], 12, Sd); mb.sphereS(0, 1.55, 0, 0.1, 0.12, 0.1, S, 10, 6);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; limb(mb, [Math.cos(a) * 0.52, 1.1, Math.sin(a) * 0.52], [Math.cos(a) * 0.72, 0.38, Math.sin(a) * 0.72], [0.012, 0.02], Wl, 3); }
  VK.sh(mb, 0, 0, 1.2, 1.2, 0.36);
}
function v6Bench(mb, col = '#f4f1ea') { P.bench(mb, 1.6, col, '#2f3338'); mb.rbox(-0.7, 0.45, -0.2, 0.7, 0.52, 0.16, 0.04, C('#f6b0c1', 0), 2); }
function v6Bicycle(mb) {
  const F = C('#7fb8a8', -0.5), Tk = C('#22252b', -0.4), M = C('#c9ced6', -0.85);
  for (const x of [-0.52, 0.52]) { mb.push().T(x, 0.34, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.32, 0.025, 0.025, 22, 4, Tk); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], [0.004, 0.004], M, 3); } mb.pop(); }
  limb(mb, [-0.52, 0.34, 0], [-0.05, 0.36, 0], [0.02, 0.02], F, 4); limb(mb, [-0.05, 0.36, 0], [-0.15, 0.78, 0], [0.02, 0.02], F, 4); limb(mb, [-0.15, 0.78, 0], [0.38, 0.8, 0], [0.02, 0.02], F, 4); limb(mb, [-0.05, 0.36, 0], [0.38, 0.8, 0], [0.02, 0.02], F, 4); limb(mb, [0.52, 0.34, 0], [0.4, 0.92, 0], [0.02, 0.02], F, 4); limb(mb, [-0.52, 0.34, 0], [-0.15, 0.78, 0], [0.016, 0.016], F, 4);
  mb.rbox(-0.25, 0.8, -0.07, -0.05, 0.85, 0.07, 0.02, C('#6b4428', 0), 1); limb(mb, [0.4, 0.94, -0.24], [0.4, 0.94, 0.24], [0.014, 0.014], M, 3);
  mb.push().T(0.62, 0.8, 0); mb.lathe(0, 0, 0, [[0.14, 0], [0.17, 0.18]], 12, C('#c9a46a', 0), 'b'); for (let i = 0; i < 7; i++) mb.sphereS(-0.08 + hs(i, 1) * 0.16, 0.2 + hs(i, 2) * 0.06, -0.08 + hs(i, 3) * 0.16, 0.05, 0.045, 0.05, C(['#ff8fab', '#ffffff', '#ffd166', '#c77dff'][i % 4], 0), 6, 4); mb.pop();
  limb(mb, [-0.05, 0.36, 0], [-0.1, 0.0, 0.18], [0.008, 0.008], M, 3);
  VK.sh(mb, 0, 0, 0.75, 0.22, 0.32);
}
function v6Lantern(mb, s = 1) { P.lantern(mb, '#2b2b2b', '#ffcf7a', { r: 0.55 * s, a: 0.3, pool: 1 }); }
function v6Balustrade(k, from, to, h = 1.05) {
  const mb = SEC(k), S = C('#e8e0d0', -0.3), Sd = C('#d6ccb8', -0.3); wAt(mb, k, 0, 0.18);
  mb.box(from, 0, -0.15, to, 0.16, 0.15, Sd); mb.box(from - 0.05, h - 0.1, -0.18, to + 0.05, h, 0.18, S);
  for (let u = from + 0.18; u < to - 0.1; u += 0.33) mb.lathe(u, 0.16, 0, [[0.06, 0], [0.09, 0.15], [0.05, 0.4], [0.08, 0.66], [0.06, h - 0.26]], 8, S);
  for (const u of [from, (from + to) / 2, to]) { mb.box(u - 0.2, 0, -0.2, u + 0.2, h + 0.05, 0.2, Sd); mb.lathe(u, h + 0.05, 0, [[0.14, 0], [0.2, 0.18], [0.12, 0.34], [0.16, 0.4]], 12, S); mb.sphereS(u, h + 0.5, 0, 0.12, 0.09, 0.12, C('#3f7d3a', 0), 8, 5); for (let i = 0; i < 4; i++) mb.sphereS(u + (hs(i, u) - 0.5) * 0.2, h + 0.55, (hs(i, u + 1) - 0.5) * 0.2, 0.04, 0.035, 0.04, C('#ff8fab', 0), 6, 4); }
  mb.pop();
}
function v6Hills(k, seed = 1, sun = false) {
  const mb = SEC(k); wAt(mb, k, 0, 0);
  for (let i = 0; i < 6; i++) { const u = -14 + i * 5.6 + hs(i, seed) * 2, w = 4 + hs(i, seed + 1) * 3, h = 2.2 + hs(i, seed + 2) * 2.2, z = -9 - i % 2 * 5; mb.sphereS(u, -0.4, z, w, h, 2.0, C(i % 2 ? '#b07aa1' : '#8e6a9a', 0.4), 16, 6); }
  if (sun) mb.sphereS(0, 3.6, -30, 2.2, 2.2, 0.2, C('#ffd27a', 1), 18, 8);
  mb.pop();
}
function v6Arbor(mb, w = 1.8, h = 2.5) {
  const Wt = C('#f4f1ea', -0.2), L = C('#3f7d3a', -0.05);
  for (const s of [-1, 1]) { mb.box(s * w / 2 - 0.05, 0, -0.25, s * w / 2 + 0.05, h, -0.15, Wt); mb.box(s * w / 2 - 0.05, 0, 0.15, s * w / 2 + 0.05, h, 0.25, Wt); for (let y = 0.4; y < h; y += 0.4) mb.box(s * w / 2 - 0.04, y, -0.25, s * w / 2 + 0.04, y + 0.03, 0.25, Wt); }
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (k / 10), x = Math.cos(a) * w / 2, y = h + Math.sin(a) * 0.55; mb.box(x - 0.04, y - 0.04, -0.25, x + 0.04, y + 0.04, 0.25, Wt); }
  for (let i = 0; i < 34; i++) { const t = i / 33, side = t < 0.3 ? -1 : t > 0.7 ? 1 : 0, a = Math.PI * (1 - (t - 0.3) / 0.4), x = side ? side * w / 2 : Math.cos(a) * w / 2, y = side ? (side < 0 ? t / 0.3 : (1 - t) / 0.3) * h : h + Math.sin(a) * 0.55; mb.sphereS(x + (hs(i, 3) - 0.5) * 0.12, y, (hs(i, 4) - 0.5) * 0.3, 0.13, 0.12, 0.13, L, 7, 5); if (i % 2) mb.sphereS(x + (hs(i, 5) - 0.5) * 0.15, y + 0.06, 0.13 * (hs(i, 6) > 0.5 ? 1 : -1), 0.06, 0.055, 0.06, C(i % 4 === 1 ? '#e63946' : '#ff8fab', 0), 6, 4); }
}
function v6LemonTree(mb) { P.pot(mb, 0.32, 0.5, '#c8734a', { kind: 'round' }); limb(mb, [0, 0.45, 0], [0, 1.3, 0], [0.04, 0.03], C('#6b4a2e', 0), 4); mb.sphereS(0, 1.6, 0, 0.5, 0.45, 0.5, C('#4f8f3a', -0.1), 12, 8); for (let i = 0; i < 8; i++) { const a = hs(i, 7) * TAU, b = hs(i, 8) * 1.2 - 0.3; mb.sphereS(Math.cos(a) * Math.cos(b) * 0.48, 1.6 + Math.sin(b) * 0.42, Math.sin(a) * Math.cos(b) * 0.48, 0.06, 0.07, 0.06, C('#f9d342', 0), 6, 4); } }

/* ---- Antik labirent eşyaları ---- */
function v6Column(mb, h = 3.6, r = 0.32, broken = false, seed = 1) {
  const S = C('#e6dcc6', -0.3), Sd = C('#d2c6ab', -0.3);
  mb.box(-r - 0.12, 0, -r - 0.12, r + 0.12, 0.22, r + 0.12, Sd); mb.lathe(0, 0.22, 0, [[r + 0.08, 0], [r + 0.02, 0.1]], 18, S);
  const top = broken ? h * (0.35 + hs(seed, 4) * 0.35) : h - 0.35;
  mb.lathe(0, 0.32, 0, [[r, 0], [r * 0.9, top - 0.32]], 16, (i, a) => C(Math.floor(a * 16 / TAU) % 2 ? '#e6dcc6' : '#d8cdb4', -0.3), '');
  if (broken) { const n = 10; for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, y0 = top + hs(k, seed) * 0.18, y1 = top + hs((k + 1) % n, seed) * 0.18; mb.triN([0, top + 0.06, 0], [Math.cos(a0) * r * 0.9, y0, Math.sin(a0) * r * 0.9], [Math.cos(a1) * r * 0.9, y1, Math.sin(a1) * r * 0.9], UPV, UPV, UPV, Sd); } }
  else { mb.lathe(0, h - 0.35, 0, [[r * 0.9, 0], [r + 0.12, 0.18]], 16, S); mb.box(-r - 0.18, h - 0.17, -r - 0.18, r + 0.18, h, r + 0.18, Sd); }
  VK.sh(mb, 0, 0, r + 0.2, r + 0.2, 0.4);
}
function v6Drum(mb, r = 0.3, len = 0.6) { mb.push().T(0, r, 0, 0, 0, Math.PI / 2); mb.cyl(0, -len / 2, 0, r, len / 2, r, 16, C('#ddd2ba', -0.3), C('#ddd2ba', -0.3)); mb.pop(); VK.sh(mb, 0, 0, len * 0.6, r, 0.36); }
function v6Amphora(mb, h = 0.9, col = '#b8643c') {
  const T = C(col, -0.1), K = C('#2a1a14', 0);
  mb.lathe(0, 0, 0, [[0.06, 0], [0.16, 0.12], [0.26, 0.38], [0.24, 0.6], [0.12, 0.76], [0.08, 0.86], [0.11, 0.9]], 16, (i) => (i === 3 ? K : T));
  for (const s of [-1, 1]) limb(mb, [s * 0.1, 0.82, 0], [s * 0.2, 0.68, 0], [0.018, 0.018], T, 4);
  VK.sh(mb, 0, 0, 0.3, 0.3, 0.38);
}
function v6Brazier(mb) {
  const Br = C('#8a6a3a', -0.85);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35], [Math.cos(a) * 0.12, 1.0, Math.sin(a) * 0.12], [0.025, 0.02], Br, 5); }
  mb.lathe(0, 1.0, 0, [[0.08, 0], [0.34, 0.12], [0.38, 0.2]], 16, Br);
  mb.cyl(0, 1.12, 0, 0.2, 1.62, 0, 7, C('#ff8a1f', 1), C('#ff8a1f', 1), ''); mb.cyl(0.05, 1.12, 0.03, 0.12, 1.45, 0, 6, C('#ffd25a', 1), C('#ffd25a', 1), '');
  VK.halo(mb.p(0, 1.35, 0), 0.8, '#ff9a3c', 0.4, 1); const p = mb.p(0, 0, 0); VK.glow(p[0], 0.015, p[2], 1.8, '#ff9a3c', 0.12, 'h', 1);
  VK.sh(mb, 0, 0, 0.4, 0.4, 0.34);
}
function v6Bust(mb) {
  const M = C('#f1ede4', -0.4);
  mb.box(-0.26, 0, -0.26, 0.26, 1.0, 0.26, C('#d8cdb4', -0.3)); mb.box(-0.32, 1.0, -0.32, 0.32, 1.08, 0.32, C('#ccc0a4', -0.3)); mb.box(-0.32, 0, -0.32, 0.32, 0.1, 0.32, C('#ccc0a4', -0.3));
  mb.cyl(0, 1.08, 0, 0.12, 1.16, 0.1, 12, M, M); mb.sphereS(0, 1.3, 0, 0.28, 0.16, 0.18, M, 14, 8); mb.cyl(0, 1.38, 0, 0.07, 1.52, 0.06, 10, M, M);
  mb.sphereS(0, 1.66, 0.01, 0.13, 0.16, 0.14, M, 14, 9); mb.sphereS(0, 1.72, -0.02, 0.14, 0.12, 0.14, C('#e6e0d4', -0.4), 12, 7, (ux, uy, uz) => C(Math.sin(ux * 30 + uz * 20) > 0 ? '#e6e0d4' : '#d6cfc2', -0.4)); mb.sphereS(0, 1.64, 0.13, 0.022, 0.035, 0.03, M, 6, 4);
  VK.sh(mb, 0, 0, 0.4, 0.4, 0.4);
}
function v6Olive(mb) { P.pot(mb, 0.36, 0.55, '#b8643c', { kind: 'round' }); limb(mb, [0, 0.5, 0], [0.1, 1.2, 0.05], [0.07, 0.05], C('#6b5a46', 0), 5); limb(mb, [0.1, 1.2, 0.05], [-0.2, 1.6, -0.1], [0.045, 0.03], C('#6b5a46', 0), 4); limb(mb, [0.1, 1.2, 0.05], [0.35, 1.7, 0.1], [0.04, 0.03], C('#6b5a46', 0), 4); for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; mb.sphereS(Math.cos(a) * 0.42, 1.75 + hs(i, 2) * 0.3, Math.sin(a) * 0.42, 0.32, 0.22, 0.32, C(i % 2 ? '#7d9a5a' : '#6b8a4f', -0.1), 10, 6); } VK.sh(mb, 0, 0, 0.6, 0.6, 0.35); }
function v6Meander(mb, x0, z0, len, ax, s = 0.3, col = '#8c3b2a', y = 0.006) {
  const c = C(col, -0.2), w = 0.035, n = Math.floor(len / s), P2 = (u, v) => (ax === 'x' ? [x0 + u, z0 + v] : [x0 + v, z0 + u]);
  const L = (a, b) => { const p = P2(a[0], a[1]), q = P2(b[0], b[1]); v4Seg(mb, p[0], p[1], q[0], q[1], w, c, y); };
  L([0, -s * 0.5], [n * s, -s * 0.5]); L([0, s * 0.5], [n * s, s * 0.5]);
  for (let i = 0; i < n; i++) { const u = i * s; L([u + s * 0.1, -s * 0.5], [u + s * 0.1, s * 0.3]); L([u + s * 0.1, s * 0.3], [u + s * 0.75, s * 0.3]); L([u + s * 0.75, s * 0.3], [u + s * 0.75, -s * 0.15]); L([u + s * 0.75, -s * 0.15], [u + s * 0.42, -s * 0.15]); L([u + s * 0.42, -s * 0.15], [u + s * 0.42, s * 0.05]); }
}

/* ---- Mucit atölyesi eşyaları ---- */
function v6Pipes(k, y, seed = 1) {
  const mb = SEC(k), Cu = C('#b87333', -0.88), Br = C('#c9a34a', -0.88), R2 = C('#c8102e', -0.4); wAt(mb, k, 0, 0.12);
  mb.push().T(0, y, 0, 0, 0, Math.PI / 2); mb.cyl(0, -RW, 0, 0.06, RW, 0.06, 10, Cu, Cu, ''); mb.pop();
  for (let i = 0; i < 4; i++) { const u = -6 + i * 4 + (hs(i, seed) - 0.5) * 1.4; limb(mb, [u, y, 0], [u, y - 0.6 - hs(i, seed + 1) * 0.4, 0], [0.05, 0.05], Cu, 6); mb.torusN(u, y, 0, 0.08, 0.03, 0.03, 10, 3, Br); mb.push().T(u + 0.0, y - 0.45, 0.07, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.12, 0.018, 0.018, 14, 3, R2); for (let s = 0; s < 4; s++) { const a = (s / 4) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12], [0.01, 0.01], R2, 3); } mb.pop(); }
  for (let i = 0; i < 3; i++) { const u = -4 + i * 4 + (hs(i, seed + 3) - 0.5); mb.push().T(u, y + 0.25, 0.08, 0, Math.PI / 2); mb.cyl(0, -0.03, 0, 0.16, 0.03, 0.16, 18, Br, Br); mb.cyl(0, 0.03, 0, 0.13, 0.035, 0.13, 18, C('#f4ecd8', 0), C('#f4ecd8', 0)); mb.pop(); mb.push().T(u, y + 0.25, 0.12, 0, 0, 0.6 + i); mb.box(-0.006, 0, 0, 0.006, 0.11, 0.004, C('#c8102e', 0)); mb.pop(); limb(mb, [u, y, 0], [u, y + 0.1, 0], [0.025, 0.025], Br, 3); }
  mb.pop();
}
function v6Chalkboard(mb, w, h, seed = 1) {
  mb.box(-w / 2 - 0.06, -h / 2 - 0.06, 0, w / 2 + 0.06, h / 2 + 0.06, 0.04, C('#6b4428', -0.2)); mb.box(-w / 2, -h / 2, 0.04, w / 2, h / 2, 0.045, C('#23332b', 0));
  const Ch = C('#e9efe9', 0.2);
  for (let r = 0; r < 6; r++) { let x = -w / 2 + 0.15; const y = h / 2 - 0.2 - r * (h - 0.3) / 6; while (x < w / 2 - 0.2) { const l = 0.06 + hs(x * 7 + r, seed) * 0.22; mb.box(x, y - 0.012, 0.046, x + l, y + 0.012, 0.048, Ch); if (hs(x + r, seed + 1) > 0.7) mb.box(x + l * 0.4, y - 0.05, 0.046, x + l * 0.4 + 0.02, y + 0.05, 0.048, Ch); x += l + 0.05; } }
  mb.torusN(w * 0.28, -h * 0.12, 0.048, 0.22, 0.012, 0.004, 24, 3, Ch); for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; mb.push().T(w * 0.28, -h * 0.12, 0.048, 0, 0, a); mb.box(-0.3, -0.006, 0, 0.3, 0.006, 0.003, Ch); mb.pop(); }
  mb.box(-w / 2, -h / 2 - 0.1, 0.0, w / 2, -h / 2 - 0.06, 0.12, C('#6b4428', -0.2)); mb.box(-0.3, -h / 2 - 0.06, 0.06, -0.22, -h / 2 - 0.04, 0.1, C('#f4f4f4', 0));
}
function v6Telescope(mb) {
  const Br = C('#c9a34a', -0.9), Wd = C('#6b4428', -0.3);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; limb(mb, [0, 1.2, 0], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [0.025, 0.02], Wd, 5); }
  mb.sphereS(0, 1.22, 0, 0.06, 0.06, 0.06, Br, 8, 5);
  mb.push().T(0, 1.3, 0, 0, -0.75); mb.cyl(0, -0.45, 0, 0.07, 0.55, 0.1, 16, Br, Br); mb.cyl(0, 0.55, 0, 0.11, 0.62, 0.11, 16, Br, Br); mb.cyl(0, 0.62, 0, 0.09, 0.63, 0.09, 16, C('#9fc6ff', 0.7), C('#9fc6ff', 0.7)); mb.cyl(0, -0.55, 0, 0.035, -0.45, 0.04, 10, Br, Br); mb.pop();
  VK.sh(mb, 0, 0, 0.55, 0.55, 0.34);
}
function v6Orrery(mb) {
  const Br = C('#c9a34a', -0.9), Wd = C('#4a2614', -0.4);
  mb.box(-0.3, 0, -0.3, 0.3, 0.8, 0.3, Wd); mb.box(-0.36, 0.8, -0.36, 0.36, 0.86, 0.36, Wd); mb.lathe(0, 0.86, 0, [[0.16, 0], [0.04, 0.12], [0.03, 0.5]], 12, Br);
  mb.sphereS(0, 1.42, 0, 0.12, 0.12, 0.12, C('#ffcf5a', 1), 14, 9); VK.halo(mb.p(0, 1.42, 0), 0.45, '#ffcf5a', 0.32);
  for (const [r, a, s, c, t] of [[0.25, 0.4, 0.03, '#b0b0b0', 0.1], [0.38, 2.1, 0.045, '#e9c46a', -0.08], [0.52, 3.9, 0.05, '#4a90d9', 0.12], [0.66, 5.2, 0.04, '#c8553d', -0.05], [0.82, 1.2, 0.08, '#d9b38c', 0.08]]) { mb.push().T(0, 1.42, 0, 0, t); mb.torusN(0, 0, 0, r, 0.006, 0.006, 32, 3, Br); limb(mb, [0, -0.02, 0], [Math.cos(a) * r, -0.02, Math.sin(a) * r], [0.007, 0.007], Br, 3); mb.sphereS(Math.cos(a) * r, 0, Math.sin(a) * r, s, s, s, C(c, -0.3), 10, 6); mb.pop(); }
  VK.sh(mb, 0, 0, 0.4, 0.4, 0.38);
}
function v6Hourglass(mb, h = 1.0) {
  const Wd = C('#4a2614', -0.4), Gl = C('#e6f4f8', -0.92), Sd = C('#e9c46a', 0);
  for (const y of [0, h - 0.08]) mb.cyl(0, y, 0, 0.32, y + 0.08, 0.32, 16, Wd, Wd);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; mb.cyl(Math.cos(a) * 0.27, 0.08, Math.sin(a) * 0.27, 0.025, h - 0.08, 0.025, 8, Wd, Wd); }
  mb.lathe(0, 0.08, 0, [[0.22, 0], [0.2, 0.2], [0.05, 0.42], [0.05, 0.46], [0.2, 0.68], [0.22, h - 0.16]], 16, Gl, '');
  mb.lathe(0, 0.08, 0, [[0.2, 0], [0.16, 0.1], [0.0, 0.18]], 16, Sd); mb.lathe(0, 0.6, 0, [[0.12, 0], [0.18, 0.12], [0.19, 0.2], [0, 0.2]], 16, Sd); limb(mb, [0, 0.52, 0], [0, 0.26, 0], [0.006, 0.006], Sd, 3);
  VK.sh(mb, 0, 0, 0.36, 0.36, 0.4);
}
function v6PennyFarthing(mb) {
  const Bk = C('#22252b', -0.6), M = C('#c9ced6', -0.88);
  mb.push().T(0.3, 0.72, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.7, 0.025, 0.025, 32, 4, Bk); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.68, 0, Math.sin(a) * 0.68], [0.004, 0.004], M, 3); } mb.pop();
  mb.push().T(-0.75, 0.2, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.2, 0.02, 0.02, 18, 4, Bk); mb.pop();
  limb(mb, [0.3, 0.72, 0], [0.22, 1.5, 0], [0.025, 0.025], Bk, 4); limb(mb, [0.22, 1.5, 0], [-0.35, 1.2, 0], [0.025, 0.02], Bk, 4); limb(mb, [-0.35, 1.2, 0], [-0.75, 0.2, 0], [0.02, 0.02], Bk, 4);
  mb.rbox(0.0, 1.48, -0.08, 0.2, 1.54, 0.08, 0.02, C('#6b4428', 0), 1); limb(mb, [0.25, 1.5, -0.3], [0.25, 1.5, 0.3], [0.015, 0.015], M, 3);
  VK.sh(mb, -0.2, 0, 0.9, 0.2, 0.32);
}
function v6Boiler(mb) {
  const Cu = C('#b87333', -0.88), Br = C('#c9a34a', -0.88), Ir = C('#2b2d31', -0.6);
  mb.cyl(0, 0, 0, 0.42, 0.14, 0.42, 18, Ir, Ir); mb.cyl(0, 0.14, 0, 0.36, 1.3, 0.36, 18, Cu, Cu, ''); mb.sphereS(0, 1.3, 0, 0.36, 0.24, 0.36, Cu, 18, 6);
  for (const y of [0.4, 0.8, 1.2]) mb.torusN(0, y, 0, 0.365, 0.018, 0.018, 24, 3, Br);
  mb.push().T(0, 0.95, 0.37, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.12, 0.04, 0.12, 16, Br, Br); mb.cyl(0, 0.04, 0, 0.1, 0.045, 0.1, 16, C('#f4ecd8', 0), C('#f4ecd8', 0)); mb.pop();
  limb(mb, [0, 1.5, 0], [0, 1.9, 0], [0.04, 0.04], Br, 4); limb(mb, [0, 1.9, 0], [0.45, 1.9, 0], [0.04, 0.04], Br, 4); limb(mb, [0.45, 1.9, 0], [0.45, 0.6, 0], [0.04, 0.04], Br, 4);
  mb.box(-0.12, 0.2, 0.34, 0.12, 0.4, 0.4, Ir); mb.box(-0.09, 0.23, 0.4, 0.09, 0.37, 0.405, C('#ff8a1f', 1));
  VK.halo(mb.p(0, 0.3, 0.5), 0.35, '#ff9a3c', 0.3, 1); VK.sh(mb, 0, 0, 0.5, 0.5, 0.4);
}
function v6Ruler(mb, h = 3.0) {
  mb.box(-0.12, 0, 0, 0.12, h, 0.03, C('#e9c46a', -0.2));
  for (let i = 0; i <= h * 10; i++) { const y = i * 0.1, L = i % 10 === 0 ? 0.16 : i % 5 === 0 ? 0.1 : 0.05; mb.box(-0.12, y - 0.006, 0.03, -0.12 + L, y + 0.006, 0.035, C('#2b2b2e', 0)); }
  for (let i = 1; i <= h; i++) mb.box(0.02, i - 0.04, 0.03, 0.08, i + 0.04, 0.036, C('#c8102e', 0));
}
function v6Flasks(mb, seed = 1) {
  const Gl = C('#e6f4f8', -0.9); seed = Math.abs(Math.round(seed));
  for (let i = 0; i < 5; i++) { const x = -0.5 + i * 0.25, c = ['#5bff9a', '#ff4fd8', '#4cc9f0', '#ffe14f', '#ff8a3d'][(i + seed) % 5], t = (i + seed) % 3;
    if (t === 0) { mb.lathe(x, 0, 0, [[0.08, 0], [0.09, 0.04], [0.03, 0.14], [0.025, 0.24]], 12, Gl, 'b'); mb.lathe(x, 0, 0, [[0.075, 0], [0.06, 0.06], [0, 0.07]], 12, C(c, 0.8)); }
    else if (t === 1) { mb.sphereS(x, 0.09, 0, 0.08, 0.08, 0.08, Gl, 10, 6); mb.sphereS(x, 0.07, 0, 0.07, 0.05, 0.07, C(c, 0.8), 10, 5); mb.cyl(x, 0.15, 0, 0.022, 0.28, 0.022, 8, Gl, Gl, ''); }
    else { mb.cyl(x, 0, 0, 0.035, 0.26, 0.035, 10, Gl, Gl, 'b'); mb.cyl(x, 0.0, 0, 0.032, 0.16, 0.032, 10, C(c, 0.8), C(c, 0.8)); }
    VK.halo(mb.p(x, 0.08, 0), 0.16, c, 0.25); }
}
function v6TeslaCoil(mb) {
  const Cu = C('#b87333', -0.88);
  mb.box(-0.15, 0, -0.15, 0.15, 0.08, 0.15, C('#2b2d31', -0.5)); mb.cyl(0, 0.08, 0, 0.05, 0.6, 0.05, 12, Cu, Cu, ''); for (let i = 0; i < 14; i++) mb.torusN(0, 0.12 + i * 0.034, 0, 0.055, 0.006, 0.006, 12, 3, Cu);
  mb.torusN(0, 0.66, 0, 0.12, 0.04, 0.04, 18, 6, C('#c9ced6', -0.9));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.3; limb(mb, [Math.cos(a) * 0.14, 0.66, Math.sin(a) * 0.14], [Math.cos(a) * 0.3, 0.74 + hs(k, 2) * 0.1, Math.sin(a) * 0.3], [0.006, 0.003], C('#b8f0ff', 1), 3); }
  VK.halo(mb.p(0, 0.68, 0), 0.4, '#9fe8ff', 0.45, 1);
}
function v6Apothecary(mb, w = 1.6, h = 1.2) {
  const W = C('#5a3018', -0.35), Wd = C('#6b3a1e', -0.35), Br = C('#c9a34a', -0.88);
  mb.box(-w / 2, 0, -0.24, w / 2, h, 0.24, W);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const x0 = -w / 2 + 0.04 + c * ((w - 0.08) / 6), y0 = 0.06 + r * ((h - 0.1) / 6), x1 = x0 + (w - 0.08) / 6 - 0.02, y1 = y0 + (h - 0.1) / 6 - 0.02; mb.box(x0, y0, 0.24, x1, y1, 0.26, Wd); mb.sphereS((x0 + x1) / 2, (y0 + y1) / 2 - 0.02, 0.27, 0.012, 0.012, 0.012, Br, 5, 3); mb.box((x0 + x1) / 2 - 0.03, y1 - 0.05, 0.26, (x0 + x1) / 2 + 0.03, y1 - 0.025, 0.262, C('#f4ecd8', 0)); }
  mb.box(-w / 2 - 0.03, h, -0.27, w / 2 + 0.03, h + 0.05, 0.27, Wd);
}
function v6Airship(mb) {
  mb.sphereS(0, 0, 0, 0.9, 0.32, 0.32, C('#c9a46a', -0.1), 18, 10, (ux, uy, uz) => C(Math.floor((Math.atan2(uz, uy) + 3.2) * 1.3) % 2 ? '#c9a46a' : '#b8913f', -0.1));
  for (const s of [-1, 1]) mb.triN([-0.7, 0, s * 0.05], [-1.05, 0.05, s * 0.45], [-1.0, 0, s * 0.05], [0, 1, 0], [0, 1, 0], [0, 1, 0], C('#8a5a34', 0));
  mb.triN([-0.7, 0.05, 0], [-1.05, 0.45, 0], [-1.0, 0.05, 0], [0, 0, 1], [0, 0, 1], [0, 0, 1], C('#8a5a34', 0));
  mb.rbox(-0.25, -0.5, -0.1, 0.25, -0.36, 0.1, 0.03, C('#6b4428', -0.2), 2); for (const x of [-0.18, 0.18]) limb(mb, [x, -0.36, 0], [x * 1.5, -0.25, 0], [0.006, 0.006], C('#3a2a1c', 0), 3);
  mb.push().T(-0.3, -0.43, 0.0, 0, 0, Math.PI / 2); mb.cyl(0, -0.02, 0, 0.1, 0.02, 0.1, 10, C('#c9ced6', -0.8), C('#c9ced6', -0.8)); mb.pop();
}

function v6Automaton(mb) {
  const Br = C('#c9a34a', -0.9), Cu = C('#b87333', -0.88), K = C('#1d1d20', -0.4);
  mb.cyl(0, 0, 0, 0.3, 0.08, 0.3, 16, Cu, Cu); limb(mb, [0, 0.08, 0], [0, 0.5, 0], [0.08, 0.1], Br, 6);
  mb.rbox(-0.24, 0.5, -0.16, 0.24, 0.95, 0.16, 0.06, Br, 2); mb.push().T(0, 0.75, 0.16, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.1, 0.02, 0.1, 14, C('#f4ecd8', 0), C('#f4ecd8', 0)); mb.pop(); vGear(mb, 0.0001, 1, Br);
  for (const s of [-1, 1]) { limb(mb, [s * 0.26, 0.88, 0], [s * 0.36, 0.62, 0.08], [0.035, 0.03], Cu, 5); limb(mb, [s * 0.36, 0.62, 0.08], [s * 0.32, 0.42, 0.2], [0.03, 0.025], Cu, 5); mb.sphereS(s * 0.32, 0.4, 0.22, 0.045, 0.045, 0.045, Br, 8, 5); }
  mb.cyl(0, 0.95, 0, 0.05, 1.02, 0.05, 8, Cu, Cu); mb.sphereS(0, 1.14, 0, 0.15, 0.13, 0.14, Br, 14, 9);
  for (const s of [-1, 1]) { mb.sphereS(s * 0.06, 1.16, 0.12, 0.035, 0.035, 0.02, C('#7cf9ff', 1), 8, 5); mb.cyl(s * 0.15, 1.14, 0, 0.03, 1.14, 0.03, 8, Cu, Cu); }
  limb(mb, [0, 1.26, 0], [0, 1.4, 0], [0.008, 0.008], K, 3); mb.sphereS(0, 1.42, 0, 0.025, 0.025, 0.025, C('#ff3b30', 1), 6, 4);
  VK.halo(mb.p(0, 1.16, 0.2), 0.3, '#7cf9ff', 0.3); VK.sh(mb, 0, 0, 0.35, 0.35, 0.4);
}
function v6Drafting(mb) {
  const Wd = C('#6b4428', -0.25), M = C('#2b2d31', -0.7);
  for (const [x, z] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) mb.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.82, z + 0.03, Wd);
  mb.push().T(0, 0.86, 0, 0, -0.35); mb.box(-0.62, 0, -0.4, 0.62, 0.04, 0.4, Wd); mb.box(-0.55, 0.04, -0.34, 0.55, 0.045, 0.34, C('#1f4e8c', 0.15));
  const L = C('#cfe6ff', 0.5); for (const [a, b, c2, d] of [[-0.45, -0.25, 0.4, -0.23], [-0.45, -0.25, -0.43, 0.25], [-0.45, 0.23, 0.4, 0.25], [0.38, -0.25, 0.4, 0.25], [-0.2, -0.1, 0.2, -0.08], [-0.05, -0.1, -0.03, 0.15]]) mb.box(a, 0.046, b, c2, 0.048, d, L); mb.torusN(0.18, 0.047, 0.08, 0.1, 0.006, 0.002, 18, 3, L);
  mb.box(-0.6, 0.045, 0.3, 0.6, 0.06, 0.34, C('#c9a34a', -0.85)); mb.pop();
  limb(mb, [0.5, 1.2, -0.3], [0.62, 1.6, -0.3], [0.012, 0.012], M, 3); mb.push().T(0.62, 1.6, -0.3, 0, 0.9); mb.lathe(0, 0, 0, [[0.12, 0], [0.04, 0.12]], 12, C('#2f4a3a', -0.5), ''); mb.pop(); VK.halo(mb.p(0.5, 1.45, -0.1), 0.4, '#ffe0a8', 0.25);
  VK.sh(mb, 0, 0, 0.7, 0.45, 0.38);
}
function v6Balance(mb) {
  const Br = C('#c9a34a', -0.9);
  mb.cyl(0, 0, 0, 0.12, 0.03, 0.12, 14, Br, Br); limb(mb, [0, 0.03, 0], [0, 0.42, 0], [0.012, 0.012], Br, 3); mb.push().T(0, 0.42, 0, 0, 0, 0.12); mb.box(-0.26, -0.01, -0.01, 0.26, 0.01, 0.01, Br); for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; limb(mb, [s * 0.25, 0, 0], [s * 0.25 + Math.cos(a) * 0.08, -0.2, Math.sin(a) * 0.08], [0.003, 0.003], Br, 2); } mb.push().T(s * 0.25, -0.21, 0, 0, 0, -0.12); mb.lathe(0, 0, 0, [[0.0, 0], [0.09, 0.02], [0.1, 0.035]], 12, Br); mb.pop(); } mb.pop();
  mb.push().T(-0.25, 0.2, 0, 0, 0, 0); for (let i = 0; i < 3; i++) mb.cyl(0.0, 0.0 + i * 0.03, 0, 0.03 - i * 0.006, 0.028 + i * 0.03, 0.03 - i * 0.006, 10, C('#9aa3ad', -0.88), C('#9aa3ad', -0.88)); mb.pop();
}
/* ---- Kış şenliği eşyaları ---- */
function v6Snowman(mb, s = 1, scarf = '#e63946') {
  const W = C('#f8fbff', -0.2), K = C('#1b1b1e', -0.4);
  mb.sphereS(0, 0.32 * s, 0, 0.38 * s, 0.34 * s, 0.38 * s, W, 14, 9); mb.sphereS(0, 0.82 * s, 0, 0.28 * s, 0.26 * s, 0.28 * s, W, 12, 8); mb.sphereS(0, 1.2 * s, 0, 0.2 * s, 0.19 * s, 0.2 * s, W, 12, 8);
  mb.torusN(0, 1.03 * s, 0, 0.2 * s, 0.05 * s, 0.05 * s, 16, 5, C(scarf, 0)); mb.box(0.08 * s, 0.75 * s, 0.17 * s, 0.18 * s, 1.0 * s, 0.24 * s, C(scarf, 0));
  mb.push().T(0, 1.2 * s, 0.18 * s, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.035 * s, 0.16 * s, 0.0, 8, C('#ff8a1f', 0), C('#ff8a1f', 0)); mb.pop();
  for (const x of [-0.07, 0.07]) mb.sphereS(x * s, 1.27 * s, 0.17 * s, 0.022 * s, 0.022 * s, 0.015 * s, K, 6, 4);
  for (let i = 0; i < 3; i++) mb.sphereS(0, (0.72 + i * 0.1) * s, 0.26 * s, 0.025 * s, 0.025 * s, 0.015 * s, K, 6, 4);
  mb.cyl(0, 1.34 * s, 0, 0.22 * s, 1.37 * s, 0.22 * s, 16, K, K); mb.cyl(0, 1.37 * s, 0, 0.15 * s, 1.6 * s, 0.15 * s, 16, K, K); mb.cyl(0, 1.38 * s, 0, 0.152 * s, 1.42 * s, 0.152 * s, 16, C(scarf, 0), C(scarf, 0));
  for (const sx of [-1, 1]) limb(mb, [sx * 0.24 * s, 0.85 * s, 0], [sx * 0.58 * s, 1.08 * s, 0.05 * s], [0.018 * s, 0.012 * s], C('#5a3a24', 0), 3);
  VK.sh(mb, 0, 0, 0.45 * s, 0.45 * s, 0.35);
}
function v6Pine(mb, s = 1, deco = false) {
  limb(mb, [0, 0, 0], [0, 0.5 * s, 0], [0.1 * s, 0.08 * s], C('#5a3a24', 0), 6);
  for (let i = 0; i < 4; i++) { const y = 0.4 * s + i * 0.62 * s, r = (1.1 - i * 0.24) * s; mb.lathe(0, y, 0, [[r, 0], [r * 0.78, 0.12 * s], [0.05 * s, 0.95 * s]], 12, C(i % 2 ? '#2f6b4a' : '#2a5f42', 0)); mb.lathe(0, y + 0.02 * s, 0, [[r * 0.98, 0], [r * 0.6, 0.22 * s], [r * 0.2, 0.55 * s]], 12, C('#f4f8fc', -0.2)); }
  if (deco) { for (let i = 0; i < 18; i++) { const t = hs(i, 5), y = (0.55 + t * 2.0) * s, r = (1.0 - t * 0.75) * s * 0.95, a = hs(i, 6) * TAU; mb.sphereS(Math.cos(a) * r, y, Math.sin(a) * r, 0.07 * s, 0.07 * s, 0.07 * s, C(['#e63946', '#ffd166', '#4cc9f0', '#ff8fc7'][i % 4], i % 3 ? -0.85 : 0.8), 8, 5); } const n = [0, 0, 1]; mb.push().T(0, 3.05 * s, 0); for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU + Math.PI / 2, a1 = ((k + 1) / 10) * TAU + Math.PI / 2, r0 = k % 2 ? 0.1 * s : 0.26 * s, r1 = k % 2 ? 0.26 * s : 0.1 * s; mb.triN([0, 0, 0], [Math.cos(a0) * r0, Math.sin(a0) * r0, 0], [Math.cos(a1) * r1, Math.sin(a1) * r1, 0], n, n, n, C('#ffd23f', 1)); } mb.pop(); VK.halo(mb.p(0, 3.05 * s, 0), 0.5 * s, '#ffd23f', 0.35); }
  VK.sh(mb, 0, 0, 1.1 * s, 1.1 * s, 0.32);
}
function v6Sled(mb) {
  const Wd = C('#b0743a', -0.2), R = C('#c8102e', -0.5);
  for (let i = 0; i < 5; i++) mb.box(-0.32, 0.22, -0.6 + i * 0.25, 0.32, 0.25, -0.42 + i * 0.25, Wd);
  for (const s of [-1, 1]) { limb(mb, [s * 0.28, 0.03, -0.65], [s * 0.28, 0.03, 0.55], [0.022, 0.022], R, 4); limb(mb, [s * 0.28, 0.03, 0.55], [s * 0.28, 0.2, 0.75], [0.022, 0.022], R, 4); for (const z of [-0.45, 0.0, 0.45]) limb(mb, [s * 0.28, 0.03, z], [s * 0.28, 0.22, z], [0.016, 0.016], R, 3); }
  mb.box(-0.3, 0.25, -0.5, 0.3, 0.27, 0.4, C('#f4f8fc', -0.2));
  VK.sh(mb, 0, 0, 0.4, 0.7, 0.32);
}
function v6Igloo(mb, r = 1.3) {
  const W = C('#eef6fc', -0.3), L = C('#cfe2f0', -0.3);
  mb.sphereS(0, 0, 0, r, r * 0.9, r, W, 20, 10, (ux, uy, uz) => (Math.abs(Math.sin(Math.atan2(uz, ux) * 9 + (Math.floor(uy * 7) % 2) * 0.35)) < 0.08 || Math.abs(Math.sin(uy * 22)) < 0.12 ? L : W));
  mb.push().T(0, 0, r * 0.85); mb.lathe(0, 0, 0, [[0.5, 0], [0.5, 0.45], [0.0, 0.72]], 14, W, ''); mb.box(-0.32, 0, 0.0, 0.32, 0.6, 0.06, C('#2a3a4a', 0)); mb.pop();
  VK.halo(mb.p(0, 0.35, r + 0.3), 0.4, '#ffcf7a', 0.25); VK.sh(mb, 0, 0, r * 1.05, r * 1.05, 0.3);
}
function v6Cabin(k, seed = 1) {
  const mb = SEC(k); wAt(mb, k, 0, 0);
  const Lg = (i) => C(['#8a5a34', '#7a4e2c', '#94643c'][i % 3], -0.1), H = 3.3;
  for (let i = 0; i < 12; i++) { const y = 0.14 + i * 0.27; mb.push().T(0, y, -0.12, 0, 0, Math.PI / 2); mb.cyl(0, -RW - 0.3, 0, 0.14, RW + 0.3, 0.14, 10, Lg(i + seed), Lg(i + seed), ''); mb.pop(); }
  mb.box(-RW - 0.4, H, -0.4, RW + 0.4, H + 0.14, 0.9, C('#5a3a24', -0.1)); mb.box(-RW - 0.42, H + 0.14, -0.4, RW + 0.42, H + 0.36, 0.95, C('#f6fbff', -0.2));
  for (let u = -RW; u < RW; u += 0.35) { const L = 0.12 + hs(u * 3, seed) * 0.3; mb.cyl(u, H - L, 0.9, 0.0, H, 0.03, 6, C('#dff3ff', -0.92), C('#dff3ff', -0.92), ''); }
  mb.pop();
}
function v6Stall(mb, w = 2.2, wares = 'cocoa') {
  const Wd = C('#9a6a3f', -0.15), Wdk = C('#7a4e2c', -0.15), Sn = C('#f6fbff', -0.2);
  mb.box(-w / 2, 0, -0.5, w / 2, 1.0, 0.5, Wdk); mb.box(-w / 2 - 0.05, 1.0, -0.55, w / 2 + 0.05, 1.06, 0.6, Wd);
  for (const s of [-1, 1]) mb.box(s * w / 2 - 0.06, 1.0, -0.5, s * w / 2 + 0.06, 2.2, -0.38, Wd); mb.box(-w / 2, 1.06, -0.5, w / 2, 2.2, -0.46, C('#5a3a24', -0.1));
  const nL = vnorm([0, 1, 0.8]), nR = vnorm([0, 1, -0.8]); mb.quadN([-w / 2 - 0.2, 2.2, 0.8], [w / 2 + 0.2, 2.2, 0.8], [w / 2 + 0.2, 2.75, -0.1], [-w / 2 - 0.2, 2.75, -0.1], nL, nL, nL, nL, Wd); mb.quadN([-w / 2 - 0.2, 2.2, -1.0], [w / 2 + 0.2, 2.2, -1.0], [w / 2 + 0.2, 2.75, -0.1], [-w / 2 - 0.2, 2.75, -0.1], nR, nR, nR, nR, Wdk);
  mb.quadN([-w / 2 - 0.22, 2.25, 0.82], [w / 2 + 0.22, 2.25, 0.82], [w / 2 + 0.22, 2.8, -0.08], [-w / 2 - 0.22, 2.8, -0.08], nL, nL, nL, nL, Sn);
  P.stringLights(mb, [[-w / 2 - 0.1, 2.15, 0.78], [w / 2 + 0.1, 2.15, 0.78]], ['#ffd38a', '#ffe9b0', '#ff9e5e'], 8, 0.12, 0.035);
  if (wares === 'cocoa') { for (let i = 0; i < 6; i++) { const x = -w / 2 + 0.3 + i * ((w - 0.6) / 5); mb.lathe(x, 1.06, 0.2, [[0.045, 0], [0.05, 0.1]], 10, C(i % 2 ? '#e63946' : '#f4f1ea', -0.2), 'b'); mb.cyl(x, 1.15, 0.2, 0.045, 1.152, 0.045, 10, C('#6b3a1e', 0), C('#6b3a1e', 0)); mb.sphereS(x, 1.17, 0.2, 0.035, 0.02, 0.035, C('#ffffff', 0), 6, 3); } mb.cyl(-0.3, 1.06, -0.25, 0.16, 1.42, 0.16, 14, C('#c9ced6', -0.88), C('#c9ced6', -0.88)); }
  else { for (let i = 0; i < 8; i++) { const x = -w / 2 + 0.25 + (i % 4) * ((w - 0.5) / 3), z = 0.05 + Math.floor(i / 4) * 0.25; mb.push().T(x, 1.07, z, i); const n = [0, 1, 0]; mb.box(-0.07, 0, -0.03, 0.07, 0.02, 0.03, C('#b5651d', 0)); mb.sphereS(0, 0.035, 0, 0.05, 0.03, 0.05, C('#b5651d', 0), 8, 4); mb.box(-0.04, 0.02, -0.005, 0.04, 0.025, 0.005, C('#ffffff', 0)); mb.pop(); } }
  VK.halo(mb.p(0, 1.6, 0.6), 0.7, '#ffcf8a', 0.25); VK.pool(mb.p(0, 0, 1.1), 1.2, '#ffcf8a', 0.1); VK.sh(mb, 0, 0, w * 0.6, 0.6, 0.36);
}
function v6IceStar(mb) {
  const I = C('#bfe6f8', -0.92);
  mb.box(-0.3, 0, -0.3, 0.3, 0.5, 0.3, C('#d6eef9', -0.92)); const n = [0, 0, 1];
  mb.push().T(0, 1.2, 0); for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU + Math.PI / 2, a1 = ((k + 1) / 10) * TAU + Math.PI / 2, r0 = k % 2 ? 0.22 : 0.6, r1 = k % 2 ? 0.6 : 0.22; for (const z of [-0.08, 0.08]) mb.triN([0, 0, z], [Math.cos(a0) * r0, Math.sin(a0) * r0, z * 0.3], [Math.cos(a1) * r1, Math.sin(a1) * r1, z * 0.3], [0, 0, Math.sign(z)], [0, 0, Math.sign(z)], [0, 0, Math.sign(z)], I); } mb.pop();
  limb(mb, [0, 0.5, 0], [0, 0.65, 0], [0.08, 0.06], I, 5); VK.halo(mb.p(0, 1.2, 0.1), 0.6, '#cfefff', 0.2); VK.sh(mb, 0, 0, 0.4, 0.4, 0.3);
}
function v6Skis(mb) {
  const Wd = C('#8a5a34', -0.2); mb.box(-0.9, 0.9, -0.06, 0.9, 0.98, 0.06, Wd); for (const x of [-0.85, 0.85]) mb.box(x - 0.04, 0, -0.06, x + 0.04, 1.0, 0.06, Wd);
  for (let i = 0; i < 4; i++) { const x = -0.6 + i * 0.4, c = ['#e63946', '#3a86ff', '#ffd166', '#06d6a0'][i]; for (const dx of [-0.05, 0.05]) { mb.push().T(x + dx, 0, 0.1, 0, -0.12); mb.box(-0.035, 0.02, -0.01, 0.035, 1.75, 0.01, C(c, -0.3)); mb.pop(); } }
}

/* ---- Eski matbaa eşyaları ---- */
// tahta harf (yerel xy düzleminde, z kalınlık)
const LETTERS = { A: [[0, 0, 0.5, 1], [1, 0, 0.5, 1], [0.22, 0.42, 0.78, 0.42]], E: [[0.1, 0, 0.1, 1], [0.1, 1, 0.9, 1], [0.1, 0.5, 0.75, 0.5], [0.1, 0, 0.9, 0]], H: [[0.1, 0, 0.1, 1], [0.9, 0, 0.9, 1], [0.1, 0.5, 0.9, 0.5]], K: [[0.12, 0, 0.12, 1], [0.12, 0.45, 0.9, 1], [0.35, 0.6, 0.9, 0]], M: [[0.06, 0, 0.06, 1], [0.06, 1, 0.5, 0.45], [0.5, 0.45, 0.94, 1], [0.94, 1, 0.94, 0]], T: [[0.5, 0, 0.5, 1], [0.05, 1, 0.95, 1]], Z: [[0.05, 1, 0.95, 1], [0.95, 1, 0.05, 0], [0.05, 0, 0.95, 0]], L: [[0.12, 0, 0.12, 1], [0.12, 0, 0.9, 0]] };
function v6Letter(mb, ch, h = 0.8, d = 0.16, col = '#e63946') {
  const S = LETTERS[ch], t = h * 0.17, c = C(col, -0.2), w = h * 0.78;
  for (const [x0, y0, x1, y1] of S) { const ax = (x0 - 0.5) * w, ay = y0 * (h - t) + t / 2, bx = (x1 - 0.5) * w, by = y1 * (h - t) + t / 2, L = Math.hypot(bx - ax, by - ay), r = Math.atan2(by - ay, bx - ax); mb.push().T((ax + bx) / 2, (ay + by) / 2, 0, 0, 0, r); mb.box(-L / 2 - t / 2, -t / 2, -d / 2, L / 2 + t / 2, t / 2, d / 2, c); mb.pop(); }
  VK.sh(mb, 0, 0, w * 0.6, d * 1.6, 0.36);
}
function v6TypeCabinet(mb, w = 1.6, h = 2.2) {
  const W = C('#6b4428', -0.3), Wd = C('#7a5232', -0.3), Br = C('#c9a34a', -0.88);
  mb.box(-w / 2, 0, -0.26, w / 2, h, 0.26, W); mb.box(-w / 2 - 0.03, h, -0.29, w / 2 + 0.03, h + 0.06, 0.29, Wd);
  const nr = 10, nc = 2; for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) { const x0 = -w / 2 + 0.05 + c * ((w - 0.1) / nc), y0 = 0.08 + r * ((h - 0.14) / nr), x1 = x0 + (w - 0.1) / nc - 0.03, y1 = y0 + (h - 0.14) / nr - 0.025; mb.box(x0, y0, 0.26, x1, y1, 0.275, Wd); mb.box((x0 + x1) / 2 - 0.06, y1 - 0.06, 0.275, (x0 + x1) / 2 + 0.06, y1 - 0.025, 0.28, Br); mb.box((x0 + x1) / 2 - 0.05, (y0 + y1) / 2 - 0.035, 0.275, (x0 + x1) / 2 + 0.05, (y0 + y1) / 2 - 0.015, 0.285, Br); }
  VK.sh(mb, 0, 0, w * 0.6, 0.4, 0.38);
}
function v6Press(mb) {
  const Ir = C('#2b2d31', -0.65), Ird = C('#1d1f22', -0.6), Br = C('#c9a34a', -0.88), R = C('#8c1c1c', -0.5);
  mb.box(-0.55, 0, -0.45, 0.55, 0.12, 0.45, Ird);
  for (const s of [-1, 1]) { mb.box(s * 0.42 - 0.07, 0.12, -0.3, s * 0.42 + 0.07, 1.25, 0.3, Ir); mb.box(s * 0.42 - 0.08, 0.5, -0.38, s * 0.42 + 0.08, 0.7, 0.38, Ird); }
  mb.box(-0.42, 0.75, -0.25, 0.42, 0.9, 0.25, Ir); mb.box(-0.36, 0.9, -0.2, 0.36, 0.92, 0.2, C('#f4ecd8', 0)); mb.box(-0.42, 1.25, -0.32, 0.42, 1.4, 0.32, Ir);
  mb.push().T(0, 1.55, -0.05, 0, 0.5); mb.cyl(0, 0, 0, 0.32, 0.03, 0.32, 24, Ird, Ird); mb.cyl(0, 0.03, 0, 0.3, 0.035, 0.3, 24, C('#1b1b1e', -0.85), C('#1b1b1e', -0.85)); mb.pop(); limb(mb, [0, 1.4, -0.05], [0, 1.5, -0.05], [0.05, 0.05], Ir, 4);
  mb.push().T(0.62, 0.75, 0, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.55, 0.05, 0.035, 32, 5, R); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; limb(mb, [0, 0, 0], [Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52], [0.022, 0.018], R, 4); } mb.cyl(0, -0.08, 0, 0.09, 0.08, 0.09, 12, Br, Br); mb.pop();
  limb(mb, [-0.5, 1.0, 0.1], [-0.85, 1.45, 0.35], [0.025, 0.02], Br, 4); mb.sphereS(-0.85, 1.45, 0.35, 0.05, 0.05, 0.05, C('#1b1b1e', -0.4), 8, 5);
  for (let i = 0; i < 2; i++) { mb.push().T(-0.15 + i * 0.3, 1.0, 0.33, 0, 0, Math.PI / 2); mb.cyl(0, -0.14, 0, 0.04, 0.14, 0.04, 10, C('#1b1b1e', -0.7), C('#1b1b1e', -0.7)); mb.pop(); }
  VK.sh(mb, 0, 0, 0.75, 0.6, 0.42);
}
function v6Typewriter(mb) {
  const Bk = C('#1d1f22', -0.7), M = C('#c9ced6', -0.88);
  mb.rbox(-0.22, 0, -0.18, 0.22, 0.1, 0.18, 0.03, Bk, 2); mb.push().T(0, 0.1, 0.04, 0, 0.45); mb.box(-0.2, 0, -0.12, 0.2, 0.04, 0.12, Bk); for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) mb.cyl(-0.17 + c * 0.042 + r * 0.01, 0.04, -0.08 + r * 0.06, 0.014, 0.055, 0.014, 8, C('#f4ecd8', -0.2), C('#f4ecd8', -0.2)); mb.pop();
  mb.push().T(0, 0.2, -0.12, 0, 0, Math.PI / 2); mb.cyl(0, -0.26, 0, 0.045, 0.26, 0.045, 14, Bk, Bk); mb.pop(); mb.push().T(0, 0.24, -0.15, 0, -0.25); mb.box(-0.15, 0, -0.002, 0.15, 0.26, 0.002, C('#fbf6ec', 0)); for (let i = 0; i < 4; i++) mb.box(-0.12, 0.05 + i * 0.045, 0.002, -0.12 + 0.08 + hs(i, 3) * 0.14, 0.06 + i * 0.045, 0.004, C('#3a3d44', 0)); mb.pop();
  limb(mb, [0.27, 0.22, -0.12], [0.36, 0.28, -0.12], [0.012, 0.012], M, 3);
}
function v6CaseTray(mb, w = 0.9, d = 0.5, seed = 1) {
  const W = C('#a77a4f', -0.25), Wd = C('#8a6238', -0.25), Mt = C('#9aa3ad', -0.85);
  mb.box(-w / 2, 0, -d / 2, w / 2, 0.06, d / 2, W);
  for (let i = 0; i <= 8; i++) mb.box(-w / 2 + (i * w) / 8 - 0.006, 0.06, -d / 2, -w / 2 + (i * w) / 8 + 0.006, 0.09, d / 2, Wd);
  for (let j = 0; j <= 4; j++) mb.box(-w / 2, 0.06, -d / 2 + (j * d) / 4 - 0.006, w / 2, 0.09, -d / 2 + (j * d) / 4 + 0.006, Wd);
  for (let k = 0; k < 40; k++) { const x = -w / 2 + 0.04 + hs(k, seed) * (w - 0.08), z = -d / 2 + 0.04 + hs(k, seed + 1) * (d - 0.08); mb.box(x - 0.012, 0.06, z - 0.012, x + 0.012, 0.085, z + 0.012, Mt); }
}
function v6PaperRoll(mb, r = 0.32, len = 1.3) { mb.push().T(0, r, 0, 0, 0, Math.PI / 2); mb.cyl(0, -len / 2, 0, r, len / 2, r, 20, C('#f4ecd8', -0.2), C('#ece2cc', -0.2)); mb.cyl(0, -len / 2 - 0.01, 0, 0.07, len / 2 + 0.01, 0.07, 10, C('#8a6238', 0), C('#8a6238', 0)); mb.pop(); VK.sh(mb, 0, 0, len * 0.55, r * 1.1, 0.36); }
function v6DryLine(mb, w, seed = 1) {
  limb(mb, [-w / 2, 0, 0.05], [w / 2, 0, 0.05], [0.005, 0.005], C('#8a8f96', -0.6), 4);
  for (let i = 0; i < Math.floor(w / 0.55); i++) { const x = -w / 2 + 0.3 + i * 0.55; mb.box(x - 0.2, -0.62, 0.05, x + 0.2, -0.02, 0.054, C('#f6efdf', 0)); for (let r = 0; r < 5; r++) mb.box(x - 0.16, -0.12 - r * 0.1, 0.055, x - 0.16 + 0.1 + hs(i * 5 + r, seed) * 0.2, -0.09 - r * 0.1, 0.057, C(r === 0 ? '#c8102e' : '#2b2b2e', 0)); mb.box(x - 0.02, -0.05, 0.05, x + 0.02, 0.03, 0.07, C('#c9a46a', 0)); }
}

/* ====================== mekânlar ====================== */
Object.assign(VENUES, {
  /* ---- Uyum Testi: gün batımında gül bahçesi terası ---- */
  uyt: {
    room: 1, raw: 1, wallH: 6.0, secShadow: 1,
    table: 'iron', tableO: { iron: '#f6f3ec', mosaic: 1 }, chair: 'iron', chairO: { iron: '#f6f3ec' },
    rug: 'mosaic', rugO: { a: '#b98466', b: '#eadfcc', c: '#6f8f62', d: '#a8705a' },
    L: VL2.sunset, sky: ['#6f7fb8', '#f2b896', '#f4dccb'], sun: [0.55, 0.5, 0.4], shR: 8.6, parts: 'petals',
    post: { bloom: 0.24, th: 0.9, sat: 1.08, con: 0.16, vig: 0.34, tint: [1.0, 0.98, 0.99] },
    det: 0.14, detS: 0.5,
    logos: [[0, 4.9, 2.3, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#6f9a4f', '#5f8a42', 0.3);
      vHexTiles(mb, 0.36, ['#b98a6a', '#b2825f', '#c09474', '#a87b5c', '#b88c6e'], '#ddd1bd', { skip: 2.0, g: 0.022, colFn: (x, z) => { const r = Math.hypot(x, z), a = Math.atan2(z, x); if (r > 4.25 && r < 4.75) return '#e6dac4'; if (r > 4.75 && r < 5.35) return Math.cos(a * 8) > 0.55 ? '#7f9a72' : '#c9a688'; if (r > 5.35 && r < 5.8) return '#e6dac4'; return null; } });
      for (const [x0, z0, x1, z1] of [[-RW, -RW, RW, -RW + 0.35], [-RW, RW - 0.35, RW, RW], [-RW, -RW + 0.35, -RW + 0.35, RW - 0.35], [RW - 0.35, -RW + 0.35, RW, RW - 0.35]]) VK.quad(mb, x0, z0, x1, z1, C('#d6c9b2', -0.2), 0.006);
      // 0: limonluk cephesi — kemerli camlar, sarmaşık güller, tabela, fenerler, limon ağaçları
      const H0 = [{ u0: -4.1, u1: -2.7, y0: 0.0, y1: 2.6 }, { u0: 2.7, u1: 4.1, y0: 0.0, y1: 2.6 }];
      vWall(0, { wall: '#f2e6d0', H: 4.4, base: '#d9c7a8', crown: '#e3d2b4', pat: null }, H0);
      for (const h of H0) vWindow(0, h, { frame: '#f4f1ea', view: 'sky', sun: false, nx: 2, ny: 3, sill: false });
      VK.inSec(0, (s) => { for (const u of [-3.4, 3.4]) { wAt(s, 0, u, 0, 2.6); const n = [0, 0, 1]; for (let k = 0; k < 10; k++) { const a0 = (k / 10) * Math.PI, a1 = ((k + 1) / 10) * Math.PI; s.triN([0, 0, 0.02], [Math.cos(a0) * 0.7, Math.sin(a0) * 0.5, 0.02], [Math.cos(a1) * 0.7, Math.sin(a1) * 0.5, 0.02], n, n, n, C('#ffe2b0', 0.85)); s.box(Math.cos(a0) * 0.74 - 0.05, Math.sin(a0) * 0.54 - 0.05, 0.0, Math.cos(a0) * 0.74 + 0.05, Math.sin(a0) * 0.54 + 0.05, 0.06, C('#f4f1ea', -0.2)); } s.pop(); VK.wglow(0, u, 0.06, 1.5, 1.0, '#ffd59e', 0.14, 1.4); }
        for (const u of [-6.2, -1.95, 1.95, 6.2]) { wAt(s, 0, u, 0.06); for (let i = 0; i < 14; i++) { const x = (hs(i, u) - 0.5) * 0.9, y = 0.3 + i * 0.24; s.sphereS(x, y, 0.05, 0.22, 0.18, 0.08, C(i % 2 ? '#3f7d3a' : '#4f8f42', 0), 8, 5); if (i % 2) s.sphereS(x + 0.1, y + 0.05, 0.12, 0.06, 0.055, 0.05, C(i % 4 === 1 ? '#e63946' : '#ff8fab', 0), 6, 4); } s.pop(); }
        for (const u of [-1.0, 1.0]) { wAt(s, 0, u * 6.8, 0, 2.4); s.box(-0.04, -0.1, 0, 0.04, 0.1, 0.12, C('#2b2b2b', -0.5)); s.push().T(0, -0.05, 0.16); P.lantern(s, '#2b2b2b', '#ffcf7a', { r: 0.6, a: 0.3, pool: 0 }); s.pop(); s.pop(); }
        P.stringLights(s, [[-RW + 0.3, 4.1, -RW + 0.3], [-2.4, 3.8, -RW + 0.3], [2.4, 3.8, -RW + 0.3], [RW - 0.3, 4.1, -RW + 0.3]], ['#ffd38a', '#ffe9b0', '#ffb5c5'], 8, 0.3, 0.04, 0);
      });
      vSign('frame', '#f4f1ea', '#fff8ec', { lamps: false });
      for (const x of [-2.6, 2.6]) VK.tall(x, -6.7, (m) => v6LemonTree(m));
      // 1 ve 3: taş korkuluk, ötesinde gün batımı tepeleri
      for (const k of [1, 3]) { v6Balustrade(k, -RW + 0.4, RW - 0.4); v6Hills(k, k * 3 + 1, k === 3); }
      // 2: ön — şimşir çit ve güllü kemer
      VK.inSec(2, (s) => { wAt(s, 2, 0, 0.5); v6Arbor(s, 1.9, 2.4); s.pop(); for (const [a, b] of [[-RW + 0.2, -1.3], [1.3, RW - 0.2]]) { wAt(s, 2, (a + b) / 2, 0.45); s.rbox(-(b - a) / 2, 0, -0.35, (b - a) / 2, 1.05, 0.35, 0.18, C('#3f7d3a', -0.05), 2); for (let i = 0; i < 12; i++) s.sphereS(-(b - a) / 2 + 0.3 + hs(i, a) * (b - a - 0.6), 1.0, (hs(i, b) - 0.5) * 0.5, 0.18, 0.12, 0.18, C('#4f8f42', -0.05), 8, 4); s.pop(); } });
      // salon: çeşme, bank, bisiklet, piknik sepeti, fenerler, gül çalıları, lavantalar, selviler
      VK.tall(-2.9, -4.4, (m) => v6Fountain(m));
      mb.push().T(2.5, 0, -4.9, -0.3); v6Bench(mb); mb.pop();
      VK.tall(-2.6, 4.5, (m) => v6Bicycle(m), 0.4);
      mb.push().T(2.3, 0, 4.1, 0.5); VK.quad(mb, -0.7, -0.55, 0.7, 0.55, C('#e8577a', 0), 0.012); for (let i = 0; i < 6; i++) VK.quad(mb, -0.7 + i * 0.25, -0.55, -0.62 + i * 0.25, 0.55, C('#fff7f9', 0), 0.013); mb.lathe(0.2, 0.012, -0.1, [[0.22, 0], [0.24, 0.22]], 14, C('#c9a46a', 0), 'b'); limb(mb, [-0.02, 0.24, -0.1], [0.2, 0.42, -0.1], [0.012, 0.012], C('#8a6238', 0), 3); limb(mb, [0.2, 0.42, -0.1], [0.42, 0.24, -0.1], [0.012, 0.012], C('#8a6238', 0), 3); mb.sphereS(-0.35, 0.08, 0.2, 0.1, 0.08, 0.1, C('#f4f1ea', -0.3), 10, 6); mb.pop();
      for (const [x, z] of [[-1.6, -3.3], [1.7, 3.1], [3.5, -2.3], [-3.5, 2.0], [0.4, -3.6]]) { mb.push().T(x, 0, z); v6Lantern(mb, 1); mb.pop(); }
      for (const [x, z, r, sd] of [[-4.9, -2.2, 0.6, 1], [4.7, 1.7, 0.55, 2], [-4.6, 5.8, 0.6, 3], [4.9, -5.7, 0.55, 4], [-5.6, 0.9, 0.5, 5], [5.5, 4.4, 0.6, 6]]) { mb.push().T(x, 0, z); v6RoseBush(mb, r, undefined, sd); mb.pop(); }
      for (const [x, z] of [[3.7, 5.7], [-3.9, -6.3], [0.9, 6.2]]) { mb.push().T(x, 0, z); P.flowers(mb, 1.0, '#c8734a', ['#9b7ede', '#b39ddb', '#8e7cc3'], { pk: 'round', r: 0.24, h: 0.32 }); mb.pop(); }
      for (const [x, z] of [[-6.9, -6.9], [6.9, -6.9], [6.9, 6.9], [-6.9, 6.9]]) VK.tall(x, z, (m) => { limb(m, [0, 0, 0], [0, 0.4, 0], [0.08, 0.07], C('#5a3a24', 0), 5); m.sphereS(0, 2.0, 0, 0.45, 1.8, 0.45, C('#2f5a3a', -0.05), 12, 9); });
    },
  },
  /* ---- Kör Labirent: antik labirent harabesi ---- */
  krl: {
    room: 1, raw: 1, wallH: 6.0, secShadow: 1,
    table: 'stone', tableO: { stone: '#d8c3a0' }, chair: 'pouf',
    rug: 'laby', rugO: {},
    L: VL2.antique, sky: ['#5f86c4', '#f7c99a', '#efd2b0'], sun: [0.58, 0.62, 0.42], shR: 9.0, parts: 'dust',
    post: { bloom: 0.3, th: 0.88, sat: 1.1, con: 0.15, vig: 0.32, tint: [1.03, 1.0, 0.95] },
    det: 0.2, detS: 0.6,
    logos: [[1, 2.4, 2.4, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#b9a47a', '#a9946a', 0.3);
      vStoneFloor(mb, 1.0, ['#cdb994', '#c3ae89', '#d4c19c', '#bba783', '#c9b28c'], '#9a8661', { e: -0.18, moss: 1, tufts: 22, skip: 3.9 });
      for (const [x0, z0, len, ax] of [[-6.3, -6.75, 12.6, 'x'], [-6.3, 6.75, 12.6, 'x'], [-6.75, -6.3, 12.6, 'z'], [6.75, -6.3, 12.6, 'z']]) v6Meander(mb, x0, z0, len, ax, 0.42);
      for (let i = 0; i < 26; i++) { const x = (hs(i, 61) - 0.5) * 13, z = (hs(i, 62) - 0.5) * 13; if (Math.hypot(x, z) < 4.0) continue; mb.sphereS(x, 0.03, z, 0.06 + hs(i, 63) * 0.1, 0.05, 0.05 + hs(i, 64) * 0.08, C(i % 2 ? '#cdb994' : '#bfa882', -0.2), 6, 3); }
      { let px = -2.0, pz = 6.9; for (let i = 0; i < 16; i++) { const nx = -2.0 + Math.sin(i * 0.55) * 1.1 + i * 0.05, nz = 6.9 - i * 0.18; v4Seg(mb, px, pz, nx, nz, 0.012, C('#c8102e', 0), 0.012); px = nx; pz = nz; } mb.sphereS(-2.15, 0.1, 7.05, 0.1, 0.1, 0.1, C('#c8102e', -0.1), 10, 6); }
      // 0: büyük taş kapı (sütunlar, arşitrav, alınlık), yıkık duvarlar
      VK.inSec(0, (s) => { for (const x of [-2.45, 2.45]) { s.push().T(x, 0, -7.35); v6Column(s, 3.6, 0.32); s.pop(); } s.box(-2.8, 3.6, -7.7, 2.8, 4.0, -7.0, C('#e0d5bd', -0.3)); for (let i = 0; i < 12; i++) s.box(-2.7 + i * 0.46, 3.85, -7.0, -2.55 + i * 0.46, 3.98, -6.98, C('#cfc2a6', -0.3)); { const n = vnorm([0, 0.3, 1]); s.triN([-2.9, 4.0, -7.0], [2.9, 4.0, -7.0], [0, 4.9, -7.2], n, n, n, C('#e6dcc6', -0.3)); s.triN([-2.9, 4.0, -7.7], [2.9, 4.0, -7.7], [0, 4.9, -7.5], n, n, n, C('#d2c6ab', -0.3)); } });
      for (const k of [0, 1, 2, 3]) VK.inSec(k, (s) => { wAt(s, k, 0, 0.3); for (let u = -RW + 0.3, i = 0; u < RW - 0.2; u += 0.6, i++) { if (k === 0 && Math.abs(u) < 3.1) continue; if (k === 2 && Math.abs(u) < 1.1) continue; const hTop = 1.0 + hs(i, k) * 1.8 + (k === 2 ? -0.6 : 0); for (let y = 0, j = 0; y < hTop; y += 0.3, j++) { const off = (j % 2) * 0.3; s.box(u - 0.29 + off * 0.0, y + 0.01, -0.28, u + 0.29, Math.min(y + 0.3, hTop) - 0.01, 0.28, C(['#d8cbb0', '#cfc1a3', '#e0d4bb'][(i + j) % 3], -0.3)); } if (hs(i, k + 9) > 0.6) s.sphereS(u, hTop + 0.05, 0.1, 0.32, 0.18, 0.25, C('#5f7d45', 0), 8, 5); } s.pop(); });
      vSign('frame', '#a8946f', '#fbf3df', { lamps: false });
      // 1 ve 3: sütun sıraları (bazıları kırık), devrik sütun parçaları
      for (const k of [1, 3]) VK.inSec(k, (s) => { [-5.0, -1.7, 1.7, 5.0].forEach((u, i) => { wAt(s, k, u, 1.3); v6Column(s, 4.2, 0.3, (i + k) % 3 === 0, i + k * 4); s.pop(); }); });
      for (const [x, z, ry] of [[5.4, 3.4, 0.4], [-5.5, -2.8, -0.6], [-5.0, 3.6, 1.2]]) { mb.push().T(x, 0, z, ry); v6Drum(mb, 0.28, 0.55); mb.pop(); }
      // salon: mangallar, zeytin ağaçları, büst, amforalar, güneş saati
      for (const [x, z] of [[-4.4, -4.8], [4.6, -4.6], [4.4, 4.9], [-4.6, 4.6]]) VK.tall(x, z, (m) => v6Brazier(m));
      for (const [x, z] of [[-6.6, -6.6], [6.6, 6.6], [6.6, -6.6], [-6.6, 6.6]]) VK.tall(x, z, (m) => v6Olive(m), hs(x, z) * 3);
      for (const [x, z, h] of [[-3.7, -7.0, 3.4], [3.7, -7.0, 3.1], [-7.0, -3.4, 2.9], [7.0, -3.0, 3.3]]) VK.tall(x, z, (m) => v8Cypress(m, h));
      VK.tall(5.9, 0.6, (m) => v6Bust(m), -Math.PI / 2);
      for (const [x, z, h, c] of [[-5.8, 0.2, 0.9, '#b8643c'], [-6.2, 0.9, 0.7, '#a85a34'], [-5.6, 1.4, 0.8, '#c06b40'], [2.2, -6.2, 0.85, '#b8643c'], [2.8, -6.5, 0.65, '#a85a34']]) { mb.push().T(x, 0, z, hs(x, z) * 5, 0, 0, h / 0.9); v6Amphora(mb, 0.9, c); mb.pop(); }
      mb.push().T(-1.8, 0, -5.6); mb.cyl(0, 0, 0, 0.5, 0.5, 0.45, 18, C('#d8cbb0', -0.3), C('#e0d4bb', -0.3)); mb.cyl(0, 0.5, 0, 0.55, 0.56, 0.55, 18, C('#e6dcc6', -0.3), C('#e6dcc6', -0.3)); { const n = UPV; mb.triN([0, 0.57, 0], [0.45, 0.57, -0.02], [0, 0.82, -0.02], n, n, n, C('#8a6a3a', -0.85)); } for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; mb.box(Math.cos(a) * 0.44 - 0.01, 0.56, Math.sin(a) * 0.44 - 0.01, Math.cos(a) * 0.44 + 0.01, 0.565, Math.sin(a) * 0.44 + 0.01, C('#3a2a1c', 0)); } VK.sh(mb, 0, 0, 0.55, 0.55, 0.38); mb.pop();
    },
  },
  /* ---- Tahmin Ustası: Viktorya dönemi mucit atölyesi ---- */
  tus: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'gear', tableO: { wood: '#b9824e', copper: '#b87333', gearC: '#8a8f98' }, chair: 'wood', chairO: { wood: '#4a2a18' },
    rug: 'cog', rugO: { a: '#3a2422', b: '#8a7040' },
    L: VL2.workshop, sky: ['#120c08', '#2a1e14', '#160f0a'], sun: [0.3, 0.92, 0.25], shR: 8.6, parts: 'dust',
    post: { bloom: 0.55, th: 0.78, sat: 1.06, con: 0.13, vig: 0.42, tint: [1.04, 1.0, 0.94] },
    det: 0.14, detS: 0.5,
    anim: [{ key: 'gearBig', x: -4.5, y: 3.6, z: -7.62, ax: 'z', sp: 0.22, sec: 0 }, { key: 'gearSmall', x: -3.15, y: 2.6, z: -7.57, ax: 'z', sp: -0.42, sec: 0 }, { key: 'gearBig', x: 4.5, y: 3.6, z: -7.62, ax: 'z', sp: -0.2, sec: 0 }, { key: 'gearSmall', x: 3.15, y: 2.6, z: -7.57, ax: 'z', sp: 0.4, sec: 0 }],
    logos: [[2, -4.6, 2.6, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#4e301c', { lip: '#7a5236', fade: '#0e0905', band: '#c9a34a', bandE: -0.8 });
      vFloorWood(mb, ['#5a3a24', '#52351f', '#61402a', '#4c301c'], { w: 0.24, e: -0.25, gap: '#1f130b', border: '#3a2414', bw: 0.4 });
      const WALL = { wall: '#8c4a36', H: 6.0, dado: '#4a2a18', dadoH: 1.2, panel: '#5a3420', rail: '#c9a34a', base: '#24150c', crown: '#4a2a18', pat: 'brick', pc: ['#94503a', '#8a4632', '#9c5a42'], ps: 0.4 };
      for (let k = 0; k < 4; k++) { vWall(k, WALL, []); v6Pipes(k, 4.4, k * 7 + 2); }
      // 0: pirinç tabela, iki yanda dönen dişliler
      vSign('frame', '#c9a34a', '#fff8ec', { lampC: '#c9a34a' });
      VK.inSec(0, (s) => { for (const x of [-4.5, 4.5]) { s.push().T(x, 3.6, -7.74); s.cyl(0, 0, 0, 0.1, 0.05, 0.1, 10, C('#3a3d44', -0.7), C('#3a3d44', -0.7)); s.pop(); } for (const x of [-6.4, 6.4]) { wAt(s, 0, x, 0.3); P.bookcase(s, 1.4, 2.6, '#3a2214', Math.round(x + 9), { deco: '#c9a34a', d: 0.42 }); s.pop(); } });
      // 1: sağ — kara tahta, kitaplık, apotekör dolabı
      VK.inSec(1, (s) => { wAt(s, 1, -1.6, 0, 2.4); v6Chalkboard(s, 3.2, 1.6, 3); s.pop(); wAt(s, 1, 3.4, 0.3); v6Apothecary(s, 1.8, 1.25); s.pop(); wAt(s, 1, 3.4, 0.3, 1.3); v6Flasks(s, 1); s.pop(); });
      // 2: ön — deney tezgâhı, Tesla bobini, logo
      VK.inSec(2, (s) => { wAt(s, 2, 1.6, 0.42); P.counter(s, 3.2, 0.95, 0.7, '#5a3420', '#3a2214', { rail: false }); s.pop(); wAt(s, 2, 0.8, 0.45, 0.95); v6Flasks(s, 3); s.pop(); wAt(s, 2, 2.7, 0.42, 0.95); v6TeslaCoil(s); s.pop(); wAt(s, 2, 2.0, 0.45, 0.95); s.cyl(0, 0, 0, 0.1, 0.03, 0.1, 12, C('#2b2d31', -0.7), C('#2b2d31', -0.7)); limb(s, [0, 0.03, 0], [0, 0.32, -0.06], [0.02, 0.02], C('#2b2d31', -0.7), 4); s.push().T(0, 0.36, -0.02, 0, 0.6); s.cyl(0, -0.08, 0, 0.035, 0.12, 0.03, 10, C('#c9a34a', -0.9), C('#c9a34a', -0.9)); s.pop(); s.pop(); wAt(s, 2, -4.6, 0, 2.6); s.box(-0.52, -0.52, 0, 0.52, 0.52, 0.04, C('#c9a34a', -0.88)); s.pop(); });
      // 3: sol — kavanoz rafları, dev cetvel, asılı zeplin maketi
      VK.inSec(3, (s) => { for (const u of [-4.2, -2.4]) { wAt(s, 3, u, 0.3); v4Shelf(s, 1.6, 2.4, 0.5, 4, '#3a3d44'); for (let r = 0; r < 3; r++) { s.push().T(0.0, 0.15 + r * 0.7, 0); v6Flasks(s, r + Math.round(u)); s.pop(); } s.pop(); } wAt(s, 3, 0.4, 0, 0.0); v6Ruler(s, 3.4); s.pop(); wAt(s, 3, 3.6, 1.2, 4.3); v6Airship(s); for (const x of [-0.5, 0.5]) limb(s, [x, 0.25, 0], [x, 1.7, 0], [0.005, 0.005], C('#3a2a1c', 0), 3); s.pop(); wAt(s, 3, 5.6, 0.3); P.bookcase(s, 1.6, 2.4, '#3a2214', 13, { d: 0.42 }); s.pop(); });
      for (const [k, us] of [[1, [-4.6, 1.2]], [2, [-3.0, 3.0]], [3, [-4.8, 4.8]]]) for (const u of us) P.sconce(SEC(k), k, u, 3.0, '#ffd9a0', '#c9a34a');
      // salon: gezegen modeli, kum saati, peni-farting bisiklet, buhar kazanı, teleskop, ölçüm tekerleği
      VK.tall(-4.8, -4.6, (m) => v6Orrery(m));
      VK.tall(4.7, 4.8, (m) => v6Hourglass(m, 1.05));
      VK.tall(-5.4, 3.4, (m) => v6PennyFarthing(m), 1.2);
      VK.tall(5.4, 2.0, (m) => v6Boiler(m), -Math.PI / 2);
      VK.tall(5.4, -3.2, (m) => v6Telescope(m), 2.4);
      mb.push().T(2.6, 0, -5.8, 0.4); mb.push().T(0, 0.2, 0, 0, Math.PI / 2); mb.torusN(0, 0, 0, 0.2, 0.025, 0.025, 20, 4, C('#c8102e', -0.4)); mb.pop(); limb(mb, [0, 0.2, 0], [0, 0.95, -0.35], [0.015, 0.015], C('#3a3d44', -0.7), 4); mb.pop();
      for (const [x, z] of [[-2.8, 5.9], [3.0, -6.1]]) { mb.push().T(x, 0, z, hs(x, z) * 3); P.crate(mb, 0.55, '#8a6238', { fill: ['#b87333', '#c9ced6'] }); mb.pop(); }
      VK.tall(-2.9, 5.3, (m) => v6Automaton(m), Math.PI + 0.4);
      mb.push().T(3.3, 0, -5.4, -0.4); v6Drafting(mb); mb.pop();
      mb.push().T(-3.4, 0, -5.4, 0.5); P.sideTable(mb, 0.3, 0.7, '#4a2614', '#2e1608'); mb.push().T(0, 0.7, 0); v6Balance(mb); mb.pop(); mb.pop();
      mb.push().T(-1.2, 0, 6.2, 0.3); for (let i = 0; i < 5; i++) mb.box(-0.22 + hs(i, 3) * 0.04, i * 0.07, -0.16, 0.22 - hs(i, 4) * 0.04, i * 0.07 + 0.065, 0.16, C(BOOKC[i % BOOKC.length], -0.1)); mb.pop();
    },
  },
  /* ---- Taş Kağıt Makas: kış şenliği ---- */
  tkm: {
    room: 1, raw: 1, wallH: 6.0, secShadow: 1,
    table: 'ice', chair: 'ice', rug: 'flake', rugO: { a: '#9b2335' },
    L: VL2.snowday, sky: ['#131c38', '#3e5590', '#d99a86'], sun: [0.45, 0.62, 0.5], shR: 9.0, parts: 'snow',
    post: { bloom: 0.55, th: 0.84, sat: 1.12, con: 0.14, vig: 0.38, tint: [0.97, 0.99, 1.05] },
    det: 0.16, detS: 0.5,
    logos: [[1, 5.2, 2.8, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#a9badb', '#9aaed2', 0.3);
      VK.noise(mb, -RW, -RW, RW, RW, 0.9, '#b8c7e3', '#a6b8da', 0.35, -0.2, 0.002);
      for (let k = 0; k < 44; k++) { const a0 = (k / 44) * TAU, a1 = ((k + 1) / 44) * TAU - 0.02; for (const [r0, r1] of [[3.55, 4.05], [4.1, 4.6]]) { const c = C(['#9aa3ad', '#a9b1ba', '#8f98a3'][(k + Math.round(r0)) % 3], -0.3); mb.quadN([Math.cos(a0) * r0, 0.005, Math.sin(a0) * r0], [Math.cos(a0) * r1, 0.005, Math.sin(a0) * r1], [Math.cos(a1) * r1, 0.005, Math.sin(a1) * r1], [Math.cos(a1) * r0, 0.005, Math.sin(a1) * r0], UPV, UPV, UPV, UPV, c); } if (k % 3 === 0) mb.sphereS(Math.cos(a0 + 0.07) * 4.2, 0.01, Math.sin(a0 + 0.07) * 4.2, 0.28 + hs(k, 2) * 0.2, 0.03, 0.2 + hs(k, 3) * 0.15, C('#f4f8fc', -0.2), 8, 3); }
      mb.push().T(4.6, 0, 4.6); mb.disc(0, 0.006, 0, 1.9, 1.6, 36, C('#8cc4e6', -0.75), C('#6fb2dc', -0.75)); for (let k = 0; k < 5; k++) { let px = 0, pz = 0; for (let i = 0; i < 10; i++) { const a = k * 1.3 + i * 0.5, nx = Math.cos(a) * (0.3 + i * 0.11), nz = Math.sin(a) * (0.25 + i * 0.09); if (i) v4Seg(mb, px, pz, nx, nz, 0.012, C('#ffffff', 0.2), 0.008); px = nx; pz = nz; } } mb.lathe(0, 0.004, 0, [[2.05, 0], [1.9, 0]], 36, C('#ffffff', -0.2)); mb.pop();
      for (let i = 0; i < 22; i++) { const t = i / 21, x = -6.4 + t * 5.2, z = 1.0 + Math.sin(t * 3) * 1.2 + (i % 2 ? 0.12 : -0.12); mb.sphereS(x, 0.004, z, 0.06, 0.004, 0.1, C('#d6e4ef', 0), 6, 2); }
      for (const s of [-0.22, 0.22]) { let px = 2.4, pz = 7.2; for (let i = 1; i < 12; i++) { const nx = 2.4 + Math.sin(i * 0.35) * 1.4 + s, nz = 7.2 - i * 0.28; v4Seg(mb, px, pz, nx, nz, 0.02, C('#cddbe8', 0), 0.005); px = nx; pz = nz; } }
      // 0: kütük ev cephesi (karlı saçak, buz sarkıtları), sıcak pencereler, çelenkli kapı
      v6Cabin(0, 2);
      VK.inSec(0, (s) => { for (const u of [-4.6, 4.6]) { wAt(s, 0, u, 0, 1.0); s.box(-0.75, 0, 0, 0.75, 1.3, 0.14, C('#5a3a24', 0)); s.box(-0.65, 0.1, 0.14, 0.65, 1.2, 0.15, C('#ffcf8a', 0.9)); s.box(-0.02, 0.1, 0.15, 0.02, 1.2, 0.17, C('#5a3a24', 0)); s.box(-0.65, 0.63, 0.15, 0.65, 0.67, 0.17, C('#5a3a24', 0)); s.box(-0.8, -0.06, 0, 0.8, 0.0, 0.24, C('#f6fbff', -0.2)); s.pop(); VK.wglow(0, u, 0.1, 1.6, 1.0, '#ffcf8a', 0.16, 0.9); } for (const u of [-6.8, 6.8]) { wAt(s, 0, u, 0.5); s.push().T(0, 0, 0, 0, 0, 0); v6Skis(s); s.pop(); s.pop(); } });
      vSign('frame', '#6b4428', '#fff8ec', { lampC: '#2b2b2b' });
      // 1: sağ — sıcak çikolata ve zencefilli kurabiye kulübeleri
      VK.inSec(1, (s) => { wAt(s, 1, -3.0, 0.6); v6Stall(s, 2.4, 'cocoa'); s.pop(); wAt(s, 1, 1.6, 0.6); v6Stall(s, 2.2, 'cookie'); s.pop(); wAt(s, 1, 5.2, 0, 2.8); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#6b4428', -0.2)); s.pop(); });
      // 2: ön — karlı çamlar, kızak, hediye paketleri
      VK.inSec(2, (s) => { [-6.0, -3.6, 3.4, 5.8].forEach((u, i) => { wAt(s, 2, u, 0.9 + (i % 2) * 0.5); v6Pine(s, 1.0 + (i % 2) * 0.25); s.pop(); }); });
      // 3: sol — iglo, buz yıldızı, kayak askısı
      VK.inSec(3, (s) => { wAt(s, 3, -2.6, 1.6); v6Igloo(s, 1.3); s.pop(); wAt(s, 3, 2.4, 0.9); v6IceStar(s); s.pop(); wAt(s, 3, 5.0, 0.4); v6Skis(s); s.pop(); });
      // salon: süslü büyük çam, kardan adamlar, kızaklar, kar topu yığınları, fener direkleri, banklar
      VK.tall(-6.1, -6.0, (m) => v6Pine(m, 1.35, true));
      VK.tall(-4.3, 4.9, (m) => v6Snowman(m, 1.0, '#e63946'), 0.6);
      VK.tall(4.9, -4.6, (m) => v6Snowman(m, 0.85, '#3a86ff'), -0.8);
      mb.push().T(2.2, 0, 5.6, 0.3); v6Sled(mb); mb.pop(); mb.push().T(-5.6, 0, -2.2, 1.2); v6Sled(mb); for (let i = 0; i < 3; i++) { mb.rbox(-0.18 + i * 0.12, 0.27, -0.3 + i * 0.22, 0.02 + i * 0.12, 0.45 + i * 0.03, -0.12 + i * 0.22, 0.02, C(['#e63946', '#3a86ff', '#06d6a0'][i], -0.2), 2); mb.box(-0.09 + i * 0.12, 0.27, -0.3 + i * 0.22, -0.07 + i * 0.12, 0.46 + i * 0.03, -0.12 + i * 0.22, C('#ffd166', 0)); } mb.pop();
      mb.push().T(3.1, 0, -5.9); v8FirePit(mb); mb.pop(); for (const [x, z, ry] of [[3.1, -4.75, 0], [4.35, -6.15, 1.35], [1.85, -6.25, -1.3]]) { mb.push().T(x, 0, z, ry); v8LogSeat(mb, 1.0); mb.pop(); }
      VK.inSec(0, (s) => { for (const pts of [[[-6.9, 3.15, -6.85], [-4.7, 3.0, -6.9], [-2.7, 3.15, -6.85]], [[2.7, 3.15, -6.85], [4.7, 3.0, -6.9], [6.9, 3.15, -6.85]]]) P.stringLights(s, pts, ['#ffd38a', '#ff9e5e', '#ffe9b0', '#9be7ff'], 7, 0.28, 0.045, 0); });
      for (const [x, z] of [[0.9, -6.7], [-3.6, -4.8], [5.8, 1.4]]) { mb.push().T(x, 0, z); for (let i = 0; i < 6; i++) { const lv = i < 3 ? 0 : i < 5 ? 1 : 2, j = i < 3 ? i : i < 5 ? i - 3 : 0; mb.sphereS((j - (lv === 0 ? 1 : lv === 1 ? 0.5 : 0)) * 0.2, 0.1 + lv * 0.17, 0, 0.1, 0.1, 0.1, C('#f8fbff', -0.2), 8, 5); } VK.sh(mb, 0, 0, 0.35, 0.2, 0.3); mb.pop(); }
      for (const [x, z] of [[-5.6, 1.6], [5.6, -1.6], [-1.4, -6.4], [1.2, 6.6]]) VK.tall(x, z, (m) => { m.box(-0.05, 0, -0.05, 0.05, 2.0, 0.05, C('#2b2b2b', -0.5)); m.box(-0.05, 1.95, -0.05, 0.45, 2.02, 0.05, C('#2b2b2b', -0.5)); m.box(-0.06, 2.02, -0.06, 0.5, 2.06, 0.06, C('#f6fbff', -0.2)); m.push().T(0.4, 1.5, 0); P.lantern(m, '#2b2b2b', '#ffcf7a', { r: 0.6, a: 0.28, pool: 1 }); m.pop(); });
      for (const [x, z, ry] of [[-2.6, -6.2, 0], [6.4, 3.0, -Math.PI / 2]]) { mb.push().T(x, 0, z, ry); P.bench(mb, 1.6, '#8a5a34', '#2f3338'); mb.box(-0.8, 0.47, -0.2, 0.8, 0.53, 0.2, C('#f8fbff', -0.2)); mb.pop(); }
    },
  },
  /* ---- Harf Karması: eski matbaa ---- */
  hkr: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'wood', tableO: { wood: '#a77a4f' }, chair: 'hasir', chairO: { wood: '#5a3a24' },
    rug: 'cross', rugO: {},
    L: VL2.printshop, sky: ['#2a221a', '#4a3a2c', '#2a1d14'], sun: [0.55, 0.75, 0.35], shR: 8.6, parts: 'dust',
    post: { bloom: 0.4, th: 0.82, sat: 1.08, con: 0.14, vig: 0.38, tint: [1.04, 1.0, 0.94] },
    det: 0.18, detS: 0.55,
    logos: [[3, 5.6, 2.9, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#54402c', { lip: '#a07c58', fade: '#150f0a' });
      vFloorWood(mb, ['#6e4f36', '#654730', '#77553a', '#5e422c', '#6a4c33'], { w: 0.3, e: -0.25, gap: '#2a1c10' });
      for (let i = 0; i < 16; i++) { const x = (hs(i, 71) - 0.5) * 13, z = (hs(i, 72) - 0.5) * 13; if (Math.hypot(x, z) < 4.0) continue; v4Blot(mb, x, 0.004, z, 0.06 + hs(i, 73) * 0.12, ['#1e1e28', '#1e1e28', '#7a1420', '#1d3a6e'][i % 4], i + 5, 3); }
      for (let i = 0; i < 18; i++) { const a = hs(i, 31) * TAU, r = 4.4 + hs(i, 32) * 2.4, x = Math.cos(a) * r, z = Math.sin(a) * r; mb.push().T(x, 0.0048 + i * 0.0002, z, hs(i, 33) * 6); VK.quad(mb, -0.21, -0.15, 0.21, 0.15, C(i % 4 ? '#f2e9d4' : '#e9dcc0', 0), 0); for (let l = 0; l < 4; l++) VK.quad(mb, -0.16, -0.1 + l * 0.055, 0.16 - (l === 3 ? 0.1 : 0), -0.085 + l * 0.055, C('#2b2b30', 0), 0.0006); if (i % 3 === 0) VK.quad(mb, -0.17, 0.06, -0.05, 0.13, C(['#c8102e', '#2a6fdb', '#f2a20c'][(i / 3) % 3], 0), 0.0008); mb.pop(); }
      for (const [x, z, y] of [[-3.7, -3.5, 3.0], [3.5, -3.9, 2.85], [-4.3, 3.1, 2.9], [4.0, 3.3, 3.05], [0.2, -5.7, 3.1], [-5.6, -0.4, 2.95], [5.7, -0.8, 2.9]]) VK.tall(x, z, (m) => v8Bulb(m, y, 5.85));
      const WALL = { wall: '#9a4a36', H: 6.0, base: '#3a2414', crown: '#5a3a24', pat: 'brick', pc: ['#9a4a36', '#8c4030', '#a5523c', '#93463a'], ps: 0.42 };
      for (let k = 0; k < 4; k++) if (k !== 1) vWall(k, WALL, []);
      // 0: tabela, iki yanda harf kasası dolapları, tipografi afişi
      vSign('frame', '#3a2a1c', '#fbf6ec', { lampC: '#2b2b2b' });
      VK.inSec(0, (s) => { for (const u of [-3.1, -4.9, 3.1, 4.9]) { wAt(s, 0, u, 0.28); v6TypeCabinet(s, 1.7, 2.2); s.pop(); } for (const u of [-6.7, 6.7]) { wAt(s, 0, u, 0, 2.6); P.frame(s, 1.0, 1.4, 'poster', '#2b2b2e', Math.round(u + 9), { fe: -0.6, mat: 0.04 }); s.pop(); } });
      // 1: sağ — fabrika pencereleri, kuruyan baskılar
      const HW1 = [{ u0: -5.6, u1: -2.2, y0: 1.2, y1: 4.2 }, { u0: 2.2, u1: 5.6, y0: 1.2, y1: 4.2 }];
      vWall(1, WALL, HW1); for (const h of HW1) vWindow(1, h, { frame: '#2b2b2b', view: 'city', sun: true, sunHex: '#fff1d0', sunA: 0.14, nx: 4, ny: 3, sill: true });
      VK.inSec(1, (s) => { wAt(s, 1, 0, 0.1, 3.4); v6DryLine(s, 3.6, 3); s.pop(); wAt(s, 1, -3.9, 0.1, 1.0); v6DryLine(s, 3.0, 7); s.pop(); });
      // 2: ön — dökme demir baskı makinesi, kâğıt yığınları, giyotin
      VK.inSec(2, (s) => { wAt(s, 2, -2.2, 0.9); v6Press(s); s.pop(); wAt(s, 2, 0.6, 0.45); for (let i = 0; i < 4; i++) s.box(-0.32 + hs(i, 1) * 0.03, i * 0.12, -0.22, 0.32 - hs(i, 2) * 0.03, i * 0.12 + 0.11, 0.22, C(i % 2 ? '#f4ecd8' : '#ece2cc', -0.1)); s.pop(); wAt(s, 2, 2.8, 0.5); P.counter(s, 1.6, 0.9, 0.8, '#3a3d44', '#5a3a24', { rail: false }); s.box(-0.5, 0.9, -0.3, 0.5, 0.94, 0.3, C('#c9ced6', -0.88)); s.push().T(0.45, 0.94, 0, 0, 0, 0.6); s.box(0, 0, -0.32, 0.7, 0.03, 0.32, C('#c9ced6', -0.9)); s.pop(); s.pop(); wAt(s, 2, -2.2, 0.9); P.pendant(s, 2.6, '#2f4a3a', { kind: 'cone', top: 6.0, poolR: 1.3, poolA: 0.12 }); s.pop(); });
      // 3: sol — dizgi masası (harf tablaları), daktilo masası, kâğıt rafı, logo
      VK.inSec(3, (s) => { wAt(s, 3, -2.6, 0.5); P.counter(s, 2.8, 0.92, 0.8, '#6b4428', '#8a6238', { rail: false }); s.pop(); for (const [u, sd] of [[-3.4, 1], [-1.9, 2]]) { wAt(s, 3, u, 0.55, 0.92, 0.0); s.push().T(0, 0, 0, 0, -0.12); v6CaseTray(s, 0.9, 0.55, sd); s.pop(); s.pop(); }
        wAt(s, 3, 1.6, 0.55); P.desk(s, 1.4, 0.75, '#6b4428', '#5a3420'); s.pop(); wAt(s, 3, 1.6, 0.55, 0.76); v6Typewriter(s); s.pop(); wAt(s, 3, 1.6, 1.25, 0, Math.PI); CHAIRS.hasir.base(s, { wood: '#5a3a24' }); CHAIRS.hasir.pad(s, {}); s.pop();
        wAt(s, 3, 3.8, 0.3); v4Shelf(s, 1.4, 2.0, 0.5, 4, '#3a3d44'); for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) s.box(-0.6 + i * 0.42, 0.15 + r * 0.6, -0.2, -0.26 + i * 0.42, 0.15 + r * 0.6 + 0.12 + hs(i, r) * 0.1, 0.2, C(i % 2 ? '#f4ecd8' : '#e6d8b8', -0.1)); s.pop();
        wAt(s, 3, 5.6, 0, 2.9); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#3a2a1c', -0.2)); s.pop(); });
      for (const u of [-4.2, 4.2]) P.sconce(SEC(2), 2, u, 3.0, '#ffd9a0', '#3a3d44');
      // salon: dev tahta harfler, harf kutuları, kâğıt ruloları, el arabası, mürekkep fıçısı
      for (const [x, z, ch, c, ry] of [[-4.6, -4.6, 'A', '#c8102e', 0.5], [4.8, -4.2, 'Z', '#2a6fdb', -0.6], [-4.9, 4.2, 'K', '#f2a20c', 2.4], [4.5, 4.7, 'M', '#2a9d8f', -2.3]]) { mb.push().T(x, 0, z, ry); v6Letter(mb, ch, 0.85, 0.16, c); mb.pop(); }
      for (const [x, z] of [[-2.6, -5.9], [2.4, 5.9]]) { mb.push().T(x, 0, z, hs(x, z) * 3); P.crate(mb, 0.55, '#8a6238'); for (let i = 0; i < 12; i++) mb.box(-0.2 + (i % 4) * 0.11, 0.44, -0.16 + Math.floor(i / 4) * 0.11, -0.12 + (i % 4) * 0.11, 0.52, -0.08 + Math.floor(i / 4) * 0.11, C(['#f4ecd8', '#e63946', '#3a86ff', '#ffd166'][i % 4], -0.2)); mb.pop(); }
      for (const [x, z, ry] of [[6.0, 0.9, 0.2], [6.1, 1.6, 0.15]]) { mb.push().T(x, 0, z, ry + Math.PI / 2); v6PaperRoll(mb, 0.3, 1.2); mb.pop(); }
      mb.push().T(6.05, 0.58, 1.25, Math.PI / 2 + 0.17); v6PaperRoll(mb, 0.28, 1.1); mb.pop();
      mb.push().T(-6.0, 0, 0.6, 1.4); mb.box(-0.4, 0.12, -0.3, 0.4, 0.16, 0.3, C('#8a6238', -0.1)); for (const s of [-1, 1]) { mb.push().T(s * 0.3, 0.12, -0.32, 0, 0, Math.PI / 2); mb.cyl(0, -0.03, 0, 0.12, 0.03, 0.12, 12, C('#2b2b2b', -0.4), C('#2b2b2b', -0.4)); mb.pop(); } limb(mb, [-0.38, 0.16, 0.3], [-0.38, 0.9, 0.5], [0.018, 0.018], C('#5a3a24', 0), 4); limb(mb, [0.38, 0.16, 0.3], [0.38, 0.9, 0.5], [0.018, 0.018], C('#5a3a24', 0), 4); for (let i = 0; i < 5; i++) mb.box(-0.3, 0.16 + i * 0.09, -0.24, 0.3, 0.16 + i * 0.09 + 0.085, 0.24, C(i % 2 ? '#f4ecd8' : '#ece2cc', -0.1)); VK.sh(mb, 0, 0, 0.5, 0.4, 0.38); mb.pop();
      mb.push().T(-5.7, 0, -2.4); P.barrel(mb, 0.32, 0.8, '#3a3d44', '#1b1b1e'); mb.cyl(0, 0.8, 0, 0.26, 0.805, 0.26, 16, C('#14141a', -0.9), C('#14141a', -0.9)); mb.pop();
      for (const [x, z] of [[-6.95, -6.95], [6.95, 6.95]]) VK.tall(x, z, (m) => P.ficus(m, 1.0, '#c8693a'));
    },
  },
});

/* ---- 5. paket: mahkeme salonu, havalimanı kapısı, go-kart pisti, büyük kütüphane, grafiti parkı ---- */
Object.assign(VL2, {
  court: { raw: 1, sunC: [0.76, 0.67, 0.56], sky: [0.41, 0.4, 0.44], gnd: [0.25, 0.21, 0.17], night: 0.4, warm: [1, 0.88, 0.7], lampC: [0.98, 0.8, 0.56], fogR: [40, 120], stars: 0, glowS: 0.42 },
  terminal: { raw: 1, sunC: [0.92, 0.74, 0.58], sky: [0.4, 0.42, 0.54], gnd: [0.25, 0.25, 0.28], night: 0.6, warm: [1, 0.86, 0.66], lampC: [0.72, 0.64, 0.56], fogR: [50, 150], stars: 0, glowS: 0.42 },
  racing: { raw: 1, sunC: [0.96, 0.88, 0.76], sky: [0.5, 0.52, 0.56], gnd: [0.36, 0.34, 0.32], night: 0, warm: [1, 0.92, 0.8], lampC: [0.5, 0.45, 0.4], fogR: [50, 150], stars: 0, glowS: 0.3 },
  library: { raw: 1, sunC: [0.82, 0.7, 0.55], sky: [0.42, 0.4, 0.4], gnd: [0.28, 0.23, 0.18], night: 0.55, warm: [1, 0.86, 0.64], lampC: [1.0, 0.78, 0.5], fogR: [40, 130], stars: 0, glowS: 0.48 },
  street: { raw: 1, sunC: [0.96, 0.78, 0.6], sky: [0.43, 0.42, 0.5], gnd: [0.31, 0.27, 0.24], night: 0, warm: [1, 0.9, 0.74], lampC: [0.55, 0.45, 0.35], fogR: [50, 150], stars: 0, glowS: 0.32 },
});

/* ---- hafif sandalye ve kitaplık (çok sayıda kullanılan yerler için) ---- */
function v7Chair(mb, wood = '#5a3820', seat = '#7a1f2b') {
  const W = C(wood, -0.3), S2 = C(seat, -0.1);
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) mb.box(x - 0.022, 0, z - 0.022, x + 0.022, 0.44, z + 0.022, W);
  mb.box(-0.22, 0.42, -0.21, 0.22, 0.47, 0.21, S2); for (const x of [-0.19, 0.19]) mb.box(x - 0.022, 0.44, -0.21, x + 0.022, 0.95, -0.17, W); mb.box(-0.21, 0.72, -0.21, 0.21, 0.92, -0.18, W);
}
function v7Bookcase(mb, w = 2.2, h = 3.4, col = '#7a5232', seed = 1, rows = 6, d = 0.42) {
  const B = C(col, -0.2), Bd = C(vDark(col, 0.35), 0);
  mb.box(-w / 2, 0, -d / 2, w / 2, 0.1, d / 2, B); mb.box(-w / 2, h - 0.06, -d / 2 - 0.01, w / 2, h, d / 2 + 0.03, B); mb.box(-w / 2, 0, -d / 2, -w / 2 + 0.05, h, d / 2, B); mb.box(w / 2 - 0.05, 0, -d / 2, w / 2, h, d / 2, B); mb.box(-w / 2, 0.1, -d / 2, w / 2, h - 0.06, -d / 2 + 0.02, Bd);
  const sh = (h - 0.16) / rows;
  for (let r = 0; r < rows; r++) { const y = 0.1 + r * sh; if (r > 0) mb.box(-w / 2 + 0.05, y - 0.025, -d / 2, w / 2 - 0.05, y, d / 2, B); let x = -w / 2 + 0.07, i = 0; while (x < w / 2 - 0.12) { const bw = 0.1 + hs(i * 7 + r, seed) * 0.12, bh = sh * (0.62 + hs(i + r * 3, seed + 1) * 0.3); if (x + bw > w / 2 - 0.06) break; if (hs(i + r, seed + 2) > 0.9) { x += bw * 0.6; i++; continue; } mb.box(x, y, -d / 2 + 0.04, x + bw - 0.012, y + bh, d / 2 - 0.04, C(BOOKC[Math.floor(hs(i * 3 + r, seed + 3) * BOOKC.length)], -0.1)); if (bw > 0.17) mb.box(x + bw * 0.5 - 0.008, y, d / 2 - 0.039, x + bw * 0.5, y + bh, d / 2 - 0.036, C('#1b1410', 0)); x += bw; i++; } }
  VK.sh(mb, 0, 0, w * 0.6, d * 1.1, 0.36);
}
/* ---- halılar ---- */
// dama bayrağı diski (yarış)
RUGS.checkerflag = (mb, R, o = {}) => {
  const y = o.y ?? 0.03, n = 10, s = (2 * R) / n, K = C('#16161a', -0.2), W = C('#f4f4f4', -0.2);
  mb.cyl(0, 0, 0, R + 0.08, y - 0.002, R + 0.08, 64, C('#c8102e', -0.3), C('#c8102e', -0.3));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x0 = -R + i * s, z0 = -R + j * s, cx = x0 + s / 2, cz = z0 + s / 2; if (Math.hypot(cx, cz) > R - s * 0.35) continue; VK.quad(mb, x0, z0, x0 + s, z0 + s, (i + j) % 2 ? K : W, y); }
};
// betona tebeşir çizimi (grafiti parkı): renkli halkalar ve ışınlar
RUGS.chalk = (mb, R, o = {}) => {
  const y = o.y ?? 0.006, cols = ['#ff8fc7', '#7cd6ff', '#ffe066', '#9fe870', '#c9a0ff'];
  for (let i = 0; i < 3; i++) mb.lathe(0, y + i * 0.001, 0, [[R - i * 0.42, 0], [R - i * 0.42 - 0.07, 0]], 56, C(cols[i], 0.15));
  for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, r0 = R * 0.62, r1 = R - 0.95 - (k % 2) * 0.2; v4Seg(mb, Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, 0.035, C(cols[k % cols.length], 0.15), y + 0.003); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2, x = Math.cos(a) * (R - 0.2), z = Math.sin(a) * (R - 0.2), c = C(cols[(k + 2) % cols.length], 0.15); for (let j = 0; j < 5; j++) { const b0 = (j / 5) * TAU, b1 = (((j + 2) % 5) / 5) * TAU; v4Seg(mb, x + Math.cos(b0) * 0.16, z + Math.sin(b0) * 0.16, x + Math.cos(b1) * 0.16, z + Math.sin(b1) * 0.16, 0.02, c, y + 0.004); } }
};

/* ---- Mahkeme salonu eşyaları ---- */
function v7Scales(mb, s = 1) {
  const G = C('#c9a34a', -0.9);
  mb.cyl(0, -0.6 * s, 0, 0.03 * s, 0.35 * s, 0.03 * s, 8, G, G); mb.sphereS(0, 0.38 * s, 0, 0.06 * s, 0.06 * s, 0.06 * s, G, 8, 5);
  mb.box(-0.5 * s, 0.3 * s, -0.02 * s, 0.5 * s, 0.34 * s, 0.02 * s, G);
  for (const sx of [-1, 1]) { limb(mb, [sx * 0.48 * s, 0.3 * s, 0], [sx * 0.36 * s, -0.05 * s, 0.03 * s], [0.006 * s, 0.006 * s], G, 2); limb(mb, [sx * 0.48 * s, 0.3 * s, 0], [sx * 0.6 * s, -0.05 * s, 0.03 * s], [0.006 * s, 0.006 * s], G, 2); mb.push().T(sx * 0.48 * s, -0.08 * s, 0.03 * s); mb.lathe(0, 0, 0, [[0.0, 0], [0.15 * s, 0.03 * s], [0.17 * s, 0.06 * s]], 14, G); mb.pop(); }
  mb.box(-0.25 * s, -0.66 * s, -0.08 * s, 0.25 * s, -0.6 * s, 0.08 * s, G);
}
function v7Banner(mb, col = '#1f3a5f', dir = 1) {
  const G = C('#c9a34a', -0.88), d = dir; mb.cyl(0, 0, 0, 0.18, 0.05, 0.16, 12, G, G); mb.cyl(0, 0.05, 0, 0.025, 2.9, 0.025, 8, G, G); mb.sphereS(0, 2.95, 0, 0.06, 0.08, 0.06, G, 8, 5);
  mb.box(Math.min(0.03 * d, 0.75 * d), 1.4, -0.01, Math.max(0.03 * d, 0.75 * d), 2.8, 0.01, C(col, 0)); for (let i = 0; i < 6; i++) { const x0 = (0.03 + i * 0.12) * d, n = [0, 0, 1]; mb.triN([x0, 1.4, 0.012], [x0 + 0.12 * d, 1.4, 0.012], [x0 + 0.06 * d, 1.28, 0.012], n, n, n, C(col, 0)); }
  mb.push().T(0.39 * d, 2.1, 0.012); mb.box(-0.26, -0.26, 0, 0.26, 0.26, 0.004, C('#c9a34a', -0.6)); mb.box(-0.22, -0.22, 0.004, 0.22, 0.22, 0.008, C(col, 0)); mb.push().T(0, 0.05, 0.01, 0, 0, 0, 0.25); v7Scales(mb, 0.9); mb.pop(); mb.pop();
}
function v7JudgeBench(mb) {
  const W = C('#6b4428', -0.35), Wd = C('#5a3820', -0.35), Wl = C('#7a5232', -0.35), G = C('#c9a34a', -0.88);
  mb.box(-1.8, 0, -1.0, 1.8, 0.4, 0.6, Wd);
  mb.box(-1.75, 0.4, 0.3, 1.75, 1.7, 0.55, W); mb.box(-1.85, 1.7, 0.2, 1.85, 1.78, 0.68, Wl);
  for (let i = 0; i < 5; i++) { const x = -1.5 + i * 0.75; mb.box(x - 0.28, 0.6, 0.55, x + 0.28, 1.5, 0.58, Wl); mb.box(x - 0.22, 0.66, 0.58, x + 0.22, 1.44, 0.6, Wd); }
  mb.push().T(0, 1.05, 0.61); mb.box(-0.4, -0.25, 0, 0.4, 0.25, 0.02, G); mb.box(-0.35, -0.2, 0.02, 0.35, 0.2, 0.03, C('#1f3a5f', 0)); mb.push().T(0, 0.04, 0.035, 0, 0, 0, 0.32); v7Scales(mb, 1); mb.pop(); mb.pop();
  mb.push().T(0, 0.4, -0.45); mb.rbox(-0.32, 0.4, -0.3, 0.32, 0.55, 0.3, 0.05, C('#3a1e10', -0.2), 2); mb.rbox(-0.32, 0.55, -0.35, 0.32, 1.65, -0.2, 0.08, C('#3a1e10', -0.2), 2); mb.cyl(0, 0, 0, 0.25, 0.04, 0.25, 12, C('#1b1b1e', -0.5), C('#1b1b1e', -0.5)); mb.cyl(0, 0.04, 0, 0.04, 0.4, 0.04, 8, C('#1b1b1e', -0.5), C('#1b1b1e', -0.5)); mb.pop();
  mb.push().T(0.5, 1.78, 0.4); mb.cyl(0, 0, 0, 0.09, 0.03, 0.09, 14, Wl, Wl); mb.push().T(0.0, 0.07, 0, 0, 0, Math.PI / 2 - 0.3); mb.cyl(0, -0.08, 0, 0.04, 0.08, 0.04, 10, W, W); mb.pop(); limb(mb, [0.0, 0.08, 0], [0.18, 0.04, 0.12], [0.015, 0.012], W, 3); mb.pop();
  mb.push().T(-0.8, 1.78, 0.4); mb.box(-0.25, 0, -0.18, 0.25, 0.03, 0.18, C('#fbf6ec', 0)); mb.box(-0.23, 0.03, -0.16, 0.23, 0.05, 0.16, C('#f4ecd8', 0)); mb.pop();
  mb.push().T(-1.4, 1.78, 0.4); v5BankerLamp(mb); mb.pop();
  VK.sh(mb, 0, 0, 2.0, 0.9, 0.38);
}
function v7Witness(mb) {
  const W = C('#6b4428', -0.35), Wl = C('#7a5232', -0.35);
  mb.box(-0.6, 0, -0.6, 0.6, 0.3, 0.6, W); mb.box(-0.6, 0.3, 0.5, 0.6, 1.15, 0.6, Wl); for (const s of [-1, 1]) mb.box(s * 0.6 - 0.05, 0.3, -0.6, s * 0.6 + 0.05, 1.15, 0.6, Wl); mb.box(-0.65, 1.15, -0.65, 0.65, 1.2, 0.65, W);
  mb.push().T(0, 0.3, -0.15); v7Chair(mb, '#5a3820', '#1f3a5f'); mb.pop();
  limb(mb, [0.3, 1.2, 0.5], [0.3, 1.45, 0.5], [0.008, 0.008], C('#2b2b2e', -0.4), 3); mb.sphereS(0.3, 1.47, 0.5, 0.03, 0.045, 0.03, C('#2b2b2e', -0.4), 8, 5);
  VK.sh(mb, 0, 0, 0.7, 0.7, 0.38);
}
function v7JuryBox(mb, w = 4.0) {
  const W = C('#6b4428', -0.35), Wl = C('#7a5232', -0.35);
  mb.box(-w / 2, 0, -1.2, w / 2, 0.2, 0.0, W); mb.box(-w / 2, 0.2, -1.2, w / 2, 0.45, -0.6, W);
  mb.box(-w / 2, 0, 0.0, w / 2, 0.95, 0.08, Wl); mb.box(-w / 2 - 0.03, 0.95, -0.02, w / 2 + 0.03, 1.0, 0.12, W);
  for (let i = 0; i < 10; i++) mb.box(-w / 2 + 0.2 + i * ((w - 0.4) / 9) - 0.02, 0.15, 0.08, -w / 2 + 0.2 + i * ((w - 0.4) / 9) + 0.02, 0.85, 0.1, W);
  for (const [z, y] of [[-0.3, 0.2], [-0.9, 0.45]]) for (let i = 0; i < 6; i++) { mb.push().T(-w / 2 + 0.35 + i * ((w - 0.7) / 5), y, z, Math.PI); v7Chair(mb, '#5a3820', '#1f3a5f'); mb.pop(); }
  VK.sh(mb, 0, -0.6, w * 0.55, 0.8, 0.36);
}
function v7Pew(mb, w = 3.0) {
  const W = C('#6b4428', -0.3), Wd = C('#5a3820', -0.3);
  mb.box(-w / 2, 0.42, -0.24, w / 2, 0.47, 0.22, W); mb.push().T(0, 0.47, -0.22, 0, -0.12); mb.box(-w / 2, 0, -0.03, w / 2, 0.5, 0.0, W); mb.box(-w / 2, 0.5, -0.04, w / 2, 0.55, 0.02, Wd); mb.pop();
  for (const s of [-1, 1]) { mb.box(s * w / 2 - 0.05, 0, -0.3, s * w / 2 + 0.05, 0.95, 0.25, Wd); mb.sphereS(s * w / 2, 0.98, -0.03, 0.07, 0.05, 0.07, Wd, 8, 5); }
  VK.sh(mb, 0, 0, w * 0.55, 0.35, 0.36);
}
function v7Evidence(mb) {
  P.coffeeTable(mb, 1.3, 0.7, 0.75, '#5a3820', '#3a2414', { books: false });
  for (const [x, z, w, h, c] of [[-0.35, -0.1, 0.32, 0.2, '#c9a46a'], [0.1, 0.05, 0.26, 0.16, '#b08455'], [0.4, -0.12, 0.2, 0.26, '#c9a46a']]) { mb.box(x - w / 2, 0.75, z - 0.12, x + w / 2, 0.75 + h, z + 0.12, C(c, 0)); mb.box(x - w / 2 + 0.03, 0.75 + h * 0.5, z + 0.121, x + w / 2 - 0.03, 0.75 + h * 0.5 + 0.05, z + 0.123, C('#f4f4f4', 0)); }
  mb.push().T(0.05, 0.76, 0.24, 0.6); mb.torusN(0, 0.0, 0, 0.07, 0.012, 0.012, 16, 3, C('#2b2b2e', -0.5)); mb.disc(0, 0.001, 0, 0.065, 0.065, 14, C('#cfe6ff', -0.9), C('#cfe6ff', -0.9)); mb.box(0.07, -0.006, -0.012, 0.2, 0.006, 0.012, C('#2b2b2e', -0.5)); mb.pop();
  for (let i = 0; i < 3; i++) { mb.push().T(-0.45 + i * 0.12, 0.752, 0.22, 0.2 * i); mb.box(-0.08, 0, -0.05, 0.08, 0.003, 0.05, C('#f4f4f4', 0)); mb.box(-0.06, 0.003, -0.03, 0.06, 0.004, 0.03, C(['#4a6fa5', '#7a1f2b', '#3f7d58'][i], 0)); mb.pop(); }
}
function v7PhotoBoard(mb) {
  const Wd = C('#6b4428', -0.25);
  for (const s of [-1, 1]) limb(mb, [s * 0.35, 0, 0.25], [s * 0.1, 1.85, 0.0], [0.022, 0.02], Wd, 5); limb(mb, [0, 0, -0.5], [0, 1.7, -0.02], [0.02, 0.02], Wd, 5);
  mb.box(-0.42, 0.75, 0.05, 0.42, 0.79, 0.2, Wd);
  mb.push().T(0, 0.79, 0.12, 0, -0.1); mb.box(-0.48, 0, -0.03, 0.48, 1.0, 0.0, C('#b08455', 0)); const P2 = ['#f4f4f4']; for (let i = 0; i < 6; i++) { const x = -0.32 + (i % 3) * 0.32, y = 0.28 + Math.floor(i / 3) * 0.42; mb.box(x - 0.12, y - 0.15, 0.002, x + 0.12, y + 0.15, 0.006, C(P2[0], 0)); mb.box(x - 0.1, y - 0.1, 0.006, x + 0.1, y + 0.13, 0.008, C(['#7d9a6a', '#8a8f96', '#c9a46a', '#6a8caf'][i % 4], 0)); mb.sphereS(x, y + 0.14, 0.012, 0.014, 0.014, 0.01, C('#c8102e', 0), 6, 4); }
  limb(mb, [-0.32, 0.42, 0.012], [0.0, 0.7, 0.012], [0.004, 0.004], C('#c8102e', 0), 2); limb(mb, [0.0, 0.7, 0.012], [0.32, 0.28, 0.012], [0.004, 0.004], C('#c8102e', 0), 2); mb.pop();
  VK.sh(mb, 0, 0, 0.45, 0.45, 0.36);
}

/* ---- Havalimanı eşyaları ---- */
function v7Board(mb, w, h, seed = 1, col = '#ffc94a') {
  mb.box(-w / 2 - 0.06, -h / 2 - 0.06, 0, w / 2 + 0.06, h / 2 + 0.06, 0.1, C('#2b2d31', -0.6)); mb.box(-w / 2, -h / 2, 0.1, w / 2, h / 2, 0.105, C('#0c0d10', 0));
  const rows = 7; for (let r = 0; r < rows; r++) { const y = h / 2 - 0.16 - r * ((h - 0.24) / (rows - 1)); let x = -w / 2 + 0.08; for (const [n, c] of [[5, col], [8, '#f4f4f4'], [4, col], [3, r % 3 === 0 ? '#5bff9a' : r % 3 === 1 ? '#ff5a5a' : col]]) { for (let i = 0; i < n; i++) { if (x > w / 2 - 0.1) break; mb.box(x, y - 0.045, 0.105, x + 0.06, y + 0.045, 0.11, C(c, 1)); x += 0.075; } x += 0.08; } }
}
function v7Seats(mb, n = 4, col = '#2a6fdb') {
  const M = C('#c9ced6', -0.88), S = C(col, -0.4), w = n * 0.56;
  mb.box(-w / 2, 0.36, -0.04, w / 2, 0.4, 0.04, M); for (const s of [-1, 1]) { mb.box(s * (w / 2 - 0.1) - 0.03, 0, -0.25, s * (w / 2 - 0.1) + 0.03, 0.38, 0.25, M); mb.box(s * (w / 2 - 0.1) - 0.15, 0, -0.27, s * (w / 2 - 0.1) + 0.15, 0.03, 0.27, M); }
  for (let i = 0; i < n; i++) { const x = -w / 2 + 0.28 + i * 0.56; mb.rbox(x - 0.24, 0.4, -0.22, x + 0.24, 0.46, 0.24, 0.03, S, 2); mb.push().T(x, 0.46, -0.22, 0, -0.15); mb.rbox(-0.24, 0, -0.04, 0.24, 0.5, 0.02, 0.04, S, 2); mb.pop(); if (i < n - 1) mb.box(x + 0.25, 0.4, -0.18, x + 0.31, 0.62, 0.18, M); }
  VK.sh(mb, 0, 0, w * 0.55, 0.32, 0.36);
}
function v7Suitcase(mb, col = '#e63946', s = 1) {
  const B = C(col, -0.4), M = C('#2b2d31', -0.5);
  mb.rbox(-0.22 * s, 0.06 * s, -0.13 * s, 0.22 * s, 0.68 * s, 0.13 * s, 0.05 * s, B, 2); for (const x of [-0.12, 0.0, 0.12]) mb.box((x - 0.01) * s, 0.08 * s, 0.13 * s, (x + 0.01) * s, 0.66 * s, 0.135 * s, C(vDark(col, 0.2), -0.4));
  for (const x of [-0.15, 0.15]) { mb.cyl(x * s, 0.68 * s, 0, 0.012 * s, 0.9 * s, 0.012 * s, 6, M, M); } mb.box(-0.16 * s, 0.9 * s, -0.02 * s, 0.16 * s, 0.93 * s, 0.02 * s, M);
  for (const x of [-0.17, 0.17]) { mb.push().T(x * s, 0.03 * s, -0.09 * s, 0, 0, Math.PI / 2); mb.cyl(0, -0.02 * s, 0, 0.03 * s, 0.02 * s, 0.03 * s, 8, M, M); mb.pop(); }
  VK.sh(mb, 0, 0, 0.26 * s, 0.17 * s, 0.38);
}
function v7Cart(mb) {
  const M = C('#c9ced6', -0.88), K = C('#2b2d31', -0.5);
  mb.box(-0.35, 0.18, -0.55, 0.35, 0.22, 0.55, M); for (const s of [-1, 1]) { limb(mb, [s * 0.33, 0.2, -0.55], [s * 0.33, 1.0, -0.62], [0.018, 0.018], M, 3); for (const z of [-0.45, 0.45]) { mb.push().T(s * 0.3, 0.09, z, 0, 0, Math.PI / 2); mb.cyl(0, -0.03, 0, 0.08, 0.03, 0.08, 10, K, K); mb.pop(); } } limb(mb, [-0.33, 1.0, -0.62], [0.33, 1.0, -0.62], [0.022, 0.022], C('#c8102e', -0.4), 3);
  mb.push().T(0.0, 0.22, 0.1); mb.rbox(-0.3, 0, -0.32, 0.3, 0.26, 0.32, 0.04, C('#2a6fdb', -0.4), 2); mb.rbox(-0.26, 0.26, -0.26, 0.24, 0.48, 0.2, 0.04, C('#ffd166', -0.3), 2); mb.rbox(-0.18, 0.48, -0.18, 0.2, 0.62, 0.12, 0.04, C('#2a9d8f', -0.3), 2); mb.pop();
  VK.sh(mb, 0, 0, 0.42, 0.62, 0.38);
}
function v7Plane(mb) {
  const W = C('#f4f6f9', -0.6), Bl = C('#2a6fdb', -0.4), G = C('#9aa3ad', -0.7), Win = C('#1d2b3a', -0.5);
  mb.push().T(0, 2.2, 0, 0, 0, Math.PI / 2); mb.cyl(0, -8.0, 0, 1.25, 7.0, 1.25, 20, W, W, ''); mb.pop();
  mb.sphereS(7.0, 2.2, 0, 1.9, 1.25, 1.25, W, 18, 10); mb.sphereS(-8.0, 2.4, 0, 2.6, 1.0, 1.0, W, 16, 8);
  for (let i = 0; i < 26; i++) mb.box(-6.5 + i * 0.5, 2.55, 1.2, -6.32 + i * 0.5, 2.8, 1.26, Win); mb.box(7.5, 2.55, 0.85, 8.2, 2.85, 1.0, Win);
  mb.box(-8.0, 1.6, 1.22, 7.0, 1.85, 1.27, Bl);
  { const n = [0, 1, 0]; for (const s of [-1, 1]) { mb.quadN([1.8, 1.6, s * 1.0], [-1.2, 1.6, s * 1.0], [-3.6, 1.5, s * 9.0], [-2.2, 1.5, s * 9.0], n, n, n, n, G); mb.quadN([-8.6, 2.6, s * 0.4], [-10.2, 2.6, s * 0.4], [-11.0, 2.6, s * 3.6], [-10.2, 2.6, s * 3.6], n, n, n, n, G); } }
  { const n = [0, 0, 1]; mb.quadN([-8.2, 3.0, 0], [-10.0, 3.0, 0], [-11.4, 6.2, 0], [-10.4, 6.2, 0], n, n, n, n, Bl); }
  for (const s of [-1, 1]) { mb.push().T(-0.8, 1.1, s * 3.6, 0, 0, -Math.PI / 2); mb.cyl(0, -1.2, 0, 0.55, 1.4, 0.55, 16, G, G); mb.cyl(0, -1.25, 0, 0.45, -1.2, 0.45, 16, C('#2b2d31', -0.5), C('#2b2d31', -0.5)); mb.pop(); }
  for (const [x, z] of [[5.6, 0], [-1.0, 0.9]]) { limb(mb, [x, 1.2, z], [x, 0.3, z], [0.08, 0.08], G, 4); mb.push().T(x, 0.3, z, 0, Math.PI / 2); mb.cyl(0, -0.15, 0, 0.3, 0.15, 0.3, 14, C('#1b1b1e', -0.3), C('#1b1b1e', -0.3)); mb.pop(); }
}
function v7Tower(mb) {
  const W = C('#e6e9ec', -0.4), G = C('#3a5f7d', -0.85);
  mb.cyl(0, 0, 0, 1.2, 9.0, 0.9, 16, W, W); mb.cyl(0, 9.0, 0, 1.8, 9.3, 1.8, 16, W, W); mb.cyl(0, 9.3, 0, 1.75, 10.5, 1.65, 16, G, G); mb.cyl(0, 10.5, 0, 1.9, 10.8, 1.9, 16, W, W); mb.cyl(0, 10.8, 0, 0.08, 12.0, 0.04, 6, W, W); mb.sphereS(0, 12.0, 0, 0.12, 0.12, 0.12, C('#ff3b30', 1), 8, 5);
}
function v7InfoPillar(mb) {
  mb.rbox(-0.32, 0, -0.18, 0.32, 2.2, 0.18, 0.04, C('#2b2d31', -0.6), 2); mb.box(-0.27, 1.0, 0.18, 0.27, 2.0, 0.185, C('#0f1a2e', 1));
  for (let r = 0; r < 8; r++) mb.box(-0.22, 1.85 - r * 0.11, 0.186, -0.22 + 0.15 + hs(r, 3) * 0.25, 1.89 - r * 0.11, 0.19, C(r % 3 ? '#cfe6ff' : '#ffc94a', 1));
  mb.box(-0.27, 2.05, 0.18, 0.27, 2.15, 0.19, C('#2a6fdb', 1)); VK.halo(mb.p(0, 1.5, 0.4), 0.5, '#9fd0ff', 0.2); VK.sh(mb, 0, 0, 0.36, 0.24, 0.4);
}
function v7Counter(mb, w = 3.0) {
  const B = C('#e6e9ec', -0.5), Bl = C('#2a6fdb', -0.3);
  mb.rbox(-w / 2, 0, -0.35, w / 2, 1.05, 0.35, 0.04, B, 2); mb.box(-w / 2, 0.85, 0.35, w / 2, 0.95, 0.36, Bl); mb.box(-w / 2 - 0.05, 1.05, -0.4, w / 2 + 0.05, 1.1, 0.42, C('#3a3d44', -0.6));
  for (const x of [-w / 4, w / 4]) { mb.box(x - 0.2, 1.1, -0.2, x + 0.2, 1.42, -0.17, C('#1b1b1e', -0.4)); mb.box(x - 0.17, 1.13, -0.17, x + 0.17, 1.39, -0.165, C('#2a6fdb', 1)); mb.box(x - 0.03, 1.1, -0.27, x + 0.03, 1.13, -0.17, C('#1b1b1e', -0.4)); }
  VK.sh(mb, 0, 0, w * 0.55, 0.42, 0.38);
}

/* ---- Go-kart eşyaları ---- */
function v7Tire(mb, n = 3, col = '#1d1e22', band = null, q = 1) {
  for (let k = 0; k < n; k++) mb.torusN(0, 0.12 + k * 0.24, 0, 0.3, 0.12, 0.11, q ? 18 : 12, q ? 6 : 4, C(band && k % 2 ? band : col, -0.3));
  mb.disc(0, 0.12 + (n - 1) * 0.24 + 0.05, 0, 0.19, 0.19, q ? 14 : 8, C('#2b2d31', -0.5), C('#2b2d31', -0.5));
  VK.sh(mb, 0, 0, 0.42, 0.42, 0.4);
}
function v7Kart(mb, col = '#e63946', num = 7) {
  const B = C(col, -0.5), K = C('#1d1e22', -0.3), M = C('#c9ced6', -0.88);
  mb.box(-0.42, 0.1, -0.72, 0.42, 0.15, 0.62, C('#3a3d44', -0.7));
  for (const [x, z, r] of [[-0.46, 0.5, 0.13], [0.46, 0.5, 0.13], [-0.48, -0.55, 0.15], [0.48, -0.55, 0.15]]) { mb.push().T(x, r, z, 0, 0, Math.PI / 2); mb.cyl(0, -0.08, 0, r, 0.08, r, 14, K, K); mb.cyl(0, -0.085, 0, r * 0.55, 0.085, r * 0.55, 10, M, M); mb.pop(); }
  mb.rbox(-0.3, 0.12, 0.35, 0.3, 0.3, 0.72, 0.06, B, 2); for (const s of [-1, 1]) mb.rbox(s * 0.3, 0.12, -0.4, s * 0.48, 0.3, 0.3, 0.05, B, 2);
  mb.rbox(-0.2, 0.15, -0.45, 0.2, 0.55, -0.2, 0.08, C('#1d1e22', -0.3), 2); mb.rbox(-0.18, 0.15, -0.25, 0.18, 0.26, 0.05, 0.05, C('#1d1e22', -0.3), 2);
  mb.cyl(0, 0.3, 0.22, 0.02, 0.48, 0.02, 6, M, M); mb.push().T(0, 0.5, 0.18, 0, -0.9); mb.torusN(0, 0, 0, 0.12, 0.018, 0.018, 16, 3, K); mb.pop();
  mb.push().T(0, 0.31, 0.6); mb.disc(0, 0, 0, 0.12, 0.1, 14, C('#f4f4f4', 0), C('#f4f4f4', 0)); mb.pop(); v4Digits(mb, String(num), 0, 0.2, 0.721, 0.05, 0.09, '#1d1e22', '#e9e9e9');
  mb.box(-0.42, 0.42, -0.72, 0.42, 0.46, -0.6, B); for (const s of [-1, 1]) mb.box(s * 0.35 - 0.02, 0.15, -0.68, s * 0.35 + 0.02, 0.42, -0.64, M);
  VK.sh(mb, 0, 0, 0.6, 0.85, 0.42);
}
function v7Podium(mb) {
  const W = C('#f4f4f4', -0.3), G = C('#ffd23f', -0.85), S = C('#c9ced6', -0.88), Bz = C('#cd7f32', -0.85);
  for (const [x, h, c, n] of [[0, 0.9, G, '1'], [-0.85, 0.6, S, '2'], [0.85, 0.4, Bz, '3']]) { mb.box(x - 0.42, 0, -0.42, x + 0.42, h, 0.42, W); mb.box(x - 0.42, h - 0.06, 0.42, x + 0.42, h, 0.43, c); v4Digits(mb, n, x, h * 0.5, 0.43, 0.16, 0.26, '#1d1e22', '#f4f4f4'); }
  mb.push().T(0, 0.9, 0); mb.cyl(0, 0, 0, 0.14, 0.08, 0.12, 14, C('#1d1e22', -0.4), C('#1d1e22', -0.4)); mb.cyl(0, 0.08, 0, 0.04, 0.22, 0.04, 10, G, G); mb.lathe(0, 0.22, 0, [[0.04, 0], [0.18, 0.08], [0.2, 0.34], [0.17, 0.36]], 16, G); for (const s of [-1, 1]) { mb.push().T(s * 0.21, 0.46, 0, 0, 0, s * 0.4); mb.torusN(0, 0, 0, 0.07, 0.016, 0.016, 12, 3, G); mb.pop(); } mb.pop();
  VK.halo(mb.p(0, 1.3, 0), 0.5, '#ffe9a0', 0.25); VK.sh(mb, 0, 0, 1.4, 0.5, 0.38);
}
function v7Garage(mb, w, col = '#e63946', open = false, seed = 1) {
  const M = C('#9aa3ad', -0.7), B = C(col, -0.3), K = C('#1d1e22', -0.3);
  mb.box(-w / 2 - 0.2, 0, -0.1, -w / 2, 3.2, 0.08, C('#3a3d44', -0.6)); mb.box(w / 2, 0, -0.1, w / 2 + 0.2, 3.2, 0.08, C('#3a3d44', -0.6)); mb.box(-w / 2 - 0.2, 2.9, -0.1, w / 2 + 0.2, 3.3, 0.1, B);
  if (!open) for (let y = 0; y < 2.9; y += 0.16) mb.box(-w / 2, y, -0.05, w / 2, y + 0.14, -0.02, M);
  else { mb.box(-w / 2, 0, -2.2, w / 2, 2.9, -2.18, C('#2b2d31', -0.4)); mb.box(-w / 2, 2.6, -2.2, w / 2, 2.9, -0.05, M); mb.box(-w / 2, 0.0, -2.2, w / 2, 0.006, -0.05, C('#6a6d72', -0.3)); mb.push().T(-w / 4, 0, -1.5); mb.rbox(-0.4, 0, -0.25, 0.4, 1.0, 0.25, 0.03, C('#c8102e', -0.4), 2); for (let i = 0; i < 5; i++) mb.box(-0.38, 0.12 + i * 0.17, 0.25, 0.38, 0.26 + i * 0.17, 0.27, C('#a80d25', -0.4)); mb.pop(); mb.push().T(w / 4, 0, -1.2, 0.5); v7Kart(mb, col, 3 + seed); mb.pop(); VK.halo(mb.p(0, 2.3, -1.0), 0.8, '#fff1d0', 0.2); }
  mb.box(-w / 2 + 0.2, 3.0, 0.1, w / 2 - 0.2, 3.2, 0.12, C('#f4f4f4', 0.5));
}
function v7StartLights(mb) {
  mb.box(-1.6, -0.05, 0, 1.6, 0.05, 0.2, C('#1d1e22', -0.5));
  for (let i = 0; i < 5; i++) { const x = -1.2 + i * 0.6; mb.rbox(x - 0.22, -0.6, 0.05, x + 0.22, 0.0, 0.3, 0.04, C('#1d1e22', -0.5), 2); for (let j = 0; j < 2; j++) { mb.push().T(x, -0.18 - j * 0.24, 0.3, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.08, 0.02, 0.08, 12, C(j ? '#3a0d0d' : '#ff2a2a', j ? 0 : 1), C(j ? '#3a0d0d' : '#ff2a2a', j ? 0 : 1)); mb.pop(); } }
}
function v7Flag(mb, h = 2.4) {
  const M = C('#c9ced6', -0.88); mb.cyl(0, 0, 0, 0.12, 0.04, 0.12, 10, C('#3a3d44', -0.6), C('#3a3d44', -0.6)); mb.cyl(0, 0.04, 0, 0.02, h, 0.02, 8, M, M);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const x0 = 0.02 + i * 0.12, y0 = h - 0.05 - (j + 1) * 0.12, sag = Math.sin(i * 0.8) * 0.03; mb.box(x0, y0 + sag, -0.006, x0 + 0.12, y0 + 0.12 + sag, 0.006, C((i + j) % 2 ? '#16161a' : '#f4f4f4', -0.2)); }
}

/* ---- Kütüphane eşyaları ---- */
function v7ReadTable(mb, seed = 1) {
  const W = C('#7a5232', -0.3), Wd = C('#5a3820', -0.3);
  mb.box(-0.9, 0.72, -0.45, 0.9, 0.78, 0.45, W); for (const [x, z] of [[-0.8, -0.36], [0.8, -0.36], [-0.8, 0.36], [0.8, 0.36]]) mb.box(x - 0.04, 0, z - 0.04, x + 0.04, 0.72, z + 0.04, Wd);
  mb.box(-0.82, 0.78, -0.08, 0.82, 0.785, 0.08, C('#2f5a3a', 0));
  for (const x of [-0.45, 0.45]) { mb.push().T(x, 0.78, 0); v5BankerLamp(mb); mb.pop(); }
  for (const [x, z, r] of [[-0.3, 0.26, 0.3], [0.55, -0.25, -0.4]]) { mb.push().T(x, 0.785, z, r); mb.box(-0.16, 0, -0.11, 0.0, 0.02, 0.11, C('#fbf6ec', 0)); mb.box(0.0, 0, -0.11, 0.16, 0.02, 0.11, C('#f4ecd8', 0)); mb.box(-0.17, -0.002, -0.12, 0.17, 0.006, 0.12, C(BOOKC[(seed + 3) % BOOKC.length], 0)); mb.pop(); }
  mb.push().T(0.1, 0.785, 0.28); for (let i = 0; i < 3; i++) mb.box(-0.12, i * 0.04, -0.08, 0.12, i * 0.04 + 0.035, 0.08, C(BOOKC[(i + seed) % BOOKC.length], -0.1)); mb.pop();
  for (const [x, z, ry] of [[-0.45, 0.62, Math.PI], [0.45, 0.62, Math.PI], [-0.45, -0.62, 0], [0.45, -0.62, 0]]) { mb.push().T(x, 0, z, ry); v7Chair(mb, '#5a3820', '#2f5a3a'); mb.pop(); }
  VK.sh(mb, 0, 0, 1.1, 0.75, 0.38);
}
function v7Catalog(mb, w = 1.4, h = 1.3) {
  const W = C('#7a5232', -0.3), Wd = C('#8a6238', -0.3), Br = C('#c9a34a', -0.88);
  mb.box(-w / 2, 0, -0.3, w / 2, h, 0.3, W); for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { const x0 = -w / 2 + 0.05 + c * ((w - 0.1) / 4), y0 = 0.12 + r * ((h - 0.18) / 7), x1 = x0 + (w - 0.1) / 4 - 0.02, y1 = y0 + (h - 0.18) / 7 - 0.02; mb.box(x0, y0, 0.3, x1, y1, 0.315, Wd); mb.box((x0 + x1) / 2 - 0.04, y1 - 0.045, 0.315, (x0 + x1) / 2 + 0.04, y1 - 0.02, 0.32, C('#f4ecd8', 0)); mb.sphereS((x0 + x1) / 2, (y0 + y1) / 2 - 0.02, 0.322, 0.012, 0.012, 0.01, Br, 5, 3); }
  for (const [x, z] of [[-w / 2 + 0.06, -0.24], [w / 2 - 0.06, -0.24], [-w / 2 + 0.06, 0.24], [w / 2 - 0.06, 0.24]]) mb.box(x - 0.04, -0.0, z - 0.04, x + 0.04, 0.12, z + 0.04, W);
  mb.box(-w / 2 - 0.03, h, -0.33, w / 2 + 0.03, h + 0.05, 0.33, Wd);
}
function v7BookCart(mb) {
  const M = C('#2f5a3a', -0.5), K = C('#1d1e22', -0.3);
  for (const y of [0.3, 0.75]) { mb.box(-0.5, y, -0.22, 0.5, y + 0.03, 0.22, M); P.books(mb, -0.48, 0.48, y + 0.03, 0.36, Math.round(y * 10) + 5); }
  for (const [x, z] of [[-0.48, -0.2], [0.48, -0.2], [-0.48, 0.2], [0.48, 0.2]]) { mb.box(x - 0.015, 0.06, z - 0.015, x + 0.015, 1.0, z + 0.015, M); mb.sphereS(x, 0.04, z, 0.04, 0.04, 0.04, K, 6, 4); }
  limb(mb, [-0.5, 1.0, -0.2], [-0.5, 1.0, 0.2], [0.015, 0.015], M, 3);
  VK.sh(mb, 0, 0, 0.6, 0.3, 0.38);
}

/* ---- Grafiti parkı eşyaları ---- */
const SPRAY = ['#ff4fd8', '#38e1ff', '#ffe14f', '#5bff9a', '#ff8a3d', '#a78bfa', '#ff3b5c'];
// duvara grafiti (duvar yerel): dış hatlı balon şekiller, yıldızlar, oklar, damlalar
function v7Graffiti(mb, u0, u1, y0, y1, seed = 1) {
  const n = [0, 0, 1], K = C('#1b1b22', 0);
  for (let i = 0; i < Math.round((u1 - u0) * 1.1); i++) { const x = u0 + 0.4 + hs(i, seed) * (u1 - u0 - 0.8), y = y0 + 0.4 + hs(i, seed + 1) * (y1 - y0 - 0.8), rx = 0.35 + hs(i, seed + 2) * 0.55, ry = 0.25 + hs(i, seed + 3) * 0.4, c = C(SPRAY[Math.floor(hs(i, seed + 4) * SPRAY.length)], 0.15); mb.sphereS(x, y, 0.02, rx + 0.06, ry + 0.06, 0.004, K, 16, 6); mb.sphereS(x, y, 0.026, rx, ry, 0.004, c, 16, 6); mb.sphereS(x - rx * 0.3, y + ry * 0.35, 0.03, rx * 0.25, ry * 0.18, 0.003, C('#ffffff', 0.3), 10, 4); if (hs(i, seed + 5) > 0.5) for (let d = 0; d < 2; d++) { const dx = x + (hs(i * 2 + d, seed + 6) - 0.5) * rx, L = 0.15 + hs(i + d, seed + 7) * 0.4; mb.box(dx - 0.018, y - ry - L, 0.026, dx + 0.018, y - ry * 0.7, 0.03, c); } }
  for (let i = 0; i < Math.round((u1 - u0) * 0.5); i++) { const x = u0 + 0.3 + hs(i, seed + 20) * (u1 - u0 - 0.6), y = y0 + 0.3 + hs(i, seed + 21) * (y1 - y0 - 0.6), r = 0.15 + hs(i, seed + 22) * 0.15, c = C(SPRAY[(i + seed) % SPRAY.length], 0.15); for (let k = 0; k < 10; k++) { const a0 = (k / 10) * TAU + Math.PI / 2, a1 = ((k + 1) / 10) * TAU + Math.PI / 2, r0 = k % 2 ? r * 0.42 : r, r1 = k % 2 ? r : r * 0.42; mb.triN([x, y, 0.034], [x + Math.cos(a0) * r0, y + Math.sin(a0) * r0, 0.034], [x + Math.cos(a1) * r1, y + Math.sin(a1) * r1, 0.034], n, n, n, c); } }
}
function v7Fence(k, H = 3.0, holes = []) {
  const mb = SEC(k), M = C('#9aa3ad', -0.85), Md = C('#7d848c', -0.85); wAt(mb, k, 0, 0.1);
  for (let u = -RW; u <= RW + 1e-6; u += 2.6) mb.cyl(u, 0, 0, 0.05, H, 0.05, 8, M, M);
  mb.push().T(0, H, 0, 0, 0, Math.PI / 2); mb.cyl(0, -RW, 0, 0.04, RW, 0.04, 8, M, M); mb.pop(); mb.push().T(0, 0.1, 0, 0, 0, Math.PI / 2); mb.cyl(0, -RW, 0, 0.03, RW, 0.03, 8, M, M); mb.pop();
  for (let i = -30; i < 30; i++) { const u = i * 0.32; for (const s of [-1, 1]) { const a = [u, 0.1], b = [u + s * (H - 0.1), H]; let ua = a[0], ub = b[0], ya = a[1], yb = b[1]; const cl = (uu) => Math.max(-RW, Math.min(RW, uu)); if ((ua < -RW && ub < -RW) || (ua > RW && ub > RW)) continue; const t0 = ua < -RW ? (-RW - ua) / (ub - ua) : ua > RW ? (RW - ua) / (ub - ua) : 0, t1 = ub < -RW ? (-RW - ua) / (ub - ua) : ub > RW ? (RW - ua) / (ub - ua) : 1; if (t1 <= t0) continue; const p0 = [ua + (ub - ua) * t0, ya + (yb - ya) * t0], p1 = [ua + (ub - ua) * t1, ya + (yb - ya) * t1]; limb(mb, [cl(p0[0]), p0[1], 0], [cl(p1[0]), p1[1], 0], [0.008, 0.008], Md, 2); } }
  mb.pop();
}
function v7City(mb0, k, seed = 1) {
  const mb = mb0; wAt(mb, k, 0, 0);
  for (let i = 0; i < 9; i++) { const u = -10 + i * 2.6 + hs(i, seed) * 0.8, w = 1.6 + hs(i, seed + 1) * 1.2, h = 4 + hs(i, seed + 2) * 4, z = -5 - hs(i, seed + 3) * 6, c = ['#c9a98a', '#b89a80', '#d9c0a0', '#a58a74'][i % 4]; mb.box(u - w / 2, 0, z - 1.2, u + w / 2, h, z, C(c, -0.1)); for (let r = 0; r < Math.floor(h / 1.2); r++) for (let cc = 0; cc < 3; cc++) { const x = u - w / 2 + 0.25 + cc * ((w - 0.5) / 2); mb.box(x - 0.14, 0.8 + r * 1.2, z + 0.001, x + 0.14, 1.2 + r * 1.2, z + 0.02, C(hs(r * 3 + cc, i) > 0.7 ? '#ffd9a0' : '#5a6f86', hs(r * 3 + cc, i) > 0.7 ? 0.5 : -0.3)); } }
  mb.pop();
}
function v7Hoop(mb) {
  const M = C('#9aa3ad', -0.85); mb.box(-0.6, 2.6, 0.2, 0.6, 3.4, 0.25, C('#f4f4f4', -0.2)); mb.box(-0.25, 2.75, 0.25, 0.25, 3.05, 0.26, C('#ff3b5c', 0)); mb.box(-0.21, 2.79, 0.26, 0.21, 3.01, 0.265, C('#f4f4f4', -0.2));
  limb(mb, [0, 3.0, 0], [0, 2.95, 0.22], [0.03, 0.03], M, 3); mb.torusN(0, 2.75, 0.48, 0.22, 0.015, 0.015, 18, 3, C('#ff6a13', -0.4)); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; limb(mb, [Math.cos(a) * 0.22, 2.75, 0.48 + Math.sin(a) * 0.22], [Math.cos(a) * 0.14, 2.45, 0.48 + Math.sin(a) * 0.14], [0.004, 0.004], C('#f4f4f4', 0), 2); }
}
function v7QuarterPipe(mb, w = 4.0, h = 1.4, seed = 1) {
  const n = 10, Cn = C('#b4b0aa', -0.3), Cs = C('#9e9a94', -0.3), M = C('#c9ced6', -0.9);
  for (let i = 0; i < n; i++) { const a0 = (i / n) * (Math.PI / 2), a1 = ((i + 1) / n) * (Math.PI / 2), z0 = h - Math.sin(a0) * h, y0 = h - Math.cos(a0) * h, z1 = h - Math.sin(a1) * h, y1 = h - Math.cos(a1) * h, nn = vnorm([0, Math.sin(a0 + 0.08), Math.cos(a0 + 0.08)]); mb.quadN([-w / 2, y0, z0], [w / 2, y0, z0], [w / 2, y1, z1], [-w / 2, y1, z1], nn, nn, nn, nn, Cn); }
  for (const s of [-1, 1]) { const nS = [s, 0, 0]; for (let i = 0; i < n; i++) { const a0 = (i / n) * (Math.PI / 2), a1 = ((i + 1) / n) * (Math.PI / 2); mb.triN([s * w / 2, 0, 0], [s * w / 2, h - Math.cos(a0) * h, h - Math.sin(a0) * h], [s * w / 2, h - Math.cos(a1) * h, h - Math.sin(a1) * h], nS, nS, nS, Cs); } }
  mb.box(-w / 2, 0, -0.6, w / 2, h, 0.0, Cs); mb.box(-w / 2, h - 0.02, -0.6, w / 2, h + 0.02, 0.0, C('#8a8f96', -0.5));
  mb.push().T(0, h, 0.0, 0, 0, Math.PI / 2); mb.cyl(0, -w / 2, 0, 0.04, w / 2, 0.04, 10, M, M); mb.pop();
}
function v7Skateboard(mb, col = '#ff4fd8', flip = false) {
  const D = C(col, -0.2), K = C('#1b1b22', -0.3), M = C('#c9ced6', -0.88);
  mb.push().T(0, flip ? 0.13 : 0.08, 0, 0, 0, flip ? Math.PI : 0); mb.rbox(-0.1, -0.012, -0.4, 0.1, 0.012, 0.4, 0.02, flip ? D : K, 2); mb.rbox(-0.1, flip ? 0.012 : -0.016, -0.4, 0.1, flip ? 0.014 : -0.012, 0.4, 0.02, flip ? K : D, 2);
  for (const z of [-0.27, 0.27]) { mb.box(-0.07, -0.05, z - 0.02, 0.07, -0.012, z + 0.02, M); for (const x of [-0.08, 0.08]) { mb.push().T(x, -0.06, z, 0, 0, Math.PI / 2); mb.cyl(0, -0.02, 0, 0.028, 0.02, 0.028, 10, C('#f4f4f4', 0), C('#f4f4f4', 0)); mb.pop(); } } mb.pop();
  VK.sh(mb, 0, 0, 0.14, 0.45, 0.35);
}
function v7Boombox(mb) {
  const B = C('#1b1b22', -0.5), M = C('#c9ced6', -0.88);
  mb.rbox(-0.3, 0, -0.1, 0.3, 0.3, 0.1, 0.03, B, 2); for (const x of [-0.17, 0.17]) { mb.push().T(x, 0.15, 0.1, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.09, 0.01, 0.09, 14, M, M); mb.cyl(0, 0.01, 0, 0.07, 0.02, 0.07, 14, C('#2b2b33', -0.4), C('#2b2b33', -0.4)); mb.pop(); }
  mb.box(-0.06, 0.18, 0.1, 0.06, 0.26, 0.105, C('#5bff9a', 1)); limb(mb, [-0.22, 0.3, 0], [-0.2, 0.4, 0], [0.012, 0.012], M, 3); limb(mb, [0.22, 0.3, 0], [0.2, 0.4, 0], [0.012, 0.012], M, 3); limb(mb, [-0.2, 0.4, 0], [0.2, 0.4, 0], [0.012, 0.012], M, 3);
}
function v7Spray(mb, col) { mb.cyl(0, 0, 0, 0.032, 0.16, 0.032, 10, C(col, -0.4), C(col, -0.4)); mb.cyl(0, 0.16, 0, 0.022, 0.19, 0.016, 8, C('#c9ced6', -0.85), C('#c9ced6', -0.85)); mb.cyl(0, 0.19, 0, 0.012, 0.21, 0.012, 6, C('#f4f4f4', 0), C('#f4f4f4', 0)); }
function v7Ledge(mb, w = 2.2) { mb.box(-w / 2, 0, -0.3, w / 2, 0.45, 0.3, C('#a9a6a1', -0.3)); mb.box(-w / 2, 0.43, 0.27, w / 2, 0.47, 0.31, C('#c9ced6', -0.9)); mb.box(-w / 2, 0.43, -0.31, w / 2, 0.47, -0.27, C('#c9ced6', -0.9)); v7Graffiti(mb, -w / 2, w / 2, 0.0, 0.0, 1); VK.sh(mb, 0, 0, w * 0.55, 0.38, 0.4); }

/* ====================== mekânlar ====================== */
Object.assign(VENUES, {
  /* ---- Doğru mu Yanlış mı: mahkeme salonu ---- */
  dyg: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'wood', tableO: { wood: '#6b4428' }, chair: 'wood', chairO: { wood: '#5a3820' },
    rug: 'medal', rugO: { a: '#1c2e4a', b: '#c9a34a', c: '#2a4468', petals: 12, y: 0.03 },
    L: VL2.court, sky: ['#14110e', '#2a241c', '#16120e'], sun: [0.5, 0.78, 0.4], shR: 8.6, parts: 'dust',
    post: { bloom: 0.34, th: 0.84, sat: 1.08, con: 0.13, vig: 0.36, tint: [1.02, 1.0, 0.97] },
    det: 0.14, detS: 0.45,
    logos: [[2, -4.6, 3.3, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#3e2c1c', { lip: '#5e4430', fade: '#110d0a', band: '#c9a34a', bandE: -0.8 });
      vMarble(mb, 1.3, '#ece6dc', '#2a2a2f', '#b8954a', { border: '#3a2414', bw: 0.5 });
      const WALL = { wall: '#2e3d58', H: 6.0, dado: '#5a3820', dadoH: 2.4, panel: '#6b4428', panelW: 1.1, rail: '#c9a34a', base: '#2a1a0f', crown: '#6b4428', pat: 'stripe', pc: '#34445f', ps: 0.6 };
      // 0: tabela, iki yanda adalet sancakları, üstte terazi amblemi ve saat
      vWall(0, WALL, []);
      vSign('frame', '#c9a34a', '#fff8ec', { lampC: '#c9a34a' });
      VK.inSec(0, (s) => { for (const u of [-2.7, 2.7]) { wAt(s, 0, u + (u < 0 ? -0.4 : 0.4), 0.35); v7Banner(s, '#1f3a5f', u < 0 ? 1 : -1); s.pop(); } wAt(s, 0, 0, 0.02, 4.55); s.box(-0.7, -0.62, 0, 0.7, 0.62, 0.04, C('#c9a34a', -0.85)); s.box(-0.62, -0.54, 0.04, 0.62, 0.54, 0.05, C('#1f3a5f', 0)); s.push().T(0, 0.08, 0.06, 0, 0, 0, 0.75); v7Scales(s, 1); s.pop(); s.pop(); for (const u of [-5.4, 5.4]) { wAt(s, 0, u, 0, 4.2); P.clock(s, 0.4, '#5a3820', '#fbf6ec'); s.pop(); } });
      for (const u of [-6.6, 6.6]) P.sconce(SEC(0), 0, u, 3.2, '#f3e3c3', '#c9a34a');
      // 1: sağ — yüksek yargıç kürsüsü ve tanık kürsüsü
      vWall(1, WALL, []);
      VK.inSec(1, (s) => { wAt(s, 1, 0, 1.0); v7JudgeBench(s); s.pop(); wAt(s, 1, 3.4, 0.9); v7Witness(s); s.pop(); });
      for (const u of [-5.6, 5.6]) P.sconce(SEC(1), 1, u, 3.2, '#f3e3c3', '#c9a34a');
      // 2: ön — kapı, iki uzun pencere, logo
      const HW2 = [{ u0: -1.1, u1: 1.1, y0: 0, y1: 2.7 }, { u0: 3.6, u1: 5.4, y0: 1.2, y1: 4.6 }];
      vWall(2, WALL, HW2);
      for (const u of [-0.55, 0.55]) vDoor(2, u, { w: 1.1, h: 2.7, frame: '#5a3820', door: '#6b4428', knob: '#c9a34a' });
      vWindow(2, HW2[1], { frame: '#5a3820', view: 'city', sun: true, sunHex: '#fff1d0', sunA: 0.12, nx: 2, ny: 4 });
      VK.inSec(2, (s) => { wAt(s, 2, -4.6, 0, 3.3); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#c9a34a', -0.85)); s.pop(); });
      // 3: sol — jüri locası
      vWall(3, WALL, []);
      VK.inSec(3, (s) => { wAt(s, 3, 0.2, 1.35); v7JuryBox(s, 4.4); s.pop(); });
      for (const u of [-5.4, 5.4]) P.sconce(SEC(3), 3, u, 3.2, '#f3e3c3', '#c9a34a');
      // salon: izleyici sıraları, delil masası, fotoğraf panosu, zabıt kâtibi, bitkiler
      for (const [x, z] of [[-3.2, 5.0], [3.2, 5.0], [-3.2, 6.1], [3.2, 6.1]]) { mb.push().T(x, 0, z, Math.PI); v7Pew(mb, 2.6); mb.pop(); }
      mb.push().T(-4.6, 0, -4.6, 0.6); v7Evidence(mb); mb.pop();
      VK.tall(4.7, -4.6, (m) => v7PhotoBoard(m), Math.atan2(-4.7, 4.6));
      mb.push().T(4.6, 0, 2.9, -Math.PI / 2 + 0.3); P.desk(mb, 1.0, 0.6, '#6b4428', '#5a3820'); mb.push().T(0, 0.76, 0); mb.rbox(-0.14, 0, -0.1, 0.14, 0.06, 0.1, 0.02, C('#2b2d31', -0.6), 2); for (let i = 0; i < 6; i++) mb.box(-0.11 + i * 0.04, 0.06, -0.06, -0.08 + i * 0.04, 0.07, 0.06, C('#e9e9e9', 0)); mb.pop(); mb.push().T(0, 0, 0.55, Math.PI); v7Chair(mb, '#5a3820', '#1f3a5f'); mb.pop(); mb.pop();
      for (const [x, z] of [[-6.95, -6.95], [6.95, -6.95], [-6.95, 6.95], [6.95, 6.95]]) VK.tall(x, z, (m) => P.ficus(m, 1.05, '#c9a34a'));
    },
  },
  /* ---- Başkent Yarışı: havalimanı kapısı ---- */
  byr: {
    room: 1, raw: 1, wallH: 7.0, secShadow: 1,
    table: 'glass', tableO: { glow: '#4cc9f0', top: '#dfe8f0' }, chair: 'office',
    rug: 'round', rugO: { rug: '#16485e', rugB: '#ffd23f' },
    L: VL2.terminal, sky: ['#2b2f5e', '#e98a62', '#f3c49c'], sun: [0.55, 0.62, 0.35], shR: 9.0, parts: null,
    post: { bloom: 0.38, th: 0.84, sat: 1.08, con: 0.12, vig: 0.32, tint: [1.02, 0.99, 0.98] },
    det: 0.1, detS: 0.4,
    logos: [[3, 5.6, 3.6, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#6f747a', '#666b71', 0.3);
      vApron(mb, '#c6c9cc', { flat: true, fade: '#6f747a' });
      vFloorTile(mb, 1.95, '#a4a9b0', '#9da2a9', '#82878f', { e: -0.78, jit: 0.035 });
      for (let i = 0; i < 6; i++) VK.pool([5.5, 0, -5.4 + i * 2.15], 2.3, '#ffb877', 0.12, 0.85);
      for (const [x0, z0, x1, z1] of [[-RW, -4.4, -4.0, 4.4], [-4.0, -RW, 4.0, -4.5], [3.9, -4.6, RW, -2.2]]) { VK.quad(mb, x0, z0, x1, z1, C('#24365a', 0), 0.005); VK.quad(mb, x0 + 0.08, z0 + 0.08, x1 - 0.08, z1 - 0.08, C('#2b4170', 0), 0.0055); for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.45) for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.45) { const d = 0.07; mb.quadN([x, 0.006, z - d], [x + d, 0.006, z], [x, 0.006, z + d], [x - d, 0.006, z], UPV, UPV, UPV, UPV, C((Math.round(x / 0.45) + Math.round(z / 0.45)) % 2 ? '#3f64a8' : '#f2c230', 0)); } }
      for (let i = 0; i < 160; i++) { const x = (hs(i, 81) - 0.5) * 15, z = (hs(i, 82) - 0.5) * 15; if (Math.hypot(x, z) < 3.6) continue; mb.disc(x, 0.004, z, 0.025, 0.025, 5, C(i % 3 ? '#9aa0a6' : '#7d848c', -0.5), C(i % 3 ? '#9aa0a6' : '#7d848c', -0.5)); }
      for (const [x0, z0, x1, z1] of [[-0.08, 3.6, 0.08, RW], [-RW, -0.08, -3.6, 0.08]]) VK.quad(mb, x0, z0, x1, z1, C('#ffc94a', 0), 0.006);
      const WALL = { wall: '#d9dde2', H: 7.0, dado: '#2a6fdb', dadoH: 0.3, base: '#1f4e8c', crown: '#2a6fdb', pat: 'stripe', pc: '#cfd4da', ps: 1.0 };
      // 0: tabela, kalkış panoları, dünya saatleri
      vWall(0, WALL, []);
      vSign('frame', '#2b2d31', '#f4f6f9', { lamps: false });
      VK.inSec(0, (s) => { wAt(s, 0, 0, 0); for (let u = -RW + 0.1; u < RW; u += 0.22) { if (Math.abs(u) < 2.0) continue; s.box(u, 0.3, 0.0, u + 0.14, 5.0, 0.06, C(['#b08455', '#a77a4f', '#b88c5c'][Math.floor(hs(Math.round(u * 10), 3) * 3)], -0.2)); } s.pop(); for (const u of [-4.7, 4.7]) { wAt(s, 0, u, 0.06, 2.6); v7Board(s, 2.8, 1.7, Math.round(u + 7)); s.pop(); } for (let i = 0; i < 3; i++) { wAt(s, 0, -1.2 + i * 1.2, 0, 3.75); P.clock(s, 0.3, '#2b2d31', '#f4f6f9'); s.pop(); } wAt(s, 0, 0, 0, 4.4); s.box(-2.0, -0.08, 0, 2.0, 0.08, 0.06, C('#2a6fdb', 0.6)); s.pop(); });
      // 1: sağ — cam cephe; dışarıda uçak, kule
      const HW1 = [{ u0: -RW + 0.4, u1: RW - 0.4, y0: 0.3, y1: 5.2 }];
      vWall(1, WALL, HW1); vWindow(1, HW1[0], { frame: '#2b2d31', view: 'dusk', sun: true, sunHex: '#ffc58a', sunA: 0.18, nx: 6, ny: 2, sill: false });
      VK.inSec(1, (s) => { wAt(s, 1, 0, 0); for (let i = 0; i < 12; i++) VK.quad(s, -28 + i * 5, -19.5, -26 + i * 5, -19.2, C('#f4f4f4', 0), -0.014); VK.quad(s, -30, -3.0, 30, -2.85, C('#ffc94a', 0), -0.014); s.pop(); wAt(s, 1, 2.5, -14.0, 0, -Math.PI / 2); v7Plane(s); s.pop(); wAt(s, 1, 2.5, 0); s.box(-1.0, 1.8, -5.0, 1.0, 3.6, 0.0, C('#c9ced6', -0.7)); s.box(-1.05, 1.6, -5.0, 1.05, 1.8, 0.0, C('#5a6068', -0.6)); limb(s, [0, 0, -4.4], [0, 1.6, -4.4], [0.15, 0.15], C('#5a6068', -0.6), 5); s.pop(); });
      { const p = wXZ(1, -15, -28); mb.push().T(p[0], 0, p[1]); v7Tower(mb); mb.pop(); }
      // 2: ön — kapı tezgâhı, kapı numarası, biniş kapısı
      vWall(2, WALL, [{ u0: 2.0, u1: 3.8, y0: 0, y1: 2.6 }]);
      vDoor(2, 2.9, { w: 1.8, h: 2.6, frame: '#2b2d31', door: '#5a6068', glass: '#cfe6ff', knob: '#c9ced6' });
      VK.inSec(2, (s) => { wAt(s, 2, -1.4, 0.9); v7Counter(s, 3.0); s.pop(); wAt(s, 2, -1.4, 0, 3.0); s.box(-1.0, -0.4, 0, 1.0, 0.4, 0.08, C('#2a6fdb', -0.3)); s.box(-0.9, -0.32, 0.08, 0.9, 0.32, 0.085, C('#0f1a2e', 0)); v4Digits(s, '12', 0, 0, 0.086, 0.34, 0.5, '#ffc94a', '#1b2233'); s.pop(); wAt(s, 2, 2.9, 0, 3.0); s.box(-0.9, -0.15, 0, 0.9, 0.15, 0.06, C('#ffc94a', 0.6)); s.pop(); v4Stanchions(s, [wXZ(2, 1.2, 1.6), wXZ(2, 1.2, 2.8), wXZ(2, 4.6, 2.8), wXZ(2, 4.6, 1.6)], '#c9ced6', '#2a6fdb'); });
      // 3: sol — kafe cephesi, logo
      vWall(3, WALL, [{ u0: -4.0, u1: -0.6, y0: 0.9, y1: 2.8 }]);
      vWindow(3, { u0: -4.0, u1: -0.6, y0: 0.9, y1: 2.8 }, { frame: '#3a2414', view: 'lit', sun: false, nx: 3, ny: 1 });
      VK.inSec(3, (s) => { wAt(s, 3, -2.3, 0, 3.15); v2Awning(s, 3.8, 0, 0.6, '#3a2414', '#f4ecd8', 10); s.pop(); wAt(s, 3, -2.3, 0.4); P.counter(s, 3.2, 0.95, 0.6, '#3a2414', '#f4ecd8', { rail: false }); s.pop(); for (const u of [-3.4, -2.3, -1.2]) { wAt(s, 3, u, 0.45, 0.95); s.lathe(0, 0, 0, [[0.04, 0], [0.05, 0.11]], 10, C('#f4f1ea', -0.2), 'b'); s.pop(); } wAt(s, 3, 3.0, 0.3); P.monstera(s, 1.1, '#2b2d31'); s.pop(); wAt(s, 3, 5.6, 0, 3.6); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#2b2d31', -0.6)); s.pop(); });
      // salon: koltuk sıraları, bavullar, valiz arabası, bilgi ekranları, çöp kutuları
      for (const [x, z, ry] of [[-5.2, -2.6, Math.PI / 2], [-5.2, 2.6, Math.PI / 2], [5.0, -3.4, -Math.PI / 2], [-2.6, -5.6, 0], [2.6, -5.6, 0]]) { mb.push().T(x, 0, z, ry); v7Seats(mb, 4, '#2a6fdb'); mb.pop(); }
      for (const [x, z, c, s] of [[-4.4, -1.4, '#e63946', 1], [-4.1, -1.0, '#ffd166', 0.8], [3.8, -4.4, '#2a9d8f', 1], [-1.6, -4.8, '#8a5cf6', 0.9], [4.4, 3.4, '#ff8fc7', 0.85]]) { mb.push().T(x, 0, z, hs(x, z) * 4); v7Suitcase(mb, c, s); mb.pop(); }
      VK.tall(4.4, 4.6, (m) => v7Cart(m), -0.7);
      for (const [x, z] of [[5.6, 0.6], [-5.8, 5.6]]) VK.tall(x, z, (m) => v7InfoPillar(m), Math.atan2(-x, -z));
      for (const [x, z] of [[-6.6, -6.6], [6.6, 6.4]]) VK.tall(x, z, (m) => P.ficus(m, 1.05, '#2b2d31'));
      mb.push().T(1.8, 0, 6.2, 0.4); mb.box(-0.15, 0, -0.12, 0.15, 0.04, 0.12, C('#ffd23f', -0.3)); { const n1 = vnorm([0, 0.3, 1]); for (const s of [-1, 1]) mb.quadN([-0.15, 0.04, s * 0.12], [0.15, 0.04, s * 0.12], [0.1, 0.62, s * 0.02], [-0.1, 0.62, s * 0.02], n1, n1, n1, n1, C('#ffd23f', -0.3)); } mb.pop();
    },
  },
  /* ---- Parmak Yarışı: go-kart pisti ve pit alanı ---- */
  pry: {
    room: 1, raw: 1, wallH: 6.0, secShadow: 1,
    table: 'tire', tableO: { glow: '#e63946' }, chair: 'stool', chairO: { leg: '#2b2d31' },
    rug: 'checkerflag', rugO: {},
    L: VL2.racing, sky: ['#6fb7ee', '#ffe9c6', '#efe2d2'], sun: [0.5, 0.75, 0.42], shR: 9.0, parts: 'confetti',
    post: { bloom: 0.3, th: 0.9, sat: 1.1, con: 0.1, vig: 0.26, tint: [1.02, 1.0, 0.98] },
    det: 0.22, detS: 0.6,
    logos: [[3, 5.2, 3.6, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#5f8f45', '#55833d', 0.3);
      VK.quad(mb, -RW, -RW, RW, RW, C('#3a3c40', 0), 0.0); VK.noise(mb, -RW, -RW, RW, RW, 0.6, '#43464b', '#36383c', 0.3, -0.2, 0.002);
      for (const [r0, r1, n] of [[3.6, 3.9, 40], [6.4, 6.7, 64]]) for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU; mb.quadN([Math.cos(a0) * r0, 0.006, Math.sin(a0) * r0], [Math.cos(a0) * r1, 0.006, Math.sin(a0) * r1], [Math.cos(a1) * r1, 0.006, Math.sin(a1) * r1], [Math.cos(a1) * r0, 0.006, Math.sin(a1) * r0], UPV, UPV, UPV, UPV, C(k % 2 ? '#f4f4f4' : '#e63946', -0.2)); }
      for (let i = 0; i < 2; i++) for (let j = 0; j < 7; j++) VK.quad(mb, -0.35 + i * 0.35, 3.95 + j * 0.35, i * 0.35, 4.3 + j * 0.35, C((i + j) % 2 ? '#16161a' : '#f4f4f4', -0.2), 0.008);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; v4Seg(mb, Math.cos(a) * 5.0, Math.sin(a) * 5.0, Math.cos(a + 0.15) * 5.0, Math.sin(a + 0.15) * 5.0, 0.04, C('#f4f4f4', -0.1), 0.007); }
      for (let i = 0; i < 14; i++) { const a = hs(i, 91) * TAU, r = 4.4 + hs(i, 92) * 1.6; let px = Math.cos(a) * r, pz = Math.sin(a) * r; for (let j = 1; j < 6; j++) { const b = a + j * 0.08, nx = Math.cos(b) * (r + j * 0.05), nz = Math.sin(b) * (r + j * 0.05); v4Seg(mb, px, pz, nx, nz, 0.05, C('#1d1e22', 0), 0.0065); px = nx; pz = nz; } }
      // 0: pit garajları (biri açık), tabela
      VK.inSec(0, (s) => { wAt(s, 0, 0, 0); s.box(-RW, 0, -0.3, RW, 3.6, 0, C('#d9dcdf', -0.3)); s.box(-RW, 3.3, 0, RW, 3.6, 0.05, C('#e63946', -0.2)); s.pop(); for (const [u, c, o] of [[-4.8, '#e63946', true], [4.8, '#2a6fdb', false]]) { wAt(s, 0, u, 0); v7Garage(s, 3.4, c, o, Math.round(u + 9)); s.pop(); } });
      vSign('frame', '#2b2d31', '#f4f4f4', { lampC: '#2b2b2b' });
      // 1: sağ — tribün
      VK.inSec(1, (s) => { wAt(s, 1, 0, 2.4); v2Bleachers(s, 8.0, 5); s.pop(); wAt(s, 1, 0, 0); s.box(-RW, 0, -0.3, RW, 1.2, 0, C('#f4f4f4', -0.3)); for (let i = 0; i < 8; i++) s.box(-RW + i * 1.95 + 0.1, 0.2, 0.0, -RW + i * 1.95 + 1.85, 1.0, 0.02, C(['#e63946', '#2a6fdb', '#ffd23f', '#2a9d8f'][i % 4], 0)); s.pop(); });
      // 2: ön — lastik bariyeri, başlangıç ışıkları, damalı bayraklar
      VK.inSec(2, (s) => { for (let u = -RW + 0.4; u < RW - 0.2; u += 0.62) { if (Math.abs(u) < 0.6) continue; wAt(s, 2, u, 0.35); v7Tire(s, 3, '#1d1e22', Math.round(u * 2) % 2 ? '#f4f4f4' : '#e63946', 0); s.pop(); } wAt(s, 2, 0, 0, 3.4); v7StartLights(s); s.pop(); for (const u of [-1.0, 1.0]) { wAt(s, 2, u, 0.4); v7Flag(s, 2.4); s.pop(); } });
      // 3: sol — kürsü, sponsor panoları, yakıt pompası, logo
      VK.inSec(3, (s) => { wAt(s, 3, -1.0, 0.8); v7Podium(s); s.pop(); wAt(s, 3, 0, 0); for (let i = 0; i < 5; i++) { const u = -6.6 + i * 3.1; s.box(u - 1.2, 2.2, 0.02, u + 1.2, 3.0, 0.06, C(['#2a6fdb', '#ffd23f', '#e63946', '#2a9d8f', '#8a5cf6'][i], 0.2)); s.box(u - 0.9, 2.45, 0.06, u + 0.9, 2.75, 0.07, C('#f4f4f4', 0.4)); } s.pop(); wAt(s, 3, 3.2, 0.5); s.rbox(-0.3, 0, -0.25, 0.3, 1.6, 0.25, 0.05, C('#ffd23f', -0.3), 2); s.box(-0.22, 1.0, 0.25, 0.22, 1.4, 0.26, C('#0f1a2e', 1)); limb(s, [0.3, 1.2, 0.0], [0.6, 0.3, 0.3], [0.03, 0.03], C('#1d1e22', -0.3), 6); s.pop(); wAt(s, 3, 5.2, 0, 3.6); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#2b2d31', -0.5)); s.pop(); });
      // pist: kartlar, lastik yığınları, koniler, takım arabası, benzin bidonları, kask
      for (const [x, z, ry, c, n] of [[4.9, 2.6, -0.4, '#2a6fdb', 12], [-4.8, -3.4, 2.4, '#ffd23f', 5], [-1.2, 5.6, Math.PI / 2 + 0.1, '#2a9d8f', 9]]) { mb.push().T(x, 0, z, ry); v7Kart(mb, c, n); mb.pop(); }
      for (const [x, z] of [[-6.95, -6.95], [6.95, -6.95], [6.95, 6.95], [-6.95, 6.95]]) { mb.push().T(x, 0, z); v7Tire(mb, 4, '#1d1e22', '#e63946'); mb.pop(); }
      for (const [x, z] of [[2.8, -4.8], [-3.0, 4.6], [5.4, -1.2], [-5.6, 1.4]]) { mb.push().T(x, 0, z); v4Cone(mb); mb.pop(); }
      mb.push().T(-3.6, 0, -5.4, 0.5); mb.rbox(-0.45, 0.1, -0.3, 0.45, 0.95, 0.3, 0.03, C('#c8102e', -0.4), 2); for (let i = 0; i < 4; i++) mb.box(-0.43, 0.2 + i * 0.18, 0.3, 0.43, 0.34 + i * 0.18, 0.32, C('#a80d25', -0.4)); for (const [x, z] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) mb.sphereS(x, 0.05, z, 0.05, 0.05, 0.05, C('#1d1e22', -0.3), 6, 4); mb.push().T(0.0, 0.95, 0); mb.sphereS(0, 0.14, 0, 0.16, 0.15, 0.17, C('#f4f4f4', -0.6), 12, 8); mb.box(-0.12, 0.08, 0.12, 0.12, 0.18, 0.17, C('#1d2b3a', -0.85)); mb.pop(); VK.sh(mb, 0, 0, 0.55, 0.4, 0.38); mb.pop();
      for (const [x, z, c] of [[3.6, 5.4, '#c8102e'], [3.95, 5.55, '#2a9d8f']]) { mb.push().T(x, 0, z, 0.3); mb.rbox(-0.14, 0, -0.08, 0.14, 0.4, 0.08, 0.03, C(c, -0.4), 2); mb.box(-0.06, 0.4, -0.02, 0.06, 0.46, 0.02, C('#1d1e22', -0.3)); mb.pop(); }
    },
  },
  /* ---- Kelime Avı: büyük halk kütüphanesi ---- */
  kav: {
    room: 1, raw: 1, wallH: 6.0,
    table: 'wood', tableO: { wood: '#7a5232' }, chair: 'wood', chairO: { wood: '#5a3820' },
    rug: 'medal', rugO: { a: '#2f5a3a', b: '#d9b35a', c: '#7a1f2b', petals: 8, y: 0.03 },
    L: VL2.library, sky: ['#1e1a16', '#3a3028', '#1e1a16'], sun: [0.55, 0.75, 0.35], shR: 8.6, parts: 'dust',
    post: { bloom: 0.38, th: 0.83, sat: 1.1, con: 0.13, vig: 0.36, tint: [1.04, 1.0, 0.94] },
    det: 0.12, detS: 0.45,
    logos: [[2, 4.8, 3.2, 0.8, 0.8]],
    build(mb) {
      vApron(mb, '#4e3a28', { lip: '#8a6a48', fade: '#151110' });
      vFloorWood(mb, ['#8a5a36', '#7f5231', '#94623c', '#76492b', '#86573a'], { w: 0.2, e: -0.35, gap: '#3a2414', border: '#4a2e1a', bw: 0.5 });
      const WALL = { wall: '#2f4a3a', H: 6.0, base: '#3a2414', crown: '#c9a34a', pat: 'stripe', pc: '#34503f', ps: 0.8 };
      // 0: tabela, iki yanda kitaplıklar, üstte saat
      vWall(0, WALL, []);
      vSign('frame', '#5a3820', '#fff8ec', { lampC: '#c9a34a' });
      VK.inSec(0, (s) => { for (const [u, sd] of [[-3.3, 2], [-5.6, 4], [3.3, 6], [5.6, 8]]) { wAt(s, 0, u, 0.24); v7Bookcase(s, 2.2, 3.4, '#7a5232', sd, 6); s.pop(); } wAt(s, 0, 0, 0, 4.2); P.clock(s, 0.55, '#5a3820', '#fbf6ec'); s.pop(); });
      // 1 ve 3: alt kat kitaplıklar, üstte kemerli pencereler
      for (const k of [1, 3]) {
        const holes = [-4.6, 0, 4.6].map((u) => ({ u0: u - 0.9, u1: u + 0.9, y0: 3.8, y1: 5.4 }));
        vWall(k, WALL, holes); for (const h of holes) vWindow(k, h, { frame: '#5a3820', view: 'sky', sun: true, sunHex: '#fff4d6', sunA: 0.08, nx: 2, ny: 2, sill: false });
        VK.inSec(k, (s) => { for (const [i, u] of [-5.5, -3.2, -0.9, 1.4, 3.7, 6.0].entries()) { wAt(s, k, u, 0.24); v7Bookcase(s, 2.2, 3.5, '#7a5232', i + k * 7, 6); s.pop(); } wAt(s, k, 0, 0.0); s.box(-RW, 3.55, 0, RW, 3.68, 0.5, C('#5a3820', -0.3)); s.pop(); for (const u of [-4.6, 0, 4.6]) { wAt(s, k, u, 0, 5.4); const n = [0, 0, 1]; for (let j = 0; j < 8; j++) { const a0 = (j / 8) * Math.PI, a1 = ((j + 1) / 8) * Math.PI; s.triN([0, 0, 0.02], [Math.cos(a0) * 0.9, Math.sin(a0) * 0.45, 0.02], [Math.cos(a1) * 0.9, Math.sin(a1) * 0.45, 0.02], n, n, n, C('#dff0ff', 0.8)); } s.pop(); } });
      }
      { const s3 = SEC(3); wAt(s3, 3, 2.55, 0.62); for (const x of [-0.24, 0.24]) limb(s3, [x, 0, 0.5], [x, 3.5, 0.04], [0.02, 0.02], C('#5a3820', -0.3), 4); for (let i = 1; i < 11; i++) { const t = i / 11; s3.box(-0.24, t * 3.5 - 0.015, 0.5 * (1 - t) + 0.02, 0.24, t * 3.5 + 0.015, 0.5 * (1 - t) + 0.07, C('#5a3820', -0.3)); } s3.pop(); }
      // 2: ön — ödünç verme masası, kart kataloğu, iade arabası, kapı, logo
      vWall(2, WALL, [{ u0: -1.0, u1: 1.0, y0: 0, y1: 2.8 }]);
      for (const u of [-0.5, 0.5]) vDoor(2, u, { w: 1.0, h: 2.8, frame: '#5a3820', door: '#7a5232', glass: '#fff1d0', knob: '#c9a34a' });
      VK.inSec(2, (s) => { wAt(s, 2, -3.6, 0.6); P.counter(s, 3.4, 1.05, 0.7, '#7a5232', '#3a2414', { railC: '#c9a34a' }); s.pop(); wAt(s, 2, -4.6, 0.6, 1.05); v5BankerLamp(s); s.pop(); wAt(s, 2, -2.9, 0.6, 1.05); for (let i = 0; i < 5; i++) s.box(-0.14, i * 0.05, -0.1, 0.14, i * 0.05 + 0.045, 0.1, C(BOOKC[i % BOOKC.length], -0.1)); s.pop(); wAt(s, 2, -3.5, 0.5, 1.05); s.cyl(0, 0, 0, 0.05, 0.02, 0.05, 10, C('#c9a34a', -0.9), C('#c9a34a', -0.9)); s.sphereS(0, 0.04, 0, 0.04, 0.03, 0.04, C('#c9a34a', -0.9), 8, 4); s.pop(); wAt(s, 2, 3.5, 0.32); v7Catalog(s, 1.6, 1.3); s.pop(); wAt(s, 2, 5.8, 0.4); v7BookCart(s); s.pop(); wAt(s, 2, 4.8, 0, 3.2); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#5a3820', -0.3)); s.pop(); });
      // salon: okuma masaları, küre, kitap yığınları, palmiyeler
      for (const [x, z, ry, sd] of [[-4.6, -4.4, 0.0, 1], [4.6, -4.4, 0.0, 2], [-4.6, 4.6, 0.0, 3], [4.6, 4.6, 0.0, 4]]) { mb.push().T(x, 0, z, ry); v7ReadTable(mb, sd); mb.pop(); }
      mb.push().T(0, 0, -5.6); v5GlobeBar(mb); mb.pop();
      for (const [x, z, n] of [[-1.8, 5.9, 6], [2.1, -6.2, 4], [5.9, 0.6, 5]]) { mb.push().T(x, 0, z, hs(x, z) * 3); for (let i = 0; i < n; i++) mb.box(-0.2 + hs(i, x) * 0.05, i * 0.06, -0.14, 0.2 - hs(i, z) * 0.05, i * 0.06 + 0.055, 0.14, C(BOOKC[(i + Math.round(x * 3) + 30) % BOOKC.length], -0.1)); VK.sh(mb, 0, 0, 0.26, 0.2, 0.36); mb.pop(); }
      for (const [x, z] of [[-6.95, -6.95], [6.95, -6.95], [-6.95, 6.95], [6.95, 6.95]]) VK.tall(x, z, (m) => P.ficus(m, 1.1, '#2f5a3a'));
    },
  },
  /* ---- Çiz Tahmin: grafiti ve kaykay parkı ---- */
  czt: {
    room: 1, raw: 1, wallH: 6.0, secShadow: 1,
    table: 'metal', tableO: { top: '#e9e4da', trim: '#2b2d31', deco: 'splat' }, chair: 'crate',
    rug: 'chalk', rugO: {},
    L: VL2.street, sky: ['#5e7fc0', '#f6c4a0', '#efd5bf'], sun: [0.55, 0.62, 0.4], shR: 9.0, parts: null,
    post: { bloom: 0.32, th: 0.88, sat: 1.12, con: 0.15, vig: 0.32, tint: [1.03, 1.0, 0.96] },
    det: 0.22, detS: 0.6,
    logos: [[3, 4.8, 3.0, 0.8, 0.8]],
    build(mb) {
      VK.ground(mb, '#7f7b76', '#76726d', 0.3);
      VK.quad(mb, -RW - 5, -RW - 5, RW + 5, RW + 5, C('#8a8680', 0), 0.0); VK.noise(mb, -RW - 5, -RW - 5, RW + 5, RW + 5, 0.8, '#928e88', '#827e79', 0.3, -0.2, 0.002);
      for (let i = -6; i <= 6; i++) { VK.quad(mb, i * 2.0 - 0.015, -RW - 5, i * 2.0 + 0.015, RW + 5, C('#7d7974', 0), 0.004); VK.quad(mb, -RW - 5, i * 2.0 - 0.015, RW + 5, i * 2.0 + 0.015, C('#7d7974', 0), 0.004); }
      { const ch = (pts, c) => { for (let i = 0; i + 1 < pts.length; i++) v4Seg(mb, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.03, C(c, 0.15), 0.008); };
        for (let j = 0; j < 8; j++) { const z0 = 4.2 + (j < 4 ? 0 : 0.5), x0 = -4.8 + (j % 4) * 0.5 + (j >= 4 ? 0.25 : 0); ch([[x0, z0], [x0 + 0.5, z0], [x0 + 0.5, z0 + 0.5], [x0, z0 + 0.5], [x0, z0]], '#ffffff'); }
        { const cx = 4.6, cz = -4.2; for (let k = 0; k <= 16; k++) { const a0 = (k / 16) * TAU, a1 = ((k + 1) / 16) * TAU; ch([[cx + Math.cos(a0) * 0.45, cz + Math.sin(a0) * 0.45], [cx + Math.cos(a1) * 0.45, cz + Math.sin(a1) * 0.45]], '#ffe066'); } for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; ch([[cx + Math.cos(a) * 0.6, cz + Math.sin(a) * 0.6], [cx + Math.cos(a) * 0.9, cz + Math.sin(a) * 0.9]], '#ffe066'); } }
        ch([[0.0, -5.4], [0.6, -6.0], [1.2, -5.4], [0.9, -5.4], [0.9, -4.8], [0.3, -4.8], [0.3, -5.4], [0.0, -5.4]], '#7cd6ff');
        for (let k = 0; k < 6; k++) { const a = hs(k, 5) * TAU, r = 4.4 + hs(k, 6) * 1.8; let px = Math.cos(a) * r, pz = Math.sin(a) * r; for (let j = 1; j < 5; j++) { const b = a + j * 0.1, nx = Math.cos(b) * (r - j * 0.08), nz = Math.sin(b) * (r - j * 0.08); v4Seg(mb, px, pz, nx, nz, 0.02, C('#2b2b30', 0), 0.0075); px = nx; pz = nz; } } }
      // 0: büyük grafiti duvarı, afiş gibi yapıştırılmış tabela
      VK.inSec(0, (s) => { wAt(s, 0, 0, 0); s.box(-RW, 0, -0.35, RW, 3.8, 0, C('#6e6872', -0.2)); s.box(-RW, 3.8, -0.4, RW, 3.95, 0.05, C('#4e4952', -0.3)); { const n = [0, 0, 1], T = C('#ff6fb5', 0.15), B = C('#ffb347', 0.15), M2 = C('#7c5cff', 0.15); s.quadN([-2.5, 0.15, 0.004], [2.5, 0.15, 0.004], [2.5, 1.9, 0.004], [-2.5, 1.9, 0.004], n, n, n, n, B, B, T, T); s.quadN([-2.5, 1.9, 0.004], [2.5, 1.9, 0.004], [2.5, 3.7, 0.004], [-2.5, 3.7, 0.004], n, n, n, n, T, T, M2, M2); for (let k = 0; k < 9; k++) { const a0 = Math.PI * (k / 9), a1 = Math.PI * ((k + 0.5) / 9); s.triN([0, 0.15, 0.006], [Math.cos(a0) * 2.4, 0.15 + Math.sin(a0) * 3.4, 0.006], [Math.cos(a1) * 2.4, 0.15 + Math.sin(a1) * 3.4, 0.006], n, n, n, C('#ffd166', 0.15)); } } v7Graffiti(s, -RW, -2.1, 0.2, 3.7, 3); v7Graffiti(s, 2.1, RW, 0.2, 3.7, 7); s.pop(); });
      vSign('frame', '#f4f4f4', '#fff8ec', { lamps: false });
      // 1: sağ — tel örgü, potası, ötede şehir
      v7Fence(1, 3.0); v7City(mb, 1, 4); VK.inSec(1, (s) => { wAt(s, 1, -2.0, 0.1); v7Hoop(s); s.pop(); });
      // 2: ön — çeyrek rampa
      VK.inSec(2, (s) => { wAt(s, 2, 0, 0.6); v7QuarterPipe(s, 6.0, 1.4, 3); s.pop(); wAt(s, 2, 0, 0); s.box(-RW, 0, -0.3, RW, 2.2, 0, C('#6e6872', -0.2)); v7Graffiti(s, -RW, RW, 1.4, 2.2, 11); s.pop(); });
      // 3: sol — grafiti duvarı, banklar, logo
      VK.inSec(3, (s) => { wAt(s, 3, 0, 0); s.box(-RW, 0, -0.35, RW, 3.2, 0, C('#736d78', -0.2)); v7Graffiti(s, -RW, 3.6, 0.2, 3.1, 19); s.pop(); wAt(s, 3, 4.8, 0, 3.0); s.box(-0.5, -0.5, 0, 0.5, 0.5, 0.04, C('#f4f4f4', -0.2)); s.pop(); wAt(s, 3, -2.0, 0.5); P.bench(s, 1.8, '#8a6238', '#2f3338'); s.push().T(0.5, 0.46, 0); v7Boombox(s); s.pop(); s.pop(); });
      // salon: platform, kaykaylar, sprey kutuları, koniler, sokak lambaları, saksı ağaçlar
      mb.push().T(-4.6, 0, -4.4, 0.6); v7Ledge(mb, 2.2); mb.pop();
      for (const [x, z, ry, c, f] of [[3.4, 4.6, 0.6, '#ff4fd8', false], [-2.8, -5.6, 1.8, '#38e1ff', true], [5.6, 1.2, -0.4, '#ffe14f', false]]) { mb.push().T(x, 0, z, ry); v7Skateboard(mb, c, f); mb.pop(); }
      for (let i = 0; i < 7; i++) { const a = hs(i, 41) * TAU, r = 4.2 + hs(i, 42) * 2.2; mb.push().T(Math.cos(a) * r, 0, Math.sin(a) * r, hs(i, 43) * 6, i % 3 === 0 ? Math.PI / 2 : 0); v7Spray(mb, SPRAY[i % SPRAY.length]); mb.pop(); }
      for (const [x, z] of [[2.6, -5.6], [-5.6, 2.0]]) { mb.push().T(x, 0, z); v4Cone(mb); mb.pop(); }
      for (const [x, z] of [[-6.6, -6.6], [6.6, -6.6], [6.6, 6.6], [-6.6, 6.6]]) VK.tall(x, z, (m) => v2StreetLamp(m, 3.6));
      for (const [x, z] of [[-6.4, 0.4], [6.3, -3.6]]) VK.tall(x, z, (m) => { m.box(-0.5, 0, -0.5, 0.5, 0.5, 0.5, C('#9e9a94', -0.3)); m.box(-0.45, 0.5, -0.45, 0.45, 0.52, 0.45, C('#4a3426', 0)); m.push().T(0, 0.5, 0, 0, 0, 0, 0.72); P.tree(m, 1, '#5a9a3c'); m.pop(); });
    },
  },
});

/* ====================== Cilalama turu (2026-11-19): halılar ======================
   Halılar artık düz bir disk değil: zeminden yükselen gövde, biyeli (yuvarlatılmış) kenar,
   dikdörtgenlerde zemine dökülen saçak; tüylü halıda kabarık püsküller. Desen gövdenin üstüne çizilir. */
const RUG_LIFT = 0.022;
// yuvarlak gövde (yan yüz) + isteğe bağlı biye halkası
function rugEdgeRound(mb, R, side, rim, o = {}) {
  const h = RUG_LIFT + (o.y ?? 0.006);
  mb.lathe(0, 0, 0, [[R + 0.006, 0], [R + 0.006, h - 0.006], [R - 0.004, h]], 80, C(side, 0));
  if (rim) mb.torusN(0, h + 0.002, 0, R - 0.03, 0.036, 0.016, 80, 6, C(rim, o.rimE ?? -0.15));
}
// dikdörtgen gövde (yalnız yan yüzler; üstünü desen örter)
function rugEdgeRect(mb, w, d, side, o = {}) {
  const h = RUG_LIFT + (o.y ?? 0.006);
  mb.box(-w, 0, -d, w, h - 0.0008, d, C(side, 0), 'tb');
}
// saçak: kısa kenarlardan (x = ±w) zemine dökülen ince iplikler, uçta küçük düğüm
function rugFringe(mb, w, d, col, o = {}) {
  const h = RUG_LIFT + (o.y ?? 0.006), L = o.len ?? 0.13, st = o.st ?? 0.052, t = 0.0105, n = [0, 1, 0];
  for (const s of [-1, 1]) for (let z = -d + st * 0.6, i = 0; z < d - st * 0.3; z += st, i++) {
    const l = L * (0.82 + hs(i, s + 7) * 0.32), c = C(vDark(col, hs(i, s + 9) * 0.14), 0), x0 = s * (w - 0.004), x1 = s * (w + l), zz = z + (hs(i, s + 3) - 0.5) * 0.012;
    mb.quadN([x0, h * 0.75, zz - t], [x0, h * 0.75, zz + t], [x1, 0.004, zz + t * 0.8], [x1, 0.004, zz - t * 0.8], n, n, n, n, c);
    if (i % 2 === 0) mb.disc(s * (w + 0.02), h * 0.62, zz + st * 0.5, 0.016, 0.016, 6, c, c);
  }
  // saçağın bağlandığı kenar (düğümlü şerit)
  for (const s of [-1, 1]) mb.box(s > 0 ? w - 0.05 : -w, h - 0.0008, -d, s > 0 ? w : -w + 0.05, h + 0.004, d, C(vDark(col, 0.08), 0), 'b');
}
{
  const B0 = { medal: RUGS.medal, braid: RUGS.braid, shag: RUGS.shag, grid: RUGS.grid, round: RUGS.round, deco: RUGS.deco, flake: RUGS.flake, mosaic: RUGS.mosaic, laby: RUGS.laby };
  const lift = (mb, f) => { mb.push().T(0, RUG_LIFT, 0); f(); mb.pop(); };
  // madalyonlu yuvarlak: koyu gövde, bordür renginde biye
  RUGS.medal = (mb, R, o = {}) => { rugEdgeRound(mb, R, vDark(o.a || '#2f4a3a', 0.4), vDark(o.b || '#e0c08a', 0.12), o); lift(mb, () => B0.medal(mb, R, o)); };
  // örgü: kalın, iki renkli burgu kenar
  RUGS.braid = (mb, R, o = {}) => {
    const K = o.k || ['#c8553d', '#f2cc8f', '#81b29a', '#3d405b', '#f4f1de'], h = RUG_LIFT + (o.y ?? 0.006);
    rugEdgeRound(mb, R, vDark(K[0], 0.35), null, o); lift(mb, () => B0.braid(mb, R, o));
    mb.torusN(0, h + 0.004, 0, R - 0.04, 0.045, 0.02, 96, 6, (a) => C(Math.floor((a * 32) / TAU) % 2 ? K[0] : K[1], 0));
  };
  // tüylü: kenarda kabarık püsküller
  RUGS.shag = (mb, R, o = {}) => {
    const A = o.a || '#7b2d8b', B = o.b || '#c77dff', h = RUG_LIFT + 0.006, n = 60;
    rugEdgeRound(mb, R - 0.02, vDark(A, 0.3), null, o); lift(mb, () => B0.shag(mb, R, o));
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU + hs(k, 3) * 0.05, r = R - 0.03 + hs(k, 4) * 0.035; mb.sphereS(Math.cos(a) * r, h + 0.004, Math.sin(a) * r, 0.072, 0.03, 0.072, C(k % 3 ? B : vMixHex(A, B, 0.55), 0), 7, 4); }
  };
  // ızgara (çocuk odası): koyu çerçeve gövdesi
  RUGS.grid = (mb, R, o = {}) => { rugEdgeRect(mb, R * 1.08, R * 0.9, vDark(o.b || '#1d3557', 0.35)); lift(mb, () => B0.grid(mb, R, o)); };
  // klasik yuvarlak (işletme teması da kullanır): açık renk biye
  RUGS.round = (mb, R, o = {}) => { rugEdgeRound(mb, R, vDark(o.rug || '#8c2f2f', 0.4), vDark(o.rugB || '#f2e6cf', 0.08)); lift(mb, () => B0.round(mb, R, o)); };
  // İran halısı: gövde + dökülen saçak
  RUGS.persian = (mb, R, o = {}) => {
    const w = R * 1.05, d = R * 0.86;
    rugEdgeRect(mb, w, d, vDark(o.n || '#1f3a5a', 0.3), o);
    lift(mb, () => RUG2.persian(mb, w, d, Object.assign({}, o, { fringe: false })));
    rugFringe(mb, w, d, o.fr || '#efe6d2', o);
  };
  // kilim: gövde + saçak (açık zemin renginde)
  RUGS.kilim = (mb, R, o = {}) => {
    const w = R * 1.05, d = R * 0.86, K = o.k || ['#b3352b', '#e9b949', '#2f5d62', '#f2e4c9', '#5a2e2a'];
    rugEdgeRect(mb, w, d, vDark(K[4], 0.25), o);
    lift(mb, () => RUG2.kilim(mb, w, d, o));
    rugFringe(mb, w, d, K[3], o);
  };
  // kalın halılara biye (zaten gövdeleri var)
  const rimOn = (k, col, e) => { const f = B0[k]; RUGS[k] = (mb, R, o = {}) => { f(mb, R, o); mb.torusN(0, (o.y ?? 0.03) + 0.004, 0, R - 0.03, 0.036, 0.015, 80, 6, C(typeof col === 'function' ? col(o) : col, e)); }; };
  rimOn('deco', (o) => o.b || '#c9a34a', -0.8);
  rimOn('flake', '#ffffff', 0.1);
  rimOn('mosaic', (o) => vDark(o.a || '#efe3d2', 0.25), -0.2);
  rimOn('laby', (o) => vDark(o.b || '#8c3b2a', 0.1), -0.2);
}

/* ====================== Cilalama turu: yeni yardımcılar ====================== */
// mermer dama: açık ve koyu mermer kareler (hafif ton oynaması), pirinç derz, kıvrımlı damarlar
function vMarble(mb, s, A, B, grout, o = {}) {
  VK.quad(mb, -RW, -RW, RW, RW, C(grout, o.ge ?? -0.85), 0);
  const e = o.e ?? -0.72, g = 0.016;
  let i = 0;
  for (let x = -RW; x < RW - 1e-6; x += s, i++) {
    let j = 0;
    for (let z = -RW; z < RW - 1e-6; z += s, j++) {
      const dark = (i + j) % 2 === 1, x1 = Math.min(x + s, RW), z1 = Math.min(z + s, RW);
      const c = vMixHex(dark ? B : A, dark ? '#000000' : '#d6cdbf', hs(i, j) * (dark ? 0.25 : 0.3));
      VK.quad(mb, x + g, z + g, x1 - g, z1 - g, C(c, e), 0.0015);
      const vc = C(dark ? vMixHex(B, '#ffffff', 0.2) : vMixHex(A, '#6f6759', 0.32), e), nv = hs(i + 7, j + 3) > 0.5 ? 2 : 1;
      for (let v = 0; v < nv; v++) {
        let px = x + g + 0.05 + hs(i + v, j + 11) * (x1 - x - 0.2), pz = z + g + 0.03;
        const ang = 0.7 + hs(i + 3, j + v * 5) * 1.6, L = s * (0.75 + hs(j + v, i + 2) * 0.55), n = 7;
        for (let q = 1; q <= n; q++) {
          const a = ang + Math.sin(q * 1.9 + i * 0.7 + v) * 0.42;
          const nx = Math.min(x1 - g - 0.01, Math.max(x + g + 0.01, px + Math.cos(a) * L / n)), nz = Math.min(z1 - g - 0.01, Math.max(z + g + 0.01, pz + Math.sin(a) * L / n));
          v4Seg(mb, px, pz, nx, nz, 0.006 + 0.007 * Math.sin((q / n) * Math.PI), vc, 0.0024);
          px = nx; pz = nz;
        }
      }
    }
  }
  if (o.border) { const b = o.bw || 0.4; for (const [a, c, d, f] of [[-RW, -RW, RW, -RW + b], [-RW, RW - b, RW, RW], [-RW, -RW, -RW + b, RW], [RW - b, -RW, RW, RW]]) VK.quad(mb, a, c, d, f, C(o.border, -0.3), 0.004); }
}
// ateş çukuru: karlı taş halkası, çapraz kütükler, közler, alevler; sıcak hale ve zemin ışığı
function v8FirePit(mb, r = 0.55) {
  const St = ['#7d8590', '#6c737d', '#8a929c'];
  mb.disc(0, 0.012, 0, r * 0.9, r * 0.9, 18, C('#2a1d16', 0), C('#2a1d16', 0));
  for (let k = 0; k < 11; k++) { const a = (k / 11) * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; mb.sphereS(x, 0.1, z, 0.17, 0.12, 0.15, C(St[k % 3], -0.1), 9, 6); mb.sphereS(x, 0.19, z, 0.12, 0.035, 0.1, C('#f4f8fc', -0.2), 8, 4); }
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; limb(mb, [Math.cos(a) * r * 0.66, 0.05, Math.sin(a) * r * 0.66], [Math.cos(a) * 0.05, 0.3, Math.sin(a) * 0.05], [0.06, 0.05], C('#5a3a24', 0), 7); }
  mb.disc(0, 0.05, 0, r * 0.45, r * 0.45, 14, C('#ffb347', 1), C('#b8401c', 1));
  for (const [x, z, h, w, c] of [[0, 0, 0.66, 0.16, '#ff8a1f'], [0.09, 0.05, 0.46, 0.11, '#ffc94f'], [-0.1, -0.03, 0.52, 0.11, '#ff6a1f'], [0.02, -0.09, 0.36, 0.08, '#fff1a0']]) mb.cyl(x, 0.1, z, w, 0.1 + h, 0.0, 8, C(c, 1), C(c, 1), '');
  const p = mb.p(0, 0.45, 0); VK.halo(p, 1.25, '#ffb35a', 0.4, 1); VK.pool([p[0], 0, p[2]], 2.8, '#ff9e4a', 0.22);
  VK.sh(mb, 0, 0, r * 1.5, r * 1.5, 0.32);
}
// kütük oturak (üstünde kar)
function v8LogSeat(mb, L = 1.1) {
  mb.push().T(0, 0.17, 0, 0, 0, Math.PI / 2); mb.cyl(0, -L / 2, 0, 0.17, L / 2, 0.17, 12, C('#7a4e2c', 0), C('#c9a27a', 0)); mb.pop();
  mb.rbox(-L / 2 + 0.06, 0.3, -0.1, L / 2 - 0.06, 0.37, 0.1, 0.03, C('#f4f8fc', -0.2), 2);
  VK.sh(mb, 0, 0, L * 0.62, 0.3, 0.34);
}
// tiki meşale: bambu sap, hasır sargılı hazne, alev ve titrek hale
function v8Torch(mb, h = 1.7) {
  const B = C('#b08850', 0), Bd = C('#8a6638', 0);
  limb(mb, [0, 0, 0], [0, h, 0], [0.035, 0.03], B, 6);
  for (let i = 1; i < 5; i++) mb.torusN(0, (h * i) / 5, 0, 0.034, 0.008, 0.008, 8, 3, Bd);
  mb.lathe(0, h, 0, [[0.03, 0], [0.09, 0.08], [0.1, 0.2], [0.07, 0.24]], 10, C('#6b4a2a', 0));
  for (let i = 0; i < 3; i++) mb.torusN(0, h + 0.07 + i * 0.05, 0, 0.095, 0.012, 0.012, 10, 3, C('#c9a46a', 0));
  mb.cyl(0, h + 0.22, 0, 0.065, h + 0.52, 0.0, 8, C('#ff8a1f', 1), C('#ff8a1f', 1), '');
  mb.cyl(0.01, h + 0.22, 0.01, 0.035, h + 0.42, 0.0, 6, C('#ffe27a', 1), C('#ffe27a', 1), '');
  const p = mb.p(0, h + 0.36, 0); VK.halo(p, 0.75, '#ffb35a', 0.36, 1); VK.pool([p[0], 0, p[2]], 1.5, '#ff9e4a', 0.13);
  VK.sh(mb, 0, 0, 0.18, 0.18, 0.3);
}
// plaj havlusu (masa altı): kalınlık + uçlarda saçak
{
  const B1 = RUGS.towel;
  RUGS.towel = (mb, R, o = {}) => {
    const d = R * 0.8;
    rugEdgeRect(mb, R, d, vDark(o.rug || '#ff6f61', 0.3));
    mb.push().T(0, RUG_LIFT, 0); B1(mb, R, o); mb.pop();
    mb.push().T(0, 0, 0, Math.PI / 2); rugFringe(mb, d, R, o.rugB || '#ffffff', { len: 0.1, st: 0.06 }); mb.pop();
  };
}
// tavandan sarkan çıplak ampul (pirinç duy, kordon), sıcak hale ve zemin ışığı
function v8Bulb(mb, y = 2.9, top = 5.8) {
  limb(mb, [0, y + 0.12, 0], [0, top, 0], [0.008, 0.008], C('#1b1b1e', -0.3), 3);
  mb.cyl(0, y + 0.07, 0, 0.032, y + 0.15, 0.026, 8, C('#c9a34a', -0.85), C('#c9a34a', -0.85));
  mb.sphereS(0, y, 0, 0.07, 0.095, 0.07, C('#ffd58a', 1), 10, 7);
  const p = mb.p(0, y, 0); VK.halo(p, 0.62, '#ffc070', 0.34, 0.3); VK.pool([p[0], 0, p[2]], 1.9, '#ffb35a', 0.15);
}

/* ====================== Cilalama turu: ahşap masa ======================
   Düz turuncu disk yerine gerçek bir yemek masası: paralel tahtalar (her biri hafif farklı ton), aralarında ince
   koyu derzler, tahta boyunca damar çizgileri, uçlara doğru hafif koyulaşma; kenarda pervaz ve aynı ayak. */
TABLES.wood = (mb, R, o = {}) => {
  const w = hexRGB(o.wood || '#a0703f'), wd = mix3(w, [0, 0, 0], 0.25), Y = TABLE_Y, e = -0.32;
  mb.lathe(0, Y - 0.0016, 0, [[R, 0], [0, 0]], 56, rgbA(mix3(w, [0, 0, 0], 0.55), -0.1));
  const pw = o.pw || 0.27, n = Math.ceil((2 * R) / pw), zc = (x, m) => Math.sqrt(Math.max(0, R * R - x * x)) - m;
  for (let i = 0; i < n; i++) {
    const x0 = -R + i * pw + 0.0065, x1 = Math.min(R, -R + (i + 1) * pw) - 0.0065;
    if (x1 - x0 < 0.02) continue;
    const t = hs(i, 3), base = mix3(w, t > 0.5 ? [1, 1, 1] : [0, 0, 0], (t > 0.5 ? 0.07 : 0.16) * hs(i, 5) + 0.02), end = mix3(base, [0, 0, 0], 0.16);
    const S = 5;
    for (let s = 0; s < S; s++) {
      const xa = x0 + ((x1 - x0) * s) / S, xb = x0 + ((x1 - x0) * (s + 1)) / S, za = zc(xa, 0.004), zb = zc(xb, 0.004);
      // ortası açık, uçları biraz koyu: iki dörtgen (uç → orta → uç)
      const ca = rgbA(end, e), cm = rgbA(base, e);
      mb.quadN([xa, Y, -za], [xb, Y, -zb], [xb, Y, 0], [xa, Y, 0], UPV, UPV, UPV, UPV, ca, ca, cm, cm);
      mb.quadN([xa, Y, 0], [xb, Y, 0], [xb, Y, zb], [xa, Y, za], UPV, UPV, UPV, UPV, cm, cm, ca, ca);
    }
    const gc = rgbA(mix3(base, [0, 0, 0], 0.2), e);
    for (let g = 0; g < 2; g++) {
      const gx = x0 + (x1 - x0) * (0.2 + 0.6 * hs(i, g + 7)), gz = zc(gx, 0.05), k = 7, wv = 0.012 * hs(g, i);
      for (let q = 0; q < k; q++) { const za = -gz + (2 * gz * q) / k, zb = -gz + (2 * gz * (q + 1)) / k, xa = gx + Math.sin(q * 1.3 + i) * wv, xb = gx + Math.sin((q + 1) * 1.3 + i) * wv; mb.quadN([xa - 0.0035, Y + 0.0006, za], [xa + 0.0035, Y + 0.0006, za], [xb + 0.0035, Y + 0.0006, zb], [xb - 0.0035, Y + 0.0006, zb], UPV, UPV, UPV, UPV, gc); }
    }
  }
  mb.cyl(0, Y - 0.07, 0, R, Y, R, 64, rgbA(wd, -0.3), rgbA(wd, -0.3), '');
  mb.torusN(0, Y - 0.004, 0, R - 0.01, 0.02, 0.02, 64, 4, rgbA(mix3(w, [0, 0, 0], 0.12), -0.45));
  mb.cyl(0, Y - 0.12, 0, R - 0.06, Y - 0.07, R - 0.02, 48, rgbA(mix3(wd, [0, 0, 0], 0.2), -0.2), rgbA(wd, -0.2), '');
  const P = rgbA(wd, -0.2);
  mb.lathe(0, 0.06, 0, [[0.2, 0], [0.14, 0.08], [0.12, 0.3], [0.16, 0.42], [0.12, Y - 0.2], [0.18, Y - 0.12]], 14, P, '');
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; limb(mb, [0, 0.08, 0], [Math.cos(a) * 0.62, 0.03, Math.sin(a) * 0.62], [0.07, 0.05], P, 6); mb.sphereS(Math.cos(a) * 0.62, 0.03, Math.sin(a) * 0.62, 0.06, 0.035, 0.06, P, 8, 4); }
};

/* ====================== Cilalama turu: düz masa tepelerine kimlik ======================
   metal: o.deco = 'diner' (retro formika: bumerang ve yıldız desenleri, krom kenar) | 'splat' (boya lekeleri, damlalar)
   iron: o.mosaic (Akdeniz çini mozaiği tepe) — stone: oyma bordür, çatlaklar — stump: halka dokusu yumuşatıldı */
{
  const M0 = TABLES.metal;
  TABLES.metal = (mb, R, o = {}) => {
    M0(mb, R, o);
    const Y = TABLE_Y + 0.0012;
    if (o.deco === 'diner') {
      const K = o.dk || ['#e63946', '#2a9d8f', '#f4a261', '#264653'];
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * TAU + hs(i, 11) * 0.12, r = R * (i % 2 ? 0.66 : 0.84) + (hs(i, 12) - 0.5) * 0.08, x = Math.cos(a) * r, z = Math.sin(a) * r, c = C(K[i % K.length], -0.6), rot = hs(i, 13) * TAU, L = 0.12 + hs(i, 14) * 0.06;
        mb.push().T(x, Y, z, rot);
        if (i % 3 === 2) { for (const q of [0, Math.PI / 2]) { const cq = Math.cos(q), sq = Math.sin(q); mb.quadN([-cq * L * 0.5, 0, -sq * L * 0.5], [-sq * 0.016, 0, cq * 0.016], [cq * L * 0.5, 0, sq * L * 0.5], [sq * 0.016, 0, -cq * 0.016], UPV, UPV, UPV, UPV, c); } }
        else { for (const s of [-1, 1]) mb.quadN([0, 0, -0.012], [s * L, 0, -L * 0.6], [s * (L + 0.03), 0, -L * 0.48], [0, 0, 0.03], UPV, UPV, UPV, UPV, c); }
        mb.pop();
      }
      mb.torusN(0, TABLE_Y - 0.004, 0, R + 0.004, 0.026, 0.03, 72, 6, C('#dfe3e8', -0.94));
    } else if (o.deco === 'splat') {
      const K = o.dk || ['#ff4fd8', '#38e1ff', '#ffe14f', '#5bff9a', '#ff8a3d', '#a78bfa'];
      for (let i = 0; i < 16; i++) { const a = hs(i, 21) * TAU, r = R * (0.55 + 0.33 * hs(i, 22)); v4Blot(mb, Math.cos(a) * r, Y + (i % 4) * 0.0004, Math.sin(a) * r, 0.05 + hs(i, 23) * 0.09, K[i % K.length], i + 31, 4); }
      for (let i = 0; i < 9; i++) { const a = hs(i, 24) * TAU, c = C(K[(i + 2) % K.length], 0), ca = Math.cos(a), sa = Math.sin(a), L = 0.06 + hs(i, 25) * 0.12; mb.quadN([ca * (R + 0.002) - sa * 0.018, TABLE_Y + 0.001, sa * (R + 0.002) + ca * 0.018], [ca * (R + 0.002) + sa * 0.018, TABLE_Y + 0.001, sa * (R + 0.002) - ca * 0.018], [ca * (R + 0.003) + sa * 0.012, TABLE_Y - L, sa * (R + 0.003) - ca * 0.012], [ca * (R + 0.003) - sa * 0.012, TABLE_Y - L, sa * (R + 0.003) + ca * 0.012], [ca, 0, sa], [ca, 0, sa], [ca, 0, sa], [ca, 0, sa], c); mb.sphereS(ca * (R + 0.006), TABLE_Y - L, sa * (R + 0.006), 0.016, 0.022, 0.016, c, 6, 4); }
    }
  };
  const I0 = TABLES.iron;
  TABLES.iron = (mb, R, o = {}) => {
    I0(mb, R, o);
    if (!o.mosaic) return;
    const K = o.mk || ['#2f6f8f', '#f4efe4', '#e9b44c', '#c45c3c', '#6f9a6a'], s = 0.105, g = 0.009, Y = TABLE_Y + 0.0012, Rm = R - 0.07;
    for (let x = -Rm; x < Rm; x += s) for (let z = -Rm; z < Rm; z += s) {
      const cx = x + s / 2, cz = z + s / 2, d = Math.hypot(cx, cz);
      if (d > Rm - s * 0.55) continue;
      const a = Math.atan2(cz, cx), ring = d / Rm, star = Math.abs(Math.cos(a * 4)) * 0.22;
      let c = K[1];
      if (ring > 0.86) c = K[0]; else if (ring > 0.8) c = K[2]; else if (ring < 0.16 + star * 0.6) c = K[3]; else if (ring < 0.3 + star) c = K[2]; else if (ring < 0.36 + star) c = K[0]; else if ((Math.round(cx / s) + Math.round(cz / s)) % 5 === 0 && ring < 0.74) c = K[4];
      VK.quad(mb, x + g, z + g, x + s - g, z + s - g, C(vMixHex(c, '#000000', hs(Math.round(cx * 40), Math.round(cz * 40)) * 0.08), -0.55), Y);
    }
  };
  const S0 = TABLES.stone;
  TABLES.stone = (mb, R, o = {}) => {
    S0(mb, R, o);
    const s = hexRGB(o.stone || '#b9ab92'), dk = rgbA(mix3(s, [0, 0, 0], 0.32), -0.1), Y = TABLE_Y + 0.0012;
    // oyma bordür: iki ince halka arasında meander basamakları
    mb.lathe(0, Y, 0, [[R - 0.08, 0], [R - 0.1, 0]], 72, dk); mb.lathe(0, Y, 0, [[R - 0.27, 0], [R - 0.29, 0]], 72, dk);
    const n = Math.round(R * 9);
    for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 0.55) / n) * TAU, am = ((k + 0.28) / n) * TAU, r0 = R - 0.25, r1 = R - 0.12, P = (a, r) => [Math.cos(a) * r, Y + 0.0002, Math.sin(a) * r];
      const seg = (p, q) => { const dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * 0.009, nz = (dx / l) * 0.009; mb.quadN([p[0] - nx, p[1], p[2] - nz], [q[0] - nx, q[1], q[2] - nz], [q[0] + nx, q[1], q[2] + nz], [p[0] + nx, p[1], p[2] + nz], UPV, UPV, UPV, UPV, dk); };
      seg(P(a0, r0), P(a0, r1)); seg(P(a0, r1), P(a1, r1)); seg(P(a1, r1), P(a1, (r0 + r1) / 2)); seg(P(a1, (r0 + r1) / 2), P(am, (r0 + r1) / 2)); }
    // ince çatlaklar ve küçük kırıklar
    for (let i = 0; i < 4; i++) { let a = hs(i, 41) * TAU, r = R - 0.3; let px = Math.cos(a) * r, pz = Math.sin(a) * r; for (let j = 0; j < 5; j++) { a += (hs(i, j + 3) - 0.5) * 0.18; r -= 0.07 + hs(j, i) * 0.06; const nx = Math.cos(a) * r, nz = Math.sin(a) * r; v4Seg(mb, px, pz, nx, nz, 0.006, dk, Y + 0.0001); px = nx; pz = nz; } }
  };
  TABLES.stump = (mb, R, o) => {
    const bark = hexRGB('#6b4a31'), barkD = hexRGB('#4b3220'), ring = hexRGB('#d4a66c'), ringD = hexRGB('#c39560'), edge = hexRGB('#8f6238'), pith = hexRGB('#a87a48');
    tableTop(mb, R, 40, (i, r, a) => { const t = r / R, w = vn(Math.cos(a) * 1.6 + 4, Math.sin(a) * 1.6 + 2) * 0.9; let c = mix3(ring, ringD, 0.5 + 0.5 * Math.sin(t * 30 + w * 3)); if (t < 0.07) c = mix3(pith, c, t / 0.07); if (t > 0.9) c = mix3(c, edge, Math.min(1, (t - 0.9) / 0.08)); return c; }, -0.05);
    mb.lathe(0, 0, 0, [[R * 1.12, 0], [R * 1.02, 0.12], [R * 0.98, 0.4], [R, TABLE_Y - 0.02], [R - 0.01, TABLE_Y]], 40, (k, a) => rgbA(mix3(bark, barkD, Math.sin(a * 23) > 0.2 ? 0.7 : 0.1), 0), '');
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; limb(mb, [Math.cos(a) * R * 0.95, 0.2, Math.sin(a) * R * 0.95], [Math.cos(a) * (R + 0.55), 0.02, Math.sin(a) * (R + 0.55)], [0.14, 0.05], rgbA(barkD, 0), 6); }
    for (let k = 0; k < 5; k++) { const a = hs(k, 51) * TAU; v4Seg(mb, Math.cos(a) * R * 0.15, Math.sin(a) * R * 0.15, Math.cos(a) * R * (0.45 + hs(k, 52) * 0.4), Math.sin(a) * R * (0.45 + hs(k, 52) * 0.4), 0.007, rgbA(mix3(ringD, [0, 0, 0], 0.3), -0.05), TABLE_Y + 0.0012); }
  };
}

/* ====================== Cilalama turu: yıpranmış taş döşeme ve selvi ====================== */
// el döşemesi taş: her taş biraz farklı ton ve boyda, bazıları çatlak; derzlerde yosun lekeleri ve ot öbekleri
function vStoneFloor(mb, s, cols, grout, o = {}) {
  VK.quad(mb, -RW, -RW, RW, RW, C(grout, 0), 0);
  const e = o.e ?? -0.2, skip = o.skip ?? 0;
  let i = 0;
  for (let x = -RW; x < RW - 1e-6; x += s, i++) {
    let j = 0;
    for (let z = -RW; z < RW - 1e-6; z += s, j++) {
      const off = j % 2 ? s * 0.5 : 0, xa = Math.max(-RW, x - off), xb = Math.min(RW, x + s - off);
      if (xb - xa < 0.08) continue;
      const h1 = hs(i * 3 + 1, j * 7 + 2), g = 0.018 + h1 * 0.012, c = cols[Math.floor(hs(i, j + 40) * cols.length)];
      const cc = vMixHex(c, h1 > 0.5 ? '#ffffff' : '#000000', (h1 > 0.5 ? 0.06 : 0.1) * hs(j, i + 9));
      const x0 = xa + g, x1 = xb - g, z0 = z + g, z1 = Math.min(RW, z + s) - g, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      // taş: köşeleri hafif kırık (sekizgen), ortası biraz açık
      const k = Math.min(x1 - x0, z1 - z0) * (0.08 + hs(i, j) * 0.06), P = [[x0 + k, z0], [x1 - k, z0], [x1, z0 + k], [x1, z1 - k], [x1 - k, z1], [x0 + k, z1], [x0, z1 - k], [x0, z0 + k]];
      const ce = C(vLight(cc, 0.05), e), ed = C(cc, e);
      for (let q = 0; q < 8; q++) { const a = P[q], b = P[(q + 1) % 8]; mb.triN([cx, 0.002, cz], [a[0], 0.002, a[1]], [b[0], 0.002, b[1]], UPV, UPV, UPV, ce, ed, ed); }
      if (skip && Math.hypot(cx, cz) < skip) continue;
      if (hs(i + 5, j + 3) > 0.86) { let px = x0 + (x1 - x0) * hs(i, j + 2), pz = z0 + 0.02; const dk = C(vDark(cc, 0.35), e); for (let q = 0; q < 4; q++) { const nx = Math.min(x1 - 0.02, Math.max(x0 + 0.02, px + (hs(q, i + j) - 0.5) * 0.35)), nz = Math.min(z1 - 0.02, pz + (z1 - z0) / 4); v4Seg(mb, px, pz, nx, nz, 0.0045, dk, 0.0027); px = nx; pz = nz; } }
      if (o.moss && hs(i + 11, j + 13) > 0.8) v4Blot(mb, xb + (hs(i, j + 5) - 0.5) * 0.1, 0.0031, z + (hs(i + 2, j) - 0.5) * 0.1, 0.05 + hs(i, j + 7) * 0.07, hs(i, j + 8) > 0.5 ? '#6f7f45' : '#5f7038', i * 31 + j, 2);
    }
  }
  if (o.tufts) for (let t = 0; t < o.tufts; t++) {
    const x = (hs(t, 71) - 0.5) * (2 * RW - 1), z = (hs(t, 72) - 0.5) * (2 * RW - 1);
    if (skip && Math.hypot(x, z) < skip + 0.3) continue;
    for (let b = 0; b < 6; b++) { const a = (b / 6) * TAU + hs(b, t), L = 0.13 + hs(b, t + 3) * 0.12; limb(mb, [x + Math.cos(a) * 0.02, 0, z + Math.sin(a) * 0.02], [x + Math.cos(a) * 0.09, L, z + Math.sin(a) * 0.09], [0.014, 0.003], C(b % 3 ? '#7a8a3e' : '#93a04a', 0), 3); }
  }
}
// selvi: ince uzun koyu yeşil, katmanlı; dibinde toprak ve gölge
function v8Cypress(mb, h = 3.2) {
  limb(mb, [0, 0, 0], [0, 0.35, 0], [0.08, 0.07], C('#5a4632', 0), 5);
  for (let i = 0; i < 6; i++) { const t = i / 5, y = 0.35 + t * (h - 0.6), r = 0.42 * Math.sin(Math.min(1, (1 - t) * 1.25 + 0.15) * Math.PI * 0.5) + 0.06; mb.sphereS((hs(i, 3) - 0.5) * 0.04, y + 0.28, (hs(i, 4) - 0.5) * 0.04, r, 0.42, r, C(i % 2 ? '#2f4f2f' : '#355a33', 0), 10, 7); }
  mb.sphereS(0, h, 0, 0.07, 0.2, 0.07, C('#3a6236', 0), 8, 5);
  VK.sh(mb, 0, 0, 0.55, 0.55, 0.36);
}

/* ====================== Cilalama turu: ön plan ayrıntıları ======================
   Kamera tarafındaki duvarlar ve uzun eşyalar inince görünen ön zemin boş kalmasın: alçak eşyalar ana ağa eklenir. */
// yerde yatan kablo: noktalar boyunca hafif kıvrımlı yuvarlak kablo
function v8Cable(mb, pts, r = 0.028, col = '#1d1e22') {
  const c = C(col, -0.5);
  for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1]; limb(mb, [a[0], r, a[1]], [b[0], r, b[1]], [r, r], c, 6, null, 1); mb.sphereS(b[0], r, b[1], r, r, r, c, 6, 4); }
}
// alet kutusu (kapaklı, sapı var) ve yanında anahtar + tornavida
function v8Toolbox(mb, col = '#c8102e') {
  mb.rbox(-0.3, 0, -0.14, 0.3, 0.2, 0.14, 0.02, C(col, -0.55), 2); mb.rbox(-0.31, 0.2, -0.15, 0.31, 0.26, 0.15, 0.02, C(vDark(col, 0.15), -0.55), 2);
  for (const s of [-1, 1]) mb.box(s * 0.12 - 0.012, 0.26, -0.012, s * 0.12 + 0.012, 0.33, 0.012, C('#2b2b2b', -0.6)); mb.box(-0.13, 0.32, -0.015, 0.13, 0.345, 0.015, C('#2b2b2b', -0.6));
  mb.box(-0.04, 0.14, 0.141, 0.04, 0.18, 0.15, C('#c9ced6', -0.9));
  mb.push().T(0.48, 0.01, 0.08, 0.7); mb.box(-0.16, 0, -0.016, 0.16, 0.014, 0.016, C('#c9ced6', -0.9)); mb.torusN(0.17, 0.007, 0, 0.04, 0.012, 0.007, 10, 3, C('#c9ced6', -0.9)); mb.pop();
  mb.push().T(-0.45, 0.012, 0.18, -0.4, 0, Math.PI / 2); mb.cyl(0, -0.12, 0, 0.022, 0.0, 0.022, 8, C('#e9b44c', -0.5), C('#e9b44c', -0.5)); mb.cyl(0, 0, 0, 0.006, 0.12, 0.006, 6, C('#c9ced6', -0.9), C('#c9ced6', -0.9)); mb.pop();
  VK.sh(mb, 0, 0, 0.42, 0.24, 0.36);
}
// sandık: deri kaplı, pirinç köşeli, kayışlı
function v8Trunk(mb, w = 0.8, d = 0.46, h = 0.42, col = '#6b3a22') {
  mb.rbox(-w / 2, 0, -d / 2, w / 2, h, d / 2, 0.03, C(col, -0.25), 2);
  mb.push().T(0, h - 0.02, 0, 0, 0, Math.PI / 2, 0.12, 1, d / 2 - 0.004); mb.cyl(0, -w / 2 + 0.004, 0, 1, w / 2 - 0.004, 1, 16, C(vDark(col, 0.08), -0.25), C(vDark(col, 0.08), -0.25), 'tb'); mb.pop();
  for (const x of [-w * 0.28, w * 0.28]) { mb.box(x - 0.03, 0, -d / 2 - 0.006, x + 0.03, h, -d / 2 + 0.002, C('#3a2414', -0.3)); mb.box(x - 0.03, 0, d / 2 - 0.002, x + 0.03, h, d / 2 + 0.006, C('#3a2414', -0.3)); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mb.box(sx * w / 2 - (sx > 0 ? 0.07 : -0.002), 0, sz * d / 2 - (sz > 0 ? 0.07 : -0.002), sx * w / 2 + (sx > 0 ? 0.004 : 0.07), 0.07, sz * d / 2 + (sz > 0 ? 0.004 : 0.07), C('#c9a34a', -0.85));
  mb.box(-0.05, h - 0.1, -d / 2 - 0.012, 0.05, h - 0.02, -d / 2, C('#c9a34a', -0.85));
  VK.sh(mb, 0, 0, w * 0.62, d * 0.75, 0.38);
}
// dağılmış pirinç dişliler (yere yatık, ince)
function v8Cogs(mb, n = 5, seed = 1) {
  for (let i = 0; i < n; i++) { const x = (hs(i, seed) - 0.5) * 0.9, z = (hs(i, seed + 1) - 0.5) * 0.7, r = 0.07 + hs(i, seed + 2) * 0.08, c = C(i % 2 ? '#c9a34a' : '#b87333', -0.85), t = Math.round(r * 90);
    mb.cyl(x, 0, z, r, 0.022, r, 16, c, c); for (let k = 0; k < t; k++) { const a = (k / t) * TAU; mb.box(x + Math.cos(a) * r - 0.012, 0, z + Math.sin(a) * r - 0.012, x + Math.cos(a) * r + 0.012, 0.02, z + Math.sin(a) * r + 0.012, c); }
    mb.cyl(x, 0.0225, z, r * 0.3, 0.023, r * 0.3, 10, C('#2b2b2b', -0.4), C('#2b2b2b', -0.4)); }
}
// rulo plan kâğıtları (mavi), biri açık ve köşeleri kıvrık
function v8Blueprints(mb) {
  for (const [x, z, a, c] of [[0, 0, 0.2, '#3e6fa8'], [0.08, 0.14, -0.1, '#e9e2cf'], [-0.06, 0.26, 0.35, '#3e6fa8']]) { mb.push().T(x, 0.035, z, a, 0, Math.PI / 2); mb.cyl(0, -0.32, 0, 0.035, 0.32, 0.035, 10, C(c, 0), C('#f4efe2', 0)); mb.pop(); }
  mb.push().T(0.55, 0.004, -0.15, 0.25); VK.quad(mb, -0.3, -0.21, 0.3, 0.21, C('#2f5f99', 0), 0); for (let i = 0; i < 5; i++) VK.quad(mb, -0.26, -0.17 + i * 0.085, 0.26, -0.165 + i * 0.085, C('#cfe0f5', 0.3), 0.0006); mb.disc(0.05, 0.0012, 0.0, 0.1, 0.1, 16, C('#cfe0f5', 0.3), C('#cfe0f5', 0.3)); mb.disc(0.05, 0.0016, 0.0, 0.085, 0.085, 16, C('#2f5f99', 0), C('#2f5f99', 0)); mb.pop();
}
{
  const B = VENUES.tus.build;
  VENUES.tus.rugO = { a: '#5a2620', b: '#d4a94a' };
  VENUES.tus.build = function (mb, A, sh) {
    B.call(this, mb, A, sh);
    mb.push().T(-2.4, 0, 5.15, 0.18); RUG2.persian(mb, 1.3, 0.85, { a: '#6e1a22', b: '#d9b35a', n: '#1f3a4a', y: 0.008 }); mb.pop();
    mb.push().T(-2.5, 0.012, 5.3, 0.4); v8Trunk(mb); mb.pop();
    mb.push().T(2.3, 0, 5.0, -0.5); v8Toolbox(mb, '#2a6f4a'); mb.pop();
    mb.push().T(0.9, 0, 6.2); v8Cogs(mb, 6, 3); mb.pop();
    mb.push().T(3.6, 0, 6.4, 0.3); v8Blueprints(mb); mb.pop();
  };
}
{
  const B = VENUES.sbm.build;
  VENUES.sbm.build = function (mb, A, sh) {
    B.call(this, mb, A, sh);
    v8Cable(mb, [[2.6, 3.85], [3.1, 4.3], [3.4, 5.0], [3.6, 5.5]], 0.028, '#1d1e22');
    v8Cable(mb, [[2.75, 3.75], [3.35, 4.1], [3.75, 4.75], [3.95, 5.5]], 0.022, '#c8102e');
    v8Cable(mb, [[-2.4, 3.9], [-2.9, 4.6], [-2.5, 5.3], [-1.9, 5.6]], 0.024, '#f2c230');
    for (const [x, z, s] of [[-4.6, 5.9, 0.34], [4.9, 2.9, 0.26], [-5.2, -3.6, 0.3], [0.8, 6.6, 0.22]]) v4Blot(mb, x, 0.0058, z, s, '#141518', Math.round(x * 7 + z), 3);
    for (let i = 0; i < 4; i++) { const z = 5.2 + i * 0.55, c = C('#e0b020', -0.1); v4Seg(mb, -5.3, z + 0.22, -5.0, z, 0.05, c, 0.0056); v4Seg(mb, -5.0, z, -4.7, z + 0.22, 0.05, c, 0.0056); }
    mb.push().T(5.6, 0, 6.5); for (const [x, z] of [[-0.25, 0], [0.25, 0]]) mb.box(x - 0.2, 0.06, z - 0.3, x + 0.2, 0.1, z + 0.3, C('#a8875a', 0)); for (const z of [-0.26, 0, 0.26]) mb.box(-0.48, 0, z - 0.05, 0.48, 0.06, z + 0.05, C('#8a6a44', 0)); for (let i = 0; i < 3; i++) mb.rbox(-0.42, 0.1 + i * 0.13, -0.2, 0.42, 0.24 + i * 0.13, 0.2, 0.06, C(i % 2 ? '#b8a27a' : '#a8926a', 0), 2); VK.sh(mb, 0, 0, 0.6, 0.42, 0.38); mb.pop();
  };
}
// ıslak zemin uyarı tabelası (sarı A çerçeve)
function v8WetSign(mb) {
  const Y = C('#f2c230', -0.55), n1 = vnorm([0, 0.22, 1]), n2 = vnorm([0, 0.22, -1]);
  mb.quadN([-0.17, 0, 0.13], [0.17, 0, 0.13], [0.15, 0.6, 0.01], [-0.15, 0.6, 0.01], n1, n1, n1, n1, Y); mb.quadN([0.17, 0, -0.13], [-0.17, 0, -0.13], [-0.15, 0.6, -0.01], [0.15, 0.6, -0.01], n2, n2, n2, n2, Y);
  mb.box(-0.15, 0.6, -0.015, 0.15, 0.63, 0.015, C('#e0b020', -0.55));
  const K = C('#1b1b1e', 0);
  mb.push().T(0, 0.36, 0.075, 0, -0.22); mb.triN([0, 0.1, 0.006], [-0.09, -0.07, 0.006], [0.09, -0.07, 0.006], [0, 0, 1], [0, 0, 1], [0, 0, 1], K); mb.triN([0, 0.065, 0.008], [-0.055, -0.045, 0.008], [0.055, -0.045, 0.008], [0, 0, 1], [0, 0, 1], [0, 0, 1], Y); mb.box(-0.008, -0.03, 0.009, 0.008, 0.03, 0.01, K); mb.box(-0.008, -0.042, 0.009, 0.008, -0.034, 0.01, K); mb.pop();
  VK.sh(mb, 0, 0, 0.26, 0.2, 0.34);
}
// robot süpürge (yerde, ışıklı göstergeli)
function v8RoboVac(mb) {
  mb.cyl(0, 0, 0, 0.19, 0.085, 0.19, 22, C('#2b2d31', -0.7), C('#3a3d44', -0.7));
  mb.cyl(0, 0.085, 0, 0.06, 0.1, 0.06, 14, C('#c9ced6', -0.9), C('#c9ced6', -0.9));
  mb.box(-0.1, 0.04, 0.17, 0.1, 0.07, 0.19, C('#1b1b1e', -0.5)); mb.sphereS(0.11, 0.087, 0.05, 0.012, 0.006, 0.012, C('#5be3a9', 1), 6, 3);
  VK.sh(mb, 0, 0, 0.26, 0.26, 0.4);
}
{
  const B = VENUES.byr.build;
  VENUES.byr.build = function (mb, A, sh) {
    B.call(this, mb, A, sh);
    mb.push().T(-1.2, 0, 5.9, 0.4); v8WetSign(mb); mb.pop();
    mb.push().T(1.9, 0, 4.7, 1.1); v8RoboVac(mb); mb.pop();
  };
}

/*/mekan*/
class TableGame {
  // cfg: { tag, cls, title, amb, snd, css, botPx, post, wood, wall }
  constructor(ctx, cfg = {}) {
    injectStyle();
    injectStyleM(cfg.css || '', cfg.tag || 'masa');
    this.cfg = cfg;
    this.tag = cfg.tag || 'masa';
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.time = 0;
    this.av = new Map();
    this.seats = [];
    this.me = -1;
    this.R = 2;            // masa yarıçapı (x yönünde)
    this.Rs = 2.45;        // sandalye halkası
    this.kz = 1;           // masanın derinlik / genişlik oranı (dikey ekranda oval masa: oyuncular daha büyük görünür)
    this.base = Math.PI / 2;
    this.cam = { ex: 0, ey: 6, ez: 8, tx: 0, ty: 0.85, tz: 0, D: 26, yaw: 0.55, fov: 0.8, zoom: 1, fx: 0, fz: 0, fy: 0, shake: 0, pitchAdd: -0.32 };
    this.mats = { a: M.make(), b: M.make(), c: M.make(), V: M.make(), P: M.make(), VP: M.make(), TV: M.make(), TP: M.make(), TVP: M.make() };
    this.parts = [];
    this.pA = new Float32Array(520 * 126);
    this.pB = new Float32Array(520 * 126);
    this.lbl = new Map();
    this.panelKey = '';
    this.barKey = '';
    this.lastT = performance.now();
    this.uiT = 0;
    this.scale = 1;
    this.buildDom();
    this.snd = cfg.snd || new MasaSnd();
    try { this.snd.amb((WORLDS[cfg.world || cfg.tag] || {}).amb || cfg.amb || 'diner', cfg.ambVol ?? 0.75); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn(`[${this.tag}] WebGL açılamadı`, e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); this.mesh = {}; this.buildWorld(); } catch (e) { console.warn(`[${this.tag}] kaynak`, e); this.X = null; }
    }
    if (this.X) {
      this.el.cv.addEventListener('webglcontextlost', this.onLost = (e) => { e.preventDefault(); this.lost = true; }, false);
      this.el.cv.addEventListener('webglcontextrestored', this.onRestore = () => this.restore(), false);
    } else {
      this.flat = true;
      this.el.wrap.classList.add('flat');
      this.g2 = ctx2d(this.el);
    }
    this.frameB = (t) => this.loop(t);
    this.raf = requestAnimationFrame(this.frameB);
  }

  /* ---------- DOM ---------- */
  buildDom() {
    const w = document.createElement('div');
    w.id = 'ky';
    w.className = `${this.cfg.cls || 'masa'} mz`;   // ilk sınıf: kalite ayarının anahtarı (oyun başına)
    w.innerHTML = `
      <canvas class="mz-cv" aria-label="${esc(this.cfg.title || '3D')} sahnesi"></canvas>
      <div class="lbls"></div>
      <div class="hud"><div class="r1">
        <div class="pos"><b>${this.cfg.emoji || '🎲'}</b><small></small></div>
        <div class="sp"></div>
        <div class="tm" style="display:none"></div>
        <button class="ib mu ${sfx.isMusicOn && sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
        <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted && sfx.isMuted() ? '🔇' : '🔊'}</button>
        <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
      </div></div>
      <div class="mz-top"></div>
      <div class="mz-feed"></div>
      <div class="vig"></div>
      <div class="msg"></div>
      <div class="mz-bar"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = { wrap: w, cv: q('canvas'), lbls: q('.lbls'), posB: q('.pos b'), posS: q('.pos small'), tm: q('.tm'), ex: q('.ex'), top: q('.mz-top'), feed: q('.mz-feed'), vig: q('.vig'), msg: q('.msg'), bar: q('.mz-bar'), panel: q('.panel') };
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
  setBar(key, html) {
    if (key === this.barKey) return false;
    this.barKey = key;
    this.el.bar.innerHTML = html;
    return true;
  }
  setPanel(key, html, low = true) {
    if (key === this.panelKey) return false;
    this.panelKey = key;
    const p = this.el.panel;
    p.innerHTML = html;
    p.classList.toggle('on', !!html);
    p.classList.toggle('low', !!html && low);
    this.cdEl = p.querySelector('[data-cd]');
    return true;
  }
  msg(text, cls = '', stay = false) {
    this.el.msg.innerHTML = text ? `<span class="${cls}${stay ? ' stay' : ''}">${text}</span>` : '';
  }
  feed(html) {
    const f = this.el.feed;
    const d = document.createElement('div');
    d.innerHTML = html;
    f.appendChild(d);
    while (f.children.length > 3) f.firstChild.remove();
    setTimeout(() => d.remove(), 4300);
  }
  flash(color = 'rgba(255,230,120,.55)', big = false) {
    const v = this.el.vig;
    v.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:5;transition:opacity .4s;box-shadow:inset 0 0 ${big ? 170 : 100}px ${big ? 60 : 34}px ${color};opacity:1`;
    clearTimeout(this.fT);
    this.fT = setTimeout(() => { v.style.opacity = '0'; }, 140);
  }
  top(text) { if (this.topTxt !== text) { this.topTxt = text; this.el.top.textContent = text || ''; } }

  /* ---------- oyuncular ve koltuklar ---------- */
  // list: [{ id, n, c, on }] oturma sırası; me: benim sıram (-1: izleyici)
  setSeats(list, me) {
    const key = list.map((p) => `${p.id}:${p.c}`).join(',') + '|' + me + '|' + this.kz.toFixed(2);
    this.seats = list;
    this.me = me;
    if (key === this.seatKey) { this.syncLabels(); return false; }
    this.seatKey = key;
    const n = Math.max(1, list.length);
    this.R = this.tableR(n);
    this.Rs = this.R + 0.36;
    this.layKz = this.kz;
    const ref = me >= 0 ? me : 0;
    const keep = new Set();
    list.forEach((p, i) => {
      keep.add(p.id);
      let a = this.av.get(p.id);
      if (!a || a.ci !== p.c) { a = new Avatar(p.c); this.av.set(p.id, a); if (this.seatKey0) a.waveT = this.time; }
      const ang = this.base + ((i - ref) * TAU) / n;
      a.seat = i;
      a.ang = ang;
      const rr = this.rAt(ang, this.R) + 0.36;
      a.pos = [Math.cos(ang) * rr, 0, Math.sin(ang) * rr];
      a.yaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
    });
    [...this.av.keys()].forEach((id) => { if (!keep.has(id)) this.av.delete(id); });
    this.fitKey = '';
    this.seatKey0 = true;
    this.syncLabels();
    this.onSeats?.();
    return true;
  }
  tableR(n) { return clamp(1.25 + n * 0.135, 1.55, 2.95) * (this.kz > 1.05 ? 0.92 : 1); }
  // oval masada a açısındaki yarıçap (R: x yönündeki yarıçap)
  rAt(a, R) { const c = Math.cos(a), s = Math.sin(a) / this.kz; return R / Math.sqrt(c * c + s * s); }
  placeR(a) { const r = this.rAt(a, this.R); return Math.min(r - 0.42, r * 0.8); }
  onTableAt(x, z, pad = 0) { const R = this.R + pad; return (x * x) / (R * R) + (z * z) / (R * R * this.kz * this.kz) < 1; }
  // ekran oranına göre masa biçimi (dikeyde uzun oval, yatayda hafif geniş)
  shapeFor(vw, vh) { const asp = vh / Math.max(1, vw); return asp >= 1.5 ? 1.24 : asp <= 0.8 ? 0.86 : lerp(0.86, 1.24, (asp - 0.8) / 0.7); }
  seatAngle(i) { const n = Math.max(1, this.seats.length); return this.base + ((i - (this.me >= 0 ? this.me : 0)) * TAU) / n; }
  avatarAt(i) { const p = this.seats[i]; return p ? this.av.get(p.id) : null; }
  syncLabels() {
    const L = this.el.lbls;
    const want = new Set();
    this.seats.forEach((p, i) => {
      want.add(p.id);
      let o = this.lbl.get(p.id);
      if (!o) {
        const el = document.createElement('div');
        el.className = 'lbl';
        L.appendChild(el);
        o = { lbl: el, key: '' };
        this.lbl.set(p.id, o);
      }
      const k = `${p.n}|${p.c}|${i === this.me}|${p.on}`;
      if (o.key !== k) {
        o.key = k;
        o.lbl.innerHTML = `<i style="background:${pcol(p.c)}"></i>${esc(p.n)}${i === this.me ? ' <em>(sen)</em>' : ''}`;
        o.lbl.classList.toggle('me', i === this.me);
        o.lbl.classList.toggle('off', p.on === 0);
        o.lbl.style.setProperty('--lc', pcol(p.c));
        o.lblW = 0;
      }
    });
    [...this.lbl.keys()].forEach((id) => { if (!want.has(id)) { this.lbl.get(id).lbl.remove(); this.lbl.delete(id); } });
  }

  /* ---------- dünya ---------- */
  mk(fn, kind = 'lit') { const mb = new MB(kind); fn(mb); return mb.build(this.X); }
  buildWorld() {
    const X = this.X;
    if (!X) return;
    this.freeWorld();
    this.W = { av: {} };
    const acc = this.brand.slug === 'nfc' ? '#c8261c' : this.brand.accentHex;
    this.accHex = acc;
    const A = this.arena = arenaOf(this.cfg, this.brand);
    this.rimHex = A.edge;
    const V = this.venue = A.venue || null;
    let shellMB = null; this.vfx = null;
    let secMB = null;
    this.W.venueFloor = this.mk((mb) => { if (V) { VFX = { blobs: [], glows: [] }; shellMB = VSH = new MB('lit'); secMB = VSEC = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new MB('lit')); try { V.build(mb, A, shellMB); if (V.posters) VK.posters(shellMB, V.posters, V.posterHex || '#c9a34a'); } finally { VSH = null; VSEC = null; } this.vfx = VFX; VFX = null; } else arenaFloorModel(mb, Object.assign({}, A, { edge: this.rimHex })); });
    this.W.venueShell = shellMB && shellMB.d.length ? shellMB.build(X) : null;
    this.W.sec = secMB && secMB.some((b) => b.d.length) ? secMB.map((b) => (b.d.length ? b.build(X) : null)) : null;
    this.secF = [1, 1, 1, 1, 1, 1, 1, 1]; this.secO = [0, 0, 0, 0, 0, 0, 0, 0];
    this.W.balloon = V || A.fl === 'none' ? null : this.mk(A.fl === 'heart' ? heartBalloonModel : A.fl === 'lantern' ? lanternModel : balloonModel);
    this.W.cloud = V || A.night ? null : this.mk(cloudModel);
    this.W.star = V ? null : this.mk(SPINNERS[A.star] || starModel);
    this.W.anim = V && V.anim ? V.anim.filter((q) => VANIM[q.key]).map((q) => ({ q, m: this.mk(VANIM[q.key]), k: q.sec != null ? q.sec : V.room && Math.hypot(q.x, q.z) > 3.9 ? vSecOf(q.x, q.z) : -1 })) : null;
    this.balT = null; this.skyC = null; this.fogC = null;
    this.W.upper = this.mk(upperArmModel);
    this.W.fore = this.mk(foreArmModel);
    this.W.lids = this.mk(lidsModel);
    this.W.expr = {};
    this.W.hand = {};
    const CH = V && CHAIRS[V.chair];
    this.W.chair = CH ? this.mk((mb) => CH.base(mb, V.chairO || {})) : this.mk((mb) => chairModel(mb, '#fff4e4', '#ffffff'));
    this.W.chairP = CH ? this.mk((mb) => CH.pad(mb, V.chairO || {})) : null;
    this.W.lamp = this.mk((mb) => pendantModel(mb, this.cfg.lampHex || '#1f4a3a', 4));
    this.W.tea = this.mk((mb) => teaGlassModel(mb, acc));
    this.W.teaS = this.mk(teaGlassShell, 'un');
    this.W.place = [0, 1, 2].map((k) => this.mk((mb) => placeSetting(mb, acc, k)));
    if (this.cfg.room !== false) {
      this.W.room = V ? null : this.mk((mb) => arenaPropsModel(mb, A, A.brand ? A.K[0] : acc, A.K || CANDY));
      this.W.boardQ = this.mk((tb) => tb.tquad([-1.66, 0.52, -7.69], [1.66, 0.52, -7.69], [1.66, 2.76, -7.69], [-1.66, 2.76, -7.69], 0, 0, 1, 1), 'tex');
      this.W.frameQ = V && !V.posters ? null : this.mk(frameQuads, 'tex');
      this.W.logoQ = V && V.logos ? [0, 1, 2, 3].map((k) => { const Lq = V.logos.filter((q) => q[0] === k); return Lq.length ? this.mk((tb) => { for (const q of Lq) { const a = wXZ(k, q[1] - q[3] / 2, 0.06), b = wXZ(k, q[1] + q[3] / 2, 0.06); tb.tquad([a[0], q[2], a[1]], [b[0], q[2], b[1]], [b[0], q[2] + q[4], b[1]], [a[0], q[2] + q[4], a[1]], 0, 0, 1, 1); } }, 'tex') : null; }) : null;
      this.boardCv = document.createElement('canvas');
      this.boardCv.width = 1024; this.boardCv.height = 692;
      let lg = null;
      const draw = () => (V && V.board === 'chalk' ? drawBoard(this.boardCv, this.cfg.title || '', this.cfg.sub || '', this.brand.slug === 'nfc' ? 'NFC DÜNYASI' : this.brand.name, this.signDy || 0) : drawSign(this.boardCv, this.cfg.title || '', this.cfg.sub || '', this.brand.slug === 'nfc' ? 'NFC DÜNYASI' : this.brand.name, A, lg, this.signDy || 0));
      this.signDraw = () => { try { if (this.dead || !this.boardTex || !this.X || this.X.gl.isContextLost()) return; draw(); updateTexture(this.X, this.boardTex, this.boardCv); } catch { /* yok say */ } };
      if (this.brand.logo && typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { lg = im; try { if (this.dead || !this.X || this.X.gl.isContextLost()) return; draw(); if (this.boardTex) updateTexture(this.X, this.boardTex, this.boardCv); } catch { /* yok say */ } }; im.src = this.brand.logo; }
      draw();
      this.boardTex = makeTexture(this.X, this.boardCv);
      try { document.fonts?.ready?.then(() => { if (this.dead || !this.boardTex || !this.X || this.X.gl.isContextLost()) return; draw(); updateTexture(this.X, this.boardTex, this.boardCv); }); } catch { /* yok say */ }
    }
    this.table = null;
    this.world?.(this.W);
  }
  // masa ve halı koltuk sayısına göre (yarıçap değişince yeniden kurulur)
  ensureTable() {
    if (!this.X || !this.W) return;
    const key = this.R.toFixed(2) + '|' + this.kz.toFixed(2);
    if (this.tableKey === key) return;
    this.tableKey = key;
    ['table', 'rug'].forEach((k) => { if (this.W[k]) freeMesh(this.X, this.W[k]); });
    const acc = this.accHex;
    const kz = this.kz;
    const V = this.venue, TB = V && TABLES[V.table];
    this.W.table = this.mk((mb) => { mb.push().T(0, 0, 0, 0, 0, 0, 1, 1, kz); if (TB) TB(mb, this.R, Object.assign({ trim: this.cfg.trim || acc, cloth: this.cfg.cloth || '#e9e0cf' }, V.tableO || {})); else tableModel(mb, this.R, this.cfg.trim || acc, this.cfg.cloth || '#e9e0cf'); mb.pop(); });
    const BR = V && this.arena && this.arena.brand ? this.arena : null;
    const rugK = !V ? null : BR ? (['round', 'led', 'patch', 'gingham', 'towel'].indexOf(V.rug) >= 0 ? V.rug : 'round') : V.rug;
    const rugO = !BR ? (V && V.rugO) || {} : rugK === 'led' ? { glow: BR.edge, rug: '#14161f' } : { rug: BR.rug, rugB: BR.rugB, rugM: vMixHex(BR.rug, BR.rugB, 0.55) };
    this.W.rug = V && !rugK ? null : this.mk((mb) => { mb.push().T(0, 0, 0, 0, 0, 0, 1, 1, kz); if (V) (RUGS[rugK] || RUGS.round)(mb, this.R + 1.25, rugO); else arenaRugModel(mb, this.R + 1.25, this.arena, this.rimHex); mb.pop(); });
    this.onTable?.(this.W);
  }
  avMesh(a) {
    const W = this.W;
    const k = a.ci;
    if (!W.av[k]) W.av[k] = { torso: this.mk((mb) => torsoModel(mb, a.st)), head: this.mk((mb) => headModel(mb, a.st)), legs: this.mk((mb) => seatedLegsModel(mb, a.st)) };
    return W.av[k];
  }
  exprMesh(kind) { if (!this.W.expr[kind]) this.W.expr[kind] = this.mk((mb) => exprModel(mb, kind)); return this.W.expr[kind]; }
  handMesh(shape, side) { const k = shape + side; if (!this.W.hand[k]) this.W.hand[k] = this.mk((mb) => handModel(mb, shape, side ? 1 : -1)); return this.W.hand[k]; }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; return; }
    const X = this.X;
    const free = (o) => { if (!o) return; if (o.b) freeMesh(X, o); else if (Array.isArray(o)) o.forEach(free); else if (typeof o === 'object') Object.values(o).forEach(free); };
    free(W);
    if (this.boardTex) X.gl.deleteTexture(this.boardTex);
    this.boardTex = null;
    this.freeTex?.();
    this.W = null;
    this.tableKey = '';
  }
  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.W = null;
      this.buildWorld();
    } catch (e) { console.warn(`[${this.tag}] geri yükleme`, e); }
  }

  /* ---------- kamera ---------- */
  resize() {
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    const W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return [W, H, w / h];
  }
  // tüm koltuklar (sandalye ayağı + baş üstü) ekrana, üstte HUD, altta düğme payı bırakarak sığsın
  fitD(pitch, ty, fov, asp) {
    const vh = this.vh || 640, vw = this.vw || 360;
    const land = vw > vh * 1.1;
    const topPx = land ? 46 : 104, botPx = land ? (this.cfg.botPxL ?? 64) : (this.cfg.botPx ?? 150);
    // yanlarda isim etiketlerine pay (etiket başın iki yanına taşar)
    const top = 1 - 2 * Math.min(0.3, topPx / vh), bot = -1 + 2 * Math.min(0.34, botPx / vh), side = land ? 0.84 : 1 - 2 * Math.min(0.2, 54 / vw);
    const pts = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU, ca = Math.cos(a), sa = Math.sin(a), rs = this.rAt(a, this.R) + 0.36;
      pts.push([ca * (rs + 0.36), 0, sa * (rs + 0.36)], [ca * (rs + 0.05), 1.78, sa * (rs + 0.05)]);
    }
    const V = this.mats.TV, P = this.mats.TP, VP = this.mats.TVP;
    M.persp(P, fov, asp, 0.3, 120);
    const ok = (D) => {
      M.look(V, 0, ty + Math.sin(pitch) * D, Math.cos(pitch) * D, 0, ty, 0);
      M.mul(VP, P, V);
      for (const [x, y, z] of pts) {
        const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
        if (cw <= 0.3) return false;
        const nx = cx / cw, ny = cy / cw;
        if (nx < -side || nx > side || ny > top || ny < bot) return false;
      }
      return true;
    };
    let lo = 2, hi = 60;
    for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
    return hi;
  }
  stepCam(dt) {
    const c = this.cam;
    const asp = (this.vw || 1) / (this.vh || 1);
    const land = asp > 1.1;
    c.fov = land ? 0.7 : 0.78;
    const pitch = (land ? 0.78 : 0.98) + c.pitchAdd;
    const key = `${this.Rs.toFixed(2)}|${this.kz.toFixed(2)}|${Math.round(this.vw)}|${Math.round(this.vh)}|${c.pitchAdd.toFixed(2)}`;
    if (key !== this.fitKey) { this.fitKey = key; this.fitVal = this.fitD(pitch, 0.7, c.fov, asp); }
    c.D = damp(c.D, this.fitVal * c.zoom, 2.6, dt);
    c.tx = damp(c.tx, c.fx, 2.2, dt);
    c.tz = damp(c.tz, c.fz, 2.2, dt);
    c.ty = damp(c.ty, 0.7 + c.fy, 2.2, dt);
    const sh = c.shake > 0 ? (Math.random() - 0.5) * c.shake * 0.2 : 0;
    c.shake = Math.max(0, c.shake - dt * 1.6);
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    c.ex = c.tx + sy * Math.cos(pitch) * c.D + sh;
    c.ey = c.ty + Math.sin(pitch) * c.D + sh * 0.5;
    c.ez = c.tz + cy * Math.cos(pitch) * c.D;
  }
  // dikey ekranda tabela yazısının üst kenarı, üstteki düğmelerin altında kalacak kadar yazıyı aşağı kaydır (en çok %26; ani gidip gelme olmasın)
  signFit() {
    const t = this.time || 0, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    if (!this.hudT || t - this.hudT > 2.5) {
      this.hudT = t; let b = 0;
      try { const w = this.el && this.el.wrap, r0 = w ? w.getBoundingClientRect().top : 0, root = (w && w.closest('#ky')) || w; (root ? root.querySelectorAll('button, .pos') : []).forEach((e) => { const r = e.getBoundingClientRect(); if (r.height > 16 && r.height < 90 && r.width < 220 && r.top - r0 < 100 && getComputedStyle(e).display !== 'none') b = Math.max(b, r.bottom - r0); }); } catch { /* yok say */ }
      this.hudB = b > 20 ? b + 8 : 64;
    }
    let need = 0;
    if (!land) {
      const yo = this.secO ? this.secO[0] : 0, hud = this.hudB || 64;
      const sy = (f) => { const p = this.project(0, 2.76 - f * 2.24 + yo, -7.69); return p ? p[1] : 1e9; };
      if (sy(1) > hud + 30) { for (need = 0; need < 0.26 - 1e-6; need += 0.02) { if (sy(0.28 + need) >= hud) break; } }
    }
    need = Math.round(Math.min(0.26, need) * 100) / 100;
    const cur = this.signDy || 0;
    if (need === cur || (need < cur && cur - need < 0.07) || t - (this.signT ?? -9) < 0.7) return;
    this.signDy = need; this.signT = t; this.signDraw();
  }
  project(x, y, z) {
    const m = this.mats.VP;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    return [((cx / cw) * 0.5 + 0.5) * (this.vw || 1), (1 - ((cy / cw) * 0.5 + 0.5)) * (this.vh || 1), cw];
  }

  /* ---------- parçacıklar ---------- */
  burst(x, y, z, n, col, sp, size, add, life, grav = 5) {
    for (let i = 0; i < n && this.parts.length < 900; i++) {
      const a = Math.random() * TAU, e = Math.random();
      const c = Array.isArray(col[0]) ? col[Math.floor(Math.random() * col.length)] : col;
      this.parts.push({ x, y, z, vx: Math.cos(a) * sp * e, vy: Math.random() * sp * 0.9 + sp * 0.3, vz: Math.sin(a) * sp * e, life: life * (0.6 + Math.random() * 0.5), max: life, s: size * (0.6 + Math.random() * 0.6), r: c[0], g: c[1], b: c[2], add, grav, drag: 1.4 });
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
      if (p.y < TABLE_Y + 0.02 && p.vy < 0 && this.onTableAt(p.x, p.z)) { p.y = TABLE_Y + 0.02; p.vy *= -0.3; }
    }
  }
  fillParts(V) {
    const rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    let na = 0, nb = 0;
    for (const p of this.parts) {
      const arr = p.add ? this.pB : this.pA;
      const o = (p.add ? nb : na) * 7;
      if (o + 126 > arr.length) continue;
      const k = p.life / p.max;
      const o2 = emitSoft(arr, o, p.x, p.y, p.z, p.s, p.r, p.g, p.b, Math.min(1, k * 1.6), rx, ry, rz, ux, uy, uz);
      if (p.add) nb += (o2 - o) / 7; else na += (o2 - o) / 7;
    }
    if (this.venue && this.venue.parts) this.venueParts(this.venue.parts, (x, y, z, s, r, g, b, a, add) => {
      const arr = add ? this.pB : this.pA;
      const o = (add ? nb : na) * 7;
      if (o + 126 > arr.length) return;
      const o2 = emitSoft(arr, o, x, y, z, s, r, g, b, a, rx, ry, rz, ux, uy, uz);
      if (add) nb += (o2 - o) / 7; else na += (o2 - o) / 7;
    });
    this.extraParts?.(V, (x, y, z, s, r, g, b, a, add) => {
      const arr = add ? this.pB : this.pA;
      const o = (add ? nb : na) * 7;
      if (o + 126 > arr.length) return;
      const o2 = emitSoft(arr, o, x, y, z, s, r, g, b, a, rx, ry, rz, ux, uy, uz);
      if (add) nb += (o2 - o) / 7; else na += (o2 - o) / 7;
    });
    return [na, nb];
  }

  /* ---------- çizim ---------- */
  // gökyüzü rengi: oyun sisi karartırsa (gece) gök de kararır
  skyMix(hex, fog, k) {
    const S = this.skyC || (this.skyC = [hexRGB(this.arena.top), hexRGB(this.arena.hor), [0, 0, 0], [0, 0, 0]]);
    const d = clamp(lum(fog) / 0.75, 0, 1), s = S[k], o = S[2 + k];
    for (let i = 0; i < 3; i++) o[i] = fog[i] + (s[i] - fog[i]) * d;
    return o;
  }
  light() { return (this.venue && this.venue.L) || this.cfg.light || NIGHT_IN; }
  // mekânın havası: toz zerreleri, ateş böcekleri, kar, konfeti, yıldız pırıltısı, gül yaprağı
  venueParts(kind, emit) {
    const t = this.time;
    if (kind === 'dust') for (let k = 0; k < 22; k++) { const h1 = hs(k, 1), h2 = hs(k, 2), h3 = hs(k, 3), x = ((h1 * 16 + t * (0.08 + h2 * 0.1)) % 16) - 8, z = ((h3 * 15 + t * 0.05) % 15) - 8, y = 0.6 + ((h2 * 3.4 + t * 0.04) % 3.4); emit(x, y, z, 0.03 + h3 * 0.03, 1, 0.92, 0.75, 0.2 + 0.14 * Math.sin(t * 1.3 + k), true); }
    else if (kind === 'fireflies') for (let k = 0; k < 30; k++) { const a = hs(k, 4) * TAU + t * (0.12 + hs(k, 5) * 0.18) * (k % 2 ? 1 : -1), r = 4.8 + hs(k, 6) * 4.5, f = 0.5 + 0.5 * Math.sin(t * 3.1 + k * 1.7); emit(Math.cos(a) * r, 0.5 + hs(k, 7) * 2.4 + Math.sin(t * 1.7 + k) * 0.3, Math.sin(a) * r * 0.9 - 1, 0.05 + f * 0.05, 0.85, 1, 0.45, 0.3 + f * 0.65, true); }
    else if (kind === 'snow') for (let k = 0; k < 90; k++) { const h1 = hs(k, 8), h2 = hs(k, 9), h3 = hs(k, 10), sp = 0.5 + h2 * 0.5, y = 6 - ((h2 * 6 + t * sp) % 6), x = ((h1 * 20 + t * 0.3 + Math.sin(t * 0.7 + k) * 0.3 + 100) % 20) - 10, z = ((h3 * 18 + t * 0.15) % 18) - 9; emit(x, y, z, 0.035 + h3 * 0.03, 1, 1, 1, 0.85, false); }
    else if (kind === 'confetti') for (let k = 0; k < 30; k++) { const c = hexRGB(CANDY[k % CANDY.length]), h1 = hs(k, 11), h2 = hs(k, 12), y = 4 - ((h2 * 4 + t * 0.35) % 4), a = h1 * TAU + t * 0.1, f = 0.5 + 0.5 * Math.sin(t * 5 + k * 2.1); emit(Math.cos(a) * (4.8 + h2 * 3.5), y + 0.3, Math.sin(a) * (4.2 + h2 * 3) - 1, 0.04 + f * 0.035, c[0], c[1], c[2], 0.35 + f * 0.55, true); }
    else if (kind === 'sparkle') for (let k = 0; k < 26; k++) { const x = -8 + hs(k, 13) * 16, y = 0.6 + hs(k, 14) * 4, z = -7.4 + hs(k, 15) * 3.4, f = Math.max(0, Math.sin(t * (1.5 + hs(k, 16) * 2) + k * 2.3)); if (Math.abs(x) < 2 && y < 3) continue; emit(x, y, z, 0.04 + f * 0.1, 1, 0.95, 0.8, f * 0.9, true); }
    else if (kind === 'petals') for (let k = 0; k < 32; k++) { const h1 = hs(k, 17), h2 = hs(k, 18), h3 = hs(k, 19), sp = 0.25 + h2 * 0.25, y = 4.5 - ((h2 * 4.5 + t * sp) % 4.5), x = ((h1 * 18 + Math.sin(t * 0.9 + k) * 0.6 + 100) % 18) - 9, z = ((h3 * 16 + t * 0.12) % 16) - 8; emit(x, y, z, 0.05 + h3 * 0.03, 1, 0.55 + h1 * 0.3, 0.68 + h1 * 0.2, 0.85, false); }
  }
  // Opak sahne: oda, masa, sandalyeler, tabaklar + oyuna özgü (sceneGame). D(mesh, m, tint, alpha, glow)
  scene(D, shadow) {
    const Wd = this.W, m = this.mats.a;
    const T = this.T;
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      M.set(m, a.pos[0] - Math.cos(a.ang) * 0.06, 0, a.pos[2] - Math.sin(a.ang) * 0.06, a.yaw, 0, 0, 1);
      if (Wd.chairP) { D(Wd.chair, m, ONE3); D(Wd.chairP, m, a.padT || (a.padT = new Float32Array([0.2 + 0.8 * a.tint[0], 0.2 + 0.8 * a.tint[1], 0.2 + 0.8 * a.tint[2]]))); }
      else D(Wd.chair, m, a.chairT || (a.chairT = new Float32Array([0.42 + 0.58 * a.tint[0], 0.42 + 0.58 * a.tint[1], 0.42 + 0.58 * a.tint[2]])));
      if (!shadow) {
        const q = this.placeR(a.ang);
        if (this.cfg.place !== false) {
          M.set(m, Math.cos(a.ang) * q, TABLE_Y + 0.004, Math.sin(a.ang) * q, a.yaw, 0, 0, 1);
          D(Wd.place[i % 3], m, T.obj);
        }
        if (this.cfg.tea !== false) {
          const ta = a.ang + 0.32 / Math.max(1, q / 1.6), tq = this.placeR(ta) + 0.02;
          M.set(m, Math.cos(ta) * tq, TABLE_Y + 0.004, Math.sin(ta) * tq, 0);
          D(Wd.tea, m, T.obj);
        }
      }
    });
    if (Wd.table) { M.set(m, 0, 0, 0); D(Wd.table, m, T.cloth); }
    this.sceneGame?.(D, shadow);
  }
  drawAvatars(F, shadow) {
    const X = this.X, Wd = this.W;
    const o = { h: this.vh, rim: [1, 0.78, 0.5], rimK: 0.3 };
    const tint = this.tintC || (this.tintC = new Float32Array(3));
    const tintS = this.tintS || (this.tintS = new Float32Array(3));
    const tintH = this.tintH || (this.tintH = new Float32Array(3));
    let i = 0;
    for (const p of this.seats) {
      const a = this.av.get(p.id);
      if (!a) { i++; continue; }
      const mm = this.avMesh(a);
      const dim = p.on === 0 ? 0.55 : 1;
      const k = (this.avTint?.(a, i) ?? 1) * dim * this.T.av;
      tint[0] = tint[1] = tint[2] = k;
      tintS[0] = a.tint[0] * k; tintS[1] = a.tint[1] * k; tintS[2] = a.tint[2] * k;
      tintH[0] = a.skinT[0] * k; tintH[1] = a.skinT[1] * k; tintH[2] = a.skinT[2] * k;
      if (shadow) {
        shadowCast(X, mm.torso, a.M.body); shadowCast(X, mm.head, a.M.head);
        for (let j = 0; j < 2; j++) { shadowCast(X, Wd.upper, a.M.up[j]); shadowCast(X, Wd.fore, a.M.fo[j]); shadowCast(X, this.handMesh(a.shape[j], j), a.M.hd[j]); }
        i++;
        continue;
      }
      drawMesh(X, mm.legs, a.M.body, tint);
      drawToon(X, mm.torso, a.M.body, tint, F, o);
      drawToon(X, mm.head, a.M.head, tint, F, o);
      drawMesh(X, this.exprMesh(a.expr), a.M.head, tint);
      if ((a.expr !== 'laugh' && a.expr !== 'wince') && KIT.blinkAt(i, this.time)) drawMesh(X, Wd.lids, a.M.head, tintH);
      for (let j = 0; j < 2; j++) {
        drawToon(X, Wd.upper, a.M.up[j], tintS, F, o);
        drawToon(X, Wd.fore, a.M.fo[j], tintS, F, o);
        drawToon(X, this.handMesh(a.shape[j], j), a.M.hd[j], tintH, F, o);
      }
      i++;
    }
  }
  draw(dt) {
    const X = this.X, Wd = this.W;
    if (!X || this.lost || !Wd) return;
    if (window.__qKilit != null) window.__tg = this;
    this.ensureTable();
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const c = this.cam, mt = this.mats;
    M.persp(mt.P, c.fov, asp, 0.3, 140);
    M.look(mt.V, c.ex, c.ey, c.ez, c.tx, c.ty, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const A = this.arena || ARENAS.gok;
    const L = this.cfg.rawLight || (this.venue && this.venue.raw && this.light() === this.venue.L) ? this.light() : partyLight(this.light(), this.Lp || (this.Lp = { sunC: [0, 0, 0], sky: [0, 0, 0], gnd: [0, 0, 0], warm: [0, 0, 0], lampC: [0, 0, 0] }));
    const fl = 0.97 + 0.03 * Math.sin(this.time * 2.3);
    const lamp = this.lampPos || [0, 2.75, 0];
    const lampC = this.lampC || (this.lampC = new Float32Array(3));
    const lk = this.lampK ?? 1;
    lampC[0] = L.lampC[0] * fl * lk; lampC[1] = L.lampC[1] * fl * lk; lampC[2] = L.lampC[2] * fl * lk;
    const sun = this.sunDir || (this.sunDir = new Float32Array(norm3((this.venue && this.venue.sun) || [0.66, 0.7, 0.3])));
    const fog = this.fogC || (this.fogC = new Float32Array(hexRGB(A.haze)));
    const F = { VP: mt.VP, V: mt.V, fov: c.fov, asp, shift: 0, cx: c.ex, cy: c.ey, cz: c.ez, sun, fog, top: this.skyMix(A.top, fog, 0), hor: this.skyMix(A.hor, fog, 1), sunVis: sun, lx: lamp[0], ly: lamp[1], lz: lamp[2], lampC };
    this.F = F;
    if (this.boardTex && this.signDraw && this.cfg.room !== false) this.signFit();
    if (this.venue && (Wd.sec || Wd.logoQ || Wd.anim)) { const L2 = Math.hypot(c.ex, c.ez) || 1, dx = c.ex / L2, dz = c.ez / L2, H2 = (this.venue.wallH || 5.2) - 0.3; for (let k = 0; k < 8; k++) { const d = SECN[k][0] * dx + SECN[k][1] * dz, t2 = clamp((d - 0.16) / 0.4, 0, 1), f = 1 - t2 * t2 * (3 - 2 * t2); this.secF[k] = f; this.secO[k] = -(1 - f) * H2; } }
    const fogA = c.D * 1.2, fogB = c.D * 1.2 + 26;
    const setFog = (p) => { if (p.u.uFogR) gl.uniform2f(p.u.uFogR, fogA, fogB); };
    const T = this.T || (this.T = { obj: new Float32Array([1, 1, 1]), cloth: new Float32Array([1, 1, 1]), av: 1.06, floor: new Float32Array([1, 1, 1]), room: new Float32Array([1, 1, 1]) });
    // avatar iskeletleri
    this.avatarsStep?.(dt);
    for (const a of this.av.values()) a.step(dt, this.time);
    // ---- gölge haritası ----
    const shR = this.venue ? Math.max(this.Rs + 1.6, this.venue.shR || 7.4) : this.Rs + 1.6;
    if (shadowBegin(X, sun, 0, 0.6, 0, shR, shR * 2.2 + 10, 0.5)) {
      this.scene((mesh, mm) => shadowCast(X, mesh, mm), true);
      this.drawAvatars(F, true);
      if (this.venue && Wd.venueFloor) { M.set(mt.a, 0, 0, 0); shadowCast(X, Wd.venueFloor, mt.a); if (Wd.sec && this.venue.secShadow) for (let k = 0; k < Wd.sec.length; k++) if (Wd.sec[k] && this.secF[k] > 0.004) { M.set(mt.a, 0, this.secO[k], 0); shadowCast(X, Wd.sec[k], mt.a); } }
    }
    shadowEnd(X, Wp, Hp);
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(fog[0], fog[1], fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    try { drawSky(X, F, L); } catch { /* gökyüzü çizilemezse düz renk kalır */ }
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    const m = mt.a;
    // ---- tabela ve afişler (dokulu) ----
    useProg(X, X.tex, F, L);
    setFog(X.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(X.tex.u.uTex, 0);
    gl.uniform1f(X.tex.u.uSelf, 0);
    M.set(m, 0, 0, 0);
    if (this.boardTex && Wd.boardQ) {
      gl.uniform1f(X.tex.u.uSelf, 0.55);
      gl.bindTexture(gl.TEXTURE_2D, this.boardTex);
      const v2 = this.venue && (Wd.sec || Wd.logoQ);
      if (v2) M.set(m, 0, this.secO[0], 0);
      if (!v2 || this.secF[0] > 0.02) drawMesh(X, Wd.boardQ, m, ONE3);
      gl.uniform1f(X.tex.u.uSelf, 0.3);
      gl.bindTexture(gl.TEXTURE_2D, this.res.logo);
      if (Wd.logoQ) { for (let k = 0; k < 4; k++) if (Wd.logoQ[k] && this.secF[k] > 0.02) { M.set(m, 0, this.secO[k], 0); drawMesh(X, Wd.logoQ[k], m, ONE3); } }
      else { M.set(m, 0, 0, 0); drawMesh(X, Wd.frameQ, m, ONE3); }
      M.set(m, 0, 0, 0);
      gl.uniform1f(X.tex.u.uSelf, 0);
    }
    this.drawTexBack?.(F, L, setFog);
    // ---- opak ----
    useProg(X, X.lit, F, L);
    setFog(X.lit);
    aoOn(X, 0, 0.5, 0.35);
    if (this.venue) detailOn(X, this.venue.det ?? 0.13, this.venue.detS ?? 0.34);
    if (Wd.rug) { M.set(m, 0, 0, 0); drawMesh(X, Wd.rug, m, T.obj); }
    M.set(m, 0, 0, 0); drawMesh(X, Wd.venueFloor, m, T.floor); if (Wd.venueShell) drawMesh(X, Wd.venueShell, m, T.floor); if (Wd.sec) { for (let k = 0; k < Wd.sec.length; k++) if (Wd.sec[k] && this.secF[k] > 0.004) { M.set(m, 0, this.secO[k], 0); drawMesh(X, Wd.sec[k], m, T.floor); } M.set(m, 0, 0, 0); } if (this.venue) detailOn(X, 0);
    if (Wd.anim) { const tm = this.time; for (const o of Wd.anim) { if (o.k >= 0 && this.secF[o.k] < 0.004) continue; const q = o.q, r = tm * q.sp; M.set(m, q.x, q.y + (o.k >= 0 ? this.secO[o.k] : 0), q.z, (q.ry || 0) + (q.ax === 'y' ? r : 0), q.ax === 'x' ? r : 0, q.ax === 'z' ? r : 0); drawMesh(X, o.m, m, ONE3); } }
    if (this.venue && A.brand && this.res && this.res.food && this.brand.foods && !(Wd.sec && this.secF[0] < 0.5)) { const fd = this.brand.foods.filter((f) => f !== 'box' && this.res.food[f]); if (fd.length) { const tm = this.time; for (let i = 0; i < 2; i++) { M.set(m, i ? 2.75 : -2.75, 3.25 + Math.sin(tm * 1.3 + i * 1.7) * 0.12, -6.45, tm * 0.6 * (i ? -1 : 1) + i, 0.25, 0, 2.2); drawMesh(X, this.res.food[fd[i % fd.length]], m, ONE3); } } }
    if (Wd.room) {
      M.set(m, 0, 0, 0); drawMesh(X, Wd.room, m, T.room, 1, 1.15);
      const tm = this.time, bt = this.balT || (this.balT = ARENA_BALLOONS.map((b) => new Float32Array(A.fl === 'lantern' ? [1, 0.78, 0.36] : hexRGB(A.fl === 'heart' ? ['#ff4d6d', '#ffffff', '#ff8fab'][b[3] % 3] : (A.K || CANDY)[b[3] % (A.brand ? 3 : 5)]))));
      if (Wd.balloon) ARENA_BALLOONS.forEach((b, i) => { M.set(m, b[0], 0, b[1], i * 1.7, Math.sin(tm * 0.9 + i * 1.3) * 0.07, Math.sin(tm * 0.7 + i * 2.1) * 0.09, b[2]); drawMesh(X, Wd.balloon, m, bt[i]); });
      const fd = A.brand && this.res.food ? this.brand.foods.filter((f) => f !== 'box') : null;
      if (fd && fd.length) {
        // işletmenin yiyecekleri: kemerin iki yanında dev boy, yavaşça dönerek süzülür
        [[-5.6, 2.1, -6.9, 4.6], [5.6, 2.1, -6.9, 4.6], [-8.1, 2.5, -4.4, 3.4], [8.1, 2.5, -4.4, 3.4]].forEach((q, i) => {
          M.set(m, q[0], q[1] + Math.sin(tm * 1.3 + i * 1.7) * 0.14, q[2], tm * 0.7 * (i % 2 ? -1 : 1) + i, 0.25, 0, q[3]);
          drawMesh(X, this.res.food[fd[i % fd.length]], m, ONE3);
        });
      } else for (const s of [-1, 1]) { M.set(m, s * 5.6, 2.0 + Math.sin(tm * 1.4 + s) * 0.12, -6.9, tm * 0.8 * s, 0, 0, 1.25); drawMesh(X, Wd.star, m, ONE3); }
      if (Wd.cloud) ARENA_CLOUDS.forEach((q, i) => { M.set(m, q[0] + Math.sin(tm * 0.05 + i * 1.9) * 1.6, q[1] + Math.sin(tm * 0.21 + i) * 0.15, q[2], i * 0.9, 0, 0, q[3]); drawMesh(X, Wd.cloud, m, ONE3); });
    }
    this.drawRoom?.(F, L);
    this.scene((mesh, mm, tint, al, gw) => drawMesh(X, mesh, mm, tint, al, gw), false);
    // sarkıt lamba
    if (this.cfg.lampMesh) { M.set(m, lamp[0], lamp[1] + 0.05, lamp[2]); drawMesh(X, Wd.lamp, m, ONE3, 1, 1.25); }
    aoOn(X, 0, 1, 0);
    this.drawAvatars(F, false);
    this.drawLit2?.(F, L);
    // ---- dokulu (logolar, tabelalar, oyun yüzeyleri) ----
    if (this.drawTex) {
      useProg(X, X.tex, F, L);
      setFog(X.tex);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(X.tex.u.uTex, 0);
      this.drawTex(F, L);
    }
    // ---- saydam ----
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, L);
    setFog(X.un);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // çay bardaklarının camı
    if (this.cfg.tea !== false) {
      this.seats.forEach((p) => {
        const a = this.av.get(p.id);
        if (!a) return;
        const ta = a.ang + 0.32 / Math.max(1, this.placeR(a.ang) / 1.6), q = this.placeR(ta) + 0.02;
        M.set(m, Math.cos(ta) * q, TABLE_Y + 0.026, Math.sin(ta) * q);
        drawMesh(X, Wd.teaS, m, ONE3, 1);
      });
    }
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    // masanın altı: yumuşak koyu gölge
    M.set(m, 0, this.venue ? 0.066 : 0.012, 0, 0, 0, 0, this.R * 1.25, 1, this.R * 1.25 * this.kz);
    drawMesh(X, this.res.shadow, m, ONE3, 0.85);
    if (this.vfx) for (const b of this.vfx.blobs) { M.set(m, b[0], b[1], b[2], b[6], 0, 0, b[3], 1, b[4]); drawMesh(X, this.res.shadow, m, ONE3, b[5]); }
    this.drawShadowsExtra?.(m);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    // lamba ışık havuzu (masada)
    M.set(m, 0, TABLE_Y + 0.012, 0, 0, 0, 0, this.R * 0.92, 1, this.R * 0.92 * this.kz);
    drawMesh(X, this.res.glow, m, [1, 0.72, 0.42], 0.07 * lk);
    if (this.vfx && this.vfx.glows.length) { const tm = this.time; for (const g of this.vfx.glows) { const sk = g[10] >= 0 && this.secF ? this.secF[g[10]] : 1; if (sk < 0.03) continue; const gy = g[1] + (g[10] >= 0 && this.secO ? this.secO[g[10]] : 0); const f = g[7] ? 1 + (Math.sin(tm * 9.1 + g[0] * 3.7) * 0.6 + Math.sin(tm * 13.7 + g[2] * 2.3) * 0.4) * 0.16 * g[7] : 1; if (g[6] === 'h') M.set(m, g[0], gy, g[2], g[8], 0, 0, g[3], 1, g[9]); else if (g[6] === 'z') M.set(m, g[0], gy, g[2], g[8], Math.PI / 2, 0, g[3], 1, g[9]); else if (g[6] === 'x') M.set(m, g[0], gy, g[2], Math.PI / 2 + g[8], Math.PI / 2, 0, g[3], 1, g[9]); else { const ddx = F.cx - g[0], ddy = F.cy - gy, ddz = F.cz - g[2], dl = Math.hypot(ddx, ddy, ddz) || 1; M.set(m, g[0], gy, g[2], Math.atan2(ddx, ddz), Math.acos(clamp(ddy / dl, -1, 1)), 0, g[3], 1, g[3]); } drawMesh(X, this.res.glow, m, g[4], g[5] * f * sk); } }
    if (false) {
      for (const ax of [-2.35, 2.35]) {
        M.set(m, ax, 2.95, -ROOM.ZB + 0.34, 0, Math.PI / 2, 0, 0.55, 1, 0.55);
        drawMesh(X, this.res.glow, m, [1, 0.75, 0.45], 0.5);
        M.set(m, ax, 2.6, -ROOM.ZB + 0.05, 0, Math.PI / 2, 0, 1.3, 1, 1.6);
        drawMesh(X, this.res.glow, m, [1, 0.62, 0.32], 0.16);
      }
    }
    this.drawFx?.(F, m);
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    this.drawOver?.(F, m);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    const asp2 = asp > 1 ? [0.47, 0.3, 0.7] : [0.5, 0.33, 0.7];
    postFX(X, Wp, Hp, Object.assign({ bloom: 0.4, th: 0.84, white: 0.18, sat: 1.16, con: 0.1, vig: 0.2, tilt: asp2 }, (this.venue && this.venue.post) || {}, this.cfg.post || {}));
  }
  // isim etiketleri: başın üstünde, çakışmayan
  placeLbls() {
    const L = [];
    const s = clamp((this.vh || 700) / 760, 0.75, 1.05);
    this.seats.forEach((p) => {
      const a = this.av.get(p.id), o = this.lbl.get(p.id);
      if (!a || !o) return;
      const q = this.project(a.headW[0], a.headW[1] + 0.12, a.headW[2]);
      if (!q) { o.lbl.style.display = 'none'; return; }
      L.push({ o, x: q[0], y: q[1], op: o.op ?? 1, sc: s * clamp(9 / q[2], 0.78, 1.08) });
    });
    placeLabels(L, s);
  }
  emoAnchor(pid) {
    const a = this.av.get(pid);
    if (!a) return null;
    if (this.flat) { const q = this.flatPos?.(a.seat); return q ? [q[0], q[1] - 40] : null; }
    const q = this.project(a.headW[0], a.headW[1] + 0.45, a.headW[2]);
    return q ? [q[0], q[1]] : null;
  }
  emoName(pid) {
    const p = this.seats.find((x) => x.id === pid);
    if (p) return p.n;
    const sb = (this.view?.scoreboard || []).find((x) => x.id === pid);
    return sb ? sb.nickname || '' : '';
  }

  /* ---------- 2D yedek görünüm ---------- */
  flatPos(i) {
    const w = this.vw || 360, h = this.vh || 640;
    const n = Math.max(1, this.seats.length), r = Math.min(w * 0.4, h * 0.3);
    const a = this.seatAngle(i);
    return [w / 2 + Math.cos(a) * r, h * 0.46 + Math.sin(a) * r * 0.8];
  }
  draw2d() {
    const g = this.g2;
    if (!g) return;
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = (this.arena || ARENAS.gok).fa; g.fillRect(0, 0, w, h);
    const r = Math.min(w * 0.4, h * 0.3);
    g.fillStyle = '#f3ece0';
    g.beginPath(); g.ellipse(w / 2, h * 0.46, r * 0.78, r * 0.62, 0, 0, TAU); g.fill();
    this.draw2dGame?.(g, w, h, r);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(String(p.n).slice(0, 10), x, y + 34);
    });
  }

  /* ---------- döngü ---------- */
  loop(now) {
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
      const kz = this.cfg.oval === false ? 1 : this.shapeFor(this.vw, this.vh);
      if (Math.abs(kz - this.kz) > 0.03) { this.kz = kz; if (this.seats.length) { const L = this.seats, me = this.me; this.seatKey = ''; this.setSeats(L, me); } }
      this.uiT += dt;
      if (this.uiT > 0.12) { this.uiT = 0; this.ui?.(); }
      this.tick?.(dt);
      this.stepParts(dt);
      if (this.flat) {
        this.draw2d();
        this.seats.forEach((p, i) => { const o = this.lbl.get(p.id); if (o) o.lbl.style.display = 'none'; void i; });
        this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
        return;
      }
      this.stepCam(dt);
      this.draw(dt);
      this.placeLbls();
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error(`[${this.tag}]`, e); }
    }
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    try { this.snd && this.snd.stopAll(); } catch { /* yok say */ }
    try { this.emo && this.emo.dispose(); } catch { /* yok say */ }
    cancelAnimationFrame(this.raf);
    this.onDispose?.();
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

export const _masa = () => ({ StandAvatar, STAND_LIFT, thighModel, shinModel, standMeshes, standShared, drawStand, castStand, seatMeshes, drawSeat, castSeat, ROOM, roomModel, drawBoard, boardQuad, frameQuads, framesModel, HIP, E, TAU, hs, vn, mix3, rgbA, sst, lum, vsub, vadd, vmul, vdot, vcross, vlen, vnorm, xfP, xfD, frameMat, limbMat, SHO, NECK, HC, HR, UPPER, FORE, TABLE_Y, SEAT_Y, torsoZ, styleOf, torsoModel, headModel, exprModel, EXPRS, upperArmModel, foreArmModel, handModel, HAND_SHAPES, seatedLegsModel, lidsModel, hairModel, Avatar, chairModel, tableModel, rugModel, pendantModel, teaGlassModel, teaGlassShell, placeSetting, MasaSnd, injectStyleM, TableGame, NIGHT_IN, trophyModel });
