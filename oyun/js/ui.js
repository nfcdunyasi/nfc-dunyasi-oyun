export const $ = (sel, root = document) => root.querySelector(sel);

// Kullanıcıdan gelen HER metin bu fonksiyondan geçer (XSS koruması)
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function fmtTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function vibrate(pattern = 30) {
  try { navigator.vibrate?.(pattern); } catch { /* desteklenmiyor */ }
}

export function toast(text) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast-in rounded-2xl border-4 border-murekkep bg-ortu px-4 py-3 text-center font-bold text-murekkep shadow-sticker';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
