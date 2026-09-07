/**
 * ХРАНИЛИЩЕ ДАННЫХ, СЖАТИЕ И ТЕМЫ (js/storage.js)
 */

const DEFAULT_CONTACTS = {
  phone1: '8 (905) 532-12-36',
  phone2: '8 (963) 978-37-49',
  messengers: 'MAX (с 11:00 до 17:00)',
  telegramLink: 'https://max.ru/',
  callsHours: 'Ежедневно с 11:00 до 17:00',
  visitDays: 'Среда – Воскресенье (по записи)',
  volunteerDays: 'Суббота и Воскресенье с 11:00 до 16:00',
  visitNotice: '* Просим предварительно предупреждать о визите по телефону!',
  location: 'Ленинский район / Московская область',
  address: 'Высылается волонтером после записи на визит',
  email: 'info@priyut-dogs.ru',
  vkLink: '#',
  tgChannelLink: '#'
};

// Функция экранирования HTML для защиты от XSS
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// --- РАБОТА С ТЕМАМИ (СВЕТЛАЯ / ТЕМНАЯ) ---
function initTheme() {
  const savedTheme = localStorage.getItem('siteTheme') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('siteTheme', theme);
  
  // Обновляем всплывающую подсказку для тумблера
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(btn => {
    btn.setAttribute('title', theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему');
  });
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('siteTheme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

// Авто-инициализация темы
initTheme();

// --- РАБОТА С ХРАНИЛИЩЕМ КОНТАКТОВ И СОБАК ---
function getContacts() {
  try {
    const stored = localStorage.getItem('contactsData');
    return stored ? JSON.parse(stored) : DEFAULT_CONTACTS;
  } catch (err) {
    console.error('Ошибка чтения контактов из localStorage:', err);
    return DEFAULT_CONTACTS;
  }
}

function saveContacts(contacts) {
  try {
    localStorage.setItem('contactsData', JSON.stringify(contacts));
  } catch (err) {
    console.error('Ошибка сохранения контактов в localStorage:', err);
    alert('Не удалось сохранить контакты. Возможно, превышен лимит локального хранилища.');
  }
}

function getDogs() {
  try {
    const stored = localStorage.getItem('dogsData');
    if (!stored) return [];
    const data = JSON.parse(stored);
    // Поддержка версионированного кэша: { version, dogs }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.dogs)) return data.dogs;
    return [];
  } catch (err) {
    console.error('Ошибка чтения базы собак из localStorage:', err);
    return [];
  }
}

function saveDogs(dogs) {
  try {
    localStorage.setItem('dogsData', JSON.stringify({
      version: DOGS_DATA_VERSION,
      savedAt: new Date().toISOString(),
      dogs: dogs
    }));
  } catch (err) {
    console.error('Ошибка сохранения базы собак в localStorage:', err);
    alert('Превышен лимит памяти хранилища браузера! Удалите неактуальные анкеты или используйте изображения меньшего размера.');
  }
}

function deleteDogById(id) {
  const dogs = getDogs().filter(dog => dog.id !== id);
  saveDogs(dogs);
}

function saveOrUpdateDog(dogData) {
  const dogs = getDogs();
  const existingIndex = dogs.findIndex(d => d.id === dogData.id);

  if (existingIndex !== -1) {
    dogs[existingIndex] = dogData;
  } else {
    dogs.unshift(dogData);
  }
  saveDogs(dogs);
}

// Сжатие фото через Canvas
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- РЕПОЗИТОРИЙ С КАРТИНКАМИ (GitHub API) ---
// Картинки хранятся в папке images/ репозитория podari_dom
const IMG_REPO_OWNER = 'zarmail52';
const IMG_REPO = 'podari_dom';
const IMG_BRANCH = 'main';
const IMG_DIR = 'images';
const IMG_CACHE_KEY = 'repoImagesCache';
const IMG_CACHE_TTL = 10 * 60 * 1000; // 10 минут

// Возвращает полный URL картинки по имени файла из папки images/ репозитория podari_dom
function getImageUrl(filename) {
  if (!filename) return '';
  // Если это уже полный URL (data:, http, https, //) — используем как есть
  if (/^(data:|https?:|\/\/)/i.test(filename)) return filename;
  return `https://raw.githubusercontent.com/${IMG_REPO_OWNER}/${IMG_REPO}/${IMG_BRANCH}/${IMG_DIR}/${encodeURIComponent(filename)}`;
}

// Получает список картинок из папки images/ репозитория podari_dom через GitHub API
async function fetchRepoImages(force = false) {
  // Используем кэш, чтобы не превышать лимиты GitHub API (60 запросов/час)
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(IMG_CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached.images) && Date.now() - cached.timestamp < IMG_CACHE_TTL) {
        return cached.images;
      }
    } catch (e) { /* игнорируем повреждённый кэш */ }
  }

  // Для приватного репозитория нужен токен
  const token = getGithubToken();
  const headers = token ? { 'Authorization': `token ${token}` } : {};
  const url = `https://api.github.com/repos/${IMG_REPO_OWNER}/${IMG_REPO}/contents/${IMG_DIR}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('GitHub API error: ' + res.status);
  const items = await res.json();

  const images = items
    .filter(item => item.type === 'file' && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(item.name))
    .map(item => ({
      name: item.name,
      url: item.download_url || getImageUrl(item.name)
    }));

  try {
    localStorage.setItem(IMG_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), images }));
  } catch (e) { /* игнорируем ошибку записи кэша */ }

  return images;
}

// --- СИНХРОНИЗАЦИЯ ДАННЫХ СОБАК ЧЕРЕЗ GITHUB API (dogs.json) ---
// Репозиторий проекта, где хранится файл данных
const DATA_REPO = 'podari_dom';
const DATA_FILE = 'dogs.json';
const GITHUB_TOKEN_KEY = 'githubToken';
// Версия схемы данных. Увеличивайте при изменении структуры анкеты,
// чтобы сайт не использовал устаревший кэш localStorage.
const DOGS_DATA_VERSION = '1';

// --- Работа с GitHub-токеном ---
function getGithubToken() {
  return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
}

function setGithubToken(token) {
  localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
}

// Адрес сайта на Vercel (откуда читаем dogs.json без токена)
const SITE_BASE_URL = 'https://podari-dom.vercel.app';

// Читает данные собак из dogs.json.
// Порядок источников:
//   1. raw.githubusercontent.com — основной источник (репозиторий публичный)
//   2. Vercel (https://podari-dom.vercel.app/dogs.json) — fallback
//   3. GitHub API (если задан токен) — последний fallback
async function loadDogsFromGitHub() {
  // 1. Публичный raw-доступ (репозиторий podari_dom публичный)
  try {
    const rawUrl = `https://raw.githubusercontent.com/${IMG_REPO_OWNER}/${DATA_REPO}/${IMG_BRANCH}/${DATA_FILE}`;
    const res = await fetch(rawUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // Пробуем следующий способ
  }

  // 2. Vercel — fallback для посетителей сайта
  try {
    const siteRes = await fetch(`${SITE_BASE_URL}/${DATA_FILE}`, { cache: 'no-store' });
    if (siteRes.ok) {
      const data = await siteRes.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // Пробуем следующий способ
  }

  // 3. GitHub API (работает и с приватными репозиториями при наличии токена)
  const token = getGithubToken();
  const headers = token ? { 'Authorization': `token ${token}` } : {};
  const apiUrl = `https://api.github.com/repos/${IMG_REPO_OWNER}/${DATA_REPO}/contents/${DATA_FILE}`;
  const apiRes = await fetch(apiUrl, { headers });
  if (!apiRes.ok) throw new Error('Не удалось загрузить dogs.json: ' + apiRes.status);
  const meta = await apiRes.json();
  if (meta && meta.content) {
    const decoded = base64ToUtf8(meta.content);
    const data = JSON.parse(decoded);
    return Array.isArray(data) ? data : [];
  }
  return [];
}

// Декодирование base64 в UTF-8 строку (корректно обрабатывает кириллицу)
function base64ToUtf8(base64) {
  const clean = base64.replace(/\s/g, '');
  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // TextDecoder доступен в современных браузерах
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    throw new Error('TextDecoder недоступен');
  } catch (e) {
    // Fallback: через URI-кодирование (работает везде)
    try {
      return decodeURIComponent(Array.prototype.map.call(atob(clean), c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
    } catch (e2) {
      return atob(clean);
    }
  }
}

// Кодирование UTF-8 строки в base64 (корректно обрабатывает кириллицу)
function utf8ToBase64(str) {
  try {
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder('utf-8').encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }
    throw new Error('TextEncoder недоступен');
  } catch (e) {
    // Fallback: через URI-кодирование
    return btoa(unescape(encodeURIComponent(str)));
  }
}

// Записывает данные собак в dogs.json через GitHub API (требует токен)
async function syncDogsToGitHub(dogs) {
  const token = getGithubToken();
  if (!token) {
    throw new Error('Не указан GitHub-токен. Добавьте его в настройках админки.');
  }

  const apiUrl = `https://api.github.com/repos/${IMG_REPO_OWNER}/${DATA_REPO}/contents/${DATA_FILE}`;

  // Получаем текущий sha файла (нужен для обновления)
  let sha = null;
  try {
    const getRes = await fetch(apiUrl, {
      headers: { 'Authorization': `token ${token}` }
    });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
    }
  } catch (e) { /* файла может ещё не быть */ }

  const content = utf8ToBase64(JSON.stringify(dogs, null, 2));

  const body = {
    message: 'Синхронизация данных собак (авто)',
    content: content
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('GitHub API error ' + res.status + ': ' + errText);
  }
  return await res.json();
}