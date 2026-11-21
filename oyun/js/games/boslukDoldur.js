import { esc } from '../ui.js?v=2026-11-21-f';
import { act, btn, hostOr, center, progress, scoreList, countdown, keepInput } from './_kit.js?v=2026-11-21-f';

let tick = null;
export function destroy() { clearInterval(tick); tick = null; }

const prompt = (t) => `<div class="rounded-3xl border-4 border-murekkep bg-ortu p-5 text-center text-murekkep shadow-sticker">
  <p class="text-sm font-bold opacity-60">Boşluğu doldur</p><p class="mt-2 text-2xl font-extrabold leading-snug">${esc(t)}</p></div>`;
const bar = (c = 'bg-limon') => `<div class="flex items-center justify-between"><span class="font-semibold text-ortu/70">Süre</span><span class="text-2xl font-extrabold tabular-nums" data-cd></span></div>
  <div class="h-2.5 overflow-hidden rounded-full bg-morarti"><div data-cd-bar class="h-full rounded-full ${c}"></div></div>`;

function draw(root, ctx, v) {
  let b = '';
  if (v.phase === 'loading') b = center('📝', 'Cümleler hazırlanıyor…');
  if (v.phase === 'write') {
    b = `${bar()}<p class="text-center font-semibold text-ortu/70">${v.round}/${v.rounds}. tur</p>${prompt(v.prompt)}
      ${v.mine ? `${center('✅', 'Cevabın gitti', esc(v.mine))}${progress(v, 'yazdı')}`
        : `<form id="bd-f" class="space-y-3"><input id="bd-t" maxlength="60" autocomplete="off" placeholder="Komik bir şey yaz…"
            class="w-full rounded-2xl border-4 border-murekkep bg-ortu px-4 py-4 text-lg font-bold text-murekkep outline-none">
            ${btn('Gönder', 'type="submit"')}</form>${progress(v, 'yazdı')}`}`;
  }
  if (v.phase === 'vote') {
    b = `${bar('bg-cay')}${prompt(v.prompt)}<p class="text-center text-xl font-extrabold">${v.myVote != null ? 'Oyun kullanıldı ✓' : 'En komik hangisi?'}</p>
      <div class="grid gap-3">${v.options.map((o) => `<button ${act('vote', { idx: o.i })} ${v.myVote != null || o.mine || !v.amIn ? 'disabled' : ''}
        class="btn rounded-2xl border-4 border-murekkep px-4 py-4 text-left text-lg font-extrabold shadow-sticker ${v.myVote === o.i ? 'bg-nane text-murekkep' : 'bg-ortu text-murekkep'} ${o.mine ? 'opacity-50' : ''}">
        ${esc(o.text)}${o.mine ? ' <span class="text-sm font-semibold">(senin)</span>' : ''}</button>`).join('')}</div>${progress(v, 'oyladı')}`;
  }
  if (v.phase === 'reveal') {
    b = `${prompt(v.prompt)}<div class="space-y-3">${v.result.map((r) => `<div class="rounded-3xl border-4 border-murekkep p-4 ${r.winner ? 'bg-limon text-murekkep' : 'bg-morarti'}">
      <p class="text-lg font-extrabold">${r.winner ? '🏆 ' : ''}${esc(r.text)}</p><p class="mt-1 flex justify-between text-sm font-semibold"><span>${esc(r.nickname)}</span><span>${r.votes} oy</span></p></div>`).join('')}</div>
      ${scoreList(v.scoreboard, { limit: 5 })}`;
  }
  if (v.phase === 'final') {
    const top = v.scoreboard[0];
    b = `${center('🏆', top ? `${esc(top.nickname)} kazandı!` : 'Oyun bitti!', `${v.rounds} tur oynandı.`)}${scoreList(v.scoreboard, { title: 'Son durum' })}
      ${hostOr(ctx, btn('Yeniden oyna', act('restart')), 'Yeni oyunu {host} başlatacak.')}`;
  }
  root.innerHTML = `<div class="space-y-5">${b}</div>`;
}

export function render(root, ctx) {
  const v = ctx.view;
  clearInterval(tick); tick = null;
  keepInput(root, '#bd-t', () => draw(root, ctx, v));
  root.querySelector('#bd-f')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = root.querySelector('#bd-t').value.trim();
    if (t) ctx.send('answer', { text: t });
  });
  if (v.phase === 'write') tick = countdown(root, ctx, v.endsAt, 60000);
  if (v.phase === 'vote') tick = countdown(root, ctx, v.endsAt, 30000);
}
