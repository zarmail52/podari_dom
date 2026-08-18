/**
 * ЛОГИКА ГЛАВНОГО САЙТА (js/app.js)
 */

let allDogs = [];
let currentCategory = 'all';
let searchQuery = '';
let searchDebounceTimer = null;
let transitionTimer = null;
let transitionToken = 0;
let lastCatalogState = { category: 'all', query: '' };

const TRANSITION_MS = 350;
const SEARCH_DEBOUNCE_MS = 300;

function updateIndicator(elem) {
  const indicator = document.getElementById('navIndicator');
  const nav = document.getElementById('mainNav');
  if (!indicator || !nav) return;

  const target = elem || document.querySelector('#mainNav a.active');
  if (!target) {
    indicator.style.opacity = '0';
    return;
  }

  const navRect = nav.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  indicator.style.left = (targetRect.left - navRect.left) + 'px';
  indicator.style.top = (targetRect.top - navRect.top) + 'px';
  indicator.style.width = targetRect.width + 'px';
  indicator.style.height = targetRect.height + 'px';
  indicator.style.opacity = '1';
}

function setActiveNav(linkElem) {
  if (!linkElem) return;
  const navLinks = document.querySelectorAll('#mainNav a');
  navLinks.forEach(a => a.classList.remove('active'));
  linkElem.classList.add('active');
  updateIndicator(linkElem);
}

function renderContacts() {
  const c = getContacts();

  const bannerPhones = document.getElementById('bannerPhones');
  if (bannerPhones) bannerPhones.textContent = `${c.phone1 || ''}  |  ${c.phone2 || ''}`;

  if (document.getElementById('displayPhone1')) document.getElementById('displayPhone1').textContent = c.phone1 || '';
  if (document.getElementById('displayPhone2')) document.getElementById('displayPhone2').textContent = c.phone2 || '';
  if (document.getElementById('displayMessengers')) document.getElementById('displayMessengers').textContent = c.messengers || '';
  if (document.getElementById('displayCallsHours')) document.getElementById('displayCallsHours').textContent = c.callsHours || '';
  if (document.getElementById('displayVisitDays')) document.getElementById('displayVisitDays').textContent = c.visitDays || '';
  if (document.getElementById('displayVolunteerDays')) document.getElementById('displayVolunteerDays').textContent = c.volunteerDays || '';
  if (document.getElementById('displayVisitNotice')) document.getElementById('displayVisitNotice').textContent = c.visitNotice || '';
  if (document.getElementById('displayLocation')) document.getElementById('displayLocation').textContent = c.location || '';
  if (document.getElementById('displayAddress')) document.getElementById('displayAddress').textContent = c.address || '';
  if (document.getElementById('displayEmail')) document.getElementById('displayEmail').textContent = c.email || '';

  const emailLink = document.getElementById('displayEmailLink');
  if (emailLink) emailLink.href = 'mailto:' + (c.email || '');

  const btnTg = document.getElementById('btnTelegramLink');
  if (btnTg) btnTg.href = c.telegramLink || '#';

  const profileTg = document.getElementById('profileTgLink');
  if (profileTg) profileTg.href = c.telegramLink || '#';

  const cleanPhone = c.phone1 ? c.phone1.replace(/[^\d+]/g, '') : '';
  const btnPhone = document.getElementById('btnPhoneCall');
  if (btnPhone) btnPhone.href = 'tel:' + cleanPhone;

  const profilePhone = document.getElementById('profilePhoneCall');
  if (profilePhone) profilePhone.href = 'tel:' + cleanPhone;

  const linkVk = document.getElementById('linkVk');
  if (linkVk) linkVk.href = c.vkLink || '#';

  const linkTg = document.getElementById('linkTgChannel');
  if (linkTg) linkTg.href = c.tgChannelLink || '#';
}

function loadAndRenderDogs() {
  allDogs = getDogs();
  const catalogSection = document.getElementById('catalogSection');
  if (catalogSection && catalogSection.classList.contains('active')) {
    applyCatalogFilter(false);
  }
}

