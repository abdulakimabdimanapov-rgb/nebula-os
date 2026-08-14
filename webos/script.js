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

  /* ───────────────────────── Языки интерфейса (i18n) ───────────────────────── */
  // Nebula OS говорит на 4 языках: русский, English, кыргызча, 中文.
  // t('key') — строка на текущем языке (fallback: русский).
  // Значения могут быть массивами (списки месяцев, команды help и т.п.).
  const I18N = {
    lang: Store.get('nebula.lang', 'ru'),
    dict: {
      ru: {
        'app.notes': 'Заметки', 'app.terminal': 'Терминал', 'app.calculator': 'Калькулятор',
        'app.settings': 'Настройки', 'app.files': 'Файлы', 'app.music': 'Музыка',
        'app.calendar': 'Календарь', 'app.browser': 'Браузер', 'app.tictactoe': 'Крестики-нолики',
        'app.wallpaper': 'Обои', 'app.about': 'О системе',
        'cat.all': 'Все', 'cat.office': 'Офис', 'cat.files': 'Файлы', 'cat.dev': 'Разработка',
        'cat.utils': 'Утилиты', 'cat.media': 'Медиа', 'cat.internet': 'Интернет',
        'cat.system': 'Система', 'cat.games': 'Игры', 'cat.svc': 'Служебные',
        'sm.avatar': 'Г',
        'sm.guest': 'Гость Nebula', 'sm.station': 'Рабочая станция · без входа в систему',
        'sm.apps': 'Приложения', 'sm.reboot': '⟳ Перезагрузить ОС',
        'sm.sys': 'Система', 'sm.wins': 'Окна', 'sm.theme': 'Тема', 'sm.wall': 'Обои',
        'sm.uptime': 'Аптайм', 'sm.ram': 'Память',
        'w.min': 'Свернуть', 'w.max': 'Развернуть', 'w.close': 'Закрыть',
        'ctx.term': 'Открыть терминал', 'ctx.notes': 'Открыть заметки', 'ctx.music': 'Открыть музыку',
        'ctx.files': 'Открыть файлы', 'ctx.browser': 'Открыть браузер', 'ctx.settings': 'Открыть настройки',
        'ctx.tictactoe': 'Открыть крестики-нолики', 'ctx.wallpaper': 'Открыть обои',
        'ctx.nextWall': 'Следующие обои', 'ctx.about': 'О системе', 'ctx.reboot': 'Перезагрузить ОС',
        'ctx.open': 'Открыть', 'ctx.rename': 'Переименовать', 'ctx.download': 'Скачать', 'ctx.delete': 'Удалить',
        'di.open': 'Открыть двойным кликом',
        'tray.wifiOn': 'Wi-Fi: подключено', 'tray.wifiOff': 'Wi-Fi: отключено', 'tray.vol': 'Громкость',
        'tray.full': 'Полноэкранный режим', 'tray.fullExit': 'Выйти из полноэкранного режима',
        'tray.muted': 'звук выключен', 'tray.mute': '🔇 Выключить звук', 'tray.unmute': '🔊 Включить звук',
        'theme.dark': 'Ночь', 'theme.darkDesc': 'Классика',
        'theme.neon': 'Неон', 'theme.neonDesc': 'Кислотный цвет',
        'theme.cyberpunk': 'Киберпанк', 'theme.cyberpunkDesc': 'Город будущего',
        'theme.glass': 'Стекло', 'theme.glassDesc': 'Неоновый футуризм',
        'theme.light': 'Светлая', 'theme.lightDesc': 'Дневной режим',
        'wall.aurora': 'Аврора', 'wall.auroraDesc': 'Северное сияние',
        'wall.sunset': 'Закат', 'wall.sunsetDesc': 'Тёплый огонь',
        'wall.ocean': 'Океан', 'wall.oceanDesc': 'Глубина',
        'wall.mono': 'Монохром', 'wall.monoDesc': 'Минимализм',
        'wall.space': 'Космос', 'wall.spaceDesc': 'Глубокий космос',
        'wall.cyber': 'Киберпанк', 'wall.cyberDesc': 'Неоновый город',
        'wall.nature': 'Природа', 'wall.natureDesc': 'Лес и горы',
        'wall.minimal': 'Минимализм', 'wall.minimalDesc': 'Чистота и покой',
        'wall.mountains': 'Горы', 'wall.mountainsDesc': 'Рассвет в горах',
        'set.theme': 'Тема оформления', 'set.wall': 'Обои рабочего стола',
        'set.reset': 'Сбросить все настройки',
        'set.resetDone': 'Тема «Ночь» и обои «Аврора» восстановлены.',
        'set.resetDoneWo': 'Тема «Стекло» и обои «Космос» восстановлены.',
        'set.lang': 'Язык интерфейса',
        'wallapp.hint': 'Нажмите на карточку — фон сменится мгновенно и сохранится.',
        'nt.welcome': 'Добро пожаловать в Nebula OS',
        'nt.welcomeText': 'Док — внизу, ПКМ по рабочему столу — меню. Загляните в «Файлы».',
        'nt.ready': 'Система готова', 'nt.readyText': 'Nebula OS загружена. Приятной работы!',
        'nt.themeApplied': 'Применена тема «{0}».', 'nt.wallApplied': 'Установлены обои «{0}».',
        'nt.settingsReset': 'Настройки сброшены',
        'nt.matrixOn': 'Добро пожаловать в Матрицу',
        'nt.matrixOnText': 'Нажмите Esc или выполните «matrix», чтобы выйти.',
        'nt.matrixOff': 'Дождь из кода остановлен.',
        'nt.langChanged': 'Язык интерфейса изменён', 'nt.langChangedText': 'Приложения перезапущены.',
        'm.sub': 'генеративная музыка · Web Audio API', 'm.choose': 'Выберите трек',
        'm.wait': 'аудио-движок в режиме ожидания', 'm.pause': 'пауза',
        'm.playing': 'играет · синтез в реальном времени', 'm.noaudio': 'Аудио недоступно в этом браузере',
        'm.soundOn': 'Звук кнопок: вкл', 'm.soundOff': 'Звук кнопок: выкл', 'm.soundBtn': 'Звук кнопок',
        'm.prev': 'Предыдущий', 'm.next': 'Следующий', 'm.play': 'Играть', 'm.pauseBtn': 'Пауза',
        'm.t1': 'Неоновая волна', 'm.t2': 'Ночной трафик', 'm.t3': 'Звёздный дрейф', 'm.t4': 'Утренний терминал',
        'ttt.bot': '🤖 Бот', 'ttt.hard': '🧠 Непобедимый', 'ttt.pvp': '👥 2 игрока',
        'ttt.turn': 'Ход: ', 'ttt.thinking': 'Бот думает…', 'ttt.botWin': 'Бот победил! 🤖',
        'ttt.win': 'Победил {0}!', 'ttt.draw': 'Ничья 🤝', 'ttt.restart': '↺ Заново', 'ttt.cell': 'Клетка',
        'notes.title': 'Заголовок заметки…', 'notes.body': 'Начните писать… текст сохраняется автоматически',
        'notes.ready': 'Готово', 'notes.saving': 'Сохранение…', 'notes.saved': 'Сохранено {0}',
        'notes.cleared': 'Очищено', 'notes.clear': 'Очистить',
        'files.newFolder': '＋ Папка', 'files.newFile': '＋ Файл', 'files.view': 'Сменить вид',
        'files.back': 'Назад', 'files.fwd': 'Вперёд', 'files.up': 'На уровень выше',
        'files.empty': 'Папка пуста', 'files.rootEmpty': 'Файловая система пуста',
        'files.space': 'занято: {0}', 'files.folder': 'папка',
        'files.saved': 'Сохранено', 'files.close': 'Закрыть', 'files.open': 'Открыть',
        'files.rename': 'Переименовать', 'files.download': 'Скачать', 'files.delete': 'Удалить',
        'files.newFolderName': 'Новая папка', 'files.newFileName': 'новый файл.txt',
        'files.notFound': 'Файл не найден', 'files.exists': 'Элемент с таким именем уже существует',
        'files.noParent': 'Родительская папка не найдена', 'files.badPath': 'Некорректный путь',
        'files.badName': 'Некорректное имя', 'files.emptyName': 'Пустое имя',
        'files.noItem': 'Элемент не найден', 'files.noRoot': 'Нельзя удалить корень',
        'files.deleteQ': 'Удалить {0} <b>«{1}»</b>?<br>Действие нельзя отменить.',
        'files.closeQ': 'Файл <b>«{0}»</b> изменён.<br>Закрыть без сохранения?',
        'files.cancel': 'Отмена',
        'files.count': '{0} элемент(ов) · папок: {1} · файлов: {2}',
        'calc.err': 'Ошибка',
        'cal.today': 'Сегодня', 'cal.placeholder': 'Название события…', 'cal.empty': 'Нет событий на этот день',
        'cal.del': 'Удалить', 'cal.time': 'Время', 'cal.add': 'Добавить',
        'cal.prev': 'Предыдущий месяц', 'cal.next': 'Следующий месяц',
        'cal.dow': ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
        'cal.weekdays': ['вс','пн','вт','ср','чт','пт','сб'],
        'cal.months': ['Январь','Февраль','Март','Апрель','Май','Июнь',
                       'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
        'term.banner': 'NEBULA OS', 'term.bannerSub': ' — терминал v1.0.0 · ядро 4.20.6-zen',
        'term.hint': 'Введите <span class="t-acc">help</span> для списка команд.',
        'term.helpTitle': 'Доступные команды:', 'term.unknown': 'Команда не найдена:',
        'term.help': [
          ['help', 'список команд'], ['clear', 'очистить экран'],
          ['date', 'текущие дата и время'], ['echo &lt;текст&gt;', 'вывести текст'],
          ['theme [dark|neon|cyberpunk]', 'сменить тему'], ['matrix', 'вкл/выкл дождь из кода'],
          ['ls [путь]', 'приложения или файлы в каталоге'], ['cat &lt;файл&gt;', 'показать содержимое файла'],
          ['mkdir &lt;путь&gt;', 'создать папку'], ['touch &lt;путь&gt;', 'создать пустой файл'],
          ['rm &lt;путь&gt;', 'удалить файл или папку'], ['open &lt;приложение&gt;', 'открыть приложение'],
          ['whoami', 'кто я?'], ['neofetch', 'информация о системе'], ['about', 'о системе'],
        ],
        'term.tTheme': 'Текущая тема: {0} (dark, neon, cyberpunk)',
        'term.tUnknown': 'Неизвестная тема «{0}». Доступны: dark, neon, cyberpunk.',
        'term.matrixOn': 'Добро пожаловать в Матрицу. Нажмите «matrix» или Esc, чтобы выйти.',
        'term.matrixOff': 'Матрица выключена.',
        'term.lsDir': '— {0} элемент(ов)', 'term.lsApps': 'Установленные приложения:',
        'term.noDir': 'Каталог не найден: {0}',
        'term.openHint': 'Укажите приложение: notes, files, terminal, calculator, settings, music, calendar, browser, tictactoe, wallpaper, snake, minesweeper, paint, game2048, pong, editor',
        'term.opening': 'Открываю «{0}»…', 'term.notFound': 'Приложение «{0}» не найдено. Наберите <span class="t-acc">ls</span>.',
        'term.isDir': '«{0}» — это папка, а не файл.', 'term.catNo': 'Укажите файл: <span class="t-acc">cat &lt;путь&gt;</span>',
        'term.noFile': 'Файл не найден: {0}', 'term.mkdirNeed': 'Укажите путь: <span class="t-acc">mkdir &lt;путь&gt;</span>',
        'term.mkdirOk': 'Папка создана: {0}', 'term.touchNeed': 'Укажите путь: <span class="t-acc">touch &lt;путь&gt;</span>',
        'term.touchOk': 'Файл создан: {0}', 'term.rmNeed': 'Укажите путь: <span class="t-acc">rm &lt;путь&gt;</span>',
        'term.rmOk': 'Удалено: {0}',
        'term.whoami': 'guest — гость Nebula OS. Здесь нет паролей. <span class="t-dim">¯\\_(ツ)_/¯</span>',
        'term.about1': 'Nebula OS — операционная система в браузере.',
        'term.about2': 'Собрана на чистом HTML, CSS и JavaScript. Без единой внешней библиотеки.',
        'term.neofetch': ['guest@nebula','─────────────','ОС: Nebula OS 1.0.0','Тема: {0}','Обои: {1}','Окна открыто: {2}','Shell: nebula-sh 1.0','ЦПУ: ваш мозг @ 100%'],
        'boot.steps': ['загрузка ядра…', 'монтирование файловой системы…', 'запуск графической оболочки…', 'готово ✓'],
        'about.title': 'NEBULA<span>OS</span>', 'about.ver': 'Версия 1.1 · сборка 2026.08',
        'about.desc': 'Операционная система в браузере на чистом HTML, CSS и JavaScript — без единой внешней библиотеки. Окна, док, терминал и целая вселенная.',
        'about.specTests': ['Тесты', 'headless-сьют: node .ui-test.js'],
        'about.specEngine': ['Движок', 'Чистые HTML · CSS · JavaScript'],
        'about.specStorage': ['Хранилище', 'localStorage (переживает перезагрузку)'],
        'about.specSound': ['Звук', 'Web Audio API — без аудиофайлов'],
        'about.specLook': ['Оформление', '{0} темы · {1} обоев'],
        'about.specApps': ['Приложения', '{0} (включая служебные)'],
        'br.home': 'Новая вкладка', 'br.apps': 'Приложения', 'br.bookmarks': 'Закладки',
        'br.history': 'История', 'br.vfs': 'Файлы', 'br.about': 'О системе', 'br.settings': 'Настройки',
        'br.tray': 'Трей', 'br.back': 'Назад', 'br.fwd': 'Вперёд', 'br.reload': 'Обновить',
        'br.homeBtn': 'Домой', 'br.bookmark': 'Добавить в закладки', 'br.bmOn': 'Убрать из закладок',
        'br.darkOn': 'Тёмная тема страницы', 'br.darkOff': 'Светлая тема страницы',
        'br.bmPage': 'Закладки', 'br.hisPage': 'История',
        'br.web': '🌐 внешняя страница', 'br.vfsPage': '📁 файловая система', 'br.int': '◐ внутренняя страница',
        'br.err': 'Не удалось открыть страницу',
        'br.homeTitle': 'Nebula <span>Browser</span>', 'br.search': 'Поиск в интернете или введите адрес…',
        'br.find': 'Найти', 'br.sys': 'Система', 'br.quick': 'Быстрые ссылки',
        'br.favApps': 'Избранные приложения',
        'br.emptyBm': 'Закладок пока нет — нажмите ☆ рядом с адресной строкой',
        'br.bmEmpty': 'Закладок пока нет', 'br.hisEmpty': 'История пуста', 'br.clearAll': 'Очистить все',
        'br.404': '«{0}» не найден в виртуальной файловой системе', 'br.root': '⌂ Перейти в корень',
        'br.folder': 'папка', 'br.lines': '{0} строк · {1}', 'br.dl': '⭳ Скачать',
        'br.note': 'Некоторые сайты запрещают встраивание — включите текстовый режим:',
        'br.reader': '📄 Текстовый режим', 'br.tab': '＋ Вкладка', 'br.loading': 'Загрузка…',
        'br.readerFail': 'Не удалось загрузить страницу в текстовом режиме. Проверьте соединение.',
        'br.openTab': '↗ Открыть', 'br.plus': 'Новая вкладка',
        'br.appsTitle': 'Приложения Nebula', 'br.appsSub': 'кликните, чтобы запустить',
        'br.appsFound': 'найдено: {0} из {1}', 'br.appsEmpty': 'Ничего не найдено',
        'br.searchApps': 'Поиск приложений…', 'br.svcSec': 'Служебные',
        'br.vol': 'Звук', 'br.net': 'Wi-Fi', 'br.connected': 'Подключено', 'br.disconnected': 'Отключено',
        'br.volTitle': 'Системный трей',
        'br.volSub': 'Звук и сеть — как в панели внизу, но на отдельной странице.',
        'br.test': '♪ Тест звука', 'br.settingsTitle': 'Настройки',
        'br.settingsSub': 'Внешний вид Nebula OS — применяется мгновенно и сохраняется.',
        'br.launch': 'Открыть «{0}»',
        'br.favOn': 'Убрать из избранного', 'br.favOff': 'В избранное',
        'br.live': 'Живая статистика', 'br.quickTheme': 'Быстрая тема', 'br.specs': 'Характеристики',
        'br.cpu': 'CPU', 'br.store': 'Хранилище', 'br.avg': 'среднее', 'br.max': 'макс',
        'br.aboutApp': '🛰️ Приложение «О системе»', 'br.openSettings': '🎨 Открыть настройки',
        'br.rebootOs': '⟳ Перезагрузить ОС', 'br.sleep': '☾ Спящий режим',
        'app.snake': 'Змейка', 'app.minesweeper': 'Сапёр', 'app.paint': 'Рисовалка',
        'app.game2048': '2048', 'app.pong': 'Пинг-понг', 'app.editor': 'Редактор',
        'snake.score': 'Счёт', 'snake.best': 'Рекорд', 'snake.over': 'Игра окончена',
        'snake.new': '↺ Заново', 'snake.pause': '⏸ Пауза', 'snake.resume': '▶ Продолжить',
        'snake.hint': 'Управление: стрелки или WASD · пробел — пауза',
        'ms.easy': 'Лёгкий', 'ms.medium': 'Средний', 'ms.hard': 'Сложный',
        'ms.mines': 'Мины', 'ms.time': 'Время', 'ms.win': 'Победа! 🎉', 'ms.lose': 'Бум! 💥',
        'ms.restart': '↺ Заново', 'ms.hint': 'ЛКМ — открыть клетку · ПКМ — флаг',
        'pt.color': 'Цвет', 'pt.brush': 'Кисть', 'pt.eraser': 'Ластик',
        'pt.clear': 'Очистить', 'pt.save': '⭳ Сохранить PNG', 'pt.saved': 'Рисунок сохранён',
        'pt.hint': 'Рисуйте мышью или пальцем',
        'g.score': 'Счёт', 'g.best': 'Рекорд', 'g.new': '↺ Новая игра', 'g.over': 'Игра окончена',
        'g.win': 'Плитка 2048 собрана!', 'g.hint': 'Стрелки или WASD',
        'p.you': 'Вы', 'p.bot': 'Бот', 'p.start': '▶ Играть', 'p.over': 'Игра окончена',
        'p.win': 'Вы победили! 🏆', 'p.lose': 'Бот победил 🤖', 'p.restart': '↺ Заново',
        'p.hint': 'Мышь или W/S — двигайте ракетку',
        'ed.new': '＋ Новый', 'ed.open': '📂 Открыть…', 'ed.save': '💾 Сохранить',
        'ed.name': 'файл.txt', 'ed.saved': 'Сохранено: {0}',
        'ed.lines': 'строк: {0} · символов: {1}', 'ed.openTitle': 'Открыть из файловой системы',
        'ed.empty': 'В папке /home/guest нет файлов', 'ed.notFound': 'Файл не найден',
        'ed.ctrlS': 'Ctrl+S — сохранить',
        'mb.apps': 'Приложения', 'mb.system': 'Система', 'mb.desktop': 'Рабочий стол',
        'mb.about': 'О системе', 'mb.settings': 'Настройки',
      },
      en: {
        'app.notes': 'Notes', 'app.terminal': 'Terminal', 'app.calculator': 'Calculator',
        'app.settings': 'Settings', 'app.files': 'Files', 'app.music': 'Music',
        'app.calendar': 'Calendar', 'app.browser': 'Browser', 'app.tictactoe': 'Tic-Tac-Toe',
        'app.wallpaper': 'Wallpapers', 'app.about': 'About',
        'cat.all': 'All', 'cat.office': 'Office', 'cat.files': 'Files', 'cat.dev': 'Development',
        'cat.utils': 'Utilities', 'cat.media': 'Media', 'cat.internet': 'Internet',
        'cat.system': 'System', 'cat.games': 'Games', 'cat.svc': 'Services',
        'sm.avatar': 'G',
        'sm.guest': 'Nebula Guest', 'sm.station': 'Workstation · no sign-in',
        'sm.apps': 'Applications', 'sm.reboot': '⟳ Reboot OS',
        'sm.sys': 'System', 'sm.wins': 'Windows', 'sm.theme': 'Theme', 'sm.wall': 'Wallpaper',
        'sm.uptime': 'Uptime', 'sm.ram': 'Memory',
        'w.min': 'Minimize', 'w.max': 'Maximize', 'w.close': 'Close',
        'ctx.term': 'Open terminal', 'ctx.notes': 'Open notes', 'ctx.music': 'Open music',
        'ctx.files': 'Open files', 'ctx.browser': 'Open browser', 'ctx.settings': 'Open settings',
        'ctx.tictactoe': 'Open tic-tac-toe', 'ctx.wallpaper': 'Open wallpapers',
        'ctx.nextWall': 'Next wallpaper', 'ctx.about': 'About', 'ctx.reboot': 'Reboot OS',
        'ctx.open': 'Open', 'ctx.rename': 'Rename', 'ctx.download': 'Download', 'ctx.delete': 'Delete',
        'di.open': 'Open with a double-click',
        'tray.wifiOn': 'Wi-Fi: connected', 'tray.wifiOff': 'Wi-Fi: off', 'tray.vol': 'Volume',
        'tray.full': 'Fullscreen', 'tray.fullExit': 'Exit fullscreen',
        'tray.muted': 'sound off', 'tray.mute': '🔇 Mute sound', 'tray.unmute': '🔊 Unmute sound',
        'theme.dark': 'Night', 'theme.darkDesc': 'Classic',
        'theme.neon': 'Neon', 'theme.neonDesc': 'Acid color',
        'theme.cyberpunk': 'Cyberpunk', 'theme.cyberpunkDesc': 'City of the future',
        'theme.glass': 'Glass', 'theme.glassDesc': 'Neon futurism',
        'theme.light': 'Light', 'theme.lightDesc': 'Day mode',
        'wall.aurora': 'Aurora', 'wall.auroraDesc': 'Northern lights',
        'wall.sunset': 'Sunset', 'wall.sunsetDesc': 'Warm fire',
        'wall.ocean': 'Ocean', 'wall.oceanDesc': 'Depth',
        'wall.mono': 'Monochrome', 'wall.monoDesc': 'Minimalism',
        'wall.space': 'Space', 'wall.spaceDesc': 'Deep space',
        'wall.cyber': 'Cyberpunk', 'wall.cyberDesc': 'Neon city',
        'wall.nature': 'Nature', 'wall.natureDesc': 'Forest and mountains',
        'wall.minimal': 'Minimalism', 'wall.minimalDesc': 'Clean and calm',
        'wall.mountains': 'Mountains', 'wall.mountainsDesc': 'Dawn in the mountains',
        'set.theme': 'Theme', 'set.wall': 'Desktop wallpapers',
        'set.reset': 'Reset all settings',
        'set.resetDone': 'Theme "Night" and wallpaper "Aurora" restored.',
        'set.resetDoneWo': 'Theme "Glass" and wallpaper "Space" restored.',
        'set.lang': 'Interface language',
        'wallapp.hint': 'Click a card — the background changes instantly and is saved.',
        'nt.welcome': 'Welcome to Nebula OS',
        'nt.welcomeText': 'The dock is at the bottom; right-click the desktop for the menu. Check out "Files".',
        'nt.ready': 'System ready', 'nt.readyText': 'Nebula OS loaded. Enjoy!',
        'nt.themeApplied': 'Theme "{0}" applied.', 'nt.wallApplied': 'Wallpaper "{0}" set.',
        'nt.settingsReset': 'Settings reset',
        'nt.matrixOn': 'Welcome to the Matrix',
        'nt.matrixOnText': 'Press Esc or run "matrix" to exit.',
        'nt.matrixOff': 'The code rain has stopped.',
        'nt.langChanged': 'Interface language changed', 'nt.langChangedText': 'Applications restarted.',
        'm.sub': 'generative music · Web Audio API', 'm.choose': 'Choose a track',
        'm.wait': 'audio engine idle', 'm.pause': 'paused',
        'm.playing': 'playing · real-time synthesis', 'm.noaudio': 'Audio unavailable in this browser',
        'm.soundOn': 'Button sound: on', 'm.soundOff': 'Button sound: off', 'm.soundBtn': 'Button sound',
        'm.prev': 'Previous', 'm.next': 'Next', 'm.play': 'Play', 'm.pauseBtn': 'Pause',
        'm.t1': 'Neon Wave', 'm.t2': 'Night Traffic', 'm.t3': 'Star Drift', 'm.t4': 'Morning Terminal',
        'ttt.bot': '🤖 Bot', 'ttt.hard': '🧠 Unbeatable', 'ttt.pvp': '👥 2 players',
        'ttt.turn': 'Turn: ', 'ttt.thinking': 'The bot is thinking…', 'ttt.botWin': 'The bot won! 🤖',
        'ttt.win': '{0} won!', 'ttt.draw': 'Draw 🤝', 'ttt.restart': '↺ Restart', 'ttt.cell': 'Cell',
        'notes.title': 'Note title…', 'notes.body': 'Start typing… text is saved automatically',
        'notes.ready': 'Ready', 'notes.saving': 'Saving…', 'notes.saved': 'Saved {0}',
        'notes.cleared': 'Cleared', 'notes.clear': 'Clear',
        'files.newFolder': '＋ Folder', 'files.newFile': '＋ File', 'files.view': 'Switch view',
        'files.back': 'Back', 'files.fwd': 'Forward', 'files.up': 'Up one level',
        'files.empty': 'Folder is empty', 'files.rootEmpty': 'File system is empty',
        'files.space': 'used: {0}', 'files.folder': 'folder',
        'files.saved': 'Saved', 'files.close': 'Close', 'files.open': 'Open',
        'files.rename': 'Rename', 'files.download': 'Download', 'files.delete': 'Delete',
        'files.newFolderName': 'New folder', 'files.newFileName': 'new file.txt',
        'files.notFound': 'File not found', 'files.exists': 'An item with this name already exists',
        'files.noParent': 'Parent folder not found', 'files.badPath': 'Invalid path',
        'files.badName': 'Invalid name', 'files.emptyName': 'Empty name',
        'files.noItem': 'Item not found', 'files.noRoot': 'Cannot delete root',
        'files.deleteQ': 'Delete {0} <b>"{1}"</b>?<br>The action cannot be undone.',
        'files.closeQ': 'File <b>"{0}"</b> has changes.<br>Close without saving?',
        'files.cancel': 'Cancel',
        'files.count': '{0} item(s) · folders: {1} · files: {2}',
        'calc.err': 'Error',
        'cal.today': 'Today', 'cal.placeholder': 'Event title…', 'cal.empty': 'No events on this day',
        'cal.del': 'Delete', 'cal.time': 'Time', 'cal.add': 'Add',
        'cal.prev': 'Previous month', 'cal.next': 'Next month',
        'cal.dow': ['Mo','Tu','We','Th','Fr','Sa','Su'],
        'cal.weekdays': ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
        'cal.months': ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'],
        'term.banner': 'NEBULA OS', 'term.bannerSub': ' — terminal v1.0.0 · kernel 4.20.6-zen',
        'term.hint': 'Type <span class="t-acc">help</span> for the list of commands.',
        'term.helpTitle': 'Available commands:', 'term.unknown': 'Command not found:',
        'term.help': [
          ['help', 'list of commands'], ['clear', 'clear the screen'],
          ['date', 'current date and time'], ['echo &lt;text&gt;', 'print text'],
          ['theme [dark|neon|cyberpunk]', 'change the theme'], ['matrix', 'toggle the code rain'],
          ['ls [path]', 'apps or files in a directory'], ['cat &lt;file&gt;', 'show file contents'],
          ['mkdir &lt;path&gt;', 'create a folder'], ['touch &lt;path&gt;', 'create an empty file'],
          ['rm &lt;path&gt;', 'delete a file or folder'], ['open &lt;app&gt;', 'open an app'],
          ['whoami', 'who am I?'], ['neofetch', 'system info'], ['about', 'about the OS'],
        ],
        'term.tTheme': 'Current theme: {0} (dark, neon, cyberpunk)',
        'term.tUnknown': 'Unknown theme "{0}". Available: dark, neon, cyberpunk.',
        'term.matrixOn': 'Welcome to the Matrix. Press "matrix" or Esc to exit.',
        'term.matrixOff': 'Matrix disabled.',
        'term.lsDir': '— {0} item(s)', 'term.lsApps': 'Installed apps:',
        'term.noDir': 'Directory not found: {0}',
        'term.openHint': 'Specify an app: notes, files, terminal, calculator, settings, music, calendar, browser, tictactoe, wallpaper, snake, minesweeper, paint, game2048, pong, editor',
        'term.opening': 'Opening "{0}"…', 'term.notFound': 'App "{0}" not found. Type <span class="t-acc">ls</span>.',
        'term.isDir': '"{0}" is a folder, not a file.', 'term.catNo': 'Specify a file: <span class="t-acc">cat &lt;path&gt;</span>',
        'term.noFile': 'File not found: {0}', 'term.mkdirNeed': 'Specify a path: <span class="t-acc">mkdir &lt;path&gt;</span>',
        'term.mkdirOk': 'Folder created: {0}', 'term.touchNeed': 'Specify a path: <span class="t-acc">touch &lt;path&gt;</span>',
        'term.touchOk': 'File created: {0}', 'term.rmNeed': 'Specify a path: <span class="t-acc">rm &lt;path&gt;</span>',
        'term.rmOk': 'Deleted: {0}',
        'term.whoami': 'guest — a Nebula OS guest. No passwords here. <span class="t-dim">¯\\_(ツ)_/¯</span>',
        'term.about1': 'Nebula OS — an operating system in the browser.',
        'term.about2': 'Built with pure HTML, CSS and JavaScript. No external libraries.',
        'term.neofetch': ['guest@nebula','─────────────','OS: Nebula OS 1.0.0','Theme: {0}','Wallpaper: {1}','Windows open: {2}','Shell: nebula-sh 1.0','CPU: your brain @ 100%'],
        'boot.steps': ['loading kernel…', 'mounting the file system…', 'starting the graphical shell…', 'ready ✓'],
        'about.title': 'NEBULA<span>OS</span>', 'about.ver': 'Version 1.1 · build 2026.08',
        'about.desc': 'An operating system in the browser built with pure HTML, CSS and JavaScript — windows, dock, terminal and a whole universe without a single external library.',
        'about.specTests': ['Tests', 'headless suite: node .ui-test.js'],
        'about.specEngine': ['Engine', 'Pure HTML · CSS · JavaScript'],
        'about.specStorage': ['Storage', 'localStorage (survives reload)'],
        'about.specSound': ['Sound', 'Web Audio API — no audio files'],
        'about.specLook': ['Look', '{0} themes · {1} wallpapers'],
        'about.specApps': ['Apps', '{0} (including utilities)'],
        'br.home': 'New Tab', 'br.apps': 'Applications', 'br.bookmarks': 'Bookmarks',
        'br.history': 'History', 'br.vfs': 'Files', 'br.about': 'About', 'br.settings': 'Settings',
        'br.tray': 'Tray', 'br.back': 'Back', 'br.fwd': 'Forward', 'br.reload': 'Reload',
        'br.homeBtn': 'Home', 'br.bookmark': 'Add bookmark', 'br.bmOn': 'Remove bookmark',
        'br.darkOn': 'Dark page theme', 'br.darkOff': 'Light page theme',
        'br.bmPage': 'Bookmarks', 'br.hisPage': 'History',
        'br.web': '🌐 external page', 'br.vfsPage': '📁 file system', 'br.int': '◐ internal page',
        'br.err': 'Could not open the page',
        'br.homeTitle': 'Nebula <span>Browser</span>', 'br.search': 'Search the web or enter an address…',
        'br.find': 'Search', 'br.sys': 'System', 'br.quick': 'Quick links',
        'br.favApps': 'Favorite apps',
        'br.emptyBm': 'No bookmarks yet — press ☆ next to the address bar',
        'br.bmEmpty': 'No bookmarks yet', 'br.hisEmpty': 'History is empty', 'br.clearAll': 'Clear all',
        'br.404': '"{0}" not found in the virtual file system', 'br.root': '⌂ Go to root',
        'br.folder': 'folder', 'br.lines': '{0} lines · {1}', 'br.dl': '⭳ Download',
        'br.note': 'Some sites block embedding — switch to text mode:',
        'br.reader': '📄 Text mode', 'br.tab': '＋ Tab', 'br.loading': 'Loading…',
        'br.readerFail': 'Could not load the page in text mode. Check your connection.',
        'br.openTab': '↗ Open', 'br.plus': 'New Tab',
        'br.appsTitle': 'Nebula Apps', 'br.appsSub': 'click to launch',
        'br.appsFound': 'found: {0} of {1}', 'br.appsEmpty': 'Nothing found',
        'br.searchApps': 'Search apps…', 'br.svcSec': 'Services',
        'br.vol': 'Sound', 'br.net': 'Wi-Fi', 'br.connected': 'Connected', 'br.disconnected': 'Off',
        'br.volTitle': 'System tray',
        'br.volSub': 'Sound and network — like the bottom bar, but on its own page.',
        'br.test': '♪ Test sound', 'br.settingsTitle': 'Settings',
        'br.settingsSub': 'The look of Nebula OS — applies instantly and is saved.',
        'br.launch': 'Open "{0}"',
        'br.favOn': 'Remove from favorites', 'br.favOff': 'Add to favorites',
        'br.live': 'Live stats', 'br.quickTheme': 'Quick theme', 'br.specs': 'Specs',
        'br.cpu': 'CPU', 'br.store': 'Storage', 'br.avg': 'avg', 'br.max': 'max',
        'br.aboutApp': '🛰️ About app', 'br.openSettings': '🎨 Open settings',
        'br.rebootOs': '⟳ Reboot OS', 'br.sleep': '☾ Sleep mode',
        'app.snake': 'Snake', 'app.minesweeper': 'Minesweeper', 'app.paint': 'Paint',
        'app.game2048': '2048', 'app.pong': 'Pong', 'app.editor': 'Editor',
        'snake.score': 'Score', 'snake.best': 'Best', 'snake.over': 'Game over',
        'snake.new': '↺ Restart', 'snake.pause': '⏸ Pause', 'snake.resume': '▶ Resume',
        'snake.hint': 'Arrows or WASD to move · Space — pause',
        'ms.easy': 'Easy', 'ms.medium': 'Medium', 'ms.hard': 'Hard',
        'ms.mines': 'Mines', 'ms.time': 'Time', 'ms.win': 'You win! 🎉', 'ms.lose': 'Boom! 💥',
        'ms.restart': '↺ Restart', 'ms.hint': 'Left-click — reveal · Right-click — flag',
        'pt.color': 'Color', 'pt.brush': 'Brush', 'pt.eraser': 'Eraser',
        'pt.clear': 'Clear', 'pt.save': '⭳ Save PNG', 'pt.saved': 'Drawing saved',
        'pt.hint': 'Draw with the mouse or your finger',
        'g.score': 'Score', 'g.best': 'Best', 'g.new': '↺ New game', 'g.over': 'Game over',
        'g.win': 'The 2048 tile is made!', 'g.hint': 'Arrow keys or WASD',
        'p.you': 'You', 'p.bot': 'Bot', 'p.start': '▶ Play', 'p.over': 'Game over',
        'p.win': 'You win! 🏆', 'p.lose': 'The bot won 🤖', 'p.restart': '↺ Restart',
        'p.hint': 'Mouse or W/S to move the paddle',
        'ed.new': '＋ New', 'ed.open': '📂 Open…', 'ed.save': '💾 Save',
        'ed.name': 'file.txt', 'ed.saved': 'Saved: {0}',
        'ed.lines': 'lines: {0} · chars: {1}', 'ed.openTitle': 'Open from the file system',
        'ed.empty': 'No files in /home/guest', 'ed.notFound': 'File not found',
        'ed.ctrlS': 'Ctrl+S to save',
        'mb.apps': 'Apps', 'mb.system': 'System', 'mb.desktop': 'Desktop',
        'mb.about': 'About', 'mb.settings': 'Settings',
      },
      ky: {
        'app.notes': 'Эскертмелер', 'app.terminal': 'Терминал', 'app.calculator': 'Эсептегич',
        'app.settings': 'Орнотуулар', 'app.files': 'Файлдар', 'app.music': 'Музыка',
        'app.calendar': 'Календарь', 'app.browser': 'Браузер', 'app.tictactoe': 'Крестик-нолик',
        'app.wallpaper': 'Обои', 'app.about': 'Система жөнүндө',
        'cat.all': 'Баары', 'cat.office': 'Офис', 'cat.files': 'Файлдар', 'cat.dev': 'Иштеп чыгуу',
        'cat.utils': 'Куралдар', 'cat.media': 'Медиа', 'cat.internet': 'Интернет',
        'cat.system': 'Система', 'cat.games': 'Оюндар', 'cat.svc': 'Кызматтык',
        'sm.avatar': 'К',
        'sm.guest': 'Nebula конок', 'sm.station': 'Жумушчу станция · кирүү жок',
        'sm.apps': 'Колдонмолор', 'sm.reboot': '⟳ ОС-ти өчүрүп күйгүзүү',
        'sm.sys': 'Система', 'sm.wins': 'Терезелер', 'sm.theme': 'Тема', 'sm.wall': 'Обои',
        'sm.uptime': 'Иштеп турган убакыт', 'sm.ram': 'Эс',
        'w.min': 'Жыйнап коюу', 'w.max': 'Чоңойтуу', 'w.close': 'Жабуу',
        'ctx.term': 'Терминалды ачуу', 'ctx.notes': 'Эскертмелерди ачуу', 'ctx.music': 'Музыканы ачуу',
        'ctx.files': 'Файлдарды ачуу', 'ctx.browser': 'Браузерди ачуу', 'ctx.settings': 'Орнотууларды ачуу',
        'ctx.tictactoe': 'Крестик-ноликти ачуу', 'ctx.wallpaper': 'Обои ачуу',
        'ctx.nextWall': 'Кийинки обои', 'ctx.about': 'Система жөнүндө', 'ctx.reboot': 'ОС-ти өчүрүп күйгүзүү',
        'ctx.open': 'Ачуу', 'ctx.rename': 'Атын өзгөртүү', 'ctx.download': 'Жүктөп алуу', 'ctx.delete': 'Өчүрүү',
        'di.open': 'Эки басуу менен ачуу',
        'tray.wifiOn': 'Wi-Fi: туташтырылган', 'tray.wifiOff': 'Wi-Fi: өчүк', 'tray.vol': 'Үн',
        'tray.full': 'Толук экран', 'tray.fullExit': 'Толук экрандан чыгуу',
        'tray.muted': 'үн өчүк', 'tray.mute': '🔇 Үндү өчүрүү', 'tray.unmute': '🔊 Үндү күйгүзүү',
        'theme.dark': 'Түн', 'theme.darkDesc': 'Классика',
        'theme.neon': 'Неон', 'theme.neonDesc': 'Кычкыл түс',
        'theme.cyberpunk': 'Киберпанк', 'theme.cyberpunkDesc': 'Келечектин шаары',
        'theme.glass': 'Айнек', 'theme.glassDesc': 'Неондук футуризм',
        'theme.light': 'Жарык', 'theme.lightDesc': 'Күндүзгү режим',
        'wall.aurora': 'Аврора', 'wall.auroraDesc': 'Түндүк жаркырагы',
        'wall.sunset': 'Күн батуу', 'wall.sunsetDesc': 'Жылуу от',
        'wall.ocean': 'Океан', 'wall.oceanDesc': 'Тереңдик',
        'wall.mono': 'Монохром', 'wall.monoDesc': 'Минимализм',
        'wall.space': 'Космос', 'wall.spaceDesc': 'Терең космос',
        'wall.cyber': 'Киберпанк', 'wall.cyberDesc': 'Неон шаары',
        'wall.nature': 'Жаратылыш', 'wall.natureDesc': 'Токой жана тоолор',
        'wall.minimal': 'Минимализм', 'wall.minimalDesc': 'Тазалык жана тынчтык',
        'wall.mountains': 'Тоолор', 'wall.mountainsDesc': 'Тоолордо таң',
        'set.theme': 'Тема', 'set.wall': 'Иш тактанын обоилери',
        'set.reset': 'Баардык орнотууларды баштапкыга келтирүү',
        'set.resetDone': '«Түн» темасы жана «Аврора» обоилери калыбына келтирилди.',
        'set.resetDoneWo': '«Айнек» темасы жана «Космос» обоилери калыбына келтирилди.',
        'set.lang': 'Интерфейс тили',
        'wallapp.hint': 'Карточканы басыңыз — фон дароо өзгөрөт жана сакталат.',
        'nt.welcome': 'Nebula OS-ке кош келиңиз',
        'nt.welcomeText': 'Док төмөндө, иш тактада оң баскыч — меню. «Файлдарды» караңыз.',
        'nt.ready': 'Система даяр', 'nt.readyText': 'Nebula OS жүктөлдү. Иштеңиз!',
        'nt.themeApplied': '«{0}» темасы колдонулду.', 'nt.wallApplied': '«{0}» обоилери орнотулду.',
        'nt.settingsReset': 'Орнотуулар баштапкыга келтирилди',
        'nt.matrixOn': 'Матрицага кош келиңиз',
        'nt.matrixOnText': 'Чыгуу үчүн Esc басыңыз же «matrix» деп жазыңыз.',
        'nt.matrixOff': 'Код жаан-чачыны токтотулду.',
        'nt.langChanged': 'Интерфейс тили өзгөртүлдү', 'nt.langChangedText': 'Колдонмолор кайра иштетилди.',
        'm.sub': 'генеративдик музыка · Web Audio API', 'm.choose': 'Трек тандаңыз',
        'm.wait': 'аудио-движок күтүүдө', 'm.pause': 'пауза',
        'm.playing': 'ойнотулууда · реалдуу убакыттагы синтез', 'm.noaudio': 'Бул браузерде аудио жок',
        'm.soundOn': 'Баскыч үнү: күйүк', 'm.soundOff': 'Баскыч үнү: өчүк', 'm.soundBtn': 'Баскыч үнү',
        'm.prev': 'Мурунку', 'm.next': 'Кийинки', 'm.play': 'Ойнотуу', 'm.pauseBtn': 'Пауза',
        'm.t1': 'Неон толкуну', 'm.t2': 'Түнкү трафик', 'm.t3': 'Жылдыздуу дрейф', 'm.t4': 'Эртең мененки терминал',
        'ttt.bot': '🤖 Бот', 'ttt.hard': '🧠 Жеңилгис', 'ttt.pvp': '👥 2 оюнчу',
        'ttt.turn': 'Кезек: ', 'ttt.thinking': 'Бот ойлонууда…', 'ttt.botWin': 'Бот жеңди! 🤖',
        'ttt.win': '{0} жеңди!', 'ttt.draw': 'Тең чыкты 🤝', 'ttt.restart': '↺ Кайра баштоо', 'ttt.cell': 'Клетка',
        'notes.title': 'Эскертменин аталышы…', 'notes.body': 'Жазууну баштаңыз… текст автоматтык түрдө сакталат',
        'notes.ready': 'Даяр', 'notes.saving': 'Сакталууда…', 'notes.saved': '{0} сакталды',
        'notes.cleared': 'Тазаланды', 'notes.clear': 'Тазалоо',
        'files.newFolder': '＋ Папка', 'files.newFile': '＋ Файл', 'files.view': 'Көрүнүшүн өзгөртүү',
        'files.back': 'Артка', 'files.fwd': 'Алга', 'files.up': 'Бир деңгээл жогору',
        'files.empty': 'Папка бош', 'files.rootEmpty': 'Файл системасы бош',
        'files.space': 'колдонулган: {0}', 'files.folder': 'папка',
        'files.saved': 'Сакталды', 'files.close': 'Жабуу', 'files.open': 'Ачуу',
        'files.rename': 'Атын өзгөртүү', 'files.download': 'Жүктөп алуу', 'files.delete': 'Өчүрүү',
        'files.newFolderName': 'Жаңы папка', 'files.newFileName': 'жаңы файл.txt',
        'files.notFound': 'Файл табылган жок', 'files.exists': 'Мындай ат менен элемент бар',
        'files.noParent': 'Ата-эне папкасы табылган жок', 'files.badPath': 'Туура эмес жол',
        'files.badName': 'Туура эмес ат', 'files.emptyName': 'Бош ат',
        'files.noItem': 'Элемент табылган жок', 'files.noRoot': 'Тамырды өчүрүүгө болбойт',
        'files.deleteQ': '{0} <b>«{1}»</b> өчүрүлөбү?<br>Бул аракетти кайтарып болбойт.',
        'files.closeQ': '<b>«{0}»</b> файлы өзгөртүлгөн.<br>Сактабай жабуу керекпи?',
        'files.cancel': 'Жокко чыгаруу',
        'files.count': '{0} элемент · папка: {1} · файл: {2}',
        'calc.err': 'Ката',
        'cal.today': 'Бүгүн', 'cal.placeholder': 'Окуянын аталышы…', 'cal.empty': 'Бул күнү окуя жок',
        'cal.del': 'Өчүрүү', 'cal.time': 'Убакыт', 'cal.add': 'Кошуу',
        'cal.prev': 'Мурунку ай', 'cal.next': 'Кийинки ай',
        'cal.dow': ['Дш','Шш','Шр','Бш','Жм','Иш','Жк'],
        'cal.weekdays': ['жк','дш','шш','шр','бш','жм','иш'],
        'cal.months': ['Январь','Февраль','Март','Апрель','Май','Июнь',
                       'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
        'term.banner': 'NEBULA OS', 'term.bannerSub': ' — терминал v1.0.0 · ядро 4.20.6-zen',
        'term.hint': 'Командалардын тизмеси үчүн <span class="t-acc">help</span> деп жазыңыз.',
        'term.helpTitle': 'Жеткиликтүү командалар:', 'term.unknown': 'Команда табылган жок:',
        'term.help': [
          ['help', 'командалар тизмеси'], ['clear', 'экранды тазалоо'],
          ['date', 'учурдагы дата жана убакыт'], ['echo &lt;текст&gt;', 'текст чыгаруу'],
          ['theme [dark|neon|cyberpunk]', 'теманы өзгөртүү'], ['matrix', 'код жаанын күйгүзүү/өчүрүү'],
          ['ls [жол]', 'каталогдогу колдонмолор же файлдар'], ['cat &lt;файл&gt;', 'файлдын мазмунун көрсөтүү'],
          ['mkdir &lt;жол&gt;', 'папка түзүү'], ['touch &lt;жол&gt;', 'бош файл түзүү'],
          ['rm &lt;жол&gt;', 'файлды же папканы өчүрүү'], ['open &lt;колдонмо&gt;', 'колдонмону ачуу'],
          ['whoami', 'мен киммин?'], ['neofetch', 'система жөнүндө маалымат'], ['about', 'система жөнүндө'],
        ],
        'term.tTheme': 'Учурдагы тема: {0} (dark, neon, cyberpunk)',
        'term.tUnknown': '«{0}» темасы белгисиз. Жеткиликтүү: dark, neon, cyberpunk.',
        'term.matrixOn': 'Матрицага кош келиңиз. Чыгуу үчүн «matrix» же Esc басыңыз.',
        'term.matrixOff': 'Матрица өчүрүлдү.',
        'term.lsDir': '— {0} элемент', 'term.lsApps': 'Орнотулган колдонмолор:',
        'term.noDir': 'Каталог табылган жок: {0}',
        'term.openHint': 'Колдонмону көрсөтүңүз: notes, files, terminal, calculator, settings, music, calendar, browser, tictactoe, wallpaper, snake, minesweeper, paint, game2048, pong, editor',
        'term.opening': '«{0}» ачылууда…', 'term.notFound': '«{0}» колдонмосу табылган жок. <span class="t-acc">ls</span> деп жазыңыз.',
        'term.isDir': '«{0}» — папка, файл эмес.', 'term.catNo': 'Файлды көрсөтүңүз: <span class="t-acc">cat &lt;жол&gt;</span>',
        'term.noFile': 'Файл табылган жок: {0}', 'term.mkdirNeed': 'Жолду көрсөтүңүз: <span class="t-acc">mkdir &lt;жол&gt;</span>',
        'term.mkdirOk': 'Папка түзүлдү: {0}', 'term.touchNeed': 'Жолду көрсөтүңүз: <span class="t-acc">touch &lt;жол&gt;</span>',
        'term.touchOk': 'Файл түзүлдү: {0}', 'term.rmNeed': 'Жолду көрсөтүңүз: <span class="t-acc">rm &lt;жол&gt;</span>',
        'term.rmOk': 'Өчүрүлдү: {0}',
        'term.whoami': 'guest — Nebula OS коногу. Бул жерде сырсөз жок. <span class="t-dim">¯\\_(ツ)_/¯</span>',
        'term.about1': 'Nebula OS — браузердеги операциялык система.',
        'term.about2': 'Таза HTML, CSS жана JavaScript менен курулган. Эч бир сырткы китепкана жок.',
        'term.neofetch': ['guest@nebula','─────────────','ОС: Nebula OS 1.0.0','Тема: {0}','Обои: {1}','Терезелер ачык: {2}','Shell: nebula-sh 1.0','CPU: сиздин мээңиз @ 100%'],
        'boot.steps': ['ядро жүктөлүүдө…', 'файл системасы орнотулууда…', 'графикалык кабык иштетилүүдө…', 'даяр ✓'],
        'about.title': 'NEBULA<span>OS</span>', 'about.ver': 'Версия 1.1 · курулуш 2026.08',
        'about.desc': 'Браузердеги операциялык система — таза HTML, CSS жана JavaScript менен, эч бир сырткы китепканасыз. Терезелер, док, терминал жана бүтүндөй аалам.',
        'about.specTests': ['Тесттер', 'headless сьют: node .ui-test.js'],
        'about.specEngine': ['Кыймылдаткыч', 'Таза HTML · CSS · JavaScript'],
        'about.specStorage': ['Сактагыч', 'localStorage (кайра жүктөөдөн сакталат)'],
        'about.specSound': ['Үн', 'Web Audio API — аудиофайлдар жок'],
        'about.specLook': ['Көрүнүш', '{0} тема · {1} обои'],
        'about.specApps': ['Колдонмолор', '{0} (кызматтыктар менен)'],
        'br.home': 'Жаңы барак', 'br.apps': 'Колдонмолор', 'br.bookmarks': 'Баракчалар',
        'br.history': 'Тарых', 'br.vfs': 'Файлдар', 'br.about': 'Система жөнүндө', 'br.settings': 'Орнотуулар',
        'br.tray': 'Трей', 'br.back': 'Артка', 'br.fwd': 'Алга', 'br.reload': 'Жаңыртуу',
        'br.homeBtn': 'Башкы', 'br.bookmark': 'Баракчаларга кошуу', 'br.bmOn': 'Баракчалардан өчүрүү',
        'br.darkOn': 'Барактын караңгы темасы', 'br.darkOff': 'Барактын жарык темасы',
        'br.bmPage': 'Баракчалар', 'br.hisPage': 'Тарых',
        'br.web': '🌐 тышкы барак', 'br.vfsPage': '📁 файл системасы', 'br.int': '◐ ички барак',
        'br.err': 'Баракты ачуу мүмкүн эмес',
        'br.homeTitle': 'Nebula <span>Browser</span>', 'br.search': 'Интернеттен издөө же дарек жазыңыз…',
        'br.find': 'Табуу', 'br.sys': 'Система', 'br.quick': 'Ыкчам шилтемелер',
        'br.favApps': 'Тандалган колдонмолор',
        'br.emptyBm': 'Азырынча баракчалар жок — дарек тилкесиндеги ☆ басыңыз',
        'br.bmEmpty': 'Баракчалар жок', 'br.hisEmpty': 'Тарых бош', 'br.clearAll': 'Баарын тазалоо',
        'br.404': '«{0}» виртуалдык файл системасынан табылган жок', 'br.root': '⌂ Тамырга өтүү',
        'br.folder': 'папка', 'br.lines': '{0} сап · {1}', 'br.dl': '⭳ Жүктөп алуу',
        'br.note': 'Кээ бир сайттар кошууга уруксат бербейт — текст режимин күйгүзүңүз:',
        'br.reader': '📄 Текст режими', 'br.tab': '＋ Барак', 'br.loading': 'Жүктөлүүдө…',
        'br.readerFail': 'Баракты текст режиминде жүктөө мүмкүн эмес. Туташууну текшериңиз.',
        'br.openTab': '↗ Ачуу', 'br.plus': 'Жаңы барак',
        'br.appsTitle': 'Nebula колдонмолору', 'br.appsSub': 'басып иштетүү',
        'br.appsFound': 'табылды: {0} / {1}', 'br.appsEmpty': 'Эч нерсе табылган жок',
        'br.searchApps': 'Колдонмолорду издөө…', 'br.svcSec': 'Кызматтык',
        'br.vol': 'Үн', 'br.net': 'Wi-Fi', 'br.connected': 'Туташтырылган', 'br.disconnected': 'Өчүк',
        'br.volTitle': 'Системалык трей',
        'br.volSub': 'Үн жана тармак — ылдыйкы панелдегидей, бирок өз баракта.',
        'br.test': '♪ Үн тести', 'br.settingsTitle': 'Орнотуулар',
        'br.settingsSub': 'Nebula OSтун көрүнүшү — дароо колдонулат жана сакталат.',
        'br.launch': '«{0}» ачуу',
        'br.favOn': 'Тандалгандардан өчүрүү', 'br.favOff': 'Тандалгандарга кошуу',
        'br.live': 'Жандуу статистика', 'br.quickTheme': 'Ыкчам тема', 'br.specs': 'Мүнөздөмөлөр',
        'br.cpu': 'CPU', 'br.store': 'Сактагыч', 'br.avg': 'орточо', 'br.max': 'макс',
        'br.aboutApp': '🛰️ «Система жөнүндө» колдонмосу', 'br.openSettings': '🎨 Орнотууларды ачуу',
        'br.rebootOs': '⟳ ОС-ти өчүрүп күйгүзүү', 'br.sleep': '☾ Уйку режими',
        'app.snake': 'Жылан', 'app.minesweeper': 'Мина талаасы', 'app.paint': 'Сүрөт тартуу',
        'app.game2048': '2048', 'app.pong': 'Понг', 'app.editor': 'Редактор',
        'snake.score': 'Эсеп', 'snake.best': 'Рекорд', 'snake.over': 'Оюн бүттү',
        'snake.new': '↺ Кайра', 'snake.pause': '⏸ Пауза', 'snake.resume': '▶ Улантуу',
        'snake.hint': 'Башкаруу: жебелер же WASD · боштук — пауза',
        'ms.easy': 'Жеңил', 'ms.medium': 'Орточо', 'ms.hard': 'Кыйын',
        'ms.mines': 'Миналар', 'ms.time': 'Убакыт', 'ms.win': 'Жеңиш! 🎉', 'ms.lose': 'Бум! 💥',
        'ms.restart': '↺ Кайра', 'ms.hint': 'Сол баскыч — ачуу · оң баскыч — желеги',
        'pt.color': 'Түс', 'pt.brush': 'Щётка', 'pt.eraser': 'Өчүргүч',
        'pt.clear': 'Тазалоо', 'pt.save': '⭳ PNG сактоо', 'pt.saved': 'Сүрөт сакталды',
        'pt.hint': 'Чычкан же манжа менен тартыңыз',
        'g.score': 'Эсеп', 'g.best': 'Рекорд', 'g.new': '↺ Жаңы оюн', 'g.over': 'Оюн бүттү',
        'g.win': '2048 плиткасы чогултулду!', 'g.hint': 'Жебелер же WASD',
        'p.you': 'Сиз', 'p.bot': 'Бот', 'p.start': '▶ Ойноо', 'p.over': 'Оюн бүттү',
        'p.win': 'Сиз жеңдиңиз! 🏆', 'p.lose': 'Бот жеңди 🤖', 'p.restart': '↺ Кайра',
        'p.hint': 'Чычкан же W/S — ракетканы кыймылдатыңыз',
        'ed.new': '＋ Жаңы', 'ed.open': '📂 Ачуу…', 'ed.save': '💾 Сактоо',
        'ed.name': 'файл.txt', 'ed.saved': 'Сакталды: {0}',
        'ed.lines': 'саптар: {0} · белгилер: {1}', 'ed.openTitle': 'Файл системасынан ачуу',
        'ed.empty': '/home/guest папкасында файл жок', 'ed.notFound': 'Файл табылган жок',
        'ed.ctrlS': 'Ctrl+S — сактоо',
        'mb.apps': 'Колдонмолор', 'mb.system': 'Система', 'mb.desktop': 'Иш столу',
        'mb.about': 'Система жөнүндө', 'mb.settings': 'Орнотуулар',
      },
      zh: {
        'app.notes': '记事本', 'app.terminal': '终端', 'app.calculator': '计算器',
        'app.settings': '设置', 'app.files': '文件', 'app.music': '音乐',
        'app.calendar': '日历', 'app.browser': '浏览器', 'app.tictactoe': '井字棋',
        'app.wallpaper': '壁纸', 'app.about': '关于系统',
        'cat.all': '全部', 'cat.office': '办公', 'cat.files': '文件', 'cat.dev': '开发',
        'cat.utils': '工具', 'cat.media': '媒体', 'cat.internet': '网络',
        'cat.system': '系统', 'cat.games': '游戏', 'cat.svc': '服务',
        'sm.avatar': '客',
        'sm.guest': 'Nebula 访客', 'sm.station': '工作站 · 无需登录',
        'sm.apps': '应用程序', 'sm.reboot': '⟳ 重启系统',
        'sm.sys': '系统', 'sm.wins': '窗口', 'sm.theme': '主题', 'sm.wall': '壁纸',
        'sm.uptime': '运行时间', 'sm.ram': '内存',
        'w.min': '最小化', 'w.max': '最大化', 'w.close': '关闭',
        'ctx.term': '打开终端', 'ctx.notes': '打开记事本', 'ctx.music': '打开音乐',
        'ctx.files': '打开文件', 'ctx.browser': '打开浏览器', 'ctx.settings': '打开设置',
        'ctx.tictactoe': '打开井字棋', 'ctx.wallpaper': '打开壁纸',
        'ctx.nextWall': '下一张壁纸', 'ctx.about': '关于系统', 'ctx.reboot': '重启系统',
        'ctx.open': '打开', 'ctx.rename': '重命名', 'ctx.download': '下载', 'ctx.delete': '删除',
        'di.open': '双击打开',
        'tray.wifiOn': 'Wi-Fi：已连接', 'tray.wifiOff': 'Wi-Fi：已关闭', 'tray.vol': '音量',
        'tray.full': '全屏', 'tray.fullExit': '退出全屏',
        'tray.muted': '声音已关闭', 'tray.mute': '🔇 静音', 'tray.unmute': '🔊 取消静音',
        'theme.dark': '夜晚', 'theme.darkDesc': '经典',
        'theme.neon': '霓虹', 'theme.neonDesc': '荧光色',
        'theme.cyberpunk': '赛博朋克', 'theme.cyberpunkDesc': '未来都市',
        'theme.glass': '玻璃', 'theme.glassDesc': '霓虹未来主义',
        'theme.light': '浅色', 'theme.lightDesc': '日间模式',
        'wall.aurora': '极光', 'wall.auroraDesc': '北极光',
        'wall.sunset': '日落', 'wall.sunsetDesc': '温暖火焰',
        'wall.ocean': '海洋', 'wall.oceanDesc': '深海',
        'wall.mono': '单色', 'wall.monoDesc': '极简',
        'wall.space': '太空', 'wall.spaceDesc': '深空',
        'wall.cyber': '赛博朋克', 'wall.cyberDesc': '霓虹之城',
        'wall.nature': '自然', 'wall.natureDesc': '森林与群山',
        'wall.minimal': '极简', 'wall.minimalDesc': '简洁宁静',
        'wall.mountains': '群山', 'wall.mountainsDesc': '山间黎明',
        'set.theme': '主题', 'set.wall': '桌面壁纸',
        'set.reset': '重置所有设置',
        'set.resetDone': '已恢复「夜晚」主题和「极光」壁纸。',
        'set.resetDoneWo': '已恢复「玻璃」主题和「太空」壁纸。',
        'set.lang': '界面语言',
        'wallapp.hint': '点击卡片 — 背景立即更换并保存。',
        'nt.welcome': '欢迎使用 Nebula OS',
        'nt.welcomeText': '底部是任务栏，右键桌面打开菜单。去看看「文件」吧。',
        'nt.ready': '系统就绪', 'nt.readyText': 'Nebula OS 已加载。祝使用愉快！',
        'nt.themeApplied': '已应用主题「{0}」。', 'nt.wallApplied': '已设置壁纸「{0}」。',
        'nt.settingsReset': '设置已重置',
        'nt.matrixOn': '欢迎来到矩阵',
        'nt.matrixOnText': '按 Esc 或输入 "matrix" 退出。',
        'nt.matrixOff': '代码雨已停止。',
        'nt.langChanged': '界面语言已更改', 'nt.langChangedText': '应用程序已重新启动。',
        'm.sub': '生成式音乐 · Web Audio API', 'm.choose': '选择曲目',
        'm.wait': '音频引擎待机中', 'm.pause': '已暂停',
        'm.playing': '播放中 · 实时合成', 'm.noaudio': '此浏览器不支持音频',
        'm.soundOn': '按钮音效：开', 'm.soundOff': '按钮音效：关', 'm.soundBtn': '按钮音效',
        'm.prev': '上一首', 'm.next': '下一首', 'm.play': '播放', 'm.pauseBtn': '暂停',
        'm.t1': '霓虹浪潮', 'm.t2': '夜间车流', 'm.t3': '星海漂流', 'm.t4': '清晨终端',
        'ttt.bot': '🤖 机器人', 'ttt.hard': '🧠 无敌', 'ttt.pvp': '👥 双人',
        'ttt.turn': '轮到：', 'ttt.thinking': '机器人在思考…', 'ttt.botWin': '机器人获胜！🤖',
        'ttt.win': '{0} 获胜！', 'ttt.draw': '平局 🤝', 'ttt.restart': '↺ 重新开始', 'ttt.cell': '格',
        'notes.title': '笔记标题…', 'notes.body': '开始输入… 文本自动保存',
        'notes.ready': '就绪', 'notes.saving': '保存中…', 'notes.saved': '已保存 {0}',
        'notes.cleared': '已清空', 'notes.clear': '清空',
        'files.newFolder': '＋ 文件夹', 'files.newFile': '＋ 文件', 'files.view': '切换视图',
        'files.back': '后退', 'files.fwd': '前进', 'files.up': '上一级',
        'files.empty': '文件夹为空', 'files.rootEmpty': '文件系统为空',
        'files.space': '已用：{0}', 'files.folder': '文件夹',
        'files.saved': '已保存', 'files.close': '关闭', 'files.open': '打开',
        'files.rename': '重命名', 'files.download': '下载', 'files.delete': '删除',
        'files.newFolderName': '新建文件夹', 'files.newFileName': '新文件.txt',
        'files.notFound': '未找到文件', 'files.exists': '已存在同名项目',
        'files.noParent': '未找到父文件夹', 'files.badPath': '无效路径',
        'files.badName': '无效名称', 'files.emptyName': '名称为空',
        'files.noItem': '未找到项目', 'files.noRoot': '不能删除根目录',
        'files.deleteQ': '删除{0} <b>「{1}」</b>？<br>此操作无法撤销。',
        'files.closeQ': '文件 <b>「{0}」</b> 已修改。<br>不保存就关闭？',
        'files.cancel': '取消',
        'files.count': '共 {0} 项 · 文件夹：{1} · 文件：{2}',
        'calc.err': '错误',
        'cal.today': '今天', 'cal.placeholder': '事件名称…', 'cal.empty': '这一天没有事件',
        'cal.del': '删除', 'cal.time': '时间', 'cal.add': '添加',
        'cal.prev': '上个月', 'cal.next': '下个月',
        'cal.dow': ['一','二','三','四','五','六','日'],
        'cal.weekdays': ['日','一','二','三','四','五','六'],
        'cal.months': ['一月','二月','三月','四月','五月','六月',
                       '七月','八月','九月','十月','十一月','十二月'],
        'term.banner': 'NEBULA OS', 'term.bannerSub': ' — 终端 v1.0.0 · 内核 4.20.6-zen',
        'term.hint': '输入 <span class="t-acc">help</span> 查看命令列表。',
        'term.helpTitle': '可用命令：', 'term.unknown': '未找到命令：',
        'term.help': [
          ['help', '命令列表'], ['clear', '清屏'],
          ['date', '当前日期和时间'], ['echo &lt;文本&gt;', '输出文本'],
          ['theme [dark|neon|cyberpunk]', '更换主题'], ['matrix', '开启/关闭代码雨'],
          ['ls [路径]', '目录中的应用或文件'], ['cat &lt;文件&gt;', '显示文件内容'],
          ['mkdir &lt;路径&gt;', '创建文件夹'], ['touch &lt;路径&gt;', '创建空文件'],
          ['rm &lt;路径&gt;', '删除文件或文件夹'], ['open &lt;应用&gt;', '打开应用'],
          ['whoami', '我是谁？'], ['neofetch', '系统信息'], ['about', '关于系统'],
        ],
        'term.tTheme': '当前主题：{0}（dark, neon, cyberpunk）',
        'term.tUnknown': '未知主题「{0}」。可用：dark, neon, cyberpunk。',
        'term.matrixOn': '欢迎来到矩阵。按「matrix」或 Esc 退出。',
        'term.matrixOff': '矩阵已关闭。',
        'term.lsDir': '— {0} 个项目', 'term.lsApps': '已安装的应用：',
        'term.noDir': '未找到目录：{0}',
        'term.openHint': '请指定应用：notes, files, terminal, calculator, settings, music, calendar, browser, tictactoe, wallpaper, snake, minesweeper, paint, game2048, pong, editor',
        'term.opening': '正在打开「{0}」…', 'term.notFound': '未找到应用「{0}」。请输入 <span class="t-acc">ls</span>。',
        'term.isDir': '「{0}」是文件夹，不是文件。', 'term.catNo': '请指定文件：<span class="t-acc">cat &lt;路径&gt;</span>',
        'term.noFile': '未找到文件：{0}', 'term.mkdirNeed': '请指定路径：<span class="t-acc">mkdir &lt;路径&gt;</span>',
        'term.mkdirOk': '文件夹已创建：{0}', 'term.touchNeed': '请指定路径：<span class="t-acc">touch &lt;路径&gt;</span>',
        'term.touchOk': '文件已创建：{0}', 'term.rmNeed': '请指定路径：<span class="t-acc">rm &lt;路径&gt;</span>',
        'term.rmOk': '已删除：{0}',
        'term.whoami': 'guest — Nebula OS 访客。这里没有密码。<span class="t-dim">¯\\_(ツ)_/¯</span>',
        'term.about1': 'Nebula OS — 浏览器中的操作系统。',
        'term.about2': '用纯 HTML、CSS 和 JavaScript 构建，没有任何外部库。',
        'term.neofetch': ['guest@nebula','─────────────','系统：Nebula OS 1.0.0','主题：{0}','壁纸：{1}','打开窗口：{2}','Shell: nebula-sh 1.0','CPU：你的大脑 @ 100%'],
        'boot.steps': ['正在加载内核…', '正在挂载文件系统…', '正在启动图形界面…', '就绪 ✓'],
        'about.title': 'NEBULA<span>OS</span>', 'about.ver': '版本 1.1 · 构建 2026.08',
        'about.desc': '浏览器中的操作系统，用纯 HTML、CSS 和 JavaScript 构建 — 窗口、任务栏、终端和整个宇宙，无需任何外部库。',
        'about.specTests': ['测试', '无头套件：node .ui-test.js'],
        'about.specEngine': ['引擎', '纯 HTML · CSS · JavaScript'],
        'about.specStorage': ['存储', 'localStorage（刷新后保留）'],
        'about.specSound': ['声音', 'Web Audio API — 无音频文件'],
        'about.specLook': ['外观', '{0} 个主题 · {1} 张壁纸'],
        'about.specApps': ['应用', '{0}（含服务类）'],
        'br.home': '新标签页', 'br.apps': '应用程序', 'br.bookmarks': '书签',
        'br.history': '历史记录', 'br.vfs': '文件', 'br.about': '关于系统', 'br.settings': '设置',
        'br.tray': '托盘', 'br.back': '后退', 'br.fwd': '前进', 'br.reload': '刷新',
        'br.homeBtn': '主页', 'br.bookmark': '加入书签', 'br.bmOn': '移除书签',
        'br.darkOn': '页面深色主题', 'br.darkOff': '页面浅色主题',
        'br.bmPage': '书签', 'br.hisPage': '历史记录',
        'br.web': '🌐 外部网页', 'br.vfsPage': '📁 文件系统', 'br.int': '◐ 内部页面',
        'br.err': '无法打开页面',
        'br.homeTitle': 'Nebula <span>浏览器</span>', 'br.search': '搜索网络或输入地址…',
        'br.find': '搜索', 'br.sys': '系统', 'br.quick': '快捷链接',
        'br.favApps': '常用应用',
        'br.emptyBm': '暂无书签 — 点击地址栏旁的 ☆',
        'br.bmEmpty': '暂无书签', 'br.hisEmpty': '暂无历史记录', 'br.clearAll': '全部清除',
        'br.404': '在虚拟文件系统中未找到「{0}」', 'br.root': '⌂ 返回根目录',
        'br.folder': '文件夹', 'br.lines': '{0} 行 · {1}', 'br.dl': '⭳ 下载',
        'br.note': '部分网站禁止嵌入 — 请切换到文本模式：',
        'br.reader': '📄 文本模式', 'br.tab': '＋ 标签页', 'br.loading': '加载中…',
        'br.readerFail': '无法以文本模式加载页面。请检查网络连接。',
        'br.openTab': '↗ 打开', 'br.plus': '新标签页',
        'br.appsTitle': 'Nebula 应用', 'br.appsSub': '点击启动',
        'br.appsFound': '找到：{0} / {1}', 'br.appsEmpty': '未找到结果',
        'br.searchApps': '搜索应用…', 'br.svcSec': '服务',
        'br.vol': '声音', 'br.net': 'Wi-Fi', 'br.connected': '已连接', 'br.disconnected': '已关闭',
        'br.volTitle': '系统托盘',
        'br.volSub': '声音与网络 — 与底部栏相同，但独立成页。',
        'br.test': '♪ 测试声音', 'br.settingsTitle': '设置',
        'br.settingsSub': 'Nebula OS 的外观 — 即时生效并保存。',
        'br.launch': '打开「{0}」',
        'br.favOn': '移出常用', 'br.favOff': '加入常用',
        'br.live': '实时统计', 'br.quickTheme': '快速主题', 'br.specs': '规格',
        'br.cpu': 'CPU', 'br.store': '存储', 'br.avg': '平均', 'br.max': '最大',
        'br.aboutApp': '🛰️ 「关于系统」应用', 'br.openSettings': '🎨 打开设置',
        'br.rebootOs': '⟳ 重启系统', 'br.sleep': '☾ 睡眠模式',
        'app.snake': '贪吃蛇', 'app.minesweeper': '扫雷', 'app.paint': '画图',
        'app.game2048': '2048', 'app.pong': '乒乓球', 'app.editor': '编辑器',
        'snake.score': '得分', 'snake.best': '最佳', 'snake.over': '游戏结束',
        'snake.new': '↺ 重新开始', 'snake.pause': '⏸ 暂停', 'snake.resume': '▶ 继续',
        'snake.hint': '方向键或 WASD 移动 · 空格 — 暂停',
        'ms.easy': '简单', 'ms.medium': '中等', 'ms.hard': '困难',
        'ms.mines': '地雷', 'ms.time': '时间', 'ms.win': '你赢了！🎉', 'ms.lose': '爆炸！💥',
        'ms.restart': '↺ 重新开始', 'ms.hint': '左键 — 翻开 · 右键 — 插旗',
        'pt.color': '颜色', 'pt.brush': '画笔', 'pt.eraser': '橡皮擦',
        'pt.clear': '清空', 'pt.save': '⭳ 保存 PNG', 'pt.saved': '图画已保存',
        'pt.hint': '用鼠标或手指绘制',
        'g.score': '得分', 'g.best': '最佳', 'g.new': '↺ 新游戏', 'g.over': '游戏结束',
        'g.win': '已合成 2048 方块！', 'g.hint': '方向键或 WASD',
        'p.you': '你', 'p.bot': '机器人', 'p.start': '▶ 开始', 'p.over': '游戏结束',
        'p.win': '你赢了！🏆', 'p.lose': '机器人获胜 🤖', 'p.restart': '↺ 重新开始',
        'p.hint': '鼠标或 W/S 移动球拍',
        'ed.new': '＋ 新建', 'ed.open': '📂 打开…', 'ed.save': '💾 保存',
        'ed.name': '文件.txt', 'ed.saved': '已保存：{0}',
        'ed.lines': '行数：{0} · 字符：{1}', 'ed.openTitle': '从文件系统打开',
        'ed.empty': '/home/guest 中没有文件', 'ed.notFound': '未找到文件',
        'ed.ctrlS': 'Ctrl+S 保存',
        'mb.apps': '应用程序', 'mb.system': '系统', 'mb.desktop': '桌面',
        'mb.about': '关于系统', 'mb.settings': '设置',
      },
    },

    setLang(l) {
      if (!this.dict[l]) return false;
      this.lang = l;
      Store.set('nebula.lang', l);
      document.documentElement.lang = l;
      return true;
    },

    // Строка на текущем языке; значения-массивы возвращаются как есть
    t(key) {
      const d = this.dict[this.lang] || this.dict.ru;
      if (key in d) return d[key];
      return this.dict.ru[key] !== undefined ? this.dict.ru[key] : key;
    },
  };

  const t = (key) => I18N.t(key);
  // Форматирование: tf('nt.themeApplied', 'Ночь') → «Применена тема „Ночь“.»
  // Массивы (списки месяцев, help и т.п.) возвращаются как есть.
  const tf = (key, ...args) => {
    const v = t(key);
    if (Array.isArray(v)) return v;
    return String(v).replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m));
  };

  // Смена языка на лету: пересобираем док/иконки/меню «Пуск», обновляем
  // заголовки окон и переоткрываем приложения, чтобы их содержимое тоже сменило язык.
  function applyLang(l) {
    if (!I18N.setLang(l)) return false;
    Dock.rebuild();
    DesktopIcons.rebuild();
    StartMenu.build();
    MenuBar.build();
    MenuBar.setApp(WM.active ? WM.active.dataset.app : null);
    WM.windows.forEach(win => {
      const ttl = win.querySelector('.win-title span:last-child');
      if (ttl) ttl.textContent = t('app.' + win.dataset.app);
      win.querySelectorAll('.win-ctl').forEach(b => {
        if (b.classList.contains('min')) b.title = t('w.min');
        else if (b.classList.contains('max')) b.title = t('w.max');
        else b.title = t('w.close');
      });
    });
    const open = [...WM.windows.keys()];
    open.forEach(id => WM.close(WM.windows.get(id)));
    open.forEach(id => WM.open(id));
    Tray.refresh();
    notifySystem({ icon: '🌐', title: t('nt.langChanged'), text: t('nt.langChangedText') });
    return true;
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
    { id: 'space',  name: 'Космос',    desc: 'Глубокий космос', preview: 'linear-gradient(165deg,#01010a,#0a0e2a 45%,#3b2a6b)' },
    { id: 'cyber',  name: 'Киберпанк', desc: 'Неоновый город',  preview: 'linear-gradient(160deg,#12071f,#3b0a45 40%,#ff2d78)' },
    { id: 'nature', name: 'Природа',   desc: 'Лес и горы',      preview: 'linear-gradient(170deg,#03140c,#0b2f1d 45%,#2f855a)' },
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
      WallFx.apply(id);
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
      const hues = { aurora: 262, sunset: 18, ocean: 205, mono: 220, space: 265, cyber: 320, nature: 140 };
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

  /* ───────────────────────── Живые эффекты обоев ───────────────────────── */
  // Слой .wallpaper-fx наполняется частицами под каждый фон:
  //   Космос — мерцающие звёзды, Киберпанк — неоновая сетка/орбы/проблеск,
  //   Природа — дрейфующие листья. Стили — в style.css, позиции случайные.
  const WallFx = {
    el: null,

    init() {
      this.el = document.createElement('div');
      this.el.className = 'wallpaper-fx';
      document.getElementById('desktop').appendChild(this.el);
      this.apply(Settings.wallpaper);
    },

    apply(id) {
      if (!this.el) return;
      this.el.innerHTML = '';
      this.el.dataset.wall = id;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const add = (cls, style) => {
        const i = document.createElement('i');
        i.className = cls;
        if (style) for (const k in style) i.style[k] = style[k];
        this.el.appendChild(i);
        return i;
      };

      if (id === 'space') {
        // Мерцающие звёзды: случайный размер, период и задержка мерцания
        for (let n = 0; n < 64; n++) {
          const size = rnd(1.5, 3.4);
          add('fx-star', {
            left: rnd(0, 100) + '%',
            top: rnd(0, 100) + '%',
            width: size + 'px',
            height: size + 'px',
            '--d': rnd(2, 5.5).toFixed(2) + 's',
            '--delay': rnd(0, 5).toFixed(2) + 's',
          });
        }
      } else if (id === 'cyber') {
        // Убегающая неоновая сетка внизу + проблеск света + пульсирующие орбы
        add('fx-grid', {});
        add('fx-sweep', { '--delay': rnd(0, 8).toFixed(2) + 's' });
        const colors = ['rgba(255,45,149,.5)', 'rgba(23,233,255,.45)', 'rgba(255,176,32,.4)'];
        for (let n = 0; n < 3; n++) {
          const size = rnd(26, 44);
          add('fx-orb', {
            left: rnd(8, 82) + '%',
            top: rnd(10, 70) + '%',
            width: size + 'vmax',
            height: size + 'vmax',
            background: 'radial-gradient(circle, ' + colors[n] + ', transparent 70%)',
            '--d': rnd(4, 8).toFixed(2) + 's',
            '--delay': rnd(0, 4).toFixed(2) + 's',
          });
        }
      } else if (id === 'nature') {
        // Листья медленно падают с лёгким покачиванием + мягкие зелёные пятна
        for (let n = 0; n < 16; n++) {
          const size = rnd(7, 13);
          add('fx-leaf', {
            left: rnd(0, 100) + '%',
            width: size + 'px',
            height: size + 'px',
            '--d': rnd(9, 18).toFixed(1) + 's',
            '--delay': rnd(0, 14).toFixed(1) + 's',
            '--sway': Math.round(rnd(-34, 34)) + 'px',
          });
        }
        const glows = ['rgba(74,222,128,.4)', 'rgba(45,212,191,.35)'];
        for (let n = 0; n < 2; n++) {
          const size = rnd(30, 42);
          add('fx-orb', {
            left: rnd(15, 75) + '%',
            top: rnd(20, 65) + '%',
            width: size + 'vmax',
            height: size + 'vmax',
            background: 'radial-gradient(circle, ' + glows[n] + ', transparent 70%)',
            '--d': rnd(6, 10).toFixed(2) + 's',
            '--delay': rnd(0, 5).toFixed(2) + 's',
          });
        }
      }
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
      const topBase = 42; // не наезжаем на верхнюю панель меню
      const maxLeft = Math.max(base, window.innerWidth - width - 24);
      const maxTop = Math.max(topBase, window.innerHeight - this.dockHeight() - height - 24);

      // Два прохода: сначала редкая сетка (40px), затем более точная (20px),
      // чтобы поймать свободные места, не выровненные по шагу.
      for (const step of [40, 20]) {
        for (let y = topBase; y <= maxTop; y += step) {
          for (let x = base; x <= maxLeft; x += step) {
            if (!collides(x, y, width, height)) return { left: x, top: y };
          }
        }
      }
      // Места не осталось — каскадный фолбэк
      const n = (this.seed++) % 5;
      return {
        left: Math.min(base + n * 40, maxLeft),
        top: Math.min(topBase + n * 40, maxTop),
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
          <div class="win-controls">
            <button class="win-ctl close" title="${t('w.close')}" aria-label="${t('w.close')}"></button>
            <button class="win-ctl min"  title="${t('w.min')}" aria-label="${t('w.min')}"></button>
            <button class="win-ctl max"  title="${t('w.max')}" aria-label="${t('w.max')}"></button>
          </div>
          <div class="win-title">
            <span class="win-ico">${app.icon}</span>
            <span>${t('app.' + app.id)}</span>
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
      MenuBar.setApp(win.dataset.app);
    },

    minimize(win) {
      win.classList.add('is-minimized');
      win.classList.remove('is-focused'); // гасим подсветку фокуса
      if (this.active === win) { this.active = null; MenuBar.setApp(null); }
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
      if (this.active === win) { this.active = null; MenuBar.setApp(null); }

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
      this.buildIcons();
      this.refresh();
      this.startClock();
    },

    buildIcons() {
      for (const id in Apps.list) {
        const app = Apps.list[id];
        if (app.dock === false) continue; // скрытые приложения

        const icon = document.createElement('button');
        icon.className = 'dock-icon';
        icon.dataset.app = id;
        icon.setAttribute('aria-label', t('app.' + id));
        icon.innerHTML = `
          <span>${app.icon}</span>
          <span class="tip">${t('app.' + id)}</span>
          <span class="dot"></span>`;
        icon.addEventListener('click', () => WM.open(id));
        this.iconsEl.appendChild(icon);
        this.iconEls.set(id, icon);
      }
    },

    // Пересборка иконок после смены языка
    rebuild() {
      this.iconsEl.innerHTML = '';
      this.iconEls.clear();
      this.buildIcons();
      this.refresh();
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
    wifiOn: Store.get('nebula.wifi', true),

    init() {
      this.wireWifi();
      this.wireVolume();
      this.wireFullscreen();
      this.refresh();
    },

    wireWifi() {
      const wifi = document.getElementById('tray-wifi');
      if (!wifi) return;
      wifi.addEventListener('click', () => {
        this.wifiOn = !this.wifiOn;
        Store.set('nebula.wifi', this.wifiOn);
        wifi.textContent = this.wifiOn ? '📶' : '📵';
        wifi.classList.toggle('off', !this.wifiOn);
        wifi.title = this.wifiOn ? t('tray.wifiOn') : t('tray.wifiOff');
        AudioSys.click();
        notifySystem({
          icon: this.wifiOn ? '📶' : '📵',
          title: this.wifiOn ? t('tray.wifiOn') : t('tray.wifiOff'),
          text: this.wifiOn ? t('tray.wifiOn') : t('tray.wifiOff'),
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
        muteBtn.textContent = AudioSys.muted ? t('tray.unmute') : t('tray.mute');
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
        full.title = on ? t('tray.fullExit') : t('tray.full');
      });
    },

    // Обновление подписей после смены языка
    refresh() {
      const wifi = document.getElementById('tray-wifi');
      if (wifi) wifi.title = this.wifiOn ? t('tray.wifiOn') : t('tray.wifiOff');
      const muteBtn = document.getElementById('vol-mute');
      if (muteBtn) muteBtn.textContent = AudioSys.muted ? t('tray.unmute') : t('tray.mute');
      const full = document.getElementById('tray-full');
      if (full) full.title = document.fullscreenElement ? t('tray.fullExit') : t('tray.full');
    },
  };

  /* ───────────────────────── Верхняя панель меню (как в macOS) ───────────────────────── */
  // Глобальное меню вверху экрана: ◐ логотип, имя приложения в фокусе
  // и два выпадающих меню — «Приложения» и «Система».
  const MenuBar = {
    el: null,

    init() {
      this.el = document.getElementById('menubar');
      if (!this.el) return;
      this.build();

      // ◐ логотип — открывает приложение «О системе»
      this.el.querySelector('#mb-logo').addEventListener('click', () => {
        AudioSys.click();
        WM.open('about');
      });

      // Выпадающие меню
      this.el.querySelectorAll('[data-menu]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          AudioSys.click();
          const id = btn.dataset.menu;
          const menu = this.el.querySelector('#mb-menu-' + id);
          const wasOpen = menu.classList.contains('show');
          this.closeAll();
          if (!wasOpen) {
            menu.classList.add('show');
            btn.classList.add('active');
          }
        });
      });
      this.el.querySelectorAll('.mb-menu').forEach(menu => {
        menu.addEventListener('click', (e) => {
          const open = e.target.closest('[data-open]');
          const act = e.target.closest('[data-act]');
          this.closeAll();
          if (open) { AudioSys.click(); WM.open(open.dataset.open); }
          else if (act) {
            AudioSys.click();
            const a = act.dataset.act;
            if (a === 'about') WM.open('about');
            else if (a === 'settings') WM.open('settings');
            else if (a === 'sleep') SleepMode.enter();
            else if (a === 'reboot') Boot.reboot();
          }
        });
      });

      // Закрытие меню по клику мимо / Esc
      document.addEventListener('pointerdown', (e) => {
        if (!this.el.contains(e.target)) this.closeAll();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeAll(); });

      // Имя активного приложения в панели (capture — срабатывает до WM)
      document.addEventListener('pointerdown', (e) => {
        const win = e.target.closest('.window');
        this.setApp(win ? win.dataset.app : null);
      }, true);
      this.setApp(null);
    },

    // Сборка выпадающих меню (после смены языка)
    build() {
      if (!this.el) return;
      this.el.querySelector('#mb-apps-btn').textContent = t('mb.apps') + ' ▾';
      this.el.querySelector('#mb-sys-btn').textContent = t('mb.system') + ' ▾';
      this.el.querySelector('#mb-current').textContent = t('mb.desktop');
      this.el.querySelector('#mb-menu-apps').innerHTML = Object.values(Apps.list)
        .filter(a => a.dock !== false)
        .map(a => `<button class="mb-item-row" data-open="${a.id}" role="menuitem"><span class="mb-row-ico">${a.icon}</span>${escapeHtml(t('app.' + a.id))}</button>`)
        .join('');
      this.el.querySelector('#mb-menu-system').innerHTML = `
        <button class="mb-item-row" data-act="about" role="menuitem"><span class="mb-row-ico">🛰️</span>${t('mb.about')}</button>
        <button class="mb-item-row" data-act="settings" role="menuitem"><span class="mb-row-ico">🎨</span>${t('mb.settings')}</button>
        <div class="mb-sep-row" role="separator"></div>
        <button class="mb-item-row" data-act="sleep" role="menuitem"><span class="mb-row-ico">☾</span>${t('br.sleep')}</button>
        <button class="mb-item-row" data-act="reboot" role="menuitem"><span class="mb-row-ico">⟳</span>${t('sm.reboot')}</button>`;
    },

    setApp(id) {
      if (!this.el) return;
      this.el.querySelector('#mb-current').textContent = id ? t('app.' + id) : t('mb.desktop');
    },

    closeAll() {
      if (!this.el) return;
      this.el.querySelectorAll('.mb-menu').forEach(m => m.classList.remove('show'));
      this.el.querySelectorAll('[data-menu]').forEach(b => b.classList.remove('active'));
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
        .map(a => `<button class="sm-app" data-app="${a.id}"><span class="sa-ico">${a.icon}</span><span class="sa-name">${escapeHtml(t('app.' + a.id))}</span></button>`)
        .join('');
      this.el.innerHTML = `
        <div class="sm-user">
          <div class="sm-avatar">${t('sm.avatar')}</div>
          <div>
            <div class="sm-name">${t('sm.guest')}</div>
            <div class="sm-sub">${t('sm.station')}</div>
          </div>
        </div>
        <div class="sm-stats">
          <div class="sm-stat"><div class="smk">${t('sm.sys')}</div><div class="smv">Nebula OS 1.1</div></div>
          <div class="sm-stat"><div class="smk">${t('sm.wins')}</div><div class="smv" id="sm-wins">0</div></div>
          <div class="sm-stat"><div class="smk">${t('sm.theme')}</div><div class="smv" id="sm-theme">—</div></div>
          <div class="sm-stat"><div class="smk">${t('sm.wall')}</div><div class="smv" id="sm-wall">—</div></div>
          <div class="sm-stat"><div class="smk">${t('sm.uptime')}</div><div class="smv" id="sm-uptime">0с</div></div>
          <div class="sm-stat sm-ram">
            <div class="smk">${t('sm.ram')}</div>
            <div class="smv" id="sm-ram">0 МБ / 8192 МБ</div>
            <div class="ram-bar"><i id="sm-ram-bar"></i></div>
          </div>
        </div>
        <div class="sm-sec-title">${t('sm.apps')}</div>
        <div class="sm-apps">${apps}</div>
        <div class="sm-foot">
          <button class="sm-btn reboot" id="sm-reboot">${t('sm.reboot')}</button>
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
    document.getElementById('sm-theme').textContent = t('theme.' + Settings.theme);
    document.getElementById('sm-wall').textContent = t('wall.' + Settings.wallpaper);
      const used = 2400 + WM.count() * 420 + Math.round(Math.random() * 120);
      const pct = Math.min(100, Math.round(used / 8192 * 100));
      document.getElementById('sm-ram').textContent = `${used} МБ / 8192 МБ`;
      document.getElementById('sm-ram-bar').style.width = pct + '%';
    },
  };

  /* ───────────────────────── Спящий режим ───────────────────────── */
  // Затемнение экрана с живыми часами; пробуждение — клик или любая клавиша.
  // «События», приходящие во сне (симуляция)
  const SLEEP_EVENTS = [
    ['📩', 'Сообщение'], ['🔔', 'Обновление системы'], ['📅', 'Событие календаря'],
    ['💬', 'Комментарий'], ['📧', 'Письмо'], ['🛡️', 'Проверка безопасности'],
  ];

  const SleepMode = {
    el: null,
    timer: 0,
    missTimer: 0,
    missed: 0,
    events: [],
    sleepStart: 0,
    prevFocus: null,

    enter() {
      if (this.el) return;
      this.prevFocus = document.activeElement;
      this.missed = 0;
      this.events = [];
      this.sleepStart = Date.now();
      const el = document.createElement('div');
      el.className = 'sleep-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Спящий режим');
      el.innerHTML = `
        <div class="sleep-moon">☾</div>
        <div class="sleep-clock">00:00:00</div>
        <div class="sleep-date"></div>
        <div class="sleep-missed">⚡ Пропущено событий: <b>0</b></div>
        <div class="sleep-last"></div>
        <div class="sleep-hint">Клик или любая клавиша — разбудить</div>`;
      document.body.appendChild(el);
      this.el = el;
      const tick = () => {
        const d = new Date();
        el.querySelector('.sleep-clock').textContent =
          pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
        el.querySelector('.sleep-date').textContent =
          d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
      };
      tick();
      this.timer = setInterval(tick, 1000);
      // Пока ОС спит, «приходят» события: каждые 4 с — новое пропущенное
      this.missTimer = setInterval(() => {
        const ev = SLEEP_EVENTS[Math.floor(Math.random() * SLEEP_EVENTS.length)];
        this.missed++;
        this.events.push(ev[0] + ' ' + ev[1]);
        if (this.events.length > 10) this.events.shift();
        const b = el.querySelector('.sleep-missed b');
        if (b) b.textContent = this.missed;
        const last = el.querySelector('.sleep-last');
        if (last) last.textContent = 'последнее: ' + this.events[this.events.length - 1];
      }, 4000);
      const wake = (e) => { e.preventDefault(); e.stopPropagation(); this.wake(); };
      el.addEventListener('click', wake);
      el.addEventListener('keydown', wake);
      el.setAttribute('tabindex', '0');
      el.focus();
      AudioSys.open();
    },

    wake() {
      if (!this.el) return;
      clearInterval(this.timer);
      clearInterval(this.missTimer);
      this.timer = 0;
      this.missTimer = 0;
      const slept = Math.round((Date.now() - this.sleepStart) / 1000);
      const missed = this.missed;
      const evNames = this.events.slice(0, 3).join(' · ');
      this.el.classList.add('hide');
      const el = this.el;
      this.el = null;
      setTimeout(() => el.remove(), 400);
      // Возвращаем фокус туда, где он был до сна
      if (this.prevFocus && this.prevFocus.focus) this.prevFocus.focus();
      this.prevFocus = null;
      AudioSys.open();
      // Бонус: сводка о пропущенных событиях при пробуждении
      if (missed > 0) {
        notifySystem({
          icon: '☀️',
          title: 'Пока вы спали',
          text: `Пропущено событий: ${missed} · сон: ${slept} с · ${evNames}${missed > 3 ? ' …' : ''}`,
        });
      }
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

  // Перевод ошибок VFS (они возвращаются по-русски) на текущий язык
  function vfsErr(msg) {
    const map = {
      'Родительская папка не найдена': t('files.noParent'),
      'Элемент с таким именем уже существует': t('files.exists'),
      'Некорректный путь': t('files.badPath'),
      'Некорректное имя': t('files.badName'),
      'Пустое имя': t('files.emptyName'),
      'Элемент не найден': t('files.noItem'),
      'Нельзя удалить корень': t('files.noRoot'),
    };
    return map[msg] || msg;
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
          <button class="fbtn" id="files-back" data-act="back" title="${t('files.back')}" aria-label="${t('files.back')}">◀</button>
          <button class="fbtn" id="files-fwd" data-act="fwd" title="${t('files.fwd')}" aria-label="${t('files.fwd')}">▶</button>
          <button class="fbtn" data-act="up" title="${t('files.up')}" aria-label="${t('files.up')}">▲</button>
        </div>
        <div class="files-path" id="files-path"></div>
        <div class="files-actions">
          <button class="fbtn" data-act="newfolder" title="${t('files.newFolderName')}">${t('files.newFolder')}</button>
          <button class="fbtn" data-act="newfile" title="${t('files.newFileName')}">${t('files.newFile')}</button>
          <button class="fbtn" data-act="view" id="files-view" title="${t('files.view')}"></button>
        </div>
      </div>
      <div class="files-area">
        <div class="files-grid" tabindex="-1"></div>
        <div class="files-empty">${t('files.empty')}</div>
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

    // Уникальное имя по умолчанию на текущем языке
    function defaultName(isDir) {
      return isDir ? t('files.newFolderName') : t('files.newFileName');
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
      viewBtn.title = t('files.view');
      backBtn.disabled = state.hi <= 0;
      fwdBtn.disabled = state.hi >= state.hist.length - 1;

      pathEl.innerHTML = breadcrumbHtml(state.cwd);

      const items = VFS.readDir(state.cwd) || [];
      grid.innerHTML = '';
      empty.style.display = items.length ? 'none' : '';
      empty.textContent = state.cwd === '/' ? t('files.rootEmpty') : t('files.empty');

      items.forEach(item => {
        const el = document.createElement('button');
        el.className = 'files-item';
        el.dataset.path = joinPath(state.cwd, item.name);
        el.innerHTML = `
          <span class="fi-ico">${iconFor(item)}</span>
          <span class="fi-name">${escapeHtml(item.name)}</span>
          <span class="fi-meta">${item.type === 'dir' ? t('files.folder') : VFS.humanSize(item.size)}</span>`;

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
      countEl.textContent = tf('files.count', items.length, dirs, files);
      spaceEl.textContent = tf('files.space', VFS.humanSize(VFS.totalSize(VFS.node('/'))));
    }

    function selectItem(p, el) {
      grid.querySelectorAll('.files-item').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
      el.focus();
    }

    // ── Создание и переименование ──
    function newFolder() {
      const name = uniqueName(defaultName(true), true);
      const err = VFS.mkdir(joinPath(state.cwd, name));
      if (err) { toast(vfsErr(err)); return; }
      render();
      startRename(joinPath(state.cwd, name));
    }

    function newFile() {
      const name = uniqueName(defaultName(false), false);
      const err = VFS.writeFile(joinPath(state.cwd, name), '');
      if (err) { toast(vfsErr(err)); return; }
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
        tf('files.deleteQ', isDir ? t('files.folder') : t('files.open').toLowerCase(), escapeHtml(name)),
        () => {
          const err = VFS.remove(path);
          if (err) toast(vfsErr(err));
          else render();
        });
    }

    // ── Скачивание ──
    function downloadFile(path) {
      const content = VFS.readFile(path);
      if (content === null) { toast(t('files.notFound')); return; }
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
      if (content === null) { toast(t('files.notFound')); return; }
      const overlay = document.createElement('div');
      overlay.className = 'files-overlay';
      overlay.innerHTML = `
        <div class="files-editor">
          <div class="files-editor-bar">
            <span class="fe-title">📄 ${escapeHtml(baseName(path))}</span>
            <div class="fe-controls">
              <button class="fbtn fe-save">💾 ${t('files.saved')}</button>
              <button class="fbtn fe-close" title="${t('files.close')}">✕</button>
            </div>
          </div>
          <textarea class="fe-body" spellcheck="false"></textarea>
        </div>`;

      const ta = overlay.querySelector('.fe-body');
      ta.value = content;

      overlay.querySelector('.fe-save').addEventListener('click', () => {
        VFS.writeFile(path, ta.value);
        content = ta.value;
        toast(t('files.saved'), 'ok');
        render();
      });

      // Закрытие с проверкой несохранённых изменений
      const closeEditor = () => {
        if (ta.value !== content) {
          confirmDialog(
            tf('files.closeQ', escapeHtml(baseName(path))),
            () => overlay.remove(),
            t('files.close'));
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
    function confirmDialog(html, onYes, yesLabel = t('files.delete')) {
      const overlay = document.createElement('div');
      overlay.className = 'files-overlay';
      overlay.innerHTML = `
        <div class="files-confirm">
          <div class="fc-text">${html}</div>
          <div class="fc-btns">
            <button class="fbtn fc-no">${t('files.cancel')}</button>
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
        { icon: isDir ? '📂' : '📄', label: t('files.open'), act: 'open' },
        { icon: '✏️', label: t('files.rename'), act: 'rename' },
        ...(isDir ? [] : [{ icon: '⬇️', label: t('files.download'), act: 'download' }]),
        { sep: true },
        { icon: '🗑️', label: t('files.delete'), act: 'delete' },
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
        <input type="text" class="notes-title" placeholder="${t('notes.title')}" maxlength="80" />
        <span class="notes-status">—</span>
        <button class="notes-clear" type="button">${t('notes.clear')}</button>
      </div>
      <textarea class="notes-body" placeholder="${t('notes.body')}"></textarea>`;

    const title = root.querySelector('.notes-title');
    const text = root.querySelector('.notes-body');
    const status = root.querySelector('.notes-status');
    const clear = root.querySelector('.notes-clear');

    title.value = saved.title;
    text.value = saved.body;
    status.textContent = t('notes.ready');

    // Дебаунс автосохранения + индикатор «Сохранено HH:MM:SS»
    let timer = null;
    const save = () => {
      clearTimeout(timer);
      status.textContent = t('notes.saving');
      timer = setTimeout(() => {
        Store.set('nebula.notes', { title: title.value, body: text.value });
        status.textContent = tf('notes.saved', new Date().toLocaleTimeString('ru-RU'));
      }, 300);
    };
    title.addEventListener('input', save);
    text.addEventListener('input', save);

    clear.addEventListener('click', () => {
      title.value = '';
      text.value = '';
      Store.set('nebula.notes', { title: '', body: '' });
      status.textContent = t('notes.cleared');
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
      print(`<span class="t-acc">${t('term.banner')}</span>${t('term.bannerSub')}`);
      print(`<span class="t-dim">${t('term.hint')}</span>`);
      print('');
    }

    // ── Команды ──
    const CMDS = {
      help() {
        const rows = t('term.help');
        print(`<span class="t-ac2">${t('term.helpTitle')}</span>`);
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
          print(tf('term.tTheme', `<span class="t-acc">${Settings.theme}</span>`));
          return;
        }
        if (Settings.applyTheme(args[0])) {
          print(`<span class="t-ok">✓</span> ${tf('nt.themeApplied', t('theme.' + args[0]))}`);
          notifySystem({ icon: '🎨', title: t('set.theme'), text: tf('nt.themeApplied', t('theme.' + args[0])), app: 'settings' });
        } else {
          print(`<span class="t-err">✗</span> ${tf('term.tUnknown', args[0])}`);
        }
      },

      matrix() {
        if (Matrix.active) {
          Matrix.stop();
          print(`<span class="t-dim">${t('term.matrixOff')}</span>`);
          notifySystem({ icon: '💚', title: t('nt.matrixOn'), text: t('nt.matrixOff') });
        } else {
          Matrix.start();
          print(`<span class="t-neon">${t('term.matrixOn')}</span>`);
          notifySystem({ icon: '💚', title: t('nt.matrixOn'), text: t('nt.matrixOnText') });
        }
      },

      ls(args) {
        if (args.length) {
          const items = VFS.readDir(args[0]);
          if (!items) {
            print(`<span class="t-err">✗</span> ${tf('term.noDir', escapeHtml(args[0]))}`);
            return;
          }
          print(`<span class="t-ac2">${escapeHtml(VFS.norm(args[0]))}/</span> <span class="t-dim">${tf('term.lsDir', items.length)}</span>`);
          items.forEach(i => {
            const meta = i.type === 'file' ? ` <span class="t-dim">${VFS.humanSize(i.size)}</span>` : '';
            print(`  ${i.type === 'dir' ? '📁' : '📄'} <span class="t-acc">${escapeHtml(i.name)}</span>${meta}`);
          });
          return;
        }
        print(`<span class="t-ac2">${t('term.lsApps')}</span>`);
        Object.values(Apps.list).forEach(a => {
          print(`  ${a.icon}  <span class="t-acc">${t('app.' + a.id)}</span> <span class="t-dim">(${a.id})</span>`);
        });
      },

      open(args) {
        if (args.length === 0) { print(`<span class="t-err">✗</span> ${t('term.openHint')}`); return; }
        const key = args[0].toLowerCase();
        const app = Apps.list[key];
        if (app) { WM.open(key); print(`<span class="t-ok">✓</span> ${tf('term.opening', t('app.' + key))}`); }
        else print(`<span class="t-err">✗</span> ${tf('term.notFound', key)}`);
      },

      cat(args) {
        if (!args.length) { print(`<span class="t-err">✗</span> ${t('term.catNo')}`); return; }
        if (VFS.isDir(args[0])) { print(`<span class="t-err">✗</span> ${tf('term.isDir', escapeHtml(args[0]))}`); return; }
        const content = VFS.readFile(args[0]);
        if (content === null) { print(`<span class="t-err">✗</span> ${tf('term.noFile', escapeHtml(args[0]))}`); return; }
        content.split('\n').forEach(l => print(escapeHtml(l)));
      },

      mkdir(args) {
        if (!args.length) { print(`<span class="t-err">✗</span> ${t('term.mkdirNeed')}`); return; }
        const err = VFS.mkdir(args[0]);
        if (err) print(`<span class="t-err">✗</span> ${vfsErr(err)}: ${escapeHtml(args[0])}`);
        else print(`<span class="t-ok">✓</span> ${tf('term.mkdirOk', escapeHtml(VFS.norm(args[0])))}`);
      },

      touch(args) {
        if (!args.length) { print(`<span class="t-err">✗</span> ${t('term.touchNeed')}`); return; }
        const err = VFS.writeFile(args[0], '');
        if (err) print(`<span class="t-err">✗</span> ${vfsErr(err)}`);
        else print(`<span class="t-ok">✓</span> ${tf('term.touchOk', escapeHtml(VFS.norm(args[0])))}`);
      },

      rm(args) {
        if (!args.length) { print(`<span class="t-err">✗</span> ${t('term.rmNeed')}`); return; }
        const err = VFS.remove(args[0]);
        if (err) print(`<span class="t-err">✗</span> ${vfsErr(err)}`);
        else print(`<span class="t-ok">✓</span> ${tf('term.rmOk', escapeHtml(VFS.norm(args[0])))}`);
      },

      whoami() { print(`<span class="t-acc">guest</span> — ${t('term.whoami')}`); },

      about() {
        print(`<span class="t-ac2">${t('term.about1')}</span>`);
        print(`<span class="t-dim">${t('term.about2')}</span>`);
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
        const tmpl = t('term.neofetch');
        const info = [
          '<span class="t-acc">guest@nebula</span>',
          '─────────────',
          tmpl[2],
          tmpl[3].replace('{0}', Settings.theme),
          tmpl[4].replace('{1}', Settings.wallpaper),
          tmpl[5].replace('{2}', WM.count()),
          tmpl[6],
          tmpl[7],
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
      else print(`<span class="t-err">${t('term.unknown')}</span> ${cmd}. ${t('term.hint')}`);
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
      if (!isFinite(n)) return t('calc.err');
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

    // Строим карточки тем и обоев (имена — через i18n)
    const themeCards = Object.entries(THEMES).map(([id, th]) => `
      <button class="opt-card" data-theme-id="${id}">
        <div class="opt-preview" style="background:linear-gradient(135deg,${th.preview.join(',')})"></div>
        <span class="opt-name">${t('theme.' + id)}</span>
        <span class="opt-desc">${t('theme.' + id + 'Desc')}</span>
      </button>`).join('');

    const wallCards = WALLPAPERS.map(w => `
      <button class="opt-card" data-wall-id="${w.id}">
        <div class="opt-preview" style="background:${w.preview}"></div>
        <span class="opt-name">${t('wall.' + w.id)}</span>
        <span class="opt-desc">${t('wall.' + w.id + 'Desc')}</span>
      </button>`).join('');

    const LANGS = [
      { id: 'ru', label: '🇷🇺 Русский' },
      { id: 'en', label: '🇬🇧 English' },
      { id: 'ky', label: '🇰🇬 Кыргызча' },
      { id: 'zh', label: '🇨🇳 中文' },
    ];

    root.innerHTML = `
      <section class="settings-sec">
        <h3>${t('set.lang')}</h3>
        <div class="opt-grid lang-grid">
          ${LANGS.map(l => `<button class="opt-card lang-card" data-lang="${l.id}">${l.label}</button>`).join('')}
        </div>
      </section>
      <section class="settings-sec">
        <h3>${t('set.theme')}</h3>
        <div class="opt-grid">${themeCards}</div>
      </section>
      <section class="settings-sec">
        <h3>${t('set.wall')}</h3>
        <div class="opt-grid">${wallCards}</div>
      </section>
      <button class="settings-reset" type="button">${t('set.reset')}</button>`;

    const mark = (sel, key, activeId) => {
      root.querySelectorAll(sel).forEach(card => {
        card.classList.toggle('is-selected', card.dataset[key] === activeId);
      });
    };

    root.addEventListener('click', (e) => {
      const langBtn = e.target.closest('[data-lang]');
      const th = e.target.closest('[data-theme-id]');
      const wl = e.target.closest('[data-wall-id]');
      if (langBtn) {
        applyLang(langBtn.dataset.lang);
        return; // окно «Настройки» пересоздаётся вместе с другими окнами
      }
      if (th) {
        Settings.applyTheme(th.dataset.themeId);
        mark('[data-theme-id]', 'themeId', Settings.theme);
        notifySystem({ icon: '🎨', title: t('set.theme'), text: tf('nt.themeApplied', t('theme.' + Settings.theme)), app: 'settings' });
      }
      if (wl) {
        Settings.applyWallpaper(wl.dataset.wallId);
        mark('[data-wall-id]', 'wallId', Settings.wallpaper);
        notifySystem({ icon: '🖼️', title: t('set.wall'), text: tf('nt.wallApplied', t('wall.' + Settings.wallpaper)), app: 'settings' });
      }
      if (e.target.closest('.settings-reset')) {
        Settings.reset();
        mark('[data-theme-id]', 'themeId', Settings.theme);
        mark('[data-wall-id]', 'wallId', Settings.wallpaper);
        notifySystem({ icon: '🔁', title: t('nt.settingsReset'), text: t('set.resetDone') });
      }
    });

    mark('[data-lang]', 'lang', I18N.lang);
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
      <div class="about-title">${t('about.title')}</div>
      <div class="about-ver">${t('about.ver')}</div>
      <div class="about-desc">${t('about.desc')}</div>`;
    body.appendChild(root);
  }

  /* ---- Музыка: процедурный lo-fi генератор на Web Audio ---- */
  // Ни одного аудиофайла: мелодия синтезируется в реальном времени
  // (бас + пэд-аккорд + пентатоническая мелодия) и играет бесконечно.
  function mountMusic(body) {
    const PLAYLIST = [
      { nameKey: 'm.t1', artist: 'Nebula FM', bpm: 96,  root: 220.00, mood: 'cyber' },
      { nameKey: 'm.t2', artist: 'Nebula FM', bpm: 84,  root: 174.61, mood: 'midnight' },
      { nameKey: 'm.t3', artist: 'Nebula FM', bpm: 72,  root: 196.00, mood: 'space' },
      { nameKey: 'm.t4', artist: 'Nebula FM', bpm: 108, root: 261.63, mood: 'morning' },
    ];

    const root = document.createElement('div');
    root.className = 'app-music';
    root.innerHTML = `
      <div class="music-head">
        <div>
          <div class="music-title">Nebula FM</div>
          <div class="music-artist" id="m-artist">${t('m.sub')}</div>
        </div>
        <button class="music-sound" id="m-sound" type="button" aria-label="${t('m.soundBtn')}" title="${t('m.soundBtn')}">🔊</button>
      </div>
      <div class="music-now">
        <span class="mn-ico">🎧</span>
        <div>
          <div class="mn-name" id="m-name">${t('m.choose')}</div>
          <div class="mn-status" id="m-status">${t('m.wait')}</div>
        </div>
      </div>
      <div class="music-viz" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="music-progress">
        <span id="m-cur">0:00</span>
        <div class="mp-bar"><i id="m-bar"></i></div>
        <span id="m-dur">0:00</span>
      </div>
      <div class="music-controls">
        <button class="mc-btn" id="m-prev" title="${t('m.prev')}" aria-label="${t('m.prev')}">⏮</button>
        <button class="mc-btn play" id="m-play" title="${t('m.play')}" aria-label="${t('m.play')}/${t('m.pauseBtn')}">▶</button>
        <button class="mc-btn" id="m-next" title="${t('m.next')}" aria-label="${t('m.next')}">⏭</button>
      </div>
      <div class="music-list" id="m-list"></div>`;

    const nameEl = root.querySelector('#m-name');
    const statusEl = root.querySelector('#m-status');
    const curEl = root.querySelector('#m-cur');
    const durEl = root.querySelector('#m-dur');
    const barEl = root.querySelector('#m-bar');
    const playBtn = root.querySelector('#m-play');
    const listEl = root.querySelector('#m-list');
    const soundBtn = root.querySelector('#m-sound');

    let idx = 0;
    const state = { playing: false, step: 0, total: 64, spb: 0.25 };

    // ── Звук кнопок приложения: свой переключатель, не трогает музыку и громкость ОС ──
    let uiSound = Store.get('nebula.musicClicks', true);
    const clickSfx = () => { if (uiSound) AudioSys.click(); };
    function renderSoundBtn() {
      soundBtn.textContent = uiSound ? '🔊' : '🔇';
      soundBtn.classList.toggle('off', !uiSound);
      soundBtn.title = uiSound ? t('m.soundOn') : t('m.soundOff');
      soundBtn.setAttribute('aria-label', t('m.soundBtn'));
    }
    renderSoundBtn();
    soundBtn.addEventListener('click', () => {
      const turningOff = uiSound;
      if (turningOff) clickSfx();      // последний клик перед отключением
      uiSound = !uiSound;
      Store.set('nebula.musicClicks', uiSound);
      renderSoundBtn();
      if (!turningOff) clickSfx();     // подтверждение включения
    });

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
    function renderList() {      listEl.innerHTML = PLAYLIST.map((tr, i) => `
        <button class="m-track${i === idx ? ' active' : ''}" data-i="${i}">
          <span class="mt-ico">${i === idx && state.playing ? '🔊' : '🎵'}</span>
          <span class="mt-name">${escapeHtml(t(tr.nameKey))}</span>
          <span class="mt-artist">${escapeHtml(tr.artist)}</span>
        </button>`).join('');
    nameEl.textContent = t(PLAYLIST[idx].nameKey);
    }
    renderList();

    function setPlayIcon() {
      playBtn.textContent = state.playing ? '⏸' : '▶';
      playBtn.title = state.playing ? t('m.pauseBtn') : t('m.play');
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
          statusEl.textContent = t('m.noaudio');
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
      clickSfx();
      if (state.playing) {
        engine.stop();
        setPlayIcon();
        root.classList.remove('playing');
        statusEl.textContent = t('m.pause');
      } else {
        const ok = engine.start(PLAYLIST[idx]);
        if (ok) {
          setPlayIcon();
          root.classList.add('playing');
          statusEl.textContent = t('m.playing');
        } else {
          statusEl.textContent = t('m.noaudio');
        }
      }
    });

    root.querySelector('#m-prev').addEventListener('click', () => { clickSfx(); loadTrack(idx - 1); });
    root.querySelector('#m-next').addEventListener('click', () => { clickSfx(); loadTrack(idx + 1); });
    listEl.addEventListener('click', (e) => {
      const tr = e.target.closest('.m-track');
      if (tr) { clickSfx(); loadTrack(+tr.dataset.i); }
    });

    body.appendChild(root);
    return { destroy: () => { engine.stop(); clearInterval(progTimer); } };
  }

  /* ---- Крестики-нолики: против бота или вдвоём ---- */
  function mountTicTacToe(body) {
    const root = document.createElement('div');
    root.className = 'app-ttt';
    root.innerHTML = `
      <div class="ttt-head">
        <div class="ttt-modes" role="group" aria-label="Режим игры">
          <button class="ttt-mode" data-mode="bot-easy" type="button" title="${t('ttt.bot')}">${t('ttt.bot')}</button>
          <button class="ttt-mode" data-mode="bot-hard" type="button" title="${t('ttt.hard')}">${t('ttt.hard')}</button>
          <button class="ttt-mode" data-mode="pvp" type="button" title="${t('ttt.pvp')}">${t('ttt.pvp')}</button>
        </div>
        <div class="ttt-score">
          <span class="tts-x">❌ <b id="ttt-score-x">0</b></span>
          <span class="tts-draw">— <b id="ttt-score-d">0</b></span>
          <span class="tts-o">⭕ <b id="ttt-score-o">0</b></span>
        </div>
      </div>
      <div class="ttt-status" id="ttt-status">${t('ttt.turn')}❌</div>
      <div class="ttt-board" id="ttt-board" role="grid" aria-label="${t('ttt.cell')} 3×3"></div>
      <div class="ttt-foot">
        <button class="fbtn" id="ttt-restart" type="button" title="${t('ttt.restart')}">${t('ttt.restart')}</button>
      </div>`;

    const boardEl = root.querySelector('#ttt-board');
    const statusEl = root.querySelector('#ttt-status');
    const scoreX = root.querySelector('#ttt-score-x');
    const scoreD = root.querySelector('#ttt-score-d');
    const scoreO = root.querySelector('#ttt-score-o');
    const modeBtns = root.querySelectorAll('.ttt-mode');

    const WIN_LINES = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],   // строки
      [0, 3, 6], [1, 4, 7], [2, 5, 8],   // столбцы
      [0, 4, 8], [2, 4, 6],              // диагонали
    ];

    let board = Array(9).fill(null);
    let current = 'X';          // X всегда ходит первым
    let mode = 'bot-easy';      // 'bot-easy' / 'bot-hard' — человек X против бота O, 'pvp' — вдвоём
    let over = false;
    let botTimer = 0;
    let score = { X: 0, O: 0, D: 0 };
    const isBot = () => mode !== 'pvp';

    // ── Отрисовка поля ──
    function render() {
      boardEl.innerHTML = board.map((v, i) => `
        <button class="ttt-cell${v ? ' taken' : ''}" data-i="${i}" type="button" role="gridcell"
          aria-label="${t('ttt.cell')} ${i + 1}${v ? ', ' + v : ''}" ${v || over ? 'disabled' : ''}>${v === 'X' ? '❌' : v === 'O' ? '⭕' : ''}</button>
      `).join('');
      root.querySelectorAll('.ttt-cell').forEach(c =>
        c.addEventListener('click', () => onCell(+c.dataset.i)));
    }

    // ── Проверка исхода ──
    // Победитель на произвольном поле (для minimax); null — пока никто
    function getWinner(b) {
      for (const [a, c, d] of WIN_LINES) {
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
      }
      return null;
    }

    function winner() {
      const mark = getWinner(board);
      if (!mark) return null;
      return { mark, line: WIN_LINES.find(([a, c, d]) => board[a] === mark && board[c] === mark && board[d] === mark) };
    }

    function updateStatus() {
      const w = winner();
      if (w) {
        over = true;
        if (w.mark === 'X') score.X++; else score.O++;
        const botWon = isBot() && w.mark === 'O';
        statusEl.textContent = botWon ? t('ttt.botWin') : tf('ttt.win', w.mark === 'X' ? '❌' : '⭕');
        AudioSys.success();
      } else if (board.every(Boolean)) {
        over = true;
        score.D++;
        statusEl.textContent = t('ttt.draw');
        AudioSys.click();
      } else if (isBot() && current === 'O') {
        statusEl.textContent = t('ttt.thinking');
      } else {
        statusEl.textContent = t('ttt.turn') + (current === 'X' ? '❌' : '⭕');
      }
      scoreX.textContent = score.X;
      scoreD.textContent = score.D;
      scoreO.textContent = score.O;
    }

    // ── Ход ──
    function place(i) {
      if (over || board[i]) return false;
      board[i] = current;
      AudioSys.click();
      // Завершаем игру сразу, чтобы поле заблокировалось до отрисовки
      const w = winner();
      const full = board.every(Boolean);
      if (w || full) over = true;
      else current = current === 'X' ? 'O' : 'X';
      render();
      updateStatus();
      return true;
    }

    // Простой бот: выиграть → заблокировать → центр → случайный угол/край
    function botMoveEasy() {
      const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);
      const find = (mark) => {
        for (const [a, b, c] of WIN_LINES) {
          const marks = [board[a], board[b], board[c]].filter(Boolean);
          const line = [a, b, c];
          if (marks.length === 2 && marks[0] === mark && marks[1] === mark) {
            return line.find(i => !board[i]);
          }
        }
        return null;
      };
      let move = find('O') ?? find('X');
      if (move === null && !board[4]) move = 4;
      if (move === null) {
        const corners = [0, 2, 6, 8].filter(i => !board[i]);
        const sides = [1, 3, 5, 7].filter(i => !board[i]);
        const pool = corners.length ? corners : sides;
        move = pool.length ? pool[Math.floor(Math.random() * pool.length)] : empty[0];
      }
      if (move !== null && move !== undefined) place(move);
    }

    // Оценка позиции для minimax: +10 — победа бота (O), −10 — победа X, 0 — ничья
    function mmScore(b, isO) {
      const w = getWinner(b);
      if (w === 'O') return 10;
      if (w === 'X') return -10;
      if (b.every(Boolean)) return 0;
      const mark = isO ? 'O' : 'X';
      let best = isO ? -Infinity : Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = mark;
          const s = mmScore(b, !isO);
          b[i] = null;
          best = isO ? Math.max(best, s) : Math.min(best, s);
        }
      }
      return best;
    }

    // Непобедимый бот: перебирает все варианты — гарантированно не проигрывает
    function botMoveHard() {
      let best = -Infinity, move = -1;
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = 'O';
          const s = mmScore(board, false); // дальше ходит X (минимизирует)
          board[i] = null;
          if (s > best) { best = s; move = i; }
        }
      }
      if (move >= 0) place(move);
    }

    function botMove() {
      if (mode === 'bot-hard') botMoveHard();
      else botMoveEasy();
    }

    function onCell(i) {
      if (isBot() && (current !== 'X' || over)) return;
      if (!place(i)) return;
      // После хода человека бот отвечает с небольшой паузой
      if (isBot() && !over && current === 'O') {
        statusEl.textContent = t('ttt.thinking');
        botTimer = setTimeout(() => { botTimer = 0; botMove(); }, 380);
      }
    }

    function reset() {
      clearTimeout(botTimer);
      botTimer = 0;
      board = Array(9).fill(null);
      current = 'X';
      over = false;
      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      render();
      updateStatus();
    }

    modeBtns.forEach(btn => btn.addEventListener('click', () => {
      AudioSys.click();
      mode = btn.dataset.mode;
      reset();
    }));
    root.querySelector('#ttt-restart').addEventListener('click', () => { AudioSys.click(); reset(); });

    reset();
    body.appendChild(root);
    return { destroy: () => clearTimeout(botTimer) };
  }

  /* ---- Обои: быстрый выбор фона рабочего стола ---- */
  function mountWallpaper(body) {
    const root = document.createElement('div');
    root.className = 'app-settings app-wall';

    const wallCards = WALLPAPERS.map(w => `
      <button class="opt-card" data-wall-id="${w.id}">
        <div class="opt-preview" style="background:${w.preview}"></div>
        <span class="opt-name">${t('wall.' + w.id)}</span>
        <span class="opt-desc">${t('wall.' + w.id + 'Desc')}</span>
      </button>`).join('');

    root.innerHTML = `
      <section class="settings-sec">
        <h3>${t('set.wall')}</h3>
        <p class="wall-hint">${t('wallapp.hint')}</p>
        <div class="opt-grid">${wallCards}</div>
      </section>`;

    const mark = () => {
      root.querySelectorAll('[data-wall-id]').forEach(card =>
        card.classList.toggle('is-selected', card.dataset.wallId === Settings.wallpaper));
    };

    root.addEventListener('click', (e) => {
      const card = e.target.closest('[data-wall-id]');
      if (!card) return;
      const id = card.dataset.wallId;
      if (!Settings.applyWallpaper(id)) return;
      AudioSys.click();
      mark();
      notifySystem({ icon: '🖼️', title: t('set.wall'), text: tf('nt.wallApplied', t('wall.' + id)), app: 'wallpaper' });
    });

    mark();
    body.appendChild(root);
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
        <button class="fbtn" data-nav="-1" title="${t('cal.prev')}" aria-label="${t('cal.prev')}">◀</button>
        <div class="cal-title"></div>
        <button class="fbtn" data-nav="1" title="${t('cal.next')}" aria-label="${t('cal.next')}">▶</button>
        <button class="fbtn cal-today" data-today="1" title="${t('cal.today')}">${t('cal.today')}</button>
      </div>
      <div class="cal-body">
        <div class="cal-grid">
          ${t('cal.dow').map(d => `<div class="cal-dow">${d}</div>`).join('')}
          <div class="cal-cells"></div>
        </div>
        <aside class="cal-side">
          <div class="cal-day-name" id="cal-day-name">—</div>
          <div class="cal-day-events" id="cal-day-events"></div>
          <form class="cal-add" id="cal-form">
            <input class="cal-new-title" id="cal-new-title" placeholder="${t('cal.placeholder')}" maxlength="60" />
            <input class="cal-new-time" id="cal-new-time" type="time" aria-label="${t('cal.time')}" />
            <button class="fbtn cal-add-btn" type="submit" aria-label="${t('cal.add')}">＋</button>
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

    const MONTHS = t('cal.months');
    const WEEKDAYS = t('cal.weekdays');

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
        dayEventsEl.innerHTML = `<div class="cal-empty">${t('cal.empty')}</div>`;
        return;
      }
      dayEventsEl.innerHTML = list.map(e => `
        <div class="cal-event">
          <span class="ce-time">${e.time ? escapeHtml(e.time) : '—'}</span>
          <span class="ce-title">${escapeHtml(e.title)}</span>
          <button class="ce-del" data-id="${e.id}" title="${t('cal.del')}" aria-label="${t('cal.del')}">✕</button>
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
        <button class="fbtn br-btn" data-nav="back" title="${t('br.back')}" aria-label="${t('br.back')}">◀</button>
        <button class="fbtn br-btn" data-nav="fwd" title="${t('br.fwd')}" aria-label="${t('br.fwd')}">▶</button>
        <button class="fbtn br-btn" data-nav="reload" title="${t('br.reload')}" aria-label="${t('br.reload')}">⟳</button>
        <button class="fbtn br-btn" data-nav="home" title="${t('br.homeBtn')}" aria-label="${t('br.homeBtn')}">⌂</button>
        <form class="br-addr-form" id="br-addr-form">
          <input class="br-addr" id="br-addr" placeholder="${t('br.search')}" spellcheck="false" autocomplete="off" aria-label="${t('br.search')}" />
        </form>
        <button class="fbtn br-btn br-star" id="br-star" title="${t('br.bookmark')}" aria-label="${t('br.bookmark')}">☆</button>
        <button class="fbtn br-btn br-dark" id="br-dark" title="${t('br.darkOn')}" aria-label="${t('br.darkOn')}">☾</button>
        <button class="fbtn br-btn" data-page="bookmarks" title="${t('br.bmPage')}" aria-label="${t('br.bmPage')}">★</button>
        <button class="fbtn br-btn" data-page="history" title="${t('br.hisPage')}" aria-label="${t('br.hisPage')}">🕘</button>
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
      [HOME]: t('br.home'),
      'nebula://apps': t('br.apps'),
      'nebula://bookmarks': t('br.bookmarks'),
      'nebula://history': t('br.history'),
      'nebula://vfs': t('br.vfs'),
      'nebula://about': t('br.about'),
      'nebula://settings': t('br.settings'),
      'nebula://tray': t('br.tray'),
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
      plus.title = t('br.plus');
      plus.setAttribute('aria-label', t('br.plus'));
      plus.textContent = '＋';
      plus.addEventListener('click', () => { AudioSys.click(); addTab(); });
      tabsEl.appendChild(plus);
    }

    function setActive(id) { activeId = id; renderTabs(); render(); }

    function render() {
      const tab = activeTab();
      if (!tab) return;
      // Живая статистика «О системе» живёт, пока открыта страница
      if (aboutTimer) { clearInterval(aboutTimer); aboutTimer = 0; }
      addrEl.value = tab.url;
      const marked = isBookmarked(tab.url);
      starBtn.textContent = marked ? '★' : '☆';
      starBtn.classList.toggle('on', marked);
      starBtn.title = marked ? t('br.bmOn') : t('br.bookmark');
      statusUrl.textContent = tab.url;
      const isWeb = /^https?:/i.test(tab.url);
      const isVfs = tab.url.startsWith('nebula://vfs');
      statusSec.textContent = isWeb ? t('br.web') : isVfs ? t('br.vfsPage') : t('br.int');
      contentEl.innerHTML = '';
      if (tab.url === HOME) contentEl.appendChild(buildHome());
      else if (tab.url === 'nebula://apps') contentEl.appendChild(buildApps());
      else if (tab.url === 'nebula://bookmarks') contentEl.appendChild(buildBookmarks());
      else if (tab.url === 'nebula://history') contentEl.appendChild(buildHistory());
      else if (tab.url === 'nebula://about') contentEl.appendChild(buildAbout());
      else if (tab.url === 'nebula://settings') contentEl.appendChild(buildSettings());
      else if (tab.url === 'nebula://tray') contentEl.appendChild(buildTray());
      else if (isVfs) contentEl.appendChild(buildVfs(tab.url));
      else if (isWeb) contentEl.appendChild(buildFrame(tab.url));
      else contentEl.innerHTML = `<div class="br-err">${t('br.err')}</div>`;
    }

    // Страница «О системе»: информация об ОС + живая статистика (обновляется каждую секунду)
    function buildAbout() {
      const el = document.createElement('div');
      el.className = 'br-about';
      // ── живая статистика (аналог меню «Пуск») ──
      const ramUsed = () => 2400 + WM.count() * 420 + Math.round(Math.random() * 120);
      // «Загрузка CPU»: симуляция (растёт с числом окон), история последних 30 сэмплов
      const cpuHist = [];
      const cpuLoad = () => Math.min(100, Math.max(4, 12 + WM.count() * 9 + Math.round(Math.random() * 28)));
      const cpuColor = (v) => v < 50 ? 'var(--accent-2)' : v < 85 ? 'var(--accent)' : 'var(--danger)';
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
        const used = ramUsed();
        const pct = Math.min(100, Math.round(used / 8192 * 100));
        el.querySelector('#ab-uptime').textContent = fmtUptime();
        el.querySelector('#ab-wins').textContent = WM.count();
        el.querySelector('#ab-theme').textContent = t('theme.' + Settings.theme);
        el.querySelector('#ab-wall').textContent = t('wall.' + Settings.wallpaper);
        el.querySelector('#ab-ram').textContent = `${used} МБ / 8192 МБ`;
        el.querySelector('#ab-ram-bar').style.width = pct + '%';
        el.querySelector('#ab-store').textContent = storageKb() + ' КБ';
        // CPU: новый сэмпл каждую секунду → плавный SVG-график
        const cpu = cpuLoad();
        cpuHist.push(cpu);
        if (cpuHist.length > 30) cpuHist.shift();
        el.querySelector('#ab-cpu').textContent = cpu + '%';
        const W = 300, H = 56;
        const n = cpuHist.length;
        const step = n > 1 ? W / (n - 1) : 0;
        const pts = cpuHist.map((v, i) => [i * step, H - 3 - (v / 100) * (H - 6)]);
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        el.querySelector('#ab-cpu-line').setAttribute('d', line);
        el.querySelector('#ab-cpu-line').style.stroke = cpuColor(cpu);
        el.querySelector('#ab-cpu-area').setAttribute('d', line + 'L' + W + ' ' + H + 'L0 ' + H + 'Z');
        el.querySelector('#ab-cpu-avg').textContent =
          Math.round(cpuHist.reduce((a, b) => a + b, 0) / n) + '%';
        el.querySelector('#ab-cpu-max').textContent = Math.max(...cpuHist) + '%';
      };
      const specEngine = t('about.specEngine');
      const specStorage = t('about.specStorage');
      const specSound = t('about.specSound');
      const specLook = t('about.specLook');
      const specApps = t('about.specApps');
      const specs = [
        specEngine,
        specStorage,
        specSound,
        [specLook[0], specLook[1].replace('{0}', Object.keys(THEMES).length).replace('{1}', WALLPAPERS.length)],
        [specApps[0], specApps[1].replace('{0}', Object.keys(Apps.list).length)],
        t('about.specTests'),
      ];
      el.innerHTML = `
        <div class="br-about-head">
          <div class="br-about-logo">◐</div>
          <div class="br-about-title">${t('about.title')}</div>
          <div class="br-about-ver">${t('about.ver')}</div>
          <div class="br-about-desc">${t('about.desc')}</div>
        </div>
        <div class="br-about-sec">
          <div class="br-about-sec-title">${t('br.live')}</div>
          <div class="br-about-stats">
            <div class="br-about-stat"><div class="bas-k">${t('sm.uptime')}</div><div class="bas-v" id="ab-uptime">0с</div></div>
            <div class="br-about-stat"><div class="bas-k">${t('sm.wins')}</div><div class="bas-v" id="ab-wins">0</div></div>
            <div class="br-about-stat"><div class="bas-k">${t('sm.theme')}</div><div class="bas-v" id="ab-theme">—</div></div>
            <div class="br-about-stat"><div class="bas-k">${t('sm.wall')}</div><div class="bas-v" id="ab-wall">—</div></div>
            <div class="br-about-stat br-about-ram">
              <div class="bas-k">${t('sm.ram')}</div>
              <div class="bas-v" id="ab-ram">0 МБ / 8192 МБ</div>
              <div class="bas-bar"><i id="ab-ram-bar"></i></div>
            </div>
            <div class="br-about-stat br-about-cpu">
              <div class="bas-k">${t('br.cpu')}</div>
              <div class="bas-v" id="ab-cpu">0%</div>
              <svg class="cpu-svg" viewBox="0 0 300 56" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="ab-cpu-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity=".5"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path class="cpu-area" id="ab-cpu-area" d=""/>
                <path class="cpu-line" id="ab-cpu-line" d=""/>
              </svg>
              <div class="cpu-stats">
                <span>${t('br.avg')} <b id="ab-cpu-avg">—</b></span>
                <span>${t('br.max')} <b id="ab-cpu-max">—</b></span>
              </div>
            </div>
            <div class="br-about-stat"><div class="bas-k">${t('br.store')}</div><div class="bas-v" id="ab-store">—</div></div>
          </div>
        </div>
        <div class="br-about-sec">
          <div class="br-about-sec-title">${t('br.quickTheme')}</div>
          <div class="br-about-themes">
            ${Object.entries(THEMES).map(([id, th]) => `
            <button class="br-theme-chip" data-ab-theme="${id}" title="${tf('br.launch', t('theme.' + id))}">
              <i style="background:linear-gradient(135deg,${th.preview.join(',')})"></i>
              <span>${t('theme.' + id)}</span>
            </button>`).join('')}
          </div>
        </div>
        <div class="br-about-sec">
          <div class="br-about-sec-title">${t('br.specs')}</div>
          <div class="br-about-specs">${specs.map(s =>
            `<div class="bas-spec"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>
        </div>
        <div class="br-about-actions">
          <button class="fbtn" id="ab-app" type="button">${t('br.aboutApp')}</button>
          <button class="fbtn" id="ab-settings" type="button">${t('br.openSettings')}</button>
          <button class="fbtn br-about-sleep" id="ab-sleep" type="button">${t('br.sleep')}</button>
          <button class="fbtn br-about-reboot" id="ab-reboot" type="button">${t('br.rebootOs')}</button>
        </div>`;
      el.querySelector('#ab-app').addEventListener('click', () => WM.open('about'));
      el.querySelector('#ab-settings').addEventListener('click', () => navigate('nebula://settings'));
      el.querySelector('#ab-sleep').addEventListener('click', () => SleepMode.enter());
      // Быстрые переключатели темы (тот же источник, что и «Настройки»)
      const markThemes = () => {
        el.querySelectorAll('[data-ab-theme]').forEach(c =>
          c.classList.toggle('is-selected', c.dataset.abTheme === Settings.theme));
      };
      el.querySelector('.br-about-themes').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-ab-theme]');
        if (!chip) return;
        AudioSys.click();
        Settings.applyTheme(chip.dataset.abTheme);
        markThemes();
        refresh();
        notifySystem({ icon: '🎨', title: t('set.theme'), text: tf('nt.themeApplied', t('theme.' + Settings.theme)), app: 'browser' });
      });
      el.querySelector('#ab-reboot').addEventListener('click', () => Boot.reboot());
      markThemes();
      refresh();
      aboutTimer = setInterval(refresh, 1000);
      return el;
    }

    // Страница «Настройки»: быстрые темы и обои прямо в браузере
    function buildSettings() {
      const el = document.createElement('div');
      el.className = 'br-settings';
      const themeCards = Object.entries(THEMES).map(([id, th]) => `
        <button class="br-set-card" data-theme-id="${id}">
          <span class="br-set-preview" style="background:linear-gradient(135deg,${th.preview.join(',')})"></span>
          <span class="br-set-name">${t('theme.' + id)}</span>
          <span class="br-set-desc">${t('theme.' + id + 'Desc')}</span>
        </button>`).join('');
      const wallCards = WALLPAPERS.map(w => `
        <button class="br-set-card" data-wall-id="${w.id}">
          <span class="br-set-preview" style="background:${w.preview}"></span>
          <span class="br-set-name">${t('wall.' + w.id)}</span>
          <span class="br-set-desc">${t('wall.' + w.id + 'Desc')}</span>
        </button>`).join('');
      const mark = () => {
        el.querySelectorAll('[data-theme-id]').forEach(c => c.classList.toggle('is-selected', c.dataset.themeId === Settings.theme));
        el.querySelectorAll('[data-wall-id]').forEach(c => c.classList.toggle('is-selected', c.dataset.wallId === Settings.wallpaper));
      };
      el.innerHTML = `
        <div class="br-settings-head">
          <div class="br-settings-title">${t('br.settingsTitle')}</div>
          <div class="br-settings-sub">${t('br.settingsSub')}</div>
        </div>
        <div class="br-set-sec">
          <div class="br-set-title">${t('set.theme')}</div>
          <div class="br-set-grid">${themeCards}</div>
        </div>
        <div class="br-set-sec">
          <div class="br-set-title">${t('set.wall')}</div>
          <div class="br-set-grid">${wallCards}</div>
        </div>
        <button class="fbtn br-set-reset" type="button">↺ ${t('set.reset')}</button>`;
      el.addEventListener('click', (e) => {
        const th = e.target.closest('[data-theme-id]');
        const wl = e.target.closest('[data-wall-id]');
        if (th) {
          Settings.applyTheme(th.dataset.themeId);
          mark();
          AudioSys.click();
          notifySystem({ icon: '🎨', title: t('set.theme'), text: tf('nt.themeApplied', t('theme.' + Settings.theme)), app: 'browser' });
        }
        if (wl) {
          Settings.applyWallpaper(wl.dataset.wallId);
          mark();
          AudioSys.click();
          notifySystem({ icon: '🖼️', title: t('set.wall'), text: tf('nt.wallApplied', t('wall.' + Settings.wallpaper)), app: 'browser' });
        }
        if (e.target.closest('.br-set-reset')) {
          Settings.reset();
          mark();
          AudioSys.click();
          notifySystem({ icon: '🔁', title: t('nt.settingsReset'), text: t('set.resetDone') });
        }
      });
      mark();
      return el;
    }

    // Страница «Системный трей»: звук и Wi-Fi (тот же источник, что и трей внизу)
    function buildTray() {
      const el = document.createElement('div');
      el.className = 'br-tray';
      const volIco = (v, muted) => {
        const lvl = muted || v === 0 ? 0 : v < .35 ? 1 : v < .7 ? 2 : 3;
        return ['🔇', '🔈', '🔉', '🔊'][lvl];
      };
      const render = () => {
        const muted = AudioSys.muted;
        const v = Math.round(AudioSys.volume * 100);
        el.querySelector('#bt-vol-ico').textContent = volIco(AudioSys.volume, muted);
        el.querySelector('#bt-vol-val').textContent = muted ? t('tray.muted') : v + '%';
        el.querySelector('#bt-vol-slider').value = v;
        const muteBtn = el.querySelector('#bt-mute');
        muteBtn.textContent = muted ? t('tray.unmute') : t('tray.mute');
        muteBtn.classList.toggle('on', muted);
        const wifi = el.querySelector('#bt-wifi');
        wifi.textContent = Tray.wifiOn ? '📶' : '📵';
        wifi.classList.toggle('off', !Tray.wifiOn);
        el.querySelector('#bt-wifi-status').textContent = Tray.wifiOn ? t('br.connected') : t('br.disconnected');
      };
      const nets = [
        { name: 'Nebula-5G',   sig: 3, cur: true },
        { name: 'HomeNET',     sig: 2, cur: false },
        { name: 'Coffee_WiFi', sig: 1, cur: false },
      ];
      el.innerHTML = `
        <div class="br-tray-head">
          <div class="br-tray-title">${t('br.volTitle')}</div>
          <div class="br-tray-sub">${t('br.volSub')}</div>
        </div>
        <div class="br-set-sec">
          <div class="br-set-title">${t('br.vol')}</div>
          <div class="br-tray-card">
            <div class="bt-vol-row">
              <span class="bt-vol-ico" id="bt-vol-ico">🔊</span>
              <input class="bt-vol-slider" id="bt-vol-slider" type="range" min="0" max="100" step="1" value="70" aria-label="${t('tray.vol')}" />
              <span class="bt-vol-val" id="bt-vol-val">70%</span>
            </div>
            <div class="bt-row">
              <button class="fbtn bt-mute" id="bt-mute" type="button">${t('tray.mute')}</button>
              <button class="fbtn" id="bt-test" type="button">${t('br.test')}</button>
            </div>
          </div>
        </div>
        <div class="br-set-sec">
          <div class="br-set-title">${t('br.net')}</div>
          <div class="br-tray-card">
            <div class="bt-wifi-row">
              <button class="bt-wifi" id="bt-wifi" type="button" title="${t('br.net')}">📶</button>
              <div>
                <div class="bt-wifi-name">Nebula-5G</div>
                <div class="bt-wifi-status" id="bt-wifi-status">${t('br.connected')}</div>
              </div>
              <span class="bt-sig">▂▄▆█</span>
            </div>
            <div class="bt-wifi-nets">${nets.map(n => `
              <div class="bt-net${n.cur ? ' cur' : ''}">
                <span class="bt-net-name">${n.name}</span>
                <span class="bt-net-sig">${'▂▄▆█'.slice(0, n.sig)}</span>
                ${n.cur ? `<span class="bt-net-badge">${t('br.connected')}</span>` : ''}
              </div>`).join('')}
            </div>
          </div>
        </div>`;
      // Звук
      el.querySelector('#bt-vol-slider').addEventListener('input', (e) => {
        AudioSys.setVolume(e.target.value / 100);
        render();
      });
      el.querySelector('#bt-mute').addEventListener('click', () => {
        AudioSys.toggleMute();
        render();
        AudioSys.click();
      });
      el.querySelector('#bt-test').addEventListener('click', () => AudioSys.success());
      // Wi-Fi: переключаем состояние трея и синхронизируем его иконку
      el.querySelector('#bt-wifi').addEventListener('click', () => {
        Tray.wifiOn = !Tray.wifiOn;
        Store.set('nebula.wifi', Tray.wifiOn);
        const trayWifi = document.getElementById('tray-wifi');
        if (trayWifi) {
          trayWifi.textContent = Tray.wifiOn ? '📶' : '📵';
          trayWifi.classList.toggle('off', !Tray.wifiOn);
          trayWifi.title = Tray.wifiOn ? t('tray.wifiOn') : t('tray.wifiOff');
        }
        render();
        AudioSys.click();
        notifySystem({ icon: Tray.wifiOn ? '📶' : '📵', title: t('br.net'), text: Tray.wifiOn ? t('br.connected') : t('br.disconnected') });
      });
      render();
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
        { url: 'nebula://vfs', ico: '📁', key: 'br.vfs' },
        { url: 'nebula://apps', ico: '🧩', key: 'br.apps' },
        { url: 'nebula://bookmarks', ico: '★', key: 'br.bmPage' },
        { url: 'nebula://history', ico: '🕘', key: 'br.hisPage' },
        { url: 'nebula://about', ico: '🛰️', key: 'br.about' },
        { url: 'nebula://settings', ico: '🎨', key: 'br.settings' },
        { url: 'nebula://tray', ico: '🔊', key: 'br.tray' },
      ].map(s => `
        <button class="br-quick" data-go="${s.url}">
          <span class="br-q-ico">${s.ico}</span>
          <span class="br-q-name">${t(s.key)}</span>
        </button>`).join('');
      // Избранные приложения (со звёздочкой в лаунчере) — запускаются кликом
      const favTiles = favApps.map(id => Apps.list[id]).filter(Boolean).map(a => `
        <button class="br-quick" data-launch="${a.id}" title="${tf('br.launch', t('app.' + a.id))}">
          <span class="br-q-ico">${a.icon}</span>
          <span class="br-q-name">${escapeHtml(t('app.' + a.id))}</span>
        </button>`).join('');
      el.innerHTML = `
        <div class="br-home-logo">◐</div>
        <div class="br-home-title">${t('br.homeTitle')}</div>
        <form class="br-home-search">
          <input class="br-home-input" placeholder="${t('br.search')}" spellcheck="false" autocomplete="off" aria-label="${t('br.search')}" />
          <button class="fbtn" type="submit">${t('br.find')}</button>
        </form>
        <div class="br-home-sec">
          ${favTiles ? `<div class="br-sec-title">${t('br.favApps')}</div><div class="br-quicks">${favTiles}</div>` : ''}
          <div class="br-sec-title">${t('br.sys')}</div>
          <div class="br-quicks">${sys}</div>
          <div class="br-sec-title">${t('br.quick')}</div>
          <div class="br-quicks">${quick || `<div class="br-empty">${t('br.emptyBm')}</div>`}</div>
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

    // Категории приложений (по id) для лаунчера — ключи словаря i18n
    const APP_CATS = {
      notes: 'office', calendar: 'office',
      files: 'files',
      terminal: 'dev',
      calculator: 'utils',
      music: 'media', browser: 'internet',
      settings: 'system', wallpaper: 'system',
      tictactoe: 'games', snake: 'games', minesweeper: 'games', game2048: 'games', pong: 'games',
      paint: 'utils', editor: 'office',
      about: 'svc',
    };

    // Страница «Приложения»: лаунчер приложений Nebula OS с поиском и категориями
    function buildApps() {
      const el = document.createElement('div');
      el.className = 'br-apps';
      const apps = Object.values(Apps.list);
      const cats = ['all', ...new Set(Object.values(APP_CATS))];
      // Категория и поиск переживают уход со страницы (localStorage)
      const savedCat = Store.get('nebula.browserAppsCat', 'Все');
      const state = {
        q: String(Store.get('nebula.browserAppsQ', '') || ''),
        cat: cats.includes(savedCat) ? savedCat : 'all',
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
        const favTxt = fav ? t('br.favOn') : t('br.favOff');
        return `
        <button class="br-app" data-app="${a.id}" title="${tf('br.launch', t('app.' + a.id))}">
          <span class="br-app-fav${fav ? ' on' : ''}" data-fav="${a.id}" role="button" tabindex="0" title="${favTxt}" aria-label="${favTxt}">★</span>
          <span class="br-app-ico">${a.icon}</span>
          <span class="br-app-name">${escapeHtml(t('app.' + a.id))}</span>
        </button>`;
      };

      el.innerHTML = `
        <div class="br-apps-head">
          <div class="br-apps-title">${t('br.appsTitle')}</div>
          <div class="br-apps-sub" id="br-apps-sub"></div>
        </div>
        <div class="br-apps-search">
          <span class="br-apps-search-ico">⌕</span>
          <input class="br-apps-input" id="br-apps-input" placeholder="${t('br.searchApps')}" spellcheck="false" autocomplete="off" aria-label="${t('br.searchApps')}" />
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
          if (state.cat !== 'all' && APP_CATS[a.id] !== state.cat) return false;
          if (q && !t('app.' + a.id).toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
          return true;
        });
      }

      function render() {
        // Чипы категорий
        chipsEl.innerHTML = cats.map(c =>
          `<button class="br-chip${c === state.cat ? ' active' : ''}" data-cat="${escapeHtml(c)}">${c === 'all' ? escapeHtml(t('cat.all')) : escapeHtml(t('cat.' + c))}</button>`
        ).join('');

        const list = filtered();
        const shown = list.filter(a => a.dock !== false);
        const hidden = list.filter(a => a.dock === false);

        if (!list.length) {
          contentEl.innerHTML = `<div class="br-apps-empty">${t('br.appsEmpty')}</div>`;
          state.sel = 0;
        } else {
          contentEl.innerHTML =
            `<div class="br-apps-grid">${shown.map(tile).join('')}</div>` +
            (hidden.length ? `<div class="br-apps-sec">${t('br.svcSec')}</div><div class="br-apps-grid">${hidden.map(tile).join('')}</div>` : '');
        }
        subEl.textContent = state.q || state.cat !== 'all'
          ? tf('br.appsFound', list.length, apps.length)
          : t('br.appsSub');
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
        el.innerHTML = `<div class="br-page-empty">${t('br.bmEmpty')}</div>`;
        return el;
      }
      el.innerHTML = `
        <div class="br-page-head">
          <span>${t('br.bmPage')}</span>
          <button class="fbtn br-clear" id="br-bm-clear" type="button">${t('br.clearAll')}</button>
        </div>
        <div class="br-page-list">${bookmarks.map(b => `
          <div class="br-item" data-go="${escapeHtml(b.url)}">
            <span class="br-item-ico">${favicon(b.url)}</span>
            <div class="br-item-body">
              <div class="br-item-title">${escapeHtml(b.title || b.url)}</div>
              <div class="br-item-url">${escapeHtml(b.url)}</div>
            </div>
            <button class="br-item-x" data-del="${escapeHtml(b.url)}" title="${t('files.delete')}" aria-label="${t('files.delete')}">✕</button>
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
        el.innerHTML = `<div class="br-page-empty">${t('br.hisEmpty')}</div>`;
        return el;
      }
      el.innerHTML = `
        <div class="br-page-head">
          <span>${t('br.hisPage')}</span>
          <button class="fbtn br-clear" id="br-his-clear" type="button">${t('br.clearAll')}</button>
        </div>
        <div class="br-page-list">${history.slice(0, 50).map(h => `
          <div class="br-item" data-go="${escapeHtml(h.url)}">
            <span class="br-item-ico">${favicon(h.url)}</span>
            <div class="br-item-body">
              <div class="br-item-title">${escapeHtml(h.title || h.url)}</div>
              <div class="br-item-url">${escapeHtml(h.url)} · ${new Date(h.time).toLocaleTimeString(I18N.lang === 'zh' ? 'zh-CN' : I18N.lang === 'ky' ? 'ky-KG' : I18N.lang === 'en' ? 'en-US' : 'ru-RU')}</div>
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
              <div class="br-404-text">${tf('br.404', escapeHtml(path))}</div>
              <button class="fbtn" data-vfs-root="1" type="button">${t('br.root')}</button>
            </div>
          </div>`;
        el.querySelector('[data-vfs-root]').addEventListener('click', () => navigate('nebula://vfs'));
        return el;
      }

      // Хлебные крошки: ⌂ › home › guest …
      const crumbs = () => {
        const parts = path === '/' ? [] : path.split('/').filter(Boolean);
        let acc = '';
        let html = `<button class="br-crumb" data-vfs-go="${escapeHtml(vfsUrlFromPath('/'))}" title="${t('br.vfs')}">⌂</button>`;
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
              <span class="br-vfs-meta">${i.type === 'dir' ? t('br.folder') : VFS.humanSize(i.size)}</span>
            </button>`).join('') : `<div class="br-vfs-empty">${t('files.empty')}</div>`}</div>`;
      } else {
        const content = node.content || '';
        const lines = content.split('\n').length;
        const name = path.split('/').pop();
        el.innerHTML = `
          <div class="br-vfs-crumbs">${crumbs()}</div>
          <div class="br-vfs-file-head">
            <span class="br-vfs-file-ico">${vfsIcon(name)}</span>
            <span class="br-vfs-file-name">${escapeHtml(name)}</span>
            <span class="br-vfs-file-meta">${tf('br.lines', lines, VFS.humanSize(content.length))}</span>
            <button class="fbtn" data-vfs-dl="1" type="button" title="${t('br.dl')}">${t('br.dl')}</button>
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

    // Внешняя страница: iframe + внутренние режимы.
    // Никаких переходов во внешний браузер: если сайт запрещает встраивание,
    // включаем «текстовый режим» (прокси r.jina.ai) или открываем новую вкладку
    // внутри приложения.
    function renderMarkdown(text) {
      const esc = (s) => escapeHtml(String(s));
      const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
      let out = [];
      let i = 0;
      const inline = (s) => esc(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*]+)\*/g, '<i>$1</i>');
      while (i < lines.length) {
        const ln = lines[i];
        const h = ln.match(/^(#{1,6})\s+(.*)$/);
        if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
        if (/^---+\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
        if (/^>\s?/.test(ln)) {
          const q = [];
          while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
          out.push('<blockquote>' + inline(q.join(' ')) + '</blockquote>');
          continue;
        }
        if (/^[-*]\s+/.test(ln)) {
          const items = [];
          while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
          out.push('<ul>' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ul>');
          continue;
        }
        if (/^\s*$/.test(ln)) { i++; continue; }
        const para = [];
        while (i < lines.length && !/^\s*$/.test(lines[i])) { para.push(lines[i]); i++; }
        out.push('<p>' + inline(para.join(' ')) + '</p>');
      }
      // ссылки [текст](url) — клик открывает внутри браузера
      const html = out.join('\n').replace(/\[([^\]]+)\]\(((?:https?:\/\/|nebula:\/\/)[^)\s]+)\)/g,
        (m, tx, u) => `<a href="#" data-go="${esc(u)}">${tx}</a>`);
      return html;
    }

    // Текстовый режим: загружаем страницу через текстовый прокси и рендерим
    // её внутри приложения — ничего не открывается во внешнем браузере.
    function loadTextMode(url) {
      const tab = activeTab();
      if (!tab) return;
      const old = contentEl.querySelector('.br-frame-wrap');
      if (old) old.remove();
      const el = document.createElement('div');
      el.className = 'br-textmode';
      el.innerHTML = `
        <div class="br-textmode-head">
          <span class="br-textmode-title">${escapeHtml(url)}</span>
          <button class="fbtn" id="br-text-back" type="button">${t('br.reload')}</button>
        </div>
        <div class="br-textmode-body"><div class="br-textmode-load">${t('br.loading')}</div></div>`;
      const bodyEl = el.querySelector('.br-textmode-body');
      el.querySelector('#br-text-back').addEventListener('click', () => { AudioSys.click(); render(); });
      // Клики по ссылкам текстового режима — навигация внутри приложения
      bodyEl.addEventListener('click', (e) => {
        const a = e.target.closest('[data-go]');
        if (a) { e.preventDefault(); AudioSys.click(); navigate(a.dataset.go); }
      });
      contentEl.appendChild(el);
      fetch('https://r.jina.ai/' + url, { headers: { 'X-No-Cache': 'true' } })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(txt => { bodyEl.innerHTML = renderMarkdown(txt) || `<p>${escapeHtml(url)}</p>`; })
        .catch(() => { bodyEl.innerHTML = `<div class="br-textmode-err">${t('br.readerFail')}</div>`; });
    }

    function buildFrame(url) {
      const el = document.createElement('div');
      el.className = 'br-frame-wrap';
      const frame = document.createElement('iframe');
      frame.className = 'br-frame' + (darkMode ? ' dark' : '');
      frame.src = url;
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.setAttribute('aria-label', t('br.web'));
      el.appendChild(frame);
      const note = document.createElement('div');
      note.className = 'br-frame-note';
      note.innerHTML = `<span>${t('br.note')}</span>`;
      const textBtn = document.createElement('button');
      textBtn.className = 'fbtn';
      textBtn.textContent = t('br.reader');
      textBtn.title = t('br.reader');
      textBtn.addEventListener('click', () => { AudioSys.click(); loadTextMode(url); });
      const tabBtn = document.createElement('button');
      tabBtn.className = 'fbtn';
      tabBtn.textContent = t('br.tab');
      tabBtn.title = t('br.tab');
      tabBtn.addEventListener('click', () => { AudioSys.click(); addTab(url); });
      note.appendChild(textBtn);
      note.appendChild(tabBtn);
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
    return {
      focus: () => addrEl.focus(),
      destroy: () => {
        root.removeEventListener('keydown', onKey);
        if (aboutTimer) { clearInterval(aboutTimer); aboutTimer = 0; }
      },
    };
  }

  /* ════════════════════════ НОВЫЕ ПРИЛОЖЕНИЯ ════════════════════════ */

  /* ---- Змейка: классическая аркада на canvas ---- */
  function mountSnake(body) {
    const BEST_KEY = 'nebula.snakeBest';
    const SIZE = 20;            // поле 20×20 клеток
    const CELL = 20;            // размер клетки в px
    const SPEED = 135;          // мс на шаг

    const root = document.createElement('div');
    root.className = 'app-snake';
    root.innerHTML = `
      <div class="snake-bar">
        <span class="snake-stat">${t('snake.score')}: <b id="snk-score">0</b></span>
        <span class="snake-stat">${t('snake.best')}: <b id="snk-best">0</b></span>
        <button class="fbtn" id="snk-pause" type="button">${t('snake.pause')}</button>
        <button class="fbtn" id="snk-new" type="button">${t('snake.new')}</button>
      </div>
      <div class="snake-wrap">
        <canvas id="snk-canvas" width="${SIZE * CELL}" height="${SIZE * CELL}" aria-label="Snake"></canvas>
        <div class="snake-overlay" id="snk-overlay" hidden>
          <div class="snake-over-msg" id="snk-over-msg"></div>
          <button class="fbtn" id="snk-over-new" type="button">${t('snake.new')}</button>
        </div>
      </div>
      <div class="snake-hint">${t('snake.hint')}</div>`;

    const canvas = root.querySelector('#snk-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = root.querySelector('#snk-score');
    const bestEl = root.querySelector('#snk-best');
    const pauseBtn = root.querySelector('#snk-pause');
    const overlay = root.querySelector('#snk-overlay');
    const overMsg = root.querySelector('#snk-over-msg');

    let snake, dir, queue, food, score, best, over, paused, timer;

    const randFood = () => {
      do {
        food = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
      } while (snake.some(s => s.x === food.x && s.y === food.y));
    };

    const reset = () => {
      snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
      dir = { x: 1, y: 0 };
      queue = [];
      score = 0;
      over = false;
      paused = false;
      best = Store.get(BEST_KEY, 0);
      bestEl.textContent = best;
      scoreEl.textContent = 0;
      pauseBtn.textContent = t('snake.pause');
      overlay.hidden = true;
      randFood();
      draw();
      clearInterval(timer);
      timer = setInterval(tick, SPEED);
    };

    const draw = () => {
      ctx.clearRect(0, 0, SIZE * CELL, SIZE * CELL);
      // фоновая сетка
      ctx.fillStyle = 'rgba(255,255,255,.045)';
      for (let i = 0; i < SIZE; i++) {
        ctx.fillRect(i * CELL, 0, 1, SIZE * CELL);
        ctx.fillRect(0, i * CELL, SIZE * CELL, 1);
      }
      // еда
      ctx.fillStyle = '#ff5f57';
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      // змейка: голова ярче
      snake.forEach((s, i) => {
        ctx.fillStyle = i === snake.length - 1 ? '#22e0b0' : 'rgba(34,224,176,.75)';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
    };

    const tick = () => {
      if (over || paused) return;
      // применяем очередь поворотов (не более 2 — чтобы не проскочить)
      while (queue.length && queue[0].x === -dir.x && queue[0].y === -dir.y) queue.shift();
      if (queue.length) { dir = queue.shift(); }
      const head = { x: snake[snake.length - 1].x + dir.x, y: snake[snake.length - 1].y + dir.y };
      const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);
      const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
      if (hitSelf || hitWall) { gameOver(); return; }
      snake.push(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        if (score > best) { best = score; Store.set(BEST_KEY, best); bestEl.textContent = best; }
        AudioSys.success();
        randFood();
      } else {
        snake.shift();
      }
      draw();
    };

    const gameOver = () => {
      over = true;
      clearInterval(timer);
      AudioSys.error && AudioSys.error();
      overMsg.textContent = t('snake.over') + ' · ' + t('snake.score') + ': ' + score;
      overlay.hidden = false;
    };

    const turn = (x, y) => {
      if (over) return;
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (last.x === x && last.y === y) return;   // тот же вектор
      if (last.x === -x && last.y === -y) return; // разворот на 180°
      if (queue.length < 2) queue.push({ x, y });
    };

    pauseBtn.addEventListener('click', () => {
      AudioSys.click();
      paused = !paused;
      pauseBtn.textContent = paused ? t('snake.resume') : t('snake.pause');
      if (!over) { overlay.hidden = !paused; overMsg.textContent = t('snake.pause'); }
    });
    const onNew = () => { AudioSys.click(); reset(); };
    root.querySelector('#snk-new').addEventListener('click', onNew);
    root.querySelector('#snk-over-new').addEventListener('click', onNew);

    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'p') { e.preventDefault(); pauseBtn.click(); return; }
      const map = {
        arrowup: [0, -1], w: [0, -1],
        arrowdown: [0, 1], s: [0, 1],
        arrowleft: [-1, 0], a: [-1, 0],
        arrowright: [1, 0], d: [1, 0],
      };
      if (map[k]) { e.preventDefault(); turn(map[k][0], map[k][1]); }
    };
    root.addEventListener('keydown', onKey);

    reset();
    body.appendChild(root);
    return {
      focus: () => canvas.focus(),
      destroy: () => {
        clearInterval(timer);
        root.removeEventListener('keydown', onKey);
      },
    };
  }

  /* ---- Сапёр: классический Minesweeper с флагами и таймером ---- */
  function mountMinesweeper(body) {
    const DIFFS = {
      easy:   { cols: 9,  rows: 9,  mines: 10 },
      medium: { cols: 16, rows: 16, mines: 40 },
      hard:   { cols: 30, rows: 16, mines: 99 },
    };
    const root = document.createElement('div');
    root.className = 'app-ms';
    root.innerHTML = `
      <div class="ms-bar">
        <div class="ms-modes" role="group">
          <button class="ttt-mode ms-mode" data-diff="easy" type="button">${t('ms.easy')}</button>
          <button class="ttt-mode ms-mode" data-diff="medium" type="button">${t('ms.medium')}</button>
          <button class="ttt-mode ms-mode" data-diff="hard" type="button">${t('ms.hard')}</button>
        </div>
        <div class="ms-meta">
          <span class="ms-chip">${t('ms.mines')} <b id="ms-mines">10</b></span>
          <button class="ms-face" id="ms-face" type="button" title="${t('ms.restart')}">🙂</button>
          <span class="ms-chip">${t('ms.time')} <b id="ms-time">0</b></span>
        </div>
      </div>
      <div class="ms-board" id="ms-board" role="grid"></div>
      <div class="ms-hint">${t('ms.hint')}</div>`;

    const boardEl = root.querySelector('#ms-board');
    const minesEl = root.querySelector('#ms-mines');
    const timeEl = root.querySelector('#ms-time');
    const faceEl = root.querySelector('#ms-face');
    const modeBtns = root.querySelectorAll('.ms-mode');

    let diff = 'easy';
    let grid = [];        // grid[y][x] = { mine, adj, rev, flag }
    let revealed = 0;
    let totalSafe = 0;
    let flags = 0;
    let started = false;  // мины расставляются после первого клика
    let over = false;
    let win = false;
    let timer = 0;
    let sec = 0;

    const clearTimer = () => { clearInterval(timer); timer = 0; };
    const refreshMeta = () => {
      minesEl.textContent = Math.max(0, DIFFS[diff].mines - flags);
      timeEl.textContent = sec;
    };

    const build = () => {
      const { cols, rows } = DIFFS[diff];
      grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ mine: false, adj: 0, rev: false, flag: false })));
      revealed = 0;
      flags = 0;
      started = false;
      over = false;
      win = false;
      sec = 0;
      totalSafe = cols * rows - DIFFS[diff].mines;
      clearTimer();
      refreshMeta();
      faceEl.textContent = '🙂';
      boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--ms-cell))`;
      boardEl.innerHTML = '';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const btn = document.createElement('button');
          btn.className = 'ms-cell';
          btn.dataset.x = x;
          btn.dataset.y = y;
          btn.setAttribute('aria-label', `${x + 1},${y + 1}`);
          btn.addEventListener('click', () => reveal(x, y));
          btn.addEventListener('contextmenu', (e) => { e.preventDefault(); flag(x, y); });
          boardEl.appendChild(btn);
        }
      }
    };

    const cell = (x, y) => grid[y] && grid[y][x];

    // Мины ставятся после первого клика — клетка и её соседи гарантированно пусты
    const placeMines = (fx, fy) => {
      const { cols, rows, mines } = DIFFS[diff];
      const safe = new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        safe.add((fy + dy) * cols + (fx + dx));
      }
      let placed = 0;
      while (placed < mines) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (safe.has(y * cols + x) || grid[y][x].mine) continue;
        grid[y][x].mine = true;
        placed++;
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const c = cell(x + dx, y + dy);
          if (c && c.mine) n++;
        }
        grid[y][x].adj = n;
      }
    };

    const reveal = (x, y) => {
      const c = cell(x, y);
      if (!c || over || win || c.rev || c.flag) return;
      if (!started) {
        started = true;
        placeMines(x, y);
        timer = setInterval(() => { if (!over && !win) { sec++; refreshMeta(); } }, 1000);
      }
      AudioSys.click();
      if (c.mine) { lose(); return; }
      // заливка пустых областей
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        const cc = cell(cx, cy);
        if (!cc || cc.rev || cc.flag || cc.mine) continue;
        cc.rev = true;
        revealed++;
        if (cc.adj === 0) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            stack.push([cx + dx, cy + dy]);
          }
        }
      }
      renderCells();
      if (revealed === totalSafe) winGame();
    };

    const flag = (x, y) => {
      const c = cell(x, y);
      if (!c || over || win || c.rev) return;
      AudioSys.click();
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      refreshMeta();
      renderCells();
    };

    const lose = () => {
      over = true;
      clearTimer();
      faceEl.textContent = '😵';
      AudioSys.error && AudioSys.error();
      grid.forEach(row => row.forEach(c => { if (c.mine) c.rev = true; }));
      renderCells();
    };

    const winGame = () => {
      win = true;
      clearTimer();
      faceEl.textContent = '😎';
      AudioSys.success();
      grid.forEach(row => row.forEach(c => { if (c.mine && !c.flag) c.flag = true; }));
      flags = DIFFS[diff].mines;
      refreshMeta();
      renderCells();
    };

    const renderCells = () => {
      const btns = boardEl.children;
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const c = grid[y][x];
          const btn = btns[y * grid[y].length + x];
          btn.className = 'ms-cell' + (c.rev ? ' rev' : '') + (c.flag ? ' flag' : '');
          btn.textContent = '';
          if (c.flag) btn.textContent = '🚩';
          else if (c.rev && c.mine) btn.textContent = '💣';
          else if (c.rev && c.adj > 0) btn.textContent = c.adj;
          btn.classList.toggle('m1', c.adj === 1);
          btn.classList.toggle('m2', c.adj === 2);
          btn.classList.toggle('m3', c.adj >= 3);
        }
      }
    };

    modeBtns.forEach(b => b.addEventListener('click', () => {
      AudioSys.click();
      diff = b.dataset.diff;
      modeBtns.forEach(x => x.classList.toggle('active', x === b));
      build();
    }));
    faceEl.addEventListener('click', () => { AudioSys.click(); build(); });

    build();
    body.appendChild(root);
    return { destroy: clearTimer };
  }

  /* ---- Рисовалка: холст, кисти, палитра, сохранение PNG ---- */
  function mountPaint(body) {
    const W = 720, H = 440;
    const PALETTE = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#0f172a', '#ffffff'];
    const root = document.createElement('div');
    root.className = 'app-paint';
    root.innerHTML = `
      <div class="pt-bar">
        <div class="pt-palette" role="group" aria-label="${t('pt.color')}">
          ${PALETTE.map(c => `<button class="pt-swatch" data-c="${c}" style="background:${c}" type="button" aria-label="${c}"></button>`).join('')}
        </div>
        <label class="pt-size">${t('pt.brush')} <input type="range" id="pt-brush" min="2" max="40" value="6" aria-label="${t('pt.brush')}" /></label>
        <button class="fbtn" id="pt-eraser" type="button">${t('pt.eraser')}</button>
        <button class="fbtn" id="pt-clear" type="button">${t('pt.clear')}</button>
        <button class="fbtn" id="pt-save" type="button">${t('pt.save')}</button>
      </div>
      <div class="pt-wrap">
        <canvas id="pt-canvas" width="${W}" height="${H}" aria-label="${t('app.paint')}"></canvas>
      </div>
      <div class="pt-hint">${t('pt.hint')}</div>`;

    const canvas = root.querySelector('#pt-canvas');
    const ctx = canvas.getContext('2d');
    const brushEl = root.querySelector('#pt-brush');
    const eraserBtn = root.querySelector('#pt-eraser');

    let color = PALETTE[4];
    let erasing = false;
    let drawing = false;
    let last = null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (W / r.width),
        y: (e.clientY - r.top) * (H / r.height),
      };
    };

    const stroke = (p) => {
      ctx.strokeStyle = erasing ? '#ffffff' : color;
      ctx.lineWidth = +brushEl.value;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drawing = true;
      last = pos(e);
      ctx.fillStyle = erasing ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(last.x, last.y, +brushEl.value / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      e.preventDefault();
      stroke(pos(e));
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointerleave', stop);

    root.querySelectorAll('.pt-swatch').forEach(s => s.addEventListener('click', () => {
      AudioSys.click();
      color = s.dataset.c;
      erasing = false;
      eraserBtn.classList.remove('on');
      root.querySelectorAll('.pt-swatch').forEach(x => x.classList.toggle('active', x === s));
    }));
    eraserBtn.addEventListener('click', () => {
      AudioSys.click();
      erasing = !erasing;
      eraserBtn.classList.toggle('on', erasing);
      root.querySelectorAll('.pt-swatch').forEach(x => x.classList.remove('active'));
    });
    root.querySelector('#pt-clear').addEventListener('click', () => {
      AudioSys.click();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
    });
    root.querySelector('#pt-save').addEventListener('click', () => {
      AudioSys.click();
      try {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'nebula-paint.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        notifySystem({ icon: '🎨', title: t('app.paint'), text: t('pt.saved') });
      } catch { /* jsdom и старые браузеры */ }
    });

    body.appendChild(root);
    return { focus: () => canvas.focus() };
  }

  /* ---- 2048: головоломка на стрелках ---- */
  function mount2048(body) {
    const BEST_KEY = 'nebula.g2048Best';
    const root = document.createElement('div');
    root.className = 'app-g2048';
    root.innerHTML = `
      <div class="g2048-bar">
        <span class="g2048-logo">2048</span>
        <div class="g2048-stats">
          <span class="g2048-chip">${t('g.score')}<b id="g2048-score">0</b></span>
          <span class="g2048-chip">${t('g.best')}<b id="g2048-best">0</b></span>
        </div>
        <button class="fbtn" id="g2048-new" type="button">${t('g.new')}</button>
      </div>
      <div class="g2048-banner" id="g2048-banner" hidden>${t('g.win')}</div>
      <div class="g2048-wrap">
        <div class="g2048-grid" id="g2048-grid" role="grid" aria-label="2048"></div>
        <div class="g2048-overlay" id="g2048-overlay" hidden>
          <div class="g2048-over-msg" id="g2048-over-msg"></div>
          <button class="fbtn" id="g2048-over-new" type="button">${t('g.new')}</button>
        </div>
      </div>
      <div class="g2048-hint">${t('g.hint')}</div>`;

    const gridEl = root.querySelector('#g2048-grid');
    const scoreEl = root.querySelector('#g2048-score');
    const bestEl = root.querySelector('#g2048-best');
    const banner = root.querySelector('#g2048-banner');
    const overlay = root.querySelector('#g2048-overlay');
    const overMsg = root.querySelector('#g2048-over-msg');

    let board, score, best, over, won;
    const N = 4;

    const cellColor = (v) => {
      const map = { 2: '#3a3f5c', 4: '#4a4f78', 8: '#5b5f9e', 16: '#6d5fb8', 32: '#8b5cf6', 64: '#a855f7', 128: '#d946ef', 256: '#ec4899', 512: '#f43f5e', 1024: '#f97316', 2048: '#facc15' };
      return map[v] || '#f8fafc';
    };

    const reset = () => {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      score = 0;
      over = false;
      won = false;
      best = Store.get(BEST_KEY, 0);
      bestEl.textContent = best;
      scoreEl.textContent = 0;
      banner.hidden = true;
      overlay.hidden = true;
      spawn(); spawn();
      render();
    };

    const spawn = () => {
      const empty = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) empty.push([x, y]);
      if (!empty.length) return;
      const [x, y] = empty[Math.floor(Math.random() * empty.length)];
      board[y][x] = Math.random() < .9 ? 2 : 4;
    };

    const render = () => {
      gridEl.innerHTML = board.map((row, y) => row.map((v, x) => {
        const cls = 'g2048-cell' + (v ? ' has' : '') + (v >= 2048 ? ' win' : '');
        return `<div class="${cls}" style="background:${v ? cellColor(v) : 'rgba(255,255,255,.05)'};color:${v >= 8 ? '#fff' : 'var(--text)'}">${v || ''}</div>`;
      }).join('')).join('');
    };

    // Сдвиг и слияние в одном направлении; возвращает, изменилось ли поле
    const slide = (dx, dy) => {
      let moved = false;
      const line = (items) => {
        const vals = items.filter(v => v !== 0);
        const merged = [];
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] === vals[i + 1]) { merged.push(vals[i] * 2); score += vals[i] * 2; i++; moved = true; }
          else merged.push(vals[i]);
        }
        while (merged.length < N) merged.push(0);
        return merged;
      };
      for (let i = 0; i < N; i++) {
        let items = [];
        for (let j = 0; j < N; j++) items.push(board[(dy === 1 ? N - 1 - j : dy === -1 ? j : i)][(dx === 1 ? N - 1 - j : dx === -1 ? j : i)]);
        const res = line(items);
        for (let j = 0; j < N; j++) {
          const ny = dy === 1 ? N - 1 - j : dy === -1 ? j : i;
          const nx = dx === 1 ? N - 1 - j : dx === -1 ? j : i;
          if (board[ny][nx] !== res[j]) moved = true;
          board[ny][nx] = res[j];
        }
      }
      return moved;
    };

    const canMove = () => {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!board[y][x]) return true;
        if (x + 1 < N && board[y][x] === board[y][x + 1]) return true;
        if (y + 1 < N && board[y][x] === board[y + 1][x]) return true;
      }
      return false;
    };

    const move = (dx, dy) => {
      if (over) return;
      if (!slide(dx, dy)) return;
      spawn();
      scoreEl.textContent = score;
      if (score > best) { best = score; Store.set(BEST_KEY, best); bestEl.textContent = best; }
      if (!won && board.flat().includes(2048)) {
        won = true;
        banner.hidden = false;
        AudioSys.success();
      }
      render();
      if (!canMove()) {
        over = true;
        AudioSys.error && AudioSys.error();
        overMsg.textContent = t('g.over') + ' · ' + t('g.score') + ': ' + score;
        overlay.hidden = false;
      }
    };

    const onKey = (e) => {
      const map = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
      const v = map[e.key.toLowerCase()];
      if (!v) return;
      e.preventDefault();
      move(v[0], v[1]);
    };
    root.addEventListener('keydown', onKey);
    const onNew = () => { AudioSys.click(); reset(); };
    root.querySelector('#g2048-new').addEventListener('click', onNew);
    root.querySelector('#g2048-over-new').addEventListener('click', onNew);

    reset();
    body.appendChild(root);
    return {
      focus: () => gridEl.focus(),
      destroy: () => root.removeEventListener('keydown', onKey),
    };
  }

  /* ---- Пинг-понг: аркада против бота на canvas ---- */
  function mountPong(body) {
    const W = 640, H = 400;
    const PAD_W = 10, PAD_H = 80;
    const WIN_SCORE = 7;
    const root = document.createElement('div');
    root.className = 'app-pong';
    root.innerHTML = `
      <div class="pong-bar">
        <span class="pong-score">${t('p.you')} <b id="pong-you">0</b></span>
        <span class="pong-score">${t('p.bot')} <b id="pong-bot">0</b></span>
        <button class="fbtn" id="pong-restart" type="button">${t('p.restart')}</button>
      </div>
      <div class="pong-wrap">
        <canvas id="pong-canvas" width="${W}" height="${H}" aria-label="Pong"></canvas>
        <div class="pong-overlay" id="pong-overlay">
          <div class="pong-over-msg" id="pong-over-msg">${t('p.start')}</div>
          <button class="fbtn" id="pong-go" type="button">${t('p.start')}</button>
        </div>
      </div>
      <div class="pong-hint">${t('p.hint')}</div>`;

    const canvas = root.querySelector('#pong-canvas');
    const ctx = canvas.getContext('2d');
    const youEl = root.querySelector('#pong-you');
    const botEl = root.querySelector('#pong-bot');
    const overlay = root.querySelector('#pong-overlay');
    const overMsg = root.querySelector('#pong-over-msg');
    const goBtn = root.querySelector('#pong-go');

    let youY, botY, ball, vx, vy, youScore, botScore, running, raf, lastT, keys;

    const resetBall = (dir) => {
      ball = { x: W / 2, y: H / 2 };
      const ang = (Math.random() * .7 - .35) * Math.PI / 2;
      vx = dir * Math.cos(ang) * 5.4;
      vy = Math.sin(ang) * 5.4;
    };

    const reset = (start = false) => {
      youY = H / 2 - PAD_H / 2;
      botY = H / 2 - PAD_H / 2;
      youScore = 0; botScore = 0;
      running = start;
      keys = { w: false, s: false };
      youEl.textContent = 0; botEl.textContent = 0;
      overlay.hidden = running;
      overMsg.textContent = t('p.start');
      goBtn.textContent = t('p.start');
      resetBall(1);
      lastT = performance.now();
      if (!raf) loop(lastT);
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(32, now - lastT);
      lastT = now;
      if (running) {
        // игрок: клавиши W/S
        const keySpeed = .45 * dt;
        if (keys.w) youY = Math.max(0, youY - keySpeed);
        if (keys.s) youY = Math.min(H - PAD_H, youY + keySpeed);
        // бот: догоняет мяч с ограниченной скоростью
        const botSpeed = .32 * dt;
        const target = ball.y - PAD_H / 2;
        if (botY + PAD_H / 2 < ball.y - 6) botY = Math.min(H - PAD_H, botY + botSpeed);
        else if (botY + PAD_H / 2 > ball.y + 6) botY = Math.max(0, botY - botSpeed);
        // физика мяча
        ball.x += vx * dt;
        ball.y += vy * dt;
        if (ball.y < 8 || ball.y > H - 8) { vy = -vy; ball.y = Math.max(8, Math.min(H - 8, ball.y)); }
        // отскок от ракеток (с углом по месту удара)
        const hit = (paddleX, paddleY, dir) => {
          if (ball.x > paddleX - 8 && ball.x < paddleX + 8 &&
              ball.y > paddleY - 6 && ball.y < paddleY + PAD_H + 6) {
            const rel = (ball.y - (paddleY + PAD_H / 2)) / (PAD_H / 2);
            vx = dir * Math.abs(vx) * 1.06;
            vy = rel * 6.2;
            AudioSys.click();
            return true;
          }
          return false;
        };
        if (hit(PAD_W + 6, youY, 1)) ball.x = PAD_W + 14;
        else if (hit(W - PAD_W - 6, botY, -1)) ball.x = W - PAD_W - 14;
        // гол
        if (ball.x < -20) { botScore++; botEl.textContent = botScore; AudioSys.error && AudioSys.error(); checkEnd(); resetBall(-1); }
        else if (ball.x > W + 20) { youScore++; youEl.textContent = youScore; AudioSys.success(); checkEnd(); resetBall(1); }
      }
      draw();
    };

    const checkEnd = () => {
      if (youScore >= WIN_SCORE || botScore >= WIN_SCORE) {
        running = false;
        overMsg.textContent = youScore >= WIN_SCORE ? t('p.win') : t('p.lose');
        goBtn.textContent = t('p.restart');
        overlay.hidden = false;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // центральная линия
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      for (let y = 0; y < H; y += 22) ctx.fillRect(W / 2 - 1, y, 2, 12);
      // ракетки
      ctx.fillStyle = 'var(--accent-2)';
      ctx.fillRect(14, youY, PAD_W, PAD_H);
      ctx.fillStyle = 'var(--accent)';
      ctx.fillRect(W - 24, botY, PAD_W, PAD_H);
      // мяч
      ctx.fillStyle = '#fff';
      ctx.fillRect(ball.x - 5, ball.y - 5, 10, 10);
    };

    // мышь двигает ракетку игрока
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      youY = Math.max(0, Math.min(H - PAD_H, (e.clientY - r.top) * (H / r.height) - PAD_H / 2));
    });
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 's') { e.preventDefault(); keys[k] = e.type === 'keydown'; }
      if (k === ' ' || k === 'p') { e.preventDefault(); }
    };
    root.addEventListener('keydown', onKey);
    root.addEventListener('keyup', onKey);
    goBtn.addEventListener('click', () => {
      AudioSys.click();
      if (youScore >= WIN_SCORE || botScore >= WIN_SCORE) reset(true);
      else { running = true; overlay.hidden = true; }
    });
    root.querySelector('#pong-restart').addEventListener('click', () => { AudioSys.click(); reset(true); });

    reset(false);
    body.appendChild(root);
    return {
      focus: () => canvas.focus(),
      destroy: () => {
        cancelAnimationFrame(raf);
        raf = 0;
        root.removeEventListener('keydown', onKey);
        root.removeEventListener('keyup', onKey);
      },
    };
  }

  /* ---- Редактор: текстовый редактор с сохранением в VFS ---- */
  function mountEditor(body) {
    const HOME = '/home/guest';
    const root = document.createElement('div');
    root.className = 'app-editor';
    root.innerHTML = `
      <div class="ed-bar">
        <input class="ed-name" id="ed-name" value="untitled.txt" spellcheck="false" aria-label="${t('ed.name')}" />
        <button class="fbtn" id="ed-new" type="button" title="${t('ed.new')}">${t('ed.new')}</button>
        <button class="fbtn" id="ed-open" type="button" title="${t('ed.open')}">${t('ed.open')}</button>
        <button class="fbtn" id="ed-save" type="button" title="${t('ed.save')} (Ctrl+S)">${t('ed.save')}</button>
      </div>
      <textarea class="ed-body" id="ed-body" spellcheck="false" placeholder="${t('ed.ctrlS')}"></textarea>
      <div class="ed-status"><span id="ed-count"></span><span id="ed-saved"></span></div>
      <div class="ed-modal" id="ed-modal" hidden>
        <div class="ed-modal-box">
          <div class="ed-modal-title">${t('ed.openTitle')}</div>
          <div class="ed-modal-list" id="ed-modal-list"></div>
          <button class="fbtn" id="ed-modal-close" type="button">✕</button>
        </div>
      </div>`;

    const nameEl = root.querySelector('#ed-name');
    const bodyEl = root.querySelector('#ed-body');
    const countEl = root.querySelector('#ed-count');
    const savedEl = root.querySelector('#ed-saved');
    const modal = root.querySelector('#ed-modal');
    const modalList = root.querySelector('#ed-modal-list');
    let current = ''; // последний сохранённый путь

    const updateCount = () => {
      const lines = bodyEl.value.split('\n').length;
      countEl.textContent = tf('ed.lines', lines, bodyEl.value.length);
    };

    const save = () => {
      let name = nameEl.value.trim();
      if (!name) name = 'untitled.txt';
      const path = VFS.norm(name.includes('/') ? name : HOME + '/' + name);
      VFS.writeFile(path, bodyEl.value);
      current = path;
      savedEl.textContent = tf('ed.saved', path);
      notifySystem({ icon: '✏️', title: t('app.editor'), text: tf('ed.saved', path) });
    };

    const openFile = (path) => {
      const content = VFS.readFile(path);
      if (content === null) { savedEl.textContent = t('ed.notFound'); return; }
      bodyEl.value = content;
      nameEl.value = path.split('/').pop();
      current = path;
      modal.hidden = true;
      updateCount();
    };

    const renderList = () => {
      const items = VFS.readDir(HOME) || [];
      const files = items.filter(i => i.type === 'file');
      modalList.innerHTML = files.length
        ? files.map(f => `<button class="ed-file" data-p="${escapeHtml(VFS.norm(HOME + '/' + f.name))}" type="button">📄 ${escapeHtml(f.name)}</button>`).join('')
        : `<div class="ed-empty">${t('ed.empty')}</div>`;
      modalList.querySelectorAll('.ed-file').forEach(b => b.addEventListener('click', () => {
        AudioSys.click();
        openFile(b.dataset.p);
      }));
    };

    root.querySelector('#ed-new').addEventListener('click', () => {
      AudioSys.click();
      bodyEl.value = '';
      nameEl.value = 'untitled.txt';
      current = '';
      savedEl.textContent = '';
      updateCount();
      bodyEl.focus();
    });
    root.querySelector('#ed-open').addEventListener('click', () => {
      AudioSys.click();
      renderList();
      modal.hidden = false;
    });
    root.querySelector('#ed-modal-close').addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    root.querySelector('#ed-save').addEventListener('click', () => { AudioSys.click(); save(); });
    bodyEl.addEventListener('input', updateCount);
    bodyEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        AudioSys.click();
        save();
      }
    });

    updateCount();
    body.appendChild(root);
    return { focus: () => bodyEl.focus() };
  }

  const Apps = {
    list: {
      notes:      { id: 'notes',      name: 'Заметки',        icon: '📝', width: 460, height: 500, mount: mountNotes },
      terminal:   { id: 'terminal',   name: 'Терминал',       icon: '💻', width: 600, height: 420, mount: mountTerminal },
      calculator: { id: 'calculator', name: 'Калькулятор',    icon: '🧮', width: 320, height: 470, mount: mountCalculator },
      settings:   { id: 'settings',   name: 'Настройки',      icon: '🎨', width: 480, height: 540, mount: mountSettings },
      files:      { id: 'files',      name: 'Файлы',          icon: '📁', width: 660, height: 470, mount: mountFiles },
      music:      { id: 'music',      name: 'Музыка',         icon: '🎵', width: 420, height: 560, mount: mountMusic },
      calendar:   { id: 'calendar',   name: 'Календарь',      icon: '📅', width: 700, height: 480, mount: mountCalendar },
      browser:    { id: 'browser',    name: 'Браузер',        icon: '🌐', width: 760, height: 540, mount: mountBrowser },
      tictactoe:  { id: 'tictactoe',  name: 'Крестики-нолики', icon: '❌', width: 380, height: 480, mount: mountTicTacToe },
      wallpaper:  { id: 'wallpaper',  name: 'Обои',           icon: '🖼️', width: 540, height: 480, mount: mountWallpaper },
      about:      { id: 'about',      name: 'О системе',      icon: '🛰️', width: 380, height: 300, mount: mountAbout, dock: false },
      snake:      { id: 'snake',      name: 'Змейка',         icon: '🐍', width: 460, height: 560, mount: mountSnake },
      minesweeper:{ id: 'minesweeper', name: 'Сапёр',         icon: '💣', width: 400, height: 520, mount: mountMinesweeper },
      paint:      { id: 'paint',      name: 'Рисовалка',      icon: '🎨', width: 720, height: 560, mount: mountPaint },
      game2048:   { id: 'game2048',   name: '2048',           icon: '🔢', width: 420, height: 560, mount: mount2048 },
      pong:       { id: 'pong',       name: 'Пинг-понг',      icon: '🕹️', width: 660, height: 520, mount: mountPong },
      editor:     { id: 'editor',     name: 'Редактор',       icon: '✏️', width: 640, height: 520, mount: mountEditor },
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
        ic.setAttribute('aria-label', `${t('app.' + app.id)} — ${t('di.open')}`);
        ic.title = t('app.' + app.id);
        ic.innerHTML = `<span class="di-ico">${app.icon}</span><span class="di-label">${t('app.' + app.id)}</span>`;

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

    // Пересборка иконок после смены языка
    rebuild() {
      this.el.innerHTML = '';
      this.init();
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
        { icon: '💻', label: t('ctx.term'), act: 'terminal' },
        { icon: '📝', label: t('ctx.notes'), act: 'notes' },
        { icon: '🎵', label: t('ctx.music'), act: 'music' },
        { icon: '📁', label: t('ctx.files'), act: 'files' },
        { icon: '🌐', label: t('ctx.browser'), act: 'browser' },
        { icon: '🎨', label: t('ctx.settings'), act: 'settings' },
        { sep: true },
        { icon: '🖼️', label: t('ctx.nextWall'), act: 'nextWall' },
        { icon: '🛰️', label: t('ctx.about'), act: 'about' },
        { sep: true },
        { icon: '🔁', label: t('ctx.reboot'), act: 'reload' },
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
    // Выбор языка на экране загрузки: применяем сразу, пересобираем интерфейс
    // и обновляем подсказку шагов (передаётся колбэком из init/тестов).
    wireLang(boot, onLang) {
      const langBtns = boot.querySelectorAll('.boot-lang');
      const markLang = () => {
        langBtns.forEach(b => b.classList.toggle('active', b.dataset.lang === I18N.lang));
      };
      markLang();
      langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!I18N.setLang(btn.dataset.lang)) return;
          markLang();
          Dock.rebuild();
          DesktopIcons.rebuild();
          StartMenu.build();
          AudioSys.click();
          if (onLang) onLang();
        });
      });
    },

    init() {
      // Применяем сохранённые настройки до отрисовки
      Settings.applyTheme(Settings.theme);
      Settings.applyWallpaper(Settings.wallpaper);

      const boot = document.getElementById('boot');
      const hint = document.getElementById('boot-hint');
      let steps = t('boot.steps');
      let i = 0;
      const iv = setInterval(() => {
        i = Math.min(i + 1, steps.length - 1);
        hint.textContent = steps[i];
      }, 420);

      this.wireLang(boot, () => {
        steps = t('boot.steps');
        hint.textContent = steps[Math.min(i, steps.length - 1)];
      });

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
              title: t('nt.welcome'),
              text: t('nt.welcomeText'),
              app: 'files',
              timeout: 8000,
            });
          }
          Notif.push({ icon: '🚀', title: t('nt.ready'), text: t('nt.readyText') });
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

    document.documentElement.lang = I18N.lang;
    AudioSys.init();
    VFS.init();
    WM.init();
    Dock.init();
    DesktopIcons.init();
    Notif.init();
    Ctx.init();
    Bg.init();
    WallFx.init();
    Tray.init();
    MenuBar.init();
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
      MenuBar.setApp(null);
    });
  }

  return { init, WM, Settings, Apps, Matrix, Notif, AudioSys, Bg, Tray, StartMenu, I18N, applyLang, Boot };
})();

// Старт ОС после загрузки DOM
document.addEventListener('DOMContentLoaded', () => Nebula.init());
