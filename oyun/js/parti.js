/*nfc-js*/(function(){if(window.__nfcSel)return;window.__nfcSel=1;var ok=function(t){return t&&t.closest&&t.closest('input,textarea,select,[contenteditable]')};var game=function(t){return!!(document.getElementById('ky')||(t&&t.closest&&t.closest('#game-root')))};document.addEventListener('selectstart',function(e){if(!ok(e.target))e.preventDefault()},true);document.addEventListener('contextmenu',function(e){if(game(e.target)&&!ok(e.target))e.preventDefault()},true);document.addEventListener('dragstart',function(e){if(!ok(e.target))e.preventDefault()},true);document.addEventListener('selectionchange',function(){var s=window.getSelection&&window.getSelection();if(!s||s.isCollapsed||s.rangeCount===0)return;var a=document.activeElement;if(a&&ok(a))return;s.removeAllRanges()});})();/*/nfc-js*/
// Parti görünümü yardımcıları: zıplayan kafadarlar, lobi kategori çubuğu (yalnızca görsel; oyun mantığına dokunmaz)
(function () {
  // 12 karakter: 3D sahnedeki avatarlarla aynı sıra (renk, ten, saç, aksesuar) — masa3d.js styleOf ile eş tutulur
  var COL = ['#FF3B30', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9F0A', '#FF6FB5', '#40C8E0', '#A8E10C', '#F2F2F7', '#A0522D', '#5E5CE6'];
  var SKIN = ['#f2c39a', '#e6b08a', '#c68a5e', '#f6d3b2', '#a56c46', '#efbd92', '#d79f78', '#ffd9bb', '#8c5a3c', '#ebbb96', '#c48661', '#f3c6a1'];
  var HAIRC = ['#3b2416', '#141011', '#6b3a1f', '#1f1612', '#8a3b1c', '#d8b05a', '#2a1a12', '#8a5a34', '#c9a04e', '#e58fb0', '#141011', '#4a2c1a'];
  var HAIRS = ['short', 'bob', 'cap', 'curly', 'bun', 'spiky', 'long', 'beanie', 'short', 'bob', 'curly', 'bun'];
  var ACC = [[], ['glasses'], [], ['shades'], [], ['headphones'], [], ['shades'], ['headphones'], ['glasses'], [], ['glasses']];
  var AVN = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Pembe', 'Turkuaz', 'Fıstık', 'Beyaz', 'Kahve', 'Lacivert'];
  var INK = '#120e22';
  function dark(hex, k) { var n = parseInt(hex.slice(1), 16), f = function (v) { return Math.round(v * k); }; return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; }
  function buddy(i, cls) {
    i = ((i % 12) + 12) % 12;
    var shirt = COL[i], skin = SKIN[i], hair = HAIRC[i], st = HAIRS[i], acc = ACC[i], back = '', top = '', face = '';
    var shortH = '<path d="M11 27c-2-14 8-22 21-22s23 8 21 22c-5-8-12-11-21-11s-16 3-21 11z" fill="' + hair + '"/>';
    if (st === 'short') top = shortH;
    else if (st === 'bun') top = '<circle cx="32" cy="5" r="6.5" fill="' + hair + '" stroke="' + INK + '" stroke-width="2"/><path d="M10 28C7 12 18 5 32 5s25 7 22 23c-3-6-6-9-9-10-8 4-18 4-27 0-3 2-6 5-8 10z" fill="' + hair + '"/>';
    else if (st === 'bob') top = '<path d="M9 30C5 10 20 3 32 3s27 7 23 27c-2-8-5-12-10-14-7 3-19 3-26 0-5 2-8 6-10 14z" fill="' + hair + '"/><circle cx="11" cy="32" r="6.5" fill="' + hair + '"/><circle cx="53" cy="32" r="6.5" fill="' + hair + '"/>';
    else if (st === 'long') { back = '<path d="M7 30C5 12 18 3 32 3s27 9 25 27v26c0 4-3 6-7 6H14c-4 0-7-2-7-6z" fill="' + hair + '" stroke="' + INK + '" stroke-width="3"/>'; top = '<path d="M10 29C8 13 19 5 32 5s24 8 22 24c-4-8-9-12-14-13-6 3-13 3-18 1-5 2-9 5-12 12z" fill="' + hair + '"/>'; }
    else if (st === 'curly') top = '<g fill="' + hair + '"><circle cx="18" cy="12" r="8"/><circle cx="32" cy="8" r="9"/><circle cx="46" cy="12" r="8"/><circle cx="11" cy="22" r="7"/><circle cx="53" cy="22" r="7"/></g>';
    else if (st === 'spiky') top = '<path d="M10 27l1-13 7 5 2-12 8 8 4-12 5 12 8-8 1 12 8-4-1 12c-5-7-12-10-21-10s-16 3-22 10z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
    else if (st === 'cap') top = '<path d="M9 29c-1-5 3-9 6-10h34c3 1 7 5 6 10-3-5-7-7-10-7H19c-3 0-7 2-10 7z" fill="' + hair + '"/><path d="M10 22c0-11 10-18 22-18s22 7 22 18z" fill="' + dark(shirt, 0.8) + '" stroke="' + INK + '" stroke-width="2.5"/><path d="M24 22c0-9 3-15 8-18 5 3 8 9 8 18z" fill="#fff" opacity=".75"/><path d="M8 22h40c7 0 13 2 15 6H8z" fill="' + dark(shirt, 0.62) + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
    else if (st === 'beanie') top = '<circle cx="32" cy="3.5" r="5" fill="#f5f0e6" stroke="' + INK + '" stroke-width="2"/><path d="M10 22c0-11 10-16 22-16s22 5 22 16z" fill="' + shirt + '" stroke="' + INK + '" stroke-width="2.5"/><rect x="7" y="19" width="50" height="9" rx="4.5" fill="' + dark(shirt, 0.78) + '" stroke="' + INK + '" stroke-width="2.5"/>';
    if (acc.indexOf('glasses') >= 0) face += '<g fill="#fff" fill-opacity=".35" stroke="' + INK + '" stroke-width="2.4"><circle cx="23" cy="33" r="7"/><circle cx="41" cy="33" r="7"/></g><path d="M30 33h4" stroke="' + INK + '" stroke-width="2.4"/>';
    if (acc.indexOf('shades') >= 0) face += '<g fill="' + INK + '"><rect x="14" y="27" width="16" height="11" rx="5"/><rect x="34" y="27" width="16" height="11" rx="5"/><rect x="29" y="30" width="6" height="3"/></g><path d="M18 30l4-1" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>';
    var eyes = acc.indexOf('shades') >= 0 ? '' : '<g class="buddy-eye" fill="' + INK + '"><ellipse cx="23.5" cy="32" rx="2.8" ry="3.5"/><ellipse cx="40.5" cy="32" rx="2.8" ry="3.5"/></g><g fill="#fff"><circle cx="24.5" cy="30.7" r="1"/><circle cx="41.5" cy="30.7" r="1"/></g><path d="M19 25.5q4.5-2.5 8 0M37 25.5q3.5-2.5 8 0" fill="none" stroke="' + dark(hair, 0.75) + '" stroke-width="2" stroke-linecap="round"/>';
    var mouth = acc.indexOf('mustache') >= 0
      ? '<path d="M32 42c-3-3-9-2-11 2 4 1 8 1 11-1 3 2 7 2 11 1-2-4-8-5-11-2z" fill="' + dark(hair, 0.8) + '" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/><path d="M27 47q5 4 10 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>'
      : '<path d="M26 42q6 5.5 12 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>';
    if (acc.indexOf('headphones') >= 0) face += '<path d="M9 32C7 12 18 -1 32 -1s25 13 23 33" fill="none" stroke="#23222b" stroke-width="4.5" stroke-linecap="round"/><rect x="3" y="25" width="10" height="17" rx="5" fill="' + shirt + '" stroke="' + INK + '" stroke-width="2.5"/><rect x="51" y="25" width="10" height="17" rx="5" fill="' + shirt + '" stroke="' + INK + '" stroke-width="2.5"/>';
    var bow = acc.indexOf('bowtie') >= 0 ? '<path d="M32 58l-9-5v10zM32 58l9-5v10z" fill="' + INK + '"/><circle cx="32" cy="58" r="2.6" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/>' : '';
    return '<svg viewBox="0 -4 64 78" class="' + (cls || '') + '" style="--i:' + i + '" aria-hidden="true">' + back +
      '<path d="M8 74c0-15 10-22 24-22s24 7 24 22z" fill="' + shirt + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M26 48h12v9q-6 4-12 0z" fill="' + dark(skin.length === 7 ? skin : '#e6b08a', 0.88) + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M10.5 27C10.5 14 20 7 32 7s21.5 7 21.5 20c0 15-9 26-21.5 26S10.5 42 10.5 27z" fill="' + skin + '" stroke="' + INK + '" stroke-width="3"/>' + top + eyes +
      '<circle cx="18" cy="39" r="3.2" fill="#ff8fa3" opacity=".45"/><circle cx="46" cy="39" r="3.2" fill="#ff8fa3" opacity=".45"/>' + mouth + face + bow + '</svg>';
  }
  // ---- avatar seçimi: seçim cihazda saklanır, odaya girerken sunucuya gider; lobide kendi rozetine dokununca değişir ----
  var AV_KEY = 'nfc-avatar', myAv = null;
  function av() {
    if (myAv == null) {
      try { var v = parseInt(localStorage.getItem(AV_KEY), 10); if (v >= 0 && v < 12) myAv = v; } catch (e) { /* saklama yoksa rastgele */ }
      if (myAv == null) myAv = Math.floor(Math.random() * 12);
    }
    return myAv;
  }
  function setAv(i) { myAv = i; try { localStorage.setItem(AV_KEY, String(i)); } catch (e) { /* yok say */ } }
  function cells(taken) {
    var h = '';
    for (var i = 0; i < 12; i++) {
      var t = taken && taken.indexOf(i) >= 0;
      h += '<button type="button" class="avc' + (i === av() ? ' on' : '') + (t ? ' taken' : '') + '" data-av="' + i + '"' + (t ? ' disabled' : '') + ' aria-label="' + AVN[i] + ' karakter' + (t ? ' (dolu)' : '') + '" aria-pressed="' + (i === av()) + '">' + buddy(i) + '</button>';
    }
    return h;
  }
  function picker() { return '<div class="avpick"><span class="avlab">Avatarını seç</span><div class="avrow" data-avhome>' + cells(null) + '</div></div>'; }
  function closeModal() { var m = document.getElementById('avmodal'); if (m) m.remove(); }
  function openModal() {
    closeModal();
    // masadaki diğer oyuncuların karakterleri: lobideki yüzlerden okunur
    var taken = [], L = document.querySelectorAll('.pface');
    for (var k = 0; k < L.length; k++) if (!L[k].closest('.pface-btn')) taken.push(parseInt(L[k].style.getPropertyValue('--i'), 10));
    var m = document.createElement('div');
    m.id = 'avmodal';
    m.innerHTML = '<div class="avbox" role="dialog" aria-label="Avatar seç"><h3>Avatarını seç</h3><p>Soluk olanlar masada başkasında.</p><div class="avgrid">' + cells(taken) + '</div><p class="averr" role="alert"></p><button type="button" class="avclose" data-avclose>Tamam</button></div>';
    document.body.appendChild(m);
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-avopen]')) { e.preventDefault(); openModal(); return; }
    if (t.closest('[data-avclose]') || t.id === 'avmodal') { closeModal(); return; }
    var c = t.closest('[data-av]');
    if (!c || c.disabled) return;
    var i = parseInt(c.dataset.av, 10), inModal = !!c.closest('#avmodal');
    var mark = function () { var L = document.querySelectorAll('[data-av]'); for (var k = 0; k < L.length; k++) { var on = parseInt(L[k].dataset.av, 10) === i; L[k].classList.toggle('on', on); L[k].setAttribute('aria-pressed', String(on)); } };
    if (!inModal) { setAv(i); mark(); return; }
    if (!window.__emit) return;
    var err = document.querySelector('#avmodal .averr');
    window.__emit('room:avatar', { avatar: i }).then(function (res) {
      if (res && res.ok) { setAv(i); mark(); closeModal(); }
      else if (err) err.textContent = (res && res.error) || 'Avatar değiştirilemedi, tekrar dene.';
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  var cur = 'hepsi', faceN = 0, lastLobby = 0;
  var CATS = [['hepsi', '🎮 Hepsi'], ['masa', '♟️ Masa'], ['parti', '🎉 Parti'], ['bilgi', '🧠 Bilgi'], ['refleks', '⚡ Refleks'], ['blof', '🕵️ Blöf'], ['sans', '🍀 Şans']];
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-act="cat"]'); if (b) cur = b.dataset.id; }, true);
  // İşletme teması: arka planda uçuşan şekiller o işletmenin yiyecekleri olur
  var FOOD = { 'los-bravos': ['🍔', '🍗', '🍟', '🥤'], 'chicken-rice-crush': ['🍗', '🍚', '🍛', '🌶️'], 'fried-chiko': ['🍗', '🍟', '🥤', '🐔'], springfield: ['🌯', '🥙', '🌶️', '🍟'], 'durum-max': ['🌯', '🥙', '🔥', '🍟'], eliz: ['🧇', '🍓', '🍫', '🍨'] };
  try {
    var slug = String(new URLSearchParams(location.search).get('kaynak') || window.OYUN_KAYNAK || '').toLowerCase();
    if (FOOD[slug]) {
      document.documentElement.setAttribute('data-th', slug);
      var put = function () { var L = document.querySelectorAll('#bgfx i'); for (var k = 0; k < L.length; k++) L[k].textContent = FOOD[slug][k % FOOD[slug].length]; };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put); else put();
    }
  } catch (e) { /* tema süsü yoksa standart şekiller kalır */ }
  window.__pb = {
    buddy: buddy,
    buddies: function () { cur = 'hepsi'; return '<div class="buddies">' + [0, 1, 2, 3, 4].map(function (i) { return buddy(i); }).join('') + '</div>'; },
    face: function (a, me) {
      if (a == null) return buddy(faceN++, 'pface');
      if (!me) return buddy(a, 'pface');
      if (a !== av() && !document.getElementById('avmodal')) myAv = a;      // sunucu başka karakter verdiyse (seçilen doluydu) onu göster
      return '<button type="button" data-avopen class="pface-btn" aria-label="Avatarını değiştir" title="Avatarını değiştir">' + buddy(a, 'pface') + '<i>✏️</i></button>';
    },
    av: av,
    picker: picker,
    cats: function () { faceN = 0; return CATS.map(function (c) { return '<button data-act="cat" data-id="' + c[0] + '" class="btn ' + (cur === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join(''); },
    fresh: function () { var n = Date.now(), f = n - lastLobby > 4000; lastLobby = n; return f ? 'fresh' : ''; }
  };
})();
