/* 部件識字畫布 — 主程式 */
(() => {
'use strict';

const courseData = window.CHAR_DATA;
const D = { ...courseData, ...window.EXTENSION_CHAR_DATA };
const structures = window.CHAR_STRUCTURES;
const coachScripts = window.DOUDOU_MESSAGES;
const coachHistory = new Map();
const W = 1200, H = 720;            // 畫布（舞台）邏輯尺寸
const app = document.getElementById('app');
const fx = document.getElementById('fx');

/* ============ 小工具 ============ */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const rand = (a, b) => a + Math.random() * (b - a);
const partSrc = f => 'assets/parts/' + f + '?v=classroom-picture-20261119';
const charSrc = ch => 'assets/chars/' + D[ch].img;
const isMulti = ch => D[ch] && D[ch].parts.length > 1;
const hasTwoParts = ch => courseData[ch]?.parts.length === 2;
const uniq = a => [...new Set(a)];
const PASTELS = ['#dff7ec', '#dff0ff', '#fff3cc', '#ffe6d6', '#f0e8ff', '#ffe3ec'];
const icon = name => h('img', { class: 'ui-icon', src: 'assets/ui/' + name + '.webp', alt: '', draggable: 'false' });
const glyph = text => h('span', { class: 'tool-mark', 'aria-hidden': 'true' }, text);
const SOURCE = 'https://chineselearning.omghomework.com/';

const store = {
  get(k, d) { try { const v = localStorage.getItem('bujian.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bujian.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};

/* ============ 狀態 / 素材庫 ============ */
const S = {
  bankId: window.WORD_BANKS[0].id,
  chap: null,
  muted: store.get('muted', false),
  stars: store.get('stars', 0),
  learningMode: store.get('learningMode', 'classroom'),
  homeTab: 'free'
};
const banks = () => [...window.WORD_BANKS, ...store.get('customBanks', [])];
const bank = () => banks().find(b => b.id === S.bankId) || banks()[0];
function chapSel() {
  const b = bank();
  if (S.chap?.length && S.chap.every(i => b.chapters[i])) return S.chap;
  return b.defaultChapters || b.chapters.map((_, i) => i);
}
const validWord = w => typeof w === 'string' && w.length >= 1 && w.length <= 4 && [...w].every(c => courseData[c]);
const extensionGroups = window.EXTENSION_WORD_GROUPS;
const extensionWords = extensionGroups.flatMap(g => g.words);
const extensionBank = {
  id: 'extension',
  title: '同部件組字・課外拓展',
  chapters: extensionGroups.map(g => ({ title: g.name + ' 部件', words: g.words }))
};
function selectedExtensionGroups(words, common) {
  return extensionGroups.filter(group => !common || group.name === common).map(group => ({
    name: group.name,
    label: group.label,
    reviewWords: group.reviewWords,
    items: group.targets.flatMap((ch, index) => {
      if (!words.includes(group.words[index])) return [];
      return [{ ch, idx: D[ch].parts.findIndex(part => part.n === group.name) }];
    })
  })).filter(group => group.items.length >= 2);
}
const chapterWords = chapter => [...chapter.words, ...(chapter.extraWords || [])];
const illustratedWords = new Set(window.WORD_BANKS[0].chapters.flatMap(chapterWords));
const chapterHeading = c => c.subtitle ? c.title + '〈' + c.subtitle + '〉' : c.title;
function wordGroups(b, chapter) {
  if (b.id !== window.WORD_BANKS[0].id) return [{ words: chapter.words }];
  const groups = [{ label: '重點詞語', words: chapter.words }];
  if (chapter.extraWords?.length) groups.push({ label: '其他詞語', words: chapter.extraWords });
  return groups;
}
function selWords() {
  const b = bank(), selected = chapSel().map(i => b.chapters[i]);
  return uniq([
    ...selected.flatMap(c => c.words),
    ...selected.flatMap(c => c.extraWords || [])
  ]).filter(validWord);
}
function addStars(n) { S.stars += n; store.set('stars', S.stars); document.querySelectorAll('.star-count').forEach(e => e.textContent = S.stars); }

const ACTS = [
  { id: 3, name: '部件補全', learningMode: 'classroom', icon: 'puzzle', c: 'orange', desc: '找出缺少的部件' },
  { id: 1, name: '看圖拼字', learningMode: 'explore', learningModes: ['explore', 'classroom'], icon: 'picture', c: 'green', desc: '看圖拼出整個詞語' },
  { id: 4, name: '同部件組字', learningMode: 'classroom', icon: 'link', c: 'purple', desc: '補上部件，再看看詞語' },
  { id: 6, name: '部件記憶翻翻樂', learningMode: 'classroom', icon: 'book', c: 'blue', desc: '記住部件，翻兩張配成字' },
  { id: 5, name: '限時拼字', learningMode: 'explore', icon: 'timer', c: 'pink', desc: '看看限時內能拼出幾個字' },
  { id: 2, name: '自由拼字', learningMode: 'explore', icon: 'palette', c: 'blue', desc: '用部件拼你認識的字' }
];
const actById = id => ACTS.find(a => a.id === id);
const LEARNING_MODES = [
  { id: 'explore', name: '自主探索', desc: '學生用自己的裝置，自己動手拼字', firstActivity: 1 },
  { id: 'classroom', name: '課堂教學', desc: '投影或共用螢幕，老師帶領全班拼字', firstActivity: 3 }
];
const learningMode = (id = S.learningMode) => LEARNING_MODES.find(mode => mode.id === id) || LEARNING_MODES[1];
const activityInMode = (activity, modeId = learningMode().id) => !!activity && (activity.learningModes || [activity.learningMode]).includes(modeId);
const modeForActivity = activity => activityInMode(activity) ? learningMode() : learningMode(activity.learningMode);
const modeActivities = () => ACTS.filter(activity => activityInMode(activity));

function modeChooser(redraw) {
  return h('fieldset', { class: 'learning-mode-selector' },
    h('legend', null, '選擇學習模式'),
    h('div', { class: 'learning-mode-options' }, LEARNING_MODES.map(mode => h('button', {
      class: 'learning-mode-choice',
      'data-learning-mode': mode.id,
      'aria-pressed': String(mode.id === learningMode().id),
      onclick: () => {
        if (learningMode().id === mode.id) return;
        S.learningMode = mode.id; store.set('learningMode', mode.id); Snd.click();
        redraw();
        app.querySelector('[data-learning-mode="' + mode.id + '"]').focus({ preventScroll: true });
      }
    }, h('strong', null, mode.name), h('span', null, mode.desc)))));
}

/* ============ 音效（WebAudio 合成，毋須音效檔） ============ */
const Snd = {
  ctx: null,
  ac() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(f, t0, dur, type = 'sine', vol = .2, f2) {
    if (S.muted) return;
    const c = this.ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
  },
  pick() { this.tone(600, 0, .09, 'triangle', .14, 900); },
  drop() { this.tone(420, 0, .1, 'triangle', .16, 300); },
  snap() { this.tone(880, 0, .07, 'square', .05); this.tone(1320, .06, .14, 'triangle', .16); },
  bad() { this.tone(280, 0, .18, 'sawtooth', .07, 190); this.tone(210, .16, .26, 'sawtooth', .06, 150); },
  good() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * .09, .24, 'triangle', .17)); },
  win() { [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * .12, .32, 'triangle', .17)); },
  tick() { this.tone(1000, 0, .05, 'square', .05); },
  click() { this.tone(520, 0, .06, 'triangle', .1); }
};
document.addEventListener('pointerdown', () => Snd.ac(), { once: true });

/* ============ 背景音樂 ============ */
const music = h('audio', {
  id: 'background-music', src: 'assets/audio/bouncy-learning-fun.mp3',
  loop: true, preload: 'auto', hidden: true
});
music.volume = .12;
document.body.append(music);
const Bgm = {
  enabled: store.get('musicEnabled', true),
  sync() {
    if (!this.enabled || document.hidden) {
      music.pause();
      return;
    }
    if (music.paused) {
      music.play().then(() => {
        if (!this.enabled || document.hidden) music.pause();
      }).catch(() => {
        // 瀏覽器可能要求先點一下頁面，再開始播放。
      });
    }
  }
};
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.music-toggle')) Bgm.sync();
});
document.addEventListener('keydown', e => {
  if (!e.repeat && !e.target.closest('.music-toggle')) Bgm.sync();
});
document.addEventListener('visibilitychange', () => Bgm.sync());
window.addEventListener('pagehide', () => music.pause());
window.addEventListener('pageshow', () => Bgm.sync());
Bgm.sync();

/* ============ 讀音（瀏覽器語音合成，優先粵語） ============ */
function speak(text) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const vs = speechSynthesis.getVoices();
  const v = vs.find(v => /zh[-_]HK|yue/i.test(v.lang));
  if (!v) return false;
  u.voice = v; u.lang = v.lang;
  u.rate = .75;
  speechSynthesis.speak(u);
  return true;
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();

/* ============ 歡迎及選擇活動 ============ */
function mascot(size = 140, anim = '') {
  return h('img', {
    class: 'mascot-wrap ' + (anim ? 'mascot-' + anim : ''),
    src: 'assets/ui/doudou.webp', alt: '', width: size, draggable: 'false'
  });
}

function muteBtn() {
  const label = () => S.muted ? '開啟音效' : '關閉音效';
  const b = h('button', { class: 'btn white icon', title: label(), 'aria-label': label(), 'aria-pressed': String(S.muted) },
    icon(S.muted ? 'mute' : 'speaker'));
  b.onclick = () => {
    S.muted = !S.muted; store.set('muted', S.muted);
    b.setAttribute('aria-pressed', String(S.muted));
    b.title = label(); b.setAttribute('aria-label', b.title);
    b.replaceChildren(icon(S.muted ? 'mute' : 'speaker')); Snd.click();
  };
  return b;
}

function musicBtn() {
  const button = h('button', { class: 'btn white music-toggle' });
  const update = () => {
    button.textContent = Bgm.enabled ? '音樂開' : '音樂關';
    button.title = Bgm.enabled ? '關閉背景音樂' : '開啟背景音樂';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(Bgm.enabled));
  };
  button.onclick = () => {
    Bgm.enabled = !Bgm.enabled;
    store.set('musicEnabled', Bgm.enabled);
    Bgm.sync();
    update();
  };
  update();
  return button;
}

function starPill() {
  const count = h('span', { class: 'star-count' }, S.stars);
  return h('span', { class: 'pill star-pill', title: '累積星星' }, icon('star'), count);
}

function teacherBtn() {
  return h('button', { class: 'btn white', onclick: () => openTeacher() }, icon('clipboard'), '老師設定');
}

function brandBar(back) {
  return h('header', { class: 'app-header' }, h('div', { class: 'topbar' },
    h('button', { class: 'brand', onclick: back, 'aria-label': '部件識字畫布，回到歡迎頁' },
      h('span', { class: 'brand-mark' }, icon('puzzle')), h('span', null, '部件識字畫布')),
    h('div', { class: 'spacer' }), starPill(), musicBtn(), teacherBtn()));
}

function lessonLabel() {
  const b = bank(), chapters = chapSel();
  let chapter = chapters.map(index => b.chapters[index].title).join('、');
  if (b.id === 'p1' && chapters.length === 2 && chapters.includes(0) && chapters.includes(1)) chapter = '第一至二章';
  return '《' + b.title + '》' + (chapter ? '・' + chapter : '');
}

function activityCards() {
  const activities = modeActivities();
  return h('div', { class: 'acts', style: { '--activity-columns': activities.length } }, activities.map(a => h('button', {
    class: 'act-card tone-' + a.c,
    onclick: () => { Snd.click(); S.homeTab = 'free'; startGame(a.id, selWords()); }
  }, h('span', { class: 'act-art' }, icon(a.icon)), h('strong', null, a.name), h('small', null, a.desc))));
}

