// Sıcak Patates — elden ele patates oyunu (NFC Dünyası Oyun)
// Gece kamp ateşi sahnesi (Kurye Yarışı'nın küçük WebGL motoruyla). WebGL yoksa düz DOM görünümüne döner.
import { _eng } from './kuryeYarisi.js?v=2026-11-21-g';
import { _masa } from './masa3d.js?v=2026-11-21-g';
import * as sfx from '../sfx.js?v=2026-11-21-g';
const { podiumHTML, emitSoft, EmoteUI, Snd, detailOn, KIT, drawToon, postFX, esc, pcol, vibrate, medal, injectStyle, clamp, lerp, damp, hexRGB, C, shade, M, makeGL, MB, freeMesh, drawMesh, drawSky, drawDynamic, useProg, norm3, brandInfo, Res, ONE3, autoRes, makeTexture, updateTexture } = _eng();

const STYLE = `
#ky.pt{background:radial-gradient(circle at 50% 45%,#3a2a4a 0,#1a1430 55%,#0b0918 100%);overflow:hidden;touch-action:manipulation}
#ky.pt canvas.sp-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
#ky.pt .hud{z-index:6}
#ky.pt .msg{z-index:7}
#ky.pt .panel{z-index:9}
#ky.pt .sp-top{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);font-weight:800;font-size:13px;background:rgba(12,10,26,.55);border:2px solid rgba(255,255,255,.35);border-radius:99px;padding:3px 12px;white-space:nowrap;pointer-events:none;z-index:3}
#ky.pt .sp-top:empty{display:none}
#ky.pt .sp-top{transition:opacity .5s,transform .5s}
#ky.pt .sp-top.dim{opacity:0;transform:translateX(-50%) translateY(-8px)}
#ky.pt .sp-arena{position:absolute;inset:0;z-index:2;pointer-events:none}
#ky.pt .sp-p{position:absolute;left:0;top:0;width:var(--w);height:var(--w);margin-left:calc(var(--w)/-2);margin-top:calc(var(--w)/-2);-webkit-tap-highlight-color:transparent;will-change:transform;pointer-events:auto;cursor:default}
#ky.pt .sp-p .av{position:absolute;inset:0;border-radius:50%}
#ky.pt .sp-p .nm{position:absolute;left:50%;bottom:calc(100% + 2px);transform:translateX(-50%);font-size:12px;font-weight:800;color:#fff;background:rgba(12,10,26,.62);border:2px solid transparent;border-radius:99px;padding:2px 8px 2px 6px;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;pointer-events:none;display:flex;gap:4px;align-items:center;transition:background .15s,color .15s,border-color .15s}
#ky.pt .sp-p .nm i{width:8px;height:8px;border-radius:99px;flex:none;background:var(--c)}
#ky.pt .sp-p.me .nm{background:rgba(255,210,63,.92);color:#1c1633;bottom:auto;top:calc(100% + 4px)}
#ky.pt .sp-p.tap{cursor:pointer}
#ky.pt .sp-p.tap .nm{background:#ffd23f;color:#1c1633;border-color:#1c1633;animation:spt .5s ease-in-out infinite alternate}
#ky.pt .sp-p.out .nm{opacity:.55;text-decoration:line-through}
#ky.pt .sp-p.off .nm{opacity:.6}
@keyframes spt{from{transform:translateX(-50%) scale(.94)}to{transform:translateX(-50%) scale(1.08)}}
#ky.pt .sp-boom{position:absolute;font-size:90px;line-height:1;margin:-45px 0 0 -45px;pointer-events:none;animation:spb .9s ease-out forwards;z-index:4}
@keyframes spb{0%{transform:scale(.2);opacity:1}40%{transform:scale(1.4);opacity:1}100%{transform:scale(1.9);opacity:0}}
#ky.pt .sp-say{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);text-align:center;pointer-events:none;z-index:3}
#ky.pt .sp-say span{display:inline-block;font-weight:800;font-size:20px;color:#fff;background:rgba(12,10,26,.6);border-radius:99px;padding:8px 18px;max-width:92%}
#ky.pt .sp-say.me span{background:#d4321c;font-size:22px;animation:spm .4s ease-in-out infinite alternate;box-shadow:0 0 0 3px rgba(255,255,255,.25),0 8px 30px rgba(212,50,28,.6)}
@keyframes spm{to{transform:scale(1.07)}}
#ky.pt .sp-feed{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 92px);display:grid;gap:4px;pointer-events:none;max-width:70%;z-index:3}
#ky.pt .sp-feed div{font-weight:700;font-size:13px;background:rgba(12,10,26,.62);color:#fff;border-radius:10px;padding:3px 9px;width:max-content;max-width:100%;animation:spf 4.2s ease-out forwards}
@keyframes spf{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
@media (orientation:landscape) and (max-height:520px){#ky.pt .sp-top{left:auto;right:calc(env(safe-area-inset-right,0px) + 12px);transform:none;top:calc(env(safe-area-inset-top,0px) + 62px)}#ky.pt .sp-top.dim{transform:translateY(-8px)}#ky.pt .sp-say{bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}#ky.pt .sp-say span{font-size:17px;padding:6px 14px}}
/* WebGL yoksa: düz görünüm */
#ky.pt.flat .sp-p .av{background:var(--c);border:4px solid #fff;display:grid;place-items:center;font-size:calc(var(--w)*.5)}
#ky.pt.flat .sp-p.me .av{border-color:#ffd23f}
#ky.pt.flat .sp-p.tap .av{border-color:#ffd23f;box-shadow:0 0 0 4px rgba(255,210,63,.35),0 0 26px rgba(255,190,60,.8)}
#ky.pt.flat .sp-p.out{opacity:.4;filter:grayscale(1)}
#ky.pt .sp-pot{position:absolute;left:0;top:0;width:64px;height:64px;margin:-32px 0 0 -32px;font-size:52px;line-height:64px;text-align:center;transition:transform .3s cubic-bezier(.3,1.3,.5,1);z-index:2;pointer-events:none}
`;
function style2() {
  if (document.getElementById('sp-style2')) return;
  document.getElementById('sp-style')?.remove();
  const st = document.createElement('style');
  st.id = 'sp-style2';
  st.textContent = STYLE;
  document.head.appendChild(st);
}

/* ============================ 3B sahne ============================ */
const NIGHT = { sunC: [0.42, 0.46, 0.66], sky: [0.25, 0.27, 0.42], gnd: [0.1, 0.09, 0.12], night: 1, warm: [1, 0.8, 0.5], lampC: [1.9, 1.1, 0.48], fogR: [16, 46], stars: 1, glowS: 0.35, top: '#02040d', hor: '#16204a' };
const MOON = new Float32Array(norm3([-0.4, 0.75, -0.5]));
const NFOG = new Float32Array(hexRGB('#0b1024'));
const sh2 = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vn2 = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = sh2(xi, yi), b = sh2(xi + 1, yi), c = sh2(xi, yi + 1), d = sh2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const TAU = Math.PI * 2;
let MA = null;
const masa = () => MA || (MA = _masa());   // masa karakterleri (oyuncu her oyunda aynı görünür)