function renderDogs(dogsToRender, animate = true) {
  const container = document.getElementById('dogsContainer');
  if (!container) return;

  container.classList.toggle('no-anim', !animate);

  let html = '';

  if (dogsToRender.length === 0) {
    const isSearch = searchQuery.trim() !== '';
    html = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">
        <h3>${isSearch ? 'По запросу ничего не найдено' : 'Анкеты не найдены'}</h3>
        <p style="margin-top: 8px;">${isSearch ? 'Попробуйте изменить запрос или сбросить фильтры.' : 'Перейдите в панель управления, чтобы добавить собак.'}</p>
      </div>
    `;
  } else {
    const cards = dogsToRender.map((dog, index) => {
      const locationText = dog.location ? escapeHTML(dog.location) : 'Приют';
      const safeName = escapeHTML(dog.name);
      const safeAge = escapeHTML(dog.age);
      const safePhoto = escapeHTML(getImageUrl(dog.photo));
      const delay = animate ? ` style="animation-delay: ${index * 0.04}s"` : '';
      return `
        <a href="#dog-${dog.id}" class="card"${delay} onclick="openDogProfile(event, ${dog.id})">
          <div class="card-img-wrapper">
            <img src="${safePhoto}" alt="${safeName}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#334155"/><text x="50%" y="50%" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Фото недоступно</text></svg>')}';">
          </div>
          <div class="card-body">
            <div class="card-title">${safeName}, ${safeAge}</div>
            <div class="card-badge">📍 ${locationText}</div>
          </div>
        </a>
      `;
    });
    html = cards.join('');
  }

  container.innerHTML = html;

  if (animate) {
    container.classList.remove('grid-fade');
  } else if (dogsToRender.length > 0) {
    container.classList.remove('grid-fade');
    void container.offsetWidth;
    container.classList.add('grid-fade');
  }
}

function parseAgeInYears(ageStr) {
  if (!ageStr) return 99;
  const lower = ageStr.toLowerCase();
  if (lower.includes('мес')) return 0.5;
  const match = lower.match(/\d+/);
  return match ? parseInt(match[0], 10) : 99;
}

function applyCatalogFilter(animate = false) {
  allDogs = getDogs();
  let filtered = allDogs;

  if (currentCategory === 'young') {
    filtered = filtered.filter(dog => dog.category === 'young' || parseAgeInYears(dog.age) <= 2);
  } else if (currentCategory === 'large') {
    filtered = filtered.filter(dog => dog.category === 'large');
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(dog => (dog.name || '').toLowerCase().includes(q));
  }

  renderDogs(filtered, animate);
}

function updateSearchVisibility(sectionId) {
  const searchWrap = document.getElementById('navSearch');
  if (!searchWrap) return;
  const show = sectionId === 'catalogSection';
  searchWrap.classList.toggle('visible', show);
  if (!show) {
    const input = document.getElementById('dogSearchInput');
    if (input && document.activeElement === input) input.blur();
  }
}

function switchTab(targetSectionId, newTitle, updateContentCallback) {
  const currentActive = document.querySelector('.tab-section.active');
  const targetSection = document.getElementById(targetSectionId);
  const pageTitle = document.getElementById('pageTitle');

  if (currentActive === targetSection && !updateContentCallback) return;

  // Отменяем предыдущую незавершённую анимацию — быстрые клики не «ломают» переход
  clearTimeout(transitionTimer);
  transitionToken++;

  // Скрываем все секции, кроме текущей (она плавно исчезает)
  document.querySelectorAll('.tab-section').forEach(sec => {
    if (sec !== currentActive) {
      sec.style.display = 'none';
      sec.classList.remove('active', 'fade-out');
    }
  });

  if (currentActive) {
    currentActive.classList.add('fade-out');
    currentActive.classList.remove('active');
  }

  // Показываем/скрываем поиск сразу, чтобы навигация не «прыгала»
  updateSearchVisibility(targetSectionId);
  const activeNav = document.querySelector('#mainNav a.active');
  if (activeNav) updateIndicator(activeNav);

  if (pageTitle && newTitle) {
    pageTitle.classList.add('title-fade-out');
  }

  const token = transitionToken;
  transitionTimer = setTimeout(() => {
    if (token !== transitionToken) return;

    document.querySelectorAll('.tab-section').forEach(sec => {
      sec.style.display = 'none';
      sec.classList.remove('active', 'fade-out');
    });

    if (pageTitle) {
      if (newTitle) pageTitle.textContent = newTitle;
      pageTitle.classList.remove('title-fade-out');
    }

    if (updateContentCallback) updateContentCallback();

    if (targetSection) {
      targetSection.style.display = 'block';
      void targetSection.offsetWidth;
      targetSection.classList.add('active');
    }

    updateSearchVisibility(targetSectionId);

    const activeNavAfter = document.querySelector('#mainNav a.active');
    if (activeNavAfter) updateIndicator(activeNavAfter);
  }, TRANSITION_MS);
}

function openDogProfile(event, dogId) {
  if (event && (event.ctrlKey || event.metaKey || event.button === 1)) return;
  if (event) event.preventDefault();

  allDogs = getDogs();
  const dog = allDogs.find(d => d.id === dogId);
  if (!dog) return;

  // Запоминаем состояние каталога (фильтр + поиск) для кнопки «Назад»
  lastCatalogState = { category: currentCategory, query: searchQuery };

  document.getElementById('profileImg').src = getImageUrl(dog.photo);
  document.getElementById('profileImg').onerror = function() {
    this.onerror = null;
    this.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><rect width="100%" height="100%" fill="#334155"/><text x="50%" y="50%" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="20" text-anchor="middle" dominant-baseline="middle">Фото недоступно</text></svg>');
  };
  document.getElementById('profileName').textContent = dog.name;
  document.getElementById('profileAgeBadge').textContent = '🎂 Возраст: ' + dog.age;
  document.getElementById('profileLocationBadge').textContent = '📍 Локация: ' + (dog.location || 'Приют');

  let categoryLabel = 'Обычная';
  if (dog.category === 'young') categoryLabel = 'Молодая (до 2 лет)';
  if (dog.category === 'large') categoryLabel = 'Крупная собака';
  document.getElementById('profileCategoryBadge').textContent = '🐕 ' + categoryLabel;

  history.pushState(null, null, '#dog-' + dogId);

  document.querySelectorAll('#mainNav a').forEach(a => a.classList.remove('active'));
  const indicator = document.getElementById('navIndicator');
  if (indicator) indicator.style.opacity = '0';

  switchTab('dogProfileSection', 'Анкета: ' + dog.name);
}

function getCatalogNavLink(category) {
  const link = document.querySelector(`#mainNav a[data-category="${category}"]`);
  return link || document.getElementById('navMain');
}

function goBackToCatalog() {
  history.pushState(null, null, window.location.pathname);

  const state = lastCatalogState;
  searchQuery = state.query || '';
  const searchInput = document.getElementById('dogSearchInput');
  if (searchInput) searchInput.value = searchQuery;

  filterDogs(state.category, getCatalogNavLink(state.category));
}

function checkHashRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#dog-')) {
    const dogId = parseInt(hash.replace('#dog-', ''), 10);
    if (dogId) openDogProfile(null, dogId);
  } else if (!hash) {
    // Возврат из анкеты через кнопку «Назад» браузера
    const profileSection = document.getElementById('dogProfileSection');
    if (profileSection && profileSection.classList.contains('active')) {
      goBackToCatalog();
    }
  }
}

