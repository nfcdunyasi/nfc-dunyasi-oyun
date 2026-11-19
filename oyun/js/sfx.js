/*
 * NFC Dünyası Oyun — ses motoru
 * Hiç ses dosyası yok: fon müzikleri ve efektler tarayıcının ses motoruyla (Web Audio)
 * anında üretilir. Sayfa hafif kalır, internet yavaşken bile sesler gecikmez.
 *
 *   müzik  : sahneye göre değişen, döngüsel ve sakin fon müzikleri (lobby, party, quiz, tension, night, day)
 *   efekt  : dokunma, geri sayım, çark, patlama, gece/sabah, alkış, davul… (play('isim'))
 *
 * Telefonlar sesi ancak bir dokunuştan sonra açar; iPhone'un sessiz tuşunu aşmak için
 * arka planda duyulmayan boş bir ses döngüsü çalınır.
 */

const KEY_SFX = 'nfc-oyun-ses';
const KEY_MUSIC = 'nfc-oyun-muzik';
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* gizli sekme */ } };

let sfxOn = read(KEY_SFX) !== 'kapali';
let musicOn = read(KEY_MUSIC) !== 'kapali';

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;

const MUSIC_LEVEL = 0.16;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createDynamicsCompressor();
  master.threshold.value = -14;
  master.ratio.value = 4;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.5;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = musicOn ? MUSIC_LEVEL : 0;
  musicBus.connect(master);
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/* ============================ Kilit açma ============================ */

let unlocked = false;
let keepAlive = null;

function silentWavUrl() {
  const rate = 8000;
  const n = 800;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

const anyOn = () => sfxOn || musicOn;

export function unlock() {
  const c = ensure();
  if (!c) return;
  if (c.state !== 'running') c.resume().then(startPendingScene).catch(() => {});
  if (unlocked) return;
  unlocked = true;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* eski tarayıcı */ }
  try {
    const b = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
  } catch { /* yok say */ }
  try {
    keepAlive = new Audio(silentWavUrl());
    keepAlive.loop = true;
    keepAlive.setAttribute('playsinline', '');
    if (anyOn()) keepAlive.play().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        keepAlive.pause();
        ctx?.suspend().catch(() => {});
      } else {
        if (anyOn()) keepAlive.play().catch(() => {});
        ctx?.resume().catch(() => {});
      }
    });
  } catch { /* yok say */ }
  startPendingScene();
}

/* ============================ Ayarlar ============================ */

export const isMuted = () => !sfxOn;
export const isMusicOn = () => musicOn;

export function setMuted(v) {
  sfxOn = !v;
  write(KEY_SFX, sfxOn ? 'acik' : 'kapali');
  syncKeepAlive();
}

export function setMusic(on) {
  musicOn = !!on;
  write(KEY_MUSIC, musicOn ? 'acik' : 'kapali');
  if (ctx) musicBus.gain.setTargetAtTime(musicOn ? MUSIC_LEVEL : 0, ctx.currentTime, 0.3);
  if (musicOn) startPendingScene();
  syncKeepAlive();
}

function syncKeepAlive() {
  if (!keepAlive) return;
  if (anyOn()) keepAlive.play().catch(() => {}); else keepAlive.pause();
}

/* ============================ Enstrümanlar ============================ */

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function env(g, t, a, peak, dur) {
  g.gain.value = 0.0001;   // yeni düğümün varsayılan kazancı 1: zarftan önceki ilk örnek tık yapmasın
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
}

function tone(bus, freq, t, dur = 0.12, type = 'sine', vol = 0.5, slideTo = null, attack = 0.008) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env(g, t, attack, vol, dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return o;
}

function noise(bus, t, dur, vol, { type = 'lowpass', freq = 1000, to = null, q = 0.7, attack = 0.005 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  env(g, t, attack, vol, dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + dur + 0.05);
}

// Müzik enstrümanları (çalan sahnenin kanalına bağlanır)
function pad(t, notes, dur, vol = 0.07, cutoff = 900) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.6);
  g.gain.setValueAtTime(vol, t + Math.max(0.7, dur - 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
  f.connect(g).connect(scene.bus);
  notes.forEach((m) => {
    [-6, 6].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = cents;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.7);
    });
  });
}