function renderWelcome() {
  stopGame();
  const greeting = coachPhrase('welcome');
  const demo = h('div', { class: 'demo', role: 'img', 'aria-label': '木加交，拼成校字' },
    h('div', { class: 'demo-tile wood' }, h('img', { src: partSrc(D['校'].parts[0].f), alt: '' })),
    glyph('+'),
    h('div', { class: 'demo-tile cross' }, h('img', { src: partSrc(D['校'].parts[1].f), alt: '' })),
    glyph('='),
    h('div', { class: 'demo-tile complete' }, h('img', { src: charSrc('校'), alt: '' })));
  app.replaceChildren(h('div', { class: 'screen welcome' }, brandBar(renderWelcome),
    h('main', { class: 'launch page-width' },
      h('section', { class: 'welcome-card' },
        h('div', { class: 'welcome-copy' },
          h('h1', null, '部件識字畫布'),
          h('div', { class: 'welcome-greeting' }, h('strong', null, '豆豆說'),
            h('p', null, greeting.text), h('small', null, greeting.detail)),
          modeChooser(renderWelcome),
          h('div', { class: 'welcome-actions' },
            h('button', { class: 'btn big', onclick: () => { Snd.click(); S.homeTab = 'free'; startGame(learningMode().firstActivity, selWords()); } }, '開始遊戲', icon('arrow')),
            h('button', { class: 'btn white', onclick: () => renderHome('task') }, icon('clipboard'), '老師任務'))),
        h('div', { class: 'welcome-art' }, mascot(300, 'hello'), demo)),
      h('section', { class: 'activity-list' },
        h('div', { class: 'section-bar' }, h('h2', null, learningMode().name + '活動'),
          h('button', { class: 'lesson-button', onclick: () => renderHome('free') }, icon('book'), lessonLabel(), glyph('›'))),
        activityCards()))));
}

function renderHome(tab) {
  stopGame();
  if (tab) S.homeTab = tab;
  const tasks = store.get('tasks', []).filter(t => activityInMode(actById(t.act)));
  const tabs = h('div', { class: 'tabs', 'aria-label': '活動與任務' },
    h('button', { class: 'tab' + (S.homeTab === 'free' ? ' on' : ''), 'aria-pressed': String(S.homeTab === 'free'), onclick: () => renderHome('free') }, icon('book'), '課文與活動'),
    h('button', { class: 'tab' + (S.homeTab === 'task' ? ' on' : ''), 'aria-pressed': String(S.homeTab === 'task'), onclick: () => renderHome('task') }, icon('clipboard'), '老師任務'));
  const body = h('main', { class: 'home-body page-width' }, modeChooser(() => renderHome()), tabs);
  if (S.homeTab === 'free') {
    const b = bank(), selected = chapSel();
    const field = h('select', {
      'aria-label': '課文',
      onchange: e => {
        S.bankId = e.target.value; S.chap = null;
        renderHome('free');
      }
    }, banks().map(item => h('option', { value: item.id, selected: item.id === b.id }, '《' + item.title + '》')));
    body.append(h('section', { class: 'lesson-panel' }, h('h1', null, '選擇課文與章節'), field,
      h('div', { class: 'chips' }, b.chapters.map((chapter, i) => h('button', {
        class: 'chip' + (selected.includes(i) ? ' on' : ''), 'aria-pressed': String(selected.includes(i)),
        onclick: () => {
          const next = selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i].sort((a, b) => a - b);
          if (!next.length) return;
          S.chap = next; Snd.click(); renderHome('free');
        }
      }, chapter.title))),
      h('div', { class: 'words-preview' }, selected.map(i => {
        const chapter = b.chapters[i];
        return h('section', { class: 'preview-chapter' }, h('h2', null, chapterHeading(chapter)),
          wordGroups(b, chapter).map(group => h('div', { class: 'word-group' },
            group.label ? h('h3', null, group.label) : null,
            h('div', { class: 'wordrow' }, group.words.filter(validWord).map(w => h('span', { class: 'word-tag' }, w))))));
      }))),
    h('h2', null, learningMode().name + '活動'), activityCards());
  } else {
    body.append(h('h1', null, '老師任務'));
    if (!tasks.length) body.append(h('div', { class: 'empty' }, mascot(130),
      h('p', null, '這個模式暫時沒有老師任務。'),
      h('button', { class: 'btn', onclick: () => renderHome('free') }, '選擇活動')));
    tasks.forEach(t => {
      const a = actById(t.act);
      body.append(h('article', { class: 'task-card tone-' + a.c },
        h('span', { class: 'act-art' }, icon(a.icon)),
        h('div', { class: 'task-info' }, h('h2', null, t.name || a.name),
          h('p', null, a.name + ' ・ ' + t.words.length + ' 個詞語' + (t.act === 5 ? ' ・ ' + t.seconds + ' 秒' : ''))),
        h('button', { class: 'btn', onclick: () => { Snd.click(); startGame(t.act, t.words, { seconds: t.seconds, task: t, common: t.common }); } }, '開始')));
    });
  }
  app.replaceChildren(h('div', { class: 'screen home' }, brandBar(renderWelcome), body));
}
/* ============ 遊戲引擎 ============ */
let G = null;

function duringGame(fn, delay) {
  const game = G;
  const round = G.round;
  return setTimeout(() => {
    if (G === game && game.round === round) fn();
  }, delay);
}

function stopGame() {
  if (!G) return;
  clearInterval(G.timer);
  clearTimeout(G.wordHintTimer);
  clearTimeout(G.memoryHintTimer);
  clearCanvasHint();
  G.ro && G.ro.disconnect();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  document.querySelectorAll('.overlay, .countdown, .drag-ghost').forEach(e => e.remove());
  fx.replaceChildren();
  G = null;
}

function startGame(act, words, opts = {}) {
  stopGame();
  words = act === 4 ? (words || []).filter(w => extensionWords.includes(w)) : (words || []).filter(validWord);
  if (act === 4 && !selectedExtensionGroups(words, opts.common).length) {
    words = extensionWords;
    opts = { ...opts, common: extensionGroups.some(g => g.name === opts.common) ? opts.common : '' };
  }
  if (!words.length) return renderHome();
  const a = actById(act);
  S.learningMode = modeForActivity(a).id; store.set('learningMode', S.learningMode);
  G = { act, words: uniq(words), opts, pieces: [], boxes: [], z: 10, f: 1, ox: 0, oy: 0, unit: 300 / 768, qi: 0, total: 0, earned: 0, mistakes: 0, sel: null, frozen: false, found: [], round: 0 };

  const progress = h('div', { class: 'progress', 'aria-label': '活動進度' }, h('i'), h('b'));
  const right = h('div', { class: 'game-metrics' });
  const nav = h('nav', { class: 'game-nav page-width', 'aria-label': learningMode().name + '活動' },
    modeActivities().map(next => h('button', { class: 'mode-button tone-' + next.c,
      'aria-current': next.id === act ? 'page' : null,
      onclick: () => { if (next.id !== act) { Snd.click(); startGame(next.id, act === 4 ? selWords() : words); } }
    }, icon(next.icon), next.name)));
  const top = h('header', { class: 'app-header' }, h('div', { class: 'topbar' },
    h('button', { class: 'btn white home-link', onclick: () => { Snd.click(); renderHome(opts.task ? 'task' : 'free'); } }, icon('home'), opts.task ? '老師任務' : '選活動'),
    h('div', { class: 'game-context' }, h('strong', { class: 'game-mode-name' }, learningMode().name),
      h('span', { class: 'game-lesson' }, opts.task ? opts.task.name || '老師任務' : act === 4 ? '課外拓展・學習新字' : lessonLabel())),
    h('div', { class: 'spacer' }), right, starPill(), musicBtn(), muteBtn()));
  const libGrid = h('div', { class: 'lib-grid' });
  const libPaging = h('div', { class: 'lib-paging' });
  const libHead = h('div', { class: 'lib-head' }, h('h2', null, '部件庫'), h('small', null, '拖動或點選部件'));
  const lib = h('aside', { class: 'lib', 'aria-label': '部件庫' }, libHead, libGrid, libPaging);
  const stage = h('div', { class: 'stage' });
  const helper = h('section', { class: 'helper', role: 'status', 'aria-label': '豆豆陪你拼字', 'aria-atomic': 'true' });
  const board = h('div', { class: 'board', tabindex: '0', 'aria-label': '拼字畫布' }, stage);
  const clue = h('div', { class: 'clue' });
  const boardTop = h('div', { class: 'board-top' });
  const toolbar = h('div', { class: 'toolbar' });
  const heading = h('div', { class: 'board-heading' },
    h('div', { class: 'board-title' }, h('div', null, h('h1', null, a.name), h('p', null, a.desc)), progress), helper);
  const main = h('main', { class: 'game-main page-width' }, lib, h('section', { class: 'board-col' },
    heading, boardTop, h('div', { class: 'play-area' }, clue, board), toolbar));
  app.replaceChildren(h('div', { class: 'screen game mode-' + act }, top, opts.task ? null : nav, main));
  Object.assign(G, { stage, boardEl: board, clue, libGrid, libHead, libPaging, helper, toolbar, boardTop, progressEl: progress, topRight: right });
  board.addEventListener('click', e => {
    if (!G || G.frozen || e.target.closest('button, .piece')) return;
    const pos = toStage(e.clientX, e.clientY);
    if (G.chosen) placeChosen(pos);
    else if (G.sel) moveSelected(pos);
  });
  board.addEventListener('keydown', e => {
    if (e.target !== board || !G || G.frozen || !G.chosen || !['Enter', ' '].includes(e.key)) return;
    e.preventDefault(); placeChosen(trayPosition());
  });

  G.ro = new ResizeObserver(fitStage); G.ro.observe(board);
  fitStage();
  G.mode = MODES[act];
  G.mode.start();
}

function fitStage() {
  if (!G) return;
  const r = G.boardEl.getBoundingClientRect();
  if (!r.width) return;
  G.f = Math.min(r.width / W, r.height / H);
  G.ox = (r.width - W * G.f) / 2; G.oy = (r.height - H * G.f) / 2;
  G.stage.style.transform = `translate(${G.ox}px, ${G.oy}px) scale(${G.f})`;
  G.boxes.forEach(positionStructureLabel);
}
function toStage(cx, cy) { const r = G.boardEl.getBoundingClientRect(); return { x: (cx - r.left - G.ox) / G.f, y: (cy - r.top - G.oy) / G.f }; }
function toClient(x, y) { const r = G.boardEl.getBoundingClientRect(); return { x: r.left + G.ox + x * G.f, y: r.top + G.oy + y * G.f }; }

function setProgress(done, total, label) {
  const p = G.progressEl;
  p.firstChild.style.transform = `scaleX(${total ? done / total : 0})`;
  p.lastChild.textContent = label != null ? label : `第 ${Math.min(done, total)}／${total} 題`;
}

function clearBoard() {
  clearTimeout(G.wordHintTimer);
  clearTimeout(G.memoryHintTimer);
  clearCanvasHint();
  G.reviewPanel?.remove();
  G.boardEl.querySelectorAll('.board-structure').forEach(label => label.remove());
  G.round++;
  select(null);
  chooseTile(null);
  G.stage.replaceChildren();
  G.pieces = []; G.boxes = []; G.mistakes = 0;
}

function addWordHint(box, ch) {
  box.wordHint = h('img', { class: 'word-hint', src: charSrc(ch), alt: '', hidden: true, draggable: 'false' });
  box.el.append(box.wordHint);
}

function showWordHints() {
  const hints = G.boxes.filter(b => !b.done && b.wordHint);
  clearTimeout(G.wordHintTimer);
  hints.forEach(box => {
    box.wordHint.hidden = false;
  });
  doudou('hintShape');
  const revision = G.coachRevision;
  G.wordHintTimer = duringGame(() => {
    hints.forEach(box => {
      box.wordHint.hidden = true;
    });
    if (G.coachRevision === revision && !G.frozen) doudou('hintEnd');
  }, 1000);
}

function clearCanvasHint() {
  clearTimeout(G.canvasHintTimer);
  G.stage.querySelector('.canvas-word-hint')?.remove();
}

function showCanvasHint(chars) {
  clearCanvasHint();
  const names = new Set([...G.libGrid.querySelectorAll('.part-card')].map(card => card.dataset.name));
  const possible = chars.filter(ch => D[ch].parts.every(part => names.has(part.n)));
  if (!possible.length) {
    doudou('hintNoMatch');
    return;
  }
  const fresh = possible.filter(ch => !G.found.includes(ch));
  const ch = pick(fresh.length ? fresh : possible);
  const size = G.unit * 768;
  const hint = h('img', { class: 'canvas-word-hint', src: charSrc(ch), alt: ch, draggable: 'false',
    style: { left: (W - size) / 2 + 'px', top: (H - size) / 2 + 'px', width: size + 'px', height: size + 'px' } });
  G.stage.append(hint);
  doudou('hintShape');
  const revision = G.coachRevision;
  G.canvasHintTimer = duringGame(() => {
    hint.remove();
    if (G.coachRevision === revision && !G.frozen) doudou('hintEnd');
  }, 1000);
}

