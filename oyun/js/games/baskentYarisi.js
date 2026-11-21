// Başkent Yarışı — 3D dünya turu masası (NFC Dünyası Oyun)
// Masanın ortasındaki ışıklı kaidenin üstünde bir dünya küresi süzülür; kaidenin halkası süreyi gösterir. Ülke → başkent
// sorusunda küre o ülkeye döner, başkentin yerine kırmızı bir iğne saplanır, üstünde bayraklı bir etiket çıkar. Başkent →
// ülke sorusunda küre "arıyor" gibi döner; yer açılışta gösterilir. Kürenin çevresindeki yörüngede herkesin kendi renginde
// küçük, pervaneli bir uçağı var: puan kazandıkça uçak yörüngede ilerler (bütün durakları kusursuz bilen dünyayı tam bir
// tur dolaşır), yanlış cevapta sarsılıp duman çıkararak geri kayar. Sonda ilk üç madalya, birincinin önünde kupa.
// Masa kiti (masa3d.js) ile çizilir; WebGL yoksa 2D görünüm.
import { _masa } from './masa3d.js?v=2026-11-21-f';
import * as sfx from '../sfx.js?v=2026-11-21-f';

const K = _masa();
const { E, TableGame, MasaSnd, TABLE_Y, TAU, hs } = K;
const { M, C, clamp, lerp, damp, esc, pcol, vibrate, ONE3, drawMesh, limb, makeTexture, updateTexture } = E;
void sfx;

