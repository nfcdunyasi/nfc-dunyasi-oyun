import { esc } from '../ui.js?v=2026-11-24-a';
import { act, btn, hostOr, center, card, people, progress } from './_kit.js?v=2026-11-24-a';

export function destroy() {}

const fingers = (n, max) => `<span aria-label="${n} parmak" class="tracking-tight">${'✋'.repeat(n)}<span class="opacity-25">${'✋'.repeat(Math.max(0, max - n))}</span></span>`;

export function render(root, ctx) {
  const v = ctx.view;
  let body = '';

  if (v.phase === 'waiting' || v.phase === 'loading') body = center('🙊', 'En az 2 kişi lazım', 'Oda kodunu paylaş, masadakiler katılsın.');

  if (v.phase === 'answer' || v.phase === 'reveal') {
    body = `
      <p class="text-center text-lg">${fingers(v.myLives, v.maxLives)}</p>
      ${card(`
        <p class="text-lg font-bold opacity-70">Ben hiç…</p>
        <p class="mt-1 text-3xl font-extrabold leading-tight">${esc(v.card)}</p>`, 'ortu', v.phase === 'answer' ? 'pop-in' : '')}`;
  }

  if (v.phase === 'answer') {
    if (v.amIn) {
      const sel = (did) => v.myAnswer === did ? 'ring-4 ring-limon ring-offset-4 ring-offset-gece' : '';
      body += `
        <div class="grid grid-cols-2 gap-3">
          ${btn('Yaptım 🙋', act('answer', { did: true }), 'cay', sel(true))}
          ${btn('Yapmadım 😇', act('answer', { did: false }), 'nane', sel(false))}
        </div>
        <p class="text-center text-sm text-ortu/60">${v.myAnswer === null ? 'Cevabını kimse görmez, herkes cevaplayınca açılır.' : 'Cevabın kaydedildi. İstersen değiştir.'}</p>`;
    } else {
      body += '<p class="rounded-2xl bg-morarti p-4 text-center font-semibold">Parmakların bitti, bu oyunu izliyorsun 👀</p>';
    }
    body += `${progress(v)}${people(v.people)}`;
    if (ctx.isHost && v.answeredCount > 0 && v.answeredCount < v.total) body += btn('Beklemeden aç', act('reveal'), 'koyu');
  }

  if (v.phase === 'reveal') {
    body += v.did.length
      ? `<div class="text-center"><p class="font-semibold text-ortu/70">İtiraf edenler, birer parmak indirin</p>
           <p class="mt-2 text-2xl font-extrabold text-limon">${v.did.map((p) => esc(p.nickname)).join(', ')}</p></div>`
      : center('😇', 'Kimse yapmamış', 'Melek misiniz?');
    body += hostOr(ctx, btn('Sıradaki kart', act('next')), 'Sıradaki kartı {host} açacak.');
  }

  if (v.phase === 'over') {
    body = `${center('🏆', v.winner ? `${esc(v.winner)} masanın en masumu!` : 'Herkes elendi!', 'Parmağı kalan son kişi kazandı.')}
      ${hostOr(ctx, btn('Yeniden başla', act('restart')), 'Yeni oyunu {host} başlatacak.')}`;
  }

  const table = v.lives?.length && v.phase !== 'loading' ? `
    <div class="rounded-3xl border-4 border-murekkep bg-morarti p-4">
      <h3 class="font-extrabold">Kalan parmaklar</h3>
      <ul class="mt-2 space-y-1">
        ${v.lives.map((p) => `<li class="flex justify-between gap-2 font-semibold ${p.lives === 0 ? 'opacity-40 line-through' : ''}"><span class="truncate">${esc(p.nickname)}</span><span class="shrink-0 text-sm">${fingers(p.lives, v.maxLives)}</span></li>`).join('')}
      </ul>
    </div>` : '';

  root.innerHTML = `<div class="space-y-5">${body}${table}</div>`;
}