/* ---------- 部件（畫布上的物件） ---------- */
let PID = 0;
function makePiece(ch, idx, cx, cy, k) {
  const part = D[ch].parts[idx];
  const img = h('img', { src: partSrc(part.f), alt: part.n, draggable: 'false' });
  const p = { id: ++PID, kind: 'part', ch, idx, name: part.n, k, rect: { x: part.x, y: part.y, w: part.w, h: part.h }, img };
  p.imgRect = { ...p.rect };
  p.x = cx - part.w * k / 2; p.y = cy - part.h * k / 2;
  p.el = h('div', { class: 'piece', role: 'button', tabindex: '0', 'aria-label': part.n }, img, h('div', { class: 'resize-handle', title: '拖動縮放' }));
  p.el.style.position = 'absolute';
  img.style.position = 'absolute';
  clampIn(p); layoutPiece(p);
  p.el.style.zIndex = ++G.z;
  G.stage.append(p.el); G.pieces.push(p);
  bindPiece(p);
  return p;
}
function makeCharPiece(ch, k, gx, gy) { // gx,gy: 字框(768)左上角在舞台的位置
  const bb = D[ch].box;
  const img = h('img', { src: charSrc(ch), alt: ch, draggable: 'false' });
  const p = { id: ++PID, kind: 'char', ch, name: ch, k, rect: { x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1] }, imgRect: { x: 0, y: 0, w: 768, h: 768 }, img };
  p.x = gx + bb[0] * k; p.y = gy + bb[1] * k;
  p.el = h('div', { class: 'piece char-made', role: 'button', tabindex: '0', 'aria-label': ch }, img, h('div', { class: 'resize-handle' }));
  img.style.position = 'absolute';
  layoutPiece(p);
  p.el.style.zIndex = ++G.z;
  G.stage.append(p.el); G.pieces.push(p);
  bindPiece(p);
  return p;
}
const pw = p => p.rect.w * p.k, ph = p => p.rect.h * p.k;
const center = p => ({ x: p.x + pw(p) / 2, y: p.y + ph(p) / 2 });
function layoutPiece(p) {
  const s = p.el.style;
  s.left = p.x + 'px'; s.top = p.y + 'px'; s.width = pw(p) + 'px'; s.height = ph(p) + 'px';
  const is = p.img.style;
  is.left = (p.imgRect.x - p.rect.x) * p.k + 'px'; is.top = (p.imgRect.y - p.rect.y) * p.k + 'px';
  is.width = p.imgRect.w * p.k + 'px'; is.height = p.imgRect.h * p.k + 'px';
}
function setPart(p, ch, idx) { // 換成指定字的部件圖（吸附時用，確保字形準確）
  const part = D[ch].parts[idx];
  Object.assign(p, { ch, idx, name: part.n, rect: { x: part.x, y: part.y, w: part.w, h: part.h } });
  p.imgRect = { ...p.rect };
  p.img.src = partSrc(part.f);
  p.img.alt = part.n;
}
function clampIn(p) {
  p.x = Math.max(5, Math.min(W - pw(p) - 5, p.x));
  p.y = Math.max(5, Math.min(H - ph(p) - 5, p.y));
}
function animatePlacement(p) {
  const { left, top, width, height } = p.el.style;
  layoutPiece(p);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  p.el.getAnimations().filter(a => a.id === 'placement').forEach(a => a.cancel());
  const dx = parseFloat(left) - p.x, dy = parseFloat(top) - p.y;
  const sx = parseFloat(width) / pw(p), sy = parseFloat(height) / ph(p);
  p.el.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
    { transform: 'none' }
  ], { id: 'placement', duration: 290, easing: 'cubic-bezier(.22,1,.36,1)' });
}
function popAnim(p) { p.el.classList.remove('snap-pop'); void p.el.offsetWidth; p.el.classList.add('snap-pop'); }
function removePiece(p, fancy) {
  G.pieces = G.pieces.filter(q => q !== p);
  if (G.sel === p) select(null);
  if (fancy) { p.el.classList.add('bye'); setTimeout(() => p.el.remove(), 360); } else p.el.remove();
}
function eject(p) {
  p.dead = true; G.mistakes++;
  Snd.bad();
  if (G.sel === p) select(null);
  p.el.classList.add('shake');
  duringGame(() => removePiece(p, true), 390);
}
function lockPiece(p) {
  p.locked = true; p.el.classList.add('locked'); p.el.removeAttribute('tabindex'); p.el.removeAttribute('role');
  if (G.sel === p) select(null);
}

function select(p) {
  if (G.sel && G.sel.el) G.sel.el.classList.remove('sel');
  G.sel = p;
  if (p) p.el.classList.add('sel');
  G.toolbar.querySelectorAll('.needs-piece').forEach(b => { b.disabled = !p || G.frozen; });
}
function moveSelected(pos) {
  const p = G.sel;
  if (!p || G.frozen || p.locked || p.dead) return;
  p.x = pos.x - pw(p) / 2; p.y = pos.y - ph(p) / 2;
  clampIn(p); layoutPiece(p); Snd.drop();
  G.mode.onDrop(p);
}
function bringFront(p) { p.el.style.zIndex = ++G.z; }
function kRange(p) { return [G.unit * .35, Math.min(G.unit * 3, (W - 10) / p.rect.w, (H - 10) / p.rect.h)]; }
function scaleSel(f) {
  const p = G.sel; if (!p || p.locked || G.frozen) return;
  const c = center(p), [lo, hi] = kRange(p);
  p.k = Math.max(lo, Math.min(hi, p.k * f));
  p.x = c.x - pw(p) / 2; p.y = c.y - ph(p) / 2;
  clampIn(p); layoutPiece(p); Snd.click();
  G.mode.onDrop && G.mode.onDrop(p);
}
function deleteSel() { const p = G.sel; if (!p || p.locked || G.frozen) return; Snd.drop(); removePiece(p, true); }
document.addEventListener('keydown', e => {
  if (!G || !G.sel || G.frozen || e.target.closest('input, textarea, select')) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); }
});

function bindPiece(p) {
  p.el.addEventListener('keydown', e => {
    if (p.locked || p.dead || G.frozen) return;
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (steps[e.key]) {
      e.preventDefault(); chooseTile(null); select(p);
      const c = center(p), [x, y] = steps[e.key], step = e.shiftKey ? 60 : 18;
      moveSelected({ x: c.x + x * step, y: c.y + y * step });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); chooseTile(null); select(p);
    }
  });
  p.el.addEventListener('pointerdown', e => {
    if (p.locked || p.dead || G.frozen || !e.isPrimary || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    p.el.getAnimations().filter(a => a.id === 'placement').forEach(a => a.cancel());
    const resize = e.target.classList.contains('resize-handle');
    chooseTile(null); select(p); bringFront(p);
    const st = toStage(e.clientX, e.clientY), x0 = p.x, y0 = p.y, k0 = p.k, w0 = pw(p), h0 = ph(p);
    let moved = false;
    try { p.el.setPointerCapture(e.pointerId); } catch (_) {}
    if (!resize) Snd.pick();
    const move = ev => {
      const q = toStage(ev.clientX, ev.clientY), dx = q.x - st.x, dy = q.y - st.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (resize) {
        const [lo, hi] = kRange(p);
        p.k = Math.max(lo, Math.min(hi, k0 * Math.max((w0 + dx) / w0, (h0 + dy) / h0)));
      } else { p.x = x0 + dx; p.y = y0 + dy; p.el.classList.add('dragging'); }
      layoutPiece(p);
    };
    const up = ev => {
      p.el.removeEventListener('pointermove', move); p.el.removeEventListener('pointerup', up); p.el.removeEventListener('pointercancel', up);
      p.el.classList.remove('dragging');
      if (ev.type === 'pointercancel') Object.assign(p, { x: x0, y: y0, k: k0 });
      clampIn(p); layoutPiece(p);
      if (moved && ev.type !== 'pointercancel' && !G.frozen) { if (!resize) Snd.drop(); G.mode.onDrop(p); }
    };
    p.el.addEventListener('pointermove', move); p.el.addEventListener('pointerup', up); p.el.addEventListener('pointercancel', up);
  });
}

/* ---------- 部件庫 ---------- */
const LIB_PAGE_SIZE = 12;
function setLibrary(items) {
  G.libItems = items;
  drawLibrary(0);
}
function drawLibrary(page) {
  clearCanvasHint();
  chooseTile(null);
  const start = page * LIB_PAGE_SIZE;
  const total = Math.ceil(G.libItems.length / LIB_PAGE_SIZE);
  G.libGrid.replaceChildren(...G.libItems.slice(start, start + LIB_PAGE_SIZE).map((it, i) => libCard(it, start + i)));
  const step = (offset, label, mark) => h('button', { class: 'btn white icon', 'aria-label': label,
    disabled: page + offset < 0 || page + offset >= total,
    onclick: () => drawLibrary(page + offset)
  }, glyph(mark));
  G.libPaging.replaceChildren(...(total > 1 ? [
    step(-1, '上一頁部件', '‹'), h('span', null, `${page + 1}／${total}`), step(1, '下一頁部件', '›')
  ] : []));
}
function libCard(it, i) {
  const part = D[it.ch].parts[it.idx];
  const card = h('button', { class: 'part-card' + (it.common ? ' common' : ''), style: { '--pc': PASTELS[i % PASTELS.length] },
    'data-name': part.n, 'aria-pressed': 'false', 'aria-label': (it.common ? '共同部件 ' : '部件 ') + part.n,
    onclick: e => { if (!G.frozen && e.detail === 0) chooseTile(it, card); }
  },
    h('img', { src: partSrc(part.f), alt: part.n, draggable: 'false' }));
  card.addEventListener('pointerdown', e => libDrag(e, it, card));
  return card;
}
function chooseTile(it, card) {
  const same = G.chosen?.card === card;
  if (G.chosen) G.chosen.card.setAttribute('aria-pressed', 'false');
  G.chosen = it && !same ? { it, card } : null;
  G.boardEl.classList.toggle('placing', !!G.chosen);
  if (G.chosen) {
    card.setAttribute('aria-pressed', 'true');
    select(null); Snd.pick();
    doudou('choosePart');
  }
}
function trayPosition() {
  return G.mode.trayPos ? G.mode.trayPos() : { x: W / 2, y: H / 2 };
}
function placeChosen(pos) {
  const { it } = G.chosen;
  chooseTile(null);
  placePart(it, pos);
}
function placePart(it, pos) {
  const p = makePiece(it.ch, it.idx, pos.x, pos.y, G.unit);
  select(p); Snd.drop();
  G.mode.onDrop(p);
}
function libDrag(e, it, card) {
  if (!G || G.frozen || e.button !== 0 || !e.isPrimary) return;
  e.preventDefault();
  const game = G, round = G.round;
  const part = D[it.ch].parts[it.idx], k = G.unit;
  const sx = e.clientX, sy = e.clientY;
  let ghost = null, moved = false;
  try { card.setPointerCapture(e.pointerId); } catch (_) {}
  const gw = part.w * k * G.f, gh = part.h * k * G.f;
  const move = ev => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
      moved = true;
      chooseTile(null); Snd.pick();
      ghost = h('div', { class: 'drag-ghost', style: { width: gw + 'px', height: gh + 'px' } }, h('img', { src: partSrc(part.f), draggable: 'false' }));
      document.body.append(ghost);
    }
    if (ghost) { ghost.style.left = ev.clientX - gw / 2 + 'px'; ghost.style.top = ev.clientY - gh / 2 + 'px'; }
  };
  const up = ev => {
    card.removeEventListener('pointermove', move); card.removeEventListener('pointerup', up); card.removeEventListener('pointercancel', up);
    if (ghost) ghost.remove();
    if (G !== game || G.round !== round || G.frozen || ev.type === 'pointercancel') return;
    if (!moved) { chooseTile(it, card); return; }
    const r = G.boardEl.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
    placePart(it, toStage(ev.clientX, ev.clientY));
  };
  card.addEventListener('pointermove', move); card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
}
function glowCard(name) {
  const index = G.libItems.findIndex(it => D[it.ch].parts[it.idx].n === name);
  if (index < 0) return;
  let c = G.libGrid.querySelector(`[data-name="${CSS.escape(name)}"]`);
  if (!c) {
    drawLibrary(Math.floor(index / LIB_PAGE_SIZE));
    c = G.libGrid.querySelector(`[data-name="${CSS.escape(name)}"]`);
  }
  if (!c) return;
  c.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  c.classList.remove('hint-glow'); void c.offsetWidth; c.classList.add('hint-glow');
}