function pluck(t, m, vol = 0.12, dur = 0.35, type = 'triangle') {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = mtof(m);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(600, t + dur);
  env(g, t, 0.004, vol, dur);
  o.connect(f).connect(g).connect(scene.bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function bass(t, m, dur, vol = 0.16) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = mtof(m);
  g.gain.value = 0.0001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(scene.bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const hat = (t, vol = 0.035) => noise(scene.bus, t, 0.04, vol, { type: 'highpass', freq: 7000 });
const shaker = (t, vol = 0.03) => noise(scene.bus, t, 0.07, vol, { type: 'bandpass', freq: 5000, q: 1.2, attack: 0.02 });
const kick = (t, vol = 0.22) => tone(scene.bus, 110, t, 0.22, 'sine', vol, 42, 0.003);
const snap = (t, vol = 0.05) => noise(scene.bus, t, 0.08, vol, { type: 'bandpass', freq: 1800, q: 1.5 });

/* ============================ Fon müzikleri ============================ */

// Akorlar MIDI nota numarasıyla (60 = Do). Her ölçü 16 adım; her ölçüde bir akor.
const THEMES = {
  // Giriş ve lobi: sıcak, yavaş lo-fi. Fmaj7 – Em7 – Dm7 – Cmaj7
  lobby: {
    bpm: 80,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    step(t, s, chord, spb) {
      if (s === 0) { pad(t, chord, spb * 4, 0.05, 750); bass(t, chord[0] - 12, spb * 1.8); }
      if (s === 8) bass(t, chord[0] - 12, spb * 1.6, 0.12);
      const arp = { 0: 0, 3: 2, 6: 1, 10: 3, 12: 2 };
      if (s in arp) pluck(t, chord[arp[s]] + 12, 0.07, 0.5, 'sine');
      if (s % 4 === 2) hat(t, 0.025);
      if (s === 4 || s === 12) snap(t, 0.03);
    },
  },
  // Parti oyunları: hareketli, neşeli. Do – Sol – La m – Fa
  party: {
    bpm: 108,
    chords: [[48, 52, 55, 60], [43, 47, 50, 55], [45, 48, 52, 57], [41, 45, 48, 53]],
    step(t, s, chord, spb) {
      if (s === 0) pad(t, chord.map((m) => m + 12), spb * 4, 0.035, 1400);
      if (s % 4 === 0) kick(t, 0.16);
      if (s === 4 || s === 12) snap(t, 0.06);
      if (s % 2 === 1) hat(t, 0.03);
      if ([0, 6, 8, 11, 14].includes(s)) bass(t, chord[0] - 12 + (s === 11 ? 7 : 0), spb * 0.45, 0.13);
      if ([2, 5, 10, 13].includes(s)) pluck(t, chord[(s >> 1) % chord.length] + 24, 0.06, 0.25);
    },
  },
  // Bilgi yarışması: düşündüren, tik-taklı. La m – Fa – Do – Sol
  quiz: {
    bpm: 96,
    chords: [[45, 48, 52, 57], [41, 45, 48, 53], [48, 52, 55, 60], [43, 47, 50, 55]],
    step(t, s, chord, spb) {
      if (s === 0) { pad(t, chord.map((m) => m + 12), spb * 4, 0.04, 1000); bass(t, chord[0] - 12, spb * 2, 0.12); }
      if (s % 4 === 0) tone(scene.bus, 1800, t, 0.03, 'square', 0.015);
      if (s % 4 === 2) tone(scene.bus, 1350, t, 0.03, 'square', 0.012);
      const arp = { 0: 0, 4: 1, 7: 2, 10: 3 };
      if (s in arp) pluck(t, chord[arp[s]] + 24, 0.05, 0.3, 'sine');
    },
  },
  // Gerilim: casus, bomba. Re m – Si♭ – Sol m – La
  tension: {
    bpm: 100,
    chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
    step(t, s, chord, spb) {
      if (s === 0) pad(t, chord, spb * 4, 0.045, 600);
      if (s % 2 === 0) bass(t, chord[0] - 12, spb * 0.45, 0.11);
      if (s === 0 || s === 3) kick(t, 0.2);
      if (s % 4 === 2) shaker(t, 0.025);
      if (s === 14) pluck(t, chord[2] + 12, 0.05, 0.4, 'sine');
    },
  },
  // Köyde gündüz: tedirgin ama aydınlık, yavaş. Re m – Do – Si♭ – La
  day: {
    bpm: 72,
    chords: [[50, 53, 57], [48, 52, 55], [46, 50, 53], [45, 49, 52]],
    step(t, s, chord, spb) {
      if (s === 0) { pad(t, chord.map((m) => m + 12), spb * 4, 0.045, 1100); bass(t, chord[0] - 12, spb * 3, 0.12); }
      if ([0, 3, 6, 8, 11, 14].includes(s)) {
        const scale = [62, 65, 67, 69, 72, 74]; // Re minör pentatonik
        pluck(t, scale[Math.floor(Math.random() * scale.length)], 0.045, 0.45, 'triangle');
      }
      if (s === 8) tone(scene.bus, 98, t, 0.4, 'sine', 0.12, 60);
    },
  },
  // Gece: ritimsiz, karanlık ambiyans. Rüzgâr, cırcır böcekleri, baykuş, uzak çan.
  night: {
    ambient: true,
    start(bus) {
      const nodes = [];
      const drone = ctx.createBiquadFilter();
      drone.type = 'lowpass';
      drone.frequency.value = 420;
      const dg = ctx.createGain();
      dg.gain.value = 0.09;
      drone.connect(dg).connect(bus);
      [38, 45, 50].forEach((m, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = (i - 1) * 7;
        o.connect(drone);
        o.start();
        nodes.push(o);
      });
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 0.07;
      lg.gain.value = 180;
      lfo.connect(lg).connect(drone.frequency);
      lfo.start();
      nodes.push(lfo);
      const w = ctx.createBufferSource(); // rüzgâr
      w.buffer = noiseBuf;
      w.loop = true;
      const wf = ctx.createBiquadFilter();
      wf.type = 'bandpass';
      wf.frequency.value = 500;
      wf.Q.value = 0.8;
      const wg = ctx.createGain();
      wg.gain.value = 0.08;
      const wl = ctx.createOscillator();
      const wlg = ctx.createGain();
      wl.frequency.value = 0.11;
      wlg.gain.value = 300;
      wl.connect(wlg).connect(wf.frequency);
      w.connect(wf).connect(wg).connect(bus);
      w.start();
      wl.start();
      nodes.push(w, wl);
      return nodes;
    },
    events: [
      { every: [2.5, 6], play: (t, bus) => cricket(t, bus) },
      { every: [11, 20], play: (t, bus) => owl(t, bus) },
      { every: [16, 28], play: (t, bus) => tone(bus, mtof(74), t, 3, 'sine', 0.05, null, 0.01) },
    ],
  },
};

function cricket(t, bus) {
  const f = 4200 + Math.random() * 600;
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) tone(bus, f, t + i * 0.07, 0.035, 'sine', 0.035);
}

function owl(t, bus) {
  [[0, 0.35], [0.5, 0.2], [0.8, 0.55]].forEach(([dt, d]) => {
    const o = tone(bus, 400, t + dt, d, 'sine', 0.09, 360, 0.05);
    const v = ctx.createOscillator();
    const vg = ctx.createGain();
    v.frequency.value = 6;
    vg.gain.value = 8;
    v.connect(vg).connect(o.frequency);
    v.start(t + dt);
    v.stop(t + dt + d + 0.1);
  });
}

/* ============================ Sahne yöneticisi ============================ */

let scene = null;        // çalan sahne
let wantedScene = null;  // istenen sahne (ses açılmadan önce de hatırlanır)

export function setScene(name) {
  wantedScene = name;
  if (scene?.name === name) return;
  startPendingScene();
}

function startPendingScene() {
  if (!ctx || ctx.state !== 'running' || !musicOn || !wantedScene) return;
  if (scene?.name === wantedScene) return;
  stopScene();
  const theme = THEMES[wantedScene];
  if (!theme) return;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2);
  bus.connect(musicBus);
  scene = { name: wantedScene, theme, bus, nodes: [], next: ctx.currentTime + 0.1, step: 0, bar: 0, eventsAt: [] };
  if (theme.ambient) {
    scene.nodes = theme.start(bus);
    scene.eventsAt = theme.events.map((e) => ctx.currentTime + 1 + e.every[0] * Math.random());
  }
  scene.timer = setInterval(schedule, 50);
  schedule();
}

function stopScene() {
  if (!scene) return;
  const old = scene;
  scene = null;
  clearInterval(old.timer);
  const t = ctx.currentTime;
  old.bus.gain.cancelScheduledValues(t);
  old.bus.gain.setValueAtTime(Math.max(old.bus.gain.value, 0.0001), t);
  old.bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => {
    old.nodes.forEach((n) => { try { n.stop(); } catch { /* zaten durdu */ } });
    old.bus.disconnect();
  }, 1500);
}

