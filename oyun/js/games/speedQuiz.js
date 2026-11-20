import { esc } from '../ui.js?v=2026-11-20-a';
import { act, btn, hostOr, center, progress, scoreList, countdown } from './_kit.js?v=2026-11-20-a';

let tick = null;
export function destroy() { clearInterval(tick); tick = null; }

export function render(root, ctx) {
  const v = ctx.view;
  clearInterval(tick); tick = null;
  let b = '';
  if (v.phase === 'loading') b = center('⏱️', 'Hazır mısın?');
  if (v.phase === 'question' || v.phase === 'reveal') {
    const rev = v.phase === 'reveal', two = v.options.length === 2;
    b = `<div class="flex items-center justify-between font-semibold text-ortu/70"><span>${v.index}/${v.questionCount}</span><span class="text-2xl font-extrabold tabular-nums text-ortu" data-cd></span></div>
      <div class="h-2.5 overflow-hidden rounded-full bg-morarti"><div data-cd-bar class="h-full rounded-full bg-limon"></div></div>
      <div class="rounded-3xl border-4 border-murekkep bg-ortu p-6 text-center text-murekkep shadow-sticker"><p class="text-sm font-bold opacity-60">${esc(v.small ?? '')}</p>
        <p class="mt-2 ${v.big.length > 14 ? 'text-2xl' : 'text-5xl'} font-extrabold leading-snug">${esc(v.big)}</p></div>
      <div class="grid ${two ? '' : 'grid-cols-2'} gap-3">${v.options.map((o, i) => `<button ${act('answer', { choice: i })} ${rev || v.myChoice != null || !v.amIn ? 'disabled' : ''}
        class="btn rounded-2xl border-4 border-murekkep px-3 py-5 text-2xl font-extrabold text-murekkep shadow-sticker ${rev && i === v.correctIndex ? 'bg-nane' : rev && i === v.myChoice ? 'bg-cay text-ortu' : v.myChoice === i ? 'bg-limon' : 'bg-ortu'}">${esc(o)}</button>`).join('')}</div>
      ${rev ? `<p class="text-center text-2xl font-extrabold ${v.myGain > 0 ? 'text-nane' : 'text-cay'}">${v.myChoice == null ? 'Süre doldu' : (v.myGain > 0 ? '+' : '') + v.myGain}</p>${scoreList(v.scoreboard, { limit: 4 })}` : progress(v, 'cevapladı')}`;
  }
  if (v.phase === 'final') {
    const top = v.scoreboard[0];
    b = `${center('🏆', top ? `${esc(top.nickname)} kazandı!` : 'Oyun bitti!', `${v.questionCount} soru bitti.`)}${scoreList(v.scoreboard, { title: 'Son durum' })}${hostOr(ctx, btn('Yeniden oyna', act('restart')), 'Yeni oyunu {host} başlatacak.')}`;
  }
  root.innerHTML = `<div class="space-y-5">${b}</div>`;
  if (v.phase === 'question') tick = countdown(root, ctx, v.endsAt, v.ms);
}
