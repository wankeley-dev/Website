/**
 * SOTE Content Loader
 * Dynamically loads content from JSON files for GitHub Pages
 */

(function () {
    'use strict';

    // Base path for content files
    const CONTENT_PATH = 'content/';

    // Cache for loaded content
    const cache = {};

    /**
     * Fetch and cache JSON content
     */
    async function fetchContent(filename) {
        if (cache[filename]) {
            return cache[filename];
        }

        try {
            const response = await fetch(CONTENT_PATH + filename);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            const data = await response.json();
            cache[filename] = data;
            return data;
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }

    /**
     * Apply site configuration (colors, etc.)
     */
    async function applySiteConfig() {
        const config = await fetchContent('site-config.json');
        if (!config) return;

        // Apply custom colors via CSS variables
        if (config.colors) {
            const root = document.documentElement;
            if (config.colors.primary) root.style.setProperty('--primary', config.colors.primary);
            if (config.colors.primaryLight) root.style.setProperty('--primary-light', config.colors.primaryLight);
            if (config.colors.primaryDark) root.style.setProperty('--primary-dark', config.colors.primaryDark);
            if (config.colors.secondary) root.style.setProperty('--secondary', config.colors.secondary);
            if (config.colors.accent) root.style.setProperty('--accent', config.colors.accent);
            if (config.colors.accentLight) root.style.setProperty('--accent-light', config.colors.accentLight);
        }

        // Update hero section if on homepage
        const heroContent = document.querySelector('.hero-content');
        if (heroContent && config.hero) {
            const badge = heroContent.querySelector('.hero-badge');
            const title = heroContent.querySelector('.hero-title');
            const text = heroContent.querySelector('.hero-text');

            if (badge && config.hero.badge) badge.innerHTML = config.hero.badge;
            if (title && config.hero.title) title.innerHTML = config.hero.title;
            if (text && config.hero.subtitle) text.innerHTML = config.hero.subtitle;
        }

        // Update stats
        const statsContainer = document.querySelector('.hero-stats');
        if (statsContainer && config.stats && config.stats.length > 0) {
            const statItems = statsContainer.querySelectorAll('.stat-item');
            config.stats.forEach((stat, index) => {
                if (statItems[index]) {
                    const number = statItems[index].querySelector('.stat-number');
                    const label = statItems[index].querySelector('.stat-label');
                    if (number) number.textContent = stat.value;
                    if (label) label.textContent = stat.label;
                }
            });
        }

        // Update social links in footer
        if (config.social) {
            const socialLinks = document.querySelectorAll('.social-links .social-link');
            const platforms = ['facebook', 'twitter', 'instagram', 'linkedin'];
            socialLinks.forEach((link, index) => {
                if (platforms[index] && config.social[platforms[index]]) {
                    link.href = config.social[platforms[index]];
                }
            });
        }

        return config;
    }

    /**
     * Render news articles
     */
    async function renderNews(containerId, options = {}) {
        const container = document.getElementById(containerId) || document.querySelector('.news-grid');
        if (!container) return;

        const newsData = await fetchContent('news.json');
        if (!newsData || !newsData.articles) return;

        let articles = newsData.articles.filter(a => a.published !== false);

        // Apply options
        if (options.featured) {
            articles = articles.filter(a => a.featured);
        }
        if (options.limit) {
            articles = articles.slice(0, options.limit);
        }

        // Clear existing content
        container.innerHTML = '';

        // Render articles
        articles.forEach(article => {
            const cardHTML = `
        <article class="news-card reveal">
          <div class="news-image">
            <img src="${article.image}" alt="${article.title}" loading="lazy">
          </div>
          <div class="news-content">
            <span class="news-date">📅 ${formatDate(article.date)}</span>
            <h3 class="news-title">${article.title}</h3>
            <p class="news-excerpt">${article.excerpt}</p>
            <a href="#" class="card-link" onclick="showNewsDetail('${article.id}'); return false;">Read More →</a>
          </div>
        </article>
      `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Re-apply reveal animations
        initRevealAnimations();
    }

    /**
     * Render projects
     */
    async function renderProjects(containerId, options = {}) {
        const container = document.getElementById(containerId) || document.querySelector('.projects-grid');
        if (!container) return;

        const projectsData = await fetchContent('projects.json');
        if (!projectsData || !projectsData.projects) return;

        let projects = projectsData.projects.filter(p => p.published !== false);

        if (options.featured) {
            projects = projects.filter(p => p.featured);
        }
        if (options.limit) {
            projects = projects.slice(0, options.limit);
        }

        container.innerHTML = '';

        projects.forEach(project => {
            const cardHTML = `
        <div class="project-card reveal">
          <div class="project-image">
            <img src="${project.image}" alt="${project.title}" loading="lazy">
            <div class="project-overlay"></div>
            <span class="project-category">${project.category}</span>
          </div>
          <div class="project-content">
            <h3 class="project-title">${project.title}</h3>
            <p class="project-text">${project.description}</p>
            <div class="project-meta">
              <span>📍 ${project.location}</span>
              <span>📅 ${formatProjectDates(project.startDate, project.endDate, project.status)}</span>
            </div>
          </div>
        </div>
      `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

        initRevealAnimations();
    }

    /**
     * Render events
     */
    async function renderEvents(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const eventsData = await fetchContent('events.json');
        if (!eventsData || !eventsData.events) return;

        // Filter to upcoming events only
        const now = new Date();
        let events = eventsData.events
            .filter(e => e.published !== false && new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (options.limit) {
            events = events.slice(0, options.limit);
        }

        if (events.length === 0) {
            container.innerHTML = '<p class="no-events">No upcoming events at this time.</p>';
            return;
        }

        container.innerHTML = '';

        events.forEach(event => {
            const cardHTML = `
        <div class="event-card reveal">
          <div class="event-date-badge">
            <span class="event-day">${new Date(event.date).getDate()}</span>
            <span class="event-month">${new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
          </div>
          <div class="event-content">
            <h3 class="event-title">${event.title}</h3>
            <div class="event-meta">
              <span>🕐 ${event.time || 'TBA'}</span>
              <span>📍 ${event.location}</span>
            </div>
            <p class="event-description">${event.description}</p>
            ${event.registrationLink ? `<a href="${event.registrationLink}" class="btn btn-small btn-primary">Register</a>` : ''}
          </div>
        </div>
      `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

        initRevealAnimations();
    }

    /**
     * Format date for display
     */
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    /**
     * Format project date range
     */
    function formatProjectDates(startDate, endDate, status) {
        if (!startDate) return status || 'Ongoing';
        const start = new Date(startDate).getFullYear();
        if (endDate) {
            return `${start} - ${new Date(endDate).getFullYear()}`;
        }
        return `${start} - Present`;
    }

    /**
     * Initialize reveal animations for dynamically loaded content
     */
    function initRevealAnimations() {
        const reveals = document.querySelectorAll('.reveal:not(.revealed)');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        reveals.forEach(el => observer.observe(el));
    }

    /**
     * Show news article detail (for future expansion)
     */
    window.showNewsDetail = async function (articleId) {
        const newsData = await fetchContent('news.json');
        const article = newsData?.articles?.find(a => a.id === articleId);

        if (article) {
            // For now, just log - could expand to modal or dedicated page
            console.log('Article:', article);
            alert(`${article.title}\n\n${article.content || article.excerpt}`);
        }
    };

    // ============================================
    // AUTO-INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', async () => {
        // Always apply site config
        await applySiteConfig();

        // Auto-detect and render content containers
        if (document.querySelector('.news-grid')) {
            await renderNews();
        }

        if (document.querySelector('.projects-grid')) {
            await renderProjects();
        }

        if (document.getElementById('eventsContainer')) {
            await renderEvents('eventsContainer');
        }
    });

    // Expose functions globally
    window.SOTEContent = {
        fetchContent,
        applySiteConfig,
        renderNews,
        renderProjects,
        renderEvents
    };

})();
