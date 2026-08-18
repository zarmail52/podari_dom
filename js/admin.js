/**
 * ЛОГИКА АДМИН-ПАНЕЛИ (js/admin.js)
 * Новая система картинок: фото выбираются из репозитория aaa (GitHub API)
 * Автосинхронизация данных собак с GitHub (dogs.json)
 */

let currentPhotoName = '';
let editingDogId = null;
let repoImages = [];

// --- НАСТРОЙКИ GITHUB-ТОКЕНА ---
function setTokenStatus(text, type) {
  const status = document.getElementById('tokenStatus');
  if (!status) return;
  status.textContent = text;
  status.className = 'img-status ' + (type || '');
}

function loadGithubToken() {
  const input = document.getElementById('githubToken');
  if (input) input.value = getGithubToken();
}

document.getElementById('saveTokenBtn')?.addEventListener('click', () => {
  const input = document.getElementById('githubToken');
  if (!input) return;
  const token = input.value.trim();
  if (!token) {
    setTokenStatus('Введите токен.', 'error');
    return;
  }
  setGithubToken(token);
  setTokenStatus('Токен сохранён. Теперь добавление/удаление собак будет синхронизироваться с GitHub.', 'ok');
});

// Синхронизирует данные собак с GitHub после любого изменения
async function syncDogsToRemote() {
  const dogs = getDogs();
  try {
    await syncDogsToGitHub(dogs);
    setTokenStatus('Данные успешно синхронизированы с GitHub (dogs.json).', 'ok');
  } catch (err) {
    console.error('Ошибка синхронизации с GitHub:', err);
    setTokenStatus('Ошибка синхронизации: ' + err.message, 'error');
  }
}

function loadAdminContacts() {
  const c = getContacts();

  document.getElementById('phone1').value = c.phone1 || '';
  document.getElementById('phone2').value = c.phone2 || '';
  document.getElementById('messengers').value = c.messengers || '';
  document.getElementById('telegramLink').value = c.telegramLink || '';
  document.getElementById('callsHours').value = c.callsHours || '';
  document.getElementById('visitDays').value = c.visitDays || '';
  document.getElementById('volunteerDays').value = c.volunteerDays || '';
  document.getElementById('visitNotice').value = c.visitNotice || '';
  document.getElementById('location').value = c.location || '';
  document.getElementById('address').value = c.address || '';
  document.getElementById('email').value = c.email || '';
  document.getElementById('vkLink').value = c.vkLink || '';
  document.getElementById('tgChannelLink').value = c.tgChannelLink || '';
}

document.getElementById('contactsForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const newContacts = {
    phone1: document.getElementById('phone1').value.trim(),
    phone2: document.getElementById('phone2').value.trim(),
    messengers: document.getElementById('messengers').value.trim(),
    telegramLink: document.getElementById('telegramLink').value.trim(),
    callsHours: document.getElementById('callsHours').value.trim(),
    visitDays: document.getElementById('visitDays').value.trim(),
    volunteerDays: document.getElementById('volunteerDays').value.trim(),
    visitNotice: document.getElementById('visitNotice').value.trim(),
    location: document.getElementById('location').value.trim(),
    address: document.getElementById('address').value.trim(),
    email: document.getElementById('email').value.trim(),
    vkLink: document.getElementById('vkLink').value.trim(),
    tgChannelLink: document.getElementById('tgChannelLink').value.trim()
  };

  saveContacts(newContacts);
  alert('Контактная информация успешно сохранена!');
});

// --- ЗАГРУЗКА СПИСКА КАРТИНОК ИЗ РЕПОЗИТОРИЯ aaa ---
function setImgStatus(text, type) {
  const status = document.getElementById('imgStatus');
  if (!status) return;
  status.textContent = text;
  status.className = 'img-status ' + (type || '');
}

async function loadRepoImages(force = false) {
  const select = document.getElementById('photoSelect');
  if (!select) return;

  setImgStatus('Загрузка списка картинок из репозитория aaa...', 'loading');
  select.innerHTML = '<option value="">Загрузка...</option>';

  try {
    repoImages = await fetchRepoImages(force);

    if (repoImages.length === 0) {
      select.innerHTML = '<option value="">Картинки не найдены в репозитории aaa</option>';
      setImgStatus('В репозитории aaa не найдено изображений. Загрузите фото в корень репозитория.', 'error');
      return;
    }

    let options = '<option value="">— Выберите фото —</option>';
    repoImages.forEach(img => {
      options += `<option value="${escapeHTML(img.name)}">${escapeHTML(img.name)}</option>`;
    });
    select.innerHTML = options;
    setImgStatus(`Найдено картинок: ${repoImages.length} (репозиторий zarmail52/aaa)`, 'ok');
  } catch (err) {
    console.error('Ошибка загрузки списка картинок:', err);
    select.innerHTML = '<option value="">Ошибка загрузки списка картинок</option>';
    setImgStatus('Не удалось получить список картинок из GitHub API. Проверьте доступ к интернету или лимиты API.', 'error');
  }
}

document.getElementById('refreshImagesBtn')?.addEventListener('click', () => {
  loadRepoImages(true);
});

