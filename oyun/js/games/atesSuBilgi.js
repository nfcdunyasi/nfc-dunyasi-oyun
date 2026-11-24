import { esc } from '../ui.js?v=2026-11-24-b';
import { act, btn, hostOr, center, progress, scoreList, countdown } from './_kit.js?v=2026-11-24-b';

let tick = null;
export function destroy() { clearInterval(tick); tick = null; }

export function render(root, ctx) {
  const v = ctx.view;
  clearInterval(tick); tick = null;
  const bar = `<div class="flex gap-2">${v.teams.map((t, i) => `<div class="flex-1 rounded-2xl border-4 border-murekkep p-2 text-center ${v.myTeam === i ? 'bg-limon text-murekkep' : 'bg-morarti'}">
    <p class="font-extrabold">${esc(t.name)}${v.myTeam === i ? ' (sen)' : ''}</p><p class="text-2xl font-extrabold tabular-nums">${v.tScore[i]}</p></div>`).join('')}</div>`;
  let b = '';
  if (v.phase === 'loading') b = center('🔥', 'Takımlar kuruluyor…');
  if (v.phase === 'question' || v.phase === 'reveal') {
    const rev = v.phase === 'reveal';
    b = `${bar}<div class="flex items-center justify-between font-semibold text-ortu/70"><span>${v.index}/${v.questionCount}</span><span class="text-2xl font-extrabold tabular-nums text-ortu" data-cd></span></div>
      <div class="h-2.5 overflow-hidden rounded-full bg-morarti"><div data-cd-bar class="h-full rounded-full bg-limon"></div></div>
      <div class="rounded-3xl border-4 border-murekkep bg-ortu p-5 text-center text-murekkep shadow-sticker"><p class="text-xl font-extrabold leading-snug">${esc(v.q)}</p></div>
      <div class="grid gap-3">${v.options.map((o, i) => `<button ${act('answer', { choice: i })} ${rev || v.myChoice != null || !v.amIn ? 'disabled' : ''}
        class="btn rounded-2xl border-4 border-murekkep px-4 py-4 text-left text-lg font-extrabold text-murekkep shadow-sticker ${rev && i === v.correctIndex ? 'bg-nane' : rev && i === v.myChoice ? 'bg-cay text-ortu' : v.myChoice === i ? 'bg-limon' : 'bg-ortu'}">${esc(o)}</button>`).join('')}</div>
      ${rev ? `<div class="rounded-3xl border-4 border-murekkep bg-morarti p-3 text-center font-semibold">${v.teamGain.map((g, i) => `<p>${esc(v.teams[i].name)}: +${g.gain}${g.perfect ? ' 🎯 tam isabet!' : ''}</p>`).join('')}</div>` : progress(v, 'cevapladı')}`;
  }
  if (v.phase === 'final') {
    const w = v.winner;
    b = `${bar}${center(w < 0 ? '🤝' : '🏆', w < 0 ? 'Berabere!' : `${esc(v.teams[w].name)} kazandı!`, 'Takım çalışması kazandı.')}${scoreList(v.scoreboard, { title: 'Oyuncular' })}${hostOr(ctx, btn('Yeniden oyna', act('restart')), 'Yeni oyunu {host} başlatacak.')}`;
  }
  root.innerHTML = `<div class="space-y-4">${b}</div>`;
  if (v.phase === 'question') tick = countdown(root, ctx, v.endsAt, 15000);
}
