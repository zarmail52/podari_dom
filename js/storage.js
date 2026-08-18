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
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Ошибка чтения базы собак из localStorage:', err);
    return [];
  }
}

function saveDogs(dogs) {
  try {
    localStorage.setItem('dogsData', JSON.stringify(dogs));
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
// Картинки подтягиваются из репозитория aaa через GitHub API
const IMG_REPO_OWNER = 'zarmail52';
const IMG_REPO = 'aaa';
const IMG_BRANCH = 'main';
const IMG_CACHE_KEY = 'repoImagesCache';
const IMG_CACHE_TTL = 10 * 60 * 1000; // 10 минут

// Возвращает полный URL картинки по имени файла из репозитория aaa
function getImageUrl(filename) {
  if (!filename) return '';
  // Если это уже полный URL (data:, http, https, //) — используем как есть
  if (/^(data:|https?:|\/\/)/i.test(filename)) return filename;
  return `https://raw.githubusercontent.com/${IMG_REPO_OWNER}/${IMG_REPO}/${IMG_BRANCH}/${encodeURIComponent(filename)}`;
}

// Получает список картинок из корня репозитория aaa через GitHub API
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

  const url = `https://api.github.com/repos/${IMG_REPO_OWNER}/${IMG_REPO}/contents/`;
  const res = await fetch(url);
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