/* 干擾部件：盡量選位置、大小相近的部件 */
function distractors(excludeNames, n, refPart) {
  const seen = new Set(excludeNames), pool = [];
  for (const ch of Object.keys(courseData)) {
    if (!isMulti(ch)) continue;
    D[ch].parts.forEach((pt, i) => {
      if (seen.has(pt.n) || /[\u{20000}-\u{2FFFF}]/u.test(pt.n)) return;
      seen.add(pt.n); pool.push({ ch, idx: i, pt });
    });
  }
  let list = shuffle(pool);
  if (refPart) {
    const cx = refPart.x + refPart.w / 2, cy = refPart.y + refPart.h / 2;
    list.forEach(o => { o.d = Math.hypot(o.pt.x + o.pt.w / 2 - cx, o.pt.y + o.pt.h / 2 - cy) + Math.abs(o.pt.w - refPart.w) * .5 + Math.abs(o.pt.h - refPart.h) * .5; });
    list = shuffle(list.sort((a, b) => a.d - b.d).slice(0, n * 2));
  }
  return list.slice(0, n).map(o => ({ ch: o.ch, idx: o.idx }));
}
/* 一組字的部件（按部件名去重） */
function partsOf(chars) {
  const seen = new Set(), out = [];
  chars.forEach(ch => D[ch].parts.forEach((pt, i) => { if (!seen.has(pt.n)) { seen.add(pt.n); out.push({ ch, idx: i }); } }));
  return out;
}