function schedule() {
  if (!scene || !ctx || ctx.state !== 'running') return;
  const ahead = ctx.currentTime + 0.25;
  const { theme } = scene;
  if (theme.ambient) {
    theme.events.forEach((e, i) => {
      if (scene.eventsAt[i] <= ahead) {
        e.play(Math.max(scene.eventsAt[i], ctx.currentTime), scene.bus);
        scene.eventsAt[i] += e.every[0] + Math.random() * (e.every[1] - e.every[0]);
      }
    });
    return;
  }
  const spb = 60 / theme.bpm;
  if (scene.next < ctx.currentTime) scene.next = ctx.currentTime + 0.05; // sekme uyuduysa yetiş
  while (scene.next < ahead) {
    const chord = theme.chords[scene.bar % theme.chords.length];
    try { theme.step(scene.next, scene.step, chord, spb); } catch (e) { console.warn('[müzik]', scene.name, e); }
    scene.next += spb / 4;
    scene.step += 1;
    if (scene.step === 16) { scene.step = 0; scene.bar += 1; }
  }
}

// Büyük efektlerde müziği bir anlığına kıs
function duck(amount = 0.35, time = 0.8) {
  if (!ctx || !musicOn) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL * amount, t + 0.05);
  musicBus.gain.setTargetAtTime(MUSIC_LEVEL, t + time, 0.4);
}

/* ============================ Efektler ============================ */

const B = () => sfxBus;
const now = () => ctx.currentTime;