function filterDogs(category, linkElem) {
  setActiveNav(linkElem);
  currentCategory = category;

  let title = 'Собаки ищут дом';
  if (category === 'young') title = 'Молодые собаки до 2 лет';
  if (category === 'large') title = 'Крупные собаки';

  if (window.location.hash) history.pushState(null, null, window.location.pathname);
  switchTab('catalogSection', title, () => applyCatalogFilter(true));
}

function showSection(sectionId, linkElem) {
  setActiveNav(linkElem);

  let title = '';
  let targetId = '';

  if (sectionId === 'about') { title = 'О нашем приюте'; targetId = 'aboutSection'; }
  else if (sectionId === 'help') { title = 'Как помочь приюту'; targetId = 'helpSection'; }
  else if (sectionId === 'contacts') { title = 'Контакты приюта'; targetId = 'contactsSection'; }

  if (window.location.hash) history.pushState(null, null, window.location.pathname);
  switchTab(targetId, title);
}

function initSearch() {
  const searchInput = document.getElementById('dogSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      applyCatalogFilter(false);
    }, SEARCH_DEBOUNCE_MS);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      clearTimeout(searchDebounceTimer);
      searchQuery = '';
      applyCatalogFilter(false);
      searchInput.blur();
    }
  });
}

// --- СИНХРОНИЗАЦИЯ ВКЛАДОК И ТЕМЫ В РЕАЛЬНОМ ВРЕМЕНИ ---
window.addEventListener('storage', (e) => {
  if (e.key === 'dogsData' || e.key === 'contactsData') {
    renderContacts();
    loadAndRenderDogs();
  }
  if (e.key === 'siteTheme') {
    applyTheme(e.newValue || 'light');
  }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  renderContacts();
  checkHashRoute();
  loadAndRenderDogs();
  initSearch();

  const activeSection = document.querySelector('.tab-section.active');
  const sectionId = window.location.hash.startsWith('#dog-')
    ? 'dogProfileSection'
    : (activeSection ? activeSection.id : 'catalogSection');
  updateSearchVisibility(sectionId);

  requestAnimationFrame(() => {
    setTimeout(() => {
      const activeNav = document.querySelector('#mainNav a.active');
      if (activeNav) updateIndicator(activeNav);
    }, 60);
  });

  const mainNav = document.getElementById('mainNav');
  if (mainNav) {
    const navObserver = new ResizeObserver(() => {
      const activeNav = document.querySelector('#mainNav a.active');
      if (activeNav) updateIndicator(activeNav);
    });
    navObserver.observe(mainNav);
  }
});

window.addEventListener('popstate', checkHashRoute);