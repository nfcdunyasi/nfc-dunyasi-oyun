// Çatışma — birinci şahıs takım savaşı (NFC Dünyası Oyun)
// Telefon için tasarlandı: sol kol yürüme, sağ taraf nişan, ateş / dürbün / şarjör / zıpla / eğil, oto ateş ve nişan yardımı.
// Hareket ve nişan istemcide; can, isabet doğrulama, skor ve botlar sunucuda. Harita ve silah tanımları sunucuyla ortak (GEN).
import { _eng } from './kuryeYarisi.js?v=2026-11-21-a';
import { _masa } from './masa3d.js?v=2026-11-21-a';
import * as sfx from '../sfx.js?v=2026-11-21-a';
const { limb, EmoteUI, Snd, esc, pcol, vibrate, medal, injectStyle, clamp, lerp, damp, hexRGB, C, shade, M, makeGL, MB, freeMesh, drawMesh, drawSky, drawDynamic, emitSoft, useProg, shadowBegin, shadowCast, shadowEnd, shadowSet, aoOn, detailOn, postFX, norm3, brandInfo, ONE3, autoRes, podiumHTML } = _eng();
const { styleOf } = _masa();

// ==GEN== (w/ct_gen.js'ten kopyalanır: sunucu ve istemcide birebir aynı olmalı)
// Haritalar: x doğu-batı, z kuzey-güney, y yukarı. Kırmızı üs z<0, Mavi üs z>0. Her harita merkeze göre nokta simetrik.
// Kutu: [x0, y0, z0, x1, y1, z1, tür] — tür: 0 çevre duvarı, 1 duvar, 2 sandık, 3 konteyner, 4 bina, 5 kum torbası, 6 platform, 7 üs duvarı,
//   8 depo duvarı, 9 çatı, 10 raf, 11 sütun, 12 yıkık duvar, 13 makine, 14 bant, 15 tank, 16 variller, 17 kar yığını, 18 basamak, 19 devrik sütun.
//   Doğma: [x, z, yön]. Yerdeki kutular [x, z, tür]: 0 sağlık (+50 can), 1 cephane (şarjörler dolar, +1 bomba)
const CT_MAPS = [];
CT_MAPS.push((() => {   // 0: Kasaba — üç şeritli sahil kasabası
  const L = [];
  const B = (cx, cz, w, d, h, t, y0 = 0) => L.push([cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, t]);
  const S = (cx, cz, w, d, h, t, y0 = 0) => { B(cx, cz, w, d, h, t, y0); B(-cx, -cz, w, d, h, t, y0); };
  // çevre
  B(0, -32.5, 46, 1, 5, 0); B(0, 32.5, 46, 1, 5, 0); B(-22.5, 0, 1, 66, 5, 0); B(22.5, 0, 1, 66, 5, 0);
  // üs ön duvarı (z = ∓22): üç çıkış — sol, orta, sağ
  S(-19.75, -22, 4.5, 0.6, 3.6, 7); S(-8, -22, 10, 0.6, 3.6, 7); S(8, -22, 10, 0.6, 3.6, 7); S(19.75, -22, 4.5, 0.6, 3.6, 7);
  // üs içi siperler
  S(-6, -27, 2, 2, 1.25, 2); S(7, -28.2, 1.5, 1.5, 1.5, 2); S(14.5, -26, 3.2, 0.9, 1.1, 5);
  // şerit ayırıcı duvarlar (x = ∓9): üsse yakın ve ortada geçit var
  S(-9, -12.5, 0.6, 11, 3.6, 1); S(9, -12.5, 0.6, 11, 3.6, 1);
  // orta şerit siperleri
  S(0, -14.5, 3, 3, 1.3, 2); S(0.5, -14.2, 1.5, 1.5, 1.2, 2, 1.3); S(-4.6, -9, 4, 0.9, 1.1, 5); S(4.8, -10.6, 0.9, 4, 1.1, 5); S(-6.3, -17.5, 1.6, 1.6, 1.4, 2);
  // merkez: iki konteyner (üs-üs görüş hattını keser), üstte bir tane daha
  B(0, 0, 12.2, 2.6, 2.6, 3); B(-2.2, 0, 6.1, 2.5, 2.5, 3, 2.6);
  S(7.6, -2.6, 1.6, 1.6, 1.3, 2); S(-3.5, -3.6, 3.4, 0.9, 1.1, 5);
  // sol şerit "Sokak": bina + siperler
  S(-18, -12, 5, 9, 5.2, 4); S(-11, -4.6, 1.7, 1.7, 1.4, 2); S(-14.2, -1.2, 3.2, 0.9, 1.1, 5); S(-20, -3, 2, 2, 1.25, 2); S(-12.5, -18.5, 2.6, 0.9, 1.1, 5);
  // sağ şerit "Avlu": konteynerler + platform
  S(15, -13.2, 2.6, 6.1, 2.6, 3); S(19.2, -6, 5, 2.6, 2.6, 3); S(12, -17.6, 1.5, 1.5, 1.5, 2); S(12.3, -4.2, 2, 2, 1.25, 2);
  S(19, -18, 5, 5, 1.25, 6); S(15.9, -18.6, 1.2, 2.2, 0.62, 6);
  const A = [[-10, -27.5], [-4, -29.5], [0, -27.5], [4, -29.5], [10, -27.5], [-15, -29.5], [16, -29.6], [-18, -26], [19, -28]];
  return { n: 'Kasaba', hx: 22, hz: 32, boxes: L, spawn: [A.map(([x, z]) => [x, z, 0]), A.map(([x, z]) => [-x, -z, Math.PI])],
    ffa: [[-10, -27.5, 0], [10, -27.5, 0], [10, 27.5, 3.14], [-10, 27.5, 3.14], [-20, -1, 1.57], [20, 1, -1.57], [-13, 16, 3.14], [13, -16, 0], [-6.5, 12, 3.14], [6.5, -12, 0], [14.5, 12, -1.57], [-14.5, -12, 1.57], [0, 5, 3.14], [0, -5, 0]],
    pick: [[-13, 8, 0], [13, -8, 0], [0, 5, 0], [0, -5, 0], [-10, 0, 1], [10, 0, 1], [6, 20, 1], [-6, -20, 1], [17, 2, 0], [-17, -2, 0]] };
})());
CT_MAPS.push((() => {   // 1: Liman — konteyner sokakları, içinden geçilen depo, gün batımı
  const L = [];
  const B = (cx, cz, w, d, h, t, y0 = 0) => L.push([cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, t]);
  const S = (cx, cz, w, d, h, t, y0 = 0) => { B(cx, cz, w, d, h, t, y0); B(-cx, -cz, w, d, h, t, y0); };
  // çevre
  B(0, -30.5, 50, 1, 5, 0); B(0, 30.5, 50, 1, 5, 0); B(-24.5, 0, 1, 62, 5, 0); B(24.5, 0, 1, 62, 5, 0);
  // üs önü: konteyner dizisi, aralarda çıkışlar ve alçak siperler
  S(-17, -21, 6.1, 2.6, 2.6, 3); S(0, -21, 6.1, 2.6, 2.6, 3); S(17, -21, 6.1, 2.6, 2.6, 3);
  S(-8.5, -18.6, 3.4, 0.9, 1.1, 5); S(8.5, -19.4, 3.4, 0.9, 1.1, 5);
  // üs içi siperler
  S(-8, -27.5, 2, 2, 1.25, 2); S(9, -28, 1.5, 1.5, 1.5, 2); S(17, -26, 3.2, 0.9, 1.1, 5);
  // batı konteyner sahası: iki sıra konteyner, aralarında ara sokak; üstte ikinci kat
  S(-20.7, -12, 2.6, 6.1, 2.6, 3); S(-20.7, -12, 2.6, 6.1, 2.6, 3, 2.6);
  S(-15, -13, 2.6, 6.1, 2.6, 3);
  S(-11.5, -7.5, 1.6, 1.6, 1.4, 2);
  // doğu: keskin nişancı rampası (platform + basamak) ve yanında beton duvar
  S(20.5, -10, 6, 8, 1.25, 6); S(16.9, -12.5, 1.2, 2.2, 0.62, 6);
  S(22.8, -1, 2.4, 1, 3.6, 1);
  // orta güney siperleri
  S(-3, -11, 1.6, 1.6, 1.4, 2); S(5, -13, 4, 0.9, 1.1, 5); S(0, -16, 3, 3, 1.3, 2); S(0.5, -15.7, 1.5, 1.5, 1.2, 2, 1.3);
  S(10.5, -8, 2.6, 6.1, 2.6, 3);
  // kenarlar: üs-üs görüşünü kesen konteyner
  S(-15.5, 1.5, 6.1, 2.6, 2.6, 3); S(10.25, 1.5, 6.1, 2.6, 2.6, 3); S(-21, -2.5, 2, 2, 1.25, 2);
  // merkez: içinden geçilen depo (4 m kapılar), çatı ve içerde raf + sandıklar
  S(-4.5, -5, 5, 0.4, 4, 8); S(4.5, -5, 5, 0.4, 4, 8);
  S(-7, -3.5, 0.4, 3, 4, 8); S(-7, 3.5, 0.4, 3, 4, 8);
  B(0, 0, 14.8, 10.8, 0.3, 9, 4);
  B(0, 0, 3, 1, 2.4, 10);
  S(-4.6, -3, 1.4, 1.4, 1.4, 2); S(4.2, -2.6, 1.2, 1.2, 1.1, 2);
  const A = [[-20, -27.5], [-14, -28.5], [-5, -27], [0, -28.5], [5, -27], [13, -28.5], [20, -27.5], [-11, -25], [11, -25]];
  return { n: 'Liman', hx: 24, hz: 30, boxes: L, spawn: [A.map(([x, z]) => [x, z, 0]), A.map(([x, z]) => [-x, -z, Math.PI])],
    ffa: [[-20, -27.5, 0], [20, 27.5, 3.14], [13, -28.5, 0], [-13, 28.5, 3.14], [-22.8, -6, 0], [22.8, 6, 3.14], [-17.8, -15, 0], [17.8, 15, 3.14], [10, -2, -1.57], [-10, 2, 1.57], [0, -2.5, 3.14], [0, 2.5, 0], [21, -17, 0], [-21, 17, 3.14]],
    pick: [[0, -3.2, 0], [0, 3.2, 0], [-17.8, -12, 1], [17.8, 12, 1], [21, -16.5, 0], [-21, 16.5, 0], [10, -2.5, 1], [-10, 2.5, 1], [-10, -14, 0], [10, 14, 0]] };
})());
CT_MAPS.push((() => {   // 2: Fabrika — gece; ortada makineli üretim salonu, yanlarda yükleme avlusu ve kazan dairesi
  const L = [];
  const B = (cx, cz, w, d, h, t, y0 = 0) => L.push([cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, t]);
  const S = (cx, cz, w, d, h, t, y0 = 0) => { B(cx, cz, w, d, h, t, y0); B(-cx, -cz, w, d, h, t, y0); };
  // çevre
  B(0, -31.5, 48, 1, 5, 0); B(0, 31.5, 48, 1, 5, 0); B(-23.5, 0, 1, 64, 5, 0); B(23.5, 0, 1, 64, 5, 0);
  // üs önü (z = ∓24): üç kapı
  S(-20, -24, 6, 0.6, 3.6, 7); S(-8, -24, 10, 0.6, 3.6, 7); S(8, -24, 10, 0.6, 3.6, 7); S(20, -24, 6, 0.6, 3.6, 7);
  // üs içi
  S(-6, -27, 2, 2, 1.25, 2); S(7, -28.2, 1.5, 1.5, 1.5, 2); S(14.5, -26.8, 3.2, 0.9, 1.1, 5);
  // üretim salonu: tuğla duvarlar, kuzey-güneyde ikişer, doğu-batıda birer kapı; çatı
  S(-7.6, -7, 3.2, 0.4, 4.4, 8); S(0, -7, 4, 0.4, 4.4, 8); S(7.6, -7, 3.2, 0.4, 4.4, 8);
  S(-9, -4.6, 0.4, 5.2, 4.4, 8); S(-9, 4.6, 0.4, 5.2, 4.4, 8);
  B(0, 0, 18.4, 14.4, 0.3, 9, 4.4);
  // salonun içi: ortada pres, yanlarda makine, bel hizasında bant, köşede sandık
  B(0, 0, 3.4, 3.4, 2.8, 13);
  S(4.2, -4.2, 3.2, 1.6, 2.1, 13);
  S(-5.2, -2.2, 5.2, 1.1, 1.0, 14);
  S(-6.8, -5.4, 1.3, 1.3, 1.3, 2);
  // orta avlu siperleri
  S(0, -15.5, 3, 3, 1.3, 2); S(0.4, -15.2, 1.5, 1.5, 1.2, 2, 1.3); S(-5.2, -11, 4, 0.9, 1.1, 5); S(5.4, -19, 0.9, 3.6, 1.1, 5); S(-6.4, -19.8, 1.4, 1.4, 1.1, 16);
  // şerit ayırıcı tuğla duvarlar
  S(-9.6, -16.5, 0.6, 6, 3.4, 1); S(9.6, -16.5, 0.6, 6, 3.4, 1);
  // batı "Yükleme avlusu": tır dorsesi (konteyner), palet, bariyer
  S(-16, -14.5, 2.6, 7, 2.6, 3); S(-12.2, -17.5, 1.6, 1.6, 1.4, 2); S(-12.5, -10.5, 3.4, 0.9, 1.1, 5); S(-21.2, -8.8, 2, 2, 1.25, 2);
  // doğu "Kazan dairesi": iki tank, iskele ve basamağı, variller
  S(18.6, -16.5, 3.6, 3.6, 4.6, 15); S(12.6, -13, 2.4, 2.4, 3.2, 15);
  S(19.6, -9.5, 6, 4.4, 1.25, 6); S(15.9, -10, 1.2, 2.2, 0.62, 6);
  S(13, -19.5, 1.4, 1.4, 1.1, 16);
  const A = [[-10, -27.5], [-4, -29.5], [0, -27.5], [4, -29.5], [10, -27.5], [-15, -29.5], [16, -29.6], [-18, -26.5], [19, -28]];
  return { n: 'Fabrika', hx: 23, hz: 31, boxes: L, spawn: [A.map(([x, z]) => [x, z, 0]), A.map(([x, z]) => [-x, -z, Math.PI])],
    ffa: [[-10, -27.5, 0], [10, -27.5, 0], [10, 27.5, 3.14], [-10, 27.5, 3.14], [-21, -3, 1.57], [21, 3, -1.57], [-14, -21, 0], [14, 21, 3.14], [-5, -9.2, 0], [5, 9.2, 3.14], [-7.5, 0, 1.57], [7.5, 0, -1.57], [16, -4, -1.57], [-16, 4, 1.57]],
    pick: [[0, -5.2, 0], [0, 5.2, 0], [-21, -12, 1], [21, 12, 1], [12.6, -9.6, 0], [-12.6, 9.6, 0], [-4, -15, 1], [4, 15, 1], [-11.5, 0, 1], [11.5, 0, 1]] };
})());
CT_MAPS.push((() => {   // 3: Karlı Üs — kış; ortada telsiz istasyonu, batıda kütük kulübeler, doğuda yakıt deposu
  const L = [];
  const B = (cx, cz, w, d, h, t, y0 = 0) => L.push([cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, t]);
  const S = (cx, cz, w, d, h, t, y0 = 0) => { B(cx, cz, w, d, h, t, y0); B(-cx, -cz, w, d, h, t, y0); };
  // çevre
  B(0, -32.5, 52, 1, 5, 0); B(0, 32.5, 52, 1, 5, 0); B(-25.5, 0, 1, 66, 5, 0); B(25.5, 0, 1, 66, 5, 0);
  // üs önü (z = ∓24): üç çıkış
  S(-22, -24, 6, 0.6, 3.2, 7); S(-8.5, -24, 11, 0.6, 3.2, 7); S(8.5, -24, 11, 0.6, 3.2, 7); S(22, -24, 6, 0.6, 3.2, 7);
  // üs içi: köşede koğuş, sandık, kum torbası
  S(-21, -29, 6, 4, 3, 4); S(7, -28, 1.5, 1.5, 1.5, 2); S(15, -27, 3.2, 0.9, 1.1, 5);
  // merkez: telsiz istasyonu ve çevresi
  B(0, 0, 8, 5, 3.4, 4);
  S(-7.5, -4.5, 3.6, 1.2, 1.1, 17); S(6.2, -3.8, 1.6, 1.6, 1.4, 2);
  // donmuş gölet tarafı
  S(0, -14, 4, 1.2, 1.1, 17); S(-5, -18.5, 1.6, 1.6, 1.4, 2); S(4.5, -11.5, 3.2, 0.9, 1.1, 5); S(-6.5, -9.5, 1.2, 1.2, 1.1, 16);
  S(8.8, -8.6, 3.4, 2.6, 2.6, 4);
  // batı "Kulübeler"
  S(-17, -15, 5, 7, 3.2, 4); S(-12, -19, 2.4, 1.2, 1.2, 2); S(-22, -9, 3, 1.2, 1.1, 17);
  // doğu "Yakıt deposu": tanklar, askerî konteyner, variller, gözetleme iskelesi
  S(19.5, -16, 3.2, 3.2, 3.6, 15); S(15, -12, 2.4, 2.4, 2.8, 15); S(21.5, -8.5, 2.6, 6.1, 2.6, 3); S(13.5, -19, 1.4, 1.4, 1.1, 16);
  S(13.5, -6.5, 4, 4, 1.25, 6); S(13.5, -9.1, 2.2, 1.2, 0.62, 6);
  // şerit ayırıcı beton duvarlar
  S(-10.5, -13, 0.6, 7, 3, 1);
  const A = [[-10, -27.5], [-4, -29.5], [0, -27.5], [4, -29.5], [10, -27.5], [-14, -26.5], [16, -29.5], [-16, -30.5], [20, -28]];
  return { n: 'Karlı Üs', hx: 25, hz: 32, boxes: L, spawn: [A.map(([x, z]) => [x, z, 0]), A.map(([x, z]) => [-x, -z, Math.PI])],
    ffa: [[-10, -27.5, 0], [10, -27.5, 0], [10, 27.5, 3.14], [-10, 27.5, 3.14], [-22, -3, 1.57], [22, 3, -1.57], [-13, -21, 0], [13, 21, 3.14], [-6, -7, 0], [6, 7, 3.14], [-12.5, 0, 1.57], [12.5, 0, -1.57], [17, -3, -1.57], [-17, 3, 1.57]],
    pick: [[-6, 0, 0], [6, 0, 0], [-21, -13, 1], [21, 13, 1], [17, -3, 0], [-17, 3, 0], [0, -20, 1], [0, 20, 1], [-12.5, -6, 1], [12.5, 6, 1]] };
})());
CT_MAPS.push((() => {   // 4: Antik Kent — yaz öğlesi; ortada tapınak kaidesi, batıda sütunlu agora, doğuda tiyatro basamakları
  const L = [];
  const B = (cx, cz, w, d, h, t, y0 = 0) => L.push([cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, t]);
  const S = (cx, cz, w, d, h, t, y0 = 0) => { B(cx, cz, w, d, h, t, y0); B(-cx, -cz, w, d, h, t, y0); };
  // çevre: eski sur
  B(0, -31.5, 48, 1, 5, 0); B(0, 31.5, 48, 1, 5, 0); B(-23.5, 0, 1, 64, 5, 0); B(23.5, 0, 1, 64, 5, 0);
  // üs önü (z = ∓24): üç geçit
  S(-20, -24, 6, 0.8, 3.4, 7); S(-8, -24, 10, 0.8, 3.4, 7); S(8, -24, 10, 0.8, 3.4, 7); S(20, -24, 6, 0.8, 3.4, 7);
  // üs içi
  S(-6, -27.2, 2, 2, 1.25, 2); S(7, -28.2, 1.4, 1.4, 1.6, 11); S(14.5, -27, 0.9, 0.9, 2.4, 11);
  // tapınak: kaide, iki yanda basamak, üstte dört sütun ve iki iç duvar
  B(0, 0, 10, 8, 1.25, 6); S(0, -4.6, 6, 1.2, 0.62, 6);
  S(-4.2, -3.2, 0.9, 0.9, 3.4, 11, 1.25); S(4.2, -3.2, 0.9, 0.9, 3.4, 11, 1.25);
  S(0, -1.6, 4.4, 0.6, 2.2, 12, 1.25);
  // sütunlu cadde (orta)
  S(-5.5, -20, 0.9, 0.9, 3.4, 11); S(-5.5, -16, 0.9, 0.9, 2.2, 11); S(-5.5, -12, 0.9, 0.9, 3.4, 11); S(5.5, -18, 0.9, 0.9, 3.4, 11); S(5.5, -14, 0.9, 0.9, 1.6, 11); S(5.5, -10, 0.9, 0.9, 3.4, 11);
  S(0, -14.5, 3.4, 1, 1, 19); S(-2, -9.5, 1.5, 1.5, 1.6, 2);
  // batı "Agora": sütun dizisi, arkada yıkık duvar, devrik sütun
  S(-12.5, -20, 0.9, 0.9, 3.4, 11); S(-12.5, -16.5, 0.9, 0.9, 3.4, 11); S(-12.5, -8.5, 0.9, 0.9, 3.4, 11);
  S(-15.5, -12, 5, 0.8, 3, 12); S(-18, -9.6, 0.8, 4, 2.6, 12); S(-20.5, -15.5, 1, 3.6, 1, 19); S(-21.5, -20.5, 1.8, 1.8, 1.25, 2);
  // doğu "Tiyatro": üç sıra basamak (her biri 0,6 m), sahne önünde sütun
  S(20.6, -15, 4.8, 10, 0.6, 18); S(21.6, -15, 2.8, 10, 1.2, 18); S(22.6, -15, 0.8, 10, 1.8, 18);
  S(11.5, -15, 1.6, 8, 3.2, 12); S(15.5, -15.5, 1, 3, 1, 19);
  // şerit ayırıcı yıkık duvarlar
  S(-9.2, -16, 0.8, 6, 2.6, 12); S(9.2, -16, 0.8, 6, 2.6, 12);
  const A = [[-10, -27.5], [-4, -29.5], [0, -27.5], [4, -29.5], [10, -27.5], [-15, -29.5], [16, -29.6], [-18, -26.5], [19, -28]];
  return { n: 'Antik Kent', hx: 23, hz: 31, boxes: L, spawn: [A.map(([x, z]) => [x, z, 0]), A.map(([x, z]) => [-x, -z, Math.PI])],
    ffa: [[-10, -27.5, 0], [10, -27.5, 0], [10, 27.5, 3.14], [-10, 27.5, 3.14], [-21, -3, 1.57], [21, 3, -1.57], [-15, -21, 0], [15, 21, 3.14], [-7, -6.5, 0], [7, 6.5, 3.14], [-14.5, -4, 1.57], [14.5, 4, -1.57], [17, -6, -1.57], [-17, 6, 1.57]],
    pick: [[-6.5, 0, 0], [6.5, 0, 0], [-21, -11, 1], [21, 11, 1], [16.5, -8, 0], [-16.5, 8, 0], [-3, -18, 1], [3, 18, 1], [-15, -5, 1], [15, 5, 1]] };
})());
let CT_MI = -1, CT_HX = 22, CT_HZ = 32, CT_BOXES = [], CT_SPAWN = [[], []], CT_FFA = [], CT_PICK = [];
// Etkin haritayı seçer (sunucuda her oda kendi haritasına geçer). Dönen: geçerli harita no
function ctMap(i) {
  i = CT_MAPS[i | 0] ? i | 0 : 0;
  if (i !== CT_MI) { const M = CT_MAPS[i]; CT_MI = i; CT_HX = M.hx; CT_HZ = M.hz; CT_BOXES = M.boxes; CT_SPAWN = M.spawn; CT_FFA = M.ffa; CT_PICK = M.pick; }
  return i;
}
ctMap(0);
// Silahlar: hasar, kafa çarpanı, atış aralığı (ms), şarjör, doldurma (ms), saçılma (derece; nişanda), saçma sayısı,
// hasar düşüşü (f0 metreden f1 metreye fk'ya iner), dürbün büyütmesi, otomatik mi, tepme
const CT_W = [
  { n: 'Tüfek', dmg: 26, head: 2, iv: 100, mag: 30, rl: 2000, sp: 1.5, spA: 0.4, pel: 1, f0: 28, f1: 60, fk: 0.65, zoom: 1.35, auto: 1, kick: 0.8, rng: 48 },
  { n: 'Pompalı', dmg: 13, head: 1.3, iv: 820, mag: 6, rl: 2400, sp: 5.2, spA: 4.2, pel: 8, f0: 7, f1: 24, fk: 0.2, zoom: 1.15, auto: 0, kick: 4.2, rng: 15 },
  { n: 'Keskin', dmg: 92, head: 2.5, iv: 1250, mag: 5, rl: 2600, sp: 4.5, spA: 0.03, pel: 1, f0: 900, f1: 1000, fk: 1, zoom: 4, auto: 0, kick: 5, rng: 90 },
  { n: 'Makineli', dmg: 17, head: 1.6, iv: 72, mag: 32, rl: 1700, sp: 2.3, spA: 1.0, pel: 1, f0: 11, f1: 30, fk: 0.55, zoom: 1.2, auto: 1, kick: 0.5, rng: 34 },
];
// El bombası öldürmelerinin silah kodu
const CT_NADE_W = 9;
const CT_PR = 0.35, CT_PH = 1.8, CT_PHC = 1.3, CT_EYE = 1.62, CT_EYEC = 1.12;
function ctDmg(w, dist, head) {
  const W = CT_W[w] || CT_W[0];
  let k = 1;
  if (dist > W.f0) k = dist >= W.f1 ? W.fk : 1 - ((dist - W.f0) / (W.f1 - W.f0)) * (1 - W.fk);
  return Math.round(W.dmg * k * (head ? W.head : 1));
}
// Işın: en yakın kutu ya da zemin. Dönen: uzaklık (yoksa maxT). CT_HIT = [nx, ny, nz, kutuNo]
const CT_HIT = [0, 1, 0, -1];
function ctRay(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT;
  CT_HIT[3] = -1;
  if (dy < -1e-6) { const t = -oy / dy; if (t >= 0 && t < best) { best = t; CT_HIT[0] = 0; CT_HIT[1] = 1; CT_HIT[2] = 0; CT_HIT[3] = -2; } }
  const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
  for (let i = 0; i < CT_BOXES.length; i++) {
    const b = CT_BOXES[i];
    let t1 = (b[0] - ox) * ix, t2 = (b[3] - ox) * ix, ax = 0;
    let tn = t1 < t2 ? t1 : t2, tf = t1 < t2 ? t2 : t1;
    t1 = (b[1] - oy) * iy; t2 = (b[4] - oy) * iy;
    const yn = t1 < t2 ? t1 : t2, yf = t1 < t2 ? t2 : t1;
    if (yn > tn) { tn = yn; ax = 1; }
    if (yf < tf) tf = yf;
    t1 = (b[2] - oz) * iz; t2 = (b[5] - oz) * iz;
    const zn = t1 < t2 ? t1 : t2, zf = t1 < t2 ? t2 : t1;
    if (zn > tn) { tn = zn; ax = 2; }
    if (zf < tf) tf = zf;
    if (tn <= tf && tn >= 0 && tn < best) {
      best = tn;
      CT_HIT[0] = ax === 0 ? (dx > 0 ? -1 : 1) : 0; CT_HIT[1] = ax === 1 ? (dy > 0 ? -1 : 1) : 0; CT_HIT[2] = ax === 2 ? (dz > 0 ? -1 : 1) : 0; CT_HIT[3] = i;
    }
  }
  return best;
}
// Oyuncu kutusu (yarıçap r, yükseklik h) herhangi bir kutuya giriyor mu? Dönen: kutu no ya da -1
function ctHit(x, y, z, r, h) {
  for (let i = 0; i < CT_BOXES.length; i++) {
    const b = CT_BOXES[i];
    if (x + r > b[0] && x - r < b[3] && z + r > b[2] && z - r < b[5] && y + h > b[1] && y < b[4] - 0.001) return i;
  }
  return -1;
}
// İki nokta arası açık mı (görüş / atış hattı)?
function ctClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
  if (d < 0.01) return true;
  return ctRay(ax, ay, az, dx / d, dy / d, dz / d, d) >= d - 0.02;
}
// El bombası: fitil (sn), etki yarıçapı (m), merkez hasarı, fırlatma hızı
const CT_NADE = { fuse: 2.1, r: 7.5, dmg: 140, sp: 15.5 };
// Bombanın yolu (sunucu ve istemcide aynı): 0,04 sn aralıklı noktalar; sonuncusu patlama yeri
function ctNadePath(o, d) {
  const P = [], dt = 0.02, R = 0.09, N = Math.round(CT_NADE.fuse / dt);
  let x = o[0], y = o[1], z = o[2], vx = d[0] * CT_NADE.sp, vy = d[1] * CT_NADE.sp + 2.6, vz = d[2] * CT_NADE.sp;
  for (let k = 0; k <= N; k++) {
    if (k % 2 === 0) P.push([x, y, z]);
    vy -= 19 * dt;
    let n = x + vx * dt;
    if (n < -CT_HX + R || n > CT_HX - R || ctHit(n, y - R, z, R, R * 2) >= 0) vx = -vx * 0.42; else x = n;
    n = z + vz * dt;
    if (n < -CT_HZ + R || n > CT_HZ - R || ctHit(x, y - R, n, R, R * 2) >= 0) vz = -vz * 0.42; else z = n;
    n = y + vy * dt;
    if (n <= R || ctHit(x, n - R, z, R, R * 2) >= 0) { vy = Math.abs(vy) > 1.4 ? -vy * 0.38 : 0; vx *= 0.72; vz *= 0.72; if (n <= R) y = R; } else y = n;
  }
  return P;
}
// ==/GEN==

const TAU = Math.PI * 2, UP = [0, 1, 0];
const TEAM = [{ n: 'Kırmızı', hex: '#e5484d', dark: '#9c2a2e', jacket: '#b8423f' }, { n: 'Mavi', hex: '#3b82f6', dark: '#2449a8', jacket: '#3a62b8' }];
const WICON = ['🔫', '💥', '🎯', '⚡']; WICON[CT_NADE_W] = '💣';
const LS = { sens: 'nfc-ct-sens', auto: 'nfc-ct-auto' };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* yok say */ } };

/* ============================ stil ============================ */
const STYLE = `
#ky.ct{background:#0d1117;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#ky.ct canvas.ct-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#ky.ct .hud{z-index:6;pointer-events:none}
#ky.ct .hud .ib,#ky.ct .hud .ex{pointer-events:auto}
#ky.ct .hud .pos{display:none}
#ky.ct .msg{z-index:7;pointer-events:none;top:22%}
#ky.ct .panel{z-index:9}
#ky.ct .panel .card{max-height:calc(100% - 8px);overflow:auto;overscroll-behavior:contain}
@media (max-width:430px) and (orientation:portrait){#ky.ct div.ct-top{left:calc(env(safe-area-inset-left,0px) + 12px);transform:none}}
@media (max-width:370px){#ky.ct div.ct-top .t{min-width:44px;padding:3px 6px;font-size:17px}#ky.ct div.ct-top .tm{min-width:48px;padding:0 6px;font-size:13px}}
@media (max-height:680px){#ky.ct .panel .how{display:none}}
#ky.ct .ct-top{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 8px);transform:translateX(-50%);display:flex;align-items:stretch;gap:5px;z-index:5;pointer-events:none;font-weight:900}
#ky.ct .ct-top>div{border-radius:11px;overflow:hidden;box-shadow:0 3px 0 rgba(0,0,0,.38)}
#ky.ct .ct-top .t{min-width:54px;padding:3px 10px;color:#fff;font-size:20px;line-height:1.1;text-align:center;position:relative}
#ky.ct .ct-top .t small{display:block;font-size:9px;font-weight:800;opacity:.85;letter-spacing:.04em}
#ky.ct .ct-top .t i{position:absolute;left:0;bottom:0;height:3px;background:rgba(255,255,255,.9)}
#ky.ct .ct-top .t0{background:#e5484d}#ky.ct .ct-top .t1{background:#3b82f6}
#ky.ct .ct-top .t.me{box-shadow:0 0 0 2px #fff,0 3px 0 2px rgba(0,0,0,.38)}
#ky.ct .ct-top .tm{background:rgba(12,14,20,.86);color:#fff;font-size:15px;padding:0 10px;display:grid;place-items:center;font-variant-numeric:tabular-nums;min-width:58px}
#ky.ct .ct-top .tm.warn{color:#ffd23f}
#ky.ct .ct-top .tm small{display:block;font-size:9px;opacity:.7;font-weight:700;margin-top:-3px}
#ky.ct .ct-radar{position:absolute;left:calc(env(safe-area-inset-left,0px) + 8px);top:calc(env(safe-area-inset-top,0px) + 8px);width:78px;height:112px;border-radius:10px;background:rgba(12,14,20,.55);border:2px solid rgba(255,255,255,.35);z-index:4;pointer-events:none}
#ky.ct .ct-feed{position:absolute;right:calc(env(safe-area-inset-right,0px) + 8px);top:calc(env(safe-area-inset-top,0px) + 56px);display:grid;gap:3px;justify-items:end;z-index:4;pointer-events:none}
#ky.ct .ct-feed div{font-weight:800;font-size:11.5px;color:#fff;background:rgba(12,14,20,.62);border-radius:8px;padding:2px 8px;white-space:nowrap;animation:ctf 5s ease-out forwards}
#ky.ct .ct-feed div.me{outline:2px solid #ffd23f}
#ky.ct .ct-feed b.t0{color:#ff8a8d}#ky.ct .ct-feed b.t1{color:#8db8ff}
@keyframes ctf{0%{opacity:0;transform:translateX(10px)}5%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
#ky.ct .ct-x{position:absolute;left:50%;top:50%;width:0;height:0;z-index:3;pointer-events:none}
#ky.ct .ct-x i{position:absolute;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.55);border-radius:1px}
#ky.ct .ct-x .d{left:-1.5px;top:-1.5px;width:3px;height:3px;border-radius:99px}
#ky.ct .ct-x.en i{background:#ff4d4f}
#ky.ct .ct-hm{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;z-index:3;pointer-events:none;opacity:0}
#ky.ct .ct-hm:before,#ky.ct .ct-hm:after{content:"";position:absolute;left:14px;top:0;width:2.5px;height:30px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.5);transform:rotate(45deg);clip-path:polygon(0 0,100% 0,100% 32%,0 32%,0 68%,100% 68%,100% 100%,0 100%)}
#ky.ct .ct-hm:after{transform:rotate(-45deg)}
#ky.ct .ct-hm.on{animation:cthm .22s ease-out}
#ky.ct .ct-hm.kill:before,#ky.ct .ct-hm.kill:after{background:#ff4d4f}
#ky.ct .ct-hm.hs:before,#ky.ct .ct-hm.hs:after{background:#ffd23f}
@keyframes cthm{0%{opacity:1;transform:scale(1.5)}100%{opacity:0;transform:scale(1)}}
#ky.ct .ct-scope{position:absolute;inset:0;z-index:2;pointer-events:none;display:none;background:radial-gradient(circle at 50% 50%,transparent 0,transparent min(34vh,34vw),rgba(0,0,0,.92) calc(min(34vh,34vw) + 2px),#000 100%)}
#ky.ct .ct-scope:before,#ky.ct .ct-scope:after{content:"";position:absolute;background:rgba(0,0,0,.85)}
#ky.ct .ct-scope:before{left:50%;top:calc(50% - min(34vh,34vw));width:1.5px;height:calc(min(34vh,34vw) * 2);margin-left:-.75px}
#ky.ct .ct-scope:after{top:50%;left:calc(50% - min(34vh,34vw));height:1.5px;width:calc(min(34vh,34vw) * 2);margin-top:-.75px}
#ky.ct.scoped .ct-scope{display:block}
#ky.ct.scoped .ct-x{display:none}
#ky.ct .ct-dmg{position:absolute;left:50%;top:50%;width:0;height:0;z-index:3;pointer-events:none}
#ky.ct .ct-dmg i{position:absolute;left:-46px;top:-150px;width:92px;height:34px;border-radius:50% 50% 0 0/100% 100% 0 0;background:radial-gradient(ellipse at 50% 100%,transparent 55%,rgba(255,40,40,.95) 60%,rgba(255,40,40,0) 100%);transform-origin:46px 150px;opacity:0;transition:opacity .9s}
#ky.ct .ct-dmg i.on{opacity:1;transition:none}
#ky.ct .ct-low{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 90px 30px rgba(220,20,30,.7);opacity:0;transition:opacity .25s}
#ky.ct .ct-hit{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 70px 24px rgba(255,40,40,.75);opacity:0}
#ky.ct .ct-hit.on{animation:cthit .5s ease-out}
@keyframes cthit{0%{opacity:1}100%{opacity:0}}
#ky.ct .ct-bot{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);display:flex;align-items:flex-end;gap:8px;z-index:5;pointer-events:none}
#ky.ct .ct-hp{width:128px;pointer-events:none}
#ky.ct .ct-hp .bar{height:11px;border-radius:99px;background:rgba(12,14,20,.6);border:2px solid rgba(255,255,255,.7);overflow:hidden}
#ky.ct .ct-hp .bar i{display:block;height:100%;width:100%;background:#3fdc6a;transition:width .15s}
#ky.ct .ct-hp.low .bar i{background:#ff4d4f}
#ky.ct .ct-hp b{display:block;color:#fff;font-weight:900;font-size:17px;text-shadow:0 1px 0 #000,0 0 4px #000;line-height:1}
#ky.ct .ct-hp b small{font-size:10px;opacity:.8;margin-left:3px}
#ky.ct .ct-ws{display:flex;gap:5px;pointer-events:auto}
#ky.ct .ct-w{position:relative;width:52px;height:40px;border-radius:10px;border:2px solid rgba(255,255,255,.4);background:rgba(12,14,20,.5);color:#fff;font-size:18px;line-height:1;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;padding:0 0 9px}
#ky.ct .ct-w small{position:absolute;left:0;right:0;bottom:2px;font-size:8.5px;font-weight:800;text-align:center;opacity:.9}
#ky.ct .ct-w.on{border-color:#ffd23f;background:rgba(255,210,63,.3);transform:translateY(-3px)}
#ky.ct .ct-ammo{color:#fff;font-weight:900;font-size:24px;text-shadow:0 2px 0 #000,0 0 5px #000;line-height:1;min-width:66px;text-align:right;font-variant-numeric:tabular-nums}
#ky.ct .ct-ammo small{font-size:11px;opacity:.75;margin-left:2px}
#ky.ct .ct-ammo.low{color:#ff6b6b}
#ky.ct .ct-ammo.rl{color:#ffd23f;font-size:13px}
#ky.ct .ct-b{position:absolute;z-index:5;border-radius:99px;border:3px solid rgba(255,255,255,.72);background:rgba(12,14,20,.4);color:#fff;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;font-weight:900;line-height:1;padding:0}
#ky.ct .ct-b.on{background:rgba(255,210,63,.65);transform:scale(.93)}
#ky.ct .ct-b svg{width:56%;height:56%;pointer-events:none}
#ky.ct .ct-b.fire{right:calc(env(safe-area-inset-right,0px) + 22px);bottom:calc(env(safe-area-inset-bottom,0px) + 64px);width:84px;height:84px;background:rgba(229,72,77,.45);border-color:#fff}
#ky.ct .ct-b.fire.on{background:rgba(229,72,77,.9)}
#ky.ct .ct-b.fireL{left:calc(env(safe-area-inset-left,0px) + 16px);top:36%;width:56px;height:56px;background:rgba(229,72,77,.35)}
#ky.ct .ct-b.ads{right:calc(env(safe-area-inset-right,0px) + 118px);bottom:calc(env(safe-area-inset-bottom,0px) + 56px);width:58px;height:58px}
#ky.ct .ct-b.ads.act{background:rgba(63,220,106,.6)}
#ky.ct .ct-b.jump{right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 160px);width:56px;height:56px}
#ky.ct .ct-b.crouch{right:calc(env(safe-area-inset-right,0px) + 84px);bottom:calc(env(safe-area-inset-bottom,0px) + 136px);width:50px;height:50px}
#ky.ct .ct-b.crouch.act{background:rgba(63,220,106,.6)}
#ky.ct .ct-b.reload{right:calc(env(safe-area-inset-right,0px) + 150px);bottom:calc(env(safe-area-inset-bottom,0px) + 124px);width:48px;height:48px}
#ky.ct .ct-b.auto{right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 226px);width:auto;height:28px;border-radius:10px;border-width:2px;padding:0 8px;font-size:10.5px}
#ky.ct .ct-b.nade{right:calc(env(safe-area-inset-right,0px) + 196px);bottom:calc(env(safe-area-inset-bottom,0px) + 62px);width:50px;height:50px;font-size:22px}
#ky.ct .ct-b.nade u{position:absolute;right:-5px;top:-7px;min-width:20px;height:20px;border-radius:99px;background:#ffd23f;color:#14161c;font:900 12px system-ui,sans-serif;display:grid;place-items:center;text-decoration:none;border:2px solid #14161c}
#ky.ct .ct-b.nade.no{opacity:.4}
#ky.ct .ct-dn{position:absolute;left:50%;top:50%;z-index:3;pointer-events:none;font:900 19px system-ui,sans-serif;color:#fff;text-shadow:0 2px 0 #000,0 0 8px rgba(0,0,0,.6);animation:ctdn .75s ease-out forwards;white-space:nowrap}
#ky.ct .ct-dn.hs{color:#ffd23f;font-size:24px}
@keyframes ctdn{0%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 6px)) scale(.6)}15%{opacity:1;transform:translate(var(--dx),var(--dy)) scale(1.15)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) - 46px)) scale(.9)}}
#ky.ct .ct-nwarn{position:absolute;left:50%;top:64%;transform:translateX(-50%);z-index:4;pointer-events:none;font:900 17px system-ui,sans-serif;color:#fff;background:rgba(214,36,36,.88);border:2px solid #fff;border-radius:99px;padding:5px 14px;white-space:nowrap;display:none;animation:ctnw .35s ease-in-out infinite alternate}
#ky.ct .ct-nwarn.on{display:block}
@keyframes ctnw{to{transform:translateX(-50%) scale(1.12)}}
#ky.ct .panel .card.rdy{padding-bottom:0}
#ky.ct .panel .ct-go{position:sticky;bottom:0;z-index:2;margin-top:6px;padding:6px 0 14px;background:var(--ort);border-top:2px dashed rgba(28,22,51,.14);box-shadow:0 -12px 14px -12px rgba(28,22,51,.25)}
#ky.ct .panel .ct-go .kb{margin-top:6px}
@media (max-height:700px){#ky.ct .panel .ct-go{display:flex;align-items:center;gap:10px;padding:6px 0 10px}#ky.ct .panel .ct-go .cd{margin:0;flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-start;gap:0;line-height:1.05}#ky.ct .panel .ct-go .cd span{font-size:11px;max-width:64px;line-height:1.1}#ky.ct .panel .ct-go .cd b{font-size:22px}#ky.ct .panel .ct-go .kb{margin-top:0;flex:1;min-width:0;padding:10px 10px;font-size:16px;white-space:nowrap}}
#ky.ct .ct-wflash{position:absolute;inset:0;background:#fff3d6;opacity:0;pointer-events:none;z-index:2}
#ky.ct .ct-b.auto.act{background:rgba(63,220,106,.65)}
#ky.ct .ct-joy{position:absolute;left:0;top:0;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:99px;background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.5);pointer-events:none;display:none;z-index:4}
#ky.ct .ct-joy i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:99px;background:rgba(255,255,255,.7);border:3px solid rgba(12,10,26,.55)}
#ky.ct .ct-joy.run{border-color:#ffd23f}
#ky.ct .ct-joyhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + 34px);bottom:calc(env(safe-area-inset-bottom,0px) + 44px);width:104px;height:104px;border-radius:99px;border:3px dashed rgba(255,255,255,.45);display:grid;place-items:center;color:#fff;font-size:11.5px;font-weight:800;text-align:center;pointer-events:none;z-index:3;text-shadow:0 1px 2px #000}
#ky.ct .ct-tags{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
#ky.ct .ct-tag{position:absolute;left:0;top:0;font-weight:800;font-size:11px;color:#fff;white-space:nowrap;will-change:transform;text-shadow:0 1px 0 #000,0 0 4px #000;display:flex;flex-direction:column;align-items:center;line-height:1.1}
#ky.ct .ct-tag i{width:0;height:0;border:5px solid transparent;border-top-color:currentColor;margin-top:1px}
#ky.ct .ct-tag.t0{color:#ff8a8d}#ky.ct .ct-tag.t1{color:#8db8ff}
#ky.ct .ct-ann{position:absolute;left:0;right:0;top:27%;text-align:center;z-index:6;pointer-events:none}
#ky.ct .ct-ann div{display:inline-block;font-weight:900;font-size:22px;color:#fff;-webkit-text-stroke:1px #000;text-shadow:0 3px 0 #000;animation:ctann 1.6s ease-out forwards;letter-spacing:.03em}
#ky.ct .ct-ann div.gold{color:#ffd23f}
#ky.ct .ct-ann div.red{color:#ff6b6b}
@keyframes ctann{0%{opacity:0;transform:scale(1.6)}12%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:translateY(-14px)}}
#ky.ct .ct-dead{position:absolute;inset:0;z-index:6;pointer-events:none;display:none;place-items:center;background:radial-gradient(ellipse at 50% 50%,rgba(60,0,0,.15),rgba(20,0,0,.72))}
#ky.ct.dead .ct-dead{display:grid}
#ky.ct .ct-dead div{text-align:center;color:#fff;font-weight:900;text-shadow:0 2px 0 #000}
#ky.ct .ct-dead b{display:block;font-size:22px}
#ky.ct .ct-dead span{display:block;font-size:14px;opacity:.9;margin-top:4px}
#ky.ct.dead.dcam .ct-dead{place-items:end center;background:radial-gradient(ellipse at 50% 42%,rgba(60,0,0,0) 30%,rgba(20,0,0,.38) 72%,rgba(20,0,0,.62))}
#ky.ct.dead.dcam .ct-dead>div{margin-bottom:calc(env(safe-area-inset-bottom,0px) + 14px);background:rgba(12,14,20,.78);border:2px solid rgba(255,255,255,.16);border-radius:14px;padding:6px 8px 6px 14px;max-width:calc(100% - 24px);display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:3px 10px}
#ky.ct.dead.dcam .ct-dead b{display:inline;font-size:16px}
#ky.ct .ct-dead b span{display:inline;font-size:inherit;margin:0;opacity:1}
#ky.ct.dead.dcam .ct-dead b .t0{color:#ff7d78}#ky.ct.dead.dcam .ct-dead b .t1{color:#86b4ff}
#ky.ct.dead.dcam .ct-dead span{display:inline;font-size:13px;margin:0}
#ky.ct.dead.dcam .ct-dead em{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:99px;border:2px solid #ffd23f;font-size:17px;margin:0}
#ky.ct .ct-dead .hs{display:inline;font-size:inherit;color:#ffd23f}#ky.ct .ct-dead .hp{display:inline;font-size:inherit;color:#7dff9a}
#ky.ct .ct-tag.killer{font-size:14px}#ky.ct .ct-tag.killer b{font-size:10px;background:#e5484d;color:#fff;border-radius:6px;padding:1px 6px;margin-bottom:2px;letter-spacing:.05em;text-shadow:none}
#ky.ct .ct-dead em{display:block;font-style:normal;font-size:46px;margin-top:6px;color:#ffd23f}
#ky.ct.dead .ct-b,#ky.ct.dead .ct-x,#ky.ct.dead .ct-bot,#ky.ct.dead .ct-joyhint{display:none}
#ky.ct:not(.play) .ct-b,#ky.ct:not(.play) .ct-x,#ky.ct:not(.play) .ct-bot,#ky.ct:not(.play) .ct-joyhint,#ky.ct:not(.play) .ct-radar,#ky.ct:not(.play) .ct-top,#ky.ct:not(.play) .ct-feed{display:none}
#ky.ct.play .panel.on{display:none}
#ky.ct .ct-prot{position:absolute;left:50%;top:60%;transform:translateX(-50%);font-weight:800;font-size:12px;color:#fff;background:rgba(59,130,246,.75);border-radius:99px;padding:3px 12px;z-index:4;pointer-events:none;display:none}
#ky.ct .ct-opt{display:grid;gap:5px;margin:8px 0 4px}
#ky.ct .ct-opt .r{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
#ky.ct .ct-opt .r>span{font-weight:800;font-size:12px;opacity:.75;min-width:74px}
#ky.ct .ct-opt button{border-radius:99px;border:2.5px solid #1c1633;background:#fff;color:#1c1633;font-weight:800;padding:3px 10px;font-size:12px}
#ky.ct .ct-opt button.on{background:#ffd23f}
#ky.ct .ct-opt .my button.on{background:#3fdc6a}
#ky.ct .ct-teams{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
#ky.ct .ct-teams.one{grid-template-columns:1fr}
#ky.ct .ct-teams>div{border-radius:12px;padding:5px 8px;color:#fff;font-size:12px;font-weight:700}
#ky.ct .ct-teams>div b{display:block;font-size:13px;font-weight:900;margin-bottom:2px}
#ky.ct .ct-teams .t0{background:#c93c40}#ky.ct .ct-teams .t1{background:#2f6fe0}#ky.ct .ct-teams .tf{background:#3a3550}
#ky.ct .ct-teams span{display:inline-block;margin-right:7px;white-space:nowrap}
#ky.ct .ct-teams span.me{text-decoration:underline;font-weight:900}
#ky.ct table.ct-res{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
#ky.ct table.ct-res td,#ky.ct table.ct-res th{padding:3px 4px;text-align:center;white-space:nowrap}
#ky.ct table.ct-res td.n{text-align:left;font-weight:800;max-width:120px;overflow:hidden;text-overflow:ellipsis}
#ky.ct table.ct-res tr.t0 td.n{color:#c93c40}#ky.ct table.ct-res tr.t1 td.n{color:#2f6fe0}
#ky.ct table.ct-res tr.me td{background:rgba(255,210,63,.4)}
#ky.ct table.ct-res td.k{font-weight:900}
#ky.ct .ct-rot{display:none;margin:6px 0 0;font-size:12px;font-weight:800;background:#fff3c4;border-radius:10px;padding:5px 9px;color:#5a4500}
@media (orientation:portrait){#ky.ct .ct-rot{display:block}
  #ky.ct .ct-b.fire{bottom:calc(env(safe-area-inset-bottom,0px) + 96px);right:calc(env(safe-area-inset-right,0px) + 16px)}
  #ky.ct .ct-b.ads{bottom:calc(env(safe-area-inset-bottom,0px) + 86px);right:calc(env(safe-area-inset-right,0px) + 108px)}
  #ky.ct .ct-b.jump{bottom:calc(env(safe-area-inset-bottom,0px) + 192px)}
  #ky.ct .ct-b.crouch{bottom:calc(env(safe-area-inset-bottom,0px) + 168px)}
  #ky.ct .ct-b.reload{bottom:calc(env(safe-area-inset-bottom,0px) + 154px);right:calc(env(safe-area-inset-right,0px) + 140px)}
  #ky.ct .ct-b.auto{bottom:calc(env(safe-area-inset-bottom,0px) + 258px)}
  #ky.ct .ct-joyhint{bottom:calc(env(safe-area-inset-bottom,0px) + 86px);left:calc(env(safe-area-inset-left,0px) + 22px)}
  #ky.ct .ct-b.fireL{top:44%}
  #ky.ct .ct-radar{top:calc(env(safe-area-inset-top,0px) + 54px)}
  #ky.ct .ct-ammo{min-width:56px;font-size:20px}
  #ky.ct .ct-hp{width:96px}
  #ky.ct .ct-w{width:44px}
}
@media (max-width:380px){#ky.ct .ct-w{width:37px}#ky.ct .ct-w small{font-size:7.5px}#ky.ct .ct-hp{width:70px}#ky.ct .ct-ammo{min-width:44px;font-size:18px}#ky.ct .ct-bot{gap:6px}}
@media (orientation:landscape) and (max-height:520px){
  #ky.ct .panel .card{max-width:min(720px,94vw);padding-top:10px;padding-bottom:10px}
  #ky.ct .panel .how{display:none}
  #ky.ct .ct-opt{grid-template-columns:1fr 1fr;gap:4px 14px;margin:4px 0}
  #ky.ct .ct-teams{margin:4px 0}
  #ky.ct .ct-opt .r>span{min-width:58px}
  #ky.ct .ct-opt .r.map{grid-column:1/-1}
  #ky.ct .panel .cd{margin-top:3px}
  #ky.ct .panel .cd b{font-size:20px;line-height:1.1}
  #ky.ct .panel .kb{margin-top:5px;padding:5px 12px}
  #ky.ct .ct-opt button{padding:3px 8px}
  #ky.ct .hud .r1{justify-content:flex-end}
  #ky.ct .ct-feed{top:calc(env(safe-area-inset-top,0px) + 50px)}
}
@media (hover:hover) and (pointer:fine){#ky.ct .ct-b.fireL,#ky.ct .ct-joyhint{display:none}}
@media (min-width:900px) and (min-height:521px){#ky.ct .panel .card{max-width:640px}}
`;
function styleCT() {
  if (document.getElementById('ct-style')) return;
  const st = document.createElement('style');
  st.id = 'ct-style';
  st.textContent = STYLE;
  document.head.appendChild(st);
}
const ICON = {
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/><circle cx="12" cy="12" r="1.4" fill="#fff"/></svg>',
  ads: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 6v9M6 10.5h9"/></svg>',
  jump: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l7-7 7 7M5 20l7-7 7 7"/></svg>',
  crouch: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l7 7 7-7M4 19h16"/></svg>',
  reload: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 6.2M20 4v7h-7"/></svg>',
};

/* ============================ harita modeli ============================ */
const PAL = {
  wall: '#cdbd9f', wallD: '#a8977a', plaster: '#d8c8ab', cap: '#8f7c64', wood: '#b98a4e', woodD: '#8a6234', concrete: '#aaa59b',
  sand: '#cdb98f', sandD: '#b6a27a', stucco: '#dccfb6', roof: '#b5583c', glass: '#3d5a78',
  cont: ['#c5523f', '#2f8793', '#d9a12b', '#4263b4', '#5d9455'],
};
function hsh(a, b) { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function buildWorld(mb) {
  if (CT_MI === 1) { buildLiman(mb); return; }
  if (CT_MI === 2) { buildFabrika(mb); return; }
  if (CT_MI === 3) { buildKar(mb); return; }
  if (CT_MI === 4) { buildAntik(mb); return; }
  const quad = (x0, z0, x1, z1, col, y = 0) => mb.quadN([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], UP, UP, UP, UP, col);
  // zemin: bölgelere göre renk (üst üste binmez)
  quad(-22, -32, 22, -22, C('#b08a82', 0)); quad(-22, 22, 22, 32, C('#8696b0', 0));
  quad(-9, -22, 9, 22, C('#66676c', 0)); quad(-22, -22, -9, 22, C('#978a75', 0)); quad(9, -22, 22, 22, C('#a09684', 0));
  quad(-140, -150, 140, 150, C('#a89878', 0), -0.03);
  // yer çizgileri ve işaretler (zeminin hemen üstünde)
  const Y = 0.018, WH = C('#f1ede2', 0), YL = C('#e9b93a', 0);
  for (let z = -20.5; z <= 20.5; z += 3) if (Math.abs(z) > 2.4) quad(-0.09, z - 0.9, 0.09, z + 0.9, WH, Y);
  for (const s of [-1, 1]) {
    quad(-8.9, s * 21.2 - 0.07, 8.9, s * 21.2 + 0.07, YL, Y);
    for (let x = -2.6; x <= 2.6; x += 0.9) quad(x - 0.25, s * 20.2 - 1.1, x + 0.25, s * 20.2 + 1.1, WH, Y);
    quad(-9.45, -22, -9.35, 22, WH, Y); quad(9.35, -22, 9.45, 22, WH, Y);
    // üs amblemi: halka + ok
    const tc = C(s < 0 ? '#b8322f' : '#2b5cc4', 0);
    mb.disc(0, Y, s * 27, 2.4, 2.4, 32, tc, tc);
    mb.disc(0, Y + 0.004, s * 27, 1.9, 1.9, 32, C(s < 0 ? '#b08a82' : '#8696b0', 0), C(s < 0 ? '#b08a82' : '#8696b0', 0));
    mb.triN([0, Y + 0.008, s * 27 - s * 1.3], [-1.0, Y + 0.008, s * 27 + s * 0.8], [1.0, Y + 0.008, s * 27 + s * 0.8], UP, UP, UP, tc);
  }
  // kutular
  let ci = 0;
  CT_BOXES.forEach((b, bi) => {
    const [x0, y0, z0, x1, y1, z1, t] = b;
    const w = x1 - x0, d = z1 - z0, h = y1 - y0;
    if (t === 0) {
      mb.box(x0, y0, z0, x1, y1, z1, C(PAL.wall, 0));
      const lx = w > d;
      // iç yüz: taban bandı, üst başlık, payandalar
      if (lx) {
        const zi = z0 < 0 ? z1 : z0, s = z0 < 0 ? 1 : -1;
        mb.box(x0, 0, zi, x1, 0.55, zi + s * 0.06, C(PAL.wallD, 0));
        mb.box(x0 - 0.1, y1, z0 - 0.12, x1 + 0.1, y1 + 0.22, z1 + 0.12, C(PAL.cap, 0));
        for (let x = -19.5; x <= 19.5; x += 6.5) mb.box(x - 0.3, 0, zi, x + 0.3, y1, zi + s * 0.22, C(PAL.wallD, 0));
        // takım bayrakları
        const tc = C(z0 < 0 ? '#c53b38' : '#356bd6', 0);
        for (const x of [-13, 0, 13]) { mb.box(x - 0.75, 1.5, zi + s * 0.24, x + 0.75, 4.2, zi + s * 0.27, tc); mb.box(x - 0.85, 4.2, zi + s * 0.2, x + 0.85, 4.32, zi + s * 0.32, C('#5b4a36', 0)); }
      } else {
        const xi = x0 < 0 ? x1 : x0, s = x0 < 0 ? 1 : -1;
        mb.box(xi, 0, z0, xi + s * 0.06, 0.55, z1, C(PAL.wallD, 0));
        mb.box(x0 - 0.12, y1, z0 - 0.1, x1 + 0.12, y1 + 0.22, z1 + 0.1, C(PAL.cap, 0));
        for (let z = -27; z <= 27; z += 6) mb.box(xi, 0, z - 0.3, xi + s * 0.22, y1, z + 0.3, C(PAL.wallD, 0));
      }
    } else if (t === 1 || t === 7) {
      mb.box(x0, y0, z0, x1, y1, z1, C(PAL.plaster, 0));
      mb.box(x0 - 0.04, 0, z0 - 0.04, x1 + 0.04, 0.42, z1 + 0.04, C(PAL.wallD, 0));
      mb.box(x0 - 0.08, y1, z0 - 0.08, x1 + 0.08, y1 + 0.16, z1 + 0.08, C(PAL.cap, 0));
      const band = t === 7 ? C(z0 < 0 ? '#c53b38' : '#356bd6', 0) : C('#3f9a94', 0);
      mb.box(x0 - 0.02, 2.25, z0 - 0.02, x1 + 0.02, 2.62, z1 + 0.02, band);
    } else if (t === 2) {
      const wc = C(hsh(bi, 3) > 0.5 ? PAL.wood : '#c2975c', 0), fr = C(PAL.woodD, 0), e = 0.075;
      mb.box(x0 + 0.02, y0, z0 + 0.02, x1 - 0.02, y1 - 0.01, z1 - 0.02, wc);
      for (const [a, c2] of [[x0, z0], [x1 - e, z0], [x0, z1 - e], [x1 - e, z1 - e]]) mb.box(a, y0, c2, a + e, y1, c2 + e, fr);
      for (const yy of [y0, y1 - e]) { mb.box(x0, yy, z0, x1, yy + e, z0 + e, fr); mb.box(x0, yy, z1 - e, x1, yy + e, z1, fr); mb.box(x0, yy, z0, x0 + e, yy + e, z1, fr); mb.box(x1 - e, yy, z0, x1, yy + e, z1, fr); }
      // çapraz tahta (iki yüz)
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cy = (y0 + y1) / 2, dg = Math.atan2(h, w);
      mb.push().T(cx, cy, z0 - 0.005, 0, 0, dg); mb.box(-Math.hypot(w, h) / 2 + 0.08, -0.05, 0, Math.hypot(w, h) / 2 - 0.08, 0.05, 0.02, fr); mb.pop();
      mb.push().T(cx, cy, z1 + 0.005, 0, 0, -dg); mb.box(-Math.hypot(w, h) / 2 + 0.08, -0.05, -0.02, Math.hypot(w, h) / 2 - 0.08, 0.05, 0, fr); mb.pop();
    } else if (t === 3) {
      const hex = PAL.cont[ci++ % PAL.cont.length], cc = C(hex, -0.25), cd = shade(C(hex, -0.25), 0.78);
      mb.box(x0, y0 + 0.04, z0, x1, y1, z1, cc);
      mb.box(x0 - 0.03, y1 - 0.12, z0 - 0.03, x1 + 0.03, y1 + 0.02, z1 + 0.03, cd);
      mb.box(x0 - 0.03, y0, z0 - 0.03, x1 + 0.03, y0 + 0.14, z1 + 0.03, cd);
      const lx = w > d;
      if (lx) {
        for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.42) { mb.box(x, y0 + 0.14, z0 - 0.035, x + 0.16, y1 - 0.12, z0, cd); mb.box(x, y0 + 0.14, z1, x + 0.16, y1 - 0.12, z1 + 0.035, cd); }
        for (const xe of [x0, x1]) { const s = xe === x0 ? -1 : 1; for (const zz of [z0 + d * 0.3, z0 + d * 0.7]) mb.box(xe, y0 + 0.2, zz - 0.03, xe + s * 0.05, y1 - 0.2, zz + 0.03, C('#c9ccd1', -0.7)); }
      } else {
        for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.42) { mb.box(x0 - 0.035, y0 + 0.14, z, x0, y1 - 0.12, z + 0.16, cd); mb.box(x1, y0 + 0.14, z, x1 + 0.035, y1 - 0.12, z + 0.16, cd); }
        for (const ze of [z0, z1]) { const s = ze === z0 ? -1 : 1; for (const xx of [x0 + w * 0.3, x0 + w * 0.7]) mb.box(xx - 0.03, y0 + 0.2, ze, xx + 0.03, y1 - 0.2, ze + s * 0.05, C('#c9ccd1', -0.7)); }
      }
    } else if (t === 4) {
      mb.box(x0, y0, z0, x1, y1, z1, C(PAL.stucco, 0));
      mb.box(x0 - 0.04, 0, z0 - 0.04, x1 + 0.04, 0.5, z1 + 0.04, C('#b8a78c', 0));
      mb.box(x0 - 0.35, y1, z0 - 0.35, x1 + 0.35, y1 + 0.2, z1 + 0.35, C(PAL.roof, 0));
      mb.box(x0 + 0.3, y1 + 0.2, z0 + 0.3, x1 - 0.3, y1 + 0.5, z1 - 0.3, C('#9c4a33', 0));
      // şeride bakan yüz: pencereler, kapı, tente
      const xi = x0 < 0 ? x1 : x0, s = x0 < 0 ? 1 : -1;
      const gl = C(PAL.glass, -0.9), frm = C('#f4efe4', 0);
      for (let z = z0 + 1.3; z < z1 - 0.8; z += 2.2) for (const yy of [1.3, 3.3]) {
        if (yy < 2 && Math.abs(z - (z0 + z1) / 2) < 1.1) continue;
        mb.box(xi, yy - 0.06, z - 0.56, xi + s * 0.05, yy + 1.16, z + 0.56, frm);
        mb.box(xi, yy, z - 0.5, xi + s * 0.07, yy + 1.1, z + 0.5, gl);
        mb.box(xi, yy + 0.52, z - 0.5, xi + s * 0.08, yy + 0.58, z + 0.5, frm);
        if (yy > 2) mb.box(xi, yy - 0.16, z - 0.62, xi + s * 0.22, yy - 0.06, z + 0.62, C('#b8a78c', 0));
      }
      const zc = (z0 + z1) / 2;
      mb.box(xi, 0, zc - 0.6, xi + s * 0.06, 2.2, zc + 0.6, C('#6b4a2e', 0));
      mb.box(xi + s * 0.06, 1.0, zc + 0.36, xi + s * 0.1, 1.1, zc + 0.46, C('#d9b54a', -0.8));
      for (let k = 0; k < 6; k++) { const za = zc - 1.5 + k * 0.5; mb.push().T(xi, 2.75, za + 0.25, 0, 0, s * -0.35); mb.box(0, -0.03, -0.25, s * 1.25, 0.03, 0.25, C(k % 2 ? '#f1ede2' : '#c94f42', 0)); mb.pop(); }
      // z yüzleri: tek sıra pencere
      for (const ze of [z0, z1]) { const sz = ze === z0 ? -1 : 1; for (let x = x0 + 1.2; x < x1 - 0.6; x += 2.2) { mb.box(x - 0.56, 3.24, ze, x + 0.56, 4.46, ze + sz * 0.05, frm); mb.box(x - 0.5, 3.3, ze, x + 0.5, 4.4, ze + sz * 0.07, gl); } }
      mb.box(x0 + 1, y1 + 0.5, z0 + 1.2, x0 + 2.2, y1 + 1.2, z0 + 2.2, C('#c9ccd1', -0.5));
    } else if (t === 5) {
      const lx = w > d, len = lx ? w : d, n = Math.max(1, Math.round(len / 0.62)), bl = len / n, rows = Math.max(1, Math.round(h / 0.275)), rh = h / rows;
      for (let r = 0; r < rows; r++) for (let k = 0; k < n + (r % 2); k++) {
        let a0 = (lx ? x0 : z0) + (k - (r % 2) * 0.5) * bl, a1 = a0 + bl;
        a0 = Math.max(a0, lx ? x0 : z0); a1 = Math.min(a1, lx ? x1 : z1);
        if (a1 - a0 < 0.12) continue;
        const col = C((k + r) % 2 ? PAL.sand : PAL.sandD, 0);
        if (lx) mb.rbox(a0 + 0.01, y0 + r * rh, z0, a1 - 0.01, y0 + (r + 1) * rh + 0.02, z1, 0.1, col, 1);
        else mb.rbox(x0, y0 + r * rh, a0 + 0.01, x1, y0 + (r + 1) * rh + 0.02, a1 - 0.01, 0.1, col, 1);
      }
    } else {
      mb.box(x0, y0, z0, x1, y1, z1, C(PAL.concrete, 0));
      mb.box(x0 - 0.02, y1 - 0.1, z0 - 0.02, x1 + 0.02, y1 + 0.005, z1 + 0.02, C('#e9b93a', 0));
      mb.box(x0 + 0.12, y1, z0 + 0.12, x1 - 0.12, y1 + 0.012, z1 - 0.12, C('#b8b3a8', 0));
    }
  });
  // sokak lambaları (duvar diplerinde; çarpışmasız)
  const lamp = (x, z, dx) => {
    mb.cyl(x, 0, z, 0.07, 4.4, 0.05, 8, C('#3b4048', -0.5), C('#3b4048', -0.5));
    mb.box(x, 4.3, z - 0.04, x + dx * 0.9, 4.38, z + 0.04, C('#3b4048', -0.5));
    mb.box(x + dx * 0.6, 4.18, z - 0.12, x + dx * 1.0, 4.3, z + 0.12, C('#fff1c9', 0.9));
  };
  for (const s of [-1, 1]) { lamp(s * -9.45, s * -17.6, s * -1); lamp(s * 9.45, s * -8, s); lamp(s * -21.7, s * 4, s); lamp(s * 21.7, s * -22.6, -s); }
  // dışarıdaki şehir silüeti + palmiyeler
  for (let k = 0; k < 30; k++) {
    const side = k % 4, a = hsh(k, 11), b2 = hsh(k, 12), hh = 7 + hsh(k, 13) * 13, ww = 6 + hsh(k, 14) * 7, dd = 6 + hsh(k, 15) * 6;
    let cx, cz;
    if (side === 0) { cx = -28 - b2 * 18 - ww / 2; cz = -40 + a * 80; } else if (side === 1) { cx = 28 + b2 * 18 + ww / 2; cz = -40 + a * 80; }
    else if (side === 2) { cz = -38 - b2 * 18 - dd / 2; cx = -34 + a * 68; } else { cz = 38 + b2 * 18 + dd / 2; cx = -34 + a * 68; }
    const col = C(['#e4d6bd', '#d8c7a8', '#e9dcc8', '#cfbfa2', '#dcc9ad'][k % 5], 0);
    mb.box(cx - ww / 2, 0, cz - dd / 2, cx + ww / 2, hh, cz + dd / 2, col);
    mb.box(cx - ww / 2 - 0.2, hh, cz - dd / 2 - 0.2, cx + ww / 2 + 0.2, hh + 0.3, cz + dd / 2 + 0.2, C(k % 3 ? '#b5583c' : '#a89880', 0));
    // arenaya bakan yüzde pencereler
    const gl = C('#4a6480', -0.8);
    for (let yy = 5.5; yy < hh - 1.2; yy += 2.6) {
      if (side < 2) { const xf = side === 0 ? cx + ww / 2 : cx - ww / 2, s = side === 0 ? 1 : -1; for (let z = cz - dd / 2 + 1.1; z < cz + dd / 2 - 0.6; z += 2.1) mb.box(xf, yy, z - 0.45, xf + s * 0.05, yy + 1.2, z + 0.45, gl); }
      else { const zf = side === 2 ? cz + dd / 2 : cz - dd / 2, s = side === 2 ? 1 : -1; for (let x = cx - ww / 2 + 1.1; x < cx + ww / 2 - 0.6; x += 2.1) mb.box(x - 0.45, yy, zf, x + 0.45, yy + 1.2, zf + s * 0.05, gl); }
    }
  }
  const palm = (x, z, k) => {
    const T1 = C('#9a7350', 0), G1 = C('#3f8f52', -0.2), G2 = C('#2f7a44', -0.2);
    let p = [x, 0, z];
    const lean = (hsh(k, 21) - 0.5) * 0.5, H = 6.5 + hsh(k, 22) * 2.5;
    for (let s = 0; s < 6; s++) { const q = [x + lean * (s + 1) * (s + 1) / 6, ((s + 1) * H) / 6, z]; limb(mb, p, q, [0.2 - s * 0.018, 0.185 - s * 0.018], T1, 7); p = q; }
    for (let f = 0; f < 9; f++) {
      const a = (f / 9) * TAU + k, c = Math.cos(a), s2 = Math.sin(a), m = [p[0] + c * 1.3, p[1] + 0.45, p[2] + s2 * 1.3], e = [p[0] + c * 2.7, p[1] - 0.7, p[2] + s2 * 2.7], n = [-s2 * 0.4, 0, c * 0.4], col = f % 2 ? G1 : G2;
      mb.triN(p, [m[0] + n[0], m[1], m[2] + n[2]], [m[0] - n[0], m[1], m[2] - n[2]], UP, UP, UP, col);
      mb.triN([m[0] + n[0], m[1], m[2] + n[2]], e, [m[0] - n[0], m[1], m[2] - n[2]], UP, UP, UP, col);
    }
  };
  [[-25, -20], [-25.5, 6], [-24.6, 24], [25, 18], [25.4, -8], [24.8, -27], [-12, -35.2], [9, -35.5], [14, 35.3], [-7, 35.6], [0, -36], [2, 36.2]].forEach(([x, z], k) => palm(x, z, k));
}

/* ============================ Liman haritası görselleri ============================ */
// Kutular ortak tanımdan (CT_BOXES) gelir; burada yalnızca görünüş var. Çarpışmasız süsler (vinç, gemi, lamba) arena dışında ya da incedir.
const LPAL = {
  conc: '#a3a19b', concD: '#85837e', asph: '#6d7177', yard: '#7b7c7e', mark: '#e9b93a', white: '#ece8de',
  fence: '#8f99a3', fenceD: '#6f7983', post: '#4f565e', steel: '#596169', steelD: '#3e444b',
  roof: '#77818c', roofD: '#5b6570', shed: '#b3c0ca', shedD: '#8fa1b0', shedB: '#5d6873',
  wood: '#a8794a', woodD: '#6e4c2c', sand: '#c9b48a', sandD: '#b39f77', rack: '#e07b2a', box: '#b88a57',
  water: '#2c6a83', crane: '#d24b2e', craneW: '#eae6dc', hull: '#26354d', hullR: '#9b3328'
};
const LCONT = ['#b8432f', '#2d6db0', '#3c8c55', '#d39a2c', '#6a4f9e', '#7f8b96', '#c45a7d', '#2f8f8c', '#c9c2b2'];
function limanContainer(mb, x0, y0, z0, x1, y1, z1, hex, open = 0, lite = false) {
  // oluklu konteyner: gövde, köşe dökümleri, üst/alt çerçeve, yan oluklar, bir uçta kapı (lite: uzaktakiler için sade)
  const w = x1 - x0, d = z1 - z0, cc = C(hex, -0.25), cd = shade(C(hex, -0.25), 0.74), cf = C('#2c3036', -0.4);
  mb.box(x0 + 0.02, y0 + 0.02, z0 + 0.02, x1 - 0.02, y1 - 0.02, z1 - 0.02, cc);
  if (lite) { mb.box(x0, y0, z0, x1, y0 + 0.14, z1, cd); mb.box(x0, y1 - 0.14, z0, x1, y1, z1, cd); return; }
  for (const yy of [y0, y1 - 0.12]) { mb.box(x0, yy, z0, x1, yy + 0.12, z0 + 0.1, cd); mb.box(x0, yy, z1 - 0.1, x1, yy + 0.12, z1, cd); mb.box(x0, yy, z0, x0 + 0.1, yy + 0.12, z1, cd); mb.box(x1 - 0.1, yy, z0, x1, yy + 0.12, z1, cd); }
  for (const [a, b] of [[x0, z0], [x1 - 0.12, z0], [x0, z1 - 0.12], [x1 - 0.12, z1 - 0.12]]) mb.box(a, y0, b, a + 0.12, y1, b + 0.12, cf);
  const lx = w > d;
  if (lx) {
    for (let x = x0 + 0.32; x < x1 - 0.25; x += 0.4) { mb.box(x, y0 + 0.12, z0 - 0.03, x + 0.15, y1 - 0.12, z0 + 0.02, cd); mb.box(x, y0 + 0.12, z1 - 0.02, x + 0.15, y1 - 0.12, z1 + 0.03, cd); }
    const xe = (open ? x0 : x1), s = open ? -1 : 1;
    for (const zz of [z0 + d * 0.27, z0 + d * 0.42, z0 + d * 0.58, z0 + d * 0.73]) mb.box(xe, y0 + 0.18, zz - 0.025, xe + s * 0.05, y1 - 0.18, zz + 0.025, C('#c9ccd1', -0.7));
    mb.box(xe, y0 + 0.15, z0 + d * 0.5 - 0.01, xe + s * 0.035, y1 - 0.15, z0 + d * 0.5 + 0.01, cf);
  } else {
    for (let z = z0 + 0.32; z < z1 - 0.25; z += 0.4) { mb.box(x0 - 0.03, y0 + 0.12, z, x0 + 0.02, y1 - 0.12, z + 0.15, cd); mb.box(x1 - 0.02, y0 + 0.12, z, x1 + 0.03, y1 - 0.12, z + 0.15, cd); }
    const ze = (open ? z0 : z1), s = open ? -1 : 1;
    for (const xx of [x0 + w * 0.27, x0 + w * 0.42, x0 + w * 0.58, x0 + w * 0.73]) mb.box(xx - 0.025, y0 + 0.18, ze, xx + 0.025, y1 - 0.18, ze + s * 0.05, C('#c9ccd1', -0.7));
    mb.box(x0 + w * 0.5 - 0.01, y0 + 0.15, ze, x0 + w * 0.5 + 0.01, y1 - 0.15, ze + s * 0.035, cf);
  }
  // üstte ince şerit (firma rengi gibi)
  mb.box(x0 + 0.1, y1 - 0.02, z0 + 0.1, x1 - 0.1, y1, z1 - 0.1, shade(cc, 0.9));
}
function limanCrane(mb, x, z, side) {
  // rıhtım vinci: dört ayak, portal kiriş, denize uzanan bom, kabin ve gergi halatları
  const R1 = C(LPAL.crane, -0.2), W1 = C(LPAL.craneW, -0.1), D1 = C('#2c3036', -0.4);
  const xo = x + side * 9;   // deniz tarafındaki ayaklar
  for (const xx of [x, xo]) for (const zz of [z - 4.5, z + 4.5]) mb.box(xx - 0.45, 0, zz - 0.45, xx + 0.45, 19, zz + 0.45, R1);
  for (const zz of [z - 4.5, z + 4.5]) { mb.box(Math.min(x, xo) - 0.5, 9, zz - 0.35, Math.max(x, xo) + 0.5, 9.7, zz + 0.35, R1); mb.box(Math.min(x, xo) - 0.5, 18.4, zz - 0.4, Math.max(x, xo) + 0.5, 19.4, zz + 0.4, R1); }
  for (const xx of [x, xo]) mb.box(xx - 0.4, 18.4, z - 4.9, xx + 0.4, 19.4, z + 4.9, R1);
  // bom: karadan denize
  const b0 = x - side * 12, b1 = xo + side * 24;
  mb.box(Math.min(b0, b1), 22, z - 1.1, Math.max(b0, b1), 23.4, z - 0.6, W1);
  mb.box(Math.min(b0, b1), 22, z + 0.6, Math.max(b0, b1), 23.4, z + 1.1, W1);
  for (let k = 0; k <= 18; k++) { const xx = b0 + (b1 - b0) * (k / 18); mb.box(xx - 0.12, 22, z - 0.6, xx + 0.12, 22.25, z + 0.6, W1); }
  // kule ve gergiler
  for (const zz of [z - 1.6, z + 1.6]) { mb.box(x - 0.35, 19.4, zz - 0.35, x + 0.35, 31, zz + 0.35, R1); limb(mb, [x, 31, zz], [b1, 23.4, zz * 0.4 + z * 0.6], [0.06, 0.06], D1, 5); limb(mb, [x, 31, zz], [b0, 23.4, zz * 0.4 + z * 0.6], [0.06, 0.06], D1, 5); }
  mb.box(x - 0.6, 30.6, z - 2.1, x + 0.6, 31.4, z + 2.1, R1);
  // kabin ve taşıyıcı
  const cx = x + side * 15;
  mb.box(cx - 1.4, 20.2, z - 1.2, cx + 1.4, 22, z + 1.2, W1);
  mb.box(cx - 1.42, 20.9, z - 1.22, cx + 1.42, 21.6, z + 1.22, C('#3d5b78', -0.9));
  mb.box(cx - 1.0, 18.6, z - 1.6, cx + 1.0, 19.2, z + 1.6, D1);
  limb(mb, [cx, 22, z], [cx, 12, z], [0.04, 0.04], D1, 4);
  limanContainer(mb, cx - 1.3, 9.4, z - 3.05, cx + 1.3, 12, z + 3.05, LCONT[(Math.abs(Math.round(z)) + 3) % LCONT.length], 0, true);
  // tepe ışığı
  mb.box(x - 0.15, 31.4, z - 0.15, x + 0.15, 31.7, z + 0.15, C('#ff4a3d', 1));
}
function buildLiman(mb) {
  const quad = (x0, z0, x1, z1, col, y = 0) => mb.quadN([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], UP, UP, UP, UP, col);
  const Y = 0.018, WH = C(LPAL.white, 0), YL = C(LPAL.mark, 0), BK = C('#2a2c30', 0);
  // ---- zemin: rıhtım betonu, konteyner sahaları, üsler, depo içi
  quad(-24, -30, 24, -22, C('#a68e88', 0)); quad(-24, 22, 24, 30, C('#8e98aa', 0));
  quad(-24, -22, 24, 22, C(LPAL.conc, 0));
  quad(-24, -17.5, -12.2, -6.5, C(LPAL.asph, 0), 0.004); quad(12.2, 6.5, 24, 17.5, C(LPAL.asph, 0), 0.004);
  quad(-7, -5, 7, 5, C('#77726a', 0), 0.004);
  // beton plaka derzleri
  const J = C(LPAL.concD, 0);
  for (let x = -20; x <= 20; x += 4) quad(x - 0.025, -22, x + 0.025, 22, J, 0.008);
  for (let z = -20; z <= 20; z += 4) quad(-24, z - 0.025, 24, z + 0.025, J, 0.008);
  // dış rıhtım şeridi ve deniz
  quad(-34, -175, 34, 175, C('#8f8d88', 0), -0.03);
  const WA = C(LPAL.water, -0.85);
  quad(-320, -320, -34, 320, WA, -0.7); quad(34, -320, 320, 320, WA, -0.7);
  for (const s of [-1, 1]) {
    mb.box(s * 34 - 0.3, -0.75, -175, s * 34 + 0.3, -0.03, 175, C('#76726b', 0));
    // rıhtım kenarı: sarı şerit ve babalar
    quad(s * 33.4 - 0.15, -175, s * 33.4 + 0.15, 175, YL, -0.02);
    for (let z = -60; z <= 60; z += 7) mb.cyl(s * 33, -0.03, z, 0.22, 0.55, 0.26, 10, C('#2f3338', -0.4), C('#2f3338', -0.4));
    // suda parıltılar
    for (let k = 0; k < 40; k++) { const zz = -120 + hsh(k, 41 + s) * 240, xx = s * (40 + hsh(k, 43 + s) * 110); quad(xx - 0.9, zz - 0.06, xx + 0.9, zz + 0.06, C('#ffd9a8', 0.7), -0.69); }
  }
  // ---- yer çizgileri
  for (let z = -18.5; z <= -6.5; z += 3) quad(-0.09, z - 0.9, 0.09, z + 0.9, WH, Y);
  for (let z = 6.5; z <= 18.5; z += 3) quad(-0.09, z - 0.9, 0.09, z + 0.9, WH, Y);
  for (const s of [-1, 1]) {
    quad(-24, s * 22.6 - 0.07, 24, s * 22.6 + 0.07, YL, Y);
    // konteyner sahası park çizgileri
    for (let k = 0; k < 4; k++) { const x0 = s * (12.4 + k * 3); quad(Math.min(x0, x0 + s * 0.1), s * 6.5 - 0.05, Math.max(x0, x0 + s * 0.1), s * 17.5, YL, Y); }
    // depo kapılarının önünde sarı-siyah tarama
    for (let k = 0; k < 8; k++) { const x0 = -2 + k * 0.5; quad(x0, s * 5.25, x0 + 0.25, s * 5.25 + s * 0.6, k % 2 ? BK : YL, Y); }
    for (let k = 0; k < 8; k++) { const z0 = -2 + k * 0.5; quad(s * 7.25, z0, s * 7.25 + s * 0.6, z0 + 0.25, k % 2 ? BK : YL, Y); }
    // üs amblemi
    const tc = C(s < 0 ? '#b8322f' : '#2b5cc4', 0), bg = C(s < 0 ? '#a68e88' : '#8e98aa', 0);
    mb.disc(0, Y, s * 26.5, 2.4, 2.4, 32, tc, tc);
    mb.disc(0, Y + 0.004, s * 26.5, 1.9, 1.9, 32, bg, bg);
    mb.triN([0, Y + 0.008, s * 26.5 - s * 1.3], [-1.0, Y + 0.008, s * 26.5 + s * 0.8], [1.0, Y + 0.008, s * 26.5 + s * 0.8], UP, UP, UP, tc);
  }
  // ---- kutular
  let ci = 0;
  CT_BOXES.forEach((b, bi) => {
    const [x0, y0, z0, x1, y1, z1, t] = b;
    const w = x1 - x0, d = z1 - z0, h = y1 - y0;
    if (t === 0) {
      // çevre: oluklu sac çit, direkler, üstte dikenli tel
      mb.box(x0, y0, z0, x1, y1, z1, C(LPAL.fence, -0.2));
      const lx = w > d;
      if (lx) {
        const zi = z0 < 0 ? z1 : z0, s = z0 < 0 ? 1 : -1;
        for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.8) mb.box(x - 0.12, 0.5, zi, x + 0.12, y1 - 0.2, zi + s * 0.05, C(LPAL.fenceD, -0.2));
        for (let x = -24; x <= 24; x += 6) mb.box(x - 0.18, 0, zi, x + 0.18, y1 + 0.25, zi + s * 0.3, C(LPAL.post, -0.3));
        mb.box(x0, 0, zi, x1, 0.5, zi + s * 0.08, C('#7a7670', 0));
        mb.box(x0, y1, z0 - 0.08, x1, y1 + 0.12, z1 + 0.08, C(LPAL.post, -0.3));
        // takım bayrakları
        const tc = C(z0 < 0 ? '#c53b38' : '#356bd6', 0);
        for (const x of [-15, 0, 15]) { mb.box(x - 0.8, 1.6, zi + s * 0.32, x + 0.8, 4.3, zi + s * 0.35, tc); mb.box(x - 0.9, 4.3, zi + s * 0.28, x + 0.9, 4.42, zi + s * 0.4, C('#3d4148', 0)); }
      } else {
        const xi = x0 < 0 ? x1 : x0, s = x0 < 0 ? 1 : -1;
        for (let z = z0 + 0.4; z < z1 - 0.2; z += 0.8) mb.box(xi, 0.5, z - 0.12, xi + s * 0.05, y1 - 0.2, z + 0.12, C(LPAL.fenceD, -0.2));
        for (let z = -30; z <= 30; z += 6) mb.box(xi, 0, z - 0.18, xi + s * 0.3, y1 + 0.25, z + 0.18, C(LPAL.post, -0.3));
        mb.box(xi, 0, z0, xi + s * 0.08, 0.5, z1, C('#7a7670', 0));
        mb.box(x0 - 0.08, y1, z0, x1 + 0.08, y1 + 0.12, z1, C(LPAL.post, -0.3));
      }
    } else if (t === 1) {
      // beton bariyer duvar: alt bantta sarı-siyah tehlike şeridi
      mb.box(x0, y0, z0, x1, y1, z1, C('#b9b6ae', 0));
      mb.box(x0 - 0.03, y1 - 0.12, z0 - 0.03, x1 + 0.03, y1, z1 + 0.03, C('#9a978f', 0));
      const lx = w > d, len = lx ? w : d, n = Math.max(2, Math.round(len / 0.3));
      for (let k = 0; k < n; k++) {
        const col = k % 2 ? BK : YL, a0 = (lx ? x0 : z0) + (k * len) / n, a1 = a0 + len / n;
        if (lx) { mb.box(a0, 0.2, z0 - 0.02, a1, 0.62, z0, col); mb.box(a0, 0.2, z1, a1, 0.62, z1 + 0.02, col); }
        else { mb.box(x0 - 0.02, 0.2, a0, x0, 0.62, a1, col); mb.box(x1, 0.2, a0, x1 + 0.02, 0.62, a1, col); }
      }
    } else if (t === 2) {
      // tahta sandık
      const wc = C(hsh(bi, 3) > 0.5 ? LPAL.wood : '#c2975c', 0), fr = C(LPAL.woodD, 0), e = 0.075;
      mb.box(x0 + 0.02, y0, z0 + 0.02, x1 - 0.02, y1 - 0.01, z1 - 0.02, wc);
      for (const [a, c2] of [[x0, z0], [x1 - e, z0], [x0, z1 - e], [x1 - e, z1 - e]]) mb.box(a, y0, c2, a + e, y1, c2 + e, fr);
      for (const yy of [y0, y1 - e]) { mb.box(x0, yy, z0, x1, yy + e, z0 + e, fr); mb.box(x0, yy, z1 - e, x1, yy + e, z1, fr); mb.box(x0, yy, z0, x0 + e, yy + e, z1, fr); mb.box(x1 - e, yy, z0, x1, yy + e, z1, fr); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dg = Math.atan2(h, w);
      mb.push().T(cx, cy, z0 - 0.005, 0, 0, dg); mb.box(-Math.hypot(w, h) / 2 + 0.08, -0.05, 0, Math.hypot(w, h) / 2 - 0.08, 0.05, 0.02, fr); mb.pop();
      mb.push().T(cx, cy, z1 + 0.005, 0, 0, -dg); mb.box(-Math.hypot(w, h) / 2 + 0.08, -0.05, -0.02, Math.hypot(w, h) / 2 - 0.08, 0.05, 0, fr); mb.pop();
    } else if (t === 3) {
      limanContainer(mb, x0, y0, z0, x1, y1, z1, LCONT[(ci++ * 5 + 2) % LCONT.length], hsh(bi, 9) > 0.5 ? 1 : 0);
    } else if (t === 5) {
      const lx = w > d, len = lx ? w : d, n = Math.max(1, Math.round(len / 0.62)), bl = len / n, rows = Math.max(1, Math.round(h / 0.275)), rh = h / rows;
      for (let r = 0; r < rows; r++) for (let k = 0; k < n + (r % 2); k++) {
        let a0 = (lx ? x0 : z0) + (k - (r % 2) * 0.5) * bl, a1 = a0 + bl;
        a0 = Math.max(a0, lx ? x0 : z0); a1 = Math.min(a1, lx ? x1 : z1);
        if (a1 - a0 < 0.12) continue;
        const col = C((k + r) % 2 ? LPAL.sand : LPAL.sandD, 0);
        if (lx) mb.rbox(a0 + 0.01, y0 + r * rh, z0, a1 - 0.01, y0 + (r + 1) * rh + 0.02, z1, 0.1, col, 1);
        else mb.rbox(x0, y0 + r * rh, a0 + 0.01, x1, y0 + (r + 1) * rh + 0.02, a1 - 0.01, 0.1, col, 1);
      }
    } else if (t === 6) {
      // çelik iskele platformu: kaymaz sac üst, sarı kenar, çaprazlı yan yüzler
      mb.box(x0, y0, z0, x1, y1 - 0.08, z1, C(LPAL.steelD, -0.4));
      mb.box(x0 - 0.02, y1 - 0.08, z0 - 0.02, x1 + 0.02, y1, z1 + 0.02, C(LPAL.steel, -0.5));
      for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.6) mb.box(x, y1, z0 + 0.1, x + 0.06, y1 + 0.01, z1 - 0.1, C('#6f777f', -0.5));
      for (const [a, b2, c2, e2] of [[x0, z0, x1, z0 + 0.12], [x0, z1 - 0.12, x1, z1], [x0, z0, x0 + 0.12, z1], [x1 - 0.12, z0, x1, z1]]) mb.box(a, y1 - 0.01, b2, c2, y1 + 0.012, e2, YL);
      if (h > 1) {
        // korkuluk (deniz tarafı ve arka): ince boru, çarpışmasız
        const xs = x0 > 0 ? x1 - 0.06 : x0 + 0.06;
        for (let z = z0 + 0.2; z <= z1 - 0.1; z += 1.9) mb.cyl(xs, y1, z, 0.03, y1 + 1.0, 0.03, 6, YL, YL);
        mb.push().T(xs, y1 + 1.0, z0 + 0.2, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.035, z1 - z0 - 0.3, 0.035, 6, YL, YL); mb.pop();
        mb.push().T(xs, y1 + 0.5, z0 + 0.2, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.03, z1 - z0 - 0.3, 0.03, 6, YL, YL); mb.pop();
      }
    } else if (t === 8) {
      // depo duvarı: oluklu sac, beton taban, üstte kenar sacı
      mb.box(x0, y0, z0, x1, y1, z1, C(LPAL.shed, -0.15));
      mb.box(x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.55, z1 + 0.03, C('#8e8b84', 0));
      mb.box(x0 - 0.05, y1 - 0.18, z0 - 0.05, x1 + 0.05, y1, z1 + 0.05, C(LPAL.shedB, -0.3));
      const lx = w > d, len = lx ? w : d;
      for (let a = 0.2; a < len - 0.1; a += 0.42) {
        const col = C(LPAL.shedD, -0.15);
        if (lx) { mb.box(x0 + a, 0.55, z0 - 0.04, x0 + a + 0.16, y1 - 0.18, z0, col); mb.box(x0 + a, 0.55, z1, x0 + a + 0.16, y1 - 0.18, z1 + 0.04, col); }
        else { mb.box(x0 - 0.04, 0.55, z0 + a, x0, y1 - 0.18, z0 + a + 0.16, col); mb.box(x1, 0.55, z0 + a, x1 + 0.04, y1 - 0.18, z0 + a + 0.16, col); }
      }
      // kapı kenarına sarı-siyah koruma direği (kapıya bakan uçta)
      const ends = lx ? [[x0, 1], [x1, -1]] : [[z0, 1], [z1, -1]];
      for (const [e, sgn] of ends) {
        if (Math.abs(e) > 2.5) continue;
        for (let k = 0; k < 8; k++) {
          const col = k % 2 ? BK : YL, yy = k * 0.5;
          if (lx) mb.box(e - (sgn > 0 ? 0.06 : 0), yy, z0 - 0.06, e + (sgn > 0 ? 0 : 0.06), yy + 0.5, z1 + 0.06, col);
          else mb.box(x0 - 0.06, yy, e - (sgn > 0 ? 0.06 : 0), x1 + 0.06, yy + 0.5, e + (sgn > 0 ? 0 : 0.06), col);
        }
      }
    } else if (t === 9) {
      // çatı: üstte oluklar ve ışıklıklar, altta kirişler ve sarkan lambalar
      mb.box(x0, y0, z0, x1, y1, z1, C(LPAL.roof, -0.3));
      for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.5) mb.box(x, y1, z0, x + 0.12, y1 + 0.06, z1, C(LPAL.roofD, -0.3));
      for (const zz of [-2.6, 2.6]) mb.box(-4, y1 + 0.02, zz - 0.8, 4, y1 + 0.09, zz + 0.8, C('#cfe3ef', -0.8));
      for (let x = x0 + 1.2; x < x1 - 0.5; x += 2.4) mb.box(x - 0.09, y0 - 0.32, z0 + 0.4, x + 0.09, y0, z1 - 0.4, C(LPAL.steel, -0.4));
      mb.box(x0 + 0.4, y0 - 0.25, -0.09, x1 - 0.4, y0, 0.09, C(LPAL.steel, -0.4));
      for (const [lx2, lz2] of [[-4.5, -2.6], [4.5, 2.6], [-4.5, 2.6], [4.5, -2.6], [0, -3.2], [0, 3.2]]) {
        mb.cyl(lx2, y0 - 0.9, lz2, 0.012, y0, 0.012, 4, C('#2f3338', -0.4), C('#2f3338', -0.4));
        mb.cyl(lx2, y0 - 1.15, lz2, 0.36, y0 - 0.9, 0.12, 12, C('#3d434a', -0.5), C('#3d434a', -0.5));
        mb.box(lx2 - 0.22, y0 - 1.18, lz2 - 0.22, lx2 + 0.22, y0 - 1.14, lz2 + 0.22, C('#fff1c9', 1));
      }
    } else if (t === 10) {
      // raf: turuncu dikmeler, üç kat, kolilerle dolu; ortada tel arka panel
      const OR = C(LPAL.rack, -0.2), SH = C('#7b838c', -0.4);
      for (const xx of [x0, x1 - 0.08]) for (const zz of [z0, z1 - 0.08]) mb.box(xx, y0, zz, xx + 0.08, y1, zz + 0.08, OR);
      for (const yy of [0.12, 0.92, 1.72]) mb.box(x0, yy, z0, x1, yy + 0.06, z1, SH);
      mb.box(x0 + 0.05, y0, (z0 + z1) / 2 - 0.01, x1 - 0.05, y1, (z0 + z1) / 2 + 0.01, C('#3c4248', -0.5));
      for (const [yy, hh] of [[0.18, 0.7], [0.98, 0.68], [1.78, 0.6]]) for (let k = 0; k < 4; k++) for (const sz of [-1, 1]) {
        const bx0 = x0 + 0.12 + k * ((w - 0.24) / 4), bx1 = bx0 + (w - 0.24) / 4 - 0.06, zz0 = sz < 0 ? z0 + 0.06 : (z0 + z1) / 2 + 0.03, zz1 = sz < 0 ? (z0 + z1) / 2 - 0.03 : z1 - 0.06;
        const hh2 = hh * (0.7 + hsh(k * 7 + yy * 10, sz + 3) * 0.3);
        mb.box(bx0, yy, zz0, bx1, yy + hh2, zz1, C(hsh(k, yy * 10) > 0.3 ? LPAL.box : '#9a7a4e', 0));
        mb.box(bx0 + (bx1 - bx0) * 0.45, yy + hh2, zz0, bx0 + (bx1 - bx0) * 0.55, yy + hh2 + 0.004, zz1, C('#d9cfa8', 0));
      }
    } else {
      mb.box(x0, y0, z0, x1, y1, z1, C('#9c9a94', 0));
    }
  });
  // ---- direkli projektörler (arena köşeleri ve kenarlar; çarpışmasız, ince)
  const pole = (x, z, dx, dz) => {
    mb.cyl(x, 0, z, 0.12, 9, 0.08, 8, C('#4a5058', -0.5), C('#4a5058', -0.5));
    mb.box(x - 0.7, 9, z - 0.12, x + 0.7, 9.15, z + 0.12, C('#4a5058', -0.5));
    for (const o of [-0.45, 0, 0.45]) { mb.box(x + o - 0.18, 8.75, z - 0.14 + dz * 0.1, x + o + 0.18, 9.05, z + 0.14 + dz * 0.1, C('#2f3338', -0.4)); mb.box(x + o - 0.14, 8.79, z + dz * 0.25 - 0.02, x + o + 0.14, 9.01, z + dz * 0.25 + 0.02, C('#fff4d6', 1)); }
    void dx;
  };
  for (const s of [-1, 1]) { pole(s * 23.7, s * -29.7, -s, s); pole(s * -23.7, s * 29.7, s, -s); pole(s * 23.7, s * 8, -s, 0); }
  // ---- arena dışı: istif konteynerler (kuzey ve güney), vinçler, yük gemisi, uzak kıyı
  for (const s of [-1, 1]) for (let row = 0; row < 3; row++) for (let k = 0; k < 7; k++) {
    const cx = -19.2 + k * 6.4 + (row % 2) * 1.2, cz = s * (34 + row * 3.4), n = 1 + Math.floor(hsh(k * 3 + row, s + 7) * 4);
    for (let q = 0; q < n; q++) limanContainer(mb, cx - 3.05, q * 2.6, cz - 1.3, cx + 3.05, (q + 1) * 2.6, cz + 1.3, LCONT[(k * 3 + row * 5 + q * 7 + (s > 0 ? 1 : 0)) % LCONT.length], 0, true);
  }
  limanCrane(mb, 30.5, -26, 1); limanCrane(mb, 30.5, 14, 1); limanCrane(mb, -30.5, 34, -1);
  // yük gemisi (doğu rıhtımına yanaşmış)
  {
    const gx0 = 38.5, gx1 = 60, gz0 = -70, gz1 = 48, H1 = C(LPAL.hull, -0.3), HR = C(LPAL.hullR, -0.2), DK = C('#6d7076', -0.3);
    mb.box(gx0, -0.7, gz0, gx1, 9, gz1, H1);
    mb.box(gx0 - 0.02, -0.7, gz0 - 0.02, gx1 + 0.02, 1.2, gz1 + 0.02, HR);
    mb.box(gx0 - 0.03, 8.6, gz0, gx1 + 0.03, 9.1, gz1, C('#e9e5da', 0));
    // pruva: daralan uç
    mb.triN([gx0, 9, gz1], [(gx0 + gx1) / 2, 9, gz1 + 12], [gx1, 9, gz1], UP, UP, UP, DK);
    mb.quadN([gx0, -0.7, gz1], [(gx0 + gx1) / 2, -0.7, gz1 + 12], [(gx0 + gx1) / 2, 9, gz1 + 12], [gx0, 9, gz1], [-0.7, 0, 0.7], [-0.7, 0, 0.7], [-0.7, 0, 0.7], [-0.7, 0, 0.7], H1);
    mb.quadN([gx1, -0.7, gz1], [gx1, 9, gz1], [(gx0 + gx1) / 2, 9, gz1 + 12], [(gx0 + gx1) / 2, -0.7, gz1 + 12], [0.7, 0, 0.7], [0.7, 0, 0.7], [0.7, 0, 0.7], [0.7, 0, 0.7], H1);
    // güvertede konteyner istifleri
    for (let bay = 0; bay < 11; bay++) for (let col = 0; col < 7; col++) {
      const cz = gz0 + 22 + bay * 7.8, cx = gx0 + 1.6 + col * 2.75, n = 2 + Math.floor(hsh(bay * 11 + col, 5) * 4);
      if (cz > gz1 - 5) continue;
      const col2 = LCONT[(bay * 7 + col * 3) % LCONT.length];
      mb.box(cx - 1.3, 9.1, cz - 3.05, cx + 1.3, 9.1 + n * 2.6, cz + 3.05, C(col2, -0.25));
      for (let q = 1; q < n; q++) mb.box(cx - 1.32, 9.1 + q * 2.6 - 0.06, cz - 3.07, cx + 1.32, 9.1 + q * 2.6 + 0.06, cz + 3.07, shade(C(col2, -0.25), 0.7));
    }
    // köprü üstü (kıçta)
    mb.box(gx0 + 2, 9.1, gz0 + 3, gx1 - 2, 23, gz0 + 15, C('#efece4', 0));
    for (let yy = 12; yy < 23; yy += 2.7) mb.box(gx0 + 1.98, yy, gz0 + 4, gx0 + 2.0, yy + 1.1, gz0 + 14, C('#3d5b78', -0.9));
    mb.box(gx0, 23, gz0 + 2, gx1, 23.6, gz0 + 16, C('#d8d4ca', 0));
    mb.box((gx0 + gx1) / 2 - 1.2, 23.6, gz0 + 8, (gx0 + gx1) / 2 + 1.2, 29, gz0 + 10.5, C(LPAL.hullR, -0.2));
  }
  // uzak kıyı: tepeler ve şehir silüeti (sis içinde)
  for (let k = 0; k < 26; k++) {
    const side = k % 2 ? 1 : -1, a = hsh(k, 61), hh = 8 + hsh(k, 62) * 20, ww = 10 + hsh(k, 63) * 16;
    const cz = side * (120 + hsh(k, 64) * 40), cx = -150 + a * 300;
    mb.box(cx - ww / 2, -0.7, cz - 6, cx + ww / 2, hh, cz + 6, C(['#c9a98d', '#b7967f', '#d1b49a', '#a98d7a'][k % 4], 0));
  }
}
/* ============================ yeni haritalar için ortak çizim takımı ============================ */
// Yalnızca görünüş: çarpışma kutuları ortak tanımdan (CT_BOXES) gelir.
function mkQuad(mb, x0, z0, x1, z1, col, y = 0) { mb.quadN([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], UP, UP, UP, UP, col); }
// yatay silindir: eksen 'x' ya da 'z' boyunca, merkez (x, y, z)
function mkHCyl(mb, x, y, z, ax, len, r, col, seg = 12, colCap = col) {
  mb.push().T(x, y, z, ax === 'x' ? Math.PI / 2 : 0, Math.PI / 2);
  mb.cyl(0, -len / 2, 0, r, len / 2, r, seg, col, colCap);
  mb.pop();
}
// tahta sandık: çerçeve, çapraz kuşak
function mkCrate(mb, b, bi, wa, wb, fr) {
  const [x0, y0, z0, x1, y1, z1] = b, w = x1 - x0, h = y1 - y0, e = 0.075;
  const wc = C(hsh(bi, 3) > 0.5 ? wa : wb, 0), fc = C(fr, 0);
  mb.box(x0 + 0.02, y0, z0 + 0.02, x1 - 0.02, y1 - 0.01, z1 - 0.02, wc);
  for (const [a, c2] of [[x0, z0], [x1 - e, z0], [x0, z1 - e], [x1 - e, z1 - e]]) mb.box(a, y0, c2, a + e, y1, c2 + e, fc);
  for (const yy of [y0, y1 - e]) { mb.box(x0, yy, z0, x1, yy + e, z0 + e, fc); mb.box(x0, yy, z1 - e, x1, yy + e, z1, fc); mb.box(x0, yy, z0, x0 + e, yy + e, z1, fc); mb.box(x1 - e, yy, z0, x1, yy + e, z1, fc); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dg = Math.atan2(h, w), L = Math.hypot(w, h) / 2 - 0.08;
  mb.push().T(cx, cy, z0 - 0.005, 0, 0, dg); mb.box(-L, -0.05, 0, L, 0.05, 0.02, fc); mb.pop();
  mb.push().T(cx, cy, z1 + 0.005, 0, 0, -dg); mb.box(-L, -0.05, -0.02, L, 0.05, 0, fc); mb.pop();
}
// kum torbası sırası (uzun eksen boyunca, şaşırtmalı)
function mkBags(mb, b, ca, cb) {
  const [x0, y0, z0, x1, y1, z1] = b, w = x1 - x0, d = z1 - z0, h = y1 - y0;
  const lx = w > d, len = lx ? w : d, n = Math.max(1, Math.round(len / 0.62)), bl = len / n, rows = Math.max(1, Math.round(h / 0.275)), rh = h / rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k < n + (r % 2); k++) {
    let a0 = (lx ? x0 : z0) + (k - (r % 2) * 0.5) * bl, a1 = a0 + bl;
    a0 = Math.max(a0, lx ? x0 : z0); a1 = Math.min(a1, lx ? x1 : z1);
    if (a1 - a0 < 0.12) continue;
    const col = C((k + r) % 2 ? ca : cb, 0);
    if (lx) mb.rbox(a0 + 0.01, y0 + r * rh, z0, a1 - 0.01, y0 + (r + 1) * rh + 0.02, z1, 0.1, col, 1);
    else mb.rbox(x0, y0 + r * rh, a0 + 0.01, x1, y0 + (r + 1) * rh + 0.02, a1 - 0.01, 0.1, col, 1);
  }
}
// yerde ışık havuzu: iç içe, kendinden ışıklı halkalar (gece lambaların altı)
const MK_J = [1, 0.93, 1.05, 0.97, 1.02, 0.9, 1.04, 0.96, 1, 0.94, 1.06, 0.98];
function mkPool(mb, x, z, r, cols, y = 0.012) {
  cols.forEach((c, k) => { const rr = r * (1 - k * 0.3); mb.disc(x, y + k * 0.002, z, rr, rr, 24, C(c, 1), C(c, 1), MK_J); });
}
// direkli lamba: (dx, dz) kol yönü (eksene paralel), glow ışık rengi
function mkLamp(mb, x, z, h, dx, dz, glow) {
  const P = C('#30353c', -0.4);
  mb.cyl(x, 0, z, 0.09, h, 0.06, 8, P, P);
  mb.box(Math.min(x, x + dx) - 0.03, h - 0.06, Math.min(z, z + dz) - 0.03, Math.max(x, x + dx) + 0.03, h, Math.max(z, z + dz) + 0.03, P);
  const lx = x + dx * 0.95, lz = z + dz * 0.95;
  mb.box(lx - 0.28, h - 0.2, lz - 0.16, lx + 0.28, h - 0.02, lz + 0.16, P);
  mb.box(lx - 0.24, h - 0.24, lz - 0.12, lx + 0.24, h - 0.2, lz + 0.12, C(glow, 1));
}
// köknar: katmanlı koniler, isteğe bağlı kar uçları
function mkPine(mb, x, z, h, snow) {
  const T1 = C('#5b4330', 0), G1 = C('#2f5a3f', 0), G2 = C('#264b35', 0), SN = C('#eef3f7', 0);
  mb.cyl(x, 0, z, 0.2, h * 0.3, 0.14, 6, T1, T1);
  for (let i = 0; i < 4; i++) {
    const y0 = h * (0.16 + i * 0.19), r = h * (0.33 - i * 0.065), y1 = y0 + h * 0.36, g = i % 2 ? G1 : G2;
    mb.cyl(x, y0, z, r, y1, 0, 8, g, g, 'b');
    if (snow) mb.cyl(x, y1 - h * 0.12, z, r * 0.37, y1 + 0.03, 0, 8, SN, SN, '');
  }
}
/* ============================ Fabrika haritası görselleri (gece) ============================ */
const FPAL = {
  asph: '#3d4148', floor: '#6a665f', conc: '#77736c', concD: '#5c5953', brick: '#8b4b37', brickD: '#6a3727',
  steel: '#5a626b', steelD: '#3a4048', mach: '#4d6a5b', machD: '#36493f', yel: '#e9b93a', blk: '#26282c',
  tank: '#a9b1b9', wood: '#9a6f45', woodB: '#ad8150', woodD: '#5b4128', sodium: '#ffbf6e', tube: '#eef4ff'
};
const FDRUM = ['#2f5f9e', '#a8392f', '#d39a2c', '#3c7d4f', '#59616b'];
// tuğla duvar: gövde, harç bantları, beton taban, üst başlık; pencereler gece yanar
function fabBrick(mb, x0, y0, z0, x1, y1, z1, wins) {
  const w = x1 - x0, d = z1 - z0, lx = w > d, len = lx ? w : d, BD = C(FPAL.brickD, 0);
  mb.box(x0, y0, z0, x1, y1, z1, C(FPAL.brick, 0));
  for (let y = y0 + 0.95; y < y1 - 0.4; y += 0.62) mb.box(x0 - 0.012, y, z0 - 0.012, x1 + 0.012, y + 0.035, z1 + 0.012, BD);
  mb.box(x0 - 0.03, y0, z0 - 0.03, x1 + 0.03, y0 + 0.5, z1 + 0.03, C(FPAL.conc, 0));
  mb.box(x0 - 0.06, y1 - 0.14, z0 - 0.06, x1 + 0.06, y1, z1 + 0.06, C(FPAL.concD, 0));
  // payandalar
  for (let a = 1.5; a < len - 0.6; a += 3) {
    if (lx) mb.box(x0 + a - 0.16, y0, z0 - 0.1, x0 + a + 0.16, y1 - 0.14, z1 + 0.1, BD);
    else mb.box(x0 - 0.1, y0, z0 + a - 0.16, x1 + 0.1, y1 - 0.14, z0 + a + 0.16, BD);
  }
  if (!wins) return;
  // çelik çerçeveli üst pencereler (iki yüzde)
  const n = Math.max(1, Math.floor((len - 0.6) / 2.3)), step = len / n, FR = C('#2b3036', -0.4), GL = C('#f2d9a8', 0.5);
  for (let k = 0; k < n; k++) {
    const c = (lx ? x0 : z0) + step * (k + 0.5), a0 = c - 0.72, a1 = c + 0.72, wy0 = y0 + 2.35, wy1 = y0 + 3.6;
    if (lx) {
      mb.box(a0 - 0.06, wy0 - 0.06, z0 - 0.05, a1 + 0.06, wy1 + 0.06, z1 + 0.05, FR);
      mb.box(a0, wy0, z0 - 0.07, a1, wy1, z1 + 0.07, GL);
      for (const q of [c - 0.24, c + 0.24]) mb.box(q - 0.025, wy0, z0 - 0.09, q + 0.025, wy1, z1 + 0.09, FR);
      mb.box(a0, (wy0 + wy1) / 2 - 0.025, z0 - 0.09, a1, (wy0 + wy1) / 2 + 0.025, z1 + 0.09, FR);
    } else {
      mb.box(x0 - 0.05, wy0 - 0.06, a0 - 0.06, x1 + 0.05, wy1 + 0.06, a1 + 0.06, FR);
      mb.box(x0 - 0.07, wy0, a0, x1 + 0.07, wy1, a1, GL);
      for (const q of [c - 0.24, c + 0.24]) mb.box(x0 - 0.09, wy0, q - 0.025, x1 + 0.09, wy1, q + 0.025, FR);
      mb.box(x0 - 0.09, (wy0 + wy1) / 2 - 0.025, a0, x1 + 0.09, (wy0 + wy1) / 2 + 0.025, a1, FR);
    }
  }
}
// sarı-siyah tehlike şeridi: yatay bant (kutunun dört yüzünde)
function fabHazard(mb, x0, z0, x1, z1, ya, yb) {
  const YL = C(FPAL.yel, 0), BK = C(FPAL.blk, 0), seg = 0.32;
  const run = (a0, a1, f) => { const n = Math.max(2, Math.round((a1 - a0) / seg)); for (let k = 0; k < n; k++) f(a0 + ((a1 - a0) * k) / n, a0 + ((a1 - a0) * (k + 1)) / n, k % 2 ? BK : YL); };
  run(x0, x1, (a, b, c) => { mb.box(a, ya, z0 - 0.012, b, yb, z0, c); mb.box(a, ya, z1, b, yb, z1 + 0.012, c); });
  run(z0, z1, (a, b, c) => { mb.box(x0 - 0.012, ya, a, x0, yb, b, c); mb.box(x1, ya, a, x1 + 0.012, yb, b, c); });
}
function fabPanel(mb, x, y, z, nx, nz) {
  // kontrol paneli: koyu çerçeve, ışıklı ekran, düğmeler (yüzü nx/nz yönüne bakar)
  const F = C('#22262b', -0.3), SC = C('#79e0ff', 1), R1 = C('#ff4d3d', 1), G1 = C('#5dff8a', 1);
  if (nx) {
    const s = nx;
    mb.box(x, y, z - 0.32, x + s * 0.04, y + 0.46, z + 0.32, F);
    mb.box(x + s * 0.04, y + 0.2, z - 0.24, x + s * 0.05, y + 0.4, z + 0.04, SC);
    mb.box(x + s * 0.04, y + 0.06, z + 0.1, x + s * 0.06, y + 0.12, z + 0.16, R1); mb.box(x + s * 0.04, y + 0.06, z + 0.2, x + s * 0.06, y + 0.12, z + 0.26, G1);
  } else {
    const s = nz;
    mb.box(x - 0.32, y, z, x + 0.32, y + 0.46, z + s * 0.04, F);
    mb.box(x - 0.24, y + 0.2, z + s * 0.04, x + 0.04, y + 0.4, z + s * 0.05, SC);
    mb.box(x + 0.1, y + 0.06, z + s * 0.04, x + 0.16, y + 0.12, z + s * 0.06, R1); mb.box(x + 0.2, y + 0.06, z + s * 0.04, x + 0.26, y + 0.12, z + s * 0.06, G1);
  }
}
function buildFabrika(mb) {
  const quad = (x0, z0, x1, z1, col, y = 0) => mkQuad(mb, x0, z0, x1, z1, col, y);
  const Y = 0.018, WH = C('#d9d6cc', 0), YL = C(FPAL.yel, 0), BK = C(FPAL.blk, 0);
  const SOD = ['#43342a', '#66492f', '#8d6638'], TUB = ['#40464f', '#555c67', '#6d7581'];
  // ---- zemin: üsler, asfalt avlu, salon betonu, dış saha
  quad(-23, -31, 23, -24, C('#5e4c49', 0)); quad(-23, 24, 23, 31, C('#4b5364', 0));
  quad(-23, -24, 23, 24, C(FPAL.asph, 0));
  quad(-9, -7, 9, 7, C(FPAL.floor, 0), 0.004);
  quad(-160, -160, 160, 160, C('#2d3036', 0), -0.03);
  // asfalt yamaları ve su birikintileri (ay ışığında parlar)
  for (let k = 0; k < 12; k++) {
    const s = k % 2 ? 1 : -1, x = s * (3 + hsh(k, 5) * 18), z = s * (8 + hsh(k, 6) * 14), r = 0.8 + hsh(k, 7) * 1.4;
    if (Math.abs(x) < 9.5 && Math.abs(z) < 7.5) continue;
    mb.disc(x, 0.006, z, r * 1.5, r, 14, C('#34383e', 0), C('#34383e', 0), MK_J);
    if (k % 3 === 0) mb.disc(x + 0.2, 0.009, z, r * 0.9, r * 0.55, 14, C('#20242a', -0.9), C('#20242a', -0.9), MK_J);
  }
  // ---- yer çizgileri: salon içi yürüme yolu, presin çevresi, avlu şeritleri
  for (const s of [-1, 1]) {
    quad(-8.4, s * 6.4 - 0.05, 8.4, s * 6.4 + 0.05, YL, Y); quad(s * 8.4 - 0.05, -6.4, s * 8.4 + 0.05, 6.4, YL, Y);
    // üs önü çizgisi ve oklar
    quad(-22.6, s * 23.2 - 0.07, 22.6, s * 23.2 + 0.07, C(s < 0 ? '#c9453f' : '#3d6fd0', 0), Y);
    for (const x of [-15, 0, 15]) mb.triN([x, Y, s * 21.2], [x - 0.8, Y, s * 22.3], [x + 0.8, Y, s * 22.3], UP, UP, UP, WH);
    // yükleme rampası park çizgileri (batı avlu)
    for (let k = 0; k < 4; k++) { const z0 = s * (10.5 + k * 2.6); quad(s * 22.6, Math.min(z0, z0 + s * 0.1), s * 18.5, Math.max(z0, z0 + s * 0.1), WH, Y); }
    // kazan dairesi: taramalı tehlike alanı
    for (let k = 0; k < 9; k++) { const z0 = s * (12 + k * 0.9); quad(Math.min(-s * 15.2, -s * 16.6), Math.min(z0, z0 + s * 0.45), Math.max(-s * 15.2, -s * 16.6), Math.max(z0, z0 + s * 0.45), k % 2 ? BK : YL, Y); }
    // üs amblemi
    const tc = C(s < 0 ? '#b8322f' : '#2b5cc4', 0), bg = C(s < 0 ? '#5e4c49' : '#4b5364', 0);
    mb.disc(0, Y, s * 27.6, 2.2, 2.2, 32, tc, tc); mb.disc(0, Y + 0.004, s * 27.6, 1.75, 1.75, 32, bg, bg);
    mb.triN([0, Y + 0.008, s * 27.6 - s * 1.2], [-0.95, Y + 0.008, s * 27.6 + s * 0.75], [0.95, Y + 0.008, s * 27.6 + s * 0.75], UP, UP, UP, tc);
  }
  fabHazardFloor(mb, -2.2, -2.2, 2.2, 2.2, Y);
  // ---- kutular
  let ci = 0;
  CT_BOXES.forEach((b, bi) => {
    const [x0, y0, z0, x1, y1, z1, t] = b;
    const w = x1 - x0, d = z1 - z0, h = y1 - y0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (t === 0) {
      // çevre: prefabrik beton paneller, üstte dikenli tel, iç yüzde projektörler
      mb.box(x0, y0, z0, x1, y1, z1, C('#66635d', 0));
      const lx = w > d;
      const zi = lx ? (z0 < 0 ? z1 : z0) : 0, xi = lx ? 0 : (x0 < 0 ? x1 : x0), s = lx ? (z0 < 0 ? 1 : -1) : (x0 < 0 ? 1 : -1);
      const a0 = lx ? x0 : z0, a1 = lx ? x1 : z1, J = C('#4b4944', 0), P = C('#2c3035', -0.3);
      for (let a = Math.ceil(a0 / 3) * 3; a < a1; a += 3) {
        if (lx) mb.box(a - 0.05, 0, zi, a + 0.05, y1, zi + s * 0.02, J); else mb.box(xi, 0, a - 0.05, xi + s * 0.02, y1, a + 0.05, J);
        if (lx) mb.box(a - 0.04, y1, zi - s * 0.3, a + 0.04, y1 + 0.75, zi - s * 0.22, P); else mb.box(xi - s * 0.3, y1, a - 0.04, xi - s * 0.22, y1 + 0.75, a + 0.04, P);
      }
      if (lx) { mkHCyl(mb, 0, y1 + 0.55, zi - s * 0.26, 'x', a1 - a0, 0.16, C('#3a3e44', -0.5), 6); mb.box(x0, y1, z0 - 0.05, x1, y1 + 0.1, z1 + 0.05, C('#57544e', 0)); }
      else { mkHCyl(mb, xi - s * 0.26, y1 + 0.55, 0, 'z', a1 - a0, 0.16, C('#3a3e44', -0.5), 6); mb.box(x0 - 0.05, y1, z0, x1 + 0.05, y1 + 0.1, z1, C('#57544e', 0)); }
      // projektörler
      const L = lx ? [-14, 0, 14] : [-20, -8, 8, 20];
      for (const a of L) {
        if (lx) { mb.box(a - 0.35, 4.05, zi, a + 0.35, 4.45, zi + s * 0.32, P); mb.box(a - 0.28, 4.08, zi + s * 0.32, a + 0.28, 4.4, zi + s * 0.34, C(FPAL.sodium, 1)); mkPool(mb, a, zi + s * 3.2, 4.2, SOD); }
        else { mb.box(xi, 4.05, a - 0.35, xi + s * 0.32, 4.45, a + 0.35, P); mb.box(xi + s * 0.32, 4.08, a - 0.28, xi + s * 0.34, 4.4, a + 0.28, C(FPAL.sodium, 1)); mkPool(mb, xi + s * 3.2, a, 4.2, SOD); }
      }
    } else if (t === 7) {
      // üs önü: oluklu sac çit, takım renginde ışık şeridi
      const tc = z0 < 0 ? '#c53b38' : '#356bd6', lx = w > d;
      mb.box(x0, y0, z0, x1, y1, z1, C('#4f565e', -0.2));
      for (let a = (lx ? x0 : z0) + 0.2; a < (lx ? x1 : z1) - 0.1; a += 0.34) {
        if (lx) { mb.box(a, 0.3, z0 - 0.03, a + 0.12, y1 - 0.3, z0, C('#3e444b', -0.2)); mb.box(a, 0.3, z1, a + 0.12, y1 - 0.3, z1 + 0.03, C('#3e444b', -0.2)); }
      }
      mb.box(x0 - 0.02, y1 - 0.3, z0 - 0.04, x1 + 0.02, y1 - 0.14, z1 + 0.04, C(tc, 0));
      mb.box(x0 + 0.05, y1 - 0.12, z0 - 0.045, x1 - 0.05, y1 - 0.06, z1 + 0.045, C(tc, 0.95));
      mb.box(x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.3, z1 + 0.03, C('#3a3e44', 0));
    } else if (t === 8) {
      fabBrick(mb, x0, y0, z0, x1, y1, z1, true);
      // kapı kenarlarında sarı-siyah koruma direkleri
      const lx = w > d, ends = lx ? [[x0, 1], [x1, -1]] : [[z0, 1], [z1, -1]];
      for (const [e, sg] of ends) {
        if (lx ? Math.abs(e) > 8.9 : Math.abs(e) > 6.9) continue;
        for (let k = 0; k < 8; k++) {
          const col = k % 2 ? BK : YL, yy = k * 0.45;
          if (lx) mb.box(e - (sg > 0 ? 0.07 : 0), yy, z0 - 0.07, e + (sg > 0 ? 0 : 0.07), yy + 0.45, z1 + 0.07, col);
          else mb.box(x0 - 0.07, yy, e - (sg > 0 ? 0.07 : 0), x1 + 0.07, yy + 0.45, e + (sg > 0 ? 0 : 0.07), col);
        }
      }
    } else if (t === 9) {
      fabRoof(mb, x0, y0, z0, x1, y1, z1, TUB);
    } else if (t === 1) {
      fabBrick(mb, x0, y0, z0, x1, y1, z1, false);
      // yağmur borusu
      const P = C('#4a5058', -0.5);
      mb.cyl(cx + (w > d ? 0 : (x0 < 0 ? -1 : 1) * 0.42), 0, cz + (w > d ? 0.42 : 0), 0.06, y1 + 0.1, 0.06, 6, P, P);
    } else if (t === 2) {
      mkCrate(mb, b, bi, FPAL.wood, FPAL.woodB, FPAL.woodD);
      if (y0 < 0.01) mb.box(x0 - 0.04, 0, z0 - 0.04, x1 + 0.04, 0.12, z1 + 0.04, C('#6b5236', 0));
    } else if (t === 3) {
      limanContainer(mb, x0, y0, z0, x1, y1, z1, ['#6d3128', '#2c4a6c', '#51603a'][ci++ % 3], hsh(bi, 9) > 0.5 ? 1 : 0);
    } else if (t === 5) {
      // beton bariyerler: üstü daralan bloklar, altta sarı-siyah bant
      const lx = w > d, len = lx ? w : d, n = Math.max(1, Math.round(len / 1.9)), bl = len / n, G1 = C('#a19d94', 0);
      for (let k = 0; k < n; k++) {
        const a0 = (lx ? x0 : z0) + k * bl + 0.03, a1 = a0 + bl - 0.06;
        if (lx) mb.frustum(a0, a1, z0, z1, y0, a0, a1, cz - d * 0.18, cz + d * 0.18, y1, G1, C('#b3afa6', 0));
        else mb.frustum(x0, x1, a0, a1, y0, cx - w * 0.18, cx + w * 0.18, a0, a1, y1, G1, C('#b3afa6', 0));
      }
      fabHazard(mb, x0, z0, x1, z1, 0.06, 0.24);
    } else if (t === 6) {
      // çelik iskele: kaymaz sac, sarı kenar, çaprazlı yan, deniz tarafında korkuluk
      mb.box(x0, y0, z0, x1, y1 - 0.08, z1, C(FPAL.steelD, -0.3));
      mb.box(x0 - 0.02, y1 - 0.08, z0 - 0.02, x1 + 0.02, y1, z1 + 0.02, C(FPAL.steel, -0.5));
      for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.6) mb.box(x, y1, z0 + 0.1, x + 0.06, y1 + 0.01, z1 - 0.1, C('#6f777f', -0.5));
      for (const [a, b2, c2, e2] of [[x0, z0, x1, z0 + 0.12], [x0, z1 - 0.12, x1, z1], [x0, z0, x0 + 0.12, z1], [x1 - 0.12, z0, x1, z1]]) mb.box(a, y1 - 0.01, b2, c2, y1 + 0.012, e2, YL);
      if (h > 1) {
        const xs = x0 > 0 ? x1 - 0.06 : x0 + 0.06;
        for (let z = z0 + 0.2; z <= z1 - 0.1; z += 1.4) mb.cyl(xs, y1, z, 0.03, y1 + 1.0, 0.03, 6, YL, YL);
        mb.push().T(xs, y1 + 1.0, z0 + 0.2, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.035, z1 - z0 - 0.3, 0.035, 6, YL, YL); mb.pop();
        mb.push().T(xs, y1 + 0.5, z0 + 0.2, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.03, z1 - z0 - 0.3, 0.03, 6, YL, YL); mb.pop();
        // yan yüzlerde çapraz kuşak
        const XB = C('#4d545c', -0.3);
        for (const zz of [z0 - 0.01, z1 + 0.01]) for (let x = x0 + 0.1; x < x1 - 0.5; x += 1.5) { mb.push().T(x + 0.75, (y0 + y1 - 0.08) / 2, zz, 0, 0, 0.6); mb.box(-0.8, -0.04, -0.01, 0.8, 0.04, 0.01, XB); mb.pop(); }
      }
    } else if (t === 13) {
      if (w > 3 && d > 3) fabPress(mb, x0, z0, x1, y1, z1);
      else fabMachine(mb, x0, z0, x1, y1, z1, bi);
    } else if (t === 14) {
      // taşıma bandı: ayaklar, sarı yan çerçeve, kauçuk bant, uç makaraları, üstünde koliler
      const lx = w > d, ST = C(FPAL.steelD, -0.4), YC = C(FPAL.yel, -0.2);
      const legs = lx ? [x0 + 0.15, cx, x1 - 0.15] : [z0 + 0.15, cz, z1 - 0.15];
      for (const a of legs) {
        if (lx) { mb.box(a - 0.05, 0, z0 + 0.08, a + 0.05, y1 - 0.2, z0 + 0.18, ST); mb.box(a - 0.05, 0, z1 - 0.18, a + 0.05, y1 - 0.2, z1 - 0.08, ST); mb.box(a - 0.04, 0.25, z0 + 0.1, a + 0.04, 0.32, z1 - 0.1, ST); }
        else { mb.box(x0 + 0.08, 0, a - 0.05, x0 + 0.18, y1 - 0.2, a + 0.05, ST); mb.box(x1 - 0.18, 0, a - 0.05, x1 - 0.08, y1 - 0.2, a + 0.05, ST); }
      }
      if (lx) { mb.box(x0, y1 - 0.26, z0, x1, y1 - 0.04, z0 + 0.09, YC); mb.box(x0, y1 - 0.26, z1 - 0.09, x1, y1 - 0.04, z1, YC); mb.box(x0 + 0.06, y1 - 0.12, z0 + 0.09, x1 - 0.06, y1 - 0.05, z1 - 0.09, C('#1b1d20', -0.25)); for (const e of [x0 + 0.08, x1 - 0.08]) mkHCyl(mb, e, y1 - 0.14, cz, 'z', d - 0.2, 0.1, C('#8a929a', -0.6), 10); }
      else { mb.box(x0, y1 - 0.26, z0, x0 + 0.09, y1 - 0.04, z1, YC); mb.box(x1 - 0.09, y1 - 0.26, z0, x1, y1 - 0.04, z1, YC); mb.box(x0 + 0.09, y1 - 0.12, z0 + 0.06, x1 - 0.09, y1 - 0.05, z1 - 0.06, C('#1b1d20', -0.25)); }
      for (let k = 0; k < 3; k++) {
        const f = (k + 0.5 + (hsh(bi, k) - 0.5) * 0.5) / 3, bx = lx ? x0 + w * f : cx, bz = lx ? cz : z0 + d * f, s2 = 0.18 + hsh(bi, k + 4) * 0.08;
        mb.box(bx - s2, y1 - 0.05, bz - 0.2, bx + s2, y1 + 0.28, bz + 0.2, C(hsh(k, bi) > 0.4 ? '#b98a57' : '#a47a4c', 0));
        mb.box(bx - s2 - 0.003, y1 + 0.2, bz - 0.04, bx + s2 + 0.003, y1 + 0.285, bz + 0.04, C('#d8c9a0', 0));
      }
    } else if (t === 15) {
      // tank: beton kaide, parlak gövde, kuşaklar, kubbe, merdiven, boru, yeşil durum ışığı
      const r = Math.min(w, d) / 2 - 0.06, top = y1 - r * 0.32, TK = C(FPAL.tank, -0.55), BD = C('#7d858d', -0.5);
      mb.box(x0, 0, z0, x1, 0.22, z1, C(FPAL.conc, 0));
      mb.cyl(cx, 0.22, cz, r, top, r, 18, TK, TK, '');
      for (const yy of [0.9, (0.22 + top) / 2, top - 0.35]) mb.cyl(cx, yy, cz, r + 0.025, yy + 0.07, r + 0.025, 18, BD, BD, '');
      mb.sphereS(cx, top, cz, r, r * 0.32, r, TK, 18, 6);
      const lsx = cx > 0 ? -1 : 1, lxx = cx + lsx * (r + 0.07);
      for (const o of [-0.2, 0.2]) mb.box(lxx - 0.03, 0.22, cz + o - 0.025, lxx + 0.03, top + 0.2, cz + o + 0.025, C('#3f454c', -0.4));
      for (let yy = 0.5; yy < top; yy += 0.36) mb.box(lxx - 0.025, yy, cz - 0.2, lxx + 0.025, yy + 0.03, cz + 0.2, C('#3f454c', -0.4));
      mb.box(cx - 0.25, 1.5, cz + (cz > 0 ? -1 : 1) * (r - 0.02) - 0.02, cx + 0.25, 1.9, cz + (cz > 0 ? -1 : 1) * (r - 0.02) + 0.02, YL);
      mb.box(cx - 0.05, top + r * 0.3, cz - 0.05, cx + 0.05, top + r * 0.3 + 0.12, cz + 0.05, C('#61ff86', 1));
      limb(mb, [cx - lsx * r * 0.7, 1.1, cz - r * 0.7], [cx - lsx * (r + 0.4), 0.05, cz - r * 0.7], [0.07, 0.07], C('#6e767e', -0.5), 6);
    } else if (t === 16) {
      // variller: dörtlü, kuşaklı
      const nx = w > 1.1 ? 2 : 1, nz = d > 1.1 ? 2 : 1, r = Math.min(w / nx, d / nz) / 2 - 0.04;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const bx = x0 + (i + 0.5) * (w / nx), bz = z0 + (j + 0.5) * (d / nz), col = C(FDRUM[Math.floor(hsh(bi * 4 + i * 2 + j, 3) * FDRUM.length)], -0.2), hh = h - 0.12 - hsh(i, j + bi) * 0.08;
        mb.cyl(bx, 0, bz, r, hh, r, 12, col, shade(col, 0.8));
        for (const yy of [hh * 0.3, hh * 0.68]) mb.cyl(bx, yy, bz, r + 0.015, yy + 0.04, r + 0.015, 12, shade(col, 0.7), shade(col, 0.7), '');
      }
    } else {
      mb.box(x0, y0, z0, x1, y1, z1, C('#8a877f', 0));
    }
  });
  // ---- avlu lambaları ve ışık havuzları (yarı harita; nokta simetrik)
  for (const s of [-1, 1]) {
    for (const [x, z, dx, dz] of [[-9.6, -20.2, 1, 0], [-22.7, -6, 1, 0], [9.6, -12.9, -1, 0], [3.4, -23.4, 0, 1]]) {
      mkLamp(mb, s * x, s * z, 6.2, s * dx, s * dz, FPAL.sodium);
      mkPool(mb, s * (x + dx * 0.95), s * (z + dz * 0.95), 4.6, SOD);
    }
    // salon kapılarının üstünde duvar lambaları
    for (const x of [-4, 4]) { mb.box(x - 0.3, 3.9, s * 7.2, x + 0.3, 4.15, s * 7.2 + s * 0.3, C('#2c3035', -0.3)); mb.box(x - 0.24, 3.88, s * 7.2 + s * 0.05, x + 0.24, 3.9, s * 7.2 + s * 0.28, C(FPAL.sodium, 1)); mkPool(mb, x, s * 9, 2.9, SOD); }
    mb.box(s * 9.2, 3.9, -0.3, s * 9.2 + s * 0.3, 4.15, 0.3, C('#2c3035', -0.3)); mb.box(s * 9.2 + s * 0.05, 3.88, -0.24, s * 9.2 + s * 0.28, 3.9, 0.24, C(FPAL.sodium, 1)); mkPool(mb, s * 11, 0, 2.9, SOD);
  }
  // salon içi floresan ışık havuzları
  for (const x of [-5.5, 0, 5.5]) for (const z of [-4.8, 4.8]) mkPool(mb, x, z, 2.6, TUB, 0.016);
  for (const x of [-6, 6]) mkPool(mb, x, 0, 2.4, TUB, 0.016);
  // gezer vinç: salonu doğu-batı geçen sarı kiriş, kanca ve zincir
  {
    const YC = C(FPAL.yel, -0.3), D1 = C('#2c3035', -0.4);
    mb.box(-9, 3.72, -1.25, 9, 4.12, -0.95, YC); mb.box(-9, 3.72, 0.95, 9, 4.12, 1.25, YC);
    for (const x of [-8.8, 8.8]) mb.box(x - 0.2, 3.6, -1.4, x + 0.2, 4.2, 1.4, YC);
    mb.box(1.6, 3.35, -0.9, 2.6, 3.75, 0.9, C('#d14c2e', -0.2));
    mb.cyl(2.1, 2.6, 0, 0.02, 3.35, 0.02, 4, D1, D1);
    mb.box(1.95, 2.35, -0.06, 2.25, 2.62, 0.06, D1);
  }
  // ---- arena dışı: fabrika binaları, bacalar, su kulesi, silolar (gece pencereler yanar)
  const hall = (x0, z0, x1, z1, hh, k) => {
    mb.box(x0, 0, z0, x1, hh, z1, C(k % 2 ? '#6e3b2c' : '#5d4036', 0));
    const side = Math.min(Math.abs(x0), Math.abs(x1)) > 30;
    const f = side ? (Math.abs(x0) < Math.abs(x1) ? x0 : x1) : (Math.abs(z0) < Math.abs(z1) ? z0 : z1);
    const sg = side ? (f === x0 ? -1 : 1) : (f === z0 ? -1 : 1), a0 = side ? z0 : x0, a1 = side ? z1 : x1;
    for (let yy = 2.2; yy < hh - 1.2; yy += 2.6) for (let a = a0 + 1.2; a < a1 - 0.8; a += 2.4) {
      const lit = hsh(Math.round(a * 3) + k * 31, Math.round(yy * 7)) > 0.42, col = C(lit ? '#f2d2a0' : '#232832', lit ? 0.5 : -0.6);
      if (side) mb.box(f + sg * 0.02, yy, a - 0.6, f - sg * 0.06, yy + 1.3, a + 0.6, col);
      else mb.box(a - 0.6, yy, f + sg * 0.02, a + 0.6, yy + 1.3, f - sg * 0.06, col);
    }
    for (let z = z0; z + 3 <= z1 + 0.01; z += 3) mb.frustum(x0, x1, z, z + 3, hh, x0, x1, z + 2.85, z + 3, hh + 1.6, C('#3e434a', 0));
  };
  hall(-34, -58, -4, -38, 13, 1); hall(6, -62, 36, -40, 16, 2); hall(-36, 40, -6, 62, 15, 3); hall(4, 38, 34, 56, 12, 4);
  hall(-62, -30, -36, 0, 11, 5); hall(36, 4, 64, 34, 13, 6); hall(-64, 8, -40, 34, 9, 7); hall(40, -34, 66, -6, 10, 8);
  for (const [x, z, hh] of [[24, -48, 30], [-28, 50, 26], [46, 40, 22]]) {
    const W1 = C('#d8d2c8', 0), R1 = C('#b5372e', 0);
    mb.cyl(x, 0, z, 1.5, hh, 1.0, 14, W1, W1, '');
    for (let k = 0; k < 3; k++) { const yy = hh - 2.2 - k * 5; mb.cyl(x, yy, z, 1.0 + (yy / hh) * 0.0 + 0.04 + (1 - yy / hh) * 0.5, yy + 1.4, 1.03 + (1 - (yy + 1.4) / hh) * 0.5, 14, R1, R1, ''); }
    mb.box(x - 0.15, hh, z - 0.15, x + 0.15, hh + 0.3, z + 0.15, C('#ff3b30', 1));
  }
  {
    // su kulesi
    const x = -40, z = -42, T1 = C('#7d868f', -0.4), L1 = C('#3f454c', -0.3);
    for (const [a, b] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) limb(mb, [x + a, 0, z + b], [x + a * 0.6, 14, z + b * 0.6], [0.16, 0.12], L1, 6);
    mb.cyl(x, 14, z, 3.4, 19, 3.4, 16, T1, T1);
    mb.cyl(x, 19, z, 3.4, 21, 0.3, 16, T1, T1, '');
    mb.box(x - 0.12, 21, z - 0.12, x + 0.12, 21.3, z + 0.12, C('#ff3b30', 1));
  }
  for (let k = 0; k < 4; k++) { const x = 26 + k * 4.2, z = -36; const SL = C('#9ba3ab', -0.5); mb.cyl(x, 0, z, 1.9, 15, 1.9, 14, SL, SL, ''); mb.cyl(x, 15, z, 1.9, 17, 0.4, 14, SL, SL, ''); }
}
// zeminde sarı-siyah taramalı kare çerçeve (presin çevresi)
function fabHazardFloor(mb, x0, z0, x1, z1, y) {
  const YL = C(FPAL.yel, 0), BK = C(FPAL.blk, 0), e = 0.22, n = 10;
  for (let k = 0; k < n; k++) {
    const a0 = x0 + ((x1 - x0) * k) / n, a1 = x0 + ((x1 - x0) * (k + 1)) / n, c = k % 2 ? BK : YL;
    mkQuad(mb, a0, z0 - e, a1, z0, c, y); mkQuad(mb, a0, z1, a1, z1 + e, c, y);
    const b0 = z0 + ((z1 - z0) * k) / n, b1 = z0 + ((z1 - z0) * (k + 1)) / n;
    mkQuad(mb, x0 - e, b0, x0, b1, c, y); mkQuad(mb, x1, b0, x1 + e, b1, c, y);
  }
}
// testere dişi çatı: eğik yüzler, kuzeye bakan ışıklıklar (gece içeriden yanar), altta kafes kirişler ve floresanlar
function fabRoof(mb, x0, y0, z0, x1, y1, z1, TUB) {
  const R1 = C('#4a5058', 0), R2 = C('#3c4148', 0), GL = C('#f3e3bd', 0.5), n = 6, st = (z1 - z0) / n, rise = 1.25;
  mb.box(x0, y0, z0, x1, y1, z1, R1);
  for (let k = 0; k < n; k++) {
    const za = z0 + k * st, zb = za + st - 0.05, yt = y1 + rise;
    const nrm = norm3([0, st - 0.05, -rise]);
    mb.quadN([x0, y1, za], [x1, y1, za], [x1, yt, zb], [x0, yt, zb], nrm, nrm, nrm, nrm, R2);
    mb.box(x0, y1, zb, x1, yt, zb + 0.05, C('#2b3036', -0.4));
    mb.box(x0 + 0.3, y1 + 0.12, zb + 0.05, x1 - 0.3, yt - 0.1, zb + 0.06, GL);
    for (let x = x0 + 1.5; x < x1 - 0.5; x += 1.5) mb.box(x - 0.04, y1 + 0.1, zb + 0.06, x + 0.04, yt - 0.08, zb + 0.08, C('#2b3036', -0.4));
    for (const xe of [x0, x1]) mb.triN([xe, y1, za], [xe, yt, zb], [xe, y1, zb], [xe < 0 ? -1 : 1, 0, 0], [xe < 0 ? -1 : 1, 0, 0], [xe < 0 ? -1 : 1, 0, 0], R2);
  }
  // alt yüz: kafes kirişler ve asılı floresanlar
  const ST = C('#4b525a', -0.4), D1 = C('#2c3035', -0.4);
  for (let x = x0 + 1.5; x < x1 - 0.5; x += 3) { mb.box(x - 0.08, y0 - 0.42, z0 + 0.3, x + 0.08, y0, z1 - 0.3, ST); for (let z = z0 + 1; z < z1 - 0.8; z += 1.6) { mb.push().T(x, y0 - 0.21, z + 0.4, 0, 0.7); mb.box(-0.03, -0.25, -0.03, 0.03, 0.25, 0.03, ST); mb.pop(); } }
  for (const x of [-5.5, 0, 5.5]) for (const z of [-4.8, 4.8]) {
    for (const o of [-0.7, 0.7]) mb.cyl(x + o, y0 - 0.75, z, 0.008, y0, 0.008, 3, D1, D1);
    mb.box(x - 0.85, y0 - 0.82, z - 0.09, x + 0.85, y0 - 0.74, z + 0.09, D1);
    mb.box(x - 0.8, y0 - 0.85, z - 0.06, x + 0.8, y0 - 0.82, z + 0.06, C(FPAL.tube, 1));
  }
  for (const x of [-6, 6]) { mb.box(x - 0.09, y0 - 0.82, -0.85, x + 0.09, y0 - 0.74, 0.85, D1); mb.box(x - 0.06, y0 - 0.85, -0.8, x + 0.06, y0 - 0.82, 0.8, C(FPAL.tube, 1)); }
  void TUB;
}
// hidrolik pres: taban, dört kolon, taç, koç, ışıklı panel ve tepe lambası
function fabPress(mb, x0, z0, x1, y1, z1) {
  const MA = C(FPAL.mach, -0.2), MD = C(FPAL.machD, -0.2), SL = C('#9aa3ab', -0.7), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  mb.box(x0, 0, z0, x1, 0.9, z1, MD);
  fabHazard(mb, x0, z0, x1, z1, 0.62, 0.86);
  mb.box(x0 + 0.5, 0.9, z0 + 0.5, x1 - 0.5, 1.06, z1 - 0.5, C('#59616a', -0.5));
  for (const [a, b] of [[x0 + 0.38, z0 + 0.38], [x1 - 0.38, z0 + 0.38], [x0 + 0.38, z1 - 0.38], [x1 - 0.38, z1 - 0.38]]) mb.cyl(a, 0.9, b, 0.19, y1 - 0.45, 0.19, 12, SL, SL, '');
  mb.box(x0 + 0.08, y1 - 0.5, z0 + 0.08, x1 - 0.08, y1, z1 - 0.08, MA);
  mb.box(x0 + 0.55, 1.6, z0 + 0.55, x1 - 0.55, 1.88, z1 - 0.55, MA);
  mb.cyl(cx, 1.88, cz, 0.3, y1 - 0.5, 0.3, 14, SL, SL, '');
  for (const s of [-1, 1]) fabPanel(mb, cx - 0.6, y1 - 0.48, s < 0 ? z0 + 0.08 : z1 - 0.08, 0, s);
  mb.cyl(cx + 1.1, y1, cz, 0.12, y1 + 0.2, 0.12, 10, C('#ff5a3a', 1), C('#ff5a3a', 1));
}
// tezgâh makinesi: kaide, gövde, kapak, cam, panel, tavana çıkan borular
function fabMachine(mb, x0, z0, x1, y1, z1, bi) {
  const MA = C(hsh(bi, 2) > 0.5 ? FPAL.mach : '#55606e', -0.25), MD = C(FPAL.machD, -0.2), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, lx = w > d;
  mb.box(x0, 0, z0, x1, 0.25, z1, MD);
  mb.rbox(x0 + 0.04, 0.25, z0 + 0.04, x1 - 0.04, y1 - 0.42, z1 - 0.04, 0.06, MA, 2);
  mb.rbox(x0 + 0.12, y1 - 0.44, z0 + 0.12, x1 - 0.12, y1, z1 - 0.12, 0.1, C('#c9cdd2', -0.4), 2);
  fabHazard(mb, x0, z0, x1, z1, 0.03, 0.22);
  const fz = cz > 0 ? z0 : z1, sg = cz > 0 ? -1 : 1;
  if (lx) {
    mb.box(x0 + 0.35, 0.75, fz - sg * 0.03, x0 + w * 0.55, y1 - 0.6, fz - sg * 0.015, C('#1c2a33', -0.9));
    fabPanel(mb, x1 - 0.55, 0.85, fz - sg * 0.035, 0, sg);
  } else {
    mb.box(x0 > 0 ? x0 + 0.015 : x1 - 0.03, 0.75, z0 + 0.35, x0 > 0 ? x0 + 0.03 : x1 - 0.015, y1 - 0.6, z0 + d * 0.55, C('#1c2a33', -0.9));
  }
  const P = C('#6e767e', -0.5);
  for (const o of [-0.3, 0.3]) mb.cyl(cx + (lx ? o * w : 0), y1, cz + (lx ? 0 : o * d), 0.07, 4.4, 0.07, 6, P, P, '');
}
/* ============================ Karlı Üs haritası görselleri (kış) ============================ */
const KPAL = {
  snow: '#dce4ec', snowB: '#eef3f8', path: '#c3ccd6', ice: '#9fc0d6', conc: '#8e949b', concD: '#737980',
  log: '#7a5338', logD: '#5c3d28', logL: '#8f6644', olive: '#56653f', oliveD: '#414d30', hesco: '#b4a888', hescoD: '#988d70',
  metal: '#c9ced3', metalD: '#9da4ab', red: '#b8372f', wood: '#8a6442', woodD: '#5f4430'
};
// üstüne kar: kutunun tepesinde yuvarlak kenarlı beyaz örtü
function karCap(mb, x0, y1, z0, x1, z1, t = 0.12, o = 0.04) { mb.rbox(x0 - o, y1 - 0.02, z0 - o, x1 + o, y1 + t, z1 + o, Math.min(t * 0.9, 0.1), C(KPAL.snowB, 0), 2); }
// kütük kulübe / koğuş: yatay kütük bantları, köşe uçları, kapı, pencere, karlı beşik çatı, baca
function karCabin(mb, x0, z0, x1, y1, z1, bi) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = w > d, LG = C(KPAL.log, 0), LD = C(KPAL.logD, 0), LL = C(KPAL.logL, 0);
  mb.box(x0, 0, z0, x1, y1, z1, LG);
  for (let y = 0.28, k = 0; y < y1 - 0.1; y += 0.3, k++) mb.box(x0 - 0.02, y, z0 - 0.02, x1 + 0.02, y + 0.05, z1 + 0.02, k % 2 ? LD : shade(LD, 1.12));
  for (const [a, b] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) for (let y = 0.15; y < y1 - 0.1; y += 0.6) { mb.cyl(a, y, b, 0.17, y + 0.28, 0.17, 7, LL, C('#b08a5e', 0)); }
  mb.box(x0 - 0.04, 0, z0 - 0.04, x1 + 0.04, 0.2, z1 + 0.04, C('#6b6f74', 0));
  // çatı: uzun eksen boyunca mahya
  const ry = y1 + (lx ? d : w) * 0.32, oh = 0.35, RF = C('#5a3e2c', 0), SN = C(KPAL.snowB, 0);
  if (lx) {
    for (const s of [-1, 1]) { const ze = s < 0 ? z0 - oh : z1 + oh, n = norm3([0, d / 2 + oh, s * (ry - y1 + 0.1)]); mb.quadN([x0 - oh, y1 - 0.1, ze], [x1 + oh, y1 - 0.1, ze], [x1 + oh, ry, cz], [x0 - oh, ry, cz], n, n, n, n, SN); mb.quadN([x0 - oh, y1 - 0.22, ze], [x1 + oh, y1 - 0.22, ze], [x1 + oh, ry - 0.12, cz], [x0 - oh, ry - 0.12, cz], n, n, n, n, RF); }
    for (const xe of [x0, x1]) { const nn = [xe === x0 ? -1 : 1, 0, 0]; mb.triN([xe, y1, z0], [xe, ry - 0.05, cz], [xe, y1, z1], nn, nn, nn, LD); }
  } else {
    for (const s of [-1, 1]) { const xe = s < 0 ? x0 - oh : x1 + oh, n = norm3([s * (ry - y1 + 0.1), w / 2 + oh, 0]); mb.quadN([xe, y1 - 0.1, z0 - oh], [xe, y1 - 0.1, z1 + oh], [cx, ry, z1 + oh], [cx, ry, z0 - oh], n, n, n, n, SN); mb.quadN([xe, y1 - 0.22, z0 - oh], [xe, y1 - 0.22, z1 + oh], [cx, ry - 0.12, z1 + oh], [cx, ry - 0.12, z0 - oh], n, n, n, n, RF); }
    for (const ze of [z0, z1]) { const nn = [0, 0, ze === z0 ? -1 : 1]; mb.triN([x0, y1, ze], [cx, ry - 0.05, ze], [x1, y1, ze], nn, nn, nn, LD); }
  }
  // kapı ve pencereler: arenanın ortasına bakan uzun yüz
  const GL = C('#3c4f61', -0.85), FR = C('#e9e4d8', 0), DR = C('#4a3120', 0);
  if (lx) {
    const fz = Math.abs(z0) < Math.abs(z1) ? z0 : z1, s = fz === z0 ? -1 : 1;
    mb.box(cx - 0.5, 0.2, fz, cx + 0.5, 2.15, fz + s * 0.06, DR);
    for (const xx of [x0 + w * 0.2, x1 - w * 0.2]) { mb.box(xx - 0.5, 1.15, fz, xx + 0.5, 2.05, fz + s * 0.05, FR); mb.box(xx - 0.42, 1.22, fz, xx + 0.42, 1.98, fz + s * 0.07, GL); mb.box(xx - 0.55, 1.08, fz, xx + 0.55, 1.15, fz + s * 0.18, SN); }
  } else {
    const fx = Math.abs(x0) < Math.abs(x1) ? x0 : x1, s = fx === x0 ? -1 : 1;
    mb.box(fx, 0.2, cz - 0.5, fx + s * 0.06, 2.15, cz + 0.5, DR);
    for (const zz of [z0 + d * 0.2, z1 - d * 0.2]) { mb.box(fx, 1.15, zz - 0.5, fx + s * 0.05, 2.05, zz + 0.5, FR); mb.box(fx, 1.22, zz - 0.42, fx + s * 0.07, 1.98, zz + 0.42, GL); mb.box(fx, 1.08, zz - 0.55, fx + s * 0.18, 1.15, zz + 0.55, SN); }
  }
  // taş baca
  const bx = lx ? x0 + w * 0.25 : cx + (hsh(bi, 2) > 0.5 ? 0.6 : -0.6), bz = lx ? cz + 0.6 : z0 + d * 0.25;
  mb.box(bx - 0.3, y1 - 0.2, bz - 0.3, bx + 0.3, ry + 0.7, bz + 0.3, C('#7d7f82', 0));
  karCap(mb, bx - 0.3, ry + 0.7, bz - 0.3, bx + 0.3, bz + 0.3, 0.08, 0.03);
}
// telsiz istasyonu: oluklu prefabrik, kırmızı şerit, çatıda çanak anten, kafes direk
function karStation(mb, x0, z0, x1, y1, z1) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, M1 = C(KPAL.metal, -0.2), MD = C(KPAL.metalD, -0.2);
  mb.box(x0, 0, z0, x1, y1, z1, M1);
  for (let x = x0 + 0.15; x < x1 - 0.05; x += 0.3) { mb.box(x, 0.3, z0 - 0.03, x + 0.1, y1 - 0.2, z0, MD); mb.box(x, 0.3, z1, x + 0.1, y1 - 0.2, z1 + 0.03, MD); }
  for (let z = z0 + 0.15; z < z1 - 0.05; z += 0.3) { mb.box(x0 - 0.03, 0.3, z, x0, y1 - 0.2, z + 0.1, MD); mb.box(x1, 0.3, z, x1 + 0.03, y1 - 0.2, z + 0.1, MD); }
  mb.box(x0 - 0.04, 1.7, z0 - 0.04, x1 + 0.04, 2.0, z1 + 0.04, C(KPAL.red, 0));
  mb.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.3, z1 + 0.05, C('#5f656c', 0));
  karCap(mb, x0, y1, z0, x1, z1, 0.16, 0.08);
  // kapılar ve pencereler (dört yüz)
  const DR = C('#4d565f', -0.3), GL = C('#36495b', -0.85);
  for (const s of [-1, 1]) {
    const fz = s < 0 ? z0 : z1;
    mb.box(cx - 0.55, 0.3, fz, cx + 0.55, 2.3, fz + s * 0.06, DR);
    for (const xx of [x0 + 1.1, x1 - 1.1]) mb.box(xx - 0.55, 2.15, fz, xx + 0.55, 2.95, fz + s * 0.07, GL);
    const fx = s < 0 ? x0 : x1;
    mb.box(fx, 2.15, cz - 0.6, fx + s * 0.07, 2.95, cz + 0.6, GL);
  }
  // çatı: çanak anten ve kafes direk (ince, çarpışmasız)
  const DS = C('#e8ebee', -0.3), ST = C('#6b737b', -0.4);
  mb.box(cx + 1.6, y1 + 0.15, cz - 0.15, cx + 1.9, y1 + 0.9, cz + 0.15, ST);
  mb.push().T(cx + 1.75, y1 + 1.25, cz, 0.6, -0.7); mb.lathe(0, 0, 0, [[0.02, -0.12], [0.55, 0], [0.75, 0.16], [0.78, 0.2]], 18, DS); mb.cyl(0, 0, 0, 0.03, 0.55, 0.02, 6, ST, ST); mb.pop();
  const mx = cx - 2.2, mz = cz, H = 13;
  for (const [a, b] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) mb.box(mx + a - 0.04, y1, mz + b - 0.04, mx + a + 0.04, H, mz + b + 0.04, C(KPAL.red, -0.2));
  for (let y = y1 + 0.6, k = 0; y < H - 0.4; y += 0.9, k++) for (const [a, b, c2, e2] of [[-0.35, -0.35, 0.35, -0.35], [-0.35, 0.35, 0.35, 0.35], [-0.35, -0.35, -0.35, 0.35], [0.35, -0.35, 0.35, 0.35]]) mb.box(mx + Math.min(a, c2) - 0.02, y, mz + Math.min(b, e2) - 0.02, mx + Math.max(a, c2) + 0.02, y + 0.05, mz + Math.max(b, e2) + 0.02, k % 2 ? C('#e9e6e0', 0) : C(KPAL.red, -0.2));
  mb.box(mx - 0.1, H, mz - 0.1, mx + 0.1, H + 0.25, mz + 0.1, C('#ff3b30', 1));
  void w; void d;
}
// jeneratör kulübesi: sac kulübe, kepenk, egzoz borusu
function karShed(mb, x0, z0, x1, y1, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, lx = w > z1 - z0, M1 = C('#7d8a72', -0.2), MD = C('#66735c', -0.2);
  mb.box(x0, 0, z0, x1, y1, z1, M1);
  for (let a = 0.15; a < (lx ? w : z1 - z0) - 0.05; a += 0.28) {
    if (lx) { mb.box(x0 + a, 0.2, z0 - 0.025, x0 + a + 0.09, y1 - 0.15, z0, MD); mb.box(x0 + a, 0.2, z1, x0 + a + 0.09, y1 - 0.15, z1 + 0.025, MD); }
    else { mb.box(x0 - 0.025, 0.2, z0 + a, x0, y1 - 0.15, z0 + a + 0.09, MD); mb.box(x1, 0.2, z0 + a, x1 + 0.025, y1 - 0.15, z0 + a + 0.09, MD); }
  }
  karCap(mb, x0, y1, z0, x1, z1, 0.14, 0.06);
  const fz = Math.abs(z0) < Math.abs(z1) ? z0 : z1, s = fz === z0 ? -1 : 1;
  mb.box(cx - 0.8, 0.05, fz, cx + 0.8, 2.0, fz + s * 0.05, C('#9aa1a8', -0.3));
  for (let y = 0.2; y < 2.0; y += 0.16) mb.box(cx - 0.8, y, fz + s * 0.05, cx + 0.8, y + 0.03, fz + s * 0.065, C('#7f868d', -0.3));
  const P = C('#3c4046', -0.5);
  mb.cyl(x1 - 0.4, y1, cz, 0.09, y1 + 1.1, 0.09, 8, P, P);
  mb.box(x0 + 0.3, 1.3, fz + s * 0.0, x0 + 0.7, 1.7, fz + s * 0.03, C('#ffd23f', 0));
}
function buildKar(mb) {
  const quad = (x0, z0, x1, z1, col, y = 0) => mkQuad(mb, x0, z0, x1, z1, col, y);
  const Y = 0.016, SNO = C(KPAL.snow, 0);
  // ---- zemin: kar, üslerde sıkışmış kar, patikalar, iki donmuş gölet
  quad(-25, -32, 25, 32, SNO);
  quad(-180, -180, 180, 180, C('#d3dce5', 0), -0.03);
  for (const s of [-1, 1]) {
    quad(-25, s * 24, 25, s * 32, C(s < 0 ? '#d9cfd0' : '#cdd3e0', 0), 0.003);
    // patikalar: üs çıkışlarından ortaya
    for (const [xa, za, xb, zb] of [[0, 24, 0, 3], [16.5, 24, 13, 5], [-16.5, 24, -13, 5]]) {
      const dx = xb - xa, dz = zb - za, l = Math.hypot(dx, dz), nx = -dz / l * 0.9, nz = dx / l * 0.9;
      mb.quadN([s * (xa + nx), 0.005, s * (za + nz)], [s * (xa - nx), 0.005, s * (za - nz)], [s * (xb - nx), 0.005, s * (zb - nz)], [s * (xb + nx), 0.005, s * (zb + nz)], UP, UP, UP, UP, C(KPAL.path, 0));
    }
    // gölet: buz, iç halka, çatlaklar
    const JJ = [1, 0.86, 1.08, 0.94, 1.12, 0.9, 1.04, 0.83, 1.1, 0.95, 1.02, 0.88];
    mb.disc(0, 0.008, s * 14, 7.2, 4.6, 24, C('#c9d9e5', 0), C('#c9d9e5', 0), JJ);
    mb.disc(0, 0.011, s * 14, 6.3, 3.9, 24, C(KPAL.ice, -0.6), C(KPAL.ice, -0.6), JJ);
    mb.disc(0.6, 0.013, s * 14.3, 3.6, 2.2, 20, C('#b5d1e2', -0.7), C('#b5d1e2', -0.7), JJ);
    for (let k = 0; k < 7; k++) { const a = hsh(k, 51 + s) * TAU, r0 = 0.8 + hsh(k, 52) * 1.5, r1 = r0 + 1.2 + hsh(k, 53) * 2; const p0 = [Math.cos(a) * r0 * 1.5, s * 14 + Math.sin(a) * r0], p1 = [Math.cos(a + 0.2) * r1 * 1.5, s * 14 + Math.sin(a + 0.2) * r1]; const ln = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ox = -(p1[1] - p0[1]) / ln * 0.025, oz = (p1[0] - p0[0]) / ln * 0.025; mb.quadN([p0[0] + ox, 0.015, p0[1] + oz], [p0[0] - ox, 0.015, p0[1] - oz], [p1[0] - ox, 0.015, p1[1] - oz], [p1[0] + ox, 0.015, p1[1] + oz], UP, UP, UP, UP, C('#e8f1f7', 0)); }
    // üs amblemi (karda boya)
    const tc = C(s < 0 ? '#b8322f' : '#2b5cc4', 0), bg = C(s < 0 ? '#d9cfd0' : '#cdd3e0', 0);
    mb.disc(0, Y, s * 28, 2.2, 2.2, 32, tc, tc); mb.disc(0, Y + 0.004, s * 28, 1.75, 1.75, 32, bg, bg);
    mb.triN([0, Y + 0.008, s * 28 - s * 1.2], [-0.95, Y + 0.008, s * 28 + s * 0.75], [0.95, Y + 0.008, s * 28 + s * 0.75], UP, UP, UP, tc);
  }
  // kar kümecikleri (çarpışmasız, alçak)
  for (let k = 0; k < 26; k++) {
    const s = k % 2 ? 1 : -1, x = s * (hsh(k, 71) * 46 - 23), z = s * (5 + hsh(k, 72) * 18), r = 0.5 + hsh(k, 73) * 0.9;
    if (ctHit(x, 0.05, z, r + 0.3, 1) >= 0 || Math.abs(x) < 7.5 && Math.abs(Math.abs(z) - 14) < 5) continue;
    mb.sphereS(x, 0, z, r * 1.4, 0.18 + r * 0.12, r, C(KPAL.snowB, 0), 10, 4);
  }
  // ---- kutular
  CT_BOXES.forEach((b, bi) => {
    const [x0, y0, z0, x1, y1, z1, t] = b;
    const w = x1 - x0, d = z1 - z0, h = y1 - y0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = w > d;
    if (t === 0) {
      // çevre: beton duvar, payandalar, karlı üst, dikenli tel, dipte kar birikintisi
      mb.box(x0, y0, z0, x1, y1, z1, C(KPAL.conc, 0));
      const zi = lx ? (z0 < 0 ? z1 : z0) : 0, xi = lx ? 0 : (x0 < 0 ? x1 : x0), s = lx ? (z0 < 0 ? 1 : -1) : (x0 < 0 ? 1 : -1);
      const a0 = lx ? x0 : z0, a1 = lx ? x1 : z1, P = C('#4b5057', -0.3);
      for (let a = Math.ceil(a0 / 4) * 4; a < a1; a += 4) {
        if (lx) { mb.box(a - 0.25, 0, zi, a + 0.25, y1, zi + s * 0.18, C(KPAL.concD, 0)); mb.box(a - 0.04, y1, zi - s * 0.32, a + 0.04, y1 + 0.8, zi - s * 0.24, P); }
        else { mb.box(xi, 0, a - 0.25, xi + s * 0.18, y1, a + 0.25, C(KPAL.concD, 0)); mb.box(xi - s * 0.32, y1, a - 0.04, xi - s * 0.24, y1 + 0.8, a + 0.04, P); }
      }
      karCap(mb, x0, y1, z0, x1, z1, 0.18, 0.06);
      if (lx) { for (const yy of [y1 + 0.42, y1 + 0.72]) mb.box(x0, yy, zi - s * 0.285, x1, yy + 0.02, zi - s * 0.275, P); mb.frustum(x0, x1, Math.min(zi, zi + s * 0.9), Math.max(zi, zi + s * 0.9), 0, x0, x1, Math.min(zi, zi + s * 0.1), Math.max(zi, zi + s * 0.1), 0.45, C(KPAL.snowB, 0)); }
      else { for (const yy of [y1 + 0.42, y1 + 0.72]) mb.box(xi - s * 0.285, yy, z0, xi - s * 0.275, yy + 0.02, z1, P); mb.frustum(Math.min(xi, xi + s * 0.9), Math.max(xi, xi + s * 0.9), z0, z1, 0, Math.min(xi, xi + s * 0.1), Math.max(xi, xi + s * 0.1), z0, z1, 0.45, C(KPAL.snowB, 0)); }
      // takım bayrakları (üs arkası)
      if (lx) { const tc = C(z0 < 0 ? '#c53b38' : '#356bd6', 0); for (const x of [-14, 0, 14]) { mb.box(x - 0.8, 1.5, zi + s * 0.2, x + 0.8, 4.0, zi + s * 0.23, tc); mb.box(x - 0.9, 4.0, zi + s * 0.17, x + 0.9, 4.12, zi + s * 0.29, C('#3d4148', 0)); } }
    } else if (t === 7) {
      // üs önü: kumlu sepet bariyerler (tel örgü çizgili), üstte kar, takım şeridi
      const len = w, n = Math.max(1, Math.round(len / 1.1)), bl = len / n;
      for (let k = 0; k < n; k++) {
        const a0 = x0 + k * bl, a1 = a0 + bl - 0.04;
        mb.box(a0, y0, z0, a1, y1, z1, C(k % 2 ? KPAL.hesco : '#aea283', 0));
        for (let y = 0.4; y < y1 - 0.1; y += 0.4) { mb.box(a0 - 0.005, y, z0 - 0.012, a1 + 0.005, y + 0.025, z0, C(KPAL.hescoD, 0)); mb.box(a0 - 0.005, y, z1, a1 + 0.005, y + 0.025, z1 + 0.012, C(KPAL.hescoD, 0)); }
        mb.box(a0 - 0.01, 0, z0 - 0.015, a0 + 0.04, y1, z1 + 0.015, C(KPAL.hescoD, 0));
      }
      karCap(mb, x0, y1, z0, x1, z1, 0.16, 0.05);
      mb.box(x0 - 0.01, y1 - 0.75, z0 - 0.03, x1 + 0.01, y1 - 0.5, z1 + 0.03, C(z0 < 0 ? '#c53b38' : '#356bd6', 0));
    } else if (t === 1) {
      // beton T-duvar parçaları, karlı tepe
      const len = lx ? w : d, n = Math.max(1, Math.round(len / 1.4)), bl = len / n;
      for (let k = 0; k < n; k++) {
        const a0 = (lx ? x0 : z0) + k * bl + 0.03, a1 = a0 + bl - 0.06;
        if (lx) mb.box(a0, y0, z0, a1, y1, z1, C(k % 2 ? '#959ba2' : '#8a9097', 0)); else mb.box(x0, y0, a0, x1, y1, a1, C(k % 2 ? '#959ba2' : '#8a9097', 0));
      }
      if (lx) mb.box(x0 - 0.2, 0, z0 - 0.35, x1 + 0.2, 0.25, z1 + 0.35, C('#80868d', 0)); else mb.box(x0 - 0.35, 0, z0 - 0.2, x1 + 0.35, 0.25, z1 + 0.2, C('#80868d', 0));
      karCap(mb, x0, y1, z0, x1, z1, 0.12, 0.03);
    } else if (t === 4) {
      if (Math.abs(cx) < 1 && Math.abs(cz) < 1) karStation(mb, x0, z0, x1, y1, z1);
      else if (w * d < 10) karShed(mb, x0, z0, x1, y1, z1);
      else karCabin(mb, x0, z0, x1, y1, z1, bi);
    } else if (t === 2) {
      // yeşil cephane sandıkları: kuşak, beyaz şablon şeridi, karlı üst
      mb.box(x0 + 0.02, y0, z0 + 0.02, x1 - 0.02, y1 - 0.02, z1 - 0.02, C(KPAL.olive, 0));
      for (const yy of [y0 + 0.08, y1 - 0.2]) mb.box(x0, yy, z0, x1, yy + 0.1, z1, C(KPAL.oliveD, 0));
      mb.box(x0 + w * 0.2, (y0 + y1) / 2 - 0.06, z0 - 0.005, x1 - w * 0.2, (y0 + y1) / 2 + 0.06, z1 + 0.005, C('#e9e6dc', 0));
      karCap(mb, x0 + 0.02, y1 - 0.02, z0 + 0.02, x1 - 0.02, z1 - 0.02, 0.1, 0.02);
    } else if (t === 3) {
      limanContainer(mb, x0, y0, z0, x1, y1, z1, KPAL.olive, hsh(bi, 9) > 0.5 ? 1 : 0);
      karCap(mb, x0, y1, z0, x1, z1, 0.16, 0.03);
    } else if (t === 5) {
      mkBags(mb, b, '#8d8a66', '#7d7a58');
      karCap(mb, x0, y1, z0, x1, z1, 0.1, 0.02);
    } else if (t === 6) {
      // ahşap gözetleme iskelesi: tahta döşeme, kütük direkler, korkuluk, karlı küçük çatı
      const WD = C(KPAL.wood, 0), WK = C(KPAL.woodD, 0);
      mb.box(x0, y0, z0, x1, y1 - 0.1, z1, C('#6c4f36', 0));
      for (let x = x0; x < x1 - 0.05; x += 0.36) mb.box(x + 0.01, y1 - 0.1, z0, Math.min(x + 0.34, x1), y1, z1, (Math.round((x - x0) / 0.36) % 2) ? WD : shade(WD, 0.9));
      karCap(mb, x0 + 0.1, y1, z0 + 0.1, x1 - 0.1, z1 - 0.1, 0.05, 0);
      for (const yy of [0.35, 0.75]) { mb.box(x0 - 0.01, yy, z0 - 0.01, x1 + 0.01, yy + 0.06, z1 + 0.01, WK); }
      if (h > 1) {
        const PO = [[x0 + 0.12, z0 + 0.12], [x1 - 0.12, z0 + 0.12], [x0 + 0.12, z1 - 0.12], [x1 - 0.12, z1 - 0.12]];
        for (const [a, c2] of PO) mb.cyl(a, 0, c2, 0.1, y1 + 2.5, 0.09, 7, WK, WK);
        const ry = y1 + 2.5;
        for (const [a0, b0, a1, b1] of [cz > 0 ? [x0, z0, x1, z0 + 0.06] : [x0, z1 - 0.06, x1, z1], [x0, z0, x0 + 0.06, z1], [x1 - 0.06, z0, x1, z1]]) { mb.box(a0, y1 + 0.95, b0, a1, y1 + 1.05, b1, WD); mb.box(a0, y1 + 0.5, b0, a1, y1 + 0.56, b1, WD); }
        mb.box(x0 - 0.35, ry, z0 - 0.35, x1 + 0.35, ry + 0.12, z1 + 0.35, C('#5a3e2c', 0));
        karCap(mb, x0 - 0.35, ry + 0.12, z0 - 0.35, x1 + 0.35, z1 + 0.35, 0.16, 0);
        // projektör
        mb.box(cx - 0.25, ry - 0.3, z1 - 0.4, cx + 0.25, ry - 0.05, z1 - 0.1, C('#2c3035', -0.3));
      } else {
        for (let k = 1; k < 3; k++) mb.box(x0, y1 * k / 3 - 0.02, z0 - 0.01, x1, y1 * k / 3, z1 + 0.01, WK);
      }
    } else if (t === 15) {
      // yakıt tankı: beyaz gövde, kırmızı kuşak, karlı kubbe, merdiven
      const r = Math.min(w, d) / 2 - 0.06, top = y1 - r * 0.3, TK = C('#e4e6e8', -0.35);
      mb.box(x0, 0, z0, x1, 0.2, z1, C(KPAL.conc, 0));
      mb.cyl(cx, 0.2, cz, r, top, r, 18, TK, TK, '');
      mb.cyl(cx, top - 0.9, cz, r + 0.02, top - 0.55, r + 0.02, 18, C(KPAL.red, -0.2), C(KPAL.red, -0.2), '');
      mb.sphereS(cx, top, cz, r, r * 0.3, r, C(KPAL.snowB, 0), 18, 6);
      const ls = cx > 0 ? -1 : 1, lxx = cx + ls * (r + 0.07);
      for (const o of [-0.2, 0.2]) mb.box(lxx - 0.03, 0.2, cz + o - 0.025, lxx + 0.03, top + 0.15, cz + o + 0.025, C('#4b5057', -0.4));
      for (let yy = 0.5; yy < top; yy += 0.36) mb.box(lxx - 0.025, yy, cz - 0.2, lxx + 0.025, yy + 0.03, cz + 0.2, C('#4b5057', -0.4));
    } else if (t === 16) {
      const nx = w > 1.1 ? 2 : 1, nz = d > 1.1 ? 2 : 1, r = Math.min(w / nx, d / nz) / 2 - 0.04;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const bx = x0 + (i + 0.5) * (w / nx), bz = z0 + (j + 0.5) * (d / nz), col = C(['#2f5f9e', '#a8392f', '#3c6d4a', '#c58a2a'][Math.floor(hsh(bi * 4 + i * 2 + j, 3) * 4)], -0.2), hh = h - 0.14 - hsh(i, j + bi) * 0.08;
        mb.cyl(bx, 0, bz, r, hh, r, 12, col, shade(col, 0.8));
        for (const yy of [hh * 0.3, hh * 0.68]) mb.cyl(bx, yy, bz, r + 0.015, yy + 0.04, r + 0.015, 12, shade(col, 0.7), shade(col, 0.7), '');
        mb.cyl(bx, hh, bz, r - 0.01, hh + 0.07, r - 0.08, 12, C(KPAL.snowB, 0), C(KPAL.snowB, 0));
      }
    } else if (t === 17) {
      // kar yığını: yuvarlak beyaz tümsek, üstünde topaklar, dibinde taş
      mb.rbox(x0, y0, z0, x1, y1 - 0.15, z1, Math.min(0.45, h * 0.45, Math.min(w, d) * 0.45), C(KPAL.snowB, 0), 3);
      const n = Math.max(2, Math.round((lx ? w : d) / 1.1));
      for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, px = lx ? x0 + w * f : cx, pz = lx ? cz : z0 + d * f; mb.sphereS(px, y1 - 0.3, pz, (lx ? w / n : w / 2) * 0.62, 0.3, (lx ? d / 2 : d / n) * 0.62, C('#f3f7fa', 0), 10, 5); }
      mb.sphereS(x0 + 0.25, 0.08, z0 + 0.2, 0.28, 0.2, 0.22, C('#7b7f84', 0), 6, 4);
    } else {
      mb.box(x0, y0, z0, x1, y1, z1, C('#a9b0b7', 0));
      karCap(mb, x0, y1, z0, x1, z1);
    }
  });
  // ---- arena dışı: karlı köknar ormanı, elektrik direkleri, sıradağlar
  for (let k = 0; k < 70; k++) {
    const side = k % 4, a = hsh(k, 81), b2 = hsh(k, 82), h = 6 + hsh(k, 83) * 6;
    let x, z;
    if (side === 0) { x = -29 - b2 * 26; z = -50 + a * 100; } else if (side === 1) { x = 29 + b2 * 26; z = -50 + a * 100; }
    else if (side === 2) { z = -36 - b2 * 22; x = -40 + a * 80; } else { z = 36 + b2 * 22; x = -40 + a * 80; }
    mkPine(mb, x, z, h, true);
  }
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = s * 28, z = -30 + k * 20, P = C('#5b4330', 0);
    mb.cyl(x, 0, z, 0.14, 8.5, 0.11, 7, P, P);
    mb.box(x - 0.08, 8, z - 1.1, x + 0.08, 8.15, z + 1.1, P);
  }
  const mtn = (x, z, r, hh, k) => {
    const R1 = C(['#8d96a2', '#7f8995', '#98a1ac'][k % 3], 0), SN = C('#f1f5f9', 0);
    mb.frustum(x - r, x + r, z - r * 0.8, z + r * 0.8, -1, x - r * 0.06, x + r * 0.05, z - r * 0.04, z + r * 0.05, hh, R1, SN);
    mb.frustum(x - r * 0.42, x + r * 0.42, z - r * 0.36, z + r * 0.36, hh * 0.56, x - r * 0.06, x + r * 0.05, z - r * 0.04, z + r * 0.05, hh + 0.4, SN, SN);
  };
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU + hsh(k, 91) * 0.3, R = 125 + hsh(k, 92) * 30;
    mtn(Math.cos(a) * R, Math.sin(a) * R, 26 + hsh(k, 93) * 22, 26 + hsh(k, 94) * 30, k);
  }
}
/* ============================ Antik Kent haritası görselleri (yaz öğlesi) ============================ */
const APAL = {
  earth: '#bca783', earthD: '#ab9572', pave: '#d2c6ad', paveD: '#b9ad94', ashlar: '#cdbf9f', ashlarD: '#b6a785', ashlarL: '#dacdb0',
  marble: '#e9e3d6', marbleD: '#cfc6b4', grass: '#9aa05e', grassD: '#848b4c', olive: '#7f8f5e', oliveD: '#6a7a4d', cypress: '#3f5a3c', bark: '#6d5a45'
};
// kesme taş duvar: sıra sıra bloklar (şaşırtmalı derzler), üst sıra yer yer eksik/aşınmış
function antWall(mb, x0, y0, z0, x1, y1, z1, bi, ruin, bh = 0.55, bw = 1.15) {
  const w = x1 - x0, d = z1 - z0, lx = w > d, len = lx ? w : d, h = y1 - y0, rows = Math.max(1, Math.round(h / bh)), rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const ya = y0 + r * rh, n = Math.max(1, Math.round(len / bw)), bl = len / n, off = (r % 2) * bl * 0.5;
    for (let k = -1; k < n; k++) {
      let a0 = k * bl + off, a1 = a0 + bl;
      a0 = Math.max(a0, 0); a1 = Math.min(a1, len);
      if (a1 - a0 < 0.15) continue;
      const q = hsh(bi * 31 + r * 7 + k, 13), col = C(q > 0.66 ? APAL.ashlarL : q > 0.33 ? APAL.ashlar : APAL.ashlarD, 0);
      let yb = ya + rh - 0.018;
      if (ruin && r === rows - 1) yb = ya + rh * (0.55 + 0.45 * hsh(bi + k, 17));
      const pu = (hsh(bi + k * 3, r + 5) - 0.5) * 0.04;
      if (lx) mb.box(x0 + a0 + 0.012, ya, z0 - pu, x0 + a1 - 0.012, yb, z1 + pu, col);
      else mb.box(x0 - pu, ya, z0 + a0 + 0.012, x1 + pu, yb, z0 + a1 - 0.012, col);
    }
  }
  // derz gölgesi: ince koyu çekirdek (bloklar arası boşlukta görünür)
  if (lx) mb.box(x0 + 0.02, y0, z0 + 0.03, x1 - 0.02, y1 - (ruin ? rh * 0.5 : 0.02), z1 - 0.03, C('#8c7f66', 0));
  else mb.box(x0 + 0.03, y0, z0 + 0.02, x1 - 0.03, y1 - (ruin ? rh * 0.5 : 0.02), z1 - 0.02, C('#8c7f66', 0));
}
// mermer sütun: kare kaide, simit, yivli gövde, dor başlığı (kırık sütunda başlık yok, tepe kırık)
function antColumn(mb, x0, y0, z0, x1, y1, z1, bi) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = Math.min(x1 - x0, z1 - z0), h = y1 - y0, M1 = C(APAL.marble, 0), M2 = C(APAL.marbleD, 0);
  const r = w * 0.4, whole = h >= 3 && w < 1.2;
  mb.box(x0, y0, z0, x1, y0 + 0.2, z1, M2);
  mb.cyl(cx, y0 + 0.2, cz, r * 1.18, y0 + 0.34, r * 1.08, 16, M1, M1, '');
  const top = whole ? y1 - 0.32 : y1 - 0.12;
  mb.cyl(cx, y0 + 0.34, cz, r, top, r * (whole ? 0.86 : 0.93), 14, M1, M1, whole ? '' : 't');
  if (whole) {
    mb.cyl(cx, top, cz, r * 0.86, top + 0.16, r * 1.12, 14, M1, M1, '');
    mb.box(x0 - 0.04, top + 0.16, z0 - 0.04, x1 + 0.04, y1, z1 + 0.04, M1);
  } else {
    // kırık tepe: eğik parçalar
    for (let k = 0; k < 3; k++) { const a = hsh(bi, k) * TAU, o = r * 0.4; mb.push().T(cx + Math.cos(a) * o, top + 0.02, cz + Math.sin(a) * o, a, 0.35, 0.2); mb.box(-r * 0.4, 0, -r * 0.3, r * 0.4, 0.12 + 0.06 * k, r * 0.3, M2); mb.pop(); }
  }
}
// devrik sütun: uzun eksen boyunca yatan, arada derzli tamburlar
function antFallen(mb, x0, y0, z0, x1, y1, z1, bi) {
  const w = x1 - x0, d = z1 - z0, lx = w > d, len = lx ? w : d, r = (y1 - y0) / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, M1 = C(APAL.marble, 0), M2 = C(APAL.marbleD, 0);
  const n = Math.max(2, Math.round(len / 1.2)), sl = len / n;
  for (let k = 0; k < n; k++) {
    const c = -len / 2 + (k + 0.5) * sl, rr = r * (0.94 + hsh(bi, k) * 0.06);
    if (lx) mkHCyl(mb, cx + c, y0 + rr, cz, 'x', sl - 0.06, rr, k % 2 ? M1 : shade(M1, 0.96), 14, M2);
    else mkHCyl(mb, cx, y0 + rr, cz + c, 'z', sl - 0.06, rr, k % 2 ? M1 : shade(M1, 0.96), 14, M2);
  }
}
function buildAntik(mb) {
  const quad = (x0, z0, x1, z1, col, y = 0) => mkQuad(mb, x0, z0, x1, z1, col, y);
  const Y = 0.016;
  // ---- zemin: kuru toprak, taş döşeli cadde ve meydanlar, kuru çimen yamaları
  quad(-23, -31, 23, 31, C(APAL.earth, 0));
  quad(-200, -200, 56, 200, C('#bfa983', 0), -0.03);
  const slabs = (x0, z0, x1, z1, sz, y, k0) => {
    for (let x = x0; x < x1 - 0.01; x += sz) for (let z = z0; z < z1 - 0.01; z += sz) {
      const q = hsh(Math.round(x * 5) + k0, Math.round(z * 5));
      if (q < 0.08) continue;
      quad(x + 0.03, z + 0.03, Math.min(x + sz, x1) - 0.03, Math.min(z + sz, z1) - 0.03, C(q > 0.6 ? APAL.pave : q > 0.3 ? '#cbbfa5' : APAL.paveD, 0), y);
    }
  };
  for (const s of [-1, 1]) {
    // üs avlusu, sütunlu cadde, agora ve tiyatro orkestrası
    slabs(-22.5, s < 0 ? -30.8 : 24.4, 22.5, s < 0 ? -24.4 : 30.8, 1.5, 0.004, 3 + s);
    slabs(-7, s < 0 ? -23.5 : 5.5, 7, s < 0 ? -5.5 : 23.5, 1.5, 0.004, 9 + s);
    slabs(s < 0 ? -17 : 13, s < 0 ? -21 : 6, s < 0 ? -13 : 17, s < 0 ? -6 : 21, 1.25, 0.004, 15 + s);
    mb.disc(s * -15.2, 0.004, s * 15, 2.9, 4.4, 20, C('#d7cbb2', 0), C('#d7cbb2', 0));
    // üs amblemi (taş mozaik)
    const tc = C(s < 0 ? '#b8322f' : '#2b5cc4', 0), bg = C('#e0d6c2', 0);
    mb.disc(0, Y, s * 27.6, 2.2, 2.2, 32, tc, tc); mb.disc(0, Y + 0.004, s * 27.6, 1.75, 1.75, 32, bg, bg);
    mb.triN([0, Y + 0.008, s * 27.6 - s * 1.2], [-0.95, Y + 0.008, s * 27.6 + s * 0.75], [0.95, Y + 0.008, s * 27.6 + s * 0.75], UP, UP, UP, tc);
  }
  slabs(-6, -6, 6, 6, 1.5, 0.004, 21);
  for (let k = 0; k < 30; k++) {
    const s = k % 2 ? 1 : -1, x = s * (hsh(k, 41) * 44 - 22), z = s * (2 + hsh(k, 42) * 21), r = 0.9 + hsh(k, 43) * 1.8;
    mb.disc(x, 0.006, z, r * 1.3, r, 12, C(k % 3 ? APAL.grass : APAL.grassD, 0), C(k % 3 ? APAL.grass : APAL.grassD, 0), MK_J);
  }
  // dağınık taş parçaları
  for (let k = 0; k < 40; k++) {
    const s = k % 2 ? 1 : -1, x = s * (hsh(k, 61) * 44 - 22), z = s * (1 + hsh(k, 62) * 22), r = 0.12 + hsh(k, 63) * 0.22;
    if (ctHit(x, 0.05, z, r + 0.2, 1) >= 0) continue;
    mb.push().T(x, 0, z, hsh(k, 64) * TAU); mb.box(-r, 0, -r * 0.7, r, r * 0.8, r * 0.7, C(k % 2 ? APAL.ashlar : APAL.marbleD, 0)); mb.pop();
  }
  // ---- kutular
  CT_BOXES.forEach((b, bi) => {
    const [x0, y0, z0, x1, y1, z1, t] = b;
    const w = x1 - x0, d = z1 - z0, h = y1 - y0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = w > d;
    if (t === 0) {
      // sur: büyük kesme taşlar, mazgallı üst, iç yüzde payandalar
      antWall(mb, x0, y0, z0, x1, y1, z1, bi, false, 0.85, 1.7);
      const zi = lx ? (z0 < 0 ? z1 : z0) : 0, xi = lx ? 0 : (x0 < 0 ? x1 : x0), s = lx ? (z0 < 0 ? 1 : -1) : (x0 < 0 ? 1 : -1);
      const a0 = lx ? x0 : z0, a1 = lx ? x1 : z1, M1 = C(APAL.ashlarL, 0);
      for (let a = a0 + 0.3; a < a1 - 0.4; a += 1.3) { if (lx) mb.box(a, y1, z0, a + 0.7, y1 + 0.6, z1, M1); else mb.box(x0, y1, a, x1, y1 + 0.6, a + 0.7, M1); }
      for (let a = Math.ceil(a0 / 7) * 7; a < a1; a += 7) { if (lx) mb.box(a - 0.4, 0, zi, a + 0.4, y1 - 0.2, zi + s * 0.35, C(APAL.ashlarD, 0)); else mb.box(xi, 0, a - 0.4, xi + s * 0.35, y1 - 0.2, a + 0.4, C(APAL.ashlarD, 0)); }
    } else if (t === 7) {
      // üs önü: taş duvar, iki yüzde takım sancakları
      antWall(mb, x0, y0, z0, x1, y1, z1, bi, false);
      mb.box(x0 - 0.05, y1 - 0.1, z0 - 0.05, x1 + 0.05, y1 + 0.06, z1 + 0.05, C(APAL.marble, 0));
      const tc = C(z0 < 0 ? '#b8322f' : '#2f5fc8', 0), GD = C('#d9b44a', -0.3);
      for (let x = x0 + 1.2; x < x1 - 0.8; x += 2.6) for (const zz of [z0 - 0.03, z1 + 0.03]) {
        mb.box(x - 0.55, 0.9, Math.min(zz, zz + (zz < cz ? -0.02 : 0.02)), x + 0.55, y1 - 0.2, Math.max(zz, zz + (zz < cz ? -0.02 : 0.02)), tc);
        mb.box(x - 0.18, 2.0, Math.min(zz, zz + (zz < cz ? -0.03 : 0.03)), x + 0.18, 2.4, Math.max(zz, zz + (zz < cz ? -0.03 : 0.03)), GD);
        mb.triN([x - 0.55, 0.9, zz], [x + 0.55, 0.9, zz], [x, 0.55, zz], [0, 0, zz < cz ? -1 : 1], [0, 0, zz < cz ? -1 : 1], [0, 0, zz < cz ? -1 : 1], tc);
      }
    } else if (t === 12) {
      antWall(mb, x0, y0, z0, x1, y1, z1, bi, true);
      // sahne binası (tiyatro): kemerli niş kapıları
      if (!lx && d > 6) {
        const s = cx > 0 ? 1 : -1, fx = s > 0 ? x1 : x0, NI = C('#6f6452', 0);
        for (const zz of [cz - 2.4, cz, cz + 2.4]) {
          mb.box(fx - s * 0.02, y0, zz - 0.6, fx + s * 0.01, y0 + 1.9, zz + 0.6, NI);
          mkHCyl(mb, fx + s * 0.0, y0 + 1.9, zz, 'x', 0.03, 0.6, NI, 12);
          mb.box(fx, y0 + 2.55, zz - 0.8, fx + s * 0.07, y0 + 2.68, zz + 0.8, C(APAL.marble, 0));
        }
      }
    } else if (t === 11) {
      antColumn(mb, x0, y0, z0, x1, y1, z1, bi);
    } else if (t === 19) {
      antFallen(mb, x0, y0, z0, x1, y1, z1, bi);
    } else if (t === 2) {
      // mermer blok: kaba yonu, yüzünde kabartma pano, üstte silme
      const M1 = C(APAL.marble, 0), M2 = C(APAL.marbleD, 0);
      mb.box(x0 + 0.02, y0, z0 + 0.02, x1 - 0.02, y1 - 0.12, z1 - 0.02, M2);
      mb.box(x0 - 0.02, y1 - 0.14, z0 - 0.02, x1 + 0.02, y1, z1 + 0.02, M1);
      mb.box(x0 - 0.02, y0, z0 - 0.02, x1 + 0.02, y0 + 0.14, z1 + 0.02, M1);
      mb.box(x0 + w * 0.18, y0 + 0.3, z0 - 0.0, x1 - w * 0.18, y1 - 0.32, z0 + 0.012, C('#dcd4c3', 0));
      mb.box(x0 + w * 0.18, y0 + 0.3, z1 - 0.012, x1 - w * 0.18, y1 - 0.32, z1, C('#dcd4c3', 0));
      mb.sphereS(cx, y0 + h * 0.55, z0 - 0.01, w * 0.12, h * 0.14, 0.05, M1, 8, 5);
    } else if (t === 6) {
      // tapınak kaidesi ve basamaklar: mermer, silme çizgileri; üstte döşeme
      const M1 = C(APAL.marble, 0), M2 = C(APAL.marbleD, 0);
      if (h > 1) {
        mb.box(x0, y0, z0, x1, y1 - 0.12, z1, M2);
        mb.box(x0 - 0.04, y1 - 0.12, z0 - 0.04, x1 + 0.04, y1, z1 + 0.04, M1);
        for (const yy of [0.3, 0.62, 0.94]) mb.box(x0 - 0.015, yy, z0 - 0.015, x1 + 0.015, yy + 0.03, z1 + 0.015, M1);
        for (let x = x0 + 0.1; x < x1 - 0.1; x += 1.25) for (let z = z0 + 0.1; z < z1 - 0.1; z += 1.25) mkQuad(mb, x + 0.03, z + 0.03, Math.min(x + 1.25, x1 - 0.1) - 0.03, Math.min(z + 1.25, z1 - 0.1) - 0.03, C(hsh(Math.round(x * 4), Math.round(z * 4)) > 0.5 ? '#ece7dc' : '#e2dccd', 0), y1 + 0.004);
      } else {
        // iki basamak görünümü (çarpışma tek kutu)
        const outer = cz < 0 ? z0 : z1, sg = cz < 0 ? 1 : -1;
        mb.box(x0, y0, z0, x1, y0 + h / 2, z1, M2);
        mb.box(x0, y0 + h / 2, Math.min(outer + sg * d * 0.45, cz < 0 ? z1 : z0), x1, y1, Math.max(outer + sg * d * 0.45, cz < 0 ? z1 : z0), M1);
        mb.box(x0 - 0.01, y0 + h / 2 - 0.03, z0 - 0.01, x1 + 0.01, y0 + h / 2, z1 + 0.01, M1);
      }
    } else if (t === 18) {
      // tiyatro basamağı: oturma taşı (üst), önde yüksek ayna, oturak çizgileri
      const L1 = C('#d8ccb3', 0), L2 = C('#bfb294', 0);
      mb.box(x0, y0, z0, x1, y1 - 0.08, z1, L2);
      mb.box(x0 - 0.03, y1 - 0.08, z0, x1, y1, z1, L1);
      for (let z = z0 + 0.6; z < z1 - 0.2; z += 1.6) mkQuad(mb, x0 + 0.05, z, x1 - 0.05, z + 0.04, C('#b4a78a', 0), y1 + 0.003);
    } else {
      mb.box(x0, y0, z0, x1, y1, z1, C(APAL.ashlar, 0));
    }
  });
  // tapınak: sütunların üstünde kırık arşitrav (yalnızca iki sütun arası), alınlık parçası yerde
  {
    const M1 = C(APAL.marble, 0), M2 = C(APAL.marbleD, 0);
    mb.box(-4.75, 4.65, -3.65, 4.75, 5.2, -2.75, M1);
    for (let x = -4.5; x < 4.6; x += 0.9) mb.box(x - 0.08, 5.2, -3.66, x + 0.08, 5.32, -2.74, M2);
    mb.box(-4.75, 5.32, -3.7, 4.75, 5.44, -2.7, M1);
  }
  // ---- arena dışı: zeytin ve servi ağaçları, kuru tepeler, kemerli su kemeri, uzakta deniz
  const olive = (x, z, k) => {
    const BK = C(APAL.bark, 0), L1 = C(APAL.olive, 0), L2 = C(APAL.oliveD, 0);
    const lean = (hsh(k, 1) - 0.5) * 0.8, top = [x + lean, 1.9 + hsh(k, 2) * 0.6, z + (hsh(k, 3) - 0.5) * 0.6];
    limb(mb, [x, 0, z], [x + lean * 0.4, 1.0, z], [0.28, 0.2], BK, 7); limb(mb, [x + lean * 0.4, 1.0, z], top, [0.2, 0.14], BK, 7);
    for (let j = 0; j < 4; j++) { const a = (j / 4) * TAU + k, o = 0.9; mb.sphereS(top[0] + Math.cos(a) * o, top[1] + 0.5 + hsh(k, j) * 0.4, top[2] + Math.sin(a) * o, 1.2, 0.8, 1.1, j % 2 ? L1 : L2, 10, 6); }
    mb.sphereS(top[0], top[1] + 1.1, top[2], 1.2, 0.85, 1.2, L1, 10, 6);
  };
  const cypress = (x, z, hh) => { mb.cyl(x, 0, z, 0.18, 1, 0.15, 6, C(APAL.bark, 0), C(APAL.bark, 0)); mb.sphereS(x, hh * 0.52, z, 0.9, hh * 0.5, 0.9, C(APAL.cypress, 0), 10, 8); };
  for (let k = 0; k < 34; k++) {
    const side = k % 4, a = hsh(k, 71), b2 = hsh(k, 72);
    let x, z;
    if (side === 0) { x = -27 - b2 * 20; z = -44 + a * 88; } else if (side === 1) { x = 27 + b2 * 20; z = -44 + a * 88; }
    else if (side === 2) { z = -35 - b2 * 16; x = -36 + a * 72; } else { z = 35 + b2 * 16; x = -36 + a * 72; }
    if (k % 3 === 0) cypress(x, z, 9 + hsh(k, 73) * 5); else olive(x, z, k);
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU + hsh(k, 81) * 0.25, R = 105 + hsh(k, 82) * 45, r = 24 + hsh(k, 83) * 22, hh = 8 + hsh(k, 84) * 16, x = Math.cos(a) * R, z = Math.sin(a) * R;
    if (x > 60) continue;
    mb.frustum(x - r, x + r, z - r * 0.7, z + r * 0.7, -1, x - r * 0.3, x + r * 0.25, z - r * 0.2, z + r * 0.22, hh, C(['#b9a57c', '#a99670', '#c2ae84'][k % 3], 0), C('#a1a066', 0));
  }
  {
    // su kemeri: kuzeybatıda, iki katlı kemerler
    const z = 62, A1 = C('#c8b896', 0), A2 = C('#b3a17e', 0);
    for (let x = -70; x <= 20; x += 6) {
      mb.box(x - 0.9, 0, z - 1.2, x + 0.9, 13, z + 1.2, A1);
      mb.box(x - 0.9, 13, z - 1.25, x + 5.1, 14.2, z + 1.25, A2);
      mb.box(x + 0.9, 10.2, z - 1.2, x + 4.2, 13, z + 1.2, A1);
      mb.box(x - 0.9, 14.2, z - 1.0, x + 0.9, 20, z + 1.0, A1);
      mb.box(x + 0.9, 18.2, z - 1.0, x + 4.2, 20, z + 1.0, A1);
    }
    mb.box(-71, 20, z - 1.1, 25, 21.2, z + 1.1, A2);
  }
  // deniz: doğuda, ufka uzanır
  mkQuad(mb, 56, -320, 64, 320, C('#d2bf95', 0), -0.045);
  mkQuad(mb, 62, -320, 340, 320, C('#3d84b8', -0.85), -0.06);
  for (let k = 0; k < 30; k++) { const zz = -150 + hsh(k, 91) * 300, xx = 72 + hsh(k, 92) * 150; mkQuad(mb, xx - 1.2, zz - 0.07, xx + 1.2, zz + 0.07, C('#e9f4fb', 0.9), -0.055); }
}

/* ============================ karakter ve silah modelleri ============================ */
// Dünya silahı: namlu +z yönünde, kabza (0,0,0)
function gunModel(mb, w, fp) {
  const M1 = C('#2a2d33', -0.6), M2 = C('#3a3e46', -0.6), TN = C('#8a7a58', -0.2), WD = C('#8a5a30', -0.3), BL = C('#16181c', -0.5);
  if (w === 0) {
    mb.rbox(-0.028, -0.02, -0.16, 0.028, 0.07, 0.22, 0.012, M1, 1);          // gövde
    mb.rbox(-0.03, -0.005, 0.22, 0.03, 0.065, 0.5, 0.014, TN, 1);            // el kundağı
    mb.cyl(0, 0.03, 0, 0.012, 0.03, 0.012, 6, BL, BL, '');
    mb.push().T(0, 0.035, 0.5, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.012, 0.2, 0.012, 8, BL, BL); mb.cyl(0, 0.2, 0, 0.02, 0.27, 0.02, 8, M2, M2); mb.pop();
    mb.rbox(-0.022, -0.035, -0.46, 0.022, 0.06, -0.16, 0.014, TN, 1);        // dipçik
    mb.rbox(-0.026, -0.06, -0.47, 0.026, 0.07, -0.44, 0.01, BL, 1);
    mb.push().T(0, -0.02, -0.05, 0, 0.3); mb.rbox(-0.02, -0.15, -0.03, 0.02, 0, 0.03, 0.012, BL, 1); mb.pop();   // kabza
    mb.push().T(0, -0.02, 0.1, 0, -0.22); mb.rbox(-0.018, -0.2, -0.035, 0.018, 0, 0.035, 0.01, M2, 1); mb.pop(); // şarjör
    mb.rbox(-0.012, 0.07, -0.12, 0.012, 0.085, 0.46, 0.004, M2, 1);          // ray
    // kırmızı nokta nişangâhı: içi boş çerçeve
    mb.box(-0.024, 0.085, 0.02, 0.024, 0.092, 0.08, BL);
    for (const sx of [-1, 1]) mb.box(sx * 0.024, 0.085, 0.03, sx * 0.02, 0.132, 0.07, BL);
    mb.box(-0.024, 0.128, 0.03, 0.024, 0.133, 0.07, BL);
    mb.box(-0.0016, 0.1069, 0.05, 0.0016, 0.1101, 0.0505, C('#ff3b30', 1));
    mb.rbox(-0.005, 0.085, 0.42, 0.005, 0.1, 0.44, 0.002, BL, 1);
  } else if (w === 1) {
    mb.rbox(-0.03, -0.015, -0.14, 0.03, 0.065, 0.16, 0.012, M1, 1);
    mb.push().T(0, 0.04, 0.16, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.017, 0.62, 0.017, 8, BL, BL); mb.pop();
    mb.push().T(0, 0.005, 0.16, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.015, 0.5, 0.015, 8, M2, M2); mb.pop();
    mb.rbox(-0.032, -0.025, 0.26, 0.032, 0.03, 0.46, 0.016, WD, 1);          // pompa
    mb.rbox(-0.022, -0.05, -0.46, 0.022, 0.05, -0.14, 0.016, WD, 1);
    mb.push().T(0, -0.015, -0.06, 0, 0.35); mb.rbox(-0.02, -0.13, -0.028, 0.02, 0, 0.028, 0.012, WD, 1); mb.pop();
    mb.rbox(-0.005, 0.058, 0.74, 0.005, 0.075, 0.76, 0.002, C('#e9b93a', 0.5), 1);
  } else if (w === 3) {
    // makineli: kısa gövde, uzun şarjör, tel dipçik, turuncu şerit
    const P2 = C('#464b54', -0.6), OR = C('#e0802e', -0.2);
    mb.rbox(-0.027, -0.02, -0.13, 0.027, 0.066, 0.2, 0.012, M1, 1);
    mb.rbox(-0.029, -0.012, 0.2, 0.029, 0.056, 0.31, 0.012, P2, 1);
    mb.push().T(0, 0.03, 0.31, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.011, 0.13, 0.011, 8, BL, BL); mb.cyl(0, 0.11, 0, 0.017, 0.17, 0.017, 8, M2, M2); mb.pop();
    mb.push().T(0, -0.02, 0.07, 0, -0.12); mb.rbox(-0.016, -0.25, -0.025, 0.016, 0, 0.025, 0.008, BL, 1); mb.pop();
    mb.push().T(0, -0.02, -0.06, 0, 0.28); mb.rbox(-0.019, -0.12, -0.026, 0.019, 0, 0.026, 0.01, BL, 1); mb.pop();
    for (const sx of [-1, 1]) mb.box(sx * 0.017 - 0.003, 0.004, -0.37, sx * 0.017 + 0.003, 0.016, -0.13, BL);
    mb.box(-0.021, -0.04, -0.38, 0.021, 0.022, -0.36, BL);
    mb.rbox(-0.012, 0.066, -0.1, 0.012, 0.079, 0.19, 0.004, M2, 1);
    mb.box(-0.004, 0.079, 0.16, 0.004, 0.1, 0.172, BL); mb.box(-0.012, 0.079, -0.085, 0.012, 0.102, -0.066, BL);
    for (const sx of [-1, 1]) mb.box(sx * 0.0275 - (sx > 0 ? 0 : 0.002), 0.028, 0.0, sx * 0.0275 + (sx > 0 ? 0.002 : 0), 0.044, 0.15, OR);
  } else {
    mb.rbox(-0.026, -0.02, -0.16, 0.026, 0.06, 0.26, 0.012, C('#4a5a3c', -0.3), 1);
    mb.push().T(0, 0.03, 0.26, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.013, 0.62, 0.011, 8, BL, BL); mb.cyl(0, 0.62, 0, 0.022, 0.72, 0.022, 8, M2, M2); mb.pop();
    mb.rbox(-0.024, -0.05, -0.5, 0.024, 0.055, -0.16, 0.016, C('#4a5a3c', -0.3), 1);
    mb.rbox(-0.02, 0.055, -0.4, 0.02, 0.08, -0.26, 0.01, BL, 1);
    mb.push().T(0, -0.02, -0.06, 0, 0.3); mb.rbox(-0.019, -0.13, -0.028, 0.019, 0, 0.028, 0.012, BL, 1); mb.pop();
    mb.rbox(-0.016, -0.09, 0.04, 0.016, -0.02, 0.12, 0.008, M2, 1);
    // dürbün
    mb.push().T(0, 0.115, -0.1, 0, Math.PI / 2); mb.cyl(0, 0, 0, 0.026, 0.07, 0.022, 10, BL, BL); mb.cyl(0, 0.07, 0, 0.018, 0.25, 0.018, 10, M1, M1, ''); mb.cyl(0, 0.25, 0, 0.022, 0.34, 0.03, 10, BL, BL); mb.pop();
    if (!fp) mb.box(-0.02, 0.095, 0.2405, 0.02, 0.135, 0.241, C('#7fb8ff', 0.6));
    for (const z of [-0.04, 0.12]) mb.rbox(-0.012, 0.06, z, 0.012, 0.1, z + 0.03, 0.004, M2, 1);
    mb.rbox(0.026, 0.02, -0.06, 0.07, 0.035, -0.045, 0.005, M2, 1);
    mb.sphereS(0.075, 0.027, -0.052, 0.014, 0.014, 0.014, BL, 8, 5);
  }
}
const MUZZLE = [0.79, 0.8, 1.0, 0.49];
// Savaşçı: gövde+baş (tek parça), bacak (kalçadan), silahlı kollar (göğüsten; nişan eğimiyle döner)
function fighterParts(ci, team) {
  const st = styleOf(ci), tm = TEAM[team % 2];
  const jacket = C(tm.jacket, -0.1), vest = C('#2c3038', -0.2), skin = C(st.skin, -0.1), hair = C(st.hairC, -0.2), pants = C(team % 2 ? '#39424f' : '#4a433c', 0), boot = C('#22201f', -0.2), helm = C(tm.dark, -0.35), bright = C(tm.hex, 0.3);
  const body = new MB('lit'), leg = new MB('lit'), arms = new MB('lit');
  body.rbox(-0.235, 0.86, -0.13, 0.235, 1.43, 0.13, 0.07, jacket, 2);
  body.rbox(-0.25, 0.98, -0.155, 0.25, 1.36, 0.155, 0.05, vest, 2);
  body.rbox(-0.2, 0.84, -0.14, 0.2, 0.93, 0.14, 0.03, C('#1d1f24', 0), 1);
  for (const x of [-0.14, 0.02, 0.12]) body.rbox(x - 0.045, 1.02, 0.15, x + 0.045, 1.15, 0.2, 0.015, C('#3a3f49', -0.2), 1);
  body.rbox(-0.16, 1.0, -0.26, 0.16, 1.36, -0.14, 0.05, C('#3a3f49', -0.2), 2);              // sırt çantası
  body.box(-0.251, 1.27, -0.06, -0.2505, 1.34, 0.06, bright); body.box(0.2505, 1.27, -0.06, 0.251, 1.34, 0.06, bright);
  body.box(-0.1, 1.24, 0.1555, 0.1, 1.31, 0.156, bright);
  body.cyl(0, 1.4, 0, 0.065, 1.5, 0.06, 10, skin, skin, '');
  body.sphereS(0, 1.61, 0.005, 0.125, 0.145, 0.135, skin, 16, 10);
  body.sphereS(0, 1.665, -0.012, 0.15, 0.115, 0.16, helm, 16, 8);
  body.rbox(-0.15, 1.6, -0.165, 0.15, 1.68, -0.02, 0.04, helm, 1);
  body.box(-0.151, 1.63, -0.1, -0.1505, 1.69, 0.06, bright); body.box(0.1505, 1.63, -0.1, 0.151, 1.69, 0.06, bright);
  body.rbox(-0.11, 1.5, -0.13, 0.11, 1.6, -0.05, 0.03, hair, 1);
  for (const s of [-1, 1]) { body.sphereS(s * 0.05, 1.615, 0.125, 0.017, 0.02, 0.01, C('#17131c', 0), 8, 5); }
  body.rbox(-0.03, 1.545, 0.118, 0.03, 1.556, 0.132, 0.004, C('#7a2a2a', 0), 1);
  const acc = st.acc || [];
  if (acc.includes('glasses') || acc.includes('shades')) body.rbox(-0.105, 1.59, 0.115, 0.105, 1.645, 0.14, 0.012, C(acc.includes('shades') ? '#111' : '#2a3d55', -0.9), 1);
  leg.rbox(-0.095, -0.5, -0.1, 0.095, 0.03, 0.1, 0.045, pants, 1);
  leg.rbox(-0.085, -0.78, -0.09, 0.085, -0.44, 0.09, 0.04, pants, 1);
  leg.rbox(-0.09, -0.86, -0.1, 0.09, -0.72, 0.16, 0.04, boot, 1);
  leg.rbox(-0.092, -0.5, 0.07, 0.092, -0.4, 0.125, 0.02, C('#2c3038', 0), 1);
  // kollar: göğüs ekseni (0,1.3,0) çevresinde; silah elde
  const RS = [-0.25, 0.06, 0], RE = [-0.22, -0.16, 0.2], RH = [-0.07, -0.05, 0.36], LS2 = [0.25, 0.06, 0], LE = [0.2, -0.17, 0.3], LH = [0.01, -0.02, 0.62];
  limb(arms, RS, RE, [0.07, 0.06], jacket, 8); limb(arms, RE, RH, [0.055, 0.045], jacket, 8); arms.sphereS(RH[0], RH[1], RH[2], 0.05, 0.05, 0.05, C('#1d1f24', 0), 8, 6);
  limb(arms, LS2, LE, [0.07, 0.06], jacket, 8); limb(arms, LE, LH, [0.055, 0.045], jacket, 8); arms.sphereS(LH[0], LH[1], LH[2], 0.05, 0.05, 0.05, C('#1d1f24', 0), 8, 6);
  return { body, leg, arms };
}
// Birinci şahıs kollar (görüş uzayı; silah yerel koordinatı: kabza (0,0,0), namlu +z)
function fpArms(mb, team) {
  const sl = C(TEAM[team % 2].jacket, -0.1), gl = C('#1d1f24', -0.2);
  // görüş uzayında silah 180° döner: ekranın sağı = yerel -x
  limb(mb, [-0.16, -0.26, -0.5], [-0.02, -0.07, -0.02], [0.075, 0.05], sl, 9); mb.sphereS(0.0, -0.05, 0.0, 0.048, 0.055, 0.06, gl, 10, 7);
  limb(mb, [0.32, -0.3, -0.25], [0.03, -0.03, 0.34], [0.075, 0.05], sl, 9); mb.sphereS(0.01, -0.01, 0.36, 0.05, 0.05, 0.065, gl, 10, 7);
}

/* ============================ sesler ============================ */
class CtSnd extends Snd {
  constructor() { super(); this.musVol = 2.0; }
  tempo() { return 84; }
  beat(t, s, bar, spb) {
    // lobide ve sonuçta: gergin, yavaş nabız (Re minör)
    const CHS = [[38, [62, 65, 69]], [34, [62, 65, 70]], [36, [60, 64, 67]], [33, [57, 61, 64]]];
    const [root, ch] = CHS[bar % 4];
    if (s === 0) { this.iPad(t, ch, spb * 4, 0.018, 700); this.iBass(t, root, spb * 2.5, 0.1, 'sub'); }
    if (s === 0 || s === 6 || s === 10) this.iKick(t, 0.1, 90, 40, 0.2);
    if (s === 4 || s === 12) this.iRim(t, 0.03);
    if (s % 2 === 1) this.iShk(t, 0.008);
    if (s === 14 && bar % 2) this.iBell(t, ch[2] + 12, 0.014, 1.2, 0.3);
  }
  now() { return this.k.ctx.currentTime; }
  shot(w, vol = 1, pan = 0, far = 0) {
    if (!this.on() || vol < 0.02) return;
    try {
      const t = this.now(), lp = 1 - far * 0.75;
      if (w === 0) {
        this.noise(t, 0.085, 0.5 * vol, { type: 'bandpass', freq: 1700 * lp, to: 500 * lp, q: 0.7 }, pan);
        this.tone(170, t, 0.07, 'square', 0.12 * vol, 55, 0.001, pan);
        if (!far) this.noise(t, 0.02, 0.2 * vol, { type: 'highpass', freq: 5200 }, pan);
        this.noise(t + 0.09, 0.22, 0.07 * vol, { type: 'lowpass', freq: 900 * lp, to: 250 }, pan);
      } else if (w === 1) {
        this.noise(t, 0.2, 0.75 * vol, { type: 'lowpass', freq: 1500 * lp, to: 260, q: 0.6 }, pan);
        this.tone(105, t, 0.16, 'sine', 0.4 * vol, 38, 0.001, pan);
        this.noise(t + 0.16, 0.4, 0.1 * vol, { type: 'lowpass', freq: 700 * lp, to: 200 }, pan);
        if (!far) { this.noise(t + 0.36, 0.05, 0.16 * vol, { type: 'bandpass', freq: 2100, q: 2 }, pan); this.noise(t + 0.5, 0.06, 0.2 * vol, { type: 'bandpass', freq: 1500, q: 2 }, pan); }
      } else if (w === 3) {
        this.noise(t, 0.06, 0.42 * vol, { type: 'bandpass', freq: 2400 * lp, to: 720 * lp, q: 0.8 }, pan);
        this.tone(235, t, 0.045, 'square', 0.1 * vol, 80, 0.001, pan);
        if (!far) this.noise(t, 0.014, 0.17 * vol, { type: 'highpass', freq: 6200 }, pan);
        this.noise(t + 0.055, 0.13, 0.05 * vol, { type: 'lowpass', freq: 1100 * lp, to: 300 }, pan);
      } else {
        this.noise(t, 0.05, 0.7 * vol, { type: 'highpass', freq: 2600 * lp }, pan);
        this.noise(t, 0.34, 0.6 * vol, { type: 'lowpass', freq: 1900 * lp, to: 180, q: 0.5 }, pan);
        this.tone(88, t, 0.24, 'sine', 0.42 * vol, 30, 0.001, pan);
        this.noise(t + 0.2, 0.5, 0.12 * vol, { type: 'lowpass', freq: 800 * lp, to: 150 }, pan);
        this.noise(t + 0.44, 0.6, 0.06 * vol, { type: 'lowpass', freq: 500 * lp, to: 120 }, pan);
        if (!far) { this.noise(t + 0.55, 0.04, 0.14 * vol, { type: 'bandpass', freq: 2600, q: 3 }, pan); this.noise(t + 0.82, 0.05, 0.16 * vol, { type: 'bandpass', freq: 1800, q: 3 }, pan); }
      }
      // gövde vuruşu, mekanizma ve sokak yankısı
      this.tone([150, 95, 80, 190][w], t, [0.06, 0.12, 0.16, 0.045][w], 'sine', [0.34, 0.3, 0.3, 0.26][w] * vol, 40, 0.001, pan);
      if (!far && (w === 0 || w === 3)) this.noise(t + 0.04, 0.016, 0.1 * vol, { type: 'bandpass', freq: w === 3 ? 4400 : 3800, q: 4 }, pan);
      const R = this.rev();
      if (R) this.noise(t + 0.005, [0.16, 0.3, 0.42, 0.12][w], [0.5, 0.8, 0.95, 0.42][w] * vol * (0.6 + far * 0.6), { type: 'bandpass', freq: [1300, 800, 1000, 1700][w] * lp, to: 260, q: 0.5 }, 0, R);
    } catch { /* yok say */ }
  }
  // sokak yankısı: üretilmiş darbe yanıtıyla evrişim (bir kez kurulur)
  rev() {
    if (this._rev !== undefined) return this._rev;
    this._rev = null;
    try {
      const c = this.k.ctx, len = Math.floor(c.sampleRate * 1.9), b = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) { const k = i / len; lp += ((Math.random() * 2 - 1) - lp) * (0.5 - k * 0.42); d[i] = lp * Math.pow(1 - k, 2.6) * (i < 400 ? i / 400 : 1); }
        for (const [ms, g] of [[70, 0.5], [130, 0.35], [210, 0.22]]) { const o = Math.floor((ms / 1000) * c.sampleRate) + ch * 211; for (let i = 0; i < 300 && o + i < len; i++) d[o + i] += (Math.random() * 2 - 1) * g * (1 - i / 300); }
      }
      const cv = c.createConvolver(), g = c.createGain();
      cv.buffer = b; g.gain.value = 0.5;
      cv.connect(g).connect(this.k.bus);
      this._rev = cv;
    } catch { this._rev = null; }
    return this._rev;
  }
  play(name, vol = 1, pan = 0) {
    if (!this.on() || vol < 0.02) return;
    try {
      const t = this.now();
      switch (name) {
        case 'hit': this.tone(1900, t, 0.035, 'square', 0.07 * vol, 1500, 0.001); this.noise(t, 0.02, 0.1 * vol, { type: 'highpass', freq: 4000 }); break;
        case 'head': this.tone(2700, t, 0.12, 'sine', 0.2 * vol, null, 0.001); this.tone(4050, t + 0.02, 0.16, 'sine', 0.1 * vol, null, 0.001); break;
        case 'kill': this.tone(1320, t, 0.09, 'triangle', 0.2 * vol, null, 0.002); this.tone(1760, t + 0.07, 0.2, 'triangle', 0.2 * vol, null, 0.002); this.noise(t, 0.08, 0.12 * vol, { type: 'lowpass', freq: 500 }); break;
        case 'hurt': this.noise(t, 0.12, 0.35 * vol, { type: 'lowpass', freq: 600, to: 200 }, pan); this.tone(120, t, 0.12, 'sine', 0.25 * vol, 60, 0.002, pan); break;
        case 'die': this.tone(300, t, 0.5, 'sawtooth', 0.12 * vol, 60, 0.01); this.noise(t, 0.4, 0.2 * vol, { type: 'lowpass', freq: 500, to: 100 }); break;
        case 'spawn': this.tone(400, t, 0.25, 'sine', 0.1 * vol, 900, 0.02); this.noise(t, 0.3, 0.06 * vol, { type: 'bandpass', freq: 800, to: 3000, q: 1 }); break;
        case 'empty': this.noise(t, 0.025, 0.2 * vol, { type: 'bandpass', freq: 3200, q: 3 }); break;
        case 'magout': this.noise(t, 0.04, 0.22 * vol, { type: 'bandpass', freq: 2400, q: 2 }); this.tone(500, t, 0.03, 'square', 0.03 * vol, 300, 0.001); break;
        case 'magin': this.noise(t, 0.05, 0.26 * vol, { type: 'bandpass', freq: 1700, q: 2 }); this.tone(300, t, 0.04, 'square', 0.04 * vol, 200, 0.001); break;
        case 'bolt': this.noise(t, 0.04, 0.2 * vol, { type: 'bandpass', freq: 2800, q: 3 }); this.noise(t + 0.11, 0.05, 0.24 * vol, { type: 'bandpass', freq: 1900, q: 3 }); break;
        case 'switch': this.noise(t, 0.07, 0.14 * vol, { type: 'bandpass', freq: 1200, to: 2600, q: 1 }); break;
        case 'ads': this.noise(t, 0.05, 0.06 * vol, { type: 'bandpass', freq: 1800, q: 1 }); break;
        case 'step': this.noise(t, 0.05, 0.1 * vol, { type: 'lowpass', freq: 500 + Math.random() * 250, q: 0.8 }, pan); this.tone(90, t, 0.04, 'sine', 0.05 * vol, 60, 0.002, pan); break;
        case 'jump': this.noise(t, 0.08, 0.07 * vol, { type: 'bandpass', freq: 700, to: 1400, q: 1 }); break;
        case 'shell': this.tone(4300 + Math.random() * 900, t, 0.05, 'sine', 0.035 * vol, null, 0.001, pan); this.tone(5200 + Math.random() * 900, t + 0.07, 0.04, 'sine', 0.025 * vol, null, 0.001, pan); break;
        case 'heart': this.tone(62, t, 0.11, 'sine', 0.5 * vol, 40, 0.004); this.tone(56, t + 0.2, 0.13, 'sine', 0.38 * vol, 36, 0.004); break;
        case 'boom': { const R = this.rev(); if (R) this.noise(t + 0.02, 0.8, 0.9 * vol, { type: 'lowpass', freq: 800, to: 120 }, 0, R); } this.noise(t, 1.1, 0.7 * vol, { type: 'lowpass', freq: 1100, to: 70, attack: 0.003 }, pan); this.tone(96, t, 0.6, 'sine', 0.55 * vol, 30, 0.003, pan); this.noise(t + 0.015, 0.22, 0.35 * vol, { type: 'bandpass', freq: 2100, q: 0.7 }, pan); this.noise(t + 0.25, 1.4, 0.12 * vol, { type: 'lowpass', freq: 380, to: 120 }, pan); break;
        case 'throw': this.noise(t, 0.16, 0.14 * vol, { type: 'bandpass', freq: 900, to: 2200, q: 1 }, pan); this.tone(1900, t + 0.02, 0.03, 'square', 0.04 * vol, null, 0.001, pan); break;
        case 'pick': [0, 7, 12].forEach((n, k) => this.tone(660 * Math.pow(2, n / 12), t + k * 0.06, 0.2, 'triangle', 0.13 * vol, null, 0.004, pan)); break;
        case 'slide': this.noise(t, 0.45, 0.16 * vol, { type: 'bandpass', freq: 700, to: 300, q: 0.8 }, pan); break;
        case 'land': this.noise(t, 0.1, 0.2 * vol, { type: 'lowpass', freq: 450, to: 150 }); this.tone(80, t, 0.08, 'sine', 0.14 * vol, 50, 0.002); break;
        case 'ric': this.tone(2400 + Math.random() * 1500, t, 0.12, 'sine', 0.035 * vol, 900, 0.001, pan); this.noise(t, 0.03, 0.08 * vol, { type: 'highpass', freq: 3000 }, pan); break;
        case 'whiz': this.noise(t, 0.09, 0.14 * vol, { type: 'bandpass', freq: 3200, to: 900, q: 2.5 }, pan); break;
        case 'heart': this.tone(62, t, 0.11, 'sine', 0.3 * vol, 44, 0.004); this.tone(58, t + 0.17, 0.12, 'sine', 0.22 * vol, 40, 0.004); break;
        case 'tick': this.tone(1100, t, 0.04, 'sine', 0.08 * vol, null, 0.002); break;
        case 'go': this.tone(330, t, 0.55, 'sawtooth', 0.07 * vol, 440, 0.02); this.tone(660, t, 0.55, 'square', 0.04 * vol, 880, 0.02); this.noise(t, 0.3, 0.05 * vol, { type: 'bandpass', freq: 1000, q: 1 }); break;
        case 'streak': [0, 4, 7, 12].forEach((n, k) => this.tone(587 * Math.pow(2, n / 12), t + k * 0.06, 0.22, 'square', 0.06 * vol, null, 0.003)); break;
        case 'win': this.cheer(t, 1.8); [0, 4, 7, 12, 16].forEach((n, k) => this.tone(523 * Math.pow(2, n / 12), t + k * 0.11, 0.4, 'triangle', 0.13 * vol, null, 0.004)); break;
        case 'lose': [7, 3, 0, -5].forEach((n, k) => this.tone(392 * Math.pow(2, n / 12), t + k * 0.16, 0.42, 'triangle', 0.11 * vol, null, 0.004)); break;
        case 'emote': this.tone(880, t, 0.08, 'sine', 0.08 * vol, 1200, 0.004); break;
        default: break;
      }
    } catch { /* yok say */ }
  }
}

/* ============================ oyun ============================ */
const DAY = { sunC: [1.12, 0.95, 0.72], sky: [0.46, 0.53, 0.68], gnd: [0.36, 0.31, 0.26], night: 0, warm: [1, 0.8, 0.5], lampC: [0, 0, 0], fogR: [60, 190], stars: 0, glowS: 1 };
const SUN = new Float32Array(norm3([0.42, 0.6, 0.3]));
const SKY_TOP = hexRGB('#3f78cf'), SKY_HOR = hexRGB('#f6dcb6'), FOG = new Float32Array(hexRGB('#ecd6b6'));
// harita başına ortam: 0 Kasaba (öğle), 1 Liman (gün batımı), 2 Fabrika (gece), 3 Karlı Üs (kapalı kış), 4 Antik Kent (yaz öğlesi)
// torch: gece oyuncunun önündeki fener ışığı; rim: oyuncu kenar ışığı; fx: renk/parıltı ayarı; snow: kar yağışı
const ENVS = [
  { day: Object.assign({}, DAY), sun: Array.from(SUN), top: Array.from(SKY_TOP), hor: Array.from(SKY_HOR), fog: Array.from(FOG) },
  { day: Object.assign({}, DAY, { sunC: [1.32, 0.86, 0.6], sky: [0.42, 0.4, 0.56], gnd: [0.36, 0.28, 0.24], warm: [1, 0.7, 0.42], fogR: [60, 185] }),
    sun: norm3([-0.66, 0.33, 0.4]), top: hexRGB('#4b5b9e'), hor: hexRGB('#ffb98c'), fog: hexRGB('#eeb998') },
  { day: Object.assign({}, DAY, { sunC: [0.5, 0.56, 0.8], sky: [0.36, 0.39, 0.56], gnd: [0.19, 0.18, 0.21], night: 1, stars: 1, glowS: 0.5, warm: [1, 0.76, 0.42], fogR: [40, 150],
      torch: [0.34, 0.31, 0.26], rim: 0.85, fx: { bloom: 0.95, th: 0.58, white: 0.12, sat: 1.08, con: 0.22, tint: [0.97, 1, 1.06] } }),
    sun: norm3([-0.45, 0.62, -0.5]), top: hexRGB('#060a1c'), hor: hexRGB('#25304f'), fog: hexRGB('#1b2238') },
  { day: Object.assign({}, DAY, { sunC: [0.8, 0.82, 0.88], sky: [0.54, 0.6, 0.72], gnd: [0.5, 0.52, 0.57], warm: [1, 0.8, 0.5], fogR: [38, 160], snow: 1,
      fx: { bloom: 0.4, th: 0.9, white: 0.08, sat: 0.95, con: 0.22, tint: [0.97, 1, 1.05] } }),
    sun: norm3([0.35, 0.42, -0.55]), top: hexRGB('#7d99bd'), hor: hexRGB('#e1e8ef'), fog: hexRGB('#d9e1ea') },
  { day: Object.assign({}, DAY, { sunC: [1.1, 0.98, 0.8], sky: [0.5, 0.58, 0.74], gnd: [0.42, 0.37, 0.3], warm: [1, 0.82, 0.52], fogR: [70, 230],
      fx: { bloom: 0.45, th: 0.84, white: 0.14, sat: 1.1, con: 0.25, tint: [1.05, 1, 0.92] } }),
    sun: norm3([0.38, 0.78, 0.3]), top: hexRGB('#2a63c4'), hor: hexRGB('#d7e9f7'), fog: hexRGB('#dde9f3') }
];
const CT_AMB = [['city', 0.35], ['sea+wind', 0.35], ['city+night', 0.3], ['wind', 0.45], ['wind+night', 0.26]];
const CT_MAPI = ['🏘️', '⚓', '🏭', '❄️', '🏛️'];
function ctEnv(i) {
  const E = ENVS[i] || ENVS[0];
  for (const k of ['torch', 'rim', 'fx', 'snow']) delete DAY[k];
  Object.assign(DAY, E.day); SUN.set(E.sun); FOG.set(E.fog);
  for (let k = 0; k < 3; k++) { SKY_TOP[k] = E.top[k]; SKY_HOR[k] = E.hor[k]; }
}
const SENS = [0.68, 1, 1.42];
const VM_HIP = [[0.2, -0.2, -0.4], [0.2, -0.19, -0.38], [0.19, -0.2, -0.36], [0.2, -0.195, -0.35]];
const VM_ADS = [[0, -0.1085, -0.26], [0, -0.068, -0.3], [0, -0.115, -0.2], [0, -0.096, -0.24]];
const STREAK = { 2: 'ÇİFTE!', 3: 'ÜÇLEME!', 4: 'DÖRTLEME!', 5: 'DURDURULAMAZ!', 7: 'EFSANE!' };

class Game {
  constructor(ctx) {
    injectStyle();
    styleCT();
    this.ctx = ctx;
    this.brand = brandInfo(ctx);
    this.dead = false;
    this.view = null;
    this.R = [];
    this.me = null;
    this.meI = -1;
    this.evNext = -1;
    this.panelKey = '';
    this.keys = new Set();
    this.joy = null;
    this.look = null;
    this.firing = 0;
    this.time = 0;
    this.scale = 1;
    this.fx = { tr: [], sp: [], dc: [], fl: [] };
    this.sens = clamp(parseInt(lsGet(LS.sens, '1'), 10) || 0, 0, 2);
    const coarse = (() => { try { return matchMedia('(pointer:coarse)').matches; } catch { return true; } })();
    this.touch = coarse;
    this.auto = lsGet(LS.auto, coarse ? '1' : '0') === '1';
    this.mats = { V: M.make(), P: M.make(), VP: M.make(), P2: M.make(), a: M.make(), b: M.make(), c: M.make(), d: M.make(), e: M.make() };
    this.cam = { x: 0, y: 20, z: -30, dx: 0, dy: -0.4, dz: 1, fov: 1.15, shake: 0 };
    this.pA = new Float32Array(7 * 18 * 200);
    this.pB = new Float32Array(7 * 18 * 320);
    ctMap(((ctx && ctx.view) || {}).map | 0); ctEnv(CT_MI); this.mapB = CT_MI;
    this.build();
    this.snd = new CtSnd();
    try { this.snd.amb(...(CT_AMB[CT_MI] || CT_AMB[0])); } catch { /* yok say */ }
    this.emo = new EmoteUI(this.el.wrap, (e) => { const c = this.ctx; try { c.sendQuiet ? c.sendQuiet('emote', { e }) : c.send('emote', { e }); } catch { /* yok say */ } }, () => this.snd.play('emote'));
    this.X = null;
    try { this.X = makeGL(this.el.cv); } catch (e) { console.warn('[catisma] WebGL açılamadı', e); this.X = null; }
    if (this.X) { try { this.initGL(); } catch (e) { console.warn('[catisma] kaynak', e); this.X = null; } }
    if (!this.X) { this.flat = true; this.el.cv.style.display = 'none'; }
    else {
      this.el.cv.addEventListener('webglcontextlost', this.onLost = (e) => { e.preventDefault(); this.lost = true; }, false);
      this.el.cv.addEventListener('webglcontextrestored', this.onRestore = () => { try { this.X = makeGL(this.el.cv); this.initGL(); this.lost = false; } catch (e) { console.warn('[catisma] geri yükleme', e); } }, false);
    }
    this.lastT = performance.now();
    this.uiT = 0;
    this.sendT = 0;
    this.frameB = (t) => this.loop(t);
    this.raf = requestAnimationFrame(this.frameB);
  }

  initGL() {
    const X = this.X;
    const mb = new MB('lit');
    buildWorld(mb);
    this.world = mb.build(X);
    this.guns = CT_W.map((_w, w) => { const g = new MB('lit'); gunModel(g, w, false); return g.build(X); });
    this.gunsFp = CT_W.map((_w, w) => { const g = new MB('lit'); gunModel(g, w, true); return g.build(X); });
    this.armsFp = [0, 1].map((t) => { const g = new MB('lit'); fpArms(g, t); return g.build(X); });
    this.chars = {};
    // yerdeki kutular: sağlık (beyaz, kırmızı artı) ve cephane (yeşil sandık)
    const med = new MB('lit'), W1 = C('#f4f1ea', 0), R1 = C('#e5383b', 0.25);
    med.rbox(-0.26, 0, -0.17, 0.26, 0.34, 0.17, 0.04, W1);
    med.box(-0.05, 0.07, 0.171, 0.05, 0.27, 0.18, R1); med.box(-0.12, 0.14, 0.171, 0.12, 0.2, 0.18, R1);
    med.box(-0.05, 0.07, -0.18, 0.05, 0.27, -0.171, R1); med.box(-0.12, 0.14, -0.18, 0.12, 0.2, -0.171, R1);
    med.box(-0.08, 0.34, -0.03, 0.08, 0.38, 0.03, C('#8d99ae', 0));
    const am = new MB('lit'), G1 = C('#4f6b3a', 0), G2 = C('#2f4224', 0), Y1 = C('#ffd23f', 0.2);
    am.box(-0.3, 0, -0.19, 0.3, 0.3, 0.19, G1);
    am.box(-0.31, 0.3, -0.2, 0.31, 0.35, 0.2, G2);
    am.box(-0.31, 0.1, -0.2, -0.27, 0.16, 0.2, G2); am.box(0.27, 0.1, -0.2, 0.31, 0.16, 0.2, G2);
    am.box(-0.12, 0.1, 0.191, 0.12, 0.2, 0.198, Y1); am.box(-0.12, 0.1, -0.198, 0.12, 0.2, -0.191, Y1);
    const nd = new MB('lit');
    nd.sphereS(0, 0, 0, 0.075, 0.09, 0.075, C('#3c4a2c', 0), 10, 8);
    nd.box(-0.025, 0.08, -0.025, 0.025, 0.13, 0.025, C('#9aa0a6', 0));
    this.pkMesh = [med.build(X), am.build(X)];
    this.nadeMesh = nd.build(X);
    this.nd = []; this.pkAt = [];
  }
  char(ci, team) {
    const k = ci + '|' + (team % 2);
    if (!this.chars[k]) {
      const p = fighterParts(ci, team);
      this.chars[k] = { body: p.body.build(this.X), leg: p.leg.build(this.X), arms: p.arms.build(this.X) };
    }
    return this.chars[k];
  }

  build() {
    const w = document.createElement('div');
    w.id = 'ky';
    w.className = 'ct';
    w.innerHTML = `
      <canvas class="ct-cv" aria-label="Çatışma 3D sahnesi"></canvas>
      <div class="ct-tags"></div>
      <div class="ct-scope"></div>
      <div class="ct-low"></div><div class="ct-hit"></div>
      <div class="ct-dmg"></div>
      <div class="ct-x"><i class="d"></i><i></i><i></i><i></i><i></i></div>
      <div class="ct-hm"></div>
      <canvas class="ct-radar" width="156" height="224"></canvas>
      <div class="ct-top"></div>
      <div class="ct-feed"></div>
      <div class="ct-ann"></div>
      <div class="ct-prot">🛡️ Doğma koruması</div>
      <div class="ct-joyhint">Yürümek için<br>sürükle</div>
      <div class="ct-joy"><i></i></div>
      <button class="ct-b fireL" data-b="fire" aria-label="Ateş (sol)">${ICON.fire}</button>
      <button class="ct-b fire" data-b="fire" aria-label="Ateş">${ICON.fire}</button>
      <button class="ct-b ads" data-b="ads" aria-label="Nişan al / dürbün">${ICON.ads}</button>
      <button class="ct-b jump" data-b="jump" aria-label="Zıpla">${ICON.jump}</button>
      <button class="ct-b crouch" data-b="crouch" aria-label="Eğil">${ICON.crouch}</button>
      <button class="ct-b reload" data-b="reload" aria-label="Şarjör değiştir">${ICON.reload}</button>
      <button class="ct-b nade" data-b="nade" aria-label="El bombası at">💣<u>2</u></button>
      <div class="ct-wflash"></div>
      <div class="ct-nwarn">💣 BOMBA! KAÇ</div>
      <button class="ct-b auto" data-b="auto" aria-label="Otomatik ateş aç/kapat">OTO ATEŞ</button>
      <div class="ct-bot">
        <div class="ct-hp"><b>100<small>CAN</small></b><div class="bar"><i></i></div></div>
        <div class="ct-ws">${CT_W.map((W, k) => `<button class="ct-w" data-w="${k}" aria-label="${W.n}">${WICON[k]}<small>${W.n}</small></button>`).join('')}</div>
        <div class="ct-ammo">30<small>/∞</small></div>
      </div>
      <div class="ct-dead"><div><b></b><span></span><em></em></div></div>
      <div class="hud"><div class="r1">
        <div class="pos"><b>0</b></div>
        <div class="sp"></div>
        <button class="ib mu ${sfx.isMusicOn && sfx.isMusicOn() ? '' : 'opacity-50'}" data-act="music" aria-label="Müziği aç/kapat">🎵</button>
        <button class="ib so" data-act="sound" aria-label="Efektleri aç/kapat">${sfx.isMuted && sfx.isMuted() ? '🔇' : '🔊'}</button>
        <button class="ib ex" aria-label="Oyunlardan çık" style="display:none">✕</button>
      </div></div>
      <div class="msg"></div>
      <div class="panel"></div>`;
    document.body.appendChild(w);
    const q = (s) => w.querySelector(s);
    this.el = { bNade: q('.ct-b.nade'), wflash: q('.ct-wflash'), nwarn: q('.ct-nwarn'), wrap: w, cv: q('canvas.ct-cv'), tags: q('.ct-tags'), x: q('.ct-x'), xi: [...w.querySelectorAll('.ct-x i')].slice(1), hm: q('.ct-hm'), radar: q('.ct-radar'), top: q('.ct-top'), feed: q('.ct-feed'), ann: q('.ct-ann'), prot: q('.ct-prot'), joyhint: q('.ct-joyhint'), joy: q('.ct-joy'), knob: q('.ct-joy i'), hp: q('.ct-hp'), hpB: q('.ct-hp b'), hpI: q('.ct-hp .bar i'), ammo: q('.ct-ammo'), ws: [...w.querySelectorAll('.ct-w')], dmg: q('.ct-dmg'), low: q('.ct-low'), hit: q('.ct-hit'), deadB: q('.ct-dead b'), deadS: q('.ct-dead span'), deadE: q('.ct-dead em'), ex: q('.ex'), msg: q('.msg'), panel: q('.panel'), bAds: q('.ct-b.ads'), bCrouch: q('.ct-b.crouch'), bAuto: q('.ct-b.auto') };
    const goFS = () => {
      const d = document, r = d.documentElement, fsEl = d.fullscreenElement || d.webkitFullscreenElement;
      try { if (!fsEl) { const f = r.requestFullscreen || r.webkitRequestFullscreen; if (f) { const pr = f.call(r, { navigationUI: 'hide' }); if (pr && pr.catch) pr.catch(() => {}); } } } catch (e) {}
      try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) {}
    };
    this.el.wrap.addEventListener('pointerup', goFS, { once: true });
    this.el.wrap.addEventListener('touchend', goFS, { once: true, passive: true });
    this.el.bAuto.classList.toggle('act', this.auto);
    this.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    let armT = 0;
    this.el.ex.addEventListener('click', () => {
      const b = this.el.ex;
      if (b.dataset.act) return;
      b.classList.add('arm');
      b.textContent = 'Çık?';
      setTimeout(() => { if (!this.dead) b.dataset.act = 'exit-game'; }, 0);
      clearTimeout(armT);
      armT = setTimeout(() => { if (this.dead) return; delete b.dataset.act; b.classList.remove('arm'); b.textContent = '✕'; }, 2600);
    });
    const lookBy = (dx, dy, mouse) => {
      const p = this.me;
      if (!p || !p.alive) return;
      const W = CT_W[p.w];
      let k = (mouse ? 0.0026 : 0.0062) * SENS[this.sens] * (this.cam.fov / 1.15);
      if (!mouse && this.assist && this.assist.ang < 0.045) k *= 0.55;
      p.yaw -= dx * k;
      p.pitch = clamp(p.pitch - dy * k * 0.9, -1.45, 1.45);
      void W;
    };
    this.lookBy = lookBy;
    // düğmeler (ateş düğmesinde sürükleyince nişan da döner)
    w.querySelectorAll('.ct-b').forEach((b) => {
      const k = b.dataset.b;
      let pid = -1, lx = 0, ly = 0;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch { /* yok */ }
        pid = e.pointerId; lx = e.clientX; ly = e.clientY;
        b.classList.add('on');
        try { this.snd.kit && this.snd.kit(); } catch { /* yok */ }
        if (k === 'fire') this.firing += 1;
        else if (k === 'ads') this.toggleAds();
        else if (k === 'jump') this.jumpHeld = true;
        else if (k === 'crouch') this.toggleCrouch();
        else if (k === 'reload') this.reload();
        else if (k === 'nade') this.throwNade();
        else if (k === 'auto') { this.auto = !this.auto; lsSet(LS.auto, this.auto ? '1' : '0'); b.classList.toggle('act', this.auto); this.announce(this.auto ? 'Oto ateş açık' : 'Oto ateş kapalı'); }
      });
      b.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pid || k !== 'fire') return;
        lookBy(e.clientX - lx, e.clientY - ly, false);
        lx = e.clientX; ly = e.clientY;
      });
      const up = (e) => {
        if (e.pointerId !== pid) return;
        pid = -1;
        b.classList.remove('on');
        if (k === 'fire') this.firing = Math.max(0, this.firing - 1);
        if (k === 'jump') this.jumpHeld = false;
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    this.el.ws.forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.switchTo(+b.dataset.w); }));
    // yerel ayarlar (hazır kartında)
    this.el.panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ct]');
      if (!b) return;
      const [k, v] = b.dataset.ct.split(':');
      if (k === 'sens') { this.sens = +v; lsSet(LS.sens, v); }
      if (k === 'auto') { this.auto = v === '1'; lsSet(LS.auto, v); this.el.bAuto.classList.toggle('act', this.auto); }
      this.panelKey = '';
      this.panel();
    });
    // dokunma: sol alt = yürüme kolu, gerisi = bakış
    const cv = this.el.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      if (!this.playing()) return;
      const r = this.el.wrap.getBoundingClientRect();
      const lx = e.clientX - r.left, ly = e.clientY - r.top;
      if (e.pointerType === 'mouse') {
        if (document.pointerLockElement !== cv) { try { cv.requestPointerLock && cv.requestPointerLock(); } catch { /* yok */ } }
        if (e.button === 0) this.firing += 1, this.mouseFire = true;
        if (e.button === 2) this.setAds(true);
        if (!this.look) this.look = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: true };
        return;
      }
      try { cv.setPointerCapture(e.pointerId); } catch { /* yok */ }
      if (lx < r.width * 0.44 && ly > r.height * 0.3 && !this.joy) {
        this.joy = { id: e.pointerId, bx: e.clientX, by: e.clientY, x: 0, y: 0 };
        this.el.joy.style.display = 'block';
        this.el.joy.style.transform = `translate(${lx}px, ${ly}px)`;
        this.el.knob.style.transform = '';
        this.el.joyhint.style.display = 'none';
        return;
      }
      if (!this.look) this.look = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: false };
    });
    cv.addEventListener('pointermove', (e) => {
      const j = this.joy;
      if (j && j.id === e.pointerId) {
        let dx = e.clientX - j.bx, dy = e.clientY - j.by;
        const R = 50, len = Math.hypot(dx, dy);
        if (len > R) { dx *= R / len; dy *= R / len; }
        j.x = dx / R; j.y = dy / R;
        this.el.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        return;
      }
      const L = this.look;
      if (L && L.id === e.pointerId) {
        if (L.mouse && document.pointerLockElement === cv) return;
        lookBy(e.clientX - L.x, e.clientY - L.y, L.mouse);
        L.x = e.clientX; L.y = e.clientY;
      }
    });
    const end = (e) => {
      if (this.joy && this.joy.id === e.pointerId) { this.joy = null; this.el.joy.style.display = 'none'; this.el.joy.classList.remove('run'); }
      if (this.look && this.look.id === e.pointerId) {
        if (this.look.mouse) { if (e.button === 0 && this.mouseFire) { this.firing = Math.max(0, this.firing - 1); this.mouseFire = false; } if (e.button === 2) this.setAds(false); if (e.buttons === 0) this.look = null; }
        else this.look = null;
      }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    this.onMouse = (e) => { if (document.pointerLockElement === cv && this.playing()) lookBy(e.movementX || 0, e.movementY || 0, true); };
    document.addEventListener('mousemove', this.onMouse);
    this.onKey = (e) => {
      if (this.dead) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (e.type === 'keydown') {
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
        if (this.keys.has(k)) return;
        this.keys.add(k);
        if (!this.playing()) return;
        if (k >= '1' && k <= '4') this.switchTo(+k - 1);
        if (k === 'e') this.switchTo(((this.me ? this.me.w : 0) + 1) % CT_W.length);
        if (k === 'r') this.reload();
        if (k === 'g' || k === 'q') this.throwNade();
        if (k === 'c') this.toggleCrouch();
        if (k === 'f') this.el.bAuto.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      } else this.keys.delete(k);
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    this.onBlur = () => { this.keys.clear(); this.firing = 0; this.mouseFire = false; this.jumpHeld = false; this.joy = null; this.look = null; this.el.joy.style.display = 'none'; };
    window.addEventListener('blur', this.onBlur);
    this.onWheel = (e) => { if (this.playing() && this.me) this.switchTo((this.me.w + (e.deltaY > 0 ? 1 : CT_W.length - 1)) % CT_W.length); };
    cv.addEventListener('wheel', this.onWheel, { passive: true });
  }
  playing() { const v = this.view; return !!(v && v.phase === 'play' && this.me && this.me.alive); }

  /* ---------- sunucudan gelen görünüm ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.ct !== '1') { root.dataset.ct = '1'; root.innerHTML = '<p class="py-16 text-center">🎯</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (v && this.emo) this.emo.sync(v.emo, ctx.serverNow());
    if (!v) return;
    { const mi = ctMap(v.map | 0); if (mi !== this.mapB) this.setMap(mi); }
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.el.wrap.classList.toggle('play', v.phase === 'play');
    if (!prev || prev.phase !== v.phase) this.onPhase(prev, v);
    if (v.players) this.syncPlayers(v);
    if (v.ev) this.onEvents(v);
    this.panel();
  }
  setMap(mi) {
    // harita değişti: dünya ağı, ortam, mini harita ve ortam sesi yeniden
    this.mapB = mi;
    ctEnv(mi);
    if (this.X) { try { freeMesh(this.X, this.world); const mb = new MB('lit'); buildWorld(mb); this.world = mb.build(this.X); } catch (e) { console.warn('[catisma] harita', e); } }
    this.radarBg = null;
    this.fx = { tr: [], sp: [], dc: [], fl: [] };
    try { this.snd.amb(...(CT_AMB[mi] || CT_AMB[0])); } catch { /* yok say */ }
  }
  onPhase(prev, v) {
    try { this.snd.music(v.phase === 'ready' || v.phase === 'final' ? 'idle' : null); } catch { /* yok */ }
    if (v.phase === 'play') {
      this.evNext = -1;
      this.me = null;
      this.fx = { tr: [], sp: [], dc: [], fl: [] };
      this.el.feed.innerHTML = '';
      this.snd.play('go');
      this.el.msg.innerHTML = '<span class="big">BAŞLA!</span>';
      setTimeout(() => { if (!this.dead && this.el.msg.textContent.includes('BAŞLA')) this.el.msg.innerHTML = ''; }, 1200);
      this.lastN = 0;
    }
    if (v.phase === 'final') {
      this.firing = 0;
      this.el.wrap.classList.remove('dead', 'scoped');
      try { if (document.pointerLockElement === this.el.cv) document.exitPointerLock(); } catch { /* yok */ }
      const me = (v.results || []).find((r) => r.id === this.ctx.me);
      this.snd.play(me && me.win ? 'win' : v.win < 0 ? 'win' : 'lose');
    }
    if (v.phase === 'ready') { this.me = null; this.el.wrap.classList.remove('dead', 'scoped'); }
  }
  syncPlayers(v) {
    const ps = v.ps || [];
    this.meI = v.me;
    v.players.forEach((p, i) => {
      const s = ps[i];
      let r = this.R[i];
      if (!r || r.id !== p.id) r = this.R[i] = { id: p.id, x: s ? s[0] : 0, y: s ? s[1] : 0, z: s ? s[2] : 0, yaw: s ? s[3] : 0, pitch: 0, ph: 0, shotAt: 0, deadAt: 0, alive: false, los: false, losAt: 0 };
      r.n = p.n; r.c = p.c; r.t = p.t; r.b = p.b; r.k = p.k; r.d = p.d;
      if (s) {
        r.tx = s[0]; r.ty = s[1]; r.tz = s[2]; r.tyaw = s[3]; r.tpitch = s[4]; r.f = s[5]; r.w = s[6]; r.hp = s[7];
        const alive = !!s[8];
        if (alive && !r.alive) { r.x = s[0]; r.y = s[1]; r.z = s[2]; r.yaw = s[3]; r.deadAt = 0; }
        if (!alive && r.alive) r.deadAt = performance.now();
        r.alive = alive; r.prot = !!s[9]; r.resp = s[10];
      }
    });
    this.R.length = v.players.length;
    // ben
    if (v.phase === 'play' && v.me >= 0 && ps[v.me]) {
      const s = ps[v.me];
      if (!this.me) this.me = { x: s[0], y: s[1], z: s[2], vx: 0, vy: 0, vz: 0, yaw: s[3], pitch: 0, ground: true, crouch: false, ads: false, adsA: 0, alive: false, hp: 100, w: 0, mag: CT_W.map((W) => W.mag), reloadAt: 0, nextShot: 0, switchAt: 0, bloom: 0, kick: 0, rec: 0, ph: 0, stepD: 0, eye: CT_EYE, vmDrop: 1, swayX: 0, swayY: 0, team: v.players[v.me].t };
      const p = this.me;
      p.team = v.players[v.me].t;
      if (s[7] < p.hp - 0.5 && p.alive) this.onHurt(p.hp - s[7]);
      p.hp = s[7];
      p.prot = !!s[9];
      p.resp = s[10];
      const alive = !!s[8];
      if (alive && !p.alive) this.spawnMe(s[0], s[2], s[3]);
      if (!alive && p.alive) this.dieMe();
    }
  }
  spawnMe(x, z, yaw) {
    const p = this.me;
    Object.assign(p, { x, y: 0, z, vx: 0, vy: 0, vz: 0, yaw, pitch: 0, alive: true, crouch: false, ads: false, adsA: 0, mag: CT_W.map((W) => W.mag), reloadAt: 0, nextShot: performance.now() + 300, bloom: 0, vmDrop: 1, hp: 100 });
    this.el.wrap.classList.remove('dead', 'scoped');
    this.el.bAds.classList.remove('act'); this.el.bCrouch.classList.remove('act');
    this.snd.play('spawn');
    this.killer = '';
    this.ammoKey = '';
    this.dcam = null; this.dcKey = ''; this.el.wrap.classList.remove('dcam');
  }
  dieMe() {
    const p = this.me;
    p.alive = false;
    p.ads = false;
    this.firing = 0; this.mouseFire = false;
    this.el.wrap.classList.add('dead');
    this.el.wrap.classList.remove('scoped');
    this.snd.play('die');
    vibrate([60, 40, 120]);
    this.deadAt = performance.now();
    try { if (document.pointerLockElement === this.el.cv) document.exitPointerLock(); } catch { /* yok */ }
  }
  onHurt(d) {
    this.el.hit.classList.remove('on'); void this.el.hit.offsetWidth; this.el.hit.classList.add('on');
    this.cam.shake = Math.min(1, this.cam.shake + d / 40);
    if (this.me) { this.me.pitch = clamp(this.me.pitch + Math.min(0.05, d / 900), -1.45, 1.45); this.me.yaw += (Math.random() - 0.5) * Math.min(0.06, d / 600); }
    this.snd.play('hurt', clamp(d / 30, 0.4, 1));
    vibrate(20);
  }
  onEvents(v) {
    const e0 = v.e0 | 0, L = v.ev;
    if (this.evNext < 0) this.evNext = e0;
    for (let k = 0; k < L.length; k++) {
      const abs = e0 + k;
      if (abs < this.evNext) continue;
      this.event(L[k], v);
    }
    this.evNext = Math.max(this.evNext, e0 + L.length);
  }
  event(e, v) {
    const now = performance.now(), me = this.me, mi = v.me;
    if (e[0] === 's') {
      const [, si, w, ox, oy, oz, hx, hy, hz, hit, head] = e;
      const r = this.R[si];
      if (r) r.shotAt = now;
      if (si === mi) return;
      this.tracer(ox, oy, oz, hx, hy, hz);
      if (hit < 0) this.impact(hx, hy, hz, null, 0.7);
      else this.puff(hx, hy, hz);
      if (me) {
        const dx = ox - me.x, dz = oz - me.z, d = Math.hypot(dx, dz);
        const rel = Math.atan2(dx, dz) - me.yaw;
        const pan = clamp(-Math.sin(rel), -1, 1);
        this.snd.shot(w, clamp(1.05 - d / 75, 0.06, 0.9), pan, clamp(d / 60, 0, 1));
        if (hit === mi) this.dmgFrom(rel);
        else if (me.alive) {
          // yakından geçen mermi
          const ex = hx - ox, ey = hy - oy, ez = hz - oz, l2 = ex * ex + ey * ey + ez * ez || 1;
          const t = clamp(((me.x - ox) * ex + (me.y + 1.5 - oy) * ey + (me.z - oz) * ez) / l2, 0, 1);
          const pd = Math.hypot(ox + ex * t - me.x, oy + ey * t - me.y - 1.5, oz + ez * t - me.z);
          if (pd < 1.6 && t > 0.05 && t < 0.98) this.snd.play('whiz', 0.8, pan);
        }
      }
      void head;
    } else if (e[0] === 'k') {
      const [, ki, vi, w, head, streak, first] = e;
      const K = v.players[ki], V2 = v.players[vi];
      if (!K || !V2) return;
      if (ki === vi) { const d0 = document.createElement('div'); d0.innerHTML = `<b class="t${K.t % 2}">${esc(K.n)}</b> 💣 kendini patlattı`; this.el.feed.appendChild(d0); setTimeout(() => d0.remove(), 5100); if (vi === mi) this.killer = 'kendi bomban'; return; }
      const d = document.createElement('div');
      if (ki === mi || vi === mi) d.className = 'me';
      d.innerHTML = `<b class="t${K.t % 2}">${esc(K.n)}</b> ${WICON[w] || '🔫'}${head ? '💀' : ''} <b class="t${V2.t % 2}">${esc(V2.n)}</b>`;
      this.el.feed.appendChild(d);
      while (this.el.feed.children.length > 5) this.el.feed.firstChild.remove();
      setTimeout(() => d.remove(), 5100);
      if (ki === mi) {
        this.hitmark(head ? 'hs' : 'kill');
        this.snd.play('kill');
        if (w === CT_NADE_W) this.announce(`💣 BOMBA! ${esc(V2.n)}`, 'gold');
        if (head) this.snd.play('head');
        this.announce(head ? `💀 KAFADAN! ${esc(V2.n)}` : `+1 ${esc(V2.n)}`, head ? 'gold' : '');
        if (first) setTimeout(() => this.announce('İLK KAN!', 'red'), 500);
        if (STREAK[streak]) setTimeout(() => { this.announce(STREAK[streak], 'gold'); this.snd.play('streak'); }, first ? 1100 : 550);
        vibrate(30);
      }
      if (vi === mi) this.killer = K.n + (head ? ' (kafadan)' : '');
      if (vi === mi && ki !== vi) this.dcam = { ki, w, head, at: performance.now() };
    } else if (e[0] === 'g') {
      const [, si, ox, oy, oz, dx, dy, dz] = e;
      this.nd.push({ P: ctNadePath([ox, oy, oz], [dx, dy, dz]), t: now, si });
      if (this.nd.length > 12) this.nd.shift();
      if (me) { const d = Math.hypot(ox - me.x, oz - me.z); this.snd.play('throw', clamp(1 - d / 30, 0, 1)); }
    } else if (e[0] === 'x') {
      this.explosion(e[2], e[3], e[4]);
    } else if (e[0] === 'p') {
      const [, k, who, kind] = e;
      this.pkAt[k] = now;
      const q = CT_PICK[k];
      if (q) for (let i = 0; i < 10; i++) this.fx.sp.push({ x: q[0], y: 0.5, z: q[1], vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2.5, vz: (Math.random() - 0.5) * 2, life: 0.5 + Math.random() * 0.3, t: 0, s: 0.05, add: 1, r: kind ? 1 : 0.4, g: kind ? 0.85 : 1, b: kind ? 0.3 : 0.5 });
      if (who === mi && me) {
        this.snd.play('pick');
        if (kind === 1) { me.mag = CT_W.map((w) => w.mag); me.reloadAt = 0; this.ammoKey = ''; this.announce('🎒 Cephane + 💣', ''); }
        else this.announce('➕ +50 can', '');
        vibrate(20);
      }
    } else if (e[0] === 'r') {
      const r = this.R[e[1]];
      if (r) { r.x = e[2]; r.z = e[3]; r.y = 0; r.yaw = e[4]; r.deadAt = 0; }
    }
  }
  dmgFrom(rel) {
    const el = document.createElement('i');
    el.style.transform = `rotate(${(-rel * 180) / Math.PI}deg)`;
    el.className = 'on';
    this.el.dmg.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('on')));
    setTimeout(() => el.remove(), 1100);
  }
  hitmark(cls) {
    const h = this.el.hm;
    h.className = 'ct-hm';
    void h.offsetWidth;
    h.className = 'ct-hm on ' + (cls || '');
  }
  announce(html, cls) {
    const d = document.createElement('div');
    d.className = cls || '';
    d.innerHTML = html;
    this.el.ann.innerHTML = '';
    this.el.ann.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.remove(); }, 1650);
  }

  /* ---------- silah ---------- */
  setAds(on) {
    const p = this.me;
    if (!p || !p.alive) return;
    if (p.ads === on) return;
    p.ads = on;
    this.el.bAds.classList.toggle('act', on);
    this.snd.play('ads');
  }
  toggleAds() { if (this.me) this.setAds(!this.me.ads); }
  throwNade() {
    const p = this.me, v = this.view, now = performance.now();
    if (!p || !p.alive || !v || v.phase !== 'play') return;
    if (!(v.nd > 0) || now - (this.nadeAt || 0) < 950) { if (!(v.nd > 0)) { this.snd.play('empty'); this.announce('Bomban kalmadı — cephane kutusundan al', ''); } return; }
    this.nadeAt = now;
    const c = this.cam, r2 = (x) => Math.round(x * 100) / 100;
    const o = [r2(c.x + c.dx * 0.45), r2(c.y + c.dy * 0.45 - 0.05), r2(c.z + c.dz * 0.45)], d = [r2(c.dx), r2(c.dy), r2(c.dz)];
    v.nd -= 1;
    p.vmDrop = 1;
    this.snd.play('throw', 1);
    vibrate(15);
    try { this.ctx.send('nade', { o, d }); } catch { /* yok */ }
  }
  explosion(x, y, z) {
    const F = this.fx, me = this.me, now = performance.now();
    this.nd = this.nd.filter((n) => now - n.t < CT_NADE.fuse * 1000 - 250);
    for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, e = Math.random() * 1.2, sp = 1 + Math.random() * 3.5; F.sp.push({ x, y: y + 0.3, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 1, vz: Math.sin(a) * Math.cos(e) * sp, life: 0.28 + Math.random() * 0.2, t: 0, s: 0.55 + Math.random() * 0.4, grow: 0.7, add: 1, hot: 1, r: 1, g: 0.62 + Math.random() * 0.2, b: 0.22 }); }
    F.sp.push({ x, y: y + 0.4, z, vx: 0, vy: 0, vz: 0, life: 0.16, t: 0, s: 1.6, grow: 2.2, add: 1, hot: 1, r: 1, g: 0.95, b: 0.8 });
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, sp = 0.6 + Math.random() * 1.6; F.sp.push({ x: x + Math.cos(a) * 0.4, y: y + 0.5 + Math.random() * 0.8, z: z + Math.sin(a) * 0.4, vx: Math.cos(a) * sp, vy: 0.9 + Math.random() * 1.3, vz: Math.sin(a) * sp, life: 1.5 + Math.random() * 1.1, t: 0, s: 0.6 + Math.random() * 0.4, grow: 0.22, add: 0, r: 0.24, g: 0.23, b: 0.22 }); }
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, e = Math.random() * 1.4, sp = 5 + Math.random() * 9; F.sp.push({ x, y: y + 0.2, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp, life: 0.4 + Math.random() * 0.5, t: 0, s: 0.04, add: 1, r: 1, g: 0.8, b: 0.4 }); }
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, sp = 2 + Math.random() * 4; F.sp.push({ x, y: y + 0.2, z, vx: Math.cos(a) * sp, vy: 3 + Math.random() * 4, vz: Math.sin(a) * sp, life: 0.9 + Math.random() * 0.5, t: 0, s: 0.07, add: 0, gr: 1, r: 0.35, g: 0.3, b: 0.24 }); }
    if (F.sp.length > 260) F.sp.splice(0, F.sp.length - 260);
    // yerde is lekesi
    F.dc.push({ x, y: Math.max(0.02, y - 0.07), z, tx: [1, 0, 0], ty: [0, 0, 1], t: 0, big: 1 });
    this.boomL = { x, y: y + 0.6, z, t: now };
    let vol = 0.5, pan = 0;
    if (me) {
      const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz, y - me.y - 1);
      vol = clamp(1.25 - d / 34, 0.08, 1); pan = clamp(-Math.sin(Math.atan2(dx, dz) - me.yaw), -1, 1);
      if (d < 16) { this.cam.shake = Math.min(1.6, this.cam.shake + (16 - d) / 9); this.wfl = Math.max(this.wfl || 0, clamp((11 - d) / 11, 0, 0.75)); if (d < 9) vibrate([40, 30, 80]); }
    }
    this.snd.play('boom', vol, pan);
  }
  dmgNum(d, head) {
    const el = document.createElement('div');
    el.className = 'ct-dn' + (head ? ' hs' : '');
    el.textContent = String(d);
    el.style.setProperty('--dx', (18 + Math.random() * 34).toFixed(0) + 'px'); el.style.setProperty('--dy', (-34 + Math.random() * 26).toFixed(0) + 'px');
    this.el.wrap.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
  toggleCrouch() {
    const p = this.me;
    if (!p || !p.alive) return;
    if (p.crouch && ctHit(p.x, p.y, p.z, CT_PR, CT_PH) >= 0) return;   // kalkacak yer yok
    if (!p.crouch && p.sprint && p.ground && performance.now() - (this.slideAt || 0) > 1200) { p.slide = 0.65; this.slideAt = performance.now(); this.snd.play('slide', 0.9); this.cam.shake = Math.min(1, this.cam.shake + 0.15); }
    p.crouch = !p.crouch;
    this.el.bCrouch.classList.toggle('act', p.crouch);
  }
  switchTo(w) {
    const p = this.me;
    if (!p || !p.alive || p.w === w || !CT_W[w]) return;
    p.w = w;
    p.reloadAt = 0;
    p.switchAt = performance.now() + 380;
    p.nextShot = Math.max(p.nextShot, p.switchAt);
    p.vmDrop = 1;
    if (p.ads) this.setAds(false);
    this.snd.play('switch');
    this.ammoKey = '';
  }
  reload() {
    const p = this.me, now = performance.now();
    if (!p || !p.alive || p.reloadAt > now) return;
    const W = CT_W[p.w];
    if (p.mag[p.w] >= W.mag) return;
    p.reloadAt = now + W.rl;
    p.reloadW = p.w;
    if (p.ads && p.w === 2) this.setAds(false);
    this.snd.play('magout');
    setTimeout(() => { if (!this.dead && this.me && this.me.reloadAt > performance.now() && this.me.w === p.reloadW) this.snd.play('magin'); }, W.rl * 0.62);
    if (p.w === 2) setTimeout(() => { if (!this.dead && this.me && this.me.w === 2) this.snd.play('bolt'); }, W.rl * 0.85);
  }
  // ışın–savaşçı: en yakın isabet { i, t, head }
  rayEnts(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null;
    const mi = this.meI, v = this.view, ffa = v.mode === 'ffa', myT = this.me ? this.me.team : -1;
    for (let i = 0; i < this.R.length; i++) {
      const r = this.R[i];
      if (i === mi || !r || !r.alive || (!ffa && r.t === myT)) continue;
      const cr = r.f & 2;
      // baş (küre)
      const hx = r.x - ox, hy = r.y + (cr ? 1.14 : 1.62) - oy, hz = r.z - oz;
      const tb = hx * dx + hy * dy + hz * dz;
      if (tb > 0 && tb < maxT) {
        const d2 = hx * hx + hy * hy + hz * hz - tb * tb;
        if (d2 < 0.185 * 0.185) { const t = tb - Math.sqrt(0.185 * 0.185 - d2); if (!best || t < best.t) best = { i, t, head: 1 }; }
      }
      // gövde (kutu)
      const x0 = r.x - 0.3, x1 = r.x + 0.3, y0 = r.y, y1 = r.y + (cr ? 1.02 : 1.47), z0 = r.z - 0.3, z1 = r.z + 0.3;
      let tn = 0, tf = maxT;
      const ax = [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]];
      let ok = true;
      for (const [o, d, a, b] of ax) {
        if (Math.abs(d) < 1e-9) { if (o < a || o > b) { ok = false; break; } continue; }
        let t1 = (a - o) / d, t2 = (b - o) / d;
        if (t1 > t2) { const q = t1; t1 = t2; t2 = q; }
        if (t1 > tn) tn = t1;
        if (t2 < tf) tf = t2;
        if (tn > tf) { ok = false; break; }
      }
      if (ok && (!best || tn < best.t)) best = { i, t: tn, head: 0 };
    }
    return best;
  }
  spread() {
    const p = this.me, W = CT_W[p.w];
    const hs = Math.hypot(p.vx, p.vz);
    let s = lerp(W.sp, W.spA, p.adsA);
    s *= 1 + clamp(hs / 4.5, 0, 1.4) * (p.adsA > 0.5 ? 0.5 : 0.9);
    if (!p.ground) s *= 2.4;
    if (p.crouch) s *= 0.72;
    return s + p.bloom;
  }
  fire() {
    const p = this.me, now = performance.now(), W = CT_W[p.w];
    if (now < p.nextShot || now < p.switchAt) return;
    if (p.reloadAt > now) return;
    if (p.mag[p.w] <= 0) { this.snd.play('empty'); p.nextShot = now + 250; this.reload(); return; }
    p.nextShot = now + W.iv;
    p.mag[p.w] -= 1;
    const c = this.cam;
    const ox = c.x, oy = c.y, oz = c.z;
    const sp = (this.spread() * Math.PI) / 180;
    // görüş eksenleri
    const fx = c.dx, fy = c.dy, fz = c.dz;
    const rx = -Math.cos(p.yaw), rz = Math.sin(p.yaw);
    const ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx;
    const hits = [];
    let hp = null, any = false, anyHead = false, dsum = 0;
    for (let k = 0; k < W.pel; k++) {
      const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * Math.tan(sp);
      let dx = fx + (rx * Math.cos(a) + ux * Math.sin(a)) * rr, dy = fy + uy * Math.sin(a) * rr, dz = fz + (rz * Math.cos(a) + uz * Math.sin(a)) * rr;
      const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const tw = ctRay(ox, oy, oz, dx, dy, dz, 140);
      const n = CT_HIT.slice(0, 3);
      const he = this.rayEnts(ox, oy, oz, dx, dy, dz, tw);
      const t = he ? he.t : tw;
      const pt = [ox + dx * t, oy + dy * t, oz + dz * t];
      if (he) { hits.push([he.i, he.head]); any = true; anyHead = anyHead || !!he.head; dsum += ctDmg(p.w, t, he.head); this.puff(pt[0], pt[1], pt[2]); }
      else if (tw < 139) this.impact(pt[0], pt[1], pt[2], n, W.pel > 1 ? 0.5 : 1);
      if (!hp || he) hp = pt;
      // iz: namludan
      const m = this.muzzleWorld();
      if (k < 4) this.tracer(m[0], m[1], m[2], pt[0], pt[1], pt[2], true);
    }
    if (any) { this.hitmark(anyHead ? 'hs' : ''); this.snd.play(anyHead ? 'head' : 'hit'); this.dmgNum(dsum, anyHead); }
    { // boş kovan sağa fırlar, namludan duman çıkar
      const m = this.muzzleWorld(), k = 1.6 + Math.random() * 1.2;
      this.fx.sp.push({ x: m[0] - fx * 0.42 + rx * 0.05, y: m[1] + 0.03, z: m[2] - fz * 0.42 + rz * 0.05, vx: rx * k + fx * 0.4 + p.vx, vy: 1.8 + Math.random() * 1.2, vz: rz * k + fz * 0.4 + p.vz, life: 0.55, t: 0, s: p.w === 1 ? 0.028 : 0.018, add: 0, gr: 1, solid: 1, r: p.w === 1 ? 0.8 : 0.9, g: p.w === 1 ? 0.2 : 0.68, b: 0.18 });
      if (Math.random() < (p.w === 0 || p.w === 3 ? 0.45 : 1)) this.fx.sp.push({ x: m[0] + fx * 0.25, y: m[1] + fy * 0.25, z: m[2] + fz * 0.25, vx: fx * 0.8, vy: 0.5, vz: fz * 0.8, life: 0.5, t: 0, s: 0.07, grow: 0.5, add: 0, r: 0.8, g: 0.8, b: 0.8 });
    }
    this.snd.shot(p.w, 1, 0, 0);
    // tepme
    const kk = (W.kick * Math.PI) / 180 * (p.adsA > 0.5 ? 0.62 : 1) * (p.crouch ? 0.8 : 1);
    p.pitch = clamp(p.pitch + kk * (0.75 + Math.random() * 0.35), -1.45, 1.45);
    p.yaw += kk * (Math.random() - 0.5) * 0.55;
    p.rec += kk * 0.55;
    p.kick = 1;
    p.bloom = Math.min(W.auto ? 2.6 : 1.2, p.bloom + (W.auto ? 0.34 : 0.9));
    this.flashT = now;
    this.cam.shake = Math.min(1, this.cam.shake + (p.w === 0 ? 0.1 : p.w === 3 ? 0.07 : 0.4));
    if (this.touch && p.w !== 0 && p.w !== 3) vibrate(p.w === 1 ? 25 : 35);
    if (p.w === 2 && p.ads) setTimeout(() => { if (!this.dead && this.me && this.me.w === 2 && this.me.alive) { this.snd.play('bolt'); } }, 420);
    const r1 = (x) => Math.round(x * 10) / 10;
    const pl = { w: p.w, o: [r1(ox), r1(oy), r1(oz)], h: hp.map(r1), t: hits };
    try { this.ctx.sendQuiet ? this.ctx.sendQuiet('shot', pl) : this.ctx.send('shot', pl); } catch { /* yok */ }
    if (p.w !== 1) setTimeout(() => { if (!this.dead) this.snd.play('shell', 0.9, 0.3); }, 360 + Math.random() * 120);
    const r = this.R[this.meI];
    if (r) r.shotAt = now;
    if (p.mag[p.w] <= 0) setTimeout(() => { if (!this.dead && this.me && this.me.alive && this.me.mag[this.me.w] <= 0) this.reload(); }, 260);
    this.ammoKey = '';
  }
  muzzleWorld() {
    const c = this.cam, p = this.me;
    const rx = -Math.cos(p.yaw), rz = Math.sin(p.yaw), k = 1 - p.adsA;
    return [c.x + c.dx * 0.7 + rx * 0.17 * k, c.y + c.dy * 0.7 - 0.14 * k - 0.05, c.z + c.dz * 0.7 + rz * 0.17 * k];
  }

  /* ---------- efektler ---------- */
  tracer(ax, ay, az, bx, by, bz, mine) {
    const d = Math.hypot(bx - ax, by - ay, bz - az);
    if (d < 1.5 || this.fx.tr.length > 40) return;
    this.fx.tr.push({ ax, ay, az, bx, by, bz, d, t: 0, life: Math.min(0.22, d / 240) + 0.03, mine });
  }
  impact(x, y, z, n, k = 1) {
    const F = this.fx;
    if (!n) n = [0, 1, 0];
    for (let i = 0; i < 3 * k; i++) F.sp.push({ x, y, z, vx: n[0] * 1.8 + (Math.random() - 0.5) * 2.4, vy: n[1] * 1.8 + 1 + Math.random() * 2, vz: n[2] * 1.8 + (Math.random() - 0.5) * 2.4, life: 0.5 + Math.random() * 0.3, t: 0, s: 0.022, add: 0, gr: 1, solid: 1, r: 0.62, g: 0.56, b: 0.47 });
    F.sp.push({ x: x + n[0] * 0.1, y: y + n[1] * 0.1, z: z + n[2] * 0.1, vx: n[0] * 1.1, vy: n[1] * 1.1 + 0.2, vz: n[2] * 1.1, life: 0.75, t: 0, s: 0.16, grow: 0.42, add: 0, r: 0.74, g: 0.69, b: 0.6 });
    for (let i = 0; i < 4 * k; i++) F.sp.push({ x, y, z, vx: n[0] * 2.5 + (Math.random() - 0.5) * 3.5, vy: n[1] * 2.5 + Math.random() * 2.6, vz: n[2] * 2.5 + (Math.random() - 0.5) * 3.5, life: 0.16 + Math.random() * 0.16, t: 0, s: 0.035, add: 1, r: 1, g: 0.85, b: 0.45 });
    F.sp.push({ x: x + n[0] * 0.05, y: y + n[1] * 0.05, z: z + n[2] * 0.05, vx: n[0] * 0.5, vy: n[1] * 0.5 + 0.35, vz: n[2] * 0.5, life: 0.5, t: 0, s: 0.11, grow: 0.5, add: 0, r: 0.78, g: 0.73, b: 0.65 });
    if (F.sp.length > 260) F.sp.splice(0, F.sp.length - 260);
    // mermi izi
    const tx = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [n[2], 0, -n[0]];
    const ty = [n[1] * tx[2] - n[2] * tx[1], n[2] * tx[0] - n[0] * tx[2], n[0] * tx[1] - n[1] * tx[0]];
    F.dc.push({ x: x + n[0] * 0.012, y: y + n[1] * 0.012, z: z + n[2] * 0.012, tx, ty, t: 0 });
    if (F.dc.length > 46) F.dc.shift();
    const me = this.me;
    if (me && Math.random() < 0.3) { const d = Math.hypot(x - me.x, z - me.z); if (d < 14) this.snd.play('ric', clamp(1 - d / 14, 0.1, 0.8)); }
  }
  puff(x, y, z) {
    const F = this.fx;
    for (let i = 0; i < 5; i++) F.sp.push({ x, y, z, vx: (Math.random() - 0.5) * 2.4, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 2.4, life: 0.22 + Math.random() * 0.14, t: 0, s: 0.05, add: 1, r: 1, g: 0.95, b: 0.8 });
    F.sp.push({ x, y, z, vx: 0, vy: 0.4, vz: 0, life: 0.35, t: 0, s: 0.16, grow: 0.7, add: 0, r: 0.95, g: 0.9, b: 0.85 });
  }
  stepFx(dt) {
    const F = this.fx;
    for (const q of F.tr) q.t += dt;
    F.tr = F.tr.filter((q) => q.t < q.life);
    for (const q of F.sp) { q.t += dt; q.vy -= (q.hot ? -0.5 : q.add || q.gr ? 9 : 0) * dt; if (q.gr && q.y < 0.02 && q.vy < 0) { q.y = 0.02; q.vy *= -0.35; q.vx *= 0.5; q.vz *= 0.5; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; }
    F.sp = F.sp.filter((q) => q.t < q.life);
    for (const q of F.dc) q.t += dt;
    F.dc = F.dc.filter((q) => q.t < 14);
  }

  /* ---------- fizik ---------- */
  stepMe(dt) {
    const p = this.me, k = this.keys, now = performance.now();
    let fx = 0, fz = 0;
    if (this.joy) { fx = this.joy.x; fz = -this.joy.y; }
    if (k.has('w') || k.has('arrowup')) fz += 1;
    if (k.has('s') || k.has('arrowdown')) fz -= 1;
    if (k.has('a') || k.has('arrowleft')) fx -= 1;
    if (k.has('d') || k.has('arrowright')) fx += 1;
    let ln = Math.hypot(fx, fz);
    if (ln > 1) { fx /= ln; fz /= ln; ln = 1; }
    const firing = this.firing > 0 || now - (this.flashT || 0) < 250;
    const sprint = ((this.joy && ln > 0.93 && fz > 0.7) || (k.has('shift') && fz > 0)) && !p.ads && !p.crouch && !firing && p.reloadAt < now;
    p.sprint = sprint;
    this.el.joy.classList.toggle('run', !!sprint);
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    const wx = sy * fz - cy * fx, wz = cy * fz + sy * fx;
    let spd = p.crouch ? 2.3 : p.ads ? 2.7 : sprint ? 6.4 : 4.5;
    if (p.slide > 0) { p.slide -= dt; if (!p.crouch || !p.ground) p.slide = 0; else { spd = 2.3 + 7.2 * Math.max(0, p.slide / 0.65); if (ln < 0.2) { fz = 1; } } }
    const acc = p.ground ? 13 : 2.6;
    p.vx = damp(p.vx, wx * spd, acc, dt);
    p.vz = damp(p.vz, wz * spd, acc, dt);
    p.vy -= 21 * dt;
    if (p.vy < -30) p.vy = -30;
    if ((this.jumpHeld || k.has(' ')) && p.ground) { p.vy = 7.4; p.ground = false; this.snd.play('jump'); if (p.crouch) this.toggleCrouch(); }
    if (k.has('control') !== !!this.ctrlWas) { this.ctrlWas = k.has('control'); if (this.ctrlWas !== p.crouch) this.toggleCrouch(); }
    const h = p.crouch ? CT_PHC : CT_PH;
    const was = p.ground, vyWas = p.vy;
    // yatay: eksen eksen; engel alçaksa (≤0,6 m) üstüne çık
    const tryMove = (dx, dz) => {
      const nx = p.x + dx, nz = p.z + dz;
      const hit = ctHit(nx, p.y, nz, CT_PR, h);
      if (hit < 0) { p.x = nx; p.z = nz; return true; }
      const top = CT_BOXES[hit][4];
      if (p.ground && top - p.y <= 0.62 && top - p.y > 0 && ctHit(nx, top + 0.001, nz, CT_PR, h) < 0) { p.x = nx; p.z = nz; p.y = top; return true; }
      return false;
    };
    const mx = p.vx * dt, mz = p.vz * dt, n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.25));
    for (let s = 0; s < n; s++) {
      if (!tryMove(mx / n, 0)) p.vx = 0;
      if (!tryMove(0, mz / n)) p.vz = 0;
    }
    // dikey
    p.ground = false;
    let ny = p.y + p.vy * dt;
    if (ny <= 0) { ny = 0; p.vy = 0; p.ground = true; }
    else {
      const hit = ctHit(p.x, ny, p.z, CT_PR, h);
      if (hit >= 0) {
        const b = CT_BOXES[hit];
        if (p.vy <= 0 && p.y >= b[4] - 0.3) { ny = b[4]; p.ground = true; }
        else if (p.vy > 0) ny = Math.min(p.y, b[1] - h - 0.001);
        else ny = p.y;
        p.vy = 0;
      }
    }
    p.y = ny;
    p.x = clamp(p.x, -CT_HX + CT_PR, CT_HX - CT_PR);
    p.z = clamp(p.z, -CT_HZ + CT_PR, CT_HZ - CT_PR);
    if (!was && p.ground && vyWas < -6) { this.snd.play('land', clamp(-vyWas / 12, 0.3, 1)); this.cam.shake = Math.min(1, this.cam.shake + 0.25); p.land = 1; }
    const hs = Math.hypot(p.vx, p.vz);
    p.ph += hs * dt * 1.9;
    if (p.ground && hs > 1.5) { p.stepD += hs * dt; if (p.stepD > (sprint ? 2.5 : 2.0)) { p.stepD = 0; this.snd.play('step', p.crouch ? 0.3 : sprint ? 0.9 : 0.6); } }
    p.adsA = damp(p.adsA, p.ads ? 1 : 0, p.w === 2 ? 9 : 14, dt);
    p.bloom = Math.max(0, p.bloom - dt * (CT_W[p.w].auto ? 3.6 : 2.2));
    p.kick = Math.max(0, p.kick - dt * 7);
    if (p.rec > 0) { const d = Math.min(p.rec, dt * 0.55 * (0.4 + p.rec * 6)); p.rec -= d; p.pitch -= d; }
    p.vmDrop = Math.max(0, p.vmDrop - dt * 3.4);
    p.land = Math.max(0, (p.land || 0) - dt * 4);
    p.eye = damp(p.eye, p.crouch ? CT_EYEC : CT_EYE, 12, dt);
    if (p.reloadAt && now >= p.reloadAt) { p.mag[p.reloadW] = CT_W[p.reloadW].mag; p.reloadAt = 0; this.ammoKey = ''; }
    p.f = (hs > 0.6 ? 1 : 0) | (p.crouch ? 2 : 0) | (p.ads ? 4 : 0) | (p.ground ? 0 : 8);
  }
  // nişan yardımı + oto ateş
  stepAim(dt) {
    const p = this.me, c = this.cam, now = performance.now(), W = CT_W[p.w];
    let best = null, bang = 9;
    const v = this.view, ffa = v.mode === 'ffa';
    for (let i = 0; i < this.R.length; i++) {
      const r = this.R[i];
      if (i === this.meI || !r || !r.alive || (!ffa && r.t === p.team)) continue;
      const tx = r.x - c.x, ty = r.y + (r.f & 2 ? 0.85 : 1.25) - c.y, tz = r.z - c.z, d = Math.hypot(tx, ty, tz) || 1;
      const dot = (tx * c.dx + ty * c.dy + tz * c.dz) / d;
      if (dot < 0.9 || d > 70) continue;
      if (now - r.losAt > 140) { r.losAt = now; r.los = ctClear(c.x, c.y, c.z, r.x, r.y + (r.f & 2 ? 0.85 : 1.25), r.z) || ctClear(c.x, c.y, c.z, r.x, r.y + (r.f & 2 ? 1.14 : 1.6), r.z); }
      if (!r.los) continue;
      const ang = Math.acos(clamp(dot, -1, 1));
      if (ang < bang) { bang = ang; best = { i, ang, d, tx, ty, tz }; }
    }
    this.assist = best;
    // hafif çekim (yalnızca dokunmatik; kol ya da bakış hareket ederken)
    if (best && this.touch && bang < 0.09 && (this.joy || this.look || this.firing)) {
      const wantYaw = Math.atan2(best.tx, best.tz), wantPitch = Math.atan2(best.ty, Math.hypot(best.tx, best.tz));
      let dy = wantYaw - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const k = dt * 1.1 * (1 - bang / 0.09) * (p.adsA > 0.5 ? 1.5 : 1);
      p.yaw += dy * Math.min(1, k * 2.2);
      p.pitch += (wantPitch - p.pitch) * Math.min(1, k * 2.2);
    }
    // nişangâhın altındaki hedef
    const he = this.rayEnts(c.x, c.y, c.z, c.dx, c.dy, c.dz, ctRay(c.x, c.y, c.z, c.dx, c.dy, c.dz, 140));
    this.aimEnt = he ? he.i : -1;
    this.el.x.classList.toggle('en', !!he);
    let want = this.firing > 0;
    if (this.auto && he && he.t < W.rng && (p.w !== 2 || p.adsA > 0.8)) {
      this.onTgt = (this.onTgt || 0) + dt;
      if (this.onTgt > (p.w === 2 ? 0.22 : 0.1)) want = true;
    } else this.onTgt = 0;
    if (want) {
      if (W.auto || !this.semiLock || (this.auto && this.onTgt > 0 && this.firing === 0)) { const before = p.mag[p.w]; this.fire(); if (!W.auto && p.mag[p.w] !== before) this.semiLock = true; }
    }
    if (this.firing === 0) this.semiLock = false;
  }

  /* ---------- kamera ---------- */
  stepCam(dt) {
    const c = this.cam, p = this.me, v = this.view;
    const asp = (this.vw || 1) / (this.vh || 1);
    const base = asp < 0.9 ? 1.38 : 1.12;
    c.shake = Math.max(0, c.shake - dt * 3.2);
    if (p && p.alive && v && v.phase === 'play') {
      const W = CT_W[p.w];
      const sx = (Math.random() - 0.5) * c.shake * 0.02, sy2 = (Math.random() - 0.5) * c.shake * 0.02;
      const pitch = p.pitch + sy2, yaw = p.yaw + sx;
      c.dx = Math.sin(yaw) * Math.cos(pitch); c.dy = Math.sin(pitch); c.dz = Math.cos(yaw) * Math.cos(pitch);
      const bob = p.ground ? Math.sin(p.ph * 2) * 0.022 * clamp(Math.hypot(p.vx, p.vz) / 4.5, 0, 1.3) * (1 - p.adsA * 0.7) : 0;
      c.x = p.x; c.y = p.y + p.eye + bob - (p.land || 0) * 0.07; c.z = p.z;
      { let dyw = p.yaw - (this.lyaw == null ? p.yaw : this.lyaw); dyw = Math.atan2(Math.sin(dyw), Math.cos(dyw)); const dpt = p.pitch - (this.lpit == null ? p.pitch : this.lpit); this.lyaw = p.yaw; this.lpit = p.pitch; const inv = 1 / Math.max(dt, 0.004); this.swx = damp(this.swx || 0, clamp(dyw * inv * 0.012, -0.05, 0.05), 9, dt); this.swy = damp(this.swy || 0, clamp(dpt * inv * 0.012, -0.04, 0.04), 9, dt); }
      c.fov = base / lerp(1, W.zoom, p.adsA) + (p.sprint ? 0.05 : 0);
      this.el.wrap.classList.toggle('scoped', p.w === 2 && p.adsA > 0.85);
      return;
    }
    c.fov = base;
    // ölüm kamerası: düştüğün yerden seni vurana döner ve ona doğru yaklaşır
    const dc = this.dcam, KR = dc && this.R[dc.ki];
    if (p && !p.alive && v && v.phase === 'play' && KR && dc.ki !== this.meI) {
      const t = (performance.now() - dc.at) / 1000, e = 1 - Math.pow(1 - clamp(t / 1.15, 0, 1), 3);
      const kx = KR.x, ky = KR.y + ((KR.f & 2) ? 1.0 : 1.45), kz = KR.z;
      const ox = p.x, oy = p.y + 1.75, oz = p.z;
      let dx = kx - ox, dy = ky - oy, dz = kz - oz;
      const d = Math.hypot(dx, dy, dz) || 1, adv = Math.max(0, d - 3.4) * 0.42 * e;
      let ex = ox + (dx / d) * adv, ey = oy + (dy / d) * adv + 0.45 * e, ez = oz + (dz / d) * adv;
      { const ddx = ex - ox, ddy = ey - oy, ddz = ez - oz, l = Math.hypot(ddx, ddy, ddz); if (l > 0.05) { const tt = ctRay(ox, oy, oz, ddx / l, ddy / l, ddz / l, l); if (tt < l) { const k2 = Math.max(0, (tt - 0.35) / l); ex = ox + ddx * k2; ey = oy + ddy * k2; ez = oz + ddz * k2; } } }
      c.x = ex; c.y = ey; c.z = ez;
      dx = kx - ex; dy = ky - ey; dz = kz - ez;
      const d2 = Math.hypot(dx, dy, dz) || 1, k = 1 - Math.exp(-dt * 7);
      c.dx += (dx / d2 - c.dx) * k; c.dy += (dy / d2 - c.dy) * k; c.dz += (dz / d2 - c.dz) * k;
      const n = Math.hypot(c.dx, c.dy, c.dz) || 1; c.dx /= n; c.dy /= n; c.dz /= n;
      c.fov = base / lerp(1, clamp(d2 / 8, 1, 2.3), e);
      return;
    }
    let cx = 0, cy = 0, cz = 0, R = 40, H = 26, sp = 0.07;
    if (p && !p.alive && v && v.phase === 'play') { cx = p.x; cy = p.y + 0.8; cz = p.z; R = 4.6; H = 2.6; sp = 0.35; }
    this.orb = (this.orb || 0) + dt * sp;
    let ex = cx + Math.sin(this.orb) * R, ey = cy + H, ez = cz + Math.cos(this.orb) * R;
    if (R < 10) {
      // duvarın içine girmesin
      const dx = ex - cx, dy = ey - (cy + 0.6), dz = ez - cz, d = Math.hypot(dx, dy, dz);
      const t = ctRay(cx, cy + 0.6, cz, dx / d, dy / d, dz / d, d);
      if (t < d) { const k = Math.max(0.25, (t - 0.3) / d); ex = cx + dx * k; ey = cy + 0.6 + dy * k; ez = cz + dz * k; }
    }
    c.x = ex; c.y = ey; c.z = ez;
    const dx = cx - ex, dy = cy - ey, dz = cz - ez, d = Math.hypot(dx, dy, dz) || 1;
    c.dx = dx / d; c.dy = dy / d; c.dz = dz / d;
  }

  /* ---------- uzak oyuncular ---------- */
  stepRemote(dt) {
    const mi = this.meI, p = this.me;
    this.R.forEach((r, i) => {
      if (!r) return;
      if (i === mi && p) { r.x = p.x; r.y = p.y; r.z = p.z; r.yaw = p.yaw; r.pitch = p.pitch; r.f = p.f; r.w = p.w; r.ph = p.ph; r.alive = p.alive; if (!p.alive && !r.deadAt) r.deadAt = this.deadAt || performance.now(); if (p.alive) r.deadAt = 0; return; }
      if (r.tx == null) return;
      const far = Math.hypot(r.tx - r.x, r.tz - r.z) > 7;
      const k = far ? 1 : 1 - Math.exp(-dt * 11);
      const ox = r.x, oz = r.z;
      if (r.alive) { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k; }
      let dy = r.tyaw - r.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      r.yaw += dy * Math.min(1, dt * 12);
      r.pitch += ((r.tpitch || 0) - r.pitch) * Math.min(1, dt * 12);
      const sp = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 0.001);
      r.ph += Math.min(sp, 7) * dt * 1.9;
      r.mv = sp > 0.5;
      if (r.alive && i !== mi && p && sp > 2.2) { r.stD = (r.stD || 0) + sp * dt; if (r.stD > 2.1) { r.stD = 0; const dx = r.x - p.x, dz = r.z - p.z, d = Math.hypot(dx, dz); if (d < 16) this.snd.play('step', clamp(1 - d / 16, 0, 1) * 0.8, clamp(-Math.sin(Math.atan2(dx, dz) - p.yaw), -1, 1)); } }
    });
  }
  // savaşçının parçalarını çizer / gölgeye yazar; namlu ucu r.mz'ye yazılır
  fighter(X, r, shadow) {
    const now = performance.now();
    if (r.prot && !shadow && Math.floor(now / 90) % 2) return;
    const ch = this.char(r.c, r.t), mt = this.mats;
    const cr = r.f & 2 ? 1 : 0;
    let fall = 0, sink = 0;
    if (!r.alive) {
      const t = (now - (r.deadAt || now)) / 1000;
      if (t > 3.1) return;
      fall = Math.min(1, t / 0.42); fall = fall * fall * (3 - 2 * fall);
      sink = Math.max(0, t - 2.2) * 1.2;
    }
    const drop = cr ? 0.4 : 0;
    M.set(mt.a, r.x, r.y - sink, r.z, r.yaw, -fall * 1.48);
    const draw = (mesh, m) => (shadow ? shadowCast(X, mesh, m) : drawMesh(X, mesh, m));
    M.set(mt.b, 0, -drop, 0);
    M.mul(mt.c, mt.a, mt.b);
    draw(ch.body, mt.c);
    const wk = r.mv || (r.f & 1) ? Math.sin(r.ph * 2) : 0;
    for (const s of [-1, 1]) {
      if (cr) M.set(mt.b, s * 0.11, 0.48, 0.06, 0, -0.5 + wk * 0.3 * s, 0, 1, 0.58, 1);
      else M.set(mt.b, s * 0.11, 0.86, 0, 0, wk * 0.62 * s * (fall ? 0 : 1));
      M.mul(mt.c, mt.a, mt.b);
      draw(ch.leg, mt.c);
    }
    M.set(mt.b, 0, 1.3 - drop, 0, 0, -r.pitch * (fall ? 0 : 1) + fall * 0.5);
    M.mul(mt.c, mt.a, mt.b);
    draw(ch.arms, mt.c);
    M.set(mt.b, -0.07, -0.045, 0.33);
    M.mul(mt.d, mt.c, mt.b);
    draw(this.guns[r.w || 0], mt.d);
    if (!shadow) {
      const m = mt.d, z = MUZZLE[r.w || 0], y = 0.035;
      r.mz = [m[4] * y + m[8] * z + m[12], m[5] * y + m[9] * z + m[13], m[6] * y + m[10] * z + m[14]];
    }
  }

  /* ---------- çizim ---------- */
  resize() {
    const cv = this.el.cv;
    const w = this.vw || 1, h = this.vh || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale;
    const Wp = Math.max(2, Math.round(w * dpr)), Hp = Math.max(2, Math.round(h * dpr));
    if (cv.width !== Wp || cv.height !== Hp) { cv.width = Wp; cv.height = Hp; }
    return [Wp, Hp, w / h];
  }
  draw() {
    const X = this.X;
    if (!X || this.lost) return;
    const gl = X.gl, now = performance.now();
    const [Wp, Hp, asp] = this.resize();
    const c = this.cam, mt = this.mats, v = this.view, p = this.me;
    const fp = !!(p && p.alive && v && v.phase === 'play');
    M.persp(mt.P, c.fov, asp, 0.07, 400);
    M.look(mt.V, c.x, c.y, c.z, c.x + c.dx, c.y + c.dy, c.z + c.dz);
    M.mul(mt.VP, mt.P, mt.V);
    const flash = fp && now - (this.flashT || 0) < 55 ? 1 : 0;
    const F = { VP: mt.VP, V: mt.V, fov: c.fov, asp, shift: 0, cx: c.x, cy: c.y, cz: c.z, sun: SUN, fog: FOG, top: SKY_TOP, hor: SKY_HOR, sunVis: SUN, lx: c.x + c.dx * 1.2, ly: c.y + c.dy * 1.2, lz: c.z + c.dz * 1.2, lampC: flash ? [1.5, 1.1, 0.55] : (fp && DAY.torch) || [0, 0, 0] };
    if (this.boomL && now - this.boomL.t < 300) { const k = 1 - (now - this.boomL.t) / 300, b = this.boomL; F.lx = b.x; F.ly = b.y; F.lz = b.z; F.lampC = [5 * k, 3.2 * k, 1.4 * k]; }
    if (this.wfl > 0.004) { this.wfl *= 0.86; this.el.wflash.style.opacity = this.wfl.toFixed(3); } else if (this.wfl) { this.wfl = 0; this.el.wflash.style.opacity = '0'; }
    const vis = v && (v.phase === 'play') ? this.R : [];
    // gölge
    const scx = fp ? c.x + c.dx * 12 : 0, scz = fp ? c.z + c.dz * 12 : 0, sR = fp ? 30 : 46;
    if (shadowBegin(X, SUN, scx, 0, scz, sR, sR * 2.2 + 20, 0.3)) {
      shadowCast(X, this.world, null);
      vis.forEach((r, i) => { if (r && !(fp && i === this.meI)) this.fighter(X, r, true); });
    }
    shadowEnd(X, Wp, Hp);
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(FOG[0], FOG[1], FOG[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    drawSky(X, F, DAY);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    useProg(X, X.lit, F, DAY);
    aoOn(X, 0, 0.75, 0.5);
    detailOn(X, 0.3, 0.9);
    drawMesh(X, this.world, null);
    detailOn(X, 0);
    aoOn(X, 0, 0.5, 0);
    const u = X.lit.u;
    vis.forEach((r, i) => {
      if (!r || (fp && i === this.meI)) return;
      if (u.uRim) { const tc = hexRGB(TEAM[r.t % 2].hex); gl.uniform4f(u.uRim, tc[0], tc[1], tc[2], DAY.rim || 0.55); }
      this.fighter(X, r, false);
    });
    if (u.uRim) gl.uniform4f(u.uRim, 0, 0, 0, 0);
    if (v && v.phase === 'play') {
      const tt = now / 1000;
      for (let k = 0; k < CT_PICK.length; k++) {
        if (!((v.pk >> k) & 1)) continue;
        const q = CT_PICK[k];
        if (u.uRim) gl.uniform4f(u.uRim, q[2] ? 1 : 0.3, q[2] ? 0.8 : 1, q[2] ? 0.2 : 0.5, 0.9);
        M.set(mt.a, q[0], 0.32 + Math.sin(tt * 2.2 + k) * 0.08, q[1], tt * 1.4 + k, 0, 0, 1.25);
        drawMesh(X, this.pkMesh[q[2]], mt.a);
      }
      if (u.uRim) gl.uniform4f(u.uRim, 0, 0, 0, 0);
      for (const n of this.nd) {
        const f = (now - n.t) / 40, i = Math.min(n.P.length - 1, Math.floor(f)), j = Math.min(n.P.length - 1, i + 1), w = clamp(f - i, 0, 1), a = n.P[i], b = n.P[j];
        n.x = a[0] + (b[0] - a[0]) * w; n.y = a[1] + (b[1] - a[1]) * w; n.z = a[2] + (b[2] - a[2]) * w;
        M.set(mt.a, n.x, n.y, n.z, f * 0.5, f * 0.37, 0, 1.25);
        drawMesh(X, this.nadeMesh, mt.a);
      }
      this.nd = this.nd.filter((n) => now - n.t < CT_NADE.fuse * 1000 + 300);
    }
    // efektler: mermi izleri (saydam), kıvılcım ve mermi yolu (parlak)
    const V = mt.V, rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    const FX = this.fx, A = this.pA, B = this.pB;
    let oa = 0, ob = 0;
    for (const q of FX.dc) { if (oa > A.length - 200) break; oa = emitSoft(A, oa, q.x, q.y, q.z, q.big ? 1.5 : 0.045, 0.08, 0.07, 0.06, (q.big ? 0.6 : 0.85) * clamp((14 - q.t) / 3, 0, 1), q.tx[0], q.tx[1], q.tx[2], q.ty[0], q.ty[1], q.ty[2]); }
    for (const q of FX.sp) {
      const k = 1 - q.t / q.life, s = q.s * (1 + (q.grow || 0) * q.t * 6);
      if (q.add) { if (ob < B.length - 200) ob = emitSoft(B, ob, q.x, q.y, q.z, s, q.r, q.g, q.b, k, rx, ry, rz, ux, uy, uz); }
      else if (oa < A.length - 200) oa = emitSoft(A, oa, q.x, q.y, q.z, s, q.r, q.g, q.b, (q.solid ? 1 : 0.5) * k, rx, ry, rz, ux, uy, uz);
    }
    if (v && v.phase === 'play') {
      const tt = now / 1000;
      // kutuların ışık halesi ve bombanın yanıp sönen ışığı
      for (let k = 0; k < CT_PICK.length; k++) { if (!((v.pk >> k) & 1) || ob > B.length - 200) continue; const q = CT_PICK[k], g = 0.16 + 0.07 * Math.sin(tt * 3 + k); ob = emitSoft(B, ob, q[0], 0.5, q[1], 0.75, q[2] ? 1 : 0.3, q[2] ? 0.75 : 1, q[2] ? 0.25 : 0.5, g, rx, ry, rz, ux, uy, uz); }
      for (const n of this.nd) { if (n.x === undefined || ob > B.length - 200) continue; const age = (now - n.t) / (CT_NADE.fuse * 1000), on = Math.sin(age * age * 70) > 0; if (on) ob = emitSoft(B, ob, n.x, n.y + 0.06, n.z, 0.14 + age * 0.12, 1, 0.2, 0.15, 0.95, rx, ry, rz, ux, uy, uz); }
    }
    // Karlı Üs: kameranın çevresinde yağan kar (saydam katmanda)
    if (DAY.snow) for (let k = 0; k < 90 && oa < A.length - 200; k++) {
      const tt = now / 1000, h1 = hsh(k, 7), h2 = hsh(k, 19), h3 = hsh(k, 31), sp = 0.55 + h2 * 0.5;
      const py = c.y + 6 - ((h2 * 9 + tt * sp) % 9);
      const px = c.x + ((h1 * 18 + tt * 0.45 + Math.sin(tt * 0.8 + k) * 0.35 + 900) % 18) - 9, pz = c.z + ((h3 * 18 + tt * 0.18 + 900) % 18) - 9;
      oa = emitSoft(A, oa, px, py, pz, 0.022 + h3 * 0.022, 1, 1, 1, 0.85, rx, ry, rz, ux, uy, uz);
    }
    // havada süzülen toz zerreleri (güneşte parlar; gece sönük)
    for (let k = 0; k < (DAY.snow ? 0 : 16) && ob < B.length - 200; k++) {
      const tt = now / 1000, h1 = hsh(k, 7), h2 = hsh(k, 19), h3 = hsh(k, 31);
      const px = c.x + ((h1 * 14 + tt * (0.12 + h2 * 0.2) + 700) % 14) - 7, py = 0.4 + ((h2 * 5 + tt * 0.05 * (h3 - 0.3) + 50) % 5), pz = c.z + ((h3 * 14 + tt * (0.1 + h1 * 0.15) + 700) % 14) - 7;
      ob = emitSoft(B, ob, px, py, pz, 0.018 + h2 * 0.02, 1, 0.92, 0.75, (0.3 + 0.25 * Math.sin(tt * 1.7 + k)) * (DAY.night ? 0.4 : 1), rx, ry, rz, ux, uy, uz);
    }
    for (const q of FX.tr) {
      if (ob > B.length - 200) break;
      // izin görünen parçası: baştan sona ilerleyen kısa çizgi
      const k1 = clamp(q.t / q.life, 0, 1), k0 = clamp(k1 - Math.min(0.5, 9 / q.d), 0, 1);
      const sx = q.ax + (q.bx - q.ax) * k0, sy = q.ay + (q.by - q.ay) * k0, sz = q.az + (q.bz - q.az) * k0;
      const ex = q.ax + (q.bx - q.ax) * k1, ey = q.ay + (q.by - q.ay) * k1, ez = q.az + (q.bz - q.az) * k1;
      // kameraya dik genişlik yönü
      const dx = ex - sx, dy = ey - sy, dz = ez - sz, vx = (sx + ex) / 2 - c.x, vy = (sy + ey) / 2 - c.y, vz = (sz + ez) / 2 - c.z;
      let nx = dy * vz - dz * vy, ny = dz * vx - dx * vz, nz = dx * vy - dy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1, wd = (q.mine ? 0.012 : 0.02) * (1 + Math.hypot(vx, vy, vz) * 0.035);
      nx = (nx / nl) * wd; ny = (ny / nl) * wd; nz = (nz / nl) * wd;
      const P = [[sx - nx, sy - ny, sz - nz, 0], [sx + nx, sy + ny, sz + nz, 0], [ex + nx, ey + ny, ez + nz, 1], [sx - nx, sy - ny, sz - nz, 0], [ex + nx, ey + ny, ez + nz, 1], [ex - nx, ey - ny, ez - nz, 1]];
      for (const w of P) { B[ob++] = w[0]; B[ob++] = w[1]; B[ob++] = w[2]; B[ob++] = 1; B[ob++] = 0.86; B[ob++] = 0.5; B[ob++] = w[3] * (q.mine ? 0.55 : 0.9); }
    }
    // başkalarının namlu alevi
    vis.forEach((r, i) => {
      if (!r || !r.mz || !r.alive || (fp && i === this.meI) || now - r.shotAt > 60 || ob > B.length - 400) return;
      ob = emitSoft(B, ob, r.mz[0], r.mz[1], r.mz[2], 0.22, 1, 0.8, 0.4, 0.9, rx, ry, rz, ux, uy, uz);
      ob = emitSoft(B, ob, r.mz[0], r.mz[1], r.mz[2], 0.1, 1, 1, 0.85, 1, rx, ry, rz, ux, uy, uz);
    });
    if (oa || ob) {
      useProg(X, X.un, F, DAY);
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      if (oa) { gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -3); drawDynamic(X, X.dyn2, A, oa / 7, false); gl.disable(gl.POLYGON_OFFSET_FILL); }
      if (ob) { gl.blendFunc(gl.SRC_ALPHA, gl.ONE); drawDynamic(X, X.dyn, B, ob / 7, true); }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    // birinci şahıs silah
    if (fp && !(p.w === 2 && p.adsA > 0.85)) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      M.persp(mt.P2, asp < 0.9 ? 1.15 : 0.92, asp, 0.02, 6);
      const sv = new Float32Array([V[0] * SUN[0] + V[4] * SUN[1] + V[8] * SUN[2], V[1] * SUN[0] + V[5] * SUN[1] + V[9] * SUN[2], V[2] * SUN[0] + V[6] * SUN[1] + V[10] * SUN[2]]);
      const F2 = Object.assign({}, F, { VP: mt.P2, cx: 0, cy: 0, cz: 0, sun: sv, lx: 0, ly: -0.05, lz: -0.9, lampC: flash ? [1.2, 0.9, 0.45] : DAY.torch || [0, 0, 0] });
      useProg(X, X.lit, F2, Object.assign({}, DAY, { fogR: [50, 60] }));
      shadowSet(X, false);
      const a = p.adsA, hip = VM_HIP[p.w], ads = VM_ADS[p.w];
      const hs = clamp(Math.hypot(p.vx, p.vz) / 4.5, 0, 1.4);
      const bobX = Math.sin(p.ph) * 0.012 * hs * (1 - a * 0.85), bobY = Math.abs(Math.cos(p.ph)) * 0.012 * hs * (1 - a * 0.85);
      let x = lerp(hip[0], ads[0], a) + bobX + (p.sprint ? 0.03 : 0), y = lerp(hip[1], ads[1], a) - bobY - (p.land || 0) * 0.03 - (p.sprint ? 0.05 : 0), z = lerp(hip[2], ads[2], a);
      { const kk = 1 - a * 0.85, br = now / 1000; x += (this.swx || 0) * kk + Math.sin(br * 1.3) * 0.0025 * kk; y += (this.swy || 0) * kk + Math.sin(br * 1.9) * 0.003 * kk - clamp(p.vy, -6, 6) * 0.004 * kk; }
      let rxm = 0, rym = Math.PI, rzm = (this.swx || 0) * -1.6 * (1 - a * 0.85);
      const kick = p.kick * p.kick;
      z += kick * (p.w === 0 || p.w === 3 ? 0.03 : 0.09); rxm -= kick * (p.w === 0 || p.w === 3 ? 0.03 : 0.14);
      if (p.sprint) { rym += 0.5; rxm += 0.25; }
      // şarjör değiştirme / silah değiştirme: silah aşağı iner
      let dip = p.vmDrop;
      if (p.reloadAt > now) { const t = 1 - (p.reloadAt - now) / CT_W[p.reloadW].rl; dip = Math.max(dip, Math.sin(clamp(t, 0, 1) * Math.PI) ** 0.6 * 0.85); rzm += Math.sin(clamp(t, 0, 1) * Math.PI) * 0.5; }
      y -= dip * 0.22; rxm += dip * 0.7;
      M.set(mt.a, x, y, z, rym, rxm, rzm);
      drawMesh(X, this.gunsFp[p.w], mt.a);
      drawMesh(X, this.armsFp[p.team % 2], mt.a);
      if (flash) {
        const m = mt.a, mz = MUZZLE[p.w] + 0.04, my = 0.035;
        const fxp = m[4] * my + m[8] * mz + m[12], fyp = m[5] * my + m[9] * mz + m[13], fzp = m[6] * my + m[10] * mz + m[14];
        let o2 = 0;
        const s = (p.w === 0 ? 0.07 : p.w === 3 ? 0.055 : 0.12) * (0.8 + Math.random() * 0.5);
        o2 = emitSoft(B, o2, fxp, fyp, fzp, s, 1, 0.75, 0.35, 0.9, 1, 0, 0, 0, 1, 0);
        o2 = emitSoft(B, o2, fxp, fyp, fzp, s * 0.45, 1, 1, 0.85, 1, 1, 0, 0, 0, 1, 0);
        useProg(X, X.un, F2, DAY);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
        drawDynamic(X, X.dyn, B, o2 / 7, true);
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
    }
    postFX(X, Wp, Hp, Object.assign({ bloom: 0.5, th: 0.82, white: 0.14, sat: 1.06, con: 0.26, vig: fp ? 0.66 : 0.4, tint: [1.05, 1, 0.93] }, DAY.fx || {}));
  }
  placeTags() {
    const v = this.view;
    if (!this.tagEls) this.tagEls = [];
    const Wv = this.vw || 1, Hv = this.vh || 1, m = this.mats.VP, p = this.me;
    const dk = p && !p.alive && this.dcam && this.dcam.ki !== this.meI ? this.dcam.ki : -1;
    const show = v && v.phase === 'play' && p && (p.alive || dk >= 0);
    const ffa = v && v.mode === 'ffa';
    this.R.forEach((r, i) => {
      let el = this.tagEls[i];
      if (!el) { el = document.createElement('div'); this.el.tags.appendChild(el); this.tagEls[i] = el; }
      const mate = !ffa && p && r.t === p.team;
      if (!show || i === this.meI || !r.alive || (dk >= 0 ? i !== dk : (!mate && this.aimEnt !== i))) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
      const k = `${r.n}|${r.t}|${mate}|${i === dk}`;
      if (el.dataset.k !== k) { el.dataset.k = k; el.className = 'ct-tag' + (i === dk ? ' killer' : ''); el.style.color = i === dk ? '#ffd23f' : mate ? '#8dffa6' : '#ff5a5c'; el.innerHTML = (i === dk ? '<b>SENİ VURDU</b>' : '') + `${esc(r.n)}<i></i>`; }
      const y = r.y + (r.f & 2 ? 1.5 : 1.98);
      const cx = m[0] * r.x + m[4] * y + m[8] * r.z + m[12], cy = m[1] * r.x + m[5] * y + m[9] * r.z + m[13], cw = m[3] * r.x + m[7] * y + m[11] * r.z + m[15];
      if (cw < 0.3 || cw > 70) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.opacity = i === dk ? '1' : String(clamp(1.3 - cw / 60, 0.45, 1));
      el.style.transform = `translate(${((cx / cw) * 0.5 + 0.5) * Wv}px, ${(1 - ((cy / cw) * 0.5 + 0.5)) * Hv}px) translate(-50%, -100%)`;
    });
    for (let i = this.R.length; i < this.tagEls.length; i++) this.tagEls[i].style.display = 'none';
  }

  /* ---------- arayüz ---------- */
  radar() {
    const cv = this.el.radar, g = cv.getContext('2d'), p = this.me, v = this.view;
    if (!g || !p || !v) return;
    const Wc = cv.width, Hc = cv.height, sc = Math.min(Hc / (CT_HZ * 2 + 2), Wc / (CT_HX * 2 + 2));
    const flip = p.team % 2 === 0 ? 1 : -1;      // kendi üssün altta
    const X2 = (x) => Wc / 2 + x * sc * flip, Z2 = (z) => Hc / 2 - z * sc * flip;
    if (!this.radarBg || this.radarFlip !== flip) {
      const b = document.createElement('canvas'); b.width = Wc; b.height = Hc;
      const h = b.getContext('2d');
      h.fillStyle = 'rgba(20,24,34,.5)'; h.fillRect(0, 0, Wc, Hc);
      for (const q of CT_BOXES) { if (q[1] > 0.5) continue; h.fillStyle = q[6] === 0 ? 'rgba(255,255,255,.55)' : q[4] > 2 ? 'rgba(235,225,205,.75)' : 'rgba(235,225,205,.4)'; const x0 = X2(q[0]), x1 = X2(q[3]), z0 = Z2(q[2]), z1 = Z2(q[5]); h.fillRect(Math.min(x0, x1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(z1 - z0)); }
      this.radarBg = b; this.radarFlip = flip;
    }
    g.clearRect(0, 0, Wc, Hc);
    g.drawImage(this.radarBg, 0, 0);
    const now = performance.now(), ffa = v.mode === 'ffa';
    this.R.forEach((r, i) => {
      if (!r || !r.alive || i === this.meI) return;
      const mate = !ffa && r.t === p.team;
      if (!mate && now - r.shotAt > 1600 && this.aimEnt !== i) return;
      g.fillStyle = mate ? TEAM[r.t % 2].hex : '#ff3b3f';
      g.beginPath(); g.arc(X2(r.x), Z2(r.z), mate ? 4.5 : 5.5, 0, TAU); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke();
    });
    if (p.alive) {
      g.save(); g.translate(X2(p.x), Z2(p.z)); g.rotate(p.yaw * flip + (flip < 0 ? Math.PI : 0));
      g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }
  ui() {
    const v = this.view;
    if (!v) return;
    { const hp = v.ps && v.ps[v.me] ? v.ps[v.me][7] : 100, t0 = performance.now(); if (v.phase === 'play' && this.me && this.me.alive && hp < 36 && t0 - (this.hbAt || 0) > 760 + hp * 8) { this.hbAt = t0; this.snd.play('heart', 0.45 + (36 - hp) / 60); } }
    { let near = false; const me = this.me; if (me && me.alive && v.phase === 'play') for (const n of this.nd) if (n.x !== undefined && Math.hypot(n.x - me.x, n.z - me.z, n.y - me.y - 1) < CT_NADE.r * 0.85) near = true; if (near !== !!this.nwOn) { this.nwOn = near; this.el.nwarn.classList.toggle('on', near); if (near) { this.snd.play('empty'); vibrate(40); } } }
    { const n = v.nd || 0, uu = this.el.bNade.querySelector('u'); if (uu.textContent !== String(n)) { uu.textContent = String(n); this.el.bNade.classList.toggle('no', !n); } }
    const now = this.ctx.serverNow(), p = this.me;
    if (this.cdEl) { const s = Math.max(0, Math.ceil((v.startAt - now) / 1000)); if (this.cdEl.textContent !== String(s)) this.cdEl.textContent = String(s); }
    if (this.goBtn) this.goBtn.style.visibility = v.phase === 'ready' && v.startAt - now > 3900 ? 'visible' : 'hidden';
    if (v.phase === 'ready' && v.startAt - now <= 3000 && v.startAt - now > 0) {
      const n = Math.ceil((v.startAt - now) / 1000);
      if (n !== this.lastN) { this.lastN = n; this.el.msg.innerHTML = `<span class="big">${n}</span>`; this.snd.play('tick'); }
    }
    if (v.phase !== 'play' || !p) return;
    const s = Math.max(0, Math.ceil((v.endsAt - now) / 1000));
    const ffa = v.mode === 'ffa';
    let a, b, la, lb;
    if (ffa) {
      const top = v.players.slice().sort((x, y) => y.k - x.k)[0], mine = v.players[v.me];
      a = mine ? mine.k : 0; b = top ? top.k : 0; la = 'SEN'; lb = 'LİDER';
    } else { a = (v.ts || [0, 0])[0]; b = (v.ts || [0, 0])[1]; la = 'KIRMIZI'; lb = 'MAVİ'; }
    const key = `${a}|${b}|${s}|${v.goal}|${p.team}|${ffa}`;
    if (key !== this.topKey) {
      this.topKey = key;
      this.el.top.innerHTML = `<div class="t t0 ${!ffa && p.team % 2 === 0 ? 'me' : ''}">${a}<small>${la}</small><i style="width:${clamp((a / v.goal) * 100, 0, 100)}%"></i></div><div class="tm ${s <= 20 ? 'warn' : ''}"><span>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}<small>hedef ${v.goal}</small></span></div><div class="t t1 ${!ffa && p.team % 2 === 1 ? 'me' : ''}">${b}<small>${lb}</small><i style="width:${clamp((b / v.goal) * 100, 0, 100)}%"></i></div>`;
    }
    if (s <= 10 && s > 0 && s !== this.lastS) { this.lastS = s; this.snd.play('tick'); }
    const hp = Math.max(0, Math.round(p.hp));
    if (hp !== this.hpKey) { this.hpKey = hp; this.el.hpB.firstChild.textContent = String(hp); this.el.hpI.style.width = hp + '%'; this.el.hp.classList.toggle('low', hp <= 35); }
    this.el.low.style.opacity = p.alive && hp <= 35 ? String(0.25 + (35 - hp) / 60) : '0';
    if (p.alive && hp <= 35 && performance.now() - (this.heartAt || 0) > 900) { this.heartAt = performance.now(); this.snd.play('heart', 0.9); }
    const W = CT_W[p.w], rl = p.reloadAt > performance.now();
    const ak = `${p.w}|${p.mag[p.w]}|${rl}`;
    if (ak !== this.ammoKey) {
      this.ammoKey = ak;
      this.el.ammo.className = 'ct-ammo' + (rl ? ' rl' : p.mag[p.w] <= W.mag * 0.25 ? ' low' : '');
      this.el.ammo.innerHTML = rl ? 'DOLDURULUYOR…' : `${p.mag[p.w]}<small>/${W.mag}</small>`;
      this.el.ws.forEach((el, k) => el.classList.toggle('on', k === p.w));
    }
    this.el.prot.style.display = p.alive && p.prot ? 'block' : 'none';
    if (!p.alive) {
      const left = Math.max(0, Math.ceil((p.resp || 0) / 1000));
      const dc = this.dcam, KP = dc && v.players && v.players[dc.ki], KS = dc && v.ps && v.ps[dc.ki];
      const cam = !!(KP && dc.ki !== this.meI);
      this.el.wrap.classList.toggle('dcam', cam);
      if (cam) {
        const wn = dc.w === CT_NADE_W ? '💣 El bombası' : `${WICON[dc.w] || '🔫'} ${(CT_W[dc.w] || CT_W[0]).n}`;
        const dk = `${dc.ki}|${dc.w}|${dc.head}|${KS ? KS[7] : ''}|${KS ? KS[8] : ''}`;
        if (this.dcKey !== dk) {
          this.dcKey = dk;
          this.el.deadB.innerHTML = `💀 <span class="t${KP.t % 2}">${esc(KP.n)}</span> seni vurdu`;
          this.el.deadS.innerHTML = `${wn}${dc.head ? ' · <b class="hs">kafadan</b>' : ''}${KS ? (KS[8] ? ` · canı <b class="hp">${KS[7]}</b>` : ' · o da düştü') : ''}`;
        }
      } else {
        this.dcKey = '';
        this.el.deadB.textContent = this.killer ? `💀 ${this.killer} seni vurdu` : '💀 Vuruldun';
        this.el.deadS.textContent = 'Yeniden doğuyorsun…';
      }
      this.el.deadE.textContent = String(left || 1);
    }
    this.radar();
  }
  crosshair() {
    const p = this.me;
    if (!p || !p.alive) return;
    const gap = Math.round(4 + (this.spread() / (this.cam.fov * 57.3)) * (this.vh || 600) * 1.0);
    if (gap === this.gapKey) return;
    this.gapKey = gap;
    const L = 8, T = 2, xi = this.el.xi;
    xi[0].style.cssText = `left:${-T / 2}px;top:${-gap - L}px;width:${T}px;height:${L}px`;
    xi[1].style.cssText = `left:${-T / 2}px;top:${gap}px;width:${T}px;height:${L}px`;
    xi[2].style.cssText = `top:${-T / 2}px;left:${-gap - L}px;height:${T}px;width:${L}px`;
    xi[3].style.cssText = `top:${-T / 2}px;left:${gap}px;height:${T}px;width:${L}px`;
  }
  panel() {
    const v = this.view;
    if (!v) return;
    const ctx = this.ctx;
    let key = v.phase, html = '';
    if (v.phase === 'loading') html = '<div class="card"><div class="tt">🎯 Harita yükleniyor…</div></div>';
    else if (v.phase === 'ready') {
      const o = v.opt || {}, P = v.players || [];
      key = `ready|${JSON.stringify([o.mode, o.dur, o.size, o.diff, o.map, v.map])}|${P.map((p) => p.id + p.t + p.n).join(',')}|${ctx.isHost}|${this.sens}|${this.auto}`;
      const chip = (k, val, lab, cur) => `<button class="${cur === val ? 'on' : ''}" data-game-action="opt" data-payload='${JSON.stringify({ k, v: val })}'>${lab}</button>`;
      const my = (k, val, lab, cur) => `<button class="${String(cur) === String(val) ? 'on' : ''}" data-ct="${k}:${val}">${lab}</button>`;
      const names = (t) => P.filter((p) => p.t === t).map((p) => `<span class="${p.id === ctx.me ? 'me' : ''}">${esc(p.n)}</span>`).join('');
      const MODE = { tdm: 'Takım savaşı', coop: 'Hep birlikte (botlara karşı)', ffa: 'Herkes tek' };
      html = `<div class="card rdy">
        <div class="tt">🎯 Çatışma</div>
        <div class="sub">${CT_MAPI[v.map] || '🗺️'} ${esc((v.maps || [])[v.map] || '')} · ${MODE[o.mode] || ''} · ${o.dur} dk · hedef ${o.goal} öldürme</div>
        <div class="how">
          <div><span class="k">🕹️</span><span><b>Sol kol yürü, sağ taraf nişan</b><small>Kolu sonuna kadar it: koş. Ateş düğmesini sürükleyerek de nişan alırsın</small></span></div>
          <div><span class="k">🔫</span><span><b>Tüfek · Makineli · Pompalı · Keskin</b><small>Kafadan vuruş çok daha fazla can götürür. Keskin nişancı için dürbünü aç</small></span></div>
          <div><span class="k">❤️</span><span><b>Siper al, can dolsun</b><small>5 saniye vurulmazsan canın yenilenir. Ölünce 3 saniyede geri doğarsın</small></span></div>
        </div>
        <div class="ct-rot">📱 Telefonu yan çevir, çok daha rahat oynarsın. (iPhone: Paylaş → “Ana Ekrana Ekle” ile tam ekran açılır.)</div>
        <div class="ct-opt">
          ${ctx.isHost ? `<div class="r"><span>Mod</span>${chip('mode', 'coop', 'Birlikte', o.mode)}${chip('mode', 'tdm', 'Takım', o.mode)}${chip('mode', 'ffa', 'Herkes tek', o.mode)}</div>
          <div class="r"><span>Süre</span>${(o.durs || [3, 5, 8]).map((m) => chip('dur', m, m + ' dk', o.dur)).join('')}</div>
          <div class="r"><span>Takım boyu</span>${(o.sizes || [3, 4, 5]).map((m) => chip('size', m, m + '’e ' + m, o.size)).join('')}</div>
          <div class="r"><span>Botlar</span>${chip('diff', 0, 'Kolay', o.diff)}${chip('diff', 1, 'Orta', o.diff)}${chip('diff', 2, 'Zor', o.diff)}</div>
          <div class="r map"><span>Harita</span>${chip('map', -1, 'Sırayla', o.map)}${(v.maps || []).map((n, i) => chip('map', i, (CT_MAPI[i] ? CT_MAPI[i] + ' ' : '') + esc(n), o.map)).join('')}</div>` : ''}
          <div class="r my"><span>Hassasiyet</span>${my('sens', 0, 'Düşük', this.sens)}${my('sens', 1, 'Orta', this.sens)}${my('sens', 2, 'Yüksek', this.sens)}</div>
          <div class="r my"><span>Oto ateş</span>${my('auto', 1, 'Açık', this.auto ? 1 : 0)}${my('auto', 0, 'Kapalı', this.auto ? 1 : 0)}</div>
        </div>
        ${o.mode === 'ffa' ? `<div class="ct-teams one"><div class="tf"><b>Herkes tek · ${P.length} kişi</b>${P.map((p) => `<span class="${p.id === ctx.me ? 'me' : ''}">${esc(p.n)}</span>`).join('')}</div></div>`
    : `<div class="ct-teams"><div class="t0"><b>Kırmızı takım</b>${names(0)}</div><div class="t1"><b>Mavi takım</b>${names(1)}</div></div>`}
        <div class="ct-go"><div class="cd"><span>Çatışma başlıyor</span><b data-cd></b></div>
        ${ctx.isHost ? '<button class="kb btn" data-game-action="go">Hemen başla ▶</button>' : ''}</div>
      </div>`;
    } else if (v.phase === 'play') key = 'play';
    else if (v.phase === 'final') {
      const rs = v.results || [], ffa = v.mode === 'ffa';
      key = `final|${rs.map((r) => r.id + r.k).join(',')}|${ctx.isHost}`;
      const mine = rs.find((r) => r.id === ctx.me);
      let title;
      if (ffa) title = rs[0] && rs[0].k ? `🏆 ${esc(rs[0].nickname)} kazandı!` : 'Süre bitti!';
      else title = v.win < 0 ? '🤝 Berabere!' : `🏆 ${TEAM[v.win].n} takım kazandı!`;
      const sb = rs.filter((r) => !r.bot || ffa).slice(0, 3).map((r) => ({ id: r.id, nickname: r.nickname, score: r.k, c: r.c }));
      html = `<div class="card">
        <div class="tt">${title}</div>
        <div class="sub">${ffa ? 'En çok öldüren kazanır' : `Kırmızı ${v.ts[0]} – ${v.ts[1]} Mavi`}${mine ? ` · sen: ${mine.k} öldürme, ${mine.d} ölüm` : ''}</div>
        ${ffa ? podiumHTML(sb, ctx.me) : ''}
        <div style="overflow-x:auto"><table class="ct-res"><tr><th></th><th style="text-align:left">Oyuncu</th><th>Öldürme</th><th>Ölüm</th><th>💀 Kafa</th><th>Hasar</th></tr>
        ${rs.map((r) => `<tr class="t${r.team % 2}${ffa ? ' f' : ''} ${r.id === ctx.me ? 'me' : ''}"><td>${medal(r.place)}</td><td class="n">${esc(r.nickname)}</td><td class="k">${r.k}</td><td>${r.d}</td><td>${r.hs}</td><td>${r.dmg}</td></tr>`).join('')}</table></div>
        ${v.mvp ? `<div class="best">⭐ Maçın yıldızı: <b>${esc(v.mvp.n)}</b> · ${v.mvp.k} öldürme</div>` : ''}
        ${v.hs ? `<div class="best">💀 Keskin göz: <b>${esc(v.hs.n)}</b> · ${v.hs.v} kafadan vuruş</div>` : ''}
        ${ctx.isHost ? '<button class="kb btn" data-game-action="restart">Tekrar oyna 🔁</button><button class="kb alt btn" data-act="exit-game">← Oyunlara dön</button>' : `<p class="hint">Yeni maçı ${esc(ctx.hostName)} başlatacak.</p>`}
      </div>`;
    }
    if (key !== this.panelKey) {
      this.panelKey = key;
      const p = this.el.panel;
      const sc = p.querySelector('.card') ? p.querySelector('.card').scrollTop : 0;
      p.innerHTML = html;
      p.classList.toggle('on', !!html);
      if (p.querySelector('.card')) p.querySelector('.card').scrollTop = sc;
      this.cdEl = p.querySelector('[data-cd]');
      this.goBtn = p.querySelector('[data-game-action="go"]');
    }
  }
  emoAnchor(pid) {
    const v = this.view;
    if (!v || !v.players) return null;
    const i = v.players.findIndex((p) => p.id === pid), r = this.R[i];
    if (!r || i === this.meI) return null;
    const m = this.mats.VP, y = r.y + 2.3;
    const cx = m[0] * r.x + m[4] * y + m[8] * r.z + m[12], cy = m[1] * r.x + m[5] * y + m[9] * r.z + m[13], cw = m[3] * r.x + m[7] * y + m[11] * r.z + m[15];
    if (cw <= 0.2) return null;
    return [((cx / cw) * 0.5 + 0.5) * (this.vw || 1), (1 - ((cy / cw) * 0.5 + 0.5)) * (this.vh || 1)];
  }
  emoName(pid) { const v = this.view || {}; const p = (v.players || []).find((x) => x.id === pid); return p ? p.n : ''; }

  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.frameB);
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!(dt > 0)) dt = 0.016;
    const raw = dt;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    try {
      this.vw = this.el.wrap.clientWidth;
      this.vh = this.el.wrap.clientHeight;
      this.uiT += dt;
      if (this.uiT > 0.1) { this.uiT = 0; this.ui(); }
      if (this.flat) return;
      const v = this.view, p = this.me;
      const live = !!(p && p.alive && v && v.phase === 'play');
      if (live) this.stepMe(dt);
      this.stepCam(dt);
      if (live) { this.stepAim(dt); this.crosshair(); }
      this.stepRemote(dt);
      this.stepFx(dt);
      this.draw();
      this.placeTags();
      this.emo.frame((pid) => this.emoAnchor(pid), (pid) => this.emoName(pid));
      this.sendT += dt;
      if (live && this.sendT > 0.1) {
        this.sendT = 0;
        const r2 = (x) => Math.round(x * 100) / 100;
        const pl = { x: r2(p.x), y: r2(p.y), z: r2(p.z), r: r2(p.yaw), p: r2(p.pitch), f: p.f, w: p.w };
        const k = JSON.stringify(pl);
        if (k !== this.lastPos || now - (this.posAt || 0) > 1000) {
          this.lastPos = k; this.posAt = now;
          try { this.ctx.sendQuiet ? this.ctx.sendQuiet('pos', pl) : this.ctx.send('pos', pl); } catch { /* yok */ }
        }
      }
      autoRes(this, raw);
    } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error('[catisma]', e); }
    }
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    try { this.snd && this.snd.stopAll && this.snd.stopAll(); } catch { /* yok say */ }
    try { this.snd && this.snd.music(null); this.snd && this.snd.amb(null); } catch { /* yok say */ }
    try { this.emo && this.emo.dispose(); } catch { /* yok say */ }
    try { if (document.pointerLockElement === this.el.cv) document.exitPointerLock(); } catch { /* yok */ }
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouse);
    try {
      if (this.X && !this.X.gl.isContextLost()) {
        const X = this.X;
        [this.world, ...(this.guns || []), ...(this.gunsFp || []), ...(this.armsFp || [])].forEach((m) => m && freeMesh(X, m));
        Object.values(this.chars || {}).forEach((o) => Object.values(o).forEach((m) => freeMesh(X, m)));
        X.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch { /* yok say */ }
    this.el.wrap.remove();
    document.documentElement.style.overflow = this.prevOverflow || '';
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new Game(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[catisma]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