const SOUNDS = {
  tap: () => tone(B(), 700, now(), 0.045, 'triangle', 0.22),
  pop: () => tone(B(), 520, now(), 0.09, 'sine', 0.4, 900),
  vote: () => { tone(B(), 880, now(), 0.06, 'sine', 0.3); tone(B(), 1320, now() + 0.05, 0.08, 'sine', 0.25); },
  tick: () => tone(B(), 1000, now(), 0.035, 'square', 0.1),
  tickLast: () => tone(B(), 1500, now(), 0.08, 'square', 0.16),
  whoosh: () => noise(B(), now(), 0.35, 0.35, { type: 'bandpass', freq: 400, to: 2400, q: 1.2, attack: 0.12 }),
  swish: () => noise(B(), now(), 0.2, 0.3, { type: 'bandpass', freq: 2500, to: 600, q: 1, attack: 0.03 }),
  turn: () => { tone(B(), 784, now(), 0.14, 'triangle', 0.45); tone(B(), 1175, now() + 0.11, 0.3, 'triangle', 0.45); },
  bling: () => { [1047, 1319, 1568].forEach((f, i) => tone(B(), f, now() + i * 0.05, 0.25, 'sine', 0.25)); },
  success: () => { [523, 659, 784, 1047].forEach((f, i) => tone(B(), f, now() + i * 0.07, 0.2, 'triangle', 0.4)); },
  coin: () => { tone(B(), 988, now(), 0.07, 'square', 0.18); tone(B(), 1319, now() + 0.07, 0.3, 'square', 0.18); },
  fail: () => { tone(B(), 330, now(), 0.2, 'sawtooth', 0.22, 220); tone(B(), 220, now() + 0.18, 0.35, 'sawtooth', 0.22, 140); },
  lose: () => { // "vah vah" trombonu
    duck();
    [[392, 0], [370, 0.32], [349, 0.64]].forEach(([f, d]) => tone(B(), f, now() + d, 0.3, 'sawtooth', 0.2, f * 0.97, 0.03));
    const o = tone(B(), 330, now() + 0.96, 0.9, 'sawtooth', 0.22, 300, 0.03);
    const v = ctx.createOscillator();
    const vg = ctx.createGain();
    v.frequency.value = 6;
    vg.gain.value = 10;
    v.connect(vg).connect(o.frequency);
    v.start(now() + 0.96);
    v.stop(now() + 2);
  },
  buzzer: () => { duck(0.5, 0.5); tone(B(), 150, now(), 0.5, 'sawtooth', 0.3); tone(B(), 155, now(), 0.5, 'square', 0.12); },
  horn: () => { tone(B(), 523, now(), 0.12, 'sawtooth', 0.2); tone(B(), 784, now() + 0.12, 0.35, 'sawtooth', 0.22); },
  whistle: () => { duck(0.5, 0.6); tone(B(), 2600, now(), 0.5, 'sine', 0.25, 2900, 0.02); },
  drumroll: (dur = 1.1) => {
    duck(0.5, dur + 0.3);
    const n = Math.floor(dur / 0.045);
    for (let i = 0; i < n; i++) noise(B(), now() + i * 0.045, 0.05, 0.08 + (i / n) * 0.18, { type: 'bandpass', freq: 900, q: 0.8 });
  },
  sting: () => {
    duck(0.3, 1.2);
    tone(B(), 55, now(), 1.4, 'sawtooth', 0.35, 40, 0.005);
    [311, 330, 466].forEach((f) => tone(B(), f, now(), 1.2, 'sawtooth', 0.12, f * 0.94, 0.01));
    noise(B(), now(), 0.6, 0.35, { freq: 500, to: 80 });
  },
  reveal: () => {
    duck(0.4, 0.9);
    [523, 659, 784].forEach((f) => tone(B(), f, now(), 0.18, 'triangle', 0.25));
    [659, 784, 1047].forEach((f) => tone(B(), f, now() + 0.2, 0.7, 'triangle', 0.25));
  },
  boom: () => {
    duck(0.15, 1.5);
    noise(B(), now(), 1.4, 1, { freq: 1600, to: 60 });
    tone(B(), 95, now(), 0.9, 'sine', 0.9, 30, 0.002);
    noise(B(), now() + 0.05, 0.25, 0.5, { type: 'highpass', freq: 2000 });
  },
  fuse: () => noise(B(), now(), 0.5, 0.12, { type: 'highpass', freq: 4000, to: 6500, attack: 0.02 }),
  heartbeat: () => { tone(B(), 60, now(), 0.12, 'sine', 0.55, 45, 0.004); tone(B(), 55, now() + 0.2, 0.14, 'sine', 0.45, 40, 0.004); },
  win: () => {
    duck(0.3, 1.4);
    [523, 659, 784].forEach((f, i) => tone(B(), f, now() + i * 0.12, 0.14, 'triangle', 0.45));
    [1047, 784, 659].forEach((f) => tone(B(), f, now() + 0.36, 0.9, 'triangle', 0.3));
    noise(B(), now() + 0.36, 0.9, 0.08, { type: 'highpass', freq: 6000 });
  },
  applause: () => {
    duck(0.5, 1.4);
    for (let i = 0; i < 40; i++) {
      noise(B(), now() + Math.random() * 1.3, 0.03, 0.12 * Math.random() + 0.04, { type: 'bandpass', freq: 1500 + Math.random() * 2500, q: 2 });
    }
  },
  cardFlip: () => {
    noise(B(), now(), 0.12, 0.35, { type: 'bandpass', freq: 3000, to: 1200, q: 1.5 });
    tone(B(), 1568, now() + 0.1, 0.5, 'sine', 0.18);
  },
  mystery: () => { duck(0.4, 1.2); [262, 311, 370].forEach((f, i) => tone(B(), f, now() + i * 0.15, 1.1, 'sine', 0.18)); },
  vampire: () => {
    duck(0.3, 1.5);
    [[147, 0], [156, 0.05]].forEach(([f, d]) => tone(B(), f, now() + d, 1.6, 'sawtooth', 0.16, f * 0.98, 0.1));
    tone(B(), 1245, now() + 0.2, 0.9, 'sine', 0.08, 1180);
  },
  bell: () => { duck(0.4, 2); [220, 440, 660, 880].forEach((f, i) => tone(B(), f * 1.01 ** i, now(), 2.5, 'sine', 0.2 / (i + 1), null, 0.005)); },
  howl: () => {
    const t = now();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.6);
    o.frequency.exponentialRampToValueAtTime(420, t + 1.8);
    env(g, t, 0.3, 0.18, 1.5);
    o.connect(g).connect(B());
    o.start(t);
    o.stop(t + 2);
  },
  birds: () => {
    for (let i = 0; i < 6; i++) {
      const t = now() + i * 0.18 + Math.random() * 0.08;
      tone(B(), 2400 + Math.random() * 900, t, 0.09, 'sine', 0.15, 3600 + Math.random() * 800);
    }
  },
  gavel: () => {
    [0, 0.22].forEach((d) => {
      tone(B(), 180, now() + d, 0.12, 'triangle', 0.5, 90, 0.002);
      noise(B(), now() + d, 0.06, 0.4, { type: 'bandpass', freq: 1200 });
    });
  },
  wheelTick: () => { noise(B(), now(), 0.025, 0.35, { type: 'bandpass', freq: 3200, q: 3 }); tone(B(), 1100, now(), 0.02, 'square', 0.06); },
  slot: () => {
    let t = 0;
    for (let i = 0; i < 12; i++) { tone(B(), 900 + (i % 3) * 200, now() + t, 0.03, 'square', 0.08); t += 0.04 + i * 0.006; }
    tone(B(), 1568, now() + t + 0.05, 0.4, 'triangle', 0.35);
  },
  clash: () => { // "Taş… Kağıt… Makas!" üç davul + çarpışma
    duck(0.4, 1.2);
    [0, 0.28, 0.56].forEach((d, i) => {
      tone(B(), 120 - i * 10, now() + d, 0.18, 'sine', 0.6, 60, 0.002);
      noise(B(), now() + d, 0.06, 0.25, { type: 'bandpass', freq: 900 });
    });
    noise(B(), now() + 0.84, 0.5, 0.5, { type: 'highpass', freq: 3000, to: 8000 });
  },
  lock: () => { tone(B(), 880, now(), 0.05, 'square', 0.14); tone(B(), 1760, now() + 0.05, 0.12, 'triangle', 0.22); },
  zap: () => { tone(B(), 900, now(), 0.22, 'sawtooth', 0.2, 120); noise(B(), now(), 0.15, 0.15, { type: 'highpass', freq: 3000 }); },
  gong: () => { duck(0.35, 2); [110, 165, 220, 331].forEach((f, i) => tone(B(), f, now(), 2.8, 'sine', 0.3 / (i + 1), f * 0.995, 0.004)); noise(B(), now(), 0.5, 0.25, { freq: 900, to: 100 }); },
  chime: () => { [1319, 1760, 2093].forEach((f, i) => tone(B(), f, now() + i * 0.09, 0.5, 'sine', 0.22)); },
  tada: () => {
    duck(0.25, 2);
    [392, 523, 659, 784].forEach((f, i) => tone(B(), f, now() + i * 0.09, 0.25, 'triangle', 0.4));
    [523, 659, 784, 1047].forEach((f) => tone(B(), f, now() + 0.4, 1.3, 'triangle', 0.26));
    [262, 392].forEach((f) => tone(B(), f, now() + 0.4, 1.3, 'sawtooth', 0.1));
    noise(B(), now() + 0.4, 1.2, 0.18, { type: 'highpass', freq: 5000, to: 9000 });
    for (let i = 0; i < 18; i++) tone(B(), 1500 + Math.random() * 2500, now() + 0.5 + Math.random() * 0.9, 0.08, 'sine', 0.1);
  },
  go: () => { duck(0.3, 0.8); tone(B(), 1047, now(), 0.45, 'square', 0.25); tone(B(), 1568, now(), 0.45, 'square', 0.12); },
};