/* ============================ dünya verisi ============================ */
// Kara parçaları (boylam, enlem düz dizi; elle sadeleştirilmiş kıyı çizgileri — oyuncak küre görünümü için)
const LAND = [
  // Kuzey Amerika (Alaska → Kanada Arktik kıyısı → Hudson Körfezi → Labrador → St. Lawrence → ABD doğu → Meksika Körfezi → Orta Amerika → Pasifik kıyısı)
  [-168, 65.6, -162, 66.8, -156.5, 71.3, -148, 70.3, -141, 69.6, -135, 69.5, -128, 70.2, -120, 69.4, -115, 68.2, -108, 68.6, -100, 67.8, -94, 68.5, -92, 66.5, -88, 64.2, -94.5, 60, -92.5, 57.1, -88, 56.5, -84, 55.2, -82.2, 52.9, -79.6, 51.4, -78.8, 54.5, -76.8, 56.5, -77.8, 59.5, -77.4, 62.4, -73, 62, -69.5, 61, -67.5, 58.5, -64.5, 60.3, -61.5, 56.5, -58, 54, -56, 52.2, -60, 50.2, -66.5, 50.2, -69.8, 48.2, -68, 49, -64.4, 48.9, -65.4, 48, -64.8, 47, -63.8, 46.2, -61.5, 45.8, -60, 46.2, -59.8, 45.9, -61.2, 45.3, -63.5, 44.5, -66, 43.8, -66.9, 44.8, -68.5, 44.2, -70.2, 43.6, -70.6, 41.6, -73.6, 40.6, -74.1, 39.4, -75.6, 37.6, -76.4, 35.8, -77.9, 34, -80.8, 32.2, -81.4, 30.3, -80.6, 28.2, -80.1, 25.8, -81.1, 25.1, -82.6, 27.8, -82.8, 29.5, -84.4, 29.9, -86.6, 30.4, -88.9, 30.4, -89.4, 29, -90.5, 29.4, -93.5, 29.7, -95, 29.3, -97.2, 27.6, -97.4, 25.9, -97.8, 22.5, -96.1, 19.2, -94.8, 18.3, -92.5, 18.6, -91, 19, -90.4, 21, -87, 21.5, -87.5, 19.5, -88.3, 17.6, -88.2, 16, -86, 15.9, -83.6, 15, -83.5, 12, -83.7, 11, -82.5, 9.6, -81.4, 8.8, -79.5, 9.6, -77.4, 8.7, -78.1, 7.6, -79.6, 7.5, -80.4, 8.3, -81.8, 8.1, -83.5, 8.5, -85.6, 9.8, -85.8, 11.2, -87.6, 12.9, -89.4, 13.5, -91.4, 13.9, -93.6, 15.6, -95.2, 15.9, -97.8, 16.1, -99.9, 16.8, -101.9, 17.9, -104.3, 19.1, -105.6, 20.3, -105.4, 21.7, -106.4, 23.2, -107.8, 24.6, -108.9, 25.9, -110.6, 27.9, -112.8, 30.7, -114.8, 31.8, -114.4, 30, -112.2, 27.4, -110.2, 24.2, -109.9, 22.9, -111.7, 24.5, -112.4, 26.3, -114.4, 28, -115.9, 30.4, -117.1, 32.5, -118.3, 33.8, -120.6, 34.6, -121.9, 36.6, -122.5, 37.8, -123.8, 39.7, -124.4, 40.4, -124.1, 42, -124.1, 46.2, -124.7, 48.4, -123.4, 48.4, -125.6, 50.1, -127.5, 50.6, -130.3, 54.3, -133, 56.5, -136.7, 58.2, -140, 59.8, -144, 60, -146.8, 60.8, -149.7, 59.6, -151.8, 59.3, -153.6, 57.6, -156.5, 56.6, -159, 55.5, -163.4, 54.6, -162, 55.9, -157.6, 57.5, -157.5, 58.7, -161.8, 59, -164.5, 60.5, -165.2, 62.3, -164.6, 63.2, -161, 64.4, -164.8, 64.6, -166.3, 65.6],
  // Grönland
  [-57, 82.2, -40, 83.6, -25, 83.4, -18, 81.7, -12, 81.4, -19, 79, -19, 75.5, -22, 72.5, -22, 70.4, -26, 68.4, -32, 68.2, -37.5, 65.6, -40.5, 64.7, -43, 60, -45.2, 60.3, -48.5, 61.5, -50.2, 63.9, -51.5, 66.5, -53.2, 68.3, -51, 69.8, -54.8, 70.8, -55.5, 72.7, -57.5, 74.8, -63, 76.2, -68.7, 76.4, -71.3, 77.9, -66.5, 79.3, -62, 81.3],
  // Kanada Arktik adaları: Baffin, Victoria, Banks, Ellesmere, Devon, Melville; Newfoundland
  [-80, 73.7, -72, 71.6, -67.5, 69.5, -62, 66.5, -64.5, 62.9, -71, 63.5, -77.5, 65.2, -73.5, 68, -80, 69.8, -87.5, 73.2],
  [-119.2, 71.5, -114, 72.9, -105.5, 73.1, -101.3, 70.4, -107.5, 68.9, -113.5, 69.4, -117.6, 70.1],
  [-125.5, 72, -121, 74.4, -115.5, 73.6, -119, 71.3, -123.5, 71.1],
  [-90, 77.6, -82, 76.4, -79.5, 77.5, -75.5, 79.3, -64, 82, -72, 83, -90, 81.5, -93, 79.4],
  [-92, 76.5, -81, 76.2, -80, 74.6, -92, 74.6],
  [-117, 76.4, -107, 77.4, -100, 76.3, -106, 74.9, -114, 74.7],
  [-59.3, 47.6, -58, 49.1, -55.4, 51.6, -53.5, 49.4, -52.7, 47.5, -53.6, 46.7, -55.8, 47.1, -57.2, 47.6],
  // Karayipler: Küba, Hispanyola, Jamaika, Porto Riko
  [-84.95, 21.86, -83.1, 22.9, -81.5, 23.15, -79.6, 22.6, -77.5, 21.7, -75.6, 21, -74.15, 20.25, -75.7, 19.9, -77.7, 19.85, -78.6, 21.4, -80.5, 21.8, -82.2, 22.3, -83.4, 22.2],
  [-74.4, 18.45, -72.8, 19.9, -70.5, 19.8, -68.4, 18.6, -68.8, 18.1, -71.4, 17.6, -73.4, 18.2],
  [-78.35, 18.4, -76.25, 18.3, -76.8, 17.85, -77.9, 17.9],
  [-67.25, 18.5, -65.6, 18.4, -65.9, 17.95, -67.2, 17.95],
  // Güney Amerika
  [-77.9, 7.3, -77.4, 8.7, -76.8, 8.6, -75.6, 9.4, -75.5, 10.5, -74.2, 11.2, -72.2, 11.8, -71.7, 12.4, -71.4, 11, -70, 11.6, -68.4, 10.5, -66.1, 10.6, -63.8, 10.7, -61.9, 10.6, -60.7, 8.6, -58.5, 7, -57, 6, -55.2, 5.95, -53.5, 5.6, -52, 4.6, -51.1, 3.8, -50, 1.8, -49.9, 0, -48.6, -0.7, -47.2, -0.6, -44.6, -1.6, -42.5, -2.8, -39.9, -3, -38.5, -3.7, -37.2, -4.9, -35.3, -5.4, -34.8, -7.6, -35.2, -9.3, -36.4, -10.5, -37.2, -11.5, -38.5, -13, -38.9, -15.9, -39.4, -18, -40.3, -20.3, -41, -22, -42, -22.9, -43.2, -23, -44.6, -23.3, -46.3, -24, -48.5, -25.5, -48.7, -28.5, -50.1, -30.4, -51.3, -31.9, -53.4, -33.7, -54.9, -34.9, -56.2, -34.9, -57.8, -34.4, -58.4, -34.6, -57.5, -35.5, -56.8, -36.4, -57.6, -38.1, -59.8, -38.8, -62.2, -38.8, -62.3, -40.6, -65, -41, -64.5, -42.5, -65, -43.3, -67.6, -46, -65.8, -47.8, -67.8, -50, -69, -51.6, -68.4, -52.3, -65.2, -54.8, -67.3, -55.9, -71, -55, -74, -52.5, -75.5, -50, -75.5, -47.5, -74.5, -46, -73.6, -43.5, -73.7, -41.5, -73.2, -39, -73.5, -37, -72.2, -35, -71.6, -33, -71.4, -30, -71.5, -28, -70.6, -25.5, -70.3, -23.2, -70.2, -20.5, -70.3, -18.4, -71.4, -17.3, -72.5, -16.6, -75.2, -15.3, -76.3, -13.8, -77.2, -12.1, -78.6, -9.5, -79.6, -7.6, -81.2, -6, -81.3, -4.6, -80.4, -3.4, -80.9, -2.2, -80.4, -0.6, -80.1, 0.8, -78.9, 1.4, -77.6, 2.6, -77.4, 4, -77.5, 6.5],
  // Afrika (Sina dahil)
  [-5.9, 35.8, -6.8, 34, -8.6, 33.2, -9.8, 31.4, -9.6, 30.4, -11.5, 28.3, -13.2, 27.6, -14.5, 26.1, -16.1, 23.8, -17, 21.4, -16.5, 19.5, -16.1, 18, -16.5, 16.2, -17.5, 14.7, -16.8, 13.3, -16.7, 12.3, -15.5, 11.5, -14.7, 10.6, -13.5, 9.5, -13.2, 8.5, -12.3, 7.4, -10.8, 6.3, -9, 5, -7.5, 4.4, -5.2, 5.1, -3, 5.1, -1.6, 5, 0.1, 5.8, 1.2, 6.1, 2.4, 6.35, 3.4, 6.4, 4.6, 6.1, 5.6, 4.9, 6.1, 4.3, 7, 4.4, 8.3, 4.6, 9.5, 3.9, 9.8, 2.5, 9.4, 0.5, 9, -0.7, 9.8, -2.7, 11.1, -3.9, 12.2, -5.6, 12.3, -6.4, 13.2, -8.8, 13.5, -10.9, 13.6, -12.4, 12.5, -13.9, 11.8, -16, 11.8, -17.6, 13.1, -20.5, 14.5, -22.9, 14.9, -26.6, 16.4, -28.6, 17.4, -30.4, 18.3, -32, 18.4, -34, 20, -34.8, 22.1, -34, 25.6, -34, 27.9, -33, 29.5, -31.4, 31, -29.9, 32.4, -28.6, 32.6, -26, 33.6, -25.3, 35.3, -24, 35.5, -22.1, 35.3, -21.2, 34.8, -19.8, 36.9, -17.9, 38.6, -17.2, 40.6, -15.2, 40.5, -12.5, 40.4, -10.5, 39.6, -8, 39.3, -6.8, 38.8, -5.6, 39.7, -4, 40.9, -2.3, 42.5, -0.4, 44, 1.3, 45.3, 2, 46.8, 3.3, 48.3, 5.4, 49.2, 7.5, 50.4, 9.4, 51.3, 10.4, 51.3, 11.8, 49.3, 11.3, 47.4, 11.1, 45, 10.4, 43.3, 11.5, 43.1, 12.7, 42.3, 13.4, 39.5, 15.6, 38.8, 17.2, 37.6, 18.6, 37.2, 19.6, 36.6, 22, 35.5, 23.9, 34.6, 26, 33.8, 27.2, 32.6, 29.3, 32.5, 29.95, 33.2, 28.6, 34.3, 27.7, 34.9, 29.5, 34.2, 31.3, 32.3, 31.3, 31, 31.6, 29.9, 31.2, 27.2, 31.4, 25.2, 31.6, 24, 32.1, 22.5, 32.8, 20.1, 32.1, 19.6, 30.6, 18.5, 30.4, 15.7, 31.4, 15.1, 32.4, 13.2, 32.9, 11.5, 33.2, 10.1, 33.9, 10.8, 34.7, 11.1, 35.6, 10.5, 36.4, 11.1, 36.9, 10.2, 36.8, 9.9, 37.3, 8.6, 36.9, 7.8, 36.9, 5.1, 36.7, 3.1, 36.8, 1.3, 36.5, -0.6, 35.7, -2.2, 35.1, -2.9, 35.3, -4.4, 35.2, -5.4, 35.9],
  // Madagaskar
  [49.3, -12, 50.4, -15.5, 49.9, -17, 48.9, -20, 47.6, -23.8, 46.9, -25.2, 45.1, -25.6, 43.7, -24.5, 43.3, -22, 44.2, -19.8, 44.4, -16.2, 46.3, -15.8, 47.8, -14, 48.6, -13.3],
  // Avrasya (Portekiz → Fransa → Kuzey Denizi → Baltık → İskandinavya → Rusya Arktik kıyısı → Pasifik → Çin → Hindiçini → Hindistan → Arabistan → Levant → Anadolu → Ege → Adriyatik → İtalya → İspanya)
  [-9, 37, -9.5, 38.7, -8.9, 41, -8.8, 42.2, -9.3, 43, -8, 43.7, -5.7, 43.6, -3.8, 43.4, -1.8, 43.4, -1.2, 44.5, -1.2, 46.1, -2.3, 47.2, -4.4, 47.8, -4.8, 48.4, -3, 48.8, -1.6, 48.7, -1.9, 49.7, -1.2, 49.4, 0.1, 49.5, 1.6, 50.2, 1.6, 50.95, 2.6, 51.1, 3.4, 51.4, 4.2, 52, 4.7, 53, 6.9, 53.4, 8.5, 53.6, 8.6, 54.9, 8.1, 55.5, 8.3, 56.8, 10.6, 57.7, 10.4, 56.6, 10.9, 56.3, 10, 55.7, 10, 54.8, 11, 54, 12.1, 54.2, 13.6, 54.4, 14.2, 53.9, 16.5, 54.5, 18.6, 54.7, 19.5, 54.4, 21.1, 55.7, 21.1, 56.8, 21.6, 57.4, 22.6, 57.7, 23.9, 57.4, 24.4, 58.3, 23.5, 58.6, 23.5, 59.2, 24.7, 59.5, 27.9, 59.4, 30.2, 59.9, 28.8, 60.5, 26.9, 60.4, 25, 60.2, 22.9, 59.9, 21.4, 60.7, 21.4, 62.2, 22.4, 63.4, 25.1, 64.9, 25.4, 65.6, 23.8, 65.8, 22.2, 65.6, 21.1, 64.6, 20.2, 63.6, 18.5, 62.6, 17.3, 61.4, 17.1, 60.4, 18.8, 59.9, 18, 59.3, 16.7, 57.8, 16.4, 56.6, 14.4, 56, 13, 55.4, 12.9, 55.9, 12.1, 56.5, 11.9, 57.7, 11.2, 58.9, 10, 59, 8.1, 58.1, 6.5, 58.1, 5.6, 58.9, 5.1, 60.3, 5, 61.2, 5.2, 62.3, 6.4, 62.8, 8.3, 63.5, 10.3, 64.4, 12.5, 66, 13.6, 67.3, 15.4, 68.2, 16.6, 69, 18.9, 69.8, 21, 70.2, 23.6, 70.6, 25.9, 71.1, 28.3, 70.9, 31, 70.3, 33, 69.3, 36.5, 69, 41, 67.6, 44, 68.4, 46.5, 68.1, 49, 67.9, 53.7, 68.9, 57.5, 68.6, 60.8, 69.8, 64.8, 69.2, 67.9, 69.4, 66.8, 70.8, 68.5, 72.6, 72.8, 72.9, 72.6, 71.5, 73.6, 68.5, 75, 72.6, 77.5, 72.5, 80.5, 73.6, 86.6, 74.8, 95, 76, 104.3, 77.7, 113, 76, 113.5, 73.5, 119, 73.1, 127, 73.6, 130, 71.6, 139, 71.4, 146, 72.3, 151, 71.4, 158, 70.8, 162, 69.7, 168, 69.9, 172, 69.9, 176, 69.7, 180, 69, 180, 65, 178.5, 64.7, 177, 62.5, 173.7, 61.7, 170.3, 60, 166, 60.2, 163.5, 59.9, 162, 58, 163.2, 56.2, 162.3, 54.8, 160, 53, 156.7, 51, 156.2, 53, 156, 57, 157.5, 58, 160, 61, 155, 59.5, 151, 59.5, 145, 59.4, 141.5, 58.6, 137.5, 54.8, 135, 54.5, 141.2, 53.1, 140.5, 50.9, 139.3, 47.9, 137, 45.5, 133.3, 42.8, 131.9, 43.1, 130.7, 42.3, 129.8, 41.7, 127.5, 39.9, 128.5, 38.6, 129.4, 36.5, 129, 35.1, 126.5, 34.4, 126.5, 36.8, 126.6, 37.5, 125.2, 38.1, 124.7, 39.6, 124.4, 40, 121.6, 38.9, 122.2, 40.7, 119.6, 39.9, 117.7, 39, 118.5, 38, 119, 37.2, 121.4, 37.5, 122.6, 37.4, 120.3, 36, 119.3, 34.9, 120.8, 32.4, 121.9, 31, 121.9, 30, 122.1, 29.4, 121.2, 28, 120, 26.6, 119.6, 25.9, 118.2, 24.5, 116.6, 23.3, 114.2, 22.3, 113.5, 22.1, 111.4, 21.5, 110.2, 20.3, 109.7, 21.5, 108.3, 21.6, 106.7, 20.8, 105.9, 19, 106.5, 17.5, 107.6, 16.4, 108.2, 16.05, 109.2, 13.8, 109.3, 11.9, 108.2, 10.9, 106.8, 10.3, 106.4, 9.5, 104.8, 8.6, 104.9, 10.3, 103.5, 10.6, 102.3, 12.2, 100.9, 12.7, 100.5, 13.4, 99.9, 12.6, 99.2, 10.5, 100.3, 8.4, 101.3, 6.9, 102.3, 6.1, 103.4, 4.2, 104.2, 1.4, 103.4, 1.3, 101.3, 2.8, 100.4, 4.6, 100.3, 6.4, 98.3, 8.1, 98.6, 10.1, 98.2, 13.5, 97.6, 16.4, 95.4, 15.8, 94.3, 16.3, 94.5, 18.9, 93.5, 19.8, 92.4, 20.7, 91.9, 22.2, 90.6, 22.2, 89, 21.6, 87, 21.4, 86.7, 20.3, 85, 19.3, 83.3, 17.7, 82.2, 16.6, 80.3, 15.7, 80.3, 13.1, 79.8, 10.3, 78.2, 8.8, 77.5, 8.1, 76.3, 9.9, 75.4, 12.9, 73.8, 15.5, 72.8, 19, 72.6, 21.2, 72.2, 22.2, 70.3, 20.9, 69, 22.3, 70.5, 23, 68.4, 23.6, 67, 24.8, 64, 25.3, 61.6, 25.2, 58.9, 25.6, 57.2, 27.1, 56.3, 27.2, 54.6, 26.6, 52.5, 27.6, 51, 28.6, 50.3, 29.9, 48.5, 29.9, 47.9, 29.4, 48.7, 27.9, 50.1, 26.5, 50.8, 24.8, 51.6, 24.6, 51.2, 26.1, 51.6, 25.4, 52.2, 24.2, 54.4, 24.4, 55.3, 25.3, 56.1, 26.3, 56.4, 24.9, 58.6, 23.6, 59.8, 22.5, 58.4, 20.4, 57.8, 19, 55.6, 17.6, 54, 16.9, 52.2, 15.6, 49.1, 14.5, 45, 12.8, 43.4, 12.6, 42.7, 15.5, 41.7, 17, 39.2, 21.5, 38, 24.1, 36.6, 25.8, 35.2, 28, 34.9, 29.5, 34.3, 31.4, 34.9, 32.8, 35.5, 33.9, 35.8, 35.5, 36, 36.4, 36.2, 36.6, 35.6, 36.6, 34.6, 36.8, 33.9, 36.3, 32.5, 36.1, 30.7, 36.9, 29.7, 36.3, 28.2, 36.7, 27.4, 37, 27.2, 37.9, 26.4, 38.4, 26.9, 39.6, 26.2, 39.5, 26.3, 40.1, 26.2, 40.4, 26, 40.6, 25.1, 40.9, 24.1, 40.8, 22.9, 40.6, 22.6, 40.2, 22.9, 39.4, 23.2, 38.6, 24.1, 38.2, 23.7, 37.9, 23, 37.3, 22.5, 36.4, 21.7, 36.8, 21.3, 37.7, 21.1, 38.3, 20.8, 39, 20.2, 39.6, 19.4, 40.4, 19.5, 41.3, 19, 42.1, 18.1, 42.6, 16.4, 43.5, 15.2, 44.2, 14.4, 45.3, 13.6, 44.8, 13.8, 45.6, 12.4, 45.4, 12.3, 44.8, 12.6, 44, 13.5, 43.6, 14.3, 42.4, 15.2, 41.9, 16.2, 41.9, 16.9, 41.1, 18, 40.6, 18.5, 40.1, 18.4, 39.8, 17.2, 40.4, 16.6, 39.6, 17.1, 39, 16.5, 38.4, 15.7, 37.9, 15.6, 38.3, 16.1, 38.9, 15.7, 40, 14.9, 40.3, 14.3, 40.8, 13.7, 41.2, 12.4, 41.7, 11.2, 42.4, 10.5, 42.9, 10.3, 43.5, 9.8, 44.1, 8.9, 44.4, 8, 43.9, 7.3, 43.7, 6.6, 43.1, 5.4, 43.3, 4.6, 43.4, 3.5, 43.3, 3.2, 42.4, 2.2, 41.4, 0.9, 41, 0, 39.8, -0.3, 39.5, 0.2, 38.7, -0.5, 38.2, -0.9, 37.6, -1.9, 36.9, -2.4, 36.8, -4.4, 36.7, -5.4, 36.1, -6.3, 36.5, -7.4, 37.2, -8, 37],
  // Çukotka'nın tarih çizgisinin ötesindeki ucu
  [-180, 68.9, -174.5, 67.3, -171.5, 66.9, -169.7, 66.1, -172.5, 64.6, -175, 65.3, -180, 65],
  // Britanya, İrlanda, İzlanda
  [-5.7, 50.05, -3.5, 50.3, -1.8, 50.6, 0.2, 50.75, 1.4, 51.2, 1.7, 52.6, 0.3, 53.5, -0.2, 54.2, -1.2, 54.7, -1.6, 55.6, -2.5, 56, -1.8, 57.6, -3.3, 58.6, -5, 58.6, -5.7, 57.5, -6.2, 56.6, -5.6, 55.3, -4.9, 55, -3.4, 54.9, -3, 54.2, -3.2, 53.4, -4.6, 53.3, -4.1, 52.8, -4.4, 52, -5.3, 51.7, -4.2, 51.6, -3, 51.5, -4.5, 51.1],
  [-6, 54, -5.5, 54.5, -6.2, 55.2, -7.3, 55.3, -8.5, 54.6, -10, 54.2, -9.9, 53.4, -9.4, 52.6, -10.4, 52, -9.6, 51.5, -8.3, 51.8, -6.4, 52.2, -6, 53],
  [-24.4, 65.5, -22, 66.4, -16, 66.5, -13.6, 65.1, -14.5, 64.4, -18, 63.4, -20.5, 63.7, -22.7, 63.9, -24, 64.8],
  // Akdeniz adaları: Korsika, Sardinya, Sicilya, Girit, Kıbrıs
  [9.4, 43, 9.6, 42.2, 9.2, 41.4, 8.6, 41.9, 8.6, 42.6],
  [9.2, 41.2, 9.8, 40.5, 9.6, 39.2, 8.5, 38.9, 8.4, 40.4, 8.2, 40.9],
  [12.4, 38.1, 15.6, 38.3, 15.1, 36.7, 14.4, 36.8, 12.5, 37.6],
  [23.5, 35.3, 26.3, 35.3, 26.2, 35, 24.7, 34.9, 23.5, 35.5],
  [32.3, 35.1, 32.9, 35.4, 34.6, 35.7, 33.9, 35.1, 34.1, 34.9, 33, 34.6, 32.3, 34.9],
  // Svalbard, Novaya Zemlya
  [11.5, 78.6, 15, 80, 20, 80.2, 26, 79.5, 21, 78.2, 17, 76.6, 14, 77.5],
  [52, 71.4, 56, 73.5, 61, 76, 68.5, 76.8, 67, 75.8, 59, 73.9, 56, 71],
  // Sri Lanka, Japonya (Honşu, Kyuşu, Şikoku, Hokkaido), Sahalin, Tayvan, Hainan
  [79.8, 8, 80.1, 9.8, 81.3, 8.5, 81.9, 7.3, 80.6, 5.9, 79.9, 6.8],
  [131.1, 34.4, 132.5, 35.5, 133.2, 35.6, 134.5, 35.7, 136, 35.8, 136.8, 37.2, 137.4, 36.9, 138.6, 37.8, 139.5, 38.4, 139.9, 40.6, 140.6, 41.2, 141.5, 41.4, 141.5, 40.4, 142.1, 39.6, 141.6, 38.4, 141, 37.9, 140.9, 36.9, 140.6, 35.7, 139.8, 35.1, 139.1, 34.7, 138.6, 34.7, 137.4, 34.6, 136.8, 34.3, 135.8, 33.5, 135.1, 34.2, 134.2, 34.6, 133.2, 34.4, 132.2, 33.9],
  [130.9, 33.9, 131.9, 33.2, 131.4, 31.4, 130.6, 31, 130.2, 31.4, 129.7, 32.8, 129.8, 33.4, 130.4, 33.6],
  [132.5, 33.4, 132.9, 34.1, 134.7, 34.2, 134.7, 33.8, 134.2, 33.2, 133.1, 32.7],
  [140.5, 41.4, 139.8, 42.6, 141.4, 43.3, 141.6, 45.4, 142.9, 44.6, 145.3, 44.3, 145.8, 43.4, 144.4, 42.9, 143.3, 42, 141.1, 41.8, 140.4, 42.5],
  [142.6, 54.3, 143.2, 52.9, 143.6, 49.3, 144.2, 49, 143.1, 46.7, 142, 46.1, 142.2, 47.8, 142.1, 51.6, 141.8, 53.5],
  [121.6, 25.3, 122, 25, 121.8, 24, 121.6, 23.3, 120.9, 22, 120.1, 23.1, 120.2, 24, 121, 25.1],
  [110.5, 20.1, 111, 19.6, 110.1, 18.4, 109.3, 18.3, 108.6, 19.2, 109.2, 19.9],
  // Filipinler: Luzon, Mindanao, Visayas, Palawan
  [120.6, 18.5, 122.2, 18.5, 122.1, 17.1, 121.4, 15.8, 122, 14.1, 123.9, 13.8, 124, 12.6, 123.3, 13, 122.6, 13.9, 121.7, 14.1, 120.6, 14.1, 120.5, 14.8, 119.8, 15.9, 120.4, 16.4, 120.4, 17.6],
  [125.6, 9.8, 126.6, 7.3, 126, 6.3, 125.4, 5.6, 124.2, 6.2, 122.1, 6.9, 122.4, 7.8, 123.6, 7.9, 124.2, 8.6, 125.2, 9],
  [124.4, 12.6, 125.7, 11.2, 125.1, 10, 123.9, 9.8, 122.9, 9.6, 122, 10.6, 122.1, 11.8, 123.2, 12.1],
  [117.2, 8.4, 119.6, 11.1, 119.4, 10.4, 117.6, 8.3],
  // Endonezya: Sumatra, Cava, Borneo, Sulawesi, Yeni Gine, Timor, Küçük Sunda adaları
  [95.2, 5.6, 97.6, 5.2, 100, 2.6, 103.7, 1, 104.6, -1.6, 106, -3, 105.9, -5.8, 104.5, -5.9, 102.3, -4, 101, -2.6, 100.3, -0.9, 98.6, 1.7, 97.5, 2.9, 96, 4.4],
  [105.2, -6.8, 106.8, -6.1, 108.6, -6.7, 110.7, -6.5, 112.7, -6.9, 114.4, -7.7, 114.6, -8.7, 112.5, -8.4, 110.4, -8.1, 108.5, -7.8, 106.4, -7.4, 105.5, -6.9],
  [109.6, 2.1, 111.2, 2.6, 113, 3.2, 114.2, 4.6, 115.4, 5.2, 116.8, 6.9, 117.7, 6.4, 119.2, 5.1, 118, 4.3, 117.7, 3, 118.9, 1, 117.9, 0.7, 117.5, -0.8, 116.6, -1.5, 116.2, -3.6, 114.5, -4.1, 113.1, -3.3, 111.3, -3, 110.2, -2.9, 110, -1.2, 109.1, -0.3, 109, 1.2],
  [120, 0.6, 124.9, 1.6, 125.2, 1.4, 123.5, 0.4, 121.3, 0.5, 120.6, -0.8, 121.7, -1.1, 123.4, -0.9, 122.2, -1.9, 121.2, -3, 122.5, -4.7, 122.6, -5.5, 120.4, -5.6, 120.3, -2.8, 119.4, -3.5, 118.8, -2.6, 119.7, 0],
  [130.9, -1.4, 132.2, -0.5, 134.1, -0.9, 135, -3.3, 137.6, -1.6, 140.9, -2.6, 144.5, -3.8, 145.8, -5.2, 147.6, -6.1, 147.9, -8.1, 150.8, -10.3, 149.7, -10.5, 147.3, -10.1, 146.1, -8.1, 144.1, -7.8, 143.3, -9.2, 142.2, -9.2, 141, -9.1, 140, -8.1, 138.6, -8.4, 138, -7, 137.8, -5.2, 135.2, -4.4, 134.2, -3.9, 133.6, -4.1, 132.5, -2.8, 131.9, -2.9, 132.3, -2.2],
  [123.5, -10.3, 125.1, -9.4, 127.3, -8.4, 126.7, -8.6, 125.1, -9.1, 124.1, -10],
  [115.2, -8.1, 116.2, -8.4, 118.9, -8.3, 121.3, -8.4, 122.9, -8.2, 122.9, -8.7, 121.2, -8.9, 119, -8.8, 116.4, -8.9, 115.1, -8.8],
  // Avustralya, Tazmanya, Yeni Zelanda (Kuzey, Güney)
  [142.5, -10.7, 141.6, -12.6, 141.5, -15, 141.4, -16.5, 140.6, -17.6, 139.3, -17.4, 137.9, -16.3, 135.8, -15.1, 136.7, -13.2, 136.8, -12.2, 135.1, -12.2, 132.6, -11.5, 131.1, -12.2, 130.1, -13.2, 129.4, -14.9, 128.1, -14.9, 127.2, -13.9, 125.9, -14.4, 124.4, -16.4, 123.5, -17.1, 122.2, -18.1, 121.1, -19.5, 118.6, -20.3, 116.7, -20.6, 114.6, -21.8, 113.6, -24.5, 113.4, -26.2, 114.1, -27.7, 115, -30, 115.7, -32, 115.1, -34.3, 116.6, -35, 118, -35, 119.9, -34, 121.9, -33.9, 123.6, -33.9, 125.9, -32.3, 128.9, -31.7, 131.2, -31.5, 132.8, -32.1, 134.2, -32.6, 135.3, -34.6, 136.1, -33.9, 137.5, -33, 137.8, -34.4, 138.5, -34.9, 138.3, -35.6, 139.6, -36.5, 140.7, -38, 142.4, -38.4, 144.4, -38.1, 145.4, -38.5, 146.4, -39.1, 147.6, -37.9, 149.9, -37.5, 150.1, -36.2, 150.8, -34.8, 151.2, -33.9, 152.5, -32.4, 153.1, -30.4, 153.6, -28.2, 153.1, -27.5, 153.1, -25.9, 152.4, -24.8, 150.8, -23.4, 149.4, -21.8, 148.7, -20.3, 146.9, -19.3, 146.1, -17.9, 145.4, -16.4, 145.3, -15, 144.2, -14.3, 143.6, -13.4, 143.1, -11.9, 142.8, -10.8],
  [144.7, -40.7, 148.3, -40.9, 148.3, -42.2, 147.1, -43.6, 145.9, -43.6, 145.2, -42.2],
  [172.7, -34.4, 174.5, -35.8, 175.9, -37.5, 178.5, -37.7, 177.9, -39.1, 176.9, -39.5, 176.2, -41.3, 175.2, -41.6, 174.6, -41.2, 174.8, -39.9, 173.8, -39.2, 174.6, -37.5, 173.3, -35.5],
  [172.7, -40.5, 174.3, -41.7, 173.3, -43.2, 172.8, -43.6, 171.2, -44.4, 170.6, -45.9, 169.2, -46.6, 166.5, -46.1, 166.7, -45.3, 168.4, -44, 170.8, -42.6, 171.6, -41.7, 172.1, -40.8],
  // Antarktika
  [-180, -90, 180, -90, 180, -78, 165, -72, 150, -67.5, 120, -66.2, 90, -66.5, 60, -67.2, 30, -69.5, 0, -70.2, -30, -74, -45, -77.5, -57, -63.5, -62, -65.5, -68, -70, -80, -73.4, -100, -73.6, -130, -74.5, -150, -77, -165, -78.5, -180, -78],
];
// Su (karanın üstüne boyanır): Karadeniz, Azak, Hazar
const WATER = [
  [28.9, 41.3, 30.5, 41.2, 31.4, 41.2, 33.3, 42, 35.2, 42.05, 36.3, 41.3, 37.9, 41.1, 39.7, 41, 41.5, 41.5, 41.6, 42.6, 40.2, 43.3, 39.1, 44.1, 37.8, 44.7, 36.6, 45.2, 35.4, 45.1, 34.1, 44.4, 33.5, 44.6, 32.6, 45.4, 33.6, 45.9, 31.6, 46.6, 30.7, 46.5, 29.7, 45.3, 28.7, 44.3, 28, 43.2, 27.7, 42.6, 28, 41.6],
  [35.3, 45.4, 36.6, 45.4, 38.3, 46.5, 39.2, 47.2, 37.6, 47.1, 35.6, 46.4, 34.9, 46.1],
  [47.5, 45.6, 49.2, 46.4, 51.3, 47, 53.1, 46.9, 53.2, 45.3, 51.3, 44.5, 51.3, 43.2, 52.7, 42, 53, 40.7, 53.9, 38.8, 53.9, 37.3, 51.5, 36.8, 50.2, 37.4, 49, 38.4, 49.4, 39.4, 49.9, 40.3, 50.4, 40.4, 49.5, 41.2, 48.6, 41.8, 47.5, 43, 47.3, 44.4, 46.8, 44.7],
];
// Okyanustaki küçük ada ülkeleri (haritada kara noktası olarak): boylam, enlem, yarıçap (derece)
const ISLE = [[14.4, 35.9, 0.5], [73.5, 4.2, 0.8], [57.5, -20.2, 0.9], [55.5, -4.6, 0.8], [43.3, -11.7, 0.8], [-23.6, 15, 0.9], [6.7, 0.3, 0.6], [8.8, 3.6, 0.6], [-77.4, 25, 0.9], [-76, 24, 0.8], [-59.6, 13.1, 0.5], [-61.3, 10.5, 0.8], [-61.7, 12.1, 0.4], [-61, 14, 0.4], [-61.4, 15.4, 0.4], [-62.7, 17.3, 0.4], [-61.2, 13.2, 0.4], [-61.8, 17.1, 0.4], [-171.8, -13.8, 0.6], [-175.2, -21.1, 0.6], [168.3, -17, 1.2], [166.9, -0.5, 0.4], [179.2, -8.5, 0.4], [178.4, -17.8, 1.2], [134.6, 7.5, 0.5], [171.4, 7.1, 0.5], [173, 1.4, 0.5], [160, -9.6, 1.4], [158.2, 6.9, 0.5], [50.6, 26.1, 0.4], [-155.5, 19.6, 0.8], [-157.9, 21.4, 0.5]];
// Başkentler: ülke → [enlem, boylam, ISO-3166 kodu (bayrak için)]
const CAPS = {
  'Türkiye': [39.93, 32.86, 'TR'], 'Fransa': [48.86, 2.35, 'FR'], 'Almanya': [52.52, 13.4, 'DE'], 'İtalya': [41.9, 12.5, 'IT'], 'İspanya': [40.42, -3.7, 'ES'], 'Japonya': [35.68, 139.69, 'JP'], 'Çin': [39.9, 116.4, 'CN'], 'Rusya': [55.76, 37.62, 'RU'], 'Kanada': [45.42, -75.7, 'CA'], 'Brezilya': [-15.79, -47.88, 'BR'], 'Avustralya': [-35.28, 149.13, 'AU'], 'Mısır': [30.04, 31.24, 'EG'], 'Yunanistan': [37.98, 23.73, 'GR'], 'Portekiz': [38.72, -9.14, 'PT'], 'Hollanda': [52.37, 4.9, 'NL'], 'Belçika': [50.85, 4.35, 'BE'], 'İsviçre': [46.95, 7.45, 'CH'], 'Avusturya': [48.21, 16.37, 'AT'], 'Polonya': [52.23, 21.01, 'PL'], 'Norveç': [59.91, 10.75, 'NO'],
  'İsveç': [59.33, 18.07, 'SE'], 'Finlandiya': [60.17, 24.94, 'FI'], 'Arjantin': [-34.6, -58.38, 'AR'], 'Meksika': [19.43, -99.13, 'MX'], 'Güney Kore': [37.57, 126.98, 'KR'], 'Hindistan': [28.61, 77.21, 'IN'], 'Suudi Arabistan': [24.71, 46.68, 'SA'], 'İran': [35.69, 51.39, 'IR'], 'Irak': [33.31, 44.36, 'IQ'], 'Azerbaycan': [40.41, 49.87, 'AZ'], 'Gürcistan': [41.72, 44.79, 'GE'], 'Ukrayna': [50.45, 30.52, 'UA'], 'Macaristan': [47.5, 19.04, 'HU'], 'Çekya': [50.08, 14.44, 'CZ'], 'Romanya': [44.43, 26.1, 'RO'], 'Bulgaristan': [42.7, 23.32, 'BG'], 'Danimarka': [55.68, 12.57, 'DK'], 'İrlanda': [53.35, -6.26, 'IE'], 'Birleşik Krallık': [51.51, -0.13, 'GB'], 'ABD': [38.91, -77.04, 'US'],
  'Küba': [23.11, -82.37, 'CU'], 'Peru': [-12.05, -77.04, 'PE'], 'Şili': [-33.45, -70.67, 'CL'], 'Tayland': [13.76, 100.5, 'TH'], 'Endonezya': [-6.21, 106.85, 'ID'], 'Güney Afrika': [-25.75, 28.19, 'ZA'], 'Kenya': [-1.29, 36.82, 'KE'], 'Fas': [34.02, -6.83, 'MA'], 'Cezayir': [36.75, 3.06, 'DZ'], 'Pakistan': [33.68, 73.05, 'PK'], 'Afganistan': [34.56, 69.21, 'AF'], 'Bangladeş': [23.81, 90.41, 'BD'], 'Nepal': [27.72, 85.32, 'NP'], 'Vietnam': [21.03, 105.85, 'VN'], 'Filipinler': [14.6, 120.98, 'PH'], 'Malezya': [3.14, 101.69, 'MY'], 'Kuzey Kore': [39.04, 125.76, 'KP'], 'Moğolistan': [47.89, 106.91, 'MN'], 'Özbekistan': [41.3, 69.24, 'UZ'], 'Türkmenistan': [37.96, 58.33, 'TM'],
  'Kırgızistan': [42.87, 74.59, 'KG'], 'Ürdün': [31.95, 35.93, 'JO'], 'Lübnan': [33.89, 35.5, 'LB'], 'Suriye': [33.51, 36.29, 'SY'], 'Katar': [25.29, 51.53, 'QA'], 'Umman': [23.59, 58.41, 'OM'], 'Yemen': [15.37, 44.19, 'YE'], 'Etiyopya': [9.03, 38.74, 'ET'], 'Nijerya': [9.06, 7.49, 'NG'], 'Gana': [5.6, -0.19, 'GH'], 'Senegal': [14.72, -17.47, 'SN'], 'Tunus': [36.81, 10.18, 'TN'], 'Libya': [32.89, 13.19, 'LY'], 'Sudan': [15.5, 32.56, 'SD'], 'Tanzanya': [-6.16, 35.75, 'TZ'], 'Kolombiya': [4.71, -74.07, 'CO'], 'Venezuela': [10.48, -66.9, 'VE'], 'Ekvador': [-0.18, -78.47, 'EC'], 'Uruguay': [-34.9, -56.16, 'UY'], 'Paraguay': [-25.26, -57.58, 'PY'],
  'Yeni Zelanda': [-41.29, 174.78, 'NZ'], 'Hırvatistan': [45.81, 15.98, 'HR'], 'Sırbistan': [44.79, 20.45, 'RS'], 'Bosna Hersek': [43.86, 18.41, 'BA'], 'Slovakya': [48.15, 17.11, 'SK'], 'Slovenya': [46.06, 14.51, 'SI'], 'Estonya': [59.44, 24.75, 'EE'], 'Letonya': [56.95, 24.11, 'LV'], 'Litvanya': [54.69, 25.28, 'LT'], 'İzlanda': [64.15, -21.94, 'IS'], 'Arnavutluk': [41.33, 19.82, 'AL'], 'Kuzey Makedonya': [42, 21.43, 'MK'], 'Karadağ': [42.44, 19.26, 'ME'], 'Lüksemburg': [49.61, 6.13, 'LU'], 'Monako': [43.74, 7.42, 'MC'], 'Malta': [35.9, 14.51, 'MT'], 'Kıbrıs': [35.19, 33.38, 'CY'], 'Belarus': [53.9, 27.56, 'BY'], 'Moldova': [47.01, 28.86, 'MD'], 'Kosova': [42.66, 21.17, 'XK'],
  'Andorra': [42.51, 1.52, 'AD'], 'San Marino': [43.94, 12.45, 'SM'], 'Lihtenştayn': [47.14, 9.52, 'LI'], 'Vatikan': [41.9, 12.45, 'VA'], 'Ermenistan': [40.18, 44.51, 'AM'], 'Kazakistan': [51.17, 71.45, 'KZ'], 'Tacikistan': [38.56, 68.79, 'TJ'], 'Sri Lanka': [6.93, 79.86, 'LK'], 'Myanmar': [19.76, 96.08, 'MM'], 'Kamboçya': [11.56, 104.93, 'KH'], 'Laos': [17.98, 102.63, 'LA'], 'Singapur': [1.35, 103.82, 'SG'], 'Brunei': [4.9, 114.94, 'BN'], 'Maldivler': [4.18, 73.51, 'MV'], 'Butan': [27.47, 89.64, 'BT'], 'Tayvan': [25.03, 121.57, 'TW'], 'Papua Yeni Gine': [-9.44, 147.18, 'PG'], 'Fiji': [-18.14, 178.44, 'FJ'], 'Kuveyt': [29.38, 47.98, 'KW'], 'Bahreyn': [26.23, 50.59, 'BH'],
  'Birleşik Arap Emirlikleri': [24.45, 54.38, 'AE'], 'Moritanya': [18.09, -15.98, 'MR'], 'Mali': [12.64, -8, 'ML'], 'Nijer': [13.51, 2.11, 'NE'], 'Çad': [12.13, 15.06, 'TD'], 'Kamerun': [3.85, 11.5, 'CM'], 'Orta Afrika Cumhuriyeti': [4.39, 18.56, 'CF'], 'Gabon': [0.42, 9.47, 'GA'], 'Kongo': [-4.27, 15.27, 'CG'], 'Kongo Demokratik Cumhuriyeti': [-4.44, 15.27, 'CD'], 'Angola': [-8.84, 13.23, 'AO'], 'Zambiya': [-15.39, 28.32, 'ZM'], 'Zimbabve': [-17.83, 31.05, 'ZW'], 'Mozambik': [-25.97, 32.57, 'MZ'], 'Madagaskar': [-18.88, 47.51, 'MG'], 'Namibya': [-22.56, 17.08, 'NA'], 'Botsvana': [-24.65, 25.91, 'BW'], 'Uganda': [0.35, 32.58, 'UG'], 'Ruanda': [-1.94, 30.06, 'RW'], 'Burundi': [-3.43, 29.93, 'BI'],
  'Somali': [2.05, 45.32, 'SO'], 'Cibuti': [11.59, 43.15, 'DJ'], 'Eritre': [15.32, 38.93, 'ER'], 'Güney Sudan': [4.85, 31.58, 'SS'], 'Fildişi Sahili': [6.83, -5.29, 'CI'], 'Liberya': [6.3, -10.8, 'LR'], 'Sierra Leone': [8.48, -13.23, 'SL'], 'Gine': [9.64, -13.58, 'GN'], 'Gambiya': [13.45, -16.58, 'GM'], 'Togo': [6.13, 1.22, 'TG'], 'Benin': [6.5, 2.6, 'BJ'], 'Burkina Faso': [12.37, -1.52, 'BF'], 'Malavi': [-13.96, 33.79, 'MW'], 'Esvatini': [-26.31, 31.14, 'SZ'], 'Lesotho': [-29.31, 27.48, 'LS'], 'Mauritius': [-20.16, 57.5, 'MU'], 'Seyşeller': [-4.62, 55.45, 'SC'], 'Bolivya': [-16.5, -68.15, 'BO'], 'Panama': [8.98, -79.52, 'PA'], 'Kosta Rika': [9.93, -84.08, 'CR'],
  'Nikaragua': [12.11, -86.24, 'NI'], 'Honduras': [14.07, -87.19, 'HN'], 'Guatemala': [14.63, -90.51, 'GT'], 'El Salvador': [13.69, -89.22, 'SV'], 'Belize': [17.25, -88.77, 'BZ'], 'Jamaika': [17.97, -76.79, 'JM'], 'Haiti': [18.59, -72.31, 'HT'], 'Dominik Cumhuriyeti': [18.49, -69.93, 'DO'], 'Bahamalar': [25.05, -77.36, 'BS'], 'Trinidad ve Tobago': [10.66, -61.51, 'TT'], 'Surinam': [5.85, -55.2, 'SR'], 'Guyana': [6.8, -58.16, 'GY'], 'Barbados': [13.1, -59.62, 'BB'], 'Samoa': [-13.83, -171.76, 'WS'], 'Tonga': [-21.14, -175.2, 'TO'], 'Vanuatu': [-17.73, 168.32, 'VU'], 'Nauru': [-0.55, 166.92, 'NR'], 'Tuvalu': [-8.52, 179.2, 'TV'], 'Doğu Timor': [-8.56, 125.57, 'TL'], 'Komorlar': [-11.7, 43.26, 'KM'],
  'Yeşil Burun Adaları': [14.93, -23.51, 'CV'], 'Ekvator Ginesi': [3.75, 8.78, 'GQ'], 'Sao Tome ve Principe': [0.34, 6.73, 'ST'], 'Gine-Bissau': [11.86, -15.6, 'GW'], 'Antigua ve Barbuda': [17.12, -61.85, 'AG'], 'Grenada': [12.05, -61.75, 'GD'], 'Saint Lucia': [14.01, -60.99, 'LC'], 'Dominika': [15.3, -61.39, 'DM'], 'Saint Kitts ve Nevis': [17.3, -62.72, 'KN'], 'Saint Vincent ve Grenadinler': [13.16, -61.22, 'VC'], 'Palau': [7.5, 134.62, 'PW'], 'Marshall Adaları': [7.09, 171.38, 'MH'], 'Kiribati': [1.45, 173, 'KI'], 'Solomon Adaları': [-9.43, 159.95, 'SB'], 'Mikronezya': [6.92, 158.16, 'FM'],
};
const flagOf = (iso) => (iso && iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '');
// Eşdeğer haritayı çiz (2:1): okyanus, enlem/boylam çizgileri, kara (enleme göre renk), kıyı çizgisi, su birikintileri, ada noktaları
function paintWorld(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
  const oc = g.createLinearGradient(0, 0, 0, H);
  oc.addColorStop(0, '#1e5f9e'); oc.addColorStop(0.5, '#2f86cf'); oc.addColorStop(1, '#1e5f9e');
  g.fillStyle = oc; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = Math.max(1, W / 1024);
  for (let lon = -150; lon < 180; lon += 30) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), H); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); g.stroke(); }
  const path = (P) => { g.moveTo(X(P[0]), Y(P[1])); for (let k = 2; k < P.length; k += 2) g.lineTo(X(P[k]), Y(P[k + 1])); g.closePath(); };
  const landPath = () => { g.beginPath(); LAND.forEach(path); ISLE.forEach(([lo, la, r]) => { g.moveTo(X(lo + r), Y(la)); g.ellipse(X(lo), Y(la), (r / 360) * W, (r / 180) * H, 0, 0, Math.PI * 2); }); };
  // sığ su parıltısı
  g.save(); landPath(); g.lineWidth = W / 140; g.strokeStyle = 'rgba(120,210,255,.45)'; g.lineJoin = 'round'; g.stroke(); g.restore();
  // kara: enleme göre renk bandı (kutuplarda buz, orta enlemlerde yeşil, dönencelerde kum)
  g.save(); landPath(); g.clip('nonzero');
  const lg = g.createLinearGradient(0, 0, 0, H);
  [[90, '#f4f8ff'], [72, '#eef3f6'], [64, '#a7b98a'], [55, '#6fae5a'], [40, '#79b45c'], [33, '#c9b56d'], [24, '#e2c983'], [15, '#a9b85f'], [6, '#4f9e45'], [-6, '#4a9a42'], [-15, '#8fae58'], [-24, '#d9bf78'], [-32, '#b9b26a'], [-42, '#7aa95b'], [-52, '#9fae86'], [-62, '#e9eff5'], [-90, '#f4f8ff']].forEach(([lat, c]) => lg.addColorStop((90 - lat) / 180, c));
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.restore();
  g.save(); g.beginPath(); WATER.forEach(path); g.fillStyle = '#2f86cf'; g.fill(); g.restore();
  g.save(); landPath(); g.lineWidth = Math.max(1, W / 700); g.strokeStyle = 'rgba(40,70,40,.55)'; g.lineJoin = 'round'; g.stroke(); g.restore();
  g.save(); g.beginPath(); WATER.forEach(path); g.lineWidth = Math.max(1, W / 900); g.strokeStyle = 'rgba(40,70,40,.4)'; g.stroke(); g.restore();
}

