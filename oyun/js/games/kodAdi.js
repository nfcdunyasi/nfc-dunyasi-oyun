import { esc } from '../ui.js?v=2026-11-20-a';
import { act, btn, hostOr, center, scoreList, countdown, keepInput } from './_kit.js?v=2026-11-20-a';

let tick = null;
export function destroy() { clearInterval(tick); tick = null; }
const COL = { a: '#FF6B5A', b: '#4DA3FF', n: '#CFC6B8', x: '#111111' };

function cell(c, i, v, canPick) {
  const t = c.type, base = `min-height:54px;border-radius:12px;padding:4px 2px;font-size:${c.w.length > 7 ? 10 : 12}px;font-weight:800;line-height:1.1;word-break:normal;overflow-wrap:anywhere;`;
  let st;
  if (c.rev) st = `background:${COL[t]};color:${t === 'x' ? '#fff' : '#1C1633'};border:3px solid #120E22;`;
  else if (t) st = `background:#2E2555;color:#FFF6E9;border:3px solid ${t === 'x' ? '#fff' : COL[t]};`;
  else st = 'background:#FFF6E9;color:#1C1633;border:3px solid #120E22;';
  return `<button ${canPick && !c.rev ? act('pick', { i }) : 'disabled'} class="btn" style="${base}${st}">${!c.rev && t === 'x' ? '☠️ ' : ''}${esc(c.w)}</button>`;
}

function draw(root, ctx, v) {
  let b = '';
  if (v.phase === 'loading') b = center('🕵️', 'Takımlar kuruluyor…');
  else {
    const mine = v.team === v.turn, final = v.phase === 'final', canPick = v.phase === 'guess' && v.role === 'op' && mine;
    const chips = `<div class="flex gap-2">${v.teams.map((t, i) => `<div class="flex-1 rounded-2xl border-4 border-murekkep p-2 text-center ${!final && v.turn === i ? 'bg-limon text-murekkep' : 'bg-morarti'}">
      <p class="font-extrabold">${esc(t.name)}${v.team === i ? ' (sen)' : ''}</p><p class="text-sm">${t.left} kelime kaldı</p></div>`).join('')}</div>`;
    const info = `<p class="text-center text-xs text-ortu/60">${v.teams.map((t) => `${esc(t.name)}: ipucucu ${esc(t.spy)}${t.ops.length ? ', tahmin: ' + t.ops.map(esc).join(', ') : ''}`).join(' · ')}</p>`;
    let top = '';
    if (final) top = center('🏆', `${esc(v.teams[v.winner].name)} kazandı!`, v.reason === 'bomba' ? 'Rakip takım siyah kelimeye dokundu!' : 'Tüm kelimeler bulundu.');
    else {
      const timer = `<div class="flex items-center justify-between font-semibold text-ortu/70"><span>${v.phase === 'clue' ? 'İpucu bekleniyor' : 'Tahmin zamanı'}</span><span class="text-xl font-extrabold tabular-nums text-ortu" data-cd></span></div>`;
      if (v.phase === 'clue' && v.role === 'spy' && mine) {
        top = `${timer}<p class="text-center text-lg font-extrabold">İpucucusun! 🕵️</p><p class="text-center text-sm text-ortu/70">Takımına tek kelime ve sayı ver. Tahtadaki bir kelimeyi söyleme.</p>
          <form id="kn-f" class="flex gap-2"><input id="kn-w" maxlength="20" autocomplete="off" placeholder="İpucu (tek kelime)" class="w-full rounded-2xl border-4 border-murekkep bg-ortu px-3 py-3 text-lg font-bold text-murekkep outline-none">
          <input id="kn-n" type="number" min="1" max="9" value="1" class="rounded-2xl border-4 border-murekkep bg-ortu px-2 py-3 text-center text-lg font-bold text-murekkep outline-none" style="width:64px"><button type="submit" class="btn rounded-2xl border-4 border-murekkep bg-limon px-4 text-lg font-extrabold text-murekkep">Ver</button></form><p id="kn-err" class="text-center text-sm font-semibold text-cay"></p>`;
      } else if (v.phase === 'clue') top = `${timer}${center('🤫', mine ? 'İpucucu düşünüyor…' : 'Rakip ipucucu düşünüyor…', mine ? 'Takımının ipucucusunu bekle.' : 'Sıra rakipte.')}`;
      else top = `${timer}<div class="rounded-3xl border-4 border-murekkep bg-ortu p-3 text-center text-murekkep shadow-sticker"><p class="text-sm font-bold opacity-60">${esc(v.teams[v.turn].name)} için ipucu</p>
        <p class="text-3xl font-extrabold">${esc(v.clue.word)} · ${v.clue.n}</p><p class="text-sm font-semibold opacity-70">${v.left} tahmin hakkı kaldı</p></div>
        ${canPick ? `<p class="text-center font-extrabold">Kelimelere dokun!</p>` : `<p class="text-center text-sm text-ortu/70">${v.role === 'spy' && mine ? 'Takımın tahmin ediyor…' : mine ? 'Sıra takımında, ipucucu bekliyor.' : 'Rakip takım tahmin ediyor.'}</p>`}`;
    }
    b = `${chips}${top}<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${v.board.map((c, i) => cell(c, i, v, canPick)).join('')}</div>
      ${canPick && v.canEnd ? btn('Turu bitir', act('endTurn'), 'koyu') : ''}${!final && ctx.isHost ? `<button ${act('skip')} class="w-full py-2 text-sm font-semibold text-ortu/50 underline underline-offset-4">Sırayı geç (takılırsa)</button>` : ''}${info}
      ${final ? `${scoreList(v.scoreboard, { title: 'Kazanılan oyun' })}${hostOr(ctx, btn('Yeniden oyna', act('restart')), 'Yeni oyunu {host} başlatacak.')}` : ''}`;
  }
  root.innerHTML = `<div class="space-y-4">${b}</div>`;
}

export function render(root, ctx) {
  const v = ctx.view;
  clearInterval(tick); tick = null;
  keepInput(root, '#kn-w', () => keepInput(root, '#kn-n', () => draw(root, ctx, v)));
  root.querySelector('#kn-f')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const w = root.querySelector('#kn-w').value.trim(), n = Number(root.querySelector('#kn-n').value), err = root.querySelector('#kn-err');
    if (!/^\S{2,20}$/.test(w)) { err.textContent = 'İpucu tek kelime olmalı (en az 2 harf).'; return; }
    if (v.board.some((c) => !c.rev && c.w.toLocaleLowerCase('tr-TR') === w.toLocaleLowerCase('tr-TR'))) { err.textContent = 'Tahtadaki bir kelimeyi ipucu veremezsin.'; return; }
    if (!(n >= 1 && n <= 9)) { err.textContent = 'Sayı 1 ile 9 arasında olmalı.'; return; }
    ctx.send('clue', { word: w, n });
  });
  if (v.phase === 'clue') tick = countdown(root, ctx, v.endsAt, 120000);
  if (v.phase === 'guess') tick = countdown(root, ctx, v.endsAt, 150000);
}
