// İstemci tarafı oyun arayüzleri. Anahtar = sunucudaki meta.id
// Her modül: render(root, ctx) ve destroy() dışa aktarır.
//   ctx = { view, room, me, isHost, hostName, serverNow, send(action, payload) }
// Sunucuya hamle için HTML'de: data-game-action="spin" data-payload='{"..."}'  (bkz. _kit.js act())
import * as hesabiKimOder from './hesabiKimOder.js?v=2026-11-21-g';
import * as aramizdakiCasus from './aramizdakiCasus.js?v=2026-11-21-g';
import * as dogrulukCesaret from './dogrulukCesaret.js?v=2026-11-21-g';
import * as kimYapar from './kimYapar.js?v=2026-11-21-g';
import * as tostunaDovus from './tostunaDovus.js?v=2026-11-21-g';
import * as buMuSuMu from './buMuSuMu.js?v=2026-11-21-g';
import * as bilBakalim from './bilBakalim.js?v=2026-11-21-g';
import * as vampirKoylu from './vampirKoylu.js?v=2026-11-21-g';
import * as anlatBakalim from './anlatBakalim.js?v=2026-11-21-g';
import * as emojiBilmece from './emojiBilmece.js?v=2026-11-21-g';
import * as sessizSinema from './sessizSinema.js?v=2026-11-21-g';
import * as sayiBombasi from './sayiBombasi.js?v=2026-11-21-g';
import * as ikiDogruBirYalan from './ikiDogruBirYalan.js?v=2026-11-21-g';
import * as renkSasirtmaca from './renkSasirtmaca.js?v=2026-11-21-g';
import * as hafizaSirasi from './hafizaSirasi.js?v=2026-11-21-g';
import * as uyumTesti from './uyumTesti.js?v=2026-11-21-g';
import * as korLabirent from './korLabirent.js?v=2026-11-21-g';
import * as tahminUstasi from './tahminUstasi.js?v=2026-11-21-g';
import * as tasKagitMakas from './tasKagitMakas.js?v=2026-11-21-g';
import * as harfKarmasi from './harfKarmasi.js?v=2026-11-21-g';
import * as dogruYanlis from './dogruYanlis.js?v=2026-11-21-g';
import * as baskentYarisi from './baskentYarisi.js?v=2026-11-21-g';
import * as parmakYarisi from './parmakYarisi.js?v=2026-11-21-g';
import * as kelimeAvi from './kelimeAvi.js?v=2026-11-21-g';
import * as cizTahmin from './cizTahmin.js?v=2026-11-21-g';
import * as kuryeYarisi from './kuryeYarisi.js?v=2026-11-21-g';
import * as sumoTepsisi from './sumoTepsisi.js?v=2026-11-21-g';
import * as miniGolf from './miniGolf.js?v=2026-11-21-g';
import * as mutfakKaosu from './mutfakKaosu.js?v=2026-11-21-g';
import * as sicakPatates from './sicakPatates.js?v=2026-11-21-g';
import * as blokAdasi from './blokAdasi.js?v=2026-11-21-g';
import * as tahta from './tahta.js?v=2026-11-21-g';
import * as catisma from './catisma.js?v=2026-11-21-g';
import * as pizzaKulesi from './pizzaKulesi.js?v=2026-11-21-g';
import * as sosisBowling from './sosisBowling.js?v=2026-11-21-g';

export const gameRenderers = {
  'hesabi-kim-oder': hesabiKimOder,
  'aramizdaki-casus': aramizdakiCasus,
  'dogruluk-cesaret': dogrulukCesaret,
  'kim-yapar': kimYapar,
  'tostuna-dovus': tostunaDovus,
  'bu-mu-su-mu': buMuSuMu,
  'bil-bakalim': bilBakalim,
  'vampir-koylu': vampirKoylu,
  'anlat-bakalim': anlatBakalim,
  'emoji-bilmece': emojiBilmece,
  'sessiz-sinema': sessizSinema,
  'sayi-bombasi': sayiBombasi,
  'iki-dogru-bir-yalan': ikiDogruBirYalan,
  'renk-sasirtmaca': renkSasirtmaca,
  'hafiza-sirasi': hafizaSirasi,
  'uyum-testi': uyumTesti,
  'kor-labirent': korLabirent,
  'tahmin-ustasi': tahminUstasi,
  'tas-kagit-makas': tasKagitMakas,
  'harf-karmasi': harfKarmasi,
  'dogru-yanlis': dogruYanlis,
  'baskent-yarisi': baskentYarisi,
  'parmak-yarisi': parmakYarisi,
  'kelime-avi': kelimeAvi,
  'ciz-tahmin': cizTahmin,
  'kurye-yarisi': kuryeYarisi,
  'sumo-tepsisi': sumoTepsisi,
  'mini-golf': miniGolf,
  'mutfak-kaosu': mutfakKaosu,
  'sicak-patates': sicakPatates,
  'blok-adasi': blokAdasi,
  'satranc': tahta,
  'tavla': tahta,
  'okey': tahta,
  'catisma': catisma,
  'pizza-kulesi': pizzaKulesi,
  'sosis-bowling': sosisBowling,
};
