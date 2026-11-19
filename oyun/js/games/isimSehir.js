import { esc } from '../ui.js?v=2026-11-19-c';
import { act, btn, hostOr, center, scoreList, countdown } from './_kit.js?v=2026-11-19-c';

let tick = null;
let watch = null;
let drawnRound = null;
let sendTimer = null;
let doneSent = false;

export function destroy() {
  clearInterval(tick);
  clearInterval(watch);
  clearTimeout(sendTimer);
  tick = null;
  watch = null;
  drawnRound = null;
  doneSent = false;
}

const answers = (root) => [...root.querySelectorAll('[data-cat]')].map((el) => el.value);

function flush(root, ctx, done = false) {
  clearTimeout(sendTimer);
  sendTimer = null;
  ctx.send('draft', { answers: answers(root), done });
}

export function render(root, ctx) {
  const v = ctx.view;
  clearInterval(tick);
  clearInterval(watch);
  tick = null;
  watch = null;

  if (v.phase === 'write') {
    // Aynı turda ekranı baştan çizme: yazılan cevaplar ve klavye kaybolmasın
    if (drawnRound !== v.round || !root.querySelector('#isim-write')) {
      if (drawnRound !== v.round) doneSent = false;
      drawnRound = v.round;
      drawWrite(root, ctx, v);
    }
    const banner = root.querySelector('#stop-banner');
    if (banner) {
      banner.hidden = !v.stoppedBy;
      banner.textContent = v.stoppedBy ? `✋ ${v.stoppedBy} bitirdi! Son saniyeler…` : '';
    }
    let sentAtZero = false;
    tick = countdown(root, ctx, v.endsAt, 90 * 1000);
    // Süre bitmek üzereyken son yazılanları hemen gönder
    watch = setInterval(() => {
      if (!sentAtZero && v.amIn && v.endsAt - ctx.serverNow() <= 300) { sentAtZero = true; flush(root, ctx); }
    }, 200);
    return;
  }

  drawnRound = null;
  let body = '';
  if (v.phase === 'loading') body = center('✍️', 'Harf seçiliyor…');

  if (v.phase === 'review') {
    body = `
      <div class="text-center">
        <p class="font-semibold text-ortu/70">${v.round}. tur</p>
        <p class="text-6xl font-extrabold text-limon">${esc(v.letter)}</p>
      </div>
      ${ctx.isHost ? '<p class="text-center text-sm text-ortu/60">Hatalı bir cevaba dokunursan iptal olur (tekrar dokununca geri gelir).</p>' : '<p class="text-center text-sm text-ortu/60">Tek başına doğru: 10 · Aynı cevap: 5 · Boş/yanlış: 0</p>'}
      ${v.rows.map((r) => `
        <div class="rounded-3xl border-4 border-murekkep bg-morarti p-4">
          <div class="flex justify-between gap-3 font-extrabold">
            <span class="truncate">${esc(r.nickname)}</span><span class="shrink-0 text-limon">+${r.total}</span>
          </div>
          <ul class="mt-2 space-y-1">
            ${r.answers.map((a, ci) => `
              <li>
                <button ${ctx.isHost ? act('reject', { id: r.id, ci }) : 'disabled'} class="flex w-full justify-between gap-3 text-left font-semibold">
                  <span class="truncate"><span class="text-ortu/50">${esc(v.categories[ci])}:</span>
                    <span class="${a.rejected ? 'line-through opacity-50' : ''}">${a.text ? esc(a.text) : '—'}</span></span>
                  <span class="shrink-0 tabular-nums ${a.pts === 10 ? 'text-nane' : a.pts === 5 ? 'text-limon' : 'text-ortu/40'}">${a.pts}</span>
                </button>
              </li>`).join('')}
          </ul>
        </div>`).join('')}
      ${hostOr(ctx, `<div class="grid gap-3">${btn('Sıradaki harf', act('next'))}${btn('Oyunu bitir', act('finish'), 'koyu')}</div>`, 'Sıradaki harfi {host} açacak.')}
      ${scoreList(v.scoreboard, { title: 'Toplam puan (bu tur hariç)', limit: 6 })}`;
  }

  if (v.phase === 'final') {
    const top = v.scoreboard[0];
    body = `
      ${center('🏆', top ? `${esc(top.nickname)} kazandı!` : 'Oyun bitti!', `${v.round} harf oynandı.`)}
      ${scoreList(v.scoreboard, { title: 'Son durum' })}
      ${hostOr(ctx, btn('Yeniden oyna', act('restart')), 'Yeni oyunu {host} başlatacak.')}`;
  }

  root.innerHTML = `<div class="space-y-5">${body}</div>`;
}

function drawWrite(root, ctx, v) {
  if (!v.amIn) {
    root.innerHTML = `<div id="isim-write" class="space-y-5">${center('👀', 'Bu turu izliyorsun', 'Sıradaki harfte sen de varsın.')}</div>`;
    return;
  }
  const d = v.myDraft ?? [];
  root.innerHTML = `
    <div id="isim-write" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="font-semibold text-ortu/70">${v.round}. tur</p>
        <span class="text-2xl font-extrabold tabular-nums" data-cd></span>
      </div>
      <div class="h-2.5 overflow-hidden rounded-full bg-morarti"><div data-cd-bar class="h-full rounded-full bg-limon"></div></div>
      <div class="rounded-3xl border-4 border-murekkep bg-limon p-4 text-center text-murekkep shadow-sticker">
        <p class="text-sm font-bold opacity-70">Harf</p>
        <p class="text-6xl font-extrabold">${esc(v.letter)}</p>
      </div>
      <p id="stop-banner" hidden class="pop-in rounded-2xl bg-cay p-3 text-center font-extrabold text-ortu"></p>
      <div class="space-y-3">
        ${v.categories.map((c, i) => `
          <label class="block">
            <span class="text-sm font-bold text-ortu/70">${esc(c)}</span>
            <input data-cat="${i}" value="${esc(d[i] ?? '')}" maxlength="24" autocomplete="off" autocapitalize="words" placeholder="${esc(v.letter)}…"
              class="mt-1 w-full rounded-2xl border-4 border-murekkep bg-ortu px-4 py-3 text-lg font-bold text-murekkep outline-none">
          </label>`).join('')}
      </div>
      <div id="done-wrap">${doneSent ? '<p class="rounded-2xl bg-nane p-3 text-center font-extrabold text-murekkep">Gönderildi ✓ Süre bitene kadar düzeltebilirsin.</p>' : btn('Bitirdim ✋', 'id="done"')}</div>
      <p class="text-center text-sm text-ortu/60">"Bitirdim" dersen herkese 10 saniye kalır.</p>
    </div>`;

  root.querySelectorAll('[data-cat]').forEach((el) => el.addEventListener('input', () => {
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => flush(root, ctx), 500);
  }));
  root.querySelector('#done')?.addEventListener('click', () => {
    if (doneSent) return;
    doneSent = true;
    flush(root, ctx, true);
    root.querySelector('#done-wrap').innerHTML = '<p class="rounded-2xl bg-nane p-3 text-center font-extrabold text-murekkep">Gönderildi ✓ Süre bitene kadar düzeltebilirsin.</p>';
  });
}