let silent = false;
export const quietly = (fn) => { silent = true; try { return fn(); } finally { silent = false; } };

Object.assign(SOUNDS, { note: (k = 0) => { const f = [262, 330, 392, 523][k % 4] * 2; tone(B(), f, now(), 0.4, 'triangle', 0.4); tone(B(), f * 2, now(), 0.22, 'sine', 0.1); } });

export function play(name, ...args) {
  if (silent || !sfxOn || !SOUNDS[name] || !ensure()) return;
  const go = () => { try { SOUNDS[name](...args); } catch (e) { console.warn('[ses]', name, e); } };
  if (ctx.state === 'running') return go();
  ctx.resume().then(() => { if (ctx.state === 'running') go(); }).catch(() => {});
}

// Sesleri sırayla çalmak için: later(900, 'reveal')
export const later = (ms, name, ...args) => setTimeout(() => play(name, ...args), ms);

/* ============================ Geri sayım ============================ */

let lastTick = '';
export function countdownTick(endsAt, left) {
  const sec = Math.ceil(left / 1000);
  if (sec < 1 || sec > 5) return;
  const key = `${endsAt}:${sec}`;
  if (key === lastTick) return;
  lastTick = key;
  play(sec === 1 ? 'tickLast' : 'tick');
}

/* ============================ Oyunlara özel sesler ============================ */

