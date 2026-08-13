/* ════════════════════════════════════════════════════════════
   NEBULA OS — браузерная операционная система
   Чистый JavaScript, без внешних библиотек.
   ------------------------------------------------------------
   Модули:
     Store        — обёртка над localStorage (сохранение состояния)
     Settings     — темы (dark/neon/cyberpunk) и обои рабочего стола
     WM           — менеджер окон (создание, фокус, drag, resize, сворачивание)
     Dock         — панель задач с иконками приложений и часами
     Notif        — центр уведомлений: тосты + история в localStorage
     VFS          — виртуальная файловая система в localStorage
     Apps         — приложения: Заметки, Файлы, Терминал, Калькулятор, Настройки
     DesktopIcons — иконки на рабочем столе (выделение, открытие по dblclick)
     Ctx          — контекстное меню рабочего стола (ПКМ)
     Matrix       — полноэкранный «дождь из кода» для терминала
     Boot         — экран загрузки
   ════════════════════════════════════════════════════════════ */

'use strict';

const Nebula = (() => {

  /* ───────────────────────── Хранилище ───────────────────────── */
  const Store = {
    get(key, fallback) {
      try {
        const v = JSON.parse(localStorage.getItem(key));
        return v === null || v === undefined ? fallback : v;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch { notifySystem({ icon: '⚠️', title: 'Хранилище переполнено', text: 'Браузер не даёт записать больше данных в localStorage.', silent: true }); }
    },
  };

  // Экранирование HTML для вывода пользовательского текста
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Утилиты
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = n => String(n).padStart(2, '0');

  // Иконка файла по имени (общая для «Файлов» и браузера)
  function fileIcon(name) {
    const ext = (String(name).split('.').pop() || '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return '🖼️';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return '🎵';
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return '🎬';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['js', 'ts', 'py', 'html', 'css', 'json', 'sh'].includes(ext)) return '🧩';
    return '📄';
  }

  /* ───────────────────────── Темы и обои ───────────────────────── */
  // Описания тем: имя для UI + цвета превью-карточек в настройках
  const THEMES = {
    dark:      { name: 'Ночь',        desc: 'Классика',       preview: ['#1b1236', '#7c3aed', '#22d3ee'] },
    neon:      { name: 'Неон',        desc: 'Кислотный цвет', preview: ['#0f0c29', '#ff2d95', '#17e9ff'] },
    cyberpunk: { name: 'Киберпанк',   desc: 'Город будущего', preview: ['#140f0a', '#ffb020', '#ff2d78'] },
  };

  // Идентификаторы обоев (стили — в style.css через data-wallpaper)
  const WALLPAPERS = [
    { id: 'aurora', name: 'Аврора',    desc: 'Северное сияние', preview: 'linear-gradient(160deg,#0b0d1f,#1b1236 45%,#0f2b46)' },
    { id: 'sunset', name: 'Закат',     desc: 'Тёплый огонь',    preview: 'linear-gradient(165deg,#1c0e2e,#5b1e4e 40%,#c2410c 78%,#f59e0b)' },
    { id: 'ocean',  name: 'Океан',     desc: 'Глубина',         preview: 'linear-gradient(170deg,#020617,#0c4a6e 45%,#22d3ee 120%)' },
    { id: 'mono',   name: 'Монохром',  desc: 'Минимализм',      preview: 'linear-gradient(165deg,#0a0a0c,#1c1c22 45%,#2e2e38)' },
  ];

  const Settings = {
    theme: Store.get('nebula.theme', 'dark'),
    wallpaper: Store.get('nebula.wallpaper', 'aurora'),

    applyTheme(id) {
      if (!THEMES[id]) return false;
      this.theme = id;
      document.documentElement.dataset.theme = id;
      Store.set('nebula.theme', id);
      return true;
    },

    applyWallpaper(id) {
      const desk = document.getElementById('desktop');
      if (!WALLPAPERS.some(w => w.id === id)) return false;
      this.wallpaper = id;
      desk.dataset.wallpaper = id;
      Bg.setWallpaper(id);
      Store.set('nebula.wallpaper', id);
      return true;
    },

    reset() {
      localStorage.removeItem('nebula.theme');
      localStorage.removeItem('nebula.wallpaper');
      this.applyTheme('dark');
      this.applyWallpaper('aurora');
    },
  };

  /* ───────────────────────── Аудио-движок (Web Audio API) ───────────────────────── */
  // Короткие звуки UI (клик/открытие/закрытие/ошибка) + мастер-шина громкости.
  // В среде без AudioContext (jsdom, старые браузеры) все методы безопасно
  // «молчат», поэтому UI не ломается.
  const AudioSys = {
    ctx: null,
    master: null,
    volume: 0.7,
    muted: false,

    init() {
      this.volume = Store.get('nebula.volume', 0.7);
      this.muted = Store.get('nebula.muted', false);
    },

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },

    // Базовый «блип»: осциллятор + огибающая затухания + lowpass
    blip(freq, dur = 0.12, type = 'sine', vol = 0.16, slide = 0) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2200;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(lp); lp.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.05);
    },

    click()   { this.blip(620, .07, 'sine', .1); },
    open()    { this.blip(440, .1, 'sine', .12, 380); },
    close()   { this.blip(520, .12, 'sine', .12, -260); },
    error()   { this.blip(190, .18, 'sawtooth', .08); this.blip(150, .2, 'sawtooth', .07); },
    success() { this.blip(660, .09, 'sine', .1); setTimeout(() => this.blip(880, .12, 'sine', .1), 90); },

    setVolume(v) {
      this.volume = clamp(v, 0, 1);
      if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
      Store.set('nebula.volume', this.volume);
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
      Store.set('nebula.muted', this.muted);
      return this.muted;
    },
  };

  /* ───────────────────────── Живой фон: canvas-частицы ───────────────────────── */
  // Рой светящихся частиц с параллаксом за курсором; оттенок зависит от обоев.
  const Bg = {
    canvas: null, ctx: null,
    parts: [], raf: 0,
    hue: 262, alpha: 1,
    mouse: { x: -9999, y: -9999 },

    init() {
      this.canvas = document.getElementById('bg-canvas');
      if (!this.canvas || !this.canvas.getContext) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('pointermove', e => {
        this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      });
      const n = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 20000));
      for (let i = 0; i < n; i++) this.parts.push(this.make());
      this.loop();
    },

    make() {
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - .5) * .55,
        vy: (Math.random() - .5) * .55,
        r: Math.random() * 2.2 + .7,
      };
    },

    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    // Оттенок частиц под обои
    setWallpaper(id) {
      const hues = { aurora: 262, sunset: 18, ocean: 205, mono: 220 };
      this.hue = hues[id] ?? 262;
      this.alpha = id === 'mono' ? .5 : 1;
    },

    loop() {
      const { ctx, parts } = this;
      const W = window.innerWidth, H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      // Параллакс: частицы слегка тянутся за курсором
      const px = (this.mouse.x - W / 2) * .012;
      const py = (this.mouse.y - H / 2) * .012;

      for (const p of parts) {
        p.x += p.vx + px * .006;
        p.y += p.vy + py * .006;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `hsl(${this.hue} 85% 70%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Линии между близкими частицами
      ctx.lineWidth = .6;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            ctx.globalAlpha = (1 - Math.sqrt(d2) / 130) * .35 * this.alpha;
            ctx.strokeStyle = `hsl(${this.hue} 90% 75%)`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      this.raf = requestAnimationFrame(() => this.loop());
    },
  };

  /* ───────────────────────── Менеджер окон ───────────────────────── */
  const WM = {
    layer: null,          // контейнер окон (#windows-layer)
    windows: new Map(),   // appId -> элемент окна
    active: null,         // окно в фокусе
    zTop: 20,             // счётчик z-index (каждый фокус повышает)
    seed: 0,              // счётчик для каскадного позиционирования

    init() {
      this.layer = document.getElementById('windows-layer');
    },

    // Позиционирование без перекрытия: сканируем сетку и ищем первое
    // свободное место, не пересекающееся ни с одним открытым окном.
    nextPos(width, height) {
      const wins = [...this.windows.values()];

      // Пересекается ли кандидат (x, y) хотя бы с одним видимым окном?
      const collides = (x, y, w, h) => wins.some(win => {
        if (win.classList.contains('is-minimized')) return false; // свёрнутое не занимает место
        const a = { l: x, t: y, r: x + w, b: y + h };
        const b = { l: win.offsetLeft, t: win.offsetTop, r: win.offsetLeft + win.offsetWidth, b: win.offsetTop + win.offsetHeight };
        return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
      });

      const base = 24;
      const maxLeft = Math.max(base, window.innerWidth - width - 24);
      const maxTop = Math.max(base, window.innerHeight - this.dockHeight() - height - 24);

      // Два прохода: сначала редкая сетка (40px), затем более точная (20px),
      // чтобы поймать свободные места, не выровненные по шагу.
      for (const step of [40, 20]) {
        for (let y = base; y <= maxTop; y += step) {
          for (let x = base; x <= maxLeft; x += step) {
            if (!collides(x, y, width, height)) return { left: x, top: y };
          }
        }
      }
      // Места не осталось — каскадный фолбэк
      const n = (this.seed++) % 5;
      return {
        left: Math.min(base + n * 40, maxLeft),
        top: Math.min(base + n * 40, maxTop),
      };
    },

    dockHeight() { return 96; },

    // Открыть приложение: новое окно или фокус существующего
    open(appId) {
      const app = Apps.list[appId];
      if (!app) return;
      const win = this.windows.get(appId);

      if (win) {
        if (win.classList.contains('is-minimized')) this.restore(win);
        this.focus(win);
        return;
      }
      this.create(app);
    },

    create(app) {
      const layer = this.layer;
      // Если прошлое окно ещё «дозакрывается» (анимация ~240мс) — убираем
      // его сразу, чтобы не получилось два окна одного приложения.
      layer.querySelectorAll(`.window.is-closing[data-app="${app.id}"]`)
           .forEach(w => w.remove());

      const width = Math.min(app.width, window.innerWidth - 24);
      const height = Math.min(app.height, window.innerHeight - this.dockHeight() - 24);
      const pos = this.nextPos(width, height);

      // ── Каркас окна ──
      const win = document.createElement('div');
      win.className = 'window';
      win.dataset.app = app.id;
      win.style.width = width + 'px';
      win.style.height = height + 'px';
      win.style.left = pos.left + 'px';
      win.style.top = pos.top + 'px';

      win.innerHTML = `
        <header class="win-header">
          <div class="win-title">
            <span class="win-ico">${app.icon}</span>
            <span>${app.name}</span>
          </div>
          <div class="win-controls">
            <button class="win-ctl min"  title="Свернуть" aria-label="Свернуть"></button>
            <button class="win-ctl max"  title="Развернуть" aria-label="Развернуть"></button>
            <button class="win-ctl close" title="Закрыть" aria-label="Закрыть"></button>
          </div>
        </header>
        <div class="win-body"></div>
        <div class="win-resize" data-dir="n"></div>
        <div class="win-resize" data-dir="s"></div>
        <div class="win-resize" data-dir="e"></div>
        <div class="win-resize" data-dir="w"></div>
        <div class="win-resize" data-dir="ne"></div>
        <div class="win-resize" data-dir="nw"></div>
        <div class="win-resize" data-dir="se"></div>
        <div class="win-resize" data-dir="sw"></div>`;

      const body = win.querySelector('.win-body');
      win._app = app;

      // Приложение монтирует своё содержимое
      const hooks = app.mount(body, win) || {};
      win._focusHook = hooks.focus || null;
      win._destroyHook = hooks.destroy || null;

      this.wireWindow(win);
      layer.appendChild(win);
      this.windows.set(app.id, win);
      this.focus(win);
      AudioSys.open();
      Dock.refresh();

      // Передаём фокус содержимому приложения (напр. инпут терминала)
      if (win._focusHook) setTimeout(() => { if (!win._destroyed) win._focusHook(); }, 320);
      return win;
    },

    // События окна: фокус, кнопки, перетаскивание
    wireWindow(win) {
      // Любой клик по окну выводит его на передний план
      win.addEventListener('pointerdown', () => this.focus(win));

      // Кнопки управления
      const ctl = win.querySelector('.win-controls');
      ctl.addEventListener('click', (e) => {
        const btn = e.target.closest('.win-ctl');
        if (!btn) return;
        e.stopPropagation();
        if (btn.classList.contains('close')) this.close(win);
        else if (btn.classList.contains('min')) this.minimize(win);
        else if (btn.classList.contains('max')) this.toggleMaximize(win);
      });

      // Двойной клик по шапке — развернуть/восстановить
      win.querySelector('.win-header').addEventListener('dblclick', (e) => {
        if (e.target.closest('.win-controls')) return;
        this.toggleMaximize(win);
      });

      // Перетаскивание за шапку
      this.wireDrag(win);

      // Изменение размера за ручки
      this.wireResize(win);
    },

    wireDrag(win) {
      const header = win.querySelector('.win-header');
      header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.win-controls')) return;
        if (win.classList.contains('is-maximized')) return; // развёрнутое не таскаем

        this.focus(win);
        const rect = win.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMove = (ev) => {
          // Ограничиваем перетаскивание: шапка (зона захвата) всегда остаётся
          // в пределах экрана — окно нельзя «потерять» за краем.
          const maxX = window.innerWidth - 80;
          const maxY = window.innerHeight - this.dockHeight() - 20;
          const minX = -(win.offsetWidth - 160); // видно минимум ~160px окна
          const x = Math.min(Math.max(ev.clientX - offsetX, minX), maxX);
          const y = Math.min(Math.max(ev.clientY - offsetY, 0), maxY);
          win.style.left = x + 'px';
          win.style.top = y + 'px';
        };
        const onUp = () => {
          document.body.classList.remove('dragging');
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        };

        document.body.classList.add('dragging');
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    },

    // Изменение размера окна: 8 ручек по краям и углам
    wireResize(win) {
      const handles = win.querySelectorAll('.win-resize');
      const MIN_W = 280, MIN_H = 200;
      const maxW = () => window.innerWidth - 16;
      const maxH = () => window.innerHeight - this.dockHeight() - 16;

      handles.forEach(h => {
        h.addEventListener('pointerdown', (e) => {
          if (win.classList.contains('is-maximized')) return;
          e.preventDefault();
          e.stopPropagation();
          this.focus(win);

          const dir = h.dataset.dir;
          const start = win.getBoundingClientRect();
          const sx = e.clientX, sy = e.clientY;
          // Во время ресайза курсор «прилипает» к направлению ручки
          const cursor = getComputedStyle(h).cursor;
          document.body.style.cursor = cursor;

          const onMove = (ev) => {
            const dx = ev.clientX - sx;
            const dy = ev.clientY - sy;

            let left = start.left, top = start.top;
            let width = start.width, height = start.height;

            if (dir.includes('e')) width = start.width + dx;
            if (dir.includes('s')) height = start.height + dy;
            if (dir.includes('w')) { width = start.width - dx; left = start.left + dx; }
            if (dir.includes('n')) { height = start.height - dy; top = start.top + dy; }

            // Минимальные размеры: правый/нижний край остаются на месте
            if (width < MIN_W) {
              if (dir.includes('w')) left = start.left + start.width - MIN_W;
              width = MIN_W;
            }
            if (height < MIN_H) {
              if (dir.includes('n')) top = start.top + start.height - MIN_H;
              height = MIN_H;
            }
            width = Math.min(width, maxW());
            height = Math.min(height, maxH());

            // Окно не уходит за край: минимум 160px остаётся видимым
            const minX = -(width - 160);
            const maxX = Math.max(minX, window.innerWidth - 160);
            left = Math.min(Math.max(left, minX), maxX);
            top = Math.min(Math.max(top, 0), Math.max(0, window.innerHeight - this.dockHeight() - 20));

            win.style.left = left + 'px';
            win.style.top = top + 'px';
            win.style.width = width + 'px';
            win.style.height = height + 'px';
          };

          const onUp = () => {
            document.body.style.cursor = '';
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
          };

          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
        });
      });
    },

    focus(win) {
      if (!win || win._destroyed) return;
      if (win.classList.contains('is-minimized')) return; // свёрнутое не фокусируем

      this.active = win;
      win.style.zIndex = ++this.zTop;
      this.windows.forEach(w => w.classList.toggle('is-focused', w === win));
      Dock.refresh();
    },

    minimize(win) {
      win.classList.add('is-minimized');
      win.classList.remove('is-focused'); // гасим подсветку фокуса
      if (this.active === win) this.active = null;
      // После анимации прячем из потока отрисовки
      setTimeout(() => {
        if (win.classList.contains('is-minimized')) win.style.visibility = 'hidden';
      }, 240);
      AudioSys.click();
      Dock.refresh();
    },

    restore(win) {
      win.classList.remove('is-minimized');
      win.style.visibility = '';
      this.focus(win);
      // Возвращаем фокус содержимому приложения (напр. инпут терминала)
      if (win._focusHook) setTimeout(() => { if (!win._destroyed) win._focusHook(); }, 260);
    },

    toggleMaximize(win) {
      const isMax = win.classList.toggle('is-maximized');
      if (isMax) {
        // Сохраняем позицию и размер до разворачивания
        win._saved = {
          left: win.style.left, top: win.style.top,
          width: win.style.width, height: win.style.height,
        };
        win.style.left = '0px';
        win.style.top = '0px';
        win.style.width = window.innerWidth + 'px';
        win.style.height = (window.innerHeight - this.dockHeight()) + 'px';
        win.querySelector('.win-ctl.max').title = 'Восстановить';
      } else {
        const s = win._saved;
        if (s) {
          win.style.left = s.left; win.style.top = s.top;
          win.style.width = s.width; win.style.height = s.height;
        }
        win.querySelector('.win-ctl.max').title = 'Развернуть';
        this.focus(win);
      }
      Dock.refresh();
    },

    close(win) {
      if (win._destroyed) return;
      // Хук очистки приложения (остановка матрицы, интервалов и т.п.)
      if (win._destroyHook) { try { win._destroyHook(); } catch {} }

      win._destroyed = true;
      win.classList.add('is-closing');
      this.windows.delete(win.dataset.app);
      if (this.active === win) this.active = null;

      setTimeout(() => win.remove(), 240);
      AudioSys.close();
      Dock.refresh();
    },

    count() { return this.windows.size; },
  };

  /* ───────────────────────── Dock ───────────────────────── */
  const Dock = {
    iconsEl: null,
    iconEls: new Map(),

    init() {
      this.iconsEl = document.getElementById('dock-icons');
      for (const id in Apps.list) {
        const app = Apps.list[id];
        if (app.dock === false) continue; // скрытые приложения

        const icon = document.createElement('button');
        icon.className = 'dock-icon';
        icon.dataset.app = id;
        icon.setAttribute('aria-label', app.name);
        icon.innerHTML = `
          <span>${app.icon}</span>
          <span class="tip">${app.name}</span>
          <span class="dot"></span>`;
        icon.addEventListener('click', () => WM.open(id));
        this.iconsEl.appendChild(icon);
        this.iconEls.set(id, icon);
      }
      this.refresh();
      this.startClock();
    },

    // Индикация: открыто / свёрнуто / в фокусе
    refresh() {
      this.iconEls.forEach((icon, id) => {
        const win = WM.windows.get(id);
        icon.classList.toggle('is-open', !!win && !win._destroyed);
        icon.classList.toggle('is-min', !!(win && win.classList.contains('is-minimized')));
        icon.classList.toggle('is-active', WM.active === win && !!win);
      });
    },

    startClock() {
      const timeEl = document.getElementById('clock-time');
      const dateEl = document.getElementById('clock-date');
      const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      const tick = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${hh}:${mm}:${ss}`;
        dateEl.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      };
      tick();
      setInterval(tick, 1000);
    },
  };

  /* ───────────────────────── Системный трей ───────────────────────── */
  // Wi-Fi (симуляция), громкость с попапом и полноэкранный режим.
  const Tray = {
    wifiOn: true,

    init() {
      this.wireWifi();
      this.wireVolume();
      this.wireFullscreen();
    },

    wireWifi() {
      const wifi = document.getElementById('tray-wifi');
      if (!wifi) return;
      wifi.addEventListener('click', () => {
        this.wifiOn = !this.wifiOn;
        wifi.textContent = this.wifiOn ? '📶' : '📵';
        wifi.classList.toggle('off', !this.wifiOn);
        wifi.title = this.wifiOn ? 'Wi-Fi: подключено' : 'Wi-Fi: отключено';
        AudioSys.click();
        notifySystem({
          icon: this.wifiOn ? '📶' : '📵',
          title: 'Сеть',
          text: this.wifiOn ? 'Wi-Fi подключён' : 'Wi-Fi отключён',
        });
      });
    },

    wireVolume() {
      const volBtn = document.getElementById('tray-vol');
      const pop = document.getElementById('vol-pop');
      if (!volBtn || !pop) return;
      const slider = document.getElementById('vol-slider');
      const ico = document.getElementById('vol-ico');
      const muteBtn = document.getElementById('vol-mute');
      slider.value = Math.round(AudioSys.volume * 100);

      const updIco = () => {
        const v = AudioSys.volume;
        const lvl = AudioSys.muted || v === 0 ? 0 : v < .35 ? 1 : v < .7 ? 2 : 3;
        ico.textContent = ['🔇', '🔈', '🔉', '🔊'][lvl];
        muteBtn.textContent = AudioSys.muted ? '🔊 Включить звук' : '🔇 Выключить звук';
        volBtn.textContent = ico.textContent;
      };
      updIco();

      volBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.classList.toggle('show');
      });
      slider.addEventListener('input', () => { AudioSys.setVolume(slider.value / 100); updIco(); });
      muteBtn.addEventListener('click', () => { AudioSys.toggleMute(); updIco(); AudioSys.click(); });
      document.getElementById('vol-test').addEventListener('click', () => AudioSys.success());
      document.addEventListener('pointerdown', (e) => {
        if (!pop.contains(e.target) && e.target !== volBtn) pop.classList.remove('show');
      });
    },

    wireFullscreen() {
      const full = document.getElementById('tray-full');
      if (!full) return;
      full.addEventListener('click', () => {
        AudioSys.click();
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => {
        const on = !!document.fullscreenElement;
        full.textContent = on ? '✕' : '⛶';
        full.title = on ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим';
      });
    },
  };

  /* ───────────────────────── Меню «Пуск» ───────────────────────── */
  const StartMenu = {
    el: null,
    bootTime: Date.now(),
    updater: 0,

    init() {
      this.el = document.getElementById('start-menu');
      if (!this.el) return;
      this.build();
      const btn = document.getElementById('start-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioSys.click();
        this.toggle();
      });
      document.addEventListener('pointerdown', (e) => {
        if (!this.el.contains(e.target) && e.target !== btn) this.close();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    },

    build() {
      const apps = Object.values(Apps.list)
        .filter(a => a.dock !== false)
        .map(a => `<button class="sm-app" data-app="${a.id}"><span class="sa-ico">${a.icon}</span><span class="sa-name">${escapeHtml(a.name)}</span></button>`)
        .join('');
      this.el.innerHTML = `
        <div class="sm-user">
          <div class="sm-avatar">Г</div>
          <div>
            <div class="sm-name">Гость Nebula</div>
            <div class="sm-sub">Рабочая станция · без входа в систему</div>
          </div>
        </div>
        <div class="sm-stats">
          <div class="sm-stat"><div class="smk">Система</div><div class="smv">Nebula OS 1.1</div></div>
          <div class="sm-stat"><div class="smk">Окна</div><div class="smv" id="sm-wins">0</div></div>
          <div class="sm-stat"><div class="smk">Тема</div><div class="smv" id="sm-theme">—</div></div>
          <div class="sm-stat"><div class="smk">Обои</div><div class="smv" id="sm-wall">—</div></div>
          <div class="sm-stat"><div class="smk">Аптайм</div><div class="smv" id="sm-uptime">0с</div></div>
          <div class="sm-stat sm-ram">
            <div class="smk">Память</div>
            <div class="smv" id="sm-ram">0 МБ / 8192 МБ</div>
            <div class="ram-bar"><i id="sm-ram-bar"></i></div>
          </div>
        </div>
        <div class="sm-sec-title">Приложения</div>
        <div class="sm-apps">${apps}</div>
        <div class="sm-foot">
          <button class="sm-btn reboot" id="sm-reboot">⟳&nbsp; Перезагрузить ОС</button>
        </div>`;

      this.el.querySelectorAll('.sm-app').forEach(b => b.addEventListener('click', () => {
        this.close();
        WM.open(b.dataset.app);
      }));
      document.getElementById('sm-reboot').addEventListener('click', () => {
        this.close();
        Boot.reboot();
      });
    },

    toggle() { this.el.classList.contains('show') ? this.close() : this.open(); },

    open() {
      this.el.classList.add('show');
      document.getElementById('start-btn').classList.add('active');
      this.refresh();
      this.updater = setInterval(() => this.refresh(), 1000);
      AudioSys.open();
    },

    close() {
      this.el.classList.remove('show');
      document.getElementById('start-btn').classList.remove('active');
      clearInterval(this.updater);
    },

    refresh() {
      const up = Math.floor((Date.now() - this.bootTime) / 1000);
      const d = Math.floor(up / 86400), h = Math.floor(up / 3600) % 24,
            m = Math.floor(up / 60) % 60, s = up % 60;
      document.getElementById('sm-uptime').textContent =
        (d ? d + 'д ' : '') + pad2(h) + ':' + pad2(m) + ':' + pad2(s);
      document.getElementById('sm-wins').textContent = WM.count();
      document.getElementById('sm-theme').textContent = THEMES[Settings.theme].name;
      document.getElementById('sm-wall').textContent = WALLPAPERS.find(w => w.id === Settings.wallpaper).name;
      const used = 2400 + WM.count() * 420 + Math.round(Math.random() * 120);
      const pct = Math.min(100, Math.round(used / 8192 * 100));
      document.getElementById('sm-ram').textContent = `${used} МБ / 8192 МБ`;
      document.getElementById('sm-ram-bar').style.width = pct + '%';
    },
  };

  /* ───────────────────────── Центр уведомлений ───────────────────────── */
  // Системные сообщения: всплывающие тосты справа сверху + история в localStorage.
  const Notif = {
    el: null,          // #notif-center — панель-«шторка»
    toastsEl: null,    // #toasts — стек всплывающих уведомлений
    bell: null,
    badge: null,
    items: [],         // история: [{ id, icon, title, text, app, time, read }]
    unread: 0,
    open: false,
    ready: false,
    quotaWarned: false,
    KEY: 'nebula.notifs',
    MAX: 50,

    init() {
      this.el = document.getElementById('notif-center');
      this.toastsEl = document.getElementById('toasts');
      this.bell = document.getElementById('notif-bell');
      this.badge = document.getElementById('notif-badge');

      this.items = Store.get(this.KEY, []);
      this.unread = 0; // после перезагрузки всё считается прочитанным
      this.renderCenter();
      this.updateBadge();

      this.bell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      // Закрытие по клику вне панели и по Esc
      document.addEventListener('pointerdown', (e) => {
        if (this.open && !this.el.contains(e.target) && e.target !== this.bell) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });

      this.ready = true;
    },

    // Новое уведомление: { icon, title, text, app, timeout, silent }
    push({ icon = '🔔', title = 'Уведомление', text = '', app = null, timeout = 5000, silent = false } = {}) {
      const n = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        icon, title, text, app,
        time: Date.now(),
        read: false,
      };
      this.items.unshift(n);
      if (this.items.length > this.MAX) this.items.length = this.MAX;
      Store.set(this.KEY, this.items);

      this.unread++;
      this.updateBadge();
      if (!silent) this.showToast(n);
      this.renderCenter();
      return n;
    },

    showToast(n) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = `
        <span class="toast-ico">${n.icon}</span>
        <div class="toast-body">
          <div class="toast-title">${escapeHtml(n.title)}</div>
          ${n.text ? `<div class="toast-text">${escapeHtml(n.text)}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Закрыть">✕</button>
        <i class="toast-bar"></i>`;

      let gone = false;
      const close = () => {
        if (gone) return;
        gone = true;
        t.classList.add('out');
        setTimeout(() => t.remove(), 300);
      };
      t.querySelector('.toast-close').addEventListener('click', (e) => {
        e.stopPropagation();
        close();
      });
      // Клик по уведомлению: открыть связанное приложение
      t.addEventListener('click', () => {
        if (n.app) WM.open(n.app);
        this.markRead(n.id);
        close();
      });

      this.toastsEl.appendChild(t);
      requestAnimationFrame(() => t.classList.add('in'));

      // Прогресс-бар и автоскрытие (длительность берём из самого уведомления)
      const bar = t.querySelector('.toast-bar');
      const ttl = n.timeout || 5000;
      bar.style.animationDuration = ttl + 'ms';
      setTimeout(close, ttl);
    },

    markRead(id) {
      const n = this.items.find(i => i.id === id);
      if (n && !n.read) {
        n.read = true;
        if (this.unread > 0) this.unread--;
        this.updateBadge();
      }
    },

    updateBadge() {
      this.bell.classList.toggle('has-unread', this.unread > 0);
      if (this.unread > 0) {
        this.badge.hidden = false;
        this.badge.textContent = this.unread > 99 ? '99+' : String(this.unread);
      } else {
        this.badge.hidden = true;
      }
    },

    toggle() {
      if (this.open) this.close();
      else this.openCenter();
    },

    openCenter() {
      this.open = true;
      this.el.classList.add('show');
      this.items.forEach(n => { n.read = true; });
      this.unread = 0;
      this.updateBadge();
      this.renderCenter();
    },

    close() {
      this.open = false;
      this.el.classList.remove('show');
    },

    clearAll() {
      this.items = [];
      this.unread = 0;
      Store.set(this.KEY, []);
      this.updateBadge();
      this.renderCenter();
    },

    removeItem(id) {
      this.items = this.items.filter(i => i.id !== id);
      Store.set(this.KEY, this.items);
      this.renderCenter();
    },

    renderCenter() {
      if (!this.items.length) {
        this.el.innerHTML = `
          <div class="nc-head"><span>Уведомления</span></div>
          <div class="nc-empty">Нет уведомлений</div>`;
        return;
      }
      this.el.innerHTML = `
        <div class="nc-head">
          <span>Уведомления</span>
          <button class="nc-clear" type="button">Очистить все</button>
        </div>
        <div class="nc-list">
          ${this.items.map(n => `
            <div class="nc-item${n.app ? ' is-clickable' : ''}" data-id="${n.id}" data-app="${n.app || ''}">
              <span class="nc-ico">${n.icon}</span>
              <div class="nc-body">
                <div class="nc-title">${escapeHtml(n.title)}</div>
                ${n.text ? `<div class="nc-text">${escapeHtml(n.text)}</div>` : ''}
                <div class="nc-time">${this.timeAgo(n.time)}</div>
              </div>
              <button class="nc-del" aria-label="Удалить">✕</button>
            </div>`).join('')}
        </div>`;

      this.el.querySelector('.nc-clear').addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAll();
      });
      this.el.querySelectorAll('.nc-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const item = btn.closest('.nc-item');
          if (item) this.removeItem(item.dataset.id);
        });
      });
      this.el.querySelectorAll('.nc-item.is-clickable').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.nc-del')) return;
          const n = this.items.find(x => x.id === item.dataset.id);
          if (n && n.app) WM.open(n.app);
          this.close();
        });
      });
    },

    timeAgo(t) {
      const s = Math.floor((Date.now() - t) / 1000);
      if (s < 10) return 'только что';
      if (s < 60) return s + ' с назад';
      const m = Math.floor(s / 60);
      if (m < 60) return m + ' мин назад';
      const h = Math.floor(m / 60);
      if (h < 24) return h + ' ч назад';
      return new Date(t).toLocaleDateString('ru-RU');
    },

    quotaWarn() {
      if (this.quotaWarned) return;
      this.quotaWarned = true;
      this.push({ icon: '⚠️', title: 'Хранилище переполнено', text: 'Браузер не даёт записать больше данных в localStorage.', silent: true });
    },
  };

  // Уведомление о системном событии (вызывается из настроек, терминала, ПКМ-меню)
  function notifySystem(o) {
    if (Notif.ready) Notif.push(o);
  }

  /* ───────────────────────── Виртуальная файловая система ───────────────────────── */
  // Дерево каталогов хранится в localStorage как вложенные объекты:
  //   { name: { type: 'dir'|'file', children?: {...}, content?: string, mtime: number } }
  const VFS = {
    key: 'nebula.fs',
    data: null,

    init() {
      const raw = localStorage.getItem(this.key);
      if (raw) { try { this.data = JSON.parse(raw); } catch {} }
      if (!this.data || !this.data['/']) {
        this.data = this.seed();
        this.save();
      }
    },

    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch {}
    },

    // Нормализация пути: '..', '.', '~' → /home/guest, лишние слэши
    norm(p) {
      p = String(p == null ? '/' : p).replace(/\\/g, '/').trim();
      if (!p) p = '/';
      if (p === '~') p = '/home/guest';
      else if (p.startsWith('~/')) p = '/home/guest' + p.slice(1);
      if (p[0] !== '/') p = '/' + p;
      const out = [];
      for (const seg of p.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') out.pop();
        else out.push(seg);
      }
      return '/' + out.join('/');
    },

    node(path) {
      let cur = this.data['/'];
      const parts = this.norm(path).split('/').filter(Boolean);
      for (const seg of parts) {
        if (!cur || cur.type !== 'dir') return null;
        cur = (cur.children || {})[seg];
      }
      return cur || null;
    },

    exists(path) { return !!this.node(path); },
    isDir(path) { const n = this.node(path); return !!n && n.type === 'dir'; },

    // Родительский узел и имя последнего сегмента пути
    split(path) {
      const parts = this.norm(path).split('/').filter(Boolean);
      const name = parts.pop() || '';
      const parent = this.node('/' + parts.join('/'));
      return { parent, name };
    },

    readDir(path) {
      const n = this.node(path);
      if (!n || n.type !== 'dir') return null;
      const kids = Object.entries(n.children || {}).map(([name, node]) => ({
        name,
        type: node.type,
        mtime: node.mtime || 0,
        size: node.type === 'file' ? (node.content || '').length : null,
      }));
      kids.sort((a, b) =>
        a.type === b.type
          ? a.name.localeCompare(b.name, 'ru')
          : (a.type === 'dir' ? -1 : 1));
      return kids;
    },

    mkdir(path) {
      const { parent, name } = this.split(path);
      if (!parent || parent.type !== 'dir') return 'Родительская папка не найдена';
      if (!name) return 'Некорректный путь';
      if (parent.children[name]) return 'Элемент с таким именем уже существует';
      parent.children[name] = { type: 'dir', mtime: Date.now(), children: {} };
      this.save();
      return null;
    },

    writeFile(path, content) {
      const { parent, name } = this.split(path);
      if (!parent || parent.type !== 'dir') return 'Родительская папка не найдена';
      if (!name) return 'Некорректный путь';
      parent.children[name] = {
        type: 'file',
        mtime: Date.now(),
        content: String(content == null ? '' : content),
      };
      this.save();
      return null;
    },

    readFile(path) {
      const n = this.node(path);
      return n && n.type === 'file' ? (n.content || '') : null;
    },

    remove(path) {
      if (this.norm(path) === '/') return 'Нельзя удалить корень';
      const { parent, name } = this.split(path);
      if (!name) return 'Некорректный путь';
      if (!parent || !parent.children[name]) return 'Элемент не найден';
      delete parent.children[name];
      this.save();
      return null;
    },

    rename(path, newName) {
      newName = String(newName || '').trim();
      if (!newName) return 'Пустое имя';
      if (newName.includes('/') || newName === '.' || newName === '..') return 'Некорректное имя';
      const { parent, name } = this.split(path);
      if (!parent || !parent.children[name]) return 'Элемент не найден';
      if (parent.children[newName]) return 'Элемент с таким именем уже существует';
      parent.children[newName] = parent.children[name];
      delete parent.children[name];
      this.save();
      return null;
    },

    // Размер всего дерева (для статус-бара)
    totalSize(node) {
      if (!node) return 0;
      if (node.type === 'file') return (node.content || '').length;
      return Object.values(node.children || {}).reduce((s, n) => s + this.totalSize(n), 0);
    },

    humanSize(bytes) {
      if (bytes < 1024) return bytes + ' Б';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
      return (bytes / 1048576).toFixed(1) + ' МБ';
    },

    seed() {
      const now = Date.now();
      const file = (content) => ({ type: 'file', mtime: now, content });
      const dir = (children = {}) => ({ type: 'dir', mtime: now, children });
      return {
        '/': dir({
          'README.txt': file(`Добро пожаловать в Nebula OS!

Это виртуальная файловая система, которая живёт в localStorage
вашего браузера — всё созданное переживёт перезагрузку.

Подсказки:
  • Двойной клик по папке — открыть
  • Двойной клик по файлу — открыть редактор
  • ПКМ по файлу — переименовать / удалить / скачать
  • В терминале: ls /, cat /README.txt, mkdir, touch, rm
`),
          'home': dir({
            'guest': dir({
              'Документы': dir({
                'hello.txt': file('Привет, мир!\n\nЭто файл из виртуальной файловой системы Nebula OS.\nОтредактируй меня и нажми «Сохранить» (или Ctrl+S).\n'),
                'план.txt': file('План на день:\n1. Изучить Nebula OS\n2. Создать файл\n3. Написать заметку\n4. Насладиться закатом обоев\n'),
              }),
              'Изображения': dir({}),
              'welcome.txt': file('Привет, guest!\n\nЭто твоя домашняя папка. Загляни в «Документы».\nВ терминале можно набрать «ls /home/guest».\n'),
            }),
          }),
          'system': dir({
            'about.txt': file('Nebula OS 1.0.0\nОперационная система в браузере.\n\nЯдро: nebula-kernel 4.20.6-zen\nФайловая система: nebula-vfs (localStorage)\nОконный менеджер: glass-wm 1.0\n'),
          }),
        }),
      };
    },
  };

  /* ───────────────────────── Приложения ───────────────────────── */
  // Каждое приложение: { id, name, icon, width, height, dock, mount(body, win) -> {destroy?, focus?} }

  /* ---- Файлы: виртуальная файловая система ---- */
  function mountFiles(body) {
    VFS.init();

    const root = document.createElement('div');
    root.className = 'app-files';
    root.innerHTML = `
      <div class="files-toolbar">
        <div class="files-nav">
          <button class="fbtn" id="files-back" data-act="back" title="Назад" aria-label="Назад">◀</button>
          <button class="fbtn" id="files-fwd" data-act="fwd" title="Вперёд" aria-label="Вперёд">▶</button>
          <button class="fbtn" data-act="up" title="На уровень выше" aria-label="Вверх">▲</button>
        </div>
        <div class="files-path" id="files-path"></div>
        <div class="files-actions">
          <button class="fbtn" data-act="newfolder" title="Новая папка">＋ Папка</button>
          <button class="fbtn" data-act="newfile" title="Новый файл">＋ Файл</button>
          <button class="fbtn" data-act="view" id="files-view" title="Сменить вид"></button>
        </div>
      </div>
      <div class="files-area">
        <div class="files-grid" tabindex="-1"></div>
        <div class="files-empty">Папка пуста</div>
      </div>
      <div class="files-status">
        <span id="files-count"></span>
        <span id="files-space"></span>
      </div>`;

    const grid = root.querySelector('.files-grid');
    const empty = root.querySelector('.files-empty');
    const pathEl = root.querySelector('#files-path');
    const countEl = root.querySelector('#files-count');
    const spaceEl = root.querySelector('#files-space');
    const viewBtn = root.querySelector('#files-view');
    const backBtn = root.querySelector('#files-back');
    const fwdBtn = root.querySelector('#files-fwd');

    const savedCwd = Store.get('nebula.filesCwd', '/home/guest');
    const state = {
      cwd: VFS.isDir(savedCwd) ? savedCwd : '/home/guest',
      hist: [],
      hi: -1,
      view: Store.get('nebula.filesView', 'grid'),
    };
    state.hist = [state.cwd];
    state.hi = 0;

    // ── Вспомогательное ──
    const joinPath = (p, name) => VFS.norm(p + '/' + name);
    const baseName = (p) => { const parts = VFS.norm(p).split('/'); return parts.pop() || '/'; };

    function iconFor(item) {
      return item.type === 'dir' ? '📁' : fileIcon(item.name);
    }

    // Уникальное имя: «Новая папка», «Новая папка (2)»…
    function uniqueName(base, isDir) {
      const exists = n => VFS.exists(joinPath(state.cwd, n));
      if (!exists(base)) return base;
      for (let i = 2; i < 100; i++) {
        const cand = isDir ? `${base} (${i})` : base.replace(/(\.[^.]*)?$/, ` (${i})$1`);
        if (!exists(cand)) return cand;
      }
      return base + ' ' + Date.now();
    }

    function plural(n) {
      if (n % 10 === 1 && n % 100 !== 11) return '';
      if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'а';
      return 'ов';
    }

    // ── Навигация ──
    function go(path, push = true) {
      path = VFS.norm(path);
      if (!VFS.isDir(path)) path = '/';
      if (path === state.cwd) { render(); return; }
      state.cwd = path;
      Store.set('nebula.filesCwd', path);
      if (push) {
        state.hist = state.hist.slice(0, state.hi + 1);
        state.hist.push(path);
        state.hi = state.hist.length - 1;
      }
      render();
    }

    function back() {
      if (state.hi > 0) { state.hi--; state.cwd = state.hist[state.hi]; Store.set('nebula.filesCwd', state.cwd); render(); }
    }
    function fwd() {
      if (state.hi < state.hist.length - 1) { state.hi++; state.cwd = state.hist[state.hi]; Store.set('nebula.filesCwd', state.cwd); render(); }
    }
    function up() { go(joinPath(state.cwd, '..')); }

    function openItem(item) {
      const p = joinPath(state.cwd, item.name);
      if (item.type === 'dir') go(p);
      else openEditor(p);
    }

    // ── Отрисовка ──
    function breadcrumbHtml(path) {
      const parts = path === '/' ? [] : path.split('/').filter(Boolean);
      let acc = '';
      let html = '<button class="crumb" data-path="/" title="Корень">⌂</button>';
      parts.forEach(seg => {
        acc += '/' + seg;
        html += `<span class="crumb-sep">›</span><button class="crumb" data-path="${acc}">${escapeHtml(seg)}</button>`;
      });
      return html;
    }

    function render() {
      grid.classList.toggle('list', state.view === 'list');
      viewBtn.textContent = state.view === 'grid' ? '☰' : '▦';
      viewBtn.title = state.view === 'grid' ? 'Вид: список' : 'Вид: сетка';
      backBtn.disabled = state.hi <= 0;
      fwdBtn.disabled = state.hi >= state.hist.length - 1;

      pathEl.innerHTML = breadcrumbHtml(state.cwd);

      const items = VFS.readDir(state.cwd) || [];
      grid.innerHTML = '';
      empty.style.display = items.length ? 'none' : '';
      empty.textContent = state.cwd === '/' ? 'Файловая система пуста' : 'Папка пуста';

      items.forEach(item => {
        const el = document.createElement('button');
        el.className = 'files-item';
        el.dataset.path = joinPath(state.cwd, item.name);
        el.innerHTML = `
          <span class="fi-ico">${iconFor(item)}</span>
          <span class="fi-name">${escapeHtml(item.name)}</span>
          <span class="fi-meta">${item.type === 'dir' ? 'папка' : VFS.humanSize(item.size)}</span>`;

        const p = el.dataset.path;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectItem(p, el);
        });
        el.addEventListener('dblclick', () => openItem(item));
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectItem(p, el);
          showItemMenu(e.clientX, e.clientY, p, item);
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') openItem(item);
          else if (e.key === 'Delete') { e.preventDefault(); removeItem(p); }
          else if (e.key === 'F2') startRename(p);
        });
        grid.appendChild(el);
      });

      const dirs = items.filter(i => i.type === 'dir').length;
      const files = items.length - dirs;
      countEl.textContent = `${items.length} элемент${plural(items.length)} · папок: ${dirs} · файлов: ${files}`;
      spaceEl.textContent = `занято: ${VFS.humanSize(VFS.totalSize(VFS.node('/')))}`;
    }

    function selectItem(p, el) {
      grid.querySelectorAll('.files-item').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
      el.focus();
    }

    // ── Создание и переименование ──
    function newFolder() {
      const name = uniqueName('Новая папка', true);
      const err = VFS.mkdir(joinPath(state.cwd, name));
      if (err) { toast(err); return; }
      render();
      startRename(joinPath(state.cwd, name));
    }

    function newFile() {
      const name = uniqueName('новый файл.txt', false);
      const err = VFS.writeFile(joinPath(state.cwd, name), '');
      if (err) { toast(err); return; }
      render();
      startRename(joinPath(state.cwd, name));
    }

    function startRename(path) {
      const name = baseName(path);
      const el = grid.querySelector(`.files-item[data-path="${CSS.escape(path)}"]`);
      if (!el) return;
      const nameEl = el.querySelector('.fi-name');
      const input = document.createElement('input');
      input.className = 'files-rename';
      input.value = name;
      input.spellcheck = false;

      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        const v = input.value.trim();
        if (v && v !== name) {
          const err = VFS.rename(path, v);
          if (err) toast(err);
        }
        render();
      };
      const cancel = () => { if (done) return; done = true; render(); };

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') cancel();
      });
      input.addEventListener('blur', commit);
      input.addEventListener('click', e => e.stopPropagation());
      input.addEventListener('dblclick', e => e.stopPropagation());

      nameEl.replaceWith(input);
      input.focus();
      input.select();
    }

    // ── Удаление ──
    function removeItem(path) {
      const name = baseName(path);
      const isDir = VFS.isDir(path);
      confirmDialog(
        `Удалить ${isDir ? 'папку' : 'файл'} <b>«${escapeHtml(name)}»</b>?<br>Действие нельзя отменить.`,
        () => {
          const err = VFS.remove(path);
          if (err) toast(err);
          else render();
        });
    }

    // ── Скачивание ──
    function downloadFile(path) {
      const content = VFS.readFile(path);
      if (content === null) { toast('Файл не найден'); return; }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = baseName(path);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // ── Редактор текстовых файлов ──
    function openEditor(path) {
      let content = VFS.readFile(path);
      if (content === null) { toast('Файл не найден'); return; }
      const overlay = document.createElement('div');
      overlay.className = 'files-overlay';
      overlay.innerHTML = `
        <div class="files-editor">
          <div class="files-editor-bar">
            <span class="fe-title">📄 ${escapeHtml(baseName(path))}</span>
            <div class="fe-controls">
              <button class="fbtn fe-save">💾 Сохранить</button>
              <button class="fbtn fe-close" title="Закрыть">✕</button>
            </div>
          </div>
          <textarea class="fe-body" spellcheck="false"></textarea>
        </div>`;

      const ta = overlay.querySelector('.fe-body');
      ta.value = content;

      overlay.querySelector('.fe-save').addEventListener('click', () => {
        VFS.writeFile(path, ta.value);
        content = ta.value;
        toast('Сохранено', 'ok');
        render();
      });

      // Закрытие с проверкой несохранённых изменений
      const closeEditor = () => {
        if (ta.value !== content) {
          confirmDialog(
            `Файл <b>«${escapeHtml(baseName(path))}»</b> изменён.<br>Закрыть без сохранения?`,
            () => overlay.remove(),
            'Закрыть');
          return;
        }
        overlay.remove();
      };
      overlay.querySelector('.fe-close').addEventListener('click', closeEditor);
      overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) closeEditor(); });
      ta.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          overlay.querySelector('.fe-save').click();
        } else if (e.key === 'Escape') {
          closeEditor();
        }
      });

      root.appendChild(overlay);
      ta.focus();
    }

    // ── Подтверждение удаления ──
    function confirmDialog(html, onYes, yesLabel = 'Удалить') {
      const overlay = document.createElement('div');
      overlay.className = 'files-overlay';
      overlay.innerHTML = `
        <div class="files-confirm">
          <div class="fc-text">${html}</div>
          <div class="fc-btns">
            <button class="fbtn fc-no">Отмена</button>
            <button class="fbtn danger fc-yes">${escapeHtml(yesLabel)}</button>
          </div>
        </div>`;
      overlay.querySelector('.fc-no').addEventListener('click', () => overlay.remove());
      overlay.querySelector('.fc-yes').addEventListener('click', () => { overlay.remove(); onYes(); });
      overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) overlay.remove(); });
      root.appendChild(overlay);
      overlay.querySelector('.fc-yes').focus();
    }

    // ── Всплывающее сообщение ──
    function toast(msg, kind = 'err') {
      const t = document.createElement('div');
      t.className = 'files-toast ' + kind;
      t.textContent = msg;
      root.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 250);
      }, 2200);
    }

    // ── Контекстное меню элемента ──
    function showItemMenu(x, y, path, item) {
      const isDir = item.type === 'dir';
      Ctx.show(x, y, [
        { icon: isDir ? '📂' : '📄', label: 'Открыть', act: 'open' },
        { icon: '✏️', label: 'Переименовать', act: 'rename' },
        ...(isDir ? [] : [{ icon: '⬇️', label: 'Скачать', act: 'download' }]),
        { sep: true },
        { icon: '🗑️', label: 'Удалить', act: 'delete' },
      ], {
        open: () => openItem(item),
        rename: () => startRename(path),
        download: () => downloadFile(path),
        delete: () => removeItem(path),
      });
    }

    // ── События приложения ──
    root.addEventListener('click', (e) => {
      const crumb = e.target.closest('.crumb');
      if (crumb) { go(crumb.dataset.path); return; }
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'back') back();
      else if (act === 'fwd') fwd();
      else if (act === 'up') up();
      else if (act === 'newfolder') newFolder();
      else if (act === 'newfile') newFile();
      else if (act === 'view') {
        state.view = state.view === 'grid' ? 'list' : 'grid';
        Store.set('nebula.filesView', state.view);
        render();
      }
    });

    // Клик по пустому месту снимает выделение
    grid.addEventListener('click', (e) => {
      if (e.target === grid) {
        grid.querySelectorAll('.files-item').forEach(i => i.classList.remove('selected'));
      }
    });

    body.appendChild(root);
    go(state.cwd, false);

    return {
      focus: () => grid.focus(),
    };
  }

  /* ---- Заметки: автосохранение в localStorage ---- */
  function mountNotes(body) {
    const saved = Store.get('nebula.notes', { title: '', body: '' });
    const root = document.createElement('div');
    root.className = 'app-notes';
    root.innerHTML = `
      <div class="notes-bar">
        <input type="text" class="notes-title" placeholder="Заголовок заметки…" maxlength="80" />
        <span class="notes-status">—</span>
        <button class="notes-clear" type="button">Очистить</button>
      </div>
      <textarea class="notes-body" placeholder="Начните писать… текст сохраняется автоматически"></textarea>`;

    const title = root.querySelector('.notes-title');
    const text = root.querySelector('.notes-body');
    const status = root.querySelector('.notes-status');
    const clear = root.querySelector('.notes-clear');

    title.value = saved.title;
    text.value = saved.body;
    status.textContent = 'Готово';

    // Дебаунс автосохранения + индикатор «Сохранено HH:MM:SS»
    let timer = null;
    const save = () => {
      clearTimeout(timer);
      status.textContent = 'Сохранение…';
      timer = setTimeout(() => {
        Store.set('nebula.notes', { title: title.value, body: text.value });
        status.textContent = `Сохранено ${new Date().toLocaleTimeString('ru-RU')}`;
      }, 300);
    };
    title.addEventListener('input', save);
    text.addEventListener('input', save);

    clear.addEventListener('click', () => {
      title.value = '';
      text.value = '';
      Store.set('nebula.notes', { title: '', body: '' });
      status.textContent = 'Очищено';
      text.focus();
    });

    body.appendChild(root);
    return { focus: () => text.focus() };
  }

  /* ---- Терминал: CLI с командами ---- */
  function mountTerminal(body) {
    const root = document.createElement('div');
    root.className = 'app-term';
    root.innerHTML = `
      <div class="term-out"></div>
      <div class="term-line">
        <span class="term-prompt">guest@nebula:~$</span>
        <input class="term-input" spellcheck="false" autocomplete="off" aria-label="Ввод команды" />
      </div>`;

    const out = root.querySelector('.term-out');
    const input = root.querySelector('.term-input');

    // История команд (стрелки ↑/↓)
    const history = [];
    let histIdx = -1;

    // Печать строки. html=true позволяет подсветку (только свой контент).
    function print(text, cls = '') {
      const div = document.createElement('div');
      if (cls) div.className = cls;
      div.innerHTML = text;         // контент генерируется только самим терминалом
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    }

    function printBanner() {
      print('<span class="t-acc">NEBULA OS</span> — терминал <span class="t-dim">v1.0.0 · ядро 4.20.6-zen</span>');
      print('<span class="t-dim">Введите <span class="t-acc">help</span> для списка команд.</span>');
      print('');
    }

    // ── Команды ──
    const CMDS = {
      help() {
        const rows = [
          ['help', 'список команд'],
          ['clear', 'очистить экран'],
          ['date', 'текущие дата и время'],
          ['echo &lt;текст&gt;', 'вывести текст'],
          ['theme [dark|neon|cyberpunk]', 'сменить тему'],
          ['matrix', 'вкл/выкл дождь из кода'],
          ['ls [путь]', 'приложения или файлы в каталоге'],
          ['cat &lt;файл&gt;', 'показать содержимое файла'],
          ['mkdir &lt;путь&gt;', 'создать папку'],
          ['touch &lt;путь&gt;', 'создать пустой файл'],
          ['rm &lt;путь&gt;', 'удалить файл или папку'],
          ['open &lt;приложение&gt;', 'открыть приложение'],
          ['whoami', 'кто я?'],
          ['neofetch', 'информация о системе'],
          ['about', 'о системе'],
        ];
        print('<span class="t-ac2">Доступные команды:</span>');
        rows.forEach(([cmd, desc]) => {
          const cleanLen = cmd.replace(/<[^>]+>/g, '').replace(/&lt;|&gt;|&amp;|&quot;/g, '').length;
          const pad = ' '.repeat(Math.max(1, 22 - cleanLen));
          print(`  <span class="t-acc">${cmd}</span>${pad}<span class="t-dim">${desc}</span>`);
        });
      },

      clear() { out.innerHTML = ''; },

      date() {
        const now = new Date();
        const human = now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        print(human + ', ' + now.toLocaleTimeString('ru-RU'));
      },

      echo(args) { print(escapeHtml(args.join(' ')) || ''); },

      theme(args) {
        if (args.length === 0) {
          print(`Текущая тема: <span class="t-acc">${Settings.theme}</span> (dark, neon, cyberpunk)`);
          return;
        }
        if (Settings.applyTheme(args[0])) {
          print(`<span class="t-ok">✓</span> Тема «${THEMES[args[0]].name}» применена.`);
          notifySystem({ icon: '🎨', title: 'Тема оформления', text: `Применена тема «${THEMES[args[0]].name}».`, app: 'settings' });
        } else {
          print(`<span class="t-err">✗</span> Неизвестная тема «${args[0]}». Доступны: dark, neon, cyberpunk.`);
        }
      },

      matrix() {
        if (Matrix.active) {
          Matrix.stop();
          print('<span class="t-dim">Матрица выключена.</span>');
          notifySystem({ icon: '💚', title: 'Матрица', text: 'Дождь из кода остановлен.' });
        } else {
          Matrix.start();
          print('<span class="t-neon">Добро пожаловать в Матрицу. Нажмите «matrix» или Esc, чтобы выйти.</span>');
          notifySystem({ icon: '💚', title: 'Добро пожаловать в Матрицу', text: 'Нажмите Esc или выполните «matrix», чтобы выйти.' });
        }
      },

      ls(args) {
        if (args.length) {
          const items = VFS.readDir(args[0]);
          if (!items) {
            print(`<span class="t-err">✗</span> Каталог не найден: ${escapeHtml(args[0])}`);
            return;
          }
          print(`<span class="t-ac2">${escapeHtml(VFS.norm(args[0]))}/</span> <span class="t-dim">— ${items.length} элемент(ов)</span>`);
          items.forEach(i => {
            const meta = i.type === 'file' ? ` <span class="t-dim">${VFS.humanSize(i.size)}</span>` : '';
            print(`  ${i.type === 'dir' ? '📁' : '📄'} <span class="t-acc">${escapeHtml(i.name)}</span>${meta}`);
          });
          return;
        }
        print('<span class="t-ac2">Установленные приложения:</span>');
        Object.values(Apps.list).forEach(a => {
          print(`  ${a.icon}  <span class="t-acc">${a.name}</span> <span class="t-dim">(${a.id})</span>`);
        });
      },

      open(args) {
        if (args.length === 0) { print('<span class="t-err">✗</span> Укажите приложение: notes, files, terminal, calculator, settings, music, calendar'); return; }
        const key = args[0].toLowerCase();
        const app = Apps.list[key];
        if (app) { WM.open(key); print(`<span class="t-ok">✓</span> Открываю «${app.name}»…`); }
        else print(`<span class="t-err">✗</span> Приложение «${key}» не найдено. Наберите <span class="t-acc">ls</span>.`);
      },

      cat(args) {
        if (!args.length) { print('<span class="t-err">✗</span> Укажите файл: <span class="t-acc">cat &lt;путь&gt;</span>'); return; }
        if (VFS.isDir(args[0])) { print(`<span class="t-err">✗</span> «${escapeHtml(args[0])}» — это папка, а не файл.`); return; }
        const content = VFS.readFile(args[0]);
        if (content === null) { print(`<span class="t-err">✗</span> Файл не найден: ${escapeHtml(args[0])}`); return; }
        content.split('\n').forEach(l => print(escapeHtml(l)));
      },

      mkdir(args) {
        if (!args.length) { print('<span class="t-err">✗</span> Укажите путь: <span class="t-acc">mkdir &lt;путь&gt;</span>'); return; }
        const err = VFS.mkdir(args[0]);
        if (err) print(`<span class="t-err">✗</span> ${err}: ${escapeHtml(args[0])}`);
        else print(`<span class="t-ok">✓</span> Папка создана: ${escapeHtml(VFS.norm(args[0]))}`);
      },

      touch(args) {
        if (!args.length) { print('<span class="t-err">✗</span> Укажите путь: <span class="t-acc">touch &lt;путь&gt;</span>'); return; }
        const err = VFS.writeFile(args[0], '');
        if (err) print(`<span class="t-err">✗</span> ${err}`);
        else print(`<span class="t-ok">✓</span> Файл создан: ${escapeHtml(VFS.norm(args[0]))}`);
      },

      rm(args) {
        if (!args.length) { print('<span class="t-err">✗</span> Укажите путь: <span class="t-acc">rm &lt;путь&gt;</span>'); return; }
        const err = VFS.remove(args[0]);
        if (err) print(`<span class="t-err">✗</span> ${err}`);
        else print(`<span class="t-ok">✓</span> Удалено: ${escapeHtml(VFS.norm(args[0]))}`);
      },

      whoami() { print('<span class="t-acc">guest</span> — гость Nebula OS. Здесь нет паролей. <span class="t-dim">¯\\_(ツ)_/¯</span>'); },

      about() {
        print('<span class="t-ac2">Nebula OS</span> — операционная система в браузере.');
        print('<span class="t-dim">Собрана на чистом HTML, CSS и JavaScript. Без единой внешней библиотеки.</span>');
      },

      neofetch() {
        const logo = [
          '        ▄▄▄▄▄▄▄▄▄        ',
          '     ▄█████████████▄      ',
          '   ▄█████████████████▄    ',
          '  █████████████████████   ',
          ' ███████████████████████  ',
          ' ███████████████████████  ',
          '  █████████████████████   ',
          '   ▀█████████████████▀    ',
          '     ▀█████████████▀      ',
          '        ▀▀▀▀▀▀▀▀▀        ',
        ];
        const info = [
          '<span class="t-acc">guest@nebula</span>',
          '─────────────',
          `ОС: Nebula OS 1.0.0`,
          `Тема: ${Settings.theme}`,
          `Обои: ${Settings.wallpaper}`,
          `Окна открыто: ${WM.count()}`,
          'Shell: nebula-sh 1.0',
          'ЦПУ: ваш мозг @ 100%',
        ];
        logo.forEach((line, i) => print(`${line}  ${info[i] || ''}`));
      },
    };

    // ── Обработка ввода ──
    function run(raw) {
      const text = raw.trim();
      print(`<span class="term-prompt">guest@nebula:~$</span> <span class="t-dim">${escapeHtml(raw)}</span>`);
      if (!text) return;

      const [cmd, ...args] = text.split(/\s+/);
      const fn = CMDS[cmd.toLowerCase()];
      if (fn) fn(args);
      else print(`<span class="t-err">Команда не найдена:</span> ${cmd}. Наберите <span class="t-acc">help</span>.`);
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const v = input.value;
        history.push(v);
        histIdx = history.length;
        run(v);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx] || ''; }
        else { histIdx = history.length; input.value = ''; }
      }
    });

    printBanner();
    body.appendChild(root);

    return {
      focus: () => input.focus(),
      destroy: () => { if (Matrix.active) Matrix.stop(); },
    };
  }

  /* ---- Калькулятор: базовые операции + клавиатура ---- */
  function mountCalculator(body) {
    const root = document.createElement('div');
    root.className = 'app-calc';
    root.innerHTML = `
      <div class="calc-screen">
        <div class="calc-expr"></div>
        <div class="calc-current">0</div>
      </div>
      <div class="calc-grid">
        <button class="calc-btn danger" data-k="C">C</button>
        <button class="calc-btn danger" data-k="back">⌫</button>
        <button class="calc-btn op" data-k="%">%</button>
        <button class="calc-btn op" data-k="÷">÷</button>

        <button class="calc-btn" data-k="7">7</button>
        <button class="calc-btn" data-k="8">8</button>
        <button class="calc-btn" data-k="9">9</button>
        <button class="calc-btn op" data-k="×">×</button>

        <button class="calc-btn" data-k="4">4</button>
        <button class="calc-btn" data-k="5">5</button>
        <button class="calc-btn" data-k="6">6</button>
        <button class="calc-btn op" data-k="−">−</button>

        <button class="calc-btn" data-k="1">1</button>
        <button class="calc-btn" data-k="2">2</button>
        <button class="calc-btn" data-k="3">3</button>
        <button class="calc-btn op" data-k="+">+</button>

        <button class="calc-btn fn" data-k="sign">±</button>
        <button class="calc-btn" data-k="0">0</button>
        <button class="calc-btn" data-k=".">.</button>
        <button class="calc-btn eq" data-k="=">=</button>
      </div>`;

    const current = root.querySelector('.calc-current');
    const exprEl = root.querySelector('.calc-expr');

    // Состояние: классический одношаговый калькулятор
    const state = { acc: null, op: null, entry: '0', fresh: true };

    const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };

    function fmt(n) {
      if (!isFinite(n)) return 'Ошибка';
      const r = Math.round(n * 1e10) / 1e10;
      return String(r).length > 13 ? r.toExponential(6) : String(r);
    }
    function render() {
      current.textContent = fmt(parseFloat(state.entry));
      exprEl.textContent = state.acc !== null && state.op ? `${fmt(state.acc)} ${state.op}` : '';
    }

    function digit(d) {
      if (state.fresh) { state.entry = d === '.' ? '0.' : d; state.fresh = false; }
      else if (d === '.') { if (!state.entry.includes('.')) state.entry += '.'; }
      else if (state.entry.replace('-', '').length < 13) {
        state.entry = state.entry === '0' ? d : state.entry + d;
      }
      render();
    }

    function operator(op) {
      const val = parseFloat(state.entry);
      if (state.op && !state.fresh) {
        state.acc = compute(state.acc, val, state.op);
        state.entry = String(state.acc);
      } else {
        state.acc = val;
      }
      state.op = op;
      state.fresh = true;
      render();
    }

    function compute(a, b, op) {
      if (op === '÷' && b === 0) return NaN;
      return OPS[op](a, b);
    }

    function equals() {
      if (!state.op) return;
      const val = parseFloat(state.entry);
      const res = compute(state.acc, val, state.op);
      state.acc = null; state.op = null;
      state.entry = isNaN(res) ? 'Ошибка' : fmt(res);
      state.fresh = true;
      render();
    }

    function percent() {
      const val = parseFloat(state.entry);
      // Процент относительно накопленного значения (если есть оператор)
      const res = (state.op && state.acc !== null) ? (state.acc * val / 100) : (val / 100);
      state.entry = fmt(res);
      state.fresh = true;
      render();
    }

    function back() {
      if (state.fresh || state.entry === 'Ошибка') return;
      state.entry = state.entry.length > 1 ? state.entry.slice(0, -1) : '0';
      render();
    }

    function sign() {
      if (state.entry !== '0' && state.entry !== 'Ошибка') {
        state.entry = state.entry.startsWith('-') ? state.entry.slice(1) : '-' + state.entry;
      }
      render();
    }

    function clear() { state.acc = null; state.op = null; state.entry = '0'; state.fresh = true; render(); }

    // Клики по кнопкам
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-btn');
      if (!btn) return;
      const k = btn.dataset.k;
      if (/^[\d.]$/.test(k)) digit(k);
      else if (k === 'C') clear();
      else if (k === 'back') back();
      else if (k === 'sign') sign();
      else if (k === '%') percent();
      else if (k === '=') equals();
      else operator(k);
    });

    // Поддержка клавиатуры: работает, пока окно калькулятора активно
    const onKey = (e) => {
      if (WM.active?.dataset.app !== 'calculator') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (/^[\d.]$/.test(k)) { digit(k); e.preventDefault(); }
      else if (k === 'Enter' || k === '=') { equals(); e.preventDefault(); }
      else if (k === 'Backspace') { back(); e.preventDefault(); }
      else if (k === 'Escape') { clear(); e.preventDefault(); }
      else if (k === '+' || k === '-' || k === '*' || k === '/') {
        operator({ '+': '+', '-': '−', '*': '×', '/': '÷' }[k]); e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);

    body.appendChild(root);
    return {
      focus: () => root.focus(),
      destroy: () => document.removeEventListener('keydown', onKey),
    };
  };

  /* ---- Настройки: темы и обои ---- */
  function mountSettings(body) {
    const root = document.createElement('div');
    root.className = 'app-settings';

    // Строим карточки тем и обоев
    const themeCards = Object.entries(THEMES).map(([id, t]) => `
      <button class="opt-card" data-theme-id="${id}">
        <div class="opt-preview" style="background:linear-gradient(135deg,${t.preview.join(',')})"></div>
        <span class="opt-name">${t.name}</span>
        <span class="opt-desc">${t.desc}</span>
      </button>`).join('');

    const wallCards = WALLPAPERS.map(w => `
      <button class="opt-card" data-wall-id="${w.id}">
        <div class="opt-preview" style="background:${w.preview}"></div>
        <span class="opt-name">${w.name}</span>
        <span class="opt-desc">${w.desc}</span>
      </button>`).join('');

    root.innerHTML = `
      <section class="settings-sec">
        <h3>Тема оформления</h3>
        <div class="opt-grid">${themeCards}</div>
      </section>
      <section class="settings-sec">
        <h3>Обои рабочего стола</h3>
        <div class="opt-grid">${wallCards}</div>
      </section>
      <button class="settings-reset" type="button">Сбросить все настройки</button>`;

    const mark = (sel, key, activeId) => {
      root.querySelectorAll(sel).forEach(card => {
        card.classList.toggle('is-selected', card.dataset[key] === activeId);
      });
    };

    root.addEventListener('click', (e) => {
      const th = e.target.closest('[data-theme-id]');
      const wl = e.target.closest('[data-wall-id]');
      if (th) {
        Settings.applyTheme(th.dataset.themeId);
        mark('[data-theme-id]', 'themeId', Settings.theme);
        notifySystem({ icon: '🎨', title: 'Тема оформления', text: `Применена тема «${THEMES[Settings.theme].name}».`, app: 'settings' });
      }
      if (wl) {
        Settings.applyWallpaper(wl.dataset.wallId);
        mark('[data-wall-id]', 'wallId', Settings.wallpaper);
        notifySystem({ icon: '🖼️', title: 'Обои рабочего стола', text: `Установлены обои «${WALLPAPERS.find(w => w.id === Settings.wallpaper).name}».`, app: 'settings' });
      }
      if (e.target.closest('.settings-reset')) {
        Settings.reset();
        mark('[data-theme-id]', 'themeId', Settings.theme);
        mark('[data-wall-id]', 'wallId', Settings.wallpaper);
        notifySystem({ icon: '🔁', title: 'Настройки сброшены', text: 'Тема «Ночь» и обои «Аврора» восстановлены.' });
      }
    });

    mark('[data-theme-id]', 'themeId', Settings.theme);
    mark('[data-wall-id]', 'wallId', Settings.wallpaper);
    body.appendChild(root);
  }

  /* ---- О системе (скрыто из дока) ---- */
  function mountAbout(body) {
    const root = document.createElement('div');
    root.className = 'app-about';
    root.innerHTML = `
      <div class="about-logo">◐</div>
      <div class="about-title">NEBULA<span>OS</span></div>
      <div class="about-ver">Версия 1.0.0 · сборка 2026.08</div>
      <div class="about-desc">
        Операционная система в браузере на чистом HTML, CSS и JavaScript —
        без единой внешней библиотеки. Окна, док, терминал и целая вселенная.
      </div>`;
    body.appendChild(root);
  }

  /* ---- Музыка: процедурный lo-fi генератор на Web Audio ---- */
  // Ни одного аудиофайла: мелодия синтезируется в реальном времени
  // (бас + пэд-аккорд + пентатоническая мелодия) и играет бесконечно.
  function mountMusic(body) {
    const PLAYLIST = [
      { name: 'Неоновая волна',    artist: 'Nebula FM', bpm: 96,  root: 220.00, mood: 'cyber' },
      { name: 'Ночной трафик',     artist: 'Nebula FM', bpm: 84,  root: 174.61, mood: 'midnight' },
      { name: 'Звёздный дрейф',    artist: 'Nebula FM', bpm: 72,  root: 196.00, mood: 'space' },
      { name: 'Утренний терминал', artist: 'Nebula FM', bpm: 108, root: 261.63, mood: 'morning' },
    ];

    const root = document.createElement('div');
    root.className = 'app-music';
    root.innerHTML = `
      <div class="music-head">
        <div class="music-title">Nebula FM</div>
        <div class="music-artist" id="m-artist">генеративная музыка · Web Audio API</div>
      </div>
      <div class="music-now">
        <span class="mn-ico">🎧</span>
        <div>
          <div class="mn-name" id="m-name">Выберите трек</div>
          <div class="mn-status" id="m-status">аудио-движок в режиме ожидания</div>
        </div>
      </div>
      <div class="music-viz" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="music-progress">
        <span id="m-cur">0:00</span>
        <div class="mp-bar"><i id="m-bar"></i></div>
        <span id="m-dur">0:00</span>
      </div>
      <div class="music-controls">
        <button class="mc-btn" id="m-prev" title="Предыдущий" aria-label="Предыдущий трек">⏮</button>
        <button class="mc-btn play" id="m-play" title="Играть" aria-label="Играть/пауза">▶</button>
        <button class="mc-btn" id="m-next" title="Следующий" aria-label="Следующий трек">⏭</button>
      </div>
      <div class="music-list" id="m-list"></div>`;

    const nameEl = root.querySelector('#m-name');
    const statusEl = root.querySelector('#m-status');
    const curEl = root.querySelector('#m-cur');
    const durEl = root.querySelector('#m-dur');
    const barEl = root.querySelector('#m-bar');
    const playBtn = root.querySelector('#m-play');
    const listEl = root.querySelector('#m-list');

    let idx = 0;
    const state = { playing: false, step: 0, total: 64, spb: 0.25 };

    // ── Генеративный движок: планировщик нот с lookahead ──
    const engine = {
      timer: 0,

      start(track) {
        if (!AudioSys.ensure()) return false; // нет аудио (jsdom / старый браузер)
        this.track = track;
        state.step = 0;
        state.spb = 60 / track.bpm / 4; // длительность 1/16 в секундах
        this.nextTime = AudioSys.ctx.currentTime + 0.08;
        state.playing = true;
        this.timer = setInterval(() => this.schedule(), 120);
        this.schedule();
        return true;
      },

      stop() {
        state.playing = false;
        clearInterval(this.timer);
        this.timer = 0;
      },

      schedule() {
        const ctx = AudioSys.ctx;
        while (this.nextTime < ctx.currentTime + 0.4) {
          this.playStep(state.step, this.nextTime);
          state.step = (state.step + 1) % state.total;
          this.nextTime += state.spb;
        }
      },

      note(freq, t, dur, type, vol, cutoff) {
        const ctx = AudioSys.ctx;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = cutoff;
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(lp); lp.connect(g); g.connect(AudioSys.master);
        osc.start(t); osc.stop(t + dur + 0.05);
      },

      playStep(step, t) {
        const tr = this.track;
        const bar = Math.floor(step / 16);
        const inBar = step % 16;
        // Бас на каждой четверти
        if (inBar % 4 === 0) this.note(tr.root / 2, t, state.spb * 3.2, 'triangle', .5, 420);
        // Пэд-аккорд в начале такта
        if (inBar === 0) [1, 1.26, 1.5].forEach((m, i) =>
          this.note(tr.root * m, t + i * 0.04, state.spb * 11, 'sine', .11, 900));
        // Мелодия из пентатоники
        if (inBar % 2 === 0 && Math.random() < 0.42) {
          const degrees = [1, 1.12, 1.26, 1.335, 1.5];
          this.note(tr.root * degrees[Math.floor(Math.random() * degrees.length)] * 2,
            t, state.spb * 1.6, 'square', .055, 1600);
        }
      },
    };

    function fmtTime(s) {
      return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    }

    // ── Плейлист ──
    function renderList() {
      listEl.innerHTML = PLAYLIST.map((t, i) => `
        <button class="m-track${i === idx ? ' active' : ''}" data-i="${i}">
          <span class="mt-ico">${i === idx && state.playing ? '🔊' : '🎵'}</span>
          <span class="mt-name">${escapeHtml(t.name)}</span>
          <span class="mt-artist">${escapeHtml(t.artist)}</span>
        </button>`).join('');
      nameEl.textContent = PLAYLIST[idx].name;
    }
    renderList();

    function setPlayIcon() {
      playBtn.textContent = state.playing ? '⏸' : '▶';
      playBtn.title = state.playing ? 'Пауза' : 'Играть';
    }

    function loadTrack(i) {
      idx = (i + PLAYLIST.length) % PLAYLIST.length;
      renderList();
      if (state.playing) {
        engine.stop();
        const ok = engine.start(PLAYLIST[idx]);
        if (!ok) {
          setPlayIcon();
          root.classList.remove('playing');
          statusEl.textContent = 'Аудио недоступно в этом браузере';
        }
      }
    }

    // Прогресс и время (обновляем каждые 200мс, пока играет)
    const progTimer = setInterval(() => {
      if (!state.playing) return;
      barEl.style.width = (state.step / state.total * 100) + '%';
      curEl.textContent = fmtTime(state.step * state.spb);
      durEl.textContent = fmtTime(state.total * state.spb);
    }, 200);

    playBtn.addEventListener('click', () => {
      AudioSys.click();
      if (state.playing) {
        engine.stop();
        setPlayIcon();
        root.classList.remove('playing');
        statusEl.textContent = 'пауза';
      } else {
        const ok = engine.start(PLAYLIST[idx]);
        if (ok) {
          setPlayIcon();
          root.classList.add('playing');
          statusEl.textContent = 'играет · синтез в реальном времени';
        } else {
          statusEl.textContent = 'Аудио недоступно в этом браузере';
        }
      }
    });

    root.querySelector('#m-prev').addEventListener('click', () => loadTrack(idx - 1));
    root.querySelector('#m-next').addEventListener('click', () => loadTrack(idx + 1));
    listEl.addEventListener('click', (e) => {
      const tr = e.target.closest('.m-track');
      if (tr) { AudioSys.click(); loadTrack(+tr.dataset.i); }
    });

    body.appendChild(root);
    return { destroy: () => { engine.stop(); clearInterval(progTimer); } };
  }

  /* ---- Календарь: месяц + события в localStorage ---- */
  function mountCalendar(body) {
    const KEY = 'nebula.events';
    const events = Store.get(KEY, []); // [{ id, date: 'YYYY-MM-DD', time, title }]
    const saveEvents = () => Store.set(KEY, events);

    const root = document.createElement('div');
    root.className = 'app-cal';
    root.innerHTML = `
      <div class="cal-toolbar">
        <button class="fbtn" data-nav="-1" title="Предыдущий месяц" aria-label="Предыдущий месяц">◀</button>
        <div class="cal-title"></div>
        <button class="fbtn" data-nav="1" title="Следующий месяц" aria-label="Следующий месяц">▶</button>
        <button class="fbtn cal-today" data-today="1" title="Сегодня">Сегодня</button>
      </div>
      <div class="cal-body">
        <div class="cal-grid">
          ${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
          <div class="cal-cells"></div>
        </div>
        <aside class="cal-side">
          <div class="cal-day-name" id="cal-day-name">—</div>
          <div class="cal-day-events" id="cal-day-events"></div>
          <form class="cal-add" id="cal-form">
            <input class="cal-new-title" id="cal-new-title" placeholder="Название события…" maxlength="60" />
            <input class="cal-new-time" id="cal-new-time" type="time" aria-label="Время" />
            <button class="fbtn cal-add-btn" type="submit" aria-label="Добавить">＋</button>
          </form>
        </aside>
      </div>`;

    const titleEl = root.querySelector('.cal-title');
    const cellsEl = root.querySelector('.cal-cells');
    const dayNameEl = root.querySelector('#cal-day-name');
    const dayEventsEl = root.querySelector('#cal-day-events');
    const form = root.querySelector('#cal-form');
    const newTitle = root.querySelector('#cal-new-title');
    const newTime = root.querySelector('#cal-new-time');

    const now = new Date();
    const view = { y: now.getFullYear(), m: now.getMonth() };
    let selected = iso(now);

    const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const WEEKDAYS = ['вс','пн','вт','ср','чт','пт','сб'];

    function iso(d) {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    function eventsFor(date) {
      return events.filter(e => e.date === date)
                   .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }

    function render() {
      titleEl.textContent = `${MONTHS[view.m]} ${view.y}`;
      const first = new Date(view.y, view.m, 1);
      const offset = (first.getDay() + 6) % 7; // неделя начинается с понедельника
      const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
      const today = iso(now);

      let html = '';
      for (let i = 0; i < offset; i++) html += '<div class="cal-cell empty"></div>';
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${view.y}-${pad2(view.m + 1)}-${pad2(d)}`;
        const dayEvents = eventsFor(date);
        html += `
          <button class="cal-cell${date === today ? ' today' : ''}${date === selected ? ' selected' : ''}${dayEvents.length ? ' has-events' : ''}" data-date="${date}">
            <span class="cc-num">${d}</span>
            ${dayEvents.length ? `<span class="cc-dots">${dayEvents.slice(0, 3).map(() => '<i></i>').join('')}</span>` : ''}
          </button>`;
      }
      cellsEl.innerHTML = html;
      renderSide();
    }

    function renderSide() {
      const d = new Date(selected + 'T12:00:00');
      dayNameEl.textContent = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`;
      const list = eventsFor(selected);
      if (!list.length) {
        dayEventsEl.innerHTML = '<div class="cal-empty">Нет событий на этот день</div>';
        return;
      }
      dayEventsEl.innerHTML = list.map(e => `
        <div class="cal-event">
          <span class="ce-time">${e.time ? escapeHtml(e.time) : '—'}</span>
          <span class="ce-title">${escapeHtml(e.title)}</span>
          <button class="ce-del" data-id="${e.id}" title="Удалить" aria-label="Удалить">✕</button>
        </div>`).join('');
    }

    cellsEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell[data-date]');
      if (!cell) return;
      selected = cell.dataset.date;
      render();
    });

    root.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioSys.click();
        view.m += +btn.dataset.nav;
        if (view.m < 0) { view.m = 11; view.y--; }
        if (view.m > 11) { view.m = 0; view.y++; }
        render();
      });
    });

    root.querySelector('[data-today]').addEventListener('click', () => {
      view.y = now.getFullYear(); view.m = now.getMonth();
      selected = iso(now);
      render();
    });

    dayEventsEl.addEventListener('click', (e) => {
      const del = e.target.closest('.ce-del');
      if (!del) return;
      const i = events.findIndex(x => x.id === del.dataset.id);
      if (i !== -1) { events.splice(i, 1); saveEvents(); render(); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = newTitle.value.trim();
      if (!t) return;
      events.push({
        id: 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        date: selected,
        time: newTime.value || '',
        title: t,
      });
      saveEvents();
      newTitle.value = '';
      render();
    });

    body.appendChild(root);
    render();
    return { focus: () => newTitle.focus() };
  }

  /* ---- Браузер: вкладки, адресная строка, закладки, история ---- */
  // Внутренние страницы: nebula://home (стартовая), nebula://bookmarks,
  // nebula://history. Внешние http(s) открываются во встроенном iframe;
  // если сайт запрещает встраивание — предлагаем открыть в новой вкладке.
  function mountBrowser(body) {
    const BK_KEY = 'nebula.browserBookmarks';
    const HIST_KEY = 'nebula.browserHistory';
    const MAX_HIST = 100;
    const HOME = 'nebula://home';

    const root = document.createElement('div');
    root.className = 'app-browser';
    root.innerHTML = `
      <div class="br-tabs"></div>
      <div class="br-toolbar">
        <button class="fbtn br-btn" data-nav="back" title="Назад" aria-label="Назад">◀</button>
        <button class="fbtn br-btn" data-nav="fwd" title="Вперёд" aria-label="Вперёд">▶</button>
        <button class="fbtn br-btn" data-nav="reload" title="Обновить" aria-label="Обновить">⟳</button>
        <button class="fbtn br-btn" data-nav="home" title="Домой" aria-label="Домой">⌂</button>
        <form class="br-addr-form" id="br-addr-form">
          <input class="br-addr" id="br-addr" placeholder="Введите адрес или запрос…" spellcheck="false" autocomplete="off" aria-label="Адрес" />
        </form>
        <button class="fbtn br-btn br-star" id="br-star" title="Добавить в закладки" aria-label="Добавить в закладки">☆</button>
        <button class="fbtn br-btn br-dark" id="br-dark" title="Тёмная тема страницы" aria-label="Тёмная тема страницы">☾</button>
        <button class="fbtn br-btn" data-page="bookmarks" title="Закладки" aria-label="Закладки">★</button>
        <button class="fbtn br-btn" data-page="history" title="История" aria-label="История">🕘</button>
      </div>
      <div class="br-content"></div>
      <div class="br-status"><span id="br-status-url"></span><span id="br-status-sec"></span></div>`;

    const tabsEl = root.querySelector('.br-tabs');
    const contentEl = root.querySelector('.br-content');
    const addrEl = root.querySelector('#br-addr');
    const addrForm = root.querySelector('#br-addr-form');
    const starBtn = root.querySelector('#br-star');
    const statusUrl = root.querySelector('#br-status-url');
    const statusSec = root.querySelector('#br-status-sec');

    const bookmarks = Store.get(BK_KEY, []); // [{ url, title, time }]
    const history = Store.get(HIST_KEY, []); // [{ url, title, time }]
    const saveB = () => Store.set(BK_KEY, bookmarks);
    const saveH = () => Store.set(HIST_KEY, history);

    // Избранные приложения (id) — для лаунчера и стартовой страницы
    const favApps = Store.get('nebula.browserFavApps', []);
    const saveFavs = () => Store.set('nebula.browserFavApps', favApps);
    const isFav = (id) => favApps.includes(id);
    const toggleFav = (id) => {
      const i = favApps.indexOf(id);
      if (i !== -1) favApps.splice(i, 1);
      else favApps.push(id);
      saveFavs();
    };

    // Тёмная тема для внешних страниц (инверсия цветов в iframe).
    // Настройка общая для всех вкладок браузера (не per-tab).
    let darkMode = Store.get('nebula.browserDark', false);
    const darkBtn = root.querySelector('#br-dark');
    const updateDarkBtn = () => {
      darkBtn.textContent = darkMode ? '☀' : '☾';
      darkBtn.classList.toggle('on', darkMode);
      darkBtn.title = darkMode ? 'Светлая тема страницы' : 'Тёмная тема страницы';
    };
    const toggleDark = () => {
      darkMode = !darkMode;
      Store.set('nebula.browserDark', darkMode);
      updateDarkBtn();
      // Меняем класс на уже открытом iframe — без перезагрузки страницы
      const frame = contentEl.querySelector('.br-frame');
      if (frame) frame.classList.toggle('dark', darkMode);
      else render();
    };

    const tabs = [];   // [{ id, url, title, hist: [url], hi }]
    let activeId = null;
    let tabSeq = 0;
    let aboutTimer = 0; // обновление живой статистики на странице «О системе»

    const TITLES = {
      [HOME]: 'Новая вкладка',
      'nebula://apps': 'Приложения',
      'nebula://bookmarks': 'Закладки',
      'nebula://history': 'История',
      'nebula://vfs': 'Файлы',
      'nebula://about': 'О системе',
    };

    function pageTitle(url) {
      if (TITLES[url]) return TITLES[url];
      // nebula://vfs/путь → имя последнего сегмента
      if (url.startsWith('nebula://vfs/')) return url.split('/').pop() || 'Файлы';
      try { return new URL(url).hostname; } catch { return url; }
    }

    // Иконка вкладки: буква домена или ◐ для внутренних страниц
    function favicon(url) {
      if (url.startsWith('nebula://vfs')) return '📁';
      if (url.startsWith('nebula://')) return '◐';
      try { return (new URL(url).hostname[0] || '?').toUpperCase(); }
      catch { return '🌐'; }
    }

    // nebula://vfs/путь ⇄ /путь
    function vfsPathFromUrl(url) {
      return VFS.norm(url.slice('nebula://vfs'.length) || '/');
    }
    function vfsUrlFromPath(path) {
      const norm = VFS.norm(path);
      return 'nebula://vfs' + (norm === '/' ? '' : norm);
    }
    const vfsIcon = fileIcon;
    // Скачать файл из VFS как вложение
    function downloadVfsFile(path) {
      const content = VFS.readFile(path);
      if (content === null) return;
      const name = path.split('/').pop() || 'file.txt';
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    // Нормализация ввода: URL или поисковый запрос
    function normalize(raw) {
      let s = String(raw || '').trim();
      if (!s) return HOME;
      if (s.startsWith('nebula://')) return s;
      if (/^https?:\/\//i.test(s)) return s;
      // Похоже на домен: содержит точку и не содержит пробелов
      if (/^[^\s]+\.[a-zа-яё]{2,}(\/.*)?$/i.test(s)) return 'https://' + s;
      // Локальные адреса: localhost или IP:порт
      if (/^localhost(:\d+)?(\/.*)?$/i.test(s) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(s)) return 'http://' + s;
      // Всё остальное — поиск (HTML-версия DuckDuckGo дружелюбна к iframe)
      return 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(s);
    }

    /* ── Вкладки ── */
    function activeTab() { return tabs.find(t => t.id === activeId); }

    function addTab(url = HOME) {
      const id = 't' + (++tabSeq);
      const t = { id, url, title: pageTitle(url), hist: [url], hi: 0 };
      tabs.push(t);
      activeId = id;
      renderTabs();
      render();
      return t;
    }

    function closeTab(id) {
      const i = tabs.findIndex(t => t.id === id);
      if (i === -1) return;
      tabs.splice(i, 1);
      if (!tabs.length) { addTab(); return; }
      if (activeId === id) activeId = tabs[Math.min(i, tabs.length - 1)].id;
      renderTabs();
      render();
    }

    /* ── Навигация ── */
    function navigate(raw) {
      const t = activeTab();
      if (!t) return;
      const url = normalize(raw);
      t.hist = t.hist.slice(0, t.hi + 1);
      t.hist.push(url);
      t.hi = t.hist.length - 1;
      t.url = url;
      t.title = pageTitle(url);
      recordHistory(url, t.title);
      renderTabs();
      render();
    }

    function goBack() {
      const t = activeTab();
      if (t && t.hi > 0) { t.hi--; t.url = t.hist[t.hi]; t.title = pageTitle(t.url); renderTabs(); render(); }
    }

    function goFwd() {
      const t = activeTab();
      if (t && t.hi < t.hist.length - 1) { t.hi++; t.url = t.hist[t.hi]; t.title = pageTitle(t.url); renderTabs(); render(); }
    }

    function recordHistory(url, title) {
      if (!url || url === HOME) return; // стартовую страницу не пишем
      if (history[0] && history[0].url === url) { history[0].time = Date.now(); saveH(); return; } // без дублей подряд
      history.unshift({ url, title, time: Date.now() });
      if (history.length > MAX_HIST) history.length = MAX_HIST;
      saveH();
    }

    /* ── Закладки ── */
    function isBookmarked(url) { return bookmarks.some(b => b.url === url); }

    function toggleBookmark() {
      const t = activeTab();
      if (!t) return;
      const i = bookmarks.findIndex(b => b.url === t.url);
      if (i !== -1) bookmarks.splice(i, 1);
      else bookmarks.unshift({ url: t.url, title: t.title, time: Date.now() });
      saveB();
      render();
    }

    function removeBookmark(url) {
      const i = bookmarks.findIndex(b => b.url === url);
      if (i !== -1) { bookmarks.splice(i, 1); saveB(); render(); }
    }

    /* ── Отрисовка ── */
    function renderTabs() {
      tabsEl.innerHTML = '';
      tabs.forEach(t => {
        const el = document.createElement('button');
        el.className = 'br-tab' + (t.id === activeId ? ' active' : '');
        el.dataset.tab = t.id;
        el.title = t.title;
        el.innerHTML = `
          <span class="br-fav">${favicon(t.url)}</span>
          <span class="br-tab-title">${escapeHtml(t.title)}</span>
          <span class="br-tab-x" role="button" aria-label="Закрыть вкладку">×</span>`;
        el.addEventListener('click', (e) => {
          if (e.target.closest('.br-tab-x')) { closeTab(t.id); return; }
          AudioSys.click();
          setActive(t.id);
        });
        tabsEl.appendChild(el);
      });
      const plus = document.createElement('button');
      plus.className = 'br-plus';
      plus.title = 'Новая вкладка';
      plus.setAttribute('aria-label', 'Новая вкладка');
      plus.textContent = '＋';
      plus.addEventListener('click', () => { AudioSys.click(); addTab(); });
      tabsEl.appendChild(plus);
    }

    function setActive(id) { activeId = id; renderTabs(); render(); }

    function render() {
      const t = activeTab();
      if (!t) return;
      // Живая статистика «О системе» живёт, пока открыта страница
      if (aboutTimer) { clearInterval(aboutTimer); aboutTimer = 0; }
      addrEl.value = t.url;
      const marked = isBookmarked(t.url);
      starBtn.textContent = marked ? '★' : '☆';
      starBtn.classList.toggle('on', marked);
      starBtn.title = marked ? 'Убрать из закладок' : 'Добавить в закладки';
      statusUrl.textContent = t.url;
      const isWeb = /^https?:/i.test(t.url);
      const isVfs = t.url.startsWith('nebula://vfs');
      statusSec.textContent = isWeb ? '🌐 внешняя страница' : isVfs ? '📁 файловая система' : '◐ внутренняя страница';
      contentEl.innerHTML = '';
      if (t.url === HOME) contentEl.appendChild(buildHome());
      else if (t.url === 'nebula://apps') contentEl.appendChild(buildApps());
      else if (t.url === 'nebula://bookmarks') contentEl.appendChild(buildBookmarks());
      else if (t.url === 'nebula://history') contentEl.appendChild(buildHistory());
      else if (t.url === 'nebula://about') contentEl.appendChild(buildAbout());
      else if (isVfs) contentEl.appendChild(buildVfs(t.url));
      else if (isWeb) contentEl.appendChild(buildFrame(t.url));
      else contentEl.innerHTML = '<div class="br-err">Не удалось открыть страницу</div>';
    }

    // Страница «О системе»: информация об ОС + живая статистика (обновляется каждую секунду)
    function buildAbout() {
      const el = document.createElement('div');
      el.className = 'br-about';
      // ── живая статистика (аналог меню «Пуск») ──
      const ramUsed = () => 2400 + WM.count() * 420 + Math.round(Math.random() * 120);
      const fmtUptime = () => {
        const up = Math.floor((Date.now() - StartMenu.bootTime) / 1000);
        const d = Math.floor(up / 86400), h = Math.floor(up / 3600) % 24,
              m = Math.floor(up / 60) % 60, s = up % 60;
        return (d ? d + 'д ' : '') + pad2(h) + ':' + pad2(m) + ':' + pad2(s);
      };
      const storageKb = () => {
        let bytes = 0;
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            bytes += (k.length + String(localStorage.getItem(k) || '').length) * 2;
          }
        } catch { /* приватный режим и т.п. */ }
        return Math.max(1, Math.round(bytes / 1024));
      };
      const refresh = () => {
        if (!el.isConnected) return;
        const used = ramUsed();
        const pct = Math.min(100, Math.round(used / 8192 * 100));
        el.querySelector('#ab-uptime').textContent = fmtUptime();
        el.querySelector('#ab-wins').textContent = WM.count();
        el.querySelector('#ab-theme').textContent = THEMES[Settings.theme].name;
        el.querySelector('#ab-wall').textContent = WALLPAPERS.find(w => w.id === Settings.wallpaper).name;
        el.querySelector('#ab-ram').textContent = `${used} МБ / 8192 МБ`;
        el.querySelector('#ab-ram-bar').style.width = pct + '%';
        el.querySelector('#ab-store').textContent = storageKb() + ' КБ';
      };
      const specs = [
        ['Движок', 'Чистые HTML · CSS · JavaScript'],
        ['Хранилище', 'localStorage (переживает перезагрузку)'],
        ['Звук', 'Web Audio API — без аудиофайлов'],
        ['Оформление', `${Object.keys(THEMES).length} темы · ${WALLPAPERS.length} обоев`],
        ['Приложения', `${Object.keys(Apps.list).length} (включая служебные)`],
        ['Тесты', '203 проверок в headless-сьюте'],
      ];
      el.innerHTML = `
        <div class="br-about-head">
          <div class="br-about-logo">◐</div>
          <div class="br-about-title">NEBULA<span>OS</span></div>
          <div class="br-about-ver">Версия 1.1 · сборка 2026.08</div>
          <div class="br-about-desc">Операционная система в браузере на чистом HTML, CSS и JavaScript — окна, док, терминал и целая вселенная без единой внешней библиотеки.</div>
        </div>
        <div class="br-about-sec">
          <div class="br-about-sec-title">Живая статистика</div>
          <div class="br-about-stats">
            <div class="br-about-stat"><div class="bas-k">Аптайм</div><div class="bas-v" id="ab-uptime">0с</div></div>
            <div class="br-about-stat"><div class="bas-k">Окна</div><div class="bas-v" id="ab-wins">0</div></div>
            <div class="br-about-stat"><div class="bas-k">Тема</div><div class="bas-v" id="ab-theme">—</div></div>
            <div class="br-about-stat"><div class="bas-k">Обои</div><div class="bas-v" id="ab-wall">—</div></div>
            <div class="br-about-stat br-about-ram">
              <div class="bas-k">Память</div>
              <div class="bas-v" id="ab-ram">0 МБ / 8192 МБ</div>
              <div class="bas-bar"><i id="ab-ram-bar"></i></div>
            </div>
            <div class="br-about-stat"><div class="bas-k">Хранилище</div><div class="bas-v" id="ab-store">—</div></div>
          </div>
        </div>
        <div class="br-about-sec">
          <div class="br-about-sec-title">Характеристики</div>
          <div class="br-about-specs">${specs.map(s =>
            `<div class="bas-spec"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>
        </div>
        <div class="br-about-actions">
          <button class="fbtn" id="ab-app" type="button">🛰️ Приложение «О системе»</button>
          <button class="fbtn" id="ab-settings" type="button">🎨 Открыть настройки</button>
        </div>`;
      el.querySelector('#ab-app').addEventListener('click', () => WM.open('about'));
      el.querySelector('#ab-settings').addEventListener('click', () => WM.open('settings'));
      refresh();
      aboutTimer = setInterval(refresh, 1000);
      return el;
    }

    // Стартовая страница: поиск + быстрые ссылки из закладок + системные страницы
    function buildHome() {
      const el = document.createElement('div');
      el.className = 'br-home';
      const quick = bookmarks.slice(0, 8).map(b => `
        <button class="br-quick" data-go="${escapeHtml(b.url)}">
          <span class="br-q-ico">${favicon(b.url)}</span>
          <span class="br-q-name">${escapeHtml(b.title || b.url)}</span>
        </button>`).join('');
      // Системные страницы — всегда доступны со стартовой
      const sys = [
        { url: 'nebula://vfs', ico: '📁', name: 'Файлы' },
        { url: 'nebula://apps', ico: '🧩', name: 'Приложения' },
        { url: 'nebula://bookmarks', ico: '★', name: 'Закладки' },
        { url: 'nebula://history', ico: '🕘', name: 'История' },
        { url: 'nebula://about', ico: '🛰️', name: 'О системе' },
      ].map(s => `
        <button class="br-quick" data-go="${s.url}">
          <span class="br-q-ico">${s.ico}</span>
          <span class="br-q-name">${s.name}</span>
        </button>`).join('');
      // Избранные приложения (со звёздочкой в лаунчере) — запускаются кликом
      const favTiles = favApps.map(id => Apps.list[id]).filter(Boolean).map(a => `
        <button class="br-quick" data-launch="${a.id}" title="Открыть «${escapeHtml(a.name)}»">
          <span class="br-q-ico">${a.icon}</span>
          <span class="br-q-name">${escapeHtml(a.name)}</span>
        </button>`).join('');
      el.innerHTML = `
        <div class="br-home-logo">◐</div>
        <div class="br-home-title">Nebula <span>Browser</span></div>
        <form class="br-home-search">
          <input class="br-home-input" placeholder="Поиск в интернете или введите адрес…" spellcheck="false" autocomplete="off" aria-label="Поиск" />
          <button class="fbtn" type="submit">Найти</button>
        </form>
        <div class="br-home-sec">
          ${favTiles ? `<div class="br-sec-title">Избранные приложения</div><div class="br-quicks">${favTiles}</div>` : ''}
          <div class="br-sec-title">Система</div>
          <div class="br-quicks">${sys}</div>
          <div class="br-sec-title">Быстрые ссылки</div>
          <div class="br-quicks">${quick || '<div class="br-empty">Закладок пока нет — нажмите ☆ рядом с адресной строкой</div>'}</div>
        </div>`;
      const input = el.querySelector('.br-home-input');
      el.querySelector('.br-home-search').addEventListener('submit', (e) => {
        e.preventDefault();
        navigate(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); navigate(input.value); }
      });
      el.querySelectorAll('.br-quick[data-go]').forEach(q => q.addEventListener('click', () => navigate(q.dataset.go)));
      el.querySelectorAll('.br-quick[data-launch]').forEach(q => q.addEventListener('click', () => WM.open(q.dataset.launch)));
      setTimeout(() => { if (input.isConnected) input.focus(); }, 0);
      return el;
    }

    // Категории приложений (по id) для лаунчера
    const APP_CATS = {
      notes: 'Офис', calendar: 'Офис',
      files: 'Файлы',
      terminal: 'Разработка',
      calculator: 'Утилиты',
      music: 'Медиа', browser: 'Интернет',
      settings: 'Система',
      about: 'Служебные',
    };

    // Страница «Приложения»: лаунчер приложений Nebula OS с поиском и категориями
    function buildApps() {
      const el = document.createElement('div');
      el.className = 'br-apps';
      const apps = Object.values(Apps.list);
      const cats = ['Все', ...new Set(Object.values(APP_CATS))];
      // Категория и поиск переживают уход со страницы (localStorage)
      const savedCat = Store.get('nebula.browserAppsCat', 'Все');
      const state = {
        q: String(Store.get('nebula.browserAppsQ', '') || ''),
        cat: cats.includes(savedCat) ? savedCat : 'Все',
        sel: 0,
      };

      // Roving focus: активная плитка получает tabindex=0 + класс focused,
      // остальные -1. Направления учитывают реальную сетку (число колонок).
      function syncFocus(i) {
        const tiles = [...contentEl.querySelectorAll('.br-app')];
        if (!tiles.length) return;
        state.sel = Math.max(0, Math.min(i, tiles.length - 1));
        tiles.forEach((t, j) => {
          t.tabIndex = j === state.sel ? 0 : -1;
          t.classList.toggle('focused', j === state.sel);
        });
      }

      function focusTile(i) {
        syncFocus(i);
        const tiles = [...contentEl.querySelectorAll('.br-app')];
        if (!tiles.length) return;
        tiles[state.sel].focus({ preventScroll: true });
        if (tiles[state.sel].scrollIntoView) tiles[state.sel].scrollIntoView({ block: 'nearest' });
      }

      function moveFocus(dir) {
        const tiles = [...contentEl.querySelectorAll('.br-app')];
        if (!tiles.length) return;
        let i = state.sel;
        if (i >= tiles.length) i = 0;
        // Число колонок сетки: уникальные offsetLeft видимых плиток
        const cols = new Set(tiles.map(t => t.offsetLeft)).size || 1;
        if (dir === 'ArrowRight') i = Math.min(i + 1, tiles.length - 1);
        else if (dir === 'ArrowLeft') i = Math.max(i - 1, 0);
        else if (dir === 'ArrowDown') i = Math.min(i + cols, tiles.length - 1);
        else if (dir === 'ArrowUp') i = Math.max(i - cols, 0);
        else if (dir === 'Home') i = 0;
        else if (dir === 'End') i = tiles.length - 1;
        else return;
        focusTile(i);
      }

      const tile = (a) => {
        const fav = isFav(a.id);
        return `
        <button class="br-app" data-app="${a.id}" title="Открыть «${escapeHtml(a.name)}»">
          <span class="br-app-fav${fav ? ' on' : ''}" data-fav="${a.id}" role="button" tabindex="0" title="${fav ? 'Убрать из избранного' : 'В избранное'}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}">★</span>
          <span class="br-app-ico">${a.icon}</span>
          <span class="br-app-name">${escapeHtml(a.name)}</span>
        </button>`;
      };

      el.innerHTML = `
        <div class="br-apps-head">
          <div class="br-apps-title">Приложения Nebula</div>
          <div class="br-apps-sub" id="br-apps-sub"></div>
        </div>
        <div class="br-apps-search">
          <span class="br-apps-search-ico">⌕</span>
          <input class="br-apps-input" id="br-apps-input" placeholder="Поиск приложений…" spellcheck="false" autocomplete="off" aria-label="Поиск приложений" />
        </div>
        <div class="br-apps-chips" id="br-apps-chips"></div>
        <div class="br-apps-content" id="br-apps-content"></div>`;

      const input = el.querySelector('#br-apps-input');
      const subEl = el.querySelector('#br-apps-sub');
      const chipsEl = el.querySelector('#br-apps-chips');
      const contentEl = el.querySelector('#br-apps-content');

      function filtered() {
        const q = state.q.trim().toLowerCase();
        return apps.filter(a => {
          if (state.cat !== 'Все' && APP_CATS[a.id] !== state.cat) return false;
          if (q && !a.name.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
          return true;
        });
      }

      function render() {
        // Чипы категорий
        chipsEl.innerHTML = cats.map(c =>
          `<button class="br-chip${c === state.cat ? ' active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
        ).join('');

        const list = filtered();
        const shown = list.filter(a => a.dock !== false);
        const hidden = list.filter(a => a.dock === false);

        if (!list.length) {
          contentEl.innerHTML = '<div class="br-apps-empty">Ничего не найдено</div>';
          state.sel = 0;
        } else {
          contentEl.innerHTML =
            `<div class="br-apps-grid">${shown.map(tile).join('')}</div>` +
            (hidden.length ? `<div class="br-apps-sec">Служебные</div><div class="br-apps-grid">${hidden.map(tile).join('')}</div>` : '');
        }
        subEl.textContent = state.q || state.cat !== 'Все'
          ? `найдено: ${list.length} из ${apps.length}`
          : `${apps.length} приложений · кликните, чтобы запустить`;
        // Синхронизация roving-фокуса без перехвата ввода (не вызывает .focus())
        syncFocus(Math.min(state.sel, Math.max(0, contentEl.querySelectorAll('.br-app').length - 1)));
      }

      input.value = state.q;
      // Поиск с дебаунсом (запрос сохраняется в localStorage)
      let debounce = 0;
      input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.q = input.value;
          Store.set('nebula.browserAppsQ', state.q);
          render();
        }, 120);
      });
      // Клик по чипу категории (выбор сохраняется в localStorage)
      chipsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-cat]');
        if (!chip) return;
        AudioSys.click();
        state.cat = chip.dataset.cat;
        Store.set('nebula.browserAppsCat', state.cat);
        render();
      });
      // Избранное: звёздочка на плитке (не запускает приложение).
      // Клик и клавиатура (Enter/Space) — оба пути обрабатываются здесь.
      const onFavTrigger = (fav) => {
        const idx = [...contentEl.querySelectorAll('.br-app')].indexOf(fav.closest('.br-app'));
        AudioSys.click();
        toggleFav(fav.dataset.fav);
        render();
        // Возвращаем фокус на ту же плитку после перерисовки
        if (idx >= 0) focusTile(idx);
      };
      contentEl.addEventListener('click', (e) => {
        const fav = e.target.closest('[data-fav]');
        if (fav) {
          e.stopPropagation();
          onFavTrigger(fav);
          return;
        }
        const app = e.target.closest('[data-app]');
        if (!app) return;
        AudioSys.click();
        WM.open(app.dataset.app);
      });
      // Клавиатурная навигация по плиткам: стрелки, Home/End, Enter/Space — запуск
      contentEl.addEventListener('keydown', (e) => {
        const fav = e.target.closest('[data-fav]');
        if (fav && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          onFavTrigger(fav);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          const tile = e.target.closest('[data-app]');
          if (!tile) return;
          e.preventDefault();
          AudioSys.click();
          WM.open(tile.dataset.app);
          return;
        }
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          moveFocus(e.key);
        }
      });
      // Клик по плитке — тоже ставит её в фокус.
      // Звёздочку не трогаем: у неё свой фокус (таб-стоп) для клавиатуры.
      contentEl.addEventListener('focusin', (e) => {
        if (e.target.closest('[data-fav]')) return;
        const tile = e.target.closest('[data-app]');
        if (tile) {
          const tiles = [...contentEl.querySelectorAll('.br-app')];
          focusTile(tiles.indexOf(tile));
        }
      });

      render();
      return el;
    }

    // Страница «Закладки»
    function buildBookmarks() {
      const el = document.createElement('div');
      el.className = 'br-page';
      if (!bookmarks.length) {
        el.innerHTML = '<div class="br-page-empty">Закладок пока нет</div>';
        return el;
      }
      el.innerHTML = `
        <div class="br-page-head">
          <span>Закладки</span>
          <button class="fbtn br-clear" id="br-bm-clear" type="button">Очистить все</button>
        </div>
        <div class="br-page-list">${bookmarks.map(b => `
          <div class="br-item" data-go="${escapeHtml(b.url)}">
            <span class="br-item-ico">${favicon(b.url)}</span>
            <div class="br-item-body">
              <div class="br-item-title">${escapeHtml(b.title || b.url)}</div>
              <div class="br-item-url">${escapeHtml(b.url)}</div>
            </div>
            <button class="br-item-x" data-del="${escapeHtml(b.url)}" title="Удалить" aria-label="Удалить">✕</button>
          </div>`).join('')}</div>`;
      el.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]');
        if (del) { e.stopPropagation(); removeBookmark(del.dataset.del); return; }
        const it = e.target.closest('[data-go]');
        if (it) navigate(it.dataset.go);
      });
      el.querySelector('#br-bm-clear').addEventListener('click', () => { bookmarks.length = 0; saveB(); render(); });
      return el;
    }

    // Страница «История»
    function buildHistory() {
      const el = document.createElement('div');
      el.className = 'br-page';
      if (!history.length) {
        el.innerHTML = '<div class="br-page-empty">История пуста</div>';
        return el;
      }
      el.innerHTML = `
        <div class="br-page-head">
          <span>История</span>
          <button class="fbtn br-clear" id="br-his-clear" type="button">Очистить все</button>
        </div>
        <div class="br-page-list">${history.slice(0, 50).map(h => `
          <div class="br-item" data-go="${escapeHtml(h.url)}">
            <span class="br-item-ico">${favicon(h.url)}</span>
            <div class="br-item-body">
              <div class="br-item-title">${escapeHtml(h.title || h.url)}</div>
              <div class="br-item-url">${escapeHtml(h.url)} · ${new Date(h.time).toLocaleTimeString('ru-RU')}</div>
            </div>
          </div>`).join('')}</div>`;
      el.addEventListener('click', (e) => {
        const it = e.target.closest('[data-go]');
        if (it) navigate(it.dataset.go);
      });
      el.querySelector('#br-his-clear').addEventListener('click', () => { history.length = 0; saveH(); render(); });
      return el;
    }

    // Страница виртуальной файловой системы: nebula://vfs/путь
    function buildVfs(url) {
      VFS.init();
      const path = vfsPathFromUrl(url);
      const node = VFS.node(path);
      const el = document.createElement('div');
      el.className = 'br-vfs';

      if (!node) {
        el.innerHTML = `
          <div class="br-vfs-crumbs"></div>
          <div class="br-page-empty">
            <div class="br-404">
              <div class="br-404-code">404</div>
              <div class="br-404-text">«${escapeHtml(path)}» не найден в виртуальной файловой системе</div>
              <button class="fbtn" data-vfs-root="1" type="button">⌂ Перейти в корень</button>
            </div>
          </div>`;
        el.querySelector('[data-vfs-root]').addEventListener('click', () => navigate('nebula://vfs'));
        return el;
      }

      // Хлебные крошки: ⌂ › home › guest …
      const crumbs = () => {
        const parts = path === '/' ? [] : path.split('/').filter(Boolean);
        let acc = '';
        let html = `<button class="br-crumb" data-vfs-go="${escapeHtml(vfsUrlFromPath('/'))}" title="Корень">⌂</button>`;
        parts.forEach(seg => {
          acc += '/' + seg;
          html += `<span class="br-crumb-sep">›</span><button class="br-crumb" data-vfs-go="${escapeHtml(vfsUrlFromPath(acc))}">${escapeHtml(seg)}</button>`;
        });
        return html;
      };

      if (node.type === 'dir') {
        const items = VFS.readDir(path) || [];
        el.innerHTML = `
          <div class="br-vfs-crumbs">${crumbs()}</div>
          <div class="br-vfs-list">${items.length ? items.map(i => `
            <button class="br-vfs-item" data-vfs-go="${escapeHtml(vfsUrlFromPath(VFS.norm(path + '/' + i.name)))}">
              <span class="br-vfs-ico">${i.type === 'dir' ? '📁' : vfsIcon(i.name)}</span>
              <span class="br-vfs-name">${escapeHtml(i.name)}</span>
              <span class="br-vfs-meta">${i.type === 'dir' ? 'папка' : VFS.humanSize(i.size)}</span>
            </button>`).join('') : '<div class="br-vfs-empty">Папка пуста</div>'}</div>`;
      } else {
        const content = node.content || '';
        const lines = content.split('\n').length;
        const name = path.split('/').pop();
        el.innerHTML = `
          <div class="br-vfs-crumbs">${crumbs()}</div>
          <div class="br-vfs-file-head">
            <span class="br-vfs-file-ico">${vfsIcon(name)}</span>
            <span class="br-vfs-file-name">${escapeHtml(name)}</span>
            <span class="br-vfs-file-meta">${lines} строк · ${VFS.humanSize(content.length)}</span>
            <button class="fbtn" data-vfs-dl="1" type="button" title="Скачать файл">⭳ Скачать</button>
          </div>
          <pre class="br-vfs-file">${escapeHtml(content)}</pre>`;
        el.querySelector('[data-vfs-dl]').addEventListener('click', () => downloadVfsFile(path));
      }

      // Навигация по крошкам и элементам
      el.addEventListener('click', (e) => {
        const go = e.target.closest('[data-vfs-go]');
        if (go) { AudioSys.click(); navigate(go.dataset.vfsGo); }
      });
      return el;
    }

    // Внешняя страница: iframe + кнопка «открыть в новой вкладке»
    function buildFrame(url) {
      const el = document.createElement('div');
      el.className = 'br-frame-wrap';
      const frame = document.createElement('iframe');
      frame.className = 'br-frame' + (darkMode ? ' dark' : '');
      frame.src = url;
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.setAttribute('aria-label', 'Содержимое страницы');
      el.appendChild(frame);
      const note = document.createElement('div');
      note.className = 'br-frame-note';
      note.innerHTML = '<span>Некоторые сайты запрещают встраивание — откройте страницу в новой вкладке:</span>';
      const openBtn = document.createElement('button');
      openBtn.className = 'fbtn';
      openBtn.textContent = '↗ Открыть';
      openBtn.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
      note.appendChild(openBtn);
      el.appendChild(note);
      return el;
    }

    /* ── События ── */
    root.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
      AudioSys.click();
      const act = b.dataset.nav;
      if (act === 'back') goBack();
      else if (act === 'fwd') goFwd();
      else if (act === 'reload') render();
      else if (act === 'home') navigate(HOME);
    }));
    root.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => {
      AudioSys.click();
      navigate('nebula://' + b.dataset.page);
    }));
    starBtn.addEventListener('click', () => { AudioSys.click(); toggleBookmark(); });
    darkBtn.addEventListener('click', () => { AudioSys.click(); toggleDark(); });
    addrForm.addEventListener('submit', (e) => {
      e.preventDefault();
      navigate(addrEl.value);
      addrEl.blur();
    });
    // Enter в адресной строке (jsdom не отправляет форму по Enter — дублируем)
    addrEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); navigate(addrEl.value); addrEl.blur(); }
    });

    // Горячие клавиши: Ctrl+L — адрес, Ctrl+T — вкладка, Ctrl+W — закрыть
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'l') { e.preventDefault(); addrEl.focus(); addrEl.select(); }
        else if (k === 't') { e.preventDefault(); addTab(); }
        else if (k === 'w') { e.preventDefault(); const t = activeTab(); if (t) closeTab(t.id); }
      }
    };
    root.addEventListener('keydown', onKey);

    updateDarkBtn();
    body.appendChild(root);
    addTab();
    return { focus: () => addrEl.focus(), destroy: () => root.removeEventListener('keydown', onKey) };
  }

  const Apps = {
    list: {
      notes:      { id: 'notes',      name: 'Заметки',     icon: '📝', width: 460, height: 500, mount: mountNotes },
      terminal:   { id: 'terminal',   name: 'Терминал',    icon: '💻', width: 600, height: 420, mount: mountTerminal },
      calculator: { id: 'calculator', name: 'Калькулятор', icon: '🧮', width: 320, height: 470, mount: mountCalculator },
      settings:   { id: 'settings',   name: 'Настройки',   icon: '🎨', width: 480, height: 540, mount: mountSettings },
      files:      { id: 'files',      name: 'Файлы',       icon: '📁', width: 660, height: 470, mount: mountFiles },
      music:      { id: 'music',      name: 'Музыка',      icon: '🎵', width: 420, height: 560, mount: mountMusic },
      calendar:   { id: 'calendar',   name: 'Календарь',   icon: '📅', width: 700, height: 480, mount: mountCalendar },
      browser:    { id: 'browser',    name: 'Браузер',     icon: '🌐', width: 760, height: 540, mount: mountBrowser },
      about:      { id: 'about',      name: 'О системе',   icon: '🛰️', width: 380, height: 300, mount: mountAbout, dock: false },
    },
  };

  /* ───────────────────────── Иконки рабочего стола ───────────────────────── */
  const DesktopIcons = {
    el: null,

    init() {
      this.el = document.getElementById('desktop-icons');
      if (!this.el) return;

      Object.values(Apps.list).forEach(app => {
        const ic = document.createElement('button');
        ic.className = 'desktop-icon';
        ic.dataset.app = app.id;
        ic.setAttribute('aria-label', `${app.name} — открыть двойным кликом`);
        ic.title = app.name;
        ic.innerHTML = `<span class="di-ico">${app.icon}</span><span class="di-label">${app.name}</span>`;

        // Один клик — выделение, двойной — открытие (как в настоящей ОС)
        ic.addEventListener('click', () => {
          this.el.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
          ic.classList.add('selected');
        });
        ic.addEventListener('dblclick', () => WM.open(app.id));
        ic.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); WM.open(app.id); }
        });
        this.el.appendChild(ic);
      });

      // Клик по пустому месту снимает выделение
      this.el.addEventListener('pointerdown', (e) => {
        if (e.target === this.el) this.deselect();
      });
    },

    deselect() {
      this.el.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    },
  };

  /* ───────────────────────── Контекстное меню ───────────────────────── */
  const Ctx = {
    el: null,

    init() {
      this.el = document.getElementById('ctx-menu');
      // Открытие по ПКМ на рабочем столе
      document.getElementById('desktop').addEventListener('contextmenu', (e) => {
        if (e.target.closest('.window')) return; // внутри окна — стандартное меню
        e.preventDefault();
        this.show(e.clientX, e.clientY);
      });
      // Закрытие по клику / Esc
      document.addEventListener('pointerdown', (e) => {
        if (!this.el.contains(e.target)) this.hide();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
      window.addEventListener('blur', () => this.hide());
      window.addEventListener('resize', () => this.hide());
    },

    build(items) {
      this.el.innerHTML = items.map(it => {
        if (it.sep) return '<div class="ctx-sep"></div>';
        return `<div class="ctx-item" data-act="${it.act}"><span class="ctx-ico">${it.icon}</span>${it.label}</div>`;
      }).join('');
      this.el.querySelectorAll('.ctx-item').forEach(item => {
        item.addEventListener('click', () => {
          this.hide();
          const act = item.dataset.act;
          const fn = (this._actions || this.actions)[act];
          if (fn) fn();
        });
      });
    },

    // Пункты меню по умолчанию (рабочий стол). Приложения могут передать
    // свои пункты и действия через show(x, y, items, actions).
    defaultItems() {
      return [
        { icon: '💻', label: 'Открыть терминал', act: 'terminal' },
        { icon: '📝', label: 'Открыть заметки', act: 'notes' },
        { icon: '🎵', label: 'Открыть музыку', act: 'music' },
        { icon: '📁', label: 'Открыть файлы', act: 'files' },
        { icon: '🌐', label: 'Открыть браузер', act: 'browser' },
        { icon: '🎨', label: 'Открыть настройки', act: 'settings' },
        { sep: true },
        { icon: '🖼️', label: 'Следующие обои', act: 'nextWall' },
        { icon: '🛰️', label: 'О системе', act: 'about' },
        { sep: true },
        { icon: '🔁', label: 'Перезагрузить ОС', act: 'reload' },
      ];
    },

    show(x, y, items, actions) {
      this.build(items || this.defaultItems());
      this._actions = actions || null;
      // Не вылезаем за края экрана
      const rect = this.el.getBoundingClientRect();
      const left = Math.min(x, window.innerWidth - rect.width - 8);
      const top = Math.min(y, window.innerHeight - rect.height - 8);
      this.el.style.left = left + 'px';
      this.el.style.top = top + 'px';
      requestAnimationFrame(() => this.el.classList.add('show'));
    },

    hide() { this.el.classList.remove('show'); },

    actions: {
      terminal: () => WM.open('terminal'),
      notes: () => WM.open('notes'),
      music: () => WM.open('music'),
      files: () => WM.open('files'),
      browser: () => WM.open('browser'),
      settings: () => WM.open('settings'),
      about: () => WM.open('about'),
      reload: () => location.reload(),
      nextWall() {
        const ids = WALLPAPERS.map(w => w.id);
        const next = ids[(ids.indexOf(Settings.wallpaper) + 1) % ids.length];
        Settings.applyWallpaper(next);
        notifySystem({ icon: '🖼️', title: 'Обои рабочего стола', text: `Установлены обои «${WALLPAPERS.find(w => w.id === next).name}».`, app: 'settings' });
      },
    },
  };

  /* ───────────────────────── Матрица (дождь из кода) ───────────────────────── */
  const Matrix = {
    canvas: null, ctx: null,
    active: false,
    raf: 0,
    cols: 0, drops: [],

    start() {
      this.canvas = document.getElementById('matrix-layer');
      this.canvas.classList.add('on');
      this.ctx = this.canvas.getContext('2d');
      this.active = true;
      this.resize();
      // Привязываем обработчики, чтобы сохранить контекст this
      this._onResize = this.onResize.bind(this);
      this._onKey = this.onKey.bind(this);
      window.addEventListener('resize', this._onResize);
      document.addEventListener('keydown', this._onKey);
      this.loop();
      return this;
    },

    onResize() { if (this.active) this.resize(); },

    onKey(e) { if (e.key === 'Escape') this.stop(); },

    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fontSize = 16;
      this.cols = Math.floor(window.innerWidth / fontSize);
      this.drops = Array(this.cols).fill(1).map(() => Math.random() * -60);
    },

    loop() {
      if (!this.active) return;
      const ctx = this.ctx;
      const chars = 'アカサタナハマヤラワ0123456789ABCDEF<>*+=#$_';
      const fontSize = 16;

      // Полупрозрачная заливка создаёт эффект затухания
      ctx.fillStyle = 'rgba(2, 6, 4, .10)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.font = fontSize + 'px monospace';
      ctx.fillStyle = '#22ff88';

      for (let i = 0; i < this.cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, this.drops[i] * fontSize);

        if (this.drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) {
          this.drops[i] = 0;
        }
        this.drops[i]++;
      }
      this.raf = requestAnimationFrame(() => this.loop());
    },

    stop() {
      this.active = false;
      cancelAnimationFrame(this.raf);
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      if (this._onKey) document.removeEventListener('keydown', this._onKey);
      this.canvas.classList.remove('on');
      if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
  };

  /* ───────────────────────── Экран загрузки ───────────────────────── */
  const Boot = {
    init() {
      // Применяем сохранённые настройки до отрисовки
      Settings.applyTheme(Settings.theme);
      Settings.applyWallpaper(Settings.wallpaper);

      const boot = document.getElementById('boot');
      const hint = document.getElementById('boot-hint');
      const steps = ['загрузка ядра…', 'монтирование файловой системы…', 'запуск графической оболочки…', 'готово ✓'];
      let i = 0;
      const iv = setInterval(() => {
        i = Math.min(i + 1, steps.length - 1);
        hint.textContent = steps[i];
      }, 420);

      // Завершение загрузки: прячем экран и шлём системные уведомления
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(iv);
        boot.classList.add('hide');
        setTimeout(() => {
          boot.remove();
          if (!Store.get('nebula.welcomed', false)) {
            Store.set('nebula.welcomed', true);
            Notif.push({
              icon: '👋',
              title: 'Добро пожаловать в Nebula OS',
              text: 'Док — внизу, ПКМ по рабочему столу — меню. Загляните в «Файлы».',
              app: 'files',
              timeout: 8000,
            });
          }
          Notif.push({ icon: '🚀', title: 'Система готова', text: 'Nebula OS загружена. Приятной работы!' });
        }, 800);
      };

      // Прячем экран после анимации загрузки
      setTimeout(finish, 1800);

      // Клик пропускает загрузку
      boot.addEventListener('click', finish);
    },

    // Перезагрузка ОС (из меню «Пуск» и контекстного меню)
    reboot() {
      location.reload();
    },
  };

  /* ───────────────────────── Инициализация ───────────────────────── */
  // Флаг защищает от повторного запуска (например, если DOMContentLoaded
  // сработал после ручного вызова init в тестах — иначе обработчики
  // навешивались бы дважды и клик по колокольчику открывал/закрывал центр).
  let started = false;

  function init() {
    if (started) return;
    started = true;

    AudioSys.init();
    VFS.init();
    WM.init();
    Dock.init();
    DesktopIcons.init();
    Notif.init();
    Ctx.init();
    Bg.init();
    Tray.init();
    StartMenu.init();
    Boot.init();

    // Клик по рабочему столу (не по окну) снимает фокус с окон.
    // Слушаем на #desktop: windows-layer прозрачен для событий,
    // поэтому сюда всплывают клики и с иконок, и с пустого места.
    document.getElementById('desktop').addEventListener('pointerdown', (e) => {
      if (e.target.closest('.window')) return;
      WM.active = null;
      WM.windows.forEach(w => w.classList.remove('is-focused'));
      Dock.refresh();
    });
  }

  return { init, WM, Settings, Apps, Matrix, Notif, AudioSys, Bg, Tray, StartMenu };
})();

// Старт ОС после загрузки DOM
document.addEventListener('DOMContentLoaded', () => Nebula.init());