document.getElementById('photoSelect')?.addEventListener('change', function(e) {
  currentPhotoName = e.target.value;
  const preview = document.getElementById('preview');
  if (currentPhotoName) {
    preview.src = getImageUrl(currentPhotoName);
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
    preview.removeAttribute('src');
  }
});

function getCategoryBadge(cat) {
  if (cat === 'young') return '<span class="badge badge-young">До 2 лет</span>';
  if (cat === 'large') return '<span class="badge badge-large">Крупная</span>';
  return '<span class="badge">Обычная</span>';
}

function renderAdminList() {
  const dogs = getDogs();
  const container = document.getElementById('adminDogsList');
  if (!container) return;
  container.innerHTML = '';

  if (dogs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">Нет добавленных анкет.</p>';
    return;
  }

  dogs.forEach((dog) => {
    const item = document.createElement('div');
    item.className = 'dog-item';
    const safeName = escapeHTML(dog.name);
    const safeAge = escapeHTML(dog.age);
    const safeLocation = dog.location ? `(${escapeHTML(dog.location)})` : '';
    const safePhoto = escapeHTML(getImageUrl(dog.photo));

    item.innerHTML = `
      <div class="dog-info">
        <img src="${safePhoto}" alt="${safeName}" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="#334155"/><text x="50%" y="50%" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="10" text-anchor="middle" dominant-baseline="middle">Нет фото</text></svg>')}';">
        <div>
          <strong>${safeName}</strong>, ${safeAge} ${safeLocation}
          ${getCategoryBadge(dog.category)}
        </div>
      </div>
      <div>
        <button class="btn-edit" onclick="editDog(${dog.id})">✏️ Изменить</button>
        <button class="btn-delete" onclick="deleteDog(${dog.id})">🗑 Удалить</button>
      </div>
    `;
    container.appendChild(item);
  });
}

document.getElementById('addDogForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  if (!currentPhotoName) {
    alert('Пожалуйста, выберите фото из репозитория aaa!');
    return;
  }

  const dogData = {
    id: editingDogId ? editingDogId : Date.now(),
    name: document.getElementById('name').value.trim(),
    age: document.getElementById('age').value.trim(),
    location: document.getElementById('dogLocation').value.trim(),
    category: document.getElementById('category').value,
    photo: currentPhotoName
  };

  saveOrUpdateDog(dogData);
  renderAdminList();
  resetDogForm();

  alert(editingDogId ? 'Анкета успешно обновлена!' : 'Собака успешно добавлена!');
  syncDogsToRemote();
});

function editDog(id) {
  const dogs = getDogs();
  const dog = dogs.find(d => d.id === id);
  if (!dog) return;

  editingDogId = dog.id;
  document.getElementById('name').value = dog.name;
  document.getElementById('age').value = dog.age;
  document.getElementById('dogLocation').value = dog.location || '';
  document.getElementById('category').value = dog.category || 'other';

  // Выбираем фото в списке, если оно есть в репозитории
  currentPhotoName = dog.photo || '';
  const select = document.getElementById('photoSelect');
  const preview = document.getElementById('preview');

  if (currentPhotoName) {
    const optionExists = Array.from(select.options).some(opt => opt.value === currentPhotoName);
    if (optionExists) {
      select.value = currentPhotoName;
    } else {
      // Фото не в списке — добавляем его как отдельную опцию (например, старое base64)
      const opt = document.createElement('option');
      opt.value = currentPhotoName;
      opt.textContent = currentPhotoName.length > 40 ? currentPhotoName.slice(0, 37) + '...' : currentPhotoName;
      select.appendChild(opt);
      select.value = currentPhotoName;
    }
    preview.src = getImageUrl(currentPhotoName);
    preview.style.display = 'block';
  } else {
    select.value = '';
    preview.style.display = 'none';
  }

  document.getElementById('formTitle').textContent = '✏️ Редактирование анкеты: ' + dog.name;
  document.getElementById('submitBtn').textContent = '💾 Сохранить изменения';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';

  window.scrollTo({ top: document.getElementById('addDogForm').offsetTop - 20, behavior: 'smooth' });
}

function cancelEdit() {
  resetDogForm();
}

function resetDogForm() {
  editingDogId = null;
  currentPhotoName = '';
  document.getElementById('addDogForm').reset();
  const preview = document.getElementById('preview');
  preview.style.display = 'none';
  preview.removeAttribute('src');
  const select = document.getElementById('photoSelect');
  if (select) select.value = '';
  document.getElementById('formTitle').textContent = '🐕 Добавить новую собаку';
  document.getElementById('submitBtn').textContent = 'Добавить анкету собаки';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

function deleteDog(id) {
  if (confirm('Вы уверены, что хотите удалить эту анкету?')) {
    deleteDogById(id);
    renderAdminList();
    syncDogsToRemote();
  }
}

function clearAllData() {
  if (confirm('Очистить всю базу тестовых анкет собак?')) {
    localStorage.removeItem('dogsData');
    renderAdminList();
    syncDogsToRemote();
  }
}

// Синхронизация темы
window.addEventListener('storage', (e) => {
  if (e.key === 'siteTheme') {
    applyTheme(e.newValue || 'light');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadAdminContacts();
  renderAdminList();
  loadRepoImages(false);
  loadGithubToken();
});