const OPT = [
  { hex: '#ff5ea8', l: 'A' },
  { hex: '#ffb627', l: 'B' },
  { hex: '#2ec4ff', l: 'C' },
  { hex: '#7ed957', l: 'D' },
];
const rgb3 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const OPTC = OPT.map((o) => o.hex);
const OPT3 = OPTC.map((h) => new Float32Array(rgb3(h)));
const GOLD3 = new Float32Array([1, 0.82, 0.3]), GREEN3 = new Float32Array([0.24, 0.9, 0.45]), RED3 = new Float32Array([1, 0.3, 0.32]);
const WHITE3 = new Float32Array([1, 1, 1]), OFF3 = new Float32Array([0.1, 0.17, 0.25]), CYAN3 = new Float32Array([0.42, 0.88, 1]), SKY3 = new Float32Array([0.45, 0.72, 1]);
const MEDALC = ['#ffd23f', '#dfe3f0', '#f0b88a'];
const DEG = Math.PI / 180;
// ortadaki öğelerin ölçüleri (ölçek 1'de; masa küçükse ya da yatay ekranda birlikte küçülür: this.ss)
const GR = 0.4, GY = 0.7;                       // küre: yarıçap, merkezin masadan yüksekliği
const ORB = 0.68, LANE = 0.085;                 // uçak yörüngesi: yarıçap, şeritler arası
const BASE_R = 0.56, PED_R = 0.37, LENS_R = 0.17;  // kaide: taban, gövde, ışık merceği
const RING_N = 24, RING_R = 0.465;              // süre halkası (kaidenin tabanında)
const PIN_L = 0.17, PIN_HR = 0.036;             // iğne: boy, baş yarıçapı
const PLANE_S = 1.25;
const PIN_UP = 0.36;                             // gösterilen yer kameranın biraz üstünde dursun: iğne ekranda yukarı bakar
const LBL_W = 0.62, LBL_H = 0.31;               // etiket (doku 512×256)
const VERD_T = 0.9;                              // açılışta sonucun gösterildiği an (sn)
const EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const F = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";
const WORLD_L = { sunC: [0.5, 0.5, 0.56], sky: [0.42, 0.46, 0.54], gnd: [0.15, 0.17, 0.22], night: 1, warm: [0.9, 0.92, 1], lampC: [1.3, 1.22, 1.12], fogR: [30, 90], stars: 0, glowS: 0.3 };