function groundModel(mb) {
  const R = 22;
  const grass = hexRGB('#25451f'), grass2 = hexRGB('#3a5e2c'), dry = hexRGB('#5b6a32'), dirt = hexRGB('#5d4331'), dirt2 = hexRGB('#6e5038'), ash = hexRGB('#2b2522');
  mb.gridN(-R, -R, R, R, 64, 64, (x, z) => { const d = Math.hypot(x, z); return 0.06 * vn2(x * 0.6, z * 0.6) - 0.03 + (d > 9 ? (d - 9) * 0.06 : 0); }, (x, z) => {
    const d = Math.hypot(x, z);
    let c = mix3(grass, grass2, vn2(x * 1.3 + 3, z * 1.3));
    c = mix3(c, dry, clamp(vn2(x * 0.35 + 11, z * 0.35) - 0.55, 0, 1) * 1.4);
    const path = clamp((5.3 - d) / 1.8, 0, 1) * (0.75 + 0.25 * vn2(x * 3, z * 3));
    c = mix3(c, mix3(dirt, dirt2, vn2(x * 4, z * 4 + 5)), path);
    c = mix3(c, ash, clamp((1.25 - d) / 0.5, 0, 1));
    const g = 0.82 + 0.3 * vn2(x * 6, z * 6);
    return [c[0] * g, c[1] * g, c[2] * g, 0];
  });
}
// çimen öbekleri ve küçük taşlar (halkanın dışında)
function tuftsModel(mb) {
  for (let i = 0; i < 160; i++) {
    const a = sh2(i, 21) * TAU, r = 5.6 + sh2(i, 22) * 11;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (sh2(i, 23) < 0.2) {
      const s = 0.1 + sh2(i, 24) * 0.16;
      mb.sphereS(x, s * 0.25, z, s * 1.3, s * 0.7, s, null, 8, 5, (ux, uy) => { const g = 0.36 + 0.12 * sh2(i, 25) + uy * 0.08; return [g, g * 0.98, g * 0.95, -0.1]; });
      continue;
    }
    const g = 0.75 + sh2(i, 26) * 0.5;
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * TAU + sh2(i, k) * 0.8, h = 0.18 + sh2(i, k + 9) * 0.22, lean = 0.08 + sh2(i, k + 3) * 0.08;
      const bx = x + Math.cos(b) * 0.05, bz = z + Math.sin(b) * 0.05;
      const tx = bx + Math.cos(b) * lean, tz = bz + Math.sin(b) * lean;
      const px = -Math.sin(b) * 0.035, pz = Math.cos(b) * 0.035;
      const col = [0.2 * g, 0.42 * g, 0.16 * g, 0];
      mb.quad([bx - px, 0, bz - pz], [bx + px, 0, bz + pz], [tx, h, tz], [tx, h, tz], col, [bx, h * 0.5, bz + 0.3]);
    }
  }
}
function firepitModel(mb) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU, r = 0.84 + 0.05 * Math.sin(i * 2.3);
    const s = 0.16 + 0.05 * sh2(i, 3);
    mb.sphereS(Math.cos(a) * r, s * 0.45, Math.sin(a) * r, s, s * 0.72, s * 1.1, null, 10, 6, (x, y) => { const g = 0.27 + 0.1 * sh2(i, 7) + 0.06 * y; return [g, g * 0.95, g * 0.9, -0.04]; });
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + 0.3;
    mb.push().T(0, 0.14 + i * 0.035, 0, a, 0, Math.PI / 2 - 0.12);
    mb.lathe(0, -0.6, 0, [[0, 0], [0.09, 0], [0.1, 0.02], [0.1, 1.18], [0.09, 1.2], [0, 1.2]], 10, (k) => (k === 0 || k === 5 || k === 1 || k === 4 ? C('#c9a074') : C('#4a2c19', -0.1)));
    mb.pop();
  }
  for (let i = 0; i < 18; i++) {
    const a = sh2(i, 9) * TAU, r = sh2(i, 11) * 0.52;
    mb.sphereS(Math.cos(a) * r, 0.03, Math.sin(a) * r, 0.07, 0.035, 0.06, i % 3 ? [1, 0.35, 0.06, 1] : [1, 0.62, 0.15, 1], 6, 4);
  }
}
function treesModel(mb) {
  for (let i = 0; i < 46; i++) {
    const far = i >= 26;
    const a = (i / (far ? 20 : 26)) * TAU + sh2(i, 1) * 0.25, r = far ? 15 + sh2(i, 2) * 4 : 9.8 + sh2(i, 2) * 4.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = (far ? 5.2 : 3.4) + sh2(i, 4) * 2.6;
    const y0 = r > 9 ? (r - 9) * 0.06 : 0;
    mb.lathe(x, y0, z, [[0.2, 0], [0.16, 0.8], [0, 0.8]], 7, C('#3a2617'));
    const g = 0.11 + 0.05 * sh2(i, 5);
    const col = (k) => { const t = k / 9; return [g * (0.45 + t * 0.2), g * (1.35 + t * 0.35), g * (0.85 + t * 0.2), 0]; };
    mb.lathe(x, y0 + 0.55, z, [[1.35, 0], [1.35, 0.06], [0.82, h * 0.36], [1.05, h * 0.36], [0.6, h * 0.62], [0.78, h * 0.62], [0.32, h * 0.84], [0.42, h * 0.84], [0, h]], 10, col);
  }
}
// Çadır: A tipi, iki renkli bez, koyu kapı, ip ve kazıklar (+z'ye bakar)
function tentModel(mb, hexA, hexB) {
  const A = C(hexA, -0.12), B = C(hexB, -0.12), dark = C('#1a1424'), rope = C('#d9cfb8');
  const w = 1.05, h = 1.35, d = 1.25;
  const cen = [0, 0.4, 0];
  // iki yan bez (çatı)
  mb.quad([-w, 0, d], [-w, 0, -d], [0, h, -d], [0, h, d], A, cen);
  mb.quad([w, 0, d], [w, 0, -d], [0, h, -d], [0, h, d], A, cen);
  // ön ve arka üçgen
  mb.tri([-w, 0, d], [w, 0, d], [0, h, d], B, cen);
  mb.tri([-w, 0, -d], [w, 0, -d], [0, h, -d], B, cen);
  // kapı (koyu, biraz önde)
  mb.tri([-0.42, 0.005, d + 0.01], [0.42, 0.005, d + 0.01], [0, h * 0.72, d + 0.01], dark, [0, 0.3, d - 1]);
  // açık kapı kanadı
  mb.tri([0.02, 0.005, d + 0.02], [0.5, 0.005, d + 0.32], [0.02, h * 0.7, d + 0.02], shade(B, 0.85), [0.2, 0.3, d - 1]);
  // mertek ve kazıklar
  mb.cyl(0, 0, d + 0.03, 0.025, h + 0.12, 0.025, 6, C('#7a5a3a'));
  mb.cyl(0, 0, -d - 0.03, 0.025, h + 0.12, 0.025, 6, C('#7a5a3a'));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const ax = 0, ay = h + 0.08, az = sz * (d + 0.03), bx = sx * (w + 0.5), bz = sz * (d + 0.55);
    mb.quad([ax - 0.008, ay, az], [ax + 0.008, ay, az], [bx + 0.008, 0.02, bz], [bx - 0.008, 0.02, bz], rope, [0, 0, 0]);
    mb.cyl(bx, 0, bz, 0.02, 0.12, 0.012, 5, C('#9c8c78'));
  });
}
// Kütük bank
function logModel(mb, len) {
  mb.push().T(0, 0.2, 0, 0, 0, Math.PI / 2);
  mb.lathe(0, -len / 2, 0, [[0, 0], [0.17, 0], [0.2, 0.03], [0.2, len - 0.03], [0.17, len], [0, len]], 12, (k) => (k === 0 || k === 5 || k === 1 || k === 4 ? C('#c9a074') : C('#5b3a22', -0.08)));
  mb.pop();
}
// Fener direği: tahta direk + cam kutu (ışık saçar)
function lanternModel(mb) {
  mb.cyl(0, 0, 0, 0.05, 1.9, 0.04, 8, C('#5a3c24'));
  mb.box(-0.04, 1.82, -0.02, 0.32, 1.86, 0.02, C('#3b2a1c'));
  mb.cyl(0.3, 1.58, 0, 0.004, 1.84, 0.004, 4, C('#222222'));
  mb.box(0.22, 1.36, -0.08, 0.38, 1.58, 0.08, C('#ffcf7a', 1));
  mb.box(0.2, 1.33, -0.1, 0.4, 1.36, 0.1, C('#2a2a2a', -0.5));
  mb.box(0.2, 1.58, -0.1, 0.4, 1.61, 0.1, C('#2a2a2a', -0.5));
  mb.cyl(0.3, 1.61, 0, 0.11, 1.68, 0.0, 8, C('#2a2a2a', -0.5));
}
// Zincir ampuller: iki nokta arasında sarkan kablo + renkli ampuller
function bulbsModel(mb, a, b, n, sag, seed) {
  const cols = ['#ffd54a', '#ff6b4a', '#6bdcff', '#a8ff6b', '#ff8ad8', '#ffffff'];
  const P = (t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * sag, lerp(a[2], b[2], t)];
  for (let k = 0; k < 24; k++) {
    const p = P(k / 24), q = P((k + 1) / 24);
    mb.quad([p[0], p[1] - 0.008, p[2]], [q[0], q[1] - 0.008, q[2]], [q[0], q[1] + 0.008, q[2]], [p[0], p[1] + 0.008, p[2]], C('#1a1a1a'), [p[0], p[1], p[2] - 1]);
  }
  for (let k = 1; k < n; k++) {
    const p = P(k / n);
    const c = C(cols[(k + seed) % cols.length], 1);
    mb.sphereS(p[0], p[1] - 0.07, p[2], 0.045, 0.06, 0.045, c, 8, 6);
  }
}
// Kampçı gövdesi (kollar ayrı): oyuncu renginde mont ve bere, krem atkı (+z'ye bakar)
// Patates: yamru yumru, benekli kabuk (kızardıkça renk tonu verilir)
function potatoModel(mb) {
  const col = (x, y, z) => {
    const n = vn2(x * 4 + 7, z * 4 + y * 3);
    const eye = sh2(Math.floor(x * 5 + 9), Math.floor(z * 5 + y * 5 + 9)) > 0.86;
    const c = eye ? [0.36, 0.22, 0.1] : mix3([0.72, 0.5, 0.27], [0.86, 0.66, 0.38], n);
    return [c[0], c[1], c[2], -0.35];
  };
  mb.sphereS(0, 0, 0, 0.19, 0.14, 0.15, null, 18, 12, col);
  mb.sphereS(0.08, 0.02, 0.03, 0.12, 0.1, 0.11, null, 12, 8, col);
  mb.sphereS(-0.09, -0.01, -0.02, 0.11, 0.09, 0.1, null, 12, 8, col);
}
// Dokunulabilir oyuncunun ayağının altındaki parlak halka
function ringModel(mb) {
  mb.torusN(0, 0, 0, 0.62, 0.045, 0.02, 32, 6, C('#ffd23f', 1));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    mb.push().T(Math.cos(a) * 0.78, 0, Math.sin(a) * 0.78, -a + Math.PI / 2);
    mb.tri([-0.07, 0, 0.0], [0.07, 0, 0.0], [0, 0, -0.11], C('#ffd23f', 1), [0, -1, 0]);
    mb.pop();
  }
}
// Pankart direkleri (bez dokulu ayrı çizilir)
function bannerPoles(mb, w, h) {
  for (const s of [-1, 1]) {
    mb.cyl(s * w / 2, 0, 0, 0.07, h + 0.25, 0.06, 8, C('#6a4a2c'));
    mb.sphereS(s * w / 2, h + 0.28, 0, 0.08, 0.08, 0.08, C('#d6b25a', -0.6), 8, 6);
    mb.cyl(s * w / 2, 0, 0, 0.12, 0.08, 0.1, 8, C('#4a3220'));
  }
  mb.cyl(-w / 2, h + 0.05, 0, 0.02, h + 0.07, 0.02, 4, C('#222222'));
}
function bannerCloth(tb, w, h0, h1) {
  // hafif dalgalı bez: 8 dilim
  const n = 8;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const x0 = -w / 2 + w * u0, x1 = -w / 2 + w * u1;
    const z0 = Math.sin(u0 * Math.PI * 2) * 0.05, z1 = Math.sin(u1 * Math.PI * 2) * 0.05;
    tb.tquad([x0, h0, z0], [x1, h0, z1], [x1, h1, z1], [x0, h1, z0], u0, 0, u1, 1, [(x0 + x1) / 2, (h0 + h1) / 2, -1]);
  }
}
function drawBanner(cv, brand, img) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = brand.box; g.fillRect(0, 0, W, H);
  // kenar süsü
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
  g.fillStyle = brand.accentHex;
  for (let k = 0; k < 16; k++) { g.beginPath(); g.moveTo(k * (W / 16), H); g.lineTo((k + 0.5) * (W / 16), H - 18); g.lineTo((k + 1) * (W / 16), H); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (img) {
    const r = img.width / img.height;
    let h = H - 70, w = h * r;
    if (w > W - 80) { w = W - 80; h = w / r; }
    if (brand.round) {
      const s = H - 64, cx = 40 + s / 2;
      g.save(); g.beginPath(); g.arc(cx, H / 2 - 4, s / 2 + 6, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
      g.beginPath(); g.arc(cx, H / 2 - 4, s / 2, 0, TAU); g.clip(); g.drawImage(img, cx - s / 2, H / 2 - 4 - s / 2, s, s); g.restore();
      g.fillStyle = brand.ink;
      const words = String(brand.name || '').split(' ');
      const x0 = cx + s / 2 + 18, tw = W - x0 - 30, mx = x0 + tw / 2;
      const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words;
      let fs = 70;
      const fit = () => { g.font = `800 ${fs}px 'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif`; return Math.max(...lines.map((l) => g.measureText(l).width)); };
      while (fit() > tw && fs > 20) fs -= 2;
      lines.forEach((l, k) => g.fillText(l, mx, H / 2 - 4 + (k - (lines.length - 1) / 2) * fs * 1.02));
    } else g.drawImage(img, W / 2 - w / 2, H / 2 - h / 2, w, h);
  } else {
    g.fillStyle = brand.ink;
    g.font = `800 92px 'Bricolage Grotesque', system-ui, sans-serif`;
    g.fillText('🥔 SICAK PATATES', W / 2, H / 2 - 22, W - 60);
    g.font = `700 40px 'Bricolage Grotesque', system-ui, sans-serif`;
    g.fillText('NFC DÜNYASI · KAMP ATEŞİ', W / 2, H / 2 + 56, W - 80);
  }
}

// Sıcak Patates müziği: fitil yandıkça hızlanan tik-tak gerilimi (Re m – Si♭ – Sol m – La): saat tıkı ve tak,
// kalp atışı bas davulu, pizzicato yaylı ostinatosu, uzun bas; patates kızardıkça zil, yaylı vuruşları ve trampet eklenir
class PotatoSnd extends Snd {
  constructor() { super(); this.musVol = 2.9; }
  tempo() { return this.mode === 'race' ? 92 + 84 * (this.int || 0) : this.mode === 'idle' ? 88 : 80; }
  beat(t, s, bar, spb, st = spb / 4) {
    const CH = [[38, [62, 65, 69]], [34, [62, 65, 70]], [43, [62, 67, 70]], [45, [61, 64, 69]]];
    const [root, ch] = CH[bar % 4];
    const I = this.int || 0;
    if (this.mode === 'race') {
      if (s % 4 === 0) this.iTick(t, 0.06);
      if (s % 4 === 2) this.iWood(t, 0.034, 1300);
      if (s === 0 || s === 3) this.iKick(t, s ? 0.17 : 0.25, 95, 40, 0.16);
      if (s % 2 === 0) this.iPizz(t, ch[[0, 1, 2, 1][(s >> 1) % 4]] + (s % 8 >= 4 ? 12 : 0), 0.04, 0.15);
      if (s === 0) this.iBass(t, root - 12, spb * 3.6, 0.1, 'saw', 420);
      if (I > 0.45 && s % 2 === 1) this.iHat(t, 0.024 + 0.02 * I);
      if (I > 0.7 && (s === 8 || s === 12)) this.iStr(t, ch.map((m) => m + 12), st * 1.6, 0.02, 0.005, 3600, 0.1);
      if (I > 0.85 && s === 14) this.iSnare(t, 0.07);
    } else if (this.mode === 'idle') {
      if (s % 8 === 0) this.iTick(t, 0.05);
      if (s % 8 === 4) this.iWood(t, 0.03, 1200);
      if (s === 0) this.iPad(t, ch, spb * 4, 0.015, 700);
      if (s === 0 || s === 8) this.iBass(t, root - 12, spb * 1.5, 0.08, 'sub');
    } else {
      if (s === 0) { this.iPad(t, ch.map((m) => m + 12), spb * 4, 0.015, 1000); this.iBass(t, root - 12, spb * 2, 0.08, 'sub'); }
      if (s % 4 === 0) this.iPizz(t, ch[(s >> 2) % 3] + 12, 0.034, 0.3, 0.25);
    }
  }
}

class Game {
  constructor(ctx) {
    injectStyle();
    style2();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.evSeen = 0;
    this.first = true;
    this.key = '';
    this.panelKey = '';
    this.pEl = [];
    this.potEl = [];
    this.P3 = [];
    this.tp = [];          // izlenen patatesler: { h, from, t, heat, src }
    this.toast = [];       // patlayan oyuncu: kararma 0..1
    this.parts = [];
    this.puffs = [];       // yumuşak duman / alev bulutları
    this.chunks = [];      // patlayan patates parçaları
    this.flies = [];       // ateş böcekleri
    this.last = { cd: -1 };
    this.time = 0;
    this.scale = 1;
    this.cam = { ex: 0, ey: 6, ez: 8, tx: 0, ty: 0.6, tz: 0, D: 12, shake: 0 };
    this.mats = { a: M.make(), b: M.make(), c: M.make(), V: M.make(), P: M.make(), VP: M.make(), TV: M.make(), TP: M.make(), TVP: M.make() };
    this.build();
    this.esnd = new PotatoSnd();
    try { this.esnd.amb('fire+night', 0.95); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.esnd.fx('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[patates] WebGL açılamadı', e); this.X = null; }
    if (this.X) {
      try { this.res = new Res(this.X, this.brand); this.buildWorld(); } catch (e) { console.warn('[patates] kaynak', e); this.X = null; }
    }
    if (this.X) {
      this.pA = new Float32Array(600 * 126);
      this.pB = new Float32Array(600 * 126);
      this.el.cv.addEventListener('webglcontextlost', this.onLost = (e) => { e.preventDefault(); this.lost = true; }, false);
      this.el.cv.addEventListener('webglcontextrestored', this.onRestore = () => this.restore(), false);
      for (let i = 0; i < 26; i++) this.flies.push({ a: Math.random() * TAU, r: 6 + Math.random() * 7, y: 0.4 + Math.random() * 2.2, s: 0.2 + Math.random() * 0.4, ph: Math.random() * TAU });
    } else {
      this.flat = true;
      this.el.wrap.classList.add('flat');
      this.el.cv.style.display = 'none';
    }
    this.lastBeat = 0;
    this.lastT = performance.now();
    this.uiT = 0;
    this.frameB = (t) => this.loop(t);
    this.raf = requestAnimationFrame(this.frameB);
  }

  build() {
    const w = document.createElement('div');
    w.id = 'ky';
    w.className = 'pt';
    w.innerHTML = `
      <canvas class="sp-cv" aria-label="Sıcak Patates 3D sahnesi"></canvas>
      <div class="hud"><div class="r1">
        <div class="pos"><b>0</b><small>/0</small></div>
        <div class="sp"></div>
        <div class="tm">🥔</div>
        <button class="ib mu ${sfx.isMusicOn && sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
        <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted && sfx.isMuted() ? '🔇' : '🔊'}</button>
        <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
      </div></div>
      <div class="sp-top"></div>
      <div class="sp-feed"></div>
      <div class="sp-arena"></div>
      <div class="sp-say"><span></span></div>
      <div class="vig"></div>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = { wrap: w, cv: q('canvas'), posB: q('.pos b'), posS: q('.pos small'), ex: q('.ex'), top: q('.sp-top'), feed: q('.sp-feed'), arena: q('.sp-arena'), say: q('.sp-say'), sayS: q('.sp-say span'), vig: q('.vig'), msg: q('.msg'), panel: q('.panel') };
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
    this.el.arena.addEventListener('pointerdown', (e) => {
      const p = e.target.closest('.sp-p');
      if (!p) return;
      e.preventDefault();
      this.tapPlayer(+p.dataset.i);
    });
  }

  /* ---------- dünya ---------- */
  mk(fn, kind = 'lit') { const mb = new MB(kind); fn(mb); return mb.build(this.X); }
  buildWorld() {
    const X = this.X;
    if (!X) return;
    this.freeWorld();
    const themed = this.brand.slug !== 'nfc';
    const tentCols = themed ? [[this.brand.boxHex, this.brand.accentHex], [this.brand.accentHex, this.brand.boxHex], ['#f2efe6', this.brand.boxHex]] : [['#e8642c', '#ffcf5a'], ['#2f8f9d', '#e8f0e6'], ['#7b4ab8', '#ffb347']];
    const TENTS = [[-5.6, -4.7, 0.6], [5.6, -4.6, -0.6], [-4.3, -8.3, 0.25]];
    this.W = {
      ground: this.mk(groundModel),
      tufts: this.mk(tuftsModel),
      pit: this.mk(firepitModel),
      trees: this.mk(treesModel),
      deco: this.mk((mb) => {
        TENTS.forEach(([x, z, r], k) => { mb.push().T(x, 0, z, r); tentModel(mb, tentCols[k][0], tentCols[k][1]); mb.pop(); });
        [[-3.4, -5.6, 0.4, 1.6], [3.2, -6.4, -0.3, 1.9], [6.6, -1.6, 1.3, 1.5], [-6.7, -1.2, -1.2, 1.6]].forEach(([x, z, r, l]) => { mb.push().T(x, 0, z, r); logModel(mb, l); mb.pop(); });
        [[-4.0, -2.9], [4.1, -3.0], [-2.6, -6.9], [2.6, -6.9]].forEach(([x, z]) => { mb.push().T(x, 0, z, Math.atan2(x, z) + Math.PI / 2); lanternModel(mb); mb.pop(); });
        bulbsModel(mb, [-3.7, 1.86, -2.9], [-2.32, 1.86, -6.9], 9, 0.32, 0);
        bulbsModel(mb, [2.32, 1.86, -6.9], [3.8, 1.86, -3.0], 9, 0.32, 1);
        // odun yığını + balta kütüğü
        for (let k = 0; k < 6; k++) { mb.push().T(-6.3 + (k % 3) * 0.32, 0.12 + Math.floor(k / 3) * 0.26, -3.5, 0.15, 0, Math.PI / 2); mb.lathe(0, -0.5, 0, [[0, 0], [0.13, 0], [0.13, 1.0], [0, 1.0]], 9, (i) => (i === 0 || i === 3 ? C('#c9a074') : C('#5b3a22'))); mb.pop(); }
        mb.lathe(6.1, 0, -4.1, [[0, 0], [0.32, 0], [0.3, 0.42], [0.28, 0.44], [0, 0.44]], 12, (i) => (i >= 3 ? C('#c9a074') : C('#5b3a22')));
      }),
      bpoles: this.mk((mb) => bannerPoles(mb, 3.7, 2.2)),
      banner: this.mk((tb) => bannerCloth(tb, 3.6, 0.95, 2.2), 'tex'),
      potato: this.mk(potatoModel),
      ring: this.mk(ringModel),
      av: {},
    };
    this.bannerCv = document.createElement('canvas');
    this.bannerCv.width = 512; this.bannerCv.height = 256;
    drawBanner(this.bannerCv, this.brand, this.res.img);
    this.bannerTex = makeTexture(X, this.bannerCv);
    this.bannerImg = !!this.res.img;
  }
  standMesh(ci) { const W = this.W; return W.av[ci] || (W.av[ci] = masa().standMeshes((f) => this.mk(f), ci)); }
  standSh() { const W = this.W; return W.sh || (W.sh = masa().standShared((f) => this.mk(f))); }
  freeWorld() {
    const W = this.W;
    if (!W || !this.X || this.X.gl.isContextLost()) { this.W = null; return; }
    const avm = Object.values(W.av || {}).flatMap((o) => Object.values(o));
    const shm = W.sh ? [W.sh.upper, W.sh.fore, W.sh.lids, ...W.sh.all()] : [];
    [W.ground, W.tufts, W.pit, W.trees, W.deco, W.bpoles, W.banner, W.potato, W.ring, ...avm, ...shm].forEach((m) => m && freeMesh(this.X, m));
    if (this.bannerTex) this.X.gl.deleteTexture(this.bannerTex);
    this.bannerTex = null;
    this.W = null;
  }
  restore() {
    try {
      this.X = makeGL(this.el.cv);
      this.res = new Res(this.X, this.brand);
      this.lost = false;
      this.W = null;
      this.buildWorld();
    } catch (e) { console.warn('[patates] geri yükleme', e); }
  }

  holder() {
    const v = this.view;
    if (!v?.pots || v.me < 0) return null;
    return v.pots.find((p) => p[0] === v.me) || null;
  }
  canPassTo(i) {
    const v = this.view;
    if (!v || v.phase !== 'play' || v.me < 0 || i === v.me || !v.al?.[i] || !v.al[v.me]) return false;
    const pot = this.holder();
    const now = this.ctx.serverNow();
    if (!pot || now < pot[2] || pot[5]) return false;
    if (pot[3] === i && now < pot[4] && v.left > 2) return false;
    return true;
  }
  tapPlayer(i) {
    if (!this.canPassTo(i)) return;
    const now = this.ctx.serverNow();
    if (now - (this.lastPassAt || 0) < 250) return;
    this.lastPassAt = now;
    try { sfx.play('swish'); } catch { /* yok */ }
    vibrate(12);
    const me = this.view.me;
    if (this.P3[me]) { this.P3[me].thr = 0; this.P3[me].thrTo = i; }
    this.ctx.send('pass', { to: i });
  }

  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.sp !== '1') { root.dataset.sp = '1'; root.innerHTML = '<p class="py-16 text-center">🥔</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    if ((v.phase === 'ready' || v.phase === 'play' || v.phase === 'result') && v.players) this.layout(v);
    if (v.phase === 'play' && v.pots) this.sync(v);
    if (v.phase === 'ready' && v.players) { this.el.posB.textContent = String(v.players.length); this.el.posS.textContent = `/${v.players.length}`; this.el.top.textContent = `${v.round}/${v.rounds}. tur`; }
    if (!prev || prev.phase !== v.phase || prev.round !== v.round) this.onPhase(prev, v);
    this.panel();
  }

  /* ---------- yerleşim: oyuncular ateşin çevresinde, ben önde ---------- */
  ringR(n) { return 1.8 + Math.max(0, n - 2) * 0.21; }
  layout(v) {
    const n = v.n || v.players.length;
    const k = `${v.round}|${n}|${v.me}|${v.players.map((p) => p.id).join(',')}`;
    if (k === this.key) return;
    this.key = k;
    const A = this.el.arena;
    A.querySelectorAll('.sp-p,.sp-pot').forEach((e) => e.remove());
    this.pEl = [];
    this.potEl = [];
    this.tp = [];
    this.toast = v.players.map(() => 0);
    const R = this.ringR(n);
    this.R = R;
    this.P3 = v.players.map((pl, i) => {
      const a = Math.PI / 2 + ((i - Math.max(0, v.me)) * TAU) / n;
      return { a, x: Math.cos(a) * R, z: Math.sin(a) * R, c: pl.c, hop: 0, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), thr: -1, thrTo: -1, cat: -1, warm: Math.random() * 6, dirs: [[-0.25, -1, 0.12], [0.25, -1, 0.12]], hands: [[0, 0.6, 0], [0, 0.6, 0]], ring: 0 };
    });
    const sz = Math.max(220, Math.min((this.el.wrap.clientWidth || 360) - 8, (this.el.wrap.clientHeight || 640) * 0.66, 560));
    this.flatPos = v.players.map((_, i) => { const a = Math.PI / 2 + ((i - Math.max(0, v.me)) * TAU) / n; return [Math.cos(a) * (sz / 2 - 50), Math.sin(a) * (sz / 2 - 50)]; });
    v.players.forEach((pl, i) => {
      const el = document.createElement('div');
      el.className = 'sp-p';
      el.dataset.i = i;
      el.style.setProperty('--c', pcol(pl.c));
      el.style.setProperty('--w', '74px');
      el.innerHTML = `<div class="av">${this.flat ? ['🧑‍🍳', '😎', '🤠', '🥳', '😺', '🐸', '🦊', '🐼', '🦄', '🐙', '🤖', '👻'][i % 12] : ''}</div><div class="nm"><i></i>${esc(pl.n)}${i === v.me ? ' (sen)' : ''}</div>`;
      if (i === v.me) el.classList.add('me');
      A.appendChild(el);
      this.pEl.push(el);
    });
  }
  // halka: dikey ekranda derinliğe doğru uzar (oyuncular daha büyük görünsün)
  ringK() {
    const asp = (this.vw || 1) / (this.vh || 1);
    return asp < 0.8 ? [0.8, 1.14] : asp > 1.25 ? [1.18, 0.86] : [1, 1];
  }
  bannerZ() { const [, kz] = this.ringK(); return -((this.R || 2) * kz + 1.7); }
  placeRing() {
    const [kx, kz] = this.ringK();
    const R = this.R || 2;
    this.P3.forEach((p) => { p.x = Math.cos(p.a) * R * kx; p.z = Math.sin(p.a) * R * kz; });
  }
  sync(v) {
    (v.ev || []).forEach((e) => {
      if (e[0] <= this.evSeen) return;
      this.evSeen = e[0];
      if (this.first) return;
      this.onEv(e, v);
    });
    this.first = false;
    const want = v.pots.map((p) => p[0]);
    const used = new Set();
    const keep = [];
    want.forEach((h, k) => {
      let j = this.tp.findIndex((t, ix) => !used.has(ix) && t.h === h);
      if (j < 0) { this.tp.push({ h, from: h, t: 1, heat: 0, spin: 0 }); j = this.tp.length - 1; }
      used.add(j);
      const tr = this.tp[j];
      tr.heat = v.pots[k][1];
      tr.wait = !!v.pots[k][5];
      keep.push(tr);
    });
    this.tp = keep;
    v.players.forEach((_, i) => { this.pEl[i]?.classList.toggle('out', !v.al[i]); });
    if (this.flat) this.syncFlat(v);
    this.posUpdate(v);
  }
  syncFlat(v) {
    while (this.potEl.length < v.pots.length) { const el = document.createElement('div'); el.className = 'sp-pot'; el.textContent = '🥔'; this.el.arena.appendChild(el); this.potEl.push(el); }
    while (this.potEl.length > v.pots.length) this.potEl.pop().remove();
    const cx = (this.el.wrap.clientWidth || 360) / 2, cy = (this.el.wrap.clientHeight || 640) / 2;
    v.pots.forEach((p, k) => {
      const [x, y] = this.flatPos[p[0]] || [0, 0];
      this.potEl[k].style.transform = `translate(${cx + x * 0.55 + (k ? 18 : 0)}px,${cy + y * 0.55}px)`;
    });
  }
  posUpdate(v) {
    this.el.posB.textContent = String(v.left ?? 0);
    this.el.posS.textContent = `/${v.n}`;
    // tur bilgisi kısa süre görünür, sonra arkadaki pankartı kapatmasın diye kaybolur (patates sayısı değişince yine görünür)
    const tt = `${v.round}/${v.rounds}. tur · 🥔 ${v.pots.length} patates`;
    if (tt !== this.topTxt) { this.topTxt = tt; this.el.top.textContent = tt; this.el.top.classList.remove('dim'); this.topAt = performance.now(); }
    else if (performance.now() - (this.topAt || 0) > 4500) this.el.top.classList.add('dim');
  }

  onEv(e, v) {
    const k = e[1];
    const me = v.me;
    const name = (i) => esc(v.players[i]?.n || '?');
    if (k === 'p') {
      const [, , from, to] = e;
      if (from !== me) { try { sfx.play('swish'); } catch { /* yok */ } }
      if (to === me) { vibrate(35); try { sfx.play('tap'); } catch { /* yok */ } this.flash(); }
      const tr = this.tp.find((t) => t.h === from);
      if (tr) { tr.src = tr.pos ? tr.pos.slice() : this.handMid(from); tr.from = from; tr.h = to; tr.t = 0; }
      const pf = this.P3[from], pt = this.P3[to];
      if (pf) { if (!(pf.thr >= 0 && pf.thr < 0.2 && pf.thrTo === to)) pf.thr = 0.05; pf.thrTo = to; pf.hop = 0.1; }
      if (pt) pt.cat = 0;
    } else if (k === 'x') {
      const h = e[2];
      try { sfx.play('boom'); } catch { /* yok */ }
      this.tp = this.tp.filter((t) => t.h !== h);
      if (this.toast[h] !== undefined) this.toast[h] = 0.001;
      this.explode(h);
      this.feed(h === me ? '💥 Patates sende patladı!' : `💥 ${name(h)} patladı!`);
      if (h === me) { vibrate([60, 40, 120]); try { sfx.play('lose'); } catch { /* yok */ } this.flash(true); }
    } else if (k === 'n') {
      if (e[2] === me) { vibrate([20, 30, 20]); this.feed('🥔 Yeni patates sende!'); }
      if (this.P3[e[2]]) this.P3[e[2]].cat = 0;
    }
  }
  explode(h) {
    const p = this.P3[h];
    if (!p) return;
    this.cam.shake = 0.7;
    const hp = this.handMid(h);
    for (let i = 0; i < 46 && this.parts.length < 760; i++) {
      const a = Math.random() * TAU, e = Math.random();
      const sp = 2 + Math.random() * 4;
      const c = Math.random() < 0.5 ? [1, 0.6, 0.15] : [1, 0.9, 0.4];
      this.parts.push({ x: hp[0], y: hp[1], z: hp[2], vx: Math.cos(a) * sp * e, vy: Math.random() * 4 + 1, vz: Math.sin(a) * sp * e, life: 0.7, max: 0.7, s: 0.05, r: c[0], g: c[1], b: c[2], add: true, grav: 3, drag: 2 });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU, sp = 1.5 + Math.random() * 2.5;
      this.chunks.push({ x: hp[0], y: hp[1], z: hp[2], vx: Math.cos(a) * sp, vy: 2 + Math.random() * 3, vz: Math.sin(a) * sp, s: 0.25 + Math.random() * 0.3, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 20, life: 2.2 + Math.random(), bounce: 0 });
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      this.puffs.push({ x: hp[0] + Math.cos(a) * 0.15, y: hp[1] + Math.random() * 0.3, z: hp[2] + Math.sin(a) * 0.15, vx: Math.cos(a) * 0.9, vy: 0.5 + Math.random() * 0.6, vz: Math.sin(a) * 0.9, r: 0.35, gr: 1.6, life: 1.8, max: 1.8, col: [0.12, 0.1, 0.1], a: 0.85, add: false });
      this.puffs.push({ x: hp[0], y: hp[1], z: hp[2], vx: Math.cos(a) * 1.6, vy: 0.4, vz: Math.sin(a) * 1.6, r: 0.3, gr: 1.4, life: 0.5, max: 0.5, col: [1, 0.55, 0.15], a: 0.9, add: true });
    }
    p.soot = 4;
    if (this.lastScr && this.lastScr[h]) {
      const [x, y] = this.lastScr[h];
      const b = document.createElement('div');
      b.className = 'sp-boom';
      b.textContent = '💥';
      b.style.left = `${x}px`; b.style.top = `${y}px`;
      this.el.arena.appendChild(b);
      setTimeout(() => b.remove(), 950);
    }
  }
  flash(big) {
    const v = this.el.vig;
    v.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:5;transition:opacity .35s;box-shadow:inset 0 0 ${big ? 160 : 90}px ${big ? 60 : 30}px ${big ? 'rgba(255,40,20,.7)' : 'rgba(255,230,120,.55)'};opacity:1`;
    clearTimeout(this.fT);
    this.fT = setTimeout(() => { v.style.opacity = '0'; }, 120);
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
    try { this.esnd.music(v.phase === 'ready' ? 'idle' : v.phase === 'play' ? 'race' : v.phase === 'result' || v.phase === 'final' ? 'calm' : null); } catch { /* yok say */ }
    if (v.phase === 'ready') { this.panelKey = ''; this.first = true; this.evSeen = 0; this.tp = []; this.chunks = []; this.toast = (v.players || []).map(() => 0); this.P3.forEach((p) => { p.soot = 0; }); }
    if (v.phase === 'play') { this.first = true; try { sfx.play('go'); } catch { /* yok */ } }
    if (v.phase === 'result') {
      this.tp = [];
      const meR = v.results?.find((r) => r.id === this.ctx.me);
      try { sfx.play(meR?.place === 1 ? 'win' : meR?.out ? 'fail' : 'success'); } catch { /* yok */ }
    }
    if (v.phase === 'final') { try { sfx.play('tada'); } catch { /* yok */ } }
  }

  panel() {
    const v = this.view;
    if (!v) return;
    const ctx = this.ctx;
    const sNow = ctx.serverNow();
    let key = v.phase;
    let html = '';
    const chips = (list) => list.map((r) => `<span class="chip"><i style="background:${pcol(r.c)}"></i>${esc(r.n)}${r.id === ctx.me ? ' (sen)' : ''}</span>`).join('');
    if (v.phase === 'loading') html = '<div class="card"><div class="tt">🥔 Patatesler közde…</div></div>';
    else if (v.phase === 'ready') {
      const left = v.startAt - sNow;
      if (left > 2500) {
        const first = v.round === 1;
        const canGo = ctx.isHost && first;
        key = `ready|${v.round}|${v.players.map((r) => r.id + r.n).join(',')}|${canGo}`;
        html = `<div class="card">
          <div class="tt">🥔 Sıcak Patates</div>
          <div class="sub">${v.round}/${v.rounds}. tur · ${v.players.length} oyuncu · kamp ateşi başında</div>
          ${first ? `<div class="how">
            <div><span class="k">🥔</span><span><b>Patates elinde mi? Hemen at!</b><small>Ateşin çevresindeki bir oyuncuya dokun, patates ona uçar</small></span></div>
            <div><span class="k">🔥</span><span><b>Fitil kısa, süre belli değil</b><small>Patates kızardıkça, tütüp kıvılcım saçtıkça patlamaya yaklaşır</small></span></div>
            <div><span class="k">💥</span><span><b>Elinde patlarsa elenirsin</b><small>Son kalan turu kazanır, 3 tur oynanır</small></span></div>
          </div>` : '<div class="how"><div><span class="k">👆</span><span><b>Patates sende mi? Birine dokun, at!</b></span></div></div>'}
          <div class="who">${chips(v.players)}</div>
          <div class="cd"><span>${v.playing ? 'Tur başlıyor' : 'Bu turu izleyeceksin'}</span><b data-cd></b></div>
          ${canGo ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}
        </div>`;
      } else key = 'count';
    } else if (v.phase === 'play') key = 'play';
    else if (v.phase === 'result') {
      const meR = v.results.find((r) => r.id === ctx.me);
      key = `result|${v.round}|${ctx.isHost}`;
      const title = meR?.place === 1 ? '🏆 Turu kazandın!' : meR ? (meR.out ? `💥 ${meR.place}. oldun` : `🏁 ${meR.place}. oldun`) : `🏁 ${v.round}. tur bitti`;
      html = `<div class="card">
        <div class="tt">${title}</div>
        <div class="sub">${v.round}/${v.rounds}. tur · son kalan: <b>${esc(v.results[0]?.nickname || '—')}</b></div>
        <ol class="res">${v.results.map((r) => `<li class="${r.id === ctx.me ? 'me' : ''}"><span class="pl">${medal(r.place)}</span><i style="background:${pcol(r.c)}"></i><span class="nm">${esc(r.nickname)}</span><span class="t">${r.passes ? `🥔×${r.passes}` : ''}</span><span class="p">+${r.pts}</span></li>`).join('')}</ol>
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
        ${v.best ? `<div class="best">🥔 En çok atan: <b>${esc(v.best.nickname)}</b> · ${v.best.passes} atış (${v.best.round}. tur)</div>` : ''}
        ${ctx.isHost ? '<button class="kb btn" data-game-action="restart">Yeniden oyna 🔁</button><button class="kb alt btn" data-act="exit-game">← Oyunlara dön</button>' : `<p class="hint">Yeni oyunu ${esc(ctx.hostName)} başlatacak.</p>`}
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
      this.el.arena.style.visibility = html && !key.startsWith('ready') ? 'hidden' : '';
    }
  }

  /* ---------- arayüz (saniyede ~8 kez) ---------- */
  ui() {
    const v = this.view;
    if (!v) return;
    const sNow = this.ctx.serverNow();
    if (this.cdEl) {
      const end = v.phase === 'ready' ? v.startAt : v.endsAt;
      const s = Math.max(0, Math.ceil((end - sNow) / 1000));
      if (this.cdEl.textContent !== String(s)) this.cdEl.textContent = String(s);
    }
    if (this.goBtn) this.goBtn.style.visibility = v.phase === 'ready' && v.startAt - sNow > 3900 ? 'visible' : 'hidden';
    if (v.phase === 'ready' && (v.startAt - sNow <= 2500) !== (this.panelKey === 'count')) this.panel();
    if (v.phase === 'ready' && v.startAt - sNow <= 3000 && v.startAt - sNow > 0) {
      const n = Math.ceil((v.startAt - sNow) / 1000);
      if (n !== this.lastN) { this.lastN = n; this.el.msg.innerHTML = `<span class="big">${n}</span>`; try { sfx.play('tick'); } catch { /* yok */ } }
    } else if (v.phase !== 'ready' && this.lastN) { this.lastN = 0; this.el.msg.innerHTML = ''; }
    if (this.esnd) this.esnd.int = v.phase === 'play' && v.pots && v.pots.length ? clamp(Math.max(...v.pots.map((q) => q[1] || 0)), 0, 1) : 0;
    if (v.phase === 'play' && v.pots) {
      const pot = this.holder();
      const ready = pot && sNow >= pot[2] && !pot[5];
      const me = v.me;
      const alive = me >= 0 && v.al[me];
      this.pEl.forEach((el, i) => {
        const can = this.canPassTo(i);
        el.classList.toggle('tap', can);
        if (this.P3[i]) this.P3[i].tap = can;
        el.classList.toggle('off', !v.players[i]?.on);
      });
      let t = '', mine = false;
      if (me < 0) t = '👀 Bu turu izliyorsun';
      else if (!alive) t = '💥 Elendin — izliyorsun';
      else if (pot) { mine = true; t = pot[5] ? '🥔 Yeni patates sende…' : ready ? '🥔 PATATES SENDE! Birine dokun, at!' : '🥔 Yakaladın, hazırlan…'; }
      else { const h = v.pots[0]?.[0]; t = h !== undefined ? `🥔 Patates ${esc(v.players[h]?.n || '')} elinde` : ''; }
      if (this.last.t !== t) { this.last.t = t; this.el.sayS.innerHTML = t; }
      this.el.say.classList.toggle('me', mine);
      this.el.say.style.display = t ? '' : 'none';
      if (mine && !pot[5] && sNow - this.lastBeat > 380 - pot[1] * 220) { this.lastBeat = sNow; try { sfx.play('tick'); } catch { /* yok */ } }
    } else {
      this.pEl.forEach((el) => el.classList.remove('tap'));
      this.P3.forEach((p) => { p.tap = false; });
      this.el.say.style.display = 'none';
    }
  }

  /* ---------- 3B çizim ---------- */
  resize() {
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    const W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return [W, H, w / h];
  }
  project(x, y, z) {
    const m = this.mats.VP;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    return [((cx / cw) * 0.5 + 0.5) * (this.vw || 1), (1 - ((cy / cw) * 0.5 + 0.5)) * (this.vh || 1), cw];
  }
  // Kamera: tüm halka (baş + ayak) ekrana, üstte HUD altta yazı payı bırakarak sığsın — en yakın uzaklık aranır
  fitD(pitch, ty, tz, fov, asp) {
    const [kx, kz] = this.ringK();
    const R = this.R || 2;
    const vh = this.vh || 640;
    const land = (this.vw || 1) > vh * 1.1;
    const top = 1 - 2 * Math.min(0.24, (land ? 40 : 104) / vh), bot = -1 + 2 * Math.min(0.24, (land ? 56 : 96) / vh), side = land ? 0.8 : 0.94;
    const pts = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      pts.push([ca * (R * kx + 0.5), 0, sa * (R * kz + 0.5)], [ca * (R * kx + 0.35), 2.15, sa * (R * kz + 0.35)]);
    }
    const V = this.mats.TV, P = this.mats.TP, VP = this.mats.TVP;
    M.persp(P, fov, asp, 0.3, 120);
    const ok = (D) => {
      M.look(V, 0, ty + Math.sin(pitch) * D, tz + Math.cos(pitch) * D, 0, ty, tz);
      M.mul(VP, P, V);
      for (const [x, y, z] of pts) {
        const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
        if (cw <= 0.3) return false;
        const nx = cx / cw, ny = cy / cw;
        if (nx < -side || nx > side || ny > top || ny < bot) return false;
      }
      return true;
    };
    let lo = 3, hi = 60;
    for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
    return hi;
  }
  stepCam(dt) {
    const c = this.cam;
    const asp = (this.vw || 1) / (this.vh || 1);
    const land = asp > 1.1;
    this.fov = land ? 0.72 : 0.8;
    const pitch = land ? 0.62 : 0.84;
    c.tx = 0; c.ty = 0.55; c.tz = land ? 0.1 : 0.25;
    const key = `${this.R}|${Math.round(this.vw)}|${Math.round(this.vh)}`;
    if (key !== this.fitKey) { this.fitKey = key; this.fitVal = this.fitD(pitch, c.ty, c.tz, this.fov, asp); }
    c.D = damp(c.D, this.fitVal, 3, dt);
    const sh = c.shake > 0 ? (Math.random() - 0.5) * c.shake * 0.25 : 0;
    c.shake = Math.max(0, c.shake - dt * 1.4);
    c.ex = c.tx + sh;
    c.ey = c.ty + Math.sin(pitch) * c.D + sh * 0.5;
    c.ez = c.tz + Math.cos(pitch) * c.D;
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
      if (p.fire) { p.vx += Math.sin(this.time * 7 + p.ph) * 0.9 * dt; p.vz += Math.cos(this.time * 6 + p.ph) * 0.9 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    const Q = this.puffs;
    for (let i = Q.length - 1; i >= 0; i--) {
      const q = Q[i];
      q.life -= dt;
      if (q.life <= 0) { Q.splice(i, 1); continue; }
      const k = Math.exp(-1.6 * dt);
      q.vx *= k; q.vz *= k; q.vy *= k;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.r += q.gr * dt * (q.life / q.max);
    }
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const q = this.chunks[i];
      q.life -= dt;
      if (q.life <= 0) { this.chunks.splice(i, 1); continue; }
      q.vy -= 9 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rot += q.vr * dt;
      if (q.y < 0.04) { q.y = 0.04; q.vy = Math.abs(q.vy) * 0.35; q.vx *= 0.6; q.vz *= 0.6; q.vr *= 0.6; }
    }
    // kurum: patlayanın başından tüten duman
    this.P3.forEach((p) => {
      if (!(p.soot > 0)) return;
      p.soot -= dt;
      if (Math.random() < dt * 5 && Q.length < 60) Q.push({ x: p.x + (Math.random() - 0.5) * 0.2, y: 1.3, z: p.z + (Math.random() - 0.5) * 0.2, vx: 0.05, vy: 0.6, vz: 0, r: 0.12, gr: 0.5, life: 1.6, max: 1.6, col: [0.15, 0.13, 0.14], a: 0.5, add: false });
    });
    if (Math.random() < dt * 2.2 && Q.length < 40) Q.push({ x: (Math.random() - 0.5) * 0.3, y: 1.4, z: (Math.random() - 0.5) * 0.3, vx: 0.12, vy: 0.55, vz: 0.05, r: 0.25, gr: 0.5, life: 3.5, max: 3.5, col: [0.5, 0.48, 0.55], a: 0.2, add: false });
    if (P.length > 700) return;
    // alev: saniyede ~75 yumuşak top (yükselir, küçülür, beyaz-sarıdan turuncu-kırmızıya döner)
    this.flAcc = (this.flAcc || 0) + dt * 85;
    while (this.flAcc >= 1) {
      this.flAcc -= 1;
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.3;
      const life = 0.5 + Math.random() * 0.45;
      P.push({ x: Math.cos(a) * r, y: 0.14 + Math.random() * 0.08, z: Math.sin(a) * r, vx: -Math.cos(a) * r * 1.2 + (Math.random() - 0.5) * 0.2, vy: 1.3 + Math.random() * 0.9, vz: -Math.sin(a) * r * 1.2 + (Math.random() - 0.5) * 0.2, life, max: life, s: 0.14 + Math.random() * 0.09 - r * 0.15, r: 1, g: 0.8, b: 0.3, add: true, grav: -1.6, drag: 1.6, fire: true, ph: Math.random() * 6.28 });
    }
    if (Math.random() < dt * 22) P.push({ x: (Math.random() - 0.5) * 0.5, y: 0.5, z: (Math.random() - 0.5) * 0.5, vx: (Math.random() - 0.5) * 0.6, vy: 1.6 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 0.6, life: 1.2, max: 1.2, s: 0.028, r: 1, g: 0.6 + Math.random() * 0.3, b: 0.2, add: true, grav: -0.2, drag: 0.8 });
    this.tp.forEach((t) => {
      if (!t.pos) return;
      if (Math.random() < dt * (4 + t.heat * 20)) P.push({ x: t.pos[0] + (Math.random() - 0.5) * 0.15, y: t.pos[1] + 0.15, z: t.pos[2] + (Math.random() - 0.5) * 0.15, vx: (Math.random() - 0.5) * 0.25, vy: 0.5 + t.heat, vz: (Math.random() - 0.5) * 0.25, life: 0.8, max: 0.8, s: 0.022 + t.heat * 0.012, r: 1, g: 1, b: 1, add: true, grav: -0.3, drag: 1 });
      if (t.heat > 0.55 && Math.random() < dt * 30 * t.heat) P.push({ x: t.pos[0], y: t.pos[1] + 0.15, z: t.pos[2], vx: (Math.random() - 0.5) * 1.6, vy: 1 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 1.6, life: 0.5, max: 0.5, s: 0.03, r: 1, g: 0.8, b: 0.3, add: true, grav: 4, drag: 1 });
      // uçarken iz
      if (t.t < 1 && Math.random() < dt * 60) P.push({ x: t.pos[0], y: t.pos[1], z: t.pos[2], vx: 0, vy: 0.2, vz: 0, life: 0.35, max: 0.35, s: 0.05, r: 1, g: 0.7, b: 0.3, add: true, grav: 0, drag: 2 });
    });
  }
  fillParts(V) {
    const rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    let na = 0, nb = 0;
    const A = this.pA, B = this.pB;
    const quad = (arr, o, x, y, z, s, r, g, b, a) => {
      const c0 = [x - rx * s - ux * s, y - ry * s - uy * s, z - rz * s - uz * s];
      const c1 = [x + rx * s - ux * s, y + ry * s - uy * s, z + rz * s - uz * s];
      const c2 = [x + rx * s + ux * s, y + ry * s + uy * s, z + rz * s + uz * s];
      const c3 = [x - rx * s + ux * s, y - ry * s + uy * s, z - rz * s + uz * s];
      for (const q of [c0, c1, c2, c0, c2, c3]) { arr[o++] = q[0]; arr[o++] = q[1]; arr[o++] = q[2]; arr[o++] = r; arr[o++] = g; arr[o++] = b; arr[o++] = a; }
    };
    // yumuşak yuvarlak parçacıklar (kıvılcım, duman, kırıntı)
    {
      // ateşin çekirdeği: kalıcı, titreyen iki büyük yumuşak ışık
      const fl = 0.85 + 0.15 * Math.sin(this.time * 17) * Math.sin(this.time * 5.3 + 1);
      let o = nb * 7;
      if (o + 252 <= B.length) {
        let o2 = emitSoft(B, o, 0, 0.32, 0, 0.42 * fl, 1, 0.42, 0.1, 0.5, rx, ry, rz, ux, uy, uz);
        o2 = emitSoft(B, o2, 0, 0.26, 0, 0.22, 1, 0.9, 0.55, 0.55 * fl, rx, ry, rz, ux, uy, uz);
        nb += (o2 - o) / 7;
      }
    }
    for (const p of this.parts) {
      const arr = p.add ? B : A;
      const o = (p.add ? nb : na) * 7;
      if (o + 126 > arr.length) continue;
      const k = p.life / p.max;
      let o2;
      if (p.fire) {
        const u = 1 - k;   // 0 doğumda → 1 sönerken
        const al = Math.min(1, u * 7) * Math.pow(k, 0.6) * 0.48;
        o2 = emitSoft(arr, o, p.x, p.y, p.z, p.s * (1.25 - u * 0.8), 1, 0.2 + 0.7 * Math.pow(k, 1.3), 0.04 + 0.45 * k * k * k, al, rx, ry, rz, ux, uy, uz);
      } else o2 = emitSoft(arr, o, p.x, p.y, p.z, p.s * 1.35, p.r, p.g, p.b, k, rx, ry, rz, ux, uy, uz);
      if (p.add) nb += (o2 - o) / 7; else na += (o2 - o) / 7;
    }
    // ateş böcekleri: yanıp sönen yumuşak ışık noktaları
    for (const f of this.flies) {
      const o = nb * 7;
      if (o + 126 > B.length) break;
      const tw = 0.5 + 0.5 * Math.sin(this.time * 3 + f.ph * 3);
      const o2 = emitSoft(B, o, f.x, f.y, f.z, 0.075, 0.75, 1, 0.35, tw * tw, rx, ry, rz, ux, uy, uz);
      nb += (o2 - o) / 7;
    }
    void quad;
    return [na, nb];
  }
  // Her kampçının iskeleti: gövde matrisi, kol yönleri, el konumları
  rig(dt) {
    const v = this.view;
    const al = v?.al;
    const t = this.time;
    this.P3.forEach((p, i) => {
      const holding = this.tp.some((q) => q.h === i && q.t >= 1);
      const heat = holding ? (this.tp.find((q) => q.h === i)?.heat || 0) : 0;
      const out = al && !al[i];
      if (out && this.toast[i] < 1) this.toast[i] = Math.min(1, (this.toast[i] || 0.001) + dt * 2.5);
      p.hop = Math.max(0, (p.hop || 0) - dt * 0.6);
      if (p.thr >= 0) { p.thr += dt; if (p.thr > 0.45) p.thr = -1; }
      if (p.cat >= 0) { p.cat += dt; if (p.cat > 0.45) p.cat = -1; }
      p.warm -= dt;
      if (p.warm < -3.5) p.warm = 3 + Math.random() * 6;
      // yön: merkeze; atarken hedefe döner
      let yaw = Math.atan2(-p.x, -p.z);
      if (p.thr >= 0 && this.P3[p.thrTo]) { const q = this.P3[p.thrTo]; yaw = Math.atan2(q.x - p.x, q.z - p.z); }
      let dy = yaw - p.yaw;
      while (dy > Math.PI) dy -= TAU;
      while (dy < -Math.PI) dy += TAU;
      p.yaw += dy * (1 - Math.exp(-(p.thr >= 0 ? 22 : 8) * dt));
      // kol hedefleri (yerel)
      let L, Rr;
      if (out) { const k = this.toast[i] || 0; L = [-0.7, 0.3 * k - 0.4 * (1 - k), 0.35]; Rr = [0.7, 0.3 * k - 0.4 * (1 - k), 0.35]; }
      else if (p.thr >= 0) {
        const k = p.thr / 0.45;
        if (k < 0.18) { L = [-0.25, -0.9, -0.25]; Rr = [0.25, -0.9, -0.25]; }
        else { L = [-0.12, 0.55, 1]; Rr = [0.12, 0.55, 1]; }
      } else if (p.cat >= 0) { L = [-0.25, 0.35, 1]; Rr = [0.25, 0.35, 1]; }
      else if (holding) {
        const w = 9 + heat * 12;
        const s = Math.sin(t * w + i);
        L = [0.48, -0.38 + Math.max(0, s) * 0.32, 1];
        Rr = [-0.48, -0.38 + Math.max(0, -s) * 0.32, 1];
      } else if (p.warm < 0) { L = [0.18, -0.35, 1]; Rr = [-0.18, -0.35, 1]; }
      else { const s = Math.sin(t * 1.3 + i) * 0.05; L = [-0.22, -1, 0.1 + s]; Rr = [0.22, -1, 0.1 - s]; }
      const k = 1 - Math.exp(-(p.thr >= 0 || p.cat >= 0 ? 26 : 12) * dt);
      [L, Rr].forEach((d, j) => { const c = p.dirs[j]; c[0] += (d[0] - c[0]) * k; c[1] += (d[1] - c[1]) * k; c[2] += (d[2] - c[2]) * k; });
      // gövde: masa karakteri ayakta (kollar iki kemikli ters kinematik; yüz ifadesi ve bakış duruma göre)
      const tz = out ? this.toast[i] : 0;
      const bounce = out ? 0 : Math.abs(Math.sin(t * (holding ? 10 + heat * 10 : 2) + i)) * (holding ? 0.05 : 0.012) + p.hop + (p.cat >= 0 ? Math.sin(Math.min(1, p.cat / 0.3) * Math.PI) * 0.12 : 0);
      const lean = out ? 0.3 * tz : holding ? 0.07 + 0.06 * Math.sin(t * 20) * heat : p.thr >= 0 ? 0.22 * Math.sin(Math.min(1, p.thr / 0.45) * Math.PI) : 0.02;
      const MAk = masa();
      const ci = (((p.c | 0) % 12) + 12) % 12;
      if (!p.av || p.av.ci !== ci) p.av = new MAk.StandAvatar(ci);
      const a = p.av, g = a.tgt;
      a.yaw = p.yaw; a.base[0] = p.x; a.base[1] = bounce; a.base[2] = p.z; a.sit = tz;
      g.lean = lean; g.rise = 0; g.roll = 0; g.turn = 0; g.hroll = out ? 0.14 * tz : 0;
      const reach = (MAk.UPPER + MAk.FORE) * 0.9;
      for (let j = 0; j < 2; j++) {
        const d = p.dirs[j], l = Math.hypot(d[0], d[1], d[2]) || 1, ux = d[0] / l, uy = d[1] / l, uz = d[2] / l, sx = j ? 1 : -1;
        g.hand[j] = [MAk.SHO[0] * sx + ux * reach, MAk.SHO[1] + uy * reach, MAk.SHO[2] + uz * reach];
        g.fdir[j] = [ux, uy, uz]; g.fw[j] = 0.55;
        g.palm[j] = holding || p.cat >= 0 ? [-sx * 0.35, 1, 0.25] : p.thr >= 0 || p.warm < 0 ? [0, 0.2, 1] : [-sx, 0, 0.2];
        g.pole[j] = [sx * 0.7, -0.6, -0.35];
      }
      a.shape = holding || p.cat >= 0 || p.thr >= 0 || p.warm < 0 ? ['open', 'open'] : ['relax', 'relax'];
      a.expr = out ? 'sad' : holding ? (heat > 0.55 ? 'wince' : 'tense') : p.thr >= 0 ? 'grin' : p.cat >= 0 ? 'o' : 'smile';
      a.k = 30;
      const tq = this.tp.find((q) => q.pos);
      a.look = out ? null : tq ? tq.pos : [0, 0.6, 0];
      a.stepStand(dt, t);
      p.body = a.M.body;
      p.hands[0] = a.hw[0]; p.hands[1] = a.hw[1];
      p.heat = heat;
      p.out = out;
    });
  }
  handMid(i) {
    const p = this.P3[i];
    if (!p) return [0, 1, 0];
    if (!p.body) { const k = 1 - 0.45 / Math.max(1, Math.hypot(p.x, p.z)); return [p.x * k, 1.0, p.z * k]; }
    return [(p.hands[0][0] + p.hands[1][0]) / 2, (p.hands[0][1] + p.hands[1][1]) / 2 + 0.1, (p.hands[0][2] + p.hands[1][2]) / 2];
  }
  // patatesin dünyadaki yeri: sahibinin ellerinde zıplar, atılınca yay çizerek uçar
  potPos(t, dt) {
    if (t.t < 1) t.t = Math.min(1, t.t + dt / 0.4);
    const b = this.handMid(t.h);
    t.spin = (t.spin || 0) + dt * (t.t < 1 ? 14 : 2 + t.heat * 6);
    if (t.t < 1) {
      const a = t.src || this.handMid(t.from);
      const k = t.t;
      const e = k * k * (3 - 2 * k);
      const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const arc = Math.sin(k * Math.PI) * (0.7 + d * 0.25);
      t.pos = [lerp(a[0], b[0], e), lerp(a[1], b[1], e) + arc, lerp(a[2], b[2], e)];
      return t.pos;
    }
    // ellerde hokkabazlık: bir elden diğerine zıplar
    const p = this.P3[t.h];
    const w = 9 + t.heat * 12;
    const s = Math.sin(this.time * w + t.h);
    if (p && p.body) {
      const hL = p.hands[0], hR = p.hands[1];
      const u = 0.5 + 0.5 * s * 0.9;
      const j = Math.abs(Math.cos(this.time * w + t.h)) * (t.h === this.view?.me ? 0.62 : 0.2);
      const sh = t.heat * 0.02;
      t.pos = [lerp(hR[0], hL[0], u) + (Math.random() - 0.5) * sh, lerp(hR[1], hL[1], u) + 0.11 + j, lerp(hR[2], hL[2], u) + (Math.random() - 0.5) * sh];
    } else t.pos = b;
    return t.pos;
  }
  draw(dt) {
    const X = this.X, Wd = this.W;
    if (!X || this.lost || !Wd) return;
    const gl = X.gl;
    const [Wp, Hp, asp] = this.resize();
    const c = this.cam, mt = this.mats;
    M.persp(mt.P, this.fov, asp, 0.3, 120);
    M.look(mt.V, c.ex, c.ey, c.ez, c.tx, c.ty, c.tz);
    M.mul(mt.VP, mt.P, mt.V);
    const fl = 0.85 + 0.15 * Math.sin(this.time * 17) * Math.sin(this.time * 5.3 + 1);
    const L = Object.assign({}, NIGHT, { lampC: [NIGHT.lampC[0] * fl, NIGHT.lampC[1] * fl, NIGHT.lampC[2] * fl] });
    const F = { VP: mt.VP, V: mt.V, fov: this.fov, asp, shift: 0, cx: c.ex, cy: c.ey, cz: c.ez, sun: MOON, fog: NFOG, top: hexRGB(NIGHT.top), hor: hexRGB(NIGHT.hor), sunVis: norm3([-0.3, 0.45, -0.84]), lx: 0, ly: 0.9, lz: 0, lampC: L.lampC };
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(NFOG[0], NFOG[1], NFOG[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.depthMask(false);
    gl.disable(gl.DEPTH_TEST);
    drawSky(X, F, L);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    useProg(X, X.lit, F, L);
    const m = mt.a;
    M.set(m, 0, 0, 0);
    detailOn(X, 0.42, 0.18);
    drawMesh(X, Wd.ground, m, ONE3);
    detailOn(X, 0);
    drawMesh(X, Wd.tufts, m, ONE3);
    drawMesh(X, Wd.trees, m, ONE3);
    drawMesh(X, Wd.deco, m, ONE3);
    drawMesh(X, Wd.pit, m, ONE3);
    const bz = this.bannerZ();
    M.set(m, 0, 0, bz);
    drawMesh(X, Wd.bpoles, m, ONE3);
    M.set(m, 0, 0, 0);
    // alevler artık yumuşak parçacıklarla çiziliyor (fillParts); burada yalnız odunların arasındaki kısa kor dili
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + this.time * 0.9;
      const s = 0.75 + 0.25 * Math.sin(this.time * 10 + i * 2.1);
      M.set(m, Math.cos(a) * 0.12, 0.1, Math.sin(a) * 0.12, a, -Math.PI / 2 + 0.2 * Math.sin(this.time * 3 + i), 0, 0.9 * s, 0.9 * s, 0.8 * s);
      drawMesh(X, this.res.flame, m, ONE3);
    }
    // kampçılar + kollar
    this.rig(dt);
    {
      const MAk = masa(), sh = this.standSh(), o = { h: this.vh, rim: [1, 0.62, 0.32], rimK: 0.36 };
      const tA = this.tA || (this.tA = new Float32Array(3)), tS = this.tS || (this.tS = new Float32Array(3)), tH = this.tH || (this.tH = new Float32Array(3));
      this.P3.forEach((p, i) => {
        const a = p.av;
        if (!a) return;
        const tz = p.out ? this.toast[i] || 0 : 0, hot = p.heat || 0;
        const k = p.out ? [lerp(1, 0.3, tz), lerp(1, 0.25, tz), lerp(1, 0.22, tz)] : hot > 0 ? [1 + hot * 0.25, 1 - hot * 0.12, 1 - hot * 0.18] : ONE3;
        for (let q = 0; q < 3; q++) { tA[q] = k[q]; tS[q] = a.tint[q] * k[q]; tH[q] = a.skinT[q] * k[q]; }
        MAk.drawStand(X, a, this.standMesh(a.ci), sh, F, o, tA, tS, tH, !p.out && KIT.blinkAt(i, this.time));
      });
    }
    // patatesler
    this.tp.forEach((t) => {
      const pos = this.potPos(t, dt);
      const hh = t.heat;
      M.set(m, pos[0], pos[1], pos[2], t.spin, t.spin * 0.7, 0, 1.45 + hh * 0.2);
      drawMesh(X, Wd.potato, m, [1 + hh * 0.5, 1 - hh * 0.35, 1 - hh * 0.6]);
    });
    // patlayan patates parçaları
    this.chunks.forEach((q) => {
      M.set(m, q.x, q.y, q.z, q.rot, q.rot * 0.6, 0, q.s * Math.min(1, q.life));
      drawMesh(X, Wd.potato, m, [0.75, 0.55, 0.35]);
    });
    // pankart (logo)
    if (this.bannerTex) {
      if (!this.bannerImg && this.res.img) { this.bannerImg = true; drawBanner(this.bannerCv, this.brand, this.res.img); updateTexture(X, this.bannerTex, this.bannerCv); }
      useProg(X, X.tex, F, L);
      gl.uniform1f(X.tex.u.uSelf, 0.55);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.bannerTex);
      gl.uniform1i(X.tex.u.uTex, 0);
      M.set(m, 0, 0, bz);
      drawMesh(X, Wd.banner, m, ONE3);
      useProg(X, X.lit, F, L);
    }
    // saydam: gölgeler, halkalar, ışıklar, parçacıklar
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    useProg(X, X.un, F, L);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -4);
    // ateşten dışa uzanan, titreyen gölgeler (ateş alçakta: uzun gölge) + ayak altı temas gölgesi
    this.P3.forEach((p) => {
      const d = Math.hypot(p.x, p.z) || 1, ux = p.x / d, uz = p.z / d;
      const len = 1.15 + 0.5 * (1.2 / Math.max(0.6, 1.3 - 0.12 * d)) * (0.92 + 0.08 * fl);
      M.set(m, p.x + ux * len * 0.82, 0.018, p.z + uz * len * 0.82, Math.atan2(ux, uz), 0, 0, 0.5, 1, len);
      drawMesh(X, this.res.shadow, m, ONE3, (0.78 + 0.12 * fl) * (p.out ? 0.6 : 1));
      M.set(m, p.x, 0.022, p.z, 0, 0, 0, 0.5, 1, 0.5);
      drawMesh(X, this.res.shadow, m, ONE3, 0.7);
    });
    this.tp.forEach((t) => {
      if (!t.pos || t.pos[1] < 0.05) return;
      const h = t.pos[1];
      M.set(m, t.pos[0] * (1 + 0.1 * h), 0.02, t.pos[2] * (1 + 0.1 * h), 0, 0, 0, 0.32 + h * 0.08, 1, 0.32 + h * 0.08);
      drawMesh(X, this.res.shadow, m, ONE3, clamp(0.7 - h * 0.18, 0.15, 0.7));
    });
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    M.set(m, 0, 0.03, 0, 0, 0, 0, 3.4, 1, 3.4);
    drawMesh(X, this.res.glow, m, [1, 0.5, 0.18], 0.55 * fl);
    // fener ışık havuzları
    [[-3.75, -2.95], [4.35, -3.1], [-2.35, -6.9], [2.85, -6.85]].forEach(([x, z], k) => {
      M.set(m, x, 0.03, z, 0, 0, 0, 1.6, 1, 1.6);
      drawMesh(X, this.res.glow, m, [1, 0.72, 0.35], 0.32 + 0.04 * Math.sin(this.time * 2 + k));
    });
    this.tp.forEach((t) => {
      if (!t.pos) return;
      M.set(m, t.pos[0], 0.03, t.pos[2], 0, 0, 0, 0.5 + t.heat * 0.4, 1, 0.5 + t.heat * 0.4);
      drawMesh(X, this.res.glow, m, [1, 0.4, 0.1], t.heat * 0.6);
      M.set(m, t.pos[0], t.pos[1], t.pos[2], 0, 0, 0, 0.35 + t.heat * 0.25, 1, 0.35 + t.heat * 0.25);
      drawMesh(X, this.res.glow, m, [1, 0.55, 0.15], 0.25 + t.heat * 0.5);
    });
    this.puffs.forEach((q) => {
      const k = q.life / q.max;
      gl.blendFunc(q.add ? gl.ONE : gl.SRC_ALPHA, q.add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(X.un.u.uAdd, q.add ? 1 : 0);
      M.set(m, q.x, q.y, q.z, 0, 0.9, 0, q.r, 1, q.r);
      drawMesh(X, this.res.glow, m, q.col, q.a * Math.min(1, k * 2.2));
    });
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(X.un.u.uAdd, 1);
    const [na, nb] = this.fillParts(mt.V);
    gl.uniform3fv(X.un.u.uTint, ONE3);
    drawDynamic(X, X.dyn, this.pB, nb, true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawDynamic(X, X.dyn2, this.pA, na, false);
    // dokunulabilir oyuncuların altında parlayan halka
    useProg(X, X.lit, F, L);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.P3.forEach((p) => {
      p.ring = damp(p.ring || 0, p.tap ? 1 : 0, 10, dt);
      if (p.ring < 0.02) return;
      const s = (0.95 + 0.08 * Math.sin(this.time * 7)) * (0.7 + 0.3 * p.ring);
      M.set(m, p.x, 0.07, p.z, this.time * 0.8, 0, 0, s);
      drawMesh(X, Wd.ring, m, ONE3, p.ring);
    });
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    postFX(X, Wp, Hp, { bloom: 0.8, th: 0.62, white: 0.18, sat: 1.1, con: 0.13, vig: 0.9, tint: [1.02, 1, 0.97] });
  }
  stepFlies(dt) {
    for (const f of this.flies) {
      f.a += dt * f.s * 0.12;
      f.ph += dt;
      f.x = Math.cos(f.a) * f.r + Math.sin(f.ph * 0.7) * 0.4;
      f.z = Math.sin(f.a) * f.r - 1.5;
      f.y = 0.4 + (f.y0 = f.y0 ?? f.y) + Math.sin(f.ph * 1.3) * 0.3;
    }
  }
  // dokunma alanlarını ve isimleri karakterlerin ekrandaki yerine taşı
  placeDom() {
    const scr = [];
    this.P3.forEach((p, i) => {
      const el = this.pEl[i];
      if (!el) return;
      const a = this.project(p.x, 0.95, p.z);
      if (!a) { el.style.display = 'none'; return; }
      el.style.display = '';
      const top = this.project(p.x, 2.1, p.z);
      const hgt = top ? Math.abs(a[1] - top[1]) : 80;
      const w = clamp(hgt * 1.25, 60, 140);
      scr[i] = [a[0], a[1]];
      el.style.setProperty('--w', `${w.toFixed(0)}px`);
      el.style.transform = `translate(${a[0].toFixed(1)}px, ${(a[1] - w * 0.1).toFixed(1)}px)`;
    });
    this.lastScr = scr;
  }
  placeFlat() {
    const cx = (this.el.wrap.clientWidth || 360) / 2, cy = (this.el.wrap.clientHeight || 640) / 2;
    this.P3.forEach((_, i) => {
      const el = this.pEl[i];
      const fp = this.flatPos?.[i];
      if (!el || !fp) return;
      el.style.setProperty('--w', '64px');
      el.style.transform = `translate(${cx + fp[0]}px, ${cy + fp[1]}px)`;
      (this.lastScr || (this.lastScr = []))[i] = [cx + fp[0], cy + fp[1]];
    });
  }

  emoAnchor(pid) {
    const i = this.emoIdx(pid), p = i >= 0 && this.P3 ? this.P3[i] : null;
    if (!p) return null;
    if (this.flat) { const q = this.lastScr && this.lastScr[i]; return q ? [q[0], q[1] - 40] : null; }
    return this.emoProj(p.x, 2.4, p.z);
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
      this.uiT += dt;
      if (this.uiT > 0.12) { this.uiT = 0; this.ui(); }
      if (this.flat) { this.placeFlat(); return; }
      this.placeRing();
      this.stepCam(dt);
      this.stepParts(dt);
      this.stepFlies(dt);
      this.draw(dt);
      this.placeDom();
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[patates]', e); }
    }
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    try { this.esnd && this.esnd.stopAll(); } catch { /* yok say */ }
    try { this.emo && this.emo.dispose(); } catch { /* yok say */ }
    cancelAnimationFrame(this.raf);
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
    console.error('[patates]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
// Model görüntüleyici için (oyunda kullanılmaz)
export const _mdl = () => ({});
