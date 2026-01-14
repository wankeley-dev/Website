/**
 * SOTE Admin Panel - GitHub-Based CMS
 * Manages website content via GitHub API
 */

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    github: {
        username: '',
        repo: '',
        token: '',
        branch: 'main'
    },
    content: {
        siteConfig: null,
        news: null,
        projects: null,
        events: null
    },
    images: [],
    hasChanges: false
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved credentials
    const saved = localStorage.getItem('sote_admin_auth');
    if (saved) {
        const auth = JSON.parse(saved);
        state.github = auth;
        showDashboard();
    }

    // Setup event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    setupNavigation();
    setupColorInputs();
});

// ============================================
// AUTHENTICATION
// ============================================
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const repo = document.getElementById('repo').value.trim();
    const token = document.getElementById('token').value.trim();
    const branch = document.getElementById('branch').value.trim() || 'main';

    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    // Test connection
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Invalid credentials or repository not found');
        }

        // Save credentials
        state.github = { username, repo, token, branch };
        localStorage.setItem('sote_admin_auth', JSON.stringify(state.github));

        showDashboard();
    } catch (error) {
        errorEl.textContent = error.message;
    }
}

function logout() {
    localStorage.removeItem('sote_admin_auth');
    state.github = { username: '', repo: '', token: '', branch: 'main' };
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

function togglePassword() {
    const input = document.getElementById('token');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// ============================================
// DASHBOARD
// ============================================
async function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    document.getElementById('sidebarUser').textContent = `@${state.github.username}`;

    // Load all content
    await loadAllContent();
    updateDashboard();
}

async function loadAllContent() {
    try {
        updateSyncStatus('loading');

        // Load content files in parallel
        const [siteConfig, news, projects, events] = await Promise.all([
            fetchContent('content/site-config.json'),
            fetchContent('content/news.json'),
            fetchContent('content/projects.json'),
            fetchContent('content/events.json')
        ]);

        state.content.siteConfig = siteConfig;
        state.content.news = news;
        state.content.projects = projects;
        state.content.events = events;

        // Load images list
        await loadImages();

        updateSyncStatus('synced');
        renderAllSections();
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Error loading content: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

async function fetchContent(path) {
    const { username, repo, token, branch } = state.github;

    try {
        const response = await fetch(
            `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branch}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return null; // File doesn't exist yet
            }
            throw new Error(`Failed to fetch ${path}`);
        }

        const data = await response.json();
        const content = atob(data.content);
        return { data: JSON.parse(content), sha: data.sha };
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return null;
    }
}

async function saveContent(path, content, sha) {
    const { username, repo, token, branch } = state.github;

    const response = await fetch(
        `https://api.github.com/repos/${username}/${repo}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update ${path} via SOTE Admin`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
                sha: sha,
                branch: branch
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save content');
    }

    return await response.json();
}

async function loadImages() {
    const { username, repo, token, branch } = state.github;

    try {
        const response = await fetch(
            `https://api.github.com/repos/${username}/${repo}/contents/images?ref=${branch}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (response.ok) {
            const files = await response.json();
            state.images = files.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name));
        }
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
}

function navigateTo(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`section-${section}`).classList.add('active');

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        news: 'News Articles',
        projects: 'Projects',
        events: 'Events',
        media: 'Media Library',
        settings: 'Site Settings'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function visitSite() {
    window.open(`https://${state.github.username}.github.io/${state.github.repo}/`, '_blank');
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderAllSections() {
    updateDashboard();
    renderNewsGrid();
    renderProjectsGrid();
    renderEventsGrid();
    renderMediaGrid();
    loadSettings();
    populateImageDropdowns();
}

function updateDashboard() {
    const newsCount = state.content.news?.data?.articles?.length || 0;
    const projectsCount = state.content.projects?.data?.projects?.length || 0;
    const eventsCount = state.content.events?.data?.events?.length || 0;

    document.getElementById('newsCount').textContent = newsCount;
    document.getElementById('projectsCount').textContent = projectsCount;
    document.getElementById('eventsCount').textContent = eventsCount;
    document.getElementById('imagesCount').textContent = state.images.length;

    // Recent news
    const recentNewsEl = document.getElementById('recentNews');
    if (newsCount > 0) {
        const recentArticles = state.content.news.data.articles.slice(0, 3);
        recentNewsEl.innerHTML = `
      <ul class="recent-list">
        ${recentArticles.map(article => `
          <li class="recent-item">
            <div class="recent-image">
              <img src="${article.image}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>'">
            </div>
            <div class="recent-info">
              <h4>${article.title}</h4>
              <span>📅 ${formatDate(article.date)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
    } else {
        recentNewsEl.innerHTML = '<p class="loading">No news articles yet</p>';
    }
}

function renderNewsGrid() {
    const grid = document.getElementById('newsGrid');
    const articles = state.content.news?.data?.articles || [];

    if (articles.length === 0) {
        grid.innerHTML = '<p class="loading">No news articles. Click "Add Article" to create one.</p>';
        return;
    }

    grid.innerHTML = articles.map(article => `
    <div class="item-card" data-id="${article.id}">
      <div class="item-image">
        <img src="${article.image}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>'">
        <span class="item-badge ${article.published ? 'published' : 'draft'}">${article.published ? 'Published' : 'Draft'}</span>
      </div>
      <div class="item-body">
        <h4 class="item-title">${article.title}</h4>
        <div class="item-meta">
          <span>📅 ${formatDate(article.date)}</span>
          <span>📂 ${article.category}</span>
        </div>
        <p class="item-excerpt">${article.excerpt}</p>
        <div class="item-actions">
          <button class="btn btn-small btn-outline" onclick="editNews('${article.id}')">✏️ Edit</button>
          <button class="btn btn-small btn-danger" onclick="confirmDelete('news', '${article.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderProjectsGrid() {
    const grid = document.getElementById('projectsGrid');
    const projects = state.content.projects?.data?.projects || [];

    if (projects.length === 0) {
        grid.innerHTML = '<p class="loading">No projects. Click "Add Project" to create one.</p>';
        return;
    }

    grid.innerHTML = projects.map(project => `
    <div class="item-card" data-id="${project.id}">
      <div class="item-image">
        <img src="${project.image}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>'">
        <span class="item-badge">${project.status}</span>
      </div>
      <div class="item-body">
        <h4 class="item-title">${project.title}</h4>
        <div class="item-meta">
          <span>📍 ${project.location}</span>
          <span>📂 ${project.category}</span>
        </div>
        <p class="item-excerpt">${project.description}</p>
        <div class="item-actions">
          <button class="btn btn-small btn-outline" onclick="editProject('${project.id}')">✏️ Edit</button>
          <button class="btn btn-small btn-danger" onclick="confirmDelete('project', '${project.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderEventsGrid() {
    const grid = document.getElementById('eventsGrid');
    const events = state.content.events?.data?.events || [];

    if (events.length === 0) {
        grid.innerHTML = '<p class="loading">No events. Click "Add Event" to create one.</p>';
        return;
    }

    grid.innerHTML = events.map(event => `
    <div class="item-card" data-id="${event.id}">
      <div class="item-image">
        <img src="${event.image}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>'">
        <span class="item-badge ${event.published ? 'published' : 'draft'}">${event.featured ? '⭐ Featured' : 'Event'}</span>
      </div>
      <div class="item-body">
        <h4 class="item-title">${event.title}</h4>
        <div class="item-meta">
          <span>📅 ${formatDate(event.date)}</span>
          <span>📍 ${event.location}</span>
        </div>
        <p class="item-excerpt">${event.description}</p>
        <div class="item-actions">
          <button class="btn btn-small btn-outline" onclick="editEvent('${event.id}')">✏️ Edit</button>
          <button class="btn btn-small btn-danger" onclick="confirmDelete('event', '${event.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderMediaGrid() {
    const grid = document.getElementById('mediaGrid');

    if (state.images.length === 0) {
        grid.innerHTML = '<p class="loading">No images in the media library.</p>';
        return;
    }

    grid.innerHTML = state.images.map(img => `
    <div class="media-item" onclick="copyImagePath('${img.path}')">
      <img src="https://raw.githubusercontent.com/${state.github.username}/${state.github.repo}/${state.github.branch}/${img.path}" alt="${img.name}">
      <div class="media-item-overlay">
        <span class="media-item-name">${img.name}</span>
        <button class="btn btn-small btn-outline" onclick="event.stopPropagation(); deleteImage('${img.path}', '${img.sha}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function populateImageDropdowns() {
    const dropdowns = ['newsImage', 'projectImage', 'eventImage'];
    const options = state.images.map(img =>
        `<option value="${img.path}">${img.name}</option>`
    ).join('');

    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Select image...</option>' + options;
        }
    });
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    const config = state.content.siteConfig?.data;
    if (!config) return;

    // General
    document.getElementById('siteName').value = config.siteName || '';
    document.getElementById('siteTagline').value = config.siteTagline || '';
    document.getElementById('siteDescription').value = config.siteDescription || '';

    // Colors
    if (config.colors) {
        document.getElementById('colorPrimary').value = config.colors.primary || '#1B4D3E';
        document.getElementById('colorPrimaryText').value = config.colors.primary || '#1B4D3E';
        document.getElementById('colorSecondary').value = config.colors.secondary || '#4A9C6D';
        document.getElementById('colorSecondaryText').value = config.colors.secondary || '#4A9C6D';
        document.getElementById('colorAccent').value = config.colors.accent || '#E8A849';
        document.getElementById('colorAccentText').value = config.colors.accent || '#E8A849';
    }

    // Hero
    if (config.hero) {
        document.getElementById('heroBadge').value = config.hero.badge || '';
        document.getElementById('heroTitle').value = config.hero.title || '';
        document.getElementById('heroSubtitle').value = config.hero.subtitle || '';
    }

    // Stats
    if (config.stats && config.stats.length >= 3) {
        document.getElementById('stat1Value').value = config.stats[0].value || '';
        document.getElementById('stat1Label').value = config.stats[0].label || '';
        document.getElementById('stat2Value').value = config.stats[1].value || '';
        document.getElementById('stat2Label').value = config.stats[1].label || '';
        document.getElementById('stat3Value').value = config.stats[2].value || '';
        document.getElementById('stat3Label').value = config.stats[2].label || '';
    }

    // Contact
    if (config.contact) {
        document.getElementById('contactEmail').value = config.contact.email || '';
        document.getElementById('contactPhone').value = config.contact.phone || '';
        document.getElementById('contactAddress').value = config.contact.address || '';
    }

    // Social
    if (config.social) {
        document.getElementById('socialFacebook').value = config.social.facebook || '';
        document.getElementById('socialTwitter').value = config.social.twitter || '';
        document.getElementById('socialInstagram').value = config.social.instagram || '';
        document.getElementById('socialLinkedin').value = config.social.linkedin || '';
    }
}

async function saveSettings() {
    const config = state.content.siteConfig?.data || {};

    // Gather all settings
    config.siteName = document.getElementById('siteName').value;
    config.siteTagline = document.getElementById('siteTagline').value;
    config.siteDescription = document.getElementById('siteDescription').value;

    config.colors = {
        primary: document.getElementById('colorPrimary').value,
        primaryLight: config.colors?.primaryLight || '#2D7A5F',
        primaryDark: config.colors?.primaryDark || '#0F2E25',
        secondary: document.getElementById('colorSecondary').value,
        accent: document.getElementById('colorAccent').value,
        accentLight: config.colors?.accentLight || '#F4C77A'
    };

    config.hero = config.hero || {};
    config.hero.badge = document.getElementById('heroBadge').value;
    config.hero.title = document.getElementById('heroTitle').value;
    config.hero.subtitle = document.getElementById('heroSubtitle').value;

    config.stats = [
        { value: document.getElementById('stat1Value').value, label: document.getElementById('stat1Label').value },
        { value: document.getElementById('stat2Value').value, label: document.getElementById('stat2Label').value },
        { value: document.getElementById('stat3Value').value, label: document.getElementById('stat3Label').value }
    ];

    config.contact = {
        email: document.getElementById('contactEmail').value,
        phone: document.getElementById('contactPhone').value,
        address: document.getElementById('contactAddress').value
    };

    config.social = {
        facebook: document.getElementById('socialFacebook').value,
        twitter: document.getElementById('socialTwitter').value,
        instagram: document.getElementById('socialInstagram').value,
        linkedin: document.getElementById('socialLinkedin').value
    };

    try {
        updateSyncStatus('saving');
        const result = await saveContent('content/site-config.json', config, state.content.siteConfig?.sha);
        state.content.siteConfig = { data: config, sha: result.content.sha };
        showToast('Settings saved successfully!', 'success');
        updateSyncStatus('synced');
    } catch (error) {
        showToast('Error saving settings: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

function setupColorInputs() {
    const colorPairs = [
        ['colorPrimary', 'colorPrimaryText'],
        ['colorSecondary', 'colorSecondaryText'],
        ['colorAccent', 'colorAccentText']
    ];

    colorPairs.forEach(([colorId, textId]) => {
        const colorInput = document.getElementById(colorId);
        const textInput = document.getElementById(textId);

        if (colorInput && textInput) {
            colorInput.addEventListener('input', () => {
                textInput.value = colorInput.value;
            });
            textInput.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                    colorInput.value = textInput.value;
                }
            });
        }
    });
}

// ============================================
// NEWS CRUD
// ============================================
function openNewsModal(article = null) {
    document.getElementById('newsModalTitle').textContent = article ? 'Edit News Article' : 'Add News Article';
    document.getElementById('newsId').value = article?.id || '';
    document.getElementById('newsTitle').value = article?.title || '';
    document.getElementById('newsDate').value = article?.date || new Date().toISOString().split('T')[0];
    document.getElementById('newsCategory').value = article?.category || 'Environment';
    document.getElementById('newsImage').value = article?.image || '';
    document.getElementById('newsExcerpt').value = article?.excerpt || '';
    document.getElementById('newsContent').value = article?.content || '';
    document.getElementById('newsFeatured').checked = article?.featured || false;
    document.getElementById('newsPublished').checked = article?.published !== false;

    openModal('newsModal');
}

function editNews(id) {
    const article = state.content.news?.data?.articles?.find(a => a.id === id);
    if (article) openNewsModal(article);
}

async function saveNews(e) {
    e.preventDefault();

    const id = document.getElementById('newsId').value || `news-${Date.now()}`;
    const article = {
        id,
        title: document.getElementById('newsTitle').value,
        date: document.getElementById('newsDate').value,
        category: document.getElementById('newsCategory').value,
        image: document.getElementById('newsImage').value,
        excerpt: document.getElementById('newsExcerpt').value,
        content: document.getElementById('newsContent').value,
        featured: document.getElementById('newsFeatured').checked,
        published: document.getElementById('newsPublished').checked
    };

    const articles = state.content.news?.data?.articles || [];
    const existingIndex = articles.findIndex(a => a.id === id);

    if (existingIndex >= 0) {
        articles[existingIndex] = article;
    } else {
        articles.unshift(article);
    }

    try {
        updateSyncStatus('saving');
        const newsData = { articles };
        const result = await saveContent('content/news.json', newsData, state.content.news?.sha);
        state.content.news = { data: newsData, sha: result.content.sha };

        closeModal('newsModal');
        renderNewsGrid();
        updateDashboard();
        showToast('Article saved successfully!', 'success');
        updateSyncStatus('synced');
    } catch (error) {
        showToast('Error saving article: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

// ============================================
// PROJECT CRUD
// ============================================
function openProjectModal(project = null) {
    document.getElementById('projectModalTitle').textContent = project ? 'Edit Project' : 'Add Project';
    document.getElementById('projectId').value = project?.id || '';
    document.getElementById('projectTitle').value = project?.title || '';
    document.getElementById('projectCategory').value = project?.category || 'Environment';
    document.getElementById('projectLocation').value = project?.location || '';
    document.getElementById('projectStatus').value = project?.status || 'ongoing';
    document.getElementById('projectStartDate').value = project?.startDate || '';
    document.getElementById('projectEndDate').value = project?.endDate || '';
    document.getElementById('projectImage').value = project?.image || '';
    document.getElementById('projectDescription').value = project?.description || '';
    document.getElementById('projectFullDescription').value = project?.fullDescription || '';
    document.getElementById('projectImpact').value = project?.impact?.join('\n') || '';
    document.getElementById('projectFeatured').checked = project?.featured || false;
    document.getElementById('projectPublished').checked = project?.published !== false;

    openModal('projectModal');
}

function editProject(id) {
    const project = state.content.projects?.data?.projects?.find(p => p.id === id);
    if (project) openProjectModal(project);
}

async function saveProject(e) {
    e.preventDefault();

    const id = document.getElementById('projectId').value || `proj-${Date.now()}`;
    const project = {
        id,
        title: document.getElementById('projectTitle').value,
        category: document.getElementById('projectCategory').value,
        location: document.getElementById('projectLocation').value,
        status: document.getElementById('projectStatus').value,
        startDate: document.getElementById('projectStartDate').value || null,
        endDate: document.getElementById('projectEndDate').value || null,
        image: document.getElementById('projectImage').value,
        description: document.getElementById('projectDescription').value,
        fullDescription: document.getElementById('projectFullDescription').value,
        impact: document.getElementById('projectImpact').value.split('\n').filter(i => i.trim()),
        featured: document.getElementById('projectFeatured').checked,
        published: document.getElementById('projectPublished').checked
    };

    const projects = state.content.projects?.data?.projects || [];
    const existingIndex = projects.findIndex(p => p.id === id);

    if (existingIndex >= 0) {
        projects[existingIndex] = project;
    } else {
        projects.unshift(project);
    }

    try {
        updateSyncStatus('saving');
        const projectsData = { projects };
        const result = await saveContent('content/projects.json', projectsData, state.content.projects?.sha);
        state.content.projects = { data: projectsData, sha: result.content.sha };

        closeModal('projectModal');
        renderProjectsGrid();
        updateDashboard();
        showToast('Project saved successfully!', 'success');
        updateSyncStatus('synced');
    } catch (error) {
        showToast('Error saving project: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

// ============================================
// EVENT CRUD
// ============================================
function openEventModal(event = null) {
    document.getElementById('eventModalTitle').textContent = event ? 'Edit Event' : 'Add Event';
    document.getElementById('eventId').value = event?.id || '';
    document.getElementById('eventTitle').value = event?.title || '';
    document.getElementById('eventDate').value = event?.date || '';
    document.getElementById('eventTime').value = event?.time || '';
    document.getElementById('eventLocation').value = event?.location || '';
    document.getElementById('eventImage').value = event?.image || '';
    document.getElementById('eventDescription').value = event?.description || '';
    document.getElementById('eventRegistration').value = event?.registrationLink || '';
    document.getElementById('eventFeatured').checked = event?.featured || false;
    document.getElementById('eventPublished').checked = event?.published !== false;

    openModal('eventModal');
}

function editEvent(id) {
    const event = state.content.events?.data?.events?.find(e => e.id === id);
    if (event) openEventModal(event);
}

async function saveEvent(e) {
    e.preventDefault();

    const id = document.getElementById('eventId').value || `evt-${Date.now()}`;
    const eventData = {
        id,
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        location: document.getElementById('eventLocation').value,
        image: document.getElementById('eventImage').value,
        description: document.getElementById('eventDescription').value,
        registrationLink: document.getElementById('eventRegistration').value,
        featured: document.getElementById('eventFeatured').checked,
        published: document.getElementById('eventPublished').checked
    };

    const events = state.content.events?.data?.events || [];
    const existingIndex = events.findIndex(ev => ev.id === id);

    if (existingIndex >= 0) {
        events[existingIndex] = eventData;
    } else {
        events.unshift(eventData);
    }

    try {
        updateSyncStatus('saving');
        const eventsData = { events };
        const result = await saveContent('content/events.json', eventsData, state.content.events?.sha);
        state.content.events = { data: eventsData, sha: result.content.sha };

        closeModal('eventModal');
        renderEventsGrid();
        updateDashboard();
        showToast('Event saved successfully!', 'success');
        updateSyncStatus('synced');
    } catch (error) {
        showToast('Error saving event: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

// ============================================
// DELETE OPERATIONS
// ============================================
let deleteContext = { type: '', id: '' };

function confirmDelete(type, id) {
    deleteContext = { type, id };
    openModal('deleteModal');
    document.getElementById('confirmDeleteBtn').onclick = executeDelete;
}

async function executeDelete() {
    const { type, id } = deleteContext;

    try {
        updateSyncStatus('saving');

        if (type === 'news') {
            const articles = state.content.news.data.articles.filter(a => a.id !== id);
            const newsData = { articles };
            const result = await saveContent('content/news.json', newsData, state.content.news.sha);
            state.content.news = { data: newsData, sha: result.content.sha };
            renderNewsGrid();
        } else if (type === 'project') {
            const projects = state.content.projects.data.projects.filter(p => p.id !== id);
            const projectsData = { projects };
            const result = await saveContent('content/projects.json', projectsData, state.content.projects.sha);
            state.content.projects = { data: projectsData, sha: result.content.sha };
            renderProjectsGrid();
        } else if (type === 'event') {
            const events = state.content.events.data.events.filter(e => e.id !== id);
            const eventsData = { events };
            const result = await saveContent('content/events.json', eventsData, state.content.events.sha);
            state.content.events = { data: eventsData, sha: result.content.sha };
            renderEventsGrid();
        }

        closeModal('deleteModal');
        updateDashboard();
        showToast('Item deleted successfully!', 'success');
        updateSyncStatus('synced');
    } catch (error) {
        showToast('Error deleting item: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

// ============================================
// IMAGE UPLOAD
// ============================================
async function uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function () {
        const base64Content = reader.result.split(',')[1];
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
        const path = `images/${filename}`;

        try {
            updateSyncStatus('uploading');

            const response = await fetch(
                `https://api.github.com/repos/${state.github.username}/${state.github.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${state.github.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Upload ${filename} via SOTE Admin`,
                        content: base64Content,
                        branch: state.github.branch
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload image');
            }

            await loadImages();
            renderMediaGrid();
            populateImageDropdowns();
            showToast('Image uploaded successfully!', 'success');
            updateSyncStatus('synced');
        } catch (error) {
            showToast('Error uploading image: ' + error.message, 'error');
            updateSyncStatus('error');
        }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

async function deleteImage(path, sha) {
    if (!confirm('Delete this image? This cannot be undone.')) return;

    try {
        updateSyncStatus('saving');

        const response = await fetch(
            `https://api.github.com/repos/${state.github.username}/${state.github.repo}/contents/${path}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${state.github.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete image via SOTE Admin`,
                    sha: sha,
                    branch: state.github.branch
                })
            }
        );

        if (!response.ok) throw new Error('Failed to delete image');

        await loadImages();
        renderMediaGrid();
        populateImageDropdowns();
        updateDashboard();
        showToast('Image deleted!', 'success');
        updateSyncStatus('synced');
    } catch (error) {
        showToast('Error deleting image: ' + error.message, 'error');
        updateSyncStatus('error');
    }
}

function copyImagePath(path) {
    navigator.clipboard.writeText(path);
    showToast('Image path copied!', 'success');
}

// ============================================
// MODALS
// ============================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ============================================
// UTILITIES
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateSyncStatus(status) {
    const el = document.getElementById('syncStatus');
    const texts = {
        synced: '✓ Synced',
        loading: '⏳ Loading...',
        saving: '💾 Saving...',
        uploading: '📤 Uploading...',
        error: '⚠️ Error',
        pending: '• Unsaved'
    };
    el.textContent = texts[status] || status;
    el.className = `sync-status ${status}`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Escape key closes modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});
