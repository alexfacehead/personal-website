document.addEventListener('DOMContentLoaded', () => {
  // Load navbar
  fetch(document.querySelector('[id="navbar"]') ?
    (window.location.pathname.includes('/pages/') ? '../navbar.html' : 'navbar.html') : '')
    .then(r => r.text())
    .then(html => {
      const el = document.getElementById('navbar');
      if (el) {
        el.innerHTML = html;
        initNav();
      }
    })
    .catch(() => {});

  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Make project cards fully clickable
  document.querySelectorAll('.project-card').forEach(card => {
    const link = card.querySelector('.project-card-links a');
    if (link) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        window.open(link.href, '_blank', 'noopener,noreferrer');
      });
    }
  });
});

function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  if (!nav) return;

  // Scroll behavior
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
    lastScroll = window.scrollY;
  }, { passive: true });

  // Mobile toggle — create a separate overlay on body to avoid stacking context issues
  if (toggle && links) {
    let overlay = null;

    function openMenu() {
      toggle.classList.add('active');
      // Create overlay directly on body
      overlay = document.createElement('div');
      overlay.id = 'mobileMenuOverlay';
      overlay.style.cssText = 'position:fixed;top:' + nav.offsetHeight + 'px;left:0;right:0;bottom:0;background:#0a0a0a;z-index:999999;display:flex;flex-direction:column;padding:32px 24px;gap:4px;overflow-y:auto;';
      // Clone nav links into overlay
      links.querySelectorAll('a').forEach(function(a) {
        var clone = a.cloneNode(true);
        clone.style.cssText = 'font-size:1.1rem;padding:14px 16px;width:100%;color:#e0e0e0;text-decoration:none;border-radius:8px;';
        clone.addEventListener('click', closeMenu);
        overlay.appendChild(clone);
      });
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      toggle.classList.remove('active');
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
        overlay = null;
      }
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function() {
      if (overlay) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  // Active page highlight
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (currentPath === href ||
        (currentPath === '/' && href === '/index.html') ||
        (currentPath.endsWith('index.html') && href === '/index.html')) {
      link.classList.add('active');
    } else if (href !== '/index.html' && currentPath.includes(href.replace('/pages/', ''))) {
      link.classList.add('active');
    }
  });
}

// EmailJS contact form handler — rate limited to 2 sends per 10 minutes
const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_KEY = 'contactFormSends';

function getSendLog() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return [];
    return JSON.parse(raw).filter(t => Date.now() - t < RATE_LIMIT_WINDOW_MS);
  } catch { return []; }
}

function logSend() {
  const log = getSendLog();
  log.push(Date.now());
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(log));
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Honeypot field — hidden from real users, bots fill it in
  const hp = document.createElement('input');
  hp.type = 'text';
  hp.name = 'website_url';
  hp.tabIndex = -1;
  hp.autocomplete = 'off';
  hp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;height:0;width:0;';
  form.appendChild(hp);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const status = document.getElementById('formStatus');
    const originalText = btn.textContent;

    // Honeypot check — if filled, silently reject (it's a bot)
    if (form.querySelector('[name="website_url"]').value) {
      status.className = 'form-status success';
      status.textContent = 'Message sent successfully! I\'ll get back to you soon.';
      form.reset();
      return;
    }

    // Rate limiting — 2 sends per 10 minutes, persisted in localStorage
    const sendLog = getSendLog();
    if (sendLog.length >= RATE_LIMIT_MAX) {
      const oldest = sendLog[0];
      const waitMin = Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - oldest)) / 60000);
      status.className = 'form-status error';
      status.textContent = `You've reached the send limit. Please try again in ${waitMin} minute${waitMin > 1 ? 's' : ''}.`;
      return;
    }
    logSend();

    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
      // EmailJS integration — replace with your service/template/user IDs
      if (typeof emailjs !== 'undefined') {
        await emailjs.sendForm(
          'service_fhvo92h',
          'template_d5f7xzm',
          form,
          '_tEw1b7JreVGELO-d'
        );
        status.className = 'form-status success';
        status.textContent = 'Message sent successfully! I\'ll get back to you soon.';
        form.reset();
      } else {
        // Fallback: log locally
        const data = new FormData(form);
        console.log('Form submitted:', Object.fromEntries(data));
        status.className = 'form-status success';
        status.textContent = 'Message received! (EmailJS not configured yet — see console for data)';
        form.reset();
      }
    } catch (err) {
      status.className = 'form-status error';
      status.textContent = 'Something went wrong. Please try again or email me directly.';
      console.error('EmailJS error:', err?.text || err?.message || JSON.stringify(err));
      console.error('EmailJS full:', err);
    }

    btn.textContent = originalText;
    btn.disabled = false;
  });
}

// Portfolio filters
function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card[data-lang]');

  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.lang === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// Respect prefers-reduced-motion for autoplay videos
function initAccessibility() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('video[autoplay]').forEach(v => {
      v.pause();
      v.removeAttribute('autoplay');
    });
  }
}

// Init page-specific features after DOM load
document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initFilters();
  initAccessibility();
});