const STYLE = `
#ky.byr .msg{top:12%}
#ky.byr .by-box{width:min(560px,96vw);border-radius:22px;border:4px solid var(--ink);box-shadow:4px 4px 0 var(--ink);background:#f2faff;color:var(--ink);padding:8px 9px 9px;text-align:center}
#ky.byr .by-q{border-radius:16px;background:#0f3d5a;color:#fff;padding:5px 10px 7px;border:3px solid var(--ink)}
#ky.byr .by-q small{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;font-weight:900;letter-spacing:.07em;opacity:.95}
#ky.byr .by-q small .st{background:#ffd23f;color:#1c1633;border-radius:99px;padding:0 8px;letter-spacing:.03em}
#ky.byr .by-q .big{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px;font:900 clamp(22px,6.4vw,29px)/1.12 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;overflow-wrap:anywhere}
#ky.byr .by-q .big .fl{font:400 1.05em/1 ${EMO_FONT}}
#ky.byr .by-q .sub{font-size:13px;font-weight:800;color:#bfe6ff;margin-top:1px}
#ky.byr .by-four{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
#ky.byr .by-four.one{grid-template-columns:1fr;gap:6px}
#ky.byr .by-o{position:relative;display:flex;align-items:stretch;min-width:0;min-height:48px;border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);padding:0;font-weight:900;font-size:clamp(14px,4vw,16.5px);line-height:1.15;background:var(--sc);color:#1c1633;text-align:left;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow-wrap:anywhere;transition:opacity .2s,filter .2s}
#ky.byr .by-four.one .by-o{min-height:40px;font-size:clamp(13.5px,3.8vw,15.5px)}
#ky.byr .by-o .lt{flex:0 0 auto;display:grid;place-items:center;width:32px;border-right:2.5px dashed rgba(28,22,51,.55);border-radius:11px 0 0 11px;background:rgba(255,255,255,.32);font-size:16px}
#ky.byr .by-o .tx{flex:1;min-width:0;display:flex;align-items:center;gap:6px;padding:5px 8px}
#ky.byr .by-o .tx .fl{flex:0 0 auto;font:400 1.15em/1 ${EMO_FONT}}
#ky.byr .by-o .tg{position:absolute;right:-5px;top:-10px;background:#1c1633;color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 0 0 2px #fff}
#ky.byr .by-o .dots{display:flex;flex-wrap:wrap;gap:2px;max-width:46px;justify-content:flex-end;align-self:center;flex:0 0 auto;margin-right:6px}
#ky.byr .by-o .dots i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.byr .by-o:active:not([disabled]){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.byr .by-o.on{outline:4px solid #1c1633;outline-offset:2px;transform:translateY(-2px)}
#ky.byr .by-o.off{filter:saturate(.35) brightness(1.08);opacity:.62}
#ky.byr .by-o.ok{outline:4px solid #2fbf71;outline-offset:2px;transform:translateY(-2px)}
#ky.byr .by-o.ok .tg{background:#2fbf71;color:#1c1633}
#ky.byr .by-o.no .tg{background:#d7263d}
#ky.byr .by-o.dim{filter:saturate(.4) brightness(1.05);opacity:.5}
#ky.byr .by-ft{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-size:12.5px;font-weight:800;min-height:24px}
#ky.byr .by-ft .n{background:#0f3d5a;color:#fff;border-radius:99px;padding:2px 9px}
#ky.byr .by-ft .z{opacity:.8}
#ky.byr .by-ft .z b{color:#c21f33}
#ky.byr .by-b{border:3px solid var(--ink);border-radius:13px;box-shadow:3px 3px 0 var(--ink);padding:6px 12px;font-weight:900;font-size:14px;background:#ffd23f;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
#ky.byr .by-b:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
#ky.byr .by-tm{height:6px;border-radius:9px;background:rgba(127,127,127,.25);overflow:hidden;margin-top:7px}
#ky.byr .by-tm i{display:block;height:100%;background:var(--tc,#2fbf71);border-radius:9px;transform-origin:left center;transition:transform .15s linear,background .3s}
#ky.byr .by-res{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:7px;min-height:28px;font-weight:900;font-size:clamp(16px,4.6vw,20px)}
#ky.byr .by-res .g{color:#13894a}
#ky.byr .by-res .r{color:#c21f33}
#ky.byr .by-res .m{opacity:.7}
#ky.byr .by-res em{font-style:normal;font-size:12.5px;font-weight:900;border-radius:99px;padding:1px 8px;background:#d6efff;color:#1c1633}
#ky.byr .by-fact{margin-top:3px;font-size:13px;font-weight:800;opacity:.85}
#ky.byr .by-fact .fl{font:400 1.1em/1 ${EMO_FONT}}
#ky.byr .by-rk{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:12px;font-weight:800;min-height:20px}
#ky.byr .by-rk span{display:inline-flex;align-items:center;gap:4px;border:2px solid var(--ink);border-radius:99px;padding:1px 8px 1px 4px;background:#fff;white-space:nowrap}
#ky.byr .by-rk span i{width:10px;height:10px;border-radius:50%;background:var(--pc);border:1.5px solid #1c1633}
#ky.byr .by-rk span.me{background:#fff4c2}
#ky.byr .by-row{display:flex;gap:8px;justify-content:center;margin-top:7px}
#ky.byr .lbl .by-x{display:inline-flex;align-items:center;gap:3px;margin-left:4px}
#ky.byr .lbl .by-x:empty{display:none}
#ky.byr .lbl .by-sc{display:inline-block;padding:0 5px;border-radius:9px;background:#0f3d5a;color:#fff;font-weight:900;font-size:.82em;line-height:1.4;font-variant-numeric:tabular-nums}
#ky.byr .lbl.me .by-sc{background:#1c1633}
#ky.byr .lbl .by-v{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:50%;color:#fff;font-weight:900;font-size:.8em;line-height:1;border:1.5px solid #1c1633}
#ky.byr .lbl .by-v.y{background:#2fbf71}
#ky.byr .lbl .by-v.n{background:#d7263d}
#ky.byr .by-pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;font:900 clamp(17px,4.8vw,23px)/1 'Bricolage Grotesque','Arial Black',system-ui,sans-serif;color:#7dffb0;-webkit-text-stroke:5px #1c1633;paint-order:stroke fill;text-shadow:0 3px 0 #1c1633;white-space:nowrap;opacity:0;z-index:4}
#ky.byr .by-pt.neg{color:#ff8f9b}
#ky.byr .by-pt.go{animation:bypt 2.3s ease-out forwards}
@keyframes bypt{0%{opacity:0;margin-top:14px}12%{opacity:1;margin-top:0}75%{opacity:1;margin-top:-26px}100%{opacity:0;margin-top:-38px}}
#ky.byr .card .by-ru{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#ky.byr .card .by-ru div{border:3px solid var(--ink);border-radius:14px;padding:4px 3px 5px;text-align:center;font-weight:800;font-size:11.5px;line-height:1.12;color:var(--ink)}
#ky.byr .card .by-ru div b{display:block;font-size:22px;line-height:1.15}
#ky.byr .card .by-seg{display:flex;gap:5px;margin-top:12px;background:rgba(28,22,51,.08);border-radius:16px;padding:4px}
#ky.byr .card .by-seg button{flex:1;border:0;border-radius:12px;padding:8px 4px;font-weight:800;font-size:13px;background:transparent;color:var(--ink);-webkit-tap-highlight-color:transparent;white-space:nowrap}
#ky.byr .card .by-seg button.on{background:var(--ink);color:#fff}
#ky.byr .card .kb[disabled]{opacity:.55;filter:grayscale(.4)}
#ky.byr .card .by-pod{display:flex;align-items:flex-end;gap:6px;margin-top:10px}
#ky.byr .card .by-pod>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#ky.byr .card .by-pod p{margin:0;width:100%;font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
#ky.byr .card .by-pod small{font-size:11.5px;font-weight:800;opacity:.75;font-variant-numeric:tabular-nums}
#ky.byr .card .by-pod u{text-decoration:none;display:grid;place-items:start center;width:100%;margin-top:3px;border:3px solid var(--ink);border-bottom:0;border-radius:12px 12px 0 0;padding-top:2px;font-size:16px;font-weight:900}
#ky.byr .card .by-aw{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
#ky.byr .card .by-aw div{display:flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:12px;padding:4px 8px;line-height:1.15;background:#fff;color:var(--ink);font-weight:800;font-size:13px;text-align:left}
#ky.byr .card .by-aw div:only-child{grid-column:1/-1}
#ky.byr .card .by-aw div b{font-size:18px;flex:0 0 auto}
#ky.byr .card .by-aw div span{flex:1;min-width:0;font-size:12px}
#ky.byr .card .by-aw div span em{display:block;font-style:normal;font-weight:900;font-size:13px}
#ky.byr .card .by-tb{display:grid;gap:4px;margin-top:8px;max-height:min(17vh,128px);overflow:auto;text-align:left;overscroll-behavior:contain}
#ky.byr .card .by-tb>div{display:flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:11px;padding:4px 9px;background:#fff;color:var(--ink);font-weight:800;font-size:13px}
#ky.byr .card .by-tb>div.me{background:#fff4c2}
#ky.byr .card .by-tb b{flex:0 0 auto;width:20px;text-align:center}
#ky.byr .card .by-tb i{flex:0 0 auto;width:12px;height:12px;border-radius:50%;background:var(--pc);border:2px solid var(--ink)}
#ky.byr .card .by-tb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ky.byr .card .by-tb em{font-style:normal;font-size:12px;font-weight:800;opacity:.8;white-space:nowrap;font-variant-numeric:tabular-nums}
#ky.byr .card .row2 .kb{flex:1 1 auto;width:auto;min-width:0;white-space:nowrap;padding-left:10px;padding-right:10px}
#ky.byr .card .row2 .kb.alt{flex:0 0 auto}
@media (orientation:landscape) and (max-height:520px){
#ky.byr .by-box{width:min(470px,54vw);padding:6px 8px 7px;max-height:calc(100vh - 66px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
#ky.byr .by-q{padding:4px 10px 5px}#ky.byr .by-q .big{font-size:21px}#ky.byr .by-q .sub{font-size:12px}
#ky.byr .by-o{min-height:40px;font-size:14px}
#ky.byr .by-four{margin-top:6px;gap:6px}
#ky.byr .by-ft{margin-top:5px}
#ky.byr .by-res{margin-top:5px;font-size:16px;min-height:22px}
#ky.byr .by-tm{margin-top:5px}
#ky.byr .card .by-ru{margin-top:6px}#ky.byr .card .by-ru div{font-size:10.5px;padding:2px 3px 3px}#ky.byr .card .by-ru div b{font-size:17px}
#ky.byr .card .by-seg{margin-top:6px}#ky.byr .card .by-seg button{padding:6px 4px}
#ky.byr .card .by-pod{display:none}
#ky.byr .card .by-aw{margin-top:6px}
#ky.byr .card .by-tb{max-height:24vh}
#ky.byr .panel.low .card{max-height:calc(100vh - 62px - env(safe-area-inset-top, 0px));overflow:auto;overscroll-behavior:contain}
}
@media (min-aspect-ratio:11/10){#ky.byr .mz-bar{align-items:flex-end}}
`;

/* ============================ müzik ve sesler ============================ */
// 'idle' (giriş, final): sahil kafesi bossa novası (Sol majör, 104 bpm): çapraz tık, çalkalayıcı, elektrikli piyano, flüt.
// 'race' (durak ve açılış): hızlı "jet-set" yolculuk müziği (Mi minör, 126 bpm): dört vuruş davul, disko bas, arpej, bando.
class BySnd extends MasaSnd {
  constructor() { super(); this.musVol = 2.3; }
  tempo() { return this.mode === 'race' ? 126 : 104; }
  swing() { return this.mode === 'race' ? 0.02 : 0.12; }
  beat(t, s, bar, spb, st = spb / 4) {
    if (this.mode === 'mute') return;
    if (this.mode === 'race') {
      // Em – C – G – D
      const CH = [[40, [64, 67, 71]], [36, [64, 67, 72]], [43, [62, 67, 71]], [38, [62, 66, 69]]];
      const [root, ch] = CH[bar % 4];
      if (s % 4 === 0) this.iKick(t, 0.075, 118, 46, 0.15);
      if (s === 4 || s === 12) this.iClap(t, 0.04);
      if (s % 4 === 2) this.iHat(t, 0.022, true); else this.iHat(t, s % 2 ? 0.009 : 0.013);
      this.iShk(t, s % 2 ? 0.01 : 0.014);
      if (s % 2 === 0) this.iBass(t, root - 12 + (s % 4 === 2 ? 12 : 0), st * 1.9, 0.082, 'up');
      if (s % 4 === 0) this.iBass(t, root - 12, st * 0.6, 0.05, 'disco', 900);
      if (s === 0) this.iPad(t, ch, spb * 4, 0.013, 1500, 0.3);
      const ARP = [0, 1, 2, 1];
      if (s % 2 === 1) this.iPluck(t, ch[ARP[(s >> 1) % 4]] + 12, 0.016, st * 1.4, 'square', 2400, 0.12);
      if (s === 0) ch.forEach((m) => this.iBrass(t, m, st * 1.4, 0.02, 0.12));
      if (s === 10 && bar % 2 === 1) ch.forEach((m) => this.iBrass(t, m, st * 0.9, 0.016, 0.12));
      // her dört ölçüde bir tiz "uçuş" motifi
      const HOOK = [[83, null, 81, 83, null, 79, null, 76], [76, null, 79, null, 81, null, 83, null]];
      if (bar % 4 >= 2 && s % 2 === 0) { const m = HOOK[bar % 2][s >> 1]; if (m != null) this.iPluck(t, m, 0.022, st * 1.8, 'triangle', 3600, 0.25); }
      return;
    }
    // Gmaj7 – Em7 – Am7 – D7
    const CH = [[43, [59, 62, 66]], [40, [59, 62, 67]], [45, [60, 64, 67]], [38, [60, 66, 69]]];
    const [root, ch] = CH[bar % 4];
    if (s === 0) this.iBass(t, root - 12, st * 3, 0.1, 'sub');
    if (s === 6) this.iBass(t, root - 5, st * 2, 0.08, 'sub');
    if (s === 8) this.iBass(t, root - 12, st * 3, 0.09, 'sub');
    if (s === 14) this.iBass(t, root - 5, st * 2, 0.07, 'sub');
    if ((bar % 2 === 0 ? [0, 6, 12] : [4, 8]).includes(s)) this.iRim(t, 0.045);
    this.iShk(t, s % 4 === 0 ? 0.018 : 0.012);
    if ([0, 3, 6, 10, 13].includes(s)) ch.forEach((m, k) => this.iEP(t + k * 0.004, m, 0.018, st * 2.6, 0.2));
    if (s === 0) this.iPad(t, ch, spb * 4, 0.014, 1200, 0.3);
    const MEL = [[74, null, 71, null, 74, 76, null, null], [74, null, null, 71, 67, null, 71, null], [72, null, 76, null, 79, null, 76, 72], [74, null, null, null, 72, null, 69, null]];
    const m = MEL[bar % 4][s >> 1];
    if (s % 2 === 0 && m != null) this.iFlute(t, m, st * 1.8, 0.026, 0.35);
  }
  _fx(name, a) {
    const t = this.k.ctx.currentTime;
    switch (name) {
      case 'ding': // yeni durak: havalimanı anons çanı "ding-dong"
        this.iBell(t, 88, 0.05, 1.1, 0.35);
        this.iBell(t + 0.3, 84, 0.05, 1.4, 0.35);
        this.tone(1319, t, 0.5, 'sine', 0.04, null, 0.003);
        this.tone(1047, t + 0.3, 0.7, 'sine', 0.04, null, 0.003);
        break;
      case 'whirr': // küre hızla döner
        this.noise(t, 1.0, 0.06, { type: 'bandpass', freq: 420, to: 1600, q: 2.2, attack: 0.18 });
        this.noise(t + 0.5, 0.6, 0.04, { type: 'bandpass', freq: 1600, to: 500, q: 2, attack: 0.1 });
        break;
      case 'pin': // iğne saplanır
        this.tone(1568, t, 0.07, 'sine', 0.05, 2093, 0.002);
        this.iWood(t + 0.04, 0.09, 1250);
        this.tone(196, t + 0.04, 0.12, 'triangle', 0.08, 120, 0.002);
        break;
      case 'lock': // cevabımı kilitledim: bilet damgası
        this.noise(t, 0.06, 0.18, { type: 'lowpass', freq: 900 });
        this.tone(118, t, 0.14, 'sine', 0.22, 58, 0.002);
        this.iWood(t + 0.012, 0.07, 520);
        this.tone(880, t + 0.05, 0.1, 'triangle', 0.04, 1175, 0.003);
        break;
      case 'peer': // başkası cevapladı
        this.iWood(t, 0.045, 1000 + Math.random() * 300);
        break;
      case 'jet': // uçağım ilerliyor
        this.noise(t, 1.2, 0.07, { type: 'bandpass', freq: 500, to: 2600, q: 1.1, attack: 0.25 });
        this.noise(t + 0.5, 0.8, 0.05, { type: 'bandpass', freq: 2600, to: 700, q: 1, attack: 0.1 });
        this.tone(160, t, 1.1, 'sawtooth', 0.012, 240, 0.3);
        break;
      case 'sputter': // yanlış: motor öksürür
        for (let i = 0; i < 4; i++) { this.noise(t + i * 0.13 + Math.random() * 0.03, 0.06, 0.12, { type: 'lowpass', freq: 500 + Math.random() * 300 }); this.tone(90 + Math.random() * 30, t + i * 0.13, 0.06, 'square', 0.04, 60, 0.002); }
        this.tone(330, t + 0.1, 0.5, 'sawtooth', 0.025, 140, 0.02);
        break;
      case 'right':
        [[76, 0], [79, 0.07], [84, 0.14]].forEach(([m, d]) => this.iBell(t + d, m + 12, 0.045, 0.9, 0.3));
        this.cheer(t + 0.15, 1.2);
        break;
      case 'fast': // en hızlı
        for (let i = 0; i < 5; i++) this.iBell(t + 0.25 + i * 0.05, 88 + [0, 4, 7, 12, 16][i], 0.02, 0.6, 0.4);
        break;
      case 'wrong':
        this.tone(196, t, 0.18, 'square', 0.05, 175, 0.005);
        this.tone(165, t + 0.2, 0.34, 'square', 0.05, 140, 0.005);
        break;
      case 'miss':
        this.tone(392, t, 0.14, 'triangle', 0.06, 370, 0.01);
        this.tone(330, t + 0.15, 0.32, 'triangle', 0.06, 262, 0.01);
        break;
      case 'nobody':
        this.tone(220, t, 0.5, 'sawtooth', 0.03, 165, 0.03);
        this.noise(t, 0.6, 0.05, { type: 'bandpass', freq: 700, to: 300, q: 1.5, attack: 0.08 });
        break;
      case 'timeup':
        this.tone(220, t, 0.4, 'square', 0.05, null, 0.004);
        this.tone(277, t, 0.4, 'square', 0.035, null, 0.004);
        break;
      case 'champ':
        this.duck(0.15, 3);
        [[60, 0, 0.14], [64, 0.15, 0.14], [67, 0.3, 0.14], [72, 0.45, 0.8]].forEach(([m, d, L]) => { this.iBrass(t + d, m, L, 0.07, 0.15); this.tone(440 * Math.pow(2, (m + 12 - 69) / 12), t + d, L, 'triangle', 0.05); });
        this.cheer(t + 0.4, 2.2);
        break;
      default: super._fx(name, a); break;
    }
  }
}