const SCENE_OF = {
  'hesabi-kim-oder': 'party', 'tostuna-dovus': 'party', 'tas-kagit-makas': 'party',
  'dogruluk-cesaret': 'party', 'ben-hic': 'party', 'kim-yapar': 'party', 'bu-mu-su-mu': 'party',
  'anlat-bakalim': 'party', 'sessiz-sinema': 'party',
  'bil-bakalim': 'quiz', 'emoji-bilmece': 'quiz', 'tahmin-ustasi': 'quiz', 'isim-sehir': 'quiz',
  'aramizdaki-casus': 'tension', 'frekans': 'quiz', 'renk-sasirtmaca': 'party', 'iki-dogru-bir-yalan': 'tension', 'bosluk-doldur': 'party', 'sayi-bombasi': 'tension', 'cabuk-hesap': 'quiz', 'dogru-yanlis': 'quiz', 'hafiza-sirasi': 'tension', 'kor-labirent': 'tension', 'uyum-testi': 'lobby', 'kod-adi': 'tension', 'ates-su-bilgi': 'quiz', 'baskent-yarisi': 'quiz', 'siradaki-sayi': 'quiz', 'harf-karmasi': 'quiz', 'parmak-yarisi': 'party', 'kelime-avi': 'quiz', 'ciz-tahmin': 'party', 'kurye-yarisi': 'race', 'sumo-tepsisi': 'race', 'mini-golf': 'race', 'mutfak-kaosu': 'party', 'sicak-patates': 'party', 'pizza-kulesi': 'party', 'sosis-bowling': 'race',
};
// Kendi müziğini çalan 3D oyunlarda site sahnesi susar (müzikler üst üste binmesin)
const OWN_MUSIC = new Set(['catisma', 'blok-adasi', 'kurye-yarisi', 'sumo-tepsisi', 'mini-golf', 'mutfak-kaosu', 'pizza-kulesi', 'sosis-bowling', 'sicak-patates', 'hesabi-kim-oder', 'tas-kagit-makas', 'sayi-bombasi', 'hafiza-sirasi', 'tostuna-dovus', 'parmak-yarisi', 'kor-labirent', 'uyum-testi', 'aramizdaki-casus', 'vampir-koylu', 'dogruluk-cesaret', 'kim-yapar', 'anlat-bakalim', 'sessiz-sinema', 'ciz-tahmin', 'kelime-avi', 'iki-dogru-bir-yalan', 'bu-mu-su-mu', 'bil-bakalim', 'emoji-bilmece', 'baskent-yarisi', 'dogru-yanlis', 'tahmin-ustasi', 'harf-karmasi', 'renk-sasirtmaca']);

export function sceneFor(gameId, view) {
  if (!gameId) return 'lobby';
  if (gameId === 'vampir-koylu') {
    return ['night', 'reveal', 'waiting', 'loading'].includes(view?.phase) ? 'night' : 'day';
  }
  if (OWN_MUSIC.has(gameId)) return 'none';
  return SCENE_OF[gameId] ?? 'lobby';
}

const changed = (prev, next, key) => (prev ? prev[key] : undefined) !== next[key];

