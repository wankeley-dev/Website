/* ============================================
   SOTE - Soldiers of the Environment
   Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all modules
    initNavbar();
    initMobileMenu();
    initScrollReveal();
    initSmoothScroll();
    initContactForm();
    initCountUp();
});

/* Navbar Scroll Effect */
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on load
}

/* Mobile Menu Toggle */
function initMobileMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    const links = document.querySelectorAll('.nav-link');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        menu.classList.toggle('active');
        document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            menu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

/* Scroll Reveal Animation */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

    const revealOnScroll = () => {
        reveals.forEach(element => {
            const windowHeight = window.innerHeight;
            const elementTop = element.getBoundingClientRect().top;
            const revealPoint = 100;

            if (elementTop < windowHeight - revealPoint) {
                element.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Check on load
}

/* Smooth Scroll for Anchor Links */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

/* Contact Form Validation */
function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const inputs = form.querySelectorAll('.form-input, .form-textarea');
        let isValid = true;

        inputs.forEach(input => {
            removeError(input);

            if (input.hasAttribute('required') && !input.value.trim()) {
                showError(input, 'This field is required');
                isValid = false;
            } else if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
                showError(input, 'Please enter a valid email');
                isValid = false;
            }
        });

        if (isValid) {
            // Show success message
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Message Sent!';
            btn.style.background = '#4A9C6D';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                form.reset();
            }, 3000);
        }
    });
}

function showError(input, message) {
    input.style.borderColor = '#ef4444';
    const error = document.createElement('span');
    error.className = 'form-error';
    error.textContent = message;
    error.style.color = '#ef4444';
    error.style.fontSize = '0.85rem';
    error.style.marginTop = '0.25rem';
    error.style.display = 'block';
    input.parentNode.appendChild(error);
}

function removeError(input) {
    input.style.borderColor = '';
    const error = input.parentNode.querySelector('.form-error');
    if (error) error.remove();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* Count Up Animation for Stats */
function initCountUp() {
    const stats = document.querySelectorAll('.stat-number');
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = target.getAttribute('data-value');
                if (value) {
                    animateValue(target, 0, parseInt(value), 2000);
                }
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => {
        if (stat.getAttribute('data-value')) {
            observer.observe(stat);
        }
    });
}

function animateValue(element, start, end, duration) {
    // Smartly extract suffix by removing digits, commas, and dots
    const suffix = element.textContent.replace(/[0-9,.]/g, '');
    let startTime = null;

    const animation = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);

        // Format number with commas and append suffix
        element.textContent = value.toLocaleString() + suffix;

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    };

    requestAnimationFrame(animation);
}

/* Active Navigation Link */
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Call on load
setActiveNavLink();