/* ============================ modeller ============================ */
// kaide (orijin masa üstü): koyu lacivert taban, pirinç kenar, yükseltilmiş gövde, ortada ışık merceği (ayrı model)
function pedestalModel(mb) {
  const Nd = C('#0b1a28', -0.45), Nv = C('#132c42', -0.55), Br = C('#ffc93c', -0.8);
  mb.lathe(0, 0, 0, [[0, 0.022], [BASE_R - 0.004, 0.022], [BASE_R + 0.004, 0.016], [BASE_R + 0.004, 0.004], [BASE_R - 0.004, 0], [0, 0]], 64, Nd);
  mb.torusN(0, 0.012, 0, BASE_R + 0.004, 0.011, 0.011, 64, 6, Br);
  mb.lathe(0, 0, 0, [[PED_R + 0.012, 0.02], [PED_R + 0.004, 0.06], [PED_R - 0.012, 0.082], [PED_R - 0.04, 0.09], [LENS_R + 0.03, 0.09], [LENS_R + 0.03, 0.09], [LENS_R + 0.03, 0.098], [LENS_R, 0.098]], 56, Nv);
  mb.torusN(0, 0.072, 0, PED_R - 0.004, 0.009, 0.009, 56, 6, Br);
  mb.torusN(0, 0.098, 0, LENS_R + 0.022, 0.01, 0.008, 44, 6, Br);
}
// ışık merceği (beyaz, ışık saçar; çizerken renk verilir)
function lensModel(mb) { mb.lathe(0, 0, 0, [[0, 0.112], [LENS_R * 0.6, 0.108], [LENS_R, 0.1], [LENS_R, 0.096]], 40, C('#ffffff', 0.9)); }
function segModel(mb, e) { mb.rbox(-0.03, 0, -0.013, 0.03, 0.011, 0.013, 0.005, C('#ffffff', e), 1); }
// dünya küresi ('tex'): birim küre, pürüzsüz normaller; u = boylam, v = enlem (doku: eşdikdörtgen harita)
function globeModel(mb, NU = 48, NV = 24) {
  const d = mb.d;
  const V = (lo, la) => { const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo); return [x, y, z, x, y, z, (lo / Math.PI + 1) / 2, 0.5 - la / Math.PI]; };
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const lo0 = -Math.PI + (i / NU) * TAU, lo1 = -Math.PI + ((i + 1) / NU) * TAU;
      const la0 = Math.PI / 2 - (j / NV) * Math.PI, la1 = Math.PI / 2 - ((j + 1) / NV) * Math.PI;
      const a = V(lo0, la1), b = V(lo1, la1), c = V(lo1, la0), e = V(lo0, la0);
      if (j < NV - 1) d.push(...a, ...b, ...c);   // güney kutbunda a ile b çakışır
      if (j > 0) d.push(...a, ...c, ...e);        // kuzey kutbunda c ile e çakışır
    }
  }
}
// gölge için düz renkli küre (yalnız gölge geçişinde çizilir)
function proxyModel(mb) { mb.sphereS(0, 0, 0, 1, 1, 1, C('#2f86cf'), 16, 10); }
// iğne (orijin ucu, +y dışarı): metal gövde, kırmızı baş
function pinModel(mb) {
  limb(mb, [0, -0.025, 0], [0, PIN_L - PIN_HR * 0.5, 0], [0.006, 0.0045], C('#dfe3ea', -0.8), 8);
  mb.sphereS(0, PIN_L, 0, PIN_HR, PIN_HR, PIN_HR, C('#ff3448', -0.6), 14, 8);
}
// uçak (ileri -z, yukarı +y; orijin uçağın ortası). Gövde beyaz; kanat, kuyruk ve şerit ayrı modelde (oyuncunun rengi)
function planeBodyModel(mb) {
  const Wt = C('#f4f6fb', -0.6), Gl = C('#24466e', -0.9), Mt = C('#9aa3b5', -0.7);
  mb.push().T(0, 0, 0, 0, Math.PI / 2, 0);
  mb.lathe(0, 0, 0, [[0, -0.108], [0.016, -0.104], [0.026, -0.09], [0.031, -0.065], [0.032, -0.02], [0.029, 0.03], [0.021, 0.075], [0.011, 0.104], [0, 0.11]], 14, Wt);
  mb.pop();
  mb.sphereS(0, 0.021, -0.05, 0.017, 0.015, 0.03, Gl, 12, 6);
  mb.sphereS(0, 0, -0.111, 0.012, 0.012, 0.012, Mt, 8, 5);
}
function planePaintModel(mb) {
  const P = C('#ffffff', -0.55);
  // sivrilen düz levha: kök (r0 ön, r1 arka), uç (t0 ön, t1 arka), kalınlık h
  const slab = (r0, r1, t0, t1, h, out) => {
    const up = (p) => [p[0], p[1] + h, p[2]], dn = (p) => [p[0], p[1] - h, p[2]];
    const c = [(r0[0] + t0[0]) / 2, (r0[1] + t0[1]) / 2, (r0[2] + r1[2]) / 2];
    mb.quad(up(r0), up(t0), up(t1), up(r1), P, [c[0], c[1] - 1, c[2]]);
    mb.quad(dn(r0), dn(t0), dn(t1), dn(r1), P, [c[0], c[1] + 1, c[2]]);
    mb.quad(dn(r0), dn(t0), up(t0), up(r0), P, [c[0], c[1], c[2] + 1]);
    mb.quad(dn(r1), dn(t1), up(t1), up(r1), P, [c[0], c[1], c[2] - 1]);
    mb.quad(dn(t0), dn(t1), up(t1), up(t0), P, out);
  };
  [-1, 1].forEach((sx) => {
    slab([0, -0.006, -0.038], [0, -0.006, 0.02], [sx * 0.128, 0.006, -0.012], [sx * 0.128, 0.006, 0.01], 0.0045, [0, 0, 0]);
    slab([0, 0.008, 0.068], [0, 0.008, 0.102], [sx * 0.05, 0.011, 0.088], [sx * 0.05, 0.011, 0.104], 0.003, [0, 0.01, 0.09]);
  });
  // dikey kuyruk
  const fin = (x) => [[x, 0.018, 0.064], [x, 0.018, 0.106], [x, 0.068, 0.108], [x, 0.068, 0.092]];
  const L = fin(-0.004), R = fin(0.004);
  mb.quad(L[0], L[1], L[2], L[3], P, [1, 0.04, 0.09]);
  mb.quad(R[0], R[1], R[2], R[3], P, [-1, 0.04, 0.09]);
  mb.quad(L[0], R[0], R[3], L[3], P, [0, 0.04, 0.2]);
  mb.quad(L[2], R[2], R[3], L[3], P, [0, -1, 0.1]);
  mb.quad(L[1], R[1], R[2], L[2], P, [0, 0.04, 0]);
  // gövde şeridi
  mb.push().T(0, 0, 0, 0, Math.PI / 2, 0);
  mb.lathe(0, 0, 0, [[0.0325, -0.034], [0.0335, -0.03], [0.0335, -0.016], [0.0325, -0.012]], 14, P);
  mb.pop();
}
function propModel(mb) {
  const Dk = C('#2b2f3a', -0.5);
  mb.rbox(-0.0045, -0.052, -0.121, 0.0045, 0.052, -0.115, 0.003, Dk, 1);
  mb.rbox(-0.052, -0.0045, -0.121, 0.052, 0.0045, -0.115, 0.003, Dk, 1);
}
// ekrana paralel etiket dörtgeni ('tex')
function labelQuad(tb) { const w = LBL_W / 2, h = LBL_H / 2; tb.tquad([-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0], 0, 0, 1, 1, [0, 0, -1]); }