/* ---------- 田字格 ---------- */
function makeBox(x, y, size, ch) {
  const number = G.boxes.length + 1;
  const el = h('button', { class: 'tzg', 'aria-label': `第 ${number} 個字格`,
    style: { left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px', zIndex: 1 } });
  G.stage.append(el);
  const b = { x, y, size, ch, el, u: size / 768, filled: new Set(), done: false };
  el.onclick = e => {
    if (G.frozen || b.done) return;
    const name = G.chosen ? D[G.chosen.it.ch].parts[G.chosen.it.idx].n : G.sel?.name;
    const i = D[b.ch].parts.findIndex((part, index) => part.n === name && !b.filled.has(index));
    const target = i >= 0 ? partTarget(b, b.ch, i) : { cx: x + size / 2, cy: y + size / 2 };
    const pos = e.detail ? toStage(e.clientX, e.clientY) : { x: target.cx, y: target.cy };
    if (G.chosen) placeChosen(pos);
    else if (G.sel) moveSelected(pos);
  };
  G.boxes.push(b);
  return b;
}
const inBox = (b, pt) => pt.x >= b.x && pt.x <= b.x + b.size && pt.y >= b.y && pt.y <= b.y + b.size;
const boxAt = pt => G.boxes.find(b => inBox(b, pt));
function partTarget(b, ch, idx) { const pt = D[ch].parts[idx]; return { cx: b.x + (pt.x + pt.w / 2) * b.u, cy: b.y + (pt.y + pt.h / 2) * b.u }; }
function snapTo(p, b, ch, idx) {
  setPart(p, ch, idx);
  const part = D[ch].parts[idx];
  p.k = b.u; p.x = b.x + part.x * b.u; p.y = b.y + part.y * b.u;
  animatePlacement(p); popAnim(p);
  p.box = b; lockPiece(p); b.filled.add(idx);
}
function boxShowChar(b, ch) { // 字拼好後換成完整字形
  b.done = true; b.ch = ch;
  b.wordHint?.remove();
  b.el.classList.add('done', 'full-char');
  b.el.setAttribute('aria-label', '已拼好 ' + ch);
  b.structureLabel?.remove();
  b.structureLabel = structureBadge(ch);
  if (b.structureLabel) {
    b.structureLabel.classList.add('board-structure');
    G.boardEl.append(b.structureLabel);
    positionStructureLabel(b);
  }
  duringGame(() => {
    G.pieces.filter(p => p.locked && p.box === b).forEach(p => removePiece(p));
    b.el.append(h('img', { src: charSrc(ch), alt: ch, draggable: 'false' }));
  }, 360);
  const c = toClient(b.x + b.size / 2, b.y + b.size / 2);
  burst(c.x, c.y, 14);
}

/* 字形結構：在完整字形以外顯示示意小格，不在筆畫上加線或改色。 */
function structureBadge(ch) {
  const type = structures.characters[ch];
  // 小一目前只展示上下及左右結構，其餘字仍可正常拼砌。
  if (type !== 'tb' && type !== 'lr') return null;
  const info = structures.types[type];
  const name = info.label.endsWith('結構') ? info.label.slice(0, -2) : info.label;
  const chunks = [name];
  if (info.label.endsWith('結構')) chunks.push('結構');
  return h('span', { class: 'structure-badge', 'data-structure': type, 'data-char': ch,
    title: '「' + ch + '」：' + info.label + (info.detail ? '（' + info.detail + '）' : '') },
    h('span', { class: 'structure-diagram', 'data-enclosure': structures.enclosure[ch], 'aria-hidden': 'true' }, h('i')),
    h('span', { class: 'structure-name' }, chunks.map(chunk => h('span', null, chunk))));
}
function positionStructureLabel(box) {
  const label = box.structureLabel;
  if (!label) return;
  const width = Math.min(174, box.size * G.f - 5);
  label.classList.toggle('is-compact', width < 122);
  label.style.width = Math.max(48, width) + 'px';
  label.style.left = G.ox + (box.x + box.size / 2) * G.f + 'px';
  label.style.top = G.oy + (box.y + box.size) * G.f + 11 + 'px';
}

/* ---------- 吉祥物提示 ---------- */
const COACH_STYLES = {
  guide: { label: '一起試試', icon: 'puzzle' },
  hint: { label: '豆豆小提示', icon: 'bulb' },
  support: { label: '慢慢來，再試試', icon: 'link' },
  cheer: { label: '豆豆為你喝彩', icon: 'star' }
};
function coachPhrase(event, variables = {}) {
  const script = coachScripts[event];
  const previous = coachHistory.get(event);
  const choices = script.lines.map((line, index) => ({ line, index })).filter(item => item.index !== previous || script.lines.length === 1);
  const choice = pick(choices);
  coachHistory.set(event, choice.index);
  const values = { next: '再找一個部件，繼續試試新的組合。', ...variables };
  const fill = text => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
  return { tone: script.tone, text: fill(choice.line[0]), detail: fill(choice.line[1]) };
}
function coachCard(message, compact = false) {
  const style = COACH_STYLES[message.tone];
  const note = h('p', { class: 'coach-audio-note', hidden: true }, '這部裝置未能播放粵語，請聽老師讀一讀。');
  const avatar = h('button', { class: 'coach-avatar', type: 'button', 'aria-label': '聽豆豆說話',
    title: '按豆豆，聽聽他的說話', onclick: () => {
      note.hidden = speak(message.text + ' ' + message.detail);
    } }, mascot(compact ? 78 : 106, message.tone === 'cheer' ? 'cheer' : ''),
    h('span', { class: 'coach-listen' }, icon('speaker'), '聽豆豆說'));
  return h('div', { class: 'coach' + (compact ? ' coach-compact' : ''), 'data-tone': message.tone }, avatar,
    h('div', { class: 'coach-bubble' },
      h('div', { class: 'coach-meta' }, h('strong', null, '豆豆'), h('span', null, icon(style.icon), style.label)),
      h('p', { class: 'say' }, message.text), h('p', { class: 'coach-detail' }, message.detail), note));
}
function showCoach(message, event = '') {
  if (!G) return;
  const restoreFocus = G.helper.contains(document.activeElement);
  G.coachRevision = (G.coachRevision || 0) + 1;
  G.coachLine = message;
  G.helper.dataset.event = event;
  G.helper.replaceChildren(coachCard(message));
  if (restoreFocus) G.helper.querySelector('.coach-avatar').focus({ preventScroll: true });
}
function doudou(event, variables) {
  if (G) showCoach(coachPhrase(event, variables), event);
}
function say(text, mood = 'happy', bad = false) {
  const tone = bad ? 'support' : mood === 'cheer' ? 'cheer' : mood === 'think' ? 'hint' : 'guide';
  showCoach({ tone, text, detail: bad ? '不用急，豆豆陪你一起找線索。' : '一步一步試，豆豆陪着你。' });
}
function characterNext(ch, next) {
  const type = structures.characters[ch];
  return (type === 'lr' ? '看看它的左右兩部分。' : type === 'tb' ? '看看它的上下兩部分。' : '') + next;
}

/* ---------- 特效 ---------- */
function flash(text, cls = '') { const el = h('div', { class: 'flash ' + cls }, text); fx.append(el); setTimeout(() => el.remove(), 1400); }
function burst(cx, cy, n = 12) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const el = h('div', { class: 'particle' }, icon('star'));
    el.style.left = cx + 'px'; el.style.top = cy + 'px';
    fx.append(el);
    const a = Math.PI * 2 * i / n + rand(-.3, .3), d = rand(80, 170);
    el.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1.2) rotate(${rand(-180, 180)}deg)`, opacity: 0 }],
      { duration: rand(650, 950), easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => el.remove();
  }
}
function confetti(n = 70) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#ffd23f', '#ff9f43', '#3ccf91', '#4bb4f2', '#ff7aa2', '#a682ff'];
  for (let i = 0; i < n; i++) {
    const el = h('div', { class: 'confetti', style: { left: rand(0, 100) + 'vw', background: pick(cols), animationDuration: rand(1.6, 3) + 's', animationDelay: rand(0, .5) + 's' } });
    fx.append(el); setTimeout(() => el.remove(), 3800);
  }
}

/* ---------- 結果視窗 ---------- */
function starsEl(n) { return h('div', { class: 'stars', 'aria-label': n + ' 粒星星' }, [0, 1, 2].map(i => h('span', { class: i < n ? 'on' : '' }, icon('star')))); }
function modal(content) {
  const ov = h('dialog', { class: 'overlay', 'aria-label': '遊戲結果', oncancel: e => e.preventDefault() }, h('div', { class: 'modal' }, content));
  document.body.append(ov);
  ov.showModal();
  return ov;
}
function wordImgs(word) {
  return h('div', { class: 'word-big' }, [...word].map(ch => h('span', { class: 'word-character' },
    h('img', { src: charSrc(ch), alt: ch }), structureBadge(ch))));
}
function listenBtn(word, showLabel = false) {
  return h('button', {
    class: showLabel ? 'btn blue listen' : 'say-btn',
    'aria-label': '聽粵語讀音',
    onclick: () => { if (!speak(word)) say('請聽老師讀出詞語。'); }
  }, icon('speaker'), showLabel ? '聽讀音' : null);
}

function questionDone(word) {
  const st = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
  G.earned += st; addStars(st);
  Snd.good(); confetti(50); flash('答對了！');
  doudou(word ? 'wordDone' : 'groupDone', { word });
  const encouragement = G.coachLine;
  G.frozen = true;
  select(null); chooseTile(null);
  setProgress(G.qi + 1, G.total, `第 ${G.qi + 1}／${G.total} 題`);
  duringGame(() => {
    const last = G.qi >= G.total - 1;
    const ov = modal([
      h('h2', null, '答對了！'), coachCard(encouragement, true),
      starsEl(st), word ? wordImgs(word) : G.act === 4 ? wordImgs(G.found.join('')) : null,
      word ? listenBtn(word, true) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn white', onclick: () => renderHome(G.opts.task ? 'task' : 'free') }, icon('home'), '離開活動'),
        h('button', { class: 'btn', autofocus: true, onclick: () => { ov.close(); ov.remove(); Snd.click(); if (last) finalResult(); else { G.qi++; G.frozen = false; G.mode.load(); } } }, last ? '看成績' : '下一題'))]);
  }, 730);
}
function finalResult() {
  const max = G.total * 3, ratio = max ? G.earned / max : 0;
  const st = ratio >= .85 ? 3 : ratio >= .55 ? 2 : 1;
  Snd.win(); confetti(90);
  const act = G.act, words = G.words, opts = G.opts;
  modal([
    h('h2', null, '全部完成！'), coachCard(coachPhrase('finish'), true), starsEl(st),
    h('p', null, `你一共得到 ${G.earned} 粒星星！`),
    h('div', { class: 'row' },
      h('button', { class: 'btn white', onclick: () => startGame(act, words, opts) }, icon('reset'), '再試一次'),
      h('button', { class: 'btn', onclick: () => renderHome(opts.task ? 'task' : 'free') }, icon('home'), '選活動'))]);
}

/* ---------- 工具列 ---------- */
function tool(mark, label, cls, fn) {
  return h('button', { class: 'btn small ' + cls, onclick: () => { if (!G.frozen) { Snd.click(); fn(); } } }, mark, label);
}
function setToolbar(extra = []) {
  G.toolbar.replaceChildren(
    ...extra,
    tool(glyph('+'), '放大', 'white needs-piece', () => scaleSel(1.15)),
    tool(glyph('−'), '縮小', 'white needs-piece', () => scaleSel(1 / 1.15)),
    tool(icon('trash'), '移除', 'white needs-piece', deleteSel),
    tool(icon('clipboard'), '整理', 'white', tidy),
    tool(icon('reset'), '重設畫布', 'orange reset', () => G.mode.reset()));
  select(null);
}
function tidy() { // 把散落的部件排好
  const loose = G.pieces.filter(p => !p.locked && !p.dead);
  const area = G.mode.tidyArea ? G.mode.tidyArea() : { x: 40, y: 40, w: W - 80, h: H - 80 };
  let x = area.x, y = area.y, row = 0;
  loose.forEach(p => {
    if (x + pw(p) > area.x + area.w) { x = area.x; y += row + 20; row = 0; }
    p.x = x; p.y = Math.min(y, H - ph(p) - 10); x += pw(p) + 24; row = Math.max(row, ph(p));
    animatePlacement(p);
  });
  select(null);
}

/* ---------- 自由拼砌：自動辨認漢字 ---------- */
const MULTI = Object.keys(courseData).filter(isMulti);
function fitParts(pcs, ch) { // pcs[i] 對應 D[ch].parts[i]
  const parts = D[ch].parts;
  const P = pcs.map(center), C = parts.map(pt => ({ x: pt.x + pt.w / 2, y: pt.y + pt.h / 2 }));
  const n = P.length, pm = { x: 0, y: 0 }, cm = { x: 0, y: 0 };
  P.forEach(p => { pm.x += p.x / n; pm.y += p.y / n; }); C.forEach(c => { cm.x += c.x / n; cm.y += c.y / n; });
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (P[i].x - pm.x) * (C[i].x - cm.x) + (P[i].y - pm.y) * (C[i].y - cm.y); den += (C[i].x - cm.x) ** 2 + (C[i].y - cm.y) ** 2; }
  // 包圍結構的部件中心很接近，從部件面積估算字形大小會較穩定。
  const s = den / n < (768 * .15) ** 2
    ? pcs.reduce((sum, p, i) => sum + Math.sqrt(pw(p) * ph(p) / (parts[i].w * parts[i].h)), 0) / n
    : num / den;
  if (s <= 0) return null;
  const O = { x: pm.x - s * cm.x, y: pm.y - s * cm.y };
  let err = 0;
  for (let i = 0; i < n; i++) err = Math.max(err, Math.hypot(P[i].x - (O.x + s * C[i].x), P[i].y - (O.y + s * C[i].y)));
  err /= s * 768;
  for (let i = 0; i < n; i++) { // 大小要相近
    const r = Math.sqrt((pw(pcs[i]) * ph(pcs[i])) / (parts[i].w * parts[i].h * s * s));
    if (r < .45 || r > 2.2) return null;
  }
  if (s < G.unit * .3 || s > G.unit * 3.2) return null;
  return { s, O, err };
}
function detect(p, targets) {
  if (p.kind !== 'part') return null;
  const loose = G.pieces.filter(q => q.kind === 'part' && !q.locked && !q.dead);
  let best = null;
  for (const ch of targets) {
    if (!isMulti(ch)) continue;
    const parts = D[ch].parts;
    if (!parts.some(pt => pt.n === p.name)) continue;
    const lists = parts.map(pt => loose.filter(q => q.name === pt.n));
    if (lists.some(l => !l.length)) continue;
    let count = 0;
    const rec = (i, used) => {
      if (count > 3000) return;
      if (i === parts.length) {
        count++;
        if (!used.includes(p)) return;
        const fit = fitParts(used, ch);
        if (fit && fit.err < .17 && (!best || fit.err < best.fit.err)) best = { ch, pcs: [...used], fit };
        return;
      }
      for (const q of lists[i]) if (!used.includes(q)) { used.push(q); rec(i + 1, used); used.pop(); }
    };
    rec(0, []);
  }
  return best;
}
function formChar(m) {
  const { ch, pcs, fit } = m, { s, O } = fit;
  pcs.forEach((q, i) => {
    setPart(q, ch, i);
    const pt = D[ch].parts[i];
    q.k = s; q.x = O.x + pt.x * s; q.y = O.y + pt.y * s;
    lockPiece(q); animatePlacement(q);
  });
  Snd.snap();
  duringGame(() => {
    if (!pcs.every(q => G.pieces.includes(q))) return;
    pcs.forEach(q => removePiece(q));
    const cp = makeCharPiece(ch, s, O.x, O.y);
    popAnim(cp);
    const c = center(cp), cc = toClient(c.x, c.y);
    burst(cc.x, cc.y, 14);
  }, 340);
  Snd.good(); flash('答對了！');
  addFound(ch);
  return ch;
}
function addFound(ch) {
  const isNew = !G.found.includes(ch);
  if (isNew) G.found.push(ch);
  if (G.shelf && isNew) {
    G.shelf.querySelector('.label').textContent = `我拼出的字（${G.found.length}）：`;
    G.shelf.append(h('button', { class: 'found-char', title: ch, onclick: () => speak(ch) },
      h('img', { src: charSrc(ch), alt: ch }), structureBadge(ch)));
  }
  return isNew;
}
function makeShelf(label = '我拼出的字：') {
  G.shelf = h('div', { class: 'found-shelf' }, h('span', { class: 'label' }, label));
  G.boardTop.append(G.shelf);
}

/* ---------- 看圖：圖片卡 ---------- */
function picture(word) {
  const pic = h('div', { class: 'pic' });
  const fallback = () => pic.replaceChildren(icon('speaker'), h('span', null, '聽老師讀詞語'));
  const custom = store.get('pics', {})[word];
  const builtin = illustratedWords.has(word) ? 'assets/pictures/' + encodeURIComponent(word) + '.webp' : null;
  const src = custom || builtin;
  if (!src) fallback();
  else pic.append(h('img', { src, alt: '詞語圖片提示', onerror: fallback }));
  return pic;
}
function pictureCard(word) {
  return h('div', { class: 'picture-card' }, picture(word),
    h('div', { class: 'picture-caption' }, h('h2', null, '圖片提示'), listenBtn(word, true)));
}

/* ============ 五個活動 ============ */
const MODES = {};

function unavailable(message) {
  G.boardEl.append(h('div', { class: 'board-empty' },
    mascot(110), h('p', null, message),
    h('button', { class: 'btn white', onclick: () => renderHome(G.opts.task ? 'task' : 'free') }, '返回選擇')));
  setProgress(0, 0, '請選擇詞語');
}

/* 活動一：看圖拼字 */
MODES[1] = {
  start() {
    G.queue = [...G.words].reverse(); G.total = G.queue.length; G.qi = 0;
    setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
    this.load();
  },
  load() {
    clearBoard(); G.frozen = false;
    const w = G.queue[G.qi]; G.word = w;
    setProgress(G.qi + 1, G.total);
    G.clue.replaceChildren(pictureCard(w));
    const n = w.length, gap = 44;
    const size = Math.min(435, (W - 95 - gap * (n - 1)) / n);
    const totalW = n * size + gap * (n - 1), sx = (W - totalW) / 2;
    [...w].forEach((ch, i) => {
      const b = makeBox(sx + i * (size + gap), 72, size, ch);
      addWordHint(b, ch);
    });
    G.unit = size / 768;
    setLibrary(shuffle(partsOf([...w])));
    doudou('pictureStart');
  },
  trayPos() { return { x: 600, y: 618 }; },
  tidyArea() { return { x: 50, y: 520, w: 1100, h: 193 }; },
  onDrop(p) {
    const c = center(p), b = boxAt(c);
    if (!b || b.done) return;
    const parts = D[b.ch].parts;
    const cands = parts.map((pt, i) => ({ pt, i })).filter(o => o.pt.n === p.name && !b.filled.has(o.i));
    if (!cands.length) {
      const other = G.boxes.some(bb => bb !== b && !bb.done && D[bb.ch].parts.some((pt, i) => pt.n === p.name && !bb.filled.has(i)));
      eject(p);
      doudou(other ? 'retryOtherBox' : 'retryPicture');
      return;
    }
    let best = null;
    cands.forEach(o => { const t = partTarget(b, b.ch, o.i), d = Math.hypot(c.x - t.cx, c.y - t.cy); if (!best || d < best.d) best = { ...o, d }; });
    if (parts.length === 1 || best.d < b.size * .27) {
      snapTo(p, b, b.ch, best.i); Snd.snap();
      if (b.filled.size === parts.length) {
        boxShowChar(b, b.ch);
        if (G.boxes.every(x => x.done)) questionDone(G.word);
        else doudou('character', { char: b.ch, next: characterNext(b.ch, '再把另一個字拼好吧！') });
      } else doudou('partCorrect');
    } else doudou('adjustPosition');
  },
  hint() {
    showWordHints();
  },
  reset() { this.load(); }
};

/* 活動二：自由拼字 */
MODES[2] = {
  start() {
    G.unit = 250 / 768;
    G.chars = uniq(G.words.flatMap(w => [...w]));
    G.allParts = false;
    setProgress(0, 1, '自由探索');
    makeShelf();
    const toggle = h('button', { class: 'btn small white lib-toggle' }, '全部部件');
    toggle.onclick = () => { G.allParts = !G.allParts; toggle.textContent = G.allParts ? '本課部件' : '全部部件'; this.lib(); };
    G.libHead.append(toggle);
    setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
    this.lib();
    doudou('exploreStart');
  },
  lib() {
    clearCanvasHint();
    setLibrary(partsOf(G.allParts ? Object.keys(courseData) : G.chars));
  },
  onDrop(p) {
    if (p.kind !== 'part') return;
    if (!isMulti(p.ch)) {
      if (addFound(p.ch)) addStars(1);
      doudou('character', { char: p.ch, next: '試試再拼一個你認識的字。' });
      return;
    }
    const m = detect(p, MULTI);
    if (m) {
      const isNew = !G.found.includes(m.ch);
      formChar(m); if (isNew) addStars(1);
      doudou('character', { char: m.ch, next: characterNext(m.ch, '再試試其他部件的組合。') });
    }
  },
  hint() { showCanvasHint(G.allParts ? Object.keys(courseData) : G.chars); },
  reset() { clearBoard(); doudou('reset'); }
};

/* 活動三：部件補全 */
MODES[3] = {
  start() {
    G.queue = [];
    G.words.forEach(w => {
      if (w === '認識') { G.queue.push({ w, ci: 0, pi: 0 }); return; }
      const cs = [...w].map((c, i) => i).filter(i => isMulti(w[i]));
      if (!cs.length) return;
      const ci = pick(cs), pi = Math.floor(Math.random() * D[w[ci]].parts.length);
      G.queue.push({ w, ci, pi });
    });
    G.total = G.queue.length; G.qi = 0;
    if (!G.total) return unavailable('請選擇有可拆部件的詞語。');
    setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
    this.load();
  },
  load() {
    clearBoard(); G.frozen = false; G.hints = 0;
    const q = G.queue[G.qi], w = q.w; G.q = q;
    setProgress(G.qi + 1, G.total);
    G.clue.replaceChildren(...(w.length === 1 ? [pictureCard(w)] : []));
    const n = w.length, gap = 48, size = Math.min(435, (W - 105 - gap * (n - 1)) / n);
    const sx = (W - (n * size + gap * (n - 1))) / 2;
    G.unit = size / 768;
    [...w].forEach((ch, i) => {
      const b = makeBox(sx + i * (size + gap), 72, size, ch);
      if (i !== q.ci) {
        b.done = true; b.el.tabIndex = -1; b.el.classList.add('full-char', 'clue-char');
        b.el.setAttribute('aria-label', '提示字 ' + ch); b.el.append(h('img', { src: charSrc(ch), alt: ch })); return;
      }
      G.target = b; b.el.classList.add('target-glow');
      D[ch].parts.forEach((_, pi) => {
        if (pi === q.pi) return;
        const target = partTarget(b, ch, pi);
        const p = makePiece(ch, pi, target.cx, target.cy, b.u);
        p.box = b; lockPiece(p); b.filled.add(pi);
      });
      const pt = D[ch].parts[q.pi];
      G.slot = h('div', { class: 'slot', style: { left: b.x + pt.x * b.u - 6 + 'px', top: b.y + pt.y * b.u - 6 + 'px', width: pt.w * b.u + 12 + 'px', height: pt.h * b.u + 12 + 'px' } });
      G.stage.append(G.slot);
    });
    const miss = D[w[q.ci]].parts[q.pi];
    setLibrary(shuffle([{ ch: w[q.ci], idx: q.pi }, ...distractors(D[w[q.ci]].parts.map(p => p.n), 2, miss)]));
    doudou(n === 1 ? 'singleCompletionStart' : 'completionStart');
  },
  trayPos() { return { x: rand(200, 1000), y: rand(560, 650) }; },
  tidyArea() { return { x: 60, y: 520, w: 1080, h: 180 }; },
  onDrop(p) {
    const b = G.target, c = center(p);
    if (!inBox(b, c) || b.done) return;
    if (p.name === D[b.ch].parts[G.q.pi].n) {
      const t = partTarget(b, b.ch, G.q.pi);
      if (Math.hypot(c.x - t.cx, c.y - t.cy) > b.size * .22) {
        doudou('adjustSlot'); return;
      }
      snapTo(p, b, b.ch, G.q.pi); Snd.snap();
      G.slot.remove(); b.el.classList.remove('target-glow');
      boxShowChar(b, b.ch);
      questionDone(G.q.w);
    } else {
      eject(p);
      doudou(G.q.w.length === 1 ? 'retryPicture' : 'retryCompletion');
    }
  },
  hint() {
    G.hints++;
    if (G.hints === 1 && speak(G.q.w)) { doudou('hintSound'); }
    else { glowCard(D[G.q.w[G.q.ci]].parts[G.q.pi].n); doudou('hintGlow'); G.mistakes++; }
  },
  reset() { this.load(); }
};

/* 活動四：同部件組字 */
function findGroups(chars) {
  const m = new Map();
  chars.filter(isMulti).forEach(ch => D[ch].parts.forEach((pt, i) => {
    if (/[\u{20000}-\u{2FFFF}]/u.test(pt.n)) return;
    if (!m.has(pt.n)) m.set(pt.n, []);
    const arr = m.get(pt.n);
    if (!arr.some(o => o.ch === ch)) arr.push({ ch, idx: i });
  }));
  return [...m.entries()].filter(([, a]) => a.length >= 2).map(([name, a]) => ({ name, items: a.slice(0, 4) })).sort((x, y) => y.items.length - x.items.length);
}
MODES[4] = {
  start() {
    G.queue = selectedExtensionGroups(G.words, G.opts.common);
    G.total = G.queue.length; G.qi = 0;
    if (!G.total) return unavailable('請選擇至少兩個同部件的課外詞語。');
    if (!G.opts.task && !G.opts.common) return this.chooseGroups();
    setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
    this.load();
  },
  chooseGroups() {
    clearBoard(); G.frozen = true;
    G.boardTop.replaceChildren(); G.toolbar.replaceChildren();
    G.libHead.replaceChildren(h('h2', null, '選部首'), h('small', null, '按課堂進度選擇'));
    setLibrary([]);
    G.libGrid.append(h('p', { class: 'radical-instructions' }, '每組先重溫課文，再用相同部首學習三個新字。'));
    setProgress(0, 1, '選擇學習部首');
    const available = G.queue;
    const saved = store.get('extensionGroupNames', null);
    const defaults = extensionGroups.filter(group => group.defaultSelected).map(group => group.name);
    const validSaved = Array.isArray(saved) ? saved.filter(name => available.some(group => group.name === name)) : [];
    const selected = new Set(validSaved.length ? validSaved : defaults.filter(name => available.some(group => group.name === name)));
    if (!selected.size) available.forEach(group => selected.add(group.name));
    const count = h('p', { class: 'radical-selection-count', role: 'status' });
    const start = h('button', { class: 'btn big', onclick: () => {
      if (!selected.size) return;
      Snd.click();
      const names = available.filter(group => selected.has(group.name)).map(group => group.name);
      store.set('extensionGroupNames', names);
      G.queue = available.filter(group => selected.has(group.name));
      G.total = G.queue.length; G.qi = 0;
      G.libHead.replaceChildren(h('h2', null, '部件庫'), h('small', null, '拖動或點選部件'));
      setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
      this.load();
    } }, '開始學習');
    const update = () => {
      count.textContent = selected.size ? '已選 ' + selected.size + ' 組部首' : '請選擇至少一組部首';
      start.disabled = !selected.size;
    };
    const choices = h('div', { class: 'radical-options' }, available.map(group => {
      const ch = group.reviewWords.flatMap(word => [...word])
        .find(c => courseData[c].parts.some(part => part.n === group.name));
      const part = courseData[ch].parts.find(part => part.n === group.name);
      const checkbox = h('input', { type: 'checkbox', value: group.name, checked: selected.has(group.name),
        onchange: event => {
          if (event.target.checked) selected.add(group.name); else selected.delete(group.name);
          update();
        } });
      return h('label', { class: 'radical-option' }, checkbox,
        h('img', { class: 'radical-glyph', src: partSrc(part.f), alt: '', draggable: 'false' }),
        h('span', { class: 'radical-copy' }, h('strong', null, group.label),
          h('small', null, '重溫「' + group.reviewWords.join('、') + '」')));
    }));
    G.reviewPanel = h('section', { class: 'radical-picker', 'aria-label': '選擇學習部首' },
      h('h2', null, '今天學哪個部首？'), h('p', null, '可選一組，也可以一次學習多組。'),
      choices, h('div', { class: 'radical-picker-actions' }, count, start));
    G.boardEl.append(G.reviewPanel);
    update();
    doudou('groupSelect');
  },
  wordFor(ch) {
    const group = extensionGroups.find(g => g.targets.includes(ch));
    return group.words[group.targets.indexOf(ch)];
  },
  load() {
    clearBoard(); G.frozen = true; G.reviewing = true;
    G.boardTop.replaceChildren(); G.shelf = null;
    const q = G.queue[G.qi];
    setProgress(G.qi + 1, G.total, '先溫習・' + q.label);
    const known = uniq(q.reviewWords.flatMap(word => [...word]))
      .filter(ch => courseData[ch].parts.some(part => part.n === q.name));
    const commonIndex = courseData[known[0]].parts.findIndex(part => part.n === q.name);
    setLibrary([{ ch: known[0], idx: commonIndex, common: true }]);
    G.libGrid.querySelectorAll('button').forEach(button => { button.disabled = true; });
    G.toolbar.querySelectorAll('button').forEach(button => { button.disabled = true; });
    const reviewWord = word => h('div', { class: 'review-word', role: 'img', 'aria-label': word },
      [...word].map(ch => h('span', { class: 'review-glyph' },
        courseData[ch].parts.map(part => h('img', {
          src: partSrc(part.f), alt: '',
          class: part.n === q.name ? 'review-common' : '',
          style: { left: part.x / 768 * 100 + '%', top: part.y / 768 * 100 + '%',
            width: part.w / 768 * 100 + '%', height: part.h / 768 * 100 + '%' }
        })))));
    G.reviewPanel = h('section', { class: 'review-panel', 'aria-label': '課文字詞溫習' },
      h('h2', null, '先溫習課文'),
      q.reviewWords.map(reviewWord),
      h('p', null, '「' + known.join('、') + '」都有「' + q.name + '」部首。'),
      h('button', { class: 'btn', onclick: () => { Snd.click(); this.loadNew(); } }, '學習新字'));
    G.boardEl.append(G.reviewPanel);
    doudou('groupReview');
  },
  loadNew() {
    clearBoard(); G.frozen = false;
    G.reviewing = false;
    setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
    const q = G.queue[G.qi]; G.q = q; G.targets = q.items.map(o => o.ch); G.found = [];
    G.boardTop.replaceChildren();
    makeShelf();
    G.references = h('section', { class: 'word-references', hidden: true, 'aria-label': '詞語參考' },
      h('h2', null, '詞語參考'));
    G.referenceList = h('div', { class: 'reference-list' });
    G.references.append(G.referenceList); G.boardTop.append(G.references);
    setProgress(G.qi + 1, G.total);
    const n = G.targets.length, gap = 40, size = Math.min(340, (W - 95 - gap * (n - 1)) / n);
    const sx = (W - (n * size + gap * (n - 1))) / 2;
    G.unit = size / 768;
    G.targets.forEach((ch, i) => {
      const box = makeBox(sx + i * (size + gap), 110, size, ch);
      const commonIndex = D[ch].parts.findIndex(part => part.n === q.name);
      const pos = partTarget(box, ch, commonIndex);
      const piece = makePiece(ch, commonIndex, pos.cx, pos.cy, box.u);
      piece.box = box; lockPiece(piece); box.filled.add(commonIndex);
      box.commonPiece = piece;
      addWordHint(box, ch);
    });
    const others = partsOf(G.targets).filter(o => {
      const parts = D[o.ch].parts;
      return parts[o.idx].n !== q.name || parts.filter(part => part.n === q.name).length > 1;
    });
    setLibrary(shuffle(others));
    doudou('groupStart');
  },
  trayPos() { return { x: W / 2, y: H / 2 }; },
  onDrop(p) {
    if (p.kind !== 'part' || p.locked) return;
    const box = boxAt(center(p));
    if (!box || box.done) return;
    const ch = G.targets.find(target => {
      if (G.found.includes(target)) return false;
      const parts = D[target].parts, commonIndex = parts.findIndex(part => part.n === G.q.name);
      return parts.some((part, i) => i !== commonIndex && part.n === p.name);
    });
    if (!ch) { doudou('duplicate'); return; }
    const commonIndex = D[ch].parts.findIndex(part => part.n === G.q.name);
    const otherIndex = D[ch].parts.findIndex((part, i) => i !== commonIndex && part.n === p.name);
    box.ch = ch; box.filled.clear();
    snapTo(box.commonPiece, box, ch, commonIndex);
    snapTo(p, box, ch, otherIndex);
    boxShowChar(box, ch); addFound(ch); Snd.good(); flash('答對了！');
    const word = this.wordFor(ch);
    G.references.hidden = false;
    G.referenceList.append(h('div', { class: 'reference-word', 'data-char': ch },
      h('span', { class: 'reference-word-glyphs', role: 'img', 'aria-label': word },
        [...word].map(c => h('img', { src: charSrc(c), alt: '' }))), listenBtn(word)));
    const complete = G.found.length === G.targets.length;
    if (complete) questionDone(null);
    else doudou('character', { char: ch, next: characterNext(ch, '看看詞語參考，再拼下一個字。') });
  },
  hint() {
    const remaining = G.targets.filter(ch => !G.found.includes(ch));
    G.boxes.filter(box => !box.done).forEach((box, i) => {
      const ch = remaining[i], commonIndex = D[ch].parts.findIndex(part => part.n === G.q.name);
      box.ch = ch; box.filled.clear();
      snapTo(box.commonPiece, box, ch, commonIndex);
      box.wordHint.src = charSrc(ch);
    });
    showWordHints();
  },
  reset() { this.loadNew(); }
};

/* 活動五：限時拼字 */
const secondsFor = value => Math.round(Math.max(20, Math.min(600, Number(value) || 90)));
MODES[5] = {
  start() {
    G.unit = 230 / 768;
    G.seconds = secondsFor(G.opts.seconds || store.get('seconds', 90));
    G.targets = uniq(G.words.flatMap(w => [...w])).filter(isMulti);
    if (!G.targets.length) return unavailable('請選擇含有可拆部件的字。');
    setLibrary(partsOf(G.targets));
    makeShelf('我拼出的字：');
    G.scoreEl = h('span', null, '0');
    G.timeEl = h('span', null, G.seconds);
    G.timePill = h('span', { class: 'pill timer' }, icon('timer'), G.timeEl, ' 秒');
    G.topRight.replaceChildren(G.timePill, h('span', { class: 'pill score-pill' }, G.scoreEl, ' 字'));
    setProgress(1, 1, `${G.seconds} 秒挑戰`);
    setToolbar([tool(icon('bulb'), '提示', 'yellow', () => this.hint())]);
    doudou('timedStart', { seconds: G.seconds });
    this.countdown();
  },
  countdown() {
    G.frozen = true;
    const cd = h('dialog', { class: 'countdown', 'aria-label': '限時拼字倒數', oncancel: e => e.preventDefault() },
      h('div', { class: 'countdown-body' }, h('p', null, '準備拼字'), h('strong', { role: 'status' }),
        h('button', { class: 'btn white', onclick: () => renderHome(G.opts.task ? 'task' : 'free') }, '返回')));
    document.body.append(cd); cd.showModal();
    const number = cd.querySelector('strong');
    let n = 3;
    const step = () => {
      if (n === 0) {
        number.textContent = '開始！'; Snd.good();
        duringGame(() => { cd.close(); cd.remove(); this.go(); }, 550); return;
      }
      number.textContent = n; Snd.tick(); n--; duringGame(step, 850);
    };
    step();
  },
  go() {
    G.frozen = false; G.left = G.seconds;
    const deadline = Date.now() + G.seconds * 1000;
    G.timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (G.left === left) return;
      G.left = left; G.timeEl.textContent = G.left;
      if (G.left <= 10) { G.timePill.classList.add('hurry'); if (G.left > 0) Snd.tick(); }
      setProgress(G.left, G.seconds, `剩下 ${G.left} 秒`);
      if (G.left <= 0) { clearInterval(G.timer); this.end(); }
    }, 150);
  },
  onDrop(p) {
    if (G.frozen) return;
    const m = detect(p, G.targets);
    if (m) {
      const isNew = !G.found.includes(m.ch);
      formChar(m);
      G.scoreEl.textContent = G.found.length;
      if (isNew) doudou('character', { char: m.ch, next: characterNext(m.ch, '試試再拼另一個字。') });
      else doudou('duplicate');
      if (G.found.length === G.targets.length) {
        clearInterval(G.timer);
        G.frozen = true;
        duringGame(() => this.end(true), 520);
      }
    }
  },
  hint() {
    showCanvasHint(G.targets);
  },
  end(completed = false) {
    G.frozen = true; select(null); chooseTile(null);
    const n = G.found.length, goal = Math.min(6, G.targets.length);
    const st = n >= goal ? 3 : n >= Math.ceil(goal / 2) ? 2 : n >= 1 ? 1 : 0;
    addStars(st);
    st ? (Snd.win(), confetti(80)) : Snd.bad();
    const act = G.act, words = G.words, opts = G.opts;
    modal([
      h('h2', { class: st ? '' : 'sad' }, completed ? '全部拼好了！' : '時間到！'),
      coachCard(coachPhrase(n ? 'timedFinish' : 'timedRetry', { count: n }), true),
      h('div', { class: 'score-big' }, n), h('p', { style: { fontSize: '20px', fontWeight: 700, margin: '4px 0' } }, '個字'),
      starsEl(st),
      n ? wordImgs(G.found.join('')) : h('p', null, '下次一定可以的！'),
      h('div', { class: 'row' },
        h('button', { class: 'btn white', onclick: () => startGame(act, words, opts) }, icon('reset'), '再試一次'),
        h('button', { class: 'btn', onclick: () => renderHome(opts.task ? 'task' : 'free') }, icon('home'), '選活動'))]);
  },
  reset() {
    clearCanvasHint();
    G.pieces.forEach(p => removePiece(p));
    chooseTile(null);
    doudou('reset');
  }
};

/* 活動六：部件記憶翻翻樂 */
MODES[6] = {
  start() {
    const chars = uniq(G.words.flatMap(word => [...word])).filter(hasTwoParts);
    if (!chars.length) return unavailable('請選擇有兩個部件的字，例如「校車」或「談天」。');
    G.memoryTargets = shuffle(chars).slice(0, 3);
    G.libHead.replaceChildren(h('h2', null, '怎樣玩'), h('small', null, '老師點選，學生指出'));
    G.libHead.closest('.lib').setAttribute('aria-label', '翻牌玩法');
    setLibrary([]);
    G.libGrid.append(h('ol', { class: 'memory-instructions' },
      h('li', null, '先看看部件，記住卡片的位置。'),
      h('li', null, '蓋牌後，指出兩張卡。'),
      h('li', null, '看看兩個部件能否拼成字。')));
    G.memoryHintBtn = tool(icon('bulb'), '提示', 'yellow', () => this.hint());
    G.memoryHintBtn.title = '顯示所有部件 3 秒';
    G.toolbar.replaceChildren(G.memoryHintBtn,
      tool(icon('reset'), '重新洗牌', 'orange', () => this.reset()));
    this.reset();
  },
  reset() {
    clearBoard();
    G.memoryPanel?.remove();
    G.frozen = false; G.found = [];
    G.memoryPhase = 'preview'; G.memorySelected = []; G.memoryMoves = 0;
    G.boardTop.replaceChildren(); makeShelf('我配出的字：');
    G.memoryMoveCount = h('span', null, '0');
    G.topRight.replaceChildren(h('span', { class: 'pill' }, '配對 ', G.memoryMoveCount, ' 次'));
    setProgress(0, G.memoryTargets.length, '已配對 0／' + G.memoryTargets.length);
    G.memoryCards = shuffle(G.memoryTargets.flatMap(ch => D[ch].parts.map((part, idx) => ({
      ch, idx, part, open: true, matched: false
    }))));
    const grid = h('div', { class: 'memory-grid', style: { '--memory-columns': G.memoryCards.length === 6 ? 3 : 2 } });
    G.memoryCards.forEach((card, index) => {
      card.front = h('img', { class: 'memory-front', src: partSrc(card.part.f), alt: '' });
      card.back = h('img', { class: 'memory-back', src: 'assets/ui/doudou.webp', alt: '', hidden: true });
      card.matchLabel = h('span', { class: 'memory-match-label', hidden: true }, '已配對');
      card.el = h('button', {
        class: 'memory-card', style: { '--pc': PASTELS[index % PASTELS.length] },
        onclick: () => this.choose(card)
      }, h('span', { class: 'memory-card-number', 'aria-hidden': 'true' }, index + 1),
      card.front, card.back, card.matchLabel);
      grid.append(card.el);
    });
    G.memoryFeedback = h('p', { class: 'memory-feedback' },
      '先看看這 ' + G.memoryCards.length + ' 張卡，記住部件的位置。');
    G.memoryAction = h('button', { class: 'btn big memory-action', onclick: () => this.advance() }, '蓋牌開始');
    G.memoryPanel = h('section', { class: 'memory-panel', 'aria-label': '部件記憶卡片' },
      grid, G.memoryFeedback, h('div', { class: 'memory-actions' }, G.memoryAction));
    G.boardEl.append(G.memoryPanel);
    this.syncCards();
    doudou('memoryStart');
  },
  syncCards() {
    G.memoryCards.forEach((card, index) => {
      const visible = G.memoryPhase === 'hint' || card.open || card.matched;
      card.front.hidden = !visible; card.back.hidden = visible;
      card.matchLabel.hidden = !card.matched;
      card.el.disabled = G.memoryPhase !== 'play' || card.open || card.matched;
      card.el.classList.toggle('is-open', visible);
      card.el.classList.toggle('is-matched', card.matched);
      card.el.setAttribute('aria-label', '第 ' + (index + 1) + ' 張卡，' +
        (visible ? '部件 ' + card.part.n + (card.matched ? '，已配對' : '') : '背面'));
    });
    G.memoryAction.hidden = G.memoryPhase !== 'preview' && G.memoryPhase !== 'retry';
    G.memoryAction.textContent = G.memoryPhase === 'preview' ? '蓋牌開始' : '再試一次';
    G.memoryHintBtn.disabled = G.memoryPhase === 'preview' || G.memoryPhase === 'finished';
  },
  advance() {
    const focusCard = G.memoryPhase === 'retry' ? G.memorySelected[0] : G.memoryCards[0];
    if (G.memoryPhase === 'preview') G.memoryCards.forEach(card => { card.open = false; });
    else if (G.memoryPhase === 'retry') G.memorySelected.forEach(card => { card.open = false; });
    else return;
    G.memorySelected = []; G.memoryPhase = 'play';
    G.memoryFeedback.textContent = '指出兩張卡，試試能否拼成一個字。';
    this.syncCards();
    focusCard.el.focus({ preventScroll: true });
    doudou('memoryPlay');
  },
  hint() {
    if (G.frozen || !['play', 'retry', 'hint'].includes(G.memoryPhase)) return;
    clearTimeout(G.memoryHintTimer);
    G.memoryPhase = 'hint';
    G.memoryFeedback.textContent = '看看所有部件，3 秒後會自動蓋牌。';
    this.syncCards();
    doudou('memoryHint');
    G.memoryHintTimer = duringGame(() => {
      G.memoryCards.forEach(card => { if (!card.matched) card.open = false; });
      G.memorySelected = []; G.memoryPhase = 'play';
      G.memoryFeedback.textContent = '提示結束了，再指出兩張卡，試試拼成字。';
      this.syncCards();
      doudou('memoryHintEnd');
    }, 3000);
  },
  choose(card) {
    if (G.frozen || G.memoryPhase !== 'play' || card.open || card.matched) return;
    card.open = true; G.memorySelected.push(card); Snd.pick();
    this.syncCards();
    if (G.memorySelected.length < 2) {
      G.memoryFeedback.textContent = '再指出一張卡。';
      return;
    }
    G.memoryMoves++; G.memoryMoveCount.textContent = G.memoryMoves;
    const names = G.memorySelected.map(item => item.part.n).sort().join('|');
    const ch = G.memoryTargets.find(target => !G.found.includes(target) &&
      D[target].parts.map(part => part.n).sort().join('|') === names);
    if (!ch) {
      G.mistakes++; G.memoryPhase = 'retry';
      G.memoryFeedback.textContent = '這兩個部件還拼不出這回合的字，記住位置，再試一次。';
      this.syncCards(); Snd.drop();
      doudou('memoryRetry');
      return;
    }
    G.memorySelected.forEach(item => { item.matched = true; });
    G.memorySelected = [];
    addFound(ch); Snd.good();
    G.memoryFeedback.replaceChildren(
      h('img', { class: 'memory-made', src: charSrc(ch), alt: ch }),
      h('span', { class: 'memory-success-copy' }, h('span', null, '配對成功！拼出了「' + ch + '」。'), structureBadge(ch)));
    setProgress(G.found.length, G.memoryTargets.length, '已配對 ' + G.found.length + '／' + G.memoryTargets.length);
    if (G.found.length === G.memoryTargets.length) {
      G.memoryPhase = 'finished';
      duringGame(() => this.finish(), 900);
    }
    this.syncCards();
    doudou('character', { char: ch, next: characterNext(ch,
      G.found.length === G.memoryTargets.length ? '再看看我們配好的字。' : '回想卡片的位置，再找下一對部件。') });
  },
  finish() {
    G.frozen = true;
    const stars = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
    addStars(stars); Snd.win(); confetti(60);
    const words = G.words, opts = G.opts;
    modal([
      h('h2', null, '全部配對成功！'), coachCard(coachPhrase('memoryFinish', { count: G.found.length }), true), starsEl(stars),
      wordImgs(G.found.join('')),
      h('p', null, '用了 ' + G.memoryMoves + ' 次配對，拼出 ' + G.found.length + ' 個字。'),
      h('div', { class: 'row' },
        h('button', { class: 'btn white', onclick: () => startGame(6, words, opts) }, icon('reset'), '再玩一回合'),
        h('button', { class: 'btn', onclick: () => renderHome(opts.task ? 'task' : 'free') }, icon('home'), '選活動'))
    ]);
  }
};

/* ============ 老師設定 ============ */
function openTeacher() {
  const ov = h('dialog', { class: 'overlay', 'aria-label': '老師設定' });
  const body = h('div', { class: 't-body' });
  const tabs = [['bank', '素材庫'], ['task', '指定任務'], ['pics', '詞語圖片'], ['new', '新增素材庫'], ['set', '設定']];
  const tabBar = h('div', { class: 't-tabs' });
  const show = tab => {
    [...tabBar.children].forEach((b, i) => {
      b.classList.toggle('on', tabs[i][0] === tab);
      b.setAttribute('aria-pressed', String(tabs[i][0] === tab));
    });
    body.replaceChildren(...panels[tab]()); body.scrollTop = 0;
  };
  tabBar.append(...tabs.map(([id, name]) => h('button', { class: 'tab', onclick: () => show(id) }, name)));
  const close = () => {
    ov.close(); ov.remove();
    if (app.querySelector('.home')) renderHome();
    else if (app.querySelector('.welcome')) renderWelcome();
  };
  ov.append(h('div', { class: 'modal teacher' },
    h('div', { class: 't-head' }, icon('clipboard'), h('h2', null, '老師設定'),
      h('button', { class: 'btn white small', onclick: close }, '關閉')),
    tabBar, body));
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
  ov.addEventListener('cancel', e => { e.preventDefault(); close(); });

  let bankId = bank().id;
  let draftAct = learningMode().firstActivity;
  const bankSelect = (tab, value) => h('select', {
    'aria-label': '課文', onchange: e => { bankId = e.target.value; show(tab); }
  }, banks().map(b => h('option', { value: b.id, selected: b.id === value }, '《' + b.title + '》')));
  const chosenBank = () => banks().find(b => b.id === bankId) || bank();
  const field = (label, id, control) => h('div', { class: 'field' }, h('label', { class: 'f', for: id }, label), control);
  const status = () => h('p', { class: 'form-status', role: 'status' });
  const decompRow = ch => h('div', { class: 'dc' },
    h('img', { src: charSrc(ch), alt: ch }), glyph('='),
    D[ch].parts.map((pt, i) => [i ? glyph('+') : null, h('img', { src: partSrc(pt.f), alt: pt.n, title: pt.n })]));

  const panels = {
    bank() {
      const b = chosenBank();
      return [
        h('p', { class: 'help' }, '學生可在「自由探索」選擇課文與章節。字形及部件圖片取自',
          h('a', { href: SOURCE, target: '_blank', rel: 'noopener' }, '香港小學習字表'), '的筆順圖。'),
        h('p', { class: 'f' }, '課文'), bankSelect('bank', b.id),
        ...b.chapters.map(c => h('section', { class: 'chap' }, h('h3', null, chapterHeading(c)),
          wordGroups(b, c).map(group => h('div', { class: 'word-group' },
            group.label ? h('h4', null, group.label) : null,
            group.words.filter(validWord).map(w => h('div', { class: 'word-sample' }, h('b', null, w),
              h('div', { class: 'decomp' }, [...w].map(decompRow)))))))),
        h('h3', null, '同部件組字・課外拓展'),
        h('p', { class: 'help' }, '以下詞語專供「同部件組字」學習新字。學生先重溫課文，再把其餘部件放進已有共同部首的字格，成功後查看詞語參考。'),
        ...extensionGroups.map(group => h('section', { class: 'chap' }, h('h3', null, group.name + ' 部件'),
          group.words.map((word, i) => h('div', { class: 'word-sample' }, h('b', null, word), decompRow(group.targets[i])))))
      ];
    },
    task() {
      const b = draftAct === 4 ? extensionBank : chosenBank();
      const availableWord = draftAct === 4 ? w => extensionWords.includes(w) : validWord;
      const selected = new Set();
      const msg = status(), list = h('div');
      const actBox = h('div', { class: 'act-pick' });
      const name = h('input', { id: 'task-name', type: 'text', placeholder: '例如第三章溫習（可留空）', maxlength: 50 });
      const sec = h('input', { id: 'task-seconds', type: 'number', min: 20, max: 600, value: store.get('seconds', 90) });
      const common = h('select', { id: 'task-common' });
      const secRow = field('限時（秒）', sec.id, sec);
      const commonRow = field('指定共同部件', common.id, common);
      const characters = () => uniq([...selected].flatMap(w => [...w]));
      const updateCommon = () => {
        const value = common.value;
        common.replaceChildren(h('option', { value: '' }, '由所選詞語配對'),
          ...(draftAct === 4 ? selectedExtensionGroups([...selected]) : findGroups(characters())).map(g => h('option', { value: g.name, selected: g.name === value },
            g.name + '（' + g.items.map(item => item.ch).join('、') + '）')));
      };
      const updateAct = () => {
        [...actBox.children].forEach((button, i) => {
          button.classList.toggle('on', ACTS[i].id === draftAct);
          button.setAttribute('aria-pressed', String(ACTS[i].id === draftAct));
        });
        secRow.hidden = draftAct !== 5; commonRow.hidden = draftAct !== 4;
      };
      actBox.append(...ACTS.map(a => h('button', { onclick: () => {
        draftAct = a.id; show('task');
      } }, icon(a.icon), a.name)));
      updateAct(); updateCommon();
      const syncWords = () => {
        body.querySelectorAll('input[type=checkbox]').forEach(input => { input.checked = selected.has(input.value); });
        updateCommon(); msg.textContent = '';
      };
      const selectAll = (words, label) => h('button', { class: 'btn small white', 'aria-label': '全選' + label, onclick: () => {
        words.filter(availableWord).forEach(w => selected.add(w)); syncWords();
      } }, '全選');
      const wordCheck = w => h('label', { class: 'wcheck' }, h('input', { type: 'checkbox', value: w, onchange: e => {
        if (e.target.checked) selected.add(w); else selected.delete(w);
        syncWords();
      } }), w);
      const chapters = b.chapters.map(c => h('section', { class: 'chap' },
        h('h3', null, chapterHeading(c), selectAll(chapterWords(c), c.title + '所有詞語')),
        wordGroups(b, c).map(group => h('div', { class: 'word-group' },
          group.label ? h('h4', null, group.label,
            c.extraWords?.length ? selectAll(group.words, c.title + group.label) : null) : null,
          h('div', { class: 'wordrow' }, group.words.filter(availableWord).map(wordCheck))))));
      const drawList = () => {
        const tasks = store.get('tasks', []);
        list.replaceChildren(...(tasks.length ? tasks.map((t, i) => {
          const a = actById(t.act);
          return h('div', { class: 't-task' }, icon(a?.icon || 'clipboard'),
            h('span', { class: 'grow' }, (t.name || a?.name || '老師任務') + ' ・ ' + t.words.join('、')),
            h('button', { class: 'btn small pink', onclick: () => {
              const next = store.get('tasks', []); next.splice(i, 1);
              if (store.set('tasks', next)) drawList(); else msg.textContent = '未能移除任務。';
            } }, '刪除'));
        }) : [h('p', { class: 'help' }, '暫時未有任務。')]));
      };
      const makeTask = () => {
        const words = [...selected], chars = characters();
        let problem = '';
        if (!words.length) problem = '請選擇至少一個詞語。';
        else if (draftAct === 3 && words.some(w => ![...w].some(isMulti))) problem = '部件補全的每個詞語須有至少一個可拆的字。';
        else if (draftAct === 4 && !selectedExtensionGroups(words, common.value).length) problem = '請在同一部件組中選擇至少兩個課外詞語。';
        else if (draftAct === 5 && !chars.some(isMulti)) problem = '請選擇至少一個有可拆部件的字。';
        else if (draftAct === 6 && !chars.some(hasTwoParts)) problem = '翻翻樂需要至少一個有兩個部件的字。';
        msg.textContent = problem;
        if (problem) return null;
        return { act: draftAct, words, common: draftAct === 4 ? common.value : '', seconds: secondsFor(sec.value), name: name.value.trim() };
      };
      drawList();
      return [
        h('p', { class: 'help' }, '發佈後，學生可在「老師任務」開始。任務會儲存在這部裝置的瀏覽器。'),
        h('p', { class: 'f' }, '活動'), actBox, secRow,
        draftAct === 6 ? h('p', { class: 'help' }, '每回合會從所選詞語抽出最多三個字，每個字有兩個部件。老師可先展示卡片，再按「蓋牌開始」。') : null,
        h('p', { class: 'f' }, draftAct === 4 ? '教材' : '課文'),
        draftAct === 4 ? h('p', { class: 'help' }, '課外拓展・學習新的同部件字') : bankSelect('task', b.id),
        h('p', { class: 'f' }, '詞語'), ...chapters, commonRow, field('任務名稱', name.id, name), msg,
        h('div', { class: 't-actions' },
          h('button', { class: 'btn', onclick: () => {
            const t = makeTask(); if (!t) return;
            const tasks = store.get('tasks', []); tasks.push(t);
            if (!store.set('tasks', tasks)) { msg.textContent = '未能儲存，請檢查瀏覽器的儲存空間。'; return; }
            msg.textContent = '已發佈。請在「' + modeForActivity(actById(t.act)).name + '」的「老師任務」開始。';
            drawList(); Snd.good();
          } }, '發佈任務'),
          h('button', { class: 'btn white', onclick: () => {
            const t = makeTask(); if (!t) return;
            ov.close(); ov.remove(); S.homeTab = 'task'; startGame(t.act, t.words, { seconds: t.seconds, task: t, common: t.common });
          } }, '立即開始')),
        h('p', { class: 'f' }, '已發佈的任務'), list
      ];
    },
    pics() {
      const words = uniq(banks().flatMap(b => b.chapters.flatMap(chapterWords)));
      const msg = status();
      return [h('p', { class: 'help' }, '上載的圖片會取代預設圖卡，並儲存在這部裝置的瀏覽器。'), msg,
        ...words.map(w => {
          const thumb = h('div', { class: 'thumb' });
          const remove = h('button', { class: 'btn small white', onclick: () => {
            const pics = store.get('pics', {}); delete pics[w];
            if (!store.set('pics', pics)) { msg.textContent = '未能移除圖片。'; return; }
            msg.textContent = w + '的上載圖片已移除。'; draw();
          } }, '移除');
          const draw = () => {
            thumb.replaceChildren(picture(w));
            remove.disabled = !store.get('pics', {})[w];
          };
          draw();
          const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => {
            const f = e.target.files[0]; if (!f) return;
            const url = URL.createObjectURL(f), im = new Image();
            im.onerror = () => { URL.revokeObjectURL(url); msg.textContent = '未能讀取圖片，請選擇另一個圖片檔案。'; };
            im.onload = () => {
              URL.revokeObjectURL(url);
              const scale = Math.min(1, 640 / Math.max(im.naturalWidth, im.naturalHeight));
              const cv = document.createElement('canvas');
              cv.width = Math.max(1, Math.round(im.naturalWidth * scale)); cv.height = Math.max(1, Math.round(im.naturalHeight * scale));
              cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
              const pics = store.get('pics', {}); pics[w] = cv.toDataURL('image/webp', .87);
              if (!store.set('pics', pics)) { msg.textContent = '儲存空間不足，請先移除部分圖片。'; return; }
              msg.textContent = w + '的圖片已儲存。'; draw();
            };
            im.src = url; file.value = '';
          } });
          return h('div', { class: 'pic-row' }, thumb, h('b', { class: 'w' }, w), file,
            h('button', { class: 'btn small blue', 'aria-label': '上載' + w + '的圖片', onclick: () => file.click() }, '上載'), remove);
        })];
    },
    new() {
      const title = h('input', { id: 'bank-title', type: 'text', maxlength: 50, placeholder: '例如我的好朋友' });
      const chapter = h('input', { id: 'bank-chapter', type: 'text', maxlength: 50, placeholder: '例如第一課' });
      const words = h('textarea', { id: 'bank-words', placeholder: '例如校園、喜歡、照顧' });
      const msg = status(), list = h('div');
      const drawList = () => {
        const custom = store.get('customBanks', []);
        list.replaceChildren(...custom.map((b, i) => h('div', { class: 't-task' }, icon('book'),
          h('span', { class: 'grow' }, '《' + b.title + '》' + b.chapters.map(c => c.title + ' ' + c.words.join('、')).join(' ｜ ')),
          h('button', { class: 'btn small pink', onclick: () => {
            custom.splice(i, 1);
            if (!store.set('customBanks', custom)) { msg.textContent = '未能移除素材庫。'; return; }
            if (S.bankId === b.id) { S.bankId = window.WORD_BANKS[0].id; S.chap = null; }
            drawList();
          } }, '刪除'))));
      };
      drawList();
      return [
        h('p', { class: 'help' }, '用已有字形的字組成一至四字詞語，以頓號或空格分開。同名素材庫可繼續加入章節。'),
        h('details', null, h('summary', null, '查看支援的字'),
          h('p', { class: 'help supported' }, Object.keys(courseData).join('、')),
          h('p', { class: 'help' }, '專案可透過 tools/decomp.json 及 tools/build_parts.py 增加字形素材。')),
        field('課文名稱', title.id, title), field('章節名稱', chapter.id, chapter), field('詞語', words.id, words), msg,
        h('button', { class: 'btn', onclick: () => {
          const values = uniq(words.value.trim().split(/[\s、,，;；]+/).filter(Boolean));
          const invalid = values.filter(w => !validWord(w));
          if (!title.value.trim() || !values.length) { msg.textContent = '請輸入課文名稱和詞語。'; return; }
          if (invalid.length) { msg.textContent = '請檢查詞語長度及字形支援：' + invalid.join('、'); return; }
          const custom = store.get('customBanks', []);
          const existing = custom.find(b => b.title === title.value.trim());
          const item = { title: chapter.value.trim() || '第 ' + ((existing?.chapters.length || 0) + 1) + ' 部分', words: values };
          if (existing) existing.chapters.push(item);
          else custom.push({ id: 'c' + Date.now(), title: title.value.trim(), chapters: [item] });
          if (!store.set('customBanks', custom)) { msg.textContent = '未能儲存素材庫。'; return; }
          words.value = ''; chapter.value = ''; msg.textContent = '素材庫已儲存。'; drawList(); Snd.good();
        } }, '儲存素材庫'),
        h('p', { class: 'f' }, '自訂素材庫'), list
      ];
    },
    set() {
      const sec = h('input', { id: 'default-seconds', type: 'number', min: 20, max: 600, value: store.get('seconds', 90) });
      const msg = status();
      return [
        field('限時拼字的預設秒數', sec.id, sec), msg,
        h('button', { class: 'btn', onclick: () => {
          sec.value = secondsFor(sec.value);
          msg.textContent = store.set('seconds', Number(sec.value)) ? '已儲存。' : '未能儲存。';
        } }, '儲存'),
        h('p', { class: 'f' }, '累積星星'), h('p', { class: 'help' }, '目前共 ' + S.stars + ' 粒。'),
        h('button', { class: 'btn orange small', onclick: () => {
          if (confirm('把星星數目歸零？')) { S.stars = 0; addStars(0); show('set'); }
        } }, '星星歸零'),
        h('p', { class: 'f' }, '讀音'), h('p', { class: 'help' }, '如瀏覽器或裝置沒有粵語語音，請由老師朗讀。')
      ];
    }
  };
  show('bank');
  document.body.append(ov);
  ov.showModal();
}

renderWelcome();
})();
