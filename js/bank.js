// 教學素材庫：老師可以在這裏加入新的課文和章節。
// 注意：詞語中的每個字都需要有部件資料（tools/decomp.json → 執行 tools/build_parts.py）。
window.WORD_BANKS = [
  {
    id: 'p1',
    title: '我是小一生',
    defaultChapters: [0, 1],
    chapters: [
      {
        title: '第一章',
        subtitle: '早安，你好',
        words: ['起牀', '早餐'],
        extraWords: ['早安', '爸爸', '媽媽', '上學', '校車', '吃', '陪', '說']
      },
      {
        title: '第二章',
        subtitle: '上學去',
        words: ['新奇', '談天', '參加', '學習', '認識'],
        extraWords: ['緊張', '歡迎', '快樂', '音樂', '游泳', '拉']
      },
      { title: '第三章', words: ['校園', '帶領', '喜歡', '害怕', '照顧'] },
      { title: '第四至五章', words: ['願意', '勇氣', '握手', '再見', '散步', '跳繩', '熱鬧', '操場'] }
    ]
  }
];

// 只供「同部件組字」使用的課外拓展詞彙。
window.EXTENSION_WORD_GROUPS = [
  { name: '氵', label: '三點水', reviewWords: ['游泳'], words: ['河水', '海水', '水池'], targets: ['河', '海', '池'] },
  { name: '木', label: '木字部', reviewWords: ['校車'], words: ['樹林', '桃子', '村子'], targets: ['林', '桃', '村'] },
  { name: '口', label: '口字部', reviewWords: ['吃'], words: ['叫門', '吹氣', '唱歌'], targets: ['叫', '吹', '唱'] }
];