// Her fonksiyon true dönerse ortak kurallar çalışmaz
const GAME_SOUNDS = {
  'kurye-yarisi'() { return true; }, // 3D yarış kendi seslerini ve müziğini çalar
  'sumo-tepsisi'() { return true; }, // 3D itişme de kendi seslerini çalar
  'mini-golf'() { return true; }, // mini golf da kendi seslerini çalar
  'mutfak-kaosu'() { return true; }, // mutfak kaosu da kendi seslerini çalar
  'sicak-patates'() { return true; }, // sıcak patates kendi seslerini çalar
  'catisma'() { return true; }, // kendi seslerini çalar
  'satranc'() { return true; }, // kendi seslerini çalar
  'tavla'() { return true; }, // kendi seslerini çalar
  'okey'() { return true; }, // kendi seslerini çalar
  'blok-adasi'() { return true; }, // blok adası kendi seslerini ve müziğini çalar
  'pizza-kulesi'() { return true; }, // pizza kulesi kendi seslerini ve müziğini çalar
  'sosis-bowling'() { return true; }, // sosis bowling kendi seslerini ve müziğini çalar
  'vampir-koylu'() { return true; }, // 3D köy meyhanesi kendi seslerini ve müziğini çalar

  'aramizdaki-casus'() { return true; }, // 3D casus masası kendi seslerini ve müziğini çalar

  'sayi-bombasi'() { return true; }, // 3D bomba kendi seslerini ve müziğini çalar

  'tas-kagit-makas'() { return true; }, // 3D masa kendi seslerini ve müziğini çalar

  'hesabi-kim-oder'() { return true; }, // 3D çark kendi seslerini ve müziğini çalar

  'tostuna-dovus'() { return true; }, // 3D tost makinesi kendi seslerini ve müziğini çalar

  'dogruluk-cesaret'() { return true; }, // 3D şişe çevirmece kendi seslerini ve müziğini çalar

  'anlat-bakalim'() { return true; }, // 3D kum saatli masa kendi seslerini ve müziğini çalar
  'sessiz-sinema'() { return true; },

  'isim-sehir'(prev, v) {
    if (v.phase === 'write') {
      if (changed(prev, v, 'phase') || changed(prev, v, 'round')) play('slot');
      else if (v.stoppedBy && !prev?.stoppedBy) play('whistle');
      return true;
    }
    if (v.phase === 'review' && changed(prev, v, 'phase')) { play('drumroll', 0.6); later(650, 'reveal'); return true; }
    return v.phase === 'review';
  },

  'bosluk-doldur'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'round')) return true;
    if (v.phase === 'write') play('bling'); else if (v.phase === 'vote') { play('drumroll', 0.6); later(650, 'whoosh'); }
    else if (v.phase === 'reveal') { play('tada'); later(700, 'applause'); } else return false;
    return true;
  },
  'iki-dogru-bir-yalan'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'turn')) return true;
    if (v.phase === 'write') play('whoosh');
    else if (v.phase === 'vote') { play(v.isAuthor ? 'heartbeat' : 'mystery'); }
    else if (v.phase === 'reveal') {
      play('drumroll', 0.7);
      later(750, v.isAuthor ? (v.fooled > 0 ? 'gong' : 'lose') : v.myVote === v.lieIdx ? 'success' : 'zap');
    } else return false;
    return true;
  },
  'frekans'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'turn')) { if (v.phase === 'guess' && v.myGuess != null && prev?.myGuess == null) play('lock'); return true; }
    if (v.phase === 'clue') play(v.isGuide ? 'turn' : 'whoosh'); else if (v.phase === 'guess') play('bling');
    else if (v.phase === 'reveal') { play('drumroll', 0.9); later(950, 'gong'); } else return false;
    return true;
  },
  'renk-sasirtmaca'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'round')) { if (v.myPick != null && prev?.myPick == null) play('lock'); return true; }
    if (v.phase === 'play') { play('go'); return true; }
    if (v.phase === 'reveal') { play(v.myGain > 0 ? 'coin' : v.myGain < 0 ? 'zap' : 'pop'); return true; }
    return false;
  },
  'bil-bakalim'(prev, v) { return quizLike(prev, v); },
  'emoji-bilmece'(prev, v) { return quizLike(prev, v); },

  'tahmin-ustasi'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'round')) return true;
    if (v.phase === 'answer') { play('bling'); return true; }
    if (v.phase === 'reveal') { play('drumroll', 0.8); later(850, 'reveal'); return true; }
    return false;
  },

  'kim-yapar'() { return true; }, // 3D sandık oylaması kendi seslerini ve müziğini çalar

  'bu-mu-su-mu'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'round')) return true;
    if (v.phase === 'answer') { play('whoosh'); return true; }
    if (v.phase === 'reveal') { play('clash'); return true; }
    return false;
  },

  'ben-hic'(prev, v) {
    if (!changed(prev, v, 'phase') && !changed(prev, v, 'round')) return true;
    if (v.phase === 'answer') { play('cardFlip'); return true; }
    if (v.phase === 'reveal') { play((v.myLives ?? 0) < (prev?.myLives ?? v.myLives) ? 'fail' : 'pop'); return true; }
    return false;
  },
};

function describe(prev, v) { // Anlat Bakalım + Sessiz Sinema
  if (changed(prev, v, 'phase')) {
    if (v.phase === 'ready') { play(v.isDescriber ? 'turn' : 'whoosh'); return true; }
    if (v.phase === 'turn') { play('go'); return true; }
    if (v.phase === 'summary') { play('buzzer'); return true; }
    return false;
  }
  if (v.phase === 'turn') {
    if ((v.gotCount ?? 0) > (prev?.gotCount ?? 0)) play('coin');
    else if (v.isDescriber && prev?.card?.word !== v.card?.word) play('swish');
  }
  return true;
}

Object.assign(GAME_SOUNDS, {
  'cabuk-hesap'(prev, v) { return quizLike(prev, v); },
  'dogru-yanlis'(prev, v) { return quizLike(prev, v); },
  'hafiza-sirasi'() { return true; }, // 3D hafıza cihazı kendi seslerini ve müziğini çalar
});

Object.assign(GAME_SOUNDS, {
  'baskent-yarisi'(prev, v) { return quizLike(prev, v); },
  'siradaki-sayi'(prev, v) { return quizLike(prev, v); },
  'harf-karmasi'(prev, v) { return quizLike(prev, v); },
  'parmak-yarisi'() { return true; }, // 3D drag pisti kendi seslerini ve müziğini çalar
});