/* ============================ dokular ============================ */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function emojiAt(g, e, cx, cy, size) {
  g.font = `${size}px ${EMO_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const m = g.measureText(e);
  const asc = m.actualBoundingBoxAscent || size * 0.8, des = m.actualBoundingBoxDescent || size * 0.15;
  g.fillStyle = '#1c1633';
  g.fillText(e, cx, cy + (asc - des) / 2);
}
// yazıyı kutuya sığdır: tek satır olmazsa iki satır (kelimelerden böl), yazı tipini küçült
function fitLines(g, text, w, big, small, weight) {
  for (let fs = big; fs >= small; fs -= 2) { g.font = `${weight} ${fs}px ${F}`; if (g.measureText(text).width <= w) return { fs, lines: [text] }; }
  const words = text.split(/\s+/);
  if (words.length > 1) {
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      g.font = `${weight} 10px ${F}`;
      const m = Math.max(g.measureText(a).width, g.measureText(b).width);
      if (!best || m < best.m) best = { a, b, m };
    }
    for (let fs = Math.round(big * 0.8); fs >= small * 0.7; fs -= 2) { g.font = `${weight} ${fs}px ${F}`; if (Math.max(g.measureText(best.a).width, g.measureText(best.b).width) <= w) return { fs, lines: [best.a, best.b] }; }
    return { fs: Math.round(small * 0.7), lines: [best.a, best.b] };
  }
  return { fs: small, lines: [text] };
}
// etiket (512×256): solda bayrak/simge, sağda iki satır; altta iğneyi gösteren sivri uç
function drawLabel(cv, icon, l1, l2, acc) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const x0 = 8, y0 = 8, w = W - 16, h = H - 70, r = 44;
  g.fillStyle = '#0d1b2a';
  rr(g, x0, y0, w, h, r); g.fill();
  g.beginPath(); g.moveTo(W / 2 - 36, y0 + h - 6); g.lineTo(W / 2, H - 6); g.lineTo(W / 2 + 36, y0 + h - 6); g.closePath(); g.fill();
  g.fillStyle = acc;
  rr(g, x0 + 10, y0 + 10, w - 20, h - 20, r - 10); g.fill();
  g.beginPath(); g.moveTo(W / 2 - 22, y0 + h - 14); g.lineTo(W / 2, H - 24); g.lineTo(W / 2 + 22, y0 + h - 14); g.closePath(); g.fill();
  g.fillStyle = '#ffffff';
  rr(g, x0 + 22, y0 + 22, w - 44, h - 44, r - 22); g.fill();
  const cy = y0 + h / 2, ix = x0 + 22 + 74;
  emojiAt(g, icon, ix, cy, 98);
  const tx = ix + 64, tw = W - tx - 40;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const A = fitLines(g, l1, tw, 60, 34, 900);
  const B = l2 ? fitLines(g, l2, tw, 42, 26, 800) : null;
  const lh1 = A.fs * 1.02, lh2 = B ? B.fs * 1.1 : 0;
  const total = A.lines.length * lh1 + (B ? lh2 * B.lines.length + 4 : 0);
  let y = cy - total / 2 + lh1 / 2;
  g.fillStyle = '#0d1b2a'; g.font = `900 ${A.fs}px ${F}`;
  A.lines.forEach((L) => { g.fillText(L, tx, y, tw); y += lh1; });
  if (B) { y += 4 - lh1 / 2 + lh2 / 2; g.fillStyle = '#2d5675'; g.font = `800 ${B.fs}px ${F}`; B.lines.forEach((L) => { g.fillText(L, tx, y, tw); y += lh2; }); }
}

/* ============================ yardımcılar ============================ */
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const nm0 = (s) => String(s || '').replace(/ 🤖$/, '');
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIO = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
const backOut = (u) => { const x = clamp(u, 0, 1) - 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; };
const fmt = (n) => Math.round(n || 0).toLocaleString('tr-TR');
const sec1 = (ms) => (ms / 1000).toFixed(1).replace('.', ',');
const placeOf = (v, i) => { const sc = (v.scores || [])[i] || 0; return 1 + (v.scores || []).filter((x) => x > sc).length; };
const upTR = (s) => String(s || '').toLocaleUpperCase('tr-TR');
const flagFor = (name) => { const c = CAPS[name]; return c ? flagOf(c[2]) : ''; };
const signed = (g) => (g > 0 ? `+${fmt(g)}` : g < 0 ? `−${fmt(-g)}` : '0');

/* ============================ oyun ============================ */
class CapitalGame extends TableGame {
  constructor(ctx) {
    super(ctx, { tag: 'byr', cls: 'byr', title: 'Başkent Yarışı', sub: 'Dünya turu yarışı', emoji: '🌍', css: STYLE, snd: new BySnd(), amb: 'diner', ambVol: 0.3, botPx: 300, botPxL: 34, cloth: '#16485e', trim: '#ffd23f', tea: false, place: false, chairPad: '#ff7b54', lampHex: '#13283a', light: WORLD_L, fog: '#0b1622', roomStyle: { wall: '#13283a', curtain: '#2a9d8f' } });
    this.lockSeen = new Map();   // cevaplayan → cevapladığı an
    this.ptEl = [];
    this.pl = new Map();         // uçaklar: oyuncu → durum
    this.gSpin = 0; this.gSpinV = 0.22; this.gTilt = -0.4; this.gYaw = 0;
    this.tw = null; this.spinKey = '';
    this.gC = [0, TABLE_Y + GY, 0];
    this.gM = M.make(); this.gA = M.make(); this.gB = M.make();
    this.pinAt = null; this.pinKey = ''; this.pinFx = '';   // iğnenin düşmeye başladığı an (sunucu saati, ms)
    this.lblKey = ''; this.lblT = -9;
    this.tint = new Float32Array(3);
    this.el.posS.textContent = '';
    this.bindUi();
  }

  /* ---------- dünya ---------- */
  world(W) {
    W.byPed = this.mk(pedestalModel);
    W.byLens = this.mk(lensModel);
    W.bySeg = this.mk((mb) => segModel(mb, -0.5));
    W.bySegL = this.mk((mb) => segModel(mb, 0.9));
    W.byGlobe = this.mk((mb) => globeModel(mb), 'tex');
    W.byProxy = this.mk(proxyModel);
    W.byPin = this.mk(pinModel);
    W.byBody = this.mk(planeBodyModel);
    W.byPaint = this.mk(planePaintModel);
    W.byProp = this.mk(propModel);
    W.byLbl = this.mk(labelQuad, 'tex');
    W.trophy = this.mk(K.trophyModel);
    const gl = this.X.gl;
    const big = (gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048) >= 4096;
    const mkCv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.mapCv = mkCv(big ? 2048 : 1024, big ? 1024 : 512);
    this.lblCv = mkCv(512, 256);
    try { paintWorld(this.mapCv); } catch (e) { console.warn('[byr] harita', e); }
    this.mapTex = makeTexture(this.X, this.mapCv);
    this.lblTex = makeTexture(this.X, this.lblCv);
    this.lblKey = '';
    try { document.fonts?.ready?.then(() => { if (!this.dead) this.lblKey = ''; }); } catch { /* yok */ }
  }
  freeTex() { const gl = this.X && this.X.gl; if (gl) [this.mapTex, this.lblTex].forEach((t) => t && gl.deleteTexture(t)); this.mapTex = this.lblTex = null; }
  onDispose() { this.ptEl.forEach((e) => e && e.remove()); this.ptEl = []; }
  seatW(a, x, y, z) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.pos[0] + x * c + z * s, y, a.pos[2] - x * s + z * c]; }
  fx(n, a) { try { this.snd.fx(n, a); } catch { /* yok */ } }
  sNow() { return this.ctx.serverNow(); }
  inPlay() { const v = this.view; return !!v && (v.phase === 'question' || v.phase === 'reveal') && Array.isArray(v.options); }
  revT() { const v = this.view; return v && v.phase === 'reveal' ? (this.sNow() - (v.at || 0)) / 1000 : -1; }
  shown() { return this.revT() >= VERD_T; }
  get ss() { return this.ssV || 1; }
  // ekranda gösterilen puan: açılışta sonuç gösterilene kadar eski puan (uçaklar ve etiketler o anda hareket eder)
  dispScore(i) {
    const v = this.view;
    if (!v) return 0;
    const sc = (v.scores || [])[i] || 0;
    if (v.phase === 'reveal' && !this.shown()) return sc - ((v.gains || [])[i] || 0);
    return sc;
  }

  /* ---------- girdi ---------- */
  bindUi() {
    const onClick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, v = this.view;
      if (act === 'by-mode') { const m = b.dataset.m; if (v && v.mode !== m) { this.fx('pop'); this.ctx.send('mode', { m }); } }
      else if (act === 'by-start') { this.fx('pop'); this.ctx.send('start', { m: v?.mode || 'kisa' }); }
      else if (act === 'by-ans') {
        if (!v || v.phase !== 'question' || !v.amIn || v.myChoice >= 0) return;
        const c = +b.dataset.c;
        this.fx('lock'); vibrate(18);
        this.lockSeen.set(v.seats[v.me]?.id, this.time);
        this.ctx.send('answer', { choice: c });
      }
      else if (act === 'by-next') { this.fx('pop'); this.ctx.send('next', {}); }
    };
    this.el.bar.addEventListener('click', onClick);
    this.el.panel.addEventListener('click', onClick);
  }

  /* ---------- sunucu görünümü ---------- */
  update(root, ctx) {
    this.ctx = ctx;
    if (root && root.dataset.byr !== '1') { root.dataset.byr = '1'; root.innerHTML = '<p class="py-16 text-center">🌍</p>'; }
    const v = ctx.view;
    const prev = this.view;
    this.view = v;
    if (!v) return;
    if (this.emo) this.emo.sync(v.emo, ctx.serverNow());
    this.el.ex.style.display = ctx.isHost ? '' : 'none';
    this.setSeats(v.seats || [], v.me ?? -1);
    const key = `${v.game}:${v.q || 0}:${v.phase}`;
    if (key !== this.phKey) { this.phKey = key; this.onPhase(prev, v); }
    if (v.phase === 'question') {
      (v.seats || []).forEach((p, i) => {
        if (!(v.picked || [])[i] || this.lockSeen.has(p.id)) return;
        this.lockSeen.set(p.id, this.time);
        if (prev && prev.phase === 'question' && i !== v.me) this.fx('peer');
      });
    }
    this.bar();
    this.panel();
  }
  onPhase(prev, v) {
    const mus = (m) => { try { this.snd.music(m); } catch { /* yok */ } };
    const fresh = this.sNow() - (v.at || 0) < 1500;
    const qk = `${v.game}:${v.q}`;
    const arr = this.sNow();   // görünümün geldiği an (sunucu saati): canlandırmalar buna göre, yavaş cihazda da zamanında
    if (v.phase === 'intro') { mus('idle'); this.pinAt = null; this.tw = null; }
    if (v.phase === 'question') {
      mus('race');
      this.lockSeen = new Map((v.seats || []).filter((p, i) => (v.picked || [])[i]).map((p) => [p.id, -9]));
      this.qS = fresh ? arr : -1e15;
      this.tickSec = 0; this.upSeen = false;
      this.pinKey = qk;
      this.pinFx = fresh ? '' : qk;
      const loc = v.kind === 'cap' ? CAPS[v.big] : null;
      if (loc) {
        // ülke → başkent: küre bir tur dönüp ülkeye gelir, iğne saplanır
        this.pinAt = fresh ? arr + 1150 : -1e15;
        if (fresh) { this.turnTo(loc, 1250, true, arr); this.fx('whirr'); } else this.tw = null;
      } else this.pinAt = null;
      if (fresh) { this.fx('ding'); this.msg(`✈️ ${v.q}. DURAK`, 'mid'); }
    }
    if (v.phase === 'reveal') {
      mus('race');
      const rt = this.revT();
      this.vDone = rt >= VERD_T + 0.4;
      this.vT = this.vDone ? this.time - 9 : null;
      const loc = CAPS[v.country];
      if (!(v.kind === 'cap' && this.pinKey === qk && this.pinAt != null)) {
        this.pinKey = qk;
        this.pinFx = fresh ? '' : qk;
        this.pinAt = loc ? (fresh ? arr + 550 : -1e15) : null;
        if (loc && fresh) { this.turnTo(loc, 700, false, arr); this.fx('whirr'); } else this.tw = null;
      }
    }
    if (v.phase === 'final') {
      mus('idle');
      this.pinAt = null; this.tw = null;
      const late = this.sNow() - (v.finAt || 0) > 2500;
      this.finT = this.time - (late ? 30 : 0);
      this.champFx = late;
      if (!late) this.msg('🏁 DÜNYA TURU BİTTİ', 'big');
    }
  }
  // sonuç gösterildi: sesler, mesajlar, puan baloncukları (uçaklar puanla birlikte kendiliğinden yola çıkar)
  onVerdict() {
    const v = this.view;
    this.vT = this.time;
    if (!(v.correct >= 0 && v.correct < 4)) return;
    const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1;
    const inR = me >= 0 && (v.inRound || [])[me];
    if (inR && mine === v.correct) {
      this.fx('right');
      setTimeout(() => { if (!this.dead) this.fx('jet'); }, 260);
      if (v.fastest === me) this.fx('fast');
      vibrate([15, 30, 15]);
      this.msg(v.fastest === me ? '⚡ EN HIZLI SENSİN!' : '✅ DOĞRU!', 'mid');
    } else if (inR && mine >= 0) {
      this.fx('wrong');
      if (((v.gains || [])[me] || 0) < 0) setTimeout(() => { if (!this.dead) this.fx('sputter'); }, 300);
      vibrate(40); this.msg('❌ YANLIŞ', 'mid');
    } else if (inR) { this.fx('miss'); this.msg('⏰ SÜRE DOLDU', 'mid'); }
    if (!v.right) { setTimeout(() => { if (!this.dead) this.fx('nobody'); }, 600); if (!(inR && mine >= 0)) this.msg('🤯 KİMSE BİLEMEDİ', 'mid'); }
    (v.gains || []).forEach((g, i) => {
      if (!g) return;
      const e = this.ptBox(i);
      e.className = g > 0 ? 'by-pt' : 'by-pt neg';
      e.textContent = `${signed(g)}${g > 0 && v.fastest === i ? ' ⚡' : ''}`;
      void e.offsetWidth;
      e.classList.add('go');
    });
  }
  ptBox(i) {
    let e = this.ptEl[i];
    if (!e) { e = document.createElement('div'); e.className = 'by-pt'; this.el.wrap.appendChild(e); this.ptEl[i] = e; }
    return e;
  }

  /* ---------- küre ---------- */
  // küreyi bir konuma çevir (süreli dönüş; extra: önce bir tam tur)
  turnTo(loc, dur, extra, t0) {
    const want = -loc[1] * DEG;
    let d = angDiff(want, this.gSpin);
    if (extra) d += d >= 0 ? TAU : -TAU;
    this.tw = { a: this.gSpin, b: this.gSpin + d, t0, d: dur };
    this.spinKey = `${loc[0]},${loc[1]}`;
  }
  // şu an gösterilen konum: [enlem, boylam] ya da null (küre boşta döner)
  target() {
    const v = this.view;
    if (!v) return null;
    if (v.phase === 'question') return v.kind === 'cap' ? CAPS[v.big] || null : null;
    if (v.phase === 'reveal') return CAPS[v.country] || null;
    return null;
  }
  stepGlobe(dt) {
    const v = this.view, c = this.cam, ss = this.ss;
    this.gC[1] = TABLE_Y + GY * ss;
    const dx = c.ex - this.gC[0], dy = c.ey - this.gC[1], dz = c.ez - this.gC[2];
    this.gYaw = Math.atan2(dx, dz);
    const elev = Math.atan2(dy, Math.hypot(dx, dz));
    const loc = this.target();
    let tiltT;
    if (loc) {
      tiltT = clamp(loc[0] * DEG - elev - PIN_UP, -1.75, 0.6);
      const key = `${loc[0]},${loc[1]}`;
      if (this.tw) {
        const u = clamp((this.sNow() - this.tw.t0) / this.tw.d, 0, 1);
        this.gSpin = lerp(this.tw.a, this.tw.b, easeIO(u));
        if (u >= 1) this.tw = null;
      } else {
        // dönüş yoksa (geç katılım, kamera değişimi) hedefe yumuşakça otur
        if (key !== this.spinKey) this.spinKey = key;
        this.gSpin += angDiff(-loc[1] * DEG, this.gSpin) * (1 - Math.exp(-5 * dt));
      }
      this.gSpinV = 0;
    } else {
      this.tw = null;
      this.spinKey = '';
      tiltT = 0.5 - elev;
      const sp = v && v.phase === 'question' && v.kind === 'cty' ? 0.85 : 0.2;
      this.gSpinV = damp(this.gSpinV, sp, 1.6, dt);
      this.gSpin += this.gSpinV * dt;
    }
    if (Math.abs(this.gSpin) > 200 && !this.tw) this.gSpin = angDiff(this.gSpin, 0);
    this.gTilt = damp(this.gTilt, tiltT, 4, dt);
    // matris: T(merkez) · Ry(kameraya dönük) · Rx(eğim) · Ry(dönüş) · S
    M.set(this.gA, this.gC[0], this.gC[1], this.gC[2], this.gYaw, this.gTilt, 0, 1);
    M.set(this.gB, 0, 0, 0, this.gSpin, 0, 0, GR * ss);
    M.mul(this.gM, this.gA, this.gB);
  }
  // küre üstündeki noktanın dünya konumu (k: yarıçap katı)
  geoW(lat, lon, k = 1) {
    const m = this.gM, la = lat * DEG, lo = lon * DEG;
    const x = Math.cos(la) * Math.sin(lo) * k, y = Math.sin(la) * k, z = Math.cos(la) * Math.cos(lo) * k;
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  }
  // iğne: { p: yüzey noktası, n: dışa normal, drop: düşme payı, u: 0..1 } ya da null
  pinState() {
    const v = this.view;
    if (!v || this.pinAt == null || !this.inPlay()) return null;
    const loc = v.phase === 'question' ? (v.kind === 'cap' ? CAPS[v.big] : null) : CAPS[v.country];
    if (!loc) return null;
    const u = (this.sNow() - this.pinAt) / 320;
    if (u < 0) return null;
    const p = this.geoW(loc[0], loc[1], 1);
    const n = [p[0] - this.gC[0], p[1] - this.gC[1], p[2] - this.gC[2]];
    const L = Math.hypot(n[0], n[1], n[2]) || 1;
    n[0] /= L; n[1] /= L; n[2] /= L;
    return { p, n, drop: (1 - easeOut(u)) * 0.55 * this.ss, u: clamp(u, 0, 1) };
  }
  pinHead(P) { const s = (PIN_L + P.drop / this.ss) * this.ss; return [P.p[0] + P.n[0] * s, P.p[1] + P.n[1] * s, P.p[2] + P.n[2] * s]; }
  // etiket: içerik, dayanak ve beliriş zamanı
  labelSpec() {
    const v = this.view;
    if (!v || !this.inPlay()) return null;
    const qcap = () => ({ key: `q|${v.game}|${v.q}|${v.big}`, icon: flagFor(v.big) || '🌍', l1: upTR(v.big), l2: 'başkenti?', anchor: 'pin', t0: (this.pinAt ?? -1e15) + 220, acc: '#ffd23f' });
    if (v.phase === 'question') {
      if (v.kind === 'cap') return qcap();
      return { key: `q|${v.game}|${v.q}|${v.big}`, icon: '📍', l1: upTR(v.big), l2: 'hangi ülkenin?', anchor: 'top', t0: (this.qS ?? -1e15) + 150, acc: '#2ec4ff' };
    }
    if (v.kind === 'cap' && !this.shown()) return qcap();
    const capital = v.kind === 'cap' ? v.options[v.correct] : v.big;
    const t0 = v.kind === 'cap' ? (v.at || 0) + VERD_T * 1000 : (this.pinAt ?? -1e15) + 220;
    return { key: `r|${v.game}|${v.q}|${v.country}`, icon: flagFor(v.country) || '🌍', l1: upTR(v.country), l2: `★ ${capital}`, anchor: 'pin', t0, acc: '#7ed957' };
  }

  /* ---------- uçaklar ---------- */
  // başlangıç çizgisi: kameradan bakınca kürenin solu (şeritler yan yana görünür); uçaklar önce uzağa doğru uçar
  th0() { return this.base + Math.PI / 2; }
  stepPlanes(dt) {
    const v = this.view;
    if (!v) return;
    const th0 = this.th0(), qs = Math.max(1, v.qs || 12), ss = this.ss, t = this.time;
    const keep = new Set();
    this.seats.forEach((p, i) => {
      keep.add(p.id);
      let st = this.pl.get(p.id);
      const sc = this.dispScore(i);
      if (!st) { st = { th: th0 + TAU * clamp(sc / (qs * 1000), 0, 1), wob: 0, smT: 0, trT: 0, sc, g: v.game, w: [0, 0, 0] }; this.pl.set(p.id, st); }
      // yeni oyun: uçak turu tamamlayıp başlangıç çizgisine gelir
      if (st.g !== v.game) { st.g = v.game; st.sc = sc; st.wob = 0; if (st.th - th0 > 0.05) st.th -= TAU; }
      if (sc < st.sc - 0.5) st.wob = 1;
      st.sc = sc;
      const thT = th0 + TAU * clamp(sc / (qs * 1000), 0, 1);
      const prev = st.th;
      st.th = damp(st.th, thT, 1.8, dt);
      st.vel = (st.th - prev) / Math.max(1e-4, dt);
      st.wob = Math.max(0, st.wob - dt * 0.5);
      const w = this.planePos(i, st);
      st.w = w;
      if (!this.X || this.flat) return;
      // iz: ilerlerken beyaz duman çizgisi; yanlışta gri duman
      const tail = this.planeTail(w, st, ss);
      if (st.vel > 0.06) { st.trT -= dt; if (st.trT <= 0) { st.trT = 0.03; this.burst(tail[0], tail[1], tail[2], 1, [1, 1, 1], 0.01, 0.024 * ss, true, 0.6, 0); } }
      if (st.wob > 0.25) { st.smT -= dt; if (st.smT <= 0) { st.smT = 0.07; this.burst(tail[0], tail[1], tail[2], 1, [[0.32, 0.32, 0.36], [0.45, 0.45, 0.5]], 0.05, 0.05 * ss, false, 0.9, -0.3); } }
      void t;
    });
    [...this.pl.keys()].forEach((id) => { if (!keep.has(id)) this.pl.delete(id); });
  }
  // uçağın yeri ve duruşu: [x, y, z, yaw, roll, pitch]
  planePos(i, st) {
    const n = Math.max(1, this.seats.length), ss = this.ss, t = this.time;
    const cols = Math.min(3, n), rows = Math.ceil(n / cols);
    const lane = (i % cols) - (cols - 1) / 2, row = Math.floor(i / cols) - (rows - 1) / 2;
    const r = (ORB + lane * LANE) * ss, th = st.th - 0.07 * (Math.abs(lane) + Math.abs(row) * 0.6);   // aynı puandakiler V düzeninde
    const y = this.gC[1] + row * LANE * 0.95 * ss + Math.sin(t * 2.1 + i * 1.7) * 0.012 * ss;
    const yaw = Math.atan2(Math.sin(th), -Math.cos(th));
    let roll = -0.28 + Math.sin(t * 1.3 + i) * 0.05 + Math.sin(t * 17 + i) * 0.55 * st.wob;
    const v = this.view;
    if (v && v.phase === 'final' && (v.champ || []).includes(i)) { const u = ((t - (this.finT || 0)) % 3.2) / 0.9; if (u < 1) roll -= TAU * easeIO(u); }
    const pitch = Math.sin(t * 1.7 + i * 0.9) * 0.05 - st.wob * 0.12;
    return [Math.cos(th) * r, y, Math.sin(th) * r, yaw, roll, pitch];
  }
  planeTail(w, st, ss) { const fx = -Math.sin(w[3]), fz = -Math.cos(w[3]); return [w[0] - fx * 0.12 * ss, w[1], w[2] - fz * 0.12 * ss]; }

  /* ---------- karakterler ---------- */
  avatarsStep(dt) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const P = this.pinState();
    const mid = P ? this.pinHead(P) : this.gC;
    const sh = this.shown();
    const left = (v.endsAt || 0) - now;
    const champ = v.phase === 'final' ? v.champ || [] : [];
    this.seats.forEach((p, i) => {
      const a = this.av.get(p.id);
      if (!a) return;
      const idle = a.byI || (a.byI = { lt: 0, look: null });
      const idleLook = (pC = 0.25) => {
        idle.lt -= dt;
        if (idle.lt <= 0 || !idle.look) {
          const L = this.seats.map((_, k) => (k !== i ? this.avatarAt(k)?.headW : null)).filter(Boolean);
          idle.lt = 1.1 + Math.random() * 2.4;
          idle.look = L.length && Math.random() > pC ? L[Math.floor(Math.random() * L.length)] : mid;
        }
        return idle.look;
      };
      const plane = this.pl.get(p.id);
      const myPlane = plane && plane.w ? plane.w : mid;
      if (v.phase === 'question') {
        const did = !!(v.picked || [])[i];
        if (did) {
          const lt = this.lockSeen.get(p.id);
          if (lt != null && t - lt < 0.9) { a.pose('rest', { t }); a.pointAt(mid, 1); a.shape[1] = 'point'; a.expr = 'grin'; a.look = mid; return; }
          a.pose('clasp', { t }); a.expr = 'grin'; a.look = idleLook(0.45); return;
        }
        if ((v.inRound || [])[i]) {
          const hurry = left < 4000;
          a.pose(hurry ? (hs(i, v.q) < 0.5 ? 'bite' : 'headgrab') : Math.floor(t / 3.2 + i) % 3 === 0 ? 'rest' : 'chin', { t });
          a.expr = hurry ? 'tense' : Math.floor(t / 2.7 + i) % 3 === 0 ? 'o' : 'smile';
          a.look = Math.floor(t / 2.1 + i) % 4 ? mid : idleLook(0.4);
        } else { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(0.3); }
        return;
      }
      if (v.phase === 'reveal') {
        const c = (v.choices || [])[i];
        if (!(v.inRound || [])[i]) { a.pose('rest', { t }); a.expr = 'smile'; a.look = idleLook(); return; }
        if (!sh) { a.pose('clasp', { t }); a.expr = 'tense'; a.look = mid; return; }
        const su = t - (this.vT ?? t);
        if (c === v.correct) { a.pose(su < 2.2 ? 'cheer' : 'clap', { t }); a.expr = 'laugh'; a.look = su < 2.6 ? myPlane : idleLook(0.3); return; }
        if (c >= 0) { a.pose(su < 1.6 ? (hs(i, v.q) < 0.5 ? 'facepalm' : 'headgrab') : 'slump', { t }); a.expr = su < 1.6 ? 'wince' : 'sad'; a.look = su < 2.4 ? myPlane : idleLook(0.2); return; }
        a.pose('shrug', { t }); a.expr = 'o'; a.look = mid;
        return;
      }
      if (v.phase === 'final') {
        const u = t - (this.finT || 0);
        const pl = placeOf(v, i), medal = pl <= 3 && (v.scores || [])[i] > 0;
        if (champ.includes(i) && u > 0.6) { a.pose('cheer', { t }); a.expr = 'laugh'; a.look = myPlane; }
        else if (medal && u > 0.6) { a.pose(Math.floor(u / 2.2 + i) % 2 === 0 ? 'wave' : 'clap', { t }); a.expr = 'laugh'; a.look = idleLook(); }
        else { a.pose(Math.floor(u / 2.5 + i) % 2 === 0 ? 'clap' : 'rest', { t }); a.expr = 'smile'; a.look = idleLook(); }
        return;
      }
      a.pose(Math.floor(t / 6 + i) % 3 === 0 ? 'chin' : 'rest', { t });
      a.expr = 'smile';
      a.look = Math.floor(t / 3 + i) % 3 ? this.gC : idleLook();
    });
  }

  /* ---------- zamanlama, kamera, sesler ---------- */
  tick(dt) {
    const v = this.view, c = this.cam;
    if (!v) return;
    const land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const t = this.time, now = this.sNow();
    const ssT = clamp((this.R * Math.min(1, this.kz) - 0.6) / 0.8, 0.75, 1.5);
    this.ssV = this.ssV ? damp(this.ssV, ssT, 3, dt) : ssT;
    // gerçek geçen süre (kit dt'yi 0,1 sn ile sınırlar; yavaş cihazda uçaklar ve küre yine de zamanında yerine otursun)
    const pn = performance.now();
    const kdt = Math.max(dt, this.lastPn ? Math.min(1, (pn - this.lastPn) / 1000) : dt);
    this.lastPn = pn;
    if (v.phase === 'reveal' && !this.vDone && this.revT() >= VERD_T) { this.vDone = true; this.onVerdict(); }
    const left = (v.endsAt || 0) - now;
    if (v.phase === 'question' && v.amIn && v.myChoice < 0) {
      if (left > 0 && left < 4500) { const sec = Math.ceil(left / 1000); if (sec !== this.tickSec) { this.tickSec = sec; this.fx('tick', 0.5); } }
      if (left <= 0 && !this.upSeen) { this.upSeen = true; this.fx('timeup'); }
    }
    if (v.phase === 'final' && !this.champFx && t - (this.finT || 0) >= 1.1) {
      this.champFx = true;
      if ((v.champ || []).length) {
        this.fx('champ');
        const nm = (v.champ || []).map((i) => esc(nm0(v.seats[i]?.n))).join(' & ');
        this.msg(`🏆 ${nm}`, 'big');
        (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (this.X && a && a.headW) this.burst(a.headW[0], a.headW[1] + 0.5, a.headW[2], 60, [[1, 0.85, 0.3], [1, 1, 1], [0.45, 0.8, 1]], 2.6, 0.04, false, 2.2, 2.4); });
      }
    }
    this.stepGlobe(kdt);
    this.stepPlanes(kdt);
    // iğne saplandı
    if (this.pinAt != null && this.pinFx !== this.pinKey && now >= this.pinAt + 300) {
      this.pinFx = this.pinKey;
      this.fx('pin');
      const P = this.pinState();
      if (P && this.X) this.burst(P.p[0], P.p[1], P.p[2], 16, [[1, 0.3, 0.35], [1, 1, 1], [1, 0.85, 0.35]], 0.9, 0.025 * this.ss, true, 0.7, 1.5);
    }
    // kamera
    let zoom = 1, pa = 0, yawC = 0, bp = this.barH || 300, H = [0, TABLE_Y + 0.35, 0], sx = land ? 0.36 : 0.5, sy = land ? 0.5 : 0.36;
    if (v.phase === 'question' || v.phase === 'reveal') {
      // küre ekranda hep aynı büyüklükte görünsün: kalabalık masada (büyük masa, ölçek tavanda) daha yakından
      const zk = clamp((this.ss / 1.5) * (2.26 / Math.max(1.5, this.Rs)), 0.68, 1.15);
      pa = land ? -0.02 : -0.08; bp = Math.max(170, this.barH || 300); sx = land ? 0.27 : 0.5;
      if (land) { zoom = 0.62 * zk; sy = 0.5; }
      else {
        // dikey ekran: küre, alttaki cevap kutusunun üstünde kalan boşluğa yerleşir (uzun şıklarda kutu büyür, küre küçülür)
        const vh = this.vh || 844, free = Math.max(160, vh - bp - 100);
        zoom = 0.42 * zk * clamp(430 / free, 1, 1.7);
        sy = clamp((100 + free * 0.6) / vh, 0.2, 0.5);
      }
      H = [0, TABLE_Y + GY * this.ss, 0];
    } else if (v.phase === 'final') {
      const card = now - (v.finAt || 0) >= this.cardMs();
      zoom = land ? 1.05 : card ? 0.9 : 0.7; bp = card ? 200 : 300; sy = land ? 0.5 : card ? 0.24 : 0.42; sx = land ? (card ? 0.27 : 0.5) : 0.5; yawC = Math.sin(t * 0.15) * 0.12; H = [0, TABLE_Y + 0.5, 0];
    } else { zoom = land ? 0.95 : 0.9; bp = 300; yawC = Math.sin(t * 0.13) * 0.08; sy = land ? 0.5 : 0.3; }
    if (Math.abs(bp - this.cfg.botPx) > 12) { this.cfg.botPx = bp; this.fitKey = ''; }
    const [fx, fy, fz] = this.aimAt(H, sx, sy, yawC, pa);
    c.yaw += angDiff(yawC, c.yaw) * (1 - Math.exp(-1.7 * dt));
    c.zoom = damp(c.zoom, zoom, 2.2, dt);
    c.fx = damp(c.fx, fx, 2.6, dt); c.fz = damp(c.fz, fz, 2.6, dt); c.fy = damp(c.fy, fy, 2.6, dt);
    c.pitchAdd = damp(c.pitchAdd, pa, 2.4, dt);
    this.placePts();
  }
  aimAt(H, sx, sy, yaw, pa) {
    const c = this.cam, land = (this.vw || 1) > (this.vh || 1) * 1.1;
    const p = (land ? 0.78 : 0.98) + pa, asp = (this.vw || 1) / (this.vh || 1);
    const t = Math.tan(c.fov / 2) * c.D;
    const up = [-Math.sin(yaw) * Math.sin(p), Math.cos(p), -Math.cos(yaw) * Math.sin(p)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const dy = (0.5 - sy) * 2 * t, dx = (0.5 - sx) * 2 * t * asp;
    return [H[0] - up[0] * dy + rt[0] * dx, H[1] - up[1] * dy - 0.7, H[2] - up[2] * dy + rt[2] * dx];
  }
  cardMs() { return 3400; }
  placePts() {
    const v = this.view;
    const rev = !!v && v.phase === 'reveal' && this.vDone && !this.flat;
    for (let i = 0; i < this.ptEl.length; i++) {
      const e = this.ptEl[i];
      if (!e) continue;
      if (!rev) { if (e.classList.contains('go')) e.className = 'by-pt'; continue; }
      if (!e.classList.contains('go')) continue;
      const a = this.avatarAt(i);
      if (!a || !a.headW) continue;
      const q = this.project(a.headW[0], a.headW[1] + 0.42, a.headW[2]);
      if (q) { e.style.left = `${clamp(q[0], 40, (this.vw || 390) - 40).toFixed(1)}px`; e.style.top = `${clamp(q[1], 64, (this.vh || 844) - 40).toFixed(1)}px`; }   // ekrandan taşmasın
    }
  }
  ringState(k, t, now) {
    const v = this.view;
    if (!v || v.phase === 'intro' || v.phase === 'final') { const on = (k + Math.floor(t * 8)) % 6 < 2; return [on, OPT3[Math.floor(k / 6) % 4]]; }
    if (v.phase === 'question') {
      if (v.closing) return [Math.floor(t * 8) % 2 === 0, WHITE3];
      const left = Math.max(0, (v.endsAt || 0) - now) / (v.answerMs || 1e4);
      const on = k < Math.ceil(left * RING_N - 0.001) && (left > 0.2 || Math.floor(t * 5) % 2 === 0 || k < Math.ceil(left * RING_N) - 1);
      return [on, left > 0.55 ? GREEN3 : left > 0.27 ? OPT3[1] : RED3];
    }
    if (!this.vDone) return [(k + Math.floor(t * 16)) % 4 === 0, WHITE3];
    return [true, OPT3[v.correct] || WHITE3];
  }

  /* ---------- çizim ---------- */
  sceneGame(D, shadow) {
    const Wd = this.W, v = this.view;
    if (!Wd || !Wd.byPed || !v) return;
    const m = this.mats.b, T = this.T, t = this.time, now = this.sNow(), ss = this.ss;
    M.set(m, 0, TABLE_Y + 0.002, 0, 0, 0, 0, ss);
    D(Wd.byPed, m, T.obj);
    if (!shadow) {
      D(Wd.byLens, m, CYAN3);
      for (let k = 0; k < RING_N; k++) {
        const a = Math.PI / 2 - (k / RING_N) * TAU;
        const [on, col] = this.ringState(k, t, now);
        M.set(m, Math.cos(a) * RING_R * ss, TABLE_Y + 0.024 * ss, Math.sin(a) * RING_R * ss, -a + Math.PI / 2, 0, 0, ss);
        D(on ? Wd.bySegL : Wd.bySeg, m, on ? col : OFF3);
      }
    }
    // kürenin gölgesi (küre dokulu geçişte çizilir)
    if (shadow) D(Wd.byProxy, this.gM, T.obj);
    // iğne
    const P = this.pinState();
    if (P) {
      const ry = Math.atan2(P.n[0], P.n[2]), rx = Math.acos(clamp(P.n[1], -1, 1));
      M.set(m, P.p[0] + P.n[0] * P.drop, P.p[1] + P.n[1] * P.drop, P.p[2] + P.n[2] * P.drop, ry, rx, 0, ss);
      D(Wd.byPin, m, T.obj);
    }
    // uçaklar
    const prop = t * 48;
    this.seats.forEach((p, i) => {
      const st = this.pl.get(p.id);
      if (!st || !st.w) return;
      const w = st.w, s = PLANE_S * ss;
      M.set(m, w[0], w[1], w[2], w[3], w[5], w[4], s);
      D(Wd.byBody, m, T.obj);
      D(Wd.byPaint, m, this.colOf(i));
      if (!shadow) { M.set(m, w[0], w[1], w[2], w[3], w[5], w[4] + prop + i, s); D(Wd.byProp, m, T.obj); }
    });
    // final: birincinin önünde kupa
    if (v.phase === 'final' && !shadow) {
      (v.champ || []).forEach((i) => {
        const a = this.avatarAt(i);
        if (!a) return;
        const q = this.seatW(a, -0.12, TABLE_Y + 0.004, 0.55);
        const u = clamp((t - (this.finT || 0) - 0.9) / 0.6, 0, 1);
        M.set(m, q[0], q[1] + (1 - u) * 0.4, q[2], t * 0.8, 0, 0, 1.1 * u + 0.001);
        D(Wd.trophy, m, T.obj);
      });
    }
  }
  colOf(i, out = this.tint) { const p = this.seats[i]; const c = rgb3(pcol(p ? p.c : 0)); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  // dokulu: dünya küresi ve etiket
  drawTex() {
    const X = this.X, gl = X.gl, Wd = this.W, v = this.view;
    if (!Wd || !Wd.byGlobe || !v || !this.mapTex) return;
    const mc = this.mats.c, t = this.time, ss = this.ss;
    gl.uniform1f(X.tex.u.uSelf, 0.3);
    gl.bindTexture(gl.TEXTURE_2D, this.mapTex);
    drawMesh(X, Wd.byGlobe, this.gM, ONE3);
    const L = this.labelSpec();
    if (L) {
      if (L.key !== this.lblKey) { this.lblKey = L.key; try { drawLabel(this.lblCv, L.icon, L.l1, L.l2, L.acc); updateTexture(X, this.lblTex, this.lblCv); } catch (e) { console.warn('[byr] etiket', e); } }
      const k = backOut((this.sNow() - L.t0) / 320);
      if (k > 0.01) {
        const V = this.mats.V, up = [V[1], V[5], V[9]];
        let base;
        if (L.anchor === 'pin') { const P = this.pinState(); base = P ? this.pinHead(P) : null; } else base = [this.gC[0] + up[0] * GR * ss, this.gC[1] + up[1] * GR * ss, this.gC[2] + up[2] * GR * ss];
        if (base) {
          const s = 1.2 * ss * k, off = LBL_H * 0.5 * s + 0.035 * ss + Math.sin(t * 1.6) * 0.008 * ss;
          const p = [base[0] + up[0] * off, base[1] + up[1] * off, base[2] + up[2] * off];
          const c = this.cam, dx = c.ex - c.tx, dy = c.ey - c.ty, dz = c.ez - c.tz;
          M.set(mc, p[0], p[1], p[2], Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)), 0, s);
          gl.uniform1f(X.tex.u.uSelf, 0.7);
          gl.bindTexture(gl.TEXTURE_2D, this.lblTex);
          drawMesh(X, Wd.byLbl, mc, ONE3);
        }
      }
    }
    gl.uniform1f(X.tex.u.uSelf, 0);
  }
  glow(m, p, s, col, al) {
    const cv = [this.cam.ex - p[0], this.cam.ey - p[1], this.cam.ez - p[2]];
    M.set(m, p[0], p[1], p[2], Math.atan2(cv[0], cv[2]), Math.atan2(Math.hypot(cv[0], cv[2]), cv[1]), 0, s, 1, s);
    drawMesh(this.X, this.res.glow, m, col, al);
  }
  drawFx(F, m) {
    const v = this.view;
    if (!v || !this.res) return;
    const t = this.time, now = this.sNow(), ss = this.ss;
    for (let k = 0; k < RING_N; k++) {
      const [on, col] = this.ringState(k, t, now);
      if (!on) continue;
      const a = Math.PI / 2 - (k / RING_N) * TAU;
      this.glow(m, [Math.cos(a) * RING_R * ss, TABLE_Y + 0.04 * ss, Math.sin(a) * RING_R * ss], 0.12 * ss, col, 0.3);
    }
    // atmosfer ve ışık merceği
    this.glow(m, this.gC, GR * ss * 1.55, SKY3, 0.2);
    this.glow(m, [0, TABLE_Y + 0.12 * ss, 0], 0.32 * ss, CYAN3, 0.3);
    // iğnenin dibinde nabız gibi ışık
    const P = this.pinState();
    if (P && P.u >= 1) this.glow(m, [P.p[0] + P.n[0] * 0.01, P.p[1] + P.n[1] * 0.01, P.p[2] + P.n[2] * 0.01], (0.07 + 0.025 * Math.sin(t * 5)) * ss, RED3, 0.5);
    if (v.phase === 'final') (v.champ || []).forEach((i) => { const a = this.avatarAt(i); if (a && a.headW) this.glow(m, [a.headW[0], a.headW[1] + 0.1, a.headW[2]], 0.9, GOLD3, 0.18 + 0.05 * Math.sin(t * 3)); });
  }
  // yumuşak parçacıklar: yörünge noktaları, başlangıç çizgisi, ışık huzmesi, birincinin uçağı
  extraParts(V, emit) {
    const v = this.view;
    if (!v) return;
    const ss = this.ss, t = this.time, y = this.gC[1];
    const n = 64, r = ORB * ss;
    for (let k = 0; k < n; k++) {
      const a = this.th0() + (k / n) * TAU;
      emit(Math.cos(a) * r, y, Math.sin(a) * r, 0.016 * ss, 0.55, 0.85, 1, 0.22 + 0.12 * Math.max(0, Math.sin(a * 3 - t * 2)), true);
    }
    const cols = Math.min(3, Math.max(1, this.seats.length));
    for (let k = -1; k <= cols; k++) {
      const rr2 = (ORB + (k - (cols - 1) / 2) * LANE) * ss;
      emit(Math.cos(this.th0()) * rr2, y, Math.sin(this.th0()) * rr2, 0.026 * ss, 1, 0.82, 0.3, 0.55, true);
    }
    // kaideden küreye ışık huzmesi
    const y0 = TABLE_Y + 0.12 * ss, y1 = y - GR * ss * 0.85;
    for (let k = 0; k < 5; k++) { const u = k / 4; emit(0, lerp(y0, y1, u), 0, (0.1 + 0.18 * u) * ss, 0.42, 0.88, 1, 0.1 + 0.04 * Math.sin(t * 3 + k), true); }
    if (v.phase === 'final') (v.champ || []).forEach((i) => { const st = this.pl.get(this.seats[i]?.id); if (st && st.w) emit(st.w[0], st.w[1], st.w[2], 0.16 * ss, 1, 0.85, 0.3, 0.4 + 0.15 * Math.sin(t * 4), true); });
  }

  /* ---------- arayüz ---------- */
  timerBar() { return '<div class="by-tm"><i></i></div>'; }
  modeSeg(v) { return `<div class="by-seg" role="group" aria-label="Durak sayısı"><button data-act="by-mode" data-m="kisa" class="${v.mode !== 'uzun' ? 'on' : ''}">🛫 Kısa · 12 durak</button><button data-act="by-mode" data-m="uzun" class="${v.mode === 'uzun' ? 'on' : ''}">🌐 Uzun · 24 durak</button></div>`; }
  dotsOf(k) {
    const v = this.view;
    return (v.choices || []).map((c, i) => (c === k ? `<i style="--pc:${pcol(v.seats[i]?.c ?? 0)}" title="${esc(nm0(v.seats[i]?.n || ''))}"></i>` : '')).join('');
  }
  rankLine(v) {
    const R = (v.rank || []).slice(0, 3);
    if (v.me >= 0 && !R.includes(v.me)) R.push(v.me);
    return R.map((i) => `<span class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><i></i>${placeOf(v, i)}. ${esc(nm0(v.seats[i]?.n || '')).slice(0, 12)} · ${fmt((v.scores || [])[i])}</span>`).join('');
  }
  // şık metni: ülke şıklarında bayrak (başkent şıklarında bayrak cevabı ele verir, gösterilmez)
  optTx(v, k) {
    const s = (v.options || [])[k] || '';
    const fl = v.kind === 'cty' ? flagFor(s) : '';
    return `${fl ? `<span class="fl">${fl}</span>` : ''}<span>${esc(s)}</span>`;
  }
  head(v) {
    const cap = v.kind === 'cap';
    const big = cap ? `${flagFor(v.big) ? `<span class="fl">${flagFor(v.big)}</span>` : ''}<span>${esc(v.big)}</span>` : `<span class="fl">📍</span><span>${esc(v.big)}</span>`;
    return `<small><span class="st">✈️ DURAK ${v.q}/${v.qs}</span>${v.phase === 'reveal' ? '<span>· CEVAP</span>' : ''}</small><div class="big">${big}</div><div class="sub">${cap ? 'Bu ülkenin başkenti neresi?' : 'Hangi ülkenin başkenti?'}</div>`;
  }
  bar() {
    const v = this.view;
    if (!v) return;
    let key = 'none', html = '';
    const host = this.ctx.isHost;
    const now = this.sNow();
    if (v.phase === 'question' || v.phase === 'reveal') {
      const opts = v.options || [];
      const one = opts.some((o) => String(o).length > 17);
      if (v.phase === 'question') {
        const mine = v.myChoice;
        const opt = (k) => {
          const cls = mine === k ? ' on' : mine >= 0 ? ' off' : '';
          const dis = !v.amIn || mine >= 0 || v.closing;
          return `<button class="by-o${cls}" data-act="by-ans" data-c="${k}" style="--sc:${OPTC[k]}" ${dis ? 'disabled' : ''}><span class="lt">${OPT[k].l}</span><span class="tx">${this.optTx(v, k)}</span>${mine === k ? '<span class="tg">🔒 Cevabın</span>' : ''}</button>`;
        };
        const z = !v.amIn ? '👀 Bu durakta izliyorsun' : v.closing ? 'Herkes cevapladı!' : mine >= 0 ? '🔒 Cevabın kilitlendi' : '⚡ Hızlıya çok puan · <b>yanlış −200</b>';
        key = `q|${v.game}|${v.q}|${mine}|${v.answered}|${v.total}|${v.closing}|${v.amIn}`;
        html = `<div class="by-box"><div class="by-q">${this.head(v)}</div>
          <div class="by-four${one ? ' one' : ''}">${[0, 1, 2, 3].map(opt).join('')}</div>
          <div class="by-ft"><span class="n">✋ ${v.answered}/${v.total}</span><span class="z">${z}</span></div>
          ${this.timerBar()}</div>`;
      } else {
        const sh = this.shown();
        const me = v.me, mine = me >= 0 ? (v.choices || [])[me] : -1, inR = me >= 0 && (v.inRound || [])[me];
        const canNext = sh && host && now - (v.at || 0) >= (v.nextMinMs || 2500);
        const last = v.q >= v.qs;
        const opt = (k) => {
          let cls = '', tg = '';
          if (sh) { if (k === v.correct) { cls = ' ok'; tg = '<span class="tg">✓ Doğru</span>'; } else if (k === mine) { cls = ' no'; tg = '<span class="tg">✗ Senin</span>'; } else cls = ' dim'; }
          else if (k === mine) { cls = ' on'; tg = '<span class="tg">🔒 Cevabın</span>'; }
          return `<button class="by-o${cls}" style="--sc:${OPTC[k]}" disabled><span class="lt">${OPT[k].l}</span><span class="tx">${this.optTx(v, k)}</span>${sh ? `<span class="dots">${this.dotsOf(k)}</span>` : ''}${tg}</button>`;
        };
        let res;
        const g = me >= 0 ? (v.gains || [])[me] || 0 : 0;
        if (!sh) res = '<span class="m">✈️ Varış noktası açılıyor…</span>';
        else if (!inR) res = `<span class="m">${v.right ? `${v.right} kişi bildi` : 'Kimse bilemedi'}</span>`;
        else if (mine === v.correct) res = `<span class="g">${signed(g)} puan</span>${v.fastest === me ? '<em>⚡ En hızlı</em>' : ''}${(v.ms || [])[me] >= 0 ? `<em>⏱ ${sec1(v.ms[me])} sn</em>` : ''}`;
        else if (mine >= 0) res = `<span class="r">${g < 0 ? `${signed(g)} puan` : 'Bilemedin'}</span><span class="m">· ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        else res = `<span class="m">⏰ Süre doldu · ${v.right ? `${v.right} kişi bildi` : 'kimse bilemedi'}</span>`;
        const capital = v.kind === 'cap' ? opts[v.correct] : v.big;
        const fact = sh && v.country ? `<div class="by-fact">${flagFor(v.country) ? `<span class="fl">${flagFor(v.country)}</span> ` : ''}${esc(v.country)} · başkenti <b>${esc(capital || '')}</b></div>` : '';
        key = `r|${v.game}|${v.q}|${sh}|${canNext}`;
        html = `<div class="by-box"><div class="by-q">${this.head(v)}</div>
          <div class="by-four${one ? ' one' : ''}">${[0, 1, 2, 3].map(opt).join('')}</div>
          <div class="by-res">${res}</div>${fact}
          <div class="by-rk">${sh ? this.rankLine(v) : '&nbsp;'}</div>
          ${canNext ? `<div class="by-row"><button class="by-b" data-act="by-next">${last ? 'Sonuçlara geç 🏁' : 'Sıradaki durak ▶'}</button></div>` : ''}
          ${this.timerBar()}</div>`;
      }
    }
    this.setBar(key, html);
  }
  panel() {
    const v = this.view;
    if (!v) return;
    let key = '', html = '';
    if (v.phase === 'intro') {
      const n = (v.seats || []).filter((p) => p.on).length;
      key = `intro|${v.mode}|${n}`;
      html = `<div class="card by-intro">
        <div class="tt">🌍 Başkent Yarışı</div>
        <div class="sub">Ülke gelir başkentini bul, başkent gelir ülkesini bul! Hızlı bilen uçağıyla dünyayı turlar.</div>
        <div class="by-ru"><div style="background:#d6efff"><b>⏱️</b>10 saniye</div><div style="background:#fff0c2"><b>⚡</b>Hızlıya çok puan</div><div style="background:#ffd9de"><b>❌</b>Yanlışa −200</div></div>
        ${this.modeSeg(v)}
        <button class="kb" data-act="by-start" ${n < 2 ? 'disabled' : ''}>Başla ▶</button>
        <div class="hint">${n < 2 ? 'En az 2 kişi lazım: masadakileri çağır!' : 'Herkesin bir uçağı var: kazandığın puan kadar dünyanın çevresinde yol alırsın.'}</div>
      </div>`;
    } else if (v.phase === 'final' && this.sNow() - (v.finAt || 0) >= this.cardMs()) {
      const wait = this.sNow() - (v.finAt || 0) < (v.minMs || 3000);
      const S = v.stats || [], R = v.rank || [];
      const nm = (i) => esc(nm0(v.seats[i]?.n || ''));
      const pod = (i, cls, h, medal) => (i == null ? '<div></div>' : `<div><p>${nm(i)}</p><small>${fmt(v.scores[i])}</small><u style="height:${h};background:${cls}">${medal}</u></div>`);
      const aw = [];
      if (v.flash) aw.push(`<div><b>⚡</b><span>En hızlı cevap<em>${nm(v.flash.i)} · ${sec1(v.flash.ms)} sn</em></span></div>`);
      if (v.sharp) aw.push(`<div><b>🎯</b><span>En isabetli<em>${nm(v.sharp.i)} · ${v.sharp.right}/${v.sharp.right + v.sharp.wrong}</em></span></div>`);
      if (!(v.champ || []).length) aw.push('<div><b>🤯</b><span>Bu turda kimse puan alamadı!</span></div>');
      const rows = R.map((i) => `<div class="${i === v.me ? 'me' : ''}" style="--pc:${pcol(v.seats[i]?.c ?? 0)}"><b>${placeOf(v, i)}</b><i></i><span>${nm(i)}</span><em>✅ ${S[i]?.right ?? 0} · ❌ ${S[i]?.wrong ?? 0} · ${fmt(v.scores[i])}</em></div>`).join('');
      key = `final|${v.game}|${v.mode}|${wait}|${this.ctx.isHost}`;
      html = `<div class="card">
        <div class="tt">🏁 Dünya turu bitti!</div>
        <div class="sub">${v.qs} durakta kim ne kadar yol aldı?</div>
        <div class="by-pod">${pod(R[1], '#dfe3f0', '34px', '🥈')}${pod(R[0], '#ffd23f', '46px', '🥇')}${pod(R[2], '#f0b88a', '24px', '🥉')}</div>
        ${aw.length ? `<div class="by-aw">${aw.join('')}</div>` : ''}
        <div class="by-tb">${rows}</div>
        ${this.modeSeg(v)}
        <div class="row2"><button class="kb" data-act="by-start" ${wait ? 'disabled' : ''}>🔁 Yeni tur</button>${this.ctx.isHost ? '<button class="kb alt" data-act="exit-game">← Oyunlar</button>' : ''}</div>
      </div>`;
    }
    this.setPanel(key, html, true);
  }
  ui() {
    const v = this.view;
    if (!v) return;
    const now = this.sNow();
    const left = (v.endsAt || 0) - now;
    const TOP = { question: `${v.q}/${v.qs} · ✋ ${v.answered ?? 0}/${v.total ?? 0} · ⏱ ${mmss(left)}`, reveal: `${v.q}/${v.qs} · ${this.shown() ? `✅ ${v.right ?? 0} kişi bildi` : '✈️ varış noktası'}` };
    this.top(TOP[v.phase] || '');
    const tm = this.el.bar.querySelector('.by-tm i');
    const tot = v.phase === 'question' ? v.answerMs || 1e4 : v.phase === 'reveal' ? v.revealMs || 5e3 : 0;
    if (tm && tot) {
      const u = clamp(left / tot, 0, 1);
      tm.style.transform = `scaleX(${u.toFixed(3)})`;
      if (v.phase === 'question') tm.style.setProperty('--tc', left > 5500 ? '#2fbf71' : left > 2700 ? '#f2b200' : '#ff4f5e');
      else tm.style.setProperty('--tc', '#5fb8ff');
    }
    const bx = this.el.bar.firstElementChild;
    const bh = bx ? Math.round(bx.getBoundingClientRect().height + 28) : 200;
    if (Math.abs(bh - (this.barH || 0)) > 10) this.barH = bh;
    const sh = this.shown();
    this.seats.forEach((p, i) => {
      const o = this.lbl.get(p.id);
      if (!o) return;
      let x = '';
      if (v.phase !== 'intro') x += `<span class="by-sc">${fmt(this.dispScore(i))}</span>`;
      if (v.phase === 'question' && (v.picked || [])[i]) x += '<span>🔒</span>';
      if (v.phase === 'reveal' && sh && (v.inRound || [])[i]) { const c = (v.choices || [])[i]; if (c >= 0) x += `<span class="by-v ${c === v.correct ? 'y' : 'n'}">${c === v.correct ? '✓' : '✗'}</span>${c === v.correct && v.fastest === i ? '<span>⚡</span>' : ''}`; }
      if (v.phase === 'final') { const pl = placeOf(v, i); if (pl <= 3 && (v.scores || [])[i] > 0) x += `<span>${['🥇', '🥈', '🥉'][pl - 1]}</span>`; }
      if (o.byK !== x) {
        o.byK = x;
        let el = o.lbl.querySelector('.by-x');
        if (!el) { el = document.createElement('span'); el.className = 'by-x'; o.lbl.appendChild(el); }
        el.innerHTML = x;
        o.lblW = 0;
      }
    });
    this.bar();
    this.panel();
  }
  syncLabels() {
    super.syncLabels();
    for (const o of this.lbl.values()) if (!o.lbl.querySelector('.by-x')) o.byK = '';
  }

  /* ---------- 2D yedek ---------- */
  flat2() {
    const w = this.vw || 360, h = this.vh || 640, land = w > h * 1.1;
    const top = land ? 70 : 96, bot = land ? h - 12 : Math.max(top + 200, h - (this.barH || 300) - 6);
    const aw = land ? w * 0.46 : w;
    const r = Math.max(60, Math.min(aw * 0.4, ((bot - top) / 2 - 40) / 0.8));
    return { cx: land ? aw / 2 : w / 2, cy: (top + bot) / 2 - 8, r, w, h };
  }
  flatPos(i) { const L = this.flat2(), a = this.seatAngle(i); return [L.cx + Math.cos(a) * L.r, L.cy + Math.sin(a) * L.r * 0.8]; }
  draw2d() {
    const g = this.g2;
    if (!g) return;
    const cv = this.el.cv;
    const L = this.flat2(), w = L.w, h = L.h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b1622'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16485e';
    g.beginPath(); g.ellipse(L.cx, L.cy, L.r * 0.86, L.r * 0.68, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
    this.draw2dGame(g, L);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const v = this.view;
    this.seats.forEach((p, i) => {
      const [x, y] = this.flatPos(i);
      g.fillStyle = pcol(p.c);
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.lineWidth = i === this.me ? 4 : 2; g.strokeStyle = i === this.me ? '#ffd23f' : '#1c1633'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui';
      g.fillText(nm0(p.n).slice(0, 10), x, y + 31);
      if (v && v.phase !== 'intro') { g.font = '900 11px system-ui'; g.fillStyle = '#cfeaff'; g.fillText(fmt(this.dispScore(i)), x, y + 45); }
    });
  }
  // 2D: düz dünya haritası, iğne, uçakların eliptik pisti
  map2geom(L) {
    const mw = Math.min(L.r * 1.12, L.w * 0.8), mh = mw / 2;
    return { mw, mh, mx: L.cx - mw / 2, my: L.cy - mh / 2 - 4 };
  }
  draw2dGame(g, L) {
    const v = this.view;
    if (!v) return;
    const t = this.time, now = this.sNow();
    const G = this.map2geom(L);
    if (!this.map2) { try { this.map2 = document.createElement('canvas'); this.map2.width = 1024; this.map2.height = 512; paintWorld(this.map2); } catch { this.map2 = null; } }
    // süre noktaları (haritanın çevresinde)
    for (let k = 0; k < RING_N; k++) {
      const a = -Math.PI / 2 + (k / RING_N) * TAU;
      const [on, col] = this.ringState(k, t, now);
      g.fillStyle = on ? `rgb(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)})` : '#1d3a52';
      g.beginPath(); g.arc(L.cx + Math.cos(a) * (G.mw / 2 + 10), G.my + G.mh / 2 + Math.sin(a) * (G.mh / 2 + 10), 3, 0, TAU); g.fill();
    }
    g.save();
    rr(g, G.mx, G.my, G.mw, G.mh, 10); g.clip();
    if (this.map2) g.drawImage(this.map2, G.mx, G.my, G.mw, G.mh); else { g.fillStyle = '#2f86cf'; g.fillRect(G.mx, G.my, G.mw, G.mh); }
    g.restore();
    g.lineWidth = 3; g.strokeStyle = '#0d1b2a'; rr(g, G.mx, G.my, G.mw, G.mh, 10); g.stroke();
    const toXY = (lat, lon) => [G.mx + ((lon + 180) / 360) * G.mw, G.my + ((90 - lat) / 180) * G.mh];
    // iğne ve etiket
    const loc = v.phase === 'question' ? (v.kind === 'cap' ? CAPS[v.big] : null) : v.phase === 'reveal' ? CAPS[v.country] : null;
    const Lb = this.labelSpec();
    let tagAt = null;
    if (loc && this.pinAt != null && now >= this.pinAt) {
      const [x, y] = toXY(loc[0], loc[1]);
      const u = clamp((now - this.pinAt) / 320, 0, 1), dy = (1 - easeOut(u)) * 40;
      g.strokeStyle = '#dfe3ea'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y - dy); g.lineTo(x, y - 16 - dy); g.stroke();
      g.fillStyle = '#ff3448'; g.beginPath(); g.arc(x, y - 18 - dy, 6, 0, TAU); g.fill();
      g.lineWidth = 2; g.strokeStyle = '#1c1633'; g.stroke();
      if (u >= 1) { g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); g.strokeStyle = '#ff3448'; g.beginPath(); g.arc(x, y, 6 + 2 * Math.sin(t * 5), 0, TAU); g.stroke(); g.globalAlpha = 1; }
      tagAt = [L.cx, G.my + G.mh + 30];
    } else if (Lb && Lb.anchor === 'top') tagAt = [L.cx, G.my + G.mh + 30];   // etiket haritanın altında: üstteki oyuncu adlarını örtmesin
    // uçak pisti ve uçaklar
    const rx = G.mw / 2 + 24, ry = G.mh / 2 + 24, cy = G.my + G.mh / 2;
    g.setLineDash([4, 6]); g.strokeStyle = 'rgba(160,215,255,.45)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(L.cx, cy, rx, ry, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    const a0 = this.th0();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.moveTo(L.cx + Math.cos(a0) * (rx - 9), cy + Math.sin(a0) * (ry - 9)); g.lineTo(L.cx + Math.cos(a0) * (rx + 9), cy + Math.sin(a0) * (ry + 9)); g.stroke();
    const n = Math.max(1, this.seats.length), cols = Math.min(3, n);
    this.seats.forEach((p, i) => {
      const st = this.pl.get(p.id);
      if (!st) return;
      const lane = (i % cols) - (cols - 1) / 2;
      const th = st.th, x = L.cx + Math.cos(th) * (rx + lane * 7), y = cy + Math.sin(th) * (ry + lane * 7);
      const dir = Math.atan2(Math.cos(th) * ry, -Math.sin(th) * rx);
      g.save(); g.translate(x, y); g.rotate(dir + Math.sin(t * 17) * 0.4 * st.wob);
      g.fillStyle = pcol(p.c); g.strokeStyle = '#1c1633'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(9, 0); g.lineTo(-7, -3); g.lineTo(-7, 3); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(2, -9); g.lineTo(-1, 0); g.lineTo(2, 9); g.lineTo(5, 0); g.closePath(); g.fill(); g.stroke();
      g.restore();
    });
    if (Lb && tagAt && now >= Lb.t0) {
      const txt = `${Lb.icon} ${Lb.l1}${Lb.l2 ? ' · ' + Lb.l2 : ''}`;
      g.font = '900 13px system-ui';
      const tw = Math.min(L.w - 20, g.measureText(txt).width + 18);
      const x = clamp(tagAt[0], tw / 2 + 8, L.w - tw / 2 - 8), y = tagAt[1] - 12;
      g.fillStyle = Lb.acc; g.strokeStyle = '#0d1b2a'; g.lineWidth = 2.5;
      rr(g, x - tw / 2, y - 12, tw, 24, 9); g.fill(); g.stroke();
      g.fillStyle = '#0d1b2a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, x, y + 1, tw - 12);
    }
    // puan baloncukları
    if (v.phase === 'reveal' && this.vDone && this.vT != null) {
      (v.gains || []).forEach((gn, i) => {
        if (!gn) return;
        const u = (t - this.vT) / 2.3;
        if (u > 1) return;
        const [x0, y0] = this.flatPos(i);
        g.globalAlpha = 1 - u * u; g.fillStyle = gn > 0 ? '#7dffb0' : '#ff8f9b'; g.font = '900 15px system-ui'; g.textAlign = 'center';
        g.fillText(signed(gn), x0, y0 - 44 - u * 22); g.globalAlpha = 1;
      });
    }
  }
}

let G = null;

export function render(root, ctx) {
  try {
    if (!G || G.dead) G = new CapitalGame(ctx);
    G.update(root, ctx);
  } catch (e) {
    console.error('[byr]', e);
    if (root) root.innerHTML = '<p class="py-16 text-center">Oyun açılırken bir sorun oldu. Sayfayı yenile.</p>';
  }
}

export function destroy() {
  if (G) { G.dispose(); G = null; }
}

export const _dbg = () => ({ G });
