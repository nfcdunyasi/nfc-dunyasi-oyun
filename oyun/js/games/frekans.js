import { esc } from '../ui.js?v=2026-11-19-c';
import { act, btn, hostOr, center, progress, scoreList, countdown, keepInput } from './_kit.js?v=2026-11-19-c';

let tick = null;
export function destroy() { clearInterval(tick); tick = null; }

const bar = (marks = '') => `<div style="position:relative;height:30px;border-radius:15px;border:3px solid #120E22;background:linear-gradient(90deg,#4D8DFF,#FFF6E9,#FF7A66)">${marks}</div>`;
const mark = (n, label, bg) => `<span style="position:absolute;left:${n}%;top:50%;transform:translate(-50%,-50%);min-width:26px;padding:2px 6px;border-radius:999px;background:${bg};color:#120E22;font-size:12px;font-weight:800;text-align:center;border:2px solid #120E22">${label}</span>`;
const ends = (v) => `<div class="flex justify-between text-sm font-extrabold"><span>◀ ${esc(v.left)}</span><span>${esc(v.right)} ▶</span></div>`;
const timer = (c) => `<div class="flex items-center justify-between"><span class="font-semibold text-ortu/70">Süre</span><span class="text-2xl font-extrabold tabular-nums" data-cd></span></div>
  <div class="h-2.5 overflow-hidden rounded-full bg-morarti"><div data-cd-bar class="h-full rounded-full ${c}"></div></div>`;

function draw(root, ctx, v) {
  let b = '';
  if (v.phase === 'loading') b = center('📡', 'Frekans ayarlanıyor…');
  if (v.phase === 'clue') {
    b = `${timer('bg-limon')}<p class="text-center font-semibold text-ortu/70">${v.turn}/${v.turns} · Rehber: ${esc(v.guideName)}</p>${ends(v)}${bar(v.isGuide ? mark(v.target, '⭐', '#FFD23F') : '')}
      ${v.isGuide ? `<form id="fq-f" class="space-y-3"><p class="text-center font-extrabold">⭐ hedefi ipucuyla anlat. Sayı ve ölçekteki kelimeleri söyleme!</p>
        <input id="fq-t" maxlength="50" autocomplete="off" placeholder="Tek bir ipucu yaz…" class="w-full rounded-2xl border-4 border-murekkep bg-ortu px-4 py-4 text-lg font-bold text-murekkep outline-none">${btn('İpucunu ver', 'type="submit"')}</form>`
        : center('🤫', `${esc(v.guideName)} ipucu yazıyor…`, 'Hedef ona görünüyor, sana değil.')}`;
  }
  if (v.phase === 'guess') {
    b = `${timer('bg-cay')}<p class="text-center font-semibold text-ortu/70">${v.turn}/${v.turns} · Rehber: ${esc(v.guideName)}</p>
      <div class="rounded-3xl border-4 border-murekkep bg-ortu p-4 text-center text-murekkep shadow-sticker"><p class="text-sm font-bold opacity-60">İpucu</p><p class="mt-1 text-3xl font-extrabold">${esc(v.clue)}</p></div>${ends(v)}${bar()}
      ${v.isGuide ? center('😎', 'Masa tahmin ediyor', 'Sessiz kal, mimiklerini sakla.')
        : v.myGuess != null ? `${center('🔒', 'Tahminin kilitlendi', `${v.myGuess}`)}`
        : `<input id="fq-s" type="range" min="0" max="100" value="50" style="width:100%;height:36px;accent-color:#FFD23F">${btn('Tahmini kilitle 🔒', 'id="fq-go"')}`}${progress(v, 'tahmin etti')}`;
  }
  if (v.phase === 'reveal') {
    b = `<p class="text-center font-semibold text-ortu/70">${v.turn}/${v.turns} · İpucu: <b>${esc(v.clue)}</b></p>${ends(v)}${bar(mark(v.target, '⭐', '#FFD23F') + v.results.map((r) => mark(r.n, esc(r.nickname.slice(0, 2)), '#FFF6E9')).join(''))}
      <div class="rounded-3xl border-4 border-murekkep bg-morarti p-4"><ul class="space-y-1">${v.results.map((r) => `<li class="flex justify-between font-semibold"><span>${esc(r.nickname)} · ${r.n}</span><span>+${r.pts}</span></li>`).join('')}
      <li class="flex justify-between font-extrabold text-limon"><span>🎙️ ${esc(v.guideName)} (rehber)</span><span>+${v.gain}</span></li></ul></div>${scoreList(v.scoreboard, { limit: 5 })}`;
  }
  if (v.phase === 'final') {
    const top = v.scoreboard[0];
    b = `${center('🏆', top ? `${esc(top.nickname)} kazandı!` : 'Oyun bitti!', 'Herkes aynı frekansta mı?')}${scoreList(v.scoreboard, { title: 'Son durum' })}${hostOr(ctx, btn('Yeniden oyna', act('restart')), 'Yeni oyunu {host} başlatacak.')}`;
  }
  root.innerHTML = `<div class="space-y-5">${b}</div>`;
}

export function render(root, ctx) {
  const v = ctx.view;
  clearInterval(tick); tick = null;
  keepInput(root, '#fq-t, #fq-s', () => draw(root, ctx, v));
  root.querySelector('#fq-f')?.addEventListener('submit', (e) => { e.preventDefault(); const t = root.querySelector('#fq-t').value.trim(); if (t) ctx.send('clue', { text: t }); });
  root.querySelector('#fq-go')?.addEventListener('click', () => ctx.send('guess', { n: Number(root.querySelector('#fq-s').value) }));
  if (v.phase === 'clue') tick = countdown(root, ctx, v.endsAt, 60000);
  if (v.phase === 'guess') tick = countdown(root, ctx, v.endsAt, 40000);
}