Object.assign(GAME_SOUNDS, {
  'kelime-avi'() { return true; }, // 3D harf küpleri kendi seslerini ve müziğini çalar
  'iki-dogru-bir-yalan'() { return true; }, // 3D yalan makinesi masası kendi seslerini ve müziğini çalar
  'bu-mu-su-mu'() { return true; }, // 3D terazi masası kendi seslerini ve müziğini çalar
  'bil-bakalim'() { return true; }, // 3D bilgi yarışması stüdyosu kendi seslerini ve müziğini çalar
  'emoji-bilmece'() { return true; }, // 3D emoji bilmecesi masası kendi seslerini ve müziğini çalar
  'baskent-yarisi'() { return true; }, // 3D dünya turu masası kendi seslerini ve müziğini çalar
  'dogru-yanlis'() { return true; }, // 3D manşet masası kendi seslerini ve müziğini çalar
  'tahmin-ustasi'() { return true; }, // 3D usta atölyesi (şerit metre, sayaç) kendi seslerini ve müziğini çalar
  'harf-karmasi'() { return true; }, // 3D okey masası (harf taşları, kese) kendi seslerini ve müziğini çalar
  'renk-sasirtmaca'() { return true; }, // 3D neon oyun salonu (tabela, atari düğmeleri) kendi seslerini ve müziğini çalar
  'ciz-tahmin'() { return true; }, // 3D çizim tahtası kendi seslerini ve müziğini çalar
});

Object.assign(GAME_SOUNDS, {
  'kor-labirent'() { return true; }, // 3D labirent kendi seslerini ve müziğini çalar
});

Object.assign(GAME_SOUNDS, {
  'ates-su-bilgi'(prev, v) { return quizLike(prev, v); },
  'kod-adi'(prev, v) {
    if (v.phase === 'final') { if (!prev || prev.phase !== 'final') play(v.team === v.winner ? 'tada' : v.team < 0 ? 'win' : 'lose'); return true; }
    if (prev && v.last && JSON.stringify(v.last) !== JSON.stringify(prev.last)) {
      const t = v.last.type, own = t === (v.last.team === 0 ? 'a' : 'b');
      play(t === 'x' ? 'boom' : own ? 'success' : t === 'n' ? 'whoosh' : 'fail');
    } else if (prev && prev.phase !== v.phase) play(v.phase === 'guess' ? 'bling' : 'turn');
    return true;
  },
});

Object.assign(GAME_SOUNDS, {
  'uyum-testi'() { return true; }, // 3D romantik masa kendi seslerini ve müziğini çalar
});

function quizLike(prev, v) { // Bil Bakalım + Emoji Bilmece
  if (!changed(prev, v, 'phase') && !changed(prev, v, 'index')) {
    if (v.phase === 'question' && v.myChoice != null && prev?.myChoice == null) play('vote');
    return true;
  }
  if (v.phase === 'question') { play('bling'); return true; }
  if (v.phase === 'reveal') { play(v.myGain > 0 ? 'success' : 'fail'); return true; }
  return false;
}

// Oyun durumu değişince: önce oyuna özel sesler, yoksa ortak kurallar. Müzik sahnesini de ayarlar.
export function onGameView(gameId, prev, next) {
  if (!next) return;
  setScene(sceneFor(gameId, next));
  try {
    if (GAME_SOUNDS[gameId]?.(prev, next)) return;
  } catch (e) { console.warn('[ses]', gameId, e); }

  if (prev && prev.phase === next.phase) return;
  const p = next.phase;
  if (p === 'final' || p === 'end' || p === 'over') return play('tada');
  const myTurn = next.myTurn || next.isTarget || next.isDescriber;
  const wasMyTurn = prev && (prev.myTurn || prev.isTarget || prev.isDescriber);
  if (myTurn && !wasMyTurn) return play('turn');
  if (prev) play('whoosh');
}

// Çarkıfelek: animasyon sırasında her dilim geçişinde "tık" (CSS eğrisiyle birebir)
export function wheelTicks(rotation, duration, slots) {
  if (!slots) return () => {};
  const seg = 360 / slots;
  const bez = (p1, p2) => (t) => 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3;
  const bx = bez(0.12, 0.1);
  const by = bez(0.7, 1);
  const ease = (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bx(m) < x) lo = m; else hi = m; }
    return by((lo + hi) / 2);
  };
  const start = performance.now();
  let last = 0;
  let raf = 0;
  const frame = (ms) => {
    const x = Math.min(1, (ms - start) / duration);
    const crossed = Math.floor((rotation * ease(x)) / seg);
    if (crossed > last) { last = crossed; play('wheelTick'); }
    if (x < 1) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// Test ve ayar için: tüm efekt adları ve sahneler
export const SOUND_NAMES = Object.keys(SOUNDS);
export const SCENE_NAMES = Object.keys(THEMES);

// Oyunların kendi seslerini üretebilmesi için: ses bağlamı + efekt ve müzik kanalları.
// (Efekt kapalıysa oyun çalmamalı; müzik kanalı kapalıyken zaten sessizdir.)
export function audioKit() {
  const c = ensure();
  if (!c) return null;
  return { ctx: c, bus: sfxBus, music: musicBus, noise: noiseBuf };
}
