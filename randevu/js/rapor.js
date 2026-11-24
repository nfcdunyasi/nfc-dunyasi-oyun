// Randevu Vaktim — NFC Dünyası yönetimi raporları: tüm işletmelerin kazançları ve tek işletmenin istatistiği
// (usta usta ciro, randevu, gelmeyen, iptal; hizmetler, günler, saatler, günlük ciro grafiği).
import * as C from './cekirdek.js?v=2026-11-22-c';
import { api } from './api.js?v=2026-11-22-c';
import { $, esc, TL, ikon, avatar, logo, href, git, yukleniyor, hataKutu } from './rui.js?v=2026-11-22-c';

const yuzde = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const ayGun = (ay) => { const [y, m] = ay.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
export const aySec = (ay, buAy) => `<div class="ay-sec"><button class="dg ikon-d" type="button" data-ay="-1" aria-label="Önceki ay">${ikon('sol')}</button><b>${esc(C.ayAdi(ay))}</b><button class="dg ikon-d" type="button" data-ay="1" aria-label="Sonraki ay" ${ay >= buAy ? 'disabled' : ''}>${ikon('sag')}</button></div>`;

/** Günlük ciro: her gün bir sütun; bugün vurgulu, ileri tarihli (onaylı) günler soluk */
export function gunGrafik(ay, ciro = {}, adet = {}, bugun = '') {
  const n = ayGun(ay), G = Array.from({ length: n }, (_, i) => `${ay}-${String(i + 1).padStart(2, '0')}`);
  const enCok = Math.max(1, ...G.map((g) => ciro[g] || 0)), W = 14, Y = 120;
  if (!G.some((g) => ciro[g] || adet[g])) return '<p class="soluk">Bu ay onaylı randevu yok.</p>';
  return `<div class="rp-grafik"><svg viewBox="0 0 ${n * W} ${Y}" preserveAspectRatio="none" role="img" aria-label="${esc(C.ayAdi(ay))} günlük ciro">
    ${G.map((g, i) => { const v = ciro[g] || 0, h = v ? Math.max(3, (v / enCok) * Y) : 0, sinif = g === bugun ? 'bugun' : g > bugun ? 'ileri' : '';
      return `<g><title>${esc(C.tarihYaz(g, { gun: true }))}: ${TL(v)} · ${adet[g] || 0} randevu</title><rect class="zemin" x="${i * W + 2}" y="0" width="${W - 4}" height="${Y}" rx="2"/>${h ? `<rect class="${sinif}" x="${i * W + 2}" y="${Y - h}" width="${W - 4}" height="${h}" rx="2"/>` : ''}
</g>`; }).join('')}
  </svg><div class="rp-gunler" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${G.map((g, i) => `<span>${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</span>`).join('')}</div><p class="rp-grafik-alt"><span>En yüksek gün: <b>${TL(enCok)}</b></span><span><i class="rp-k"></i>gerçekleşen <i class="rp-k ileri"></i>ileri tarihli</span></p></div>`;
}
const cubuklar = (L, para = false) => {
  const top = Math.max(0, ...L.map((x) => x[1]));
  return L.length ? `<div class="rv-barlar${para ? ' para' : ''}">${L.map(([a, n, ek]) => `<div><span>${esc(a)}</span><i><b style="width:${top && n ? Math.max(2, (n / top) * 100) : 0}%"></b></i><em>${para ? TL(n) : n}${ek ? ` <small>${esc(ek)}</small>` : ''}</em></div>`).join('')}</div>` : '<p class="soluk">Kayıt yok.</p>';
};
const sayilar = (o) => `<div class="sayilar">
  <div class="sayi"><b class="tl">${TL(o.ciro)}</b><span>ciro (onaylı randevular)${o.gelecekCiro ? ` · ${TL(o.gelecekCiro)} ileri tarihli` : ''}</span></div>
  <div class="sayi"><b>${o.onay}</b><span>onaylı randevu${o.bekleyen ? ` · ${o.bekleyen} ödeme onayı bekliyor` : ''}</span></div>
  <div class="sayi"><b class="tl">${TL(o.onOdeme)}</b><span>ön ödeme (müşterilerin ustalara gönderdiği)</span></div>
  <div class="sayi"><b>${o.musteri}</b><span>farklı müşteri · ${o.gelmedi} gelmedi (%${yuzde(o.gelmedi, o.toplam)}) · ${o.iptal} iptal</span></div></div>`;

// ---------------------------------------------------------------- tüm işletmeler: kazançlar
export async function kazancSayfa(el, Y, ay, { yol }) {
  const buAy = C.trBugun(Date.now() + (Y.fark || 0)).slice(0, 7), bugun = C.trBugun(Date.now() + (Y.fark || 0));
  ay = ay && /^\d{4}-\d{2}$/.test(ay) && ay <= buAy ? ay : buAy;
  el.innerHTML = `<div class="bolum-bas"><div><p class="etiket">Tüm işletmeler</p><h1>Kazançlar</h1></div><span class="bosluk"></span>${aySec(ay, buAy)}</div><div id="kzG">${yukleniyor()}</div>`;
  el.querySelectorAll('[data-ay]').forEach((b) => (b.onclick = () => git(yol('kazanc/' + C.ayEkle(ay, +b.dataset.ay)), { degistir: true, kaydirma: false })));
  let v; try { v = await api.kazanc(Y.token, ay); } catch (e) { $('#kzG').innerHTML = hataKutu(e.message); $('#kzG [data-tekrar]').onclick = () => kazancSayfa(el, Y, ay, { yol }); return; }
  if (!$('#kzG')) return;
  const gercek = v.isletmeler.filter((s) => !s.ornek), ornekVar = v.isletmeler.length > gercek.length;
  let ornekDahil = Y.ornekDahil ?? !gercek.length;
  const ciz = () => {
    const L = (ornekDahil ? v.isletmeler : gercek).slice().sort((a, b) => b.ozet.ciro - a.ozet.ciro || b.ozet.toplam - a.ozet.toplam || a.ad.localeCompare(b.ad, 'tr'));
    const T = L.reduce((o, s) => { for (const k of Object.keys(o)) o[k] += s.ozet[k] || 0; return o; }, { toplam: 0, onay: 0, iptal: 0, gelmedi: 0, bekleyen: 0, ciro: 0, gelecekCiro: 0, onOdeme: 0, musteri: 0 });
    const gc = {}, ga = {}, hz = {}, hzN = {};
    for (const s of L) {
      for (const [g, n] of Object.entries(s.gunlukCiro || {})) gc[g] = (gc[g] || 0) + n;
      for (const [g, n] of Object.entries(s.gunluk || {})) ga[g] = (ga[g] || 0) + n;
      for (const [h, n] of Object.entries(s.hizmetCiro || {})) hz[h] = (hz[h] || 0) + n;
      for (const [h, n] of Object.entries(s.hizmetler || {})) hzN[h] = (hzN[h] || 0) + n;
    }
    const U = L.flatMap((s) => s.personel.filter((p) => p.toplam || p.ciro).map((p) => ({ ...p, s }))).sort((a, b) => b.ciro - a.ciro || b.toplam - a.toplam).slice(0, 12);
    $('#kzG').innerHTML = `${ornekVar ? `<label class="rv-satir-sec rp-ornek"><input type="checkbox" data-ornek ${ornekDahil ? 'checked' : ''}><span>Örnek işletmeleri de say (deneme verisi)</span></label>` : ''}
      ${sayilar(T)}
      <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Günlük ciro</h2><span class="bosluk"></span><span class="soluk kucuk-yazi">${L.length} işletme</span></div>${gunGrafik(ay, gc, ga, bugun)}</section>
      <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>İşletmeler</h2><span class="bosluk"></span><span class="soluk kucuk-yazi">cirosu yüksekten düşüğe</span></div>
        ${L.length ? `<div class="rp-tablo-kap"><table class="rp-tablo"><thead><tr><th>İşletme</th><th>Randevu</th><th>Ciro</th><th class="ince">Ort. sepet</th><th class="ince">Ön ödeme</th><th class="ince">Gelmedi</th><th class="ince">İptal</th></tr></thead><tbody>
          ${L.map((s) => `<tr data-git="${yol(`isletme/${s.slug}/istatistik`)}" tabindex="0"><td><span class="rp-isl">${logo(s, 34, '', true)}<span><b>${esc(s.ad)}</b><small>${esc(C.turAd(s.tur))} · ${s.personel.length} kişi${s.ornek ? ' · örnek' : ''}${s.aktif ? '' : ' · kapalı'}</small></span></span></td>
            <td>${s.ozet.onay}${s.ozet.bekleyen ? `<small> +${s.ozet.bekleyen}</small>` : ''}</td><td><b>${TL(s.ozet.ciro)}</b><i class="rp-pay"><b style="width:${yuzde(s.ozet.ciro, T.ciro)}%"></b></i></td>
            <td class="ince">${s.ozet.onay ? TL(Math.round(s.ozet.ciro / s.ozet.onay)) : '–'}</td><td class="ince">${TL(s.ozet.onOdeme)}</td><td class="ince">${s.ozet.gelmedi}</td><td class="ince">${s.ozet.iptal}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="soluk">İşletme yok.</p>'}</section>
      <div class="ozet-izgara" style="margin-top:16px">
        <section class="kart"><div class="kart-bas"><h2>En çok kazanan ustalar</h2></div>
          ${U.length ? U.map((p, i) => `<a class="rv-ekip-satir rp-usta" href="${href(yol(`isletme/${p.s.slug}/istatistik`))}" data-git="${yol(`isletme/${p.s.slug}/istatistik`)}"><em class="rp-sira">${i + 1}</em>${avatar(p, 36)}<span><b>${esc(p.ad)}</b><small>${esc(p.s.ad)} · ${p.onay || 0} randevu${p.gelmedi ? ` · ${p.gelmedi} gelmedi` : ''}</small></span><b class="sayi-yazi">${TL(p.ciro)}</b></a>`).join('') : '<p class="soluk">Bu ay kayıt yok.</p>'}</section>
        <section class="kart"><div class="kart-bas"><h2>En çok kazandıran hizmetler</h2></div>${cubuklar(Object.entries(hz).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h, n]) => [h, n, `${hzN[h] || 0} kez`]), true)}</section>
      </div>
      <p class="kucuk-yazi" style="margin-top:14px">Ciro, ustaların onayladığı randevuların hizmet tutarıdır (ödemeler doğrudan ustalara yapılır; NFC Dünyası'nın aylık ücretleri “Ödemeler” sayfasındadır). Bu ayın rakamları bir dakikada bir yenilenir.</p>`;
    $('#kzG [data-ornek]')?.addEventListener('change', (e) => { ornekDahil = Y.ornekDahil = e.target.checked; ciz(); });
    $('#kzG').querySelectorAll('tr[data-git]').forEach((tr) => { tr.onclick = () => git(tr.dataset.git); tr.onkeydown = (e) => { if (e.key === 'Enter') git(tr.dataset.git); }; });
  };
  ciz();
}

// ---------------------------------------------------------------- tek işletme: istatistik (yönetim → işletme → İstatistik)
export async function isletmeIstat(el, E, Y, ay, yeniAy) {
  const buAy = C.trBugun(Date.now() + (Y.fark || 0)).slice(0, 7), bugun = C.trBugun(Date.now() + (Y.fark || 0));
  ay = ay && ay <= buAy ? ay : buAy;
  el.innerHTML = `<div class="rp-ust">${aySec(ay, buAy)}<span class="bosluk"></span><span class="soluk kucuk-yazi">${ay === buAy ? 'Bu ay · dakikada bir yenilenir' : 'Geçmiş ay'}</span></div><div id="ysG">${yukleniyor()}</div>`;
  el.querySelectorAll('[data-ay]').forEach((b) => (b.onclick = () => yeniAy(C.ayEkle(ay, +b.dataset.ay))));
  let v; try { v = await api.yIstat(Y.token, E.slug, ay); } catch (e) { $('#ysG').innerHTML = hataKutu(e.message); $('#ysG [data-tekrar]').onclick = () => isletmeIstat(el, E, Y, ay, yeniAy); return; }
  if (!$('#ysG')) return;
  const P = E.personel.map((p) => ({ p, ...(v.personel[p.id] || { toplam: 0, onay: 0, ciro: 0, gelmedi: 0, iptal: 0, musteri: 0 }) })).sort((a, b) => b.ciro - a.ciro || b.toplam - a.toplam);
  const G = C.HAFTA.map((g) => [C.GUNLER[g], v.gunler[g]]);
  const S = Object.entries(v.saatler).sort((a, b) => a[0] - b[0]).map(([h, n]) => [`${String(h).padStart(2, '0')}:00`, n]);
  $('#ysG').innerHTML = `${sayilar(v)}
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>${esc(C.cogul(C.personelAd(E.tur)))}</h2><span class="bosluk"></span><span class="soluk kucuk-yazi">kim ne kadar kazandı</span></div>
      <div class="rp-tablo-kap"><table class="rp-tablo"><thead><tr><th>Kişi</th><th>Randevu</th><th>Ciro</th><th class="ince">Ort. sepet</th><th class="ince">Müşteri</th><th class="ince">Gelmedi</th><th class="ince">İptal</th></tr></thead><tbody>
      ${P.map((x) => `<tr><td><span class="rp-isl">${avatar(x.p, 34)}<span><b>${esc(x.p.ad)}</b><small>${esc(x.p.unvan || C.personelAd(E.tur))}${x.p.aktif === false ? ' · kapalı' : ''}</small></span></span></td>
        <td>${x.onay || 0}</td><td><b>${TL(x.ciro)}</b><i class="rp-pay"><b style="width:${yuzde(x.ciro, v.ciro)}%"></b></i></td><td class="ince">${x.onay ? TL(Math.round(x.ciro / x.onay)) : '–'}</td><td class="ince">${x.musteri || 0}</td><td class="ince">${x.gelmedi}</td><td class="ince">${x.iptal}</td></tr>`).join('')}
      </tbody></table></div></section>
    <section class="kart" style="margin-top:16px"><div class="kart-bas"><h2>Günlük ciro</h2></div>${gunGrafik(ay, v.gunlukCiro, v.gunluk, bugun)}</section>
    <div class="ozet-izgara" style="margin-top:16px">
      <section class="kart"><div class="kart-bas"><h2>Hizmetler</h2></div>${cubuklar(Object.entries(v.hizmetCiro || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h, n]) => [h, n, `${v.hizmetler[h] || 0} kez`]), true)}</section>
      <section class="kart"><div class="kart-bas"><h2>Günler</h2></div>${cubuklar(G)}</section>
      <section class="kart"><div class="kart-bas"><h2>Saatler</h2></div>${cubuklar(S)}</section>
      <section class="kart"><div class="kart-bas"><h2>Randevu kaynağı</h2></div>${cubuklar([['Web sitesi', v.web], ['Panelden eklenen', v.panel]])}</section>
    </div>`;
}
