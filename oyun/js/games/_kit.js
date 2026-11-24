// Oyun arayüzlerinin ortak parçaları
import { countdownTick } from '../sfx.js?v=2026-11-24-b';
import { esc, fmtTime } from '../ui.js?v=2026-11-24-b';

const TONES = {
  limon: 'bg-limon text-murekkep',
  koyu: 'bg-morarti text-ortu',
  ortu: 'bg-ortu text-murekkep',
  cay: 'bg-cay text-ortu',
  nane: 'bg-nane text-murekkep',
};

// data-game-action niteliği: tıklanınca sunucuya hamle gider
export const act = (action, payload) =>
  `data-game-action="${action}"${payload ? ` data-payload="${esc(JSON.stringify(payload))}"` : ''}`;

export const btn = (label, attrs = '', tone = 'limon', extra = '') =>
  `<button ${attrs} class="btn w-full rounded-2xl border-4 border-murekkep px-5 py-4 text-lg font-extrabold shadow-sticker ${TONES[tone]} ${extra}">${label}</button>`;

export const hostOr = (ctx, html, text) =>
  ctx.isHost ? html : `<p class="text-center text-sm text-ortu/60">${text.replace('{host}', esc(ctx.hostName))}</p>`;

export const center = (emoji, title, text = '') => `
  <div class="space-y-3 py-6 text-center">
    <p class="text-6xl" aria-hidden="true">${emoji}</p>
    <p class="text-2xl font-extrabold leading-tight">${title}</p>
    ${text ? `<p class="text-ortu/70">${text}</p>` : ''}
  </div>`;

export const card = (inner, tone = 'ortu', extra = '') =>
  `<div class="rounded-3xl border-4 border-murekkep p-5 shadow-sticker ${TONES[tone]} ${extra}">${inner}</div>`;

// Kimlerin cevap verdiği (NE verdiği değil)
export const people = (list = []) => `
  <ul class="flex flex-wrap justify-center gap-2">
    ${list.map((p) => `
      <li class="rounded-full border-2 border-murekkep px-3 py-1 text-sm font-bold ${p.done ? 'bg-nane text-murekkep' : 'bg-morarti text-ortu/70'} ${p.connected === false ? 'opacity-40' : ''}">
        ${p.done ? '✓ ' : ''}${esc(p.nickname)}
      </li>`).join('')}
  </ul>`;

export const progress = (v, what = 'cevap verdi') =>
  v.total ? `<p class="text-center text-sm font-semibold text-ortu/60">${v.answeredCount}/${v.total} kişi ${what}</p>` : '';

export function scoreList(list = [], { title = 'Puan durumu', fmt = (s) => `${s.score}`, limit = 12 } = {}) {
  if (!list.length) return '';
  return `
    <div class="rounded-3xl border-4 border-murekkep bg-morarti p-4">
      <h3 class="font-extrabold">${title}</h3>
      <ol class="mt-2 space-y-1">
        ${list.slice(0, limit).map((s, i) => `
          <li class="flex justify-between gap-3 font-semibold">
            <span class="truncate">${i === 0 ? '🏆 ' : `${i + 1}. `}${esc(s.nickname)}</span>
            <span class="shrink-0 tabular-nums">${fmt(s)}</span>
          </li>`).join('')}
      </ol>
    </div>`;
}

export const fmtNum = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(n);

// endsAt'e kadar geri sayan metin/çubuk; interval'i döndürür
export function countdown(root, ctx, endsAt, totalMs) {
  // ses: son 5 saniyede tık tık
  const text = root.querySelector('[data-cd]');
  const bar = root.querySelector('[data-cd-bar]');
  if (!text && !bar) return null;
  const update = () => {
    const left = endsAt - ctx.serverNow();
    countdownTick(endsAt, left);
    if (text) text.textContent = totalMs && totalMs <= 60000 ? Math.max(0, Math.ceil(left / 1000)) : fmtTime(left);
    if (bar && totalMs) bar.style.width = `${Math.max(0, Math.min(100, (left / totalMs) * 100))}%`;
  };
  update();
  return setInterval(update, 200);
}

// Yeniden çizimde yazılan metin ve odak kaybolmasın
export function keepInput(root, selector, draw) {
  const el = root.querySelector(selector);
  const value = el?.value;
  const focused = !!el && document.activeElement === el;
  draw();
  const next = root.querySelector(selector);
  if (next && value !== undefined && value !== '') next.value = value;
  if (next && focused) next.focus();
}
