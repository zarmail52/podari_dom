/**
 * ЛОГИКА АДМИН-ПАНЕЛИ (js/admin.js)
 */

let currentPhotoBase64 = '';
let editingDogId = null;

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

document.getElementById('photoFile')?.addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (file) {
    try {
      currentPhotoBase64 = await compressImage(file, 800, 800, 0.75);
      const preview = document.getElementById('preview');
      preview.src = currentPhotoBase64;
      preview.style.display = 'block';
    } catch (err) {
      alert('Ошибка при обработке изображения');
      console.error(err);
    }
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
    const safePhoto = escapeHTML(dog.photo);

    item.innerHTML = `
      <div class="dog-info">
        <img src="${safePhoto}" alt="${safeName}">
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
  if (!currentPhotoBase64) {
    alert('Пожалуйста, выберите фото файл!');
    return;
  }

  const dogData = {
    id: editingDogId ? editingDogId : Date.now(),
    name: document.getElementById('name').value.trim(),
    age: document.getElementById('age').value.trim(),
    location: document.getElementById('dogLocation').value.trim(),
    category: document.getElementById('category').value,
    photo: currentPhotoBase64
  };

  saveOrUpdateDog(dogData);
  renderAdminList();
  resetDogForm();
  
  alert(editingDogId ? 'Анкета успешно обновлена!' : 'Собака успешно добавлена!');
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

  currentPhotoBase64 = dog.photo;
  const preview = document.getElementById('preview');
  preview.src = dog.photo;
  preview.style.display = 'block';

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
  currentPhotoBase64 = '';
  document.getElementById('addDogForm').reset();
  document.getElementById('preview').style.display = 'none';
  document.getElementById('formTitle').textContent = '🐕 Добавить новую собаку';
  document.getElementById('submitBtn').textContent = 'Добавить анкету собаки';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

function deleteDog(id) {
  if (confirm('Вы уверены, что хотите удалить эту анкету?')) {
    deleteDogById(id);
    renderAdminList();
  }
}

function clearAllData() {
  if (confirm('Очистить всю базу тестовых анкет собак?')) {
    localStorage.removeItem('dogsData');
    renderAdminList();
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
});