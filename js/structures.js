// 字形結構依教學分類逐字設定，獨立於遊戲為方便拼砌而合併的部件數量。
// 分類參考用戶提供的筆記及教育局教材：
// https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/chi-edu/resources/primary/lang/chi-character-main/4.3_TKPMPS_book1.pdf
(() => {
  const types = {
    single: { label: '獨體字', detail: '單一結構', chars: '天手再見貝上車文日牛水子門' },
    lr: { label: '左右結構', chars: '牀新談加認識校領歡怕顧願握散跳繩操場媽吃陪說張快泳拉話語記打拍抱姐妹奶時晴明河海池林桃村叫吹唱球歌' },
    lmr: { label: '左中右結構', chars: '游樹' },
    tb: { label: '上下結構', chars: '早餐奇參學習帶照勇步熱安爸緊樂音感覺' },
    tmb: { label: '上中下結構', chars: '喜害意寶' },
    partial: { label: '部分包圍結構', chars: '起氣鬧迎同' },
    full: { label: '全包圍結構', chars: '園間' }
  };
  const characters = {};
  for (const [type, info] of Object.entries(types)) {
    for (const ch of info.chars) characters[ch] = type;
  }
  window.CHAR_STRUCTURES = {
    types,
    characters,
    enclosure: { 起: 'bottom-left', 迎: 'bottom-left', 氣: 'top-right', 鬧: 'top', 同: 'top' }
  };
})();
