// Düğün Planla — yazdırılabilir belgeler, Excel (CSV) aktarımı ve QR görseli
import * as C from './cekirdek.js?v=2026-11-22-c';
import { esc, qrSvg, indir, bildir, ONIZLEME } from './ui.js?v=2026-11-22-c';
import { planSvg } from './harita.js?v=2026-11-22-c';
import { qrMatris } from '/yonetim/qr.js?v=2026-11-22-c';

const TARAF = Object.fromEntries(C.TARAFLAR), DURUM = Object.fromEntries(C.DURUMLAR), ETK = Object.fromEntries(C.ETIKETLER);
const harfSira = (a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' });
function bas(d, baslik, ek = '', salon) {
  const b = d.bilgi;
  return `<div class="y-bas"><div><h1>${esc(C.ciftAdi(b))}</h1><p>${esc(baslik)}</p></div><div>${esc(C.tarihYaz(b.tarih, { gun: true }))}${b.saat ? ' · ' + esc(C.saatYaz(b.saat)) : ''}<br>${esc([salon?.ad, d.alanAd].filter(Boolean).join(' · '))}${ek ? '<br>' + ek : ''}</div></div>`;
}
const masalarSirali = (d) => [...d.plan.masalar].sort((a, b) => (a.ozel === 'gelin-damat' ? -1 : 0) - (b.ozel === 'gelin-damat' ? -1 : 0) || a.no - b.no);
const BELGE = {
  masalar(d, o) {
    const dol = C.doluluk(d), s = C.sayilar(d);
    const kutular = masalarSirali(d).map((m) => {
      const t = dol.get(m.id); if (!t?.liste.length) return '';
      const et = Object.entries(t.etiket).map(([k, n]) => `${ETK[k]} (${n})`);
      const not = d.masaEk[m.id]?.not;
      return `<div class="y-masa"><h2><span>${esc(C.masaEtiket(d, m))}</span><small>${t.kisi}${m.ozel === 'gelin-damat' ? '' : '/' + m.kap} kişi</small></h2>${C.masaAdi(d, m) && m.ozel !== 'gelin-damat' ? `<p style="margin:0;color:#555">${esc(C.masaAdi(d, m))}</p>` : ''}<ul>${t.liste.sort((a, b) => harfSira(a.ad, b.ad)).map((x) => `<li><span>${esc(x.ad)}</span><span>${x.kisi}</span></li>`).join('')}</ul>${t.cocuk || et.length || not ? `<p>${[t.cocuk ? t.cocuk + ' çocuk' : '', ...et, not].filter(Boolean).map(esc).join(' · ')}</p>` : ''}</div>`;
    }).join('');
    const ids = new Set(d.plan.masalar.map((m) => m.id));
    const masasiz = d.davetliler.filter((x) => C.aktifMi(x) && (!x.masa || !ids.has(x.masa))).sort((a, b) => harfSira(a.ad, b.ad));
    return `<div class="y-sayfa">${bas(d, 'Masa listesi', `${s.yerlesen} kişi yerleşti · ${s.cocuk} çocuk`, o.salon)}<div class="y-masalar">${kutular || '<p>Henüz masalara kimse yerleşmedi.</p>'}${masasiz.length ? `<div class="y-masa"><h2>Masası olmayanlar<small>${masasiz.reduce((n, x) => n + x.kisi, 0)} kişi</small></h2><ul>${masasiz.map((x) => `<li><span>${esc(x.ad)}</span><span>${x.kisi}</span></li>`).join('')}</ul></div>` : ''}</div></div>`;
  },
  alfabe(d, o) {
    const M = new Map(d.plan.masalar.map((m) => [m.id, m]));
    const L = d.davetliler.filter(C.aktifMi).sort((a, b) => harfSira(a.ad, b.ad));
    let son = '', govde = '';
    for (const x of L) {
      const h = C.basHarf(x.ad); if (h !== son) { govde += `<h3>${esc(h)}</h3>`; son = h; }
      const m = x.masa && M.get(x.masa);
      govde += `<div><span>${esc(x.ad)}${x.kisi > 1 ? ` <small>(${x.kisi})</small>` : ''}</span><b>${m ? (m.ozel === 'gelin-damat' ? 'G & D' : 'Masa ' + m.no) : '—'}</b></div>`;
    }
    return `<div class="y-sayfa">${bas(d, 'Alfabetik davetli listesi', `${L.length} davetiye`, o.salon)}<div class="y-alfabe">${govde || '<p>Liste boş.</p>'}</div></div>`;
  },
  kartlar(d) {
    const b = d.bilgi, alt = `${C.ciftAdi(b)}${b.tarih ? ' · ' + C.tarihYaz(b.tarih) : ''}`;
    const K = masalarSirali(d).map((m) => `<div class="y-kart"><div>${m.ozel === 'gelin-damat' ? `<div class="a" style="font-size:30pt">Gelin &amp; Damat</div>` : `<div class="n">${m.no}</div>${C.masaAdi(d, m) ? `<div class="a">${esc(C.masaAdi(d, m))}</div>` : ''}`}<div class="c">${esc(alt)}</div></div></div>`);
    const S = []; for (let i = 0; i < K.length; i += 4) S.push(`<div class="y-sayfa"><div class="y-kartlar">${K.slice(i, i + 4).join('')}</div></div>`);
    return S.join('') || '<p>Masa yok.</p>';
  },
  plan(d, o) {
    const dol = C.doluluk(d);
    const svg = planSvg(C.genelPlan(d), { bilgi: (m) => ({ alt: m.ozel === 'gelin-damat' ? '' : `${dol.get(m.id)?.kisi || 0} kişi`, sandalye: m.kap, dolu: [] }), izgara: false });
    const adli = masalarSirali(d).filter((m) => C.masaAdi(d, m) && m.ozel !== 'gelin-damat');
    return `<div class="y-sayfa">${bas(d, 'Salon planı', `${d.plan.en} × ${d.plan.boy} m`, o.salon)}<div class="y-plan">${svg}</div>${adli.length ? `<p style="margin-top:4mm;font-size:9.5pt">${adli.map((m) => `<b>${m.no}</b> ${esc(C.masaAdi(d, m))}`).join(' · ')}</p>` : ''}</div>`;
  },
  gorev(d, o) {
    const G = new Map(); for (const g of [...d.gorevler].sort((a, b) => (a.tarih || '9').localeCompare(b.tarih || '9'))) { const k = g.kim || 'Kimse atanmadı'; (G.get(k) || G.set(k, []).get(k)).push(g); }
    const satir = [...G.entries()].sort((a, b) => (a[0] === 'Kimse atanmadı') - (b[0] === 'Kimse atanmadı') || harfSira(a[0], b[0])).map(([k, L]) => L.map((g, i) => `<tr><td>${i ? '' : `<b>${esc(k)}</b>`}</td><td>${esc(g.ad)}${g.not ? `<br><small style="color:#555">${esc(g.not)}</small>` : ''}</td><td>${g.bolum === 'gun' ? 'Düğün günü' : esc(C.tarihYaz(g.tarih, { yil: false }))}</td><td style="text-align:center">${g.bitti ? '✓' : '☐'}</td></tr>`).join('')).join('');
    return `<div class="y-sayfa">${bas(d, 'Görev listesi', '', o.salon)}<table class="y-liste"><thead><tr><th style="width:22%">Kim</th><th>Görev</th><th style="width:16%">Ne zaman</th><th style="width:7%">Bitti</th></tr></thead><tbody>${satir || '<tr><td colspan="4">Görev yok.</td></tr>'}</tbody></table></div>`;
  },
  akis(d, o) {
    const L = [...d.program].sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99'));
    return `<div class="y-sayfa">${bas(d, 'Düğün akışı', '', o.salon)}<table class="y-liste"><thead><tr><th style="width:12%">Saat</th><th>Program</th><th style="width:22%">Sorumlu</th><th style="width:28%">Not</th></tr></thead><tbody>${L.map((p) => `<tr><td style="font:600 13pt var(--sans)">${esc(C.saatYaz(p.saat))}</td><td><b style="font-weight:600">${esc(p.ad)}</b></td><td>${esc(p.kim)}</td><td>${esc(p.not)}</td></tr>`).join('') || '<tr><td colspan="4">Akış boş.</td></tr>'}</tbody></table></div>`;
  },
  poster(d, o) {
    const b = d.bilgi;
    return `<div class="y-sayfa"><div class="y-poster">${o.salon?.tema?.logo ? `<img src="${esc(o.salon.tema.logo)}" alt="" style="max-height:22mm;max-width:70mm;object-fit:contain">` : `<div style="font:600 9pt var(--sans);letter-spacing:.24em;text-transform:uppercase;color:#555">${esc(o.salon?.ad || '')}</div>`}
      <div class="isim">${esc(b.gelin)} &amp; ${esc(b.damat)}</div><div class="bas">Masanızı bulun</div><div class="qr">${qrSvg(o.link, { seviye: 'Q' })}</div>
      <p>Telefonunuzun kamerasıyla kodu okutun, adınızı yazın. Masanız salon planında gösterilsin.</p><p style="font-size:10pt;color:#666">${esc(o.link.replace(/^https:\/\//, ''))}</p></div></div>`;
  },
};
export function yazdir(tur, d, o = {}) {
  if (!BELGE[tur]) return;
  let kok = document.getElementById('yazdir-kok'); if (!kok) { kok = document.createElement('div'); kok.id = 'yazdir-kok'; document.body.appendChild(kok); }
  kok.innerHTML = `<div class="y-belge">${BELGE[tur](d, o)}</div>`;
  document.body.classList.add('yazdiriliyor');
  if (ONIZLEME) { bildir('Önizlemede yazdırma çalışmaz; gerçek sitede yazdırma penceresi açılır.'); return; }
  setTimeout(() => { try { window.print(); } catch { bildir('Bu tarayıcı yazdırmayı desteklemiyor', { hata: true }); } }, 120);
}
export const belgeHtml = (tur, d, o = {}) => BELGE[tur](d, o);

// ---------------------------------------------------------------- CSV
const hucre = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function davetliCsv(d) {
  const M = new Map(d.plan.masalar.map((m) => [m.id, m]));
  const B = ['Ad', 'Kişi', 'Çocuk', 'Taraf', 'Grup', 'Katılım', 'Masa', 'Masa adı', 'Telefon', 'Etiketler', 'Not', 'Davetli yanıtı'];
  const L = [...d.davetliler].sort((a, b) => harfSira(a.ad, b.ad)).map((x) => { const m = x.masa && M.get(x.masa); return [x.ad, x.kisi, x.cocuk, TARAF[x.taraf], x.grup, DURUM[x.durum], m ? (m.ozel === 'gelin-damat' ? 'Gelin & Damat' : m.no) : '', m ? C.masaAdi(d, m) : '', x.tel, x.etiket.map((e) => ETK[e]).join(', '), x.not, x.lcv ? `${x.lcv.durum === 'gelmiyor' ? 'Katılmayacak' : x.lcv.kisi + ' kişi geliyor'}${x.lcv.not ? ' – ' + x.lcv.not : ''}` : '']; });
  return '﻿' + [B, ...L].map((r) => r.map(hucre).join(';')).join('\r\n');
}
function csvSatirlar(m) {
  const ilk = m.split(/\r?\n/).find((x) => x.trim()) || '';
  const ayr = [';', '\t', ','].map((c) => [c, ilk.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const R = []; let r = [], h = '', t = false;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (t) { if (c === '"' && m[i + 1] === '"') { h += '"'; i++; } else if (c === '"') t = false; else h += c; continue; }
    if (c === '"') t = true; else if (c === ayr) { r.push(h); h = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && m[i + 1] === '\n') i++; r.push(h); R.push(r); r = []; h = ''; } else h += c;
  }
  if (h || r.length) { r.push(h); R.push(r); }
  return R.map((x) => x.map((y) => y.trim())).filter((x) => x.some(Boolean));
}
export function csvOku(m) {
  m = m.replace(/^﻿/, '');
  const R = csvSatirlar(m); if (!R.length) return [];
  const n = (s) => C.trNorm(s);
  const bul = (...a) => R[0].findIndex((h) => a.some((k) => n(h) === k || n(h).startsWith(k)));
  let ad = bul('ad soyad', 'adi soyadi', 'isim', 'ad', 'name', 'davetli'), kisi = bul('kisi', 'sayi', 'adet', 'count'), cocuk = bul('cocuk'), taraf = bul('taraf', 'side'), grup = bul('grup', 'kategori', 'group'), durum = bul('katilim', 'durum', 'lcv'), tel = bul('telefon', 'tel', 'gsm', 'cep'), not = bul('not', 'aciklama');
  let veri = R.slice(1);
  if (ad < 0) { ad = 0; if (R[0].length > 1 && /^\d{1,2}$/.test(R[0][1])) kisi = 1; veri = R; }
  if (veri.length > 2500) throw new Error('Dosyada 2500’den fazla satır var.');
  const T = (v) => { v = n(v); return /^(g|gelin|kiz|kiz tarafi|gelin tarafi)$/.test(v) || v.startsWith('gelin') ? 'gelin' : /^(d|damat|erkek|erkek tarafi|damat tarafi)$/.test(v) || v.startsWith('damat') ? 'damat' : 'ortak'; };
  const Du = (v) => { v = n(v); return /^(evet|geliyor|gelecek|katilacak|var|e|1|x)/.test(v) ? 'geliyor' : /^(hayir|gelmiyor|gelmeyecek|katilmayacak|yok|h|0)/.test(v) ? 'gelmiyor' : 'bekliyor'; };
  return veri.map((r) => ({ ad: C.str(r[ad], 80), kisi: kisi >= 0 ? C.tamSayi(r[kisi], 1, 30, 1) : 1, cocuk: cocuk >= 0 ? C.tamSayi(r[cocuk], 0, 29, 0) : 0, taraf: taraf >= 0 ? T(r[taraf]) : 'ortak', grup: grup >= 0 ? C.str(r[grup], 30) : '', durum: durum >= 0 ? Du(r[durum]) : 'bekliyor', tel: tel >= 0 ? C.str(r[tel], 24) : '', not: not >= 0 ? C.metin(r[not], 400) : '' })).filter((x) => x.ad);
}

// ---------------------------------------------------------------- QR görseli
export function qrPng(metin, ad, baslik = '') {
  const m = qrMatris(metin, 'Q'), n = m.length, k = Math.floor(960 / (n + 8)), kenar = 4 * k, w = (n + 8) * k, alt = baslik ? 130 : 0;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = w + alt;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#111';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) g.fillRect(kenar + x * k, kenar + y * k, k, k);
  if (baslik) { g.font = '700 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(baslik, w / 2, w + 62); g.font = '500 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif'; g.fillStyle = '#666'; g.fillText(metin.replace(/^https:\/\//, ''), w / 2, w + 108); }
  cv.toBlob((b) => b && indir(ad, b, 'image/png'), 'image/png');
}
